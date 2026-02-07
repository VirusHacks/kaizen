import ora from 'ora';
import chalk from 'chalk';
import { AppConfig, validateApiKey } from '../config';
import { GitRepository, getChangedFiles, getFileDiff, ChangeMode } from '../git';
import { readFileContent, filterFiles, limitFiles, chunkFiles, FileChunk } from '../files';
import {
  AnthropicProvider,
  GeminiProvider,
  TokenTracker,
  renderTemplate,
  CODE_REVIEW_SYSTEM_PROMPT,
  CODE_REVIEW_USER_TEMPLATE,
  LLMProvider,
} from '../llm';
import {
  generateReviewMarkdown,
  writeReport,
  resolveOutputPath,
  ReviewReport,
  FileReview,
  ReviewStats,
  ReviewFailure,
} from '../output';
import { formatReviewStats } from '../output/formatters';
import { runWithConcurrencySettled } from '../utils/concurrency';
import { logger } from '../utils/logger';

export interface ReviewOptions {
  mode: ChangeMode;
  baseBranch?: string;
  outputFile?: string;
  maxFiles?: number;
  concurrency?: number;
}

export async function runReview(config: AppConfig, options: ReviewOptions): Promise<string> {
  const startTime = Date.now();
  const spinner = ora();

  // Handle graceful shutdown
  let aborted = false;
  const cleanup = () => {
    aborted = true;
    spinner.stop();
    console.error(chalk.yellow('\nReview interrupted. Partial results may have been generated.'));
    process.exit(1);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Step 1: Validate API key
    spinner.start('Loading configuration...');
    validateApiKey(config);
    spinner.succeed('Configuration loaded');

    // Step 2: Detect git repo
    spinner.start('Detecting git repository...');
    const repo = new GitRepository();
    const projectName = config.project.name || repo.getProjectName();
    spinner.succeed(`Git repository: ${projectName}`);

    // Step 3: Get changed files
    spinner.start('Detecting changed files...');
    let changedFiles = getChangedFiles(repo, options.mode, options.baseBranch || config.review.baseBranch);

    if (changedFiles.length === 0) {
      spinner.info('No changed files found');
      console.error(chalk.yellow(`\nNo ${options.mode} changes detected.`));
      if (options.mode === 'staged') {
        console.error(chalk.gray('Stage files with: git add <files>'));
      }
      return '';
    }

    // Step 4: Filter files
    changedFiles = filterFiles(changedFiles, config.files, repo.root);
    changedFiles = limitFiles(changedFiles, options.maxFiles);

    if (changedFiles.length === 0) {
      spinner.info('No reviewable files after filtering');
      return '';
    }

    spinner.succeed(`Found ${changedFiles.length} files to review`);

    // Step 5: Read and chunk files
    spinner.start('Reading and chunking files...');
    const fileContents = changedFiles
      .map((f) => readFileContent(f.path, repo.root))
      .filter((f) => f !== null) as NonNullable<ReturnType<typeof readFileContent>>[];

    // Filter by max file size
    const validFiles = fileContents.filter((f) => {
      if (f.size > config.files.maxFileSize) {
        logger.warn(`Skipping large file: ${f.path} (${(f.size / 1024).toFixed(1)}KB)`);
        return false;
      }
      return true;
    });

    const chunks = chunkFiles(validFiles, config.files.maxLinesPerChunk, config.files.chunkOverlap);
    spinner.succeed(`Prepared ${chunks.length} chunks from ${validFiles.length} files`);

    // Step 6: Get diffs for context
    const diffs = new Map<string, string>();
    for (const file of changedFiles) {
      const diff = getFileDiff(repo, file.path, options.mode, options.baseBranch || config.review.baseBranch);
      if (diff) diffs.set(file.path, diff);
    }

    // Step 7: Initialize LLM
    spinner.start('Initializing AI reviewer...');
    const provider = createProvider(config);
    const tracker = new TokenTracker();
    spinner.succeed('AI reviewer ready');

    // Step 8: Send chunks for review
    const concurrency = options.concurrency || config.review.concurrency;
    const reviews: FileReview[] = [];
    const failures: ReviewFailure[] = [];

    // Group chunks by file for batch sending
    const chunkGroups = groupChunksByFile(chunks);
    const totalGroups = chunkGroups.length;
    let completedGroups = 0;

    spinner.start(`Reviewing code... (0/${totalGroups})`);

    const result = await runWithConcurrencySettled(
      chunkGroups,
      async (group) => {
        if (aborted) throw new Error('Aborted');

        const chunkData = group.chunks.map((chunk) => ({
          filePath: chunk.filePath,
          language: chunk.language,
          content: chunk.content,
          isChunked: chunk.totalChunks > 1,
          chunkIndex: chunk.chunkIndex + 1,
          totalChunks: chunk.totalChunks,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          diff: diffs.get(chunk.filePath) || '',
        }));

        const userPrompt = renderTemplate(CODE_REVIEW_USER_TEMPLATE, {
          projectName,
          mode: options.mode,
          fileCount: validFiles.length,
          chunks: chunkData,
        });

        const response = await provider.complete({
          systemPrompt: CODE_REVIEW_SYSTEM_PROMPT,
          userPrompt,
        });

        tracker.track(response.usage);

        return {
          filePath: group.filePath,
          chunks: group.chunks,
          content: response.content,
        };
      },
      concurrency,
      (completed) => {
        completedGroups = completed;
        spinner.text = `Reviewing code... (${completed}/${totalGroups})`;
      }
    );

    spinner.stop();

    // Process results
    for (const success of result.successes) {
      const { filePath, chunks: fileChunks, content } = success.result;
      reviews.push({
        filePath,
        language: fileChunks[0]?.language || 'text',
        reviewContent: content,
        chunkIndex: fileChunks.length > 1 ? fileChunks[0].chunkIndex : undefined,
        totalChunks: fileChunks.length > 1 ? fileChunks[0].totalChunks : undefined,
      });
    }

    for (const failure of result.failures) {
      const group = chunkGroups[failure.index];
      const errorMsg = failure.error instanceof Error ? failure.error.message : String(failure.error);
      failures.push({ filePath: group.filePath, error: errorMsg });
      logger.warn(`Failed to review ${group.filePath}: ${errorMsg}`);
    }

    // Step 9: Generate report
    spinner.start('Generating report...');
    const stats: ReviewStats = {
      filesReviewed: reviews.length,
      totalFiles: changedFiles.length,
      chunksProcessed: chunks.length,
      ...tracker.stats,
      duration: Date.now() - startTime,
    };

    const report: ReviewReport = {
      title: `Code Review - ${projectName}`,
      date: new Date().toISOString(),
      mode: options.mode,
      projectName,
      reviews,
      stats,
      failures,
    };

    const markdown = generateReviewMarkdown(report);
    const outputPath = resolveOutputPath(options.outputFile || config.review.outputFile);
    const absolutePath = writeReport(markdown, outputPath);

    spinner.succeed('Report generated');

    // Final output
    console.error(chalk.green(`\n✓ Code review complete!`));
    console.error(chalk.gray(`  Report saved to: ${absolutePath}`));
    console.error(formatReviewStats(stats));

    if (failures.length > 0) {
      console.error(chalk.yellow(`\n  ${failures.length} file(s) failed to review`));
    }

    return absolutePath;
  } catch (error) {
    spinner.fail('Review failed');
    throw error;
  } finally {
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);
  }
}

function createProvider(config: AppConfig): LLMProvider {
  let provider: LLMProvider;
  if (config.llm.provider === 'gemini') {
    provider = new GeminiProvider();
  } else {
    provider = new AnthropicProvider();
  }
  provider.initialize(config.llm);
  return provider;
}

interface ChunkGroup {
  filePath: string;
  chunks: FileChunk[];
}

function groupChunksByFile(chunks: FileChunk[]): ChunkGroup[] {
  const groups = new Map<string, FileChunk[]>();

  for (const chunk of chunks) {
    const existing = groups.get(chunk.filePath) || [];
    existing.push(chunk);
    groups.set(chunk.filePath, existing);
  }

  return Array.from(groups.entries()).map(([filePath, fileChunks]) => ({
    filePath,
    chunks: fileChunks,
  }));
}

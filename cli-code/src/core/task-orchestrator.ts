import ora from 'ora';
import chalk from 'chalk';
import { AppConfig, validateApiKey } from '../config';
import { GitRepository, getCommitHistory, getCommitFiles, CommitInfo } from '../git';
import {
  AnthropicProvider,
  GeminiProvider,
  TokenTracker,
  renderTemplate,
  TASK_MD_SYSTEM_PROMPT,
  TASK_MD_USER_TEMPLATE,
  LLMProvider,
} from '../llm';
import { generateTaskMarkdown, writeReport, resolveOutputPath, TaskReport } from '../output';
import { formatTaskStats } from '../output/formatters';
import { logger } from '../utils/logger';

export interface TaskMdOptions {
  since?: string;
  from?: string;
  between?: [string, string];
  includeReview?: boolean;
  reviewContent?: string;
  outputFile?: string;
}

export async function runTaskMd(config: AppConfig, options: TaskMdOptions): Promise<string> {
  const startTime = Date.now();
  const spinner = ora();

  // Handle graceful shutdown
  const cleanup = () => {
    spinner.stop();
    console.error(chalk.yellow('\nTask summary generation interrupted.'));
    process.exit(1);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Step 1: Validate
    spinner.start('Loading configuration...');
    validateApiKey(config);
    spinner.succeed('Configuration loaded');

    // Step 2: Detect git repo
    spinner.start('Detecting git repository...');
    const repo = new GitRepository();
    const projectName = config.project.name || repo.getProjectName();
    spinner.succeed(`Git repository: ${projectName}`);

    // Step 3: Get commit history
    spinner.start('Fetching commit history...');
    const commits = getCommitHistory(repo, {
      since: options.since,
      from: options.from,
      between: options.between,
    });

    if (commits.length === 0) {
      spinner.info('No commits found in the specified range');
      console.error(chalk.yellow('\nNo commits found. Try adjusting the date range or hash.'));
      return '';
    }

    spinner.succeed(`Found ${commits.length} commits`);

    // Step 4: Enrich commits with file info
    spinner.start('Analyzing commit details...');
    const enrichedCommits = commits.map((commit) => {
      const files = getCommitFiles(repo, commit.hash);
      return {
        ...commit,
        files: files.join(', '),
      };
    });
    spinner.succeed('Commit details analyzed');

    // Step 5: Build period string
    const period = buildPeriodString(options, commits);

    // Step 6: Generate summary with LLM
    spinner.start('Generating PM summary...');
    let provider: LLMProvider;
    if (config.llm.provider === 'gemini') {
      provider = new GeminiProvider();
    } else {
      provider = new AnthropicProvider();
    }
    provider.initialize(config.llm);
    const tracker = new TokenTracker();

    const userPrompt = renderTemplate(TASK_MD_USER_TEMPLATE, {
      projectName,
      period,
      commitCount: commits.length,
      commits: enrichedCommits,
      reviewSummary: options.includeReview ? options.reviewContent || '' : '',
    });

    const response = await provider.complete({
      systemPrompt: TASK_MD_SYSTEM_PROMPT,
      userPrompt,
    });

    tracker.track(response.usage);
    spinner.succeed('PM summary generated');

    // Step 7: Write report
    spinner.start('Writing report...');
    const outputTemplate = options.outputFile || `task-summary-{date}.md`;
    const outputPath = resolveOutputPath(outputTemplate);

    const report: TaskReport = {
      title: `Task Summary - ${projectName}`,
      date: new Date().toISOString(),
      projectName,
      period,
      content: response.content,
      stats: {
        commitCount: commits.length,
        ...tracker.stats,
        duration: Date.now() - startTime,
      },
    };

    const markdown = generateTaskMarkdown(report);
    const absolutePath = writeReport(markdown, outputPath);
    spinner.succeed('Report written');

    // Final output
    console.error(chalk.green(`\n✓ Task summary complete!`));
    console.error(chalk.gray(`  Report saved to: ${absolutePath}`));
    console.error(formatTaskStats(report.stats));

    return absolutePath;
  } catch (error) {
    spinner.fail('Task summary generation failed');
    throw error;
  } finally {
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);
  }
}

function buildPeriodString(options: TaskMdOptions, commits: CommitInfo[]): string {
  if (options.since) {
    return `Since ${options.since}`;
  }
  if (options.between) {
    return `${options.between[0]} to ${options.between[1]}`;
  }
  if (options.from) {
    return `From ${options.from} to HEAD`;
  }
  if (commits.length > 0) {
    const oldest = commits[commits.length - 1];
    const newest = commits[0];
    return `${oldest.date.split(' ')[0]} to ${newest.date.split(' ')[0]}`;
  }
  return 'All commits';
}

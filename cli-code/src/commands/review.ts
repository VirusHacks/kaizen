import { Command } from 'commander';
import { loadConfig } from '../config';
import { runReview } from '../core';
import { ChangeMode } from '../git';
import { formatError } from '../utils/errors';
import { logger } from '../utils/logger';

export function createReviewCommand(): Command {
  const cmd = new Command('review')
    .description('Review code changes using AI')
    .option('--staged', 'Review staged changes (default)')
    .option('--unstaged', 'Review unstaged and untracked changes')
    .option('--branch <name>', 'Review changes compared to a branch')
    .option('--output <file>', 'Output file path')
    .option('--max-files <n>', 'Maximum number of files to review', parseInt)
    .option('--concurrency <n>', 'Number of concurrent LLM requests', parseInt)
    .option('--config <path>', 'Path to config file')
    .option('--verbose', 'Enable verbose logging')
    .option('--quiet', 'Suppress all output except errors')
    .action(async (opts) => {
      try {
        if (opts.verbose) logger.setVerbose();
        if (opts.quiet) logger.setQuiet();

        const config = loadConfig(opts.config);

        // Determine mode
        let mode: ChangeMode = config.review.defaultMode;
        if (opts.staged) mode = 'staged';
        if (opts.unstaged) mode = 'unstaged';
        if (opts.branch) mode = 'branch';

        await runReview(config, {
          mode,
          baseBranch: opts.branch,
          outputFile: opts.output,
          maxFiles: opts.maxFiles,
          concurrency: opts.concurrency,
        });
      } catch (error) {
        console.error(`\n${formatError(error)}`);
        process.exit(1);
      }
    });

  return cmd;
}

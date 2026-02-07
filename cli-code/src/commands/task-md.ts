import { Command } from 'commander';
import { loadConfig } from '../config';
import { runTaskMd } from '../core';
import { formatError } from '../utils/errors';
import { logger } from '../utils/logger';

export function createTaskMdCommand(): Command {
  const cmd = new Command('task-md')
    .description('Generate a PM-friendly task summary from git history')
    .option('--since <date>', 'Include commits since date (e.g., "2 weeks ago", "2024-01-01")')
    .option('--from <hash>', 'Include commits from this hash to HEAD')
    .option('--between <tags...>', 'Include commits between two tags or refs')
    .option('--include-review', 'Include the latest code review summary')
    .option('--output <file>', 'Output file path')
    .option('--config <path>', 'Path to config file')
    .option('--verbose', 'Enable verbose logging')
    .option('--quiet', 'Suppress all output except errors')
    .action(async (opts) => {
      try {
        if (opts.verbose) logger.setVerbose();
        if (opts.quiet) logger.setQuiet();

        const config = loadConfig(opts.config);

        let between: [string, string] | undefined;
        if (opts.between && opts.between.length === 2) {
          between = [opts.between[0], opts.between[1]];
        }

        // Default to last 7 days if no range specified
        const since = opts.since || (!opts.from && !between ? '7 days ago' : undefined);

        await runTaskMd(config, {
          since,
          from: opts.from,
          between,
          includeReview: opts.includeReview,
          outputFile: opts.output,
        });
      } catch (error) {
        console.error(`\n${formatError(error)}`);
        process.exit(1);
      }
    });

  return cmd;
}

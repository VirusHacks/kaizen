#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { runInit, createReviewCommand, createTaskMdCommand } from './commands';
import { formatError } from './utils/errors';

const VERSION = '1.0.0';

function createProgram(): Command {
  const program = new Command();

  program
    .name('code-review')
    .description('AI-powered code review CLI using Claude')
    .version(VERSION, '-v, --version', 'Display version number')
    .option('--config <path>', 'Path to config file')
    .option('--verbose', 'Enable verbose logging')
    .option('--quiet', 'Suppress all output except errors');

  // Init command
  program
    .command('init')
    .description('Initialize configuration files')
    .action(() => {
      try {
        runInit();
      } catch (error) {
        console.error(`\n${formatError(error)}`);
        process.exit(1);
      }
    });

  // Review command
  program.addCommand(createReviewCommand());

  // Task-MD command
  program.addCommand(createTaskMdCommand());

  return program;
}

async function main(): Promise<void> {
  try {
    const program = createProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red(`\n${formatError(error)}`));
    process.exit(1);
  }
}

main();

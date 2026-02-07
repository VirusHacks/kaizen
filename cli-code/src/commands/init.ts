import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../config/schema';
import * as yaml from 'js-yaml';

export function runInit(): void {
  const configPath = path.resolve(process.cwd(), '.codereviewrc');

  if (fs.existsSync(configPath)) {
    console.error(chalk.yellow('.codereviewrc already exists. Overwrite? Use --force to overwrite.'));
    return;
  }

  const configContent = yaml.dump({
    llm: {
      provider: DEFAULT_CONFIG.llm.provider,
      model: DEFAULT_CONFIG.llm.model,
      maxTokens: DEFAULT_CONFIG.llm.maxTokens,
      temperature: DEFAULT_CONFIG.llm.temperature,
      timeout: DEFAULT_CONFIG.llm.timeout,
      retries: DEFAULT_CONFIG.llm.retries,
    },
    files: {
      maxFileSize: DEFAULT_CONFIG.files.maxFileSize,
      maxLinesPerChunk: DEFAULT_CONFIG.files.maxLinesPerChunk,
      chunkOverlap: DEFAULT_CONFIG.files.chunkOverlap,
      ignoredPatterns: DEFAULT_CONFIG.files.ignoredPatterns.slice(0, 8),
      includedExtensions: DEFAULT_CONFIG.files.includedExtensions.slice(0, 12),
    },
    review: {
      defaultMode: DEFAULT_CONFIG.review.defaultMode,
      baseBranch: DEFAULT_CONFIG.review.baseBranch,
      outputFile: DEFAULT_CONFIG.review.outputFile,
      concurrency: DEFAULT_CONFIG.review.concurrency,
    },
    project: {
      name: path.basename(process.cwd()),
      environment: 'development',
    },
  }, { lineWidth: 120 });

  fs.writeFileSync(configPath, configContent, 'utf-8');

  // Create .env if it doesn't exist
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    } else {
      fs.writeFileSync(envPath, 'ANTHROPIC_API_KEY=\n', 'utf-8');
    }
    console.error(chalk.green('✓ Created .env file'));
    console.error(chalk.gray('  Add your Anthropic API key to .env'));
  }

  console.error(chalk.green('✓ Created .codereviewrc'));
  console.error('');
  console.error(chalk.bold('Next steps:'));
  console.error(`  1. Add your API key to ${chalk.cyan('.env')}`);
  console.error(`  2. Customize ${chalk.cyan('.codereviewrc')} as needed`);
  console.error(`  3. Run ${chalk.cyan('code-review review --staged')} to review staged changes`);
}

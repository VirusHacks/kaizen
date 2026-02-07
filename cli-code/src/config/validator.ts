import { AppConfig } from './schema';
import { ConfigError } from '../utils/errors';

export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // LLM validation
  if (!config.llm.provider) {
    errors.push('llm.provider is required');
  }
  if (!['anthropic', 'gemini'].includes(config.llm.provider)) {
    errors.push(`Unsupported LLM provider: ${config.llm.provider}. Supported: anthropic, gemini`);
  }
  if (config.llm.maxTokens < 1 || config.llm.maxTokens > 200000) {
    errors.push('llm.maxTokens must be between 1 and 200000');
  }
  if (config.llm.temperature < 0 || config.llm.temperature > 1) {
    errors.push('llm.temperature must be between 0 and 1');
  }
  if (config.llm.timeout < 1000) {
    errors.push('llm.timeout must be at least 1000ms');
  }
  if (config.llm.retries < 0 || config.llm.retries > 10) {
    errors.push('llm.retries must be between 0 and 10');
  }

  // Files validation
  if (config.files.maxFileSize < 1000) {
    errors.push('files.maxFileSize must be at least 1000 bytes');
  }
  if (config.files.maxLinesPerChunk < 50) {
    errors.push('files.maxLinesPerChunk must be at least 50');
  }
  if (config.files.chunkOverlap < 0) {
    errors.push('files.chunkOverlap must be non-negative');
  }
  if (config.files.chunkOverlap >= config.files.maxLinesPerChunk) {
    errors.push('files.chunkOverlap must be less than files.maxLinesPerChunk');
  }

  // Review validation
  if (!['staged', 'unstaged', 'branch'].includes(config.review.defaultMode)) {
    errors.push('review.defaultMode must be staged, unstaged, or branch');
  }
  if (config.review.concurrency < 1 || config.review.concurrency > 10) {
    errors.push('review.concurrency must be between 1 and 10');
  }

  if (errors.length > 0) {
    throw new ConfigError(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

export function validateApiKey(config: AppConfig): void {
  if (!config.llm.apiKey) {
    const providerName = config.llm.provider === 'gemini' ? 'Gemini' : 'Anthropic';
    const envVar = config.llm.provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';
    const url = config.llm.provider === 'gemini'
      ? 'https://aistudio.google.com/apikey'
      : 'https://console.anthropic.com/';
    throw new ConfigError(
      `No API key found. Set ${envVar} in your .env file or add llm.apiKey to .codereviewrc\n\n` +
        'To set up:\n' +
        '  1. Copy .env.example to .env\n' +
        `  2. Add your ${providerName} API key\n` +
        '  3. Run the command again\n\n' +
        `Get your API key at: ${url}`
    );
  }
}

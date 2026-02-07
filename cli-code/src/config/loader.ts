import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppConfig, DEFAULT_CONFIG } from './schema';
import { validateConfig } from './validator';
import { ConfigError } from '../utils/errors';
import * as dotenv from 'dotenv';

const CONFIG_FILENAMES = [
  '.codereviewrc',
  '.codereviewrc.json',
  '.codereviewrc.yaml',
  '.codereviewrc.yml',
];

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseConfigFile(filePath: string): Partial<AppConfig> {
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return {};

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json' || content.startsWith('{')) {
    try {
      return JSON.parse(content);
    } catch (e) {
      throw new ConfigError(`Invalid JSON in config file: ${filePath}`);
    }
  }

  try {
    const parsed = yaml.load(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Partial<AppConfig>;
    }
    return {};
  } catch (e) {
    throw new ConfigError(`Invalid YAML in config file: ${filePath}`);
  }
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as any, sourceVal as any);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

export function loadConfig(configPath?: string): AppConfig {
  // Load .env file
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  let fileConfig: Partial<AppConfig> = {};

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new ConfigError(`Config file not found: ${configPath}`);
    }
    fileConfig = parseConfigFile(configPath);
  } else {
    const found = findConfigFile(process.cwd());
    if (found) {
      fileConfig = parseConfigFile(found);
    }
  }

  // Merge with defaults
  let config = deepMerge(DEFAULT_CONFIG, fileConfig);

  // Override with environment variables
  if (process.env.GEMINI_API_KEY) {
    config.llm.apiKey = process.env.GEMINI_API_KEY;
  }
  if (process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    config.llm.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (process.env.GEMINI_MODEL) {
    config.llm.model = process.env.GEMINI_MODEL;
  }
  if (process.env.GEMINI_MAX_TOKENS) {
    config.llm.maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS, 10);
  }

  // Validate
  validateConfig(config);

  return config;
}

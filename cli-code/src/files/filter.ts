import * as path from 'path';
import { ChangedFile } from '../git/changes';
import { FilesConfig } from '../config/schema';
import { logger } from '../utils/logger';

export function filterFiles(
  files: ChangedFile[],
  config: FilesConfig,
  repoRoot: string
): ChangedFile[] {
  const filtered = files.filter((file) => {
    // Skip deleted files
    if (file.status === 'deleted') {
      logger.debug(`Skipping deleted file: ${file.path}`);
      return false;
    }

    // Check extension
    const ext = path.extname(file.path).toLowerCase();
    if (config.includedExtensions.length > 0 && !config.includedExtensions.includes(ext)) {
      logger.debug(`Skipping file with excluded extension: ${file.path}`);
      return false;
    }

    // Check ignored patterns
    if (matchesIgnoredPattern(file.path, config.ignoredPatterns)) {
      logger.debug(`Skipping ignored file: ${file.path}`);
      return false;
    }

    return true;
  });

  logger.debug(`Filtered ${files.length} files down to ${filtered.length}`);
  return filtered;
}

function matchesIgnoredPattern(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (matchGlob(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

function matchGlob(filePath: string, pattern: string): boolean {
  // Handle ** patterns
  if (pattern.includes('**')) {
    const parts = pattern.split('**');
    if (parts.length === 2) {
      const prefix = parts[0].replace(/\/$/, '');
      const suffix = parts[1].replace(/^\//, '');

      if (prefix && !filePath.startsWith(prefix) && !filePath.includes(`/${prefix}`)) {
        return false;
      }
      if (suffix) {
        return matchSimpleGlob(filePath, suffix);
      }
      return prefix ? filePath.startsWith(prefix) || filePath.includes(`/${prefix}`) : true;
    }
  }

  // Handle simple * patterns
  if (pattern.startsWith('*.')) {
    const ext = pattern.substring(1);
    return filePath.endsWith(ext);
  }

  // Direct match
  return filePath === pattern || filePath.includes(`/${pattern}`);
}

function matchSimpleGlob(filePath: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    return filePath.endsWith(pattern.substring(1));
  }
  if (pattern.startsWith('.')) {
    return filePath.endsWith(pattern);
  }
  return filePath.includes(pattern);
}

export function limitFiles(files: ChangedFile[], maxFiles?: number): ChangedFile[] {
  if (maxFiles && maxFiles > 0 && files.length > maxFiles) {
    logger.warn(`Limiting review to ${maxFiles} files (${files.length} found)`);
    return files.slice(0, maxFiles);
  }
  return files;
}

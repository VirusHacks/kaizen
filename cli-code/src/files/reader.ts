import * as fs from 'fs';
import * as path from 'path';
import { FileError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  lineCount: number;
  language: string;
}

export function readFileContent(filePath: string, repoRoot: string): FileContent | null {
  const fullPath = path.resolve(repoRoot, filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      logger.debug(`File not found: ${fullPath}`);
      return null;
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return null;
    }

    // Check if file is binary
    if (isBinaryFile(fullPath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(filePath);

    return {
      path: filePath,
      content,
      size: stats.size,
      lineCount: lines.length,
      language: detectLanguageFromExtension(ext),
    };
  } catch (error) {
    logger.debug(`Failed to read file: ${filePath}`);
    return null;
  }
}

function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.pyc', '.pyo', '.class', '.o', '.obj',
  ]);

  const ext = path.extname(filePath).toLowerCase();
  if (binaryExtensions.has(ext)) return true;

  // Check first 8KB for null bytes
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
  } catch {
    return false;
  }

  return false;
}

function detectLanguageFromExtension(ext: string): string {
  // Re-export from language-detector for convenience
  const { detectLanguage } = require('./language-detector');
  return detectLanguage(ext);
}

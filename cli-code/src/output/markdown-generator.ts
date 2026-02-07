import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ReviewReport {
  title: string;
  date: string;
  mode: string;
  projectName: string;
  reviews: FileReview[];
  stats: ReviewStats;
  failures: ReviewFailure[];
}

export interface FileReview {
  filePath: string;
  language: string;
  reviewContent: string;
  chunkIndex?: number;
  totalChunks?: number;
}

export interface ReviewStats {
  filesReviewed: number;
  totalFiles: number;
  chunksProcessed: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: number;
}

export interface ReviewFailure {
  filePath: string;
  error: string;
}

export function generateReviewMarkdown(report: ReviewReport): string {
  const lines: string[] = [];

  lines.push(`# Code Review Report`);
  lines.push('');
  lines.push(`**Project**: ${report.projectName || 'Unknown'}`);
  lines.push(`**Date**: ${report.date}`);
  lines.push(`**Mode**: ${report.mode}`);
  lines.push(`**Files Reviewed**: ${report.stats.filesReviewed}/${report.stats.totalFiles}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // File reviews
  for (const review of report.reviews) {
    if (review.totalChunks && review.totalChunks > 1) {
      lines.push(`## ${review.filePath} (Chunk ${(review.chunkIndex || 0) + 1}/${review.totalChunks})`);
    }
    lines.push('');
    lines.push(review.reviewContent);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Failures
  if (report.failures.length > 0) {
    lines.push('## Review Failures');
    lines.push('');
    lines.push('The following files could not be reviewed:');
    lines.push('');
    for (const failure of report.failures) {
      lines.push(`- **${failure.filePath}**: ${failure.error}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Stats
  lines.push('## Review Statistics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files Reviewed | ${report.stats.filesReviewed} |`);
  lines.push(`| Chunks Processed | ${report.stats.chunksProcessed} |`);
  lines.push(`| Input Tokens | ${report.stats.inputTokens.toLocaleString()} |`);
  lines.push(`| Output Tokens | ${report.stats.outputTokens.toLocaleString()} |`);
  lines.push(`| Total Tokens | ${report.stats.totalTokens.toLocaleString()} |`);
  lines.push(`| Duration | ${formatDuration(report.stats.duration)} |`);
  lines.push('');

  return lines.join('\n');
}

export interface TaskReport {
  title: string;
  date: string;
  projectName: string;
  period: string;
  content: string;
  stats: TaskStats;
}

export interface TaskStats {
  commitCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: number;
}

export function generateTaskMarkdown(report: TaskReport): string {
  const lines: string[] = [];

  lines.push(`# Task Summary`);
  lines.push('');
  lines.push(`**Project**: ${report.projectName || 'Unknown'}`);
  lines.push(`**Date**: ${report.date}`);
  lines.push(`**Period**: ${report.period}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(report.content);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Generation Statistics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Commits Analyzed | ${report.stats.commitCount} |`);
  lines.push(`| Input Tokens | ${report.stats.inputTokens.toLocaleString()} |`);
  lines.push(`| Output Tokens | ${report.stats.outputTokens.toLocaleString()} |`);
  lines.push(`| Total Tokens | ${report.stats.totalTokens.toLocaleString()} |`);
  lines.push(`| Duration | ${formatDuration(report.stats.duration)} |`);
  lines.push('');

  return lines.join('\n');
}

export function writeReport(content: string, outputPath: string): string {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, content, 'utf-8');
  return path.resolve(outputPath);
}

export function resolveOutputPath(template: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return template
    .replace('{date}', date)
    .replace('{time}', time)
    .replace('{timestamp}', `${date}_${time}`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

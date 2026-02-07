import chalk from 'chalk';
import { ReviewStats, TaskStats } from './markdown-generator';

export function formatReviewStats(stats: ReviewStats): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold('Review Statistics:'));
  lines.push(`  Files reviewed: ${chalk.cyan(String(stats.filesReviewed))}/${stats.totalFiles}`);
  lines.push(`  Chunks processed: ${chalk.cyan(String(stats.chunksProcessed))}`);
  lines.push(`  Tokens used: ${chalk.cyan(stats.totalTokens.toLocaleString())} (${stats.inputTokens.toLocaleString()} in / ${stats.outputTokens.toLocaleString()} out)`);
  lines.push(`  Duration: ${chalk.cyan(formatDuration(stats.duration))}`);
  return lines.join('\n');
}

export function formatTaskStats(stats: TaskStats): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold('Generation Statistics:'));
  lines.push(`  Commits analyzed: ${chalk.cyan(String(stats.commitCount))}`);
  lines.push(`  Tokens used: ${chalk.cyan(stats.totalTokens.toLocaleString())} (${stats.inputTokens.toLocaleString()} in / ${stats.outputTokens.toLocaleString()} out)`);
  lines.push(`  Duration: ${chalk.cyan(formatDuration(stats.duration))}`);
  return lines.join('\n');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

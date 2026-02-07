import { GitRepository } from './repository';
import { logger } from '../utils/logger';

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
  body: string;
}

export function getCommitHistory(
  repo: GitRepository,
  options: {
    since?: string;
    from?: string;
    between?: [string, string];
    maxCount?: number;
  } = {}
): CommitInfo[] {
  const args = ['git', 'log', '--format=%H|%h|%an|%ai|%s|%b%x00'];

  if (options.since) {
    args.push(`--since="${options.since}"`);
  }

  if (options.maxCount) {
    args.push(`-n ${options.maxCount}`);
  }

  let range = '';
  if (options.between) {
    range = `${options.between[0]}...${options.between[1]}`;
  } else if (options.from) {
    range = `${options.from}..HEAD`;
  }

  if (range) {
    args.push(range);
  }

  try {
    const output = repo.exec(args.join(' '));
    return parseCommitLog(output);
  } catch (error) {
    logger.debug('Failed to get commit history');
    return [];
  }
}

function parseCommitLog(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const entries = output.split('\0').filter((entry) => entry.trim());

  for (const entry of entries) {
    const parts = entry.trim().split('|');
    if (parts.length < 5) continue;

    commits.push({
      hash: parts[0],
      shortHash: parts[1],
      author: parts[2],
      date: parts[3],
      message: parts[4],
      body: parts.slice(5).join('|').trim(),
    });
  }

  return commits;
}

export function getCommitDiff(repo: GitRepository, hash: string): string {
  try {
    return repo.exec(`git show ${hash} --stat --format=""`);
  } catch {
    return '';
  }
}

export function getCommitFiles(repo: GitRepository, hash: string): string[] {
  try {
    const output = repo.exec(`git diff-tree --no-commit-id --name-only -r ${hash}`);
    return output
      .trim()
      .split('\n')
      .filter((f) => f.trim());
  } catch {
    return [];
  }
}

import { GitRepository } from './repository';
import { parseDiffOutput } from './diff-parser';
import { logger } from '../utils/logger';
import { GitError } from '../utils/errors';

export interface ChangedFile {
  path: string;
  status: FileStatus;
  oldPath?: string;
  additions: number;
  deletions: number;
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked';

export type ChangeMode = 'staged' | 'unstaged' | 'branch';

export function getChangedFiles(
  repo: GitRepository,
  mode: ChangeMode,
  baseBranch?: string
): ChangedFile[] {
  switch (mode) {
    case 'staged':
      return getStagedFiles(repo);
    case 'unstaged':
      return getUnstagedFiles(repo);
    case 'branch':
      return getBranchFiles(repo, baseBranch || 'main');
    default:
      throw new GitError(`Unknown change mode: ${mode}`);
  }
}

function getStagedFiles(repo: GitRepository): ChangedFile[] {
  const output = repo.exec('git diff --cached --name-status --diff-filter=ACMRD');
  return parseNameStatus(output);
}

function getUnstagedFiles(repo: GitRepository): ChangedFile[] {
  // Get modified/deleted tracked files
  const trackedOutput = repo.exec('git diff --name-status --diff-filter=ACMRD');
  const trackedFiles = parseNameStatus(trackedOutput);

  // Get untracked files
  const untrackedOutput = repo.exec('git ls-files --others --exclude-standard');
  const untrackedFiles = untrackedOutput
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((filePath): ChangedFile => ({
      path: filePath.trim(),
      status: 'untracked',
      additions: 0,
      deletions: 0,
    }));

  return [...trackedFiles, ...untrackedFiles];
}

function getBranchFiles(repo: GitRepository, baseBranch: string): ChangedFile[] {
  if (!repo.hasCommits()) {
    throw new GitError(
      'Repository has no commits yet.',
      'Make an initial commit first: git add . && git commit -m "Initial commit"'
    );
  }

  // Try finding the merge base
  let mergeBase: string;
  try {
    // Try the branch as-is
    if (!repo.branchExists(baseBranch)) {
      // Try with origin/ prefix
      const remoteBranch = `origin/${baseBranch}`;
      if (!repo.branchExists(remoteBranch)) {
        throw new GitError(
          `Base branch '${baseBranch}' not found.`,
          `Available branches:\n${repo.exec('git branch -a').trim()}`
        );
      }
      baseBranch = remoteBranch;
    }
    mergeBase = repo.exec(`git merge-base ${baseBranch} HEAD`).trim();
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(
      `Cannot find merge base between '${baseBranch}' and HEAD.`,
      'Make sure the base branch exists and shares history with the current branch.'
    );
  }

  const output = repo.exec(`git diff ${mergeBase}...HEAD --name-status --diff-filter=ACMRD`);
  return parseNameStatus(output);
}

function parseNameStatus(output: string): ChangedFile[] {
  const lines = output.trim().split('\n').filter((line) => line.trim());
  const files: ChangedFile[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const statusCode = parts[0].trim();
    const filePath = parts[parts.length - 1].trim();

    let status: FileStatus;
    let oldPath: string | undefined;

    if (statusCode.startsWith('R')) {
      status = 'renamed';
      oldPath = parts[1].trim();
    } else if (statusCode.startsWith('C')) {
      status = 'copied';
      oldPath = parts[1].trim();
    } else {
      switch (statusCode) {
        case 'A':
          status = 'added';
          break;
        case 'M':
          status = 'modified';
          break;
        case 'D':
          status = 'deleted';
          break;
        default:
          status = 'modified';
      }
    }

    files.push({
      path: filePath,
      status,
      oldPath,
      additions: 0,
      deletions: 0,
    });
  }

  return files;
}

export function getFileDiff(
  repo: GitRepository,
  filePath: string,
  mode: ChangeMode,
  baseBranch?: string
): string {
  try {
    switch (mode) {
      case 'staged':
        return repo.exec(`git diff --cached -- "${filePath}"`);
      case 'unstaged':
        return repo.exec(`git diff -- "${filePath}"`);
      case 'branch': {
        const base = baseBranch || 'main';
        const mergeBase = repo.exec(`git merge-base ${base} HEAD`).trim();
        return repo.exec(`git diff ${mergeBase}...HEAD -- "${filePath}"`);
      }
      default:
        return '';
    }
  } catch {
    logger.debug(`Could not get diff for ${filePath}`);
    return '';
  }
}

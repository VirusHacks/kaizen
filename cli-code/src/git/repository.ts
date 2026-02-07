import { execSync } from 'child_process';
import * as path from 'path';
import { GitError, isGitNotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class GitRepository {
  private repoRoot: string;

  constructor(cwd?: string) {
    this.repoRoot = this.findRepoRoot(cwd || process.cwd());
  }

  private findRepoRoot(cwd: string): string {
    try {
      const root = this.exec('git rev-parse --show-toplevel', cwd).trim();
      return root;
    } catch (error) {
      if (isGitNotFoundError(error)) {
        throw new GitError(
          'Git is not installed or not found in PATH.',
          'Install Git:\n' +
            '  macOS: brew install git\n' +
            '  Ubuntu: sudo apt-get install git\n' +
            '  Windows: https://git-scm.com/download/win'
        );
      }
      throw new GitError(
        'Not a git repository.',
        'Please run this command from a git repository root,\nor initialize one with: git init'
      );
    }
  }

  get root(): string {
    return this.repoRoot;
  }

  exec(command: string, cwd?: string): string {
    try {
      return execSync(command, {
        cwd: cwd || this.repoRoot,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      if (isGitNotFoundError(error)) {
        throw new GitError(
          'Git is not installed or not found in PATH.',
          'Install Git from https://git-scm.com/'
        );
      }
      throw new GitError(
        `Git command failed: ${command}\n${error.stderr || error.message}`
      );
    }
  }

  isDetachedHead(): boolean {
    try {
      this.exec('git symbolic-ref HEAD');
      return false;
    } catch {
      return true;
    }
  }

  getCurrentBranch(): string {
    try {
      return this.exec('git rev-parse --abbrev-ref HEAD').trim();
    } catch {
      return 'HEAD';
    }
  }

  hasCommits(): boolean {
    try {
      this.exec('git rev-parse HEAD');
      return true;
    } catch {
      return false;
    }
  }

  branchExists(branch: string): boolean {
    try {
      this.exec(`git rev-parse --verify ${branch}`);
      return true;
    } catch {
      return false;
    }
  }

  getProjectName(): string {
    return path.basename(this.repoRoot);
  }
}

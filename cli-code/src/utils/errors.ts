export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ConfigError extends AppError {
  constructor(message: string, suggestion?: string) {
    super(message, 'CONFIG_ERROR', suggestion);
    this.name = 'ConfigError';
  }
}

export class GitError extends AppError {
  constructor(message: string, suggestion?: string) {
    super(message, 'GIT_ERROR', suggestion);
    this.name = 'GitError';
  }
}

export class LLMError extends AppError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    suggestion?: string
  ) {
    super(message, 'LLM_ERROR', suggestion);
    this.name = 'LLMError';
  }
}

export class FileError extends AppError {
  constructor(message: string, suggestion?: string) {
    super(message, 'FILE_ERROR', suggestion);
    this.name = 'FileError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof AppError) {
    let msg = `${error.name}: ${error.message}`;
    if (error.suggestion) {
      msg += `\n\nSuggestion: ${error.suggestion}`;
    }
    return msg;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isGitNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('git: command not found') ||
      error.message.includes('git is not recognized') ||
      error.message.includes('ENOENT')
    );
  }
  return false;
}

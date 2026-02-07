import { logger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

function getRetryDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries) {
        break;
      }

      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) {
        break;
      }

      const delay = getRetryDelay(attempt, opts.baseDelay, opts.maxDelay);
      logger.debug(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableHttpError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const statusCode = (error as any).status || (error as any).statusCode;
    if (statusCode === 429 || statusCode === 529 || statusCode === 500 || statusCode === 503) {
      return true;
    }
  }
  return false;
}

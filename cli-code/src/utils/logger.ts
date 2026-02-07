import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setVerbose(): void {
    this.level = 'debug';
  }

  setQuiet(): void {
    this.level = 'silent';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.error(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.error(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.error(chalk.green(`✓ ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.error(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  blank(): void {
    if (this.shouldLog('info')) {
      console.error('');
    }
  }
}

export const logger = new Logger();

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Simple logger with level filtering and formatting
 */
export class Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;

  constructor(options: { level?: LogLevel; prefix?: string } = {}) {
    this.level = options.level ?? (process.env['BUBO_LOG_LEVEL'] as LogLevel) ?? 'info';
    this.prefix = options.prefix ?? '🦉';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${level.toUpperCase()}] ${this.prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message), ...args);
    }
  }

  /**
   * Create a child logger with a different prefix
   */
  child(prefix: string): Logger {
    return new Logger({ level: this.level, prefix: `${this.prefix} ${prefix}` });
  }
}

// Default logger instance
export const logger = new Logger();

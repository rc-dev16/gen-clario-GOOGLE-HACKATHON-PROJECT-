/**
 * Logger Service
 * 
 * Provides centralized logging functionality with:
 * - Different log levels (error, warn, info)
 * - Environment-based logging behavior
 * - Structured log entries with timestamps
 * - Error tracking and context support
 * 
 * Production: Only logs critical errors
 * Development: Logs all levels with full context
 */

type LogLevel = 'error' | 'warn' | 'info';

interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private static instance: Logger;
  private isProduction = import.meta.env.PROD;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(entry: LogEntry): void {
    if (this.isProduction) {
      // In production, you might want to send this to a logging service
      // For now, we'll just use console for critical errors
      if (entry.level === 'error') {
        console.error(entry);
      }
    } else {
      // In development, log everything
      switch (entry.level) {
        case 'error':
          console.error(entry);
          break;
        case 'warn':
          console.warn(entry);
          break;
        case 'info':
          console.log(entry);
          break;
      }
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log({
      level: 'error',
      message,
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

export const logger = Logger.getInstance();

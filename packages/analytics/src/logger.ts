/**
 * Structured logging system with configurable log levels and JSON output format.
 * Integrates with GitHub Actions logging and supports analytics data collection.
 */

import type {AnalyticsConfig} from './models.js'
import {env} from 'node:process'

import * as core from '@actions/core'

/**
 * Log level enumeration for filtering log output.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log entry with consistent format.
 */
export interface LogEntry {
  /** Log entry timestamp in ISO 8601 format */
  readonly timestamp: string
  /** Log level */
  readonly level: LogLevel
  /** Log message */
  readonly message: string
  /** Logger component/module name */
  readonly component: string
  /** Optional structured data associated with the log entry */
  readonly data?: Record<string, unknown>
  /** Optional error information */
  readonly error?: {
    readonly name: string
    readonly message: string
    readonly stack?: string
  }
  /** GitHub Actions workflow run ID for correlation */
  readonly runId?: string
  /** Repository context for multi-repo analytics */
  readonly repository?: string
}

/**
 * Log level hierarchy for filtering (higher numbers = more severe).
 */
const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

/**
 * Configuration options for the analytics logger.
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  readonly level: LogLevel
  /** Whether to output JSON format for structured parsing */
  readonly json: boolean
  /** Whether to use GitHub Actions native logging */
  readonly useActionsLogging: boolean
  /** Component name for this logger instance */
  readonly component: string
  /** Whether to include stack traces in error logs */
  readonly includeStackTrace: boolean
  /** Maximum length for log messages (truncates if exceeded) */
  readonly maxMessageLength: number
}

/**
 * Default logger configuration values.
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  json: true,
  useActionsLogging: true,
  component: 'analytics',
  includeStackTrace: false,
  maxMessageLength: 1000,
} as const

/**
 * Analytics logger with structured output and GitHub Actions integration.
 */
export class AnalyticsLogger {
  private readonly config: LoggerConfig
  private readonly logBuffer: LogEntry[] = []

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {...DEFAULT_LOGGER_CONFIG, ...config}
  }

  /**
   * Create a logger from analytics configuration.
   */
  static fromAnalyticsConfig(analyticsConfig: AnalyticsConfig, component = 'analytics'): AnalyticsLogger {
    return new AnalyticsLogger({
      level: analyticsConfig.logLevel,
      component,
      json: true,
      useActionsLogging: true,
      includeStackTrace: analyticsConfig.logLevel === 'debug',
    })
  }

  /**
   * Log a debug message with optional structured data.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  /**
   * Log an info message with optional structured data.
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  /**
   * Log a warning message with optional structured data.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  /**
   * Log an error message with optional structured data and error object.
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const errorData = error
      ? {
          name: error.name,
          message: error.message,
          stack: this.config.includeStackTrace ? error.stack : undefined,
        }
      : undefined

    this.log('error', message, data, errorData)
  }

  /**
   * Log a performance timing measurement.
   */
  timing(operation: string, duration: number, data?: Record<string, unknown>): void {
    this.info(`${operation} completed`, {
      operation,
      duration,
      unit: 'ms',
      ...data,
    })
  }

  /**
   * Log start of an operation for timing purposes.
   */
  operationStart(operation: string, data?: Record<string, unknown>): void {
    this.debug(`${operation} started`, {
      operation,
      event: 'start',
      timestamp: new Date().toISOString(),
      ...data,
    })
  }

  /**
   * Log completion of an operation with duration.
   */
  operationEnd(operation: string, startTime: number, success = true, data?: Record<string, unknown>): void {
    const duration = Date.now() - startTime
    const level = success ? 'info' : 'warn'
    const message = `${operation} ${success ? 'completed' : 'failed'}`

    this.log(level, message, {
      operation,
      event: 'end',
      success,
      duration,
      unit: 'ms',
      ...data,
    })
  }

  /**
   * Get all log entries from the buffer.
   */
  getLogEntries(): readonly LogEntry[] {
    return [...this.logBuffer]
  }

  /**
   * Clear the log buffer.
   */
  clearBuffer(): void {
    this.logBuffer.length = 0
  }

  /**
   * Get log entries filtered by level.
   */
  getLogEntriesByLevel(level: LogLevel): readonly LogEntry[] {
    const minLevel = LOG_LEVEL_HIERARCHY[level]
    return this.logBuffer.filter(entry => LOG_LEVEL_HIERARCHY[entry.level] >= minLevel)
  }

  /**
   * Export log entries in JSON format for analytics storage.
   */
  exportAsJson(): string {
    return JSON.stringify(this.logBuffer, null, 2)
  }

  /**
   * Core logging method with consistent structure and filtering.
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: {readonly name: string; readonly message: string; readonly stack?: string},
  ): void {
    // Filter based on configured log level
    if (LOG_LEVEL_HIERARCHY[level] < LOG_LEVEL_HIERARCHY[this.config.level]) {
      return
    }

    // Truncate message if it exceeds maximum length
    const truncatedMessage =
      message.length > this.config.maxMessageLength ? `${message.slice(0, this.config.maxMessageLength)}...` : message

    // Create structured log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: truncatedMessage,
      component: this.config.component,
      data: data ? this.sanitizeData(data) : undefined,
      error,
      runId: env.GITHUB_RUN_ID,
      repository: env.GITHUB_REPOSITORY,
    }

    // Add to buffer for later retrieval
    this.logBuffer.push(logEntry)

    // Output to console/GitHub Actions
    this.outputLog(logEntry)
  }

  /**
   * Output log entry to console or GitHub Actions logging.
   */
  private outputLog(entry: LogEntry): void {
    if (this.config.useActionsLogging) {
      // Use GitHub Actions native logging functions
      switch (entry.level) {
        case 'debug':
          core.debug(this.formatLogMessage(entry))
          break
        case 'info':
          core.info(this.formatLogMessage(entry))
          break
        case 'warn':
          core.warning(this.formatLogMessage(entry))
          break
        case 'error':
          core.error(this.formatLogMessage(entry))
          break
      }
    } else {
      // Use console logging with appropriate methods (only warn/error allowed)
      const formattedMessage = this.formatLogMessage(entry)
      switch (entry.level) {
        case 'debug':
        case 'info':
          // eslint-disable-next-line no-console
          console.log(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'error':
          console.error(formattedMessage)
          break
      }
    }
  }

  /**
   * Format log entry for output based on configuration.
   */
  private formatLogMessage(entry: LogEntry): string {
    // For GitHub Actions logging, always use plain text messages
    // The Actions logging system provides its own formatting
    if (this.config.useActionsLogging) {
      return entry.message
    }

    if (this.config.json) {
      return JSON.stringify(entry)
    }

    // Human-readable format for non-JSON output
    let message = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.component}] ${entry.message}`

    if (entry.data && Object.keys(entry.data).length > 0) {
      message += ` ${JSON.stringify(entry.data)}`
    }

    if (entry.error) {
      message += ` Error: ${entry.error.name}: ${entry.error.message}`
      if (typeof entry.error?.stack === 'string' && entry.error.stack.length > 0) {
        message += `\n${entry.error.stack}`
      }
    }

    return message
  }

  /**
   * Sanitize data to prevent logging sensitive information.
   * This is a basic implementation - full sanitization is in sanitizer.ts.
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'credential']
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value) ? '[Array]' : '[Object]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }
}

/**
 * Create a singleton logger instance for global use.
 */
let globalLogger: AnalyticsLogger | undefined

/**
 * Get or create the global analytics logger instance.
 */
export function getLogger(config?: Partial<LoggerConfig>): AnalyticsLogger {
  if (!globalLogger) {
    globalLogger = new AnalyticsLogger(config)
  }
  return globalLogger
}

/**
 * Set the global analytics logger instance.
 */
export function setLogger(logger: AnalyticsLogger): void {
  globalLogger = logger
}

/**
 * Reset the global logger (useful for testing).
 */
export function resetLogger(): void {
  globalLogger = undefined
}

/**
 * Utility function to measure execution time of async operations.
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  logger?: AnalyticsLogger,
): Promise<{result: T; duration: number}> {
  const log = logger ?? getLogger()
  const startTime = Date.now()

  log.operationStart(operation)

  try {
    const result = await fn()
    const duration = Date.now() - startTime
    log.operationEnd(operation, startTime, true, {duration})
    return {result, duration}
  } catch (error) {
    const duration = Date.now() - startTime
    log.operationEnd(operation, startTime, false, {duration})
    log.error(`${operation} failed`, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Utility function to measure execution time of synchronous operations.
 */
export function withTimingSync<T>(
  operation: string,
  fn: () => T,
  logger?: AnalyticsLogger,
): {result: T; duration: number} {
  const log = logger ?? getLogger()
  const startTime = Date.now()

  log.operationStart(operation)

  try {
    const result = fn()
    const duration = Date.now() - startTime
    log.operationEnd(operation, startTime, true, {duration})
    return {result, duration}
  } catch (error) {
    const duration = Date.now() - startTime
    log.operationEnd(operation, startTime, false, {duration})
    log.error(`${operation} failed`, error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

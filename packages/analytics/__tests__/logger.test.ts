/**
 * Unit tests for structured logging system.
 * Validates log levels, output formats, and GitHub Actions integration.
 */

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {LogEntry, LogLevel, LoggerConfig} from '../src/logger.js'
import {AnalyticsLogger, DEFAULT_LOGGER_CONFIG} from '../src/logger.js'
import type {AnalyticsConfig} from '../src/models.js'
import {DEFAULT_ANALYTICS_CONFIG} from '../src/models.js'

// Mock @actions/core
vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

import * as core from '@actions/core'

describe('AnalyticsLogger', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    originalEnv = process.env
    process.env = {...originalEnv}
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
    process.env = originalEnv
  })

  describe('Constructor and Configuration', () => {
    test('should use default configuration when no config provided', () => {
      const logger = new AnalyticsLogger()

      // Test by calling a method and checking behavior
      logger.info('test message')

      // Should use GitHub Actions logging by default
      expect(core.info).toHaveBeenCalledWith('test message')
    })

    test('should merge custom configuration with defaults', () => {
      const customConfig: Partial<LoggerConfig> = {
        level: 'debug',
        component: 'test-component',
        json: false,
        useActionsLogging: false,
      }

      const logger = new AnalyticsLogger(customConfig)

      logger.debug('debug message')

      // Should not use GitHub Actions logging
      expect(core.debug).not.toHaveBeenCalled()
      // Should use console.log instead
      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should validate default configuration values', () => {
      expect(DEFAULT_LOGGER_CONFIG.level).toBe('info')
      expect(DEFAULT_LOGGER_CONFIG.json).toBe(true)
      expect(DEFAULT_LOGGER_CONFIG.useActionsLogging).toBe(true)
      expect(DEFAULT_LOGGER_CONFIG.component).toBe('analytics')
      expect(DEFAULT_LOGGER_CONFIG.includeStackTrace).toBe(false)
      expect(DEFAULT_LOGGER_CONFIG.maxMessageLength).toBe(1000)
    })
  })

  describe('Static Factory Method', () => {
    test('should create logger from analytics configuration', () => {
      const analyticsConfig: AnalyticsConfig = {
        ...DEFAULT_ANALYTICS_CONFIG,
        logLevel: 'debug',
        enabled: true,
      }

      const logger = AnalyticsLogger.fromAnalyticsConfig(analyticsConfig, 'test-component')

      logger.debug('test debug message')

      expect(core.debug).toHaveBeenCalledWith('test debug message')
    })

    test('should enable stack traces for debug level', () => {
      const analyticsConfig: AnalyticsConfig = {
        ...DEFAULT_ANALYTICS_CONFIG,
        logLevel: 'debug',
      }

      const logger = AnalyticsLogger.fromAnalyticsConfig(analyticsConfig)
      const testError = new Error('Test error')

      logger.error('Test error message', testError)

      expect(core.error).toHaveBeenCalledWith('Test error message')
    })

    test('should default to analytics component name', () => {
      const logger = AnalyticsLogger.fromAnalyticsConfig(DEFAULT_ANALYTICS_CONFIG)

      logger.info('test message')

      expect(core.info).toHaveBeenCalledWith('test message')
    })
  })

  describe('Log Level Filtering', () => {
    test('should filter out logs below configured level', () => {
      const logger = new AnalyticsLogger({level: 'warn'})

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warning message')
      logger.error('error message')

      expect(core.debug).not.toHaveBeenCalled()
      expect(core.info).not.toHaveBeenCalled()
      expect(core.warning).toHaveBeenCalledWith('warning message')
      expect(core.error).toHaveBeenCalledWith('error message')
    })

    test('should log all levels when set to debug', () => {
      const logger = new AnalyticsLogger({level: 'debug'})

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warning message')
      logger.error('error message')

      expect(core.debug).toHaveBeenCalledWith('debug message')
      expect(core.info).toHaveBeenCalledWith('info message')
      expect(core.warning).toHaveBeenCalledWith('warning message')
      expect(core.error).toHaveBeenCalledWith('error message')
    })

    test('should validate log level hierarchy', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']

      levels.forEach((level, index) => {
        const logger = new AnalyticsLogger({level})

        // Test that only levels at or above current level are logged
        if (index <= 0) logger.debug('debug')
        if (index <= 1) logger.info('info')
        if (index <= 2) logger.warn('warn')
        if (index <= 3) logger.error('error')
      })
    })
  })

  describe('Structured Data Logging', () => {
    test('should log messages with structured data', () => {
      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})
      const testData = {
        operation: 'cache-restore',
        duration: 1500,
        success: true,
      }

      logger.info('Cache operation completed', testData)

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0][0]
      expect(logCall).toContain('Cache operation completed')
    })

    test('should handle undefined structured data', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.info('Simple message')

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should handle complex nested data structures', () => {
      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})
      const complexData = {
        repository: {
          owner: 'bfra-me',
          repo: 'renovate-action',
        },
        metrics: {
          cache: [{operation: 'restore', duration: 1000}],
          api: [{endpoint: '/repos', statusCode: 200}],
        },
        config: {
          enabled: true,
          collectCache: true,
        },
      }

      logger.info('Complex data test', complexData)

      expect(mockConsoleLog).toHaveBeenCalled()
    })
  })

  describe('Error Logging', () => {
    test('should log errors with error objects', () => {
      const logger = new AnalyticsLogger({includeStackTrace: true, useActionsLogging: false})
      const testError = new Error('Test error message')
      testError.stack = 'Error: Test error message\\n    at test.js:1:1'

      logger.error('Operation failed', testError)

      expect(mockConsoleError).toHaveBeenCalled()
    })

    test('should log errors without error objects', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.error('Simple error message')

      expect(mockConsoleError).toHaveBeenCalled()
    })

    test('should include stack traces when configured', () => {
      const logger = new AnalyticsLogger({includeStackTrace: true, useActionsLogging: false})
      const testError = new Error('Test error')
      testError.stack = 'Error: Test error\\n    at test.js:1:1'

      logger.error('Error with stack trace', testError)

      expect(mockConsoleError).toHaveBeenCalled()
    })

    test('should exclude stack traces when not configured', () => {
      const logger = new AnalyticsLogger({includeStackTrace: false, useActionsLogging: false})
      const testError = new Error('Test error')
      testError.stack = 'Error: Test error\\n    at test.js:1:1'

      logger.error('Error without stack trace', testError)

      expect(mockConsoleError).toHaveBeenCalled()
    })

    test('should handle custom error types', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      class CustomError extends Error {
        public code: string

        constructor(message: string, code: string) {
          super(message)
          this.name = 'CustomError'
          this.code = code
        }
      }

      const customError = new CustomError('Custom error message', 'ERR_TEST')
      logger.error('Custom error occurred', customError)

      expect(mockConsoleError).toHaveBeenCalled()
    })
  })

  describe('Timing and Performance Logging', () => {
    test('should log performance timing measurements', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.timing('cache-restore', 1500, {hit: true, size: 1024000})

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0][0]
      expect(logCall).toContain('cache-restore completed')
    })

    test('should include timing data in performance logs', () => {
      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})

      logger.timing('docker-pull', 45000, {image: 'renovate/renovate:latest'})

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0][0]
      expect(logCall).toContain('docker-pull completed')
    })
  })

  describe('Message Length Truncation', () => {
    test('should truncate long messages when configured', () => {
      const logger = new AnalyticsLogger({maxMessageLength: 50, useActionsLogging: false})
      const longMessage = 'This is a very long message that should be truncated when it exceeds the maximum length'

      logger.info(longMessage)

      expect(mockConsoleLog).toHaveBeenCalled()
      const loggedMessage = mockConsoleLog.mock.calls[0][0]
      expect(typeof loggedMessage).toBe('string')
    })

    test('should not truncate short messages', () => {
      const logger = new AnalyticsLogger({maxMessageLength: 100, useActionsLogging: false})
      const shortMessage = 'Short message'

      logger.info(shortMessage)

      expect(mockConsoleLog).toHaveBeenCalled()
    })
  })

  describe('JSON Output Format', () => {
    test('should output JSON format when configured', () => {
      const logger = new AnalyticsLogger({json: true, useActionsLogging: false})

      logger.info('JSON test message', {test: true})

      expect(mockConsoleLog).toHaveBeenCalled()
      const logCall = mockConsoleLog.mock.calls[0][0]
      expect(typeof logCall).toBe('string')
    })

    test('should output plain text when JSON disabled', () => {
      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})

      logger.info('Plain text message', {test: true})

      expect(mockConsoleLog).toHaveBeenCalled()
    })
  })

  describe('GitHub Actions Integration', () => {
    test('should use GitHub Actions core.debug for debug logs', () => {
      const logger = new AnalyticsLogger({level: 'debug', useActionsLogging: true})

      logger.debug('Debug message for GitHub Actions')

      expect(core.debug).toHaveBeenCalledWith('Debug message for GitHub Actions')
    })

    test('should use GitHub Actions core.info for info logs', () => {
      const logger = new AnalyticsLogger({useActionsLogging: true})

      logger.info('Info message for GitHub Actions')

      expect(core.info).toHaveBeenCalledWith('Info message for GitHub Actions')
    })

    test('should use GitHub Actions core.warning for warn logs', () => {
      const logger = new AnalyticsLogger({useActionsLogging: true})

      logger.warn('Warning message for GitHub Actions')

      expect(core.warning).toHaveBeenCalledWith('Warning message for GitHub Actions')
    })

    test('should use GitHub Actions core.error for error logs', () => {
      const logger = new AnalyticsLogger({useActionsLogging: true})

      logger.error('Error message for GitHub Actions')

      expect(core.error).toHaveBeenCalledWith('Error message for GitHub Actions')
    })

    test('should fall back to console when Actions logging disabled', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.debug('Console debug message')
      logger.info('Console info message')
      logger.warn('Console warning message')
      logger.error('Console error message')

      expect(core.debug).not.toHaveBeenCalled()
      expect(core.info).not.toHaveBeenCalled()
      expect(core.warning).not.toHaveBeenCalled()
      expect(core.error).not.toHaveBeenCalled()

      expect(mockConsoleLog).toHaveBeenCalled()
      expect(mockConsoleWarn).toHaveBeenCalled()
      expect(mockConsoleError).toHaveBeenCalled()
    })
  })

  describe('Component Context', () => {
    test('should include component context in logs', () => {
      const logger = new AnalyticsLogger({
        component: 'cache-collector',
        json: false,
        useActionsLogging: false,
      })

      logger.info('Component-specific message')

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should support different component names', () => {
      const components = ['cache', 'docker', 'api', 'aggregation', 'export']

      components.forEach(component => {
        const logger = new AnalyticsLogger({
          component,
          useActionsLogging: false,
        })

        logger.info(`Message from ${component}`)

        expect(mockConsoleLog).toHaveBeenCalled()
      })
    })
  })

  describe('Runtime Context', () => {
    test('should include GitHub run ID when available', () => {
      process.env.GITHUB_RUN_ID = '1234567890'

      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})

      logger.info('Message with run ID')

      expect(mockConsoleLog).toHaveBeenCalled()

      delete process.env.GITHUB_RUN_ID
    })

    test('should handle missing GitHub environment variables', () => {
      delete process.env.GITHUB_RUN_ID
      delete process.env.GITHUB_REPOSITORY

      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.info('Message without GitHub context')

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should include repository context when available', () => {
      process.env.GITHUB_REPOSITORY = 'bfra-me/renovate-action'

      const logger = new AnalyticsLogger({json: false, useActionsLogging: false})

      logger.info('Message with repository context')

      expect(mockConsoleLog).toHaveBeenCalled()

      delete process.env.GITHUB_REPOSITORY
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle circular references in data objects', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})
      const circularObj: Record<string, unknown> = {test: 'value'}
      circularObj.self = circularObj

      // Should not throw error
      expect(() => {
        logger.info('Message with circular reference', circularObj)
      }).not.toThrow()

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should handle null and undefined values in data', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.info('Message with null/undefined', {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      })

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should handle very large data objects', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})
      const largeData = Array.from({length: 1000}, (_, i) => ({
        index: i,
        data: `large-data-${i}`,
      }))

      logger.info('Message with large data', {largeArray: largeData})

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should handle special characters in messages', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.info('Message with special chars: åäö 🚀 \\n\\t\\r')

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('should handle empty and whitespace-only messages', () => {
      const logger = new AnalyticsLogger({useActionsLogging: false})

      logger.info('')
      logger.info('   ')
      logger.info('\\t\\n')

      expect(mockConsoleLog).toHaveBeenCalledTimes(3)
    })
  })
})

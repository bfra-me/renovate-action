/**
 * Tests for analytics validation system.
 */

import {describe, expect, test} from 'vitest'
import {
  SchemaValidationError,
  assertValidAnalyticsData,
  validateAnalyticsConfig,
  validateCacheMetrics,
  validateRepositoryInfo,
} from '../src/validation.js'

describe('Validation System', () => {
  describe('validateRepositoryInfo', () => {
    test('should validate valid repository info', () => {
      const validRepo = {
        owner: 'bfra-me',
        repo: 'renovate-action',
        fullName: 'bfra-me/renovate-action',
        id: 123456,
        visibility: 'public' as const,
      }

      const result = validateRepositoryInfo(validRepo)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid repository info', () => {
      const invalidRepo = {
        owner: 123, // Should be string
        repo: 'renovate-action',
        fullName: 'bfra-me/renovate-action',
        id: 'not-a-number', // Should be number
        visibility: 'invalid', // Should be public or private
      }

      const result = validateRepositoryInfo(invalidRepo)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toBeInstanceOf(SchemaValidationError)
    })

    test('should handle non-object input', () => {
      const result = validateRepositoryInfo('not an object')

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]?.field).toBe('root')
    })
  })

  describe('validateCacheMetrics', () => {
    test('should validate valid cache metrics', () => {
      const validMetrics = {
        operation: 'restore' as const,
        key: 'renovate-cache-key',
        version: 'v1',
        startTime: '2025-08-25T10:00:00.000Z',
        endTime: '2025-08-25T10:00:05.000Z',
        duration: 5000,
        success: true,
        hit: true,
        size: 1024,
      }

      const result = validateCacheMetrics(validMetrics)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid operation type', () => {
      const invalidMetrics = {
        operation: 'invalid-operation',
        key: 'renovate-cache-key',
        version: 'v1',
        startTime: '2025-08-25T10:00:00.000Z',
        endTime: '2025-08-25T10:00:05.000Z',
        duration: 5000,
        success: true,
      }

      const result = validateCacheMetrics(invalidMetrics)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.field === 'operation')).toBe(true)
    })

    test('should reject negative duration', () => {
      const invalidMetrics = {
        operation: 'restore' as const,
        key: 'renovate-cache-key',
        version: 'v1',
        startTime: '2025-08-25T10:00:00.000Z',
        endTime: '2025-08-25T10:00:05.000Z',
        duration: -1000, // Invalid negative duration
        success: true,
      }

      const result = validateCacheMetrics(invalidMetrics)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.field === 'duration')).toBe(true)
    })
  })

  describe('validateAnalyticsConfig', () => {
    test('should validate valid config', () => {
      const validConfig = {
        enabled: true,
        logLevel: 'info' as const,
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true,
        sampleRate: 0.8,
        cacheKeyPrefix: 'renovate-analytics',
        maxDataSize: 10485760,
        retentionDays: 7,
        sanitizePatterns: ['token', 'secret'],
      }

      const result = validateAnalyticsConfig(validConfig)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject invalid sample rate', () => {
      const invalidConfig = {
        enabled: true,
        logLevel: 'info' as const,
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true,
        sampleRate: 1.5, // Invalid > 1
        cacheKeyPrefix: 'renovate-analytics',
        maxDataSize: 10485760,
        retentionDays: 7,
        sanitizePatterns: ['token', 'secret'],
      }

      const result = validateAnalyticsConfig(invalidConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.field === 'sampleRate')).toBe(true)
    })

    test('should reject invalid log level', () => {
      const invalidConfig = {
        enabled: true,
        logLevel: 'trace' as any, // Invalid log level
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true,
        sampleRate: 1,
        cacheKeyPrefix: 'renovate-analytics',
        maxDataSize: 10485760,
        retentionDays: 7,
        sanitizePatterns: ['token', 'secret'],
      }

      const result = validateAnalyticsConfig(invalidConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.field === 'logLevel')).toBe(true)
    })
  })

  describe('assertValidAnalyticsData', () => {
    test('should not throw for valid data', () => {
      const validConfig = {
        enabled: true,
        logLevel: 'info' as const,
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true,
        sampleRate: 1,
        cacheKeyPrefix: 'renovate-analytics',
        maxDataSize: 10485760,
        retentionDays: 7,
        sanitizePatterns: ['token'],
      }

      expect(() => assertValidAnalyticsData(validConfig, 'AnalyticsConfig')).not.toThrow()
    })

    test('should throw SchemaValidationError for invalid data', () => {
      const invalidConfig = {
        enabled: 'not-a-boolean', // Invalid type
      }

      expect(() => assertValidAnalyticsData(invalidConfig, 'AnalyticsConfig')).toThrow(SchemaValidationError)
    })
  })
})

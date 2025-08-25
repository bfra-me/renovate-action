/**
 * Tests for analytics configuration system.
 */

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {
  ConfigValidationError,
  ENV_VAR_NAMES,
  createConfig,
  getConfigSummary,
  isAnalyticsEnabled,
  isMetricCollectionEnabled,
  loadConfigFromEnvironment,
  resetDefaultConfig,
  shouldCollectSample,
} from '../src/config.js'
import type {AnalyticsConfig} from '../src/models.js'

describe('Configuration System', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {...originalEnv}
    resetDefaultConfig()
  })

  afterEach(() => {
    process.env = originalEnv
    resetDefaultConfig()
  })

  describe('createConfig', () => {
    test('should create default config with no overrides', () => {
      const config = createConfig()

      expect(config.enabled).toBe(false)
      expect(config.logLevel).toBe('info')
      expect(config.collectCache).toBe(true)
      expect(config.sampleRate).toBe(1)
      expect(config.cacheKeyPrefix).toBe('renovate-analytics')
    })

    test('should create config with overrides', () => {
      const config = createConfig({
        enabled: true,
        logLevel: 'debug',
        sampleRate: 0.5,
      })

      expect(config.enabled).toBe(true)
      expect(config.logLevel).toBe('debug')
      expect(config.sampleRate).toBe(0.5)
      expect(config.collectCache).toBe(true) // Default preserved
    })

    test('should validate sample rate', () => {
      expect(() => createConfig({sampleRate: -0.1})).toThrow(ConfigValidationError)
      expect(() => createConfig({sampleRate: 1.1})).toThrow(ConfigValidationError)
      expect(() => createConfig({sampleRate: 0})).not.toThrow()
      expect(() => createConfig({sampleRate: 1})).not.toThrow()
    })

    test('should validate data size', () => {
      expect(() => createConfig({maxDataSize: 0})).toThrow(ConfigValidationError)
      expect(() => createConfig({maxDataSize: -1})).toThrow(ConfigValidationError)
      expect(() => createConfig({maxDataSize: 1})).not.toThrow()
    })
  })

  describe('loadConfigFromEnvironment', () => {
    test('should load default config when no env vars set', () => {
      const config = loadConfigFromEnvironment()

      expect(config.enabled).toBe(false)
      expect(config.logLevel).toBe('info')
      expect(config.collectCache).toBe(true)
    })

    test('should load config from environment variables', () => {
      process.env[ENV_VAR_NAMES.ENABLED] = 'true'
      process.env[ENV_VAR_NAMES.LOG_LEVEL] = 'debug'
      process.env[ENV_VAR_NAMES.SAMPLE_RATE] = '0.8'
      process.env[ENV_VAR_NAMES.COLLECT_CACHE] = 'false'

      const config = loadConfigFromEnvironment()

      expect(config.enabled).toBe(true)
      expect(config.logLevel).toBe('debug')
      expect(config.sampleRate).toBe(0.8)
      expect(config.collectCache).toBe(false)
    })

    test('should handle boolean parsing variations', () => {
      process.env[ENV_VAR_NAMES.ENABLED] = 'yes'
      process.env[ENV_VAR_NAMES.COLLECT_CACHE] = '1'
      process.env[ENV_VAR_NAMES.COLLECT_DOCKER] = 'no'
      process.env[ENV_VAR_NAMES.COLLECT_API] = '0'

      const config = loadConfigFromEnvironment()

      expect(config.enabled).toBe(true)
      expect(config.collectCache).toBe(true)
      expect(config.collectDocker).toBe(false)
      expect(config.collectApi).toBe(false)
    })

    test('should throw on invalid boolean values', () => {
      process.env[ENV_VAR_NAMES.ENABLED] = 'maybe'

      expect(() => loadConfigFromEnvironment()).toThrow(ConfigValidationError)
    })

    test('should throw on invalid log level', () => {
      process.env[ENV_VAR_NAMES.LOG_LEVEL] = 'trace'

      expect(() => loadConfigFromEnvironment()).toThrow(ConfigValidationError)
    })
  })

  describe('utility functions', () => {
    test('isAnalyticsEnabled should return correct value', () => {
      expect(isAnalyticsEnabled({enabled: true} as AnalyticsConfig)).toBe(true)
      expect(isAnalyticsEnabled({enabled: false} as AnalyticsConfig)).toBe(false)
    })

    test('isMetricCollectionEnabled should check enabled and specific metric', () => {
      const config = createConfig({
        enabled: true,
        collectCache: true,
        collectDocker: false,
      })

      expect(isMetricCollectionEnabled(config, 'cache')).toBe(true)
      expect(isMetricCollectionEnabled(config, 'docker')).toBe(false)
      expect(isMetricCollectionEnabled(config, 'api')).toBe(true) // Default true

      const disabledConfig = createConfig({enabled: false})
      expect(isMetricCollectionEnabled(disabledConfig, 'cache')).toBe(false)
    })

    test('shouldCollectSample should respect sample rate', () => {
      const alwaysConfig = createConfig({enabled: true, sampleRate: 1})
      const neverConfig = createConfig({enabled: true, sampleRate: 0})
      const disabledConfig = createConfig({enabled: false, sampleRate: 1})

      expect(shouldCollectSample(alwaysConfig)).toBe(true)
      expect(shouldCollectSample(neverConfig)).toBe(false)
      expect(shouldCollectSample(disabledConfig)).toBe(false)
    })

    test('getConfigSummary should return sanitized config info', () => {
      const config = createConfig({
        enabled: true,
        sanitizePatterns: ['token', 'secret', 'key'],
      })

      const summary = getConfigSummary(config)

      expect(summary.enabled).toBe(true)
      expect(summary.sanitizePatternsCount).toBe(3)
      expect(summary).not.toHaveProperty('sanitizePatterns') // Should not expose patterns
    })
  })
})

/**
 * Configuration system for enabling/disabling analytics collection.
 * Supports environment variables and programmatic configuration.
 */

import type {LogLevel} from './logger.js'
import type {AnalyticsConfig} from './models.js'
import process from 'node:process'

import {DEFAULT_ANALYTICS_CONFIG} from './models.js'

/**
 * Environment variable names for analytics configuration.
 */
export const ENV_VAR_NAMES = {
  /** Whether analytics collection is enabled */
  ENABLED: 'RENOVATE_ANALYTICS_ENABLED',
  /** Log level for analytics operations */
  LOG_LEVEL: 'RENOVATE_ANALYTICS_LOG_LEVEL',
  /** Whether to collect cache metrics */
  COLLECT_CACHE: 'RENOVATE_ANALYTICS_COLLECT_CACHE',
  /** Whether to collect Docker metrics */
  COLLECT_DOCKER: 'RENOVATE_ANALYTICS_COLLECT_DOCKER',
  /** Whether to collect API metrics */
  COLLECT_API: 'RENOVATE_ANALYTICS_COLLECT_API',
  /** Whether to collect failure metrics */
  COLLECT_FAILURES: 'RENOVATE_ANALYTICS_COLLECT_FAILURES',
  /** Sample rate for metrics collection (0-1) */
  SAMPLE_RATE: 'RENOVATE_ANALYTICS_SAMPLE_RATE',
  /** Cache key prefix for analytics data storage */
  CACHE_KEY_PREFIX: 'RENOVATE_ANALYTICS_CACHE_KEY_PREFIX',
  /** Maximum size of analytics data to store (bytes) */
  MAX_DATA_SIZE: 'RENOVATE_ANALYTICS_MAX_DATA_SIZE',
  /** Data retention period in days */
  RETENTION_DAYS: 'RENOVATE_ANALYTICS_RETENTION_DAYS',
  /** Sensitive data patterns to sanitize (comma-separated) */
  SANITIZE_PATTERNS: 'RENOVATE_ANALYTICS_SANITIZE_PATTERNS',
} as const

/**
 * Configuration validation errors.
 */
export class ConfigValidationError extends Error {
  readonly field: string
  readonly value: unknown

  constructor(message: string, field: string, value: unknown) {
    super(`Configuration validation error for ${field}: ${message}`)
    this.name = 'ConfigValidationError'
    this.field = field
    this.value = value
  }
}

/**
 * Parse a boolean value from environment variable.
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  const normalized = value.toLowerCase().trim()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  throw new ConfigValidationError(`Expected boolean value, got: ${value}`, 'boolean', value)
}

/**
 * Parse a number value from environment variable with validation.
 */
function parseNumber(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined) return defaultValue
  const parsed = Number.parseFloat(value.trim())
  if (Number.isNaN(parsed)) {
    throw new ConfigValidationError(`Expected number, got: ${value}`, 'number', value)
  }
  if (min !== undefined && parsed < min) {
    throw new ConfigValidationError(`Value ${parsed} is below minimum ${min}`, 'number', value)
  }
  if (max !== undefined && parsed > max) {
    throw new ConfigValidationError(`Value ${parsed} is above maximum ${max}`, 'number', value)
  }
  return parsed
}

/**
 * Parse log level from environment variable with validation.
 */
function parseLogLevel(value: string | undefined, defaultValue: LogLevel): LogLevel {
  if (value === undefined) return defaultValue
  const normalized = value.toLowerCase().trim() as LogLevel
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error']
  if (!validLevels.includes(normalized)) {
    throw new ConfigValidationError(`Expected one of: ${validLevels.join(', ')}, got: ${value}`, 'logLevel', value)
  }
  return normalized
}

/**
 * Parse comma-separated patterns from environment variable.
 */
function parsePatterns(value: string | undefined, defaultValue: readonly string[]): readonly string[] {
  if (value === undefined) return defaultValue
  return value
    .split(',')
    .map(pattern => pattern.trim())
    .filter(pattern => pattern.length > 0)
}

/**
 * Validate analytics configuration values.
 */
function validateConfig(config: AnalyticsConfig): void {
  // Validate sample rate
  if (config.sampleRate < 0 || config.sampleRate > 1) {
    throw new ConfigValidationError(
      `Sample rate must be between 0 and 1, got: ${config.sampleRate}`,
      'sampleRate',
      config.sampleRate,
    )
  }

  // Validate data size
  if (config.maxDataSize <= 0) {
    throw new ConfigValidationError(
      `Max data size must be positive, got: ${config.maxDataSize}`,
      'maxDataSize',
      config.maxDataSize,
    )
  }

  // Validate retention days
  if (config.retentionDays <= 0) {
    throw new ConfigValidationError(
      `Retention days must be positive, got: ${config.retentionDays}`,
      'retentionDays',
      config.retentionDays,
    )
  }

  // Validate cache key prefix
  if (!config.cacheKeyPrefix || config.cacheKeyPrefix.trim().length === 0) {
    throw new ConfigValidationError('Cache key prefix cannot be empty', 'cacheKeyPrefix', config.cacheKeyPrefix)
  }

  // Validate sanitize patterns
  if (config.sanitizePatterns.length === 0) {
    throw new ConfigValidationError(
      'At least one sanitize pattern must be provided',
      'sanitizePatterns',
      config.sanitizePatterns,
    )
  }
}

/**
 * Load analytics configuration from environment variables.
 */
export function loadConfigFromEnvironment(): AnalyticsConfig {
  try {
    const config: AnalyticsConfig = {
      enabled: parseBoolean(process.env[ENV_VAR_NAMES.ENABLED], DEFAULT_ANALYTICS_CONFIG.enabled),
      logLevel: parseLogLevel(process.env[ENV_VAR_NAMES.LOG_LEVEL], DEFAULT_ANALYTICS_CONFIG.logLevel),
      collectCache: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_CACHE], DEFAULT_ANALYTICS_CONFIG.collectCache),
      collectDocker: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_DOCKER], DEFAULT_ANALYTICS_CONFIG.collectDocker),
      collectApi: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_API], DEFAULT_ANALYTICS_CONFIG.collectApi),
      collectFailures: parseBoolean(
        process.env[ENV_VAR_NAMES.COLLECT_FAILURES],
        DEFAULT_ANALYTICS_CONFIG.collectFailures,
      ),
      sampleRate: parseNumber(process.env[ENV_VAR_NAMES.SAMPLE_RATE], DEFAULT_ANALYTICS_CONFIG.sampleRate, 0, 1),
      cacheKeyPrefix: process.env[ENV_VAR_NAMES.CACHE_KEY_PREFIX] ?? DEFAULT_ANALYTICS_CONFIG.cacheKeyPrefix,
      maxDataSize: parseNumber(process.env[ENV_VAR_NAMES.MAX_DATA_SIZE], DEFAULT_ANALYTICS_CONFIG.maxDataSize, 1),
      retentionDays: parseNumber(process.env[ENV_VAR_NAMES.RETENTION_DAYS], DEFAULT_ANALYTICS_CONFIG.retentionDays, 1),
      sanitizePatterns: parsePatterns(
        process.env[ENV_VAR_NAMES.SANITIZE_PATTERNS],
        DEFAULT_ANALYTICS_CONFIG.sanitizePatterns,
      ),
    }

    validateConfig(config)
    return config
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error
    }
    throw new ConfigValidationError(
      `Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`,
      'general',
      error,
    )
  }
}

/**
 * Create analytics configuration with overrides.
 */
export function createConfig(overrides: Partial<AnalyticsConfig> = {}): AnalyticsConfig {
  const config: AnalyticsConfig = {
    ...DEFAULT_ANALYTICS_CONFIG,
    ...overrides,
  }

  validateConfig(config)
  return config
}

/**
 * Check if analytics collection is enabled based on configuration.
 */
export function isAnalyticsEnabled(config: AnalyticsConfig): boolean {
  return config.enabled
}

/**
 * Check if specific metric collection is enabled.
 */
export function isMetricCollectionEnabled(
  config: AnalyticsConfig,
  metricType: 'cache' | 'docker' | 'api' | 'failures',
): boolean {
  if (!config.enabled) return false

  switch (metricType) {
    case 'cache':
      return config.collectCache
    case 'docker':
      return config.collectDocker
    case 'api':
      return config.collectApi
    case 'failures':
      return config.collectFailures
    default:
      return false
  }
}

/**
 * Check if analytics should be collected based on sample rate.
 */
export function shouldCollectSample(config: AnalyticsConfig): boolean {
  if (!config.enabled) return false
  if (config.sampleRate >= 1) return true
  if (config.sampleRate <= 0) return false
  return Math.random() < config.sampleRate
}

/**
 * Get configuration summary for logging.
 */
export function getConfigSummary(config: AnalyticsConfig): Record<string, unknown> {
  return {
    enabled: config.enabled,
    logLevel: config.logLevel,
    collectCache: config.collectCache,
    collectDocker: config.collectDocker,
    collectApi: config.collectApi,
    collectFailures: config.collectFailures,
    sampleRate: config.sampleRate,
    cacheKeyPrefix: config.cacheKeyPrefix,
    maxDataSize: config.maxDataSize,
    retentionDays: config.retentionDays,
    sanitizePatternsCount: config.sanitizePatterns.length,
  }
}

/**
 * Default analytics configuration instance loaded from environment.
 */
let defaultConfig: AnalyticsConfig | undefined

/**
 * Get the default analytics configuration (loaded once from environment).
 */
export function getDefaultConfig(): AnalyticsConfig {
  if (!defaultConfig) {
    defaultConfig = loadConfigFromEnvironment()
  }
  return defaultConfig
}

/**
 * Reset the default configuration cache (useful for testing).
 */
export function resetDefaultConfig(): void {
  defaultConfig = undefined
}

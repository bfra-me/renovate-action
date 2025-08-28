/**
 * Data sanitization functions to prevent secrets leakage in analytics data.
 * Provides comprehensive detection and redaction of sensitive information.
 */

import type {AnalyticsConfig} from './models.js'
import {createHash} from 'node:crypto'

import {AnalyticsLogger} from './logger.js'

/**
 * Types of sensitive data patterns to detect and sanitize.
 */
export type SensitiveDataType =
  | 'token'
  | 'password'
  | 'secret'
  | 'key'
  | 'credential'
  | 'bearer'
  | 'cookie'
  | 'session'
  | 'private'
  | 'email'
  | 'url'
  | 'ip'
  | 'uuid'

/**
 * Sanitization strategy for different types of sensitive data.
 */
export type SanitizationStrategy = 'redact' | 'hash' | 'partial' | 'remove'

/**
 * Configuration for data sanitization operations.
 */
export interface SanitizationConfig {
  /** Default strategy to use for unknown sensitive data */
  readonly defaultStrategy: SanitizationStrategy
  /** Strategies for specific data types */
  readonly strategies: Record<SensitiveDataType, SanitizationStrategy>
  /** Custom regex patterns to detect sensitive data */
  readonly customPatterns: readonly SensitivePattern[]
  /** Maximum length for partial masking */
  readonly partialMaskLength: number
  /** Character to use for masking */
  readonly maskCharacter: string
  /** Whether to preserve data structure in sanitized output */
  readonly preserveStructure: boolean
  /** Salt for hashing (should be unique per installation) */
  readonly hashSalt: string
}

/**
 * Custom pattern for detecting sensitive data.
 */
export interface SensitivePattern {
  /** Name of the pattern for logging/debugging */
  readonly name: string
  /** Regular expression to match sensitive data */
  readonly pattern: RegExp
  /** Data type category */
  readonly type: SensitiveDataType
  /** Sanitization strategy for this pattern */
  readonly strategy: SanitizationStrategy
  /** Whether this pattern should be case-sensitive */
  readonly caseSensitive: boolean
}

/**
 * Result of sanitization operation with metadata.
 */
export interface SanitizationResult {
  /** Sanitized data */
  readonly data: unknown
  /** Number of values that were sanitized */
  readonly sanitizedCount: number
  /** Types of sensitive data found */
  readonly foundTypes: readonly SensitiveDataType[]
  /** Whether any data was modified */
  readonly wasModified: boolean
  /** Warnings or notes about sanitization */
  readonly warnings: readonly string[]
}

/**
 * Default sanitization configuration.
 */
export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  defaultStrategy: 'redact',
  strategies: {
    token: 'redact',
    password: 'redact',
    secret: 'redact',
    key: 'redact',
    credential: 'redact',
    bearer: 'redact',
    cookie: 'redact',
    session: 'redact',
    private: 'redact',
    email: 'partial',
    url: 'partial',
    ip: 'hash',
    uuid: 'hash',
  },
  customPatterns: [],
  partialMaskLength: 4,
  maskCharacter: '*',
  preserveStructure: true,
  hashSalt: 'renovate-analytics-salt',
} as const

/**
 * Pre-defined patterns for common sensitive data types.
 */
export const BUILTIN_SENSITIVE_PATTERNS: readonly SensitivePattern[] = [
  // GitHub tokens
  {
    name: 'github-token',
    pattern: /\b(gh[ops]_\w{6,255})\b/g,
    type: 'token',
    strategy: 'redact',
    caseSensitive: true,
  },
  // Generic API keys
  {
    name: 'api-key',
    pattern: /\b(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"]?([\w+/=]{20,})['"]?/gi,
    type: 'key',
    strategy: 'redact',
    caseSensitive: false,
  },
  // Bearer tokens
  {
    name: 'bearer-token',
    pattern: /\bbearer\s+([\w+/=]{20,})\b/gi,
    type: 'bearer',
    strategy: 'redact',
    caseSensitive: false,
  },
  // Basic auth
  {
    name: 'basic-auth',
    pattern: /\bbasic\s+([\w+/=]{4,})\b/gi,
    type: 'credential',
    strategy: 'redact',
    caseSensitive: false,
  },
  // JWT tokens
  {
    name: 'jwt-token',
    pattern: /\beyJ[\w+/=]+\.[\w+/=]+\.[\w+/=]*\b/g,
    type: 'token',
    strategy: 'redact',
    caseSensitive: true,
  },
  // URLs with credentials
  {
    name: 'url-with-credentials',
    pattern: /(https?:\/\/)[^:@\s]+:[^@\s]+@([^/\s]+)/gi,
    type: 'url',
    strategy: 'partial',
    caseSensitive: false,
  },
  // Email addresses
  {
    name: 'email-address',
    pattern: /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
    type: 'email',
    strategy: 'partial',
    caseSensitive: false,
  },
  // IP addresses
  {
    name: 'ip-address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    type: 'ip',
    strategy: 'hash',
    caseSensitive: true,
  },
  // UUIDs
  {
    name: 'uuid',
    pattern: /\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi,
    type: 'uuid',
    strategy: 'hash',
    caseSensitive: false,
  },
  // Private keys
  {
    name: 'private-key',
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/gi,
    type: 'private',
    strategy: 'redact',
    caseSensitive: false,
  },
] as const

/**
 * Data sanitizer for preventing secrets leakage in analytics.
 */
export class DataSanitizer {
  private readonly config: SanitizationConfig
  private readonly logger: AnalyticsLogger
  private readonly allPatterns: readonly SensitivePattern[]

  constructor(config: Partial<SanitizationConfig> = {}, logger?: AnalyticsLogger) {
    this.config = {...DEFAULT_SANITIZATION_CONFIG, ...config}
    this.logger = logger ?? new AnalyticsLogger({component: 'sanitizer'})
    this.allPatterns = [...BUILTIN_SENSITIVE_PATTERNS, ...this.config.customPatterns]
  }

  /**
   * Create sanitizer from analytics configuration.
   */
  static fromAnalyticsConfig(analyticsConfig: AnalyticsConfig, logger?: AnalyticsLogger): DataSanitizer {
    const config: Partial<SanitizationConfig> = {
      customPatterns: analyticsConfig.sanitizePatterns.map(pattern => ({
        name: `custom-${pattern}`,
        pattern: new RegExp(pattern, 'gi'),
        type: 'secret' as const,
        strategy: 'redact' as const,
        caseSensitive: false,
      })),
    }

    return new DataSanitizer(config, logger)
  }

  /**
   * Sanitize any data structure, removing or masking sensitive information.
   */
  sanitize(data: unknown): SanitizationResult {
    const startTime = Date.now()
    let sanitizedCount = 0
    const foundTypes = new Set<SensitiveDataType>()
    const warnings: string[] = []

    this.logger.operationStart('sanitize-data', {
      dataType: typeof data,
      preserveStructure: this.config.preserveStructure,
    })

    try {
      const sanitizedData = this.sanitizeValue(
        data,
        foundTypes,
        count => {
          sanitizedCount += count
        },
        new WeakSet(),
      )

      const wasModified = sanitizedCount > 0

      if (wasModified) {
        this.logger.info('Data sanitization completed', {
          sanitizedCount,
          foundTypes: Array.from(foundTypes),
          preserveStructure: this.config.preserveStructure,
        })
      }

      this.logger.operationEnd('sanitize-data', startTime, true, {
        sanitizedCount,
        foundTypesCount: foundTypes.size,
      })

      return {
        data: sanitizedData,
        sanitizedCount,
        foundTypes: Array.from(foundTypes),
        wasModified,
        warnings,
      }
    } catch (error) {
      this.logger.operationEnd('sanitize-data', startTime, false)
      this.logger.error('Data sanitization failed', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Sanitize a string value using pattern matching.
   */
  sanitizeString(input: string): {sanitized: string; types: readonly SensitiveDataType[]} {
    let sanitized = input
    const foundTypes = new Set<SensitiveDataType>()

    for (const pattern of this.allPatterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)
      const matches = [...sanitized.matchAll(regex)]

      if (matches.length > 0) {
        foundTypes.add(pattern.type)

        for (const match of matches) {
          const sensitiveValue = match[0]
          const sanitizedValue = this.applySanitizationStrategy(sensitiveValue, pattern.strategy)
          sanitized = sanitized.replace(sensitiveValue, sanitizedValue)
        }
      }
    }

    // Check for common sensitive key patterns in JSON-like strings
    const keyPatterns = this.config.strategies
    for (const [keyType, strategy] of Object.entries(keyPatterns)) {
      const keyPattern = new RegExp(`["']?[\\w]*${keyType}[\\w]*["']?\\s*[:=]\\s*["']?([^"',\\s}]+)["']?`, 'gi')
      const matches = [...sanitized.matchAll(keyPattern)]

      if (matches.length > 0) {
        foundTypes.add(keyType as SensitiveDataType)

        for (const match of matches) {
          const fullMatch = match[0]
          const sensitiveValue = match[1]
          if (typeof sensitiveValue === 'string' && sensitiveValue.length > 0) {
            const sanitizedValue = this.applySanitizationStrategy(sensitiveValue, strategy)
            const sanitizedFullMatch = fullMatch.replace(sensitiveValue, sanitizedValue)
            sanitized = sanitized.replace(fullMatch, sanitizedFullMatch)
          }
        }
      }
    }

    return {
      sanitized,
      types: Array.from(foundTypes),
    }
  }

  /**
   * Recursively sanitize any value type.
   */
  private sanitizeValue(
    value: unknown,
    foundTypes: Set<SensitiveDataType>,
    countCallback: (count: number) => void,
    visited = new WeakSet(),
  ): unknown {
    if (value === null || value === undefined) {
      // Convert null/undefined to safe placeholder for analytics
      return value === undefined ? '[undefined]' : '[null]'
    }

    if (typeof value === 'string') {
      const {sanitized, types} = this.sanitizeString(value)
      types.forEach(type => foundTypes.add(type))
      if (sanitized !== value) {
        countCallback(1)
      }
      return sanitized
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (Array.isArray(value)) {
      // Check for circular references
      if (visited.has(value)) {
        return '[Circular Reference]'
      }
      visited.add(value)

      if (!this.config.preserveStructure) {
        visited.delete(value)
        countCallback(1) // Count structure flattening as modification
        return '[Array]'
      }
      const result = value.map(item => this.sanitizeValue(item, foundTypes, countCallback, visited))
      visited.delete(value)
      return result
    }

    if (typeof value === 'object') {
      // Check for circular references
      if (visited.has(value)) {
        return '[Circular Reference]'
      }
      visited.add(value)

      if (!this.config.preserveStructure) {
        visited.delete(value)
        countCallback(1) // Count structure flattening as modification
        return '[Object]'
      }

      const sanitizedObj: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        // Check if the key itself is sensitive
        const {sanitized: sanitizedKey} = this.sanitizeString(key)
        if (sanitizedKey !== key) {
          countCallback(1)
        }

        // Check if the key name indicates the value should be sanitized
        let valueSanitized = false
        const lowerKey = key.toLowerCase()
        for (const [keyType] of Object.entries(this.config.strategies)) {
          if (lowerKey.includes(keyType.toLowerCase())) {
            // This key name suggests the value contains sensitive data
            const strategy = this.config.strategies[keyType as SensitiveDataType]
            if (typeof val === 'string') {
              const sanitizedValue = this.applySanitizationStrategy(val, strategy)
              if (strategy === 'remove') {
                // Don't include the property at all
                valueSanitized = true
                foundTypes.add(keyType as SensitiveDataType)
                countCallback(1)
                break
              } else {
                sanitizedObj[sanitizedKey] = sanitizedValue
                foundTypes.add(keyType as SensitiveDataType)
                countCallback(1)
                valueSanitized = true
                break
              }
            }
          }
        }

        if (!valueSanitized) {
          // Sanitize the value normally
          const sanitizedValue = this.sanitizeValue(val, foundTypes, countCallback, visited)
          sanitizedObj[sanitizedKey] = sanitizedValue
        }
      }
      visited.delete(value)
      return sanitizedObj
    }

    // For other types, convert to string and sanitize
    if (typeof value === 'function') {
      return '[Function]'
    }

    const stringValue = String(value)
    const {sanitized} = this.sanitizeString(stringValue)
    if (sanitized !== stringValue) {
      countCallback(1)
    }
    return sanitized
  }

  /**
   * Apply sanitization strategy to a sensitive value.
   */
  private applySanitizationStrategy(value: string, strategy: SanitizationStrategy): string {
    switch (strategy) {
      case 'redact':
        return '***REDACTED***'

      case 'remove':
        return ''

      case 'partial': {
        if (value.length <= this.config.partialMaskLength * 2) {
          return this.config.maskCharacter.repeat(value.length)
        }
        const keepLength = this.config.partialMaskLength
        const start = value.slice(0, keepLength)
        const end = value.slice(-keepLength)
        const middleLength = value.length - keepLength * 2
        const middle = this.config.maskCharacter.repeat(middleLength)
        return `${start}${middle}${end}`
      }

      case 'hash': {
        // Simple hash for demonstration - in production, use a proper crypto library
        const hash = createHash('sha256')
        hash.update(value + this.config.hashSalt)
        return hash.digest('hex').slice(0, 16)
      }

      default:
        this.logger.warn('Unknown sanitization strategy, using redact', {strategy})
        return '***REDACTED***'
    }
  }

  /**
   * Test if a string contains sensitive data without modifying it.
   */
  containsSensitiveData(input: string): {hasSensitiveData: boolean; types: readonly SensitiveDataType[]} {
    const foundTypes = new Set<SensitiveDataType>()

    for (const pattern of this.allPatterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)
      if (regex.test(input)) {
        foundTypes.add(pattern.type)
      }
    }

    return {
      hasSensitiveData: foundTypes.size > 0,
      types: Array.from(foundTypes),
    }
  }

  /**
   * Get sanitization statistics for monitoring.
   */
  getStats(): {
    patternsCount: number
    strategiesCount: number
    builtinPatternsCount: number
    customPatternsCount: number
  } {
    return {
      patternsCount: this.allPatterns.length,
      strategiesCount: Object.keys(this.config.strategies).length,
      builtinPatternsCount: BUILTIN_SENSITIVE_PATTERNS.length,
      customPatternsCount: this.config.customPatterns.length,
    }
  }

  /**
   * Add a custom pattern for detecting sensitive data.
   */
  addCustomPattern(pattern: SensitivePattern): void {
    // Note: This modifies the instance but doesn't affect the original config
    // In a production system, you might want to make this immutable
    ;(this.allPatterns as SensitivePattern[]).push(pattern)
    this.logger.info('Added custom sanitization pattern', {
      name: pattern.name,
      type: pattern.type,
      strategy: pattern.strategy,
    })
  }
}

/**
 * Quick utility function to sanitize a string with default configuration.
 */
export function sanitizeString(input: string): string {
  const sanitizer = new DataSanitizer()
  const {sanitized} = sanitizer.sanitizeString(input)
  return sanitized
}

/**
 * Quick utility function to sanitize any data with default configuration.
 */
export function sanitizeData(data: unknown): unknown {
  const sanitizer = new DataSanitizer()
  const result = sanitizer.sanitize(data)
  return result.data
}

/**
 * Utility function to check if data contains sensitive information.
 */
export function hasSensitiveData(data: unknown): boolean {
  if (typeof data === 'string') {
    const sanitizer = new DataSanitizer()
    return sanitizer.containsSensitiveData(data).hasSensitiveData
  }

  // For non-string data, convert to JSON and check
  try {
    const jsonString = JSON.stringify(data)
    const sanitizer = new DataSanitizer()
    return sanitizer.containsSensitiveData(jsonString).hasSensitiveData
  } catch {
    return false
  }
}

/**
 * Analytics data schema validation and error handling.
 * Provides runtime validation for all analytics data structures.
 */

import type {LogLevel} from './logger.js'

/**
 * Schema validation errors with detailed context.
 */
export class SchemaValidationError extends Error {
  readonly field: string
  readonly value: unknown
  readonly expectedType: string
  readonly actualType: string

  constructor(message: string, field: string, value: unknown, expectedType: string) {
    const actualType = value === null ? 'null' : typeof value
    super(`Schema validation error for ${field}: ${message}. Expected ${expectedType}, got ${actualType}`)
    this.name = 'SchemaValidationError'
    this.field = field
    this.value = value
    this.expectedType = expectedType
    this.actualType = actualType
  }
}

/**
 * Validation result with success flag and errors.
 */
export interface ValidationResult {
  readonly success: boolean
  readonly errors: readonly SchemaValidationError[]
  readonly warnings: readonly string[]
}

/**
 * Create successful validation result.
 */
function createValidationSuccess(warnings: string[] = []): ValidationResult {
  return {
    success: true,
    errors: [],
    warnings,
  }
}

/**
 * Create failed validation result.
 */
function createValidationFailure(errors: SchemaValidationError[], warnings: string[] = []): ValidationResult {
  return {
    success: false,
    errors,
    warnings,
  }
}

/**
 * Utility functions for type checking and validation.
 */
const validators = {
  isString: (value: unknown): value is string => typeof value === 'string',
  isNumber: (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value),
  isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',
  isArray: (value: unknown): value is unknown[] => Array.isArray(value),
  isObject: (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value),
  isTimestamp: (value: unknown): value is string => {
    if (typeof value !== 'string') return false
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && value.includes('T')
  },
  isLogLevel: (value: unknown): value is LogLevel => {
    return typeof value === 'string' && ['debug', 'info', 'warn', 'error'].includes(value)
  },
  isPositiveNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !Number.isNaN(value) && value > 0
  },
  isNonNegativeNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !Number.isNaN(value) && value >= 0
  },
  isValidSampleRate: (value: unknown): value is number => {
    return typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value <= 1
  },
}

/**
 * Validate repository information structure.
 */
export function validateRepositoryInfo(data: unknown): ValidationResult {
  const errors: SchemaValidationError[] = []
  const warnings: string[] = []

  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError('Repository info must be an object', 'root', data, 'object'),
    ])
  }

  // Required fields
  if (!validators.isString(data.owner)) {
    errors.push(new SchemaValidationError('Owner must be a string', 'owner', data.owner, 'string'))
  }
  if (!validators.isString(data.repo)) {
    errors.push(new SchemaValidationError('Repo must be a string', 'repo', data.repo, 'string'))
  }
  if (!validators.isString(data.fullName)) {
    errors.push(new SchemaValidationError('Full name must be a string', 'fullName', data.fullName, 'string'))
  }
  if (!validators.isNumber(data.id)) {
    errors.push(new SchemaValidationError('ID must be a number', 'id', data.id, 'number'))
  }
  if (!validators.isString(data.visibility) || !['public', 'private'].includes(data.visibility)) {
    errors.push(
      new SchemaValidationError('Visibility must be "public" or "private"', 'visibility', data.visibility, 'string'),
    )
  }

  // Optional fields
  if (data.size !== undefined && !validators.isNonNegativeNumber(data.size)) {
    warnings.push('Repository size should be a non-negative number')
  }
  if (data.language !== undefined && !validators.isString(data.language)) {
    warnings.push('Repository language should be a string')
  }

  return errors.length > 0 ? createValidationFailure(errors, warnings) : createValidationSuccess(warnings)
}

/**
 * Validate cache metrics structure.
 */
export function validateCacheMetrics(data: unknown): ValidationResult {
  const errors: SchemaValidationError[] = []
  const warnings: string[] = []

  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError('Cache metrics must be an object', 'root', data, 'object'),
    ])
  }

  // Validate operation type
  if (!validators.isString(data.operation) || !['restore', 'save', 'prepare', 'finalize'].includes(data.operation)) {
    errors.push(
      new SchemaValidationError(
        'Operation must be one of: restore, save, prepare, finalize',
        'operation',
        data.operation,
        'string',
      ),
    )
  }

  // Required fields
  if (!validators.isString(data.key)) {
    errors.push(new SchemaValidationError('Key must be a string', 'key', data.key, 'string'))
  }
  if (!validators.isString(data.version)) {
    errors.push(new SchemaValidationError('Version must be a string', 'version', data.version, 'string'))
  }
  if (!validators.isTimestamp(data.startTime)) {
    errors.push(
      new SchemaValidationError('Start time must be a valid ISO timestamp', 'startTime', data.startTime, 'string'),
    )
  }
  if (!validators.isTimestamp(data.endTime)) {
    errors.push(new SchemaValidationError('End time must be a valid ISO timestamp', 'endTime', data.endTime, 'string'))
  }
  if (!validators.isNonNegativeNumber(data.duration)) {
    errors.push(
      new SchemaValidationError('Duration must be a non-negative number', 'duration', data.duration, 'number'),
    )
  }
  if (!validators.isBoolean(data.success)) {
    errors.push(new SchemaValidationError('Success must be a boolean', 'success', data.success, 'boolean'))
  }

  // Optional fields
  if (data.hit !== undefined && !validators.isBoolean(data.hit)) {
    warnings.push('Hit should be a boolean')
  }
  if (data.size !== undefined && !validators.isNonNegativeNumber(data.size)) {
    warnings.push('Size should be a non-negative number')
  }
  if (data.error !== undefined && !validators.isString(data.error)) {
    warnings.push('Error should be a string')
  }

  return errors.length > 0 ? createValidationFailure(errors, warnings) : createValidationSuccess(warnings)
}

/**
 * Validate analytics configuration structure.
 */
export function validateAnalyticsConfig(data: unknown): ValidationResult {
  const errors: SchemaValidationError[] = []

  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError('Analytics config must be an object', 'root', data, 'object'),
    ])
  }

  // Required boolean fields
  const booleanFields = ['enabled', 'collectCache', 'collectDocker', 'collectApi', 'collectFailures']
  for (const field of booleanFields) {
    if (!validators.isBoolean(data[field])) {
      errors.push(new SchemaValidationError(`${field} must be a boolean`, field, data[field], 'boolean'))
    }
  }

  // Log level validation
  if (!validators.isLogLevel(data.logLevel)) {
    errors.push(
      new SchemaValidationError('Log level must be debug, info, warn, or error', 'logLevel', data.logLevel, 'LogLevel'),
    )
  }

  // Sample rate validation
  if (!validators.isValidSampleRate(data.sampleRate)) {
    errors.push(
      new SchemaValidationError('Sample rate must be between 0 and 1', 'sampleRate', data.sampleRate, 'number'),
    )
  }

  // String fields
  if (!validators.isString(data.cacheKeyPrefix)) {
    errors.push(
      new SchemaValidationError('Cache key prefix must be a string', 'cacheKeyPrefix', data.cacheKeyPrefix, 'string'),
    )
  }

  // Positive number fields
  if (!validators.isPositiveNumber(data.maxDataSize)) {
    errors.push(
      new SchemaValidationError('Max data size must be a positive number', 'maxDataSize', data.maxDataSize, 'number'),
    )
  }
  if (!validators.isPositiveNumber(data.retentionDays)) {
    errors.push(
      new SchemaValidationError(
        'Retention days must be a positive number',
        'retentionDays',
        data.retentionDays,
        'number',
      ),
    )
  }

  // Sanitize patterns validation
  if (validators.isArray(data.sanitizePatterns)) {
    for (const [index, pattern] of data.sanitizePatterns.entries()) {
      if (!validators.isString(pattern)) {
        errors.push(
          new SchemaValidationError(
            `Sanitize pattern at index ${index} must be a string`,
            `sanitizePatterns[${index}]`,
            pattern,
            'string',
          ),
        )
      }
    }
  } else {
    errors.push(
      new SchemaValidationError(
        'Sanitize patterns must be an array',
        'sanitizePatterns',
        data.sanitizePatterns,
        'array',
      ),
    )
  }

  return errors.length > 0 ? createValidationFailure(errors) : createValidationSuccess()
}

/**
 * Validate any analytics data structure with type detection.
 */
export function validateAnalyticsData(data: unknown, expectedType?: string): ValidationResult {
  if (expectedType !== undefined && expectedType !== null && expectedType !== '') {
    switch (expectedType) {
      case 'RepositoryInfo':
        return validateRepositoryInfo(data)
      case 'CacheMetrics':
        return validateCacheMetrics(data)
      case 'AnalyticsConfig':
        return validateAnalyticsConfig(data)
      default:
        return createValidationFailure([
          new SchemaValidationError(`Unknown validation type: ${expectedType}`, 'type', expectedType, 'known type'),
        ])
    }
  }

  // Try to auto-detect the type based on structure
  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError('Data must be an object for auto-validation', 'root', data, 'object'),
    ])
  }

  // Check for config structure
  if ('enabled' in data && 'logLevel' in data && 'sampleRate' in data) {
    return validateAnalyticsConfig(data)
  }

  // Check for cache metrics
  if ('operation' in data && 'key' in data && 'duration' in data) {
    return validateCacheMetrics(data)
  }

  // Check for repository info
  if ('owner' in data && 'repo' in data && 'fullName' in data) {
    return validateRepositoryInfo(data)
  }

  return createValidationFailure([
    new SchemaValidationError('Unable to detect data type for validation', 'type', data, 'known analytics type'),
  ])
}

/**
 * Throw validation errors if validation fails.
 */
export function assertValidAnalyticsData(data: unknown, expectedType?: string): void {
  const result = validateAnalyticsData(data, expectedType)
  if (!result.success) {
    const errorMessages = result.errors.map(err => err.message).join('; ')
    const defaultType = 'valid analytics data'
    const typeDescription =
      expectedType !== undefined && expectedType !== null && expectedType !== '' ? expectedType : defaultType
    throw new SchemaValidationError(`Validation failed: ${errorMessages}`, 'validation', data, typeDescription)
  }
}

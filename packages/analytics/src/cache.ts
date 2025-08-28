/**
 * GitHub Actions Cache integration for analytics data storage with versioned keys.
 * Provides secure, efficient storage and retrieval of analytics data using cache infrastructure.
 */

import type {AggregatedAnalytics, AnalyticsConfig, AnalyticsEvent} from './models.js'
import {Buffer} from 'node:buffer'
import {env} from 'node:process'

import * as cache from '@actions/cache'

import {AnalyticsLogger, withTiming} from './logger.js'

/**
 * Cache key structure for analytics data organization.
 */
export interface CacheKey {
  /** Base prefix for all analytics cache keys */
  readonly prefix: string
  /** Repository identifier */
  readonly repository: string
  /** Data type (events, aggregated, config) */
  readonly type: 'events' | 'aggregated' | 'config'
  /** Version for schema compatibility */
  readonly version: string
  /** Optional timestamp for time-based partitioning */
  readonly timestamp?: string
}

/**
 * Cache operation result with metadata.
 */
export interface CacheResult<T = unknown> {
  /** Whether the operation was successful */
  readonly success: boolean
  /** Data retrieved/stored (if applicable) */
  readonly data?: T
  /** Cache key used for the operation */
  readonly key: string
  /** Operation duration in milliseconds */
  readonly duration: number
  /** Cache hit status (for restore operations) */
  readonly hit?: boolean
  /** Cache size in bytes */
  readonly size?: number
  /** Error message if operation failed */
  readonly error?: string
}

/**
 * Configuration for cache operations.
 */
export interface CacheOperationConfig {
  /** Maximum cache size in bytes */
  readonly maxSize: number
  /** Cache TTL in milliseconds */
  readonly ttl: number
  /** Whether to compress data before caching */
  readonly compress: boolean
  /** Compression algorithm to use */
  readonly compressionAlgorithm: 'gzip' | 'brotli'
  /** Maximum number of retry attempts */
  readonly maxRetries: number
  /** Retry delay in milliseconds */
  readonly retryDelay: number
}

/**
 * Default cache operation configuration.
 */
export const DEFAULT_CACHE_CONFIG: CacheOperationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  compress: true,
  compressionAlgorithm: 'gzip',
  maxRetries: 3,
  retryDelay: 1000,
} as const

/**
 * Analytics cache manager for GitHub Actions Cache integration.
 */
export class AnalyticsCache {
  private readonly config: CacheOperationConfig
  private readonly logger: AnalyticsLogger
  private readonly analyticsConfig: AnalyticsConfig

  constructor(analyticsConfig: AnalyticsConfig, config: Partial<CacheOperationConfig> = {}) {
    this.analyticsConfig = analyticsConfig
    this.config = {...DEFAULT_CACHE_CONFIG, ...config}
    this.logger = AnalyticsLogger.fromAnalyticsConfig(analyticsConfig, 'cache')
  }

  /**
   * Generate a cache key from components.
   */
  generateKey(keyComponents: CacheKey): string {
    // Convert repository slashes to dashes for cache key compatibility
    const repositoryKey = keyComponents.repository.replaceAll('/', '-')
    const parts = [keyComponents.prefix, repositoryKey, keyComponents.type, keyComponents.version]

    if (typeof keyComponents.timestamp === 'string' && keyComponents.timestamp.length > 0) {
      parts.push(keyComponents.timestamp)
    }

    return parts.join('-')
  }

  /**
   * Parse a cache key back into components.
   */
  parseKey(key: string): CacheKey | null {
    const parts = key.split('-')
    if (parts.length < 4) {
      return null
    }

    const [prefix, repository, type, version, ...timestampParts] = parts

    if (
      typeof prefix !== 'string' ||
      prefix.length === 0 ||
      typeof repository !== 'string' ||
      repository.length === 0 ||
      typeof type !== 'string' ||
      type.length === 0 ||
      typeof version !== 'string' ||
      version.length === 0
    ) {
      return null
    }

    return {
      prefix,
      repository,
      type: type as CacheKey['type'],
      version,
      timestamp: timestampParts.length > 0 ? timestampParts.join('-') : undefined,
    }
  }

  /**
   * Store analytics events in cache.
   */
  async storeEvents(
    repository: string,
    events: readonly AnalyticsEvent[],
    timestamp?: string,
  ): Promise<CacheResult<readonly AnalyticsEvent[]>> {
    // Validate input
    if (events.length === 0) {
      return {
        success: false,
        data: events,
        error: 'Cannot store empty events array',
        key: '',
        duration: 0,
        size: 0,
      }
    }

    const keyComponents: CacheKey = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: 'events',
      version: '1.0',
      timestamp: timestamp ?? new Date().toISOString().split('T')[0], // YYYY-MM-DD
    }

    return this.storeData(keyComponents, events)
  }

  /**
   * Retrieve analytics events from cache.
   */
  async retrieveEvents(repository: string, timestamp?: string): Promise<CacheResult<readonly AnalyticsEvent[]>> {
    const keyComponents: CacheKey = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: 'events',
      version: '1.0',
      timestamp: timestamp ?? new Date().toISOString().split('T')[0], // YYYY-MM-DD
    }

    return this.retrieveData<readonly AnalyticsEvent[]>(keyComponents)
  }

  /**
   * Store aggregated analytics data in cache.
   */
  async storeAggregated(
    repository: string,
    aggregated: AggregatedAnalytics,
    timestamp?: string,
  ): Promise<CacheResult<AggregatedAnalytics>> {
    const keyComponents: CacheKey = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: 'aggregated',
      version: '1.0',
      timestamp: timestamp ?? new Date().toISOString().split('T')[0], // YYYY-MM-DD
    }

    return this.storeData(keyComponents, aggregated)
  }

  /**
   * Retrieve aggregated analytics data from cache.
   */
  async retrieveAggregated(repository: string, timestamp?: string): Promise<CacheResult<AggregatedAnalytics>> {
    const keyComponents: CacheKey = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: 'aggregated',
      version: '1.0',
      timestamp: timestamp ?? new Date().toISOString().split('T')[0], // YYYY-MM-DD
    }

    return this.retrieveData<AggregatedAnalytics>(keyComponents)
  }

  /**
   * List all cache keys for a repository.
   */
  async listKeys(repository: string): Promise<string[]> {
    // Note: GitHub Actions Cache doesn't provide a direct list API
    // This is a placeholder for potential future implementation
    // In practice, keys would need to be tracked separately
    this.logger.warn('listKeys is not directly supported by GitHub Actions Cache API', {
      repository,
      feature: 'cache-listing',
    })
    return []
  }

  /**
   * Clear all analytics cache data for a repository.
   */
  async clearRepository(repository: string): Promise<void> {
    // Note: GitHub Actions Cache doesn't provide direct deletion API
    // Cache entries expire automatically based on TTL and inactivity
    this.logger.info('Cache data will expire automatically based on TTL', {
      repository,
      ttl: this.config.ttl,
    })
  }

  /**
   * Get cache usage statistics.
   */
  async getCacheStats(): Promise<{
    totalSize: number
    entryCount: number
    oldestEntry?: string
    newestEntry?: string
  }> {
    // Note: GitHub Actions Cache doesn't provide direct stats API
    // This would need to be tracked separately
    this.logger.warn('Cache statistics are not directly available from GitHub Actions Cache API')
    return {
      totalSize: 0,
      entryCount: 0,
    }
  }

  /**
   * Generic method to store data in cache with error handling and retries.
   */
  private async storeData<T>(keyComponents: CacheKey, data: T): Promise<CacheResult<T>> {
    const key = this.generateKey(keyComponents)

    return withTiming(
      `cache-store-${keyComponents.type}`,
      async () => {
        try {
          // Serialize data to JSON
          const jsonData = JSON.stringify(data)
          const dataSize = Buffer.byteLength(jsonData, 'utf8')

          // Check size limits
          if (dataSize > this.config.maxSize) {
            throw new Error(`Data size (${dataSize} bytes) exceeds maximum cache size (${this.config.maxSize} bytes)`)
          }

          // Write data to temporary file for caching
          const {writeFile, mkdtemp, rm} = await import('node:fs/promises')
          const pathModule = await import('node:path')
          const {tmpdir} = await import('node:os')

          const tempDir = await mkdtemp(pathModule.join(tmpdir(), 'analytics-cache-'))
          const tempFile = pathModule.join(tempDir, 'data.json')

          try {
            await writeFile(tempFile, jsonData, 'utf8')

            // Save to cache with retry logic
            let lastError: Error | undefined
            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
              try {
                const cacheId = await cache.saveCache([tempFile], key)
                this.logger.info('Successfully stored data in cache', {
                  key,
                  cacheId,
                  size: dataSize,
                  attempt,
                })

                return {
                  success: true,
                  data,
                  key,
                  duration: 0, // Will be filled by withTiming
                  size: dataSize,
                }
              } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                this.logger.warn(`Cache store attempt ${attempt} failed`, {
                  key,
                  attempt,
                  maxRetries: this.config.maxRetries,
                  error: lastError.message,
                })

                if (attempt < this.config.maxRetries) {
                  await new Promise(resolve => {
                    setTimeout(resolve, this.config.retryDelay * attempt)
                  })
                }
              }
            }

            throw lastError ?? new Error('All cache store attempts failed')
          } finally {
            // Clean up temporary file
            await rm(tempDir, {recursive: true, force: true})
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.logger.error('Failed to store data in cache', error instanceof Error ? error : undefined, {
            key,
            type: keyComponents.type,
          })

          return {
            success: false,
            key,
            duration: 0, // Will be filled by withTiming
            error: errorMessage,
          }
        }
      },
      this.logger,
    ).then(({result, duration}) => ({...result, duration}))
  }

  /**
   * Generic method to retrieve data from cache with error handling and retries.
   */
  private async retrieveData<T>(keyComponents: CacheKey): Promise<CacheResult<T>> {
    const key = this.generateKey(keyComponents)

    return withTiming(
      `cache-retrieve-${keyComponents.type}`,
      async () => {
        try {
          // Prepare temporary directory for cache restoration
          const {mkdtemp, readFile, rm} = await import('node:fs/promises')
          const pathModule = await import('node:path')
          const {tmpdir} = await import('node:os')

          const tempDir = await mkdtemp(pathModule.join(tmpdir(), 'analytics-cache-'))
          const tempFile = pathModule.join(tempDir, 'data.json')

          try {
            // Restore from cache with retry logic
            let lastError: Error | undefined
            let cacheHit = false

            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
              try {
                const cacheKey = await cache.restoreCache([tempFile], key)
                if (typeof cacheKey === 'string' && cacheKey.length > 0) {
                  cacheHit = true
                  this.logger.info('Successfully restored data from cache', {
                    key,
                    cacheKey,
                    attempt,
                  })
                  break
                } else {
                  this.logger.debug('Cache miss', {key, attempt})
                  return {
                    success: false,
                    key,
                    duration: 0, // Will be filled by withTiming
                    hit: false,
                  }
                }
              } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                this.logger.warn(`Cache restore attempt ${attempt} failed`, {
                  key,
                  attempt,
                  maxRetries: this.config.maxRetries,
                  error: lastError.message,
                })

                if (attempt < this.config.maxRetries) {
                  await new Promise(resolve => {
                    setTimeout(resolve, this.config.retryDelay * attempt)
                  })
                }
              }
            }

            if (!cacheHit) {
              throw lastError ?? new Error('All cache restore attempts failed')
            }

            // Read and parse data
            const jsonData = await readFile(tempFile, 'utf8')
            const data = JSON.parse(jsonData) as T
            const dataSize = Buffer.byteLength(jsonData, 'utf8')

            this.logger.info('Successfully parsed cached data', {
              key,
              size: dataSize,
            })

            return {
              success: true,
              data,
              key,
              duration: 0, // Will be filled by withTiming
              hit: true,
              size: dataSize,
            }
          } finally {
            // Clean up temporary directory
            await rm(tempDir, {recursive: true, force: true})
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.logger.error('Failed to retrieve data from cache', error instanceof Error ? error : undefined, {
            key,
            type: keyComponents.type,
          })

          return {
            success: false,
            key,
            duration: 0, // Will be filled by withTiming
            hit: false,
            error: errorMessage,
          }
        }
      },
      this.logger,
    ).then(({result, duration}) => ({...result, duration}))
  }
}

/**
 * Create cache key components for analytics events.
 */
export function createEventsCacheKey(prefix: string, repository: string, timestamp?: string): CacheKey {
  return {
    prefix,
    repository,
    type: 'events',
    version: '1.0',
    timestamp: timestamp ?? new Date().toISOString().split('T')[0],
  }
}

/**
 * Create cache key components for aggregated analytics data.
 */
export function createAggregatedCacheKey(prefix: string, repository: string, timestamp?: string): CacheKey {
  return {
    prefix,
    repository,
    type: 'aggregated',
    version: '1.0',
    timestamp: timestamp ?? new Date().toISOString().split('T')[0],
  }
}

/**
 * Utility function to create repository identifier from GitHub context.
 */
export function getRepositoryIdentifier(): string {
  const repository = env.GITHUB_REPOSITORY
  if (typeof repository !== 'string' || repository.length === 0) {
    throw new Error('GITHUB_REPOSITORY environment variable is not set')
  }
  return repository // Return original format (owner/repo)
}

/**
 * Utility function to check if cache operations are available.
 */
export function isCacheAvailable(): boolean {
  try {
    // Use the GitHub Actions Cache library's built-in availability check
    return cache.isFeatureAvailable()
  } catch {
    return false
  }
}

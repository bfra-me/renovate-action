/**
 * Cache metrics collector for performance analysis of GitHub Actions cache operations.
 */

import type {AnalyticsConfig, CacheMetrics} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {BaseMetricCollector, type CollectionContext} from './base.js'

/**
 * Cache operation tracking data.
 */
export interface CacheOperation {
  readonly operation: 'restore' | 'save' | 'prepare' | 'finalize'
  readonly key: string
  readonly version: string
  readonly startTime: string
  readonly success?: boolean
  readonly hit?: boolean
  readonly size?: number
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * In-memory storage for tracking cache operations across action steps.
 */
class CacheOperationStore {
  private static instance: CacheOperationStore | undefined
  private readonly operations: Map<string, CacheOperation> = new Map()

  static getInstance(): CacheOperationStore {
    if (!CacheOperationStore.instance) {
      CacheOperationStore.instance = new CacheOperationStore()
    }
    return CacheOperationStore.instance
  }

  addOperation(id: string, operation: CacheOperation): void {
    this.operations.set(id, operation)
  }

  getOperation(id: string): CacheOperation | undefined {
    return this.operations.get(id)
  }

  getAllOperations(): CacheOperation[] {
    return Array.from(this.operations.values())
  }

  updateOperation(id: string, updates: Partial<CacheOperation>): void {
    const existing = this.operations.get(id)
    if (existing) {
      this.operations.set(id, {...existing, ...updates})
    }
  }

  clear(): void {
    this.operations.clear()
  }

  getOperationsByType(operation: CacheOperation['operation']): CacheOperation[] {
    return Array.from(this.operations.values()).filter(op => op.operation === operation)
  }
}

/**
 * Collector for cache operation metrics.
 */
export class CacheMetricsCollector extends BaseMetricCollector<CacheMetrics> {
  private readonly store = CacheOperationStore.getInstance()

  constructor(config: AnalyticsConfig, logger?: AnalyticsLogger) {
    super(config, logger ?? new AnalyticsLogger({component: 'CacheMetricsCollector'}))
  }

  async collect(_context: CollectionContext): Promise<CacheMetrics[]> {
    if (!this.isEnabled() || !this.shouldSample()) {
      return []
    }

    const operations = this.store.getAllOperations()
    this.logger.debug(`Collecting ${operations.length} cache operations`)

    const metrics: CacheMetrics[] = []

    for (const operation of operations) {
      try {
        const endTime = (operation.metadata?.endTime as string) || this.createTimestamp()
        const metric: CacheMetrics = this.sanitize({
          operation: operation.operation,
          key: operation.key,
          version: operation.version,
          startTime: operation.startTime,
          endTime,
          duration: this.calculateDuration(operation.startTime, endTime),
          success: operation.success ?? true,
          hit: operation.hit,
          size: operation.size,
          error: operation.error,
          metadata: operation.metadata,
        })

        metrics.push(metric)
      } catch (error) {
        this.logger.warn('Failed to process cache operation metric', {
          operation: operation.operation,
          key: operation.key,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                }
              : {name: 'Unknown', message: String(error)},
        })
      }
    }

    this.logger.info(`Collected ${metrics.length} cache metrics`)
    return metrics
  }

  /**
   * Record a cache operation start.
   */
  static recordOperationStart(
    operation: CacheOperation['operation'],
    key: string,
    version: string,
    metadata?: Record<string, unknown>,
  ): string {
    const store = CacheOperationStore.getInstance()
    const id = `${operation}-${key}-${Date.now()}`
    const startTime = new Date().toISOString()

    store.addOperation(id, {
      operation,
      key,
      version,
      startTime,
      metadata,
    })

    return id
  }

  /**
   * Record a cache operation completion.
   */
  static recordOperationEnd(
    id: string,
    success: boolean,
    hit?: boolean,
    size?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const store = CacheOperationStore.getInstance()
    const endTime = new Date().toISOString()

    store.updateOperation(id, {
      success,
      hit,
      size,
      error,
      metadata: {
        ...store.getOperation(id)?.metadata,
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Record a complete cache operation (start and end).
   */
  static recordOperation(
    operation: CacheOperation['operation'],
    key: string,
    version: string,
    success: boolean,
    hit?: boolean,
    size?: number,
    error?: string,
    duration?: number,
    metadata?: Record<string, unknown>,
  ): void {
    const store = CacheOperationStore.getInstance()
    const endTime = new Date().toISOString()
    const startTime =
      typeof duration === 'number' && duration > 0 ? new Date(Date.now() - duration).toISOString() : endTime

    const id = `${operation}-${key}-${Date.now()}`

    store.addOperation(id, {
      operation,
      key,
      version,
      startTime,
      success,
      hit,
      size,
      error,
      metadata: {
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Get cache hit rate for a specific cache key pattern.
   */
  static getCacheHitRate(keyPattern?: string): number {
    const store = CacheOperationStore.getInstance()
    const restoreOps = store.getOperationsByType('restore')

    const filteredOps =
      typeof keyPattern === 'string' && keyPattern.length > 0
        ? restoreOps.filter(op => op.key.includes(keyPattern))
        : restoreOps

    if (filteredOps.length === 0) return 0

    const hits = filteredOps.filter(op => op.hit === true).length
    return Math.round((hits / filteredOps.length) * 100)
  }

  /**
   * Clear all stored cache operations.
   */
  static clearOperations(): void {
    const store = CacheOperationStore.getInstance()
    store.clear()
  }
}

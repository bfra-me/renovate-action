/**
 * Base collector interface and utilities for metrics collection.
 */

import type {
  AnalyticsConfig,
  ApiMetrics,
  CacheMetrics,
  DockerMetrics,
  FailureMetrics,
  RepositoryInfo,
  Timestamp,
  WorkflowContext,
} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {sanitizeData} from '../sanitizer.js'

/**
 * Base interface for all metric collectors.
 */
export interface MetricCollector<T> {
  /**
   * Collect metrics for a specific operation.
   */
  collect: (context: CollectionContext) => Promise<T[]>

  /**
   * Enable/disable the collector.
   */
  setEnabled: (enabled: boolean) => void

  /**
   * Check if the collector is enabled.
   */
  isEnabled: () => boolean
}

/**
 * Context provided to metric collectors for data collection.
 */
export interface CollectionContext {
  /** Analytics configuration */
  readonly config: AnalyticsConfig
  /** Logger instance for structured logging */
  readonly logger: AnalyticsLogger
  /** Repository information */
  readonly repository: RepositoryInfo
  /** Workflow context */
  readonly workflow: WorkflowContext
  /** Collection start timestamp */
  readonly startTime: Timestamp
  /** Additional context data */
  readonly data?: Record<string, unknown>
}

/**
 * Base metric collector implementation with common functionality.
 */
export abstract class BaseMetricCollector<T> implements MetricCollector<T> {
  protected enabled = true
  protected readonly logger: AnalyticsLogger

  constructor(
    protected readonly config: AnalyticsConfig,
    logger?: AnalyticsLogger,
  ) {
    this.logger = logger ?? new AnalyticsLogger({component: this.constructor.name})
  }

  abstract collect(context: CollectionContext): Promise<T[]>

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.logger.debug(`Collector ${this.constructor.name} ${enabled ? 'enabled' : 'disabled'}`)
  }

  isEnabled(): boolean {
    return this.enabled && this.config.enabled
  }

  /**
   * Sanitize collected data to prevent sensitive information leakage.
   */
  protected sanitize<U>(data: U): U {
    return sanitizeData(data) as U
  }

  /**
   * Create a timestamp in ISO 8601 format.
   */
  protected createTimestamp(): Timestamp {
    return new Date().toISOString()
  }

  /**
   * Calculate duration between two timestamps in milliseconds.
   */
  protected calculateDuration(startTime: Timestamp, endTime: Timestamp): number {
    return new Date(endTime).getTime() - new Date(startTime).getTime()
  }

  /**
   * Sample data collection based on configured sample rate.
   */
  protected shouldSample(): boolean {
    return Math.random() < this.config.sampleRate
  }
}

/**
 * Metrics collection orchestrator that manages all collectors.
 */
export class MetricsCollectionManager {
  private readonly collectors: Map<string, MetricCollector<unknown>> = new Map()
  private readonly logger: AnalyticsLogger

  constructor(private readonly config: AnalyticsConfig) {
    this.logger = new AnalyticsLogger({component: 'MetricsCollectionManager'})
  }

  /**
   * Register a metric collector.
   */
  registerCollector<T>(name: string, collector: MetricCollector<T>): void {
    this.collectors.set(name, collector)
    this.logger.debug(`Registered collector: ${name}`)
  }

  /**
   * Collect all metrics from registered collectors.
   */
  async collectAll(context: CollectionContext): Promise<{
    cache: CacheMetrics[]
    docker: DockerMetrics[]
    api: ApiMetrics[]
    failures: FailureMetrics[]
  }> {
    const results = {
      cache: [] as CacheMetrics[],
      docker: [] as DockerMetrics[],
      api: [] as ApiMetrics[],
      failures: [] as FailureMetrics[],
    }

    if (!this.config.enabled) {
      this.logger.debug('Analytics collection disabled, skipping metric collection')
      return results
    }

    for (const [name, collector] of this.collectors) {
      if (!collector.isEnabled()) {
        this.logger.debug(`Skipping disabled collector: ${name}`)
        continue
      }

      try {
        const metrics = await collector.collect(context)

        // Type-safe assignment based on collector name
        if (name === 'cache' && this.config.collectCache) {
          results.cache = metrics as CacheMetrics[]
        } else if (name === 'docker' && this.config.collectDocker) {
          results.docker = metrics as DockerMetrics[]
        } else if (name === 'api' && this.config.collectApi) {
          results.api = metrics as ApiMetrics[]
        } else if (name === 'failures' && this.config.collectFailures) {
          results.failures = metrics as FailureMetrics[]
        }

        this.logger.debug(`Collected ${metrics.length} metrics from ${name} collector`)
      } catch (error) {
        this.logger.warn(`Failed to collect metrics from ${name} collector`, {
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : {name: 'Unknown', message: String(error)},
        })
      }
    }

    const totalMetrics = results.cache.length + results.docker.length + results.api.length + results.failures.length
    this.logger.info(`Collected ${totalMetrics} total metrics across all collectors`)

    return results
  }

  /**
   * Get the number of registered collectors.
   */
  getCollectorCount(): number {
    return this.collectors.size
  }

  /**
   * Get names of all registered collectors.
   */
  getCollectorNames(): string[] {
    return Array.from(this.collectors.keys())
  }
}

/**
 * Utility function to create a collection context.
 */
export function createCollectionContext(
  config: AnalyticsConfig,
  repository: RepositoryInfo,
  workflow: WorkflowContext,
  logger?: AnalyticsLogger,
  data?: Record<string, unknown>,
): CollectionContext {
  return {
    config,
    logger: logger ?? new AnalyticsLogger({component: 'CollectionContext'}),
    repository,
    workflow,
    startTime: new Date().toISOString(),
    data,
  }
}

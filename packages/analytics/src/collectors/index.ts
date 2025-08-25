/**
 * Main entry point for analytics collectors.
 * Exports all collector classes and utilities for metrics collection.
 */

import type {AnalyticsConfig} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {ApiMetricsCollector} from './api.js'
import {MetricsCollectionManager} from './base.js'
import {CacheMetricsCollector} from './cache.js'
import {DockerMetricsCollector} from './docker.js'
import {FailureMetricsCollector} from './failures.js'

export * from './api.js'
// Re-export specific types from their respective modules
export type {ApiRequest} from './api.js'
export * from './base.js'
export type {CollectionContext, MetricCollector} from './base.js'
export * from './cache.js'

export type {CacheOperation} from './cache.js'
export * from './docker.js'
export type {DockerOperation} from './docker.js'
export * from './failures.js'
export type {FailureEvent} from './failures.js'

/**
 * Create a complete metrics collection manager with all collectors registered.
 */
export function createMetricsManager(config: AnalyticsConfig, logger?: AnalyticsLogger): MetricsCollectionManager {
  const manager = new MetricsCollectionManager(config)
  const componentLogger = logger ?? new AnalyticsLogger({component: 'MetricsManager'})

  // Register all available collectors
  manager.registerCollector('cache', new CacheMetricsCollector(config, componentLogger))
  manager.registerCollector('docker', new DockerMetricsCollector(config, componentLogger))
  manager.registerCollector('api', new ApiMetricsCollector(config, componentLogger))
  manager.registerCollector('failures', new FailureMetricsCollector(config, componentLogger))

  componentLogger.info(`Created metrics manager with ${manager.getCollectorCount()} collectors`)

  return manager
}

/**
 * Utility function to clear all collector data stores.
 * Useful for testing and cleanup operations.
 */
export function clearAllCollectorData(): void {
  CacheMetricsCollector.clearOperations()
  DockerMetricsCollector.clearOperations()
  ApiMetricsCollector.clearRequests()
  FailureMetricsCollector.clearFailures()
}

/**
 * Get summary statistics from all collectors.
 */
export function getCollectorSummary(): {
  cache: {hitRate: number}
  docker: {successRate: number}
  api: {successRate: number; avgResponseTime: number}
  failures: {totalCount: number; categories: Record<string, number>}
} {
  return {
    cache: {
      hitRate: CacheMetricsCollector.getCacheHitRate(),
    },
    docker: {
      successRate: DockerMetricsCollector.getSuccessRate(),
    },
    api: {
      successRate: ApiMetricsCollector.getSuccessRate(),
      avgResponseTime: ApiMetricsCollector.getAverageResponseTime(),
    },
    failures: {
      totalCount: Object.values(FailureMetricsCollector.getFailureCountByCategory()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      categories: FailureMetricsCollector.getFailureCountByCategory(),
    },
  }
}

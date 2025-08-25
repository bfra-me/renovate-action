/**
 * Data aggregation utilities for multi-repository analytics reporting.
 * Provides functions to combine, summarize, and analyze analytics data across repositories.
 */

import type {AggregatedAnalytics, AnalyticsEvent, FailureCategory, RepositoryInfo, Timestamp} from './models.js'

import {AnalyticsLogger} from './logger.js'

/**
 * Aggregation period for time-based analytics.
 */
export type AggregationPeriod = 'day' | 'week' | 'month' | 'year'

/**
 * Aggregation options for customizing data processing.
 */
export interface AggregationOptions {
  /** Time period for aggregation */
  readonly period: AggregationPeriod
  /** Start timestamp for aggregation (ISO 8601) */
  readonly startTime?: Timestamp
  /** End timestamp for aggregation (ISO 8601) */
  readonly endTime?: Timestamp
  /** Repository filter (if specified, only include these repositories) */
  readonly repositories?: readonly string[]
  /** Whether to include detailed breakdowns */
  readonly includeBreakdowns: boolean
  /** Minimum sample size for statistical calculations */
  readonly minSampleSize: number
  /** Whether to exclude outliers from calculations */
  readonly excludeOutliers: boolean
  /** Percentile threshold for outlier detection (0-100) */
  readonly outlierThreshold: number
}

/**
 * Default aggregation options.
 */
export const DEFAULT_AGGREGATION_OPTIONS: AggregationOptions = {
  period: 'day',
  includeBreakdowns: true,
  minSampleSize: 5,
  excludeOutliers: true,
  outlierThreshold: 95,
} as const

/**
 * Detailed breakdown statistics for metrics.
 */
export interface MetricBreakdown {
  /** Total count of data points */
  readonly count: number
  /** Sum of all values */
  readonly sum: number
  /** Average value */
  readonly average: number
  /** Median value */
  readonly median: number
  /** Minimum value */
  readonly min: number
  /** Maximum value */
  readonly max: number
  /** Standard deviation */
  readonly standardDeviation: number
  /** 95th percentile */
  readonly p95: number
  /** 99th percentile */
  readonly p99: number
}

/**
 * Extended aggregated analytics with detailed breakdowns.
 */
export interface ExtendedAggregatedAnalytics extends AggregatedAnalytics {
  /** Cache metrics breakdown */
  readonly cacheBreakdown: {
    readonly hitRate: MetricBreakdown
    readonly duration: MetricBreakdown
    readonly size: MetricBreakdown
  }
  /** Docker metrics breakdown */
  readonly dockerBreakdown: {
    readonly duration: MetricBreakdown
    readonly successRate: number
  }
  /** API metrics breakdown */
  readonly apiBreakdown: {
    readonly duration: MetricBreakdown
    readonly successRate: number
    readonly rateLimitHits: number
  }
  /** Repository statistics */
  readonly repositoryStats: {
    readonly totalRepositories: number
    readonly activeRepositories: number
    readonly repositoriesByLanguage: Record<string, number>
    readonly repositoriesBySize: Record<string, number>
  }
}

/**
 * Analytics aggregator for processing multiple events into summary statistics.
 */
export class AnalyticsAggregator {
  private readonly logger: AnalyticsLogger

  constructor(logger?: AnalyticsLogger) {
    this.logger = logger ?? new AnalyticsLogger({component: 'aggregator'})
  }

  /**
   * Aggregate multiple analytics events into summary statistics.
   */
  async aggregateEvents(
    events: readonly AnalyticsEvent[],
    options: Partial<AggregationOptions> = {},
  ): Promise<AggregatedAnalytics> {
    const opts = {...DEFAULT_AGGREGATION_OPTIONS, ...options}

    this.logger.operationStart('aggregate-events', {
      eventCount: events.length,
      period: opts.period,
    })

    const startTime = Date.now()

    try {
      // Filter events by time period and repositories if specified
      const filteredEvents = this.filterEventsByOptions(events, opts)

      if (filteredEvents.length === 0) {
        this.logger.warn('No events to aggregate after filtering', {options: opts})
        return this.createEmptyAggregation(opts)
      }

      // Calculate aggregation period bounds
      const {periodStart, periodEnd} = this.calculatePeriodBounds(filteredEvents, opts)

      // Aggregate cache metrics
      const cacheMetrics = this.aggregateCacheMetrics(filteredEvents)

      // Aggregate Docker metrics
      const dockerMetrics = this.aggregateDockerMetrics(filteredEvents)

      // Aggregate API metrics
      const apiMetrics = this.aggregateApiMetrics(filteredEvents)

      // Aggregate failure metrics
      const failuresByCategory = this.aggregateFailureMetrics(filteredEvents)

      // Aggregate action metrics
      const actionMetrics = this.aggregateActionMetrics(filteredEvents)

      // Count unique repositories
      const repositoryCount = new Set(filteredEvents.map(event => event.repository.fullName)).size

      const aggregated: AggregatedAnalytics = {
        periodStart,
        periodEnd,
        eventCount: filteredEvents.length,
        repositoryCount,
        cacheHitRate: cacheMetrics.hitRate,
        avgCacheDuration: cacheMetrics.avgDuration,
        avgDockerDuration: dockerMetrics.avgDuration,
        avgApiDuration: apiMetrics.avgDuration,
        failuresByCategory,
        avgActionDuration: actionMetrics.avgDuration,
        actionSuccessRate: actionMetrics.successRate,
        schemaVersion: '1.0.0',
      }

      this.logger.operationEnd('aggregate-events', startTime, true, {
        resultEventCount: aggregated.eventCount,
        repositories: aggregated.repositoryCount,
      })

      return aggregated
    } catch (error) {
      this.logger.operationEnd('aggregate-events', startTime, false)
      this.logger.error('Failed to aggregate events', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Aggregate events with detailed breakdowns and extended statistics.
   */
  async aggregateEventsExtended(
    events: readonly AnalyticsEvent[],
    options: Partial<AggregationOptions> = {},
  ): Promise<ExtendedAggregatedAnalytics> {
    const baseAggregation = await this.aggregateEvents(events, options)
    const opts = {...DEFAULT_AGGREGATION_OPTIONS, ...options}

    const filteredEvents = this.filterEventsByOptions(events, opts)

    // Calculate detailed breakdowns
    const cacheBreakdown = this.calculateCacheBreakdown(filteredEvents)
    const dockerBreakdown = this.calculateDockerBreakdown(filteredEvents)
    const apiBreakdown = this.calculateApiBreakdown(filteredEvents)
    const repositoryStats = this.calculateRepositoryStats(filteredEvents)

    return {
      ...baseAggregation,
      cacheBreakdown,
      dockerBreakdown,
      apiBreakdown,
      repositoryStats,
    }
  }

  /**
   * Filter events based on aggregation options.
   */
  private filterEventsByOptions(
    events: readonly AnalyticsEvent[],
    options: AggregationOptions,
  ): readonly AnalyticsEvent[] {
    return events.filter(event => {
      // Filter by time range if specified
      if (typeof options.startTime === 'string' && options.startTime.length > 0) {
        return event.timestamp >= options.startTime
      }
      if (typeof options.endTime === 'string' && options.endTime.length > 0) {
        return event.timestamp <= options.endTime
      }

      // Filter by repositories if specified
      if (options.repositories && options.repositories.length > 0) {
        return options.repositories.includes(event.repository.fullName)
      }

      return true
    })
  }

  /**
   * Calculate period bounds for aggregation.
   */
  private calculatePeriodBounds(
    events: readonly AnalyticsEvent[],
    options: AggregationOptions,
  ): {periodStart: Timestamp; periodEnd: Timestamp} {
    if (
      typeof options.startTime === 'string' &&
      options.startTime.length > 0 &&
      typeof options.endTime === 'string' &&
      options.endTime.length > 0
    ) {
      return {periodStart: options.startTime, periodEnd: options.endTime}
    }

    const timestamps = events.map(event => new Date(event.timestamp).getTime()).sort((a, b) => a - b)
    const minTimestamp = timestamps[0] ?? Date.now()
    const maxTimestamp = timestamps.at(-1) ?? Date.now()

    return {
      periodStart: new Date(minTimestamp).toISOString(),
      periodEnd: new Date(maxTimestamp).toISOString(),
    }
  }

  /**
   * Aggregate cache metrics from events.
   */
  private aggregateCacheMetrics(events: readonly AnalyticsEvent[]): {
    hitRate: number
    avgDuration: number
  } {
    const cacheMetrics = events.flatMap(event => event.cache)
    const restoreOperations = cacheMetrics.filter(metric => metric.operation === 'restore')

    if (restoreOperations.length === 0) {
      return {hitRate: 0, avgDuration: 0}
    }

    const hits = restoreOperations.filter(metric => metric.hit === true).length
    const hitRate = (hits / restoreOperations.length) * 100

    const totalDuration = cacheMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const avgDuration = cacheMetrics.length > 0 ? totalDuration / cacheMetrics.length : 0

    return {hitRate, avgDuration}
  }

  /**
   * Aggregate Docker metrics from events.
   */
  private aggregateDockerMetrics(events: readonly AnalyticsEvent[]): {
    avgDuration: number
  } {
    const dockerMetrics = events.flatMap(event => event.docker)

    if (dockerMetrics.length === 0) {
      return {avgDuration: 0}
    }

    const totalDuration = dockerMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const avgDuration = totalDuration / dockerMetrics.length

    return {avgDuration}
  }

  /**
   * Aggregate API metrics from events.
   */
  private aggregateApiMetrics(events: readonly AnalyticsEvent[]): {
    avgDuration: number
  } {
    const apiMetrics = events.flatMap(event => event.api)

    if (apiMetrics.length === 0) {
      return {avgDuration: 0}
    }

    const totalDuration = apiMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    const avgDuration = totalDuration / apiMetrics.length

    return {avgDuration}
  }

  /**
   * Aggregate failure metrics from events.
   */
  private aggregateFailureMetrics(events: readonly AnalyticsEvent[]): Record<FailureCategory, number> {
    const failures = events.flatMap(event => event.failures)

    const failuresByCategory: Record<FailureCategory, number> = {
      permissions: 0,
      authentication: 0,
      'cache-corruption': 0,
      'network-issues': 0,
      'configuration-error': 0,
      'docker-issues': 0,
      'api-limits': 0,
      timeout: 0,
      unknown: 0,
    }

    for (const failure of failures) {
      failuresByCategory[failure.category]++
    }

    return failuresByCategory
  }

  /**
   * Aggregate action metrics from events.
   */
  private aggregateActionMetrics(events: readonly AnalyticsEvent[]): {
    avgDuration: number
    successRate: number
  } {
    if (events.length === 0) {
      return {avgDuration: 0, successRate: 0}
    }

    const totalDuration = events.reduce((sum, event) => sum + event.action.duration, 0)
    const avgDuration = totalDuration / events.length

    const successfulActions = events.filter(event => event.action.success).length
    const successRate = (successfulActions / events.length) * 100

    return {avgDuration, successRate}
  }

  /**
   * Calculate detailed cache metrics breakdown.
   */
  private calculateCacheBreakdown(events: readonly AnalyticsEvent[]): {
    readonly hitRate: MetricBreakdown
    readonly duration: MetricBreakdown
    readonly size: MetricBreakdown
  } {
    const cacheMetrics = events.flatMap(event => event.cache)
    const restoreOperations = cacheMetrics.filter(metric => metric.operation === 'restore')

    const hitRates = restoreOperations.map(metric => (metric.hit === true ? 100 : 0))
    const durations = cacheMetrics.map(metric => metric.duration)
    const sizes = cacheMetrics.map(metric => metric.size ?? 0)

    return {
      hitRate: this.calculateMetricBreakdown(hitRates),
      duration: this.calculateMetricBreakdown(durations),
      size: this.calculateMetricBreakdown(sizes),
    }
  }

  /**
   * Calculate detailed Docker metrics breakdown.
   */
  private calculateDockerBreakdown(events: readonly AnalyticsEvent[]): {
    readonly duration: MetricBreakdown
    readonly successRate: number
  } {
    const dockerMetrics = events.flatMap(event => event.docker)
    const durations = dockerMetrics.map(metric => metric.duration)
    const successful = dockerMetrics.filter(metric => metric.success).length
    const successRate = dockerMetrics.length > 0 ? (successful / dockerMetrics.length) * 100 : 0

    return {
      duration: this.calculateMetricBreakdown(durations),
      successRate,
    }
  }

  /**
   * Calculate detailed API metrics breakdown.
   */
  private calculateApiBreakdown(events: readonly AnalyticsEvent[]): {
    readonly duration: MetricBreakdown
    readonly successRate: number
    readonly rateLimitHits: number
  } {
    const apiMetrics = events.flatMap(event => event.api)
    const durations = apiMetrics.map(metric => metric.duration)
    const successful = apiMetrics.filter(metric => metric.success).length
    const successRate = apiMetrics.length > 0 ? (successful / apiMetrics.length) * 100 : 0
    const rateLimitHits = apiMetrics.filter(metric => metric.secondaryRateLimit === true).length

    return {
      duration: this.calculateMetricBreakdown(durations),
      successRate,
      rateLimitHits,
    }
  }

  /**
   * Calculate repository statistics.
   */
  private calculateRepositoryStats(events: readonly AnalyticsEvent[]): {
    readonly totalRepositories: number
    readonly activeRepositories: number
    readonly repositoriesByLanguage: Record<string, number>
    readonly repositoriesBySize: Record<string, number>
  } {
    const repositories = new Map<string, RepositoryInfo>()

    for (const event of events) {
      repositories.set(event.repository.fullName, event.repository)
    }

    const totalRepositories = repositories.size
    const activeRepositories = totalRepositories // All repositories in events are considered active

    const repositoriesByLanguage: Record<string, number> = {}
    const repositoriesBySize: Record<string, number> = {}

    for (const repo of repositories.values()) {
      // Count by language
      const language = repo.language ?? 'unknown'
      repositoriesByLanguage[language] = (repositoriesByLanguage[language] ?? 0) + 1

      // Count by size category
      const size = repo.size ?? 0
      const sizeCategory = this.categorizeSizeCategory(size)
      repositoriesBySize[sizeCategory] = (repositoriesBySize[sizeCategory] ?? 0) + 1
    }

    return {
      totalRepositories,
      activeRepositories,
      repositoriesByLanguage,
      repositoriesBySize,
    }
  }

  /**
   * Calculate detailed metric breakdown statistics.
   */
  private calculateMetricBreakdown(values: readonly number[]): MetricBreakdown {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        p95: 0,
        p99: 0,
      }
    }

    const sortedValues = [...values].sort((a, b) => a - b)
    const count = values.length
    const sum = values.reduce((acc, val) => acc + val, 0)
    const average = sum / count
    const min = sortedValues[0] ?? 0
    const max = sortedValues.at(-1) ?? 0

    // Calculate median
    const medianIndex = Math.floor(count / 2)
    const median =
      count % 2 === 0
        ? ((sortedValues[medianIndex - 1] ?? 0) + (sortedValues[medianIndex] ?? 0)) / 2
        : (sortedValues[medianIndex] ?? 0)

    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + (val - average) ** 2, 0) / count
    const standardDeviation = Math.sqrt(variance)

    // Calculate percentiles
    const p95Index = Math.floor(count * 0.95)
    const p99Index = Math.floor(count * 0.99)
    const p95 = sortedValues[Math.min(p95Index, count - 1)] ?? 0
    const p99 = sortedValues[Math.min(p99Index, count - 1)] ?? 0

    return {
      count,
      sum,
      average,
      median,
      min,
      max,
      standardDeviation,
      p95,
      p99,
    }
  }

  /**
   * Categorize repository size for statistics.
   */
  private categorizeSizeCategory(size: number): string {
    if (size < 1000) return 'small'
    if (size < 10000) return 'medium'
    if (size < 100000) return 'large'
    return 'enterprise'
  }

  /**
   * Create empty aggregation result.
   */
  private createEmptyAggregation(options: AggregationOptions): AggregatedAnalytics {
    const now = new Date().toISOString()
    return {
      periodStart: options.startTime ?? now,
      periodEnd: options.endTime ?? now,
      eventCount: 0,
      repositoryCount: 0,
      cacheHitRate: 0,
      avgCacheDuration: 0,
      avgDockerDuration: 0,
      avgApiDuration: 0,
      failuresByCategory: {
        permissions: 0,
        authentication: 0,
        'cache-corruption': 0,
        'network-issues': 0,
        'configuration-error': 0,
        'docker-issues': 0,
        'api-limits': 0,
        timeout: 0,
        unknown: 0,
      },
      avgActionDuration: 0,
      actionSuccessRate: 0,
      schemaVersion: '1.0.0',
    }
  }
}

/**
 * Utility function to merge multiple aggregated analytics into a single result.
 */
export function mergeAggregatedAnalytics(aggregations: readonly AggregatedAnalytics[]): AggregatedAnalytics {
  if (aggregations.length === 0) {
    throw new Error('Cannot merge empty array of aggregations')
  }

  if (aggregations.length === 1) {
    const firstAggregation = aggregations[0]
    if (!firstAggregation) {
      throw new Error('First aggregation is undefined')
    }
    return firstAggregation
  }

  const timestamps = aggregations.map(agg => ({
    start: new Date(agg.periodStart).getTime(),
    end: new Date(agg.periodEnd).getTime(),
  }))

  const periodStart = new Date(Math.min(...timestamps.map(t => t.start))).toISOString()
  const periodEnd = new Date(Math.max(...timestamps.map(t => t.end))).toISOString()

  const totalEventCount = aggregations.reduce((sum, agg) => sum + agg.eventCount, 0)
  const totalRepositoryCount = aggregations.reduce((sum, agg) => sum + agg.repositoryCount, 0)

  // Weighted averages based on event count
  const weightedCacheHitRate =
    aggregations.reduce((sum, agg) => sum + agg.cacheHitRate * agg.eventCount, 0) / totalEventCount
  const weightedAvgCacheDuration =
    aggregations.reduce((sum, agg) => sum + agg.avgCacheDuration * agg.eventCount, 0) / totalEventCount
  const weightedAvgDockerDuration =
    aggregations.reduce((sum, agg) => sum + agg.avgDockerDuration * agg.eventCount, 0) / totalEventCount
  const weightedAvgApiDuration =
    aggregations.reduce((sum, agg) => sum + agg.avgApiDuration * agg.eventCount, 0) / totalEventCount
  const weightedAvgActionDuration =
    aggregations.reduce((sum, agg) => sum + agg.avgActionDuration * agg.eventCount, 0) / totalEventCount
  const weightedActionSuccessRate =
    aggregations.reduce((sum, agg) => sum + agg.actionSuccessRate * agg.eventCount, 0) / totalEventCount

  // Merge failure counts
  const mergedFailures: Record<FailureCategory, number> = {
    permissions: 0,
    authentication: 0,
    'cache-corruption': 0,
    'network-issues': 0,
    'configuration-error': 0,
    'docker-issues': 0,
    'api-limits': 0,
    timeout: 0,
    unknown: 0,
  }

  for (const agg of aggregations) {
    for (const [category, count] of Object.entries(agg.failuresByCategory)) {
      mergedFailures[category as FailureCategory] += count
    }
  }

  return {
    periodStart,
    periodEnd,
    eventCount: totalEventCount,
    repositoryCount: totalRepositoryCount,
    cacheHitRate: weightedCacheHitRate,
    avgCacheDuration: weightedAvgCacheDuration,
    avgDockerDuration: weightedAvgDockerDuration,
    avgApiDuration: weightedAvgApiDuration,
    failuresByCategory: mergedFailures,
    avgActionDuration: weightedAvgActionDuration,
    actionSuccessRate: weightedActionSuccessRate,
    schemaVersion: '1.0.0',
  }
}

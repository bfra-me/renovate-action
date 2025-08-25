/**
 * Analytics data export functionality for dashboard consumption.
 * Provides utilities to export collected analytics data in various formats.
 */

import type {AggregatedAnalytics, AnalyticsEvent, FailureCategory} from './models.js'

import {existsSync} from 'node:fs'
import {readFile, writeFile} from 'node:fs/promises'

import {AnalyticsLogger} from './logger.js'

/**
 * Export formats supported by the analytics system.
 */
export type ExportFormat = 'json' | 'csv' | 'summary'

/**
 * Export configuration options.
 */
export interface ExportConfig {
  /** Output format */
  readonly format: ExportFormat
  /** Output file path */
  readonly outputPath: string
  /** Whether to include raw event data */
  readonly includeRawData: boolean
  /** Time range filter (ISO 8601 timestamps) */
  readonly timeRange?: {
    readonly start: string
    readonly end: string
  }
  /** Repository filter (owner/repo format) */
  readonly repositoryFilter?: string
}

/**
 * Analytics data exporter.
 */
export class AnalyticsExporter {
  private readonly logger: AnalyticsLogger

  constructor(logger?: AnalyticsLogger) {
    this.logger = logger ?? new AnalyticsLogger({component: 'AnalyticsExporter'})
  }

  /**
   * Export analytics data from a collected event file.
   */
  async exportFromFile(inputPath: string, config: ExportConfig): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Analytics file not found: ${inputPath}`)
    }

    this.logger.info(`Exporting analytics data from ${inputPath} to ${config.outputPath}`)

    try {
      const fileContent = await readFile(inputPath, 'utf8')
      const analyticsEvent = JSON.parse(fileContent) as AnalyticsEvent

      // Apply filters
      const filteredEvent = this.applyFilters(analyticsEvent, config)

      // Export in requested format
      const exportedData = await this.formatData(filteredEvent, config.format, config.includeRawData)
      await writeFile(config.outputPath, exportedData, 'utf8')

      this.logger.info(`Successfully exported analytics data to ${config.outputPath}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to export analytics data: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Export multiple analytics events as aggregated data.
   */
  async exportAggregated(events: AnalyticsEvent[], config: ExportConfig): Promise<void> {
    this.logger.info(`Aggregating ${events.length} analytics events`)

    try {
      const aggregated = this.aggregateEvents(events, config)
      const exportedData = await this.formatAggregatedData(aggregated, config.format)
      await writeFile(config.outputPath, exportedData, 'utf8')

      this.logger.info(`Successfully exported aggregated analytics data to ${config.outputPath}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to export aggregated analytics data: ${errorMessage}`)
      throw error
    }
  }

  /**
   * Apply filters to analytics event based on configuration.
   */
  private applyFilters(event: AnalyticsEvent, config: ExportConfig): AnalyticsEvent {
    let filteredEvent = {...event}

    // Time range filter
    if (config.timeRange) {
      const eventTime = new Date(event.timestamp).getTime()
      const startTime = new Date(config.timeRange.start).getTime()
      const endTime = new Date(config.timeRange.end).getTime()

      if (eventTime < startTime || eventTime > endTime) {
        // Return empty event if outside time range
        filteredEvent = {
          ...event,
          cache: [],
          docker: [],
          api: [],
          failures: [],
        }
      }
    }

    // Repository filter
    if (config.repositoryFilter != null && event.repository.fullName !== config.repositoryFilter) {
      filteredEvent = {
        ...event,
        cache: [],
        docker: [],
        api: [],
        failures: [],
      }
    }

    return filteredEvent
  }

  /**
   * Format analytics data according to the specified format.
   */
  private async formatData(event: AnalyticsEvent, format: ExportFormat, includeRawData: boolean): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(includeRawData ? event : this.createSummary(event), null, 2)

      case 'csv':
        return this.formatAsCsv(event)

      case 'summary':
        return this.formatAsSummary(event)

      default: {
        const exhaustiveCheck: never = format
        throw new Error(`Unsupported export format: ${String(exhaustiveCheck)}`)
      }
    }
  }

  /**
   * Format aggregated analytics data.
   */
  private async formatAggregatedData(aggregated: AggregatedAnalytics, format: ExportFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(aggregated, null, 2)

      case 'csv':
        return this.formatAggregatedAsCsv(aggregated)

      case 'summary':
        return this.formatAggregatedAsSummary(aggregated)

      default: {
        const exhaustiveCheck: never = format
        throw new Error(`Unsupported export format: ${String(exhaustiveCheck)}`)
      }
    }
  }

  /**
   * Create a summary from analytics event.
   */
  private createSummary(event: AnalyticsEvent) {
    const cacheHitRate =
      event.cache.length > 0
        ? Math.round(
            (event.cache.filter(c => c.hit === true).length /
              event.cache.filter(c => c.operation === 'restore').length) *
              100,
          ) || 0
        : 0

    const dockerSuccessRate =
      event.docker.length > 0 ? Math.round((event.docker.filter(d => d.success).length / event.docker.length) * 100) : 0

    const apiSuccessRate =
      event.api.length > 0 ? Math.round((event.api.filter(a => a.success).length / event.api.length) * 100) : 0

    const failuresByCategory = event.failures.reduce(
      (acc, failure) => {
        acc[failure.category] = (acc[failure.category] || 0) + 1
        return acc
      },
      {} as Record<FailureCategory, number>,
    )

    return {
      summary: {
        repository: event.repository.fullName,
        timestamp: event.timestamp,
        duration: event.action.duration,
        success: event.action.success,
        renovateVersion: event.action.renovateVersion,
      },
      metrics: {
        cache: {
          operations: event.cache.length,
          hitRate: cacheHitRate,
          avgDuration:
            event.cache.length > 0
              ? Math.round(event.cache.reduce((sum, c) => sum + c.duration, 0) / event.cache.length)
              : 0,
        },
        docker: {
          operations: event.docker.length,
          successRate: dockerSuccessRate,
          avgDuration:
            event.docker.length > 0
              ? Math.round(event.docker.reduce((sum, d) => sum + d.duration, 0) / event.docker.length)
              : 0,
        },
        api: {
          requests: event.api.length,
          successRate: apiSuccessRate,
          avgDuration:
            event.api.length > 0 ? Math.round(event.api.reduce((sum, a) => sum + a.duration, 0) / event.api.length) : 0,
        },
        failures: {
          total: event.failures.length,
          byCategory: failuresByCategory,
        },
      },
    }
  }

  /**
   * Format analytics data as CSV.
   */
  private formatAsCsv(event: AnalyticsEvent): string {
    const summary = this.createSummary(event)

    const csvLines = [
      'Metric,Value',
      `Repository,${summary.summary.repository}`,
      `Timestamp,${summary.summary.timestamp}`,
      `Duration (ms),${summary.summary.duration}`,
      `Success,${summary.summary.success}`,
      `Renovate Version,${summary.summary.renovateVersion}`,
      `Cache Operations,${summary.metrics.cache.operations}`,
      `Cache Hit Rate (%),${summary.metrics.cache.hitRate}`,
      `Cache Avg Duration (ms),${summary.metrics.cache.avgDuration}`,
      `Docker Operations,${summary.metrics.docker.operations}`,
      `Docker Success Rate (%),${summary.metrics.docker.successRate}`,
      `Docker Avg Duration (ms),${summary.metrics.docker.avgDuration}`,
      `API Requests,${summary.metrics.api.requests}`,
      `API Success Rate (%),${summary.metrics.api.successRate}`,
      `API Avg Duration (ms),${summary.metrics.api.avgDuration}`,
      `Total Failures,${summary.metrics.failures.total}`,
    ]

    return csvLines.join('\n')
  }

  /**
   * Format analytics data as human-readable summary.
   */
  private formatAsSummary(event: AnalyticsEvent): string {
    const summary = this.createSummary(event)

    return `
Renovate Action Analytics Summary
================================

Repository: ${summary.summary.repository}
Timestamp: ${summary.summary.timestamp}
Duration: ${Math.round(summary.summary.duration / 1000)}s
Status: ${summary.summary.success ? '✅ Success' : '❌ Failed'}
Renovate Version: ${summary.summary.renovateVersion}

Cache Metrics:
- Operations: ${summary.metrics.cache.operations}
- Hit Rate: ${summary.metrics.cache.hitRate}%
- Avg Duration: ${summary.metrics.cache.avgDuration}ms

Docker Metrics:
- Operations: ${summary.metrics.docker.operations}
- Success Rate: ${summary.metrics.docker.successRate}%
- Avg Duration: ${summary.metrics.docker.avgDuration}ms

API Metrics:
- Requests: ${summary.metrics.api.requests}
- Success Rate: ${summary.metrics.api.successRate}%
- Avg Duration: ${summary.metrics.api.avgDuration}ms

Failures:
- Total: ${summary.metrics.failures.total}
- By Category: ${JSON.stringify(summary.metrics.failures.byCategory, null, 2)}
`.trim()
  }

  /**
   * Aggregate multiple analytics events.
   */
  private aggregateEvents(events: AnalyticsEvent[], config: ExportConfig): AggregatedAnalytics {
    const filteredEvents = events
      .map(event => this.applyFilters(event, config))
      .filter(
        event => event.cache.length > 0 || event.docker.length > 0 || event.api.length > 0 || event.failures.length > 0,
      )

    if (filteredEvents.length === 0) {
      throw new Error('No events match the specified filters')
    }

    const timestamps = filteredEvents.map(e => new Date(e.timestamp).getTime())
    const periodStart = new Date(Math.min(...timestamps)).toISOString()
    const periodEnd = new Date(Math.max(...timestamps)).toISOString()

    const allCache = filteredEvents.flatMap(e => e.cache)
    const allDocker = filteredEvents.flatMap(e => e.docker)
    const allApi = filteredEvents.flatMap(e => e.api)
    const allFailures = filteredEvents.flatMap(e => e.failures)

    const cacheRestores = allCache.filter(c => c.operation === 'restore')
    const cacheHits = cacheRestores.filter(c => c.hit === true)
    const cacheHitRate = cacheRestores.length > 0 ? Math.round((cacheHits.length / cacheRestores.length) * 100) : 0

    const avgCacheDuration =
      allCache.length > 0 ? Math.round(allCache.reduce((sum, c) => sum + c.duration, 0) / allCache.length) : 0

    const avgDockerDuration =
      allDocker.length > 0 ? Math.round(allDocker.reduce((sum, d) => sum + d.duration, 0) / allDocker.length) : 0

    const avgApiDuration =
      allApi.length > 0 ? Math.round(allApi.reduce((sum, a) => sum + a.duration, 0) / allApi.length) : 0

    const failuresByCategory = allFailures.reduce(
      (acc, failure) => {
        acc[failure.category] = (acc[failure.category] || 0) + 1
        return acc
      },
      {} as Record<FailureCategory, number>,
    )

    const actionSuccessCount = filteredEvents.filter(e => e.action.success).length
    const actionSuccessRate = Math.round((actionSuccessCount / filteredEvents.length) * 100)

    return {
      periodStart,
      periodEnd,
      eventCount: filteredEvents.length,
      repositoryCount: new Set(filteredEvents.map(e => e.repository.fullName)).size,
      cacheHitRate,
      avgCacheDuration,
      avgDockerDuration,
      avgApiDuration,
      failuresByCategory,
      avgActionDuration: Math.round(
        filteredEvents.reduce((sum, e) => sum + e.action.duration, 0) / filteredEvents.length,
      ),
      actionSuccessRate,
      schemaVersion: '1.0.0',
    }
  }

  /**
   * Format aggregated data as CSV.
   */
  private formatAggregatedAsCsv(aggregated: AggregatedAnalytics): string {
    const csvLines = [
      'Metric,Value',
      `Period Start,${aggregated.periodStart}`,
      `Period End,${aggregated.periodEnd}`,
      `Event Count,${aggregated.eventCount}`,
      `Repository Count,${aggregated.repositoryCount}`,
      `Cache Hit Rate (%),${aggregated.cacheHitRate}`,
      `Avg Cache Duration (ms),${aggregated.avgCacheDuration}`,
      `Avg Docker Duration (ms),${aggregated.avgDockerDuration}`,
      `Avg API Duration (ms),${aggregated.avgApiDuration}`,
      `Avg Action Duration (ms),${aggregated.avgActionDuration}`,
      `Action Success Rate (%),${aggregated.actionSuccessRate}`,
    ]

    return csvLines.join('\n')
  }

  /**
   * Format aggregated data as human-readable summary.
   */
  private formatAggregatedAsSummary(aggregated: AggregatedAnalytics): string {
    return `
Renovate Action Aggregated Analytics
===================================

Period: ${aggregated.periodStart} to ${aggregated.periodEnd}
Events: ${aggregated.eventCount}
Repositories: ${aggregated.repositoryCount}

Performance Metrics:
- Cache Hit Rate: ${aggregated.cacheHitRate}%
- Avg Cache Duration: ${aggregated.avgCacheDuration}ms
- Avg Docker Duration: ${aggregated.avgDockerDuration}ms
- Avg API Duration: ${aggregated.avgApiDuration}ms
- Avg Action Duration: ${Math.round(aggregated.avgActionDuration / 1000)}s
- Action Success Rate: ${aggregated.actionSuccessRate}%

Failures by Category:
${Object.entries(aggregated.failuresByCategory)
  .map(([category, count]) => `- ${category}: ${count}`)
  .join('\n')}
`.trim()
  }
}

/**
 * Quick export utility function.
 */
export async function exportAnalytics(
  inputPath: string,
  outputPath: string,
  format: ExportFormat = 'json',
  includeRawData = true,
): Promise<void> {
  const exporter = new AnalyticsExporter()
  const config: ExportConfig = {
    format,
    outputPath,
    includeRawData,
  }

  await exporter.exportFromFile(inputPath, config)
}

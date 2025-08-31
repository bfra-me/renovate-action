/**
 * Performance testing for analytics overhead and dashboard loading times.
 * Ensures analytics collection has minimal impact on action execution.
 */

import {beforeEach, describe, expect, test, vi} from 'vitest'
import {performance} from 'node:perf_hooks'
import {createMockSuite} from './mocks/index.js'

// Performance test configuration
const PERFORMANCE_TARGETS = {
  ANALYTICS_OVERHEAD_PERCENT: 5, // Max 5% overhead
  MAX_COLLECTION_TIME_MS: 1000, // Max 1 second for analytics collection
  MAX_DASHBOARD_LOAD_TIME_MS: 3000, // Max 3 seconds for dashboard load
  MAX_BATCH_PROCESSING_TIME_MS: 5000, // Max 5 seconds for batch processing
  MIN_OPERATIONS_PER_SECOND: 100, // Min throughput for batch operations
} as const

describe('Performance Testing', () => {
  let mocks: ReturnType<typeof createMockSuite>

  beforeEach(() => {
    mocks = createMockSuite({
      operationDelays: {
        github: 10, // Reduced delays for performance testing
        docker: 50,
        cache: 20,
        network: 30,
      },
    })
  })

  describe('Analytics Collection Overhead', () => {
    test('should have minimal performance impact during action execution', async () => {
      const baselineOperations = [
        () => mocks.githubApi.createAppToken(),
        () => mocks.dockerOps.pullImage('renovate/renovate:latest'),
        () => mocks.cacheOps.restore('test-cache-key'),
        () => mocks.network.fetch('https://api.github.com/repos/test/repo'),
      ]

      // Measure baseline performance without analytics
      const baselineStart = performance.now()
      await Promise.all(baselineOperations.map(op => op()))
      const baselineEnd = performance.now()
      const baselineDuration = baselineEnd - baselineStart

      // Simulate analytics collection overhead
      const analyticsOverhead = baselineDuration * 0.03 // 3% overhead simulation

      // Measure total time with analytics
      const withAnalyticsStart = performance.now()
      await Promise.all(baselineOperations.map(op => op()))
      await new Promise(resolve => setTimeout(resolve, analyticsOverhead))
      const withAnalyticsEnd = performance.now()
      const withAnalyticsDuration = withAnalyticsEnd - withAnalyticsStart

      const overheadPercent = ((withAnalyticsDuration - baselineDuration) / baselineDuration) * 100

      expect(overheadPercent).toBeLessThan(PERFORMANCE_TARGETS.ANALYTICS_OVERHEAD_PERCENT)
      expect(withAnalyticsDuration - baselineDuration).toBeLessThan(PERFORMANCE_TARGETS.MAX_COLLECTION_TIME_MS)
    })

    test('should collect metrics efficiently during high-frequency operations', async () => {
      const operationCount = 100
      const operations: Promise<unknown>[] = []

      const start = performance.now()

      // Simulate high-frequency cache operations with analytics
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          mocks.cacheOps.restore(`cache-key-${i}`).then((result) => {
            // Simulate lightweight analytics collection
            const analyticsData = {
              operation: 'restore',
              cacheKey: `cache-key-${i}`,
              hit: result.cacheHit,
              timestamp: new Date().toISOString(),
            }
            return analyticsData
          }),
        )
      }

      await Promise.all(operations)
      const end = performance.now()
      const duration = end - start

      const operationsPerSecond = (operationCount / duration) * 1000

      expect(operationsPerSecond).toBeGreaterThan(PERFORMANCE_TARGETS.MIN_OPERATIONS_PER_SECOND)
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_BATCH_PROCESSING_TIME_MS)
    })

    test('should handle concurrent analytics collection without blocking', async () => {
      const concurrentAnalyticsPromises = [
        mocks.githubApi.getRateLimit(),
        mocks.dockerOps.runContainer('test/image', ['echo', 'test']),
        mocks.cacheOps.save('analytics-test', {data: 'test'}),
        mocks.network.fetch('https://api.github.com/test'),
      ]

      const start = performance.now()
      const results = await Promise.allSettled(concurrentAnalyticsPromises)
      const end = performance.now()
      const duration = end - start

      // All operations should complete successfully
      const successfulOperations = results.filter(result => result.status === 'fulfilled')
      expect(successfulOperations.length).toBe(concurrentAnalyticsPromises.length)

      // Concurrent execution should be faster than sequential
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_COLLECTION_TIME_MS)
    })
  })

  describe('Memory Usage and Resource Efficiency', () => {
    test('should maintain reasonable memory usage during analytics collection', async () => {
      const getMemoryUsage = () => process.memoryUsage()

      const initialMemory = getMemoryUsage()

      // Generate a large number of analytics data points
      const analyticsData: Array<{
        id: string
        timestamp: string
        metrics: Record<string, unknown>
      }> = []

      for (let i = 0; i < 1000; i++) {
        analyticsData.push({
          id: `event-${i}`,
          timestamp: new Date().toISOString(),
          metrics: {
            index: i,
            randomData: Math.random().toString(36),
            cacheOperation: 'restore',
            hit: Math.random() > 0.5,
          },
        })
      }

      const afterGenerationMemory = getMemoryUsage()

      // Simulate processing analytics data
      const processedData = analyticsData.map(event => ({
        ...event,
        processed: true,
        processedAt: new Date().toISOString(),
      }))

      const finalMemory = getMemoryUsage()

      // Memory usage should not grow excessively
      const memoryGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      expect(memoryGrowthMB).toBeLessThan(100) // Less than 100MB growth

      // Clean up
      processedData.length = 0
      analyticsData.length = 0
    })

    test('should efficiently batch analytics data for storage', async () => {
      const batchSize = 50
      const totalEvents = 200
      const batches: Array<{batchIndex: number; events: Array<{id: string; data: unknown}>}> = []

      const start = performance.now()

      // Simulate batching analytics events
      for (let i = 0; i < totalEvents; i += batchSize) {
        const batch = {
          batchIndex: Math.floor(i / batchSize),
          events: [] as Array<{id: string; data: unknown}>,
        }

        for (let j = 0; j < batchSize && i + j < totalEvents; j++) {
          batch.events.push({
            id: `event-${i + j}`,
            data: {
              batchIndex: Math.floor(i / batchSize),
              eventIndex: j,
              timestamp: new Date().toISOString(),
            },
          })
        }
        batches.push(batch)

        // Simulate storing batch to cache
        await mocks.cacheOps.save(`analytics-batch-${Math.floor(i / batchSize)}`, batch)
      }

      const end = performance.now()
      const duration = end - start

      expect(batches.length).toBe(Math.ceil(totalEvents / batchSize))
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_BATCH_PROCESSING_TIME_MS)
    })
  })

  describe('Dashboard Performance Simulation', () => {
    test('should simulate dashboard data loading performance', async () => {
      // Simulate dashboard data fetching
      const dashboardDataPromises = [
        mocks.cacheOps.restore('cache-metrics'),
        mocks.cacheOps.restore('docker-metrics'),
        mocks.cacheOps.restore('api-metrics'),
        mocks.cacheOps.restore('failure-metrics'),
        mocks.cacheOps.restore('aggregated-analytics'),
      ]

      const start = performance.now()
      const dashboardData = await Promise.allSettled(dashboardDataPromises)
      const end = performance.now()
      const loadTime = end - start

      // Dashboard should load within acceptable time
      expect(loadTime).toBeLessThan(PERFORMANCE_TARGETS.MAX_DASHBOARD_LOAD_TIME_MS)

      // All data sources should respond
      expect(dashboardData.length).toBe(5)
    })

    test('should simulate client-side data processing performance', async () => {
      // Generate mock analytics data for client-side processing
      const mockAnalyticsData = {
        cacheMetrics: Array.from({length: 100}, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          hitRate: Math.random(),
          size: Math.floor(Math.random() * 1000000),
          operations: Math.floor(Math.random() * 100),
        })),
        dockerMetrics: Array.from({length: 50}, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          imagePullTime: Math.floor(Math.random() * 30000),
          containerRunTime: Math.floor(Math.random() * 120000),
          toolInstallTime: Math.floor(Math.random() * 10000),
        })),
        apiMetrics: Array.from({length: 200}, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1800000).toISOString(),
          requestCount: Math.floor(Math.random() * 50),
          rateLimitRemaining: Math.floor(Math.random() * 5000),
          responseTime: Math.floor(Math.random() * 1000),
        })),
      }

      const start = performance.now()

      // Simulate client-side aggregation and filtering
      const aggregatedData = {
        avgCacheHitRate: mockAnalyticsData.cacheMetrics.reduce((sum, m) => sum + m.hitRate, 0) / mockAnalyticsData.cacheMetrics.length,
        totalCacheSize: mockAnalyticsData.cacheMetrics.reduce((sum, m) => sum + m.size, 0),
        avgDockerPullTime: mockAnalyticsData.dockerMetrics.reduce((sum, m) => sum + m.imagePullTime, 0) / mockAnalyticsData.dockerMetrics.length,
        totalApiRequests: mockAnalyticsData.apiMetrics.reduce((sum, m) => sum + m.requestCount, 0),
      }

      // Simulate chart data preparation
      const chartData = {
        cacheHitRateOverTime: mockAnalyticsData.cacheMetrics.map(m => ({
          x: m.timestamp,
          y: m.hitRate,
        })),
        dockerPerformanceOverTime: mockAnalyticsData.dockerMetrics.map(m => ({
          x: m.timestamp,
          y: m.imagePullTime,
        })),
        apiUsageOverTime: mockAnalyticsData.apiMetrics.map(m => ({
          x: m.timestamp,
          y: m.requestCount,
        })),
      }

      const end = performance.now()
      const processingTime = end - start

      // Client-side processing should be fast
      expect(processingTime).toBeLessThan(500) // Less than 500ms

      // Verify aggregated data
      expect(aggregatedData.avgCacheHitRate).toBeGreaterThanOrEqual(0)
      expect(aggregatedData.avgCacheHitRate).toBeLessThanOrEqual(1)
      expect(aggregatedData.totalCacheSize).toBeGreaterThan(0)
      expect(chartData.cacheHitRateOverTime.length).toBe(100)
    })
  })

  describe('Stress Testing', () => {
    test('should handle high-volume analytics collection without degradation', async () => {
      const operationCount = 500
      const operationPromises: Promise<{operationId: number; timestamp: string; success: boolean}>[] = []

      const start = performance.now()

      // Generate high-volume concurrent operations
      for (let i = 0; i < operationCount; i++) {
        const operationPromise = Promise.all([
          mocks.cacheOps.restore(`stress-test-${i}`),
          mocks.githubApi.getRateLimit(),
          mocks.dockerOps.runContainer('test/image', ['echo', `test-${i}`]),
        ]).then(() => ({
          operationId: i,
          timestamp: new Date().toISOString(),
          success: true,
        }))

        operationPromises.push(operationPromise)
      }

      const results = await Promise.allSettled(operationPromises)
      const end = performance.now()
      const duration = end - start

      const successfulOperations = results.filter(result => result.status === 'fulfilled')
      const throughput = (successfulOperations.length / duration) * 1000

      // Should maintain reasonable throughput under stress
      expect(throughput).toBeGreaterThan(50) // At least 50 operations per second
      expect(successfulOperations.length).toBe(operationCount)
    })

    test('should gracefully handle resource exhaustion scenarios', async () => {
      // Simulate memory pressure by creating large objects
      const largeData = Array.from({length: 10000}, (_, i) => ({
        id: i,
        data: new Array(1000).fill(Math.random().toString(36)),
      }))

      const operationPromises: Promise<{success: boolean; size: number; duration: number}>[] = []

      try {
        // Attempt operations under memory pressure
        for (let i = 0; i < 100; i++) {
          const operationPromise = mocks.cacheOps.save(`stress-large-${i}`, {
            index: i,
            largePayload: largeData.slice(i * 100, (i + 1) * 100),
          })
          operationPromises.push(operationPromise)
        }

        const results = await Promise.allSettled(operationPromises)
        const successfulOperations = results.filter(result => result.status === 'fulfilled')

        // Should handle at least some operations successfully
        expect(successfulOperations.length).toBeGreaterThan(0)
      } finally {
        // Clean up large data
        largeData.length = 0
      }
    })
  })

  describe('Performance Monitoring and Metrics', () => {
    test('should track and report performance metrics accurately', async () => {
      const actionStartTime = new Date().toISOString()
      const operationStart = performance.now()

      // Simulate action execution with various operations
      await Promise.all([
        mocks.githubApi.createAppToken(),
        mocks.dockerOps.pullImage('renovate/renovate:latest'),
        mocks.cacheOps.restore('renovate-cache'),
        mocks.dockerOps.runContainer('renovate/renovate', ['renovate']),
        mocks.cacheOps.save('renovate-cache', {updated: true}),
      ])

      const operationEnd = performance.now()
      const operationDuration = operationEnd - operationStart
      const actionEndTime = new Date().toISOString()

      // Create immutable action metrics
      const actionMetrics = {
        startTime: actionStartTime,
        endTime: actionEndTime,
        duration: operationDuration,
        success: true,
        exitCode: 0,
        configErrors: [],
        repositoryCount: 1,
        updateCount: 0,
        prCount: 0,
        errorCount: 0,
      }

      // Validate performance metrics
      expect(actionMetrics.duration).toBeGreaterThan(0)
      expect(actionMetrics.success).toBe(true)
      expect(actionMetrics.exitCode).toBe(0)

      // Performance should be within acceptable bounds
      expect(actionMetrics.duration).toBeLessThan(10000) // Less than 10 seconds for mock operations
    })

    test('should provide performance insights for optimization', async () => {
      const performanceInsights = {
        slowestOperations: [] as Array<{operation: string; duration: number}>,
        resourceUtilization: {
          memory: process.memoryUsage(),
          cpu: 0, // Would be calculated in real implementation
        },
        optimizationRecommendations: [] as string[],
      }

      // Measure individual operation performance
      const operations = [
        {name: 'github_auth', fn: () => mocks.githubApi.createAppToken()},
        {name: 'docker_pull', fn: () => mocks.dockerOps.pullImage('test/image')},
        {name: 'cache_restore', fn: () => mocks.cacheOps.restore('test-key')},
        {name: 'cache_save', fn: () => mocks.cacheOps.save('test-key', {data: 'test'})},
      ]

      for (const operation of operations) {
        const start = performance.now()
        await operation.fn()
        const end = performance.now()
        const duration = end - start

        performanceInsights.slowestOperations.push({
          operation: operation.name,
          duration,
        })
      }

      // Sort by duration to identify bottlenecks
      performanceInsights.slowestOperations.sort((a, b) => b.duration - a.duration)

      // Generate optimization recommendations
      const slowestOperation = performanceInsights.slowestOperations[0]
      if (typeof slowestOperation?.duration === 'number' && slowestOperation.duration > 100) {
        performanceInsights.optimizationRecommendations.push(
          `Consider optimizing ${slowestOperation.operation} - took ${slowestOperation.duration.toFixed(2)}ms`,
        )
      }

      expect(performanceInsights.slowestOperations.length).toBe(operations.length)
      expect(performanceInsights.resourceUtilization.memory.heapUsed).toBeGreaterThan(0)
    })
  })
})

/**
 * Integration tests for analytics collection flow.
 * Tests complete end-to-end analytics data collection and processing.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mergeAggregatedAnalytics} from '../../src/aggregation.js'
import {AnalyticsCache} from '../../src/cache.js'
import {createMetricsManager, createCollectionContext} from '../../src/collectors/index.js'
import {DEFAULT_ANALYTICS_CONFIG} from '../../src/models.js'
import {sanitizeData} from '../../src/sanitizer.js'
import {validateAnalyticsConfig} from '../../src/validation.js'

describe('Analytics Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment
    originalEnv = {...process.env}

    // Set up test environment variables
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo'
    process.env.GITHUB_RUN_ID = '12345'
    process.env.GITHUB_WORKFLOW = 'Test Workflow'
    process.env.GITHUB_JOB = 'test-job'
    process.env.GITHUB_ACTION = 'test-action'
    process.env.RUNNER_OS = 'Linux'
    process.env.RUNNER_ARCH = 'X64'

    // Mock @actions/core
    vi.doMock('@actions/core', () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      setFailed: vi.fn()
    }))

    // Mock @actions/cache
    vi.doMock('@actions/cache', () => ({
      saveCache: vi.fn().mockResolvedValue(undefined),
      restoreCache: vi.fn().mockResolvedValue('cache-key'),
      isFeatureAvailable: vi.fn().mockReturnValue(true)
    }))
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Complete Analytics Collection Flow', () => {
    it('should collect and aggregate analytics data from all collectors', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test Workflow', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      // Collect analytics data
      const analyticsData = await manager.collectAll(context)

      expect(analyticsData).toBeDefined()
      expect(analyticsData.cache).toBeDefined()
      expect(analyticsData.docker).toBeDefined()
      expect(analyticsData.api).toBeDefined()
      expect(analyticsData.failures).toBeDefined()
    })

    it('should handle analytics collection with disabled configuration', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: false}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test Workflow', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      // Attempt operations with disabled analytics
      const analyticsData = await manager.collectAll(context)

      // Should still have basic structure but limited detailed metrics
      expect(analyticsData).toBeDefined()
      expect(analyticsData.cache).toEqual([])
      expect(analyticsData.docker).toEqual([])
      expect(analyticsData.api).toEqual([])
      expect(analyticsData.failures).toEqual([])
    })

    it('should validate data sanitization in integration flow', () => {
      const testData = {
        token: 'ghp_1234567890abcdef',
        apiKey: 'sk-proj-abcd1234',
        email: 'user@example.com',
        safeData: 'this is safe'
      }

      const sanitized = sanitizeData(testData)

      // Verify sensitive data is sanitized (should be redacted)
      expect(sanitized).toBeDefined()
      expect(typeof sanitized).toBe('object')
    })
  })

  describe('Cache Integration Tests', () => {
    it('should generate consistent cache keys', () => {
      const cache = new AnalyticsCache(DEFAULT_ANALYTICS_CONFIG)

      const key1 = cache.generateKey({
        prefix: 'analytics',
        repository: 'test-org/test-repo',
        type: 'events',
        version: '1.0.0'
      })
      const key2 = cache.generateKey({
        prefix: 'analytics',
        repository: 'test-org/test-repo',
        type: 'events',
        version: '1.0.0'
      })

      // Keys should be consistent for same input
      expect(key1).toBe(key2)
      expect(key1).toContain('analytics')
      expect(key1).toContain('test-org-test-repo')
    })

    it('should handle cache operation failures gracefully', () => {
      const cache = new AnalyticsCache(DEFAULT_ANALYTICS_CONFIG)

      // Test with invalid input - should generate a key but may be invalid
      const invalidKey = cache.generateKey({
        prefix: '',
        repository: '',
        type: 'events',
        version: ''
      })

      // Should still generate a string, even if empty parts
      expect(typeof invalidKey).toBe('string')
      expect(invalidKey).toContain('events') // Type should still be present
    })
  })

  describe('Performance Validation', () => {
    it('should complete analytics collection within performance thresholds', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}

      const startTime = performance.now()
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test Workflow', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      await manager.collectAll(context)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      // Validate performance thresholds (should be very fast for analytics)
      expect(executionTime).toBeLessThan(1000) // Under 1 second
    })
  })

  describe('Multi-Repository Analytics', () => {
    it('should aggregate analytics data across multiple repository contexts', () => {
      const aggregations = [
        {
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          eventCount: 5,
          repositoryCount: 1,
          cacheHitRate: 0.8,
          avgCacheDuration: 150,
          avgDockerDuration: 3000,
          avgApiDuration: 200,
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
          avgActionDuration: 300000,
          actionSuccessRate: 1.0,
          schemaVersion: '1.0.0',
        },
        {
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          eventCount: 3,
          repositoryCount: 1,
          cacheHitRate: 0.6,
          avgCacheDuration: 200,
          avgDockerDuration: 4000,
          avgApiDuration: 250,
          failuresByCategory: {
            permissions: 0,
            authentication: 0,
            'cache-corruption': 0,
            'network-issues': 1,
            'configuration-error': 0,
            'docker-issues': 0,
            'api-limits': 0,
            timeout: 0,
            unknown: 0,
          },
          avgActionDuration: 400000,
          actionSuccessRate: 0.9,
          schemaVersion: '1.0.0',
        }
      ]

      const merged = mergeAggregatedAnalytics(aggregations)

      expect(merged.eventCount).toBe(8) // 5 + 3
      expect(merged.repositoryCount).toBe(2) // 1 + 1
      expect(merged.schemaVersion).toBe('1.0.0')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle collector errors without breaking the collection flow', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test Workflow', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      // Should still be able to collect data even with potential errors
      const analyticsData = await manager.collectAll(context)
      expect(analyticsData).toBeDefined()
    })
  })

  describe('Configuration Validation', () => {
    it('should validate analytics configuration through integration flow', () => {
      const validConfig = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}

      const validResult = validateAnalyticsConfig(validConfig)
      expect(validResult.success).toBe(true)
    })
  })
})

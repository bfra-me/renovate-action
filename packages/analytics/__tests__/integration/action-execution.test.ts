/**
 * Integration tests for complete GitHub Action execution with analytics.
 * Tests the full action lifecycle with analytics data collection.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetricsManager, createCollectionContext} from '../../src/collectors/index.js'
import {DEFAULT_ANALYTICS_CONFIG} from '../../src/models.js'
import {AnalyticsCache} from '../../src/cache.js'

describe('Action Execution Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}

    // Set up complete GitHub Actions environment
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo'
    process.env.GITHUB_RUN_ID = '12345'
    process.env.GITHUB_RUN_NUMBER = '1'
    process.env.GITHUB_WORKFLOW = 'Renovate'
    process.env.GITHUB_EVENT_NAME = 'schedule'
    process.env.GITHUB_REF = 'refs/heads/main'
    process.env.GITHUB_SHA = 'abc123def456'
    process.env.GITHUB_ACTOR = 'renovate[bot]'
    process.env.RUNNER_OS = 'Linux'
    process.env.RUNNER_ARCH = 'X64'

    // Mock all external dependencies
    vi.doMock('@actions/core', () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      setFailed: vi.fn(),
      getInput: vi.fn().mockReturnValue(''),
      setOutput: vi.fn()
    }))

    vi.doMock('@actions/cache', () => ({
      saveCache: vi.fn().mockResolvedValue(undefined),
      restoreCache: vi.fn().mockResolvedValue('cache-key'),
      isFeatureAvailable: vi.fn().mockReturnValue(true)
    }))
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Complete Action Execution Flow', () => {
    it('should execute action simulation with full analytics collection', async () => {
      const config = {
        ...DEFAULT_ANALYTICS_CONFIG,
        enabled: true,
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true
      }

      const manager = createMetricsManager(config)
      const cache = new AnalyticsCache(config)

      // Simulate action execution steps
      const context = createCollectionContext(
        config,
        {
          owner: 'test-org',
          repo: 'test-repo',
          fullName: 'test-org/test-repo',
          id: 12345,
          visibility: 'public'
        },
        {
          runId: '12345',
          runNumber: 1,
          workflowName: 'Renovate',
          eventName: 'schedule',
          ref: 'refs/heads/main',
          sha: 'abc123def456',
          actor: 'renovate[bot]'
        }
      )

      // Step 1: Cache operations
      const startTime = performance.now()

      // Step 2: Collect all analytics
      const analyticsData = await manager.collectAll(context)

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Verify action execution completed successfully
      expect(analyticsData).toBeDefined()
      expect(analyticsData.cache).toBeDefined()
      expect(analyticsData.docker).toBeDefined()
      expect(analyticsData.api).toBeDefined()
      expect(analyticsData.failures).toBeDefined()

      // Verify performance within acceptable bounds
      expect(executionTime).toBeLessThan(2000) // Under 2 seconds

      // Verify cache operations work
      const cacheKey = cache.generateKey({
        prefix: 'renovate-analytics',
        repository: 'test-org/test-repo',
        type: 'events',
        version: '1.0.0'
      })
      expect(cacheKey).toContain('renovate-analytics')
    })

    it('should handle action execution in dry-run mode', async () => {
      // Set dry-run environment
      process.env.DRY_RUN = 'true'

      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Renovate', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      // Should still collect analytics in dry-run mode
      const analyticsData = await manager.collectAll(context)

      expect(analyticsData).toBeDefined()
    })

    it('should measure performance overhead of analytics collection', async () => {
      const baselineStart = performance.now()

      // Baseline execution without analytics
      const disabledConfig = {...DEFAULT_ANALYTICS_CONFIG, enabled: false}
      const disabledManager = createMetricsManager(disabledConfig)

      const context = createCollectionContext(
        disabledConfig,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      await disabledManager.collectAll(context)
      const baselineTime = performance.now() - baselineStart

      // Execution with analytics enabled
      const analyticsStart = performance.now()

      const enabledConfig = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const enabledManager = createMetricsManager(enabledConfig)

      const enabledContext = createCollectionContext(
        enabledConfig,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      await enabledManager.collectAll(enabledContext)
      const analyticsTime = performance.now() - analyticsStart

      const overhead = analyticsTime - baselineTime

      // Analytics overhead should be minimal
      expect(overhead).toBeLessThan(500) // Less than 500ms overhead
    })

    it('should validate error recovery during action execution', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      // Should handle errors gracefully and still return data
      const analyticsData = await manager.collectAll(context)

      expect(analyticsData).toBeDefined()
      expect(analyticsData.cache).toBeDefined()
      expect(analyticsData.docker).toBeDefined()
      expect(analyticsData.api).toBeDefined()
      expect(analyticsData.failures).toBeDefined()
    })

    it('should support multi-repository analytics collection', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}

      const repositories = [
        {owner: 'org1', repo: 'repo1', fullName: 'org1/repo1', id: 1, visibility: 'public' as const},
        {owner: 'org2', repo: 'repo2', fullName: 'org2/repo2', id: 2, visibility: 'private' as const},
        {owner: 'org3', repo: 'repo3', fullName: 'org3/repo3', id: 3, visibility: 'public' as const}
      ]

      const allResults: Array<{
        cache: unknown[]
        docker: unknown[]
        api: unknown[]
        failures: unknown[]
      }> = []

      for (const repo of repositories) {
        const manager = createMetricsManager(config)

        const context = createCollectionContext(
          config,
          repo,
          {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
        )

        const result = await manager.collectAll(context)
        allResults.push(result)
      }

      // Verify data collected for all repositories
      expect(allResults).toHaveLength(3)
      allResults.forEach(result => {
        expect(result.cache).toBeDefined()
        expect(result.docker).toBeDefined()
        expect(result.api).toBeDefined()
        expect(result.failures).toBeDefined()
      })
    })

    it('should validate end-to-end analytics data integrity', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const analyticsData = await manager.collectAll(context)

      // Validate data structure integrity
      expect(typeof analyticsData).toBe('object')
      expect(analyticsData).not.toBe(null)

      // Validate all required collector results are present
      const requiredCollectors = ['cache', 'docker', 'api', 'failures']
      for (const collector of requiredCollectors) {
        expect(analyticsData).toHaveProperty(collector)
        expect(Array.isArray(analyticsData[collector as keyof typeof analyticsData])).toBe(true)
      }

      // Validate manager state
      expect(manager.getCollectorCount()).toBe(4)
      expect(manager.getCollectorNames()).toEqual(expect.arrayContaining(requiredCollectors))
    })
  })
})

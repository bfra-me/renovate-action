/**
 * Integration tests for individual collector modules.
 * Tests each collector type in isolation with realistic scenarios.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetricsManager, createCollectionContext} from '../../src/collectors/index.js'
import {DEFAULT_ANALYTICS_CONFIG} from '../../src/models.js'

describe('Collector Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = {...process.env}

    // Set up test environment
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo'
    process.env.GITHUB_RUN_ID = '12345'
    process.env.RUNNER_OS = 'Linux'
    process.env.RUNNER_ARCH = 'X64'

    // Mock dependencies
    vi.doMock('@actions/core', () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn()
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

  describe('Cache Metrics Collector', () => {
    it('should collect cache metrics when enabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectCache: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.cache).toBeDefined()
      expect(Array.isArray(results.cache)).toBe(true)
    })

    it('should skip cache collection when disabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectCache: false}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.cache).toEqual([])
    })
  })

  describe('Docker Metrics Collector', () => {
    it('should collect docker metrics when enabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectDocker: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.docker).toBeDefined()
      expect(Array.isArray(results.docker)).toBe(true)
    })

    it('should skip docker collection when disabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectDocker: false}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.docker).toEqual([])
    })
  })

  describe('API Metrics Collector', () => {
    it('should collect API metrics when enabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectApi: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.api).toBeDefined()
      expect(Array.isArray(results.api)).toBe(true)
    })

    it('should skip API collection when disabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectApi: false}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.api).toEqual([])
    })
  })

  describe('Failure Metrics Collector', () => {
    it('should collect failure metrics when enabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectFailures: true}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.failures).toBeDefined()
      expect(Array.isArray(results.failures)).toBe(true)
    })

    it('should skip failure collection when disabled', async () => {
      const config = {...DEFAULT_ANALYTICS_CONFIG, enabled: true, collectFailures: false}
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      expect(results.failures).toEqual([])
    })
  })

  describe('Cross-Collector Coordination', () => {
    it('should coordinate data collection across all collectors', async () => {
      const config = {
        ...DEFAULT_ANALYTICS_CONFIG,
        enabled: true,
        collectCache: true,
        collectDocker: true,
        collectApi: true,
        collectFailures: true
      }
      const manager = createMetricsManager(config)

      const context = createCollectionContext(
        config,
        {owner: 'test-org', repo: 'test-repo', fullName: 'test-org/test-repo', id: 12345, visibility: 'public'},
        {runId: '12345', runNumber: 1, workflowName: 'Test', eventName: 'push', ref: 'refs/heads/main', sha: 'abc123', actor: 'test-user'}
      )

      const results = await manager.collectAll(context)

      // Verify all collectors provided data structures
      expect(results.cache).toBeDefined()
      expect(results.docker).toBeDefined()
      expect(results.api).toBeDefined()
      expect(results.failures).toBeDefined()

      // Verify each is an array (even if empty)
      expect(Array.isArray(results.cache)).toBe(true)
      expect(Array.isArray(results.docker)).toBe(true)
      expect(Array.isArray(results.api)).toBe(true)
      expect(Array.isArray(results.failures)).toBe(true)
    })

    it('should handle collector registration correctly', () => {
      const manager = createMetricsManager(DEFAULT_ANALYTICS_CONFIG)

      // Should have registered all 4 collectors
      expect(manager.getCollectorCount()).toBe(4)

      const collectorNames = manager.getCollectorNames()
      expect(collectorNames).toContain('cache')
      expect(collectorNames).toContain('docker')
      expect(collectorNames).toContain('api')
      expect(collectorNames).toContain('failures')
    })
  })
})

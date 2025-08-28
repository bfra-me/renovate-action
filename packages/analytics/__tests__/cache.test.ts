/**
 * Unit tests for GitHub Actions Cache integration.
 * Validates cache operations, key generation, and data serialization.
 */

import {beforeEach, describe, expect, test, vi} from 'vitest'
import type {AnalyticsEvent, AggregatedAnalytics, AnalyticsConfig} from '../src/models.js'
import {
  AnalyticsCache,
  createEventsCacheKey,
  createAggregatedCacheKey,
  getRepositoryIdentifier,
  isCacheAvailable,
} from '../src/cache.js'
import {DEFAULT_ANALYTICS_CONFIG} from '../src/models.js'

// Mock @actions/cache
vi.mock('@actions/cache', () => ({
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
  isFeatureAvailable: vi.fn(() => true),
}))

// Mock @actions/core
vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

import * as cache from '@actions/cache'

describe('AnalyticsCache', () => {
  let analyticsCache: AnalyticsCache
  let mockConfig: AnalyticsConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfig = {
      ...DEFAULT_ANALYTICS_CONFIG,
      enabled: true,
      cacheKeyPrefix: 'test-analytics',
    }
    analyticsCache = new AnalyticsCache(mockConfig)
  })

  describe('Constructor and Configuration', () => {
    test('should initialize with provided configuration', () => {
      const customConfig: AnalyticsConfig = {
        ...DEFAULT_ANALYTICS_CONFIG,
        cacheKeyPrefix: 'custom-analytics',
        maxDataSize: 5 * 1024 * 1024,
      }

      const customCache = new AnalyticsCache(customConfig)
      expect(customCache).toBeDefined()
    })

    test('should handle disabled analytics gracefully', () => {
      const disabledConfig: AnalyticsConfig = {
        ...DEFAULT_ANALYTICS_CONFIG,
        enabled: false,
      }

      const disabledCache = new AnalyticsCache(disabledConfig)
      expect(disabledCache).toBeDefined()
    })
  })

  describe('Utility Functions', () => {
    test('should create events cache key', () => {
      const key = createEventsCacheKey('renovate-analytics', 'bfra-me/renovate-action', '2025-08-27')

      expect(key.prefix).toBe('renovate-analytics')
      expect(key.repository).toBe('bfra-me/renovate-action')
      expect(key.type).toBe('events')
      expect(key.timestamp).toBe('2025-08-27')
    })

    test('should create aggregated cache key', () => {
      const key = createAggregatedCacheKey('renovate-analytics', 'bfra-me/renovate-action', '2025-08-27')

      expect(key.prefix).toBe('renovate-analytics')
      expect(key.repository).toBe('bfra-me/renovate-action')
      expect(key.type).toBe('aggregated')
      expect(key.timestamp).toBe('2025-08-27')
    })

    test('should get repository identifier from environment', () => {
      process.env.GITHUB_REPOSITORY = 'bfra-me/renovate-action'

      const repoId = getRepositoryIdentifier()

      expect(repoId).toBe('bfra-me/renovate-action')

      delete process.env.GITHUB_REPOSITORY
    })

    test('should check cache availability', () => {
      vi.mocked(cache.isFeatureAvailable).mockReturnValue(true)

      const isAvailable = isCacheAvailable()

      expect(isAvailable).toBe(true)
      expect(cache.isFeatureAvailable).toHaveBeenCalled()
    })

    test('should handle unavailable cache', () => {
      vi.mocked(cache.isFeatureAvailable).mockReturnValue(false)

      const isAvailable = isCacheAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('Analytics Events Storage', () => {
    test('should store analytics events successfully', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'test-event-123',
          timestamp: '2025-08-27T10:30:00.000Z',
          repository: {
            owner: 'bfra-me',
            repo: 'renovate-action',
            fullName: 'bfra-me/renovate-action',
            id: 123456789,
            visibility: 'public',
          },
          workflow: {
            runId: '1234567890',
            runNumber: 123,
            workflowName: 'CI',
            eventName: 'push',
            ref: 'refs/heads/main',
            sha: 'abc123def456',
            actor: 'dependabot[bot]',
          },
          cache: [],
          docker: [],
          api: [],
          failures: [],
          action: {
            startTime: '2025-08-27T10:30:00.000Z',
            endTime: '2025-08-27T10:45:00.000Z',
            duration: 900000,
            success: true,
            renovateVersion: '38.120.0',
            actionVersion: 'v1.2.3',
            exitCode: 0,
          },
          schemaVersion: '1.0.0',
        },
      ]

      vi.mocked(cache.saveCache).mockResolvedValue(0)

      const result = await analyticsCache.storeEvents('bfra-me/renovate-action', mockEvents)

      expect(result.success).toBe(true)
      expect(result.key).toBeDefined()
      expect(cache.saveCache).toHaveBeenCalled()
    })

    test('should handle cache save failure', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'test-event-123',
          timestamp: '2025-08-27T10:30:00.000Z',
          repository: {
            owner: 'bfra-me',
            repo: 'renovate-action',
            fullName: 'bfra-me/renovate-action',
            id: 123456789,
            visibility: 'public',
          },
          workflow: {
            runId: '1234567890',
            runNumber: 123,
            workflowName: 'CI',
            eventName: 'push',
            ref: 'refs/heads/main',
            sha: 'abc123def456',
            actor: 'dependabot[bot]',
          },
          cache: [],
          docker: [],
          api: [],
          failures: [],
          action: {
            startTime: '2025-08-27T10:30:00.000Z',
            endTime: '2025-08-27T10:45:00.000Z',
            duration: 900000,
            success: true,
            renovateVersion: '38.120.0',
            actionVersion: 'v1.2.3',
            exitCode: 0,
          },
          schemaVersion: '1.0.0',
        },
      ]

      vi.mocked(cache.saveCache).mockRejectedValue(new Error('Cache save failed'))

      const result = await analyticsCache.storeEvents('bfra-me/renovate-action', mockEvents)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cache save failed')
    })
  })

  describe('Analytics Events Retrieval', () => {
    test('should retrieve analytics events successfully', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue('test-cache-key')

      const result = await analyticsCache.retrieveEvents('bfra-me/renovate-action', '2025-08-27')

      expect(result.key).toBeDefined()
      expect(cache.restoreCache).toHaveBeenCalled()
    })

    test('should handle cache miss', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue(undefined)

      const result = await analyticsCache.retrieveEvents('bfra-me/renovate-action', '2025-08-27')

      expect(result.success).toBe(false)
      expect(result.hit).toBe(false)
    })
  })

  describe('Aggregated Analytics Operations', () => {
    test('should store aggregated analytics', async () => {
      const mockAggregated: AggregatedAnalytics = {
        periodStart: '2025-08-27T00:00:00.000Z',
        periodEnd: '2025-08-27T23:59:59.999Z',
        eventCount: 150,
        repositoryCount: 25,
        cacheHitRate: 85.6,
        avgCacheDuration: 2500,
        avgDockerDuration: 45000,
        avgApiDuration: 1200,
        failuresByCategory: {
          permissions: 2,
          authentication: 1,
          'cache-corruption': 0,
          'network-issues': 5,
          'configuration-error': 1,
          'docker-issues': 3,
          'api-limits': 2,
          timeout: 1,
          unknown: 0,
        },
        avgActionDuration: 480000,
        actionSuccessRate: 94.7,
        schemaVersion: '1.0.0',
      }

      vi.mocked(cache.saveCache).mockResolvedValue(456)

      const result = await analyticsCache.storeAggregated('bfra-me/renovate-action', mockAggregated)

      expect(result.success).toBe(true)
      expect(result.key).toContain('aggregated')
      expect(cache.saveCache).toHaveBeenCalled()
    })

    test('should retrieve aggregated analytics', async () => {
      vi.mocked(cache.restoreCache).mockResolvedValue('aggregated-cache-key')

      const result = await analyticsCache.retrieveAggregated('bfra-me/renovate-action', '2025-08-27')

      expect(result.key).toBeDefined()
      expect(cache.restoreCache).toHaveBeenCalled()
    })
  })

  describe('Cache Management', () => {
    test('should list cache keys for repository', async () => {
      const keys = await analyticsCache.listKeys('bfra-me/renovate-action')

      expect(Array.isArray(keys)).toBe(true)
    })

    test('should get cache statistics', async () => {
      const stats = await analyticsCache.getCacheStats()

      expect(stats).toBeDefined()
      expect(typeof stats.totalSize).toBe('number')
      expect(typeof stats.entryCount).toBe('number')
    })

    test('should clear repository cache', async () => {
      await expect(analyticsCache.clearRepository('bfra-me/renovate-action')).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      vi.mocked(cache.saveCache).mockRejectedValue(new Error('Network error'))

      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'error-test',
          timestamp: '2025-08-27T10:30:00.000Z',
          repository: {
            owner: 'bfra-me',
            repo: 'renovate-action',
            fullName: 'bfra-me/renovate-action',
            id: 123456789,
            visibility: 'public',
          },
          workflow: {
            runId: '1234567890',
            runNumber: 123,
            workflowName: 'CI',
            eventName: 'push',
            ref: 'refs/heads/main',
            sha: 'abc123def456',
            actor: 'dependabot[bot]',
          },
          cache: [],
          docker: [],
          api: [],
          failures: [],
          action: {
            startTime: '2025-08-27T10:30:00.000Z',
            endTime: '2025-08-27T10:45:00.000Z',
            duration: 900000,
            success: true,
            renovateVersion: '38.120.0',
            actionVersion: 'v1.2.3',
            exitCode: 0,
          },
          schemaVersion: '1.0.0',
        },
      ]

      const result = await analyticsCache.storeEvents('bfra-me/renovate-action', mockEvents)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    test('should handle empty data arrays', async () => {
      const result = await analyticsCache.storeEvents('bfra-me/renovate-action', [])

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    test('should handle invalid repository names', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'invalid-repo-test',
          timestamp: '2025-08-27T10:30:00.000Z',
          repository: {
            owner: 'bfra-me',
            repo: 'renovate-action',
            fullName: 'bfra-me/renovate-action',
            id: 123456789,
            visibility: 'public',
          },
          workflow: {
            runId: '1234567890',
            runNumber: 123,
            workflowName: 'CI',
            eventName: 'push',
            ref: 'refs/heads/main',
            sha: 'abc123def456',
            actor: 'dependabot[bot]',
          },
          cache: [],
          docker: [],
          api: [],
          failures: [],
          action: {
            startTime: '2025-08-27T10:30:00.000Z',
            endTime: '2025-08-27T10:45:00.000Z',
            duration: 900000,
            success: true,
            renovateVersion: '38.120.0',
            actionVersion: 'v1.2.3',
            exitCode: 0,
          },
          schemaVersion: '1.0.0',
        },
      ]

      const result = await analyticsCache.storeEvents('', mockEvents)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Performance', () => {
    test('should handle large datasets efficiently', async () => {
      const largeEventSet: AnalyticsEvent[] = Array.from({length: 50}, (_, i) => ({
        id: `large-event-${i}`,
        timestamp: '2025-08-27T10:30:00.000Z',
        repository: {
          owner: 'bfra-me',
          repo: 'renovate-action',
          fullName: 'bfra-me/renovate-action',
          id: 123456789,
          visibility: 'public',
        },
        workflow: {
          runId: `${1234567890 + i}`,
          runNumber: 123 + i,
          workflowName: 'CI',
          eventName: 'push',
          ref: 'refs/heads/main',
          sha: 'abc123def456',
          actor: 'dependabot[bot]',
        },
        cache: [],
        docker: [],
        api: [],
        failures: [],
        action: {
          startTime: '2025-08-27T10:30:00.000Z',
          endTime: '2025-08-27T10:45:00.000Z',
          duration: 900000,
          success: true,
          renovateVersion: '38.120.0',
          actionVersion: 'v1.2.3',
          exitCode: 0,
        },
        schemaVersion: '1.0.0',
      }))

      vi.mocked(cache.saveCache).mockResolvedValue(789)

      const startTime = Date.now()
      const result = await analyticsCache.storeEvents('bfra-me/renovate-action', largeEventSet)
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})

/**
 * Unit tests for analytics data models and TypeScript interfaces.
 * Validates data structure integrity, type safety, and edge cases.
 */

import {describe, expect, test} from 'vitest'
import type {
  AnalyticsConfig,
  AnalyticsEvent,
  AggregatedAnalytics,
  ApiMetrics,
  ActionMetrics,
  CacheMetrics,
  DockerMetrics,
  FailureCategory,
  FailureMetrics,
  RepositoryInfo,
  Timestamp,
  WorkflowContext,
} from '../src/models.js'
import {ANALYTICS_SCHEMA_VERSION, DEFAULT_ANALYTICS_CONFIG} from '../src/models.js'

describe('Analytics Models', () => {
  describe('Timestamp type', () => {
    test('should accept valid ISO 8601 timestamp strings', () => {
      const validTimestamps: Timestamp[] = [
        '2025-08-27T10:30:00.000Z',
        '2025-08-27T10:30:00Z',
        '2025-08-27T10:30:00.123Z',
        '2025-12-31T23:59:59.999Z',
      ]

      validTimestamps.forEach(timestamp => {
        // Type checking - should compile without errors
        const ts: Timestamp = timestamp
        expect(typeof ts).toBe('string')
        // Validate it's a valid date when parsed
        const parsedDate = new Date(timestamp)
        expect(parsedDate.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        expect(parsedDate.getTime()).toBeGreaterThan(0)
      })
    })
  })

  describe('RepositoryInfo interface', () => {
    test('should validate required fields', () => {
      const repositoryInfo: RepositoryInfo = {
        owner: 'bfra-me',
        repo: 'renovate-action',
        fullName: 'bfra-me/renovate-action',
        id: 123456789,
        visibility: 'public',
      }

      expect(repositoryInfo.owner).toBe('bfra-me')
      expect(repositoryInfo.repo).toBe('renovate-action')
      expect(repositoryInfo.fullName).toBe('bfra-me/renovate-action')
      expect(repositoryInfo.id).toBe(123456789)
      expect(repositoryInfo.visibility).toBe('public')
    })

    test('should allow optional fields', () => {
      const repositoryInfo: RepositoryInfo = {
        owner: 'bfra-me',
        repo: 'renovate-action',
        fullName: 'bfra-me/renovate-action',
        id: 123456789,
        visibility: 'private',
        size: 1024000,
        language: 'TypeScript',
      }

      expect(repositoryInfo.size).toBe(1024000)
      expect(repositoryInfo.language).toBe('TypeScript')
      expect(repositoryInfo.visibility).toBe('private')
    })

    test('should enforce visibility type constraints', () => {
      // These should compile successfully
      const publicRepo: RepositoryInfo = {
        owner: 'test',
        repo: 'test',
        fullName: 'test/test',
        id: 1,
        visibility: 'public',
      }

      const privateRepo: RepositoryInfo = {
        owner: 'test',
        repo: 'test',
        fullName: 'test/test',
        id: 1,
        visibility: 'private',
      }

      expect(publicRepo.visibility).toBe('public')
      expect(privateRepo.visibility).toBe('private')
    })
  })

  describe('WorkflowContext interface', () => {
    test('should validate all required fields', () => {
      const workflowContext: WorkflowContext = {
        runId: '1234567890',
        runNumber: 123,
        workflowName: 'CI',
        eventName: 'push',
        ref: 'refs/heads/main',
        sha: 'abc123def456',
        actor: 'dependabot[bot]',
      }

      expect(workflowContext.runId).toBe('1234567890')
      expect(workflowContext.runNumber).toBe(123)
      expect(workflowContext.workflowName).toBe('CI')
      expect(workflowContext.eventName).toBe('push')
      expect(workflowContext.ref).toBe('refs/heads/main')
      expect(workflowContext.sha).toBe('abc123def456')
      expect(workflowContext.actor).toBe('dependabot[bot]')
    })

    test('should handle different event types', () => {
      const eventTypes = ['push', 'pull_request', 'schedule', 'workflow_dispatch', 'release']

      eventTypes.forEach(eventName => {
        const context: WorkflowContext = {
          runId: '1234567890',
          runNumber: 1,
          workflowName: 'Test',
          eventName,
          ref: 'refs/heads/main',
          sha: 'abc123',
          actor: 'test-user',
        }

        expect(context.eventName).toBe(eventName)
      })
    })
  })

  describe('CacheMetrics interface', () => {
    test('should validate cache restore operation', () => {
      const cacheMetrics: CacheMetrics = {
        operation: 'restore',
        key: 'renovate-cache-v1-abc123',
        version: 'v1',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:05.000Z',
        duration: 5000,
        success: true,
        hit: true,
        size: 1024000,
      }

      expect(cacheMetrics.operation).toBe('restore')
      expect(cacheMetrics.hit).toBe(true)
      expect(cacheMetrics.success).toBe(true)
      expect(cacheMetrics.duration).toBe(5000)
      expect(cacheMetrics.size).toBe(1024000)
    })

    test('should validate cache save operation without hit status', () => {
      const cacheMetrics: CacheMetrics = {
        operation: 'save',
        key: 'renovate-cache-v1-abc123',
        version: 'v1',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:05.000Z',
        duration: 5000,
        success: true,
        size: 2048000,
      }

      expect(cacheMetrics.operation).toBe('save')
      expect(cacheMetrics.hit).toBeUndefined()
      expect(cacheMetrics.success).toBe(true)
      expect(cacheMetrics.size).toBe(2048000)
    })

    test('should handle failed cache operations', () => {
      const cacheMetrics: CacheMetrics = {
        operation: 'restore',
        key: 'renovate-cache-v1-abc123',
        version: 'v1',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:10.000Z',
        duration: 10000,
        success: false,
        hit: false,
        error: 'Cache not found',
      }

      expect(cacheMetrics.success).toBe(false)
      expect(cacheMetrics.hit).toBe(false)
      expect(cacheMetrics.error).toBe('Cache not found')
    })

    test('should validate all cache operation types', () => {
      const operations: CacheMetrics['operation'][] = ['restore', 'save', 'prepare', 'finalize']

      operations.forEach(operation => {
        const metrics: CacheMetrics = {
          operation,
          key: 'test-key',
          version: 'v1',
          startTime: '2025-08-27T10:30:00.000Z',
          endTime: '2025-08-27T10:30:01.000Z',
          duration: 1000,
          success: true,
        }

        expect(metrics.operation).toBe(operation)
      })
    })
  })

  describe('DockerMetrics interface', () => {
    test('should validate Docker image pull operation', () => {
      const dockerMetrics: DockerMetrics = {
        operation: 'pull',
        image: 'renovate/renovate:38.120.0-slim',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:32:00.000Z',
        duration: 120000,
        success: true,
      }

      expect(dockerMetrics.operation).toBe('pull')
      expect(dockerMetrics.image).toBe('renovate/renovate:38.120.0-slim')
      expect(dockerMetrics.duration).toBe(120000)
      expect(dockerMetrics.success).toBe(true)
    })

    test('should validate Docker tool installation', () => {
      const dockerMetrics: DockerMetrics = {
        operation: 'tool-install',
        containerId: 'abc123def456',
        tool: 'python',
        toolVersion: '3.11.0',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:30.000Z',
        duration: 30000,
        success: true,
        exitCode: 0,
      }

      expect(dockerMetrics.operation).toBe('tool-install')
      expect(dockerMetrics.tool).toBe('python')
      expect(dockerMetrics.toolVersion).toBe('3.11.0')
      expect(dockerMetrics.exitCode).toBe(0)
    })

    test('should handle failed Docker operations', () => {
      const dockerMetrics: DockerMetrics = {
        operation: 'run',
        image: 'renovate/renovate:latest',
        containerId: 'failed123',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:15.000Z',
        duration: 15000,
        success: false,
        exitCode: 1,
        error: 'Container failed to start',
      }

      expect(dockerMetrics.success).toBe(false)
      expect(dockerMetrics.exitCode).toBe(1)
      expect(dockerMetrics.error).toBe('Container failed to start')
    })
  })

  describe('ApiMetrics interface', () => {
    test('should validate successful API request', () => {
      const apiMetrics: ApiMetrics = {
        endpoint: '/repos/bfra-me/renovate-action/contents',
        method: 'GET',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:01.500Z',
        duration: 1500,
        statusCode: 200,
        success: true,
        rateLimitRemaining: 4999,
        rateLimitReset: '2025-08-27T11:30:00.000Z',
        authMethod: 'github-app',
        responseSize: 2048,
      }

      expect(apiMetrics.method).toBe('GET')
      expect(apiMetrics.statusCode).toBe(200)
      expect(apiMetrics.success).toBe(true)
      expect(apiMetrics.authMethod).toBe('github-app')
      expect(apiMetrics.rateLimitRemaining).toBe(4999)
    })

    test('should validate failed API request with rate limiting', () => {
      const apiMetrics: ApiMetrics = {
        endpoint: '/repos/bfra-me/renovate-action/pulls',
        method: 'POST',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:05.000Z',
        duration: 5000,
        statusCode: 403,
        success: false,
        rateLimitRemaining: 0,
        rateLimitReset: '2025-08-27T11:30:00.000Z',
        secondaryRateLimit: true,
        authMethod: 'pat',
        error: 'API rate limit exceeded',
      }

      expect(apiMetrics.success).toBe(false)
      expect(apiMetrics.statusCode).toBe(403)
      expect(apiMetrics.secondaryRateLimit).toBe(true)
      expect(apiMetrics.authMethod).toBe('pat')
      expect(apiMetrics.error).toBe('API rate limit exceeded')
    })

    test('should validate all HTTP methods', () => {
      const httpMethods: ApiMetrics['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

      httpMethods.forEach(method => {
        const metrics: ApiMetrics = {
          endpoint: '/test',
          method,
          startTime: '2025-08-27T10:30:00.000Z',
          endTime: '2025-08-27T10:30:01.000Z',
          duration: 1000,
          statusCode: 200,
          success: true,
          authMethod: 'github-app',
        }

        expect(metrics.method).toBe(method)
      })
    })

    test('should validate all auth methods', () => {
      const authMethods: ApiMetrics['authMethod'][] = ['github-app', 'pat', 'none']

      authMethods.forEach(authMethod => {
        const metrics: ApiMetrics = {
          endpoint: '/test',
          method: 'GET',
          startTime: '2025-08-27T10:30:00.000Z',
          endTime: '2025-08-27T10:30:01.000Z',
          duration: 1000,
          statusCode: 200,
          success: true,
          authMethod,
        }

        expect(metrics.authMethod).toBe(authMethod)
      })
    })
  })

  describe('FailureMetrics interface', () => {
    test('should validate permission failure', () => {
      const failureMetrics: FailureMetrics = {
        category: 'permissions',
        type: 'insufficient-permissions',
        timestamp: '2025-08-27T10:30:00.000Z',
        message: 'GitHub App lacks necessary permissions for repository access',
        component: 'api',
        recoverable: false,
        retryAttempts: 0,
      }

      expect(failureMetrics.category).toBe('permissions')
      expect(failureMetrics.type).toBe('insufficient-permissions')
      expect(failureMetrics.component).toBe('api')
      expect(failureMetrics.recoverable).toBe(false)
    })

    test('should validate network failure with recovery', () => {
      const failureMetrics: FailureMetrics = {
        category: 'network-issues',
        type: 'connection-timeout',
        timestamp: '2025-08-27T10:30:00.000Z',
        message: 'Connection timeout after 30 seconds',
        stackTrace: 'Error: connect ETIMEDOUT\\n    at TCPConnectWrap.afterConnect',
        component: 'docker',
        recoverable: true,
        retryAttempts: 3,
        context: {
          timeout: 30000,
          endpoint: 'registry-1.docker.io',
        },
      }

      expect(failureMetrics.category).toBe('network-issues')
      expect(failureMetrics.recoverable).toBe(true)
      expect(failureMetrics.retryAttempts).toBe(3)
      expect(failureMetrics.context).toEqual({
        timeout: 30000,
        endpoint: 'registry-1.docker.io',
      })
    })

    test('should validate all failure categories', () => {
      const categories: FailureCategory[] = [
        'permissions',
        'authentication',
        'cache-corruption',
        'network-issues',
        'configuration-error',
        'docker-issues',
        'api-limits',
        'timeout',
        'unknown',
      ]

      categories.forEach(category => {
        const metrics: FailureMetrics = {
          category,
          type: 'test-failure',
          timestamp: '2025-08-27T10:30:00.000Z',
          message: 'Test failure message',
          component: 'action',
          recoverable: false,
        }

        expect(metrics.category).toBe(category)
      })
    })

    test('should validate all component types', () => {
      const components: FailureMetrics['component'][] = ['cache', 'docker', 'api', 'config', 'action', 'renovate']

      components.forEach(component => {
        const metrics: FailureMetrics = {
          category: 'unknown',
          type: 'test-failure',
          timestamp: '2025-08-27T10:30:00.000Z',
          message: 'Test failure message',
          component,
          recoverable: false,
        }

        expect(metrics.component).toBe(component)
      })
    })
  })

  describe('ActionMetrics interface', () => {
    test('should validate successful action execution', () => {
      const actionMetrics: ActionMetrics = {
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:45:00.000Z',
        duration: 900000,
        success: true,
        renovateVersion: '38.120.0',
        actionVersion: 'v1.2.3',
        repositoriesProcessed: 1,
        pullRequestsCreated: 5,
        dependenciesUpdated: 23,
        exitCode: 0,
      }

      expect(actionMetrics.duration).toBe(900000)
      expect(actionMetrics.success).toBe(true)
      expect(actionMetrics.renovateVersion).toBe('38.120.0')
      expect(actionMetrics.exitCode).toBe(0)
      expect(actionMetrics.pullRequestsCreated).toBe(5)
    })

    test('should validate failed action execution', () => {
      const actionMetrics: ActionMetrics = {
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:35:00.000Z',
        duration: 300000,
        success: false,
        renovateVersion: '38.120.0',
        actionVersion: 'v1.2.3',
        exitCode: 1,
        error: 'Authentication failed',
      }

      expect(actionMetrics.success).toBe(false)
      expect(actionMetrics.exitCode).toBe(1)
      expect(actionMetrics.error).toBe('Authentication failed')
    })
  })

  describe('AnalyticsEvent interface', () => {
    test('should validate complete analytics event', () => {
      const analyticsEvent: AnalyticsEvent = {
        id: 'event-123-abc',
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
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
      }

      expect(analyticsEvent.id).toBe('event-123-abc')
      expect(analyticsEvent.schemaVersion).toBe(ANALYTICS_SCHEMA_VERSION)
      expect(analyticsEvent.cache).toEqual([])
      expect(analyticsEvent.docker).toEqual([])
      expect(analyticsEvent.api).toEqual([])
      expect(analyticsEvent.failures).toEqual([])
    })
  })

  describe('AggregatedAnalytics interface', () => {
    test('should validate aggregated analytics data', () => {
      const aggregatedAnalytics: AggregatedAnalytics = {
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
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
      }

      expect(aggregatedAnalytics.eventCount).toBe(150)
      expect(aggregatedAnalytics.repositoryCount).toBe(25)
      expect(aggregatedAnalytics.cacheHitRate).toBe(85.6)
      expect(aggregatedAnalytics.actionSuccessRate).toBe(94.7)
      expect(aggregatedAnalytics.failuresByCategory.permissions).toBe(2)
      expect(aggregatedAnalytics.failuresByCategory['network-issues']).toBe(5)
    })
  })

  describe('AnalyticsConfig interface and defaults', () => {
    test('should validate default analytics configuration', () => {
      expect(DEFAULT_ANALYTICS_CONFIG.enabled).toBe(false)
      expect(DEFAULT_ANALYTICS_CONFIG.logLevel).toBe('info')
      expect(DEFAULT_ANALYTICS_CONFIG.collectCache).toBe(true)
      expect(DEFAULT_ANALYTICS_CONFIG.collectDocker).toBe(true)
      expect(DEFAULT_ANALYTICS_CONFIG.collectApi).toBe(true)
      expect(DEFAULT_ANALYTICS_CONFIG.collectFailures).toBe(true)
      expect(DEFAULT_ANALYTICS_CONFIG.sampleRate).toBe(1)
      expect(DEFAULT_ANALYTICS_CONFIG.cacheKeyPrefix).toBe('renovate-analytics')
      expect(DEFAULT_ANALYTICS_CONFIG.maxDataSize).toBe(10 * 1024 * 1024)
      expect(DEFAULT_ANALYTICS_CONFIG.retentionDays).toBe(7)
      expect(DEFAULT_ANALYTICS_CONFIG.sanitizePatterns).toContain('token')
      expect(DEFAULT_ANALYTICS_CONFIG.sanitizePatterns).toContain('password')
      expect(DEFAULT_ANALYTICS_CONFIG.sanitizePatterns).toContain('secret')
    })

    test('should allow custom analytics configuration', () => {
      const customConfig: AnalyticsConfig = {
        enabled: true,
        logLevel: 'debug',
        collectCache: true,
        collectDocker: false,
        collectApi: true,
        collectFailures: true,
        sampleRate: 0.5,
        cacheKeyPrefix: 'custom-analytics',
        maxDataSize: 5 * 1024 * 1024,
        retentionDays: 14,
        sanitizePatterns: ['token', 'key', 'auth'],
      }

      expect(customConfig.enabled).toBe(true)
      expect(customConfig.logLevel).toBe('debug')
      expect(customConfig.collectDocker).toBe(false)
      expect(customConfig.sampleRate).toBe(0.5)
      expect(customConfig.cacheKeyPrefix).toBe('custom-analytics')
      expect(customConfig.retentionDays).toBe(14)
    })

    test('should validate log level types', () => {
      const logLevels: AnalyticsConfig['logLevel'][] = ['debug', 'info', 'warn', 'error']

      logLevels.forEach(logLevel => {
        const config: AnalyticsConfig = {
          ...DEFAULT_ANALYTICS_CONFIG,
          logLevel,
        }

        expect(config.logLevel).toBe(logLevel)
      })
    })
  })

  describe('Schema Version', () => {
    test('should have consistent schema version', () => {
      expect(ANALYTICS_SCHEMA_VERSION).toBe('1.0.0')
      expect(typeof ANALYTICS_SCHEMA_VERSION).toBe('string')
      expect(ANALYTICS_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('Edge Cases and Type Safety', () => {
    test('should handle empty arrays in analytics event', () => {
      const event: AnalyticsEvent = {
        id: 'test',
        timestamp: '2025-08-27T10:30:00.000Z',
        repository: {
          owner: 'test',
          repo: 'test',
          fullName: 'test/test',
          id: 1,
          visibility: 'public',
        },
        workflow: {
          runId: '1',
          runNumber: 1,
          workflowName: 'test',
          eventName: 'push',
          ref: 'refs/heads/main',
          sha: 'abc123',
          actor: 'test',
        },
        cache: [],
        docker: [],
        api: [],
        failures: [],
        action: {
          startTime: '2025-08-27T10:30:00.000Z',
          endTime: '2025-08-27T10:30:01.000Z',
          duration: 1000,
          success: true,
          renovateVersion: '1.0.0',
          actionVersion: '1.0.0',
          exitCode: 0,
        },
        schemaVersion: '1.0.0',
      }

      expect(event.cache).toHaveLength(0)
      expect(event.docker).toHaveLength(0)
      expect(event.api).toHaveLength(0)
      expect(event.failures).toHaveLength(0)
    })

    test('should handle large numbers in metrics', () => {
      const metrics: CacheMetrics = {
        operation: 'restore',
        key: 'test',
        version: 'v1',
        startTime: '2025-08-27T10:30:00.000Z',
        endTime: '2025-08-27T10:30:01.000Z',
        duration: Number.MAX_SAFE_INTEGER,
        success: true,
        size: Number.MAX_SAFE_INTEGER,
      }

      expect(metrics.duration).toBe(Number.MAX_SAFE_INTEGER)
      expect(metrics.size).toBe(Number.MAX_SAFE_INTEGER)
    })

    test('should handle unicode characters in strings', () => {
      const repo: RepositoryInfo = {
        owner: 'test-üñïçødé',
        repo: 'test-🚀',
        fullName: 'test-üñïçødé/test-🚀',
        id: 1,
        visibility: 'public',
        language: 'TypeScript',
      }

      expect(repo.owner).toBe('test-üñïçødé')
      expect(repo.repo).toBe('test-🚀')
      expect(repo.language).toBe('TypeScript')
    })
  })
})

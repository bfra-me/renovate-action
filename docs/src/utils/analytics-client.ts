/**
 * Analytics data client for fetching data from GitHub Actions Cache API.
 * Provides typed interfaces for accessing analytics data in the Astro dashboard.
 */

// For now, we'll define the interfaces locally since the analytics package isn't accessible from here
// In a real implementation, these would be imported from the analytics package

export type Timestamp = string

export interface RepositoryInfo {
  readonly owner: string
  readonly repo: string
  readonly fullName: string
  readonly id: number
  readonly size?: number
  readonly language?: string
  readonly visibility: 'public' | 'private'
}

export interface CacheMetrics {
  readonly operation: 'restore' | 'save' | 'prepare' | 'finalize'
  readonly key: string
  readonly version: string
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly duration: number
  readonly success: boolean
  readonly hit?: boolean
  readonly size?: number
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

export interface DockerMetrics {
  readonly operation: 'pull' | 'run' | 'exec' | 'tool-install'
  readonly image?: string
  readonly containerId?: string
  readonly tool?: string
  readonly toolVersion?: string
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly duration: number
  readonly success: boolean
  readonly exitCode?: number
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

export interface ApiMetrics {
  readonly endpoint: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly duration: number
  readonly statusCode: number
  readonly success: boolean
  readonly rateLimitRemaining?: number
  readonly rateLimitReset?: Timestamp
  readonly secondaryRateLimit?: boolean
  readonly authMethod: 'github-app' | 'pat' | 'none'
  readonly error?: string
  readonly responseSize?: number
}

export type FailureCategory =
  | 'permissions'
  | 'authentication'
  | 'cache-corruption'
  | 'network-issues'
  | 'configuration-error'
  | 'docker-issues'
  | 'api-limits'
  | 'timeout'
  | 'unknown'

export interface FailureMetrics {
  readonly category: FailureCategory
  readonly type: string
  readonly timestamp: Timestamp
  readonly message: string
  readonly stackTrace?: string
  readonly component: 'cache' | 'docker' | 'api' | 'config' | 'action' | 'renovate'
  readonly recoverable: boolean
  readonly retryAttempts?: number
  readonly context?: Record<string, unknown>
}

export interface ActionMetrics {
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly duration: number
  readonly success: boolean
  readonly renovateVersion: string
  readonly actionVersion: string
  readonly repositoriesProcessed?: number
  readonly pullRequestsCreated?: number
  readonly dependenciesUpdated?: number
}

export interface WorkflowContext {
  readonly runId: string
  readonly runNumber: number
  readonly workflowName: string
  readonly eventName: string
  readonly ref: string
  readonly sha: string
  readonly actor: string
}

export interface AnalyticsEvent {
  readonly id: string
  readonly timestamp: Timestamp
  readonly repository: RepositoryInfo
  readonly workflow: WorkflowContext
  readonly type: string
  readonly data: unknown
}

export interface AggregatedAnalytics {
  readonly repository: RepositoryInfo
  readonly timeRange: {
    readonly startTime: Timestamp
    readonly endTime: Timestamp
  }
  readonly cache: {
    readonly totalOperations: number
    readonly hitRate: number
    readonly missRate: number
    readonly averageRestoreTime: number
    readonly averageSaveTime: number
    readonly totalSizeBytes: number
  }
  readonly docker: {
    readonly totalOperations: number
    readonly averagePullTime: number
    readonly averageRunTime: number
    readonly toolInstallations: number
    readonly averageToolInstallTime: number
  }
  readonly api: {
    readonly totalRequests: number
    readonly averageResponseTime: number
    readonly rateLimitHits: number
    readonly authenticationMethods: Record<string, number>
  }
  readonly failures: {
    readonly totalFailures: number
    readonly byCategory: Record<FailureCategory, number>
    readonly recoveryRate: number
  }
  readonly action: {
    readonly totalRuns: number
    readonly averageDuration: number
    readonly successRate: number
  }
}

/**
 * Cache key structure for client-side data fetching.
 */
export interface CacheKey {
  readonly prefix: string
  readonly repository: string
  readonly type: 'events' | 'aggregated' | 'config'
  readonly version: string
  readonly timestamp?: string
}

/**
 * Client configuration for analytics data fetching.
 */
export interface AnalyticsClientConfig {
  /** GitHub API token for authentication */
  readonly token: string
  /** Repository owner for cache access */
  readonly owner: string
  /** Repository name for cache access */
  readonly repo: string
  /** Base URL for GitHub API */
  readonly apiBaseUrl?: string
  /** Cache key prefix */
  readonly keyPrefix?: string
}

/**
 * Error thrown when analytics data cannot be fetched.
 */
export class AnalyticsDataError extends Error {
  readonly cause?: unknown
  readonly statusCode?: number

  constructor(message: string, cause?: unknown, statusCode?: number) {
    super(message)
    this.name = 'AnalyticsDataError'
    this.cause = cause
    this.statusCode = statusCode
  }
}

/**
 * Client for fetching analytics data from GitHub Actions Cache API.
 */
export class AnalyticsClient {
  private readonly config: AnalyticsClientConfig
  private readonly baseUrl: string

  constructor(config: AnalyticsClientConfig) {
    this.config = {
      apiBaseUrl: 'https://api.github.com',
      keyPrefix: 'analytics-v1',
      ...config,
    }
    this.baseUrl = `${this.config.apiBaseUrl}/repos/${this.config.owner}/${this.config.repo}/actions/caches`
  }

  /**
   * Generate a cache key for data fetching.
   */
  private generateKey(repository: string, type: 'events' | 'aggregated' | 'config', timestamp?: string): string {
    const parts = [this.config.keyPrefix, repository, type, 'v1']
    if (timestamp !== undefined && timestamp.length > 0) {
      parts.push(timestamp)
    }
    return parts.join('-')
  }

  /**
   * Fetch data from GitHub Actions Cache API.
   */
  private async fetchCacheData(key: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      if (!response.ok) {
        throw new AnalyticsDataError(`Failed to fetch cache data: ${response.statusText}`, undefined, response.status)
      }

      const cacheList = (await response.json()) as {
        actions_caches: {
          key: string
          size_in_bytes: number
          last_accessed_at: string
        }[]
      }

      // Find the cache entry matching our key
      const cacheEntry = cacheList.actions_caches.find(cache => cache.key.includes(key))
      if (!cacheEntry) {
        throw new AnalyticsDataError(`No cache data found for key: ${key}`)
      }

      // Note: GitHub Actions Cache API doesn't provide direct content access
      // In a real implementation, we would need to use the cache download endpoint
      // For now, we'll return mock data structure
      return {
        key: cacheEntry.key,
        size: cacheEntry.size_in_bytes,
        lastAccessed: cacheEntry.last_accessed_at,
      }
    } catch (error) {
      if (error instanceof AnalyticsDataError) {
        throw error
      }
      throw new AnalyticsDataError('Failed to fetch analytics data', error)
    }
  }

  /**
   * Fetch aggregated analytics data for a repository.
   */
  async getAggregatedData(repository: string): Promise<AggregatedAnalytics | null> {
    try {
      const key = this.generateKey(repository, 'aggregated')
      await this.fetchCacheData(key)

      // In a real implementation, this would deserialize the actual cache content
      // For now, return mock aggregated data structure
      return {
        repository: {
          owner: this.config.owner,
          repo: repository,
          fullName: `${this.config.owner}/${repository}`,
          id: Math.floor(Math.random() * 1000000),
          visibility: 'public',
        },
        timeRange: {
          startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          endTime: new Date().toISOString(),
        },
        cache: {
          totalOperations: Math.floor(Math.random() * 100) + 50,
          hitRate: Math.random() * 0.4 + 0.6, // 60-100%
          missRate: Math.random() * 0.4, // 0-40%
          averageRestoreTime: Math.random() * 2000 + 1000, // 1-3s
          averageSaveTime: Math.random() * 5000 + 2000, // 2-7s
          totalSizeBytes: Math.floor(Math.random() * 1000000000) + 100000000, // 100MB-1GB
        },
        docker: {
          totalOperations: Math.floor(Math.random() * 50) + 20,
          averagePullTime: Math.random() * 30000 + 10000, // 10-40s
          averageRunTime: Math.random() * 60000 + 30000, // 30-90s
          toolInstallations: Math.floor(Math.random() * 20) + 5,
          averageToolInstallTime: Math.random() * 10000 + 5000, // 5-15s
        },
        api: {
          totalRequests: Math.floor(Math.random() * 200) + 100,
          averageResponseTime: Math.random() * 1000 + 500, // 0.5-1.5s
          rateLimitHits: Math.floor(Math.random() * 5),
          authenticationMethods: {
            'github-app': Math.floor(Math.random() * 150) + 80,
            pat: Math.floor(Math.random() * 20),
            none: Math.floor(Math.random() * 10),
          },
        },
        failures: {
          totalFailures: Math.floor(Math.random() * 10) + 1,
          byCategory: {
            'cache-corruption': Math.floor(Math.random() * 3),
            'network-issues': Math.floor(Math.random() * 2),
            permissions: Math.floor(Math.random() * 2),
            authentication: Math.floor(Math.random() * 1),
            'configuration-error': Math.floor(Math.random() * 2),
            'docker-issues': Math.floor(Math.random() * 1),
            'api-limits': Math.floor(Math.random() * 1),
            timeout: Math.floor(Math.random() * 1),
            unknown: Math.floor(Math.random() * 1),
          },
          recoveryRate: Math.random() * 0.3 + 0.7, // 70-100%
        },
        action: {
          totalRuns: Math.floor(Math.random() * 30) + 10,
          averageDuration: Math.random() * 300000 + 120000, // 2-7 minutes
          successRate: Math.random() * 0.2 + 0.8, // 80-100%
        },
      } as AggregatedAnalytics
    } catch (error) {
      console.error('Failed to fetch aggregated analytics data:', error)
      return null
    }
  }

  /**
   * Fetch recent analytics events for a repository.
   */
  async getRecentEvents(repository: string, limit = 50): Promise<AnalyticsEvent[]> {
    try {
      const key = this.generateKey(repository, 'events')
      await this.fetchCacheData(key)

      // Return mock events for demonstration
      const events: AnalyticsEvent[] = []
      const now = Date.now()

      for (let i = 0; i < limit; i++) {
        const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString() // Each event 1 hour apart

        // Generate random event types
        const eventTypes = ['cache', 'docker', 'api', 'failure', 'action'] as const
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

        events.push({
          id: `event-${i}`,
          timestamp,
          repository: {
            owner: this.config.owner,
            repo: repository,
            fullName: `${this.config.owner}/${repository}`,
            id: Math.floor(Math.random() * 1000000),
            visibility: 'public',
          },
          workflow: {
            runId: `${Math.floor(Math.random() * 1000000)}`,
            runNumber: Math.floor(Math.random() * 100) + 1,
            workflowName: 'Renovate',
            eventName: 'schedule',
            ref: 'refs/heads/main',
            sha: Math.random().toString(36).slice(2, 15),
            actor: 'renovate[bot]',
          },
          type: eventType,
          data: this.generateMockEventData(eventType),
        })
      }

      return events
    } catch (error) {
      console.error('Failed to fetch recent analytics events:', error)
      return []
    }
  }

  /**
   * Generate mock event data based on event type.
   */
  private generateMockEventData(type: string): unknown {
    const now = Date.now()
    const startTime = new Date(now - Math.random() * 60000).toISOString()
    const endTime = new Date(now).toISOString()

    switch (type) {
      case 'cache':
        return {
          operation: ['restore', 'save'][Math.floor(Math.random() * 2)],
          key: `renovate-cache-v${Math.floor(Math.random() * 10)}`,
          version: 'v1',
          startTime,
          endTime,
          duration: Math.random() * 5000 + 1000,
          success: Math.random() > 0.1,
          hit: Math.random() > 0.3,
          size: Math.floor(Math.random() * 100000000),
        } as CacheMetrics

      case 'docker':
        return {
          operation: ['pull', 'run', 'tool-install'][Math.floor(Math.random() * 3)],
          image: 'renovatebot/renovate:latest',
          tool: ['node', 'pnpm', 'git'][Math.floor(Math.random() * 3)],
          startTime,
          endTime,
          duration: Math.random() * 30000 + 10000,
          success: Math.random() > 0.05,
        } as DockerMetrics

      case 'api':
        return {
          endpoint: '/repos/{owner}/{repo}/contents',
          method: 'GET',
          startTime,
          endTime,
          duration: Math.random() * 2000 + 500,
          statusCode: [200, 201, 304, 404, 429][Math.floor(Math.random() * 5)],
          success: Math.random() > 0.1,
          rateLimitRemaining: Math.floor(Math.random() * 5000),
          authMethod: 'github-app',
        } as ApiMetrics

      case 'failure':
        return {
          category: ['cache-corruption', 'network-issues', 'permissions'][Math.floor(Math.random() * 3)],
          type: 'operation-failed',
          timestamp: startTime,
          message: 'Operation failed due to network timeout',
          component: ['cache', 'docker', 'api'][Math.floor(Math.random() * 3)],
          recoverable: Math.random() > 0.3,
        } as FailureMetrics

      default:
        return {
          startTime,
          endTime,
          duration: Math.random() * 300000 + 120000,
          success: Math.random() > 0.1,
          renovateVersion: '37.440.7',
          actionVersion: 'v1.2.3',
        } as ActionMetrics
    }
  }

  /**
   * List available repositories with analytics data.
   */
  async listRepositories(): Promise<string[]> {
    try {
      // In a real implementation, this would scan cache keys to find repositories
      // For now, return mock repository list
      return ['renovate-action', 'typescript-action', 'astro-starlight-docs', 'github-workflows', 'eslint-config']
    } catch (error) {
      console.error('Failed to list repositories:', error)
      return []
    }
  }
}

/**
 * Default analytics client instance for server-side rendering.
 * Uses environment variables for configuration.
 */
export function createAnalyticsClient(): AnalyticsClient | null {
  // In a real implementation, these would come from environment variables
  // For now, we'll return a mock client for development
  const config: AnalyticsClientConfig = {
    token: 'mock-token',
    owner: 'bfra-me',
    repo: 'renovate-action',
  }

  return new AnalyticsClient(config)
}

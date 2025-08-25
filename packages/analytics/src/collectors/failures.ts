/**
 * Failure metrics collector for error analysis and troubleshooting.
 */

import type {AnalyticsConfig, FailureCategory, FailureMetrics} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {BaseMetricCollector, type CollectionContext} from './base.js'

/**
 * Failure tracking data.
 */
export interface FailureEvent {
  readonly category: FailureCategory
  readonly type: string
  readonly timestamp: string
  readonly message: string
  readonly stackTrace?: string
  readonly component: 'cache' | 'docker' | 'api' | 'config' | 'action' | 'renovate'
  readonly recoverable: boolean
  readonly retryAttempts?: number
  readonly context?: Record<string, unknown>
}

/**
 * In-memory storage for tracking failures.
 */
class FailureStore {
  private static instance: FailureStore | undefined
  private readonly failures: Map<string, FailureEvent> = new Map()

  static getInstance(): FailureStore {
    if (!FailureStore.instance) {
      FailureStore.instance = new FailureStore()
    }
    return FailureStore.instance
  }

  addFailure(id: string, failure: FailureEvent): void {
    this.failures.set(id, failure)
  }

  getFailure(id: string): FailureEvent | undefined {
    return this.failures.get(id)
  }

  getAllFailures(): FailureEvent[] {
    return Array.from(this.failures.values())
  }

  clear(): void {
    this.failures.clear()
  }

  getFailuresByCategory(category: FailureCategory): FailureEvent[] {
    return Array.from(this.failures.values()).filter(failure => failure.category === category)
  }

  getFailuresByComponent(component: FailureEvent['component']): FailureEvent[] {
    return Array.from(this.failures.values()).filter(failure => failure.component === component)
  }
}

/**
 * Predefined failure patterns for common scenarios.
 */
const FAILURE_PATTERNS = {
  DOCKER_PERMISSION: {
    category: 'docker-issues' as FailureCategory,
    type: 'permission-denied',
    patterns: [
      /permission denied.*docker/i,
      /docker.*permission/i,
      /cannot access docker/i,
      /docker daemon.*permission/i,
    ],
  },
  DOCKER_USER_MISMATCH: {
    category: 'docker-issues' as FailureCategory,
    type: 'user-mismatch',
    patterns: [
      /chown.*operation not permitted/i,
      /user.*does not exist/i,
      /uid.*not found/i,
      /operation not permitted.*chown/i,
    ],
  },
  GITHUB_TOKEN_AUTH: {
    category: 'authentication' as FailureCategory,
    type: 'token-auth-failed',
    patterns: [/bad credentials/i, /authentication.*failed/i, /invalid.*token/i, /unauthorized.*401/i],
  },
  GITHUB_TOKEN_PERMISSION: {
    category: 'permissions' as FailureCategory,
    type: 'insufficient-permissions',
    patterns: [/forbidden.*403/i, /insufficient.*permission/i, /access.*denied/i, /not.*authorized/i],
  },
  CACHE_CORRUPTION: {
    category: 'cache-corruption' as FailureCategory,
    type: 'invalid-cache-data',
    patterns: [/cache.*corrupt/i, /invalid.*cache/i, /cache.*version.*mismatch/i, /failed.*parse.*cache/i],
  },
  NETWORK_TIMEOUT: {
    category: 'network-issues' as FailureCategory,
    type: 'request-timeout',
    patterns: [/timeout/i, /connection.*timed out/i, /request.*timeout/i, /network.*timeout/i],
  },
  NETWORK_CONNECTION: {
    category: 'network-issues' as FailureCategory,
    type: 'connection-failed',
    patterns: [/connection.*refused/i, /network.*unreachable/i, /dns.*resolution.*failed/i, /could not resolve/i],
  },
  API_RATE_LIMIT: {
    category: 'api-limits' as FailureCategory,
    type: 'rate-limit-exceeded',
    patterns: [/rate.*limit.*exceeded/i, /api.*rate.*limit/i, /secondary.*rate.*limit/i, /too.*many.*requests/i],
  },
  TOOL_INSTALL_FAILURE: {
    category: 'docker-issues' as FailureCategory,
    type: 'tool-installation-failed',
    patterns: [/failed.*install.*tool/i, /tool.*installation.*error/i, /cannot.*install/i, /installation.*failed/i],
  },
  CONFIG_VALIDATION: {
    category: 'configuration-error' as FailureCategory,
    type: 'invalid-configuration',
    patterns: [/invalid.*config/i, /configuration.*error/i, /config.*validation.*failed/i, /malformed.*config/i],
  },
} as const

/**
 * Collector for failure metrics.
 */
export class FailureMetricsCollector extends BaseMetricCollector<FailureMetrics> {
  private readonly store = FailureStore.getInstance()

  constructor(config: AnalyticsConfig, logger?: AnalyticsLogger) {
    super(config, logger ?? new AnalyticsLogger({component: 'FailureMetricsCollector'}))
  }

  async collect(_context: CollectionContext): Promise<FailureMetrics[]> {
    if (!this.isEnabled() || !this.shouldSample()) {
      return []
    }

    const failures = this.store.getAllFailures()
    this.logger.debug(`Collecting ${failures.length} failures`)

    const metrics: FailureMetrics[] = []

    for (const failure of failures) {
      try {
        const metric: FailureMetrics = this.sanitize({
          category: failure.category,
          type: failure.type,
          timestamp: failure.timestamp,
          message: failure.message,
          stackTrace: failure.stackTrace,
          component: failure.component,
          recoverable: failure.recoverable,
          retryAttempts: failure.retryAttempts,
          context: failure.context,
        })

        metrics.push(metric)
      } catch (error) {
        this.logger.warn('Failed to process failure metric', {
          category: failure.category,
          type: failure.type,
          component: failure.component,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                }
              : {name: 'Unknown', message: String(error)},
        })
      }
    }

    this.logger.info(`Collected ${metrics.length} failure metrics`)
    return metrics
  }

  /**
   * Record a failure with automatic pattern detection.
   */
  static recordFailure(
    message: string,
    component: FailureEvent['component'],
    recoverable = false,
    retryAttempts?: number,
    stackTrace?: string,
    context?: Record<string, unknown>,
  ): void {
    const store = FailureStore.getInstance()
    const timestamp = new Date().toISOString()
    const id = `${component}-${Date.now()}`

    // Detect failure category and type from message patterns
    const detection = this.detectFailurePattern(message)

    store.addFailure(id, {
      category: detection.category,
      type: detection.type,
      timestamp,
      message,
      stackTrace,
      component,
      recoverable,
      retryAttempts,
      context,
    })
  }

  /**
   * Record a specific failure with known category and type.
   */
  static recordSpecificFailure(
    category: FailureCategory,
    type: string,
    message: string,
    component: FailureEvent['component'],
    recoverable = false,
    retryAttempts?: number,
    stackTrace?: string,
    context?: Record<string, unknown>,
  ): void {
    const store = FailureStore.getInstance()
    const timestamp = new Date().toISOString()
    const id = `${component}-${Date.now()}`

    store.addFailure(id, {
      category,
      type,
      timestamp,
      message,
      stackTrace,
      component,
      recoverable,
      retryAttempts,
      context,
    })
  }

  /**
   * Detect failure category and type from error message patterns.
   */
  private static detectFailurePattern(message: string): {category: FailureCategory; type: string} {
    for (const pattern of Object.values(FAILURE_PATTERNS)) {
      if (pattern.patterns.some(regex => regex.test(message))) {
        return {
          category: pattern.category,
          type: pattern.type,
        }
      }
    }

    // Default to unknown category if no pattern matches
    return {
      category: 'unknown',
      type: 'unclassified-error',
    }
  }

  /**
   * Record Docker permission failures.
   */
  static recordDockerPermissionFailure(
    message: string,
    operation: string,
    recoverable = true,
    context?: Record<string, unknown>,
  ): void {
    this.recordSpecificFailure(
      'docker-issues',
      'permission-denied',
      message,
      'docker',
      recoverable,
      undefined,
      undefined,
      {
        ...context,
        operation,
        troubleshootingGuide: 'Check Docker daemon permissions and user group membership',
      },
    )
  }

  /**
   * Record GitHub API authentication failures.
   */
  static recordAuthFailure(
    message: string,
    endpoint: string,
    authMethod: 'github-app' | 'pat',
    recoverable = false,
    context?: Record<string, unknown>,
  ): void {
    this.recordSpecificFailure(
      'authentication',
      'token-auth-failed',
      message,
      'api',
      recoverable,
      undefined,
      undefined,
      {
        ...context,
        endpoint,
        authMethod,
        troubleshootingGuide: 'Verify GitHub App credentials and installation permissions',
      },
    )
  }

  /**
   * Record cache corruption failures.
   */
  static recordCacheCorruptionFailure(
    message: string,
    cacheKey: string,
    operation: string,
    recoverable = true,
    context?: Record<string, unknown>,
  ): void {
    this.recordSpecificFailure(
      'cache-corruption',
      'invalid-cache-data',
      message,
      'cache',
      recoverable,
      undefined,
      undefined,
      {
        ...context,
        cacheKey,
        operation,
        troubleshootingGuide: 'Clear corrupted cache and restart with fresh cache',
      },
    )
  }

  /**
   * Record network connectivity failures.
   */
  static recordNetworkFailure(
    message: string,
    endpoint: string,
    recoverable = true,
    retryAttempts?: number,
    context?: Record<string, unknown>,
  ): void {
    const category: FailureCategory = message.toLowerCase().includes('timeout') ? 'timeout' : 'network-issues'
    const type = message.toLowerCase().includes('timeout') ? 'request-timeout' : 'connection-failed'

    this.recordSpecificFailure(category, type, message, 'api', recoverable, retryAttempts, undefined, {
      ...context,
      endpoint,
      troubleshootingGuide: 'Check network connectivity and firewall settings',
    })
  }

  /**
   * Get failure count by category.
   */
  static getFailureCountByCategory(): Record<FailureCategory, number> {
    const store = FailureStore.getInstance()
    const failures = store.getAllFailures()

    const counts: Record<FailureCategory, number> = {
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
      counts[failure.category] = (counts[failure.category] || 0) + 1
    }

    return counts
  }

  /**
   * Clear all stored failures.
   */
  static clearFailures(): void {
    const store = FailureStore.getInstance()
    store.clear()
  }
}

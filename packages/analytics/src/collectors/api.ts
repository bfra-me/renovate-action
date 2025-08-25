/**
 * API metrics collector for GitHub API usage tracking and rate limiting analysis.
 */

import type {AnalyticsConfig, ApiMetrics} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {BaseMetricCollector, type CollectionContext} from './base.js'

/**
 * API request tracking data.
 */
export interface ApiRequest {
  readonly endpoint: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly startTime: string
  readonly statusCode?: number
  readonly success?: boolean
  readonly rateLimitRemaining?: number
  readonly rateLimitReset?: string
  readonly secondaryRateLimit?: boolean
  readonly authMethod: 'github-app' | 'pat' | 'none'
  readonly error?: string
  readonly responseSize?: number
  readonly metadata?: Record<string, unknown>
}

/**
 * In-memory storage for tracking API requests.
 */
class ApiRequestStore {
  private static instance: ApiRequestStore | undefined
  private readonly requests: Map<string, ApiRequest> = new Map()

  static getInstance(): ApiRequestStore {
    if (!ApiRequestStore.instance) {
      ApiRequestStore.instance = new ApiRequestStore()
    }
    return ApiRequestStore.instance
  }

  addRequest(id: string, request: ApiRequest): void {
    this.requests.set(id, request)
  }

  getRequest(id: string): ApiRequest | undefined {
    return this.requests.get(id)
  }

  getAllRequests(): ApiRequest[] {
    return Array.from(this.requests.values())
  }

  updateRequest(id: string, updates: Partial<ApiRequest>): void {
    const existing = this.requests.get(id)
    if (existing) {
      this.requests.set(id, {...existing, ...updates})
    }
  }

  clear(): void {
    this.requests.clear()
  }

  getRequestsByEndpoint(endpoint: string): ApiRequest[] {
    return Array.from(this.requests.values()).filter(req => req.endpoint.includes(endpoint))
  }

  getRequestsByMethod(method: ApiRequest['method']): ApiRequest[] {
    return Array.from(this.requests.values()).filter(req => req.method === method)
  }
}

/**
 * Collector for API usage metrics.
 */
export class ApiMetricsCollector extends BaseMetricCollector<ApiMetrics> {
  private readonly store = ApiRequestStore.getInstance()

  constructor(config: AnalyticsConfig, logger?: AnalyticsLogger) {
    super(config, logger ?? new AnalyticsLogger({component: 'ApiMetricsCollector'}))
  }

  async collect(_context: CollectionContext): Promise<ApiMetrics[]> {
    if (!this.isEnabled() || !this.shouldSample()) {
      return []
    }

    const requests = this.store.getAllRequests()
    this.logger.debug(`Collecting ${requests.length} API requests`)

    const metrics: ApiMetrics[] = []

    for (const request of requests) {
      try {
        const endTime = (request.metadata?.endTime as string) || this.createTimestamp()
        const metric: ApiMetrics = this.sanitize({
          endpoint: request.endpoint,
          method: request.method,
          startTime: request.startTime,
          endTime,
          duration: this.calculateDuration(request.startTime, endTime),
          statusCode: request.statusCode ?? 0,
          success:
            request.success ??
            (request.statusCode !== undefined && request.statusCode >= 200 && request.statusCode < 300),
          rateLimitRemaining: request.rateLimitRemaining,
          rateLimitReset: request.rateLimitReset,
          secondaryRateLimit: request.secondaryRateLimit ?? false,
          authMethod: request.authMethod,
          error: request.error,
          responseSize: request.responseSize,
        })

        metrics.push(metric)
      } catch (error) {
        this.logger.warn('Failed to process API request metric', {
          endpoint: request.endpoint,
          method: request.method,
          statusCode: request.statusCode,
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

    this.logger.info(`Collected ${metrics.length} API metrics`)
    return metrics
  }

  /**
   * Record an API request start.
   */
  static recordRequestStart(
    endpoint: string,
    method: ApiRequest['method'],
    authMethod: ApiRequest['authMethod'] = 'none',
    metadata?: Record<string, unknown>,
  ): string {
    const store = ApiRequestStore.getInstance()
    const id = `${method}-${endpoint}-${Date.now()}`
    const startTime = new Date().toISOString()

    // Sanitize endpoint to remove sensitive data
    const sanitizedEndpoint = endpoint
      .replaceAll(/\/repos\/[^/]+\/[^/]+/g, '/repos/{owner}/{repo}')
      .replaceAll(/\/orgs\/[^/]+/g, '/orgs/{org}')
      .replaceAll(/\/users\/[^/]+/g, '/users/{username}')
      .replaceAll(/access_token=[^&]+/g, 'access_token=***')
      .replaceAll(/token=[^&]+/g, 'token=***')

    store.addRequest(id, {
      endpoint: sanitizedEndpoint,
      method,
      startTime,
      authMethod,
      metadata,
    })

    return id
  }

  /**
   * Record an API request completion.
   */
  static recordRequestEnd(
    id: string,
    statusCode: number,
    rateLimitRemaining?: number,
    rateLimitReset?: string,
    secondaryRateLimit?: boolean,
    error?: string,
    responseSize?: number,
    metadata?: Record<string, unknown>,
  ): void {
    const store = ApiRequestStore.getInstance()
    const endTime = new Date().toISOString()
    const success = statusCode >= 200 && statusCode < 300

    store.updateRequest(id, {
      statusCode,
      success,
      rateLimitRemaining,
      rateLimitReset,
      secondaryRateLimit,
      error,
      responseSize,
      metadata: {
        ...store.getRequest(id)?.metadata,
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Record a complete API request (start and end).
   */
  static recordRequest(
    endpoint: string,
    method: ApiRequest['method'],
    statusCode: number,
    authMethod: ApiRequest['authMethod'] = 'none',
    rateLimitRemaining?: number,
    rateLimitReset?: string,
    secondaryRateLimit?: boolean,
    error?: string,
    responseSize?: number,
    duration?: number,
    metadata?: Record<string, unknown>,
  ): void {
    const store = ApiRequestStore.getInstance()
    const endTime = new Date().toISOString()
    const startTime =
      typeof duration === 'number' && duration > 0 ? new Date(Date.now() - duration).toISOString() : endTime

    const id = `${method}-${endpoint}-${Date.now()}`
    const success = statusCode >= 200 && statusCode < 300

    // Sanitize endpoint to remove sensitive data
    const sanitizedEndpoint = endpoint
      .replaceAll(/\/repos\/[^/]+\/[^/]+/g, '/repos/{owner}/{repo}')
      .replaceAll(/\/orgs\/[^/]+/g, '/orgs/{org}')
      .replaceAll(/\/users\/[^/]+/g, '/users/{username}')
      .replaceAll(/access_token=[^&]+/g, 'access_token=***')
      .replaceAll(/token=[^&]+/g, 'token=***')

    store.addRequest(id, {
      endpoint: sanitizedEndpoint,
      method,
      startTime,
      statusCode,
      success,
      rateLimitRemaining,
      rateLimitReset,
      secondaryRateLimit,
      authMethod,
      error,
      responseSize,
      metadata: {
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Record GitHub App token generation.
   */
  static recordTokenGeneration(
    appId: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.recordRequest(
      `/app/installations/{installation_id}/access_tokens`,
      'POST',
      success ? 201 : 500,
      'github-app',
      undefined,
      undefined,
      false,
      error,
      undefined,
      duration,
      {
        ...metadata,
        appId: appId.replaceAll(/\d/g, 'X'), // Obfuscate app ID
        tokenType: 'installation',
      },
    )
  }

  /**
   * Record cache API operation.
   */
  static recordCacheApiOperation(
    operation: 'get' | 'save' | 'delete',
    key: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const method = operation === 'get' ? 'GET' : operation === 'delete' ? 'DELETE' : 'POST'
    const endpoint = `/repos/{owner}/{repo}/actions/caches`

    this.recordRequest(
      endpoint,
      method,
      success ? (operation === 'get' ? 200 : operation === 'delete' ? 204 : 201) : 500,
      'github-app',
      undefined,
      undefined,
      false,
      error,
      undefined,
      duration,
      {
        ...metadata,
        operation,
        cacheKey: `${key.slice(0, 20)}...`, // Truncate cache key for privacy
      },
    )
  }

  /**
   * Get API success rate by endpoint pattern.
   */
  static getSuccessRate(endpointPattern?: string): number {
    const store = ApiRequestStore.getInstance()
    const requests =
      typeof endpointPattern === 'string' && endpointPattern.length > 0
        ? store.getRequestsByEndpoint(endpointPattern)
        : store.getAllRequests()

    if (requests.length === 0) return 0

    const successful = requests.filter(req => req.success === true).length
    return Math.round((successful / requests.length) * 100)
  }

  /**
   * Get average API response time.
   */
  static getAverageResponseTime(endpointPattern?: string): number {
    const store = ApiRequestStore.getInstance()
    const requests =
      typeof endpointPattern === 'string' && endpointPattern.length > 0
        ? store.getRequestsByEndpoint(endpointPattern)
        : store.getAllRequests()

    if (requests.length === 0) return 0

    const durations = requests
      .filter(req => Boolean(req.metadata?.endTime))
      .map(req => {
        const endTime = req.metadata?.endTime as string
        if (!endTime) return 0
        return new Date(endTime).getTime() - new Date(req.startTime).getTime()
      })

    if (durations.length === 0) return 0

    const total = durations.reduce((sum, duration) => sum + duration, 0)
    return Math.round(total / durations.length)
  }

  /**
   * Clear all stored API requests.
   */
  static clearRequests(): void {
    const store = ApiRequestStore.getInstance()
    store.clear()
  }
}

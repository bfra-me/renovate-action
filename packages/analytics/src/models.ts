/**
 * Analytics data models and TypeScript interfaces for Renovate action metrics.
 * Supports cache, Docker, API, and failure tracking across repositories.
 */

/**
 * Timestamp in ISO 8601 format for consistent temporal data representation.
 */
export type Timestamp = string

/**
 * Repository identifier for analytics context.
 */
export interface RepositoryInfo {
  /** Repository owner/organization name */
  readonly owner: string
  /** Repository name */
  readonly repo: string
  /** Full repository name in owner/repo format */
  readonly fullName: string
  /** GitHub repository ID */
  readonly id: number
  /** Repository size in bytes (approximation) */
  readonly size?: number
  /** Primary programming language */
  readonly language?: string
  /** Repository visibility (public/private) */
  readonly visibility: 'public' | 'private'
}

/**
 * GitHub Actions workflow run context for analytics correlation.
 */
export interface WorkflowContext {
  /** GitHub Actions run ID */
  readonly runId: string
  /** GitHub Actions run number */
  readonly runNumber: number
  /** Workflow name */
  readonly workflowName: string
  /** Triggering event (push, pull_request, schedule, etc.) */
  readonly eventName: string
  /** Git reference (branch/tag) */
  readonly ref: string
  /** Git SHA */
  readonly sha: string
  /** Actor who triggered the workflow */
  readonly actor: string
}

/**
 * Cache operation metrics for performance analysis.
 */
export interface CacheMetrics {
  /** Cache operation type */
  readonly operation: 'restore' | 'save' | 'prepare' | 'finalize'
  /** Cache key used for the operation */
  readonly key: string
  /** Cache key version/pattern for migration tracking */
  readonly version: string
  /** Operation start timestamp */
  readonly startTime: Timestamp
  /** Operation end timestamp */
  readonly endTime: Timestamp
  /** Operation duration in milliseconds */
  readonly duration: number
  /** Whether the operation was successful */
  readonly success: boolean
  /** Cache hit/miss status (null for save operations) */
  readonly hit?: boolean
  /** Cache size in bytes */
  readonly size?: number
  /** Error message if operation failed */
  readonly error?: string
  /** Additional operation-specific metadata */
  readonly metadata?: Record<string, unknown>
}

/**
 * Docker operation metrics for container performance analysis.
 */
export interface DockerMetrics {
  /** Docker operation type */
  readonly operation: 'pull' | 'run' | 'exec' | 'tool-install'
  /** Docker image name and tag */
  readonly image?: string
  /** Container ID if applicable */
  readonly containerId?: string
  /** Tool being installed (for tool-install operations) */
  readonly tool?: string
  /** Tool version being installed */
  readonly toolVersion?: string
  /** Operation start timestamp */
  readonly startTime: Timestamp
  /** Operation end timestamp */
  readonly endTime: Timestamp
  /** Operation duration in milliseconds */
  readonly duration: number
  /** Whether the operation was successful */
  readonly success: boolean
  /** Exit code for container operations */
  readonly exitCode?: number
  /** Error message if operation failed */
  readonly error?: string
  /** Additional operation-specific metadata */
  readonly metadata?: Record<string, unknown>
}

/**
 * GitHub API usage metrics for rate limiting and performance analysis.
 */
export interface ApiMetrics {
  /** API endpoint or operation type */
  readonly endpoint: string
  /** HTTP method used */
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Request start timestamp */
  readonly startTime: Timestamp
  /** Request end timestamp */
  readonly endTime: Timestamp
  /** Request duration in milliseconds */
  readonly duration: number
  /** HTTP response status code */
  readonly statusCode: number
  /** Whether the request was successful (2xx status) */
  readonly success: boolean
  /** Rate limit remaining after request */
  readonly rateLimitRemaining?: number
  /** Rate limit reset timestamp */
  readonly rateLimitReset?: Timestamp
  /** Whether this was a secondary rate limit */
  readonly secondaryRateLimit?: boolean
  /** Authentication method used */
  readonly authMethod: 'github-app' | 'pat' | 'none'
  /** Error message if request failed */
  readonly error?: string
  /** Response size in bytes */
  readonly responseSize?: number
}

/**
 * Failure scenario categories matching troubleshooting guide.
 */
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

/**
 * Failure metrics for error analysis and troubleshooting.
 */
export interface FailureMetrics {
  /** Failure category for classification */
  readonly category: FailureCategory
  /** Specific failure type within category */
  readonly type: string
  /** Failure occurrence timestamp */
  readonly timestamp: Timestamp
  /** Error message (sanitized) */
  readonly message: string
  /** Stack trace (sanitized, optional) */
  readonly stackTrace?: string
  /** Related component that failed */
  readonly component: 'cache' | 'docker' | 'api' | 'config' | 'action' | 'renovate'
  /** Whether the failure was recoverable */
  readonly recoverable: boolean
  /** Number of retry attempts made */
  readonly retryAttempts?: number
  /** Additional failure context */
  readonly context?: Record<string, unknown>
}

/**
 * Renovate action performance metrics summary.
 */
export interface ActionMetrics {
  /** Action execution start timestamp */
  readonly startTime: Timestamp
  /** Action execution end timestamp */
  readonly endTime: Timestamp
  /** Total action duration in milliseconds */
  readonly duration: number
  /** Whether the action completed successfully */
  readonly success: boolean
  /** Renovate version used */
  readonly renovateVersion: string
  /** Action version/commit SHA */
  readonly actionVersion: string
  /** Number of repositories processed */
  readonly repositoriesProcessed?: number
  /** Number of pull requests created */
  readonly pullRequestsCreated?: number
  /** Number of dependencies updated */
  readonly dependenciesUpdated?: number
  /** Exit code of the action */
  readonly exitCode: number
  /** Final error message if action failed */
  readonly error?: string
}

/**
 * Complete analytics event containing all metric types and context.
 */
export interface AnalyticsEvent {
  /** Unique event identifier */
  readonly id: string
  /** Event timestamp */
  readonly timestamp: Timestamp
  /** Repository context */
  readonly repository: RepositoryInfo
  /** Workflow context */
  readonly workflow: WorkflowContext
  /** Cache metrics collected during execution */
  readonly cache: readonly CacheMetrics[]
  /** Docker metrics collected during execution */
  readonly docker: readonly DockerMetrics[]
  /** API metrics collected during execution */
  readonly api: readonly ApiMetrics[]
  /** Failure metrics if any failures occurred */
  readonly failures: readonly FailureMetrics[]
  /** Overall action performance metrics */
  readonly action: ActionMetrics
  /** Event schema version for compatibility */
  readonly schemaVersion: string
}

/**
 * Aggregated analytics data for multi-repository reporting.
 */
export interface AggregatedAnalytics {
  /** Aggregation period start timestamp */
  readonly periodStart: Timestamp
  /** Aggregation period end timestamp */
  readonly periodEnd: Timestamp
  /** Number of events aggregated */
  readonly eventCount: number
  /** Number of unique repositories */
  readonly repositoryCount: number
  /** Cache hit rate percentage (0-100) */
  readonly cacheHitRate: number
  /** Average cache operation duration in milliseconds */
  readonly avgCacheDuration: number
  /** Average Docker operation duration in milliseconds */
  readonly avgDockerDuration: number
  /** Average API request duration in milliseconds */
  readonly avgApiDuration: number
  /** Total number of failures by category */
  readonly failuresByCategory: Record<FailureCategory, number>
  /** Average action execution duration in milliseconds */
  readonly avgActionDuration: number
  /** Action success rate percentage (0-100) */
  readonly actionSuccessRate: number
  /** Aggregation schema version */
  readonly schemaVersion: string
}

/**
 * Analytics configuration for controlling data collection.
 */
export interface AnalyticsConfig {
  /** Whether analytics collection is enabled */
  readonly enabled: boolean
  /** Log level for analytics operations */
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** Whether to collect cache metrics */
  readonly collectCache: boolean
  /** Whether to collect Docker metrics */
  readonly collectDocker: boolean
  /** Whether to collect API metrics */
  readonly collectApi: boolean
  /** Whether to collect failure metrics */
  readonly collectFailures: boolean
  /** Sample rate for metrics collection (0-1) */
  readonly sampleRate: number
  /** Cache key prefix for analytics data storage */
  readonly cacheKeyPrefix: string
  /** Maximum size of analytics data to store (bytes) */
  readonly maxDataSize: number
  /** Data retention period in days */
  readonly retentionDays: number
  /** Sensitive data patterns to sanitize */
  readonly sanitizePatterns: readonly string[]
}

/**
 * Current schema version for analytics data structures.
 */
export const ANALYTICS_SCHEMA_VERSION = '1.0.0'

/**
 * Default analytics configuration values.
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: false,
  logLevel: 'info',
  collectCache: true,
  collectDocker: true,
  collectApi: true,
  collectFailures: true,
  sampleRate: 1,
  cacheKeyPrefix: 'renovate-analytics',
  maxDataSize: 10 * 1024 * 1024, // 10MB
  retentionDays: 7,
  sanitizePatterns: ['token', 'password', 'secret', 'key', 'auth', 'credential', 'bearer', 'private'],
} as const

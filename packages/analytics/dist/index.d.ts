/**
 * Analytics data models and TypeScript interfaces for Renovate action metrics.
 * Supports cache, Docker, API, and failure tracking across repositories.
 */
/**
 * Timestamp in ISO 8601 format for consistent temporal data representation.
 */
type Timestamp = string;
/**
 * Repository identifier for analytics context.
 */
interface RepositoryInfo {
    /** Repository owner/organization name */
    readonly owner: string;
    /** Repository name */
    readonly repo: string;
    /** Full repository name in owner/repo format */
    readonly fullName: string;
    /** GitHub repository ID */
    readonly id: number;
    /** Repository size in bytes (approximation) */
    readonly size?: number;
    /** Primary programming language */
    readonly language?: string;
    /** Repository visibility (public/private) */
    readonly visibility: 'public' | 'private';
}
/**
 * GitHub Actions workflow run context for analytics correlation.
 */
interface WorkflowContext {
    /** GitHub Actions run ID */
    readonly runId: string;
    /** GitHub Actions run number */
    readonly runNumber: number;
    /** Workflow name */
    readonly workflowName: string;
    /** Triggering event (push, pull_request, schedule, etc.) */
    readonly eventName: string;
    /** Git reference (branch/tag) */
    readonly ref: string;
    /** Git SHA */
    readonly sha: string;
    /** Actor who triggered the workflow */
    readonly actor: string;
}
/**
 * Cache operation metrics for performance analysis.
 */
interface CacheMetrics {
    /** Cache operation type */
    readonly operation: 'restore' | 'save' | 'prepare' | 'finalize';
    /** Cache key used for the operation */
    readonly key: string;
    /** Cache key version/pattern for migration tracking */
    readonly version: string;
    /** Operation start timestamp */
    readonly startTime: Timestamp;
    /** Operation end timestamp */
    readonly endTime: Timestamp;
    /** Operation duration in milliseconds */
    readonly duration: number;
    /** Whether the operation was successful */
    readonly success: boolean;
    /** Cache hit/miss status (null for save operations) */
    readonly hit?: boolean;
    /** Cache size in bytes */
    readonly size?: number;
    /** Error message if operation failed */
    readonly error?: string;
    /** Additional operation-specific metadata */
    readonly metadata?: Record<string, unknown>;
}
/**
 * Docker operation metrics for container performance analysis.
 */
interface DockerMetrics {
    /** Docker operation type */
    readonly operation: 'pull' | 'run' | 'exec' | 'tool-install';
    /** Docker image name and tag */
    readonly image?: string;
    /** Container ID if applicable */
    readonly containerId?: string;
    /** Tool being installed (for tool-install operations) */
    readonly tool?: string;
    /** Tool version being installed */
    readonly toolVersion?: string;
    /** Operation start timestamp */
    readonly startTime: Timestamp;
    /** Operation end timestamp */
    readonly endTime: Timestamp;
    /** Operation duration in milliseconds */
    readonly duration: number;
    /** Whether the operation was successful */
    readonly success: boolean;
    /** Exit code for container operations */
    readonly exitCode?: number;
    /** Error message if operation failed */
    readonly error?: string;
    /** Additional operation-specific metadata */
    readonly metadata?: Record<string, unknown>;
}
/**
 * GitHub API usage metrics for rate limiting and performance analysis.
 */
interface ApiMetrics {
    /** API endpoint or operation type */
    readonly endpoint: string;
    /** HTTP method used */
    readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Request start timestamp */
    readonly startTime: Timestamp;
    /** Request end timestamp */
    readonly endTime: Timestamp;
    /** Request duration in milliseconds */
    readonly duration: number;
    /** HTTP response status code */
    readonly statusCode: number;
    /** Whether the request was successful (2xx status) */
    readonly success: boolean;
    /** Rate limit remaining after request */
    readonly rateLimitRemaining?: number;
    /** Rate limit reset timestamp */
    readonly rateLimitReset?: Timestamp;
    /** Whether this was a secondary rate limit */
    readonly secondaryRateLimit?: boolean;
    /** Authentication method used */
    readonly authMethod: 'github-app' | 'pat' | 'none';
    /** Error message if request failed */
    readonly error?: string;
    /** Response size in bytes */
    readonly responseSize?: number;
}
/**
 * Failure scenario categories matching troubleshooting guide.
 */
type FailureCategory = 'permissions' | 'authentication' | 'cache-corruption' | 'network-issues' | 'configuration-error' | 'docker-issues' | 'api-limits' | 'timeout' | 'unknown';
/**
 * Failure metrics for error analysis and troubleshooting.
 */
interface FailureMetrics {
    /** Failure category for classification */
    readonly category: FailureCategory;
    /** Specific failure type within category */
    readonly type: string;
    /** Failure occurrence timestamp */
    readonly timestamp: Timestamp;
    /** Error message (sanitized) */
    readonly message: string;
    /** Stack trace (sanitized, optional) */
    readonly stackTrace?: string;
    /** Related component that failed */
    readonly component: 'cache' | 'docker' | 'api' | 'config' | 'action' | 'renovate';
    /** Whether the failure was recoverable */
    readonly recoverable: boolean;
    /** Number of retry attempts made */
    readonly retryAttempts?: number;
    /** Additional failure context */
    readonly context?: Record<string, unknown>;
}
/**
 * Renovate action performance metrics summary.
 */
interface ActionMetrics {
    /** Action execution start timestamp */
    readonly startTime: Timestamp;
    /** Action execution end timestamp */
    readonly endTime: Timestamp;
    /** Total action duration in milliseconds */
    readonly duration: number;
    /** Whether the action completed successfully */
    readonly success: boolean;
    /** Renovate version used */
    readonly renovateVersion: string;
    /** Action version/commit SHA */
    readonly actionVersion: string;
    /** Number of repositories processed */
    readonly repositoriesProcessed?: number;
    /** Number of pull requests created */
    readonly pullRequestsCreated?: number;
    /** Number of dependencies updated */
    readonly dependenciesUpdated?: number;
    /** Exit code of the action */
    readonly exitCode: number;
    /** Final error message if action failed */
    readonly error?: string;
}
/**
 * Complete analytics event containing all metric types and context.
 */
interface AnalyticsEvent {
    /** Unique event identifier */
    readonly id: string;
    /** Event timestamp */
    readonly timestamp: Timestamp;
    /** Repository context */
    readonly repository: RepositoryInfo;
    /** Workflow context */
    readonly workflow: WorkflowContext;
    /** Cache metrics collected during execution */
    readonly cache: readonly CacheMetrics[];
    /** Docker metrics collected during execution */
    readonly docker: readonly DockerMetrics[];
    /** API metrics collected during execution */
    readonly api: readonly ApiMetrics[];
    /** Failure metrics if any failures occurred */
    readonly failures: readonly FailureMetrics[];
    /** Overall action performance metrics */
    readonly action: ActionMetrics;
    /** Event schema version for compatibility */
    readonly schemaVersion: string;
}
/**
 * Aggregated analytics data for multi-repository reporting.
 */
interface AggregatedAnalytics {
    /** Aggregation period start timestamp */
    readonly periodStart: Timestamp;
    /** Aggregation period end timestamp */
    readonly periodEnd: Timestamp;
    /** Number of events aggregated */
    readonly eventCount: number;
    /** Number of unique repositories */
    readonly repositoryCount: number;
    /** Cache hit rate percentage (0-100) */
    readonly cacheHitRate: number;
    /** Average cache operation duration in milliseconds */
    readonly avgCacheDuration: number;
    /** Average Docker operation duration in milliseconds */
    readonly avgDockerDuration: number;
    /** Average API request duration in milliseconds */
    readonly avgApiDuration: number;
    /** Total number of failures by category */
    readonly failuresByCategory: Record<FailureCategory, number>;
    /** Average action execution duration in milliseconds */
    readonly avgActionDuration: number;
    /** Action success rate percentage (0-100) */
    readonly actionSuccessRate: number;
    /** Aggregation schema version */
    readonly schemaVersion: string;
}
/**
 * Analytics configuration for controlling data collection.
 */
interface AnalyticsConfig {
    /** Whether analytics collection is enabled */
    readonly enabled: boolean;
    /** Log level for analytics operations */
    readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** Whether to collect cache metrics */
    readonly collectCache: boolean;
    /** Whether to collect Docker metrics */
    readonly collectDocker: boolean;
    /** Whether to collect API metrics */
    readonly collectApi: boolean;
    /** Whether to collect failure metrics */
    readonly collectFailures: boolean;
    /** Sample rate for metrics collection (0-1) */
    readonly sampleRate: number;
    /** Cache key prefix for analytics data storage */
    readonly cacheKeyPrefix: string;
    /** Maximum size of analytics data to store (bytes) */
    readonly maxDataSize: number;
    /** Data retention period in days */
    readonly retentionDays: number;
    /** Sensitive data patterns to sanitize */
    readonly sanitizePatterns: readonly string[];
}
/**
 * Current schema version for analytics data structures.
 */
declare const ANALYTICS_SCHEMA_VERSION = "1.0.0";
/**
 * Default analytics configuration values.
 */
declare const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig;

/**
 * Structured logging system with configurable log levels and JSON output format.
 * Integrates with GitHub Actions logging and supports analytics data collection.
 */

/**
 * Log level enumeration for filtering log output.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Structured log entry with consistent format.
 */
interface LogEntry {
    /** Log entry timestamp in ISO 8601 format */
    readonly timestamp: string;
    /** Log level */
    readonly level: LogLevel;
    /** Log message */
    readonly message: string;
    /** Logger component/module name */
    readonly component: string;
    /** Optional structured data associated with the log entry */
    readonly data?: Record<string, unknown>;
    /** Optional error information */
    readonly error?: {
        readonly name: string;
        readonly message: string;
        readonly stack?: string;
    };
    /** GitHub Actions workflow run ID for correlation */
    readonly runId?: string;
    /** Repository context for multi-repo analytics */
    readonly repository?: string;
}
/**
 * Configuration options for the analytics logger.
 */
interface LoggerConfig {
    /** Minimum log level to output */
    readonly level: LogLevel;
    /** Whether to output JSON format for structured parsing */
    readonly json: boolean;
    /** Whether to use GitHub Actions native logging */
    readonly useActionsLogging: boolean;
    /** Component name for this logger instance */
    readonly component: string;
    /** Whether to include stack traces in error logs */
    readonly includeStackTrace: boolean;
    /** Maximum length for log messages (truncates if exceeded) */
    readonly maxMessageLength: number;
}
/**
 * Default logger configuration values.
 */
declare const DEFAULT_LOGGER_CONFIG: LoggerConfig;
/**
 * Analytics logger with structured output and GitHub Actions integration.
 */
declare class AnalyticsLogger {
    private readonly config;
    private readonly logBuffer;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Create a logger from analytics configuration.
     */
    static fromAnalyticsConfig(analyticsConfig: AnalyticsConfig, component?: string): AnalyticsLogger;
    /**
     * Log a debug message with optional structured data.
     */
    debug(message: string, data?: Record<string, unknown>): void;
    /**
     * Log an info message with optional structured data.
     */
    info(message: string, data?: Record<string, unknown>): void;
    /**
     * Log a warning message with optional structured data.
     */
    warn(message: string, data?: Record<string, unknown>): void;
    /**
     * Log an error message with optional structured data and error object.
     */
    error(message: string, error?: Error, data?: Record<string, unknown>): void;
    /**
     * Log a performance timing measurement.
     */
    timing(operation: string, duration: number, data?: Record<string, unknown>): void;
    /**
     * Log start of an operation for timing purposes.
     */
    operationStart(operation: string, data?: Record<string, unknown>): void;
    /**
     * Log completion of an operation with duration.
     */
    operationEnd(operation: string, startTime: number, success?: boolean, data?: Record<string, unknown>): void;
    /**
     * Get all log entries from the buffer.
     */
    getLogEntries(): readonly LogEntry[];
    /**
     * Clear the log buffer.
     */
    clearBuffer(): void;
    /**
     * Get log entries filtered by level.
     */
    getLogEntriesByLevel(level: LogLevel): readonly LogEntry[];
    /**
     * Export log entries in JSON format for analytics storage.
     */
    exportAsJson(): string;
    /**
     * Core logging method with consistent structure and filtering.
     */
    private log;
    /**
     * Output log entry to console or GitHub Actions logging.
     */
    private outputLog;
    /**
     * Format log entry for output based on configuration.
     */
    private formatLogMessage;
    /**
     * Sanitize data to prevent logging sensitive information.
     * This is a basic implementation - full sanitization is in sanitizer.ts.
     */
    private sanitizeData;
}
/**
 * Get or create the global analytics logger instance.
 */
declare function getLogger(config?: Partial<LoggerConfig>): AnalyticsLogger;
/**
 * Set the global analytics logger instance.
 */
declare function setLogger(logger: AnalyticsLogger): void;
/**
 * Reset the global logger (useful for testing).
 */
declare function resetLogger(): void;
/**
 * Utility function to measure execution time of async operations.
 */
declare function withTiming<T>(operation: string, fn: () => Promise<T>, logger?: AnalyticsLogger): Promise<{
    result: T;
    duration: number;
}>;
/**
 * Utility function to measure execution time of synchronous operations.
 */
declare function withTimingSync<T>(operation: string, fn: () => T, logger?: AnalyticsLogger): {
    result: T;
    duration: number;
};

/**
 * Data aggregation utilities for multi-repository analytics reporting.
 * Provides functions to combine, summarize, and analyze analytics data across repositories.
 */

/**
 * Aggregation period for time-based analytics.
 */
type AggregationPeriod = 'day' | 'week' | 'month' | 'year';
/**
 * Aggregation options for customizing data processing.
 */
interface AggregationOptions {
    /** Time period for aggregation */
    readonly period: AggregationPeriod;
    /** Start timestamp for aggregation (ISO 8601) */
    readonly startTime?: Timestamp;
    /** End timestamp for aggregation (ISO 8601) */
    readonly endTime?: Timestamp;
    /** Repository filter (if specified, only include these repositories) */
    readonly repositories?: readonly string[];
    /** Whether to include detailed breakdowns */
    readonly includeBreakdowns: boolean;
    /** Minimum sample size for statistical calculations */
    readonly minSampleSize: number;
    /** Whether to exclude outliers from calculations */
    readonly excludeOutliers: boolean;
    /** Percentile threshold for outlier detection (0-100) */
    readonly outlierThreshold: number;
}
/**
 * Default aggregation options.
 */
declare const DEFAULT_AGGREGATION_OPTIONS: AggregationOptions;
/**
 * Detailed breakdown statistics for metrics.
 */
interface MetricBreakdown {
    /** Total count of data points */
    readonly count: number;
    /** Sum of all values */
    readonly sum: number;
    /** Average value */
    readonly average: number;
    /** Median value */
    readonly median: number;
    /** Minimum value */
    readonly min: number;
    /** Maximum value */
    readonly max: number;
    /** Standard deviation */
    readonly standardDeviation: number;
    /** 95th percentile */
    readonly p95: number;
    /** 99th percentile */
    readonly p99: number;
}
/**
 * Extended aggregated analytics with detailed breakdowns.
 */
interface ExtendedAggregatedAnalytics extends AggregatedAnalytics {
    /** Cache metrics breakdown */
    readonly cacheBreakdown: {
        readonly hitRate: MetricBreakdown;
        readonly duration: MetricBreakdown;
        readonly size: MetricBreakdown;
    };
    /** Docker metrics breakdown */
    readonly dockerBreakdown: {
        readonly duration: MetricBreakdown;
        readonly successRate: number;
    };
    /** API metrics breakdown */
    readonly apiBreakdown: {
        readonly duration: MetricBreakdown;
        readonly successRate: number;
        readonly rateLimitHits: number;
    };
    /** Repository statistics */
    readonly repositoryStats: {
        readonly totalRepositories: number;
        readonly activeRepositories: number;
        readonly repositoriesByLanguage: Record<string, number>;
        readonly repositoriesBySize: Record<string, number>;
    };
}
/**
 * Analytics aggregator for processing multiple events into summary statistics.
 */
declare class AnalyticsAggregator {
    private readonly logger;
    constructor(logger?: AnalyticsLogger);
    /**
     * Aggregate multiple analytics events into summary statistics.
     */
    aggregateEvents(events: readonly AnalyticsEvent[], options?: Partial<AggregationOptions>): Promise<AggregatedAnalytics>;
    /**
     * Aggregate events with detailed breakdowns and extended statistics.
     */
    aggregateEventsExtended(events: readonly AnalyticsEvent[], options?: Partial<AggregationOptions>): Promise<ExtendedAggregatedAnalytics>;
    /**
     * Filter events based on aggregation options.
     */
    private filterEventsByOptions;
    /**
     * Calculate period bounds for aggregation.
     */
    private calculatePeriodBounds;
    /**
     * Aggregate cache metrics from events.
     */
    private aggregateCacheMetrics;
    /**
     * Aggregate Docker metrics from events.
     */
    private aggregateDockerMetrics;
    /**
     * Aggregate API metrics from events.
     */
    private aggregateApiMetrics;
    /**
     * Aggregate failure metrics from events.
     */
    private aggregateFailureMetrics;
    /**
     * Aggregate action metrics from events.
     */
    private aggregateActionMetrics;
    /**
     * Calculate detailed cache metrics breakdown.
     */
    private calculateCacheBreakdown;
    /**
     * Calculate detailed Docker metrics breakdown.
     */
    private calculateDockerBreakdown;
    /**
     * Calculate detailed API metrics breakdown.
     */
    private calculateApiBreakdown;
    /**
     * Calculate repository statistics.
     */
    private calculateRepositoryStats;
    /**
     * Calculate detailed metric breakdown statistics.
     */
    private calculateMetricBreakdown;
    /**
     * Categorize repository size for statistics.
     */
    private categorizeSizeCategory;
    /**
     * Create empty aggregation result.
     */
    private createEmptyAggregation;
}
/**
 * Utility function to merge multiple aggregated analytics into a single result.
 */
declare function mergeAggregatedAnalytics(aggregations: readonly AggregatedAnalytics[]): AggregatedAnalytics;

/**
 * GitHub Actions Cache integration for analytics data storage with versioned keys.
 * Provides secure, efficient storage and retrieval of analytics data using cache infrastructure.
 */

/**
 * Cache key structure for analytics data organization.
 */
interface CacheKey {
    /** Base prefix for all analytics cache keys */
    readonly prefix: string;
    /** Repository identifier */
    readonly repository: string;
    /** Data type (events, aggregated, config) */
    readonly type: 'events' | 'aggregated' | 'config';
    /** Version for schema compatibility */
    readonly version: string;
    /** Optional timestamp for time-based partitioning */
    readonly timestamp?: string;
}
/**
 * Cache operation result with metadata.
 */
interface CacheResult<T = unknown> {
    /** Whether the operation was successful */
    readonly success: boolean;
    /** Data retrieved/stored (if applicable) */
    readonly data?: T;
    /** Cache key used for the operation */
    readonly key: string;
    /** Operation duration in milliseconds */
    readonly duration: number;
    /** Cache hit status (for restore operations) */
    readonly hit?: boolean;
    /** Cache size in bytes */
    readonly size?: number;
    /** Error message if operation failed */
    readonly error?: string;
}
/**
 * Configuration for cache operations.
 */
interface CacheOperationConfig {
    /** Maximum cache size in bytes */
    readonly maxSize: number;
    /** Cache TTL in milliseconds */
    readonly ttl: number;
    /** Whether to compress data before caching */
    readonly compress: boolean;
    /** Compression algorithm to use */
    readonly compressionAlgorithm: 'gzip' | 'brotli';
    /** Maximum number of retry attempts */
    readonly maxRetries: number;
    /** Retry delay in milliseconds */
    readonly retryDelay: number;
}
/**
 * Default cache operation configuration.
 */
declare const DEFAULT_CACHE_CONFIG: CacheOperationConfig;
/**
 * Analytics cache manager for GitHub Actions Cache integration.
 */
declare class AnalyticsCache {
    private readonly config;
    private readonly logger;
    private readonly analyticsConfig;
    constructor(analyticsConfig: AnalyticsConfig, config?: Partial<CacheOperationConfig>);
    /**
     * Generate a cache key from components.
     */
    generateKey(keyComponents: CacheKey): string;
    /**
     * Parse a cache key back into components.
     */
    parseKey(key: string): CacheKey | null;
    /**
     * Store analytics events in cache.
     */
    storeEvents(repository: string, events: readonly AnalyticsEvent[], timestamp?: string): Promise<CacheResult<readonly AnalyticsEvent[]>>;
    /**
     * Retrieve analytics events from cache.
     */
    retrieveEvents(repository: string, timestamp?: string): Promise<CacheResult<readonly AnalyticsEvent[]>>;
    /**
     * Store aggregated analytics data in cache.
     */
    storeAggregated(repository: string, aggregated: AggregatedAnalytics, timestamp?: string): Promise<CacheResult<AggregatedAnalytics>>;
    /**
     * Retrieve aggregated analytics data from cache.
     */
    retrieveAggregated(repository: string, timestamp?: string): Promise<CacheResult<AggregatedAnalytics>>;
    /**
     * List all cache keys for a repository.
     */
    listKeys(repository: string): Promise<string[]>;
    /**
     * Clear all analytics cache data for a repository.
     */
    clearRepository(repository: string): Promise<void>;
    /**
     * Get cache usage statistics.
     */
    getCacheStats(): Promise<{
        totalSize: number;
        entryCount: number;
        oldestEntry?: string;
        newestEntry?: string;
    }>;
    /**
     * Generic method to store data in cache with error handling and retries.
     */
    private storeData;
    /**
     * Generic method to retrieve data from cache with error handling and retries.
     */
    private retrieveData;
}
/**
 * Create cache key components for analytics events.
 */
declare function createEventsCacheKey(prefix: string, repository: string, timestamp?: string): CacheKey;
/**
 * Create cache key components for aggregated analytics data.
 */
declare function createAggregatedCacheKey(prefix: string, repository: string, timestamp?: string): CacheKey;
/**
 * Utility function to create repository identifier from GitHub context.
 */
declare function getRepositoryIdentifier(): string;
/**
 * Utility function to check if cache operations are available.
 */
declare function isCacheAvailable(): boolean;

/**
 * Configuration system for enabling/disabling analytics collection.
 * Supports environment variables and programmatic configuration.
 */

/**
 * Environment variable names for analytics configuration.
 */
declare const ENV_VAR_NAMES: {
    /** Whether analytics collection is enabled */
    readonly ENABLED: "RENOVATE_ANALYTICS_ENABLED";
    /** Log level for analytics operations */
    readonly LOG_LEVEL: "RENOVATE_ANALYTICS_LOG_LEVEL";
    /** Whether to collect cache metrics */
    readonly COLLECT_CACHE: "RENOVATE_ANALYTICS_COLLECT_CACHE";
    /** Whether to collect Docker metrics */
    readonly COLLECT_DOCKER: "RENOVATE_ANALYTICS_COLLECT_DOCKER";
    /** Whether to collect API metrics */
    readonly COLLECT_API: "RENOVATE_ANALYTICS_COLLECT_API";
    /** Whether to collect failure metrics */
    readonly COLLECT_FAILURES: "RENOVATE_ANALYTICS_COLLECT_FAILURES";
    /** Sample rate for metrics collection (0-1) */
    readonly SAMPLE_RATE: "RENOVATE_ANALYTICS_SAMPLE_RATE";
    /** Cache key prefix for analytics data storage */
    readonly CACHE_KEY_PREFIX: "RENOVATE_ANALYTICS_CACHE_KEY_PREFIX";
    /** Maximum size of analytics data to store (bytes) */
    readonly MAX_DATA_SIZE: "RENOVATE_ANALYTICS_MAX_DATA_SIZE";
    /** Data retention period in days */
    readonly RETENTION_DAYS: "RENOVATE_ANALYTICS_RETENTION_DAYS";
    /** Sensitive data patterns to sanitize (comma-separated) */
    readonly SANITIZE_PATTERNS: "RENOVATE_ANALYTICS_SANITIZE_PATTERNS";
};
/**
 * Configuration validation errors.
 */
declare class ConfigValidationError extends Error {
    readonly field: string;
    readonly value: unknown;
    constructor(message: string, field: string, value: unknown);
}
/**
 * Load analytics configuration from environment variables.
 */
declare function loadConfigFromEnvironment(): AnalyticsConfig;
/**
 * Create analytics configuration with overrides.
 */
declare function createConfig(overrides?: Partial<AnalyticsConfig>): AnalyticsConfig;
/**
 * Check if analytics collection is enabled based on configuration.
 */
declare function isAnalyticsEnabled(config: AnalyticsConfig): boolean;
/**
 * Check if specific metric collection is enabled.
 */
declare function isMetricCollectionEnabled(config: AnalyticsConfig, metricType: 'cache' | 'docker' | 'api' | 'failures'): boolean;
/**
 * Check if analytics should be collected based on sample rate.
 */
declare function shouldCollectSample(config: AnalyticsConfig): boolean;
/**
 * Get configuration summary for logging.
 */
declare function getConfigSummary(config: AnalyticsConfig): Record<string, unknown>;
/**
 * Get the default analytics configuration (loaded once from environment).
 */
declare function getDefaultConfig(): AnalyticsConfig;
/**
 * Reset the default configuration cache (useful for testing).
 */
declare function resetDefaultConfig(): void;

/**
 * Data sanitization functions to prevent secrets leakage in analytics data.
 * Provides comprehensive detection and redaction of sensitive information.
 */

/**
 * Types of sensitive data patterns to detect and sanitize.
 */
type SensitiveDataType = 'token' | 'password' | 'secret' | 'key' | 'credential' | 'bearer' | 'cookie' | 'session' | 'private' | 'email' | 'url' | 'ip' | 'uuid';
/**
 * Sanitization strategy for different types of sensitive data.
 */
type SanitizationStrategy = 'redact' | 'hash' | 'partial' | 'remove';
/**
 * Configuration for data sanitization operations.
 */
interface SanitizationConfig {
    /** Default strategy to use for unknown sensitive data */
    readonly defaultStrategy: SanitizationStrategy;
    /** Strategies for specific data types */
    readonly strategies: Record<SensitiveDataType, SanitizationStrategy>;
    /** Custom regex patterns to detect sensitive data */
    readonly customPatterns: readonly SensitivePattern[];
    /** Maximum length for partial masking */
    readonly partialMaskLength: number;
    /** Character to use for masking */
    readonly maskCharacter: string;
    /** Whether to preserve data structure in sanitized output */
    readonly preserveStructure: boolean;
    /** Salt for hashing (should be unique per installation) */
    readonly hashSalt: string;
}
/**
 * Custom pattern for detecting sensitive data.
 */
interface SensitivePattern {
    /** Name of the pattern for logging/debugging */
    readonly name: string;
    /** Regular expression to match sensitive data */
    readonly pattern: RegExp;
    /** Data type category */
    readonly type: SensitiveDataType;
    /** Sanitization strategy for this pattern */
    readonly strategy: SanitizationStrategy;
    /** Whether this pattern should be case-sensitive */
    readonly caseSensitive: boolean;
}
/**
 * Result of sanitization operation with metadata.
 */
interface SanitizationResult {
    /** Sanitized data */
    readonly data: unknown;
    /** Number of values that were sanitized */
    readonly sanitizedCount: number;
    /** Types of sensitive data found */
    readonly foundTypes: readonly SensitiveDataType[];
    /** Whether any data was modified */
    readonly wasModified: boolean;
    /** Warnings or notes about sanitization */
    readonly warnings: readonly string[];
}
/**
 * Default sanitization configuration.
 */
declare const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig;
/**
 * Pre-defined patterns for common sensitive data types.
 */
declare const BUILTIN_SENSITIVE_PATTERNS: readonly SensitivePattern[];
/**
 * Data sanitizer for preventing secrets leakage in analytics.
 */
declare class DataSanitizer {
    private readonly config;
    private readonly logger;
    private readonly allPatterns;
    constructor(config?: Partial<SanitizationConfig>, logger?: AnalyticsLogger);
    /**
     * Create sanitizer from analytics configuration.
     */
    static fromAnalyticsConfig(analyticsConfig: AnalyticsConfig, logger?: AnalyticsLogger): DataSanitizer;
    /**
     * Sanitize any data structure, removing or masking sensitive information.
     */
    sanitize(data: unknown): SanitizationResult;
    /**
     * Sanitize a string value using pattern matching.
     */
    sanitizeString(input: string): {
        sanitized: string;
        types: readonly SensitiveDataType[];
    };
    /**
     * Recursively sanitize any value type.
     */
    private sanitizeValue;
    /**
     * Apply sanitization strategy to a sensitive value.
     */
    private applySanitizationStrategy;
    /**
     * Test if a string contains sensitive data without modifying it.
     */
    containsSensitiveData(input: string): {
        hasSensitiveData: boolean;
        types: readonly SensitiveDataType[];
    };
    /**
     * Get sanitization statistics for monitoring.
     */
    getStats(): {
        patternsCount: number;
        strategiesCount: number;
        builtinPatternsCount: number;
        customPatternsCount: number;
    };
    /**
     * Add a custom pattern for detecting sensitive data.
     */
    addCustomPattern(pattern: SensitivePattern): void;
}
/**
 * Quick utility function to sanitize a string with default configuration.
 */
declare function sanitizeString(input: string): string;
/**
 * Quick utility function to sanitize any data with default configuration.
 */
declare function sanitizeData(data: unknown): unknown;
/**
 * Utility function to check if data contains sensitive information.
 */
declare function hasSensitiveData(data: unknown): boolean;

/**
 * Analytics data schema validation and error handling.
 * Provides runtime validation for all analytics data structures.
 */
/**
 * Schema validation errors with detailed context.
 */
declare class SchemaValidationError extends Error {
    readonly field: string;
    readonly value: unknown;
    readonly expectedType: string;
    readonly actualType: string;
    constructor(message: string, field: string, value: unknown, expectedType: string);
}
/**
 * Validation result with success flag and errors.
 */
interface ValidationResult {
    readonly success: boolean;
    readonly errors: readonly SchemaValidationError[];
    readonly warnings: readonly string[];
}
/**
 * Validate repository information structure.
 */
declare function validateRepositoryInfo(data: unknown): ValidationResult;
/**
 * Validate cache metrics structure.
 */
declare function validateCacheMetrics(data: unknown): ValidationResult;
/**
 * Validate analytics configuration structure.
 */
declare function validateAnalyticsConfig(data: unknown): ValidationResult;
/**
 * Validate any analytics data structure with type detection.
 */
declare function validateAnalyticsData(data: unknown, expectedType?: string): ValidationResult;
/**
 * Throw validation errors if validation fails.
 */
declare function assertValidAnalyticsData(data: unknown, expectedType?: string): void;

export { ANALYTICS_SCHEMA_VERSION, type ActionMetrics, type AggregatedAnalytics, type AggregationOptions, type AggregationPeriod, AnalyticsAggregator, AnalyticsCache, type AnalyticsConfig, type AnalyticsEvent, AnalyticsLogger, type ApiMetrics, BUILTIN_SENSITIVE_PATTERNS, type CacheKey, type CacheMetrics, type CacheOperationConfig, type CacheResult, ConfigValidationError, DEFAULT_AGGREGATION_OPTIONS, DEFAULT_ANALYTICS_CONFIG, DEFAULT_CACHE_CONFIG, DEFAULT_LOGGER_CONFIG, DEFAULT_SANITIZATION_CONFIG, DataSanitizer, type DockerMetrics, ENV_VAR_NAMES, type ExtendedAggregatedAnalytics, type FailureCategory, type FailureMetrics, type LogEntry, type LogLevel, type LoggerConfig, type MetricBreakdown, type RepositoryInfo, type SanitizationConfig, type SanitizationResult, type SanitizationStrategy, SchemaValidationError, type SensitiveDataType, type SensitivePattern, type Timestamp, type ValidationResult, type WorkflowContext, assertValidAnalyticsData, createAggregatedCacheKey, createConfig, createEventsCacheKey, getConfigSummary, getDefaultConfig, getLogger, getRepositoryIdentifier, hasSensitiveData, isAnalyticsEnabled, isCacheAvailable, isMetricCollectionEnabled, loadConfigFromEnvironment, mergeAggregatedAnalytics, resetDefaultConfig, resetLogger, sanitizeData, sanitizeString, setLogger, shouldCollectSample, validateAnalyticsConfig, validateAnalyticsData, validateCacheMetrics, validateRepositoryInfo, withTiming, withTimingSync };

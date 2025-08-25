// src/logger.ts
import { env } from "process";
import * as core from "@actions/core";
var LOG_LEVEL_HIERARCHY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var DEFAULT_LOGGER_CONFIG = {
  level: "info",
  json: true,
  useActionsLogging: true,
  component: "analytics",
  includeStackTrace: false,
  maxMessageLength: 1e3
};
var AnalyticsLogger = class _AnalyticsLogger {
  config;
  logBuffer = [];
  constructor(config = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }
  /**
   * Create a logger from analytics configuration.
   */
  static fromAnalyticsConfig(analyticsConfig, component = "analytics") {
    return new _AnalyticsLogger({
      level: analyticsConfig.logLevel,
      component,
      json: true,
      useActionsLogging: true,
      includeStackTrace: analyticsConfig.logLevel === "debug"
    });
  }
  /**
   * Log a debug message with optional structured data.
   */
  debug(message, data) {
    this.log("debug", message, data);
  }
  /**
   * Log an info message with optional structured data.
   */
  info(message, data) {
    this.log("info", message, data);
  }
  /**
   * Log a warning message with optional structured data.
   */
  warn(message, data) {
    this.log("warn", message, data);
  }
  /**
   * Log an error message with optional structured data and error object.
   */
  error(message, error2, data) {
    const errorData = error2 ? {
      name: error2.name,
      message: error2.message,
      stack: this.config.includeStackTrace ? error2.stack : void 0
    } : void 0;
    this.log("error", message, data, errorData);
  }
  /**
   * Log a performance timing measurement.
   */
  timing(operation, duration, data) {
    this.info(`${operation} completed`, {
      operation,
      duration,
      unit: "ms",
      ...data
    });
  }
  /**
   * Log start of an operation for timing purposes.
   */
  operationStart(operation, data) {
    this.debug(`${operation} started`, {
      operation,
      event: "start",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...data
    });
  }
  /**
   * Log completion of an operation with duration.
   */
  operationEnd(operation, startTime, success = true, data) {
    const duration = Date.now() - startTime;
    const level = success ? "info" : "warn";
    const message = `${operation} ${success ? "completed" : "failed"}`;
    this.log(level, message, {
      operation,
      event: "end",
      success,
      duration,
      unit: "ms",
      ...data
    });
  }
  /**
   * Get all log entries from the buffer.
   */
  getLogEntries() {
    return [...this.logBuffer];
  }
  /**
   * Clear the log buffer.
   */
  clearBuffer() {
    this.logBuffer.length = 0;
  }
  /**
   * Get log entries filtered by level.
   */
  getLogEntriesByLevel(level) {
    const minLevel = LOG_LEVEL_HIERARCHY[level];
    return this.logBuffer.filter((entry) => LOG_LEVEL_HIERARCHY[entry.level] >= minLevel);
  }
  /**
   * Export log entries in JSON format for analytics storage.
   */
  exportAsJson() {
    return JSON.stringify(this.logBuffer, null, 2);
  }
  /**
   * Core logging method with consistent structure and filtering.
   */
  log(level, message, data, error2) {
    if (LOG_LEVEL_HIERARCHY[level] < LOG_LEVEL_HIERARCHY[this.config.level]) {
      return;
    }
    const truncatedMessage = message.length > this.config.maxMessageLength ? `${message.slice(0, this.config.maxMessageLength)}...` : message;
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message: truncatedMessage,
      component: this.config.component,
      data: data ? this.sanitizeData(data) : void 0,
      error: error2,
      runId: env.GITHUB_RUN_ID,
      repository: env.GITHUB_REPOSITORY
    };
    this.logBuffer.push(logEntry);
    this.outputLog(logEntry);
  }
  /**
   * Output log entry to console or GitHub Actions logging.
   */
  outputLog(entry) {
    if (this.config.useActionsLogging) {
      switch (entry.level) {
        case "debug":
          core.debug(this.formatLogMessage(entry));
          break;
        case "info":
          core.info(this.formatLogMessage(entry));
          break;
        case "warn":
          core.warning(this.formatLogMessage(entry));
          break;
        case "error":
          core.error(this.formatLogMessage(entry));
          break;
      }
    } else {
      const formattedMessage = this.formatLogMessage(entry);
      switch (entry.level) {
        case "debug":
        case "info":
          console.log(formattedMessage);
          break;
        case "warn":
          console.warn(formattedMessage);
          break;
        case "error":
          console.error(formattedMessage);
          break;
      }
    }
  }
  /**
   * Format log entry for output based on configuration.
   */
  formatLogMessage(entry) {
    if (this.config.json) {
      return JSON.stringify(entry);
    }
    let message = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.component}] ${entry.message}`;
    if (entry.data && Object.keys(entry.data).length > 0) {
      message += ` ${JSON.stringify(entry.data)}`;
    }
    if (entry.error) {
      message += ` Error: ${entry.error.name}: ${entry.error.message}`;
      if (typeof entry.error?.stack === "string" && entry.error.stack.length > 0) {
        message += `
${entry.error.stack}`;
      }
    }
    return message;
  }
  /**
   * Sanitize data to prevent logging sensitive information.
   * This is a basic implementation - full sanitization is in sanitizer.ts.
   */
  sanitizeData(data) {
    const sensitiveKeys = ["token", "password", "secret", "key", "auth", "credential"];
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = Array.isArray(value) ? "[Array]" : "[Object]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
};
var globalLogger;
function getLogger(config) {
  if (!globalLogger) {
    globalLogger = new AnalyticsLogger(config);
  }
  return globalLogger;
}
function setLogger(logger) {
  globalLogger = logger;
}
function resetLogger() {
  globalLogger = void 0;
}
async function withTiming(operation, fn, logger) {
  const log = logger ?? getLogger();
  const startTime = Date.now();
  log.operationStart(operation);
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    log.operationEnd(operation, startTime, true, { duration });
    return { result, duration };
  } catch (error2) {
    const duration = Date.now() - startTime;
    log.operationEnd(operation, startTime, false, { duration });
    log.error(`${operation} failed`, error2 instanceof Error ? error2 : new Error(String(error2)));
    throw error2;
  }
}
function withTimingSync(operation, fn, logger) {
  const log = logger ?? getLogger();
  const startTime = Date.now();
  log.operationStart(operation);
  try {
    const result = fn();
    const duration = Date.now() - startTime;
    log.operationEnd(operation, startTime, true, { duration });
    return { result, duration };
  } catch (error2) {
    const duration = Date.now() - startTime;
    log.operationEnd(operation, startTime, false, { duration });
    log.error(`${operation} failed`, error2 instanceof Error ? error2 : new Error(String(error2)));
    throw error2;
  }
}

// src/aggregation.ts
var DEFAULT_AGGREGATION_OPTIONS = {
  period: "day",
  includeBreakdowns: true,
  minSampleSize: 5,
  excludeOutliers: true,
  outlierThreshold: 95
};
var AnalyticsAggregator = class {
  logger;
  constructor(logger) {
    this.logger = logger ?? new AnalyticsLogger({ component: "aggregator" });
  }
  /**
   * Aggregate multiple analytics events into summary statistics.
   */
  async aggregateEvents(events, options = {}) {
    const opts = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };
    this.logger.operationStart("aggregate-events", {
      eventCount: events.length,
      period: opts.period
    });
    const startTime = Date.now();
    try {
      const filteredEvents = this.filterEventsByOptions(events, opts);
      if (filteredEvents.length === 0) {
        this.logger.warn("No events to aggregate after filtering", { options: opts });
        return this.createEmptyAggregation(opts);
      }
      const { periodStart, periodEnd } = this.calculatePeriodBounds(filteredEvents, opts);
      const cacheMetrics = this.aggregateCacheMetrics(filteredEvents);
      const dockerMetrics = this.aggregateDockerMetrics(filteredEvents);
      const apiMetrics = this.aggregateApiMetrics(filteredEvents);
      const failuresByCategory = this.aggregateFailureMetrics(filteredEvents);
      const actionMetrics = this.aggregateActionMetrics(filteredEvents);
      const repositoryCount = new Set(filteredEvents.map((event) => event.repository.fullName)).size;
      const aggregated = {
        periodStart,
        periodEnd,
        eventCount: filteredEvents.length,
        repositoryCount,
        cacheHitRate: cacheMetrics.hitRate,
        avgCacheDuration: cacheMetrics.avgDuration,
        avgDockerDuration: dockerMetrics.avgDuration,
        avgApiDuration: apiMetrics.avgDuration,
        failuresByCategory,
        avgActionDuration: actionMetrics.avgDuration,
        actionSuccessRate: actionMetrics.successRate,
        schemaVersion: "1.0.0"
      };
      this.logger.operationEnd("aggregate-events", startTime, true, {
        resultEventCount: aggregated.eventCount,
        repositories: aggregated.repositoryCount
      });
      return aggregated;
    } catch (error2) {
      this.logger.operationEnd("aggregate-events", startTime, false);
      this.logger.error("Failed to aggregate events", error2 instanceof Error ? error2 : new Error(String(error2)));
      throw error2;
    }
  }
  /**
   * Aggregate events with detailed breakdowns and extended statistics.
   */
  async aggregateEventsExtended(events, options = {}) {
    const baseAggregation = await this.aggregateEvents(events, options);
    const opts = { ...DEFAULT_AGGREGATION_OPTIONS, ...options };
    const filteredEvents = this.filterEventsByOptions(events, opts);
    const cacheBreakdown = this.calculateCacheBreakdown(filteredEvents);
    const dockerBreakdown = this.calculateDockerBreakdown(filteredEvents);
    const apiBreakdown = this.calculateApiBreakdown(filteredEvents);
    const repositoryStats = this.calculateRepositoryStats(filteredEvents);
    return {
      ...baseAggregation,
      cacheBreakdown,
      dockerBreakdown,
      apiBreakdown,
      repositoryStats
    };
  }
  /**
   * Filter events based on aggregation options.
   */
  filterEventsByOptions(events, options) {
    return events.filter((event) => {
      if (typeof options.startTime === "string" && options.startTime.length > 0) {
        return event.timestamp >= options.startTime;
      }
      if (typeof options.endTime === "string" && options.endTime.length > 0) {
        return event.timestamp <= options.endTime;
      }
      if (options.repositories && options.repositories.length > 0) {
        return options.repositories.includes(event.repository.fullName);
      }
      return true;
    });
  }
  /**
   * Calculate period bounds for aggregation.
   */
  calculatePeriodBounds(events, options) {
    if (typeof options.startTime === "string" && options.startTime.length > 0 && typeof options.endTime === "string" && options.endTime.length > 0) {
      return { periodStart: options.startTime, periodEnd: options.endTime };
    }
    const timestamps = events.map((event) => new Date(event.timestamp).getTime()).sort((a, b) => a - b);
    const minTimestamp = timestamps[0] ?? Date.now();
    const maxTimestamp = timestamps.at(-1) ?? Date.now();
    return {
      periodStart: new Date(minTimestamp).toISOString(),
      periodEnd: new Date(maxTimestamp).toISOString()
    };
  }
  /**
   * Aggregate cache metrics from events.
   */
  aggregateCacheMetrics(events) {
    const cacheMetrics = events.flatMap((event) => event.cache);
    const restoreOperations = cacheMetrics.filter((metric) => metric.operation === "restore");
    if (restoreOperations.length === 0) {
      return { hitRate: 0, avgDuration: 0 };
    }
    const hits = restoreOperations.filter((metric) => metric.hit === true).length;
    const hitRate = hits / restoreOperations.length * 100;
    const totalDuration = cacheMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const avgDuration = cacheMetrics.length > 0 ? totalDuration / cacheMetrics.length : 0;
    return { hitRate, avgDuration };
  }
  /**
   * Aggregate Docker metrics from events.
   */
  aggregateDockerMetrics(events) {
    const dockerMetrics = events.flatMap((event) => event.docker);
    if (dockerMetrics.length === 0) {
      return { avgDuration: 0 };
    }
    const totalDuration = dockerMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const avgDuration = totalDuration / dockerMetrics.length;
    return { avgDuration };
  }
  /**
   * Aggregate API metrics from events.
   */
  aggregateApiMetrics(events) {
    const apiMetrics = events.flatMap((event) => event.api);
    if (apiMetrics.length === 0) {
      return { avgDuration: 0 };
    }
    const totalDuration = apiMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const avgDuration = totalDuration / apiMetrics.length;
    return { avgDuration };
  }
  /**
   * Aggregate failure metrics from events.
   */
  aggregateFailureMetrics(events) {
    const failures = events.flatMap((event) => event.failures);
    const failuresByCategory = {
      permissions: 0,
      authentication: 0,
      "cache-corruption": 0,
      "network-issues": 0,
      "configuration-error": 0,
      "docker-issues": 0,
      "api-limits": 0,
      timeout: 0,
      unknown: 0
    };
    for (const failure of failures) {
      failuresByCategory[failure.category]++;
    }
    return failuresByCategory;
  }
  /**
   * Aggregate action metrics from events.
   */
  aggregateActionMetrics(events) {
    if (events.length === 0) {
      return { avgDuration: 0, successRate: 0 };
    }
    const totalDuration = events.reduce((sum, event) => sum + event.action.duration, 0);
    const avgDuration = totalDuration / events.length;
    const successfulActions = events.filter((event) => event.action.success).length;
    const successRate = successfulActions / events.length * 100;
    return { avgDuration, successRate };
  }
  /**
   * Calculate detailed cache metrics breakdown.
   */
  calculateCacheBreakdown(events) {
    const cacheMetrics = events.flatMap((event) => event.cache);
    const restoreOperations = cacheMetrics.filter((metric) => metric.operation === "restore");
    const hitRates = restoreOperations.map((metric) => metric.hit === true ? 100 : 0);
    const durations = cacheMetrics.map((metric) => metric.duration);
    const sizes = cacheMetrics.map((metric) => metric.size ?? 0);
    return {
      hitRate: this.calculateMetricBreakdown(hitRates),
      duration: this.calculateMetricBreakdown(durations),
      size: this.calculateMetricBreakdown(sizes)
    };
  }
  /**
   * Calculate detailed Docker metrics breakdown.
   */
  calculateDockerBreakdown(events) {
    const dockerMetrics = events.flatMap((event) => event.docker);
    const durations = dockerMetrics.map((metric) => metric.duration);
    const successful = dockerMetrics.filter((metric) => metric.success).length;
    const successRate = dockerMetrics.length > 0 ? successful / dockerMetrics.length * 100 : 0;
    return {
      duration: this.calculateMetricBreakdown(durations),
      successRate
    };
  }
  /**
   * Calculate detailed API metrics breakdown.
   */
  calculateApiBreakdown(events) {
    const apiMetrics = events.flatMap((event) => event.api);
    const durations = apiMetrics.map((metric) => metric.duration);
    const successful = apiMetrics.filter((metric) => metric.success).length;
    const successRate = apiMetrics.length > 0 ? successful / apiMetrics.length * 100 : 0;
    const rateLimitHits = apiMetrics.filter((metric) => metric.secondaryRateLimit === true).length;
    return {
      duration: this.calculateMetricBreakdown(durations),
      successRate,
      rateLimitHits
    };
  }
  /**
   * Calculate repository statistics.
   */
  calculateRepositoryStats(events) {
    const repositories = /* @__PURE__ */ new Map();
    for (const event of events) {
      repositories.set(event.repository.fullName, event.repository);
    }
    const totalRepositories = repositories.size;
    const activeRepositories = totalRepositories;
    const repositoriesByLanguage = {};
    const repositoriesBySize = {};
    for (const repo of repositories.values()) {
      const language = repo.language ?? "unknown";
      repositoriesByLanguage[language] = (repositoriesByLanguage[language] ?? 0) + 1;
      const size = repo.size ?? 0;
      const sizeCategory = this.categorizeSizeCategory(size);
      repositoriesBySize[sizeCategory] = (repositoriesBySize[sizeCategory] ?? 0) + 1;
    }
    return {
      totalRepositories,
      activeRepositories,
      repositoriesByLanguage,
      repositoriesBySize
    };
  }
  /**
   * Calculate detailed metric breakdown statistics.
   */
  calculateMetricBreakdown(values) {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        p95: 0,
        p99: 0
      };
    }
    const sortedValues = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = sortedValues[0] ?? 0;
    const max = sortedValues.at(-1) ?? 0;
    const medianIndex = Math.floor(count / 2);
    const median = count % 2 === 0 ? ((sortedValues[medianIndex - 1] ?? 0) + (sortedValues[medianIndex] ?? 0)) / 2 : sortedValues[medianIndex] ?? 0;
    const variance = values.reduce((acc, val) => acc + (val - average) ** 2, 0) / count;
    const standardDeviation = Math.sqrt(variance);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    const p95 = sortedValues[Math.min(p95Index, count - 1)] ?? 0;
    const p99 = sortedValues[Math.min(p99Index, count - 1)] ?? 0;
    return {
      count,
      sum,
      average,
      median,
      min,
      max,
      standardDeviation,
      p95,
      p99
    };
  }
  /**
   * Categorize repository size for statistics.
   */
  categorizeSizeCategory(size) {
    if (size < 1e3) return "small";
    if (size < 1e4) return "medium";
    if (size < 1e5) return "large";
    return "enterprise";
  }
  /**
   * Create empty aggregation result.
   */
  createEmptyAggregation(options) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      periodStart: options.startTime ?? now,
      periodEnd: options.endTime ?? now,
      eventCount: 0,
      repositoryCount: 0,
      cacheHitRate: 0,
      avgCacheDuration: 0,
      avgDockerDuration: 0,
      avgApiDuration: 0,
      failuresByCategory: {
        permissions: 0,
        authentication: 0,
        "cache-corruption": 0,
        "network-issues": 0,
        "configuration-error": 0,
        "docker-issues": 0,
        "api-limits": 0,
        timeout: 0,
        unknown: 0
      },
      avgActionDuration: 0,
      actionSuccessRate: 0,
      schemaVersion: "1.0.0"
    };
  }
};
function mergeAggregatedAnalytics(aggregations) {
  if (aggregations.length === 0) {
    throw new Error("Cannot merge empty array of aggregations");
  }
  if (aggregations.length === 1) {
    const firstAggregation = aggregations[0];
    if (!firstAggregation) {
      throw new Error("First aggregation is undefined");
    }
    return firstAggregation;
  }
  const timestamps = aggregations.map((agg) => ({
    start: new Date(agg.periodStart).getTime(),
    end: new Date(agg.periodEnd).getTime()
  }));
  const periodStart = new Date(Math.min(...timestamps.map((t) => t.start))).toISOString();
  const periodEnd = new Date(Math.max(...timestamps.map((t) => t.end))).toISOString();
  const totalEventCount = aggregations.reduce((sum, agg) => sum + agg.eventCount, 0);
  const totalRepositoryCount = aggregations.reduce((sum, agg) => sum + agg.repositoryCount, 0);
  const weightedCacheHitRate = aggregations.reduce((sum, agg) => sum + agg.cacheHitRate * agg.eventCount, 0) / totalEventCount;
  const weightedAvgCacheDuration = aggregations.reduce((sum, agg) => sum + agg.avgCacheDuration * agg.eventCount, 0) / totalEventCount;
  const weightedAvgDockerDuration = aggregations.reduce((sum, agg) => sum + agg.avgDockerDuration * agg.eventCount, 0) / totalEventCount;
  const weightedAvgApiDuration = aggregations.reduce((sum, agg) => sum + agg.avgApiDuration * agg.eventCount, 0) / totalEventCount;
  const weightedAvgActionDuration = aggregations.reduce((sum, agg) => sum + agg.avgActionDuration * agg.eventCount, 0) / totalEventCount;
  const weightedActionSuccessRate = aggregations.reduce((sum, agg) => sum + agg.actionSuccessRate * agg.eventCount, 0) / totalEventCount;
  const mergedFailures = {
    permissions: 0,
    authentication: 0,
    "cache-corruption": 0,
    "network-issues": 0,
    "configuration-error": 0,
    "docker-issues": 0,
    "api-limits": 0,
    timeout: 0,
    unknown: 0
  };
  for (const agg of aggregations) {
    for (const [category, count] of Object.entries(agg.failuresByCategory)) {
      mergedFailures[category] += count;
    }
  }
  return {
    periodStart,
    periodEnd,
    eventCount: totalEventCount,
    repositoryCount: totalRepositoryCount,
    cacheHitRate: weightedCacheHitRate,
    avgCacheDuration: weightedAvgCacheDuration,
    avgDockerDuration: weightedAvgDockerDuration,
    avgApiDuration: weightedAvgApiDuration,
    failuresByCategory: mergedFailures,
    avgActionDuration: weightedAvgActionDuration,
    actionSuccessRate: weightedActionSuccessRate,
    schemaVersion: "1.0.0"
  };
}

// src/cache.ts
import { Buffer } from "buffer";
import { env as env2 } from "process";
import * as cache from "@actions/cache";
var DEFAULT_CACHE_CONFIG = {
  maxSize: 10 * 1024 * 1024,
  // 10MB
  ttl: 7 * 24 * 60 * 60 * 1e3,
  // 7 days
  compress: true,
  compressionAlgorithm: "gzip",
  maxRetries: 3,
  retryDelay: 1e3
};
var AnalyticsCache = class {
  config;
  logger;
  analyticsConfig;
  constructor(analyticsConfig, config = {}) {
    this.analyticsConfig = analyticsConfig;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.logger = AnalyticsLogger.fromAnalyticsConfig(analyticsConfig, "cache");
  }
  /**
   * Generate a cache key from components.
   */
  generateKey(keyComponents) {
    const parts = [keyComponents.prefix, keyComponents.repository, keyComponents.type, keyComponents.version];
    if (typeof keyComponents.timestamp === "string" && keyComponents.timestamp.length > 0) {
      parts.push(keyComponents.timestamp);
    }
    return parts.join("-");
  }
  /**
   * Parse a cache key back into components.
   */
  parseKey(key) {
    const parts = key.split("-");
    if (parts.length < 4) {
      return null;
    }
    const [prefix, repository, type, version, ...timestampParts] = parts;
    if (typeof prefix !== "string" || prefix.length === 0 || typeof repository !== "string" || repository.length === 0 || typeof type !== "string" || type.length === 0 || typeof version !== "string" || version.length === 0) {
      return null;
    }
    return {
      prefix,
      repository,
      type,
      version,
      timestamp: timestampParts.length > 0 ? timestampParts.join("-") : void 0
    };
  }
  /**
   * Store analytics events in cache.
   */
  async storeEvents(repository, events, timestamp) {
    const keyComponents = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: "events",
      version: "1.0",
      timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      // YYYY-MM-DD
    };
    return this.storeData(keyComponents, events);
  }
  /**
   * Retrieve analytics events from cache.
   */
  async retrieveEvents(repository, timestamp) {
    const keyComponents = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: "events",
      version: "1.0",
      timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      // YYYY-MM-DD
    };
    return this.retrieveData(keyComponents);
  }
  /**
   * Store aggregated analytics data in cache.
   */
  async storeAggregated(repository, aggregated, timestamp) {
    const keyComponents = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: "aggregated",
      version: "1.0",
      timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      // YYYY-MM-DD
    };
    return this.storeData(keyComponents, aggregated);
  }
  /**
   * Retrieve aggregated analytics data from cache.
   */
  async retrieveAggregated(repository, timestamp) {
    const keyComponents = {
      prefix: this.analyticsConfig.cacheKeyPrefix,
      repository,
      type: "aggregated",
      version: "1.0",
      timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      // YYYY-MM-DD
    };
    return this.retrieveData(keyComponents);
  }
  /**
   * List all cache keys for a repository.
   */
  async listKeys(repository) {
    this.logger.warn("listKeys is not directly supported by GitHub Actions Cache API", {
      repository,
      feature: "cache-listing"
    });
    return [];
  }
  /**
   * Clear all analytics cache data for a repository.
   */
  async clearRepository(repository) {
    this.logger.info("Cache data will expire automatically based on TTL", {
      repository,
      ttl: this.config.ttl
    });
  }
  /**
   * Get cache usage statistics.
   */
  async getCacheStats() {
    this.logger.warn("Cache statistics are not directly available from GitHub Actions Cache API");
    return {
      totalSize: 0,
      entryCount: 0
    };
  }
  /**
   * Generic method to store data in cache with error handling and retries.
   */
  async storeData(keyComponents, data) {
    const key = this.generateKey(keyComponents);
    return withTiming(
      `cache-store-${keyComponents.type}`,
      async () => {
        try {
          const jsonData = JSON.stringify(data);
          const dataSize = Buffer.byteLength(jsonData, "utf8");
          if (dataSize > this.config.maxSize) {
            throw new Error(`Data size (${dataSize} bytes) exceeds maximum cache size (${this.config.maxSize} bytes)`);
          }
          const { writeFile, mkdtemp, rm } = await import("fs/promises");
          const pathModule = await import("path");
          const { tmpdir } = await import("os");
          const tempDir = await mkdtemp(pathModule.join(tmpdir(), "analytics-cache-"));
          const tempFile = pathModule.join(tempDir, "data.json");
          try {
            await writeFile(tempFile, jsonData, "utf8");
            let lastError;
            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
              try {
                const cacheId = await cache.saveCache([tempFile], key);
                this.logger.info("Successfully stored data in cache", {
                  key,
                  cacheId,
                  size: dataSize,
                  attempt
                });
                return {
                  success: true,
                  data,
                  key,
                  duration: 0,
                  // Will be filled by withTiming
                  size: dataSize
                };
              } catch (error2) {
                lastError = error2 instanceof Error ? error2 : new Error(String(error2));
                this.logger.warn(`Cache store attempt ${attempt} failed`, {
                  key,
                  attempt,
                  maxRetries: this.config.maxRetries,
                  error: lastError.message
                });
                if (attempt < this.config.maxRetries) {
                  await new Promise((resolve) => {
                    setTimeout(resolve, this.config.retryDelay * attempt);
                  });
                }
              }
            }
            throw lastError ?? new Error("All cache store attempts failed");
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
        } catch (error2) {
          const errorMessage = error2 instanceof Error ? error2.message : String(error2);
          this.logger.error("Failed to store data in cache", error2 instanceof Error ? error2 : void 0, {
            key,
            type: keyComponents.type
          });
          return {
            success: false,
            key,
            duration: 0,
            // Will be filled by withTiming
            error: errorMessage
          };
        }
      },
      this.logger
    ).then(({ result, duration }) => ({ ...result, duration }));
  }
  /**
   * Generic method to retrieve data from cache with error handling and retries.
   */
  async retrieveData(keyComponents) {
    const key = this.generateKey(keyComponents);
    return withTiming(
      `cache-retrieve-${keyComponents.type}`,
      async () => {
        try {
          const { mkdtemp, readFile, rm } = await import("fs/promises");
          const pathModule = await import("path");
          const { tmpdir } = await import("os");
          const tempDir = await mkdtemp(pathModule.join(tmpdir(), "analytics-cache-"));
          const tempFile = pathModule.join(tempDir, "data.json");
          try {
            let lastError;
            let cacheHit = false;
            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
              try {
                const cacheKey = await cache.restoreCache([tempFile], key);
                if (typeof cacheKey === "string" && cacheKey.length > 0) {
                  cacheHit = true;
                  this.logger.info("Successfully restored data from cache", {
                    key,
                    cacheKey,
                    attempt
                  });
                  break;
                } else {
                  this.logger.debug("Cache miss", { key, attempt });
                  return {
                    success: true,
                    key,
                    duration: 0,
                    // Will be filled by withTiming
                    hit: false
                  };
                }
              } catch (error2) {
                lastError = error2 instanceof Error ? error2 : new Error(String(error2));
                this.logger.warn(`Cache restore attempt ${attempt} failed`, {
                  key,
                  attempt,
                  maxRetries: this.config.maxRetries,
                  error: lastError.message
                });
                if (attempt < this.config.maxRetries) {
                  await new Promise((resolve) => {
                    setTimeout(resolve, this.config.retryDelay * attempt);
                  });
                }
              }
            }
            if (!cacheHit) {
              throw lastError ?? new Error("All cache restore attempts failed");
            }
            const jsonData = await readFile(tempFile, "utf8");
            const data = JSON.parse(jsonData);
            const dataSize = Buffer.byteLength(jsonData, "utf8");
            this.logger.info("Successfully parsed cached data", {
              key,
              size: dataSize
            });
            return {
              success: true,
              data,
              key,
              duration: 0,
              // Will be filled by withTiming
              hit: true,
              size: dataSize
            };
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
        } catch (error2) {
          const errorMessage = error2 instanceof Error ? error2.message : String(error2);
          this.logger.error("Failed to retrieve data from cache", error2 instanceof Error ? error2 : void 0, {
            key,
            type: keyComponents.type
          });
          return {
            success: false,
            key,
            duration: 0,
            // Will be filled by withTiming
            hit: false,
            error: errorMessage
          };
        }
      },
      this.logger
    ).then(({ result, duration }) => ({ ...result, duration }));
  }
};
function createEventsCacheKey(prefix, repository, timestamp) {
  return {
    prefix,
    repository,
    type: "events",
    version: "1.0",
    timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
function createAggregatedCacheKey(prefix, repository, timestamp) {
  return {
    prefix,
    repository,
    type: "aggregated",
    version: "1.0",
    timestamp: timestamp ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
function getRepositoryIdentifier() {
  const repository = env2.GITHUB_REPOSITORY;
  if (typeof repository !== "string" || repository.length === 0) {
    throw new Error("GITHUB_REPOSITORY environment variable is not set");
  }
  return repository.replace("/", "-");
}
function isCacheAvailable() {
  try {
    const cacheUrl = env2.ACTIONS_CACHE_URL;
    const runtimeToken = env2.ACTIONS_RUNTIME_TOKEN;
    return Boolean(
      typeof cacheUrl === "string" && cacheUrl.length > 0 && typeof runtimeToken === "string" && runtimeToken.length > 0
    );
  } catch {
    return false;
  }
}

// src/config.ts
import process from "process";

// src/models.ts
var ANALYTICS_SCHEMA_VERSION = "1.0.0";
var DEFAULT_ANALYTICS_CONFIG = {
  enabled: false,
  logLevel: "info",
  collectCache: true,
  collectDocker: true,
  collectApi: true,
  collectFailures: true,
  sampleRate: 1,
  cacheKeyPrefix: "renovate-analytics",
  maxDataSize: 10 * 1024 * 1024,
  // 10MB
  retentionDays: 7,
  sanitizePatterns: ["token", "password", "secret", "key", "auth", "credential", "bearer", "private"]
};

// src/config.ts
var ENV_VAR_NAMES = {
  /** Whether analytics collection is enabled */
  ENABLED: "RENOVATE_ANALYTICS_ENABLED",
  /** Log level for analytics operations */
  LOG_LEVEL: "RENOVATE_ANALYTICS_LOG_LEVEL",
  /** Whether to collect cache metrics */
  COLLECT_CACHE: "RENOVATE_ANALYTICS_COLLECT_CACHE",
  /** Whether to collect Docker metrics */
  COLLECT_DOCKER: "RENOVATE_ANALYTICS_COLLECT_DOCKER",
  /** Whether to collect API metrics */
  COLLECT_API: "RENOVATE_ANALYTICS_COLLECT_API",
  /** Whether to collect failure metrics */
  COLLECT_FAILURES: "RENOVATE_ANALYTICS_COLLECT_FAILURES",
  /** Sample rate for metrics collection (0-1) */
  SAMPLE_RATE: "RENOVATE_ANALYTICS_SAMPLE_RATE",
  /** Cache key prefix for analytics data storage */
  CACHE_KEY_PREFIX: "RENOVATE_ANALYTICS_CACHE_KEY_PREFIX",
  /** Maximum size of analytics data to store (bytes) */
  MAX_DATA_SIZE: "RENOVATE_ANALYTICS_MAX_DATA_SIZE",
  /** Data retention period in days */
  RETENTION_DAYS: "RENOVATE_ANALYTICS_RETENTION_DAYS",
  /** Sensitive data patterns to sanitize (comma-separated) */
  SANITIZE_PATTERNS: "RENOVATE_ANALYTICS_SANITIZE_PATTERNS"
};
var ConfigValidationError = class extends Error {
  field;
  value;
  constructor(message, field, value) {
    super(`Configuration validation error for ${field}: ${message}`);
    this.name = "ConfigValidationError";
    this.field = field;
    this.value = value;
  }
};
function parseBoolean(value, defaultValue) {
  if (value === void 0) return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  throw new ConfigValidationError(`Expected boolean value, got: ${value}`, "boolean", value);
}
function parseNumber(value, defaultValue, min, max) {
  if (value === void 0) return defaultValue;
  const parsed = Number.parseFloat(value.trim());
  if (Number.isNaN(parsed)) {
    throw new ConfigValidationError(`Expected number, got: ${value}`, "number", value);
  }
  if (min !== void 0 && parsed < min) {
    throw new ConfigValidationError(`Value ${parsed} is below minimum ${min}`, "number", value);
  }
  if (max !== void 0 && parsed > max) {
    throw new ConfigValidationError(`Value ${parsed} is above maximum ${max}`, "number", value);
  }
  return parsed;
}
function parseLogLevel(value, defaultValue) {
  if (value === void 0) return defaultValue;
  const normalized = value.toLowerCase().trim();
  const validLevels = ["debug", "info", "warn", "error"];
  if (!validLevels.includes(normalized)) {
    throw new ConfigValidationError(`Expected one of: ${validLevels.join(", ")}, got: ${value}`, "logLevel", value);
  }
  return normalized;
}
function parsePatterns(value, defaultValue) {
  if (value === void 0) return defaultValue;
  return value.split(",").map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0);
}
function validateConfig(config) {
  if (config.sampleRate < 0 || config.sampleRate > 1) {
    throw new ConfigValidationError(
      `Sample rate must be between 0 and 1, got: ${config.sampleRate}`,
      "sampleRate",
      config.sampleRate
    );
  }
  if (config.maxDataSize <= 0) {
    throw new ConfigValidationError(
      `Max data size must be positive, got: ${config.maxDataSize}`,
      "maxDataSize",
      config.maxDataSize
    );
  }
  if (config.retentionDays <= 0) {
    throw new ConfigValidationError(
      `Retention days must be positive, got: ${config.retentionDays}`,
      "retentionDays",
      config.retentionDays
    );
  }
  if (!config.cacheKeyPrefix || config.cacheKeyPrefix.trim().length === 0) {
    throw new ConfigValidationError("Cache key prefix cannot be empty", "cacheKeyPrefix", config.cacheKeyPrefix);
  }
  if (config.sanitizePatterns.length === 0) {
    throw new ConfigValidationError(
      "At least one sanitize pattern must be provided",
      "sanitizePatterns",
      config.sanitizePatterns
    );
  }
}
function loadConfigFromEnvironment() {
  try {
    const config = {
      enabled: parseBoolean(process.env[ENV_VAR_NAMES.ENABLED], DEFAULT_ANALYTICS_CONFIG.enabled),
      logLevel: parseLogLevel(process.env[ENV_VAR_NAMES.LOG_LEVEL], DEFAULT_ANALYTICS_CONFIG.logLevel),
      collectCache: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_CACHE], DEFAULT_ANALYTICS_CONFIG.collectCache),
      collectDocker: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_DOCKER], DEFAULT_ANALYTICS_CONFIG.collectDocker),
      collectApi: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_API], DEFAULT_ANALYTICS_CONFIG.collectApi),
      collectFailures: parseBoolean(process.env[ENV_VAR_NAMES.COLLECT_FAILURES], DEFAULT_ANALYTICS_CONFIG.collectFailures),
      sampleRate: parseNumber(process.env[ENV_VAR_NAMES.SAMPLE_RATE], DEFAULT_ANALYTICS_CONFIG.sampleRate, 0, 1),
      cacheKeyPrefix: process.env[ENV_VAR_NAMES.CACHE_KEY_PREFIX] ?? DEFAULT_ANALYTICS_CONFIG.cacheKeyPrefix,
      maxDataSize: parseNumber(process.env[ENV_VAR_NAMES.MAX_DATA_SIZE], DEFAULT_ANALYTICS_CONFIG.maxDataSize, 1),
      retentionDays: parseNumber(process.env[ENV_VAR_NAMES.RETENTION_DAYS], DEFAULT_ANALYTICS_CONFIG.retentionDays, 1),
      sanitizePatterns: parsePatterns(process.env[ENV_VAR_NAMES.SANITIZE_PATTERNS], DEFAULT_ANALYTICS_CONFIG.sanitizePatterns)
    };
    validateConfig(config);
    return config;
  } catch (error2) {
    if (error2 instanceof ConfigValidationError) {
      throw error2;
    }
    throw new ConfigValidationError(
      `Failed to parse configuration: ${error2 instanceof Error ? error2.message : String(error2)}`,
      "general",
      error2
    );
  }
}
function createConfig(overrides = {}) {
  const config = {
    ...DEFAULT_ANALYTICS_CONFIG,
    ...overrides
  };
  validateConfig(config);
  return config;
}
function isAnalyticsEnabled(config) {
  return config.enabled;
}
function isMetricCollectionEnabled(config, metricType) {
  if (!config.enabled) return false;
  switch (metricType) {
    case "cache":
      return config.collectCache;
    case "docker":
      return config.collectDocker;
    case "api":
      return config.collectApi;
    case "failures":
      return config.collectFailures;
    default:
      return false;
  }
}
function shouldCollectSample(config) {
  if (!config.enabled) return false;
  if (config.sampleRate >= 1) return true;
  if (config.sampleRate <= 0) return false;
  return Math.random() < config.sampleRate;
}
function getConfigSummary(config) {
  return {
    enabled: config.enabled,
    logLevel: config.logLevel,
    collectCache: config.collectCache,
    collectDocker: config.collectDocker,
    collectApi: config.collectApi,
    collectFailures: config.collectFailures,
    sampleRate: config.sampleRate,
    cacheKeyPrefix: config.cacheKeyPrefix,
    maxDataSize: config.maxDataSize,
    retentionDays: config.retentionDays,
    sanitizePatternsCount: config.sanitizePatterns.length
  };
}
var defaultConfig;
function getDefaultConfig() {
  if (!defaultConfig) {
    defaultConfig = loadConfigFromEnvironment();
  }
  return defaultConfig;
}
function resetDefaultConfig() {
  defaultConfig = void 0;
}

// src/sanitizer.ts
import { createHash } from "crypto";
var DEFAULT_SANITIZATION_CONFIG = {
  defaultStrategy: "redact",
  strategies: {
    token: "redact",
    password: "redact",
    secret: "redact",
    key: "redact",
    credential: "redact",
    bearer: "redact",
    cookie: "redact",
    session: "redact",
    private: "redact",
    email: "partial",
    url: "partial",
    ip: "hash",
    uuid: "hash"
  },
  customPatterns: [],
  partialMaskLength: 4,
  maskCharacter: "*",
  preserveStructure: true,
  hashSalt: "renovate-analytics-salt"
};
var BUILTIN_SENSITIVE_PATTERNS = [
  // GitHub tokens
  {
    name: "github-token",
    pattern: /\b(gh[ops]_\w{36,255})\b/g,
    type: "token",
    strategy: "redact",
    caseSensitive: true
  },
  // Generic API keys
  {
    name: "api-key",
    pattern: /\b(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"]?([\w+/=]{20,})['"]?/gi,
    type: "key",
    strategy: "redact",
    caseSensitive: false
  },
  // Bearer tokens
  {
    name: "bearer-token",
    pattern: /\bbearer\s+([\w+/=]{20,})\b/gi,
    type: "bearer",
    strategy: "redact",
    caseSensitive: false
  },
  // Basic auth
  {
    name: "basic-auth",
    pattern: /\bbasic\s+([\w+/=]{4,})\b/gi,
    type: "credential",
    strategy: "redact",
    caseSensitive: false
  },
  // JWT tokens
  {
    name: "jwt-token",
    pattern: /\beyJ[\w+/=]+\.[\w+/=]+\.[\w+/=]*\b/g,
    type: "token",
    strategy: "redact",
    caseSensitive: true
  },
  // URLs with credentials
  {
    name: "url-with-credentials",
    pattern: /(https?:\/\/)[^:@\s]+:[^@\s]+@([^/\s]+)/gi,
    type: "url",
    strategy: "partial",
    caseSensitive: false
  },
  // Email addresses
  {
    name: "email-address",
    pattern: /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
    type: "email",
    strategy: "partial",
    caseSensitive: false
  },
  // IP addresses
  {
    name: "ip-address",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    type: "ip",
    strategy: "hash",
    caseSensitive: true
  },
  // UUIDs
  {
    name: "uuid",
    pattern: /\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi,
    type: "uuid",
    strategy: "hash",
    caseSensitive: false
  },
  // Private keys
  {
    name: "private-key",
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/gi,
    type: "private",
    strategy: "redact",
    caseSensitive: false
  }
];
var DataSanitizer = class _DataSanitizer {
  config;
  logger;
  allPatterns;
  constructor(config = {}, logger) {
    this.config = { ...DEFAULT_SANITIZATION_CONFIG, ...config };
    this.logger = logger ?? new AnalyticsLogger({ component: "sanitizer" });
    this.allPatterns = [...BUILTIN_SENSITIVE_PATTERNS, ...this.config.customPatterns];
  }
  /**
   * Create sanitizer from analytics configuration.
   */
  static fromAnalyticsConfig(analyticsConfig, logger) {
    const config = {
      customPatterns: analyticsConfig.sanitizePatterns.map((pattern) => ({
        name: `custom-${pattern}`,
        pattern: new RegExp(pattern, "gi"),
        type: "secret",
        strategy: "redact",
        caseSensitive: false
      }))
    };
    return new _DataSanitizer(config, logger);
  }
  /**
   * Sanitize any data structure, removing or masking sensitive information.
   */
  sanitize(data) {
    const startTime = Date.now();
    let sanitizedCount = 0;
    const foundTypes = /* @__PURE__ */ new Set();
    const warnings = [];
    this.logger.operationStart("sanitize-data", {
      dataType: typeof data,
      preserveStructure: this.config.preserveStructure
    });
    try {
      const sanitizedData = this.sanitizeValue(data, foundTypes, (count) => {
        sanitizedCount += count;
      });
      const wasModified = sanitizedCount > 0;
      if (wasModified) {
        this.logger.info("Data sanitization completed", {
          sanitizedCount,
          foundTypes: Array.from(foundTypes),
          preserveStructure: this.config.preserveStructure
        });
      }
      this.logger.operationEnd("sanitize-data", startTime, true, {
        sanitizedCount,
        foundTypesCount: foundTypes.size
      });
      return {
        data: sanitizedData,
        sanitizedCount,
        foundTypes: Array.from(foundTypes),
        wasModified,
        warnings
      };
    } catch (error2) {
      this.logger.operationEnd("sanitize-data", startTime, false);
      this.logger.error("Data sanitization failed", error2 instanceof Error ? error2 : new Error(String(error2)));
      throw error2;
    }
  }
  /**
   * Sanitize a string value using pattern matching.
   */
  sanitizeString(input) {
    let sanitized = input;
    const foundTypes = /* @__PURE__ */ new Set();
    for (const pattern of this.allPatterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      const matches = [...sanitized.matchAll(regex)];
      if (matches.length > 0) {
        foundTypes.add(pattern.type);
        for (const match of matches) {
          const sensitiveValue = match[0];
          const sanitizedValue = this.applySanitizationStrategy(sensitiveValue, pattern.strategy);
          sanitized = sanitized.replace(sensitiveValue, sanitizedValue);
        }
      }
    }
    const keyPatterns = this.config.strategies;
    for (const [keyType, strategy] of Object.entries(keyPatterns)) {
      const keyPattern = new RegExp(`["']?${keyType}["']?\\s*[:=]\\s*["']?([^"',\\s}]+)["']?`, "gi");
      const matches = [...sanitized.matchAll(keyPattern)];
      if (matches.length > 0) {
        foundTypes.add(keyType);
        for (const match of matches) {
          const fullMatch = match[0];
          const sensitiveValue = match[1];
          if (typeof sensitiveValue === "string" && sensitiveValue.length > 0) {
            const sanitizedValue = this.applySanitizationStrategy(sensitiveValue, strategy);
            const sanitizedFullMatch = fullMatch.replace(sensitiveValue, sanitizedValue);
            sanitized = sanitized.replace(fullMatch, sanitizedFullMatch);
          }
        }
      }
    }
    return {
      sanitized,
      types: Array.from(foundTypes)
    };
  }
  /**
   * Recursively sanitize any value type.
   */
  sanitizeValue(value, foundTypes, countCallback) {
    if (value === null || value === void 0) {
      return value;
    }
    if (typeof value === "string") {
      const { sanitized: sanitized2, types } = this.sanitizeString(value);
      types.forEach((type) => foundTypes.add(type));
      if (sanitized2 !== value) {
        countCallback(1);
      }
      return sanitized2;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      if (!this.config.preserveStructure) {
        return "[Array]";
      }
      return value.map((item) => this.sanitizeValue(item, foundTypes, countCallback));
    }
    if (typeof value === "object") {
      if (!this.config.preserveStructure) {
        return "[Object]";
      }
      const sanitizedObj = {};
      for (const [key, val] of Object.entries(value)) {
        const { sanitized: sanitizedKey } = this.sanitizeString(key);
        if (sanitizedKey !== key) {
          countCallback(1);
        }
        const sanitizedValue = this.sanitizeValue(val, foundTypes, countCallback);
        sanitizedObj[sanitizedKey] = sanitizedValue;
      }
      return sanitizedObj;
    }
    const stringValue = String(value);
    const { sanitized } = this.sanitizeString(stringValue);
    if (sanitized !== stringValue) {
      countCallback(1);
    }
    return sanitized;
  }
  /**
   * Apply sanitization strategy to a sensitive value.
   */
  applySanitizationStrategy(value, strategy) {
    switch (strategy) {
      case "redact":
        return "[REDACTED]";
      case "remove":
        return "";
      case "partial": {
        if (value.length <= this.config.partialMaskLength * 2) {
          return this.config.maskCharacter.repeat(value.length);
        }
        const keepLength = this.config.partialMaskLength;
        const start = value.slice(0, keepLength);
        const end = value.slice(-keepLength);
        const middleLength = value.length - keepLength * 2;
        const middle = this.config.maskCharacter.repeat(middleLength);
        return `${start}${middle}${end}`;
      }
      case "hash": {
        const hash = createHash("sha256");
        hash.update(value + this.config.hashSalt);
        return `[HASH:${hash.digest("hex").slice(0, 8)}]`;
      }
      default:
        this.logger.warn("Unknown sanitization strategy, using redact", { strategy });
        return "[REDACTED]";
    }
  }
  /**
   * Test if a string contains sensitive data without modifying it.
   */
  containsSensitiveData(input) {
    const foundTypes = /* @__PURE__ */ new Set();
    for (const pattern of this.allPatterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      if (regex.test(input)) {
        foundTypes.add(pattern.type);
      }
    }
    return {
      hasSensitiveData: foundTypes.size > 0,
      types: Array.from(foundTypes)
    };
  }
  /**
   * Get sanitization statistics for monitoring.
   */
  getStats() {
    return {
      patternsCount: this.allPatterns.length,
      strategiesCount: Object.keys(this.config.strategies).length,
      builtinPatternsCount: BUILTIN_SENSITIVE_PATTERNS.length,
      customPatternsCount: this.config.customPatterns.length
    };
  }
  /**
   * Add a custom pattern for detecting sensitive data.
   */
  addCustomPattern(pattern) {
    ;
    this.allPatterns.push(pattern);
    this.logger.info("Added custom sanitization pattern", {
      name: pattern.name,
      type: pattern.type,
      strategy: pattern.strategy
    });
  }
};
function sanitizeString(input) {
  const sanitizer = new DataSanitizer();
  const { sanitized } = sanitizer.sanitizeString(input);
  return sanitized;
}
function sanitizeData(data) {
  const sanitizer = new DataSanitizer();
  const result = sanitizer.sanitize(data);
  return result.data;
}
function hasSensitiveData(data) {
  if (typeof data === "string") {
    const sanitizer = new DataSanitizer();
    return sanitizer.containsSensitiveData(data).hasSensitiveData;
  }
  try {
    const jsonString = JSON.stringify(data);
    const sanitizer = new DataSanitizer();
    return sanitizer.containsSensitiveData(jsonString).hasSensitiveData;
  } catch {
    return false;
  }
}

// src/validation.ts
var SchemaValidationError = class extends Error {
  field;
  value;
  expectedType;
  actualType;
  constructor(message, field, value, expectedType) {
    const actualType = value === null ? "null" : typeof value;
    super(`Schema validation error for ${field}: ${message}. Expected ${expectedType}, got ${actualType}`);
    this.name = "SchemaValidationError";
    this.field = field;
    this.value = value;
    this.expectedType = expectedType;
    this.actualType = actualType;
  }
};
function createValidationSuccess(warnings = []) {
  return {
    success: true,
    errors: [],
    warnings
  };
}
function createValidationFailure(errors, warnings = []) {
  return {
    success: false,
    errors,
    warnings
  };
}
var validators = {
  isString: (value) => typeof value === "string",
  isNumber: (value) => typeof value === "number" && !Number.isNaN(value),
  isBoolean: (value) => typeof value === "boolean",
  isArray: (value) => Array.isArray(value),
  isObject: (value) => value !== null && typeof value === "object" && !Array.isArray(value),
  isTimestamp: (value) => {
    if (typeof value !== "string") return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && value.includes("T");
  },
  isLogLevel: (value) => {
    return typeof value === "string" && ["debug", "info", "warn", "error"].includes(value);
  },
  isPositiveNumber: (value) => {
    return typeof value === "number" && !Number.isNaN(value) && value > 0;
  },
  isNonNegativeNumber: (value) => {
    return typeof value === "number" && !Number.isNaN(value) && value >= 0;
  },
  isValidSampleRate: (value) => {
    return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 1;
  }
};
function validateRepositoryInfo(data) {
  const errors = [];
  const warnings = [];
  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError("Repository info must be an object", "root", data, "object")
    ]);
  }
  if (!validators.isString(data.owner)) {
    errors.push(new SchemaValidationError("Owner must be a string", "owner", data.owner, "string"));
  }
  if (!validators.isString(data.repo)) {
    errors.push(new SchemaValidationError("Repo must be a string", "repo", data.repo, "string"));
  }
  if (!validators.isString(data.fullName)) {
    errors.push(new SchemaValidationError("Full name must be a string", "fullName", data.fullName, "string"));
  }
  if (!validators.isNumber(data.id)) {
    errors.push(new SchemaValidationError("ID must be a number", "id", data.id, "number"));
  }
  if (!validators.isString(data.visibility) || !["public", "private"].includes(data.visibility)) {
    errors.push(
      new SchemaValidationError('Visibility must be "public" or "private"', "visibility", data.visibility, "string")
    );
  }
  if (data.size !== void 0 && !validators.isNonNegativeNumber(data.size)) {
    warnings.push("Repository size should be a non-negative number");
  }
  if (data.language !== void 0 && !validators.isString(data.language)) {
    warnings.push("Repository language should be a string");
  }
  return errors.length > 0 ? createValidationFailure(errors, warnings) : createValidationSuccess(warnings);
}
function validateCacheMetrics(data) {
  const errors = [];
  const warnings = [];
  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError("Cache metrics must be an object", "root", data, "object")
    ]);
  }
  if (!validators.isString(data.operation) || !["restore", "save", "prepare", "finalize"].includes(data.operation)) {
    errors.push(
      new SchemaValidationError(
        "Operation must be one of: restore, save, prepare, finalize",
        "operation",
        data.operation,
        "string"
      )
    );
  }
  if (!validators.isString(data.key)) {
    errors.push(new SchemaValidationError("Key must be a string", "key", data.key, "string"));
  }
  if (!validators.isString(data.version)) {
    errors.push(new SchemaValidationError("Version must be a string", "version", data.version, "string"));
  }
  if (!validators.isTimestamp(data.startTime)) {
    errors.push(
      new SchemaValidationError("Start time must be a valid ISO timestamp", "startTime", data.startTime, "string")
    );
  }
  if (!validators.isTimestamp(data.endTime)) {
    errors.push(new SchemaValidationError("End time must be a valid ISO timestamp", "endTime", data.endTime, "string"));
  }
  if (!validators.isNonNegativeNumber(data.duration)) {
    errors.push(
      new SchemaValidationError("Duration must be a non-negative number", "duration", data.duration, "number")
    );
  }
  if (!validators.isBoolean(data.success)) {
    errors.push(new SchemaValidationError("Success must be a boolean", "success", data.success, "boolean"));
  }
  if (data.hit !== void 0 && !validators.isBoolean(data.hit)) {
    warnings.push("Hit should be a boolean");
  }
  if (data.size !== void 0 && !validators.isNonNegativeNumber(data.size)) {
    warnings.push("Size should be a non-negative number");
  }
  if (data.error !== void 0 && !validators.isString(data.error)) {
    warnings.push("Error should be a string");
  }
  return errors.length > 0 ? createValidationFailure(errors, warnings) : createValidationSuccess(warnings);
}
function validateAnalyticsConfig(data) {
  const errors = [];
  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError("Analytics config must be an object", "root", data, "object")
    ]);
  }
  const booleanFields = ["enabled", "collectCache", "collectDocker", "collectApi", "collectFailures"];
  for (const field of booleanFields) {
    if (!validators.isBoolean(data[field])) {
      errors.push(new SchemaValidationError(`${field} must be a boolean`, field, data[field], "boolean"));
    }
  }
  if (!validators.isLogLevel(data.logLevel)) {
    errors.push(
      new SchemaValidationError("Log level must be debug, info, warn, or error", "logLevel", data.logLevel, "LogLevel")
    );
  }
  if (!validators.isValidSampleRate(data.sampleRate)) {
    errors.push(
      new SchemaValidationError("Sample rate must be between 0 and 1", "sampleRate", data.sampleRate, "number")
    );
  }
  if (!validators.isString(data.cacheKeyPrefix)) {
    errors.push(
      new SchemaValidationError("Cache key prefix must be a string", "cacheKeyPrefix", data.cacheKeyPrefix, "string")
    );
  }
  if (!validators.isPositiveNumber(data.maxDataSize)) {
    errors.push(
      new SchemaValidationError("Max data size must be a positive number", "maxDataSize", data.maxDataSize, "number")
    );
  }
  if (!validators.isPositiveNumber(data.retentionDays)) {
    errors.push(
      new SchemaValidationError(
        "Retention days must be a positive number",
        "retentionDays",
        data.retentionDays,
        "number"
      )
    );
  }
  if (validators.isArray(data.sanitizePatterns)) {
    for (const [index, pattern] of data.sanitizePatterns.entries()) {
      if (!validators.isString(pattern)) {
        errors.push(
          new SchemaValidationError(
            `Sanitize pattern at index ${index} must be a string`,
            `sanitizePatterns[${index}]`,
            pattern,
            "string"
          )
        );
      }
    }
  } else {
    errors.push(
      new SchemaValidationError(
        "Sanitize patterns must be an array",
        "sanitizePatterns",
        data.sanitizePatterns,
        "array"
      )
    );
  }
  return errors.length > 0 ? createValidationFailure(errors) : createValidationSuccess();
}
function validateAnalyticsData(data, expectedType) {
  if (expectedType !== void 0 && expectedType !== null && expectedType !== "") {
    switch (expectedType) {
      case "RepositoryInfo":
        return validateRepositoryInfo(data);
      case "CacheMetrics":
        return validateCacheMetrics(data);
      case "AnalyticsConfig":
        return validateAnalyticsConfig(data);
      default:
        return createValidationFailure([
          new SchemaValidationError(`Unknown validation type: ${expectedType}`, "type", expectedType, "known type")
        ]);
    }
  }
  if (!validators.isObject(data)) {
    return createValidationFailure([
      new SchemaValidationError("Data must be an object for auto-validation", "root", data, "object")
    ]);
  }
  if ("enabled" in data && "logLevel" in data && "sampleRate" in data) {
    return validateAnalyticsConfig(data);
  }
  if ("operation" in data && "key" in data && "duration" in data) {
    return validateCacheMetrics(data);
  }
  if ("owner" in data && "repo" in data && "fullName" in data) {
    return validateRepositoryInfo(data);
  }
  return createValidationFailure([
    new SchemaValidationError("Unable to detect data type for validation", "type", data, "known analytics type")
  ]);
}
function assertValidAnalyticsData(data, expectedType) {
  const result = validateAnalyticsData(data, expectedType);
  if (!result.success) {
    const errorMessages = result.errors.map((err) => err.message).join("; ");
    const defaultType = "valid analytics data";
    const typeDescription = expectedType !== void 0 && expectedType !== null && expectedType !== "" ? expectedType : defaultType;
    throw new SchemaValidationError(`Validation failed: ${errorMessages}`, "validation", data, typeDescription);
  }
}
export {
  ANALYTICS_SCHEMA_VERSION,
  AnalyticsAggregator,
  AnalyticsCache,
  AnalyticsLogger,
  BUILTIN_SENSITIVE_PATTERNS,
  ConfigValidationError,
  DEFAULT_AGGREGATION_OPTIONS,
  DEFAULT_ANALYTICS_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_SANITIZATION_CONFIG,
  DataSanitizer,
  ENV_VAR_NAMES,
  SchemaValidationError,
  assertValidAnalyticsData,
  createAggregatedCacheKey,
  createConfig,
  createEventsCacheKey,
  getConfigSummary,
  getDefaultConfig,
  getLogger,
  getRepositoryIdentifier,
  hasSensitiveData,
  isAnalyticsEnabled,
  isCacheAvailable,
  isMetricCollectionEnabled,
  loadConfigFromEnvironment,
  mergeAggregatedAnalytics,
  resetDefaultConfig,
  resetLogger,
  sanitizeData,
  sanitizeString,
  setLogger,
  shouldCollectSample,
  validateAnalyticsConfig,
  validateAnalyticsData,
  validateCacheMetrics,
  validateRepositoryInfo,
  withTiming,
  withTimingSync
};
//# sourceMappingURL=index.js.map
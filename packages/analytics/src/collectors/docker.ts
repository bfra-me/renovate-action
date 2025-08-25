/**
 * Docker metrics collector for performance analysis of container operations.
 */

import type {AnalyticsConfig, DockerMetrics} from '../models.js'
import {AnalyticsLogger} from '../logger.js'
import {BaseMetricCollector, type CollectionContext} from './base.js'

/**
 * Docker operation tracking data.
 */
export interface DockerOperation {
  readonly operation: 'pull' | 'run' | 'exec' | 'tool-install'
  readonly image?: string
  readonly containerId?: string
  readonly tool?: string
  readonly toolVersion?: string
  readonly startTime: string
  readonly success?: boolean
  readonly exitCode?: number
  readonly error?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * In-memory storage for tracking Docker operations.
 */
class DockerOperationStore {
  private static instance: DockerOperationStore | undefined
  private readonly operations: Map<string, DockerOperation> = new Map()

  static getInstance(): DockerOperationStore {
    if (!DockerOperationStore.instance) {
      DockerOperationStore.instance = new DockerOperationStore()
    }
    return DockerOperationStore.instance
  }

  addOperation(id: string, operation: DockerOperation): void {
    this.operations.set(id, operation)
  }

  getOperation(id: string): DockerOperation | undefined {
    return this.operations.get(id)
  }

  getAllOperations(): DockerOperation[] {
    return Array.from(this.operations.values())
  }

  updateOperation(id: string, updates: Partial<DockerOperation>): void {
    const existing = this.operations.get(id)
    if (existing) {
      this.operations.set(id, {...existing, ...updates})
    }
  }

  clear(): void {
    this.operations.clear()
  }

  getOperationsByType(operation: DockerOperation['operation']): DockerOperation[] {
    return Array.from(this.operations.values()).filter(op => op.operation === operation)
  }
}

/**
 * Collector for Docker operation metrics.
 */
export class DockerMetricsCollector extends BaseMetricCollector<DockerMetrics> {
  private readonly store = DockerOperationStore.getInstance()

  constructor(config: AnalyticsConfig, logger?: AnalyticsLogger) {
    super(config, logger ?? new AnalyticsLogger({component: 'DockerMetricsCollector'}))
  }

  async collect(_context: CollectionContext): Promise<DockerMetrics[]> {
    if (!this.isEnabled() || !this.shouldSample()) {
      return []
    }

    const operations = this.store.getAllOperations()
    this.logger.debug(`Collecting ${operations.length} Docker operations`)

    const metrics: DockerMetrics[] = []

    for (const operation of operations) {
      try {
        const endTime = (operation.metadata?.endTime as string) || this.createTimestamp()
        const metric: DockerMetrics = this.sanitize({
          operation: operation.operation,
          image: operation.image,
          containerId: operation.containerId,
          tool: operation.tool,
          toolVersion: operation.toolVersion,
          startTime: operation.startTime,
          endTime,
          duration: this.calculateDuration(operation.startTime, endTime),
          success: operation.success ?? true,
          exitCode: operation.exitCode,
          error: operation.error,
          metadata: operation.metadata,
        })

        metrics.push(metric)
      } catch (error) {
        this.logger.warn('Failed to process Docker operation metric', {
          operation: operation.operation,
          image: operation.image,
          tool: operation.tool,
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

    this.logger.info(`Collected ${metrics.length} Docker metrics`)
    return metrics
  }

  /**
   * Record a Docker operation start.
   */
  static recordOperationStart(
    operation: DockerOperation['operation'],
    image?: string,
    containerId?: string,
    tool?: string,
    toolVersion?: string,
    metadata?: Record<string, unknown>,
  ): string {
    const store = DockerOperationStore.getInstance()
    const id = `${operation}-${Date.now()}`
    const startTime = new Date().toISOString()

    store.addOperation(id, {
      operation,
      image,
      containerId,
      tool,
      toolVersion,
      startTime,
      metadata,
    })

    return id
  }

  /**
   * Record a Docker operation completion.
   */
  static recordOperationEnd(
    id: string,
    success: boolean,
    exitCode?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const store = DockerOperationStore.getInstance()
    const endTime = new Date().toISOString()

    store.updateOperation(id, {
      success,
      exitCode,
      error,
      metadata: {
        ...store.getOperation(id)?.metadata,
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Record a complete Docker operation (start and end).
   */
  static recordOperation(
    operation: DockerOperation['operation'],
    success: boolean,
    image?: string,
    containerId?: string,
    tool?: string,
    toolVersion?: string,
    exitCode?: number,
    error?: string,
    duration?: number,
    metadata?: Record<string, unknown>,
  ): void {
    const store = DockerOperationStore.getInstance()
    const endTime = new Date().toISOString()
    const startTime =
      typeof duration === 'number' && duration > 0 ? new Date(Date.now() - duration).toISOString() : endTime

    const id = `${operation}-${Date.now()}`

    store.addOperation(id, {
      operation,
      image,
      containerId,
      tool,
      toolVersion,
      startTime,
      success,
      exitCode,
      error,
      metadata: {
        ...metadata,
        endTime,
      },
    })
  }

  /**
   * Record a tool installation operation.
   */
  static recordToolInstallation(
    tool: string,
    version: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.recordOperation(
      'tool-install',
      success,
      undefined,
      undefined,
      tool,
      version,
      success ? 0 : 1,
      error,
      duration,
      {
        ...metadata,
        installationType: 'script',
      },
    )
  }

  /**
   * Record an image pull operation.
   */
  static recordImagePull(
    image: string,
    success: boolean,
    duration?: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.recordOperation('pull', success, image, undefined, undefined, undefined, success ? 0 : 1, error, duration, {
      ...metadata,
      pullType: 'docker',
    })
  }

  /**
   * Get Docker operation success rate by operation type.
   */
  static getSuccessRate(operationType?: DockerOperation['operation']): number {
    const store = DockerOperationStore.getInstance()
    const operations = operationType ? store.getOperationsByType(operationType) : store.getAllOperations()

    if (operations.length === 0) return 0

    const successful = operations.filter(op => op.success === true).length
    return Math.round((successful / operations.length) * 100)
  }

  /**
   * Clear all stored Docker operations.
   */
  static clearOperations(): void {
    const store = DockerOperationStore.getInstance()
    store.clear()
  }
}

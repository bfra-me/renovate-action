/**
 * Mock implementations for GitHub API, Docker operations, and cache interactions
 * Used in testing to simulate external dependencies without actual API calls
 */

import {Buffer} from 'node:buffer'
import {vi, type MockInstance} from 'vitest'

/**
 * GitHub API mock implementation
 */
export class GitHubApiMock {
  private rateLimitRemaining = 5000
  private rateLimitUsed = 0
  private shouldSimulateError = false
  private readonly apiCallDelay: number = 100 // ms

  constructor(options: {rateLimitRemaining?: number; shouldSimulateError?: boolean; apiCallDelay?: number} = {}) {
    this.rateLimitRemaining = options.rateLimitRemaining ?? 5000
    this.shouldSimulateError = options.shouldSimulateError ?? false
    this.apiCallDelay = options.apiCallDelay ?? 100
  }

  async createAppToken(): Promise<{token: string; expiresAt: string}> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error('GitHub App authentication failed')
    }

    return {
      token: 'ghs_mock_token_1234567890abcdef',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    }
  }

  async getRateLimit(): Promise<{remaining: number; used: number; limit: number; resetAt: string}> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error('Rate limit API call failed')
    }

    return {
      remaining: this.rateLimitRemaining,
      used: this.rateLimitUsed,
      limit: 5000,
      resetAt: new Date(Date.now() + 3600000).toISOString(),
    }
  }

  async getRepository(
    owner: string,
    repo: string,
  ): Promise<{
    id: number
    name: string
    full_name: string
    size: number
    updated_at: string
    default_branch: string
  }> {
    await this.simulateDelay()
    this.consumeRateLimit()

    if (this.shouldSimulateError) {
      throw new Error(`Repository ${owner}/${repo} not found`)
    }

    return {
      id: 123456789,
      name: repo,
      full_name: `${owner}/${repo}`,
      size: Math.floor(Math.random() * 50000), // Random size in KB
      updated_at: new Date().toISOString(),
      default_branch: 'main',
    }
  }

  setErrorMode(enabled: boolean): void {
    this.shouldSimulateError = enabled
  }

  setRateLimit(remaining: number): void {
    this.rateLimitRemaining = remaining
  }

  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.apiCallDelay))
  }

  private consumeRateLimit(): void {
    if (this.rateLimitRemaining > 0) {
      this.rateLimitRemaining--
      this.rateLimitUsed++
    }
  }
}

/**
 * Docker operations mock implementation
 */
export class DockerOperationsMock {
  private shouldSimulateError = false
  private readonly operationDelay: number = 500 // ms
  private readonly imagePullTime: number = 2000 // ms

  constructor(options: {shouldSimulateError?: boolean; operationDelay?: number; imagePullTime?: number} = {}) {
    this.shouldSimulateError = options.shouldSimulateError ?? false
    this.operationDelay = options.operationDelay ?? 500
    this.imagePullTime = options.imagePullTime ?? 2000
  }

  async pullImage(image: string): Promise<{
    success: boolean
    duration: number
    size: number
    layers: number
  }> {
    await this.simulateDelay(this.imagePullTime)

    if (this.shouldSimulateError) {
      throw new Error(`Failed to pull Docker image: ${image}`)
    }

    return {
      success: true,
      duration: this.imagePullTime + Math.floor(Math.random() * 1000),
      size: Math.floor(Math.random() * 1000000000), // Random size in bytes
      layers: Math.floor(Math.random() * 20) + 5, // 5-25 layers
    }
  }

  async runContainer(
    image: string,
    command: string[],
  ): Promise<{
    exitCode: number
    duration: number
    stdout: string
    stderr: string
  }> {
    await this.simulateDelay(this.operationDelay)

    if (this.shouldSimulateError) {
      return {
        exitCode: 1,
        duration: this.operationDelay,
        stdout: '',
        stderr: `Container execution failed for image: ${image}`,
      }
    }

    return {
      exitCode: 0,
      duration: this.operationDelay + Math.floor(Math.random() * 2000),
      stdout: `Mock output for command: ${command.join(' ')}`,
      stderr: '',
    }
  }

  async installTool(
    toolName: string,
    version?: string,
  ): Promise<{
    success: boolean
    duration: number
    installedVersion: string
  }> {
    await this.simulateDelay(this.operationDelay)

    if (this.shouldSimulateError) {
      throw new Error(`Failed to install tool: ${toolName}`)
    }

    return {
      success: true,
      duration: this.operationDelay,
      installedVersion: version ?? '1.0.0',
    }
  }

  setErrorMode(enabled: boolean): void {
    this.shouldSimulateError = enabled
  }

  private async simulateDelay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * GitHub Actions Cache mock implementation
 */
export class CacheOperationsMock {
  private readonly cache = new Map<string, {data: unknown; timestamp: number; size: number}>()
  private shouldSimulateError = false
  private readonly operationDelay: number = 200 // ms

  constructor(options: {shouldSimulateError?: boolean; operationDelay?: number} = {}) {
    this.shouldSimulateError = options.shouldSimulateError ?? false
    this.operationDelay = options.operationDelay ?? 200
  }

  async restore(
    key: string,
    restoreKeys?: string[],
  ): Promise<{
    cacheHit: boolean
    key: string
    size?: number
    duration: number
  }> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error(`Cache restore failed for key: ${key}`)
    }

    // Check exact key first
    const exactMatch = this.cache.get(key)
    if (exactMatch) {
      return {
        cacheHit: true,
        key,
        size: exactMatch.size,
        duration: this.operationDelay,
      }
    }

    // Check restore keys
    if (restoreKeys) {
      for (const restoreKey of restoreKeys) {
        const match = this.cache.get(restoreKey)
        if (match) {
          return {
            cacheHit: true,
            key: restoreKey,
            size: match.size,
            duration: this.operationDelay,
          }
        }
      }
    }

    return {
      cacheHit: false,
      key,
      duration: this.operationDelay,
    }
  }

  async save(
    key: string,
    data: unknown,
  ): Promise<{
    success: boolean
    size: number
    duration: number
  }> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error(`Cache save failed for key: ${key}`)
    }

    const serializedData = JSON.stringify(data)
    const size = Buffer.byteLength(serializedData, 'utf8')

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    })

    return {
      success: true,
      size,
      duration: this.operationDelay,
    }
  }

  async list(): Promise<{key: string; size: number; createdAt: string}[]> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error('Cache list operation failed')
    }

    return Array.from(this.cache.entries()).map(([key, {size, timestamp}]) => ({
      key,
      size,
      createdAt: new Date(timestamp).toISOString(),
    }))
  }

  async delete(key: string): Promise<{success: boolean; duration: number}> {
    await this.simulateDelay()

    if (this.shouldSimulateError) {
      throw new Error(`Cache delete failed for key: ${key}`)
    }

    const deleted = this.cache.delete(key)
    return {
      success: deleted,
      duration: this.operationDelay,
    }
  }

  clear(): void {
    this.cache.clear()
  }

  setErrorMode(enabled: boolean): void {
    this.shouldSimulateError = enabled
  }

  getTotalSize(): number {
    return Array.from(this.cache.values()).reduce((total, {size}) => total + size, 0)
  }

  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.operationDelay))
  }
}

/**
 * Network operations mock for testing connectivity issues
 */
export class NetworkMock {
  private shouldSimulateError = false
  private readonly timeoutDelay: number = 1000 // ms

  constructor(options: {shouldSimulateError?: boolean; timeoutDelay?: number} = {}) {
    this.shouldSimulateError = options.shouldSimulateError ?? false
    this.timeoutDelay = options.timeoutDelay ?? 1000
  }

  async fetch(url: string): Promise<{status: number; data: unknown; duration: number}> {
    const startTime = Date.now()

    if (this.shouldSimulateError) {
      // Simulate different types of network errors
      const errorTypes = ['timeout', 'connection_refused', 'dns_failure', 'ssl_error']
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)]

      switch (errorType) {
        case 'timeout':
          await new Promise(resolve => setTimeout(resolve, this.timeoutDelay))
          throw new Error(`Network timeout after ${this.timeoutDelay}ms`)
        case 'connection_refused':
          throw new Error('Connection refused')
        case 'dns_failure':
          throw new Error('DNS resolution failed')
        case 'ssl_error':
          throw new Error('SSL certificate verification failed')
        case undefined:
        default:
          throw new Error('Network error')
      }
    }

    const duration = Math.floor(Math.random() * 1000) + 100 // 100-1100ms
    await new Promise(resolve => setTimeout(resolve, duration))

    return {
      status: 200,
      data: {message: `Mock response for ${url}`},
      duration: Date.now() - startTime,
    }
  }

  setErrorMode(enabled: boolean): void {
    this.shouldSimulateError = enabled
  }
}

/**
 * Utility function to create all mocks with consistent configuration
 */
export function createMockSuite(
  options: {
    simulateErrors?: boolean
    rateLimitRemaining?: number
    operationDelays?: {
      github?: number
      docker?: number
      cache?: number
      network?: number
    }
  } = {},
) {
  const {simulateErrors = false, rateLimitRemaining = 5000, operationDelays = {}} = options

  return {
    githubApi: new GitHubApiMock({
      shouldSimulateError: simulateErrors,
      rateLimitRemaining,
      apiCallDelay: operationDelays.github,
    }),
    dockerOps: new DockerOperationsMock({
      shouldSimulateError: simulateErrors,
      operationDelay: operationDelays.docker,
    }),
    cacheOps: new CacheOperationsMock({
      shouldSimulateError: simulateErrors,
      operationDelay: operationDelays.cache,
    }),
    network: new NetworkMock({
      shouldSimulateError: simulateErrors,
      timeoutDelay: operationDelays.network,
    }),
  }
}

/**
 * Vitest mock factory functions for easy test setup
 */
export function mockGitHubApi(): MockInstance {
  const mock = new GitHubApiMock()
  return vi.fn().mockImplementation(() => mock)
}

export function mockDockerOperations(): MockInstance {
  const mock = new DockerOperationsMock()
  return vi.fn().mockImplementation(() => mock)
}

export function mockCacheOperations(): MockInstance {
  const mock = new CacheOperationsMock()
  return vi.fn().mockImplementation(() => mock)
}

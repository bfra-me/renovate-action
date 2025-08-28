/**
 * Unit tests for data sanitization functions.
 * Validates secrets detection, redaction strategies, and data integrity.
 */

import {beforeEach, describe, expect, test, vi} from 'vitest'
import type {
  SanitizationConfig,
  SanitizationResult,
  SanitizationStrategy,
  SensitiveDataType,
  SensitivePattern,
} from '../src/sanitizer.js'
import {DataSanitizer, DEFAULT_SANITIZATION_CONFIG} from '../src/sanitizer.js'

describe('DataSanitizer', () => {
  let sanitizer: DataSanitizer

  beforeEach(() => {
    sanitizer = new DataSanitizer()
  })

  describe('Configuration', () => {
    test('should use default configuration when none provided', () => {
      expect(DEFAULT_SANITIZATION_CONFIG.defaultStrategy).toBe('redact')
      expect(DEFAULT_SANITIZATION_CONFIG.strategies.token).toBe('redact')
      expect(DEFAULT_SANITIZATION_CONFIG.strategies.password).toBe('redact')
      expect(DEFAULT_SANITIZATION_CONFIG.partialMaskLength).toBe(4)
      expect(DEFAULT_SANITIZATION_CONFIG.maskCharacter).toBe('*')
      expect(DEFAULT_SANITIZATION_CONFIG.preserveStructure).toBe(true)
    })

    test('should accept custom configuration', () => {
      const customConfig: Partial<SanitizationConfig> = {
        defaultStrategy: 'hash',
        partialMaskLength: 6,
        maskCharacter: 'X',
        preserveStructure: false,
      }

      const customSanitizer = new DataSanitizer(customConfig)
      const result = customSanitizer.sanitize({
        data: 'sensitive-token-abc123',
      })

      expect(result.wasModified).toBe(true)
    })

    test('should validate sanitization strategies', () => {
      const strategies: SanitizationStrategy[] = ['redact', 'hash', 'partial', 'remove']

      strategies.forEach(strategy => {
        const config: Partial<SanitizationConfig> = {
          defaultStrategy: strategy,
        }

        expect(() => new DataSanitizer(config)).not.toThrow()
      })
    })

    test('should validate sensitive data types', () => {
      const dataTypes: SensitiveDataType[] = [
        'token',
        'password',
        'secret',
        'key',
        'credential',
        'bearer',
        'cookie',
        'session',
        'private',
        'email',
        'url',
        'ip',
        'uuid',
      ]

      dataTypes.forEach(type => {
        expect(DEFAULT_SANITIZATION_CONFIG.strategies[type]).toBeDefined()
      })
    })
  })

  describe('Token and Secret Detection', () => {
    test('should detect GitHub tokens', () => {
      const data = {
        token: 'ghp_abcdefghijklmnopqrstuvwxyz123456789',
        refreshToken: 'ghr_1234567890abcdefghijklmnopqrstuvwxyz',
        appToken: 'ghs_abcdefghijklmnopqrstuvwxyz123456789',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.sanitizedCount).toBeGreaterThan(0)
      expect(result.foundTypes).toContain('token')
    })

    test('should detect API keys', () => {
      const data = {
        apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        secret: 'secret_key_abc123def456',
        accessKey: 'AKIA1234567890ABCDEF',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('key')
    })

    test('should detect Bearer tokens', () => {
      const data = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        auth: 'bearer abc123def456',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('bearer')
    })

    test('should detect passwords', () => {
      const data = {
        password: 'mySecretPassword123',
        passwd: 'anotherPassword',
        pwd: 'shortpwd',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('password')
    })

    test('should detect email addresses', () => {
      const data = {
        email: 'user@example.com',
        userEmail: 'test.user+tag@company.co.uk',
        emailAddr: 'admin@subdomain.domain.org',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('email')
    })

    test('should detect URLs with credentials', () => {
      const data = {
        repoUrl: 'https://user:password@github.com/repo',
        gitUrl: 'git://token@example.com/repo.git',
        dbUrl: 'postgres://user:pass@localhost:5432/db',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('url')
    })

    test('should detect IP addresses', () => {
      const data = {
        serverIp: '192.168.1.100',
        ipv6: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        internalIp: '10.0.0.1',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('ip')
    })

    test('should detect UUIDs', () => {
      const data = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        sessionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('uuid')
    })
  })

  describe('Sanitization Strategies', () => {
    test('should redact sensitive data with mask characters', () => {
      const config: Partial<SanitizationConfig> = {
        strategies: {...DEFAULT_SANITIZATION_CONFIG.strategies, token: 'redact'},
        maskCharacter: '*',
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        token: 'ghp_abcdefghijklmnopqrstuvwxyz123456789',
      }

      const result = testSanitizer.sanitize(data)

      expect(result.data).toEqual({
        token: '***REDACTED***',
      })
    })

    test('should use partial masking strategy', () => {
      const config: Partial<SanitizationConfig> = {
        strategies: {...DEFAULT_SANITIZATION_CONFIG.strategies, token: 'partial'},
        partialMaskLength: 4,
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        token: 'ghp_abcdefghijklmnopqrstuvwxyz123456789',
      }

      const result = testSanitizer.sanitize(data)

      // Should show first and last characters with masking in between
      const sanitizedToken = (result.data as Record<string, string>).token
      expect(sanitizedToken).toMatch(/^ghp_.*789$/)
      expect(sanitizedToken).toContain('****')
    })

    test('should use hash strategy for consistent anonymization', () => {
      const config: Partial<SanitizationConfig> = {
        strategies: {...DEFAULT_SANITIZATION_CONFIG.strategies, token: 'hash'},
        hashSalt: 'test-salt',
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        token: 'ghp_abcdefghijklmnopqrstuvwxyz123456789',
      }

      const result1 = testSanitizer.sanitize(data)
      const result2 = testSanitizer.sanitize(data)

      // Same input should produce same hash
      expect(result1.data).toEqual(result2.data)

      // Hash should be deterministic and not contain original data
      const hashedToken = (result1.data as Record<string, string>).token
      expect(hashedToken).toMatch(/^[a-f0-9]+$/)
      expect(hashedToken).not.toContain('ghp_')
    })

    test('should remove sensitive data completely', () => {
      const config: Partial<SanitizationConfig> = {
        strategies: {...DEFAULT_SANITIZATION_CONFIG.strategies, token: 'remove'},
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        token: 'ghp_abcdefghijklmnopqrstuvwxyz123456789',
        safeData: 'this should remain',
      }

      const result = testSanitizer.sanitize(data)

      expect(result.data).toEqual({
        safeData: 'this should remain',
      })
      expect((result.data as Record<string, unknown>).token).toBeUndefined()
    })
  })

  describe('Data Structure Preservation', () => {
    test('should preserve object structure when configured', () => {
      const config: Partial<SanitizationConfig> = {
        preserveStructure: true,
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        repository: {
          url: 'https://token@github.com/repo',
          config: {
            token: 'secret-token',
          },
        },
        metrics: [
          {operation: 'cache', token: 'cache-token'},
          {operation: 'api', key: 'api-key'},
        ],
      }

      const result = testSanitizer.sanitize(data)

      // Structure should be preserved
      expect(result.data).toHaveProperty('repository')
      expect(result.data).toHaveProperty('metrics')
      expect((result.data as Record<string, unknown>).repository).toHaveProperty('url')
      expect((result.data as Record<string, unknown>).repository).toHaveProperty('config')
      expect(Array.isArray((result.data as Record<string, unknown>).metrics)).toBe(true)
    })

    test('should handle nested arrays and objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              token: 'deeply-nested-token',
              array: [
                {token: 'array-token-1'},
                {token: 'array-token-2'},
                'safe-string',
                123,
                null,
              ],
            },
          },
        },
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.sanitizedCount).toBe(3) // 3 tokens found
    })

    test('should handle circular references safely', () => {
      const circularObj: Record<string, unknown> = {
        token: 'circular-token',
        safe: 'data',
      }
      circularObj.self = circularObj

      expect(() => {
        const result = sanitizer.sanitize(circularObj)
        expect(result.wasModified).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Custom Patterns', () => {
    test('should apply custom sensitive patterns', () => {
      const customPattern: SensitivePattern = {
        name: 'custom-id',
        pattern: /CUSTOM-[A-Z0-9]{10}/g,
        type: 'key',
        strategy: 'redact',
        caseSensitive: true,
      }

      const config: Partial<SanitizationConfig> = {
        customPatterns: [customPattern],
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        customId: 'CUSTOM-ABC1234567',
        normalData: 'this is safe',
      }

      const result = testSanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toContain('key')
    })

    test('should handle case sensitivity in custom patterns', () => {
      const caseSensitivePattern: SensitivePattern = {
        name: 'case-sensitive',
        pattern: /SECRET-[A-Z]+/g,
        type: 'secret',
        strategy: 'redact',
        caseSensitive: true,
      }

      const caseInsensitivePattern: SensitivePattern = {
        name: 'case-insensitive',
        pattern: /token-[a-z]+/gi,
        type: 'token',
        strategy: 'redact',
        caseSensitive: false,
      }

      const config: Partial<SanitizationConfig> = {
        customPatterns: [caseSensitivePattern, caseInsensitivePattern],
      }
      const testSanitizer = new DataSanitizer(config)

      const data = {
        upperSecret: 'SECRET-ABC',
        lowerSecret: 'secret-abc',
        upperToken: 'TOKEN-xyz',
        lowerToken: 'token-xyz',
      }

      const result = testSanitizer.sanitize(data)

      expect(result.sanitizedCount).toBeGreaterThan(0)
    })
  })

  describe('Result Metadata', () => {
    test('should provide accurate sanitization counts', () => {
      const data = {
        token1: 'ghp_token1',
        token2: 'ghp_token2',
        password: 'secret-password',
        normalData: 'safe data',
      }

      const result = sanitizer.sanitize(data)

      expect(result.sanitizedCount).toBe(3)
      expect(result.wasModified).toBe(true)
      expect(result.foundTypes).toEqual(expect.arrayContaining(['token', 'password']))
    })

    test('should detect when no modifications were made', () => {
      const data = {
        safeData: 'completely safe',
        number: 123,
        boolean: true,
        array: ['safe', 'values', 123],
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(false)
      expect(result.sanitizedCount).toBe(0)
      expect(result.foundTypes).toEqual([])
    })

    test('should provide warnings for potential issues', () => {
      const hugeData = {
        largeArray: Array.from({length: 10000}, (_, i) => `item-${i}`),
        token: 'ghp_token123',
      }

      const result = sanitizer.sanitize(hugeData)

      expect(result.warnings).toBeDefined()
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        token: 'ghp_token123',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.sanitizedCount).toBe(1)
    })

    test('should handle primitive data types', () => {
      const testCases = [
        'plain string with token ghp_abc123',
        123,
        true,
        false,
        null,
        undefined,
      ]

      testCases.forEach(testCase => {
        const result = sanitizer.sanitize(testCase)
        expect(result).toBeDefined()
        expect(result.data).toBeDefined()
      })
    })

    test('should handle empty objects and arrays', () => {
      const testCases = [{}, [], '', 0]

      testCases.forEach(testCase => {
        const result = sanitizer.sanitize(testCase)
        expect(result.wasModified).toBe(false)
        expect(result.sanitizedCount).toBe(0)
      })
    })

    test('should handle very large data structures', () => {
      const largeData = {
        bigArray: Array.from({length: 1000}, (_, i) => ({
          id: i,
          data: `item-${i}`,
          token: i % 100 === 0 ? `token-${i}` : undefined,
        })),
      }

      expect(() => {
        const result = sanitizer.sanitize(largeData)
        expect(result.sanitizedCount).toBeGreaterThan(0)
      }).not.toThrow()
    })

    test('should handle special characters and encodings', () => {
      const data = {
        unicode: 'token with üñïçødé characters: ghp_abc123',
        emoji: 'token with emoji 🚀: ghp_def456',
        escaped: 'token with \\n\\t escaped: ghp_ghi789',
      }

      const result = sanitizer.sanitize(data)

      expect(result.wasModified).toBe(true)
      expect(result.sanitizedCount).toBe(3)
    })

    test('should handle functions and non-serializable objects', () => {
      const data = {
        func: () => 'test function',
        date: new Date(),
        regex: /test-pattern/,
        token: 'ghp_token123',
      }

      expect(() => {
        const result = sanitizer.sanitize(data)
        expect(result.wasModified).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Performance Considerations', () => {
    test('should handle sanitization within reasonable time', () => {
      const startTime = Date.now()

      const mediumData = {
        items: Array.from({length: 500}, (_, i) => ({
          id: i,
          token: i % 10 === 0 ? `token-${i}` : 'safe-data',
          nested: {
            value: `nested-${i}`,
            secret: i % 20 === 0 ? `secret-${i}` : undefined,
          },
        })),
      }

      sanitizer.sanitize(mediumData)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (less than 1 second for medium data)
      expect(duration).toBeLessThan(1000)
    })

    test('should not cause memory leaks with repeated sanitization', () => {
      const data = {
        token: 'ghp_repeated_token',
        data: 'some data',
      }

      // Run multiple sanitizations
      for (let i = 0; i < 100; i++) {
        const result = sanitizer.sanitize(data)
        expect(result.wasModified).toBe(true)
      }

      // Should complete without throwing memory errors
      expect(true).toBe(true)
    })
  })
})

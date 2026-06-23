import * as cp from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {expect, test} from 'vitest'

const actionPath = path.join(__dirname, '..', '..', 'action.yaml')
const actionYaml = fs.readFileSync(actionPath, 'utf8')

function extractConfigureScript(): string {
  const match = /validate_json\(\) \{[\s\S]*?^        base_global_config=/m.exec(actionYaml)

  if (!match) {
    throw new Error('Could not extract configure script helpers')
  }

  return match[0].replace(/^        /gm, '').replace(/\nbase_global_config=$/, '')
}

function extractBaseConfig(): string {
  const match = /        zzglobal_config: \|-\n([\s\S]*?)^      run: \|/m.exec(actionYaml)

  if (!match) {
    throw new Error('Could not extract base global config')
  }

  return match[1].replace(/^          /gm, '')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected JSON object')
  }

  return value as Record<string, unknown>
}

test('global config merge removes user-provided protected fields', () => {
  const script = `${extractConfigureScript()}
merge_global_config "$BASE_CONFIG" "$USER_CONFIG"
`
  const output = cp.execFileSync('bash', ['--noprofile', '--norc', '-Eeuo', 'pipefail', '-c', script], {
    env: {
      ...process.env,
      BASE_CONFIG: extractBaseConfig(),
      USER_CONFIG: JSON.stringify({
        allowedCommands: ['^unsafe$'],
        cacheDir: '/tmp/unsafe-cache',
        gitAuthor: 'attacker <attacker@example.com>',
        gitIgnoredAuthors: ['trusted@example.com'],
        platform: 'gitlab',
        repositoryCache: 'enabled',
        timezone: 'UTC',
      }),
    },
  }).toString()

  const mergedConfig = asRecord(JSON.parse(output))

  expect(mergedConfig).not.toHaveProperty('cacheDir')
  expect(mergedConfig).not.toHaveProperty('gitAuthor')
  expect(mergedConfig).not.toHaveProperty('gitIgnoredAuthors')
  expect(mergedConfig).not.toHaveProperty('platform')
  expect(mergedConfig).not.toHaveProperty('repositoryCache')
  expect(mergedConfig.allowedCommands).not.toEqual(['^unsafe$'])
  expect(mergedConfig.timezone).toBe('UTC')
})

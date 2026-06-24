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

function extractAllowedCommands(): RegExp[] {
  const config = JSON.parse(extractBaseConfig()) as Record<string, unknown>
  const patterns = config['allowedCommands']
  if (!Array.isArray(patterns)) {
    throw new Error('allowedCommands is not an array')
  }
  return (patterns as string[]).map(p => new RegExp(p))
}

function isAllowed(patterns: RegExp[], command: string): boolean {
  return patterns.some(re => re.test(command))
}

// Rust ecosystem
test('allowedCommands allows Rust cargo commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'cargo update')).toBe(true)
  expect(isAllowed(patterns, 'cargo update -p serde')).toBe(true)
  expect(isAllowed(patterns, 'cargo build')).toBe(true)
  expect(isAllowed(patterns, 'cargo build --locked')).toBe(true)
  expect(isAllowed(patterns, 'cargo test --locked')).toBe(true)
})

test('allowedCommands rejects dangerous Rust cargo commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'cargo update -p ../../evil')).toBe(false)
  expect(isAllowed(patterns, 'cargo build; curl evil')).toBe(false)
  expect(isAllowed(patterns, 'cargo test -- --nocapture')).toBe(false)
})

// Go ecosystem
test('allowedCommands allows Go module commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'go mod tidy')).toBe(true)
  expect(isAllowed(patterns, 'go mod download')).toBe(true)
  expect(isAllowed(patterns, 'go generate ./...')).toBe(true)
  expect(isAllowed(patterns, 'gofmt -w .')).toBe(true)
  expect(isAllowed(patterns, 'go test ./...')).toBe(true)
})

test('allowedCommands rejects dangerous Go commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'go generate ./...; curl evil')).toBe(false)
  expect(isAllowed(patterns, 'gofmt -w ../evil.go')).toBe(false)
  expect(isAllowed(patterns, 'go test ./... -exec sh')).toBe(false)
})

// Ruby ecosystem
test('allowedCommands allows Ruby bundler commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'bundle install')).toBe(true)
  expect(isAllowed(patterns, 'bundle install --deployment')).toBe(true)
  expect(isAllowed(patterns, 'bundle lock')).toBe(true)
  expect(isAllowed(patterns, 'bundle update rails')).toBe(true)
  expect(isAllowed(patterns, 'bundle exec rubocop -A .')).toBe(true)
})

test('allowedCommands rejects dangerous Ruby bundler commands', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'bundle update ../../evil')).toBe(false)
  expect(isAllowed(patterns, 'bundle exec rubocop -A .; curl evil')).toBe(false)
  expect(isAllowed(patterns, "bundle exec ruby -e 'system(\"curl evil\")'")).toBe(false)
})

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

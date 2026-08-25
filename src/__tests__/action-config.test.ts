import * as cp from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {load} from 'js-yaml'
import {expect, test} from 'vitest'

const actionPath = path.join(__dirname, '..', '..', 'action.yaml')
const actionYaml = fs.readFileSync(actionPath, 'utf8')
const dockerEntrypointPath = path.join(__dirname, '..', '..', 'docker', 'entrypoint.sh')
const dockerEntrypoint = fs.readFileSync(dockerEntrypointPath, 'utf8')
const readmePath = path.join(__dirname, '..', '..', 'README.md')
const readme = fs.readFileSync(readmePath, 'utf8')
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json')
const packageJson = fs.readFileSync(packageJsonPath, 'utf8')
const workflowPath = path.join(__dirname, '..', '..', '.github', 'workflows', 'main.yaml')
const workflowYaml = fs.readFileSync(workflowPath, 'utf8')
const filtersPath = path.join(__dirname, '..', '..', '.github', 'filters.yaml')
const filtersYaml = fs.readFileSync(filtersPath, 'utf8')

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

function asSteps(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    throw new Error('Expected workflow steps')
  }

  return value.map(asRecord)
}

function readWorkflow(): Record<string, unknown> {
  return asRecord(load(workflowYaml))
}

function readFilters(): Record<string, unknown> {
  return asRecord(load(filtersYaml))
}

function getJob(name: string): Record<string, unknown> {
  const workflow = readWorkflow()
  const jobs = asRecord(workflow.jobs)
  return asRecord(jobs[name])
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

test('allowedCommands rejects Cargo package tokens starting with - or .', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'cargo update -p -evil')).toBe(false)
  expect(isAllowed(patterns, 'cargo update -p .evil')).toBe(false)
  expect(isAllowed(patterns, 'cargo update -p --workspace')).toBe(false)
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

test('allowedCommands rejects Bundler package tokens starting with - or .', () => {
  const patterns = extractAllowedCommands()
  expect(isAllowed(patterns, 'bundle update -evil')).toBe(false)
  expect(isAllowed(patterns, 'bundle update .evil')).toBe(false)
  expect(isAllowed(patterns, 'bundle update --all')).toBe(false)
  expect(isAllowed(patterns, 'bundle update --bundler')).toBe(false)
})

test('allowedCommands rejects obsolete .npmrc checkout commands', () => {
  const patterns = extractAllowedCommands()
  const commands = [
    'git checkout -- .npmrc',
    'git checkout -- .npmrc || true',
    '[ -w .npmrc ] && git checkout -- .npmrc',
    '[ -w .npmrc ] && git checkout -- .npmrc || true',
  ]

  for (const command of commands) {
    expect(isAllowed(patterns, command), command).toBe(false)
  }
})

function extractRenovateVersion(): string {
  const match = /RENOVATE_VERSION:\s*([0-9]+\.[0-9]+\.[0-9]+)/.exec(actionYaml)

  if (!match) {
    throw new Error('Could not extract Renovate version')
  }

  return match[1]
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)

    if (delta !== 0) {
      return delta
    }
  }

  return 0
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

test('pinned Renovate version includes the stability-days fix', () => {
  expect(compareSemver(extractRenovateVersion(), '43.234.1')).toBeGreaterThanOrEqual(0)
})

test('README Renovate release link matches the pinned Renovate version', () => {
  expect(readme).toContain(`https://github.com/renovatebot/renovate/releases/tag/${extractRenovateVersion()}`)
})

test('Docker analytics snippets use ESM imports', () => {
  expect(dockerEntrypoint).not.toContain('require(')
  expect(dockerEntrypoint).toMatch(/import fs from ['"]node:fs['"]/)
  expect(dockerEntrypoint).toMatch(/import path from ['"]node:path['"]/)
})

test('Docker analytics snippets never interpolate shell values into JS source', () => {
  const snippets = [...dockerEntrypoint.matchAll(/node --input-type=module -e '([\s\S]*?)'\n/g)].map(
    match => match[1] ?? '',
  )

  expect(snippets).toHaveLength(2)
  for (const snippet of snippets) {
    expect(snippet).not.toMatch(/\$\{/)
    expect(snippet).toContain('process.env.')
  }
})

test('package scripts keep the full workspace build separate from the action build', () => {
  const scripts = asRecord(asRecord(JSON.parse(packageJson)).scripts)

  expect(scripts['build-action']).toBe('tsup')
  expect(scripts.build).toBe('tsup && pnpm -r --stream run build')
})

test('setup keeps Node and filter outputs without bootstrapping dependencies', () => {
  const setup = getJob('setup')
  const outputs = asRecord(setup.outputs)
  const steps = asSteps(setup.steps)

  expect(outputs['dist-changed']).toBe("${{ contains(steps.filter.outputs.changes, 'dist-changed') }}")
  expect(outputs['docs-build-path']).toBe('${{ env.DOCS_BUILD_PATH }}')
  expect(outputs['docs-changed']).toBe("${{ contains(steps.filter.outputs.changes, 'docs-changed') }}")
  expect(outputs['node-version']).toBe('${{ steps.set-node-version.outputs.node-version }}')
  expect(outputs['should-check']).toBe("${{ contains(steps.filter.outputs.changes, 'should-check') }}")
  expect(outputs['action-self-test-changed']).toBe(
    "${{ contains(steps.filter.outputs.changes, 'action-self-test-changed') }}",
  )
  expect(outputs['docs-build-changed']).toBe("${{ contains(steps.filter.outputs.changes, 'docs-build-changed') }}")
  expect(outputs['src-changed']).toBe("${{ contains(steps.filter.outputs.changes, 'src-changed') }}")
  expect(steps.some(step => step.run === 'pnpm bootstrap')).toBe(false)
})

test('CI filters define the action self-test and Docs build inputs exactly', () => {
  const filters = readFilters()

  expect(filters['action-self-test-changed']).toEqual([
    'action.yaml',
    'docker/**',
  ])
  expect(filters['docs-build-changed']).toEqual([
    'docs/**',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.github/workflows/main.yaml',
    '.github/filters.yaml',
  ])
})

test('self-test runs only for trusted default-branch pushes with action changes', () => {
  const testJob = getJob('test')
  const steps = asSteps(testJob.steps)
  const selfTest = steps.find(step => step.name === 'Self-test')
  if (!selfTest) {
    throw new Error('Could not find self-test step')
  }
  const condition = String(selfTest['if'] ?? '')
  const inputs = asRecord(selfTest['with'])

  const expectedCondition = [
    "github.repository_owner == 'bfra-me'",
    "github.event_name == 'push'",
    "github.ref_name == github.event.repository.default_branch",
    "needs.setup.outputs.action-self-test-changed == 'true'",
  ].join(' && ')

  expect(selfTest.uses).toBe('./')
  expect(condition).toBe(expectedCondition)
  expect(condition).not.toContain('pull_request')
  expect(condition).not.toContain('merge_group')
  expect(inputs['renovate-app-id']).toBe('${{ secrets.APPLICATION_ID }}')
  expect(inputs['renovate-app-private-key']).toBe('${{ secrets.APPLICATION_PRIVATE_KEY }}')
})

test('check does not build the root workspace or preview Docs', () => {
  const steps = asSteps(getJob('check').steps)
  const runs = steps.map(step => String(step.run ?? ''))

  expect(runs).not.toContain('pnpm build')
  expect(runs.some(run => run.includes('pnpm run preview'))).toBe(false)
})

test('action build and release use the action-only build command', () => {
  const buildSteps = asSteps(getJob('build').steps)
  const releaseSteps = asSteps(getJob('release').steps)

  expect(buildSteps.map(step => step.run)).toContain('pnpm run build-action')
  expect(releaseSteps.map(step => step.run)).toContain('pnpm run build-action')
})

test('build-docs runs the existing preview endpoint check after the Astro build', () => {
  const steps = asSteps(getJob('build-docs').steps)
  const astroBuildIndex = steps.findIndex(step => step.name === 'Build with Astro')
  const previewIndex = steps.findIndex(step => String(step.run ?? '').includes('pnpm run preview'))
  const preview = steps[previewIndex]

  expect(astroBuildIndex).toBeGreaterThanOrEqual(0)
  expect(previewIndex).toBeGreaterThan(astroBuildIndex)
  expect(String(preview?.run ?? '')).toContain('http://localhost:4321/renovate-action')
  expect(preview?.['working-directory']).toBe('${{ needs.setup.outputs.docs-build-path }}')
})

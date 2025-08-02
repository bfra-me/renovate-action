# Copilot Instructions for Renovate Action

## Project Overview

This is a GitHub composite action that runs Renovate bot in a self-hosted configuration. The action orchestrates dependency updates using Docker containers with GitHub App authentication.

## Architecture

- **Composite Action**: Uses `action.yaml` to define a multi-step workflow that configures and runs Renovate
- **Docker Integration**: Runs Renovate in a containerized environment via `renovatebot/github-action`
- **GitHub App Auth**: Authenticates using GitHub App credentials for enhanced permissions and rate limits
- **Cache Management**: Implements sophisticated caching for Renovate's repository and dependency data

## Key Files & Components

### Core Action Definition
- `action.yaml`: Main composite action with inputs, outputs, and step orchestration
- `src/main.ts`: TypeScript entry point (currently template code - actual logic is in action.yaml)
- `docker/entrypoint.sh`: Docker container setup script for installing tools (yq, Node.js, pnpm, yarn)

### Build & Development
- `tsup.config.ts`: Build configuration using tsup for ESM bundling with license generation
- `package.json`: Scripts follow pattern: `bootstrap` → `build` → `check` → `test`
- Uses `@bfra.me/*` organization packages for consistent tooling (eslint, prettier, tsconfig)
- Package manager: `pnpm@10.14.0` with `packageManager` field for version consistency

### Testing
- **Three-Tier Strategy**: Unit tests (Vitest), integration tests (child_process), self-tests (CI/CD)
- **Unit Testing**: Vitest 3.2.4 in `src/__tests__/` for TypeScript function validation
- **Integration Testing**: `child_process.execFileSync` to test complete action execution pipeline
- **Self-Test Pattern**: Conditional execution in main workflow using real GitHub App credentials in dry-run mode

## Critical Patterns

### Renovate Configuration
```yaml
# Global config embedded in action.yaml with allowedCommands for security
RENOVATE_CONFIG: '{"allowedCommands": [...], "onboardingConfig": {...}}'
```

### Environment Variable Management
The action uses a complex environment variable setup pattern:
- GitHub App token generation via `actions/create-github-app-token`
- Dynamic configuration in the "Configure" step that generates outputs
- Environment variables prefixed with `RENOVATE_*` for the bot

### Cache Strategy
- Cache key includes major Renovate version: `renovate-cache-v$(major_version)`
- Cache invalidation on push events
- Proper ownership handling between Docker and runner user

## Development Workflows

### Build Commands
```bash
pnpm bootstrap  # Install dependencies
pnpm build      # Build with tsup
pnpm check      # Type check + lint
pnpm test       # Run Vitest tests
```

### Version Management
- Renovate version pinned in `action.yaml` with renovate comment for auto-updates
- Semantic release via GitHub Actions
- Tool versions in `docker/entrypoint.sh` managed by Renovate

## GitHub Action Best Practices

### Input/Output Patterns
- All inputs have sensible defaults in `action.yaml`
- Required inputs: `renovate-app-id` and `renovate-app-private-key`
- Outputs provide Docker image and Renovate version for downstream usage

### Security Considerations
- Uses pinned action versions with SHA hashes
- Restricts environment variable regex pattern for security
- Runs Docker as root for proper file permissions

### Error Handling
- Uses `bash -Eeuo pipefail` for strict error handling
- Proper cleanup in cache finalization even on failures

## Release Workflow & Version Management

### Semantic Release Automation
- **Release Branch Strategy**: Uses a dedicated `release` branch separate from `main`
- **Trigger**: Automated releases on push to `main` via GitHub App authentication
- **Configuration**: `.releaserc.yaml` with conventional commits preset
- **Release Process**:
  1. Merges `main` into `release` branch with `--no-ff -Xtheirs`
  2. Runs `semantic-release` to determine version and generate changelog
  3. Creates Git tags and GitHub releases
  4. Updates major version branch (e.g., `v5`) for users

### Renovate Self-Update Strategy
- **Version Pinning**: Renovate version in `action.yaml` uses renovate comment for auto-updates:
  ```yaml
  RENOVATE_VERSION: 41.42.2 # renovate: datasource=docker depName=renovate packageName=ghcr.io/renovatebot/renovate versioning=semver
  ```
- **Automated Updates**: `.github/renovate.json5` manages dependency updates with semantic commit types:
  - Major updates: `feat(deps)!:` (breaking changes)
  - Minor updates: `feat(deps):` (new features)
  - Patch updates: disabled (manual control)
- **Grouped Updates**: Major Renovate updates grouped into single PR
- **Schedule**: Off-peak timing (evenings, weekends) to minimize disruption

### Build & Release Dependencies
- **Dist Verification**: CI ensures committed `dist/` matches built output
- **Dependencies**: Renovate updates tool versions in `docker/entrypoint.sh`
- **Cache Invalidation**: Release workflow triggers cache cleanup

## Troubleshooting Common Failures

### Docker Permission Issues

**Error Pattern**: `Permission denied` or `chown: cannot access '/tmp/renovate'`
```
Error: Docker run failed with exit code 1
chown: cannot access '/tmp/renovate': Permission denied
```
**Root Cause**: Mismatch between Docker user permissions and GitHub Actions runner user
**Solutions**:
- Verify `docker-user: root` in action.yaml step configuration
- Check `chown -R ubuntu:ubuntu /tmp/renovate` in docker/entrypoint.sh
- Ensure cache preparation step runs: `sudo chown -R runneradmin:root /tmp/renovate`
- Validate cache finalization: `sudo chown -R $(whoami) /tmp/renovate`

### GitHub App Token Problems

**Error Pattern**: `Bad credentials` or `API rate limit exceeded`
```
WARN: Repository access is not sufficient (Renovate)
Error: Request failed due to following response errors: Your token has not been granted the required scopes
```
**Root Cause**: Invalid GitHub App credentials or insufficient permissions
**Solutions**:
- Verify `renovate-app-id` and `renovate-app-private-key` secrets are correctly set
- Check GitHub App permissions include: Contents (write), Metadata (read), Pull requests (write)
- Validate GitHub App installation covers target repositories
- Review `actions/create-github-app-token` step output for token generation errors
- Ensure GitHub App has access to organization or repository

### Cache Corruption Scenarios

**Error Pattern**: Cache restore failures or invalid cache state
```
Cache not found for key: renovate-cache-v41
Warning: Failed to restore cache
```
**Root Cause**: Cache version mismatch or corrupted cache data
**Solutions**:
- Cache key based on major Renovate version: `renovate-cache-v$(major_version)`
- Force cache invalidation by pushing to `main` branch (triggers cache deletion)
- Check cache finalization step runs on both success and failure
- Validate `/tmp/renovate/cache` directory permissions and ownership
- Use `cache: 'false'` input to disable caching temporarily for debugging

### Renovate Configuration Errors

**Error Pattern**: Invalid configuration or preset resolution failures
```
Configuration error: Cannot resolve preset "github>invalid/preset"
ERROR: Renovate config validation error
```
**Root Cause**: Invalid Renovate configuration or unreachable presets
**Solutions**:
- Enable `print-config: true` input to debug resolved configuration
- Verify preset references in `.github/renovate.json5` are accessible
- Check `RENOVATE_CONFIG` embedded configuration in action.yaml
- Validate `allowedCommands` array for post-upgrade tasks
- Review `RENOVATE_GIT_IGNORED_AUTHORS` for commit loop prevention

### Network and Connectivity Issues

**Error Pattern**: Docker image pull failures or network timeouts
```
Error: Failed to pull Docker image ghcr.io/renovatebot/renovate:41.42.2
Error: connect ETIMEDOUT
```
**Root Cause**: Network connectivity or Docker registry issues
**Solutions**:
- Verify Docker image exists at specified version in GHCR
- Check `RENOVATE_VERSION` in action.yaml matches available tags (currently 41.42.2)
- Use `docker-image` output for debugging actual image being used
- Validate runner network access to GitHub Container Registry
- Consider using alternative Docker registry or caching strategies

### Tool Installation Failures

**Error Pattern**: Tool installation errors in docker/entrypoint.sh
```
Error: Failed to install node version 22.11.0
curl: (6) Could not resolve host: github.com
```
**Root Cause**: Tool version mismatches or download failures
**Solutions**:
- Check tool versions in `docker/entrypoint.sh` are valid and available
- Verify Renovate comments for version updates: `# renovate: datasource=...`
- Validate `install-tool` commands for Node.js, pnpm, yarn
- Review `yq` download and installation process
- Check network connectivity for tool downloads from GitHub releases

## Integration Points

- **GitHub Apps**: Primary authentication method
- **Renovate Bot**: Core dependency update engine
- **Docker Hub/GHCR**: Container registry for Renovate images
- **GitHub Actions Cache**: For persistent storage across runs

## Testing Strategy

### Overview
The project implements a comprehensive three-tier testing strategy ensuring reliability from individual components to full end-to-end workflows.

### Unit Testing with Vitest
- **Framework**: Vitest 3.2.4 for TypeScript module validation
- **Location**: `src/__tests__/` directory
- **Execution**: `pnpm test` command
- **Coverage**: Error conditions, timing constraints, pure function isolation
- **Configuration**: ESM support via package.json, TypeScript via tsconfig.json

### Integration Testing via child_process
- **Mechanism**: Node.js `child_process.execFileSync` to execute built action
- **Environment**: Simulates GitHub Actions runner with `INPUT_*` environment variables
- **Validation**: Built distribution (`dist/index.js`), input/output protocols, production execution
- **Testing Pattern**: Set env vars → execute action → validate outputs

### Self-Test Pattern in CI/CD
- **Location**: `.github/workflows/main.yaml` conditional step
- **Authentication**: Real GitHub App credentials in dry-run mode
- **Conditions**: Repository owner validation, non-default branch, no Renovate config changes
- **Validation**: Token generation, Docker execution, cache management, error handling

### Production Testing
- **Renovate Workflow**: Real dependency operations via `.github/workflows/renovate.yaml`
- **Triggers**: Manual dispatch, checkbox interactions, workflow completion
- **Scenarios**: Branch operations, configuration validation, production execution

### Testing Environments
- **Development**: Local unit tests with `pnpm test`, debug mode with `ACTIONS_STEP_DEBUG=true`
- **CI/CD**: Full test suite on PRs, self-tests on feature branches, release validation
- **Production**: Real GitHub App auth, repository operations, cache validation

### Error Scenario Testing
- **Permission Issues**: Docker user/file ownership conflicts
- **Authentication Failures**: Invalid GitHub App credentials validation
- **Cache Corruption**: Cache key versioning and invalidation testing
- **Configuration Errors**: Renovate preset resolution and config validation

### Performance Testing
- **Cache Performance**: Hit rates, storage usage, version-based invalidation
- **Docker Performance**: Image pull time, tool installation, file system operations
- **API Limits**: Rate limiting, request batching, error recovery patterns

### Local Testing Patterns
- **GitHub Actions Runner Simulation**:
  ```bash
  # Using act for local workflow testing
  act -j test --secret-file .secrets --env-file .env.test

  # Simulate specific GitHub context
  act -e .github/test-events/push.json --matrix os:ubuntu-latest
  ```
- **Environment Variable Testing**:
  ```typescript
  // Test GitHub Actions input patterns
  describe('Action Inputs', () => {
    beforeEach(() => {
      process.env.INPUT_DRY_RUN = 'true'
      process.env.INPUT_LOG_LEVEL = 'debug'
      process.env.GITHUB_REPOSITORY = 'bfra-me/renovate-action'
    })

    afterEach(() => {
      delete process.env.INPUT_DRY_RUN
      delete process.env.INPUT_LOG_LEVEL
      delete process.env.GITHUB_REPOSITORY
    })
  })
  ```
- **Docker Testing Patterns**:
  ```bash
  # Local Renovate container testing
  docker run --rm -v /tmp/test-cache:/tmp/renovate/cache \
    -e RENOVATE_TOKEN=test \
    ghcr.io/renovatebot/renovate:latest --dry-run
  ```

### Dependency Mocking Strategies
- **GitHub API Mocking**:
  ```typescript
  import { vi } from 'vitest'
  import { Octokit } from '@octokit/rest'

  // Mock GitHub App token generation
  vi.mock('@actions/core', () => ({
    getInput: vi.fn((input) => {
      const inputs = {
        'renovate-app-id': '12345',
        'renovate-app-private-key': 'mock-key'
      }
      return inputs[input] || ''
    }),
    setOutput: vi.fn(),
    setFailed: vi.fn()
  }))

  // Mock Octokit responses
  const mockOctokit = {
    apps: {
      createInstallationAccessToken: vi.fn().mockResolvedValue({
        data: { token: 'ghs_mocktoken' }
      })
    }
  }
  ```
- **Docker Registry Mocking**:
  ```typescript
  // Mock Docker image availability
  vi.mock('child_process', () => ({
    execFileSync: vi.fn((cmd, args) => {
      if (cmd === 'docker' && args.includes('pull')) {
        return Buffer.from('Image pulled successfully')
      }
      return Buffer.from('Command executed')
    })
  }))
  ```
- **File System Mocking**:
  ```typescript
  import { vi } from 'vitest'
  import fs from 'fs'

  // Mock cache operations
  vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
    return path.toString().includes('/tmp/renovate/cache')
  })

  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)
  ```

### Composite Action Testing Patterns
- **Action.yaml Step Orchestration**:
  ```typescript
  describe('Composite Action Flow', () => {
    test('validates step dependencies', async () => {
      // Test that configure step runs before renovate step
      const stepOrder = ['configure', 'renovate', 'finalize']
      let executedSteps = []

      // Mock each step execution
      stepOrder.forEach(step => {
        executeStep(step, () => executedSteps.push(step))
      })

      expect(executedSteps).toEqual(stepOrder)
    })
  })
  ```
- **Input/Output Validation**:
  ```typescript
  // Test input propagation across steps
  test('propagates inputs correctly', () => {
    process.env.INPUT_DRY_RUN = 'true'
    process.env.INPUT_CACHE = 'false'

    const configStep = require('../action-steps/configure')
    const outputs = configStep.run()

    expect(outputs.dry_run).toBe('true')
    expect(outputs.cache_enabled).toBe('false')
  })

  // Test output consumption
  test('consumes step outputs', () => {
  const stepOutputs = {
    docker_image: 'ghcr.io/renovatebot/renovate:41.42.2',
    renovate_version: '41.42.2'
  }    const renovateStep = require('../action-steps/renovate')
    expect(renovateStep.getDockerImage(stepOutputs)).toBe(stepOutputs.docker_image)
  })
  ```
- **Error Propagation Testing**:
  ```typescript
  describe('Error Handling', () => {
    test('fails fast on invalid configuration', () => {
      process.env.INPUT_RENOVATE_APP_ID = ''

      expect(() => {
        require('../action-steps/configure').validateInputs()
      }).toThrow('renovate-app-id is required')
    })

    test('cleans up on failure', async () => {
      const cleanupSpy = vi.spyOn(require('../utils/cleanup'), 'finalize')

      try {
        await simulateStepFailure('renovate')
      } catch (error) {
        // Error expected
      }

      expect(cleanupSpy).toHaveBeenCalledWith({
        cachePath: '/tmp/renovate',
        preserveCache: false
      })
    })
  })
  ```

### Advanced Testing Scenarios
- **Cache State Testing**:
  ```typescript
  describe('Cache Management', () => {
    test('handles cache version migration', () => {
      // Simulate cache from older Renovate version
      const oldCacheKey = 'renovate-cache-v40'
      const newCacheKey = 'renovate-cache-v41'

      mockCacheService.restore.mockResolvedValueOnce(false) // Old cache miss
      mockCacheService.save.mockResolvedValueOnce(true)    // New cache save

      expect(cacheManager.migrate(oldCacheKey, newCacheKey)).resolves.toBe(true)
    })
  })
  ```
- **Multi-Repository Testing**:
  ```typescript
  // Test autodiscovery patterns
  test('discovers repositories correctly', () => {
    const mockRepos = [
      { name: 'repo1', private: false },
      { name: 'repo2', private: true },
      { name: 'archived-repo', archived: true }
    ]

    mockGitHubAPI.repos.listForOrg.mockResolvedValue({ data: mockRepos })

    const discovered = autodiscoverRepositories({
      excludeArchived: true,
      includePrivate: false
    })

    expect(discovered).toEqual([{ name: 'repo1', private: false }])
  })
  ```

### Testing Best Practices
- **Unit**: Test pure functions, mock externals, descriptive assertions, grouped suites
- **Integration**: Complete workflows, realistic data, error handling validation
- **Self-Test**: Always dry-run, security constraints, resource monitoring, cleanup
- **Local Development**: Use act for workflow testing, mock external dependencies, validate error paths
- **Composite Actions**: Test step orchestration, input/output flow, failure scenarios
- **Continuous**: Monitor reliability, add edge case tests, keep dependencies updated

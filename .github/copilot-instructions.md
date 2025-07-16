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

### Testing
- Uses Vitest as the test framework
- Tests in `src/__tests__/` directory
- Integration test simulates GitHub Action execution via `child_process`

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
  RENOVATE_VERSION: 41.35.0 # renovate: datasource=docker depName=renovate packageName=ghcr.io/renovatebot/renovate versioning=semver
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
Error: Failed to pull Docker image ghcr.io/renovatebot/renovate:41.35.0
Error: connect ETIMEDOUT
```
**Root Cause**: Network connectivity or Docker registry issues
**Solutions**:
- Verify Docker image exists at specified version in GHCR
- Check `RENOVATE_VERSION` in action.yaml matches available tags
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

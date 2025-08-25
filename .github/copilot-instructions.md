# Copilot Instructions for Renovate Action

## Project Architecture

This is a **composite GitHub Action** that orchestrates self-hosted Renovate bot execution in Docker containers. The action uses **GitHub App authentication** (not PATs) for enhanced API rate limits and permissions.

### Key Components

- **`action.yaml`**: Composite action definition with complex input validation and multi-step workflow orchestration
- **`src/main.ts`**: TypeScript entry point (minimal - real logic is in action.yaml shell scripts)
- **`docker/entrypoint.sh`**: Docker container setup script for Renovate environment
- **Global config system**: Secure merging of user config with base organizational defaults

## Critical Patterns

### Authentication Flow
```yaml
# Always use GitHub Apps, never PATs
- uses: actions/create-github-app-token@v2
  with:
    app-id: ${{ inputs.renovate-app-id }}
    private-key: ${{ inputs.renovate-app-private-key }}
    owner: ${{ github.repository_owner }}
```

### Config Merging Security
The action implements **secure JSON merging** in `action.yaml:configure` step:
- Base config contains `allowedCommands` array (security boundary)
- User `global-config` input is validated and merged
- **Never allow override** of: `platform`, `gitAuthor`, `cacheDir`, `allowedCommands`
- Deep merging for `onboardingConfig` object

### Template System
When `enable-custom-templates: true`, the action processes template variables:
```yaml
# Template variables automatically substituted:
{{github.repository}} → owner/repo-name
{{github.run_id}} → workflow-run-id
```

### Caching Strategy
- **Repository cache**: `/tmp/renovate/cache` with cross-OS support
- **Cache key**: `renovate-cache-v{major-version}`
- **Ownership handling**: `sudo chown` operations for Docker user conflicts

## Development Workflows

### Build & Test
```bash
pnpm bootstrap    # Install dependencies (prefer offline)
pnpm build       # tsup bundling to dist/
pnpm test        # Vitest unit tests
pnpm check       # Type checking + linting
```

### Release Process
- **Semantic Release**: Version managed automatically
- **Action updates**: Renovate manages `RENOVATE_VERSION` in action.yaml
- **Pin exact commits** in action steps for security

## Integration Points

### Renovate Bot Integration
- **Official action**: Uses `renovatebot/github-action@v43` as execution engine
- **Environment mapping**: Extensive env vars (`RENOVATE_*` prefix)
- **Docker execution**: Custom entrypoint script with tool installations

### External Dependencies
- **GitHub Apps**: Core authentication mechanism
- **Docker Hub/GHCR**: Renovate container images
- **Action dependencies**: All pinned to specific commit SHAs

## Testing Strategy

**Three-tier approach** (documented in `docs/testing-strategy.md`):
1. **Unit tests**: Vitest for TypeScript functions
2. **Integration tests**: Via workflow examples in `docs/examples/`
3. **Self-tests**: Action tests itself via `.github/workflows/renovate.yaml`

## @bfra-me Conventions

- **Custom templates**: Branded PR/issue templates with CI links
- **Global preset**: `github>bfra-me/renovate-config` as base configuration
- **Git author format**: `{app-slug}[bot] <{app-id}+{app-slug}[bot]@users.noreply.github.com>`
- **Onboarding**: Creates `.github/renovate.json5` (not `.json`)

## TypeScript Patterns & Best Practices

### Type Safety Principles
- **Avoid `any` type**: Prefer `unknown` when type is uncertain, use type guards for narrowing
- **Function signatures**: Always use explicit return types (`Promise<string>`, not just `Promise`)
- **Utility types**: Leverage built-in utilities (`Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, `Required<T>`)
- **Const assertions**: Use `as const` for fixed values and readonly arrays

### Code Structure
```typescript
// Avoid ES6 class syntax - prefer function-based approach
export async function wait(milliseconds: number): Promise<string> {
  if (Number.isNaN(milliseconds)) {
    throw new TypeError('milliseconds not a number')
  }
  // Implementation...
}

// Use JSDoc for public APIs with meaningful descriptions
/**
 * Validates GitHub App authentication credentials
 * @param appId - GitHub App ID for authentication
 * @param privateKey - Private key for GitHub App
 * @returns Promise resolving to validation result
 * @throws {Error} When credentials are invalid or missing
 */
```

### Testing with Vitest
- **Type-checking in tests**: Leverage Vitest's built-in TypeScript support
- **Test structure**: Place tests in `src/__tests__/` with `.test.ts` suffix
- **Error testing**: Use `expect().rejects.toThrow()` for async error validation

### Error Handling
- **Meaningful messages**: Provide context-specific error messages (not just "invalid input")
- **GitHub Actions**: Use `@actions/core.setFailed()` for action failures
- **Type guards**: Implement proper type checking before operations

### Documentation Standards
- **JSDoc comments**: Required for all public APIs and complex functions
- **Explain "why"**: Focus on business logic and reasoning, not implementation details
- **Error scenarios**: Document when and why functions might throw

## Common Gotchas

- **JSON validation**: All config inputs validated with `jq` before use
- **Shell safety**: All scripts use `bash -Eeuo pipefail` for strict error handling
- **Docker permissions**: Cache directories need ownership adjustments between runner and Docker
- **Template escaping**: Use `jq -Rs .` for proper JSON string escaping
- **TypeScript builds**: Use `tsup` for bundling; source maps required for debugging

# Testing Strategy for Renovate Action

## Overview

The renovate-action implements a three-tier testing strategy that validates functionality from individual components to full end-to-end workflows. This comprehensive approach ensures reliability across all execution environments and use cases.

## Testing Architecture

### 1. Unit Testing with Vitest

**Purpose**: Validate individual TypeScript functions and modules in isolation.

**Framework**: Vitest 3.2.4 **Location**: `src/__tests__/` **Execution**: `pnpm test`

**Configuration**:

- No explicit Vitest config file (uses defaults)
- ESM module support via `"type": "module"` in package.json
- TypeScript support configured through tsconfig.json

**Current Coverage**:

```typescript
// src/__tests__/main.test.ts
test("throws invalid number", async () => {
  const input = Number.parseInt("foo", 10)
  await expect(wait(input)).rejects.toThrow("milliseconds not a number")
})

test("wait 500 ms", async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  const delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})
```

**Best Practices**:

- Test error conditions and edge cases
- Use async/await for Promise-based functions
- Validate timing constraints for time-sensitive operations
- Group related tests in suites using `describe()` blocks

### 2. Integration Testing via child_process

**Purpose**: Test the complete action execution pipeline as a black box.

**Mechanism**: Node.js `child_process.execFileSync` to execute the built action **Environment**: Simulates GitHub Actions runner environment **Input**: Environment variables (`INPUT_*` pattern)

**Implementation**:

```typescript
test("test runs", () => {
  process.env.INPUT_MILLISECONDS = "500"
  const np = process.execPath
  const ip = path.join(__dirname, "../..", "dist", "index.js")
  const options: cp.ExecFileSyncOptions = {
    env: process.env,
  }
  console.log(cp.execFileSync(np, [ip], options).toString())
})
```

**Key Features**:

- Validates built distribution (`dist/index.js`)
- Tests GitHub Actions input/output protocol
- Simulates production execution environment
- Captures stdout/stderr for debugging

**Testing Patterns**:

- Set environment variables to mimic action inputs
- Execute built action using Node.js process
- Validate outputs through console capture
- Test various input combinations and edge cases

### 3. Self-Test Pattern in CI/CD Workflows

**Purpose**: End-to-end validation in production-like GitHub Actions environment.

**Location**: `.github/workflows/main.yaml` **Authentication**: Real GitHub App credentials **Mode**: Dry-run execution to prevent actual changes

**Implementation**:

```yaml
# Conditional self-test in main workflow
- if: github.repository_owner == 'bfra-me' && github.ref_name != github.event.repository.default_branch && needs.setup.outputs.renovate-changed != 'true'
  uses: ./
  with:
    dry-run: true
    log-level: debug
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

**Conditions for Execution**:

- Repository owner must be 'bfra-me' (security constraint)
- Not running on default branch (prevents main branch pollution)
- Renovate configuration hasn't changed (avoids conflicts)
- Source code changes detected (efficiency optimization)

**Validation Points**:

- GitHub App token generation and authentication
- Docker container execution and environment setup
- Renovate configuration parsing and validation
- Cache management and file permissions
- Error handling and logging functionality

## Workflow Integration

### Main Workflow (.github/workflows/main.yaml)

**Test Job Dependencies**:

```
setup → test (runs if src changed)
setup → build (runs if src changed or on push)
[check, test, build] → release
```

**Test Execution Logic**:

1. **Unit Tests**: Always run when source changes
2. **Integration Tests**: Included in unit test suite
3. **Self-Test**: Conditional execution based on branch and config state

**Build Verification**:

- Ensures `dist/` directory matches built output
- Prevents deployment of stale build artifacts
- Uploads expected dist/ as artifact on failure

### Renovate Workflow (.github/workflows/renovate.yaml)

**Purpose**: Real-world testing with actual Renovate operations **Trigger Conditions**:

- Manual workflow dispatch
- Issue/PR checkbox interactions
- Push to non-main branches
- Successful completion of main workflow

**Test Scenarios**:

- Renovate task checkboxes (rebase, approve, etc.)
- Branch-specific operations
- Configuration change validation
- Production environment execution

## Testing Environments

### Development Environment

- **Local Testing**: `pnpm test` for rapid feedback
- **Build Validation**: `pnpm build && pnpm test` for integration
- **Debug Mode**: Set `ACTIONS_STEP_DEBUG=true` for verbose logging

### CI/CD Environment

- **Pull Request Testing**: Full test suite on every PR
- **Branch Testing**: Self-test on feature branches
- **Release Testing**: Complete validation before semantic release

### Production Environment

- **Renovate Workflow**: Real GitHub App authentication
- **Repository Operations**: Actual dependency scanning and PR creation
- **Cache Testing**: Persistent storage validation across runs

## Test Data and Fixtures

### Environment Variables

```bash
# GitHub Actions inputs (INPUT_* pattern)
INPUT_MILLISECONDS=500
INPUT_DRY_RUN=true
INPUT_LOG_LEVEL=debug
INPUT_RENOVATE_APP_ID=${{ secrets.APPLICATION_ID }}
INPUT_RENOVATE_APP_PRIVATE_KEY=${{ secrets.APPLICATION_PRIVATE_KEY }}
```

### GitHub App Credentials

- **Development**: Mock credentials for unit tests
- **CI/CD**: Real GitHub App secrets for self-testing
- **Production**: Full permissions for repository operations

### Docker Environment

- **Container**: `ghcr.io/renovatebot/renovate:${RENOVATE_VERSION}`
- **User**: Root access for file permission management
- **Cache**: `/tmp/renovate` with proper ownership handling

## Error Scenarios and Validation

### Common Failure Patterns

1. **Permission Issues**: Docker user/file ownership conflicts
2. **Authentication Failures**: Invalid GitHub App credentials
3. **Cache Corruption**: Stale or inaccessible cache data
4. **Configuration Errors**: Invalid Renovate settings

### Testing Error Conditions

```typescript
// Unit test error validation
test("throws invalid number", async () => {
  const input = Number.parseInt("foo", 10)
  await expect(wait(input)).rejects.toThrow("milliseconds not a number")
})

// Integration test error handling
test("handles missing credentials", () => {
  delete process.env.INPUT_RENOVATE_APP_ID
  expect(() => execFileSync(np, [ip], options)).toThrow()
})
```

### Self-Test Error Detection

- **GitHub App Token**: Validates successful token generation
- **Docker Execution**: Monitors container exit codes
- **Cache Operations**: Verifies file system permissions
- **Renovate Config**: Checks configuration parsing errors

## Performance and Reliability Testing

### Cache Performance

- **Cache Hit Rate**: Measures cache effectiveness across runs
- **Cache Size**: Monitors storage usage and cleanup
- **Cache Invalidation**: Tests major version upgrades

### Docker Performance

- **Image Pull Time**: Tracks container startup latency
- **Tool Installation**: Validates yq, Node.js, pnpm, yarn setup
- **File System Operations**: Tests permission changes and ownership

### GitHub API Limits

- **Rate Limiting**: Validates GitHub App quota management
- **Request Batching**: Tests efficient API usage patterns
- **Error Recovery**: Handles transient API failures

## Debugging and Troubleshooting

### Local Debugging

```bash
# Run with debug output
ACTIONS_STEP_DEBUG=true pnpm test

# Test specific scenarios
pnpm test -- --grep "integration"
```

### CI/CD Debugging

```yaml
# Enable debug logging in workflow
with:
  log-level: debug
  print-config: true
```

### Production Debugging

- **Workflow Logs**: GitHub Actions execution details
- **Renovate Logs**: Dependency scanning and PR creation
- **Cache Inspection**: File system state and permissions

## Best Practices

### Unit Testing

- Test pure functions in isolation
- Mock external dependencies (GitHub API, file system)
- Use descriptive test names and assertions
- Group related tests with `describe()` blocks

### Integration Testing

- Test complete user workflows
- Validate input/output protocols
- Use realistic test data and scenarios
- Verify error handling and edge cases

### Self-Testing

- Always use dry-run mode for safety
- Validate security constraints (repository owner)
- Monitor execution time and resource usage
- Implement proper error recovery and cleanup

### Continuous Improvement

- Monitor test execution time and reliability
- Add tests for reported bugs and edge cases
- Keep test dependencies updated with Renovate
- Review and update test strategies with major releases

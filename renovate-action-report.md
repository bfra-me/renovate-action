# Renovate Action - Technology Report

## 1. Overview of the Repository

The `renovate-action` repository provides a GitHub Action for running a self-hosted Renovate bot to keep dependencies up-to-date across GitHub repositories. The action is designed to be easily integrated into GitHub workflows, allowing for automated dependency management with customizable configuration.

## 2. Core Technologies

### Programming Languages

- **TypeScript**: The primary programming language used in the repository. TypeScript provides static typing on top of JavaScript, allowing for better code quality and developer experience.
  - Version: 5.8.3
  - Usage: Main source code in `src/` directory

- **YAML**: Used extensively for configuration files, including GitHub Actions workflows, the main action definition, and various configuration files.
  - Usage: `action.yaml`, GitHub workflow files, configuration files

- **Bash**: Used in shell scripts, particularly in the Docker entrypoint script.
  - Usage: `docker/entrypoint.sh`

### Build Tools

- **tsup**: A zero-config TypeScript bundler powered by esbuild, used to build the TypeScript code into JavaScript.
  - Version: 8.4.0
  - Configuration: `tsup.config.ts`
  - Features used:
    - ESM output format
    - Source maps
    - License generation
    - Declaration file generation

- **SWC**: A high-performance JavaScript/TypeScript compiler used through tsup.
  - Version: 1.11.22
  - Usage: Speeds up the TypeScript compilation process

- **ESBuild**: Ultrafast JavaScript bundler used by tsup.
  - Usage: Bundling dependencies and generating the final output

### Package Management

- **pnpm**: Fast, disk space efficient package manager used to manage Node.js dependencies.
  - Version: 10.9.0 (specified in package.json)
  - Configuration: `package.json`, `.npmrc`
  - Features used:
    - Efficient node_modules structure
    - Built-in monorepo support
    - Scripts management
    - Dependency specification

### Testing Framework

- **Vitest**: Next-generation testing framework compatible with Jest.
  - Version: 3.1.2
  - Usage: Unit tests in `src/__tests__/` directory
  - Features used:
    - Jest-compatible API
    - ESM support
    - Integration with TypeScript

## 3. GitHub Action Technologies

### Action Structure

- **Composite Action**: The action is defined as a composite action in `action.yaml`, which combines multiple steps into a single action.
  - Features used:
    - Inputs and outputs definition
    - Environment variables
    - Conditional execution
    - Step references
    - **Orchestration of Renovate Execution**: The composite action does not run Renovate directly. Instead, it prepares the environment (fetching a GitHub App token, configuring environment variables, managing cache) and then delegates the actual Renovate run to the official [`renovatebot/github-action`](https://github.com/renovatebot/github-action) by invoking it as a step. This ensures that Renovate is executed in a well-supported, up-to-date, and isolated environment, leveraging the official Docker image and best practices for GitHub Actions.
    - The composite action passes all necessary configuration, authentication, and environment details to the `renovatebot/github-action` step, ensuring seamless integration and execution.

- **GitHub Actions API**: The action uses the GitHub Actions toolkit for Node.js.
  - Package: `@actions/core` (v1.11.1)
  - Usage: Core functionality for inputs, outputs, logging, and errors

### Docker Integration

- **Docker**: The action uses Docker to run Renovate in a container.
  - Image: `ghcr.io/renovatebot/renovate`
  - Configuration: `docker/entrypoint.sh`, `action.yaml`
  - Features used:
    - Custom entrypoint script
    - Environment variable passing
    - Volume mounting for cache persistence

- **Docker Entrypoint Script**: The `docker/entrypoint.sh` script initializes the Docker container with the necessary tools:
  - **Tool Installation**: Installs and configures essential tools with specific versions:
    - YQ (YAML processor): v4.45.1 - Used for parsing and modifying YAML files
    - Node.js: v22.11.0 - Runtime environment for Renovate
    - PNPM: v10.9.0 - Package manager
    - Yarn: v4.9.1 - Package manager (alternative to NPM)
  - **Version Pinning**: All tool versions are explicitly pinned with Renovate-compatible annotations (`# renovate: datasource=...`) to ensure they can be automatically updated
  - **Runtime Setup**: Creates the `/tmp/renovate` directory for runtime files and adjusts permissions
  - **Execution**: Runs Renovate as the non-root `ubuntu` user for security best practices
  - **Environment Preparation**: Ensures all necessary tools are available for dependency management across different ecosystems

- **Renovate Configuration and Execution**: The action provides extensive configuration options that are passed to the Renovate bot:
  - **Repository Discovery**:
    - `autodiscover`: Controls whether to automatically find repositories to process
    - `autodiscover-filter`: JSON array for filtering which repositories to include
    - `branch`: Optional specific branch targeting for Renovate operations

  - **Execution Control**:
    - `dry-run`: When enabled, logs actions without making actual changes
    - `print-config`: Outputs fully-resolved configuration when enabled
    - `log-level`: Controls verbosity of logging (default: "info")

  - **Caching System**:
    - `cache`: Optional cache enabling for improved performance
    - Cache versioning based on Renovate major version
    - Cross-run persistence with GitHub Actions cache
    - Managed with `actions/cache/restore` and `actions/cache/save`

  - **Authentication Flow**:
    - Uses GitHub App authentication via `actions/create-github-app-token`
    - Configures Git author identity based on GitHub App
    - Ignores commits from specific authors to prevent loops

  - **Global Configuration**:
    - Predefined onboarding configuration using organization presets
    - Custom dependency dashboard footer with manual trigger option
    - Preconfigured list of allowed shell commands
    - Standardized onboarding PR structure and naming

  - **Execution Flow**:
    1. Authenticates via GitHub App credentials
    2. Generates configuration outputs for subsequent steps
    3. Manages caching (restore/prepare/save)
    4. Executes Renovate via the official Docker container
    5. Applies comprehensive environment configuration
    6. Reports Docker image and version information as outputs

- **Renovate**: The core technology that powers the dependency updates.
  - Version: 39.257.8 (specified in action.yaml)
  - Usage: Runs inside Docker container via the `renovatebot/github-action` step
  - Features used:
    - GitHub App authentication
    - Repository autodiscovery
    - Dependency update management

## 4. CI/CD Technologies

### GitHub Workflows

- **GitHub Actions**: Used for continuous integration and deployment.
  - Workflows defined in `.github/workflows/`
  - Key workflows:
    - `main.yaml`: Primary CI/CD pipeline
    - `renovate.yaml`: Runs Renovate on the repository itself
    - `scorecard.yaml`: Security scoring
    - `codeql-analysis.yaml`: Code security scanning

- **Testing the Composite Action**: The `main.yaml` workflow not only builds and tests the code, but also performs a self-test of the composite action:
  - After building and running unit tests, the workflow invokes the composite action itself (using the local codebase) in a real workflow step, passing in the required secrets and running Renovate in dry-run mode. This ensures that the action is exercised in a real-world context, verifying that it can correctly orchestrate Renovate via the `renovatebot/github-action` and handle all configuration, authentication, and environment setup as expected.
  - This self-test step is crucial for validating the end-to-end functionality of the composite action, beyond just unit and integration tests.

- **GitHub App Authentication**: Used for authenticating with GitHub.
  - Action: `actions/create-github-app-token`
  - Usage: Generates authentication tokens for Renovate

### Release Management

- **Semantic Release**: Automated version management and package publishing.
  - Version: 24.2.3
  - Configuration: `.releaserc.yaml`
  - Features used:
    - Automated versioning based on conventional commits
    - Changelog generation
    - Git tag management
    - GitHub release creation

- **Conventional Commits**: Used for standardized commit messages to automate versioning.
  - Format: `<type>[(scope)]: <description>`
  - Types used: feat, fix, docs, style, refactor, perf, test, chore, build, ci
  - Special significance: feat (minor), fix (patch), feat! (major)

## 5. Dependencies and Libraries

### Production Dependencies

- **@actions/core**: GitHub Actions toolkit for interacting with the GitHub Actions environment.
  - Version: 1.11.1
  - Usage: Core functionality for the GitHub Action

### Development Dependencies

- **ESLint and related plugins**: Used for linting TypeScript code.
  - Version: 9.25.1
  - Configuration: `eslint.config.ts`
  - Key plugins:
    - @bfra.me/eslint-config (v0.20.0)
    - eslint-plugin-prettier (v5.2.6)
    - eslint-plugin-no-only-tests (v3.3.0)
    - eslint-plugin-node-dependencies (v0.12.0)

- **Prettier**: Opinionated code formatter.
  - Version: 3.5.3
  - Configuration: `.prettierrc.yaml`
  - Integration: eslint-plugin-prettier for ESLint integration

- **Semantic Release plugins**:
  - @semantic-release/changelog (v6.0.3): Generates changelogs
  - @semantic-release/git (v10.0.1): Git integration
  - semantic-release-export-data (v1.1.0): Exports release data

- **TypeScript configuration**:
  - @bfra.me/tsconfig (v0.9.7): Base TypeScript configuration

## 6. Conclusion

The `renovate-action` repository leverages modern JavaScript/TypeScript technologies and practices:

- **TypeScript** for type-safe code
- **tsup/esbuild** for efficient and fast building
- **pnpm** for efficient package management
- **Vitest** for testing
- **GitHub Actions** for CI/CD and the action itself
- **Docker** for containerized execution
- **Semantic Release** for automated releases

The repository follows best practices for GitHub Actions development, including:
- Composite action structure
- Docker integration
- GitHub App authentication
- Comprehensive testing and linting
- Automated releases with semantic versioning

The technology choices reflect a modern, efficient, and maintainable approach to developing a GitHub Action, with strong emphasis on automation, type safety, and developer experience.

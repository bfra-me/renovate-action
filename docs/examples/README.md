# Template and Configuration Examples

This directory contains example workflow configurations demonstrating different ways to use the custom template functionality and global configuration features in the @bfra-me/renovate-action.

## Examples

### Basic Usage

- [`basic-renovate.yaml`](./basic-renovate.yaml) - Standard Renovate workflow with default templates
- [`templates-disabled.yaml`](./templates-disabled.yaml) - Renovate workflow with custom templates disabled

### Custom Templates

- [`custom-templates.yaml`](./custom-templates.yaml) - Example with custom PR and issue templates
- [`minimal-templates.yaml`](./minimal-templates.yaml) - Minimal custom template configuration
- [`advanced-templates.yaml`](./advanced-templates.yaml) - Advanced template configuration with debugging

### Global Configuration

- [`global-config-basic.yaml`](./global-config-basic.yaml) - Basic global configuration with onboarding customization
- [`global-config-advanced.yaml`](./global-config-advanced.yaml) - Advanced configuration with automerge and package rules
- [`global-config-environment.yaml`](./global-config-environment.yaml) - Environment-specific configuration using GitHub context
- [`global-config-security.yaml`](./global-config-security.yaml) - Security-focused configuration with vulnerability alerts

### Use Cases

- [`organization-setup.yaml`](./organization-setup.yaml) - Template for organization-wide Renovate setup
- [`development-workflow.yaml`](./development-workflow.yaml) - Development-focused template with detailed debugging

## Global Configuration Features

The global configuration examples demonstrate:

- **Onboarding Customization**: Configure the initial Renovate setup for repositories
- **Security-First Updates**: Prioritize vulnerability patches and security updates
- **Environment-Specific Rules**: Different behaviors for production vs development branches
- **Package-Specific Rules**: Custom handling for different dependency types
- **Automerge Strategies**: Safe automation for low-risk updates
- **Scheduling**: Control when updates are created and processed

## Testing Templates and Configuration

All examples are designed to work with the self-hosted @bfra-me Renovate action and can be used as starting points for your own configurations.

To test template and configuration changes:

1. Copy an example to your `.github/workflows/` directory
2. Configure your GitHub App credentials in repository secrets
3. Use `print-config: true` to debug template and configuration processing
4. Enable `dry-run: true` for safe testing
5. Start with basic configurations and add complexity gradually

## Security Considerations

When using global configuration:

- Protected fields like `allowedCommands` cannot be overridden
- All JSON configuration is validated before processing
- Invalid configurations fall back to safe defaults
- Use the security-focused example for high-security environments

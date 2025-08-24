# Template Usage Examples

This directory contains example workflow configurations demonstrating different ways to use the custom template functionality in the @bfra-me/renovate-action.

## Examples

### Basic Usage

- [`basic-renovate.yaml`](./basic-renovate.yaml) - Standard Renovate workflow with default templates
- [`templates-disabled.yaml`](./templates-disabled.yaml) - Renovate workflow with custom templates disabled

### Custom Templates

- [`custom-templates.yaml`](./custom-templates.yaml) - Example with custom PR and issue templates
- [`minimal-templates.yaml`](./minimal-templates.yaml) - Minimal custom template configuration
- [`advanced-templates.yaml`](./advanced-templates.yaml) - Advanced template configuration with debugging

### Use Cases

- [`organization-setup.yaml`](./organization-setup.yaml) - Template for organization-wide Renovate setup
- [`development-workflow.yaml`](./development-workflow.yaml) - Development-focused template with detailed debugging

## Testing Templates

All examples are designed to work with the self-hosted @bfra-me Renovate action and can be used as starting points for your own configurations.

To test template changes:

1. Copy an example to your `.github/workflows/` directory
2. Configure your GitHub App credentials in repository secrets
3. Use `print-config: true` to debug template processing
4. Enable `dry-run: true` for safe testing

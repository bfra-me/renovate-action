<h3 align="center">
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Renovate Action
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/renovate-action/releases/latest" title="Latest Release on GitHub"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/bfra-me/renovate-action?sort=semver&style=for-the-badge&logo=github&label=release"></a>
  <a href="https://github.com/renovatebot/renovate/releases/tag/42.32.1" title="Renovate release"><img alt="Renovate" src="https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-action%2Fmain%2Faction.yaml&query=%24.runs.steps.1.env.RENOVATE_VERSION&style=for-the-badge&logo=renovate&label=renovate&color=377D9D"></a>
  <a href="https://github.com/bfra-me/renovate-action/actions?query=workflow%main" title="Search GitHub Actions for Main workflow runs" ><img alt="GitHub Workflow Main Status" src="https://img.shields.io/github/actions/workflow/status/bfra-me/renovate-action/main.yaml?branch=main&style=for-the-badge&logo=github%20actions&logoColor=white&label=main"></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/bfra-me/renovate-action" title="View OpenSSF Scorecard"><img alt="OpenSSF Scorecard" src="https://api.securityscorecards.dev/projects/github.com/bfra-me/renovate-action/badge?style=for-the-badge"></a>
</p>

&nbsp;

<p align="center">
  This action runs a self-hosted Renovate bot to keep your dependencies up-to-date.
</p>

### Usage

Include the following workflow in your repository:

```yaml
# .github/workflows/renovate.yaml
---
name: Renovate

on:
  push:
    branches:
      - main
      # Remove this filter if Renovate is configured to automerge via PR
      - "renovate/**"
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: "0 */6 * * *" # Run every 6 hours

jobs:
  renovate:
    name: Renovate
    runs-on: ubuntu-latest
    steps:
      - uses: bfra-me/renovate-action@v7
        with:
          dry-run: ${{ github.event_name == 'pull_request' }}
          renovate-app-id: ${{ secrets.APPLICATION_ID }}
          renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

### Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `autodiscover` | Autodiscover all repositories | No | `false` |
| `autodiscover-filter` | Filter repositories to autodiscover | No | `[]` |
| `branch` | Run Renovate on this branch | No |  |
| `cache` | Enable the Renovate cache | No | `false` |
| `dry-run` | Perform a dry run by logging messages instead of creating/updating/deleting branches and PRs | No | `false` |
| `global-config` | Additional global configuration for Renovate as a JSON string. This will be merged with the default configuration while preserving security boundaries | No | `{}` |
| `log-level` | Set the log level | No | `info` |
| `print-config` | Log the fully-resolved Renovate config for each repository, plus fully-resolved presets | No | `false` |
| `renovate-app-id` | The ID of the GitHub App that will be used to run Renovate | Yes |  |
| `renovate-app-private-key` | The private key of the GitHub App that will be used to run Renovate | Yes |  |
| `pr-body-template` | Custom template for Renovate PR body content with placeholders for CI links and branding | No | \[Default template with @bfra-me branding\] |
| `pr-header` | Custom header content for Renovate PRs with CI build links and @bfra-me branding | No | \[Default header with CI links\] |
| `pr-footer` | Custom footer content for Renovate PRs with documentation links and @bfra-me signature | No | \[Default footer with docs\] |
| `dependency-dashboard-header` | Custom header content for the Renovate dependency dashboard issue with repository context and @bfra-me branding | No | \[Default dashboard header\] |
| `dependency-dashboard-footer` | Custom footer content for the Renovate dependency dashboard issue with action documentation links | No | \[Default dashboard footer\] |
| `enable-custom-templates` | Enable custom PR and issue templates with @bfra-me branding and CI integration | No | `false` |

### Template Functionality

This action includes custom PR and issue templates that enhance Renovate's output with:

- **CI Build Links**: Automatic links to GitHub Actions workflow runs
- **@bfra-me Branding**: Consistent branding across all Renovate-generated content
- **Documentation Links**: Quick access to relevant documentation and support resources
- **Repository Context**: Dynamic content based on the current repository and run

#### Template Variables

Templates support the following variables that are automatically substituted:

- `{{github.repository}}` - The current repository name (e.g., `bfra-me/renovate-action`)
- `{{github.run_id}}` - The current GitHub Actions run ID for CI link generation

#### Examples

**Basic Usage with Default Templates:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    enable-custom-templates: true
```

**Disable Custom Templates:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    # Templates are disabled by default
```

**Custom Template Content:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    enable-custom-templates: true
    pr-header: |
      🚀 **Automated Dependency Update for {{github.repository}}**

      [![CI Status](https://github.com/{{github.repository}}/actions/runs/{{github.run_id}}/badge.svg)](https://github.com/{{github.repository}}/actions/runs/{{github.run_id}})
    pr-footer: |
      ---
      🤖 **Generated by Your Custom Renovate Setup**
    dependency-dashboard-header: |
      📊 **Custom Dependency Dashboard for {{github.repository}}**

      This dashboard tracks all dependency updates for this repository.
```

#### Template Structure

The action provides five customizable template components:

1. **`pr-header`**: Appears at the top of every Renovate PR
2. **`pr-body-template`**: Replaces the main PR body content (supports Handlebars templating)
3. **`pr-footer`**: Appears at the bottom of every Renovate PR
4. **`dependency-dashboard-header`**: Appears at the top of the dependency dashboard issue
5. **`dependency-dashboard-footer`**: Appears at the bottom of the dependency dashboard issue

All templates support GitHub Actions context variable substitution and maintain backwards compatibility when disabled.

### Global Configuration

The `global-config` input allows you to provide additional Renovate configuration as a JSON string that will be securely merged with the action's default configuration. This feature enables customization of Renovate's behavior while maintaining security boundaries.

#### Basic Usage

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    global-config: |
      {
        "extends": ["config:base"],
        "prHourlyLimit": 2,
        "timezone": "America/New_York"
      }
```

#### Configuration Merging

Your configuration is deeply merged with the base configuration. This means:

- **Simple values** (strings, numbers, booleans) replace the base values
- **Objects** are merged recursively (e.g., `onboardingConfig`)
- **Arrays** replace the base arrays entirely
- **Security fields** are protected and cannot be overridden

#### Common Configuration Examples

**Customize Onboarding Configuration:**

```yaml
global-config: |
  {
    "onboardingConfig": {
      "extends": ["config:base", "group:allNonMajor"],
      "schedule": ["before 5am on Monday"],
      "labels": ["dependencies", "renovate"]
    }
  }
```

**Configure Rate Limiting and Scheduling:**

```yaml
global-config: |
  {
    "prHourlyLimit": 1,
    "prConcurrentLimit": 5,
    "schedule": ["after 10pm every weekday", "before 5am every weekday", "every weekend"],
    "timezone": "America/New_York"
  }
```

**Enable Auto-merge with Conditions:**

```yaml
global-config: |
  {
    "automerge": true,
    "automergeType": "pr",
    "automergeStrategy": "squash",
    "packageRules": [
      {
        "matchDepTypes": ["devDependencies"],
        "matchUpdateTypes": ["patch", "minor"],
        "automerge": true
      }
    ]
  }
```

**Complex Package Rules:**

```yaml
global-config: |
  {
    "packageRules": [
      {
        "matchManagers": ["npm"],
        "matchUpdateTypes": ["major"],
        "addLabels": ["breaking-change"],
        "automerge": false
      },
      {
        "matchPackageNames": ["@types/*"],
        "automerge": true,
        "schedule": ["at any time"]
      }
    ]
  }
```

#### Security Model

The action implements several security measures to ensure safe configuration merging:

- **Protected Fields**: Critical security fields like `allowedCommands` cannot be overridden
- **Input Validation**: All user-provided JSON is validated before processing
- **Fallback Behavior**: If validation fails, the action falls back to the base configuration
- **Merge Safety**: Deep merging preserves the security boundaries of the base configuration

**Protected Configuration Fields:**

- `allowedCommands` - Commands that Renovate is allowed to execute
- `platform` - Always set to "github"
- `gitAuthor` - Managed by the GitHub App configuration
- `gitIgnoredAuthors` - Managed by the action
- `cacheDir` - Set by the action's caching strategy

#### Validation and Error Handling

The action performs comprehensive validation of your global configuration:

1. **JSON Syntax Validation**: Ensures the provided JSON is well-formed
2. **Type Validation**: Verifies the configuration is a JSON object
3. **Security Validation**: Checks for attempts to override protected fields
4. **Merge Validation**: Validates the merged configuration before use

**Common Validation Errors:**

```yaml
# ❌ Invalid JSON syntax
global-config-invalid: '{ "extends": ["config:base" }'  # Missing closing bracket

# ❌ Not a JSON object
global-config-array: '["config:base"]'  # Array instead of object

# ❌ Attempting to override protected fields
global-config-protected: '{ "allowedCommands": ["npm audit"] }'  # Security violation
```

**Valid Configuration:**

```yaml
# ✅ Valid JSON object with proper syntax
global-config: |
  {
    "extends": ["config:base"],
    "labels": ["dependencies"],
    "commitMessagePrefix": "chore(deps): "
  }
```

#### Troubleshooting

**Configuration Not Applied:**

- Check GitHub Actions logs for JSON validation errors
- Ensure your JSON syntax is valid using a JSON validator
- Verify you're not trying to override protected fields

**Validation Errors:**

- Use `print-config: true` to see the resolved configuration
- Test your JSON locally before adding to the workflow
- Start with simple configurations and add complexity gradually

**Performance Considerations:**

- Large configurations may slow down the Configure step
- Consider splitting complex configurations into presets
- Use Renovate's preset system for reusable configurations

#### Advanced Usage

**Multi-line JSON with Comments (using YAML folded scalar):**

```yaml
global-config: |
  {
    "extends": ["config:base"],
    "packageRules": [
      {
        "matchManagers": ["npm"],
        "rangeStrategy": "bump"
      }
    ],
    "schedule": ["after 10pm every weekday"],
    "timezone": "America/New_York"
  }
```

**Environment-specific Configuration:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    global-config: |
      {
        "schedule": ${{ github.ref == 'refs/heads/main' && '["at any time"]' || '["after 10pm every weekday"]' }},
        "automerge": ${{ github.ref == 'refs/heads/main' && 'false' || 'true' }}
      }
```

For more configuration options, see the [Renovate Configuration Documentation](https://docs.renovatebot.com/configuration-options/).

### License

[MIT](LICENSE.md)

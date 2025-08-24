<h3 align="center">
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Renovate Action
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/renovate-action/releases/latest" title="Latest Release on GitHub"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/bfra-me/renovate-action?sort=semver&style=for-the-badge&logo=github&label=release"></a>
  <a href="https://github.com/renovatebot/renovate/releases/tag/41.82.1" title="Renovate release"><img alt="Renovate" src="https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-action%2Fmain%2Faction.yaml&query=%24.runs.steps.1.env.RENOVATE_VERSION&style=for-the-badge&logo=renovate&label=renovate&color=377D9D"></a>
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
| `log-level` | Set the log level | No | `info` |
| `print-config` | Log the fully-resolved Renovate config for each repository, plus fully-resolved presets | No | `false` |
| `renovate-app-id` | The ID of the GitHub App that will be used to run Renovate | Yes |  |
| `renovate-app-private-key` | The private key of the GitHub App that will be used to run Renovate | Yes |  |
| `pr-body-template` | Custom template for Renovate PR body content with placeholders for CI links and branding | No | [Default template with @bfra-me branding] |
| `pr-header` | Custom header content for Renovate PRs with CI build links and @bfra-me branding | No | [Default header with CI links] |
| `pr-footer` | Custom footer content for Renovate PRs with documentation links and @bfra-me signature | No | [Default footer with docs] |
| `dependency-dashboard-header` | Custom header content for the Renovate dependency dashboard issue with repository context and @bfra-me branding | No | [Default dashboard header] |
| `dependency-dashboard-footer` | Custom footer content for the Renovate dependency dashboard issue with action documentation links | No | [Default dashboard footer] |
| `enable-custom-templates` | Enable custom PR and issue templates with @bfra-me branding and CI integration | No | `true` |

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
    # Templates are enabled by default with @bfra-me branding
```

**Disable Custom Templates:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    enable-custom-templates: false
```

**Custom Template Content:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
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

**Advanced Configuration with Multiple Templates:**

```yaml
- uses: bfra-me/renovate-action@v7
  with:
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    pr-body-template: |
      ## 📦 Dependency Updates

      {{#if displayInstructions}}
      This PR contains dependency updates for {{github.repository}}.

      **CI Status:** [![Build](https://github.com/{{github.repository}}/actions/runs/{{github.run_id}}/badge.svg)](https://github.com/{{github.repository}}/actions/runs/{{github.run_id}})
      {{/if}}

      ### Changes
      {{#each updates as |update|}}
      - **{{update.depName}}**: {{update.displayFrom}} → {{update.displayTo}}
      {{/each}}
    print-config: true  # Useful for debugging template configuration
```

#### Template Structure

The action provides five customizable template components:

1. **`pr-header`**: Appears at the top of every Renovate PR
2. **`pr-body-template`**: Replaces the main PR body content (supports Handlebars templating)
3. **`pr-footer`**: Appears at the bottom of every Renovate PR
4. **`dependency-dashboard-header`**: Appears at the top of the dependency dashboard issue
5. **`dependency-dashboard-footer`**: Appears at the bottom of the dependency dashboard issue

All templates support GitHub Actions context variable substitution and maintain backwards compatibility when disabled.

### License

[MIT](LICENSE.md)

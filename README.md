<h3 align="center">
  Renovate Action
</h3>

<p align="center">
  Self-hosted Renovate orchestration with GitHub App auth.
</p>

## v9 status

- Renovate upgraded to **v43**.
- Docker-backed execution remains active in v9.
- Docker execution is now marked deprecated and planned for removal in v10.
- Action-level template/branding inputs removed.
- Analytics features removed.

## Usage

```yaml
# .github/workflows/renovate.yaml
---
name: Renovate

on:
  push:
    branches:
      - main
      - "renovate/**"
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: "0 */6 * * *"

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - uses: bfra-me/renovate-action@v9
        with:
          dry-run: ${{ github.event_name == 'pull_request' }}
          renovate-app-id: ${{ secrets.APPLICATION_ID }}
          renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

## Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `autodiscover` | Autodiscover all repositories | No | `false` |
| `autodiscover-filter` | Filter repositories to autodiscover | No | `[]` |
| `branch` | Run Renovate on this branch | No |  |
| `cache` | Enable the Renovate cache | No | `false` |
| `dry-run` | Perform a dry run by logging messages instead of creating/updating/deleting branches and PRs | No | `false` |
| `execution-mode` | v9 deprecation-scaffolding input. Docker mode remains active in v9. | No | `container` |
| `global-config` | Additional Renovate configuration merged with base config while preserving security boundaries | No | `{}` |
| `log-level` | Set the log level | No | `info` |
| `print-config` | Log fully-resolved Renovate config for each repository | No | `false` |
| `renovate-app-id` | GitHub App ID used to run Renovate | Yes |  |
| `renovate-app-private-key` | GitHub App private key used to run Renovate | Yes |  |

## Removed in v9

- `pr-body-template`
- `pr-header`
- `pr-footer`
- `dependency-dashboard-header`
- `dependency-dashboard-footer`
- `enable-custom-templates`
- `enable-analytics`
- `analytics-collection-level`

## Migration guidance

- Keep existing Docker-backed behavior in v9.
- Remove deleted template/analytics inputs from your workflows.
- Plan for Docker removal and direct CLI runtime in v10.

## License

[MIT](LICENSE.md)

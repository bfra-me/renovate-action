---
title: Usage
description: Current v9 guidance for running Renovate with GitHub App authentication.
---

## Workflow shape

Use the action from a scheduled or manually dispatched workflow. A push trigger can also run Renovate after changes land, and a pull-request trigger is useful with `dry-run` enabled.

```yaml
name: Renovate

on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - uses: bfra-me/renovate-action@v9
        with:
          renovate-app-id: ${{ secrets.APPLICATION_ID }}
          renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

The GitHub App ID and private key are required inputs. The action creates an installation token for the repository owner and passes it to Renovate. Install the App with access to the repositories that Renovate should manage.

The action currently configures Renovate `44.30.0`. The action definition is the authority for that version and for the complete input and output contract.

## Supported optional inputs

| Input | Purpose | Default |
| --- | --- | --- |
| `autodiscover` | Discover repositories instead of running only on the current repository. | `false` |
| `autodiscover-filter` | Filter repositories when autodiscovery is enabled. | `[]` |
| `branch` | Run Renovate against a specific base branch. | unset |
| `cache` | Enable the Renovate cache. | `false` |
| `dry-run` | Log changes without creating, updating, or deleting branches and pull requests. | `false` |
| `execution-mode` | v9 deprecation-scaffolding input. | `container` |
| `global-config` | Add Renovate configuration as a JSON object. | `{}` |
| `log-level` | Set the Renovate log level. | `info` |
| `print-config` | Log the fully resolved Renovate configuration. | `false` |

For a full input description, see [`action.yaml`](https://github.com/bfra-me/renovate-action/blob/main/action.yaml).

## GitHub App inputs

Pass the required credentials through encrypted GitHub Actions secrets:

```yaml
with:
  renovate-app-id: ${{ secrets.APPLICATION_ID }}
  renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

Do not place the private key directly in workflow YAML or in `global-config`.

## Global configuration and protected fields

`global-config` must be valid JSON whose top-level value is an object. The action merges it with its base Renovate configuration. `onboardingConfig` is merged with the base onboarding configuration; other supplied top-level values are applied to the base configuration, with arrays replaced by the supplied arrays.

The following boundaries are enforced by the action and cannot be changed through `global-config`:

- `allowedCommands`
- `platform`
- `gitAuthor`
- `gitIgnoredAuthors`
- `cacheDir`
- `repositoryCache`

Invalid JSON or a non-object value causes the action to use the base configuration instead of the supplied value. See the merge and validation logic in [`action.yaml`](https://github.com/bfra-me/renovate-action/blob/main/action.yaml) for the authoritative behavior.

## Docker execution in v9

Docker-backed execution remains active in v9, and `execution-mode` defaults to `container`. Other execution-mode values are not supported in v9 and fall back to container mode with a warning. Docker-based action execution is deprecated and is planned for removal in v10; this guide does not specify behavior for v10.

The container setup and tool installation behavior is defined by [`docker/entrypoint.sh`](https://github.com/bfra-me/renovate-action/blob/main/docker/entrypoint.sh).

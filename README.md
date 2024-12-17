<h3 align="center">
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Renovate Action
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/renovate-action/releases/latest" title="Latest Release on GitHub"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/bfra-me/renovate-action?sort=semver&style=for-the-badge&logo=github&label=release"></a>
  <a href="https://github.com/renovatebot/renovate/releases/tag/39.72.0" title="Renovate release"><img alt="Renovate" src="https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-action%2Fmain%2Faction.yaml&query=%24.runs.steps.1.env.RENOVATE_VERSION&style=for-the-badge&logo=renovate&label=renovate&color=377D9D"></a>
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
      - 'renovate/**'
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *' # Run every 6 hours

jobs:
  renovate:
    name: Renovate
    runs-on: ubuntu-latest
    steps:
      - uses: bfra-me/renovate-action@v5
        with:
          dry-run: ${{ github.event_name == 'pull_request' }}
          renovate-app-id: ${{ secrets.APPLICATION_ID }}
          renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

### License

[MIT](LICENSE.md)

<h3 align="center">
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Renovate Action
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/renovate-action/releases/latest" title="Latest Release on GitHub"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/bfra-me/renovate-action?sort=semver&style=for-the-badge&logo=github&label=release"></a>
  <a href="https://github.com/renovatebot/renovate/releases/tag/37.326.2" title="Renovate release"><img alt="Renovate" src="https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-action%2Fmain%2Faction.yaml&query=%24.runs.steps.0.env.RENOVATE_VERSION&style=for-the-badge&logo=renovatebot&label=renovate&color=377D9D"></a>
  <a href="https://github.com/bfra-me/renovate-action/actions?query=workflow%3Aci" title="Search GitHub Actions for CI workflow runs" ><img alt="GitHub Workflow CI Status" src="https://img.shields.io/github/actions/workflow/status/bfra-me/renovate-action/ci.yaml?branch=main&style=for-the-badge&logo=github%20actions&logoColor=white&label=ci"></a>
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

'on':
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
      - uses: bfra-me/renovate-action@v3
        with:
          dry_run: ${{ github.event_name == 'pull_request' }}
          renovate_app_id: ${{ secrets.APPLICATION_ID }}
          renovate_app_pem: ${{ secrets.APPLICATION_PRIVATE_KEY }}
          renovate_app_slug: 'fro-bot'
```

### License

[MIT](LICENSE.md)

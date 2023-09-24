<h3 align="center">
  <img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Renovate Action
  <img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/renovate-action/releases/latest" title="Latest Release on GitHub"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/bfra-me/renovate-action?sort=semver&style=for-the-badge&logo=github&label=release"></a>
  <a href="https://github.com/renovatebot/renovate/releases/tag/36.96.5" title="Renovate release">
    <img alt="Renovate" src="https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-config%2Fmain%2F.github%2Fworkflows%2Frenovate.yaml&query=%24.env.RENOVATE_VERSION&style=for-the-badge&logo=renovatebot&label=renovate&color=377D9D">
  </a>
  <a href="https://github.com/bfra-me/github-action/actions?query=workflow%3Aci" title="Search GitHub Actions for CI workflow runs" >
    <img alt="GitHub Workflow CI Status" src="https://img.shields.io/github/actions/workflow/status/bfra-me/github-action/ci.yaml?branch=main&style=for-the-badge&logo=github%20actions&logoColor=white&label=ci">
  </a>
</p>

&nbsp;

<p align="center">
  This action runs a self-hosted Renovate bot to keep your dependencies up-to-date.
</p>

### Reusable Workflow

To reuse the workflow from this repository, add it to your GitHub Actions workflow:

```yaml
- name: Renovate
  uses: bfra-me/renovate-config/.github/workflows/renovate.yaml@v1.24.0
  with:
    dry_run: false
    renovate_git_author: 'fro-bot[bot] <109017866+fro-bot[bot]@users.noreply.github.com>'
    renovate_username: 'fro-bot[bot]'
  secrets:
    APPLICATION_ID: ${{ secrets.APPLICATION_ID }}
    APPLICATION_PRIVATE_KEY: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

### License

[MIT](LICENSE.md)

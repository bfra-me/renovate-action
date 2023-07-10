# bfra-me/renovate-config

<div align='center'>

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/bfra-me/renovate-config?sort=semver&style=for-the-badge&logo=github&label=release)][release] [![Renovate](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbfra-me%2Frenovate-config%2Fmain%2F.github%2Fworkflows%2Frenovate.yaml&query=%24.env.RENOVATE_VERSION&style=for-the-badge&logo=renovatebot&label=renovate&color=377D9D)][renovate] [![GitHub Workflow CI Status](https://img.shields.io/github/actions/workflow/status/bfra-me/renovate-config/ci.yaml?branch=main&style=for-the-badge&logo=github%20actions&logoColor=white&label=ci)][ci-workflow]

</div>

[release]: https://github.com/bfra-me/renovate-config/releases 'GitHub release'
[renovate]: https://github.com/renovatebot/renovate/releases/tag/35.159.3 'Renovate release'
[ci-workflow]: https://github.com/bfra-me/renovate-config/actions?query=workflow%3Aci 'Search GitHub Actions for CI workflow runs'

This repository contains [Renovate](https://renovatebot.com/) configuration presets used by [bfra.me](https://bfra.me) projects. It also hosts a reusable [GitHub Actions workflow](.github/workflows/renovate.yaml) that runs Renovate on a schedule.

## Usage

```json
{
  "extends": ["github>bfra-me/renovate-config#v1.7.14"]
}
```

## Reusable Workflow

To reuse the workflow from this repository, add it to your GitHub Actions workflow:

```yaml
- name: Renovate
  uses: bfra-me/renovate-config/.github/workflows/renovate.yaml@v1.7.14
  with:
    dry_run: false
    renovate_git_author: 'fro-bot[bot] <109017866+fro-bot[bot]@users.noreply.github.com>'
    renovate_username: 'fro-bot[bot]'
  secrets:
    APPLICATION_ID: ${{ secrets.APPLICATION_ID }}
    APPLICATION_PRIVATE_KEY: ${{ secrets.APPLICATION_PRIVATE_KEY }}
```

## License

[MIT](LICENSE.md)

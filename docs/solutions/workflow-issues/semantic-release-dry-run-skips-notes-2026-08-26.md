---
title: A green semantic-release check does not prove changelog generation ran
date: 2026-08-26
category: workflow-issues
module: .releaserc.yaml
problem_type: workflow_issue
component: development_workflow
applies_when:
  - Upgrading semantic-release, conventional-changelog, or preset dependencies
  - Judging whether a green Release check verified changelog rendering
  - Changing .releaserc.yaml preset configuration
severity: high
related_components:
  - .github/workflows/main.yaml
  - pnpm-workspace.yaml
  - conventional-changelog-conventionalcommits
tags:
  - semantic-release
  - changelog
  - release
  - dry-run
  - conventional-commits
  - renovate
  - ci
---

## Context

The `release` job runs on pull requests as well as pushes to `main`:

```yaml
env:
  DRY_RUN: ${{ github.ref_name != github.event.repository.default_branch }}
...
pnpm semantic-release --dry-run ${{ env.DRY_RUN }} --ci ${{ env.DRY_RUN != 'true' }}
```

semantic-release really does execute, which makes a green `Release` check look like verification. It usually isn't. Commit analysis runs first, and when nothing warrants a release it stops here:

```text
[@semantic-release/commit-analyzer] › ℹ  Analysis of 2 commits complete: no release
```

`generateNotes` is never called. Anything that breaks changelog rendering passes CI untouched. The same gap exists on `main` — a push whose commits are all `chore`/`docs` exercises nothing.

## Guidance

Call `generateNotes` directly, with the repo's real `.releaserc.yaml` and installed dependencies, against synthetic commits that _do_ warrant a release:

```js
import fs from 'node:fs'
import YAML from './node_modules/yaml/dist/index.js'

const rc = YAML.parse(fs.readFileSync('.releaserc.yaml', 'utf8'))
const {generateNotes} = await import('@semantic-release/release-notes-generator')

const commits = [
  {hash: 'a'.repeat(40), message: "fix(docker): install yq outside Containerbase's bin"},
  {hash: 'b'.repeat(40), message: 'skip: merge (628f85a8) [skip release]'},
  {hash: 'c'.repeat(40), message: 'chore(deps): update vitest'},
]

console.log(
  await generateNotes(
    {preset: rc.preset, presetConfig: rc.presetConfig},
    {
      commits,
      logger: {log() {}, error() {}},
      cwd: process.cwd(),
      lastRelease: {version: '10.22.0', gitTag: '10.22.0'},
      nextRelease: {version: '10.22.1', gitTag: '10.22.1'},
      options: {repositoryUrl: 'https://github.com/bfra-me/renovate-action'},
    },
  ),
)
```

Pass criteria — all three, not just the first two:

- output contains `### Bug Fixes`
- output contains `### Miscellaneous Chores`
- output does **not** contain `merge (628f85a8)`

The `skip:` commit is the load-bearing one. The release job generates those on every release, so if suppression breaks they pollute every changelog.

When a dependency override is involved, confirm it actually changed the installed resolution before trusting any of the above:

```bash
node -e "const fs=require('fs');for(const m of ['conventional-changelog-writer','conventional-changelog-conventionalcommits'])console.log(m,JSON.parse(fs.readFileSync('node_modules/'+m+'/package.json','utf8')).version)"
```

## Why This Matters

Renovate PR #3685 bumped `conventional-changelog-conventionalcommits` from `9.3.1` to `10.4.0`. v10 requires `conventional-changelog-writer@9+`, but `@semantic-release/release-notes-generator@14.1.1` — the latest release — pins `^8.0.0`. Generating notes throws:

```text
Missing helper: "conventional-changelog-conventionalcommits requires conventional-changelog-writer@9 or newer (conventional-changelog@8 or newer). Your changelog tooling loaded an older writer which cannot render this preset. Update the tooling or use an older major version of the preset."
```

Its `Release` check was SUCCESS and the PR was mergeable. Only a manual `generateNotes` run against the PR branch's own lockfile caught it.

A second defect rode along invisibly. v10 replaced the `hidden` type property with `effect`, so this:

```yaml
- type: skip
  hidden: true
```

is silently ignored under v10 and had to become:

```yaml
- type: skip
  effect: hidden
```

The migration is version-locked in both directions — `effect: hidden` is likewise ignored by v9 — so there is no config that works across the boundary. Getting it backwards fails silently either way.

Both were fixed in that PR (merge `d1582cf0`), together with a `conventional-changelog-writer: ^9.2.1` override in `pnpm-workspace.yaml`. Drop that override once `@semantic-release/release-notes-generator` depends on writer 9 — an override that no longer changes resolution is dead weight that Renovate will churn against.

## When to Apply

Run the probe whenever changelog-related dependencies, `.releaserc.yaml` preset configuration, or release tooling changes. A green dry run over non-release commits exercises neither note generation nor changelog rendering, so it is not a substitute.

As of 2026-08-26 the v10 preset still has not generated a real changelog on `main` — every commit merged since the migration has been `chore` or `docs`. The first production exercise is still pending.

## Examples

### Don't chase `whatBump`

`@semantic-release/commit-analyzer` does not consult the preset's `whatBump`. Release levels come from `analyzeCommits.releaseRules` alone, so preset `effect` values do not affect them. Verified unchanged across the v10 bump:

| Commit           | Release                                   |
| ---------------- | ----------------------------------------- |
| `feat: …`        | minor                                     |
| `fix: …`         | patch                                     |
| `build: …`       | patch                                     |
| `chore(deps): …` | none                                      |
| `docs: …`        | none (patch only when scoped `readme.md`) |
| `skip: …`        | none                                      |

This matters because v10's `effect` field _looks_ like it controls version bumps — `bump`, `changelog`, `hidden` — and in a plain conventional-changelog setup it does. Under semantic-release it does not.

## Related

- [`self-test-runs-only-after-merge-2026-08-26.md`](./self-test-runs-only-after-merge-2026-08-26.md) — the other check in this repo that doesn't prove what it appears to, for a different reason
- [#3685](https://github.com/bfra-me/renovate-action/pull/3685) — the near-miss and its fix

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-20 **Commit:** 7f55776a **Branch:** main

## OVERVIEW

Composite GitHub Action that runs self-hosted Renovate in Docker with GitHub App auth. Runtime logic lives in `action.yaml` shell steps and `docker/entrypoint.sh`, not TypeScript.

## STRUCTURE

```text
./
├── action.yaml        # THE core runtime — config merging, Docker orchestration
├── docker/            # entrypoint.sh — tool installation (yq, node, bun, pnpm, yarn)
├── src/               # Scaffold TS — wait utility, not actual action logic
├── dist/              # Bundled output (committed, verified in CI)
├── docs/              # Astro/Starlight docs site (separate workspace package)
├── .github/workflows/ # 9 workflows — CI, release, Renovate, security, bot agents
└── .github/           # Renovate config, path filters, CODEOWNERS, copilot-instructions
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Action behavior | `action.yaml` | Config merging, Docker setup, cache, all inputs/outputs |
| Docker tool setup | `docker/entrypoint.sh` | Installs yq, Node.js, Bun, pnpm, Yarn; runs Renovate as ubuntu user |
| Config security | `action.yaml` → `validate_json()`, `merge_global_config()` | Protected fields: `allowedCommands`, `platform`, `gitAuthor`, `gitIgnoredAuthors`, `cacheDir`, `repositoryCache` |
| CI pipeline | `.github/workflows/main.yaml` | setup → check/test → build → build-docs → release |
| Release flow | `.github/workflows/main.yaml` → `release` job | Merges main→release branch, semantic-release, pushes major tag |
| Renovate self-config | `.github/renovate.json5` | Extends `bfra-me/renovate-config#v4`, custom managers, post-upgrade tasks |
| Path filtering | `.github/filters.yaml` | Controls which CI jobs run based on changed paths |
| Docs site | `docs/` | Astro/Starlight — separate pnpm workspace package |
| Agent instructions | `.github/copilot-instructions.md` | Golden rules for Copilot + Fro Bot collaboration |

## CODE MAP

| Symbol/File | Type | Role |
| --- | --- | --- |
| `action.yaml` | Composite Action | Entire action definition — inputs, config merge, Docker execution, caching |
| `docker/entrypoint.sh` | Shell Script | Docker container setup — tool installs, analytics, Renovate execution |
| `src/main.ts` | TS Entry | Scaffold — `@actions/core` wait utility (not used by composite action) |
| `src/wait.ts` | TS Module | Promise-based timer (scaffold) |
| `dist/index.js` | Bundle | tsup output of src/ — committed artifact |

## CONVENTIONS

- **Package manager**: pnpm only. Never npm/yarn.
- **ESM-only**: No `require()` or `module.exports`.
- **Action pins**: External workflow actions pinned to **full commit SHAs** with version comment.
- **Renovate annotations**: `# renovate: datasource=... depName=...` on version lines for auto-updates.
- **Commits**: Conventional commits (`feat`, `fix`, `build`, `chore`, etc.). Semantic commit types vary by update severity for Renovate deps.
- **Shell**: `bash -Eeuo pipefail` in all workflow and action shell steps.
- **Type safety**: Strict — no `any`, `@ts-ignore`, `@ts-expect-error`.
- **Hooks**: `simple-git-hooks` + `lint-staged` via `postinstall`. No `pre-push` hooks (interferes with Renovate automation).
- **Release**: `main` → merge to `release` branch → `semantic-release` → pushes major version branch (`v9`).
- **Workspace**: pnpm workspace — root + `docs/`.

## ANTI-PATTERNS (THIS PROJECT)

- **Never override protected config fields** — `allowedCommands`, `platform`, `gitAuthor`, `gitIgnoredAuthors`, `cacheDir`, `repositoryCache` are security boundaries in config merging.
- **Never use `pull_request_target`** unless explicitly justified in PR body.
- **Never pass untrusted user content into shell evaluation**.
- **Never add `pre-push` hooks** to agent automation workflows.
- **No dist drift** — if `src/` changes, rebuild `dist/` with `pnpm build` and commit artifacts. CI verifies this.
- **No dependency sprawl** — minimize added packages.

## UNIQUE STYLES

- `zzglobal_config` env var in `action.yaml` — stores base Renovate config as inline JSON in the step's `env` block (the `zz` prefix is intentional naming).
- Docker entrypoint includes analytics/metrics collection via inline Node.js scripts (`record_docker_metric`, `record_failure`).
- Self-test step in CI uses `./` to test the action in its own workflow.
- Multi-agent collaboration: Copilot and Fro Bot have a documented handoff protocol in copilot-instructions.

## COMMANDS

```bash
pnpm bootstrap          # Install deps (prefer-offline)
pnpm build              # tsup bundle + workspace builds
pnpm check              # Type-check + lint + docs check
pnpm test               # vitest run
pnpm dev                # tsup watch mode
pnpm fix                # eslint --fix
pnpm check-types        # tsc --noEmit
pnpm lint               # eslint
```

## NOTES

- `src/` TypeScript is scaffold code (wait utility from GitHub Action template). The actual action logic is entirely in `action.yaml` shell steps and `docker/entrypoint.sh`.
- Docker execution is **deprecated in v9**, planned for removal in v10. The `execution-mode` input is scaffolding for this deprecation.
- The `release` job uses a dedicated `release` branch — it merges `main` into `release`, runs semantic-release there, then pushes the major version branch.
- Cache system: Uses GitHub Actions cache with key `renovate-cache-v{MAJOR}`. Cache is deleted and re-saved on push events.
- The action wraps `renovatebot/github-action` — it doesn't run Renovate directly.

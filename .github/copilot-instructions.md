# Copilot Instructions for `bfra-me/renovate-action`

Start here before any changes:

1. `.github/copilot-instructions.md` (this file)
2. `README.md`
3. `action.yaml`
4. `.github/workflows/main.yaml`
5. `.github/workflows/fro-bot.yaml` and `.github/workflows/fro-bot-autoheal.yaml`

## What this repository is

This is a composite GitHub Action that runs self-hosted Renovate in Docker, using GitHub App authentication. Most runtime behavior is in `action.yaml` shell steps, not TypeScript source.

## Golden rules

- Use `pnpm`, not npm/yarn.
- Keep ESM-only patterns. Do not introduce `require()` or `module.exports`.
- Keep type safety strict. Do not use `any`, `@ts-ignore`, or `@ts-expect-error`.
- Keep external workflow actions pinned to full commit SHAs.
- Preserve security boundaries in config merging.
- This repo uses `simple-git-hooks` + `lint-staged` via `postinstall`. Do not add or enforce `pre-push` hooks for agent workflows. Pre-push hooks can interfere with Renovate automation in downstream repositories.

## High-risk areas

### 1) Config merge security in `action.yaml`

The `Configure` step merges user `global-config` with a protected base config. Do not allow user config to override security-sensitive fields.

Must remain protected:

- `allowedCommands`
- `platform`
- `gitAuthor`
- `gitIgnoredAuthors`
- `cacheDir`
- `repositoryCache`

### 2) Dist drift

If `src/` behavior changes and generated output should change, regenerate `dist/` with `pnpm build` and include the updated artifacts.

### 3) Workflow safety

- Do not use `pull_request_target` unless explicitly justified in PR body.
- Do not pass untrusted user content into shell evaluation.
- Use minimum required permissions on jobs.

## Verification commands

Run these after changes:

```bash
pnpm bootstrap
pnpm build
pnpm check
pnpm test
```

If workflow files changed, also validate YAML locally:

```bash
node --input-type=module -e "import { load } from 'js-yaml'; import { readFileSync, existsSync } from 'node:fs'; for (const f of ['.github/workflows/main.yaml', '.github/workflows/renovate.yaml', '.github/workflows/fro-bot.yaml', '.github/workflows/fro-bot-autoheal.yaml', '.github/workflows/copilot-setup-steps.yaml']) { if (existsSync(f)) { load(readFileSync(f, 'utf8')); console.log(f + ': OK'); } }"
```

## Copilot ↔ Fro Bot collaboration contract

Both agents are first-class collaborators in this repo.

### Fro Bot strengths

- Autonomous GitHub-native maintenance via `.github/workflows/fro-bot.yaml`
- Daily/periodic repo health and autoheal workflows
- Multi-step issue/PR triage and remediation

### Copilot coding agent strengths

- Fast issue-to-PR implementation loops
- Tight branch-focused coding tasks
- Interactive PR follow-ups with `@copilot`

### Required interoperability behavior

When a task is started by one agent and continued by the other:

1. Read prior issue/PR context first.
2. Preserve acceptance criteria and constraints.
3. Do not restart solved analysis; continue from existing findings.
4. Keep commits scoped to the active root cause.
5. Include a handoff note in issue/PR comments describing:
   - what is done
   - what remains
   - exact verification status

### Delegation paths

- Copilot can trigger Fro Bot for broader maintenance/research by asking a maintainer (or automation) to run:

```bash
gh workflow run .github/workflows/fro-bot.yaml \
  -f prompt='Investigate and propose fixes for flaky CI in main.yaml. Create one issue summary only; no code changes.'
```

- Fro Bot can hand implementation tasks to Copilot by creating/updating a scoped issue and assigning `copilot`.

### Do/Don't examples for collaboration

Do:

- Continue partial work from Fro Bot issue comments instead of rewriting plan.
- Use the same acceptance checklist in follow-up Copilot PRs.
- Keep one root cause per PR.
- Keep prompts single-objective, testable, and explicit about output target.

Don't:

- Open a second PR for the same root cause while one is active.
- Change dependency versions for non-security reasons in autoheal contexts.
- Weaken tests, lint, or security guards just to make CI green.
- Add `pre-push` hook enforcement to agent automation workflows.

## GitHub CLI playbook for handoffs

Create bounded issue for Copilot from Fro Bot findings:

```bash
gh issue create \
  --title "Fix: <single root cause>" \
  --body "## Task
<objective>

## Constraints
- Follow .github/copilot-instructions.md
- Preserve config security boundaries
- No new dependencies unless required

## Verification
- pnpm bootstrap
- pnpm build
- pnpm check
- pnpm test" \
  --assignee copilot
```

Request Fro Bot investigation from Copilot context:

```bash
gh workflow run .github/workflows/fro-bot.yaml \
  -f prompt='Investigate stale failing PRs and create one Daily Maintenance Report update. No direct code changes.'
```

## Repo-specific quality bar

- Keep conventional commit intent in commit messages.
- Keep docs and workflow examples aligned with actual behavior.
- Preserve existing runner/tooling conventions used in workflows (`pnpm bootstrap`, SHA pins, minimal permissions).

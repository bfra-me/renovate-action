---
title: The self-test runs only after action changes merge to the default branch
date: 2026-08-26
category: workflow-issues
module: .github/workflows/main.yaml
problem_type: workflow_issue
component: development_workflow
applies_when:
  - Changing action.yaml or anything under docker/**
  - Judging whether a green pull request verified the action's runtime
  - Considering making the self-test run on pull requests
severity: high
related_components:
  - action.yaml
  - docker/entrypoint.sh
  - .github/filters.yaml
tags:
  - self-test
  - github-actions
  - pull-request
  - secrets
  - security
  - ci
---

## Context

This repository's runtime is `action.yaml` shell steps plus `docker/entrypoint.sh`. The `src/` TypeScript is unused scaffold, so `pnpm test` and `pnpm check` exercise none of the action's actual behavior.

The only end-to-end verification is the `Self-test` step, which lives in the **`test` job** of `.github/workflows/main.yaml` — not `build` — and runs `uses: ./` against a live Renovate container:

```yaml
- if: github.repository_owner == 'bfra-me' && github.event_name == 'push' && github.ref_name == github.event.repository.default_branch && needs.setup.outputs.action-self-test-changed == 'true'
  name: Self-test
  uses: ./
  with:
    dry-run: true
    log-level: debug
    renovate-app-id: ${{ secrets.APPLICATION_ID }}
    renovate-app-private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}
    print-config: true
```

`github.event_name == 'push'` plus the default-branch check means it **never runs on a pull request**. A fully green PR proves nothing about the action's runtime.

## Guidance

Verify runtime changes yourself before merging. Post-merge CI is confirmation, not discovery.

1. **Probe the pinned image, never `latest`.** Read the pin from `action.yaml`:

   ```yaml
   RENOVATE_VERSION: 44.45.3 # renovate: datasource=docker depName=renovate packageName=ghcr.io/renovatebot/renovate versioning=semver
   ```

2. **Run probes as the user Renovate runs as.** The entrypoint starts as root and drops to `ubuntu` via `runuser`. Probing as root hides every permission bug:

   ```bash
   runuser -u ubuntu -- <command>
   ```

3. **Build an isolation matrix.** Vary one thing per row so the causal variable is unambiguous. From the Bun `EACCES` investigation:

   | Setup                                               | `install-tool bun 1.3.14` as `ubuntu` |
   | --------------------------------------------------- | ------------------------------------- |
   | Stock image                                         | exit 0                                |
   | Root start + `runuser -u ubuntu`, no manual install | exit 0                                |
   | Root start + the entrypoint's manual install first  | EACCES                                |

4. **After merge, read the log — not the check mark.**

   ```bash
   gh run list --branch main --limit 5 --json databaseId,headSha,workflowName,status
   tid=$(gh run view <run-id> --json jobs --jq '.jobs[] | select(.name=="Test") | .databaseId')
   gh api repos/bfra-me/renovate-action/actions/jobs/$tid --jq '.steps[] | "\(.conclusion)\t\(.name)"'
   gh run view <run-id> --log --job $tid | grep -iE "installing|succeeded"
   ```

## Why This Matters

The gate is a credential boundary, not an oversight. Do not remove it to make the self-test run on pull requests.

The self-test consumes `secrets.APPLICATION_ID` and `secrets.APPLICATION_PRIVATE_KEY` — GitHub App credentials. Same-repository (non-fork) PR branches receive full repository and organization secrets by default. Running `uses: ./` at a PR merge commit would execute PR-authored composite-action code with those credentials in scope. The changed-files filter is not a trust boundary: if it evaluates true, the code runs.

The deliberate trade is pre-merge verification for credential safety. The cost is real — `action.yaml` and `docker/**` changes get their first credentialed, live-container execution only after merge — and local probing is what buys it back.

## When to Apply

The `action-self-test-changed` filter in `.github/filters.yaml` selects exactly:

```yaml
action-self-test-changed:
  - action.yaml
  - docker/**
```

Those two paths need local verification. Nothing else triggers the self-test — `src/**` exercises scaffold tests, `docs/**` triggers nothing.

## Examples

### The job-versus-step trap

The `test` job's own condition is looser than the step's:

```yaml
if: ${{ github.event_name == 'push' || needs.setup.outputs.src-changed == 'true' }}
```

So `Test ✓` on a pull request means the job ran, not that the self-test ran. Observed:

| PR    | Change      | `Test` job | `Self-test` step                                 |
| ----- | ----------- | ---------- | ------------------------------------------------ |
| #3689 | docs only   | SKIPPED    | did not run                                      |
| #3690 | `docker/**` | SUCCESS    | **did not run** — step-level push gate failed    |
| #3686 | `docker/**` | SUCCESS    | did not run; first executed post-merge on `main` |

PR #3686 is the cautionary one. It changed the Bun install path in `docker/entrypoint.sh`, went green, and merged. The self-test only then produced the first real evidence:

```text
Installing Bun 1.4.0...
INFO: Install tool bun succeeded in 1.2s.
✅ Bun installation completed successfully
```

### Worked probe

```bash
docker run --rm --user root --entrypoint bash ghcr.io/renovatebot/renovate:44.45.3 -c '
  <replicate the entrypoint step under test, as root>
  runuser -u ubuntu -- <the command Renovate will actually run>
  echo "EXIT=$?"'
```

Record exit status and exact error text per matrix row. One variable per run.

## Related

- [`../runtime-errors/bun-install-tool-permission-denied-2026-08-26.md`](../runtime-errors/bun-install-tool-permission-denied-2026-08-26.md) — the bug found by this practice; its isolation matrix is the worked example above
- [`semantic-release-dry-run-skips-notes-2026-08-26.md`](./semantic-release-dry-run-skips-notes-2026-08-26.md) — the release pipeline has a separate check that also doesn't prove what it appears to
- [#3686](https://github.com/bfra-me/renovate-action/pull/3686), [#3690](https://github.com/bfra-me/renovate-action/pull/3690) — runtime changes whose PR CI proved nothing
- `docs/brainstorms/2026-08-24-trusted-action-self-test-requirements.md` — the trust-boundary requirements this gate implements

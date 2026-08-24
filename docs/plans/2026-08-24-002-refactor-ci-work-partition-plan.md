---
title: refactor: partition CI validation work
type: refactor
status: active
date: 2026-08-24
origin: docs/brainstorms/2026-08-24-trusted-action-self-test-requirements.md
deepened: 2026-08-24
---

## Overview

Reduce duplicated GitHub Actions runner work reported in #3543 without weakening validation. Keep generic checks, action artifact validation, and Docs deployment as separate responsibilities instead of repeatedly running the recursive workspace build and preview server. Correct the discovered self-test trust-boundary regression by running the credentialed local-action integration check only after reviewed action-runtime changes reach protected `main` (see origin: `docs/brainstorms/2026-08-24-trusted-action-self-test-requirements.md`).

## Problem Frame

The prior `Main` workflow installed dependencies in `setup` even though each downstream job runs on a fresh runner and installs dependencies again. `check` also ran the recursive `pnpm build` and started a Docs preview server, while `build` rebuilt `dist/` and `build-docs` separately built Astro. Ten August 24 push runs consumed 379 seconds installing dependencies and 148 seconds building across those jobs. The partially completed partition has removed the redundant `setup` install; the remaining work corrects the trusted self-test gate before the branch can ship.

## Requirements Trace

- R1. Keep `setup` free of dependency installation while retaining its path-filter and Node-version outputs.
- R2. Keep static checks, Vitest, action `dist/` drift validation, Docs production build, and release artifact preparation covered by explicit jobs.
- R3. Ensure the action bundle and Docs site use distinct build commands so one job does not silently build the other artifact.
- R4. Run the credentialed action self-test only for protected-`main` pushes affecting `action.yaml` or `docker/**`; pull requests retain ordinary non-secret validation.
- R5. Preserve Docs build and preview validation for `docs/**`, root package/workspace dependency inputs, and the Docs workflow/filter definitions, as well as manual dispatch.
- R6. Add regression coverage for the intended workflow and script contract without adding dependencies, including pull-request exclusion, protected-`main` execution, and unrelated protected-`main` skips for the credentialed self-test.
- R7. Retain read-only workflow permissions and confine GitHub App inputs to the trusted self-test step.

## Scope Boundaries

- Do not add a composite setup action, dependency artifacts, a universal CI status gate, or branch-protection changes.
- Do not merge independent jobs or change release-branch/semantic-release policy.
- Do not change the public `pnpm build` workspace-build contract used by contributors.
- Required-check names and branch-protection configuration remain unchanged; only existing job internals, commands, and filters change.
- Do not use `pull_request_target`, change fork secret-sharing policy, or add a second GitHub App for self-test coverage.
- Defer cache tuning and further job-graph consolidation to a separate #3543 follow-up.

## Context & Research

### Relevant Code and Patterns

- `.github/workflows/main.yaml` centralizes the CI graph. `setup` exports Node and path-filter outputs; downstream jobs independently set up pnpm and Node.
- `.github/filters.yaml` centralizes file classification. Its broad `src-changed` filter should continue to drive generic validation, while action-runtime (`action.yaml`, `docker/**`) and Docs build triggers become narrower outputs.
- `package.json` defines `pnpm build` as `tsup` plus recursive workspace builds. The plan adds `pnpm run build-action` as the root-only action-bundle command without changing that full-workspace command.
- `src/__tests__/action-config.test.ts` already reads repository configuration and uses Vitest. `js-yaml` is an existing development dependency for workflow assertions.
- The existing `test` job already gates `build`, and `build` gates `release`; a trusted self-test step that fails inside `test` therefore blocks downstream artifact and release work without a parallel privileged workflow.

### Institutional Learnings

- Preserve pnpm-only tooling, SHA-pinned workflow actions, explicit job gates, and `bash -Eeuo pipefail` shell behavior.
- CI changes must retain the committed `dist/` drift check and the dedicated release-branch flow.
- No formal `docs/solutions/` learning exists for this workflow; the current workflow and project guidance are the source of truth.
- GitHub Actions checks out local actions from the pull request revision; same-repository pull requests can receive repository secrets. Credentialed `uses: ./` execution is therefore limited to reviewed protected-branch pushes.

## Prior-Art Survey

```json
{
  "schema_version": 2,
  "verdict": "extend",
  "scope": "repository root",
  "freshness": {
    "vcs_reference": "origin/main@be4805530460c9f67af933291a4900121da3027f",
    "scope_baseline": "be4805530460c9f67af933291a4900121da3027f#21ddbf0c452e18fcf7543f64c1d2ffe697ef05022b34e5f384c71a51bc9d63c2"
  },
  "budget": {
    "max_search_passes": 3,
    "max_candidate_inspections": 3,
    "exhausted": true
  },
  "candidates": [
    {
      "path_or_symbol": ".github/workflows/main.yaml",
      "description": "Owns setup outputs, CI job gates, artifact checks, Docs deployment, and release sequencing.",
      "disposition": "extend"
    },
    {
      "path_or_symbol": ".github/filters.yaml",
      "description": "Owns centralized change classification consumed by the Main workflow.",
      "disposition": "extend"
    },
    {
      "path_or_symbol": "package.json",
      "description": "Owns the current full-workspace build command that combines root and Docs builds.",
      "disposition": "extend"
    }
  ]
}
```

## Key Technical Decisions

- **Keep `pnpm build` unchanged; add `pnpm run build-action`.** `build-action` runs `tsup` only. CI artifact and release jobs use it without recursively rebuilding Docs, while contributor-facing full-workspace builds remain stable.
- **Make `check` static-only.** It continues type, lint, and Docs checks, but no longer builds artifacts or starts the preview server.
- **Move preview validation into `build-docs`.** The Docs job already owns production output and Pages artifacts, so it is the only job that should launch the built site.
- **Use explicit self-test and Docs-build filters.** Broad `src-changed` remains the generic test/build trigger. `action-self-test-changed` contains only `action.yaml` and `docker/**`; its credentialed step runs only on a protected-`main` `push`. `docs-build-changed` contains `docs/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.github/workflows/main.yaml`, and `.github/filters.yaml`.
- **Keep the trusted self-test inside `test`.** Its explicit `push`/default-branch/action-filter condition excludes `pull_request` and `merge_group` runs while a failure continues to block the existing `test` → `build` → `release` path. The workflow keeps its read-only permissions and provides only the GitHub App inputs required by this step.
- **Retain `setup`'s Node setup.** Its `node-version` output is consumed by every downstream job; only its bootstrap step is redundant.

## Open Questions

### Resolved During Planning

- **Should dependencies be passed between jobs?** No. That introduces cache/artifact complexity without proving a proportional saving for this slice.
- **Should skipped jobs be hidden behind a new CI gate?** No. Existing branch-protection behavior is out of scope; preserve the current job graph except for the scoped gate changes.

### Deferred to Implementation

- **Should the trusted self-test be a dedicated job?** No. Keep it as a conditional step in `test`; the current dependency path already blocks artifact and release work on a protected-branch failure.
- **What is the trusted execution boundary?** Only a `push` to protected `main`; never a pull request or merge-queue run.

## Implementation Units

- [x] **Unit 1: Add an explicit action-artifact build boundary**

**Goal:** Provide `pnpm run build-action`, the root-only action-bundle command, without changing the contributor-facing recursive workspace build.

**Requirements:** R2, R3, R6

**Dependencies:** None

**Files:**

- Modify: `package.json`
- Modify: `src/__tests__/action-config.test.ts`

**Approach:**

- Add `build-action` with the `tsup` command only.
- Keep `pnpm build` as the existing complete workspace build.
- Add static regression assertions that distinguish the full-workspace and root-only build contracts.

**Execution note:** Add the characterization assertion before changing the workflow command that consumes it.

**Patterns to follow:**

- `package.json` script naming and the repository-configuration assertions in `src/__tests__/action-config.test.ts`.

**Test scenarios:**

- Happy path: `build-action` invokes the action bundler without a recursive workspace command.
- Regression: the existing full-workspace build script retains its recursive Docs build behavior.

**Verification:**

- The action bundle can be rebuilt with `build-action` without invoking the Docs workspace, while the existing full build remains available to contributors.

- [x] **Unit 2: Partition workflow responsibilities and change filters**

**Goal:** Remove redundant setup/build work and make each CI job validate only the artifact it owns.

**Requirements:** R1, R2, R3, R4, R5, R6, R7

**Dependencies:** Unit 1

**Files:**

- Modify: `.github/filters.yaml`
- Modify: `.github/workflows/main.yaml`
- Modify: `src/__tests__/action-config.test.ts`

**Approach:**

- Remove `pnpm bootstrap` from `setup` but preserve checkout, Node-version output, and centralized path filtering.
- Add `action-self-test-changed` and `docs-build-changed` outputs with the exact membership defined in Key Technical Decisions. Continue using broad source classification for generic `test` and `build` execution.
- Gate the credentialed self-test on `action-self-test-changed` plus an explicit protected-`main` `push` condition. Do not route GitHub App inputs into `uses: ./` for pull request or merge-queue events; preserve the existing read-only workflow permissions and only the integration inputs that the action requires.
- Remove the root build and Docs preview steps from `check`; retain `pnpm check` there.
- Use `pnpm run build-action` in `build` for the `dist/` drift check and in `release` for release artifact preparation.
- Make `build-docs` the sole Astro production build owner and move the preview health check after its production build, before artifact upload. Run `pnpm run preview` from `${{ needs.setup.outputs.docs-build-path }}`, wait for the existing `http://localhost:4321/renovate-action` endpoint, and clean up the background process on either success or failure.
- Preserve job dependencies and conditions needed for Docs-only, source, dependency, workflow, push, and manual-dispatch paths; do not introduce a synthetic aggregate status job.

**Patterns to follow:**

- Existing job-output wiring from `setup` in `.github/workflows/main.yaml`.
- Centralized path classification in `.github/filters.yaml`.
- Existing YAML/configuration parsing style in `src/__tests__/action-config.test.ts` using `js-yaml`.

**Test scenarios:**

- Happy path: `setup` still exports the Node-version expression and all downstream jobs consume it.
- Happy path: each named `docs-build-changed` input runs `check` and `build-docs`, then validates the built preview before Pages artifact upload.
- Happy path: a protected-`main` `action.yaml` or `docker/**` change runs the credentialed self-test before its dependent build and release work.
- Edge case: a same-repository or fork pull request with an action-runtime change keeps ordinary validation but skips the credentialed local-action self-test.
- Edge case: a protected-`main` change outside `action-self-test-changed`, including workflow/filter-only changes, skips the credentialed self-test.
- Edge case: a workflow-only change follows the explicit filter contract: generic validation and Docs build run without credentialed local-action execution.
- Regression: the trusted-step condition explicitly excludes `pull_request` and `merge_group`, and its required GitHub App inputs remain confined to the trusted step.
- Integration: `build` and `release` use `pnpm run build-action`; `build` still compares generated `dist/`.
- Regression: no job installs dependencies in `setup`; each runnable isolated job retains its own bootstrap.

**Verification:**

- Static workflow tests establish exact filter membership, output consumption, job commands, trusted self-test event/branch/filter condition, secret-input confinement, preview command/working directory/endpoint, and cleanup behavior.
- A CI run on the implementation PR exercises generic checks, tests, root artifact validation, and Docs production/preview validation because the Main workflow and filters are Docs-build inputs.

- [ ] **Unit 3: Validate the path matrix and CI cost claim**

**Goal:** Establish that the changed workflow preserves validation coverage and removes the measured redundant work.

**Requirements:** R1, R2, R4, R5

**Dependencies:** Units 1 and 2

**Files:**

- Test: `src/__tests__/action-config.test.ts`

**Approach:**

- Treat the workflow test as the durable contract for filter/job routing and use real CI runs for runner behavior.
- Compare affected job step execution against the August 24 baseline; elapsed runner time is supporting evidence, not an acceptance criterion.

**Test scenarios:**

- Integration: a workflow-only implementation PR and its corresponding protected-`main` push run the Docs production/preview path without credentialed local-action execution.
- Integration: a Docs content, lockfile, or workspace change builds Docs, serves the generated site, passes the health check, and uploads the Pages artifact.
- Regression: release retains its existing branch/job policy while using `pnpm run build-action` for the same `dist/` artifact input.

**Verification:**

- `pnpm check` and `pnpm test` pass locally.
- The implementation PR has green required checks.
- The implementation PR's workflow/config changes trigger and pass the Docs build/preview path without a manual dispatch.
- The resulting workflow no longer runs bootstrap in `setup`, no longer builds in `check`, and uses `build-action` once in each applicable action-bundle job.

## System-Wide Impact

- **Interaction graph:** `.github/filters.yaml` produces outputs consumed by `setup`, then gates `check`, `test`, `build`, and `build-docs` in `.github/workflows/main.yaml`.
- **Error propagation:** static/config checks fail fast in `check`; a protected-`main` trusted self-test failure fails `test`, blocking `build` and then release; action bundle drift fails in `build`; Docs output or preview failures fail in `build-docs` before Pages artifact upload.
- **State lifecycle risks:** path-filter mistakes can skip a needed job; credentialed PR execution can expose the GitHub App private key. Regression tests must assert exact filter patterns, output names, event/branch conditions, secret-input confinement, and `needs` wiring rather than only matching command strings.
- **Unchanged invariants:** every runnable isolated job retains its own dependency install, the action's committed `dist/` comparison remains intact, and release policy, required-check names, and branch protection remain unchanged.

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| Docs deployment is skipped because a dependency input is not classified as Docs-build-relevant. | Define and test the exact `docs-build-changed` membership, including Docs, dependency/workspace, and Docs pipeline configuration inputs. |
| A skipped dependency cascades to `build` or `build-docs`. | Preserve their current parent jobs and assert the relevant docs/source path matrix in workflow regression tests. |
| A pull request executes local action code with GitHub App credentials. | Limit the credentialed step to protected-`main` pushes, assert PR and merge-queue exclusion, and retain only read-only workflow permissions. |
| Moving the preview check changes its base-path behavior. | Run it after the existing configured Astro production build, in the same Docs working directory and before upload. |
| `build-action` changes release output. | Keep the full contributor build script, retain the `dist/` comparison, and statically assert that release invokes `build-action` while its branch/job policy remains unchanged. |

## Documentation / Operational Notes

- No user-facing documentation change is required.
- Record before/after runner-time observations from comparable Main workflow runs in the PR description or issue update as supporting evidence only; do not claim billing savings from elapsed runner seconds.

## Sources & References

- Related issue: #3543
- Workflow: `.github/workflows/main.yaml`
- Path filters: `.github/filters.yaml`
- Build scripts: `package.json`
- Existing configuration tests: `src/__tests__/action-config.test.ts`
- Trusted self-test requirements: `docs/brainstorms/2026-08-24-trusted-action-self-test-requirements.md`

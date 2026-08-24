---
date: 2026-08-24
topic: bun-artifact-integration
---

# Bun Artifact Integration Requirements

## Summary

Provide reliable Bun dependency updates for consumers by first classifying whether the failure is in the action, Renovate, or Containerbase, then pursuing only a justified remedy. Validate the result against `fro-bot/agent#1016` while preserving constrained Bun provisioning; upstream failures fail closed and are escalated rather than receiving an action workaround or global Bun fallback.

---

## Problem Frame

Some consumer Renovate updates produce the correct `bun.lock` changes and pass normal CI, but still fail with `renovate/artifacts` because constrained Bun provisioning fails. The failure blocks otherwise-valid dependency updates. The failing layer must be classified as the action, Renovate, or Containerbase before committing to a remedy; diagnostics are outside this requirements scope.

---

## Actors

- A1. Action consumer: configures Renovate and needs dependency updates to complete reliably.
- A2. Action maintainer: maintains secure, compatible runtime behavior across supported package managers.
- A3. Renovate and Containerbase: select and provision the Bun version required for artifact generation.

---

## Key Flows

- F1. Constrained Bun artifact generation
  - **Trigger:** Renovate updates a dependency in a consumer repository with a Bun lockfile.
  - **Actors:** A1, A3
  - **Steps:** Renovate resolves the requested Bun version, provisions that version, and regenerates the lockfile; the failure layer is classified as the action, Renovate, or Containerbase before a remedy is selected.
  - **Outcome:** The artifact update completes without relying on an unconstrained global Bun installation.
  - **Covered by:** R1, R2, R4

- F2. Consumer validation
  - **Trigger:** A proposed action change is ready for validation.
  - **Actors:** A1, A2
  - **Steps:** The change runs against the representative `fro-bot/agent#1016` consumer update and its normal checks complete.
  - **Outcome:** The update is green without a `renovate/artifacts` failure.
  - **Covered by:** R5

- F3. Upstream failure escalation
  - **Trigger:** The classified failure is in Renovate or Containerbase and no justified action remedy exists.
  - **Actors:** A2, A3
  - **Steps:** The action preserves constrained provisioning, fails closed, and escalates the upstream failure.
  - **Outcome:** No action behavior change or global Bun fallback is shipped for an upstream failure.
  - **Covered by:** R2, R6

---

## Requirements

**Constrained artifact behavior**

- R1. The action must preserve Renovate's ability to provision the Bun version requested for artifact generation.
- R2. The action must not rely on an unconstrained global Bun fallback as a remedy.
- R3. The remedy must preserve existing artifact behavior for non-Bun package managers.

**Failure classification, validation, and failure behavior**

- R4. Before committing to a remedy, the failing layer must be classified as the action, Renovate, or Containerbase.
- R5. A proposed remedy must prove the `fro-bot/agent#1016` representative consumer update completes with a green artifact status and normal CI.
- R6. If the classified failure is upstream, or a constrained action-level remedy cannot be proven, the action must fail closed and escalate rather than change behavior or provide a global Bun fallback.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R4.** Given a consumer update that requires a constrained Bun version, when Renovate regenerates `bun.lock`, then the failing layer is classified before any remedy and it provisions and uses that requested version without defaulting to global Bun.
- AE2. **Covers R3.** Given a non-Bun dependency update, when the remedy is enabled, then its artifact behavior remains unchanged.
- AE3. **Covers R5, R6.** Given the representative `fro-bot/agent#1016` consumer update, when validation runs, then normal CI and the artifact status are green; if the failure is upstream or the constrained remedy is unproven, the action fails closed and escalates without a behavior change or global-Bun fallback.

---

## Success Criteria

- Consumer Bun dependency updates complete reliably when constrained provisioning works.
- The failure layer is identified before any remedy is committed.
- Validation evidence from `fro-bot/agent#1016` demonstrates green artifact status and normal CI with the requested Bun version constrained.
- Upstream failures are failed closed and escalated without changing action behavior or inventing a global Bun fallback.

---

## Scope Boundaries

- Do not make `binarySource=global` the action default.
- Do not change action behavior unless the action is classified as the failing layer.
- Do not treat an upstream report as a substitute for validation against `fro-bot/agent#1016`.
- Do not add diagnostics to this work.
- Do not broaden this work into unrelated artifact-manager refactors.

---

## Key Decisions

- Primary outcome is reliable Bun dependency updates for consumers, not an assumed action workaround.
- Classify the failing layer as the action, Renovate, or Containerbase before committing to a remedy.
- Use `fro-bot/agent#1016` as the representative consumer validation target.
- Preserve constrained provisioning; never automatically broaden to global Bun.
- If the failure is upstream, fail closed and escalate rather than changing action behavior or providing a global fallback.
- Diagnostics are out of scope.

---

## Dependencies / Assumptions

- `fro-bot/agent#1016` provides the representative consumer update for end-to-end validation.
- Evidence is available to classify the failure as belonging to the action, Renovate, or Containerbase.
- Renovate and Containerbase continue to expose a constrained Bun provisioning path.

---

## Outstanding Questions

### Deferred to Planning

- For R4, research is needed to determine whether the failing layer is the action, Renovate, or Containerbase.
- For R1, R2, and R6, the technical question is: If the action owns the failure, what narrow remedy preserves constrained provisioning without a global Bun fallback?
- For R5, the validation question is: Which representative update in `fro-bot/agent#1016` provides the required green artifact and CI evidence?

---

## Sources / Research

- GitHub issue #3436 and its comments.
- `fro-bot/agent#1016` representative consumer validation target.
- `action.yaml` runtime configuration and `docker/entrypoint.sh` Bun installation path.
- `renovatebot/renovate@44.30.0` Bun artifact manager and execution behavior.
- Containerbase Bun installer source.

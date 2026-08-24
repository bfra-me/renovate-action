---
date: 2026-08-24
topic: trusted-action-self-test
---

# Trusted action self-test

## Summary

Run the credentialed action integration self-test only after action-runtime changes reach protected `main`. Pull requests retain unprivileged validation and must never execute PR-controlled local action code with GitHub App credentials.

---

## Problem Frame

The CI partition initially moved the credentialed self-test onto action-runtime pull requests. A local action invoked from a pull request runs code from the checked-out pull request revision. Same-repository pull requests can receive repository secrets, so that arrangement creates a GitHub App private-key exposure path.

---

## Actors

- A1. Pull request author: proposes action-runtime or workflow changes through untrusted pull request code.
- A2. Maintainer: reviews and merges changes into protected `main`.
- A3. Main workflow: validates pull requests and runs the trusted post-merge integration check.

---

## Key Flows

- F1. Unprivileged pull request validation
  - **Trigger:** A pull request changes action-runtime or workflow behavior.
  - **Actors:** A1, A3
  - **Outcome:** Static and non-secret validation runs, but the credentialed local-action self-test does not.
  - **Covered by:** R1, R3, R4

- F2. Trusted post-merge action validation
  - **Trigger:** A protected `main` push contains an action-runtime change.
  - **Actors:** A2, A3
  - **Outcome:** The credentialed self-test runs before downstream artifact and release work can proceed.
  - **Covered by:** R2, R3, R5

---

## Requirements

**Trust boundary**

- R1. A pull request must not execute repository-local action code with GitHub App credentials.
- R2. The credentialed self-test must run only from the protected default branch after action-runtime changes merge.
- R3. The trusted self-test must remain in the dependency path that blocks artifact and release work when it fails.

**Validation behavior**

- R4. Pull requests must retain static and non-secret validation for action-runtime and workflow changes.
- R5. Default-branch changes outside the action-runtime scope must not trigger the credentialed self-test.
- R6. Regression tests must prove that pull requests skip the credentialed self-test, protected `main` action-runtime pushes run it, and unrelated protected `main` pushes skip it.
- R7. The trusted self-test must retain read-only workflow permissions and receive only the GitHub App inputs required for that integration check.

---

## Acceptance Examples

- AE1. **Covers R1, R4, R6.** Given a same-repository or fork pull request that changes the action runtime, when CI runs, the credentialed local-action self-test is skipped while ordinary validation continues.
- AE2. **Covers R2, R3, R6.** Given a protected `main` push containing an action-runtime change, when the credentialed self-test fails, artifact and release work do not proceed.
- AE3. **Covers R5.** Given a protected `main` push outside the action-runtime scope, when CI runs, the credentialed self-test is skipped.

---

## Success Criteria

- No pull request event can route GitHub App credentials into PR-controlled local action code.
- Maintainers receive an automatic post-merge integration signal for action-runtime changes before artifact/release work proceeds.
- The trust boundary is explicit enough that a future CI change cannot silently move credentialed execution back onto pull requests.

---

## Scope Boundaries

- Do not use `pull_request_target` for this validation path.
- Do not change fork secret-sharing policy or add a second GitHub App.
- Do not add a manual-dispatch-only substitute for automatic post-merge validation.
- Do not broaden into release-policy or branch-protection changes.

---

## Key Decisions

- **Post-merge validation over privileged pull request validation:** protected `main` is the trusted boundary; pre-merge checks stay unprivileged.
- **Keep the existing Main workflow:** the action test should remain visible beside its dependent build/release jobs rather than create a parallel privileged workflow.
- **Keep the trusted step in the existing test job:** on protected `main` action-runtime pushes, its failure already blocks `build`, which blocks release work.

---

## Dependencies / Assumptions

- Protected `main` accepts reviewed code as the trust boundary for repository secrets.
- Action-runtime classification must remain pinned by the trusted/untrusted regression cases.

---

## Sources / Research

- GitHub Actions documentation on compromised runners and pull request secrets.
- GitHub Actions documentation on local action paths and secure `pull_request_target` usage.
- CI trust-boundary review of `.github/workflows/main.yaml`, `.github/filters.yaml`, and `action.yaml`.

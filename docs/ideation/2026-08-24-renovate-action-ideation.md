---
date: 2026-08-24
topic: renovate-action-improvements
mode: repo-grounded
---

# Ideation: renovate-action improvements

## Grounding Context

- `renovate-action` is a composite GitHub Action; runtime behavior lives in `action.yaml` and `docker/entrypoint.sh`.
- `main` is clean at `7ed55075` after PR #3657 merged on 2026-08-24.
- Open issues include #3436 (Bun lockfile artifact failure) and #3543 (duplicated CI setup/build work). The tracker has 63 open issues, 59 of which are automated daily reports.
- `docs/` retains Starlight starter content. Three completed `.ai/plan/` files describe stale or removed behavior. No `docs/solutions/` or repository-local agent skills exist.

## Ranked Ideas

### 1. Root-cause the Bun artifact failure (#3436)

**Description:** Reproduce and bound the Bun artifact/status failure before selecting a fix. **Warrant:** direct: #3436 remains open since 2026-06-27 and reports a user-facing Renovate artifact failure. **Rationale:** Restores reliable dependency automation for affected Bun users. **Downsides:** May require an upstream Renovate or Containerbase change. **Confidence:** 90% **Complexity:** Medium **Status:** Explored

### 2. Reduce duplicated CI work (#3543)

**Description:** Remove repeated setup and build work without weakening release or artifact gates. **Warrant:** direct: #3543 identifies repeated setup/build time across workflows. **Rationale:** Reduces feedback latency and GitHub Actions cost on every run. **Downsides:** Workflow changes need careful equivalence verification. **Confidence:** 85% **Complexity:** Medium **Status:** Unexplored

### 3. Repair daily-report issue churn

**Description:** Make daily bot reporting update a stable issue rather than creating rolling duplicates. **Warrant:** direct: 59 of 63 open issues are automated daily reports. **Rationale:** Restores the issue tracker as an actionable work queue. **Downsides:** Requires a separate decision on backlog cleanup. **Confidence:** 95% **Complexity:** Low **Status:** Unexplored

### 4. Make documentation and legacy plans truthful

**Description:** Replace starter docs and reconcile stale `.ai` plans with current action behavior. **Warrant:** direct: `docs/README.md` is Starlight starter text, while completed template and analytics plans describe absent or removed behavior. **Rationale:** Prevents contributor and operator misdirection. **Downsides:** Content maintenance becomes an explicit responsibility. **Confidence:** 90% **Complexity:** Medium **Status:** Unexplored

### 5. Add runtime-contract coverage

**Description:** Test important `allowedCommands` behavior against Renovate execution semantics, not only static regex matching. **Warrant:** reasoned: the removed `.npmrc` pattern passed static allowlist matching but failed under Renovate's default non-shell execution. **Rationale:** Prevents more policy/runtime mismatches at a security boundary. **Downsides:** Integration fixtures may be slower and more version-sensitive. **Confidence:** 80% **Complexity:** Medium **Status:** Unexplored

## Rejection Summary

| Idea | Reason rejected |
| --- | --- |
| Prescriptive Bun installer rewrite | Root cause is not yet verified; investigate #3436 first. |
| Cache lifecycle rewrite | Plausible but lacks direct source-level validation in this pass. |
| v10 execution-mode implementation | No defined target behavior or migration commitment. |
| Extract config merge shell library | Adds abstraction without evidence that the current boundary is unmaintainable. |
| Cross-repo policy consolidation | Broadens scope into sibling repositories without a demonstrated local need. |
| Generic install timeouts and dry-run mode | Useful-sounding but not grounded in an active failure or clear operator demand. |

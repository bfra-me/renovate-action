---
title: "docs: make documentation truthful"
type: docs
status: completed
date: 2026-08-24
origin: docs/brainstorms/2026-08-24-documentation-truthfulness-requirements.md
---

## Overview

Make the repository and published documentation truthful about the current v9 action while preserving useful historical context. The work keeps `action.yaml` and `docker/entrypoint.sh` as runtime authority, introduces one concise active Usage guide, routes readers to it from the landing page and primary sidebar, and clearly archives retained legacy pages and historical `.ai/plan` records.

This is a Standard-depth, documentation-only plan. It changes content and Starlight routing only; it does not change runtime behavior, deployment policy, recurring publication guardrails, or custom component/CSS behavior.

## Problem Frame

The docs workspace still contains Starlight starter content, an explicit sidebar that exposes only legacy pages, and a landing CTA that points to a legacy examples route. Several retained pages and historical plans describe removed templates, analytics, dashboards, or stale implementation/testing claims as if they were current. `docs/README.md` is also untouched starter text, while `docs/DEPLOYMENT.md` and `llms.txt` need consistency review.

Readers therefore lack a reliable distinction between current user guidance, runtime authority, and historical records. The documentation must make the current v9 path discoverable first, preserve history without deleting it, and place archive context before retained legacy content so direct links are safe to follow.

## Requirements Trace

- **R1.** Rewrite the docs workspace README so it describes the current Astro/Starlight workspace and contributor workflow rather than starter content.
- **R2.** Reclassify retained plans and records as historical and non-authoritative; do not present removed template or analytics/dashboard capabilities as current.
- **R3.** Keep the global-config plan historical-but-relevant, point it to current authority, and do not create a bespoke active-document exception.
- **R4.** Make the landing page and primary navigation prioritize current guidance and avoid presenting archived pages as current.
- **R5.** Ensure current published documentation, including the landing page, does not describe removed template or analytics/dashboard capabilities as supported behavior or assert unsupported future behavior; active claims must match `action.yaml` and current v9 constraints.
- **R6.** Add a prominent pre-body archive notice to every retained published historical page, identify the page as historical and non-authoritative, and point readers to current authority; preserve the distinction for direct and inline legacy links.

## Scope Boundaries with Deferred to Separate Tasks

### In scope

- Add `docs/src/content/docs/guides/usage.md` as the concise current v9 Usage guide.
- Delete the two unused Starlight starter routes: `docs/src/content/docs/guides/example.md` and `docs/src/content/docs/reference/example.md`.
- Repoint `docs/src/content/docs/index.mdx` to the active Usage guide.
- Update the explicit sidebar in `docs/astro.config.mjs` so Usage is primary and retained legacy pages are under a collapsed Archive/Legacy group.
- Add Starlight 0.41.7 `banner` frontmatter to every retained page under `docs/src/content/docs/legacy/`.
- Reclassify the three `.ai/plan` records as historical, including the removed-capability wording for templates and analytics/dashboard and the current-authority pointer for global config.
- Rewrite `docs/README.md`; update `docs/DEPLOYMENT.md` and `llms.txt` only where stale links or references make them inconsistent with the active documentation model.

### Deferred to Separate Tasks

- Runtime changes in `action.yaml` or `docker/entrypoint.sh`.
- Documentation deployment-policy changes, workflow changes, release changes, or a recurring truthfulness/publish guard.
- New custom components, CSS, theme overrides, or bespoke archive UI.
- GitHub UI ergonomics for example links and site-search indexing.
- Rewriting every historical report or deleting retained historical material.

## Context & Research

### Authority and current behavior

- `action.yaml` owns the composite action inputs, global-config merge, protected configuration fields, Renovate invocation, and v9 Docker deprecation behavior.
- `docker/entrypoint.sh` owns container setup and tool installation. Neither file should be made subordinate to documentation claims.
- `README.md` already contains the current v9 usage shape and global-config security model, making it the primary content reference for the new concise guide rather than the legacy examples page.

### Docs site structure

- `docs/astro.config.mjs` uses explicit sidebar configuration even though `docs/AGENTS.md` mentions auto-navigation. The implementation must follow the actual explicit configuration.
- The current site has one landing page and three retained legacy routes: `legacy/testing-strategy`, `legacy/renovate-action-report`, and `legacy/examples`.
- `docs/package.json` declares Starlight with a compatible range, while `pnpm-lock.yaml` resolves `@astrojs/starlight` to 0.41.7. The plan therefore uses the supported page `banner` frontmatter without custom styling.

### Historical material

- `.ai/plan/feature-renovate-templates-1.md` describes action-level template and branding inputs that are removed in v9.
- `.ai/plan/feature-analytics-reporting-system-1.md` describes analytics collection and dashboards that are not current capabilities.
- `.ai/plan/feature-global-config-input-1.md` documents relevant global-config background, but remains historical context only: it is never active guidance and never receives an active-document exception. It must defer to current runtime and user guidance.

## Prior-Art Survey

```json
{
  "schema_version": 2,
  "verdict": "extend",
  "scope": "docs/ and .ai/plan/",
  "freshness": {
    "vcs_reference": "origin/main@e8613608f31c57832516d13b4fb97a63d5f3caa5",
    "scope_baseline": "e8613608f31c57832516d13b4fb97a63d5f3caa5#9aa73b04409dd09cd9f161eade6b08271abe782a7bb873b628cc01b722f7ef0e"
  },
  "budget": {
    "max_search_passes": 1,
    "max_candidate_inspections": 1,
    "exhausted": true
  },
  "candidates": [
    {
      "path_or_symbol": "docs/src/content/docs/index.mdx and docs/astro.config.mjs",
      "description": "Owns landing-page discovery and explicit Starlight navigation for active and retained documentation.",
      "disposition": "extend"
    }
  ]
}
```

## Key Technical Decisions

- **Use one active Usage route.** Create `guides/usage.md` as the concise current v9 entrypoint, grounded in the existing action inputs and global-config behavior rather than reproducing every README detail.
- **Follow explicit sidebar configuration.** Put Usage in the primary navigation and place retained legacy pages in a collapsed `Archive` or `Archive / Legacy` group. Do not rely on auto-navigation wording in `docs/AGENTS.md`.
- **Use Starlight `banner` frontmatter for legacy pages.** Every retained legacy page gets a pre-content banner identifying it as historical and non-authoritative, with the active Usage guide as its canonical destination. Runtime authority may be named as a secondary factual reference, but banners must link consistently to Usage. Do not add CSS or body-only notices.
- **Archive rather than delete history.** Delete only the two unused starter routes explicitly approved for removal. Retain legacy published pages and all three `.ai/plan` records.
- **Keep one authority model.** `action.yaml` and `docker/entrypoint.sh` are runtime authority; the Usage guide is active user guidance and the canonical archive destination; historical pages and plans provide context only. The global-config record is relevant background but remains historical context only, never active guidance or an active-doc exception.
- **Do not add automated truthfulness machinery.** Content/config routing is the feature-bearing behavior. No new unit test or recurring guardrail is warranted; verification relies on the docs check and built/previewed route outcomes.

## Open Questions (resolved and deferred)

### Resolved during planning

- **What is the active entrypoint?** `docs/src/content/docs/guides/usage.md`, linked from the landing CTA and primary sidebar.
- **Which starter routes may be removed?** Only `guides/example.md` and `reference/example.md`, as explicitly approved in the origin decisions.
- **How should retained legacy pages be marked?** With Starlight 0.41.7 `banner` frontmatter before page content.
- **Should historical global-config material be promoted?** No. It remains relevant background only, points readers to current Usage/runtime authority, and never becomes active guidance or an active-doc exception.
- **Should the explicit sidebar be replaced with auto-nav?** No. Extend the actual explicit sidebar in `docs/astro.config.mjs`.
- **Is a unit test or recurring guard required?** No. This scope is content/config routing; the requested docs check and route validation are sufficient.

### Deferred to implementation

- Exact wording and length of the concise Usage guide, subject to matching the current `README.md` and runtime authority.
- Exact banner text and link labels for each legacy page, provided each banner appears before content and includes historical/non-authoritative status plus current-authority links.
- Whether `docs/DEPLOYMENT.md` and `llms.txt` need edits after active and archived routes are finalized; modify them only for demonstrated consistency gaps.
- Whether the archive group label is `Archive` or `Archive / Legacy`; choose the clearer label without changing route ownership.

## Implementation Units

### U1. Establish the current documentation contract — Completed

- **Goal:** Define current v9 guidance and repository documentation boundaries before changing navigation.
- **Requirements:** R1, R3, R5.
- **Dependencies:** None.
- **Files:**
  - Add: `docs/src/content/docs/guides/usage.md`
  - Modify: `docs/README.md`
  - Inspect and modify only if required: `docs/DEPLOYMENT.md`, `llms.txt`
- **Approach:** Write a concise Usage guide covering the supported v9 workflow shape, required GitHub App inputs, relevant optional inputs, global-config security boundaries, Docker deprecation context, and the distinction between current guidance and runtime authority. Rewrite the workspace README around the actual Astro/Starlight package, local checks, route/content structure, and deployment handoff. Remove stale links or capability claims from deployment/LLM guidance only when they conflict with the resulting route model.
- **Test expectation:** None. This is a docs/content change; rendered-site validation in U4 is the evidence, and no new automated regression guard is in scope.
- **Verification outcome:** Current guidance names only supported v9 behavior, points readers to `action.yaml` and `docker/entrypoint.sh` where behavior is authoritative, and no longer presents removed template or analytics/dashboard capabilities as available.

### U2. Route active guidance and archive retained pages — Completed

- **Goal:** Make current Usage discoverable from active entrypoints, refresh the landing-page content against runtime authority and current v9 constraints, and make legacy content visibly secondary.
- **Requirements:** R4, R5, R6.
- **Dependencies:** U1.
- **Files:**
  - Modify: `docs/src/content/docs/index.mdx`
  - Modify: `docs/astro.config.mjs`
  - Delete: `docs/src/content/docs/guides/example.md`
  - Delete: `docs/src/content/docs/reference/example.md`
- **Approach:** Repoint the landing hero CTA to `guides/usage`. Refresh the landing page's hero, highlights, migration notes, and other active claims against `action.yaml` and current v9 constraints while changing the CTA and sidebar. Remove stale Renovate 43 claims and unsupported future-behavior claims, including an uncommitted v10 CLI-migration assertion; do not replace them with speculative future behavior. Extend the existing explicit sidebar with the active Usage route as primary navigation and a collapsed Archive/Legacy group containing all retained legacy routes. Preserve route slugs for retained pages and remove only the two unused starter routes approved by the origin.
- **Test expectation:** None. This is a docs/content/navigation change; rendered-site validation in U4 is the evidence, and no new automated regression guard is in scope.
- **Verification outcome:** The built landing route's CTA and primary sidebar lead to Usage; landing-page claims match `action.yaml` and current v9 constraints, with stale Renovate 43 and unsupported future-behavior claims removed; no starter route remains; archived routes remain reachable through their existing slugs and are not presented as active guidance.

### U3. Reclassify retained historical records and pages — Completed

- **Goal:** Preserve historical context while preventing readers from mistaking it for current authority.
- **Requirements:** R2, R3, R6.
- **Dependencies:** U1 and U2.
- **Files:**
  - Modify: `docs/src/content/docs/legacy/testing-strategy.md`
  - Modify: `docs/src/content/docs/legacy/renovate-action-report.md`
  - Modify: `docs/src/content/docs/legacy/examples.md`
  - Modify: `.ai/plan/feature-analytics-reporting-system-1.md`
  - Modify: `.ai/plan/feature-global-config-input-1.md`
  - Modify: `.ai/plan/feature-renovate-templates-1.md`
- **Approach:** Add Starlight 0.41.7 `banner` frontmatter to every retained published legacy page. Each banner must appear before body content, identify the page as historical and non-authoritative, and link to `guides/usage` as the canonical destination. Runtime authority may be referenced secondarily for factual details, but every retained legacy banner uses Usage consistently. Update the three `.ai/plan` records with historical classification: explicitly mark templates and analytics/dashboard as removed capabilities, and mark global config as relevant background only that points to current authority without becoming active guidance or an active-doc exception. Preserve the reports' historical body content rather than rewriting them wholesale.
- **Test expectation:** None. This is a docs/content change; rendered-site validation in U4 is the evidence, and no new automated regression guard is in scope.
- **Verification outcome:** Every retained legacy page renders its archive banner before content and links canonically to Usage; direct and inline links preserve the historical distinction; all three plans are clearly historical, with global config remaining context only and none treated as active documentation.

### U4. Validate documentation surfaces as one coherent site — Completed

- **Goal:** Confirm the active and archived documentation surfaces build, route, and communicate the intended authority model.
- **Requirements:** R1–R6.
- **Dependencies:** U1, U2, and U3.
- **Files:**
  - Inspect all files changed by U1–U3.
- **Approach:** Run the repository's docs check and manually validate the rendered production output and preview behavior for the landing page, active Usage route, and each retained archived route. Do not introduce a new automated test, recurring guard, or shell-based choreography in the implementation.
- **Manual rendered-site verification checklist:**
  - The active landing CTA reaches `guides/usage`, and the primary sidebar reaches the same Usage route.
  - Every retained legacy slug renders a pre-body archive banner whose canonical link destination is `guides/usage`.
  - A repository-wide source-reference scan across all docs, config, and Markdown sources, regardless of tracking status, finds no reference to either deleted starter slug: `guides/example` or `reference/example`.
  - A built-site link/route audit confirms both deleted starter routes do not resolve and every retained legacy route does resolve with its banner.
- **Unit test expectation:** None. The changed behavior is Markdown/frontmatter and Starlight routing; a new unit-test harness would test implementation details rather than the rendered documentation contract.
- **Verification outcomes:** `pnpm check-docs` passes; the manual rendered-site checklist is complete; the active landing CTA and primary navigation reach Usage; every retained route builds, previews, retains its slug, and shows a pre-body banner linked to Usage; the repository-wide source-reference scan finds no deleted starter slug in docs, config, or Markdown sources; the built-site audit confirms both deleted routes do not resolve while retained routes do.

## System-Wide Impact

- **Interaction graph:** `docs/src/content/docs/index.mdx` and `docs/astro.config.mjs` determine active discovery and sidebar routing; content files determine rendered route bodies and frontmatter banners; `docs/README.md`, `docs/DEPLOYMENT.md`, and `llms.txt` provide repository and machine-readable documentation pointers.
- **Authority flow:** Readers start at the landing page or sidebar, reach the active Usage guide, and are directed to `action.yaml` or `docker/entrypoint.sh` for authoritative runtime details. Direct visits to legacy routes receive historical context before the body.
- **Error propagation:** Invalid frontmatter, broken links, or incorrect sidebar slugs fail the docs check or route validation before publication. Stale historical claims remain non-authoritative but must not be reachable as active guidance.
- **Unchanged invariants:** Runtime behavior, action inputs, protected configuration merging, Docker execution, deployment policy, release policy, custom CSS/components, and retained historical body content remain unchanged.

## Risks & Dependencies

| Risk or dependency | Mitigation |
| --- | --- |
| The explicit sidebar and Starlight route slugs diverge. | Use the existing `docs/astro.config.mjs` sidebar shape, preserve retained slugs, and validate built routes. |
| A legacy banner uses unsupported frontmatter, renders after content, or points at inconsistent targets. | Use the Starlight 0.41.7 `banner` page frontmatter contract and manually confirm that every banner appears before content and links canonically to Usage in built/previewed pages. |
| The active landing page or concise Usage guide repeats stale or unsupported claims. | Derive active claims from `action.yaml` and current v9 constraints, remove stale Renovate 43 and unsupported future-behavior assertions, and remove removed-capability claims from active surfaces. |
| Historical global-config context is accidentally promoted to active guidance. | State explicitly that the record is relevant background only, never active guidance or an active-doc exception, and link current readers to Usage/runtime authority. |
| Deleting starter routes breaks an unnoticed reference or leaves a route resolving unexpectedly. | Scan all docs, config, and Markdown sources regardless of tracking status for both deleted slugs, then audit the built site to confirm both deleted routes do not resolve while retained routes do. |
| Deployment or machine-readable guidance becomes inconsistent. | Review `docs/DEPLOYMENT.md` and `llms.txt` after routing changes and modify them only where required for consistency. |

## Documentation / Operational Notes

- This plan intentionally creates no runtime or deployment changes.
- The active Usage guide is the maintained user-facing entrypoint and canonical archive destination; legacy pages and `.ai/plan` records are historical context, not authority. The global-config record is relevant background only, never active guidance or an active-doc exception.
- Future behavior changes must update the active guide and verify claims against `action.yaml` and `docker/entrypoint.sh`.
- No recurring truthfulness guard is introduced; that policy question remains deferred separately.
- Do not stage, commit, push, or publish as part of this documentation plan.

## Sources & References

- Origin requirements: `docs/brainstorms/2026-08-24-documentation-truthfulness-requirements.md`
- Runtime authority: `action.yaml`, `docker/entrypoint.sh`
- Current user-facing baseline: `README.md`
- Docs site configuration: `docs/astro.config.mjs`, `docs/package.json`, `pnpm-lock.yaml`
- Active and legacy content: `docs/src/content/docs/index.mdx`, `docs/src/content/docs/legacy/`
- Workspace and deployment guidance: `docs/AGENTS.md`, `docs/README.md`, `docs/DEPLOYMENT.md`
- Machine-readable guidance: `llms.txt`
- Historical records: `.ai/plan/feature-analytics-reporting-system-1.md`, `.ai/plan/feature-global-config-input-1.md`, `.ai/plan/feature-renovate-templates-1.md`

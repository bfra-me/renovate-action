---
date: 2026-08-24
topic: documentation-truthfulness
---

# Documentation truthfulness

## Summary

Make the repository and published documentation truthful about the current action. Preserve historical context without presenting removed templates, dashboards, or stale engineering claims as active guidance.

---

## Problem Frame

The repository contains an untouched Starlight starter README, stale completed plans for removed features, and published legacy pages with inaccurate architecture and testing claims. Readers cannot reliably distinguish current operational guidance from historical material, which makes the docs a source of false confidence rather than a source of truth. The documentation must make its authority boundaries explicit: runtime files are authoritative for behavior, current published docs are guidance for users, and retained historical records provide context without superseding either.

---

## Actors

- A1. Action user: reads published documentation to configure or understand the action.
- A2. Maintainer: uses repository documentation and prior plans to change the action safely.
- A3. Documentation site: exposes current and historical material through navigation and direct links.

---

## Key Flows

- F1. Current documentation discovery
  - **Trigger:** A1 opens the docs site or repository documentation.
  - **Actors:** A1, A3
  - **Outcome:** Current guidance is prioritized at the landing page and through primary navigation, without archived pages appearing as current guidance. Where documentation conflicts with runtime behavior, the runtime authority governs.
  - **Covered by:** R1, R4, R5

- F2. Historical material access
  - **Trigger:** A1 or A2 follows a direct link to retained historical material.
  - **Actors:** A1, A2, A3
  - **Outcome:** The material remains available but clearly identifies its historical, non-authoritative status before the body content and points readers to the current authority.
  - **Covered by:** R2, R3, R6

---

## Requirements

**Repository guidance**

- R1. The docs workspace README must describe the current documentation workspace rather than Starlight starter content.
- R2. Retained plans and records are historical and non-authoritative. In particular, the template and analytics/dashboard plans must not be presented as current capabilities or active implementation guidance.
- R3. The global-config plan remains historical-but-relevant context and must point readers to the current authority instead of receiving a bespoke active-document exception.

**Published documentation**

- R4. Active documentation entrypoints, including the landing page and primary navigation, must prioritize current guidance and must not present archived pages as current.
- R5. Current published documentation must not describe removed template or analytics/dashboard capabilities as available behavior.
- R6. Every retained published historical page must show a prominent archive notice before body content, identify itself as historical and non-authoritative, and point readers to the current authority. Direct links and inline legacy links must preserve this distinction.

---

## Acceptance Examples

- AE1. **Covers R1.** Given a maintainer opens the docs workspace README, it explains the current site and contributor workflow rather than a starter template.
- AE2. **Covers R2, R3.** Given a maintainer reads a retained plan, template and analytics/dashboard plans are identified as historical and non-authoritative, while the global-config plan is identified as historical-but-relevant and points to the current authority.
- AE3. **Covers R4.** Given a reader opens the docs landing page or uses primary navigation, current guidance is prioritized and archived pages are not presented as current.
- AE4. **Covers R5.** Given a reader follows current documentation, it does not present removed template or analytics/dashboard capabilities as supported inputs.
- AE5. **Covers R6.** Given a reader opens a retained published historical page through a direct link or inline legacy link, a prominent archive notice appears before the body content and points to the current authority.

---

## Success Criteria

- Readers can identify the current action documentation without inferring removed capabilities.
- Historical material is preserved without being mistaken for current guidance.
- A planner can distinguish historical-but-relevant global-config context from other historical records, with a pointer to the current authority rather than an exception to the authority model.
- Readers arriving through active entrypoints, direct links, or inline legacy links can tell whether content is current or archived before relying on it.

---

## Scope Boundaries

- Do not restore removed template, analytics, or dashboard functionality.
- Do not delete historical material in this cleanup.
- Do not rewrite every historical report into current reference documentation.
- Do not add a recurring guardrail or publish check.
- Do not change action runtime behavior or documentation deployment policy.

---

## Key Decisions

- **Archive rather than delete:** retained history remains useful for maintainers, but it must no longer claim authority it does not have.
- **Use explicit authority classes:** `action.yaml` and `docker/entrypoint.sh` are the runtime source of truth; current published docs are active user guidance; retained historical records are contextual and non-authoritative. Current claims defer to runtime authority when they conflict.
- **Prioritize active entrypoints:** the landing page and primary navigation must lead with current guidance rather than presenting archived pages as current.
- **Archive without ambiguity:** every retained published historical page gets a prominent pre-body archive notice with a pointer to the current authority; direct and inline legacy links preserve that distinction.
- **Preserve relevant history without an exception:** the global-config record remains historical-but-relevant, but follows the same authority model as every other retained record.

---

## Dependencies / Assumptions

- `action.yaml` and `docker/entrypoint.sh` remain the runtime authority when documentation claims conflict.
- The current docs landing page, examples, deployment notes, and docs workspace guidance are the starting point for active documentation.

---

## Outstanding Questions

### Deferred to Planning

- Affects R2, R3, R6 (Technical): Choose the smallest presentation details that keep retained history clear in repository files and published pages while preserving the required archive notice and authority pointer.

---

## Sources / Research

- Current runtime authority: `action.yaml`, `docker/entrypoint.sh`
- Docs workspace guidance: `docs/AGENTS.md`, `docs/astro.config.mjs`, `docs/src/content/docs/index.mdx`, `docs/DEPLOYMENT.md`
- Current published documentation entrypoints and guidance: `docs/src/content/docs/index.mdx`, `docs/astro.config.mjs`, `docs/DEPLOYMENT.md`
- Retained historical material: `.ai/plan/feature-analytics-reporting-system-1.md`, `.ai/plan/feature-global-config-input-1.md`, `.ai/plan/feature-renovate-templates-1.md`, `docs/src/content/docs/legacy/`

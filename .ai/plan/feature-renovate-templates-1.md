---
goal: Enhance Renovate Issues and PRs with @bfra-me self-hosted bot specific content by implementing custom PR and issue templates
version: 1.0
date_created: 2025-08-01
last_updated: 2025-08-23
owner: marcusrbrown
status: 'Completed'
tags:
  - feature
  - renovate
  - templates
  - branding
  - composite-action
---

# Feature: Custom Renovate PR and Issue Templates

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

This implementation plan adds custom PR and issue templates to the @bfra-me Renovate self-hosted action, providing CI build links, documentation links, and @bfra-me branding while maintaining the composite action architecture and existing security patterns.

## 1. Requirements & Constraints

- **REQ-001**: Implement custom prBodyTemplate and issueBodyTemplate in embedded RENOVATE_CONFIG
- **REQ-002**: Include CI build links using GitHub Actions context variables (github.run_id, github.repository, etc.)
- **REQ-003**: Add documentation links to this repository
- **REQ-004**: Include @bfra-me branding in templates
- **REQ-005**: Make templates configurable through action inputs with sensible defaults
- **SEC-001**: Maintain existing security patterns with allowedCommands restrictions
- **CON-001**: Follow composite action architecture patterns used in action.yaml
- **CON-002**: Preserve existing RENOVATE_CONFIG structure and functionality
- **CON-003**: Follow composite action architecture - no modifications to TypeScript src/ files (placeholders only)
- **CON-004**: Use workflow-based testing approach consistent with existing composite action patterns
- **PAT-001**: Use GitHub Actions context variables for dynamic content
- **PAT-002**: Support both PR templates (prBodyTemplate, prHeader, prFooter) and issue templates (dependencyDashboardHeader, dependencyDashboardFooter)
- **GUD-001**: Provide sensible defaults that work without configuration
- **GUD-002**: Make customization optional and backwards compatible

## 2. Implementation Steps

### Implementation Phase 1: Action Input Extensions

- GOAL-001: Add new action inputs for template customization

| Task     | Description                                                             | Completed | Date       |
| -------- | ----------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Add `pr-body-template` input to action.yaml with default template       | ✅        | 2025-08-23 |
| TASK-002 | Add `pr-header` input to action.yaml for custom PR header content       | ✅        | 2025-08-23 |
| TASK-003 | Add `pr-footer` input to action.yaml for custom PR footer content       | ✅        | 2025-08-23 |
| TASK-004 | Add `dependency-dashboard-header` input to action.yaml for issue header | ✅        | 2025-08-23 |
| TASK-005 | Add `dependency-dashboard-footer` input to action.yaml for issue footer | ✅        | 2025-08-23 |
| TASK-006 | Add `enable-custom-templates` input as feature toggle (default: true)   | ✅        | 2025-08-23 |

### Implementation Phase 2: Template Content Creation

- GOAL-002: Design and implement branded template content with CI integration

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-007 | Create default prBodyTemplate with @bfra-me branding sections | ✅ | 2025-08-23 |
| TASK-008 | Design prHeader template with CI build links using GitHub Actions context | ✅ | 2025-08-23 |
| TASK-009 | Design prFooter template with documentation links and @bfra-me signature | ✅ | 2025-08-23 |
| TASK-010 | Create dependencyDashboardHeader with repository context and branding | ✅ | 2025-08-23 |
| TASK-011 | Create dependencyDashboardFooter with action documentation links | ✅ | 2025-08-23 |
| TASK-012 | Implement GitHub Actions context variable substitution (repository, run_id, etc.) | ✅ | 2025-08-23 |

### Implementation Phase 3: Configuration Integration

- GOAL-003: Integrate templates into embedded RENOVATE_CONFIG in action.yaml

| Task     | Description                                                         | Completed | Date       |
| -------- | ------------------------------------------------------------------- | --------- | ---------- |
| TASK-013 | Modify Configure step to process template inputs                    | ✅        | 2025-08-23 |
| TASK-014 | Update zzglobal_config JSON structure to include PR template fields | ✅        | 2025-08-23 |
| TASK-015 | Add dependencyDashboard configuration with custom header/footer     | ✅        | 2025-08-23 |
| TASK-016 | Implement template variable substitution logic in Configure step    | ✅        | 2025-08-23 |
| TASK-017 | Add conditional logic for enable-custom-templates feature toggle    | ✅        | 2025-08-23 |
| TASK-018 | Ensure backwards compatibility with existing configurations         | ✅        | 2025-08-23 |

### Testing Phase 4: Test Template Functionality

- **Testing Approach:**

This feature will be tested using the project's established composite action testing methodology:

1. **Workflow-Based Testing**: Templates will be validated through GitHub Actions workflow execution, following the existing self-test pattern in `.github/workflows/main.yaml`
2. **Integration Testing**: Template functionality will be tested through actual Renovate bot execution in dry-run mode
3. **Manual Testing**: Real-world validation through example workflows and documentation testing

The testing strategy aligns with the project's composite action architecture, where logic resides in `action.yaml` rather than TypeScript files, requiring workflow-based validation instead of traditional unit tests.

| Task     | Description                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------- | --------- | ---------- |
| TASK-019 | Create self-test workflow validation for template functionality | ✅        | 2025-08-23 |
| TASK-020 | Create manual testing documentation and workflow examples       | ✅        | 2025-08-23 |

## 3. Alternatives

- **ALT-001**: Use separate Renovate configuration files instead of embedded config - rejected due to composite action architecture requirements
- **ALT-002**: Implement templates as separate action steps - rejected due to complexity and security concerns with file handling
- **ALT-003**: Use environment variables instead of action inputs - rejected due to type safety and documentation clarity

## 4. Dependencies

- **DEP-001**: Renovate bot version 41.42.2 (already pinned in action.yaml)
- **DEP-002**: GitHub Actions context variables (available in composite actions)
- **DEP-003**: Existing RENOVATE_CONFIG structure and allowedCommands security pattern
- **DEP-004**: Actions/core for input processing in Configure step

## 5. Files

- **FILE-001**: `action.yaml` - Add new inputs and modify Configure step logic
- **FILE-002**: `action.yaml` - Updated action definition with template input parameters and embedded RENOVATE_CONFIG modifications
- **FILE-003**: `README.md` - Updated documentation with template usage examples and configuration options

## 6. Testing

- **TEST-001**: Self-test workflow validation with template inputs in main.yaml
- **TEST-002**: Manual workflow testing with various template configurations
- **TEST-003**: Template output validation in dry-run mode
- **TEST-004**: Edge case validation (empty templates, missing variables)
- **TEST-005**: Integration testing through actual Renovate workflow execution
- **TEST-006**: Documentation testing with example workflows

## 7. Risks & Assumptions

- **RISK-001**: GitHub Actions context variables may not be available in all execution contexts - mitigation: provide fallback values
- **RISK-002**: Template content may break with future Renovate versions - mitigation: use stable template syntax and test with updates
- **RISK-003**: Complex template logic may impact action performance - mitigation: keep template processing lightweight
- **ASSUMPTION-001**: Users will want CI build links in their Renovate PRs for traceability
- **ASSUMPTION-002**: @bfra-me branding is desired by default but should be customizable
- **ASSUMPTION-003**: Dependency dashboard templating limitations in Renovate will not change significantly

## 8. Related Specifications / Further Reading

- [Renovate Configuration Templates Documentation](https://docs.renovatebot.com/configuration-templates/)
- [Renovate PR Body Template Options](https://docs.renovatebot.com/configuration-options/#prbodytemplate)
- [Renovate Dependency Dashboard Configuration](https://docs.renovatebot.com/configuration-options/#dependencydashboard)
- [GitHub Actions Context and Expression Syntax](https://docs.github.com/en/actions/learn-github-actions/contexts)
- [Composite Actions Documentation](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Project Copilot Instructions - Composite Action Architecture](/.github/copilot-instructions.md)

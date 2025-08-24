---
goal: Implement support for global config as a Renovate workflow input
version: 1.0
date_created: 2025-08-01
last_updated: 2025-08-24
owner: Marcus R. Brown
status: 'In Progress'
tags: [feature, configuration, security, validation]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

This implementation plan adds support for a `global-config` input parameter to the Renovate Action, allowing users to pass custom global configuration that merges securely with the existing embedded RENOVATE_CONFIG. The implementation uses pure bash scripting and JSON processing tools within the composite action framework, with no TypeScript dependencies or modifications to src/ files.

## 1. Requirements & Constraints

**Functional Requirements:**

- **REQ-001**: Add `global-config` input parameter to action.yaml that accepts JSON string configuration
- **REQ-002**: Implement secure merging of user config with existing embedded RENOVATE_CONFIG
- **REQ-003**: Support deep merging for complex objects like `onboardingConfig`
- **REQ-004**: Preserve all existing functionality and backward compatibility
- **REQ-005**: Output merged configuration to Docker container via RENOVATE_CONFIG environment variable

**Security Requirements:**

- **SEC-001**: Protect `allowedCommands` array from user override to maintain security boundaries
- **SEC-002**: Validate user-provided JSON configuration against Renovate schema
- **SEC-003**: Sanitize and validate all user input before processing
- **SEC-004**: Implement fail-safe behavior - fallback to base config if user config is invalid

**Technical Constraints:**

- **CON-001**: Must maintain composite action architecture (not Docker action)
- **CON-002**: Follow existing environment variable patterns (RENOVATE\_\*)
- **CON-003**: Preserve existing caching strategy and performance characteristics
- **CON-004**: Work with current tsup build configuration and toolchain

**Guidelines:**

- **GUD-001**: Use only bash scripting and JSON processing tools (jq) within the composite action
- **GUD-002**: No modifications to TypeScript src/ files - they remain as placeholder templates
- **GUD-003**: Implement comprehensive error handling with clear logging in bash scripts
- **GUD-004**: Use existing composite action patterns without additional testing infrastructure

## 2. Implementation Steps

### Implementation Phase 1: Input Parameter and JSON Processing Setup

- **GOAL-001**: Add global-config input and establish JSON processing infrastructure

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Add `global-config` input parameter to action.yaml with proper description and defaults | ✅ | 2025-08-24 |
| TASK-002 | Install jq in docker/entrypoint.sh for JSON processing capabilities | ✅ | 2025-08-24 |
| TASK-003 | Create bash functions for JSON validation and merging in Configure step | ✅ | 2025-08-24 |
| TASK-004 | Add error handling for malformed JSON input with fallback to base config | ✅ | 2025-08-24 |

### Implementation Phase 2: Secure Config Merging Logic

- **GOAL-002**: Implement secure configuration merging using bash and jq

| Task     | Description                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | Create bash function to protect critical fields (allowedCommands) from override |           |      |
| TASK-006 | Implement deep merging for onboardingConfig using jq merge operations           |           |      |
| TASK-007 | Add JSON validation to ensure user config is well-formed before merging         |           |      |
| TASK-008 | Create secure merge function that preserves base config security boundaries     |           |      |
| TASK-009 | Add comprehensive error handling with clear logging and fallback behavior       |           |      |

### Implementation Phase 3: Integration with Existing Configure Step

- **GOAL-003**: Integrate config merging into the existing Configure step workflow

| Task     | Description                                                                         | Completed | Date |
| -------- | ----------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Modify Configure step to read global-config input parameter                         |           |      |
| TASK-011 | Update zzglobal_config processing to use merged configuration                       |           |      |
| TASK-012 | Ensure merged config is properly formatted for RENOVATE_CONFIG environment variable |           |      |
| TASK-013 | Test config merging with various user input scenarios                               |           |      |

### Implementation Phase 3: Documentation and Validation

- **GOAL-003**: Provide comprehensive documentation and manual validation examples

| Task     | Description                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------- | --------- | ---- |
| TASK-014 | Update README.md with global-config input parameter documentation |           |      |
| TASK-015 | Add usage examples for common configuration scenarios             |           |      |
| TASK-016 | Document security model and protected configuration fields        |           |      |
| TASK-017 | Add troubleshooting guide for config validation errors            |           |      |
| TASK-018 | Create example workflows showing global-config usage patterns     |           |      |

## 3. Alternatives

- **ALT-001**: **File-based configuration**: Could support reading config from a file instead of input parameter, but this adds complexity and doesn't align with GitHub Actions input patterns
- **ALT-002**: **Complete config override**: Could allow users to completely replace the base config, but this creates security risks and breaks the action's security model
- **ALT-003**: **YAML configuration**: Could support YAML input format, but JSON is more standard for Renovate and easier to process with jq
- **ALT-004**: **Multiple specific inputs**: Could add individual inputs for each config option, but this becomes unwieldy and less flexible than JSON
- **ALT-005**: **External script approach**: Could create separate bash script files, but keeping logic in Configure step maintains simplicity

## 4. Dependencies

- **DEP-001**: **jq**: JSON processing tool for merging and validating user configuration (install in docker/entrypoint.sh)
- **DEP-002**: **bash 4.0+**: Required for associative arrays and advanced bash features for config processing
- **DEP-003**: **Existing GitHub Actions inputs**: Already present INPUT\_\* environment variables for parameter access
- **DEP-004**: **Docker entrypoint script**: Existing docker/entrypoint.sh needs jq installation

## 5. Files

- **FILE-001**: `action.yaml` - Add global-config input parameter and update Configure step with config merging logic
- **FILE-002**: `docker/entrypoint.sh` - Add jq installation for JSON processing capabilities
- **FILE-003**: `README.md` - Updated documentation with global-config usage examples and security model

## 6. Testing

**Manual Testing Approach:**

- **TEST-001**: **Manual workflow testing**: Test the action manually with various global-config inputs in real GitHub workflows
- **TEST-002**: **Security validation**: Manually verify allowedCommands protection by attempting to override security settings
- **TEST-003**: **Edge case validation**: Test with empty configs, malformed JSON, and large configuration objects
- **TEST-004**: **Environment variable verification**: Confirm RENOVATE_CONFIG propagation to Docker container through action logs
- **TEST-005**: **Error handling validation**: Test graceful fallback to base config when user config is invalid

## 7. Risks & Assumptions

**Risks:**

- **RISK-001**: **Breaking existing workflows**: Config merging logic could fail and break existing users
- **RISK-002**: **Security vulnerabilities**: User config could potentially bypass security protections
- **RISK-003**: **Performance impact**: JSON processing with jq could slow down the Configure step
- **RISK-004**: **Bash complexity**: Complex JSON processing in bash could be error-prone
- **RISK-005**: **jq dependency**: Adding jq dependency in Docker container could cause issues

**Assumptions:**

- **ASSUMPTION-001**: Users will primarily want to customize onboarding configuration
- **ASSUMPTION-002**: JSON format is acceptable for configuration input (vs YAML or other formats)
- **ASSUMPTION-003**: Current security model (protected allowedCommands) is sufficient
- **ASSUMPTION-004**: jq JSON processing will be sufficient for secure config merging
- **ASSUMPTION-005**: Performance impact of jq processing will be negligible
- **ASSUMPTION-006**: Manual testing will be sufficient without automated test infrastructure
- **ASSUMPTION-007**: Existing TypeScript src/ files can remain untouched as placeholder templates

## 8. Related Specifications / Further Reading

- [Renovate Configuration Options](https://docs.renovatebot.com/configuration-options/) - Official Renovate configuration documentation
- [GitHub Actions Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) - GitHub's composite action documentation
- [Project Testing Strategy Documentation](../../docs/testing-strategy.md) - Internal testing approach documentation
- [Copilot Instructions](/.github/copilot-instructions.md) - Project-specific development guidelines and architecture patterns

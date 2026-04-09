# Admin Tabs Target Operating Model

Date: 2026-04-09

## Intent

This document defines the target operating model for the current HESEM MOM admin tabs so they can be restructured for:

- practical plant-floor use
- international governance logic
- backend-authoritative enforcement
- auditable and supportable operations

The design is based on enterprise patterns commonly aligned with ISO 9001, ISO/IEC 27001, ISO 15489, NIST identity and access guidance, and OWASP ASVS.

## Design Principles

1. One fact, one owner, one source.
2. UI may present or draft, but backend must decide and persist.
3. Roles, permissions, and organization are different entities and must not be collapsed into one field.
4. Every administrative change with business or security effect must be auditable.
5. Exceptions must be explicit, approved, time-bound, and reviewable.
6. Org structure must drive assignment and visibility, not be inferred from presentation labels.
7. Sensitive operational telemetry must be governed separately from administrative audit evidence.

## Current-to-Target Restructure

### Current Tabs

- Users
- Departments & Titles
- Org Chart
- Roles
- Document Permissions
- Module Access
- Activity Control

### Target Domains

The seven tabs should be restructured into three governance domains:

#### 1. Identity & Organization

- People
- Org Units
- Positions
- Position Assignments
- Reporting Lines
- Org Chart

#### 2. Access & Governance

- Role Catalog
- Role Assignments
- Document Access Policies
- Exception Access
- Module Policies
- Approval Queue

#### 3. Audit & Security

- Administrative Audit Trail
- Session Telemetry
- MFA & Authenticator Control
- Security Policy
- Retention & Privacy

## Target Tab Structure

### A. People

Replace the current `Users` tab with a People tab that separates identity, employment assignment, and authentication state.

Required sections:

- Core identity
- Employment and org assignment
- Access profile
- Credential and MFA state
- Lifecycle status
- Change history

Required fields:

- `person_id` or `user_id` as immutable UUID
- `username` as login name, not system primary key
- `employee_code`
- `display_name`
- `employment_status`
- `org_unit_id`
- `position_id`
- `reports_to_assignment_id`
- `primary_role_id`
- `secondary_role_ids`
- `authenticator_state`
- `effective_from`
- `effective_to`

What must disappear:

- sequential UI-generated ids
- role as the only identity of the person
- department and title as free text with no authoritative reference

### B. Org Units

Replace `Departments & Titles` with `Org Units & Positions`.

This tab should manage:

- enterprise/company/site/plant/work center context where needed
- department or function unit hierarchy
- status and ownership of units
- cost center or business-unit identifiers if used
- effective dating

Minimum model:

- `org_unit_id`
- `org_unit_code`
- `org_unit_name`
- `parent_org_unit_id`
- `org_unit_type`
- `status`
- `effective_from`
- `effective_to`

### C. Positions

Move job titles out of the department tree and manage them as positions.

This is the correct international pattern because:

- positions can survive people movement
- multiple people can hold the same position type
- a title is not the same as a person
- approvals and training matrices should bind to positions, not raw text labels

Minimum model:

- `position_id`
- `position_code`
- `position_name`
- `org_unit_id`
- `job_family`
- `grade`
- `is_managerial`
- `default_role_id`
- `jd_reference`
- `status`

### D. Position Assignments

This is the missing object that should replace today’s direct user-to-dept/title binding.

Minimum model:

- `assignment_id`
- `person_id`
- `position_id`
- `reports_to_assignment_id`
- `acting_assignment`
- `assignment_status`
- `effective_from`
- `effective_to`

The org chart must read from this table, not from user labels.

### E. Org Chart

Keep the tab, but make it a read model driven from `position_assignments` and `reporting_lines`.

The org chart should support:

- line reporting
- acting/interim assignments
- vacant positions
- future-dated moves
- site or plant filtering

The org chart should no longer allow direct governance edits unless those edits write through the authoritative org/assignment services.

### F. Role Catalog

Replace the current `Roles` tab with a true role catalog.

A role catalog must define:

- role identity
- role purpose
- privilege class
- business owner
- technical owner
- default scope
- segregation-of-duties constraints
- approval requirement for assignment
- review frequency
- status

Minimum model:

- `role_id`
- `role_code`
- `role_name`
- `role_type`
- `privilege_tier`
- `owner_party_id`
- `approval_required`
- `sod_constraints`
- `status`

What must disappear:

- privilege-bearing role booleans that exist only in frontend memory
- hardcoded admin logic that is disconnected from role administration

### G. Role Assignments

This must be a separate object from the role catalog.

Minimum model:

- `role_assignment_id`
- `person_id`
- `role_id`
- `scope_type`
- `scope_id`
- `granted_by`
- `granted_reason`
- `approved_by`
- `effective_from`
- `effective_to`
- `review_due_at`
- `status`

This is the correct place for:

- temporary elevation
- emergency access
- project-based access
- expiry-bound access

### H. Document Access Policies

Split the current `Document Permissions` tab into:

- Policy Matrix
- Exception Access

#### Policy Matrix

The matrix should define baseline access by role, position, org scope, or document class.

Required concepts:

- subject type
- resource type
- action
- condition
- effect
- version

Recommended policy shape:

- `policy_id`
- `subject_type`
- `subject_ref`
- `resource_type`
- `resource_pattern`
- `actions`
- `effect`
- `conditions`
- `priority`
- `status`

#### Exception Access

Per-user overrides must become exception records, not browser state.

Each exception must capture:

- requestor
- approver
- reason
- scope
- start and end date
- review and expiry
- audit link

This is the proper maker-checker pattern.

### I. Module Policies

Keep `Module Access`, but elevate it into a true backend policy decision point.

Target pattern:

- UI reads module policy
- API checks module policy
- policy store is authoritative
- route access and feature access use one engine

The module policy should no longer be only a menu governance tool.

Required model:

- `module_policy_id`
- `module_key`
- `subject_type`
- `subject_ref`
- `access_mode`
- `conditions`
- `status`
- `version`

### J. Administrative Audit Trail

Replace the current mixed audit situation with one admin audit trail.

Events that must land here:

- user created, updated, disabled, deleted
- password reset
- MFA reset
- org unit created, amended, deactivated
- position created, amended, retired
- reporting line change
- role created, changed, retired
- role assignment granted, revoked, approved, expired
- document policy changed
- document exception granted, denied, expired
- module policy changed
- config save failed or succeeded

Minimum event schema:

- `event_id`
- `event_type`
- `event_category`
- `actor_id`
- `subject_type`
- `subject_id`
- `object_type`
- `object_id`
- `before`
- `after`
- `reason`
- `request_id`
- `ip_address`
- `user_agent`
- `occurred_at`

### K. Session Telemetry

The current `Activity Control` tab should be narrowed to telemetry and operational monitoring, not treated as the same thing as audit.

Telemetry should cover:

- login session
- navigation summary
- device posture summary
- location and IP only where policy and consent allow

Telemetry rules:

- separate storage from admin audit
- clear retention period
- masking by role
- explicit consent basis where required
- no browser-local authority for enterprise evidence

## Functional Standardization Rules

### Identity Rules

- Use immutable ids everywhere.
- Never use row order as an identity.
- Never let changing username create ambiguity in person identity.

### Organization Rules

- Org units are reference data.
- Positions are reference data.
- People are assigned to positions.
- Org chart is a projection, not the master.

### Access Rules

- Role catalog defines what a role is.
- Role assignment defines who has the role.
- Policy matrix defines baseline access.
- Exception access defines approved deviations.
- Module visibility never substitutes for backend authorization.

### Audit Rules

- Audit is append-only.
- Audit and telemetry are separate.
- High-risk changes require before/after payloads.
- Every privileged change must have actor, reason, and timestamp.

### Operational Rules

- Config writes must survive real deployment permissions.
- Every write path must have smoke coverage.
- Every policy change must be testable and rollback-safe.

## What Should Be Changed in the Current Product

### Remove

- local-only storage for department, title, role, and permission governance
- unstable numeric ids in user-admin flows
- frontend-only admin flags as security-bearing truth
- per-user document override logic stored only in `sessionStorage`
- treating the activity tab as the authoritative audit system

### Convert

- `Users` into `People`
- `Departments & Titles` into `Org Units & Positions`
- `Roles` into `Role Catalog`
- `Document Permissions` into `Policy Matrix + Exception Access`
- `Activity Control` into `Administrative Audit Trail + Session Telemetry`

### Introduce

- position assignments
- reporting-line records
- role assignments
- exception approvals
- unified admin audit events
- backend policy engine

## Minimum Implementation Sequence

### Phase 1

- Stabilize config-write service and remove temp-file-only dependency.
- Replace browser-local governance saves with backend persistence.
- Introduce immutable person identity in admin UI and APIs.

### Phase 2

- Stand up org-unit, position, and assignment services.
- Move org chart to authoritative projection.
- Replace role-admin booleans with server-backed role catalog and role assignments.

### Phase 3

- Replace `ROLE_DOCS` plus frontend override logic with one backend policy engine.
- Move module access from menu-gating to backend-enforced policy.
- Split audit trail and telemetry into separate controlled systems.

### Phase 4

- Add approval workflows, SoD checks, periodic access review, expiry-based exception control, and exportable evidence packs.

## Practical Outcome

If implemented as designed, the admin area will become:

- more logical for real operations
- consistent between UI and backend
- less fragile in deployment
- auditable
- compatible with enterprise IAM and QMS governance patterns
- ready for controlled growth into MFA, Metadata Studio, Infrastructure, Version Control, and other sensitive admin workspaces

This is the correct restructuring path if the goal is to make the admin area operationally credible, globally defensible, and scalable.

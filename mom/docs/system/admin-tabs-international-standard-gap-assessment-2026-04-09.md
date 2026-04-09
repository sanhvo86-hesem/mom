# Admin Tabs International Standard Gap Assessment

Date: 2026-04-09

## Scope

This assessment covers seven HESEM MOM admin tabs:

- Users
- Departments & Titles
- Org Chart
- Roles
- Document Permissions
- Module Access
- Activity Control

The objective is to normalize these tabs against internationally recognized management, security, identity, records, and application-security practices, then identify the changes needed to make the implementation defensible in enterprise audit, certification, and operations.

## Standards Baseline

As of 2026-04-09, the reference baseline used in this assessment is:

- ISO 9001:2015 remains the current published quality-management requirements standard; ISO indicates a revision is under development and expected in September 2026.
- ISO/IEC 27001:2022 is the current ISMS requirements standard.
- ISO/IEC 27002:2022 is the current guidance standard for information-security controls.
- ISO 15489-1:2016 is the current records-management principles standard.
- NIST SP 800-63B-4 became final on 2025-07-31 and supersedes SP 800-63B.
- NIST SP 800-53 Rev. 5 remains current, with Release 5.2.0 issued on 2025-08-27.
- OWASP ASVS 5.0.0 is the latest stable ASVS release.
- NIST SP 800-218 SSDF 1.1 remains the current final secure-software-development baseline.

These standards are used here as a control model, not as a claim that the current system is certified.

## Executive Conclusion

The seven tabs do not currently form a single governance system. They are split across:

- server-backed runtime files
- hardcoded frontend models
- local browser `sessionStorage`
- legacy action endpoints
- newer controller/service layers that are only partially connected to the admin UI

This creates five structural nonconformities:

1. No single source of truth for organization, role, entitlement, and audit data.
2. UI authorization and backend authorization are not the same system.
3. Several admin tabs save locally in the browser instead of persisting to authoritative runtime storage.
4. Audit evidence is fragmented across multiple incompatible mechanisms.
5. Production write operations for several config-backed tabs are operationally fragile on the live VPS because config saves still depend on temporary-file creation in a directory that `www-data` cannot create new files in.

The current implementation is therefore usable as an admin shell, but not yet defensible as an internationally aligned governance plane.

## Evidence Summary

### Users

- The admin UI still uses legacy `admin_users_list` in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L15946), not the newer controller list method in [UserController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/UserController.php#L27).
- The legacy route emits a sequential UI id (`$i++`) instead of a stable immutable identity key in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L15955).
- The modern sanitization path already supports `org_company_code`, `org_legal_entity_code`, `org_plant_id`, and `org_site_id` in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L13575), and the controller upsert path supports writing those fields in [UserController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/UserController.php#L63).
- The actual admin modal does not expose those org-scope fields and only posts username, name, dept, title, role, active, CCCD, phone, and email in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L7259) and [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L7425).

### Departments & Titles

- Department and title structures are loaded from browser storage and saved back to browser storage only in [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L285) and [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L328).
- The admin editor operates directly on `DEPARTMENTS`, `DEPT_TITLES`, `TITLES`, and `USERS` in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L7912).
- There is no authoritative backend CRUD for these structures in the current admin-tab path.

### Org Chart

- The org chart is derived from `USERS` plus `ROLES[level]` in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L8102).
- There is no explicit reporting-line model such as `manager_id`, `reports_to`, `position_assignment`, or effective-dated hierarchy.

### Roles

- The frontend role catalog is defined in [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L116).
- The admin screen lets operators toggle `approve`, `admin`, `canViewActivity`, and `canExportUsers` in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L8377).
- However, the only role data persisted server-side from that screen is `canCreateDocs` via [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L828).
- Actual admin status in backend is hardcoded in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L260) and enforced by [BaseController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/BaseController.php#L369).

### Document Permissions

- Client document access uses `ROLE_DOCS` and local `PERM_OVERRIDES` in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L1242).
- Per-user overrides are stored only in browser storage in [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L946).
- Backend runtime permission checks ignore those overrides and instead use `role_permissions.json` through [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L1225).
- The frontend `ROLE_DOCS` catalog and backend `role_permissions.json` are not the same catalog. Current counts are `34` frontend roles vs `38` backend roles, with backend-only roles: `developer`, `engineering_manager`, `production_manager`, `quality_manager`.

### Module Access

- This is the strongest of the seven tabs. It has server-backed config in `module_access_config.json`, read/save actions in [AdminController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/AdminController.php#L390), and a smoke test in [module_access_smoke.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/tests/module_access_smoke.php#L45).
- But effective enforcement is still primarily a frontend concern through [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L555).
- Backend controllers still enforce access through hardcoded `requireAdmin()` and `requireAnyRole()` checks instead of a shared module-access policy engine, for example in [BaseController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/BaseController.php#L369).

### Activity Control

- The activity tab reads session telemetry from browser-only `ACTIVITY_LOG` in [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L339) and renders/exports/clears it in [02-state-auth-ui.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/02-state-auth-ui.js#L8192).
- Access to the tab itself depends on a client-side role flag in [01-data-config.js](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/scripts/portal/01-data-config.js#L390).
- Separately, API controllers write a flat `data/audit.log` through [BaseController.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api/controllers/BaseController.php#L542).
- Separately again, `DataLayer` supports structured `audit_events` JSONL/Postgres logging in [DataLayer.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/database/DataLayer.php#L1294).

### Production Save Fragility

- Generic JSON config writes still use temp-file-only writes in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L646).
- This write path is used by role permissions, docs visibility, portal display, and module access in [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L1085), [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L1380), [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L1499), and [api.php](/Users/a10/Library/CloudStorage/GoogleDrive-n.uyenvo1911@gmail.com/My%20Drive/sanh/git/hesemeqms/mom/api.php#L1706).
- On the live VPS, `www-data` cannot create a new temp file inside `/var/www/eqms.hesemeng.com/mom/data/config`; a direct runtime probe under `www-data` returned `false`.

## International Standard Interpretation

### ISO 9001:2015

For these tabs, ISO 9001 primarily demands:

- controlled documented information
- clearly assigned responsibilities and authorities
- evidence that processes operate as planned
- objective evidence for audit
- continual improvement through monitored process control

The current admin tabs fail this standardization test where process control exists only in browser state, where org structure is not authoritative, and where admin actions cannot be traced back to a controlled record system with stable identifiers.

### ISO 15489-1:2016

For these tabs, ISO 15489 requires:

- records, metadata, and record systems
- assigned responsibilities
- controls for creation, capture, and management
- monitoring, training, and recurrent analysis of business context

The current system does not treat role changes, permission exceptions, org-structure changes, or session telemetry as one records-management system. Instead, it mixes browser-local state, ad hoc JSON files, and separate audit files.

### ISO/IEC 27001:2022 and ISO/IEC 27002:2022

For these tabs, the applicable security interpretation is:

- identity and access must be risk-managed as part of an ISMS
- access control must be centrally governed
- sensitive administrative actions must be auditable
- privilege assignment and exceptions must be controlled
- information assets and personal data must be protected proportionately

The split-brain model between frontend access logic and backend enforcement is not compatible with a mature ISMS. It is especially problematic that UI role flags can imply powers that the backend does not recognize, and that user-specific permission overrides do not exist in backend policy evaluation.

### NIST SP 800-63B-4 and SP 800-53 Rev. 5

For these tabs, the practical control themes are:

- strong authenticator management and lifecycle handling
- authorization based on explicit policy, not UI convention
- stable account identity and lifecycle state
- auditable privileged activity
- configuration integrity and recoverable change control

The current system is closest to conformance in account storage and MFA basics, but still weak on authenticator lifecycle evidence, privileged action governance, configuration resilience, and stable identity keys.

### OWASP ASVS 5.0.0 and NIST SSDF

For these tabs, the application-security interpretation is:

- authentication, authorization, configuration, and logging must be verifiable as application controls
- admin actions must be enforced server-side
- deployment, config writes, and runtime state changes must be safe and testable

The live temp-file save failure is a direct violation of this intent because admin writes can appear implemented in code while failing in the deployed environment.

## Severity-Ranked Gaps

### P1 Critical

1. Split source of truth across frontend state, config JSON, and newer backend services.
2. Frontend role model is not the backend role model.
3. Per-user document overrides are not part of backend authorization.
4. User-specific overrides rely on unstable sequential ids from the legacy user list.
5. Several config-save paths are likely broken in production because `write_json_file()` still requires temp-file creation in a non-creatable directory for `www-data`.

### P2 High

1. User admin does not expose or manage org-scope linkage even though backend supports it.
2. Org chart is only a visual derivation, not a governance object.
3. Department and title administration is not authoritative master data.
4. Activity Control is not a proper audit subsystem and handles sensitive telemetry in browser state.
5. Module Access is not the server authorization system; it is a frontend governance shell plus a config file.

### P3 Medium

1. Reset actions clear browser state broadly and can erase admin context without changing server truth.
2. Plain temporary credential handling remains operationally risky.
3. Smoke coverage is strongest for module access and new foundation/governance slices, but weak for most admin-tab persistence and enforcement paths.

## Standardized Target State

### Required Core Records

These tabs should ultimately operate on a unified governance model:

- `person`
- `employment_record`
- `organization_unit`
- `position`
- `position_assignment`
- `reporting_line`
- `role_catalog`
- `role_assignment`
- `entitlement_policy`
- `entitlement_exception`
- `module_policy`
- `audit_event`
- `session_telemetry`
- `configuration_item`

Each record must have:

- immutable primary key
- created/updated timestamps
- actor for change
- effective dating where applicable
- version or ETag for concurrency
- audit trail pointer

### Target Tab Design

| Tab | International-grade target |
| --- | --- |
| Users | Identity lifecycle and employment assignment, not just login editing |
| Departments & Titles | Authoritative organization and position master data |
| Org Chart | Derived view from authoritative reporting-line and assignment records |
| Roles | Server-backed RBAC catalog with approval, SoD, and lifecycle |
| Document Permissions | Policy engine plus approved time-bound exceptions |
| Module Access | Backend-enforced policy decision point used by UI and API |
| Activity Control | Unified audit/telemetry service with retention, masking, and evidentiary integrity |

## Recommended Normalization Program

### Wave 1: Stabilize Runtime

- Replace temp-file-only config writes with a shared safe write service used by all config-backed controllers.
- Stop using sequential list ids for admin identity operations; use immutable username or UUID.
- Remove local-only persistence from department/title, role-admin, and per-user permission exception flows.
- Make backend the only authority for role-admin status and privilege-bearing flags.

### Wave 2: Establish SSOT

- Move department, title, org chart, role catalog, and permission exceptions to the newer foundation/master-data/governance slice.
- Use effective-dated org and position assignments.
- Replace `ROLE_DOCS` client truth with one backend permission model and one public projection for UI.
- Expose org-scope fields in the user admin model and link them to authoritative org entities.

### Wave 3: Standardize Audit and Security

- Merge controller audit, telemetry, and structured audit events into one event taxonomy.
- Separate user telemetry from administrative audit events and apply clear retention, masking, and access rules.
- Treat password reset, MFA reset, role change, entitlement exception, and module policy change as high-risk auditable events with before/after payloads.
- Enforce policy decisions server-side for all sensitive modules and admin routes.

### Wave 4: Certifiable Control Posture

- Add maker-checker approval for role catalog changes, entitlement exceptions, and org-structure changes.
- Add segregation-of-duties checks for high-risk combinations.
- Add control assessments and regression suites for all seven tabs, not only module access and backend foundations.
- Produce exportable evidence packs: configuration baseline, change history, approver, effective date, related incident or ticket, and rollback status.

## Tests and Validation Run During Assessment

- `php mom/tests/module_access_smoke.php` passed.
- `php mom/tests/backend_smoke.php` passed.
- `php mom/tests/foundation_governance_contract_smoke.php` passed with `114/114`.

This means the emerging foundation/governance backend is materially stronger than the current admin-tab implementations. The correct strategic move is to migrate the seven tabs onto that backend, not to continue expanding browser-local governance logic.

## Recommended Next Deliverable

The next concrete engineering artifact should be a control architecture specification for these seven tabs with:

- canonical entities
- authoritative API surface
- policy decision model
- audit event taxonomy
- retention and privacy rules
- migration plan from legacy admin tabs
- test matrix mapped to ISO 9001, ISO 15489, ISO/IEC 27001, NIST SP 800-63B-4, NIST SP 800-53, and OWASP ASVS

That document should become the implementation contract before any more UI expansion happens in these tabs.

# P05 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P05-CLAIM-001 | `party`, `party_role`, `party_site`, and `party_contact` already exist and are writeable through `FoundationGovernanceService`. | REPO_EVIDENCE | `mom/database/migrations/072_canonical_foundation_governance.sql`; `mom/api/services/FoundationGovernanceService.php` | High | Party authority could be described as target-state only when it already exists physically | anchor P05 to existing foundation objects | verified |
| P05-CLAIM-002 | Human identity SSOT is intentionally separate from party master and is enforced by policy and CI guard. | REPO_EVIDENCE | `.ai/USER_IDENTITY_SSOT.md`; `mom/tools/release/check_user_identity_ssot.php` | High | P05 could incorrectly merge user identity into party and create forbidden parallel truth | keep Party and UserIdentity as linked authorities | verified |
| P05-CLAIM-003 | `v_user_canonical` is the canonical combined read source for `users + roles + hcm_employees`. | REPO_EVIDENCE | `mom/database/migrations/178_user_identity_ssot_guards.sql` | High | employee/user reads could drift or be modeled against deprecated joins | derive EmployeeProfile and UserAccount reads from this view | verified |
| P05-CLAIM-004 | `AuthUserShadowSyncService::syncUser()` is the allowlisted dual-write boundary for user/employment identity writes. | REPO_EVIDENCE | `mom/api/services/AuthUserShadowSyncService.php`; `.ai/USER_IDENTITY_SSOT.md` | High | unauthorized mutation path might be designed into P05 commands | forbid direct writes outside the existing SSOT writer chain | verified |
| P05-CLAIM-005 | `master_data.customers`, `master_data.suppliers`, and `master_data.employees` currently remain compatibility-alias contracts over live runtime surfaces. | REPO_EVIDENCE | `mom/contracts/objects/master_data--customers/contract.json`; `mom/contracts/objects/master_data--suppliers/contract.json`; `mom/contracts/objects/master_data--employees/contract.json` | High | canonical naming could be mistaken for completed physical convergence | define them as profiles/aliases over current physical lanes | verified |
| P05-CLAIM-006 | Data-layer employee projection already reads `v_user_canonical` and only falls back to legacy `employees.metadata` for operator tags. | REPO_EVIDENCE | `mom/database/DataLayer.php` | High | operator/readiness design could miss the remaining legacy metadata dependence | keep this as an explicit migration bridge | verified |
| P05-CLAIM-007 | Supplier qualification and certification authority already has a physical lane in `approved_supplier_list`. | REPO_EVIDENCE | `mom/database/migrations/035_supplier_quality_management.sql` | High | supplier gates could be invented without a real backend lane | reuse ASL as the current governed approval backbone | verified |
| P05-CLAIM-008 | Training and competency evidence already has a physical lane in `training_record`, `training_matrix`, and certification tables. | REPO_EVIDENCE | `mom/database/migrations/078_canonical_eqms_compliance_backbone.sql`; `mom/contracts/table-registry.json` | High | operator qualification design could be reduced to JSON-only despite available compliance tables | bind OperatorProfile gates to released document/training evidence | verified |
| P05-CLAIM-009 | Current workforce execution gate still relies on configuration/event ledger inputs instead of a PostgreSQL-native qualification authority chain. | REPO_EVIDENCE | `mom/api/services/WorkforceQualificationGateService.php` | High | prompt could overclaim operator-readiness completeness | keep as controlled migration gap, not hidden authority | verified |
| P05-CLAIM-010 | P03 and P04 already locked `Party` and `UserIdentity` as separate roots and deferred exact bridge resolution to P05. | REPO_EVIDENCE | `_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_ROOT_AUTHORITY_LEDGER.csv`; `_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_POSTGRES_BLUEPRINT.md` | High | this prompt could diverge from prior decisions | resolve bridge rules without reopening root taxonomy | verified |
| P05-CLAIM-011 | Existing command/event/object registries still name customers/suppliers/employees as canonical resources backed by legacy physical tables. | REPO_EVIDENCE | `mom/contracts/object-index.json`; `mom/contracts/command-index.json`; `mom/contracts/event-index.json` | High | P05 could recommend breaking API names prematurely | keep compatibility aliases explicit until later cutover | verified |
| P05-CLAIM-012 | The repo contains enough evidence to define Party/User/Employee authority rules without browsing external sources because the prompt is repo-authority specific. | INFERENCE | repo evidence above | Medium | under-researched policy claim | limit conclusions to repo-grounded authority, not compliance certification | verified |

## Authority model

1. `Party` is the business-party backbone for customers, suppliers, external auditors, ship-to/remit-to entities, contacts, and optionally internal persons when a governed business relationship is required.
2. `UserIdentity` remains the human-login SSOT in `users` with role resolution from `roles` and HCM attributes from `hcm_employees`, read through `v_user_canonical`.
3. `EmployeeProfile` is a governed labor/personnel profile linked to `UserIdentity.employee_id`; it is not a replacement for `UserAccount`, and it is not allowed to become a second login authority.
4. `OperatorProfile` is an execution-readiness profile layered over EmployeeProfile plus qualification/certification/training/authorization evidence. It is a governed role-scope, not a person root.
5. `CustomerProfile` and `SupplierProfile` are lifecycle-owner profiles attached to Party. Current physical tables `customers`, `suppliers/vendors`, `approved_supplier_list`, contacts, and addresses remain compatibility bridges until later physical convergence.

## Canonical object contracts

| Object | Canonical class | Physical state now | Authority decision | Notes |
| --- | --- | --- | --- | --- |
| `Party` | `lifecycle_owner` | existing canonical table | canonical business-identity root | owns `PartyRole`, `PartySite`, `PartyContact` |
| `PartyRole` | `contained_child` | existing canonical table | canonical role-scoping child | supplier/customer/internal-contact meaning lives here |
| `PartySite` | `contained_child` | existing canonical table | canonical site/address child | ship-to/bill-to/supplier-site scope |
| `PartyContact` | `contained_child` | existing canonical table | canonical contact child | supersede rather than overwrite regulated contact history |
| `CustomerProfile` | `lifecycle_owner` | legacy `customers` lane | compatibility-lifecycle owner attached to Party | transition to party-backed profile later |
| `SupplierProfile` | `lifecycle_owner` | legacy `suppliers/vendors` + `approved_supplier_list` | compatibility-lifecycle owner attached to Party | ASL remains current approval gate |
| `EmployeeProfile` | `lifecycle_owner` | `employees` + `hcm_employees` + `v_user_canonical` | linked authority rooted in UserIdentity SSOT | do not create person duplicate in party by default |
| `OperatorProfile` | `result_record` + governed eligibility view | config/service + training/cert tables | derived readiness authority | must be recomputed from active evidence |
| `UserAccount` | `lifecycle_owner` | `users` | canonical login identity root | only allowlisted writers mutate |
| `UserPartyLink` | `contained_child` target addition | not physically implemented | target bridge object | links user/employee to governed party roles |
| `UserRoleAssignment` | `contained_child` | `user_roles` + `roles` | canonical security scope child | approvals/SoD required for elevation |
| `EmployeeSkill` | `result_record` | partial via qualification ledger / training tables | governed evidence-backed record | not freeform text |
| `TrainingRecord` | `evidence_record` | physical canonical table | canonical training evidence | must link to document revision where applicable |
| `Certification` | `evidence_record` | existing HCM/employee certification lanes | canonical capability evidence | expiry and revocation must gate readiness |
| `OperatorMachineAuthorization` | `result_record` | not physically unified | governed derived authorization | scope by machine family/site/work center |
| `OperatorOperationAuthorization` | `result_record` | not physically unified | governed derived authorization | scope by process/operation code |

## Command catalog

| Command | Target object | Authority owner | Preconditions | Writes | Emits |
| --- | --- | --- | --- | --- | --- |
| `CreateParty` | `Party` | master-data command service | unique business key, legal/display name present | `party` | `party.created` |
| `AssignPartyRole` | `PartyRole` | master-data command service | party active, role scope known | `party_role` | `party.role_assigned` |
| `CreateCustomerProfile` | `CustomerProfile` | sales/commercial command service | party has customer role, operational defaults complete | `customers` + party link metadata | `customer.profile_created` |
| `CreateSupplierProfile` | `SupplierProfile` | procurement/supplier-quality command service | party has supplier role, qualification package initiated | `vendors/suppliers`, ASL starter row | `supplier.profile_created` |
| `CreateEmployeeProfile` | `EmployeeProfile` | identity/HR command service | canonical employee id exists, HCM linkage valid | `users` via allowlisted writer; `hcm_employees` | `employee.profile_created` |
| `LinkUserToParty` | `UserPartyLink` | identity command service | existing user, existing party, SoD-safe link type | target `user_party_link` bridge table | `user.party_linked` |
| `AssignUserRole` | `UserRoleAssignment` | identity/IAM command service | role known, approval satisfied, no conflicting SoD | `user_roles`, maybe `users.primary_role_id` | `user.role_assigned` |
| `AssignOperatorQualification` | `OperatorProfile` evidence | MES/HR/quality command service | training/cert evidence released and current | qualification/certification lane | `operator.qualification_assigned` |
| `BlockPartyRole` | `PartyRole` or profile gate | master-data owner domain | blocking basis recorded | role/profile status fields | `party.role_blocked` |
| `MergeDuplicateParty` | `Party` | master-data governance board | duplicate confidence high, no conflicting open merges | survivor + superseded references | `party.merged` |
| `SupersedeContact` | `PartyContact` | master-data command service | replacement contact exists or redaction basis approved | old contact inactive, new contact primary | `party.contact_superseded` |
| `RevokeAuthorization` | operator/user/profile auth | owning domain command service | cause recorded, actor approved | authorization/cert link state | `authorization.revoked` |

## Gate model

### Commercial and supplier gates

- `ConfirmSO` must fail if `CustomerProfile` is `on_hold`, `inactive`, `archived`, or has unresolved quality/credit hold.
- `CreatePO` and receipt release must fail if supplier is not `qualified` or `spend_authorized`, if ASL expired, if site scope is blocked, or if mandatory certs are expired.
- Customer-specific item approval and supplier-process approval are separate governed release gates; absence of approval cannot be bypassed by general active status.

### Employee and operator gates

- `StartJob` must fail if employee is not active, shift is invalid, machine/operation authorization missing, training or certification expired, or SoD rule blocks the actor.
- regulated `Approve`, `MRB`, `Deviation`, `CAPA`, `release` commands must fail if user is not linked to the required person/profile authority, has MFA disabled, or is both originator and approver without explicit governed override.
- `OperatorProfile` is projection-only for dashboards; command gates must read evidence-backed qualification/authorization records, not a cached board alone.

### Privacy and IAM controls

- PII minimization: Party contact PII and employee/user PII are distinct domains and must not be overexposed in supplier/customer grids.
- access-purpose control: commercial users see customer contacts, supplier quality sees supplier cert packages, HR sees employee detail, MES sees only the minimum operator-readiness slice.
- redaction does not delete audit history; legal hold preserves evidence rows while masking non-essential presentation fields.

## Role model

1. Internal employee is not equal to login user. An employee can exist before or after a user account.
2. User login is not equal to operator qualification. Login proves identity and coarse RBAC, not machine/operation competency.
3. One person may simultaneously hold customer-contact, supplier-auditor, employee, and approver roles, but each scope must be modeled through explicit link objects and SoD checks.
4. Party links for internal humans are optional and purpose-bound. They are required when business-party semantics matter, such as external-facing commercial ownership or document ownership by party.

## Duplicate and merge policy

| Domain | Primary duplicate signals | Merge policy |
| --- | --- | --- |
| Customer/Supplier party | tax id, legal name, ERP code, primary email, country | merge only after cross-document impact scan on SO/PO/quality cases; never overwrite survivor lineage |
| Employee/User | employee_id, username, email, CCDD/ID, canonical employee hash seed | never merge by ad-hoc SQL; resolve through identity service and HR approval |
| Contact | same party + normalized email/phone + role | supersede or inactivate duplicate contact; preserve audit trail |
| Operator authorization | employee_id + machine family + operation code + effectivity | deduplicate by latest active evidence, not by replacing historical records |

## Projection policy

- `customer_list`
- `supplier_scorecard`
- `employee_skill_matrix`
- `operator_readiness_board`

All four are projection-only. They must expose lineage fields and `stale_at`/`source_updated_at` style telemetry before being used for decisions.

## Repair pass applied in P05

1. Resolved the Party-vs-UserIdentity design tension by explicitly modeling `linked authority` instead of forced table convergence.
2. Reused `approved_supplier_list`, `training_record`, `employee_certifications`, and `v_user_canonical` as current evidence anchors instead of inventing placeholder tables.
3. Converted `OperatorProfile` from a guessed root into an evidence-backed readiness projection governed by command-time gates.
4. Explicitly kept `customers`, `suppliers/vendors`, and `employees/hcm_employees` as compatibility lanes to avoid false migration claims.

## Final re-audit result

No unresolved P0 or P1 issue remains inside this prompt output. Remaining gaps are P2 migration/implementation gaps and do not block `P06`.

## Decision token

`P05_PASS_WITH_CONTROLLED_GAPS`

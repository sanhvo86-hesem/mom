# P28 — Party, Customer, Supplier, Employee, Operator and User Authority

## 1. Executive Verdict

Decision token: `P28_PASS_WITH_CONTROLLED_GAPS`

P28 repaired the missing physical authority layer for party/user identity linkage, party profile extensions, customer-item approvals, supplier-process approvals, and duplicate-merge remap planning. It also added a read/evaluate service with tests for operator identity, qualification, supplier certificate, SoD, and merge-remap risks.

This is not a runtime-complete party authority platform. Mutation authority, idempotency, audit/evidence, outbox, problem details, regulated e-sign/re-auth, and start-job readiness wiring remain owned by P31, P32, and P34.

## 2. Source Truth Audit

Detailed audit: `P28_SOURCE_TRUTH_AUDIT.csv`

Key findings:

| Area | Repo Evidence | Verdict |
| --- | --- | --- |
| Party root | `mom/database/migrations/072_canonical_foundation_governance.sql` has `party`, `party_role`, `party_site`, `party_contact`. | Base exists. |
| User identity SSOT | `.ai/USER_IDENTITY_SSOT.md`, migration `178`, and `AuthUserShadowSyncService.php` define `v_user_canonical` and single writer. | P28 must not duplicate identity fields or write identity tables. |
| Operator qualification | `mom/database/migrations/025_mes_tables.sql` has `mes_operator_qualifications`; `WorkforceQualificationGateService.php` still uses config/ledger files. | Physical source exists but runtime convergence is incomplete. |
| Approvals | `MasterDataService.php` has JSON collections for `customer_item_approvals` and `supplier_process_approvals`; `POSTGRES_MIGRATION_AND_SYNC_SPEC.md` requires them in sync coverage. | P28 needed physical approval tables. |
| Duplicate merge | `mdm_duplicate_candidates` exists but no transactional remap catalog. | P28 needed remap catalog. |
| Runtime policy | `RUNTIME_AUTHORITY_MAP.md` and `DOMAIN_COMMAND_SPEC.md` require PG authority and command mutation authority. | P28 can add schema/gate helper but cannot claim command completion. |

Discovery command summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- `git rev-parse --short HEAD`: `7a303f12a`
- `git status --short` before edits: clean
- Previous prompt handoff: `P27_PASS_WITH_CONTROLLED_GAPS`
- Prompt-specific search confirmed `operator_party_id`, `mes_operator_qualifications`, `mdm_duplicate_candidates`, `v_user_canonical`, and missing `user_party_link`.

## 3. Runtime Evidence Probe

Added runtime artifacts:

- `mom/database/migrations/232_party_identity_link_authority.sql`
- `mom/api/services/PartyIdentityAuthorityService.php`
- `mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php`

`PartyIdentityAuthorityService::authorityProbe()` reports:

- identity read source: `v_user_canonical`
- user mutation authority: `AuthUserShadowSyncService`
- bridge authority: `user_party_link`
- profile authority: `party_profile_extension`
- approval authorities: `customer_item_approval_authority`, `supplier_process_approval_authority`
- remap authority: `party_merge_remap_catalog`
- direct user table write allowed: `false`
- Generic CRUD mutation allowed: `false`

## 4. Files Changed

Created:

- `mom/database/migrations/232_party_identity_link_authority.sql`
- `mom/api/services/PartyIdentityAuthorityService.php`
- `mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php`
- `P28_SOURCE_TRUTH_AUDIT.csv`
- `P28_IMPLEMENTATION_PLAN.md`
- `P28_SIMULATION_MATRIX.csv`
- `P28_ADVERSARIAL_AUDIT.md`
- `P28_GAP_LEDGER_UPDATE.csv`
- `P28_HANDOFF_PACKET.md`
- `P28_MAIN.md`

Modified:

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`

Intentionally not changed:

- `AuthUserShadowSyncService.php`: remains identity mutation authority.
- `WorkforceQualificationGateService.php`: P34 owns readiness convergence.
- `mom/contracts/table-registry.json`: generated artifact, not hand-edited.
- UOM files: avoided to prevent cross-session collision.

## 5. Design And Code Delta

Schema:

- `user_party_link`: effectivity-based bridge from HESEM user identity to party master, without identity field duplication.
- `party_profile_extension`: typed profile bridge for customer/supplier/employee/operator profile semantics.
- `customer_item_approval_authority`: physical customer-item/revision approval scope.
- `supplier_process_approval_authority`: physical supplier/process/item/site/certificate approval scope.
- `party_merge_remap_catalog`: planned/applied/rollback remap catalog for duplicate party merges.

Service:

- blocks inactive/terminated users before qualification checks.
- blocks expired/inactive qualifications.
- blocks expired supplier process certificates.
- validates customer item approval effectivity/status.
- blocks self-approval without bounded SoD exception.
- requires every merge reference to have an explicit remap policy.

Registry:

- `MDA-PARTY-IDENTITY` now includes new P28 tables and service commands in the governed entity registry used by the Generic CRUD hard stop.
- `GenericCrudController` fallback denylist now includes the new P28 tables so governed mutation stays blocked even if the registry cannot be loaded.

## 6. Simulation Matrix Summary

Detailed matrix: `P28_SIMULATION_MATRIX.csv`

Covered scenarios:

- party duplicate merge across SO/PO/NCR/CAPA/inventory references.
- terminated employee cannot operate machine.
- supplier blocked by expired certificate cannot receive PO.
- customer quality hold blocks shipment through P33 dependency.
- same person cannot create and approve regulated release without SoD exception.
- future-dated user-party link cannot be used early.
- blocked customer-item approval blocks SO/release flow.

## 7. Adversarial Audit Summary

Detailed audit: `P28_ADVERSARIAL_AUDIT.md`

Highest residual risks:

- P31 command envelope is still required for mutation authority.
- P32 is still required for e-sign, re-auth, and SoD exception lifecycle.
- P34 is still required for ResourceReadinessService and shopfloor start gates.
- P37/P40 must regenerate table registry/OpenAPI and telemetry artifacts.
- P29 must prove PostgreSQL migration and restore evidence.

## 8. Gap Ledger Update

Detailed update: `P28_GAP_LEDGER_UPDATE.csv`

P28 partially repaired:

- `GAP-P05-001`: physical `user_party_link` exists, command layer pending.
- `GAP-P05-002`: qualification gate logic exists, readiness convergence pending.
- `GAP-P05-003`: physical customer/supplier approval tables exist, command gates pending.
- `GAP-P05-004`: remap catalog and planning guard exist, transactional merge apply pending.
- `GAP-P05-005`: SoD precheck exists, e-sign/re-auth pending.

New controlled gaps:

- `P28-NEW-001`: generated table registry/OpenAPI not refreshed.
- `P28-NEW-002`: migration not applied to live PostgreSQL in this worktree.

## 9. CI And Test Evidence

Commands run:

```bash
php -l mom/api/services/PartyIdentityAuthorityService.php
php -l mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php
python3 -m json.tool mom/contracts/governed-entities.json
php mom/tools/release/check_user_identity_ssot.php || true
php -r 'require "mom/api/services/PartyIdentityAuthorityService.php"; ...'
```

Observed:

- PHP syntax passed for service and test.
- Bulk `php -l mom/api/services/*.php` passed for all service files, including `PartyIdentityAuthorityService.php`.
- Bulk `php -l mom/api/controllers/*.php` passed for all controller files.
- governed entity JSON is valid.
- SSOT guard returned `user identity ssot clean`.
- Direct PHP smoke returned `party_identity_smoke_ok`.
- `php mom/tools/audit_runtime_authority_consistency.php || true` ran and still reports `JSON_ONLY` with PostgreSQL not configured/reachable.
- `php mom/tools/release/check_migration_drift.php || true` reported only existing P2 prefix collisions for `108`, `115`, and `188`; no P1/fatal issues.
- `composer test -- --filter Party, || true` is unavailable because root Composer has no `test` command.
- `composer --working-dir=mom test -- --filter PartyIdentityAuthorityServiceTest || true` is unavailable because `vendor/bin/phpunit` is missing.
- `npm test -- --runInBand 2>/dev/null || true` produced no runnable test output in this checkout.
- `git diff --check` passed.

Required prompt commands:

```bash
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
composer test -- --filter Party, || true
php mom/tools/audit_runtime_authority_consistency.php || true
npm test -- --runInBand 2>/dev/null || true
```

Known limitations: Composer root has no `test` command, `mom/vendor/bin/phpunit` is missing, and live PostgreSQL remains unavailable in this worktree.

## 10. Decision Token

`P28_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff Packet

See `P28_HANDOFF_PACKET.md`.

# P28 Implementation Plan

## Scope Executed

P28 was run in hybrid/apply-patch mode on branch `codex/mda-v3-runtime-upgrade-20260529`.

The safe vertical slice physicalizes the missing authority records and adds a read/evaluate service. It intentionally does not mutate `users`, `employees`, `hcm_employees`, or `users.json`.

## Files Created

- `mom/database/migrations/232_party_identity_link_authority.sql`
- `mom/api/services/PartyIdentityAuthorityService.php`
- `mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_HANDOFF_PACKET.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_MAIN.md`

## Files Modified

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Runtime Delta

1. Add `user_party_link` as the physical bridge from `users.user_id` to `party.party_id` with effectivity, approval actor links, row version, and active uniqueness.
2. Add `party_profile_extension` to prevent customer/supplier/employee/operator profile data from drifting into freeform party metadata.
3. Add `customer_item_approval_authority` and `supplier_process_approval_authority` to remove implicit JSON-only approval scope from contract, PO, receipt, engineering release, and shipment gates.
4. Add `party_merge_remap_catalog` to require every affected SO/PO/NCR/CAPA/inventory/finance reference to be enumerated before duplicate merge is applied.
5. Add `PartyIdentityAuthorityService` as a runtime gate helper for identity status, user-party link effectivity, operator qualification, supplier certificate expiry, customer item approval, SoD, and merge-remap planning.
6. Extend the P26 governed entity registry so Generic CRUD blocks the new P28 tables.
7. Extend `GenericCrudController` fallback denylist so P28 tables remain protected if the generated governed registry cannot be loaded.
8. Update runtime proof matrix rows for `ROOT-PARTY-001` and `ROOT-IDENT-001`.

## Files Intentionally Not Changed

- `.ai/USER_IDENTITY_SSOT.md`: policy already blocks direct identity writes.
- `mom/contracts/table-registry.json`: generated artifact; new tables should be picked up by the registry generation wave rather than hand-maintained here.
- `AuthUserShadowSyncService.php`: remains the only legal identity writer.
- `WorkforceQualificationGateService.php`: kept stable; P34 owns convergence with ResourceReadinessService.
- UOM files: intentionally untouched to avoid cross-session collision.

## Remaining Implementation

- P31 must wrap party link/approval/merge mutations in command envelope, idempotency, audit, evidence, outbox, and problem details.
- P32 must enforce regulated re-auth, e-sign meaning, record hash, SoD exception lifecycle, and audit chain.
- P34 must connect operator qualification to `ResourceReadinessService` and start-job gates.
- P37/P40 must regenerate table registry/OpenAPI artifacts and wire telemetry.

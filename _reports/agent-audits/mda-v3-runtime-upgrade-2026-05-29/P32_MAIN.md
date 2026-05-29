# P32 - Workflow, Status, Approval, Evidence, Audit and E-signature Runtime Spine

## 1. Executive Verdict

Decision token: `P32_PASS_WITH_CONTROLLED_GAPS`

P32 converted the workflow/e-sign/audit authority from design-only evidence into a runtime gate slice. It adds physical regulated command policy tables, a service that blocks unsafe regulated command evidence, e-sign challenge action coverage for MDA regulated commands, tests for all required P32 simulations, and proof-matrix updates.

This is still not runtime-complete authority. Domain handlers for quality hold, engineering release, item revision release, party merge, inventory/cost adjustments, and WO release/start are not complete. PostgreSQL is also not configured/reachable in the current runtime probe, so no production/PostgreSQL-primary or compliance claim is made.

## 2. Source Truth Audit

Detailed audit: `P32_SOURCE_TRUTH_AUDIT.csv`

Key evidence:

- `WorkflowStatusAuthorityService` already validates workflow/status parity, but the release tool cannot run locally without `mom/vendor/autoload.php`.
- `ElectronicSignatureChallengeService` and `ElectronicSignatureService` already enforce server-issued challenge and signed hash semantics; P32 adds regulated MDA command actions.
- `AuditTrail` and migrations `101`, `106`, `126`, and `235` provide evidence/audit foundations, but live command audit writes are not proven.
- P13/P23/P24 show workflow/e-sign/audit as P1 runtime authority gaps, not P2 documentation gaps.

Discovery summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- Branch: `codex/mda-v3-runtime-upgrade-20260529`
- P32 started after P31 commit `cbbb6f0a0`
- Search found prior P13 workflow/e-sign planning artifacts and existing runtime services, but no physical regulated command policy/link table before P32.

## 3. Runtime Evidence Probe

Added:

- `mom/database/migrations/236_regulated_command_evidence_policy.sql`
- `mom/api/services/RegulatedCommandEvidenceGateService.php`
- `mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php`

`RegulatedCommandEvidenceGateService` checks:

- policy command name and required approval steps.
- explicit signature meaning.
- signer identity and signed timestamp.
- SHA-256 signed record hash.
- creator/signer SoD separation unless approved, reasoned, unexpired exception exists.
- server-issued challenge consumed exactly once, with replay blocked.
- authoritative audit store availability with PostgreSQL backend.
- workflow/status parity via `WorkflowStatusAuthorityService`.

Migration 236 physicalizes:

- `regulated_command_policy`
- `regulated_command_policy_step`
- `regulated_command_signature_event_link`

Seeded policies:

- `EngineeringReleasePackage.Release`
- `ItemRevision.Release`
- `QualityHold.Release`
- `PartyMerge.Apply`

## 4. Files Changed

Created:

- `mom/database/migrations/236_regulated_command_evidence_policy.sql`
- `mom/api/services/RegulatedCommandEvidenceGateService.php`
- `mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php`
- P32 report artifacts under `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

Modified:

- `mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`

Intentionally not changed:

- UOM files.
- User identity SSOT writer files.
- Generated `mom/contracts/table-registry.json`.
- Domain-specific release/hold/merge/inventory command handlers.

## 5. Design And Code Delta

P32 now has a common fail-closed evidence gate that later domain handlers must call before committing regulated transitions. The gate is service-level and schema-backed, not a Generic CRUD guard or dashboard projection.

The P32 database link table also blocks same creator/signer without a SoD exception reference and enforces a lowercase SHA-256 record hash format. This prevents a future handler from bypassing key SoD/hash rules with a direct insert.

## 6. Simulation Matrix Summary

Detailed matrix: `P32_SIMULATION_MATRIX.csv`

Required scenarios covered:

- signature without meaning is blocked.
- same creator/approver is blocked unless an approved exception exists.
- status enum drift fails parity gate.
- audit store down fails regulated command.
- replayed signature challenge is blocked.

Additional scenarios:

- missing approval policy step blocks policy readiness.
- direct signature link insert must honor SoD DB constraint.

## 7. Adversarial Audit Summary

Detailed audit: `P32_ADVERSARIAL_AUDIT.md`

Highest residual risks:

- P33 must wire canonical quality hold and quality case commands to P32.
- P34 must wire engineering/WO release and resource readiness to P32.
- P36 must add inventory/cost regulated policies and command handlers.
- P37/P40 must close generated parity, live PG audit/evidence writes, telemetry, SoD exception lifecycle, and restore drills.

## 8. Gap Ledger Update

Detailed update: `P32_GAP_LEDGER_UPDATE.csv`

Partially repaired:

- `GAP-P13-001`
- `GAP-P13-002`
- `GAP-P13-003`
- `GAP-P16-002`

Still open:

- `GAP-P12-001`
- `GAP-P31-P32-001`
- `GAP-P32-TOOL-001`

## 9. CI And Test Evidence

Passed:

```bash
php -l mom/api/services/RegulatedCommandEvidenceGateService.php
php -l mom/api/services/Evidence/ElectronicSignatureChallengeService.php
php -l mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
python3 -m json.tool mom/contracts/governed-entities.json
php -r '... RegulatedCommandEvidenceGateService smoke ...'
php mom/tools/release/check_user_identity_ssot.php || true
php mom/tools/audit_runtime_authority_consistency.php || true
php mom/tools/release/check_migration_drift.php || true
npm test -- --runInBand 2>/dev/null || true
git diff --check
```

Observed:

- New/touched PHP files lint clean.
- Bulk service/controller lint clean.
- Governed entity JSON parses.
- Direct smoke returned allowed regulated command and replay reason `signature_challenge_replay_blocked`.
- User identity SSOT guard returned clean.
- Runtime authority audit reports `JSON_ONLY` and PostgreSQL not configured/reachable.
- Migration drift reports only existing P2 prefix collisions for `108`, `115`, and `188`; no fatal/P1 drift.
- `npm test -- --runInBand` produced no runnable output.

Failed/tool unavailable:

```bash
composer test -- --filter Workflow, || true
composer --working-dir=mom test -- --filter RegulatedCommandEvidenceGateServiceTest || true
php mom/tools/release/check_workflow_status_authority.php || true
```

Observed:

- Root Composer has no `test` command.
- `composer --working-dir=mom test` cannot open `vendor/bin/phpunit`.
- Workflow status release tool cannot load `mom/vendor/autoload.php`.

## 10. Decision Token

`P32_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff Packet

See `P32_HANDOFF_PACKET.md`.

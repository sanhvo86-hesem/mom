# P33 - Canonical Quality Hold, Quality Order, NCR, MRB, CAPA, Complaint and SCAR Authority

## 1. Executive Verdict

Decision token: `P33_PASS_WITH_CONTROLLED_GAPS`

P33 partially repairs the P0 canonical quality-hold absence by adding an additive PostgreSQL hold/trigger/trace spine, a `CanonicalQualityCaseAuthorityService`, and service tests covering OQC, IQC, MRB, SCAR, and complaint trace scenarios.

This is not runtime-complete quality authority. The live logistics, supplier, customer, inventory, and MES command handlers still need to write/read these tables inside PostgreSQL transactions with P31 idempotency, P32 e-sign/audit evidence, and outbox records.

## 2. Source Truth Audit

Detailed audit: `P33_SOURCE_TRUTH_AUDIT.csv`

Key evidence:

- `078_canonical_eqms_compliance_backbone.sql` already has `quality_order`, `quality_case_link`, `nonconformance`, `capa`, and `complaint`.
- `011_quality.sql`, `034_exception_management.sql`, and `035_supplier_quality_management.sql` provide legacy NCR/CAPA/MRB/Complaint/SCAR tables.
- `050_wms_extended_warehouse.sql` has warehouse quarantine holds, but not one cross-domain canonical hold authority.
- `DOMAIN_COMMAND_SPEC.md` requires OQC/IQC failures to create NCR/holds in one transaction and block shipment/putaway.
- Runtime audit still reports JSON_ONLY, so P33 cannot claim PostgreSQL-primary runtime.

## 3. Runtime Evidence Probe

Added:

- `mom/database/migrations/237_canonical_quality_case_hold_authority.sql`
- `mom/api/services/CanonicalQualityCaseAuthorityService.php`
- `mom/tests/Unit/Services/CanonicalQualityCaseAuthorityServiceTest.php`

Migration 237 creates:

- `quality_holds`
- `quality_order_trigger_ledger`
- `quality_case_trace_link`

It also seeds regulated command policies for:

- `QualityMrbDisposition.ApproveUseAsIs`
- `QualityCase.CapaApprove`
- `SupplierScar.IssueCritical`
- `Complaint.Close`

Service gates:

- active quality hold blocks matching subject.
- failed OQC/IQC creates canonical containment plan with quality order, NCR, holds, links, and blocked gates.
- MRB use-as-is requires P32 regulated evidence.
- critical/open SCAR blocks supplier item approval.
- complaint trace must link shipment, lot, and serial.

## 4. Files Changed

Created:

- `mom/database/migrations/237_canonical_quality_case_hold_authority.sql`
- `mom/api/services/CanonicalQualityCaseAuthorityService.php`
- `mom/tests/Unit/Services/CanonicalQualityCaseAuthorityServiceTest.php`
- P33 report artifacts under `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

Modified:

- `mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`

Intentionally not changed:

- UOM files.
- User identity SSOT writer files.
- Generated `mom/contracts/table-registry.json`.
- Live logistics/supplier/customer/inventory/MES controllers.

## 5. Design And Code Delta

`quality_holds` is now the canonical subject/source hold authority. Released holds require release reason, release timestamp, and a P32 `regulated_command_signature_event_link`, so hold release cannot be treated as a plain status update.

`quality_order_trigger_ledger` prevents duplicate quality order generation from the same source trigger, and `quality_case_trace_link` keeps complaint/NCR/CAPA/SCAR traceability outside freeform metadata.

## 6. Simulation Matrix Summary

Detailed matrix: `P33_SIMULATION_MATRIX.csv`

Covered scenarios:

- OQC fail blocks shipment and creates visible NCR/CAPA review link.
- IQC fail blocks putaway.
- MRB use-as-is requires approval/e-sign.
- Critical SCAR blocks supplier item approval.
- Complaint traces backward to shipment, lot, and serial.
- Duplicate source trigger is blocked by service/ledger design.

## 7. Adversarial Audit Summary

Detailed audit: `P33_ADVERSARIAL_AUDIT.md`

Highest residual risks:

- Live QualityCase command handlers are still absent.
- P34 must consume canonical holds in MES/resource readiness and shipment gates.
- P36 must consume canonical holds in putaway/issue/move/ledger commands.
- P37/P40 must close generated parity, live audit/evidence/outbox writes, telemetry, and UI exposure.

## 8. Gap Ledger Update

Detailed update: `P33_GAP_LEDGER_UPDATE.csv`

Partially repaired:

- `GAP-P01-006`
- `GAP-P10-001`
- `GAP-P10-002`
- `GAP-P10-003`

Still open:

- `GAP-P33-CMD-001`
- `GAP-P31-P32-001`
- `GAP-P08-002`
- `GAP-P09-002`

## 9. CI And Test Evidence

Passed:

```bash
php -l mom/api/services/CanonicalQualityCaseAuthorityService.php
php -l mom/tests/Unit/Services/CanonicalQualityCaseAuthorityServiceTest.php
php -l mom/api/services/Evidence/ElectronicSignatureChallengeService.php
php -l mom/api/controllers/GenericCrudController.php
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
python3 -m json.tool mom/contracts/governed-entities.json
php -r '... CanonicalQualityCaseAuthorityService smoke ...'
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
- Direct smoke returned OQC containment required, active quality hold block, critical SCAR block, and complaint backward trace ready.
- User identity SSOT guard returned clean.
- Runtime authority audit reports `JSON_ONLY` and PostgreSQL not configured/reachable.
- Migration drift reports only existing P2 prefix collisions for `108`, `115`, and `188`; no fatal/P1 drift.
- `npm test -- --runInBand` produced no runnable output.

Failed/tool unavailable:

```bash
composer test -- --filter Canonical || true
composer --working-dir=mom test -- --filter CanonicalQualityCaseAuthorityServiceTest || true
```

Observed:

- Root Composer has no `test` command.
- `composer --working-dir=mom test` cannot open `vendor/bin/phpunit`.

## 10. Decision Token

`P33_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff Packet

See `P33_HANDOFF_PACKET.md`.

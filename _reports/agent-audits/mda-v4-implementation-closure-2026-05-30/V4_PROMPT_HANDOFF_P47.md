# V4 Prompt Handoff - P47

Prompt: P47 - Runtime Requirement Resolver and Fail-Closed Gate Context Builder
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Date: 2026-05-31
Decision token: P47_PASS_WITH_CONTROLLED_GAPS

## Source Truth Audit

- Worktree is isolated at `/private/tmp/mom-mda-v4-recovery`.
- HEAD before P47 commit was `413a4e9c2c60bf9c4cd7ad9e8677f1e02daaaadc`.
- P47 prompt and V4 universal guard were read from the V4 pack.
- Known live StartJob paths found: mobile start task and dispatch report production.
- UOM work remains external/parallel; P47 only connects to `MdaUomAuthorityBridge`.

## Runtime Evidence Probe

| Probe | Result |
|---|---|
| PHP lint touched files | PASS |
| Resolver missing evidence | PASS: block `missing_required_evidence` |
| Resolver provided evidence | PASS: allowed with 64-char hash |
| UOM authority failure | PASS: block `uom_authority_resolution_failed` |
| Mobile start mutation | PASS: blocked task stays `pending` |
| Dispatch/shopfloor mutation | PASS: blocked before log mutation |
| Caller `require_qualification=false` | PASS: ignored/unset |
| PHPUnit/PHPStan | BLOCKED: missing vendor executables |

## Design / Implementation Delta

P47 adds `RuntimeRequirementResolverService`, `GateContextBuilder`, `RuntimeRequirementGateException`, and migration `265_runtime_requirement_resolver.sql`. The resolver is fail-closed by default and rejects caller `require_*` truth. The gate is wired into mobile and dispatch StartJob paths before mutation.

## Files Edited

- `.ai/*` regenerated index files
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_REQUIREMENT_RESOLVER_CLOSURE_REPORT.md`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PROMPT_HANDOFF_P47.md`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_P47_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_REQUIREMENT_RESOLVER_PROOF_PACK.json`
- `mom/api/controllers/DispatchController.php`
- `mom/api/controllers/MobileController.php`
- `mom/api/controllers/TrustedReleaseRecordController.php`
- `mom/api/services/GateContextBuilder.php`
- `mom/api/services/MobileWorkQueueService.php`
- `mom/api/services/RuntimeRequirementGateException.php`
- `mom/api/services/RuntimeRequirementResolverService.php`
- `mom/api/services/ShopfloorExecutionService.php`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/database/migrations/265_runtime_requirement_resolver.sql`
- `mom/tests/Unit/Database/RuntimeRequirementResolverMigrationTest.php`
- `mom/tests/Unit/Services/RuntimeRequirementResolverServiceTest.php`
- `mom/tests/Unit/Services/TrustedReleaseRecordServiceTest.php`

## Files Forbidden / High-Risk

- Do not edit `mom/api/services/Uom/*` in this MDA branch.
- Do not use caller-provided `require_*` flags in P48/P49.
- Do not claim production readiness without command gateway, PostgreSQL transaction, audit/evidence/outbox, scenario runner, restore drill, and browser/operator smoke evidence.

## Gap Ledger

See `V4_P47_GAP_LEDGER_UPDATE.csv`.

## Next Prompt Constraint

P48 must physicalize Engineering Release Package command handling and must use P47 resolver snapshots for released engineering evidence. It must not reintroduce frontend/caller `require_*` authority, and it must not fork UOM logic.

P47_PASS_WITH_CONTROLLED_GAPS

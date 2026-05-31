# V4 Prompt Handoff - P46

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Date: 2026-05-30
Decision token: P46_BLOCKED_RUNTIME_AUTHORITY_RISK

## Source Truth Audit

- UOM engine and evidence services exist on current branch.
- `MdaUomAuthorityBridge` now connects MDA command-side normalization to existing UOM services without touching `mom/api/services/Uom/*`.
- Active UOM branches modify the same authority surface required for safe P46 repair.
- Required domain command paths are bridge-ready, but not proven to call the bridge before quantity mutation.
- Main alias resolver quarantines unknown aliases but not every ambiguous active alias candidate set.
- Rule lifecycle semantics are inconsistent across resolver, workflow, scanner, and health check.

## Runtime Evidence Probe

| Probe | Result |
|---|---|
| BCMath available | PASS |
| PHP lint UOM services | PASS |
| MEASVAL hash probe | PASS |
| Affine temperature probe | PASS |
| `MdaUomAuthorityBridge` lint | PASS |
| Bridge receive probe | PASS: `10 BOX -> 500 PCS` via existing UOM services |
| UOM PHPUnit suite | BLOCKED: missing `vendor/bin/phpunit` |
| Command-stack UOM authority | BRIDGE_READY_NOT_WIRED |
| Alias ambiguity quarantine | FAIL |

## Design / Implementation Delta

Code change applied outside UOM internals: `MdaUomAuthorityBridge` calls existing UOM services and provides a fail-closed seam for live command handlers. It avoids overwriting active UOM sessions and avoids introducing a second authority.

## Files To Edit / Files Forbidden

Edited:

- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/UOM_AUTHORITY_CLOSURE_REPORT.md`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/UOM_COMMAND_AND_POLICY_MATRIX.csv`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/UOM_CONVERSION_TEST_SUITE_REPORT.md`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/UOM_RUNTIME_PROOF_PACK.json`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_P46_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/V4_PROMPT_HANDOFF_P46.md`
- `mom/api/services/MdaUomAuthorityBridge.php`
- `mom/tests/Unit/Services/MdaUomAuthorityBridgeTest.php`

Forbidden/high-risk in this branch until UOM branch integration:

- `mom/api/services/Uom/*`
- `mom/api/controllers/UomController.php`
- `mom/api/openapi.yaml`
- `mom/database/migrations/257_uom_v5_manifest_human_approval_lock.sql`
- `mom/database/migrations/258_uom_v5_alias_quarantine_contract.sql`
- `mom/database/migrations/259_uom_v5_quantity_kind_compatibility.sql`
- `mom/database/migrations/260_uom_v5_contextual_conversion_contract.sql`
- `mom/tests/Unit/Uom/*`

## Operational Simulation Matrix

| Scenario | Status |
|---|---|
| V4-SIM-046-001 receipt BOX to PCS | BRIDGE PASS, live handler not wired |
| V4-SIM-046-002 ambiguous alias | BLOCKED |
| V4-SIM-046-003 Celsius/Fahrenheit | PASS engine probe only |
| V4-SIM-046-004 length as mass | PASS design only |
| V4-SIM-046-005 micron vs mm inspection | PARTIAL |
| V4-SIM-046-006 cost rollup | BLOCKED |
| V4-SIM-046-007 deprecated rule | BLOCKED |
| V4-SIM-046-008 missing item policy | BLOCKED |

## Multi-Role Adversarial Audit

- Quality: spec controllers can still store free-text units.
- MES: shopfloor logs can still fall back to `EA` or target UOM.
- Inventory: governed command names exist as intended commands in guard registry, and bridge mapping exists, but live handlers are not wired.
- Finance: cost rollup UOM authority not found.
- SRE: UOM cache invalidation and telemetry are not runtime closure proof.
- Release: touching UOM files now risks overwriting active UOM branch work.

## Gap Ledger Update

See `V4_P46_GAP_LEDGER_UPDATE.csv`.

## Next Prompt Constraint

P47 must treat UOM as connected but not fully closed. Requirement resolution must not trust caller-provided `uom`, `unit_of_measure`, quantity kind, conversion rule, or `require_*` flags. It must resolve via `MdaUomAuthorityBridge` into authoritative UOM PostgreSQL policy, or fail closed.

P46_BLOCKED_RUNTIME_AUTHORITY_RISK

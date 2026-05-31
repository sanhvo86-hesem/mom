# V4 Tooling and Gage Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Prompt: P55 - Tooling, Dao Cu, Fixture, Gage, Preset, OOT, and Breakage Runtime Closure
Posture: pre-production runtime-readiness evidence; not production-ready

## 1. Executive Decision

P55 closes the live command-stack gap for tooling and gage runtime authority on the implemented MES/eQMS paths. `StartJobCommand`, `LoadToolCommand`, `RecordInspectionResultCommand`, `CompleteOperationCommand`, `ReportToolBreakageCommand`, and `GageOOTInvestigationCommand` now go through PostgreSQL-backed tooling/gage state checks or event writers instead of caller-provided readiness.

## 2. Source Truth Audit

- Existing MES runtime handler already owned `StartJobCommand`, `LoadToolCommand`, `RecordInspectionResultCommand`, and `CompleteOperationCommand`.
- Existing P53 quality hold chain is the canonical hold/NCR authority and is reused by P55 instead of introducing a second hold system.
- Existing P54 inventory/ledger path remains untouched; P55 does not write balance projections.
- `mes_tool_life_events` existed as the MES event sink, but tool runtime state, breakage containment, and gage OOT investigation were not live command authorities before P55.
- The actual V4 prompt file for P55 is tooling/gage closure, so this work follows the pack file rather than the earlier pasted table summary.

## 3. Runtime Evidence Probe

Manual probe:

```json
{
  "tool_life_block": {
    "problem": "tooling_runtime_blocked",
    "mes_job_writes": 0,
    "readiness_evidence_writes": 1
  },
  "gage_block": {
    "problem": "gage_runtime_blocked",
    "uom_writes": 0,
    "quality_result_writes": 0,
    "readiness_evidence_writes": 1
  },
  "breakage": {
    "hold_writes": 4,
    "hold_subject_refs": ["LOT-31-50", "WO-1"],
    "ncr_writes": 1,
    "containment_writes": 2,
    "life_events": 1
  },
  "oot": {
    "investigation_writes": 1,
    "hold_writes": 6,
    "hold_subject_refs": ["LOT-1", "SN-1", "SHIP-1", "WO-1"],
    "ncr_writes": 1,
    "trace_links": 1
  }
}
```

## 4. Blocker / Gap Map

Closed:

- Tool life stop threshold is enforced before StartJob writes MES execution rows.
- Tool preset, assembly/component status, tool calibration, machine family, and item compatibility are checked by `ToolingCommandHandler`.
- Gage calibration/MSA/OOT gate is enforced before UOM normalization or quality result write.
- Tool breakage creates breakage event, life event, canonical hold, NCR, and containment rows.
- Gage OOT investigation traces impacted inspection results to lots, serials, shipments, and work orders.

Controlled:

- Real DB migration execution and browser/operator smoke remain deployment tasks.
- Tool life decrement uses completion quantity as count-based life consumption; time/cycle/material-specific life models remain future policy resolvers.
- Full PHPUnit/PHPStan validation remains blocked by missing local vendor binaries.

## 5. Design Delta

- Added `ToolingCommandHandler` as the runtime authority for tool/gage gates and breakage/OOT command handlers.
- Added migration 272 for `tooling_runtime_state`, `gage_runtime_state`, `tooling_breakage_event`, `tooling_breakage_containment`, and `gage_oot_investigation_runtime`.
- Routed P55 commands through `DomainCommandGateway`.
- Wired MES runtime paths to tooling/gage checks before mutation.
- Reused `QualityHoldService` for canonical holds and NCRs; no separate tooling hold authority was introduced.

## 6. Implementation Plan

Implemented in one logical unit after P54. The next prompt must expose these runtime commands through OpenAPI/Problem Details/contract tests without bypassing `DomainCommandGateway`.

## 7. Files To Edit

- `mom/database/migrations/272_tooling_gage_runtime_authority.sql`
- `mom/api/services/DomainCommand/ToolingCommandHandler.php`
- `mom/api/services/DomainCommand/MesRuntimeCommandHandler.php`
- `mom/api/services/DomainCommand/DomainCommandGateway.php`
- `mom/api/services/DomainCommand/CommandRegistry.php`
- `mom/api/services/DomainCommand/RegulatedActionPolicy.php`
- `mom/tests/Unit/Services/DomainCommandToolingCommandHandlerTest.php`

## 8. Files Forbidden Or High-risk

- Parallel UOM branch implementation files beyond already committed direct command integration.
- Inventory balance projection tables from P54.
- Legacy JSON tooling/gage records as mutation authority.
- Any route that writes tool/gage status outside domain commands.

## 9. Code / Schema / Contract Changes

- `tooling_runtime_state` is the PostgreSQL source for tool status, assembly status, preset approval, calibration status, life count, stop limit, and compatibility.
- `gage_runtime_state` is the PostgreSQL source for gage status, calibration status, MSA status, and open OOT reference.
- `ReportToolBreakageCommand` and `GageOOTInvestigationCommand` are registered, regulated, routed, audited, and outboxed.
- MES command handler calls P55 gates before MES execution, UOM, or quality result writes.
- Containment hold creation now passes resolved subject lists into `QualityHoldService` so affected lots/serials/WIP/shipments are held, not inferred from caller noise.

## 10. Test Plan

- Lint all changed PHP.
- Run `/private/tmp/tooling_probe.php`.
- Validate proof pack JSON.
- Run `git diff --check`.
- Run composer test/analyse/check; record vendor blocker if still missing.

## 11. Operational Simulation Matrix

| scenario_id | command/action | expected_gate | data_written | expected_result |
|---|---|---|---|---|
| V4-SIM-055-001 | tool at stop threshold starts job | ToolingCommandHandler life gate | readiness evidence + audit only | blocked `tooling_runtime_blocked` |
| V4-SIM-055-002 | preset pending loads tool | ToolingCommandHandler preset gate | readiness evidence + audit only | blocked before tool load event |
| V4-SIM-055-003 | assembly component obsolete loads tool | ToolingCommandHandler assembly/component gate | readiness evidence + audit only | blocked before MES mutation |
| V4-SIM-055-004 | expired gage records inspection | ToolingCommandHandler gage gate | readiness evidence + audit only | blocked before UOM/result write |
| V4-SIM-055-005 | breakage at piece 50, last good 30 | ReportToolBreakageCommand | breakage event, life event, hold, NCR, containment | suspect window 31-50 held |
| V4-SIM-055-006 | gage OOT after shipped lot | GageOOTInvestigationCommand | OOT investigation, hold, NCR, trace links | impacted lot/serial/shipment held |
| V4-SIM-055-007 | complete operation with tool | CompleteOperationCommand | tool life usage event + runtime state update | life count increments by completed quantity |
| V4-SIM-055-008 | wrong machine family starts job | ToolingCommandHandler compatibility gate | readiness evidence + audit only | blocked `tool_machine_family_mismatch` |

## 12. Multi-role Adversarial Audit

- Manufacturing lead: PASS because StartJob/LoadTool block on runtime tool state before MES writes.
- Quality lead: PASS because gage OOT and breakage use canonical quality hold/NCR chain.
- Tool crib lead: PASS for preset, life, calibration, assembly/component gates; controlled gap for complex life policy formulas.
- UOM lead: PASS because inspection gage block occurs before UOM write and no UOM bridge was introduced.
- Traceability lead: PASS because OOT impact links inspection results and hold subjects include lot/serial/shipment.
- SRE lead: PARTIAL until migration is exercised on VPS and telemetry dashboards are wired in P57/P59.

## 13. Rollback / Restore / Recovery Plan

- Roll back code by reverting this commit on the isolated branch.
- Migration rollback requires preserving exported breakage/OOT evidence before dropping P55 runtime tables.
- If a false positive blocks production, release the quality hold through `ReleaseQualityHoldCommand`; do not update hold tables directly.
- Rebuild tool/gage state from authoritative calibration, preset, tool crib, and MES life events before re-enabling command gates after restore.

## 14. Telemetry / Control Tower Evidence

- Tool/gage block decisions write `resource_readiness_evidence_state` with operator-facing messages.
- Tooling/gage audit uses aggregate type `tooling_gage_runtime`.
- Outbox events use schema `tooling_gage_runtime.v1`.
- Breakage and OOT flows create auditable domain rows that P57 control tower can count by gate, tool, gage, work order, lot, and shipment.

## 15. Generated Artifacts

- `V4_TOOLING_GAGE_CLOSURE_REPORT.md`
- `V4_TOOLING_GAGE_PROOF_PACK.json`
- `V4_P55_GAP_LEDGER_UPDATE.csv`
- `V4_PROMPT_HANDOFF_P55.md`

## 16. Gap Ledger Update

See `V4_P55_GAP_LEDGER_UPDATE.csv`.

## 17. Decision Token

P55_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P56

## 18. Handoff Packet For Next Prompt

P56 must expose `ReportToolBreakageCommand`, `GageOOTInvestigationCommand`, and affected MES command errors through OpenAPI 3.1 and RFC 9457 Problem Details, preserving the gateway-only mutation path.

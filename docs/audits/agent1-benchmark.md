# Agent 1 - Global Benchmark And Standards Refresh

Branch audited: `codex/worldclass-closure-20260415-0913`

## 2026-04-15 05:50 Current-Pass Addendum

- Official benchmark refresh reconfirmed the target pattern: governed MES execution, integrated quality, explicit ISA-95 boundaries, contextualized digital-thread data, OT/IT least privilege, and advisory-only AI.
- Confirmed P1 staged authority remains: CNC program/setup-sheet state and canonical manufacturing-event fallback still have JSON compatibility authority or fallback probes. Safe remediation this pass tightened bridge behavior and docs; DB-primary cutover remains a documented blocker.
- Confirmed P2 mobile queue/read-model risk from the MES workstream: derived indexes must be treated as cache only. Remediation in this pass makes missing index buckets rebuild from source.
- Refuted direct machine-control drift: MTConnect/OPC UA remain contextualization/readiness surfaces and no execution command path was introduced.

## 2026-04-15 Current-Pass Addendum

- Confirmed P1 staged authority remains the dominant benchmark gap: dispatch/order/CNC execution still uses JSON compatibility truth with DB bridges.
- Confirmed H15/H16 were absent from older scorecards; this pass adds explicit duplicate/storage drift and regression-test-gap dispositions.
- Safe fixes applied now: dispatch redispatch blocking, orphan hold rejection, SO date validation, shared NLQ rate ledger, and manufacturing-event fallback append scanning.
- Deferred with evidence: DB-primary execution/CNC/EQMS authority needs reconciliation and compatibility testing before cutover.

## 2026-04-14 Current-Pass Addendum

- Refreshed official benchmark deltas: SAP DM emphasizes skills/resource execution, Siemens X Quality emphasizes inspection/deviation/SPC, DELMIA Apriso emphasizes guided quality/CAPA/containment, AVEVA emphasizes contextualized genealogy/traceability, Tulip emphasizes composable validated execution apps, Google MDE treats MES as source/sink, Microsoft Factory Operations Agent is now reference-only because preview retirement is documented by Microsoft, and ISA/MTConnect/OPC UA/NIST/62443 remain boundary/security standards rather than execution authority.
- Confirmed P1 AI/source-boundary defect: JSON advisory fallback could leak blank-plant rows and conversation files could be read by unsafe IDs. Remediation filters fallback prediction rows and owner-scopes conversation JSON fallback reads.
- Confirmed P1 staged authority: dispatch/mobile/CNC execution still has JSON compatibility authority with DB bridge mirrors; this remains documented as a migration bridge, not the target state.
- Confirmed P1 CNC/setup-sheet drift: setup sheets previously lacked explicit release status. Remediation in this pass makes newly created setup sheets `draft` and treats missing status as not released for strict dispatch reference enforcement.
- Confirmed P1 EQMS closure gap: canonical evidence finalization needed a role gate. Remediation in this pass requires controlled evidence finalization roles before CSRF-protected finalization.
- Confirmed P2 AI/security gap: legacy AI read surfaces were not consistently AI-role scoped. Remediation in this pass adds AI read gates to prediction, SPC anomaly, tool-wear, and legacy dashboard reads.
- Confirmed P2 AI scheduling boundary gap: AI-named schedule apply and PM routes could be interpreted as execution writes. Remediation makes them advisory review/proposal responses with no schedule or maintenance mutation.
- Confirmed P2 scheduling consistency gap: DB-backed slot writes lacked the JSON fallback overlap guard. Remediation applies machine/date/time overlap checks to both storage modes.

## Findings

- P1: CNC program/setup-sheet authority remains staged and file-backed while DB schema exists. This is the main digital-thread gap against SAP, Siemens, Dassault, NIST, MTConnect, and OPC UA patterns.
- P1: Execution truth still uses JSON compatibility authority plus DB bridges. This is acceptable as a documented migration bridge, not as the target state.
- P2: MTConnect/OPC UA readiness preserves machine IDs and contextual fields, but raw telemetry/event authority remains staged.
- P2: EQMS remains first-piece oriented; NCR/CAPA/SPC closed-loop quality remains staged.
- P3: Benchmark provenance was stale and was refreshed in required docs.

## Disposition

Safe fixes applied here: provenance refresh, scoped AI read surfaces, current scorecard updates, and explicit residual blockers. DB-primary CNC/execution cutovers are deferred pending reconciliation.

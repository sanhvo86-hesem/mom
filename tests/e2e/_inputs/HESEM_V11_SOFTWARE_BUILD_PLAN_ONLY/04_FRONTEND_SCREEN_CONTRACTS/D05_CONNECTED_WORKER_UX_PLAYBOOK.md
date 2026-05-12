# D05 — Connected Worker, Mobile, Kiosk, Scan-First UX Playbook

## Prompt posture

This package is planning-only. It defines connected-worker/mobile/kiosk UX contracts for HESEM but does not create UI code, HTML/CSS/JS, schemas, controllers, SQL, OpenAPI YAML/JSON, or test code.

Repo state not checked by user instruction.
I cannot verify the current repo state from connector in this turn.

## Source baseline used

- P0/V10 root baseline: 145 roots and 14 domains.
- D01 route grammar: SH/DL/ML/WS/AR/AC/dashboard/inbox/admin with workspace as projection and AR as authority.
- D03 AR shell contracts: authoritative record shell tabs/panels/action/evidence/audit/signature regions.
- D04 workspace projection contracts: no hidden authority, board/filter/sort/readiness only, AR reanchor for commands.
- Gap-decision protocol: self-decide planning ambiguity, but do not invent implementation evidence or claim current repo state.
- External connected-worker pattern extraction: Tulip-style point-of-work data capture, device integration, traceability, work-order/material/equipment status, and qualification-gated work instructions; Poka-style learning/skills, daily management/forms/issues, communication, analytics/AI and enterprise governance.

## D05 design decision

D05 creates **surface profiles**, not new hidden authority routes:

```text
mobile / tablet / handheld / kiosk / scan-first surface = execution-facing projection + guided controlled action shell
canonical authority = /ops/records/{resource_family}/{record_id}?tab=...
workspace authority = projection only
command/evidence/signature authority = AR + workflow guard + API command + IAM/SoD + evidence/audit/signature contract
```

A connected-worker surface may show a button such as `complete step`, `record result`, `issue material`, `close MWO`, `sign training`, or `raise NC`, but the action is enabled only when all gates below exist:

1. canonical AR exists and route resolves to a root/resource family;
2. workflow state and transition guard are known;
3. command API contract is approved by C-stream;
4. evidence/audit/signature policy is declared;
5. IAM, SoD, training/qualification, equipment/tool/gage calibration and lot disposition checks pass;
6. device/session is trusted and current;
7. offline/stale state is not active;
8. problem-details and telemetry correlation are available;
9. idempotency and rollback/void reason are defined for the command class.

Until those gates exist, the connected-worker surface is **scan-first, instruction-first, evidence-intent-only, AR-reanchor-only**.

## Surface profile taxonomy

| Surface profile | Main persona | Primary purpose | Authority stance |
|---|---|---|---|
| `operator-handheld` | operator | badge/station/WO/operation/lot/serial scan, instruction execution, exception intent | projection + guided AR action only |
| `line-kiosk` | operator, line lead | station readiness, shift handoff, dispatch view, Andon and downtime triage | no command without AR/workflow guard |
| `inspection-tablet` | inspector | IQC/in-process/final inspection, defect capture, SPC/OOC response | evidence draft + AR attachment only |
| `maintenance-tablet` | maintenance tech | asset/MWO/LOTO/procedure/checklist execution | no LOTO/safety mutation offline |
| `material-handheld-scanner` | material handler | pick, putaway, issue/return, quarantine, receipt, shipment verification | scan chain only until inventory command contract exists |
| `calibration-bench-tablet` | calibration tech | gage/device calibration, MSA, Gage R&R | no result authority if calibration/qualification invalid |
| `training-kiosk-or-tablet` | trainer/trainee | job-task training, qualification, supervised signoff | no qualification grant outside AR/signature policy |
| `traceability-audit-tablet` | auditor | walkdown, audit trail, evidence chain, genealogy/release review | read/review/observation intent only |
| `supervisor-tablet` | supervisor | exception triage, OEE, CAPA/MRB/release readiness | review/reanchor; no silent approval |

## Scan-first task flow grammar

```text
1. Identify actor: scan badge/session/device/station.
2. Identify work context: scan WO/JO/operation/lot/serial/equipment/tool/gage/location/document/task.
3. Resolve canonical record: map scan to root/resource family, canonical target and AR route.
4. Load instruction: current effective instruction/procedure/spec/checklist and controlled document revision.
5. Preflight permission: IAM + role + SoD + training/qualification + equipment/tool/gage calibration + lot disposition + workflow state.
6. Show readiness: allowed action, blocked reason, required evidence, stale/offline/problem state.
7. Capture evidence intent: scan chain, measurement, photo, note, checklist, machine/edge signal, training observation.
8. Re-anchor: open AR tab or guided controlled AR action surface.
9. Execute only if gates pass: workflow guard + API command + evidence/audit/signature + idempotency.
10. Record telemetry: scan, instruction load, evidence intent, disabled action, AR reanchor, problem and offline state.
```

## Domain coverage

- Analytics & AI: 8 P0/V10 roots
- Commercial & Customer: 9 P0/V10 roots
- Core Platform: 17 P0/V10 roots
- Finance: 7 P0/V10 roots
- Integration: 7 P0/V10 roots
- Inventory & Logistics: 8 P0/V10 roots
- Maintenance & EHS: 11 P0/V10 roots
- Planning & Production: 7 P0/V10 roots
- Procurement & Supplier Quality: 13 P0/V10 roots
- Product / Engineering: 8 P0/V10 roots
- Quality Improvement (eQMS): 21 P0/V10 roots
- Shopfloor / MES Execution: 13 P0/V10 roots
- Traceability & Serialization: 8 P0/V10 roots
- Workforce & Training: 8 P0/V10 roots

## Persona/root catalog coverage

- auditor: 32 root-catalog rows plus persona-flow rows
- inspector: 34 root-catalog rows plus persona-flow rows
- maintenance tech: 11 root-catalog rows plus persona-flow rows
- material handler: 8 root-catalog rows plus persona-flow rows
- operator: 28 root-catalog rows plus persona-flow rows
- supervisor: 24 root-catalog rows plus persona-flow rows
- trainer/trainee: 8 root-catalog rows plus persona-flow rows

## Non-negotiable stop rules

- STOP if a mobile/kiosk/workspace surface changes workflow state without canonical AR, workflow guard and command API.
- STOP if offline mode queues WIP/inventory/equipment/EHS/evidence/e-sign/config/IAM mutation for blind replay.
- STOP if scan result alone creates authority, approval, release, disposition, label/serial creation, or financial posting.
- STOP if qualification, training, equipment status, gage calibration, lot disposition or controlled document revision is stale/missing for an execution-impacting action.
- STOP if evidence can be overwritten, attached without audit, or signed without signature meaning.
- STOP if AI ranks/recommends and the UI treats that recommendation as an executable regulated decision.
- STOP if alias/duplicate route owns command/evidence/audit/signature instead of canonical AR.

## Files in this package

- `D05_CONNECTED_WORKER_UX_PLAYBOOK.md`
- `D05_PERSONA_FLOW_MATRIX.csv`
- `D05_SCAN_FIRST_TASK_FLOW_CATALOG.csv`
- `D05_INSTRUCTION_AND_EVIDENCE_CAPTURE_MODEL.md`
- `D05_OFFLINE_MOBILE_KIOSK_STATE_MATRIX.csv`
- `D05_DEVICE_PERIPHERAL_PERMISSION_MATRIX.csv`
- `D05_API_WORKFLOW_EVIDENCE_REQUESTS.csv`
- `D05_KIOSK_STATION_MODE_POLICY.md`
- `D05_SELF_AUDIT.md`
- `D05_PACKAGE_MANIFEST.json`

## Critical gaps carried to D06/Merge

1. B-stream workflow transition/guard outputs are not available in this turn; D05 therefore records required requests and keeps action execution disabled/planned.
2. C-stream API/offline/OT/evidence contracts are not available; D05 defines API/event families but does not freeze endpoint path/version/idempotency.
3. Repo implementation state was not checked by user instruction; no current implementation claim is made.
4. Exact validation/legal interpretation is not claimed; regulated panels are planning requirements only.
5. Mobile device hardening, MDM, certificate, peripheral trust and site network policy need security/OT owners in Merge.


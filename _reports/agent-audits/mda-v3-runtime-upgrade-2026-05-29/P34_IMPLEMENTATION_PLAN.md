# P34 Implementation Plan

## Scope Selected

P34 ran in hybrid implementation mode. The safe vertical slice is:

- Add `resource_readiness_snapshot` as the immutable command-time decision target.
- Add `mes_runtime_event_spine` as the append-only MES runtime event target for readiness/start/material/tool/program/inspection/containment.
- Add `ResourceReadinessService` as a side-effect-free gate that command handlers can call before WO release/start, material issue, NC program verification, and IPQC containment.
- Add unit tests for the five mandatory P34 simulations.
- Add Generic CRUD hard-stop entries for the new tables and existing execution event tables.
- Update governed registry and runtime proof matrix.

## Files To Edit

- `mom/database/migrations/238_resource_readiness_mes_event_spine.sql`
- `mom/api/services/ResourceReadinessService.php`
- `mom/tests/Unit/Services/ResourceReadinessServiceTest.php`
- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Files Forbidden

- No UOM implementation files beyond previous P25 artifacts.
- No original checkout files under `/Users/a10/Documents/mom`.
- No generated table-registry rewrite in P34; that is a larger generator-owned operation.
- No live order controller mutation rewrite in P34, because P31 command handler coverage remains incomplete.

## Runtime Delta

`ResourceReadinessService` checks:

- Operator qualification expiry or inactive/revoked status.
- Machine PM overdue, inactive/down status, and calibration expiry.
- Material lot active quality hold using `CanonicalQualityCaseAuthorityService`.
- Tool/gage status, life exhaustion, calibration expiry, and MSA failure when evidence is supplied.
- Released/controller NC checksum mismatch.
- IPQC fail containment using P33 quality case planning and a `quality.containment_required` runtime event.

## Remaining Integration Work

- Wire `ReleaseWorkOrder`, `StartJob`, `IssueMaterial`, `LoadTool`, `VerifyNcProgram`, `RecordIpqcResult`, and `CompleteOperation` command handlers to persist P34 snapshot/event rows in one PostgreSQL transaction with P31 audit/outbox and P32 evidence where required.
- Connect live equipment, calibration, tooling, and operator qualification repositories instead of caller-supplied evidence arrays.
- Project P34 events into `mes_operational_event_ledger` or replace this slice with a single canonical append path if the team chooses that architecture in P37/P38.

## Decision

Proceed to P35 after commit because P34 closes the design-only readiness service gap at service/schema/test level. Runtime authority remains controlled-gap because live domain command handlers and PostgreSQL writes are not wired.

# P33 Multi-role Adversarial Audit

## Manufacturing operations lead

- Finding: P33 creates hold authority but WO release/start does not yet call it.
- Severity: P1.
- Runtime risk: A held lot/serial/work order could still progress through MES until P34 wiring.
- Required repair: P34 must call `CanonicalQualityCaseAuthorityService::evaluateHoldGate()` before release/start/complete.
- Acceptance evidence: WO release/start tests fail on active quality hold.

## Master data architect

- Finding: `quality_holds`, trigger ledger, and trace links are additive and aligned with existing `quality_order`, but generated registries remain stale.
- Severity: P1.
- Runtime risk: registry/OpenAPI/UI can miss new canonical quality tables.
- Required repair: P37/P40 generated registry and OpenAPI parity.
- Acceptance evidence: generated table registry includes P33 tables and no Generic CRUD mutation path is reopened.

## Quality/eQMS lead

- Finding: P33 closes the canonical hold absence pattern at schema/service/test level, but live quality command handlers are still not implemented.
- Severity: P0 residual.
- Runtime risk: legacy JSON OQC/IQC/NCR/CAPA/SCAR paths remain authoritative in runtime until command cutover.
- Required repair: P37 or domain prompt must wire RecordOqcResult, RecordIqcResult, CreateNcrFromQualityFailure, ReleaseQualityHold, ApproveMrbDisposition, Complaint.Close, and SupplierScar commands.
- Acceptance evidence: commands write PG quality rows, audit/evidence, outbox, and signature links in one transaction.

## MES/shopfloor lead

- Finding: Tool breakage, calibration OOT, and CTQ/gage MSA containment are only represented as future gate inputs.
- Severity: P1.
- Runtime risk: suspect output can escape if P34/P35 do not spawn holds from events.
- Required repair: P34/P35 must create canonical holds from tooling/calibration/measurement failures.
- Acceptance evidence: OOT and tool breakage tests create holds and block issue/ship/start.

## Inventory/finance controller

- Finding: IQC fail now blocks putaway at service-gate level, but inventory ledger/cost posting is not yet wired.
- Severity: P1.
- Runtime risk: stock/cost balances may move despite a canonical hold if P36 handlers ignore the gate.
- Required repair: P36 must call hold gate before putaway, issue, move, split, merge, and COPQ posting.
- Acceptance evidence: ledger command tests reject active hold and preserve balances/idempotency.

## Security/SoD reviewer

- Finding: MRB use-as-is requires P32 evidence gate result, but this P33 service does not create/consume signatures itself.
- Severity: P1.
- Runtime risk: a handler could pass a forged positive evidence result unless it is loaded from P32 policy/signature link.
- Required repair: live handler must call `RegulatedCommandEvidenceGateService` and persist `regulated_command_signature_event_link`.
- Acceptance evidence: use-as-is command fails without signature event/challenge/audit link.

## SRE/cutover reviewer

- Finding: Runtime audit still reports JSON_ONLY and database not reachable.
- Severity: P1.
- Runtime risk: no PostgreSQL-primary quality authority claim can be defended.
- Required repair: P37 cutover, reconciliation, restore drill, and live monitoring.
- Acceptance evidence: POSTGRES_PRIMARY drill with zero drift for quality holds/cases and tested rollback.

## Frontend/operator UX reviewer

- Finding: Reason codes exist, but disabled action panels and case trace UI are not updated.
- Severity: P2.
- Runtime risk: users may not understand why shipment/putaway/approval is blocked.
- Required repair: P39/P40 map P33 reason codes to record-shell evidence panels.
- Acceptance evidence: Chrome smoke shows active hold, NCR/CAPA link, SCAR block, and complaint trace.

## External auditor/red-team reviewer

- Finding: P33 improves auditability but does not validate the full quality system.
- Severity: P1.
- Runtime risk: claiming compliance would overstate evidence.
- Required repair: keep language to runtime proof/pre-production readiness; build validation evidence after live command integration.
- Acceptance evidence: signed records, linked traces, audit hash chain, and scenario runner evidence are exportable.

## Repair pass

Repairs applied before final token:

- Added DB-level unique active hold constraint per subject/source.
- Added released-hold checks requiring release reason, released timestamp, and P32 signature link.
- Added trigger ledger uniqueness for quality-order generation.
- Added trace-link table so complaint/SCAR/NCR/CAPA links are not freeform metadata.
- Added tests for all five P33 required simulations.

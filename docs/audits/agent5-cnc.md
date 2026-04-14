# Agent 5 - CNC / Digital Thread / Traceability / Connectivity

Branch audited: `codex/worldclass-reaudit-20260414-145442`

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 setup-sheet release defect: missing setup-sheet status was treated as released. Remediation sets new setup sheets to `draft` and makes missing setup status fail strict dispatch enforcement.
- Confirmed P1 MTConnect parser defect: XML parsing used entity expansion. Remediation rejects `DOCTYPE`/`ENTITY` payloads and removes `LIBXML_NOENT`.
- Deferred: DB-primary CNC program/setup authority and automatic genealogy edge emission remain blocked by reconciliation and trace-policy design.

## Findings

- P1: CNC program/setup-sheet release authority is still JSON-backed in `CncProgramController`.
- P2: OPC UA readiness is metadata/schema-level; active polling remains MTConnect-only.
- Refuted: genealogy ontology drift is no longer blocking. Runtime node types and migration 121 are aligned.

## Disposition

Fixed now: genealogy DB constraints are aligned with runtime ontology and tests assert the migration coverage. Deferred: DB-backed CNC program/setup repository and OPC UA runtime adapter.

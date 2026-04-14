# Agent 5 - CNC / Digital Thread / Traceability / Connectivity

Date: 2026-04-15

Scope: item revision, routing operation, setup sheets, CNC program/version, inspection plan, machine/equipment/work-center context, genealogy/traceability, MTConnect/OPC UA readiness, migrations, controllers, services, and docs.

## Findings

| hypothesis | result | severity | evidence | disposition |
|---|---|---:|---|---|
| H1 CNC/setup authority file-backed | Confirmed | P1 | `CncProgramController` still reads/writes `programs.json`, `versions.json`, `setup-sheets.json`. | DB-backed repository/bridge remains staged. |
| H2 setup release unsafe | Refuted | P2 | New setup sheets default to `draft`; strict dispatch does not treat missing setup status as released. | No change. |
| H3 program/version context drift | Refuted | P2 | Program/version/setup records carry plant/site/work-center/operation/revision/inspection context. | No change. |
| H4 weak FK authority | Partially confirmed | P2 | Execution contracts carry references but DB FK enforcement is not complete. | Blocked by DB-primary cutover. |
| H5 machine/work-center context | Refuted | P2 | Execution, CNC, and event-ledger context all preserve machine/equipment/work-center fields. | No change. |
| H6 inspection-plan gating detached | Partially confirmed | P2 | First-piece gate checks WO/operation/plan, but plan authority remains staged. | DB referential enforcement deferred. |
| H7 genealogy ontology drift | Refuted | P1 | Migration 121 aligns runtime and DB ontology. | No change. |
| H8 genealogy replay safety | Mostly refuted | P1 | Graph service enforces authority, self-reference/cycle checks, scope identity, and fingerprints. | Cross-plant replay tests remain useful. |
| H9 traceability scope bypass | Refuted | P1 | Controller derives scope from session and rejects caller-supplied scope filters. | No change. |
| H10 MTConnect XXE | Refuted | P1 | Parser rejects `DOCTYPE`/`ENTITY` and uses non-network XML parsing. | No change. |
| H11 polling readiness | Refuted | P2 | MTConnect poll service and scheduled job path exist. | Adapter smoke coverage remains staged. |
| H12 OPC UA full adapter | Partially confirmed | P2 | OPC UA is recognized as readiness metadata; live poller is MTConnect-focused. | Keep OPC UA readiness-only until governed adapter lands. |
| H13 payload scraping | Refuted | P1 | Migration 122 adds explicit digital-thread columns for event filters. | No change. |
| H14 5M gate contract | Refuted | P1 | Migration 130 adds scope identity and 5M gate/waiver columns. | No change. |
| H15 legacy/canonical genealogy split | Confirmed | P2 | Runtime authority marks legacy reader deprecated/read-only when graph is authoritative. | Retire legacy reader after compatibility window. |
| H16 direct machine control | Refuted | P1 | Connectivity remains ingest/advisory; no machine-command path was introduced. | Keep command authority out of this layer. |

## Paths inspected

- `mom/api/controllers/CncProgramController.php`
- `mom/api/controllers/TraceabilityGenealogyController.php`
- `mom/api/services/Traceability/GenealogyGraphService.php`
- `mom/api/services/EdgeConnectorService.php`
- `mom/api/services/MtconnectPollingService.php`
- `mom/api/services/ShopfloorExecutionService.php`
- `mom/database/migrations/121_genealogy_runtime_ontology_constraints.sql`
- `mom/database/migrations/122_digital_thread_event_context_filters.sql`
- `mom/database/migrations/130_genealogy_scope_identity_and_5m_gate.sql`


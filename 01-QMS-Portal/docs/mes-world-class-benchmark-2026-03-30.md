# MES World-Class Benchmark 2026-03-30

## Research baseline

This benchmark aligns the HESEM runtime with the official directions below:

- [ISA-95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- [MTConnect](https://www.mtconnect.org/about)
- [OPC UA for Machinery](https://opcfoundation.org/markets-collaboration/opc-ua-for-machinery/)
- [Eclipse Sparkplug](https://sparkplug.eclipse.org/)
- [Timescale hypertables](https://docs.timescale.com/api/latest/hypertable/)
- [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [Epicor Cloud SDK / REST / Kinetic extensibility](https://www.epicor.com/en-au/products/enterprise-resource-planning-erp/kinetic/cloud-business-platform/ptw-cloud-sdk/)

## Deep assessment

### What is already stronger than many small-to-mid MES deployments

1. The database and runtime are clearly modeled around ISA-95 Level 3 and the Level 3/4 boundary instead of only building screens.
2. Evidence gates, NC release governance, tooling readiness, alarm governance, connector health, genealogy, and shift handover are already represented in runtime logic.
3. The migration ladder from JSON to PostgreSQL is safer than many brownfield CNC projects because the portal can keep operating while the database path is hardened.

### What is still missing against a world-class 2025-2026 target

1. Epicor is documented as the Level 4 source of record, but the runtime still lacked a governed sync-health layer for inbound, outbound, and reconciliation loops.
2. The exception board could show machine and evidence risk, but it could not yet show whether MES and Epicor were drifting apart by domain.
3. PostgreSQL shadow-write already existed for QMS/MES runtime, but the Epicor integration state was not mirrored into database tables that could be audited.

### Practical benchmark implications

1. ISA-95 still matters because it keeps the Level 3/4 contract explicit even when the plant later adopts MQTT/UNS or edge adapters.
2. MTConnect and OPC UA for Machinery remain the most realistic standards path for CNC machine context and governed signals.
3. Sparkplug matters because it provides a disciplined MQTT state model and single-source-of-truth topic discipline for future UNS evolution.
4. Timescale hypertables matter because machine, tool-life, and integration events are time-series first, not document-first.
5. NIST OT guidance matters because CNC connectivity is not only about data freshness; it is also about secure, reliable, and safety-aware operation.
6. Part 11 style thinking matters because electronic signatures, audit trails, and governed records eventually converge with launch gates, approvals, and quality evidence.

## What this upgrade cycle closes

This cycle adds the missing Level 3/4 governance foundation for:

- Epicor sync runs
- MES/Epicor reconciliation exceptions
- outbound transaction queue health
- cockpit visibility for degraded sync domains
- PostgreSQL shadow sync for Epicor runtime
- exception coverage for ERP drift, not only machine drift

## Recommended next upgrades after this cycle

1. Move selected Epicor snapshots to PostgreSQL primary-read once shadow-write stays green.
2. Add true Epicor transport adapters and retry workers instead of manual runtime upsert.
3. Promote connector feeds from pilot/manual to real MTConnect/OPC UA adapters.
4. Add TimescaleDB hypertables and aggregates when live machine and ERP cadence justify them.
5. Add formal B2MML payload generation for governed Level 3/4 transactions.

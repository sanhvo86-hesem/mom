# 10_WAVE_9_WORLDCLASS_EXTENSION.md

## Wave name

```text
Wave 9 — World-Class Extension (post-v1 release)
```

## Status

```text
Estimated duration: 12-18 months (full-team) / 24-30 months (solo Codex)
Codex sessions: 30-60
Predecessor gate: Wave 8 PASS + 1 vertical pack approved (production cutover gate)
Successor gate: ongoing continuous improvement
```

## Goal

Close the **70% gap** vs world-class platforms (SAP S/4 + ME + QM, Oracle ERP+SCM+Quality, Veeva, Siemens Opcenter):

1. **MES depth** — SPC/OEE/Andon/IoT/calibration/FMEA/validation
2. **Finance core** — GL/AP/AR/FA/cost/period close/multi-currency/multi-entity
3. **Supply chain depth** — demand planning, replenishment, cycle counting
4. **CRM depth** — lead → opportunity → contract → credit
5. **HR/EHS** — employee, shift, time, safety incident, energy
6. **Asset/maintenance depth** — PM schedules, reliability (Weibull/MTBF), spare parts
7. **Multi-tenancy** — tenant isolation discipline
8. **AI/ML platform** — model registry, feature store, training pipeline, 5 production ML features
9. **Real-time push (WebSocket/SSE) + GraphQL gateway**
10. **Customer + supplier portals** — separate web apps with SSO
11. **Industry vertical packs** — Pharma, Auto, Aero (+ optional Med Device, Food)
12. **Marketplace + 8 pre-built connectors** — Salesforce, SAP, Oracle, PTC Windchill, Siemens NX, MS 365, Slack/Teams, etc.

After Wave 9: HESEM at ~95% world-class capability per RUBRIC-1 scoring.

## Why this wave matters

Without Wave 9:
- HESEM remains "credible MOM/MES with QMS" — not "complete ERP platform"
- Cannot compete with SAP/Oracle for ERP claim
- Cannot serve regulated verticals end-to-end (need vertical packs)
- Cannot scale to multi-customer SaaS without multi-tenancy
- AI claim weak without ML platform

WITH Wave 9:
- Complete ERP+MOM+MES+EQMS+CRM in one platform
- Industry vertical compliance evidence ready for audit
- Multi-tenant SaaS-ready
- AI/ML production-grade with 5 launched features
- Marketplace ecosystem started

## Entry criteria

```text
[ ] Wave 8 returned PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
[ ] User approved production cutover for at least 1 vertical
[ ] First customer onboarded (or pilot)
[ ] Validation master plan executed
[ ] HA topology operational
[ ] D-1 to D-10 user decisions resolved (per master plan Part 13)
```

## Wave 9 streams (parallel)

Wave 9 is structured as **streams** rather than slices because:
- Streams are larger (4-8 weeks each)
- Streams need cross-functional teams (data, ML, compliance)
- Streams have inter-dependencies

### Stream 9A — MES Depth (12 weeks)

8 net-new roots:
- EQUIP — Equipment master (ISA-95 anchor)
- OEEEVT — OEE event
- DOWNTIME — Downtime reason
- SPCRUN — SPC control chart run
- CAL — Calibration record
- FMEA — Failure mode worksheet
- VAL — Validation run (IQ/OQ/PQ)
- COMPLAINT — Customer complaint

6 net-new workspaces:
- Andon Tower (live floor status)
- OEE Dashboard
- SPC Chart Workspace
- Calibration Schedule
- FMEA Workshop (collaborative editing)
- Operator Mobile Console (PWA mature)

Platform extensions:
- Real-time event bus (Kafka or RabbitMQ-extended)
- Equipment connector framework (OPC UA, MQTT)
- Statistical engine (control limits, Cp/Cpk)

ADRs: ADR-0026 to ADR-0033 (8 new)

### Stream 9B — Finance Core (8 weeks)

6 net-new roots:
- GL — General Ledger entry
- AP — Accounts Payable invoice
- AR — Accounts Receivable invoice
- FA — Fixed Asset
- COSTRUN — Cost rollup batch
- PERIODCLOSE — Month/quarter close packet

3 net-new workspaces:
- Trial Balance
- AP/AR Aging
- Cost Roll Comparison (standard vs actual)

Platform extensions:
- Multi-currency engine
- Multi-entity consolidation
- Tax compliance plugin contract (integrate Avalara recommended)

### Stream 9C — Supply Chain Depth (6 weeks)

5 net-new roots: DEMANDPLAN, REPLENPLAN, CYCLECOUNT, PHYSINV, SHIPMENT
3 net-new workspaces: Demand Planning, Replenishment Inbox, Inventory Variance Analysis

### Stream 9D — CRM Depth (6 weeks)

4 net-new roots: LEAD, OPPTY, CONTRACT, CREDIT
2 net-new workspaces: Sales Pipeline, Account 360

### Stream 9E — HR/EHS (4 weeks)

5 net-new roots: EMPLOYEE, SHIFT, TIMEATTENDANCE, SAFETYINC, ENERGYREADING

### Stream 9F — Asset/Maintenance Depth (6 weeks)

3 net-new roots: PM-SCHEDULE, RELIABILITY-RUN, SPARE-PART
2 net-new workspaces: PM Calendar, Asset Reliability Dashboard

### Stream 9G — Multi-tenancy (8 weeks)

Architecture:
- Single physical DB, schema-per-tenant OR shared schema with tenant_id
- Frozen choice per ADR-0034: shared schema with tenant_id (lower ops cost)
- Tenant context middleware enforces every query
- Per-tenant config (locale, timezone, branding, feature flags)
- Per-tenant rate limits

Migration of all existing tables: nullable tenant_id added, default 'hesem' for legacy
Eventually: NOT NULL after grace period

### Stream 9H — AI/ML Platform (16 weeks)

Platform foundation (8 weeks):
- Model registry (MLflow or simple S3 + version manifest)
- Feature store (Redis online + PostgreSQL offline)
- Training pipeline
- Inference service (Python FastAPI microservice)
- Per-model SLO + monitoring

5 production ML features (8 weeks, ~1.5 weeks each):
- Predictive maintenance (Weibull + LSTM)
- Demand forecasting (Prophet + transformer ensemble)
- Defect image classification (CNN)
- Anomaly detection (Isolation Forest, autoencoder)
- Complaint NLP classification (BERT-based)

ADR-0035 AI/ML platform contract
ADR-0036 ML model lifecycle management

### Stream 9I — Real-time Push + GraphQL (4 weeks)

WebSocket gateway with topic multiplexing
SSE fallback for legacy clients
ADR-0037 Real-time push pattern

GraphQL gateway:
- Schema mirrors REST canonical paths
- Same auth + audit
- Convenience layer; REST stays canonical
- ADR-0038 GraphQL gateway scope (Apollo open-source recommended)

### Stream 9J — Customer + Supplier Portals (8 weeks)

Customer portal (4 weeks):
- Separate web app at customer.hesem.io
- SSO from main HESEM (OIDC)
- Order placement (extends QUO/CPO/SO)
- Order status tracking
- Invoice download
- Complaint submission
- Document download (released CDOC visible to customer)

Supplier portal (4 weeks):
- Separate web app at supplier.hesem.io
- PO acknowledgment
- ASN (advanced shipping notice)
- Quality score visibility
- SCAR submission
- Doc upload

ADR-0039 External portal architecture
ADR-0040 Portal SSO + permission claim

### Stream 9K — Industry Vertical Packs (12 weeks, 3 packs × 3-4 weeks)

Each vertical pack is opt-in feature flag:

#### Pack 1: Pharma / Life Sciences (3-4 weeks)
Standards: 21 CFR Part 11, 21 CFR Part 820, ICH Q10, GAMP 5, EU MDR

New roots:
- APR (Annual Product Review)
- DEVIATIONLOG
- BATCHRECORD (master + executed)
- QC-SAMPLE
- STABILITY-STUDY

Customizations:
- 2-person e-sign on BREL/CAPA close/ECO approve
- Mandatory reason-for-change on every mutation
- Validation enforcement (no record release without approved IQ/OQ/PQ)

Reports:
- Annual Product Review
- Audit pack export (FDA inspection ready)
- Validation summary

#### Pack 2: Automotive / IATF 16949 (3 weeks)
Standards: IATF 16949, VDA 6.3, AIAG, FMEA-MSR

New roots:
- APQP (Advanced Product Quality Planning)
- PPAP (Production Part Approval Process)
- FAI-AS9102 / FAI-CQI
- CONTROL-PLAN
- GAGE-RR

#### Pack 3: Aerospace / AS9100 (3 weeks)
Standards: AS9100D, AS9102, AS9110, NADCAP, DFARS

New roots:
- AS9102-FAI
- SPECIAL-PROCESS-CERT (NADCAP)
- COUNTERFEIT-PARTS-CHECK
- SOFTWARE-CONFIG-CONTROL

Optional Pack 4 Med Device, Pack 5 Food — defer to post-Wave 9.

ADR-0041 Vertical pack contract (manifest, feature flag, isolation)

### Stream 9L — Marketplace + Pre-built Connectors (4 weeks)

Plugin contract:
- Manifest format (JSON)
- Signed packages
- Sandbox: limited API access per plugin
- UI extension points (slot-based)
- Server hook points (event subscriber)

8 pre-built connectors:
- Salesforce CRM (SO/CPO sync)
- SAP S/4 (financial sync)
- Oracle WMS (warehouse integration)
- PTC Windchill PLM (item revision sync)
- Siemens NX CAD (design sync)
- MS 365 / SharePoint (document repo sync)
- Slack / MS Teams (notifications)
- Microsoft Dynamics 365 (alternative ERP)

ADR-0042 Marketplace architecture
ADR-0043 Connector framework

## Wave 9 sequencing

```
Months 1-4: Stream 9A MES Depth (foundational; many other streams depend on it)
Months 1-3: Stream 9B Finance Core (parallel)
Months 4-6: Stream 9C Supply Chain Depth
Months 4-5: Stream 9D CRM Depth (parallel with 9C)
Months 5-6: Stream 9E HR/EHS
Months 6-9: Stream 9F Asset Depth + Stream 9G Multi-tenancy (parallel)
Months 6-12: Stream 9H AI/ML Platform (long, parallel with others)
Months 9-10: Stream 9I Real-time + GraphQL
Months 10-12: Stream 9J Portals
Months 9-13: Stream 9K Vertical Packs (3 sequential)
Months 13-14: Stream 9L Marketplace + Connectors
Months 14-18: Hardening + customer onboarding + buffer
```

## Decision phrase

```text
WAVE_9_WORLDCLASS_EXTENSION_PASS_PARITY_ACHIEVED
WAVE_9_WORLDCLASS_EXTENSION_PASS_WITH_GAPS
WAVE_9_WORLDCLASS_EXTENSION_PARTIAL_NEEDS_CONTINUATION
```

## Per-rule compliance

- **RULE-1**: Each new feature stays Stage 1 first; Stage 3 mutation only after vertical-specific workflow contract
- **RULE-2**: AI Governance enforced; all 5 ML features advisory only
- **RULE-3**: Pre-production wording UNTIL vertical pack production-trigger; then formal release language allowed per ADR
- **RULE-4**: 8 standard artifacts × ~50 streams/sub-streams
- **RULE-5**: Wave 8 must PASS + production cutover gate satisfied
- **RULE-6**: 15-question checklist per stream
- **RULE-7**: V<n> / S_<stream>_<scope> naming
- **RULE-8**: Read-only graduation; Stage 3 controlled per-mutation ADR

## Workload estimate

```text
Total: ~280 engineering-weeks (with parallelism)
Solo Codex-augmented: 24-30 months
Full team (14-16 people): 12-18 months
```

```
WAVE_9_PLAN_BASELINE_LOCKED
```

# STRATEGIC MASTER V2 — World-Class ERP/MOM/MES/EQMS

**Generated**: 2026-04-26
**Author**: Claude Code (parallel research session)
**Purpose**: Unified strategic compass for transforming HESEM Operations Platform from "Wave 1 prototype" into the **world's strongest ERP + MOM + MES + EQMS platform**.
**Status**: Living document. Supersedes `STRATEGIC_MASTER.md` once Wave 1 closes.

---

## TL;DR (1 page)

| Topic | Position |
|---|---|
| **Current state** | Wave 1 ~70% complete: 13/18 record-shell + workspace surfaces, backend C.1+C.2+C.3 done, 12 ADRs, 200+ E2E tests, 3-browser visual regression, live-API toggle pattern proven |
| **World-class benchmark** | SAP S/4 + ME + QM, Oracle ERP+SCM+Quality, Siemens Opcenter, AVEVA MES, Veeva QualityOne, MasterControl, ETQ |
| **Critical gaps** | MES core depth (SPC/OEE/downtime), Calibration, FMEA/Risk, APS/MRP/MPS, IoT/OPC UA, AI/ML augmentation, Andon, Maintenance CMMS depth, Customer/Supplier portals, Multi-tenancy, Compliance vertical mappings (IATF, AS9100, ICH, HACCP) |
| **Roadmap** | Wave 1 (current, ~5 weeks remaining) → Wave 2 MES Depth (3 months) → Wave 3 Cross-Cutting (4 months) → Wave 4 Compliance & Verticals (3 months) |
| **Total workload** | ~12-15 months of focused multi-stream work to reach world-class parity, ~6 months to MVP world-class |
| **Implementation strategy** | Continue Codex parallel slice cycle (4-5 sessions in parallel) + dedicated streams for non-slice work (data engineering, ML, DevOps, compliance) |
| **Quality posture** | Zero-mutation prototype → opt-in live API → fixture-graduated production cutover per slice. ADR-governed, immutable architecture decisions. |
| **Total complexity** | 6 NEW root entities, ~25 NEW workspace modules, 8 backend platform expansions, 5 industry vertical compliance mappings, 4 frontend UX patterns (charts, IoT live, mobile, AR) |

---

## Part 1 — Current State Snapshot (post-Phase 4 projection)

### 1.1 Architecture frozen (ADR-governed)

```
14 experience domains × 46 primary modules × 8 BCs × 8 spines
52 enterprise roots / 51 normalized roots
18 Wave 1 workflow roots
9 route classes (SH, DL, ML, AC, AR, ERD, NRD, WS, SFW)
23 frozen API family tokens
12 ADRs (incl. live API toggle, replication pattern)
```

### 1.2 Wave 1 progression after Phase 4 + carry-over

| Slice | Root | Class | Status |
|---:|---|---|---|
| 0.5 | Nav shell (SH/DL/ML) | shell | DONE + full 14×30 expansion |
| 1 | DISP Dispatch Board | WS projection | DONE |
| 2 | NQCASE Nonconformance | AR governed-quality | DONE + live-API |
| 3 | TRAIN Training Matrix | WS projection | DONE |
| 4 | CAPA | AR governed-quality | DONE + live-API |
| 5 | CDOC Controlled Documents | AR governed-content | DONE + live-API |
| 6 | INSP Inspection | AR governed-quality | DONE + live-API |
| 7 | BREL Batch Release | AR governed-release | DONE + live-API |
| 8 | ECO Engineering Change | AR governed-change | (Phase 3 carry-over, ~95% done) |
| 9 | JO Job Order | AR transactional | (Phase 4 megaprompt ready) |
| 10 | SO Sales Order | AR transactional | (Phase 4 megaprompt ready) |
| 11 | WO Work Order | AR transactional | (Phase 4 megaprompt ready) |
| 12 | CPO Customer PO | AR transactional | (Phase 4 megaprompt ready) |
| **13-18** | **PO, QUO, PREC, LOT, IREV, MWO** | **AR transactional/genealogy** | **PHASE C — needs backend creation** |

### 1.3 Backend streams

| Stream | Scope | Status |
|---|---|---|
| C.1 | EQMS plural aliases (NCR, CAPA, CDOC, INSP, BREL, ECO, TRAIN) | DONE |
| C.2 | Transactional REST formalization (SO/JO/WO + 301 redirects) | DONE |
| C.3 | CPO canonical path rename | DONE |
| C.4 | RED root controllers (PO, QUO, PREC, LOT, IREV, MWO) | NOT STARTED — Wave 1 closure prerequisite |

### 1.4 Quality infrastructure

| Layer | Status |
|---|---|
| Functional E2E (Playwright) | ~200+ tests, chromium/firefox/webkit |
| A11y (axe-core WCAG 2 AA) | All Phase A surfaces clean |
| Visual regression (snapshots) | All 3 browsers covered |
| Performance (Lighthouse) | Baseline captured |
| Security review | Phase 1 D.5 complete |
| CI workflow | `.github/workflows/hmv4-e2e.yml` drafted (not auto-activated) |

### 1.5 What works EXCELLENTLY today (above-industry-average)

1. **ADR-governed architecture** — Vocabulary frozen, drift-resistant
2. **Slice-based prototype cycle** — Predictable cadence, granular rollback
3. **Forbidden-file enforcement** — Production protected from prototype
4. **Live-API resource registry pattern (ADR-0012)** — Mechanical to add new live roots
5. **Graphics Authority enforcement (ADR-0009)** — No design drift via tokens
6. **Bridge alias policy (ADR-0010)** — Smooth legacy URL migration
7. **Multi-browser visual regression** — Industry-leading for prototype phase

---

## Part 2 — World-Class Benchmark

### 2.1 Reference platforms (per-pillar)

| Pillar | Top 3 references |
|---|---|
| **ERP** | SAP S/4HANA · Oracle ERP Cloud · Microsoft Dynamics 365 F&O |
| **MOM/MES** | Siemens Opcenter (SIMATIC IT) · AVEVA MES · Rockwell FactoryTalk · Dassault DELMIA Apriso · Honeywell Process MES |
| **eQMS** | Veeva QualityOne · MasterControl · ETQ · Sparta TrackWise · Intellect QMS |
| **CMMS** | IBM Maximo · IFS Maintenix · UpKeep · Fiix |
| **WMS** | SAP EWM · Manhattan WMS · Blue Yonder · Oracle WMS Cloud |
| **CRM** | Salesforce · Microsoft Dynamics 365 CE · HubSpot |
| **APS** | Siemens Opcenter APS · DELMIA Quintiq · ASPROVA |

### 2.2 Standards a world-class platform satisfies

```
ISA-95           — manufacturing operations management hierarchy
ISA-88           — batch control standard
B2MML            — XML standard for ISA-95 data exchange
ISO 9001         — QMS general
ISO 13485        — QMS medical devices
ISO 14001        — environmental management
ISO 45001        — OHS management
ISO/IEC 27001    — information security
ISO/IEC 27017    — cloud security
SOC 2 Type II    — service org controls
21 CFR Part 11   — electronic records & signatures (FDA)
21 CFR Part 820  — medical device QSR (FDA)
EU MDR           — medical device regulation (EU)
GAMP 5           — pharma automated manufacturing
ICH Q7/Q8/Q9/Q10 — pharma quality framework
IEC 62304        — medical software lifecycle
IEC 61511        — functional safety
IEC 61131-3      — PLC programming languages
IATF 16949       — QMS automotive
VDA 6.3          — process audit (German auto)
AS9100/AS9110    — aerospace QMS
NADCAP           — aerospace special-process accreditation
HACCP            — food safety
BRC, FSSC 22000  — food management
FSMA             — US food safety modernization
GS1, UDI         — serialization standards
OPC UA           — industrial interoperability
MQTT             — IoT messaging
```

### 2.3 Capability matrix world-class platforms have

```
A. OPERATIONS / MES
  A.1  Real-time shop-floor data collection (OPC UA, MQTT, equipment connectors)
  A.2  OEE tracking (Availability × Performance × Quality)
  A.3  Downtime tracking + reason codes
  A.4  SPC (Statistical Process Control) — control charts: X-bar/R, EWMA, CUSUM, p, np, c, u
  A.5  SQC sampling plans (AQL, MIL-STD-105, ANSI Z1.4)
  A.6  Andon (visual + escalation system)
  A.7  Connected worker (mobile, AR overlays, voice)
  A.8  Digital work instructions (multimedia, multi-language, version-controlled)
  A.9  Real-time dispatch & finite scheduling
  A.10 APS / MRP / MPS (advanced planning, material requirements, master schedule)
  A.11 Capacity planning (finite + infinite)
  A.12 Route/process flow modeling (BOM/Routing)
  A.13 Equipment hierarchy + asset master
  A.14 Production cost rollup (actual vs standard)
  A.15 Yield + scrap analytics

B. QUALITY / EQMS
  B.1  NCR/Deviation/Concession workflow
  B.2  CAPA workflow with cause analysis (5-Why, fishbone, Pareto, FTA)
  B.3  SCAR (supplier corrective action)
  B.4  Change control (ECO + MOC management of change)
  B.5  Document control (revision, distribution, controlled copies, training tie-in)
  B.6  Calibration management (assets, intervals, certificates)
  B.7  Audit management (internal, supplier, regulatory)
  B.8  Risk management (DFMEA, PFMEA, HACCP, HAZOP, FTA)
  B.9  Validation (IQ, OQ, PQ, computer system validation)
  B.10 Annual Product Review (APR)
  B.11 Customer complaint workflow
  B.12 Recall management
  B.13 Batch genealogy + COA (Certificate of Analysis)
  B.14 21 CFR Part 11 e-signatures with reason + meaning
  B.15 Audit trail with hash chain + WORM storage
  B.16 Training & qualification matrix (live)
  B.17 Skill assessment + competency
  B.18 Supplier qualification + scoring
  B.19 First Article Inspection (FAI) per AS9102

C. SUPPLY CHAIN
  C.1  Demand planning + forecasting
  C.2  Supplier management + scoring
  C.3  RFQ → PO → receipt → invoice 3-way match
  C.4  Multi-warehouse + multi-bin
  C.5  Lot/serial tracking
  C.6  Cycle counting + physical inventory
  C.7  Cross-docking
  C.8  3PL integration
  C.9  Returns (RTV, RMA)
  C.10 Drop-ship + back-to-back
  C.11 Inventory optimization (safety stock, EOQ)

D. COMMERCIAL / CRM
  D.1  Lead → opportunity → quote → SO funnel
  D.2  Pricing tiers + discounts + promotions
  D.3  Contract management
  D.4  Customer portal (self-service ordering, status, invoices)
  D.5  Customer credit + collections
  D.6  Sales forecasting
  D.7  Returns + warranty claims

E. FINANCE
  E.1  GL, AP, AR, FA
  E.2  Multi-currency + multi-entity
  E.3  Cost accounting (standard, actual, ABC)
  E.4  Period close + financial consolidation
  E.5  Budgeting + forecasting
  E.6  Tax compliance (multi-jurisdiction VAT/GST/sales tax)
  E.7  Bank reconciliation
  E.8  Treasury

F. WORKFORCE / HCM
  F.1  Employee master + org structure
  F.2  Time & attendance
  F.3  Shift management
  F.4  Payroll (or payroll integration)
  F.5  Training (LMS) + qualification
  F.6  Performance management
  F.7  Safety incidents + EHS
  F.8  Compliance training audit

G. ASSET / MAINTENANCE
  G.1  Asset hierarchy + functional location
  G.2  Preventive maintenance schedules
  G.3  Corrective maintenance work orders
  G.4  Predictive maintenance (condition-based, AI/ML)
  G.5  Spare parts inventory (in-house + 3PL)
  G.6  Reliability (MTBF, MTTR, Weibull, FRACAS)
  G.7  Calibration tie-in (G ↔ B.6)
  G.8  Lubrication routes
  G.9  Energy monitoring + sustainability

H. ANALYTICS / AI
  H.1  Real-time KPI dashboards
  H.2  Self-service BI
  H.3  Data warehouse / data lake
  H.4  Anomaly detection
  H.5  Predictive maintenance ML
  H.6  Demand forecasting ML
  H.7  Image recognition for defect detection
  H.8  NLP for customer complaint classification
  H.9  Process mining

I. PLATFORM / TECH
  I.1  Multi-tenancy (logical or physical)
  I.2  Multi-language (10+)
  I.3  Multi-currency
  I.4  RBAC + ABAC + segregation of duties (SOD)
  I.5  SSO (SAML 2.0, OIDC, OAuth2)
  I.6  MFA + adaptive auth
  I.7  API gateway + rate limiting
  I.8  REST + GraphQL + Webhook + Event streaming
  I.9  Real-time push (WebSocket / SSE)
  I.10 Event bus (Kafka or equivalent)
  I.11 Audit log immutable (hash chain or WORM)
  I.12 Backup + disaster recovery (RPO/RTO commitments)
  I.13 High availability (active-active, multi-region)
  I.14 Observability (metrics, logs, traces — OpenTelemetry)
  I.15 Plugin/extension framework
  I.16 Mobile native + PWA
  I.17 Offline mode for connected workers
  I.18 Print management (label, work-instruction)

J. INTEGRATION
  J.1  EDI (X12, EDIFACT)
  J.2  OPC UA (industrial)
  J.3  MQTT (IoT)
  J.4  REST/GraphQL APIs (already covered)
  J.5  Webhook subscriptions
  J.6  ETL/ELT framework
  J.7  iPaaS connectors (MuleSoft, Boomi style)
  J.8  Pre-built connectors (Salesforce, SAP, Oracle, PLM, CAD)
  J.9  Field service mobile

K. COMPLIANCE / VERTICAL
  K.1  21 CFR Part 11 (FDA)
  K.2  ICH Q10 (pharma)
  K.3  GAMP 5 (pharma automation)
  K.4  IATF 16949 (auto)
  K.5  AS9100 (aerospace)
  K.6  ISO 13485 (medical device)
  K.7  ISO 9001 (general)
  K.8  HACCP (food)
  K.9  EU MDR (med device)
  K.10 GDPR / CCPA / data privacy
```

**Total**: ~120 capabilities across 11 pillars. World-class platforms hit 90-95%; many specialize per industry.

---

## Part 3 — Gap Analysis: HESEM vs World-Class

### 3.1 What HESEM has now (post-Wave 1 estimate)

```
A. Operations:    A.7 (partial), A.9 (dispatch board), A.12 (route), A.13 (asset)
                  ≈ 4 of 15 = 27% capability
B. Quality:       B.1, B.2, B.3 (partial), B.4, B.5, B.7 (partial), B.13 (genealogy spine), B.14, B.15, B.16
                  ≈ 10 of 19 = 53% capability  ← STRONGEST PILLAR
C. Supply chain:  C.3 (partial via PO/PREC), C.5 (lot root)
                  ≈ 2 of 11 = 18%
D. Commercial:    D.1 (partial via QUO/CPO/SO)
                  ≈ 1 of 7 = 14%
E. Finance:       (none in Wave 1)
                  ≈ 0 of 8 = 0%
F. Workforce:     F.5 (training root)
                  ≈ 1 of 8 = 13%
G. Asset/Maint.:  G.1 (partial via MWO root), G.7 (calibration via CDOC indirect)
                  ≈ 1.5 of 9 = 17%
H. Analytics:     H.1 (basic dashboards in nav)
                  ≈ 1 of 9 = 11%
I. Platform:      I.2, I.3 (partial), I.4 (RBAC partial), I.11 (immutable audit), I.16 (PWA), I.17 (mentioned)
                  ≈ 6 of 18 = 33%
J. Integration:   J.4 (REST APIs)
                  ≈ 1 of 9 = 11%
K. Compliance:    K.1 (e-sign partial), K.7 (ISO 9001 implicit)
                  ≈ 2 of 10 = 20%

TOTAL CAPABILITY: ~30% of world-class
```

### 3.2 Critical gap blocks (must close to claim "world-class")

#### **GAP-A: MES core depth** (priority P0)
Currently: dispatch board fixture-only; no real-time data collection, no SPC, no OEE, no downtime tracking.
World-class: Siemens Opcenter has complete real-time ISA-95 stack.

#### **GAP-B: Calibration management** (priority P0 — required by ISO 9001 / ISO 17025)
Currently: not in Wave 1.
World-class: integrated with B.6 + G.7 + asset master.

#### **GAP-C: FMEA / Risk management** (priority P0 — required by ISO 9001 / ISO 14971 / IATF 16949)
Currently: not designed.
World-class: separate root with DFMEA/PFMEA + risk registers + RPN scoring.

#### **GAP-D: APS/MRP/MPS** (priority P1)
Currently: dispatch board is intent-only; no scheduling math.
World-class: Siemens Opcenter APS, ASPROVA do finite-capacity scheduling.

#### **GAP-E: AI/ML augmentation** (priority P1 — competitive table-stakes for new platforms)
Currently: none.
World-class: predictive maintenance, demand forecasting, defect image recognition, anomaly detection.

#### **GAP-F: Maintenance CMMS depth** (priority P1)
Currently: MWO root planned but RED.
World-class: IBM Maximo level depth (asset, PM, condition monitoring, reliability).

#### **GAP-G: Customer + Supplier portals** (priority P2)
Currently: none.
World-class: self-service portals reduce service desk load 40-60%.

#### **GAP-H: Multi-tenancy** (priority P2 — depends on go-to-market model)
Currently: single-tenant.
World-class: SaaS multi-tenant if SaaS-only; on-prem single-tenant if licensed.

#### **GAP-I: IoT / OPC UA / MQTT connectivity** (priority P0 for MES claim)
Currently: not designed.
World-class: every modern MES has OPC UA + MQTT broker integration.

#### **GAP-J: Industry vertical compliance mappings** (priority P1)
Currently: ISO 9001 implicit; 21 CFR Part 11 e-sign infrastructure.
World-class: each vertical (auto, aero, pharma, med device, food) has:
  - Compliance evidence pack
  - Validation suite (IQ/OQ/PQ)
  - Industry-specific workflows
  - Pre-built reports

#### **GAP-K: Finance core** (priority P1 — ERP claim)
Currently: 0%.
World-class: GL/AP/AR/FA + costing + tax + close.

#### **GAP-L: Demand planning + sales forecasting** (priority P2)
Currently: 0%.
World-class: time-series + ML hybrid.

#### **GAP-M: Mobile/AR connected worker depth** (priority P1 — table-stakes for MOM)
Currently: PWA mentioned but no specific UX.
World-class: native mobile + AR overlays + voice picking.

#### **GAP-N: Andon system** (priority P1)
Currently: not designed.
World-class: visual factory with escalation.

#### **GAP-O: Recall management** (priority P1 for regulated industries)
Currently: not designed.
World-class: forward+backward genealogy + customer notification + regulatory filing.

### 3.3 Gap score

```
P0 critical blockers:    A (MES depth), B (calibration), C (FMEA), I (IoT)
P1 important:            D (APS), E (AI/ML), F (maint. depth), J (compliance), K (finance), M (mobile/AR), N (andon), O (recall)
P2 differentiating:      G (portals), H (multi-tenant), L (demand planning)
```

To claim "world-class", must close ALL P0 and at least 70% of P1 (~6 of 8). P2 differentiates further.

---

## Part 4 — Multi-Wave Roadmap (Wave 1 → Wave 4)

### Wave 1 — current (Slices 1-18, ~5 weeks remaining)

**Goal**: Close 18 Wave 1 roots with authoritative record shells + workspaces.

```
Phase A quality stream:        Slices 0.5/1/2/3/4/5/6/7/8 (DONE except ECO)
Phase B transactional:         Slices 9/10/11/12 (Phase 4 prompts queued)
Phase C RED roots:             Slices 13/14/15/16/17/18 (need backend creation)

Plus: Stream C.4 (RED root controllers PO/QUO/PREC/LOT/IREV/MWO) — 2-3 weeks backend work
Plus: Phase 3 carry-over (ECO + Live API replication) — already prompted
Plus: Live-API toggle for transactional roots (Slices 9-12) — wired in Phase 4 megaprompts
```

**Wave 1 closure deliverables**:
- 18 authoritative record shells / workspaces (5 fixture states × 3 browsers × ~150 pages)
- ~250+ Playwright E2E tests
- ~12 ADRs frozen
- All 18 Wave 1 roots have backend canonical paths (REST + alias)
- Live-API toggle on 10+ EQMS-backed roots
- Nav shell covers full 14×30 catalog
- 13 ADRs (estimated — 12 + ADR-0013 for RED root pattern)

**Wave 1 closure ETA**: ~5 weeks of Codex parallel sessions + backend work.

### Wave 2 — MES Depth + Quality Vertical Closure (~12 weeks)

**Goal**: Make HESEM a credible MES + complete the EQMS pillar.

#### Wave 2 new roots (8 net-new)

| Root code | Name | Why critical |
|---|---|---|
| **EQUIP** | Equipment Master | ISA-95 anchor for OEE/SPC; ties G.1 + A.13 |
| **OEEEVT** | OEE Event | Records availability/performance/quality events; powers A.2/A.3 |
| **DOWNTIME** | Downtime Reason | Fishbone-aware downtime classification; A.3 |
| **SPCRUN** | SPC Control Chart Run | Statistical process control runs with charts; A.4 |
| **CAL** | Calibration Record | Asset calibration with intervals + cert; B.6 |
| **FMEA** | FMEA Worksheet | DFMEA/PFMEA with severity/occurrence/detection/RPN; B.8 |
| **VAL** | Validation Run | IQ/OQ/PQ packages; B.9 |
| **COMPLAINT** | Customer Complaint | Customer-facing quality issues; B.11 |

Each = 1 slice. 8 slices ≈ 8 weeks.

#### Wave 2 new workspaces (6 net-new)

| Workspace | Pattern | Powers |
|---|---|---|
| **Andon Tower** | WS projection | A.6 — real-time floor status |
| **OEE Dashboard** | WS projection | A.2 — equipment/line/site rollup |
| **SPC Chart Workspace** | WS projection | A.4 — live control charts |
| **Calibration Schedule** | WS projection | B.6 — what's due, overdue |
| **FMEA Workshop** | WS draft | B.8 — collaborative authoring |
| **Operator Mobile Console** | WS workspace | A.7 — connected worker hub |

6 slices ≈ 6 weeks.

#### Wave 2 platform/spine extensions

```
Spine: Real-time event bus (Kafka or RabbitMQ extended) for OEE/SPC events
Spine: Equipment connector framework (OPC UA + MQTT plugin contract)
Spine: Statistical engine (control limits, capability indices Cp/Cpk/Pp/Ppk)
Spine: Mobile/PWA depth (offline cache, sync queue, AR overlays optional)
```

These are platform work, not slices. ~4 weeks parallel to slices.

#### Wave 2 deliverables

- 14 new Wave 2 roots/workspaces
- 30+ ADRs total (Wave 1 12 + Wave 2 18)
- OEE/SPC/Andon real-time data flow proven (event bus + equipment connector)
- Calibration + FMEA + Validation closes pharmaceutical/medical device QMS gap
- Customer complaint workflow ties to NQCASE/CAPA
- Connected worker mobile shell (PWA) baseline

**Wave 2 ETA**: 12 weeks (3 frontend slices/week × 4 weeks + 4 weeks platform + 4 weeks integration).

### Wave 3 — Cross-Cutting + Integration + AI (~16 weeks)

**Goal**: Add finance core, supply chain depth, AI/ML augmentation, multi-tenancy.

#### Wave 3 new roots

```
Finance:
  GL, AP, AR, FA (4 roots) — table-stakes ERP
  COSTRUN — cost rollup engine
  PERIODCLOSE — month/quarter close

Supply chain:
  DEMANDPLAN — demand forecasting
  REPLENPLAN — replenishment orders
  CYCLECOUNT — cycle counting
  PHYSINV — physical inventory
  SHIPMENT (already implicit in fulfillment-returns)

CRM:
  LEAD, OPPTY (2 roots)
  CONTRACT — customer contracts
  CREDIT — credit + collections

HR/EHS:
  EMPLOYEE, SHIFT, TIMEATTENDANCE
  SAFETYINC — safety incident
  ENERGYREADING — energy monitoring

Asset/Maint:
  PM-SCHEDULE — preventive maintenance schedule
  RELIABILITY-RUN — Weibull/MTBF analysis
  SPARE-PART (extends LOT)
```

~20 new roots in Wave 3.

#### Wave 3 platform expansions

```
Multi-tenancy: tenant isolation, per-tenant config, billing
SSO: SAML 2.0 + OIDC + provisioning
GraphQL gateway (in addition to REST)
WebSocket / SSE push for real-time UI
ETL/ELT framework for data warehouse
AI/ML platform:
  - Predictive maintenance (Weibull + ML)
  - Demand forecasting (Prophet + transformers)
  - Defect image recognition (CNN)
  - Anomaly detection (isolation forest, autoencoder)
  - NLP complaint classification
Customer portal + supplier portal (separate web apps)
```

**Wave 3 ETA**: 16 weeks (4 streams × 4 weeks each in parallel).

### Wave 4 — Compliance + Vertical Depth + Production-Grade (~12 weeks)

**Goal**: Production-ready for at least 3 industry verticals with full compliance evidence.

#### Wave 4 deliverables

```
Compliance evidence packs (per vertical):
  - 21 CFR Part 11 + ICH Q10 + GAMP 5 (pharma vertical)
  - IATF 16949 + VDA 6.3 (automotive vertical)
  - AS9100 + AS9102 FAI + NADCAP (aerospace vertical)
  - Optional: ISO 13485 + EU MDR (medical device vertical)
  - Optional: HACCP + FSSC 22000 (food vertical)

Each vertical = 3 weeks of:
  - Workflow customization layer
  - Compliance report templates
  - Validation suite (IQ/OQ/PQ scripts)
  - Industry-specific KPIs
  - Industry-specific master data
  - Industry-specific labels (e.g., FDA UDI, GS1)

Production-grade infrastructure:
  - HA active-active (multi-AZ)
  - DR (RPO 1hr, RTO 4hr)
  - Backup/restore tested
  - Observability (OpenTelemetry, Prometheus, Grafana, Loki)
  - Performance budget (Lighthouse 90+, p95 page load < 2s)
  - Load testing (10K concurrent users)
  - Security: SOC 2 audit prep, penetration testing
  - GDPR / CCPA data privacy implementation

Marketplace:
  - Plugin/extension framework
  - Pre-built connectors (Salesforce, SAP, Oracle, PLM tools)
```

**Wave 4 ETA**: 12 weeks (3 verticals × 3 weeks + 3 weeks infra hardening).

### Roadmap summary

| Wave | Theme | Weeks | New roots | Total deliverables |
|---|---|---:|---:|---:|
| **1** (current) | Frontend prototype baseline | 5 (remaining) | 18 | 13 ADRs, 250+ tests, 12 record shells |
| **2** | MES depth + EQMS closure | 12 | 14 | OEE/SPC/Andon real-time, calibration, FMEA, validation, mobile shell |
| **3** | Finance + supply chain + AI/ML + multi-tenant | 16 | 20 | Finance core, demand planning, AI augmentation, customer portal |
| **4** | Compliance + verticals + production-grade | 12 | (vertical extensions) | 3 vertical evidence packs, HA/DR, marketplace |
| **Total** | | **~45 weeks** | **52 NEW roots** | World-class parity |

**Total time to "world-class" parity**: ~10-12 months from Wave 1 closure (~13 months from now).

**Time to "credible MOM/MES/EQMS for one vertical"**: ~6 months from Wave 1 closure (Wave 2 + 1 vertical from Wave 4).

---

## Part 5 — Workload Estimation

### 5.1 Engineering effort

```
Wave 1 remaining (5 weeks):
  Frontend slice cycle: 6 slices × ~3 hr Codex = 18 hr Codex = ~3 weeks calendar
  Backend C.4 RED roots: 6 × 2-3 days = 4-6 weeks (parallel to frontend)
  Integration QA: 1 week

Wave 2 (12 weeks):
  Frontend: 14 slices × ~3 hr = ~12 weeks at 1-2 slices/week
  Backend: 14 new roots × 2-3 days = 4-5 weeks (parallel)
  Platform extensions (event bus, equipment connector, statistical engine, mobile shell):
    4 streams × 3 weeks = 4 weeks parallel
  Total parallel effort: 12 weeks

Wave 3 (16 weeks):
  Frontend: 20 slices × ~3 hr = ~14 weeks at 1.5 slices/week
  Backend: 20 new roots × 2-3 days = 8 weeks (parallel)
  Platform: multi-tenancy, SSO, GraphQL, AI/ML platform:
    4 streams × 4 weeks = 4 weeks parallel
  Customer + supplier portal: 4 weeks (separate web app)
  Total parallel effort: 16 weeks

Wave 4 (12 weeks):
  Vertical packs: 3 × 3 weeks = 9 weeks (sequential or 1 parallel)
  Production-grade infra: 3-4 weeks (parallel)
  Compliance audit prep: 2 weeks
  Total: 12 weeks

GRAND TOTAL: ~45 weeks calendar (~10 months)
              ~280 engineering-weeks of effort (with parallelism)
```

### 5.2 Roles needed (full team for Wave 2-4)

```
Frontend lead + 2 frontend engineers      (Codex sessions + manual review)
Backend lead + 3 backend engineers        (Codex + manual; PHP/PostgreSQL)
Platform lead + 1 SRE                     (event bus, observability, multi-tenancy, HA/DR)
Data lead + 1 data engineer + 1 ML eng    (data warehouse, AI/ML augmentation)
QA lead + 2 QA automation                 (E2E, performance, security testing)
DevOps + 1 release manager                (CI/CD, deployment, monitoring)
Compliance lead + 1 validation engineer   (vertical compliance packs)
UX designer (mobile + AR overlays)
Tech writer (compliance docs)

TOTAL: ~14-16 people for full Wave 2-4 execution
```

For SOLO/SMALL TEAM execution (current model): **multiply duration ~3-4×**, so ~30-36 months solo.

### 5.3 Per-slice effort breakdown (current pattern)

```
Per slice (average):
  Codex impl:       3 hr execution
  Codex QA:         1 hr execution
  Manual review:    1-2 hr
  Visual baselines: 30 min × 3 browsers
  ADR (if needed):  1 hr
  Total per slice:  ~7-9 hr human-equivalent
  Calendar:         1-2 days with parallel streams
```

**For Wave 2-4 ≈ 50 new slices**: ~400 hr human review + Codex parallel execution.

---

## Part 6 — Implementation Strategy

### 6.1 Continue what's working

```
✅ Slice-based prototype cycle (planning → approval → impl → QA)
✅ Codex parallel sessions (4-5 in parallel, frontend + backend + test infra)
✅ ADR-governed architecture
✅ Forbidden file enforcement
✅ Live-API resource registry (mechanical to extend)
✅ Bridge alias policy
✅ Graphics Authority no-hardcode
✅ Multi-browser visual regression
✅ Fixture-first development
```

### 6.2 New patterns needed for Wave 2

```
NEW: Real-time event handling pattern
  - HMV4 hydration extends with EventSource / WebSocket subscription
  - Workspace renderer subscribes to event bus topic
  - Auto-refresh on event (debounced)
  - Offline queue + replay on reconnect
  - ADR-0014: Real-time event subscription pattern

NEW: Statistical chart rendering
  - Reusable SPC chart component (X-bar/R, p, np, c, u)
  - Plugin into ANY workspace as panel
  - Server pre-computes control limits
  - Pure frontend rendering (no charting library SaaS lock-in)
  - ADR-0015: Statistical chart component contract

NEW: Mobile/PWA slice pattern
  - Different viewport defaults
  - Touch-first interactions
  - Offline-capable fixture mode
  - Service worker cache strategy
  - ADR-0016: Mobile slice contract
  - ADR-0017: Offline-first sync queue

NEW: Equipment connector contract
  - OPC UA / MQTT plugin spec
  - Per-equipment type adapter
  - Heartbeat + health
  - ADR-0018: Equipment connector framework
```

### 6.3 New patterns needed for Wave 3

```
NEW: Multi-tenant slice variation
  - Tenant-scoped fixtures
  - Tenant config injection
  - Cross-tenant report rollup (admin only)
  - ADR-0019: Multi-tenancy data model

NEW: AI/ML integration pattern
  - ML inference endpoint contract (RPC + batch)
  - ML model versioning + rollback
  - Feature store
  - ADR-0020: AI/ML integration

NEW: Customer/supplier portal slice
  - Separate auth domain
  - Subset of read-only slices
  - Self-service mutation surfaces
  - ADR-0021: External portal pattern
```

### 6.4 Scaling Codex parallel sessions

```
Current peak: 4-5 parallel sessions

Target Wave 2: 6-8 parallel sessions
  - 3 frontend slices (sequential per renderer file conflict)
  - 1-2 backend root creation
  - 1-2 platform extension (event bus, statistical engine)
  - 1 documentation / ADR

Target Wave 3-4: 10-12 parallel sessions
  - Add: data engineering, ML, compliance, UX/mobile, vertical pack

Critical: meticulous branch hygiene to avoid merge conflicts
  - One branch per slice, named per ADR-0005 convention
  - Daily integration: merge to main + sync local
  - Forbidden-file guard runs in CI on every push
```

### 6.5 Quality gate evolution

```
Wave 1 (current):
  - Functional E2E
  - axe-core a11y AA
  - Visual regression (chromium + firefox + webkit)
  - Performance baseline (Lighthouse)
  - Forbidden diff guard
  - GA token compliance

Wave 2 add:
  - Real-time event delivery test (event bus integration)
  - Mobile viewport visual regression
  - Offline-mode E2E

Wave 3 add:
  - Multi-tenant isolation test
  - GraphQL contract test
  - AI/ML inference accuracy regression
  - Load test (10K concurrent)

Wave 4 add:
  - Compliance evidence test (e.g., 21 CFR Part 11 audit trail completeness)
  - Validation script execution (IQ/OQ/PQ)
  - Security: penetration testing pass
  - DR drill (failover test)
```

### 6.6 Vertical specialization without bloat

Avoid the SAP/Oracle problem of a 1000-config-flag mess. Instead:

```
Core platform: industry-agnostic (Wave 1-3)
Vertical packs: opt-in modules (Wave 4)
  - Pharma pack:    adds COMPLAINT-CFR11, APR, validation enforcement, GMP audit pack
  - Auto pack:      adds APQP, PPAP, FAI, IATF audit pack
  - Aerospace pack: adds AS9102 FAI, special-process tracking, NADCAP
  - Med device pack: adds DHF, design control, EU MDR/UDI
  - Food pack:      adds HACCP plan, allergen tracking, FSSC audit

Each pack:
  - Extends core roots with vertical fields
  - Adds vertical-specific roots (e.g., DHF for med device)
  - Adds compliance reports
  - Adds validation suite
  - Tech: feature-flag activated; core platform unaffected
```

---

## Part 7 — Quality & Governance

### 7.1 ADR cadence

```
Wave 1: 12-13 ADRs (current)
Wave 2: +12 ADRs (event bus, statistical engine, mobile, equipment connector, etc.)
Wave 3: +10 ADRs (multi-tenant, SSO, GraphQL, AI/ML, portals, finance, etc.)
Wave 4: +8 ADRs (per vertical + HA/DR + compliance)
TOTAL: ~42-45 ADRs at world-class state
```

### 7.2 ADR-driven decisions still needed (Wave 2 prerequisites)

```
ADR-0013: RED root pattern (Wave 1 closure)
ADR-0014: Real-time event subscription pattern (Wave 2 prerequisite)
ADR-0015: Statistical chart component contract (Wave 2)
ADR-0016: Mobile slice contract (Wave 2)
ADR-0017: Offline-first sync queue (Wave 2)
ADR-0018: Equipment connector framework (Wave 2)
ADR-0019: Multi-tenancy data model (Wave 3)
ADR-0020: AI/ML integration (Wave 3)
ADR-0021: External portal pattern (Wave 3)
ADR-0022: Industry vertical pack contract (Wave 4)
```

### 7.3 Test coverage targets

```
Wave 1 close:  ~250+ E2E tests, 100% on chromium, 95%+ firefox/webkit
Wave 2 close:  ~400+ E2E tests, mobile viewport pass, real-time event delivery
Wave 3 close:  ~600+ E2E tests, multi-tenant isolation, ML inference accuracy
Wave 4 close:  ~800+ E2E tests, compliance evidence pack, load tests pass
```

### 7.4 Performance budget

```
Page load p95:       < 2s (current ~1.5s with HMV4 prototype)
Interaction p95:     < 200ms
Lighthouse perf:     > 90
Bundle size budget:  < 500KB gzipped per route
Time to interactive: < 3s on mid-range hardware
```

---

## Part 8 — Risk Register (Wave 2-4)

| Risk | Severity | Mitigation |
|---|---|---|
| **R1: Codex token cost grows linearly with slices** | High | Differential megaprompts (Phase 3+ pattern); one full + N short references |
| **R2: Backend RED root creation is single-threaded human work** | High | Hire backend engineer; or build code-generation framework from Step 2 schema |
| **R3: Real-time event bus integration may break HMV4 fixture-first model** | Medium | Phase fixtures-first then live event subscription per slice via opt-in flag (mirror live-API toggle pattern) |
| **R4: AI/ML augmentation quality depends on training data** | Medium | Synthetic training data initially; gradual production data via opt-in |
| **R5: Multi-tenancy refactor late introduction = expensive** | High | Start tenant-aware data model in Wave 2 even if Wave 3 enables full |
| **R6: Vertical compliance certification (GAMP 5, AS9100, IATF) costs $$$$** | High | Plan certification budget early; partner with specialized auditors |
| **R7: Mobile/PWA fragmentation across iOS/Android | Medium | Standard PWA-only initially; native wrappers later |
| **R8: Equipment connector OPC UA: vendor-specific quirks** | Medium | Reference implementation per major brand (Siemens, Rockwell, Mitsubishi) |
| **R9: Customer/supplier portal is separate web app — auth complexity** | Medium | Single SSO + permission claim per portal type |
| **R10: AI/ML model drift in production** | Medium | Model monitoring + retraining pipeline + rollback capability |
| **R11: GraphQL adds 2nd API surface — maintenance burden** | Low | Make REST canonical; GraphQL is convenience layer with same contracts |
| **R12: Multi-language depth beyond vi/en** | Low | i18n already in DCC; extend translation queue for other languages incrementally |

---

## Part 9 — Decisions Required (User input gates)

These decisions cannot be made by Codex/Claude — they require user/stakeholder direction:

```
D1. Go-to-market model: SaaS multi-tenant OR on-prem licensed OR hybrid?
    → Determines Wave 3 multi-tenancy priority

D2. Target verticals (Wave 4):
    Top 3 from {pharma, automotive, aerospace, med device, food, electronics, general manufacturing}?
    → Determines Wave 4 compliance pack scope

D3. AI/ML investment level (Wave 3):
    Build in-house OR integrate cloud AI services (AWS SageMaker, Azure ML, Google Vertex)?
    → Build = full control, Integrate = faster, vendor-locked

D4. Mobile strategy:
    PWA only OR native iOS+Android wrappers OR Flutter/React Native?
    → PWA only ≈ 1 month; Native ≈ 4-6 months

D5. Real-time stack:
    RabbitMQ extended OR Kafka migration OR cloud-native (AWS EventBridge / Azure Service Bus)?
    → RabbitMQ stays = lower effort, Kafka = scale, Cloud = vendor-locked

D6. Hardware/IoT integration depth:
    Reference architecture only OR pre-built connectors for top 5 PLC brands OR fully integrated?
    → Reference = months, pre-built = year+, fully integrated = year+ + partnership

D7. Compliance certification timeline:
    Certify which standard first? (cost: $50K-200K per cert)
    → Drives Wave 4 ordering

D8. Production cutover trigger:
    When does HMV4 become the default user experience (vs current portal)?
    → Suggested: after Wave 2 close + 1 vertical hardened (Wave 4 first vertical)

D9. Team scaling:
    Solo Codex-augmented model OR hire team for parallel Wave 2-4?
    → Solo: 30-36 months. Team: 10-12 months.

D10. Open-source vs proprietary:
    Open-source the core platform (community), proprietary verticals (revenue)?
    → Strategic positioning question
```

---

## Part 10 — Recommended Immediate Next Steps (post-Wave 1 closure)

```
Sprint 1 (week 1-2 after Wave 1 close):
  - Author ADR-0013 RED root pattern
  - Author ADR-0014 Real-time event subscription
  - Author ADR-0015 Statistical chart component
  - Run Wave 2 candidate scoring (8 new roots × 12 dimensions like S16 matrix)
  - Pick Wave 2 Slice 19 (recommended: EQUIP — equipment master = ISA-95 anchor)

Sprint 2 (week 3-4):
  - Slice 19 EQUIP frontend + backend
  - Statistical engine spike (compute control limits server-side, render client-side)
  - Mobile slice contract draft

Sprint 3-12 (Wave 2 main):
  - 3-4 weeks: OEEEVT, DOWNTIME, SPCRUN, Andon (real-time stream first)
  - 3-4 weeks: CAL, FMEA, VAL (quality vertical closure)
  - 2 weeks: COMPLAINT + connections to NQCASE/CAPA
  - 2 weeks: Mobile shell + offline pattern

Sprint 13+ (Wave 3):
  - Pick D1-D5 user decisions
  - Phase out fixture-first → fixture+live hybrid → live-default
  - Begin finance core (GL/AP/AR/FA)
  - Begin AI/ML platform spike
```

---

## Closing

HESEM is **30% of the way to world-class** with Wave 1 nearly closed. The architectural foundation (14×46×8×8 frozen, slice-based prototype, ADR governance, live-API replication pattern) is **already industry-leading for a project at this stage** — most enterprise platforms accumulate technical debt at this size; HESEM has accumulated **architectural assets**.

The path to world-class is **clear** but **long** (~12 months full-team, ~30 months solo-Codex-augmented). The biggest risks are: (a) backend RED root creation is single-threaded human work, (b) compliance certification is expensive, (c) AI/ML adds operational complexity.

The **strategic asset** is the slice-based + Codex-parallel + ADR-governed model. **Maintain that discipline through Wave 2-4** and HESEM ships a real world-class platform.

```
WORLD_CLASS_ROADMAP_BASELINE_LOCKED
NEXT: WAVE_1_CLOSURE_THEN_WAVE_2_PLANNING
```

---

**Companion files**:
- `WAVE2_MES_DEPTH_ROADMAP.md` (Wave 2 detail)
- `WAVE3_CROSS_CUTTING_ROADMAP.md` (Wave 3 detail)
- `WAVE4_COMPLIANCE_VERTICAL_ROADMAP.md` (Wave 4 detail)
- `WORLD_CLASS_BENCHMARK_REFERENCE.md` (industry reference)

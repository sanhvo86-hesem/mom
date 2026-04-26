# 12_MEASUREMENT_RUBRICS.md

## Purpose

Quantify HESEM progress vs world-class. Used quarterly per RULE-7 review cadence.

Four rubrics:
- **RUBRIC-1**: 11-pillar capability scoring
- **RUBRIC-2**: Vendor benchmark
- **RUBRIC-3**: Build-vs-buy decisions per capability
- **RUBRIC-4**: Compliance/standards coverage map

---

## RUBRIC-1: Eleven Capability Pillars × 5 Levels

### Score levels

```
0:  Not present
1:  Stub / fixture only / mentioned in ADR
2:  Basic implementation, fixture-backed, no production data
3:  Production-capable for one vertical, no compliance evidence
4:  Production-capable, compliance evidence for one industry
5:  Industry-leading, multi-vertical, competitive vs SAP/Oracle/Veeva
```

### Pillar A — Operations / MES

| Capability | Score | Notes |
|---|---:|---|
| A.1 Real-time shop-floor data collection (OPC UA, MQTT) | 0 | Wave 9 Stream 9A |
| A.2 OEE tracking | 0 | Wave 9 Stream 9A |
| A.3 Downtime tracking + reason codes | 0 | Wave 9 Stream 9A |
| A.4 SPC (Statistical Process Control) | 0 | Wave 9 Stream 9A |
| A.5 SQC sampling plans (AQL, MIL-STD-105) | 0 | Wave 9 Stream 9A |
| A.6 Andon system | 0 | Wave 9 Stream 9A |
| A.7 Connected worker (mobile, AR, voice) | 1 | Wave 3 + Wave 9 expansion |
| A.8 Digital work instructions | 1 | CDOC root linked |
| A.9 Real-time dispatch & finite scheduling | 2 | Slice 1 dispatch board fixture |
| A.10 APS / MRP / MPS | 0 | Wave 9 |
| A.11 Capacity planning | 0 | Wave 9 |
| A.12 Route/process flow modeling (BOM/Routing) | 1 | Implicit in JO/WO |
| A.13 Equipment hierarchy + asset master | 1 | EQUIP root in Wave 9 |
| A.14 Production cost rollup | 0 | Wave 9 Stream 9B |
| A.15 Yield + scrap analytics | 0 | Wave 9 |

**Pillar A average**: 0.4 / 5 (POST-WAVE-1: ~30%)
**Target after Wave 9**: 4.0+ / 5

### Pillar B — Quality / EQMS

| Capability | Score | Notes |
|---|---:|---|
| B.1 NCR/Deviation/Concession | 3 | NQCASE Slice 2 ready |
| B.2 CAPA workflow + RCA | 3 | CAPA Slice 4 ready |
| B.3 SCAR (supplier corrective action) | 1 | Linked to NC; not separate root |
| B.4 Change control (ECO + MOC) | 3 | ECO Slice 8 ready |
| B.5 Document control (CDOC) | 3 | CDOC Slice 5 ready |
| B.6 Calibration management | 0 | Wave 9 (CAL root) |
| B.7 Audit management | 1 | Audit trail spine; no audit workflow |
| B.8 Risk management (FMEA) | 0 | Wave 9 (FMEA root) |
| B.9 Validation (IQ/OQ/PQ) | 0 | Wave 9 (VAL root) |
| B.10 Annual Product Review | 0 | Wave 9 vertical pack |
| B.11 Customer complaint | 0 | Wave 9 (COMPLAINT root) |
| B.12 Recall management | 0 | Wave 9 + vertical pack |
| B.13 Genealogy + COA | 1 | Genealogy spine; Wave 6 surfacing |
| B.14 21 CFR Part 11 e-sign | 2 | Infrastructure, prototype disabled |
| B.15 Audit trail (immutable hash chain) | 3 | Spine implemented |
| B.16 Training & qualification matrix | 3 | TRAIN Slice 3 ready |
| B.17 Skill assessment | 0 | Wave 9 |
| B.18 Supplier qualification + scoring | 0 | Wave 9 supplier cockpit |
| B.19 First Article Inspection (FAI) | 0 | Wave 9 vertical pack |

**Pillar B average**: 1.5 / 5 (STRONGEST)

### Pillar C — Supply Chain

| Capability | Score |
|---|---:|
| C.1 Demand planning + forecasting | 0 |
| C.2 Supplier management + scoring | 0 |
| C.3 RFQ → PO → receipt → invoice 3-way match | 1 |
| C.4 Multi-warehouse + multi-bin | 0 |
| C.5 Lot/serial tracking | 1 |
| C.6 Cycle counting + physical inventory | 0 |
| C.7 Cross-docking | 0 |
| C.8 3PL integration | 0 |
| C.9 Returns (RTV, RMA) | 0 |
| C.10 Drop-ship + back-to-back | 0 |
| C.11 Inventory optimization | 0 |

**Pillar C average**: 0.2 / 5

### Pillar D — Commercial / CRM

| Capability | Score |
|---|---:|
| D.1 Lead → opportunity → quote → SO funnel | 0 |
| D.2 Pricing tiers + discounts + promotions | 0 |
| D.3 Contract management | 0 |
| D.4 Customer portal | 0 |
| D.5 Customer credit + collections | 0 |
| D.6 Sales forecasting | 0 |
| D.7 Returns + warranty claims | 0 |

**Pillar D average**: 0.0 / 5

### Pillar E — Finance

| Capability | Score |
|---|---:|
| E.1 GL, AP, AR, FA | 0 |
| E.2 Multi-currency + multi-entity | 0 |
| E.3 Cost accounting | 0 |
| E.4 Period close + financial consolidation | 0 |
| E.5 Budgeting + forecasting | 0 |
| E.6 Tax compliance | 0 |
| E.7 Bank reconciliation | 0 |
| E.8 Treasury | 0 |

**Pillar E average**: 0.0 / 5

### Pillar F — Workforce / HCM

| Capability | Score |
|---|---:|
| F.1 Employee master + org structure | 0 |
| F.2 Time & attendance | 0 |
| F.3 Shift management | 0 |
| F.4 Payroll | 0 |
| F.5 Training (LMS) + qualification | 1 |
| F.6 Performance management | 0 |
| F.7 Safety incidents + EHS | 0 |
| F.8 Compliance training audit | 0 |

**Pillar F average**: 0.1 / 5

### Pillar G — Asset / Maintenance

| Capability | Score |
|---|---:|
| G.1 Asset hierarchy + functional location | 1 |
| G.2 Preventive maintenance schedules | 0 |
| G.3 Corrective maintenance work orders | 1 |
| G.4 Predictive maintenance (AI/ML) | 0 |
| G.5 Spare parts inventory | 0 |
| G.6 Reliability (MTBF, MTTR, Weibull) | 0 |
| G.7 Calibration tie-in | 0 |
| G.8 Lubrication routes | 0 |
| G.9 Energy monitoring | 0 |

**Pillar G average**: 0.2 / 5

### Pillar H — Analytics / AI

| Capability | Score |
|---|---:|
| H.1 Real-time KPI dashboards | 1 |
| H.2 Self-service BI | 0 |
| H.3 Data warehouse / data lake | 0 |
| H.4 Anomaly detection | 0 |
| H.5 Predictive maintenance ML | 0 |
| H.6 Demand forecasting ML | 0 |
| H.7 Image recognition for defect detection | 0 |
| H.8 NLP for complaint classification | 0 |
| H.9 Process mining | 0 |

**Pillar H average**: 0.1 / 5

### Pillar I — Platform / Tech

| Capability | Score |
|---|---:|
| I.1 Multi-tenancy | 0 |
| I.2 Multi-language (10+) | 1 |
| I.3 Multi-currency | 0 |
| I.4 RBAC + ABAC + SOD | 1 |
| I.5 SSO (SAML, OIDC) | 0 |
| I.6 MFA + adaptive auth | 0 |
| I.7 API gateway + rate limiting | 1 |
| I.8 REST + GraphQL + webhook + event streaming | 1 |
| I.9 Real-time push (WebSocket / SSE) | 0 |
| I.10 Event bus (Kafka or equivalent) | 1 |
| I.11 Audit log immutable | 3 |
| I.12 Backup + DR | 0 |
| I.13 High availability | 0 |
| I.14 Observability (OpenTelemetry) | 0 |
| I.15 Plugin/extension framework | 0 |
| I.16 Mobile native + PWA | 1 |
| I.17 Offline mode | 0 |
| I.18 Print management | 0 |

**Pillar I average**: 0.5 / 5

### Pillar J — Integration

| Capability | Score |
|---|---:|
| J.1 EDI (X12, EDIFACT) | 0 |
| J.2 OPC UA (industrial) | 0 |
| J.3 MQTT (IoT) | 0 |
| J.4 REST/GraphQL APIs | 1 |
| J.5 Webhook subscriptions | 0 |
| J.6 ETL/ELT framework | 0 |
| J.7 iPaaS connectors (MuleSoft, Boomi) | 0 |
| J.8 Pre-built connectors (Salesforce, SAP, Oracle, PLM) | 0 |
| J.9 Field service mobile | 0 |

**Pillar J average**: 0.1 / 5

### Pillar K — Compliance / Vertical

| Capability | Score |
|---|---:|
| K.1 21 CFR Part 11 (FDA) | 1 |
| K.2 ICH Q10 (pharma) | 0 |
| K.3 GAMP 5 (pharma automation) | 0 |
| K.4 IATF 16949 (auto) | 0 |
| K.5 AS9100 (aerospace) | 0 |
| K.6 ISO 13485 (medical device) | 0 |
| K.7 ISO 9001 (general) | 1 |
| K.8 HACCP (food) | 0 |
| K.9 EU MDR (med device) | 0 |
| K.10 GDPR / CCPA / data privacy | 0 |

**Pillar K average**: 0.2 / 5

### Overall scorecard

```
Total HESEM score (post-Wave-1):  ~30% world-class
After Wave 2-4:                    ~40%
After Wave 5-6:                    ~55%
After Wave 7-8:                    ~70%
After Wave 9 streams 9A-9D:        ~80%
After Wave 9 streams 9G-9K:        ~90%
After Wave 9 stream 9L marketplace: ~95% (industry-competitive)
```

---

## RUBRIC-2: Vendor Benchmark

### ERP suite leaders

| Vendor | Strengths | HESEM gap |
|---|---|---|
| SAP S/4HANA | Most comprehensive; deep verticals | finance core, CRM ecosystem |
| Oracle ERP Cloud | Strong finance; multi-entity | UX is less polished |
| Microsoft Dynamics 365 | Power Platform extensibility | manufacturing depth |
| IFS Cloud | Strong CMMS / asset | smaller ecosystem |
| Epicor Kinetic | Manufacturing-focused mid-market | regional reach |
| Plex (Rockwell) | Cloud MES + ERP; auto-friendly | smaller |

### MES specialists

| Vendor | Strengths | HESEM gap |
|---|---|---|
| Siemens Opcenter | OPC UA native; Camstar med-device | none of A.1-A.6 yet |
| AVEVA MES | Process industries | discrete focus |
| Rockwell FactoryTalk | Allen-Bradley PLC integration | vendor-neutral approach |
| Honeywell Forge | Pharma + oil/gas | discrete weak |
| Dassault DELMIA Apriso | Discrete, auto/aero | none of A.1-A.10 |
| GE Proficy | Discrete + process | smaller in 2026 |

### eQMS leaders

| Vendor | Strengths | HESEM gap |
|---|---|---|
| Veeva QualityOne | Cloud-native; life sciences leader; clean UI | per-user pricing high |
| MasterControl | Pharma + med device deep | aging UI |
| ETQ Reliance | Configurable, multi-vertical | less polish |
| Sparta TrackWise | Pharma legacy leader | aging tech |
| Greenlight Guru | Med device focused; modern UI | med-device only |
| MetricStream | Compliance + risk + audit | enterprise-heavy |

### CMMS / EAM

| Vendor | Strengths | HESEM gap |
|---|---|---|
| IBM Maximo | Industry-standard CMMS | depth in MWO + reliability |

### CRM

| Vendor | Strengths | HESEM gap |
|---|---|---|
| Salesforce | Sales/Service/Manufacturing Cloud | ecosystem maturity |
| Microsoft D365 CE | Power Platform | depth |

### APS

| Vendor | Strengths | HESEM gap |
|---|---|---|
| Siemens Opcenter APS | Top-tier finite scheduler | A.10 entirely |
| Asprova | Discrete; Japan-focused | A.10 |

### Net competitive position at Wave 9 close

```
✅ Beats Oracle on UX + TCO
✅ Beats SAP on implementation speed (months vs years)
✅ Beats Veeva on integration breadth (single platform vs QMS-only)
✅ Beats Siemens on cloud-native + cost
❌ Loses to SAP on enterprise scale (>10K users)
❌ Loses to Oracle on database tuning at scale
❌ Loses to Salesforce on CRM ecosystem maturity

Positioning: "mid-market manufacturing-first MOM/MES/EQMS with full ERP,
opinionated for 3 verticals, faster + cheaper + cloud-native, with strong
open architecture"
```

---

## RUBRIC-3: Build vs Buy Per Capability

```
Statistical engine SPC:
  BUILD ~3 weeks (differentiator)

Equipment OPC UA / MQTT:
  BUILD reference + INTEGRATE Kepware/Matrikon for production-grade

AI/ML platform:
  INTEGRATE cloud (AWS SageMaker recommended) with HESEM data layer

Multi-tenancy:
  BUILD ~4 weeks foundation (architectural; not buyable)

Customer / supplier portals:
  BUILD ~4 weeks each (extends HESEM brand)

GraphQL gateway:
  INTEGRATE Apollo open-source (~1 week)

Identity / SSO:
  BUILD if mid-market (~2 weeks SAML/OIDC libs)
  INTEGRATE Auth0 / Okta if enterprise ($1-10/user/month)

Tax compliance engine:
  INTEGRATE Avalara / Vertex (~$1K-10K/month)
  (tax law is too volatile to maintain in-house)

Industrial PLC drivers:
  INTEGRATE Kepware / Matrikon (~$50K-200K license)

Image recognition for defects:
  INTEGRATE cloud Vision API + custom training
  OR BUILD with TensorFlow if proprietary IP at stake

Document storage / WORM:
  INTEGRATE S3 Object Lock for WORM
  BUILD application-layer audit chain

CRM ecosystem:
  Initial: BUILD CRM core
  Long-term: ALLOW INTEGRATE Salesforce via connector (Wave 9 Stream 9L)

ERP finance core:
  BUILD initially (differentiation in cost model)
  ALLOW INTEGRATE SAP via connector for migration scenarios
```

---

## RUBRIC-4: Compliance / Standards Coverage Map

### ISO 9001 (general QMS)

| Clause | Coverage | Wave |
|---|---|---|
| 4 Context | partial | implicit |
| 5 Leadership | partial | implicit |
| 6 Planning | partial | Wave 7 KPI governance |
| 7 Support (resources, competence, awareness, communication, documented info) | medium | TRAIN + CDOC |
| 8 Operation | medium | NCR + CAPA + INSP + BREL |
| 9 Performance evaluation | partial | Wave 7 analytics |
| 10 Improvement | partial | Wave 7 lessons learned |

### 21 CFR Part 11

| Requirement | Coverage | Wave |
|---|---|---|
| Validation | partial | Wave 9 vertical Pharma pack VAL root |
| Audit trail | YES | spine implemented |
| Electronic signatures | partial | infrastructure exists, prototype disabled |
| Password complexity | YES (assumed; verify Wave 8 ASVS) | Wave 8 |
| System access controls | YES | Wave 8 ASVS |
| Reason + meaning on signature | YES (when enabled) | Wave 8 |

### IATF 16949

| Requirement | Coverage | Wave |
|---|---|---|
| APQP | NOT YET | Wave 9 vertical Auto pack |
| PPAP | NOT YET | Wave 9 |
| FAI | NOT YET | Wave 9 |
| Control plan | NOT YET | Wave 9 |
| Process audit (VDA 6.3) | NOT YET | Wave 9 |
| FMEA-MSR | NOT YET | Wave 9 + FMEA root |

### AS9100D

| Requirement | Coverage | Wave |
|---|---|---|
| First Article Inspection AS9102 | NOT YET | Wave 9 vertical Aero pack |
| Special process tracking (NADCAP) | NOT YET | Wave 9 |
| Counterfeit parts prevention | NOT YET | Wave 9 |
| Software config control (DFARS 252.227) | NOT YET | Wave 9 |
| Risk-based audit routine | NOT YET | Wave 9 |

### ISO 13485 + EU MDR

| Requirement | Coverage | Wave |
|---|---|---|
| DHF (Design History File) | NOT YET | Wave 9 optional Med Device pack |
| Design control | NOT YET | Wave 9 |
| UDI (Unique Device Identification) | NOT YET | Wave 9 |
| Post-market surveillance | NOT YET | Wave 9 |
| Vigilance reporting (Article 87) | NOT YET | Wave 9 |

### HACCP / FSSC 22000

| Requirement | Coverage | Wave |
|---|---|---|
| HACCP plan with CCPs | NOT YET | Wave 9 optional Food pack |
| Allergen matrix | NOT YET | Wave 9 |
| Mock recall drill | NOT YET | Wave 9 |

---

## Quarterly review checklist

Each quarter:
1. Re-score 11 pillars (RUBRIC-1)
2. Re-position vs vendor benchmark (RUBRIC-2)
3. Re-validate build-vs-buy decisions (RUBRIC-3)
4. Update compliance coverage map (RUBRIC-4)
5. Update STRATEGIC_MASTER_V2_WORLDCLASS.md if material changes
6. Communicate to stakeholders

```
MEASUREMENT_RUBRICS_BASELINE_LOCKED
```

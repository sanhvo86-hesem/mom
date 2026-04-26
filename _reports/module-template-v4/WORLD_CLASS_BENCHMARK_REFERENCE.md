# WORLD-CLASS ERP/MOM/MES/EQMS BENCHMARK REFERENCE

**Companion to**: `STRATEGIC_MASTER_V2_WORLDCLASS.md`
**Purpose**: Industry reference for capabilities, vendors, standards. Used to score gap analysis.

---

## 1. Vendor capability matrix

### ERP suite leaders

| Vendor | Product | Strengths | Weaknesses |
|---|---|---|---|
| **SAP** | S/4HANA + ME + QM + PP | Most comprehensive; deep industry verticals; certified for everything | Costly; complex; UX dated; long implementation |
| **Oracle** | ERP Cloud + SCM + Quality | Cloud-native; strong finance; multi-entity | UX inconsistent; integration debt; weak shop floor |
| **Microsoft** | Dynamics 365 F&O + SCM | Power Platform extensibility; Azure native | Manufacturing depth thinner than SAP; weak QMS |
| **Infor** | CloudSuite Industrial / LN | Industry templates; pre-built workflows | Smaller ecosystem |
| **IFS** | Cloud / Aurena | Strong CMMS / asset management; industrial | Niche brand awareness |
| **Epicor** | Kinetic | Manufacturing-focused; mid-market | Limited verticals |
| **Plex (Rockwell)** | Plex Smart Manufacturing | Cloud MES + ERP; automotive friendly | Smaller ecosystem |

### MES specialists

| Vendor | Product | Strengths | Weaknesses |
|---|---|---|---|
| **Siemens** | Opcenter (SIMATIC IT, Camstar) | Top-tier MES; OPC UA native; Camstar for med device | Expensive; integration complexity |
| **AVEVA** (Wonderware) | AVEVA MES + System Platform | Strong process industries; MES + DCS | Less discrete focus |
| **Rockwell** | FactoryTalk | Tight Allen-Bradley PLC integration; FT Hub | Vendor lock-in |
| **Honeywell** | Process MES / Forge | Strong process; pharma; oil & gas | Niche |
| **Dassault** | DELMIA Apriso | Discrete-focused; auto/aero strong | Heavy |
| **GE** | Proficy MES (now Inductive) | Discrete + process | Smaller in 2026 |
| **Critical Manufacturing** | cmNavigo | High-tech, semiconductor | Niche |
| **Werum** | PAS-X | Pharma / life sciences MES leader | Vertical-only |

### eQMS leaders

| Vendor | Product | Strengths | Weaknesses |
|---|---|---|---|
| **Veeva** | QualityOne / Vault Quality | Cloud-native; life sciences leader; UI clean | Expensive; per-user pricing |
| **MasterControl** | MasterControl QMS | Pharma + medical device deep | Aging UI; complex implementation |
| **ETQ** | Reliance | Configurable; multiple verticals | Less polish than Veeva |
| **Sparta Systems** | TrackWise (Honeywell) | Pharma legacy leader | Aging tech |
| **Intellect** | Intellect QMS | Low-code | Smaller scale |
| **iBASEt** | Solumina | Aerospace / defense | Vertical-only |
| **Greenlight Guru** | Greenlight Guru | Med device focused; modern UI | Med device only |
| **MetricStream** | MetricStream | Compliance + risk + audit | Enterprise-heavy |

### CMMS / EAM

| Vendor | Product |
|---|---|
| **IBM** | Maximo |
| **IFS** | IFS Maintenix (aero) / Cloud |
| **Infor** | EAM |
| **Hexagon** (Bentley) | EcoSys |
| **UpKeep** | UpKeep (mid-market) |
| **Fiix** (Rockwell) | Fiix |
| **Maintenance Connection** | (multi-vertical) |

### WMS

| Vendor | Product |
|---|---|
| **SAP** | EWM (Extended Warehouse Mgmt) |
| **Manhattan** | Manhattan Active WM |
| **Blue Yonder** (formerly JDA) | WMS Cloud |
| **Oracle** | WMS Cloud |
| **Tecsys** | Elite |
| **HighJump (Korber)** | WMS |

### CRM

| Vendor | Product |
|---|---|
| **Salesforce** | Sales Cloud + Service Cloud + Manufacturing Cloud |
| **Microsoft** | Dynamics 365 CE |
| **Oracle** | Sales Cloud + CX |
| **HubSpot** | HubSpot CRM |
| **Zoho** | Zoho CRM |

### APS (Advanced Planning & Scheduling)

| Vendor | Product |
|---|---|
| **Siemens** | Opcenter APS / Preactor |
| **Dassault** | DELMIA Quintiq |
| **Asprova** | Asprova |
| **Plex** | Plex Smart APS |
| **PlanetTogether** | PlanetTogether |

---

## 2. Standards reference

### Manufacturing operations

```
ISA-95 (ANSI/ISA-95) — Enterprise/Control System Integration
  Levels:
    Level 4: Business planning + logistics (ERP)
    Level 3: Manufacturing operations management (MES/MOM)
    Level 2: Monitoring, supervision (SCADA/HMI)
    Level 1: Sensing, manipulating (PLC, sensors)
    Level 0: Physical process

  Object models:
    Personnel, Equipment, Material, Process Segment, Product Definition,
    Production Schedule, Production Performance, Production Capability

  Activity model: Production, Maintenance, Quality, Inventory operations
```

```
ISA-88 (ANSI/ISA-88) — Batch Control
  Used for: pharma, food, chemicals, cosmetics
  Hierarchy: Enterprise → Site → Area → Process Cell → Unit → Equipment Module → Control Module
  Recipe types: General → Site → Master → Control
```

```
B2MML — XML serialization of ISA-95 data exchange
```

### Quality management

```
ISO 9001:2015 — QMS general
  Clauses: 4-10 (context, leadership, planning, support, operation, performance evaluation, improvement)

ISO 13485:2016 — QMS for medical devices
  Adds: regulatory compliance, design control, risk management

ISO 14001:2015 — EMS environmental
ISO 45001:2018 — OHS occupational health & safety

ISO/IEC 27001:2022 — Information security mgmt
ISO/IEC 27017 — Cloud-specific security controls

SOC 2 (Type I, Type II) — AICPA service org controls
  Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, Privacy
```

### FDA / regulatory

```
21 CFR Part 11 — Electronic records & signatures
  Requirements: validation, audit trail, e-sign with reason+meaning,
  password complexity, system access controls

21 CFR Part 820 — Quality System Regulation (QSR) for medical devices
21 CFR Part 210 / 211 — Current Good Manufacturing Practice (cGMP)

FDA FSMA — Food Safety Modernization Act
  Preventive Controls Rule
  Foreign Supplier Verification Program (FSVP)
  Sanitary Transportation Rule
```

### EU regulatory

```
EU MDR (Medical Device Regulation 2017/745) — replaces MDD
  Includes UDI requirements, post-market surveillance, vigilance
EU IVDR (In Vitro Diagnostic Regulation 2017/746)

GDPR — General Data Protection Regulation
GMP Annex 11 — Computerised Systems
```

### Industry-specific

```
Pharma:
  - GAMP 5 (ISPE) — Good Automated Manufacturing Practice
  - ICH Q7 — Active Pharmaceutical Ingredient GMP
  - ICH Q8 — Pharmaceutical Development
  - ICH Q9 — Quality Risk Management
  - ICH Q10 — Pharmaceutical Quality System
  - ICH Q11 — Drug Substance development
  - ICH Q12 — Lifecycle Management

Automotive:
  - IATF 16949 — Automotive QMS (replaces ISO/TS 16949)
  - VDA 6.1, 6.3, 6.5 — German automotive QMS
  - AIAG (Auto Industry Action Group) — APQP, PPAP, FMEA, SPC, MSA
  - CQI-9 (heat treatment), CQI-11 (plating), CQI-12 (coating), CQI-15 (welding), CQI-23 (molding)
  - ISO 26262 — Functional safety for road vehicles

Aerospace:
  - AS9100D — QMS for aviation, space, defense
  - AS9110 — Maintenance organizations
  - AS9120 — Distributors
  - AS9102 — First Article Inspection
  - NADCAP — Special process accreditation
  - DFARS 252.246-7008 — Counterfeit electronic parts

Food:
  - HACCP — Hazard Analysis Critical Control Point
  - FSSC 22000 — Food Safety System Certification
  - BRC Global Standards — Food, Packaging, Storage
  - SQF — Safe Quality Food
  - FDA Preventive Controls

Software / Embedded:
  - IEC 62304 — Medical device software lifecycle
  - IEC 61508 — Functional safety (industrial)
  - IEC 61511 — Process industry safety
  - IEC 61131-3 — PLC programming languages
```

---

## 3. Capability scoring rubric (used in gap analysis)

For each of the ~120 capabilities listed in `STRATEGIC_MASTER_V2_WORLDCLASS.md` Part 2.3:

```
Score 0:  Not present
Score 1:  Stub / fixture only / mentioned in ADR
Score 2:  Basic implementation, fixture-backed, no production data
Score 3:  Production-capable for one vertical, no compliance evidence
Score 4:  Production-capable, compliance evidence for one industry
Score 5:  Industry-leading, multi-vertical, competitive vs SAP/Oracle/Veeva
```

### HESEM current scores (estimated post-Wave 1)

```
A.1  Real-time data collection:        0  (not designed)
A.2  OEE tracking:                     0
A.3  Downtime tracking:                0
A.4  SPC charts:                       0
A.5  SQC sampling plans:               0
A.6  Andon:                            0
A.7  Connected worker:                 1  (PWA mentioned, no specific UX)
A.8  Digital work instructions:        1  (CDOC root tied to operations)
A.9  Real-time dispatch:               2  (Dispatch board fixture)
A.10 APS / MRP / MPS:                  0
A.11 Capacity planning:                0
A.12 Route/process flow:               1  (implicit in JO/WO)
A.13 Equipment hierarchy:              1  (asset-readiness module mentioned)
A.14 Production cost rollup:           0
A.15 Yield + scrap analytics:          0
PILLAR A AVERAGE: 0.4 / 5

B.1  NCR/Deviation:                    3  (NQCASE record shell live-API ready)
B.2  CAPA:                             3  (CAPA record shell live-API ready)
B.3  SCAR:                             1  (linked to NCR but not separate root)
B.4  Change control (ECO):             3  (ECO record shell)
B.5  Document control (CDOC):          3  (CDOC record shell + revision history)
B.6  Calibration:                      0  (no slice yet)
B.7  Audit management:                 1  (audit trail spine, no audit workflow)
B.8  Risk management (FMEA):           0  (no slice yet)
B.9  Validation (IQ/OQ/PQ):            0  (mentioned in CDOC)
B.10 Annual Product Review:            0
B.11 Customer complaint:               0  (no slice yet)
B.12 Recall management:                0
B.13 Genealogy + COA:                  1  (genealogy spine exists, COA not implemented)
B.14 21 CFR Part 11 e-sign:            2  (infrastructure exists, e-sign disabled in prototype)
B.15 Audit trail:                      3  (immutable hash chain, accessible per-record)
B.16 Training & qualification matrix:  3  (TRAIN workspace + qualification matrix)
B.17 Skill assessment:                 0
B.18 Supplier qualification:           0
B.19 First Article Inspection:         0
PILLAR B AVERAGE: 1.5 / 5  ← strongest pillar

C-K: see STRATEGIC_MASTER_V2_WORLDCLASS.md Part 3.1 for analogous scores

OVERALL: ~30% capability vs world-class average score 4.0
```

To reach world-class average score 4.0 across all 11 pillars: **~70% gap closure** = Wave 2 + Wave 3 + Wave 4.

---

## 4. Key learnings from successful platforms

### What SAP S/4 does well that HESEM should adopt

```
- Universal Journal: single source of truth for finance + costing (Wave 3 finance core should mirror)
- Embedded analytics: every transactional screen has KPI sidebar (Wave 3 dashboards)
- Industry templates: pre-configured for verticals (Wave 4 vertical packs)
- Localization layer: per-country tax/regulatory baked in (Wave 4)
- Fiori UX guidelines: consistent design language (HESEM Graphics Authority is similar)
```

### What Veeva QualityOne does well

```
- Cloud-only, no on-prem option (avoids IT complexity)
- Configuration not customization (no code changes; faster validation)
- Pre-validated for life sciences (compliance evidence comes with the product)
- Tight audit trail with WORM (HESEM audit trail spine matches)
- Modern UI with role-based dashboards
```

### What Siemens Opcenter does well

```
- Native OPC UA + MQTT (HESEM Wave 2 equipment connector contract)
- Tight integration to Siemens PLCs (vendor-specific advantage)
- Real-time KPI dashboards with drill-down
- Camstar variant for medical devices (vertical pack model)
```

### What Salesforce does well that HESEM should learn

```
- Platform-as-a-product (extensibility ecosystem)
- AppExchange marketplace (Wave 4 marketplace)
- Trailhead training (community + skill-building)
- Per-tenant customization without core branch (Wave 3 multi-tenant)
- API-first design (REST + Bulk API + Streaming API)
```

### Common failures in enterprise platforms (avoid these)

```
❌ Configuration-flag-explosion: SAP/Oracle have thousands of customization flags creating
   maintenance hell. HESEM avoids via vertical packs (opt-in modules).

❌ Customization-not-configuration trap: Veeva avoided by being more rigid; SAP/Oracle/Salesforce
   suffer when customers heavily customize and break upgrades.

❌ UX inconsistency: Oracle especially. HESEM has Graphics Authority + ADR-0009 to prevent.

❌ Slow upgrades: 18-24 month upgrade cycles. HESEM can do continuous deployment.

❌ Mobile afterthought: most enterprise platforms have weak mobile. HESEM Wave 2 puts mobile
   at the platform level, not bolted on.

❌ AI/ML afterthought: enterprise platforms add AI as separate add-ons. HESEM Wave 3 plans AI
   as a first-class platform layer.
```

---

## 5. Build vs Buy decisions HESEM should consider

For each Wave 2-4 capability, evaluate build-vs-buy:

```
Statistical engine (SPC):
  Build = full control, ~3 weeks
  Buy = rare 3rd-party, mostly bundled with $$$$ tools
  → BUILD (it's the differentiator)

Equipment connector OPC UA:
  Build = ~4 weeks reference, ongoing per-vendor work
  Buy = HiveMQ, Kepware, Matrikon (~$50K-$200K license)
  → BUILD reference + reuse Kepware/Matrikon for production-grade

AI/ML platform:
  Build = ~6 months for serious in-house
  Buy = AWS SageMaker, Azure ML, Google Vertex (~$10K-50K/month at scale)
  → INTEGRATE cloud (AWS SageMaker recommended) with HESEM data

Multi-tenancy:
  Build = ~4 weeks foundation, ongoing
  Buy = NA (architectural)
  → BUILD

Customer / Supplier portal:
  Build = ~4 weeks
  Buy = Salesforce Communities ($$$$)
  → BUILD (extends HESEM brand)

GraphQL gateway:
  Build = ~2 weeks
  Buy = Apollo Server (open-source) / Hasura (managed)
  → INTEGRATE Apollo open-source

Identity / SSO:
  Build = ~2 weeks (SAML/OIDC libs available)
  Buy = Auth0, Okta ($1-10/user/month)
  → BUILD if mid-market, INTEGRATE if enterprise

Tax compliance engine:
  Build = ~6 months serious
  Buy = Avalara, Vertex (~$1K-10K/month)
  → INTEGRATE (tax law is too volatile to maintain in-house)

Industrial PLC libraries:
  Build = ~years, vendor-specific
  Buy = Kepware drivers, OPC Foundation libs
  → INTEGRATE
```

---

## Closing

This benchmark exists to keep HESEM honest about world-class. Re-score quarterly using the rubric in §3. Aim for:

```
End of Wave 1:  ~30% world-class capability
End of Wave 2:  ~55% (+25 from MES depth + EQMS closure)
End of Wave 3:  ~80% (+25 from finance + AI + multi-tenant + portals)
End of Wave 4:  ~95% (+15 from compliance + verticals + production-grade)
```

At ~95%, HESEM is competitive with SAP S/4 + ME + QM bundle for cost ~1/10 the price for a focused vertical (e.g., automotive Tier 2/3 or pharma SMB).

**Net competitive position at Wave 4 close**:
- Beats Oracle ERP Cloud on UX + total cost of ownership
- Beats SAP S/4 on implementation speed (months vs years)
- Beats Veeva QualityOne on integration breadth (single platform vs QMS-only)
- Beats Siemens Opcenter on cloud-native + total cost
- Loses to SAP S/4 on enterprise-scale (>10K users), depth of finance verticals
- Loses to Oracle on database tuning (HESEM uses PostgreSQL)
- Loses to Salesforce on CRM ecosystem maturity

→ HESEM positioning: **mid-market manufacturing-first MOM/MES/EQMS with full ERP, opinionated for 3 verticals, faster + cheaper + cloud-native, with strong open architecture**.

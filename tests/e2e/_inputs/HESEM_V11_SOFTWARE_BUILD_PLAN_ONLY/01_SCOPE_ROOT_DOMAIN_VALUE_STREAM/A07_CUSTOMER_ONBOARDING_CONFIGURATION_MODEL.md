# A07 — Customer Onboarding and Configuration Model

```text
POSTURE: planning-only / pre-production-readiness
REPO_STATUS: Repo GitHub was intentionally not checked per user instruction in this turn.
```

## 1. Onboarding principle

HESEM vertical onboarding is **configuration-first**. A customer pack may enable vertical requirements, but it must not fork the core platform, create hidden authority, or promote an alias into a root.

The onboarding path is:

```text
Discover intended use -> choose vertical pack -> freeze root scope -> configure tenant/site/policy -> configure workflows/evidence -> configure routes/screens -> configure integrations -> fixture-safe prototype -> readiness review -> downstream B/C/D contract generation.
```

No step authorizes production use, formal operational switch-over, or a formally validated operational system claim.

## 2. Onboarding stages

| Stage | Owner | Inputs | Output artifacts | Gate | Stop-rule |
|---|---|---|---|---|---|
| `ONB-01 Intended-use and vertical selection` | Solution Architect + Customer Sponsor | customer industry, site count, product families, regulated scope, process type | vertical fit card; intended-use statement; regulated scope flag | At least one A07 vertical pack selected and maturity cap known | Stop if customer expectation requires production/validated claim outside A06 gates |
| `ONB-02 Tenant/site and organization model` | Tenant Platform Owner + Security Lead | tenant, sites, roles, customer programs, user groups | tenant/site matrix; role/action matrix; SoD assumptions | `TENANT`, `IAM`, `POLICY` scope configured in planning | Stop if actor/site/object/action policy cannot resolve |
| `ONB-03 Root scope freeze` | Architecture Owner + Domain Owners | A03 root catalog, A07 vertical root matrix | customer root-scope workbook; alias normalization list | Every selected root has owner, domain, authority and stop-rule | Stop if pack requires root not in baseline without gap request |
| `ONB-04 Master data and effectivity configuration` | Master Data Owner + Product Engineering Owner | item/customer/supplier/equipment/product family data | ITEM/CUST/SUP/EQP setup plan; effectivity policy | No downstream workflow starts without master-data authority | Stop if effectivity, revision or master-data owner is unclear |
| `ONB-05 Workflow/evidence profile` | Workflow Owner + Quality Owner | vertical delta matrix, customer procedure, compliance scope | workflow gate checklist; evidence class map; signature meaning draft | B-stream has enough input to generate workflow/evidence contracts | Stop if action can mutate without owner/evidence/audit/correction path |
| `ONB-06 Route/screen/action policy` | UX Owner + Domain Owner | root scope, route grammar, action-state rules | screen/route visibility map; disabled-action policy | Every workspace projection re-anchors to root shell | Stop if workspace becomes hidden authority |
| `ONB-07 API/data/integration boundary` | API Platform Owner + Integration Owner | partner systems, ERP/PLM/LIMS/CMMS/WMS/CRM needs | integration boundary card; API family prose request; fallback/replay plan | C-stream can generate contract prose with authz/problem/idempotency/telemetry/fallback | Stop if connector requires direct root mutation or no fallback |
| `ONB-08 Fixture-safe prototype plan` | Product Ops + QA Lead | configured routes, sample records, evidence checklist | fixture dataset plan; no-live-default checklist; rollback checklist | M3 current-portal-safe prototype planning possible | Stop if live API is default or fallback missing |
| `ONB-09 Regulated validation planning` | Quality Validation Owner | intended use, risk class, regulated records, signature scope | requirements traceability outline; protocol/report outline; validation evidence checklist | M6 package scope defined before regulated mutation/e-sign | Stop if validation traceability, signature meaning or audit trail is missing |
| `ONB-10 Readiness decision` | Product Council + Customer Sponsor | all onboarding artifacts | customer readiness report; downstream B/C/D/M handoff | Move to detailed workflow/API/frontend planning only | Stop if V21 implementation blocker or A06 maturity gate is ignored |

## 3. Configuration catalog

| Configuration area | Configuration objects | Canonical roots | Not allowed |
|---|---|---|---|
| Tenant/site scope | tenant, site, legal entity, customer program, feature flag | `TENANT`, `IAM`, `POLICY` | cross-tenant hidden sharing |
| Role/action authority | role, user, SoD, action policy, object scope | `USER`, `ROLE`, `IAM`, `POLICY` | action enabled without policy decision |
| Master/effectivity data | item, BOM, route, revision, customer/supplier/equipment | `ITEM`, `BOM`, `ROUTE`, `ECO`, `CUST`, `SUP`, `EQP` | bypassing ECO/effectivity gates |
| Workflow profile | states, transitions, command intent, correction/void, fallback | `WORKFLOW_ENGINE` plus business root | mutation without workflow/evidence contract |
| Evidence profile | evidence class, retention, signature meaning, audit class | `EVIDENCE`, `AUDIT` | standalone `ESIGN` root or e-sign without meaning |
| Quality profile | defect/severity/disposition/CAPA/release block | `INSP`, `NQCASE`, `MRB`, `CAPA`, `DEVIATION`, `RELEASE_PACKET` | release while quality blocker open |
| Traceability profile | lot, serial, genealogy depth, release/recall scope | `LOT`, `SERIAL`, `LOT_GENEALOGY`, `RECALL` | new graph-node/edge authority |
| Connected worker profile | instruction version, training, equipment/material readiness, offline/fallback | `INSTRUCTION`, `TRAIN_RECORD`, `EQP`, `WO`, `OPER` | mobile/kiosk hidden mutation |
| Integration profile | partner identity, allowed roots, event type, replay, fallback | `PARTNER_INTEGRATION`, `API_GATEWAY`, `EVENT_BUS`, `IDEMPOTENCY` | partner direct mutation |
| Analytics profile | KPI, source roots, lineage, confidence, human owner | `DATA_PRODUCT`, `AI_FEATURE`, `QUALITY_ANL`, `OEE_ANL` | automated approve/release/disposition/OT command |

## 4. Vertical-specific onboarding deltas

| Vertical | Required onboarding specialization |
|---|---|
| `VERT-01 Discrete ISO 9001` | customer requirement, ECO/effectivity, work execution, inspection/NQ/CAPA, supplier and genealogy profiles |
| `VERT-02 Medical Device` | intended use, ISO 13485/QMSR scope, EDHR template, complaint/CAPA/recall, service-life, training, Part 11/e-sign and validation plan |
| `VERT-03 Pharma Batch` | master batch record, EBR step evidence, QC/stability/release, deviation/CAPA/APR, Annex 11/Part 11 validation plan |
| `VERT-04 Automotive Supplier` | APQP phases, PPAP level, PSW package, FMEA/control plan, MSA/Gage R&R, SPC and customer-specific requirement profile |
| `VERT-05 Aerospace Defense` | AS9102_FAI, ITAR_CONTROL, special process/NADCAP, counterfeit check, MRB, serial genealogy and export access policy |
| `VERT-06 Food Beverage` | HACCP/control-plan profile, lot traceability, hold/quarantine, label/allergen attributes, recall drill and supplier lot intake |
| `VERT-07 Electronics High-Tech` | serial/component genealogy, high-mix ECO/BOM/route, test station boundary, rework/MRB and tool/equipment readiness |
| `VERT-08 Industrial MRO` | service-life record, maintenance schedule, calibration/tooling, warranty/complaint/CAPA, spare-parts and field partner boundary |
| `VERT-09 Chemical Process` | recipe/batch execution, EHS incident, safety report, LOTO, QC release, process excursion/deviation and hazardous task qualification |
| `VERT-10 Contract Manufacturing` | tenant/customer segregation, customer-owned design/effectivity, customer evidence packs, portal boundary, finance-readiness and multi-customer analytics |

## 5. Customer readiness scorecard

| Score area | Minimum evidence | Gate |
|---|---|---|
| Root scope completeness | selected roots all canonical, owner mapped, alias normalized | No root ambiguity |
| Tenant/security readiness | tenant/site/role/action/policy matrix exists | No cross-tenant or policy ambiguity |
| Workflow readiness | states, transition intent, evidence, audit, correction/void and stop-rule mapped | No uncontrolled mutation |
| API/integration readiness | authz, problem details, idempotency, concurrency, telemetry, fallback/replay described | No live API without fallback |
| Frontend readiness | route/screen/action states, disabled reason, authority class and evidence tabs described | No hidden workspace authority |
| Evidence/validation readiness | evidence class, retention, audit/signature meaning and validation scope defined | No e-sign/regulated mutation without M6 package |
| SRE/fallback readiness | rollback, fallback, observability and incident ownership described | No readiness claim without recovery path |
| Commercial fit | pack, scope, maturity cap, onboarding owner and downstream stream known | No marketing-only vertical |

## 6. Outputs to downstream prompts

A08 must synthesize A07 into final Stream A scope export. B/C/D must then generate the detailed workflow, API and frontend planning contracts. A07 does not create executable code, OpenAPI YAML/JSON, DDL or UI implementation.

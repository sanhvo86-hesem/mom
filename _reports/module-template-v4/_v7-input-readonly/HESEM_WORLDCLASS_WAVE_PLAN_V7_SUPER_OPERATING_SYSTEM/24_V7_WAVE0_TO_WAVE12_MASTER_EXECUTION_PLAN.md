# 24 — Wave 0 to Wave 12 Master Execution Plan
## Wave matrix

| Wave | Name | Goal | Entry | Exit | Outputs | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| W0 | Phase 2 Integration Review & Repair | Stop implementation drift; verify current main/branch; repair Chromium baseline blocker | Uploaded source + repo state; no new slice | V21 reports created; stream matrix classified; blocker resolved or formally contained | V21 current-main report, stream status matrix, Chromium repair plan, integration review | PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING or BLOCKED_CROSS_BROWSER |
| W0.5 | Platform Substrate Hardening | Stabilize mandatory spines before more slices | W0 pass or approved repair path | Identity/workflow/evidence/API/data contracts/Graphics Authority baseline accepted | Spine contracts, guard scripts, token governance, API contract template | W0_5_PLATFORM_SUBSTRATE_ACCEPTED |
| W1 | HMV4 Foundation Productization | Convert slice prototype mechanics into repeatable product factory | W0.5 accepted | Slice factory, fixtures, route parser, WS/AR templates, visual gates stable | Slice factory, templates, QA harness, rollback scripts | W1_SLICE_FACTORY_READY |
| W2 | Governed Record Factory | Build reusable AR root shell factory for quality/ERP/MES records | W1 ready | Record shell, tabs, audit/evidence/signature placeholders repeatable | AR template, root contract template, record shell tests | W2_RECORD_FACTORY_READY |
| W3 | eQMS + Workforce + Maintenance Core | Graduate CAPA/CDOC/TRAIN/MWO/INSP workflow and evidence foundations | W2 ready | Core eQMS workflows fixture/E2E and selected live read-only APIs stable | CAPA/CDOC/TRAIN/MWO/INSP reports | W3_EQMS_CORE_READY |
| W4 | Live Read-Only API Graduation | Turn selected roots from fixture to opt-in live read-only with fallback | W3 core stable | NQCASE/CAPA/CDOC/TRAIN/INSP read APIs contracted and observed | OpenAPI, problem registry, live-vs-fixture reports | W4_LIVE_READ_ONLY_READY |
| W4.5 | OTG Native Cutover | Make Operational Truth Graph an explicit product primitive | W4 ready | OTG nodes/edges/contracts and lineage browser prototype | OTG schema, graph traversal tests, evidence lineage | W4_5_OTG_NATIVE_READY |
| W5 | Core Transactional ERP/MOM | Implement SO/PO/JO/WO/INVTXN/SHIP/INVOICE/COST controlled flows | W4.5 ready | Transactional commands with workflow/audit/idempotency and rollback proof | Command bus, API/event contracts, transaction tests | W5_TRANSACTIONAL_CORE_READY |
| W6 | MES/OT Foundation | Build operation execution, equipment, work center, routing and OT-safe edge model | W5 ready | MES execution roots and OT boundaries modeled, read/write control gated | ISA-95/88 model, equipment/routing/operation packages | W6_MES_OT_FOUNDATION_READY |
| W6.5 | AI Advisory Controlled Rollout | Introduce AI copilot as advisory only with eval and risk controls | W6 foundation + AI risk package | AI can retrieve/explain/summarize; cannot execute regulated decisions | AI eval harness, intended-use, tool policy, red-team report | W6_5_AI_ADVISORY_READY |
| W7 | Digital Thread / Genealogy / Release | Connect lot/serial/inspection/NC/CAPA/MRB/release into release packet | W6.5 ready | Genealogy and release packet can prove make-to-release path | Release packet, genealogy graph, containment workflow | W7_DIGITAL_THREAD_RELEASE_READY |
| W8 | Analytics / Improvement / Reliability | CDC, lakehouse, OEE/SPC/cost and SRE telemetry mature | W7 ready | Quality/OEE/cost analytics from governed data contracts | Data products, OTel dashboards, DORA/SLO dashboards | W8_ANALYTICS_RELIABILITY_READY |
| W9 | Security / Validation / Compliance Closure | Complete validation and security packages for regulated scope | W8 ready | VMP/URS/RTM/IQ/OQ/PQ, ASVS/API/62443 evidence accepted | Validation package, security evidence, backup/restore rehearsal | W9_COMPLIANCE_VALIDATION_READY |
| W10 | Vertical Packs | Package pharma, med device, automotive, aerospace, industrial variants | W9 ready | Vertical roots and templates defined with onboarding packs | Pharma/med device/auto/aero pack docs and data contracts | W10_VERTICAL_PACKS_READY |
| W11 | Customer Pilot / Pre-Production Readiness | Prepare controlled pilot without calling it production | W10 ready | Pilot playbook, training, support, SRE, rollback and validation evidence ready | Pilot checklist, site readiness, support runbook | W11_PRE_PRODUCTION_READINESS_READY |
| W12 | Release Candidate / Scale Operating Model | Build multi-site productization and enterprise support operating model | W11 ready | Scale governance, tenant onboarding, operations, support, financial model stable | RC evidence book, commercial model, SRE/support model | W12_PRODUCTIZED_OPERATING_MODEL_READY |

### W0 — Phase 2 Integration Review & Repair

- Goal: Stop implementation drift; verify current main/branch; repair Chromium baseline blocker
- Entry criteria: Uploaded source + repo state; no new slice
- Exit criteria: V21 reports created; stream matrix classified; blocker resolved or formally contained
- Outputs: V21 current-main report, stream status matrix, Chromium repair plan, integration review
- Decision phrase: `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING or BLOCKED_CROSS_BROWSER`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W0.5 — Platform Substrate Hardening

- Goal: Stabilize mandatory spines before more slices
- Entry criteria: W0 pass or approved repair path
- Exit criteria: Identity/workflow/evidence/API/data contracts/Graphics Authority baseline accepted
- Outputs: Spine contracts, guard scripts, token governance, API contract template
- Decision phrase: `W0_5_PLATFORM_SUBSTRATE_ACCEPTED`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W1 — HMV4 Foundation Productization

- Goal: Convert slice prototype mechanics into repeatable product factory
- Entry criteria: W0.5 accepted
- Exit criteria: Slice factory, fixtures, route parser, WS/AR templates, visual gates stable
- Outputs: Slice factory, templates, QA harness, rollback scripts
- Decision phrase: `W1_SLICE_FACTORY_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W2 — Governed Record Factory

- Goal: Build reusable AR root shell factory for quality/ERP/MES records
- Entry criteria: W1 ready
- Exit criteria: Record shell, tabs, audit/evidence/signature placeholders repeatable
- Outputs: AR template, root contract template, record shell tests
- Decision phrase: `W2_RECORD_FACTORY_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W3 — eQMS + Workforce + Maintenance Core

- Goal: Graduate CAPA/CDOC/TRAIN/MWO/INSP workflow and evidence foundations
- Entry criteria: W2 ready
- Exit criteria: Core eQMS workflows fixture/E2E and selected live read-only APIs stable
- Outputs: CAPA/CDOC/TRAIN/MWO/INSP reports
- Decision phrase: `W3_EQMS_CORE_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W4 — Live Read-Only API Graduation

- Goal: Turn selected roots from fixture to opt-in live read-only with fallback
- Entry criteria: W3 core stable
- Exit criteria: NQCASE/CAPA/CDOC/TRAIN/INSP read APIs contracted and observed
- Outputs: OpenAPI, problem registry, live-vs-fixture reports
- Decision phrase: `W4_LIVE_READ_ONLY_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W4.5 — OTG Native Cutover

- Goal: Make Operational Truth Graph an explicit product primitive
- Entry criteria: W4 ready
- Exit criteria: OTG nodes/edges/contracts and lineage browser prototype
- Outputs: OTG schema, graph traversal tests, evidence lineage
- Decision phrase: `W4_5_OTG_NATIVE_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W5 — Core Transactional ERP/MOM

- Goal: Implement SO/PO/JO/WO/INVTXN/SHIP/INVOICE/COST controlled flows
- Entry criteria: W4.5 ready
- Exit criteria: Transactional commands with workflow/audit/idempotency and rollback proof
- Outputs: Command bus, API/event contracts, transaction tests
- Decision phrase: `W5_TRANSACTIONAL_CORE_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W6 — MES/OT Foundation

- Goal: Build operation execution, equipment, work center, routing and OT-safe edge model
- Entry criteria: W5 ready
- Exit criteria: MES execution roots and OT boundaries modeled, read/write control gated
- Outputs: ISA-95/88 model, equipment/routing/operation packages
- Decision phrase: `W6_MES_OT_FOUNDATION_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W6.5 — AI Advisory Controlled Rollout

- Goal: Introduce AI copilot as advisory only with eval and risk controls
- Entry criteria: W6 foundation + AI risk package
- Exit criteria: AI can retrieve/explain/summarize; cannot execute regulated decisions
- Outputs: AI eval harness, intended-use, tool policy, red-team report
- Decision phrase: `W6_5_AI_ADVISORY_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W7 — Digital Thread / Genealogy / Release

- Goal: Connect lot/serial/inspection/NC/CAPA/MRB/release into release packet
- Entry criteria: W6.5 ready
- Exit criteria: Genealogy and release packet can prove make-to-release path
- Outputs: Release packet, genealogy graph, containment workflow
- Decision phrase: `W7_DIGITAL_THREAD_RELEASE_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W8 — Analytics / Improvement / Reliability

- Goal: CDC, lakehouse, OEE/SPC/cost and SRE telemetry mature
- Entry criteria: W7 ready
- Exit criteria: Quality/OEE/cost analytics from governed data contracts
- Outputs: Data products, OTel dashboards, DORA/SLO dashboards
- Decision phrase: `W8_ANALYTICS_RELIABILITY_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W9 — Security / Validation / Compliance Closure

- Goal: Complete validation and security packages for regulated scope
- Entry criteria: W8 ready
- Exit criteria: VMP/URS/RTM/IQ/OQ/PQ, ASVS/API/62443 evidence accepted
- Outputs: Validation package, security evidence, backup/restore rehearsal
- Decision phrase: `W9_COMPLIANCE_VALIDATION_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W10 — Vertical Packs

- Goal: Package pharma, med device, automotive, aerospace, industrial variants
- Entry criteria: W9 ready
- Exit criteria: Vertical roots and templates defined with onboarding packs
- Outputs: Pharma/med device/auto/aero pack docs and data contracts
- Decision phrase: `W10_VERTICAL_PACKS_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W11 — Customer Pilot / Pre-Production Readiness

- Goal: Prepare controlled pilot without calling it production
- Entry criteria: W10 ready
- Exit criteria: Pilot playbook, training, support, SRE, rollback and validation evidence ready
- Outputs: Pilot checklist, site readiness, support runbook
- Decision phrase: `W11_PRE_PRODUCTION_READINESS_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

### W12 — Release Candidate / Scale Operating Model

- Goal: Build multi-site productization and enterprise support operating model
- Entry criteria: W11 ready
- Exit criteria: Scale governance, tenant onboarding, operations, support, financial model stable
- Outputs: RC evidence book, commercial model, SRE/support model
- Decision phrase: `W12_PRODUCTIZED_OPERATING_MODEL_READY`
- Required checks: static guard, E2E, contract/evidence review, rollback, risk register update, report package.

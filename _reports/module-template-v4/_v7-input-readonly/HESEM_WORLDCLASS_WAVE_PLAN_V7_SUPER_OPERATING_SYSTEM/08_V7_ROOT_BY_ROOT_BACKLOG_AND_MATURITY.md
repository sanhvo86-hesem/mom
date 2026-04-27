# 08 — Root-by-Root Master Backlog and Maturity
## Summary matrix

| Code | Name | Domain | Class | Base maturity | Target wave | Purpose | Next gates |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QUO | Quotation | Commercial & Customer | authoritative root | 1 | W5 | convert customer demand into priced, approved commercial intent | pricing authority, customer terms, approval workflow, SO conversion evidence |
| CPO | Customer Purchase Order | Commercial & Customer | authoritative root | 1 | W5 | capture external customer commitment and reconcile to quotation/sales order | PO validation, customer reference uniqueness, exception workflow |
| SO | Sales Order | Commercial & Customer | authoritative root | 1 | W5 | authorized demand root driving planning, fulfillment and revenue evidence | order line authority, promise date, allocation, change history |
| PO | Purchase Order | Procurement & Supplier Quality | authoritative root | 1 | W5 | supplier demand commitment, receiving and supplier quality linkage | supplier authorization, item revision, receipt, change and close control |
| IREV | Item Revision | Product Engineering | authoritative root | 1 | W5 | authoritative revision/effectivity model for production and quality records | ECO linkage, effectivity, BOM/routing compatibility, release status |
| ECO | Engineering Change Order | Product Engineering | authoritative root | 1 | W5 | controlled change authority over item, BOM, routing, drawing and quality plans | impact analysis, approval, effective date, implementation verification |
| JO | Job Order | Shopfloor / MES Execution | authoritative root | 1 | W5 | production intent and WIP authorization for making product | SO/MRP linkage, item revision, routing, material availability, release approval |
| WO | Work Order | Shopfloor / MES Execution | authoritative root | 1 | W5 | operation-level work authorization and evidence capture | operator/equipment eligibility, instruction version, completion evidence |
| DISP | Dispatch Target / Dispatch Board | Planning & Scheduling | workspace projection + root | 3 | W0/W1 | supervisor projection for prioritized work; no hidden mutation authority | re-anchor links, no direct mutation, E2E, route WS attributes |
| PREC | Purchase Receipt | Inventory & Supplier Quality | authoritative root | 1 | W5 | receipt of supplier material with inspection and lot creation impact | PO match, supplier lot, incoming inspection trigger, inventory transaction |
| LOT | Lot | Traceability / Serialization | authoritative root | 1 | W7 | material/product lot genealogy, status and containment authority | lot status, genealogy edge, hold/release, split/merge audit |
| INSP | Inspection | Quality / eQMS | authoritative root | 1 | W3/W4 | inspection plan execution and measured quality evidence | sampling plan, measurement units, disposition, NC trigger |
| NQCASE | Nonconformance Case | Quality / eQMS | authoritative root | 4 | W0/W4 | contain, investigate, disposition and link quality escapes | read-only API stabilization, disposition command, CAPA link, e-sign boundary |
| CAPA | Corrective / Preventive Action | Quality / eQMS | authoritative root | 3 | W0/W3 | root-cause, action, verification and effectiveness control | cause taxonomy, action owner, verification evidence, effectiveness timer |
| BREL | Batch Release / Product Release | Traceability / Quality | authoritative root | 1 | W7 | release decision packet derived from genealogy, inspection, deviation and signoff evidence | release checklist, review by exception, e-sign, hold clearance |
| CDOC | Controlled Document | Quality / eQMS | authoritative root | 1 | W3 | controlled SOP/work instruction/document lifecycle | version/effective date, training impact, approval, archive, read acknowledgement |
| TRAIN | Training Record / Qualification | Workforce / Quality | workspace + authoritative record | 2 | W0/W3 | prove operator qualification and skill eligibility for work | training matrix, course/evidence, exam, expiration, dispatch eligibility |
| MWO | Maintenance Work Order | Maintenance / EHS | authoritative root | 1 | W3 | maintenance execution and asset readiness authority | asset, PM plan, downtime impact, completion evidence, return-to-service |
| ITEM | Item Master | Master Data | dependency root | 1 | W0.5/W5 | core material/product identity across ERP/MES/eQMS | unique identity, revision policy, UOM, classification, lifecycle |
| CUST | Customer Master | Master Data | dependency root | 1 | W0.5/W5 | customer identity, terms, site and compliance attributes | duplicate prevention, address/terms authority, sales linkage |
| SUP | Supplier Master | Master Data / Supplier Quality | dependency root | 1 | W0.5/W5 | supplier identity, qualification and risk status | qualification, approved item/scope, risk, SCAR history |
| EQP | Equipment / Asset | Maintenance / MES | dependency root | 1 | W0.5/W6 | machine/tool/asset identity for work eligibility and maintenance | status, calibration, PM, zone/conduit, eligibility |
| MDEV | Measurement Device | Quality / Metrology | dependency root | 1 | W0.5/W6 | measurement device authority for inspection evidence | calibration status, MSA, permitted measure types, traceability |
| TENANT | Tenant / Site | Core Platform | platform root | 1 | W0.5 | multi-site configuration and data boundary | tenant isolation, site hierarchy, feature flags, data partition |
| USER | User Identity | Identity / Access | platform root | 1 | W0.5 | human and service identity authority | authn, MFA policy, lifecycle, session |
| ROLE | Role / Permission | Identity / Access | platform root | 1 | W0.5 | role and action authorization authority | least privilege, segregation-of-duties, object authorization |
| POLICY | Policy Decision | Identity / Access | platform root | 1 | W0.5 | policy-as-code for route/API/command/evidence decisions | deny-by-default, explainability, audit |
| WFDEF | Workflow Definition | Workflow Spine | platform root | 1 | W1 | state machine definition for governed roots | states, transitions, guards, owners, version |
| WFEVT | Workflow Event | Workflow Spine | platform root | 1 | W1 | immutable workflow transition evidence | actor, from/to state, guard evidence, correlation id |
| EVID | Evidence Object | Evidence Spine | platform root | 1 | W1 | attached proof, observation, file, measurement or execution evidence | hash, source, retention, chain of custody |
| ESIGN | Electronic Signature | Evidence / e-Sign | platform root | 1 | W3/W9 | signature meaning and identity-bound approval evidence | meaning, signer, challenge, record snapshot, audit |
| AUDIT | Audit Trail Event | Evidence / Compliance | platform root | 1 | W1 | immutable trace of authoritative changes | before/after, actor, timestamp, reason, correlation |
| EVENT | Domain Event | Event / Notification | platform root | 1 | W1 | publishable fact derived from authority roots | schema, version, idempotency, replay |
| NOTIF | Notification | Event / Notification | platform root | 1 | W1 | human/system notification tied to domain event | recipient policy, template, escalation, audit |
| APICON | API Contract | Integration / Resilience | platform root | 1 | W1 | OpenAPI, schemas and compatibility authority | contract diff, examples, problem details |
| DATACON | Data Contract | Data Platform | platform root | 1 | W4/W8 | CDC/schema/data product contract | schema version, lineage, DQ checks, owner |
| OTGNODE | Operational Truth Graph Node | Digital Thread | platform root | 1 | W7 | semantic object in operational truth graph | node type, source authority, identity, validity |
| OTGEDGE | Operational Truth Graph Edge | Digital Thread | platform root | 1 | W7 | typed relationship/action/evidence link between roots | edge type, causality, timestamp, actor/source |
| WCENTER | Work Center | MES / Planning | authoritative root | 0 | W6 | capacity and equipment grouping for scheduling/execution | calendar, eligible equipment, labor skill, constraints |
| ROUTE | Routing | Product Engineering / MES | authoritative root | 0 | W6 | sequence of operations and standard times | revision/effectivity, work center, instruction linkage |
| OPER | Operation Execution | MES | authoritative root | 0 | W6 | step-level execution evidence and status | start/stop, operator, equipment, parameter capture, exceptions |
| TOOL | Tooling | MES / Maintenance | authoritative root | 0 | W6 | tool status, calibration, usage and eligibility | tool status, PM/calibration, assignment, lifecycle |
| CNC | Machine Program | MES / OT | authoritative root | 0 | W6 | controlled machine program/version reference | revision, checksum, machine eligibility, release approval |
| DOWNTIME | Downtime Event | MES / OEE | authoritative root | 0 | W6 | loss event for OEE, maintenance and continuous improvement | reason taxonomy, machine, start/end, approval |
| OEEVT | OEE Event | Analytics / MES | authoritative root | 0 | W8 | availability, performance and quality event stream | calculation contract, source mapping, traceability |
| SPC | SPC Study / Control Chart | Quality Engineering | authoritative root | 0 | W8 | statistical process control over measured characteristics | rational subgroup, control limits, reaction plan, alarm event |
| CAL | Calibration Event | Metrology | authoritative root | 0 | W6 | calibration history and device eligibility | standard traceability, interval, result, due status |
| MSA | Measurement System Analysis | Metrology / Quality | authoritative root | 0 | W8 | prove measurement system fitness | gage R&R, bias/linearity/stability, acceptance |
| FMEA | FMEA | Quality Engineering | authoritative root | 0 | W10 | risk analysis linked to control plan and process change | severity/occurrence/detection, action linkage, review |
| CTRLPLAN | Control Plan | Quality Engineering | authoritative root | 0 | W10 | inspection/control requirements derived from risk and design | characteristics, frequency, method, reaction plan |
| SCAR | Supplier Corrective Action | Supplier Quality | authoritative root | 0 | W10 | supplier quality escape correction and effectiveness | supplier scope, containment, corrective action, verification |
| MRB | Material Review Board | Quality / Inventory | authoritative root | 0 | W7 | cross-functional disposition of nonconforming material | quarantine, disposition, approvers, inventory transaction |
| AUDPLAN | Audit Plan | eQMS | authoritative root | 0 | W9 | internal/supplier/customer audit schedule and scope | risk-based schedule, checklist, finding linkage |
| FINDING | Audit Finding | eQMS | authoritative root | 0 | W9 | audit observation, severity and corrective path | classification, due date, CAPA/SCAR linkage |
| RISK | Operational Risk | eQMS / AI / Security | authoritative root | 0 | W9 | formal risk object across product/process/system/AI/security | risk owner, score, control, residual risk, review |
| COMPLAINT | Customer Complaint | Quality / Customer | authoritative root | 0 | W10 | post-market or customer quality issue root | intake, investigation, regulatory assessment, CAPA link |
| INVTXN | Inventory Transaction | Inventory / Warehouse | authoritative root | 0 | W5 | stock movement ledger and quantity/status authority | lot/status, source doc, posting rules, reconciliation |
| SHIP | Shipment | Fulfillment | authoritative root | 0 | W5 | shipping execution and customer delivery evidence | release status, pick/pack, carrier, export/serialization |
| INVOICE | Invoice | Finance / Commercial | authoritative root | 0 | W5 | commercial billing evidence linked to shipment/order | SO/ship match, tax, approval, GL posting |
| COST | Cost / Variance | Finance / Cost | authoritative root | 0 | W8 | standard/actual/WIP cost and variance analysis | cost rollup, transaction inputs, approval, finance reconciliation |
| MREC | Master Record / Master Batch Record | Pharma Vertical | vertical root | 0 | W10 | regulated master production/batch record template | recipe, instructions, checks, approvals, effective date |
| CREC | Completed Record / eBR-eDHR | Pharma / Med Device Vertical | vertical root | 0 | W10 | executed manufacturing record for release review | step evidence, exception review, signature, release packet |
| EBR | Electronic Batch Record | Pharma Vertical | vertical root | 0 | W10 | batch execution record governed by GMP controls | recipe execution, deviations, calculations, review-by-exception |
| EDHR | Electronic Device History Record | Medical Device Vertical | vertical root | 0 | W10 | device history evidence from build to release | serial/lot genealogy, inspections, signatures, DMR linkage |
| SERIAL | Serial Number | Traceability / Aerospace / Med Device | vertical root | 0 | W10 | unit-level identity and genealogy | serialization policy, unique identity, configuration, service history |
| APQP | APQP Program | Automotive Vertical | vertical root | 0 | W10 | advanced product quality planning program evidence | phased gates, FMEA/control plan/PPAP linkage |
| PPAP | PPAP Package | Automotive Vertical | vertical root | 0 | W10 | production part approval package | submission level, dimensional, material, capability evidence |
| FAI | First Article Inspection | Aerospace Vertical | vertical root | 0 | W10 | first article verification package | ballooned drawing, characteristic results, approvals |
| CONC | Concession / Deviation Permit | Aerospace / Quality | vertical root | 0 | W10 | authorized use-as-is/deviation from requirement | customer/regulatory approval, expiration, affected lots |
| EXPORT | Export Control Record | Compliance / Aerospace | vertical root | 0 | W10 | export-controlled item/user/shipment compliance evidence | jurisdiction/classification, denied party, license, audit |

## Root execution pattern

Mỗi root section bên dưới có cùng cấu trúc để Codex/Claude/GPT không “sáng tạo” lung tung: authority, workspace/record posture, required contracts, API/event/evidence, tests, rollback, stop rules.

### QUO — Quotation

- Domain: Commercial & Customer

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: convert customer demand into priced, approved commercial intent

- Next gates: pricing authority, customer terms, approval workflow, SO conversion evidence

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CPO — Customer Purchase Order

- Domain: Commercial & Customer

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: capture external customer commitment and reconcile to quotation/sales order

- Next gates: PO validation, customer reference uniqueness, exception workflow

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SO — Sales Order

- Domain: Commercial & Customer

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: authorized demand root driving planning, fulfillment and revenue evidence

- Next gates: order line authority, promise date, allocation, change history

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### PO — Purchase Order

- Domain: Procurement & Supplier Quality

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: supplier demand commitment, receiving and supplier quality linkage

- Next gates: supplier authorization, item revision, receipt, change and close control

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### IREV — Item Revision

- Domain: Product Engineering

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: authoritative revision/effectivity model for production and quality records

- Next gates: ECO linkage, effectivity, BOM/routing compatibility, release status

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### ECO — Engineering Change Order

- Domain: Product Engineering

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: controlled change authority over item, BOM, routing, drawing and quality plans

- Next gates: impact analysis, approval, effective date, implementation verification

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### JO — Job Order

- Domain: Shopfloor / MES Execution

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: production intent and WIP authorization for making product

- Next gates: SO/MRP linkage, item revision, routing, material availability, release approval

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### WO — Work Order

- Domain: Shopfloor / MES Execution

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: operation-level work authorization and evidence capture

- Next gates: operator/equipment eligibility, instruction version, completion evidence

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### DISP — Dispatch Target / Dispatch Board

- Domain: Planning & Scheduling

- Authority class: workspace projection + root

- Current maturity baseline: 3

- Target wave: W0/W1

- Purpose: supervisor projection for prioritized work; no hidden mutation authority

- Next gates: re-anchor links, no direct mutation, E2E, route WS attributes

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### PREC — Purchase Receipt

- Domain: Inventory & Supplier Quality

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W5

- Purpose: receipt of supplier material with inspection and lot creation impact

- Next gates: PO match, supplier lot, incoming inspection trigger, inventory transaction

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### LOT — Lot

- Domain: Traceability / Serialization

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W7

- Purpose: material/product lot genealogy, status and containment authority

- Next gates: lot status, genealogy edge, hold/release, split/merge audit

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### INSP — Inspection

- Domain: Quality / eQMS

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W3/W4

- Purpose: inspection plan execution and measured quality evidence

- Next gates: sampling plan, measurement units, disposition, NC trigger

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### NQCASE — Nonconformance Case

- Domain: Quality / eQMS

- Authority class: authoritative root

- Current maturity baseline: 4

- Target wave: W0/W4

- Purpose: contain, investigate, disposition and link quality escapes

- Next gates: read-only API stabilization, disposition command, CAPA link, e-sign boundary

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CAPA — Corrective / Preventive Action

- Domain: Quality / eQMS

- Authority class: authoritative root

- Current maturity baseline: 3

- Target wave: W0/W3

- Purpose: root-cause, action, verification and effectiveness control

- Next gates: cause taxonomy, action owner, verification evidence, effectiveness timer

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### BREL — Batch Release / Product Release

- Domain: Traceability / Quality

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W7

- Purpose: release decision packet derived from genealogy, inspection, deviation and signoff evidence

- Next gates: release checklist, review by exception, e-sign, hold clearance

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CDOC — Controlled Document

- Domain: Quality / eQMS

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W3

- Purpose: controlled SOP/work instruction/document lifecycle

- Next gates: version/effective date, training impact, approval, archive, read acknowledgement

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### TRAIN — Training Record / Qualification

- Domain: Workforce / Quality

- Authority class: workspace + authoritative record

- Current maturity baseline: 2

- Target wave: W0/W3

- Purpose: prove operator qualification and skill eligibility for work

- Next gates: training matrix, course/evidence, exam, expiration, dispatch eligibility

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### MWO — Maintenance Work Order

- Domain: Maintenance / EHS

- Authority class: authoritative root

- Current maturity baseline: 1

- Target wave: W3

- Purpose: maintenance execution and asset readiness authority

- Next gates: asset, PM plan, downtime impact, completion evidence, return-to-service

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### ITEM — Item Master

- Domain: Master Data

- Authority class: dependency root

- Current maturity baseline: 1

- Target wave: W0.5/W5

- Purpose: core material/product identity across ERP/MES/eQMS

- Next gates: unique identity, revision policy, UOM, classification, lifecycle

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CUST — Customer Master

- Domain: Master Data

- Authority class: dependency root

- Current maturity baseline: 1

- Target wave: W0.5/W5

- Purpose: customer identity, terms, site and compliance attributes

- Next gates: duplicate prevention, address/terms authority, sales linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SUP — Supplier Master

- Domain: Master Data / Supplier Quality

- Authority class: dependency root

- Current maturity baseline: 1

- Target wave: W0.5/W5

- Purpose: supplier identity, qualification and risk status

- Next gates: qualification, approved item/scope, risk, SCAR history

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EQP — Equipment / Asset

- Domain: Maintenance / MES

- Authority class: dependency root

- Current maturity baseline: 1

- Target wave: W0.5/W6

- Purpose: machine/tool/asset identity for work eligibility and maintenance

- Next gates: status, calibration, PM, zone/conduit, eligibility

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### MDEV — Measurement Device

- Domain: Quality / Metrology

- Authority class: dependency root

- Current maturity baseline: 1

- Target wave: W0.5/W6

- Purpose: measurement device authority for inspection evidence

- Next gates: calibration status, MSA, permitted measure types, traceability

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### TENANT — Tenant / Site

- Domain: Core Platform

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W0.5

- Purpose: multi-site configuration and data boundary

- Next gates: tenant isolation, site hierarchy, feature flags, data partition

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### USER — User Identity

- Domain: Identity / Access

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W0.5

- Purpose: human and service identity authority

- Next gates: authn, MFA policy, lifecycle, session

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### ROLE — Role / Permission

- Domain: Identity / Access

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W0.5

- Purpose: role and action authorization authority

- Next gates: least privilege, segregation-of-duties, object authorization

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### POLICY — Policy Decision

- Domain: Identity / Access

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W0.5

- Purpose: policy-as-code for route/API/command/evidence decisions

- Next gates: deny-by-default, explainability, audit

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### WFDEF — Workflow Definition

- Domain: Workflow Spine

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: state machine definition for governed roots

- Next gates: states, transitions, guards, owners, version

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### WFEVT — Workflow Event

- Domain: Workflow Spine

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: immutable workflow transition evidence

- Next gates: actor, from/to state, guard evidence, correlation id

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EVID — Evidence Object

- Domain: Evidence Spine

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: attached proof, observation, file, measurement or execution evidence

- Next gates: hash, source, retention, chain of custody

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### ESIGN — Electronic Signature

- Domain: Evidence / e-Sign

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W3/W9

- Purpose: signature meaning and identity-bound approval evidence

- Next gates: meaning, signer, challenge, record snapshot, audit

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### AUDIT — Audit Trail Event

- Domain: Evidence / Compliance

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: immutable trace of authoritative changes

- Next gates: before/after, actor, timestamp, reason, correlation

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EVENT — Domain Event

- Domain: Event / Notification

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: publishable fact derived from authority roots

- Next gates: schema, version, idempotency, replay

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### NOTIF — Notification

- Domain: Event / Notification

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: human/system notification tied to domain event

- Next gates: recipient policy, template, escalation, audit

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### APICON — API Contract

- Domain: Integration / Resilience

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W1

- Purpose: OpenAPI, schemas and compatibility authority

- Next gates: contract diff, examples, problem details

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### DATACON — Data Contract

- Domain: Data Platform

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W4/W8

- Purpose: CDC/schema/data product contract

- Next gates: schema version, lineage, DQ checks, owner

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### OTGNODE — Operational Truth Graph Node

- Domain: Digital Thread

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W7

- Purpose: semantic object in operational truth graph

- Next gates: node type, source authority, identity, validity

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### OTGEDGE — Operational Truth Graph Edge

- Domain: Digital Thread

- Authority class: platform root

- Current maturity baseline: 1

- Target wave: W7

- Purpose: typed relationship/action/evidence link between roots

- Next gates: edge type, causality, timestamp, actor/source

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### WCENTER — Work Center

- Domain: MES / Planning

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: capacity and equipment grouping for scheduling/execution

- Next gates: calendar, eligible equipment, labor skill, constraints

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### ROUTE — Routing

- Domain: Product Engineering / MES

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: sequence of operations and standard times

- Next gates: revision/effectivity, work center, instruction linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### OPER — Operation Execution

- Domain: MES

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: step-level execution evidence and status

- Next gates: start/stop, operator, equipment, parameter capture, exceptions

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### TOOL — Tooling

- Domain: MES / Maintenance

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: tool status, calibration, usage and eligibility

- Next gates: tool status, PM/calibration, assignment, lifecycle

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CNC — Machine Program

- Domain: MES / OT

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: controlled machine program/version reference

- Next gates: revision, checksum, machine eligibility, release approval

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### DOWNTIME — Downtime Event

- Domain: MES / OEE

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: loss event for OEE, maintenance and continuous improvement

- Next gates: reason taxonomy, machine, start/end, approval

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### OEEVT — OEE Event

- Domain: Analytics / MES

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W8

- Purpose: availability, performance and quality event stream

- Next gates: calculation contract, source mapping, traceability

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SPC — SPC Study / Control Chart

- Domain: Quality Engineering

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W8

- Purpose: statistical process control over measured characteristics

- Next gates: rational subgroup, control limits, reaction plan, alarm event

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CAL — Calibration Event

- Domain: Metrology

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W6

- Purpose: calibration history and device eligibility

- Next gates: standard traceability, interval, result, due status

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### MSA — Measurement System Analysis

- Domain: Metrology / Quality

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W8

- Purpose: prove measurement system fitness

- Next gates: gage R&R, bias/linearity/stability, acceptance

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### FMEA — FMEA

- Domain: Quality Engineering

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: risk analysis linked to control plan and process change

- Next gates: severity/occurrence/detection, action linkage, review

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CTRLPLAN — Control Plan

- Domain: Quality Engineering

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: inspection/control requirements derived from risk and design

- Next gates: characteristics, frequency, method, reaction plan

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SCAR — Supplier Corrective Action

- Domain: Supplier Quality

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: supplier quality escape correction and effectiveness

- Next gates: supplier scope, containment, corrective action, verification

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### MRB — Material Review Board

- Domain: Quality / Inventory

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W7

- Purpose: cross-functional disposition of nonconforming material

- Next gates: quarantine, disposition, approvers, inventory transaction

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### AUDPLAN — Audit Plan

- Domain: eQMS

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W9

- Purpose: internal/supplier/customer audit schedule and scope

- Next gates: risk-based schedule, checklist, finding linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### FINDING — Audit Finding

- Domain: eQMS

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W9

- Purpose: audit observation, severity and corrective path

- Next gates: classification, due date, CAPA/SCAR linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### RISK — Operational Risk

- Domain: eQMS / AI / Security

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W9

- Purpose: formal risk object across product/process/system/AI/security

- Next gates: risk owner, score, control, residual risk, review

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### COMPLAINT — Customer Complaint

- Domain: Quality / Customer

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: post-market or customer quality issue root

- Next gates: intake, investigation, regulatory assessment, CAPA link

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### INVTXN — Inventory Transaction

- Domain: Inventory / Warehouse

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W5

- Purpose: stock movement ledger and quantity/status authority

- Next gates: lot/status, source doc, posting rules, reconciliation

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SHIP — Shipment

- Domain: Fulfillment

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W5

- Purpose: shipping execution and customer delivery evidence

- Next gates: release status, pick/pack, carrier, export/serialization

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### INVOICE — Invoice

- Domain: Finance / Commercial

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W5

- Purpose: commercial billing evidence linked to shipment/order

- Next gates: SO/ship match, tax, approval, GL posting

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### COST — Cost / Variance

- Domain: Finance / Cost

- Authority class: authoritative root

- Current maturity baseline: 0

- Target wave: W8

- Purpose: standard/actual/WIP cost and variance analysis

- Next gates: cost rollup, transaction inputs, approval, finance reconciliation

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### MREC — Master Record / Master Batch Record

- Domain: Pharma Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: regulated master production/batch record template

- Next gates: recipe, instructions, checks, approvals, effective date

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CREC — Completed Record / eBR-eDHR

- Domain: Pharma / Med Device Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: executed manufacturing record for release review

- Next gates: step evidence, exception review, signature, release packet

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EBR — Electronic Batch Record

- Domain: Pharma Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: batch execution record governed by GMP controls

- Next gates: recipe execution, deviations, calculations, review-by-exception

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EDHR — Electronic Device History Record

- Domain: Medical Device Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: device history evidence from build to release

- Next gates: serial/lot genealogy, inspections, signatures, DMR linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### SERIAL — Serial Number

- Domain: Traceability / Aerospace / Med Device

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: unit-level identity and genealogy

- Next gates: serialization policy, unique identity, configuration, service history

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### APQP — APQP Program

- Domain: Automotive Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: advanced product quality planning program evidence

- Next gates: phased gates, FMEA/control plan/PPAP linkage

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### PPAP — PPAP Package

- Domain: Automotive Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: production part approval package

- Next gates: submission level, dimensional, material, capability evidence

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### FAI — First Article Inspection

- Domain: Aerospace Vertical

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: first article verification package

- Next gates: ballooned drawing, characteristic results, approvals

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### CONC — Concession / Deviation Permit

- Domain: Aerospace / Quality

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: authorized use-as-is/deviation from requirement

- Next gates: customer/regulatory approval, expiration, affected lots

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

### EXPORT — Export Control Record

- Domain: Compliance / Aerospace

- Authority class: vertical root

- Current maturity baseline: 0

- Target wave: W10

- Purpose: export-controlled item/user/shipment compliance evidence

- Next gates: jurisdiction/classification, denied party, license, audit

- Required artifacts:

  - Root scope contract.
  - Route/screen contract; WS/AR authority attributes.
  - API contract or explicit “fixture only” note.
  - Workflow state/transition contract if mutation exists.
  - Evidence/audit/e-sign requirements if governed or regulated.
  - Fixture coverage report and E2E report.
  - Rollback procedure and stop rule.

- Required tests:

  - Static syntax/JSON parse/contract schema.
  - Forbidden diff/current portal safety.
  - Route grammar and authority attribute assertions.
  - Negative authorization and invalid command tests when API/mutation exists.
  - Evidence/audit trail assertions when state can change.

- Stop rule: block next wave if this root is introduced without named authority owner, rollback path, and evidence output.

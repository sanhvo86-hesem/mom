# Order Management World Benchmark 2026-03-31

## Objective

Redesign HESEM order management from a simple SO > JO > WO browser into a governed operating workspace that aligns commercial promise, engineering release, shop-floor launch, quality evidence, and shipment readiness.

## Official reference directions

- ISA-95 and Level 3/4 separation remain the backbone for manufacturing order orchestration.
- SAP S/4HANA advanced ATP / Intelligent Order Promising: governed promise dates and fulfillment commitments.
- Oracle Fusion Supply Orchestration and Manufacturing: cross-domain order orchestration, outside processing, and exception handling.
- Microsoft Dynamics 365 Supply Chain Management: production floor execution, tracked components, material visibility, quality test capture.
- Siemens Opcenter: lot traceability, eDHR/eBR, where-used genealogy, APS for resource allocation and due-date negotiation.
- ETQ Reliance eQMS: document control, CAPA, training, audit trail, release/change management integrated with operations.
- Epicor Kinetic / Connected Process Control: mid-market manufacturing execution + ERP convergence for job shops.

## Current world-class patterns

### 1. Promise is managed, not assumed

Modern ERP-led order management does not stop at `due_date`.
It manages:

- requested date
- promise date
- internal commit date
- shipping release date
- escalation when promise drifts

This is why HESEM now needs separate `requested_date`, `promise_date`, `commit_date`, and fulfillment/document status instead of one due date only.

### 2. Order readiness is multi-gate

Leading MES and digital manufacturing platforms launch only when required gates are satisfied:

- engineering release
- routing/BOM/control plan/traveler ready
- material trace ready
- NC release/download valid
- tooling ready
- operator qualified
- alarm/connectivity safe
- evidence/first piece/quality gate passed

This is why the redesigned module calculates `gate_cards`, `readiness_score`, `blocked`, and `exception_cards` per WO/JO/SO.

### 3. eQMS is part of execution, not a side system

In world-class deployments, order execution depends on:

- controlled documents
- training/qualification
- CAPA / nonconformance feedback
- governed audit trails
- required shipping certificates and release packs

This is why the new HESEM model includes `document_requirements`, `contract_review_status`, `quality_plan_status`, `source_inspection_status`, and richer linked evidence behavior.

### 4. Scheduling is exception-first

APS and modern operational cockpits prioritize:

- order prioritization
- due-date negotiation
- bottleneck visibility
- blocked work
- recovery actions

This is why the frontend redesign centers around health bands, top exceptions, and operational phase counts instead of a passive tree only.

### 5. Outside processing and fulfillment are first-class

Advanced ERP/MES stacks govern:

- special process / subcontract status
- certificate return status
- shipment release
- pack list / COC / COA / export docs

This is why the new schema adds `outside_processing_orders`, `shipment_releases`, and order document requirements.

## HESEM target operating model

### Commercial-to-Commit

- customer + site + commercial account
- contract review
- requested / promise / internal commit
- incoterm / ship method / payment term
- holds and escalation

### Engineering-to-Release

- revision
- routing
- BOM
- control plan
- inspection plan
- traveler template
- launch readiness

### Plan-to-Produce

- dispatch priority
- WO launch gates
- operator/tool/program/material/connectivity governance
- milestone tracking

### Quality-to-Release

- first piece / FAI
- source inspection
- evidence gates
- document pack
- CAPA/linked records

### Ship-to-Cash

- shipment release
- shipping documents
- final fulfillment status
- promise performance / OTD

## Implementation implications for this repo

1. Keep JSON runtime usable now.
2. Enrich `api.php` read models so the UI can operate on readiness, risk, and fulfillment.
3. Expand master data with commercial and engineering catalogs.
4. Add PostgreSQL migration foundations so the runtime can move cleanly to database-backed execution later.
5. Make the frontend an operational cockpit, not only a tree browser.

## Official source links reviewed

- SAP S/4HANA advanced ATP / order promising:
  https://www.sap.com/central-asia-caucasus/products/scm/aatp.html
- SAP Help Portal aATP:
  https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/7b24a64d9d0941bda1afa753263d9e39/734b42ad03ae48579d441caef452684a.html
- Oracle Supply Chain Orchestration overview:
  https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/fauco/overview-of-supply-orchestration.html
- Oracle Supply Chain Orchestration product context:
  https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faips/sco-about-oracle-fusion-cloud-supply-chain-orchestration.html
- Microsoft production floor execution:
  https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/production-floor-execution-configure
- Microsoft approved customer lists:
  https://learn.microsoft.com/en-us/dynamics365/supply-chain/sales-marketing/approved-customer-lists
- Microsoft customer-specific COA:
  https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quality-customer-specific-coa
- Siemens lot traceability:
  https://www.sw.siemens.com/en-US/technology/lot-traceability/
- ETQ document control:
  https://www.etq.com/document-control/
- ETQ platform / eQMS:
  https://www.etq.com/platform/
- Epicor Connected Process Control:
  https://www.epicor.com/en-us/products/connected-worker/epicor-connected-process-control/
- NIST SP 800-82 Rev. 3:
  https://csrc.nist.gov/pubs/sp/800/82/r3/final
- ISA-95 preview reference:
  https://www.isa.org/getmedia/bbc0eb3e-d047-440d-88fc-642b14bd8d40/ISA-95-00-05-2018-preview.pdf

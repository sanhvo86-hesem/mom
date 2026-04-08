# Job-Order CNC Department Boundary Model

> Purpose: reference document to research and finalize department/system boundaries before editing handbooks, SOPs, ANNEX or JD.

## 1. How to use this document

This document is not an SOP. It is a reference model for writers to:
- understand the common departmental structure of the `job-order CNC` model;
- Compare with current HESEM;
- detect coverage gap;
- Avoid mechanical updates when normalizing `department code`.

## 2. International reference sources used

The resources below are not “mandatory laws” for HESEM. They are used to infer common operating models and typical functional boundaries of job shop / job-order manufacturing:

- ProShop ERP — [Sales & Work Orders](https://proshoperp.com/product/sales-work-order-process/)
- ProShop ERP — [Modules / Estimating & Quoting / Quality Systems Management & Inspection](https://proshoperp.com/proshop-modules/)
- ERPNext — [Work Order](https://docs.frappe.io/erpnext/user/manual/en/work-order)
- ERPNext — [Job Card](https://docs.frappe.io/erpnext/user/manual/en/job-card)
- ERPNext — [Routing](https://docs.frappe.io/erpnext/user/manual/en/routing)
- ERPNext — [Quality Inspection](https://docs.frappe.io/erpnext/user/manual/en/quality-inspection)
- MRPeasy — [Manufacturing Orders](https://www.mrpeasy.com/resources/user-manual/production-planning/manufacturing-orders/)
- MRPeasy — [Routing](https://www.mrpeasy.com/resources/user-manual/production-planning/routings/)
- MRPeasy — [Overlap and Special Sequences of Manufacturing Operations](https://www.mrpeasy.com/resources/user-manual/settings/system/professional-functions/overlap-and-sequence-of-manufacturing-operations/)
- APQC — [Applying the PCF for Business Value](https://www.apqc.org/sites/default/files/files/PCF%20Collateral/Applying%20the%20PCF%20for%20Business%20Value%20-%20FINAL.pdf)
- APQC — [Manage Financial Resources](https://www.apqc.org/sites/default/files/K04087_8.0_Manage_Financial_Resources.pdf)
- APQC — [HCM Organization Measure List](https://www.apqc.org/sites/default/files/osb/297%20-%20HCM%20Organization%20Measure%20List.pdf)
- APQC — [Information Technology Measurement List](https://www.apqc.org/sites/default/files/osb/299%20-%20Information%20Technology%20Measure%20List.pdf)

## 3. Comments drawn from benchmarks

### 3.1 Common boundaries

The international CNC job-order model almost always clearly separates:
- Sales / Customer Service / Estimating
- Engineering / Routing / Programming / Release
- Production Planning and Control
- Shopfloor Execution
- Quality / Inspection / Metrology / NCR-CAPA
- Supply Chain / Purchasing / Receiving / Warehouse / Shipping
- Finance / Costing / Invoicing / AR-AP
- HR / Competence / Onboarding-Offboarding
- IT / Digital Platform / Access / Backup
- ERP or Business System Administration when the system is large enough to be separated from the IT infrastructure

### 3.2 Outstanding consistency points

- `Work Order` and `Routing` always separate planning/engineering from execution.
- `Job Card` or stage orders always focus on the field line instead of putting it all under one "general management".
- `Quality Inspection` is always a class independent of production execution.
- Purchasing / receiving / stock / shipping are different handoff points and should not be grouped into a general "warehouse".
- ERP/business system administration is usually not allowed to own business logic; They configure and protect transaction integrity, while the process owner keeps the business decisions.

### 3.3 Inference applied to HESEM

From the above sources, the suitable model for HESEM is:
- department layer: `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`
- subfunction layer: `D-PPC`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`

This is an operational inference from benchmarks and internal documents, not a verbatim quote from any source.

### 3.4 Meaning of boundaries according to each department

- `D-SCS`: maintain customer communication, RFQ clarity, quote assumptions, contract review and external change log. Do not cover technical decisions, quality, material lead time or financial approval with commercial language.
- `D-ENG`: holds technical considerations, routing, process design, CAM/program release and baseline engineering package. Do not replace production dispatch, quality release or commercial commitments.
- `D-PROD`: keep execution on site, readiness, dispatch, work transfer, recovery and real resource use at the factory. Do not change engineering release or quality disposition.
- `D-QUAL`: keep inspection independence, metrology discipline, product release, NCR/CAPA, audit-system mechanics and quality evidence. Don't absorb the execution of production just for the sake of "convenience".
- `D-SCM`: keep sourcing, receiving, warehouse integrity, tool crib, shipping handoff and materials/logistics traceability. Do not replace QA in quality disposition or Engineering in process selection.
- `D-FIN`: holds invoicing, AR/AP, closing, costing and financial control. In the job-order model, cost accounting is a real job class, not a decorative report; If you do not have your own JD, the handbook must clearly state who is holding it temporarily.
- `D-HR`: keep manpower coordination, onboarding/offboarding, training administration, matrix skills and labor records. Sign-off technical capacity must always return to the decision role of the receiving function.
- `D-EHS`: holds hazard system, permit discipline, incident learning and emergency readiness. Stop-work can occur at the source, but plant-wide shutdown/restart is still subject to published authority.
- `D-IT`: holds endpoint, network, identity, backup, platform support and recovery at the infrastructure layer. Do not own business data content or ERP transaction logic.

### 3.5 Meaning of locked subfunctions

- `D-PPC`: used when you need to look at planning, sequencing, dispatch and WIP control separately instead of grouping them into a general D-PROD.
- `D-PUR`: used for sourcing, PO, supplier follow-up and material availability in the purchasing layer.
- `D-WHS`: used for receiving, put-away, location control, lot integrity and inventory accuracy.
- `D-TCR`: used for tool issue/return, preset, tool life evidence and cutting tool traceability.
- `D-LOG`: used for booking, packing interface, shipment documents and carrier handoff.
- `D-ERP`: used for application logic, role model, workflow, report logic, master-data guardrail and transaction integrity; not a synonym of IT.

## 4. Heuristics to correctly classify entities

### 4.1 The sign is Department/Subfunction

- stable repeat responsibilities across multiple SOPs/WIs;
- not a personal signing decision;
- have clear input/output and handoff;
- often called in executive meetings, dashboards, interface tables;
- If the JD holder is replaced, the functional scope remains intact.

### 4.2 Signs that it is JD role

- has the right to sign or release;
- may be held personally liable;
- clear owner KPI or owner action plan;
- Deputy/back-up must be assigned to an individual/role, not the entire department.

### 4.3 The sign is a gap

- the work is real but all current documents avoid it with vague phrases;
- An important decision is being "underground" handled by someone but there is no JD or handbook clearly recorded;
- Many SOPs refer to the same group of tasks but each document calls for a different type;
- In actual reviews, users cannot answer "who has the final decision".

### 4.4 How to distinguish departmental gap from JD gap

- If the job is a repetitive function at a functional level, has clear inputs/outputs, and persists despite substitutions, consider this as `Department gap` or `Subfunction gap`.
- If the issue is with signing authority, exception approval, technical sign-off, hold/release, or the individual with ultimate responsibility, consider this `JD gap` in preference.
- If the international benchmark has a separate role but HESEM is not sufficiently loaded to separate, the handbook must clearly state who is holding the temporary and which trigger will force the opening of the separate JD.
- If the international benchmark has a separate group of tasks but HESEM only has one person working, do not automatically create `D-code`; Only create when the group of tasks has stabilized into a repeating class of functions.

## 5. Rules to update documents from reference model

- Read the current document first, do not use the reference model to blindly overwrite.
- If the benchmark suggests a new boundary but there is no internal JD/handbook support, the gap must be noted.
- If an internal role has an actual role that is smaller than the benchmark, the handbook must clearly state how to retain temporary authority instead of fabricating the role.
- Only use benchmarks to lock in boundary logic; Do not copy KPI or description text intact.

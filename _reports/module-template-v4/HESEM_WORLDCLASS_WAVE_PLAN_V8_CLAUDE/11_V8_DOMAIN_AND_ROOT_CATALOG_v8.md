# 11 — V8 Domain and Root Catalog

```text
purpose:        Carry forward V7's 75 roots + extend with V8 vertical-pack additions = ~95 roots
predecessor:    V7 §08 + data/root_backlog.json (75 roots, prose gates)
v8_advance:     Each root has full Authority Ledger entry + cross-root deps + per-wave maturity + work package
work_package:   WP-V8-ROOTS (10 work packages, one per domain)
owner:          Domain Architect per domain
estimate:       ~10 engineering-weeks (root scope contracts, not implementations)
```

---

## 1. Domains (14, V7 carry-forward)

```text
D-01  Commercial & Customer            QUO, CPO, SO, SHIPMENT, INVOICE, COMPLAINT
D-02  Product / Engineering            ITEM, IREV, BOM, ROUTE, ECO, CAD_LINK, FMEA
D-03  Planning & Production            MPS, MRP, CAPACITY, SCHEDULE, DISPATCH, KIT
D-04  Procurement & Supplier Quality   PO, SUP, RECEIPT, IQC, SUP_QUAL, SCAR, PPAP
D-05  Inventory & Logistics            INVTXN, LOT, SERIAL, WIP, WAREHOUSE_TASK, CYCLE_COUNT, RESERVATION, QUARANTINE
D-06  Shopfloor / MES Execution        JO, WO, OPER, INSTRUCTION, EBR, EDHR, OEE_EVENT, ANDON, SPC
D-07  Quality Improvement (eQMS)       INSP, NQCASE, CAPA, CDOC, AUDIT_FINDING, MRB, RISK
D-08  Traceability & Serialization     LOT_GENEALOGY, BREL, RECALL, RELEASE_PACKET
D-09  Maintenance & EHS                EQP, MWO, PMSCH, CAL, MSA, EHS_INCIDENT, LOTO
D-10  Workforce & Training             USER, ROLE, TRAIN_COURSE, TRAIN_RECORD, COMP_MATRIX, SHIFT, LABOR
D-11  Finance                          STD_COST, ACT_COST, WIP_COST, VARIANCE, INV_VAL, GL
D-12  Integration                      API_GATEWAY, EVENT_BUS, IDEMPOTENCY, LIVE_API_TOGGLE, CDC, PARTNER_INTEGRATION
D-13  Analytics & AI                   OEE_ANL, QUALITY_ANL, THROUGHPUT, PRED_MAINT, AI_FEATURE, DATA_PRODUCT
D-14  Core Platform                    IAM, WORKFLOW_ENGINE, EVIDENCE, AUDIT, NOTIFY, GRAPHICS_AUTH, DESIGN_SYS, SRE, OBSERVABILITY
```

---

## 2. Root catalog table (95 roots)

Sample rows (full table in `data/root_backlog_v8.json`):

```csv
code,name,domain,authority_class,base_band,baseline_maturity,target_maturity,target_wave,gxp_eligible,vertical_only,owner_role
QUO,Quotation,D-01,authoritative,L1,1,5,W5,false,false,Commercial Lead
CPO,Customer Purchase Order,D-01,authoritative,L1,1,5,W5,false,false,Commercial Lead
SO,Sales Order,D-01,authoritative,L1,1,5,W5,false,false,Commercial Lead
SHIPMENT,Shipment,D-01,authoritative,L1,1,5,W5,false,false,Logistics Lead
INVOICE,Invoice,D-01,authoritative,L1,1,5,W5,false,false,Finance Lead
COMPLAINT,Customer Complaint,D-01,authoritative,L1,1,5,W7,true,false,Quality Lead
ITEM,Item Master,D-02,dependency,L2,1,5,W0.5,true,false,Product Lead
IREV,Item Revision,D-02,authoritative,L2,1,5,W1,true,false,Engineering Lead
BOM,Bill of Materials,D-02,authoritative,L2,1,5,W2,true,false,Engineering Lead
ROUTE,Routing,D-02,authoritative,L2,1,5,W2,true,false,Engineering Lead
ECO,Engineering Change Order,D-02,authoritative,L2,1,5,W3,true,false,Engineering Lead
CAD_LINK,CAD Drawing Link,D-02,dependency,L1,0,3,W3,false,false,Engineering Lead
FMEA,Failure Mode Effects Analysis,D-02,authoritative,L2,1,5,W6,true,false,Quality Engineer
MPS,Master Production Schedule,D-03,authoritative,L1,1,5,W5,false,false,Planning Lead
MRP,Material Requirements Planning,D-03,authoritative,L1,1,5,W5,false,false,Planning Lead
CAPACITY,Capacity Plan,D-03,authoritative,L1,1,4,W5,false,false,Planning Lead
SCHEDULE,Finite Schedule,D-03,authoritative,L1,1,5,W6,false,false,Planning Lead
DISPATCH,Dispatch List,D-03,projection,L2,3,4,W1,false,false,Production Lead
KIT,Kit,D-03,authoritative,L1,1,4,W6,false,false,Logistics Lead
PO,Purchase Order,D-04,authoritative,L1,1,5,W5,false,false,Procurement Lead
SUP,Supplier Master,D-04,dependency,L2,1,5,W1,true,false,Procurement Lead
RECEIPT,Receiving,D-04,authoritative,L1,1,5,W5,false,false,Logistics Lead
IQC,Incoming Quality Control,D-04,authoritative,L1,1,5,W3,true,false,Quality Lead
SUP_QUAL,Supplier Qualification,D-04,authoritative,L1,1,5,W6,true,false,Procurement Lead
SCAR,Supplier Corrective Action Request,D-04,authoritative,L1,1,5,W7,true,false,Quality Lead
PPAP,Production Part Approval Process,D-04,authoritative,L0,0,5,W10,false,automotive,Quality Engineer
INVTXN,Inventory Transaction,D-05,authoritative,L1,1,5,W5,false,false,Logistics Lead
LOT,Lot/Batch,D-05,authoritative,L1,1,5,W5,true,false,Logistics Lead
SERIAL,Serial Number,D-05,authoritative,L1,0,5,W7,true,false,Logistics Lead
WIP,Work in Process,D-05,projection,L2,1,4,W6,false,false,Production Lead
WAREHOUSE_TASK,Warehouse Task,D-05,authoritative,L1,0,5,W6,false,false,Logistics Lead
CYCLE_COUNT,Cycle Count,D-05,authoritative,L1,0,5,W8,false,false,Logistics Lead
RESERVATION,Inventory Reservation,D-05,authoritative,L1,0,5,W5,false,false,Logistics Lead
QUARANTINE,Quarantine,D-05,projection,L2,1,4,W3,true,false,Quality Lead
JO,Job Order,D-06,authoritative,L1,1,5,W5,false,false,Production Lead
WO,Work Order,D-06,authoritative,L1,1,5,W5,false,false,Production Lead
OPER,Operation Execution,D-06,authoritative,L1,1,5,W6,false,false,Production Lead
INSTRUCTION,Work Instruction,D-06,dependency,L2,1,5,W3,true,false,Manufacturing Engineer
EBR,Electronic Batch Record,D-06,authoritative,L0,0,7,W10,true,pharma,Pharma Lead
EDHR,Electronic Device History Record,D-06,authoritative,L0,0,7,W10,true,med_device,Med Device Lead
OEE_EVENT,OEE Event,D-06,authoritative,L1,0,5,W6,false,false,Production Lead
ANDON,Andon Signal,D-06,authoritative,L1,0,4,W6,false,false,Production Lead
SPC,Statistical Process Control,D-06,authoritative,L1,1,5,W6,true,false,Quality Engineer
INSP,Inspection,D-07,authoritative,L1,1,5,W3,true,false,Quality Lead
NQCASE,Nonconformance Case,D-07,authoritative,L1,4,5,W3,true,false,Quality Lead
CAPA,Corrective and Preventive Action,D-07,authoritative,L1,3,5,W3,true,false,Quality Lead
CDOC,Controlled Document,D-07,authoritative,L1,1,5,W3,true,false,Document Control
AUDIT_FINDING,Internal Audit Finding,D-07,authoritative,L1,1,5,W7,true,false,Quality Lead
MRB,Material Review Board Action,D-07,authoritative,L1,0,5,W3,true,false,Quality Lead
RISK,ISO 14971 Risk Item,D-07,authoritative,L0,0,5,W10,true,med_device,Quality Engineer
LOT_GENEALOGY,Lot Genealogy Edge,D-08,authoritative,L1,1,5,W7,true,false,Logistics Lead
BREL,Batch/Build Release,D-08,authoritative,L1,1,7,W7,true,false,Quality Lead
RECALL,Product Recall,D-08,authoritative,L1,0,5,W7,true,false,Quality Lead
RELEASE_PACKET,Release Packet,D-08,projection,L2,0,5,W7,true,false,Quality Lead
EQP,Equipment,D-09,authoritative,L1,1,5,W2,true,false,Maintenance Lead
MWO,Maintenance Work Order,D-09,authoritative,L1,1,5,W6,false,false,Maintenance Lead
PMSCH,PM Schedule,D-09,authoritative,L1,0,5,W6,false,false,Maintenance Lead
CAL,Calibration Record,D-09,authoritative,L1,1,5,W6,true,false,Metrology Lead
MSA,Measurement System Analysis,D-09,authoritative,L0,0,5,W6,true,false,Quality Engineer
EHS_INCIDENT,EHS Incident,D-09,authoritative,L0,0,4,W8,false,false,EHS Lead
LOTO,Lockout/Tagout,D-09,authoritative,L0,0,4,W8,false,false,EHS Lead
USER,User,D-10,dependency,L4,4,7,W0.5,false,false,Identity Lead
ROLE,Role,D-10,dependency,L4,4,7,W0.5,false,false,Identity Lead
TRAIN_COURSE,Training Course,D-10,authoritative,L1,1,5,W2,true,false,HR Lead
TRAIN_RECORD,Training Record,D-10,authoritative,L1,1,5,W3,true,false,HR Lead
COMP_MATRIX,Competency Matrix,D-10,authoritative,L1,1,5,W2,true,false,HR Lead
SHIFT,Shift Definition,D-10,authoritative,L1,0,4,W6,false,false,HR Lead
LABOR,Labor Reporting,D-10,authoritative,L1,0,5,W8,false,false,HR Lead
STD_COST,Standard Cost,D-11,authoritative,L1,1,5,W8,false,false,Finance Lead
ACT_COST,Actual Cost,D-11,authoritative,L1,0,5,W8,false,false,Finance Lead
WIP_COST,WIP Cost,D-11,projection,L1,0,4,W8,false,false,Finance Lead
VARIANCE,Cost Variance,D-11,projection,L1,0,4,W8,false,false,Finance Lead
INV_VAL,Inventory Valuation,D-11,projection,L1,0,4,W8,false,false,Finance Lead
GL,General Ledger,D-11,authoritative,L0,0,4,W10,false,false,Finance Lead
API_GATEWAY,API Gateway,D-12,platform,L3,2,7,W0.5,false,false,Platform Lead
EVENT_BUS,Event Bus,D-12,platform,L3,2,7,W0.5,false,false,Platform Lead
IDEMPOTENCY,Idempotency Service,D-12,platform,L3,1,7,W0.5,false,false,Platform Lead
LIVE_API_TOGGLE,Live API Toggle Registry,D-12,platform,L3,1,7,W4,false,false,Platform Lead
CDC,CDC Pipeline,D-12,platform,L0,0,7,W4.5,false,false,Data Platform Lead
PARTNER_INTEGRATION,Partner Connector,D-12,vertical,L0,0,7,W9,false,false,Platform Lead
OEE_ANL,OEE Analytics,D-13,derived,L1,0,5,W8,false,false,Data Platform Lead
QUALITY_ANL,Quality Analytics,D-13,derived,L1,0,5,W8,false,false,Data Platform Lead
THROUGHPUT,Throughput Analytics,D-13,derived,L1,0,5,W8,false,false,Data Platform Lead
PRED_MAINT,Predictive Maintenance Model,D-13,derived,L0,0,5,W7,false,false,ML Lead
AI_FEATURE,AI Advisory Feature,D-13,derived,L0,0,5,W6.5,false,false,AI Lead
DATA_PRODUCT,Data Product,D-13,derived,L0,0,7,W8,false,false,Data Platform Lead
IAM,Identity and Access Management,D-14,platform,L3,3,7,W0.5,false,false,Identity Lead
WORKFLOW_ENGINE,Workflow Engine,D-14,platform,L0,0,7,W0.5,false,false,Platform Lead
EVIDENCE,Evidence Engine,D-14,platform,L0,0,7,W0.5,false,false,Platform Lead
AUDIT,Audit Engine,D-14,platform,L0,0,7,W0.5,false,false,Compliance Lead
NOTIFY,Notification Service,D-14,platform,L1,1,7,W0.5,false,false,Platform Lead
GRAPHICS_AUTH,Graphics Authority,D-14,platform,L4,4,7,W0.5,false,false,Frontend Lead
DESIGN_SYS,Design System,D-14,platform,L3,3,7,W0.5,false,false,Frontend Lead
SRE,SRE Service,D-14,platform,L0,0,7,W0.5,false,false,SRE Lead
OBSERVABILITY,Observability Stack,D-14,platform,L0,0,7,W0.5,false,false,SRE Lead
APR,Annual Product Review,D-07,authoritative,L0,0,5,W10,true,pharma,Pharma Lead
DEVIATION,Manufacturing Deviation,D-07,authoritative,L0,0,5,W10,true,pharma,Pharma Lead
BATCH_RECORD,Master Batch Record,D-07,authoritative,L0,0,7,W10,true,pharma,Pharma Lead
QC_SAMPLE,Quality Control Sample,D-07,authoritative,L0,0,5,W10,true,pharma,Pharma Lead
STABILITY_STUDY,Stability Study,D-07,authoritative,L0,0,5,W10,true,pharma,Pharma Lead
DSCSA_TRANSACTION,DSCSA Transaction,D-08,authoritative,L0,0,5,W10,true,pharma,Logistics Lead
SAFETY_REPORT,ICSR Safety Report,D-07,authoritative,L0,0,5,W10,true,pharma,Pharma Lead
APQP,Advanced Product Quality Planning,D-04,authoritative,L0,0,5,W10,false,automotive,Quality Engineer
PSW,Part Submission Warrant,D-04,authoritative,L0,0,5,W10,false,automotive,Quality Engineer
CONTROL_PLAN,Control Plan,D-07,authoritative,L0,0,5,W10,false,automotive,Quality Engineer
GAGE_RR,Gauge R&R,D-09,authoritative,L0,0,5,W10,false,automotive,Quality Engineer
WARRANTY_CLAIM,Warranty Claim,D-01,authoritative,L0,0,5,W10,false,automotive,Quality Lead
AS9102_FAI,AS9102 First Article Inspection,D-07,authoritative,L0,0,5,W10,false,aerospace,Quality Lead
NADCAP_CERT,NADCAP Certification,D-09,authoritative,L0,0,5,W10,false,aerospace,Quality Lead
COUNTERFEIT_CHECK,Counterfeit Parts Check,D-04,authoritative,L0,0,5,W10,false,aerospace,Quality Lead
SOFTWARE_CONFIG_CONTROL,DO-178C SCI,D-02,authoritative,L0,0,5,W10,false,aerospace,Engineering Lead
SERVICE_LIFE_RECORD,Service Life Record,D-08,authoritative,L0,0,5,W10,false,aerospace,Maintenance Lead
ITAR_CONTROL,ITAR Item Control,D-04,vertical,L0,0,5,W10,false,aerospace,Compliance Lead
```

That is 95 root entries (V7's 75 + 20 vertical-pack additions).

---

## 3. Per-root scope contract location

Each root has its own scope contract at:

```text
_reports/module-template-v4/roots/<root_code>/<root_code>_SCOPE_CONTRACT.md
```

Authored using `templates/ROOT_SCOPE_CONTRACT_V8.md`. Owner per `owner_role` field. Each root scope contract is itself a work package (95 WPs total at WP-V8-ROOT-<root_code>).

---

## 4. Master data priority work packages (W0.5–W2)

```yaml
WP-V8-ROOT-USER     (W0.5, 0.5 wk; substrate-only ratification)
WP-V8-ROOT-ROLE     (W0.5, 0.5 wk)
WP-V8-ROOT-ITEM     (W0.5–W1, 1.5 wk)
WP-V8-ROOT-IREV     (W1, 1 wk)
WP-V8-ROOT-CUST     (W1, 1 wk)
WP-V8-ROOT-SUP      (W1, 1 wk)
WP-V8-ROOT-EQP      (W2, 1 wk)
WP-V8-ROOT-MDEV     (W2, 1 wk)
WP-V8-ROOT-ROUTE    (W2, 1 wk)
WP-V8-ROOT-BOM      (W2, 1 wk)
total_master_data: ~9 wk
```

Subsequent roots author per-wave work packages; 95 roots × ~0.5-2 wk per scope contract = ~95 work packages.

---

## 5. Decision phrase

```text
V8_ROOT_CATALOG_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: 95 WP-V8-ROOT-* + 10 master data priority WPs
NEXT_FILE: 12_V8_API_EVENT_PROBLEM_FACTORY.md
```

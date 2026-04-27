# 02 — Global Vendor Benchmark Pattern Extraction
## Nguyên tắc benchmark

Không dùng benchmark để tuyên bố HESEM đã vượt SAP/Siemens/Dassault/Rockwell/MasterControl/ETQ/Tulip. Dùng benchmark để rút pattern: product class nào chứng minh năng lực nào, HESEM nên mô phỏng cái gì, tránh cái gì, và khác biệt bằng cách nào.

## Pattern matrix

| Vendor/class | Pattern proven | HESEM emulate | HESEM avoid | HESEM differentiation |
| --- | --- | --- | --- | --- |
| SAP S/4HANA + SAP Digital Manufacturing | resource orchestration from warehouse/inventory/quality/labor/maintenance | emulate skill-aware dispatch, staging, exception orchestration | avoid SAP-style implementation gravity and module sprawl | authority-led micro-slices with explicit evidence gates |
| Siemens Opcenter | plan/orchestrate manufacturing and quality; compare as-planned vs as-is | emulate closed-loop plan-to-execute-to-improve logic | avoid opaque customization and weak UX modernization | operational truth graph with inspectable root authority |
| Dassault DELMIA Apriso | global MOM/MES platform across execution, quality, warehouse, maintenance | emulate multi-site standardized process models | avoid pure configurable black box without repo-evidence | repo-native standards-to-gates and root-by-root graduation |
| Rockwell Plex / FactoryTalk | cloud MES with real-time paperless production, quality and compliance | emulate paperless shopfloor + enterprise visibility | avoid machine-data-only thinking | combine MES + eQMS + ERP command bus in one authority map |
| MasterControl | regulated eBR/eDHR and QMS patterns | emulate record release, review by exception, GxP evidence | avoid compliance veneer without intended-use validation | validation factory integrated from first mutation |
| ETQ Reliance | workflow-based eQMS: doc, training, audit, CAPA, supplier quality, risk | emulate configurable quality workflows and central quality hub | avoid disconnected quality from operations | quality roots embedded into MOM execution and genealogy |
| Arena / PTC | PLM/QMS link between product record and quality records | emulate design-to-quality linkage | avoid PLM-only scope that misses execution truth | ECO/ITEM/FMEA/control-plan linked to MES evidence |
| Tulip | frontline operations platform connecting people, machines, devices, systems | emulate composable worker apps and edge data capture | avoid uncontrolled app sprawl | connected-worker runtime bound to root contracts and guard evidence |
| Poka | connected worker knowledge, training, skill and instruction system | emulate skill-aware work instructions and microlearning | avoid content library detached from authority | training/qualification gates drive dispatch eligibility |
| MaintainX / Limble | maintenance work orders, asset care, preventive/predictive execution | emulate maintenance simplicity and mobile completion | avoid maintenance island | maintenance evidence flows into OEE, quality holds and equipment eligibility |
| ServiceNow | enterprise workflow platform and cross-functional case orchestration | emulate workflow, case, service catalog, SLA design | avoid generic workflow without manufacturing semantics | ISA-95-aware commands and manufacturing-specific authority ledger |
| Palantir ontology style | digital twin with objects/properties/links and actions/security | emulate semantic + kinetic graph | avoid black-box ontology with weak evidence | Operational Truth Graph V3 with signed event/evidence edges |
| Databricks / Snowflake / Fabric | lakehouse/semantic manufacturing data product patterns | emulate governed CDC and analytics products | avoid analytics divorced from authoritative source | CDC from authority ledger with replayable lineage and quality gates |

## Chiến lược khác biệt

- SAP/Siemens/Dassault/Rockwell chứng minh độ rộng MOM/MES. HESEM phải khác bằng execution evidence, root authority và slice factory nhanh.
- MasterControl/ETQ/Arena chứng minh eQMS/regulated record cần workflow/evidence/validation. HESEM phải nhúng quality vào shopfloor truth, không để eQMS thành silo.
- Tulip/Poka chứng minh connected-worker UX. HESEM phải thêm authority governance và qualification gate để tránh app sprawl.
- Palantir/lakehouse/Fabric chứng minh semantic data/product graph. HESEM phải gắn ontology/graph vào command evidence, không chỉ dashboard.

## Vendor pattern to wave mapping

| Pattern | Primary wave | Required HESEM artifact |
| --- | --- | --- |
| Resource orchestration | W1/W5/W6 | Dispatch/skill/material/equipment readiness contract |
| Closed-loop quality | W3/W7/W8 | NQCASE/CAPA/INSP/SPC/release packet |
| Paperless execution | W6/W10 | Instruction runtime + eBR/eDHR + evidence spine |
| Workflow eQMS | W3/W9 | CDOC/TRAIN/AUDIT/CAPA validation package |
| Connected worker | W3/W6 | Qualification-gated work instruction runtime |
| Ontology/digital twin | W4.5/W7 | OTG Node/Edge schema + lineage browser |
| Lakehouse analytics | W8 | CDC/data contract/DQ/lineage/SLO dashboards |

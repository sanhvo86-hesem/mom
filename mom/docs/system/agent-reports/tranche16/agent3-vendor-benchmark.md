# Tranche 16 Agent 3 - Global Vendor Benchmark

Date: 2026-04-15

## Official Vendor Source Families

- SAP Digital Manufacturing official product/help pages: https://www.sap.com/products/scm/digital-manufacturing.html and https://help.sap.com/docs/SAP_DIGITAL_MANUFACTURING
- Siemens Opcenter APS and quality pages: https://plm.sw.siemens.com/en-US/opcenter/ and https://plm.sw.siemens.com/en-US/opcenter/quality/
- Critical Manufacturing MES / data and genealogy materials: https://www.criticalmanufacturing.com/
- ETQ supplier quality / quality management pages: https://www.etq.com/
- MasterControl QMS, training, document control, CAPA, production records pages: https://www.mastercontrol.com/
- Microsoft manufacturing data/industry guidance used as cross-check for cloud data platform expectations: https://learn.microsoft.com/

## Vendor Table Stakes vs Repo Reality

| Benchmark Family | Table Stakes | Repo Verified Match | Remaining Gap |
| --- | --- | --- | --- |
| SAP Digital Manufacturing | Closed-loop execution, dispatch, labor/skills, monitoring, top-floor/shop-floor coordination | Admin/control surfaces, queue, shopfloor execution, authority gates, and publication proof exist. | End-to-end closed-loop planning and live dispatch orchestration are still partial. |
| Siemens Opcenter APS | Order-based finite capacity, multi-constraint scheduling, BOM/MTO/MTS planning | Scheduling and shopfloor contracts exist; no verified APS optimizer parity. | Advanced constraint modeling remains product/algorithm work. |
| Siemens Opcenter Quality | Inspection plans, SPC, FAI/PPAP, supplier quality, closed-loop quality | EQMS evidence, signatures, CAPA-adjacent controls, traceability, and supplier-quality docs exist. | Full SPC/FAI/PPAP suite parity remains unproven. |
| Critical Manufacturing | Canonical cross-site data model, event-centric production history, genealogy | Canonical registry, migration chain, manufacturing event repository, and genealogy tests strengthened. | Multi-site rollout proof and live event platform observability remain partial. |
| ETQ | PPAP, receiving inspection, SCAR, supplier rating | Supplier-quality and quality evidence surfaces exist. | Supplier scorecard/SCAR closed loop still not proven as full suite. |
| MasterControl | Document control, training, CAPA, audits, production/release records, connected quality | Governance docs, evidence controls, signatures, and training/qualification adjacency exist. | Connected change-to-training-to-release remains partial beyond tested slices. |

## Positioning Verdict

The tranche improves the repo as a governed manufacturing authority substrate. It still does not equal a full SAP/Siemens/Critical/ETQ/MasterControl-class suite.


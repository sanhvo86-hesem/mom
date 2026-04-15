# World Benchmark Dossier - Tranche 16

Date: 2026-04-15

## Global Standard Requirement

| Standard / Regulator | Requirement Interpreted For This Repo | Official Source |
| --- | --- | --- |
| ISA-95 / IEC 62264 | Keep enterprise planning, MOM/MES execution, quality, and equipment/control boundaries explicit. Local schema/publication proof supports boundary discipline but is not conformance proof. | https://www.isa.org/standards-and-publications/isa-standards/isa-95 |
| NIST SP 800-82 Rev. 3 | OT-adjacent systems should fail safely, preserve least privilege, and avoid uncontrolled machine actions. | https://csrc.nist.gov/pubs/sp/800/82/r3/final |
| NIST SSDF SP 800-218 | Security-relevant changes need reviewable evidence, testing, and secure implementation practices. | https://csrc.nist.gov/pubs/sp/800/218/final |
| 21 CFR Part 11 | Electronic records/signatures need trustworthy identity, auditability, linkage, and validation context. | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11 |
| FDA Part 11 scope/application | Part 11 claims must be scoped and backed by validation and business controls. | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application |
| OpenTelemetry | Signals and context propagation need trace/log/metric correlation beyond static proof files. | https://opentelemetry.io/docs/concepts/ |

## Global Vendor Table-Stakes Capability

| Vendor Family | Table Stakes | Repo Current Verified State | Claimed But Unproven State |
| --- | --- | --- | --- |
| SAP Digital Manufacturing | Closed-loop execution, dispatch, labor/skills, monitoring, enterprise/shop-floor coordination. | Admin, execution, queue, role/authority, registry/proof surfaces are stronger. | Full closed-loop planning and SAP-class labor scheduling parity. |
| Siemens Opcenter APS | BOM/MTO/MTS planning, order-based multi-constraint scheduling, finite capacity. | Shopfloor execution and queue semantics are tested. | Full APS solver/optimizer parity. |
| Siemens Opcenter Quality | Inspection plans, SPC, FAI/PPAP, supplier quality, closed-loop quality. | EQMS evidence, e-signature linkage, traceability, and quality docs exist. | Full SPC/FAI/PPAP/supplier quality suite parity. |
| Critical Manufacturing | Canonical cross-site model, event-centric production history, genealogy. | Schema/registry authority, event repository idempotency/hash scope, and genealogy scope are tested. | Live multi-site data platform proof. |
| ETQ | PPAP, receiving inspection, SCAR, supplier rating, supply chain quality. | Supplier/quality capability docs and controlled evidence paths exist. | End-to-end SCAR and supplier rating workflow parity. |
| MasterControl | Document control, training, CAPA, audits, production/release records, connected quality. | Governance, evidence, signature, qualification adjacency, and release proof are stronger. | Full connected change-to-training-to-production-record suite parity. |

## Global Differentiator

World-class platforms do not rely on a dashboard saying "ready"; they bind runtime truth to migrations, canonical model authority, role-scoped services, immutable or append-only evidence, and deployable health gates. Tranche 16 therefore prioritized authority/proof reliability over adding another feature surface.

## Gap To Close And Whether Closed In This Run

| Gap | Closed In This Run | Evidence |
| --- | --- | --- |
| Runtime DB/schema proof drift visible in admin UI | Yes locally | Current tranche18 re-verification: migration chain 001-133, schema authority 9/9, publication truth 271/271. This is repo-local source-of-truth evidence, not ISA-95 certification or vendor-suite parity. |
| E-signature records not relationally tied to challenges | Yes locally | Migration 132 FK with orphan precheck; migration test. |
| Explicit field authority lookup lacked unconsumed proof index | Yes locally | Migration 132 index; change authority tests. |
| Rate limiter could fail open on fallback state failure | Yes locally | Fail-closed 503 path and regression test. |
| Cache fallback health was opaque | Yes locally | Cache fallback health fields and regression test. |
| Postdeploy runtime dirs not hard-gated | Yes locally | `postdeploy_healthcheck.php` treats sessions, rate-limit, and cache dirs as critical. |
| Live OTel collector/exporter proof | No | External infrastructure required. |
| Full Part 11 / validation / WORM archive proof | No | External validation, SOP, identity, retention, and audit process required. |
| Full SAP/Siemens/Critical/ETQ/MasterControl parity | No | Product scope and deployed workflows remain beyond this tranche. |

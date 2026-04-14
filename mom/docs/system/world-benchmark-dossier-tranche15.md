# Tranche 15 World Benchmark Dossier

Date: 2026-04-14

## Official Source Set

- ISA-95 / IEC 62264: https://www.isa.org/products/ansi-isa-95-00-01-2025-iec-62264-1-mod-enterprise
- ISA/IEC 62443: https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards
- NIST SP 800-82 Rev. 3: https://csrc.nist.gov/pubs/sp/800/82/r3/final
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- FDA Part 11 scope/application: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/
- SAP Digital Manufacturing: https://www.sap.com/products/scm/digital-manufacturing.html
- Siemens Opcenter: https://www.siemens.com/en-us/products/opcenter/
- Critical Manufacturing Data Platform: https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/
- Microsoft Dynamics 365 production: https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/production-process-overview
- Oracle Fusion Cloud Manufacturing: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faips/about-oracle-fusion-cloud-manufacturing.html
- Epicor Kinetic: https://www.epicor.com/en/products/enterprise-resource-planning-erp/kinetic/production-management/
- Tulip Composable MES: https://tulip.co/solutions/composable-mes/
- ETQ/Octave Reliance supply chain quality: https://www.etq.com/supply-chain-quality/
- MasterControl production records: https://www.mastercontrol.com/manufacturing/production-records/

## Strict Gap Matrix

| GLOBAL STANDARD REQUIREMENT | GLOBAL VENDOR TABLE-STAKES CAPABILITY | GLOBAL DIFFERENTIATOR | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
|---|---|---|---|---|---|---|
| ISA-95 boundary discipline | ERP/MOM/MES/EQMS contract separation | Multi-site enterprise-control integration | Local registry/schema authority alignment is now verified at 760/760 logical runtime-contract tables. | Full enterprise runtime breadth and boundary enforcement across every planning/execution/quality/analytics slice. | End-to-end runtime boundary proof across all slices. | Partially: generated authority drift closed; full ISA-95 runtime proof remains unproven. |
| NIST 800-82 OT safety/reliability | Shopfloor-safe execution and recovery posture | OT segmentation and recovery evidence | No direct machine control added; deployment proof remains external. | Live OT readiness. | Site/network proof. | No, blocked external. |
| NIST SSDF secure development | Branch, tests, generated truth, secure logging | Supply-chain release attestations | Query bind logging no longer stores raw secrets/PII; tests added. | Full CI/security pipeline evidence. | External pipeline proof. | Partially closed. |
| FDA Part 11 scope/application | Trusted records, signatures, audit evidence | Validated regulated production records | Evidence/signature/release controls exist. | Formal compliance readiness. | Predicate-rule scope and validation package. | No, product decision. |
| OpenTelemetry signals/context | Trace/log/metric correlation | Live collector-backed propagation | Structured correlation fields and honest file-export posture. | Collector-backed production proof. | Deployed OTel proof. | No, blocked external. |
| SAP/Siemens execution/quality | Orders, dispatch, skills, inspections, SPC, PPAP | Closed-loop planning/execution/quality | Planning/execution/quality primitives exist. | SAP/Siemens suite parity. | APS optimizer, workforce/certification, supplier quality breadth. | No new feature; authority layer fixed first. |
| Critical Manufacturing data model | Canonical data model, event-centric history, genealogy | Enterprise data platform | Generated contract/artifact pipeline now authority-safe and verifier-backed. | Cross-site CDM rollout. | Multi-site attestation and data platform breadth. | Partially closed. |
| ETQ/MasterControl connected quality | Document/training/CAPA/audit/records | Connected quality plus production records | Trusted release/evidence/signature controls remain strong. | Full QMS suite and validated eDHR/eBR parity. | Product breadth and validation scope. | No, product decision/external. |

## Highest-Leverage Improvement Chosen

The chosen improvement was authority-safe schema/publication reconciliation, not a new UI feature. It was highest leverage because the user-reported database/frontend failures and pass-1 audits both pointed to false database readiness and generated-artifact drift. Fixing the authority chain makes future release and migration decisions safer.

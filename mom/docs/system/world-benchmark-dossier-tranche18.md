# Tranche 18 World Benchmark Dossier

Date: 2026-04-15

## Official Source Set

- ISA-95: https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- ISA-95 committee: https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- NIST SP 800-82 Rev. 3: https://csrc.nist.gov/pubs/sp/800/82/r3/final
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- FDA Part 11 scope/application: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- 21 CFR Part 11 regulation: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- OpenTelemetry overview/spec: https://opentelemetry.io/docs/specs/otel/overview/
- SAP Digital Manufacturing: https://www.sap.com/products/scm/digital-manufacturing.html
- SAP DM Execution help: https://help.sap.com/docs/sap-digital-manufacturing/execution/38f0325018bc4a27b9b76cf65d6763b3-61.html
- Siemens Opcenter APS: https://plm.sw.siemens.com/en-US/opcenter/advanced-planning-scheduling-aps/
- Siemens Opcenter Quality Control: https://plm.sw.siemens.com/en-us/products/opcenter/quality/quality-control/
- Siemens Supplier Assessment Portal: https://plm.sw.siemens.com/en-US/products/opcenter/quality/supplier-assessment-portal/
- Critical Manufacturing data platform: https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/
- Critical Manufacturing Genealogic: https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/
- ETQ supply chain quality: https://www.etq.com/supply-chain-quality/
- ETQ connected quality: https://www.etq.com/qa-qc-connected-quality/
- MasterControl training controls: https://www.mastercontrol.com/quality/training-software/controls/
- MasterControl production records: https://www.mastercontrol.com/manufacturing/production-records/

## Gap Matrix

| Benchmark area | GLOBAL STANDARD REQUIREMENT | GLOBAL VENDOR TABLE-STAKES CAPABILITY | GLOBAL DIFFERENTIATOR | REPO CURRENT VERIFIED STATE | REPO CLAIMED BUT UNPROVEN STATE | GAP TO CLOSE | WHETHER CLOSED IN THIS RUN |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Enterprise-control boundary | ISA-95 / IEC 62264 boundary and information exchange discipline | ERP/MOM/MES/EQMS boundaries explicit across suites | Top-floor/shop-floor coordination with controlled authority | Runtime authority slices, registry truth, service boundaries | ISA-95 conformance | Deployment-level ISA-95 operating proof | Not closed; external/operational |
| OT/security | NIST SP 800-82 safety/reliability/performance posture | Controlled action surfaces, no unsafe machine control | OT-safe integrations with monitored operations | Fail-closed patterns, auth/CSRF, readiness hardening | OT compliant | Live OT security validation | Partially strengthened by readiness/fallback fixes |
| Secure development | NIST SSDF practices integrated into SDLC | Reviewable secure changes, tests, vulnerability reduction | Supplier/software assurance vocabulary | Branch isolation, tests, static analysis planned, regression tests added | SSDF certification | Process evidence across full SDLC | Partially strengthened |
| Electronic records/signatures | Part 11 scoped to predicate rules, validation, audit trails, e-signature meaning | E-signature, audit trail, controlled records | Validated regulated record management | Scoped release/e-signature controls, wording corrected | Blanket Part 11 compliance | Validation package/WORM proof | Doc truthfulness closed; validation external |
| Observability | OTel traces/metrics/logs/context propagation | Correlated signals and health probes | Live collector/exporter correlation | Health probes and local observability surfaces | Full OTel implementation | Live collector/exporter proof | Sanitization/fallback proof closed; live proof external |
| SAP Digital Manufacturing | S/95 production model and MOM execution | Dispatch, labor, skills, closed-loop planning | BTP/cloud integration, SAP ecosystem | Governed execution, dispatch concepts, release/genealogy proof | SAP DM parity | Workforce orchestration and closed-loop optimizer | Not closed; product scope |
| Siemens APS | Multi-constraint planning/scheduling | BOM, MTO/MTS, capacity, what-if | Advanced sequencing and optimization | Deterministic finite-capacity slice | APS parity | Optimizer/BOM/MTO/MTS depth | Scope authority strengthened; parity not closed |
| Siemens Quality / Supplier Quality | Inspection/SPC/supplier quality | Inspection plans, supplier complaints, FAI/PPAP | PLM quality twin integration | APQP/PPAP, CAPA/NCR, inspection/release controls | Full Opcenter Quality parity | Supplier portal and PLM twin proof | Not closed; product scope |
| Critical Manufacturing | Event-centric MES data, genealogy, multisite | Production history and genealogy | Enterprise Data Platform and CDM | Genealogy/provenance, production history, schema registry | CDM platform parity | Cross-site canonical event model | Not closed; product scope |
| ETQ / MasterControl | Connected quality, training, records | Document, training, CAPA, audits, supplier, production records | Closed-loop training/change/production record automation | QMS docs, service hooks, trusted release | Full suite parity | Suite-level connected workflows and validation | Not closed; product scope |

## Highest-Leverage Improvement Chosen

After inherited code-fixable backlog was verified as closed, the highest-leverage improvement was authority and reliability hardening at the planning/release/health boundary:

- Planning and trusted release are execution-adjacent authority paths where false cross-site truth can create incorrect dispatch/release evidence.
- Readiness and fallback sinks are operational proof paths; silent or over-disclosed failure weakens zero-trust deploy readiness.

This was chosen over new product surface because it strengthens authority, observability, testability, and benchmark honesty without UI redesign or broad rewrite.

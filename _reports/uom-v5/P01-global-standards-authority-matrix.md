# P01 Global Standards Authority Matrix

Prompt: P01 Global Standard and Vendor Research Lock
Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.

## Research Boundary

- REPO_EVIDENCE: `AGENTS.md` restricts internet research to specific domains. This P01 matrix uses official/allowed sources where available.
- CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED: Official domains for UCUM, QUDT, UNECE, HL7 FHIR, RFC Editor, FDA, EU GMP, ISPE/GAMP, OWASP, and OpenAPI Initiative are outside the allowed domain list. Their roles are recorded from pack requirements and must be rechecked against official sources before validation-ready customer use.
- GLOBAL_STANDARD: Allowed official sources consulted: NIST SI/SP 330, OPC Foundation Part 8 EUInformation, ISA-95, NIST AI RMF, SAP Help UoM pages, Siemens Opcenter, Dassault DELMIA MOM, AVEVA MES, Tulip CDM/Units.

## Authority Matrix

| Authority | Role in HESEM UoM | Must implement as | Must not be used as | Artifact/Gate | Owner prompt | Risk | Citation |
|---|---|---|---|---|---|---|---|
| NIST SP 330 / SI Brochure 9th edition | SI base/derived unit foundation, naming, defining constants, prefixes | Manifest source for SI units, unit catalog citation, dimensional cross-check | Business semantic permission, packaging policy, density/potency shortcut | SI units must carry source authority and no invented SI definitions | P04/P05/P07 | High if factor invented | https://www.nist.gov/pml/special-publication-330 |
| NIST SI Units | Practical SI model and seven defining constants | Training/check source for SI base definitions | Replacement for UCUM parser or quantity-kind ontology | Base units and prefixes reviewed against SI | P01/P05 | Medium | https://www.nist.gov/pml/weights-and-measures/metric-si/si-units |
| UCUM v2.2 | Machine-readable unit expression grammar and special units | `ucum_code`, parser grammar, special-unit handling, affine/log/arbitrary guard | Human display label only, business approval, factor-only for special units | UCUM parser subset plus controlled gap manifest | P06/P05 | High | CONTROLLED_GAP official domain outside allowlist |
| QUDT Unit/QuantityKind/DimensionVector | Semantic ontology for unit/kind/dimension cross-check | `quantity_kind_code`, `dimension_vector`, compatibility candidate evidence | Automatic cross-kind conversion permission | Quantity-kind compatibility matrix; default deny cross-kind | P07 | High | CONTROLLED_GAP official domain outside allowlist |
| UNECE Rec20 / UN/EDIFACT 6411 | Trade/EDI external unit codes | `uom_external_code_map` source mapping such as KGM -> kg | Canonical unit definition or silent alias trust | Unknown/ambiguous external code quarantines | P06/P10/P12 | High | CONTROLLED_GAP official domain outside allowlist |
| OPC UA Part 8 EUInformation | OT engineering-unit structure and device engineering unit mapping | `source`, namespace, engineeringUnitId, displayName, description, verified mapping | Blind trust in numeric id or device display value | Unknown EUInformation quarantines | P06/P12/P13 | High | https://reference.opcfoundation.org/specs/OPC-10000-8/5.6.4 |
| FHIR Quantity pattern | Measurement payload pattern: value + unit + system + code + precision/comparator | MEASVAL envelope inspiration for value/unit/system/code/original precision | Healthcare-only schema copy or regulated claim | No naked measurement payload | P09/P10/P14 | Medium | CONTROLLED_GAP official domain outside allowlist |
| OpenAPI 3.1.x | Contract-first API documentation | Spec/route/controller parity for UoM routes | Afterthought documentation or spec without tests | No API route without spec parity | P10 | Medium | CONTROLLED_GAP official OpenAPI domain outside allowlist; Google Cloud allowed page confirms OpenAPI contracts are versioned API descriptions: https://docs.cloud.google.com/api-gateway/docs/openapi-overview |
| RFC 9457 Problem Details | Machine-readable error envelope | Problem Details shape with code, trace_id, field errors, remediation | Plain text/generic 500 error | All touched API errors structured | P10/P13 | High | CONTROLLED_GAP official RFC domain outside allowlist |
| FDA 21 CFR Part 11 | Electronic records/signature control anchor | Signer identity, meaning, linkage, audit evidence, inspection copy | Claiming validation without package | P14 Part 11 control matrix | P14 | High | CONTROLLED_GAP official domain outside allowlist |
| EU GMP Annex 11 | Computerized system validation lifecycle | URS/FRS/DS, traceability, audit, change/config, continuity | Production validation claim | Validation-ready package only | P14 | High | CONTROLLED_GAP official domain outside allowlist |
| GAMP 5 principles | Risk-based validation and configurable/custom classification | GAMP classification and risk-based testing plan | Substitute for regulatory acceptance | URS -> test traceability | P14 | High | CONTROLLED_GAP official domain outside allowlist |
| ISA-95 / IEC 62264 | ERP/MOM/MES boundary, level 3-4 integration, MOM activity models | Domain integration boundary and source-of-truth discipline | Unit conversion standard or physics source | ERP/MOM/MES contracts do not mutate execution truth from analytics/AI | P12/P16 | High | https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard |
| OWASP ASVS/API Security | API threat and auth test checklist | Injection/auth/replay/security negative tests | Security proof without tests | Fuzz, auth, idempotency, permission tests | P13 | High | CONTROLLED_GAP official domain outside allowlist |
| ISA/IEC 62443 | OT/IT boundary and industrial cybersecurity posture | Threat model for machine/device unit ingestion | Direct machine-control behavior | Device input is quarantined unless verified | P13 | High | ISA domain allowed but specific source not opened in P01 |
| OpenTelemetry | Trace/metric/log propagation | `trace_id` across API, audit, quarantine and MEASVAL | Business/e-sign evidence replacement | Observability metrics and trace propagation | P13 | Medium | CONTROLLED_GAP official domain outside allowlist |
| WCAG 2.2 | Accessible UoM widget behavior | Keyboard operation, focus, labels, associated error text | Optional UI polish | Quantity widget has no naked submit path | P11 | Medium | CONTROLLED_GAP official domain outside allowlist |
| NIST AI RMF 1.0 | AI governance and risk framing | Advisory-only AI boundary, human approval, logging, risk controls | AI approval/e-sign authority | AI cannot approve/sign; advisory logged | P04/P06/P14 | High | https://www.nist.gov/itl/ai-risk-management-framework |

## Vendor Benchmark Patterns

| Vendor/source | Extracted pattern | HESEM implication | Citation |
|---|---|---|---|
| SAP MM/WM/Sales | Base unit of measure anchors inventory; alternative/order/sales/WM units convert to base where configured. | Keep item/site/customer/supplier policy around base inventory unit; do not treat packaging as global factor. | https://help.sap.com/docs/SAP_ERP/34fc810a607e4ae5a287b6e233b8566f/2283c4530b29b44ce10000000a174cb4.html |
| SAP S/4HANA Inventory | Goods movement entry UoM can differ from stockkeeping unit if material master or purchasing info record defines it. | PO/SUP/INSP flows need policy evidence and original unit preservation. | https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/91b21005dded4984bcccf4a69ae1300c/f962bd534f22b44ce10000000a174cb4.html |
| SAP Product Lifecycle Costing | UoM master data can be replicated/display-only from ERP and uses formula fields for conversion. | Distinguish authoritative master data from workspace projection; replicated data is not local authority. | https://help.sap.com/docs/sap-product-lifecycle-costing-public-cloud-edition/application-help-for-sap-product-lifecycle-costing-cloud-edition/units-of-measure |
| Siemens Opcenter Execution | MES emphasizes digital thread, material flow, production tracking, genealogy, quality/regulatory documentation. | UoM must preserve original/canonical measurement across production, material, quality, and traceability records. | https://www.siemens.com/en-gb/products/opcenter/execution/ |
| Dassault DELMIA MOM | MOM spans production, quality, logistics, warehouse, maintenance, labor, supply chain across plants. | UoM cannot be isolated as a lookup; it must align with multi-root domain contracts. | https://www.3ds.com/products/delmia/manufacturing-operations/manufacturing-operations-management |
| AVEVA MES | MES coordinates work execution, inventory, quality sample plans, traceability and genealogy. | UoM evidence must support inventory transformation and quality investigation replay. | https://www.aveva.com/en/products/manufacturing-execution-system/ |
| Tulip Common Data Model | Units table represents physical containers; material standard properties and base unit belong in material definition. | Separate material definition/base UoM from physical unit/container tracking and genealogy. | https://library.tulip.co/units-table-overview |

## P01 Rules Locked For Later Prompts

1. GLOBAL_STANDARD: SI is physics authority, not business semantic permission.
2. GLOBAL_STANDARD: UCUM/parser expressions do not authorize business conversion by themselves.
3. GLOBAL_STANDARD: QUDT/dimension vectors cross-check compatibility but do not override explicit quantity-kind policy.
4. GLOBAL_STANDARD: UNECE/OPC UA/FHIR-style external systems must resolve to canonical code or quarantine.
5. GLOBAL_STANDARD: RFC9457-style errors must be machine-readable with trace and remediation.
6. GLOBAL_STANDARD: Regulated controls must remain validation-ready candidate language only until P14/P16 evidence exists.
7. GLOBAL_STANDARD: Vendor patterns support base/alternative UoM plus domain policy, not free-text unit storage.

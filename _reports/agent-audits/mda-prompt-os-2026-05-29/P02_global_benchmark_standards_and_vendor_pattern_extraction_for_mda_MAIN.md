# P02 Main

## Domain affected

- Primary: `master_data`
- Cross-domain dependencies: `planning_production`, `mes_execution`, `quality_improvement`, `inventory_logistics`, `maintenance_ehs`, `platform_backend`, `data_ai_governance`

## Input basis

- P00 decision: `P00_PASS_READY_FOR_NEXT`
- P01 decision: `P01_PASS_WITH_CONTROLLED_GAPS`
- Repo authority sources: `docs/backend/RUNTIME_AUTHORITY_MAP.md`, `docs/backend/DOMAIN_COMMAND_SPEC.md`, `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md`
- Official benchmark references: ISA, Microsoft Learn, SAP Help, Siemens, MTConnect, OPC UA
- Source-pack benchmark lenses retained with explicit tags: Oracle manufacturing pattern, Part 11/GAMP lens

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P02-CLAIM-001 | ISA-95 is the correct boundary frame for ERP Level 4 to MOM/MES Level 3 separation. | CURRENT_OFFICIAL_REFERENCE | https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard | High | HESEM could mix planning truth with execution truth | use ISA-95 boundary in benchmark atlas and gates | verified |
| P02-CLAIM-002 | Dynamics 365 PIM treats product information as centralized product definition including attributes and units. | CURRENT_OFFICIAL_REFERENCE | https://learn.microsoft.com/en-us/dynamics365/supply-chain/pim/product-information-management-overview | High | item/UOM authority could be fragmented again | map into product/UOM canonical gate | verified |
| P02-CLAIM-003 | Dynamics 365 quality management uses trigger points, quality orders, and inventory blocking patterns. | CURRENT_OFFICIAL_REFERENCE | https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quality-management-processes | High | quality gating could remain advisory only | map into quality-order and hold authority gates | verified |
| P02-CLAIM-004 | SAP patterns require stronger product/site release packaging than the current HESEM runtime chain exposes. | CURRENT_OFFICIAL_REFERENCE | https://help.sap.com/ | Medium | overstate SAP-specific behavior | keep claim at pattern level and tie to release package gate only | verified |
| P02-CLAIM-005 | Siemens digital-thread planning pattern reinforces EBOM/MBOM/BOP lineage instead of flat independent masters. | CURRENT_OFFICIAL_REFERENCE | https://plm.sw.siemens.com/en-US/teamcenter/manufacturing-process-planning/ | Medium | engineering bundle design may miss lineage depth | keep claim scoped to bundle lineage and change propagation | verified |
| P02-CLAIM-006 | MTConnect and OPC UA imply asset identity and semantic machine/device structure, not latest-value-only dashboards. | CURRENT_OFFICIAL_REFERENCE | https://www.mtconnect.org/standard ; https://opcfoundation.org/about/opc-technologies/opc-ua/ | High | connectivity could stay projection-only without authority boundaries | map into equipment/adapter read-only projection rule | verified |
| P02-CLAIM-007 | HESEM repo truth still forbids Generic CRUD from becoming governed business transition authority. | REPO_EVIDENCE | docs/backend/DOMAIN_COMMAND_SPEC.md ; mom/api/controllers/GenericCrudController.php | High | benchmark could drift from current platform constitution | keep command gate anchored to repo docs | verified |
| P02-CLAIM-008 | PostgreSQL remains target transactional authority, but cutover requires reconciliation, fallback telemetry, and staged modes. | REPO_EVIDENCE | docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md | High | false cutover optimism | keep observability gate in atlas and matrix | verified |
| P02-CLAIM-009 | Oracle work-definition/work-order pattern is available in the uploaded source pack and is already part of the prompt OS design basis. | V11_V15_SOURCE_PACK | /Users/a10/Downloads/HESEM_MDA_PROMPT_OS_V1_2026-05-28/HESEM_MDA_PROMPT_OS_V1_2026-05-28/research/MDA_RESEARCH_AND_SOURCE_ANCHORS.md | Medium | if treated as live-official refresh it would violate no-guess discipline | tag as source-pack lens only | verified |
| P02-CLAIM-010 | Part 11/GAMP controls should be treated as applicability-controlled gates, not blanket compliance claims. | V11_V15_SOURCE_PACK | /Users/a10/Downloads/HESEM_MDA_PROMPT_OS_V1_2026-05-28/HESEM_MDA_PROMPT_OS_V1_2026-05-28/prompts/02_p02_global_benchmark__standards___vendor_pattern_extraction_for_mda.md | High | false compliance claim risk | convert to applicability and evidence gates only | verified |
| P02-CLAIM-011 | P02 can unlock P03 if the benchmark package avoids P0/P1 blocking gaps and does not claim unsupported compliance or cutover status. | REPO_EVIDENCE | prompt P02 stop rules + P01 handoff | High | sequence could become invalid | keep all unresolved items as non-blocking controlled gaps only | verified |
| P02-CLAIM-012 | This benchmark package is for master data platform architecture, not a narrow UOM-only initiative. | PROJECT_MEMORY | current user instruction on 2026-05-29 | High | scope could collapse incorrectly | keep all benchmark categories multi-domain | verified |

## Benchmark conclusions that convert directly into HESEM gates

| category | emulate | avoid | differentiate | HESEM artifact or gate | benchmark_ref |
| --- | --- | --- | --- | --- | --- |
| ERP↔MOM/MES boundary | Level-3 execution truth separated from Level-4 planning/master transactions | ERP or dashboard direct-write into runtime execution state | explicit ISA-95 gate in every cross-boundary command contract | `isa95_boundary_gate` | ISA-95 |
| Product/item master | centralized item definition with site/plant release packaging | one flat item record with detached BOM/routing/quality dependencies | released package = item revision + site effectivity + attachments + evidence | `item_site_release_package` | SAP + Dynamics |
| Work definition and release | operation/resource/material/output/version bundle | header-only WO or mutable released route | immutable work-definition snapshot at WO release | `wo_release_snapshot_contract` | Oracle lens + Siemens |
| Quality planning and holds | trigger-based quality orders and inventory blocking | quality advice that does not actually block movement/release | one governed hold authority spanning IQC/IPQC/OQC/shipment | `quality_order_trigger_matrix` | Dynamics |
| Engineering bundle lineage | EBOM→MBOM→routing→NC→inspection lineage | independent lists with no bundle identity | released engineering package as first-class authority object | `engineering_bundle_lineage` | Siemens |
| Equipment/tool/connectivity | asset identity and semantic adapter linkage | latest-state-only connectivity dashboards as authority | connectivity as read-only projection of governed equipment/tool masters | `asset_identity_and_projection_rule` | MTConnect + OPC UA |
| UOM and conversions | centralized product/UOM/conversion semantics | per-module hidden conversions | UOM authority tied to item/revision/spec and evidence rules | `uom_authority_contract` | Dynamics |
| Audit/e-sign/validation | applicability-controlled signature meaning, signer identity, timestamp, and validation trace | marketing-level “compliance” without evidence package | regulated-mode feature flag with mandatory evidence bundle | `regulated_mode_signature_gate` | Part 11/GAMP lens |
| API/events/observability | command envelope, idempotency, outbox, replay evidence, drift telemetry | silent fallback and shadow-write without reconciliation | observability as cutover precondition instead of afterthought | `cutover_observability_gate` | Repo spec + SRE synthesis |

## Required benchmark-to-design decisions

1. `P03` must define a canonical root object for released engineering packages rather than keeping BOM, routing, control plan, inspection plan, and NC package as unrelated authorities.
2. `P03` must separate foundational reference master (`uom`, status codes, reason codes, calendars) from lifecycle-owned master (`item`, revision, work definition bundle, equipment, supplier approval).
3. `P04` must model site/plant release package authority explicitly, not just item master rows.
4. `P07`, `P10`, and `P14` must implement quality-order and release-blocking gates from the benchmark package.
5. `P12`, `P13`, and `P17` must encode command, audit, signature, drift, fallback, and replay observability as runtime gates, not documentation notes.

## Controlled gaps

- Oracle live-official refresh was not performed because `oracle.com` is outside the repository research allowlist; the Oracle work-definition lens is retained from the source pack and treated as a benchmark pattern, not a current-version claim.
- eCFR/Part 11 live-official refresh was not performed because `ecfr.gov` is outside the repository research allowlist; Part 11 controls are therefore treated as source-pack applicability gates only.
- SAP Help search results support the benchmark direction, but this prompt does not claim product-specific SAP customizing details.

## Decision token

`P02_PASS_WITH_CONTROLLED_GAPS`

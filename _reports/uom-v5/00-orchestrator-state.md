# UoM V5 P00 Orchestrator State

Prompt: P00 Master Sequential Orchestrator
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P16 commit: 7ce0f85395556a26a034b8c8402b566dc90b038e
Merge base with origin/main: 857ca8fd4cfa6ac6d262437451653a2c0522580f
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.

## Execution Rules

- REPO_EVIDENCE: Work started from a clean worktree on branch `codex/kpi-v3-production-living-20260530`, then a dedicated branch `codex/uom-v5-no-guess-20260530` was created before remediation.
- REPO_EVIDENCE: P00 is report-only. No product code, schema, route, UI, API, or runtime data file is changed in this prompt.
- REPO_EVIDENCE: Reports are created under `_reports/uom-v5/`, which matches `.ai/CONVENTIONS.md` for generated AI/test/audit artifacts.
- PROJECT_MEMORY: Prior prompt-pack memory says to read the whole pack first, execute prompts sequentially, and run audit/simulation/repair gates before advancing.
- CONTROLLED_GAP: `HESEM_GPT_PROJECT_MEMORY.md` was not found in the repo source.
- CONTROLLED_GAP: `HESEM_UOM_WORLDCLASS_BUILD_PLAN_V4_2026-05-30.md` was not found in the repo source.

## Source Truth Loaded

- REPO_EVIDENCE: `mom/contracts/objects/uom/uom-scope-contract.md` exists and defines UoM MIS scope, anti-free-text-unit policy, human approval, audit events, and advisory-only AI.
- REPO_EVIDENCE: UoM migrations found: `214_uom_quantity_kind.sql`, `215_uom_unit_catalog.sql`, `216_uom_rounding_policy.sql`, `217_uom_conversion_rule.sql`, `218_uom_external_code_map.sql`, `219_uom_alias.sql`, `220_item_uom_policy.sql`, `221_item_packaging_policy.sql`, `222_material_density_registry.sql`, `224_uom_seeds.sql`, `225_uom_rule_approval.sql`, `226_uom_indexes.sql`, `228_uom_measval_integration.sql`, `231_uom_v3_lifecycle_governance.sql`.
- REPO_EVIDENCE: UoM services exist under `mom/api/services/Uom/`, including `ConversionRuleService.php`, `ConversionEngine.php`, `UomWorkflowService.php`, `UomStandardLibraryManifestService.php`, alias/context/MEASVAL services.
- REPO_EVIDENCE: API/UI surfaces exist: `mom/api/controllers/UomController.php`, `mom/api/routes/uom-routes.php`, `mom/api/openapi.yaml`, `mom/scripts/portal/80-uom-control-center.js`, `mom/scripts/portal/81-uom-quantity-widget.js`.
- REPO_EVIDENCE: UoM tests exist under `mom/tests/Unit/Uom/`.
- REPO_EVIDENCE: Previous V3 reports exist under `_reports/uom-measurement-conversion-v3/`.

## P0 Watchlist For Sequential Phases

1. REPO_EVIDENCE: `uom_conversion_rule` migration uses canonical column `version`, while `UomWorkflowService.php` still selects and joins `r.rule_version`. Owner: P03.
2. REPO_EVIDENCE: `ConversionRuleService.php` resolves only `lifecycle_status = 'approved'`; migration 231 adds `active`, and workflow activates rules to `active`. Owner: P03.
3. REPO_EVIDENCE: P03 introduced v5 cache keys with as-of/lifecycle/context dimensions and P05 forwards as-of/context hash from the engine; cache observability remains P13.
4. REPO_EVIDENCE: P04 added migration 257 and service guards to close the manifest bridge going forward; historical migrations 224/231 remain as applied-history evidence.
5. REPO_EVIDENCE: P05 added the full category matrix and deterministic `UOM_CATEGORY_NOT_SUPPORTED` guard; API Problem Details mapping remains P10.
6. REPO_EVIDENCE: P06 added structured alias quarantine, verified UNECE/EDI/OPC UA resolution, and a UCUM golden-subset parser; full UCUM/QUDT catalog universe remains a controlled gap.
7. REPO_EVIDENCE: P07 added table-driven quantity-kind compatibility; same dimension is never sufficient for cross-kind conversion, and contextual condition handlers remain P08/P12+ work.
8. REPO_EVIDENCE: P08 added density, potency, and packaging contextual handlers; historical backfill and UI remediation remain later prompts.
9. REPO_EVIDENCE: P09 strengthened MEASVAL original/canonical/display/evidence/digital-thread envelope and added a naked-number scanner/backlog; domain-wide repair remains P12/P15.
10. REPO_EVIDENCE: P10 added route/OpenAPI parity, RFC 9457 fields, trace/idempotency contract coverage, and event payload version registry; UI rendering of these contracts remains P11.
11. REPO_EVIDENCE: P11 hardened the UoM control center and quantity widget as fixture-default workspace projections with quantity-kind/source/context binding, alias quarantine display, and accessible Vietnamese feedback; domain-wide form integration remains P12.
12. REPO_EVIDENCE: P12 mapped ERP/MOM/MES/EQMS roots into a UoM domain integration registry and controlled naked-number backlog; no blind domain write-path rollout was performed.
13. REPO_EVIDENCE: P13 added UoM operability contracts for threat model, parser limits, auth separation, telemetry, cache, benchmark, and replay; UCUM parser now rejects oversized expressions before parsing.
14. REPO_EVIDENCE: P14 created the validation-ready package candidate tree with URS/FRS/DS/FMEA/traceability/IQ/OQ/PQ/Part11-Annex11/deviation evidence and static package tests.
15. REPO_EVIDENCE: P15 created shadow-only backfill policy, historical scan classification, vertical packs, onboarding playbook, sample shadow dataset, and tests; no original data rewrite or mass update was performed.
16. REPO_EVIDENCE: P16 created final execution ledger, simulation case log, readiness packet, red-team/audit reports, and decision JSON; no runtime mutation was performed.

## State Machine

P00 -> P01 -> P02 -> P03 -> P04 -> P05 -> P06 -> P07 -> P08 -> P09 -> P10 -> P11 -> P12 -> P13 -> P14 -> P15 -> P16 -> END_OF_PACK.

Advance rule: a phase can advance only when its decision JSON has `can_advance_to_next_prompt: true` and no hard gate is red.

## Final Status

- P00: PASS_WITH_WARNINGS - `UOM_V5_P00_ORCHESTRATOR_LOCKED`
- P01: PASS_WITH_WARNINGS - `UOM_V5_P01_GLOBAL_STANDARD_RESEARCH_LOCKED`
- P02: PASS_WITH_WARNINGS - `UOM_V5_P02_REPO_REALITY_LOCKED`
- P03: PASS_WITH_WARNINGS - `UOM_V5_P03_SCHEMA_SERVICE_LIFECYCLE_REPAIRED`
- P04: PASS_WITH_WARNINGS - `UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED`
- P05: PASS_WITH_WARNINGS - `UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED`
- P06: PASS_WITH_WARNINGS - `UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED`
- P07: PASS_WITH_WARNINGS - `UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED`
- P08: PASS_WITH_WARNINGS - `UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED`
- P09: PASS_WITH_WARNINGS - `UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED`
- P10: PASS_WITH_WARNINGS - `UOM_V5_P10_CONTRACT_FIRST_API_LOCKED`
- P11: PASS_WITH_WARNINGS - `UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED`
- P12: PASS_WITH_WARNINGS - `UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED`
- P13: PASS_WITH_WARNINGS - `UOM_V5_P13_ENTERPRISE_OPERABILITY_LOCKED`
- P14: PASS_WITH_WARNINGS - `UOM_V5_P14_VALIDATION_READY_PACKAGE_COMPLETE`
- P15: PASS_WITH_WARNINGS - `UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY`
- P16: PASS_WITH_WARNINGS - `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

Current next prompt: `END_OF_PACK`.

Known warnings:
- Full `composer check` still fails on unrelated KPI registry drift:
  `KpiEngineAuthorityRegistryTest::testCatalogExposesDocumentAndBackendCoverage`
  expected `142`, actual `148`.
- P16 logged all 40 actual cases in `92_SIMULATION_CASE_LIBRARY.jsonl` and
  classified domain-spanning site/customer PQ as controlled gap.

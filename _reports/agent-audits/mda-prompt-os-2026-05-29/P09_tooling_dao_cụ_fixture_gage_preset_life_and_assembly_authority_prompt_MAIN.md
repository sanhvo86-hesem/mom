# P09 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P09-CLAIM-001 | `tools` and `tool_transactions` already exist as the base tool asset and movement lane. | REPO_EVIDENCE | `mom/database/migrations/012_calibration_equipment.sql` | High | tooling authority could be designed as target-state only | anchor tool asset truth to existing tool tables | verified |
| P09-CLAIM-002 | repo already contains dedicated tooling lifecycle tables for assemblies, components, presets, crib transactions, life limits, life measurements, regrind cycles, fixtures, and calibration links. | REPO_EVIDENCE | `mom/database/migrations/057_tooling_lifecycle_management.sql` | High | prompt could invent missing tables and miss real authority | reuse the full tooling lifecycle lane | verified |
| P09-CLAIM-003 | MES already has preset offset and tool assembly evidence at runtime. | REPO_EVIDENCE | `mom/database/migrations/026_mes_world_class_foundations.sql` | High | preset/load authority could ignore machine-side records | bind load/preset truth to MES evidence | verified |
| P09-CLAIM-004 | engineering requirements already reference tools and fixtures by operation. | REPO_EVIDENCE | `mom/contracts/table-registry.json` entry `eng_tooling_requirements` | High | tooling prompt could drift from P07 operation requirements | keep tooling readiness operation-scoped | verified |
| P09-CLAIM-005 | canonical `master_data.tools` contract already exists with governed lifecycle states and compatibility alias semantics. | REPO_EVIDENCE | `mom/contracts/objects/master_data--tools/contract.json` | High | tool lifecycle could fork across runtime paths | preserve one tool identity root | verified |
| P09-CLAIM-006 | gage/MSA readiness is present but fragmented across calibration and GRR study lanes. | REPO_EVIDENCE | `mom/contracts/table-registry.json` (`calibration_grr_studies`); `docs/backend/backend-readiness-gap-analysis-2026-04-09.md` | High | CTQ measurement gate could be overstated | model as linked but partial authority | verified |

## Authority decisions

1. `ToolingAsset` is the governed asset root for cutting tools, holders, inserts, adapters, gages, and fixtures when the object has a lifecycle and readiness role.
2. `ToolingAsset` is not the same thing as inventory stock. Tool item stock/lot can back the asset physically, but issue/load/readiness must follow the tooling asset chain, not only inventory availability.
3. `ToolAssembly` is a released/effective composition object; assembly and component effectivity must gate load-to-machine.
4. `ToolPreset` and `ToolOffsetHistory` are measurement and controller-side evidence, not casual edits. Mid-job offset changes require governed reason/audit.
5. `ToolLifePolicy` plus append-only usage measurements decide warning/stop behavior. Breakage reaction is a governed containment workflow, not a dashboard counter.

## Repair pass applied in P09

1. Resolved tool-as-asset vs tool-as-inventory ambiguity by making readiness flow through tooling assets and linking inventory lot/quality hold as a dependency, not the primary authority.
2. Unified preset, offset, life, regrind, breakage, gage calibration, and fixture readiness into one gating model instead of separate local heuristics.
3. Bound breakage to genealogy/NCR/inspection containment span from last good checkpoint.
4. Linked gage MSA/GRR validity to CTQ measurement use instead of treating calibration alone as sufficient.

## Decision token

`P09_PASS_WITH_CONTROLLED_GAPS`

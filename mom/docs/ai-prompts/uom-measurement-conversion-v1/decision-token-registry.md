# UoM Prompt OS — Decision Token Registry

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date established:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Posture:** development/prototype → pre-production readiness

---

## Closed Token Set

These are the only valid pass/block tokens that may be emitted by any prompt in this chain. No prompt may invent new tokens.

| Token | Meaning | Next action |
|-------|---------|-------------|
| `UOM_PROMPT_PASS_READY_FOR_NEXT` | All gates passed, no open critical/high gaps, all simulations pass | Proceed to next prompt immediately |
| `UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT` | All blockers absent, minor gaps (medium/low) have owner+date | Proceed to next prompt; carry gap register forward |
| `UOM_PROMPT_BLOCKED_REPAIR_REQUIRED` | At least one critical/high gap or blocker remains | STOP. Repair within this prompt, re-audit, then re-emit token |
| `UOM_IMPLEMENTATION_GATE_NOT_OPEN_PLANNING_ONLY` | HESEM integration gates do not permit implementation yet | Planning only; no source code changes; defer IMPL prompts |

## Block Tokens (stop immediately)

| Token | Trigger |
|-------|---------|
| `UOM_BLOCKED_ORIENTATION_SOURCE_MISSING` | Cannot read .ai/CONVENTIONS.md, .ai/repo-map.json, AGENTS.md |
| `UOM_BLOCKED_STANDARD_SOURCE_GAP` | Global standard required for correctness but not verified |
| `UOM_BLOCKED_UNDERMODELED_TABLE_DESIGN` | Prompt reduces module to simple uom(code, factor) table |
| `UOM_BLOCKED_NAKED_NUMBER_RISK` | Persisted business quantity has no unit/kind/precision metadata |
| `UOM_BLOCKED_CROSS_KIND_CONVERSION` | Cross-kind conversion allowed without approved context rule |
| `UOM_BLOCKED_PACKAGING_GLOBALISM` | box/case/pallet treated as global physical unit |
| `UOM_BLOCKED_AFFINE_UNIT_ERROR` | °C/°F converted by simple factor multiplication |
| `UOM_BLOCKED_CONTEXTUAL_CONVERSION_GAP` | Contextual conversion (density, potency) missing context schema |
| `UOM_BLOCKED_AI_AUTHORITY_VIOLATION` | AI approves conversion rule or regulated decision |
| `UOM_BLOCKED_HIDDEN_WORKSPACE_AUTHORITY` | Workspace mutates without authoritative re-anchor |
| `UOM_BLOCKED_API_WITHOUT_CONTRACT` | API proposed without OpenAPI/Problem Details/contract tests |
| `UOM_BLOCKED_UNCONTROLLED_MUTATION` | Mutation without workflow, evidence, audit, rollback |
| `UOM_BLOCKED_ESIGN_DEFECT` | e-sign without signature meaning and record linking |
| `UOM_BLOCKED_LIVE_API_DEFAULT` | Live API enabled by default (must be opt-in) |
| `UOM_BLOCKED_FILE_PLACEMENT` | Reports/docs placed in forbidden repo locations |
| `UOM_BLOCKED_NON_REPRODUCIBLE_EVIDENCE` | Tests/verification cannot reproduce |
| `UOM_BLOCKED_NEXT_PROMPT_FORBIDDEN` | Any blocker remains after repair loop |

---

## Prompt Token History

| Prompt | Execution date | Token emitted | Critical gaps | Notes |
|--------|---------------|---------------|---------------|-------|
| P00 — Source Ingestion and Context Lock | 2026-05-29 | `UOM_PROMPT_PASS_READY_FOR_NEXT` | 0 | Greenfield confirmed; 5 medium/low gaps recorded |
| P01 — Global Standards Benchmark | pending | — | — | |
| P02 — Root Scope Contract | pending | — | — | |
| P03 — Quantity Kind / Dimension | pending | — | — | |
| P04 — Unit Catalog / Alias Governance | pending | — | — | |
| P05 — Conversion Engine / Precision | pending | — | — | |
| P06 — MeasurementValue Object | pending | — | — | |
| P07 — Item UoM Policy / Packaging | pending | — | — | |
| P08 — ERP/MOM/MES/eQMS Integration | pending | — | — | |
| P09 — OT/Edge/Lab/EDI Integration | pending | — | — | |
| P10 — OpenAPI / Problem Details | pending | — | — | |
| P11 — Data Model / Migration | pending | — | — | |
| P12 — Workflow / Audit / eSign | pending | — | — | |
| P13 — Frontend UX / Accessibility | pending | — | — | |
| P14 — Test / Simulation / Validation | pending | — | — | |
| P15 — Security / OT / AI Governance | pending | — | — | |
| P16 — Observability / Reliability | pending | — | — | |
| P17 — Implementation Slice Factory | pending | — | — | |
| P18 — Final Redteam / Gap Fix | pending | — | — | |
| IMPL-00 — Scope Contract | pending | — | — | |
| IMPL-01 — Fixture Catalog | pending | — | — | |
| IMPL-02 — Conversion Engine Core | pending | — | — | |
| IMPL-03 — Read-only API | pending | — | — | |
| IMPL-04 — Read-only UI | pending | — | — | |
| IMPL-05 — ITEM Integration | pending | — | — | |
| IMPL-06 — Quality/Metrology Integration | pending | — | — | |
| IMPL-07 — Governed Mutation Workflow | pending | — | — | |

---

## Design Decisions Locked in P00

| Decision | Token / Reference |
|----------|------------------|
| No simple uom(code,factor) table | DEC-001 |
| UCUM as canonical machine syntax | DEC-002 |
| QUDT for quantity kind/dimension | DEC-003 |
| UNECE Rec 20 for EDI codes | DEC-004 |
| MeasurementValue envelope mandatory | DEC-005 |
| AI advisory-only, no approval | DEC-006 |
| Packaging → Item UoM Policy only | DEC-007 |
| PHP + PostgreSQL, no microservice | DEC-008 |
| Migration IDs start at 214 | DEC-009 |
| Greenfield Phase 1, remediation Phase 2 | DEC-010 |

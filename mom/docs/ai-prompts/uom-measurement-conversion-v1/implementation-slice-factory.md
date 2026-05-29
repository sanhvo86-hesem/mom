# P17 — Implementation Slice Factory and Prerequisites

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P17 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Index every implementation prompt (IMPL-00 → IMPL-07), the prerequisites each requires, and the deliverable contract each must satisfy. The factory is the runbook the next AI consults when extending or repeating implementation slices.

## 2. Implementation prompts

| Prompt | Purpose | Prerequisites | Output deliverables |
|---|---|---|---|
| IMPL-00 | U0 Scope Contract Planning Only | P00–P18 | `u0-scope-contract-prompt-output.md` + `impl00-orientation-and-file-placement-audit.md` |
| IMPL-01 | Fixture Catalog + Contract Skeleton | IMPL-00 | `impl01-fixture-contract-report.md` + migrations 214–222, 224, 226 |
| IMPL-02 | Conversion Engine Core | IMPL-01 | `impl02-engine-test-report.md` + 5 converter classes + tests |
| IMPL-03 | Read-Only API + Preview/Normalize | IMPL-02 | `impl03-api-contract-report.md` + UomController + uom-routes.php + index.php registration |
| IMPL-04 | Read-Only UI Control Center + QuantityInputWidget | IMPL-03 | `ui-implementation-handoff.md` + `impl04-ui-e2e-a11y-report.md` + 2 portal scripts |
| IMPL-05 | Item / Inventory / Procurement / Sales / BOM Integration | IMPL-03 | `item-integration-implementation-report.md` + `impl05-item-integration-regression-report.md` + ItemUomPolicyService + ITUOM routes |
| IMPL-06 | Quality / Metrology / SPC / MeasurementValue Integration | IMPL-03 + migrations 228 | `quality-metrology-integration-report.md` + `impl06-quality-metrology-validation-report.md` + QualityMeasurementBridge + ExternalEngineeringUnitMapper |
| IMPL-07 | Governed Mutation Workflow + Validation Package | all prior IMPLs | `governed-mutation-readiness-gate.md` + `impl07-governed-mutation-validation-report.md` + UomWorkflowService + UomImpactAnalysisService + UomDataQualityScanner + VRS-001 |

## 3. Slice contract

Every IMPL slice must:

1. Read its own prompt + the package's `02_STANDARD_AND_BENCHMARK_RESEARCH_LOCK.md` + `03_UOM_DOMAIN_MODEL_LOCK.md`.
2. Produce all deliverables enumerated in its `Required output files` block.
3. Include the seven mandatory sections (source inheritance, decision ledger, gap register, risk register, simulation result table, audit scorecard, next-prompt prerequisites).
4. End with a final-decision token (`UOM_PROMPT_PASS_READY_FOR_NEXT`, `UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`, `UOM_PROMPT_BLOCKED_REPAIR_REQUIRED`, or `UOM_IMPLEMENTATION_GATE_NOT_OPEN_PLANNING_ONLY`).
5. Reference real files + real test outcomes + real live-probe results.
6. Do not advance past `UOM_PROMPT_BLOCKED_REPAIR_REQUIRED` without repair.

## 4. Codex handoff notes

When a future AI / Codex session opens this branch cold, it should:

1. Read `CLAUDE.md` + `.ai/CONVENTIONS.md` + `.ai/repo-map.json`.
2. Read this factory + the runbook in the package.
3. Locate the current open IMPL slice via PR description + branch name.
4. Pick up at the last IMPL whose final token is not yet PASS.
5. Honour the forbidden-files list + the no-mutation-without-workflow rule.
6. Verify every assertion against the live VPS before claiming pass.

## 5. Forbidden shortcuts

- Skip standards research.
- Replace quantity kind with unit category.
- Treat display symbol as authority.
- Let AI approve conversions, aliases, or regulated decisions.
- Create live API default or mutation before workflow/audit/evidence.
- Continue when a critical/high gap remains.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ID-001 | Each IMPL slice has a stable label `codex/uom-impl-NN-*` | branch hygiene |
| ID-002 | IMPL deliverables land at canonical paths per CLAUDE.md / runbook | scope discipline |
| ID-003 | Mandatory seven sections in every report | governance |
| ID-004 | Token taxonomy enforces PASS or BLOCK gates | runbook |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | IDG-001 | Some early IMPL deliverables (`UomCatalogService.php`) carried different names; documented mappings in slice reports | OD-005 |
| low | IDG-002 | Some prompts produced a single consolidated summary at `mom/docs/ai-prompts/...` before per-path artifacts; consolidated summaries are companion documents, not the canonical deliverables | this commit closes the per-path gap |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Slice enumeration | 10 |
| Prerequisite clarity | 10 |
| Deliverable contract | 10 |
| Handoff notes | 9 |
| **Total** | **39 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/release/uom-measurement-conversion-v1/uom-slice-roadmap.md` (P17 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p17-implementation-readiness-audit.md` (P17 / 3)
- Companion: existing summary `mom/docs/ai-prompts/uom-measurement-conversion-v1/17-implementation-slice-factory.md`

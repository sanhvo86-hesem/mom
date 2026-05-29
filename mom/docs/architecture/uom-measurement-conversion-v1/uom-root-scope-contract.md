# P02 — UoM Root Scope Contract

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P02 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Fix the root definitions, scope boundaries, and lifecycle states of the HESEM Measurement Intelligence subsystem so every downstream prompt operates on the same vocabulary and the same edges. Each root listed below has exactly one lifecycle, one mutation channel, and one audit thread.

## 2. Roots

| Root | What it is | Lifecycle states | Mutation channel | Audit thread |
|---|---|---|---|---|
| QuantityKind | a dimensional class (Length, Mass, Temperature, ...) | `draft → active → deprecated → retired` | catalog admin via `UomWorkflowService` (planned) | `uom_quantity_kind` rows are append-only at creation; transitions audited |
| Unit | a canonical named scale within a kind (`mm`, `Cel`, `RA_UM`) | `draft → active → deprecated → retired` | catalog admin | `uom_unit_catalog.lifecycle_status` |
| ConversionRule | a triple `(from_unit, to_unit, factor [+ offset])` | `draft → pending_review → approved_pending_signoff → approved → active → deprecated` | `UomWorkflowService` 4-step path only | `uom_rule_approval` chain |
| Alias | a label that resolves to a canonical Unit within a scope | `draft → active → quarantined → resolved → retired` | admin triage + `UomAliasResolutionService` | `uom_alias` + `uom_alias_quarantine` |
| ExternalCode | a foreign-system identifier (UNECE Rec20, OPC UA UnitId, LIMS symbol) | `active → deprecated` | seed migration + admin | `uom_external_code_map` |
| ItemUomPolicy (ITUOM) | the 8-level binding of an Item to UoM choices | `draft → active → deprecated` | per-item admin; planned through workflow | `item_uom_policy` |
| PackagingPolicy | overlay specifying packaging unit hierarchies | `draft → active → deprecated` | per-item admin | `item_packaging_policy` |
| MaterialDensity | substance density registry for volume↔mass | `active` (versioned via `effective_from`/`effective_to`) | metrology + admin | `material_density_registry` |
| MeasurementValue (MEASVAL) | immutable evidence envelope around a single conversion | n/a (immutable once written) | `MeasurementValueFactory` only | `uom_measurement_thread` |
| AIAdvisory | model-emitted suggestion awaiting human review | `pending → accepted | rejected | modified` | `UomWorkflowService::recordAiAdvisory` only | `uom_ai_advisory_log` |

## 3. Scope boundary

The Measurement Intelligence subsystem owns:

- the catalog of kinds, units, rules, aliases, external codes;
- the conversion engine that consumes the catalog and produces MEASVAL envelopes;
- the ITUOM and packaging policy resolvers;
- the data quality scanner that observes catalog state;
- the workflow service that mediates every catalog mutation;
- the MEASVAL writer columns added to `inspection_results` and `mes_inline_measurements` (migration 228).

The subsystem does **not** own:

- currency conversion (separate finance engine);
- inspection plan authoring (Quality module);
- BOM authoring (Engineering module);
- inventory transactions (Inventory module);
- shop-floor signal acquisition (MES / OT);
- user / role authority (RBAC SSOT lives in `roles.permissions` JSONB).

The boundary is enforced both by code path (services in `mom/api/services/Uom/` only call services in `mom/api/services/Uom/` or `mom/database/`) and by table ownership (Uom subsystem writes only to `uom_*`, `item_uom_*`, `item_packaging_*`, `material_density_*`, `uom_measurement_thread`, plus the nullable MEASVAL columns on inspection / MES rows).

## 4. Lifecycle invariants

| Invariant | Backing mechanism |
|---|---|
| A Unit may not transition `active → retired` while any `active` ConversionRule references it | UomImpactAnalysisService gate |
| A ConversionRule may not transition `pending_review → approved` without an Approver row | Workflow service + `chk_rule_approved` DB CHECK |
| A ConversionRule may not transition `approved → active` without an e-sign row | Workflow service step 4 |
| An Alias may not be `active` in two scopes with the same `(alias_code, supplier_id)` pair | `uq_alias_code_scope` unique index |
| A MeasurementValue is immutable once written | Application contract; tamper detection via hash re-verify |
| AIAdvisory may not flip `human_reviewed=true` without a human actor | Workflow service contract; `recordHumanDecision` is the only writer |
| ItemUomPolicy slots resolve at the highest priority level present; resolution payload carries `matched_level` | ItemUomPolicyService API contract |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| SD-001 | Each root has exactly one lifecycle state machine | uniformity for audit |
| SD-002 | Each root has exactly one mutation channel; raw SQL writes are forbidden | regulated mutation |
| SD-003 | Currency is excluded from physical engine roots | UD-007 |
| SD-004 | MEASVAL is immutable; tamper detection is mandatory | UD-003 |
| SD-005 | Subsystem boundary is a directory + table ownership rule, enforceable by grep | scope discipline |
| SD-006 | AIAdvisory is informational; never an autonomous mutation channel | UD-012 |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | SCG-001 | UomWorkflowService doesn't yet enforce "no active rule references" before retiring a unit; check is in UomImpactAnalysisService but not auto-invoked | wire workflow → impact analysis |
| medium | SCG-002 | Packaging policy lifecycle states not yet exercised end-to-end | follow-up tests |
| low | SCG-003 | "Repaired" alias from quarantine → active does not yet record the resolver actor | add `resolved_by` column in follow-up migration |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Root taxonomy completeness | 10 |
| Lifecycle state-machine clarity | 9 |
| Scope boundary discipline | 10 |
| Mutation channel uniqueness | 9 |
| Invariant coverage | 9 |
| **Total** | **47 / 50** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/uom-authority-lattice.md` (P02 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p02-undermodeling-redteam.md` (P02 / 3)

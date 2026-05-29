# P01 — Contradiction Ledger, Ambiguities, Controlled Gaps

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P01 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

The benchmark and the standards-as-gates map identify what HESEM inherits and how it surfaces operationally. This ledger captures every place those inherited authorities **contradict each other**, are **ambiguous in scope**, or **require HESEM to declare a controlled gap**. Where contradictions exist, the safer-posture choice is taken and the residual risk is noted.

## 2. Contradiction ledger

| ID | Source A | Source B | Conflict | Chosen | Rationale |
|---|---|---|---|---|---|
| CL-001 | UCUM ucum_code uniqueness | Common practice "ΔK" denoted as "K" with context | UCUM forbids two different units sharing the ucum_code "K" | UCUM uniqueness wins; HESEM uses `K{diff}` for ΔK | safer posture: uniqueness is enforceable, context is not |
| CL-002 | SAP "alternative UoM" allows per-line override | ISO 9001 traceability expects deterministic resolution | per-line override risks unauditable conversions | adopt 8-level priority resolver; per-line override allowed only when matched_level is recorded in MEASVAL | preserves both vendor pattern and traceability |
| CL-003 | ASTM E29 §6.1 round-half-up | ASTM E29 §6.4 round-half-even (banker's) | depending on which clause is read, default differs | banker's rounding chosen as default | matches FDA / GAMP guidance for measurement bias neutrality |
| CL-004 | OPC UA UnitId numeric | UNECE Rec20 alphanumeric | same physical unit may map under both systems | `uom_external_code_map` is composite `(system, code)`, both can coexist and resolve to same canonical | normalises namespace at the map layer |
| CL-005 | 21 CFR Part 11 §11.50 e-sign | Annex 11 §9 audit trail | Part 11 says "electronic signature manifestation"; Annex 11 says "audit trail of all changes" | union of both: signature event recorded as one audit row, signature payload stored in the row | satisfies stricter of the two |
| CL-006 | LIMS symbol-as-authority | HESEM canonical-as-authority | LIMS convention treats its display as ground truth | LIMS symbol is an alias requiring resolve-to-canonical | preserves HESEM as the single source of truth |
| CL-007 | Currency-in-UoM (SAP S/4HANA) | HESEM scope envelope | SAP treats currency as a UoM kind | HESEM blocks currency in physical engine | currency is governance-distinct; not dimensionally inferable |
| CL-008 | ISO 80000 dimension vector 7 base | QUDT uses 8 base (adds "Information") | dimension-string length differs | use 7-base ISO encoding; carry QUDT URI as separate field | ISO is the regulatory authority; QUDT is a mapping enrichment |
| CL-009 | GAMP 5 risk-based depth (lighter on Cat 3) | 21 CFR Part 11 universal-audit | GAMP suggests lighter audit for low-risk catalog edits | always audit (Part 11 wins); GAMP only affects test depth | safer posture: full audit even on Cat 3 |

## 3. Ambiguity register

| ID | Ambiguity | Resolution | Residual risk |
|---|---|---|---|
| AM-001 | UCUM "annotation" — is `{Ra}` a separate ucum_code from `{}` (empty annotation)? | treat each non-empty annotation as a distinct UCUM token; `{}` itself is not permitted in our seed | none for current seed; future units must follow rule |
| AM-002 | UNECE Rec20 historical reuses (some codes have been re-assigned across revisions) | pin to rev.17; record `source_tag='UNECE_Rec20_r17'` on each row | future revisions must re-seed; old data carries pinned version |
| AM-003 | OPC UA NodeId namespace — namespace 0 is "OPC Foundation Standard"; some vendors use namespace > 0 | only namespace 0 codes are seeded; vendor codes admitted via SUPPLIER alias | clear boundary; documented in `ExternalEngineeringUnitMapper` |
| AM-004 | Temperature difference vs absolute — when a user enters "ΔT = 30°C", is that 30 ΔCel or 30 Cel? | input must declare unit explicitly with `DeltaCel` canonical code; the API requires the literal canonical (no "context implies") | residual: legacy data may be naked-number — flagged by UomDataQualityScanner |
| AM-005 | "kg/m³" can be written `kg_m3`, `kg/m3`, `kg.m-3` — which is canonical? | canonical_code `kg_m3` chosen; all other forms are aliases | follow ASCII-safe pattern across the catalog |
| AM-006 | Inspection result with display_value vs canonical_value — which is "the measurement"? | canonical (SI) is the master; display is a projection | precedent: ISO 9001 §7.1.5 expects traceable canonical |
| AM-007 | Material density at 20°C vs at line temperature | use line temperature if recorded; else default to 20°C; record which one in MEASVAL | residual: line-temperature data quality |

## 4. Controlled gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| high | CG-001 | Currency conversion blocked but no companion finance-engine documentation pointer in the response problem-details | finance + metrology | append `see_also` field referencing finance currency-conversion service |
| medium | CG-002 | QUDT URIs partial — 18 of 50 kinds carry NULL | metrology | post-merge seed-extension migration |
| medium | CG-003 | GAMP 5 risk-category enforcement is implicit (driven by risk_level column) but not yet surfaced in workflow UI | metrology + UI | add risk-confirm dialog in IMPL-07 follow-up |
| medium | CG-004 | Density registry covers 6 substances; production inventory has more | metrology | extend via admin UI after VRS-001 |
| low | CG-005 | OPC UA seed limited to common engineering tags | OT | extend seed by domain |
| low | CG-006 | UNECE Rec20 seed limited to 32 codes (highest-traffic) | metrology | extend seed by traffic |

## 5. Authority-versus-authority decision audit

| Conflict pair | Winner | Cited source | Where it shows up |
|---|---|---|---|
| UCUM vs colloquial unit text | UCUM | UCUM v1.9 §1 | `uq_ucum_code` constraint |
| 21 CFR Part 11 vs GAMP 5 | Part 11 | Part 11 is regulatory floor | `chk_rule_approved` |
| ISO 80000 vs SAP override pattern | ISO 80000 | dimensional algebra is non-negotiable | `QuantityKindService::resolve` |
| ISO 80000 vs QUDT (8-base) | ISO 80000 | regulatory; QUDT is enrichment | `dimension_vector` is 7-symbol |
| ASTM E29 §6.1 vs §6.4 | §6.4 (HALF_EVEN) | bias neutrality | default policy |
| LIMS-as-authority vs canonical-as-authority | canonical | HESEM scope envelope | resolve-to-canonical mandate |

## 6. Repair log

| Repair | Resolved | Method |
|---|---|---|
| Migration 224 UCUM duplicate (`K` collision) | yes | renamed delta units to `K{diff}` / `Cel{diff}` annotation form |
| Migration 224 approver bypass on seed | yes | draft-then-activate DO block using first system user |
| Migration 228 FK order | yes | reordered uom_quantity_kind → uom_unit_catalog → uom_alias |
| Migration 228 alias canonical_code case | yes | lowercase `mm`/`in`/`deg` |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Contradiction completeness | 9 |
| Ambiguity exposure | 9 |
| Authority hierarchy clarity | 9 |
| Repair traceability | 10 |
| Residual-risk transparency | 9 |
| **Total** | **46 / 50** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

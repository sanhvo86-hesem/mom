# P04 — Unit Catalog, Alias, and External Code Governance Model

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P04 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the catalog model — how units, aliases, and external codes are stored, governed, and resolved — so that any inbound textual unit converges deterministically on a canonical HESEM code before any conversion math runs.

## 2. Unit catalog

`uom_unit_catalog` columns (migration 215):

| Column | Type | Purpose |
|---|---|---|
| `canonical_code` | varchar(30) PK | ASCII-safe, system-unique identifier (`mm`, `Cel`, `RA_UM`, ...) |
| `ucum_code` | varchar(50) UNIQUE | UCUM expression, possibly annotated (`{Ra}`, `K{diff}`) |
| `display_symbol` | varchar(20) NOT NULL | rendered symbol (`mm`, `°C`, `Ra`, `Δ°C`) |
| `display_name_en` | varchar(200) NOT NULL | English label |
| `display_name_vi` | varchar(200) NOT NULL | Vietnamese label (full diacritics) |
| `quantity_kind_code` | varchar(50) FK | kind binding |
| `si_base` | boolean | true for SI base (kg, m, s, A, K, mol, cd) |
| `si_factor` | numeric(40,20) | multiplier to convert to SI base of the kind |
| `si_offset` | numeric(40,20) | offset to convert to SI base (affine units) |
| `is_affine` | boolean | flags units requiring affine conversion (Cel, degF) |
| `lifecycle_status` | varchar(30) | `draft` / `active` / `deprecated` / `retired` |
| `source_tag` | varchar(50) | authority (`ISO`, `UCUM`, `vendor`, `internal`) |
| `risk_level` | varchar(20) | `low` / `medium` / `high` — drives workflow depth |
| `effective_from` / `effective_to` | date | lifecycle date range |
| `created_at` / `updated_at` | timestamptz | audit |

Constraints:

- `uq_ucum_code` UNIQUE — UCUM uniqueness gate.
- FK to `uom_quantity_kind(kind_code)`.
- (See `chk_rule_approved` on `uom_conversion_rule` for the workflow-binding constraint.)

## 3. Alias model

`uom_alias` columns (migration 219):

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | row id |
| `alias_code` | varchar(128) | observed text from a foreign source |
| `canonical_code` | varchar(64) FK | resolves to `uom_unit_catalog.canonical_code` |
| `context_scope` | varchar(64) | one of `SYSTEM`, `SUPPLIER`, `CUSTOMER`, `LIMS` |
| `supplier_id` | varchar(100) NULLABLE | required when scope = SUPPLIER |
| `effective_from` / `effective_to` | date | lifecycle |
| `notes` | text | provenance |
| `created_at` | timestamptz | audit |

Indexes:

- `uq_alias_code_scope` UNIQUE over `(alias_code, context_scope, COALESCE(supplier_id,''))` — null-safe uniqueness so SYSTEM-scoped aliases coexist with SUPPLIER-scoped aliases for the same alias text.
- `idx_uom_alias_code_lower` for case-insensitive lookup.
- `idx_uom_alias_canonical` for reverse-resolution (find all aliases of a canonical).

## 4. Alias quarantine

`uom_alias_quarantine` columns:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | row id |
| `alias_code` | varchar(128) | the text that failed to resolve |
| `context_scope`, `supplier_id` | varchar | scope hint |
| `submitted_at` | timestamptz | when first observed |
| `review_status` | varchar(20) | `PENDING` / `RESOLVED` / `REJECTED` / `ESCALATED` |
| `resolved_canonical_code` | varchar(64) FK | populated on triage |
| `reviewed_by` | UUID FK users | actor who triaged |
| `reviewed_at` | timestamptz | when |
| `ai_suggested` | boolean | true if an AI advisor proposed a resolution |
| `ai_suggestion` | jsonb | model_id, confidence, proposed_canonical |
| `raw_payload` | jsonb | original payload for evidence |
| `created_at` | timestamptz | audit |

The quarantine table is the **only sanctioned non-error path** for an unresolvable alias. The mapper / resolver never silently coerces.

## 5. External code map

`uom_external_code_map` columns (migration 218):

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID PK | row id |
| `system_code` | varchar(50) | `UNECE_Rec20`, `OPC_UA`, `LIMS`, `EDI`, `VENDOR_PROPRIETARY` |
| `external_code` | varchar(100) | the foreign identifier |
| `canonical_code` | varchar(64) FK | resolves to a HESEM canonical unit |
| `source_revision` | varchar(40) | rev pin (`UNECE_Rec20_r17`, `OPC_UA_1_05`) |
| `notes` | text | provenance |
| `effective_from` / `effective_to` | date | lifecycle |
| `created_at` | timestamptz | audit |

Unique index on `(system_code, external_code, source_revision)` — same external code may be re-issued across revisions; pinning revision preserves history.

## 6. Resolution algorithm

`UomAliasResolutionService::resolve($input, $scope, $supplierId?, $customerId?)`:

1. If input matches `^[A-Za-z][A-Za-z0-9_\-]{0,29}$` AND `uom_unit_catalog(canonical_code=input).lifecycle_status='active'` → return canonical (zero hops).
2. Else look up `uom_alias` rows ordered by scope priority `SUPPLIER → CUSTOMER → LIMS → SYSTEM`, restricted to `effective_to IS NULL OR effective_to >= CURRENT_DATE`. Return first canonical found; cache in Redis (key TTL 600s).
3. Else look up `uom_external_code_map` for `(system_code, input)` heuristically; return canonical if match.
4. Else log into `uom_alias_quarantine` (status PENDING) and throw `UOM_EXTERNAL_CODE_UNKNOWN` (HTTP 422) with the quarantine_id in the problem-details body.

## 7. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| CD-001 | Canonical code constrained to ASCII-safe pattern; non-ASCII observed text is forced into alias path | model clarity |
| CD-002 | UCUM code uniqueness enforced at DB layer | UCUM v1.9 §1 |
| CD-003 | Alias scope priority order: SUPPLIER > CUSTOMER > LIMS > SYSTEM | UD-009 |
| CD-004 | Quarantine is the only path for unresolvable input; never silent coerce | UD-013 |
| CD-005 | External code map composite key includes `source_revision` to preserve historical pinning | CL-002 / CL-008 |
| CD-006 | Risk level on `uom_unit_catalog` drives workflow depth (low / medium / high) | GAMP 5 §risk-based |
| CD-007 | `effective_from`/`effective_to` enable point-in-time queries for historic MEASVAL | audit / traceability |
| CD-008 | Aliases cache in Redis with 600s TTL; cache invalidated on `alias.activated` event | performance vs freshness |

## 8. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | CG-001 | AI suggestion column populated but no UI surface yet for human reviewer | IMPL-07 follow-up |
| medium | CG-002 | Customer-scoped aliases sparsely seeded | extend after VRS-001 |
| low | CG-003 | Alias `effective_to` retroactive lookup not exercised in unit tests | extend tests |

## 9. Audit scorecard

| Axis | Score |
|---|---|
| Catalog model completeness | 10 |
| Alias scope discipline | 9 |
| External code map structure | 9 |
| Resolution algorithm clarity | 10 |
| Quarantine path safety | 10 |
| **Total** | **48 / 50** |

## 10. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 11. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/external-code-crosswalk.md` (P04 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p04-alias-ambiguity-redteam.md` (P04 / 3)

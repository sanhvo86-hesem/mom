# P04 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P04-CLAIM-001 | `party`, `party_role`, `party_site`, `party_contact`, `uom`, `approval`, and `electronic_signature` already exist in migration `072`. | REPO_EVIDENCE | `mom/database/migrations/072_canonical_foundation_governance.sql` | High | false assumption that party/UOM are only target-state ideas | anchor blueprint to existing tables | verified |
| P04-CLAIM-002 | Canonical `item`, `item_revision`, `item_site`, and `item_spec` already exist in migration `073`. | REPO_EVIDENCE | `mom/database/migrations/073_canonical_master_data_core.sql` | High | schema plan could reinvent tables unnecessarily | use current canonical lane as target authority | verified |
| P04-CLAIM-003 | Legacy ERP master-data lane still exists in `items`, `item_revisions`, `bill_of_materials`, `routings`, and children. | REPO_EVIDENCE | `mom/database/migrations/006_erp_master_data.sql` | High | migration bridge could be omitted | define dual-lane bridge explicitly | verified |
| P04-CLAIM-004 | `control_plans`, `inspection_plans`, `approved_supplier_list`, and MES connectivity/tooling foundation tables already exist physically. | REPO_EVIDENCE | `042_fmea_apqp_control_plan_mobile.sql`; `011_quality.sql`; `035_supplier_quality_management.sql`; `026_mes_world_class_foundations.sql` | High | blueprint could overstate missing schema | map existing tables into authority packages | verified |
| P04-CLAIM-005 | `user_party_link` and `engineering_release_bundle` were not proven as existing tables in this repo review. | REPO_EVIDENCE | targeted migration search in this turn | High | blueprint could invent existing tables or miss missing ones | keep them as target additions only | verified |
| P04-CLAIM-006 | P03 locked `EngineeringReleaseBundle` as canonical release root and P04 must give it physical form without assigning a migration number. | BENCHMARK_PATTERN | `_reports/.../P03_canonical_mda_domain_root_and_object_taxonomy_lock_MAIN.md` | High | release authority would remain fragmented | define target tables and constraints only | verified |
| P04-CLAIM-007 | Current migration spec still requires staged JSON->PG modes, drift reports, fallback telemetry, and tested rollback before PG-only claims. | REPO_EVIDENCE | `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | High | unsafe cutover blueprint | include mode plan and rollback rules | verified |
| P04-CLAIM-008 | Runtime authority map still treats many domains as JSON-primary or partial shadow-write despite existing PG schema. | REPO_EVIDENCE | `docs/backend/RUNTIME_AUTHORITY_MAP.md` | High | blueprint could overclaim current readiness | separate “existing schema” from “current authority” | verified |

## Blueprint summary

1. Use existing `072` and `073` canonical tables as the foundation and item authority spine instead of designing parallel tables.
2. Keep legacy ERP item/BOM/routing tables as migration bridges during `SHADOW_WRITE` and `POSTGRES_PRIMARY`.
3. Add only the minimum missing canonical tables needed to realize P03 taxonomy:
   - `user_party_link`
   - `operator_qualification`
   - `engineering_release_bundle`
   - `engineering_release_bundle_member`
   - explicit approval tables for customer-item and supplier-process release where legacy JSON collections still dominate
4. Enforce effectivity and no-overlap rules on released revisions, tooling assemblies, and engineering bundles.
5. Keep projections such as `stock_balances` and runtime machine views read-only and lineage-marked.

## Migration authority decisions

- `party` package becomes the canonical target for customer/supplier convergence, but physical vendor/customer tables remain compatibility bridges until later migration prompts.
- canonical `item` lane becomes target authority; legacy `items` lane remains compatibility bridge until cutover.
- engineering release authority is not the same as child table ownership; released execution package is elevated into a separate bundle root.
- `approval` and `electronic_signature` remain shared governance infrastructure, not business roots.

## Decision token

`P04_PASS_WITH_CONTROLLED_GAPS`

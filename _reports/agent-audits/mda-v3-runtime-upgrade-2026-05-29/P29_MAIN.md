# P29 — Item, Material, Part Number, Revision, Site, Specification and Profile Authority

## 1. Executive Verdict

Decision token: `P29_PASS_WITH_CONTROLLED_GAPS`

P29 repaired the highest-risk item/revision ambiguity by adding a deterministic legacy key bridge, physical site profile authority, customer/supplier cross-reference authority, CTQ/CQA spec metadata, and released revision/spec immutability guards. It also added `ItemRevisionAuthorityService` with tests/smokes for the required P29 operational scenarios.

This is not runtime-complete item authority. P29 is a bounded runtime-proof slice. Command mutation, idempotency, audit/evidence, outbox, problem details, e-sign/re-auth, OpenAPI/generated registry refresh, and live PostgreSQL cutover remain owned by later prompts.

## 2. Source Truth Audit

Detailed audit: `P29_SOURCE_TRUTH_AUDIT.csv`

| Area | Repo Evidence | Verdict |
| --- | --- | --- |
| Canonical item root | `073_canonical_master_data_core.sql` has `item`, `item_revision`, `item_site`, `item_spec`, `item_attr`, and `item_class`. | Base exists. |
| Legacy item lane | `006_erp_master_data.sql`, `RuntimeShadowSync.php`, and `MasterDataLookupService.php` still use `items`/`item_revisions` compatibility paths. | Bridge required. |
| UOM dependency | P25 migration/service provide UOM authority and approved-release validation. | P29 consumes only, no UOM edits. |
| Party approval dependency | P28 migration provides customer/supplier approval tables. | P29 crossrefs reference them. |
| Registry/control | Governed entity registry and Generic CRUD hard stop exist. | P29 extends both for new tables. |
| Generated artifacts | `mom/contracts/table-registry.json` is generated and stale for P28/P29 tables. | Controlled gap, not hand-edited. |

Discovery command summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- Branch: `codex/mda-v3-runtime-upgrade-20260529`
- `git rev-parse --short HEAD` before P29: `349420739`
- Prompt-specific search confirmed canonical item tables, legacy item/revision tables, JSON/runtime bridge paths, and missing P29 crossref/profile authority before this prompt.

## 3. Runtime Evidence Probe

Added runtime artifacts:

- `mom/database/migrations/233_item_revision_profile_authority.sql`
- `mom/api/services/ItemRevisionAuthorityService.php`
- `mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php`

`ItemRevisionAuthorityService::authorityProbe()` reports:

- item authority: `item`
- revision authority: `item_revision`
- legacy bridge authority: `item_legacy_key_bridge`
- site profile authority: `item_site_profile_authority`
- spec authority: `item_spec`
- customer crossref authority: `item_customer_crossref_authority`
- supplier crossref authority: `item_supplier_crossref_authority`
- UOM release dependency: `UomAuthorityService::assertUomApprovedForRelease`
- Generic CRUD mutation allowed: `false`

Runtime authority audit still reports `JSON_ONLY` and PostgreSQL not configured/reachable, so no PostgreSQL-primary claim is made.

## 4. Files Changed

Created:

- `mom/database/migrations/233_item_revision_profile_authority.sql`
- `mom/api/services/ItemRevisionAuthorityService.php`
- `mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php`
- `P29_SOURCE_TRUTH_AUDIT.csv`
- `P29_IMPLEMENTATION_PLAN.md`
- `P29_SIMULATION_MATRIX.csv`
- `P29_ADVERSARIAL_AUDIT.md`
- `P29_GAP_LEDGER_UPDATE.csv`
- `P29_HANDOFF_PACKET.md`
- `P29_MAIN.md`

Modified:

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`

Intentionally not changed:

- UOM migration/service/test files, to avoid cross-session collision.
- `mom/contracts/table-registry.json`, because it is generated.
- Order/PO/SO/WO command paths, because P31/P34/P36 own command/runtime integration.

## 5. Design And Code Delta

Schema:

- `item_legacy_key_bridge` maps legacy JSON/ERP item and revision keys to canonical UUIDs.
- `item_site_profile_authority` owns site-scoped planning/procurement/storage/quality/cost profiles.
- `item_customer_crossref_authority` and `item_supplier_crossref_authority` own effective customer/supplier part/revision mappings and link to P28 approval authorities.
- `item_revision` gains release lineage fields and `item_spec` gains CTQ/CQA, UOM, measurement method, evidence, and released snapshot metadata.
- PostgreSQL triggers block direct updates to released revision technical fields and any insert/update/delete against specs for released revisions.

Service:

- Blocks direct edits to released revision technical fields.
- Blocks revision release when base UOM is missing or not approved.
- Blocks CTQ/CQA release specs without measurement method.
- Blocks customer part/revision mismatch and missing supplier crossrefs.
- Blocks ECO behavior that mutates running WO snapshot fields.

Registry:

- `MDA-ITEM-REVISION-SPEC` now lists P29 authority tables and commands.
- Generic CRUD fallback denylist now includes P29 authority tables.

## 6. Simulation Matrix Summary

Detailed matrix: `P29_SIMULATION_MATRIX.csv`

Covered scenarios:

- released revision direct edit blocked.
- draft UOM blocks revision release.
- customer PN/revision mismatch blocks SO line validation.
- missing supplier approved item blocks PO line validation.
- ECO/new revision cannot mutate running WO snapshot.
- CTQ/CQA spec without measurement method blocks release.
- generated registry lag cannot reopen generic mutation because fallback denylist blocks P29 tables.

## 7. Adversarial Audit Summary

Detailed audit: `P29_ADVERSARIAL_AUDIT.md`

Highest residual risks:

- P31 command envelope is still required for all P29 governed mutations.
- P32 e-sign/re-auth/SoD is still required for regulated releases.
- P30 must physicalize full engineering release package and hash-freeze BOM/routing/control plan/inspection plan bundles.
- P36 must consume site profile and crossref authority for inventory/WIP/cost gates.
- P37/P40 must execute live cutover evidence and generated artifact refresh.

## 8. Gap Ledger Update

Detailed update: `P29_GAP_LEDGER_UPDATE.csv`

P29 partially repaired:

- `GAP-P06-001`: deterministic bridge for item/revision legacy keys.
- `GAP-P06-002`: physical customer/supplier crossrefs.
- `GAP-P06-003`: UOM-backed revision release gate.
- `GAP-P06-004`: physical site profile authority.

New controlled gaps:

- `P29-NEW-001`: generated table registry is stale.
- `P29-NEW-002`: live PostgreSQL migration not applied/proven.
- `P29-NEW-003`: PHPUnit runner unavailable in local checkout.

## 9. CI And Test Evidence

Commands run:

```bash
php -l mom/api/services/ItemRevisionAuthorityService.php
php -l mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php
php -l mom/api/controllers/GenericCrudController.php
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
python3 -m json.tool mom/contracts/governed-entities.json
php -r 'require "mom/api/services/UomAuthorityService.php"; require "mom/api/services/ItemRevisionAuthorityService.php"; ...'
php mom/tools/release/check_user_identity_ssot.php || true
php mom/tools/audit_runtime_authority_consistency.php || true
php mom/tools/release/check_migration_drift.php || true
composer test -- --filter Item, || true
composer --working-dir=mom test -- --filter ItemRevisionAuthorityServiceTest || true
npm test -- --runInBand 2>/dev/null || true
```

Observed:

- PHP syntax passed for new service, test, and touched controller.
- Bulk service/controller PHP lint passed.
- Governed entity JSON is valid.
- Direct PHP smoke returned `item_revision_smoke_ok`.
- SSOT guard returned `user identity ssot clean`.
- Runtime authority audit still reports `JSON_ONLY`, PostgreSQL not configured/reachable.
- Migration drift check reports only existing P2 prefix collisions for `108`, `115`, and `188`; no P1/fatal issues.
- Root Composer has no `test` command.
- `composer --working-dir=mom test` cannot open `vendor/bin/phpunit`.
- `npm test -- --runInBand` produced no runnable output.

## 10. Decision Token

`P29_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff Packet

See `P29_HANDOFF_PACKET.md`.

# P29 Implementation Plan

## Scope

P29 implements a small vertical runtime-proof slice for item, revision, site profile, specification, and customer/supplier cross-reference authority. The target is deterministic gates and physical authority surfaces, not final production readiness.

## Files To Edit

- `mom/database/migrations/233_item_revision_profile_authority.sql`
- `mom/api/services/ItemRevisionAuthorityService.php`
- `mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Files Forbidden For This Prompt

- UOM authority files, except read-only consumption through `UomAuthorityService`.
- `mom/contracts/table-registry.json`, because it is generated.
- User identity SSOT files and identity writers.
- Broad order, BOM, routing, quality, inventory, or shopfloor command paths owned by later prompts.

## Runtime Delta

- Add `item_legacy_key_bridge` to prevent guessing between canonical and legacy item/revision keys.
- Add `item_site_profile_authority` for site-specific planning, procurement, storage, quality, and cost profile ownership.
- Add `item_customer_crossref_authority` and `item_supplier_crossref_authority` tied to P28 approval authorities.
- Extend `item_revision` and `item_spec` with release/snapshot/CTQ/CQA metadata.
- Add PostgreSQL triggers that block direct technical edits to released revisions and released revision specs.
- Add `ItemRevisionAuthorityService` with deterministic pre-release, cross-reference, and ECO snapshot guards.
- Add unit-test specifications and direct smoke coverage for the required P29 operational simulations.

## Repair Decisions

- Keep P29 as `PASS_WITH_CONTROLLED_GAPS`, because live DB migration, command envelope, e-sign, outbox, and generated registry refresh are not closed in this prompt.
- Register generated registry lag as a controlled gap instead of hand-editing a generated artifact.
- Consume UOM release validation without touching P25 files to avoid cross-session collision.

## Verification Plan

- PHP lint for new service, test, and touched controller.
- Bulk PHP lint for `mom/api/services/*.php` and `mom/api/controllers/*.php`.
- JSON validation for `mom/contracts/governed-entities.json`.
- Direct PHP smoke for released revision edit block, draft UOM block, and customer revision mismatch.
- Runtime authority audit to prove no false PostgreSQL readiness claim.
- Migration drift check.
- `git diff --check`.

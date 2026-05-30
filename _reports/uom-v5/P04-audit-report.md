# P04 Audit Report

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

## Static Audit

- REPO_EVIDENCE: `approveManifest()` now reads actor identity from `v_user_canonical`, satisfying the user identity SSOT read rule.
- REPO_EVIDENCE: Permission authority is `roles.permissions` JSONB through `uom.standard_library_manifest.approve`; no frontend-only role string guard was added.
- REPO_EVIDENCE: The service rejects non-UUID actors before any approval mutation, covering AI/system free-text actor paths.
- REPO_EVIDENCE: The service rejects usernames matching service/system prefixes when a UUID actor exists.
- REPO_EVIDENCE: `approveManifest()` requires explicit signature meaning before activation.
- REPO_EVIDENCE: Audit payload includes actor, permission, source authority, before/after state, trace ID, and signature meaning.
- REPO_EVIDENCE: `linkRuleToManifest()` requires active/effective manifest and rejects context-required categories `density_based`, `potency_assay`, and `packaging_policy`.
- REPO_EVIDENCE: `updated_at` was removed from link-rule SQL because `uom_conversion_rule` schema does not define that column.

## First-User Inventory

- REPO_EVIDENCE: `mom/database/migrations/224_uom_seeds.sql` still contains `SELECT user_id ... ORDER BY created_at ASC LIMIT 1`; this is historical applied migration evidence.
- REPO_EVIDENCE: `mom/database/migrations/231_uom_v3_lifecycle_governance.sql` still contains the V3 development/prototype bridge; this is historical applied migration evidence.
- REPO_EVIDENCE: `mom/database/migrations/257_uom_v5_manifest_human_approval_lock.sql` does not use first registered user selection. It uses manifest evidence to quarantine bridge-activated rows.

## Permission Audit

- REPO_EVIDENCE: Permission catalog row is inserted in migration 257.
- REPO_EVIDENCE: Granting is data-driven by existing `docs.approve` plus `audit.export` authority in `roles.permissions`.
- REPO_EVIDENCE: Explicit deny in `roles.permissions.denies` overrides grant in service permission evaluation.
- CONTROLLED_GAP: The migration does not infer site-specific QA ownership beyond existing permissions. Site-specific RBAC tuning remains administrator-governed.

## Audit Event Replay

- REPO_EVIDENCE: Approval event `uom.standard_library_manifest.approve` records before/after manifest state, actor, permission, source authority, signature meaning, and trace ID.
- REPO_EVIDENCE: Link event `uom.standard_library_manifest.link_rule` records before/after rule state, actor, permission, manifest code/id, source authority, and trace ID.
- INFERENCE: These payloads are sufficient to replay who approved what, under which permission, and which manifest was bound to a rule.

## Audit Result

P04 audit result: PASS_WITH_WARNINGS.

Warnings are limited to historical migration evidence and unrelated KPI full-suite failure. No P04-introduced P0/P1 defect remains open.

# P04 Adversarial Critique

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

1. Multi-site, supplier, language risk:
   - INFERENCE: A single permission key is correct for a platform-level approval gate, but site/supplier scoping is not yet encoded. P12/P13 should add resource-scope policy if manifest approvals become site-specific.

2. Factor-only affine/log/contextual risk:
   - REPO_EVIDENCE: P04 does not change conversion math. It explicitly blocks contextual rule categories from standard manifest sponsorship.
   - OUT_OF_SCOPE_BLOCKER: Full affine/logarithmic handler audit remains P05.

3. Naked number risk:
   - REPO_EVIDENCE: P04 does not add transaction/form/API numeric capture.
   - OUT_OF_SCOPE_BLOCKER: Naked number search across forms/API remains P09/P10/P11.

4. Canonical unit or alias quarantine bypass:
   - REPO_EVIDENCE: P04 only links existing `uom_conversion_rule` rows by UUID.
   - OUT_OF_SCOPE_BLOCKER: Alias quarantine remains P06.

5. AI create/approve/e-sign risk:
   - REPO_EVIDENCE: Non-UUID actors are rejected; service/system-like usernames are rejected; signature meaning is required.
   - CONTROLLED_GAP: If a service account is incorrectly stored as a normal active user with a human-looking username, policy enforcement depends on identity governance outside this service.

6. Permission impersonation risk:
   - REPO_EVIDENCE: P04 uses `roles.permissions` JSONB and no frontend-only role key.
   - REPO_EVIDENCE: Migration grants by existing permission evidence instead of hardcoded frontend role names.

7. Schema/service drift:
   - REPO_EVIDENCE: P04 removed `updated_at` from `uom_conversion_rule` update SQL because the table does not define that column.
   - REPO_EVIDENCE: PHPStan and focused tests pass.

8. Cache stale rule risk:
   - REPO_EVIDENCE: P04 does not modify conversion cache resolution.
   - OUT_OF_SCOPE_BLOCKER: P05/P13 own cache invalidation around effective date, context, and lifecycle.

9. Rollback risk:
   - REPO_EVIDENCE: Migration 257 includes rollback comments for permission catalog and role JSONB grant removal.
   - INFERENCE: Data quarantine rollback should be manual because re-activating rules without real approval would recreate the defect.

10. Historical replay:
   - REPO_EVIDENCE: Approval/link audit events include before/after state, actor, permission, source authority, and trace ID.
   - INFERENCE: This is enough for manifest approval replay; conversion measurement replay remains P09.

Adversarial result: PASS_WITH_WARNINGS. Residual risks are assigned to later prompts and do not block P05.

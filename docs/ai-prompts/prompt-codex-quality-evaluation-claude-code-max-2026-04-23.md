# Prompt — Claude Code MAX Quality Evaluation of Codex Translation Remediation

You are auditing the HESEM MOM/QMS repo in the current runtime checkout root provided by the caller/runtime.

Use that checkout path for all commands and file references.
Do not hardcode `/Users/a10/Documents/mom`.

Your job is not only to audit the controlled-document translation workflow.
Your job is to **evaluate the quality of Codex's remediation work itself** by checking whether the repo truth now matches the claimed architecture, standards, and validation story.

## Mission

Verify whether Codex actually delivered a stable translation workflow with these properties:

- `vi` is the only editable canonical source
- `en` is a backend-managed locale artifact
- browser live translation is gone from the controlled workflow
- file-backed authoring writes use `/api/v1/eqms/control-plane/documents/*`
- backend auto-sync runs after create/save/submit-review/approve
- draft/review EN preview does not corrupt or erase the last released EN artifact
- draft/in-review `vi` and `en` resolve against the same active working source baseline
- the repo standards/docs now tell future AI agents to use the canonical workflow instead of legacy `?action=doc_*` writes

You must verify repo truth. Do **not** trust prior summaries, claims, or closure language without checking the code and docs directly.

## Mandatory reading

1. `docs/standards/01-immutable-rules.md`
2. `docs/standards/23-portal-standard-title-filename-ssot.md`
3. `docs/standards/33-api-mapping-per-module.md`
4. `docs/standards/35-language-convention.md`
5. `docs/standards/37-document-translation-publication-workflow.md`
6. `docs/backend/API_FRONTEND_CONTRACT_POLICY.md`
7. `docs/backend/document-header-compliance.md`
8. `docs/backend/portal-document-display-convention.md`
9. `docs/ai-prompts/prompt-translation-reaudit-claude-code-max-2026-04-23.md`

## Files you must inspect

- `mom/assets/app.js`
- `mom/scripts/portal/00-block-engine.js`
- `mom/scripts/portal/01-data-config.js`
- `mom/scripts/portal/02-state-auth-ui.js`
- `mom/scripts/portal/04-workflow-actions.js`
- `mom/scripts/portal/05-workflow-panel.js`
- `mom/scripts/portal/11-dcc-header-renderer.js`
- `mom/api/controllers/DocumentController.php`
- `mom/api/controllers/CanonicalDocumentAuthoringController.php`
- `mom/api/controllers/DocumentControlController.php`
- `mom/api/routes/core-routes.php`
- `mom/api/routes/dcc-routes.php`
- `mom/api/routes/eqms-control-plane-routes.php`
- `mom/api/services/DocumentControl/DocumentControlService.php`
- `mom/api/services/DocumentControl/DocumentHeaderService.php`
- `mom/api/services/DocumentControl/DocumentLocaleAutomationService.php`
- `mom/api/docs/api-reference.html`
- `mom/api/openapi.yaml`
- `mom/database/migrations/150_dcc_document_change_control.sql`
- `mom/database/migrations/152_dcc_document_locale_variants.sql`
- `tools/scripts/translation/dcc_argos_vi_to_en.py`
- `tools/vps-setup/scripts/setup-dcc-translation-provider.sh`
- `tools/vps-setup/php-fpm/mom.conf`

## Audit questions

1. Did Codex fully migrate portal/frontend document writes off legacy `?action=doc_*` routes?
2. Did Codex accidentally leave any remaining legacy write path reachable from the product UI?
3. Does `submit-review` now participate in backend EN auto-sync exactly like create/save/approve?
4. Can translated or polluted DOM still be saved back into the Vietnamese source anywhere?
5. Can the English tab ever silently fall back to Vietnamese body content when no EN artifact exists?
6. Does DCC locale projection truly drive artifact selection, title/subtitle projection, and fail-closed behavior?
7. Can `start-new-revision` or draft/review transitions falsely invalidate a hash-matching EN preview?
8. Can draft/review auto-translation overwrite, delete, or orphan the last released EN artifact?
9. When draft/review state is deleted and the document returns to approved baseline, is the released EN artifact restored correctly?
10. Are repo docs/standards/openapi/api-reference now aligned with the canonical control-plane authoring surface?
11. Did Codex introduce any new architectural shortcut, partial closure, or misleading documentation while claiming completion?
12. Did Codex run an honest validation set and report real blockers accurately, instead of hiding debt behind vague language?
13. Did Codex provide a repo-truth internal provider path for legacy bootstrap and post-save EN machine preview, or leave the runtime blocked on undocumented server-only setup?

## Hard constraints

1. Do **not** reintroduce Google Translate or any browser translation widget.
2. Do **not** accept “looks fine” or summary-only reasoning.
3. Do **not** stop at advisory findings if a safe repo fix is available.
4. If you find a real bug in Codex’s remediation and it is safe to fix, fix it directly.
5. If a concern is a larger architectural boundary and cannot be safely fixed in this pass, classify it explicitly as a real residual risk or boundary blocker.

## Required workflow

### Phase 1 — Deep audit

List findings ordered by severity with:

- file path
- exact line references
- what Codex got wrong or left incomplete
- why it matters to runtime correctness, authority, or future AI behavior

### Phase 2 — Fix

If a finding is safely fixable inside this repo, implement the fix.

### Phase 3 — Reaudit

Reinspect the same surfaces after your fixes.
If your first fix exposes a second-wave issue, fix that too.

### Phase 4 — Validation

Run the maximum safe subset:

- `composer --working-dir=mom analyse -- --memory-limit=1G`
- `composer --working-dir=mom test`
- `php tools/scripts/ai-index/generate.php --verbose`

If full analysis is blocked, still run at minimum:

- `php -l` on touched PHP files
- `node --check` on touched JS files
- targeted grep checks for legacy write paths, Google Translate, and host-specific bridge URLs
- proof that any claimed translation-provider enablement comes from active runtime state, not commented template config alone

## Mandatory grep checks

Confirm the final state with grep or equivalent:

- no active runtime usage of `translate.google.com`
- no active runtime `?action=doc_create`
- no active runtime `?action=doc_save_draft`
- no active runtime `?action=doc_submit_review`
- no active runtime `?action=doc_approve`
- no active runtime `?action=doc_reject`
- no active runtime `?action=doc_delete_drafts`
- no active runtime `?action=doc_delete_version`
- no active runtime `?action=doc_start_new_revision`
- no active controlled source `https://qms.hesem.com.vn/assets/app.js`
- canonical file-backed authoring writes route through `/api/v1/eqms/control-plane/documents/*`
- `tools/vps-setup/php-fpm/mom.conf` is treated as template guidance only unless active runtime state proves enablement

## Final deliverable

Return these sections in order:

1. `Findings`
2. `Fixes Applied`
3. `Reaudit Result`
4. `Validation Run`
5. `Residual Risks`
6. `Codex Quality Verdict`

For `Codex Quality Verdict`, grade Codex on these dimensions:

- `Correctness`
- `Completeness`
- `Architectural alignment`
- `Regression safety`
- `Docs/source-of-truth alignment`
- `Validation rigor`
- `Honesty of closure claims`

For each dimension, give:

- `Pass`, `Borderline`, or `Fail`
- one short evidence-based justification

End with a blunt overall conclusion:

- `Codex remediation is production-credible`
- or `Codex remediation is materially incomplete`

Choose only one.

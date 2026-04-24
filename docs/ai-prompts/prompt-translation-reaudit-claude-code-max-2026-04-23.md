# Prompt — Translation Workflow Reaudit and Remediation

You are auditing the HESEM MOM/QMS repo in the current runtime checkout root provided by the caller/runtime.

Use that checkout path for all commands and file references.
Do not hardcode `/Users/a10/Documents/mom`.

Your task is to **deeply reaudit and then fix** the controlled-document translation workflow.

## Mission

The platform must support:

- `vi` canonical source for controlled document editing
- `en` read-only locale artifact for viewing
- backend-triggered English auto-sync after create/save/submit-review/approve
- canonical control-plane authoring under `/api/v1/eqms/control-plane/documents/*`
- locale-aware DCC metadata
- fail-closed behavior when English artifact is missing
- zero browser live translation

## Mandatory standards to read first

1. `docs/standards/01-immutable-rules.md`
2. `docs/standards/23-portal-standard-title-filename-ssot.md`
3. `docs/standards/35-language-convention.md`
4. `docs/standards/37-document-translation-publication-workflow.md`
5. `docs/backend/document-header-compliance.md`
6. `docs/backend/portal-document-display-convention.md`

## Hard constraints

1. Do **not** reintroduce Google Translate or any browser MT widget.
2. Do **not** allow translated DOM to be saved back into the Vietnamese master.
3. Do **not** hardcode absolute production URLs into controlled HTML.
4. Do **not** create locale artifacts as standalone scanned documents.
5. Do **not** treat English filename/title SSOT as proof that English body content is canonical.
6. Do **not** fake successful English publication when no compliant internal translator is configured.

## Audit focus

You must inspect and challenge at least these areas:

- `mom/assets/app.js`
- `mom/scripts/portal/00-block-engine.js`
- `mom/scripts/portal/01-data-config.js`
- `mom/scripts/portal/02-state-auth-ui.js`
- `mom/scripts/portal/04-workflow-actions.js`
- `mom/scripts/portal/11-dcc-header-renderer.js`
- `mom/scripts/portal/05-workflow-panel.js`
- `mom/api/controllers/DocumentControlController.php`
- `mom/api/controllers/DocumentController.php`
- `mom/api/controllers/CanonicalDocumentAuthoringController.php`
- `mom/api/routes/dcc-routes.php`
- `mom/api/routes/eqms-control-plane-routes.php`
- `mom/api/services/DocumentControl/DocumentControlService.php`
- `mom/api/services/DocumentControl/DocumentHeaderService.php`
- `mom/api/services/DocumentControl/DocumentLocaleAutomationService.php`
- `mom/database/migrations/150_dcc_document_change_control.sql`
- `mom/database/migrations/152_dcc_document_locale_variants.sql`
- `tools/scripts/translation/dcc_argos_vi_to_en.py`
- `tools/vps-setup/scripts/setup-dcc-translation-provider.sh`
- `tools/vps-setup/php-fpm/mom.conf`

Also inspect any rename/move/delete flow that can break `artifact_rel_path`.

## Expected audit questions

1. Can any current viewer path still bypass locale-aware artifact selection?
2. Can any current save/submit path still capture translated or polluted DOM?
3. Can any current doc still contain an absolute bridge URL or wrong relative bridge path?
4. Does DCC locale projection fully drive title/subtitle/status/artifact selection?
5. Does the portal fail closed in English when artifact is missing?
6. Can a move/rename/delete silently orphan locale artifacts?
7. Are non-HTML files handled safely when English artifact is missing?
8. Are any standards/docs still contradicting the no-live-translation model?
9. Does create/save/submit-review/approve trigger a backend locale-sync attempt without risking Vietnamese source persistence?
10. When no internal provider is configured, does the repo record `blocked` state truthfully instead of inventing an EN artifact?
11. Does the portal use `controlPlaneDocumentAuthoringRequest(...)` everywhere for file-backed authoring instead of falling back to `?action=doc_*` writes?
12. Can a draft or in-review document keep rendering a hash-matching English artifact after `start-new-revision` without exposing stale mixed-language content?
13. Can draft/review auto-translation overwrite or delete the last released English artifact before release, or fail to restore it when the workflow returns to the released baseline?
14. Do `vi` and `en` draft/in-review views resolve against the same active working source carrier/revision baseline?
15. Can a legacy document with no locale row self-bootstrap an EN machine preview through the governed backend path?
16. Is the configured provider path repo-local/on-prem and reproducible from repo truth instead of manual tribal setup?

## Required output shape

### Phase 1 — Findings

List findings ordered by severity with:

- file path
- exact line references
- bug/risk description
- why it breaks the controlled translation workflow

### Phase 2 — Fix

Implement the fixes directly in the repo.

### Phase 3 — Reaudit

Reinspect the same surfaces after your fixes.
If you find a second-wave issue created or exposed by the first fix, fix it too.

### Phase 4 — Verification

Run the maximum safe subset:

- `composer --working-dir=mom analyse -- --memory-limit=1G`
- `composer --working-dir=mom test`
- `composer --working-dir=mom check`

If full suite is blocked, run targeted validation at minimum:

- `php -l` on touched PHP files
- targeted JS/grep checks for removed Google Translate / host-specific bridge URLs
- targeted migration syntax review
- live/runtime proof review for translation provider enablement, rather than inferring enablement from template config alone

## Mandatory grep checks

Confirm the final state with grep or equivalent:

- no active runtime usage of `translate.google.com`
- no new `data-dcc-locale="en"` hardcoded into canonical Vietnamese docs unless explicitly justified
- no `https://qms.hesem.com.vn/assets/app.js` in active controlled source
- no fallback path that opens Vietnamese source while English tab is active and no English artifact exists
- auto-translation trigger logic lives on backend create/save/submit-review/approve orchestration, not on browser-side DOM translation
- file-backed authoring writes route through `/api/v1/eqms/control-plane/documents/*`
- `tools/vps-setup/php-fpm/mom.conf` is treated as template guidance only unless active runtime env proves enablement

## Fix quality bar

Do not stop at advisory comments.
If you identify a repo-truth bug and it is safely fixable in this repo, fix it.

If you cannot fix something safely, document:

- exact blocker
- exact impacted file/path
- exact next remediation step

## Final deliverable

Return:

1. findings
2. changes made
3. verification actually run
4. residual risks only if still real

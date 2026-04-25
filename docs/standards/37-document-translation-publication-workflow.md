# 37 - Document Translation Publication Workflow

> Mandatory workflow for controlled-document language switching in HESEM MOM/QMS.
> This standard exists to prevent browser live-translation, mixed-language renders, and translated-DOM save corruption.

## 1. Scope

Applies to:

- controlled HTML documents rendered in the portal
- DCC header metadata and portal document listings
- future AI-created or AI-edited SOP/WI/ANNEX/MAN/POL/JD/TRN documents
- non-HTML controlled files when a localized release artifact exists

This file governs `language switching and publication workflow`.
It does **not** replace the editorial Vietnamese-writing rules in `03-language-and-translation.md`.

## 2. Non-Negotiable Rules

1. `vi` canonical source is the only editable document source for controlled content.
2. `en` is a published locale artifact, not a second editable source.
3. Browser live translation is forbidden.
4. Google Translate, DOM mutation, hidden browser widgets, or post-render text replacement must never be used as the controlled English mechanism.
5. The portal must fail closed when `en` is requested but no matching English locale artifact exists.
6. Fail-closed means:
   - no fallback to browser-translated DOM
   - no mixed `English title + Vietnamese body`
   - no save/submit/edit from translated locale views
7. Frontend shell text must come from authoritative locale resources, not MT.
8. Metadata locale projection must come from DCC authority, not filename guessing or ad hoc JSON fallback.

## 3. Authority Model

### 3.1 Canonical source

- Canonical body source: Vietnamese controlled source HTML/file
- Canonical naming SSOT: `23-portal-standard-title-filename-ssot.md`
- Canonical header row: `mom/database/migrations/150_dcc_document_change_control.sql` → `dcc_document_header`

### 3.2 Locale projection authority

- Locale metadata/artifact authority: `dcc_document_locale_variant`
- Frontend shell authority: locale resources / `{vi,en}` runtime structures already governed by frontend standards
- DCC label authority: `dcc_document_header_label`

### 3.3 Prohibited authority

The following are never authoritative for English publication:

- Google Translate output
- translated iframe DOM
- copied browser text from a translated session
- temporary prompt output that is not persisted as a controlled artifact

## 4. Required Runtime Model

When the user switches to English:

1. Frontend shell rerenders from locale resources.
2. DCC metadata is fetched with locale-aware projection.
3. Document viewer loads the `en` artifact if and only if the locale variant says it is renderable.
4. A renderable English artifact may be a read-only preview (`machine_preview`, `review_pending`, `reviewed`) or a released artifact.
5. If no valid English artifact exists, the viewer shows an explicit unavailable state.

When the user switches to Vietnamese:

1. Frontend shell rerenders from locale resources.
2. DCC metadata returns to Vietnamese/default projection.
3. For `approved/released`, document viewer loads the canonical Vietnamese source.
4. For `draft/in_review`, Vietnamese and English views must resolve against the same active working source carrier/revision baseline.

## 5. Locale Variant States

Allowed `translation_state` values:

- `machine_preview`
- `review_pending`
- `reviewed`
- `released`
- `superseded`
- `blocked`

Render rule:

- `machine_preview`, `review_pending`, `reviewed`, `released` may render only when a valid artifact exists.
- Renderability is driven by DCC locale projection, not by browser locale alone.
- For `draft` and `in_review`, a hash-matching English artifact may remain renderable even if the working revision number has just advanced, as long as the current working source body still matches the artifact baseline.
- `superseded` and `blocked` must not render as the active locale view.
- missing row = no locale artifact published.

## 6. File Placement Rule

English HTML artifacts must be stored as a hidden sibling artifact so the main document scan does not register them as standalone controlled docs.

Required pattern:

- source: `mom/docs/.../sop-501-example.html`
- English artifact: `mom/docs/.../_sop-501-example.en.html`
- working preview artifact: `mom/docs/.../_sop-501-example.preview_r1_1.en.html`

Rules:

1. Artifact filename begins with `_`.
2. Artifact keeps the same folder as the source file unless a stricter controlled store is defined later.
3. Artifact keeps the same relative link environment as the source file.
4. Draft/in-review preview artifacts may be revision-scoped hidden siblings, but they must still start with `_` and remain scan-safe.
5. Released artifact path must remain stable; draft/review preview generation must not overwrite or delete the last released English artifact before the source lifecycle actually advances.
6. Artifact is never scanned as a normal document card.
7. Artifact paths must never use hardcoded absolute production hosts.

## 7. Header And Metadata Rule

1. `doc-name` / standard title naming still obeys `23-portal-standard-title-filename-ssot.md`.
2. Naming SSOT is not the same thing as authoring SSOT.
3. English filename/title SSOT does not authorize editing English body content as the master source.
4. Locale-specific subtitle/description shown in portal or DCC must come from locale projection, not heuristics.

## 8. Edit And Save Rule

1. Users and AI must edit only the Vietnamese canonical source.
2. English view is read-only.
3. Save / submit / approve flows must not serialize translated DOM back into canonical source.
4. Any runtime that is currently in `en` must switch back to `vi` before edit/save/submit.
5. Existing-document edit/save/submit/bootstrap authority follows document-editor authority (`canEditDocs` or stricter), not only create-document authority.
6. New-document creation remains separately governed by create-document authority (`canCreateDocs` or stricter).

## 9. Translation Production Workflow

Required flow:

1. Edit Vietnamese canonical source.
2. Save and validate canonical source.
3. Backend accepts the save on the canonical path first; English generation must never block Vietnamese persistence.
4. Backend automatically triggers English locale sync for the saved source revision.
5. Generate or update English artifact.
6. Update `dcc_document_locale_variant` with localized subtitle/title and artifact path.
7. Set `translation_state`.
8. Review terminology, links, and controlled header content.
9. Publish/release English artifact only after the source revision and artifact match.

### 9.1 Save-trigger automation rule

The automation trigger for English generation MUST live on the backend command/save path, not in frontend DOM code.

Rules:

1. The trigger fires after create/save/submit-review/approve writes the Vietnamese source successfully.
2. The canonical runtime path for file-backed authoring is the control-plane REST surface under `/api/v1/eqms/control-plane/documents/*`, not the legacy `?action=doc_*` routes.
3. Backend workflow-edit gates for save/submit/bootstrap must accept governed document editors, not only document creators.
4. The Vietnamese save result is authoritative even if translation fails.
5. The translation provider must be internal/on-prem/repo-local.
6. AI or SaaS translators may be plugged in only when governance explicitly allows the document content to leave the private boundary.
7. If no compliant internal provider is configured, the backend MUST still upsert a locale-variant row with:
   - current source revision
   - current source hash
   - `translation_state = blocked`
   - a machine-readable blocked reason in metadata
8. The backend MUST NOT fake an English artifact when no provider exists.
9. The frontend English tab must surface `blocked` truthfully instead of pretending the artifact is simply published-later content.

### 9.2 Provider contract rule

The preferred runtime contract is:

1. Backend saves Vietnamese source.
2. Backend calls a trusted translation provider contract with:
   - `doc_code`
   - source locale / target locale
   - current revision
   - current normalized source HTML
   - approved repo-local glossary path/version
   - trigger reason (`create`, `save_draft`, `submit_review`, `approve_release`, `bootstrap_locale`, ...)
3. Provider returns:
   - full English artifact HTML
   - optional localized subtitle/title
   - provider name
   - engine version
   - glossary version derived from the resolved glossary file actually used
   - target `translation_state`
4. Backend writes hidden-sibling artifact and upserts the locale row.

### 9.2.1 Provider setup rule

1. The provider command must be reproducible from repo truth, not tribal knowledge.
2. Repo-local provider scripts belong under `tools/scripts/translation/`.
3. VPS/bootstrap setup for provider dependencies belongs under `tools/vps-setup/scripts/`.
4. PHP-FPM/runtime environment must point `DCC_TRANSLATION_COMMAND` at a concrete repo-local command, typically:
   - provider venv Python
   - repo-local provider script
5. If the provider runtime or model is missing, the system must fail into `blocked` truthfully.
6. `machine_preview` output may be rough and still useful, but it must remain non-authoritative until human review/release.

### 9.3 Working-draft hash rule

For draft and in-review documents, source-hash truth must follow the current working source, not only the last released live file.

That means:

1. hash comparison for locale renderability must use the active working draft when the document lifecycle is `draft` or `in_review`;
2. archive-only path rewrites such as injected archive `<base href>` must be normalized out before hashing;
3. starting a new revision without content changes must not falsely invalidate a still-matching English artifact;
4. exact revision equality is not enough by itself to invalidate a draft/in-review English preview when the current working source hash still matches the artifact baseline.

### 9.4 Legacy backfill rule

Older controlled documents created before locale auto-sync existed must still be able to obtain an English artifact without reopening the Vietnamese editor.

Rules:

1. Legacy bootstrap/backfill belongs to backend scripts, scheduled workers, admin repair tools, or deploy/prewarm jobs.
2. Normal portal viewing must not trigger translation provider execution.
3. Backfill must use the current canonical Vietnamese source snapshot; it must never translate rendered iframe DOM.
4. Backfill may create a `machine_preview` artifact for view purposes, but it must not silently mark the artifact as released.
5. Backfill success must refresh DCC locale projection so the next English read loads the stored artifact directly.
6. Backfill failure must leave the viewer fail-closed and surface truthful `missing`, `pending`, or `blocked` state.

### 9.5 Proactive prewarm rule

English generation must not depend on the user opening the English tab.
Opening the English tab is a pure read path. It must not enqueue, spawn, or call
the translation provider.

Rules:

1. Create/save-draft/submit-review/approve must enqueue English generation after the Vietnamese source write succeeds.
2. A scheduled backend prewarm job must scan all controlled DCC HTML documents, compute the current normalized source hash, and compare it with `dcc_document_locale_variant.artifact_source_hash_sha256`.
3. If the locale row is missing, blocked, stale, points to a missing artifact path, or has a source hash mismatch, the prewarm job must enqueue a translation job.
4. Prewarm must store queued jobs in backend-controlled queue storage and start a bounded number of background workers; it must not run unbounded provider calls inside a request or a page open.
5. Worker concurrency must be governed by runtime configuration such as `DCC_TRANSLATION_WORKER_SLOTS`; adding workers must not overload PHP-FPM or the VPS.
6. The prewarm service must be installed as VPS/system service or equivalent scheduler, not as browser JavaScript.
7. Repeated prewarm runs must be idempotent: a matching queued job or renderable current artifact must not create duplicate work.
8. The English tab must prefer the already-published backend artifact and must not wait for provider execution in the foreground.
9. If prewarm is still processing, the portal shows pending/block truthfully and continues polling projection metadata without rendering Vietnamese body content in the English viewer.
10. Queue drain order should prioritize smaller source jobs first, then older jobs, so a few large manuals cannot block fast publication of many short training/forms artifacts.
11. Deploy must kick the prewarm service after healthcheck when the internal provider is configured.
12. Healthcheck must report queued/failed locale jobs and active workers so operators cannot confuse "provider configured" with "all English artifacts ready".
13. System schedulers must run translation workers as managed foreground children or dedicated worker services; a `oneshot` service must not start orphaned `nohup` workers that systemd can kill when the parent exits.
14. Runtime artifact cache is an acceleration layer only. Cache write failure must be logged and surfaced in metadata, but it must not prevent hidden-sibling artifact publication or DCC locale-variant upsert when the primary artifact write succeeds.
15. The recommended operating model is batch/asynchronous document translation: source hash detection, queued provider work, durable artifact publication, and pure-read locale switching.

### 9.6 Anti-flicker locale viewer rule

When `lang=en`, the portal must never load the Vietnamese source iframe first and then replace it with English or pending state. That behavior creates visible mixed-language jitter and undermines fail-closed trust.

Rules:

1. Before rendering a document iframe in English mode, the portal must refresh the DCC locale projection or use an already fresh projection.
2. If the projection has a renderable artifact, load only that artifact.
3. If the projection is missing, stale, blocked, or pending, load only the explicit unavailable/pending card.
4. Do not post `setLang('en')` into a Vietnamese source iframe as a translation mechanism.
5. Do not reload the iframe when a background refresh returns the same locale mode, file path, and translation state.
6. Polling may reload the iframe only after the projection changes from unavailable/pending to a renderable English artifact.

## 10. Drift And Regeneration Rule

Whenever the Vietnamese source changes, the English locale variant must be treated as stale until regenerated or re-approved.

Minimum tracked fields:

- `artifact_source_revision`
- `artifact_source_hash_sha256`
- `translation_provider`
- `glossary_version`
- `engine_version`

If these do not match the current source baseline, the English artifact must not be presented as released truth.
If regeneration is attempted but no compliant provider is available, the locale row must move to `blocked` truthfully.

## 11. Terminology And No-Translate Rule

The following must remain protected from free translation unless an approved standard says otherwise:

- document codes
- role codes
- department/function codes
- ISO / AS / IATF clause references
- filenames, paths, ids, classes, data attributes
- system/brand names locked by `01` and `03`

Glossary and no-translate handling must be applied before publishing English artifacts.

## 12. AI Mandatory Checklist

Any AI creating or editing a controlled document must do all of the following:

1. Edit Vietnamese source only.
2. Never use browser live translation as a publication mechanism.
3. Never persist absolute host-specific bridge URLs into controlled HTML.
4. Keep artifact path hidden-sibling and scan-safe.
5. Update DCC locale projection when English artifact changes.
6. Verify both `vi` and `en` viewer behavior.
7. If English artifact does not exist yet, leave the viewer fail-closed state intact.

## 13. Minimum Verification

Before closing any translation-related change:

1. `vi` source opens normally.
2. `en` opens the artifact when available.
3. `en` shows explicit unavailable state when no artifact exists.
4. edit/save/submit in `en` is blocked.
5. no controlled HTML contains a hardcoded production bridge URL.
6. no new artifact file is discoverable as a standalone scanned document.
7. prewarm/backfill dry-run reports stale/missing artifacts by source hash.
8. English viewer does not flash or reload through Vietnamese source content during locale switch.

## 14. Read Together With

- `01-immutable-rules.md`
- `02-folder-and-naming.md`
- `03-language-and-translation.md`
- `23-portal-standard-title-filename-ssot.md`
- `35-language-convention.md`

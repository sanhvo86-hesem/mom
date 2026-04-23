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
5. The portal must fail closed when `en` is requested but no approved/published English artifact exists.
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
4. If no valid English artifact exists, the viewer shows an explicit unavailable state.

When the user switches to Vietnamese:

1. Frontend shell rerenders from locale resources.
2. DCC metadata returns to Vietnamese/default projection.
3. Document viewer loads the canonical Vietnamese source.

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
- `superseded` and `blocked` must not render as the active locale view.
- missing row = no locale artifact published.

## 6. File Placement Rule

English HTML artifacts must be stored as a hidden sibling artifact so the main document scan does not register them as standalone controlled docs.

Required pattern:

- source: `mom/docs/.../sop-501-example.html`
- English artifact: `mom/docs/.../_sop-501-example.en.html`

Rules:

1. Artifact filename begins with `_`.
2. Artifact keeps the same folder as the source file unless a stricter controlled store is defined later.
3. Artifact keeps the same relative link environment as the source file.
4. Artifact is never scanned as a normal document card.
5. Artifact paths must never use hardcoded absolute production hosts.

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

## 9. Translation Production Workflow

Required flow:

1. Edit Vietnamese canonical source.
2. Save and validate canonical source.
3. Generate or update English artifact.
4. Update `dcc_document_locale_variant` with localized subtitle/title and artifact path.
5. Set `translation_state`.
6. Review terminology, links, and controlled header content.
7. Publish/release English artifact only after the source revision and artifact match.

## 10. Drift And Regeneration Rule

Whenever the Vietnamese source changes, the English locale variant must be treated as stale until regenerated or re-approved.

Minimum tracked fields:

- `artifact_source_revision`
- `artifact_source_hash_sha256`
- `translation_provider`
- `glossary_version`
- `engine_version`

If these do not match the current source baseline, the English artifact must not be presented as released truth.

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

## 14. Read Together With

- `01-immutable-rules.md`
- `02-folder-and-naming.md`
- `03-language-and-translation.md`
- `23-portal-standard-title-filename-ssot.md`
- `35-language-convention.md`

# Portal Document Display Convention

Updated: 2026-03-21

## Required portal structure

Every document card in the portal should render in this order:

1. `Document code`
2. `Standard title / file name` in English
3. `Vietnamese description`

This applies to:

- folder file list
- search results
- executive shortcut cards
- document viewer header

## Runtime source priority

The portal now uses these helpers:

- `getDocDisplayTitle(doc)` in [01-data-config.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/01-data-config.js)
- `getDocDisplayDescription(doc)` in [01-data-config.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/01-data-config.js)

Display title priority:

1. Keep `doc.title` when it is already an English standard title.
2. If a legacy HTML file still uses a Vietnamese `<title>`, derive the English title from the file name/path.

Display description priority:

1. `qms-data-private/config/doc_descriptions.json`
2. Legacy localized HTML title when it differs from the English display title
3. `qms-data-private/config/folder_descriptions.json`

## Maintenance rules for future imports

- HTML documents: keep the `<title>` as the English standard title, not the Vietnamese summary.
- Excel forms: keep `form_control_registry.json -> title` in English.
- Put the Vietnamese explanation in `qms-data-private/config/doc_descriptions.json`.
- If the document only needs a generic description by folder, keep `folder_descriptions.json` updated.
- Do not mix the English title and Vietnamese description into the same field.

## Post-import checklist

After replacing a document package, verify at least one sample from each active group:

- `02-Tai-Lieu-He-Thong`
- `03-Tai-Lieu-Van-Hanh`
- `04-Bieu-Mau`
- `10-Training-Academy`

For each sample, confirm:

1. line 1 shows the correct document code
2. line 2 shows the English standard title
3. line 3 shows the Vietnamese description
4. search finds the document by code, English title, and Vietnamese description

## Legacy compatibility note

The portal can temporarily recover English titles from file names for legacy HTML docs that still carry Vietnamese `<title>` values. Treat this as a compatibility layer only, not the long-term source of truth.

The preferred target state is still:

- English title in document metadata
- Vietnamese description in `doc_descriptions.json`

# Portal Document Display Convention

Updated: 2026-03-25

## Required portal structure

Every document card in the portal should render in this order:

1. `Document code`
2. `Standard title / file name` in English
3. locale-specific subtitle/description from the authoritative locale projection

This applies to:

- folder file list
- search results
- executive shortcut cards
- document viewer header

## Runtime source priority

The portal uses these helpers:

- `getDocDisplayTitle(doc)` in `01-QMS-Portal/scripts/portal/01-data-config.js`
- `getDocDisplayDescription(doc)` in `01-QMS-Portal/scripts/portal/01-data-config.js`

Display title priority:

1. Keep SSOT standard title / filename authority per `23-portal-standard-title-filename-ssot.md`.
2. Do not invent an English title by browser translation.

Display description priority:

1. `dcc_document_locale_variant` when a locale variant exists
2. canonical DCC subtitle when the active locale is the canonical source
3. explicit runtime config fallback only for legacy Vietnamese display, never as English publication authority

## Locale delivery rule

- The portal must not use browser live translation.
- The portal must not infer English body content from Vietnamese HTML at render time.
- If the user requests English and no English artifact exists, the viewer must fail closed.

## Boundary rule

- `doc_descriptions.json` and `folder_descriptions.json` are runtime configuration files for the live portal.
- Controlled source for the portal page code and static documentation lives in the SharePoint-synced source tree and Git path defined by [ANNEX-136](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html).
- Runtime config files are not the same thing as controlled source artifacts unless they are explicitly promoted through the approved source path.

## Maintenance rules

- HTML documents: keep the `<title>` as the English standard title, not the Vietnamese summary.
- Excel forms: keep `form_control_registry.json -> title` in English.
- Put the Vietnamese explanation in `01-QMS-Portal/qms-data/config/doc_descriptions.json`.
- If the document only needs a generic description by folder, keep `01-QMS-Portal/qms-data/config/folder_descriptions.json` updated.
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

## References

- [ANNEX-136](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html)
- [WI-107](../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html)

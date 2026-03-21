# Portal Document Display Audit

Date: 2026-03-21

## Scope

Audit target:

- portal file list
- search results
- executive shortcut cards
- viewer header

Data snapshot was built from:

- live document tree under [qms.hesem.com.vn](/C:/Users/TEST4/qms.hesem.com.vn)
- [form_control_registry.json](/C:/Users/TEST4/qms-data-private/config/form_control_registry.json)
- [doc_descriptions.json](/C:/Users/TEST4/qms-data-private/config/doc_descriptions.json)
- [folder_descriptions.json](/C:/Users/TEST4/qms-data-private/config/folder_descriptions.json)

## Current status

- 607 document entries were scanned from the live tree plus form registry.
- 485 entries already have explicit Vietnamese descriptions in `doc_descriptions.json`.
- 122 entries currently rely on folder-level Vietnamese fallback from `folder_descriptions.json`.
- 0 entries are missing the third-line description after the `10-FRM-CONTROL` folder metadata was added.

## Follow-up recommendation

The `04-Bieu-Mau/10-FRM-CONTROL` documents now render a generic Vietnamese third line from folder metadata. If any of these need a more specific description, add per-document entries in [doc_descriptions.json](/C:/Users/TEST4/qms-data-private/config/doc_descriptions.json):

- `DESKTOP-EXCEL-ENDPOINT-BASELINE`
- `EDITORIAL-CONSISTENCY-AUDIT`
- `FORM-CONTROL-REGISTER`
- `FORM-RELEASE-CHECKLIST`
- `FORM-VERSIONING-MODEL`
- `PERIODIC-CONTROL-CADENCE`
- `PILOT-ENDPOINT-ROLLOUT-PACK`
- `PRODUCTION-ACCEPTANCE-UAT-PACK`
- `SERVER-DELIVERY-ROLLOUT-CHECKLIST`
- `SERVER-STACK-PROFILE-LIBRARY`
- `SOURCE-IMPORT-REGISTER`

## Operational note

Legacy HTML documents may still carry localized `<title>` values. The portal UI now compensates for that by showing:

1. document code
2. English standard title derived from metadata or file path
3. Vietnamese description from document metadata or folder fallback

This compatibility behavior reduces layout drift after package replacements, but future imports should still normalize metadata at the source.

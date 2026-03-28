# 23 - Portal Standard Title and Filename SSOT

> Scope: `01-QMS-Portal` document management UI + API (`doc_create`, `rename_doc`, scan cache).

## A. Root Rule (Mandatory)

1. Field `Tên file / tiêu đề chuẩn` is the SSOT for controlled document naming.
2. SSOT value must be English/ASCII only (no Vietnamese diacritics).
3. SSOT value must stay aligned with physical filename (same semantic title).
4. SSOT value must stay aligned with document header title (`<title>`, header `<strong>`, first `<h1>`).

## B. Non-Negotiable Constraints

1. Do not translate SSOT title to Vietnamese.
2. Do not keep a separate Vietnamese title in the SSOT field.
3. Vietnamese text belongs in `Mô tả tiếng Việt` only.
4. Any change to SSOT title must trigger physical rename + cross-reference update.

## C. Rename Behavior Standard

When user edits document code or SSOT title in portal:

1. API computes canonical target filename from `code + SSOT title`.
2. Physical file is renamed to canonical filename.
3. Cross-references in HTML are updated (`old path/name -> new path/name`).
4. Header title blocks are synced to `CODE - SSOT title`.
5. Metadata registry (`docs_custom`) is synced to the same SSOT title.

## D. Governance Notes

1. This rule overrides any older practice that translated browser/doc titles to Vietnamese.
2. Future updates are not allowed to re-introduce Vietnamese SSOT titles.
3. If bulk rename is needed, use the same portal rename flow so link updates run safely.


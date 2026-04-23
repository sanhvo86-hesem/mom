# 23 - Portal Standard Title and Filename SSOT

> Scope: `01-QMS-Portal` document management UI + API (canonical document create flow, `rename_doc`, scan cache).

## A. Root Rule (Mandatory)

1. Field `Tên file / tiêu đề chuẩn` is the SSOT for controlled document naming.
2. SSOT value must be English/ASCII only (no Vietnamese diacritics).
3. SSOT value must stay aligned with physical filename (same semantic title).
4. SSOT value must stay aligned with document header title (`<title>`, header `.doc-name`, first `<h1>`).
5. `Mã tài liệu` in portal edit flow must stay aligned with header meta code.
6. `Mô tả tiếng Việt` in portal edit flow must stay aligned with the header note/subtitle (`.sub-vn`).
7. Naming SSOT is not authoring SSOT; English filename/title authority does not make English body content the editable master source.

## B. Non-Negotiable Constraints

1. Do not translate SSOT title to Vietnamese.
2. Do not keep a separate Vietnamese title in the SSOT field.
3. Vietnamese text belongs in `Mô tả tiếng Việt` only.
4. English locale artifacts must be governed by `37-document-translation-publication-workflow.md`, not by filename heuristics or browser translation.
5. Any change to SSOT title must trigger physical rename + cross-reference update.
6. Header `.doc-name` must render SSOT title only; it must not prepend the document code and must not contain Vietnamese translation text.
7. Browser `<title>` and first `<h1>` may include `CODE - SSOT title`, but the visible header title block must render only the SSOT title in English/ASCII.
8. Header actor rows (`Chủ sở hữu`, `Phê duyệt`) must render linked JD/department chips, not raw plain text.
9. This header rule applies equally to published WI/ANNEX/SOP/FRM/JD pages and portal-generated online form runtimes.

## C. Rename Behavior Standard

When user edits document code or SSOT title in portal:

1. API computes canonical target filename from `code + SSOT title`.
2. Physical file is renamed to canonical filename.
3. Cross-references in HTML are updated (`old path/name -> new path/name`).
4. Header `.doc-name` is synced to `SSOT title` only.
5. Browser `<title>` and first `<h1>` are synced to `CODE - SSOT title`.
6. Metadata registry (`docs_custom`) is synced to the same SSOT title.
7. Header meta row for `Mã:` is synced to the edited document code.
8. `Mô tả tiếng Việt` field updates the published header subtitle/note and its metadata registry entry.
9. Portal-generated draft HTML must preserve the current shared header structure and must not fall back to plain-text owner/approver values ​​when linkable role chips are available.

## D. Governance Notes

1. This rule overrides any older practice that translated browser/doc titles to Vietnamese.
2. Future updates are not allowed to re-introduce Vietnamese SSOT titles.
3. If bulk rename is needed, use the same portal rename flow so link updates run safely.

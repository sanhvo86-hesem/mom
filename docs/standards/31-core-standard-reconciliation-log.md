# 31 — Core Standard Reconciliation Log

> Purpose: compare `core-standards/` with the old background document, portal/runtime, config registry and some release documents to lock the clear part, and isolate the conflicting or unclear points that need to be decided by the system owner.

---

## A. Sources collated

- `core-standards/01-immutable-rules.md`
- `core-standards/03-language-and-translation.md`
- `core-standards/05-html-templates.md`
- `core-standards/09-versioning-and-workflow.md`
- `core-standards/11-html-structure-guide.md`
- `core-standards/23-portal-standard-title-filename-ssot.md`
- `general_note.md`
- `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- `01-QMS-Portal/qms-data/config/docs_custom.json`
- `01-QMS-Portal/qms-data/config/form_control_registry.json`
- `01-QMS-Portal/qms-data/config/form_release_workflow.json`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html`
- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html`
- `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html`
- `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/*.html`

---

## B. Part reconciled and locked

1. **Rename governance**
   `01-immutable-rules.md` and `23-portal-standard-title-filename-ssot.md` are reconciled in the direction of: prohibiting manual renaming outside the box; Standard rename is only allowed through the portal's control flow to synchronize filename + SSOT title + header + link update.

2. **Header examples**
   `03-language-and-translation.md` has been adjusted so that the header example uses `{{OWNER_ROLE_HTML}}` / `{{APPROVER_ROLE_HTML}}`, matching `05-html-templates.md`, `11-html-structure-guide.md` and current published docs.

3. **Tooling paths**
   The path standard for the translation engine and dictionary is locked to:
   - `tools/engines/context_translate_engine.py`
   - `tools/data/qms-terminology-dictionary.xlsx`
   - `tools/data/remaining-english-words.xlsx`

4. **WI base template**
   `templates/wi-template.html` has been pulled up to the same header standard as the remaining templates: Vietnamese metadata label, `HESEM ENGINEERING`, owner/approver according to actor HTML chips.

5. **README authority order**
   `README.md` has a clear hierarchy of application to avoid `general_note.md` or implementation drift overriding the base standard.

---

## C. Conflict needs to be decided

### D-01. Canonical name of the SharePoint owner group

**Source is off**
- `01-immutable-rules.md` and `03-language-and-translation.md` use `QMS-Owner`
- `annex-136-...html` uses `QMS-Owners`
- `tools/scripts/role-system/normalize_job_order_role_system.py` has cluster `QMS-Owners / QMS-IT-Administrators`

**Options**
1. The `QMS-Owner` pin is canonical.
2. The `QMS-Owners` pin is canonical.
3. Separation of meaning: `QMS-Owners` is the real group on the tenant; `QMS-Owner` is just a legacy label/display alias and must be phased out.

**Impact**
- Affects all M365/SharePoint standards, script provisions, architectural annexes and operating instructions.
- Do not bulk rename in the standard or script until you confirm the correct group name on the tenant.

### D-02. Revision model cho lần phát hành đầu tiên

**Source is off**
- `09-versioning-and-workflow.md` uses models `V0 (Draft)` and `V0 (Published)`
- `general_note.md` is also describing `V0` for both draft and initial release
- `03-language-and-translation.md` before reconciliation each describes `V1, V2, V3...` as released versions
- `01-QMS-Portal/qms-data/config/form_control_registry.json` and `form_release_workflow.json` are leaning towards the `V0`-first model

**Options**
1. Keep `V0` as the first released revision.
2. Switch to `V1.0` for first release; `V0` is just a draft.

**Impact**
- Option 1 has less impact on the current system.
- Option 2 is closer to common document control practices, but requires a migration plan for portal, registration, form naming and training material.

### D-03. Canonical format of owner metadata in registry/config

**Source is off**
- `01`, `07`, `19`, `23` prohibit ambiguous placeholders and require owner/approver according to role code, department code or published bundle
- `01-QMS-Portal/qms-data/config/docs_custom.json` and `form_control_registry.json` still have values ​​of type `Top Management / QA/QMS`, `HR Manager / Department Heads / Training owners`

**Options**
1. Allows the registry to keep the free-text owner string; Only published HTML will render chips/links when possible.
2. Standardize the registry to actor canonical (`role code`, `department code`, approved bundle) and gradually eliminate placeholders.

**Impact**
- Option 1 requires less data migration but continues to maintain ambiguity in the source data.
- Option 2 is cleaner and more consistent with the core standard, but requires cleanup of the registry and mapping logic.

### D-04. The metadata label is in the Department Handbook

**Source is off**
- `01-immutable-rules.md` locks the metadata header label in Vietnamese (`Mã`, `Phiên bản`, `Ngày hiệu lực`, `Chủ sở hữu`, `Phê duyệt`)
- `templates/department-handbook-template.html` and published handbooks are using English labels (`Code`, `Version`, `Effective Date`, `Owner`, `Approved by`)

**Options**
1. Keep the Department Handbook as an exception using English labels.
2. Standardize the Department Handbook to the same set of Vietnamese labels as SOP/WI/JD/ANNEX.

**Impact**
- Option 1 needs to clearly state the exception in the standard.
- Option 2 requires updating the template + the entire published handbook.

---

## D. Unclear points need confirmation

### U-01. Owner input in quick-create portal

`01-QMS-Portal/scripts/portal/02-state-auth-ui.js` now collects ownership via a `<select>` plain value. There is not enough evidence to conclude whether this is just a temporary input in the draft creation step or the main source-of-truth for the header actor rows after publishing.

### U-02. `general_note.md`'s role later

This file has been kept backward compatible, but still contains some old content that no longer matches the new core standards. Need confirmation will:
1. keep as quick summary legacy, or
2. completely rewrite to mirror `core-standards/`.

---

## E. Remaining normalized debt in key `core-standards/`

The following files still have a significant amount of unaccented Vietnamese / half-English in the document body, although their standard logic is generally clear:

- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `22-jd-header-and-department-code-governance.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`

This is an **editorial/language debt**, not a new governance decision. When doing the next polishing round in `core-standards/`, priority should be given to normalizing these files to:

1. Vietnamese has full accents;
2. consistent title/heading;
3. Locked terms at `01`, `03`, `19`, `20`, `23`, `25`.

---

## F. Interim rules before decision

1. If there is a conflict, apply the hierarchy in `README.md`.
2. Do not manually change the canonical name of the SharePoint security group until the tenant is confirmed.
3. Newly released documents continue to use actor chips/links for owner/approver in all document types that already have clear standards.
4. With the Department Handbook, keep the current implementation until D-04 is finalized.
5. With model revision, do not change the running runtime/config until D-02 is finalized.

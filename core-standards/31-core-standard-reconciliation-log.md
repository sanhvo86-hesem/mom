# 31. Core Standard Reconciliation Log

> Purpose: compare `core-standards/` against legacy reference notes, portal/runtime behavior, registries, and released documents; lock what is already clear; and isolate the points that still need an owner decision.

---

## A. Sources Reviewed

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

## B. Reconciled and Locked Items

1. **Rename governance**
   `01-immutable-rules.md` and `23-portal-standard-title-filename-ssot.md` were reconciled around one rule: manual rename outside the governed flow is prohibited. Canonical rename is allowed only through the portal-controlled flow so filename, SSOT title, header, and downstream links stay synchronized.

2. **Header examples**
   `03-language-and-translation.md` was aligned so header examples use `{{OWNER_ROLE_HTML}}` / `{{APPROVER_ROLE_HTML}}`, matching `05-html-templates.md`, `11-html-structure-guide.md`, and current published documents.

3. **Tooling paths**
   The canonical paths for translation tooling and glossary data are locked to:
   - `tools/engines/context_translate_engine.py`
   - `tools/data/qms-terminology-dictionary.xlsx`
   - `tools/data/remaining-english-words.xlsx`

4. **README hierarchy**
   `README.md` now explicitly states application hierarchy so legacy summary files and implementation drift do not override the core standards.

5. **English note policy**
   The note/markdown layer under `core-standards/` is now treated as English-first documentation, while HTML templates under `core-standards/templates/` remain unchanged.

---

## C. Conflicts That Still Need a Decision

### D-01. Canonical SharePoint owner-group name

**Conflicting sources**
- `01-immutable-rules.md` and `03-language-and-translation.md` use `QMS-Owner`
- `annex-136-...html` uses `QMS-Owners`
- `tools/scripts/role-system/normalize_job_order_role_system.py` contains `QMS-Owners / QMS-IT-Administrators`

**Options**
1. Lock `QMS-Owner` as canonical.
2. Lock `QMS-Owners` as canonical.
3. Split the meaning: `QMS-Owners` is the real tenant group, while `QMS-Owner` is only a legacy display label that must be phased out.

**Impact**
- Affects M365/SharePoint standards, provisioning scripts, architecture annexes, and operating instructions.
- Do not bulk rename the standard or scripts until the real tenant group name is confirmed.

### D-02. First-release revision model

**Conflicting sources**
- `09-versioning-and-workflow.md` uses `V0 (Draft)` and `V0 (Published)`
- `general_note.md` also describes `V0` for both draft and first release
- `03-language-and-translation.md` historically described `V1, V2, V3...` as released versions
- `01-QMS-Portal/qms-data/config/form_control_registry.json` and `form_release_workflow.json` currently lean toward a `V0-first` model

**Options**
1. Keep `V0` as the first released revision.
2. Move to `V1.0` for the first released revision and keep `V0` for draft only.

**Impact**
- Option 1 is lighter for the current system.
- Option 2 is closer to common document-control practice, but requires a portal/registry/training migration plan.

### D-03. Canonical owner metadata format in registry/config

**Conflicting sources**
- `01`, `07`, `19`, and `23` prohibit ambiguous placeholders and require owner/approver rendering from published role code, department code, or bundle actors
- `01-QMS-Portal/qms-data/config/docs_custom.json` and `form_control_registry.json` still contain free-text values such as `Top Management / QA/QMS` and `HR Manager / Department Heads / Training owners`

**Options**
1. Allow free-text owner strings to remain in registry/config and only normalize published HTML when possible.
2. Standardize registry/config data to canonical actors (`role code`, `department code`, approved bundle) and phase out placeholders.

**Impact**
- Option 1 requires less migration but preserves source-data ambiguity.
- Option 2 is cleaner and more consistent with the core standard, but requires cleanup and actor-mapping logic.

### D-04. Department Handbook metadata labels

**Conflicting sources**
- `01-immutable-rules.md` locks header metadata labels in Vietnamese (`M?`, `Phi?n b?n`, `Ng?y hi?u l?c`, `Ch? s? h?u`, `Ph? duy?t`)
- `templates/department-handbook-template.html` and published handbooks use English labels (`Code`, `Version`, `Effective Date`, `Owner`, `Approved by`)

**Options**
1. Keep Department Handbook as an explicit English-label exception.
2. Standardize Department Handbook to the same Vietnamese metadata labels used in SOP/WI/JD/ANNEX documents.

**Impact**
- Option 1 requires the exception to be stated explicitly in the standard.
- Option 2 requires template updates and handbook-wide remediation.

---

## D. Unclear Points That Need Confirmation

### U-01. Owner input in the quick-create portal

`01-QMS-Portal/scripts/portal/02-state-auth-ui.js` currently collects ownership through a plain `<select>` value. There is not enough evidence yet to confirm whether this is only a temporary draft-creation input or a real source-of-truth for published header actor rows.

### U-02. Future role of `general_note.md`

`general_note.md` is still being kept for backward compatibility, but it continues to contain legacy content that no longer fully matches the new core standards. It still needs a governance choice:

1. keep it as a quick legacy summary, or
2. rewrite it so it mirrors `core-standards/`.

---

## E. Residual Editorial Risk After the English Rewrite

The English rewrite of note/markdown files is complete for this pass. Remaining risk is now editorial, not governance:

- several long files were translated in bulk and should still be spot-reviewed for phrasing quality;
- Vietnamese literal labels intentionally remain inside backticks/examples where the standard is describing released UI or header labels;
- contradiction items D-01 to D-04 and unclear items U-01 to U-02 are still open until an owner decision is made.

---

## F. Interim Rule Until Decisions Are Made

1. If a conflict appears, apply the hierarchy in `README.md`.
2. Do not rename SharePoint security-group terminology until the real tenant group name is confirmed.
3. Newly released documents should keep using actor chips/links for owner/approver wherever the standard is already clear.
4. Do not change the live revision/runtime model until D-02 is formally decided.
5. Treat unresolved owner metadata in registry/config as provisional data, not canonical governance.


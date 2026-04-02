# HESEM QMS — Core Standards

> Set of foundation standards for the entire QMS documentation system of HESEM ENGINEERING.
> Everyone (AI or human) creating/editing QMS documents **MUST** read and comply with the files in this folder.

---

## Purpose

The `core-standards/` directory contains immutable rules, naming conventions, directory structure, and language/translation rules for the entire eQMS system. This is the **single source of truth** for all decisions about document format, structure, and language.

---

## Hierarchy of application

1. `01-immutable-rules.md` is the highest standard.
2. When `01` does not speak directly, thematic thematic files (`19`, `20`, `22`, `23`, `24`...) trump older general files.
3. `05-html-templates.md`, `11-html-structure-guide.md`, portal/runtime, and release documentation are proof of deployment; If it deviates from the standard, fix the implementation according to the standard, do not pull the standard back according to the drift.
4. `general_note.md` and `rule_update_content.md` are backward compatibility/summary documents; If it conflicts with `core-standards/` then `core-standards/` wins.
5. Points that have not been finalized after comparison are recorded at `31-core-standard-reconciliation-log.md`.

---

## Required reading order

| # | File | Content |
|---|------|----------|
| 1 | `01-immutable-rules.md` | Rules that should NEVER be broken — read first |
| 2 | `02-folder-and-naming.md` | Full directory map and file naming conventions |
| 3 | `03-language-and-translation.md` | Language rules, translation, dictionary of terms |

**Ghi nhớ:** Đọc `01-immutable-rules.md` trước khi làm bất kỳ điều gì. File này chứa các quy tắc mà nếu vi phạm sẽ phá vỡ tính nhất quán của toàn bộ hệ thống.

---

## List of files

**Language lock rule:** all Vietnamese content displayed to users in documents, dashboards, tooltips, placeholders and UI strings rendered from JavaScript **MUST** have full and accurate accents. In the SOP, English is only allowed when it belongs to the locked exception list in `03-language-and-translation.md`: standard abbreviation, proper noun system/brand, `Setup`, `Traveler`, `Balloon`, `Kaizen`, `Dreyfus`, `Pareto`, `Kolb`, `Poka-yoke`.

### Main standards (read in order)

| # | File | Content |
|---|------|----------|
| 01 | `01-immutable-rules.md` | Immutable rules: file names, abbreviations, brand colors, SSOT, SharePoint List names, Internal Column names |
| 02 | `02-folder-and-naming.md` | Directory tree to level 3, naming pattern SOP/WI/ANNEX/JD/FRM/Training |
| 03 | `03-language-and-translation.md` | Translate English→Vietnamese, 100+ abbreviations kept the same, multi-meaning words |
| 04 | `04-html-design-system.md` | **CSS design system v13** — variables, table, note, badge, metric, gate, print |
| 05 | `05-html-templates.md` | Copy-paste template for SOP/WI/ANNEX/JD/Training/Handbook |
| 06 | `06-excel-form-standards.md` | 6 types of Excel forms (A-F), specs, dropdowns |
| 07 | `07-content-writing-guide.md` | Intonation, sentence structure, MUST/Should/Could |
| 08 | `08-document-types.md` | Standard outline of 6 types of documents |
| 09 | `09-versioning-and-workflow.md` | V0→V2, DCR, cross-review, approval workflow |
| 10 | `10-expansion-roadmap.md` | Future expansion planning |
| 11a | `11-html-structure-guide.md` | **HTML file structure** — header, body, table, box, print |
| 11b | `11-ai-tooling-and-reports.md` | AI tools, scripts, reports organization |
| **12** | **`12-sop-section-6-7-guide.md`** | **⭐ Section 6 (IG table) + Section 7 (Procedure flow) — IMPORTANT; IG independent of step count** |
| **13** | **`13-sop-research-redraft-method.md`** | **⭐ Method to research and rewrite SOP according to each document — required before editing Section 3 / 6 / 7** |
| **14** | **`14-m365-sharepoint-architecture.md`** | **⭐ M365 SharePoint 4-site architecture: topology, libraries, permissions, online forms, sync mechanism** |
| **15** | **`15-evidence-and-records-naming.md`** | **⭐ Operating profile naming rules: 6 naming patterns, RecordType dictionary, UserID, Record-ID, version control** |
| **16** | **`16-sop-graphics-kpi-and-redraft-quality.md`** | **⭐ Lock flowchart graphic standards, KPI Section 6, V0 draft hygiene and checklist against mechanical updates when creating/editing SOPs** |
| **17** | **`17-sop-sections-1-5-8-alignment-guide.md`** | **⭐ Lock the way to write Sections 1, 2, 3, 4, 5, 8 according to the actual gate/step logic of the SOP, avoid writing the first part and exceptions separately from operations** |
| **18** | **`18-online-vs-offline-form-decision-framework.md`** | **⭐ Online vs Offline form decision framework: 7 scoring criteria, quick rules, classification of 117 forms, best practices aerospace/automotive/pharma/CNC** |
| **19** | **`19-role-boundary-jd-linking-and-role-codes.md`** | **⭐ Standard role code for CNC job-order model: JD-linked abbreviations, governance hats, role bundles, prohibit ambiguous placeholders in header/RACI/owner** |
| **20** | **`20-department-boundary-handbook-codes.md`** | **⭐ Standard department code and subfunction code for functional level handbook/mandate; Coverage gap rule key and how to distinguish department vs JD** |
| **22** | **`22-jd-header-and-department-code-governance.md`** | **⭐ JD's `Chủ sở hữu` key rule according to D-code, choose the correct layer role-code vs department-code in header and owner cell** |
| **23** | **`23-portal-standard-title-filename-ssot.md`** | **⭐ SSOT key for field `Tên file / tiêu đề chuẩn`: English-only, synchronize filename + header title + link-update when rename** |
| **23b** | **`23-form-lifecycle-and-allocation.md`** | **⭐ Form lifecycle and code allocation: issuance, allocation, receipt, versioning, offline package control, upload verification** |
| **24** | **`24-form-template-design-system.md`** | **⭐ Form template design system: field types, layout rules, reusable blocks, schema-driven rendering, signature blocks, conditional visibility** |
| **25** | **`25-glossary-canonical-abbreviation-standard.md`** | **⭐ Canonical standard for glossary: ​​`term` is the lookup key, `meaning` is mandatory full-English, `ABBR` is the canonical key instead of `Full Term (ABBR)`** |
| **26** | **`26-wi-archetypes-and-qa-guide.md`** | **⭐ Course 4 WI archetype: POU, Gate-Execution, Control-Tower, Digital-Operation; includes boundary and QA checklist** |
| **27** | **`27-annex-archetypes-and-qa-guide.md`** | **⭐ Course 7 ANNEX archetype: matrix, method, rule-pack, dictionary, map/topology, worked example, specification** |
| **28** | **`28-pou-visual-and-machine-side-rules.md`** | **⭐ Rule for presenting and writing POU-WI to be readable at the point of use** |
| **29** | **`29-wi-annex-research-redraft-method.md`** | **⭐ Research method - rewrite WI/ANNEX according to each document, with external benchmark and source rule** |
| **30** | **`30-wi-annex-translation-role-bundle-rules.md`** | **⭐ Language rule, role code, D-code, bundle and anti half-English for WI/ANNEX** |
| **31** | **`31-core-standard-reconciliation-log.md`** | **⭐ Log for reconciliation, reconciled points, conflicts that need to be decided, unclear points that need to be confirmed** |

### Reference files

| File | Content |
|------|----------|
| `reference/abbreviations-keep-english.md` | 150+ abbreviations keep the same English |
| `reference/color-palette.md` | Color chart + how to use |
| `reference/css-classes-reference.md` | 190+ CSS classes |
| `reference/cnc-job-order-reference-model.md` | The CNC job-order reference model follows the actual gate/step range, not a fixed law |
| `reference/job-order-cnc-department-boundary-model.md` | Reference model for department boundaries and subsystems for job-order CNC |
| `../02-Tai-Lieu-He-Thong/03-Organization/04-RACI-Authority/role-and-department-bundles.html` | Glossary declares that all role/department/mixed actor bundles are allowed to be minified in the release documentation |
| `templates/sop-template.html` | Template SOP copy-paste |
| `templates/wi-template.html` | Template WI copy-paste |
| `templates/wi-pou-template.html` | Template POU-WI copy-paste for machine-side and visual-first execution |
| `templates/jd-template.html` | Template JD standardizes role-code, header and wrapper HTML |
| `templates/department-handbook-template.html` | Department handbook template standardizes department code, role chips and section boundaries |
| `templates/wi-annex-research-working-notes-template.md` | Sample working notes for research, benchmark and boundary log before rewriting WI/ANNEX |

---

## Quick Guide: Create a new document

### Create new SOP

1. Read `01-immutable-rules.md` — understand the 23 locked rules
2. Read `02-folder-and-naming.md` — determines the SOP code and file name
3. Put the file in the correct folder: `03-Tai-Lieu-Van-Hanh/01-SOPs/[series-folder]/`
4. File name: `sop-[3digit]-[kebab-case].html` (eg: `sop-501-production-planning-scheduling-and-dispatch-control.html`)
5. Read `13-sop-research-redraft-method.md` if you will encounter Section 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8
6. Read `16-sop-graphics-kpi-and-redraft-quality.md` before creating or rewriting Section 6 / 7 to avoid flowchart color deviations, generic KPIs or editorial notes from slipping into SOPs
7. Read `17-sop-sections-1-5-8-alignment-guide.md` before writing Section 1 / 2 / 3 / 4 / 5 / 8 to ensure that headers, roles, inputs/outputs and exceptions follow the actual operating logic
8. Use standard headers from `05-html-templates.md` and `11-html-structure-guide.md`
9. Content language: Vietnamese, according to `03-language-and-translation.md` rule
10. Section 3 must write term names in the form `English term (thuật ngữ tiếng Việt chuẩn)`
11. CSS reference: `../../../assets/style.css` (related path)
12. End of body: `<script src="../../../assets/app.js"></script>`
13. If document has header owner, RACI, gate owner, hold/release authority or approver: required reading `19-role-boundary-jd-linking-and-role-codes.md`
14. If the document uses department / subsystem / functional level interface: required further reading `20-department-boundary-handbook-codes.md`
15. If the document needs to consolidate multiple roles or departments into one actor bundle: must publish that bundle in `role-and-department-bundles.html` before using chip/token in the release document
16. If creating/editing a new glossary term or abbreviation: required reading `25-glossary-canonical-abbreviation-standard.md`

### Create new WI

1. Similar to SOP, put in `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/[series-folder]/`
2. File name: `wi-[3digit]-[kebab-case].html`
3. WI is point-of-use instruction — short, clear, practical language
4. Required reading `26-wi-archetypes-and-qa-guide.md`
5. If it is POU-WI, you must read `28-pou-visual-and-machine-side-rules.md`
6. If editing large content, read `29-wi-annex-research-redraft-method.md` required
7. Role/bundle/D-code must obey `30-wi-annex-translation-role-bundle-rules.md`

### Create new ANNEX

1. Put in `03-Tai-Lieu-Van-Hanh/03-Reference/[series-folder]/`
2. File name: `annex-[3digit]-[kebab-case].html`
3. ANNEX is a rule-pack — containing criteria, lookup tables, and detailed rules
4. Required reading `27-annex-archetypes-and-qa-guide.md`
5. If editing large content, read `29-wi-annex-research-redraft-method.md` required
6. Role/bundle/D-code must obey `30-wi-annex-translation-role-bundle-rules.md`

### Create new Form

1. Put in `04-Bieu-Mau/[series-folder]/`
2. File name: `FRM-[3digit]_Description_Underscores.xlsx`
3. The form must follow SOP/WI/ANNEX active — do not invent your own logic
4. Must show gate, hold point, release logic, KPI, owner, approver when needed

### Create new JD

1. Put in `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/[dept-folder]/`
2. File name: `jd-[kebab-case-role].html`

### Create or edit Department Handbook / organizational matrix

1. Read `20-department-boundary-handbook-codes.md` and `reference/job-order-cnc-department-boundary-model.md`
2. Read the current handbook, upstream/downstream handbook, relevant JD and SOP/ANNEX where boundary is being used
3. Clearly identify `department`, `subfunction`, `role`, and `gap`; Do not fix mechanically using search/replace
4. When the boundary changes, sync workbook `tools/data/qms-terminology-dictionary.xlsx` at least on 2 sheets:
   - `Phong ban`
   - `Department code & handbook link`
5. Review the organizational matrix, ANNEX, and related SOPs before closing

---

## Related documents

| File | Location | Describe |
|------|--------|-------|
| `general_note.md` | Root repo | Backward compatibility notes for AI & Editor — for summary use only; If deviant, follow `core-standards/` |
| `rule_update_content.md` | Root repo | Old snapshot of 23 locked rules + graphics required — used to trace history, no win `core-standards/` |
| `tools/engines/context_translate_engine.py` | `tools/engines/` | English→Vietnamese automatic translation tool |
| `tools/data/qms-terminology-dictionary.xlsx` | `tools/data/` | QMS glossary of terms |
| `tools/data/remaining-english-words.xlsx` | `tools/data/` | List of English words to be translated (5008 entries) |

---

> **Last updated:** 2026-04-01
> **Scope:** HESEM ENGINEERING — ISO 9001:2026, AS9100D-ready
---

## Unicode / Encoding Governance

- `21-unicode-and-encoding-governance.md`: root standard for UTF-8/NFC enforcement, anti-mojibake gate, and clustered remediation workflow.
- `23-portal-standard-title-filename-ssot.md`: SSOT rule for Portal standard title field, English-only canonical naming, and safe rename/link-sync behavior.

- `Frontend lock`: <!-- FRONTEND-VI-DIACRITICS-README --> all Vietnamese strings displayed on the frontend (`portal.html`, dashboard, online form, tooltip, placeholder, toast, modal, JS render string) must have full marks.

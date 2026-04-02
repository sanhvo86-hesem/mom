# 01 — Immutable Rules

> The rules in this file can **NEVER** be violated, regardless of the circumstances.
> Violating any of the rules below will break the integrity of the entire QMS system.

---

## A. File name, path, and source code rules

### A1. File and folder names — ALWAYS English

File names, folder names, paths are **ALWAYS** in English — **NEVER** translated into Vietnamese.

```
✅ sop-101-document-and-data-control.html
✅ wi-201-quality-gates-hold-points-and-release-execution.html
✅ 03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/

❌ sop-101-kiem-soat-tai-lieu-va-du-lieu.html
❌ 03-Tai-Lieu-Van-Hanh/01-Quy-Trinh/
```

### A2. HTML attributes — DO NOT translate

The following HTML attributes are **NEVER** translated:
- `href` — link
- `class` — CSS class name
- `id` — element identifier
- `src` — resource path
- `style` — inline CSS property
- `data-*` — data attribute
- `name` — form field name
- `value` — hidden value of form field (visible value can be translated)

```html
✅ <a href="../sop-101-document-and-data-control.html" class="doc-link">
✅ <div id="docContent" class="doc-content">

❌ <a href="../sop-101-kiem-soat-tai-lieu.html" class="lien-ket-tai-lieu">
```

### A3. CSS and JavaScript — retain technical identifiers, localize display strings

Technical sections in tags `<style>` and `<script>` **NEVER** are translated. Include:
- CSS variable names (`--navy`, `--blue`, `--gold`)
- Class name (`.form-header`, `.doc-content`, `.callout`)
- JavaScript function name
- Variables, technical keys, selectors, ids, routes, file paths
- Comment in code (remain in English if it is a technical comment)

**Mandatory exception:** any Vietnamese string displayed to the user in HTML/JavaScript still **MUST** be written with full, accurate accents. Applies to:
- Dashboard title, label, button, card, empty state
- Tooltip, placeholder, alert, confirm, toast, modal
- String in template literal, object config, JSON used to render UI

---

## B. Abbreviations and terms remain in English

### B1. Abbreviations — ALWAYS stay the same

The following abbreviations **ALWAYS** remain in English in all contexts:

**Management system:**
QMS, QA, QC, NCR, CAPA, DCR, SOP, WI, FRM, ANNEX, REC, RPT, CERT, ISO, AS9100D, PDCA

**Trade & supply chain:**
RFQ, PO, CSR, CoC, CoA, POD, BOM, Incoterms

**Quality & measurement:**
KPI, OTD, FPY, COPQ, MSA, SPC, IPQC, FAI, FMEA, PFMEA, CTQ, ALCOA, AQL

**Engineering & production:**
CNC, NC, DFM, CAM, CMM, 3D, ASME, ASTM, SMED, LOTO, MTTR

**Information system:**
SSOT, SoR, RACI, RBAC, ERP, MES, PDF, M365

**Management & operations:**
FIFO, FEFO, PDCA, SCAR, SBAR, TIMWOODS, SSCC

**Document code:**
SOP-101, WI-201, FRM-301, ANNEX-111 — all document codes remain in their original form

### B1a. Glossary canonical for abbreviation — HARD LOCK

When an abbreviation appears in the glossary/term dictionary:

- `term` MUST be a canonical lookup key;
- `meaning` MUST be the full English name of the abbreviation;
- Do not create new canonical records in the form `Full Term (ABBR)`;
- With the pair `ABBR` and `Full Term (ABBR)`, `ABBR` is the main entry;
- role/JD codes like `QA-01`, `PUR-02`, `EXE-01` are still allowed in glossary, but `meaning` MUST be the full English title.

Detailed standards: see `25-glossary-canonical-abbreviation-standard.md`.

### B2. Industry terminology — stay in English

The following industry terms remain in English when used in Vietnamese documents:
- **Production:** Setup, Traveler, Balloon
- **Software:** Epicor, SharePoint, M365, Zalo
- **Methods:** Kaizen, Dreyfus, Pareto, Kolb
- **Materials:** PEEK, Vespel, PTFE
- **Standard:** SEMI

### B3. Internal proper nouns — NEVER translate

The following names are **system proper nouns** (SharePoint, Epicor, M365). If translated into Vietnamese or English, it will **lose meaning** and **break system links**.

#### B3.1 SharePoint Site name — keep 100%

| Site name | Owner | Purpose |
|----------|------------|---------|
| `HESEM-Records` | `QMS-Owner` | Operational profile: Quality, QMS Governance, Training, Department |
| `HESEM-Job-Evidence` | `QMS-Owner` | Job dossier + Part baseline + Customer IP (isolated) |
| `HESEM-People` | `QMS-Owner` | HR restricted |
| `HESEM-Digital` | `QMS-Owner` | Source control (web backup) + IT governance |

**Rules:** Site names, library names, SharePoint list names are proper nouns — **DO NOT** translate, **DO NOT** edit any characters. Architectural details: see `core-standards/14-m365-sharepoint-architecture.md`.

#### B3.2 Internal Column Names — keep 100%

The following column names are technical identifiers in M365 Lists/Epicor. **NEVER** translate:

| Column name | Describe | Original language |
|---------|--------|---------------|
| `RecordType` | Record type | English |
| `RecordCode` | Profile code | English |
| `StatusCode` | Status code | English |
| `ResponsiblePerson` | Person in charge | English |
| `Người phê duyệt` | Approver | Vietnamese (preset) |
| `EventDate` | Event date | English |
| `TriggerEventDate` | Activation date | English |
| `JobNum` | Job Number | English |
| `PartNum` | Part Number | English |
| `Phiên bản` | Version | Vietnamese (preset) |
| `CustomerID` | Customer code | English |
| `SupplierID` | Supplier code | English |
| `EvidenceUrl` | Evidence path | English |

**Quick identification of internal column names:** Any words written in the form **CamelCase** (like `RecordType`, `JobNum`, `CustomerID`) are technical column names — **DO NOT translate**.

#### B3.2b Storage Locations — keep the English 100%

| English name | Describe |
|---------------|--------|
| `Quality-Records` | Library of quality records (site HESEM-Records) |
| `QMS-Governance` | Library of QMS administrative records (site HESEM-Records) |
| `Training-Records` | Library of training records (site HESEM-Records) |
| `Department-Ops` | Library of department records (site HESEM-Records) |
| `Part-REV-Master` | Library engineering baseline (site HESEM-Job-Evidence) |
| `Job-Dossiers` | Job profile library (site HESEM-Job-Evidence) |
| `Customer-Received` | Customer document library (site HESEM-Job-Evidence) |
| `Tooling-Fixture-Gage` | Asset Library (site HESEM-Job-Evidence) |
| `QMS-Source-Control` | Library backup web portal (site HESEM-Digital) |
| `Point-of-use` / `Point-of-use Control` | Point of use |
| `Document Library` | Document library |
| `Record Library` | Profile library |

**Rule:** Repository names are M365/SharePoint proper nouns — translation will cause reference confusion.

#### B3.2c Title / Role — standardized according to JD and role code

| English | Vietnamese (description) |
|-----------|---------------------|
| `Document Responsible Person` | Person in charge of documents |
| `Lead Department` | Presiding department |
| `IT Administrator` | IT administrator |
| `Team Leader` | Team leader |
| `Shift Leader` | Head of shift |
| `Foreman` | Foreman |
| `Approver` / `Reviewer` / `Author` | Approver/reviewer/editor |
| `Performer` / `Inspector` / `Operator` | Implementer/inspector/operator |
| `Specialist` / `Worker` / `End User` | Professionals / Workers / End users |

**Alternative rules:**
- The title JD is standard in English.
- Header, RACI, host table, gate owner, hold/release authority and approver use shortened `role code` with JD link.
- Governance hats must be attached to the actual host role, for example `QA[QMR]`, `QMS[DC]`, `QMS[LA]`.
- Prohibit independent use of placeholders such as `Process Owner`, `Department Head`, `Responsible Person`, `Data Owner`, `Top Management` in owner/RACI/authority cells.
- When a group of roles is needed, it must be rendered into an explicit role bundle consisting of multiple JD link chip roles, do not write ambiguous groups.

#### B3.3 SharePoint List name — keep 100%

| Original List name | Describe |
|---------------|--------|
| `QMS-Document-Register` | Document register |
| `QMS-Change-Register` | Change register |
| `QMS-NCR-Register` | NCR Registry |
| `QMS-CAPA-Register` | CAPA Register |
| `QMS-Training-Register` | Training register |
| `QMS-Competence-Matrix` | Competency matrix |
| `OPS-Job-Dossier-Index` | Job profile list |
| `PUR-Supplier-Register` | Supplier register |
| `M365-Record-Provisioning-Requests` | Request for issuance of documents |
| `M365-Record-Series-Catalog` | List of record chains |
| `Department-Zone-Catalog` | List of departments/areas |
| `People-Dossier-Index` | List of personnel records |
| `System-Record-Request-Log` | System profile request log |
| `External-Share-Approval-Log` | Externally shared browsing logs |
| `Automation-Run-Log` | Log runs automatically |
| `Archive-Lock-Register` | Stored key registry |

**Rule:** List names are system identifiers — translation will break Power Automate flows and lookup columns.

#### B3.4 SharePoint owner name — keep 100%

`QMS-Owner` is the account/security group name in M365 — **NOT** translated to "QMS-Owner" or anything else.

---

### B4. Metatag label — standardized Vietnamese

Metatag labels in the document header use Vietnamese according to standardized conventions:

| Label displayed | Content |
|----------------|----------|
| **Code:** | Document code (SOP-101, WI-201...) |
| **Version:** | V0, V1, V2... |
| **Effective date:** | Date or "By decision issued" |
| **Owner:** | Role code JD-linked is responsible |
| **Approve:** | Role code JD-linked has approval authority |

Document codes (SOP-101, WI-201, FRM-301, ANNEX-111) **ALWAYS** remain in English.

---

## C. 23 Locked Rules

The following rules are permanently locked in and apply to all QMS documents:

### Structure & organization

1. **Keep the current library structure as the target framework.** Do not arbitrarily change the established folder structure.

2. **Do not arbitrarily rename files/slugs/document codes.** Do not rename manually or rename locally outside of control. If you need to change the standard name, it can only be done through the governments rename flow locked at `23-portal-standard-title-filename-ssot.md` to synchronize filename + SSOT title + header + link update.

3. **Only Vietnamese content displayed to users.** File names, HTML attributes, CSS selectors, JS identifier/logic remain in English; but every Vietnamese UI string in HTML/JS must have full marks.

4. **Only keep department names, terms, and abbreviations when absolutely necessary.** Prioritize Vietnamese for content, keep English only for abbreviations and terms that do not have exact equivalents.

### Language quality

5. **Vietnamese language MUST have complete and accurate diacritics.** Do not write without diacritics, missing diacritics, or with incorrect diacritics. Applies everywhere Vietnamese is displayed: title, content, table, notes, tooltip, alt text, placeholder, system notification, dashboard string and UI string rendered from JavaScript.

6. **Language must be short, clear, and practical.** Do not write in lengthy, academic, or vague terms.

7. **No meta text, no "AI generated", no explanation of document origin.** Documents should read as if written by a QMS expert, not machine-generated.

8. **Each sentence must serve a real function.** Don't write sentences "for the sake of it", don't add content just to fill in the blank space.

### Content integrity

9. **Do not trim operational logic.** When editing, keep all business logic intact — just improve the language.

10. **Form must adhere to SOP/WI/ANNEX active, not make up your own logic.** Form is the class that records data for the defined process.

11. **New missing parts are added from international practice, but must blend into the HESEM language.** Do not copy verbatim from standards or external documents.

12. **Don't lose important content through oversimplification.** Simplify the language, not the content.

### Document classification

13. **SOP is the executive layer; WI is point-of-use instructions; ANNEX is rule-pack; FORM is where data/evidence/decisions are recorded.**
    - SOP: management level processes, decision-making logic, responsibilities
    - WI: step-by-step instructions at the scene, who does what when
    - ANNEX: criteria, lookup tables, reference rules
    - FORM: form for recording data, evidence, decisions

14. **Do not let the form overlap responsibilities or duplicate useless data.** Each data field is only recorded once at the most appropriate source.

15. **ANNEX replaces REF for valid internal documents.** Do not use REF codes for internal reference documents — use ANNEX.

### System synchronization

16. **Graphics and logic must be consistent throughout the system.** Colors, fonts, layout, and document codes must be consistent from SOP to FORM.

17. **Form must show gate, hold point, release logic, KPI, owner, approver as needed.** Form is not just a blank slate — it must reflect the control process.

### Operational practice

18. **Must be the correct CNC job order factory model, usable in the field.** Documents must be appropriate to the scale and characteristics of HESEM, not an ideal factory.

19. **Prioritize quality over quantity.** One good document is better than ten superficial documents.

20. **File names are still English slug.** All file names use English kebab-case, no accents, no spaces.

21. **Do not create ambiguity so that employees do not know what to fill in, what to sign, what decisions to make.** Each field, each signature box must be clear: who, what, when, what criteria.

22. **"Pumping depth" means increasing the depth of expertise and practicality, not adding words to make it thicker.** The value lies in the depth of the content, not the length.

23. **Must be in line with ISO 9001:2026 targets and ready for AS9100D at the HESEM practical level.** Don't set the bar so high that it can't be implemented, nor set it too low.

24. **When designing a form, you must look at product safety, traceability, external providers, evidence discipline, human factors, operational risk if the form is related.** Form is the last layer to capture risk — it must be designed intentionally.

---

## D. Branding and graphics

### D1. Brand Colors

| Name | Hex code | CSS variables | Used for |
|-----|--------|----------|----------|
| Navy | `#0C2D48` | `--navy` | Title, heading, header |
| Blue | `#1565C0` | `--blue` | Link, main accent |
| Light Blue | `#E3F2FD` | `--blue-l` | Note background, light highlight |
| Gold | `#F9A825` | `--gold` | Border accent, callout |
| Light Gold | `#FFF8E1` | `--gold-l` | Callout background |
| Ink | `#212529` | `--ink` | Main text |
| Red | `#E03131` | `--red` | Warning, error |
| Green | `#2F9E44` | `--green` | Successful, approved |

**Rules:** Do not use arbitrary colors other than the table above. All documents must use this exact palette.

### D2. Print Layout

| Attributes | Value |
|------------|---------|
| Paper size | A4 (default), A3 (large board) |
| Font | Segoe UI or equivalent |
| Original font size | 14px |
| Line height | 1.6 |
| Table overflow | **NO** — all tables must fit paper size |
| Flashy color | **NO** — only use defined palettes |
| Page breaks | `page-break-inside: avoid` for every block |

### D3. Document headers

Every HTML document **MUST** have a standard header that includes:
- **Brand row:** HESEM logo + company name
- **Title block:** SSOT title (`.doc-name`) and Vietnamese subtitles when needed; The document code is located in the meta row and can appear in `<title>` / first `<h1>` according to the `23-portal-standard-title-filename-ssot.md` standard
- **Meta box:** Code, Version, Effective Date, Owner, Approval

Footer must have page number and document identification.

---

## E. Single Source of Truth (SSOT)

### E1. System stratification

| System | Role | Data type |
|-----------|---------|---------------|
| **Epicor** | System of Record (SoR) | ERP transactions: orders, production, warehouse, finance |
| **M365 (SharePoint)** | Single Source of Truth (SSOT) | QMS documents, control records, policies |
| **Excel (Forms)** | Gate / Evidence / Decision layer | Recording forms, checklists, decision logs |

### E2. Rules are not duplicated

- **Do not duplicate data between systems.** Each data point has only one official source.
- Epicor is the source for transactional data — not copied to SharePoint.
- SharePoint is the source for documents — don't keep copies on personal drives.
- The Excel form records only the data required by the SOP/WI — do not add out-of-range fields.

### E3. System link

- HTML documents on the web refer to the form using a download link
- Excel form references back to SOP/WI/ANNEX using document code
- Portal (`portal.html`) is the central access point for the entire system

---

## F. Compliance testing

Before completing any documentation, check:

- [ ] File name is English slug, kebab-case, no accents
- [ ] HTML attributes (href, class, id, src) are not translated
- [ ] Original, untranslated CSS/JS
- [ ] Abbreviations remain in English
- [ ] Document code remains the same (SOP-101, WI-201, FRM-301, ANNEX-111)
- [ ] Brand colors in the correct palette
- [ ] Can print A4/A3, no overflow
- [ ] Font Segoe UI
- [ ] Header has the correct structure
- [ ] No meta text, no "AI generated"
- [ ] Each sentence serves a real function
- [ ] Form follows SOP/WI/ANNEX, does not make up logic
- [ ] Do not duplicate data between systems

---

## G. Operational profile naming rules — IMMUTABLE

### G1. Operational records (filled forms, evidence) MUST follow 6 naming patterns

Full details: see `15-evidence-and-records-naming.md`. Summary:

| # | Rules | Violation = |
|---|---------|----------|
| 1 | Filled form MUST have `V{ver}` in the name (blank form version used) | REJECT upload |
| 2 | Every file MUST have `{YYYYMMDD}` in the name | REJECT upload |
| 3 | Every file MUST have `{HHMM}-{UserID}` to avoid duplicate names when multiple people upload at the same time | REJECT upload |
| 4 | Engineering baseline MUST have `V{ver}` and only 1 release person (approval gate FRM-306) | REJECT release |
| 5 | Formal records (NCR, CAPA, FAI, Audit...) MUST have a Record-ID from the server atomic counter | REJECT submit |
| 6 | NO files will be saved to SharePoint with names containing spaces or special characters | REJECT upload |

### G2. UserID MUST be registered uniquely

Each employee is assigned a 3-4 character UserID (eg: NVA, TBH, LMC), registered in SharePoint List `Employee-Registry`. UserID DOES NOT change when changing department/position, NOT reused after leaving job.

---

> **Last updated:** 2026-04-01
> **Applies:** Complete QMS documentation — HESEM ENGINEERING

## H. Vietnamese frontend key with accents

<!-- FRONTEND-VI-DIACRITICS-IMMUTABLE -->

- Applies to portal/dashboard/form runtime and all render strings from JavaScript.
- Absolutely prohibit unsigned Vietnamese strings on the interface, including demo or fallback data.
- If you must use English for technical terminology, you must follow the locked exception list in core standards.

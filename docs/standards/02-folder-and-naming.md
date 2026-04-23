# 02 — Folder structure and naming conventions

> Full map of QMS folder structure and file naming rules for all document types.
> Any new files **MUST** follow the structure and rules in this document.

---

## A. Full directory tree (Level 3)

```
qms.hesem.com.vn/
│
├── 01-QMS-Portal/                          → Portal trung tâm & API
│   ├── portal.html                         → Trang chủ eQMS
│   ├── api.php                             → API backend
│   ├── qms-data/                           → Runtime data (sessions, cache)
│   ├── scripts/                            → Scripts hệ thống portal
│   └── docs/                               → Tài liệu kỹ thuật portal
│
├── 02-Tai-Lieu-He-Thong/                   → Tài liệu hệ thống (System Documents)
│   ├── 01-Quality-Manual/                  → Sổ tay chất lượng
│   │   └── qms-man-001-qms-manual.html
│   ├── 02-Policies-Objectives/             → Chính sách & mục tiêu
│   │   ├── pol-qms-001-quality-policy.html
│   │   └── pol-qms-002-quality-objectives.html
│   └── 03-Organization/                    → Tổ chức & nhân sự
│       ├── 01-Org-Chart/                   → Sơ đồ tổ chức
│       ├── 02-Department-Handbooks/        → Sổ tay phòng ban
│       ├── 03-Job-Descriptions/            → Mô tả công việc
│       │   ├── 01-JD-Executive/
│       │   ├── 02-JD-Production/
│       │   ├── 03-JD-Engineering/
│       │   ├── 04-JD-Quality/
│       │   ├── 05-JD-Supply-Chain/
│       │   ├── 06-JD-Sales/
│       │   ├── 07-JD-Finance/
│       │   ├── 08-JD-HR/
│       │   ├── 09-JD-EHS/
│       │   ├── 10-JD-IT/
│       │   └── index.html
│       ├── 04-RACI-Authority/              → Ma trận RACI & thẩm quyền
│       └── 05-Labor-Relations/             → Quan hệ lao động
│
├── 03-Tai-Lieu-Van-Hanh/                   → Tài liệu vận hành (Operational Documents)
│   ├── 01-SOPs/                            → Quy trình (Standard Operating Procedures)
│   │   ├── 01-SOP-100/                     → Series 100: Nền tảng & quản trị
│   │   ├── 02-SOP-200/                     → Series 200: Khách hàng & thương mại
│   │   ├── 03-SOP-300/                     → Series 300: Kỹ thuật & thiết kế
│   │   ├── 04-SOP-400/                     → Series 400: Chuỗi cung ứng & nhà cung cấp
│   │   ├── 05-SOP-500/                     → Series 500: Sản xuất & vận hành
│   │   ├── 06-SOP-600/                     → Series 600: Chất lượng & đo lường
│   │   ├── 07-SOP-700/                     → Series 700: Kho & logistics
│   │   ├── 08-SOP-800/                     → Series 800: Nhân sự, EHS, tài chính
│   │   ├── 09-SOP-900/                     → Series 900: Cải tiến & đánh giá
│   │   └── index.html
│   ├── 02-Work-Instructions/               → Hướng dẫn công việc
│   │   ├── 01-WI-100/                      → Series 100: Nền tảng
│   │   ├── 02-WI-200/                      → Series 200: Thương mại & release
│   │   ├── 05-WI-500/                      → Series 500: Sản xuất & CNC
│   │   ├── 06-WI-600/                      → Series 600: Kiểm tra & đo lường
│   │   ├── 07-WI-700/                      → Series 700: Kho & bảo quản
│   │   ├── 09-WI-900/                      → Series 900: Dashboard & KPI
│   │   └── index.html (nếu có)
│   └── 03-Reference/                       → Tài liệu tham chiếu (ANNEX)
│       ├── 00-LEGACY-REF/                  → Tài liệu tham chiếu cũ (legacy)
│       ├── 01-ANNEX-100/                   → Series 100: Nền tảng & kiểm soát
│       │   ├── 10-ANNEX-100-Foundation-Maps-and-Control/  → Sơ đồ truy cập, org chart, process map, ISO matrix, audit pack, KPI dictionary
│       │   ├── 11-ANNEX-110-Digital-Control-and-Resilience/  → Climate context, go-live runbook, Epicor interface, escalation matrix, offline fallback, change roadmap
│       │   ├── 12-ANNEX-120-Authority-KPI-and-Deputy-Control/  → Authority matrix, RACI master, KPI cascade, deputy backup, dashboard evidence
│       │   └── 13-ANNEX-130-M365-Records-Control/  → Metadata schema, workflow approval, SharePoint topology, permissions architecture, file plan, source sync, naming convention
│       ├── 03-ANNEX-300/                   → Series 300: Kỹ thuật — Setup sheet standard, approved materials list
│       ├── 04-ANNEX-400/                   → Series 400: Chuỗi cung ứng — Supplier risk model, outsource process pack, approved processor list
│       ├── 05-ANNEX-500/                   → Series 500: Sản xuất — Dispatch capacity, gate MRR, CNC operating model, tier meeting, put-thru index, FOD prevention, poka-yoke
│       ├── 06-ANNEX-600/                   → Series 600: Chất lượng — AQL method, MSA criteria, quality package levels, control plan, SPC, surface finish, quality culture, SEMI standards
│       ├── 07-ANNEX-700/                   → Series 700: Kho & logistics — SSCC data dictionary, packaging labeling spec, warehouse FIFO rules
│       ├── 08-ANNEX-800/                   → Series 800: Nhân sự & EHS — Competency levels, collective bargaining, PPE & hazard matrix
│       └── 09-ANNEX-900/                   → Series 900: Cải tiến (chưa có tài liệu)
│
├── 04-Bieu-Mau/                            → Biểu mẫu (Forms — Excel .xlsx)
│   ├── 00-FORM-DESIGN-SYSTEM/              → Hệ thống thiết kế form
│   ├── 01-FRM-100/                         → Series 100: Quản trị tài liệu
│   ├── 02-FRM-200/                         → Series 200: Thương mại
│   ├── 03-FRM-300/                         → Series 300: Kỹ thuật
│   ├── 04-FRM-400/                         → Series 400: Chuỗi cung ứng
│   ├── 05-FRM-500/                         → Series 500: Sản xuất
│   ├── 06-FRM-600/                         → Series 600: Chất lượng
│   ├── 07-FRM-700/                         → Series 700: Kho & logistics
│   ├── 08-FRM-800/                         → Series 800: Nhân sự & EHS
│   ├── 09-FRM-900/                         → Series 900: Cải tiến
│   └── index.html
│
├── 10-Training-Academy/                    → Học viện đào tạo
│   ├── 01-Competency-System/              → Hệ thống năng lực
│   │   ├── 01-Framework/                  → Khung năng lực
│   │   ├── 02-Levels/                     → 19 năng lực × 4 cấp độ
│   │   │   ├── 01-C01-Safety-5S/
│   │   │   ├── 02-C02-Process-Discipline/
│   │   │   ├── 03-C03-Right-First-Time/
│   │   │   ├── ...
│   │   │   └── 19-C19-Leadership-Coaching/
│   │   ├── 03-Matrices/                   → Ma trận năng lực
│   │   └── index.html
│   ├── 02-Training-Content/               → Nội dung đào tạo
│   │   ├── 01-Modules/                    → Bài giảng (C01.html → C19.html)
│   │   ├── 02-OJT-Guides/                → Hướng dẫn đào tạo tại chỗ
│   │   └── 03-Practice-Drills/            → Bài tập thực hành
│   ├── 03-System-Operations/              → Vận hành hệ thống đào tạo
│   ├── 04-Templates-Tools/                → Template & công cụ đào tạo
│   └── index.html
│
├── 11-Glossary/                            → Từ điển thuật ngữ
│   ├── index.html                         → Trang tra cứu
│   ├── dict-data.js                       → Dữ liệu từ điển (JS)
│   └── dict-data.json                     → Dữ liệu từ điển (JSON)
│
├── assets/                                 → Tài nguyên chung
│   ├── style.css                          → CSS chính
│   ├── app.js                             → JavaScript chính
│   ├── hesem-logo.svg                     → Logo SVG (ưu tiên)
│   ├── hesem-logo.png                     → Logo PNG (fallback)
│   ├── logo-icon.svg                      → Icon logo nhỏ
│   ├── company-org-chart.svg              → Sơ đồ tổ chức
│   └── style-v9.css                       → CSS phiên bản cũ (legacy)
│
├── core-standards/                         → Tiêu chuẩn nền tảng (file này)
│   ├── README.md
│   ├── 01-immutable-rules.md
│   ├── 02-folder-and-naming.md
│   ├── 03-language-and-translation.md
│   ├── reference/
│   └── templates/
│
├── tools/                                  → Công cụ hỗ trợ (chi tiết: 11-ai-tooling-and-reports.md)
│   ├── engines/                           → Engine tái sử dụng (giữ vĩnh viễn)
│   │   ├── context_translate_engine.py   → Engine editorial/translation support; locale publication still follows standard 37
│   │   └── ...
│   ├── scripts/                           → Scripts chạy một lần theo đợt
│   │   ├── form-repair/                  → Sửa lỗi Excel forms
│   │   ├── translation/                  → Dịch theo batch / artifact prep theo workflow chuẩn
│   │   ├── encoding/                     → Sửa mojibake/encoding
│   │   ├── link-repair/                  → Sửa broken links
│   │   ├── language-polish/              → Polish ngôn ngữ Việt
│   │   └── m365/                         → SharePoint/M365 scripts
│   ├── data/                              → Dữ liệu tham chiếu
│   │   ├── qms-terminology-dictionary.xlsx
│   │   ├── remaining-english-words.xlsx
│   │   └── remaining-english-words-v2.xlsx
│   └── legacy/                            → Scripts cũ chưa phân loại
│
├── _reports/                               → Output & báo cáo AI-generated (chi tiết: 11-ai-tooling-and-reports.md)

Locale artifact rule:

- controlled English HTML artifact must use hidden-sibling naming such as `_sop-501-example.en.html`
- artifact lives beside the Vietnamese source unless a stricter controlled store is declared later
- artifact file must not appear as a standalone scanned document
│   ├── analysis/                          → Phân tích chiến lược & expert reviews
│   ├── translation/                       → Tiến độ dịch thuật
│   ├── link-repair/                       → Tracking sửa broken links
│   ├── encoding/                          → Encoding/mojibake fix tracking
│   ├── language/                          → Language audit & mixed-term
│   ├── m365/                              → SharePoint/M365 templates
│   ├── form-audit/                        → Form analysis & compliance
│   └── screenshots/                       → Screenshots minh họa
│
├── _build/                                 → Build artifacts (generated)
├── _Deleted/                               → Files đã xóa/archive
│
├── M365-SharePoint-Upload-Template/        → Template upload lên SharePoint (hệ thống)
├── M365-SharePoint-Upload-Template-Operational/ → Template upload (vận hành)
│
├── index.html                              → Trang chủ site
├── index.php                               → Entry point PHP
├── general_note.md                         → Ghi chú chung cho AI & Editor
├── rule_update_content.md                  → 23 locked rules & yêu cầu đồ họa
└── robots.txt                              → Kiểm soát crawler
```

---

## B. File naming convention

### B1. SOP — Procedure

**Model:** `sop-[3digit]-[kebab-case].html`

| Ingredient | Rules | For example |
|------------|---------|-------|
| Prefix | `sop-` (always lower case) | `sop-` |
| Code | 3 digits, in series (1xx, 2xx...) | `101`, `501` |
| Name | kebab-case, English, content description | `document-and-data-control` |
| Tail | `.html` | `.html` |

**Practical example:**
```
sop-101-document-and-data-control.html
sop-201-order-fulfillment-rfq-to-cash.html
sop-301-engineering-dfm-quoting-and-machining-planning.html
sop-401-supplier-control-and-special-process.html
sop-501-production-planning-scheduling-and-dispatch-control.html
sop-601-calibration-and-gage-control.html
sop-701-receiving-packaging-handling-and-storage.html
sop-801-competence-training-and-certification.html
sop-902-management-review.html
```

**Series code:**
| Series | Scope | Presiding department |
|--------|---------|-------------------|
| 100 | Platform & administration | Quality / IT |
| 200 | Customer & trade | Sales / Quality |
| 300 | Engineering & design | Engineering |
| 400 | Supply chain | Supply Chain |
| 500 | Production & operations | Production |
| 600 | Quality & measurement | Quality |
| 700 | Warehouse & logistics | Warehouse / Supply Chain |
| 800 | Human resources, EHS, finance | HR / EHS / Finance |
| 900 | Improvements & reviews | Quality / Management |

### B2. WI — Work Instructions

**Model:** `wi-[3digit]-[kebab-case].html`

**Practical example:**
```
wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html
wi-201-quality-gates-hold-points-and-release-execution.html
wi-501-dispatch-capacity-and-wip-control.html
wi-512-3-axis-vertical-milling-guide.html
wi-602-gage-pre-use-verification-and-status-control.html
wi-701-receiving-iqc-traceability-and-put-away.html
wi-901-performance-dashboard.html
```

### B3. ANNEX — Reference document

**Model:** `annex-[3digit]-[kebab-case].html`

**Practical example:**
```
annex-101-role-based-access-map.html
annex-110-dashboard-kpi-dictionary-and-data-model.html
annex-120-authority-matrix.html
annex-301-setup-sheet-and-tool-list-standard.html
annex-401-supplier-risk-model-and-scorecard-method.html
annex-501-dispatch-capacity-wip-rules.html
annex-601-aql-method-reference.html
annex-701-gs1-sscc-data-dictionary-and-pack-reconciliation.html
annex-801-competency-levels-and-certification-rules.html
```

**Note:** ANNEX series 100 has sub-folders (10-ANNEX-100-xxx, 11-ANNEX-110-xxx, 12-ANNEX-120-xxx, 13-ANNEX-130-xxx) due to the large number of ANNEX platforms.

### B4. JD — Job description

**Model:** `jd-[kebab-case-role].html`

**Practical example:**
```
jd-chief-executive-officer.html
jd-production-director.html
jd-cnc-operator.html
jd-cnc-workshop-manager.html
jd-qa-manager.html
jd-qc-inspector-cmm-programmer-operator.html
jd-qms-engineer.html
jd-supply-chain-manager.html
jd-hr-manager.html
jd-finance-manager.html
jd-ehs-specialist.html
jd-it-admin.html
```

### B5. FRM — Form

**Model:** `FRM-[3digit]_Description_Underscores.xlsx`

**Rules:**
- Prefix `FRM-` is in CAPITAL
- 3-digit code, according to series (1xx, 2xx...)
- Description names use `_` (underscore) instead of spaces
- Words capitalize the first letter (Title_Case)
- Tail `.xlsx`

**Practical example:**
```
FRM-101_Master_Document_Register.xlsx
FRM-102_Document_Change_Request.xlsx
FRM-104_Document_Deployment_Checklist.xlsx
FRM-110_M365_Configuration_Checklist.xlsx
FRM-121_Context_Analysis_SWOT_PESTLE.xlsx
FRM-301_Setup_Sheet.xlsx
FRM-601_Calibration_Log.xlsx
```

### B6. Department Handbook — Department handbook

**Model:** `dept-[name]-handbook.html`

**Practical example:**
```
dept-production-handbook.html
dept-supply-chain-handbook.html
dept-hr-handbook.html
dept-finance-handbook.html
dept-ehs-handbook.html
```

### B7. Training — Training

**Lecture module:**
- Model: `C[01-19].html`
- For example: `C01.html`, `C10.html`, `C19.html`

**Competency level:**
- Model: `C[01-19]-L[1-4].html`
- For example: `C01-L1.html`, `C01-L2.html`, `C10-L3.html`

**Competency directory:**
- Model: `[2digit]-C[2digit]-[PascalCase-Name]/`
- For example: `01-C01-Safety-5S/`, `10-C10-CNC-Job-Order-Process/`, `19-C19-Leadership-Coaching/`

### B8. Portal & Index

| File | Location | Role |
|------|--------|---------|
| `portal.html` | `01-QMS-Portal/portal.html` | eQMS home page, central access point |
| `index.html` | Root of each level 1 folder | Table of contents page of that section |

---

## C. Folder naming rules

### C1. Prefix the sequence number

All directories use a 2-digit prefix:
```
01-, 02-, 03-, ..., 09-, 10-, 11-, ...
```

**Exceptions:** `assets/`, `tools/`, `core-standards/` — utility folders do not need a prefix.

### C2. Writing conventions

| Grant | Convention | For example |
|-----|---------|-------|
| Level 1 | PascalCase or kebab-case | `01-QMS-Portal`, `02-Tai-Lieu-He-Thong` |
| Level 2 | PascalCase | `01-Quality-Manual`, `02-Department-Handbooks` |
| Level 3 | PascalCase | `01-JD-Executive`, `10-ANNEX-100-Foundation-Maps-and-Control` |

### C3. Valid characters

| Allowed | Unauthorized |
|-----------|-----------------|
| `a-z` | Vietnamese diacritics (uh, ê, ugh...) |
| `A-Z` | White space |
| `0-9` | Special characters (@ # $ % & ...) |
| `-` (hyphen) | Brackets ( ) [ ] { } |
| `_` (underscore) | Semicolon, comma |
| `.` (period — file extension only) | Unicode beyond ASCII |

**Absolute rule:** File and folder names **NEVER** contain Vietnamese accents or non-ASCII Unicode characters.

### C4. Notes on folder contents (REQUIRED)

Each folder containing documents **MUST** have a note describing the documents inside. There are 2 ways to do it:

**Method 1 — Inline notes in the directory tree (core-standards/02-folder-and-naming.md):**
Use the symbol `→` after the folder name to describe the main content:
```
├── 06-ANNEX-600/  → Series 600: Chất lượng — AQL method, MSA criteria, quality package levels, control plan, SPC, surface finish
```

**Method 2 — File `index.html` in folder:**
Create a file `index.html` that lists the documents in the folder with a short description.

**Rules:**
- All series folders (SOP, WI, ANNEX, FRM) **MUST** have their contents noted in at least 1 of the 2 ways above
- The note should list the abbreviation or main subject of the documents within
- When adding or removing documents from a folder, notes **MUST** be updated accordingly
- Note: Use English or bilingual, do not use pure Vietnamese

---

## D. Expansion Slot (Reserved Expansion)

### D1. SOP — Series 1000+

When the system expands beyond the current 9 series:
- Series 1000+: new modules (for example: 1000 — Automation, 1100 — R&D)
- Directory: `10-SOP-1000/`, `11-SOP-1100/`
- File: `sop-1001-[kebab-case].html`

### D2. FRM — Series 1000+

- Similar to SOP, form series 1000+ for expansion modules
- Directory: `10-FRM-1000/`, `11-FRM-1100/`
- File: `FRM-1001_Description.xlsx`

### D3. Competency — C20+

- Additional abilities: `C20`, `C21`, ...
- Directory: `20-C20-[Name]/`, `21-C21-[Name]/`
- Modules: `C20.html`, `C21.html`
- Level: `C20-L1.html`, `C20-L2.html`

### D4. ANNEX — Series 1000+

- Directory: `10-ANNEX-1000/`
- File: `annex-1001-[kebab-case].html`

---

## E. Reference path rules

### E1. Relative path — always use

All internal links **MUST** use relative path, not absolute path.

```html
✅ href="../../01-SOPs/01-SOP-100/sop-101-document-and-data-control.html"
✅ href="../../../assets/style.css"

❌ href="/03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101-document-and-data-control.html"
❌ href="https://qms.hesem.com.vn/assets/style.css"
```

### E2. Logo — standard link

```html
<img alt="HESEM Logo" src="[relative]/assets/hesem-logo.svg"/>
```

Where `[relative]` is the relative path from the current file to the root of the repo:
- From `01-QMS-Portal/portal.html` → `../assets/hesem-logo.svg`
- From `03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101.html` → `../../../assets/hesem-logo.svg`

### E3. Portal — standard link

```html
<a href="[relative]/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
```

### E4. CSS & JS — canonical path

```html
<link rel="stylesheet" href="[relative]/assets/style.css"/>
<!-- cuối body -->
<script src="[relative]/assets/app.js"></script>
```

### E5. Cross-reference between document types

| From | Arrive | Pattern |
|----|-----|---------|
| SOP → WI | `../../02-Work-Instructions/[series]/wi-xxx.html` | Same level 1 |
| SOP → ANNEX | `../../03-Reference/[series]/annex-xxx.html` | Same level 1 |
| SOP → Form | `../../../04-Bieu-Mau/[series]/FRM-xxx.xlsx` | Different from level 1 |
| WI → SOP | `../../01-SOPs/[series]/sop-xxx.html` | Same level 1 |
| JD → SOP | `../../../03-Tai-Lieu-Van-Hanh/01-SOPs/[series]/sop-xxx.html` | Different from level 1 |

### E6. Form download link

```html
<a href="../../../04-Bieu-Mau/01-FRM-100/FRM-101_Master_Document_Register.xlsx"
   class="form-link" download>
  📥 FRM-101 — Sổ đăng ký tài liệu chủ
</a>
```

**Note:** File names in `href` and `download` **NEVER** translate.

---

## F. Quick summary table

| Type | File name template | Root directory | Tail |
|------|---------------|-------------|------|
| SOP | `sop-[3d]-[kebab].html` | `03-Tai-Lieu-Van-Hanh/01-SOPs/` | `.html` |
| WI | `wi-[3d]-[kebab].html` | `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/` | `.html` |
| ANNEX | `annex-[3d]-[kebab].html` | `03-Tai-Lieu-Van-Hanh/03-Reference/` | `.html` |
| FRM | `FRM-[3d]_Desc.xlsx` | `04-Bieu-Mau/` | `.xlsx` |
| JD | `jd-[kebab-role].html` | `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/` | `.html` |
| Dept | `dept-[name]-handbook.html` | `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/` | `.html` |
| Policy | `pol-qms-[3d]-[kebab].html` | `02-Tai-Lieu-He-Thong/02-Policies-Objectives/` | `.html` |
| Manual | `qms-man-[3d]-[kebab].html` | `02-Tai-Lieu-He-Thong/01-Quality-Manual/` | `.html` |
| Training | `C[01-19].html` / `C[01-19]-L[1-4].html` | `10-Training-Academy/02-Training-Content/01-Modules/` | `.html` |
| Portal | `portal.html` | `01-QMS-Portal/` | `.html` |
| Index | `index.html` | Root of each section | `.html` |

---

## G. Naming rules for operational records and evidence (SharePoint)

> Full details: see **`15-evidence-and-records-naming.md`**

This file 02 regulates how to name **control documents** (SOP, WI, ANNEX, FRM blank, JD) on the web portal.
File 15 specifies how to name **operational records** (completed form, evidence, engineering baseline) saved on SharePoint.

### G1. Summary of 6 naming patterns for operational records

| Pattern | Template | Used for |
|---------|---------|---------|
| 1. Filled Forms | `FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Filled form (Excel/PDF) |
| 2. Job Evidence | `{RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Photos, CMM, certs, scans attached to job |
| 3. Eng. Baseline | `{FileType}_{PartRev}_{Op}_{Machine}_V{ver}.{ext}` | NC, CAM, Setup Sheet, Fixture master |
| 4. Non-job Evidence | `{RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Audit, MR, training, department records |
| 5. Form Blank | `FRM-{code}_{Title}_V{ver}.xlsx` | Form blank download (version stamp) |
| 6. Asset Records | `{AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Fixture, gage, tooling records |

### G2. Distinguish between document and file file names

| System | File name | For example | Regulations |
|----------|---------|-------|----------|
| Web portal (document) | kebab-case, English | `sop-631-ncr-management.html` | Section B (this file) |
| Web portal (form blank) | FRM + Title + Version | `FRM-631_NCR-Report_V2.1.xlsx` | Section B5 + File 15 |
| SharePoint (filled form) | FRM + Version + Scope + Time + User | `FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.xlsx` | File 15 |
| SharePoint (evidence) | RecordType + Scope + Time + User | `PHOTO-NCR_NCR-2026-043_20260327_0831-NVA.jpg` | File 15 |
| SharePoint (baseline) | FileType + Part + Op + Machine + Ver | `NC_714XXXX-REVA_OP10_5AX_V3.nc` | File 15 |

### G3. SharePoint architecture

See **`14-m365-sharepoint-architecture.md`** for the 4 sites topology, libraries, permissions, and online form sync.

---

> **Last updated:** 2026-03-27
> **Applies:** All folders and files in repo qms.hesem.com.vn

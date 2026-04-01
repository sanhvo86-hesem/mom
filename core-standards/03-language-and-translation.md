# 03 — Language and translation rules

> Full rules for translating and editing QMS content from English to Vietnamese.
> Applies to both manual translation and automatic translation using `context_translate_engine.py`.

---

## A. General principles

### A1. Main language: Vietnamese

- The content of the QMS document is written in pure Vietnamese, clear and concise
- English abbreviations remain the same (see full list in section C)
- Industry terms that do not have exact equivalents remain in English (see section D)
- Don't write academically, don't write long sentences — each sentence serves a real function
- All content displayed in SOP/WI/ANNEX/JD MUST prioritize Vietnamese, except for locked exceptions in sections C, D and A4

### A1a. Glossary rules when keeping English abbreviations

- In the glossary, `meaning` MUST contain the full English name of the term.
- If `term` is an abbreviation, do not let `meaning` simply repeat the abbreviation itself.
- If the query or document uses the form `Full Term (ABBR)`, glossary canonical must still return `ABBR`.
- When a role code/JD code is included in the glossary, `meaning` must still be the full English title, while `vi` is the standardized Vietnamese label.

Full canonical: see `25-glossary-canonical-abbreviation-standard.md`.

### A4. Lockout exception has been acknowledged

- Maintain all standard abbreviations in section C.
- Maintain 3 industry terms: `Setup`, `Traveler`, `Balloon`.
- Maintain the methods/doctrine names: `Kaizen`, `Dreyfus`, `Pareto`, `Kolb`, `Poka-yoke`.
- Maintain the system's unique name, brand and technical titles such as `Epicor`, `Epicor Kinetic`, `SharePoint`, `M365`, `Microsoft 365`, `Entra ID`, `Power Automate`, `Power BI`, `Azure`, `HESEM`, `Zalo`.
- In addition to the above exception groups, the prose displayed to the reader must be Vietnameseized according to the correct operating context.
- Do not make exceptions to retain half-English, half-Vietnamese phrases such as `review plan`, `shipment pack`, `tool readiness`, `change logic`, `route control` if there is a standard Vietnamese version in sections E and F.

### A5. eQMS (Online Form) form language — Standard bilingual

All eQMS online forms (FRM-xxx-SUFFIX) display **bilingual** in a consistent pattern:

**General pattern:** Main English (bold, capital letters) + Vietnamese with diacritics (italic, smaller, light color)

| Ingredients | Main language | Secondary language | Example |
|------------|---------------|-------------|-------|
| **Field label** | English (capital letters, bold) | Vietnamese has accents (italic, small) | `SCAR DATE` *SCAR release date* |
| **Section title** | Main English | Vietnamese explanation below | `Record Identification & Supplier` + `Khóa đủ ngữ cảnh phát hành...` |
| **Section description / notes** | Vietnamese has the accent | — | `Khóa đủ ngữ cảnh phát hành...` |
| **Placeholder** | Vietnamese has the accent | — | `Chọn người phát hành SCAR` |
| **Helper text** | Vietnamese has the accent | — | `Có thể gõ tên hoặc chọn từ danh sách` |
| **Dropdown options** | Bilingual Vietnamese (English) | — | `Nghiêm trọng (Critical)` |
| **Signature label** | Main English | Vietnamese subtitles below | `Originator` / *Publisher* |
| **Signature status** | Vietnamese | — | `Chưa ký`, `Ký` |
| **Header .doc-name** | English (SSOT) | — | `Supplier Corrective Action Request (SCAR)` |
| **Header .sub-vn** | Vietnamese has the accent | — | `Ghi nhận yêu cầu hành động khắc phục...` |

**Required rules:**
- **All Vietnamese strings MUST have full diacritics** — CANNOT be written without diacritics
  - ❌ `"Yeu cau"` → ✅ `"Yêu cầu"`
  - ❌ `"Chua ky"` → ✅ `"Chưa ký"`
- Schema JSON saves Vietnamese strings with full Unicode (UTF-8)
- Fields selected from background data (supplier, part, operator) use `type: "lookup"` with `lookup_source`
- Issuing and approving people MUST be selected from the personnel list, not entered by hand
- Company-level personnel fields such as `issued_by`, `reviewed_by`, `approved_by`, `prepared_by`, `verified_by`, `owner_user` MUST use `lookup_source: "company_users"` instead of `operators`
- For every `company_users` field, the frontend MUST have a `Dùng người đăng nhập` shortcut button for users to quickly use the account they are logging in to
- With electronic signatures, the default CTA MUST clearly state that the signer is the current account, for example `Người đăng nhập ký`
- Header form complies with core standard 23 (`.doc-name` = English SSOT, `.sub-vn` = Vietnamese)
- Section title of eQMS form MUST be primary English; All subtitles, explanations, helpers, placeholders, warnings, notes, workflow hints below MUST be in Vietnamese with accents
- The rule applies to `10-eqms-form-runtime.js`, PDF export, and any future form renderers

### A6. Master Data Entities Language

- All underlying data entities (suppliers, customers, parts, operators, work centers, machines, tooling assets, etc.) are stored and displayed **100% English**
- Entity name, code, description in master-data.json: English only
- When appearing in dropdown/lookup on form: displays original English from background data
- **Background data auto-link rule:** If an input field on the form has corresponding data in the master data, that field **MUST** be converted to `type: "lookup"` with `lookup_source` pointing to the corresponding background data table, instead of having the user enter it manually
- List of standard background data tables:

| Table | lookup_source | Content |
|------|--------------|----------|
| Customers | `customers` | customer_id, customer_name, customer_type |
| Customer Sites | `customer_sites` | site_id, customer_id, site_name, country_code |
| Commercial Accounts | `commercial_accounts` | account_id, customer_id, promise_policy_id |
| Suppliers | `suppliers` | supplier_id, supplier_name, contact_name, contact_email |
| Parts | `parts` | part_number, revision, part_description |
| Revisions | `revisions` | revision_id, part_number, revision |
| Incoterms | `incoterms` | incoterm_code, incoterm_name |
| Payment Terms | `payment_terms` | payment_term_code, payment_term_name |
| Shipping Methods | `shipping_methods` | shipping_method_id, shipping_method_name, mode |
| Promise Policies | `promise_policies` | promise_policy_id, policy_name, target_otd_percent |
| Routing Library | `routing_library` | routing_id, routing_name, part_number, part_revision |
| BOM Library | `bom_library` | bom_id, bom_name, part_number, part_revision |
| Control Plans | `control_plans` | control_plan_id, control_plan_name, part_number, part_revision |
| Inspection Plans | `inspection_plans` | inspection_plan_id, inspection_plan_name |
| Traveler Templates | `traveler_templates` | traveler_template_id, traveler_template_name |
| Quality Gate Profiles | `quality_gate_profiles` | quality_gate_profile_id, profile_name |
| Launch Gate Templates | `launch_gate_templates` | gate_template_id, gate_name, work_center_id |
| Customer Item Approvals | `customer_item_approvals` | approval_id, customer_id, part_number |
| Supplier Process Approvals | `supplier_process_approvals` | approval_id, supplier_id, special_process |
| Warehouse Locations | `warehouse_locations` | warehouse_id, warehouse_name, warehouse_type |
| Defect Catalog | `defect_catalog` | defect_code, defect_name, defect_group, severity_default |
| Company Directory | `company_users` | username, name, role, department, title |
| Operators | `operators` | operator_id, operator_name, role |
| Work Centers | `work_centers` | work_center_id, work_center_name, department |
| Machines | `machines` | machine_id, machine_name, machine_type |
| Tooling Assets | `tooling_assets` | tool_id, tool_name, tool_type |
| Tool Assemblies | `tool_assemblies` | assembly_id, parent_tool_id, component_tool_id |
| Downtime Reason Codes | `downtime_reason_codes` | reason_code, reason_name, category |
| Downtime Resolution Codes | `downtime_resolution_codes` | resolution_code, resolution_name, resolution_group |
| MES Connectivity Adapters | `mes_connectivity_adapters` | adapter_id, machine_id, adapter_type |
| MES Alarm Catalog | `mes_alarm_catalog` | alarm_code, title, severity_default |
| MES Alarm Playbooks | `mes_alarm_playbooks` | playbook_id, alarm_code, response_steps |
| NC Program Releases | `nc_program_releases` | program_id, release_title, operation_number |
| CAPA | `capas` | capa_number, title, status |

- When creating a new form, check each field: if field_id or label matches any of the above tables, lookup is required.
- Required lookup is a controlled searchable droplist; Do not use static `<select>` if the data is likely to grow large or needs to be searched

### A2. Golden rule

| Element | Translate? | Reason |
|---------|-------|-------|
| Text content (between `>` and `<`) | **YES** — translated into Vietnamese | This is what users read |
| Tag `<title>` (control document) | **NO** — keep standard English SSOT according to filename | Synchronize with `Tên file / tiêu đề chuẩn` in Portal and avoid losing links when rename |
| Attribute `href` | **NO** — keep | File path, not content |
| Attribute `class` | **NO** — keep | CSS class name |
| Attribute `id` | **NO** — keep | Element identifier |
| Attribute `src` | **NO** — keep | Resource link |
| Attribute `style` | **NO** — keep | CSS inline |
| Attribute `data-*` | **NO** — keep | Technical data |
| Attribute `alt` (image) | **YES** — translated into Vietnamese | Image description for accessibility |
| Attribute `title` (tooltip) | **YES** — translated into Vietnamese | User tooltip read |
| Attribute `placeholder` | **YES** — translated into Vietnamese | Data entry instructions |
| Block `<style>...</style>` | **NO** — keep all | CSS Code |
| Logic/identifier in `<script>...</script>` | **NO** — keep | Functions, variables, selectors, technical keys |
| String displayed in JavaScript / template literal / JSON UI | **YES** — written in Vietnamese with | This is what users see |
| File name in `href`/`download` | **NO** — keep | The actual file name on the system |
| Comment HTML `<!-- -->` | **NO** — keep | Technical comments |

### A3. Illustrative example

**Previous (English):**
```html
<h2 class="h2">1) Document Control Procedure</h2>
<p>The document responsible person shall review all changes before release.</p>
<a href="../sop-101-document-and-data-control.html" class="doc-link">
  See SOP-101 — Document and Data Control
</a>
```

**After (Vietnamese):**
```html
<h2 class="h2">1) Quy trình kiểm soát tài liệu</h2>
<p>Người phụ trách tài liệu phải rà soát tất cả thay đổi trước khi phát hành.</p>
<a href="../sop-101-document-and-data-control.html" class="doc-link">
  Xem SOP-101 — Kiểm soát tài liệu và dữ liệu
</a>
```

**Note:**
- `class="h2"` → keep it the same
- `href="../sop-101-document-and-data-control.html"` → keep it the same
- `class="doc-link"` → keep it the same
- `SOP-101` → keep (document code)
- Text content → translated into Vietnamese

---

## A+. Internal proper nouns — ABSOLUTELY NOT translated

> ⚠ See full details at `01-immutable-rules.md` section B3.

The following types of names are **systemic proper nouns** — translation will break the link:

| Type | Example | Reason for not translating |
|------|-------|------------------|
| SharePoint Site Name | `HESEM-Records`, `HESEM-Job-Evidence`, `HESEM-People`, `HESEM-Digital` | Site identifier on M365 |
| Site owner / security group | `QMS-Owner` | M365 security group name |
| Column name CamelCase | `RecordType`, `StatusCode`, `JobNum`, `CustomerID`, `EvidenceUrl` | Technical column names in M365 Lists/Epicor |
| Preset Vietnamese column names | `Người phê duyệt`, `Phiên bản` (when column names) | Column name configured in system |
| Account/group name | `QMS-Owner`, `HESEM-Admin` | Security group name |

**How to identify:** Words written in CamelCase (alternate capital letters) → technical column name → DO NOT translate.

---

## B. Detailed rules for each element type

### B1. Heading and title

```html
<!-- Dịch nội dung, giữ nguyên class -->
<h1 class="h1">Quy trình kiểm soát tài liệu và dữ liệu</h1>
<h2 class="h2">1) Mục đích và phạm vi</h2>
<h3 class="h3">1.1 Phạm vi áp dụng</h3>
```

### B2. Table

```html
<!-- Dịch nội dung ô, giữ nguyên class/id -->
<table class="table">
  <thead>
    <tr>
      <th>Bước</th>
      <th>Hành động</th>
      <th>Người chịu trách nhiệm</th>
      <th>Hồ sơ / Bằng chứng</th>
    </tr>
  </thead>
</table>
```

### B3. Link and download tags

```html
<!-- href giữ nguyên, text hiển thị dịch -->
<a href="../../../04-Bieu-Mau/01-FRM-100/FRM-101_Master_Document_Register.xlsx" download>
  📥 FRM-101 — Sổ đăng ký tài liệu chủ
</a>

<!-- Tên file trong download KHÔNG dịch -->
❌ <a href="../FRM-101_So_Dang_Ky_Tai_Lieu.xlsx">
```

### B4. Meta header tag

```html
<div class="meta">
  <div class="row"><span><b>Mã:</b></span><span>SOP-101</span></div>
  <div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
  <div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
  <div class="row"><span><b>Chủ sở hữu:</b></span><span>{{OWNER_ROLE_HTML}}</span></div>
  <div class="row"><span><b>Phê duyệt:</b></span><span>{{APPROVER_ROLE_HTML}}</span></div>
</div>
```

### B5. Notes and callouts

```html
<div class="note">
  <strong>Ghi chú:</strong> Mọi thay đổi tài liệu phải được phê duyệt trước khi phát hành.
</div>
<div class="callout">
  <strong>⚠ Lưu ý quan trọng:</strong> Bản in không kiểm soát — luôn kiểm tra phiên bản hiện hành trên hệ thống.
</div>
```

---

## C. The list of abbreviations remains in English

### C1. Quality management system

| Abbreviation | Full meaning | Notes |
|----------|---------------|---------|
| QMS | Quality Management System | Quality management system |
| QA | Quality Assurance | Quality assurance |
| QC | Quality Control | Quality Control |
| ISO | International Organization for Standardization | |
| AS9100D | Aerospace Quality Management System Standard | |
| PDCA | Plan-Do-Check-Act | Improvement cycle |

### C2. Document type and code

| Abbreviation | Meaning | Used in |
|----------|-------|------------|
| SOP | Standard Operating Procedures | Process code |
| WI | Work Instructions | Tutorial code |
| FRM | Form | Form code |
| ANNEX | Annex / Reference Pack | Reference document code |
| REC | Record | Profile code |
| RPT | Report | Report code |
| CERT | Certificate | Certificate code |
| DCR | Document Change Request | Document Change Request |

### C3. Trade and supply chain

| Abbreviation | Meaning |
|----------|-------|
| RFQ | Request for Quotation |
| PO | Purchase Order |
| CSR | Customer Service Representative |
| CoC | Certificate of Conformity |
| CoA | Certificate of Analysis |
| POD | Proof of Delivery |
| BOM | Bill of Materials |
| Incoterms | International Commercial Terms |

### C4. Quality and measurement

| Abbreviation | Meaning |
|----------|-------|
| NCR | Non-Conformance Report |
| CAPA | Corrective and Preventive Action |
| SCAR | Supplier Corrective Action Request |
| FAI | First Article Inspection |
| FMEA | Failure Mode and Effects Analysis |
| PFMEA | Process FMEA |
| MSA | Measurement System Analysis |
| SPC | Statistical Process Control |
| IPQC | In-Process Quality Control |
| AQL | Acceptable Quality Level |
| CTQ | Critical to Quality |
| ALCOA | Attributable, Legible, Contemporaneous, Original, Accurate |
| GR&R | Gage Repeatability & Reproducibility |

### C5. KPIs and performance measurement

| Abbreviation | Meaning |
|----------|-------|
| KPI | Key Performance Indicator |
| OTD | On-Time Delivery |
| FPY | First Pass Yield |
| COPQ | Cost of Poor Quality |
| MTTR | Mean Time to Repair |
| DPPM | Defective Parts Per Million |

### C6. Engineering and manufacturing

| Abbreviation | Meaning |
|----------|-------|
| CNC | Computer Numerical Control |
| NC | Numerical Control |
| DFM | Design for Manufacturability |
| CAM | Computer-Aided Manufacturing |
| CMM | Coordinate Measuring Machine |
| 3D | Three-Dimensional |
| ASME | American Society of Mechanical Engineers |
| ASTM | American Society for Testing and Materials |
| SMED | Single-Minute Exchange of Dies |
| LOTO | Lock Out / Tag Out |
| GD&T | Geometric Dimensioning & Tolerancing |

### C7. Information systems and management

| Abbreviation | Meaning |
|----------|-------|
| ERP | Enterprise Resource Planning |
| MES | Manufacturing Execution System |
| SSOT | Single Source of Truth |
| SoR | System of Records |
| RACI | Responsible, Accountable, Consulted, Informed |
| RBAC | Role-Based Access Control |
| PDF | Portable Document Format |
| M365 | Microsoft 365 |
| API | Application Programming Interface |

### C8. Operational management

| Abbreviation | Meaning |
|----------|-------|
| FIFO | First In, First Out |
| FEFO | First Expired, First Out |
| SBAR | Situation, Background, Assessment, Recommendation |
| TIMWOODS | Transport, Inventory, Motion, Waiting, Overprocessing, Overproduction, Defects, Skills |
| SSCC | Serial Shipping Container Code |
| FOD | Foreign Object Debris/Damage |

### C9. Version

| Abbreviation | Meaning |
|----------|-------|
| V0 | Revision token according to system policy; For detailed meaning, see `09-versioning-and-workflow.md` |
| V1, V2, V3... | The next revision follows the policy at `09-versioning-and-workflow.md` |

### C10. Administration and Legal Affairs (Vietnam)

| Abbreviation | Meaning |
|----------|-------|
| Social insurance | Social insurance |
| Health insurance | Health insurance |
| Unemployment insurance | Unemployment insurance |
| Fire protection | Fire prevention |

### C11. Specialized materials

| Abbreviation | Meaning |
|----------|-------|
| PEEK | Polyether Ether Ketone |
| Vespel | DuPont Vespel polyimide |
| PTFE | Polytetrafluoroethylene |
| SEMI | Semiconductor Equipment and Materials International |

---

## D. Industry terminology remains in English

The following terms are **NOT** translated when used in Vietnamese documents because they do not have exact equivalents or have become common terms in the industry:

### D1. CNC manufacturing

| Terminology | Context of use |
|-----------|-------------------|
| **Setup** | Setting up the machine, preparing for machining — "complete Setup before running" |
| **Traveler** | Travel tracking card with product — "recorded on Traveler" |
| **Balloon** | Feature numbering on FAI drawings — "Balloon #3 corresponds to size D1" |

### D2. Software and systems

| Terminology | Context of use |
|-----------|-------------------|
| **Epicor** | ERP software — "enter orders into Epicor" |
| **SharePoint** | Document storage platform — "upload to SharePoint" |
| **M365** | Microsoft 365 — "Configure permissions on M365" |
| **Zalo** | Messaging application — "notification via Zalo" |

### D3. Methods and models

| Terminology | Context of use |
|-----------|-------------------|
| **Kaizen** | Continuous improvement — "organizing Kaizen events" |
| **Dreyfus** | 5-level capacity development model — "assessment according to Dreyfus" |
| **Pareto** | 80/20 analysis — "Pareto charting" |
| **Kolb** | Learning cycle — "applying the Kolb learning cycle" |
| **Poka-yoke** | Error-proof design — "apply Poka-yoke at the test station" |

---

## E. Translation dictionary — Core QMS terminology

### E1. Standard translation table

| English | Vietnamese | Notes |
|-----------|------------|---------|
| document | documents | |
| records | profile | noun |
| release | release | documents |
| approval | approval | |
| review | review | |
| revision | version | |
| inspection | check | |
| requirement | request | |
| evidence | evidence | |
| compliance | compliance | |
| deviation | deviation | |
| traceability | traceability | |
| calibration | calibration | |
| competence | capacity | |
| training | training | |
| production | production | |
| quality | quality | |
| customer | customers | |
| suppliers | supplier | |
| complaint | complaints | |
| incident | incident | |
| equipment | equipment | |
| maintenance | maintenance | |
| material | raw materials | |
| measurement | measurement | |
| warehouse | warehouse | |
| delivery | delivery | |
| packaging | packaging | |
| operation | operate | |
| workshop | workshop | |
| form | form | |
| checklist | checklist | |
| engineering | technical | |
| department | departments | |
| scrap | waste products | |
| rework | remake | |
| recall | recall | |
| containment | prevent | |
| finding | detect | |
| obsolete | expired | |
| superseded | replaced | |
| retention | keep | |
| register | register | |
| input | input | |
| output | output | |

### E2. Title and role

The title JD does not follow normal translation rules. Must apply:
- Standard JD title kept in English;
- header/RACI/owner/approver uses shortened role code with JD link;
- Hats like `QMR`, `Document Controller`, `Lead Auditor`, `CI Lead`, `Product Safety Officer`, `Incident Commander` do not stand alone, but must be attached to the actual host role;
- Do not use half English and half Vietnamese like `QA Lead`, `Customer Dịch vụ`, `Production Engineer-IE`, `Governance viên hệ thống Epicor`.

| English | Vietnamese |
|-----------|------------|
| General Director | General Director |
| Production Director | Production Director |
| Document Responsible Person | Document manager |
| Team Leader | Team leader |
| Shift Leader | Head of shift |
| Cell Leader | Team leader |
| Foreman | Foreman |
| Operator | Operator |
| Inspector | Tester |
| Approver | Approver |
| Reviewer | Reviewer |
| Author | Editor |
| Performer | Implementer |
| Specialist | Expert |
| Workers | Workers |
| Admin | Admin |

### E3. Departments

| English | Vietnamese |
|-----------|------------|
| Quality Department | Quality Department |
| Engineering Department | Technical Department |
| Production Department | Production Department |
| Supply Chain | Supply Chain |
| Finance Department | Finance Department |
| HR Department | Human Resources Department |
| EHS Department | Department of Safety - Health - Environment |

### E4. Common phrases

| English | Vietnamese |
|-----------|------------|
| point-of-use | point of use |
| cross-review | cross review |
| holding points | intercept point |
| control gate | control port |
| controlled copy | control version |
| master copy | original |
| release copy | release |
| job dossier | job profile |
| readiness level | readiness level |
| lead department | presiding department |
| internal audit | internal assessment |
| management review | leadership review |
| continuous improvement | continuous improvement |
| change control | change control |
| control plan | control plan |
| setup sheet | installation sheet |
| tool list | tool list |
| lessons learned | Lessons learned |
| production line | production line |
| tracking register | tracking table |
| audit trail | audit trail |
| mandatory holding points | forced stop |
| emergency release | emergency release |
| legal hold | keep legal |
| wrong revision | wrong version |
| related documents | Related documents |
| revision history | revision history |
| responsible person | person in charge |
| Per issuance decision | According to the decision issued |

---

## F. Polysemous words — Translated according to context

Some English words have multiple Vietnamese meanings depending on the context. **MUST** choose the correct meaning:

### F1. "process"

| Context | Translate | Example |
|-----------|------|-------|
| Noun (process) | **process** | "the manufacturing process" → "production process" |
| Verb (process) | **processing** | "process the order" → "process the order" |
| Noun (process) | **process** | "the audit process" → "assessment process" |

### F2. "release"

| Context | Translate | Example |
|-----------|------|-------|
| Documents | **release** | "release the document" → "release the document" |
| Products on hold | **liberation** | "release from hold" → "release from hold" |
| Shipment | **for export** | "release for shipment" → "release for shipment" |

### F3. "record"

| Context | Translate | Example |
|-----------|------|-------|
| Noun | **profile** | "quality records" → "quality records" |
| Verb | **noted** | "record the result" → "record the result" |

### F4. "hold"

| Context | Translate | Example |
|-----------|------|-------|
| QMS (product hold) | **on hold** | "put on hold" → "put on hold" |
| Hold point | **intercept** | "mandatory hold point" → "mandatory hold point" |
| Legal holds | **legal hold** | "legal hold" → "legal hold" |

### F5. "control"

| Context | Translate | Example |
|-----------|------|-------|
| Control (management) | **control** | "document control" → "document control" |
| Control (machine) | **control** | "CNC control" → "CNC control" |
| Check (gate) | **control** | "control gate" → "control gate" |

### F6. "review"

| Context | Translate | Example |
|-----------|------|-------|
| Review (document) | **review** | "peer review" → "cross review" |
| Review (leadership) | **review** | "management review" → "management review" |
| Evaluation (performance) | **review** | "performance review" → "performance review" |

### F7. "audit"

| Context | Translate | Example |
|-----------|------|-------|
| Evaluation (internal/external) | **review** | "internal audit" → "internal audit" |
| Audit (finance) | **audit** | "financial audit" → "financial audit" |
| Review (data) | **review** | "audit trail" → "audit trail" |

### F8. "verify" vs "validate"

| From | Translate | Meaning |
|----|------|-------|
| verify | **verification** | Confirm the correct requirements (check according to spec) |
| validate | **validation confirmed** | Confirmed to meet actual needs (can be used for real) |

---

## G. Automatic translation tool

### G2. Main engine: `context_translate_engine.py`

**Location:** `tools/engines/context_translate_engine.py`

**Function:**
- Translate text nodes in HTML files from English to Vietnamese
- Only translate text content — do not touch HTML tags, attributes, CSS, JS
- Use the longest-match-first algorithm to handle multi-word phrases
- Respect the list of abbreviations (keep the English intact)
- Load dictionary from Excel file

**How to run:**
```bash
# Dịch một file
python tools/engines/context_translate_engine.py path/to/file.html

# Dịch nhiều file (dùng glob)
python tools/engines/context_translate_engine.py "03-Tai-Lieu-Van-Hanh/01-SOPs/**/*.html"
```

**Dictionary priority:**
1. `CORE_DICT` — core dictionary in the code (highest priority)
2. `tools/data/qms-terminology-dictionary.xlsx` — QMS glossary of terms
3. `tools/data/remaining-english-words.xlsx` — additional word list (5008 entries)

### G3. Dictionary file

| File | Location | Description | Quantity |
|------|--------|-------|---------|
| `qms-terminology-dictionary.xlsx` | `tools/data/` | Key QMS Glossary | ~200+ entries |
| `remaining-english-words.xlsx` | `tools/data/` | List of English words that need to be translated | 5008 entries |
| `remaining-english-words-v2.xlsx` | `tools/data/` | Updated version | Update |

### G4. List of abbreviations remains the same (in engine)

Engine automatically recognizes and ignores the following abbreviations (excerpt from `KEEP_ENGLISH` set):

```
QMS, QA, QC, IT, HR, EHS, ENG, PRO, PUR, WHS, MNT, SAL, FIN, HSE,
CNC, OPS, PLA, NCR, CAPA, DCR, SOP, WI, FRM, ANNEX, REC, RPT, CERT,
RFQ, PO, CSR, CoC, CoA, POD, BOM, KPI, OTD, FPY, COPQ, MSA, SPC,
IPQC, FAI, FMEA, PFMEA, SSOT, SoR, RACI, ISO, CTQ, AS9100D, PDCA,
FIFO, FEFO, ALCOA, SCAR, LOTO, SMED, ASME, ASTM, RBAC, MTTR, BHXH,
BHYT, BHTN, PCCC, PTFE, SEMI, Kaizen, Dreyfus, Pareto, Kolb,
Epicor, SharePoint, M365, HESEM, Zalo, Incoterms, PEEK, Vespel,
Setup, Traveler, Balloon, NC, CAM, 3D, CMM, DFM, PDF, USB, URL, API,
ERP, MES, TIMWOODS, SBAR, SSCC, YYYYMMDD
```

---

## Q. Writing style rules

### H0. Vietnamese language MUST have full accents

> ⚠ **MANDATORY RULES:** All Vietnamese content in the document **MUST** be fully and accurately marked.

- **DO NOT** write Vietnamese without diacritics: ~~"Check chat quantity"~~ → ✅ "Check quality"
- **DO NOT** write without punctuation: ~~"Check"~~ → ✅ "Check"
- **DO NOT** write the wrong diacritics: ~~"Check the tea"~~ → ✅ "Check"
- Applies to: titles, content, tables, notes, tooltips, alt text — everywhere Vietnamese is displayed
- ONLY exceptions: English abbreviations (SOP, NCR, CAPA...) and proper nouns

### H0.1 Proper nouns — DO NOT translate

> ⚠ See the full list at `01-immutable-rules.md` section B3.

A proper noun is a **unique identifier** in the system. Translation will break the link.

| Type | Example | Rules |
|------|-------|---------|
| SharePoint Site Name | `HESEM-Records`, `HESEM-Job-Evidence`, `HESEM-People`, `HESEM-Digital` | Keep it 100% |
| Owner name | `QMS-Owner` | Keep it 100% |
| Column name CamelCase | `RecordType`, `JobNum`, `CustomerID` | Keep it 100% |
| Preset VN column name | `Người phê duyệt`, `Phiên bản` (when column names) | Keep it 100% |
| Brand name | Epicor, Epicor Kinetic, SharePoint, M365, Microsoft 365, HESEM | Keep it 100% |
| Software/system name | Entra ID, Power Automate, Power BI, Azure | Keep it 100% |

**How to identify proper nouns:**
1. Write CamelCase (alternate capital letters) → technical column name
2. Has the prefix `HESEM-` → site/group name
3. End with `ID`, `Num`, `Date`, `Code`, `Type`, `Status`, `Url` → column name
4. Is a product/brand name → proper noun

### H1. Voice

- **Brief:** Each sentence has a maximum of 25-30 words. Longer sentences must be separated.
- **Active:** "Operator checks pressure" instead of "Pressure is checked by operator"
- **Specifically:** "Check 3 points: diameter, depth, roughness" instead of "Check parameters"
- **Actual combat:** Write so that factory people can read and understand immediately, no need for further explanation

### H2. Capitalization rules

| Object | Rules | Example |
|-----------|---------|-------|
| Department name | Capitalization | Quality Department, Production Department |
| Job title | Capitalization | General Director, Shift Manager |
| Abbreviation | All caps | SOP, WI, NCR, CAPA |
| Document code | Keep the format | SOP-101, WI-201, FRM-301 |
| Software name | Capitalize the first letter | Epicor, SharePoint |

### H3. Punctuation and formatting

- Use `—` (em dash) instead of `–` (en dash) when connecting clauses
- List using `•` or `-`
- Ordinal numbers: `1)`, `2)`, `3)` for heading; `a)`, `b)`, `c)` for sub-item
- Date: `DD/MM/YYYY` or `YYYY-MM-DD` (depending on context)
- Numbers: use dots for decimals (`3.14`), commas for thousands separators (`1,000`)

---

## I. Post-translation inspection

After translating or editing, check:

- [ ] All HTML attributes (href, class, id, src) remain in English
- [ ] All file names in the link remain the same
- [ ] CSS and JS are not translated
- [ ] Abbreviations remain in English
- [ ] Document code remains the same (SOP-101, WI-201...)
- [ ] Polysemous words translated in the correct context
- [ ] Industry terminology remains the same (Setup, Traveler, Balloon, Epicor...)
- [ ] The tone is short, clear, realistic
- [ ] No meta text or "AI generated" note
- [ ] Encoding UTF-8, displays Vietnamese accents correctly

---

> **Last updated:** 2026-04-01
> **Applies:** Complete QMS documentation — HESEM ENGINEERING

---

## J. Locking rule: Vietnamese frontend must have accents

<!-- FRONTEND-VI-DIACRITICS-RULE -->

- Mandatory application for all strings displayed on the frontend: `01-QMS-Portal/portal.html`, `01-QMS-Portal/index.html`, `01-QMS-Portal/scripts/portal/*.js`, form runtime, dashboard, modal, toast, tooltip, placeholder.
- It is strictly forbidden to put unsigned Vietnamese strings on the UI in any state (including demo, fallback, seed data, or draft).
- If the string is in Vietnamese, it must be spelled correctly and have full Unicode markings (UTF-8/NFC).
- Exceptions are only for technical codes, routes, slugs, variables, class/id, and English words in the locked retention list.

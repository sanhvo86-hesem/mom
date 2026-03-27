# 02 — Cấu trúc thư mục và quy ước đặt tên

> Bản đồ đầy đủ cấu trúc thư mục QMS và quy tắc đặt tên file cho mọi loại tài liệu.
> Mọi file mới **PHẢI** tuân theo cấu trúc và quy tắc trong tài liệu này.

---

## A. Cây thư mục đầy đủ (Level 3)

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
│       │   ├── 10-ANNEX-100-Foundation-Maps-and-Control/
│       │   ├── 11-ANNEX-110-Digital-Control-and-Resilience/
│       │   ├── 12-ANNEX-120-Authority-KPI-and-Deputy-Control/
│       │   └── 13-ANNEX-130-M365-Records-Control/
│       ├── 02-ANNEX-200/                   → Series 200: Thương mại
│       ├── 03-ANNEX-300/                   → Series 300: Kỹ thuật
│       ├── 04-ANNEX-400/                   → Series 400: Chuỗi cung ứng
│       ├── 05-ANNEX-500/                   → Series 500: Sản xuất
│       ├── 06-ANNEX-600/                   → Series 600: Chất lượng
│       ├── 07-ANNEX-700/                   → Series 700: Kho & logistics
│       ├── 08-ANNEX-800/                   → Series 800: Nhân sự & EHS
│       └── 09-ANNEX-900/                   → Series 900: Cải tiến
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
│   │   ├── context_translate_engine.py   → Engine dịch Anh→Việt
│   │   └── ...
│   ├── scripts/                           → Scripts chạy một lần theo đợt
│   │   ├── form-repair/                  → Sửa lỗi Excel forms
│   │   ├── translation/                  → Dịch theo batch
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

## B. Quy ước đặt tên file

### B1. SOP — Quy trình

**Mẫu:** `sop-[3digit]-[kebab-case].html`

| Thành phần | Quy tắc | Ví dụ |
|------------|---------|-------|
| Prefix | `sop-` (luôn viết thường) | `sop-` |
| Mã số | 3 chữ số, theo series (1xx, 2xx...) | `101`, `501` |
| Tên | kebab-case, tiếng Anh, mô tả nội dung | `document-and-data-control` |
| Đuôi | `.html` | `.html` |

**Ví dụ thực tế:**
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

**Series mã:**
| Series | Phạm vi | Phòng ban chủ trì |
|--------|---------|-------------------|
| 100 | Nền tảng & quản trị | Quality / IT |
| 200 | Khách hàng & thương mại | Sales / Quality |
| 300 | Kỹ thuật & thiết kế | Engineering |
| 400 | Chuỗi cung ứng | Supply Chain |
| 500 | Sản xuất & vận hành | Production |
| 600 | Chất lượng & đo lường | Quality |
| 700 | Kho & logistics | Warehouse / Supply Chain |
| 800 | Nhân sự, EHS, tài chính | HR / EHS / Finance |
| 900 | Cải tiến & đánh giá | Quality / Management |

### B2. WI — Hướng dẫn công việc

**Mẫu:** `wi-[3digit]-[kebab-case].html`

**Ví dụ thực tế:**
```
wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html
wi-201-quality-gates-hold-points-and-release-execution.html
wi-501-dispatch-capacity-and-wip-control.html
wi-512-3-axis-vertical-milling-guide.html
wi-602-gage-pre-use-verification-and-status-control.html
wi-701-receiving-iqc-traceability-and-put-away.html
wi-901-performance-dashboard.html
```

### B3. ANNEX — Tài liệu tham chiếu

**Mẫu:** `annex-[3digit]-[kebab-case].html`

**Ví dụ thực tế:**
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

**Lưu ý:** ANNEX series 100 có sub-folder phụ (10-ANNEX-100-xxx, 11-ANNEX-110-xxx, 12-ANNEX-120-xxx, 13-ANNEX-130-xxx) do lượng ANNEX nền tảng lớn.

### B4. JD — Mô tả công việc

**Mẫu:** `jd-[kebab-case-role].html`

**Ví dụ thực tế:**
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

### B5. FRM — Biểu mẫu

**Mẫu:** `FRM-[3digit]_Description_Underscores.xlsx`

**Quy tắc:**
- Prefix `FRM-` viết HOA
- Mã số 3 chữ số, theo series (1xx, 2xx...)
- Tên mô tả dùng `_` (underscore) thay khoảng trắng
- Từ viết hoa chữ cái đầu (Title_Case)
- Đuôi `.xlsx`

**Ví dụ thực tế:**
```
FRM-101_Master_Document_Register.xlsx
FRM-102_Document_Change_Request.xlsx
FRM-104_Document_Deployment_Checklist.xlsx
FRM-110_M365_Configuration_Checklist.xlsx
FRM-121_Context_Analysis_SWOT_PESTLE.xlsx
FRM-301_Setup_Sheet.xlsx
FRM-601_Calibration_Log.xlsx
```

### B6. Department Handbook — Sổ tay phòng ban

**Mẫu:** `dept-[name]-handbook.html`

**Ví dụ thực tế:**
```
dept-production-handbook.html
dept-supply-chain-handbook.html
dept-hr-handbook.html
dept-finance-handbook.html
dept-ehs-handbook.html
```

### B7. Training — Đào tạo

**Module bài giảng:**
- Mẫu: `C[01-19].html`
- Ví dụ: `C01.html`, `C10.html`, `C19.html`

**Cấp độ năng lực:**
- Mẫu: `C[01-19]-L[1-4].html`
- Ví dụ: `C01-L1.html`, `C01-L2.html`, `C10-L3.html`

**Thư mục năng lực:**
- Mẫu: `[2digit]-C[2digit]-[PascalCase-Name]/`
- Ví dụ: `01-C01-Safety-5S/`, `10-C10-CNC-Job-Order-Process/`, `19-C19-Leadership-Coaching/`

### B8. Portal & Index

| File | Vị trí | Vai trò |
|------|--------|---------|
| `portal.html` | `01-QMS-Portal/portal.html` | Trang chủ eQMS, điểm truy cập trung tâm |
| `index.html` | Gốc mỗi thư mục level 1 | Trang mục lục của section đó |

---

## C. Quy tắc đặt tên thư mục

### C1. Prefix số thứ tự

Mọi thư mục dùng prefix 2 chữ số:
```
01-, 02-, 03-, ..., 09-, 10-, 11-, ...
```

**Ngoại lệ:** `assets/`, `tools/`, `core-standards/` — thư mục tiện ích không cần prefix.

### C2. Quy ước viết

| Cấp | Quy ước | Ví dụ |
|-----|---------|-------|
| Level 1 | PascalCase hoặc kebab-case | `01-QMS-Portal`, `02-Tai-Lieu-He-Thong` |
| Level 2 | PascalCase | `01-Quality-Manual`, `02-Department-Handbooks` |
| Level 3 | PascalCase | `01-JD-Executive`, `10-ANNEX-100-Foundation-Maps-and-Control` |

### C3. Ký tự hợp lệ

| Được phép | Không được phép |
|-----------|-----------------|
| `a-z` | Dấu tiếng Việt (ắ, ề, ộ...) |
| `A-Z` | Khoảng trắng |
| `0-9` | Ký tự đặc biệt (@ # $ % & ...) |
| `-` (hyphen) | Dấu ngoặc ( ) [ ] { } |
| `_` (underscore) | Dấu chấm phẩy, dấu phẩy |
| `.` (period — chỉ cho đuôi file) | Unicode ngoài ASCII |

**Quy tắc tuyệt đối:** Tên file và thư mục **KHÔNG BAO GIỜ** chứa dấu tiếng Việt hoặc ký tự Unicode ngoài ASCII.

---

## D. Slot mở rộng (Reserved Expansion)

### D1. SOP — Series 1000+

Khi hệ thống mở rộng vượt quá 9 series hiện tại:
- Series 1000+: module mới (ví dụ: 1000 — Automation, 1100 — R&D)
- Thư mục: `10-SOP-1000/`, `11-SOP-1100/`
- File: `sop-1001-[kebab-case].html`

### D2. FRM — Series 1000+

- Tương tự SOP, form series 1000+ cho module mở rộng
- Thư mục: `10-FRM-1000/`, `11-FRM-1100/`
- File: `FRM-1001_Description.xlsx`

### D3. Competency — C20+

- Năng lực bổ sung: `C20`, `C21`, ...
- Thư mục: `20-C20-[Name]/`, `21-C21-[Name]/`
- Module: `C20.html`, `C21.html`
- Level: `C20-L1.html`, `C20-L2.html`

### D4. ANNEX — Series 1000+

- Thư mục: `10-ANNEX-1000/`
- File: `annex-1001-[kebab-case].html`

---

## E. Quy tắc đường dẫn tham chiếu

### E1. Relative path — luôn dùng

Mọi liên kết nội bộ **PHẢI** dùng relative path, không dùng absolute path.

```html
✅ href="../../01-SOPs/01-SOP-100/sop-101-document-and-data-control.html"
✅ href="../../../assets/style.css"

❌ href="/03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101-document-and-data-control.html"
❌ href="https://qms.hesem.com.vn/assets/style.css"
```

### E2. Logo — đường dẫn chuẩn

```html
<img alt="HESEM Logo" src="[relative]/assets/hesem-logo.svg"/>
```

Trong đó `[relative]` là đường dẫn relative từ file hiện tại đến gốc repo:
- Từ `01-QMS-Portal/portal.html` → `../assets/hesem-logo.svg`
- Từ `03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101.html` → `../../../assets/hesem-logo.svg`

### E3. Portal — đường dẫn chuẩn

```html
<a href="[relative]/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
```

### E4. CSS & JS — đường dẫn chuẩn

```html
<link rel="stylesheet" href="[relative]/assets/style.css"/>
<!-- cuối body -->
<script src="[relative]/assets/app.js"></script>
```

### E5. Tham chiếu chéo giữa loại tài liệu

| Từ | Đến | Pattern |
|----|-----|---------|
| SOP → WI | `../../02-Work-Instructions/[series]/wi-xxx.html` | Cùng level 1 |
| SOP → ANNEX | `../../03-Reference/[series]/annex-xxx.html` | Cùng level 1 |
| SOP → Form | `../../../04-Bieu-Mau/[series]/FRM-xxx.xlsx` | Khác level 1 |
| WI → SOP | `../../01-SOPs/[series]/sop-xxx.html` | Cùng level 1 |
| JD → SOP | `../../../03-Tai-Lieu-Van-Hanh/01-SOPs/[series]/sop-xxx.html` | Khác level 1 |

### E6. Form download link

```html
<a href="../../../04-Bieu-Mau/01-FRM-100/FRM-101_Master_Document_Register.xlsx"
   class="form-link" download>
  📥 FRM-101 — Sổ đăng ký tài liệu chủ
</a>
```

**Lưu ý:** Tên file trong `href` và `download` **KHÔNG BAO GIỜ** dịch.

---

## F. Bảng tóm tắt nhanh

| Loại | Mẫu tên file | Thư mục gốc | Đuôi |
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
| Index | `index.html` | Gốc mỗi section | `.html` |

---

## G. Quy tắc đặt tên hồ sơ vận hành và evidence (SharePoint)

> Chi tiết đầy đủ: xem **`15-evidence-and-records-naming.md`**

File 02 này quy định cách đặt tên **tài liệu kiểm soát** (SOP, WI, ANNEX, FRM blank, JD) trên web portal.
File 15 quy định cách đặt tên **hồ sơ vận hành** (form đã điền, evidence, engineering baseline) lưu trên SharePoint.

### G1. Tóm tắt 6 naming patterns cho hồ sơ vận hành

| Pattern | Template | Dùng cho |
|---------|---------|---------|
| 1. Filled Form | `FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Form đã điền (Excel/PDF) |
| 2. Job Evidence | `{RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Photos, CMM, certs, scans gắn job |
| 3. Eng. Baseline | `{FileType}_{PartRev}_{Op}_{Machine}_V{ver}.{ext}` | NC, CAM, Setup Sheet, Fixture master |
| 4. Non-job Evidence | `{RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Audit, MR, training, dept records |
| 5. Form Blank | `FRM-{code}_{Title}_V{ver}.xlsx` | Form blank download (version stamp) |
| 6. Asset Records | `{AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}` | Fixture, gage, tooling records |

### G2. Phân biệt tên file tài liệu vs hồ sơ

| Hệ thống | Tên file | Ví dụ | Quy định |
|----------|---------|-------|----------|
| Web portal (tài liệu) | kebab-case, tiếng Anh | `sop-631-ncr-management.html` | Section B (file này) |
| Web portal (form blank) | FRM + Title + Version | `FRM-631_NCR-Report_V2.1.xlsx` | Section B5 + File 15 |
| SharePoint (form đã điền) | FRM + Version + Scope + Time + User | `FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.xlsx` | File 15 |
| SharePoint (evidence) | RecordType + Scope + Time + User | `PHOTO-NCR_NCR-2026-043_20260327_0831-NVA.jpg` | File 15 |
| SharePoint (baseline) | FileType + Part + Op + Machine + Ver | `NC_714XXXX-REVA_OP10_5AX_V3.nc` | File 15 |

### G3. Kiến trúc SharePoint

Xem **`14-m365-sharepoint-architecture.md`** cho topology 4 sites, libraries, permissions, và online form sync.

---

> **Cập nhật lần cuối:** 2026-03-27
> **Áp dụng:** Toàn bộ thư mục và file trong repo qms.hesem.com.vn

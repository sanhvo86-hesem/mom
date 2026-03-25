# 11 — Chiến lược lưu trữ AI: Scripts, Tools & Reports

> Quy tắc tổ chức cho tất cả scripts và reports do AI (Claude Code, GPT Codex, hoặc bất kỳ AI nào) tạo ra.
> Áp dụng cho mọi phiên làm việc — bất kể AI agent nào tạo file.

---

## A. Nguyên tắc cốt lõi

1. **Root sạch** — Không bao giờ để file `.py`, `.mjs`, `.ps1` rời ở gốc repo. Mọi script phải nằm trong `tools/`.
2. **Phân loại theo chức năng** — Không phân loại theo AI agent (Claude vs GPT). Phân theo MỤC ĐÍCH của script/report.
3. **Engines vs Scripts** — Phân biệt rõ engine tái sử dụng (giữ lâu dài) và script chạy một lần (có thể xóa sau).
4. **Reports có thư mục con** — `_reports/` PHẢI có cấu trúc con, không dump flat.
5. **Date-stamp nhất quán** — File có ngày dùng format `YYYYMMDD` (ví dụ: `20260325`), đặt ở CUỐI tên file.

---

## B. Cấu trúc `tools/` — Scripts & Engines

```
tools/
├── engines/                          → Engine tái sử dụng (giữ vĩnh viễn)
│   ├── context_translate_engine.py  → Dịch Anh→Việt có ngữ cảnh
│   ├── fill_missing_translations.py → Điền bản dịch thiếu
│   ├── translate_en_to_vi.py        → Dịch trực tiếp EN→VI
│   ├── create_dictionary.py         → Xây dựng từ điển
│   └── restore_roles_storage.py     → Khôi phục vai trò/phân quyền
│
├── scripts/                          → Scripts chạy một lần hoặc theo đợt
│   ├── form-repair/                 → Sửa lỗi Excel forms
│   ├── translation/                 → Dịch theo batch (có date-stamp)
│   ├── encoding/                    → Sửa mojibake/encoding
│   ├── link-repair/                 → Sửa broken links & doc codes
│   ├── language-polish/             → Polish ngôn ngữ Việt
│   └── m365/                        → SharePoint/M365 scripts
│
├── data/                             → Dữ liệu tham chiếu (từ điển, word lists)
│   ├── qms-terminology-dictionary.xlsx
│   ├── remaining-english-words.xlsx
│   └── remaining-english-words-v2.xlsx
│
└── legacy/                           → Scripts cũ, chưa phân loại (tạm giữ)
```

### B1. Quy tắc phân loại

| Loại | Tiêu chí | Thư mục | Ví dụ |
|------|----------|---------|-------|
| **Engine** | Tái sử dụng, không date-stamp, import được | `tools/engines/` | `context_translate_engine.py` |
| **Script** | Chạy 1 lần, có date-stamp hoặc version | `tools/scripts/[category]/` | `fix_forms_v5.py` |
| **Data** | File dữ liệu (.xlsx, .csv, .json, .txt) dùng làm input | `tools/data/` | `qms-terminology-dictionary.xlsx` |

### B2. Đặt tên script

**Engine:** `[kebab-case-function].py` hoặc `.mjs`
```
context_translate_engine.py
form_engine.py
```

**Script:** `[kebab-case-function]-[YYYYMMDD].[ext]` hoặc `[function]_v[N].[ext]`
```
deep_language_repair_pass2_20260324.mjs
fix_forms_v5.py
batch_upgrade_all.py
```

---

## C. Cấu trúc `_reports/` — Output & Analysis

```
_reports/
├── analysis/                         → Phân tích chiến lược & expert reviews
│   ├── job-order-deployment-expert-analysis-20260325.md
│   ├── cnc-job-order-iso-as9100-practicality-assessment-2026-03-22.md
│   └── security-hardening-audit-2026-03-22.md
│
├── translation/                      → Tiến độ dịch thuật & inventories
│   ├── translation-progress-summary-20260324.md
│   ├── translation-01-qms-portal-20260324.md
│   ├── translation-01-qms-portal-20260324.json
│   └── ...
│
├── link-repair/                      → Tracking sửa broken links
│   ├── broken_links_before.csv
│   ├── link_fix_applied.csv
│   ├── internal-link-fix-updated-files-20260324.txt
│   └── ...
│
├── encoding/                         → Encoding/mojibake fix tracking
│   ├── encoding_autofix_log.csv
│   ├── mojibake-fix-report-2026-03-22.md
│   └── ...
│
├── language/                         → Language audit & mixed-term inventories
│   ├── mixed-language-term-audit-20260323.md
│   ├── mixed-language-term-inventory-20260324.json
│   ├── editorial-mandatory-voice-audit-2026-03-22.md
│   ├── deep-operational-vietnamese-*.md
│   └── ...
│
├── m365/                             → SharePoint/M365 templates & cross-refs
│   ├── m365-sharepoint-upload-template-tree-20260324.txt
│   ├── sharepoint-doc-scan-20260324.txt
│   └── ...
│
├── form-audit/                       → Form analysis & compliance reports
│   ├── frm_names.txt
│   ├── sop_names.txt
│   ├── wi_names.txt
│   └── ...
│
└── screenshots/                      → Screenshots & hình minh họa
    ├── portal-manual-iframe-translate.png
    └── translated-doc.png
```

### C1. Quy tắc phân loại report

| Category | Keyword trong tên file | Thư mục |
|----------|----------------------|---------|
| Expert analysis, assessment, audit chiến lược | `analysis`, `assessment`, `expert`, `security` | `analysis/` |
| Translation, dịch thuật, batch | `translation-*`, `*-translate-*` | `translation/` |
| Broken links, link fix, doc codes | `broken_links_*`, `link_fix_*`, `*-link-*`, `*unresolved*` | `link-repair/` |
| Encoding, mojibake | `encoding_*`, `mojibake_*` | `encoding/` |
| Language, mixed-term, vietnamese, editorial, polish | `mixed-language-*`, `editorial-*`, `deep-operational-*`, `polish-*`, `nonform-*` | `language/` |
| M365, SharePoint | `m365-*`, `sharepoint-*` | `m365/` |
| Form names, compliance | `frm_*`, `sop_*`, `wi_*`, `html_structure_*` | `form-audit/` |
| Screenshots, images | `*.png`, `*.jpg` | `screenshots/` |

### C2. Đặt tên report

**Format:** `[kebab-case-description]-[YYYYMMDD].[ext]`

```
job-order-deployment-expert-analysis-20260325.md
translation-progress-summary-20260324.md
broken_links_before.csv                          ← legacy OK, không cần rename
```

---

## D. `04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/` — Form Engine (giữ nguyên)

Thư mục này chứa form engine và specs đặc thù cho form generation. **Giữ nguyên vị trí** vì:
- `form_engine.py` là engine chuyên biệt cho form Excel
- `specs_frm*.py`, `run_frm*.py` thuộc quy trình tạo form
- Đã có cấu trúc tốt, không cần di chuyển

---

## E. Quy tắc cho AI agents (Claude Code, GPT Codex, v.v.)

### E1. Khi tạo script mới

1. **KHÔNG BAO GIỜ** đặt script ở gốc repo
2. Engine tái sử dụng → `tools/engines/`
3. Script chạy một lần → `tools/scripts/[category]/`
4. Nếu không rõ category → `tools/scripts/` (gốc scripts, phân loại sau)

### E2. Khi tạo report/output

1. **KHÔNG BAO GIỜ** dump vào `_reports/` gốc
2. Xác định category theo bảng C1
3. Đặt vào đúng thư mục con
4. Luôn có date-stamp `YYYYMMDD` trong tên file

### E3. Khi dọn dẹp

1. Scripts đã chạy xong, không dùng lại → có thể xóa hoặc chuyển `tools/legacy/`
2. Reports cũ (> 30 ngày, không còn tham chiếu) → có thể archive hoặc xóa
3. Data files lớn (> 1MB) nên review định kỳ

### E4. Git sync

1. **KHÔNG commit file > 5MB** vào git — dùng `.gitignore` nếu cần
2. Trước khi commit: `git pull --rebase` để tránh conflict
3. Commit message format: `[category] mô tả ngắn` (ví dụ: `[tools] move form-repair scripts to tools/scripts/`)
4. Sau khi reorganize: commit 1 lần duy nhất, không tách nhỏ

---

## F. Tóm tắt nhanh — Quyết định đặt file ở đâu

```
Tôi vừa tạo file gì?
│
├─ Script Python/JS/PS1?
│  ├─ Tái sử dụng, import được? → tools/engines/
│  ├─ Chạy 1 lần, batch? → tools/scripts/[category]/
│  └─ Data file (xlsx, csv)? → tools/data/
│
├─ Report/Output?
│  ├─ Phân tích chiến lược? → _reports/analysis/
│  ├─ Dịch thuật? → _reports/translation/
│  ├─ Sửa links? → _reports/link-repair/
│  ├─ Encoding? → _reports/encoding/
│  ├─ Ngôn ngữ? → _reports/language/
│  ├─ M365/SharePoint? → _reports/m365/
│  ├─ Form audit? → _reports/form-audit/
│  └─ Screenshot? → _reports/screenshots/
│
└─ Form engine/specs? → 04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/
```

---

> **Cập nhật lần cuối:** 2026-03-25
> **Áp dụng:** Mọi AI agent làm việc trên repo qms.hesem.com.vn

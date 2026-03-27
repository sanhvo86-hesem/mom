# HESEM QMS — Core Standards

> Bộ tiêu chuẩn nền tảng cho toàn bộ hệ thống tài liệu QMS của HESEM ENGINEERING.
> Mọi người (AI hoặc con người) tạo/chỉnh sửa tài liệu QMS **PHẢI** đọc và tuân thủ các file trong thư mục này.

---

## Mục đích

Thư mục `core-standards/` chứa các quy tắc bất biến, quy ước đặt tên, cấu trúc thư mục, và quy tắc ngôn ngữ/dịch thuật cho toàn bộ hệ thống eQMS. Đây là **nguồn tham chiếu duy nhất** (single source of truth) cho tất cả các quyết định về format, cấu trúc, và ngôn ngữ tài liệu.

---

## Thứ tự đọc bắt buộc

| # | File | Nội dung |
|---|------|----------|
| 1 | `01-immutable-rules.md` | Các quy tắc KHÔNG BAO GIỜ được vi phạm — đọc đầu tiên |
| 2 | `02-folder-and-naming.md` | Bản đồ thư mục đầy đủ và quy ước đặt tên file |
| 3 | `03-language-and-translation.md` | Quy tắc ngôn ngữ, dịch thuật, từ điển thuật ngữ |

**Ghi nhớ:** Đọc `01-immutable-rules.md` trước khi làm bất kỳ điều gì. File này chứa các quy tắc mà nếu vi phạm sẽ phá vỡ tính nhất quán của toàn bộ hệ thống.

---

## Danh sách file

**Quy tắc khóa về ngôn ngữ:** mọi nội dung tiếng Việt hiển thị cho người dùng trong tài liệu, dashboard, tooltip, placeholder và chuỗi UI render từ JavaScript đều **PHẢI** có dấu đầy đủ, chính xác.

### Tiêu chuẩn chính (đọc theo thứ tự)

| # | File | Nội dung |
|---|------|----------|
| 01 | `01-immutable-rules.md` | Quy tắc bất biến: tên file, viết tắt, brand colors, SSOT, SharePoint List names, Internal Column names |
| 02 | `02-folder-and-naming.md` | Cây thư mục đến level 3, mẫu đặt tên SOP/WI/ANNEX/JD/FRM/Training |
| 03 | `03-language-and-translation.md` | Dịch Anh→Việt, 100+ viết tắt giữ nguyên, từ đa nghĩa |
| 04 | `04-html-design-system.md` | **CSS design system v12** — variables, table, note, badge, metric, gate, print |
| 05 | `05-html-templates.md` | Template copy-paste cho SOP/WI/ANNEX/JD/Training/Handbook |
| 06 | `06-excel-form-standards.md` | 6 loại form Excel (A-F), specs, dropdowns |
| 07 | `07-content-writing-guide.md` | Ngữ điệu, cấu trúc câu, PHẢI/NÊN/CÓ THỂ |
| 08 | `08-document-types.md` | Dàn bài chuẩn 6 loại tài liệu |
| 09 | `09-versioning-and-workflow.md` | V0→V2, DCR, cross-review, approval workflow |
| 10 | `10-expansion-roadmap.md` | Quy hoạch mở rộng tương lai |
| 11a | `11-html-structure-guide.md` | **Cấu trúc HTML file** — header, body, table, box, print |
| 11b | `11-ai-tooling-and-reports.md` | AI tools, scripts, reports organization |
| **12** | **`12-sop-section-6-7-guide.md`** | **⭐ Section 6 (IG table) + Section 7 (Procedure flow) — QUAN TRỌNG; IG độc lập với số bước** |
| **13** | **`13-sop-research-redraft-method.md`** | **⭐ Phương pháp nghiên cứu và viết lại SOP theo từng tài liệu — bắt buộc trước khi sửa Section 3 / 6 / 7** |
| **14** | **`14-m365-sharepoint-architecture.md`** | **⭐ Kiến trúc M365 SharePoint 4-site: topology, libraries, permissions, online forms, sync mechanism** |
| **15** | **`15-evidence-and-records-naming.md`** | **⭐ Quy tắc đặt tên hồ sơ vận hành: 6 naming patterns, RecordType dictionary, UserID, Record-ID, version control** |

### Reference files

| File | Nội dung |
|------|----------|
| `reference/abbreviations-keep-english.md` | 150+ viết tắt giữ nguyên tiếng Anh |
| `reference/color-palette.md` | Bảng màu + cách dùng |
| `reference/css-classes-reference.md` | 190+ CSS classes |
| `reference/cnc-job-order-reference-model.md` | Mô hình tham chiếu job-order CNC theo dải gate/step thực chiến, không phải luật cố định |
| `templates/sop-template.html` | Template SOP copy-paste |
| `templates/wi-template.html` | Template WI copy-paste |

---

## Hướng dẫn nhanh: Tạo tài liệu mới

### Tạo SOP mới

1. Đọc `01-immutable-rules.md` — nắm rõ 23 locked rules
2. Đọc `02-folder-and-naming.md` — xác định mã SOP và tên file
3. Đặt file vào đúng thư mục: `03-Tai-Lieu-Van-Hanh/01-SOPs/[series-folder]/`
4. Tên file: `sop-[3digit]-[kebab-case].html` (ví dụ: `sop-501-production-planning-scheduling-and-dispatch-control.html`)
5. Đọc `13-sop-research-redraft-method.md` nếu sẽ đụng Section 3 / 6 / 7
6. Dùng header chuẩn từ `general_note.md` mục 2
7. Ngôn ngữ nội dung: tiếng Việt, theo quy tắc `03-language-and-translation.md`
8. Section 3 phải viết tên thuật ngữ theo mẫu `English term (thuật ngữ tiếng Việt chuẩn)`
9. CSS reference: `../../../assets/style.css` (relative path)
10. Cuối body: `<script src="../../../assets/app.js"></script>`

### Tạo WI mới

1. Tương tự SOP, đặt vào `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/[series-folder]/`
2. Tên file: `wi-[3digit]-[kebab-case].html`
3. WI là hướng dẫn tại điểm sử dụng — ngôn ngữ ngắn, rõ, thực chiến

### Tạo ANNEX mới

1. Đặt vào `03-Tai-Lieu-Van-Hanh/03-Reference/[series-folder]/`
2. Tên file: `annex-[3digit]-[kebab-case].html`
3. ANNEX là rule-pack — chứa tiêu chí, bảng tra, quy định chi tiết

### Tạo Form mới

1. Đặt vào `04-Bieu-Mau/[series-folder]/`
2. Tên file: `FRM-[3digit]_Description_Underscores.xlsx`
3. Form phải bám SOP/WI/ANNEX active — không tự bịa logic riêng
4. Phải thể hiện gate, hold point, release logic, KPI, owner, approver khi cần

### Tạo JD mới

1. Đặt vào `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/[dept-folder]/`
2. Tên file: `jd-[kebab-case-role].html`

---

## Tài liệu liên quan

| File | Vị trí | Mô tả |
|------|--------|-------|
| `general_note.md` | Gốc repo | Ghi chú chung cho AI & Editor — header, CSS, design system |
| `rule_update_content.md` | Gốc repo | 23 locked rules + yêu cầu đồ họa + tiêu chí chấm |
| `tools/engines/context_translate_engine.py` | `tools/engines/` | Công cụ dịch tự động Anh→Việt |
| `tools/data/qms-terminology-dictionary.xlsx` | `tools/data/` | Từ điển thuật ngữ QMS |
| `tools/data/remaining-english-words.xlsx` | `tools/data/` | Danh sách từ tiếng Anh cần dịch (5008 entries) |

---

> **Cập nhật lần cuối:** 2026-03-27
> **Phạm vi:** HESEM ENGINEERING — ISO 9001:2026, AS9100D-ready

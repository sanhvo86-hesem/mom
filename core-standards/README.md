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

### Tiêu chuẩn chính

- **`01-immutable-rules.md`** — Quy tắc bất biến: tên file English, viết tắt giữ nguyên, brand colors, print layout, SSOT, 23 locked rules vận hành
- **`02-folder-and-naming.md`** — Cây thư mục đầy đủ đến level 3, mẫu đặt tên cho SOP/WI/ANNEX/JD/FRM/Training, ký tự hợp lệ, slot mở rộng
- **`03-language-and-translation.md`** — Quy tắc dịch Anh→Việt, danh sách 100+ viết tắt giữ nguyên, từ đa nghĩa, ví dụ trước/sau, công cụ dịch tự động
- **`11-ai-tooling-and-reports.md`** — Chiến lược lưu trữ AI: quy tắc tổ chức scripts (`tools/`), reports (`_reports/`), phân loại engine vs script, quy tắc cho Claude Code & GPT Codex

### Thư mục hỗ trợ

- **`reference/`** — Tài liệu tham chiếu bổ sung (nếu có)
- **`templates/`** — Template HTML mẫu (nếu có)

---

## Hướng dẫn nhanh: Tạo tài liệu mới

### Tạo SOP mới

1. Đọc `01-immutable-rules.md` — nắm rõ 23 locked rules
2. Đọc `02-folder-and-naming.md` — xác định mã SOP và tên file
3. Đặt file vào đúng thư mục: `03-Tai-Lieu-Van-Hanh/01-SOPs/[series-folder]/`
4. Tên file: `sop-[3digit]-[kebab-case].html` (ví dụ: `sop-501-production-planning-scheduling-and-dispatch-control.html`)
5. Dùng header chuẩn từ `general_note.md` mục 2
6. Ngôn ngữ nội dung: tiếng Việt, theo quy tắc `03-language-and-translation.md`
7. CSS reference: `../../../assets/style.css` (relative path)
8. Cuối body: `<script src="../../../assets/app.js"></script>`

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

> **Cập nhật lần cuối:** 2026-03-25
> **Phạm vi:** HESEM ENGINEERING — ISO 9001:2015, AS9100D-ready

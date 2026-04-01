# HESEM QMS — Core Standards

> Bộ tiêu chuẩn nền tảng cho toàn bộ hệ thống tài liệu QMS của HESEM ENGINEERING.
> Mọi người (AI hoặc con người) tạo/chỉnh sửa tài liệu QMS **PHẢI** đọc và tuân thủ các file trong thư mục này.

---

## Mục đích

Thư mục `core-standards/` chứa các quy tắc bất biến, quy ước đặt tên, cấu trúc thư mục, và quy tắc ngôn ngữ/dịch thuật cho toàn bộ hệ thống eQMS. Đây là **nguồn tham chiếu duy nhất** (single source of truth) cho tất cả các quyết định về format, cấu trúc, và ngôn ngữ tài liệu.

---

## Thứ bậc áp dụng

1. `01-immutable-rules.md` là chuẩn nền cao nhất.
2. Khi `01` không nói trực tiếp, file chuyên đề theo chủ đề (`19`, `20`, `22`, `23`, `24`...) thắng các file tổng quát cũ hơn.
3. `05-html-templates.md`, `11-html-structure-guide.md`, portal/runtime và tài liệu phát hành là bằng chứng triển khai; nếu lệch chuẩn thì sửa implementation theo chuẩn, không kéo chuẩn lùi theo drift.
4. `general_note.md` và `rule_update_content.md` là tài liệu tương thích ngược/tóm tắt; nếu mâu thuẫn với `core-standards/` thì `core-standards/` thắng.
5. Các điểm chưa chốt sau đối chiếu được ghi tại `31-core-standard-reconciliation-log.md`.

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

**Quy tắc khóa về ngôn ngữ:** mọi nội dung tiếng Việt hiển thị cho người dùng trong tài liệu, dashboard, tooltip, placeholder và chuỗi UI render từ JavaScript đều **PHẢI** có dấu đầy đủ, chính xác. Trong SOP, chỉ được giữ tiếng Anh khi thuộc danh sách ngoại lệ đã khóa ở `03-language-and-translation.md`: viết tắt chuẩn, proper noun hệ thống/brand, `Setup`, `Traveler`, `Balloon`, `Kaizen`, `Dreyfus`, `Pareto`, `Kolb`, `Poka-yoke`.

### Tiêu chuẩn chính (đọc theo thứ tự)

| # | File | Nội dung |
|---|------|----------|
| 01 | `01-immutable-rules.md` | Quy tắc bất biến: tên file, viết tắt, brand colors, SSOT, SharePoint List names, Internal Column names |
| 02 | `02-folder-and-naming.md` | Cây thư mục đến level 3, mẫu đặt tên SOP/WI/ANNEX/JD/FRM/Training |
| 03 | `03-language-and-translation.md` | Dịch Anh→Việt, 100+ viết tắt giữ nguyên, từ đa nghĩa |
| 04 | `04-html-design-system.md` | **CSS design system v13** — variables, table, note, badge, metric, gate, print |
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
| **16** | **`16-sop-graphics-kpi-and-redraft-quality.md`** | **⭐ Khóa chuẩn đồ họa flowchart, KPI Section 6, hygiene bản nháp V0 và checklist chống cập nhật cơ học khi tạo/sửa SOP** |
| **17** | **`17-sop-sections-1-5-8-alignment-guide.md`** | **⭐ Khóa cách viết Section 1, 2, 3, 4, 5, 8 bám theo logic gate/step thật của SOP, tránh viết phần đầu và ngoại lệ tách rời vận hành** |
| **18** | **`18-online-vs-offline-form-decision-framework.md`** | **⭐ Khung quyết định form Online vs Offline: 7 tiêu chí chấm điểm, quick rules, phân loại 117 forms, best practices aerospace/automotive/pharma/CNC** |
| **19** | **`19-role-boundary-jd-linking-and-role-codes.md`** | **⭐ Chuẩn role code cho mô hình job-order CNC: JD-linked abbreviations, governance hats, role bundles, cấm placeholder mơ hồ trong header/RACI/owner** |
| **20** | **`20-department-boundary-handbook-codes.md`** | **⭐ Chuẩn department code và subfunction code cho handbook/mandate cấp chức năng; khóa rule coverage gap và cách phân biệt department vs JD** |
| **22** | **`22-jd-header-and-department-code-governance.md`** | **⭐ Quy tắc chốt `Chủ sở hữu` của JD theo D-code, chọn đúng layer role-code vs department-code trong header và owner cell** |
| **23** | **`23-portal-standard-title-filename-ssot.md`** | **⭐ Khóa SSOT cho trường `Tên file / tiêu đề chuẩn`: English-only, đồng bộ filename + header title + link-update khi rename** |
| **23b** | **`23-form-lifecycle-and-allocation.md`** | **⭐ Vòng đời form và phân bổ mã: issuance, allocation, receipt, versioning, offline package control, upload verification** |
| **24** | **`24-form-template-design-system.md`** | **⭐ Hệ thống thiết kế form template: field types, layout rules, reusable blocks, schema-driven rendering, signature blocks, conditional visibility** |
| **25** | **`25-glossary-canonical-abbreviation-standard.md`** | **⭐ Chuẩn canonical cho glossary: `term` là khóa tra cứu, `meaning` là full-English bắt buộc, `ABBR` là canonical key thay cho `Full Term (ABBR)`** |
| **26** | **`26-wi-archetypes-and-qa-guide.md`** | **⭐ Khóa 4 WI archetype: POU, Gate-Execution, Control-Tower, Digital-Operation; có boundary và QA checklist** |
| **27** | **`27-annex-archetypes-and-qa-guide.md`** | **⭐ Khóa 7 ANNEX archetype: matrix, method, rule-pack, dictionary, map/topology, worked example, specification** |
| **28** | **`28-pou-visual-and-machine-side-rules.md`** | **⭐ Rule trình bày và viết POU-WI để đọc được tại điểm sử dụng** |
| **29** | **`29-wi-annex-research-redraft-method.md`** | **⭐ Phương pháp nghiên cứu-viết lại WI/ANNEX theo từng tài liệu, có benchmark bên ngoài và source rule** |
| **30** | **`30-wi-annex-translation-role-bundle-rules.md`** | **⭐ Rule ngôn ngữ, role code, D-code, bundle và anti half-English cho WI/ANNEX** |
| **31** | **`31-core-standard-reconciliation-log.md`** | **⭐ Log đối chiếu, điểm đã hòa giải, mâu thuẫn cần quyết định, điểm chưa rõ cần xác nhận** |

### Reference files

| File | Nội dung |
|------|----------|
| `reference/abbreviations-keep-english.md` | 150+ viết tắt giữ nguyên tiếng Anh |
| `reference/color-palette.md` | Bảng màu + cách dùng |
| `reference/css-classes-reference.md` | 190+ CSS classes |
| `reference/cnc-job-order-reference-model.md` | Mô hình tham chiếu job-order CNC theo dải gate/step thực chiến, không phải luật cố định |
| `reference/job-order-cnc-department-boundary-model.md` | Mô hình tham chiếu ranh giới phòng ban và phân hệ cho job-order CNC |
| `../02-Tai-Lieu-He-Thong/03-Organization/04-RACI-Authority/role-and-department-bundles.html` | Glossary công bố cho mọi bundle role/department/mixed actor được phép rút gọn trong tài liệu phát hành |
| `templates/sop-template.html` | Template SOP copy-paste |
| `templates/wi-template.html` | Template WI copy-paste |
| `templates/wi-pou-template.html` | Template POU-WI copy-paste cho machine-side và visual-first execution |
| `templates/jd-template.html` | Template JD chuẩn hóa role-code, header và wrapper HTML |
| `templates/department-handbook-template.html` | Template handbook phòng ban chuẩn hóa department code, role chips và section boundary |
| `templates/wi-annex-research-working-notes-template.md` | Mẫu working notes cho nghiên cứu, benchmark và boundary log trước khi rewrite WI/ANNEX |

---

## Hướng dẫn nhanh: Tạo tài liệu mới

### Tạo SOP mới

1. Đọc `01-immutable-rules.md` — nắm rõ 23 locked rules
2. Đọc `02-folder-and-naming.md` — xác định mã SOP và tên file
3. Đặt file vào đúng thư mục: `03-Tai-Lieu-Van-Hanh/01-SOPs/[series-folder]/`
4. Tên file: `sop-[3digit]-[kebab-case].html` (ví dụ: `sop-501-production-planning-scheduling-and-dispatch-control.html`)
5. Đọc `13-sop-research-redraft-method.md` nếu sẽ đụng Section 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8
6. Đọc `16-sop-graphics-kpi-and-redraft-quality.md` trước khi tạo mới hoặc viết lại Section 6 / 7 để tránh lệch màu flowchart, KPI chung chung hoặc note biên tập lọt vào SOP
7. Đọc `17-sop-sections-1-5-8-alignment-guide.md` trước khi viết Section 1 / 2 / 3 / 4 / 5 / 8 để bảo đảm phần đầu, vai trò, đầu vào/đầu ra và ngoại lệ bám đúng logic điều hành thật
8. Dùng header chuẩn từ `05-html-templates.md` và `11-html-structure-guide.md`
9. Ngôn ngữ nội dung: tiếng Việt, theo quy tắc `03-language-and-translation.md`
10. Section 3 phải viết tên thuật ngữ theo mẫu `English term (thuật ngữ tiếng Việt chuẩn)`
11. CSS reference: `../../../assets/style.css` (relative path)
12. Cuối body: `<script src="../../../assets/app.js"></script>`
13. Nếu tài liệu có header owner, RACI, gate owner, hold/release authority hoặc approver: bắt buộc đọc `19-role-boundary-jd-linking-and-role-codes.md`
14. Nếu tài liệu dùng phòng ban / phân hệ / interface cấp chức năng: bắt buộc đọc thêm `20-department-boundary-handbook-codes.md`
15. Nếu tài liệu cần gom gọn nhiều role hoặc department thành một actor bundle: bắt buộc công bố bundle đó trong `role-and-department-bundles.html` trước khi dùng chip/token trong tài liệu phát hành
16. Nếu tạo/sửa glossary term hoặc abbreviation mới: bắt buộc đọc `25-glossary-canonical-abbreviation-standard.md`

### Tạo WI mới

1. Tương tự SOP, đặt vào `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/[series-folder]/`
2. Tên file: `wi-[3digit]-[kebab-case].html`
3. WI là hướng dẫn tại điểm sử dụng — ngôn ngữ ngắn, rõ, thực chiến
4. Bắt buộc đọc `26-wi-archetypes-and-qa-guide.md`
5. Nếu là POU-WI, bắt buộc đọc thêm `28-pou-visual-and-machine-side-rules.md`
6. Nếu sửa nội dung lớn, bắt buộc đọc `29-wi-annex-research-redraft-method.md`
7. Role/bundle/D-code phải obey `30-wi-annex-translation-role-bundle-rules.md`

### Tạo ANNEX mới

1. Đặt vào `03-Tai-Lieu-Van-Hanh/03-Reference/[series-folder]/`
2. Tên file: `annex-[3digit]-[kebab-case].html`
3. ANNEX là rule-pack — chứa tiêu chí, bảng tra, quy định chi tiết
4. Bắt buộc đọc `27-annex-archetypes-and-qa-guide.md`
5. Nếu sửa nội dung lớn, bắt buộc đọc `29-wi-annex-research-redraft-method.md`
6. Role/bundle/D-code phải obey `30-wi-annex-translation-role-bundle-rules.md`

### Tạo Form mới

1. Đặt vào `04-Bieu-Mau/[series-folder]/`
2. Tên file: `FRM-[3digit]_Description_Underscores.xlsx`
3. Form phải bám SOP/WI/ANNEX active — không tự bịa logic riêng
4. Phải thể hiện gate, hold point, release logic, KPI, owner, approver khi cần

### Tạo JD mới

1. Đặt vào `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/[dept-folder]/`
2. Tên file: `jd-[kebab-case-role].html`

### Tạo hoặc sửa Department Handbook / matrix tổ chức

1. Đọc `20-department-boundary-handbook-codes.md` và `reference/job-order-cnc-department-boundary-model.md`
2. Đọc handbook hiện hành, handbook upstream/downstream, JD liên quan và SOP/ANNEX nơi boundary đang được dùng
3. Chốt rõ đâu là `department`, `subfunction`, `role`, đâu là `gap`; không sửa cơ học bằng search/replace
4. Khi boundary thay đổi, sync workbook `tools/data/qms-terminology-dictionary.xlsx` tối thiểu ở 2 sheet:
   - `Phong ban`
   - `Department code & handbook link`
5. Rà lại matrix tổ chức, ANNEX, SOP liên đới trước khi kết thúc

---

## Tài liệu liên quan

| File | Vị trí | Mô tả |
|------|--------|-------|
| `general_note.md` | Gốc repo | Ghi chú tương thích ngược cho AI & Editor — chỉ dùng như bản tóm tắt; nếu lệch thì theo `core-standards/` |
| `rule_update_content.md` | Gốc repo | Snapshot cũ của 23 locked rules + yêu cầu đồ họa — dùng để truy vết lịch sử, không thắng `core-standards/` |
| `tools/engines/context_translate_engine.py` | `tools/engines/` | Công cụ dịch tự động Anh→Việt |
| `tools/data/qms-terminology-dictionary.xlsx` | `tools/data/` | Từ điển thuật ngữ QMS |
| `tools/data/remaining-english-words.xlsx` | `tools/data/` | Danh sách từ tiếng Anh cần dịch (5008 entries) |

---

> **Cập nhật lần cuối:** 2026-04-01
> **Phạm vi:** HESEM ENGINEERING — ISO 9001:2026, AS9100D-ready
---

## Unicode / Encoding Governance

- `21-unicode-and-encoding-governance.md`: root standard for UTF-8/NFC enforcement, anti-mojibake gate, and clustered remediation workflow.
- `23-portal-standard-title-filename-ssot.md`: SSOT rule for Portal standard title field, English-only canonical naming, and safe rename/link-sync behavior.

- `Frontend lock`: <!-- FRONTEND-VI-DIACRITICS-README --> mọi chuỗi tiếng Việt hiển thị trên frontend (`portal.html`, dashboard, online form, tooltip, placeholder, toast, modal, JS render string) bắt buộc phải có dấu đầy đủ.

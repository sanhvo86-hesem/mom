# 📋 HESEM eQMS — General Note for AI & Editors

> **⚠ THAM CHIẾU CHÍNH: `core-standards/` — Đọc `core-standards/README.md` trước khi tạo/chỉnh sửa tài liệu.**
> File này giữ lại để tương thích ngược. Bộ tiêu chuẩn đầy đủ nằm trong folder `core-standards/`.

> **Mọi tài liệu chỉnh sửa hoặc tạo mới PHẢI tuân thủ đầy đủ các quy luật dưới đây.**
> Bộ tài liệu hiện tại **chưa phát hành** — tất cả đều là **bản nháp V0**.

---

## 1. Cấu trúc thư mục (Folder Structure)

```
01-QMS-Portal/          → Portal chính (portal.html, api.php, qms-data/)
02-Tai-Lieu-He-Thong/   → Tài liệu hệ thống (Quality Manual, Policies, Organization)
  ├── 01-Quality-Manual/
  ├── 02-Policies-Objectives/
  └── 03-Organization/
03-Tai-Lieu-Van-Hanh/   → Tài liệu vận hành (SOPs, WIs, References)
  ├── 01-SOPs/
  ├── 02-Work-Instructions/
  └── 03-Reference/
04-Bieu-Mau/            → Biểu mẫu (Forms) theo series 100–900
  ├── 01-FRM-100/ đến 09-FRM-900/
10-Training-Academy/    → Học viện đào tạo
  ├── 01-Competency-System/
  │   ├── 01-Framework/
  │   └── 02-Levels/ (19 năng lực × 4 Level)
  ├── 02-Training-Content/
  ├── 03-System-Operations/
  └── 04-Templates-Tools/
11-Glossary/            → Từ điển thuật ngữ
assets/                 → CSS, JS, logo, org chart
```

**Quy tắc đặt tên folder:**
- Prefix số thứ tự 2 chữ số: `01-`, `02-`, ...
- Tên folder dùng PascalCase hoặc kebab-case tiếng Anh
- Không dùng dấu tiếng Việt trong tên folder/file

---

## 2. Cấu trúc Header chuẩn (ISO Document Header)

Mọi tài liệu HTML đều PHẢI có header theo cấu trúc sau:

```html
<div class="form-header">
  <div class="fh-left">
    <a class="brand-logo" href="[relative-path]/01-QMS-Portal/portal.html">
      <img alt="HESEM Logo" src="https://hesem.com.vn/wp-content/uploads/hesem-logo.svg"/>
    </a>
    <div class="fh-company">
      <a href="[relative-path]/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
      <span>Tài liệu kiểm soát</span>
    </div>
  </div>
  <div class="title">
    <strong>[M� TÀI LIỆU] — [TÊN TÀI LIỆU]</strong>
    <span class="sub-vn">[Phụ đề tiếng Việt nếu có]</span>
  </div>
  <div class="meta">
    <div class="row"><span><b>Mã:</b></span><span>[M� TÀI LIỆU]</span></div>
    <div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
    <div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
    <div class="row"><span><b>Chủ sở hữu:</b></span><span>[PHÒNG BAN]</span></div>
    <div class="row"><span><b>Phê duyệt:</b></span><span>Tổng Giám Đốc</span></div>
  </div>
</div>
```

**Quy tắc meta header:**
- `Mã:` — Mã tài liệu duy nhất, liên kết với hệ thống (ví dụ: SOP-101, WI-201, FRM-301)
- `Phiên bản:` — Luôn là `V0` cho bản nháp; được hệ thống tự quản lý khi duyệt
- `Ngày hiệu lực:` — "Theo quyết định ban hành" cho V0; ngày duyệt cho bản phát hành
- `Chủ sở hữu:` — Phòng ban chịu trách nhiệm (đồng bộ từ hệ thống eQMS)
- `Phê duyệt:` — Người/chức vụ duyệt (đồng bộ từ hệ thống eQMS)

> **LƯU Ý QUAN TRỌNG:** Các trường Mã, Phiên bản, Ngày hiệu lực, Chủ sở hữu, Phê duyệt
> được đồng bộ thời gian thực từ hệ thống eQMS (portal.html → api.php).
> KHÔNG hardcode giá trị cố định — hệ thống sẽ tự đồng bộ khi tài liệu được duyệt.

---

## 3. Cấu trúc nội dung (Content Structure)

Mọi tài liệu đều bọc trong:
```html
<div class="container"><div class="page"><div class="page-body">
  [FORM-HEADER — xem mục 2]
  <div class="doc-content" id="docContent">
    [NỘI DUNG TÀI LIỆU]
  </div>
</div></div></div>
```

**Cấu trúc heading bắt buộc:**
- `<h1 class="h1">` — Tiêu đề chính (1 lần duy nhất)
- `<h2 class="h2">` — Section chính (đánh số: 1), 2), 3), ...)
- `<h3 class="h3">` — Sub-section

**Component classes chuẩn:**
- `.card` — Khối nội dung có viền
- `.note` — Ghi chú nền xanh (thông tin)
- `.callout` — Ghi chú nền vàng (cảnh báo/lưu ý)
- `.iso-map` — Mapping yêu cầu tiêu chuẩn
- `.req` + `.req-tag.shall/.should/.may` — Yêu cầu ISO
- `.badge` — Mã tài liệu nhỏ
- `.table` — Bảng dữ liệu
- `.form-sheet` — Biểu mẫu

---

## 4. Đồ họa & Màu sắc (Design System)

**Palette chính (CSS Variables):**
```css
--navy:  #0c2d48    /* Tiêu đề, heading */
--blue:  #1565c0    /* Link, accent chính */
--blue-l:#e3f2fd    /* Nền note, highlight nhẹ */
--gold:  #f9a825    /* Border accent, callout */
--gold-l:#fff8e1    /* Nền callout */
--ink:   #212529    /* Text chính */
--ink2:  #495057    /* Text phụ */
--ink3:  #868e96    /* Text mờ */
--bg:    #ffffff    /* Nền trắng */
--bg2:   #f8f9fa    /* Nền xám nhạt */
--bg3:   #f1f3f5    /* Nền xám */
--ln:    #dee2e6    /* Border chính */
--red:   #e03131    /* Cảnh báo, lỗi */
--green: #2f9e44    /* Thành công, approved */
```

**Font:**
- Main: `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- Code: `'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace`
- Font size gốc: `14px` (html root)
- Body line-height: `1.6`

**Border radius:**
- `--r: 8px` (mặc định)
- `--r-sm: 6px` (nhỏ)
- `--r-lg: 12px` (lớn, container)

---

## 5. Quy luật chung cho tài liệu

1. **Ngôn ngữ:** Tiếng Việt là bản chính. Hệ thống hỗ trợ dịch EN tự động — KHÔNG tạo file EN riêng.
2. **CSS:** Luôn reference `../../assets/style.css` (hoặc relative path phù hợp). KHÔNG inline CSS trừ khi cần thiết cho component cục bộ.
3. **Print-friendly:** Mọi component phải có `page-break-inside: avoid` trong `@media print`.
4. **Responsive:** Tables dùng `overflow-x: auto; max-width: 100%`.
5. **Link nội bộ:** Dùng relative path, trỏ về `portal.html` cho logo/brand.
6. **ID bắt buộc:** Content container phải có `id="docContent"` để editor nhận diện.
7. **Script:** Cuối body, thêm `<script src="[rel-path]/assets/app.js"></script>`.

---

## 6. Quy tắc phiên bản & Workflow

- **V0** — Bản nháp (Draft), chưa phát hành
- **V0** — Phát hành lần đầu (Initial Release) sau khi được duyệt
- **V1.x** — Cập nhật nhỏ (Minor): sửa lỗi chính tả, format, bổ sung nhỏ
- **V2.0** — Cập nhật lớn (Major): thay đổi nội dung/quy trình quan trọng

**Workflow:** Draft → Submit for Review → In Review → Approved/Rejected → (New Revision)

**Thông tin phiên bản trong mỗi entry bao gồm:**
- Người gửi xem xét + ngày gửi
- Người duyệt + ngày duyệt
- Người chỉnh sửa cuối cùng (trước khi gửi)
- Loại cập nhật (Major/Minor)
- Ghi chú thay đổi

---

## 7. Logo năng lực (Competency Icons)

19 năng lực trong `10-Training-Academy/01-Competency-System/02-Levels/` mỗi folder có SVG logo riêng tại `logo.svg`, thiết kế theo nội dung năng lực:

| # | Code | Năng lực | Icon theme |
|---|------|----------|------------|
| 01 | C01 | Workplace Safety & 5S | Khiên an toàn + bàn tay |
| 02 | C02 | Process Discipline & Standard Work | Quy trình/flowchart |
| 03 | C03 | Right First Time (RFT) & CTQ | Bullseye/target |
| 04 | C04 | Cross-Department Communication | Bong bóng chat liên kết |
| 05 | C05 | Customer Service Mindset (B2B) | Bắt tay/handshake |
| 06 | C06 | Problem Solving & Root Cause | Kính lúp + gốc cây |
| 07 | C07 | Kaizen & Lean — Continual Improvement | Mũi tên xoắn ốc lên |
| 08 | C08 | Data-Driven Thinking (ERP/Excel) | Biểu đồ + data |
| 09 | C09 | Time Management & Prioritization | Đồng hồ + checklist |
| 10 | C10 | CNC Job Order Process (RFQ→Cash) | CNC gear + workflow |
| 11 | C11 | Sales/RFQ & Contract Review | Tài liệu + bút ký |
| 12 | C12 | Estimating & Job Costing | Máy tính + tiền tệ |
| 13 | C13 | Risk Management & Revision Control | Tam giác cảnh báo + version |
| 14 | C14 | Drawing Interpretation & GD&T | Bản vẽ kỹ thuật |
| 15 | C15 | Material Science & Surface Treatment | Phân tử + bề mặt |
| 16 | C16 | Advanced Metrology — FAI/CMM/MSA | Thước đo + precision |
| 17 | C17 | Technical Competency (CNC/Setup/CAM) | Máy CNC |
| 18 | C18 | Supply Chain, Purchasing & Logistics | Xe tải + chuỗi cung ứng |
| 19 | C19 | Frontline Leadership & Coaching | Ngôi sao + người dẫn dắt |

---

## 8. Checklist khi tạo/chỉnh sửa tài liệu

- [ ] Header đúng cấu trúc mục 2 (form-header + meta fields)
- [ ] CSS reference đúng relative path
- [ ] `id="docContent"` có trên container nội dung
- [ ] Heading dùng đúng class `.h1`, `.h2`, `.h3`
- [ ] Màu sắc theo palette mục 4, KHÔNG dùng màu tùy ý
- [ ] Tables có class `.table` và responsive wrapper
- [ ] Print styles: `page-break-inside: avoid` cho các block
- [ ] Link nội bộ dùng relative path
- [ ] Phiên bản = `V0` (bản nháp)
- [ ] Ngôn ngữ tiếng Việt, thuật ngữ kỹ thuật giữ nguyên tiếng Anh
- [ ] Script `app.js` ở cuối body

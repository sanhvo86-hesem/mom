# 11 — Hướng dẫn cấu trúc HTML chi tiết (Khi tạo mới hoặc chỉnh sửa tài liệu)

> Phiên bản: v1 | Cập nhật: 2026-03-26
> Đây là ghi chú BẮT BUỘC đọc trước khi tạo mới hoặc chỉnh sửa bất kỳ file HTML nào trong hệ thống QMS.

---

## 1. Cấu trúc tổng thể file HTML

```
<!DOCTYPE html>
<html lang="vi">
<head>
  ① Meta tags
  ② <title> tag
  ③ <link> tới assets/style.css      ← BẮT BUỘC
  ④ <style> inline (chỉ component-specific, KHÔNG override global)
</head>
<body>
  <div class="container"><div class="page"><div class="page-body">
    ⑤ FORM HEADER                    ← Logo + Title cùng hàng + Meta
    <div class="doc-content" id="docContent"><div class="form-sheet">
      ⑥ ISO MAP                      ← Chuẩn mực áp dụng + điều khoản ISO
      ⑦ PREFACE BLOCK                ← Lệnh điều hành + chip links
      ⑧ TABLE OF CONTENTS            ← Mục lục dạng grid
      ⑨ NỘI DUNG CHÍNH               ← Sections 1-10
      ⑩ GATE SECTION                 ← Các bước quy trình (gate-grid)
      ⑪ METRIC SECTION               ← KPI cards
      ⑫ LINKED DOCS                  ← Tài liệu liên kết
    </div></div>
  </div></div></div>
</body>
</html>
```

---

## 2. Chi tiết từng phần

### 2.1 `<head>` — Meta và CSS

```html
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{CODE}} — {{TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* CHỈ khai báo class BỔ SUNG chưa có trong style.css
   VD: .chip, .toc, .toc-grid, .field-grid, .field, .mini-note

   ⚠ KHÔNG BAO GIỜ khai báo lại:
   - .table, .table thead th, .table tbody td (đã có trong style.css)
   - .note, .note-blue, .note-soft, .note-green (đã có)
   - .callout, .callout-danger, .callout-info (đã có)
   - .box, .box.core, .box.sup, .box.imp (đã có)
   - .req, .req-tag (đã có)
   - .iso-map (đã có)
   - .metric-grid, .metric-card (đã có)
   - .gate-grid, .gate-card (đã có)
   - .form-header, .preface-block (đã có)

   Nếu khai báo lại → sẽ GHI ĐÈ global CSS → mất đồng bộ
*/
</style>
</head>
```

**Quy tắc tính relative path:**

| Vị trí file | `{{RELATIVE_PATH}}` |
|-------------|---------------------|
| `01-QMS-Portal/` | `..` |
| `02-Tai-Lieu-He-Thong/01-Quality-Manual/` | `../..` |
| `03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/` | `../../..` |
| `03-Tai-Lieu-Van-Hanh/02-WIs/01-WI-100/` | `../../..` |
| `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/10-ANNEX-100-xxx/` | `../../../..` |
| `10-Training-Academy/01-Competency/02-Levels/01-C01/` | `../../../..` |

### 2.2 FORM HEADER — Logo + Title cùng hàng

```html
<div class="form-header">
  <div class="fh-left">
    <a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">
      <img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/>
    </a>
    <div class="fh-company">
      <a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
      <span>{{DOC_TYPE_LABEL}}</span>
    </div>
  </div>
  <div class="title">
    <strong>{{CODE}} — {{TITLE}}</strong>
    <span class="sub-vn">{{SUBTITLE}}</span>
  </div>
  <div class="meta">
    <div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
    <div class="row"><span><b>Version:</b></span><span>V0</span></div>
    <div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
    <div class="row"><span><b>Owner:</b></span><span>{{OWNER}}</span></div>
    <div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
  </div>
</div>
```

**Lưu ý:**
- Logo và Title nằm **CÙNG HÀNG NGANG** (không phải stacked)
- `{{DOC_TYPE_LABEL}}` theo loại: SOP → "Tài liệu kiểm soát", WI → "Tài liệu vận hành • Hướng dẫn công việc", ANNEX → "Tài liệu vận hành • Phụ lục", JD → "Tài liệu hệ thống"
- Meta labels giữ nguyên tiếng Anh: Code, Version, Effective Date, Owner, Approved by
- **Viền cam** header: mảnh 1px (border-bottom của .meta)
- **KHÔNG** thay đổi cấu trúc header — mọi file PHẢI giống nhau

### 2.3 ISO MAP — Chuẩn mực áp dụng

```html
<div class="iso-map">
  <div class="iso-title">Chuẩn mực áp dụng / Nguyên tắc bắt buộc</div>
  <div class="req">
    <span class="req-tag shall">PHẢI</span>
    <div>Nội dung yêu cầu. <span class="iso-clause">§7.5</span></div>
  </div>
  <div class="req">
    <span class="req-tag must">BẮT BUỘC</span>
    <div>Nội dung bắt buộc. <span class="iso-clause">§9.3</span></div>
  </div>
  <div class="req">
    <span class="req-tag should">NÊN</span>
    <div>Khuyến nghị.</div>
  </div>
</div>
```

**Đồ họa ISO Map:**
- Nền: gradient xanh nhạt (`linear-gradient(135deg, #f0f7ff, #e8f4fd)`)
- Viền: 1px solid xanh (`var(--blue)`)
- Badge "ISO 9001:2015" tự động hiển thị phía trên (CSS `::before`)
- Các `.req` box bên trong có nền trắng mờ (phân biệt với nền gradient)

**Badges yêu cầu ISO:**

| Badge | Class | Màu | Khi nào dùng |
|-------|-------|-----|--------------|
| PHẢI | `req-tag shall` | Đỏ | Yêu cầu SHALL của ISO — vi phạm = nonconformity |
| BẮT BUỘC | `req-tag must` | Đỏ | Yêu cầu nội bộ cứng — vi phạm = stop |
| NÊN | `req-tag should` | Vàng | Khuyến nghị SHOULD — nên tuân theo |
| CÓ THỂ | `req-tag may` | Xanh lá | Tùy chọn MAY — linh hoạt |

**Điều khoản ISO badge:**
```html
<span class="iso-clause">§7.5</span>
```
Hiển thị badge xanh nhỏ với số điều khoản ISO 9001:2015.

### 2.4 PREFACE BLOCK — Lệnh điều hành

```html
<div class="preface-block">
  <div class="callout">
    <div class="card-title">Lệnh điều hành</div>
    <p>Mô tả ngắn gọn mục đích và phạm vi.</p>
    <div class="legend-row">
      <span class="chip">Cổng kiểm soát: {{CODE}}-G1 → {{CODE}}-G5</span>
      <span class="chip">Biểu mẫu: FRM-xxx / FRM-xxx</span>
      <span class="chip">Tham chiếu: ANNEX-xxx</span>
      <span class="chip">SOP liên đới: SOP-xxx</span>
    </div>
  </div>
</div>
```

### 2.5 Gate Mapping Note — Vị trí trong hệ thống 8 cổng

**BẮT BUỘC** có trên MỌI tài liệu — đặt trước gate-grid hoặc trước section quy trình:

```html
<div class="note-blue" style="margin:12px 0">
  <b>🗺️ Vị trí trong hệ thống 8 cổng (G0→G7):</b>
  SOP/WI/ANNEX này vận hành <b>[vị trí cụ thể]</b>. [mô tả ngắn].
  <br>→ Xem <a href="{{RELATIVE_PATH}}/03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html">ANNEX-502</a> cross-reference.
</div>
```

---

## 3. Quy tắc đồ họa components

### 3.1 Table — BẮT BUỘC có class="table"

```html
<div class="table-card">
  <table class="table">
    <thead><tr><th>Cột 1</th><th>Cột 2</th><th>Cột 3</th></tr></thead>
    <tbody>
      <tr><td>Dữ liệu</td><td>Dữ liệu</td><td>Dữ liệu</td></tr>
    </tbody>
  </table>
</div>
```

**⚠ KHÔNG BAO GIỜ:**
- Tạo `<table>` không có `class="table"` → sẽ không có viền
- Khai báo lại `.table thead th` trong inline `<style>` → ghi đè global
- Dùng `border="1"` attribute trên `<table>` → dùng CSS class thay thế
- Dùng inline style `style="border:..."` trên `<td>` → dùng CSS class

**Đồ họa table chuẩn:**
- Viền ngoài: 1px solid #1565c0 (xanh đậm)
- Header: background rgba(21,101,192,0.12) (xanh nhạt)
- Row dividers: border-bottom 1px solid #1565c0
- Column dividers: border-right 1px solid #1565c0 (cột cuối: none)
- Hover: rgba(21,101,192,0.04) highlight nhẹ
- Bo góc: var(--r) = 10px (trên table-card wrapper)
- Không box-shadow

### 3.2 Note / Callout / Box — Chỉ border-left 3px

```html
<!-- Note xanh -->
<div class="note-blue">Nội dung ghi chú.</div>

<!-- Callout vàng -->
<div class="callout">
  <b>Tiêu đề:</b> Nội dung cảnh báo.
</div>

<!-- Callout đỏ (nguy hiểm) -->
<div class="callout-danger">
  <b>⚠ Cảnh báo:</b> Nội dung nguy hiểm.
</div>

<!-- Box lệnh -->
<div class="box core">Nội dung lệnh chính.</div>
<div class="box sup">Nội dung hỗ trợ.</div>
<div class="box imp">Nội dung quan trọng (đỏ).</div>
```

**Quy tắc:**
- Tất cả note/callout/box: **CHỈ** có border-left 3px, **KHÔNG** có border trên/dưới/phải
- Border-left width: **3px** thống nhất (không 1px, 2px, 4px, 5px)
- Background: màu nhạt tương ứng với màu border-left
- KHÔNG dùng inline style `style="border-left:..."` → dùng class

### 3.3 Metric Cards — KPI display

```html
<div class="metric-grid">
  <div class="metric-card">
    <div class="value">0</div>
    <div class="label">TÊN KPI</div>
    <div class="sub">Mô tả ngắn</div>
  </div>
</div>
```

### 3.4 Gate Cards — Các bước quy trình

```html
<div class="gate-grid">
  <div class="gate-card">
    <h3>{{CODE}}-G1 — Tên bước</h3>
    <p>Mô tả hoạt động.</p>
    <p><b>Lead:</b> Vai trò<br>
    <b>Điểm dừng:</b> Điều kiện hold<br>
    <b>KPI chính:</b> Metric</p>
  </div>
</div>
```

---

## 4. Danh sách "KHÔNG BAO GIỜ" khi chỉnh sửa HTML

| # | KHÔNG BAO GIỜ | Lý do |
|---|--------------|-------|
| 1 | Khai báo lại `.table`, `.note`, `.callout`, `.box`, `.req`, `.iso-map` trong inline `<style>` | Ghi đè global CSS → mất đồng bộ |
| 2 | Tạo `<table>` không có `class="table"` | Không nhận CSS viền/header |
| 3 | Dùng `border="1"` attribute trên `<table>` | Dùng CSS class thay thế |
| 4 | Dùng inline `style="border-left:Xpx"` trên note/box | Dùng class (global CSS set 3px) |
| 5 | Thay đổi cấu trúc form-header | Mọi file PHẢI giống nhau |
| 6 | Dịch tên file, folder, path sang tiếng Việt | Phá vỡ liên kết hệ thống |
| 7 | Dịch metadata labels (Code, Version, Owner...) | Giữ nguyên tiếng Anh |
| 8 | Dịch tên SharePoint List, Column names, Site names | Danh từ riêng hệ thống |
| 9 | Dịch vai trò (Team Leader, Foreman, Inspector...) | Danh từ riêng thống nhất |
| 10 | Xóa gate mapping note "Vị trí trong hệ thống 8 cổng" | Bắt buộc có trên mọi file |

---

## 5. Checklist trước khi commit file HTML

- [ ] File có `<link href="...assets/style.css" rel="stylesheet"/>` ?
- [ ] `<table>` có `class="table"` ?
- [ ] Không có khai báo lại `.table`, `.note`, `.callout` trong inline `<style>` ?
- [ ] Form header đúng cấu trúc (logo + title cùng hàng) ?
- [ ] ISO map có badge (PHẢI/BẮT BUỘC/NÊN) + điều khoản ISO ?
- [ ] Gate mapping note "Vị trí trong hệ thống 8 cổng" có ?
- [ ] Tên file, folder, path giữ nguyên tiếng Anh ?
- [ ] CSS variables dùng `var(--...)` thay vì hard-code màu ?
- [ ] Border-left trên note/box = 3px (không hard-code khác) ?
- [ ] Relative path tới assets/ đúng theo bảng ở section 2.1 ?

---

## 6. Hệ thống 8 cổng (G0→G7) — Tham chiếu nhanh

```
G0 Contract → G1 Engineering ‖ G2 IQC → G3 Setup → G4 FAI → G5 IPQC → G6 Final QC → G7 Ship
```

| Gate | Tên | Màu header | SOP chính |
|------|-----|-----------|-----------|
| G0 | Contract | #4CAF50 (xanh lá) | SOP-201 |
| G1 | Engineering | #1565C0 (navy) | SOP-303 |
| G2 | IQC | #795548 (nâu) | WI-701, SOP-402 |
| G3 | Setup | #2196F3 (xanh) | SOP-504 |
| G4 | FAI | #FF9800 (cam) | SOP-302 |
| G5 | IPQC | #9C27B0 (tím) | SOP-502, SOP-604 |
| G6 | Final QC | #00BCD4 (teal) | SOP-605 |
| G7 | Ship | #F44336 (đỏ) | SOP-605 |

**Lưu ý:** G1 và G2 chạy **SONG SONG**. Cả hai PHẢI hoàn tất trước G3.

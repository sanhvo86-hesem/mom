# 11 — Hướng dẫn cấu trúc HTML chi tiết (Khi tạo mới hoặc chỉnh sửa tài liệu)

> Phiên bản: v2 | Cập nhật: 2026-03-27
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
      ⑩ SECTION 6 + 7               ← IG table + flowchart + detailed procedure
      ⑪ KPI SUMMARY (nếu có)         ← Chỉ dùng khi tài liệu thật sự cần thẻ KPI tóm tắt
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
    <div class="row"><span><b>Mã:</b></span><span>{{CODE}}</span></div>
    <div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
    <div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
    <div class="row"><span><b>Chủ sở hữu:</b></span><span>{{OWNER_ROLE_HTML}}</span></div>
    <div class="row"><span><b>Phê duyệt:</b></span><span>{{APPROVER_ROLE_HTML}}</span></div>
  </div>
</div>
```

**Lưu ý:**
- Logo và Title nằm **CÙNG HÀNG NGANG** (không phải stacked)
- `{{DOC_TYPE_LABEL}}` theo loại: SOP → "Tài liệu kiểm soát", WI → "Tài liệu vận hành • Hướng dẫn công việc", ANNEX → "Tài liệu vận hành • Phụ lục", JD → "Tài liệu hệ thống"
- Meta labels hiển thị tiếng Việt: `Mã`, `Phiên bản`, `Ngày hiệu lực`, `Chủ sở hữu`, `Phê duyệt`
- Với tài liệu chưa phát hành lần đầu, `Version` trong header luôn là `V0`
- **Viền cam** header: mảnh 1px (border-bottom của .meta)
- **KHÔNG** thay đổi cấu trúc header — mọi file PHẢI giống nhau
- `{{OWNER_ROLE_HTML}}` và `{{APPROVER_ROLE_HTML}}` phải là role chips link trực tiếp tới JD
- Header không dùng text dài kiểu `QA Manager / Supply Chain Manager`; phải dùng role code gọn như `QA / SCM`

### 2.2a JD Header và Identity Rows

Với JD:
- `strong` trong title block phải theo chuẩn `JD-<ROLECODE> — <Job title English>`.
- `sub-vn` dùng tiếng Việt chuẩn của vị trí.
- Row `Mã` trong header phải khớp đúng `JD-<ROLECODE>`.
- Trong bảng thông tin vị trí:
  - `Mã vị trí` = `JD-<ROLECODE>`
  - `Mã vai trò dùng trong SOP/RACI` = role chip JD-linked
  - `Mũ quản trị có thể gắn` chỉ xuất hiện khi role thật sự có hat cho phép
  - `Chức danh theo tài liệu` giữ plain English title, không render chip
- Không cho phép JD có cấu trúc fragment kiểu thiếu `<html>`, `<head>` hoặc `<body>`.

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
- Badge "ISO 9001:2026" tự động hiển thị phía trên (CSS `::before`)
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
Hiển thị badge xanh nhỏ với số điều khoản ISO 9001:2026.

### 2.4 PREFACE BLOCK — Lệnh điều hành

```html
<div class="preface-block">
  <div class="callout">
    <div class="card-title">Lệnh điều hành</div>
    <p>Mô tả ngắn gọn mục đích và phạm vi.</p>
    <div class="legend-row">
      <span class="chip">Cổng kiểm soát: IG1 → IGn (không giới hạn)</span>
      <span class="chip">Biểu mẫu: FRM-xxx / FRM-xxx</span>
      <span class="chip">Tham chiếu: ANNEX-xxx</span>
      <span class="chip">SOP liên đới: SOP-xxx</span>
    </div>
  </div>
</div>
```

### 2.5 Gate Mapping Note — Vị trí trong hệ thống 8 cổng

**BẮT BUỘC** có trên MỌI tài liệu — đặt trước section 1 hoặc ngay sau preface block:

```html
<div class="note-blue" style="margin:12px 0">
  <b>🗺️ Vị trí trong hệ thống 8 cổng (G0→G7):</b>
  SOP/WI/ANNEX này vận hành <b>[vị trí cụ thể]</b>. [mô tả ngắn].
  <br>→ Xem <a href="{{RELATIVE_PATH}}/03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html">ANNEX-502</a> cross-reference.
</div>
```

### 2.6 Ranh giới giữa chuẩn hóa format và nâng cấp nội dung

Core-standard **được phép** chuẩn hóa tập trung:

- header, preface, toc, table-card, field-grid, callout-grid,
- palette màu flowchart, `proc-num`, `flow-num`, arrow, CSS fallback,
- khung table của Section 6 và Section 8,
- checklist QA kỹ thuật và comment hướng dẫn trong template.

Core-standard **không được dùng** để biện minh cho cập nhật nội dung hàng loạt:

- nội dung `Section 1, 2, 3, 4, 5, 8` phải suy ra từ `Section 6` và `Section 7` của **từng SOP**,
- số bước, tên bước, tên IG, KPI, role authority, exception scenario phải nghiên cứu theo **từng SOP**,
- không để note biên tập, note benchmark, note khác bản cũ hay note quy tắc viết tài liệu hiển thị trong body SOP.

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

### 3.4 Section 6 — Cổng kiểm soát nội bộ (Internal Gates) — Dạng TABLE

**Quy tắc cấu trúc Section 6:**
- Internal Gate dùng ký hiệu **IG** (IG1, IG2, IG3...) — KHÔNG dùng G (G là system gates)
- Số lượng IG **không giới hạn** — tùy quy trình cụ thể (3, 5, 6, 8...)
- Format: **TABLE** 5 cột (KHÔNG dùng gate-card/grid)
- Mỗi IG PHẢI có: Mô tả, Chủ trì, Điểm dừng bắt buộc, KPI đo được
- Số IG **KHÔNG cần** khớp với số bước Section 7
- Sau table: metric-card grid hiển thị KPI trực quan (tùy chọn)
- Khi thay nội dung, chỉ thay phần nằm giữa `p6` và `p7`
- Nội dung phải bám tài liệu cũ + research theo `13-sop-research-redraft-method.md`

```html
<!-- Section 6: IG Table -->
<h2 id="p6">6. Cổng kiểm soát nội bộ (Internal Gates), điểm dừng bắt buộc & KPI</h2>

<div class="table-card">
<table class="table">
<colgroup>
  <col class="col-ig"/>     <!-- 50px fixed -->
  <col class="col-desc"/>   <!-- 34% -->
  <col class="col-owner"/>  <!-- 14%, min 80px -->
  <col class="col-hold"/>   <!-- 22% -->
  <col class="col-kpi"/>    <!-- 18% -->
</colgroup>
<thead><tr>
  <th>IG</th><th>Mô tả hoạt động</th><th>Chủ trì</th><th>Điểm dừng bắt buộc</th><th>KPI chính</th>
</tr></thead>
<tbody>
  <tr>
    <td class="ig-center"><span class="step-tag">IG1</span></td>
    <td><b>Tên cổng</b><br>Mô tả chi tiết hoạt động, tham chiếu form/SOP.</td>
    <td>Vai trò chủ trì</td>
    <td>KHÔNG cho phép [hành động] nếu chưa [điều kiện].</td>
    <td>KPI cụ thể đo được (ví dụ: 100%, ≤ 24h, 0 lỗi)</td>
  </tr>
  <!-- Thêm IG2, IG3... tương tự -->
</tbody>
</table>
</div>
```

**⚠ KHÔNG BAO GIỜ:**
- Dùng gate-card/gate-grid cho IG → dùng TABLE
- Giới hạn cố định 5 IG → tùy quy trình
- Để trống cột Chủ trì/Điểm dừng/KPI → mỗi IG PHẢI đầy đủ
- Đặt IG badge không canh giữa → dùng `class="ig-center"` trên `<td>`

### 3.5 Section 7 — Quy trình chi tiết — FLOWCHART + Balloon headings

**Quy tắc cấu trúc Section 7:**
- **Phần 1:** Flowchart tổng quan (visual process flow)
- **Phần 2:** Chi tiết từng bước với **proc-num balloon** trước heading
- Số bước **không giới hạn** — tùy quy trình (5, 8, 10, 12...)
- Flowchart PHẢI khớp đúng số bước h3 bên dưới
- Số bước Section 7 **KHÔNG bị giới hạn** bởi số IG của Section 6
- Mỗi bước balloon có **màu xoay** (rotating colors) — KHÔNG cố định 1 màu
- Màu bubble ở flowchart phải khớp màu `proc-num` của bước tương ứng; không phụ thuộc việc step có class `active/critical` hay không
- CSS toàn cục PHẢI có fallback palette để file cũ hoặc file viết tay không bị rơi về một màu duy nhất
- Flowchart sinh mới bằng script PHẢI ưu tiên inline style ở `flow-step`, `flow-num`, `flow-arrow`; CSS fallback chỉ để bảo vệ file cũ hoặc file viết tay
- `.active` và `.critical` chỉ bổ trợ nhấn thị giác; không được ghi đè logic màu theo số bước của bubble
- Fallback palette phải tính đúng việc `.flow-arrow` chen giữa các `.flow-step`; selector phải dựa trên direct child positions của `.flow-step` thực tế, không giả định tất cả child đều là step
- Khi thay nội dung, chỉ thay phần nằm giữa `p7` và `p8`
- Số bước phải được chốt theo logic bàn giao và risk window của SOP đó, không theo template đẹp

**Phần 1: Flowchart**
```html
<h2 id="p7">7. Quy trình chi tiết</h2>

<div class="flowchart">
  <div class="flow-step">
    <div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div>
    <div class="flow-text"><div class="flow-title">Tên bước 1</div></div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step active"><!-- .active = quyết định/phê duyệt (vàng) -->
    <div class="flow-num" style="background:linear-gradient(135deg,#d97706,#f59e0b)">2</div>
    <div class="flow-text"><div class="flow-title">Tên bước 2</div></div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step critical"><!-- .critical = kiểm tra/đo lường (đỏ) -->
    <div class="flow-num" style="background:linear-gradient(135deg,#dc2626,#ef4444)">3</div>
    <div class="flow-text"><div class="flow-title">Tên bước 3</div></div>
  </div>
</div>
```

**Bảng màu xoay (10 màu):**
| Bước | Gradient | Tính chất |
|------|----------|-----------|
| 1 | `#1565c0, #1976d2` | Xanh dương |
| 2 | `#059669, #10b981` | Xanh lá |
| 3 | `#d97706, #f59e0b` | Vàng cam |
| 4 | `#7c3aed, #8b5cf6` | Tím |
| 5 | `#dc2626, #ef4444` | Đỏ |
| 6 | `#0891b2, #06b6d4` | Teal |
| 7 | `#c2410c, #ea580c` | Cam đậm |
| 8 | `#4338ca, #6366f1` | Indigo |
| 9 | `#15803d, #22c55e` | Xanh lá đậm |
| 10 | `#be185d, #ec4899` | Hồng |

**Phần 2: Chi tiết từng bước**
```html
<h3><span class="proc-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</span> Tên bước chi tiết</h3>
<p>Mô tả chi tiết hoạt động...</p>
<ul><li>Bullet points cụ thể</li></ul>
<div class="callout"><b>Điểm dừng bắt buộc (IG1):</b> KHÔNG cho phép... nếu chưa...</div>
<p><b>Bàn giao:</b> Ai bàn giao gì cho ai.</p>
```

**⚠ QUY TẮC QUAN TRỌNG:**
- Flowchart PHẢI có TRƯỚC các h3 chi tiết
- Số bước trong flowchart = Số h3 headings (KHÔNG được lệch)
- Màu balloon h3 = Màu tương ứng trong flowchart
- Khi cập nhật nội dung → kiểm tra lại đánh số + flowchart
- Bước `.active` (vàng) = quyết định/phê duyệt
- Bước `.critical` (đỏ) = kiểm tra/đo lường/hold point

### 3.6 Bốn loại Badge/Nút — Phân biệt trực quan

| Badge | CSS Class | Ký hiệu | Màu | Dùng cho |
|-------|-----------|---------|-----|----------|
| **ISO Clause** | `.iso-clause` | §7.5, §8.2 | Xanh đậm (#1565c0) nền trắng | Viện dẫn ISO 9001:2026 |
| **ISO Req** | `.req-tag.shall` / `.req-tag.should` / `.req-tag.may` | PHẢI, NÊN, CÓ THỂ | Đỏ / Vàng / Xanh lá | Mức bắt buộc ISO |
| **Internal Gate** | `.step-tag` | IG1, IG2... | Navy gradient pill | Cổng kiểm soát nội bộ |
| **Procedure Step** | `.proc-num` | ①②③... | Rotating 10 colors | Bước quy trình chi tiết |
| **System Gate** | `.gate-tag` | G0, G1...G7 | Teal (#00838f) | 8 cổng hệ thống |

```html
<!-- ISO Clause -->   <span class="iso-clause">§7.5</span>
<!-- ISO Req -->       <span class="req-tag shall">PHẢI</span>
<!-- Internal Gate --> <span class="step-tag">IG1</span>
<!-- Proc Step -->     <span class="proc-num" style="background:linear-gradient(...)">1</span>
<!-- System Gate -->   <span class="gate-tag">G0</span>
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
| 10 | Dùng gate-card/gate-grid cho Internal Gates | IG PHẢI dùng TABLE 5 cột |
| 11 | Giới hạn cố định 5 IG | Số IG tùy quy trình, không giới hạn |
| 12 | Buộc số IG = số bước chi tiết | IG và bước chi tiết là hai lớp khác nhau |
| 13 | Tạo flowchart không khớp số bước h3 | Flowchart steps = h3 headings |
| 14 | Dùng 1 màu cố định cho proc-num balloons | Dùng 10 màu xoay |
| 15 | Để trống cột Chủ trì/Điểm dừng/KPI trong IG table | Mỗi IG PHẢI đầy đủ |
| 16 | Batch-upgrade nội dung `Section 1/2/3/4/5/8` bằng một bộ câu chung cho nhiều SOP | Dẫn tới sai boundary, sai role, sai exception và mất tính thực chiến |
| 17 | Giữ lại note hướng dẫn biên tập, note benchmark hoặc note khác bản cũ trong body SOP | Tài liệu draft sẽ bẩn, sai ngữ cảnh vận hành và khó phát hành V0 |
| 18 | Dùng list bullet cho Section 8 khi SOP có nhiều nhánh hold/restart/revalidation/change | Mất owner, mất người gỡ hold và khó audit |
| 19 | Bắt buộc `metric-grid` cho mọi SOP dù không có nhu cầu tóm tắt KPI riêng | Tạo section trang trí, trùng lặp KPI đã nằm trong Section 6 |
| 20 | Viết Section 3 bằng thuật ngữ nửa Anh nửa Việt hoặc lặp ngoặc | Làm mờ nghĩa vận hành và tạo lỗi dùng thuật ngữ trong thân SOP |

---

## 5. Checklist trước khi commit file HTML

### 5.1 Cấu trúc chung
- [ ] File có `<link href="...assets/style.css" rel="stylesheet"/>` ?
- [ ] `<table>` có `class="table"` ?
- [ ] IG table có `<colgroup>` với col-ig, col-desc, col-owner, col-hold, col-kpi ?
- [ ] Không có khai báo lại `.table`, `.note`, `.callout` trong inline `<style>` ?
- [ ] Form header đúng cấu trúc (logo + title cùng hàng) ?
- [ ] CSS variables dùng `var(--...)` thay vì hard-code màu ?
- [ ] Relative path tới assets/ đúng ?

### 5.2 ISO map (Section đầu)
- [ ] ISO map có badge PHẢI/NÊN/CÓ THỂ (`req-tag`) ?
- [ ] Mỗi yêu cầu có `iso-clause` badge với điều khoản cụ thể (§X.Y) ?
- [ ] ISO version = 9001:**2026** (KHÔNG phải 2015) ?

### 5.3 Section 1, 2, 3, 4, 5, 8
- [ ] Section 1 nêu rõ rủi ro / lỗi / quyết định / đầu ra mà SOP này đang khóa, không phải câu mở đầu chung chung ?
- [ ] Section 2 bám đúng bước đầu, bước cuối và handoff thật sang SOP/WI khác ?
- [ ] Section 2 có nêu boundary restart / re-entry / transfer nếu Section 7 có nhánh đó ?
- [ ] Section 3 chỉ giữ các thuật ngữ thật sự cần để hiểu gate/step ?
- [ ] Tên thuật ngữ theo mẫu `English term (thuật ngữ tiếng Việt chuẩn)` và thân SOP ưu tiên dùng bản tiếng Việt ?
- [ ] Section 4 bao phủ toàn bộ owner giữ IG và vai trò có quyền HOLD / RELEASE / RESTART / REVALIDATE / APPROVE EXCEPTION ?
- [ ] Section 5 map được về trước IG1/B1, sau gate cuối/bước cuối và trigger restart/change/escalation thật ?
- [ ] Section 5 không dùng ô mơ hồ kiểu `khi cần`, `theo yêu cầu`, `tài liệu liên quan` ?
- [ ] Section 8 mặc định dùng table 5 cột; nếu dùng bullet list thì đã chứng minh SOP này là governance hẹp và không mất owner / người gỡ hold / hồ sơ ?
- [ ] Mỗi scenario ở Section 8 đều có chủ trì + người gỡ hold / phê duyệt tiếp + hồ sơ ?
- [ ] Body SOP không còn note biên tập, note benchmark, note khác bản cũ hay note phương pháp viết ?

### 5.4 Section 6 — Internal Gates
- [ ] Dùng TABLE 5 cột (KHÔNG dùng gate-card) ?
- [ ] IG badge dùng `step-tag` + `ig-center` class ?
- [ ] Mỗi IG có: Mô tả, Chủ trì, Điểm dừng, KPI (KHÔNG để trống) ?
- [ ] Số IG phù hợp quy trình (KHÔNG giới hạn cố định 5) ?
- [ ] Số IG không bị ép khớp với số bước Section 7 ?

### 5.5 Section 7 — Quy trình chi tiết
- [ ] Có flowchart (`<div class="flowchart">`) SAU heading h2 ?
- [ ] Số bước flowchart = Số h3 headings bên dưới ?
- [ ] Mỗi h3 có `proc-num` balloon với màu xoay ?
- [ ] Với SOP sinh tự động: mỗi `flow-num` trong flowchart có inline style ?
- [ ] Flowchart steps có `.active` (quyết định) và `.critical` (kiểm tra) ?
- [ ] Số bước chi tiết được tách theo logic vận hành, không theo số IG ?
- [ ] Nội dung bước chi tiết: giải thích WHO/WHAT/WHEN/HOW ?
- [ ] Có callout "Điểm dừng bắt buộc" tại các bước quan trọng ?
- [ ] Có "Bàn giao" cuối mỗi bước ?
- [ ] Đã kiểm tra không xóa nhầm `p6`, `p7`, `p8` khi thay section ?

### 5.6 Khi cập nhật nội dung
- [ ] Kiểm tra lại đánh số IG1→IGn (có bị lệch không) ?
- [ ] Kiểm tra flowchart khớp h3 headings (thêm/xóa bước → update flowchart) ?
- [ ] Kiểm tra nội dung procedure không bị đẩy sang section khác ?
- [ ] Kiểm tra lỗi chính tả (đặc biệt chữ đầu từ tiếng Việt) ?
- [ ] Kiểm tra body không còn note biên tập như `Bổ sung theo note`, `Liên kết note`, `Quy tắc dùng thuật ngữ`, `so với bản trước` ?

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

# 04 — Hệ thống thiết kế HTML/CSS (HESEM QMS Design System)

> Phiên bản: v13 | Cập nhật: 2026-03-26
> File CSS gốc: `assets/style.css`

---

## 1. CSS Variables (Biến gốc)

Tất cả biến được khai báo trong `:root` của `style.css`. Mọi component đều dùng biến thay vì hard-code màu.

```css
:root {
  /* ── Màu thương hiệu ── */
  --navy:  #0c2d48;   /* Tiêu đề, heading, badge chính */
  --blue:  #1565c0;   /* Link, accent chính, border trái note */
  --blue-l:#e3f2fd;   /* Nền note, highlight nhẹ, chip */
  --gold:  #f9a825;   /* Border accent, callout, gate */
  --gold-l:#fff8e1;   /* Nền callout, nền vàng nhạt */

  /* ── Bảng màu bổ trợ ── */
  --th-bg: rgba(21, 101, 192, 0.12);  /* Nền header bảng — blue tint 12% */
  --th-bdr: #1565c0;  /* Border bảng — cùng màu --blue */
  --red:   #e03131;   /* Cảnh báo, lỗi, req-tag PHẢI */
  --green: #2f9e44;   /* Thành công, req-tag MAY */

  /* ── Ink (chữ) ── */
  --ink:   #212529;   /* Text chính */
  --ink2:  #495057;   /* Text phụ, sub-vn, mini-note */
  --ink3:  #868e96;   /* Text mờ, label, muted */
  --ink4:  #adb5bd;   /* Text rất mờ, placeholder */

  /* ── Background ── */
  --bg:    #ffffff;   /* Nền trắng (card, page) */
  --bg2:   #f8f9fa;   /* Nền xám nhạt (meta, toc, preface) */
  --bg3:   #f1f3f5;   /* Nền xám (tag, mono, code) */

  /* ── Border ── */
  --ln:    #dee2e6;   /* Border chính (card, table, sep) */
  --ln2:   #e9ecef;   /* Border phụ (row, td) */

  /* ── Border Radius ── */
  --r:     8px;       /* Border radius mac dinh (card, note, box) */
  --r-sm:  6px;       /* Border radius nho (tag, badge, input) */
  --r-lg:  12px;      /* Border radius lon (page, form-header) */

  /* ── Font ── */
  --font:  -apple-system, 'Segoe UI', Tahoma, 'Noto Sans',
           'Arial Unicode MS', Roboto, Helvetica, Arial, sans-serif;
  --mono:  'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
```

---

## 2. Typography (Kiểu chữ)

### 2.1 Font chính

| Thuộc tính | Giá trị |
|---|---|
| Font family | `var(--font)` — system font stack hỗ trợ tiếng Việt |
| Monospace | `var(--mono)` — dùng cho code, mã tài liệu |
| Root font-size | `14px` |
| Body line-height | `1.6` |
| Paragraph font-size | `13px`, line-height `1.7` |

### 2.2 Heading

| Class | Size | Weight | Color | Ghi chú |
|---|---|---|---|---|
| `.h1`, `h1.h1` | 20px | 700 | `--navy` | Có `border-bottom: 2px solid var(--navy)` |
| `.h2`, `h2.h2` | 14px | 700 | `--navy` | Có `border-bottom: 1px solid var(--ln)` |
| `.h3`, `h3.h3` | 13px | 700 | `--ink` | Không border |
| `h4` | 13px | 700 | `--ink` | Thường override trong `<style>` nội trang |

### 2.3 Text utilities

| Class | Mô tả |
|---|---|
| `.lead` | 14px, `--ink2`, line-height 1.7 — đoạn mở đầu |
| `.muted` | 12px, `--ink3` — text phụ, ghi chú |
| `.small` | 12px — text nhỏ |
| `.small.muted` | 11px, `--ink4` — text rất nhỏ, rất mờ |
| `.big` | 16px bold — số liệu nổi bật |
| `.mono`, `.code` | Monospace 12px, nền `--bg3`, padding 2px 6px |
| `.center` | `text-align: center` |
| `.mini-note` | 12px, `--ink2`, line-height 1.6 — ghi chú nhỏ |
| `.subtle` | `--ink2`, 12px |
| `.muted-note` | 12px, `--ink2` |
| `.inline-note` | 12px, `--ink2`, margin-top 8px |

---

## 3. Layout System (Hệ thống bố cục)

### 3.1 Cấu trúc trang chuẩn

```
.container           ← max-width 920px, margin auto, padding 24px 20px
  └─ .page           ← bg trắng, border-radius 12px, box-shadow
       └─ .page-body ← padding 32px 40px 48px
            ├─ .form-header   ← Header tài liệu (logo + title + meta)
            └─ .doc-content   ← Nội dung chính
                 └─ .form-sheet  ← Wrapper nội dung
```

- `.page.landscape` — mở rộng max-width thành 1160px (dùng cho bảng ngang rộng)

### 3.2 Grid classes

| Class | Columns | Gap | Ghi chú |
|---|---|---|---|
| `.grid-2` | `1fr 1fr` hoặc `auto-fit minmax(260px,1fr)` | 20px / 14px | Layout 2 cột |
| `.grid-3` | `auto-fit minmax(220px,1fr)` | 14px | Layout 3 cột |
| `.field-grid` | `repeat(2, minmax(0,1fr))` | 10px 16px | Form input 2 cột |
| `.toc-grid` | `auto-fit minmax(220px,1fr)` | 6-10px | Mục lục nhanh |
| `.metric-grid` | `auto-fit minmax(180-210px,1fr)` | 12-14px | KPI metrics |
| `.gate-grid` | `auto-fit minmax(220px,1fr)` | 12px | Cổng kiểm soát |
| `.callout-grid` | `auto-fit minmax(260px,1fr)` | 14px | Multi-column callout |
| `.auth-grid` | `repeat(2, minmax(0,1fr))` | 12px | Quyền hạn JD |
| `.comp-grid` | `repeat(2, minmax(0,1fr))` | 12px | Năng lực JD |
| `.portal-grid` | `auto-fit minmax(220px,1fr)` | 16px | Portal landing |
| `.form-grid` | `1fr 1fr` | 10px | Form layout |
| `.ship-grid` | `1fr 1fr` | 12px | Shipping info |
| `.kpi-grid` | `1fr 1fr` | 12px | KPI boxes |
| `.label-grid` | `1fr 1fr` | 6px 12px | Label fields |

**Responsive:** Tất cả grid chuyển sang 1 cột tại `max-width: 960px` (hoặc `768px` cho grid gốc trong style.css).

### 3.3 Section & separator

| Class | Mô tả |
|---|---|
| `.section` | margin 20px 0 — khối section |
| `.sep`, `hr.sep` | Border-top 1px `--ln`, margin 28px 0 |
| `.annex-block` | margin-top 40px, border-top, padding-top 16px |
| `.annex-title` | 11px bold uppercase, `--ink3`, letter-spacing 2px |
| `.page-break` | Ngắt trang khi in (`break-before: page`) |

---

## 4. Card Components (Thẻ thành phần)

### 4.1 Card cơ bản

| Class | Mô tả | Border đặc biệt |
|---|---|---|
| `.card` | Card chung — bg trắng, border `--ln`, radius `--r`, padding 20px 24px | Không |
| `.card-title` | Tiêu đề card — 14px bold `--navy` | Không |
| `.table-card` | Wrapper bảng — `border: 1px solid var(--th-bdr)` = blue #1565c0, radius `--r`, overflow auto, **no box-shadow** | Không |
| `.gate-card` | Cổng kiểm soát — border `--ln`, padding 14px | `border-left: 3px solid var(--blue)` |
| `.metric-card` | KPI metric — border `--ln`, radius `--r`, padding 16px 12px, text-align center | `border-top: 3px solid var(--blue)` |
| `.callout-card` | Multi-column callout — border `--ln`, padding 14px | Không |
| `.portal-card` | Portal landing card — border `--ln`, padding 18px | Không |
| `.link-card` | Card liên kết — border `--ln`, padding 16px | Không |

### 4.2 Card chuyên dụng (JD)

| Class | Mô tả |
|---|---|
| `.jd-purpose` | Khối mục đích JD — bg `--bg2`, border-left 4px `#1d4ed8` |
| `.jd-mission` | Sứ mệnh vị trí — bg `#eef6ff`, border-left 4px `#2563eb` |
| `.auth-item` | Ô quyền hạn — border `--ln`, radius 8px, bg `--bg2` |
| `.backup-card` | Phó/backup — border-left 4px `#0f766e`, bg `--bg2` |
| `.comp-card` | Năng lực — border `--ln`, radius 8px, bg trắng |

### 4.3 Card chuyên dụng (khác)

| Class | Mô tả |
|---|---|
| `.org-card` | Tổ chức — border `--ln`, border-top 4px `--blue` |
| `.org-row` | Hàng tổ chức — border `--ln`, padding 14px |
| `.kpi-box` | KPI box — border `--ln`, padding 12px |
| `.phase-card` | Giai đoạn — border-left 4px `--gold`, bg `#fffdf5` |
| `.lane` | Swim lane — bg `--bg2`, border `--ln` |
| `.item` | Item đơn — border `--ln2`, padding 10px 14px |
| `.label-box` | Nhãn in — border 2px dashed `--ln` |
| `.loc-box` | Location box — border 2px solid `--ink` |
| `.ship-box` | Shipping box — border `--ln`, padding 16px |

### 4.4 Metric Card (style.css dòng 137–145)

`.metric-grid` + `.metric-card` dùng hiển thị KPI / chỉ số đo lường.

| Thuộc tính | Giá trị |
|---|---|
| `.metric-grid` | `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`, gap 14px |
| `.metric-card` | text-align center, padding 16px 12px, border `--ln`, `border-top: 3px solid var(--blue)` |
| `.metric-card .value` | 26px, weight 800, `--navy`, line-height 1.2 |
| `.metric-card .label` | 10px uppercase bold 700, `--ink2`, letter-spacing .5px |
| `.metric-card .sub` | 11px, `--ink3` |
| Màu variants | `.metric-card.green` → border-top `--green`, `.metric-card.gold` → `--gold`, `.metric-card.red` → `--red` |

```html
<!-- ✅ DO -->
<div class="metric-grid">
  <div class="metric-card">
    <div class="label">Tỷ lệ lỗi</div>
    <div class="value">2.3%</div>
    <div class="sub">Mục tiêu: &lt; 3%</div>
  </div>
  <div class="metric-card green">
    <div class="label">Giao hàng đúng hạn</div>
    <div class="value">98%</div>
    <div class="sub">Đạt KPI</div>
  </div>
  <div class="metric-card red">
    <div class="label">NC mở</div>
    <div class="value">5</div>
    <div class="sub">Cần đóng trước 30/4</div>
  </div>
</div>

<!-- ❌ DON'T — metric-card không nằm trong metric-grid -->
<div class="metric-card">
  <div class="value">100%</div>
</div>
```

### 4.5 Gate Card (style.css dòng 148–151)

`.gate-grid` + `.gate-card` dùng cho cổng kiểm soát quy trình.

| Thuộc tính | Giá trị |
|---|---|
| `.gate-grid` | `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`, gap 14px |
| `.gate-card` | border `--ln`, `border-left: 3px solid var(--blue)`, radius `--r`, padding 14px |
| `.gate-card h3` | 14px, `--navy`, margin 0 0 6px |

```html
<!-- ✅ DO -->
<div class="gate-grid">
  <div class="gate-card">
    <h3>Gate 1 — Thiết kế</h3>
    <p>Review bản vẽ, phê duyệt BOM.</p>
  </div>
  <div class="gate-card">
    <h3>Gate 2 — Sản xuất thử</h3>
    <p>Kiểm tra mẫu, đo lường CPK.</p>
  </div>
  <div class="gate-card">
    <h3>Gate 3 — Release</h3>
    <p>Đóng NC, phê duyệt PPAP.</p>
  </div>
</div>

<!-- ❌ DON'T — gate-card đơn lẻ không trong gate-grid -->
<div class="gate-card">Gate lẻ</div>
```

---

## 5. Note/Callout System (Hệ thống ghi chú)

> **Nguyên tắc chung:** Tất cả note/callout/box CHỈ có `border-left: 3px solid`, KHÔNG có border khác.
> Dùng `!important` để override inline styles. Xem `style.css` dòng 111–119.

### 5.1 Note variants

| Class | Nền | Border trái 3px | Dùng khi |
|---|---|---|---|
| `.note` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Thông tin, hướng dẫn |
| `.note-blue` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Alias của `.note` |
| `.note-soft` | `--bg2` (#f8f9fa) | `--blue` (#1565c0) | Ghi chú nhẹ, nền xám |
| `.note-green` | `#ebfbee` | `--green` (#2f9e44) | Ghi chú thành công / OK |

### 5.2 Callout variants

| Class | Nền | Border trái 3px | Dùng khi |
|---|---|---|---|
| `.callout` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Cảnh báo, lệnh điều hành |
| `.callout-danger` | `#fff5f5` | `--red` (#e03131) | Nguy hiểm / dừng ngay |
| `.callout-info` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Thông tin bổ sung |
| `.callout-warn` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Cảnh báo vàng/cam |

### 5.3 HTML ví dụ

```html
<!-- ✅ DO — đúng chuẩn -->
<div class="note">Thông tin hướng dẫn quan trọng.</div>
<div class="callout">Lệnh điều hành: nội dung lệnh.</div>
<div class="callout-danger">DỪNG — không được tiếp tục nếu chưa xử lý.</div>
<div class="note-green">Đạt yêu cầu — có thể tiến hành.</div>

<!-- ❌ DON'T — thêm border inline, override style.css -->
<div class="note" style="border: 1px solid blue;">Sai</div>

<!-- ❌ DON'T — dùng class không tồn tại trong style.css -->
<div class="role-note">Không tồn tại trong CSS</div>
```

### 5.4 Box variants (style.css dòng 265–269)

| Class | Nền | Border trái 3px | Dùng khi |
|---|---|---|---|
| `.box` | `--bg` (#ffffff) | `--blue` (#1565c0) | Box chung |
| `.box.core` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Yêu cầu cốt lõi |
| `.box.sup` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Hỗ trợ / bổ sung |
| `.box.imp` | `#fff5f5` | `--red` (#e03131) | Quan trọng / bắt buộc |
| `.box.mgt` | `#f3f0ff` | `#7950f2` (tím) | Quản trị / management |

> **Quan trọng:** Tất cả `.box` variants dùng `border: none !important; border-left: 3px solid ... !important;` — KHÔNG có border nào khác.

```html
<!-- ✅ DO -->
<div class="box core">Yêu cầu cốt lõi ISO 9001.</div>
<div class="box imp">Bắt buộc tuân thủ — vi phạm sẽ dừng sản xuất.</div>

<!-- ❌ DON'T — thêm border tay -->
<div class="box" style="border: 1px solid #ccc;">Sai — box chỉ có border-left</div>
```

---

## 6. Badge/Tag System (Hệ thống nhãn)

> Xem `style.css` dòng 103–132.

### 6.1 Badge & Tag cơ bản

| Class | Kiểu | Ghi chú |
|---|---|---|
| `.badge` | Uppercase, navy bg, trắng text, 10px, letter-spacing .8px | Nhãn chính |
| `.tag` | Border `--ln`, bg `--bg3`, 11px, 600 weight | Nhãn inline |
| `.tag.teal` | bg `#e6fcf5`, text `#087f5b`, border `#96f2d7` | Tag teal |
| `.tag.orange` | bg `#fff4e6`, text `#d9480f`, border `#ffd8a8` | Tag cam |
| `.chip` | bg `--blue-l`, text `--blue`, 11px, 600 weight | Chip thông tin |
| `.pill`, `.status-pill` | Rounded 20px, uppercase 10px, 700 weight, border `--ln` | Trạng thái |
| `.kpi-pill` | bg `#ebfbee`, text `--green`, border `#b2f2bb`, 11px 700 | KPI pill |

### 6.2 Severity levels

| Class | Nền | Text |
|---|---|---|
| `.level.l1` | `#dbe4ff` | `#364fc7` (Xanh dương — Info) |
| `.level.l2` | `#d3f9d8` | `#2b8a3e` (Xanh lá — OK) |
| `.level.l3` | `#fff3bf` | `#e67700` (Vàng — Warning) |
| `.level.l4` | `#ffe3e3` | `#c92a2a` (Đỏ — Critical) |

### 6.3 Requirement tags (style.css dòng 128–132)

| Class | Nền | Text | Border | Hiển thị | Ý nghĩa |
|---|---|---|---|---|---|
| `.req-tag.shall` | `#fff5f5` | `--red` (#e03131) | `1px solid #ffc9c9` | **PHẢI** | Yêu cầu bắt buộc |
| `.req-tag.must` | `#fff5f5` | `--red` (#e03131) | `1px solid #ffc9c9` | **BẮT BUỘC** | Giống shall — alias đỏ |
| `.req-tag.should` | `#fff9db` | `#e67700` (amber) | `1px solid #ffe066` | **NÊN** | Khuyến nghị |
| `.req-tag.may` | `#ebfbee` | `--green` (#2f9e44) | `1px solid #b2f2bb` | **CÓ THỂ** | Tùy chọn |

> **Lưu ý:** `.req-tag` base: `padding: 3px 10px`, `font-size: 10px`, `font-weight: 800`, `text-transform: uppercase`, `flex-shrink: 0`.

```html
<!-- ✅ DO — dùng trong .req block -->
<div class="req">
  <span class="req-tag shall">PHẢI</span>
  <div>Kiểm soát tài liệu theo ISO 9001 §7.5.</div>
</div>
<div class="req">
  <span class="req-tag must">BẮT BUỘC</span>
  <div>Phê duyệt trước khi phát hành.</div>
</div>
<div class="req">
  <span class="req-tag should">NÊN</span>
  <div>Review định kỳ hàng quý.</div>
</div>
<div class="req">
  <span class="req-tag may">CÓ THỂ</span>
  <div>Sử dụng template tùy chỉnh.</div>
</div>

<!-- ❌ DON'T — dùng req-tag ngoài .req block -->
<span class="req-tag shall">PHẢI</span> Nội dung lẻ không có wrapper.
```

### 6.4 Hệ thống 4 loại nhãn phân biệt (Badge Types)

> **Quy tắc:** Nhìn màu badge = biết loại. KHÔNG dùng lẫn.

| # | Class | Màu | Hình dạng | Ví dụ | Dùng cho |
|---|-------|-----|-----------|-------|----------|
| 1 | `.iso-clause` | 🔵 White on blue `#1565c0` | Pill (rounded 12px) | `§8.2` | Viện dẫn ISO 9001:2026 |
| 2 | `.step-tag` | ⬛ White on dark `#37474f` | Rounded square | `S1`, `S3` | Bước nội bộ SOP/WI |
| 3 | `.gate-tag` | 🔷 White on teal `#00838f` | Pill (rounded 12px) | `G0`, `G4` | 8 System Gates |
| 4 | `.proc-tag` | 🟡 Dark on amber `#fff3cd` | Rounded square, border `#ffc107` | `Bước 1` | Quy trình chi tiết (flowchart) |

```html
<!-- ISO Clause badge — viện dẫn tiêu chuẩn -->
<span class="iso-clause">§8.2</span>

<!-- Internal Step badge — bước nội bộ SOP -->
<span class="step-tag">S1</span>

<!-- System Gate badge — 8 cổng kiểm soát -->
<span class="gate-tag">G4</span>

<!-- Procedure Step badge — quy trình chi tiết -->
<span class="proc-tag">Bước 1</span>
```

> **KHÔNG BAO GIỜ** dùng `G1`, `G2`... cho bước nội bộ SOP → dùng `S1`, `S2`...
> **KHÔNG BAO GIỜ** dùng `.iso-clause` cho non-ISO references.
> Mỗi yêu cầu PHẢI/NÊN/CÓ THỂ trong iso-map PHẢI có `<span class="iso-clause">§X.Y</span>` kèm theo.

### 6.5 Flowchart — Lưu đồ quy trình chi tiết

> Mỗi SOP section "Quy trình chi tiết" PHẢI bắt đầu bằng flowchart tổng quan.

```html
<div class="flowchart">
  <div class="flow-step">
    <div class="flow-num">1</div>
    <div class="flow-title">Tên bước</div>
    <div class="flow-desc">Mô tả ngắn 1 dòng</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step active">
    <div class="flow-num">2</div>
    <div class="flow-title">Decision</div>
    <div class="flow-desc">Bước quyết định/phê duyệt</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step critical">
    <div class="flow-num">3</div>
    <div class="flow-title">Inspection</div>
    <div class="flow-desc">Bước kiểm tra/đo lường</div>
  </div>
</div>
```

**CSS classes:**

| Class | Màu | Dùng cho |
|-------|-----|----------|
| `.flow-step` | White, border blue | Bước thường |
| `.flow-step.active` | Amber background `#fffbeb` | Bước quyết định / phê duyệt / release |
| `.flow-step.critical` | Red background `#fef2f2` | Bước kiểm tra / đo lường / hold point |
| `.flow-arrow` | Blue `#1565c0` | Mũi tên nối bước |
| `.flow-num` | White circle on blue | Số thứ tự bước |

**Quy tắc flowchart:**
1. Số bước tối đa: **12** (nếu nhiều hơn → chia sub-process)
2. Tên bước: **2-3 từ** (ngắn gọn)
3. Mô tả: **1 dòng** (tùy chọn, bỏ trống nếu tên đủ rõ)
4. Responsive: ngang → dọc trên mobile
5. Print: in được với đủ màu sắc
6. **Bắt buộc** đặt trước section "Quy trình chi tiết"

---

## 7. Table System (Hệ thống bảng)

> **Thiết kế bảng v10:** Border xanh `#1565c0`, header blue tint, column dividers, no box-shadow.
> Xem `style.css` dòng 152–200.

### 7.1 Quy tắc chung

1. **BẮT BUỘC** dùng `class="table"` trên mọi `<table>` — nếu thiếu class, bảng sẽ không có đúng style
2. Luôn bọc bảng trong `.table-card` để responsive trên mobile
3. Dùng `.form-table` cho bảng dạng form
4. Dùng `.docx-table` cho bảng từ Word/docx import

### 7.2 Cấu trúc HTML chuẩn

```html
<!-- ✅ DO — đúng chuẩn -->
<div class="table-card">
  <table class="table">
    <thead>
      <tr><th>Cột A</th><th>Cột B</th><th>Cột C</th></tr>
    </thead>
    <tbody>
      <tr><td>Dữ liệu 1</td><td>Dữ liệu 2</td><td>Dữ liệu 3</td></tr>
    </tbody>
  </table>
</div>

<!-- ❌ DON'T — thiếu class="table" → sai style -->
<div class="table-card">
  <table>
    <tr><td>Dữ liệu</td></tr>
  </table>
</div>
```

### 7.3 Styling chi tiết (style.css dòng 152–200)

| Thành phần | Style thực tế |
|---|---|
| `.table-card` | `border: 1px solid var(--th-bdr)` = blue #1565c0, `border-radius: var(--r)`, `box-shadow: none`, `overflow: auto` |
| `.table` | `width: 100%`, `border-collapse: separate`, `border-spacing: 0`, `border: 1px solid var(--th-bdr)`, `border-radius: var(--r)`, font 12.5px |
| `thead th` | bg `var(--th-bg)` = `rgba(21,101,192,0.12)`, text `--navy`, 10.5px uppercase bold 700 |
| `thead th` border | `border-bottom: 1px solid var(--th-bdr)`, `border-right: 1px solid var(--th-bdr)`, last-child: `border-right: none` |
| `tbody td` | padding 10px 14px, `border-bottom: 1px solid var(--th-bdr)`, `border-right: 1px solid var(--th-bdr)`, last-child: `border-right: none` |
| `tbody tr:last-child td` | `border-bottom: none` |
| `tbody tr:hover` | `background: rgba(21,101,192,0.04)` — blue tint rất nhẹ |
| `tbody th` | bg `rgba(21,101,192,0.06)`, bold 700, `--navy`, font 11.5px, cùng border pattern |
| `.table.compact` | td/th padding 6px 10px, font 11.5px; thead 8px 10px, font 9.5px |

> **Lưu ý quan trọng:** Khi bảng nằm trong `.table-card`, bảng bên trong KHÔNG có border riêng (`border: none`) — border ngoài do `.table-card` đảm nhận.

### 7.4 Bảng chuyên dụng

| Class | Mô tả |
|---|---|
| `.form-table` | Cùng thiết kế blue border, th bg `--th-bg`, font 12px, 11px bold |
| `.docx-table` | Cùng thiết kế blue border, font 12px, dùng cho import Word |
| `.iso-matrix` | Font 11px, padding nhỏ 5px 8px, thead 9px |
| `.tbl` | Bảng đơn giản, `border-collapse: collapse`, border `--ln`, padding 6px 10px |
| `.assessment-matrix`, `.rubric` | Font 11px, padding 5px 8px |

### 7.5 Autofit mode

Bảng có attribute `data-qms-autofit="balanced"` hoặc `data-ed-autofit="balanced"` sẽ được ép `table-layout: fixed` và `width: 100%`, giúp cân bằng cột tự động.

```html
<!-- ✅ DO — autofit balanced -->
<table class="table" data-qms-autofit="balanced">...</table>

<!-- ❌ DON'T — dùng inline width cứng thay vì autofit -->
<table class="table" style="width:500px">...</table>
```

---

## 8. Process Flow (Luồng quy trình)

### 8.1 Vertical flow

```html
<div class="vflow">
  <div class="vstep">
    <div class="vnum">1</div>
    <div class="vtext">Mô tả bước 1</div>
  </div>
  <div class="vstep">
    <div class="vnum">2</div>
    <div class="vtext">Mô tả bước 2</div>
  </div>
</div>
```

| Class | Mô tả |
|---|---|
| `.vflow` | Container flex column, gap 6px |
| `.vstep` | Bước — flex, gap 12px, border `--ln2`, padding 12px 16px |
| `.vnum` | Số bước — tròn 28px, bg `--navy`, trắng, bold |
| `.vtext` | Nội dung bước — flex 1, 13px |
| `.vbranches` | Nhánh con — margin-left 42px, border-left 2px `--ln` |

### 8.2 Step band

```html
<div class="step-band">
  <span>1 Tiếp nhận</span>
  <span>2 Rà soát</span>
  <span>3 Phê duyệt</span>
</div>
```

`.step-band` — flex wrap, gap 8px; mỗi `<span>` có border `--ln`, rounded 999px, 11px bold.

### 8.3 Step list (counter-based)

```html
<div class="step-list">
  <div class="step-item">Nội dung bước 1</div>
  <div class="step-item">Nội dung bước 2</div>
</div>
```

`.step-list` dùng CSS counter; `.step-item` có pseudo-element tròn navy với số tự động.

---

## 9. Form & Field Components

| Class | Mô tả |
|---|---|
| `.field` | Ô form — border `--ln`, padding 10px 12px, bg `--bg` |
| `.field b` | Label — 11px uppercase `--ink3` |
| `.blank` | Dòng trống — border-bottom `--ink4`, min-height 20px |
| `.input` | Input giả — border `--ln`, padding 6px 10px, bg `--bg2` |
| `.check`, `.chk` | Checkbox giả — 15px vuông, border `--ink4` |
| `.sig-box`, `.signbox`, `.signature` | Ô chữ ký — border dashed `--ln`, min-height 56px, bg `--bg2` |
| `.sig-row`, `.sign-row` | Hàng chữ ký — flex, gap 16px |

---

## 10. Special Components

### 10.1 ISO Map & Requirements (style.css dòng 120–133)

`.iso-map` là khối hiển thị yêu cầu tuân thủ ISO, có thiết kế nổi bật:

| Thuộc tính | Giá trị |
|---|---|
| Background | `linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)` — gradient xanh nhạt |
| Border | `1px solid var(--blue)` = #1565c0 |
| Border-radius | `var(--r)` = 8px |
| `::before` pseudo | Label **"ISO 9001:2026"** — bg blue, text trắng, font 9px bold, absolute top -9px |
| `.iso-clause` | Badge xanh `--blue` bg, text trắng, font 9px bold — dùng cho mã điều khoản (vd: §7.5) |
| `.iso-map .req` | bg `rgba(255,255,255,0.85)`, border `1px solid rgba(21,101,192,0.15)`, border-left `3px solid --blue` |
| `.iso-title` | 11px bold uppercase, `--ink3`, letter-spacing .8px |

```html
<!-- ✅ DO — ISO Map đầy đủ -->
<div class="iso-map">
  <div class="iso-title">Chuẩn mực áp dụng</div>
  <h3 class="h3">Kiểm soát tài liệu <span class="iso-clause">§7.5</span></h3>
  <div class="req">
    <span class="req-tag shall">PHẢI</span>
    <div>Tài liệu phải được phê duyệt trước khi phát hành.</div>
  </div>
  <div class="req">
    <span class="req-tag should">NÊN</span>
    <div>Review định kỳ để đảm bảo tính phù hợp.</div>
  </div>
</div>

<!-- ❌ DON'T — dùng .req không nằm trong .iso-map mà không có wrapper -->
<div class="req">
  <span class="req-tag shall">PHẢI</span>
  <div>Req lẻ ngoài iso-map vẫn hoạt động nhưng không có gradient nền.</div>
</div>
```

> **Lưu ý:** `.req` bên ngoài `.iso-map` có `bg: var(--bg)` (trắng), border-left 3px blue. `.req` bên trong `.iso-map` có bg translucent trắng `rgba(255,255,255,0.85)` và thêm border nhẹ xanh.

### 10.2 Preface block

```html
<div class="preface-block">
  <div class="callout">
    <div class="card-title">Lệnh điều hành</div>
    <p>Nội dung lệnh.</p>
    <div class="legend-row">
      <span class="chip">Cổng kiểm soát: ...</span>
    </div>
  </div>
</div>
```

### 10.3 Table of Contents

```html
<div class="toc">
  <div class="toc-title">Mục lục</div>
  <div class="toc-grid">
    <a href="#p1">1. Mục đích</a>
    <a href="#p2">2. Phạm vi</a>
  </div>
</div>
```

### 10.4 Organization tree (Dept Handbook)

```html
<div class="org-tree">
  <div class="org-level cols-1">
    <div class="org-card"><h3>Giám đốc</h3><p>Mô tả</p></div>
  </div>
  <div class="org-level cols-3">
    <div class="org-card"><h3>Trưởng phòng A</h3></div>
    <div class="org-card"><h3>Trưởng phòng B</h3></div>
    <div class="org-card"><h3>Trưởng phòng C</h3></div>
  </div>
</div>
```

### 10.5 Legend & Chiplist

```html
<div class="legend">
  <span class="chip">Item 1</span>
  <span class="chip">Item 2</span>
</div>

<div class="chiplist">
  <span class="chip">Tag A</span>
  <span class="chip">Tag B</span>
</div>
```

---

## 11. Print Rules (Quy tắc in)

> **3 khối `@media print`** trong style.css: dòng 360–445, 513–535, 586–632.

### 11.1 Kích thước trang

```css
/* style.css dòng 369–373 (khối 1) + dòng 623–626 (khối 3) */
@page { margin: 15mm 12mm 18mm 12mm; }           /* khối 1 */
@page { margin: 18mm 12mm 20mm 12mm; size: A4; }  /* khối 3 — override cuối */
@page :first { margin-top: 10mm; }
html { font-size: 10pt; }
```

### 11.2 Page break control (3 khối gộp)

| Quy tắc | Áp dụng cho |
|---|---|
| `page-break-inside: avoid` | `.req`, `.vstep`, `.legend`, `.sig-row`, `.sign-row`, `.approval-row`, `.backup-card` (khối 1+2), `.callout`, `.note`, `.card`, `.iso-map`, `.preface-block`, `.jd-mission`, `.form-header`, `.badge`, `.auth-grid` (khối 3) |
| `page-break-inside: auto` | `.card`, `.table-card`, `.callout`, `.note`, `.box`, `.iso-map`, `.preface-block`, `.form-sheet`, `.form-header` (khối 1+2 — cho phép cắt nếu dài) |
| `page-break-after: avoid` | `h1-h4`, `.h1-.h4` |
| `display: table-header-group` | `thead` — lặp header bảng mỗi trang |
| `display: table-footer-group` | `tfoot` |
| `orphans: 3; widows: 3` | `p`, headings |
| `tr` | `page-break-inside: avoid` |

> **Lưu ý:** Khối 3 (dòng 607–612) override khối 1+2, đặt `avoid` cho nhiều element nhỏ. Kết quả cuối: elements nhỏ avoid, elements lớn auto.

### 11.3 Print visibility

| Class | Screen | Print |
|---|---|---|
| `.no-print` | Hiện | Ẩn (`display: none !important`) |
| `.print-disclaimer` | Ẩn (`display: none !important`) | Hiện (`display: block !important`) |
| `.no-screen` | Ẩn (`display: none !important`) | Hiện |
| `.btn` | Hiện | Ẩn (`display: none !important`) |

### 11.4 Print overrides

- Link: `color: var(--ink) !important; text-decoration: none !important`
- `.page`: `box-shadow: none`, `border: none`, `border-radius: 0`, `overflow: visible`
- `.page-body`: `padding: 8px 0 0`, `overflow: visible`
- `.container`: `max-width: 100%; padding: 0; margin: 0; overflow: visible`
- `.table-card`: `overflow: visible !important; border: 1px solid var(--th-bdr)` (khối 1) + `border: 1px solid #999` (khối 3)
- `.form-header`: `border: 1px solid #999`, `border-radius: 0`, `page-break-inside: avoid`
- Table header: `print-color-adjust: exact` — in đúng màu `var(--th-bg)`
- Note/Callout/Box/Badge: `print-color-adjust: exact` — giữ màu border-left
- Gate cards: gap 8px, padding 10px, font 11px (compact hơn screen)
- Footer `@page`: `"Bản in không kiểm soát nếu không có dấu kiểm soát — HESEM QMS"` (khối 1)

---

## 12. Responsive Rules (Quy tắc responsive)

### Breakpoint 768px (mobile)

```css
@media screen and (max-width: 768px) {
  .page-body { padding: 20px 16px 32px; }
  .form-header .meta { flex-direction: column; }
  .grid-2, .form-grid, .ship-grid, .toc-grid { grid-template-columns: 1fr; }
  .sig-row, .sign-row { flex-direction: column; }
  table { table-layout: fixed; }
  td, th { overflow-wrap: anywhere; word-break: break-word; }
}
```

### Breakpoint 960px (in-page grids)

Nhiều tài liệu override grid tại 960px trong `<style>` nội trang:

```css
@media (max-width: 960px) {
  .grid-2, .grid-3, .field-grid, .auth-grid, .comp-grid { grid-template-columns: 1fr; }
}
```

### Overflow prevention

- `.page-body`: `overflow-x: hidden; overflow-wrap: anywhere; word-break: break-word`
- `pre, code, .mono`: `white-space: pre-wrap; word-break: break-word`
- `img, svg, canvas, video`: `max-width: 100%; height: auto`

---

## 13. Button & Action

| Class | Mô tả |
|---|---|
| `.btn` | Nút nhấn — border `--ln`, bg `--bg`, text `--navy`, hover bg `--bg2` |
| `.btnrow` | Hàng nút — flex, gap 8px |
| `kbd` | Phím tắt — monospace 11px, border `--ln`, bg trắng |

---

## 14. Google Translate (ẩn hoàn toàn)

Style.css có khối CSS ẩn toàn bộ UI Google Translate (banner, menu, tooltip, balloon). Điều này cho phép dùng Google Translate API để dịch nội dung mà không hiện giao diện dịch.

---

## 15. Quy ước đặt tên class

| Tiền tố | Nhóm |
|---|---|
| `fh-` | Form header |
| `jd-` | Job Description |
| `org-` | Organization chart |
| `comp-` | Competency |
| `auth-` | Authority |
| `req-` | Requirement |
| `raci-` | RACI matrix |
| `iso-` | ISO mapping |
| `doc-` | Document content |
| `gate-` | Control gate |
| `metric-` | KPI metric |
| `kpi-` | KPI indicator |
| `badge-` | Badge variant |
| `note-` | Note variant |
| `callout-` | Callout variant |
| `step-` | Step/flow |
| `sig-`, `sign-` | Signature |

---

## 16. Print Layout (In ấn — ISO compliant)

### Nguyên tắc: WYSIWYG — hiển thị sao, in như vậy

| Thuộc tính | Giá trị (kết quả cuối sau 3 khối `@media print`) |
|-----------|---------|
| `@page margin` | 18mm top, 12mm sides, 20mm bottom; size A4 (khối 3 override) |
| `@page :first` | margin-top 10mm |
| `html font-size` | 10pt (nhỏ hơn screen 14px) |
| `form-header` | Giữ nguyên grid layout, border 1px solid #999, `border-radius: 0`, `page-break-inside: avoid` |
| Table header | `print-color-adjust: exact` — in đúng màu `var(--th-bg)` |
| Table border | `border: 1px solid var(--th-bdr)` — giữ blue border khi in |
| Cards/Notes lớn | `page-break-inside: auto` — cho phép cắt nếu dài hơn 1 trang |
| `req`, `vstep`, `legend` | `page-break-inside: avoid` — không cắt element nhỏ |
| Badge/Tag/Chip | `print-color-adjust: exact` — in đúng màu |
| Gate cards | Compact hơn: gap 8px, padding 10px, font 11px |
| `.page` | Bỏ shadow, border, radius — in phẳng |
| `.table-card` | `overflow: visible !important` — không bị cắt khi in |

### Lưu ý ISO trên bản in:
- Footer trang (khối 1): `"Bản in không kiểm soát nếu không có dấu kiểm soát — HESEM QMS"` (font 7pt, #999)
- Không thêm header/footer tự động từ browser (tắt trong settings in)

### Quy tắc bắt buộc:
1. **KHÔNG** thêm inline `@media print` vào HTML files — tất cả print rules nằm trong `style.css`
2. **KHÔNG** thêm `page-break-inside: avoid` cho elements lớn (card, table-card, note, box, iso-map)
3. **CÓ THỂ** thêm `page-break-before: always` trước heading lớn nếu cần tách trang
4. **KHÔNG** override `overflow` trong inline styles — style.css đã set `overflow: visible !important` cho print

---

## 17. Vflow — Visual Flowchart Steps

### Cấu trúc HTML:
```html
<div class="vflow">
  <div class="vstep">
    <div class="vnum">1</div>
    <div class="vtext"><b>Tên bước</b><br>Mô tả chi tiết...</div>
  </div>
  <div class="vstep decision">
    <div class="vnum">?</div>
    <div class="vtext"><b>Quyết định</b><br>Nếu PASS → bước tiếp. Nếu FAIL → hold.</div>
  </div>
  <div class="vstep hold">
    <div class="vnum">!</div>
    <div class="vtext"><b>HOLD</b><br>Dừng và escalation.</div>
  </div>
  <div class="vstep end">
    <div class="vnum">✓</div>
    <div class="vtext"><b>Hoàn tất</b><br>Release sang gate tiếp theo.</div>
  </div>
</div>
```

### Variants:
| Class | Màu border-left | Vnum background | Dùng khi |
|-------|-----------------|----------------|----------|
| `.vstep` (default) | `--blue` | `--blue` | Bước thông thường |
| `.vstep.decision` | `--gold` | `--gold` | Bước quyết định (pass/fail) |
| `.vstep.hold` | `--red` | `--red` | Bước HOLD/dừng |
| `.vstep.end` | `--green` | `--green` | Bước hoàn tất/release |

### Visual:
- Vertical connector line gradient `--blue` → `--gold` nối các bước
- Hover: border-left chuyển sang `--gold`, subtle box-shadow
- Vnum: circle 32px, box-shadow, số bước bên trong

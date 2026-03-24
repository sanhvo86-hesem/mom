# 04 — Hệ thống thiết kế HTML/CSS (HESEM QMS Design System)

> Phiên bản: v7 | Cập nhật: 2026-03-24
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
  --th-bg: #eef4fb;   /* Nền header bảng */
  --th-bdr:#b8d4f0;   /* Border header bảng */
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
| `.table-card` | Wrapper bảng — border `--ln`, radius `--r`, overflow-x auto | Không |
| `.gate-card` | Cổng kiểm soát — tương tự card | `border-left: 4px solid var(--blue)` |
| `.metric-card` | KPI metric — border `--ln`, radius `--r`, padding 14px | Không |
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

---

## 5. Note/Callout System (Hệ thống ghi chú)

| Class | Nền | Border trái | Dùng khi |
|---|---|---|---|
| `.note` | `--blue-l` (#e3f2fd) | 2px `--blue` | Thông tin, hướng dẫn |
| `.callout` | `--gold-l` (#fff8e1) | 2px `--gold` | Cảnh báo, lệnh điều hành |
| `.note-soft` | `#fffbeb` | 4px `#eab308` | Cảnh báo vàng nhẹ |
| `.note-blue` | `--blue-l` | 4px `--blue` | Thông tin xanh biến thể |
| `.role-note` | `#f8fafc` | 4px `#94a3b8` | Ghi chú vai trò |
| `.callout-danger` | `#fff5f5` | 4px `#c92a2a` | Nguy hiểm / dừng ngay |
| `.callout-info` | `#eef7ff` | 4px `#1971c2` | Thông tin bổ sung |
| `.callout-warn` | `#fff9db` | 4px `#e67700` | Cảnh báo cam |

### Box variants

| Class | Nền | Border trái | Dùng khi |
|---|---|---|---|
| `.box` | `--bg` | `--ln` | Box chung |
| `.box.core` | `--blue-l` | 2px `--blue` | Yêu cầu cốt lõi |
| `.box.imp` | `#fff5f5` | 2px `--red` | Quan trọng / bắt buộc |
| `.box.sup` | `--gold-l` | 2px `--gold` | Hỗ trợ / bổ sung |
| `.box.mgt` | `#f3f0ff` | 2px `#7950f2` | Quản trị / management |

---

## 6. Badge/Tag System (Hệ thống nhãn)

| Class | Kiểu | Ghi chú |
|---|---|---|
| `.badge` | Uppercase, navy bg, trắng text, 10px | Nhãn chính |
| `.tag` | Border `--ln`, bg `--bg3`, 11px | Nhãn inline |
| `.tag.teal` | Xanh lá — bg `#e6fcf5`, text `#087f5b` | Tag teal |
| `.tag.orange` | Cam — bg `#fff4e6`, text `#d9480f` | Tag cam |
| `.chip` | bg `--blue-l`, text `--blue`, 11px | Chip thông tin |
| `.pill`, `.status-pill` | Rounded 20px, uppercase 10px | Trạng thái |
| `.kpi-pill` | Xanh lá — bg `#ebfbee`, text `--green` | KPI pill |
| `.inline-tag` | Rounded 999px, 10px bold, bg `--bg2` | Tag inline nhỏ |
| `.badge-soft` | Rounded 999px, bg `--blue-l`, text `--navy` | Badge mềm |
| `.badge-red` | Rounded, bg `#fff5f5`, text `#c92a2a` | Badge đỏ |
| `.badge-amber` | Rounded, bg `#fff9db`, text `#e67700` | Badge vàng |
| `.badge-green` | Rounded, bg `#ebfbee`, text `#2b8a3e` | Badge xanh |
| `.badge-blue` | Rounded, bg `#e7f5ff`, text `#1971c2` | Badge xanh dương |
| `.badge-navy` | Rounded, bg `#eef2ff`, text `#243b6b` | Badge navy |

### Severity levels

| Class | Nền | Text |
|---|---|---|
| `.level.l1` | `#dbe4ff` | `#364fc7` (Xanh dương — Info) |
| `.level.l2` | `#d3f9d8` | `#2b8a3e` (Xanh lá — OK) |
| `.level.l3` | `#fff3bf` | `#e67700` (Vàng — Warning) |
| `.level.l4` | `#ffe3e3` | `#c92a2a` (Đỏ — Critical) |

### Requirement tags

| Class | Nền | Text | Ý nghĩa |
|---|---|---|---|
| `.req-tag.shall` | `#fff5f5` | `--red` | BẮT BUỘC (PHẢI) |
| `.req-tag.should` | `#fff9db` | `#e67700` | KHUYẾN NGHỊ (NÊN) |
| `.req-tag.may` | `#ebfbee` | `--green` | TÙY CHỌN (CÓ THỂ) |

### RACI badges

| Class | Nền | Text |
|---|---|---|
| `.raci-r`, `.raci-R` | `#e0f2fe` / `#e7f5ff` | `#0369a1` / `#1864ab` |
| `.raci-a`, `.raci-A` | `#fff3e0` / `#fff5f5` | `#b45309` / `#c92a2a` |
| `.raci-c`, `.raci-C` | `#f3e8ff` / `#fff9db` | `#7e22ce` / `#e67700` |
| `.raci-i`, `.raci-I` | `#ecfdf5` / `#ebfbee` | `#047857` / `#2b8a3e` |

---

## 7. Table System (Hệ thống bảng)

### 7.1 Quy tắc chung

1. Luôn bọc bảng trong `.table-card` để responsive trên mobile
2. Dùng class `.table` hoặc `table.table` cho bảng dữ liệu
3. Dùng `.form-table` cho bảng dạng form (có border tất cả ô)
4. Dùng `.docx-table` cho bảng từ Word/docx import

### 7.2 Styling mặc định

| Thành phần | Style |
|---|---|
| `table` | `width: 100%; table-layout: auto; border-collapse: collapse` |
| `thead th` | bg `--th-bg`, text `--navy`, 10px uppercase bold, border-bottom 2px `--th-bdr` |
| `tbody td` | padding 10px 14px, border-bottom 1px `--ln2` |
| `tr:nth-child(even)` | bg `#fafcfe` (sọc nhẹ xanh) |
| `tr:hover` | bg `#f0f4ff` |
| `tbody th` | bg `--th-bg`, bold, border-right `--ln` |

### 7.3 Bảng chuyên dụng

| Class | Mô tả |
|---|---|
| `.form-table` | Border tất cả ô, th bg `--th-bg`, 12px |
| `.docx-table` | Border tất cả ô, 12px, dùng cho import Word |
| `.iso-matrix` | Font 11px, padding nhỏ 5px 8px |
| `.tbl` | Bảng đơn giản, border `--ln`, padding 6px 10px |
| `.assessment-matrix`, `.rubric` | Font 11px, padding nhỏ |
| `.rule-table` | Cột 1-2 không ngắt dòng |

### 7.4 Autofit mode

Bảng có attribute `data-qms-autofit="balanced"` hoặc `data-ed-autofit="balanced"` sẽ được ép `table-layout: fixed` và `width: 100%`, giúp cân bằng cột tự động.

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

### 10.1 ISO Map & Requirements

```html
<div class="iso-map">
  <div class="iso-title">Chuẩn mực áp dụng</div>
  <div class="req">
    <span class="req-tag shall">PHẢI</span>
    <div>Nội dung yêu cầu bắt buộc.</div>
  </div>
</div>
```

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

### 11.1 Kích thước trang

```css
@page { margin: 18mm 12mm 20mm 12mm; size: A4; }
html { font-size: 10.5pt; }  /* nhỏ hơn screen 14px */
```

### 11.2 Page break control

| Quy tắc | Áp dụng cho |
|---|---|
| `page-break-inside: avoid` | `.card`, `.table-card`, `.callout`, `.note`, `.box`, `.iso-map`, `.preface-block`, `.jd-mission`, `.form-sheet`, `.lane`, `.legend`, `.req`, `.auth-grid`, `.vstep`, `.sig-row`, `.form-header`, `.badge` |
| `page-break-after: avoid` | `h1-h4`, `.h1-.h4` |
| `display: table-header-group` | `thead` — lặp header bảng mỗi trang |
| `display: table-footer-group` | `tfoot` |
| `orphans: 3; widows: 3` | `p`, headings |

### 11.3 Print visibility

| Class | Screen | Print |
|---|---|---|
| `.no-print` | Hiện | Ẩn |
| `.print-disclaimer` | Ẩn | Hiện |
| `.no-screen` | Ẩn | Hiện |
| `.btn` | Hiện | Ẩn |

### 11.4 Print overrides

- Link: `color: var(--ink) !important; text-decoration: none`
- `.page`: bỏ shadow, border, radius
- `.container`: `max-width: 100%; padding: 0`
- `.table-card`: `overflow: visible !important; border: 1px solid #999`
- `.form-header`: `border: 1.5px solid #333; border-radius: 0`

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

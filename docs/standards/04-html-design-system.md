# 04 — HTML/CSS design system (HESEM QMS Design System)

> Version: v13 | Updated: 2026-03-26
> Original CSS file: `assets/style.css`

---

## 1. CSS Variables (Original Variables)

All variables are declared in `:root` of `style.css`. Every component uses variables instead of hard-coding colors.

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

## 2. Typography

### 2.1 Main font

| Attributes | Value |
|---|---|
| Font families | `var(--font)` — system font stack supports Vietnamese |
| Monospace | `var(--mono)` — used for code, document code |
| Root font-size | `14px` |
| Body line-height | `1.6` |
| Paragraph font-size | `13px`, line-height `1.7` |

### 2.2 Headings

| Class | Size | Weight | Color | Note |
|---|---|---|---|---|
| `.h1`, `h1.h1` | 20px | 700 | `--navy` | Yes `border-bottom: 2px solid var(--navy)` |
| `.h2`, `h2.h2` | 14px | 700 | `--navy` | Yes `border-bottom: 1px solid var(--ln)` |
| `.h3`, `h3.h3` | 13px | 700 | `--ink` | No borders |
| `h4` | 13px | 700 | `--ink` | Usually override in `<style>` builtin |

### 2.3 Text utilities

| Class | Describe |
|---|---|
| `.lead` | 14px, `--ink2`, line-height 1.7 — opening paragraph |
| `.muted` | 12px, `--ink3` — secondary text, notes |
| `.small` | 12px — small text |
| `.small.muted` | 11px, `--ink4` — very small text, very blurry |
| `.big` | 16px bold — figures that stand out |
| `.mono`, `.code` | Monospace 12px, background `--bg3`, padding 2px 6px |
| `.center` | `text-align: center` |
| `.mini-note` | 12px, `--ink2`, line-height 1.6 — small note |
| `.subtle` | `--ink2`, 12px |
| `.muted-note` | 12px, `--ink2` |
| `.inline-note` | 12px, `--ink2`, margin-top 8px |

---

## 3. Layout System (Layout System)

### 3.1 Standard page structure

```
.container           ← max-width 920px, margin auto, padding 24px 20px
  └─ .page           ← bg trắng, border-radius 12px, box-shadow
       └─ .page-body ← padding 32px 40px 48px
            ├─ .form-header   ← Header tài liệu (logo + title + meta)
            └─ .doc-content   ← Nội dung chính
                 └─ .form-sheet  ← Wrapper nội dung
```

- `.page.landscape` — expand max-width to 1160px (used for wide horizontal panels)

### 3.2 Grid classes

| Class | Columns | Gap | Note |
|---|---|---|---|
| `.grid-2` | `1fr 1fr` or `auto-fit minmax(260px,1fr)` | 20px / 14px | 2 column layout |
| `.grid-3` | `auto-fit minmax(220px,1fr)` | 14px | 3 column layout |
| `.field-grid` | `repeat(2, minmax(0,1fr))` | 10px 16px | Form input 2 columns |
| `.toc-grid` | `auto-fit minmax(220px,1fr)` | 6-10px | Quick table of contents |
| `.metric-grid` | `auto-fit minmax(180-210px,1fr)` | 12-14px | KPI metrics |
| `.gate-grid` | `auto-fit minmax(220px,1fr)` | 12px | Grid information cards / legacy visual cards; **not for use with Section 6 SOP** |
| `.callout-grid` | `auto-fit minmax(260px,1fr)` | 14px | Multi-column callout |
| `.auth-grid` | `repeat(2, minmax(0,1fr))` | 12px | JD powers |
| `.comp-grid` | `repeat(2, minmax(0,1fr))` | 12px | JD capacity |
| `.portal-grid` | `auto-fit minmax(220px,1fr)` | 16px | Portal landing |
| `.form-grid` | `1fr 1fr` | 10px | Form layout |
| `.ship-grid` | `1fr 1fr` | 12px | Shipping info |
| `.kpi-grid` | `1fr 1fr` | 12px | KPI boxes |
| `.label-grid` | `1fr 1fr` | 6px 12px | Label fields |

**Responsive:** All grids move to 1 column at `max-width: 960px` (or `768px` for the original grid in style.css).

### 3.3 Sections & separators

| Class | Describe |
|---|---|
| `.section` | margin 20px 0 — section block |
| `.sep`, `hr.sep` | Border-top 1px `--ln`, margin 28px 0 |
| `.annex-block` | margin-top 40px, border-top, padding-top 16px |
| `.annex-title` | 11px bold uppercase, `--ink3`, letter-spacing 2px |
| `.page-break` | Page break when printing (`break-before: page`) |

---

## 4. Card Components (Component Card)

### 4.1 Basic cards

| Class | Describe | Border special |
|---|---|---|
| `.card` | Generic card — white background, border `--ln`, radius `--r`, padding 20px 24px | Are not |
| `.card-title` | Title card — 14px bold `--navy` | Are not |
| `.table-card` | Table wrapper — `border: 1px solid var(--th-bdr)` = blue #1565c0, radius `--r`, overflow auto, **no box-shadow** | Are not |
| `.gate-card` | Information card / legacy gate card — border `--ln`, padding 14px | `border-left: 3px solid var(--blue)` |
| `.metric-card` | KPI metric — border `--ln`, radius `--r`, padding 16px 12px, text-align center | `border-top: 3px solid var(--blue)` |
| `.callout-card` | Multi-column callout — border `--ln`, padding 14px | Are not |
| `.portal-card` | Portal landing card — border `--ln`, padding 18px | Are not |
| `.link-card` | Link card — border `--ln`, padding 16px | Are not |

### 4.2 Dedicated card (JD)

| Class | Describe |
|---|---|
| `.jd-purpose` | JD purpose block — bg `--bg2`, border-left 4px `#1d4ed8` |
| `.jd-mission` | Location mission — bg `#eef6ff`, border-left 4px `#2563eb` |
| `.auth-item` | Authority box — border `--ln`, radius 8px, width `--bg2` |
| `.backup-card` | Vice/backup — border-left 4px `#0f766e`, bg `--bg2` |
| `.comp-card` | Capacity — border `--ln`, radius 8px, white background |

### 4.3 Dedicated cards (other)

| Class | Describe |
|---|---|
| `.org-card` | Organization — border `--ln`, border-top 4px `--blue` |
| `.org-row` | Organization row — border `--ln`, padding 14px |
| `.kpi-box` | KPI box — border `--ln`, padding 12px |
| `.phase-card` | Stage — border-left 4px `--gold`, bg `#fffdf5` |
| `.lane` | Swim lane — bg `--bg2`, border `--ln` |
| `.item` | Single item — border `--ln2`, padding 10px 14px |
| `.label-box` | Printed label — border 2px dashed `--ln` |
| `.loc-box` | Location box — border 2px solid `--ink` |
| `.ship-box` | Shipping box — border `--ln`, padding 16px |

### 4.4 Metric Card (style.css lines 137–145)

`.metric-grid` + `.metric-card` is used to display KPIs / measurement indicators.

| Attributes | Value |
|---|---|
| `.metric-grid` | `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`, gap 14px |
| `.metric-card` | text-align center, padding 16px 12px, border `--ln`, `border-top: 3px solid var(--blue)` |
| `.metric-card .value` | 26px, weight 800, `--navy`, line-height 1.2 |
| `.metric-card .label` | 10px uppercase bold 700, `--ink2`, letter-spacing .5px |
| `.metric-card .sub` | 11px, `--ink3` |
| Color variants | `.metric-card.green` → border-top `--green`, `.metric-card.gold` → `--gold`, `.metric-card.red` → `--red` |

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

### 4.5 Gate Card (style.css lines 148–151)

`.gate-grid` + `.gate-card` is a legacy visual tag pattern. Can be used for dashboards or note cards, but **not for Section 6 of SOP**, where IG must present in TABLE.

| Attributes | Value |
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

## 5. Note/Callout System (Note system)

> **General rule:** All notes/callouts/boxes ONLY have `border-left: 3px solid`, NO other borders.
> Use `!important` to override inline styles. See `style.css` lines 111–119.

### 5.1 Note variants

| Class | Background | Left border 3px | Use when |
|---|---|---|---|
| `.note` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Information and instructions |
| `.note-blue` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Alias ​​of `.note` |
| `.note-soft` | `--bg2` (#f8f9fa) | `--blue` (#1565c0) | Light notes, gray background |
| `.note-green` | `#ebfbee` | `--green` (#2f9e44) | Note successful/OK |

### 5.2 Callout variants

| Class | Background | Left border 3px | Use when |
|---|---|---|---|
| `.callout` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Warning, executive order |
| `.callout-danger` | `#fff5f5` | `--red` (#e03131) | Danger / stop now |
| `.callout-info` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Additional information |
| `.callout-warn` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Yellow/orange warning |

### 5.3 Example HTML

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

### 5.4 Box variants (style.css lines 265–269)

| Class | Background | Left border 3px | Use when |
|---|---|---|---|
| `.box` | `--bg` (#ffffff) | `--blue` (#1565c0) | General box |
| `.box.core` | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | Core requirements |
| `.box.sup` | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | Support/additional |
| `.box.imp` | `#fff5f5` | `--red` (#e03131) | Important/required |
| `.box.mgt` | `#f3f0ff` | `#7950f2` (purple) | Administration / management |

> **Important:** All `.box` variants use `border: none !important; border-left: 3px solid ... !important;` — NO other borders.

```html
<!-- ✅ DO -->
<div class="box core">Yêu cầu cốt lõi ISO 9001.</div>
<div class="box imp">Bắt buộc tuân thủ — vi phạm sẽ dừng sản xuất.</div>

<!-- ❌ DON'T — thêm border tay -->
<div class="box" style="border: 1px solid #ccc;">Sai — box chỉ có border-left</div>
```

---

## 6. Badge/Tag System (Label system)

> See `style.css` lines 103–132.

### 6.1 Basic Badge & Tag

| Class | Type | Note |
|---|---|---|
| `.badge` | Uppercase, navy bg, white text, 10px, letter-spacing .8px | Main label |
| `.tag` | Border `--ln`, width `--bg3`, 11px, 600 weight | Inline label |
| `.tag.teal` | bg `#e6fcf5`, text `#087f5b`, border `#96f2d7` | Tag teal |
| `.tag.orange` | bg `#fff4e6`, text `#d9480f`, border `#ffd8a8` | Tag orange |
| `.chip` | bg `--blue-l`, text `--blue`, 11px, 600 weight | Information chip |
| `.pill`, `.status-pill` | Rounded 20px, uppercase 10px, 700 weight, border `--ln` | Status |
| `.kpi-pill` | bg `#ebfbee`, text `--green`, border `#b2f2bb`, 11px 700 | KPI pills |

### 6.2 Severity levels

| Class | Background | Text |
|---|---|---|
| `.level.l1` | `#dbe4ff` | `#364fc7` (Blue — Info) |
| `.level.l2` | `#d3f9d8` | `#2b8a3e` (Green — OK) |
| `.level.l3` | `#fff3bf` | `#e67700` (Yellow — Warning) |
| `.level.l4` | `#ffe3e3` | `#c92a2a` (Red — Critical) |

### 6.3 Requirement tags (style.css lines 128–132)

| Class | Background | Text | Border | Show | Meaning |
|---|---|---|---|---|---|
| `.req-tag.shall` | `#fff5f5` | `--red` (#e03131) | `1px solid #ffc9c9` | **RIGHT** | Mandatory requirement |
| `.req-tag.must` | `#fff5f5` | `--red` (#e03131) | `1px solid #ffc9c9` | **OBLIGATORY** | Same as shall — red alias |
| `.req-tag.should` | `#fff9db` | `#e67700` (amber) | `1px solid #ffe066` | **SHOULD** | Recommended |
| `.req-tag.may` | `#ebfbee` | `--green` (#2f9e44) | `1px solid #b2f2bb` | **MAYBE** | Options |

> **Note:** `.req-tag` base: `padding: 3px 10px`, `font-size: 10px`, `font-weight: 800`, `text-transform: uppercase`, `flex-shrink: 0`.

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

### 6.4 System of 4 different types of labels (Badge Types)

> **Rules:** Look at the badge color = know the type. DO NOT mix.

| # | Class | Color | Shape | For example | Used for |
|---|-------|-----|-----------|-------|----------|
| 1 | `.iso-clause` | 🔵 White on blue `#1565c0` | Pill (rounded 12px) | `§8.2` | Reference ISO 9001:2026 |
| 2 | `.step-tag` | ⬛ White on dark `#37474f` | Rounded square | `S1`, `S3` | SOP/WI internal step |
| 3 | `.gate-tag` | 🔷 White on teal `#00838f` | Pill (rounded 12px) | `G0`, `G4` | 8 System Gates |
| 4 | `.proc-tag` | 🟡 Dark on amber `#fff3cd` | Rounded square, border `#ffc107` | `Bước 1` | Detailed process (flowchart) |

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

> **NEVER** use `G1`, `G2`... for internal SOP step → use `S1`, `S2`...
> **NEVER** use `.iso-clause` for non-ISO references.
> Each MUST/SHOULD/CAN request in the iso-map MUST have `<span class="iso-clause">§X.Y</span>` attached.

### 6.5 Flowchart — Detailed process flow chart

> Each "Detailed Process" SOP section MUST begin with an overview flowchart.

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

| Class | Color | Used for |
|-------|-----|----------|
| `.flow-step` | White, border blue | Normal step |
| `.flow-step.active` | Amber background `#fffbeb` | Decision / approval / release step |
| `.flow-step.critical` | Red background `#fef2f2` | Inspection/measurement/hold point step |
| `.flow-arrow` | Blue `#1565c0` | Arrows follow steps |
| `.flow-num` | White circle on blue | Step number |

**Flowchart rules:**
1. Maximum number of steps: **12** (if more → divide sub-process)
2. Step name: **2-3 words** (short)
3. Description: **1 line** (optional, leave blank if name is clear enough)
4. Responsive: horizontal → vertical on mobile
5. Print: can print in full color
6. **Required** to book before the "Detailed Process" section

---

## 7. Table System (Table System)

> **V10 table design:** Blue border `#1565c0`, blue tint header, column dividers, no box-shadow.
> See `style.css` lines 152–200.

### 7.1 General rules

1. **REQUIRED** use `class="table"` on every `<table>` — if the class is missing, the table will not be properly styled
2. Always wrap tables in `.table-card` for mobile responsiveness
3. Use `.form-table` for form tables
4. Use `.docx-table` for tables from Word/docx import

### 7.2 Standard HTML structure

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

### 7.3 Detailed styling (style.css lines 152–200)

| Ingredient | Realistic style |
|---|---|
| `.table-card` | `border: 1px solid var(--th-bdr)` = blue #1565c0, `border-radius: var(--r)`, `box-shadow: none`, `overflow: auto` |
| `.table` | `width: 100%`, `border-collapse: separate`, `border-spacing: 0`, `border: 1px solid var(--th-bdr)`, `border-radius: var(--r)`, font 12.5px |
| `thead th` | bg `var(--th-bg)` = `rgba(21,101,192,0.12)`, text `--navy`, 10.5px uppercase bold 700 |
| `thead th` border | `border-bottom: 1px solid var(--th-bdr)`, `border-right: 1px solid var(--th-bdr)`, last-child: `border-right: none` |
| `tbody td` | padding 10px 14px, `border-bottom: 1px solid var(--th-bdr)`, `border-right: 1px solid var(--th-bdr)`, last-child: `border-right: none` |
| `tbody tr:last-child td` | `border-bottom: none` |
| `tbody tr:hover` | `background: rgba(21,101,192,0.04)` — very light blue tint |
| `tbody th` | bg `rgba(21,101,192,0.06)`, bold 700, `--navy`, font 11.5px, same border pattern |
| `.table.compact` | td/th padding 6px 10px, font 11.5px; head 8px 10px, font 9.5px |

> **Important note:** When the table is in `.table-card`, the inner table does NOT have its own border (`border: none`) — the outer border is taken care of by `.table-card`.

### 7.4 Specialized tables

| Class | Describe |
|---|---|
| `.form-table` | Same design as blue border, font `--th-bg`, font 12px, 11px bold |
| `.docx-table` | Same design as blue border, 12px font, used for importing Word |
| `.iso-matrix` | Font 11px, small padding 5px 8px, thead 9px |
| `.tbl` | Simple table, `border-collapse: collapse`, border `--ln`, padding 6px 10px |
| `.assessment-matrix`, `.rubric` | Font 11px, padding 5px 8px |

### 7.5 Autofit mode

Tables with attributes `data-qms-autofit="balanced"` or `data-ed-autofit="balanced"` will be forced to `table-layout: fixed` and `width: 100%`, helping to balance columns automatically.

```html
<!-- ✅ DO — autofit balanced -->
<table class="table" data-qms-autofit="balanced">...</table>

<!-- ❌ DON'T — dùng inline width cứng thay vì autofit -->
<table class="table" style="width:500px">...</table>
```

---

## 8. Process Flow

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

| Class | Describe |
|---|---|
| `.vflow` | Container flex column, gap 6px |
| `.vstep` | Step — flex, gap 12px, border `--ln2`, padding 12px 16px |
| `.vnum` | Number of steps — round 28px, bg `--navy`, white, bold |
| `.vtext` | Step content — flex 1, 13px |
| `.vbranches` | Child branch — margin-left 42px, border-left 2px `--ln` |

### 8.2 Step bands

```html
<div class="step-band">
  <span>1 Tiếp nhận</span>
  <span>2 Rà soát</span>
  <span>3 Phê duyệt</span>
</div>
```

`.step-band` — flex wrap, gap 8px; Each `<span>` has border `--ln`, rounded 999px, 11px bold.

### 8.3 Step list (counter-based)

```html
<div class="step-list">
  <div class="step-item">Nội dung bước 1</div>
  <div class="step-item">Nội dung bước 2</div>
</div>
```

`.step-list` uses CSS counter; `.step-item` has a navy round pseudo-element with automatic transmission.

---

## 9. Form & Field Components

| Class | Describe |
|---|---|
| `.field` | Form box — border `--ln`, padding 10px 12px, width `--bg` |
| `.field b` | Label — 11px uppercase `--ink3` |
| `.blank` | Blank line — border-bottom `--ink4`, min-height 20px |
| `.input` | Fake input — border `--ln`, padding 6px 10px, width `--bg2` |
| `.check`, `.chk` | Fake checkbox — 15px square, border `--ink4` |
| `.sig-box`, `.signbox`, `.signature` | Signature box — border dashed `--ln`, min-height 56px, width `--bg2` |
| `.sig-row`, `.sign-row` | Signature row — flex, gap 16px |

---

## 10. Special Components

### 10.1 ISO Map & Requirements (style.css lines 120–133)

`.iso-map` is an ISO-compliant claim display block, featuring a striking design:

| Attributes | Value |
|---|---|
| Background | `linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)` — light blue gradient |
| Border | `1px solid var(--blue)` = #1565c0 |
| Border-radius | `var(--r)` = 8px |
| `::before` pseudo | Label **"ISO 9001:2026"** — bg blue, white text, font 9px bold, absolute top -9px |
| `.iso-clause` | Green badge `--blue` bg, white text, 9px bold font — used for term codes (e.g. §7.5) |
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

> **Note:** `.req` outside `.iso-map` has `bg: var(--bg)` (white), border-left 3px blue. `.req` inside `.iso-map` has a white translucent frame `rgba(255,255,255,0.85)` and a light blue border.

### 10.2 Preface blocks

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

## 11. Print Rules (Print Rules)

> **3 `@media print`** blocks in style.css: lines 360–445, 513–535, 586–632.

### 11.1 Page size

```css
/* style.css dòng 369–373 (khối 1) + dòng 623–626 (khối 3) */
@page { margin: 15mm 12mm 18mm 12mm; }           /* khối 1 */
@page { margin: 18mm 12mm 20mm 12mm; size: A4; }  /* khối 3 — override cuối */
@page :first { margin-top: 10mm; }
html { font-size: 10pt; }
```

### 11.2 Page break control (3 combined blocks)

| Rules | Apply for |
|---|---|
| `page-break-inside: avoid` | `.req`, `.vstep`, `.legend`, `.sig-row`, `.sign-row`, `.approval-row`, `.backup-card` (block 1+2), `.callout`, `.note`, `.card`, `.iso-map`, `.preface-block`, `.jd-mission`, `.form-header`, `.badge`, `.auth-grid` (block 3) |
| `page-break-inside: auto` | `.card`, `.table-card`, `.callout`, `.note`, `.box`, `.iso-map`, `.preface-block`, `.form-sheet`, `.form-header` (block 1+2 — allow cutting if long) |
| `page-break-after: avoid` | `h1-h4`, `.h1-.h4` |
| `display: table-header-group` | `thead` — repeat table header every page |
| `display: table-footer-group` | `tfoot` |
| `orphans: 3; widows: 3` | `p`, headings |
| `tr` | `page-break-inside: avoid` |

> **Note:** Block 3 (lines 607–612) overrides block 1+2, setting `avoid` for many small elements. Final result: small elements avoid, large elements auto.

### 11.3 Print visibility

| Class | Screen | Print |
|---|---|---|
| `.no-print` | Presently | Hide (`display: none !important`) |
| `.print-disclaimer` | Hide (`display: none !important`) | Show (`display: block !important`) |
| `.no-screen` | Hide (`display: none !important`) | Presently |
| `.btn` | Presently | Hide (`display: none !important`) |

### 11.4 Print overrides

- Link: `color: var(--ink) !important; text-decoration: none !important`
- `.page`: `box-shadow: none`, `border: none`, `border-radius: 0`, `overflow: visible`
- `.page-body`: `padding: 8px 0 0`, `overflow: visible`
- `.container`: `max-width: 100%; padding: 0; margin: 0; overflow: visible`
- `.table-card`: `overflow: visible !important; border: 1px solid var(--th-bdr)` (block 1) + `border: 1px solid #999` (block 3)
- `.form-header`: `border: 1px solid #999`, `border-radius: 0`, `page-break-inside: avoid`
- Table header: `print-color-adjust: exact` — prints the correct color `var(--th-bg)`
- Note/Callout/Box/Badge: `print-color-adjust: exact` — keep border-left color
- Gate cards: gap 8px, padding 10px, font 11px (compact than screen)
- Footer `@page`: `"Bản in không kiểm soát nếu không có dấu kiểm soát — HESEM QMS"` (block 1)

---

## 12. Responsive Rules (Responsive Rules)

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

Multiple documents override grid at 960px in `<style>` builtin:

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

## 13. Buttons & Actions

| Class | Describe |
|---|---|
| `.btn` | Button — border `--ln`, bg `--bg`, text `--navy`, hover bg `--bg2` |
| `.btnrow` | Button row — flex, gap 8px |
| `kbd` | Shortcut — monospace 11px, border `--ln`, white bg |

---

## 14. Document Locale Delivery

Controlled documents must not rely on browser live translation.

Allowed model:

- Vietnamese canonical source
- explicit English artifact
- locale-aware metadata projection

Forbidden model:

- Google Translate
- hidden browser translation widgets
- DOM mutation after render as the publication mechanism

---

## 15. Class naming convention

| Prefix | Group |
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
| `gate-` | Control gates |
| `metric-` | KPI metrics |
| `kpi-` | KPI indicator |
| `badge-` | Badge variants |
| `note-` | Note variants |
| `callout-` | Callout variant |
| `step-` | Step/flow |
| `sig-`, `sign-` | Signature |

---

## 16. Print Layout (Printing — ISO compliant)

### Principle: WYSIWYG — display as it is, print as it is

| Attributes | Value (final result after 3 `@media print` blocks) |
|-----------|---------|
| `@page margin` | 18mm top, 12mm sides, 20mm bottom; size A4 (block 3 override) |
| `@page :first` | margin-top 10mm |
| `html font-size` | 10pt (smaller than screen 14px) |
| `form-header` | Keep the same grid layout, border 1px solid #999, `border-radius: 0`, `page-break-inside: avoid` |
| Table header | `print-color-adjust: exact` — prints correct color `var(--th-bg)` |
| Table border | `border: 1px solid var(--th-bdr)` — keep blue border when printing |
| Large Cards/Notes | `page-break-inside: auto` — allows cutting if longer than 1 page |
| `req`, `vstep`, `legend` | `page-break-inside: avoid` — do not cut small elements |
| Badge/Tag/Chip | `print-color-adjust: exact` — prints in correct color |
| Gate cards | More compact: gap 8px, padding 10px, font 11px |
| `.page` | Remove shadow, border, radius — print flat |
| `.table-card` | `overflow: visible !important` — not cropped when printing |

### Note the ISO on the printout:
- Page footer (block 1): `"Bản in không kiểm soát nếu không có dấu kiểm soát — HESEM QMS"` (font 7pt, #999)
- Do not add header/footer automatically from the browser (turn off in settings in)

### Required rules:
1. **DO NOT** add inline `@media print` to HTML files — all print rules are in `style.css`
2. **DO NOT** add `page-break-inside: avoid` for large elements (card, table-card, note, box, iso-map)
3. **CAN** add `page-break-before: always` before the large heading if page separation is needed
4. **DO NOT** override `overflow` in inline styles — style.css has set `overflow: visible !important` for print

---

## 17. Vflow — Visual Flowchart Steps

### HTML structure:
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
| Class | Border-left color | Vnum background | Use when |
|-------|-----------------|----------------|----------|
| `.vstep` (default) | `--blue` | `--blue` | Normal step |
| `.vstep.decision` | `--gold` | `--gold` | Decision step (pass/fail) |
| `.vstep.hold` | `--red` | `--red` | HOLD/stop step |
| `.vstep.end` | `--green` | `--green` | Complete/release step |

### Visual:
- Vertical connector line gradient `--blue` → `--gold` connects the steps
- Hover: border-left moves to `--gold`, subtle box-shadow
- Vnum: circle 32px, box-shadow, number of steps inside

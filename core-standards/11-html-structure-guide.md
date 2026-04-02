# 11 — Detailed HTML structure instructions (When creating or editing documents)

> Version: v3 | Updated: 2026-03-30
> This is a MANDATORY note to read before creating or editing any HTML file in the QMS system.

---

## 1. Overall structure of HTML file

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

**Page shell lock rule:**
- `.page-body` must open immediately after `.page` and must contain the entire visible content of the document, not just `form-header`.
- Do not close `.page-body` immediately after `form-header`. If closed prematurely, blocks such as `note`, `h1`, `section`, `table-card`, `annex-block`, `data-operating-rule` will fall outside the standard padding area and cause page overflow or broken layout.
- `print-disclaimer` can be placed after `</div></div></div>` of `container > page > page-body`, but any block visible to the user must be inside `.page-body`.
- `print-disclaimer` cannot be a direct child of `.container`. If `container` is still open until the disclaimer, it is still considered an error shell and must close `container` before the disclaimer.
- The correct order at the end of the file is: `...</nội dung> </div><!-- page-body --> </div><!-- page --> </div><!-- container --> [print-disclaimer] [script] </body>`.

---

## 2. Details of each part

### 2.1 `<head>` — Meta and CSS

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

**Rule for calculating relative path:**

| File location | `{{RELATIVE_PATH}}` |
|-------------|---------------------|
| `01-QMS-Portal/` | `..` |
| `02-Tai-Lieu-He-Thong/01-Quality-Manual/` | `../..` |
| `03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/` | `../../..` |
| `03-Tai-Lieu-Van-Hanh/02-WIs/01-WI-100/` | `../../..` |
| `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/10-ANNEX-100-xxx/` | `../../../..` |
| `10-Training-Academy/01-Competency/02-Levels/01-C01/` | `../../../..` |

### 2.2 FORM HEADER — Logo on the left, title + caption on the right, meta on the bottom row

```html
<div class="form-header">
  <div class="fh-left">
    <a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">
      <img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/>
    </a>
  </div>
  <div class="title">
    <strong class="doc-name">{{TITLE}}</strong>
    <span class="sub-vn">{{SUBTITLE}}</span>
  </div>
  <div class="meta">
    <div class="row"><span><b>Mã:</b></span><span class="doc-code">{{CODE}}</span></div>
    <div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
    <div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
    <div class="row"><span><b>Chủ sở hữu:</b></span><span>{{OWNER_ROLE_HTML}}</span></div>
    <div class="row"><span><b>Phê duyệt:</b></span><span>{{APPROVER_ROLE_HTML}}</span></div>
  </div>
</div>
```

**Note:**
- The title block on the header only displays `doc-name` and `sub-vn`; The document code displays in the meta row.
- `doc-name` is always English SSOT title according to filename/path controlled; Do not translate this title into Vietnamese and do not include the document code in the same display node.
- Portal/catalog/runtime cannot combine code and name into one text node. If the runtime metadata is not clean, you must re-read `doc-name` from the published header and `doc-code` from the clean meta/header hook.
- `fh-company` is the legacy node; The new template does not render this node and the shared CSS must be completely hidden if the old file is retained.
- Meta labels display in Vietnamese: `Mã`, `Phiên bản`, `Ngày hiệu lực`, `Chủ sở hữu`, `Phê duyệt`
- Rows `Chủ sở hữu` and `Phê duyệt` must use chip links to the corresponding JD or department handbook; Do not leave plain text as `QA Manager`, `Engineering`, `Tổng Giám Đốc`.
- This header rule applies to all release documents and online/runtime forms in `01-QMS-Portal`.
- For unpublished documents, `Version` in the header is always `V0`
- **Orange border** header: 1px piece at the beginning of the meta row
- **DO NOT** change the header structure — every file MUST be the same
- `{{OWNER_ROLE_HTML}}` and `{{APPROVER_ROLE_HTML}}` must be chip roles directly linked to JD
- Header does not use long text like `QA Manager / Supply Chain Manager`; must use a concise role code like `QA / SCM`

### 2.2a JD Header and Identity Rows

With JD:
- `strong` in the title block must follow the `JD-<ROLECODE> — <Job title English>` standard.
- `sub-vn` uses standard Vietnamese for the location.
- Row `Mã` in the header must match `JD-<ROLECODE>`.
- In the location information panel:
  - `Mã vị trí` = `JD-<ROLECODE>`
  - `Mã vai trò dùng trong SOP/RACI` = JD-linked chip role
  - `Mũ quản trị có thể gắn` only appears when the role actually has permission
  - `Chức danh theo tài liệu` keeps plain English title, does not render chip
- JDs with fragment structures of type missing `<html>`, `<head>` or `<body>` are not allowed.

### 2.3 ISO MAP — Applicable standards

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

**ISO Map Graphics:**
- Background: light blue gradient (`linear-gradient(135deg, #f0f7ff, #e8f4fd)`)
- Border: 1px solid blue (`var(--blue)`)
- Badge "ISO 9001:2026" automatically displays above (CSS `::before`)
- The `.req` boxes inside have a translucent white background (distinguished from the gradient background).

**Badges require ISO:**

| Badges | Class | Color | When to use |
|-------|-------|-----|--------------|
| RIGHT | `req-tag shall` | Red | ISO SHALL requirement — violation = nonconformity |
| OBLIGATORY | `req-tag must` | Red | Hard internal request — violation = stop |
| SHOULD | `req-tag should` | Yellow | SHOULD recommendation — should be followed |
| MAYBE | `req-tag may` | Green | SEWING options — flexible |

**ISO badge terms:**
```html
<span class="iso-clause">§7.5</span>
```
Displays a small green badge with the ISO 9001:2026 clause number.

### 2.4 PREFACE BLOCK — Executive order

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

### 2.5 Gate Mapping Note — Location in 8-gate system

**REQUIRED** on EVERY document — placed before section 1 or immediately after preface block:

```html
<div class="note-blue" style="margin:12px 0">
  <b>🗺️ Vị trí trong hệ thống 8 cổng (G0→G7):</b>
  SOP/WI/ANNEX này vận hành <b>[vị trí cụ thể]</b>. [mô tả ngắn].
  <br>→ Xem <a href="{{RELATIVE_PATH}}/03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html">ANNEX-502</a> cross-reference.
</div>
```

### 2.6 The boundary between format standardization and content upgrading

Core-standard **allows** central standardization:

- header, preface, toc, table-card, field-grid, callout-grid,
- flowchart color palette, `proc-num`, `flow-num`, arrow, CSS fallback,
- table frames of Section 6 and Section 8,
- Technical QA checklist and instructional comments in the template.

Core-standard **deprecated** to justify mass content updates:

- The content of `Section 1, 2, 3, 4, 5, 8` must be deduced from `Section 6` and `Section 7` of **each SOP**,
- Step number, step name, IG name, KPI, role authority, exception scenarios must be researched according to **each SOP**,
- Do not let editorial notes, benchmark notes, notes different from the old version or notes on document writing rules appear in the SOP body.

---

## 3. Rules for graphic components

### 3.1 Table — MUST have class="table"

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

**⚠ NEVER:**
- Create `<table>` without `class="table"` → there will be no border
- Redeclar `.table thead th` in inline `<style>` → override global
- Use `border="1"` attribute on `<table>` → use CSS class instead
- Use inline style `style="border:..."` on `<td>` → use CSS class

**Standard table graphics:**
- Outer border: 1px solid #1565c0 (dark blue)
- Header: background rgba(21,101,192,0.12) (light blue)
- Row dividers: border-bottom 1px solid #1565c0
- Column dividers: border-right 1px solid #1565c0 (last column: none)
- Hover: rgba(21,101,192,0.04) light highlight
- Round corners: var(--r) = 10px (on table-card wrapper)
- No box-shadow

### 3.2 Note / Callout / Box — Only 3px border-left

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

**Rules:**
- All note/callout/box: **ONLY** have 3px border-left, **NOT** have top/bottom/right border
- Border-left width: **3px** uniform (not 1px, 2px, 4px, 5px)
- Background: light color corresponding to border-left color
- DO NOT use inline style `style="border-left:..."` → use class

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

### 3.4 Section 6 — Internal Gates — TABLE format

**Section 6 structure rules:**
- Internal Gate uses the symbol **IG** (IG1, IG2, IG3...) — DO NOT use G (G is system gate)
- Number of IGs **unlimited** — depending on specific process (3, 5, 6, 8...)
- Format: **TABLE** 5 columns (DO NOT use gate-card/grid)
- Each IG MUST have: Description, Chair, Required Breakpoints, Measurable KPIs
- The IG number **does NOT need to** match the Section 7 step number
- After the table: metric-card grid displays KPIs visually (optional)
- When changing content, only change the part between `p6` and `p7`
- Content must follow old documents + research according to `13-sop-research-redraft-method.md`

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

**⚠ NEVER:**
- Use gate-card/gate-grid for IG → use TABLE
- Fixed limit of 5 IG → depending on the process
- Leave the Host/Stop/KPI column blank → each IG MUST be complete
- Set the IG badge without centering → use `class="ig-center"` on `<td>`

### 3.5 Section 7 — Detailed process — FLOWCHART + Balloon headings

**Section 7 structure rules:**
- **Part 1:** Overview flowchart (visual process flow)
- **Part 2:** Step-by-step details with **proc-num balloon** before the heading
- Number of steps **unlimited** — depending on the process (5, 8, 10, 12...)
- The flowchart MUST match the exact number of h3 steps below
- Section 7 step numbers are **NOT limited** by Section 6 IG numbers
- Each balloon step has **rotating colors** (rotating colors) — NOT a fixed color
- The bubble color in the flowchart must match the `proc-num` color of the corresponding step; regardless of whether step has class `active/critical` or not
- Global CSS MUST have a fallback palette so that old files or handwritten files do not fall back to a single color
- New flowcharts created by script MUST prioritize inline style in `flow-step`, `flow-num`, `flow-arrow`; CSS fallback is only to protect old or handwritten files
- `.active` and `.critical` only support visual emphasis; Do not override the color logic according to the number of bubble steps
- The Fallback palette must properly account for `.flow-arrow` intervening between `.flow-step`; The selector must be based on the actual direct child positions of `.flow-step`, not assuming all children are steps
- When changing content, only change the part between `p7` and `p8`
- The number of steps must be determined according to the delivery logic and risk window of that SOP, not according to a beautiful template

**Part 1: Flowchart**
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

**Rotating color palette (10 colors):**
| Step | Gradient | Nature |
|------|----------|-----------|
| 1 | `#1565c0, #1976d2` | Blue |
| 2 | `#059669, #10b981` | Green |
| 3 | `#d97706, #f59e0b` | Orange yellow |
| 4 | `#7c3aed, #8b5cf6` | Purple |
| 5 | `#dc2626, #ef4444` | Red |
| 6 | `#0891b2, #06b6d4` | Teal |
| 7 | `#c2410c, #ea580c` | Dark orange |
| 8 | `#4338ca, #6366f1` | Indigo |
| 9 | `#15803d, #22c55e` | Dark green |
| 10 | `#be185d, #ec4899` | Pink |

**Part 2: Step-by-step details**
```html
<h3><span class="proc-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</span> Tên bước chi tiết</h3>
<p>Mô tả chi tiết hoạt động...</p>
<ul><li>Bullet points cụ thể</li></ul>
<div class="callout"><b>Điểm dừng bắt buộc (IG1):</b> KHÔNG cho phép... nếu chưa...</div>
<p><b>Bàn giao:</b> Ai bàn giao gì cho ai.</p>
```

**⚠ IMPORTANT RULES:**
- Flowchart MUST have BEFORE detailed h3s
- Number of steps in flowchart = Number of h3 headings (must NOT be skewed)
- Balloon color h3 = Corresponding color in the flowchart
- When updating content → recheck numbering + flowchart
- Step `.active` (yellow) = decision/approval
- Step `.critical` (red) = test/measure/hold point

### 3.6 Four types of Badges/Buttons — Visual distinction

| Badges | CSS Class | Symbol | Color | Used for |
|-------|-----------|---------|-----|----------|
| **ISO Clause** | `.iso-clause` | §7.5, §8.2 | Dark blue (#1565c0) white background | Reference ISO 9001:2026 |
| **ISO Req** | `.req-tag.shall` / `.req-tag.should` / `.req-tag.may` | MUST, SHOULD, COULD | Red / Yellow / Green | Required ISO level |
| **Internal Gate** | `.step-tag` | IG1, IG2... | Navy gradient pills | Internal control port |
| **Procedure Step** | `.proc-num` | ①②③... | Rotating 10 colors | Detailed process steps |
| **System Gate** | `.gate-tag` | G0, G1...G7 | Teal (#00838f) | 8 system ports |

```html
<!-- ISO Clause -->   <span class="iso-clause">§7.5</span>
<!-- ISO Req -->       <span class="req-tag shall">PHẢI</span>
<!-- Internal Gate --> <span class="step-tag">IG1</span>
<!-- Proc Step -->     <span class="proc-num" style="background:linear-gradient(...)">1</span>
<!-- System Gate -->   <span class="gate-tag">G0</span>
```

---

## 4. "NEVER" list when editing HTML

| # | NEVER | Reason |
|---|--------------|-------|
| 1 | Redeclar `.table`, `.note`, `.callout`, `.box`, `.req`, `.iso-map` in inline `<style>` | Overwrite global CSS → lose sync |
| 2 | Create `<table>` without `class="table"` | Border/header CSS is not accepted |
| 3 | Use `border="1"` attribute on `<table>` | Use CSS class instead |
| 4 | Use inline `style="border-left:Xpx"` on note/box | Use class (global CSS set 3px) |
| 5 | Change form-header structure | All files MUST be the same |
| 6 | Translate file names, folders, paths into Vietnamese | Break system links |
| 7 | Translate metadata labels (Code, Version, Owner...) | Keep it in English |
| 8 | Translate SharePoint List names, Column names, Site names | System proper noun |
| 9 | Translating roles (Team Leader, Foreman, Inspector...) | Unified proper noun |
| 10 | Use gate-card/gate-grid for Internal Gates | IG MUST use a 5-column TABLE |
| 11 | Fixed limit of 5 IG | The number of IG depends on the process, there is no limit |
| 12 | Force IG number = detailed step number | IG and detail step are two different layers |
| 13 | Creating a flowchart that doesn't match the number of steps h3 | Flowchart steps = h3 headings |
| 14 | Use a fixed color for proc-num balloons | Use 10 rotating colors |
| 15 | Leave the Lead/Stop/KPI column blank in the IG table | Each IG MUST be complete |
| 16 | Batch-upgrade the content `Section 1/2/3/4/5/8` with a set of statements common to many SOPs | Leading to wrong boundaries, wrong roles, wrong exceptions and loss of practicality |
| 17 | Retain editorial guidance notes, benchmark notes or other notes from the old version in the SOP body | Draft documents will be dirty, out of context and difficult to release V0 |
| 18 | Use bullet list for Section 8 when the SOP has multiple hold/restart/revalidation/change branches | Loss of owner, loss of person to remove hold and difficulty in auditing |
| 19 | `metric-grid` is required for all SOPs even if there is no need for a separate KPI summary | Create a decorative section, duplicate KPIs already in Section 6 |
| 20 | Write Section 3 using half-English, half-Vietnamese terms or parentheses | Obfuscating operational meanings and creating errors in terminology within the SOP body |

---

## 5. Checklist before committing HTML files

### 5.1 General structure
- [ ] File has `<link href="...assets/style.css" rel="stylesheet"/>` ?
- [ ] `<table>` has `class="table"` ?
- [ ] IG table has `<colgroup>` with col-ig, col-desc, col-owner, col-hold, col-kpi ?
- [ ] There is no redeclaration of `.table`, `.note`, `.callout` in inline `<style>` ?
- [ ] Form header structure is correct (logo + title in the same row)?
- [ ] CSS variables use `var(--...)` instead of hard-coding colors?
- [ ] Relative path to assets/ correct?

### 5.2 ISO map (First section)
- [ ] ISO map has badge MUST/SHOULD/CAN (`req-tag`) ?
- [ ] Does each request have a `iso-clause` badge with specific terms (§X.Y) ?
- [ ] ISO version = 9001:**2026** (NOT 2015) ?

### 5.3 Sections 1, 2, 3, 4, 5, 8
- [ ] Section 1 clearly states the risks / errors / decisions / outputs that this SOP is blocking, not a general opening sentence?
- [ ] Section 2 follows the correct first step, last step and real handoff to another SOP/WI?
- [ ] Does Section 2 state boundary restart / re-entry / transfer if Section 7 has that branch?
- [ ] Section 3 only keeps the terms really needed to understand gate/step?
- [ ] The term name follows the form `English term (thuật ngữ tiếng Việt chuẩn)` and the Vietnamese version of the SOP body is preferred?
- [ ] Section 4 covers all IG owners and roles with HOLD / RELEASE / RESTART / REVALIDATE / APPROVE EXCEPTION permissions?
- [ ] Section 5 map is returned before IG1/B1, after the last gate/last step and trigger restart/change/escalation?
- [ ] Section 5 does not use ambiguous cells of type `khi cần`, `theo yêu cầu`, `tài liệu liên quan` ?
- [ ] Section 8 uses a 5-column table by default; If you use a bullet list, it proves that this SOP is narrow governance and does not lose the owner / deholder / profile?
- [ ] Each scenario in Section 8 has a chairperson + person to unhold / approve further + documents ?
- [ ] Body SOP no longer has editorial notes, benchmark notes, notes different from the old version, or writing method notes?

### 5.4 Section 6 — Internal Gates
- [ ] Use 5-column TABLE (DO NOT use gate-card) ?
- [ ] IG badge uses `step-tag` + `ig-center` class ?
- [ ] Each IG has: Description, Chair, Breakpoint, KPI (NOT blank) ?
- [ ] Number of IGs that comply with the process (NO fixed limit of 5) ?
- [ ] IG number is not forced to match the Section 7 step number?

### 5.5 Section 7 — Detailed procedures
- [ ] Is there flowchart (`<div class="flowchart">`) AFTER heading h2 ?
- [ ] Number of flowchart steps = Number of h3 headings below?
- [ ] Each h3 has `proc-num` balloon with rotating color ?
- [ ] With automatically generated SOP: does each `flow-num` in the flowchart have an inline style?
- [ ] Flowchart steps have `.active` (decision) and `.critical` (check) ?
- [ ] Detailed step numbers are separated by operating logic, not by IG number?
- [ ] Detailed step content: explain WHO/WHAT/WHEN/HOW ?
- [ ] Is there a "Force stop" callout at critical steps?
- [ ] Is there a "Handover" at the end of each step?
- [ ] Checked that `p6`, `p7`, `p8` were not mistakenly deleted when replacing the section?

### 5.6 When updating content
- [ ] Check the numbering IG1→IGn (is it wrong)?
- [ ] Check flowchart matches h3 headings (add/delete step → update flowchart) ?
- [ ] Check that the procedure content is not pushed to another section?
- [ ] Check spelling errors (especially the first letter of Vietnamese words)?
- [ ] Check if the body no longer has editing notes like `Bổ sung theo note`, `Liên kết note`, `Quy tắc dùng thuật ngữ`, `so với bản trước` ?

---

## 6. 8-port system (G0→G7) — Quick reference

```
G0 Contract → G1 Engineering ‖ G2 IQC → G3 Setup → G4 FAI → G5 IPQC → G6 Final QC → G7 Ship
```

| Gate | Name | Header color | Main SOP |
|------|-----|-----------|-----------|
| G0 | Contract | #4CAF50 (green) | SOP-201 |
| G1 | Engineering | #1565C0 (navy) | SOP-303 |
| G2 | IQC | #795548 (brown) | WI-701, SOP-402 |
| G3 | Setup | #2196F3 (green) | SOP-504 |
| G4 | FAI | #FF9800 (orange) | SOP-302 |
| G5 | IPQC | #9C27B0 (purple) | SOP-502, SOP-604 |
| G6 | Final QC | #00BCD4 (teal) | SOP-605 |
| G7 | Ship | #F44336 (red) | SOP-605 |

**Note:** G1 and G2 run **PARALLEL**. Both MUST be completed before G3.

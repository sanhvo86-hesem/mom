# CSS Classes Reference — HESEM QMS Design System

> The list contains all the CSS classes in `assets/style.css` and the additional classes that are available in the `<style>` page.
> Latest update: 2026-03-24 | style.css v7

---

## 1. Layout

### Containers & Pages

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.container` | Outside wrapper, max-width 920px, margin auto, padding 24px 20px | `<div class="container">...</div>` |
| `.page` | Main page, main page, border-radius 12px, box-shadow | `<div class="page">...</div>` |
| `.page.landscape` | The max-width bar should be 1160px for horizontal width | `<div class="page landscape">...</div>` |
| `.page-body` | Padding content 32px 40px 48px, overflow-x hidden | `<div class="page-body">...</div>` |
| `.doc-content` | Wrapper says data, reset padding | `<div class="doc-content" id="docContent">...</div>` |
| `.form-sheet` | Wrapper says form/data content, reset padding | `<div class="form-sheet">...</div>` |
| `.form-content` | Padding 14px 0 for form content | `<div class="form-content">...</div>` |
| `.docx-content` | Reset padding, line-height 1.7 for docx content | `<div class="docx-content">...</div>` |
| `.section` | Open section, margin 20px 0 | `<div class="section">...</div>` |
| `.annex-block` | Uninstall annex, margin-top 40px, border-top | `<div class="annex-block">...</div>` |
| `.page-break` | Break-before: page | `<div class="page-break"></div>` |

### Grid Classes

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.grid-2` | Grid 2 cots (1fr 1fr or auto-fit minmax(260px,1fr)) | `<div class="grid-2"><div>A</div><div>B</div></div>` |
| `.grid-3` | Grid 3 cots (auto-fit minmax(220px,1fr)) | `<div class="grid-3"><div>A</div><div>B</div><div>C</div></div>` |
| `.form-grid` | Grid form 2 cots, gap 10px | `<div class="form-grid"><div>...</div><div>...</div></div>` |
| `.field-grid` | Grid field 2 cots, gap 10px 16px | `<div class="field-grid"><div class="field">...</div></div>` |
| `.toc-grid` | Grid at times, auto-fit minmax(220px,1fr) | `<div class="toc-grid"><a href="#p1">Muc 1</a></div>` |
| `.metric-grid` | Grid KPI, auto-fit minmax(180-210px,1fr) | `<div class="metric-grid"><div class="metric-card">...</div></div>` |
| `.gate-grid` | Grid curves, auto-fit minmax(220px,1fr) | `<div class="gate-grid"><div class="gate-card">...</div></div>` |
| `.callout-grid` | Grid callout, auto-fit minmax(260px,1fr) | `<div class="callout-grid"><div class="callout-card">...</div></div>` |
| `.auth-grid` | Grid Quyen Han JD, 2 cots | `<div class="auth-grid"><div class="auth-item">...</div></div>` |
| `.comp-grid` | Grid capsule JD, 2 cots | `<div class="comp-grid"><div class="comp-card">...</div></div>` |
| `.portal-grid` | Grid portal, auto-fit minmax(220px,1fr) | `<div class="portal-grid"><div class="portal-card">...</div></div>` |
| `.ship-grid` | Grid shipping, 1fr 1fr | `<div class="ship-grid"><div>...</div><div>...</div></div>` |
| `.label-grid` | Grid face, 1fr 1fr, gap 6px 12px | `<div class="label-grid"><div>...</div></div>` |
| `.kpi-grid` | Grid KPI box, 1fr 1fr | `<div class="kpi-grid"><div class="kpi-box">...</div></div>` |
| `.notice-grid` | Grid thong bao, auto-fit minmax(220px,1fr) | `<div class="notice-grid"><div class="notice-item">...</div></div>` |
| `.link-grid` | Grid connection, auto-fit minmax(240px,1fr) | `<div class="link-grid"><div class="link-card">...</div></div>` |
| `.two-col` | Grid 2 cots (WI), gap 16px | `<div class="two-col"><div>A</div><div>B</div></div>` |
| `.three-col` | Grid 3 cots (WI), gap 16px | `<div class="three-col">...</div>` |
| `.matrix` | Grid 2 cots (WI), gap 12px | `<div class="matrix"><div class="card">...</div></div>` |

### Separators

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.sep` | Horizontal line, border-top 1px, margin 28px 0 | `<hr class="sep"/>` |
| `.annex-title` | Title de annex, 11px bold uppercase, ink3 | `<div class="annex-title">PHU LUC A</div>` |

---

## 2. Form Header

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.form-header` | Wrapper header, border, radius 12px | `<div class="form-header">...</div>` |
| `.fh-left` | O header bezel, no tai lieu logo | `<div class="fh-left">...</div>` |
| `.brand-logo` | Logo link, no img | `<a class="brand-logo" href="..."><img .../></a>` |
| `.brand-logo img` | Logo, width 140px, object-fit contain | (from dong) |
| `.fh-company` | Legacy node; If the file is too small, the CSS must be completely safe | `<div class="fh-company">...</div>` |
| `.form-header .title` | The first step to complete must be logo, title + title | `<div class="title"><strong>...</strong></div>` |
| `.form-header .title strong` | Main theme, 17px bold navy | (from dong) |
| `.form-header .title .sub-vn` | Phu de Vietnamese, 12.5px ink2 | `<span class="sub-vn">...</span>` |
| `.form-header .title .muted` | Write a letter, 11px ink3 | `<span class="muted">...</span>` |
| `.form-header .meta` | Hang the meta (Code, Version...), enter the title and have an orange member 1px above | `<div class="meta">...</div>` |
| `.form-header .meta .row` | O meta, flex, padding 6px 16px, border-right | `<div class="row"><span><b>Code:</b></span><span>SOP-101</span></div>` |

---

## 3. Typography

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.h1`, `h1.h1`, `.doc-title.h1` | Heading 1: 20px bold navy, border-bottom 2px navy | `<h1 class="h1">Tieu de</h1>` |
| `.h2`, `h2.h2` | Heading 2: 14px bold navy, border-bottom 1px ln | `<h2 class="h2" id="p1">1. Muc dich</h2>` |
| `.h3`, `h3.h3` | Heading 3: 13px bold ink | `<h3 class="h3">Tieu de phu</h3>` |
| `.lead` | Doan initial, 14px ink2, line-height 1.7 | `<p class="lead">Mo ta ngan.</p>` |
| `.muted` | Text, 12px ink3 | `<span class="muted">Ghi chu</span>` |
| `.small` | Grape text, 12px | `<span class="small">Chi tiet</span>` |
| `.small.muted` | Text is very small, 11px ink4 | `<span class="small muted">...</span>` |
| `.big` | Text can, 16px bold | `<span class="big">123</span>` |
| `.mono`, `.code` | Font monospace, 12px, bg bg3 | `<span class="code">SOP-101</span>` |
| `.center` | Help | `<p class="center">...</p>` |
| `.mini-note` | Note grapes, 12px ink2, line-height 1.6 | `<p class="mini-note">Luu y nho.</p>` |
| `.subtle` | Text, ink2 12px | `<span class="subtle">...</span>` |
| `.muted-note` | Write a letter, 12px ink2 | `<p class="muted-note">...</p>` |
| `.inline-note` | Inline text, 12px ink2, margin-top 8px | `<p class="inline-note">Quy uoc: R = ...</p>` |
| `.footer-note` | Write the last page, 12px ink2, border-top | `<div class="footer-note">...</div>` |
| `.small-note` | Note grapes, 12px ink2 | `<p class="small-note">...</p>` |

---

## 4. Cards

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.card` | General card, page frame, border ln, radius r, padding 20px 24px | `<div class="card">...</div>` |
| `.card-title` | Title of card, 14px bold navy | `<div class="card-title">Tieu de</div>` |
| `.table-card` | Wrapper state responsive, border, radius, overflow-x auto | `<div class="table-card"><table class="table">...</table></div>` |
| `.table-block` | Table-card format | `<div class="table-block">...</div>` |
| `.table-wrap` | Table-card format | `<div class="table-wrap">...</div>` |
| `.gate-card` | Curved edge, border-left 4px blue | `<div class="gate-card"><h3>G1</h3><p>...</p></div>` |
| `.metric-card` | KPI metric, border ln, padding 14px | `<div class="metric-card"><div class="value">95%</div><div class="label">OTD</div></div>` |
| `.metric-card .value` | KPI value, 18-20px bold navy | (from dong) |
| `.metric-card .label` | KPI label, 11px uppercase ink2/ink3 | (from dong) |
| `.callout-card` | Callout card has many columns, large border, 14px padding | `<div class="callout-card"><h3>Co bao phu</h3><ul>...</ul></div>` |
| `.portal-card` | Card portal, border ln, padding 18px | `<div class="portal-card"><h3>Module</h3></div>` |
| `.link-card` | Link card, large border, padding 16px | `<div class="link-card"><h3>...</h3><p>...</p></div>` |
| `.jd-purpose` | JD translation, border-left 4px #1d4ed8, bg bg2 | `<div class="jd-purpose"><p><b>Muc dich:</b> ...</p></div>` |
| `.jd-mission` | Su menh JD, bg #eef6ff, border-left 4px #2563eb | `<div class="jd-mission"><p>Su menh ...</p></div>` |
| `.auth-item` | O border, border ln, radius 8px, bg bg2 | `<div class="auth-item">...</div>` |
| `.backup-card` | Pho/backup, border-left 4px #0f766e, bg bg2 | `<div class="backup-card">...</div>` |
| `.comp-card` | Full size, large border, radius 8px, page width | `<div class="comp-card"><p><b>Kien thuc</b></p><ul>...</ul></div>` |
| `.org-card` | To prepare the card, border-top 4px blue | `<div class="org-card"><h3>Giam doc</h3></div>` |
| `.org-row` | Hang big, border large, padding 14px | `<div class="org-row"><h3>Nhom A</h3><p>...</p></div>` |
| `.kpi-box` | KPI box, border ln, padding 12px | `<div class="kpi-box"><b>KPI</b><span>95%</span></div>` |
| `.phase-card` | Giai doan, border-left 4px gold, bg #fffdf5 | `<div class="phase-card"><h3>Giai doan 1</h3></div>` |
| `.lane` | Swim lane, bg bg2, border ln | `<div class="lane">...</div>` |
| `.item` | Item don, border ln2, padding 10px 14px | `<div class="item">...</div>` |
| `.label-box` | Printed text, border 2px dashed ln | `<div class="label-box">...</div>` |
| `.loc-box` | Location box, border 2px solid ink | `<div class="loc-box"><div class="loc-code">A1-R2-S3</div></div>` |
| `.loc-code` | Ma vi tri, 22px bold mono | (from dong) |
| `.ship-box` | Shipping box, border ln, padding 16px | `<div class="ship-box">...</div>` |
| `.quiz-card` | Testing card (Training), border ln, padding 16px | `<div class="quiz-card"><h3>Cau 1</h3></div>` |
| `.figure-box` | Image frame/size, border ln, padding 12px | `<div class="figure-box">...</div>` |
| `.keyline` | Frame dashed nhe, border dashed th-bdr, bg #fcfcfd | `<div class="keyline"><strong>Nhac nhanh:</strong> ...</div>` |
| `.source-box` | Source frame, border dashed ln, padding 12px | `<div class="source-box">...</div>` |
| `.boxed-list` | List frame, border ln, padding 14px | `<div class="boxed-list"><ul>...</ul></div>` |
| `.notice-item` | O thong, border-left 4px blue, font 12px | `<div class="notice-item">...</div>` |

---

## 5. Notes & Callouts

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.note` | Write blue, bg blue-l, border-left 2px blue | `<div class="note"><strong>LUU Y</strong><br/>Noi dung.</div>` |
| `.callout` | Canh bao vang, bg gold-l, border-left 2px gold | `<div class="callout"><div class="card-title">Lenh dieu hanh</div><p>...</p></div>` |
| `.note-soft` | Canh bao wine nhe, border-left 4px #eab308, bg #fffbeb | `<div class="note-soft">Canh bao nhe.</div>` |
| `.note-blue` | Green message, border-left 4px blue, border blue-l | `<div class="note-blue">Thong tin bo sung.</div>` |
| `.role-note` | Write shoulder circle, border-left 4px #94a3b8, bg #f8fafc | `<div class="role-note">Vai tro lien quan: ...</div>` |
| `.callout-danger` | Danger, border-left 4px #c92a2a, bg #fff5f5 | `<div class="callout-danger"><strong>DUNG NGAY</strong></div>` |
| `.callout-info` | Information, border-left 4px #1971c2, border #eef7ff | `<div class="callout-info">Thong tin them.</div>` |
| `.callout-warn` | Canh bao orange, border-left 4px #e67700, bg #fff9db | `<div class="callout-warn">Can than.</div>` |
| `.box` | General box, border ln, radius r, padding 12px 16px | `<div class="box">Noi dung.</div>` |
| `.box.core` | Love the problem, bg blue-l, border-left 2px blue | `<div class="box core">Yeu cau bat buoc.</div>` |
| `.box.imp` | Important, bg #fff5f5, border-left 2px red | `<div class="box imp">QUAN TRONG.</div>` |
| `.box.sup` | Ho tro, bg gold-l, border-left 2px gold | `<div class="box sup">Bo sung.</div>` |
| `.box.mgt` | Manager, bg #f3f0ff, border-left 2px #7950f2 | `<div class="box mgt">Quan tri.</div>` |

---

## 6. Badges & Tags

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.badge` | Main badge, navy bg, text page, 10px uppercase | `<span class="badge">SOP</span>` |
| `.tag` | Tag inline, border ln, bg bg3, 11px | `<span class="tag">Tag</span>` |
| `.tag.teal` | Green tag | `<span class="tag teal">Active</span>` |
| `.tag.orange` | Tag orange | `<span class="tag orange">Pending</span>` |
| `.chip` | Info chip, bg blue-l, text blue, 11px | `<span class="chip">Cong kiem soat</span>` |
| `.chiplist` | Hang chip, flex wrap gap 6px | `<div class="chiplist"><span class="chip">A</span></div>` |
| `.pill`, `.status-pill` | Thai page, rounded 20px, uppercase 10px | `<span class="pill">ACTIVE</span>` |
| `.kpi-pill` | KPI pill, bg #ebfbee, text green | `<span class="kpi-pill">98.5%</span>` |
| `.inline-tag` | Grape inline tag, rounded 999px, 10px bold | `<span class="inline-tag">V2</span>` |
| `.badge-soft` | Badge meme, rounded 999px, bg blue-l, text navy | `<span class="badge-soft">SOP lien quan</span>` |
| `.badge-red` | Badge by, bg #fff5f5, text #c92a2a | `<span class="badge-red">Critical</span>` |
| `.badge-amber` | Vang badge, bg #fff9db, text #e67700 | `<span class="badge-amber">Warning</span>` |
| `.badge-green` | Blue badge, bg #ebfbee, text #2b8a3e | `<span class="badge-green">OK</span>` |
| `.badge-blue` | Duong blue badge, text #e7f5ff, text #1971c2 | `<span class="badge-blue">Info</span>` |
| `.badge-navy` | Badge navy, bg #eef2ff, text #243b6b | `<span class="badge-navy">System</span>` |
| `.level` | Base class severity level, 11px bold | (use with .l1-.l4) |
| `.level.l1` | Info (green), bg #dbe4ff, text #364fc7 | `<span class="level l1">Info</span>` |
| `.level.l2` | OK (blue), text #d3f9d8, text #2b8a3e | `<span class="level l2">OK</span>` |
| `.level.l3` | Warning (echo), text #fff3bf, text #e67700 | `<span class="level l3">Warning</span>` |
| `.level.l4` | Critical (by), bg #ffe3e3, text #c92a2a | `<span class="level l4">Critical</span>` |
| `.req-tag` | Base class requirement tag, 10px bold uppercase | (use with .shall/.should/.may) |
| `.req-tag.shall` | Bat buoc (do), bg #fff5f5, text red | `<span class="req-tag shall">PHAI</span>` |
| `.req-tag.should` | Recommendation (orange), text #fff9db, text #e67700 | `<span class="req-tag should">NEN</span>` |
| `.req-tag.may` | Select (green), bg #ebfbee, text green | `<span class="req-tag may">CO THE</span>` |
| `.iso-ref` | Reference ISO, bg blue-l, text blue, 10px | `<span class="iso-ref">7.5.1</span>` |
| `.raci-badge` | RACI Badge, rounded 999px, 11px bold | `<span class="raci-badge raci-r">R</span>` |
| `.raci-r` | Responsible (green), bg #e0f2fe | (from dong) |
| `.raci-a` | Accountable (orange), bg #fff3e0 | (from dong) |
| `.raci-c` | Consulted (heart), bg #f3e8ff | (from dong) |
| `.raci-i` | Informed (blue), bg #ecfdf5 | (from dong) |
| `.raci-R` | Responsible variant, bg #e7f5ff | (from dong) |
| `.raci-A` | Accountable variant, bg #fff5f5 | (from dong) |
| `.raci-C` | Consulted variant, bg #fff9db | (from dong) |
| `.raci-I` | Informed variant, bg #ebfbee | (from dong) |
| `.raci-cell` | O RACI in state, background image, 34px wide | `<td class="raci-cell">R</td>` |
| `.role-code` | Ghost role, mono 11px, bg bg3 | `<span class="role-code">QA-MGR</span>` |
| `.duration-badge` | Badge for salary, bg blue-l, text blue | `<span class="duration-badge">2 gio</span>` |

---

## 7. Tables

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.table`, `table.table` | Main data state, width 100%, collapse, 12px | `<table class="table"><thead>...</thead><tbody>...</tbody></table>` |
| `.table thead th` | Bang header, bg th-bg, 10px uppercase bold navy | (from dong) |
| `.table tbody td` | O data, padding 10px 14px, border-bottom ln2 | (from dong) |
| `.table tbody th` | Header hang, bg th-bg, bold navy, border-right ln | (from dong) |
| `.form-table` | State form, full border, 12px | `<table class="form-table"><tr><th>Label</th><td>Value</td></tr></table>` |
| `.docx-table` | By importing Word, the border is all high, 12px | `<table class="docx-table">...</table>` |
| `.iso-matrix` | State ISO matrix, font 11px, small padding 5px 8px | `<table class="table iso-matrix">...</table>` |
| `.tbl` | Border size, border length, padding 6px 10px | `<table class="tbl">...</table>` |
| `.assessment-matrix` | Honorable state, 11px font, small padding | `<table class="table assessment-matrix">...</table>` |
| `.rubric` | Rubric state, 11px font, grape padding | `<table class="table rubric">...</table>` |
| `.require-table` | State of love for JD, width 24% | `<table class="table require-table">...</table>` |
| `.rule-table` | According to the rules, a score of 1-2 is not equal | `<table class="table rule-table">...</table>` |

---

## 8. Process Flow

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.vflow` | Large container, flex column, gap 6px | `<div class="vflow"><div class="vstep">...</div></div>` |
| `.vstep` | Process, flex, border ln2, padding 12px 16px | `<div class="vstep"><div class="vnum">1</div><div class="vtext">...</div></div>` |
| `.vnum` | So buoc tron, 28px, bg navy, page, bold | `<div class="vnum">1</div>` |
| `.vtext` | Say the content, flex 1, 13px | `<div class="vtext"><b>Tieu de</b><p>Mo ta.</p></div>` |
| `.vbranches` | Quick, margin-left 42px, border-left 2px ln | `<div class="vbranches"><div class="vstep">...</div></div>` |
| `.step-band` | Horizontal line, flex wrap, gap 8px | `<div class="step-band"><span>1 Buoc A</span><span>2 Buoc B</span></div>` |
| `.step-list` | List of CSS counters | `<div class="step-list"><div class="step-item">Buoc 1</div></div>` |
| `.step-item` | In step-list, pseudo-element compares | `<div class="step-item">Noi dung buoc.</div>` |

---

## 9. Lists

| Class | Good luck | Vi du HTML |
|---|---|---|
| `ul.list`, `.list` | The list has no bullets, margin 0, padding 0 | `<ul class="list"><li>Item</li></ul>` |
| `.iso-list` | ISO list, no bullets, border-bottom ln2 | `<ul class="iso-list"><li>ISO 9001:2026 — 7.5</li></ul>` |
| `.iso-legend` | Standard ISO, 11px ink3, border-top | `<div class="iso-legend">Chu thich: ...</div>` |
| `.doc-link-list` | List of download links, blue bullet | `<ul class="doc-link-list"><li><a href="...">SOP-101</a></li></ul>` |
| `.link-list` | List of free links, 12px | `<ul class="link-list"><li><a href="...">Link</a></li></ul>` |
| `.tight` | Closed list (margin 4px 0), padding-left 18px | `<ul class="tight"><li>Item 1</li></ul>` |
| `.objective-list` | List of objectives (Training), border-left 4px blue | `<ul class="objective-list"><li>Muc tieu 1</li></ul>` |

---

## 10. Forms & Fields

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.field` | O form, border ln, padding 10px 12px | `<div class="field"><b>Label</b><div class="blank">...</div></div>` |
| `.field b` | Label field, 11px uppercase ink3 | (from dong) |
| `.blank` | Dong inside, border-bottom ink4, min-height 20px | `<div class="blank"></div>` |
| `.input` | Input price, border ln, padding 6px 10px, bg bg2 | `<div class="input">Gia tri</div>` |
| `.check`, `.chk` | Checkbox price, 15px square, border ink4 | `<span class="check"></span> Muc nay` |
| `.sig-box`, `.signbox`, `.signature` | O cycle, border dashed, min-height 56px | `<div class="sig-box"></div>` |
| `.sig-row`, `.sign-row` | Hang cycle, flex gap 16px | `<div class="sig-row"><div class="sig-box"></div><div class="sig-box"></div></div>` |

---

## 11. Special Components

### ISO Map & Requirements

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.iso-map` | Application target frame, bg bg2, border large | `<div class="iso-map"><div class="iso-title">...</div><div class="req">...</div></div>` |
| `.iso-title` | Size ISO, 11px bold uppercase ink3 | `<div class="iso-title">Chuan muc ap dung</div>` |
| `.req` | Love the question, flex, gap 12px, border ln2 | `<div class="req"><span class="req-tag shall">PHAI</span><div>Noi dung.</div></div>` |

### Preface & TOC

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.preface-block` | Start starting, bg bg2, border ln | `<div class="preface-block"><div class="callout">...</div></div>` |
| `.toc` | Open target, border bg2, border lon | `<div class="toc"><div class="toc-title">Muc luc</div><div class="toc-grid">...</div></div>` |
| `.toc-title` | High quality, 12-13px bold navy uppercase | `<div class="toc-title">Muc luc</div>` |
| `.toc a` | Link speed, block, padding 5-10px, 12px | (from dong) |
| `.nav-toc a` | Link target variant, border ln, radius 6px | `<div class="nav-toc"><a href="...">Muc 1</a></div>` |

### Organization (Dept Handbook)

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.org-tree` | Container so large, flex column, gap 16px | `<div class="org-tree">...</div>` |
| `.org-level` | Hang cap, display grid | `<div class="org-level cols-3">...</div>` |
| `.org-level.cols-1` | 1 cot | (from dong) |
| `.org-level.cols-2` | 2 cots | (from dong) |
| `.org-level.cols-3` | 3 cots | (from dong) |
| `.org-level.cols-4` | 4 cots | (from dong) |
| `.org-level.cols-5` | 5 cots | (from dong) |
| `.org-wrap` | Wrapper so large, overflow auto | `<div class="org-wrap">...</div>` |

### Legend & Chip Containers

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.legend` | Hang cycle stage, flex wrap, bg bg2, border ln | `<div class="legend"><span>Item 1</span></div>` |
| `.legend-row` | Hang chip, flex wrap gap 8px | `<div class="legend-row"><span class="chip">A</span></div>` |
| `.legend-box` | Hop phase, flex wrap gap 8px | `<div class="legend-box"><span class="chip">A</span></div>` |

### SVG & Images

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.svg-wrap` | Wrapper SVG, border ln, overflow auto | `<div class="svg-wrap"><img src="..." alt="..."/></div>` |

---

## 12. Print & Responsive

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.no-print` | Safe when printing | `<div class="no-print">Chi hien tren man hinh</div>` |
| `.print-disclaimer` | An on screen, visible when printing | `<div class="print-disclaimer">Ban in khong co gia tri.</div>` |
| `.no-screen` | Security on screen (display:none) | `<div class="no-screen print-disclaimer">...</div>` |

---

## 13. Buttons & Actions

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.btn` | Face, border, background, text navy | `<button class="btn">Tai xuong</button>` |
| `.btnrow` | Hang nut, flex gap 8px | `<div class="btnrow"><button class="btn">A</button><button class="btn">B</button></div>` |
| `kbd` | Full film, mono 11px, border ln | `<kbd>Ctrl</kbd>+<kbd>S</kbd>` |

---

## 14. Utilities & Misc

| Class | Good luck | Vi du HTML |
|---|---|---|
| `.lane-title` | Style, 12px bold uppercase navy | `<div class="lane-title">KHU VUC A</div>` |
| `.hero` | Start hero gradient, border ln, radius lg | `<div class="hero"><h1>Tieu de</h1><p>Mo ta.</p></div>` |
| `.tiny` | Very small text, 11px ink2 | `<span class="tiny">Ghi chu nho.</span>` |

---

## Total result: Compare class amount by group

| Nhom | Quantity (xap xi) |
|---|---|
| Layout (container, page, grids, sections) | 30+ |
| Form Header | 12 |
| Typography | 15+ |
| Cards | 30+ |
| Notes & Callouts | 12 |
| Badges & Tags | 30+ |
| Tables | 10+ |
| Process Flow | 8 |
| Lists | 7 |
| Forms & Fields | 8 |
| Special (ISO, TOC, Org) | 20+ |
| Print & Responsive | 3 |
| Buttons & Misc | 8 |
| **Tong** | **190+** |

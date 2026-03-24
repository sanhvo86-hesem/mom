# CSS Classes Reference — HESEM QMS Design System

> Danh sach day du tat ca CSS class trong `assets/style.css` va cac class bo sung thuong dung trong `<style>` noi trang.
> Cap nhat: 2026-03-24 | style.css v7

---

## 1. Layout

### Container & Page

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.container` | Wrapper ngoai cung, max-width 920px, margin auto, padding 24px 20px | `<div class="container">...</div>` |
| `.page` | Trang chinh, bg trang, border-radius 12px, box-shadow | `<div class="page">...</div>` |
| `.page.landscape` | Mo rong max-width thanh 1160px cho bang ngang | `<div class="page landscape">...</div>` |
| `.page-body` | Padding noi dung 32px 40px 48px, overflow-x hidden | `<div class="page-body">...</div>` |
| `.doc-content` | Wrapper noi dung tai lieu, reset padding | `<div class="doc-content" id="docContent">...</div>` |
| `.form-sheet` | Wrapper noi dung form/tai lieu, reset padding | `<div class="form-sheet">...</div>` |
| `.form-content` | Padding 14px 0 cho noi dung form | `<div class="form-content">...</div>` |
| `.docx-content` | Reset padding, line-height 1.7 cho noi dung docx | `<div class="docx-content">...</div>` |
| `.section` | Khoi section, margin 20px 0 | `<div class="section">...</div>` |
| `.annex-block` | Khoi annex, margin-top 40px, border-top | `<div class="annex-block">...</div>` |
| `.page-break` | Ngat trang khi in (break-before: page) | `<div class="page-break"></div>` |

### Grid Classes

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.grid-2` | Grid 2 cot (1fr 1fr hoac auto-fit minmax(260px,1fr)) | `<div class="grid-2"><div>A</div><div>B</div></div>` |
| `.grid-3` | Grid 3 cot (auto-fit minmax(220px,1fr)) | `<div class="grid-3"><div>A</div><div>B</div><div>C</div></div>` |
| `.form-grid` | Grid form 2 cot, gap 10px | `<div class="form-grid"><div>...</div><div>...</div></div>` |
| `.field-grid` | Grid field 2 cot, gap 10px 16px | `<div class="field-grid"><div class="field">...</div></div>` |
| `.toc-grid` | Grid muc luc, auto-fit minmax(220px,1fr) | `<div class="toc-grid"><a href="#p1">Muc 1</a></div>` |
| `.metric-grid` | Grid KPI, auto-fit minmax(180-210px,1fr) | `<div class="metric-grid"><div class="metric-card">...</div></div>` |
| `.gate-grid` | Grid cong kiem soat, auto-fit minmax(220px,1fr) | `<div class="gate-grid"><div class="gate-card">...</div></div>` |
| `.callout-grid` | Grid callout, auto-fit minmax(260px,1fr) | `<div class="callout-grid"><div class="callout-card">...</div></div>` |
| `.auth-grid` | Grid quyen han JD, 2 cot | `<div class="auth-grid"><div class="auth-item">...</div></div>` |
| `.comp-grid` | Grid nang luc JD, 2 cot | `<div class="comp-grid"><div class="comp-card">...</div></div>` |
| `.portal-grid` | Grid portal, auto-fit minmax(220px,1fr) | `<div class="portal-grid"><div class="portal-card">...</div></div>` |
| `.ship-grid` | Grid shipping, 1fr 1fr | `<div class="ship-grid"><div>...</div><div>...</div></div>` |
| `.label-grid` | Grid nhan, 1fr 1fr, gap 6px 12px | `<div class="label-grid"><div>...</div></div>` |
| `.kpi-grid` | Grid KPI box, 1fr 1fr | `<div class="kpi-grid"><div class="kpi-box">...</div></div>` |
| `.notice-grid` | Grid thong bao, auto-fit minmax(220px,1fr) | `<div class="notice-grid"><div class="notice-item">...</div></div>` |
| `.link-grid` | Grid lien ket, auto-fit minmax(240px,1fr) | `<div class="link-grid"><div class="link-card">...</div></div>` |
| `.two-col` | Grid 2 cot (WI), gap 16px | `<div class="two-col"><div>A</div><div>B</div></div>` |
| `.three-col` | Grid 3 cot (WI), gap 16px | `<div class="three-col">...</div>` |
| `.matrix` | Grid 2 cot (WI), gap 12px | `<div class="matrix"><div class="card">...</div></div>` |

### Separators

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.sep` | Duong ke ngang, border-top 1px, margin 28px 0 | `<hr class="sep"/>` |
| `.annex-title` | Tieu de annex, 11px bold uppercase, ink3 | `<div class="annex-title">PHU LUC A</div>` |

---

## 2. Form Header

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.form-header` | Wrapper header tai lieu, border, radius 12px | `<div class="form-header">...</div>` |
| `.fh-left` | Hang tren: logo + ten cong ty, flex, gap 16px | `<div class="fh-left">...</div>` |
| `.brand-logo` | Link logo, chua img | `<a class="brand-logo" href="..."><img .../></a>` |
| `.brand-logo img` | Logo, width 140px, object-fit contain | (tu dong) |
| `.fh-company` | Ten cong ty + phu de, flex column | `<div class="fh-company"><a>HESEM</a><span>Tai lieu</span></div>` |
| `.fh-company a` | Ten cong ty, 16px bold navy uppercase | (tu dong) |
| `.fh-company span` | Phu de, 10.5px ink3 uppercase | (tu dong) |
| `.form-header .title` | Khoi tieu de, padding, border-bottom gold 2px | `<div class="title"><strong>...</strong></div>` |
| `.form-header .title strong` | Tieu de chinh, 15px bold navy | (tu dong) |
| `.form-header .title .sub-vn` | Phu de tieng Viet, 12.5px ink2 | `<span class="sub-vn">...</span>` |
| `.form-header .title .muted` | Ghi chu mo, 11px ink3 | `<span class="muted">...</span>` |
| `.form-header .meta` | Hang meta (Code, Version...), flex wrap, bg bg2 | `<div class="meta">...</div>` |
| `.form-header .meta .row` | O meta, flex, padding 6px 16px, border-right | `<div class="row"><span><b>Code:</b></span><span>SOP-101</span></div>` |

---

## 3. Typography

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.h1`, `h1.h1`, `.doc-title.h1` | Heading 1: 20px bold navy, border-bottom 2px navy | `<h1 class="h1">Tieu de</h1>` |
| `.h2`, `h2.h2` | Heading 2: 14px bold navy, border-bottom 1px ln | `<h2 class="h2" id="p1">1. Muc dich</h2>` |
| `.h3`, `h3.h3` | Heading 3: 13px bold ink | `<h3 class="h3">Tieu de phu</h3>` |
| `.lead` | Doan mo dau, 14px ink2, line-height 1.7 | `<p class="lead">Mo ta ngan.</p>` |
| `.muted` | Text phu, 12px ink3 | `<span class="muted">Ghi chu</span>` |
| `.small` | Text nho, 12px | `<span class="small">Chi tiet</span>` |
| `.small.muted` | Text rat nho rat mo, 11px ink4 | `<span class="small muted">...</span>` |
| `.big` | Text lon, 16px bold | `<span class="big">123</span>` |
| `.mono`, `.code` | Font monospace, 12px, bg bg3 | `<span class="code">SOP-101</span>` |
| `.center` | Can giua | `<p class="center">...</p>` |
| `.mini-note` | Ghi chu nho, 12px ink2, line-height 1.6 | `<p class="mini-note">Luu y nho.</p>` |
| `.subtle` | Text phu, ink2 12px | `<span class="subtle">...</span>` |
| `.muted-note` | Ghi chu mo, 12px ink2 | `<p class="muted-note">...</p>` |
| `.inline-note` | Ghi chu inline, 12px ink2, margin-top 8px | `<p class="inline-note">Quy uoc: R = ...</p>` |
| `.footer-note` | Ghi chu cuoi trang, 12px ink2, border-top | `<div class="footer-note">...</div>` |
| `.small-note` | Ghi chu nho, 12px ink2 | `<p class="small-note">...</p>` |

---

## 4. Cards

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.card` | Card chung, bg trang, border ln, radius r, padding 20px 24px | `<div class="card">...</div>` |
| `.card-title` | Tieu de card, 14px bold navy | `<div class="card-title">Tieu de</div>` |
| `.table-card` | Wrapper bang responsive, border, radius, overflow-x auto | `<div class="table-card"><table class="table">...</table></div>` |
| `.table-block` | Tuong tu table-card | `<div class="table-block">...</div>` |
| `.table-wrap` | Tuong tu table-card | `<div class="table-wrap">...</div>` |
| `.gate-card` | Cong kiem soat, border-left 4px blue | `<div class="gate-card"><h3>G1</h3><p>...</p></div>` |
| `.metric-card` | KPI metric, border ln, padding 14px | `<div class="metric-card"><div class="value">95%</div><div class="label">OTD</div></div>` |
| `.metric-card .value` | Gia tri KPI, 18-20px bold navy | (tu dong) |
| `.metric-card .label` | Nhan KPI, 11px uppercase ink2/ink3 | (tu dong) |
| `.callout-card` | Card callout nhieu cot, border ln, padding 14px | `<div class="callout-card"><h3>Co bao phu</h3><ul>...</ul></div>` |
| `.portal-card` | Card portal, border ln, padding 18px | `<div class="portal-card"><h3>Module</h3></div>` |
| `.link-card` | Card lien ket, border ln, padding 16px | `<div class="link-card"><h3>...</h3><p>...</p></div>` |
| `.jd-purpose` | Muc dich JD, border-left 4px #1d4ed8, bg bg2 | `<div class="jd-purpose"><p><b>Muc dich:</b> ...</p></div>` |
| `.jd-mission` | Su menh JD, bg #eef6ff, border-left 4px #2563eb | `<div class="jd-mission"><p>Su menh ...</p></div>` |
| `.auth-item` | O quyen han, border ln, radius 8px, bg bg2 | `<div class="auth-item">...</div>` |
| `.backup-card` | Pho/backup, border-left 4px #0f766e, bg bg2 | `<div class="backup-card">...</div>` |
| `.comp-card` | Nang luc, border ln, radius 8px, bg trang | `<div class="comp-card"><p><b>Kien thuc</b></p><ul>...</ul></div>` |
| `.org-card` | To chuc card, border-top 4px blue | `<div class="org-card"><h3>Giam doc</h3></div>` |
| `.org-row` | Hang to chuc, border ln, padding 14px | `<div class="org-row"><h3>Nhom A</h3><p>...</p></div>` |
| `.kpi-box` | KPI box, border ln, padding 12px | `<div class="kpi-box"><b>KPI</b><span>95%</span></div>` |
| `.phase-card` | Giai doan, border-left 4px gold, bg #fffdf5 | `<div class="phase-card"><h3>Giai doan 1</h3></div>` |
| `.lane` | Swim lane, bg bg2, border ln | `<div class="lane">...</div>` |
| `.item` | Item don, border ln2, padding 10px 14px | `<div class="item">...</div>` |
| `.label-box` | Nhan in, border 2px dashed ln | `<div class="label-box">...</div>` |
| `.loc-box` | Location box, border 2px solid ink | `<div class="loc-box"><div class="loc-code">A1-R2-S3</div></div>` |
| `.loc-code` | Ma vi tri, 22px bold mono | (tu dong) |
| `.ship-box` | Shipping box, border ln, padding 16px | `<div class="ship-box">...</div>` |
| `.quiz-card` | Card kiem tra (Training), border ln, padding 16px | `<div class="quiz-card"><h3>Cau 1</h3></div>` |
| `.figure-box` | Khung hinh/so do, border ln, padding 12px | `<div class="figure-box">...</div>` |
| `.keyline` | Khung dashed nhe, border dashed th-bdr, bg #fcfcfd | `<div class="keyline"><strong>Nhac nhanh:</strong> ...</div>` |
| `.source-box` | Khung nguon, border dashed ln, padding 12px | `<div class="source-box">...</div>` |
| `.boxed-list` | Khung danh sach, border ln, padding 14px | `<div class="boxed-list"><ul>...</ul></div>` |
| `.notice-item` | O thong bao, border-left 4px blue, font 12px | `<div class="notice-item">...</div>` |

---

## 5. Notes & Callouts

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.note` | Ghi chu xanh, bg blue-l, border-left 2px blue | `<div class="note"><strong>LUU Y</strong><br/>Noi dung.</div>` |
| `.callout` | Canh bao vang, bg gold-l, border-left 2px gold | `<div class="callout"><div class="card-title">Lenh dieu hanh</div><p>...</p></div>` |
| `.note-soft` | Canh bao vang nhe, border-left 4px #eab308, bg #fffbeb | `<div class="note-soft">Canh bao nhe.</div>` |
| `.note-blue` | Thong tin xanh, border-left 4px blue, bg blue-l | `<div class="note-blue">Thong tin bo sung.</div>` |
| `.role-note` | Ghi chu vai tro, border-left 4px #94a3b8, bg #f8fafc | `<div class="role-note">Vai tro lien quan: ...</div>` |
| `.callout-danger` | Nguy hiem, border-left 4px #c92a2a, bg #fff5f5 | `<div class="callout-danger"><strong>DUNG NGAY</strong></div>` |
| `.callout-info` | Thong tin, border-left 4px #1971c2, bg #eef7ff | `<div class="callout-info">Thong tin them.</div>` |
| `.callout-warn` | Canh bao cam, border-left 4px #e67700, bg #fff9db | `<div class="callout-warn">Can than.</div>` |
| `.box` | Box chung, border ln, radius r, padding 12px 16px | `<div class="box">Noi dung.</div>` |
| `.box.core` | Yeu cau cot loi, bg blue-l, border-left 2px blue | `<div class="box core">Yeu cau bat buoc.</div>` |
| `.box.imp` | Quan trong, bg #fff5f5, border-left 2px red | `<div class="box imp">QUAN TRONG.</div>` |
| `.box.sup` | Ho tro, bg gold-l, border-left 2px gold | `<div class="box sup">Bo sung.</div>` |
| `.box.mgt` | Quan tri, bg #f3f0ff, border-left 2px #7950f2 | `<div class="box mgt">Quan tri.</div>` |

---

## 6. Badges & Tags

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.badge` | Badge chinh, navy bg, trang text, 10px uppercase | `<span class="badge">SOP</span>` |
| `.tag` | Tag inline, border ln, bg bg3, 11px | `<span class="tag">Tag</span>` |
| `.tag.teal` | Tag xanh la | `<span class="tag teal">Active</span>` |
| `.tag.orange` | Tag cam | `<span class="tag orange">Pending</span>` |
| `.chip` | Chip thong tin, bg blue-l, text blue, 11px | `<span class="chip">Cong kiem soat</span>` |
| `.chiplist` | Hang chip, flex wrap gap 6px | `<div class="chiplist"><span class="chip">A</span></div>` |
| `.pill`, `.status-pill` | Trang thai, rounded 20px, 10px uppercase | `<span class="pill">ACTIVE</span>` |
| `.kpi-pill` | KPI pill, bg #ebfbee, text green | `<span class="kpi-pill">98.5%</span>` |
| `.inline-tag` | Tag inline nho, rounded 999px, 10px bold | `<span class="inline-tag">V2</span>` |
| `.badge-soft` | Badge mem, rounded 999px, bg blue-l, text navy | `<span class="badge-soft">SOP lien quan</span>` |
| `.badge-red` | Badge do, bg #fff5f5, text #c92a2a | `<span class="badge-red">Critical</span>` |
| `.badge-amber` | Badge vang, bg #fff9db, text #e67700 | `<span class="badge-amber">Warning</span>` |
| `.badge-green` | Badge xanh la, bg #ebfbee, text #2b8a3e | `<span class="badge-green">OK</span>` |
| `.badge-blue` | Badge xanh duong, bg #e7f5ff, text #1971c2 | `<span class="badge-blue">Info</span>` |
| `.badge-navy` | Badge navy, bg #eef2ff, text #243b6b | `<span class="badge-navy">System</span>` |
| `.level` | Base class severity level, 11px bold | (dung voi .l1-.l4) |
| `.level.l1` | Info (xanh duong), bg #dbe4ff, text #364fc7 | `<span class="level l1">Info</span>` |
| `.level.l2` | OK (xanh la), bg #d3f9d8, text #2b8a3e | `<span class="level l2">OK</span>` |
| `.level.l3` | Warning (vang), bg #fff3bf, text #e67700 | `<span class="level l3">Warning</span>` |
| `.level.l4` | Critical (do), bg #ffe3e3, text #c92a2a | `<span class="level l4">Critical</span>` |
| `.req-tag` | Base class requirement tag, 10px bold uppercase | (dung voi .shall/.should/.may) |
| `.req-tag.shall` | Bat buoc (do), bg #fff5f5, text red | `<span class="req-tag shall">PHAI</span>` |
| `.req-tag.should` | Khuyen nghi (cam), bg #fff9db, text #e67700 | `<span class="req-tag should">NEN</span>` |
| `.req-tag.may` | Tuy chon (xanh), bg #ebfbee, text green | `<span class="req-tag may">CO THE</span>` |
| `.iso-ref` | Tham chieu ISO, bg blue-l, text blue, 10px | `<span class="iso-ref">7.5.1</span>` |
| `.raci-badge` | Badge RACI, rounded 999px, 11px bold | `<span class="raci-badge raci-r">R</span>` |
| `.raci-r` | Responsible (xanh), bg #e0f2fe | (tu dong) |
| `.raci-a` | Accountable (cam), bg #fff3e0 | (tu dong) |
| `.raci-c` | Consulted (tim), bg #f3e8ff | (tu dong) |
| `.raci-i` | Informed (xanh la), bg #ecfdf5 | (tu dong) |
| `.raci-R` | Responsible variant, bg #e7f5ff | (tu dong) |
| `.raci-A` | Accountable variant, bg #fff5f5 | (tu dong) |
| `.raci-C` | Consulted variant, bg #fff9db | (tu dong) |
| `.raci-I` | Informed variant, bg #ebfbee | (tu dong) |
| `.raci-cell` | O RACI trong bang, can giua, 34px wide | `<td class="raci-cell">R</td>` |
| `.role-code` | Ma vai tro, mono 11px, bg bg3 | `<span class="role-code">QA-MGR</span>` |
| `.duration-badge` | Badge thoi luong, bg blue-l, text blue | `<span class="duration-badge">2 gio</span>` |

---

## 7. Tables

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.table`, `table.table` | Bang du lieu chinh, width 100%, collapse, 12px | `<table class="table"><thead>...</thead><tbody>...</tbody></table>` |
| `.table thead th` | Header bang, bg th-bg, 10px uppercase bold navy | (tu dong) |
| `.table tbody td` | O du lieu, padding 10px 14px, border-bottom ln2 | (tu dong) |
| `.table tbody th` | Header hang, bg th-bg, bold navy, border-right ln | (tu dong) |
| `.form-table` | Bang form, border tat ca o, 12px | `<table class="form-table"><tr><th>Label</th><td>Value</td></tr></table>` |
| `.docx-table` | Bang import Word, border tat ca o, 12px | `<table class="docx-table">...</table>` |
| `.iso-matrix` | Bang matrix ISO, font 11px, padding nho 5px 8px | `<table class="table iso-matrix">...</table>` |
| `.tbl` | Bang don gian, border ln, padding 6px 10px | `<table class="tbl">...</table>` |
| `.assessment-matrix` | Bang danh gia, font 11px, padding nho | `<table class="table assessment-matrix">...</table>` |
| `.rubric` | Bang rubric, font 11px, padding nho | `<table class="table rubric">...</table>` |
| `.require-table` | Bang yeu cau JD, th width 24% | `<table class="table require-table">...</table>` |
| `.rule-table` | Bang quy tac, cot 1-2 khong ngat dong | `<table class="table rule-table">...</table>` |

---

## 8. Process Flow

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.vflow` | Container luong dung, flex column, gap 6px | `<div class="vflow"><div class="vstep">...</div></div>` |
| `.vstep` | Buoc quy trinh, flex, border ln2, padding 12px 16px | `<div class="vstep"><div class="vnum">1</div><div class="vtext">...</div></div>` |
| `.vnum` | So buoc tron, 28px, bg navy, trang, bold | `<div class="vnum">1</div>` |
| `.vtext` | Noi dung buoc, flex 1, 13px | `<div class="vtext"><b>Tieu de</b><p>Mo ta.</p></div>` |
| `.vbranches` | Nhanh con, margin-left 42px, border-left 2px ln | `<div class="vbranches"><div class="vstep">...</div></div>` |
| `.step-band` | Dai buoc ngang, flex wrap, gap 8px | `<div class="step-band"><span>1 Buoc A</span><span>2 Buoc B</span></div>` |
| `.step-list` | Danh sach buoc dung CSS counter | `<div class="step-list"><div class="step-item">Buoc 1</div></div>` |
| `.step-item` | Buoc trong step-list, pseudo-element so tron | `<div class="step-item">Noi dung buoc.</div>` |

---

## 9. Lists

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `ul.list`, `.list` | Danh sach khong bullet, margin 0, padding 0 | `<ul class="list"><li>Item</li></ul>` |
| `.iso-list` | Danh sach ISO, khong bullet, border-bottom ln2 | `<ul class="iso-list"><li>ISO 9001:2015 — 7.5</li></ul>` |
| `.iso-legend` | Chu thich ISO, 11px ink3, border-top | `<div class="iso-legend">Chu thich: ...</div>` |
| `.doc-link-list` | Danh sach link tai lieu, bullet xanh | `<ul class="doc-link-list"><li><a href="...">SOP-101</a></li></ul>` |
| `.link-list` | Danh sach link don gian, 12px | `<ul class="link-list"><li><a href="...">Link</a></li></ul>` |
| `.tight` | Danh sach sít (margin 4px 0), padding-left 18px | `<ul class="tight"><li>Item 1</li></ul>` |
| `.objective-list` | Danh sach muc tieu (Training), border-left 4px blue | `<ul class="objective-list"><li>Muc tieu 1</li></ul>` |

---

## 10. Forms & Fields

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.field` | O form, border ln, padding 10px 12px | `<div class="field"><b>Label</b><div class="blank">...</div></div>` |
| `.field b` | Label field, 11px uppercase ink3 | (tu dong) |
| `.blank` | Dong trong, border-bottom ink4, min-height 20px | `<div class="blank"></div>` |
| `.input` | Input gia, border ln, padding 6px 10px, bg bg2 | `<div class="input">Gia tri</div>` |
| `.check`, `.chk` | Checkbox gia, 15px vuong, border ink4 | `<span class="check"></span> Muc nay` |
| `.sig-box`, `.signbox`, `.signature` | O chu ky, border dashed, min-height 56px | `<div class="sig-box"></div>` |
| `.sig-row`, `.sign-row` | Hang chu ky, flex gap 16px | `<div class="sig-row"><div class="sig-box"></div><div class="sig-box"></div></div>` |

---

## 11. Special Components

### ISO Map & Requirements

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.iso-map` | Khung chuan muc ap dung, bg bg2, border ln | `<div class="iso-map"><div class="iso-title">...</div><div class="req">...</div></div>` |
| `.iso-title` | Tieu de ISO, 11px bold uppercase ink3 | `<div class="iso-title">Chuan muc ap dung</div>` |
| `.req` | Yeu cau, flex, gap 12px, border ln2 | `<div class="req"><span class="req-tag shall">PHAI</span><div>Noi dung.</div></div>` |

### Preface & TOC

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.preface-block` | Khoi mo dau, bg bg2, border ln | `<div class="preface-block"><div class="callout">...</div></div>` |
| `.toc` | Khoi muc luc, bg bg2, border ln | `<div class="toc"><div class="toc-title">Muc luc</div><div class="toc-grid">...</div></div>` |
| `.toc-title` | Tieu de muc luc, 12-13px bold navy uppercase | `<div class="toc-title">Muc luc</div>` |
| `.toc a` | Link muc luc, block, padding 5-10px, 12px | (tu dong) |
| `.nav-toc a` | Link muc luc variant, border ln, radius 6px | `<div class="nav-toc"><a href="...">Muc 1</a></div>` |

### Organization (Dept Handbook)

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.org-tree` | Container so do to chuc, flex column, gap 16px | `<div class="org-tree">...</div>` |
| `.org-level` | Hang cap bac, display grid | `<div class="org-level cols-3">...</div>` |
| `.org-level.cols-1` | 1 cot | (tu dong) |
| `.org-level.cols-2` | 2 cot | (tu dong) |
| `.org-level.cols-3` | 3 cot | (tu dong) |
| `.org-level.cols-4` | 4 cot | (tu dong) |
| `.org-level.cols-5` | 5 cot | (tu dong) |
| `.org-wrap` | Wrapper so do to chuc, overflow auto | `<div class="org-wrap">...</div>` |

### Legend & Chip Containers

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.legend` | Hang chu giai, flex wrap, bg bg2, border ln | `<div class="legend"><span>Item 1</span></div>` |
| `.legend-row` | Hang chip, flex wrap gap 8px | `<div class="legend-row"><span class="chip">A</span></div>` |
| `.legend-box` | Hop chu giai, flex wrap gap 8px | `<div class="legend-box"><span class="chip">A</span></div>` |

### SVG & Images

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.svg-wrap` | Wrapper SVG, border ln, overflow auto | `<div class="svg-wrap"><img src="..." alt="..."/></div>` |

---

## 12. Print & Responsive

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.no-print` | An khi in | `<div class="no-print">Chi hien tren man hinh</div>` |
| `.print-disclaimer` | An tren man hinh, hien khi in | `<div class="print-disclaimer">Ban in khong co gia tri.</div>` |
| `.no-screen` | An tren man hinh (display:none) | `<div class="no-screen print-disclaimer">...</div>` |

---

## 13. Buttons & Actions

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.btn` | Nut nhan, border ln, bg bg, text navy | `<button class="btn">Tai xuong</button>` |
| `.btnrow` | Hang nut, flex gap 8px | `<div class="btnrow"><button class="btn">A</button><button class="btn">B</button></div>` |
| `kbd` | Phim tat, mono 11px, border ln | `<kbd>Ctrl</kbd>+<kbd>S</kbd>` |

---

## 14. Utility & Misc

| Class | Chuc nang | Vi du HTML |
|---|---|---|
| `.lane-title` | Tieu de lane, 12px bold uppercase navy | `<div class="lane-title">KHU VUC A</div>` |
| `.hero` | Khoi hero gradient, border ln, radius lg | `<div class="hero"><h1>Tieu de</h1><p>Mo ta.</p></div>` |
| `.tiny` | Text rat nho, 11px ink2 | `<span class="tiny">Ghi chu nho.</span>` |

---

## Tong ket: So luong class theo nhom

| Nhom | So luong (xap xi) |
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

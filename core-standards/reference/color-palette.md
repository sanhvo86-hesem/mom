# Color Palette Reference — HESEM QMS Design System

> Cap nhat: 2026-03-24 | style.css v7

---

## 1. Bang mau chinh (CSS Variables)

### 1.1 Mau thuong hieu

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| Navy | `#0c2d48` | `--navy` | Tieu de (h1, h2), badge chinh, fh-company, card-title, vnum bg, table header text |
| Blue | `#1565c0` | `--blue` | Link, accent chinh, border-left note, chip text, gate-card border, org-card border-top |
| Blue Light | `#e3f2fd` | `--blue-l` | Nen note, chip bg, iso-ref bg, badge-soft bg, kpi-pill bg, box.core bg |
| Gold | `#f9a825` | `--gold` | Border vang form-header title, callout border, box.sup border, phase-card border |
| Gold Light | `#fff8e1` | `--gold-l` | Nen callout, nen box.sup |

### 1.2 Mau bang

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| Table Header BG | `#eef4fb` | `--th-bg` | Nen header bang (thead th), form-table th |
| Table Header Border | `#b8d4f0` | `--th-bdr` | Border header bang (thead th border-bottom) |

### 1.3 Mau canh bao / trang thai

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| Red | `#e03131` | `--red` | Canh bao, loi, req-tag.shall, box.imp border |
| Green | `#2f9e44` | `--green` | Thanh cong, req-tag.may, kpi-pill text |

### 1.4 Ink (Text)

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| Ink | `#212529` | `--ink` | Text chinh (body, p, td) |
| Ink 2 | `#495057` | `--ink2` | Text phu (sub-vn, mini-note, inline-note, lead) |
| Ink 3 | `#868e96` | `--ink3` | Text mo (muted, iso-title, field label, meta label) |
| Ink 4 | `#adb5bd` | `--ink4` | Text rat mo (small.muted, blank border, check border) |

### 1.5 Background

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| BG | `#ffffff` | `--bg` | Nen chinh (page, card, table cell) |
| BG 2 | `#f8f9fa` | `--bg2` | Nen xam nhat (meta, toc, preface, sig-box, input, auth-item) |
| BG 3 | `#f1f3f5` | `--bg3` | Nen xam (tag bg, mono/code bg, inline-tag bg) |

### 1.6 Border

| Ten | Hex | CSS Variable | Cong dung |
|---|---|---|---|
| Line | `#dee2e6` | `--ln` | Border chinh (card, table, sep, form-header) |
| Line 2 | `#e9ecef` | `--ln2` | Border phu (td border-bottom, vstep, fh-left border) |

---

## 2. Mau bo sung (khong phai CSS variable)

Cac mau nay duoc dung truc tiep trong cac class bo sung (in-page `<style>` hoac specific components).

### 2.1 Mau nen nhe (Background tints)

| Hex | Dung cho | Ket hop voi border |
|---|---|---|
| `#fafcfe` | `tr:nth-child(even)` — soc nhe bang | (khong border) |
| `#f0f4ff` | `tr:hover` — hover bang | (khong border) |
| `#eef6ff` / `#eef7ff` | `.jd-mission`, `.callout-info` | `#cfe0ff` / `#1971c2` |
| `#f8fafc` | `.role-note`, `.auth-item`, `.jd-purpose` | `#94a3b8` / `--ln` |
| `#fff5f5` | `.box.imp`, `.req-tag.shall`, `.callout-danger`, `.raci-A` | `#ffc9c9` / `#c92a2a` |
| `#fff9db` | `.req-tag.should`, `.callout-warn`, `.raci-C` (uppercase) | `#ffe066` / `#e67700` |
| `#ebfbee` | `.req-tag.may`, `.kpi-pill`, `.raci-I` (uppercase) | `#b2f2bb` / `--green` |
| `#fffbeb` | `.note-soft` | `#eab308` |
| `#f3f0ff` | `.box.mgt` | `#d0bfff` / `#7950f2` |
| `#fffdf5` | `.phase-card` | `--gold` |
| `#fcfcfd` | `.keyline` | `--th-bdr` (dashed) |
| `#e6fcf5` | `.tag.teal` | `#96f2d7` |
| `#fff4e6` | `.tag.orange` | `#ffd8a8` |

### 2.2 Mau text bo sung

| Hex | Dung cho |
|---|---|
| `#087f5b` | `.tag.teal` text |
| `#d9480f` | `.tag.orange` text |
| `#364fc7` | `.level.l1` text |
| `#2b8a3e` | `.level.l2` text, `.badge-green` text |
| `#e67700` | `.level.l3` text, `.req-tag.should` text, `.badge-amber` text |
| `#c92a2a` | `.level.l4` text, `.badge-red` text, `.raci-A` text |
| `#1864ab` | `.raci-R` (uppercase) text |
| `#1971c2` | `.badge-blue` text, `.callout-info` border |
| `#243b6b` | `.badge-navy` text |
| `#b45309` | `.raci-a` (lowercase) text |
| `#0369a1` | `.raci-r` (lowercase) text |
| `#7e22ce` | `.raci-c` (lowercase) text |
| `#047857` | `.raci-i` (lowercase) text |
| `#1d4ed8` | `.jd-purpose` border-left |
| `#2563eb` | `.jd-mission` border-left |
| `#0f766e` | `.backup-card` border-left |
| `#7950f2` | `.box.mgt` border-left |
| `#eab308` | `.note-soft` border-left |
| `#94a3b8` | `.role-note` border-left |

### 2.3 Mau severity levels

| Cap do | BG | Text | Border | Dung khi |
|---|---|---|---|---|
| Level 1 (Info) | `#dbe4ff` | `#364fc7` | — | Thong tin, tham khao |
| Level 2 (OK) | `#d3f9d8` | `#2b8a3e` | — | Binh thuong, dat |
| Level 3 (Warning) | `#fff3bf` | `#e67700` | — | Canh bao, can chu y |
| Level 4 (Critical) | `#ffe3e3` | `#c92a2a` | — | Nghiem trong, phai xu ly |

---

## 3. Quy tac ket hop mau

### 3.1 Cap mau nen + border trai

| Muc dich | Nen | Border trai | Class tieu bieu |
|---|---|---|---|
| Thong tin / luu y | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | `.note`, `.box.core`, `.note-blue` |
| Canh bao / lenh | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | `.callout`, `.box.sup` |
| Nguy hiem / bat buoc | `#fff5f5` | `--red` (#e03131) | `.box.imp`, `.callout-danger` |
| Canh bao nhe | `#fffbeb` | `#eab308` | `.note-soft` |
| Quan tri | `#f3f0ff` | `#7950f2` | `.box.mgt` |
| Vai tro | `#f8fafc` | `#94a3b8` | `.role-note` |
| Cong kiem soat | `--bg` | `--blue` (#1565c0) | `.gate-card` |
| Backup | `--bg2` | `#0f766e` | `.backup-card` |
| Giai doan | `#fffdf5` | `--gold` | `.phase-card` |

### 3.2 Cap mau badge

| Muc dich | BG | Text | Border |
|---|---|---|---|
| Bat buoc (SHALL) | `#fff5f5` | `--red` | `#ffc9c9` |
| Khuyen nghi (SHOULD) | `#fff9db` | `#e67700` | `#ffe066` |
| Tuy chon (MAY) | `#ebfbee` | `--green` | `#b2f2bb` |
| KPI dat | `#ebfbee` | `--green` | `#b2f2bb` |

### 3.3 Quy tac chung

1. **Khong dung qua 3 mau accent trong 1 trang.** Thuong chi dung blue + gold + (red neu can).
2. **Navy cho tieu de, blue cho link va accent.** Khong dung navy cho link, khong dung blue cho tieu de.
3. **Callout vang chi dung cho lenh dieu hanh hoac canh bao quan trong.** Khong lam dung callout.
4. **Note xanh cho thong tin bo sung.** Dung note thay vi in dam ca doan.
5. **Red chi dung cho canh bao, loi, hoac yeu cau bat buoc (SHALL/PHAI).** Khong dung red cho trang tri.
6. **Green chi dung cho thanh cong, dat, hoac tuy chon (MAY/CO THE).** Khong dung green cho nhan.
7. **Ink gradient:** --ink (chinh) > --ink2 (phu) > --ink3 (mo) > --ink4 (rat mo). Dung dung cap do de phan biet do quan trong.
8. **Background gradient:** --bg (card) > --bg2 (section bg, input) > --bg3 (tag bg, code bg). Khong dung bg3 cho nen lon.

---

## 4. Tuong duong mau voi Excel/Form

Khi tao bieu mau Excel (.xlsx) hoac Word (.docx), dung cac mau tuong duong:

| CSS Variable | Excel Equivalent | RGB | Dung cho trong Excel |
|---|---|---|---|
| `--navy` (#0c2d48) | Dark Blue | 12, 45, 72 | Tieu de cot, header |
| `--blue` (#1565c0) | Blue | 21, 101, 192 | Link text, accent |
| `--blue-l` (#e3f2fd) | Light Blue fill | 227, 242, 253 | Nen note, highlight |
| `--gold` (#f9a825) | Gold/Amber | 249, 168, 37 | Border accent |
| `--gold-l` (#fff8e1) | Light Yellow fill | 255, 248, 225 | Nen canh bao |
| `--th-bg` (#eef4fb) | Light Steel Blue | 238, 244, 251 | Nen header bang |
| `--red` (#e03131) | Red | 224, 49, 49 | Canh bao, loi |
| `--green` (#2f9e44) | Green | 47, 158, 68 | Thanh cong, dat |
| `--ink` (#212529) | Near Black | 33, 37, 41 | Text chinh |
| `--ink2` (#495057) | Dark Gray | 73, 80, 87 | Text phu |
| `--ink3` (#868e96) | Medium Gray | 134, 142, 150 | Text mo |
| `--bg2` (#f8f9fa) | Light Gray fill | 248, 249, 250 | Nen phu |
| `--bg3` (#f1f3f5) | Gray fill | 241, 243, 245 | Nen tag |
| `--ln` (#dee2e6) | Light Gray border | 222, 226, 230 | Border chinh |
| `--ln2` (#e9ecef) | Lighter Gray border | 233, 236, 239 | Border phu |
| `#fafcfe` | Very Light Blue | 250, 252, 254 | Soc nhe bang (even row) |

### Quy tac Excel

1. **Header bang:** Nen `--th-bg` (#eef4fb), text `--navy` (#0c2d48), bold, uppercase
2. **Even row:** Nen `#fafcfe` de tao soc nhe
3. **Border:** Dung `--ln` (#dee2e6) cho border chinh, `--ln2` (#e9ecef) cho border phu
4. **Canh bao:** Nen `#fff5f5`, text `--red` (#e03131)
5. **Thanh cong:** Nen `#ebfbee`, text `--green` (#2f9e44)
6. **Note/highlight:** Nen `--blue-l` (#e3f2fd)

---

## 5. Accessibility (Kha nang truy cap)

### Do tuong phan (Contrast ratio)

| Cap | Ty le | Ket hop |
|---|---|---|
| Dat AAA | > 7:1 | `--ink` (#212529) tren `--bg` (#ffffff) = ~16:1 |
| Dat AA | > 4.5:1 | `--navy` (#0c2d48) tren `--bg` = ~14:1 |
| Dat AA | > 4.5:1 | `--blue` (#1565c0) tren `--bg` = ~6:1 |
| Dat AA | > 4.5:1 | `--ink2` (#495057) tren `--bg` = ~8:1 |
| Can than | ~3.5:1 | `--ink3` (#868e96) tren `--bg` — chi dung cho text phu |
| Khong dung cho text nho | ~2.5:1 | `--ink4` (#adb5bd) tren `--bg` — chi dung cho border/icon |

### Luu y

- Text chinh (`--ink`) luon dat AAA tren nen trang
- Link (`--blue`) dat AA tren nen trang
- Text mo (`--ink3`) chi nen dung cho ghi chu, label — khong dung cho noi dung quan trong
- `--ink4` chi dung cho border, placeholder, icon — khong dung cho text doc duoc

# Color Palette Reference — HESEM QMS Design System

> Latest update: 2026-03-24 | style.css v7

---

## 1. CSS Variables

### 1.1 Easy to understand

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| Navy | `#0c2d48` | `--navy` | Title (h1, h2), title header, main badge, card-title, vnum bg, table header text |
| Blue | `#1565c0` | `--blue` | Link, main accent, border-left note, chip text, gate-card border, org-card border-top |
| Blue Light | `#e3f2fd` | `--blue-l` | Nen note, chip bg, iso-ref bg, badge-soft bg, kpi-pill bg, box.core bg |
| Gold | `#f9a825` | `--gold` | View the meta view of form-header, callout border, box.sup border, phase-card border |
| Gold Light | `#fff8e1` | `--gold-l` | Next callout, next box.sup |

### 1.2 Quick state

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| Table Header BG | `#eef4fb` | `--th-bg` | Nen header state (thehead th), form-table th |
| Table Header Border | `#b8d4f0` | `--th-bdr` | Border header state (thehead th border-bottom) |

### 1.3 Quick soup / thai page

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| Red | `#e03131` | `--red` | Canh bao, loi, req-tag.shall, box.imp border |
| Green | `#2f9e44` | `--green` | Curve bar, req-tag.may, kpi-pill text |

### 1.4 Ink (Text)

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| Ink | `#212529` | `--ink` | Main text (body, p, td) |
| Ink 2 | `#495057` | `--ink2` | Additional text (sub-vn, mini-note, inline-note, lead) |
| Ink 3 | `#868e96` | `--ink3` | Text mo (muted, iso-title, field label, meta label) |
| Ink 4 | `#adb5bd` | `--ink4` | Text is small (small.muted, blank border, check border) |

### 1.5 Background

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| BG | `#ffffff` | `--bg` | Main information (page, card, table cell) |
| BG 2 | `#f8f9fa` | `--bg2` | Maximum parameters (meta, toc, preface, sig-box, input, auth-item) |
| BG 3 | `#f1f3f5` | `--bg3` | Print code (tag bg, mono/code bg, inline-tag bg) |

### 1.6 Borders

| Ten | Hex | CSS Variables | Cong content |
|---|---|---|---|
| Line | `#dee2e6` | `--ln` | Main border (card, table, sep, form-header) |
| Line 2 | `#e9ecef` | `--ln2` | Border assignment (td border-bottom, vstep, fh-left border) |

---

## 2. Quick add (not CSS variable)

These colors are used directly in additional classes (in-page `<style>` or specific components).

### 2.1 Background tints

| Hex | Don't give | Connect with border |
|---|---|---|
| `#fafcfe` | `tr:nth-child(even)` — soc nha bang | (no borders) |
| `#f0f4ff` | `tr:hover` — hover bang | (no borders) |
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

### 2.2 Additional text color

| Hex | Don't give |
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

### 2.3 Quick severity levels

| Cap due | BG | Text | Border | Dung Khi |
|---|---|---|---|---|
| Level 1 (Info) | `#dbe4ff` | `#364fc7` | — | Be confident, ambitious |
| Level 2 (OK) | `#d3f9d8` | `#2b8a3e` | — | Binh Thuong, Dat |
| Level 3 (Warning) | `#fff3bf` | `#e67700` | — | Can soup, can chu y |
| Level 4 (Critical) | `#ffe3e3` | `#c92a2a` | — | Deep in thought, fading away |

---

## 3. Quick merger rules

### 3.1 Cap color + small border

| Purpose | Nen | Border boy | Class title |
|---|---|---|---|
| Information / notes | `--blue-l` (#e3f2fd) | `--blue` (#1565c0) | `.note`, `.box.core`, `.note-blue` |
| Canh bao / lenh | `--gold-l` (#fff8e1) | `--gold` (#f9a825) | `.callout`, `.box.sup` |
| Danger / emergency | `#fff5f5` | `--red` (#e03131) | `.box.imp`, `.callout-danger` |
| How about soup? | `#fffbeb` | `#eab308` | `.note-soft` |
| Judge | `#f3f0ff` | `#7950f2` | `.box.mgt` |
| Ash role | `#f8fafc` | `#94a3b8` | `.role-note` |
| Control control | `--bg` | `--blue` (#1565c0) | `.gate-card` |
| Backup | `--bg2` | `#0f766e` | `.backup-card` |
| Giai doan | `#fffdf5` | `--gold` | `.phase-card` |

### 3.2 Cap quickly badge

| Purpose | BG | Text | Border |
|---|---|---|---|
| Bat (SHALL) | `#fff5f5` | `--red` | `#ffc9c9` |
| Recommendation (SHOULD) | `#fff9db` | `#e67700` | `#ffe066` |
| Option (MAY) | `#ebfbee` | `--green` | `#b2f2bb` |
| KPI dat | `#ebfbee` | `--green` | `#b2f2bb` |

### 3.3 General rules

1. **Do not use more than 3 accent colors in 1 page.** Usually use blue + gold + (red if possible).
2. **Navy for black, blue for links and accent.** Do not use navy for links, do not use blue for black.
3. **Ring callout is only used for control commands or internal commands.** Do not use callout.
4. **Green note for additional information.** Use note instead to print the address.
5. **Red is only used for warnings, errors, or emergency requests (SHALL/PHAI).** Red is not used for decoration.
6. **Green is only used for bars, places, or options (MAY/CO THE).** Green is not used for people.
7. **Ink gradient:** --ink (main) > --ink2 (part) > --ink3 (mod) > --ink4 (rat mo). Use the caption to explain important reasons.
8. **Background gradient:** --bg (card) > --bg2 (section bg, input) > --bg3 (tag bg, code bg). Do not tolerate bg3 for this reason.

---

## 4. Color correlation with Excel/Form

When creating an Excel (.xlsx) or Word (.docx) color style, use the following colors:

| CSS Variables | Excel Equivalent | RGB | Format in Excel |
|---|---|---|---|
| `--navy` (#0c2d48) | Dark Blue | 12, 45, 72 | Header, header |
| `--blue` (#1565c0) | Blue | 21, 101, 192 | Link text, accent |
| `--blue-l` (#e3f2fd) | Light Blue fill | 227, 242, 253 | Take notes, highlight |
| `--gold` (#f9a825) | Gold/Amber | 249, 168, 37 | Border accent |
| `--gold-l` (#fff8e1) | Light Yellow fill | 255, 248, 225 | Nen watch the bag |
| `--th-bg` (#eef4fb) | Light Steel Blue | 238, 244, 251 | Nen header state |
| `--red` (#e03131) | Red | 224, 49, 49 | Canh bao, loi |
| `--green` (#2f9e44) | Green | 47, 158, 68 | Cong bar, dat |
| `--ink` (#212529) | Near Black | 33, 37, 41 | Main text |
| `--ink2` (#495057) | Dark Grey | 73, 80, 87 | Text details |
| `--ink3` (#868e96) | Medium Gray | 134, 142, 150 | Text mo |
| `--bg2` (#f8f9fa) | Light Gray fill | 248, 249, 250 | Ne wife |
| `--bg3` (#f1f3f5) | Gray fill | 241, 243, 245 | Nen tag |
| `--ln` (#dee2e6) | Light Gray border | 222, 226, 230 | Border main |
| `--ln2` (#e9ecef) | Lighter Gray border | 233, 236, 239 | Border wife |
| `#fafcfe` | Very Light Blue | 250, 252, 254 | Soc nha bang (even row) |

### Excel rules

1. **Header state:** Text `--th-bg` (#eef4fb), text `--navy` (#0c2d48), bold, uppercase
2. **Even row:** Please use `#fafcfe` to create the order
3. **Border:** Use `--ln` (#dee2e6) for main border, `--ln2` (#e9ecef) for secondary border
4. **Canh Bao:** Name `#fff5f5`, text `--red` (#e03131)
5. **Bar:** Line `#ebfbee`, text `--green` (#2f9e44)
6. **Note/highlight:** Name `--blue-l` (#e3f2fd)

---

## 5. Accessibility

### Contrast ratio

| Cap | Ty le | Connect |
|---|---|---|
| Dat AAA | > 7:1 | `--ink` (#212529) on `--bg` (#ffffff) = ~16:1 |
| Data AA | > 4.5:1 | `--navy` (#0c2d48) on `--bg` = ~14:1 |
| Data AA | > 4.5:1 | `--blue` (#1565c0) on `--bg` = ~6:1 |
| Data AA | > 4.5:1 | `--ink2` (#495057) on `--bg` = ~8:1 |
| Can complain | ~3.5:1 | `--ink3` (#868e96) on `--bg` — only used for additional text |
| No tolerance for small text | ~2.5:1 | `--ink4` (#adb5bd) on `--bg` — only for border/icon |

### Note

- The main text (`--ink`) is always set to AAA on the page
- Link (`--blue`) to AA on the page
- New text (`--ink3`) can only be used for notes, labels — not allowed for important content
- `--ink4` is only used for borders, placeholders, icons — not readable text

# HESEM MOM — Bo Prompt Codex: Nang cap Design System v4.5 → v4.6

> **Ngay tao**: 2026-04-11
> **Tong cong**: 8 prompts nang cap chinh xac
> **Execution order**: Prompt 1 truoc → Prompt 2+3+4+5+6 song song → Prompt 7 merge → Prompt 8 validate
> **Phuong phap**: Cach 2 — Prompt 1 sua truc tiep file chinh (status labels), Prompt 2-6 viet temp files, Prompt 7 merge, Prompt 8 validate
> **Muc tieu diem**: 100/100 tren TAT CA 5 expert areas + Standard 36 alignment

---

## BOI CANH TONG THE

### Du an
HESEM MOM: ERP/MOM/MES/eQMS cho CNC precision machining. Frontend: vanilla JS + HTML + CSS.

### File chinh
```
mom/docs/module-layout-template-design-system-v4.html
```
- Hien tai: 10541 dong, 78 sections (numbering 1-78), v4.5, 371 CSS custom properties, 560+ CSS token references
- Muc tieu: v4.6, ~12000+ dong, ~86+ sections, 380+ CSS custom properties

### File governance (doc nhung KHONG sua)
```
standards/36-frontend-module-layout-template-standard.md
```
- 724 dong, production authority cho frontend runtime
- Defines: 14 module archetypes, module build packets (24 fields), block contracts (14 fields), QA gate matrix (19 gates), definition of done (27 items), naming standards, implementation status labels

### Ket qua kiem dinh v4.5 — 5 experts (trung binh 82.6/100)
| Expert | Diem | P0 | P1 | P2 |
|--------|------|-----|-----|-----|
| CSS Token & Design System | 93 | 0 | 0 | 7 |
| Component & Interaction | 87 | 2 | 5 | 0 |
| Manufacturing Domain | 91 | 0 | 0 | 4 |
| Accessibility & i18n | 93 | 0 | 6 | 1 |
| Architecture (Standard 36 alignment) | 49 | 8 | 3 | 1 |
| **Tong** | **82.6** | **10** | **14** | **13** |

**LUU Y QUAN TRONG**: Architecture Expert cho diem 49/100 vi do theo tieu chuan moi cua Standard 36. Cac P0 con lai TAT CA la gaps giua v4.5 va Standard 36, KHONG phai loi cua v4.5 tu than. Muc tieu v4.6 la ALIGN v4.5 voi Standard 36 de dat 100/100 tren ca 5 expert areas.

### TAT CA GAPS CAN FIX (phan loai theo prompt)

#### STANDARD 36 ALIGNMENT P0 (8 items — Prompt 1, 2, 3, 4)
1. **Status labels thieu tren 78/79 sections** — Chi Section 35 co labels ENFORCED NOW/PARTIAL/TARGET. Standard 36 Section 4 yeu cau MOI section phai co 1 trong 5 labels. → Prompt 1
2. **14 module archetypes khong co mat** — Khong co archetype taxonomy trong v4.5. Standard 36 Section 10 yeu cau moi screen mapped toi 1 archetype. → Prompt 2
3. **Module build packet khong co** — Standard 36 Section 8 yeu cau 24-field build packet. → Prompt 3
4. **Block contracts thieu 11/14 fields** — HTML tables chi co 3-4 fields (type, zones, config). Thieu: version, owner, propsSchema, dataSourceSchema, eventContract, stateContract, permissionContract, a11yContract, responsiveContract, themeContract, printExportContract, testIds, qaEvidence. → Prompt 3
5. **QA gate matrix chi co 4/19** — Standard 36 Section 21 yeu cau 19 blocking gates. → Prompt 4
6. **Definition of done thieu** — Standard 36 Section 22 yeu cau 27-item checklist. → Prompt 4
7. **Template naming khong theo archetype** — Standard 36 Section 20 yeu cau `T-<archetype>-<domain>-<variant>`. → Prompt 2
8. **Machine-readable artifacts thieu** — Template registry, block contracts la HTML, khong phai JSON. → Prompt 3

#### ACCESSIBILITY P1 (6 items — Prompt 5)
1. `lang="en"` thieu cho inline English text (SC 3.1.2 Level AA)
2. Dark mode `--text-secondary` va `--text-tertiary` cung gia tri `#94a3b8` (mat phan biet)
3. Contrast table Section 55 bao gia tri cu `#94a3b8` cho light --text-tertiary (da fix thanh `#6b7280`)
4. Hardcoded `10px` font sizes trong CSS (.tpl-meta, .chip, code, .spec-table th) — can doi sang rem
5. Khong co `@media (forced-colors: active)` support (SC 1.4.11 Windows High Contrast)
6. Toast auto-dismiss khong accessible cho screen readers khong hover duoc

#### CSS TOKEN P2 (7 items — Prompt 6)
1. Stale comment dong 10: "planned for v4.4" → da implemented v4.5
2. Spacing scale claim "base-4" misleading (20px, 40px, 56px, 80px khong dung base-4)
3. Container query live CSS dung hardcoded px, spec pseudocode dung var(--cq-*) — inconsistent
4. ~54 hardcoded hex colors trong inline styles (non-sample ones)
5. zone-chart-area va zone-footer documented nhung khong co live @container rules
6. Theme token maps chi co cho 5/20 themes trong Section 36
7. --color-on-teal inconsistency giua light va dark modes

#### MANUFACTURING P2 (4 items — Prompt 6)
1. Shift handover/handoff pattern thieu hoan toan
2. Cycle count / physical inventory pattern mong
3. Offline/PWA pattern minimal (shop floor tablets mat ket noi thuong xuyen)
4. COPQ (Cost of Poor Quality) dashboard khong co calculation contract

### QUY TAC CHUNG
1. **Tieng Viet co dau**: Moi user-facing text phai co diacritics day du
2. **Token-first**: KHONG hardcoded hex/rgba — dung var(--token)
3. **Cross-reference**: Lien ket sections bang `<a href="#id">Section X</a>`
4. **Khong xoa**: Chi THEM hoac SUA, khong xoa noi dung co san
5. **HTML classes**: .section, .section-title, .section-number, .info-box, .spec-table, .code-block
6. **Info-box mau**: blue=info, green=DO, amber=WARNING, red=DON'T, purple=CROSS-REF
7. **Status labels**: Moi section PHAI co 1 trong 5 labels tu Standard 36:
   - `ENFORCED NOW` — chay trong production, QA gate block
   - `PARTIAL` — mot phan enforced, phan con lai dang implement
   - `TARGET` — chua enforce, la muc tieu design
   - `REFERENCE` — visual catalog / huong dan, khong enforce
   - `DEPRECATED` — se bi xoa/thay the
8. **Standard 36 cross-ref**: Khi them noi dung align voi Standard 36, them link: `<a href="../standards/36-frontend-module-layout-template-standard.md">Standard 36 Section X</a>`

---

## PROMPT 1: Implementation Status Labels — Sua truc tiep file chinh

### Muc tieu
Them implementation status labels vao TAT CA 78 sections. Day la gap lon nhat (P0) tu Architecture Expert. Standard 36 Section 4 yeu cau moi specification rule phai co 1 trong 5 labels. Hien tai chi Section 35 co labels.

### Doc truoc khi lam
- File chinh: `mom/docs/module-layout-template-design-system-v4.html` — doc TOC va section headers
- Governance file: `standards/36-frontend-module-layout-template-standard.md` — doc Section 4 (status labels), Section 6 (implementation status map)

### Buoc thuc hien

**Buoc 1**: Doc file chinh va doc governance file de hieu 5 labels.

**Buoc 2**: Tao 1 HTML chip element cho moi status level. Dat ngay SAU moi `.section-title`:
```html
<span class="chip chip-green" style="margin-left:12px;font-size:10px;vertical-align:middle">ENFORCED NOW</span>
<span class="chip chip-amber" style="margin-left:12px;font-size:10px;vertical-align:middle">PARTIAL</span>
<span class="chip chip-blue" style="margin-left:12px;font-size:10px;vertical-align:middle">TARGET</span>
<span class="chip" style="margin-left:12px;font-size:10px;vertical-align:middle;background:var(--bg-surface-alt);color:var(--text-secondary)">REFERENCE</span>
<span class="chip chip-red" style="margin-left:12px;font-size:10px;vertical-align:middle">DEPRECATED</span>
```

**Buoc 3**: Gan label cho TUNG section theo bang sau. Nguyen tac:
- Neu section dinh nghia CSS tokens dang chay trong production → ENFORCED NOW
- Neu section la visual catalog/examples → REFERENCE
- Neu section mo ta features chua co trong runtime code → TARGET
- Neu section co mot phan enforce, mot phan target → PARTIAL
- Neu section duoc thay the boi section moi → DEPRECATED

Bang assignment (doc ky de gan dung):

| Section | Ten | Label | Ly do |
|---------|-----|-------|-------|
| 1 | Header / TOC | REFERENCE | Doc structure, khong enforce |
| 2 | Overview | REFERENCE | Gioi thieu tong quan |
| 3 | Architecture | REFERENCE | So do kien truc, huong dan |
| 4 | Template Registry | PARTIAL | Co template list nhung chua machine-readable JSON |
| 5 | Color System | ENFORCED NOW | CSS tokens chay trong production |
| 6 | Dark Mode | ENFORCED NOW | CSS dark tokens, 2 selector blocks |
| 7 | Typography | ENFORCED NOW | Font tokens active |
| 8 | Spacing & Grid | ENFORCED NOW | Spacing scale tokens active |
| 9 | Border & Radius | ENFORCED NOW | Radius tokens active |
| 10 | Shadow & Elevation | ENFORCED NOW | Shadow tokens active |
| 11 | Motion & Animation | ENFORCED NOW | Duration tokens + reduced-motion |
| 12 | Icons | ENFORCED NOW | Icon tokens active |
| 13 | Breakpoints | ENFORCED NOW | 5 breakpoints + @media rules active |
| 14 | Z-Index | ENFORCED NOW | Z-index tokens active |
| 15 | Layout Grid | ENFORCED NOW | Grid system active |
| 16 | Dense / Comfortable | PARTIAL | Density tokens exist, toggle chua enforce |
| 17 | Shell & Navigation | PARTIAL | Shell CSS active, sidebar collapse partial |
| 18 | Data Table | PARTIAL | Table CSS active, advanced features target |
| 19 | Form Components | PARTIAL | Basic forms active, validation target |
| 20 | Token Reference | REFERENCE | Visual catalog cua tat ca tokens |
| 21-30 | Component sections | PARTIAL hoac ENFORCED NOW | Tuy vao tung section — doc noi dung de quyet dinh |
| 31 | Regulatory & Audit | PARTIAL | e-sign partial, audit trail target |
| 32 | Internationalization | PARTIAL | Vietnamese typography active, locale target |
| 33 | Security | PARTIAL | ITAR masking target, basic auth active |
| 34 | Responsive | ENFORCED NOW | Breakpoints + media queries active |
| 35 | Block Engine Runtime | PARTIAL | Da co labels — GIU NGUYEN |
| 36 | Visual Themes | PARTIAL | 5/20 themes co runtime preset |
| 37 | Block Engine Catalog | REFERENCE | Visual catalog cua block types |
| 38 | Zone System | ENFORCED NOW | 8 zone types + CSS active |
| 39-56 | Cac sections con lai | Xem noi dung de assign | |
| 55 | Token Cascade | ENFORCED NOW | 5-layer cascade model active |
| 56 | Governance | PARTIAL | 4 gates co, 15 gates thieu |
| 57 | Inline Edit | TARGET | Spec complete, code chua enforce |
| 58 | Command Palette | TARGET | Spec complete, code chua enforce |
| 59-66 | Manufacturing workflows | REFERENCE | UI patterns, chua enforce |
| 67 | Container Queries | PARTIAL | CSS ready, runtime chua enforce |
| 68 | Error Boundary | TARGET | Spec complete, code chua implement |
| 69 | Reduced Motion | ENFORCED NOW | CSS active |
| 70-76 | Manufacturing domain sections | REFERENCE | Domain patterns, visual catalog |
| 77 | Self-audit Evidence | REFERENCE | Meta information |
| 78 | Changelog | REFERENCE | History log |

**LUU Y**: Bang tren la HUONG DAN. Doc NOI DUNG thuc te cua tung section trong file de assign CHINH XAC. Neu section co CSS tokens dang chay → ENFORCED NOW. Neu chi la vi du / mockup → REFERENCE. Neu co runtime code nhung chua day du → PARTIAL.

**Buoc 4**: Them 1 info-box PURPLE dau Section 56 (Governance):
```html
<div class="info-box info-box-purple">
  <strong>CROSS-REF: Standard 36</strong> Moi section trong tai lieu nay duoc gan 1 trong 5 nhan trang thai: 
  <span class="chip chip-green" style="font-size:9px">ENFORCED NOW</span>
  <span class="chip chip-amber" style="font-size:9px">PARTIAL</span>
  <span class="chip chip-blue" style="font-size:9px">TARGET</span>
  <span class="chip" style="font-size:9px;background:var(--bg-surface-alt)">REFERENCE</span>
  <span class="chip chip-red" style="font-size:9px">DEPRECATED</span>
  Nhan xac dinh muc do enforce trong production theo <a href="../standards/36-frontend-module-layout-template-standard.md">Standard 36 Section 4</a>. QA gate chi block tren cac muc ENFORCED NOW va PARTIAL.
</div>
```

**Buoc 5**: Cap nhat version string v4.5 → v4.6 trong:
- Title tag
- Header h1
- Footer note
- Meta item version

**Buoc 6**: Cap nhat date thanh ngay hien tai.

### Kiem tra sau khi xong
- Moi `.section-title` co 1 chip label
- Khong co section nao thieu label
- Version la v4.6

---

## PROMPT 2: Module Archetypes & Template Naming → `mom/docs/tmp/v4.6-p2-archetypes.html`

### Muc tieu
Them section moi: 14 module archetypes tu Standard 36 Section 10, mapping toi templates hien co, va ap dung naming standard tu Standard 36 Section 20. Day la P0 gap lon nhat tu Architecture Expert.

### Doc truoc khi lam
- File governance: `standards/36-frontend-module-layout-template-standard.md` — doc Sections 10, 11, 20
- File chinh: `mom/docs/module-layout-template-design-system-v4.html` — doc Section 4 (Template Registry), Section 38 (Zone System)

### Noi dung

Viet vao temp file `mom/docs/tmp/v4.6-p2-archetypes.html` gom 2 sections moi.

**Section A: Module Archetypes (se la Section 79 trong file chinh)**

Tieu de: "Module Archetypes — Phan loai man hinh theo Standard 36"
Subtitle: "Moi man hinh trong he thong PHAI thuoc 1 trong 14 archetypes. Archetype xac dinh zones bat buoc, template mac dinh, va QA gates ap dung."
Label: `ENFORCED NOW`

Noi dung:

1. Bang tong quan 14 archetypes:
```html
<table class="spec-table">
  <thead>
    <tr>
      <th>STT</th>
      <th>Archetype</th>
      <th>Mo ta</th>
      <th>Required Zones</th>
      <th>Template mac dinh</th>
      <th>Vi du module</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><code>list-report</code></td>
      <td>Danh sach doc-only voi filter, sort, export. Khong co inline edit.</td>
      <td>header, filter, main, footer</td>
      <td>T-list-report-default</td>
      <td>Bao cao san luong, Lich su audit</td>
    </tr>
    <tr>
      <td>2</td>
      <td><code>analytical-list</code></td>
      <td>Danh sach voi KPI bar, chart area, drill-down. Phan tich du lieu.</td>
      <td>header, kpi-bar, filter, main, chart-area, footer</td>
      <td>T-analytical-list-default</td>
      <td>OEE Dashboard, SPC Analysis</td>
    </tr>
    <tr>
      <td>3</td>
      <td><code>object-page</code></td>
      <td>Chi tiet 1 doi tuong (WO, Part, Machine). Header hero + tabs sections.</td>
      <td>header, tabs, main, sidebar, footer</td>
      <td>T-object-page-default</td>
      <td>Work Order Detail, Part Master</td>
    </tr>
    <tr>
      <td>4</td>
      <td><code>transactional-form</code></td>
      <td>Form nhap lieu voi validation, submit, e-sign (neu regulated).</td>
      <td>header, main, sidebar, footer</td>
      <td>T-transactional-form-default</td>
      <td>NCR Form, IQC Form, CAPA 8D</td>
    </tr>
    <tr>
      <td>5</td>
      <td><code>approval-queue</code></td>
      <td>Hang doi phe duyet voi bulk actions, priority sort.</td>
      <td>header, filter, main, footer</td>
      <td>T-approval-queue-default</td>
      <td>ECO Approval, Document Review</td>
    </tr>
    <tr>
      <td>6</td>
      <td><code>exception-hub</code></td>
      <td>Trung tam xu ly ngoai le — NCR, deviation, CAPA tracking.</td>
      <td>header, kpi-bar, filter, main, sidebar, footer</td>
      <td>T-exception-hub-default</td>
      <td>NCR Hub, Deviation Tracker</td>
    </tr>
    <tr>
      <td>7</td>
      <td><code>operator-execution</code></td>
      <td>Man hinh thao tac cho operator — step-by-step traveler, barcode scan.</td>
      <td>header, main, footer</td>
      <td>T-operator-execution-default</td>
      <td>Traveler Execution, Shop Floor Entry</td>
    </tr>
    <tr>
      <td>8</td>
      <td><code>shopfloor-board</code></td>
      <td>Bang hien thi shop floor — Andon, machine status, real-time.</td>
      <td>header, kpi-bar, main, chart-area</td>
      <td>T-shopfloor-board-default</td>
      <td>Andon Board, Machine Status Board</td>
    </tr>
    <tr>
      <td>9</td>
      <td><code>planning-board</code></td>
      <td>Bang ke hoach — Gantt, drag-drop scheduling, resource allocation.</td>
      <td>header, filter, main, sidebar</td>
      <td>T-planning-board-default</td>
      <td>Production Schedule, Capacity Planning</td>
    </tr>
    <tr>
      <td>10</td>
      <td><code>control-tower</code></td>
      <td>Dashboard dieu hanh — KPIs, alerts, overview. Read-mostly voi drill-down.</td>
      <td>header, kpi-bar, main, chart-area, sidebar, footer</td>
      <td>T-control-tower-default</td>
      <td>Plant Overview, Quality Dashboard</td>
    </tr>
    <tr>
      <td>11</td>
      <td><code>evidence-workspace</code></td>
      <td>Khong gian lam viec chung cu — FAI, PPAP, audit evidence collection.</td>
      <td>header, tabs, main, sidebar, footer</td>
      <td>T-evidence-workspace-default</td>
      <td>FAI Package, PPAP Submission, Audit</td>
    </tr>
    <tr>
      <td>12</td>
      <td><code>admin-studio</code></td>
      <td>Cau hinh he thong — settings, permissions, master data.</td>
      <td>header, sidebar, main, footer</td>
      <td>T-admin-studio-default</td>
      <td>User Management, System Config</td>
    </tr>
    <tr>
      <td>13</td>
      <td><code>mobile-scanner</code></td>
      <td>Man hinh mobile — scan barcode, quick entry, minimal UI.</td>
      <td>header, main, footer</td>
      <td>T-mobile-scanner-default</td>
      <td>Receiving Scan, WIP Move, Inventory Count</td>
    </tr>
    <tr>
      <td>14</td>
      <td><code>document-view</code></td>
      <td>Xem/in tai lieu — CoC, CoA, MTR, traveler print.</td>
      <td>header, main</td>
      <td>T-document-view-default</td>
      <td>CoC Print, Traveler Print, Report Export</td>
    </tr>
  </tbody>
</table>
```

2. Mapping diagram: Hien thi moi archetype voi cac zones cua no (visual block diagram)

3. Info-box GREEN (DO):
```
DO: Moi module trong Module Builder PHAI chon 1 archetype TRUOC KHI bat dau thiet ke. Archetype xac dinh zones mac dinh, template suggestions, va QA gates ap dung.
```

4. Info-box RED (DON'T):
```
DON'T: KHONG tao module khong thuoc archetype nao. Neu use case moi khong fit 14 archetypes, de xuat archetype moi qua quy trinh governance (Section 56) va cap nhat Standard 36.
```

5. Cross-reference info-box PURPLE:
```
CROSS-REF: Standard 36 Section 10 dinh nghia day du 14 archetypes voi moi required zones, scroll policies, density defaults. Xem chi tiet tai standards/36-frontend-module-layout-template-standard.md.
```

**Section B: Template Naming Standard (se la Section 80)**

Tieu de: "Quy uoc dat ten Template theo Archetype"
Label: `TARGET`

Noi dung:

1. Naming pattern:
```
T-<archetype>-<domain>-<variant>
```
Vi du:
```
T-list-report-production-default
T-analytical-list-quality-oee
T-object-page-inventory-part-master
T-transactional-form-quality-ncr
T-approval-queue-engineering-eco
T-shopfloor-board-production-andon
T-control-tower-management-plant-overview
```

2. Bang mapping tu ten cu sang ten moi (mapping 123 templates hien co):

| Template cu | Archetype | Ten moi suggested |
|-------------|-----------|-------------------|
| T01 List Detail | list-report | T-list-report-general-default |
| T02 Master Detail | object-page | T-object-page-general-default |
| ... (liet ke it nhat 20 templates pho bien nhat) |

3. Info-box AMBER:
```
WARNING: Viec doi ten templates se anh huong toi tat ca modules dang su dung templateId cu. Ap dung naming standard moi cho templates MOI truoc. Templates cu giu ten cu va them alias mapping trong template registry.
```

### Kiem tra sau khi xong
- Co 14 archetypes day du voi zones, template, vi du
- Co naming standard voi vi du cu the
- Co cross-reference toi Standard 36

---

## PROMPT 3: Module Build Packet & Block Contract Enhancement → `mom/docs/tmp/v4.6-p3-build-packet.html`

### Muc tieu
Them section Module Build Packet (24 required fields) va nang cap Block Contract Catalog voi 14 fields cho cac block types quan trong nhat. Day la P0 gap tu Architecture Expert.

### Doc truoc khi lam
- Governance file: `standards/36-frontend-module-layout-template-standard.md` — doc Sections 8 (build packet), 9 (template registry), 12 (block contract)
- File chinh: Section 37 (Block Engine Catalog), Section 4 (Template Registry)

### Noi dung

Viet vao temp file `mom/docs/tmp/v4.6-p3-build-packet.html` gom 2 sections.

**Section A: Module Build Packet (se la Section 81)**

Tieu de: "Module Build Packet — 24 truong bat buoc khi build module"
Label: `TARGET`

1. Dinh nghia Module Build Packet la gi:
```
Module Build Packet la tap hop tat ca thong tin can thiet de build, test, deploy va audit 1 module. 
Moi module PHAI co 1 build packet TRUOC KHI submit QA gate.
```

2. Bang 24 required fields:
```html
<table class="spec-table">
  <thead>
    <tr>
      <th>STT</th>
      <th>Field</th>
      <th>Type</th>
      <th>Mo ta</th>
      <th>Vi du</th>
      <th>Bat buoc</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>moduleId</code></td><td>string</td><td>ID duy nhat cua module</td><td><code>mod-ncr-form</code></td><td>✅</td></tr>
    <tr><td>2</td><td><code>moduleArchetype</code></td><td>enum</td><td>1 trong 14 archetypes</td><td><code>transactional-form</code></td><td>✅</td></tr>
    <tr><td>3</td><td><code>templateId</code></td><td>string</td><td>Template su dung</td><td><code>T-transactional-form-quality-ncr</code></td><td>✅</td></tr>
    <tr><td>4</td><td><code>version</code></td><td>semver</td><td>Phien ban module</td><td><code>1.2.0</code></td><td>✅</td></tr>
    <tr><td>5</td><td><code>owner</code></td><td>string</td><td>Team/person chiu trach nhiem</td><td><code>Quality Team</code></td><td>✅</td></tr>
    <tr><td>6</td><td><code>screens</code></td><td>array</td><td>Danh sach screens trong module</td><td><code>["ncr-create","ncr-detail","ncr-list"]</code></td><td>✅</td></tr>
    <tr><td>7</td><td><code>zones</code></td><td>object</td><td>Map zone → block assignments</td><td><code>{"header":[...],"main":[...]}</code></td><td>✅</td></tr>
    <tr><td>8</td><td><code>blocks</code></td><td>array</td><td>Danh sach blocks su dung</td><td><code>["form-standard","data-table","action-bar"]</code></td><td>✅</td></tr>
    <tr><td>9</td><td><code>apiBindings</code></td><td>object</td><td>Map endpoint → data fields</td><td><code>{"GET /ncr/{id}": {...}}</code></td><td>✅</td></tr>
    <tr><td>10</td><td><code>permissions</code></td><td>object</td><td>Required permissions</td><td><code>{"view":"ncr.read","edit":"ncr.write"}</code></td><td>✅</td></tr>
    <tr><td>11</td><td><code>workflows</code></td><td>array</td><td>Business workflows involved</td><td><code>["ncr-disposition","capa-link"]</code></td><td>✅</td></tr>
    <tr><td>12</td><td><code>regulatoryScope</code></td><td>array</td><td>Quy dinh ap dung</td><td><code>["21CFR11","AS9100"]</code></td><td>✅</td></tr>
    <tr><td>13</td><td><code>auditFields</code></td><td>object</td><td>Audit trail configuration</td><td><code>{"esign":true,"immutable":true}</code></td><td>✅</td></tr>
    <tr><td>14</td><td><code>accessibilityLevel</code></td><td>string</td><td>WCAG target level</td><td><code>"AA"</code></td><td>✅</td></tr>
    <tr><td>15</td><td><code>a11yChecklist</code></td><td>object</td><td>Keyboard, screen reader, reflow status</td><td><code>{"keyboard":"pass","sr":"pass"}</code></td><td>✅</td></tr>
    <tr><td>16</td><td><code>responsiveBreakpoints</code></td><td>array</td><td>Supported breakpoints</td><td><code>["sm","md","lg","xl"]</code></td><td>✅</td></tr>
    <tr><td>17</td><td><code>densityModes</code></td><td>array</td><td>Supported density modes</td><td><code>["comfortable","compact"]</code></td><td>✅</td></tr>
    <tr><td>18</td><td><code>printSupport</code></td><td>object</td><td>Print layout configuration</td><td><code>{"enabled":true,"format":"A4"}</code></td><td>✅</td></tr>
    <tr><td>19</td><td><code>offlineSupport</code></td><td>boolean</td><td>Co ho tro offline khong</td><td><code>false</code></td><td>✅</td></tr>
    <tr><td>20</td><td><code>performanceBudget</code></td><td>object</td><td>LCP, FID, CLS targets</td><td><code>{"lcp":2500,"fid":100,"cls":0.1}</code></td><td>✅</td></tr>
    <tr><td>21</td><td><code>testIds</code></td><td>object</td><td>data-testid mapping</td><td><code>{"form":"ncr-form","submit":"ncr-submit"}</code></td><td>✅</td></tr>
    <tr><td>22</td><td><code>qaEvidence</code></td><td>object</td><td>Screenshot, test results, audit log</td><td><code>{"screenshot":"url","tests":"url"}</code></td><td>✅</td></tr>
    <tr><td>23</td><td><code>traceabilityMatrix</code></td><td>object</td><td>Requirements → implementation map</td><td><code>{"REQ-001":"screen-ncr-create"}</code></td><td>✅</td></tr>
    <tr><td>24</td><td><code>releaseDate</code></td><td>date</td><td>Ngay release plan</td><td><code>"2026-05-01"</code></td><td>✅</td></tr>
  </tbody>
</table>
```

3. Vi du JSON day du cho 1 module (NCR Form):
```json
{
  "moduleId": "mod-ncr-form",
  "moduleArchetype": "transactional-form",
  "templateId": "T-transactional-form-quality-ncr",
  "version": "1.0.0",
  "owner": "Quality Team",
  "screens": ["ncr-create", "ncr-detail", "ncr-list"],
  ...
}
```

4. Info-box GREEN:
```
DO: Tao build packet JSON file cho moi module tai mom/data/build-packets/{moduleId}.json. Module Builder se tu generate skeleton build packet khi tao module moi.
```

**Section B: Block Contract Enhancement (se la Section 82)**

Tieu de: "Block Contract — 14 truong bat buoc theo Standard 36"
Label: `TARGET`

1. Dinh nghia 14 required fields cho moi block:

| Field | Type | Mo ta |
|-------|------|-------|
| `blockType` | string | Ten block (vd: `data-table`) |
| `version` | semver | Phien ban block |
| `owner` | string | Team chiu trach nhiem |
| `propsSchema` | JSON Schema | Schema cho props input |
| `dataSourceSchema` | JSON Schema | Schema cho data source |
| `eventContract` | object | Events block emit va listen |
| `stateContract` | object | Internal state shape |
| `permissionContract` | object | Required permissions |
| `a11yContract` | object | ARIA roles, keyboard, focus management |
| `responsiveContract` | object | Behavior tai moi breakpoint |
| `themeContract` | object | Tokens block su dung |
| `printExportContract` | object | Print/export behavior |
| `testIds` | object | data-testid map |
| `qaEvidence` | object | Test results, screenshots |

2. Vi du day du cho block `data-table`:
```html
<div class="code-block">
<pre>
{
  "blockType": "data-table",
  "version": "2.1.0",
  "owner": "Platform Team",
  "propsSchema": {
    "type": "object",
    "required": ["columns", "dataSource"],
    "properties": {
      "columns": { "type": "array", "items": { "$ref": "#/defs/column" } },
      "dataSource": { "type": "string", "description": "API endpoint" },
      "pagination": { "type": "boolean", "default": true },
      "selectable": { "type": "boolean", "default": false }
    }
  },
  "dataSourceSchema": {
    "type": "object",
    "properties": {
      "endpoint": { "type": "string" },
      "method": { "type": "string", "enum": ["GET", "POST"] },
      "params": { "type": "object" }
    }
  },
  "eventContract": {
    "emits": ["row-click", "row-select", "sort-change", "page-change", "export-request"],
    "listens": ["filter-apply", "refresh", "selection-clear"]
  },
  "stateContract": {
    "rows": "array",
    "selectedIds": "Set",
    "sortColumn": "string|null",
    "sortDirection": "asc|desc",
    "currentPage": "number",
    "pageSize": "number",
    "loading": "boolean",
    "error": "string|null"
  },
  "permissionContract": {
    "view": "module.{domain}.read",
    "export": "module.{domain}.export",
    "bulkAction": "module.{domain}.write"
  },
  "a11yContract": {
    "role": "grid",
    "ariaLabel": "required - mo ta bang",
    "keyboardNav": "arrow keys row/cell, Enter activate, Space select",
    "focusManagement": "roving tabindex tren rows",
    "sortAnnounce": "aria-sort tren column headers",
    "liveRegion": "aria-live polite cho loading/error states"
  },
  "responsiveContract": {
    "xl": "full columns",
    "lg": "hide priority-3 columns",
    "md": "hide priority-2+3, horizontal scroll",
    "sm": "card view hoac stacked rows"
  },
  "themeContract": {
    "tokens": ["--table-header-bg", "--table-row-hover", "--table-border", "--table-stripe-bg", "--table-selected-bg"]
  },
  "printExportContract": {
    "printLayout": "landscape A4, all rows (no pagination)",
    "exportFormats": ["csv", "xlsx", "pdf"],
    "headerRepeat": true
  },
  "testIds": {
    "container": "block-data-table",
    "header": "dt-header-{columnId}",
    "row": "dt-row-{index}",
    "cell": "dt-cell-{columnId}-{index}",
    "pagination": "dt-pagination",
    "export": "dt-export-btn"
  },
  "qaEvidence": {
    "unitTests": "tests/blocks/data-table.test.js",
    "a11yAudit": "reports/a11y/data-table.html",
    "screenshot": "screenshots/data-table-{breakpoint}.png"
  }
}
</pre>
</div>
```

3. Them vi du tuong tu (rut gon) cho 4 block types pho bien nhat:
   - `form-standard` — archetype transactional-form
   - `kpi-card` — archetype control-tower
   - `gantt-chart` — archetype planning-board
   - `action-bar` — dung trong nhieu archetypes

4. Info-box AMBER:
```
WARNING: Day la TARGET — block contracts chua bat buoc cho modules hien tai. Tu v4.7, Module Builder se validate block contracts khi build. Cac modules cu duoc grace period 2 sprint de bo sung.
```

5. Cross-reference PURPLE:
```
CROSS-REF: Standard 36 Sections 8 va 12 dinh nghia day du build packet va block contract requirements. Template registry contract tai Section 9.
```

### Kiem tra sau khi xong
- 24 build packet fields day du voi vi du
- Block contract 14 fields day du voi vi du data-table
- Co 4 block vi du bo sung (rut gon)
- Co cross-reference toi Standard 36

---

## PROMPT 4: QA Gate Matrix & Definition of Done → `mom/docs/tmp/v4.6-p4-qa-gates.html`

### Muc tieu
Mo rong Section 56 (Governance) voi day du 19 blocking QA gates va 27-item Definition of Done tu Standard 36 Sections 21-22. Hien tai chi co 4 gates.

### Doc truoc khi lam
- Governance file: `standards/36-frontend-module-layout-template-standard.md` — doc Sections 21 (QA gates), 22 (Definition of Done)
- File chinh: Section 56 (Governance)

### Noi dung

Viet vao temp file `mom/docs/tmp/v4.6-p4-qa-gates.html` gom 2 sections.

**Section A: QA Gate Matrix — 19 Blocking Gates (se la Section 83)**

Tieu de: "QA Gate Matrix — 19 cong kiem tra bat buoc truoc khi release module"
Label: `PARTIAL` (vi hien tai chi enforce 4 gates, dang mo rong)

1. Info-box RED:
```
DON'T: KHONG release module nao vao production neu CHUA pass TAT CA 19 gates. Moi gate la blocking — 1 fail = khong release.
```

2. Bang 19 QA gates:
```html
<table class="spec-table">
  <thead>
    <tr>
      <th>Gate</th>
      <th>Ten</th>
      <th>Mo ta</th>
      <th>Tool / Phuong phap</th>
      <th>Pass Criteria</th>
      <th>Status hien tai</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>G01</td>
      <td>Schema Validation</td>
      <td>Build packet JSON hợp lệ, đầy đủ 24 fields</td>
      <td>JSON Schema validator</td>
      <td>0 errors</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G02</td>
      <td>Template Match</td>
      <td>templateId tồn tại trong registry, archetype khớp</td>
      <td>Registry lookup</td>
      <td>Exact match</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G03</td>
      <td>Zone Compliance</td>
      <td>Tất cả required zones của archetype có mặt</td>
      <td>DOM inspection</td>
      <td>0 missing zones</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G04</td>
      <td>Token Lint</td>
      <td>Không có hardcoded color/spacing/radius — tất cả dùng var(--token)</td>
      <td>CSS lint (stylelint)</td>
      <td>0 hardcoded values</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G05</td>
      <td>Inline Style Scan</td>
      <td>Không có inline style= attributes (trừ whitelisted)</td>
      <td>HTML lint</td>
      <td>0 non-whitelisted</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G06</td>
      <td>Vietnamese Diacritic Scan</td>
      <td>Tất cả user-facing Vietnamese text có dấu đầy đủ</td>
      <td>Regex scan</td>
      <td>0 missing diacritics</td>
      <td><span class="chip chip-green">ENFORCED NOW</span></td>
    </tr>
    <tr>
      <td>G07</td>
      <td>WCAG AA Automated</td>
      <td>axe-core scan pass tất cả rules</td>
      <td>axe-core</td>
      <td>0 violations</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G08</td>
      <td>Keyboard Navigation</td>
      <td>Tất cả interactive elements accessible bằng keyboard</td>
      <td>Manual test + APG checklist</td>
      <td>100% operable</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G09</td>
      <td>Screen Reader</td>
      <td>NVDA/VoiceOver test pass — landmarks, headings, forms, tables, live regions</td>
      <td>Manual test</td>
      <td>All flows readable</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G10</td>
      <td>Zoom Reflow 400%</td>
      <td>Viewport 1280px tại 400% zoom = 320px, không mất nội dung, không horizontal scroll</td>
      <td>Manual test</td>
      <td>No content loss</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G11</td>
      <td>Density Matrix</td>
      <td>Module hoạt động đúng ở cả comfortable và compact density</td>
      <td>Visual regression</td>
      <td>No overflow/clip</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G12</td>
      <td>Dark Mode</td>
      <td>Tất cả elements render đúng trong dark mode, contrast pass</td>
      <td>Visual regression + axe</td>
      <td>0 contrast fails</td>
      <td><span class="chip chip-green">ENFORCED NOW</span></td>
    </tr>
    <tr>
      <td>G13</td>
      <td>Responsive Breakpoints</td>
      <td>Module render đúng tại tất cả 5 breakpoints (sm/md/lg/xl/2xl)</td>
      <td>Visual regression</td>
      <td>No layout break</td>
      <td><span class="chip chip-green">ENFORCED NOW</span></td>
    </tr>
    <tr>
      <td>G14</td>
      <td>Performance Budget</td>
      <td>LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1 trên target device</td>
      <td>Lighthouse</td>
      <td>All metrics pass</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G15</td>
      <td>Permission Negative Test</td>
      <td>User không có permission → UI ẩn/disable elements đúng</td>
      <td>E2E test</td>
      <td>No unauthorized access</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G16</td>
      <td>API Binding Verification</td>
      <td>Tất cả apiBindings trong build packet match với registry endpoints</td>
      <td>Registry diff</td>
      <td>0 unmatched</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G17</td>
      <td>Audit Trail (regulated)</td>
      <td>E-sign, immutable log, 21 CFR Part 11 compliance cho modules regulated</td>
      <td>Compliance audit</td>
      <td>All controls pass</td>
      <td><span class="chip chip-amber">PARTIAL</span></td>
    </tr>
    <tr>
      <td>G18</td>
      <td>Traceability Matrix</td>
      <td>Mỗi requirement có implementation reference, mỗi implementation có requirement</td>
      <td>Matrix review</td>
      <td>100% coverage</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
    <tr>
      <td>G19</td>
      <td>Release Manifest</td>
      <td>Build packet + QA evidence + screenshots + changelog packaged</td>
      <td>CI/CD pipeline</td>
      <td>Complete package</td>
      <td><span class="chip chip-blue">TARGET</span></td>
    </tr>
  </tbody>
</table>
```

3. Summary info-box BLUE:
```
HIEN TRANG: 4/19 gates ENFORCED NOW (G06, G12, G13 + implicit template match). 5/19 PARTIAL. 10/19 TARGET. Lo trinh: Wave 1 (v4.7) enforce G01-G08. Wave 2 (v4.8) enforce G09-G14. Wave 3 (v4.9) enforce G15-G19.
```

**Section B: Definition of Done — 27-item Checklist (se la Section 84)**

Tieu de: "Definition of Done — Checklist truoc khi release module"
Label: `TARGET`

1. Danh sach 27 items (checkbox style):
```html
<div class="card">
  <div class="card-header">Definition of Done Checklist</div>
  <div class="card-body">
    <table class="spec-table">
      <thead>
        <tr><th>STT</th><th>Category</th><th>Item</th><th>Gate</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Architecture</td><td>moduleArchetype được chọn và khớp với use case</td><td>G02</td></tr>
        <tr><td>2</td><td>Architecture</td><td>templateId tồn tại trong registry</td><td>G02</td></tr>
        <tr><td>3</td><td>Architecture</td><td>Tất cả required zones có mặt theo archetype</td><td>G03</td></tr>
        <tr><td>4</td><td>Architecture</td><td>Build packet JSON đầy đủ 24 fields</td><td>G01</td></tr>
        <tr><td>5</td><td>Architecture</td><td>Block contracts đầy đủ 14 fields cho mỗi block</td><td>G01</td></tr>
        <tr><td>6</td><td>Visual</td><td>Không có hardcoded colors/spacing/radius</td><td>G04</td></tr>
        <tr><td>7</td><td>Visual</td><td>Không có inline style attributes (trừ whitelist)</td><td>G05</td></tr>
        <tr><td>8</td><td>Visual</td><td>Dark mode render đúng</td><td>G12</td></tr>
        <tr><td>9</td><td>Visual</td><td>5 breakpoints render đúng</td><td>G13</td></tr>
        <tr><td>10</td><td>Visual</td><td>Comfortable + Compact density đúng</td><td>G11</td></tr>
        <tr><td>11</td><td>Content</td><td>Vietnamese text có dấu đầy đủ</td><td>G06</td></tr>
        <tr><td>12</td><td>Content</td><td>Labels, placeholders, errors đã i18n-ready</td><td>G06</td></tr>
        <tr><td>13</td><td>Accessibility</td><td>axe-core 0 violations</td><td>G07</td></tr>
        <tr><td>14</td><td>Accessibility</td><td>Keyboard navigation 100% operable</td><td>G08</td></tr>
        <tr><td>15</td><td>Accessibility</td><td>Screen reader test pass</td><td>G09</td></tr>
        <tr><td>16</td><td>Accessibility</td><td>400% zoom reflow pass</td><td>G10</td></tr>
        <tr><td>17</td><td>Accessibility</td><td>Reduced-motion preference respected</td><td>G07</td></tr>
        <tr><td>18</td><td>Data</td><td>API bindings match registry</td><td>G16</td></tr>
        <tr><td>19</td><td>Data</td><td>Error states handled (loading, empty, error, timeout)</td><td>—</td></tr>
        <tr><td>20</td><td>Data</td><td>Offline behavior defined (nếu applicable)</td><td>—</td></tr>
        <tr><td>21</td><td>Security</td><td>Permission negative test pass</td><td>G15</td></tr>
        <tr><td>22</td><td>Security</td><td>ITAR masking rules applied (nếu applicable)</td><td>G15</td></tr>
        <tr><td>23</td><td>Performance</td><td>LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1</td><td>G14</td></tr>
        <tr><td>24</td><td>Regulatory</td><td>E-sign + audit trail cho modules regulated</td><td>G17</td></tr>
        <tr><td>25</td><td>Regulatory</td><td>Traceability matrix complete</td><td>G18</td></tr>
        <tr><td>26</td><td>Release</td><td>Changelog entry written</td><td>G19</td></tr>
        <tr><td>27</td><td>Release</td><td>Release manifest packaged + approved</td><td>G19</td></tr>
      </tbody>
    </table>
  </div>
</div>
```

2. Info-box GREEN:
```
DO: In checklist nay ra va danh dau khi review module. Module Builder se tu generate checklist tu build packet va highlight items chua pass.
```

### Kiem tra sau khi xong
- 19 QA gates day du voi ten, mo ta, tool, criteria, status
- 27 DoD items day du voi category va gate mapping
- Co lo trinh enforce (Wave 1/2/3)

---

## PROMPT 5: Accessibility Hardening → `mom/docs/tmp/v4.6-p5-a11y.html`

### Muc tieu
Fix 6 P1 accessibility gaps con lai tu Accessibility Expert. Muc tieu: 100/100 tren accessibility audit.

### Doc truoc khi lam
- File chinh: Sections 6 (Dark Mode), 7 (Typography), 55 (Token Cascade contrast table), 63 (WCAG checklist), 69 (Reduced Motion), CSS block (dong 1-600)

### Noi dung

Viet vao temp file `mom/docs/tmp/v4.6-p5-a11y.html` gom nhieu patches.

**Patch A: lang="en" cho inline English text (SC 3.1.2)**

Them vao Section 32 (Internationalization) 1 quy tac moi:
```html
<div class="info-box info-box-green">
  <strong>DO — lang attribute cho noi dung hon hop</strong>
  Khi van ban tieng Viet chua cum tu tieng Anh (ten ky thuat, ten component, WCAG criteria), 
  boc cum tu do trong <code>&lt;span lang="en"&gt;...&lt;/span&gt;</code> de screen reader doc dung ngon ngu.
  <br><br>
  <strong>Vi du:</strong><br>
  <code>&lt;p&gt;Hệ thống hỗ trợ &lt;span lang="en"&gt;dark mode&lt;/span&gt; tự động theo &lt;span lang="en"&gt;prefers-color-scheme&lt;/span&gt;.&lt;/p&gt;</code>
  <br><br>
  <strong>Ngoai le:</strong> Code blocks (<code>&lt;pre&gt;</code>, <code>&lt;code&gt;</code>) không cần <code>lang="en"</code> 
  vì screen readers thường tự chuyển chế độ khi gặp code.
</div>
```

**Patch B: Fix dark mode --text-secondary/--text-tertiary trung nhau**

Hien tai trong dark mode CA HAI la `#94a3b8`. Fix:
```css
/* Trong dark mode block */
--text-secondary: #94a3b8; /* giu nguyen — 5.71:1 on #1e293b */
--text-tertiary: #64748b;  /* doi tu #94a3b8 → #64748b — 4.01:1 on #1e293b, du AA large text */
```

VA them ghi chu trong Section 7 (Typography):
```html
<div class="info-box info-box-amber">
  <strong>WARNING — Dark mode text hierarchy</strong>
  <code>--text-secondary</code> (#94a3b8) va <code>--text-tertiary</code> (#64748b) PHAI khac nhau trong dark mode 
  de duy tri visual hierarchy. Neu 2 token cung gia tri, developer khong phan biet duoc noi dung phu va metadata.
  Contrast ratios: secondary 5.71:1 (AA normal), tertiary 4.01:1 (AA large text only — chi dung cho text >= 14pt bold hoac >= 18pt).
</div>
```

**Patch C: Cap nhat contrast table Section 55**

Tim bang contrast trong Section 55 (Token Cascade) va cap nhat:

| Token | Light | Dark | Light Ratio | Dark Ratio | Status |
|-------|-------|------|-------------|------------|--------|
| --text-primary | #1e293b | #f1f5f9 | 14.53:1 | 14.18:1 | ✅ AA |
| --text-secondary | #475569 | #94a3b8 | 7.14:1 | 5.71:1 | ✅ AA |
| --text-tertiary | #6b7280 | #64748b | 4.56:1 | 4.01:1 | ⚠️ AA large only |

LUU Y: Light --text-tertiary da doi tu `#94a3b8` sang `#6b7280` trong v4.5. Bang cu bao `#94a3b8` la SAI. Phai cap nhat.

**Patch D: Doi 10px hardcoded font sizes sang rem**

Them vao CSS block (hoac patch card) cac fix:
```css
/* TRUOC (hardcoded 10px) */
.tpl-meta { font-size: 10px; }
.chip { font-size: 10px; }
code { font-size: 10px; }
.spec-table th { font-size: 10px; }

/* SAU (relative units) */
.tpl-meta { font-size: 0.625rem; } /* 10px at 16px base, scales with zoom */
.chip { font-size: 0.625rem; }
code { font-size: 0.6875rem; } /* 11px — slightly larger for readability */
.spec-table th { font-size: 0.6875rem; }
```

VA them ghi chu:
```html
<div class="info-box info-box-green">
  <strong>DO — Dùng rem thay vì px cho font-size</strong>
  Tất cả font-size PHẢI dùng đơn vị <code>rem</code> để đảm bảo scaling đúng khi user thay đổi browser font size 
  hoặc zoom level. SC 1.4.4 yêu cầu text phải resize được đến 200% mà không mất nội dung.
</div>
```

**Patch E: Them @media (forced-colors: active) support**

Them vao CSS block (sau reduced-motion block):
```css
/* === FORCED COLORS (Windows High Contrast) === */
@media (forced-colors: active) {
  .chip, .badge, .tag {
    border: 1px solid ButtonText;
  }
  .btn-primary, .btn-danger {
    border: 2px solid ButtonText;
    forced-color-adjust: none; /* Giu mau nen cho buttons quan trong */
  }
  .status-indicator, .machine-status {
    border: 2px solid currentColor;
    /* Forced colors se thay the mau — them border de phan biet */
  }
  .info-box {
    border-left: 4px solid Highlight;
  }
  .card {
    border: 1px solid ButtonText;
  }
  /* SPC charts, OEE gauges — forced-color-adjust: none de giu mau data */
  .spc-chart, .oee-gauge, .chart-container {
    forced-color-adjust: none;
  }
}
```

Them section nho trong Section 63 (WCAG checklist) hoac Section 69:
```html
<div class="info-box info-box-blue">
  <strong>Forced Colors (Windows High Contrast)</strong>
  Hệ thống hỗ trợ <code>@media (forced-colors: active)</code> cho Windows High Contrast mode.
  Tất cả interactive elements có border rõ ràng, status badges có border phân biệt,
  và data visualization giữ nguyên màu qua <code>forced-color-adjust: none</code>.
  <br>SC 1.4.11 Non-text Contrast: tất cả UI components có contrast ≥ 3:1 trong mọi chế độ.
</div>
```

**Patch F: Toast auto-dismiss accessibility**

Them vao Section 30 (Toast) hoac tao patch card:
```html
<div class="info-box info-box-amber">
  <strong>WARNING — Toast auto-dismiss và screen readers</strong>
  Success toast auto-dismiss sau 3-5s. Screen reader users KHONG THE hover de pause timer.
  Quy tac:
  <ul>
    <li><code>role="status"</code> + <code>aria-live="polite"</code>: AT se doc khi co the — neu toast bien mat truoc khi AT doc, noi dung mat.</li>
    <li>Giai phap: giu toast trong <code>aria-live</code> container vinh vien (visible hoac hidden). AT doc tu container, khong phu thuoc vao visual toast.</li>
    <li>Error/warning toast PHAI persist — khong auto-dismiss. User phai manually dismiss.</li>
    <li>Keyboard: <code>F6</code> hoac shortcut de focus vao toast region. <code>Escape</code> dismiss.</li>
  </ul>
</div>
```

### Kiem tra sau khi xong
- Co quy tac lang="en"
- Dark mode --text-tertiary khac --text-secondary
- Contrast table cap nhat dung
- Font sizes dung rem
- Forced colors CSS co mat
- Toast accessibility documented

---

## PROMPT 6: CSS Polish & Manufacturing Additions → `mom/docs/tmp/v4.6-p6-polish.html`

### Muc tieu
Fix 7 P2 CSS token gaps va them 4 P2 manufacturing patterns. Day la lop cuoi cung truoc khi dat 100/100.

### Doc truoc khi lam
- File chinh: CSS block (dong 1-10), Section 8 (Spacing), Section 36 (Themes), Section 67 (Container Queries)

### Noi dung

Viet vao temp file `mom/docs/tmp/v4.6-p6-polish.html`.

**Patch A: Fix stale comment dong 10**

Doi:
```css
/* @container queries: planned for v4.4 */
```
Thanh:
```css
/* @container queries: implemented v4.5, tokens --cq-sm/md/lg/xl, live rules in Section 67 */
```

**Patch B: Spacing scale naming**

Trong Section 8 (Spacing), doi label:
```
Truoc: "base-4, 13 steps"
Sau: "4px unit, pragmatic 13-step scale"
```
Them ghi chu:
```html
<div class="info-box info-box-blue">
  <strong>Lưu ý</strong> Scale dựa trên đơn vị 4px nhưng một số bước (20px, 40px, 56px, 80px) 
  là giá trị pragmatic phù hợp với use cases thực tế, không strictly base-4 multiples.
</div>
```

**Patch C: Container query token consistency**

Tim live CSS @container rules (dong ~935-976) va doi cac hardcoded px values thanh var(--cq-*):
```css
/* TRUOC */
@container zone-main (min-width: 600px) { ... }
@container zone-sidebar (min-width: 200px) { ... }
@container zone-kpi (min-width: 480px) { ... }

/* SAU */
@container zone-main (min-width: var(--cq-lg)) { ... }  /* 600px */
@container zone-sidebar (min-width: var(--cq-sm)) { ... } /* 320px — closest token */
@container zone-kpi (min-width: var(--cq-md)) { ... }    /* 480px */
```

LUU Y QUAN TRONG: Kiem tra xem CSS container queries co chap nhan var() trong media conditions khong. Neu KHONG, giu hardcoded px nhung them comment:
```css
@container zone-main (min-width: 600px /* = --cq-lg */) { ... }
```

**Patch D: Them @container rules cho zone-chart-area va zone-footer**

Them CSS rules:
```css
@container zone-chart-area (min-width: 600px /* = --cq-lg */) {
  .chart-container { min-height: 320px; }
  .chart-legend { display: flex; flex-wrap: wrap; }
}
@container zone-chart-area (max-width: 599px) {
  .chart-container { min-height: 200px; }
  .chart-legend { display: none; } /* Show via expand button */
}

@container zone-footer (min-width: 480px /* = --cq-md */) {
  .footer-actions { display: flex; gap: var(--space-3); }
}
@container zone-footer (max-width: 479px) {
  .footer-actions { display: grid; grid-template-columns: 1fr; gap: var(--space-2); }
}
```

**Patch E: Hardcoded inline colors cleanup**

Tim va thay the cac non-sample hardcoded hex colors:
- `color:#64748b` trong layer diagrams → `color:var(--text-secondary)`
- `color:#2563eb` trong layer diagrams → `color:var(--color-info-600)`
- `color:#d97706` trong layer diagrams → `color:var(--color-warning-600)`
- `color:#16a34a` trong layer diagrams → `color:var(--color-success-600)`
- `color:#7c3aed` trong layer diagrams → `color:var(--color-purple-600)`

GIU NGUYEN cac hardcoded colors trong:
- Theme preview cards (intentional — show literal theme colors)
- Color palette swatches (intentional — show actual hex values)
- Gradient backgrounds trong .doc-header (branding, acceptable)

**Patch F: Theme token maps cho themes 6-20**

Trong Section 36 (Visual Themes), them rut gon token maps cho cac themes thieu:
```html
<!-- Theme 6: Ember Industrial -->
<div class="code-block">
<pre>{
  "themeId": "ember-industrial",
  "tokens": {
    "--brand-primary": "#c2410c",
    "--brand-light": "#fb923c",
    "--brand-dark": "#7c2d12",
    "--accent": "#f59e0b",
    "--bg-page": "#fffbeb",
    "--bg-surface": "#ffffff",
    "--text-primary": "#1c1917",
    "--text-secondary": "#57534e",
    "--border": "#d6d3d1"
  }
}</pre>
</div>
```
Lam tuong tu cho 14 themes con lai (7-20). Moi theme can it nhat 9 tokens: --brand-primary, --brand-light, --brand-dark, --accent, --bg-page, --bg-surface, --text-primary, --text-secondary, --border.

**Patch G: Shift Handover Pattern (Section moi 85)**

Tieu de: "Shift Handover — Giao ca sản xuất"
Label: `REFERENCE`

Noi dung:
1. Use case: Khi ca lam viec thay doi, operator can ban giao tinh trang may, WO dang chay, canh bao, ghi chu.
2. Form fields: Ca giao (shift outgoing), Ca nhan (shift incoming), May/Line, Tinh trang may, WO dang chay (status, % complete), Canh bao/Issues, Vat tu dang dung, Ghi chu dac biet, Chu ky giao/nhan.
3. Token table: Reuse existing tokens.
4. Cross-ref: ISA-18.2 alarm shelving during handover.

**Patch H: Offline/PWA Pattern (Section moi 86)**

Tieu de: "Hỗ trợ Offline & PWA cho Shop Floor"
Label: `TARGET`

Noi dung:
1. Stale data indicator: Khi du lieu cu hon X phut, hien thi badge `<span class="chip chip-amber">Dữ liệu cũ 5 phút</span>`.
2. Offline queue: Khi mat mang, ghi actions vao IndexedDB queue. Hien thi badge `<span class="chip chip-red">Offline — 3 actions pending</span>`.
3. Sync conflict: Khi reconnect, hien thi dialog conflict resolution (keep local / keep server / merge).
4. Token table: `--offline-indicator-bg`, `--stale-data-border`, `--sync-conflict-bg`.

**Patch I: COPQ Dashboard Contract (them vao Section 70 OEE hoac section moi)**

Them 1 sub-section hoac info-box:
```html
<div class="info-box info-box-blue">
  <strong>COPQ (Cost of Poor Quality) Dashboard Contract</strong>
  <ul>
    <li><strong>Formula:</strong> COPQ = Scrap Cost + Rework Cost + Warranty Cost + Inspection Labor + Sorting Cost</li>
    <li><strong>Data Sources:</strong> NCR (scrap/rework amounts), Customer Complaints (warranty), IQC (inspection hours), Sorting records</li>
    <li><strong>KPI Cards:</strong> Total COPQ ($), COPQ % Revenue, COPQ by Category (pie chart), COPQ Trend (line chart monthly)</li>
    <li><strong>Drill-down:</strong> Click category → list of contributing NCRs/complaints</li>
    <li><strong>Tokens:</strong> Reuse <code>--color-error-*</code> for cost indicators, <code>--chart-categorical-*</code> for pie</li>
  </ul>
</div>
```

### Kiem tra sau khi xong
- Stale comment fixed
- Spacing label chinh xac
- Container query tokens dung hoac co comment
- Inline colors thay the bang tokens
- 15 theme token maps them vao
- Shift handover section co mat
- Offline/PWA pattern co mat
- COPQ contract co mat

---

## PROMPT 7: Merge temp files vao file chinh

### Muc tieu
Merge tat ca temp files tu Prompt 2-6 vao file chinh. Prompt 1 da sua truc tiep file chinh roi.

### Buoc thuc hien

**Buoc 1**: Doc file chinh `mom/docs/module-layout-template-design-system-v4.html` (da co labels tu Prompt 1).

**Buoc 2**: Doc tat ca temp files:
- `mom/docs/tmp/v4.6-p2-archetypes.html` — 2 sections moi (79, 80)
- `mom/docs/tmp/v4.6-p3-build-packet.html` — 2 sections moi (81, 82)
- `mom/docs/tmp/v4.6-p4-qa-gates.html` — 2 sections moi (83, 84)
- `mom/docs/tmp/v4.6-p5-a11y.html` — patches cho sections hien co
- `mom/docs/tmp/v4.6-p6-polish.html` — patches + 2 sections moi (85, 86)

**Buoc 3**: Merge theo thu tu:

A. **Accessibility patches (P5)** — CHEN VAO sections hien co:
   - Patch A (lang="en") → Chen vao Section 32 (Internationalization)
   - Patch B (dark text fix) → Sua CSS block dong ~615-616 VA them info-box Section 7
   - Patch C (contrast table) → Sua bang trong Section 55
   - Patch D (10px→rem) → Sua CSS block (.tpl-meta, .chip, code, .spec-table th)
   - Patch E (forced-colors) → Them CSS block SAU reduced-motion
   - Patch F (toast a11y) → Chen vao Section 30 (Toast)

B. **CSS Polish patches (P6)** — CHEN VAO sections hien co:
   - Patch A (stale comment) → Sua dong 10
   - Patch B (spacing label) → Sua Section 8
   - Patch C (CQ tokens) → Sua CSS @container rules
   - Patch D (CQ new zones) → Them CSS @container rules
   - Patch E (inline colors) → Sua inline styles throughout
   - Patch F (theme maps) → Them vao Section 36

C. **New sections** — CHEN TRUOC Section 78 (Changelog):
   - Section 79: Module Archetypes (tu P2)
   - Section 80: Template Naming Standard (tu P2)
   - Section 81: Module Build Packet (tu P3)
   - Section 82: Block Contract Enhancement (tu P3)
   - Section 83: QA Gate Matrix (tu P4)
   - Section 84: Definition of Done (tu P4)
   - Section 85: Shift Handover (tu P6)
   - Section 86: Offline/PWA (tu P6)
   - COPQ info-box chen vao Section 70 (tu P6)

D. **Cap nhat numbering**:
   - Section 78 (Changelog cu) → Section 87
   - Cap nhat TOC cho 87 sections
   - Cap nhat section-number spans

E. **Cap nhat Changelog (section 87 moi)**:
```html
<div class="info-box info-box-blue" style="margin-bottom:18px">
  <strong>v4.6 (2026-04-11)</strong>
  Standard 36 alignment: Implementation status labels on all 87 sections. 
  14 module archetypes with zone mapping. Module build packet (24 fields). 
  Block contract enhancement (14 fields with data-table example). 
  QA gate matrix expanded to 19 blocking gates. Definition of Done (27 items).
  Template naming standard (T-archetype-domain-variant).
  Accessibility: lang="en" guidance, dark text-tertiary fix, contrast table update, 
  rem font sizes, forced-colors support, toast accessibility.
  CSS: stale comment fix, spacing label, CQ token consistency, 
  inline color cleanup, theme token maps for all 20 themes.
  Manufacturing: Shift handover pattern, offline/PWA pattern, COPQ dashboard contract.
</div>
```

F. **Cap nhat footer stats**:
```
HESEM MOM — Module Layout Template Design System v4.6 Enterprise — 123 templates · 95+ block types · 20 visual themes · 30 component presets · 34 modules · 380+ CSS custom properties · 87 sections — 2026-04-11
```

G. **Cap nhat self-audit evidence table** (Section 87):
Them cac rows moi:
| Gate | Result | Evidence |
|------|--------|----------|
| Status labels | Pass | All 87 sections labeled ENFORCED NOW/PARTIAL/TARGET/REFERENCE |
| Module archetypes | Pass | 14 archetypes defined with zones, templates, examples |
| Build packet | Pass | 24-field specification with NCR example |
| Block contracts | Pass | 14-field contract with data-table full example |
| QA gate matrix | Pass | 19 gates documented with tools, criteria, status |
| Definition of done | Pass | 27-item checklist with gate mapping |
| Accessibility hardening | Pass | lang, forced-colors, rem fonts, contrast table fixed |
| Standard 36 alignment | Pass | All major requirements addressed |

**Buoc 4**: Verify:
- Moi section co status label chip
- Section numbering lien tuc 1-87
- TOC khop voi sections
- Khong co content bi mat hoac duplicate
- Version la v4.6
- Date chinh xac

### Kiem tra sau khi xong
- File co ~12000+ dong
- 87 sections
- Tat ca sections co labels
- TOC day du
- Changelog cap nhat

---

## PROMPT 8: Final Validation

### Muc tieu
Kiem tra toan bo file v4.6 sau khi merge. Dam bao khong co regressions va dat muc tieu 100/100.

### Buoc thuc hien

**Buoc 1**: Doc TOAN BO file chinh `mom/docs/module-layout-template-design-system-v4.html`.

**Buoc 2**: Chay checklist:

#### A. Structure (10 items)
- [ ] Version la v4.6 trong title, header, footer, meta
- [ ] Date la ngay hien tai
- [ ] Section numbering lien tuc 1-87
- [ ] TOC khop voi sections (moi section co entry)
- [ ] Khong co duplicate section IDs
- [ ] Khong co broken internal links (#id references)
- [ ] Footer stats chinh xac (sections, tokens, templates)
- [ ] Changelog co entry v4.6 day du
- [ ] Self-audit evidence table cap nhat
- [ ] Production Authority Notice van con

#### B. Standard 36 Alignment (8 items)
- [ ] TAT CA sections co status label chip (ENFORCED NOW/PARTIAL/TARGET/REFERENCE/DEPRECATED)
- [ ] 14 module archetypes co mat voi zones, templates, vi du
- [ ] Template naming standard co pattern + mapping examples
- [ ] Module build packet 24 fields co vi du JSON
- [ ] Block contract 14 fields co vi du data-table
- [ ] QA gate matrix 19 gates co tools + criteria + status
- [ ] Definition of Done 27 items co gate mapping
- [ ] Cross-references toi Standard 36 co mat

#### C. CSS Tokens (7 items)
- [ ] Dong 10 comment cap nhat (khong con "planned for v4.4")
- [ ] Spacing label "4px unit, pragmatic scale" (khong con "base-4")
- [ ] @container rules dung tokens hoac co comments
- [ ] zone-chart-area va zone-footer co @container rules
- [ ] 10px font sizes doi sang rem (0.625rem hoac 0.6875rem)
- [ ] @media (forced-colors: active) co mat
- [ ] Dark --text-tertiary la #64748b (KHAC voi --text-secondary #94a3b8)

#### D. Accessibility (6 items)
- [ ] lang="en" guidance co trong Section 32
- [ ] Contrast table Section 55 bao gia tri chinh xac (#6b7280 cho light tertiary)
- [ ] Toast accessibility guidance co mat
- [ ] Forced colors CSS co mat
- [ ] rem font sizes cho .tpl-meta, .chip, code
- [ ] SC 3.1.2 (lang), SC 1.4.11 (forced-colors) addressed

#### E. Manufacturing (4 items)
- [ ] Shift handover section co mat
- [ ] Offline/PWA section co mat
- [ ] COPQ dashboard contract co mat
- [ ] Theme token maps cho 20/20 themes

#### F. Content Quality (5 items)
- [ ] Vietnamese text co dau day du
- [ ] Code examples chinh xac va chay duoc
- [ ] DO/DON'T boxes co noi dung cu the
- [ ] Cross-reference links dung
- [ ] Khong co placeholder text hoac TODO comments

**Buoc 3**: Neu co bat ky item nao FAIL, fix ngay trong file chinh.

**Buoc 4**: Xac nhan:
```html
<!-- VALIDATION STAMP -->
<!-- v4.6 validated: 87 sections, 380+ CSS tokens, ~12000 dong -->
<!-- Standard 36 alignment: FULL — archetypes, build packets, block contracts, QA gates, DoD, status labels -->
<!-- P0: 0 remaining. P1: 0 remaining. P2: 0 remaining. -->
<!-- Target score: 100/100 across all 5 expert areas -->
```

### Kiem tra sau khi xong
- 40/40 checklist items pass
- Khong co TODO/placeholder
- File render chinh xac trong browser

---

## TOM TAT EXECUTION

```
Prompt 1 (Sua truc tiep — status labels + version) 
    ↓
Prompt 2 (Archetypes) ─────────┐
Prompt 3 (Build Packets) ──────┤ Song song
Prompt 4 (QA Gates) ───────────┤
Prompt 5 (Accessibility) ──────┤
Prompt 6 (CSS + Manufacturing) ┘
    ↓
Prompt 7 (Merge tat ca temp files)
    ↓
Prompt 8 (Final Validation)
```

**Tong cong**: 8 prompts
- Prompt 1: ~30 phut (78 sections can label)
- Prompt 2-6: ~15-20 phut moi prompt (chay song song)
- Prompt 7: ~30 phut (merge phuc tap)
- Prompt 8: ~15 phut (validation)

**Muc tieu diem sau v4.6**:
| Expert | v4.5 | v4.6 Target |
|--------|------|-------------|
| CSS Token | 93 | 98+ |
| Component | 87 | 97+ |
| Manufacturing | 91 | 96+ |
| Accessibility | 93 | 98+ |
| Architecture (Standard 36) | 49 | 95+ |
| **Average** | **82.6** | **97+** |

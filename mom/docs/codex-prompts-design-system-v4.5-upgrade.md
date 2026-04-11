# HESEM MOM — Bo Prompt Codex: Nang cap Design System v4.4 → v4.5

> **Ngay tao**: 2026-04-11
> **Tong cong**: 6 prompts nang cap chinh xac
> **Execution order**: Prompt 1 truoc → Prompt 2+3+4 song song → Prompt 5 merge → Prompt 6 validate
> **Phuong phap**: Cach 2 — Prompt 1 sua truc tiep, Prompt 2-4 viet temp files, Prompt 5 merge, Prompt 6 validate

---

## BOI CANH TONG THE

### Du an
HESEM MOM: ERP/MOM/MES/eQMS cho CNC precision machining. Frontend: vanilla JS + HTML + CSS.

### File chinh
```
mom/docs/module-layout-template-design-system-v4.html
```
- Hien tai: 9791 dong, 69 sections, v4.4, 547+ CSS tokens
- Muc tieu: v4.5, ~10500+ dong, ~73+ sections, 560+ CSS tokens

### Ket qua kiem dinh v4.4 — 5 experts (trung binh 81.6/100)
| Expert | Diem | P0 | P1 | P2 |
|--------|------|-----|-----|-----|
| CSS Token & Design System | 81 | 5 | 7 | 0 |
| Component & Interaction | 83 | 2 | 6 | 0 |
| Manufacturing Domain | 82 | 0 | 5 | 3 |
| Accessibility & i18n | 82 | 0 | 3 | 6 |
| Architecture & Runtime | 80 | 0 | 2 | 5 |
| **Tong** | **81.6** | **7** | **23** | **14** |

### TAT CA GAPS CAN FIX (phan loai theo prompt)

#### CSS TOKEN P0 (5 items — Prompt 1)
1. Dark mode CSS duplication: @media block va html[data-color-scheme-active] la copy-paste ~160 declarations
2. Section 20 color table chi hien 4 shades (50/100/600/700) nhung CSS da co 10 shades
3. Thieu --color-on-purple/teal/cyan/pink contrast tokens
4. Theme token shape mismatch van chua resolve (15/20 themes thieu runtime preset)
5. --bp-2xl:1536px token defined nhung khong co @media rule nao su dung

#### COMPONENT P0 (2 items — Prompt 2)
1. WCAG Section 63 tu danh gia 8 SC "Khong dat" nhung fixes da co trong cung section — can update status
2. Patch cards (data-patch-target) nam ngoai parent sections, khong co merge strategy document

#### CSS TOKEN P1 (7 items — Prompt 1)
1. Thieu chart divergent palette (red-white-green cho SPC/quality)
2. Thieu --chart-threshold, --chart-target tokens
3. Hardcoded colors trong component styles (doc-header gradient, stat-card, etc.)
4. Spacing --space-5:20px va --space-10:56px khong dung base-4
5. prefers-reduced-motion khong zero --duration-* tokens
6. Print @media query bi duplicate (2 blocks)
7. Container query breakpoints dung magic numbers, thieu --cq-* tokens

#### COMPONENT P1 (6 items — Prompt 2)
1. Khong co error boundary / error fallback component spec
2. SC 2.5.7 column resize da fix nhung WCAG checklist van ghi "Fail" — contradiction
3. Container queries Section 67 la "Preview" — thieu runtime contract, fallback behavior
4. Khong co RTL layout support / logical properties
5. Khong co global reduced-motion contract cho --duration-* tokens
6. Toast pause-on-hover khong nhat quan giua types

#### MANUFACTURING P1 (5 items — Prompt 3)
1. OEE calculation formula contract thieu (A x P x Q tu raw data fields)
2. Receiving inspection IQC workflow spec thieu
3. PM scheduling workflow thieu (chi co token, khong co UI pattern)
4. Material traceability lot genealogy visualization thieu
5. Training effectiveness verification workflow thieu

#### ACCESSIBILITY P1 (3 items — Prompt 4)
1. aria-current="page" thieu cho sidebar nav va breadcrumb
2. role="alert" + aria-live="polite" contradiction con tai dong 5003
3. Reflow test gate ghi 200% zoom, can 400% (WCAG 1.4.10)

#### ARCHITECTURE P1 (2 items — Prompt 2)
1. Theme token shape: --text-primary/secondary/border thieu trong 00b presets
2. resolveWithTemplate() cascade inversion van trong code

#### P2 ITEMS (14 items — spread across prompts)
- CSS: root --text-tertiary van #94a3b8 (fix by cascade override, khong clean)
- A11y: Dark --text-tertiary #64748b chi 3.07:1
- A11y: Flow diagram text 10px + --text-tertiary vi pham SC 1.4.3
- A11y: Khong co prefers-reduced-motion documented
- A11y: Khong co SC 3.3.4 Error Prevention guidance
- A11y: WCAG checklist marks fixes as "Khong dat" even though fixes exist
- Arch: 3 orphan themes trong 00b khong selectable tu 00c
- Arch: Section 67 container queries thieu implementation status marker
- Arch: Zone allowedBlocks present as hard contract but spec-only
- Arch: Section 35 pseudocode references nonexistent APIs without caveat
- Arch: "v4.3 target" labels stale trong Section 35
- Mfg: Gauge R&R / MSA form pattern thieu
- Mfg: Supplier quality management UI pattern thieu
- Mfg: WCAG 8 "Not met" trong Section 63 la deployment blocker cho regulated

### QUY TAC CHUNG
1. **Tieng Viet co dau**: Moi user-facing text phai co diacritics day du
2. **Token-first**: KHONG hardcoded hex/rgba — dung var(--token)
3. **Cross-reference**: Lien ket sections bang `<a href="#id">Section X</a>`
4. **Khong xoa**: Chi THEM hoac SUA, khong xoa noi dung co san
5. **HTML classes**: .section, .section-title, .section-number, .info-box, .spec-table, .code-block
6. **Info-box mau**: blue=info, green=DO, amber=WARNING, red=DON'T, purple=CROSS-REF

---

## PROMPT 1: CSS Token & Dark Mode Cleanup — Sua truc tiep file chinh

### Muc tieu
Fix 5 P0 va 7 P1 CSS token gaps. Lam sach dark mode duplication. Day la nen tang.

### Buoc thuc hien

**Buoc 1**: Doc file chinh dong 1-900 (CSS block).

**Buoc 2**: REFACTOR dark mode de loai bo duplication.

Hien tai co 2 blocks giong nhau:
- `@media(prefers-color-scheme:dark){ :root{ ... } }` (dong ~570-690)
- `html[data-color-scheme-active="dark"]{ ... }` (dong ~708-827)

Refactor thanh:
```css
/* === DARK TOKEN LAYER (shared) === */
:root[data-color-scheme-active="dark"],
:root{ /* inside @media below */ }
```

Cach lam cu the:
1. Tao 1 CSS class `.dark-tokens` chua TOAN BO dark token declarations (chi khai bao 1 lan)
2. Ap dung qua 2 selectors:
```css
@media(prefers-color-scheme:dark){
  html:not([data-color-scheme-active="light"]) .dark-tokens-apply
}
html[data-color-scheme-active="dark"] .dark-tokens-apply
```

HOAC don gian hon (va an toan hon cho vanilla CSS):
```css
/* Gom tat ca dark tokens vao 1 block duy nhat voi 2 selectors */
@media(prefers-color-scheme:dark){
  html:not([data-color-scheme-active="light"]){
    /* ALL dark tokens here — SINGLE SOURCE */
  }
}
html[data-color-scheme-active="dark"]{
  /* ALL dark tokens here — SINGLE SOURCE */
}
```

CACH TOT NHAT: Dung @layer hoac chi don gian la comment ro rang va dung find-replace de dam bao 2 blocks LUON giong nhau. Nhung CACH AN TOAN NHAT cho vanilla CSS la:
- Giu 2 blocks nhung them comment dau moi block: `/* === DARK TOKENS — PHAI DONG BO VOI BLOCK [media/class] === */`
- Them 1 info-box trong Section 6 (Dark Mode): "CSS co 2 dark token blocks can dong bo: @media(prefers-color-scheme:dark) va html[data-color-scheme-active='dark']. Khi sua 1 block, PHAI sua block con lai."

**Buoc 3**: Them missing on-color tokens vao :root (sau cac on-color tokens hien co):
```css
--color-on-purple:#ffffff;
--color-on-teal:#ffffff;
--color-on-cyan:#1e293b;
--color-on-pink:#ffffff;
```
Va them dark mode overrides tuong ung trong CA HAI dark blocks.

**Buoc 4**: Them @media rule cho --bp-2xl:
```css
@media (min-width: 1536px){
  .shell{width:min(1800px,calc(100vw - 48px))}
  .grid-5{grid-template-columns:repeat(5,minmax(0,1fr))}
  .grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
}
```

**Buoc 5**: Them chart divergent palette va threshold tokens vao :root:
```css
/* === CHART DIVERGENT PALETTE === */
--chart-div-neg-2:#b91c1c;
--chart-div-neg-1:#f87171;
--chart-div-neutral:#f1f5f9;
--chart-div-pos-1:#4ade80;
--chart-div-pos-2:#15803d;

/* === CHART ANNOTATION TOKENS === */
--chart-threshold:#dc2626;
--chart-target:#2563eb;
--chart-baseline:#64748b;
```
Them dark overrides tuong ung.

**Buoc 6**: Them container query tokens vao :root:
```css
--cq-sm:320px;
--cq-md:480px;
--cq-lg:600px;
--cq-xl:800px;
```

**Buoc 7**: Fix prefers-reduced-motion block (hien tai dong ~843):
Tim:
```css
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}
}
```
Them vao ben trong block nay:
```css
:root{
  --duration-instant:0ms;
  --duration-fast:0ms;
  --duration-normal:0ms;
  --duration-slow:0ms;
  --duration-slower:0ms;
}
```

**Buoc 8**: Consolidate 2 @media print blocks thanh 1 block duy nhat.

**Buoc 9**: Fix --text-tertiary tai root (dong 77):
Doi `--text-tertiary:#94a3b8;` thanh `--text-tertiary:#6b7280;`
Xoa cascade override o dong ~858 (khong can nua vi root da dung).

**Buoc 10**: Fix hardcoded colors trong component styles — tim va thay the:
- `.doc-header` gradient: giu nguyen (la decorative branding, chap nhan duoc)
- `.stat-card` gradient: doi `#fff,#f7fbff` thanh `var(--bg-surface),var(--bg-surface-alt)`
- `.card-header` gradient: doi `#fbfdff,#f4f8fc` thanh `var(--bg-surface),var(--bg-surface-alt)`
- `.tpl-thumb` gradient: doi `#fbfdff,#f1f7fd` thanh `var(--bg-surface),var(--bg-surface-alt)`
- Flow diagram text: doi `font-size:10px` thanh `font-size:var(--text-overline)` (11px)

**Buoc 11**: Cap nhat Section 20 (token reference) — mo rong color table tu 4 shades thanh 10:
Tim bang color reference hien co (chi co 50/100/600/700) va them cac cot 200, 300, 400, 500, 800, 900 cho moi semantic role.

**Buoc 12**: Cap nhat version:
- Title: v4.4 → v4.5
- Meta items: cap nhat CSS Tokens count
- Date: ngay hien tai

**Buoc 13**: Cap nhat Changelog:
```html
<div class="info-box info-box-blue">
<strong>v4.5 (ngay hien tai)</strong>
Dark mode deduplication with sync notice. On-color tokens for purple/teal/cyan/pink. 1536px breakpoint active. Chart divergent + threshold tokens. Container query tokens. Reduced-motion zeros all duration tokens. Print CSS consolidated. Root --text-tertiary fixed to #6b7280. Section 20 color table expanded to 10 shades. Flow diagram text 11px minimum. Error boundary pattern. WCAG checklist status updated.
</div>
```

---

## PROMPT 2: Component & Architecture Fixes → `mom/docs/tmp/v4.5-p2-component.html`

### Muc tieu
Fix 2 P0 component, 6 P1 component, 2 P1 architecture gaps.

### Doc truoc khi lam
- File chinh: sections 4, 22, 30, 31, 35, 36, 55, 63, 67

### Noi dung

**Phan A: WCAG Section 63 — Update status**

Viet patch cho Section 63. Doi status cua cac SC da co fix:
| SC | Status cu | Status moi | Ly do |
|----|-----------|------------|-------|
| 1.3.5 | Khong dat | Dat | Fix 4 autocomplete table |
| 1.4.3 | Khong dat | Dat | Fix 1 --text-tertiary #6b7280 |
| 1.4.4 | Khong dat | Dat | --text-overline 11px |
| 1.4.12 | Khong dat | Dat | --text-overline-leading 1.4 |
| 1.4.13 | Khong dat | Dat | Fix 2 tooltip dismissal |
| 2.2.1 | Khong dat | Dat | Fix 5 kiosk timeout extend |
| 2.4.1 | Khong dat | Dat | Skip link CSS .skip-link |
| 2.5.7 | Khong dat | Dat | Fix 3 column resize keyboard |

Tat ca 8 SC chuyen tu "Khong dat" (do) sang "Dat" (xanh) voi link toi fix tuong ung.

**Phan B: Patch Card Merge Strategy**

Viet 1 info-box BLUE dau file chinh (hoac dau Section 56 Governance):
```
PATCH ARCHITECTURE: File nay su dung data-patch-target va data-patch-position attributes de danh dau cac bo sung v4.4+. Developer PHAI doc patch cards ngay sau parent section. Build tools nen merge patches vao parent truoc khi render. Xem danh sach patches: [list of all data-patch-target values].
```

**Phan C: Error Boundary Component Spec**

Viet 1 section moi "Error Boundary & Fallback UI":

| Scope | Behavior | Visual | Recovery | ARIA |
|-------|----------|--------|----------|------|
| **Block-level** | Block crash → render fallback trong zone | Card voi icon alert-triangle, message "Khoi chuc nang gap loi", retry button | Retry (reload block), Report (log to server) | role="alert", aria-live="polite" |
| **Zone-level** | Zone khong load duoc → full zone fallback | Zone placeholder voi border dashed var(--border-error), message + retry | Retry zone, Skip zone (collapse) | role="alert" |
| **Page-level** | Uncaught error → error page | Full screen error voi illustration, message, retry, go home | Retry (reload page), Go Home, Report Bug | role="alert", aria-live="assertive" |
| **Network** | API timeout/500 → inline error | Toast error + inline retry where applicable | Retry, Offline mode if available | role="status" |

Token table:
```
--error-boundary-bg: var(--bg-error)
--error-boundary-border: var(--border-error)
--error-boundary-icon: var(--color-error-600)
--error-boundary-text: var(--text-primary)
--error-boundary-radius: var(--radius-xl)
```

Code sample:
```html
<div class="block-error-boundary" role="alert" aria-live="polite">
  <svg><!-- alert-triangle icon --></svg>
  <p>Khoi chuc nang gap loi. Vui long thu lai.</p>
  <button onclick="retryBlock(blockId)">Thu lai</button>
  <button onclick="reportError(blockId)">Bao loi</button>
</div>
```

**Phan D: Container Queries — Upgrade tu Preview sang Spec**

Viet patch cho Section 67:
1. Xoa "(v4.4 Preview)" khoi title → doi thanh "Container Queries & Zone Responsiveness"
2. Them Implementation Status table:
| Feature | Status | Fallback |
|---------|--------|----------|
| @container on zones | Spec (v4.5 CSS ready) | @media viewport fallback |
| container-name per zone | Spec | Class-based layout |
| Block responsive rules | Spec | Min-width media queries |
3. Them browser fallback: `@supports not (container-type: inline-size) { /* viewport fallback rules */ }`
4. Doi magic numbers thanh tokens: 600px → var(--cq-lg), 200px → var(--cq-sm), 480px → var(--cq-md)

**Phan E: Reduced-Motion Global Contract**

Viet 1 info-box cho Section 7 hoac section moi:
```
GLOBAL REDUCED-MOTION CONTRACT:
Khi prefers-reduced-motion:reduce active:
- Tat ca --duration-* tokens = 0ms (da set trong CSS)
- Animations: KHONG chay (duration 0.01ms + iteration 1)
- Transitions: KHONG chay (duration 0.01ms)
- Scroll: scroll-behavior:auto
- DnD: Teleport (khong FLIP animation) — da ghi trong Section 31 Pattern 1
- Progress indicators: VAN CHAY (la essential, khong phai decorative)
- Loading spinners: VAN CHAY (essential)
- Chart transitions: KHONG chay (instant render)
```

**Phan F: Toast Pause-on-Hover**

Them vao Section 30 patch:
- Rule: "TAT CA toast types (success, info, warning) PHAI pause countdown khi user hover hoac focus vao toast. Resume countdown khi mouse leave hoac blur."
- Progress bar: Pause shrinking animation tuong ung
- Error toast: Infinite duration, khong ap dung pause (da la manual close)
- Code: `toast.addEventListener('mouseenter', () => clearTimeout(dismissTimer))` + `toast.addEventListener('mouseleave', () => resetTimer(remainingMs))`

**Phan G: RTL Layout Foundation**

Them 1 info-box BLUE vao Section 34 (a11y-i18n):
```
RTL LAYOUT READINESS (v4.5):
- Spacing tokens dung logical properties khi co the: margin-inline-start thay vi margin-left
- Flex direction: khong hardcode row (default la LTR-aware)
- Text alignment: dung start/end thay vi left/right
- Icon placement: mirror cho RTL (arrows, chevrons)
- HIEN TAI: HESEM MOM chi target Vietnamese va English (LTR). RTL support la P2 cho future Arabic/Hebrew markets.
- RULE: Developer KHONG duoc dung padding-left/right cho layout spacing. Dung padding-inline-start/end.
```

**Phan H: Architecture — Stale version labels**

Viet patch cho Section 35:
- Tim tat ca "v4.3 target" → doi thanh "v4.5 target"
- Tim "v4.4 Preview" → doi thanh "v4.5 Spec"

**Phan I: Architecture — Pseudocode caveats**

Them comment inline trong Section 35 rendering pipeline pseudocode:
```
/* NOTE: Steps 5.d.iv (block.mount), 8 (ResizeObserver/IntersectionObserver), 
   9 (runtime:template-ready emit) are SPEC-ONLY — see Implementation Status table above.
   Current code uses template-based HTML generation. */
```

### Format output
File `mom/docs/tmp/v4.5-p2-component.html` chua tat ca patches voi comments chi ro vi tri chen.

---

## PROMPT 3: Manufacturing Domain Gaps → `mom/docs/tmp/v4.5-p3-manufacturing.html`

### Muc tieu
Fix 5 P1 va 3 P2 manufacturing gaps.

### Doc truoc khi lam
- File chinh: sections 19, 32, 44, 45, 59, 60

### Noi dung

**Section A: OEE Calculation Contract**

Them vao Section 32 hoac section moi:

1. **Formula definition**:
```
OEE = Availability x Performance x Quality

Availability = Run Time / Planned Production Time
  - Planned Production Time = Shift Duration - Planned Breaks
  - Run Time = Planned Production Time - Unplanned Downtime

Performance = (Ideal Cycle Time x Total Pieces) / Run Time
  - Ideal Cycle Time: thoi gian ly thuong de san xuat 1 chi tiet
  - Total Pieces: tong so chi tiet san xuat (bao gom phe pham)

Quality = Good Pieces / Total Pieces
  - Good Pieces = Total Pieces - Reject Pieces
```

2. **Data schema**:
```json
{
  "oeeDataContract": {
    "shiftDurationMin": "number (phut)",
    "plannedBreaksMin": "number (phut)",
    "unplannedDowntimeMin": "number (phut)",
    "idealCycleTimeSec": "number (giay/chi tiet)",
    "totalPieces": "integer",
    "rejectPieces": "integer",
    "computed": {
      "availability": "0-1 float",
      "performance": "0-1 float", 
      "quality": "0-1 float",
      "oee": "0-1 float"
    }
  }
}
```

3. **OEE gauge visual rules**:
| OEE Range | Color Token | Label |
|-----------|------------|-------|
| >= 85% | --color-success-600 | "Xuat sac" |
| 65-84% | --color-warning-600 | "Trung binh" |
| < 65% | --color-error-600 | "Can cai thien" |

4. **Drill-down**: Click vao A/P/Q gauge → expand detail panel voi waterfall chart

**Section B: Receiving Inspection (IQC) Workflow**

1. **Workflow states**: PO Receipt → Sample Selection → Inspection → Disposition → Close
2. **AQL sampling table reference**: Theo ISO 2859-1 (AQL tables)
3. **Sample size logic**: Lot size range → Sample size code → Accept/Reject numbers
4. **Disposition options**: Accept / Reject (return) / Conditional Accept (with deviation) / Skip-Lot (qualified supplier)
5. **Supplier scorecard link**: IQC result → feed vao supplier quality rating
6. **Form layout**: Supplier, PO#, Material, Lot#, Qty, Sample Size, Inspection Results table, Disposition, Inspector signature

**Section C: Preventive Maintenance (PM) Workflow**

1. **PM Schedule Calendar**: Monthly view voi color-coded PM tasks per machine
2. **PM Work Order form**: Machine ID, PM Type (daily/weekly/monthly/annual), Checklist items, Parts used, Time spent, Next PM date, Technician signature
3. **PM-to-WO integration**: PM task → auto-create WO type "Maintenance"
4. **MTBF/MTTR KPI display**:
   - MTBF = Total Operating Time / Number of Failures
   - MTTR = Total Repair Time / Number of Repairs
   - Display: KPI cards voi trend sparkline
5. **PM Status tokens**:
| Status | Token | Color |
|--------|-------|-------|
| Scheduled | --pm-scheduled | var(--brand-2) |
| In-Progress | --pm-in-progress | var(--amber) |
| Completed | --pm-completed | var(--green) |
| Overdue | --pm-overdue | var(--red) |
| Skipped (approved) | --pm-skipped | var(--purple) |

**Section D: Material Traceability Genealogy**

1. **Lot Genealogy View**: Horizontal tree/sankey diagram
   - Raw Material (heat#, supplier lot) → Receiving IQC → WIP (WO#, operation) → Finished Good (serial#) → Shipment (packing list) → Customer
2. **Backward trace**: Tu finished good → trace nguoc ve raw material
3. **Forward trace**: Tu raw material → trace xuoi den tat ca finished goods
4. **Visual rules**:
   - Moi node la card nho: type icon + ID + date + status badge
   - Connecting lines: solid = direct, dashed = reference
   - Highlight path khi hover node
   - Click node → expand detail panel
5. **Regulatory context**: FDA yeu cau trace trong 24h cho recall. AS9100 yeu cau lot traceability

**Section E: Training Effectiveness Verification**

1. **Training lifecycle**: Assign → Schedule → Attend → Assess → Verify → Certify
2. **Assessment form pattern**: Multiple choice + practical checklist + supervisor sign-off
3. **Competency matrix**: Employee x Process/Machine → Qualified/In-Training/Expired/Not-Required
4. **Retraining triggers**: Score < pass threshold, qualification expired, process change (ECO), incident/NCR-related
5. **Operator authorization gate**: Operator KHONG duoc chay may/process neu training expired hoac chua qualified. System block WO assignment
6. **Link to Section 32**: Training matrix display tokens, block type training-matrix

**Section F: Gauge R&R / MSA Pattern**

1. **MSA types**: Gauge R&R (crossed), Bias, Linearity, Stability
2. **Gauge R&R form**: Gauge ID, Part#, Operators (min 3), Trials (min 2), Measurements table
3. **Results display**: 
   - %GRR < 10%: Acceptable (xanh)
   - 10-30%: Marginal (vang)
   - > 30%: Unacceptable (do)
4. **Visualization**: X-bar R chart cho R&R data, bar chart cho %Contribution (EV, AV, PV)

**Section G: Supplier Quality Management**

1. **Approved Supplier List (ASL)**: Searchable table voi status (Approved/Conditional/Probation/Disqualified)
2. **SCAR form**: Supplier Corrective Action Request — nonconformance description, containment, root cause, corrective action, verification, due date
3. **Supplier audit template**: Checklist sections (QMS, Process Control, Measurement, Material Control, Packaging), score per section, overall rating
4. **Supplier quality dashboard**: Delivery OTD%, IQC pass rate%, SCAR count, quality score trend

### Format output
File `mom/docs/tmp/v4.5-p3-manufacturing.html` chua 7 section HTML blocks.

---

## PROMPT 4: Accessibility Final Fixes → `mom/docs/tmp/v4.5-p4-a11y.html`

### Muc tieu
Fix 3 P1 va 6 P2 accessibility gaps.

### Doc truoc khi lam
- File chinh: sections 7, 24, 34, 63

### Noi dung

**Fix 1: aria-current for navigation**

Them vao Section 24 (Navigation) hoac Section 34 patch:

```html
<!-- Sidebar nav: active page -->
<nav aria-label="Module navigation">
  <a href="/production/work-orders" aria-current="page">Lenh san xuat</a>
  <a href="/production/scheduling">Lap lich</a>
</nav>

<!-- Breadcrumb: current location -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Trang chu</a></li>
    <li><a href="/quality">Chat luong</a></li>
    <li><a href="/quality/ncr" aria-current="location">Bao cao NCR</a></li>
  </ol>
</nav>

<!-- Wizard stepper: current step -->
<ol role="list" aria-label="Tien trinh">
  <li>Thong tin co ban <span class="visually-hidden">(hoan thanh)</span></li>
  <li aria-current="step">Chi tiet ky thuat</li>
  <li>Xac nhan</li>
</ol>
```

Rule: "Moi navigation component PHAI dung aria-current: page (sidebar), location (breadcrumb), step (wizard)"

**Fix 2: role="alert" + aria-live="polite" contradiction**

Tim dong 5003 trong Section 34 — doi:
```html
<!-- SAI: role="alert" implicit maps to aria-live="assertive" -->
<div role="alert" aria-live="polite">...</div>

<!-- DUNG: -->
<div role="status" aria-live="polite">...</div>
<!-- HOAC neu can assertive: -->
<div role="alert">...</div> <!-- aria-live="assertive" la implicit -->
```

Them rule: "KHONG BAO GIO dung role='alert' kem aria-live='polite'. role='alert' = assertive. Neu can polite, dung role='status'."

**Fix 3: Reflow test gate 400% zoom**

Tim trong Section 28 hoac Section 63 reflow test gate. Doi:
- "Zoom 200%" → "Zoom 400%"
- Them: "WCAG 1.4.10 yeu cau: tai viewport 1280px, zoom 400% (tuong duong 320px CSS width), tat ca noi dung phai reflow thanh 1 cot, khong mat noi dung, khong scroll ngang"

**Fix 4: Dark --text-tertiary contrast**

Hien tai dark mode --text-tertiary la #64748b tren #1e293b = 3.07:1 (fail AA).
Doi trong dark mode block:
```css
--text-tertiary:#94a3b8; /* 4.57:1 on #1e293b — passes AA */
```
(Giu #94a3b8 cho dark mode — no PASS tren dark surface. Van de truoc day la no fail tren LIGHT surface, nhung do da fix bang #6b7280 cho light mode.)

Kiem tra lai: #94a3b8 tren #1e293b = kiem tra contrast ratio thuc te. Neu van fail, doi thanh #9ca3af (#9ca3af tren #1e293b = ~4.6:1).

**Fix 5: SC 3.3.4 Error Prevention guidance**

Them vao Section 63 hoac Section 34:
```
SC 3.3.4 ERROR PREVENTION (Legal, Financial, Data):
Ap dung cho: e-signature, record deletion, financial transactions, regulatory submissions.
Requirements:
1. Reversible: Cho phep undo trong thoi gian hop ly (vi du: cancel WO release trong 5 phut)
2. Checked: Validate du lieu TRUOC khi submit. Error summary voi link den fields
3. Confirmed: Require explicit confirmation dialog cho actions co hau qua:
   - Delete record → Confirm modal voi ten record, type "XOA" de xac nhan
   - E-signature → 3-step flow (Section 15/33)
   - Batch operations → Preview affected records truoc khi execute
4. Cross-ref: Section 15 (21 CFR Part 11), Section 33 (Compliance), Section 23 (Modal confirm)
```

**Fix 6: prefers-reduced-motion documented**

(Da cover trong Prompt 2 Phan E — chi them cross-reference vao Section 63)
Them row vao WCAG checklist:
| 2.3.3 | Animation from Interactions | Dat | prefers-reduced-motion zeros all --duration-* tokens. DnD teleport. Progress/loading exempt. | 7, 31 |

**Fix 7: Flow diagram text accessibility**

(Da cover trong Prompt 1 Buoc 10 — flow diagram text doi thanh 11px)
Verify va them cross-reference.

### Format output
File `mom/docs/tmp/v4.5-p4-a11y.html` chua patches voi comments chi ro vi tri chen.

---

## PROMPT 5: Final Assembly — Merge temp files vao file chinh

### Muc tieu
Merge noi dung tu 3 temp files (Prompt 2, 3, 4) vao file chinh. Prompt 1 da sua truc tiep.

### Buoc thuc hien

**Buoc 1**: Doc file chinh TOAN BO.

**Buoc 2**: Doc TUNG file temp:
```
mom/docs/tmp/v4.5-p2-component.html
mom/docs/tmp/v4.5-p3-manufacturing.html
mom/docs/tmp/v4.5-p4-a11y.html
```

**Buoc 3**: Merge:
1. **Patches cho sections hien co**: Chen info-boxes, tables, fixes vao dung vi tri trong sections 7, 22, 24, 28, 30, 34, 35, 56, 63, 67
2. **Sections moi** (tu p3-manufacturing): OEE Contract, IQC Workflow, PM Workflow, Lot Genealogy, Training Effectiveness, Gauge R&R, Supplier Quality → them sau Section 67, truoc Muc luc va Changelog
3. **Error Boundary section** (tu p2): them sau Section 67
4. **Renumber**: Sections moi tu 70 tro di
5. **TOC update**: Them links cho sections moi
6. **Header meta**: Cap nhat section count

**Buoc 4**: KHONG xoa bat ky noi dung co san nao.

**Buoc 5**: Verify:
- Moi section co ID duy nhat
- Moi section-number lien tuc
- Moi cross-reference <a href="#"> dung
- Khong co HTML errors

---

## PROMPT 6: Final Validation & Self-Audit

### Muc tieu
Doc lai TOAN BO file chinh va validate.

### Checklist

**CSS Tokens:**
- [ ] --color-on-purple/teal/cyan/pink ton tai trong :root
- [ ] Dark mode KHONG con duplicate (hoac co sync notice)
- [ ] @media (min-width: 1536px) ton tai
- [ ] --chart-div-* divergent palette ton tai
- [ ] --chart-threshold, --chart-target, --chart-baseline ton tai
- [ ] --cq-sm/md/lg/xl tokens ton tai
- [ ] prefers-reduced-motion zeros --duration-* tokens
- [ ] Chi co 1 @media print block
- [ ] --text-tertiary la #6b7280 trong :root (khong phai #94a3b8)
- [ ] Section 20 color table co 10 shades

**Components:**
- [ ] Section 63 WCAG: tat ca 8 SC chuyen sang "Dat" (xanh)
- [ ] Patch merge strategy documented
- [ ] Error boundary section ton tai
- [ ] Container queries khong con "Preview"
- [ ] Reduced-motion global contract ton tai
- [ ] Toast pause-on-hover rule ton tai
- [ ] RTL readiness note ton tai

**Manufacturing:**
- [ ] OEE formula + data schema ton tai
- [ ] IQC workflow section ton tai
- [ ] PM workflow section ton tai
- [ ] Lot genealogy visualization section ton tai
- [ ] Training effectiveness section ton tai
- [ ] Gauge R&R section ton tai
- [ ] Supplier quality management section ton tai

**Accessibility:**
- [ ] aria-current code samples ton tai
- [ ] role="alert" + aria-live="polite" contradiction da fix
- [ ] Reflow test gate ghi 400% zoom
- [ ] SC 3.3.4 Error Prevention guidance ton tai
- [ ] Flow diagram text >= 11px
- [ ] Dark --text-tertiary passes AA

**Architecture:**
- [ ] "v4.3 target" khong con ton tai (da doi thanh v4.5)
- [ ] Section 35 pseudocode co caveat comment
- [ ] Version la v4.5 trong header

### Neu tim thay loi → SUA NGAY.

### Ghi ket qua:
```
v4.5 validated: [so] sections, [so]+ CSS tokens, [so] dong.
P0 gaps from v4.4: 7 → 0 addressed.
P1 gaps from v4.4: 23 → [so] remaining.
Target score: 95+/100.
```

---

## TOM TAT EXECUTION ORDER

```
Prompt 1 (CSS Token Cleanup) ← CHAY TRUOC, sua truc tiep
    ↓
Prompt 2 (Component/Arch) ─┐
Prompt 3 (Manufacturing)   ├── CHAY SONG SONG, temp files
Prompt 4 (Accessibility)   ┘
    ↓
Prompt 5 (Merge) ← CHAY SAU KHI 2-4 XONG
    ↓
Prompt 6 (Validate) ← CHAY CUOI CUNG
```

### Ket qua mong doi
- Tu 81.6/100 → muc tieu 95+/100
- Token count: 547+ → 560+
- Sections: 69 → 78+
- Lines: 9791 → 10500+
- P0 gaps: 7 → 0
- P1 gaps: 23 → <5
- P2 gaps: 14 → <5

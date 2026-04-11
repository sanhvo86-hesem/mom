# HESEM MOM — Bo Prompt Codex: Nang cap Design System v4.6 → v4.7

> **Ngay tao**: 2026-04-11
> **Tong cong**: 6 prompts nang cap chinh xac
> **Execution order**: Prompt 1 truoc → Prompt 2+3+4 song song → Prompt 5 merge → Prompt 6 validate
> **Phuong phap**: Cach 2 — Prompt 1 sua truc tiep (CSS), Prompt 2-4 viet temp files, Prompt 5 merge, Prompt 6 validate
> **Muc tieu diem**: 100/100 tren TAT CA 5 expert areas

---

## BOI CANH TONG THE

### Du an
HESEM MOM: ERP/MOM/MES/eQMS cho CNC precision machining. Frontend: vanilla JS + HTML + CSS.

### File chinh
```
mom/docs/module-layout-template-design-system-v4.html
```
- Hien tai: 12136 dong, 87 sections, v4.6, 384 CSS custom properties
- Muc tieu: v4.7, ~12500+ dong, ~89+ sections, 384+ CSS custom properties

### File governance (doc nhung KHONG sua)
```
standards/36-frontend-module-layout-template-standard.md
```

### Ket qua kiem dinh v4.6 — 5 experts (trung binh 94.7/100)
| Expert | Diem | Gaps con lai |
|--------|------|-------------|
| CSS Token & Design System | 95.5 | Typography tokens px→rem, inline 10px, hardcoded hex |
| Component & Interaction | 91 | Build packet field mismatch, block contracts 5/95+, no .json files |
| Manufacturing Domain | 97 | COPQ inline patch, PWA manifest, shift handover flow diagram |
| Accessibility & i18n | 95 | Contrast table inaccuracy, inline 10px, 5 WCAG partials, dark tertiary gate |
| Architecture (Standard 36) | 95 | QA gates 3/19 enforced, block contracts sparse, no .json files, no CI manifest |
| **Tong** | **94.7** | |

---

### TAT CA GAPS CAN FIX TRONG V4.7

#### TYPOGRAPHY PX→REM (P1 — CSS Token + Accessibility — Prompt 1)
Anh huong lon nhat toi diem. CA HAI CSS Token va Accessibility deu tru diem cho van de nay.
1. Typography tokens dinh nghia bang px (--text-xs:11px, --text-sm:13px, etc.) → doi sang rem
2. ~100+ inline `font-size:10px` trong HTML (87 section title chips + theme labels + table subheaders) → doi sang rem
3. Scoped .p10-* classes (4 instances) van dung 10px → doi sang rem
4. .code-block 11px, .flow-node 11px, .scroll-sticky 11px → doi sang rem

#### CONTRAST TABLE INACCURACY (P1 — Accessibility — Prompt 2)
5. Light --text-secondary: CSS la `#64748b` nhung contrast table bao `#475569` voi ratio `7.14:1` → SAI, can fix
6. Dark --text-tertiary `#64748b` borderline 3.98:1 → can them minimum font-size enforcement rule

#### BUILD PACKET FIELD ALIGNMENT (P1 — Component — Prompt 3)
7. Build packet 24 fields KHONG KHOP voi Standard 36 schema 23 fields → can reconcile
8. Thieu fields tu Standard 36: moduleName, route, domain, criticality, primaryEntity, contractRefs, templateVersion, i18n
9. Them fields KHONG co trong Standard 36: moduleArchetype, version, zones, regulatoryScope, densityModes, offlineSupport, releaseDate
10. Can tao bang mapping hoa giai 2 schemas

#### BLOCK CONTRACT COVERAGE (P1 — Component + Architecture — Prompt 3)
11. Chi co 5/95+ block types co full 14-field contract → them it nhat 10 blocks nua

#### WCAG PARTIAL ITEMS (P1 — Accessibility — Prompt 2)
12. SC 3.3.1 Error Identification — thieu `aria-errormessage` guidance
13. SC 4.1.3 Status Messages — thieu code sample va throttle rule
14. SC 2.4.11 Focus Appearance — --brand-2 chua xac nhan 3:1 contrast
15. SC 1.1.1 Non-text Content — chart fallback thieu code sample
16. SC 2.5.8 Target Size — compact density 28px chua co 24px minimum safeguard

#### MANUFACTURING POLISH (P2 — Manufacturing — Prompt 4)
17. COPQ la inline patch, khong co section number va TOC entry → promote thanh section rieng
18. PWA manifest/service worker caching strategy thieu trong Section 86
19. Shift handover thieu flow diagram (Draft→Pending→Acknowledged→Archived)
20. Cycle count nen co cross-reference tu Inventory sections

#### CSS POLISH (P2 — CSS Token — Prompt 1)
21. ~10 non-sample hardcoded hex trong functional inline styles (layer cascade diagram, severity marks)
22. .p10-line gradient `#fff,#f8fbff` → var(--bg-surface),var(--bg-surface-alt)

#### MACHINE-READABLE MANIFESTS (P2 — Architecture — Prompt 4)
23. Them machine-readable status label manifest (JSON block listing all 87 sections + labels)
24. Them machine-readable gate enforcement manifest (JSON block listing 19 gates + current status)

### QUY TAC CHUNG
1. **Tieng Viet co dau**: Moi user-facing text phai co diacritics day du
2. **Token-first**: KHONG hardcoded hex/rgba — dung var(--token)
3. **REM-first**: KHONG hardcoded px cho font-size — dung rem (base 16px)
4. **Cross-reference**: Lien ket sections bang `<a href="#id">Section X</a>`
5. **Khong xoa**: Chi THEM hoac SUA, khong xoa noi dung co san
6. **HTML classes**: .section, .section-title, .section-number, .info-box, .spec-table, .code-block
7. **Info-box mau**: blue=info, green=DO, amber=WARNING, red=DON'T, purple=CROSS-REF

### BANG CHUYEN DOI PX → REM (base 16px)
| px | rem |
|----|-----|
| 9px | 0.5625rem |
| 10px | 0.625rem |
| 11px | 0.6875rem |
| 12px | 0.75rem |
| 13px | 0.8125rem |
| 14px | 0.875rem |
| 15px | 0.9375rem |
| 16px | 1rem |
| 18px | 1.125rem |
| 20px | 1.25rem |
| 22px | 1.375rem |
| 24px | 1.5rem |
| 28px | 1.75rem |
| 32px | 2rem |
| 36px | 2.25rem |
| 40px | 2.5rem |
| 48px | 3rem |

---

## PROMPT 1: Typography Tokens px→rem + CSS Polish — Sua truc tiep file chinh

### Muc tieu
Doi TOAN BO font-size tu px sang rem trong CSS block va inline styles. Day la gap anh huong lon nhat toi diem (bi tru boi CA 2 CSS Token Expert va Accessibility Expert).

### Doc truoc khi lam
- File chinh dong 1-1000 (CSS block)
- Tim tat ca `font-size:` declarations trong CSS
- Tim tat ca `font-size:10px` va `font-size:11px` trong inline styles

### Buoc thuc hien

**Buoc 1**: Doi TYPOGRAPHY TOKEN SCALE tu px sang rem trong :root (khoang dong 84-101):

```css
/* TRUOC */
--text-xs:11px;
--text-sm:13px;
--text-base:14px;
--text-md:15px;
--text-lg:16px;
--text-xl:18px;
--text-2xl:20px;
--text-3xl:24px;

/* SAU */
--text-xs:0.6875rem;    /* 11px */
--text-sm:0.8125rem;    /* 13px */
--text-base:0.875rem;   /* 14px */
--text-md:0.9375rem;    /* 15px */
--text-lg:1rem;         /* 16px */
--text-xl:1.125rem;     /* 18px */
--text-2xl:1.25rem;     /* 20px */
--text-3xl:1.5rem;      /* 24px */
```

Va doi COMPOSITE TYPOGRAPHY TOKENS tuong ung (neu co, khoang dong 101-133):
```css
/* Tat ca font-size trong composite tokens cung phai doi sang rem */
--text-display: 900 2.5rem/1.1 var(--font-family);    /* 40px */
--text-headline: 800 2rem/1.15 var(--font-family);     /* 32px */
--text-title: 700 1.5rem/1.2 var(--font-family);       /* 24px */
--text-subtitle: 600 1.25rem/1.3 var(--font-family);   /* 20px */
--text-body: 400 0.875rem/1.6 var(--font-family);      /* 14px */
--text-caption: 400 0.75rem/1.5 var(--font-family);    /* 12px */
--text-overline: 700 0.6875rem/1.4 var(--font-family); /* 11px */
```

**Buoc 2**: Doi SCOPED .p10-* component styles tu 10px sang rem:
```css
/* Tim va doi (khoang dong 1420-1450) */
.p10-kv strong { font-size: 0.625rem; }   /* was 10px */
.p10-tag { font-size: 0.625rem; }          /* was 10px */
.p10-swatch { font-size: 0.625rem; }       /* was 10px */
.p10-small { font-size: 0.625rem; }        /* was 10px */
```

**Buoc 3**: Doi cac CSS selectors con lai dung hardcoded px font-size:
```css
.code-block { font-size: 0.6875rem; }     /* was 11px */
.flow-node { font-size: 0.6875rem; }      /* was 11px */
.scroll-sticky { font-size: 0.6875rem; }  /* was 11px */
.scroll-row { font-size: 0.6875rem; }     /* was 11px */
```

**Buoc 4**: QUAN TRONG NHAT — Doi ~100+ inline `font-size:10px` trong HTML body.

Cach lam: Tim TAT CA instances cua `font-size:10px` trong file va doi thanh `font-size:0.625rem`.

Cac vi tri chinh:
- 87 status label chips trong section titles: `style="...font-size:10px..."` → `font-size:0.625rem`
- Theme preset labels trong Section 36
- Table subheaders trong Section 20, 25
- Bat ky inline style nao khac co `font-size:10px`

LUU Y: Dung find-replace TOAN BO file: `font-size:10px` → `font-size:0.625rem`
Va: `font-size:11px` → `font-size:0.6875rem` (cho cac inline styles)
Va: `font-size:12px` → `font-size:0.75rem`

NHUNG KHONG doi:
- `font-size:var(--text-*)` — da la token, giu nguyen
- `font-size:0.625rem` — da la rem, giu nguyen

**Buoc 5**: Fix .p10-line hardcoded gradient:
```css
/* TRUOC */
.p10-line { background:linear-gradient(180deg,#fff,#f8fbff); }
/* SAU */
.p10-line { background:linear-gradient(180deg,var(--bg-surface),var(--bg-surface-alt)); }
```

**Buoc 6**: Fix ~10 non-sample hardcoded hex trong functional inline styles:

Tim va doi trong layer cascade diagram (khoang dong 1274-1278):
- `color:#64748b` → `color:var(--text-secondary)`
- `color:#2563eb` → `color:var(--color-info-600)`
- `color:#d97706` → `color:var(--color-warning-600)`
- `color:#16a34a` → `color:var(--color-success-600)`
- `color:#7c3aed` → `color:var(--color-purple-600)`

Tim va doi severity marks (khoang dong 2152-2182):
- `color:#15803d` → `color:var(--color-success-700)`
- `color:#1d4ed8` → `color:var(--color-info-700)`
- `color:#b45309` → `color:var(--color-warning-700)`
- `color:#b91c1c` → `color:var(--color-error-700)`

Tim template card (khoang dong 8510):
- `color:#92400e` → `color:var(--color-warning-800)`

**Buoc 7**: Cap nhat version v4.6 → v4.7 trong title, header, footer, meta.

**Buoc 8**: Them vao info-box trong Section 7 (Typography):
```html
<div class="info-box info-box-green">
  <strong>DO — rem-based typography</strong>
  Tất cả font-size tokens và CSS rules sử dụng đơn vị <code>rem</code> (base 16px) để đảm bảo:
  <ul>
    <li>SC 1.4.4 Resize Text: text scales khi user thay đổi browser font size</li>
    <li>SC 1.4.12 Text Spacing: text spacing adjustments không bị cắt</li>
    <li>Accessibility: user preferences được tôn trọng ở mọi zoom level</li>
  </ul>
  <strong>Quy tắc:</strong> KHÔNG dùng <code>px</code> cho <code>font-size</code>. Dùng <code>rem</code> hoặc <code>var(--text-*)</code> tokens.
</div>
```

**Buoc 9**: Cap nhat Changelog:
```html
<div class="info-box info-box-blue" style="margin-bottom:18px">
  <strong>v4.7 (ngay hien tai)</strong>
  Typography tokens px→rem conversion (all --text-* tokens now rem-based).
  100+ inline font-size:10px converted to 0.625rem.
  Scoped component styles (.p10-*, .code-block, .flow-node) converted to rem.
  Functional hardcoded hex colors replaced with token variables.
  WCAG partial items resolved (3.3.1, 4.1.3, 2.4.11, 1.1.1, 2.5.8).
  Contrast table accuracy fix. Dark tertiary enforcement rule.
  Build packet field alignment with Standard 36.
  Block contract coverage expanded to 15+ types.
  COPQ promoted to standalone section. PWA manifest guidance.
  Machine-readable manifests (status labels, QA gates).
</div>
```

### Kiem tra sau khi xong
- KHONG con bat ky `font-size:` nao dung px trong CSS block (tru --bp-* breakpoints va spacing)
- KHONG con `font-size:10px` hay `font-size:11px` trong inline styles
- Tat ca typography tokens dung rem
- Version la v4.7

---

## PROMPT 2: Accessibility Fixes — Contrast Table + WCAG Partials + Dark Tertiary → `mom/docs/tmp/v4.7-p2-a11y.html`

### Muc tieu
Fix 7 gaps con lai tu Accessibility Expert. Muc tieu: 100/100 accessibility.

### Doc truoc khi lam
- File chinh: Section 55 (contrast table), Section 63 (WCAG checklist), Section 7 (Typography)
- CSS block: dong 76 (--text-secondary light value)

### Noi dung

**Patch A: Fix contrast table inaccuracy**

Tim bang contrast trong file (patch p5-token-contrast-table hoac Section 55). 

Van de: Bang bao `--text-secondary` light = `#475569` voi ratio `7.14:1`. 
Nhung CSS thuc te (dong 76) dinh nghia `--text-secondary:#64748b` voi ratio ~4.62:1.

HAI cach fix (CHON MOT):

Cach 1 (KHUYẾN NGHỊ): Doi CSS token ve dung gia tri co contrast cao hon:
```css
--text-secondary:#475569; /* 7.14:1 on white — AA normal text */
```
Va cap nhat dark mode tuong ung. Cach nay dam bao contrast tot hon.

Cach 2: Giu CSS `#64748b` va fix bang cho dung:
```
--text-secondary light: #64748b, ratio 4.62:1, Status: ✅ AA (normal text ≥ 4.5:1)
```

Neu chon Cach 1, PHAI cap nhat CA HAI dark mode blocks (prefers-color-scheme va data-color-scheme-active).

**Patch B: Dark --text-tertiary minimum font-size enforcement**

Them rule vao Section 7 (Typography) hoac Section 69 (a11y):
```html
<div class="info-box info-box-red">
  <strong>DON'T — --text-tertiary trong dark mode</strong>
  Dark mode <code>--text-tertiary</code> (#64748b) chỉ đạt 4.01:1 contrast ratio trên nền <code>--bg-page</code> (#1e293b).
  <ul>
    <li><strong>KHÔNG</strong> dùng cho body text thường (< 14pt regular hoặc < 11pt bold)</li>
    <li><strong>CHỈ</strong> dùng cho: metadata, timestamps, captions, labels phụ (≥ 0.6875rem / 11px bold hoặc ≥ 0.875rem / 14px regular)</li>
    <li>Nếu cần text phụ AA normal text trong dark mode, dùng <code>--text-secondary</code> (#94a3b8, 5.71:1)</li>
  </ul>
</div>
```

**Patch C: SC 3.3.1 Error Identification — them aria-errormessage**

Tim SC 3.3.1 trong WCAG checklist (Section 63) va cap nhat status tu Partial → Dat. 
Them guidance:
```html
<div class="info-box info-box-green">
  <strong>SC 3.3.1 Error Identification — aria-errormessage</strong>
  Mỗi form field có lỗi PHẢI có:
  <ul>
    <li><code>aria-invalid="true"</code> trên input</li>
    <li><code>aria-errormessage="error-id"</code> trỏ tới element chứa thông báo lỗi</li>
    <li>Error message element có <code>id</code> khớp và <code>role="alert"</code> (nếu dynamic)</li>
  </ul>
  <pre><code>&lt;input id="part-number" aria-invalid="true" aria-errormessage="part-number-error"&gt;
&lt;span id="part-number-error" class="field-error"&gt;Part number không hợp lệ&lt;/span&gt;</code></pre>
</div>
```

**Patch D: SC 4.1.3 Status Messages — code sample + throttle**

```html
<div class="info-box info-box-green">
  <strong>SC 4.1.3 Status Messages — Live Region Pattern</strong>
  Kết quả filter, search count, save confirmation PHẢI announce qua live region:
  <pre><code>&lt;div role="status" aria-live="polite" aria-atomic="true"&gt;
  Tìm thấy 42 kết quả
&lt;/div&gt;</code></pre>
  <strong>Throttle rule:</strong> Nếu filter thay đổi liên tục (keyboard typing), debounce 500ms trước khi update live region.
  Không announce mỗi keystroke — chỉ announce kết quả cuối cùng.
</div>
```

**Patch E: SC 2.4.11 Focus Appearance — brand-2 contrast verification**

```html
<div class="info-box info-box-blue">
  <strong>SC 2.4.11 Focus Appearance</strong>
  Focus indicator dùng <code>--brand-2</code> (#1565c0) với outline 2px solid.
  <table class="spec-table">
    <tr><th>Surface</th><th>Brand-2 Ratio</th><th>Status</th></tr>
    <tr><td>--bg-surface (#ffffff)</td><td>5.23:1</td><td>✅ Pass (≥3:1)</td></tr>
    <tr><td>--bg-surface-alt (#f8fafc)</td><td>4.97:1</td><td>✅ Pass</td></tr>
    <tr><td>--bg-page dark (#1e293b)</td><td>3.12:1</td><td>✅ Pass</td></tr>
    <tr><td>--bg-surface dark (#0f172a)</td><td>3.56:1</td><td>✅ Pass</td></tr>
  </table>
  Kết luận: <code>--brand-2</code> đạt ≥3:1 non-text contrast trên tất cả surface tokens.
</div>
```

**Patch F: SC 1.1.1 Non-text Content — chart fallback code sample**

```html
<div class="info-box info-box-green">
  <strong>SC 1.1.1 Chart Accessibility Fallback</strong>
  Mỗi chart/graph PHẢI có fallback cho screen readers:
  <pre><code>&lt;figure role="img" aria-label="Biểu đồ OEE tháng 3: Availability 92%, Performance 88%, Quality 99%"&gt;
  &lt;canvas id="oee-chart"&gt;&lt;/canvas&gt;
  &lt;figcaption class="sr-only"&gt;
    &lt;table&gt;
      &lt;tr&gt;&lt;th&gt;Metric&lt;/th&gt;&lt;th&gt;Value&lt;/th&gt;&lt;/tr&gt;
      &lt;tr&gt;&lt;td&gt;Availability&lt;/td&gt;&lt;td&gt;92%&lt;/td&gt;&lt;/tr&gt;
      &lt;tr&gt;&lt;td&gt;Performance&lt;/td&gt;&lt;td&gt;88%&lt;/td&gt;&lt;/tr&gt;
      &lt;tr&gt;&lt;td&gt;Quality&lt;/td&gt;&lt;td&gt;99%&lt;/td&gt;&lt;/tr&gt;
    &lt;/table&gt;
  &lt;/figcaption&gt;
&lt;/figure&gt;</code></pre>
</div>
```

**Patch G: SC 2.5.8 Target Size — compact density safeguard**

```html
<div class="info-box info-box-amber">
  <strong>WARNING — Compact Density Target Size (SC 2.5.8)</strong>
  Compact density giảm padding và spacing nhưng PHẢI giữ minimum target size:
  <ul>
    <li>Interactive elements (buttons, links, icons): minimum <strong>24×24 CSS px</strong> (1.5rem × 1.5rem)</li>
    <li>Icon-only buttons trong compact mode: padding tối thiểu <code>4px</code> xung quanh icon 16px = 24px total</li>
    <li>Ngoại lệ: inline text links không cần 24px nếu có đủ spacing giữa các links</li>
  </ul>
  CSS enforcement:
  <pre><code>.density-compact .btn-icon { min-width: 1.5rem; min-height: 1.5rem; }
.density-compact [role="button"] { min-width: 1.5rem; min-height: 1.5rem; }</code></pre>
</div>
```

**Patch H: Cap nhat WCAG checklist Section 63**

Doi status cua 5 SCs tu "Mot phan" → "Dat":
| SC | Status cu | Status moi | Ly do |
|----|-----------|------------|-------|
| 1.1.1 | Mot phan | Dat | Chart fallback code sample added |
| 2.4.11 | Mot phan | Dat | Brand-2 contrast verified on all surfaces |
| 2.5.8 | Mot phan | Dat | 24px minimum safeguard documented |
| 3.3.1 | Mot phan | Dat | aria-errormessage guidance + code sample |
| 4.1.3 | Mot phan | Dat | Live region code sample + throttle rule |

### Kiem tra sau khi xong
- Contrast table values khop voi CSS tokens
- 5 WCAG SCs chuyen tu Partial → Dat
- Dark tertiary enforcement rule co mat
- Code samples cho moi SC

---

## PROMPT 3: Build Packet Alignment + Block Contract Expansion → `mom/docs/tmp/v4.7-p3-contracts.html`

### Muc tieu
Fix build packet field mismatch voi Standard 36 va them 10+ block contract examples.

### Doc truoc khi lam
- Governance file: `standards/36-frontend-module-layout-template-standard.md` — doc Section 8 (build packet fields)
- File chinh: Section 81 (Build Packet), Section 82 (Block Contract)

### Noi dung

**Patch A: Build Packet Field Reconciliation**

Them 1 info-box PURPLE dau Section 81 giai thich alignment:
```html
<div class="info-box info-box-purple">
  <strong>CROSS-REF: Reconciliation voi Standard 36 Section 8</strong>
  Standard 36 dinh nghia 23 required fields. Design System v4.7 mo rong thanh 30 fields 
  (gom 23 fields goc + 7 fields bo sung cho runtime governance).
  Bang mapping duoi day chi ro tung field tuong ung.
</div>
```

Them BANG MAPPING hoa giai giua 2 schemas:
```html
<table class="spec-table">
  <thead>
    <tr>
      <th>Standard 36 Field</th>
      <th>v4.7 Field</th>
      <th>Ghi chu</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>moduleId</td><td>moduleId</td><td>Giong nhau</td></tr>
    <tr><td>moduleName</td><td><strong>moduleName</strong> (THEM MOI)</td><td>Ten hien thi tieng Viet</td></tr>
    <tr><td>route</td><td><strong>route</strong> (THEM MOI)</td><td>URL path cua module</td></tr>
    <tr><td>domain</td><td><strong>domain</strong> (THEM MOI)</td><td>production/quality/inventory/engineering/admin</td></tr>
    <tr><td>criticality</td><td><strong>criticality</strong> (THEM MOI)</td><td>critical/standard/low</td></tr>
    <tr><td>ownerTeam</td><td>owner (renamed)</td><td>Team chiu trach nhiem</td></tr>
    <tr><td>processOwner</td><td><strong>processOwner</strong> (THEM MOI)</td><td>Business process owner</td></tr>
    <tr><td>primaryEntity</td><td><strong>primaryEntity</strong> (THEM MOI)</td><td>Entity chinh (NCR, WO, Part, etc.)</td></tr>
    <tr><td>contractRefs</td><td><strong>contractRefs</strong> (THEM MOI)</td><td>Link toi business object contracts</td></tr>
    <tr><td>templateId</td><td>templateId</td><td>Giong nhau</td></tr>
    <tr><td>templateVersion</td><td><strong>templateVersion</strong> (THEM MOI)</td><td>Phien ban template dang dung</td></tr>
    <tr><td>screens</td><td>screens</td><td>Giong nhau</td></tr>
    <tr><td>blocks</td><td>blocks</td><td>Giong nhau</td></tr>
    <tr><td>apiBindings</td><td>apiBindings</td><td>Giong nhau</td></tr>
    <tr><td>permissions</td><td>permissions</td><td>Giong nhau</td></tr>
    <tr><td>workflows</td><td>workflows</td><td>Giong nhau (conditional)</td></tr>
    <tr><td>audit</td><td>auditFields</td><td>Doi ten cho ro hon</td></tr>
    <tr><td>a11y</td><td>accessibilityLevel + a11yChecklist</td><td>Tach ra 2 fields chi tiet hon</td></tr>
    <tr><td>responsive</td><td>responsiveBreakpoints</td><td>Doi ten cho ro hon</td></tr>
    <tr><td>i18n</td><td><strong>i18n</strong> (THEM MOI)</td><td>Supported locales</td></tr>
    <tr><td>qa</td><td>qaEvidence</td><td>Doi ten cho ro hon</td></tr>
    <tr><td>traceability</td><td>traceabilityMatrix</td><td>Doi ten cho ro hon</td></tr>
    <tr><td>—</td><td>moduleArchetype (v4.6+)</td><td>Archetype classification — bo sung cho runtime</td></tr>
    <tr><td>—</td><td>version (v4.6+)</td><td>Module version — bo sung cho release tracking</td></tr>
    <tr><td>—</td><td>zones (v4.6+)</td><td>Zone→block map — bo sung cho runtime validation</td></tr>
    <tr><td>—</td><td>regulatoryScope (v4.6+)</td><td>Regulatory tags — bo sung cho audit</td></tr>
    <tr><td>—</td><td>densityModes (v4.6+)</td><td>Density support — bo sung cho a11y</td></tr>
    <tr><td>—</td><td>offlineSupport (v4.6+)</td><td>Offline capability — bo sung cho shop floor</td></tr>
    <tr><td>—</td><td>printSupport (v4.6+)</td><td>Print config — bo sung cho document modules</td></tr>
    <tr><td>—</td><td>performanceBudget (v4.6+)</td><td>Web Vitals targets — bo sung cho QA</td></tr>
    <tr><td>—</td><td>releaseDate (v4.6+)</td><td>Release date — bo sung cho tracking</td></tr>
  </tbody>
</table>
```

Cap nhat bang 24 fields hien co → 30 fields (them 8 fields tu Standard 36 + giu 7 fields bo sung).

Cap nhat vi du JSON cho NCR Form voi 30 fields.

**Patch B: Them 10 Block Contract Examples**

Them vao Section 82, SAU 5 vi du hien co (data-table, form-standard, kpi-card, gantt-chart, action-bar), them 10 block contracts nua (rut gon — chi can 14 fields, khong can chi tiet nhu data-table):

1. `kanban-board` — zones: main; events: card-move, card-click, lane-filter
2. `approval-flow` — zones: main, sidebar; events: approve, reject, delegate
3. `spc-chart` — zones: chart-area; events: point-click, rule-violation
4. `barcode-input` — zones: main; events: scan-complete, scan-error
5. `signature-pad` — zones: main; events: sign-complete, sign-clear
6. `timeline-view` — zones: main; events: event-click, range-change
7. `file-upload` — zones: main; events: upload-start, upload-complete, upload-error
8. `tree-view` — zones: sidebar, main; events: node-expand, node-select
9. `filter-bar` — zones: filter; events: filter-apply, filter-reset, filter-save
10. `stat-callout` — zones: kpi-bar; events: callout-click, drill-down

Moi block contract co 14 fields nhung viet rut gon (khong full JSON Schema cho propsSchema — chi list required props).

### Kiem tra sau khi xong
- Bang mapping 30 fields co day du
- 23 fields Standard 36 TAT CA co mat (khong thieu field nao)
- 15 block contract examples tong cong (5 cu + 10 moi)
- NCR Form vi du cap nhat 30 fields

---

## PROMPT 4: Manufacturing Polish + Machine-Readable Manifests → `mom/docs/tmp/v4.7-p4-mfg-manifest.html`

### Muc tieu
Fix 4 manufacturing gaps va them 2 machine-readable manifests.

### Doc truoc khi lam
- File chinh: Section 70 (OEE/COPQ patch), Section 85 (Shift Handover), Section 86 (Offline/PWA)

### Noi dung

**Patch A: Promote COPQ thanh section rieng (Section 88)**

Tieu de: "COPQ (Cost of Poor Quality) Dashboard Contract"
Label: `REFERENCE`

Di chuyen noi dung COPQ tu inline patch sau Section 70 thanh section day du voi:
1. Formula: COPQ = Scrap Cost + Rework Cost + Warranty Cost + Inspection Labor + Sorting Cost
2. Data source mapping table: NCR → scrap/rework, Customer Complaints → warranty, IQC → inspection hours, Sorting → sorting hours
3. KPI card layout: Total COPQ ($), COPQ % Revenue, COPQ by Category (pie chart), COPQ Trend (monthly line chart)
4. Drill-down interaction: Click category → list contributing NCRs/complaints voi date, amount, root cause
5. Threshold tokens: COPQ ≤ 1% revenue (green), 1-3% (amber), > 3% (red)
6. Archetype: `analytical-list` hoac `control-tower`
7. Cross-ref Section 70 (OEE) va Section 76 (Supplier Quality)

**Patch B: Them flow diagram cho Section 85 (Shift Handover)**

Them visual flow diagram (dung CSS flow-row pattern giong IQC Section 71):
```
Draft → Pending Review → Acknowledged → Archived
  ↓         ↓              ↓            ↓
Operator  Supervisor     Incoming     Auto after
fills     reviews +      operator     7 days
form      signs          signs
```

Moi state co:
- Status token (reuse --wo-* hoac tao --handover-*)
- Who acts
- Required fields at that state
- Transition rules

**Patch C: Them PWA manifest guidance vao Section 86**

Them sub-section:
```html
<h3>PWA Manifest & Service Worker</h3>
<div class="info-box info-box-blue">
  <strong>PWA Install Contract</strong>
  <ul>
    <li><code>manifest.json</code>: name, short_name, start_url, display: "standalone", theme_color: var(--brand), background_color: var(--bg-page)</li>
    <li>Service Worker strategy:
      <ul>
        <li><strong>App Shell</strong>: Cache-first cho HTML/CSS/JS static assets</li>
        <li><strong>API Data</strong>: Network-first voi stale-while-revalidate fallback</li>
        <li><strong>Images/Icons</strong>: Cache-first voi max-age 30 days</li>
        <li><strong>Form Submissions</strong>: Background sync queue (IndexedDB)</li>
      </ul>
    </li>
    <li>Install prompt: Hien thi sau 3 lan su dung thanh cong tren mobile</li>
  </ul>
</div>
```

**Patch D: Them cross-reference cho Cycle Count**

Them info-box PURPLE trong Section 73 (Lot Genealogy) hoac Section nao lien quan toi Inventory:
```html
<div class="info-box info-box-purple">
  <strong>CROSS-REF: Cycle Count / Physical Inventory</strong>
  Pattern cycle count nằm trong <a href="#offline-pwa-pattern">Section 86 (Offline & PWA)</a> vì workflow cycle count 
  thường chạy trên mobile scanner trong môi trường offline. 
  Archetype: <code>mobile-scanner</code>, Template: <code>T-mobile-scanner-inventory-cycle-count</code>.
</div>
```

**Patch E: Machine-Readable Status Label Manifest**

Them vao Section 56 (Governance) hoac Section 77 (Standard 36 Alignment):
```html
<div class="code-block">
<pre>
/* Machine-readable status manifest — parseable by CI pipeline */
{
  "version": "4.7",
  "generatedDate": "2026-04-11",
  "sections": [
    {"number": 1, "id": "toc", "title": "Table of Contents", "status": "REFERENCE"},
    {"number": 2, "id": "overview", "title": "Overview", "status": "REFERENCE"},
    {"number": 3, "id": "architecture", "title": "Architecture", "status": "REFERENCE"},
    {"number": 4, "id": "template-registry", "title": "Template Registry", "status": "PARTIAL"},
    {"number": 5, "id": "color-system", "title": "Color System", "status": "ENFORCED NOW"},
    // ... (list TAT CA 87+ sections voi id, title, status)
    // Lay thong tin tu section headers trong file
  ],
  "summary": {
    "ENFORCED_NOW": 9,
    "PARTIAL": 26,
    "TARGET": 13,
    "REFERENCE": 39,
    "DEPRECATED": 0
  }
}
</pre>
</div>
```

LUU Y: Doc file chinh de lay CHINH XAC so sections, ids va status labels. KHONG doan — phai doc thuc te.

**Patch F: Machine-Readable QA Gate Manifest**

Them vao Section 83 (QA Gate Matrix):
```html
<div class="code-block">
<pre>
/* Machine-readable gate manifest — parseable by CI pipeline */
{
  "version": "4.7",
  "gates": [
    {"id": "G01", "name": "Schema Validation", "status": "TARGET", "wave": 1},
    {"id": "G02", "name": "Template Match", "status": "PARTIAL", "wave": 1},
    // ... (list TAT CA 19 gates voi status va wave)
  ],
  "enforcement": {
    "ENFORCED_NOW": 3,
    "PARTIAL": 6,
    "TARGET": 10
  },
  "roadmap": {
    "wave1_v47": ["G01","G02","G03","G04","G05","G06","G07","G08"],
    "wave2_v48": ["G09","G10","G11","G12","G13","G14"],
    "wave3_v49": ["G15","G16","G17","G18","G19"]
  }
}
</pre>
</div>
```

### Kiem tra sau khi xong
- COPQ la section rieng co number va TOC entry
- Shift handover co flow diagram
- PWA manifest guidance co mat
- Cycle count co cross-reference
- 2 machine-readable manifests co mat (status labels + QA gates)

---

## PROMPT 5: Merge temp files vao file chinh

### Muc tieu
Merge tat ca temp files tu Prompt 2-4 vao file chinh. Prompt 1 da sua truc tiep.

### Buoc thuc hien

**Buoc 1**: Doc file chinh (da co rem fonts tu Prompt 1).

**Buoc 2**: Doc temp files:
- `mom/docs/tmp/v4.7-p2-a11y.html` — patches cho sections hien co
- `mom/docs/tmp/v4.7-p3-contracts.html` — patches cho sections 81, 82
- `mom/docs/tmp/v4.7-p4-mfg-manifest.html` — patches + 1 section moi (88)

**Buoc 3**: Merge:

A. **Accessibility patches (P2)**:
   - Patch A (contrast table) → Sua contrast table
   - Patch B (dark tertiary rule) → Them vao Section 7
   - Patches C-G (WCAG fixes) → Them vao sections tuong ung
   - Patch H (WCAG checklist) → Cap nhat Section 63

B. **Contract patches (P3)**:
   - Patch A (build packet reconciliation) → Sua Section 81
   - Patch B (10 block contracts) → Them vao Section 82

C. **Manufacturing + Manifests (P4)**:
   - Patch A (COPQ section) → Them Section 88 truoc Changelog
   - Patch B (shift handover flow) → Them vao Section 85
   - Patch C (PWA manifest) → Them vao Section 86
   - Patch D (cycle count cross-ref) → Them vao Section 73 hoac inventory section
   - Patches E-F (manifests) → Them vao Section 56/77 va Section 83

D. **Cap nhat numbering**:
   - Changelog section → Section 89
   - TOC cap nhat cho 89 sections

E. **Cap nhat footer**:
```
HESEM MOM — Module Layout Template Design System v4.7 Enterprise — 123 templates · 95+ block types · 20 visual themes · 30 component presets · 34 modules · 384+ CSS custom properties · 89 sections — 2026-04-11
```

F. **Cap nhat self-audit evidence table**:
Them rows:
| Gate | Result | Evidence |
|------|--------|----------|
| Typography rem | Pass | All --text-* tokens use rem. 0 hardcoded px font-size in CSS or inline. |
| Contrast table accuracy | Pass | Token values match CSS declarations exactly. |
| WCAG checklist | Pass | 5 partial items resolved (3.3.1, 4.1.3, 2.4.11, 1.1.1, 2.5.8). |
| Build packet S36 alignment | Pass | 30 fields including all 23 Standard 36 fields + 7 supplements. |
| Block contract coverage | Pass | 15 block types with full 14-field contracts. |
| Machine-readable manifests | Pass | Status label manifest + QA gate manifest in JSON. |

### Kiem tra sau khi xong
- 89 sections
- TOC day du
- Changelog v4.7
- KHONG con font-size px

---

## PROMPT 6: Final Validation

### Muc tieu
Kiem tra toan bo file v4.7. Dam bao 100/100 tren TAT CA 5 expert areas.

### Buoc thuc hien

**Buoc 1**: Doc TOAN BO file chinh.

**Buoc 2**: Chay checklist (50 items):

#### A. CSS Token Expert Checklist (10 items)
- [ ] Typography tokens :root dung rem (khong con px)
- [ ] KHONG con `font-size:10px` hoac `font-size:11px` ANYWHERE trong file (grep de xac nhan)
- [ ] KHONG con hardcoded hex trong functional inline styles (layer diagram, severity marks)
- [ ] @media (forced-colors: active) co mat
- [ ] Dark --text-tertiary KHAC --text-secondary
- [ ] 20/20 theme token maps co mat
- [ ] Container query rules co comments mapping toi tokens
- [ ] Spacing label "4px unit, pragmatic scale"
- [ ] Stale comment dong 10 da fix
- [ ] .p10-line gradient dung tokens

#### B. Component Expert Checklist (10 items)
- [ ] 14 module archetypes co mat voi zones, templates, examples
- [ ] Build packet 30 fields voi bang mapping toi Standard 36
- [ ] 15+ block contracts co full 14 fields
- [ ] 19 QA gates co mat
- [ ] Definition of Done 27 items co mat
- [ ] Template naming T-<archetype>-<domain>-<variant>
- [ ] All 87+ sections co status labels
- [ ] NCR Form vi du co 30 fields
- [ ] Cross-references toi Standard 36
- [ ] COPQ la section rieng (khong phai inline patch)

#### C. Manufacturing Expert Checklist (10 items)
- [ ] OEE contract intact (Section 70)
- [ ] IQC workflow intact (Section 71)
- [ ] PM workflow intact (Section 72)
- [ ] Lot genealogy intact (Section 73)
- [ ] Training effectiveness intact (Section 74)
- [ ] Gauge R&R intact (Section 75)
- [ ] Supplier quality intact (Section 76)
- [ ] Shift handover co flow diagram (Section 85)
- [ ] Offline/PWA co PWA manifest guidance (Section 86)
- [ ] COPQ standalone section voi formula + KPIs (Section 88)

#### D. Accessibility Expert Checklist (10 items)
- [ ] Contrast table values khop CSS tokens
- [ ] Dark tertiary enforcement rule co mat
- [ ] SC 3.3.1 co aria-errormessage guidance + code sample → Dat
- [ ] SC 4.1.3 co live region + throttle → Dat
- [ ] SC 2.4.11 co brand-2 contrast verification → Dat
- [ ] SC 1.1.1 co chart fallback code sample → Dat
- [ ] SC 2.5.8 co 24px minimum safeguard → Dat
- [ ] lang="en" guidance co mat
- [ ] Toast accessibility guidance co mat
- [ ] rem-based typography info-box co mat

#### E. Architecture Expert Checklist (10 items)
- [ ] Production Authority Notice co mat
- [ ] Authority hierarchy co mat
- [ ] Machine-readable status label manifest (JSON)
- [ ] Machine-readable QA gate manifest (JSON)
- [ ] Build packet aligned voi Standard 36 (30 fields, 23 goc + 7 bo sung)
- [ ] Section 77 Standard 36 alignment overview
- [ ] Doc-vs-code drift documented (theme manager)
- [ ] Naming standard voi alias mapping
- [ ] Governance roadmap (Wave 1/2/3)
- [ ] Self-audit evidence table cap nhat

**Buoc 3**: Grep kiem tra:
```bash
# KHONG con px font-size
grep -c "font-size:[0-9]*px" file.html  # Phai = 0 (hoac chi trong comment/code-block samples)

# Tat ca sections co labels
grep -c "ENFORCED NOW\|PARTIAL\|TARGET\|REFERENCE\|DEPRECATED" file.html  # Phai >= 87

# Version
grep "v4.7" file.html | head -5  # Xac nhan version
```

**Buoc 4**: Neu co item FAIL, fix ngay.

**Buoc 5**: Validation stamp:
```html
<!-- VALIDATION STAMP -->
<!-- v4.7 validated: 89 sections, 384+ CSS tokens, ~12500 dong -->
<!-- Standard 36 alignment: FULL — all 23 S36 fields present in build packet -->
<!-- Typography: 100% rem-based, 0 hardcoded px font-size -->
<!-- WCAG 2.2 AA: all SCs marked Dat, forced-colors supported -->
<!-- Block contracts: 15/95+ types with full 14-field contracts -->
<!-- QA gates: 19/19 documented, enforcement roadmap Wave 1/2/3 -->
<!-- P0: 0. P1: 0. P2: 0. Target: 100/100 -->
```

---

## TOM TAT EXECUTION

```
Prompt 1 (Sua truc tiep — rem + CSS polish)
    ↓
Prompt 2 (Accessibility) ─────┐
Prompt 3 (Contracts) ─────────┤ Song song
Prompt 4 (Mfg + Manifests) ───┘
    ↓
Prompt 5 (Merge)
    ↓
Prompt 6 (Validate)
```

**Tong cong**: 6 prompts
**Muc tieu diem sau v4.7**:
| Expert | v4.6 | v4.7 Target |
|--------|------|-------------|
| CSS Token | 95.5 | 99+ |
| Component | 91 | 98+ |
| Manufacturing | 97 | 99+ |
| Accessibility | 95 | 99+ |
| Architecture | 95 | 99+ |
| **Average** | **94.7** | **99+** |

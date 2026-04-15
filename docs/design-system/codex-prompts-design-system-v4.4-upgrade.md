# HESEM MOM — Bo Prompt Codex: Nang cap Design System v4.3 → v4.4

> **Ngay tao**: 2026-04-11
> **Tong cong**: 10 prompts nang cap chuyen sau
> **Execution order**: Prompt 1 truoc → Prompt 2+3+4+5+6 song song → Prompt 7+8 song song → Prompt 9 merge → Prompt 10 validation
> **Phuong phap**: Cach 2 — moi prompt (tru Prompt 1) viet ra file temp rieng, Prompt 9 merge tat ca vao file chinh

---

## BOI CANH TONG THE — DOC KY TRUOC KHI LAM BAT KY PROMPT NAO

### Du an
HESEM MOM la phan mem quan ly san xuat cap doanh nghiep (ERP/MOM/MES/eQMS) cho nganh CNC precision machining (semiconductor, aerospace, medical devices). Frontend: vanilla JS + HTML + CSS. Backend: PHP. Khong dung React/Vue.

### File chinh
```
mom/docs/module-layout-template-design-system-v4.html
```
- Hien tai: 7229 dong, 58 sections, version v4.3
- Muc tieu: Nang len v4.4, ~10000+ dong, ~62+ sections

### Cau truc file hien tai (58 sections)
| # | ID | Tieu de | Dong |
|---|-----|---------|------|
| 1 | summary | Tom Tat Thuc Thi | 552 |
| 2 | architecture | Kien truc he thong | 566 |
| 3 | standards | Quy chuan do hoa | 606 |
| 4 | component-states | Ma tran trang thai thanh phan | 750 |
| 5 | density-modes | Che do mat do du lieu | 827 |
| 6 | dark-mode-mapping | Dark mode token mapping | 863 |
| 7 | accessibility | Accessibility va ARIA patterns | 922 |
| 8 | error-patterns | Mau trang thai loi | 1071 |
| 9 | loading-patterns | Mau tai du lieu | 1207 |
| 10 | empty-states | Trang thai trong | 1283 |
| 11 | notification-patterns | Mau thong bao va toast | 1322 |
| 12 | data-viz | Huong dan truc quan hoa du lieu | 1399 |
| 13 | content-guidelines | Huong dan noi dung | 1453 |
| 14 | shop-floor-mode | Che do xuong san xuat | 1495 |
| 15 | compliance-forms | 21 CFR Part 11 | 1670 |
| 16 | shift-themes | Chuyen doi giao dien theo ca | 1792 |
| 17 | print-layouts | Bo cuc toi uu cho in an | 1879 |
| 18 | operator-interface | Giao dien van hanh may | 1964 |
| 19 | realtime-dashboard | Mau dashboard thoi gian thuc | 2072 |
| 20 | token-reference | He thong Design Token chinh xac | 2175 |
| 21 | form-rules | Quy chuan Form Layout | 2354 |
| 22 | table-rules | Quy chuan Table tuong tac | 2391 |
| 23 | modal-rules | Quy chuan Modal & Dialog | 2426 |
| 24 | nav-rules | Navigation thich ung | 2476 |
| 25 | dataviz-rules | Data Visualization chinh xac | 2536 |
| 26 | keyboard-rules | Ma tran phim tat | 2592 |
| 27 | icon-rules | He thong Icon | 2642 |
| 28 | responsive-rules | Responsive Layout | 2668 |
| 29 | block-schema | Block JSON Schema | 2717 |
| 30 | toast-precise | Toast & Notification chinh xac | 3188 |
| 31 | interaction-specs | Quy chuan Tuong tac Chuyen sau | 3220 |
| 32 | mfg-domain | Manufacturing Domain Precision | 3521 |
| 33 | compliance-security | Tuan thu va Bao mat Du lieu | 4027 |
| 34 | a11y-i18n | Accessibility & i18n Precision | 4233 |
| 35 | block-runtime | Block Engine Runtime & API | 4611 |
| 36 | visual-themes | 20 Visual Theme Presets | 4907 |
| 37 | block-engine | Block Engine | 5594 |
| 38 | zone-system | Zone System | 5822 |
| 39 | scroll-ux | Smart Scroll UX | 5876 |
| 40-52 | cat-* | 13 nhom template catalog | 5945-6900 |
| 53 | component-presets | Component Preset Library | 6902 |
| 54 | module-editor | Module Editor Tools | 6939 |
| 55 | token-cascade | Token Cascade | 7016 |
| 56 | governance | Governance & Roadmap | 7077 |
| 57 | toc-detail | Muc luc chi tiet | 7129 |
| 58 | changelog | Changelog | 7202 |

### Ket qua kiem dinh 5 chuyen gia v4.3 (diem trung binh 64.4/100)
| Expert | Diem | P0 | P1 |
|--------|------|-----|-----|
| CSS Token & Design System | 62 | 11 | 22 |
| Component & Interaction | 78 | 2 | 13 |
| Manufacturing Domain | 72 | 6 | 10 |
| Accessibility & i18n | 72 | 8 | 10 |
| Architecture & Runtime | 38 | 6 | 9 |
| **Trung binh** | **64.4** | **33** | **64** |

### QUY TAC CHUNG CHO MOI PROMPT
1. **Tieng Viet**: Moi noi dung user-facing PHAI co dau day du (vi du: "Trang thai" khong phai "Trang thai")
2. **Token-first**: KHONG dung hardcoded hex/rgba — PHAI dung var(--token)
3. **Cross-reference**: Moi section phai lien ket section lien quan bang `<a href="#id">Section X</a>`
4. **HTML structure**: Dung dung class `.section`, `.section-title`, `.section-number`, `.info-box`, `.spec-table`, `.code-block`
5. **Info-box mau**: blue=thong tin, green=DO, amber=CANH BAO, red=KHONG LAM, purple=CROSS-REF
6. **Khong xoa**: Chi THEM hoac SUA noi dung, khong xoa section/content co san
7. **Giu so section**: Khong doi so section hien tai — chi them section moi vao cuoi (truoc changelog)

---

## PROMPT 1: CSS Token Foundation v4.4 — Sua truc tiep file chinh

### Muc tieu
Sua truc tiep `:root` CSS block va dark mode block trong file chinh de bo sung tat ca token con thieu. Day la nen tang de moi prompt khac tham chieu.

### Buoc thuc hien

**Buoc 1**: Doc file `mom/docs/module-layout-template-design-system-v4.html` dong 1-460 (CSS block).

**Buoc 2**: Them vao `:root` (sau dong 213, truoc `}` dong cuoi cua :root) cac token sau:

```css
/* === EXPANDED SEMANTIC COLOR SCALE === */
/* Moi role can 10 shades: 50,100,200,300,400,500,600,700,800,900 */
/* Hien tai chi co 50,100,600,700 — them 200,300,400,500,800,900 */

/* Success */
--color-success-200:#bbf7d0;
--color-success-300:#86efac;
--color-success-400:#4ade80;
--color-success-500:#22c55e;
--color-success-800:#166534;
--color-success-900:#14532d;

/* Warning */
--color-warning-200:#fde68a;
--color-warning-300:#fcd34d;
--color-warning-400:#fbbf24;
--color-warning-500:#f59e0b;
--color-warning-800:#92400e;
--color-warning-900:#78350f;

/* Error */
--color-error-200:#fecaca;
--color-error-300:#fca5a5;
--color-error-400:#f87171;
--color-error-500:#ef4444;
--color-error-800:#991b1b;
--color-error-900:#7f1d1d;

/* Info */
--color-info-200:#bfdbfe;
--color-info-300:#93c5fd;
--color-info-400:#60a5fa;
--color-info-500:#3b82f6;
--color-info-800:#1e40af;
--color-info-900:#1e3a5f;

/* Brand */
--color-brand-200:#bfdbfe;
--color-brand-300:#93c5fd;
--color-brand-400:#60a5fa;
--color-brand-500:#3b82f6;
--color-brand-800:#1e40af;
--color-brand-900:#0c2d48;

/* Accent */
--color-accent-200:#fde68a;
--color-accent-300:#fcd34d;
--color-accent-400:#fbbf24;
--color-accent-500:#f59e0b;
--color-accent-800:#92400e;
--color-accent-900:#78350f;

/* Teal */
--color-teal-200:#99f6e4;
--color-teal-300:#5eead4;
--color-teal-400:#2dd4bf;
--color-teal-500:#14b8a6;
--color-teal-800:#115e59;
--color-teal-900:#134e4a;

/* Purple */
--color-purple-200:#ddd6fe;
--color-purple-300:#c4b5fd;
--color-purple-400:#a78bfa;
--color-purple-500:#8b5cf6;
--color-purple-800:#5b21b6;
--color-purple-900:#4c1d95;

/* Neutral */
--color-neutral-200:#e2e8f0;
--color-neutral-300:#cbd5e1;
--color-neutral-400:#94a3b8;
--color-neutral-500:#64748b;
--color-neutral-800:#1e293b;
--color-neutral-900:#0f172a;

/* Cyan — them day du (hien chi co primitive) */
--color-cyan-50:#ecfeff;
--color-cyan-100:#cffafe;
--color-cyan-200:#a5f3fc;
--color-cyan-300:#67e8f9;
--color-cyan-400:#22d3ee;
--color-cyan-500:#06b6d4;
--color-cyan-600:#0891b2;
--color-cyan-700:#0e7490;
--color-cyan-800:#155e75;
--color-cyan-900:#164e63;

/* Pink — them day du */
--color-pink-50:#fdf2f8;
--color-pink-100:#fce7f3;
--color-pink-200:#fbcfe8;
--color-pink-300:#f9a8d4;
--color-pink-400:#f472b6;
--color-pink-500:#ec4899;
--color-pink-600:#db2777;
--color-pink-700:#be185d;
--color-pink-800:#9d174d;
--color-pink-900:#831843;

/* === ICON SIZE TOKENS === */
--icon-xs:12px;
--icon-sm:14px;
--icon-md:16px;
--icon-lg:20px;
--icon-xl:24px;
--icon-2xl:32px;

/* === DATA VIZ PALETTE === */
--chart-1:#1565c0;
--chart-2:#16a34a;
--chart-3:#d97706;
--chart-4:#7c3aed;
--chart-5:#0891b2;
--chart-6:#db2777;
--chart-7:#0d9488;
--chart-8:#dc2626;
--chart-seq-1:#eff6ff;
--chart-seq-2:#93c5fd;
--chart-seq-3:#3b82f6;
--chart-seq-4:#1d4ed8;
--chart-seq-5:#1e3a5f;

/* === STATE COMPOSITION TOKENS === */
--state-hover-bg:color-mix(in srgb, var(--brand-2) 6%, transparent);
--state-pressed-bg:color-mix(in srgb, var(--brand-2) 10%, transparent);
--state-selected-bg:color-mix(in srgb, var(--brand-2) 8%, transparent);
--state-dragged-bg:color-mix(in srgb, var(--brand-2) 12%, transparent);

/* === CONTRAST / ON-COLOR TOKENS === */
--color-on-brand:#ffffff;
--color-on-accent:#1e293b;
--color-on-success:#ffffff;
--color-on-warning:#1e293b;
--color-on-error:#ffffff;
--color-on-info:#ffffff;

/* === SURFACE SEMANTIC ALIASES === */
--bg-success:var(--color-success-50);
--bg-warning:var(--color-warning-50);
--bg-error:var(--color-error-50);
--bg-info:var(--color-info-50);

/* === BORDER STATE TOKENS === */
--border-error:var(--color-error-600);
--border-success:var(--color-success-600);
--border-warning:var(--color-warning-600);
--border-info:var(--color-info-600);
--text-error:var(--color-error-600);

/* === SKELETON TOKENS === */
--skeleton-bg:var(--color-neutral-200);
--skeleton-highlight:var(--color-neutral-100);
--skeleton-radius:var(--radius-md);
--skeleton-duration:1.5s;

/* === SHADOW EXTRAS === */
--shadow-none:none;
--shadow-inset:inset 0 2px 4px rgba(12,45,72,.06);
--shadow-color:rgba(12,45,72,.08);

/* === TRANSITION DEFAULT === */
--transition-default:var(--duration-normal) var(--ease-out);

/* === BREAKPOINT TOKENS (for JS consumption) === */
--bp-sm:640px;
--bp-md:768px;
--bp-lg:1024px;
--bp-xl:1280px;
--bp-2xl:1536px;

/* === MANUFACTURING STATUS TOKENS (theme-invariant) === */
--machine-running:#16a34a;
--machine-idle:#64748b;
--machine-setup:#d97706;
--machine-down:#dc2626;
--machine-alarm:#b91c1c;
--machine-pm:#7c3aed;
--spc-in-control:#16a34a;
--spc-warning:#d97706;
--spc-violation:#dc2626;

/* === WORK ORDER STATUS TOKENS === */
--wo-created:#64748b;
--wo-released:#2563eb;
--wo-in-progress:#d97706;
--wo-completed:#16a34a;
--wo-closed:#334155;
--wo-on-hold:#7c3aed;

/* === DOCUMENT STATUS TOKENS === */
--doc-draft:#64748b;
--doc-review:#d97706;
--doc-approved:#2563eb;
--doc-effective:#16a34a;
--doc-obsolete:#dc2626;
--doc-superseded:#94a3b8;

/* === CALIBRATION STATUS TOKENS === */
--cal-valid:#16a34a;
--cal-due-soon:#d97706;
--cal-overdue:#dc2626;
--cal-out-of-service:#94a3b8;
```

**Buoc 3**: Them dark mode overrides cho cac token moi — ben trong `@media(prefers-color-scheme:dark){ :root{ ... } }` (dong ~365-433). Them NGAY SAU dong cuoi cung hien co trong dark :root block:

```css
/* Expanded shade dark overrides */
--color-success-200:#14532d;--color-success-300:#166534;--color-success-400:#15803d;--color-success-500:#16a34a;--color-success-800:#86efac;--color-success-900:#bbf7d0;
--color-warning-200:#78350f;--color-warning-300:#92400e;--color-warning-400:#b45309;--color-warning-500:#d97706;--color-warning-800:#fcd34d;--color-warning-900:#fde68a;
--color-error-200:#7f1d1d;--color-error-300:#991b1b;--color-error-400:#b91c1c;--color-error-500:#dc2626;--color-error-800:#fca5a5;--color-error-900:#fecaca;
--color-info-200:#1e3a5f;--color-info-300:#1e40af;--color-info-400:#2563eb;--color-info-500:#3b82f6;--color-info-800:#93c5fd;--color-info-900:#bfdbfe;
--color-brand-200:#082f49;--color-brand-300:#0c4a6e;--color-brand-400:#0369a1;--color-brand-500:#0284c7;--color-brand-800:#93c5fd;--color-brand-900:#bfdbfe;
--color-accent-200:#78350f;--color-accent-300:#92400e;--color-accent-400:#b45309;--color-accent-500:#d97706;--color-accent-800:#fcd34d;--color-accent-900:#fde68a;
--color-teal-200:#134e4a;--color-teal-300:#115e59;--color-teal-400:#0f766e;--color-teal-500:#0d9488;--color-teal-800:#5eead4;--color-teal-900:#99f6e4;
--color-purple-200:#4c1d95;--color-purple-300:#5b21b6;--color-purple-400:#6d28d9;--color-purple-500:#7c3aed;--color-purple-800:#c4b5fd;--color-purple-900:#ddd6fe;
--color-neutral-200:#1e293b;--color-neutral-300:#334155;--color-neutral-400:#475569;--color-neutral-500:#64748b;--color-neutral-800:#e2e8f0;--color-neutral-900:#f1f5f9;
--color-cyan-50:#083344;--color-cyan-100:#164e63;--color-cyan-200:#155e75;--color-cyan-300:#0e7490;--color-cyan-400:#0891b2;--color-cyan-500:#06b6d4;--color-cyan-600:#22d3ee;--color-cyan-700:#67e8f9;--color-cyan-800:#a5f3fc;--color-cyan-900:#cffafe;
--color-pink-50:#500724;--color-pink-100:#831843;--color-pink-200:#9d174d;--color-pink-300:#be185d;--color-pink-400:#db2777;--color-pink-500:#ec4899;--color-pink-600:#f472b6;--color-pink-700:#f9a8d4;--color-pink-800:#fbcfe8;--color-pink-900:#fce7f3;

/* State composition dark */
--state-hover-bg:color-mix(in srgb, var(--brand-2) 8%, transparent);
--state-pressed-bg:color-mix(in srgb, var(--brand-2) 14%, transparent);
--state-selected-bg:color-mix(in srgb, var(--brand-2) 10%, transparent);

/* Surface semantic dark */
--bg-success:var(--color-success-50);--bg-warning:var(--color-warning-50);--bg-error:var(--color-error-50);--bg-info:var(--color-info-50);

/* Border/text state dark */
--border-error:var(--color-error-600);--border-success:var(--color-success-600);--border-warning:var(--color-warning-600);--border-info:var(--color-info-600);--text-error:var(--color-error-600);

/* Skeleton dark */
--skeleton-bg:var(--color-neutral-700);--skeleton-highlight:var(--color-neutral-600);

/* Shadow dark */
--shadow-inset:inset 0 2px 4px rgba(0,0,0,.15);--shadow-color:rgba(0,0,0,.3);

/* Chart dark */
--chart-1:#60a5fa;--chart-2:#4ade80;--chart-3:#fbbf24;--chart-4:#a78bfa;--chart-5:#22d3ee;--chart-6:#f472b6;--chart-7:#2dd4bf;--chart-8:#f87171;
--chart-seq-1:#1e3a5f;--chart-seq-2:#1d4ed8;--chart-seq-3:#3b82f6;--chart-seq-4:#60a5fa;--chart-seq-5:#bfdbfe;

/* Machine status dark (theme-invariant — KHONG DOI) */
--machine-status-border:var(--border);--machine-status-surface:#1e293b;--machine-status-text:var(--text-primary);
```

**Buoc 4**: THEM class-based dark mode selector. Ngay SAU `@media(prefers-color-scheme:dark){ ... }` block (dong ~448), them:

```css
/* === CLASS-BASED DARK MODE (for admin toggle, schedule, per-theme) === */
html[data-color-scheme-active="dark"]{
  /* Copy TOAN BO noi dung tu @media(prefers-color-scheme:dark) :root block o tren vao day */
  /* Bao gom: surfaces, text, border, primitives, shadows, semantic colors, states, skeleton, charts */
}
html[data-color-scheme-active="dark"] body{background:var(--bg-page)}
html[data-color-scheme-active="dark"] .doc-header{background:linear-gradient(135deg,#020617 0%,#0f172a 32%,#1e3a5f 72%,#1e40af 100%)}
html[data-color-scheme-active="dark"] .toc{background:rgba(30,41,59,.85);border-color:rgba(51,65,85,.6)}
html[data-color-scheme-active="dark"] .section{background:rgba(30,41,59,.7);border-color:var(--border)}
html[data-color-scheme-active="dark"] .card{background:var(--bg-surface);border-color:var(--border)}
html[data-color-scheme-active="dark"] .card-header{background:linear-gradient(180deg,#1e293b,#162032);border-color:var(--border)}
html[data-color-scheme-active="dark"] .stat-card{background:linear-gradient(180deg,#1e293b,#162032);border-color:var(--border)}
html[data-color-scheme-active="dark"] .tpl-card{background:var(--bg-surface);border-color:var(--border)}
html[data-color-scheme-active="dark"] .tpl-thumb{background:linear-gradient(180deg,#162032,#0f172a);border-color:var(--border)}
html[data-color-scheme-active="dark"] .code-block{background:#020617}
html[data-color-scheme-active="dark"] .spec-table th{background:var(--bg-surface-alt)}
```

**Buoc 5**: Sua CSS media queries (dong ~455-457) de KHOP voi breakpoint tokens:

Tim:
```css
@media (max-width: 1280px){...}
@media (max-width: 920px){...}
@media (max-width: 620px){...}
```

Doi thanh (giu nguyen noi dung ben trong nhung doi breakpoint values):
```css
@media (max-width: 1280px){/* giu nguyen */}
@media (max-width: 1024px){/* noi dung giong 920px cu + them grid-3 1col */}
@media (max-width: 768px){/* noi dung giong 920px cu */}
@media (max-width: 640px){/* noi dung giong 620px cu */}
```

**Buoc 6**: Fix `--text-overline` tu 10px len 11px (cho Vietnamese diacritics):
- Dong 127: doi `--text-overline:10px;` thanh `--text-overline:11px;`
- Dong 129: doi `--text-overline-leading:1.3;` thanh `--text-overline-leading:1.4;`

**Buoc 7**: Fix tat ca tham chieu `--text-1`, `--text-2`, `--text-3` trong TOAN BO file:
- Tim REGEX `--text-1\b` (khong match --text-10, --text-12) → doi thanh `--text-primary`
- Tim `--text-2\b` (khong match --text-2xl, --text-20) → doi thanh `--text-secondary`
- Tim `--text-3\b` (khong match --text-3xl) → doi thanh `--text-tertiary`
- CAN THAN: chi doi trong noi dung text/code blocks, KHONG doi trong CSS token definitions

**Buoc 8**: Cap nhat header meta:
- Version: v4.3 → v4.4
- Date: 2026-04-11 (giu nguyen hoac doi theo ngay hien tai)
- CSS Tokens: 120+ → 250+
- Them meta-item: `<span class="meta-item">250+ CSS Tokens</span>`

**Buoc 9**: Cap nhat Section 58 Changelog — them entry v4.4:
```html
<div class="info-box info-box-blue">
<strong>v4.4 (ngay hien tai)</strong>
Token foundation: 250+ CSS custom properties (10-shade semantic scale, icon sizes, chart palette, state composition, on-color contrast, manufacturing/WO/doc/calibration status tokens). Class-based dark mode selector. Breakpoint alignment 5-point. Vietnamese overline fix 11px. --text-1/2/3 alias fix. New sections: Inline Edit, Command Palette, Work Order Lifecycle, Tool Management, Document Control, FAI/AS9102, Print CoC/CoA.
</div>
```

---

## PROMPT 2: Component Interaction Gaps → `mom/docs/tmp/v4.4-p2-interaction.html`

### Muc tieu
Viet 2 section HTML moi vao file temp: (A) Inline Edit Interaction Pattern, (B) Command Palette Pattern. Day la 2 P0 gaps tu Component Expert.

### Doc truoc khi lam
- File chinh: sections 4, 21, 22, 23, 26, 29, 30, 31 (de cross-reference dung)
- Dac biet: Section 31 dong 3220-3517 (11 patterns hien co) de giu format nhat quan

### Section A: Inline Edit Interaction Pattern (them vao Section 31 nhu Pattern 12)

Viet 1 spec-table chi tiet voi cac rows:

| State | Behavior | Token/CSS | ARIA | Vi du MOM |
|-------|----------|-----------|------|-----------|

Cac states BAT BUOC phai co:
1. **Idle** — Cell hien thi text binh thuong, cursor default
2. **Hover** — Cursor pointer, subtle edit icon hint (pencil icon 12px, opacity 0.4)
3. **Trigger** — Double-click HOAC Enter khi cell focused. PHAI co keyboard trigger (khong chi mouse)
4. **Editing** — Cell chuyen thanh input/textarea/select. Border `var(--brand-2)` 2px. Background `var(--bg-input)`. Focus tu dong vao input. Gia tri cu pre-filled
5. **Validating** — On blur hoac Enter: validate. Hien thi inline error duoi cell voi `var(--text-error)`, border `var(--border-error)`
6. **Saving** — Spinner 16px trong cell. Optimistic update: UI cap nhat ngay, rollback neu fail
7. **Success** — Flash border `var(--border-success)` 500ms. Cell tro ve Idle
8. **Error (server)** — Cell giu editing mode. Toast error theo Section 30. Retry button
9. **Cancel** — Escape key hoac click ngoai. Restore gia tri cu. Khong dirty warning neu chua thay doi
10. **Conflict** — Server tra 409: mo modal diff split-pane theo Section 31 Pattern 6
11. **Cell-to-cell navigation** — Tab di chuyen sang cell editable tiep theo (theo row). Shift+Tab nguoc lai. Enter save va xuong row duoi
12. **Concurrent lock** — Neu user khac dang edit cung cell: hien lock icon + tooltip "Dang duoc chinh sua boi [ten]". Khong cho edit

Them info-boxes:
- GREEN DO: "Inline edit PHAI co keyboard trigger. KHONG chi dua vao double-click"
- AMBER WARNING: "Inline edit KHONG ap dung cho: truong regulated (21 CFR Part 11), truong e-signature, truong da khoa. Xem Section 15"
- PURPLE CROSS-REF: "Lien ket Section 4 state matrix, Section 22 table rules, Section 31 Pattern 4 auto-save, Section 31 Pattern 5 optimistic update"

### Section B: Command Palette Pattern (them vao Section 31 nhu Pattern 13)

Viet 1 spec-table:

| Aspect | Spec | Token/CSS | ARIA | Vi du MOM |
|--------|------|-----------|------|-----------|

Cac aspects BAT BUOC:
1. **Trigger** — `Ctrl+/` (Windows/Linux), `Cmd+/` (Mac). KHONG mo dong thoi voi Ctrl+K search. Neu search dang mo, dong search roi mo palette
2. **Overlay** — Modal `size=sm` width 480px. `z-index:var(--z-modal)`. Backdrop `var(--bg-overlay)`. Focus trap
3. **Input** — Auto-focus. Placeholder "Nhap lenh..." (tieng Viet co dau). Debounce 100ms
4. **Command categories** — Navigation (di chuyen module), Action (tao moi, xuat), Settings (doi theme, density), Recent (5 lenh gan nhat)
5. **Result list** — Max 10 items visible. Keyboard: ArrowUp/Down di chuyen, Enter chon, Escape dong
6. **Command item** — Icon (Lucide) + Label + Shortcut hint + Category badge. Highlight matching text
7. **Permission filter** — Chi hien lenh user co quyen. Vi du: "Tao Work Order" chi hien neu user co role `production_planner`
8. **Execution feedback** — Dong palette ngay. Toast success/error theo Section 30. Navigation commands dung deep link theo Section 31 Pattern 7
9. **Empty state** — "Khong tim thay lenh phu hop" voi icon search-x
10. **Recent/Pinned** — Luu 5 lenh gan nhat vao localStorage key `hesem_command_recent`. Pin lenh thuong dung

Them info-boxes:
- GREEN DO: "Command palette la SHORTCUT, khong thay the menu chinh. Moi lenh trong palette PHAI co duong di tuong duong qua menu/nav"
- PURPLE CROSS-REF: "Lien ket Section 26 keyboard matrix, Section 31 Pattern 9 search, Section 24 navigation"

### Format output
File `mom/docs/tmp/v4.4-p2-interaction.html` chi chua 2 `<div class="section">` blocks voi day du HTML markup. KHONG co `<html>`, `<head>`, `<style>`. Chi co noi dung section thuan tuy.

---

## PROMPT 3: Manufacturing Domain Gaps → `mom/docs/tmp/v4.4-p3-manufacturing.html`

### Muc tieu
Viet 4 section HTML moi bo sung cac P0 manufacturing gaps.

### Doc truoc khi lam
- File chinh: sections 14, 15, 18, 19, 32, 33, 44, 45 (de hieu boi canh hien co)

### Section A: Work Order Lifecycle State Machine

Viet 1 section moi voi:

1. **State flow diagram** (dung flow-row/flow-node/flow-arrow classes):
   Created → Released → In-Progress → Completed → Closed
   Nhanh phu: Created → On-Hold → Released, In-Progress → On-Hold → In-Progress

2. **State token table**:
| State | Token | Hex Light | Hex Dark | Icon (Lucide) | Cho phep edit? | E-signature? |
|-------|-------|-----------|----------|---------------|----------------|-------------|
| Created | --wo-created | #64748b | #94a3b8 | file-plus | Co | Khong |
| Released | --wo-released | #2563eb | #60a5fa | send | Chi quantity | Release sign |
| In-Progress | --wo-in-progress | #d97706 | #fbbf24 | loader | Khong | Khong |
| Completed | --wo-completed | #16a34a | #4ade80 | check-circle | Khong | Completion sign |
| Closed | --wo-closed | #334155 | #475569 | lock | Khong | Khong |
| On-Hold | --wo-on-hold | #7c3aed | #a78bfa | pause-circle | Chi notes | Khong |

3. **Transition rules table**:
| From | To | Condition | Validation | Audit |
|------|----|-----------|------------|-------|
| Created | Released | BOM confirmed, routing confirmed | Material availability check | Reason required |
| Released | In-Progress | Operator scans WO barcode | Machine status != Down | Auto-logged |
| In-Progress | Completed | All operations done, qty reported | QC check nếu required | Auto-logged |
| Completed | Closed | QA review done | All inspections passed | E-signature |
| Any | On-Hold | Manager action | Reason code required | Reason + user + timestamp |

4. **JSON Schema** cho WO block (tuong tu format Section 29)

### Section B: Tool Management & Tool Life

1. **Tool crib dashboard layout**: Grid voi cac zone
   - Tool inventory list (searchable, filterable by type/machine/status)
   - Tool life counter display: bar chart showing remaining life % per tool
   - Alert panel: tools approaching life limit (< 20% remaining)

2. **Tool status tokens**:
| Status | Token | Color | Icon |
|--------|-------|-------|------|
| Available | --tool-available | var(--green) | wrench |
| In-Use | --tool-in-use | var(--brand-2) | settings |
| Worn (>80% life) | --tool-worn | var(--amber) | alert-triangle |
| Expired | --tool-expired | var(--red) | x-circle |
| Regrind | --tool-regrind | var(--purple) | refresh-cw |
| Scrapped | --tool-scrapped | var(--slate) | trash-2 |

3. **Tool preset/offset tracking table**: Tool ID, Offset X/Y/Z, Wear Compensation, Last Measured, Measured By
4. **Tool replacement workflow**: Alert → Select replacement → Verify offset → Confirm → Log change

### Section C: Document Control Lifecycle

1. **State machine** (tuong tu Work Order):
   Draft → In Review → Approved → Effective → Obsolete
   Nhanh phu: In Review → Rejected → Draft, Effective → Superseded

2. **Token table** cho document status (reuse `--doc-*` tokens tu Prompt 1)

3. **Revision control rules**:
   - Minor revision: 1.0 → 1.1 (editorial, khong can approval lai)
   - Major revision: 1.x → 2.0 (content change, can full approval cycle)
   - Format: `REV-{major}.{minor}` vi du REV-3.2

4. **Approval routing**: Sequential (A → B → C) vs Parallel (A + B + C dong thoi). Timeout escalation: 48h → escalate to manager

5. **Controlled document types**: SOP, Work Instruction, Process Spec, Drawing, Form/Template, Policy

### Section D: First Article Inspection (FAI) — AS9102

1. **3 forms layout**:
   - Form 1: Part Number Accountability (part info, FAI reason, sign-off)
   - Form 2: Product Accountability (sub-assembly list, material certs)
   - Form 3: Characteristic Accountability (balloon#, characteristic, nominal, tolerance, actual, tool, result pass/fail)

2. **Balloon-to-characteristic linking**: Click balloon# tren drawing → highlight row trong Form 3
3. **FAI approval workflow**: Inspector → QA Engineer → QA Manager (e-signature moi buoc)
4. **Spec table** voi pixel-level form layout rules (label width, input width, column widths cho Form 3)

### Format output
File `mom/docs/tmp/v4.4-p3-manufacturing.html` chua 4 `<div class="section">` blocks.

---

## PROMPT 4: Accessibility & WCAG 2.2 Gaps → `mom/docs/tmp/v4.4-p4-a11y.html`

### Muc tieu
Sua va bo sung accessibility gaps de dat WCAG 2.2 AA hoan chinh.

### Doc truoc khi lam
- File chinh: sections 7, 34 (accessibility hien co)
- Section 4 (component states), Section 14 (shop floor), Section 22 (table), Section 23 (modal)

### Noi dung viet vao file temp

**Phan A: Skip Link CSS** (them vao section CSS patch)
```css
.skip-link{
  position:absolute;
  top:-100%;
  left:16px;
  z-index:var(--z-loading);
  padding:var(--pad-sm) var(--pad-md);
  background:var(--brand-2);
  color:var(--color-on-brand);
  font-size:var(--text-sm);
  font-weight:var(--font-weight-bold);
  border-radius:0 0 var(--radius-md) var(--radius-md);
  text-decoration:none;
  transition:top var(--duration-fast) var(--ease-out);
}
.skip-link:focus{top:0}
```

**Phan B: Section bo sung — WCAG 2.2 Compliance Checklist** (section moi)

Viet 1 spec-table tong hop WCAG 2.2 AA:

| SC | Ten | Trang thai | Ghi chu | Section lien quan |
|----|-----|------------|---------|-------------------|
| 1.1.1 | Non-text Content | Partial | Chart fallback can code sample | 12, 25, 34 |
| 1.3.1 | Info and Relationships | Pass | Landmark mapping, table headers | 34, 22 |
| 1.3.5 | Identify Input Purpose | FAIL | Thieu autocomplete guidance | 21 |
| 1.4.3 | Contrast Minimum | FAIL | --text-tertiary 2.56:1, --amber 3.19:1 | 3, 20, 34 |
| 1.4.4 | Resize Text | FAIL | --text-overline 10px (can 11px cho VN) | 20 |
| 1.4.10 | Reflow | Partial | Can 320px test gate | 28, 5 |
| 1.4.12 | Text Spacing | FAIL | Overline leading 1.3 < 1.4 minimum | 20, 34 |
| 1.4.13 | Content on Hover | FAIL | Tooltip dismissal pattern thieu | 31 |
| 2.2.1 | Timing Adjustable | FAIL | Kiosk 5min timeout khong extend | 14 |
| 2.4.1 | Bypass Blocks | FAIL | Skip link khong co CSS | 34 |
| 2.4.11 | Focus Appearance | Partial | Can verify brand-2 3:1 vs all backgrounds | 3, 20 |
| 2.5.7 | Dragging Movements | FAIL | Column resize drag-only | 22 |
| 2.5.8 | Target Size | Partial | Compact 28px icon buttons may fail | 5 |
| 3.3.1 | Error Identification | Partial | Thieu aria-errormessage | 8, 21 |
| 4.1.3 | Status Messages | Partial | Filter count live region thieu code | 34 |

**Phan C: Fixes chi tiet**

1. **Contrast fix cho --text-tertiary**: Doi `#94a3b8` (2.56:1) thanh `#6b7280` (4.56:1 tren white). Dark mode tuong ung
2. **Tooltip dismissal pattern**: Them spec cho hoverable, dismissible (Escape), persistent (khong bien mat khi hover)
3. **Column resize keyboard**: Them keyboard alternative — focus column header, `Ctrl+Left/Right` de resize +-20px
4. **autocomplete guidance table**: Map form fields → autocomplete values (name, email, tel, organization, etc.)
5. **Kiosk timeout extension**: Them warning toast 60s truoc timeout voi nut "Gia han" (+5 min)
6. **aria-errormessage pattern**: Code sample cho form field error association
7. **Focus appearance verification table**: Tinh toan contrast ratio cua `--brand-2` (#1565c0) tren moi background token
8. **Chart a11y binding contract**: JSON Schema field `accessibility.tableAlt` required cho moi chart block
9. **Filter live region code sample**: `<div role="status" aria-live="polite" aria-atomic="true">Hien thi {count} ket qua</div>`
10. **Compact density safeguard**: Rule "icon-only buttons trong compact mode PHAI co min-width/min-height 24px"

### Format output
File `mom/docs/tmp/v4.4-p4-a11y.html` chua CSS patch + 1 section HTML.

---

## PROMPT 5: Architecture & Runtime Alignment → `mom/docs/tmp/v4.4-p5-runtime.html`

### Muc tieu
Sua cac P0 doc-vs-code mismatches va lam ro ranh gioi "spec" vs "implemented".

### Doc truoc khi lam
- File chinh: sections 35, 36, 37, 38, 55
- Code: `mom/scripts/portal/00b-theme-manager.js` (dong 1-50 cho localStorage keys, dong 740-840 cho VISUAL_THEME_PRESETS)
- Code: `mom/scripts/portal/00c-admin-appearance.js` (dong 1150-1200 cho VISUAL_THEMES)

### Noi dung

**Phan A: Section 55 Token Cascade — Sua localStorage keys**

Tim trong file chinh Section 55 (dong ~7016-7075) tat ca tham chieu sai va sua:
- `hesem_theme_prefs` → `hesem_user_appearance` (thuc te trong code)
- `hesem_layout_density` → ghi chu: "density la property ben trong hesem_user_appearance object, khong phai key rieng"
- Them info-box RED: "CAC KEY DUNG TRONG CODE: hesem_user_appearance, hesem_admin_appearance_cache, hesem_layout_templates, hesem_module_template_binding. Cac key khac trong section nay la TARGET KEYS cho v4.5 migration."

**Phan B: Section 35 Block Runtime — Phan biet spec vs implemented**

Them info-box system vao Section 35:

1. Info-box AMBER dau section: "IMPLEMENTATION STATUS: Cac lifecycle hooks (onMount → onError) va event bus (context.events) la SPEC TARGET cho v4.5. Code hien tai dung template-based HTML generation, khong dung component mounting model. Developer PHAI kiem tra 00-block-engine.js truoc khi su dung bat ky API nao tu section nay."

2. Them bang Implementation Status:
| Feature | Status | File | Ghi chu |
|---------|--------|------|---------|
| Block registration | Partial | 00-block-engine.js | Co register nhung khong co schema validation |
| 9 lifecycle hooks | Spec only | — | Target v4.5 |
| Event bus | Spec only | — | Target v4.5 |
| ResizeObserver | Spec only | — | Target v4.5 |
| IntersectionObserver | Spec only | — | Target v4.5 |
| ErrorBoundary | Spec only | — | Target v4.5 |
| WebSocket realtime | Spec only | — | Target v4.5 |
| Undo/Redo | Partial | 00-block-engine.js | _undoStack/_redoStack exist, command shape not validated |
| JSON Schema validation | Spec only | — | Needs Ajv or equivalent |

**Phan C: Section 36 Visual Themes — Them implementation notes**

Them info-box RED dau Section 36:
"DOC-VS-CODE MISMATCH: File 00b-theme-manager.js VISUAL_THEME_PRESETS chi co 8 themes. File 00c-admin-appearance.js VISUAL_THEMES co 20 themes. Chi 5 IDs overlap. 15 themes co the chon trong admin UI nhung KHONG co runtime preset — applyVisualTheme() se fail silently. PHAI sync 00b truoc khi deploy."

Them bang mapping:
| Theme (00c) | Co trong 00b? | Action |
|-------------|--------------|--------|
| ocean-professional | Co (default) | OK |
| forest-natural | Co | OK |
| sunset-warm | Co (sunrise-warm) | Rename ID |
| midnight-elegant | Co (midnight-dark) | Rename ID |
| coral-vibrant | Co | OK |
| arctic-clean | Khong | THEM vao 00b |
| lavender-soft | Khong | THEM vao 00b |
| (12 themes con lai) | Khong | THEM vao 00b |

Them bang token shape comparison:
| Doc shape | Code shape (00b) | Can align |
|-----------|-----------------|-----------|
| --brand | brandPrimary | Co |
| --brand-2 | brandLight | Co |
| --accent | accent | OK |
| --bg-page | colorsLight.bgPage | Co |
| --bg-surface | colorsLight.bgSurface | Co |
| --text-primary | (thieu) | THEM |
| --text-secondary | (thieu) | THEM |
| --border | (thieu) | THEM |

**Phan D: Section 38 Zone System — Them allowedBlocks enforcement note**

Them info-box AMBER: "Zone allowedBlocks la SPEC ONLY. Code hien tai khong enforce — bat ky block nao co the dat vao bat ky zone nao. Runtime validation can duoc implement trong 00-block-engine.js renderBlock() function."

**Phan E: Section 55 vs Section 35 — Giai quyet mau thuan**

Them info-box BLUE dau Section 55: "AUTHORITY NOTE: Section 35 la nguon chinh thuc (authoritative) cho Block Engine Runtime va localStorage contract. Section 55 mo ta cascade LOGIC (System → Admin → Template → Zone → User). Khi co mau thuan ve keys hoac API, uu tien Section 35."

### Format output
File `mom/docs/tmp/v4.4-p5-runtime.html` chua cac HTML patches (info-boxes, tables) voi comment chi ro vi tri chen.

---

## PROMPT 6: Print & Compliance Extras → `mom/docs/tmp/v4.4-p6-print.html`

### Muc tieu
Bo sung print templates con thieu va compliance gaps.

### Doc truoc khi lam
- File chinh: sections 15, 17, 33

### Noi dung

**Section A: Print Templates Bo Sung**

Them 3 print layouts vao cuoi Section 17 (hoac section moi):

1. **Certificate of Conformance (CoC)**
   - Header: Company logo, cert number, date, customer PO
   - Body: Part number, description, quantity, lot/serial, specification refs
   - Conformance statement: "Cac san pham nay phu hop voi moi yeu cau ky thuat duoc chi dinh"
   - Signatures: QA Inspector, QA Manager
   - Footer: Company address, cert page number
   - Layout: A4 portrait, margins 20mm, font 12pt body / 14pt headers

2. **Certificate of Analysis (CoA)**
   - Header: Tuong tu CoC + lab name
   - Body: Material, heat/lot number, test methods (ASTM/ISO refs)
   - Results table: Characteristic, Spec Min, Spec Max, Actual, Unit, Result (P/F)
   - Signatures: Lab Technician, Lab Manager
   - Layout: A4 portrait

3. **Material Test Report (MTR)**
   - Header: Mill name, MTR number, date
   - Body: Material spec (AMS/ASTM), heat number, form (bar/sheet/forging)
   - Chemical composition table: Element, Spec Min%, Spec Max%, Actual%
   - Mechanical properties table: Property, Spec Min, Spec Max, Actual, Unit
   - Signatures: Mill QA
   - Layout: A4 portrait, landscape option cho nhieu cot

**Section B: NCR Disposition Workflow**

Them spec table vao Section 33 hoac section moi:

| Disposition | Required Fields | E-Signature | Workflow |
|-------------|----------------|-------------|----------|
| Use-As-Is | Engineering justification, risk assessment | Design Engineer + QA Manager | MRB review |
| Rework | Rework instruction, re-inspection plan | Production Eng + QA | Re-inspect after rework |
| Scrap | Scrap reason, cost impact | QA + Finance | Scrap tag, inventory adjustment |
| Return to Supplier | Supplier NCR ref, debit note | Purchasing + QA | Supplier corrective action |
| MRB Review | Full technical review package | MRB Board (3+ members) | Formal meeting minutes |

**Section C: Customer Complaint Handling**

| Phase | Timeline | Owner | Actions | Status Token |
|-------|----------|-------|---------|-------------|
| Receipt | Day 0 | Quality | Log complaint, assign owner, acknowledge customer | --complaint-new (#64748b) |
| Containment | Day 1-3 | Quality + Production | Quarantine suspect product, 100% sort if needed | --complaint-containment (#d97706) |
| Investigation | Day 3-10 | Quality Eng | Root cause analysis, 5-Why/Fishbone | --complaint-investigation (#2563eb) |
| Corrective Action | Day 10-30 | Cross-functional | Implement corrective action, update process | --complaint-action (#7c3aed) |
| Verification | Day 30-60 | Quality | Verify effectiveness, monitor recurrence | --complaint-verify (#0891b2) |
| Closure | Day 60+ | QA Manager | Close with customer, update metrics | --complaint-closed (#16a34a) |

### Format output
File `mom/docs/tmp/v4.4-p6-print.html` chua 3 section HTML blocks.

---

## PROMPT 7: Component Quality Gaps → `mom/docs/tmp/v4.4-p7-component.html`

### Muc tieu
Bo sung P1 component gaps: indeterminate checkbox, table aria-sort, virtual scroll, nested modal focus, tooltip hover pattern.

### Doc truoc khi lam
- File chinh: sections 4, 22, 23, 30, 31

### Noi dung

**Phan A: Patches cho Section 4 (Component States)**

1. Them row "Indeterminate" vao state matrix:
| State | Trigger | Visual | Interaction | ARIA | Token | Exit | Test |
|-------|---------|--------|-------------|------|-------|------|------|
| Indeterminate | Bulk select partial | Dash icon trong checkbox | Click → toggle all selected | aria-checked="mixed" | bg: var(--brand-2), opacity: 1 | Click → all selected hoac all deselected | Verify screen reader announces "partially checked" |

2. Button loading: Sua `aria-busy` tu conditional thanh MANDATORY

**Phan B: Patches cho Section 22 (Table)**

1. **aria-sort**: Them vao sort spec:
   - Column header PHAI co `aria-sort="ascending"`, `aria-sort="descending"`, hoac `aria-sort="none"`
   - Screen reader phai announce sort state khi thay doi

2. **Virtual scroll spec**:
   - Trigger: Tables > 500 rows PHAI dung virtual scroll
   - Implementation: Render viewport + 20 rows buffer tren/duoi
   - Row height: Fixed theo density mode (compact 32px, default 40px, comfortable 48px)
   - Scroll performance: 60fps target, `will-change: transform`
   - Keyboard: ArrowUp/Down van hoat dong, PageUp/PageDown nhay 20 rows
   - ARIA: `aria-rowcount` tren table, `aria-rowindex` tren moi row
   - Loading indicator: Skeleton rows khi scroll nhanh qua buffer

3. **Column resize keyboard alternative**:
   - Focus column header → `Ctrl+Left` giam 20px, `Ctrl+Right` tang 20px
   - Min width: 60px, max width: 600px
   - Live announce: `aria-live="polite"` thong bao width moi

**Phan C: Patches cho Section 23 (Modal)**

1. **Nested modal focus restoration**:
   - Level 1 modal mo → focus vao modal 1
   - Level 2 modal mo → focus vao modal 2, ghi nho focus position trong modal 1
   - Level 2 dong → restore focus ve vi tri trong modal 1
   - Level 1 dong → restore focus ve trigger element goc
   - Code sample cho focus stack: `const focusStack = []`

2. **Modal-within-drawer**: KHONG cho phep. Drawer la panel, khong phai modal container. Neu can modal tu drawer, dong drawer truoc

**Phan D: Patches cho Section 30 (Toast)**

1. **Warning toast duration fix**: Doi "6s (manual close)" thanh "8s auto-dismiss" (consistent voi error co "infinite/manual close")
2. **Toast trong focus trap**: Toast LUON accessible bat ke focus trap. Them `aria-live="polite"` tren toast container o ngoai focus trap scope. Toast button KHONG nhan focus khi trong modal (chi dismiss tu dong)

**Phan E: Cross-field validation**

Them vao Section 21 patch:
- Cross-field validation thuc hien on blur cua field thu 2 (vi du: end date validate khi blur, neu start date da co gia tri)
- Error hien thi tren FIELD thu 2 (field bi sai), khong phai field thu 1
- Vi du: "Ngay ket thuc phai sau ngay bat dau"

**Phan F: Density compact safeguard**

Them rule: "Icon-only buttons trong compact density mode PHAI co `min-width:24px; min-height:24px` de dam bao WCAG 2.5.8 Target Size"

### Format output
File `mom/docs/tmp/v4.4-p7-component.html` chua cac HTML patches voi comments chi ro section va vi tri chen.

---

## PROMPT 8: Responsive & CSS Architecture → `mom/docs/tmp/v4.4-p8-responsive.html`

### Muc tieu
Bo sung responsive gaps va CSS architecture improvements.

### Doc truoc khi lam
- File chinh: sections 28, 38, 5 (responsive, zone, density)

### Noi dung

**Phan A: 5-Point Breakpoint System Alignment**

Viet 1 spec table moi cho Section 28 patch:

| Breakpoint | Token | Width | Columns | Sidebar | Page Pad | Zone Behavior |
|------------|-------|-------|---------|---------|----------|---------------|
| sm | --bp-sm | <640px | 1 | Hidden (hamburger) | 16px | All zones stack vertically |
| md | --bp-md | 640-767px | 2 | Drawer (swipe) | 16px | KPI bar 2-col, sidebar drawer |
| lg | --bp-lg | 768-1023px | 2-3 | Collapsible | 24px | Sidebar collapsible, main full |
| xl | --bp-xl | 1024-1279px | 3-4 | Visible narrow (64px) | 24px | Full layout, sidebar narrow |
| 2xl | --bp-2xl | >=1280px | 4-5 | Visible full (280px) | 32px | Full layout, all zones |

**Phan B: Container Queries Foundation**

Them section moi "Container Queries (v4.4 Preview)":

```css
/* Zone containers */
.zone-main{container-type:inline-size;container-name:zone-main}
.zone-sidebar{container-type:inline-size;container-name:zone-sidebar}
.zone-kpi-bar{container-type:inline-size;container-name:zone-kpi}

/* Block responsive rules */
@container zone-main (max-width: 600px){
  .block-data-table{/* switch to card view */}
  .block-chart{/* reduce height, hide legend */}
}
@container zone-sidebar (max-width: 200px){
  .block-filter-panel{/* collapse to dropdown */}
}
```

**Phan C: Reflow 320px Test Gate**

Them vao Section 28 patch:
- Rule: "Tat ca module PHAI hien thi dung tai viewport 320px width (WCAG 1.4.10 Reflow)"
- Checklist: No horizontal scroll, no content clipped, no overlapping elements
- Test method: Chrome DevTools responsive mode, width=320px
- Exceptions: Data tables co the scroll ngang voi sticky first column

**Phan D: Print CSS Enhancement**

Them print tokens vao `@media print { :root { ... } }`:
```css
@media print{
  :root{
    --print-font-body:11pt;
    --print-font-header:14pt;
    --print-font-title:18pt;
    --print-margin:20mm;
    --print-header-height:25mm;
    --print-footer-height:15mm;
  }
}
```

### Format output
File `mom/docs/tmp/v4.4-p8-responsive.html` chua cac HTML + CSS patches.

---

## PROMPT 9: Final Assembly — Merge tat ca temp files vao file chinh

### Muc tieu
Merge noi dung tu 7 temp files (Prompt 2-8) vao file chinh `mom/docs/module-layout-template-design-system-v4.html`. Prompt 1 da sua truc tiep file chinh.

### Buoc thuc hien

**Buoc 1**: Doc file chinh TOAN BO de hieu cau truc hien tai.

**Buoc 2**: Doc TUNG file temp:
```
mom/docs/tmp/v4.4-p2-interaction.html
mom/docs/tmp/v4.4-p3-manufacturing.html
mom/docs/tmp/v4.4-p4-a11y.html
mom/docs/tmp/v4.4-p5-runtime.html
mom/docs/tmp/v4.4-p6-print.html
mom/docs/tmp/v4.4-p7-component.html
mom/docs/tmp/v4.4-p8-responsive.html
```

**Buoc 3**: Merge theo thu tu:

1. **CSS patches** (tu p4-a11y, p8-responsive): Chen vao `<style>` block
2. **Section patches** (tu p5-runtime, p7-component): Chen info-boxes/tables vao sections hien co (4, 21, 22, 23, 30, 35, 36, 38, 55)
3. **New sections** (tu p2, p3, p4, p6, p8): Them vao cuoi — truoc Section 57 (Muc luc) va Section 58 (Changelog)
4. **Renumber**: Cac section moi duoc danh so tiep tu 59 tro di
5. **TOC update**: Them link cho moi section moi vao `<nav class="toc">`
6. **Header meta update**: Cap nhat section count, block count, etc.
7. **Changelog update**: Ghi nhan v4.4 changes (da co tu Prompt 1)

**Buoc 4**: Dam bao KHONG xoa bat ky noi dung hien co nao. Chi THEM va SUA.

**Buoc 5**: Verify:
- Moi section moi co `<div class="section" id="...">` dung format
- Moi section-number la duy nhat va lien tuc
- Moi cross-reference `<a href="#id">` tro dung section
- Khong co HTML syntax errors

### Luu y quan trong
- NEU file temp khong ton tai (Codex chua chay prompt do), BO QUA file do
- NEU noi dung temp file mau thuan voi file chinh, UU TIEN file chinh
- Giu nguyen tat ca inline styles cua template catalog (sections 40-52)

---

## PROMPT 10: Validation & Self-Audit

### Muc tieu
Sau khi Prompt 9 hoan thanh, doc lai TOAN BO file chinh va tu danh gia.

### Buoc thuc hien

**Buoc 1**: Doc file chinh toan bo.

**Buoc 2**: Kiem tra checklist:

- [ ] Tat ca CSS tokens co trong :root (search cho `var(--` → verify token ton tai)
- [ ] Dark mode block co override cho MOI token moi
- [ ] Class-based dark mode `html[data-color-scheme-active="dark"]` ton tai
- [ ] `--text-1`, `--text-2`, `--text-3` KHONG con xuat hien (da doi thanh --text-primary/secondary/tertiary)
- [ ] `--text-overline` = 11px (khong phai 10px)
- [ ] Breakpoint CSS values khop voi doc (640/768/1024/1280)
- [ ] Skip link CSS class `.skip-link` ton tai
- [ ] Moi section moi co cross-reference dung
- [ ] TOC co link cho moi section
- [ ] Version header la v4.4
- [ ] Changelog co entry v4.4
- [ ] Khong co `--text-1`, `--text-2`, `--text-3` con sot
- [ ] aria-sort duoc mention trong table rules
- [ ] Virtual scroll duoc mention cho large tables
- [ ] Work Order lifecycle state machine ton tai
- [ ] Tool management section ton tai
- [ ] Document control lifecycle ton tai
- [ ] FAI/AS9102 section ton tai
- [ ] CoC/CoA/MTR print templates ton tai
- [ ] NCR disposition workflow ton tai
- [ ] Inline Edit pattern ton tai (Section 31 Pattern 12)
- [ ] Command Palette pattern ton tai (Section 31 Pattern 13)
- [ ] WCAG 2.2 checklist table ton tai
- [ ] Implementation Status table trong Section 35
- [ ] Container queries preview section ton tai

**Buoc 3**: Neu tim thay loi, SUA NGAY trong file chinh.

**Buoc 4**: Ghi ket qua vao cuoi Changelog:
```
v4.4 validated: [so] sections, [so] CSS tokens, [so] dong. All P0 gaps from v4.3 audit addressed.
```

---

## TOM TAT EXECUTION ORDER

```
Prompt 1 (CSS Foundation) ← CHAY TRUOC, sua truc tiep file chinh
    ↓
Prompt 2 (Interaction)  ─┐
Prompt 3 (Manufacturing) │
Prompt 4 (A11y)          ├── CHAY SONG SONG, moi cai viet file temp rieng
Prompt 5 (Runtime)       │
Prompt 6 (Print/Comply)  │
                         ┘
    ↓
Prompt 7 (Component)  ─┐
Prompt 8 (Responsive)  ├── CHAY SONG SONG
                       ┘
    ↓
Prompt 9 (Merge) ← CHAY SAU KHI 2-8 XONG, merge tat ca vao file chinh
    ↓
Prompt 10 (Validate) ← CHAY CUOI CUNG, self-audit
```

### Dependencies
- Prompt 1 PHAI xong truoc tat ca (vi no sua CSS tokens ma cac prompt khac reference)
- Prompt 2-6 doc file chinh nhung KHONG sua — chi viet temp files → co the chay song song
- Prompt 7-8 cung tuong tu, nhung co the can doc ket qua tu Prompt 2-6 nen de sau cho an toan
- Prompt 9 PHAI doi tat ca temp files ton tai
- Prompt 10 PHAI chay cuoi cung

### Ket qua mong doi
- Tu 64.4/100 → muc tieu 90+/100
- Token count: 120+ → 250+
- Sections: 58 → 66+
- Lines: 7229 → 8500+
- P0 gaps: 33 → 0
- P1 gaps: 64 → <15

# HESEM MOM — Bộ Prompt Codex: Nâng cấp Design System v4.2 → v4.3

> **Ngày tạo**: 2026-04-11
> **Tổng cộng**: 8 prompts nâng cấp chuyên sâu
> **Execution order**: Prompt 1 trước → Prompt 2+3+4+5 song song → Prompt 6+7 song song → Prompt 8 cuối cùng
> **Phương pháp**: Mỗi prompt PHẢI gọi agent đánh giá trước khi nâng cấp, và làm TỐT HƠN yêu cầu rất nhiều

---

## BỐI CẢNH TỔNG THỂ — ĐỌC KỸ TRƯỚC KHI LÀM BẤT KỲ PROMPT NÀO

### Dự án
HESEM MOM là phần mềm quản lý sản xuất cấp doanh nghiệp (ERP/MOM/MES/eQMS) cho ngành CNC precision machining (semiconductor, aerospace, medical devices). Frontend: vanilla JS + HTML + CSS. Backend: PHP. Không dùng React/Vue.

### File chính cần chỉnh sửa
```
mom/docs/module-layout-template-design-system-v4.html
```
- Hiện tại: 4383 dòng, 51 sections, version v4.2
- Mục tiêu: Nâng lên v4.3, ~6000+ dòng, ~60 sections

### Cấu trúc file hiện tại (51 sections)
| # | ID | Tiêu đề | Dòng |
|---|-----|---------|------|
| 1 | summary | Tóm Tắt Thực Thi | 275 |
| 2 | architecture | Kiến trúc hệ thống | 289 |
| 3 | standards | Quy chuẩn đồ họa | 329 |
| 4 | component-states | Ma trận trạng thái thành phần | 473 |
| 5 | density-modes | Chế độ mật độ dữ liệu | 550 |
| 6 | dark-mode-mapping | Dark mode token mapping | 586 |
| 7 | accessibility | Accessibility và ARIA patterns | 643 |
| 8 | error-patterns | Mẫu trạng thái lỗi | 756 |
| 9 | loading-patterns | Mẫu tải dữ liệu | 892 |
| 10 | empty-states | Trạng thái trống | 968 |
| 11 | notification-patterns | Mẫu thông báo và toast | 1007 |
| 12 | data-viz | Hướng dẫn trực quan hóa dữ liệu | 1084 |
| 13 | content-guidelines | Hướng dẫn nội dung | 1138 |
| 14 | shop-floor-mode | Chế độ xưởng sản xuất | 1180 |
| 15 | compliance-forms | Mẫu biểu mẫu tuân thủ 21 CFR Part 11 | 1355 |
| 16 | shift-themes | Chuyển đổi giao diện theo ca | 1477 |
| 17 | print-layouts | Bố cục tối ưu cho in ấn | 1564 |
| 18 | operator-interface | Giao diện vận hành máy | 1649 |
| 19 | realtime-dashboard | Mẫu dashboard thời gian thực | 1757 |
| 20 | token-reference | Hệ thống Design Token chính xác | 1860 |
| 21 | form-rules | Quy chuẩn Form Layout | 2038 |
| 22 | table-rules | Quy chuẩn Table tương tác | 2075 |
| 23 | modal-rules | Quy chuẩn Modal & Dialog | 2110 |
| 24 | nav-rules | Navigation thích ứng | 2160 |
| 25 | dataviz-rules | Quy chuẩn Data Visualization chính xác | 2220 |
| 26 | keyboard-rules | Ma trận phím tắt | 2276 |
| 27 | icon-rules | Hệ thống Icon | 2326 |
| 28 | responsive-rules | Quy chuẩn Responsive Layout | 2352 |
| 29 | block-schema | Block JSON Schema — 10 blocks quan trọng nhất | 2401 |
| 30 | toast-precise | Quy chuẩn Toast & Notification chính xác | 2621 |
| 31 | visual-themes | 20 Visual Theme Presets | 2652 |
| 32 | block-engine | Block Engine | 2779 |
| 33 | zone-system | Zone System | 3007 |
| 34 | scroll-ux | Smart Scroll UX | 3061 |
| 35-47 | cat-* | 13 nhóm template catalog (123 templates) | 3130-4151 |
| 48 | component-presets | Component Preset Library | 4152 |
| 49 | module-editor | Module Editor Tools | 4189 |
| 50 | token-cascade | Token Cascade | 4266 |
| 51 | governance | Governance & Roadmap | 4327 |

### CSS :root hiện tại (dòng 8-29) — CHỈ CÓ 21 biến
```css
:root{
  --brand:#0c2d48; --brand-2:#1565c0; --accent:#f9a825;
  --purple:#7c3aed; --cyan:#0891b2; --teal:#0d9488;
  --pink:#db2777; --green:#16a34a; --red:#dc2626; --amber:#d97706;
  --bg-page:#f3f7fb; --bg-surface:#ffffff; --bg-surface-alt:#f7fbff;
  --text-primary:#1e293b; --text-secondary:#64748b; --text-tertiary:#94a3b8;
  --border:#dbe4ef;
  --shadow-sm:0 4px 14px rgba(12,45,72,.06);
  --shadow-lg:0 18px 40px rgba(15,23,42,.14),0 8px 20px rgba(15,23,42,.09);
  --mono:'JetBrains Mono','Fira Code',monospace;
}
```

### Kết quả kiểm định 5 chuyên gia (điểm trung bình 60.2/100)
5 chuyên gia đầu ngành đã đánh giá v4.2 và tìm ra **39 lỗi P0** (chặn developer), **35+ lỗi P1** (gây không nhất quán). Chi tiết từng P0 được liệt kê trong từng prompt bên dưới.

---

## QUY TẮC BẮT BUỘC CHO TẤT CẢ PROMPTS

```
QUY TẮC BẮT BUỘC:
1. Tiếng Việt frontend PHẢI CÓ DẤU đầy đủ (ví dụ: "Bảng điều khiển", KHÔNG PHẢI "Bang dieu khien")
2. Backend (biến, key, comment code) dùng tiếng Anh
3. Hỗ trợ đa ngôn ngữ: mọi label hiển thị phải có cả { vi: "...", en: "..." }
4. Dữ liệu mẫu phải thực tế, chuyên nghiệp — dùng part numbers thật (AERO-BRK-2024, MAT-AL6061-T6),
   tên máy thật (Haas VF-2SS, DMG MORI NLX 2500, Mazak INTEGREX i-500),
   tên người Việt có dấu (Nguyễn Văn Thành, Trần Thị Mai),
   số liệu thực tế (OEE 93.4%, Cpk 1.67, MTBF 485h)
5. SVG wireframe phải chi tiết, đẹp, chuyên nghiệp — không được sơ sài
6. CSS phải đẹp: gradient, shadow, hover effects, transitions, border-radius mềm mại
7. Không viết code sơ sài, phải hoàn chỉnh production-ready
8. Mỗi section PHẢI dùng đúng shell: .section / .section-title / .section-number / .section-subtitle
9. Spec phải CHÍNH XÁC đến từng pixel, hex color, millisecond — developer đọc xong KHÔNG PHẢI ĐOÁN
10. Khi thêm token/spec, phải cross-reference với sections đã có để KHÔNG MÂU THUẪN
```

### QUY TẮC AGENT — BẮT BUỘC MỖI PROMPT
```
TRƯỚC KHI VIẾT CODE:
1. Gọi agent đọc TOÀN BỘ file HTML hiện tại
2. Agent phải tìm MỌI chỗ liên quan đến nội dung sắp sửa
3. Agent phải kiểm tra KHÔNG có mâu thuẫn với nội dung hiện có
4. Agent phải đề xuất cải tiến VƯỢT xa yêu cầu

SAU KHI VIẾT CODE:
5. Gọi agent đọc lại file đã sửa
6. Agent phải verify: HTML valid, section number đúng, không trùng ID, không mâu thuẫn
7. Agent phải đánh giá chất lượng: "Developer đọc section này có phải đoán gì không?"
8. Nếu agent phát hiện vấn đề → SỬA NGAY, không chờ prompt sau
```

---

## PROMPT 1/8: CSS Token Foundation — Mở rộng :root từ 21 → 120+ biến

### Mục tiêu
Mở rộng block `:root` CSS (dòng 8-29) và block `@media(prefers-color-scheme:dark)` (dòng 180-196) trong file `mom/docs/module-layout-template-design-system-v4.html` để chứa TẤT CẢ design tokens được mô tả trong section 20 (token-reference) nhưng hiện chưa có trong CSS. Đồng thời sửa 3 lỗi P0 trong CSS.

### Context
File HTML này là tài liệu thiết kế — NHƯNG CSS trong file được dùng để render chính tài liệu đó. Hiện :root chỉ có 21 biến nhưng section 20 mô tả ~100+ tokens. Developer đọc section 20 thấy `--space-4: 16px` nhưng tìm trong CSS không có → mất tin tưởng vào tài liệu. CSS phải chứa đầy đủ tokens mà tài liệu claim.

### Phải đọc trước khi làm
- Dòng 8-29: `:root` block hiện tại (21 biến)
- Dòng 180-196: dark mode `@media` block
- Dòng 161: focus-visible CSS rule hiện tại
- Section 20 (dòng 1860-2037): token-reference — tất cả tokens được mô tả
- Section 3 (dòng 329-472): quy chuẩn đồ họa — spacing, typography, shadow, radius values
- Section 6 (dòng 586-642): dark-mode-mapping — xem naming convention

### Yêu cầu chi tiết

#### 1. Mở rộng :root (thêm ~100 biến mới)

**Spacing tokens** (13 giá trị — section 20 mô tả nhưng không có trong CSS):
```css
--space-0:0; --space-1:4px; --space-2:8px; --space-3:12px;
--space-4:16px; --space-5:20px; --space-6:24px; --space-7:32px;
--space-8:40px; --space-9:48px; --space-10:56px; --space-11:64px; --space-12:80px;
```

**Border radius tokens** (7 giá trị):
```css
--radius-xs:2px; --radius-sm:4px; --radius-md:6px; --radius-lg:8px;
--radius-xl:12px; --radius-2xl:16px; --radius-full:9999px;
```

**Shadow tokens** (5 cấp — hiện chỉ có sm và lg):
```css
--shadow-xs:0 1px 3px rgba(12,45,72,.04);
/* --shadow-sm đã có */
--shadow-md:0 8px 24px rgba(12,45,72,.08),0 2px 8px rgba(12,45,72,.04);
/* --shadow-lg đã có */
--shadow-xl:0 24px 60px rgba(12,45,72,.16),0 12px 28px rgba(12,45,72,.08);
```

**Z-index tokens** (8 cấp — section 20 mô tả):
```css
--z-base:0; --z-dropdown:100; --z-sticky:200; --z-fixed:300;
--z-drawer:400; --z-modal:500; --z-popover:600; --z-toast:700; --z-loading:800; --z-tooltip:3000;
```

**Motion tokens** (5 durations + 5 easings — section 20 mô tả):
```css
--duration-instant:75ms; --duration-fast:150ms; --duration-normal:200ms;
--duration-slow:300ms; --duration-slower:500ms;
--ease-linear:linear; --ease-in:cubic-bezier(0.4,0,1,1);
--ease-out:cubic-bezier(0,0,0.2,1); --ease-in-out:cubic-bezier(0.4,0,0.2,1);
--ease-spring:cubic-bezier(0.34,1.56,0.64,1);
```

**Semantic color tokens** (section 20 mô tả success/warning/error/info với 50-700 shades):
```css
--color-success-50:#f0fdf4; --color-success-100:#dcfce7; --color-success-600:#16a34a; --color-success-700:#15803d;
--color-warning-50:#fffbeb; --color-warning-100:#fef3c7; --color-warning-600:#d97706; --color-warning-700:#b45309;
--color-error-50:#fef2f2; --color-error-100:#fee2e2; --color-error-600:#dc2626; --color-error-700:#b91c1c;
--color-info-50:#eff6ff; --color-info-100:#dbeafe; --color-info-600:#2563eb; --color-info-700:#1d4ed8;
--color-accent-50:#fffbeb; --color-accent-100:#fef3c7; --color-accent-600:#d97706; --color-accent-700:#b45309;
--color-teal-50:#f0fdfa; --color-teal-100:#ccfbf1; --color-teal-600:#0d9488; --color-teal-700:#0f766e;
```

**Typography tokens** (9 roles — section 20 mô tả):
```css
--text-display:32px; --text-display-weight:800; --text-display-leading:1.2; --text-display-tracking:-0.02em;
--text-headline:24px; --text-headline-weight:700; --text-headline-leading:1.25;
--text-title:18px; --text-title-weight:700; --text-title-leading:1.3;
--text-subtitle:16px; --text-subtitle-weight:600; --text-subtitle-leading:1.4;
--text-body:14px; --text-body-weight:400; --text-body-leading:1.6;
--text-body-sm:13px; --text-body-sm-weight:400; --text-body-sm-leading:1.5;
--text-caption:11px; --text-caption-weight:500; --text-caption-leading:1.4; --text-caption-tracking:0.02em;
--text-overline:10px; --text-overline-weight:800; --text-overline-leading:1.2; --text-overline-tracking:0.06em;
--text-code:13px; --text-code-weight:500; --text-code-leading:1.6;
```

**Surface & elevation tokens**:
```css
--bg-elevated:#ffffff; --bg-overlay:rgba(15,23,42,0.5); --bg-input:#ffffff;
--bg-disabled:rgba(148,163,184,0.1);
```

**State layer opacity tokens** (thống nhất — hiện mâu thuẫn 0.35/0.4/0.5):
```css
--opacity-hover:0.06; --opacity-pressed:0.10; --opacity-selected:0.08;
--opacity-disabled:0.4; --opacity-dragged:0.12;
```

**Focus ring token** (hiện mâu thuẫn giữa section 3 và section 26):
```css
--focus-ring:2px solid var(--brand-2); --focus-offset:2px;
```

#### 2. Sửa dark mode @media block (dòng 180-196)

Thêm dark mode values cho TOÀN BỘ tokens mới. Hiện dark mode chỉ override 11 biến. Phải thêm:
```css
@media(prefers-color-scheme:dark){
:root{
  /* --- Existing overrides (keep as-is) --- */
  --bg-page:#0f172a; --bg-surface:#1e293b; --bg-surface-alt:#162032;
  --text-primary:#f1f5f9; --text-secondary:#94a3b8; --text-tertiary:#64748b;
  --border:#334155;
  --shadow-sm:0 4px 14px rgba(0,0,0,.3);
  --shadow-lg:0 18px 40px rgba(0,0,0,.5);
  --brand:#93c5fd; --brand-2:#60a5fa;
  /* --- NEW: missing shadow tokens --- */
  --shadow-xs:0 1px 3px rgba(0,0,0,.2);
  --shadow-md:0 8px 24px rgba(0,0,0,.35);
  --shadow-xl:0 24px 60px rgba(0,0,0,.5);
  /* --- NEW: surface tokens --- */
  --bg-elevated:#334155; --bg-overlay:rgba(0,0,0,0.7); --bg-input:#1e293b;
  --bg-disabled:rgba(148,163,184,0.15);
  /* --- NEW: semantic colors dark mode (brightness +1 step) --- */
  --color-success-50:#052e16; --color-success-100:#14532d; --color-success-600:#4ade80; --color-success-700:#86efac;
  --color-warning-50:#451a03; --color-warning-100:#78350f; --color-warning-600:#fbbf24; --color-warning-700:#fcd34d;
  --color-error-50:#450a0a; --color-error-100:#7f1d1d; --color-error-600:#f87171; --color-error-700:#fca5a5;
  --color-info-50:#1e1b4b; --color-info-100:#1e3a5f; --color-info-600:#60a5fa; --color-info-700:#93c5fd;
}
}
```

#### 3. Sửa 3 lỗi CSS P0

**Lỗi 1**: Focus ring contrast quá thấp (dòng 161)
```
HIỆN TẠI: outline:3px solid rgba(21,101,192,.4);outline-offset:2px
SỬA THÀNH: outline:2px solid var(--brand-2);outline-offset:2px
```
Lý do: `rgba(21,101,192,.4)` ratio ~2.1:1 trên nền trắng → FAIL WCAG 3:1. Dùng `var(--brand-2)` (#1565c0) → ratio 4.6:1 → PASS.

**Lỗi 2**: Thiếu `prefers-reduced-motion` (hiện CSS không có dù section 20 mô tả)
```css
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}
}
```
Chèn SAU block dark mode, TRƯỚC print styles (trước dòng 197).

**Lỗi 3**: CSS hardcoded values → phải dùng tokens
Tìm và thay thế trong CSS hiện tại:
- `border-radius:28px` → `border-radius:var(--radius-2xl)` (ít nhất cho `.section`)
- `border-radius:18px` → `border-radius:var(--radius-2xl)`
- `border-radius:20px` → `border-radius:var(--radius-2xl)`
- KHÔNG cần thay hết (file là tài liệu, không phải ứng dụng), nhưng thay ở `.section`, `.card`, `.stat-card`, `.tpl-card` để MINH HỌA cách dùng tokens

#### 4. Thêm comment CSS grouping
```css
/* ═══ PRIMITIVE TOKENS ═══ */
/* ═══ SEMANTIC COLOR TOKENS ═══ */
/* ═══ TYPOGRAPHY TOKENS ═══ */
/* ═══ SPACING TOKENS ═══ */
/* ═══ ELEVATION TOKENS ═══ */
/* ═══ MOTION TOKENS ═══ */
/* ═══ STATE TOKENS ═══ */
```

### Vượt yêu cầu — những thứ CODEX NÊN TỰ THÊM
- CSS naming convention comment block: giải thích `--{category}-{name}-{variant}` convention
- Container query comment: `/* @container queries: planned for v4.4 — zone-based component responsiveness */`
- Thêm `--font-family-sans` và `--font-family-mono` tokens (hiện font stack hardcoded)
- Đảm bảo TỔNG SỐ CSS vars trong :root ≥ 120

### Acceptance criteria đo được
```
- :root block có ≥ 120 CSS custom properties (đếm bằng regex `--[\w-]+:`)
- Dark mode @media block override ≥ 30 variables
- Có @media(prefers-reduced-motion:reduce) block
- Focus ring dùng var(--brand-2), KHÔNG dùng rgba trực tiếp
- Có comment grouping cho ≥ 6 token categories
- Spacing tokens --space-0 đến --space-12 đều có mặt
- Shadow tokens --shadow-xs đến --shadow-xl đều có mặt (5 cấp)
- Z-index tokens --z-base đến --z-tooltip đều có mặt (≥ 8 cấp)
- Motion tokens --duration-* (5) và --ease-* (5) đều có mặt
- Typography tokens cho ≥ 8 roles đều có mặt
- Semantic color tokens success/warning/error/info với 50/100/600/700 shades
- File vẫn render đúng trong browser (không bị vỡ layout)
- HTML valid
```

---

## PROMPT 2/8: Component Interaction Specs — 8 mẫu tương tác mới

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
KHÔNG sửa file chính module-layout-template-design-system-v4.html
THAY VÀO ĐÓ: Ghi nội dung HTML thuần của section mới ra file:
  mom/docs/tmp/v4.3-p2-interaction.html

File này chứa DUY NHẤT HTML của section (từ <section...> đến </section>)
KHÔNG có <html>, <head>, <body> wrapper
KHÔNG có CSS styles
KHÔNG có TOC hoặc header
Chỉ là đoạn HTML của 1 section để Prompt 8 chèn vào đúng vị trí

Tạo thư mục mom/docs/tmp/ nếu chưa có.
```

### Mục tiêu
Tạo file `mom/docs/tmp/v4.3-p2-interaction.html` chứa HTML của section `interaction-patterns` — 8 mẫu tương tác chính xác mà developer PHẢI TUÂN THỦ. Đây là lỗ hổng lớn nhất từ Expert 2 (71/100).

### Phải đọc trước khi làm
- File chính (để hiểu format section, CSS classes đang dùng):
  `mom/docs/module-layout-template-design-system-v4.html` dòng 1-204 (CSS) và dòng 263-290 (section 1 — xem shell format)
- Section 4 (component-states, dòng 473): xem state matrix format hiện có
- Section 21 (form-rules, dòng 2038): xem form specs hiện có
- Section 22 (table-rules, dòng 2075): xem table specs hiện có
- Section 23 (modal-rules, dòng 2110): xem modal specs hiện có
- Section 29 (block-schema, dòng 2401): xem JSON schema format

### Section mới: `interaction-patterns`
```
Section ID: interaction-patterns
Section number: để trống (Prompt 8 sẽ điền số đúng khi renumber)
Title: Quy chuẩn Tương tác Chuyên sâu
Vị trí chèn (do Prompt 8 xử lý): SAU section id="toast-precise", TRƯỚC section id="visual-themes"
```

#### Pattern 1: Drag & Drop — CHƯA CÓ GÌ, phải viết từ đầu
```
DRAG & DROP SPEC — Bắt buộc cho: Kanban, Gantt, Template Studio, Block Editor

1. KHỞI ĐẦU
- Mouse: mousedown + di chuyển 5px trước khi kích hoạt drag (tránh click nhầm)
- Touch: long-press 250ms + haptic (nếu hỗ trợ) trước khi kích hoạt
- Keyboard: chọn item → Space để "nhấc" → Arrow keys di chuyển → Space để "thả" → Escape hủy
- Screen reader: "[Tên item] đã nhấc. Dùng phím mũi tên để di chuyển."

2. PREVIEW (GHOST)
- Ghost: clone semi-transparent (opacity 0.7) offset 8px từ cursor
- Item gốc: opacity 0.3, dashed border var(--border)
- Cursor: grabbing
- Body: overflow hidden tránh scroll xung đột

3. DROP ZONES
- Zone hợp lệ: border 2px dashed var(--brand-2), bg rgba(21,101,192,.04) khi hover
- Zone không hợp lệ: border 2px dashed var(--red), cursor not-allowed
- Chỉ báo chèn: 2px solid var(--brand-2) ngang tại vị trí drop giữa các items

4. ANIMATION (FLIP)
- Items bị đẩy animate sang vị trí mới: duration var(--duration-normal), ease var(--ease-in-out)
- Item được thả snap vào vị trí cuối: duration var(--duration-fast), ease var(--ease-spring)

5. MULTI-ITEM DRAG
- Chọn nhiều items (checkbox hoặc Ctrl+click) → drag selection
- Ghost hiển thị badge "+N" trên ghost
- Tất cả selected items animate đồng thời đến đích

6. QUY TẮC CROSS-ZONE
- Kanban: drag giữa columns phải respect WIP limits; nếu target column đạt limit →
  drop zone hiển thị warning state (amber dashed border) và confirm dialog khi drop
- Gantt: drag ngang reschedule; snap to time grid (hour/day); drag dọc đổi resource
- Template editor: blocks chỉ drop vào zones có type trong allowedBlocks whitelist

7. ACCESSIBILITY
- ARIA live region: "Đã di chuyển [item] từ [nguồn] đến [đích], vị trí [n] trong [total]"
- Keyboard flow thay thế hoàn toàn mouse drag cho mọi thao tác
- Reduced motion: tắt FLIP animation, items teleport trực tiếp
```

Bảng spec-table hiển thị 7 quy tắc, mỗi quy tắc 1 hàng với cột: Quy tắc | Giá trị | Token/CSS | Ví dụ MOM

#### Pattern 2: Dropdown/Select State Matrix — Thiếu trong section 4
```
SELECT / DROPDOWN STATE MATRIX
- default: border var(--border), bg var(--bg-input), placeholder var(--text-tertiary)
- focus: focus ring var(--focus-ring), dropdown mở xuống (flip lên nếu không đủ chỗ phía dưới)
- open: dropdown panel max-height 240px, overflow-y auto, shadow var(--shadow-md), z-index var(--z-dropdown)
- option-hover: bg rgba(21,101,192,.06)
- option-selected: bg rgba(21,101,192,.10), check icon trailing, font-weight 600
- multi-select: items đã chọn render dạng removable chips trong input area; tối đa 3 hiển thị, sau đó "+N thêm"
- loading-options: spinner 14px centered trong dropdown panel, text "Đang tải..."
- empty-options: text "Không tìm thấy" centered trong dropdown panel
- disabled: opacity var(--opacity-disabled), cursor not-allowed, dropdown không mở
- error: border var(--red), helper text bên dưới, aria-invalid="true"
- type-ahead: filter options khi gõ, debounce 150ms, highlight matching text
- keyboard: ArrowDown/Up navigate options, Enter chọn, Escape đóng, Home/End nhảy
- clear button: x icon 14px ở mép phải khi có giá trị và field là clearable
- create-new: "Tạo mới [giá trị đã gõ]" option cuối danh sách khi createable:true
```

#### Pattern 3: Tooltip Component Spec — CHƯA CÓ
```
TOOLTIP SPEC
- trigger: hover (200ms delay) hoặc focus (ngay lập tức) trên target
- position: auto (ưu tiên top, flip sang bottom/left/right nếu bị cắt bởi viewport)
- arrow: tam giác đều 6px, fill trùng bg tooltip, centered trên cạnh target
- max-width: 280px, word-wrap, padding 8px 12px
- bg: var(--bg-elevated) (light: #fafbfc, dark: #334155), border 1px var(--border), shadow var(--shadow-md)
- font: var(--text-caption), color var(--text-primary), line-height 1.5
- radius: var(--radius-sm)
- z-index: var(--z-tooltip)
- dismiss: mouse-leave (100ms grace), scroll, Escape
- interactive: nếu tooltip chứa links/buttons → giữ mở khi cursor ở trong, grace 300ms khi rời
- truncation tooltip: chỉ xuất hiện khi text-overflow:ellipsis active; nội dung = full text
- keyboard: hiển thị khi :focus-visible trên target, dismiss khi Escape hoặc blur
- mobile: long-press hiển thị, tap elsewhere dismiss; KHÔNG BAO GIỜ chỉ hover
```

#### Pattern 4: Auto-save & Dirty State — CHƯA CÓ
```
AUTO-SAVE PATTERN
- trigger: debounce 2000ms sau keystroke cuối trong bất kỳ field nào, hoặc on blur
- indicator vị trí: top-right của form header area
  - saving: spinner 14px + "Đang lưu..." in var(--text-tertiary), role="status"
  - saved: check icon var(--green) + "Đã lưu lúc HH:mm" in var(--text-tertiary), fade invisible sau 5s
  - error: warning icon var(--amber) + "Lưu thất bại. Đang thử lại..." + nút retry thủ công
  - offline: cloud-off icon var(--text-tertiary) + "Thay đổi được xếp hàng chờ mạng"
- conflict: server trả 409 → inline alert:
  "Bản ghi này đã được chỉnh sửa bởi [user] lúc [time]. Tải lại? Thay đổi của bạn sẽ hiển thị dạng diff."
- dirty tracking: so sánh giá trị hiện tại vs snapshot lưu gần nhất; highlight field đã thay đổi
  bằng left-border 2px solid var(--amber) trên field wrapper

UNSAVED CHANGES GUARD
- phát hiện: deep compare giá trị hiện tại vs giá trị ban đầu khi mount form
- chỉ báo: dot 8px var(--amber) trên tab title hoặc page title khi dirty
- chặn navigation: trước khi route change hoặc browser back, hiển thị confirm dialog (size sm):
  title: "Chưa lưu thay đổi"
  body: "Bạn có thay đổi chưa lưu. Hủy bỏ hay tiếp tục chỉnh sửa?"
  buttons: [Secondary: "Hủy thay đổi", Primary: "Tiếp tục chỉnh sửa"]
- browser beforeunload: set window.onbeforeunload khi dirty, clear khi save/cancel
- modal dismiss: nếu form trong modal và dirty → Escape hoặc backdrop click trigger confirm dialog
  thay vì đóng; persistent:true border flash var(--red) 200ms
```

#### Pattern 5: Optimistic Updates — CHƯA CÓ
```
OPTIMISTIC UPDATE PATTERN
- on user action (vd: click Approve): lập tức cập nhật UI sang trạng thái mới (vd: status badge
  đổi sang "Đã phê duyệt"), disable action button, hiển thị spinner 12px cạnh status
- on server success (< 3s): remove spinner, flash green border 500ms trên element bị ảnh hưởng,
  toast success 3s
- on server failure: ROLLBACK UI về trạng thái trước với animation var(--duration-normal),
  hiển thị error toast với retry action: "Phê duyệt thất bại. Lỗi mạng. [Thử lại]"
- on server conflict (409): inline alert trong record:
  "Bản ghi này đã được chỉnh sửa bởi [user] lúc [time]. Tải lại để xem phiên bản mới nhất."
- phạm vi: CHỈ áp dụng cho thay đổi trạng thái đơn lẻ (status transitions, field edits).
  KHÔNG áP DỤNG cho batch operations hoặc delete operations.
```

#### Pattern 6: Concurrent Editing Conflict Resolution — CHƯA CÓ
```
CONCURRENT EDITING CONFLICT RESOLUTION
- chỉ báo hiện diện: khi user khác mở cùng record để edit → avatar badge + tên trong record header:
  "[Avatar] Nguyễn V.T cũng đang chỉnh sửa"
- soft lock: KHÔNG hard-lock record. Cho phép parallel editing với conflict detection khi save.
- on save conflict (server trả 409):
  1. Modal (size lg) split-pane diff:
     Trái: "Thay đổi của bạn" — highlight changed fields bằng nền vàng
     Phải: "Phiên bản server (lưu bởi [user] lúc [time])" — highlight bằng nền xanh
  2. Fields xung đột (cả hai cùng đổi) highlight nền đỏ ở cả hai bên
  3. Actions: [Ghi đè bằng thay đổi của tôi] [Tải phiên bản server] [Gộp từng field]
  4. Merge mode: mỗi field xung đột → user chọn "của tôi" hoặc "của họ" bằng radio toggle
- field-level lock (tùy chọn cho regulated records): khi user focus vào field → hiển thị
  lock icon nhỏ cho users khác trên field đó. Unlock khi blur sau 30s.
```

#### Pattern 7: Deep-linking & URL Structure — CHƯA CÓ
```
URL STRUCTURE & DEEP LINKING
- pattern: /{module}/{view}/{recordId}?tab={tabKey}&filter={encoded}&page={n}&sort={col:dir}
- examples:
  /sales/orders/SO-2026-001?tab=quality
  /quality/ncr?filter=status:open&sort=createdAt:desc&page=2
- URL updates: khi tab switch, filter change, sort change, page change (replaceState, KHÔNG pushState)
- shareable: copy URL và paste vào session mới PHẢI khôi phục chính xác trạng thái view
- back button: mỗi pushState entry đại diện navigation có ý nghĩa (module switch, record open);
  filter/sort/page changes dùng replaceState (back KHÔNG undo từng filter tweak)
- 404/invalid: nếu recordId không tìm thấy → empty state "Không tìm thấy bản ghi" với link về list view
- tab persistence: active tab lưu trong URL query và localStorage làm fallback
```

#### Pattern 8: Comment/Discussion Thread — CHƯA CÓ (cần cho NCR/CAPA)
```
COMMENT / DISCUSSION THREAD SPEC
- comment card: avatar (32px circle), tên + role, timestamp relative, body text, edit/delete menu
- reply threading: nested 1 level (không nested sâu hơn), indent 32px trái
- @mention: gõ @ trigger autocomplete danh sách user, debounce 200ms, highlight mentions bằng
  bg rgba(21,101,192,.08) text var(--brand-2) font-weight 500
- attachment: icon + filename + size, preview cho images, download cho documents
- resolved/unresolved: toggle trên mỗi thread, resolved = opacity 0.6 + strikethrough
- rich text: bold, italic, code inline, code block, links — KHÔNG full WYSIWYG editor
- accessibility: role="article" cho mỗi comment, aria-label="Comment by [name] at [time]"
- empty state: "Chưa có thảo luận. Bắt đầu bằng cách viết bình luận đầu tiên."
```

### Vượt yêu cầu — CODEX NÊN TỰ THÊM
- Thêm Pattern 9: Search Results UX (global search Ctrl+K)
- Thêm Pattern 10: Wizard/Stepper Behavioral Rules
- Thêm Pattern 11: File Upload Drag-Drop Zone
- Cross-reference từng pattern sang các sections hiện có (vd: "Xem thêm Section 23 Modal Rules")
- Mỗi pattern có ít nhất 1 "Do / Don't" example

### Acceptance criteria
```
OUTPUT FILE: mom/docs/tmp/v4.3-p2-interaction.html
- File tồn tại và chứa HTML hợp lệ
- Bắt đầu bằng <section class="section" id="interaction-patterns">
- Kết thúc bằng </section>
- Có ≥ 8 pattern specs, mỗi pattern có ≥ 5 quy tắc chính xác
- Drag & Drop spec có ≥ 7 sub-sections (initiation, preview, drop zones, animation, multi-item, cross-zone, a11y)
- URL Structure có ≥ 3 ví dụ URL thực tế
- Concurrent Editing có split-pane diff modal spec
- Mỗi pattern dùng CSS token names (var(--...)), KHÔNG hardcode hex/px
- Tiếng Việt CÓ DẤU đầy đủ
- KHÔNG chứa <html>, <head>, <body>, <style> tags
- section-number để trống hoặc để "??" (Prompt 8 sẽ điền)
```

---

## PROMPT 3/8: Manufacturing Domain Precision — 7 spec quan trọng cho MES/eQMS

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
KHÔNG sửa file chính module-layout-template-design-system-v4.html
THAY VÀO ĐÓ: Ghi ra file:
  mom/docs/tmp/v4.3-p3-manufacturing.html

Chứa DUY NHẤT HTML của section (từ <section...> đến </section>)
KHÔNG có wrapper HTML, CSS, TOC, header
Tạo thư mục mom/docs/tmp/ nếu chưa có.
```

### Mục tiêu
Tạo file `mom/docs/tmp/v4.3-p3-manufacturing.html` chứa HTML của section `manufacturing-precision` — 7 quy chuẩn chính xác cho MES/eQMS. Đây là lỗ hổng từ Expert 3 (64/100).

### Phải đọc trước khi làm
- Section 14 (shop-floor-mode): xem touch targets hiện có
- Section 15 (compliance-forms): xem 21 CFR Part 11 hiện có
- Section 18 (operator-interface): xem machine states hiện có
- Section 19 (realtime-dashboard): xem sensor/IoT patterns
- Section 32 (block-engine): xem block types hiện có

### Nội dung section — 7 phần

#### 3.1 Machine Status Exact Color Tokens
Machine status KHÔNG ĐƯỢC dùng theme colors. Đây là FIXED tokens bất biến qua mọi theme:
```
- Running:  --machine-running: #16a34a;  surface: #f0fdf4; border: #86efac; icon: circle-dot
- Setup:    --machine-setup: #7c3aed;    surface: #f5f3ff; border: #c4b5fd; icon: wrench
- Paused:   --machine-paused: #d97706;   surface: #fffbeb; border: #fcd34d; icon: pause-circle
- Stopped:  --machine-stopped: #dc2626;  surface: #fef2f2; border: #fca5a5; icon: x-circle
- PM:       --machine-pm: #2563eb;       surface: #eff6ff; border: #93c5fd; icon: tool
- Idle:     --machine-idle: #64748b;     surface: #f1f5f9; border: #cbd5e1; icon: minus-circle
```
Dark mode variants, text label uppercase 11px bold, icon + color + text bắt buộc (WCAG).

#### 3.2 SPC Western Electric Rules Visualization
Zone coloring A/B/C, 8 Western Electric rules, out-of-control point highlighting (spec-table chi tiết).

#### 3.3 CAPA 8D Stepper Block — JSON Schema đầy đủ
D0-D8, mỗi step có status/owner/SLA/completionDate, horizontal/vertical orientation. Visual: circle 32px, completed=green+check, current=pulsing blue, pending=gray outline, overdue=red+exclamation.

#### 3.4 Glove-Friendly Touch Mode
`[data-glove-mode="true"]`: targets 60x60px, spacing 20px, control height 64px, table row 72px, button min-width 120px. Full-width buttons cho START/STOP/PAUSE.

#### 3.5 Calibration Status Indicators
Current=green, Due Soon (≤30 days)=amber, Overdue=red, Out-of-Tolerance=red flashing. Visual states cho environmental-gauge và instrument-manager blocks.

#### 3.6 Training Matrix Display
Employee × Skill grid, status cells: Certified (green+check), In Training (blue+progress), Expired (red+warning), Not Required (gray+dash). Filterable by department, skill, status.

#### 3.7 Barcode/QR Scan Feedback
Success: green flash 300ms + beep tone 1000Hz 100ms + haptic. Failure: red flash 300ms + buzz tone 300Hz 200ms + haptic heavy. Manual fallback input. Multi-scan mode with running list. Format validation.

### Vượt yêu cầu — CODEX NÊN TỰ THÊM
- Thêm 3.8: ISA-18.2 Alarm Management patterns (alarm shelving, priority escalation)
- Thêm 3.9: Recipe/Batch Process S88 visualization
- Thêm 3.10: Multi-Plant hierarchy navigation (Enterprise → Site → Area → Line → Cell)
- Mỗi phần có cross-reference đến block type trong section 32

### Acceptance criteria
```
OUTPUT FILE: mom/docs/tmp/v4.3-p3-manufacturing.html
- File tồn tại, bắt đầu bằng <section class="section" id="manufacturing-precision">
- Có ≥ 7 sub-sections, mỗi sub-section có spec-table hoặc JSON schema
- Machine status colors có EXACT hex cho cả light và dark mode
- SPC spec có ≥ 8 Western Electric rules liệt kê đầy đủ
- CAPA 8D có JSON schema hoàn chỉnh (type, props, events, allowedZones, accessibility)
- Glove mode có token overrides cụ thể
- KHÔNG chứa HTML/head/body/style wrapper
- section-number để trống hoặc "??"
- Tiếng Việt CÓ DẤU
```

---

## PROMPT 4/8: Regulatory Compliance & Data Security — 5 spec quan trọng

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
KHÔNG sửa file chính module-layout-template-design-system-v4.html
THAY VÀO ĐÓ: Ghi ra file:
  mom/docs/tmp/v4.3-p4-regulatory.html

Chứa DUY NHẤT HTML của section (từ <section...> đến </section>)
KHÔNG có wrapper HTML, CSS, TOC, header
Tạo thư mục mom/docs/tmp/ nếu chưa có.
```

### Mục tiêu
Tạo file `mom/docs/tmp/v4.3-p4-regulatory.html` chứa HTML của section `regulatory-precision` — 5 quy chuẩn tuân thủ chính xác. Expert 3 đánh giá regulatory ở mức 55/100 — quá thấp cho phần mềm eQMS.

### Phải đọc trước khi làm
- Section 15 (compliance-forms, dòng 1355): xem 21 CFR Part 11 hiện có
- Section 22 (table-rules, dòng 2075): xem data-table spec

### Nội dung — 5 phần

#### 4.1 E-Signature 3-Step UI Flow (21 CFR Part 11)
Modal size md (560px), 3 steps trong stepper:
- Step 1 Identify: signer card read-only (avatar, name, role, org)
- Step 2 Authenticate: password field (masked, toggle visibility), 3 failures → lock 15min, biometric option
- Step 3 Meaning: dropdown required (Approval/Review/Verification/Authorship/Responsibility), comments text area, summary panel, Sign button primary/danger. Persistent modal, Escape blocked.

#### 4.2 Audit Trail Exact Column Layout
8 mandatory columns: Timestamp (160px, mono, yyyy-MM-dd HH:mm:ss.SSS UTC+7), User (140px, name+ID), Action (100px, badge: Create=green/Update=blue/Delete=red/Approve=purple/Print=gray), Field (140px), Old Value (auto, mono, red strikethrough), New Value (auto, mono, green highlight), Reason (180px), Record Version (80px, center). Filters: date range, user, action, field. Export CSV/PDF. Sort: timestamp desc. Pagination: 50/page. IMMUTABLE.

#### 4.3 ITAR/Export Control Data Masking UI
Banner: persistent, bg #fef2f2, border 2px solid #dc2626, shield-alert icon 24px red, text "ITAR CONTROLLED". Not dismissible. Data masking: `[RESTRICTED]` gray mono for unauthorized users, lock icon + tooltip. Access verification via profile. Print watermark: diagonal repeating "ITAR CONTROLLED — DO NOT DISTRIBUTE" 48pt opacity 0.15 #dc2626 rotated -45deg.

#### 4.4 Change Control Form Layout (ECO/ECN)
Sections: Description of Change, Reason for Change, Impact Assessment (Production/Quality/Cost/Schedule checkboxes), Affected Documents list (linked table), Required Approvals (workflow stepper), Implementation Plan (date range + responsible). Status flow: Draft → Review → Approved → Implemented → Closed.

#### 4.5 Deviation Report Form Structure
Sections: Event Description, Classification (Major/Minor/Critical dropdown), Risk Assessment (severity × probability matrix), Containment Actions (inline table), Root Cause (5-Why or Fishbone selector), CAPA Link (search + link), Resolution, Follow-up verification date.

### Vượt yêu cầu
- Thêm 4.6: Record Retention & Archival UI (retention periods, archive status, legal hold indicator)
- Thêm 4.7: Electronic Batch Record review flow
- Cross-reference tất cả với section 15

### Acceptance criteria
```
OUTPUT FILE: mom/docs/tmp/v4.3-p4-regulatory.html
- File tồn tại, bắt đầu bằng <section class="section" id="regulatory-precision">
- E-signature spec có 3 steps rõ ràng với wireframe hoặc flow diagram
- Audit trail có exact column widths, data types, alignment
- ITAR spec có banner HTML structure + print watermark CSS
- Change Control có status flow diagram
- KHÔNG chứa HTML/head/body/style wrapper
- section-number để trống hoặc "??"
- Tiếng Việt CÓ DẤU
```

---

## PROMPT 5/8: Accessibility & Internationalization — Sửa mọi lỗi WCAG + i18n

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
Prompt này CÓ 2 tác vụ:

TÁC VỤ A — Ghi file tạm:
  mom/docs/tmp/v4.3-p5-a11y.html
  Chứa DUY NHẤT HTML của section mới a11y-i18n-precision

TÁC VỤ B — Ghi file diff riêng:
  mom/docs/tmp/v4.3-p5-section7-patch.html
  Chứa CHỈ đoạn HTML CẦN THÊM vào cuối section 7 (accessibility) hiện có
  (không phải toàn bộ section 7, chỉ phần bổ sung)

Prompt 8 sẽ: chèn file A vào đúng vị trí, và append nội dung file B vào section 7
```

### Mục tiêu
Tạo 2 files:
1. `mom/docs/tmp/v4.3-p5-a11y.html` — section mới `a11y-i18n-precision`
2. `mom/docs/tmp/v4.3-p5-section7-patch.html` — bổ sung cho section 7 (accessibility) hiện có

Expert 3 đánh giá WCAG ở 68%, phải nâng lên ≥ 85%.

### Phải đọc trước khi làm
- Section 7 (accessibility, dòng 643-755): nội dung hiện có TOÀN BỘ
- Section 33 (zone-system, dòng 3007): zone types và cấu trúc
- Section 3 (standards, dòng 329): focus ring và contrast specs hiện có

### Nội dung section mới — 6 phần

#### 5.1 ARIA Landmark Mapping (Zone → ARIA)
| Zone | HTML Element | ARIA Role | aria-label |
|------|-------------|-----------|------------|
| Shell header (app bar) | `<header>` | banner | "HESEM MOM application header" |
| Sidebar navigation | `<nav>` | navigation | "Module navigation" |
| KPI bar | `<section>` | region | "Chỉ số hiệu suất chính" |
| Filter bar | `<section>` | region | "Bộ lọc dữ liệu" |
| Main content | `<main>` | main | (thừa kế từ page title) |
| Sidebar detail | `<aside>` | complementary | "Panel chi tiết" |
| Footer actions | `<footer>` | contentinfo | "Thao tác trang" |
Breadcrumb: `<nav aria-label="Breadcrumb">` riêng biệt. Chính xác 1 `<main>` per page.

#### 5.2 Roving Tabindex Patterns
- Toolbar: 1 tab stop → arrow keys navigate items → Home/End nhảy đầu/cuối
- Tree view: 1 tab stop → Up/Down navigate → Right expand → Left collapse
- Menu: 1 tab stop → Up/Down navigate → Enter select → Escape close
- Grid/Table: 1 tab stop → Arrow keys navigate cells → Enter edit → Escape cancel
- Tabs: 1 tab stop → Left/Right switch tabs → Home/End nhảy tab đầu/cuối
Code example cho mỗi pattern.

#### 5.3 Vietnamese Typography Requirements
Font stack validated cho Vietnamese Unicode: `-apple-system, 'Segoe UI', 'Noto Sans', 'Roboto', Arial, sans-serif`. `text-rendering: optimizeLegibility`. Line-height ≥ 1.4 cho Vietnamese. Overline role (10px) KHÔNG dùng cho Vietnamese có dấu — minimum 11px. Test pangram: "Bắc kim thạp khắc ngọc quyển chưa để Yến".

#### 5.4 Contrast Verification Table
Bảng kiểm tra contrast ratio cho MỌI cặp text/background:
- --text-primary (#1e293b) trên --bg-surface (#ffffff): 12.6:1 ✅ AAA
- --text-secondary (#64748b) trên --bg-surface (#ffffff): 4.9:1 ✅ AA
- --text-tertiary (#94a3b8) trên --bg-surface (#ffffff): 3.1:1 ⚠️ AA large only
- --brand-2 (#1565c0) trên --bg-surface (#ffffff): 4.6:1 ✅ AA
- (dark mode pairs cũng phải verify)
- Focus ring --brand-2 trên --bg-surface: 4.6:1 ✅ AA (non-text 3:1)

#### 5.5 Reading Order & CSS Reordering Rule
"KHÔNG BAO GIỜ dùng CSS order, flex-direction:row-reverse, hoặc grid reordering để tạo visual order khác DOM order. Screen readers đọc DOM order. Ngoại lệ duy nhất: RTL layout transforms (hiện chưa áp dụng)."

#### 5.6 i18n Date/Number/Currency Format Rules
- Date: `Intl.DateTimeFormat(locale)`, mặc định vi-VN: dd/MM/yyyy, en-US: MM/dd/yyyy
- Number: `Intl.NumberFormat(locale)`, vi-VN: 1.234,56 (dot=thousands, comma=decimal)
- Currency: symbol trước/sau tùy locale, vi-VN: "1.234.567 ₫", en-US: "$1,234,567.00"
- Timezone: hiển thị UTC offset, mặc định UTC+7
- Translation string: buttons/labels min-width tính thêm 30% cho ngôn ngữ dài (German/French)

### Sửa section 7 (accessibility) hiện có
- Thêm info-box cross-reference đến section mới `a11y-i18n-precision`
- Thêm alt text authoring guideline: "Ảnh inspection/defect: mô tả defect type + vị trí. Ảnh decorative: aria-hidden='true'. Ảnh machine: mô tả machine type + trạng thái."

### Acceptance criteria
```
OUTPUT FILES:
  A) mom/docs/tmp/v4.3-p5-a11y.html
     - Bắt đầu bằng <section class="section" id="a11y-i18n-precision">
     - Landmark mapping table có ≥ 7 zone mappings
     - Roving tabindex có ≥ 5 patterns với code examples
     - Contrast verification table có ≥ 8 color pairs với ratio và pass/fail
     - Vietnamese typography spec có font stack + line-height + test pangram
     - i18n spec có date, number, currency format rules
     - KHÔNG chứa HTML/head/body/style wrapper

  B) mom/docs/tmp/v4.3-p5-section7-patch.html
     - Chứa HTML snippet để append vào section 7
     - Có info-box cross-reference đến a11y-i18n-precision
     - Có alt text authoring guideline
     - KHÔNG chứa HTML/head/body/style wrapper

- KHÔNG mâu thuẫn với section 3, 7, 20
- Tiếng Việt CÓ DẤU
```

---

## PROMPT 6/8: Block Engine Runtime & API Specification

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
KHÔNG sửa file chính module-layout-template-design-system-v4.html
THAY VÀO ĐÓ: Ghi ra file:
  mom/docs/tmp/v4.3-p6-runtime.html

Chứa DUY NHẤT HTML của section (từ <section...> đến </section>)
KHÔNG có wrapper HTML, CSS, TOC, header
Tạo thư mục mom/docs/tmp/ nếu chưa có.
```

### Mục tiêu
Tạo file `mom/docs/tmp/v4.3-p6-runtime.html` chứa HTML của section `runtime-api-spec` — specification đầy đủ cho runtime rendering pipeline, block lifecycle, API contracts, state management, và performance targets. Expert 4 cho điểm 38/100 — thấp nhất — vì tài liệu mô tả WHAT nhưng thiếu HOW.

### Phải đọc trước khi làm
- Section 32 (block-engine, dòng 2779): block types hiện có
- Section 33 (zone-system, dòng 3007): zone types
- Section 29 (block-schema, dòng 2401): JSON schema format
- Section 50 (token-cascade, dòng 4266): cascade logic hiện có
- File JS: `mom/scripts/portal/00c-admin-appearance.js` dòng 996-1182 — TEMPLATE_SEED, VISUAL_THEMES
- File JS: `mom/scripts/portal/00b-theme-manager.js` dòng 746-835 — VISUAL_THEME_PRESETS, _mergedConfig, localStorage keys

### Historical note: mismatches already closed or fenced
```
RESOLVED: 00c-admin-appearance.js VISUAL_THEMES có 20 themes và 00b-theme-manager.js
VISUAL_THEME_PRESETS phải runtime-map đủ 20 Admin theme IDs. Runtime-only legacy aliases
không được hiện trong Admin nếu không có controlled UI contract.

FENCED: localStorage chỉ được dùng cho user preference, preview cache, unsaved draft
cache, last-view/filter/sort. Forbidden legacy authority keys
hesem_layout_templates và hesem_module_template_binding phải bị purge hoặc chỉ dùng
làm read-only migration evidence, không được dùng làm production authority.

CONTROLLED: Theme IDs khác nhau giữa Admin UI và runtime chỉ được tồn tại nếu runtime
alias được khai báo rõ và không tạo silent fallback cho publish/apply.
```
Section này là prompt lịch sử, không phải authority hiện hành. Authority hiện hành nằm trong
`mom/docs/module-layout-template-design-system-v4.html`, `00b-theme-manager.js`, và backend
graphics governance registry artifacts.

### Nội dung — 8 phần

#### 6.1 Template → DOM Rendering Pipeline
```
Pseudocode:
1. Lấy templateId từ module config
2. Resolve template → layout config { zones[], gridTemplate, density, blocks[] }
3. Tạo DOM container: <div class="tpl-shell" data-template="{id}" data-density="{density}">
4. Cho mỗi zone trong zones[]:
   a. Tạo <section class="zone zone-{type}" data-zone="{type}" role="{aria-role}">
   b. Apply zone-level token overrides (layer 4 trong cascade)
   c. Cho mỗi block trong zone.blocks[]:
      i.   Validate block.type có trong zone.allowedBlocks
      ii.  Lazy load block module nếu chưa registered
      iii. Mount block: block.mount(containerEl, props, context)
      iv.  Subscribe block to data source
5. Apply template-level token overrides (layer 3)
6. Resolve cascaded tokens: System → Admin → Template → Zone → User
7. Inject computed CSS variables vào tpl-shell element
```
Spec-table chi tiết cho pipeline stages.

#### 6.2 Block Lifecycle Hooks
```
interface BlockLifecycle {
  onMount(container: HTMLElement, props: BlockProps, context: AppContext): void;
  onUpdate(changedProps: Partial<BlockProps>): void;
  onTokenChange(tokens: Record<string, string>): void;
  onResize(width: number, height: number): void;
  onDestroy(): void;
  onError(error: Error): FallbackUI | null;
  onSuspend(): void;  // khi block ra khỏi viewport (lazy)
  onResume(): void;   // khi block vào viewport lại
}
```

#### 6.3 Block Registration API
```
BlockEngine.register({
  type: 'data-table',
  version: '1.0.0',
  allowedZones: ['main', 'sidebar'],
  schema: { /* JSON Schema từ section 29 */ },
  factory: (container, props, context) => new DataTableBlock(container, props, context),
  lazyLoad: true,
  bundleSize: '45KB'  // budget
});
```

#### 6.4 Inter-Block Communication
```
Pattern: Event Bus (NOT shared store)
- block.emit('filter-change', { dateRange: [start, end] })
- block.on('filter-change', (payload) => { this.reload(payload) })
- Scope: same template instance (not cross-module)
- Naming: {source-block-type}:{event-name}
- Cleanup: auto-unsubscribe on block destroy
```

#### 6.5 State Management Schema
```typescript
interface AppState {
  activeModule: string;
  activeTemplate: string;
  density: 'compact' | 'default' | 'comfortable' | 'shopfloor';
  theme: string;
  tokens: {
    system: Record<string, string>;    // Layer 1 — CSS :root
    admin: Record<string, string>;     // Layer 2 — api.php?action=admin_design_config
    template: Record<string, string>;  // Layer 3 — per template
    zone: Record<string, Record<string, string>>; // Layer 4 — per zone
    user: Record<string, string>;      // Layer 5 — localStorage: hesem_user_appearance
  };
  layout: {
    sidebarExpanded: boolean;
    activeTab: string;
    filterState: Record<string, any>;
  };
}
```
Historical localStorage sketch (NOT authority — current code must follow graphics governance split):
```
hesem_user_appearance — user preference cache only
hesem_graphics_template_preview_cache — preview cache only
hesem_graphics_template_draft_cache — unsaved draft cache only
hesem_layout_templates — forbidden legacy authority key; purge or read-only migration evidence only
hesem_module_template_binding — forbidden legacy binding key; backend registry owns production binding
```

#### 6.6 API Contract
```
GET  /api.php?action=admin_design_config          → { config: AppState.tokens.admin }
POST /api.php?action=admin_design_config_save      → { success: boolean }
GET  /api.php?action=template_list                 → { templates: TemplateSeed[] }
POST /api.php?action=template_save                 → { id: string, success: boolean }
DELETE /api.php?action=template_delete&id={id}     → { success: boolean }
POST /api.php?action=template_bind                 → { moduleId, templateId, success }

Error envelope:
{ success: false, error: { code: string, message: string, field?: string } }

Auth: X-CSRF-Token header required for all POST/DELETE
```

#### 6.7 WebSocket Event Specification
```
Connection: wss://eqms.hesemeng.com/ws/realtime
Auth: token in query param ?token={sessionToken}

Events (server → client):
  { type: "sensor-update", machineId: string, data: SensorReading }
  { type: "alarm-trigger", alarmId: string, severity: "critical"|"warning"|"info", message: string }
  { type: "record-update", recordType: string, recordId: string, changedBy: string }
  { type: "presence", userId: string, recordId: string, action: "join"|"leave" }

Reconnection: exponential backoff 1s → 2s → 4s → 8s → max 30s
On reconnect: request delta from last known timestamp
Max offline before full reload: 5 minutes
```

#### 6.8 Performance Targets
```
| Metric | Target | Measurement |
|--------|--------|-------------|
| FCP (First Contentful Paint) | < 1.2s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| INP (Interaction to Next Paint) | < 200ms | Web Vitals |
| Block bundle size (per block) | < 50KB gzipped | Build output |
| Total initial JS | < 300KB gzipped | Build output |
| Template switch time | < 500ms | Custom metric |
| Virtual scroll threshold | > 100 rows | Switch from DOM to virtual |
| Lazy load trigger | IntersectionObserver, 200px rootMargin | Block enters viewport |
```

### Vượt yêu cầu
- Thêm 6.9: Error Boundary specification (block crash → fallback UI → error reporting)
- Thêm 6.10: Undo/Redo specification cho Template Editor (max 50 stack depth, undoable actions list)
- Thêm 6.11: Cache invalidation strategy (admin config cache TTL, template config versioning)

### Acceptance criteria
```
OUTPUT FILE: mom/docs/tmp/v4.3-p6-runtime.html
- Bắt đầu bằng <section class="section" id="runtime-api-spec">
- Rendering pipeline có pseudocode ≥ 7 steps
- Block lifecycle có ≥ 8 hooks defined
- Block registration API có type, version, allowedZones, schema, factory, lazyLoad
- Inter-block communication pattern clearly chosen (event bus)
- State management có TypeScript interface
- localStorage keys listed (≥ 5 keys, AUTHORITATIVE)
- API contract có ≥ 5 endpoints với request/response shapes
- WebSocket spec có event types, reconnection strategy
- Performance targets có ≥ 8 metrics với specific values
- Doc-vs-code mismatches ACKNOWLEDGED trong info-box
- KHÔNG chứa HTML/head/body/style wrapper
- section-number để trống hoặc "??"
```

---

## PROMPT 7/8: Visual Theme Token Maps + Block JSON Schemas bổ sung

### Cách ghi file — QUAN TRỌNG (Cách 2: file tạm riêng)
```
Prompt này CÓ 2 tác vụ sửa nội dung HIỆN CÓ trong file chính:

TÁC VỤ A — Ghi file diff cho section 31 (visual-themes):
  mom/docs/tmp/v4.3-p7-themes-patch.html
  Chứa ĐOẠN HTML CẦN THÊM vào trong từng theme card
  (token map JSON cho cả 20 themes, được đặt sau phần color swatch của mỗi theme)
  Format: dùng comment để đánh dấu vị trí chèn:
    <!-- INSERT AFTER: theme card id="theme-1" -->
    <div class="code-block">{ "id": "professional-light", ... }</div>
    <!-- INSERT AFTER: theme card id="theme-2" -->
    ...

TÁC VỤ B — Ghi file diff cho section 29 (block-schema):
  mom/docs/tmp/v4.3-p7-schemas-patch.html
  Chứa HTML của 5 block JSON schemas mới (kanban-board, data-timeline, signature-pad, gantt-chart, barcode-input)
  Giống format các schemas hiện có trong section 29
  Prompt 8 sẽ append nội dung này vào cuối section 29

Tạo thư mục mom/docs/tmp/ nếu chưa có.
```

### Mục tiêu
Tạo 2 files patch:
1. `mom/docs/tmp/v4.3-p7-themes-patch.html` — token maps cho 20 themes (chèn vào section 31)
2. `mom/docs/tmp/v4.3-p7-schemas-patch.html` — 5 block schemas mới (append vào section 29)

### Phải đọc trước khi làm
- Section 31 (visual-themes, dòng 2652-2778): 20 theme cards hiện có — xem CHÍNH XÁC ID của mỗi theme card
- Section 29 (block-schema, dòng 2401-2618): 5 schemas hiện có — xem format để match
- File JS: `mom/scripts/portal/00c-admin-appearance.js` dòng 1161-1182: VISUAL_THEMES data (hex values)
- File JS: `mom/scripts/portal/00b-theme-manager.js` dòng 746-835: VISUAL_THEME_PRESETS

### Yêu cầu chi tiết

#### 7.1 Theme Token Maps
Mỗi theme card HIỆN TẠI chỉ có color swatch + prose description. THÊM cho MỖI theme 1 block `code-block` chứa token map:
```json
{
  "id": "professional-light",
  "tokens": {
    "--brand": "#0c2d48",
    "--brand-2": "#1565c0",
    "--accent": "#f9a825",
    "--bg-page": "#f8fafc",
    "--bg-surface": "#ffffff",
    "--bg-surface-alt": "#f7fbff",
    "--text-primary": "#1e293b",
    "--text-secondary": "#64748b",
    "--border": "#dbe4ef"
  },
  "darkMode": {
    "--brand": "#93c5fd",
    "--brand-2": "#60a5fa",
    "--bg-page": "#0f172a",
    "--bg-surface": "#1e293b",
    "--text-primary": "#f1f5f9"
  }
}
```
TẤT CẢ 20 themes phải có token map. Dùng hex values từ 00c VISUAL_THEMES data.

#### 7.2 Block JSON Schemas bổ sung
Hiện section 29 có 5 schemas: data-table, chart-line, form-standard, kpi-row, approval-buttons.
Info-box nói cần thêm: kanban-board, data-timeline, signature-pad, gantt-chart, barcode-input.

Viết JSON Schema ĐẦY ĐỦ cho 5 blocks này (giống format 5 blocks hiện có — props, events, allowedZones, accessibility):

```
kanban-board:
  props: lanes[], cardFields[], wipLimit, swimlanes, dragEnabled, cardTemplate
  events: onCardMove, onLaneChange, onWipExceed
  allowedZones: main
  accessibility: role=region, aria-label="Kanban board", keyboard DnD required

data-timeline:
  props: entries[], orientation (vertical|horizontal), groupBy, showConnectors, filterByUser
  events: onEntryClick, onFilter
  allowedZones: main, sidebar
  accessibility: role=feed, aria-label="Timeline", each entry role=article

signature-pad:
  props: signerRole, reasonCode, timestampMode, inkColor, canvasWidth, canvasHeight, textAlternative
  events: onSign, onClear, onSubmit
  allowedZones: main, footer
  accessibility: role=img on completion, fallback text input for screen readers

gantt-chart:
  props: tasks[], resources[], timeScale (hour|day|week|month), dependencies, milestones, criticalPath
  events: onTaskDrag, onDependencyChange, onZoom, onResourceAssign
  allowedZones: main, chart-area
  accessibility: role=img, aria-label="Gantt chart", textual task list as SR alternative

barcode-input:
  props: format (Code128|QR|DataMatrix|auto), scanMode (single|continuous), autoSubmit, validationRegex
  events: onScan, onError, onManualInput
  allowedZones: main, filter, header
  accessibility: role=searchbox, aria-label="Barcode scanner input"
```

### Acceptance criteria
```
OUTPUT FILES:
  A) mom/docs/tmp/v4.3-p7-themes-patch.html
     - 20 theme token maps với comment markers <!-- INSERT AFTER: theme card id="..." -->
     - Mỗi token map có ≥ 9 tokens
     - Hex values KHỚP với 00c-admin-appearance.js VISUAL_THEMES

  B) mom/docs/tmp/v4.3-p7-schemas-patch.html
     - 5 block JSON schemas hoàn chỉnh (kanban-board, data-timeline, signature-pad, gantt-chart, barcode-input)
     - Cùng format với 5 schemas trong section 29
     - KHÔNG chứa HTML/head/body/style wrapper
```

---

## PROMPT 8/8: Final Assembly — Merge, Renumber, TOC, Version, Validation

### Mục tiêu
Đây là bước cuối cùng — đọc file chính + TẤT CẢ 7 file tạm từ Prompts 2-7, merge vào file chính, renumber, update TOC, version bump, validate.

**Đây là prompt DUY NHẤT được phép sửa file chính:**
```
mom/docs/module-layout-template-design-system-v4.html
```

### Phải đọc trước khi làm
```
FILE CHÍNH:
  mom/docs/module-layout-template-design-system-v4.html (toàn bộ)

FILE TẠM từ Prompt 1 (đã sửa trực tiếp file chính, không có file tạm):
  ✅ Không cần đọc thêm — CSS đã được update trong file chính bởi Prompt 1

FILE TẠM từ Prompt 2-7 (đọc tất cả):
  mom/docs/tmp/v4.3-p2-interaction.html        → section mới: interaction-patterns
  mom/docs/tmp/v4.3-p3-manufacturing.html       → section mới: manufacturing-precision
  mom/docs/tmp/v4.3-p4-regulatory.html          → section mới: regulatory-precision
  mom/docs/tmp/v4.3-p5-a11y.html               → section mới: a11y-i18n-precision
  mom/docs/tmp/v4.3-p5-section7-patch.html      → bổ sung cho section 7 (accessibility)
  mom/docs/tmp/v4.3-p6-runtime.html             → section mới: runtime-api-spec
  mom/docs/tmp/v4.3-p7-themes-patch.html        → token maps cho 20 themes (section 31)
  mom/docs/tmp/v4.3-p7-schemas-patch.html       → 5 block schemas (section 29)
```

### Yêu cầu chi tiết

#### 8.1 Merge — Chèn sections mới vào đúng vị trí
```
VỊ TRÍ CHÈN (theo thứ tự trong file):

1. v4.3-p2-interaction.html
   → Chèn SAU </section> của section id="toast-precise"
   → TRƯỚC <section ... id="visual-themes">

2. v4.3-p3-manufacturing.html
   → Chèn SAU </section> của section id="interaction-patterns" (vừa chèn)

3. v4.3-p4-regulatory.html
   → Chèn SAU </section> của section id="manufacturing-precision"

4. v4.3-p5-a11y.html
   → Chèn SAU </section> của section id="regulatory-precision"

5. v4.3-p6-runtime.html
   → Chèn SAU </section> của section id="a11y-i18n-precision"

6. v4.3-p5-section7-patch.html
   → Append nội dung vào TRƯỚC </section> của section id="accessibility"

7. v4.3-p7-themes-patch.html
   → Dùng comment markers <!-- INSERT AFTER: theme card id="..." -->
   → để tìm vị trí chèn token map cho từng theme trong section id="visual-themes"

8. v4.3-p7-schemas-patch.html
   → Append nội dung vào TRƯỚC </section> của section id="block-schema"
```

#### 8.2 Renumber TẤT CẢ sections
- Tìm TẤT CẢ `<span class="section-number">N</span>` và renumber tuần tự 1 → N
- Expected N: khoảng 57-62 sections

#### 8.3 Update TOC
- Thêm links cho mọi section mới với nhóm `<!-- Quy chuẩn nâng cao -->`:
  ```html
  <!-- Quy chuẩn nâng cao -->
  <a href="#interaction-patterns">Tương tác</a>
  <a href="#manufacturing-precision">MES Chính xác</a>
  <a href="#regulatory-precision">Tuân thủ</a>
  <a href="#a11y-i18n-precision">A11y & i18n</a>
  <a href="#runtime-api-spec">Runtime & API</a>
  ```
- Giữ TOC compact (short labels)

#### 8.4 Version bump
Tìm và thay TẤT CẢ:
- "v4.2" → "v4.3" (title, h1, meta-item, section-lead, footer-note)
- Update date "2026-04-11" → ngày thực thi prompt này

#### 8.5 Cross-reference audit
- Tìm mọi `href="#..."` → verify target ID tồn tại trong file
- Tìm mọi `Section N` text references → verify N đúng sau renumber
- Tìm mọi token references (var(--...)) → verify token có trong :root CSS

#### 8.6 Update section 1 (summary)
```
Stat cards update:
- Templates: 123 (giữ nguyên)
- Sections: N (cập nhật số thực)
- Block Types: 95+ (90 cũ + 5 mới từ Prompt 7)
- CSS Tokens: 120+ (sau Prompt 1)
```

#### 8.7 Update footer
```
HESEM MOM — Module Layout Template Design System v4.3 Enterprise — 123 templates · 95+ block types · 20 visual themes · 30 component presets · 34 modules · 120+ CSS tokens · N sections — {date}
```

#### 8.8 Final validation
- HTML validation: mọi tag đóng đúng, không nested sai
- Section number sequence: 1, 2, 3, ..., N không trùng
- TOC links: mọi href="#..." target tồn tại
- No duplicate IDs
- No v4.2 references remaining
- Tiếng Việt có dấu trong mọi user-facing text

### Vượt yêu cầu
- Thêm section cuối: "Changelog" — liệt kê changes từ v4.2 → v4.3 dạng bullet list
- Thêm "Mục lục chi tiết" section với tất cả sections + 1-line description
- Review và cải thiện bất kỳ section nào mà agent thấy yếu

### Acceptance criteria
```
- Sections tuần tự 1→N, KHÔNG có gap hoặc duplicate
- TOC có links cho TẤT CẢ sections (≥ 45 links)
- Version string "v4.3" xuất hiện ≥ 4 lần (title, h1, meta, footer)
- KHÔNG còn "v4.2" trong file
- Mọi href="#..." target tồn tại trong file
- Mọi section-number span chứa đúng số thứ tự
- Summary stats cập nhật đúng
- Footer stats cập nhật đúng
- HTML valid
- Tiếng Việt có dấu
- File render đẹp trong browser
```

---

## EXECUTION ORDER — CÁC 2 (FILE TẠM RIÊNG)

```
NGUYÊN TẮC CÁCH 2:
- Prompts 2-7 KHÔNG đụng file chính — chỉ ghi file tạm vào mom/docs/tmp/
- Prompt 8 là bước DUY NHẤT merge tất cả vào file chính + renumber + validate
- An toàn tuyệt đối — không bao giờ conflict

PHASE 1 — ĐÃ CHẠY (không chạy lại):
  Prompt 1: Sửa CSS :root trực tiếp trong file chính
  ✅ Đang chạy — chờ hoàn thành trước khi chạy Phase 2

PHASE 2 — SONG SONG (mở 4 Codex agents cùng lúc sau khi Prompt 1 xong):
  Prompt 2 → ghi: mom/docs/tmp/v4.3-p2-interaction.html
  Prompt 3 → ghi: mom/docs/tmp/v4.3-p3-manufacturing.html
  Prompt 4 → ghi: mom/docs/tmp/v4.3-p4-regulatory.html
  Prompt 5 → ghi: mom/docs/tmp/v4.3-p5-a11y.html
             ghi: mom/docs/tmp/v4.3-p5-section7-patch.html
  ─────────────────────────────────────────────────────────
  Không file nào conflict vì mỗi agent ghi 1 file riêng!

PHASE 3 — SONG SONG (mở 2 Codex agents cùng lúc sau khi Phase 2 xong):
  Prompt 6 → ghi: mom/docs/tmp/v4.3-p6-runtime.html
  Prompt 7 → ghi: mom/docs/tmp/v4.3-p7-themes-patch.html
             ghi: mom/docs/tmp/v4.3-p7-schemas-patch.html

PHASE 4 — SEQUENTIAL (chạy duy nhất 1 agent cuối cùng):
  Prompt 8 → đọc file chính + 7 file tạm → merge → renumber → TOC → version v4.3
           → ghi ra: mom/docs/module-layout-template-design-system-v4.html (file chính)
```

### Kiểm tra sau mỗi phase
```
Sau Phase 1: verify file chính có ≥ 120 CSS vars trong :root
Sau Phase 2: verify 5 files tạm tồn tại trong mom/docs/tmp/
Sau Phase 3: verify 7 files tạm tồn tại trong mom/docs/tmp/
Sau Phase 4: verify file chính render đúng, sections tuần tự, không duplicate IDs
```

### Lưu ý quan trọng cho Codex
```
1. MỖI PROMPT phải gọi agent đọc file TRƯỚC và SAU khi sửa
2. Agent phải đánh giá: "Developer đọc xong có phải đoán gì không?"
3. Nếu agent nói CÓ → bổ sung thêm spec cho đến khi KHÔNG phải đoán
4. KHÔNG CHỈ làm đúng yêu cầu — phải làm TỐT HƠN rất nhiều
5. Thêm spec/pattern/example mà prompt không yêu cầu nhưng developer sẽ cần
6. Mỗi section phải có ít nhất 1 info-box cross-reference đến sections liên quan
7. Mỗi section phải có ít nhất 1 "Do/Don't" hoặc "Good/Bad" example
8. Token values phải CHÍNH XÁC — double-check hex, px, ms values
9. Tiếng Việt PHẢI CÓ DẤU — kiểm tra lại sau khi viết
10. CSS classes phải dùng đúng: .section, .section-title, .section-number, .card, .spec-table, .info-box
```

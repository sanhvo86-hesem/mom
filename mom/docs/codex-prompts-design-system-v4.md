# HESEM MOM — Bộ Prompt Codex: Module Layout Template Design System v4.0

> **Ngày tạo**: 2026-04-10
> **Tổng cộng**: 12 prompts (6 tạo mới + 6 nâng cấp), mỗi prompt tự chứa đầy đủ context
> **Phần 1 (Prompt 1-6)**: Tạo tài liệu v4.0 + mã nguồn. Prompt 1→2→3 song song. Prompt 4 sau. Prompt 5+6 song song.
> **Phần 2 (Prompt 7-12)**: Nâng cấp v4.0→v4.1. Prompt 7+8+9 song song. Prompt 10 trước, Prompt 11 sau Prompt 10. Prompt 12 cuối.

> **Historical artifact only**: File này lưu prompt triển khai cũ, không phải authority hiện hành. Authority hiện hành là Standard 36 + authority HTML + backend graphics-governance contracts. Mọi đoạn nói `template-centric`, `hesem_layout_templates` hoặc localStorage template registry chỉ còn là ví dụ legacy bị thay thế; production template/governance authority phải đi qua backend graphics authority.

---

## QUY TẮC CHUNG CHO TẤT CẢ PROMPTS

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
```

---

## PROMPT 1/6: Tài liệu thiết kế — CSS + Header + Kiến trúc + Quy chuẩn đồ họa + 20 Visual Theme Presets

### Mục tiêu
Tạo file HTML `mom/docs/module-layout-template-design-system-v4.html` — phần đầu của tài liệu thiết kế toàn diện cho hệ thống Module Layout Template của phần mềm HESEM MOM (Manufacturing Operations Management).

### Context dự án
HESEM MOM là phần mềm quản lý sản xuất cấp doanh nghiệp cho ngành CNC precision machining (semiconductor, aerospace, medical devices). Hệ thống có 34 modules, 181 CSS design tokens, 139 component CSS classes. Frontend là vanilla JS + HTML (không dùng React/Vue), backend PHP.

### Yêu cầu chi tiết

**File output**: `mom/docs/module-layout-template-design-system-v4.html`

**Cấu trúc file gồm các phần sau:**

#### PHẦN 1: CSS Design (~300 dòng)
- Font: `-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif`
- Font mono: `'JetBrains Mono', 'Fira Code', monospace`
- Color palette dựa trên brand HESEM: `--brand:#0c2d48`, `--brand-2:#1565c0`, `--accent:#f9a825`
- CSS classes cần có:
  - `.doc-header` — gradient header cực đẹp với background pattern dạng circuit board / wafer
  - `.toc` — sticky table of contents với backdrop-filter blur
  - `.section`, `.section-title`, `.section-number` — section formatting
  - `.card`, `.card-header`, `.card-body` — thẻ thông tin
  - `.chip` với 10 màu: green, blue, amber, purple, red, cyan, indigo, pink, teal, dark
  - `.tpl-card` — template card với hover effect (translateY, shadow)
  - `.spec-table` — bảng thông số kỹ thuật
  - `.code-block` — code block dark theme
  - `.info-box` với 5 biến thể màu
  - `.zone-diagram`, `.zone-cell` — zone layout diagrams với màu theo zone type
  - `.grid-2`, `.grid-3`, `.grid-4`, `.grid-5`, `.grid-auto` — responsive grids
  - `.theme-swatch` — color swatch cho visual themes (width:100%, height:80px, border-radius)
  - `.stat-card` — thẻ thống kê với số lớn
  - `.flow-row`, `.flow-node`, `.flow-arrow` — flow diagrams
  - `.scroll-demo` — live scroll behavior demo
  - `.comparison-grid` — so sánh side-by-side
  - `.rule-card` — quy chuẩn đồ họa
  - Print styles
  - Responsive breakpoints (1100px, 900px)
- Design phải cực đẹp: gradient tinh tế, shadow mềm, border-radius mềm mại, hover transitions smooth

#### PHẦN 2: Header (~30 dòng HTML)
- Gradient background: `linear-gradient(135deg, #0a1628 0%, #0c2d48 30%, #1565c0 70%, #1e88e5 100%)`
- Decorative circles (radial-gradient pseudo-elements)
- Title: "Module Layout Template Design System v4.0"
- Subtitle mô tả: "Tài liệu thiết kế toàn diện — 150+ preset templates bao phủ 34 modules, 90 block types, 20 visual themes. Template là trung tâm quyết định đồ họa toàn bộ phần mềm."
- Meta badges: `HESEM MOM Platform`, `v4.0 Enterprise`, `2026-04-10`, `150+ Templates`, `12 Nhóm module`, `8 Zone Types`, `90 Block Types`, `20 Visual Themes`, `34 Modules`

#### PHẦN 3: Table of Contents — sticky nav
Links đến tất cả sections:
- Tổng quan, Kiến trúc, Quy chuẩn, Visual Themes, Bảng điều khiển, Bán hàng, Kỹ thuật, Mua hàng, Sản xuất, Chất lượng, Kho vận, Tài chính, Nhân sự, Tài liệu, Quản trị, Block Engine, Component Presets, Module Editor, Zone System, Scroll UX, Token Cascade, Governance

#### PHẦN 4: Executive Summary (~100 dòng HTML)
- 8 stat-cards trong grid hiển thị: 150+ Templates, 34 Modules, 90 Block Types, 12 Nhóm, 20 Visual Themes, 8 Zone Types, 181 CSS Tokens, 139 Components
- Info box giải thích: Template là gì, tại sao là trung tâm, cách hoạt động
- So sánh Before/After (comparison-grid): Trước (8 tab rời rạc, không có template) vs Sau (6 tab graphics-control-plane; template là một authority artifact, không phải browser authority)

#### PHẦN 5: Kiến trúc hệ thống (~150 dòng HTML)
- **Token Cascade** — 5 lớp: System CSS → Admin Config → Template Override → Zone Override → User Preference
  - Mỗi lớp là 1 arch-layer với màu khác nhau, mô tả chi tiết
- **Template-Module binding**: Mọi module PHẢI có templateId, không cho phép unlink
- **Tab System mới** — 6 tabs:
  1. **Mẫu bố cục** (Template Studio) — CORE, tab đầu tiên
     - Gallery: 150+ preset, wireframe SVG, search bar, category filter, sort
     - Template Detail: live preview, zone diagram, thuộc tính, modules sử dụng
     - Template Editor: split pane — controls + live preview
     - Template Creator: chọn preset → tùy chỉnh zones → đặt tên → lưu
  2. **Token hệ thống** (System Tokens) — Serves template
     - Typography, Colors, Spacing, Radius, Layout
  3. **Thành phần** (Components) — Serves template
     - 19 component types với slider/color picker
  4. **Hiệu ứng** (Effects) — Serves template
     - Motion, Focus, Selection, Scrollbar, Backdrop, Skeleton
  5. **Tổng hợp** (Governance) — Tracking
     - Template usage report, compliance matrix, WCAG checker
  6. **Nâng cao** (Advanced) — Expert
     - Import/Export, Custom CSS, WCAG AA check
- Bảng spec-table chi tiết cho 6 tabs

#### PHẦN 6: Quy chuẩn đồ họa (Graphics Standards) (~200 dòng HTML) — MỚI HOÀN TOÀN
Đây là phần QUAN TRỌNG chưa có trong v3. Viết chi tiết:

**6.1 Hệ thống lưới (Grid System)**
- Base-8 spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80px
- 12-column grid layout
- Responsive breakpoints: sm(640), md(768), lg(1024), xl(1280), 2xl(1536)
- Gutter widths per breakpoint
- Minh họa bằng diagram

**6.2 Typography Scale**
- 8 cấp: xs(11px), sm(13px), base(14px), md(16px), lg(18px), xl(20px), 2xl(24px), 3xl(32px)
- 3 line-height: tight(1.25), normal(1.5), relaxed(1.75)
- Font weights: 400(normal), 500(medium), 600(semibold), 700(bold)
- Quy tắc sử dụng: hero numbers → 3xl bold mono, KPI values → 2xl bold mono, page title → xl bold, section → md semibold, body → base normal, caption → xs, table header → xs uppercase tracking-wider
- Bảng spec-table minh họa

**6.3 Color Theory**
- Brand palette: Primary (#1565c0), Dark (#0c2d48), Accent (#f9a825)
- Semantic colors: Success (#16a34a), Error (#dc2626), Warning (#d97706), Info (#2563eb), Purple (#7c3aed), Cyan (#0891b2)
- Surface hierarchy: Page → Surface → Surface Alt → Header → Modal
- Background opacity quy tắc: status bg dùng 8-12% opacity (rgba(color, 0.08-0.12))
- Status badge pattern: `bg-{color}/10 text-{color} border-{color}/30`
- Dark mode color mapping table
- Color swatches minh họa

**6.4 Contrast & Accessibility (WCAG AA)**
- Minimum contrast ratio: 4.5:1 cho text thường, 3:1 cho text lớn (>=18px bold)
- Bảng contrast check cho các cặp màu phổ biến
- Focus ring: 3px, offset 0, color rgba(21,101,192,0.12)
- Không dùng color alone để truyền đạt thông tin

**6.5 Spacing Rules**
- Component internal: 8px (gap nhỏ), 12px (gap trung bình), 16px (gap lớn)
- Section spacing: 24px giữa sections
- Page padding: 24px (mobile), 32px (tablet), 48px (desktop)
- Card padding: 16-20px
- Table cell: 8-12px vertical, 12px horizontal
- Bảng quy tắc spacing cho từng context

**6.6 Elevation & Shadow**
- 5 cấp shadow: xs, sm, md, lg, xl
- Giá trị CSS cụ thể cho mỗi cấp
- Quy tắc sử dụng: cards → sm, dropdowns → md, modals → lg, popovers → xl
- Backdrop blur: 0-16px

**6.7 Border & Radius**
- Border width: 1px default, 2px focus/active
- Border style: solid default, dashed cho placeholder/empty
- Radius scale: sm(4px), md(6px), lg(8px), xl(12px), 2xl(16px), full(9999px)
- Quy tắc: controls → md, cards → lg, modals → xl, badges → full

**6.8 Motion & Animation**
- 4 tốc độ: fast(100ms), normal(150ms), slow(250ms), spring(300ms)
- Easing: ease-out cho enter, ease-in cho exit
- Reduced motion: `prefers-reduced-motion: reduce` → tắt hết animation
- Quy tắc: hover → fast, expand/collapse → normal, page transition → slow

**6.9 Icon Standards**
- 3 kích thước: sm(14px), md(16px), lg(20px)
- Leading icon (kèm text): scale 1.12x, edge-trim 2px
- Icon-only: scale 1.4x, inset 2px
- Style: outline (lucide-react style), stroke-width 2px
- Spacing: icon-to-text gap 6px

**6.10 Data Display Rules**
- IDs/codes: font-mono, text-primary color (ví dụ: NCR-2026-1204)
- Numbers/metrics: font-mono, right-aligned trong tables
- Currency: format theo locale, right-aligned
- Dates: format dd/MM/yyyy hoặc relative ("2 giờ trước")
- Status: Badge component với semantic colors, text-[10px] uppercase
- Percentage: với progress bar visual kèm số

#### PHẦN 7: 20 Visual Theme Presets (~250 dòng HTML) — MỚI HOÀN TOÀN
Mỗi theme preset hiển thị dưới dạng card với:
- Tên theme (vi + en)
- Color swatch bar (5 ô màu: brand, surface, text, accent, status)
- Mô tả use case
- CSS variables chính (5-8 biến)

**20 themes:**
1. **Chuyên nghiệp Sáng** (Professional Light) — Mặc định. Brand navy #0c2d48, surface #ffffff, clean corporate
2. **Chuyên nghiệp Tối** (Professional Dark) — Surface #1e293b, text #f1f5f9, navy accent
3. **Nửa đêm** (Midnight Navy) — Deep navy #0f172a, teal accent #0891b2, dành cho ca đêm
4. **Đại dương** (Ocean Breeze) — Brand #0369a1, surface #f0f9ff, blue-cyan palette, tươi mát
5. **Rừng xanh** (Forest Calm) — Brand #166534, surface #f0fdf4, green palette, bình yên
6. **Bình minh** (Sunrise Warm) — Brand #9a3412, accent #f59e0b, surface #fffbeb, ấm áp
7. **Hoàng hôn** (Sunset Ember) — Brand #7c2d12, surface #fef2f2, deep orange-red, mạnh mẽ
8. **Bắc Cực** (Arctic Snow) — Brand #1e3a5f, surface #f8fafc, high contrast, sạch sẽ
9. **Hoa Anh Đào** (Cherry Blossom) — Brand #9d174d, accent #f9a8d4, surface #fdf2f8, nữ tính
10. **Oải hương** (Lavender Dream) — Brand #6d28d9, surface #faf5ff, purple palette, sáng tạo
11. **Thép công nghiệp** (Industrial Steel) — Brand #374151, surface #f3f4f6, gray palette, khô khan chuyên nghiệp
12. **Tín hiệu xưởng** (Shopfloor Signal) — High contrast, brand #dc2626/#16a34a/#d97706, dành cho màn hình xưởng, font lớn
13. **Kính điều hành** (Executive Glass) — Frosted glass effect, backdrop-filter blur, subtle gradients, sang trọng
14. **Giấy tuân thủ** (Compliance Paper) — Neutral beige #fafaf9, serif hints, document-like, dành cho audit/compliance
15. **Tập trung** (Focus Mode) — Minimal, brand #18181b, 2 màu chính, ẩn mọi decoration
16. **Năng lượng** (Vibrant Energy) — Brand #7c3aed, accent #06b6d4, gradient backgrounds, sinh động
17. **Pastel mềm** (Soft Pastel) — Brand #6366f1, surfaces pastel, shadows nhẹ, dịu dàng
18. **Đất** (Earth Tone) — Brand #78350f, surface #fefce8, warm browns, organic
19. **Neon** (Neon Pulse) — Dark bg #09090b, neon green #22c55e, cyan #06b6d4, tech/gaming vibe
20. **Thiền** (Zen Minimal) — Brand #737373, surface #fafafa, minimal decoration, maximum whitespace

Mỗi theme card có:
```html
<div class="card" style="...">
  <div class="card-header">1. Chuyên nghiệp Sáng / Professional Light</div>
  <div class="card-body">
    <div style="display:flex;gap:4px;height:40px;border-radius:8px;overflow:hidden;margin-bottom:10px">
      <div style="flex:2;background:#0c2d48"></div>
      <div style="flex:2;background:#1565c0"></div>
      <div style="flex:3;background:#ffffff;border:1px solid #e2e8f0"></div>
      <div style="flex:1;background:#f9a825"></div>
      <div style="flex:1;background:#16a34a"></div>
    </div>
    <div style="font-size:11px;color:var(--text-secondary);line-height:1.6">
      Mặc định cho môi trường văn phòng. Tương phản cao, dễ đọc. Phù hợp ISO documentation.
    </div>
    <div style="margin-top:8px;font-size:10px;font-family:var(--mono);color:var(--text-tertiary)">
      --brand:#0c2d48 --brand-2:#1565c0 --bg-page:#f8fafc --bg-surface:#ffffff --accent:#f9a825
    </div>
  </div>
</div>
```

Hiển thị trong grid-4 (4 cột).

### Kết thúc file
Đóng `</body></html>` — KHÔNG viết thêm phần nào khác. Các phần tiếp theo sẽ được nối vào bởi Prompt 2, 3, 4.

### Lưu ý quan trọng
- File phải render đẹp khi mở trong browser
- Responsive — đẹp trên cả desktop và tablet
- Tiếng Việt CÓ DẤU ở mọi nơi hiển thị cho user
- CSS phải tinh tế, chuyên nghiệp, không sơ sài
- Tổng dung lượng phần này khoảng 800-1200 dòng HTML

---

## PROMPT 2/6: Template Catalog — Nhóm 1-6 (Tổng quan → Chất lượng) ~80 templates

### Mục tiêu
Viết phần Template Catalog cho 6 nhóm module đầu tiên, chèn vào file `mom/docs/module-layout-template-design-system-v4.html` (sau phần Visual Theme Presets, trước `</body>`).

### Context dự án
HESEM MOM — phần mềm quản lý sản xuất CNC precision machining. File này là tài liệu thiết kế v4.0 cho hệ thống Module Layout Template. Phần trước (Prompt 1) đã tạo CSS, header, kiến trúc, quy chuẩn đồ họa, và 20 visual themes.

### Hệ thống 34 modules
Sidebar navigation gồm 12 nhóm:
1. TỔNG QUAN: Bảng điều khiển, Từ điển dữ liệu
2. BÁN HÀNG: Bán hàng & Báo giá
3. KỸ THUẬT: Kỹ thuật & NPI
4. MUA HÀNG: Mua hàng & PO, Chất lượng NCC
5. SẢN XUẤT: Lịch sản xuất, Cài đặt máy, Lệnh sản xuất, Chấm công, Giám sát thiết bị, Bảo trì
6. CHẤT LƯỢNG: IQC/IPQC/FQC, SPC Analytics, MSA Analysis, CAPA, NCR, Hiệu chuẩn
7. KHO VẬN: Quản lý kho, Quản lý dụng cụ, Giao hàng
8. TÀI CHÍNH: Kế toán, Hồ sơ công việc
9. NHÂN SỰ: HR, Ca làm việc, Chấm công, Lương, Đào tạo, Cổng thông tin
10. TÀI LIỆU: Quản lý tài liệu, Quản lý thay đổi, Đánh giá nội bộ, Quản lý rủi ro
11. QUẢN TRỊ: Bảo mật, Quản trị hệ thống

### Zone Types (8 loại)
| Zone | Scroll | Sticky | Blocks cho phép |
|------|--------|--------|-----------------|
| header | Không | Có | page-header, hero-banner |
| kpi-bar | Không | Có | kpi-row, stat-callout |
| filter | Không | Có | filter-bar, nav-tabs |
| main | Data only | Không | TẤT CẢ data/chart/form |
| sidebar | Data only | Không | data-list, chart-*, summary |
| footer | Không | Có | action-toolbar, pagination |
| tabs | Không | Có | nav-tabs, tab-bar |
| chart-area | Không | Không | chart-* only |

### Yêu cầu cho mỗi template card
```html
<div class="tpl-card">
  <div class="tpl-thumb">
    <svg viewBox="0 0 200 118" xmlns="http://www.w3.org/2000/svg">
      <!-- SVG wireframe chi tiết, đẹp, professional -->
      <!-- Dùng các CSS class: .wb (background), .wh (header zone), .wk (kpi zone), 
           .wm (main zone), .ws (sidebar zone), .wfl (filter zone), .wft (footer zone),
           .wt/.wta (table rows alternate), .wr (red/alert), .wg (green), 
           .wa (amber), .wbl (blue), .wp (purple), .win (indigo) -->
    </svg>
  </div>
  <div class="tpl-info">
    <div class="tpl-name">T01 Bảng điều khiển tổng hợp</div>
    <div class="tpl-desc">KPI hero + biểu đồ + sidebar tóm tắt + bảng dữ liệu. Dành cho CEO/Giám đốc.</div>
    <div class="tpl-chips">
      <span class="chip chip-blue">5 zones</span>
      <span class="chip chip-green">comfortable</span>
    </div>
  </div>
</div>
```

### CSS classes cho SVG wireframe fill colors (đã định nghĩa trong Prompt 1 CSS)
```css
.wb{fill:#f8fafc} .wh{fill:rgba(21,101,192,.1)} .wk{fill:rgba(249,168,37,.12)}
.wm{fill:rgba(22,163,74,.06)} .ws{fill:rgba(124,58,237,.06)} .wfl{fill:rgba(8,145,178,.06)}
.wft{fill:rgba(100,116,139,.05)} .wt{fill:rgba(0,0,0,.025)} .wta{fill:rgba(0,0,0,.04)}
.wr{fill:rgba(220,38,38,.06)} .wg{fill:rgba(22,163,74,.1)} .wa{fill:rgba(217,119,6,.08)}
.wbl{fill:rgba(37,99,235,.08)} .wp{fill:rgba(124,58,237,.1)} .win{fill:rgba(79,70,229,.06)}
```

### 6 NHÓM — DANH SÁCH TEMPLATES CHI TIẾT

---

#### NHÓM 1: TỔNG QUAN / OVERVIEW (12 templates)
Category header: `<span class="chip chip-blue cat-chip">TỔNG QUAN</span>`
Mô tả: "Màn hình tổng quan, điều hành, giám sát, dashboard"

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Density | Layout |
|----|----------|----------|-------|-------|---------|--------|
| T01 | Bảng điều khiển tổng hợp | Executive Dashboard | KPI hero 4-6 thẻ + biểu đồ xu hướng + sidebar tóm tắt + bảng dữ liệu. CEO/Giám đốc | 5 | comfortable | header + kpi-bar + filter + main(2/3) + sidebar(1/3) + footer |
| T02 | Giám sát vận hành | Operations Monitor | KPI realtime + lưới trạng thái máy + cảnh báo. Giám sát sàn sản xuất | 6 | dense | header + kpi-bar(4) + main(grid 2x2 status cards) + footer |
| T03 | Trung tâm phân tích | Analytics Hub | Lưới đa biểu đồ + bộ lọc thời gian. Phân tích đa chiều | 5 | comfortable | header + filter + main(grid 2x2 charts) |
| T04 | Trung tâm chỉ số | KPI Center | KPI focus 4 thẻ lớn + bảng chi tiết bên dưới | 4 | default | header + kpi-bar(4 large) + main(table) + footer |
| T05 | Tổng kết ca | Shift Summary | Sản lượng ca + chất lượng + ghi chú bàn giao | 4 | default | header + main(2-col: production + quality) + main(notes) |
| T06 | Bảng năng lượng | Energy Dashboard | Giám sát năng lượng + xu hướng tiêu thụ + cảnh báo | 5 | comfortable | header + main(chart large) + sidebar(kpi + alerts) |
| T07 | Tổng quan điều phối | Dispatch Overview | Trạng thái JO/WO + hàng đợi điều phối | 4 | default | header + kpi-bar(3) + main(grid 3-col cards) + main(queue table) |
| T08 | Dashboard phòng ban | Department Dashboard | KPI phòng ban + tiến độ công việc + nhân sự | 5 | comfortable | header + kpi-bar(4) + main(2/3 charts) + sidebar(1/3 team list) |
| T09 | Cockpit quản lý | Management Cockpit | Bảng điểm đa module + compliance + tài chính | 6 | comfortable | header + kpi-bar(6) + tabs + main(multi-section scorecard) |
| T10 | Tổng quan IoT | IoT Overview | Sensor overview + machine map + alert feed | 5 | default | header + filter + main(sensor grid) + sidebar(alert feed) |
| T11 | Dashboard an toàn | Safety Dashboard | Chỉ số HSE + sự cố + đào tạo an toàn | 5 | comfortable | header + kpi-bar(4: incidents, near-miss, training, days-safe) + main(chart + table) |
| T12 | Bảng Lean Manufacturing | Lean Board | 5S scores + kaizen tracker + waste reduction | 4 | default | header + kpi-bar(5S scores) + main(2-col: kaizen board + metrics) |

Mỗi template SVG phải khác nhau, thể hiện đúng layout mô tả. Grid sử dụng `.grid-4`.

---

#### NHÓM 2: BÁN HÀNG & CRM / SALES (8 templates)
Category header: `<span class="chip chip-cyan cat-chip">BÁN HÀNG & CRM</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T13 | Danh sách đơn hàng | Sales Order List | Bảng SO + bộ lọc + pagination. CRUD cơ bản | 4 | header + filter + main(table) + footer(pagination) |
| T14 | Chi tiết đơn hàng | Order Detail | Thông tin SO + items + timeline + sidebar metadata | 5 | header + tabs + main(form sections) + sidebar(metadata + timeline) |
| T15 | Bảng theo dõi đơn hàng | Order Tracking Board | Pipeline stages: Lead → Qualified → Proposal → Won | 4 | header + filter + main(pipeline funnel + kanban) |
| T16 | Lịch giao hàng | Delivery Schedule | Calendar view + Gantt timeline + job list | 4 | header + tabs(calendar/gantt/list) + main + footer |
| T17 | Cổng khách hàng | Customer Order Portal | Khách hàng xem trạng thái đơn + tài liệu | 4 | header(hero) + filter + main(order cards) + footer |
| T18 | Phân tích đơn hàng | Order Analytics | Doanh thu trend + backlog + OTD analysis | 5 | header + kpi-bar(4) + main(charts 2x2) + footer |
| T19 | Trình tạo báo giá | Quotation Wizard | Multi-step wizard: Info → Items → Pricing → Review | 5 | header + stepper + main(form) + sidebar(summary) + footer(actions) |
| T20 | Quản lý hợp đồng | Contract Management | Bảng hợp đồng + chi tiết + renewal tracking | 5 | header + filter + main(table) + sidebar(detail panel) |

---

#### NHÓM 3: KỸ THUẬT / ENGINEERING (8 templates)
Category header: `<span class="chip chip-indigo cat-chip">KỸ THUẬT & NPI</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T21 | Danh mục chi tiết | Part Master | Bảng part master + click row → BOM + Routing | 5 | header + filter + main(table) + sidebar(selected part detail) |
| T22 | Cấu trúc sản phẩm | BOM Explorer | Tree BOM + component detail + where-used | 5 | header + sidebar(tree nav) + main(BOM table + detail) |
| T23 | Phiếu quy trình | Routing Sheet | Operation sequence + work centers + tooling | 4 | header + filter + main(routing table) + footer |
| T24 | Quản lý CAM | CAM Program Manager | Chương trình CNC + G-code + version tracking | 5 | header + filter + main(program table) + sidebar(code preview) |
| T25 | Yêu cầu thay đổi | ECR/ECN Manager | Change requests + approval flow + impact | 5 | header + filter + main(ECR table) + sidebar(approval timeline) |
| T26 | Thiết kế sản phẩm mới | NPI Dashboard | New product pipeline + milestone tracking | 5 | header + kpi-bar(3) + main(pipeline kanban) + footer |
| T27 | Bản vẽ kỹ thuật | Drawing Viewer | Document tree + drawing preview + markup | 5 | header + sidebar(tree) + main(viewer canvas) + footer(tools) |
| T28 | So sánh phiên bản | Revision Compare | Side-by-side BOM/routing comparison | 4 | header + main(split-pane comparison) + footer |

---

#### NHÓM 4: MUA HÀNG / PURCHASING (8 templates)
Category header: `<span class="chip chip-amber cat-chip">MUA HÀNG & CUNG ỨNG</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T29 | Danh sách đặt mua | Purchase Order List | PO table + status filter + supplier filter | 4 | header + filter + main(table) + footer(pagination) |
| T30 | Tạo đơn mua hàng | PO Creation Wizard | Wizard: Supplier → Items → Terms → Review | 5 | header + stepper + main(form) + sidebar(running total) + footer |
| T31 | Bảng điểm NCC | Supplier Scorecard | Supplier performance: quality, delivery, price | 5 | header + kpi-bar(4) + main(chart + table) + sidebar(rating detail) |
| T32 | Cổng nhà cung cấp | Supplier Portal | NCC xem PO + gửi hóa đơn + cập nhật giao hàng | 4 | header + filter + main(PO cards) + footer |
| T33 | So sánh RFQ | RFQ Comparison | Side-by-side supplier quotes comparison | 4 | header + main(comparison table with highlight) + footer |
| T34 | Phân tích mua hàng | Procurement Analytics | Spend analysis + supplier breakdown + trends | 5 | header + kpi-bar(4) + main(charts) + footer |
| T35 | Dashboard mua hàng | Procurement Dashboard | PR pending + PO open + receiving status | 5 | header + kpi-bar(5) + tabs(PR/PO/Suppliers) + main(table) |
| T36 | Nhập hàng | Goods Receipt | Receiving form + inspection + put-away | 4 | header + main(form: PO items + qty check + location) + footer |

---

#### NHÓM 5: SẢN XUẤT / PRODUCTION (15 templates)
Category header: `<span class="chip chip-green cat-chip">SẢN XUẤT & MES</span>`
Mô tả: "Operator, máy CNC, điều phối, OEE, lịch sản xuất"

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Density | Layout |
|----|----------|----------|-------|-------|---------|--------|
| T37 | Trung tâm điều khiển MES | MES Control Center | Machine status grid + job queue + alerts | 5 | dense | header + kpi-bar(3: Running/Setup/Down) + main(machine grid) + footer |
| T38 | Giao diện thợ máy | Operator Mobile | Mobile-first, nút lớn, touch-friendly | 3 | comfortable | header(large) + main(current job card + action buttons) |
| T39 | Biểu đồ Gantt sản xuất | Gantt Schedule | Machine × Date × Shift Gantt chart | 4 | dense | header + filter(date range) + main(gantt: left=machines, right=timeline) |
| T40 | Lưới trạng thái máy | Machine Status Grid | Machine tiles với OEE + downtime detail | 5 | default | header + kpi-bar(4: OEE/Running/Uptime/PM) + main(machine cards grid) |
| T41 | Bảng Andon | Andon Board | Hiển thị cảnh báo lớn, dành cho TV xưởng | 2 | comfortable | header(alert banner large) + main(status grid large font) |
| T42 | Dashboard OEE | OEE Dashboard | OEE metrics + Availability/Performance/Quality breakdown | 4 | default | header + kpi-bar(3: A/P/Q) + main(OEE trend chart + table) |
| T43 | Chi tiết lệnh sản xuất | Work Order Detail | WO info + operations + materials + quality | 5 | default | header + tabs(info/ops/materials/quality) + main(form) + sidebar(status flow) |
| T44 | Trình tạo quy trình | Routing Builder | Drag-drop operation sequence builder | 5 | default | header + sidebar(operation library) + main(routing canvas) + footer(save) |
| T45 | Cây BOM sản xuất | BOM Production View | BOM tree + availability check + shortage alerts | 5 | default | header + sidebar(BOM tree) + main(component detail + availability) |
| T46 | Điều phối công việc | Job Dispatch Queue | Priority queue + machine assignment + scheduling | 5 | dense | header + filter + main(dispatch table sortable) + sidebar(machine list) + footer |
| T47 | Theo dõi sản xuất | Production Timeline | Timeline view of job progress + milestones | 4 | default | header + filter + main(vertical timeline) + footer |
| T48 | Hồ sơ lô | Batch Record | Batch traveler: materials + process + tests + sign-off | 5 | default | header + tabs + main(multi-section form) + sidebar(batch summary) |
| T49 | Theo dõi lao động | Labor Tracking | Time entry + operator assignment + efficiency | 4 | default | header + filter + main(timesheet table) + footer |
| T50 | Phân tích ngừng máy | Downtime Analysis | Downtime categories + Pareto + trend | 5 | default | header + kpi-bar(MTBF/MTTR) + main(pareto + trend charts) + footer |
| T51 | Ca làm việc | Shift Management | Weekly schedule grid + shift definitions + handover | 4 | default | header + tabs(schedule/definitions/handover) + main(grid/form) |

---

#### NHÓM 6: CHẤT LƯỢNG / QUALITY (14 templates)
Category header: `<span class="chip chip-red cat-chip">CHẤT LƯỢNG & eQMS</span>`
Mô tả: "NCR, CAPA, SPC, FMEA, kiểm tra, đánh giá, hiệu chuẩn"

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Density | Layout |
|----|----------|----------|-------|-------|---------|--------|
| T52 | Dashboard ngoại lệ | Exception Dashboard | NCR/CAPA summary + exception trend + category breakdown | 5 | default | header + kpi-bar(4: Open NCR/Critical/Avg Resolution/Scrap Cost) + main(charts 2x1) + footer |
| T53 | Phiếu NCR/CAPA | NCR/CAPA Form | Exception entry form + corrective action + 8D steps | 5 | default | header + stepper(8D) + main(form sections) + sidebar(related items) + footer |
| T54 | Biểu đồ kiểm soát SPC | SPC Control Chart | X-bar, R chart, Histogram, Run chart + process capability | 5 | default | header + filter(process selector) + tabs(X-bar/R/Histogram/Run) + main(chart) + sidebar(Cpk summary) |
| T55 | Ma trận FMEA | FMEA Risk Matrix | S×O×D matrix + RPN ranking + mitigation | 4 | dense | header + filter + main(FMEA table S/O/D/RPN) + footer |
| T56 | Phiếu kiểm tra | Inspection Form | FAI/IQC/IPQC/FQC/OQC inspection record | 5 | default | header + tabs(IQC/IPQC/FQC/OQC/MSA) + main(inspection table) + footer |
| T57 | Báo cáo 8D | 8D Report Wizard | 8-discipline problem solving wizard | 5 | default | header + stepper(8 steps) + main(step form) + sidebar(team + timeline) + footer |
| T58 | Kế hoạch đánh giá | Audit Plan | Audit schedule + findings + follow-up | 5 | default | header + kpi-bar(4) + main(stacked bar + table) + sidebar(finding detail) |
| T59 | Quản lý hiệu chuẩn | Calibration Manager | Instrument register + calibration schedule + status | 5 | default | header + filter(status + type) + kpi-bar(4) + main(instrument table) + footer |
| T60 | Phòng thí nghiệm | Quality Test Lab | Test orders + results entry + report generation | 5 | default | header + tabs(orders/results/reports) + main(table/form) + sidebar |
| T61 | Năng lực quy trình | Process Capability | Cpk/Ppk analysis + capability matrix + trending | 5 | default | header + filter + main(capability bar chart) + sidebar(threshold legend) |
| T62 | Kiểm soát đầu vào | Incoming Quality Control | IQC lot inspection + supplier quality trend | 5 | default | header + kpi-bar(3) + main(lot table) + sidebar(supplier trend) |
| T63 | Theo dõi hành động | Corrective Action Tracker | CAPA pipeline + overdue alerts + effectiveness | 5 | default | header + filter + main(CAPA table with progress bars) + footer |
| T64 | Ma trận rủi ro | Risk Assessment Matrix | 5×5 risk matrix + risk register + mitigation plan | 5 | default | header + main(2/3: risk scatter chart + matrix grid) + sidebar(1/3: register) |
| T65 | MSA/GR&R | MSA Analysis | Gauge R&R study + operator comparison + trending | 5 | default | header + tabs(Studies/GR&R/Operator/Trending) + main(chart + table) |

### Format output
Viết dưới dạng HTML sections, mỗi nhóm module là 1 section:
```html
<section class="section" id="cat-overview">
  <div class="cat-header">
    <span class="chip chip-blue cat-chip">TỔNG QUAN</span>
    <span class="cat-desc">Màn hình tổng quan, điều hành, giám sát</span>
    <span class="cat-count">12 templates</span>
  </div>
  <div class="grid-4" style="margin-bottom:32px">
    <!-- 12 tpl-card items -->
  </div>
</section>
```

### Lưu ý
- SVG wireframe phải chi tiết, mỗi template phải KHÁC NHAU rõ ràng
- Mô tả tiếng Việt CÓ DẤU
- Mỗi template card phải có chips cho zones count và density
- Tổng cộng phần này: ~80 templates

---

## PROMPT 3/6: Template Catalog — Nhóm 7-12 (Kho → Admin) + Cross-module ~70 templates

### Mục tiêu
Viết phần Template Catalog cho 6 nhóm module còn lại + 10 cross-module templates, chèn tiếp sau phần từ Prompt 2.

### Context
Giống Prompt 2 — cùng file HTML, cùng CSS classes, cùng SVG wireframe format.

### DANH SÁCH TEMPLATES CHI TIẾT

---

#### NHÓM 7: KHO VẬN / WAREHOUSE (10 templates)
Category: `<span class="chip chip-teal cat-chip">KHO VẬN & LOGISTICS</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T66 | Dashboard kho | Inventory Dashboard | Tổng quan tồn kho + SKU + alerts + warehouse zones | 5 | header + kpi-bar(4) + main(donut + bar chart) + sidebar(warehouse zones) |
| T67 | Lưới tồn kho | Stock Level Grid | Bảng vật tư + search + status (ok/low/critical) | 4 | header + filter + main(material register table) + footer |
| T68 | Bản đồ kho | Warehouse Map | Visual warehouse layout + bin locations + heat map | 4 | header + filter + main(warehouse visual map) |
| T69 | Phiếu nhập kho | Receiving Form | Nhập hàng theo PO + kiểm tra số lượng + put-away | 4 | header + main(form: PO lookup + items + location) + footer |
| T70 | Kiểm kê | Cycle Count | Cycle count schedule + variance report | 4 | header + filter + main(count sheet table) + footer |
| T71 | Danh mục vật tư | Material Master | Material register + specs + suppliers + history | 5 | header + filter + main(table) + sidebar(material detail) |
| T72 | Nhật ký xuất nhập | Movement Log | Inventory transactions timeline + filter | 4 | header + filter + main(timeline log) + footer |
| T73 | Hoạch định Min/Max | Min/Max Planning | Reorder point analysis + safety stock calculation | 4 | header + filter + main(planning table) + footer |
| T74 | Truy xuất lô | Lot Traceability | Lot genealogy tree + forward/backward trace | 5 | header + filter + sidebar(lot tree) + main(trace detail) |
| T75 | Quản lý dụng cụ | Tool Crib | Tool inventory + life tracking + checkout/return | 5 | header + kpi-bar(3) + main(tool table with life bars) + sidebar(checkout log) |

---

#### NHÓM 8: GIAO HÀNG / SHIPPING (4 templates)
Category: `<span class="chip chip-teal cat-chip">GIAO HÀNG</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T76 | Danh sách giao hàng | Shipment List | Shipment table + status pipeline + documents | 4 | header + filter + main(table) + footer |
| T77 | Lập phiếu giao | Shipping Wizard | Pack list creation + weight + carrier selection | 5 | header + stepper + main(form) + sidebar(package summary) + footer |
| T78 | Theo dõi vận chuyển | Delivery Tracking | Tracking timeline + carrier status + proof of delivery | 4 | header + main(tracking timeline + map placeholder) + footer |
| T79 | Lịch giao hàng | Delivery Calendar | Calendar view + scheduled vs actual delivery | 4 | header + filter + main(calendar grid) + footer |

---

#### NHÓM 9: TÀI CHÍNH / FINANCE (6 templates)
Category: `<span class="chip chip-amber cat-chip">TÀI CHÍNH & KẾ TOÁN</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T80 | Dashboard tài chính | Finance Dashboard | Doanh thu + chi phí + lợi nhuận + AR/AP | 5 | header + kpi-bar(4) + main(bar + pie charts) + sidebar(recent txns) |
| T81 | Sổ cái công việc | Job Costing | Cost breakdown by job: material + labor + overhead | 5 | header + filter + main(job cost table) + sidebar(cost waterfall chart) |
| T82 | Hóa đơn & Thanh toán | Invoice Management | AR/AP aging + invoice table + payment status | 4 | header + kpi-bar(3: overdue/pending/paid) + main(table) + footer |
| T83 | Hồ sơ công việc | Job Evidence | Job folder: drawings + inspection + certifications | 5 | header + sidebar(job tree) + main(document list + preview) |
| T84 | Báo cáo chi phí chất lượng | COPQ Report | Cost of Poor Quality analysis + Pareto + trend | 5 | header + kpi-bar(3) + main(pareto + trend charts) + footer |
| T85 | Bảng lương | Payroll Summary | Bảng lương tổng hợp + phân tích chi phí nhân sự | 4 | header + kpi-bar(4) + main(payroll table) + footer |

---

#### NHÓM 10: NHÂN SỰ / HR (10 templates)
Category: `<span class="chip chip-pink cat-chip">NHÂN SỰ & ĐÀO TẠO</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T86 | Danh bạ nhân viên | Employee Directory | Bảng NV + click → detail panel với avatar, KPI, phép | 5 | header + filter + main(table) + sidebar(employee detail card) |
| T87 | Quản lý nghỉ phép | Leave Management | Bảng đơn phép + approve/reject + calendar view | 4 | header + tabs(requests/calendar) + main(table/calendar) + footer |
| T88 | Đánh giá KPI | KPI Evaluation | Bảng KPI nhân viên + target vs actual + leaderboard | 5 | header + kpi-bar(3) + main(KPI table) + sidebar(top performers) |
| T89 | Quản lý đào tạo | Training Records | Khóa đào tạo + enrollment + progress tracking | 5 | header + tabs(courses/matrix/sessions) + main + footer |
| T90 | Ma trận năng lực | Competency Matrix | Heatmap: nhân viên × kỹ năng × mức độ | 4 | header + filter + main(heatmap grid color-coded) |
| T91 | Bảng chấm công | Attendance Sheet | Bảng chấm công tháng + thống kê | 4 | header + filter(month) + main(attendance grid) + footer |
| T92 | Ca làm việc | Shift Schedule | Lịch ca tuần + machine assignment + handover | 4 | header + tabs(weekly/definitions) + main(schedule grid) |
| T93 | Thông tin lương | Salary Info | Phiếu lương cá nhân + deductions + net pay | 4 | header + main(payslip form) + footer |
| T94 | Thông báo công ty | Announcements | Feed thông báo + pin + priority + likes/comments | 4 | header + main(announcement feed cards) + sidebar(quick links) |
| T95 | Cổng thông tin | Company Portal | Portal tổng hợp: announcements + policies + calendar | 5 | header(hero banner) + main(3-col: news + policies + calendar) |

---

#### NHÓM 11: TÀI LIỆU & TUÂN THỦ / DOCUMENTS (10 templates)
Category: `<span class="chip chip-purple cat-chip">TÀI LIỆU & TUÂN THỦ</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T96 | Duyệt tài liệu | Document Browser | Tree nav + document list + preview pane (3-panel) | 5 | header + sidebar(tree) + main(list) + sidebar-right(preview) |
| T97 | Xem báo cáo | Report Viewer | Toolbar + rendered report content + export | 4 | header + filter(toolbar) + main(report canvas) |
| T98 | Nhật ký sự kiện | Timeline Log | Audit trail + event detail + filter by type | 4 | header + filter + main(vertical timeline) |
| T99 | Kho bằng chứng | Evidence Vault | Evidence list + file preview + compliance tags | 5 | header + filter + main(evidence table) + sidebar(file preview) |
| T100 | So sánh phiên bản | Version Compare | Side-by-side document version comparison | 4 | header + main(split-pane diff view) + footer |
| T101 | Trình soạn SOP | SOP Editor | Rich text editor + template structure + approval | 5 | header + sidebar(outline) + main(rich editor) + footer(actions) |
| T102 | Quản lý thay đổi | Change Control | ECR/ECN table + impact analysis + approval flow | 5 | header + filter + main(change request table) + sidebar(approval workflow) |
| T103 | Đánh giá nội bộ | Audit Management | Audit schedule + findings + scoring | 5 | header + kpi-bar(4) + main(stacked bar + table) + sidebar(finding detail) |
| T104 | Quản lý rủi ro | Risk Management | 5×5 risk matrix + FMEA register + mitigation | 5 | header + main(scatter chart + matrix grid) + sidebar(risk register) |
| T105 | Hồ sơ đào tạo tuân thủ | Compliance Training | Training completion matrix + certification tracking | 4 | header + filter + main(compliance matrix) + footer |

---

#### NHÓM 12: QUẢN TRỊ HỆ THỐNG / ADMIN (8 templates)
Category: `<span class="chip chip-dark cat-chip">QUẢN TRỊ HỆ THỐNG</span>`

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T106 | Bảng cấu hình | Config Panel | Settings groups accordion + save/reset | 3 | header + main(settings accordion sections) |
| T107 | Quản lý người dùng | User Management | User table + role assignment + permissions | 4 | header + filter + main(user table) + footer |
| T108 | Ma trận phân quyền | Permission Matrix | Roles × Modules matrix + CRUD toggles | 4 | header + main(scrollable matrix with sticky first column) |
| T109 | Sơ đồ tổ chức | Org Chart | Expandable tree org chart + department badges | 4 | header + main(recursive tree diagram) |
| T110 | Hiển thị module | Module Visibility | Toggle on/off modules per role | 4 | header + main(module toggle grid grouped by section) |
| T111 | Trung tâm bảo mật | Security Center | Login logs + session management + 2FA settings | 5 | header + kpi-bar(3) + tabs(logs/sessions/settings) + main(table) |
| T112 | Schema Studio | Schema Studio | Schema editor + field inspector + relation map | 5 | header + sidebar(table list) + main(field editor) + sidebar-right(inspector) |
| T113 | Giám sát hệ thống | System Health | Server status + API response times + error rates | 5 | header + kpi-bar(4) + main(charts: CPU/RAM/API latency) + footer |

---

#### CROSS-MODULE: Mẫu chung (10 templates)
Category: `<span class="chip chip-dark cat-chip">MẪU CHUNG ĐA MODULE</span>`
Mô tả: "Các mẫu bố cục dùng chung cho nhiều module khác nhau"

| ID | Tên (vi) | Tên (en) | Mô tả | Zones | Layout |
|----|----------|----------|-------|-------|--------|
| T114 | Bảng danh sách | Generic List Report | Filter + sortable table + pagination. Mẫu CRUD cơ bản nhất | 4 | header + filter + main(table) + footer |
| T115 | Chi tiết bản ghi | Generic Record Detail | Full record view + sidebar metadata | 4 | header + main(detail form) + sidebar(metadata) |
| T116 | Lưới thẻ | Generic Card Grid | Responsive card grid + filter + sort | 4 | header + filter + main(card grid) |
| T117 | Biểu mẫu wizard | Generic Form Wizard | Multi-step form + progress stepper | 5 | header + stepper + main(step form) + footer(back/next) |
| T118 | Bảng Kanban | Generic Kanban Board | Drag-drop columns + card detail | 4 | header + filter + main(kanban columns) |
| T119 | Biểu đồ Gantt | Generic Gantt Chart | Resource × time Gantt + zoom + drag resize | 4 | header + filter + main(gantt: left resources + right timeline) |
| T120 | Master-Detail | Generic Master-Detail | List panel + detail panel click-to-view | 5 | header + sidebar(list panel) + main(detail panel) |
| T121 | Trống / Empty | Empty State Template | Beautiful empty state with illustration + CTA | 2 | header + main(centered empty state) |
| T122 | Dashboard trống | Blank Dashboard | Customizable grid + add widget buttons | 3 | header + main(grid with + buttons) |
| T123 | Trang in | Print Layout | Print-optimized layout + header/footer | 3 | header(print) + main(content) + footer(page number) |

### Tổng: 123 templates (Nhóm 7-12: 48 + Cross: 10 + Nhóm 1-6 từ Prompt 2: 65 = 123 total)

### Lưu ý
- Mọi template phải có SVG wireframe chi tiết
- Mô tả tiếng Việt CÓ DẤU
- Grid layout: dùng `.grid-4` cho nhóm có 4+ templates, `.grid-5` cho nhóm có 5, `.grid-3` cho nhóm nhỏ

---

## PROMPT 4/6: Block Engine + Component Presets + Module Editor + Zone System + Governance

### Mục tiêu
Viết phần cuối của tài liệu thiết kế: Block Engine (90 block types), Component Preset Library, Module Editor Tools, Zone System, Smart Scroll, Token Cascade, và Governance. Chèn sau phần Template Catalog.

### Context
HESEM MOM — phần mềm quản lý sản xuất. File `mom/docs/module-layout-template-design-system-v4.html`. Các phần trước đã viết: CSS, Header, Kiến trúc, Quy chuẩn, Visual Themes, 123 Templates.

### PHẦN A: Block Engine — 90 Block Types (~400 dòng HTML)

Tổ chức thành 12 categories. Mỗi block type hiển thị trong bảng spec-table với cột: Block Type (code), Tên (vi), Mô tả, Zones cho phép, Config chính.

**Dữ liệu mẫu phải THỰC TẾ**, ví dụ:
- data-table: Hiển thị bảng với header "Mã SO | Khách hàng | Part Number | Số lượng | Ngày giao | Trạng thái"
- kpi-row: Hiển thị "OTD: 98.7% ▲2.1% | Backlog: $1.2M | Active JOs: 342 | Scrap Rate: 0.8%"
- chart-bar: Hiển thị "Doanh thu theo tháng T1-T6 2026"

#### Category 1: Layout Blocks (8)
`page-header`, `hero-banner`, `section-divider`, `two-column`, `three-column`, `card-container`, `tab-container`, `accordion`

#### Category 2: Data Display Blocks (12)
`data-table`, `data-cards`, `data-list`, `master-detail`, `data-tree`, `pivot-table`, `kanban-board`, `data-timeline`, `data-grid-editable`, `virtual-scroll-list`, `grouped-table`, `frozen-column-table`

#### Category 3: Form Blocks (10)
`form-standard`, `form-wizard`, `form-modal`, `inline-edit`, `field-group`, `file-upload`, `signature-pad`, `date-range-picker`, `rich-text-editor`, `formula-builder`

#### Category 4: Chart Blocks (12)
`chart-line`, `chart-bar`, `chart-pie`, `chart-donut`, `chart-area`, `chart-scatter`, `chart-radar`, `chart-gauge`, `chart-waterfall`, `chart-heatmap`, `chart-treemap`, `chart-sankey`

#### Category 5: Action Blocks (6)
`action-toolbar`, `fab-menu`, `context-menu`, `bulk-action-bar`, `approval-buttons`, `export-bar`

#### Category 6: Quality Blocks (8)
`spc-control-chart`, `pareto-chart`, `fishbone-diagram`, `fmea-grid`, `inspection-checklist`, `audit-finding-card`, `risk-matrix-5x5`, `gage-rr`

#### Category 7: Manufacturing Blocks (8)
`oee-gauge`, `andon-signal`, `gantt-row`, `bom-tree`, `routing-flow`, `machine-status-tile`, `batch-traveler`, `work-instruction-viewer`

#### Category 8: IoT Blocks (6)
`sensor-card`, `trend-sparkline`, `alarm-list`, `plc-tag-monitor`, `digital-twin-view`, `environmental-gauge`

#### Category 9: Insight Blocks (6)
`kpi-row`, `stat-callout`, `comparison-bar`, `target-vs-actual`, `trend-indicator`, `anomaly-alert`

#### Category 10: Navigation Blocks (6)
`nav-tabs`, `nav-pills`, `nav-breadcrumb`, `nav-sidebar-tree`, `nav-pagination`, `nav-stepper`

#### Category 11: Media Blocks (4)
`image-gallery`, `video-player`, `document-preview`, `model-3d-viewer`

#### Category 12: Automation Blocks (4)
`workflow-diagram`, `rule-builder`, `notification-center`, `scheduler-calendar`

**Format mỗi category:**
```html
<div class="card" style="margin-bottom:16px">
  <div class="card-header"><span class="chip chip-blue" style="margin-right:8px">LAYOUT</span> 8 block types</div>
  <div class="card-body" style="padding:0">
    <table class="spec-table">
      <thead><tr><th>Block Type</th><th>Tên tiếng Việt</th><th>Mô tả</th><th>Zones</th><th>Config chính</th></tr></thead>
      <tbody>
        <tr>
          <td><code>page-header</code></td>
          <td>Tiêu đề trang</td>
          <td>Title + subtitle + action buttons + breadcrumb</td>
          <td>header</td>
          <td>title, subtitle, actions[], breadcrumb[]</td>
        </tr>
        <!-- ... -->
      </tbody>
    </table>
  </div>
</div>
```

### PHẦN B: Component Preset Library (~200 dòng HTML)

30 component preset sets — mỗi preset là 1 bộ cấu hình sẵn cho 1 use case. Hiển thị trong grid-3 dưới dạng card.

**30 Component Presets:**

| # | Tên Preset (vi) | Mô tả | Components ảnh hưởng |
|---|-----------------|-------|---------------------|
| 1 | Nút bấm gọn (Compact Buttons) | Padding nhỏ, font 11px, border-width 1px | Button |
| 2 | Nút bấm thoải mái (Spacious Buttons) | Padding lớn, font 14px, min-width 120px | Button |
| 3 | Bảng dày đặc (Dense Table) | Row height 32px, cell padding 4px 8px | Table |
| 4 | Bảng thoải mái (Relaxed Table) | Row height 48px, cell padding 12px 16px | Table |
| 5 | Thẻ phẳng (Flat Cards) | Shadow none, border 1px, radius 8px | Card |
| 6 | Thẻ nổi (Elevated Cards) | Shadow md, border none, radius 12px | Card |
| 7 | Badge tối giản (Minimal Badges) | Border none, bg opacity 8%, font 10px | Badge |
| 8 | Badge viền (Outlined Badges) | Border 1px, bg transparent, font 10px | Badge |
| 9 | Input phẳng (Flat Inputs) | Border-bottom only, radius 0, bg transparent | Input |
| 10 | Input bo tròn (Rounded Inputs) | Radius 20px, border 1.5px, bg surface | Input |
| 11 | Tab gạch chân (Underline Tabs) | Border-bottom active, no bg, no radius | Tab |
| 12 | Tab viên thuốc (Pill Tabs) | Radius full, bg active, no border | Tab |
| 13 | KPI nhỏ gọn (Compact KPI) | Value font 18px, padding 10px | KPI Card |
| 14 | KPI anh hùng (Hero KPI) | Value font 32px, padding 24px, icon large | KPI Card |
| 15 | Modal nhỏ (Small Modal) | max-width 480px, padding 16px | Modal |
| 16 | Modal lớn (Large Modal) | max-width 960px, padding 24px | Modal |
| 17 | Progress mỏng (Thin Progress) | Height 4px, radius 2px | Progress |
| 18 | Progress dày (Thick Progress) | Height 12px, radius 6px, show percentage | Progress |
| 19 | Filter gọn (Compact Filter) | Height 28px, gap 4px, font 11px | Filter Bar |
| 20 | Filter rộng (Wide Filter) | Height 40px, gap 12px, font 14px | Filter Bar |
| 21 | Tooltip đen (Dark Tooltip) | Bg #1e293b, text white, radius 6px | Tooltip |
| 22 | Tooltip sáng (Light Tooltip) | Bg white, border, shadow md, radius 8px | Tooltip |
| 23 | Navigation gọn (Compact Nav) | Item height 32px, icon 14px, font 12px | Navigation |
| 24 | Navigation rộng (Wide Nav) | Item height 44px, icon 20px, font 14px | Navigation |
| 25 | Form chặt (Tight Form) | Field gap 12px, group gap 16px | Form Field |
| 26 | Form thoáng (Airy Form) | Field gap 20px, group gap 32px | Form Field |
| 27 | Pagination đơn giản (Simple Pagination) | Numbers only, no icons | Pagination |
| 28 | Pagination đầy đủ (Full Pagination) | First/last + numbers + per-page selector | Pagination |
| 29 | Xưởng sản xuất (Shop Floor) | Touch targets 48px+, font 16px+, high contrast | ALL components |
| 30 | Văn phòng điều hành (Executive Office) | Elegant spacing, subtle shadows, serif accents | ALL components |

### PHẦN C: Module Editor Tools (~200 dòng HTML)

Mô tả đặc tả kỹ thuật cho các công cụ chỉnh sửa module:

**C.1 Template Gallery** (trong admin)
- Search bar: tìm theo tên, category, zone count
- Category filter: 12 radio buttons
- Sort: theo tên, ngày tạo, số module sử dụng
- View mode: grid (card) hoặc list (table)

**C.2 Template Editor** (split pane)
- Left panel (40%): Zone Configurator
  - Danh sách zones: drag reorder, add/remove
  - Zone properties: type, height, scroll behavior, allowed blocks
  - Token overrides per zone: font-size, spacing, colors
  - Block restrictions: whitelist/blacklist block types
- Right panel (60%): Live Preview
  - Render template với mock data
  - Responsive preview: desktop / tablet / mobile
  - Theme preview: switch giữa 20 visual themes
  - Dark/light toggle

**C.3 Module Builder Integration**
- Step 0 (BẮT BUỘC): Chọn template preset → tùy chỉnh → lưu
- Step 1: Đặt tên module, icon, route
- Step 2: Thêm tabs + blocks vào zones
- Step 3: Cấu hình data sources
- Step 4: Phân quyền
- Step 5: Review + Publish

**C.4 Shape & Layout Controls**
- Zone resize: drag border để thay đổi tỷ lệ (vd: main 2/3 → sidebar 1/3)
- Zone snap: snap to grid 8px
- Zone presets: Full width, 2-column (50/50, 60/40, 70/30), 3-column, sidebar-left, sidebar-right
- Background controls: solid color, gradient, image, pattern
- Border controls: width, style, color, radius per corner
- Shadow controls: 5 presets + custom
- Spacing controls: margin + padding visual editor (box model diagram)

**C.5 Block Drag-Drop**
- Block palette: grouped by category
- Drag from palette → drop into zone
- Zone validates allowed blocks (reject invalid with error message)
- Block reorder within zone: drag up/down
- Block config: click to open properties panel

### PHẦN D: Zone System (~150 dòng HTML)
Giống v3 nhưng mở rộng:
- 8 zone types với bảng chi tiết
- Zone diagram ví dụ cho 6 layout patterns khác nhau
- Zone override rules
- Zone responsive behavior per breakpoint

### PHẦN E: Smart Scroll UX (~100 dòng HTML)
- 4 quy tắc scroll (giống v3)
- CSS code mẫu cho overlay scrollbar
- Live demo interactive
- Mobile scroll behavior

### PHẦN F: Token Cascade (~100 dòng HTML)
- 5 lớp cascade với diagram
- Override priority rules
- Merge strategy
- localStorage keys, chỉ cho user preference / preview cache / unsaved draft cache; không làm production authority

### PHẦN G: Governance & Roadmap (~100 dòng HTML)
- Operating model
- Compliance matrix
- Release gates
- Implementation phases (Phase 1-4 timeline)

### Kết thúc file
Đóng `</section></body></html>`

---

## PROMPT 5/6: Mã nguồn — Viết lại 00c-admin-appearance.js với Template Studio

### Mục tiêu
Viết lại hoàn toàn file `mom/scripts/portal/00c-admin-appearance.js` (~2500 dòng) — chuyển từ 8-tab system sang 6-tab Template-centric system.

### Context kỹ thuật

**File cần viết lại**: `mom/scripts/portal/00c-admin-appearance.js`
**Hiện tại**: 1893 dòng, IIFE, 8 tabs (overview/typography/colors/layout/effects/components/governance/advanced)
**Mục tiêu**: 6 tabs mới, Template Studio là Tab 1

**Cách file được load**:
- `02-state-auth-ui.js` gọi `renderAdminAppearance()` tại dòng 6529
- Load dynamic via `<script>` tag: `scripts/portal/00c-admin-appearance.js?v=ADMIN_RUNTIME_ASSET_VERSION`
- Kiểm tra version: `window._renderAdminAppearanceFullVersion === expectedVersion`
- Entry point: `window._renderAdminAppearanceFull(el, _appSubTab, lang)`

**Global variables có sẵn**:
- `lang` — 'vi' hoặc 'en'
- `_appSubTab` — subtab hiện tại (var trong 02-state-auth-ui.js)
- `renderAdminAppearance()` — function refresh UI
- `showToast(msg, type)` — toast notification
- `HmTheme` — Theme Manager object (00b-theme-manager.js)
  - `.init()`, `.set(key, val)`, `.setDeep(path, val)`, `.get(key)`, `.getDeep(path)`
  - `.getAll()`, `.getAdminConfig()`, `.getFullConfig()`, `.saveAdminConfig(cfg, callback)`
  - `.setVar(cssVar, value)` — set CSS var on :root
  - `.reset()`, `.contrastRatio(fg, bg)`, `.exportTheme()`, `.importTheme(json)`

**Helper functions CẦN GIỮ NGUYÊN** (copy từ file hiện tại):
- `T(key)` — i18n lookup (cần mở rộng thêm keys mới)
- `L(vi, en)` — inline i18n
- `esc(v)` — HTML escape
- `cfg(path)` — get config value
- `cfgNum(path, def)` — get numeric config
- `window._hmSet(cssVar, path, value)` — set CSS var + persist
- `window._hmSetWithUnit(cssVar, path, value, unit)` — set with unit
- `slider(label, cssVar, path, min, max, def, unit, step)` — slider control
- `colorPick(label, cssVar, path, def)` — color picker
- `textInput(label, cssVar, path, def, placeholder)` — text input
- `fontSelect(label, cssVar, path, def, isMono)` — font dropdown
- `radioRow(name, options, current, onChange)` — radio group
- `sect(title, content, open, badges)` — collapsible section
- `statusChip(kind, label)` — status chip
- `infoCard(title, body, kind)` — info card
- `sectionLead(title, body, chips)` — section header
- `FONT_OPTIONS`, `MONO_OPTIONS` — font lists

**Preview functions CẦN GIỮ NGUYÊN** (copy từ file hiện tại):
Tất cả `preview*()` functions: `previewBox()`, `previewButtons()`, `previewInputs()`, `previewBadges()`, `previewTableDensity()`, `previewDensityControls()`, `previewRadiusScale()`, `previewSpacingScale()`, `previewLayoutDimensions()`, `previewAdminLayoutTemplate()`, `previewTypographyFamily()`, `previewFontScale()`, `previewLineHeight()`, `previewLabelTransform()`, `previewBrandColors()`, `previewStatusColors()`, `previewSurfaceStack()`, `previewTextColors()`, `previewBorderColors()`, `previewMotion()`, `previewFocus()`, `previewSelection()`, `previewCaret()`, `previewPlaceholder()`, `previewDisabled()`, `previewScrollbar()`, `previewBackdrop()`, `previewTooltip()`, `previewDropdown()`, `previewNav()`, `previewPagination()`, `previewProgress()`, `previewEmpty()`, `previewField()`, `previewBreadcrumb()`

### Cấu trúc file mới

```javascript
(function(){
'use strict';

// ═══ PHẦN 1: I18N (mở rộng T() với keys mới cho templates) ═══
// Thêm keys: templates, tokens, templateStudio, searchTemplate, filterCategory, 
// allCategories, zoneCount, density, noTemplate, editTemplate, cloneTemplate, 
// deleteTemplate, createTemplate, templateUsage, modulesUsing, zoneConfig, ...

// ═══ PHẦN 2: UTILITIES (giữ nguyên) ═══
// esc(), cfg(), cfgNum(), _hmSet, _hmSetWithUnit

// ═══ PHẦN 3: UI HELPERS (giữ nguyên) ═══
// slider(), colorPick(), textInput(), fontSelect(), radioRow(), sect()
// statusChip(), infoCard(), sectionLead()

// ═══ PHẦN 4: TEMPLATE PRESETS DATA ═══
// 123 template definitions — compact format:
var TEMPLATE_PRESETS = [
  {
    id: 'T01',
    name: { vi: 'Bảng điều khiển tổng hợp', en: 'Executive Dashboard' },
    desc: { vi: 'KPI hero + biểu đồ + sidebar tóm tắt. Dành cho CEO/Giám đốc.', en: 'KPI hero + chart + sidebar summary. CEO/Director view.' },
    category: 'overview',
    zones: ['header','kpi-bar','filter','main','sidebar','footer'],
    zoneLayout: { gridCols: '2fr 1fr', gridRows: 'auto auto auto 1fr auto' },
    density: 'comfortable',
    modules: ['M1-dashboard'],
    svg: '<svg viewBox="0 0 200 118">...</svg>'
  },
  // ... 122 more
];

var TEMPLATE_CATEGORIES = [
  { key: 'overview', label: { vi: 'Tổng quan', en: 'Overview' }, icon: '📊', color: 'blue', count: 12 },
  { key: 'sales', label: { vi: 'Bán hàng', en: 'Sales' }, icon: '💰', color: 'cyan', count: 8 },
  { key: 'engineering', label: { vi: 'Kỹ thuật', en: 'Engineering' }, icon: '⚙️', color: 'indigo', count: 8 },
  { key: 'purchasing', label: { vi: 'Mua hàng', en: 'Purchasing' }, icon: '🛒', color: 'amber', count: 8 },
  { key: 'production', label: { vi: 'Sản xuất', en: 'Production' }, icon: '🏭', color: 'green', count: 15 },
  { key: 'quality', label: { vi: 'Chất lượng', en: 'Quality' }, icon: '✅', color: 'red', count: 14 },
  { key: 'warehouse', label: { vi: 'Kho vận', en: 'Warehouse' }, icon: '📦', color: 'teal', count: 14 },
  { key: 'finance', label: { vi: 'Tài chính', en: 'Finance' }, icon: '💵', color: 'amber', count: 6 },
  { key: 'hr', label: { vi: 'Nhân sự', en: 'HR' }, icon: '👥', color: 'pink', count: 10 },
  { key: 'document', label: { vi: 'Tài liệu', en: 'Documents' }, icon: '📄', color: 'purple', count: 10 },
  { key: 'admin', label: { vi: 'Quản trị', en: 'Admin' }, icon: '🔧', color: 'dark', count: 8 },
  { key: 'generic', label: { vi: 'Mẫu chung', en: 'Generic' }, icon: '📐', color: 'dark', count: 10 }
];

// ═══ PHẦN 5: VISUAL THEME PRESETS DATA ═══
var VISUAL_THEMES = [
  { id: 'professional-light', name: { vi: 'Chuyên nghiệp Sáng', en: 'Professional Light' },
    colors: { brand: '#0c2d48', brand2: '#1565c0', bgPage: '#f8fafc', bgSurface: '#ffffff', accent: '#f9a825' },
    desc: { vi: 'Mặc định. Tương phản cao, dễ đọc.', en: 'Default. High contrast, easy to read.' }
  },
  // ... 19 more themes
];

// ═══ PHẦN 6: TEMPLATE STORAGE ═══
var _templateSearch = '';
var _templateCategory = 'all';
var _templateSort = 'name';
var _selectedTemplate = null;
var _templateView = 'gallery'; // 'gallery' | 'detail' | 'editor'

function getTemplates() { ... } // filter + sort
function getModuleTemplateBinding() { ... } // legacy note only; production binding must load from backend graphics authority

// ═══ PHẦN 7: TAB 1 — TEMPLATE STUDIO ═══
function renderTemplates() {
  // 7.1 Gallery view: search bar + category filter + sort + template cards grid
  // 7.2 Detail view: selected template info + zone diagram + modules using
  // 7.3 Editor view: zone configurator + live preview placeholder
}

function renderTemplateGallery() { ... }
function renderTemplateDetail(tplId) { ... }
function renderTemplateEditor(tplId) { ... }
function renderTemplateSvg(tpl) { ... } // render SVG from template data

// ═══ PHẦN 8: TAB 2 — TOKEN HỆ THỐNG (merged typography + colors + layout) ═══
function renderTokens() {
  // Sections: Typography, Colors, Spacing, Radius, Layout Dimensions
  // Reuse existing: renderTypography() content + renderColors() content + renderLayout() content
}

// ═══ PHẦN 9: TAB 3 — THÀNH PHẦN (giữ nguyên renderComponents) ═══

// ═══ PHẦN 10: TAB 4 — HIỆU ỨNG (giữ nguyên renderEffects) ═══

// ═══ PHẦN 11: TAB 5 — TỔNG HỢP (enhanced governance) ═══
function renderGovernance() {
  // Template usage report
  // Compliance matrix
  // WCAG contrast checker
  // Visual theme manager (apply/preview themes)
}

// ═══ PHẦN 12: TAB 6 — NÂNG CAO (enhanced advanced) ═══
function renderAdvanced() {
  // Import/Export theme + templates JSON
  // Custom CSS injection
  // WCAG AA check
  // Core standard enforcement
}

// ═══ PHẦN 13: MAIN RENDER ═══
function render(el, subTab, currentLang) {
  var tabs = [
    { key: 'templates', icon: '📐', label: T('templates') },
    { key: 'tokens', icon: '🎨', label: T('tokens') },
    { key: 'components', icon: '🧱', label: T('components') },
    { key: 'effects', icon: '✨', label: T('effects') },
    { key: 'governance', icon: '🛡️', label: T('governance') },
    { key: 'advanced', icon: '🧩', label: T('advanced') }
  ];
  // ... render tab bar + content
}

// ═══ PHẦN 14: PREVIEW FUNCTIONS (giữ nguyên tất cả) ═══

// ═══ PHẦN 15: EXPOSE ═══
window._renderAdminAppearanceFullVersion = '20260410e';
window._renderAdminAppearanceFull = render;

})();
```

### Yêu cầu UI cho Template Gallery

**Search bar** (sticky top):
```html
<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;position:sticky;top:0;z-index:10;background:var(--bg-surface);padding:8px 0">
  <input type="text" placeholder="Tìm kiếm template..." value="..." 
    oninput="_templateSearch=this.value;renderAdminAppearance()"
    style="flex:1;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px">
  <select onchange="_templateCategory=this.value;renderAdminAppearance()" 
    style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:12px">
    <option value="all">Tất cả nhóm</option>
    <!-- 12 categories -->
  </select>
  <select onchange="_templateSort=this.value;renderAdminAppearance()" 
    style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:12px">
    <option value="name">Theo tên</option>
    <option value="zones">Theo zones</option>
    <option value="category">Theo nhóm</option>
  </select>
</div>
```

**Template card** (trong gallery grid):
```html
<div style="border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;transition:all .2s"
  onclick="_selectedTemplate='T01';_templateView='detail';renderAdminAppearance()"
  onmouseover="this.style.borderColor='var(--brand-2)';this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-lg)'"
  onmouseout="this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow=''">
  <div style="aspect-ratio:16/10;background:var(--bg-surface-alt);padding:8px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--border)">
    <!-- SVG wireframe -->
  </div>
  <div style="padding:8px 10px">
    <div style="font-size:11px;font-weight:700">T01 Bảng điều khiển tổng hợp</div>
    <div style="font-size:10px;color:var(--text-secondary);margin-top:2px">KPI hero + biểu đồ + sidebar</div>
    <div style="margin-top:4px;display:flex;gap:3px">
      <span style="...chip styles...">5 zones</span>
      <span style="...chip styles...">comfortable</span>
    </div>
  </div>
</div>
```

Grid: `display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px`

### Lưu ý quan trọng
- Version string: `'20260410e'`
- Tab key 'templates' là mặc định (thay vì 'overview')
- Cập nhật `_appSubTab` default trong `02-state-auth-ui.js` từ 'overview' sang 'templates'
- SVG wireframes cho 123 templates — dùng compact inline SVG
- Tiếng Việt CÓ DẤU trong T() translations
- File khoảng 2500-3000 dòng

---

## PROMPT 6/6: Mã nguồn — Cập nhật theme-manager, block-engine, module-router, CSS

### Mục tiêu
Cập nhật các file hỗ trợ để tích hợp với Template System mới.

### File 1: `mom/scripts/portal/00b-theme-manager.js`

**Thêm vào cuối** (trước `})()`):
```javascript
// ═══ LEGACY TEMPLATE PREVIEW CACHE ONLY — NOT PRODUCTION AUTHORITY ═══
var TEMPLATE_STORAGE_KEY = 'hesem_layout_templates'; // forbidden legacy authority key; bridge/migrate only

HmTheme.getTemplates = function() {
  // Historical snippet only. Current code must call backend graphics governance services.
  try { var raw = localStorage.getItem(TEMPLATE_STORAGE_KEY); return raw ? JSON.parse(raw) : {}; }
  catch(e) { return {}; }
};

HmTheme.saveTemplate = function(templateId, config) {
  var templates = HmTheme.getTemplates();
  templates[templateId] = config;
  try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates)); } catch(e){}
};

HmTheme.deleteTemplate = function(templateId) {
  var templates = HmTheme.getTemplates();
  delete templates[templateId];
  try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates)); } catch(e){}
};

HmTheme.resolveWithTemplate = function(templateId) {
  // Resolve cascade: System → Admin → Template → User
  var base = HmTheme.getFullConfig();
  var templates = HmTheme.getTemplates();
  var tpl = templates[templateId];
  if (!tpl || !tpl.tokenOverrides) return base;
  // Deep merge template overrides into base
  return _deepMerge(base, tpl.tokenOverrides);
};

// ═══ VISUAL THEME PRESETS ═══
HmTheme.applyVisualTheme = function(themeId) {
  var themes = {
    'professional-light': { brand: '#0c2d48', brand2: '#1565c0', bgPage: '#f8fafc', bgSurface: '#ffffff', accent: '#f9a825', colorMode: 'light' },
    'professional-dark': { brand: '#0c2d48', brand2: '#60a5fa', bgPage: '#0f172a', bgSurface: '#1e293b', accent: '#f9a825', colorMode: 'dark' },
    'midnight-navy': { brand: '#0f172a', brand2: '#0891b2', bgPage: '#020617', bgSurface: '#0f172a', accent: '#22d3ee', colorMode: 'dark' },
    'ocean-breeze': { brand: '#0369a1', brand2: '#0ea5e9', bgPage: '#f0f9ff', bgSurface: '#ffffff', accent: '#06b6d4', colorMode: 'light' },
    'forest-calm': { brand: '#166534', brand2: '#22c55e', bgPage: '#f0fdf4', bgSurface: '#ffffff', accent: '#84cc16', colorMode: 'light' },
    // ... 15 more themes
  };
  var theme = themes[themeId];
  if (!theme) return;
  if (theme.brand) HmTheme.setVar('--brand', theme.brand);
  if (theme.brand2) HmTheme.setVar('--brand-2', theme.brand2);
  if (theme.bgPage) HmTheme.setVar('--bg-page', theme.bgPage);
  if (theme.bgSurface) HmTheme.setVar('--bg-surface', theme.bgSurface);
  if (theme.accent) HmTheme.setVar('--accent', theme.accent);
  if (theme.colorMode) HmTheme.set('colorMode', theme.colorMode);
  HmTheme.setDeep('visualTheme', themeId);
};
```

### File 2: `mom/scripts/portal/02-state-auth-ui.js`

**Thay đổi dòng 6488**:
```javascript
// Trước:
var _appSubTab = 'overview';
// Sau:
var _appSubTab = 'templates';
```

### File 3: `mom/styles/portal.main.css`

**Thêm vào cuối file** — CSS classes cho Template Gallery:
```css
/* ═══ TEMPLATE GALLERY ═══ */
.tpl-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.tpl-gallery-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 8px);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-surface, #fff);
}
.tpl-gallery-card:hover {
  border-color: var(--brand-2);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,.1));
}
.tpl-gallery-thumb {
  aspect-ratio: 16/10;
  background: var(--bg-surface-alt, #f1f5f9);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}
.tpl-gallery-info {
  padding: 8px 10px;
}
.tpl-gallery-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
.tpl-gallery-desc {
  font-size: 10px;
  color: var(--text-secondary, #64748b);
  margin-top: 2px;
  line-height: 1.4;
}
.tpl-gallery-chips {
  margin-top: 4px;
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.tpl-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* ═══ TEMPLATE DETAIL ═══ */
.tpl-detail-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.tpl-detail-preview {
  width: 280px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 8px);
  overflow: hidden;
  background: var(--bg-surface-alt, #f1f5f9);
  padding: 12px;
}
.tpl-detail-meta {
  flex: 1;
  min-width: 0;
}

/* ═══ ZONE DIAGRAM ═══ */
.zone-config-grid {
  display: grid;
  gap: 3px;
  padding: 10px;
  background: var(--bg-surface-alt, #f1f5f9);
  border-radius: var(--radius-lg, 8px);
  border: 1px solid var(--border);
}
.zone-config-cell {
  background: var(--bg-surface, #fff);
  border: 2px dashed var(--border);
  border-radius: var(--radius-md, 6px);
  padding: 6px 8px;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  transition: all 0.15s;
}
.zone-config-cell:hover {
  border-color: var(--brand-2);
  background: rgba(21,101,192,0.03);
  color: var(--brand-2);
}

/* Zone type colors */
.zone-header { background: linear-gradient(135deg,rgba(21,101,192,.06),rgba(21,101,192,.02)); border-style: solid; border-color: rgba(21,101,192,.18); }
.zone-kpi { background: rgba(249,168,37,.05); border-color: rgba(249,168,37,.18); }
.zone-filter { background: rgba(8,145,178,.04); border-color: rgba(8,145,178,.12); }
.zone-main { background: rgba(22,163,74,.03); border-color: rgba(22,163,74,.12); min-height: 60px; }
.zone-sidebar { background: rgba(124,58,237,.03); border-color: rgba(124,58,237,.12); }
.zone-footer { background: rgba(100,116,139,.04); border-color: rgba(100,116,139,.15); }
.zone-tabs { background: rgba(79,70,229,.03); border-color: rgba(79,70,229,.12); }
.zone-chart { background: rgba(13,148,136,.03); border-color: rgba(13,148,136,.12); }

/* ═══ VISUAL THEME SWATCHES ═══ */
.theme-swatch-bar {
  display: flex;
  gap: 2px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.theme-swatch-bar > div {
  transition: flex 0.2s;
}
.theme-swatch-bar:hover > div:hover {
  flex: 3 !important;
}

/* ═══ SMART SCROLL ZONES ═══ */
.zone-scrollable {
  overflow-y: auto;
  scrollbar-width: none;
}
.zone-scrollable:hover {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.12) transparent;
}
.zone-scrollable::-webkit-scrollbar { width: 0; background: transparent; }
.zone-scrollable:hover::-webkit-scrollbar { width: 5px; }
.zone-scrollable:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 3px; }
```

### File 4: `mom/data/modules/M2-orders.json` và `mom/data/modules/M4-purchasing.json`

**Thêm field `templateId`** vào root level:
```json
{
  "moduleId": "M2-orders",
  "templateId": "T13",
  ...
}
```

### Lưu ý
- Không break bất kỳ chức năng hiện tại nào
- Tất cả thay đổi phải backward-compatible
- Tiếng Việt CÓ DẤU trong mọi label user-facing
- Test: sau khi áp dụng tất cả, mở Admin > Giao diện phải thấy Tab 1 là "Mẫu bố cục" với template gallery

---

## THỨ TỰ THỰC HIỆN

```
Prompt 1 ─┐
Prompt 2 ─┼─ Song song được (tạo HTML document)
Prompt 3 ─┘
           ↓
Prompt 4 ──── Sau 1+2+3 (hoàn thiện document)
           ↓
Prompt 5 ─┐
Prompt 6 ─┘── Song song được (mã nguồn JS/CSS)
```

## ƯỚC LƯỢNG KHỐI LƯỢNG

| Prompt | Output | Ước lượng dòng |
|--------|--------|---------------|
| 1 | HTML (CSS + Header + Architecture + Standards + Themes) | 800-1200 |
| 2 | HTML (Templates nhóm 1-6, ~80 templates) | 1000-1500 |
| 3 | HTML (Templates nhóm 7-12 + cross, ~70 templates) | 800-1200 |
| 4 | HTML (Blocks + Components + Editor + Zone + Governance) | 800-1000 |
| 5 | JavaScript (00c-admin-appearance.js rewrite) | 2500-3000 |
| 6 | JS + CSS + JSON (supporting files) | 400-600 |
| **Tổng** | | **6300-8500** |


---
---

# PHẦN 2: NÂNG CẤP v4.0 → v4.1 (Prompt 7-12)

> **Mục tiêu**: Trau chuốt đồ họa chuyên nghiệp, bổ sung chức năng còn thiếu
> **Thứ tự**: Prompt 7+8+9 chạy song song. Prompt 10 chạy trước. Prompt 11 chạy sau Prompt 10. Prompt 12 chạy cuối.


---

## QUY TẮC CHUNG

```
1. File cần chỉnh sửa: mom/docs/module-layout-template-design-system-v4.html (hiện 2109 dòng)
2. Tiếng Việt frontend PHẢI CÓ DẤU đầy đủ
3. Backend (code, key, variable) dùng tiếng Anh
4. Không xóa nội dung hiện tại — chỉ SỬA và THÊM
5. CSS phải đẹp cấp Vercel/Linear/Stripe: gradient tinh tế, micro-animations, smooth transitions
6. Dữ liệu mẫu thực tế: part numbers (AERO-BRK-2024), máy (DMG MORI NLX 2500), tên Việt (Nguyễn Văn Thành)
7. Sau khi chỉnh sửa xong, file phải render đẹp khi mở trong browser
```

---

## PROMPT 7/12: Reaudit CSS Foundation — Visual Polish v4.1

### Mục tiêu
Tái audit và nâng cấp shared CSS foundation của file `mom/docs/module-layout-template-design-system-v4.html` để nâng chất lượng thị giác từ mức “ổn” lên mức enterprise polished. Prompt này chỉ xử lý CSS nền tảng dùng chung: trạng thái tương tác, token scale, contrast, dark mode, reduced motion và print.

Prompt 7 phải an toàn để chạy song song với Prompt 8 và Prompt 9, nên chỉ được chạm vào CSS dùng chung, không được đụng tới SVG wireframes, mô tả template, tên section hay nội dung HTML.

### File
`mom/docs/module-layout-template-design-system-v4.html`

### Benchmark bắt buộc phải vận dụng
- **WCAG + MDN**: dùng `:focus-visible` đúng ngữ cảnh, focus indicator phải đủ nhìn thấy, tôn trọng `prefers-reduced-motion`, có `@media print` riêng.
- **Fluent 2 + Carbon**: states phải rõ `hover / active / pressed / selected / disabled`, không dùng một style chung cho mọi trạng thái.
- **Material 3 + Fluent + USWDS**: dark mode phải đi từ role tokens trước, sau đó mới selector overrides; không “invert màu” một cách mù quáng.
- **GOV.UK / USWDS**: spacing, radius, typography và print behavior phải nhất quán, ít tùy hứng, đọc tốt hơn là màu mè.

### Contract thực thi
1. Luôn đọc file hiện trạng trước khi sửa. **Nội dung file hiện tại là nguồn sự thật duy nhất.**
2. Không dùng line number làm contract. Dòng chỉ là tham khảo, vì file có thể đã thay đổi trước đó.
3. Chỉ được sửa **block `<style> ... </style>` đầu tiên** trong file.
4. Không được sửa HTML bên ngoài `<style>`.
5. Không được đổi class names, IDs, section order, text hiển thị, cấu trúc DOM, hoặc SVG markup.
6. Không được thêm CSS cho selector không tồn tại trong HTML hiện tại, trừ pseudo-classes/pseudo-elements của selector đã tồn tại.
7. Không được broad rewrite toàn bộ CSS. Chỉ refactor tối thiểu theo các anchors bên dưới.
8. Không được phá contract downstream của Prompt 8-12.

### Anchors được phép chạm tới
- `:root`
- `body`
- `.shell`
- `.doc-header`
- `.toc`, `.toc-inner`, `.toc a`
- `.section`, `.section-title`, `.section-number`
- `.card`, `.card-header`, `.card-body`
- `.stat-card`, `.stat-value`, `.stat-label`
- `.info-box`
- `.cat-header`, `.cat-count`, `.cat-chip`
- `.tpl-card`, `.tpl-thumb`, `.tpl-info`, `.tpl-meta`, `.tpl-chips`
- `.chip`
- `.spec-table`
- `.code-block`
- `.zone-diagram`
- `.flow-node`
- `.scroll-*`
- Existing `@media` rules

Nếu một anchor không tồn tại trong file hiện tại thì bỏ qua, không tự phát minh selector mới để “đủ checklist”.

### Các nhóm thay đổi bắt buộc

#### 1. Token normalization trong `:root`
Hoàn thiện bộ token nền tảng, giữ nguyên HESEM visual direction hiện có:
- Spacing scale theo nhịp **4px**: `4, 8, 12, 16, 20, 24, 32, 40, 48`
- Radius scale: `4, 6, 8, 12, 16, 20, 24`
- Shadow scale: `xs, sm, md, lg, xl`
- Motion tokens: `fast, normal, slow`
- Focus token: ring color + ring width + offset
- Nếu cần tách use case màu accent, ưu tiên token kiểu `--accent-fill` và `--accent-text` thay vì dùng một màu cho cả nền lẫn text
- Nếu cần text màu accent trên nền sáng, thêm token kiểu `--accent-ink` hoặc tương đương thay vì lạm dụng `--accent`

Không đổi palette thương hiệu HESEM một cách phá vỡ bản sắc. Chỉ tinh chỉnh semantic usage.

#### 2. Hover / active / pressed polish
Thêm hoặc cải thiện trạng thái cho các selector thực sự đang dùng:
- `.toc a`
- `.card`
- `.stat-card`
- `.chip`
- `.info-box`
- `.tpl-card`
- `.spec-table tr`

Yêu cầu:
- Không dùng `transition: all`
- Chỉ animate các properties cần thiết: `background-color`, `border-color`, `box-shadow`, `transform`, `color`
- Các hover-only refinements nên đặt trong `@media (hover: hover)` khi hợp lý để tránh hiệu ứng thừa trên thiết bị touch
- `active/pressed` chỉ áp khi selector đó có ý nghĩa tương tác thực tế
- Pressed/active nên giảm elevation, tăng state layer, hoặc trả transform về neutral; không làm animation “giật”

#### 3. Keyboard focus đúng ngữ cảnh
Chỉ thêm `:focus-visible` cho **phần tử focusable thật** đang có trong HTML hiện tại, ví dụ:
- `a`
- `button` nếu có
- `[tabindex]` nếu có
- `[role="button"]` nếu có

Không thêm `:focus-visible` cho `.tpl-card`, `.chip`, `.stat-card` nếu chúng chỉ là `div/span` không focusable.

Focus rules:
- Focus indicator phải đủ rõ trên nền sáng và tối
- Ưu tiên outline/ring solid, nhìn rõ, có contrast tốt với vùng kề bên
- Focus indicator nên hướng tới ngưỡng non-text contrast tối thiểu `3:1`
- Nếu dùng fallback cũ, có thể thêm `@supports not selector(:focus-visible)` nhưng không bắt buộc

#### 4. Contrast cleanup
Cải thiện readability thực tế thay vì sửa tượng trưng:
- Rà lại text nhỏ như `.tpl-meta`, text tertiary trên nền sáng, badge text, header phụ, table header
- Nếu text nhỏ đang quá mờ, tăng cỡ chữ hoặc nâng từ tertiary lên secondary khi cần
- Không dùng màu accent vàng làm text chính trên nền trắng
- Các cặp màu chạm tới phải hướng tới đọc tốt và phù hợp WCAG AA ở ngữ cảnh thực

#### 5. Spacing và radius consistency
Trong **các selector đã chạm tới**, chuẩn hóa các giá trị lẻ về scale 4px nơi hợp lý:
- padding/margin của header, TOC, cards, badges, tables, chips, section shells
- border-radius của các shared surfaces

Lưu ý:
- Không brute-force thay mọi số trong file
- Không đụng phần trăm, `clamp()`, gradient stops, SVG geometry, shadow blur radii nếu không cần
- “Base-8” ở đây được hiểu là nhịp 8 với sub-step 4px cho UI enterprise

#### 6. Dark mode — shared shell only
Thêm `@media (prefers-color-scheme: dark)` cho **shared shell**:
- `:root` token mapping
- `body`
- `.doc-header`
- `.toc`
- `.section`
- `.card`, `.card-header`
- `.stat-card`
- `.tpl-card`, `.tpl-thumb`
- `.spec-table th`
- `.code-block`
- `.wb` nếu cần để SVG wireframe không bị chìm

Quan trọng:
- Đây là **partial dark mode cho shared shell**, không claim full-file dark mode nếu file còn nhiều inline style hardcoded ngoài CSS shared
- Ưu tiên token overrides trước, selector overrides sau
- Mapping nên đi theo semantic roles như `surface / surface-alt / on-surface / outline / focus-ring / accent-fill / accent-text`, không vá từng component bằng hex rời rạc nếu có thể tránh

#### 7. Motion và reduced motion
Thêm micro-polish vừa đủ:
- Hover lift nhẹ cho cards nếu chưa đủ tốt
- Transition duration nhất quán qua motion tokens
- Có thể thêm animation load nhẹ cho surfaces nếu thật sự tiết chế

Nhưng bắt buộc:
- Phải có `@media (prefers-reduced-motion: reduce)`
- Trong reduced motion: tắt animation không cần thiết, tắt transform transitions, tắt smooth scrolling nếu cần
- Không mô tả “scroll-into-view” giả bằng CSS page-load animation
- Không animate đồng loạt mọi `.section` chỉ để tạo cảm giác “wow”; tài liệu enterprise ưu tiên ổn định hơn phô diễn

#### 8. Print stylesheet
Cải thiện `@media print` để tài liệu in sạch và chuyên nghiệp:
- Ẩn `.toc` và các interactive affordances không cần thiết
- Bỏ shadow, blur, hover transforms
- Giữ `.doc-header` in ra vẫn có brand color bằng `print-color-adjust`
- Cards, sections, template cards cần tránh vỡ trang xấu (`break-inside: avoid` khi hợp lý)
- Links in ra không bị xanh chói vô nghĩa
- Có thể thêm `@page` và `break-inside`/`break-after` khi hữu ích, nhưng chỉ ở mức layout-aware vừa đủ
- Chỉ dùng `print-color-adjust: exact` ở khối thương hiệu hoặc phần thật sự cần giữ màu

### Guardrails quan trọng
- Giữ nguyên visual language hiện tại của HESEM. Đây là **polish pass**, không phải redesign pass.
- Không xóa rule hiện có nếu nó vẫn đúng; chỉ thay khi có lý do rõ và thay bằng bản tốt hơn.
- Không thêm CSS chết.
- Không sửa ownership của Prompt 8-12:
  - Prompt 7 không chịu trách nhiệm vẽ lại SVG
  - Prompt 7 không chịu trách nhiệm dịch mô tả
  - Prompt 7 không chịu trách nhiệm full accessibility narrative sections, density matrix đầy đủ hay print-spec chuyên ngành

### Acceptance criteria đo được
Kết quả sau khi làm xong phải thỏa tất cả:
- Chỉ block `<style>` đầu tiên bị thay đổi
- Không có thay đổi HTML ngoài CSS
- Có token shadow scale đầy đủ hoặc equivalent rõ ràng
- Có motion tokens hoặc equivalent rõ ràng
- Có `:focus-visible` cho phần tử focusable thật
- Có `@media (prefers-color-scheme: dark)`
- Có `@media (prefers-reduced-motion: reduce)`
- Có `@media print`
- `.toc a`, `.tpl-card`, `.card`, `.stat-card`, `.chip`, `.info-box`, `.spec-table tr` có hover/transition hợp lý nếu selector đó tồn tại
- `.tpl-meta` và text nhỏ tương tự không còn quá mờ hoặc quá nhỏ
- Các spacing/radius đã chạm tới tuân theo scale 4px
- Không có selector rename hoặc rule removal gây ảnh hưởng Prompt 8-12

### Quy trình thực thi bắt buộc
1. Đọc file hiện tại và map các anchors thực tế.
2. Xác định những rule nào đã tồn tại để tránh churn không cần thiết.
3. Sửa CSS theo 8 nhóm thay đổi ở trên.
4. Tự review lại từng acceptance criteria trước khi kết thúc.

### Output mong muốn từ Codex sau khi thực thi
Trả về báo cáo ngắn gồm:
1. Nhóm CSS đã chỉnh
2. Anchors đã chạm tới
3. Checklist pass/fail cho từng acceptance criteria
4. Mục nào bị skip và lý do

---

## PROMPT 8/12: Sửa 28 SVG Wireframes (22 trùng lặp + 6 quá đơn giản)

### Mục tiêu
Vẽ lại wireframes cho 28 templates bị lỗi. Mỗi wireframe phải UNIQUE và phản ánh đúng layout thực tế của template đó.

### File
`mom/docs/module-layout-template-design-system-v4.html` — sửa `<svg>` bên trong các `.tpl-thumb` tương ứng

### Quy tắc SVG
- ViewBox: `0 0 200 118`
- Tối thiểu **15 SVG elements** mỗi wireframe (trung bình nên 20-25)
- Dùng CSS classes: `.wb`(bg), `.wh`(header), `.wk`(kpi), `.wm`(main), `.ws`(sidebar), `.wfl`(filter), `.wft`(footer), `.wt`(table-row), `.wta`(table-row-alt), `.wr`(red), `.wg`(green), `.wa`(amber), `.wbl`(blue), `.wp`(purple)
- Thêm chi tiết: table column headers, chart curves (`<path>`), form field outlines, icon placeholders (`<circle>` nhỏ), data labels (`<rect>` nhỏ nhiều màu), progress bars, separator lines
- Mỗi template phải KHÁC BIỆT rõ ràng — nhìn vào SVG phải biết ngay đó là template nào

### Danh sách 28 templates cần vẽ lại

#### Nhóm A: 7 templates dùng chung 1 SVG (header + filter + table + sidebar)
Vẽ lại ĐỘC LẬP cho từng template, phản ánh đúng use case:

| Template | Cần thể hiện trong wireframe |
|----------|------------------------------|
| **T20 Quản lý hợp đồng** | Header + filter + TABLE có columns: contract#, customer, value($), expiry date + sidebar với renewal timeline vertical dots |
| **T21 Danh mục chi tiết (Part Master)** | Header + filter + TABLE columns: PN, name, material, rev + SELECTED ROW highlighted + sidebar showing BOM tree snippet |
| **T23 Phiếu quy trình (Routing Sheet)** | Header + NUMBERED ROWS (010, 020, 030...) với progress indicators + operation flow arrows giữa rows |
| **T31 Bảng điểm NCC** | Header + KPI bars (3 colored gauges) + TABLE: supplier name, rating%, delivery%, quality% + sidebar với RADAR chart outline |
| **T49 Theo dõi lao động** | Header + DATE PICKER filter + TIMESHEET GRID (7 columns cho 7 ngày, rows cho operators) + color cells cho hours |
| **T50 Phân tích ngừng máy** | Header + KPI cards (MTBF, MTTR) + PARETO CHART (descending bars + cumulative line curve) + footer |
| **T51 Ca làm việc** | Header + TABS (3 tab indicators) + WEEKLY GRID (7 columns × 3 shift rows) + color-coded shift blocks |

#### Nhóm B: 4 templates wizard dùng chung 1 SVG
Vẽ lại với KHÁC BIỆT rõ ràng:

| Template | Cần thể hiện |
|----------|-------------|
| **T19 Trình tạo báo giá** | Stepper 4 dots + form với PRICING TABLE (item, qty, unit price, total) + sidebar RUNNING TOTAL with currency |
| **T30 Tạo đơn mua hàng** | Stepper 3 dots + form với SUPPLIER selector dropdown + PO ITEMS list + sidebar with DELIVERY SCHEDULE |
| **T53 Phiếu NCR/CAPA** | Stepper 8 dots (8D steps) + form WITH severity color indicator (red/yellow) + sidebar TIMELINE vertical |
| **T57 Báo cáo 8D** | Stepper 8 numbered circles connected + LARGE form area with text blocks + sidebar TEAM avatars (circles) |

#### Nhóm C: 4 templates comparison/viewer dùng chung 1 SVG
| Template | Cần thể hiện |
|----------|-------------|
| **T27 Bản vẽ kỹ thuật** | Sidebar TREE (indented lines) + LARGE viewer canvas with drawing outline (rectangle with dimension lines) + bottom TOOLBAR (zoom icons) |
| **T28 So sánh phiên bản** | SPLIT PANE (vertical divider line) + left panel text blocks + right panel text blocks + DIFF HIGHLIGHTS (colored lines) |
| **T33 So sánh RFQ** | 3-COLUMN comparison + header row per column (Supplier A, B, C) + rows with checkmarks/x marks + HIGHLIGHT column (best) |
| **T36 Nhập hàng** | PO REFERENCE box at top + ITEM LIST with qty fields + LOCATION selector per item + CONFIRM button at bottom |

#### Nhóm D: 7 templates khác dùng chung SVG (scattered duplicates)
Vẽ lại unique:

| Template | Cần thể hiện |
|----------|-------------|
| **T25 Yêu cầu thay đổi (ECR)** | Table WITH priority flags (colored left borders) + sidebar APPROVAL FLOW (vertical steps with check/pending icons) |
| **T43 Chi tiết lệnh SX** | TABS bar (4 tabs) + form SECTIONS with field labels + sidebar STATUS FLOW (colored circles connected vertically) |
| **T48 Hồ sơ lô** | TABS bar + form with CHECKLIST items (checkbox + label rows) + sidebar BATCH SUMMARY card with lot# and timestamps |
| **T60 Phòng thí nghiệm** | TABS (3) + TABLE with test result cells (PASS green / FAIL red dots) + sidebar REPORT preview rectangle |
| **T63 Theo dõi hành động** | Table WITH PROGRESS BARS inside cells + OVERDUE rows highlighted red + filter bar with date range |
| **T89 Quản lý đào tạo** | TABS (3) + TABLE with ENROLLMENT progress bars + sidebar SESSION cards with calendar icons |
| **T102 Quản lý thay đổi** | Table WITH impact badges (High/Med/Low) + sidebar APPROVAL WORKFLOW vertical with status dots |

#### Nhóm E: 6 wireframes quá đơn giản (chỉ 4 shapes)
Vẽ lại với ít nhất 15-20 elements:

| Template | Cần thể hiện (chi tiết) |
|----------|------------------------|
| **T38 Giao diện thợ máy (Operator Mobile)** | LARGE header with machine ID + CURRENT JOB card (part#, qty, progress bar LARGE) + 4 BIG action buttons (Start/Pause/Stop/Report) stacked + text 18px+ feel |
| **T41 Bảng Andon** | FULL-WIDTH alert banner (red) with exclamation + 6 MACHINE STATUS tiles (2×3 grid) each with colored circle (green/yellow/red) + machine label + LARGE font feel |
| **T97 Xem báo cáo** | TOOLBAR (zoom, print, export icons as small circles) + LARGE document canvas (white rect with text line placeholders and margins) + page number at bottom |
| **T100 So sánh phiên bản** | SPLIT VIEW with center divider + LEFT panel (document lines) + RIGHT panel (document lines) + DIFF markers (colored rectangles on changed lines) + toggle buttons top |
| **T106 Bảng cấu hình** | 3 ACCORDION sections (each with header bar + expanded content with toggle switches and input fields) + SAVE button at bottom |
| **T108 Ma trận phân quyền** | MATRIX GRID with sticky left column (role names) + top header row (module names) + colored cells (green=full, yellow=limited, blue=read, gray=none) + legend |

### Lưu ý
- Tìm template bằng tên (ví dụ: search "T20 Quản lý hợp đồng" hoặc "T20")
- Chỉ thay thế nội dung bên trong `<svg viewBox="0 0 200 118"...>...</svg>`
- Giữ nguyên wrapper `<div class="tpl-thumb">` và tất cả `<div class="tpl-info">` bên ngoài
- Mỗi SVG mới phải có `xmlns="http://www.w3.org/2000/svg" aria-hidden="true"`

---

## PROMPT 9/12: Dịch 89 mô tả template sang tiếng Việt có dấu + Viết chi tiết hơn

### Mục tiêu
Tìm và sửa TẤT CẢ 89 template descriptions đang viết bằng tiếng Anh, dịch sang tiếng Việt có dấu. Đồng thời mở rộng mô tả ngắn thành mô tả chi tiết hơn.

### File
`mom/docs/module-layout-template-design-system-v4.html`

### Quy tắc dịch
1. Mỗi `<div class="tpl-desc">` phải viết TIẾNG VIỆT CÓ DẤU
2. Mô tả phải gồm: (a) chức năng chính, (b) đối tượng sử dụng, (c) 1-2 use case cụ thể
3. Giữ thuật ngữ chuyên ngành tiếng Anh trong ngoặc khi cần (OEE, SPC, CAPA, FMEA, NCR, BOM, PO, SO, WO, JO, FAI, IQC, IPQC, FQC, OQC)
4. Độ dài: 30-60 từ mỗi mô tả

### Ví dụ cách dịch

**Trước:**
```html
<div class="tpl-desc">Sensor overview + machine map + alert feed</div>
```

**Sau:**
```html
<div class="tpl-desc">Tổng quan cảm biến IoT + bản đồ máy móc + nguồn cấp cảnh báo thời gian thực. Dành cho kỹ sư bảo trì và quản lý thiết bị giám sát tình trạng sản xuất.</div>
```

**Trước:**
```html
<div class="tpl-desc">Tree BOM + component detail + where-used</div>
```

**Sau:**
```html
<div class="tpl-desc">Cây cấu trúc sản phẩm (BOM) + chi tiết linh kiện + truy xuất ngược nơi sử dụng. Dành cho kỹ sư thiết kế và quản lý vật tư khi xây dựng cấu hình sản phẩm.</div>
```

**Trước:**
```html
<div class="tpl-desc">Change requests + approval flow + impact</div>
```

**Sau:**
```html
<div class="tpl-desc">Yêu cầu thay đổi kỹ thuật (ECR/ECN) + luồng phê duyệt nhiều cấp + phân tích tác động. Dành cho quản lý kỹ thuật và QA khi cần thay đổi thiết kế hoặc quy trình.</div>
```

### Cách tìm template cần sửa
Search trong file cho tất cả `<div class="tpl-desc">` — kiểm tra từng cái:
- Nếu nội dung KHÔNG có dấu tiếng Việt (không có ă, â, ê, ô, ơ, ư, đ, à, á, ả, ã, ạ...) → CẦN DỊCH
- Nếu nội dung đã có dấu tiếng Việt → kiểm tra xem đã đủ chi tiết chưa, nếu quá ngắn (<20 từ) → MỞ RỘNG

### Danh sách mẫu cho các nhóm chưa có tiếng Việt

**Nhóm Kỹ thuật:**
- Part Master → "Danh mục chi tiết toàn bộ (Part Master) — quản lý mã chi tiết, vật liệu, bản vẽ, phiên bản. Click chọn hàng để xem BOM và Routing tương ứng. Dành cho kỹ sư thiết kế và quản lý NPI."
- BOM Explorer → "Cây cấu trúc sản phẩm (BOM) dạng phân cấp — hiển thị linh kiện, số lượng, nguồn (mua/sản xuất), truy xuất ngược (where-used). Dành cho kỹ sư và planning."

**Nhóm Chất lượng:**
- SPC Control Chart → "Biểu đồ kiểm soát quá trình thống kê (SPC): X-bar, R chart, Histogram, Run chart + phân tích năng lực quy trình (Cpk/Ppk). Dành cho kỹ sư chất lượng giám sát ổn định sản xuất."
- FMEA Risk Matrix → "Ma trận phân tích rủi ro (FMEA): Severity × Occurrence × Detection = RPN. Xếp hạng rủi ro và kế hoạch giảm thiểu. Dành cho QA và kỹ sư quy trình."

**Nhóm Sản xuất:**
- MES Control Center → "Trung tâm điều khiển MES: lưới trạng thái máy (xanh/vàng/đỏ), hàng đợi công việc, cảnh báo ngừng máy. Dành cho quản đốc và giám sát ca sản xuất."
- Operator Mobile → "Giao diện thợ máy tối ưu cho di động: nút lớn, dễ chạm (touch-first), hiển thị công việc hiện tại và nút Start/Pause/Stop. Dành cho người vận hành máy CNC."

### Lưu ý
- Chỉ sửa nội dung bên trong `<div class="tpl-desc">...</div>`
- KHÔNG sửa `<div class="tpl-name">` (đã đúng) hoặc `<div class="tpl-subname">` (tiếng Anh — OK)
- KHÔNG sửa `<div class="tpl-meta">` (bố cục — giữ nguyên)
- Tổng cộng cần sửa ~89 mô tả

---

## PROMPT 10/12: Rebuild Insertion Block — Design Patterns & States v4.1

### Mục tiêu
Tái thiết kế Prompt 10 theo hướng **anchor-based, conflict-safe, content-architecture-first**. Prompt này chỉ sở hữu một block chèn liên tục gồm 10 sections mới về design patterns, states, accessibility, density và content governance.

Block này phải được chèn **sau** section `id="standards"` và **trước** section `id="visual-themes"` trong file hiện trạng, đồng thời phải an toàn để Prompt 11 và Prompt 12 chạy tiếp mà không bị overlap ownership.

### Benchmark bắt buộc phải vận dụng
- **Carbon + Fluent 2**: state modeling, loading, notification, density phải có cấu trúc rõ `variant / trigger / behavior / fallback`, không viết kiểu “liệt kê cảm tính”.
- **GOV.UK + USWDS**: error patterns, plain language, validation caveats và content writing phải rõ, cụ thể, không phô trương UI mà bỏ quên khả năng hiểu.
- **WAI-ARIA APG + MDN**: modal, alert, `aria-live`, `aria-busy`, keyboard model và focus movement phải đúng semantics.
- **Carbon Data Visualization + USWDS**: data-viz nên thiên về governance và chart choice, không nhồi code vô ích.
- **Carbon / Fluent / Android**: dark mode mapping phải đi từ semantic tokens hoặc semantic roles trước; không spec theo raw hex một cách máy móc.

Nếu các design system lớn có khác biệt policy, **không được ép thành một “best practice” duy nhất**. Hãy biến khác biệt đó thành governance note, ví dụ:
- Required field indicator có thể khác giữa GOV.UK và USWDS
- Live validation không được mặc định là luôn tốt

### File
`mom/docs/module-layout-template-design-system-v4.html`

### Contract thực thi
1. Luôn đọc HTML hiện trạng trước khi sửa. **File hiện tại là nguồn sự thật duy nhất.**
2. Prompt này chỉ được sửa **vùng chèn giữa `#standards` và `#visual-themes`**.
3. Không dùng line number làm contract. Nếu anchor thiếu, trùng hoặc mơ hồ, trả về `BLOCKED`.
4. Không được sửa TOC. **Prompt 12 là owner duy nhất của TOC, IA reorder và final renumbering.**
5. Không được sửa shared `<style>` đầu tiên.
6. Ưu tiên tái sử dụng primitives và pattern có sẵn trong file. Nếu thật sự bắt buộc phải thêm CSS cho block mới, chỉ được thêm **một** local `<style>` ngay trước section đầu tiên mới, prefix toàn bộ selector bằng `.p10-`, và không override selector shared đã có.
7. Không được đổi, xóa, reorder hoặc rewrite các sections hiện hữu: `summary`, `architecture`, `standards`, `visual-themes`.
8. Không được đổi text, ID, class hay cấu trúc section `#visual-themes`.
9. Không được chạm tới ownership của Prompt 11:
   - MOM/eQMS-specific sections
   - Shop Floor Display Mode đầy đủ
   - Operator-facing production display details
10. Dark tokens, naming, tone, palette và shared terminology phải **derive from actual artifact**, đặc biệt các token có thể đã được Prompt 7 normalize trước đó.

### Anchor window
- **Start anchor:** thẻ `</section>` đóng section `id="standards"`
- **End anchor:** thẻ mở `<section class="section" id="visual-themes">`
- Chèn đúng một block liên tục nằm giữa hai anchor này
- `#standards` và `#visual-themes` là **no-touch boundaries**

Nếu trong vùng này đã tồn tại một trong các IDs mục tiêu bên dưới, coi là xung đột và trả về `BLOCKED` thay vì merge đoán mò.

### Exact section shell bắt buộc
Mỗi section mới PHẢI dùng đúng shell sau:

```html
<section class="section" id="...">
  <h2 class="section-title"><span class="section-number">X</span>...</h2>
  <p class="section-subtitle">...</p>
  ...
</section>
```

Quy ước:
- Section number tạm thời: `D, E, F, G, H, I, J, K, L, M`
- Không đổi visible number của section `C`
- Không tự renumber các section cũ

### Primitive và visual language phải reuse
Ưu tiên dùng các primitive đã tồn tại trong file:
- `.grid-2`, `.grid-3`
- `.card`, `.card-header`, `.card-body`
- `.spec-table`
- `.info-box`
- `.code-block`
- Existing wireframe palette classes như `.wb`, `.wh`, `.wk`, `.wm`, `.ws`, `.wfl`, `.wft`, `.wt`, `.wta`, `.wr`, `.wg`, `.wa`, `.wbl`, `.wp`

Không biến Prompt 10 thành một đợt “phát minh component mới”. Nếu một ý có thể diễn đạt bằng card + table + info-box thì không tạo thêm cấu trúc bespoke.

### Format rules theo từng nhóm section
- **Table-first:** `component-states`, `loading-patterns`, `notification-patterns`, `dark-mode-mapping`, `density-modes`
- **Pattern-card-first:** `error-patterns`, `empty-states`, `data-viz`, `accessibility`
- **Governance-first:** `content-guidelines`
- **Example code chỉ dùng ở nơi semantics/hành vi dễ sai**, cụ thể:
  - error summary + field linking
  - `aria-live` / `role="status"` / `aria-busy`
  - modal dialog
  - retry / load-state snippet
  - token alias mapping
- **Governance notes là bắt buộc** cho các điểm:
  - disabled vs read-only
  - auto-dismiss policy
  - required-field policy differences
  - live-validation caveats
  - dark-mode token aliasing

### Giới hạn độ dài và độ sâu
- Giữ block này ở mức **gọn nhưng đủ chiều sâu**
- Mỗi section tối đa:
  - `1` main table hoặc `1` main grid
  - `1` info-box chính
  - `1-2` example blocks nếu thật sự cần
- Ưu tiên chất lượng cấu trúc hơn số lượng card

### 10 section contracts

#### Section D: Component State Matrix
```text
Section ID: component-states
Section number: D
Primary structure: spec-table + 2-3 support cards
```

Bắt buộc có:
- `1` bảng state matrix chuẩn cho các component chính
- Cột nên bao gồm tối thiểu: `component/state`, `trigger`, `visual delta`, `interaction delta`, `semantic/ARIA delta`, `token delta`, `exit condition`, `test note`
- Các hàng bắt buộc phải cover tối thiểu: button, input, checkbox, table row, card, tab, toast/notification, progress
- `2-3` support cards cho các cặp dễ nhầm như:
  - `disabled` vs `read-only`
  - `active` vs `selected`
  - `error` vs `warning`

Không làm:
- Không cần visual preview 8 trạng thái cho mọi component
- Không nhồi inline demo vô tội vạ

#### Section E: Error State Patterns
```text
Section ID: error-patterns
Section number: E
Primary structure: taxonomy table + pattern cards + code examples
```

Bắt buộc có:
- `1` taxonomy table ngắn để phân nhóm lỗi
- Tối thiểu `6` pattern cards, phải cover:
  - field validation
  - form-level summary
  - service/API failure
  - permission / ineligibility
  - network / offline / timeout
  - empty-result-like failure state
- Mỗi card nên có: `context`, `what user sees`, `recovery action`, `ARIA / announcement`, `copy rule`
- `2` code examples bắt buộc:
  - field + `aria-describedby`
  - error summary + link xuống field / retry action

Không làm:
- Không biến mọi lỗi thành toast
- Không dùng một generic message cho mọi tình huống

#### Section F: Loading & Skeleton Patterns
```text
Section ID: loading-patterns
Section number: F
Primary structure: decision table + pattern cards + one code example
```

Bắt buộc có:
- `1` decision table để phân biệt `skeleton`, `spinner`, `progress`, `retry/error`
- Cột nên gồm: `scenario`, `known structure`, `blocking level`, `duration expectation`, `recommended pattern`, `ARIA/state note`
- Tối thiểu `4` pattern cards:
  - initial page load
  - table/list load
  - inline action in button/form
  - long-running task with progress
- `1` code example cho `aria-busy` hoặc `role="status"`

Không làm:
- Không mặc định spinner cho mọi case
- Không viết animation spec quá chi tiết nếu section chỉ là governance/documentation

#### Section G: Empty State Patterns
```text
Section ID: empty-states
Section number: G
Primary structure: pattern cards + short classification table
```

Bắt buộc có:
- `1` bảng phân loại ngắn: first use, no results, permissions, system failure, cleared/filter state
- Tối thiểu `6` pattern cards
- Mỗi card phải có: `context`, `user problem`, `what to show`, `primary action`, `copy pattern`
- Có ít nhất `1` note nêu khi nào text-only state tốt hơn illustration-heavy state

Không làm:
- Không lạm dụng emoji nếu nó phá tone enterprise

#### Section H: Notification & Toast Patterns
```text
Section ID: notification-patterns
Section number: H
Primary structure: variant table + 4 severity cards
```

Bắt buộc có:
- `1` variant table cho `inline`, `toast`, `actionable`, `banner/callout`
- Cột nên gồm: `disruption`, `placement`, `duration`, `actionability`, `focus behavior`, `announcement role`
- `4` severity cards: success, info, warning, error
- Có governance note cho:
  - auto-dismiss policy
  - manual dismissal cho lỗi nghiêm trọng
  - stacking limit

Không làm:
- Không claim một thời lượng auto-dismiss là “chuẩn tuyệt đối”
- Không merge alert banner và toast thành một pattern duy nhất

#### Section I: Data Visualization Guidelines
```text
Section ID: data-viz
Section number: I
Primary structure: chart-choice table + do/don't governance cards
```

Bắt buộc có:
- `1` chart-choice table: mục đích, loại biểu đồ, ví dụ MOM
- `1` do/don't block cho:
  - start-at-zero
  - missing data
  - legend usage
  - label clarity
  - fallback table / textual summary
- `3-4` governance cards theo chart family: comparison, time series, distribution, composition

Không làm:
- Không nhồi code chart implementation
- Không yêu cầu quá nhiều chart types nếu không có ví dụ sử dụng rõ

#### Section J: Dark Mode Token Mapping
```text
Section ID: dark-mode-mapping
Section number: J
Primary structure: spec-table + info-box
```

Bắt buộc có:
- `1` mapping table dùng semantic roles trước, không raw hex trước
- Cột nên gồm: `semantic role`, `light token`, `dark token`, `high-contrast fallback`, `notes`
- Phải derive từ token thật đang có trong artifact sau các prompt trước
- `1` info-box giải thích các nguyên tắc:
  - surface hierarchy
  - text on-surface
  - outline/focus
  - status color adjustment

Không làm:
- Không tạo bảng 50+ raw hex mappings nếu file thực không có ngần ấy global tokens
- Không định nghĩa thêm global token pack mới chỉ để “đủ bảng”

#### Section K: Accessibility / ARIA Patterns
```text
Section ID: accessibility
Section number: K
Primary structure: pattern cards + code examples
```

Bắt buộc có:
- Tối thiểu `5` pattern cards, phải cover:
  - dialog/modal
  - tabs
  - sortable table
  - alert/status/live region
  - progressbar/loading
- Mỗi card nên có block cố định:
  - `role / landmark`
  - `accessible name`
  - `focus movement`
  - `keyboard model`
  - `live region / error association`
- `2` code examples bắt buộc:
  - modal dialog
  - live region / status / progress

Không làm:
- Không chỉ liệt kê attributes rời rạc
- Không viết prose chung chung kiểu “accessible by default”

#### Section L: Data Density Modes
```text
Section ID: density-modes
Section number: L
Primary structure: spec-table + governance note
```

Bắt buộc có:
- `1` table cho **3 core modes**: `Compact`, `Default`, `Comfortable`
- Cột nên gồm tối thiểu: `control height`, `table row height`, `padding`, `font size`, `icon size`, `touch target note`, `reflow / wrap note`
- `1` governance note nói rõ:
  - `Shop Floor Display Mode` được định nghĩa đầy đủ ở Prompt 11
  - Section này chỉ chốt core density system, không owner shop-floor token pack

Không làm:
- Không spec chi tiết mode `shopfloor` ở đây
- Không overlap với Prompt 11

#### Section M: Content Guidelines
```text
Section ID: content-guidelines
Section number: M
Primary structure: governance cards + good/bad table
```

Bắt buộc có:
- Governance cards cho:
  - sentence case / uppercase usage
  - data formatting
  - placeholder & hint text
  - error wording
  - progress / loading wording
  - CTA / confirmation wording
- `1` bảng `Good / Bad` ngắn cho copy examples
- Tone phải cụ thể, thân thiện, enterprise, không kỹ thuật hóa lỗi cho end user

Không làm:
- Không hard-code duy nhất một required-field policy
- Không mặc định live validation là recommended default

### Guardrails quan trọng
- Không update TOC trong Prompt 10
- Không final-reorder information architecture trong Prompt 10
- Không final-renumber sections trong Prompt 10
- Không sửa shared CSS foundation của Prompt 7
- Không lấn sang MOM/eQMS-specific sections của Prompt 11
- Không dùng narrative dài thay cho bảng ở các section table-first
- Không dùng bảng khổng lồ thay cho pattern cards ở các section card-first

### Acceptance criteria đo được
Kết quả sau khi thực thi phải thỏa tất cả:
- Có đúng `10` sections mới với các IDs sau, mỗi ID xuất hiện đúng `1` lần:
  - `component-states`
  - `error-patterns`
  - `loading-patterns`
  - `empty-states`
  - `notification-patterns`
  - `data-viz`
  - `dark-mode-mapping`
  - `accessibility`
  - `density-modes`
  - `content-guidelines`
- Cả block mới nằm đúng giữa `#standards` và `#visual-themes`
- `#visual-themes` vẫn đứng ngay sau `#content-guidelines`
- Không có chỉnh sửa TOC
- Không có chỉnh sửa shared `<style>` đầu tiên
- Nếu có local style block thì chỉ có `1` block và selector đều prefix `.p10-`
- `#standards` và `#visual-themes` không bị rewrite
- Tất cả section mới dùng đúng shell `.section / .section-title / .section-number / .section-subtitle`
- Các section table-first thật sự có table chính
- Các section card-first thật sự có pattern cards chính
- `dark-mode-mapping` dùng semantic token mapping, không raw-hex-first
- `density-modes` không định nghĩa đầy đủ `shopfloor`
- Có example code ở đúng các mục semantics dễ sai
- Có governance notes cho required-field policy và live-validation caveat
- Nội dung tiếng Việt có dấu, không lẫn tiếng Anh thừa trừ tên pattern/tokens khi cần
- HTML nesting hợp lệ

### Quy trình thực thi bắt buộc
1. Đọc HTML hiện trạng và xác nhận hai anchors thực tế.
2. Xác nhận các primitives và token names đang tồn tại trong artifact.
3. Lên block insertion plan cho 10 sections theo đúng thứ tự D → M.
4. Chèn block mới mà không đụng boundary sections.
5. Tự review lại từng acceptance criteria trước khi kết thúc.

### Output mong muốn từ Codex sau khi thực thi
Trả về báo cáo ngắn gồm:
1. Anchors đã dùng để chèn
2. 10 section IDs đã thêm
3. Có hay không có local style block
4. Checklist pass/fail cho từng acceptance criterion
5. Mục nào bị skip và lý do

---

## PROMPT 11/12: Bổ sung 6 Sections Đặc Thù MOM/eQMS

### Mục tiêu
Thêm 6 sections chuyên biệt cho ngành sản xuất CNC precision machining, chèn SAU section "Content Guidelines" (id="content-guidelines") và TRƯỚC section "20 Visual Theme Presets" (id="visual-themes").

### File
`mom/docs/module-layout-template-design-system-v4.html`

### 6 Sections

#### Section N: Chế độ xưởng sản xuất (Shop Floor Display Mode)
```
Section ID: shop-floor-mode
Section number: N
```

Đặc tả giao diện dành cho:
- Màn hình TV xưởng sản xuất (Andon boards, status displays)
- Bảng điều khiển cạnh máy (operator panels)
- Tablet/kiosk trên sàn (inspection stations)

**Thông số kỹ thuật:**
| Thuộc tính | Giá trị | Lý do |
|------------|---------|-------|
| Touch target tối thiểu | 48px × 48px | WCAG 2.5.5, thao tác đeo găng tay |
| Font body tối thiểu | 18px | Đọc từ khoảng cách 0.5-1m |
| Font KPI value | 48-64px | Đọc từ khoảng cách 3-5m |
| Contrast ratio | ≥7:1 (WCAG AAA) | Ánh sáng mạnh xưởng |
| Bottom navigation | Preferred | Dễ chạm hơn top nav |
| Status indicators | ≥24px circle + text label | Không dùng color alone |
| Button spacing | ≥16px gap | Tránh chạm nhầm |
| Animation | Disabled | Giảm distraction |

**3 sub-modes:**
1. **Kiosk mode** — Full screen, no browser chrome, auto-logout 5 phút, barcode scanner focus
2. **TV Display mode** — Read-only, auto-refresh 10s, font hero 64px+, no interaction needed
3. **Operator Panel mode** — Touch-first, large buttons, simplified navigation, current job focus

Wireframe SVG cho mỗi sub-mode (3 wireframes 200×118).

**CSS variables riêng:**
```css
[data-density="shopfloor"] {
  --hds-control-h: 56px;
  --hds-control-font: 18px;
  --hds-control-gap: 16px;
  --hds-table-row-h: 64px;
  --hds-table-body-font: 18px;
  --hds-icon-md: 32px;
  --hds-kpi-value-font: 48px;
}
```

#### Section O: Mẫu biểu mẫu tuân thủ 21 CFR Part 11
```
Section ID: compliance-forms
Section number: O
```

Đặc tả cho biểu mẫu tuân thủ FDA 21 CFR Part 11 (electronic records, electronic signatures):

**5 patterns:**

1. **Electronic Signature Capture**
   - Signer name (auto-filled from session) + meaning dropdown (Phê duyệt / Xem xét / Xác nhận) + password re-entry + timestamp auto
   - Locked after signing — visual indicator (🔒 icon + gray overlay)
   - Ví dụ: Phê duyệt phiếu kiểm tra FAI

2. **Audit Trail Visualization**
   - Timeline dọc: mỗi entry gồm timestamp, user, action, old value → new value, reason
   - Color-coded by action type: Create (green), Update (blue), Delete (red), Approve (purple)
   - Filter by date range, user, field
   - Ví dụ: Lịch sử thay đổi NCR-2026-1204

3. **Record Locking**
   - Status bar: Draft (editable) → Under Review (partially locked) → Approved (fully locked) → Obsolete (archived)
   - Visual: unlocked icon → lock icon, fields become read-only with gray background
   - Unlock requires admin override + reason

4. **Version Comparison**
   - Split-pane diff view: left = old version, right = new version
   - Changed fields highlighted yellow, added fields green, deleted fields red
   - Version selector dropdown at top

5. **Reason Code Entry**
   - Required for: any edit after initial approval, status changes, deletions
   - UI: modal dialog with dropdown (predefined reasons) + free text "Ghi chú bổ sung"
   - Logged to audit trail

#### Section P: Chuyển đổi giao diện theo ca (Shift-Based Theme Switching)
```
Section ID: shift-themes
Section number: P
```

Tự động đổi visual theme theo ca làm việc:

| Ca | Thời gian | Theme mặc định | Density | Lý do |
|----|-----------|----------------|---------|-------|
| Ca sáng | 06:00-14:00 | Professional Light | Default | Ánh sáng tự nhiên, công việc chính |
| Ca chiều | 14:00-22:00 | Ocean Breeze (nhẹ hơn) | Default | Giảm mỏi mắt buổi chiều |
| Ca đêm | 22:00-06:00 | Professional Dark | Comfortable | Tối, giảm chói, font lớn hơn |

**Cấu hình:**
- Admin cấu hình tại: Quản trị > Giao diện > Tab Nâng cao
- Mỗi facility/department có thể cấu hình riêng
- User có thể override (preference cá nhân ưu tiên hơn)
- Chuyển đổi mượt: CSS transition 500ms khi đổi theme

**Diagram:** Flow chart: Kiểm tra giờ → Áp dụng theme ca → Kiểm tra user override → Áp dụng final theme

#### Section Q: Bố cục tối ưu cho in ấn (Print Layout Specifications)
```
Section ID: print-layouts
Section number: Q
```

Đặc tả `@media print` cho các loại tài liệu:

1. **Phiếu kiểm tra (Inspection Report)**
   - Page header: Logo + Tên công ty + Mã tài liệu + Phiên bản + Ngày
   - Page footer: Trang X/Y + "Bản kiểm soát — Cấm photo"
   - Bảng kết quả: borders đậm, font 10pt, no color backgrounds (tiết kiệm mực)
   - Chữ ký: 3 blocks (Người kiểm tra / Người phê duyệt / Khách hàng) với đường kẻ
   - QR code: link đến bản điện tử

2. **Phiếu giao hàng (Packing Slip)**
   - A4 landscape, item table full-width
   - Barcode cho mỗi item line
   - Tổng số kiện, tổng trọng lượng cuối trang

3. **Báo cáo SPC**
   - Chart render as image (SVG → rasterized)
   - Data table bên dưới chart
   - Specification limits in footer

**CSS print tokens:**
```css
@media print {
  --print-font-body: 10pt;
  --print-font-header: 12pt;
  --print-font-title: 14pt;
  --print-margin: 15mm;
  --print-header-height: 20mm;
  --print-footer-height: 12mm;
}
```

**Quy tắc:**
- `break-inside: avoid` cho cards, tables, charts
- `break-after: page` cho mỗi section lớn
- Ẩn: navigation, filters, action buttons, scrollbars
- Hiện: page numbers, document control info, watermarks

#### Section R: Giao diện vận hành máy (Machine Operator Interface Patterns)
```
Section ID: operator-interface
Section number: R
```

Đặc tả cho giao diện operator tại máy CNC:

**Layout chuẩn Operator Panel:**
```
┌──────────────────────────────────┐
│ HEADER: Machine ID + Status LED  │
├──────────────────────────────────┤
│ CURRENT JOB                      │
│ ┌──────────────────────────────┐ │
│ │ Part: AERO-BRK-2024  Rev: C │ │
│ │ WO: WO-2026-0891            │ │
│ │ Qty: 34/50    ████████░░ 68% │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ ▶    │ │ ⏸   │ │ ⏹   │     │
│ │START │ │PAUSE │ │ STOP │     │
│ └──────┘ └──────┘ └──────┘     │
├──────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ 📋  │ │ ⚠️  │ │ 📊  │     │
│ │CHECK │ │REPORT│ │ OEE  │     │
│ └──────┘ └──────┘ └──────┘     │
├──────────────────────────────────┤
│ FOOTER: Shift B · Op: Nguyễn V.T │
└──────────────────────────────────┘
```

**Đặc tả UX:**
- Auto-focus barcode scanner input khi mở trang
- Confirmation dialog cho STOP (2 bước: "Bạn chắc chắn?" → nhập lý do)
- Vibration feedback (nếu thiết bị hỗ trợ) khi nhấn nút chính
- Color-coded header: Running=xanh, Paused=vàng, Stopped=đỏ, Setup=tím
- Đồng hồ đếm cycle time lớn (48px font, realtime)

#### Section S: Mẫu dashboard thời gian thực (Realtime Dashboard Patterns)
```
Section ID: realtime-dashboard
Section number: S
```

Đặc tả cho dashboards cập nhật dữ liệu liên tục:

**Data Freshness Indicator:**
- Timestamp: "Cập nhật lúc 14:23:45" + nút 🔄 refresh thủ công
- Stale data warning: nếu >60s không cập nhật → badge "Dữ liệu cũ" (amber)
- Offline mode: nếu mất kết nối → banner "Đang hiển thị dữ liệu cache từ 14:20:00"

**Tiered Refresh Rates:**
| Loại dữ liệu | Tần suất | Ví dụ |
|---------------|----------|-------|
| Cảnh báo khẩn cấp | 1-3 giây | Machine alarm, safety alert |
| Trạng thái máy | 5-10 giây | OEE, running/stopped, cycle count |
| KPI tổng hợp | 30-60 giây | Yield rate, production output |
| Biểu đồ xu hướng | 1-5 phút | SPC trend, energy consumption |
| Báo cáo tổng hợp | 15-30 phút | Shift summary, daily report |

**Smooth Data Updates:**
- Số liệu: animate value change (count up/down)
- Charts: smooth transition, no blink
- Tables: highlight changed rows briefly (flash yellow 500ms → fade)
- Status indicators: pulse animation khi thay đổi trạng thái

**Connection States:**
```
🟢 Trực tuyến — Dữ liệu realtime
🟡 Chậm — Dữ liệu trễ >30s
🔴 Ngoại tuyến — Hiển thị cache
⚪ Đang kết nối — Skeleton loading
```

### Lưu ý
- Tất cả 6 sections có `<section class="section" id="...">` wrapper
- Section number: N, O, P, Q, R, S
- Cập nhật TOC: thêm 6 links mới
- Tiếng Việt CÓ DẤU
- Tổng cộng khoảng 500-700 dòng HTML

---

## PROMPT 12/12: Sắp xếp lại Information Architecture + Cross-references

### Mục tiêu
Sắp xếp lại thứ tự sections trong file cho logic hơn. Thêm cross-references giữa templates, blocks, zones.

### File
`mom/docs/module-layout-template-design-system-v4.html`

### Thứ tự sections mới (sau khi áp dụng Prompt 1-5)

```
HEADER
TOC (cập nhật tương ứng)

═══ PHẦN I: NỀN TẢNG ═══
0. Tóm tắt thực thi (summary)
A. Kiến trúc hệ thống (architecture)
B. Quy chuẩn đồ họa (standards)
D. Ma trận trạng thái thành phần (component-states)      ← di chuyển lên
L. Chế độ mật độ dữ liệu (density-modes)                ← di chuyển lên
J. Dark Mode Token Mapping (dark-mode-mapping)            ← di chuyển lên
K. Accessibility / ARIA Patterns (accessibility)          ← di chuyển lên

═══ PHẦN II: MẪU THIẾT KẾ ═══
E. Mẫu trạng thái lỗi (error-patterns)
F. Mẫu tải dữ liệu (loading-patterns)
G. Trạng thái trống (empty-states)
H. Mẫu thông báo (notification-patterns)
I. Hướng dẫn trực quan hóa dữ liệu (data-viz)
M. Hướng dẫn nội dung (content-guidelines)

═══ PHẦN III: ĐẶC THÙ MOM ═══
N. Chế độ xưởng sản xuất (shop-floor-mode)
O. Biểu mẫu tuân thủ 21 CFR Part 11 (compliance-forms)
P. Chuyển đổi giao diện theo ca (shift-themes)
Q. Bố cục in ấn (print-layouts)
R. Giao diện vận hành máy (operator-interface)
S. Dashboard thời gian thực (realtime-dashboard)

═══ PHẦN IV: VISUAL THEMES ═══
C. 20 Visual Theme Presets (visual-themes)

═══ PHẦN V: TEMPLATE CATALOG ═══
14. Block Engine (block-engine)                           ← di chuyển TRƯỚC templates
17. Zone System (zone-system)                             ← di chuyển TRƯỚC templates
18. Smart Scroll UX (scroll-ux)                           ← di chuyển TRƯỚC templates
1-13. Template Categories (cat-overview → cat-cross)

═══ PHẦN VI: CÔNG CỤ & QUẢN TRỊ ═══
15. Component Preset Library (component-presets)
16. Module Editor Tools (module-editor)
19. Token Cascade (token-cascade)
20. Governance & Roadmap (governance)
```

### Cập nhật TOC
```html
<nav class="toc"><div class="toc-inner">
  <!-- Nền tảng -->
  <a href="#summary">Tóm tắt</a>
  <a href="#architecture">Kiến trúc</a>
  <a href="#standards">Quy chuẩn</a>
  <a href="#component-states">Trạng thái</a>
  <a href="#density-modes">Mật độ</a>
  <a href="#dark-mode-mapping">Dark Mode</a>
  <a href="#accessibility">ARIA</a>
  <!-- Mẫu thiết kế -->
  <a href="#error-patterns">Lỗi</a>
  <a href="#loading-patterns">Loading</a>
  <a href="#empty-states">Trống</a>
  <a href="#notification-patterns">Thông báo</a>
  <a href="#data-viz">Data Viz</a>
  <a href="#content-guidelines">Nội dung</a>
  <!-- Đặc thù MOM -->
  <a href="#shop-floor-mode">Xưởng SX</a>
  <a href="#compliance-forms">21 CFR</a>
  <a href="#shift-themes">Ca/Shift</a>
  <a href="#print-layouts">In ấn</a>
  <a href="#operator-interface">Operator</a>
  <a href="#realtime-dashboard">Realtime</a>
  <!-- Themes + Templates -->
  <a href="#visual-themes">Themes</a>
  <a href="#block-engine">Blocks</a>
  <a href="#zone-system">Zones</a>
  <a href="#scroll-ux">Scroll</a>
  <a href="#cat-overview">Templates ▸</a>
  <!-- Công cụ -->
  <a href="#component-presets">Presets</a>
  <a href="#module-editor">Editor</a>
  <a href="#governance">Governance</a>
</div></nav>
```

### Thêm Cross-references

Trong MỖI template card, thêm `data-blocks` và `data-zones` attributes:
```html
<div class="tpl-card" data-blocks="kpi-row,data-table,chart-line,filter-bar" data-zones="header,kpi-bar,filter,main,sidebar,footer">
```

Trong Block Engine bảng, mỗi block type thêm cột "Templates sử dụng":
```html
<td><a href="#cat-overview">T01</a>, <a href="#cat-overview">T04</a>, <a href="#cat-sales">T18</a></td>
```

Trong Zone System bảng, mỗi zone type thêm cột "Templates ví dụ":
```html
<td><a href="#cat-overview">T01</a> (main 2/3), <a href="#cat-production">T39</a> (main full)</td>
```

### Section number renumbering
Sau khi sắp xếp lại, đánh số lại TẤT CẢ section numbers:
- Phần I: sections 1-7
- Phần II: sections 8-13
- Phần III: sections 14-19
- Phần IV: section 20
- Phần V: sections 21-35 (Block Engine=21, Zone=22, Scroll=23, Templates 24-35)
- Phần VI: sections 36-39

### Lưu ý
- Di chuyển TOÀN BỘ section HTML (bao gồm cả nội dung bên trong)
- KHÔNG thay đổi nội dung — chỉ di chuyển và đánh số lại
- Cập nhật TOC cho khớp với thứ tự mới
- Kiểm tra tất cả href="#..." links vẫn hoạt động

---

## THỨ TỰ THỰC HIỆN

```
Prompt 7 (CSS) ─────┐
Prompt 8 (SVG) ─────┼── Song song
Prompt 9 (Dịch VN) ─┘
         ↓
Prompt 10 (10 sections mới) ──┐
Prompt 11 (6 sections MOM) ───┘── Song song
         ↓
Prompt 12 (Sắp xếp lại IA + Cross-refs) ── Cuối cùng
```

## ƯỚC LƯỢNG SAU KHI HOÀN TẤT

| Metric | Trước | Sau |
|--------|-------|-----|
| Tổng dòng | 2,109 | ~3,800-4,200 |
| CSS quality | 5/10 | 9/10 |
| SVG wireframes unique | 101/123 (82%) | 123/123 (100%) |
| Mô tả tiếng Việt | 34/123 (28%) | 123/123 (100%) |
| Sections tổng | 24 | 40 |
| Component states | 0 | 12 components × 8 states |
| Error patterns | 0 | 8 patterns |
| Loading patterns | 0 | 6 patterns |
| Dark mode tokens | 3 | 50+ |
| MOM-specific sections | 0 | 6 |
| Cross-references | 0 | Templates ↔ Blocks ↔ Zones |

# HESEM MOM — Bộ Prompt Codex: Module Layout Template Design System v4.0

> **Ngày tạo**: 2026-04-10
> **Tổng cộng**: 6 prompts độc lập, mỗi prompt tự chứa đầy đủ context
> **Thứ tự thực hiện**: Prompt 1 → 2 → 3 chạy song song được. Prompt 4 phụ thuộc 1+2+3. Prompt 5 + 6 chạy sau 4.

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
- So sánh Before/After (comparison-grid): Trước (8 tab rời rạc, không có template) vs Sau (6 tab, template-centric)

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
- localStorage keys

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
function getModuleTemplateBinding() { ... } // load from localStorage

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
// ═══ TEMPLATE STORAGE ═══
var TEMPLATE_STORAGE_KEY = 'hesem_layout_templates';

HmTheme.getTemplates = function() {
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

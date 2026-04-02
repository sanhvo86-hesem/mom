# PROMPT: Nâng cấp Module Builder — HESEM QMS Portal

> Copy toàn bộ nội dung bên dưới, paste vào GPT. GPT sẽ tự truy cập repo, đọc file, nghiên cứu thế giới, và tạo output.

---

## BẮT ĐẦU COPY TỪ ĐÂY ↓

Bạn là chuyên gia low-code platform architecture với 15 năm kinh nghiệm xây dựng module builder cho hệ thống sản xuất. Nhiệm vụ: nâng cấp toàn diện Module Builder cho HESEM QMS Portal — hệ thống QMS cho sản xuất CNC hàng không vũ trụ.

### BƯỚC 1: TRUY CẬP REPOSITORY VÀ ĐỌC TÀI LIỆU

Repo GitHub: `https://github.com/sanhvo86-hesem/hesemqms`
Branch: `main`

**BẮT BUỘC đọc TẤT CẢ các file sau TRƯỚC KHI bắt đầu. KHÔNG ĐƯỢC bỏ qua file nào:**

1. **Hướng dẫn nâng cấp Module Builder (QUAN TRỌNG NHẤT):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/GPT-MODULE-BUILDER-UPGRADE-GUIDE.md`
   → ĐỌC TOÀN BỘ 13 sections. Đây chứa: kiến trúc 4-tab property panel, danh sách 102 block types, schema ví dụ cho data-table, chart, form, SPC, OEE, và tất cả requirements.

2. **Block Engine hiện tại (BLOCK_CATALOG + API_CATALOG + render functions):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/scripts/portal/00-block-engine.js`
   → Đọc TOÀN BỘ 4,331 dòng. Hiểu:
   - Dòng 1-50: Helpers (_t, _esc, _api, _fmt, _uid, _clone)
   - Dòng 52-98: BLOCK_CATALOG hiện tại (36 blocks, 5 categories)
   - Dòng 100-106: BLOCK_CATEGORIES (5 categories)
   - Dòng 109-377: API_CATALOG (246 endpoints, 10 modules)
   - Dòng 379+: Rendering functions, reactive binding, computed fields, event system, drag-drop, undo/redo, data table v3, keyboard shortcuts, IoT connectors, accessibility, virtual scroll, etc.

3. **Module Builder hiện tại (Properties Panel):**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/scripts/portal/31-module-builder.js`
   → Đọc TOÀN BỘ ~826 dòng. Đặc biệt chú ý:
   - Properties Panel (dòng 399-457): hiện chỉ có 5 trường cố định cho TẤT CẢ blocks
   - Block Library panel: cách blocks được hiển thị và thêm vào module

4. **Registry files (để hiểu data model):**
   - Field types: `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/field-types.json`
   - Status options: `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/status-options.json`
   - Data fields: `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/data-fields.json`
   - Computed formulas: `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/computed-formulas.json`
   - IoT connectors: `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/qms-data/registry/iot-connectors.json`

5. **CSS Design Tokens:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/01-QMS-Portal/styles/hesem-design-tokens.css`
   → Đọc để hiểu CSS custom properties (--blue, --green, --red, --text-primary, --bg-surface, --border, --radius-md, --shadow-xl, etc.)

6. **Module Architecture:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/core-standards/32-module-architecture-v2.md`

7. **Language Convention:**
   `https://raw.githubusercontent.com/sanhvo86-hesem/hesemqms/main/core-standards/35-language-convention.md`
   → QUY TẮC: Backend English, Frontend Vietnamese CÓ DẤU

### BƯỚC 2: NGHIÊN CỨU THẾ GIỚI

Sau khi đọc hết tài liệu, BẮT BUỘC search web và nghiên cứu CHUYÊN SÂU:

**Low-code platforms (widget types + property configuration):**
| Nền tảng | Search query | Trọng tâm |
|---|---|---|
| Appsmith | "appsmith widgets reference documentation" | 50 widgets, Content+Style tabs, Table widget 50+ properties |
| Appsmith Table | "appsmith table widget properties columns configuration" | Column types, inline editing, conditional formatting |
| Appsmith Chart | "appsmith chart widget echart configuration" | ECharts integration, multi-series, axis config |
| Appsmith Form | "appsmith form widget json form properties" | Form fields, validation, auto-generate from schema |
| Retool | "retool components reference documentation" | 150+ components, inspector 3-section layout |
| Retool Table | "retool table component configuration columns events" | 20+ column types, expandable rows, custom actions |
| Budibase | "budibase components documentation" | 35+ components |
| ToolJet | "tooljet widgets documentation" | 45-60+ components, Kanban |

**BI/Dashboard platforms (chart types + visualization properties):**
| Nền tảng | Search query | Trọng tâm |
|---|---|---|
| Apache ECharts | "echarts option documentation chart types" | 30+ chart types, option API reference |
| Power BI | "power bi visualization types properties" | 30+ visuals, conditional formatting, drill-down |
| Grafana | "grafana panel types documentation" | 26 panels, threshold config, alert rules |
| Tableau | "tableau chart types mark properties" | 24 types + 100 variations |

**Manufacturing/SCADA (industry-specific blocks):**
| Nền tảng | Search query | Trọng tâm |
|---|---|---|
| Ignition | "ignition scada perspective components" | HMI widgets: gauges, tanks, indicators |
| ThingWorx | "thingworx mashup builder widgets" | IoT dashboard widgets |
| MachineMetrics | "machinemetrics oee dashboard" | OEE visualization, machine status |
| Minitab | "minitab control chart types spc" | SPC chart types, control rules |
| InfinityQS | "infinityqs spc chart configuration" | Real-time SPC monitoring |

**Design tools (styling properties):**
| Nền tảng | Search query | Trọng tâm |
|---|---|---|
| Figma | "figma design panel properties" | Auto-layout, fill, stroke, effects, typography |
| Webflow | "webflow style panel css properties" | Full CSS property panel, responsive |

### BƯỚC 3: TẠO OUTPUT

Dựa trên tài liệu đã đọc + nghiên cứu thế giới, tạo **4 outputs** theo thứ tự:

---

#### OUTPUT 1: BLOCK_CATALOG + BLOCK_CATEGORIES (nhỏ, làm trước)

Tạo JavaScript object với 102+ block types và 12 categories.

Format CHÍNH XÁC:
```javascript
var BLOCK_CATALOG = {
  'block-key': {
    label: 'Tiếng Việt CÓ DẤU',
    labelEn: 'English Label',
    category: 'category-key',
    icon: 'emoji',
    desc: 'Mô tả tiếng Việt CÓ DẤU',
    descEn: 'English description'
  },
  // ... 102+ entries
};

var BLOCK_CATEGORIES = [
  { key: 'layout',   label: 'Bố cục',              labelEn: 'Layout',          color: '#3b82f6', icon: '📐' },
  { key: 'data',     label: 'Dữ liệu',             labelEn: 'Data Display',    color: '#16a34a', icon: '📊' },
  { key: 'kpi',      label: 'KPI & Chỉ số',         labelEn: 'KPI & Metrics',   color: '#0891b2', icon: '📈' },
  { key: 'chart',    label: 'Biểu đồ',             labelEn: 'Charts',          color: '#d97706', icon: '📉' },
  { key: 'form',     label: 'Biểu mẫu',            labelEn: 'Forms',           color: '#7c3aed', icon: '📝' },
  { key: 'action',   label: 'Hành động',            labelEn: 'Actions',         color: '#dc2626', icon: '🔧' },
  { key: 'media',    label: 'Phương tiện',           labelEn: 'Media & Content', color: '#ec4899', icon: '🖼' },
  { key: 'mfg',      label: 'Sản xuất',             labelEn: 'Manufacturing',   color: '#059669', icon: '🏭' },
  { key: 'nav',      label: 'Điều hướng',            labelEn: 'Navigation',      color: '#6366f1', icon: '🧭' },
  { key: 'comm',     label: 'Giao tiếp',             labelEn: 'Communication',   color: '#f43f5e', icon: '💬' },
  { key: 'advanced', label: 'Nâng cao',              labelEn: 'Advanced',        color: '#8b5cf6', icon: '⚙' },
  { key: 'iot',      label: 'IoT & Thời gian thực', labelEn: 'IoT & Realtime',  color: '#14b8a6', icon: '📡' },
];
```

Danh sách block types TỐI THIỂU (GPT phải nghiên cứu thêm và BỔ SUNG THÊM):

**layout (14):** page-header, section-header, two-column, three-column, grid-layout, card-container, tab-bar, accordion, modal-container, drawer-panel, spacer, divider, info-banner, stepper

**data (16):** data-table, data-table-editable, data-table-pivot, data-table-tree, data-cards, data-list, data-tree, data-timeline, data-gantt, data-detail, data-kanban, data-calendar, data-json-explorer, data-gallery, data-map, data-repeater

**kpi (8):** kpi-row, kpi-single, kpi-trend, kpi-gauge, kpi-progress-ring, kpi-target-vs-actual, kpi-countdown, kpi-scorecard

**chart (15):** chart-bar, chart-stacked-bar, chart-line, chart-area, chart-donut, chart-scatter, chart-bubble, chart-heatmap, chart-radar, chart-waterfall, chart-funnel, chart-treemap, chart-pareto, chart-sparkline, chart-combo

**form (12):** form-standard, form-wizard, form-inline, form-modal, form-search, form-json-schema, form-file-upload, form-signature, form-rating, form-checklist, form-cascading, form-barcode-scanner

**action (8):** action-toolbar, action-status-flow, action-quick-create, action-summary, action-export, action-dropdown-menu, action-breadcrumb, action-pagination

**media (6):** media-image, media-document-viewer, media-video, content-rich-text, content-markdown, content-iframe

**mfg (6):** mfg-machine-status, mfg-spc-chart, mfg-oee-dashboard, mfg-routing-table, mfg-bom-tree, mfg-inspection-form

**nav (5):** nav-sidebar-menu, nav-breadcrumb-trail, nav-page-tabs, nav-step-indicator, nav-quick-links

**comm (4):** comm-comment-thread, comm-activity-feed, comm-notification-list, comm-chat-widget

**advanced (4):** adv-code-editor, adv-formula-builder, adv-conditional-logic, adv-api-tester

**iot (4):** iot-live-value, iot-alarm-banner, iot-trend-chart, iot-machine-layout

**→ Tối thiểu 102. GPT PHẢI tìm thêm block types từ Appsmith, Retool, Power BI, Grafana mà danh sách trên chưa có → THÊM VÀO.**

---

#### OUTPUT 2: BLOCK_PROPERTIES_SCHEMA — Part A (layout + data + kpi blocks)

Tạo JavaScript object chứa property schema cho ~38 blocks.

Format CHÍNH XÁC (xem ví dụ đầy đủ trong GPT-MODULE-BUILDER-UPGRADE-GUIDE.md Section 3):

```javascript
var BLOCK_PROPERTIES_SCHEMA = {
  'block-key': {
    tabs: [
      {
        key: 'general',
        label: 'Cơ bản',
        labelEn: 'General',
        icon: '⚙',
        sections: [
          {
            key: 'section-key',
            label: 'Tiếng Việt CÓ DẤU',
            labelEn: 'English',
            collapsed: false,
            fields: [
              {
                key: 'path.to.property',
                label: 'Tiếng Việt CÓ DẤU',
                labelEn: 'English',
                type: 'text|number|toggle|select|color|expression|api-select|field-select|column-editor|...',
                default: 'default_value',
                options: [], // for select type
                min: 0, max: 100, step: 1, // for number type
                unit: 'px', // for number type
                placeholder: '', // for text type
                showWhen: 'expression', // conditional show
                helpText: 'tooltip text'
              }
            ]
          }
        ]
      },
      {
        key: 'data',
        label: 'Dữ liệu',
        labelEn: 'Data',
        icon: '📊',
        sections: [ /* KHÁC NHAU THEO BLOCK TYPE */ ]
      },
      {
        key: 'style',
        label: 'Đồ họa',
        labelEn: 'Style',
        icon: '🎨',
        sections: [ /* CHUNG — xem Section 5 trong guide */ ]
      },
      {
        key: 'events',
        label: 'Sự kiện',
        labelEn: 'Events',
        icon: '⚡',
        sections: [ /* KHÁC NHAU THEO BLOCK TYPE */ ]
      }
    ]
  }
};
```

**MỖI BLOCK PHẢI CÓ ĐẦY ĐỦ 4 TABS.** Tab General và Style gần giống nhau giữa các blocks. Tab Data và Events KHÁC NHAU HOÀN TOÀN.

Targets cho Part A:
- data-table: 60+ properties (tham khảo Appsmith Table Widget — đọc docs.appsmith.com/reference/widgets/table)
- data-kanban: 35+ properties
- data-gantt: 30+ properties
- data-calendar: 25+ properties
- kpi-row: 30+ properties
- kpi-gauge: 25+ properties
- Mỗi layout block: 15-25 properties
- Tổng Part A: ~1,200 properties

---

#### OUTPUT 3: BLOCK_PROPERTIES_SCHEMA — Part B (chart + form blocks)

~27 blocks. Targets:
- chart-bar/line/area: 45+ properties each (tham khảo ECharts option API)
- chart-pareto: 35+ properties
- chart-radar: 30+ properties
- form-standard: 50+ properties (tham khảo Appsmith Form Widget)
- form-checklist: 35+ properties (cho inspection QMS)
- Mỗi chart: 30-45 properties
- Mỗi form: 25-50 properties
- Tổng Part B: ~1,000 properties

---

#### OUTPUT 4: BLOCK_PROPERTIES_SCHEMA — Part C (action + media + mfg + nav + comm + adv + iot blocks)

~37 blocks. Targets:
- mfg-spc-chart: 45+ properties (tham khảo Minitab SPC, InfinityQS)
- mfg-oee-dashboard: 40+ properties (tham khảo MachineMetrics)
- mfg-machine-status: 35+ properties (tham khảo Ignition SCADA)
- mfg-inspection-form: 40+ properties (tham khảo AS9102 FAI)
- Mỗi action/media/nav/comm block: 15-25 properties
- Tổng Part C: ~800 properties

---

### QUY TẮC CODE BẮT BUỘC:

1. **Vanilla JavaScript ES5** — không dùng arrow functions, class, const/let, template literals, destructuring, spread operator
   - Dùng `var` thay cho `const/let`
   - Dùng `function(){}` thay cho `()=>{}`
   - Dùng `'string ' + variable` thay cho backtick templates
2. **IIFE pattern** — tất cả code nằm trong `(function(){ 'use strict'; ... })();`
3. **Vietnamese CÓ DẤU** cho tất cả labels (label, desc, section labels, field labels)
4. **English** cho tất cả key names, variable names, property paths
5. **Sử dụng CSS custom properties** từ hesem-design-tokens.css (var(--blue), var(--text-primary), etc.)
6. **JSON hợp lệ** cho tất cả default values

### PERFORMANCE EXPECTATIONS:

| Metric | Minimum | Target |
|---|---|---|
| Block types trong BLOCK_CATALOG | 102 | 120+ |
| Block categories | 12 | 12+ |
| Properties cho data-table | 50 | 65+ |
| Properties cho chart (avg) | 30 | 40+ |
| Properties cho form-standard | 40 | 55+ |
| Properties cho mfg-spc-chart | 35 | 50+ |
| Style properties (common per block) | 30 | 40+ |
| Event handlers per block (avg) | 8 | 12+ |
| Custom editor widget types | 15 | 22+ |
| TỔNG properties across all blocks | 2,500 | 3,500+ |

### QUY TẮC "NẾU NGHI NGỜ → THÊM VÀO":
- Nếu Appsmith có property mà HESEM chưa có → THÊM
- Nếu Retool có component type mà danh sách chưa có → THÊM BLOCK MỚI
- Nếu Power BI chart có tính năng → THÊM property
- Nếu ECharts option API có config → THÊM property
- Nếu Grafana panel có threshold/alert config → THÊM property
- Nếu Minitab SPC có control rule → THÊM property
- Nếu tính năng hữu ích cho CNC aerospace → THÊM
- CHỈ bỏ qua nếu HOÀN TOÀN không liên quan

### BẮT ĐẦU NGAY. ĐỌC REPO TRƯỚC, NGHIÊN CỨU THẾ GIỚI, RỒI TẠO OUTPUT 1 TRƯỚC. KHÔNG HỎI THÊM.

## KẾT THÚC COPY ↑

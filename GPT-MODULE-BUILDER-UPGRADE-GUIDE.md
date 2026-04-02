# GPT Module Builder Upgrade Guide — HESEM QMS Portal

> **Mục đích:** Hướng dẫn GPT nâng cấp toàn diện hệ thống Module Builder — từ 36 block đơn giản lên 85+ block chuyên nghiệp, mỗi block có property panel riêng với nhiều tab cấu hình.
>
> **Phạm vi:** 2 file cần sửa:
> - `01-QMS-Portal/scripts/portal/00-block-engine.js` — BLOCK_CATALOG + render functions
> - `01-QMS-Portal/scripts/portal/31-module-builder.js` — Properties Panel + builder UI

---

## 0. RESEARCH MANDATE — BẮT BUỘC

> **CRITICAL:** Trước khi code, GPT PHẢI nghiên cứu sâu các nền tảng sau để đảm bảo mỗi block có đầy đủ tính năng ngang tầm thế giới.

### Nền tảng LOW-CODE phải nghiên cứu (block/widget types + properties):

| Nền tảng | URL Documentation | Trọng tâm |
|---|---|---|
| **Appsmith** | docs.appsmith.com/reference/widgets | 50 widgets, MỖI widget có Content + Style tabs riêng — ĐÂY LÀ MẪU CHÍNH |
| **Retool** | docs.retool.com/apps/reference/components | 150+ components, 3-section inspector (Content/Interaction/Appearance) |
| **Budibase** | docs.budibase.com/docs/components | 35+ components, Svelte-based |
| **ToolJet** | docs.tooljet.com/docs/widgets/overview | 45-60+ components, Kanban built-in |
| **OutSystems** | outsystemsui.outsystems.com | 30+ core + UI patterns |
| **Mendix** | docs.mendix.com/appstore/widgets | 45+ marketplace widgets |

### Nền tảng BI/DASHBOARD phải nghiên cứu (chart types + properties):

| Nền tảng | Trọng tâm |
|---|---|
| **Power BI** | 30+ visuals, conditional formatting, drill-down, DAX |
| **Tableau** | 24 chart types + 100 variations, mark properties |
| **Grafana** | 26 panels, time series, alerting thresholds |
| **Metabase** | 20 viz types, Sankey, Waterfall, Box plot |
| **Apache ECharts** | echarts.apache.org — THƯ VIỆN CHART JS CHÍNH, 30+ chart types |

### Nền tảng DESIGN phải nghiên cứu (styling properties):

| Nền tảng | Trọng tâm |
|---|---|
| **Figma** | Design tab: position, dimensions, fill, stroke, effects, typography, auto-layout |
| **Webflow** | 166 elements, CSS properties panel, responsive breakpoints |
| **Wix Blocks** | Settings / Design / Layout / Presets panels |

### Nền tảng MANUFACTURING phải nghiên cứu (industry-specific blocks):

| Nền tảng | Trọng tâm |
|---|---|
| **Ignition (Inductive Automation)** | SCADA components: gauges, tanks, pipes, machine status |
| **AVEVA/Wonderware** | InTouch HMI components: real-time trends, alarm banners |
| **Grafana Industrial** | OPC-UA panels, machine dashboards |
| **ThingWorx** | IoT dashboard widgets: gauges, value displays, state indicators |
| **MachineMetrics** | OEE dashboards, machine status boards |

### Chỉ thị:
1. **Search documentation** cho MỖI nền tảng ở trên
2. Cho MỖI loại block (table, chart, form, etc.) — so sánh properties giữa Appsmith/Retool/Power BI
3. **Bổ sung TẤT CẢ properties** mà các nền tảng hàng đầu có
4. **Bổ sung thêm block types** nếu phát hiện loại block hữu ích mà danh sách chưa có
5. **Target: 85-120 block types**, mỗi block có 15-60 properties riêng

---

## 1. TRẠNG THÁI HIỆN TẠI

### BLOCK_CATALOG hiện tại (36 blocks, 5 categories):

```
layout (10): page-header, kpi-row, tab-bar, filter-bar, section-header, spacer, info-banner, two-column, card-container, divider
data (9): data-table, data-cards, data-list, data-tree, data-timeline, data-gantt, data-detail, data-kanban, data-stat-compare
form (5): form-standard, form-wizard, form-inline, form-modal, form-search
chart (7): chart-bar, chart-stacked-bar, chart-donut, chart-line, chart-heatmap, chart-progress, chart-sparkline
action (5): action-toolbar, action-status-flow, action-quick-create, action-summary, action-export
```

### Properties Panel hiện tại (5 trường CỐ ĐỊNH cho TẤT CẢ blocks):
1. Title (VI)
2. Title (EN)
3. API Endpoint (dropdown)
4. Data Key
5. Visibility Condition

**VẤN ĐỀ:** Không có cấu hình riêng theo block type. Ví dụ: data-table không có column config, chart không có axis config, form không có field config.

---

## 2. MỤC TIÊU NÂNG CẤP

### 2.1 Block Catalog: 36 → 85+ block types, 5 → 12 categories

### 2.2 Property Panel: 1 flat form → 4-tab system với per-block-type sections

### 2.3 Mỗi block type có BLOCK_PROPERTIES_SCHEMA riêng

---

## 3. KIẾN TRÚC MỚI — BLOCK_PROPERTIES_SCHEMA

### Concept:
Mỗi block type có một schema định nghĩa TẤT CẢ properties của nó, tổ chức theo 4 tabs:

```javascript
var BLOCK_PROPERTIES_SCHEMA = {
  'data-table': {
    tabs: [
      {
        key: 'general',
        label: 'Cơ bản',
        labelEn: 'General',
        icon: '⚙',
        sections: [
          {
            key: 'identity',
            label: 'Thông tin',
            labelEn: 'Identity',
            collapsed: false,
            fields: [
              { key: 'title.vi', label: 'Tiêu đề (VI)', type: 'text', default: '' },
              { key: 'title.en', label: 'Tiêu đề (EN)', type: 'text', default: '' },
              { key: 'blockNotes', label: 'Ghi chú', type: 'textarea', default: '' }
            ]
          },
          {
            key: 'visibility',
            label: 'Hiển thị',
            labelEn: 'Visibility',
            collapsed: true,
            fields: [
              { key: 'visible', label: 'Hiển thị', type: 'toggle', default: true },
              { key: 'visibleWhen', label: 'Điều kiện', type: 'expression', default: '', placeholder: '{{ currentUser.role === "admin" }}' },
              { key: 'loadingAnimation', label: 'Skeleton loading', type: 'toggle', default: true },
              { key: 'heightMode', label: 'Chiều cao', type: 'select', options: ['auto','fixed','fill'], default: 'auto' },
              { key: 'fixedHeight', label: 'Chiều cao cố định (px)', type: 'number', default: 400, showWhen: 'heightMode === "fixed"' }
            ]
          }
        ]
      },
      {
        key: 'data',
        label: 'Dữ liệu',
        labelEn: 'Data',
        icon: '📊',
        sections: [
          {
            key: 'dataSource',
            label: 'Nguồn dữ liệu',
            fields: [
              { key: 'config.dataSource.api', label: 'API Endpoint', type: 'api-select', default: '' },
              { key: 'config.dataSource.dataKey', label: 'Data Key', type: 'text', default: '', placeholder: 'e.g. sales_orders' },
              { key: 'config.dataSource.autoRefresh', label: 'Tự động refresh', type: 'toggle', default: false },
              { key: 'config.dataSource.refreshInterval', label: 'Interval (giây)', type: 'number', default: 30, showWhen: 'config.dataSource.autoRefresh' }
            ]
          },
          {
            key: 'columns',
            label: 'Cấu hình cột',
            fields: [
              { key: 'config.columns', label: 'Danh sách cột', type: 'column-editor', default: [] }
              // column-editor là custom widget: cho phép thêm/xóa/kéo-thả cột
              // mỗi cột có: field, label, type, width, visible, frozen, sortable, filterable, format, conditionalFormatting
            ]
          },
          {
            key: 'pagination',
            label: 'Phân trang',
            fields: [
              { key: 'config.pagination.enabled', label: 'Phân trang', type: 'toggle', default: true },
              { key: 'config.pagination.serverSide', label: 'Server-side', type: 'toggle', default: false },
              { key: 'config.pagination.rowsPerPage', label: 'Số dòng/trang', type: 'select', options: [10,20,50,100], default: 20 },
              { key: 'config.pagination.infiniteScroll', label: 'Cuộn vô hạn', type: 'toggle', default: false }
            ]
          },
          {
            key: 'features',
            label: 'Tính năng',
            fields: [
              { key: 'config.searchEnabled', label: 'Thanh tìm kiếm', type: 'toggle', default: true },
              { key: 'config.filterEnabled', label: 'Bộ lọc cột', type: 'toggle', default: true },
              { key: 'config.sortEnabled', label: 'Sắp xếp', type: 'toggle', default: true },
              { key: 'config.inlineEdit', label: 'Chỉnh sửa tại chỗ', type: 'toggle', default: false },
              { key: 'config.editMode', label: 'Chế độ edit', type: 'select', options: ['cell','row','batch'], default: 'row', showWhen: 'config.inlineEdit' },
              { key: 'config.rowSelection', label: 'Chọn dòng', type: 'select', options: ['none','single','multi'], default: 'single' },
              { key: 'config.expandableRows', label: 'Dòng mở rộng', type: 'toggle', default: false },
              { key: 'config.frozenColumns', label: 'Cột cố định (trái)', type: 'number', default: 0 },
              { key: 'config.showRowNumbers', label: 'Số thứ tự', type: 'toggle', default: false },
              { key: 'config.stripedRows', label: 'Dòng kẻ sọc', type: 'toggle', default: true }
            ]
          },
          {
            key: 'export',
            label: 'Xuất dữ liệu',
            fields: [
              { key: 'config.exportCsv', label: 'CSV', type: 'toggle', default: true },
              { key: 'config.exportExcel', label: 'Excel', type: 'toggle', default: true },
              { key: 'config.exportPdf', label: 'PDF', type: 'toggle', default: false },
              { key: 'config.exportFileName', label: 'Tên file', type: 'text', default: '', placeholder: '{{ title }}_{{ date }}' }
            ]
          },
          {
            key: 'rowActions',
            label: 'Hành động trên dòng',
            fields: [
              { key: 'config.rowActions', label: 'Danh sách hành động', type: 'action-list', default: [] }
              // mỗi action có: label, icon, color, onClick (api call / navigate / open modal), confirmRequired
            ]
          }
        ]
      },
      {
        key: 'style',
        label: 'Đồ họa',
        labelEn: 'Style',
        icon: '🎨',
        sections: [
          // Xem Section 5 bên dưới — CHUNG CHO TẤT CẢ BLOCKS
        ]
      },
      {
        key: 'events',
        label: 'Sự kiện',
        labelEn: 'Events',
        icon: '⚡',
        sections: [
          {
            key: 'events',
            label: 'Sự kiện',
            fields: [
              { key: 'events.onRowClick', label: 'Khi nhấn dòng', type: 'event-action', default: null },
              { key: 'events.onRowSelect', label: 'Khi chọn dòng', type: 'event-action', default: null },
              { key: 'events.onCellClick', label: 'Khi nhấn ô', type: 'event-action', default: null },
              { key: 'events.onPageChange', label: 'Khi đổi trang', type: 'event-action', default: null },
              { key: 'events.onSort', label: 'Khi sắp xếp', type: 'event-action', default: null },
              { key: 'events.onFilter', label: 'Khi lọc', type: 'event-action', default: null },
              { key: 'events.onSearch', label: 'Khi tìm kiếm', type: 'event-action', default: null },
              { key: 'events.onRowEdit', label: 'Khi chỉnh sửa dòng', type: 'event-action', default: null },
              { key: 'events.onRowDelete', label: 'Khi xóa dòng', type: 'event-action', default: null },
              { key: 'events.onExport', label: 'Khi xuất file', type: 'event-action', default: null },
              { key: 'events.onLoad', label: 'Khi tải xong', type: 'event-action', default: null },
              { key: 'events.onRefresh', label: 'Khi refresh', type: 'event-action', default: null }
            ]
          }
        ]
      }
    ]
  },
  // ... schema cho 84 block types khác
};
```

---

## 4. DANH SÁCH 85+ BLOCK TYPES CẦN TẠO SCHEMA

### Category 1: LAYOUT — 14 blocks
```
page-header, section-header, two-column, three-column, grid-layout, card-container,
tab-bar, accordion, modal-container, drawer-panel, spacer, divider, info-banner, stepper
```

### Category 2: DATA DISPLAY — 16 blocks
```
data-table, data-table-editable, data-table-pivot, data-table-tree,
data-cards, data-list, data-tree, data-timeline, data-gantt, data-detail,
data-kanban, data-calendar, data-json-explorer, data-gallery, data-map, data-repeater
```

### Category 3: KPI & METRICS — 8 blocks
```
kpi-row, kpi-single, kpi-trend, kpi-gauge, kpi-progress-ring,
kpi-target-vs-actual, kpi-countdown, kpi-scorecard
```

### Category 4: CHARTS — 15 blocks
```
chart-bar, chart-stacked-bar, chart-line, chart-area, chart-donut,
chart-scatter, chart-bubble, chart-heatmap, chart-radar, chart-waterfall,
chart-funnel, chart-treemap, chart-pareto, chart-sparkline, chart-combo
```

### Category 5: FORMS — 12 blocks
```
form-standard, form-wizard, form-inline, form-modal, form-search,
form-json-schema, form-file-upload, form-signature, form-rating,
form-checklist, form-cascading, form-barcode-scanner
```

### Category 6: ACTIONS — 8 blocks
```
action-toolbar, action-status-flow, action-quick-create, action-summary,
action-export, action-dropdown-menu, action-breadcrumb, action-pagination
```

### Category 7: MEDIA & CONTENT — 6 blocks
```
media-image, media-document-viewer, media-video,
content-rich-text, content-markdown, content-iframe
```

### Category 8: MANUFACTURING — 6 blocks
```
mfg-machine-status, mfg-spc-chart, mfg-oee-dashboard,
mfg-routing-table, mfg-bom-tree, mfg-inspection-form
```

### Category 9: NAVIGATION — 5 blocks (MỚI — GPT nghiên cứu thêm)
```
nav-sidebar-menu, nav-breadcrumb-trail, nav-page-tabs,
nav-step-indicator, nav-quick-links
```

### Category 10: COMMUNICATION — 4 blocks (MỚI — GPT nghiên cứu thêm)
```
comm-comment-thread, comm-activity-feed, comm-notification-list, comm-chat-widget
```

### Category 11: ADVANCED — 4 blocks (MỚI — GPT nghiên cứu thêm)
```
adv-code-editor, adv-formula-builder, adv-conditional-logic, adv-api-tester
```

### Category 12: IOT & REALTIME — 4 blocks (MỚI — GPT nghiên cứu thêm)
```
iot-live-value, iot-alarm-banner, iot-trend-chart, iot-machine-layout
```

**Tổng: 102 blocks, 12 categories — GPT tìm thêm nếu thiếu**

---

## 5. STYLE TAB — CHUNG CHO TẤT CẢ BLOCKS

Tất cả blocks PHẢI có Style tab với các sections sau:

```javascript
// Style tab sections — COMMON TO ALL BLOCKS
{
  key: 'style',
  label: 'Đồ họa',
  labelEn: 'Style',
  icon: '🎨',
  sections: [
    {
      key: 'dimensions',
      label: 'Kích thước',
      labelEn: 'Dimensions',
      fields: [
        { key: 'style.width', label: 'Chiều rộng', type: 'size', options: ['auto','100%','px','%'], default: '100%' },
        { key: 'style.maxWidth', label: 'Chiều rộng tối đa', type: 'size', default: 'none' },
        { key: 'style.minWidth', label: 'Chiều rộng tối thiểu', type: 'size', default: '0' },
        { key: 'style.padding', label: 'Padding', type: 'spacing-4', default: [16,16,16,16] }, // T,R,B,L
        { key: 'style.margin', label: 'Margin', type: 'spacing-4', default: [0,0,16,0] }
      ]
    },
    {
      key: 'background',
      label: 'Nền',
      labelEn: 'Background',
      fields: [
        { key: 'style.backgroundColor', label: 'Màu nền', type: 'color', default: 'transparent' },
        { key: 'style.backgroundGradient', label: 'Gradient', type: 'gradient', default: null },
        { key: 'style.backgroundImage', label: 'Hình nền URL', type: 'text', default: '' },
        { key: 'style.opacity', label: 'Độ mờ', type: 'slider', min: 0, max: 1, step: 0.05, default: 1 }
      ]
    },
    {
      key: 'border',
      label: 'Viền',
      labelEn: 'Border',
      fields: [
        { key: 'style.borderStyle', label: 'Kiểu viền', type: 'select', options: ['none','solid','dashed','dotted'], default: 'none' },
        { key: 'style.borderWidth', label: 'Độ dày viền', type: 'number', unit: 'px', default: 1 },
        { key: 'style.borderColor', label: 'Màu viền', type: 'color', default: 'var(--border)' },
        { key: 'style.borderRadius', label: 'Bo góc', type: 'corners-4', default: [8,8,8,8] } // TL,TR,BR,BL
      ]
    },
    {
      key: 'shadow',
      label: 'Bóng đổ',
      labelEn: 'Shadow',
      fields: [
        { key: 'style.boxShadow', label: 'Bóng ngoài', type: 'shadow', default: 'none' },
        // shadow editor: X, Y, Blur, Spread, Color
        { key: 'style.innerShadow', label: 'Bóng trong', type: 'shadow', default: 'none' }
      ]
    },
    {
      key: 'typography',
      label: 'Kiểu chữ',
      labelEn: 'Typography',
      showForTypes: ['page-header','section-header','kpi-single','kpi-row','content-rich-text','content-markdown','info-banner','action-summary'],
      fields: [
        { key: 'style.fontFamily', label: 'Font', type: 'font-select', default: 'inherit' },
        { key: 'style.fontSize', label: 'Cỡ chữ', type: 'number', unit: 'px', default: 14 },
        { key: 'style.fontWeight', label: 'Độ đậm', type: 'select', options: ['normal','500','600','700','800'], default: 'normal' },
        { key: 'style.textColor', label: 'Màu chữ', type: 'color', default: 'var(--text-primary)' },
        { key: 'style.lineHeight', label: 'Chiều cao dòng', type: 'number', step: 0.1, default: 1.5 },
        { key: 'style.letterSpacing', label: 'Khoảng cách chữ', type: 'number', unit: 'px', default: 0 },
        { key: 'style.textAlign', label: 'Căn chỉnh', type: 'align-select', options: ['left','center','right','justify'], default: 'left' },
        { key: 'style.textTransform', label: 'Biến đổi', type: 'select', options: ['none','uppercase','lowercase','capitalize'], default: 'none' }
      ]
    },
    {
      key: 'colors',
      label: 'Bảng màu',
      labelEn: 'Colors',
      showForTypes: ['chart-*','kpi-*','data-kanban','data-gantt','action-status-flow','mfg-*'],
      fields: [
        { key: 'style.primaryColor', label: 'Màu chính', type: 'color', default: 'var(--blue)' },
        { key: 'style.secondaryColor', label: 'Màu phụ', type: 'color', default: 'var(--gray-400)' },
        { key: 'style.successColor', label: 'Màu thành công', type: 'color', default: 'var(--green)' },
        { key: 'style.warningColor', label: 'Màu cảnh báo', type: 'color', default: 'var(--amber)' },
        { key: 'style.errorColor', label: 'Màu lỗi', type: 'color', default: 'var(--red)' },
        { key: 'style.colorPalette', label: 'Palette biểu đồ', type: 'color-palette', default: ['#3b82f6','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d'] }
      ]
    },
    {
      key: 'animation',
      label: 'Hiệu ứng',
      labelEn: 'Animation',
      fields: [
        { key: 'style.enterAnimation', label: 'Hiệu ứng xuất hiện', type: 'select', options: ['none','fadeIn','slideUp','slideLeft','zoomIn','bounceIn'], default: 'none' },
        { key: 'style.animationDuration', label: 'Thời lượng (ms)', type: 'number', default: 300, showWhen: 'style.enterAnimation !== "none"' },
        { key: 'style.animationDelay', label: 'Độ trễ (ms)', type: 'number', default: 0, showWhen: 'style.enterAnimation !== "none"' }
      ]
    },
    {
      key: 'responsive',
      label: 'Responsive',
      labelEn: 'Responsive',
      fields: [
        { key: 'style.hideOnMobile', label: 'Ẩn trên điện thoại', type: 'toggle', default: false },
        { key: 'style.hideOnTablet', label: 'Ẩn trên tablet', type: 'toggle', default: false },
        { key: 'style.mobileLayout', label: 'Layout mobile', type: 'select', options: ['inherit','stack','collapse','hide'], default: 'inherit' },
        { key: 'style.mobileOrder', label: 'Thứ tự mobile', type: 'number', default: 0 }
      ]
    },
    {
      key: 'conditionalStyle',
      label: 'Định dạng có điều kiện',
      labelEn: 'Conditional Formatting',
      fields: [
        { key: 'style.conditionalRules', label: 'Quy tắc', type: 'conditional-rules', default: [] }
        // mỗi rule: { condition: '{{ data.scrap_rate > 5 }}', style: { backgroundColor: '#fee2e2', borderColor: '#dc2626' } }
      ]
    },
    {
      key: 'darkMode',
      label: 'Chế độ tối',
      labelEn: 'Dark Mode',
      fields: [
        { key: 'style.dark.backgroundColor', label: 'Màu nền (dark)', type: 'color', default: '' },
        { key: 'style.dark.textColor', label: 'Màu chữ (dark)', type: 'color', default: '' },
        { key: 'style.dark.borderColor', label: 'Màu viền (dark)', type: 'color', default: '' }
      ]
    },
    {
      key: 'cssOverride',
      label: 'CSS tùy chỉnh',
      labelEn: 'Custom CSS',
      collapsed: true,
      fields: [
        { key: 'style.cssClass', label: 'CSS Class', type: 'text', default: '' },
        { key: 'style.cssInline', label: 'Inline CSS', type: 'code', language: 'css', default: '' }
      ]
    }
  ]
}
```

---

## 6. DATA TAB — MỖI BLOCK TYPE KHÁC NHAU

Dưới đây là DATA tab schema CHI TIẾT cho từng loại block. GPT PHẢI tạo schema đầy đủ cho TẤT CẢ 102 blocks.

### 6.1 data-table (Bảng dữ liệu)
Tham khảo: Appsmith Table Widget (50+ properties), Retool Table Component

**Sections:** Data Source, Columns, Pagination, Search & Filter, Row Selection, Sorting, Editable, Export, Row Actions

**Column Editor** (custom widget cho mỗi cột):
- field (key trong data)
- label (hiển thị)
- type: text | number | currency | percent | date | datetime | badge | tags | image | link | button | checkbox | progress | rating | sparkline | color | custom
- width (px hoặc flex)
- minWidth, maxWidth
- visible (toggle)
- frozen (left/right/none)
- sortable (toggle)
- filterable (toggle)
- filterType: text | number-range | date-range | select | boolean
- format (format string, e.g. "#,##0.00", "DD/MM/YYYY")
- align: left | center | right
- wrapText (toggle)
- conditionalFormatting: rules[]
  - condition expression
  - backgroundColor, textColor, fontWeight, icon, badge color

### 6.2 chart-bar / chart-line / chart-area / chart-combo
Tham khảo: Apache ECharts options, Power BI bar chart properties

**Sections:**
- Chart Config: chartType, orientation (horizontal/vertical), stacked, normalized
- Data Source: api, dataKey, seriesConfig[]
- X Axis: fieldKey, label, format, rotation, gridLines, tickInterval
- Y Axis: fieldKey, label, min, max, adaptiveScaling, format, gridLines
- Y Axis 2 (dual axis): enabled, fieldKey, label, min, max
- Series: list of series with name, field, color, type (bar/line for combo), opacity, borderRadius
- Legend: show, position (top/bottom/left/right), align
- Tooltip: show, customTemplate ({{ }})
- Reference Lines: list with value, label, color, style (solid/dashed), axis (x/y)
- Threshold Zones: list with from, to, color, opacity, label
- Annotations: point annotations with x, y, label, icon
- Drill-down: enabled, targetPage, parameterField
- Data Labels: show, position (inside/outside/top), format, fontSize

### 6.3 chart-donut
**Sections:**
- Data Source: api, dataKey
- Donut Config: innerRadius (%), outerRadius, startAngle, padAngle
- Labels: show, position (inside/outside), format, connector lines
- Legend: show, position
- Center Content: show, label, value field, format
- Interaction: onSliceClick, explodeOnClick, highlight on hover

### 6.4 chart-scatter / chart-bubble
**Sections:**
- Data Source: api, dataKey
- X Axis: field, label, scale (linear/log), min, max
- Y Axis: field, label, scale, min, max
- Point Config: sizeField (for bubble), colorField, shapeField, minSize, maxSize
- Regression Line: show, type (linear/polynomial/exponential)
- Quadrant Lines: show, xValue, yValue, labels[]

### 6.5 chart-radar
**Sections:**
- Data Source: api, dataKey
- Axes: fieldKeys[] with labels and max values
- Series: list with name, fields, color, fillOpacity
- Grid: show, shape (circle/polygon), levels
- Useful for: Supplier Scorecard (Quality/Delivery/Cost/Service)

### 6.6 chart-waterfall
**Sections:**
- Data Source: api, dataKey
- Config: categoryField, valueField, totalLabel
- Colors: increaseColor, decreaseColor, totalColor
- Connectors: show, lineStyle
- Useful for: COPQ breakdown (Prevention → Appraisal → Internal Failure → External Failure → Total)

### 6.7 chart-pareto
**Sections:**
- Data Source: api, dataKey
- Config: categoryField, countField, cumulativeField
- Bar: color, barWidth
- Cumulative Line: show, color, style
- 80/20 Line: show, color, threshold(%)
- Useful for: Defect analysis, NCR root causes, reject reasons

### 6.8 chart-funnel
**Sections:**
- Data Source: api, dataKey
- Config: stageField, valueField, orientation (vertical/horizontal)
- Labels: show, position, format, showConversion%
- Colors: colorField or palette
- Useful for: Quote → SO conversion, APQP phase progression

### 6.9 chart-heatmap
**Sections:**
- Data Source: api, dataKey
- Config: xField, yField, valueField
- Color Scale: minColor, midColor, maxColor, steps
- Cell: showValue, valueFormat, cellSize, cellGap
- Useful for: Machine utilization × day, Defect type × department

### 6.10 chart-treemap
**Sections:**
- Data Source: api, dataKey
- Config: categoryField, valueField, parentField (for hierarchy)
- Colors: colorField or palette
- Labels: show, fontSize, position
- Drill-down: enabled, levels

### 6.11 form-standard
Tham khảo: Appsmith Form Widget, Retool Form, Appsmith JSON Form

**Sections:**
- Data Source: submitApi (POST), prefillApi (GET), prefillDataKey
- Layout: columns (1/2/3/4), labelPosition (top/left/inline), labelWidth(px)
- Fields (field editor - drag-reorder):
  - key, label, labelEn, type (maps to field-types.json)
  - required, placeholder, defaultValue, helpText
  - validation: { min, max, pattern, patternMessage, custom expression }
  - conditionalVisibility: expression
  - columnSpan: 1-4
  - readOnly: toggle
  - options: for select/tags (static list or api-driven)
  - dependsOn: cascading dropdown parent field
- Actions: submitLabel, cancelLabel, resetOnSubmit, showCancel, showReset
- Auto-save: enabled, interval(sec)
- Confirm: showConfirmDialog, confirmMessage

### 6.12 form-wizard
**Sections:**
- Steps (step editor - drag-reorder):
  - stepLabel, stepIcon, fields[] (same as form-standard fields)
  - validation: per-step validation before next
  - skipCondition: expression
- Navigation: showStepNumbers, allowSkip, showProgressBar
- Submit: submitApi, submitOnLastStep

### 6.13 form-checklist
**Sections:**
- Data Source: api for checklist template, save api
- Checklist Items (editor):
  - item text, category/section, required, type (pass/fail, yes/no, NA, measurement, text note)
  - measurementConfig: { unit, nominal, usl, lsl, precision }
  - photoRequired: toggle
  - signatureRequired: toggle
- Layout: sections, showProgress, showCompletion%
- Useful for: Incoming inspection, Audit checklist, FAI form, Process checklist

### 6.14 data-kanban
Tham khảo: ToolJet Kanban, Jira board

**Sections:**
- Data Source: api, dataKey
- Column Config:
  - statusField (field used for column grouping)
  - columns[] (each: statusValue, label, color, wipLimit, collapsed)
- Card Template:
  - titleField, subtitleField, assigneeField (show avatar), priorityField (show badge)
  - dueDateField (show overdue indicator), tagFields[], customFields[]
  - coverImageField (optional top image)
- Drag & Drop: enabled, transitionApi, allowedTransitions (from→to matrix)
- Swimlanes: enabled, groupField (e.g. priority or assignee)
- Quick Add: enabled, requiredFields

### 6.15 data-gantt
**Sections:**
- Data Source: api, dataKey
- Config: taskNameField, startField, endField, progressField, assigneeField, dependencyField
- Timeline: viewMode (day/week/month/quarter), startDate, endDate
- Appearance: barHeight, barRadius, barColor field or static, milestoneIcon
- Dependencies: show, lineStyle (solid/dashed), arrowStyle
- Critical Path: show, color
- Resource View: enabled, resourceField, showOverallocation

### 6.16 data-calendar
Tham khảo: ToolJet Calendar, Airtable Calendar

**Sections:**
- Data Source: api, dataKey
- Config: titleField, startField, endField, allDayField, colorField
- View: defaultView (month/week/day/agenda), showWeekends, firstDayOfWeek
- Events: onEventClick, onDateClick, onEventDrag, onViewChange
- New Event: enabled, createApi, quickAddFields

### 6.17 data-map
Tham khảo: Appsmith Map Widget, Retool Mapbox

**Sections:**
- Data Source: api, dataKey
- Config: latField, lngField, labelField, colorField, sizeField
- Map: defaultCenter, defaultZoom, mapStyle (street/satellite/dark)
- Markers: icon, clusterEnabled, popupTemplate
- Heatmap: enabled, intensityField

### 6.18 kpi-row
**Sections:**
- Data Source: api, dataKey
- Cards (card editor - drag-reorder, max 8):
  - valueField, label, labelEn, icon, format (number/currency/percent/integer)
  - trendField, trendPeriod, trendDirection (up-good/up-bad)
  - targetField, showTarget, targetLabel
  - color, backgroundColor
  - onClick action (navigate, open modal, refresh)
  - sparklineField (mini chart below value)
- Layout: cardsPerRow (2/3/4/6/8), cardMinWidth, gap

### 6.19 kpi-gauge
Tham khảo: Grafana Gauge, Power BI Gauge

**Sections:**
- Data Source: api, dataKey, valueField
- Config: min, max, unit, format
- Thresholds: list of { value, color, label } — e.g. 0-60 red, 60-85 amber, 85-100 green
- Appearance: gaugeType (full-circle/half-circle/linear), showNeedle, showValue, showMin, showMax
- Target: targetValue, showTarget, targetColor

### 6.20 mfg-machine-status
**Sections:**
- Data Source: IoT connector, pollingInterval
- Config: machineIdField, machineNameField
- Status Indicators:
  - statusField, statusColors (running→green, idle→gray, alarm→red, maintenance→amber, offline→dark)
  - alarmCodeField, alarmTextField
- Live Values: list of { field, label, unit, format, threshold } — spindle speed, feed rate, part count, etc.
- Layout: compact/detailed/card

### 6.21 mfg-spc-chart
Tham khảo: Minitab, InfinityQS

**Sections:**
- Data Source: api or IoT connector
- Chart Type: xbar-r, xbar-s, i-mr, p, np, c, u
- Measurement: characteristicField, subgroupSize, subgroupField
- Specification Limits: usl, lsl, target (nominal)
- Control Limits: autoCalculate (toggle), custom UCL, LCL, CL
- Rules: westernElectricRules (toggle), nelsonRules (toggle), customRules[]
- Alerts: enabled, emailNotification, escalationLevel
- Statistics Panel: show Cpk, Ppk, Mean, StDev, histogramOverlay
- Annotations: show out-of-control points, highlight patterns

### 6.22 mfg-oee-dashboard
**Sections:**
- Data Source: api, machines (multi-select or all)
- Config: periodField (shift/day/week/month)
- OEE Components:
  - availabilityFormula, performanceFormula, qualityFormula
  - plannedProductionTime, actualRunTime, idealCycleTime, totalParts, goodParts
- Targets: oeeTarget, availabilityTarget, performanceTarget, qualityTarget
- Display: showOeeCircle, showComponentBars, showTrend, showLossCategorization
- Six Big Losses: breakdowns, setupAdjustment, smallStops, reducedSpeed, processDefects, reducedYield

### 6.23 mfg-bom-tree
**Sections:**
- Data Source: api, dataKey
- Config: parentField, childField, quantityField, unitField
- Display: expandLevel (default expand depth), showQuantity, showCost, showLeadTime
- Actions: onNodeClick, addChild, editNode
- Indented BOM view: toggle between tree and indented list

### 6.24 mfg-inspection-form
Tham khảo: AS9102 FAI form, ISO 2859-1

**Sections:**
- Template: inspectionType (first_piece, in_process, final, incoming)
- Characteristics (editor):
  - characteristicNumber, description, specification, tolerance, unit
  - measurementMethod, gageId, sampleSize, sampleFrequency
  - classificationType (critical/major/minor)
  - reactionPlan
- Sampling: planType (ANSI_Z14, C0, 100pct, custom), aqlLevel, inspectionLevel (I/II/III)
- Results: resultField, passFailAutoCalc, defectCodeList
- Attachments: photoCapture, cmmDataImport
- Signatures: inspectorSignature, approverSignature

---

## 7. EVENTS TAB — MỖI BLOCK TYPE KHÁC NHAU

### Event Actions (loại hành động khi sự kiện xảy ra):
```javascript
var EVENT_ACTION_TYPES = [
  { key: 'navigate', label: 'Chuyển trang', params: ['targetPage', 'queryParams'] },
  { key: 'openModal', label: 'Mở hộp thoại', params: ['modalBlockId'] },
  { key: 'openDrawer', label: 'Mở panel bên', params: ['drawerBlockId'] },
  { key: 'callApi', label: 'Gọi API', params: ['apiAction', 'payload', 'onSuccess', 'onError'] },
  { key: 'setVariable', label: 'Gán biến', params: ['variableName', 'value'] },
  { key: 'setFilter', label: 'Gán bộ lọc', params: ['targetBlockId', 'filterField', 'filterValue'] },
  { key: 'refreshBlock', label: 'Refresh block', params: ['targetBlockIds[]'] },
  { key: 'showNotification', label: 'Hiện thông báo', params: ['type', 'message', 'duration'] },
  { key: 'downloadFile', label: 'Tải file', params: ['url', 'fileName'] },
  { key: 'copyToClipboard', label: 'Sao chép', params: ['value'] },
  { key: 'customJs', label: 'JavaScript tùy chỉnh', params: ['code'] },
  { key: 'chain', label: 'Chuỗi hành động', params: ['actions[]'] }
];
```

### Events per block type (tối thiểu):
| Block Type | Events |
|---|---|
| ALL | onLoad, onVisible, onHidden, onRefresh, onError |
| data-table | + onRowClick, onRowSelect, onRowDoubleClick, onCellClick, onSort, onFilter, onPageChange, onSearch, onRowEdit, onRowSave, onRowDelete, onExport, onColumnResize |
| chart-* | + onDataPointClick, onLegendClick, onZoom, onBrushSelect, onAnimationEnd |
| form-* | + onSubmit, onSubmitSuccess, onSubmitError, onValidationFail, onChange, onFieldFocus, onFieldBlur, onReset, onCancel, onStepChange (wizard) |
| data-kanban | + onCardClick, onCardDrag, onCardDrop, onColumnChange, onWipExceeded |
| data-gantt | + onTaskClick, onTaskDrag, onTaskResize, onDependencyClick, onViewChange |
| data-calendar | + onEventClick, onDateClick, onEventDrag, onEventResize, onViewChange |
| kpi-* | + onClick, onThresholdBreached, onTrendChange |
| action-* | + onClick, onConfirm, onCancel |
| mfg-machine-status | + onStatusChange, onAlarm, onThresholdBreached, onConnectionLost |
| mfg-spc-chart | + onOutOfControl, onRuleViolation, onPatternDetected |
| form-file-upload | + onFileSelect, onUploadStart, onUploadProgress, onUploadComplete, onUploadError |
| form-barcode-scanner | + onScan, onScanError |
| comm-comment-thread | + onComment, onReply, onMention, onDelete |

---

## 8. CUSTOM FIELD TYPES TRONG PROPERTY EDITOR

Ngoài các field type cơ bản (text, number, toggle, select, color), Property Panel cần các custom editor widgets:

| Widget Type | Mô tả | Dùng cho |
|---|---|---|
| `api-select` | Dropdown chọn API từ API_CATALOG (grouped by module) | Data Source |
| `field-select` | Dropdown chọn field từ data-fields.json (dựa trên API đã chọn) | Column config, axis config |
| `column-editor` | Drag-reorder list, mỗi item có inline config panel | data-table columns |
| `field-editor` | Drag-reorder list cho form fields | form-standard, form-wizard |
| `series-editor` | Add/remove series, mỗi series có field, color, type | chart multi-series |
| `kpi-card-editor` | Card config list | kpi-row |
| `action-list` | Add/remove action buttons | row actions, toolbar |
| `event-action` | Dropdown chọn action type + config per action | Events tab |
| `expression` | Text input với syntax highlighting cho `{{ }}` | Visibility, computed |
| `conditional-rules` | Rule list: condition + style override | Conditional formatting |
| `color-palette` | 8-color palette picker | Chart colors |
| `spacing-4` | 4-input (T/R/B/L) với link toggle | Padding, Margin |
| `corners-4` | 4-input (TL/TR/BR/BL) với link toggle | Border radius |
| `shadow` | X/Y/Blur/Spread/Color inputs | Box shadow |
| `gradient` | Start color, End color, Direction | Background gradient |
| `size` | Number + unit selector (px/%) | Width, Height |
| `icon-select` | Searchable icon picker (emoji + custom icons) | Block icons, KPI icons |
| `font-select` | Font family dropdown with preview | Typography |
| `code` | Monaco-like code editor with syntax highlighting | CSS override, Custom JS |
| `checklist-editor` | Checklist item config for inspection forms | mfg-inspection-form |
| `threshold-editor` | Value + color pairs for gauges/SPC | kpi-gauge, mfg-spc-chart |

---

## 9. OUTPUT REQUIREMENTS

### File 1: BLOCK_CATALOG update (in 00-block-engine.js)
```javascript
var BLOCK_CATALOG = {
  // 102+ entries, each with:
  // label (Vietnamese có dấu), labelEn, category, icon, desc (Vietnamese), descEn
};

var BLOCK_CATEGORIES = [
  // 12 categories with key, label, labelEn, color, icon
];
```

### File 2: BLOCK_PROPERTIES_SCHEMA (NEW — in 00-block-engine.js or separate file)
```javascript
var BLOCK_PROPERTIES_SCHEMA = {
  // 102+ entries, each with full tabs/sections/fields schema
  // as described in sections 3-7 above
};
```

### File 3: Properties Panel renderer (in 31-module-builder.js)
- Replace current `_renderPropertiesPanel()` with tabbed panel
- Read schema from `BLOCK_PROPERTIES_SCHEMA[blockType]`
- Render tabs dynamically
- Render sections + fields per tab
- Custom editor widgets for complex field types
- Collapsible sections
- showWhen conditional fields
- Live preview of style changes

---

## 10. PERFORMANCE EXPECTATIONS

| Metric | Minimum | Target |
|---|---|---|
| Block types | 85 | 102-120 |
| Block categories | 10 | 12+ |
| Properties per data-table | 40 | 60+ |
| Properties per chart-* (avg) | 25 | 40+ |
| Properties per form-standard | 30 | 50+ |
| Properties per mfg-spc-chart | 25 | 40+ |
| Style properties (common) | 25 | 35+ |
| Event handlers per block (avg) | 5 | 8-15 |
| Custom editor widgets | 10 | 20+ |
| Total properties across all blocks | 2,000 | 3,500+ |

### Quy tắc "Nếu nghi ngờ → thêm vào":
- Nếu Appsmith Table Widget có property mà chúng tôi chưa có → THÊM VÀO
- Nếu Power BI chart có tính năng → THÊM VÀO
- Nếu Grafana panel có config option → THÊM VÀO
- Nếu ECharts có chart type mà chúng tôi chưa có → THÊM BLOCK MỚI
- Nếu tính năng hữu ích cho CNC aerospace manufacturing → THÊM VÀO
- CHỈ bỏ qua nếu HOÀN TOÀN không liên quan

### Phân chia output nếu quá lớn:
1. `BLOCK_CATALOG` + `BLOCK_CATEGORIES` (nhỏ, 1 output)
2. `BLOCK_PROPERTIES_SCHEMA` Part 1: layout + data blocks
3. `BLOCK_PROPERTIES_SCHEMA` Part 2: kpi + chart blocks
4. `BLOCK_PROPERTIES_SCHEMA` Part 3: form + action blocks
5. `BLOCK_PROPERTIES_SCHEMA` Part 4: media + mfg + nav + comm + adv + iot blocks
6. Properties Panel renderer code (31-module-builder.js)

---

## 11. FILES CẦN ĐỌC TRƯỚC KHI BẮT ĐẦU

| File | Lý do |
|---|---|
| `01-QMS-Portal/scripts/portal/00-block-engine.js` dòng 1-108 | BLOCK_CATALOG hiện tại |
| `01-QMS-Portal/scripts/portal/00-block-engine.js` dòng 109-377 | API_CATALOG (246 endpoints) |
| `01-QMS-Portal/scripts/portal/31-module-builder.js` dòng 399-457 | Properties Panel hiện tại |
| `01-QMS-Portal/qms-data/registry/field-types.json` | 25 field types |
| `01-QMS-Portal/qms-data/registry/status-options.json` | 27 enum sets |
| `01-QMS-Portal/qms-data/registry/data-fields.json` | 246 API field definitions |
| `01-QMS-Portal/qms-data/registry/computed-formulas.json` | 25 formula presets |
| `01-QMS-Portal/qms-data/registry/iot-connectors.json` | 9 IoT connectors |
| `01-QMS-Portal/styles/hesem-design-tokens.css` | CSS custom properties |
| `core-standards/35-language-convention.md` | Vietnamese có dấu rule |

---

## 12. LANGUAGE RULES

1. **JavaScript variable names:** English (camelCase or snake_case)
2. **BLOCK_CATALOG label:** Vietnamese CÓ DẤU (e.g., "Bảng dữ liệu", "Biểu đồ cột")
3. **BLOCK_CATALOG labelEn:** English (e.g., "Data Table", "Bar Chart")
4. **Property field labels in schema:** Vietnamese CÓ DẤU (e.g., "Tiêu đề", "Nguồn dữ liệu")
5. **KHÔNG BAO GIỜ** viết tiếng Việt thiếu dấu

---

## 13. QUICK START

1. Đọc tất cả files ở Section 11
2. **Search** Appsmith widget docs, Retool component docs, ECharts docs
3. Tạo `BLOCK_CATALOG` mới (102+ entries)
4. Tạo `BLOCK_CATEGORIES` mới (12 entries)
5. Tạo `BLOCK_PROPERTIES_SCHEMA` cho TẤT CẢ 102+ blocks
6. Viết `_renderPropertiesPanel()` mới với 4-tab system
7. Viết custom editor widgets (column-editor, field-editor, series-editor, etc.)

**REMEMBER: Đây là nền tảng cho TOÀN BỘ hệ thống module. Càng phong phú càng tốt. Target 3,500+ properties.**

---

**END OF GUIDE**

# HESEM QMS — Module Builder Architecture v1.0
# Hệ thống xây dựng module kiểu LEGO (Low-code Module Builder)

## 1. TỔNG QUAN

### Mục tiêu:
- User có thể **tạo module mới** từ template blocks
- User có thể **chỉnh sửa module có sẵn** (thêm/bớt/sắp xếp blocks)
- Mỗi block có thể **gắn API endpoint** để lấy/gửi dữ liệu
- Modules **lưu trữ dưới dạng JSON schema** → render runtime
- **10 modules mặc định** = 10 JSON schemas pre-built

### Tham khảo thế giới:
- **Appsmith**: Widget catalog + API query binding + JavaScript transformations
- **ToolJet**: Visual builder + 80+ integrations + real-time multiplayer
- **Retool**: 100+ components + drag-drop + AI capabilities
- **Notion**: Block-based editor + database views + templates

### Kiến trúc:
```
┌─────────────────────────────────────────────────────────┐
│                    MODULE BUILDER UI                      │
│  ┌──────────┐ ┌──────────────────────┐ ┌──────────────┐ │
│  │ Block    │ │ Canvas (Preview)     │ │ Properties   │ │
│  │ Library  │ │                      │ │ Panel        │ │
│  │          │ │ [Header Block]       │ │              │ │
│  │ 📊 KPI  │ │ [KPI Row Block]      │ │ Title: ...   │ │
│  │ 📋 Table│ │ [Filter Block]       │ │ API: ...     │ │
│  │ 📝 Form │ │ [Table Block]        │ │ Columns: ... │ │
│  │ 📈 Chart│ │ [Chart Block]        │ │ Filters: ... │ │
│  │ 🔍 Filter│ │                      │ │              │ │
│  │ ➕ More │ │                      │ │              │ │
│  └──────────┘ └──────────────────────┘ └──────────────┘ │
│                                                          │
│  [💾 Save Module] [👁 Preview] [🚀 Publish]            │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌────────────────┐   ┌────────────────┐
│ Module Schema  │   │ Block Engine   │
│ (JSON)         │   │ (Runtime)      │
│                │   │                │
│ modules/       │   │ Reads schema   │
│  M1-orders.json│   │ → renders HTML │
│  M2-quality.json│  │ → binds API    │
│  ...           │   │ → handles events│
└────────────────┘   └────────────────┘
```

## 2. MODULE SCHEMA FORMAT

Mỗi module được lưu dưới dạng JSON schema:

```json
{
  "moduleId": "orders",
  "title": { "vi": "Đơn hàng", "en": "Orders" },
  "icon": "📦",
  "route": "/orders",
  "roles": ["sales", "manager", "planner"],
  "version": 1,
  "createdBy": "admin",
  "createdAt": "2026-04-01T00:00:00+07:00",
  "tabs": [
    {
      "tabId": "tab-overview",
      "title": { "vi": "Tổng quan", "en": "Overview" },
      "icon": "📊",
      "blocks": [
        {
          "blockId": "blk-001",
          "type": "kpi-row",
          "visible": true,
          "order": 1,
          "config": {
            "items": [
              {
                "label": { "vi": "Đơn hoạt động", "en": "Active Orders" },
                "dataSource": { "api": "order_dashboard_kpi", "method": "GET", "field": "active_so_count" },
                "color": "var(--brand-2)",
                "format": "number"
              }
            ]
          }
        },
        {
          "blockId": "blk-002",
          "type": "filter-bar",
          "visible": true,
          "order": 2,
          "config": {
            "filters": [
              { "key": "search", "type": "search", "placeholder": { "vi": "Tìm kiếm...", "en": "Search..." } },
              { "key": "status", "type": "select", "options": ["draft","confirmed","shipped","closed"] }
            ]
          }
        },
        {
          "blockId": "blk-003",
          "type": "data-table",
          "visible": true,
          "order": 3,
          "config": {
            "dataSource": { "api": "order_so_list", "method": "GET", "dataKey": "sales_orders" },
            "columns": [
              { "key": "so_number", "label": { "vi": "Số SO", "en": "SO Number" }, "sortable": true, "filterable": true, "width": "140px" },
              { "key": "customer_name", "label": { "vi": "Khách hàng", "en": "Customer" }, "sortable": true, "filterable": true },
              { "key": "status", "label": { "vi": "Trạng thái", "en": "Status" }, "type": "badge", "filterable": true },
              { "key": "total_value", "label": { "vi": "Giá trị", "en": "Value" }, "type": "number", "align": "right", "sortable": true }
            ],
            "pagination": true,
            "pageSize": 25,
            "rowClick": { "action": "navigate-tab", "tab": "tab-detail", "passField": "so_number" },
            "features": {
              "columnResize": true,
              "columnReorder": true,
              "multiSort": true,
              "columnFilter": true,
              "globalSearch": true,
              "export": ["csv", "excel"],
              "inlineEdit": false
            }
          }
        }
      ]
    }
  ]
}
```

## 3. BLOCK LIBRARY (Thư viện Block mở rộng)

### 3.1 Layout Blocks
| Block Type | Mô tả | Configurable Properties |
|-----------|-------|------------------------|
| `page-header` | Tiêu đề trang + breadcrumb + action buttons | title, subtitle, actions[] |
| `kpi-row` | Dãy KPI cards (1-8 cards) | items[]: label, api, field, color, format, suffix |
| `tab-bar` | Thanh tab navigation | tabs[]: key, title, icon |
| `section-header` | Tiêu đề phân mục | text, level (h2/h3/h4), divider |
| `spacer` | Khoảng trắng | height (px) |
| `two-column` | Chia 2 cột | ratio (50-50, 60-40, 70-30), blocks per column |
| `card-container` | Card wrapper | title, collapsible, collapsed |
| `info-banner` | Banner thông báo | text, type (info/warning/error/success), dismissable |

### 3.2 Data Blocks
| Block Type | Mô tả | Key Config |
|-----------|-------|------------|
| `data-table` | Bảng dữ liệu nâng cao | api, columns[], pagination, sort, filter, resize, export, inlineEdit, rowClick |
| `data-cards` | Grid thẻ dữ liệu | api, columns (2-4), titleKey, subtitleKey, badgeKey, imageKey |
| `data-list` | Danh sách đơn giản | api, itemTemplate, actions[] |
| `data-tree` | Cây phân cấp | api, childrenKey, expandLevel |
| `data-timeline` | Dòng thời gian dọc | api, dateKey, titleKey, descKey, colorKey |
| `data-gantt` | Biểu đồ Gantt | api, rowKey, startKey, endKey, labelKey, colorKey |
| `data-kanban` | Kanban board | api, columnKey, columns[], cardTemplate |
| `data-detail` | Panel chi tiết 1 record | api, fields[], layout (grid/list) |
| `data-stat-compare` | So sánh 2 giá trị | api, currentKey, previousKey, label, format |

### 3.3 Form Blocks
| Block Type | Mô tả | Key Config |
|-----------|-------|------------|
| `form-standard` | Form tạo/sửa | api (submit), fields[], columns (1-3), validation |
| `form-wizard` | Form theo bước | steps[]: title, fields[], validation |
| `form-inline` | Chỉnh sửa inline 1 dòng | api, fields[] |
| `form-search` | Thanh tìm kiếm | api, placeholder, suggestions |
| `form-modal` | Form trong modal | triggerButton, title, fields[], api |

### 3.4 Chart Blocks
| Block Type | Mô tả | Key Config |
|-----------|-------|------------|
| `chart-bar` | Biểu đồ cột (ngang/dọc) | api, dataKey, labelKey, valueKey, orientation, colors |
| `chart-stacked-bar` | Cột xếp chồng | api, categories[], series[] |
| `chart-donut` | Biểu đồ tròn | api, items[], showLegend, centerValue |
| `chart-line` | Biểu đồ đường | api, xKey, yKeys[], showArea |
| `chart-heatmap` | Bản đồ nhiệt | api, rowKey, colKey, valueKey, colorScale |
| `chart-progress-ring` | Vòng tiến độ | value, max, label, size |
| `chart-sparkline` | Mini trend line | api, dataKey, width, height |

### 3.5 Action Blocks
| Block Type | Mô tả | Key Config |
|-----------|-------|------------|
| `action-toolbar` | Nhóm nút hành động | buttons[]: label, action, variant, icon, api |
| `action-fab` | Floating action button (mobile) | icon, action, api |
| `action-status-flow` | Workflow status buttons | currentStatus, transitions, api |
| `action-quick-create` | Nút tạo nhanh + modal form | title, fields[], api |

### 3.6 Filter Blocks
| Block Type | Mô tả | Key Config |
|-----------|-------|------------|
| `filter-bar` | Thanh lọc ngang | filters[]: key, type, options, placeholder |
| `filter-sidebar` | Bộ lọc dọc bên trái | filters[], collapsible |
| `filter-smart` | Bộ lọc thông minh (AI suggest) | api, recentFilters, savedFilters |
| `filter-date-range` | Chọn khoảng ngày | preset (today/week/month/quarter/custom) |
| `filter-tag-cloud` | Lọc bằng tag | api, tagKey, multiSelect |

## 4. DATA TABLE — Tính năng nâng cao

### 4.1 Column Features
```
- Sortable: click header → ASC/DESC/none
- Multi-sort: Shift+click để sort nhiều cột
- Filterable: input/select per column header
- Resizable: kéo border cột để resize
- Reorderable: kéo header để đổi thứ tự cột
- Pinnable: pin cột trái/phải
- Hideable: ẩn/hiện cột qua menu
- Auto-width: auto-fit content
```

### 4.2 Row Features
```
- Selection: checkbox single/multi select
- Expansion: expand row để xem detail
- Inline edit: double-click cell → edit → save
- Row grouping: group by column value
- Row reorder: drag to reorder
- Context menu: right-click → actions
```

### 4.3 Global Features
```
- Global search: tìm across tất cả columns
- Column filter: per-column filter (text/select/date range/number range)
- Saved filters: lưu bộ lọc thường dùng
- Export: CSV, Excel, PDF
- Column chooser: checkbox list ẩn/hiện columns
- Density: compact/comfortable/spacious toggle
- Pagination: page size selector (10/25/50/100)
- Infinite scroll (optional thay pagination)
- Loading skeleton: shimmer effect khi load
- Empty state: customizable message + action
```

## 5. EDIT MODE

### 5.1 Cách hoạt động:
```
Normal Mode → Click [✏️ Edit Module] → Edit Mode
  │
  ├── Block headers hiện ra: [↑] [↓] [👁] [⚙] [🗑]
  │     ↑↓ = di chuyển lên/xuống
  │     👁 = ẩn/hiện block
  │     ⚙ = mở properties panel
  │     🗑 = xóa block
  │
  ├── [+ Add Block] button xuất hiện giữa các blocks
  │     Click → mở Block Library popup
  │     Chọn block type → thêm vào canvas
  │
  ├── Properties Panel (bên phải):
  │     Khi click ⚙ trên block → panel hiện ra
  │     Cho phép:
  │       - Đổi title
  │       - Chọn API endpoint (dropdown từ catalog)
  │       - Cấu hình columns (cho table)
  │       - Cấu hình items (cho KPI row)
  │       - Cấu hình filters
  │       - Thêm/bớt fields
  │
  ├── Tab management:
  │     - Thêm tab mới
  │     - Đổi tên tab
  │     - Xóa tab
  │     - Kéo đổi thứ tự tab
  │
  └── Click [💾 Save] → lưu schema JSON
      Click [❌ Cancel] → hủy thay đổi
      Click [🔄 Reset] → về layout mặc định
```

### 5.2 API Binding UI:
```
┌─ API Configuration ──────────────────────────────┐
│                                                    │
│ Endpoint:  [order_so_list          ▾]             │
│            (dropdown từ 192 registered actions)    │
│                                                    │
│ Method:    [GET ▾]                                │
│                                                    │
│ Data Key:  [sales_orders    ]                     │
│            (field trong response chứa data)        │
│                                                    │
│ Parameters:                                        │
│   status     = [{{filters.status}}  ]             │
│   date_from  = [{{filters.date_from}}]            │
│   date_to    = [{{filters.date_to}}  ]            │
│   offset     = [{{pagination.offset}}]            │
│   limit      = [{{pagination.limit}} ]            │
│                                                    │
│ [Test API ▶] → hiện response preview              │
└──────────────────────────────────────────────────┘
```

## 6. MODULE STORAGE

### 6.1 Backend API:
```
GET  module_schema_list           → list all module schemas
GET  module_schema_get?id=orders  → get 1 module schema
POST module_schema_save           → create/update module schema
POST module_schema_delete         → delete module schema
POST module_schema_reset          → reset to default schema
GET  module_api_catalog           → list all available API endpoints
```

### 6.2 Storage:
```
qms-data/modules/
  ├── M1-quoting.json
  ├── M2-orders.json
  ├── M3-planning.json
  ├── M4-purchasing.json
  ├── M5-production.json
  ├── M6-quality.json
  ├── M7-records.json
  ├── M8-reports.json
  ├── M9-documents.json (readonly)
  └── M10-admin.json (readonly)

qms-data/modules/_defaults/
  ├── M1-quoting.json (backup mặc định)
  └── ...
```

### 6.3 User overrides:
```
localStorage: hesem_module_{moduleId} → user customizations
  - Hidden blocks
  - Block order
  - Column widths
  - Saved filters
  - Preferred page size
```

## 7. MODULE BUILDER FLOW

### 7.1 Tạo module mới:
```
1. Click [+ Tạo Module Mới] trên sidebar hoặc admin
2. Chọn template: Blank / Clone từ module có sẵn
3. Nhập: Tên module, Icon, Route, Roles
4. Module Builder mở ra với canvas trống
5. Kéo blocks từ Library vào canvas
6. Cấu hình mỗi block (API binding, columns, etc.)
7. Save → JSON schema lưu vào qms-data/modules/
8. Module xuất hiện trên sidebar
```

### 7.2 Chỉnh sửa module có sẵn:
```
1. Mở module bất kỳ (ví dụ: Đơn hàng)
2. Click [✏️ Edit Module] trên header
3. Edit Mode bật: blocks hiện toolbar, + buttons xuất hiện
4. Thêm/bớt/sắp xếp blocks
5. Cấu hình API, columns, filters
6. Save → cập nhật JSON schema
7. Hoặc Reset → về layout mặc định
```

## 8. TAB WRAPPING (Giải quyết vấn đề scrollbar)

```css
/* Tabs wrap thành 2 dòng khi nhiều, KHÔNG có scrollbar */
.hm-tabs {
  display: flex;
  flex-wrap: wrap;        /* ← wrap thay vì scroll */
  gap: var(--space-1);
  border-bottom: 2px solid var(--border);
  margin-bottom: var(--space-5);
  /* BỎ: overflow-x: auto */
}
```

# BỘ PROMPT CHI TIẾT — NÂNG CẤP MODULE BUILDER LÊN WORLD-CLASS
# Dùng cho GPT-4o / Claude để triển khai từng Phase

---

## SYSTEM PROMPT (Dùng chung cho TẤT CẢ prompts)

```
Bạn là Senior Full-Stack Engineer chuyên về Low-Code Platform Development.
Bạn có kiến thức sâu về: Retool, Appsmith, ToolJet, Budibase, Webflow, Power Apps, Salesforce Lightning, Airtable, Notion.

BẮT BUỘC:
1. Trước khi code, PHẢI nghiên cứu cách Retool, ToolJet, Appsmith triển khai tính năng tương tự
2. Code phải đạt production-ready quality — không stub, không placeholder, không TODO
3. Mỗi function PHẢI có JSDoc documentation
4. Mỗi interactive element PHẢI có ARIA attributes (aria-label, aria-required, role)
5. Mỗi block PHẢI có responsive breakpoints (320, 480, 768, 1024, 1280px)
6. Mỗi block PHẢI có error handling (try-catch + fallback UI)
7. Mỗi block PHẢI có print styles (@media print)
8. Code PHẢI dùng vanilla JavaScript ES5 (không framework, không TypeScript, không import/export)
9. HTML render bằng string concatenation (pattern hiện có) — dùng _esc() để escape
10. Vietnamese UI text dùng function t(vi, en) — PHẢI có dấu đầy đủ

CONTEXT HỆ THỐNG:
- File chính: 01-QMS-Portal/scripts/portal/00-block-engine.js (7,459 dòng)
- Builder UI: 01-QMS-Portal/scripts/portal/31-module-builder.js (5,621 dòng)
- Form builder: 01-QMS-Portal/scripts/portal/09f-form-builder-engine.js (1,218 dòng)
- Module schemas: 01-QMS-Portal/qms-data/modules/M{N}-{name}.json
- Escape function: _esc(value) — tạo div, appendChild textNode, return innerHTML
- Translation: t(vietnamese_text, english_text) — returns based on lang variable
- API call: _fetchData(action, params, method) → Promise
- Expression eval: _evalExpr(expression, context) → value
- State: getModuleState(moduleId) → { blockData, filterValues, tableStates, ... }
- Block render entry: _renderBlockInner(block, data, state, ctx) → HTML string

PATTERN MẪU (từ renderKpiRow đã hoạt động):
function renderKpiRow(config, data, state, ctx){
  if(!config || !config.items) return '<div class="hm-empty">No KPI items configured</div>';
  var items = config.items || [];
  var html = '<div class="hm-kpi-row">';
  items.forEach(function(item){
    var val = item.value !== undefined ? item.value : _evalExpr(item.valueExpr || '', ctx);
    html += '<div class="hm-kpi-card ' + _esc(item.color || 'primary') + '">' +
      '<small>' + _esc(t(item.label_vi || item.label || '', item.label || '')) + '</small>' +
      '<strong>' + _esc(val) + '</strong>' +
    '</div>';
  });
  html += '</div>';
  return html;
}
```

---

## PROMPT 1: PHASE 1A — Chart Blocks (5 blocks)

```
NHIỆM VỤ: Implement 5 chart block renderers cho HESEM QMS Module Builder.

NGHIÊN CỨU BẮT BUỘC TRƯỚC KHI CODE:
1. Mở Retool docs → xem component "Chart" hỗ trợ những chart types nào, config schema ra sao
2. Mở ToolJet docs → xem Chart component, so sánh với Retool
3. Mở Chart.js 4.x docs → xem API cho line, area, scatter, radar, mixed chart
4. Mở Appsmith docs → xem chart widget config
5. So sánh 3 cách render chart: Canvas (Chart.js), SVG (D3.js), CSS-only
   → Chọn approach tốt nhất cho hệ thống vanilla JS không framework

YÊU CẦU TRIỂN KHAI:

File: 01-QMS-Portal/scripts/portal/00-block-engine.js
Thêm vào sau function renderBarChart() hiện có.

1. renderLineChart(config, data, state, ctx)
   - Canvas-based hoặc SVG-based (chọn approach nhẹ nhất)
   - Config: { series: [{key, label, color}], xAxis: {key, type:'date'|'category'}, yAxis: {label, format} }
   - Hỗ trợ: multiple series, tooltip on hover, responsive resize
   - Gridlines, axis labels, legend
   - Animation on load (CSS transition, không JS animation library)

2. renderAreaChart(config, data, state, ctx)
   - Giống line chart nhưng fill area dưới line
   - Gradient fill (top color → transparent)
   - Stacked area option: config.stacked = true

3. renderScatterChart(config, data, state, ctx)
   - X/Y scatter plot
   - Config: { xKey, yKey, sizeKey (optional), colorKey (optional) }
   - Hover tooltip hiện giá trị
   - Zoom/pan (nếu khả thi với vanilla JS)

4. renderRadarChart(config, data, state, ctx)
   - Spider/radar chart cho multi-dimension comparison
   - Config: { dimensions: [{key, label, max}], series: [{label, color, values}] }
   - Filled polygon with transparency
   - Axis labels xung quanh

5. renderComboChart(config, data, state, ctx)
   - Mixed bar + line on same chart
   - Config: { barSeries: [...], lineSeries: [...], xAxis, yAxisLeft, yAxisRight }
   - Dual Y-axis support
   - Legend phân biệt bar vs line

MỖI CHART PHẢI CÓ:
- Fallback nếu data trống: "<div class='hm-empty'>Không có dữ liệu</div>"
- Responsive: tự resize khi container thay đổi (ResizeObserver nếu cần)
- ARIA: role="img", aria-label mô tả chart
- Print: @media print { chart phải render static, không animation }
- Config từ schema (không hardcode data)
- Tooltip hiện giá trị khi hover
- Legend có thể toggle series on/off

THAM KHẢO:
- Retool Chart component: supports 15 chart types, ChartJS-based
- ToolJet Chart: supports line, bar, pie, scatter with 5-click setup
- Appsmith Chart Widget: ChartJS 4.x wrapper with expression binding

OUTPUT: JavaScript code cho 5 functions, kèm CSS cho .hm-chart-* classes, kèm BLOCK_PROPERTIES_SCHEMA entries.
```

---

## PROMPT 2: PHASE 1B — Quality SPC Blocks (4 blocks)

```
NHIỆM VỤ: Implement 4 quality/SPC block renderers cho hệ thống quản lý chất lượng CNC Aerospace.

NGHIÊN CỨU BẮT BUỘC:
1. Tìm "SPC control chart software" → xem Minitab, InfinityQS, SPC for Excel render chart như thế nào
2. Nghiên cứu Western Electric Rules (8 rules) cho control chart
3. Nghiên cứu Nelson Rules cho process stability
4. Tìm "Pareto chart best practices quality management"
5. Tìm "quality checksheet digital" → xem dạng UI nào phổ biến nhất
6. Nghiên cứu AS9100D §8.2.3 yêu cầu gì về SPC
7. Nghiên cứu cách MasterControl, ETQ Reliance hiển thị SPC

YÊU CẦU:

1. renderSpcChart(config, data, state, ctx)
   - X-bar chart (mean) hoặc Individual chart tùy config.chartType
   - Control limits: UCL, LCL, CL (centerline) — tính từ data hoặc config
   - Config: {
       chartType: 'xbar'|'individual'|'range'|'moving_range',
       measurementKey: 'dimension_value',
       subgroupSize: 5,
       limits: { ucl: 'auto'|number, lcl: 'auto'|number, cl: 'auto'|number },
       rules: ['western_electric'|'nelson'] // vi phạm tô đỏ
     }
   - Auto-calculate limits nếu 'auto': UCL = X̄ + 3σ, LCL = X̄ - 3σ
   - Highlight vi phạm: điểm ngoài UCL/LCL tô đỏ, 7 điểm liên tục 1 phía tô vàng
   - Zones: A (±3σ), B (±2σ), C (±1σ) — vẽ nền nhạt
   - Tooltip: hover điểm → hiện subgroup #, mean, range, timestamp
   - PHẢI render đúng chuẩn AS9100D — đây là yêu cầu audit

2. renderControlChart(config, data, state, ctx)
   - Dual chart: X-bar ở trên, R chart (range) ở dưới
   - Synchronized X-axis (cùng subgroup)
   - Config: { measurementKey, subgroupSize, xAxis: 'subgroup_id'|'timestamp' }
   - UCL, LCL, CL cho cả X-bar và R chart
   - Process capability indices: Cp, Cpk hiển thị ở góc phải
   - Specification limits: USL, LSL (nếu config có)

3. renderParetoChart(config, data, state, ctx)
   - Bar chart descending + cumulative line (secondary Y-axis)
   - Config: { categoryKey, valueKey, cumulative: true, top: 10 }
   - 80/20 reference line (horizontal dashed at 80% cumulative)
   - Bars có color gradient (đậm → nhạt)
   - Cumulative % label trên mỗi bar
   - Responsive: bars collapse khi nhiều categories
   - Dùng cho: Pareto by defect type, by machine, by operator

4. renderChecksheet(config, data, state, ctx)
   - Tally input grid cho inspection/check data
   - Config: {
       rows: [{id, label}],  // check items
       columns: [{id, label, type:'check'|'count'|'pass_fail'|'measurement'}],
       editable: true
     }
   - Check type: ✓/✗ toggle
   - Count type: numeric tally (click to increment)
   - Pass/fail type: green ✓ / red ✗
   - Measurement type: number input
   - Total row ở bottom (auto-sum)
   - Total column ở right (auto-sum)
   - Conditional highlight: fail cells tô đỏ nhạt

OUTPUT: 4 functions + CSS + BLOCK_PROPERTIES_SCHEMA + ít nhất 1 BLOCK_TEMPLATES entry cho mỗi block.
```

---

## PROMPT 3: PHASE 1C — Data Views (Kanban, Gantt, Detail)

```
NHIỆM VỤ: Implement 3 data view block renderers — Kanban, Gantt, Record Detail.

NGHIÊN CỨU BẮT BUỘC:
1. Mở Trello/Jira → xem Kanban board UX (drag-drop columns, card layout, WIP limits)
2. Mở Monday.com/Asana → xem Gantt chart UX (drag resize, dependencies, milestones)
3. Mở Salesforce Lightning → xem Record Detail component (field layout, inline edit)
4. Mở Retool → xem Kanban component config schema
5. Mở ToolJet → xem Calendar/Timeline component
6. Nghiên cứu: "best kanban board JavaScript no framework" → tìm vanilla JS approach
7. Nghiên cứu: "gantt chart pure CSS SVG" → tìm lightweight approach

YÊU CẦU:

1. renderKanban(config, data, state, ctx)
   - Columns = status values (ví dụ: Open, In Progress, Review, Done)
   - Config: {
       statusKey: 'status',
       columns: [{value, label, color, wipLimit}],
       cardTitle: 'title',
       cardSubtitle: '{{row.assigned_to}} · {{row.due_date | date}}',
       cardBadge: {key:'priority', colors:{high:'red', medium:'orange', low:'green'}},
       draggable: true,
       onDrop: {type:'api-call', action:'update_status', params:{id:'{{card.id}}', status:'{{targetColumn}}'}}
     }
   - Drag-drop cards giữa columns (HTML5 drag API)
   - WIP limit: hiển thị count/limit, tô vàng khi vượt
   - Card hiển thị: title, subtitle (expression), badge, avatar
   - Empty column: "Không có mục nào" với icon
   - Responsive: columns stack vertical trên mobile

2. renderGantt(config, data, state, ctx)
   - Horizontal timeline bars
   - Config: {
       taskKey: 'task_name',
       startKey: 'start_date',
       endKey: 'end_date',
       progressKey: 'percent_complete',
       groupKey: 'work_center',
       colorKey: 'priority',
       showToday: true,
       zoomLevel: 'day'|'week'|'month'
     }
   - Left panel: task list (tree nếu có groupKey)
   - Right panel: timeline bars (scroll horizontal)
   - Today marker: vertical red dashed line
   - Progress: bar fill % (gradient)
   - Tooltip: hover bar → task name, dates, progress, assigned
   - Zoom controls: day/week/month toggle
   - Responsive: trên mobile chỉ hiện list view

3. renderRecordDetail(config, data, state, ctx)
   - Key-value pair display cho 1 record
   - Config: {
       dataSource: {api:'order_so_detail', params:{id:'{{state.selectedId}}'}},
       fields: [
         {key:'so_number', label:'SO#', type:'text', span:'half'},
         {key:'customer_name', label:'Customer', type:'text', span:'half'},
         {key:'total_amount', label:'Total', type:'currency', span:'third'},
         {key:'status', label:'Status', type:'badge', span:'third'},
         {key:'notes', label:'Notes', type:'textarea', span:'full'}
       ],
       editable: true,
       layout: '2-column'|'3-column'|'auto'
     }
   - Inline edit: click field → input appears → blur saves
   - Field types: text, number, currency, date, badge, link, textarea, lookup
   - Span: full (100%), half (50%), third (33%)
   - Loading skeleton khi fetch data
   - Error state nếu API fail

OUTPUT: 3 functions + CSS + BLOCK_PROPERTIES_SCHEMA + BLOCK_TEMPLATES.
```

---

## PROMPT 4: PHASE 1D — Form Wizard + Modal + Machine Status

```
NHIỆM VỤ: Implement 3 blocks — Form Wizard, Form Modal, Machine Status Grid.

NGHIÊN CỨU:
1. Retool "Wizard/Stepper" component → step-by-step form UX
2. Retool "Modal" component → overlay form UX
3. ToolJet "Multi-step form" → step validation approach
4. Tìm "machine status dashboard manufacturing" → OEE board UX
5. Tìm "andon board digital" → real-time machine monitoring UX
6. Nghiên cứu OEE calculation: Availability × Performance × Quality

YÊU CẦU:

1. renderFormWizard(config, data, state, ctx)
   - Multi-step form with progress indicator
   - Config: {
       steps: [
         {id:'step1', title:'Thông tin cơ bản', fields:[...]},
         {id:'step2', title:'Chi tiết lỗi', fields:[...]},
         {id:'step3', title:'Hành động khắc phục', fields:[...]},
         {id:'step4', title:'Xác nhận & Gửi', fields:[], summary:true}
       ],
       submitApi: {action:'ncr_create', method:'POST'},
       allowSkip: false,
       showProgressBar: true
     }
   - Step indicator: horizontal steps (1→2→3→4) với icon + label
   - Active step highlighted, completed steps có checkmark
   - Navigation: "Tiếp tục" / "Quay lại" / "Gửi" buttons
   - Per-step validation: không cho Next nếu required fields trống
   - Summary step: hiển thị tất cả data đã điền (read-only)
   - Animation: slide left/right khi chuyển step
   - Keyboard: Enter = Next, Escape = Back

2. renderFormModal(config, data, state, ctx)
   - Inline modal (không phải browser dialog)
   - Config: {
       trigger: {label:'Tạo mới', icon:'plus', style:'primary'},
       title: 'Tạo đơn hàng mới',
       fields: [...],
       submitApi: {...},
       size: 'sm'|'md'|'lg'|'xl',
       closeOnSubmit: true,
       closeOnOverlay: true
     }
   - Trigger button renders inline
   - Click → modal overlay appears with form
   - ESC hoặc click overlay → đóng (nếu closeOnOverlay)
   - Submit → gọi API → đóng modal → refresh parent blocks
   - Focus trap: Tab chỉ cycle trong modal
   - aria-modal="true", role="dialog"

3. renderMachineStatus(config, data, state, ctx)
   - Grid hiển thị trạng thái máy CNC
   - Config: {
       dataSource: {api:'machine_status_list'},
       columns: 4,
       cardFields: {
         name: 'machine_name',
         status: 'status', // running|idle|down|maintenance
         currentJob: 'current_jo',
         oee: 'oee_percent',
         operator: 'operator_name',
         lastUpdate: 'last_heartbeat'
       },
       statusColors: {
         running: '#22c55e',
         idle: '#f59e0b',
         down: '#ef4444',
         maintenance: '#8b5cf6'
       },
       refreshInterval: 30000
     }
   - Card layout: machine icon + name, status badge, OEE gauge, current JO, operator
   - Color-coded borders theo status
   - OEE mini gauge (circular progress)
   - Pulse animation cho "running" machines
   - Auto-refresh mỗi 30s (configurable)
   - Click card → navigate to machine detail

OUTPUT: 3 functions + CSS + BLOCK_PROPERTIES_SCHEMA + BLOCK_TEMPLATES.
```

---

## PROMPT 5: PHASE 2 — Architecture Refactor

```
NHIỆM VỤ: Refactor 00-block-engine.js (7,459 dòng) thành module architecture.

NGHIÊN CỨU:
1. Xem cách Appsmith tổ chức widget code (GitHub source)
2. Xem cách ToolJet tổ chức component code (GitHub source)
3. Nghiên cứu "JavaScript module pattern without ES modules" cho browser
4. Nghiên cứu "IIFE module pattern vanilla JS"
5. Nghiên cứu "state management pattern vanilla JavaScript" (Redux-like without framework)

YÊU CẦU:

Tách 00-block-engine.js thành CÁC FILE RIÊNG, mỗi file là 1 IIFE:

A. scripts/portal/block-engine/00-core.js (~500 dòng)
   - window.BlockEngine namespace
   - renderBlock() entry point
   - _renderBlockInner() dispatcher
   - Block catalog registry (addBlockType, getBlockType)
   - Module state management (getModuleState, setModuleState)
   - Event dispatching (on, off, emit)

B. scripts/portal/block-engine/01-expression.js (~600 dòng)
   - Expression tokenizer
   - Expression evaluator (_evalExpr)
   - Expression cache
   - Built-in filters (number, currency, date)
   - Safe function whitelist

C. scripts/portal/block-engine/02-data-table.js (~800 dòng)
   - renderAdvancedTableV3()
   - Column sort, filter, resize, pin
   - Row selection, inline edit
   - Pagination, search, export
   - Conditional formatting

D. scripts/portal/block-engine/03-charts.js (~600 dòng)
   - renderBarChart, renderLineChart, renderAreaChart
   - renderDonutChart, renderScatterChart, renderRadarChart
   - renderComboChart
   - Shared chart utilities (tooltip, legend, axis)

E. scripts/portal/block-engine/04-forms.js (~400 dòng)
   - renderFormStandard, renderFormWizard, renderFormModal
   - Form validation, submission
   - Field rendering (shared with eQMS)

F. scripts/portal/block-engine/05-quality.js (~500 dòng)
   - renderSpcChart, renderControlChart
   - renderParetoChart, renderChecksheet
   - Statistical functions (mean, stddev, UCL/LCL)

G. scripts/portal/block-engine/06-layout.js (~300 dòng)
   - renderKpiRow, renderFilterBar, renderSectionHeader
   - renderInfoBanner, renderTwoColumn, renderCardContainer
   - renderTimeline, renderCards

H. scripts/portal/block-engine/07-actions.js (~200 dòng)
   - renderToolbar, renderStatusFlow
   - Action handlers (toast, navigate, api-call, set-state)

I. scripts/portal/block-engine/08-data-views.js (~500 dòng)
   - renderKanban, renderGantt, renderRecordDetail
   - renderMachineStatus

J. scripts/portal/block-engine/09-domain.js (~300 dòng)
   - Manufacturing blocks
   - IoT blocks
   - Automation blocks

QUAN TRỌNG:
- Mỗi file PHẢI là IIFE: (function(){ 'use strict'; ... })();
- Mỗi file register blocks vào window.BlockEngine.addBlockType()
- Load order: 00-core.js TRƯỚC, sau đó bất kỳ thứ tự
- portal.html cần thêm <script> tags cho tất cả files
- KHÔNG dùng ES modules (import/export) — browser support
- KHÔNG dùng bundler (webpack, rollup) — keep simple
- State management: implement simple store pattern trong 00-core.js

OUTPUT: 10 file JavaScript, 1 file portal.html updated, migration guide từ file cũ sang mới.
```

---

## PROMPT 6: PHASE 3 — Performance + Accessibility

```
NHIỆM VỤ: Nâng cấp performance (virtual scrolling) và WCAG 2.1 AA compliance.

NGHIÊN CỨU:
1. Tìm "virtual scrolling vanilla JavaScript" → lightweight implementation
2. Tìm "virtual list pure JS" → approach không dùng framework
3. Nghiên cứu TanStack Virtual → API design (dù không dùng React)
4. Nghiên cứu WCAG 2.1 AA checklist đầy đủ
5. Tìm "accessible data table ARIA" → best practices
6. Tìm "accessible drag and drop ARIA" → kanban accessibility
7. Tìm "keyboard navigation data grid" → arrow key navigation
8. Nghiên cứu "prefers-reduced-motion CSS" → disabled animations
9. Nghiên cứu "prefers-color-scheme dark" → dark mode CSS variables

YÊU CẦU PERFORMANCE:

A. Virtual Scrolling cho data-table:
   - Chỉ render rows trong viewport + buffer (±20 rows)
   - Total height = rowCount × rowHeight (estimated)
   - Scroll event → recalculate visible range → re-render only visible
   - Benchmark: 10,000 rows phải scroll smooth (60fps)
   - Config: config.virtual = true (khi rows > 500)

B. Expression Compilation:
   - Cache compiled expressions (AST → reusable evaluator function)
   - Benchmark: 1000 expression evaluations < 5ms

C. Lazy Block Loading:
   - Blocks ngoài viewport không render cho đến khi scroll into view
   - IntersectionObserver để detect visibility
   - Placeholder skeleton khi block chưa render

YÊU CẦU ACCESSIBILITY:

A. Semantic HTML cho TẤT CẢ blocks:
   - Buttons: <button> không phải <div onclick>
   - Inputs: <input>, <select>, <textarea> với <label>
   - Tables: <table>, <thead>, <tbody>, <th scope="col">
   - Navigation: <nav>, <main>, <aside>
   - Headings: <h2>, <h3> hierarchy đúng

B. ARIA attributes:
   - Tables: role="grid", aria-sort, aria-selected
   - Buttons: aria-pressed, aria-expanded
   - Modal: aria-modal="true", role="dialog", aria-labelledby
   - Kanban: role="listbox", aria-dropeffect
   - Charts: role="img", aria-label mô tả data
   - Filter: role="search"
   - Status: role="status", aria-live="polite"

C. Keyboard Navigation:
   - Tab: di chuyển giữa interactive elements
   - Arrow keys: navigate table cells, kanban cards
   - Enter: activate button, open dropdown
   - Escape: close modal, cancel edit
   - Space: toggle checkbox, select option
   - Ctrl+Home/End: first/last row trong table

D. Focus Management:
   - Visible focus indicator: 2px solid outline
   - Focus trap trong modal (Tab cycle)
   - Return focus sau khi đóng modal
   - Skip-to-content link

E. Color & Motion:
   - Color contrast ≥ 4.5:1 (text), ≥ 3:1 (interactive)
   - Không dùng color-only để convey meaning (thêm icon/text)
   - @media (prefers-reduced-motion: reduce) → disable animations
   - @media (prefers-color-scheme: dark) → dark theme CSS variables

F. Responsive (5 breakpoints):
   - 320px: mobile portrait (1 column)
   - 480px: mobile landscape (1-2 columns)
   - 768px: tablet (2 columns)
   - 1024px: tablet landscape / small desktop (2-3 columns)
   - 1280px: desktop (full layout)

OUTPUT: Updated CSS file + updated block renderers + virtual scrolling utility.
```

---

## PROMPT 7: PHASE 4 — Template Library (30 presets)

```
NHIỆM VỤ: Tạo 30 module template presets cho HESEM QMS Portal.

NGHIÊN CỨU:
1. Mở Airtable template gallery → xem 50 templates phổ biến nhất
2. Mở Retool template gallery → xem internal tool templates
3. Mở Monday.com templates → xem manufacturing/project templates
4. Tìm "QMS dashboard template" → quality management dashboard layouts
5. Tìm "manufacturing OEE dashboard" → shop floor monitoring layouts
6. Tìm "supply chain dashboard template" → logistics dashboard
7. Tìm "CRM dashboard template" → customer management layouts
8. Nghiên cứu AS9100D requirements → quality module cần hiển thị gì
9. Nghiên cứu IATF 16949 → automotive quality template

YÊU CẦU:
Mỗi template là 1 JSON file trong qms-data/modules/templates/

CÁC TEMPLATE CẦN TẠO:

Manufacturing (6):
1. tpl-oee-dashboard.json — OEE by machine, shift, time period
2. tpl-production-schedule.json — Gantt + dispatch board
3. tpl-shift-report.json — KPI + checksheet + notes per shift
4. tpl-machine-monitoring.json — Machine status grid + alarms
5. tpl-wip-tracker.json — Kanban WIP by work center
6. tpl-downtime-analysis.json — Pareto + timeline + root cause

Quality (6):
7. tpl-spc-dashboard.json — Control charts + capability indices
8. tpl-ncr-tracker.json — NCR list + Pareto by defect + trend
9. tpl-capa-board.json — Kanban CAPA status + overdue alerts
10. tpl-audit-planner.json — Calendar + checklist + findings
11. tpl-incoming-inspection.json — IQC results + supplier rating
12. tpl-copq-analysis.json — Cost of poor quality breakdown

Orders (4):
13. tpl-so-pipeline.json — SO list + KPI + status flow
14. tpl-jo-dispatch.json — JO schedule + machine allocation
15. tpl-shipment-tracker.json — Packing + delivery + evidence
16. tpl-contract-review.json — SO detail + checklist + approval

Supply Chain (4):
17. tpl-purchasing-dashboard.json — PO list + supplier lead time
18. tpl-supplier-scorecard.json — Quality + delivery + cost rating
19. tpl-inventory-status.json — Stock levels + reorder alerts
20. tpl-iqc-log.json — Incoming inspection log + reject rate

HR & Training (3):
21. tpl-training-matrix.json — Skills × employees grid
22. tpl-competence-dashboard.json — Certification status + expiry
23. tpl-safety-board.json — EHS incidents + near-miss trends

Reporting (4):
24. tpl-executive-kpi.json — Top-level KPIs + trends + alerts
25. tpl-management-review.json — Quality objectives + results
26. tpl-customer-satisfaction.json — Survey results + trends
27. tpl-continuous-improvement.json — Kaizen log + impact chart

Admin (3):
28. tpl-user-management.json — User list + roles + last login
29. tpl-master-data.json — Customers + suppliers + parts CRUD
30. tpl-system-config.json — Settings + audit log + backup

MỖI TEMPLATE PHẢI CÓ:
- moduleId, title (vi/en), description, icon
- 2-4 tabs với blocks đã configure đầy đủ
- dataSource.api pointing to real API actions
- Responsive config cho mobile/tablet
- Ít nhất 1 KPI row, 1 data-table, 1 chart per template
- Color scheme phù hợp với domain (quality=red, production=blue, etc.)
- Vietnamese labels với dấu đầy đủ

OUTPUT: 30 JSON files + 1 index file listing all templates.
```

---

## PROMPT 8: PHASE 5A — AI-Powered Builder

```
NHIỆM VỤ: Implement AI-powered module generation từ natural language.

NGHIÊN CỨU:
1. Mở ToolJet AI builder → xem prompt → app generation flow
2. Mở Power Apps Copilot → xem "describe your app" → generation
3. Tìm "LLM to UI generation" → research papers + implementations
4. Nghiên cứu OpenAI Function Calling → structured output for JSON schema
5. Nghiên cứu "prompt engineering for UI generation" → best practices

YÊU CẦU:

A. AI Module Generator UI:
   - Textarea: "Mô tả module bạn muốn tạo..."
   - Example prompts:
     * "Dashboard theo dõi OEE theo máy, có filter theo ca và ngày"
     * "Bảng quản lý đơn hàng với KPI tổng quan và biểu đồ xu hướng"
     * "Tracker CAPA với kanban board và Pareto lỗi"
   - "Tạo bằng AI" button
   - Loading animation: "Đang phân tích yêu cầu..."
   - Preview generated module
   - "Chỉnh sửa" / "Tạo lại" / "Lưu" buttons

B. AI Prompt → Module Schema Pipeline:
   1. Parse user prompt → extract intent (dashboard, tracker, form, report)
   2. Match intent → best template from 30 presets
   3. Customize template based on specifics in prompt
   4. Generate JSON schema with:
      - Appropriate tabs (2-4)
      - Relevant blocks (KPI, table, chart, filter)
      - API bindings from 192 available actions
      - Vietnamese + English labels
   5. Return schema cho preview

C. AI Block Suggestions:
   - Khi user thêm block mới, AI suggest 3-5 blocks phù hợp
   - Based on: current module context, existing blocks, common patterns
   - "Gợi ý: Thêm chart-line cho xu hướng" / "Thêm filter-bar để lọc data"

D. AI Chart Suggestion:
   - User chọn data source → AI suggest best chart type
   - "Dữ liệu này phù hợp với: Bar chart (recommended), Line chart, Table"
   - Based on: data shape, cardinality, time series detection

IMPLEMENTATION:
- Backend: Call OpenAI/Anthropic API từ PHP (api.php action: 'ai_generate_module')
- Prompt template: Include available block types, API actions, template library
- Structured output: JSON schema matching module format
- Fallback: Nếu AI API unavailable, show template picker instead

OUTPUT: JavaScript UI code + PHP API endpoint + prompt templates + fallback logic.
```

---

## PROMPT 9: PHASE 5B — Enterprise Governance + Testing

```
NHIỆM VỤ: Implement version control, audit logging, và testing infrastructure.

NGHIÊN CỨU:
1. Xem Retool version control → how they do branching
2. Tìm "audit log best practices enterprise application"
3. Tìm "Jest unit testing vanilla JavaScript"
4. Tìm "Playwright E2E testing web application"
5. Nghiên cứu "axe-core accessibility testing automation"
6. Nghiên cứu "visual regression testing Percy Chromatic"

YÊU CẦU:

A. Module Version Control:
   - Mỗi save tạo version: v1, v2, v3...
   - Version list: timestamp, author, message
   - Diff viewer: so sánh 2 versions (JSON diff)
   - Rollback: restore bất kỳ version nào
   - Storage: qms-data/modules/{moduleId}/versions/{v}.json

B. Module Environments:
   - Draft → Published → Archived
   - Draft: chỉ builder thấy
   - Published: tất cả users thấy
   - Archived: ẩn, có thể restore

C. Audit Log:
   - Log mọi thay đổi: who, when, what changed
   - Storage: qms-data/modules/{moduleId}/audit.jsonl
   - UI: timeline hiển thị history
   - Filter: by user, by date, by action type

D. Testing Infrastructure:
   - Unit tests (Jest):
     * Expression evaluator: 50 test cases
     * Block renderers: input → expected HTML
     * State management: action → state change
   - E2E tests (Playwright):
     * Create module → add blocks → preview → save
     * Open module → edit block → verify change
     * Table sort → filter → export
   - Accessibility tests (axe-core):
     * Scan each block type → report violations
     * Target: 0 critical/serious violations

OUTPUT: Version control PHP API + JavaScript UI + test files + CI/CD config.
```

---

## CÁCH SỬ DỤNG BỘ PROMPT NÀY

### Thứ tự thực hiện:
```
1. Paste SYSTEM PROMPT vào context window
2. Paste PROMPT 1 → GPT tạo chart blocks → review + merge
3. Paste PROMPT 2 → GPT tạo quality blocks → review + merge
4. Paste PROMPT 3 → GPT tạo data views → review + merge
5. Paste PROMPT 4 → GPT tạo form blocks → review + merge
6. Paste PROMPT 5 → GPT refactor architecture → review + merge
7. Paste PROMPT 6 → GPT nâng cấp perf + a11y → review + merge
8. Paste PROMPT 7 → GPT tạo templates → review + merge
9. Paste PROMPT 8 → GPT tạo AI builder → review + merge
10. Paste PROMPT 9 → GPT tạo governance + tests → review + merge
```

### Kèm theo mỗi prompt:
- Copy nội dung file hiện tại liên quan (00-block-engine.js excerpt)
- Copy 1-2 function mẫu đã hoạt động (renderKpiRow, renderAdvancedTableV3)
- Copy module schema mẫu (M2-orders.json)
- Copy CSS hiện có (relevant sections)

### Review checklist sau mỗi prompt:
- [ ] Code chạy không lỗi syntax
- [ ] Không dùng framework/library ngoài
- [ ] Có JSDoc cho mọi public function
- [ ] Có ARIA attributes cho mọi interactive element
- [ ] Có responsive breakpoints
- [ ] Có error handling
- [ ] Có print styles
- [ ] Vietnamese text có dấu đầy đủ
- [ ] Pattern nhất quán với code hiện tại (_esc, t, _evalExpr)

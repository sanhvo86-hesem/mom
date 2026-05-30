#!/usr/bin/env node
/* Generates a "Lego Showcase" module schema containing one instance of every
 * Block Engine catalog type, grouped into one tab per category, each block
 * pre-filled with inline demo data (config.demoData / config.items / …) so it
 * paints a realistic preview in the Module Builder preview + runtime engine.
 *
 * One-off authoring tool — not wired into CI. Run:
 *   node tools/scripts/gen-lego-showcase.mjs
 * Writes mom/data/modules/M-lego-showcase.json
 */
import { writeFileSync } from 'node:fs';

/* Catalog roster: [type, labelVi, labelEn, icon, catalogRenderer] — transcribed
 * from _buildExpandedBlockCatalog() in 00-block-engine.js. */
const CATS = [
  ['layout', 'Bố cục', 'Layout', '🧱', [
    ['page-header','Tiêu đề trang','Page Header','🧭','section-header'],
    ['section-header','Tiêu đề khu vực','Section Header','🏷️','section-header'],
    ['sub-header','Tiêu đề phụ','Sub Header','🔖','section-header'],
    ['hero-banner','Banner mở đầu','Hero Banner','🌤️','info-banner'],
    ['kpi-row','Dãy KPI','KPI Row','📊','kpi-row'],
    ['metric-strip','Thanh metric','Metric Strip','📈','kpi-row'],
    ['card-container','Nhóm thẻ','Card Container','🗂️','card-container'],
    ['two-column','Hai cột','Two Column','↔️','two-column'],
    ['three-column','Ba cột','Three Column','🧱','card-container'],
    ['tab-bar','Thanh tab','Tab Bar','📑','action-toolbar'],
    ['spacer','Khoảng trống','Spacer','↕️','spacer'],
    ['divider-line','Đường phân cách','Divider Line','➖','spacer'],
    ['accordion-group','Accordion','Accordion Group','📚','card-container'],
    ['sticky-toolbar','Thanh ghim dính','Sticky Toolbar','📌','action-toolbar'],
  ]],
  ['data', 'Dữ liệu', 'Data', '🗄️', [
    ['data-table','Bảng dữ liệu','Data Table','📋','data-table'],
    ['data-cards','Thẻ dữ liệu','Data Cards','🪪','data-cards'],
    ['data-list','Danh sách','Data List','📝','data-cards'],
    ['data-grid','Lưới dữ liệu','Data Grid','🔲','data-cards'],
    ['data-timeline','Timeline','Timeline','🕒','data-timeline'],
    ['data-tree','Cây dữ liệu','Tree View','🌳','data-tree'],
    ['data-kanban','Bảng Kanban','Kanban Board','📌','data-kanban'],
    ['data-gantt','Biểu đồ Gantt','Gantt Chart','📐','data-gantt'],
    ['master-detail','Master detail','Master Detail','📂','data-table'],
    ['kanban-board','Kanban','Kanban Board','🗃️','data-cards'],
    ['tree-view','Cây dữ liệu','Tree View','🌳','data-cards'],
    ['pivot-table','Pivot table','Pivot Table','🧮','data-table'],
    ['matrix-grid','Ma trận','Matrix Grid','🔳','data-table'],
    ['record-detail','Chi tiết bản ghi','Record Detail','🧾','data-cards'],
    ['audit-log','Nhật ký thao tác','Audit Log','📜','data-timeline'],
    ['attachment-list','Tệp đính kèm','Attachment List','📎','data-cards'],
    ['status-board','Bảng trạng thái','Status Board','🚦','data-cards'],
    ['map-list','Danh sách địa điểm','Map List','🗺️','data-cards'],
    ['schedule-grid','Lịch biểu','Schedule Grid','🗓️','data-table'],
    ['heat-table','Bảng nhiệt','Heat Table','🔥','data-table'],
    ['compliance-log','Nhật ký tuân thủ','Compliance Log','✅','data-table'],
  ]],
  ['form', 'Biểu mẫu', 'Form', '🧩', [
    ['form-standard','Form chuẩn','Standard Form','🧩','form-standard'],
    ['form-wizard','Form wizard','Form Wizard','🪜','form-standard'],
    ['form-inline','Form ngang','Inline Form','↔️','form-standard'],
    ['filter-bar','Thanh lọc','Filter Bar','🔎','filter-bar'],
    ['search-panel','Panel tìm kiếm','Search Panel','🔍','filter-bar'],
    ['approval-form','Form phê duyệt','Approval Form','✍️','form-standard'],
    ['checklist-form','Checklist','Checklist Form','☑️','form-standard'],
    ['dynamic-form','Form động','Dynamic Form','🧠','form-standard'],
    ['subform-table','Subform dạng bảng','Subform Table','🧮','data-table'],
    ['upload-center','Tải tệp','Upload Center','📤','form-standard'],
    ['signature-pad','Chữ ký','Signature Pad','🖊️','form-standard'],
    ['comment-box','Hộp bình luận','Comment Box','💬','form-standard'],
    ['query-builder','Query builder','Query Builder','🧪','filter-bar'],
    ['parameter-panel','Panel tham số','Parameter Panel','🎛️','form-standard'],
    ['date-range-picker','Khoảng ngày','Date Range Picker','📅','filter-bar'],
  ]],
  ['chart', 'Biểu đồ', 'Chart', '📊', [
    ['chart-bar','Biểu đồ cột','Bar Chart','📊','chart-bar'],
    ['chart-line','Biểu đồ đường','Line Chart','📈','chart-bar'],
    ['chart-area','Biểu đồ miền','Area Chart','🌊','chart-bar'],
    ['chart-donut','Biểu đồ donut','Donut Chart','🍩','chart-donut'],
    ['chart-pie','Biểu đồ tròn','Pie Chart','🥧','chart-donut'],
    ['chart-stacked-bar','Cột chồng','Stacked Bar','🧱','chart-bar'],
    ['chart-combo','Biểu đồ kết hợp','Combo Chart','📶','chart-bar'],
    ['chart-radar','Biểu đồ radar','Radar Chart','🕸️','chart-bar'],
    ['chart-scatter','Biểu đồ scatter','Scatter Plot','⚫','chart-bar'],
    ['chart-bubble','Biểu đồ bubble','Bubble Chart','🫧','chart-bar'],
    ['chart-heatmap','Heatmap','Heatmap','🔥','chart-bar'],
    ['chart-gauge','Đồng hồ gauge','Gauge','🧭','chart-donut'],
    ['chart-progress','Vòng tiến độ','Progress Ring','⭕','chart-donut'],
    ['chart-sparkline','Sparkline','Sparkline','〰️','chart-bar'],
    ['chart-waterfall','Waterfall','Waterfall','🪜','chart-bar'],
    ['chart-control','Control chart','Control Chart','🎯','chart-bar'],
    ['chart-boxplot','Box plot','Box Plot','📦','chart-bar'],
    ['chart-histogram','Histogram','Histogram','📚','chart-bar'],
  ]],
  ['action', 'Hành động', 'Action', '🛠️', [
    ['action-toolbar','Thanh công cụ','Toolbar','🛠️','action-toolbar'],
    ['action-status-flow','Chuyển trạng thái','Status Flow','🔄','action-toolbar'],
    ['action-quick-create','Tạo nhanh','Quick Create','⚡','action-toolbar'],
    ['action-summary','Tổng hợp hành động','Action Summary','📌','data-cards'],
    ['action-export','Xuất dữ liệu','Export','💾','action-toolbar'],
    ['action-bulk','Xử lý hàng loạt','Bulk Actions','🧰','action-toolbar'],
    ['action-approval','Phê duyệt','Approval Actions','✅','action-toolbar'],
    ['action-split','Nút chia nhanh','Split Actions','🔀','action-toolbar'],
    ['action-launchpad','Launchpad','Launchpad','🚀','action-toolbar'],
    ['action-shortcuts','Shortcut','Shortcuts','⌨️','action-toolbar'],
    ['action-refresh','Làm mới','Refresh Actions','🔁','action-toolbar'],
    ['action-share','Chia sẻ','Share Actions','📤','action-toolbar'],
  ]],
  ['media', 'Nội dung', 'Media', '🖼️', [
    ['info-banner','Thông báo','Info Banner','ℹ️','info-banner'],
    ['media-image','Hình ảnh','Image','🖼️','info-banner'],
    ['media-gallery','Gallery','Gallery','🖼️','data-cards'],
    ['media-document','Tài liệu','Document','📄','data-cards'],
    ['media-video','Video','Video','🎬','info-banner'],
    ['media-html','HTML tự do','Raw HTML','📐','info-banner'],
    ['media-markdown','Markdown','Markdown','📝','info-banner'],
    ['media-pdf','PDF viewer','PDF Viewer','📕','info-banner'],
    ['media-iframe','IFrame','IFrame','🌐','info-banner'],
    ['media-announcement','Thông báo nội bộ','Announcement','📣','info-banner'],
  ]],
  ['navigation', 'Điều hướng', 'Navigation', '🧭', [
    ['nav-breadcrumb','Breadcrumb','Breadcrumb','🧭','action-toolbar'],
    ['nav-tabs','Tabs','Tabs','📚','action-toolbar'],
    ['nav-pills','Pills','Pills','🏷️','action-toolbar'],
    ['nav-steps','Bước thực hiện','Step Navigation','🪜','action-toolbar'],
    ['nav-sidebar','Sidebar menu','Sidebar Menu','📂','action-toolbar'],
    ['nav-anchor','Anchor menu','Anchor Menu','📍','action-toolbar'],
    ['nav-pagination','Phân trang','Pagination','↔️','action-toolbar'],
    ['nav-related-links','Liên kết liên quan','Related Links','🔗','action-toolbar'],
    ['nav-module-menu','Menu module','Module Menu','🧩','action-toolbar'],
    ['nav-process-map','Bản đồ quy trình','Process Map','🗺️','action-toolbar'],
  ]],
  ['insight', 'Tổng hợp', 'Insight', '🧠', [
    ['insight-kpi-card','KPI card','KPI Card','🏁','kpi-row'],
    ['insight-stat-callout','Stat callout','Stat Callout','📣','kpi-row'],
    ['insight-scorecard','Scorecard','Scorecard','🧠','data-table'],
    ['insight-funnel','Funnel','Funnel','🔻','chart-bar'],
    ['insight-cohort','Cohort','Cohort','👥','chart-bar'],
    ['insight-alert-feed','Dòng cảnh báo','Alert Feed','🚨','data-timeline'],
    ['insight-driver-tree','Driver tree','Driver Tree','🌿','data-cards'],
    ['insight-variance','So sánh chênh lệch','Variance Analysis','⚖️','chart-bar'],
    ['insight-summary-grid','Lưới tổng hợp','Summary Grid','🔲','data-cards'],
    ['insight-target-tracker','Theo dõi mục tiêu','Target Tracker','🎯','chart-donut'],
  ]],
  ['manufacturing', 'Sản xuất', 'Manufacturing', '🏭', [
    ['mfg-job-board','Bảng JO','Job Board','🏭','data-table'],
    ['mfg-machine-status','Trạng thái máy','Machine Status','🟢','kpi-row'],
    ['mfg-shift-roster','Ca làm việc','Shift Roster','🕘','data-table'],
    ['mfg-capacity-grid','Công suất','Capacity Grid','📦','data-table'],
    ['mfg-wip-lane','WIP lane','WIP Lane','🚚','data-cards'],
    ['mfg-route-tracker','Tuyến công đoạn','Route Tracker','🛣️','data-timeline'],
    ['mfg-tool-life','Tuổi dao cụ','Tool Life','🛠️','chart-bar'],
    ['mfg-material-flow','Dòng vật tư','Material Flow','📦','data-timeline'],
    ['mfg-andon-board','Andon','Andon Board','🚦','kpi-row'],
    ['mfg-setup-check','Checklist setup','Setup Checklist','✅','form-standard'],
    ['mfg-production-schedule','Lịch sản xuất','Production Schedule','🗓️','data-table'],
    ['mfg-downtime-feed','Dòng downtime','Downtime Feed','🛑','data-timeline'],
    ['mfg-oee-trend','Xu hướng OEE','OEE Trend','📈','chart-bar'],
  ]],
  ['quality', 'Chất lượng', 'Quality', '🛡️', [
    ['quality-spc-chart','SPC chart','SPC Chart','📏','chart-bar'],
    ['quality-control-chart','Control chart','Control Chart','🎯','chart-bar'],
    ['quality-pareto','Pareto','Pareto Chart','📚','chart-bar'],
    ['quality-checksheet','Checksheet','Checksheet','🗒️','form-standard'],
    ['quality-defect-matrix','Ma trận lỗi','Defect Matrix','🔳','data-table'],
    ['quality-capa-board','CAPA board','CAPA Board','🛡️','data-cards'],
    ['quality-inspection-form','Form kiểm tra','Inspection Form','🧪','form-standard'],
    ['quality-ncr-log','NCR log','NCR Log','📕','data-table'],
    ['quality-gage-rnr','Gage R&R','Gage R&R','📐','chart-bar'],
    ['quality-capability','Capability','Capability','📉','chart-bar'],
    ['quality-audit-plan','Audit plan','Audit Plan','🗓️','data-table'],
    ['quality-traceability','Traceability','Traceability','🔗','data-timeline'],
    ['quality-8d-board','Bảng 8D','8D Board','🧷','data-cards'],
  ]],
  ['automation', 'Tự động hóa', 'Automation', '⚙️', [
    ['auto-rule-list','Danh sách rule','Rule List','⚙️','data-table'],
    ['auto-approval-lane','Lane phê duyệt','Approval Lane','✅','data-cards'],
    ['auto-task-board','Task board','Task Board','🧰','data-cards'],
    ['auto-webhook-log','Webhook log','Webhook Log','🪝','data-table'],
    ['auto-notification-center','Trung tâm thông báo','Notification Center','🔔','data-timeline'],
    ['auto-escalation-map','Bản đồ escalation','Escalation Map','🧭','data-cards'],
    ['auto-sla-timer','SLA timer','SLA Timer','⏱️','kpi-row'],
    ['auto-queue-monitor','Queue monitor','Queue Monitor','📥','kpi-row'],
    ['auto-runbook','Runbook','Runbook','📘','data-timeline'],
    ['auto-bot-panel','Bot panel','Bot Panel','🤖','action-toolbar'],
    ['auto-workflow-designer','Thiết kế workflow','Workflow Designer','🧬','action-toolbar'],
  ]],
  ['iot', 'IoT / SCADA', 'IoT / SCADA', '📡', [
    ['iot-device-grid','Lưới thiết bị','Device Grid','📟','data-cards'],
    ['iot-sensor-strip','Thanh cảm biến','Sensor Strip','📡','kpi-row'],
    ['iot-alarm-timeline','Timeline alarm','Alarm Timeline','🚨','data-timeline'],
    ['iot-live-trend','Trend realtime','Live Trend','📈','chart-bar'],
    ['iot-connector-panel','Connector panel','Connector Panel','🔌','form-standard'],
    ['iot-telemetry-table','Bảng telemetry','Telemetry Table','📋','data-table'],
    ['iot-machine-twin','Machine twin','Machine Twin','🧭','data-cards'],
    ['iot-oee-board','Bảng OEE','OEE Board','🏁','kpi-row'],
    ['iot-energy-monitor','Energy monitor','Energy Monitor','⚡','chart-bar'],
    ['iot-maintenance-panel','Bảo trì dự đoán','Maintenance Panel','🛠️','data-cards'],
    ['iot-signal-map','Bản đồ signal','Signal Map','🛰️','data-table'],
    ['iot-threshold-manager','Ngưỡng cảnh báo','Threshold Manager','🎚️','form-standard'],
    ['iot-condition-monitor','Theo dõi condition','Condition Monitor','🌡️','chart-bar'],
    ['iot-edge-health','Sức khỏe edge','Edge Health','🧱','kpi-row'],
  ]],
];

/* Mirror of the engine's runtime dispatch (chart/quality block.type routing +
 * _SHOWCASE_RENDER overrides) so we can pick demo data matching the FINAL
 * renderer that _renderBlockInner will choose. */
const SHOWCASE = {
  'insight-funnel':'funnel','insight-scorecard':'scorecard','insight-cohort':'heatmap',
  'quality-defect-matrix':'heatmap','heat-table':'heatmap',
  'nav-breadcrumb':'breadcrumb','nav-steps':'steps','nav-process-map':'steps',
  'nav-pills':'pills','nav-tabs':'pills','nav-pagination':'pagination',
  'nav-related-links':'links','nav-module-menu':'links','nav-anchor':'links',
  'nav-sidebar':'links','action-launchpad':'links','action-shortcuts':'links',
  'media-image':'image','media-gallery':'gallery',
  'media-video':'embed','media-iframe':'embed','media-pdf':'embed',
  'media-html':'richtext','media-markdown':'richtext','media-document':'richtext',
  'iot-device-grid':'device','iot-machine-twin':'device','iot-maintenance-panel':'device','iot-connector-panel':'device',
  'iot-sensor-strip':'sensor','iot-edge-health':'sensor',
  'auto-sla-timer':'sla','auto-queue-monitor':'sla',
  'kanban-board':'board','status-board':'board','quality-capa-board':'board',
  'quality-8d-board':'board','auto-task-board':'board','auto-approval-lane':'board',
  'mfg-wip-lane':'board','auto-escalation-map':'board',
};
const CHART_TYPE = {
  'chart-line':'line','chart-area':'area','chart-scatter':'scatter','chart-bubble':'scatter',
  'chart-radar':'radar','chart-combo':'combo','chart-heatmap':'heatmap',
  'chart-waterfall':'dist','chart-histogram':'dist','chart-boxplot':'dist',
  'chart-sparkline':'spark','chart-control':'control','chart-stacked-bar':'stacked',
};

function kindOf(type, alias){
  if(SHOWCASE[type]) return SHOWCASE[type];
  if(type === 'action-status-flow') return 'action-status-flow';
  if(type === 'quality-spc-chart') return 'spc';
  if(type === 'quality-control-chart') return 'control';
  if(type === 'quality-pareto') return 'pareto';
  if(type === 'quality-checksheet') return 'checksheet';
  if(type === 'mfg-machine-status') return 'machine';
  if(type === 'data-kanban') return 'kanban';
  if(type === 'data-gantt') return 'gantt';
  if(type === 'data-tree') return 'tree';
  if(type === 'record-detail' || type === 'data-detail') return 'record';
  if(type === 'form-wizard') return 'wizard';
  if(alias === 'chart-bar' && CHART_TYPE[type]) return CHART_TYPE[type];
  if(alias === 'chart-donut'){
    if(type === 'chart-gauge' || type === 'chart-progress' || type === 'insight-target-tracker') return 'gauge';
    return 'donut';
  }
  return alias; // section-header, info-banner, kpi-row, card-container, two-column,
                // spacer, data-table, data-cards, data-timeline, filter-bar,
                // action-toolbar, action-status-flow, form-standard, chart-bar
}

/* ── demo-data builders by kind ─────────────────────────────────────────── */
const L = (vi, en) => ({ vi, en: en || vi });
let _uid = 0;
const uid = (t) => 'blk-' + t.replace(/[^a-z0-9]/gi, '') + '-' + (++_uid).toString(36);

function child(type, cfg){ const id = uid(type); return { blockId:id, id, type, visible:true, config:cfg||{} }; }

const STATUSES = ['open','in_progress','review','done'];
const NAMES = ['SO-1042','JO-2207','WO-3318','PO-5521','LOT-8830','NCR-0091'];

function tableRows(n){
  const r = [];
  for(let i=0;i<n;i++) r.push({ code:NAMES[i%NAMES.length], title:'Bản ghi '+(i+1), customer:'KH '+(1+i), status:STATUSES[i%4], owner:['An','Bình','Cường','Dung'][i%4], qty:120-(i*11), date:'2026-05-'+(10+i) });
  return r;
}

function demo(type, kind, labelVi, labelEn, icon){
  switch(kind){
    case 'section-header':
      return { text:labelVi, textEn:labelEn, level:'h3', divider:true };
    case 'info-banner':
      return { type:'info', icon:icon||'📢', text:'Đây là khối "'+labelVi+'" — banner thông tin trạng thái.', textEn:'This is the "'+labelEn+'" block — a status info banner.' };
    case 'kpi-row': {
      const cols=['var(--brand-2,#2563eb)','var(--green,#16a34a)','var(--amber,#d97706)','var(--red,#dc2626)'];
      const k=[['Tổng đơn','Total orders',1284],['Đang chạy','Active',312],['Trễ hạn','Overdue',27],['Hoàn tất','Done',945]];
      return { items:k.map((x,i)=>({ label:L(x[0],x[1]), default:x[2], color:cols[i], trend:[6,-3,12,4][i] })) };
    }
    case 'card-container': case 'three-column': case 'accordion-group':
      return { columns:3, demoData:{}, _slots:'content' };
    case 'two-column':
      return { ratio:'60-40', _slots:'lr' };
    case 'spacer':
      return { height:24 };
    case 'data-table':
      return { dataKey:'items', pageSize:5, pagination:true, demoData:{ items:tableRows(6) }, columns:[
        { key:'code', label:L('Mã','Code'), sortable:true, width:'120px' },
        { key:'title', label:L('Tên','Title'), sortable:true },
        { key:'status', label:L('Trạng thái','Status'), type:'badge', sortable:true },
        { key:'owner', label:L('Phụ trách','Owner') },
        { key:'qty', label:L('SL','Qty'), align:'right', sortable:true },
      ] };
    case 'data-cards':
      return { columns:3, dataKey:'items', titleKey:'title', subtitleKey:'customer', badgeKey:'status',
        bodyKeys:[{ key:'owner', label:'Phụ trách', labelEn:'Owner' }], demoData:{ items:tableRows(6) } };
    case 'data-timeline':
      return { items:[
        { date:'08:00', title:'Tạo lệnh', titleEn:'Created', desc:'Khởi tạo bản ghi', color:'var(--brand-2,#2563eb)' },
        { date:'09:30', title:'Phê duyệt', titleEn:'Approved', desc:'Trưởng phòng duyệt', color:'var(--green,#16a34a)' },
        { date:'13:15', title:'Bắt đầu SX', titleEn:'Production', desc:'Máy CNC-01 chạy', color:'var(--amber,#d97706)' },
        { date:'17:40', title:'Hoàn tất', titleEn:'Completed', desc:'Đạt QC', color:'var(--green,#16a34a)' },
      ] };
    case 'tree':
      return { dataKey:'items', demoData:{ items:[
        { label:'SO-1042', children:[{ label:'JO-2207', children:[{ label:'WO-3318' },{ label:'WO-3319' }] }] },
      ] } };
    case 'kanban':
      return { kanban:{ laneField:'status', card:{ titleField:'title', ownerField:'owner' },
        lanes:STATUSES.map(s=>({ key:s, label:s })) }, dataKey:'items', demoData:{ items:tableRows(6) } };
    case 'gantt':
      return { dataKey:'items', demoData:{ items:[
        { task_name:'Giai đoạn 1', start_date:'2026-05-01', end_date:'2026-05-09', percent_complete:100 },
        { task_name:'Giai đoạn 2', start_date:'2026-05-08', end_date:'2026-05-16', percent_complete:60 },
        { task_name:'Giai đoạn 3', start_date:'2026-05-15', end_date:'2026-05-24', percent_complete:25 },
      ] } };
    case 'record':
      return { fields:[
        { key:'code', label:L('Mã','Code') },{ key:'customer', label:L('Khách hàng','Customer') },
        { key:'status', label:L('Trạng thái','Status') },{ key:'qty', label:L('Số lượng','Qty') },
        { key:'owner', label:L('Phụ trách','Owner') },{ key:'date', label:L('Ngày','Date') },
      ], demoData:{ code:'SO-1042', customer:'Hesem Co', status:'in_progress', qty:240, owner:'An', date:'2026-05-18' } };
    case 'form-standard': case 'wizard':
      return { columns:2, fields:[
        { key:'code', label:L('Mã','Code'), type:'text', defaultValue:'SO-1042' },
        { key:'customer', label:L('Khách hàng','Customer'), type:'text', defaultValue:'Hesem Co' },
        { key:'due', label:L('Ngày giao','Due date'), type:'date', defaultValue:'2026-06-01' },
        { key:'priority', label:L('Ưu tiên','Priority'), type:'select', defaultValue:'normal',
          options:[{ value:'normal', label:'Bình thường' },{ value:'high', label:'Cao' }] },
        { key:'note', label:L('Ghi chú','Note'), type:'textarea', span:'full', defaultValue:'' },
      ] };
    case 'filter-bar':
      return { filters:[
        { key:'keyword', type:'search', placeholder:L('Tìm kiếm…','Search…') },
        { key:'status', type:'select', label:L('Trạng thái','Status') },
        { key:'from', type:'date', label:L('Từ ngày','From') },
      ] };
    case 'action-toolbar':
      return { buttons:[
        { label:L('Tạo mới','Create'), variant:'primary', icon:'＋' },
        { label:L('Nhập','Import'), variant:'secondary', icon:'⤓' },
        { label:L('Xuất','Export'), variant:'secondary', icon:'⤒' },
        { label:L('Làm mới','Refresh'), variant:'ghost', icon:'↻' },
      ] };
    case 'action-status-flow':
      return { workflow:{ stateField:'status',
        states:[{ id:'draft', label:'Nháp' },{ id:'review', label:'Chờ duyệt' },{ id:'approved', label:'Đã duyệt' },{ id:'closed', label:'Đóng' }],
        transitions:[{ from:'draft', to:'review', label:L('Gửi duyệt','Submit'), variant:'primary' },{ from:'draft', to:'closed', label:L('Hủy','Cancel'), variant:'danger' }] } };
    /* charts */
    case 'chart-bar':
      return { chart:{ labelField:'label', valueField:'value' }, demoData:{ items:[
        { label:'T1', value:120 },{ label:'T2', value:185 },{ label:'T3', value:142 },{ label:'T4', value:203 },{ label:'T5', value:168 } ] } };
    case 'line': case 'area': case 'spark':
      return { chart:{ labelField:'label', valueField:'value', xField:'label' }, demoData:{ items:[
        { label:'T1', value:120 },{ label:'T2', value:138 },{ label:'T3', value:129 },{ label:'T4', value:171 },{ label:'T5', value:160 },{ label:'T6', value:192 } ] } };
    case 'stacked':
      return { chart:{ xField:'label', series:[{ valueField:'plan', label:'Kế hoạch' },{ valueField:'actual', label:'Thực tế' }] },
        demoData:{ items:[{ label:'T1', plan:120, actual:110 },{ label:'T2', plan:150, actual:165 },{ label:'T3', plan:140, actual:132 }] } };
    case 'combo':
      return { chart:{ xField:'label' }, barSeries:[{ valueField:'value', label:'Sản lượng' }], lineSeries:[{ valueField:'oee', label:'OEE %' }],
        demoData:{ items:[{ label:'T1', value:120, oee:72 },{ label:'T2', value:165, oee:78 },{ label:'T3', value:140, oee:75 },{ label:'T4', value:190, oee:83 }] } };
    case 'scatter':
      return { chart:{ xField:'x', yField:'y', zField:'r' }, demoData:{ items:[
        { x:12, y:30, r:6 },{ x:24, y:55, r:10 },{ x:38, y:42, r:8 },{ x:51, y:68, r:14 },{ x:66, y:60, r:9 } ] } };
    case 'radar':
      return { chart:{ categoryField:'category', valueField:'value', seriesField:'series' }, demoData:{ items:[
        { series:'Hiện tại', category:'Chi phí', value:80 },{ series:'Hiện tại', category:'Chất lượng', value:90 },{ series:'Hiện tại', category:'Giao hàng', value:70 },
        { series:'Hiện tại', category:'An toàn', value:85 },{ series:'Hiện tại', category:'Năng suất', value:75 } ] } };
    case 'donut':
      return { chart:{ labelField:'label', valueField:'value' }, demoData:{ items:[
        { label:'Đạt', value:820, color:'var(--green,#16a34a)' },{ label:'Cảnh báo', value:140, color:'var(--amber,#d97706)' },{ label:'Lỗi', value:60, color:'var(--red,#dc2626)' } ] } };
    case 'gauge':
      return { gauge:{ valueField:'value', targetField:'target', min:0, max:100, unit:'%', showTarget:true, showDelta:true }, demoData:{ items:[{ value:78, target:85 }] } };
    case 'heatmap':
      return { chart:{ xField:'x', yField:'y', valueField:'value', showLabels:true }, demoData:{ items:(()=>{ const r=[]; const xs=['T2','T3','T4','T5','T6']; const ys=['CNC-01','CNC-02','LASER-1']; ys.forEach(y=>xs.forEach((x,i)=>r.push({ x, y, value: 10+((i*7+y.length*5)%40) }))); return r; })() } };
    case 'dist':
      return { distribution:{ categoryField:'category', valueField:'value', binCount:8 }, demoData:{ items:[
        { category:'Khởi điểm', value:100 },{ category:'Vật tư', value:-22 },{ category:'Nhân công', value:-15 },{ category:'Máy', value:18 },{ category:'Kết quả', value:12 } ] } };
    case 'pareto':
      return { distribution:{ categoryField:'category', valueField:'value' }, demoData:{ items:[
        { category:'Xước bề mặt', value:48 },{ category:'Sai kích thước', value:31 },{ category:'Ba via', value:22 },{ category:'Nứt', value:12 },{ category:'Khác', value:7 } ] } };
    case 'spc':
      return { spc:{ valueField:'value', target:50, usl:56, lsl:44 }, demoData:{ items:[50,51,49,52,48,53,50,47,54,49,51,50].map((v,i)=>({ value:v, idx:i+1 })) } };
    case 'control':
      return { spc:{ chartMode:'xbar-r', valueField:'measured_value', subgroupSize:3, timestampField:'measured_at' },
        demoData:{ items:Array.from({length:24}).map((_,i)=>({ measured_value:50+Math.round(6*Math.sin(i/2)), measured_at:'2026-05-'+(1+(i%28)) })) } };
    case 'checksheet':
      return { columns:[{ key:'check', label:L('Hạng mục','Item') },{ key:'ca1', label:L('Ca 1','Shift 1') },{ key:'ca2', label:L('Ca 2','Shift 2') }],
        rows:[{ check:'Xước bề mặt', ca1:2, ca2:1 },{ check:'Sai kích thước', ca1:1, ca2:3 },{ check:'Ba via', ca1:0, ca2:2 }] };
    case 'machine':
      return { demoData:{ items:[
        { name:'CNC-01', status:'running', oee:82, currentJob:'JO-2207', operator:'An', lastUpdate:'2026-05-18T13:20' },
        { name:'CNC-02', status:'idle', oee:55, currentJob:'', operator:'Bình', lastUpdate:'2026-05-18T13:10' },
        { name:'LASER-1', status:'down', oee:0, currentJob:'', operator:'Cường', reason:'Bảo trì', lastUpdate:'2026-05-18T12:50' },
        { name:'PRESS-3', status:'running', oee:74, currentJob:'JO-2210', operator:'Dung', lastUpdate:'2026-05-18T13:22' } ] } };
    /* showcase renderers */
    case 'funnel':
      return { funnel:{ labelField:'label', valueField:'value' }, demoData:{ items:[
        { label:'Lead', value:1000 },{ label:'Báo giá', value:620 },{ label:'Đàm phán', value:340 },{ label:'Chốt đơn', value:180 } ] } };
    case 'scorecard':
      return { demoData:{ items:[
        { label:L('OEE','OEE'), value:82, target:85, unit:'%' },{ label:L('Đúng hạn','On-time'), value:94, target:95, unit:'%' },
        { label:L('Tỷ lệ lỗi','Defect'), value:1.8, target:2, unit:'%' },{ label:L('Năng suất','Throughput'), value:1180, target:1100 } ] } };
    case 'breadcrumb':
      return { demoData:{ items:[{ label:'Trang chủ' },{ label:'Sản xuất' },{ label:'Lệnh JO' },{ label:'JO-2207' }] } };
    case 'steps':
      return { demoData:{ items:[
        { label:'Tiếp nhận', state:'done' },{ label:'Lập kế hoạch', state:'done' },{ label:'Sản xuất', state:'active' },{ label:'Kiểm tra', state:'todo' },{ label:'Giao hàng', state:'todo' } ] } };
    case 'pills':
      return { demoData:{ items:[{ label:'Tất cả', active:true, count:128 },{ label:'Đang chạy', count:42 },{ label:'Chờ duyệt', count:11 },{ label:'Đã đóng', count:75 }] } };
    case 'pagination':
      return { page:2, pageCount:9 };
    case 'links':
      return { demoData:{ items:[
        { icon:'📦', label:'Đơn hàng', desc:'Quản lý SO/JO/WO' },{ icon:'🏭', label:'Sản xuất', desc:'Lịch & máy' },
        { icon:'🛡️', label:'Chất lượng', desc:'NCR, CAPA, SPC' },{ icon:'📊', label:'Báo cáo', desc:'KPI & dashboard' } ] } };
    case 'image':
      return { caption:'Sơ đồ chuyền sản xuất CNC', captionEn:'CNC production line layout' };
    case 'gallery':
      return { demoData:{ items:[{ caption:'Trạm 1' },{ caption:'Trạm 2' },{ caption:'Trạm 3' },{ caption:'Trạm 4' },{ caption:'Trạm 5' },{ caption:'Trạm 6' }] } };
    case 'embed':
      return { kind: type==='media-video'?'video': type==='media-pdf'?'pdf':'iframe', caption: type==='media-video'?'Video hướng dẫn vận hành':'Nội dung nhúng', src:'/docs/handbook' };
    case 'richtext':
      return { heading:'Hướng dẫn thao tác', headingEn:'Work instruction',
        text:'Bước 1: Kiểm tra phôi đầu vào và đối chiếu bản vẽ.\n\nBước 2: Thiết lập dao cụ theo phiếu setup, chạy thử 1 sản phẩm.\n\nBước 3: Đo nghiệm thu, ghi nhận vào checksheet và phát hành lô.',
        textEn:'Step 1: Inspect incoming blanks against the drawing.\n\nStep 2: Set up tooling per the setup sheet and run one trial part.\n\nStep 3: Verify, record on the checksheet and release the lot.' };
    case 'device':
      return { demoData:{ items:[
        { name:'CNC-01', status:'online', metric:82, unit:'%', metricLabel:L('OEE','OEE') },
        { name:'CNC-02', status:'idle', metric:55, unit:'%', metricLabel:L('OEE','OEE') },
        { name:'LASER-1', status:'offline', metric:0, unit:'%', metricLabel:L('OEE','OEE') },
        { name:'PRESS-3', status:'online', metric:74, unit:'%', metricLabel:L('OEE','OEE') } ] } };
    case 'sensor':
      return { demoData:{ items:[
        { label:'Nhiệt độ', value:62, unit:'°C', min:0, max:100, state:'ok' },
        { label:'Rung', value:4.8, unit:'mm/s', min:0, max:10, state:'watch' },
        { label:'Áp suất', value:6.2, unit:'bar', min:0, max:8, state:'ok' },
        { label:'Tải', value:91, unit:'%', min:0, max:100, state:'critical' } ] } };
    case 'sla':
      return { demoData:{ items:[
        { label:'NCR-0091 phản hồi', remaining:185, total:240, state:'ok' },
        { label:'CAPA-0042 hành động', remaining:42, total:480, state:'watch' },
        { label:'PO-5521 phê duyệt', remaining:-30, total:120, state:'breach' } ] } };
    case 'board':
      return { statusKey:'status', demoData:{ items:tableRows(6) },
        lanes:[{ key:'open', label:'Mở' },{ key:'in_progress', label:'Đang xử lý' },{ key:'review', label:'Chờ duyệt' },{ key:'done', label:'Hoàn tất' }] };
    default:
      return { demoData:{ items:tableRows(4) } };
  }
}

const tabs = CATS.map(([key, vi, en, icon, types]) => {
  let order = 0;
  const blocks = [];
  types.forEach(([type, lv, le, ic, alias]) => {
    const kind = kindOf(type, alias);
    const cfg = demo(type, kind, lv, le, ic);
    let slots;
    if(cfg._slots === 'content'){ delete cfg._slots; slots = { content:[ child('kpi-row', demo('kpi-row','kpi-row','','','')), child('section-header', demo('section-header','section-header','Khối con','Child block','')) ] }; }
    else if(cfg._slots === 'lr'){ delete cfg._slots; slots = { left:[ child('kpi-row', demo('kpi-row','kpi-row','','','')) ], right:[ child('data-timeline', demo('data-timeline','data-timeline','','','')) ] }; }
    const id = uid(type);
    const b = { blockId:id, id, type, visible:true, order:++order, title:L(lv+'  ['+type+']', le+'  ['+type+']'), subtitle:L('',''), config:cfg };
    if(slots) b.slots = slots;
    blocks.push(b);
  });
  return { tabId:key, title:L(vi, en), icon, layout:{ type:'stack', columns:1, gap:'16px', align:'stretch' }, blocks };
});

const schema = {
  moduleId:'M-lego-showcase',
  title:L('Thư viện Lego', 'Lego Showcase'),
  subtitle:L('Mọi block lego của Block Engine — một thể hiện mỗi loại, dữ liệu mẫu sẵn, thuộc tính mặc định lấy từ Module Master.',
             'Every Block Engine lego — one instance per type with demo data; default styling resolved from Module Master.'),
  icon:'🧩',
  route:'/lego-showcase',
  roles:['admin','it_admin','ceo'],
  version:1,
  createdBy:'claude',
  createdAt:'2026-05-31T00:00:00+07:00',
  tabs,
};

const total = tabs.reduce((n,t)=>n+t.blocks.length,0);
writeFileSync(new URL('../../mom/data/modules/M-lego-showcase.json', import.meta.url), JSON.stringify(schema, null, 2));
console.log('Wrote M-lego-showcase.json — '+tabs.length+' tabs, '+total+' blocks');
tabs.forEach(t=>console.log('  '+t.tabId.padEnd(14)+t.blocks.length+' blocks'));

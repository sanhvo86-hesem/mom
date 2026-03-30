/* ===================================================================
   14-exception-dashboard.js
   HESEM QMS Portal - Exception Dashboard
   Standalone workspace for overdue allocations, upload failures,
   overdue orders, overdue CAPA, missing evidence, NC program mismatches,
   and orphan links.
   =================================================================== */

(function(){
'use strict';

var REFRESH_INTERVAL_MS = 5 * 60 * 1000;

var state = {
  container: null,
  summary: null,
  expandedType: '',
  detailItems: [],
  detailTotal: 0,
  detailPage: 1,
  detailPages: 1,
  refreshTimer: null,
  loading: false
};

function repairMojibake(text){
  if(typeof text !== 'string') return text;
  if(!/[ÃÄÂÆáºá»]/.test(text)) return text;
  if(typeof TextDecoder === 'undefined') return text;
  try {
    var bytes = new Uint8Array(Array.prototype.map.call(text, function(ch){ return ch.charCodeAt(0) & 255; }));
    var decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.indexOf('\uFFFD') >= 0 ? text : decoded;
  } catch (_error) {
    return text;
  }
}

var EXCEPTION_CATEGORIES = [
  { key: 'all', labelVi: 'Tất cả', labelEn: 'All' },
  { key: 'production', labelVi: 'Sản xuất', labelEn: 'Production' },
  { key: 'orders', labelVi: 'Đơn hàng', labelEn: 'Orders' },
  { key: 'evidence', labelVi: 'Hồ sơ', labelEn: 'Evidence' },
  { key: 'system', labelVi: 'Hệ thống', labelEn: 'System' }
];
var _excFilterCategory = 'all';
var _excShowZero = false;

var EXCEPTION_TYPES = [
  {
    key: 'overdue_allocations',
    icon: '\u23f3',
    accent: '#dc2626',
    surface: '#fff1f2',
    border: '#fecdd3',
    labelVi: 'C\u1ea5p ph\u00e1t qu\u00e1 h\u1ea1n',
    labelEn: 'Overdue allocations',
    descVi: 'Bi\u1ec3u m\u1eabu \u0111\u00e3 c\u1ea5p ph\u00e1t nh\u01b0ng qu\u00e1 h\u1ea1n n\u1ed9p l\u1ea1i.',
    descEn: 'Forms were issued but have passed the expected return window.',
    page: 'forms',
    category: 'evidence',
    severity: 'critical'
  },
  {
    key: 'failed_uploads',
    icon: '\ud83d\udce4',
    accent: '#d97706',
    surface: '#fff7ed',
    border: '#fdba74',
    labelVi: 'Upload th\u1ea5t b\u1ea1i',
    labelEn: 'Failed uploads',
    descVi: 'T\u1ec7p b\u1ecb t\u1eeb ch\u1ed1i ho\u1eb7c kh\u00f4ng qua b\u01b0\u1edbc x\u00e1c minh.',
    descEn: 'Files were rejected or did not pass verification.',
    page: 'forms',
    category: 'evidence',
    severity: 'warning'
  },
  {
    key: 'overdue_orders',
    icon: '\ud83d\udce6',
    accent: '#b91c1c',
    surface: '#fef2f2',
    border: '#fca5a5',
    labelVi: '\u0110\u01a1n h\u00e0ng qu\u00e1 h\u1ea1n',
    labelEn: 'Overdue orders',
    descVi: 'SO / JO / WO \u0111\u00e3 qu\u00e1 ng\u00e0y giao ho\u1eb7c m\u1ed1c ho\u00e0n th\u00e0nh.',
    descEn: 'SO / JO / WO have passed committed due dates.',
    page: 'orders',
    category: 'orders',
    severity: 'critical'
  },
  {
    key: 'overdue_capas',
    icon: '\ud83e\udde9',
    accent: '#ca8a04',
    surface: '#fefce8',
    border: '#fde68a',
    labelVi: 'CAPA m\u1edf qu\u00e1 h\u1ea1n',
    labelEn: 'Overdue CAPA',
    descVi: 'CAPA \u0111ang m\u1edf qu\u00e1 l\u00e2u, c\u1ea7n escalation.',
    descEn: 'Open CAPAs have exceeded their expected action window.',
    page: 'forms',
    category: 'evidence',
    severity: 'warning'
  },
  {
    key: 'review_sla_gaps',
    icon: '🕰️',
    accent: '#be123c',
    surface: '#fff1f2',
    border: '#fda4af',
    labelVi: 'Review SLA cần xử lý',
    labelEn: 'Review SLA gaps',
    descVi: 'Hồ sơ đang in-review nhưng đã sắp đến hạn, quá hạn hoặc đã escalation theo chính sách review SLA.',
    descEn: 'Records in review are due soon, overdue, or already escalated under the review SLA policy.',
    page: 'forms',
    category: 'evidence',
    severity: 'warning'
  },
  {
    key: 'wo_missing_evidence',
    icon: '\ud83e\uddfe',
    accent: '#ea580c',
    surface: '#fff7ed',
    border: '#fdba74',
    labelVi: 'WO thi\u1ebfu ch\u1ee9ng c\u1ee9',
    labelEn: 'WO missing evidence',
    descVi: 'L\u1ec7nh \u0111ang ch\u1ea1y nh\u01b0ng ch\u01b0a \u0111\u1ee7 form / b\u1eb1ng ch\u1ee9ng gate.',
    descEn: 'Work orders are active without the required gate evidence.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'program_mismatches',
    icon: '\ud83d\udcbe',
    accent: '#7c3aed',
    surface: '#f5f3ff',
    border: '#c4b5fd',
    labelVi: 'Lệch chương trình NC',
    labelEn: 'Program mismatch',
    descVi: 'Chương trình máy đang báo về không khớp với WO đã phát hành.',
    descEn: 'The machine-reported NC program does not match the released WO.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'program_release_risk',
    icon: '\ud83d\udddc\ufe0f',
    accent: '#2563eb',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'Thiếu release NC',
    labelEn: 'NC release risk',
    descVi: 'WO chưa có bản phát hành NC hợp lệ theo part, revision, operation hoặc machine context.',
    descEn: 'The WO does not yet have a valid governed NC release for its part, revision, operation, or machine context.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'tool_readiness_risk',
    icon: '\ud83e\uddf0',
    accent: '#0f766e',
    surface: '#ecfeff',
    border: '#99f6e4',
    labelVi: 'Tooling chưa sẵn sàng',
    labelEn: 'Tool readiness risk',
    descVi: 'WO đang bị chặn bởi tool-life, offset hoặc dữ liệu runtime tooling chưa đủ.',
    descEn: 'The WO is blocked by tool-life, offset drift, or incomplete tooling runtime.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'operator_qualification_gaps',
    icon: '\ud83d\udc77',
    accent: '#dc2626',
    surface: '#fef2f2',
    border: '#fecaca',
    labelVi: 'Thi\u1ebfu n\u0103ng l\u1ef1c v\u1eadn h\u00e0nh',
    labelEn: 'Operator qualification gaps',
    descVi: 'WO \u0111ang g\u00e1n ng\u01b0\u1eddi v\u1eadn h\u00e0nh ch\u01b0a \u0111\u1ee7 \u0111i\u1ec1u ki\u1ec7n theo machine, work center ho\u1eb7c hi\u1ec7u l\u1ef1c n\u0103ng l\u1ef1c.',
    descEn: 'The WO is assigned to an operator who is not fully qualified for the machine, work center, or validity window.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'material_trace_gaps',
    icon: '\ud83e\uddea',
    accent: '#ea580c',
    surface: '#fff7ed',
    border: '#fdba74',
    labelVi: 'Thi\u1ebfu truy xu\u1ea5t v\u1eadt li\u1ec7u',
    labelEn: 'Material trace gaps',
    descVi: 'WO ch\u01b0a \u0111\u1ee7 lot, heat, traveler ho\u1eb7c tr\u1ea1ng th\u00e1i ch\u1ee9ng ch\u1ec9 v\u1eadt li\u1ec7u \u0111\u1ec3 kh\u00f3a traceability.',
    descEn: 'The WO is missing lot, heat, traveler, or material certificate status required for governed traceability.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'material_genealogy_gaps',
    icon: '🧬',
    accent: '#ea580c',
    surface: '#fff7ed',
    border: '#fdba74',
    labelVi: 'Genealogy vật liệu chưa kín',
    labelEn: 'Material genealogy gaps',
    descVi: 'Bản ghi issue vật liệu hoặc genealogy thành phẩm chưa khép kín theo WO đã hoàn thành.',
    descEn: 'Material issue and finished-part genealogy records are not yet closed for completed WO.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'shift_handover_gaps',
    icon: '🔄',
    accent: '#0f766e',
    surface: '#ecfeff',
    border: '#99f6e4',
    labelVi: 'Bàn giao ca chưa hoàn tất',
    labelEn: 'Shift handover gaps',
    descVi: 'Máy hoặc WO đang hoạt động nhưng chưa có bàn giao ca hợp lệ hoặc chưa được xác nhận đúng hạn.',
    descEn: 'Active machines or WO still need a valid shift handover or overdue acknowledgement.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'connector_governance_gaps',
    icon: '\ud83d\udd0c',
    accent: '#2563eb',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'Thi\u1ebfu \u0111i\u1ec1u ki\u1ec7n k\u1ebft n\u1ed1i m\u00e1y',
    labelEn: 'Connector governance gaps',
    descVi: 'Heartbeat, telemetry mode ho\u1eb7c ch\u00ednh s\u00e1ch connector c\u1ee7a m\u00e1y ch\u01b0a \u0111\u1ea1t \u0111i\u1ec1u ki\u1ec7n \u0111\u1ec3 m\u1edf WO.',
    descEn: 'Heartbeat, telemetry mode, or machine connector policy does not yet satisfy WO launch conditions.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'adapter_governance_risk',
    icon: '\ud83d\udd0b',
    accent: '#2563eb',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'Adapter kết nối chưa đạt chuẩn',
    labelEn: 'Adapter governance risk',
    descVi: 'Adapter MTConnect / OPC UA / bridge còn lệch cấu hình hoặc chưa đạt chính sách vận hành cần thiết.',
    descEn: 'MTConnect / OPC UA / bridge adapters still violate governed runtime policy or required configuration.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'alarm_hotspots',
    icon: '\ud83d\udea8',
    accent: '#dc2626',
    surface: '#fef2f2',
    border: '#fecaca',
    labelVi: 'Alarm máy đang hoạt động',
    labelEn: 'Active machine alarms',
    descVi: 'Máy đang giữ alarm nóng cần xử lý theo playbook trước khi tiếp tục chạy WO.',
    descEn: 'Machines currently hold active alarms that should be worked through governed playbooks before WO execution continues.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'alarm_ack_gaps',
    icon: '🧯',
    accent: '#be123c',
    surface: '#fff1f2',
    border: '#fda4af',
    labelVi: 'Alarm chờ xác nhận',
    labelEn: 'Alarm acknowledgement gaps',
    descVi: 'Alarm đã lên nhưng chưa được acknowledge, escalation hoặc clear đúng hạn theo playbook.',
    descEn: 'Raised alarms still need acknowledgement, escalation, or governed clearing within the playbook window.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'nc_download_mismatches',
    icon: '\ud83d\udcbe',
    accent: '#7c3aed',
    surface: '#f5f3ff',
    border: '#c4b5fd',
    labelVi: 'Biên nhận tải NC không khớp',
    labelEn: 'NC download mismatches',
    descVi: 'Biên nhận tải NC từ máy không khớp release package, revision hoặc controller-side verification.',
    descEn: 'Controller-side NC download receipts do not match the released package, revision, or verification signature.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'tool_offset_risk',
    icon: '\ud83d\udccf',
    accent: '#0f766e',
    surface: '#ecfeff',
    border: '#99f6e4',
    labelVi: 'Preset và offset chưa đạt',
    labelEn: 'Tool offset risk',
    descVi: 'Preset, offset hoặc lineage của bộ dao chưa đủ điều kiện để mở chạy WO an toàn.',
    descEn: 'Tool preset, offset, or assembly lineage is not yet ready for safe WO execution.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'launch_blocker_hotspots',
    icon: '⛔',
    accent: '#b91c1c',
    surface: '#fef2f2',
    border: '#fca5a5',
    labelVi: 'WO bị chặn mở chạy',
    labelEn: 'WO launch blockers',
    descVi: 'WO đã bị MES chặn chuyển sang setup hoặc running vì chưa đạt điều kiện release, tooling, trace hoặc connector.',
    descEn: 'Work orders were blocked by MES from moving into setup or running because mandatory release, tooling, trace, or connector conditions were not met.',
    page: 'mes',
    category: 'production',
    severity: 'critical'
  },
  {
    key: 'shadow_sync_failures',
    icon: '\ud83c\udf10',
    accent: '#7c3aed',
    surface: '#f5f3ff',
    border: '#c4b5fd',
    labelVi: 'L\u1ed7i \u0111\u1ed3ng b\u1ed9 shadow sync',
    labelEn: 'Shadow sync failures',
    descVi: 'Mirror JSON -> PostgreSQL b\u1ecb l\u1ed7i, c\u1ea7n kh\u00f4i ph\u1ee5c \u0111\u1ec3 analytics v\u00e0 audit kh\u00f4ng l\u1ec7ch.',
    descEn: 'JSON -> PostgreSQL shadow sync has failed and should be recovered before analytics and audit diverge.',
    page: 'mes',
    category: 'system',
    severity: 'warning'
  },
  {
    key: 'primary_read_fallbacks',
    icon: '\ud83d\udee0\ufe0f',
    accent: '#2563eb',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'Primary read đang fallback',
    labelEn: 'Primary-read fallbacks',
    descVi: 'Read model đang phải quay về JSON thay vì đọc PostgreSQL mirror nên cần rà lại health của shadow layer.',
    descEn: 'Read models are falling back to JSON instead of PostgreSQL mirror reads and the shadow layer should be reviewed.',
    page: 'mes',
    category: 'system',
    severity: 'info'
  },
  {
    key: 'epicor_sync_status',
    icon: '🔁',
    accent: '#0f766e',
    surface: '#ecfeff',
    border: '#99f6e4',
    labelVi: 'Epicor sync lệch nhịp',
    labelEn: 'Epicor sync gaps',
    descVi: 'Đồng bộ, đối soát hoặc outbox giữa MES và Epicor đang có miền dữ liệu xuống cấp.',
    descEn: 'Synchronization, reconciliation, or outbox health between MES and Epicor is degraded.',
    page: 'mes',
    category: 'system',
    severity: 'warning'
  },
  {
    key: 'downtime_governance_gaps',
    icon: '\ud83e\udde0',
    accent: '#be185d',
    surface: '#fdf2f8',
    border: '#f9a8d4',
    labelVi: 'Downtime thiếu mã quản trị',
    labelEn: 'Ungoverned downtime',
    descVi: 'Sự kiện downtime chưa có mã lý do hoặc mã khôi phục hợp lệ nên sẽ làm bẩn analytics.',
    descEn: 'Downtime records are missing governed reason or resolution codes and will contaminate analytics.',
    page: 'mes',
    category: 'production',
    severity: 'warning'
  },
  {
    key: 'dpp_readiness_gaps',
    icon: '🪪',
    accent: '#1d4ed8',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'DPP chưa sẵn sàng',
    labelEn: 'DPP readiness gaps',
    descVi: 'WO hoặc genealogy chưa đủ passport số, vật liệu, carbon, năng lượng hoặc đường dẫn truy xuất theo mức công bố bên ngoài.',
    descEn: 'The WO or genealogy is still missing digital product passport, material, carbon, energy, or trace-link coverage for external disclosure.',
    page: 'mes',
    category: 'system',
    severity: 'info'
  },
  {
    key: 'energy_tracking_gaps',
    icon: '⚡',
    accent: '#ca8a04',
    surface: '#fefce8',
    border: '#fde68a',
    labelVi: 'Theo dõi năng lượng còn hở',
    labelEn: 'Energy tracking gaps',
    descVi: 'Máy đang chạy nhưng thiếu power telemetry, thiếu snapshot năng lượng hoặc vượt mục tiêu kWh trên mỗi sản phẩm.',
    descEn: 'Running machines are missing power telemetry, missing governed energy snapshots, or exceeding the kWh-per-unit target.',
    page: 'mes',
    category: 'system',
    severity: 'info'
  },
  {
    key: 'cost_variance_risk',
    icon: '💸',
    accent: '#b45309',
    surface: '#fff7ed',
    border: '#fdba74',
    labelVi: 'Cost variance vượt ngưỡng',
    labelEn: 'Cost variance risk',
    descVi: 'WO đang thiếu snapshot costing hoặc actual cost đang vượt ngưỡng variance đã quản trị.',
    descEn: 'The WO is missing governed costing snapshots or its actual cost is above the allowed variance threshold.',
    page: 'mes',
    category: 'orders',
    severity: 'warning'
  },
  {
    key: 'orphan_links',
    icon: '\ud83e\uddf7',
    accent: '#2563eb',
    surface: '#eff6ff',
    border: '#93c5fd',
    labelVi: 'Li\u00ean k\u1ebft m\u1ed3 c\u00f4i',
    labelEn: 'Orphan links',
    descVi: 'B\u1ea3n ghi \u0111\u00e3 link nh\u01b0ng kh\u00f4ng c\u00f2n \u0111\u01a1n h\u00e0ng h\u1ee3p l\u1ec7.',
    descEn: 'Evidence links point to orders that no longer exist.',
    page: 'orders',
    category: 'evidence',
    severity: 'info'
  }
];

function t(vi, en){
  var value = (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
  return repairMojibake(value);
}
function esc(value){
  var div = document.createElement('div');
  div.textContent = String(repairMojibake(value == null ? '' : value));
  return div.innerHTML;
}
function cfgFor(type){
  return EXCEPTION_TYPES.find(function(item){ return item.key === type; }) || null;
}

function ensureStyles(){
  if (document.getElementById('exception-dashboard-styles')) return;
  var style = document.createElement('style');
  style.id = 'exception-dashboard-styles';
  style.textContent = [
    '.excx{padding:24px 24px 42px;max-width:1500px;margin:0 auto;color:#0f172a}',
    '.excx-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:18px;align-items:stretch;margin-bottom:18px}',
    '.excx-poster{position:relative;overflow:hidden;border-radius:30px;padding:28px 30px 26px;background:linear-gradient(145deg,#0c2d48 0%,#15466f 46%,#1f6aa5 100%);color:#fff;box-shadow:0 28px 70px rgba(12,45,72,.22)}',
    '.excx-poster::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0) 42%)}',
    '.excx-poster::after{content:"";position:absolute;right:-120px;top:-90px;width:300px;height:300px;border-radius:999px;background:radial-gradient(circle,rgba(249,168,37,.28) 0%,rgba(249,168,37,0) 72%)}',
    '.excx-hero-top,.excx-side-top{position:relative;z-index:1;display:flex;justify-content:space-between;gap:14px;align-items:flex-start}',
    '.excx-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.7);font-weight:800}',
    '.excx-poster h1{margin:10px 0 10px;font-size:34px;line-height:1.06;letter-spacing:-.03em}',
    '.excx-poster p{margin:0;max-width:760px;font-size:14px;line-height:1.72;color:rgba(255,255,255,.86)}',
    '.excx-facts{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}',
    '.excx-fact{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:800;color:#fff}',
    '.excx-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}',
    '.excx-btn{height:42px;border:none;border-radius:14px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}',
    '.excx-btn:hover{transform:translateY(-1px)}',
    '.excx-btn.primary{background:#f9a825;color:#12253a;box-shadow:0 14px 26px rgba(249,168,37,.28)}',
    '.excx-btn.secondary{background:rgba(255,255,255,.11);color:#fff;border:1px solid rgba(255,255,255,.14)}',
    '.excx-btn.ghost{background:#fff;color:#0c2d48;border:1px solid #dbe4ef}',
    '.excx-side{display:grid;grid-template-rows:auto auto;gap:18px}',
    '.excx-card{background:#fff;border:1px solid #e2e8f0;border-radius:26px;box-shadow:0 18px 44px rgba(15,23,42,.06)}',
    '.excx-clock{padding:22px 22px 18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)}',
    '.excx-clock strong{display:block;margin-top:10px;font-size:30px;line-height:1;color:#0c2d48}',
    '.excx-clock small{display:block;font-size:12px;color:#64748b;line-height:1.7;margin-top:8px}',
    '.excx-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}',
    '.excx-kpi{border-radius:18px;padding:16px;background:#f8fafc;border:1px solid #e5edf6}',
    '.excx-kpi small{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px}',
    '.excx-kpi strong{display:block;font-size:30px;line-height:1;color:#0c2d48}',
    '.excx-kpi span{display:block;font-size:12px;color:#64748b;margin-top:8px;line-height:1.55}',
    '.excx-main{display:grid;gap:18px;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr)}',
    '.excx-panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 16px 40px rgba(15,23,42,.05);padding:18px}',
    '.excx-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}',
    '.excx-panel-head h2{margin:0;font-size:18px;color:#0c2d48}',
    '.excx-panel-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.68}',
    '.excx-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
    '.excx-card-button{position:relative;border:1px solid var(--card-border);background:linear-gradient(180deg,#fff 0%,var(--card-bg) 100%);border-radius:22px;padding:16px;text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;box-shadow:0 10px 24px rgba(15,23,42,.04)}',
    '.excx-card-button:hover{transform:translateY(-2px);box-shadow:0 18px 34px rgba(15,23,42,.08)}',
    '.excx-card-button.active{border-color:var(--card-accent);box-shadow:0 20px 38px color-mix(in srgb, var(--card-accent) 18%, transparent)}',
    '.excx-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
    '.excx-icon{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--card-accent) 14%, white);font-size:20px}',
    '.excx-count{font-size:34px;line-height:1;font-weight:800;color:var(--card-accent)}',
    '.excx-card-button h3{margin:14px 0 4px;font-size:14px;color:#0f172a}',
    '.excx-card-button p{margin:0;font-size:12px;line-height:1.62;color:#64748b}',
    '.excx-go{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:11px;font-weight:800;color:var(--card-accent)}',
    '.excx-detail-wrap{display:grid;gap:16px}',
    '.excx-empty{padding:24px;border:1px dashed #cbd5e1;border-radius:18px;background:#f8fafc;text-align:center;font-size:12px;color:#64748b;line-height:1.7}',
    '.excx-empty strong{display:block;color:#0c2d48;margin-bottom:6px}',
    '.excx-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:18px}',
    '.excx-table{width:100%;border-collapse:collapse;min-width:860px}',
    '.excx-table th,.excx-table td{padding:12px 14px;border-bottom:1px solid #eef2f6;font-size:12px;text-align:left;vertical-align:top}',
    '.excx-table th{background:#f8fafc;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800}',
    '.excx-code{font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#0f172a}',
    '.excx-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:color-mix(in srgb, var(--pill) 14%, white);color:var(--pill);font-size:11px;font-weight:800}',
    '.excx-row-actions{display:flex;flex-wrap:wrap;gap:8px}',
    '.excx-link{border:none;background:#eef4fb;color:#0c2d48;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;transition:transform .14s ease,background .14s ease}',
    '.excx-link:hover{transform:translateY(-1px);background:#e0edfd}',
    '.excx-pagination{display:flex;justify-content:center;align-items:center;gap:10px;padding-top:4px}',
    '.excx-muted{font-size:12px;color:#64748b;line-height:1.6}',
    '.excx-filter-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;padding:10px 0}',
    '.excx-filter-btn{border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;transition:all .16s ease}',
    '.excx-filter-btn:hover{background:#eef4fb;color:#0c2d48;border-color:#93c5fd}',
    '.excx-filter-btn.active{background:#0c2d48;color:#fff;border-color:#0c2d48}',
    '.excx-toggle-zero{display:flex;align-items:center;gap:6px;margin-left:auto;font-size:11px;font-weight:700;color:#64748b;cursor:pointer;user-select:none}',
    '.excx-toggle-zero input{accent-color:#0c2d48}',
    '.excx-sev{display:inline-block;margin-left:6px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;vertical-align:middle;letter-spacing:.04em}',
    '.excx-sev-crit{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}',
    '.excx-sev-warn{background:#fffbeb;color:#d97706;border:1px solid #fde68a}',
    '.excx-card-zero{opacity:.5;filter:grayscale(.3)}',
    '.excx-card-zero:hover{opacity:.8;filter:none}',
    '@media (max-width: 1200px){.excx-hero,.excx-main{grid-template-columns:1fr}.excx-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width: 820px){.excx{padding:18px 16px 32px}.excx-grid,.excx-kpi-grid{grid-template-columns:1fr}.excx-poster,.excx-card,.excx-panel{border-radius:22px}.excx-poster h1{font-size:28px}}'
  ].join('');
  document.head.appendChild(style);
}

function currentStamp(){
  var d = new Date();
  return d.toLocaleString((typeof lang !== 'undefined' && lang === 'en') ? 'en-GB' : 'vi-VN', {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
  });
}

function api(action, payload, method){
  var callMethod = method || 'GET';
  if (typeof apiCall === 'function') return apiCall(action, payload || {}, callMethod, 30000);
  var url = 'api.php?action=' + encodeURIComponent(action);
  if (callMethod === 'GET' && payload) {
    Object.keys(payload).forEach(function(key){
      var value = payload[key];
      if (value === undefined || value === null || value === '') return;
      url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(value));
    });
  }
  var options = { method: callMethod, credentials: 'include', headers: {} };
  if (typeof csrfToken !== 'undefined' && csrfToken) options.headers['X-CSRF-Token'] = csrfToken;
  if (callMethod !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload || {});
  }
  return fetch(url, options).then(function(response){ return response.json(); });
}

function buildShell(){
  return [
    '<div class="excx">',
    '  <section class="excx-hero">',
    '    <article class="excx-poster">',
    '      <div class="excx-hero-top">',
    '        <div>',
    '          <div class="excx-kicker">' + esc(t('Exception Control', 'Exception Control')) + '</div>',
    '          <h1>' + esc(t('Bảng ngoại lệ vận hành', 'Operational exception board')) + '</h1>',
    '          <p>' + esc(t('Theo dõi tập trung các điểm nghẽn ảnh hưởng trực tiếp đến cấp phát, upload, giao hàng, CAPA và tính sẵn sàng của chứng cứ để trưởng ca xử lý dứt điểm trong một nơi.', 'Consolidated oversight for the exceptions that directly affect issuance, uploads, delivery, CAPA, and evidence readiness so supervisors can close them out from one place.')) + '</p>',
    '        </div>',
    '        <button type="button" class="excx-btn secondary" onclick="window._excRefreshNow()">\ud83d\udd04 ' + esc(t('Làm mới', 'Refresh')) + '</button>',
    '      </div>',
    '      <div class="excx-facts">',
    '        <span class="excx-fact">\u26a0\ufe0f ' + esc(EXCEPTION_TYPES.length + ' ' + t('nhóm ngoại lệ chuẩn', 'governed exception groups')) + '</span>',
    '        <span class="excx-fact">\ud83d\udce5 ' + esc(t('Xuất CSV tức thời', 'Instant CSV export')) + '</span>',
    '        <span class="excx-fact">\ud83d\udd01 ' + esc(t('Tự làm mới mỗi 5 phút', 'Auto refresh every 5 minutes')) + '</span>',
    '      </div>',
    '      <div class="excx-actions">',
    '        <button type="button" class="excx-btn primary" onclick="window._excNavigate(\'mes\')">\ud83c\udfed ' + esc(t('Mở MES Control Center', 'Open MES Control Center')) + '</button>',
    '        <button type="button" class="excx-btn secondary" onclick="window._excNavigate(\'orders\')">\ud83d\udce6 ' + esc(t('Mở Quản lý đơn hàng', 'Open Order Management')) + '</button>',
    '      </div>',
    '    </article>',
    '    <div class="excx-side">',
    '      <article class="excx-card excx-clock">',
    '        <div class="excx-side-top"><div><div class="excx-kicker" style="color:#64748b">' + esc(t('Snapshot', 'Snapshot')) + '</div><strong id="excx-stamp">' + esc(currentStamp()) + '</strong><small>' + esc(t('Dashboard này dùng cùng nguồn dữ liệu với MES, Order Control và Evidence Control.', 'This dashboard shares the same data sources as MES, Order Control, and Evidence Control.')) + '</small></div></div>',
    '      </article>',
    '      <article class="excx-card">',
    '        <div class="excx-kpi-grid">',
    '          <div class="excx-kpi"><small>' + esc(t('Tổng ngoại lệ', 'Total exceptions')) + '</small><strong id="excx-total">-</strong><span>' + esc(t('Tổng tất cả queue đang mở.', 'All open exception queues combined.')) + '</span></div>',
    '          <div class="excx-kpi"><small>' + esc(t('Nhóm có cảnh báo', 'Active groups')) + '</small><strong id="excx-groups">-</strong><span>' + esc(t('Số nhóm đang có ít nhất 1 mục cần xử lý.', 'Groups with at least one actionable item.')) + '</span></div>',
    '          <div class="excx-kpi"><small>' + esc(t('Ưu tiên cao', 'High priority')) + '</small><strong id="excx-hot">-</strong><span>' + esc(t('Allocation quá hạn, WO thiếu chứng cứ, lệch chương trình NC, đơn hàng quá hạn.', 'Overdue allocations, missing evidence, NC mismatches, and overdue orders.')) + '</span></div>',
    '          <div class="excx-kpi"><small>' + esc(t('Hướng xử lý', 'Primary next step')) + '</small><strong id="excx-next">-</strong><span>' + esc(t('Gợi ý workspace nên mở tiếp theo.', 'Suggested workspace to open next.')) + '</span></div>',
    '        </div>',
    '      </article>',
    '    </div>',
    '  </section>',
    '  <section class="excx-main">',
    '    <article class="excx-panel">',
    '      <div class="excx-panel-head">',
    '        <div><h2>' + esc(t('Các nhóm ngoại lệ', 'Exception groups')) + '</h2><p>' + esc(t('Mỗi nhóm đại diện cho một hàng đợi cần trưởng ca, điều phối hoặc quản lý xử lý nhanh.', 'Each group represents a queue that needs quick action from supervisors, planners, or managers.')) + '</p></div>',
    '      </div>',
    '      <div class="excx-filter-bar" id="excx-filters">' + EXCEPTION_CATEGORIES.map(function(cat){ return '<button type="button" class="excx-filter-btn' + (_excFilterCategory === cat.key ? ' active' : '') + '" data-exc-filter="' + esc(cat.key) + '">' + esc(t(cat.labelVi, cat.labelEn)) + '</button>'; }).join('') + '<label class="excx-toggle-zero"><input type="checkbox" id="excx-show-zero"' + (_excShowZero ? ' checked' : '') + '> ' + esc(t('Hiện nhóm = 0', 'Show zero')) + '</label></div>',
    '      <div id="excx-grid" class="excx-grid"><div class="excx-empty" style="grid-column:1/-1"><strong>' + esc(t('Đang tải dữ liệu', 'Loading data')) + '</strong>' + esc(t('Hệ thống đang tổng hợp snapshot ngoại lệ mới nhất.', 'The system is compiling the latest exception snapshot.')) + '</div></div>',
    '    </article>',
    '    <article class="excx-panel">',
    '      <div class="excx-panel-head">',
    '        <div><h2 id="excx-detail-title">' + esc(t('Hàng đợi chi tiết', 'Detailed queue')) + '</h2><p id="excx-detail-desc">' + esc(t('Chọn một nhóm bên trái để xem danh sách chi tiết và xuất dữ liệu.', 'Pick a group on the left to review details and export data.')) + '</p></div>',
    '      </div>',
    '      <div id="excx-detail" class="excx-detail-wrap"><div class="excx-empty"><strong>' + esc(t('Chưa chọn nhóm ngoại lệ', 'No exception group selected')) + '</strong>' + esc(t('Nhấn vào một thẻ ngoại lệ để mở danh sách chi tiết.', 'Click an exception card to open its detailed queue.')) + '</div></div>',
    '    </article>',
    '  </section>',
    '</div>'
  ].join('');
}

function renderSummary(){
  if (!state.container || !state.summary) return;
  var total = 0;
  var activeGroups = 0;
  var highPriority = 0;
  EXCEPTION_TYPES.forEach(function(item){
    var count = Number(state.summary[item.key] || 0);
    total += count;
    if (count > 0) activeGroups += 1;
  });
  // High-priority: only truly critical exception types (safety, production blocking, overdue)
  highPriority = Number(state.summary.overdue_allocations || 0)
    + Number(state.summary.overdue_orders || 0)
    + Number(state.summary.wo_missing_evidence || 0)
    + Number(state.summary.program_mismatches || 0)
    + Number(state.summary.alarm_hotspots || 0)
    + Number(state.summary.launch_blocker_hotspots || 0)
    + Number(state.summary.operator_qualification_gaps || 0)
    + Number(state.summary.material_trace_gaps || 0);
  var nextPage = highPriority > 0 ? t('MES / Chứng cứ', 'MES / Evidence') : (activeGroups > 0 ? t('Đơn hàng', 'Orders') : t('Ổn định', 'Stable'));
  var totalEl = state.container.querySelector('#excx-total');
  var groupsEl = state.container.querySelector('#excx-groups');
  var hotEl = state.container.querySelector('#excx-hot');
  var nextEl = state.container.querySelector('#excx-next');
  var stampEl = state.container.querySelector('#excx-stamp');
  if (totalEl) totalEl.textContent = String(total);
  if (groupsEl) groupsEl.textContent = String(activeGroups);
  if (hotEl) hotEl.textContent = String(highPriority);
  if (nextEl) nextEl.textContent = nextPage;
  if (stampEl) stampEl.textContent = currentStamp();
}

function renderCards(){
  var grid = state.container && state.container.querySelector('#excx-grid');
  if (!grid || !state.summary) return;
  // Filter by category and sort by count descending (actionable items first)
  var filtered = EXCEPTION_TYPES.filter(function(item){
    if (_excFilterCategory !== 'all' && item.category !== _excFilterCategory) return false;
    var count = Number(state.summary[item.key] || 0);
    if (!_excShowZero && count === 0) return false;
    return true;
  }).slice().sort(function(a, b){
    return Number(state.summary[b.key] || 0) - Number(state.summary[a.key] || 0);
  });
  if (!filtered.length) {
    grid.innerHTML = '<div class="excx-empty" style="grid-column:1/-1"><strong>' + esc(t('Không có ngoại lệ nào', 'No exceptions')) + '</strong>' + esc(t(_excFilterCategory !== 'all' ? 'Không có ngoại lệ trong nhóm đã chọn.' : 'Tất cả các hàng đợi đều trống.', _excFilterCategory !== 'all' ? 'No exceptions in the selected category.' : 'All exception queues are empty.')) + '</div>';
    return;
  }
  grid.innerHTML = filtered.map(function(item){
    var count = Number(state.summary[item.key] || 0);
    var active = state.expandedType === item.key;
    var sevBadge = item.severity === 'critical' ? '<span class="excx-sev excx-sev-crit">' + esc(t('Nghiêm trọng', 'Critical')) + '</span>' : (item.severity === 'warning' ? '<span class="excx-sev excx-sev-warn">' + esc(t('Cảnh báo', 'Warning')) + '</span>' : '');
    return [
      '<button type="button" class="excx-card-button' + (active ? ' active' : '') + (count === 0 ? ' excx-card-zero' : '') + '" data-exception-card="' + esc(item.key) + '" style="--card-accent:' + item.accent + ';--card-border:' + (active ? item.accent : item.border) + ';--card-bg:' + item.surface + '">',
      '  <div class="excx-card-top"><div class="excx-icon">' + item.icon + '</div><div class="excx-count">' + esc(count) + '</div></div>',
      '  <h3>' + esc(t(item.labelVi, item.labelEn)) + sevBadge + '</h3>',
      '  <p>' + esc(t(item.descVi, item.descEn)) + '</p>',
      '  <div class="excx-go">' + esc(t('Mở hàng đợi chi tiết', 'Open detailed queue')) + ' \u2192</div>',
      '</button>'
    ].join('');
  }).join('');
}

function renderDetailPanel(){
  var panel = state.container && state.container.querySelector('#excx-detail');
  var titleEl = state.container && state.container.querySelector('#excx-detail-title');
  var descEl = state.container && state.container.querySelector('#excx-detail-desc');
  if (!panel || !titleEl || !descEl) return;

  var cfg = cfgFor(state.expandedType);
  if (!cfg) {
    titleEl.textContent = t('Hàng đợi chi tiết', 'Detailed queue');
    descEl.textContent = t('Chọn một nhóm bên trái để xem danh sách chi tiết và xuất dữ liệu.', 'Pick a group on the left to review details and export data.');
    panel.innerHTML = '<div class="excx-empty"><strong>' + esc(t('Chưa chọn nhóm ngoại lệ', 'No exception group selected')) + '</strong>' + esc(t('Nhấn vào một thẻ ngoại lệ để mở danh sách chi tiết.', 'Click an exception card to open its detailed queue.')) + '</div>';
    return;
  }

  titleEl.textContent = t(cfg.labelVi, cfg.labelEn);
  descEl.textContent = t(cfg.descVi, cfg.descEn);

  if (!state.detailItems.length) {
    panel.innerHTML = '<div class="excx-empty"><strong>' + esc(t('Không có mục chi tiết', 'No detail items')) + '</strong>' + esc(t('Snapshot hiện tại không ghi nhận thêm mục nào trong nhóm này.', 'The current snapshot does not contain any detail items for this group.')) + '</div>';
    return;
  }

  var rows = state.detailItems.map(function(item, idx){
    return [
      '<tr>',
      '  <td class="excx-code">' + esc(item.id || '\u2014') + '</td>',
      '  <td><span class="excx-pill" style="--pill:' + cfg.accent + '">' + esc(item.type || t('Ngoại lệ', 'Exception')) + '</span></td>',
      '  <td>' + esc(item.department || '\u2014') + '</td>',
      '  <td>' + esc(item.date || '\u2014') + '</td>',
      '  <td>' + esc(item.responsible || '\u2014') + '</td>',
      '  <td>' + esc(item.detail || '\u2014') + '</td>',
      '  <td><div class="excx-row-actions"><button type="button" class="excx-link" data-exception-route="' + esc(cfg.page || '') + '" data-highlight-id="' + esc(item.id || '') + '">' + esc(t('Mở', 'Open')) + '</button></div></td>',
      '</tr>'
    ].join('');
  }).join('');

  var pagination = '';
  if (state.detailPages > 1) {
    pagination = [
      '<div class="excx-pagination">',
      state.detailPage > 1 ? '<button type="button" class="excx-link" data-exception-page="' + esc(String(state.detailPage - 1)) + '">\u2190 ' + esc(t('Trước', 'Previous')) + '</button>' : '',
      '<span class="excx-muted">' + esc(t('Trang', 'Page')) + ' ' + esc(String(state.detailPage)) + ' / ' + esc(String(state.detailPages)) + '</span>',
      state.detailPage < state.detailPages ? '<button type="button" class="excx-link" data-exception-page="' + esc(String(state.detailPage + 1)) + '">' + esc(t('Tiếp', 'Next')) + ' \u2192</button>' : '',
      '</div>'
    ].join('');
  }

  panel.innerHTML = [
    '<div class="excx-row-actions" style="justify-content:space-between;align-items:center">',
    '  <div class="excx-muted">' + esc(t('Tổng cộng', 'Total')) + ': <strong>' + esc(String(state.detailTotal)) + '</strong></div>',
    '  <div class="excx-row-actions">',
    '    <button type="button" class="excx-link" onclick="window._excExportExcel(\'' + esc(cfg.key) + '\')">\u2b07 ' + esc(t('Xuất CSV', 'Export CSV')) + '</button>',
    '    <button type="button" class="excx-link" onclick="window._excNavigate(\'' + esc(cfg.page || '') + '\')">\ud83d\udd17 ' + esc(t('Đi đến workspace', 'Go to workspace')) + '</button>',
    '  </div>',
    '</div>',
    '<div class="excx-table-wrap"><table class="excx-table"><thead><tr><th>' + esc(t('Mã', 'ID')) + '</th><th>' + esc(t('Loại', 'Type')) + '</th><th>' + esc(t('Bộ phận', 'Department')) + '</th><th>' + esc(t('Ngày', 'Date')) + '</th><th>' + esc(t('Phụ trách', 'Responsible')) + '</th><th>' + esc(t('Chi tiết', 'Detail')) + '</th><th>' + esc(t('Hành động', 'Action')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>',
    pagination
  ].join('');
}

function bindEvents(){
  if (!state.container) return;
  // Category filter buttons
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-exc-filter]'), function(btn){
    btn.onclick = function(){
      _excFilterCategory = btn.getAttribute('data-exc-filter') || 'all';
      Array.prototype.forEach.call(state.container.querySelectorAll('[data-exc-filter]'), function(b){ b.classList.toggle('active', b.getAttribute('data-exc-filter') === _excFilterCategory); });
      renderCards();
      bindEvents();
    };
  });
  var zeroToggle = state.container.querySelector('#excx-show-zero');
  if (zeroToggle) {
    zeroToggle.onchange = function(){ _excShowZero = zeroToggle.checked; renderCards(); bindEvents(); };
  }
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-exception-card]'), function(button){
    button.onclick = function(){
      var key = button.getAttribute('data-exception-card') || '';
      if (!key) return;
      if (state.expandedType === key) {
        state.expandedType = '';
        state.detailItems = [];
        state.detailTotal = 0;
        state.detailPages = 1;
        renderCards();
        renderDetailPanel();
        return;
      }
      loadDetail(key, 1);
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-exception-page]'), function(button){
    button.onclick = function(){
      var page = Number(button.getAttribute('data-exception-page') || 1);
      if (!state.expandedType || !page || page < 1) return;
      loadDetail(state.expandedType, page);
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-exception-route]'), function(button){
    button.onclick = function(){
      var page = button.getAttribute('data-exception-route') || '';
      var highlightId = button.getAttribute('data-highlight-id') || '';
      window._excNavigate(page, highlightId);
    };
  });
}

function loadSummary(){
  if (!state.container) return Promise.resolve();
  state.loading = true;
  return api('exception_dashboard', {}, 'GET').then(function(resp){
    if (!resp || !resp.ok) throw new Error((resp && resp.error) || 'exception_dashboard_failed');
    state.summary = resp;
    renderSummary();
    renderCards();
    renderDetailPanel();
    bindEvents();
  }).catch(function(error){
    var grid = state.container.querySelector('#excx-grid');
    if (grid) {
      grid.innerHTML = '<div class="excx-empty" style="grid-column:1/-1"><strong>' + esc(t('Không thể tải snapshot ngoại lệ', 'Could not load exception snapshot')) + '</strong>' + esc((error && error.message) || t('Vui lòng thử lại sau.', 'Please try again later.')) + '</div>';
    }
    renderDetailPanel();
    if (typeof window._fhShowToast === 'function') window._fhShowToast(t('Không thể tải bảng ngoại lệ.', 'Could not load exception dashboard.'), 'error');
  }).finally(function(){
    state.loading = false;
  });
}

function loadDetail(type, page){
  state.expandedType = type;
  state.detailPage = page || 1;
  state.detailItems = [];
  state.detailTotal = 0;
  state.detailPages = 1;
  renderCards();
  renderDetailPanel();
  return api('exception_detail', { type: type, page: state.detailPage, per_page: 25 }, 'GET').then(function(resp){
    if (!resp || !resp.ok) throw new Error((resp && resp.error) || 'exception_detail_failed');
    state.detailItems = Array.isArray(resp.items) ? resp.items : [];
    state.detailTotal = Number(resp.total || 0);
    state.detailPages = Number(resp.pages || 1);
    renderCards();
    renderDetailPanel();
    bindEvents();
  }).catch(function(error){
    state.detailItems = [];
    state.detailTotal = 0;
    state.detailPages = 1;
    renderDetailPanel();
    if (typeof window._fhShowToast === 'function') window._fhShowToast(t('Không thể tải chi tiết ngoại lệ.', 'Could not load exception details.'), 'error');
    if (window.console) console.error(error);
  });
}

function startAutoRefresh(){
  stopAutoRefresh();
  state.refreshTimer = setInterval(function(){
    if (document.hidden) return;
    if (!state.container || !state.container.classList.contains('active')) return;
    loadSummary().then(function(){
      if (state.expandedType) loadDetail(state.expandedType, state.detailPage);
    });
  }, REFRESH_INTERVAL_MS);
}

function stopAutoRefresh(){
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

window._excNavigate = function(page, highlightId){
  if (!page) return;
  if (typeof navigateTo === 'function') navigateTo(page, highlightId ? { highlight: highlightId } : undefined);
};

window._excRefreshNow = function(){
  loadSummary().then(function(){
    if (state.expandedType) loadDetail(state.expandedType, state.detailPage);
  });
};

window._excExportExcel = function(type){
  var cfg = cfgFor(type);
  if (!cfg) return;
  api('exception_detail', { type: type, page: 1, per_page: 2000, export: 1 }, 'GET').then(function(resp){
    var items = resp && Array.isArray(resp.items) ? resp.items : [];
    if (!items.length) {
      if (typeof window._fhShowToast === 'function') window._fhShowToast(t('Không có dữ liệu để xuất.', 'No data available to export.'), 'info');
      return;
    }
    var bom = '\uFEFF';
    var headers = [t('Mã', 'ID'), t('Loại', 'Type'), t('Bộ phận', 'Department'), t('Ngày', 'Date'), t('Phụ trách', 'Responsible'), t('Chi tiết', 'Detail')];
    var rows = [headers.map(csvCell).join(',')];
    items.forEach(function(item){
      rows.push([
        csvCell(item.id || ''),
        csvCell(item.type || ''),
        csvCell(item.department || ''),
        csvCell(item.date || ''),
        csvCell(item.responsible || ''),
        csvCell(item.detail || '')
      ].join(','));
    });
    var blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'exception-' + type + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    setTimeout(function(){
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 120);
  }).catch(function(error){
    if (typeof window._fhShowToast === 'function') window._fhShowToast(t('Xuất dữ liệu thất bại.', 'Export failed.'), 'error');
    if (window.console) console.error(error);
  });
};

function csvCell(value){
  return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
}

window._renderExceptionDashboard = function(container){
  state.container = container || document.getElementById('page-exceptions');
  if (!state.container) return;
  ensureStyles();
  state.container.innerHTML = buildShell();
  state.expandedType = '';
  state.detailItems = [];
  state.detailTotal = 0;
  state.detailPage = 1;
  state.detailPages = 1;
  loadSummary();
  startAutoRefresh();
};

})();


/* ===================================================================
   14-mes-control-center.js
   HESEM QMS Portal -- MES Control Center
   Production control room for CNC dispatch, evidence gates, downtime,
   maintenance, and tooling life.
   =================================================================== */

(function(){
'use strict';

var state = {
  container: null,
  snapshot: null,
  master: null,
  exceptions: null,
  search: '',
  workCenter: '',
  dispatchStatus: '',
  loading: false,
  modal: null,
  refreshTimer: null,
  stream: null,
  streamStatus: 'polling',
  streamLastMessageAt: '',
  streamRetryTimer: null,
  pollIntervalMs: 60000
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

var STATUS_META = {
  scheduled:   { vi:'Đã lên lịch', en:'Scheduled', color:'#64748b' },
  setup:       { vi:'Đang setup', en:'Setup', color:'#2563eb' },
  running:     { vi:'Đang chạy', en:'Running', color:'#0f9d58' },
  inspection:  { vi:'Đang kiểm tra', en:'Inspection', color:'#7c3aed' },
  completed:   { vi:'Hoàn thành', en:'Completed', color:'#059669' },
  on_hold:     { vi:'Tạm dừng', en:'On hold', color:'#dc2626' },
  down:        { vi:'Dừng máy', en:'Machine down', color:'#dc2626' },
  maintenance: { vi:'Bảo trì', en:'Maintenance', color:'#d97706' },
  idle:        { vi:'Rảnh', en:'Idle', color:'#475569' },
  open:        { vi:'Mở', en:'Open', color:'#dc2626' },
  approved:    { vi:'Đã duyệt', en:'Approved', color:'#2563eb' },
  in_progress: { vi:'Đang xử lý', en:'In progress', color:'#d97706' },
  resolved:    { vi:'Đã khôi phục', en:'Resolved', color:'#059669' },
  cancelled:   { vi:'Đã hủy', en:'Cancelled', color:'#6b7280' }
};

var TOOL_META = {
  healthy:   { vi:'Ổn định', en:'Stable', color:'#059669' },
  warning:   { vi:'Cần chú ý', en:'Warning', color:'#d97706' },
  critical:  { vi:'Tới hạn', en:'Critical', color:'#dc2626' },
  untracked: { vi:'Chưa theo dõi', en:'Untracked', color:'#7c3aed' }
};

var GATE_META = {
  ready:        { vi:'Đủ gate', en:'Ready', color:'#059669' },
  partial:      { vi:'Thiếu một phần', en:'Partial', color:'#d97706' },
  missing:      { vi:'Thiếu bắt buộc', en:'Missing', color:'#dc2626' },
  not_required: { vi:'Không yêu cầu', en:'Not required', color:'#64748b' }
};

var EXCEPTION_META = {
  program_mismatches:  { vi:'Lệch chương trình NC', en:'Program mismatch', icon:'💾' },
  overdue_allocations: { vi:'Allocation quá hạn', en:'Overdue allocations', icon:'⏳' },
  failed_uploads:      { vi:'Upload lỗi', en:'Failed uploads', icon:'📤' },
  overdue_orders:      { vi:'Đơn hàng quá hạn', en:'Overdue orders', icon:'📦' },
  overdue_capas:       { vi:'CAPA mở lâu', en:'Overdue CAPA', icon:'🧩' },
  wo_missing_evidence: { vi:'WO thiếu chứng cứ', en:'WO missing evidence', icon:'🧾' },
  orphan_links:        { vi:'Liên kết mồ côi', en:'Orphan links', icon:'🧷' }
};

Object.assign(EXCEPTION_META, {
  program_release_risk: { vi:'Thiếu release NC', en:'NC release risk', icon:'🗜️' },
  tool_readiness_risk: { vi:'Tooling chưa sẵn sàng', en:'Tool readiness risk', icon:'🧰' },
  alarm_ack_gaps: { vi:'Alarm chờ xác nhận', en:'Alarm acknowledgement gaps', icon:'🧯' },
  operator_qualification_gaps: { vi:'Thiếu năng lực vận hành', en:'Operator qualification gaps', icon:'👷' },
  material_trace_gaps: { vi:'Thiếu truy xuất vật liệu', en:'Material trace gaps', icon:'🧪' },
  material_genealogy_gaps: { vi:'Genealogy vật liệu chưa kín', en:'Material genealogy gaps', icon:'🧬' },
  shift_handover_gaps: { vi:'Bàn giao ca chưa hoàn tất', en:'Shift handover gaps', icon:'🔄' },
  connector_governance_gaps: { vi:'Kết nối máy chưa đạt điều kiện', en:'Connector governance gaps', icon:'🔌' },
  shadow_sync_failures: { vi:'Lỗi shadow sync', en:'Shadow sync failures', icon:'🌐' },
  primary_read_fallbacks: { vi:'Primary-read fallback', en:'Primary-read fallbacks', icon:'🛠️' },
  epicor_sync_status: { vi:'Epicor sync lệch nhịp', en:'Epicor sync gaps', icon:'🔁' },
  downtime_governance_gaps: { vi:'Downtime thiếu mã quản trị', en:'Downtime governance gaps', icon:'🧠' }
});

var CONNECTOR_META = {
  healthy:     { vi:'Kết nối tốt', en:'Healthy', color:'#059669' },
  delayed:     { vi:'Trễ heartbeat', en:'Delayed', color:'#d97706' },
  stale:       { vi:'Mất nhịp', en:'Stale', color:'#dc2626' },
  offline:     { vi:'Offline', en:'Offline', color:'#7f1d1d' },
  manual_only: { vi:'Cầu nối tay', en:'Manual bridge', color:'#1d4ed8' },
  disabled:    { vi:'Tắt kết nối', en:'Disabled', color:'#64748b' }
};

var GOVERNANCE_META = {
  ready:        { vi:'Sẵn sàng', en:'Ready', color:'#059669' },
  warning:      { vi:'Cần chốt lại', en:'Needs reconfirmation', color:'#d97706' },
  critical:     { vi:'Chặn phát hành', en:'Blocking risk', color:'#dc2626' },
  untracked:    { vi:'Chưa theo dõi', en:'Untracked', color:'#7c3aed' },
  not_required: { vi:'Không áp dụng', en:'Not required', color:'#64748b' }
};

var DOWNTIME_CATEGORY_META = {
  breakdown: { vi:'Hỏng máy', en:'Breakdown' },
  planned_pm: { vi:'Bảo trì kế hoạch', en:'Planned PM' },
  setup: { vi:'Setup / đổi mã', en:'Setup / changeover' },
  material_wait: { vi:'Chờ vật tư', en:'Material wait' },
  quality_hold: { vi:'Giữ lô chất lượng', en:'Quality hold' },
  tool_change: { vi:'Thay dao / chỉnh offset', en:'Tool change / offset' },
  utility: { vi:'Tiện ích / nguồn', en:'Utility / power' },
  other: { vi:'Khác', en:'Other' }
};

function t(vi, en){
  var value = (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
  return repairMojibake(value);
}
function esc(value){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(repairMojibake(value == null ? '' : value))));
  return div.innerHTML;
}
function jsonAttr(value){ return encodeURIComponent(JSON.stringify(value || {})); }
function parseJsonAttr(value){
  try { return JSON.parse(decodeURIComponent(String(value || ''))); }
  catch (_error) { return {}; }
}
function nowInputValue(){
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtDate(value){
  if(!value) return '—';
  var d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function fmtDateTime(value){
  if(!value) return '—';
  var d = new Date(value);
  if(isNaN(d.getTime())) return String(value);
  return fmtDate(value) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function fmtPercent(value){
  if(value === null || value === undefined || value === '' || isNaN(Number(value))) return '—';
  return Number(value).toFixed(1).replace(/\.0$/, '') + '%';
}
function fmtMinutes(value){
  var num = Number(value || 0);
  if(!isFinite(num) || num <= 0) return t('0 phút', '0 min');
  if(num < 60) return Math.round(num) + ' ' + t('phút', 'min');
  var hours = Math.floor(num / 60);
  var minutes = Math.round(num % 60);
  return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
}
function currentStamp(){
  var d = new Date();
  return d.toLocaleString((typeof lang !== 'undefined' && lang === 'en') ? 'en-GB' : 'vi-VN', {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
  });
}
function statusMeta(key){
  var meta = STATUS_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—', color:'#64748b' };
}
function toolMeta(key){
  var meta = TOOL_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—', color:'#64748b' };
}
function gateMeta(key){
  var meta = GATE_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—', color:'#64748b' };
}
function connectorMeta(key){
  var meta = CONNECTOR_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—', color:'#64748b' };
}
function governanceMeta(key){
  var meta = GOVERNANCE_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—', color:'#64748b' };
}
function downtimeCategoryMeta(key){
  var meta = DOWNTIME_CATEGORY_META[String(key || '').toLowerCase()];
  return meta || { vi:key || '—', en:key || '—' };
}
function badge(meta){
  return '<span class="mesx-pill" style="--pill:' + meta.color + '">' + esc(t(meta.vi, meta.en)) + '</span>';
}
function connectorTypeLabel(type){
  var map = {
    mtconnect: ['MTConnect', 'MTConnect'],
    opcua: ['OPC UA', 'OPC UA'],
    dnc: ['DNC', 'DNC'],
    manual_bridge: ['Cầu nối nhập tay', 'Manual bridge'],
    manual: ['Nhập tay', 'Manual'],
    disabled: ['Tắt kết nối', 'Disabled']
  };
  var item = map[String(type || '').toLowerCase()];
  return item ? t(item[0], item[1]) : String(type || '—');
}
function signalStateLabel(state){
  var normalized = String(state || '').toLowerCase();
  if(normalized === 'offline') return t('Offline', 'Offline');
  var meta = statusMeta(normalized);
  return t(meta.vi, meta.en);
}
function freshnessLabel(seconds, slaSeconds){
  if(seconds === null || seconds === undefined || seconds === '') return t('Chưa có heartbeat', 'No heartbeat');
  var value = Number(seconds || 0);
  if(!isFinite(value)) return t('Không xác định', 'Unknown');
  if(value < 60) return t('Cách đây ' + Math.round(value) + ' giây', Math.round(value) + 's ago');
  if(value < 3600) return t('Cách đây ' + Math.round(value / 60) + ' phút', Math.round(value / 60) + 'm ago');
  var hours = Math.round(value / 3600);
  return t('Cách đây ' + hours + ' giờ', hours + 'h ago') + (slaSeconds ? ' · SLA ' + slaSeconds + 's' : '');
}
function toast(message, type){
  if(typeof window._fhShowToast === 'function') return window._fhShowToast(message, type);
  if(window.console) console.log('[mes]', type || 'info', message);
}
function api(action, payload, method){
  var callMethod = method || 'GET';
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, callMethod, 30000);
  var url = 'api.php?action=' + encodeURIComponent(action);
  if(callMethod === 'GET' && payload){
    Object.keys(payload).forEach(function(key){
      var value = payload[key];
      if(value === undefined || value === null || value === '') return;
      url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(value));
    });
  }
  var options = { method:callMethod, credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) options.headers['X-CSRF-Token'] = csrfToken;
  if(callMethod !== 'GET'){
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload || {});
  }
  return fetch(url, options).then(function(response){ return response.json(); });
}
function governanceFailureMessage(resp, fallbackVi, fallbackEn){
  if(resp && resp.error === 'wo_launch_blocked'){
    var blockers = Array.isArray(resp.blockers) ? resp.blockers : [];
    var first = blockers[0] || {};
    return t(first.message_vi || 'WO đang bị MES chặn chạy vì chưa đạt điều kiện bắt buộc.', first.message_en || 'The WO is blocked by MES because mandatory launch conditions are not yet satisfied.');
  }
  return t(fallbackVi, fallbackEn);
}
function defaultSnapshot(){
  return {
    kpis: {},
    machine_wall: [],
    dispatch: [],
    open_downtimes: [],
    maintenance_queue: [],
    progress_reports: [],
    work_center_summary: [],
    connector_summary: [],
    oee_timeline: [],
    downtime_pareto: [],
    program_handshake_queue: [],
    program_release_queue: [],
    tool_readiness_queue: [],
    alarm_ack_queue: [],
    operator_qualification_queue: [],
    material_trace_queue: [],
    material_genealogy_queue: [],
    shift_handover_queue: [],
    connector_guard_queue: [],
    launch_blocker_queue: [],
    primary_read_queue: [],
    epicor_sync: {},
    epicor_sync_queue: [],
    tooling_alerts: [],
    evidence_gate_queue: [],
    shadow_sync_failures: [],
    shadow_status: {},
    primary_read_status: {},
    connector_ingest_status: {},
    launch_blocker_status: {},
    current_shift: {},
    runtime_mode: {}
  };
}

function streamEligible(runtimeMode){
  return !!(runtimeMode && runtimeMode.use_postgres && runtimeMode.postgres_path_active && runtimeMode.postgres_reachable);
}

function ensureStyles(){
  if(document.getElementById('mes-control-center-styles')) return;
  var style = document.createElement('style');
  style.id = 'mes-control-center-styles';
  style.textContent = [
    '.mesx{padding:24px 24px 42px;max-width:1560px;margin:0 auto;color:#0f172a}',
    '.mesx-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr);gap:18px;align-items:stretch;margin-bottom:18px}',
    '.mesx-poster{position:relative;overflow:hidden;border-radius:30px;padding:28px 30px 26px;background:linear-gradient(140deg,#0c2d48 0%,#15466f 48%,#1f6aa5 100%);color:#fff;box-shadow:0 28px 70px rgba(12,45,72,.22)}',
    '.mesx-poster::before{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0) 42%)}',
    '.mesx-poster::after{content:\"\";position:absolute;right:-110px;top:-80px;width:280px;height:280px;border-radius:999px;background:radial-gradient(circle,rgba(249,168,37,.26) 0%,rgba(249,168,37,0) 70%)}',
    '.mesx-brand{display:flex;align-items:center;justify-content:space-between;gap:18px;position:relative;z-index:1}',
    '.mesx-brand-main{display:flex;align-items:center;gap:16px}',
    '.mesx-logo{width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}',
    '.mesx-logo img{width:38px;height:38px;object-fit:contain}',
    '.mesx-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.74);font-weight:800}',
    '.mesx-poster h1{margin:10px 0 10px;font-size:34px;line-height:1.06;letter-spacing:-.03em}',
    '.mesx-poster p{margin:0;max-width:780px;font-size:14px;line-height:1.72;color:rgba(255,255,255,.84)}',
    '.mesx-facts{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}',
    '.mesx-fact{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:800;color:#fff}',
    '.mesx-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}',
    '.mesx-btn{height:42px;border:none;border-radius:14px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}',
    '.mesx-btn:hover{transform:translateY(-1px)}',
    '.mesx-btn.primary{background:#f9a825;color:#12253a;box-shadow:0 14px 26px rgba(249,168,37,.28)}',
    '.mesx-btn.secondary{background:rgba(255,255,255,.11);color:#fff;border:1px solid rgba(255,255,255,.14)}',
    '.mesx-btn.ghost{background:#fff;color:#0c2d48;border:1px solid #dbe4ef}',
    '.mesx-side{display:grid;grid-template-rows:auto auto;gap:18px}',
    '.mesx-card{background:#fff;border:1px solid #e2e8f0;border-radius:26px;box-shadow:0 18px 44px rgba(15,23,42,.06)}',
    '.mesx-clock{padding:22px 22px 18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)}',
    '.mesx-clock strong{display:block;margin-top:10px;font-size:30px;line-height:1;color:#0c2d48}',
    '.mesx-clock small{display:block;font-size:12px;color:#64748b;line-height:1.7;margin-top:8px}',
    '.mesx-clock-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}',
    '.mesx-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px}',
    '.mesx-kpi{border-radius:18px;padding:16px;background:#f8fafc;border:1px solid #e5edf6}',
    '.mesx-kpi small{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px}',
    '.mesx-kpi strong{display:block;font-size:30px;line-height:1;color:#0c2d48}',
    '.mesx-kpi span{display:block;font-size:12px;color:#64748b;margin-top:8px;line-height:1.55}',
    '.mesx-band,.mesx-main{display:grid;gap:18px;margin-bottom:18px}',
    '.mesx-band{grid-template-columns:1.1fr .9fr}',
    '.mesx-main{grid-template-columns:minmax(0,1.18fr) minmax(360px,.82fr)}',
    '.mesx-panel{background:#fff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 16px 40px rgba(15,23,42,.05);padding:18px}',
    '.mesx-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}',
    '.mesx-panel-head h2,.mesx-panel-head h3{margin:0;font-size:18px;color:#0c2d48}',
    '.mesx-panel-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.68}',
    '.mesx-center-grid,.mesx-ex-grid,.mesx-machine-grid,.mesx-form-grid,.mesx-connector-grid{display:grid;gap:12px}',
    '.mesx-center-grid,.mesx-ex-grid,.mesx-connector-grid{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '.mesx-machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.mesx-form-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}',
    '.mesx-form-grid .full{grid-column:1 / -1}',
    '.mesx-center{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}',
    '.mesx-center-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}',
    '.mesx-center h4{margin:0;font-size:14px;color:#0f172a}',
    '.mesx-center p{margin:4px 0 0;font-size:12px;color:#64748b}',
    '.mesx-center-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.mesx-connector{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}',
    '.mesx-connector-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}',
    '.mesx-connector h4{margin:0;font-size:14px;color:#0f172a}',
    '.mesx-connector p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.55}',
    '.mesx-connector-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '.mesx-connector-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    '.mesx-analytics{display:grid;gap:12px}',
    '.mesx-analytics-stack{display:grid;gap:12px}',
    '.mesx-metric-row{display:grid;grid-template-columns:160px minmax(0,1fr) 68px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eef2f6}',
    '.mesx-metric-row:last-child{border-bottom:none;padding-bottom:0}',
    '.mesx-metric-row:first-child{padding-top:0}',
    '.mesx-metric-label strong{display:block;font-size:13px;color:#0f172a}',
    '.mesx-metric-label span{display:block;margin-top:4px;font-size:11px;color:#64748b;line-height:1.55}',
    '.mesx-bar{position:relative;height:12px;border-radius:999px;background:#e2e8f0;overflow:hidden}',
    '.mesx-bar > span{position:absolute;inset:0 auto 0 0;border-radius:999px;background:linear-gradient(90deg,#1f6aa5 0%,#f9a825 100%)}',
    '.mesx-bar[data-band=\"strong\"] > span{background:linear-gradient(90deg,#0f9d58 0%,#34d399 100%)}',
    '.mesx-bar[data-band=\"watch\"] > span{background:linear-gradient(90deg,#f59e0b 0%,#fbbf24 100%)}',
    '.mesx-bar[data-band=\"risk\"] > span{background:linear-gradient(90deg,#dc2626 0%,#f97316 100%)}',
    '.mesx-metric-value{font-size:12px;font-weight:800;color:#0c2d48;text-align:right}',
    '.mesx-pareto-row{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eef2f6}',
    '.mesx-pareto-row:last-child{border-bottom:none;padding-bottom:0}',
    '.mesx-pareto-row:first-child{padding-top:0}',
    '.mesx-pareto-main strong{display:block;font-size:13px;color:#0f172a}',
    '.mesx-pareto-main span{display:block;margin-top:4px;font-size:11px;color:#64748b;line-height:1.55}',
    '.mesx-handshake-list{display:grid;gap:12px}',
    '.mesx-handshake{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}',
    '.mesx-handshake-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
    '.mesx-handshake h4{margin:0;font-size:14px;color:#0f172a}',
    '.mesx-handshake p{margin:6px 0 0;font-size:12px;color:#64748b;line-height:1.6}',
    '.mesx-mini{padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid #edf2f7}',
    '.mesx-mini small{display:block;font-size:10px;font-weight:800;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}',
    '.mesx-mini strong{display:block;font-size:13px;color:#0f172a}',
    '.mesx-stack,.mesx-list,.mesx-machine-wall{display:grid;gap:12px}',
    '.mesx-input,.mesx-select,.mesx-textarea{width:100%;box-sizing:border-box;border:1px solid #d7e1ec;border-radius:14px;padding:10px 12px;font:inherit;font-size:13px;background:#fff;color:#0f172a}',
    '.mesx-input.search{max-width:320px}',
    '.mesx-input:focus,.mesx-select:focus,.mesx-textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.mesx-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}',
    '.mesx-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:18px}',
    '.mesx-table{width:100%;border-collapse:collapse;min-width:1180px}',
    '.mesx-table th,.mesx-table td{padding:12px 14px;border-bottom:1px solid #eef2f6;font-size:12px;text-align:left;vertical-align:top}',
    '.mesx-table th{background:#f8fafc;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800;position:sticky;top:0;z-index:1}',
    '.mesx-code{font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#0f172a}',
    '.mesx-sub{display:block;margin-top:4px;color:#64748b;font-size:11px;line-height:1.55}',
    '.mesx-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:color-mix(in srgb, var(--pill) 14%, white);color:var(--pill);font-size:11px;font-weight:800}',
    '.mesx-alert-stack,.mesx-row-actions,.mesx-mini-actions{display:flex;flex-wrap:wrap;gap:8px}',
    '.mesx-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#eff6ff;border:1px solid #dbeafe;color:#1d4ed8;font-size:11px;font-weight:800}',
    '.mesx-chip.stone{background:#f8fafc;border-color:#e2e8f0;color:#475569}',
    '.mesx-link{border:none;background:#eef4fb;color:#0c2d48;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;transition:transform .14s ease,background .14s ease}',
    '.mesx-link:hover{transform:translateY(-1px);background:#e0edfd}',
    '.mesx-link.warning{background:#fff7ed;color:#c2410c}',
    '.mesx-link.danger{background:#fef2f2;color:#b91c1c}',
    '.mesx-link[disabled]{opacity:.45;cursor:not-allowed;transform:none}',
    '.mesx-machine{border:1px solid #e2e8f0;border-radius:20px;padding:16px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}',
    '.mesx-machine-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}',
    '.mesx-machine h4{margin:0;font-size:15px;color:#0f172a}',
    '.mesx-machine p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.55}',
    '.mesx-section{margin-top:14px;padding-top:14px;border-top:1px solid #edf2f7}',
    '.mesx-list-item{border:1px solid #e2e8f0;border-radius:18px;padding:14px;background:#fff}',
    '.mesx-list-item h4{margin:0;font-size:14px;color:#0f172a}',
    '.mesx-list-item p{margin:6px 0 0;font-size:12px;color:#64748b;line-height:1.6}',
    '.mesx-meta{margin-top:8px;font-size:11px;color:#475569;line-height:1.6}',
    '.mesx-empty{padding:20px;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc;text-align:center;font-size:12px;color:#64748b;line-height:1.65}',
    '.mesx-empty strong{display:block;color:#0c2d48;margin-bottom:5px}',
    '.mesx-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.52);backdrop-filter:blur(6px);z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px}',
    '.mesx-modal{width:min(820px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(15,23,42,.28)}',
    '.mesx-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:22px 24px 16px;border-bottom:1px solid #e2e8f0}',
    '.mesx-modal-head h3{margin:0;font-size:20px;color:#0c2d48}',
    '.mesx-modal-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.7}',
    '.mesx-x{border:none;background:#eef2f7;color:#334155;width:38px;height:38px;border-radius:12px;cursor:pointer;font-size:20px}',
    '.mesx-modal-body{padding:20px 24px 24px}',
    '.mesx-field label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:800;margin-bottom:6px}',
    '.mesx-textarea{min-height:110px;resize:vertical}',
    '.mesx-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:16px}',
    '.mesx-detail-table{width:100%;border-collapse:collapse}',
    '.mesx-detail-table th,.mesx-detail-table td{padding:10px 12px;border-bottom:1px solid #eef2f6;font-size:12px;text-align:left;vertical-align:top}',
    '.mesx-detail-table th{font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.08em;font-weight:800;background:#f8fafc}',
    '@media (max-width:1280px){.mesx-hero,.mesx-band,.mesx-main{grid-template-columns:1fr}.mesx-kpi-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    '@media (max-width:980px){.mesx-kpi-grid,.mesx-center-grid,.mesx-ex-grid,.mesx-machine-grid,.mesx-form-grid,.mesx-connector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:720px){.mesx{padding:18px 16px 28px}.mesx-poster h1{font-size:28px}.mesx-kpi-grid,.mesx-center-grid,.mesx-ex-grid,.mesx-machine-grid,.mesx-form-grid,.mesx-connector-grid{grid-template-columns:1fr}.mesx-table{min-width:960px}}'
  ].join('\n');
  document.head.appendChild(style);
}

function workCenters(){
  return state.snapshot && Array.isArray(state.snapshot.work_center_summary) ? state.snapshot.work_center_summary : [];
}
function filteredDispatch(){
  var rows = state.snapshot && Array.isArray(state.snapshot.dispatch) ? state.snapshot.dispatch.slice() : [];
  var search = String(state.search || '').trim().toLowerCase();
  if(state.workCenter){
    rows = rows.filter(function(row){ return String(row.work_center_id || '') === String(state.workCenter); });
  }
  if(state.dispatchStatus){
    rows = rows.filter(function(row){ return String(row.status || '') === String(state.dispatchStatus); });
  }
  if(search){
    rows = rows.filter(function(row){
      var hay = [
        row.wo_number, row.jo_number, row.so_number, row.customer_name, row.customer_id,
        row.part_number, row.part_revision, row.operation_desc, row.machine_id, row.machine_name,
        row.operator_name, row.operator_id, row.work_center_id, row.work_center_name
      ].join(' ').toLowerCase();
      return hay.indexOf(search) >= 0;
    });
  }
  return rows;
}
function machineById(machineId){
  var rows = state.snapshot && Array.isArray(state.snapshot.machine_wall) ? state.snapshot.machine_wall : [];
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].machine_id || '') === String(machineId || '')) return rows[i];
  }
  return null;
}
function downtimeById(downtimeId){
  var rows = state.snapshot && Array.isArray(state.snapshot.open_downtimes) ? state.snapshot.open_downtimes : [];
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].downtime_id || '') === String(downtimeId || '')) return rows[i];
  }
  return null;
}
function maintenanceById(requestId){
  var rows = state.snapshot && Array.isArray(state.snapshot.maintenance_queue) ? state.snapshot.maintenance_queue : [];
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].request_id || '') === String(requestId || '')) return rows[i];
  }
  return null;
}
function dispatchByWo(woNumber){
  var rows = state.snapshot && Array.isArray(state.snapshot.dispatch) ? state.snapshot.dispatch : [];
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].wo_number || '') === String(woNumber || '')) return rows[i];
  }
  return null;
}
function toolRuntimeById(runtimeId){
  var alerts = state.snapshot && Array.isArray(state.snapshot.tooling_alerts) ? state.snapshot.tooling_alerts : [];
  for(var i = 0; i < alerts.length; i += 1){
    if(String(alerts[i].tool_runtime_id || '') === String(runtimeId || '')) return alerts[i];
  }
  var machines = state.snapshot && Array.isArray(state.snapshot.machine_wall) ? state.snapshot.machine_wall : [];
  for(var m = 0; m < machines.length; m += 1){
    var items = Array.isArray(machines[m].tooling_items) ? machines[m].tooling_items : [];
    for(var j = 0; j < items.length; j += 1){
      if(String(items[j].tool_runtime_id || '') === String(runtimeId || '')) return items[j];
    }
  }
  return null;
}
function masterRows(entity){
  return state.master && Array.isArray(state.master[entity]) ? state.master[entity] : [];
}
function adapterForMachine(machineId){
  var rows = masterRows('mes_connectivity_adapters');
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].machine_id || '') === String(machineId || '')) return rows[i];
  }
  return null;
}
function toolOptionsForMachine(machineId){
  var master = state.master || {};
  var machine = machineById(machineId) || {};
  var machineType = String(machine.machine_type || '').toLowerCase();
  var workCenterId = String(machine.work_center_id || '');
  return (master.tooling_assets || []).filter(function(tool){
    var preferredCenter = String(tool.preferred_work_center_id || '');
    var toolMachineType = String(tool.machine_type || '').toLowerCase();
    if(preferredCenter && workCenterId && preferredCenter !== workCenterId) return false;
    if(toolMachineType && toolMachineType !== 'multi' && machineType && toolMachineType !== machineType) return false;
    return String(tool.status || 'active') !== 'retired';
  });
}
function operatorOptions(workCenterId){
  var rows = state.master && Array.isArray(state.master.operators) ? state.master.operators : [];
  return rows.filter(function(row){
    if(!workCenterId) return true;
    return !row.work_center_id || String(row.work_center_id) === String(workCenterId);
  });
}
function workOrderOptions(machineId){
  var rows = state.snapshot && Array.isArray(state.snapshot.dispatch) ? state.snapshot.dispatch : [];
  return rows.filter(function(row){
    if(!machineId) return true;
    return String(row.machine_id || '') === String(machineId);
  });
}
function downtimeReasonOptions(category){
  var rows = state.master && Array.isArray(state.master.downtime_reason_codes) ? state.master.downtime_reason_codes : [];
  return rows.filter(function(row){
    if(String(row.status || 'active').toLowerCase() !== 'active') return false;
    if(category && String(row.category || '') !== String(category)) return false;
    return true;
  }).sort(function(a, b){
    return String(a.reason_name_vi || a.reason_name || a.reason_code || '').localeCompare(String(b.reason_name_vi || b.reason_name || b.reason_code || ''));
  });
}
function resolutionCodeOptions(){
  var rows = state.master && Array.isArray(state.master.downtime_resolution_codes) ? state.master.downtime_resolution_codes : [];
  return rows.filter(function(row){
    return String(row.status || 'active').toLowerCase() === 'active';
  }).sort(function(a, b){
    return String(a.resolution_name_vi || a.resolution_name || a.resolution_code || '').localeCompare(String(b.resolution_name_vi || b.resolution_name || b.resolution_code || ''));
  });
}
function reasonByCode(code){
  var rows = state.master && Array.isArray(state.master.downtime_reason_codes) ? state.master.downtime_reason_codes : [];
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i].reason_code || '') === String(code || '')) return rows[i];
  }
  return null;
}
function renderDowntimeReasonOptions(category, selectedCode){
  var rows = downtimeReasonOptions(category);
  var html = '<option value="">' + esc(t('Chọn mã lý do downtime', 'Select downtime reason code')) + '</option>';
  rows.forEach(function(row){
    var label = [row.reason_code, row.reason_name_vi || row.reason_name].filter(Boolean).join(' · ');
    html += '<option value="' + esc(row.reason_code || '') + '"' + (String(selectedCode || '') === String(row.reason_code || '') ? ' selected' : '') + '>' + esc(label) + '</option>';
  });
  return html;
}
function renderResolutionCodeOptions(selectedCode){
  var rows = resolutionCodeOptions();
  var html = '<option value="">' + esc(t('Chọn mã khôi phục', 'Select resolution code')) + '</option>';
  rows.forEach(function(row){
    var label = [row.resolution_code, row.resolution_name_vi || row.resolution_name].filter(Boolean).join(' · ');
    html += '<option value="' + esc(row.resolution_code || '') + '"' + (String(selectedCode || '') === String(row.resolution_code || '') ? ' selected' : '') + '>' + esc(label) + '</option>';
  });
  return html;
}
function syncDowntimeReasonFields(modal){
  if(!modal) return;
  var categorySelect = modal.querySelector('#mes-dt-category');
  var reasonSelect = modal.querySelector('#mes-dt-reason-code');
  var severitySelect = modal.querySelector('#mes-dt-severity');
  var category = categorySelect ? String(categorySelect.value || '') : '';
  var currentReason = reasonSelect ? String(reasonSelect.value || '') : '';
  if(reasonSelect){
    reasonSelect.innerHTML = renderDowntimeReasonOptions(category, currentReason);
    if(currentReason && !reasonByCode(currentReason)) reasonSelect.value = '';
  }
  var reason = reasonByCode(reasonSelect ? reasonSelect.value : '');
  var categoryView = modal.querySelector('[data-dt-category-view]');
  var reasonMeta = modal.querySelector('[data-dt-reason-meta]');
  if(categoryView){
    var resolvedCategory = downtimeCategoryMeta((reason && reason.category) || category || 'other');
    categoryView.textContent = t(resolvedCategory.vi, resolvedCategory.en);
  }
  if(reasonMeta){
    if(reason){
      var details = [];
      if(reason.reason_group) details.push(t('Nhóm', 'Group') + ': ' + reason.reason_group);
      if(reason.escalation_sla_minutes) details.push('SLA ' + reason.escalation_sla_minutes + ' ' + t('phút', 'min'));
      if(String(reason.planned_flag || 'no').toLowerCase() === 'yes') details.push(t('Downtime có kế hoạch', 'Planned downtime'));
      reasonMeta.textContent = details.join(' · ') || t('Mã lý do đã được quản trị.', 'Reason code is governed.');
    } else {
      reasonMeta.textContent = t('Chọn mã lý do để hệ thống khóa category, severity mặc định và SLA escalation.', 'Select a reason code so the system can govern category, default severity, and escalation SLA.');
    }
  }
  if(reason && severitySelect && !severitySelect.dataset.lockedByUser){
    severitySelect.value = String(reason.default_severity || 'major');
  }
}
function renderSelectOptions(rows, valueKey, labelBuilder, selectedValue, placeholder){
  var html = '<option value="">' + esc(placeholder || t('Chưa chọn', 'Not selected')) + '</option>';
  rows.forEach(function(row){
    var value = row[valueKey];
    html += '<option value="' + esc(value || '') + '"' + (String(selectedValue || '') === String(value || '') ? ' selected' : '') + '>' + esc(labelBuilder(row)) + '</option>';
  });
  return html;
}

function mergeRuntimePayload(payload){
  if(!payload || typeof payload !== 'object') return;
  if(payload.snapshot) state.snapshot = payload.snapshot;
  if(payload.runtime_mode){
    state.snapshot = state.snapshot || defaultSnapshot();
    state.snapshot.runtime_mode = payload.runtime_mode;
  }
  if(payload.master) state.master = payload.master;
  if(payload.exceptions) state.exceptions = payload.exceptions;
  if(payload.streamed_at) state.streamLastMessageAt = payload.streamed_at;
  if(payload.recommended_interval_ms){
    state.pollIntervalMs = Math.max(15000, Number(payload.recommended_interval_ms) || 30000);
  }
}

function stopPolling(){
  if(state.refreshTimer){
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

function startPolling(){
  if(state.refreshTimer) return;
  state.streamStatus = state.streamStatus === 'live' ? 'live' : 'polling';
  state.refreshTimer = setInterval(function(){
    if(state.container && !state.modal) loadData();
  }, Math.max(15000, Number(state.pollIntervalMs || 60000)));
}

function disconnectStream(){
  if(state.stream){
    try { state.stream.close(); } catch(_error) {}
    state.stream = null;
  }
  if(state.streamRetryTimer){
    clearTimeout(state.streamRetryTimer);
    state.streamRetryTimer = null;
  }
}

function connectStream(){
  if(typeof window.EventSource !== 'function' || !state.container) {
    state.streamStatus = 'polling';
    state.pollIntervalMs = 30000;
    render();
    startPolling();
    return;
  }

  if(!streamEligible((state.snapshot || {}).runtime_mode || {})) {
    state.streamStatus = 'polling';
    state.pollIntervalMs = 30000;
    render();
    startPolling();
    return;
  }

  disconnectStream();
  stopPolling();
  state.streamStatus = 'connecting';
  render();

  var source = new window.EventSource('./api.php?action=mes_stream&interval_ms=2000&ticks=20');
  state.stream = source;

  source.addEventListener('ready', function(event){
    try {
      var payload = JSON.parse(event.data || '{}');
      mergeRuntimePayload(payload);
      if(payload.stream_mode === 'polling_fallback'){
        disconnectStream();
        state.streamStatus = 'polling';
        render();
        startPolling();
        return;
      }
      state.streamStatus = 'connecting';
      state.streamLastMessageAt = '';
      if(window.console) console.debug('MES stream ready', event.data);
      render();
    } catch (_error) {
      state.streamStatus = 'connecting';
      render();
    }
  });

  source.addEventListener('mes_snapshot', function(event){
    try {
      var payload = JSON.parse(event.data || '{}');
      mergeRuntimePayload(payload);
      state.loading = false;
      state.streamStatus = 'live';
      stopPolling();
      render();
    } catch (error) {
      state.streamStatus = 'polling';
      if(window.console) console.error(error);
    }
  });

  source.addEventListener('heartbeat', function(event){
    try {
      var payload = JSON.parse(event.data || '{}');
      state.streamLastMessageAt = payload.streamed_at || state.streamLastMessageAt;
      state.streamStatus = 'live';
      render();
    } catch (_error) {}
  });

  source.onerror = function(){
    disconnectStream();
    state.streamStatus = 'polling';
    render();
    startPolling();
    state.streamRetryTimer = setTimeout(function(){
      if(state.container) connectStream();
    }, 15000);
  };
}

function loadData(){
  state.loading = true;
  return Promise.all([
    api('mes_snapshot', {}, 'GET'),
    api('master_data_snapshot', {}, 'GET'),
    api('exception_dashboard', {}, 'GET')
  ]).then(function(results){
    state.snapshot = results[0] && results[0].data ? results[0].data : defaultSnapshot();
    state.master = results[1] && results[1].data ? results[1].data : {};
    state.exceptions = results[2] && results[2].ok ? results[2] : {};
    state.pollIntervalMs = streamEligible((state.snapshot || {}).runtime_mode || {}) ? 60000 : 30000;
    state.loading = false;
    render();
  }).catch(function(error){
    state.loading = false;
    state.streamStatus = 'polling';
    state.pollIntervalMs = 30000;
    if(state.container){
      state.container.innerHTML = '<div class="mesx"><div class="mesx-empty"><strong>' + esc(t('Không thể tải dữ liệu MES', 'Could not load MES data')) + '</strong>' + esc((error && error.message) || t('Vui lòng thử lại sau.', 'Please try again later.')) + '</div></div>';
    }
  });
}

function showModal(title, subtitle, bodyHtml, onSubmit){
  closeModal();
  var wrap = document.createElement('div');
  wrap.className = 'mesx-modal-backdrop';
  wrap.innerHTML = '<div class="mesx-modal"><div class="mesx-modal-head"><div><h3>' + esc(title) + '</h3><p>' + esc(subtitle || '') + '</p></div><button type="button" class="mesx-x" aria-label="Close">×</button></div><div class="mesx-modal-body">' + bodyHtml + '</div></div>';
  document.body.appendChild(wrap);
  wrap.querySelector('.mesx-x').onclick = closeModal;
  wrap.onclick = function(event){ if(event.target === wrap) closeModal(); };
  var submit = wrap.querySelector('[data-modal-submit]');
  if(submit) submit.onclick = function(){ if(onSubmit) onSubmit(wrap, submit); };
  state.modal = wrap;
}
function closeModal(){
  if(state.modal && state.modal.parentNode) state.modal.parentNode.removeChild(state.modal);
  state.modal = null;
}
function bindModalButtons(){
  if(!state.modal) return;
  var cancel = state.modal.querySelector('[data-modal-cancel]');
  if(cancel) cancel.onclick = closeModal;
}
function fieldDisplay(label, value){
  return '<div class="mesx-field"><label>' + esc(label) + '</label><div class="mesx-mini"><strong>' + esc(value || '—') + '</strong></div></div>';
}
function editableField(id, label, controlHtml, full){
  return '<div class="mesx-field' + (full ? ' full' : '') + '"><label for="' + esc(id) + '">' + esc(label) + '</label>' + controlHtml + '</div>';
}
function openEvidenceForm(formCode, context){
  if(typeof window.renderOnlineForms !== 'function' || typeof navigateTo !== 'function') return;
  if(window._fhState){
    window._fhState.pendingContext = Object.assign({}, context || {});
    window._fhState.pendingFillSelection = { formCode: formCode };
    window._fhState.activeTab = 'fill-download';
  }
  navigateTo('forms');
}

function renderKpiTile(label, value, sub){
  return '<div class="mesx-kpi"><small>' + esc(label) + '</small><strong>' + esc(value) + '</strong><span>' + esc(sub) + '</span></div>';
}
function renderWorkCenterCard(center){
  return '<article class="mesx-center"><div class="mesx-center-top"><div><h4>' + esc(center.work_center_id || '') + '</h4><p>' + esc(center.work_center_name || '') + '</p></div>' + badge((center.down_count || 0) > 0 ? statusMeta('down') : statusMeta('running')) + '</div><div class="mesx-center-metrics"><div class="mesx-mini"><small>' + esc(t('Máy', 'Machines')) + '</small><strong>' + esc(center.machine_count || 0) + '</strong></div><div class="mesx-mini"><small>' + esc(t('WO', 'WO')) + '</small><strong>' + esc(center.wo_count || 0) + '</strong></div><div class="mesx-mini"><small>' + esc(t('OEE', 'OEE')) + '</small><strong>' + esc(fmtPercent(center.oee_pct)) + '</strong></div><div class="mesx-mini"><small>' + esc(t('Gate / Tool', 'Gate / Tool')) + '</small><strong>' + esc((center.gate_missing_count || 0) + ' / ' + (center.tooling_alert_count || 0)) + '</strong></div></div></article>';
}
function renderConnectorCard(row){
  var meta = connectorMeta(row.connector_health || 'offline');
  var status = statusMeta(row.status || 'idle');
  var adapter = adapterForMachine(row.machine_id || '');
  var canPollMtconnect = String(row.connector_type || '').toLowerCase() === 'mtconnect' && !!((adapter && adapter.endpoint_url) || row.connector_endpoint);
  return '<article class="mesx-connector">' +
    '<div class="mesx-connector-top"><div><h4>' + esc(row.machine_id || '') + ' · ' + esc(row.machine_name || '') + '</h4><p>' + esc([connectorTypeLabel(row.connector_type), row.connector_name || '', row.work_center_id || ''].filter(Boolean).join(' · ')) + '</p></div>' + badge(meta) + '</div>' +
    '<div class="mesx-connector-meta">' +
      '<div class="mesx-mini"><small>' + esc(t('Heartbeat', 'Heartbeat')) + '</small><strong>' + esc(freshnessLabel(row.signal_freshness_seconds, row.heartbeat_sla_seconds)) + '</strong></div>' +
      '<div class="mesx-mini"><small>' + esc(t('Trạng thái tín hiệu', 'Signal state')) + '</small><strong>' + esc(signalStateLabel(row.signal_state || row.status || 'idle')) + '</strong></div>' +
      '<div class="mesx-mini"><small>' + esc(t('WO / chương trình', 'WO / program')) + '</small><strong>' + esc([row.current_program_id || '', row.part_count == null ? '' : ('Parts ' + row.part_count)].filter(Boolean).join(' · ') || '—') + '</strong></div>' +
      '<div class="mesx-mini"><small>' + esc(t('Spindle / override', 'Spindle / override')) + '</small><strong>' + esc([(row.spindle_load_pct == null ? '' : (Number(row.spindle_load_pct).toFixed(0) + '%')), (row.feed_override_pct == null ? '' : (Number(row.feed_override_pct).toFixed(0) + '%'))].filter(Boolean).join(' · ') || '—') + '</strong></div>' +
    '</div>' +
    '<div class="mesx-connector-actions"><span>' + badge(status) + '</span><button type="button" class="mesx-link" data-open-signal-bridge="' + esc(row.machine_id || '') + '">' + esc(t('Cập nhật tín hiệu', 'Update signal')) + '</button><button type="button" class="mesx-link" data-poll-mtconnect="' + esc(row.machine_id || '') + '"' + (canPollMtconnect ? '' : ' disabled') + '>' + esc(t('Đọc MTConnect', 'Poll MTConnect')) + '</button><button type="button" class="mesx-link warning" data-open-adapter-event="' + esc(row.machine_id || '') + '"' + (adapter ? '' : ' disabled') + '>' + esc(t('Log adapter', 'Log adapter')) + '</button></div>' +
  '</article>';
}
function renderExceptionRail(){
  var ex = state.exceptions || {};
  var keys = Object.keys(EXCEPTION_META);
  return '<div class="mesx-ex-grid">' + keys.map(function(key){
    var meta = EXCEPTION_META[key];
    var value = Number(ex[key] || 0);
    return '<button type="button" class="mesx-ex" data-open-exception="' + esc(key) + '"><strong>' + esc(value) + '</strong><span>' + esc(meta.icon + ' ' + t(meta.vi, meta.en)) + '</span><small>' + esc(value > 0 ? t('Cần rà soát và xử lý theo hàng đợi chi tiết.', 'Requires review and action from the detailed queue.') : t('Hiện không có ngoại lệ trong nhóm này.', 'There is currently no exception in this group.')) + '</small></button>';
  }).join('') + '</div>';
}

function renderGateCell(gate, row){
  var meta = gateMeta(gate.status || 'not_required');
  var missing = Array.isArray(gate.missing_form_codes) ? gate.missing_form_codes : [];
  var context = {
    customer_id: row.customer_id || '',
    so_number: row.so_number || '',
    jo_number: row.jo_number || '',
    wo_number: row.wo_number || '',
    part_number: row.part_number || '',
    part_revision: row.part_revision || '',
    machine_id: row.machine_id || '',
    work_center_id: row.work_center_id || '',
    operator_id: row.operator_id || ''
  };
  return badge(meta) +
    '<span class="mesx-sub">' + esc((gate.completed_count || 0) + '/' + (gate.total_required || 0) + ' ' + t('gate đã đủ', 'gates completed')) + '</span>' +
    (missing.length ? '<div class="mesx-alert-stack">' + missing.map(function(code){ return '<button type="button" class="mesx-link warning" data-open-form="' + esc(code) + '" data-context="' + esc(jsonAttr(context)) + '">' + esc(code) + '</button>'; }).join('') + '</div>' : '');
}
function renderToolingCell(tooling, row){
  var meta = toolMeta(tooling.status || 'healthy');
  var readiness = row && row.tool_readiness ? row.tool_readiness : {};
  var readinessMeta = governanceMeta(readiness.band || 'ready');
  var items = Array.isArray(tooling.items) ? tooling.items : [];
  var highlights = items.filter(function(item){
    return ['warning', 'critical', 'untracked'].indexOf(String(item.alert_level || 'healthy')) >= 0;
  }).slice(0, 2);
  return badge(meta) +
    '<span class="mesx-sub">' + esc((tooling.loaded_tool_count || 0) + ' ' + t('tool đang nạp', 'tools loaded') + ' · ' + (tooling.alert_count || 0) + ' ' + t('cảnh báo', 'alerts')) + '</span>' +
    (readiness && readiness.summary_vi ? '<span class="mesx-sub">' + esc(t(readiness.summary_vi || '', readiness.summary_en || '')) + '</span>' : '') +
    (highlights.length ? '<div class="mesx-alert-stack">' + highlights.map(function(item){
      return '<button type="button" class="mesx-link ' + (item.alert_level === 'critical' ? 'danger' : 'warning') + '" data-edit-tooling="' + esc(row.machine_id || '') + '" data-tool-runtime="' + esc(item.tool_runtime_id || '') + '">' + esc(item.tool_id || 'TL') + '</button>';
    }).join('') + '</div>' : '') +
    '<div class="mesx-mini-actions" style="margin-top:8px"><span>' + badge(readinessMeta) + '</span><button type="button" class="mesx-link" data-edit-tooling="' + esc(row.machine_id || '') + '">' + esc(t('Cập nhật tool', 'Update tooling')) + '</button></div>';
}
function renderDispatchTable(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Không có WO khớp bộ lọc', 'No WO matches the current filters')) + '</strong>' + esc(t('Thử bỏ bớt bộ lọc hoặc làm mới dữ liệu MES.', 'Try clearing filters or refreshing the MES snapshot.')) + '</div>';
  }
  return '<div class="mesx-table-wrap"><table class="mesx-table"><thead><tr><th>' + esc(t('WO', 'WO')) + '</th><th>' + esc(t('Khách hàng / Part', 'Customer / Part')) + '</th><th>' + esc(t('Máy / WC', 'Machine / WC')) + '</th><th>' + esc(t('OEE / Tiến độ', 'OEE / Progress')) + '</th><th>' + esc(t('Gate chứng cứ', 'Evidence gate')) + '</th><th>' + esc(t('Tooling', 'Tooling')) + '</th><th>' + esc(t('Hành động', 'Actions')) + '</th></tr></thead><tbody>' + rows.map(function(row){
    var woStatus = statusMeta(row.status);
    var ctx = {
      customer_id: row.customer_id || '',
      so_number: row.so_number || '',
      jo_number: row.jo_number || '',
      wo_number: row.wo_number || '',
      part_number: row.part_number || '',
      part_revision: row.part_revision || '',
      machine_id: row.machine_id || '',
      work_center_id: row.work_center_id || '',
      operator_id: row.operator_id || ''
    };
    var oeeText = row.machine_id ? fmtPercent((machineById(row.machine_id) || {}).oee_pct) : '—';
    return '<tr><td><span class="mesx-code">' + esc(row.wo_number || '') + '</span><span class="mesx-sub">' + esc([row.jo_number || '', row.so_number || '', t(woStatus.vi, woStatus.en)].filter(Boolean).join(' · ')) + '</span></td><td><strong>' + esc(row.customer_name || row.customer_id || '—') + '</strong><span class="mesx-sub">' + esc([row.part_number || '', row.part_revision || '', row.operation_desc || ''].filter(Boolean).join(' · ')) + '</span></td><td><strong>' + esc(row.machine_id || '—') + '</strong><span class="mesx-sub">' + esc([row.machine_name || '', row.work_center_id || '', row.operator_name || row.operator_id || ''].filter(Boolean).join(' · ')) + '</span></td><td>' + badge(woStatus) + '<span class="mesx-sub">' + esc('OK ' + Number(row.qty_completed || 0) + ' / ' + Number(row.qty_ordered || 0) + ' · Scrap ' + Number(row.qty_scrap || 0) + ' · OEE ' + oeeText) + '</span><span class="mesx-sub">' + esc(fmtDateTime(row.scheduled_start || '') + ' → ' + fmtDateTime(row.scheduled_end || '')) + '</span></td><td>' + renderGateCell(row.evidence_gate || {}, row) + '</td><td>' + renderToolingCell(row.tooling || {}, row) + '</td><td><div class="mesx-row-actions"><button type="button" class="mesx-link" data-report-progress="' + esc(row.wo_number || '') + '">' + esc(t('Báo tiến độ', 'Report progress')) + '</button><button type="button" class="mesx-link" data-open-form="FRM-519" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Pre-run', 'Pre-run')) + '</button><button type="button" class="mesx-link warning" data-open-form="FRM-512" data-context="' + esc(jsonAttr(ctx)) + '">' + esc(t('Downtime', 'Downtime')) + '</button></div></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function renderMachineCard(machine){
  var status = statusMeta(machine.status);
  var gate = machine.evidence_gate || {};
  var toolingRows = Array.isArray(machine.tooling_items) ? machine.tooling_items : [];
  var active = machine.active_work_order || {};
  var connector = connectorMeta(machine.connector_health || 'offline');
  var context = {
    customer_id: active.customer_id || '',
    so_number: active.so_number || '',
    jo_number: active.jo_number || '',
    wo_number: active.wo_number || '',
    part_number: active.part_number || '',
    part_revision: active.part_revision || '',
    machine_id: machine.machine_id || '',
    work_center_id: machine.work_center_id || '',
    operator_id: active.operator_id || machine.preferred_operator_id || ''
  };
  return '<article class="mesx-machine"><div class="mesx-machine-head"><div><h4>' + esc(machine.machine_id || '') + ' · ' + esc(machine.machine_name || '') + '</h4><p>' + esc([machine.work_center_id || '', machine.machine_type || '', machine.location || ''].filter(Boolean).join(' · ')) + '</p></div>' + badge(status) + '</div><div class="mesx-machine-grid"><div class="mesx-mini"><small>' + esc(t('WO hiện tại', 'Active WO')) + '</small><strong>' + esc(active.wo_number || '—') + '</strong></div><div class="mesx-mini"><small>' + esc(t('Queue', 'Queue')) + '</small><strong>' + esc((machine.queue_count || 0) + ' ' + t('WO', 'WO')) + '</strong></div><div class="mesx-mini"><small>' + esc(t('OEE', 'OEE')) + '</small><strong>' + esc(fmtPercent(machine.oee_pct)) + '</strong></div><div class="mesx-mini"><small>' + esc(t('Availability', 'Availability')) + '</small><strong>' + esc(fmtPercent(machine.availability_pct)) + '</strong></div><div class="mesx-mini"><small>' + esc(t('Performance', 'Performance')) + '</small><strong>' + esc(fmtPercent(machine.performance_pct)) + '</strong></div><div class="mesx-mini"><small>' + esc(t('Quality', 'Quality')) + '</small><strong>' + esc(fmtPercent(machine.quality_pct)) + '</strong></div><div class="mesx-mini"><small>' + esc(t('Connector', 'Connector')) + '</small><strong>' + esc(connectorTypeLabel(machine.connector_type || 'manual_bridge')) + '</strong><span class="mesx-sub">' + esc(t(connector.vi, connector.en) + ' · ' + freshnessLabel(machine.signal_freshness_seconds, machine.heartbeat_sla_seconds)) + '</span></div><div class="mesx-mini"><small>' + esc(t('Tín hiệu máy', 'Machine signal')) + '</small><strong>' + esc(signalStateLabel(machine.signal_state || machine.status || 'idle')) + '</strong><span class="mesx-sub">' + esc([machine.current_program_id || '', machine.spindle_load_pct == null ? '' : ('Load ' + Number(machine.spindle_load_pct).toFixed(0) + '%'), machine.feed_override_pct == null ? '' : ('FO ' + Number(machine.feed_override_pct).toFixed(0) + '%')].filter(Boolean).join(' · ') || t('Chưa có signal runtime', 'No runtime signal')) + '</span></div></div><div class="mesx-section"><div class="mesx-mini"><small>' + esc(t('Gate chứng cứ', 'Evidence gate')) + '</small><strong>' + esc(t(gate.summary_vi || 'Không yêu cầu', gate.summary_en || 'Not required')) + '</strong></div><div class="mesx-alert-stack">' + (Array.isArray(gate.missing_form_codes) && gate.missing_form_codes.length ? gate.missing_form_codes.map(function(code){ return '<button type="button" class="mesx-link warning" data-open-form="' + esc(code) + '" data-context="' + esc(jsonAttr(context)) + '">' + esc(code) + '</button>'; }).join('') : '<span class="mesx-chip stone">' + esc(t('Không có gate còn thiếu', 'No missing gates')) + '</span>') + '</div></div><div class="mesx-section"><div class="mesx-mini"><small>' + esc(t('Tooling active', 'Active tooling')) + '</small><strong>' + esc((machine.loaded_tool_count || 0) + ' · ' + (machine.tool_alert_count || 0) + ' ' + t('cảnh báo', 'alerts')) + '</strong></div><div class="mesx-alert-stack">' + (toolingRows.length ? toolingRows.slice(0, 3).map(function(item){ return '<button type="button" class="mesx-link ' + ((item.alert_level || '') === 'critical' ? 'danger' : ((item.alert_level || '') === 'warning' ? 'warning' : '')) + '" data-edit-tooling="' + esc(machine.machine_id || '') + '" data-tool-runtime="' + esc(item.tool_runtime_id || '') + '">' + esc((item.tool_id || '') + ' · ' + (item.life_used_pct == null ? '—' : fmtPercent(item.life_used_pct))) + '</button>'; }).join('') : '<span class="mesx-chip stone">' + esc(t('Chưa có runtime tool-life', 'No tool-life runtime')) + '</span>') + '</div></div><div class="mesx-mini-actions" style="margin-top:14px"><button type="button" class="mesx-link" data-report-progress="' + esc(active.wo_number || '') + '"' + (!active.wo_number ? ' disabled' : '') + '>' + esc(t('Báo tiến độ', 'Report progress')) + '</button><button type="button" class="mesx-link" data-open-signal-bridge="' + esc(machine.machine_id || '') + '">' + esc(t('Cập nhật tín hiệu', 'Update signal')) + '</button>' + (machine.open_downtime ? '<button type="button" class="mesx-link danger" data-resolve-downtime="' + esc(machine.open_downtime.downtime_id || '') + '">' + esc(t('Khôi phục downtime', 'Resolve downtime')) + '</button>' : '<button type="button" class="mesx-link warning" data-new-downtime="' + esc(machine.machine_id || '') + '">' + esc(t('Báo dừng máy', 'Log downtime')) + '</button>') + '<button type="button" class="mesx-link" data-new-maintenance="' + esc(machine.machine_id || '') + '">' + esc(t('Tạo bảo trì', 'New maintenance')) + '</button><button type="button" class="mesx-link" data-edit-tooling="' + esc(machine.machine_id || '') + '">' + esc(t('Cập nhật tooling', 'Update tooling')) + '</button><button type="button" class="mesx-link" data-open-form="FRM-521" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở PM form', 'Open PM form')) + '</button></div></article>';
}
function renderToolingWatchlist(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Tool-life đang ổn định', 'Tool-life is stable')) + '</strong>' + esc(t('Hiện chưa có tooling nào vượt ngưỡng cảnh báo trong runtime.', 'There are no tooling alerts above the warning threshold in the current runtime.')) + '</div>';
  }
  return rows.map(function(row){
    var meta = toolMeta(row.alert_level);
    return '<div class="mesx-list-item"><h4>' + esc(row.tool_id || '') + ' · ' + esc(row.tool_name || '') + '</h4><p>' + esc(t(row.alert_message_vi || 'Cần kiểm tra lại tooling.', row.alert_message_en || 'Tooling needs attention.')) + '</p><div class="mesx-meta">' + esc([row.machine_id || '', row.work_center_id || '', row.wo_number || '', row.pocket ? ('Pocket ' + row.pocket) : '', row.offset_status || '', row.life_used_pct == null ? '' : ('Life ' + fmtPercent(row.life_used_pct))].filter(Boolean).join(' · ')) + '</div><div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link ' + ((row.alert_level || '') === 'critical' ? 'danger' : 'warning') + '" data-edit-tooling="' + esc(row.machine_id || '') + '" data-tool-runtime="' + esc(row.tool_runtime_id || '') + '">' + esc(t('Xử lý tool', 'Handle tool')) + '</button><span>' + badge(meta) + '</span></div></div>';
  }).join('');
}
function renderGateQueue(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Không có WO thiếu gate', 'No WO is missing gates')) + '</strong>' + esc(t('Các WO đang theo dõi hiện đã đủ gate chứng cứ bắt buộc.', 'All tracked WO currently satisfy their required evidence gates.')) + '</div>';
  }
  return rows.map(function(row){
    var meta = gateMeta(row.status);
    var context = {
      so_number: row.so_number || '',
      jo_number: row.jo_number || '',
      wo_number: row.wo_number || '',
      part_number: row.part_number || '',
      part_revision: row.part_revision || '',
      machine_id: row.machine_id || '',
      work_center_id: row.work_center_id || ''
    };
    return '<div class="mesx-list-item"><h4>' + esc(row.wo_number || '') + ' · ' + esc(row.machine_id || '—') + '</h4><p>' + esc([row.customer_name || '', row.part_number || '', row.part_revision || ''].filter(Boolean).join(' · ')) + '</p><div class="mesx-meta">' + esc((row.completed_count || 0) + '/' + (row.total_required || 0) + ' · ' + t(row.summary_vi || 'Thiếu gate', row.summary_en || 'Missing gates')) + '</div><div class="mesx-mini-actions" style="margin-top:10px"><span>' + badge(meta) + '</span>' + (Array.isArray(row.missing_form_codes) ? row.missing_form_codes.map(function(code){ return '<button type="button" class="mesx-link warning" data-open-form="' + esc(code) + '" data-context="' + esc(jsonAttr(context)) + '">' + esc(code) + '</button>'; }).join('') : '') + '</div></div>';
  }).join('');
}
function renderDowntimeList(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Không có downtime mở', 'No open downtime')) + '</strong>' + esc(t('Tất cả máy đang hoạt động hoặc đã được khôi phục.', 'All machines are running or have already been recovered.')) + '</div>';
  }
  return rows.map(function(row){
    var context = { machine_id: row.machine_id || '', work_center_id: row.work_center_id || '', wo_number: row.wo_number || '' };
    return '<div class="mesx-list-item"><h4>' + esc(row.machine_id || '') + ' · ' + esc(row.machine_name || '') + '</h4><p>' + esc(row.reason || '') + '</p><div class="mesx-meta">' + esc([row.wo_number || '', row.category || '', row.severity || '', row.tool_id || '', fmtDateTime(row.started_at || '')].filter(Boolean).join(' · ')) + '</div><div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link danger" data-resolve-downtime="' + esc(row.downtime_id || '') + '">' + esc(t('Khôi phục', 'Resolve')) + '</button><button type="button" class="mesx-link warning" data-open-form="FRM-512" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở form downtime', 'Open downtime form')) + '</button></div></div>';
  }).join('');
}
function renderMaintenanceList(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Không có maintenance mở', 'No open maintenance')) + '</strong>' + esc(t('Queue bảo trì hiện đang trống.', 'The maintenance queue is currently empty.')) + '</div>';
  }
  return rows.map(function(row){
    var context = { machine_id: row.machine_id || '', work_center_id: row.work_center_id || '', wo_number: row.wo_number || '' };
    return '<div class="mesx-list-item"><h4>' + esc(row.machine_id || '') + ' · ' + esc(row.title || '') + '</h4><p>' + esc(row.description || '') + '</p><div class="mesx-meta">' + esc([row.maintenance_type || '', row.priority || '', row.assigned_to || '', row.due_date || '', row.tool_id || ''].filter(Boolean).join(' · ')) + '</div><div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link" data-maintenance-status="' + esc(row.request_id || '') + ':approved">' + esc(t('Duyệt', 'Approve')) + '</button><button type="button" class="mesx-link" data-maintenance-status="' + esc(row.request_id || '') + ':in_progress">' + esc(t('Bắt đầu', 'Start')) + '</button><button type="button" class="mesx-link" data-maintenance-status="' + esc(row.request_id || '') + ':completed">' + esc(t('Hoàn tất', 'Complete')) + '</button><button type="button" class="mesx-link" data-open-form="FRM-521" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở PM form', 'Open PM form')) + '</button></div></div>';
  }).join('');
}
function renderProgressList(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Chưa có progress report', 'No progress report yet')) + '</strong>' + esc(t('Shop-floor chưa gửi bản ghi tiến độ nào trong runtime này.', 'No shop-floor progress report has been submitted in this runtime yet.')) + '</div>';
  }
  return rows.map(function(row){
    return '<div class="mesx-list-item"><h4>' + esc(row.wo_number || '') + ' · ' + esc(t(statusMeta(row.status || '').vi, statusMeta(row.status || '').en)) + '</h4><p>' + esc(row.note || t('Không có ghi chú bổ sung.', 'No additional note.')) + '</p><div class="mesx-meta">' + esc([row.machine_id || '', row.operator_id || '', 'OK ' + Number(row.qty_completed || 0), 'Scrap ' + Number(row.qty_scrap || 0), fmtMinutes(Number(row.setup_time_actual || 0) + Number(row.run_time_actual || 0)), fmtDateTime(row.reported_at || '')].filter(Boolean).join(' · ')) + '</div></div>';
  }).join('');
}

function renderOeeTimeline(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Chưa có OEE timeline', 'No OEE timeline yet')) + '</strong>' + esc(t('Cần ít nhất một máy có runtime hoặc tiến độ để tính OEE.', 'At least one machine needs runtime or progress to compute OEE.')) + '</div>';
  }
  return '<div class="mesx-analytics-stack">' + rows.slice(0, 6).map(function(row){
    var band = String(row.band || 'unknown');
    var dominantMap = {
      availability: t('Availability là nút thắt', 'Availability is the bottleneck'),
      performance: t('Performance đang kéo xuống', 'Performance is dragging down'),
      quality: t('Quality cần phản ứng', 'Quality needs reaction')
    };
    var note = dominantMap[row.dominant_loss] || t('Đủ dữ liệu để so sánh theo máy', 'Enough data to compare by machine');
    return '<div class="mesx-metric-row">' +
      '<div class="mesx-metric-label"><strong>' + esc((row.machine_id || '—') + ' · ' + (row.active_wo_number || t('Chưa gắn WO', 'No WO'))) + '</strong><span>' + esc([row.customer_name || '', row.part_number || '', row.part_revision || '', note].filter(Boolean).join(' · ')) + '</span></div>' +
      '<div class="mesx-bar" data-band="' + esc(band) + '"><span style="width:' + esc(String(Math.max(0, Math.min(100, Number(row.oee_pct || 0))))) + '%"></span></div>' +
      '<div class="mesx-metric-value">' + esc(fmtPercent(row.oee_pct)) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function renderDowntimePareto(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Chưa có downtime đủ để phân tích', 'No downtime available for pareto')) + '</strong>' + esc(t('Khi runtime có downtime, bảng pareto sẽ xếp hạng theo tổng phút mất.', 'Once downtime exists in runtime, the pareto view will rank losses by total minutes.')) + '</div>';
  }
  return '<div class="mesx-analytics-stack">' + rows.slice(0, 5).map(function(row){
    var band = Number(row.share_pct || 0) >= 50 ? 'risk' : (Number(row.share_pct || 0) >= 25 ? 'watch' : 'strong');
    return '<div class="mesx-pareto-row">' +
      '<div class="mesx-pareto-main"><strong>' + esc(String(row.category || 'uncategorized')) + '</strong><span>' + esc([(row.event_count || 0) + ' ' + t('sự kiện', 'events'), (row.open_count || 0) + ' ' + t('đang mở', 'open'), (row.major_count || 0) + ' ' + t('mức major+', 'major+')].join(' · ')) + '</span><div class="mesx-bar" data-band="' + esc(band) + '" style="margin-top:8px"><span style="width:' + esc(String(Math.max(0, Math.min(100, Number(row.share_pct || 0))))) + '%"></span></div></div>' +
      '<div class="mesx-metric-value">' + esc(fmtMinutes(row.minutes || 0) + ' · ' + fmtPercent(row.share_pct || 0)) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function renderProgramHandshakeQueue(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('NC handshake đang sạch', 'NC handshake is clean')) + '</strong>' + esc(t('Chưa có WO nào báo sai hoặc thiếu chương trình NC so với lệnh phát hành.', 'No active WO is reporting a missing or mismatched NC program against the released route.')) + '</div>';
  }
  return '<div class="mesx-handshake-list">' + rows.slice(0, 8).map(function(row){
    var severity = String(row.severity || 'info') === 'critical' ? statusMeta('down') : statusMeta('on_hold');
    var context = {
      so_number: row.so_number || '',
      jo_number: row.jo_number || '',
      wo_number: row.wo_number || '',
      part_number: row.part_number || '',
      part_revision: row.part_revision || '',
      machine_id: row.machine_id || '',
      work_center_id: row.work_center_id || '',
      operator_id: row.operator_id || ''
    };
    return '<div class="mesx-handshake">' +
      '<div class="mesx-handshake-head"><div><h4>' + esc((row.machine_id || '—') + ' · ' + (row.wo_number || '—')) + '</h4><p>' + esc([row.customer_name || '', row.part_number || '', row.part_revision || '', row.machine_name || ''].filter(Boolean).join(' · ')) + '</p></div>' + badge(severity) + '</div>' +
      '<div class="mesx-meta">' + esc([t('Kỳ vọng', 'Expected') + ': ' + (row.expected_program_id || '—'), t('Thực tế', 'Actual') + ': ' + (row.actual_program_id || t('Thiếu', 'Missing')), t('Kết nối', 'Connector') + ': ' + (row.connector_health || 'offline')].join(' · ')) + '</div>' +
      '<p>' + esc(t(row.message_vi || 'Cần xác nhận lại chương trình NC trước khi tiếp tục chạy.', row.message_en || 'Validate the NC program before continuing the run.')) + '</p>' +
      '<div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link warning" data-open-signal-bridge="' + esc(row.machine_id || '') + '">' + esc(t('Xác nhận tín hiệu', 'Verify signal')) + '</button><button type="button" class="mesx-link" data-report-progress="' + esc(row.wo_number || '') + '">' + esc(t('Báo tiến độ', 'Report progress')) + '</button><button type="button" class="mesx-link" data-open-form="FRM-519" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở pre-run', 'Open pre-run')) + '</button></div>' +
    '</div>';
  }).join('') + '</div>';
}

function renderProgramReleaseQueue(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Không có WO nào thiếu release NC', 'No WO is missing a governed NC release')) + '</strong>' + esc(t('Tất cả WO đang theo dõi đều có bản phát hành NC phù hợp với part, revision, operation và machine context.', 'Every tracked WO has a released NC program aligned with part, revision, operation, and machine context.')) + '</div>';
  }
  return '<div class="mesx-list">' + rows.slice(0, 8).map(function(row){
    var meta = governanceMeta(row.band || 'warning');
    var context = {
      customer_id: row.customer_id || '',
      so_number: row.so_number || '',
      jo_number: row.jo_number || '',
      wo_number: row.wo_number || '',
      part_number: row.part_number || '',
      part_revision: row.part_revision || '',
      machine_id: row.machine_id || '',
      work_center_id: row.work_center_id || '',
      operator_id: row.operator_id || ''
    };
    var releaseSummary = [
      t('Kỳ vọng', 'Expected') + ': ' + (row.expected_program_id || '—'),
      t('Phát hành', 'Release') + ': ' + (row.program_id || row.expected_program_id || '—'),
      t('Trạng thái', 'Status') + ': ' + (row.release_status || row.status || '—')
    ].join(' · ');
    var issues = Array.isArray(row.context_issues) && row.context_issues.length
      ? '<div class="mesx-meta">' + esc(row.context_issues.join(' · ')) + '</div>'
      : '';
    return '<div class="mesx-list-item"><h4>' + esc((row.wo_number || '—') + ' · ' + (row.machine_id || '—')) + '</h4><p>' + esc([row.customer_name || '', row.part_number || '', row.part_revision || '', row.operation_number || row.operation_desc || ''].filter(Boolean).join(' · ')) + '</p><div class="mesx-meta">' + esc(releaseSummary) + '</div>' + issues + '<p>' + esc(t(row.message_vi || 'Cần chốt lại release NC trước khi chạy tiếp.', row.message_en || 'Confirm the NC release before continuing the run.')) + '</p><div class="mesx-mini-actions" style="margin-top:10px"><span>' + badge(meta) + '</span><button type="button" class="mesx-link warning" data-open-form="FRM-519" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở pre-run', 'Open pre-run')) + '</button><button type="button" class="mesx-link" data-report-progress="' + esc(row.wo_number || '') + '">' + esc(t('Báo tiến độ', 'Report progress')) + '</button></div></div>';
  }).join('') + '</div>';
}

function renderToolReadinessQueue(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Tooling sẵn sàng cho các WO đang chạy', 'Tooling is ready for the tracked WO')) + '</strong>' + esc(t('Không có WO nào đang bị chặn bởi tool-life, offset hoặc dữ liệu runtime tooling còn thiếu.', 'No active WO is currently blocked by tool-life, offset drift, or missing governed tooling runtime.')) + '</div>';
  }
  return '<div class="mesx-list">' + rows.slice(0, 8).map(function(row){
    var meta = governanceMeta(row.band || 'warning');
    var context = {
      customer_id: row.customer_id || '',
      so_number: row.so_number || '',
      jo_number: row.jo_number || '',
      wo_number: row.wo_number || '',
      part_number: row.part_number || '',
      part_revision: row.part_revision || '',
      machine_id: row.machine_id || '',
      work_center_id: row.work_center_id || '',
      operator_id: row.operator_id || ''
    };
    var detailBits = [
      row.loaded_tool_count == null ? '' : (row.loaded_tool_count + ' ' + t('tool đang nạp', 'loaded tools')),
      row.alert_count == null ? '' : (row.alert_count + ' ' + t('cảnh báo', 'alerts')),
      row.top_tool_id ? (t('Tool ưu tiên', 'Top tool') + ': ' + row.top_tool_id) : '',
      row.highest_life_pct == null ? '' : ('Life ' + fmtPercent(row.highest_life_pct))
    ].filter(Boolean);
    return '<div class="mesx-list-item"><h4>' + esc((row.wo_number || '—') + ' · ' + (row.machine_id || '—')) + '</h4><p>' + esc([row.customer_name || '', row.part_number || '', row.part_revision || '', row.machine_name || ''].filter(Boolean).join(' · ')) + '</p><div class="mesx-meta">' + esc(detailBits.join(' · ')) + '</div><p>' + esc(t(row.message_vi || 'Cần xác nhận lại tooling trước khi release cắt.', row.message_en || 'Confirm tooling readiness before releasing the cut.')) + '</p><div class="mesx-mini-actions" style="margin-top:10px"><span>' + badge(meta) + '</span><button type="button" class="mesx-link" data-edit-tooling="' + esc(row.machine_id || '') + '">' + esc(t('Cập nhật tooling', 'Update tooling')) + '</button><button type="button" class="mesx-link warning" data-open-form="FRM-519" data-context="' + esc(jsonAttr(context)) + '">' + esc(t('Mở pre-run', 'Open pre-run')) + '</button></div></div>';
  }).join('') + '</div>';
}

function renderGovernanceQueue(rows, options){
  var emptyTitle = options.emptyTitle || t('Không có mục nào cần xử lý', 'No action needed');
  var emptyText = options.emptyText || t('Hàng đợi hiện đang sạch.', 'The queue is currently clear.');
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(emptyTitle) + '</strong>' + esc(emptyText) + '</div>';
  }
  return '<div class="mesx-list">' + rows.slice(0, 8).map(function(row){
    var meta = governanceMeta(row.severity === 'critical' ? 'critical' : (row.severity === 'warning' ? 'warning' : 'ready'));
    var detail = typeof options.detail === 'function' ? options.detail(row) : '';
    var sub = typeof options.sub === 'function' ? options.sub(row) : '';
    var actions = typeof options.actions === 'function' ? options.actions(row) : '';
    var message = t(row.message_vi || options.fallbackVi || 'Cần rà soát lại mục này trước khi tiếp tục WO.', row.message_en || options.fallbackEn || 'Review this item before the WO continues.');
    return '<div class="mesx-list-item"><h4>' + esc((row.wo_number || row.machine_id || row.store_key || '—') + (row.machine_id && row.wo_number ? ' · ' + row.machine_id : '')) + '</h4><p>' + esc(detail) + '</p>' + (sub ? '<div class="mesx-meta">' + esc(sub) + '</div>' : '') + '<p>' + esc(message) + '</p><div class="mesx-mini-actions" style="margin-top:10px"><span>' + badge(meta) + '</span>' + actions + '</div></div>';
  }).join('') + '</div>';
}

function renderCutoverAudit(audit){
  audit = audit || {};
  var status = String(audit.status || 'json_only').toLowerCase();
  var meta = governanceMeta(
    status === 'aligned'
      ? 'ready'
      : (status === 'postgres_unreachable' ? 'critical' : 'warning')
  );
  var groups = audit.groups || {};
  var rows = [];
  Object.keys(groups).forEach(function(groupKey){
    var group = groups[groupKey] || {};
    var entities = Array.isArray(group.entities) ? group.entities : [];
    entities.forEach(function(row){
      if((row && row.drift) || status === 'postgres_unreachable' || status === 'json_only'){
        rows.push({
          group_key: groupKey,
          entity_key: row.entity_key || '',
          json_count: row.json_count,
          postgres_count: row.postgres_count,
          drift: row.drift,
          group_status: group.status || '',
          status: row.status || 'unavailable'
        });
      }
    });
  });

  var header = '<div class="mesx-mini" style="margin:14px 0 10px"><small>' + esc(t('Cutover parity audit', 'Cutover parity audit')) + '</small><strong>' + esc([
    String(audit.status || 'json_only'),
    t('Entity drift', 'Entity drift') + ': ' + String(audit.drift_entities || 0),
    t('Total drift', 'Total drift') + ': ' + String(audit.drift_total || 0)
  ].join(' · ')) + '</strong><span class="mesx-sub">' + esc(t('So khớp số lượng JSON runtime với PostgreSQL shadow để biết domain nào đã đủ sạch cho việc chuyển primary-read.', 'Compare JSON runtime counts with the PostgreSQL shadow so you know which domains are clean enough for primary-read promotion.')) + '</span></div>';

  if(!rows.length){
    return header + '<div class="mesx-list"><div class="mesx-list-item"><h4>' + badge(meta) + '</h4><p>' + esc(status === 'aligned'
      ? t('JSON và PostgreSQL đang cân bằng trên các domain đã theo dõi.', 'JSON and PostgreSQL are aligned across the tracked domains.')
      : (status === 'postgres_unreachable'
        ? t('PostgreSQL chưa reachable nên chưa thể chứng minh parity cutover.', 'PostgreSQL is not reachable yet, so cutover parity cannot be proven.')
        : t('Runtime vẫn đang thiên về JSON; bật PostgreSQL path để bắt đầu parity audit đầy đủ.', 'Runtime is still JSON-led; enable the PostgreSQL path to begin full parity auditing.'))) + '</p></div></div>';
  }

  return header + '<div class="mesx-list">' + rows.slice(0, 12).map(function(row){
    var driftMeta = governanceMeta(row.status === 'aligned' ? 'ready' : (row.status === 'unavailable' ? 'critical' : 'warning'));
    var driftText = row.postgres_count == null
      ? t('Chưa có dữ liệu PostgreSQL', 'PostgreSQL data unavailable')
      : ('Δ ' + String(row.drift || 0));
    return '<div class="mesx-list-item"><div class="mesx-inline-head"><h4>' + esc((row.group_key || 'runtime') + ' · ' + (row.entity_key || 'entity')) + '</h4>' + badge(driftMeta) + '</div><p>' + esc([
      'JSON ' + String(row.json_count == null ? 0 : row.json_count),
      row.postgres_count == null ? 'PG —' : ('PG ' + String(row.postgres_count)),
      driftText
    ].join(' · ')) + '</p></div>';
  }).join('') + '</div>';
}

function renderShadowSyncQueue(rows){
  var snapshot = state.snapshot || defaultSnapshot();
  var shadowStatus = snapshot.shadow_status || {};
  var primaryReadStatus = snapshot.primary_read_status || {};
  var primaryReadQueue = Array.isArray(snapshot.primary_read_queue) ? snapshot.primary_read_queue : [];
  var connectorIngestStatus = snapshot.connector_ingest_status || {};
  var runtimeMode = snapshot.runtime_mode || {};
  var cutoverAudit = snapshot.cutover_audit || {};
  var buckets = ['master_data', 'orders', 'mes'];
  var overview = '<div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Shadow sync health', 'Shadow sync health')) + '</small><strong>' + esc([
    String(runtimeMode.mode || 'JSON_ONLY'),
    runtimeMode.postgres_path_active ? (runtimeMode.postgres_reachable ? t('PostgreSQL sẵn sàng', 'PostgreSQL reachable') : t('PostgreSQL chưa tới được', 'PostgreSQL unreachable')) : t('Đang chạy thuần JSON', 'Running JSON only'),
    runtimeMode.json_fallback ? t('Có JSON fallback', 'JSON fallback enabled') : t('Không có JSON fallback', 'JSON fallback disabled')
  ].join(' · ')) + '</strong><span class="mesx-sub">' + esc([
    (((connectorIngestStatus.totals || {}).success || 0) + ' ok'),
    (((connectorIngestStatus.totals || {}).failure || 0) + ' fail')
  ].join(' · ')) + '</span></div>' +
  buckets.map(function(key){
    var bucket = shadowStatus[key] || {};
    return '<div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(key) + '</small><strong>' + esc(String(bucket.last_status || 'never')) + '</strong><span class="mesx-sub">' + esc([
      bucket.success_count != null ? ('OK ' + bucket.success_count) : '',
      bucket.failure_count != null ? ('Fail ' + bucket.failure_count) : '',
      bucket.skipped_count != null ? ('Skip ' + bucket.skipped_count) : '',
      bucket.last_mode || ''
    ].filter(Boolean).join(' · ')) + '</span></div>';
  }).join('');
  var primaryOverview = '<div class="mesx-mini" style="margin:14px 0 10px"><small>' + esc(t('PostgreSQL primary-read pilot', 'PostgreSQL primary-read pilot')) + '</small><strong>' + esc([
    String(runtimeMode.mode || 'JSON_ONLY'),
    t('Fallback gần đây', 'Recent fallbacks') + ': ' + String(((snapshot.kpis || {}).primary_read_fallbacks || 0))
  ].join(' · ')) + '</strong><span class="mesx-sub">' + esc(t('Theo dõi read model nào đang đọc PostgreSQL sạch và read model nào đang phải quay về JSON để không đẩy rủi ro lên dashboard điều hành.', 'Track which read models are using PostgreSQL cleanly and which ones still need to fall back to JSON before the risk reaches the operating dashboard.')) + '</span></div>' +
  buckets.map(function(key){
    var bucket = primaryReadStatus[key] || {};
    return '<div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(key) + '</small><strong>' + esc(String(bucket.last_source || 'never')) + '</strong><span class="mesx-sub">' + esc([
      bucket.postgres_count != null ? ('PG ' + bucket.postgres_count) : '',
      bucket.json_count != null ? ('JSON ' + bucket.json_count) : '',
      bucket.fallback_count != null ? ('Fallback ' + bucket.fallback_count) : '',
      bucket.last_mode || ''
    ].filter(Boolean).join(' · ')) + '</span></div>';
  }).join('');
  return overview + renderGovernanceQueue(rows, {
    emptyTitle: t('Shadow sync đang ổn định', 'Shadow sync is healthy'),
    emptyText: t('Chưa có lỗi mirror JSON -> PostgreSQL nào đang mở.', 'There is no active JSON -> PostgreSQL mirror failure.'),
    detail: function(row){
      return [row.store_key || '', row.message || ''].filter(Boolean).join(' · ');
    },
    sub: function(row){
      return [row.last_error_at ? fmtDateTime(row.last_error_at) : '', row.failure_count != null ? ('Fail ' + row.failure_count) : ''].filter(Boolean).join(' · ');
    },
    fallbackVi: 'Shadow sync cần được khôi phục để analytics và audit không lệch khỏi runtime.',
    fallbackEn: 'Shadow sync must be recovered so analytics and audit stay aligned with runtime.'
  }) + '<div class="mesx-section">' + primaryOverview + renderGovernanceQueue(primaryReadQueue, {
    emptyTitle: t('Primary read đang ổn định', 'Primary reads are healthy'),
    emptyText: t('Các read model pilot đang đọc PostgreSQL sạch hoặc đang ở chế độ JSON chủ động.', 'Pilot read models are either reading PostgreSQL cleanly or intentionally staying on JSON mode.'),
    detail: function(row){
      return [row.store_key || '', row.source || '', row.runtime_mode || ''].filter(Boolean).join(' · ');
    },
    sub: function(row){
      return [row.read_at ? fmtDateTime(row.read_at) : '', row.error || ''].filter(Boolean).join(' · ');
    },
    fallbackVi: 'Read model vừa phải fallback về JSON thay vì dùng PostgreSQL mirror.',
    fallbackEn: 'The read model just fell back to JSON instead of using the PostgreSQL mirror.'
  }) + '</div><div class="mesx-section">' + renderCutoverAudit(cutoverAudit) + '</div>';
}

function renderLaunchBlockerQueue(rows){
  return renderGovernanceQueue(rows, {
    emptyTitle: t('Chưa có WO nào bị chặn mở chạy', 'No recent WO launch blockers'),
    emptyText: t('Các chuyển trạng thái gần đây đang vượt qua đủ điều kiện MES trước khi mở setup hoặc running.', 'Recent WO transitions are passing the MES launch gates before entering setup or running.'),
    detail: function(row){
      return [row.wo_number || '', row.target_status || '', Array.isArray(row.issue_codes) && row.issue_codes.length ? row.issue_codes.join(', ') : ''].filter(Boolean).join(' · ');
    },
    sub: function(row){
      return [row.blocked_at ? fmtDateTime(row.blocked_at) : '', row.count != null ? ('Blocked ' + row.count + 'x') : ''].filter(Boolean).join(' · ');
    },
    fallbackVi: 'WO vừa bị chặn bởi release, tooling, connector, trace hoặc các điều kiện MES bắt buộc.',
    fallbackEn: 'The WO was recently blocked by release, tooling, connector, trace, or other mandatory MES launch conditions.'
  });
}

function render(){
  if(!state.container) return;
  if(state.loading && !state.snapshot){
    state.container.innerHTML = '<div class="mesx"><div class="mesx-empty"><strong>' + esc(t('Đang tải trung tâm điều hành MES...', 'Loading the MES control center...')) + '</strong>' + esc(t('Vui lòng đợi trong giây lát.', 'Please wait a moment.')) + '</div></div>';
    return;
  }

  var snapshot = state.snapshot || defaultSnapshot();
  var rows = filteredDispatch();
  var centers = workCenters();
  var machineWall = Array.isArray(snapshot.machine_wall) ? snapshot.machine_wall : [];
  var connectors = Array.isArray(snapshot.connector_summary) ? snapshot.connector_summary : [];
  var batchPollReady = connectors.some(function(row){
    return String(row && row.connector_type || '').toLowerCase() === 'mtconnect';
  });
  var oeeTimeline = Array.isArray(snapshot.oee_timeline) ? snapshot.oee_timeline : [];
  var downtimePareto = Array.isArray(snapshot.downtime_pareto) ? snapshot.downtime_pareto : [];
  var programHandshake = Array.isArray(snapshot.program_handshake_queue) ? snapshot.program_handshake_queue : [];
  var programReleaseQueue = Array.isArray(snapshot.program_release_queue) ? snapshot.program_release_queue : [];
  var toolReadinessQueue = Array.isArray(snapshot.tool_readiness_queue) ? snapshot.tool_readiness_queue : [];
  var alarmAckQueue = Array.isArray(snapshot.alarm_ack_queue) ? snapshot.alarm_ack_queue : [];
  var operatorQualificationQueue = Array.isArray(snapshot.operator_qualification_queue) ? snapshot.operator_qualification_queue : [];
  var materialTraceQueue = Array.isArray(snapshot.material_trace_queue) ? snapshot.material_trace_queue : [];
  var materialGenealogyQueue = Array.isArray(snapshot.material_genealogy_queue) ? snapshot.material_genealogy_queue : [];
  var shiftHandoverQueue = Array.isArray(snapshot.shift_handover_queue) ? snapshot.shift_handover_queue : [];
  var connectorGuardQueue = Array.isArray(snapshot.connector_guard_queue) ? snapshot.connector_guard_queue : [];
  var launchBlockerQueue = Array.isArray(snapshot.launch_blocker_queue) ? snapshot.launch_blocker_queue : [];
  var primaryReadQueue = Array.isArray(snapshot.primary_read_queue) ? snapshot.primary_read_queue : [];
  var epicorSync = snapshot.epicor_sync || {};
  var epicorSyncQueue = Array.isArray(snapshot.epicor_sync_queue) ? snapshot.epicor_sync_queue : [];
  var shadowSyncFailures = Array.isArray(snapshot.shadow_sync_failures) ? snapshot.shadow_sync_failures : [];
  var shadowStatus = snapshot.shadow_status || {};
  var connectorIngestStatus = snapshot.connector_ingest_status || {};
  var currentShift = snapshot.current_shift || {};
  var kpi = snapshot.kpis || {};
  var streamFact = state.streamStatus === 'live'
    ? (t('SSE trực tiếp', 'SSE live') + (state.streamLastMessageAt ? (' · ' + fmtDateTime(state.streamLastMessageAt)) : ''))
    : (state.streamStatus === 'connecting'
      ? t('Đang nối luồng', 'Connecting stream')
      : (streamEligible((snapshot.runtime_mode || {}))
        ? t('Polling dự phòng 60 giây', '60-second fallback polling')
        : t('JSON polling 30 giây', '30-second JSON polling')));
  var readinessBand = '';
  var analyticsBand =
    '<section class="mesx-band" style="margin-top:18px">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Xung OEE và pareto downtime', 'OEE pulse and downtime pareto')) + '</h2><p>' + esc(t('Đọc nhanh máy nào đang kéo OEE xuống và loại downtime nào đang nuốt nhiều phút mất nhất để ra phản ứng đúng thứ tự.', 'See which machines are pulling OEE down and which downtime category is consuming the most lost minutes so action follows the right order.')) + '</p></div></div><div class="mesx-analytics"><div class="mesx-section" style="margin-top:0;padding-top:0;border-top:none"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('OEE theo máy', 'Machine OEE pulse')) + '</small><strong>' + esc(t('Ưu tiên dải đỏ trước, sau đó xử lý nút thắt availability / performance / quality.', 'Work the red band first, then the dominant availability / performance / quality loss.')) + '</strong></div>' + renderOeeTimeline(oeeTimeline) + '</div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Pareto downtime', 'Downtime pareto')) + '</small><strong>' + esc(t('Nhìn loại tổn thất lớn nhất trước khi đổ nguồn lực xử lý rải rác.', 'Look at the dominant loss mode before spreading recovery effort across too many categories.')) + '</strong></div>' + renderDowntimePareto(downtimePareto) + '</div></div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('NC handshake queue', 'NC handshake queue')) + '</h2><p>' + esc(t('So khớp chương trình máy đang báo về với WO phát hành để chặn chạy nhầm revision hoặc thiếu handshake trước khi tiếp tục cắt.', 'Match the machine-reported program against the released WO to stop wrong revisions or missing handshakes before the cut continues.')) + '</p></div></div>' + renderProgramHandshakeQueue(programHandshake) + '</article>' +
    '</section>';
  var governanceBand =
    '<section class="mesx-band" style="margin-top:18px">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('NC program release governance', 'NC program release governance')) + '</h2><p>' + esc(t('Khóa các WO chưa có release NC đúng part, revision, operation hoặc machine context trước khi cho phép pre-run và release chạy máy.', 'Block WO that do not yet have the correct governed NC release for the part, revision, operation, and machine context before allowing pre-run and machine release.')) + '</p></div></div><div class="mesx-list">' + renderProgramReleaseQueue(programReleaseQueue) + '</div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Tool readiness governance', 'Tool readiness governance')) + '</h2><p>' + esc(t('Nhìn ngay WO nào đang bị chặn bởi tool-life, offset, hoặc runtime tooling chưa đủ để trưởng ca xử lý trước khi mở cắt.', 'See immediately which WO are blocked by tool-life, offset drift, or incomplete tooling runtime so the shift leader can resolve them before cutting starts.')) + '</p></div></div><div class="mesx-list">' + renderToolReadinessQueue(toolReadinessQueue) + '</div></article>' +
    '</section>';

  var alarmAndShiftBand =
    '<section class="mesx-band" style="margin-top:18px">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Alarm governance', 'Alarm governance')) + '</h2><p>' + esc(t('Theo dõi các alarm còn chờ acknowledge, escalation hoặc clear theo đúng SLA playbook trước khi tiếp tục chạy máy.', 'Track alarms that still need acknowledgement, escalation, or governed clearing before machine execution continues.')) + '</p></div></div><div class="mesx-list">' + renderGovernanceQueue(alarmAckQueue, { emptyTitle:t('Alarm đang được kiểm soát', 'Alarm acknowledgement is clear'), emptyText:t('Chưa có alarm nào đang trễ acknowledge hoặc escalation theo playbook.', 'There are no alarms currently overdue for acknowledgement or escalation.'), detail:function(row){ return [row.machine_id || '', row.alarm_code || '', row.alarm_text || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.wo_number || '', row.ack_due_at ? ('ACK ' + fmtDateTime(row.ack_due_at)) : '', row.escalation_due_at ? ('ESC ' + fmtDateTime(row.escalation_due_at)) : '', row.playbook_id || ''].filter(Boolean).join(' · '); }, actions:function(row){ var context = esc(jsonAttr(row)); var buttons = []; if(row.ack_required && String(row.ack_status || '').toLowerCase() !== 'acknowledged'){ buttons.push('<button type="button" class="mesx-link" data-alarm-action="ack" data-alarm-context="' + context + '">' + esc(t('Xác nhận', 'Acknowledge')) + '</button>'); } if(row.escalation_due_at && String(row.escalation_status || '').toLowerCase() !== 'escalated'){ buttons.push('<button type="button" class="mesx-link warning" data-alarm-action="escalate" data-alarm-context="' + context + '">' + esc(t('Escalate', 'Escalate')) + '</button>'); } buttons.push('<button type="button" class="mesx-link danger" data-alarm-action="clear" data-alarm-context="' + context + '">' + esc(t('Clear', 'Clear')) + '</button>'); return buttons.join(''); }, fallbackVi:'Alarm đang chờ acknowledge, escalation hoặc clear theo playbook.', fallbackEn:'The alarm still requires acknowledgement, escalation, or governed clearing.' }) + '</div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Bàn giao ca và genealogy', 'Shift handover and genealogy')) + '</h2><p>' + esc(t('Khóa khoảng trống giữa các ca và giữa vật tư với thành phẩm để truy xuất không bị đứt mạch khi WO chuyển người hoặc chuyển lô.', 'Close the gaps between shifts and between material issue and finished genealogy so traceability stays intact when WO change operators or batches.')) + '</p></div></div><div class="mesx-list">' + renderGovernanceQueue(shiftHandoverQueue, { emptyTitle:t('Bàn giao ca đang ổn', 'Shift handover is current'), emptyText:t('Máy đang chạy đã có bàn giao ca hợp lệ và được xác nhận trong khung thời gian quy định.', 'Running machines already have valid, timely shift handovers.'), detail:function(row){ return [row.machine_id || '', row.current_shift ? ('Ca ' + row.current_shift) : '', row.wo_number || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.operator_from || '', row.operator_to || '', row.acknowledged_at ? ('ACK ' + fmtDateTime(row.acknowledged_at)) : '', Array.isArray(row.issue_codes) && row.issue_codes.length ? ('Issues: ' + row.issue_codes.join(', ')) : ''].filter(Boolean).join(' · '); }, actions:function(row){ return '<button type="button" class="mesx-link" data-shift-handover="' + esc(jsonAttr(row)) + '">' + esc(t('Bàn giao ca', 'Shift handover')) + '</button>'; }, fallbackVi:'Máy chưa có bàn giao ca hợp lệ hoặc chưa được xác nhận đúng hạn.', fallbackEn:'The machine does not yet have a valid or timely acknowledged shift handover.' }) + '</div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Genealogy queue', 'Genealogy queue')) + '</small><strong>' + esc(t('Các WO đã issue vật liệu nhưng chưa khép genealogy hoặc đang lệch lot / heat sẽ hiện ở đây.', 'WO with open material issue / genealogy gaps or lot / heat mismatches appear here.')) + '</strong></div>' + renderGovernanceQueue(materialGenealogyQueue, { emptyTitle:t('Genealogy vật liệu đang kín', 'Material genealogy is closed'), emptyText:t('Các WO đang theo dõi đã khép issue vật liệu và genealogy thành phẩm theo yêu cầu.', 'Tracked WO already have closed material issue and part genealogy records.'), detail:function(row){ return [row.customer_name || '', row.part_number || '', row.part_revision || '', row.machine_id || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.issued_qty != null ? ('Issued ' + row.issued_qty) : '', row.consumption_count != null ? ('Issue ' + row.consumption_count) : '', row.genealogy_count != null ? ('GEN ' + row.genealogy_count) : '', Array.isArray(row.issue_codes) && row.issue_codes.length ? ('Issues: ' + row.issue_codes.join(', ')) : ''].filter(Boolean).join(' · '); }, actions:function(row){ var context = esc(jsonAttr(row)); return '<button type="button" class="mesx-link" data-material-issue="' + context + '">' + esc(t('Issue vật liệu', 'Material issue')) + '</button><button type="button" class="mesx-link warning" data-genealogy-snapshot="' + context + '">' + esc(t('Chốt genealogy', 'Capture genealogy')) + '</button>'; }, fallbackVi:'WO chưa khép genealogy vật liệu / thành phẩm theo chuẩn MES.', fallbackEn:'The WO has not yet closed material or finished-part genealogy to the MES standard.' }) + '</div></article>' +
    '</section>';

  var integrationBand =
    '<section class="mesx-band" style="margin-top:18px">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Epicor integration health', 'Epicor integration health')) + '</h2><p>' + esc(t('Giám sát nhịp đồng bộ, đối soát và outbox giữa MES với Epicor để loại bỏ nhập liệu đôi và phát hiện trôi dữ liệu càng sớm càng tốt.', 'Monitor synchronization, reconciliation, and outbox health between MES and Epicor to eliminate double entry and catch data drift early.')) + '</p></div></div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Đồng bộ ERP', 'ERP synchronization')) + '</small><strong>' + esc(((epicorSync.kpis || {}).domains_degraded || 0) + ' ' + t('miền dữ liệu đang xuống cấp', 'degraded domains')) + '</strong><span class="mesx-sub">' + esc(t('Hàng chờ này gom timeout, reconciliation gap và outbound queue chưa đi hết để trưởng ca và IT nhìn cùng một nguồn truth.', 'This queue combines timeouts, reconciliation gaps, and outbound backlog so supervisors and IT watch the same source of truth.')) + '</span></div>' + renderGovernanceQueue(epicorSyncQueue, { emptyTitle:t('Epicor sync đang ổn định', 'Epicor synchronization is stable'), emptyText:t('Không có sync gap, đối soát mở hoặc outbox tồn đáng chú ý ở thời điểm hiện tại.', 'There are no notable sync gaps, open reconciliation items, or outbox backlog right now.'), detail:function(row){ return [row.sync_domain || '', row.status || '', row.owner_role || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.direction || '', row.updated_at ? fmtDateTime(row.updated_at) : '', row.message_vi || row.message_en || '', row.difference_summary || ''].filter(Boolean).join(' · '); }, fallbackVi:'Đồng bộ Epicor đang có queue cần xử lý.', fallbackEn:'Epicor synchronization currently has governed queue items to resolve.' }) + '</div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Checkpoint và outbox', 'Checkpoint and outbox')) + '</h2><p>' + esc(t('Nhìn nhanh domain nào còn chậm, checkpoint nào cũ, và outbound transaction nào còn pending / retry để quyết định bơm lại hay giữ WO.', 'See which domains are slow, which checkpoints are aging, and which outbound transactions are still pending or retrying so you can decide whether to resend or hold the WO.')) + '</p></div></div><div class="mesx-list">' +
        ((Array.isArray(epicorSync.domains) && epicorSync.domains.length) ? epicorSync.domains.map(function(domain){
          var severity = String(domain.health || '').toLowerCase();
          var meta = governanceMeta(severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'ready'));
          return '<div class="mesx-list-item"><div class="mesx-inline-head"><h4>' + esc((domain.label_vi || domain.label_en || domain.domain || 'Domain')) + '</h4>' + badge(meta) + '</div><p>' + esc([domain.direction || '', domain.last_success_at ? ('OK ' + fmtDateTime(domain.last_success_at)) : '', domain.last_run_at ? ('Run ' + fmtDateTime(domain.last_run_at)) : '', domain.pending_reconciliation != null ? ('REC ' + domain.pending_reconciliation) : '', domain.outbox_pending != null ? ('OUT ' + domain.outbox_pending) : ''].filter(Boolean).join(' · ')) + '</p></div>';
        }).join('') : '<div class="mesx-empty"><strong>' + esc(t('Chưa có domain sync', 'No sync domains yet')) + '</strong>' + esc(t('Hãy seed hoặc ghi nhận ít nhất một sync run của Epicor.', 'Seed or record at least one Epicor sync run first.')) + '</div>') +
      '</div></article>' +
    '</section>';

  readinessBand =
    '<section class="mesx-band" style="margin-top:18px">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Nhân lực và truy xuất vật liệu', 'Operator and material governance')) + '</h2><p>' + esc(t('Khóa các WO đang thiếu năng lực vận hành hoặc chưa đủ dữ liệu lot / heat / traveler trước khi tiếp tục sản xuất.', 'Block WO that still have operator qualification gaps or incomplete lot / heat / traveler data before production continues.')) + '</p></div></div><div class="mesx-list">' + renderGovernanceQueue(operatorQualificationQueue, { emptyTitle:t('Nhân lực vận hành đang đạt chuẩn', 'Operator qualification is clear'), emptyText:t('Chưa có WO nào bị chặn bởi năng lực, machine match hoặc hiệu lực chứng nhận.', 'No WO is currently blocked by qualification, machine match, or certification validity.'), detail:function(row){ return [row.operator_id || '', row.operator_name || '', row.customer_name || '', row.part_number || '', row.part_revision || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.qualification_expiry ? ('Hết hạn ' + fmtDate(row.qualification_expiry)) : '', Array.isArray(row.issue_codes) && row.issue_codes.length ? ('Issues: ' + row.issue_codes.join(', ')) : '', Array.isArray(row.warning_codes) && row.warning_codes.length ? ('Warnings: ' + row.warning_codes.join(', ')) : ''].filter(Boolean).join(' · '); }, fallbackVi:'Người vận hành chưa đủ điều kiện hoặc không khớp machine / work center cho WO này.', fallbackEn:'The operator is not fully qualified or does not match the machine / work center for this WO.' }) + '</div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Traceability queue', 'Traceability queue')) + '</small><strong>' + esc(t('Các WO còn thiếu dữ liệu lot, heat hoặc traveler sẽ hiện ở đây.', 'WO missing lot, heat, or traveler data appear here.')) + '</strong></div>' + renderGovernanceQueue(materialTraceQueue, { emptyTitle:t('Trace vật liệu đang đủ', 'Material trace is complete'), emptyText:t('Các WO đang theo dõi hiện đã có lot, traveler và trạng thái chứng chỉ cần thiết.', 'Tracked WO already have the required lot, traveler, and certificate status.'), detail:function(row){ return [row.customer_name || '', row.part_number || '', row.part_revision || '', row.machine_id || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.material_lot_number || '', row.heat_number || '', row.traveler_number || '', Array.isArray(row.missing_fields) && row.missing_fields.length ? ('Missing: ' + row.missing_fields.join(', ')) : ''].filter(Boolean).join(' · '); }, fallbackVi:'WO chưa đủ dữ liệu lot, heat hoặc traveler để khóa trace vật liệu.', fallbackEn:'The WO does not yet have enough lot, heat, or traveler data for governed material trace.' }) + '</div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Kết nối máy và shadow observability', 'Connector and shadow observability')) + '</h2><p>' + esc(t('Theo dõi các WO bị chặn bởi connector policy, shadow sync và primary-read pilot để dữ liệu runtime không lệch khỏi PostgreSQL.', 'Track WO blocked by connector policy, shadow sync, and the primary-read pilot so runtime data does not drift away from PostgreSQL.')) + '</p></div></div><div class="mesx-list">' + renderGovernanceQueue(connectorGuardQueue, { emptyTitle:t('Kết nối máy đang đạt điều kiện', 'Connector governance is clear'), emptyText:t('Không có WO nào đang bị chặn bởi heartbeat, telemetry mode hoặc connector policy.', 'No WO is currently blocked by heartbeat, telemetry mode, or connector policy.'), detail:function(row){ return [row.customer_name || '', row.part_number || '', row.part_revision || '', row.machine_id || ''].filter(Boolean).join(' · '); }, sub:function(row){ return [row.connector_type || '', row.connector_health || '', row.telemetry_mode || '', row.signal_freshness_seconds == null ? '' : ('Freshness ' + row.signal_freshness_seconds + 's')].filter(Boolean).join(' · '); }, fallbackVi:'Heartbeat hoặc connector mode hiện tại chưa đáp ứng điều kiện mở WO.', fallbackEn:'The current heartbeat or connector mode does not satisfy WO launch conditions.' }) + '</div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('WO launch blockers', 'WO launch blockers')) + '</small><strong>' + esc((kpi.launch_blocker_hotspots || 0) + ' ' + t('sự kiện chặn gần đây', 'recent block events')) + '</strong><span class="mesx-sub">' + esc(t('Lưu vết các lần WO bị chặn để điều độ nhìn đúng điểm nghẽn lặp lại thay vì chỉ thấy trạng thái cuối.', 'Capture every blocked WO launch so dispatch can see recurring bottlenecks instead of only the final status.')) + '</span></div>' + renderLaunchBlockerQueue(launchBlockerQueue) + '</div><div class="mesx-section"><div class="mesx-mini" style="margin-bottom:10px"><small>' + esc(t('Shadow sync health', 'Shadow sync health')) + '</small><strong>' + esc(((shadowStatus.master_data && shadowStatus.master_data.last_status) || 'never') + ' · ' + (((connectorIngestStatus.totals || {}).success || 0) + ' ok / ' + (((connectorIngestStatus.totals || {}).failure || 0) + ' fail') + ' · ' + (primaryReadQueue.length + ' ' + t('fallback', 'fallbacks')))) + '</strong><span class="mesx-sub">' + esc(t('Nguồn truth vẫn là runtime JSON, nhưng mirror sang PostgreSQL và pilot primary read phải luôn được theo dõi chặt để sẵn sàng chuyển đọc sang DB.', 'JSON runtime is still the source of truth, but the PostgreSQL mirror and primary-read pilot must be watched closely before promoting DB reads.')) + '</span></div>' + renderShadowSyncQueue(shadowSyncFailures) + '</div></article>' +
    '</section>';

  state.container.innerHTML = '<div class="mesx">' +
    '<section class="mesx-hero">' +
      '<article class="mesx-poster">' +
        '<div class="mesx-brand"><div class="mesx-brand-main"><div class="mesx-logo"><img src="./assets/hesem-logo.svg" alt="HESEM"></div><div><div class="mesx-kicker">HESEM CNC MOM / MES</div><h1>' + esc(t('Trung tâm điều hành MES', 'MES Control Center')) + '</h1><p>' + esc(t('Một màn hình duy nhất để điều độ WO, đọc trạng thái máy, khóa gate chứng cứ, bắt cảnh báo tool-life và ra quyết định khôi phục xưởng nhanh theo ngữ cảnh thật.', 'One production surface to dispatch WO, read machine status, enforce evidence gates, catch tool-life alerts, and drive recovery decisions in real shop-floor context.')) + '</p><div class="mesx-facts"><span class="mesx-fact">⏱ ' + esc(currentStamp()) + '</span><span class="mesx-fact">📡 ' + esc(streamFact) + '</span><span class="mesx-fact">🕒 ' + esc((currentShift.shift_code || '—') + ' · ' + (currentShift.shift_name_vi || currentShift.shift_name_en || t('Chưa xác định ca', 'Unresolved shift'))) + '</span><span class="mesx-fact">📦 ' + esc((kpi.wo_active || 0) + ' ' + t('WO đang hoạt động', 'active WO')) + '</span><span class="mesx-fact">🏭 ' + esc((kpi.machines_total || 0) + ' ' + t('tài sản theo dõi', 'assets tracked')) + '</span><span class="mesx-fact">🔌 ' + esc((kpi.connectors_healthy || 0) + '/' + (kpi.connectors_total || 0) + ' ' + t('kết nối ổn', 'healthy links')) + '</span><span class="mesx-fact">📊 OEE ' + esc(fmtPercent(kpi.oee_pct)) + '</span></div></div></div><div>' + badge((kpi.machines_down || 0) > 0 ? statusMeta('down') : statusMeta('running')) + '</div></div>' +
        '<div class="mesx-actions"><button type="button" class="mesx-btn primary" id="mes-refresh">⟳ ' + esc(t('Làm mới runtime', 'Refresh runtime')) + '</button><button type="button" class="mesx-btn secondary" id="mes-poll-batch"' + (batchPollReady ? '' : ' disabled') + '>📡 ' + esc(t('Poll MTConnect batch', 'Poll MTConnect batch')) + '</button><button type="button" class="mesx-btn secondary" id="mes-open-orders">📦 ' + esc(t('Quản lý đơn hàng', 'Order management')) + '</button><button type="button" class="mesx-btn secondary" id="mes-open-master">🧭 ' + esc(t('Dữ liệu nền', 'Master data')) + '</button><button type="button" class="mesx-btn secondary" id="mes-open-forms">📋 ' + esc(t('Kiểm soát chứng cứ', 'Evidence control')) + '</button></div>' +
      '</article>' +
      '<aside class="mesx-side">' +
        '<article class="mesx-card mesx-clock"><div class="mesx-clock-top"><div><div class="mesx-kicker">' + esc(t('Snapshot runtime', 'Runtime snapshot')) + '</div><strong>' + esc(currentStamp()) + '</strong><small>' + esc(t('Nguồn dữ liệu: Order Management + Master Data + MES runtime + Exception dashboard.', 'Data source: Order Management + Master Data + MES runtime + Exception dashboard.')) + '</small></div>' + badge(statusMeta('approved')) + '</div></article>' +
        '<article class="mesx-card"><div class="mesx-kpi-grid">' +
          renderKpiTile(t('Máy đang chạy', 'Machines running'), kpi.machines_running || 0, t('Bao gồm chạy, setup và inspection', 'Running, setup, and inspection')) +
          renderKpiTile(t('Máy dừng', 'Machines down'), kpi.machines_down || 0, t('Downtime chưa khôi phục', 'Unresolved downtime')) +
          renderKpiTile(t('Kết nối khỏe', 'Healthy connectors'), kpi.connectors_healthy || 0, t('Heartbeat còn tươi hoặc chỉ trễ nhẹ', 'Fresh heartbeat or only slightly delayed')) +
          renderKpiTile(t('Kết nối rủi ro', 'Connector risk'), kpi.connectors_stale || 0, t('Stale hoặc offline cần xử lý ngay', 'Stale or offline, needs action')) +
          renderKpiTile(t('Tooling cảnh báo', 'Tooling alerts'), kpi.tooling_alerts || 0, t('Tool gần tới hạn hoặc lệch offset', 'Tool near limit or offset risk')) +
          renderKpiTile(t('WO bị chặn', 'WO launch blockers'), kpi.launch_blocker_hotspots || 0, t('Các lần MES chặn setup / running vì chưa đạt điều kiện bắt buộc', 'Recent MES blocks that prevented setup / running because mandatory launch conditions were not met')) +
          renderKpiTile(t('WO thiếu gate', 'WO missing gates'), kpi.wo_gate_missing || 0, t('Cần bổ sung chứng cứ bắt buộc', 'Evidence gate completion required')) +
          renderKpiTile(t('Lệch chương trình NC', 'Program mismatches'), kpi.program_mismatches || 0, t('Máy đang báo sai hoặc thiếu chương trình so với WO', 'Machine-reported program is missing or mismatched against the WO')) +
          renderKpiTile(t('Rủi ro release NC', 'NC release risk'), kpi.program_release_risk || 0, t('WO chưa có release NC hợp lệ để mở cắt', 'WO still missing a valid governed NC release')) +
          renderKpiTile(t('Rủi ro tooling', 'Tool readiness risk'), kpi.tool_readiness_risk || 0, t('WO bị chặn bởi tool-life, offset hoặc runtime tooling chưa đủ', 'WO blocked by tool-life, offset drift, or incomplete tooling runtime')) +
          renderKpiTile(t('Alarm chờ ACK', 'Alarm acknowledgement gaps'), kpi.alarm_ack_gaps || 0, t('Alarm còn chờ acknowledge hoặc escalation theo SLA playbook', 'Alarms still pending acknowledgement or escalation within the playbook SLA')) +
          renderKpiTile(t('Thiếu năng lực', 'Qualification gaps'), kpi.operator_qualification_gaps || 0, t('Người vận hành chưa đủ điều kiện theo machine, work center hoặc chứng nhận', 'Operators missing machine, work-center, or certification coverage')) +
          renderKpiTile(t('Thiếu trace vật liệu', 'Material trace gaps'), kpi.material_trace_gaps || 0, t('WO còn thiếu lot, heat, traveler hoặc chứng chỉ vật liệu bắt buộc', 'WO still missing lot, heat, traveler, or required material certificates')) +
          renderKpiTile(t('Genealogy chưa kín', 'Material genealogy gaps'), kpi.material_genealogy_gaps || 0, t('WO đã issue vật liệu nhưng genealogy thành phẩm hoặc lot/heat verification chưa khép kín', 'WO already issued material but finished-part genealogy or lot/heat verification is still open')) +
          renderKpiTile(t('Bàn giao ca thiếu', 'Shift handover gaps'), kpi.shift_handover_gaps || 0, t('Máy hoặc WO đang chạy nhưng chưa có bàn giao ca hợp lệ hoặc chưa được xác nhận đúng hạn', 'Running machines or WO still need valid, timely shift handover acknowledgement')) +
          renderKpiTile(t('Rủi ro connector', 'Connector governance gaps'), kpi.connector_guard_gaps || 0, t('Connector policy, heartbeat hoặc telemetry mode chưa đủ điều kiện mở WO', 'Connector policy, heartbeat, or telemetry mode still blocks WO launch')) +
          renderKpiTile(t('Lỗi shadow sync', 'Shadow sync failures'), kpi.shadow_sync_failures || 0, t('JSON runtime chưa mirror sạch sang PostgreSQL shadow layer', 'JSON runtime is not mirroring cleanly into the PostgreSQL shadow layer')) +
          renderKpiTile(t('Primary read fallback', 'Primary-read fallbacks'), kpi.primary_read_fallbacks || 0, t('Read model pilot vừa phải quay về JSON thay vì đọc PostgreSQL', 'The read-model pilot recently had to fall back to JSON instead of reading PostgreSQL')) +
          renderKpiTile(t('Drift JSON↔PG', 'JSON↔PG drift'), kpi.cutover_drift_entities || 0, t('Số entity group còn lệch giữa runtime JSON và PostgreSQL shadow', 'Entity groups that still drift between JSON runtime and the PostgreSQL shadow')) +
          renderKpiTile(t('Epicor sync gaps', 'Epicor sync gaps'), kpi.epicor_sync_status || 0, t('Sync, reconciliation hoặc outbox giữa MES và Epicor đang cần xử lý', 'Synchronization, reconciliation, or outbox between MES and Epicor needs attention')) +
          renderKpiTile(t('Đối soát mở', 'Open reconciliation'), kpi.epicor_reconciliation_open || 0, t('Các lệch nhịp MES ↔ Epicor chưa được chốt', 'MES ↔ Epicor reconciliation gaps still open')) +
          renderKpiTile(t('Outbox chờ', 'Pending outbox'), kpi.epicor_outbox_pending || 0, t('Giao dịch chờ đẩy sang Epicor hoặc đang retry', 'Transactions waiting to be sent to Epicor or retrying')) +
          renderKpiTile(t('Cầu nối tay', 'Manual bridges'), kpi.manual_bridges || 0, t('Máy đang cập nhật bằng manual bridge', 'Machines currently updated through the manual bridge')) +
          renderKpiTile('Availability', fmtPercent(kpi.availability_pct), t('Thời gian sẵn sàng của máy', 'Machine readiness time')) +
          renderKpiTile('Performance', fmtPercent(kpi.performance_pct), t('So với takt / runtime kế hoạch', 'Against planned runtime')) +
          renderKpiTile('Quality', fmtPercent(kpi.quality_pct), t('Tỷ lệ chi tiết đạt', 'Good-part ratio')) +
          renderKpiTile('OEE', fmtPercent(kpi.oee_pct), t('Trung bình toàn bộ machine wall', 'Average across machine wall')) +
        '</div></article>' +
      '</aside>' +
    '</section>' +
    '<section class="mesx-band">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Work center radar', 'Work center radar')) + '</h2><p>' + esc(t('Nhìn một hàng là biết cell nào đang nghẽn vì máy dừng, OEE thấp, thiếu gate hay tooling warning.', 'See at a glance which cell is blocked by downtime, low OEE, missing gates, or tooling warnings.')) + '</p></div></div><div class="mesx-center-grid">' + (centers.length ? centers.map(renderWorkCenterCard).join('') : '<div class="mesx-empty"><strong>' + esc(t('Chưa có work center', 'No work centers yet')) + '</strong>' + esc(t('Kiểm tra master data hoặc seed runtime.', 'Check the master data or runtime seed.')) + '</div>') + '</div></article>' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Ngoại lệ cần xử lý', 'Exceptions to handle')) + '</h2><p>' + esc(t('Nhóm các ngoại lệ ảnh hưởng trực tiếp đến truy xuất, giao hàng, upload và evidence readiness.', 'Grouped exceptions that directly affect traceability, delivery, uploads, and evidence readiness.')) + '</p></div></div>' + renderExceptionRail() + '</article>' +
    '</section>' +
    '<section class="mesx-band" style="margin-top:18px"><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Giám sát kết nối máy', 'Machine connectivity overview')) + '</h2><p>' + esc(t('Theo dõi từng máy đang lấy trạng thái từ MTConnect, OPC UA hay cầu nối nhập tay; nhịp heartbeat nào stale sẽ nổi lên trước để không bị mù dữ liệu shop-floor.', 'Track whether each machine is reading state from MTConnect, OPC UA, or a manual bridge; stale heartbeats rise to the top so the shop floor never goes blind.')) + '</p></div></div><div class="mesx-connector-grid">' + (connectors.length ? connectors.map(renderConnectorCard).join('') : '<div class="mesx-empty"><strong>' + esc(t('Chưa có connector runtime', 'No connector runtime yet')) + '</strong>' + esc(t('Hãy bơm tín hiệu pilot hoặc khai báo metadata kết nối cho máy.', 'Seed a pilot signal or declare connector metadata for the machine first.')) + '</div>') + '</div></article><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Điểm rơi vận hành', 'Runtime guidance')) + '</h2><p>' + esc(t('Luôn ưu tiên xử lý theo thứ tự: stale connector -> downtime -> gate chứng cứ -> tooling alert. Điều này giúp OEE và traceability không lệch nhau.', 'Always triage in this order: stale connector -> downtime -> evidence gate -> tooling alert. This keeps OEE and traceability aligned.')) + '</p></div></div><div class="mesx-list"><div class="mesx-list-item"><h4>' + esc(t('Heartbeat stale là blocker ẩn', 'Stale heartbeat is a hidden blocker')) + '</h4><p>' + esc(t('Nếu máy vẫn chạy nhưng connector stale, OEE và dispatch có thể đẹp giả. Hãy cập nhật tín hiệu hoặc khôi phục adapter trước khi tin vào số liệu.', 'If the machine keeps running while the connector is stale, OEE and dispatch can look falsely healthy. Update the signal or restore the adapter before trusting the numbers.')) + '</p></div><div class="mesx-list-item"><h4>' + esc(t('Cầu nối tay là chế độ chuyển tiếp', 'Manual bridge is a transition mode')) + '</h4><p>' + esc(t('Dùng manual bridge cho CMM hoặc pilot machine là hợp lý, nhưng phải nhìn rõ máy nào còn đang phụ thuộc nhập tay để ưu tiên tự động hóa tiếp.', 'Using the manual bridge for a CMM or a pilot machine is acceptable, but operators must clearly see which assets still depend on manual input so automation can be prioritized next.')) + '</p></div></div></article></section>' +
    analyticsBand +
    governanceBand +
    alarmAndShiftBand +
    integrationBand +
    readinessBand +
    '<section class="mesx-main">' +
      '<article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Dispatch board theo Work Order', 'Work Order dispatch board')) + '</h2><p>' + esc(t('Lọc theo work center và trạng thái, sau đó báo tiến độ hoặc mở đúng form chứng cứ mà không phải nhập tay context.', 'Filter by work center and status, then report progress or launch the correct evidence form without typing context by hand.')) + '</p></div></div><div class="mesx-toolbar"><input class="mesx-input search" id="mes-search" type="search" value="' + esc(state.search) + '" placeholder="' + esc(t('Tìm WO / Part / máy / khách hàng...', 'Search WO / part / machine / customer...')) + '"><select class="mesx-select" id="mes-filter-center"><option value="">' + esc(t('Tất cả work center', 'All work centers')) + '</option>' + centers.map(function(center){ return '<option value="' + esc(center.work_center_id || '') + '"' + (state.workCenter === center.work_center_id ? ' selected' : '') + '>' + esc((center.work_center_id || '') + ' · ' + (center.work_center_name || '')) + '</option>'; }).join('') + '</select><select class="mesx-select" id="mes-filter-status"><option value="">' + esc(t('Tất cả trạng thái', 'All statuses')) + '</option>' + ['scheduled','setup','running','inspection','on_hold','completed'].map(function(key){ return '<option value="' + esc(key) + '"' + (state.dispatchStatus === key ? ' selected' : '') + '>' + esc(t(statusMeta(key).vi, statusMeta(key).en)) + '</option>'; }).join('') + '</select></div>' + renderDispatchTable(rows) + '</article>' +
      '<div class="mesx-stack"><article class="mesx-panel"><div class="mesx-panel-head"><div><h3>' + esc(t('Machine wall', 'Machine wall')) + '</h3><p>' + esc(t('Từng máy hiển thị tình trạng, OEE, gate chứng cứ và tool-life để trưởng ca xử lý ngay tại chỗ.', 'Each machine shows state, OEE, evidence gate, and tool-life so supervisors can act directly on the floor.')) + '</p></div></div><div class="mesx-machine-wall">' + (machineWall.length ? machineWall.map(renderMachineCard).join('') : '<div class="mesx-empty"><strong>' + esc(t('Chưa có machine wall', 'No machine wall data')) + '</strong>' + esc(t('Hãy khai báo máy trong master data trước.', 'Define machines in master data first.')) + '</div>') + '</div></article></div>' +
    '</section>' +
    '<section class="mesx-band" style="margin-top:18px"><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Tooling watchlist', 'Tooling watchlist')) + '</h2><p>' + esc(t('Tập trung vào các tool có life cao, offset bất ổn hoặc chưa được theo dõi đúng chuẩn.', 'Focus on tools with high life usage, unstable offsets, or missing governed tracking.')) + '</p></div></div><div class="mesx-list">' + renderToolingWatchlist(snapshot.tooling_alerts || []) + '</div></article><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('WO risk về gate chứng cứ', 'Evidence gate risk queue')) + '</h2><p>' + esc(t('Danh sách WO còn thiếu form bắt buộc, mở trực tiếp form cần thiết từ cùng màn hình.', 'List of WO still missing required forms, with direct launch actions from the same screen.')) + '</p></div></div><div class="mesx-list">' + renderGateQueue(snapshot.evidence_gate_queue || []) + '</div></article></section>' +
    '<section class="mesx-band" style="margin-top:18px"><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Downtime đang mở', 'Open downtime')) + '</h2><p>' + esc(t('Theo dõi nhanh máy nào đang dừng, WO nào bị giữ và cần khôi phục theo hướng nào.', 'Track which machines are down, which WO are blocked, and how they should be recovered.')) + '</p></div></div><div class="mesx-list">' + renderDowntimeList(snapshot.open_downtimes || []) + '</div></article><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Hàng đợi bảo trì', 'Maintenance queue')) + '</h2><p>' + esc(t('Điều phối maintenance request, đẩy trạng thái và mở PM verification ngay trong ngữ cảnh máy.', 'Dispatch maintenance requests, transition statuses, and open PM verification directly in machine context.')) + '</p></div></div><div class="mesx-list">' + renderMaintenanceList(snapshot.maintenance_queue || []) + '</div></article></section>' +
    '<section class="mesx-band" style="margin-top:18px"><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Nhật ký progress gần nhất', 'Recent progress activity')) + '</h2><p>' + esc(t('Log runtime gần nhất cho báo tiến độ shop-floor, useful để đối chiếu với order và evidence trail.', 'Recent runtime logs for shop-floor progress, useful for order and evidence trail reconciliation.')) + '</p></div></div><div class="mesx-list">' + renderProgressList(snapshot.progress_reports || []) + '</div></article><article class="mesx-panel"><div class="mesx-panel-head"><div><h2>' + esc(t('Bộ điều khiển nhanh', 'Quick control actions')) + '</h2><p>' + esc(t('Các hành động dùng nhiều nhất trong ca: mở dashboard đơn hàng, master data, evidence control hoặc tạo maintenance / downtime mới.', 'The most frequent shift actions: jump to order management, master data, evidence control, or create a new maintenance / downtime event.')) + '</p></div></div><div class="mesx-list"><div class="mesx-list-item"><h4>' + esc(t('Điều phối điều hành', 'Operations routing')) + '</h4><p>' + esc(t('Giữ người dùng trong cùng một nhịp làm việc: từ dispatch board sang evidence control hoặc order control mà không mất context.', 'Keep the operator in one working rhythm: from dispatch board to evidence control or order control without losing context.')) + '</p><div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link" id="mes-side-orders">' + esc(t('Mở Quản lý đơn hàng', 'Open Order Management')) + '</button><button type="button" class="mesx-link" id="mes-side-master">' + esc(t('Mở Dữ liệu nền', 'Open Master Data')) + '</button><button type="button" class="mesx-link" id="mes-side-forms">' + esc(t('Mở Kiểm soát chứng cứ', 'Open Evidence Control')) + '</button></div></div><div class="mesx-list-item"><h4>' + esc(t('Khởi tạo nhanh', 'Quick starts')) + '</h4><p>' + esc(t('Khi chưa chọn máy cụ thể, có thể tạo maintenance hoặc log downtime từ dashboard order rồi gắn context sau.', 'When no specific machine is selected yet, start maintenance or downtime from the order dashboard and attach context afterward.')) + '</p><div class="mesx-mini-actions" style="margin-top:10px"><button type="button" class="mesx-link warning" id="mes-new-downtime-blank">' + esc(t('Tạo downtime mới', 'Create downtime')) + '</button><button type="button" class="mesx-link" id="mes-new-maintenance-blank">' + esc(t('Tạo maintenance mới', 'Create maintenance')) + '</button></div></div></div></article></section>' +
  '</div>';

  bind();
}

function bind(){
  if(!state.container) return;

  var search = document.getElementById('mes-search');
  if(search) search.oninput = function(){ state.search = search.value || ''; render(); };
  var center = document.getElementById('mes-filter-center');
  if(center) center.onchange = function(){ state.workCenter = center.value || ''; render(); };
  var status = document.getElementById('mes-filter-status');
  if(status) status.onchange = function(){ state.dispatchStatus = status.value || ''; render(); };

  var refresh = document.getElementById('mes-refresh');
  if(refresh) refresh.onclick = function(){
    loadData();
    if(state.streamStatus !== 'live') connectStream();
  };
  var pollBatch = document.getElementById('mes-poll-batch');
  if(pollBatch) pollBatch.onclick = function(){ pollMtconnectBatch(); };
  var openOrders = document.getElementById('mes-open-orders');
  if(openOrders) openOrders.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('orders'); };
  var openMaster = document.getElementById('mes-open-master');
  if(openMaster) openMaster.onclick = function(){ if(typeof window._mdOpenControl === 'function') window._mdOpenControl(); };
  var openForms = document.getElementById('mes-open-forms');
  if(openForms) openForms.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('forms'); };
  var sideOrders = document.getElementById('mes-side-orders');
  if(sideOrders) sideOrders.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('orders'); };
  var sideMaster = document.getElementById('mes-side-master');
  if(sideMaster) sideMaster.onclick = function(){ if(typeof window._mdOpenControl === 'function') window._mdOpenControl(); };
  var sideForms = document.getElementById('mes-side-forms');
  if(sideForms) sideForms.onclick = function(){ if(typeof navigateTo === 'function') navigateTo('forms'); };
  var blankDowntime = document.getElementById('mes-new-downtime-blank');
  if(blankDowntime) blankDowntime.onclick = function(){ openDowntimeModal(''); };
  var blankMaintenance = document.getElementById('mes-new-maintenance-blank');
  if(blankMaintenance) blankMaintenance.onclick = function(){ openMaintenanceModal(''); };

  Array.prototype.forEach.call(state.container.querySelectorAll('[data-open-form]'), function(button){
    button.onclick = function(){ openEvidenceForm(button.getAttribute('data-open-form') || '', parseJsonAttr(button.getAttribute('data-context'))); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-report-progress]'), function(button){
    button.onclick = function(){ openProgressModal(button.getAttribute('data-report-progress') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-new-downtime]'), function(button){
    button.onclick = function(){ openDowntimeModal(button.getAttribute('data-new-downtime') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-resolve-downtime]'), function(button){
    button.onclick = function(){ openResolveDowntimeModal(button.getAttribute('data-resolve-downtime') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-new-maintenance]'), function(button){
    button.onclick = function(){ openMaintenanceModal(button.getAttribute('data-new-maintenance') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-maintenance-status]'), function(button){
    button.onclick = function(){ var payload = String(button.getAttribute('data-maintenance-status') || '').split(':'); openMaintenanceStatusModal(payload[0] || '', payload[1] || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-edit-tooling]'), function(button){
    button.onclick = function(){ openToolingModal(button.getAttribute('data-edit-tooling') || '', button.getAttribute('data-tool-runtime') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-open-signal-bridge]'), function(button){
    button.onclick = function(){ openSignalBridgeModal(button.getAttribute('data-open-signal-bridge') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-poll-mtconnect]'), function(button){
    button.onclick = function(){ pollMtconnect(button.getAttribute('data-poll-mtconnect') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-open-exception]'), function(button){
    button.onclick = function(){ openExceptionDetail(button.getAttribute('data-open-exception') || ''); };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-open-adapter-event]'), function(button){
    button.onclick = function(){
      openAdapterEventModal(button.getAttribute('data-open-adapter-event') || '');
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-alarm-action]'), function(button){
    button.onclick = function(){
      openAlarmGovernanceModal(button.getAttribute('data-alarm-action') || '', parseJsonAttr(button.getAttribute('data-alarm-context')));
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-shift-handover]'), function(button){
    button.onclick = function(){
      openShiftHandoverModal(parseJsonAttr(button.getAttribute('data-shift-handover')));
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-material-issue]'), function(button){
    button.onclick = function(){
      openMaterialIssueModal(parseJsonAttr(button.getAttribute('data-material-issue')));
    };
  });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-genealogy-snapshot]'), function(button){
    button.onclick = function(){
      openGenealogySnapshotModal(parseJsonAttr(button.getAttribute('data-genealogy-snapshot')));
    };
  });
}

function openSignalBridgeModal(machineId){
  var machine = machineById(machineId);
  if(!machine){ toast(t('Không tìm thấy máy để cập nhật tín hiệu.', 'Could not find the machine for signal update.'), 'error'); return; }
  var woRows = workOrderOptions(machineId);
  var operators = operatorOptions(machine.work_center_id || '');
  showModal(
    t('Cập nhật connector / tín hiệu máy', 'Update connector / machine signal'),
    (machine.machine_id || '') + ' · ' + (machine.machine_name || '') + ' · ' + connectorTypeLabel(machine.connector_type || 'manual_bridge'),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') +
      fieldDisplay(t('Heartbeat gần nhất', 'Last heartbeat'), freshnessLabel(machine.signal_freshness_seconds, machine.heartbeat_sla_seconds)) +
      editableField('mes-sig-connector-type', t('Loại connector', 'Connector type'), '<select class="mesx-select" id="mes-sig-connector-type"><option value="mtconnect"' + ((machine.connector_type || '') === 'mtconnect' ? ' selected' : '') + '>MTConnect</option><option value="opcua"' + ((machine.connector_type || '') === 'opcua' ? ' selected' : '') + '>OPC UA</option><option value="dnc"' + ((machine.connector_type || '') === 'dnc' ? ' selected' : '') + '>DNC</option><option value="manual_bridge"' + ((machine.connector_type || '') === 'manual_bridge' ? ' selected' : '') + '>' + esc(t('Cầu nối nhập tay', 'Manual bridge')) + '</option><option value="disabled"' + ((machine.connector_type || '') === 'disabled' ? ' selected' : '') + '>' + esc(t('Tắt kết nối', 'Disabled')) + '</option></select>') +
      editableField('mes-sig-state', t('Trạng thái máy', 'Machine state'), '<select class="mesx-select" id="mes-sig-state"><option value="running"' + ((machine.signal_state || machine.status || '') === 'running' ? ' selected' : '') + '>' + esc(t('Đang chạy', 'Running')) + '</option><option value="setup"' + ((machine.signal_state || machine.status || '') === 'setup' ? ' selected' : '') + '>' + esc(t('Đang setup', 'Setup')) + '</option><option value="inspection"' + ((machine.signal_state || machine.status || '') === 'inspection' ? ' selected' : '') + '>' + esc(t('Đang kiểm tra', 'Inspection')) + '</option><option value="on_hold"' + ((machine.signal_state || machine.status || '') === 'on_hold' ? ' selected' : '') + '>' + esc(t('Tạm dừng', 'On hold')) + '</option><option value="idle"' + ((machine.signal_state || machine.status || '') === 'idle' ? ' selected' : '') + '>' + esc(t('Rảnh', 'Idle')) + '</option><option value="maintenance"' + ((machine.signal_state || machine.status || '') === 'maintenance' ? ' selected' : '') + '>' + esc(t('Bảo trì', 'Maintenance')) + '</option><option value="down"' + ((machine.signal_state || machine.status || '') === 'down' ? ' selected' : '') + '>' + esc(t('Dừng máy', 'Down')) + '</option></select>') +
      editableField('mes-sig-wo', t('WO hiện hành', 'Current WO'), '<select class="mesx-select" id="mes-sig-wo">' + renderSelectOptions(woRows, 'wo_number', function(item){ return [item.wo_number, item.operation_desc, item.part_number].filter(Boolean).join(' · '); }, (machine.active_work_order || {}).wo_number || '', t('Không gắn WO', 'No WO linked')) + '</select>') +
      editableField('mes-sig-operator', t('Người vận hành', 'Operator'), '<select class="mesx-select" id="mes-sig-operator">' + renderSelectOptions(operators, 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, (machine.active_work_order || {}).operator_id || machine.preferred_operator_id || '', t('Không gắn operator', 'No operator linked')) + '</select>') +
      editableField('mes-sig-heartbeat', t('Heartbeat / signal time', 'Heartbeat / signal time'), '<input class="mesx-input" id="mes-sig-heartbeat" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-sig-program', t('NC / chương trình', 'NC / program'), '<input class="mesx-input" id="mes-sig-program" type="text" value="' + esc(machine.current_program_id || '') + '" placeholder="' + esc(t('Ví dụ: NC_714-1101_REVC_OP10_5AX_V3', 'Example: NC_714-1101_REVC_OP10_5AX_V3')) + '">') +
      editableField('mes-sig-spindle', t('Spindle load (%)', 'Spindle load (%)'), '<input class="mesx-input" id="mes-sig-spindle" type="number" min="0" max="100" value="' + esc(machine.spindle_load_pct == null ? '' : Number(machine.spindle_load_pct).toFixed(0)) + '">') +
      editableField('mes-sig-override', t('Feed override (%)', 'Feed override (%)'), '<input class="mesx-input" id="mes-sig-override" type="number" min="0" max="200" value="' + esc(machine.feed_override_pct == null ? '' : Number(machine.feed_override_pct).toFixed(0)) + '">') +
      editableField('mes-sig-count', t('Part count', 'Part count'), '<input class="mesx-input" id="mes-sig-count" type="number" min="0" value="' + esc(machine.part_count == null ? '' : Number(machine.part_count)) + '">') +
      editableField('mes-sig-note', t('Ghi chú connector', 'Connector note'), '<textarea class="mesx-textarea" id="mes-sig-note" placeholder="' + esc(t('Ví dụ: heartbeat pilot từ adapter, line tạm mất tín hiệu, đang fallback manual bridge...', 'Example: pilot heartbeat from adapter, line temporarily lost signal, falling back to manual bridge...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>📡 ' + esc(t('Lưu tín hiệu', 'Save signal')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      var heartbeat = (modal.querySelector('#mes-sig-heartbeat') || {}).value || '';
      var connectorType = (modal.querySelector('#mes-sig-connector-type') || {}).value || machine.connector_type || 'manual_bridge';
      var connectorName = connectorType === (machine.connector_type || '') ? (machine.connector_name || '') : ((machine.machine_name || machine.machine_id || 'Machine') + ' ' + connectorTypeLabel(connectorType));
      var connectorEndpoint = connectorType === (machine.connector_type || '') ? (machine.connector_endpoint || '') : (connectorType === 'manual_bridge' ? ('manual://' + String(machine.machine_id || '').toLowerCase()) : '');
      api('mes_connector_ingest', {
        machine_id: machine.machine_id || '',
        connector_type: connectorType,
        connector_name: connectorName,
        connector_endpoint: connectorEndpoint,
        telemetry_mode: connectorType === 'manual_bridge' ? 'manual' : (connectorType === 'disabled' ? 'disabled' : 'machine'),
        heartbeat_sla_seconds: machine.heartbeat_sla_seconds || 120,
        machine_state: (modal.querySelector('#mes-sig-state') || {}).value || 'idle',
        signal_at: heartbeat,
        last_heartbeat_at: heartbeat,
        wo_number: (modal.querySelector('#mes-sig-wo') || {}).value || '',
        operator_id: (modal.querySelector('#mes-sig-operator') || {}).value || '',
        current_program_id: (modal.querySelector('#mes-sig-program') || {}).value || '',
        spindle_load_pct: (modal.querySelector('#mes-sig-spindle') || {}).value || '',
        feed_override_pct: (modal.querySelector('#mes-sig-override') || {}).value || '',
        part_count: (modal.querySelector('#mes-sig-count') || {}).value || '',
        note: (modal.querySelector('#mes-sig-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'signal_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật connector và tín hiệu máy.', 'Connector and machine signal updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật tín hiệu máy.', 'Could not update the machine signal.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function pollMtconnect(machineId){
  var machine = machineById(machineId);
  if(!machine){
    toast(t('Không tìm thấy máy để đọc MTConnect.', 'Could not find the machine for MTConnect polling.'), 'error');
    return;
  }
  toast(t('Đang đọc một nhịp MTConnect từ máy pilot...', 'Polling a single MTConnect sample from the pilot machine...'), 'info');
  api('mes_mtconnect_poll_once', { machine_id: machineId }, 'POST').then(function(resp){
    if(!resp || !resp.ok){
      throw new Error((resp && resp.error) ? String(resp.error) : t('Không thể đọc MTConnect.', 'Could not poll MTConnect.'));
    }
    mergeRuntimePayload({
      snapshot: resp.data || defaultSnapshot(),
      streamed_at: new Date().toISOString()
    });
    state.loading = false;
      render();
      toast(t('Đã đồng bộ một nhịp MTConnect vào runtime MES.', 'One MTConnect sample has been synchronized into the MES runtime.'), 'success');
  }).catch(function(error){
    toast((error && error.message) || t('Không thể đọc MTConnect từ adapter.', 'Could not poll MTConnect from the adapter.'), 'error');
    if(window.console) console.error(error);
  });
}

function pollMtconnectBatch(){
  toast(t('Đang chạy batch poll cho toàn bộ adapter MTConnect đang active...', 'Running a batch poll across all active MTConnect adapters...'), 'info');
  api('mes_mtconnect_poll_batch', {}, 'POST').then(function(resp){
    if(!resp){
      throw new Error(t('Không nhận được phản hồi từ batch poll.', 'No response received from the batch poll.'));
    }
    if(!resp.ok && !resp.data){
      throw new Error(String(resp.error || t('Batch poll MTConnect thất bại.', 'The MTConnect batch poll failed.')));
    }
    mergeRuntimePayload({
      snapshot: resp.data || defaultSnapshot(),
      streamed_at: new Date().toISOString()
    });
    state.loading = false;
    render();
    var processed = Number(resp.processed || 0);
    var success = Number(resp.success || 0);
    var failed = Number(resp.failed || 0);
    var skipped = Number(resp.skipped || 0);
    var message = t('Batch poll xong', 'Batch poll complete') + ': '
      + processed + ' ' + t('adapter', 'adapters')
      + ' · OK ' + success
      + ' · ' + t('Lỗi', 'Fail') + ' ' + failed
      + ' · ' + t('Bỏ qua', 'Skip') + ' ' + skipped;
    toast(message, failed > 0 ? 'warning' : 'success');
  }).catch(function(error){
    toast((error && error.message) || t('Không thể chạy batch poll MTConnect.', 'Could not run the MTConnect batch poll.'), 'error');
    if(window.console) console.error(error);
  });
}

function openAlarmGovernanceModal(action, row){
  var alarm = row && typeof row === 'object' ? row : {};
  var alarmAction = String(action || '').toLowerCase();
  if(!alarm.alarm_event_id){
    toast(t('Không tìm thấy alarm để xử lý.', 'Could not find the alarm event to process.'), 'error');
    return;
  }
  var titleMap = {
    ack: [t('Xác nhận alarm', 'Acknowledge alarm'), 'mes_alarm_acknowledge', 'acknowledged_at', 'acknowledge_note', t('Xác nhận', 'Acknowledge')],
    escalate: [t('Escalate alarm', 'Escalate alarm'), 'mes_alarm_escalate', 'escalated_at', 'escalation_note', t('Escalate', 'Escalate')],
    clear: [t('Clear alarm', 'Clear alarm'), 'mes_alarm_clear', 'cleared_at', '', t('Clear', 'Clear')]
  };
  var tuple = titleMap[alarmAction];
  if(!tuple){
    toast(t('Hành động alarm không hợp lệ.', 'Invalid alarm action.'), 'error');
    return;
  }
  var noteField = tuple[3];
  var body = '<div class="mesx-form-grid">' +
    fieldDisplay(t('Alarm', 'Alarm'), [alarm.machine_id || '', alarm.alarm_code || '', alarm.alarm_text || ''].filter(Boolean).join(' · ')) +
    fieldDisplay(t('WO / playbook', 'WO / playbook'), [alarm.wo_number || t('Không gắn WO', 'No WO linked'), alarm.playbook_id || t('Không có playbook', 'No playbook')].join(' · ')) +
    editableField('mes-alarm-time', t('Thời điểm ghi nhận', 'Action time'), '<input class="mesx-input" id="mes-alarm-time" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
    (noteField ? editableField('mes-alarm-note', t('Ghi chú xử lý', 'Governance note'), '<textarea class="mesx-textarea" id="mes-alarm-note" placeholder="' + esc(t('Mô tả người nhận, quyết định escalation hoặc tình trạng lockout hiện tại...', 'Describe the responder, escalation decision, or current lockout condition...')) + '"></textarea>', true) : '') +
    '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🧯 ' + esc(tuple[4]) + '</button></div>' +
  '</div>';
  showModal(tuple[0], [alarm.machine_id || '', alarm.wo_number || '', alarm.alarm_code || ''].filter(Boolean).join(' · '), body, function(modal, submit){
    submit.disabled = true;
    var payload = { alarm_event_id: alarm.alarm_event_id || '' };
    payload[tuple[2]] = (modal.querySelector('#mes-alarm-time') || {}).value || '';
    if(noteField) payload[noteField] = (modal.querySelector('#mes-alarm-note') || {}).value || '';
    api(tuple[1], payload, 'POST').then(function(resp){
      if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'alarm_governance_failed');
      state.snapshot = resp.data || state.snapshot;
      toast(t('Đã cập nhật governance cho alarm.', 'Alarm governance updated.'), 'success');
      closeModal();
      render();
    }).catch(function(error){
      toast(t('Không thể cập nhật alarm.', 'Could not update the alarm.'), 'error');
      if(window.console) console.error(error);
    }).finally(function(){ submit.disabled = false; });
  });
  bindModalButtons();
}

function openAdapterEventModal(machineId){
  var machine = machineById(machineId);
  var adapter = adapterForMachine(machineId);
  if(!machine){
    toast(t('Không tìm thấy máy để ghi sự kiện adapter.', 'Could not find the machine for adapter event logging.'), 'error');
    return;
  }
  if(!adapter){
    toast(t('Máy này chưa có adapter được quản trị trong dữ liệu nền.', 'This machine does not yet have a governed adapter in master data.'), 'error');
    return;
  }
  showModal(
    t('Ghi sự kiện adapter', 'Log adapter event'),
    [machine.machine_id || '', adapter.adapter_id || '', connectorTypeLabel(adapter.adapter_type || adapter.connector_type || '')].filter(Boolean).join(' · '),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Adapter', 'Adapter'), [adapter.adapter_name || adapter.adapter_id || '', adapter.endpoint_url || adapter.connector_endpoint || ''].filter(Boolean).join(' · ')) +
      fieldDisplay(t('Heartbeat SLA', 'Heartbeat SLA'), (adapter.heartbeat_sla_seconds || machine.heartbeat_sla_seconds || 120) + 's') +
      editableField('mes-adp-type', t('Loại sự kiện', 'Event type'), '<select class="mesx-select" id="mes-adp-type"><option value="heartbeat">Heartbeat</option><option value="ingest_warning">Ingest warning</option><option value="ingest_failure">Ingest failure</option><option value="replay_blocked">Replay blocked</option><option value="stale_signal">Stale signal</option><option value="recovered">Recovered</option></select>') +
      editableField('mes-adp-severity', t('Mức độ', 'Severity'), '<select class="mesx-select" id="mes-adp-severity"><option value="INFO">INFO</option><option value="WARNING" selected>WARNING</option><option value="ALARM">ALARM</option><option value="CRITICAL">CRITICAL</option><option value="EMERGENCY">EMERGENCY</option></select>') +
      editableField('mes-adp-status', t('Trạng thái', 'Status'), '<select class="mesx-select" id="mes-adp-status"><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select>') +
      editableField('mes-adp-time', t('Thời điểm sự kiện', 'Event time'), '<input class="mesx-input" id="mes-adp-time" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-adp-message', t('Thông điệp', 'Message'), '<textarea class="mesx-textarea" id="mes-adp-message" placeholder="' + esc(t('Ví dụ: OPC UA stale heartbeat 265s, fallback sang manual bridge để tránh mù dữ liệu...', 'Example: OPC UA heartbeat stale at 265s, falling back to manual bridge to avoid blind runtime...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🛰️ ' + esc(t('Lưu sự kiện', 'Save event')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_adapter_event_append', {
        adapter_id: adapter.adapter_id || '',
        machine_id: machine.machine_id || '',
        event_type: (modal.querySelector('#mes-adp-type') || {}).value || 'heartbeat',
        severity: (modal.querySelector('#mes-adp-severity') || {}).value || 'WARNING',
        status: (modal.querySelector('#mes-adp-status') || {}).value || 'open',
        event_time: (modal.querySelector('#mes-adp-time') || {}).value || '',
        message: (modal.querySelector('#mes-adp-message') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'adapter_event_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã lưu sự kiện adapter.', 'Adapter event saved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể lưu sự kiện adapter.', 'Could not save the adapter event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openShiftHandoverModal(context){
  var row = context && typeof context === 'object' ? context : {};
  var machine = machineById(row.machine_id || '');
  if(!machine){
    toast(t('Không tìm thấy máy để bàn giao ca.', 'Could not find the machine for shift handover.'), 'error');
    return;
  }
  var dispatch = dispatchByWo(row.wo_number || '') || machine.active_work_order || {};
  var operators = operatorOptions(machine.work_center_id || '');
  var currentShift = (state.snapshot && state.snapshot.current_shift) || {};
  var shiftTo = row.current_shift || currentShift.shift_code || '';
  var shiftFrom = row.shift_to || row.shift_from || '';
  showModal(
    t('Bàn giao ca', 'Shift handover'),
    [machine.machine_id || '', machine.machine_name || '', shiftTo ? ('Ca ' + shiftTo) : ''].filter(Boolean).join(' · '),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') +
      fieldDisplay(t('WO hiện hành', 'Current WO'), [dispatch.wo_number || row.wo_number || '', dispatch.part_number || row.part_number || '', dispatch.part_revision || row.part_revision || ''].filter(Boolean).join(' · ')) +
      editableField('mes-shift-from', t('Ca giao', 'Shift from'), '<input class="mesx-input" id="mes-shift-from" type="text" value="' + esc(shiftFrom) + '" placeholder="' + esc(t('Ví dụ: B', 'Example: B')) + '">') +
      editableField('mes-shift-to', t('Ca nhận', 'Shift to'), '<input class="mesx-input" id="mes-shift-to" type="text" value="' + esc(shiftTo) + '" placeholder="' + esc(t('Ví dụ: C', 'Example: C')) + '">') +
      editableField('mes-shift-operator-from', t('Người bàn giao', 'Operator from'), '<select class="mesx-select" id="mes-shift-operator-from">' + renderSelectOptions(operators, 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, row.operator_to || row.operator_from || dispatch.operator_id || '', t('Chọn người bàn giao', 'Select operator from')) + '</select>') +
      editableField('mes-shift-operator-to', t('Người nhận ca', 'Operator to'), '<select class="mesx-select" id="mes-shift-operator-to">' + renderSelectOptions(operators, 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, dispatch.operator_id || row.operator_to || '', t('Chọn người nhận ca', 'Select operator to')) + '</select>') +
      editableField('mes-shift-machine-state', t('Trạng thái máy', 'Machine state'), '<select class="mesx-select" id="mes-shift-machine-state"><option value="running"' + ((machine.status || '') === 'running' ? ' selected' : '') + '>' + esc(t('Đang chạy', 'Running')) + '</option><option value="setup"' + ((machine.status || '') === 'setup' ? ' selected' : '') + '>' + esc(t('Đang setup', 'Setup')) + '</option><option value="inspection"' + ((machine.status || '') === 'inspection' ? ' selected' : '') + '>' + esc(t('Đang kiểm tra', 'Inspection')) + '</option><option value="on_hold"' + ((machine.status || '') === 'on_hold' ? ' selected' : '') + '>' + esc(t('Tạm dừng', 'On hold')) + '</option><option value="down"' + ((machine.status || '') === 'down' ? ' selected' : '') + '>' + esc(t('Dừng máy', 'Down')) + '</option></select>') +
      editableField('mes-shift-parts', t('Số lượng đã hoàn thành', 'Parts completed'), '<input class="mesx-input" id="mes-shift-parts" type="number" min="0" value="' + esc(Number(dispatch.qty_completed || 0)) + '">') +
      editableField('mes-shift-issues', t('Vấn đề tồn ca', 'Issues noted'), '<textarea class="mesx-textarea" id="mes-shift-issues" placeholder="' + esc(t('Ví dụ: alarm tạm thời, rung nhẹ, offset đang theo dõi...', 'Example: temporary alarm, mild chatter, offset under observation...')) + '">' + esc(row.issues_noted || '') + '</textarea>', true) +
      editableField('mes-shift-pending', t('Hành động cần tiếp tục', 'Pending actions'), '<textarea class="mesx-textarea" id="mes-shift-pending" placeholder="' + esc(t('Ví dụ: xác nhận lại preset dao T12, chờ QC mở FAI, hoàn tất warm-up spindle...', 'Example: reconfirm tool T12 preset, wait for QC to open FAI, complete spindle warm-up...')) + '">' + esc(row.pending_actions || '') + '</textarea>', true) +
      editableField('mes-shift-quality', t('Cảnh báo chất lượng', 'Quality alerts'), '<textarea class="mesx-textarea" id="mes-shift-quality" placeholder="' + esc(t('Nêu rõ lô nào đang hold, CTQ nào cần theo dõi hoặc NCR/CAPA liên quan...', 'State which lot is on hold, which CTQ needs watching, or related NCR/CAPA...')) + '">' + esc(row.quality_alerts || '') + '</textarea>', true) +
      editableField('mes-shift-tooling', t('Tình trạng tooling', 'Tooling status'), '<textarea class="mesx-textarea" id="mes-shift-tooling" placeholder="' + esc(t('Ví dụ: dao OP20 còn 18%, offset D12 vừa chỉnh +0.01mm...', 'Example: OP20 tool has 18% life left, D12 offset adjusted +0.01mm...')) + '">' + esc(row.tooling_status || '') + '</textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🔄 ' + esc(t('Lưu bàn giao ca', 'Save handover')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_shift_handover_submit', {
        handover_id: row.handover_id || '',
        machine_id: machine.machine_id || '',
        wo_number: dispatch.wo_number || row.wo_number || '',
        shift_from: (modal.querySelector('#mes-shift-from') || {}).value || '',
        shift_to: (modal.querySelector('#mes-shift-to') || {}).value || '',
        operator_from: (modal.querySelector('#mes-shift-operator-from') || {}).value || '',
        operator_to: (modal.querySelector('#mes-shift-operator-to') || {}).value || '',
        machine_state: (modal.querySelector('#mes-shift-machine-state') || {}).value || machine.status || 'running',
        parts_completed: Number((modal.querySelector('#mes-shift-parts') || {}).value || 0),
        issues_noted: (modal.querySelector('#mes-shift-issues') || {}).value || '',
        pending_actions: (modal.querySelector('#mes-shift-pending') || {}).value || '',
        quality_alerts: (modal.querySelector('#mes-shift-quality') || {}).value || '',
        tooling_status: (modal.querySelector('#mes-shift-tooling') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'shift_handover_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã lưu bàn giao ca.', 'Shift handover saved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể lưu bàn giao ca.', 'Could not save the shift handover.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openMaterialIssueModal(context){
  var row = context && typeof context === 'object' ? context : {};
  var dispatch = dispatchByWo(row.wo_number || '');
  if(!dispatch){
    toast(t('Không tìm thấy WO để issue vật liệu.', 'Could not find the WO for material issue.'), 'error');
    return;
  }
  showModal(
    t('Ghi issue vật liệu', 'Record material issue'),
    [dispatch.wo_number || '', dispatch.part_number || '', dispatch.part_revision || ''].filter(Boolean).join(' · '),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Khách hàng / máy', 'Customer / machine'), [dispatch.customer_name || dispatch.customer_id || '', dispatch.machine_id || ''].filter(Boolean).join(' · ')) +
      fieldDisplay(t('Traveler hiện hành', 'Current traveler'), dispatch.traveler_number || t('Chưa có', 'Not set')) +
      editableField('mes-mat-lot', t('Material lot', 'Material lot'), '<input class="mesx-input" id="mes-mat-lot" type="text" value="' + esc(row.material_lot_number || dispatch.material_lot_number || '') + '">') +
      editableField('mes-mat-heat', t('Heat number', 'Heat number'), '<input class="mesx-input" id="mes-mat-heat" type="text" value="' + esc(row.heat_number || dispatch.heat_number || '') + '">') +
      editableField('mes-mat-traveler', t('Traveler number', 'Traveler number'), '<input class="mesx-input" id="mes-mat-traveler" type="text" value="' + esc(dispatch.traveler_number || '') + '">') +
      editableField('mes-mat-cert', t('Material cert', 'Material cert'), '<input class="mesx-input" id="mes-mat-cert" type="text" value="">') +
      editableField('mes-mat-qty', t('Số lượng issue', 'Issued quantity'), '<input class="mesx-input" id="mes-mat-qty" type="number" min="0" step="0.001" value="' + esc(Number(row.issued_qty || 0) || Number(dispatch.qty_planned || 0) || 0) + '">') +
      editableField('mes-mat-uom', t('Đơn vị', 'UOM'), '<input class="mesx-input" id="mes-mat-uom" type="text" value="EA">') +
      editableField('mes-mat-verified', t('Người xác nhận', 'Verified by'), '<input class="mesx-input" id="mes-mat-verified" type="text" value="' + esc(dispatch.operator_id || '') + '">') +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🧪 ' + esc(t('Lưu issue vật liệu', 'Save material issue')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_material_issue', {
        wo_number: dispatch.wo_number || '',
        machine_id: dispatch.machine_id || '',
        operation_number: dispatch.operation_number || 0,
        part_number: dispatch.part_number || '',
        part_revision: dispatch.part_revision || '',
        lot_number: (modal.querySelector('#mes-mat-lot') || {}).value || '',
        heat_number: (modal.querySelector('#mes-mat-heat') || {}).value || '',
        traveler_number: (modal.querySelector('#mes-mat-traveler') || {}).value || '',
        material_cert_number: (modal.querySelector('#mes-mat-cert') || {}).value || '',
        qty_consumed: Number((modal.querySelector('#mes-mat-qty') || {}).value || 0),
        qty_uom: (modal.querySelector('#mes-mat-uom') || {}).value || 'EA',
        verified_by: (modal.querySelector('#mes-mat-verified') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'material_issue_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã lưu issue vật liệu.', 'Material issue saved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể lưu issue vật liệu.', 'Could not save the material issue.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openGenealogySnapshotModal(context){
  var row = context && typeof context === 'object' ? context : {};
  var dispatch = dispatchByWo(row.wo_number || '');
  if(!dispatch){
    toast(t('Không tìm thấy WO để chốt genealogy.', 'Could not find the WO for genealogy capture.'), 'error');
    return;
  }
  var operators = operatorOptions(dispatch.work_center_id || '');
  showModal(
    t('Chốt genealogy', 'Capture genealogy'),
    [dispatch.wo_number || '', dispatch.part_number || '', dispatch.part_revision || '', dispatch.machine_id || ''].filter(Boolean).join(' · '),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Khách hàng', 'Customer'), dispatch.customer_name || dispatch.customer_id || '—') +
      fieldDisplay(t('NC / chương trình', 'NC / program'), dispatch.nc_program_id || t('Chưa có', 'Not set')) +
      editableField('mes-gen-serial', t('Serial number', 'Serial number'), '<input class="mesx-input" id="mes-gen-serial" type="text" value="">') +
      editableField('mes-gen-lot', t('Material lot', 'Material lot'), '<input class="mesx-input" id="mes-gen-lot" type="text" value="' + esc(row.material_lot_number || dispatch.material_lot_number || '') + '">') +
      editableField('mes-gen-heat', t('Raw material heat', 'Raw material heat'), '<input class="mesx-input" id="mes-gen-heat" type="text" value="' + esc(row.heat_number || dispatch.heat_number || '') + '">') +
      editableField('mes-gen-operator', t('Người ghi nhận', 'Recorded operator'), '<select class="mesx-select" id="mes-gen-operator">' + renderSelectOptions(operators, 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, dispatch.operator_id || '', t('Chọn người vận hành', 'Select operator')) + '</select>') +
      editableField('mes-gen-ok', t('Số lượng đạt', 'Completed qty'), '<input class="mesx-input" id="mes-gen-ok" type="number" min="0" value="' + esc(Number(dispatch.qty_completed || 0)) + '">') +
      editableField('mes-gen-scrap', t('Số lượng scrap', 'Scrap qty'), '<input class="mesx-input" id="mes-gen-scrap" type="number" min="0" value="' + esc(Number(dispatch.qty_scrap || 0)) + '">') +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🧬 ' + esc(t('Lưu genealogy', 'Save genealogy')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_genealogy_snapshot', {
        wo_number: dispatch.wo_number || '',
        machine_id: dispatch.machine_id || '',
        part_number: dispatch.part_number || '',
        part_revision: dispatch.part_revision || '',
        lot_number: (modal.querySelector('#mes-gen-lot') || {}).value || '',
        material_lot_number: (modal.querySelector('#mes-gen-lot') || {}).value || '',
        raw_material_heat: (modal.querySelector('#mes-gen-heat') || {}).value || '',
        serial_number: (modal.querySelector('#mes-gen-serial') || {}).value || '',
        nc_program_id: dispatch.nc_program_id || '',
        operator_id: (modal.querySelector('#mes-gen-operator') || {}).value || '',
        completed_qty: Number((modal.querySelector('#mes-gen-ok') || {}).value || 0),
        scrap_qty: Number((modal.querySelector('#mes-gen-scrap') || {}).value || 0)
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'genealogy_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã lưu genealogy.', 'Genealogy saved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể lưu genealogy.', 'Could not save genealogy.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openProgressModal(woNumber){
  var row = dispatchByWo(woNumber);
  if(!row){ toast(t('Không tìm thấy WO để báo tiến độ.', 'Could not find the work order to report progress.'), 'error'); return; }
  var operators = operatorOptions(row.work_center_id);
  showModal(
    t('Báo tiến độ Work Order', 'Report work-order progress'),
    (row.wo_number || '') + ' · ' + (row.machine_id || '—') + ' · ' + (row.operation_desc || ''),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Khách hàng / Part', 'Customer / Part'), [row.customer_name || row.customer_id || '', row.part_number || '', row.part_revision || ''].filter(Boolean).join(' · ')) +
      fieldDisplay(t('Runtime kế hoạch', 'Planned runtime'), fmtMinutes(Number(row.setup_time_est || 0) + Number(row.run_time_est || 0))) +
      editableField('mes-progress-status', t('Trạng thái mới', 'New status'), '<select class="mesx-select" id="mes-progress-status">' + ['setup','running','inspection','completed','on_hold'].map(function(key){ return '<option value="' + esc(key) + '"' + (String(row.status || '') === key ? ' selected' : '') + '>' + esc(t(statusMeta(key).vi, statusMeta(key).en)) + '</option>'; }).join('') + '</select>') +
      editableField('mes-progress-operator', t('Người vận hành', 'Operator'), '<select class="mesx-select" id="mes-progress-operator">' + renderSelectOptions(operators, 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, row.operator_id || '', t('Chọn người vận hành', 'Select operator')) + '</select>') +
      editableField('mes-progress-ok', t('Số lượng đạt', 'Qty completed'), '<input class="mesx-input" id="mes-progress-ok" type="number" min="0" value="' + esc(Number(row.qty_completed || 0)) + '">') +
      editableField('mes-progress-scrap', t('Số lượng scrap', 'Qty scrap'), '<input class="mesx-input" id="mes-progress-scrap" type="number" min="0" value="' + esc(Number(row.qty_scrap || 0)) + '">') +
      editableField('mes-progress-setup-min', t('Setup thực tế (phút)', 'Actual setup minutes'), '<input class="mesx-input" id="mes-progress-setup-min" type="number" min="0" value="' + esc(Number(row.setup_time_actual || 0)) + '">') +
      editableField('mes-progress-run-min', t('Run thực tế (phút)', 'Actual run minutes'), '<input class="mesx-input" id="mes-progress-run-min" type="number" min="0" value="' + esc(Number(row.run_time_actual || 0)) + '">') +
      editableField('mes-progress-note', t('Ghi chú shop-floor', 'Shop-floor note'), '<textarea class="mesx-textarea" id="mes-progress-note" placeholder="' + esc(t('Ví dụ: hoàn tất prove-out, đang chuyển qua inspection...', 'Example: prove-out completed, moving to inspection...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>💾 ' + esc(t('Lưu tiến độ', 'Save progress')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_wo_report_progress', {
        wo_number: row.wo_number || '',
        status: (modal.querySelector('#mes-progress-status') || {}).value || row.status,
        operator_id: (modal.querySelector('#mes-progress-operator') || {}).value || row.operator_id || '',
        qty_completed: Number((modal.querySelector('#mes-progress-ok') || {}).value || 0),
        qty_scrap: Number((modal.querySelector('#mes-progress-scrap') || {}).value || 0),
        setup_time_actual: Number((modal.querySelector('#mes-progress-setup-min') || {}).value || 0),
        run_time_actual: Number((modal.querySelector('#mes-progress-run-min') || {}).value || 0),
        note: (modal.querySelector('#mes-progress-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok){
          toast(governanceFailureMessage(resp, 'Không thể cập nhật tiến độ WO.', 'Could not update work-order progress.'), 'error');
          if(window.console) console.error(resp);
          return;
        }
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật tiến độ WO.', 'Work-order progress updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật tiến độ WO.', 'Could not update work-order progress.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openDowntimeModalLegacy(machineId){
  var machine = machineId ? machineById(machineId) : null;
  var workCenterId = machine ? machine.work_center_id : state.workCenter;
  var woRows = workOrderOptions(machineId);
  var toolRows = machineId ? toolOptionsForMachine(machineId) : [];
  showModal(
    t('Ghi nhận downtime', 'Create downtime event'),
    machine ? ((machine.machine_id || '') + ' · ' + (machine.machine_name || '')) : t('Khởi tạo downtime mới', 'Start a new downtime event'),
    '<div class="mesx-form-grid">' +
      (machine ? fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') : editableField('mes-dt-machine', t('Máy', 'Machine'), '<select class="mesx-select" id="mes-dt-machine">' + renderSelectOptions(state.snapshot.machine_wall || [], 'machine_id', function(item){ return [item.machine_id, item.machine_name].filter(Boolean).join(' · '); }, '', t('Chọn máy', 'Select machine')) + '</select>')) +
      editableField('mes-dt-category', t('Phân loại', 'Category'), '<select class="mesx-select" id="mes-dt-category"><option value="breakdown">Breakdown</option><option value="planned_pm">Planned PM</option><option value="setup">Setup / Changeover</option><option value="material_wait">Material wait</option><option value="quality_hold">Quality hold</option><option value="tool_change">Tool change</option><option value="utility">Utility / power</option><option value="other">Other</option></select>') +
      editableField('mes-dt-severity', t('Mức độ', 'Severity'), '<select class="mesx-select" id="mes-dt-severity"><option value="minor">' + esc(t('Nhẹ', 'Minor')) + '</option><option value="major" selected>' + esc(t('Lớn', 'Major')) + '</option><option value="critical">' + esc(t('Nghiêm trọng', 'Critical')) + '</option></select>') +
      editableField('mes-dt-start', t('Bắt đầu dừng', 'Downtime start'), '<input class="mesx-input" id="mes-dt-start" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-wo', t('WO liên quan', 'Affected WO'), '<select class="mesx-select" id="mes-dt-wo">' + renderSelectOptions(woRows, 'wo_number', function(item){ return [item.wo_number, item.operation_desc, item.part_number].filter(Boolean).join(' · '); }, machine && machine.active_work_order ? machine.active_work_order.wo_number : '', t('Chọn WO bị ảnh hưởng', 'Select affected WO')) + '</select>') +
      editableField('mes-dt-tool', t('Tool liên quan', 'Affected tool'), '<select class="mesx-select" id="mes-dt-tool">' + renderSelectOptions(toolRows, 'tool_id', function(item){ return [item.tool_id, item.tool_name].filter(Boolean).join(' · '); }, '', t('Không chọn tool', 'No tool selected')) + '</select>') +
      editableField('mes-dt-reason', t('Lý do / triệu chứng', 'Reason / symptom'), '<textarea class="mesx-textarea" id="mes-dt-reason" placeholder="' + esc(t('Mô tả điều gì đang xảy ra trên máy...', 'Describe what is happening on the machine...')) + '"></textarea>', true) +
      editableField('mes-dt-note', t('Ghi chú thêm', 'Additional note'), '<textarea class="mesx-textarea" id="mes-dt-note" placeholder="' + esc(t('Ai đã escalation, có ảnh hưởng giao hàng hay không...', 'Who escalated it, whether delivery is affected, etc.')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🚨 ' + esc(t('Tạo downtime', 'Create downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      var selectedMachineId = machine ? (machine.machine_id || '') : ((modal.querySelector('#mes-dt-machine') || {}).value || '');
      api('mes_downtime_create', {
        machine_id: selectedMachineId,
        work_center_id: machine ? machine.work_center_id || '' : workCenterId || '',
        wo_number: (modal.querySelector('#mes-dt-wo') || {}).value || '',
        category: (modal.querySelector('#mes-dt-category') || {}).value || 'breakdown',
        severity: (modal.querySelector('#mes-dt-severity') || {}).value || 'major',
        tool_id: (modal.querySelector('#mes-dt-tool') || {}).value || '',
        started_at: (modal.querySelector('#mes-dt-start') || {}).value || '',
        reason: (modal.querySelector('#mes-dt-reason') || {}).value || '',
        note: (modal.querySelector('#mes-dt-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'downtime_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã tạo sự kiện downtime.', 'Downtime event created.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể tạo downtime.', 'Could not create the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openResolveDowntimeModalLegacy(downtimeId){
  var row = downtimeById(downtimeId);
  if(!row){ toast(t('Không tìm thấy downtime cần khôi phục.', 'Could not find the downtime event to resolve.'), 'error'); return; }
  showModal(
    t('Khôi phục downtime', 'Resolve downtime'),
    (row.machine_id || '') + ' · ' + (row.wo_number || t('Không có WO', 'No WO')),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Lý do gốc', 'Root reason'), row.reason || '—') +
      fieldDisplay(t('Bắt đầu dừng', 'Downtime start'), fmtDateTime(row.started_at || '')) +
      editableField('mes-dt-resume', t('Trạng thái WO sau khôi phục', 'WO status after recovery'), '<select class="mesx-select" id="mes-dt-resume"><option value="setup">Setup</option><option value="running" selected>Running</option><option value="inspection">Inspection</option><option value="on_hold">On Hold</option></select>') +
      editableField('mes-dt-code', t('Mã khôi phục', 'Resolution code'), '<select class="mesx-select" id="mes-dt-code"><option value="resolved">' + esc(t('Đã khôi phục', 'Resolved')) + '</option><option value="temporary_fix">' + esc(t('Khắc phục tạm', 'Temporary fix')) + '</option><option value="awaiting_parts">' + esc(t('Chờ phụ tùng', 'Awaiting parts')) + '</option></select>') +
      editableField('mes-dt-resolved-at', t('Thời điểm khôi phục', 'Resolved at'), '<input class="mesx-input" id="mes-dt-resolved-at" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-action', t('Hành động khắc phục', 'Corrective action'), '<textarea class="mesx-textarea" id="mes-dt-action" placeholder="' + esc(t('Mô tả hành động khắc phục đã thực hiện...', 'Describe the corrective action applied...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>✅ ' + esc(t('Khôi phục và đóng downtime', 'Resolve and close downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_downtime_resolve', {
        downtime_id: row.downtime_id || '',
        resume_status: (modal.querySelector('#mes-dt-resume') || {}).value || 'running',
        resolution_code: (modal.querySelector('#mes-dt-code') || {}).value || 'resolved',
        resolved_at: (modal.querySelector('#mes-dt-resolved-at') || {}).value || '',
        corrective_action: (modal.querySelector('#mes-dt-action') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok){
          toast(governanceFailureMessage(resp, 'Không thể khôi phục downtime.', 'Could not resolve the downtime event.'), 'error');
          if(window.console) console.error(resp);
          return;
        }
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã khôi phục downtime.', 'Downtime resolved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể khôi phục downtime.', 'Could not resolve the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openMaintenanceModal(machineId){
  var machine = machineId ? machineById(machineId) : null;
  var toolRows = machineId ? toolOptionsForMachine(machineId) : [];
  showModal(
    t('Tạo yêu cầu bảo trì', 'Create maintenance request'),
    machine ? ((machine.machine_id || '') + ' · ' + (machine.machine_name || '')) : t('Khởi tạo maintenance mới', 'Start a new maintenance request'),
    '<div class="mesx-form-grid">' +
      (machine ? fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') : editableField('mes-mnt-machine', t('Máy', 'Machine'), '<select class="mesx-select" id="mes-mnt-machine">' + renderSelectOptions(state.snapshot.machine_wall || [], 'machine_id', function(item){ return [item.machine_id, item.machine_name].filter(Boolean).join(' · '); }, '', t('Chọn máy', 'Select machine')) + '</select>')) +
      editableField('mes-mnt-type', t('Loại bảo trì', 'Maintenance type'), '<select class="mesx-select" id="mes-mnt-type"><option value="corrective">' + esc(t('Khắc phục', 'Corrective')) + '</option><option value="preventive">' + esc(t('Phòng ngừa', 'Preventive')) + '</option><option value="inspection">' + esc(t('Kiểm tra', 'Inspection')) + '</option></select>') +
      editableField('mes-mnt-priority', t('Ưu tiên', 'Priority'), '<select class="mesx-select" id="mes-mnt-priority"><option value="low">' + esc(t('Thấp', 'Low')) + '</option><option value="medium" selected>' + esc(t('Trung bình', 'Medium')) + '</option><option value="high">' + esc(t('Cao', 'High')) + '</option><option value="critical">' + esc(t('Khẩn cấp', 'Critical')) + '</option></select>') +
      editableField('mes-mnt-title', t('Tiêu đề', 'Title'), '<input class="mesx-input" id="mes-mnt-title" type="text" placeholder="' + esc(t('Ví dụ: Rò rỉ coolant trục chính', 'Example: Spindle coolant leak')) + '">', true) +
      editableField('mes-mnt-desc', t('Mô tả công việc', 'Work description'), '<textarea class="mesx-textarea" id="mes-mnt-desc" placeholder="' + esc(t('Mô tả rõ triệu chứng, rủi ro và yêu cầu xử lý...', 'Describe the symptom, risk, and requested action...')) + '"></textarea>', true) +
      editableField('mes-mnt-wo', t('WO liên quan', 'Related WO'), '<select class="mesx-select" id="mes-mnt-wo">' + renderSelectOptions(machine ? workOrderOptions(machine.machine_id) : (state.snapshot.dispatch || []), 'wo_number', function(item){ return [item.wo_number, item.operation_desc, item.part_number].filter(Boolean).join(' · '); }, machine && machine.active_work_order ? machine.active_work_order.wo_number : '', t('Không gắn WO cụ thể', 'No specific WO')) + '</select>') +
      editableField('mes-mnt-tool', t('Tool / đồ gá liên quan', 'Related tool / fixture'), '<select class="mesx-select" id="mes-mnt-tool">' + renderSelectOptions(toolRows, 'tool_id', function(item){ return [item.tool_id, item.tool_name].filter(Boolean).join(' · '); }, '', t('Không chọn tooling', 'No tooling selected')) + '</select>') +
      editableField('mes-mnt-assigned', t('Phân công', 'Assigned to'), '<select class="mesx-select" id="mes-mnt-assigned">' + renderSelectOptions(operatorOptions(machine ? machine.work_center_id : ''), 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, '', t('Chưa phân công', 'Unassigned')) + '</select>') +
      editableField('mes-mnt-due', t('Ngày cần xong', 'Due date'), '<input class="mesx-input" id="mes-mnt-due" type="date" value="' + esc(machine && machine.next_pm_date ? String(machine.next_pm_date).slice(0, 10) : '') + '">') +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🛠 ' + esc(t('Tạo request', 'Create request')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      var selectedMachineId = machine ? (machine.machine_id || '') : ((modal.querySelector('#mes-mnt-machine') || {}).value || '');
      api('mes_maintenance_create', {
        machine_id: selectedMachineId,
        maintenance_type: (modal.querySelector('#mes-mnt-type') || {}).value || 'corrective',
        priority: (modal.querySelector('#mes-mnt-priority') || {}).value || 'medium',
        title: (modal.querySelector('#mes-mnt-title') || {}).value || '',
        description: (modal.querySelector('#mes-mnt-desc') || {}).value || '',
        wo_number: (modal.querySelector('#mes-mnt-wo') || {}).value || '',
        tool_id: (modal.querySelector('#mes-mnt-tool') || {}).value || '',
        assigned_to: (modal.querySelector('#mes-mnt-assigned') || {}).value || '',
        due_date: (modal.querySelector('#mes-mnt-due') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'maintenance_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã tạo yêu cầu bảo trì.', 'Maintenance request created.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể tạo yêu cầu bảo trì.', 'Could not create the maintenance request.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openMaintenanceStatusModal(requestId, suggestedStatus){
  var row = maintenanceById(requestId);
  if(!row){ toast(t('Không tìm thấy maintenance request.', 'Could not find the maintenance request.'), 'error'); return; }
  showModal(
    t('Cập nhật trạng thái bảo trì', 'Update maintenance status'),
    (row.machine_id || '') + ' · ' + (row.title || ''),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Request ID', 'Request ID'), row.request_id || '—') +
      fieldDisplay(t('Loại bảo trì', 'Maintenance type'), row.maintenance_type || '—') +
      editableField('mes-mu-status', t('Trạng thái mới', 'New status'), '<select class="mesx-select" id="mes-mu-status"><option value="approved"' + (suggestedStatus === 'approved' ? ' selected' : '') + '>' + esc(t('Đã duyệt', 'Approved')) + '</option><option value="in_progress"' + (suggestedStatus === 'in_progress' ? ' selected' : '') + '>' + esc(t('Đang thực hiện', 'In progress')) + '</option><option value="completed"' + (suggestedStatus === 'completed' ? ' selected' : '') + '>' + esc(t('Hoàn tất', 'Completed')) + '</option><option value="cancelled"' + (suggestedStatus === 'cancelled' ? ' selected' : '') + '>' + esc(t('Đã hủy', 'Cancelled')) + '</option></select>') +
      editableField('mes-mu-assigned', t('Phân công', 'Assigned to'), '<select class="mesx-select" id="mes-mu-assigned">' + renderSelectOptions(operatorOptions(row.work_center_id || ''), 'operator_id', function(item){ return [item.operator_id, item.operator_name].filter(Boolean).join(' · '); }, row.assigned_to || '', t('Giữ nguyên', 'Keep current')) + '</select>') +
      editableField('mes-mu-next-pm', t('Ngày PM kế tiếp', 'Next PM date'), '<input class="mesx-input" id="mes-mu-next-pm" type="date" value="' + esc((row.next_pm_date || '').slice(0, 10)) + '">') +
      editableField('mes-mu-note', t('Ghi chú kỹ thuật', 'Technical note'), '<textarea class="mesx-textarea" id="mes-mu-note" placeholder="' + esc(t('Mô tả xử lý, linh kiện thay thế, rủi ro còn lại...', 'Describe the fix, replaced parts, and remaining risk...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>💾 ' + esc(t('Cập nhật trạng thái', 'Update status')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_maintenance_update_status', {
        request_id: row.request_id || '',
        status: (modal.querySelector('#mes-mu-status') || {}).value || suggestedStatus || 'approved',
        assigned_to: (modal.querySelector('#mes-mu-assigned') || {}).value || '',
        note: (modal.querySelector('#mes-mu-note') || {}).value || '',
        next_pm_date: (modal.querySelector('#mes-mu-next-pm') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'maintenance_update_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật trạng thái bảo trì.', 'Maintenance status updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật trạng thái bảo trì.', 'Could not update the maintenance status.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openToolingModal(machineId, toolRuntimeId){
  var machine = machineById(machineId);
  if(!machine){ toast(t('Không tìm thấy máy cần cập nhật tooling.', 'Could not find the machine for tooling update.'), 'error'); return; }
  var existing = toolRuntimeId ? toolRuntimeById(toolRuntimeId) : null;
  var toolRows = toolOptionsForMachine(machineId);
  var woRows = workOrderOptions(machineId);
  showModal(
    existing ? t('Cập nhật runtime tooling', 'Update tooling runtime') : t('Nạp / cập nhật tooling', 'Load or update tooling'),
    (machine.machine_id || '') + ' · ' + (machine.machine_name || ''),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') +
      fieldDisplay(t('Tool runtime ID', 'Tool runtime ID'), existing ? (existing.tool_runtime_id || '—') : t('Sẽ tự cấp', 'Will be generated')) +
      editableField('mes-tool-id', t('Tool / đồ gá', 'Tool / fixture'), '<select class="mesx-select" id="mes-tool-id">' + renderSelectOptions(toolRows, 'tool_id', function(item){ return [item.tool_id, item.tool_name, item.tool_type].filter(Boolean).join(' · '); }, existing ? (existing.tool_id || '') : '', t('Chọn tool', 'Select tool')) + '</select>') +
      editableField('mes-tool-wo', t('WO đang dùng', 'Current WO'), '<select class="mesx-select" id="mes-tool-wo">' + renderSelectOptions(woRows, 'wo_number', function(item){ return [item.wo_number, item.operation_desc, item.part_number].filter(Boolean).join(' · '); }, existing ? (existing.wo_number || '') : (machine.active_work_order ? machine.active_work_order.wo_number : ''), t('Không gắn WO', 'No WO linked')) + '</select>') +
      editableField('mes-tool-pocket', t('Pocket / station', 'Pocket / station'), '<input class="mesx-input" id="mes-tool-pocket" type="text" value="' + esc(existing ? (existing.pocket || '') : '') + '" placeholder="' + esc(t('Ví dụ: T12', 'Example: T12')) + '">') +
      editableField('mes-tool-offset-no', t('Offset number', 'Offset number'), '<input class="mesx-input" id="mes-tool-offset-no" type="text" value="' + esc(existing ? (existing.offset_number || '') : '') + '" placeholder="' + esc(t('Ví dụ: H12 / D12', 'Example: H12 / D12')) + '">') +
      editableField('mes-tool-status', t('Trạng thái tool', 'Tool status'), '<select class="mesx-select" id="mes-tool-status"><option value="loaded"' + ((existing ? existing.tool_status : 'loaded') === 'loaded' ? ' selected' : '') + '>Loaded</option><option value="standby"' + ((existing ? existing.tool_status : '') === 'standby' ? ' selected' : '') + '>Standby</option><option value="expired"' + ((existing ? existing.tool_status : '') === 'expired' ? ' selected' : '') + '>Expired</option><option value="broken"' + ((existing ? existing.tool_status : '') === 'broken' ? ' selected' : '') + '>Broken</option><option value="quarantine"' + ((existing ? existing.tool_status : '') === 'quarantine' ? ' selected' : '') + '>Quarantine</option></select>') +
      editableField('mes-tool-offset-status', t('Trạng thái offset', 'Offset status'), '<select class="mesx-select" id="mes-tool-offset-status"><option value="verified"' + ((existing ? existing.offset_status : 'verified') === 'verified' ? ' selected' : '') + '>Verified</option><option value="adjusted"' + ((existing ? existing.offset_status : '') === 'adjusted' ? ' selected' : '') + '>Adjusted</option><option value="adjustment_required"' + ((existing ? existing.offset_status : '') === 'adjustment_required' ? ' selected' : '') + '>Adjustment required</option><option value="out_of_control"' + ((existing ? existing.offset_status : '') === 'out_of_control' ? ' selected' : '') + '>Out of control</option></select>') +
      editableField('mes-tool-life-min', t('Life đã dùng (phút)', 'Life used (minutes)'), '<input class="mesx-input" id="mes-tool-life-min" type="number" min="0" value="' + esc(existing ? Number(existing.life_used_minutes || 0) : 0) + '">') +
      editableField('mes-tool-life-parts', t('Life đã dùng (chi tiết)', 'Life used (parts)'), '<input class="mesx-input" id="mes-tool-life-parts" type="number" min="0" value="' + esc(existing ? Number(existing.life_used_parts || 0) : 0) + '">') +
      editableField('mes-tool-offset-delta', t('Offset delta (mm)', 'Offset delta (mm)'), '<input class="mesx-input" id="mes-tool-offset-delta" type="number" step="0.001" value="' + esc(existing ? Number(existing.offset_delta_mm || 0) : 0) + '">') +
      editableField('mes-tool-reset', t('Reset life', 'Reset life'), '<label class="mesx-link" style="display:flex;justify-content:flex-start;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;cursor:pointer"><input id="mes-tool-reset" type="checkbox"> ' + esc(t('Đặt lại tool-life về 0 sau khi thay dao / setup lại.', 'Reset tool life to zero after replacing or reloading the tool.')) + '</label>', true) +
      editableField('mes-tool-note', t('Ghi chú kỹ thuật', 'Technical note'), '<textarea class="mesx-textarea" id="mes-tool-note" placeholder="' + esc(t('Ví dụ: offset trôi 0.02mm, thay insert mới, probe lại...', 'Example: offset drift 0.02mm, insert replaced, re-probed...')) + '">' + esc(existing ? (existing.note || '') : '') + '</textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🛠 ' + esc(existing ? t('Cập nhật tooling', 'Update tooling') : t('Nạp tooling', 'Load tooling')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      api('mes_tooling_upsert', {
        tool_runtime_id: existing ? (existing.tool_runtime_id || '') : '',
        machine_id: machine.machine_id || '',
        work_center_id: machine.work_center_id || '',
        tool_id: (modal.querySelector('#mes-tool-id') || {}).value || '',
        wo_number: (modal.querySelector('#mes-tool-wo') || {}).value || '',
        pocket: (modal.querySelector('#mes-tool-pocket') || {}).value || '',
        offset_number: (modal.querySelector('#mes-tool-offset-no') || {}).value || '',
        tool_status: (modal.querySelector('#mes-tool-status') || {}).value || 'loaded',
        offset_status: (modal.querySelector('#mes-tool-offset-status') || {}).value || 'verified',
        life_used_minutes: Number((modal.querySelector('#mes-tool-life-min') || {}).value || 0),
        life_used_parts: Number((modal.querySelector('#mes-tool-life-parts') || {}).value || 0),
        offset_delta_mm: Number((modal.querySelector('#mes-tool-offset-delta') || {}).value || 0),
        reset_life: !!((modal.querySelector('#mes-tool-reset') || {}).checked),
        note: (modal.querySelector('#mes-tool-note') || {}).value || '',
        last_verified_at: new Date().toISOString()
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'tooling_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã cập nhật runtime tooling.', 'Tooling runtime updated.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể cập nhật tooling.', 'Could not update tooling.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function renderDowntimePareto(rows){
  if(!rows.length){
    return '<div class="mesx-empty"><strong>' + esc(t('Chưa có downtime đủ để phân tích', 'No downtime available for pareto')) + '</strong>' + esc(t('Khi runtime có downtime, bảng pareto sẽ xếp hạng theo tổng phút mất.', 'Once downtime exists in runtime, the pareto view will rank losses by total minutes.')) + '</div>';
  }
  return '<div class="mesx-analytics-stack">' + rows.slice(0, 5).map(function(row){
    var band = Number(row.share_pct || 0) >= 50 ? 'risk' : (Number(row.share_pct || 0) >= 25 ? 'watch' : 'strong');
    var label = t(row.label_vi || row.category || 'Khác', row.label_en || row.category || 'Other');
    var categoryMeta = downtimeCategoryMeta(row.category || 'other');
    var metaLine = [t(categoryMeta.vi, categoryMeta.en), row.reason_group ? (t('Nhóm', 'Group') + ': ' + row.reason_group) : ''].filter(Boolean).join(' · ');
    return '<div class="mesx-pareto-row">' +
      '<div class="mesx-pareto-main"><strong>' + esc(label) + '</strong><span>' + esc([(row.event_count || 0) + ' ' + t('sự kiện', 'events'), (row.open_count || 0) + ' ' + t('đang mở', 'open'), (row.major_count || 0) + ' ' + t('mức major+', 'major+'), metaLine].filter(Boolean).join(' · ')) + '</span><div class="mesx-bar" data-band="' + esc(band) + '" style="margin-top:8px"><span style="width:' + esc(String(Math.max(0, Math.min(100, Number(row.share_pct || 0))))) + '%"></span></div></div>' +
      '<div class="mesx-metric-value">' + esc(fmtMinutes(row.minutes || 0) + ' · ' + fmtPercent(row.share_pct || 0)) + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function openDowntimeModal(machineId){
  var machine = machineId ? machineById(machineId) : null;
  var workCenterId = machine ? machine.work_center_id : state.workCenter;
  var woRows = workOrderOptions(machineId);
  var toolRows = machineId ? toolOptionsForMachine(machineId) : [];
  var defaultCategory = toolRows.length ? 'tool_change' : 'breakdown';
  showModal(
    t('Ghi nhận downtime', 'Create downtime event'),
    machine ? ((machine.machine_id || '') + ' · ' + (machine.machine_name || '')) : t('Khởi tạo downtime mới', 'Start a new downtime event'),
    '<div class="mesx-form-grid">' +
      (machine ? fieldDisplay(t('Work center', 'Work center'), machine.work_center_name || machine.work_center_id || '—') : editableField('mes-dt-machine', t('Máy', 'Machine'), '<select class="mesx-select" id="mes-dt-machine">' + renderSelectOptions(state.snapshot.machine_wall || [], 'machine_id', function(item){ return [item.machine_id, item.machine_name].filter(Boolean).join(' · '); }, '', t('Chọn máy', 'Select machine')) + '</select>')) +
      editableField('mes-dt-category', t('Nhóm downtime', 'Downtime category'), '<select class="mesx-select" id="mes-dt-category"><option value="breakdown"' + (defaultCategory === 'breakdown' ? ' selected' : '') + '>' + esc(t('Hỏng máy', 'Breakdown')) + '</option><option value="planned_pm">' + esc(t('Bảo trì kế hoạch', 'Planned PM')) + '</option><option value="setup"' + (defaultCategory === 'setup' ? ' selected' : '') + '>' + esc(t('Setup / đổi mã', 'Setup / changeover')) + '</option><option value="material_wait">' + esc(t('Chờ vật tư', 'Material wait')) + '</option><option value="quality_hold">' + esc(t('Giữ lô chất lượng', 'Quality hold')) + '</option><option value="tool_change"' + (defaultCategory === 'tool_change' ? ' selected' : '') + '>' + esc(t('Thay dao / chỉnh offset', 'Tool change / offset')) + '</option><option value="utility">' + esc(t('Tiện ích / nguồn', 'Utility / power')) + '</option><option value="other">' + esc(t('Khác', 'Other')) + '</option></select>') +
      editableField('mes-dt-reason-code', t('Mã lý do downtime', 'Downtime reason code'), '<select class="mesx-select" id="mes-dt-reason-code"></select>') +
      editableField('mes-dt-category-view', t('Category bị khóa theo mã', 'Governed category'), '<div class="mesx-mini"><strong data-dt-category-view>—</strong></div>') +
      editableField('mes-dt-severity', t('Mức độ', 'Severity'), '<select class="mesx-select" id="mes-dt-severity"><option value="minor">' + esc(t('Nhẹ', 'Minor')) + '</option><option value="major" selected>' + esc(t('Lớn', 'Major')) + '</option><option value="critical">' + esc(t('Nghiêm trọng', 'Critical')) + '</option></select>') +
      editableField('mes-dt-start', t('Bắt đầu dừng', 'Downtime start'), '<input class="mesx-input" id="mes-dt-start" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-wo', t('WO liên quan', 'Affected WO'), '<select class="mesx-select" id="mes-dt-wo">' + renderSelectOptions(woRows, 'wo_number', function(item){ return [item.wo_number, item.operation_desc, item.part_number].filter(Boolean).join(' · '); }, machine && machine.active_work_order ? machine.active_work_order.wo_number : '', t('Chọn WO bị ảnh hưởng', 'Select affected WO')) + '</select>') +
      editableField('mes-dt-tool', t('Tool liên quan', 'Affected tool'), '<select class="mesx-select" id="mes-dt-tool">' + renderSelectOptions(toolRows, 'tool_id', function(item){ return [item.tool_id, item.tool_name].filter(Boolean).join(' · '); }, '', t('Không chọn tool', 'No tool selected')) + '</select>') +
      editableField('mes-dt-reason', t('Triệu chứng hiện trường', 'Shop-floor symptom'), '<textarea class="mesx-textarea" id="mes-dt-reason" placeholder="' + esc(t('Mô tả điều gì đang xảy ra trên máy, alarm, dao, offset hoặc tín hiệu bất thường...', 'Describe what is happening on the machine: alarm, tool, offset, or abnormal signal...')) + '"></textarea>', true) +
      editableField('mes-dt-note', t('Ghi chú thêm', 'Additional note'), '<textarea class="mesx-textarea" id="mes-dt-note" placeholder="' + esc(t('Ai đã escalation, có ảnh hưởng giao hàng hay không, cần hỗ trợ gì thêm...', 'Who escalated it, whether delivery is affected, and what extra support is needed...')) + '"></textarea>', true) +
      editableField('mes-dt-reason-meta', t('Quy tắc escalation', 'Escalation rule'), '<div class="mesx-mini"><strong data-dt-reason-meta>' + esc(t('Chọn mã lý do để hệ thống khóa category, severity mặc định và SLA escalation.', 'Select a reason code so the system can govern category, default severity, and escalation SLA.')) + '</strong></div>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>🚨 ' + esc(t('Tạo downtime', 'Create downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      var selectedMachineId = machine ? (machine.machine_id || '') : ((modal.querySelector('#mes-dt-machine') || {}).value || '');
      var severitySelect = modal.querySelector('#mes-dt-severity');
      var reasonCode = (modal.querySelector('#mes-dt-reason-code') || {}).value || '';
      if(!reasonCode){
        toast(t('Cần chọn mã lý do downtime trước khi tạo sự kiện.', 'A governed downtime reason code is required before creating the event.'), 'error');
        submit.disabled = false;
        return;
      }
      api('mes_downtime_create', {
        machine_id: selectedMachineId,
        work_center_id: machine ? machine.work_center_id || '' : workCenterId || '',
        wo_number: (modal.querySelector('#mes-dt-wo') || {}).value || '',
        category: (modal.querySelector('#mes-dt-category') || {}).value || defaultCategory,
        reason_code: reasonCode,
        severity: severitySelect ? (severitySelect.value || 'major') : 'major',
        tool_id: (modal.querySelector('#mes-dt-tool') || {}).value || '',
        started_at: (modal.querySelector('#mes-dt-start') || {}).value || '',
        reason: (modal.querySelector('#mes-dt-reason') || {}).value || '',
        note: (modal.querySelector('#mes-dt-note') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok) throw new Error((resp && resp.error) || 'downtime_failed');
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã tạo sự kiện downtime.', 'Downtime event created.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể tạo downtime.', 'Could not create the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  if(state.modal){
    var categorySelect = state.modal.querySelector('#mes-dt-category');
    var severitySelect = state.modal.querySelector('#mes-dt-severity');
    if(categorySelect) categorySelect.onchange = function(){ syncDowntimeReasonFields(state.modal); };
    if(severitySelect) severitySelect.onchange = function(){ severitySelect.dataset.lockedByUser = '1'; };
    syncDowntimeReasonFields(state.modal);
    var reasonSelect = state.modal.querySelector('#mes-dt-reason-code');
    if(reasonSelect) reasonSelect.onchange = function(){ syncDowntimeReasonFields(state.modal); };
  }
  bindModalButtons();
}

function openResolveDowntimeModal(downtimeId){
  var row = downtimeById(downtimeId);
  if(!row){ toast(t('Không tìm thấy downtime cần khôi phục.', 'Could not find the downtime event to resolve.'), 'error'); return; }
  var reasonLabel = [row.reason_code || '', row.reason_name_vi || row.reason_name || '', row.reason || ''].filter(Boolean).join(' · ');
  showModal(
    t('Khôi phục downtime', 'Resolve downtime'),
    (row.machine_id || '') + ' · ' + (row.wo_number || t('Không có WO', 'No WO')),
    '<div class="mesx-form-grid">' +
      fieldDisplay(t('Mã lý do / triệu chứng', 'Reason code / symptom'), reasonLabel || '—') +
      fieldDisplay(t('Bắt đầu dừng', 'Downtime start'), fmtDateTime(row.started_at || '')) +
      editableField('mes-dt-resume', t('Trạng thái WO sau khôi phục', 'WO status after recovery'), '<select class="mesx-select" id="mes-dt-resume"><option value="setup">Setup</option><option value="running" selected>Running</option><option value="inspection">Inspection</option><option value="on_hold">On Hold</option></select>') +
      editableField('mes-dt-code', t('Mã khôi phục', 'Resolution code'), '<select class="mesx-select" id="mes-dt-code">' + renderResolutionCodeOptions('resolved') + '</select>') +
      editableField('mes-dt-resolved-at', t('Thời điểm khôi phục', 'Resolved at'), '<input class="mesx-input" id="mes-dt-resolved-at" type="datetime-local" value="' + esc(nowInputValue()) + '">') +
      editableField('mes-dt-action', t('Hành động khắc phục', 'Corrective action'), '<textarea class="mesx-textarea" id="mes-dt-action" placeholder="' + esc(t('Mô tả hành động khắc phục đã thực hiện, ai xác nhận, có thay dao / nạp lại chương trình hay không...', 'Describe the corrective action, who verified it, and whether tooling or NC program was changed...')) + '"></textarea>', true) +
      '<div class="full mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Hủy', 'Cancel')) + '</button><button type="button" class="mesx-btn primary" data-modal-submit>✅ ' + esc(t('Khôi phục và đóng downtime', 'Resolve and close downtime')) + '</button></div>' +
    '</div>',
    function(modal, submit){
      submit.disabled = true;
      var resolutionCode = (modal.querySelector('#mes-dt-code') || {}).value || '';
      if(!resolutionCode){
        toast(t('Cần chọn mã khôi phục downtime.', 'A governed resolution code is required.'), 'error');
        submit.disabled = false;
        return;
      }
      api('mes_downtime_resolve', {
        downtime_id: row.downtime_id || '',
        resume_status: (modal.querySelector('#mes-dt-resume') || {}).value || 'running',
        resolution_code: resolutionCode,
        resolved_at: (modal.querySelector('#mes-dt-resolved-at') || {}).value || '',
        corrective_action: (modal.querySelector('#mes-dt-action') || {}).value || ''
      }, 'POST').then(function(resp){
        if(!resp || !resp.ok){
          toast(governanceFailureMessage(resp, 'Không thể khôi phục downtime.', 'Could not resolve the downtime event.'), 'error');
          if(window.console) console.error(resp);
          return;
        }
        state.snapshot = resp.data || state.snapshot;
        toast(t('Đã khôi phục downtime.', 'Downtime resolved.'), 'success');
        closeModal();
        render();
      }).catch(function(error){
        toast(t('Không thể khôi phục downtime.', 'Could not resolve the downtime event.'), 'error');
        if(window.console) console.error(error);
      }).finally(function(){ submit.disabled = false; });
    }
  );
  bindModalButtons();
}

function openExceptionDetail(type){
  if(!type) return;
  api('exception_detail', { type:type, page:1, per_page:25 }, 'GET').then(function(resp){
    var rows = resp && Array.isArray(resp.items) ? resp.items : [];
    var meta = EXCEPTION_META[type] || { vi:type, en:type, icon:'•' };
    var body = rows.length ? '<table class="mesx-detail-table"><thead><tr><th>' + esc(t('Mã', 'ID')) + '</th><th>' + esc(t('Ngày', 'Date')) + '</th><th>' + esc(t('Phụ trách', 'Responsible')) + '</th><th>' + esc(t('Chi tiết', 'Detail')) + '</th></tr></thead><tbody>' + rows.map(function(item){ return '<tr><td class="mesx-code">' + esc(item.id || '') + '</td><td>' + esc(item.date || '—') + '</td><td>' + esc(item.responsible || '—') + '</td><td>' + esc(item.detail || '—') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="mesx-empty"><strong>' + esc(t('Không có bản ghi exception', 'No exception records')) + '</strong>' + esc(t('Snapshot hiện tại không ghi nhận mục chi tiết nào trong nhóm này.', 'The current snapshot has no detail rows in this exception group.')) + '</div>';
    showModal(t(meta.vi, meta.en), t('Hàng đợi chi tiết để trưởng ca / quản lý xử lý dứt điểm.', 'Detailed queue for supervisors and managers to close out.'), body + '<div class="mesx-modal-foot"><button type="button" class="mesx-btn ghost" data-open-exception-dashboard>⚠️ ' + esc(t('Mở bảng ngoại lệ', 'Open exception dashboard')) + '</button><button type="button" class="mesx-btn ghost" data-modal-cancel>↩ ' + esc(t('Đóng', 'Close')) + '</button></div>');
    bindModalButtons();
    var jump = document.querySelector('.mesx-modal [data-open-exception-dashboard]');
    if(jump){
      jump.onclick = function(){
        closeModal();
        if(typeof navigateTo === 'function') navigateTo('exceptions');
      };
    }
  }).catch(function(error){
    toast(t('Không thể tải chi tiết exception.', 'Could not load the exception detail.'), 'error');
    if(window.console) console.error(error);
  });
}

window._renderMesControlCenter = function(container){
  state.container = container || document.getElementById('page-mes');
  ensureStyles();
  disconnectStream();
  stopPolling();
  loadData().finally(function(){
    if(streamEligible((state.snapshot || {}).runtime_mode || {})){
      connectStream();
      if(state.streamStatus !== 'live' && state.streamStatus !== 'connecting'){
        startPolling();
      }
    } else {
      state.streamStatus = 'polling';
      startPolling();
    }
  });
};

})();


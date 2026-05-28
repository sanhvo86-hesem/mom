/* Order Management Workspace */
(function(){
'use strict';

var _container = null;
var _id = 'sojowo';
var _view = 'hierarchy';
var _hierarchy = [];
var _flat = [];
var _kpi = {};
var _selected = null;
var _tableSearch = '';
var _tableSort = { key:'risk', dir:'asc' };
var _dragItem = null;
var _filters = { search:'', type:'all', band:'all', phase:'all' };
var _lastRefreshAt = '';
/* PR #2 (Orders module redesign) — top-level tab between five views.
 * The default 'so-jo-wo' tab preserves the original Order Control Tower.
 * Other tabs are wired here as placeholder shells that subsequent PRs
 * (#3 AI Intake Queue, #4 Customer POs + Quarantine, #5 SO badge +
 * chain breadcrumb) fill in. Keeping the tab state in this module
 * avoids touching frozen 02-state-auth-ui.js. */
var _activeTab = 'so-jo-wo';
var ORDERS_TABS = [
  { id:'so-jo-wo',     icon:'🛒', labelVi:'Đơn hàng SO/JO/WO',  labelEn:'SO / JO / WO',          status:'ready' },
  { id:'customer-pos', icon:'📋', labelVi:'Customer POs',        labelEn:'Customer POs',          status:'coming' },
  { id:'ai-intake',    icon:'🤖', labelVi:'AI Intake Queue',     labelEn:'AI Intake Queue',       status:'coming' },
  { id:'quarantine',   icon:'🔒', labelVi:'Security Quarantine', labelEn:'Security Quarantine',   status:'coming' },
  { id:'logs',         icon:'📑', labelVi:'Logs & Diagnostics',  labelEn:'Logs & Diagnostics',    status:'coming' }
];

/* STATUS — đọc từ HmRegistry → 'so_status', 'jo_status', 'wo_status' (single source of truth) */
var STATUS = (function(){
  var result = { so:{}, jo:{}, wo:{} };
  function _fill(key, regKey){
    if(window.HmRegistry){
      var opts = HmRegistry.statusSet(regKey);
      if(opts && opts.length){
        opts.forEach(function(o){ result[key][o.value] = {vi:o.label, en:o.labelEn||o.label, color:o.color}; });
      }
    }
    if(!Object.keys(result[key]).length && (!window.HmRegistry || (typeof HmRegistry.shouldWarnMissingStatusSet === 'function' ? HmRegistry.shouldWarnMissingStatusSet(regKey) : true))){
      console.warn('[SO-JO-WO] Registry key "' + regKey + '" trống hoặc chưa tải — dropdown sẽ bị thiếu dữ liệu.');
    }
  }
  _fill('so', 'so_status');
  _fill('jo', 'jo_status');
  _fill('wo', 'wo_status');
  return result;
})();

var TRANSITIONS = {
  so:{ draft:['quoted','cancelled'], quoted:['confirmed','draft','cancelled'], confirmed:['in_production','cancelled'], in_production:['shipped','cancelled'], shipped:['closed'], closed:[], cancelled:[] },
  jo:{ planned:['released'], released:['active','on_hold'], active:['on_hold','completed'], on_hold:['active','released'], completed:['closed'], closed:[] },
  wo:{ scheduled:['setup','on_hold'], setup:['running','on_hold'], running:['inspection','completed','on_hold'], inspection:['completed','running'], completed:[], on_hold:['scheduled','setup','running'] }
};

var BAND_META = {
  critical:{ vi:'Chặn', en:'Blocked', color:'var(--red-light,#b42318)', bg:'rgba(180,35,24,.10)' },
  warning:{ vi:'Theo dõi', en:'Watch', color:'var(--amber-light,#b9691f)', bg:'rgba(185,105,31,.12)' },
  ready:{ vi:'Ổn định', en:'Stable', color:'var(--green-dark,#0f766e)', bg:'rgba(15,118,110,.10)' },
  not_required:{ vi:'Không yêu cầu', en:'Not required', color:'var(--text-secondary,#667085)', bg:'rgba(102,112,133,.10)' },
  info:{ vi:'Thông tin', en:'Info', color:'var(--blue-light,#2978b5)', bg:'rgba(41,120,181,.10)' }
};

var PHASE_META = {
  commercial:{ vi:'Thương mại', en:'Commercial' },
  engineering:{ vi:'Kỹ thuật', en:'Engineering' },
  planning:{ vi:'Lập lịch', en:'Planning' },
  execution:{ vi:'Thực thi', en:'Execution' },
  quality:{ vi:'Chất lượng', en:'Quality' },
  fulfillment:{ vi:'Giao hàng', en:'Fulfillment' },
  exception:{ vi:'Ngoại lệ', en:'Exception' },
  closed:{ vi:'Đóng', en:'Closed' },
  cancelled:{ vi:'Hủy', en:'Cancelled' }
};

var FOUNDATION_GROUPS = [
  { key:'commercial', titleVi:'Nền thương mại', titleEn:'Commercial foundations', items:['customer_sites','commercial_accounts','incoterms','payment_terms','shipping_methods','promise_policies'] },
  { key:'engineering', titleVi:'Nền kỹ thuật', titleEn:'Engineering foundations', items:['routing_library','bom_library','control_plans','inspection_plans','traveler_templates','launch_gate_templates'] },
  { key:'quality', titleVi:'Nền chất lượng & giao hàng', titleEn:'Quality and fulfillment foundations', items:['quality_gate_profiles','customer_item_approvals','supplier_process_approvals','warehouse_locations'] }
];

var FIELDS = {
  so: [
    { key:'so_number', labelVi:'Số SO thủ công (tùy chọn)', labelEn:'Manual SO Number (Optional)' },
    { key:'customer_id', labelVi:'Khách hàng', labelEn:'Customer', lookup:'customers', required:true },
    { key:'customer_site_id', labelVi:'Site khách hàng', labelEn:'Customer Site', lookup:'customer_sites' },
    { key:'ship_to_site_id', labelVi:'Ship-to site', labelEn:'Ship-to Site', lookup:'customer_sites' },
    { key:'customer_po', labelVi:'PO khách hàng', labelEn:'Customer PO', required:true },
    { key:'order_date', labelVi:'Ngày đơn hàng', labelEn:'Order Date', type:'date', required:true },
    { key:'requested_date', labelVi:'Ngày khách cần', labelEn:'Requested Date', type:'date' },
    { key:'promise_date', labelVi:'Ngày hứa', labelEn:'Promise Date', type:'date' },
    { key:'commit_date', labelVi:'Ngày cam kết nội bộ', labelEn:'Internal Commit Date', type:'date' },
    { key:'due_date', labelVi:'Ngày giao hàng', labelEn:'Due Date', type:'date', required:true },
    { key:'total_qty', labelVi:'Tổng số lượng', labelEn:'Total Qty', type:'integer', required:true },
    { key:'total_value', labelVi:'Giá trị đơn hàng (USD)', labelEn:'Order Value (USD)', type:'number' },
    { key:'priority', labelVi:'Mức ưu tiên', labelEn:'Priority', type:'select', optionSet:'priority' },
    { key:'incoterm_code', labelVi:'Incoterm', labelEn:'Incoterm', lookup:'incoterms' },
    { key:'shipping_method_id', labelVi:'Phương thức giao', labelEn:'Shipping Method', lookup:'shipping_methods' },
    { key:'payment_term_code', labelVi:'Điều khoản thanh toán', labelEn:'Payment Term', lookup:'payment_terms' },
    { key:'contract_review', labelVi:'Mã xem xét hợp đồng', labelEn:'Contract Review Ref' },
    { key:'contract_review_status', labelVi:'Trạng thái contract review', labelEn:'Contract Review Status', type:'select', optionSet:'contract_review_status' },
    { key:'fulfillment_status', labelVi:'Trạng thái fulfillment', labelEn:'Fulfillment Status', type:'select', optionSet:'fulfillment_status' },
    { key:'special_requirements', labelVi:'Yêu cầu đặc biệt', labelEn:'Special Requirements', type:'textarea', span:'wide' }
  ],
  jo: [
    { key:'jo_number', labelVi:'Số JO thủ công (tùy chọn)', labelEn:'Manual JO Number (Optional)' },
    { key:'so_number', labelVi:'SO gốc', labelEn:'Parent SO', lookup:'so', required:true },
    { key:'part_number', labelVi:'Part Number', labelEn:'Part Number', lookup:'parts', required:true },
    { key:'part_revision', labelVi:'Revision', labelEn:'Revision', lookup:'revisions', required:true },
    { key:'part_description', labelVi:'Mô tả chi tiết', labelEn:'Part Description', readonly:true, span:'wide' },
    { key:'material_spec', labelVi:'Yêu cầu vật liệu', labelEn:'Material Spec', required:true },
    { key:'qty_ordered', labelVi:'Số lượng đặt', labelEn:'Qty Ordered', type:'integer', required:true },
    { key:'start_date', labelVi:'Ngày bắt đầu kế hoạch', labelEn:'Planned Start Date', type:'date', required:true },
    { key:'release_target_date', labelVi:'Mốc phát hành', labelEn:'Release Target Date', type:'date' },
    { key:'due_date', labelVi:'Ngày đến hạn JO', labelEn:'Job Due Date', type:'date', required:true },
    { key:'routing_id', labelVi:'Routing', labelEn:'Routing', lookup:'routing_library' },
    { key:'bom_id', labelVi:'BOM', labelEn:'BOM', lookup:'bom_library' },
    { key:'control_plan_id', labelVi:'Control Plan', labelEn:'Control Plan', lookup:'control_plans' },
    { key:'inspection_plan_id', labelVi:'Inspection Plan', labelEn:'Inspection Plan', lookup:'inspection_plans' },
    { key:'traveler_template_id', labelVi:'Traveler template', labelEn:'Traveler Template', lookup:'traveler_templates' },
    { key:'engineering_release_status', labelVi:'Phát hành kỹ thuật', labelEn:'Engineering Release', type:'select', optionSet:'engineering_release_status' },
    { key:'material_ready_status', labelVi:'Sẵn sàng vật tư', labelEn:'Material Readiness', type:'select', optionSet:'material_ready_status' },
    { key:'quality_plan_status', labelVi:'Kế hoạch chất lượng', labelEn:'Quality Plan', type:'select', optionSet:'quality_plan_status' },
    { key:'source_inspection_status', labelVi:'Source inspection', labelEn:'Source Inspection', type:'select', optionSet:'source_inspection_status' },
    { key:'outside_processing_status', labelVi:'Outside processing', labelEn:'Outside Processing', type:'select', optionSet:'outside_processing_status' },
    { key:'fai_required', labelVi:'Yêu cầu FAI', labelEn:'FAI Required', type:'boolean' },
    { key:'customer_source_inspection', labelVi:'Khách hàng witness / source inspection', labelEn:'Customer Source Inspection', type:'boolean' },
    { key:'special_process', labelVi:'Công đoạn đặc biệt', labelEn:'Special Process' },
    { key:'special_process_supplier_id', labelVi:'Nhà cung cấp công đoạn', labelEn:'Special Process Supplier', lookup:'suppliers' }
  ],
  wo: [
    { key:'wo_number', labelVi:'Số WO thủ công (tùy chọn)', labelEn:'Manual WO Number (Optional)' },
    { key:'jo_number', labelVi:'JO gốc', labelEn:'Parent JO', lookup:'jo', required:true },
    { key:'operation_number', labelVi:'Số công đoạn', labelEn:'Operation Number', type:'integer', required:true },
    { key:'operation_desc', labelVi:'Tên công đoạn', labelEn:'Operation Description', required:true, span:'wide' },
    { key:'machine_id', labelVi:'Mã máy', labelEn:'Machine ID', lookup:'machines', required:true },
    { key:'work_center_id', labelVi:'Mã work center', labelEn:'Work Center ID', lookup:'work_centers', required:true },
    { key:'operator_id', labelVi:'Người vận hành', labelEn:'Operator', lookup:'operators' },
    { key:'dispatch_priority', labelVi:'Ưu tiên dispatch', labelEn:'Dispatch Priority', type:'select', optionSet:'dispatch_priority' },
    { key:'nc_program_id', labelVi:'Mã chương trình NC', labelEn:'NC Program ID' },
    { key:'setup_time_est', labelVi:'Setup kế hoạch (phút)', labelEn:'Estimated Setup (min)', type:'number' },
    { key:'run_time_est', labelVi:'Run kế hoạch (phút)', labelEn:'Estimated Run (min)', type:'number' },
    { key:'scheduled_start', labelVi:'Bắt đầu kế hoạch', labelEn:'Scheduled Start', type:'datetime' },
    { key:'scheduled_end', labelVi:'Kết thúc kế hoạch', labelEn:'Scheduled End', type:'datetime' },
    { key:'fixture_id', labelVi:'Mã đồ gá', labelEn:'Fixture ID' },
    { key:'quality_gate_status', labelVi:'Quality gate', labelEn:'Quality Gate', type:'select', optionSet:'quality_gate_status' },
    { key:'first_piece_status', labelVi:'First piece', labelEn:'First Piece', type:'select', optionSet:'first_piece_status' },
    { key:'handover_status', labelVi:'Bàn giao', labelEn:'Handover', type:'select', optionSet:'handover_status' },
    { key:'material_lot_number', labelVi:'Số lô vật liệu', labelEn:'Material Lot Number' },
    { key:'heat_number', labelVi:'Số heat / melt', labelEn:'Heat Number' },
    { key:'traveler_number', labelVi:'Mã traveler', labelEn:'Traveler Number' },
    { key:'traveler_status', labelVi:'Trạng thái traveler', labelEn:'Traveler Status', type:'select', optionSet:'traveler_status' },
    { key:'material_cert_status', labelVi:'Trạng thái chứng chỉ vật liệu', labelEn:'Material Certificate Status', type:'select', optionSet:'material_cert_status' }
  ]
};

var EDITABLE_FIELDS = {
  so: ['customer_site_id','customer_po','order_date','requested_date','promise_date','commit_date','due_date','total_qty','priority','incoterm_code','shipping_method_id','payment_term_code','contract_review','contract_review_status','fulfillment_status','special_requirements'],
  jo: ['part_revision','part_description','material_spec','qty_ordered','start_date','release_target_date','due_date','routing_id','bom_id','control_plan_id','inspection_plan_id','traveler_template_id','engineering_release_status','material_ready_status','quality_plan_status','source_inspection_status','outside_processing_status','fai_required','customer_source_inspection','special_process','special_process_supplier_id'],
  wo: ['operation_desc','machine_id','work_center_id','operator_id','dispatch_priority','nc_program_id','setup_time_est','run_time_est','scheduled_start','scheduled_end','fixture_id','quality_gate_status','first_piece_status','handover_status','material_lot_number','heat_number','traveler_number','traveler_status','material_cert_status']
};

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _safeDate(v){ if(!v) return null; if(typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v)){ var p=v.split('-'); return new Date(Number(p[0]), Number(p[1])-1, Number(p[2]), 0, 0, 0, 0); } var d=new Date(v); return isNaN(d.getTime())?null:d; }
function _fmtDate(v){ if(!v) return ''; var d=_safeDate(v); return !d?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function _fmtDateTime(v){ if(!v) return ''; var d=_safeDate(v); return !d?String(v):_fmtDate(d)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function _today(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _status(type, key){ var s=((STATUS[type]||{})[key]||{ vi:key||'-', en:key||'-', color:'var(--text-secondary,#94a3b8)' }); return { text:_t(s.vi,s.en), color:s.color }; }
function _rgba(hex,a){ var r=parseInt(hex.slice(1,3),16)||148, g=parseInt(hex.slice(3,5),16)||163, b=parseInt(hex.slice(5,7),16)||184; return 'rgba('+r+','+g+','+b+','+a+')'; }
function _api(action, payload, method){ if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000); return fetch('api.php?action='+encodeURIComponent(action), { method:method||'POST', credentials:'include', headers:{'Content-Type':'application/json', ...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})}, body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{}) }).then(function(r){ return r.json(); }); }
function _toast(msg, type){ var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); }, 180); }, 3200); }
function _governanceError(resp, fallbackVi, fallbackEn){ if(resp && resp.error==='wo_launch_blocked'){ var blockers=Array.isArray(resp.blockers)?resp.blockers:[]; var first=blockers[0]||{}; return _t(first.message_vi||'WO đang bị chặn vì chưa đạt điều kiện MES bắt buộc.','The WO is blocked because MES launch conditions are not yet satisfied.'); } return _t(fallbackVi, fallbackEn); }
function _bandMeta(key){ return BAND_META[key] || BAND_META.info; }
function _bandRank(key){ return ({ critical:0, warning:1, ready:2, info:3, not_required:4 })[key] ?? 5; }
function _phaseMeta(key){ return PHASE_META[key] || { vi:key||'-', en:key||'-' }; }
function _migrateRole(role){ var map={ general_director:'ceo', deputy_director:'production_director', prod_manager:'cnc_workshop_manager', prod_supervisor:'shift_leader', cnc_setup:'setup_technician', cnc_programmer:'cam_nc_programmer', qms_supervisor:'qms_engineer', doc_controller:'qms_engineer', purchasing_officer:'buyer', procurement_manager:'supply_chain_manager', sales_officer:'estimator', planning_officer:'production_planner', hse_officer:'ehs_specialist', maintenance_tech:'maintenance_technician', finance_officer:'gl_payroll_accountant', warehouse_staff:'warehouse_clerk', warehouse_lead:'supply_chain_manager', supervisor:'shift_leader', operator:'cnc_operator', planning_manager:'production_planner', production_manager:'cnc_workshop_manager' }; return map[String(role||'').trim()] || String(role||'').trim(); }
function _permission(type, action){ var cfg={ so:{create:['sales_manager','estimator','customer_service'],edit:['sales_manager','estimator','customer_service','supply_chain_manager']}, jo:{create:['cnc_workshop_manager','production_planner','engineering_manager','quality_manager'],edit:['cnc_workshop_manager','production_planner','engineering_manager','quality_manager','supply_chain_manager']}, wo:{create:['cnc_workshop_manager','production_planner','shift_leader'],edit:['cnc_workshop_manager','production_planner','shift_leader','setup_technician','cnc_operator','quality_engineer','qc_inspector']} }; var role=(typeof currentUser!=='undefined'&&currentUser)?_migrateRole(currentUser.role||''):''; if(!role) return true; if(['admin','it_admin','ceo','qa_manager'].indexOf(role)>=0) return true; return ((cfg[type]||{})[action]||[]).indexOf(role)>=0; }
function _canAccessPurchasing(){ var role=(typeof currentUser!=='undefined'&&currentUser)?_migrateRole(currentUser.role||''):''; if(!role) return true; return ['admin','it_admin','ceo','qa_manager','quality_manager','qms_engineer','quality_engineer','qc_inspector','supply_chain_manager','buyer','warehouse_clerk','tool_storekeeper','logistics_coordinator','production_planner'].indexOf(role)>=0; }
function _purchasingContext(record, type){
  var data=record||{};
  var sourceId=data.source_record_id || (type==='so'?data.so_number:(type==='jo'?data.jo_number:data.wo_number)) || '';
  var preferredVendorId=data.special_process_supplier_id || (data.job_order&&data.job_order.special_process_supplier_id) || (data.parent_job_order&&data.parent_job_order.special_process_supplier_id) || '';
  var ctx={ targetTab:'create-po' };
  if(sourceId){ ctx.sourceRecordId=sourceId; ctx.selectedSourceRecordId=sourceId; }
  if(preferredVendorId){ ctx.preferredVendorId=preferredVendorId; ctx.selectedVendorId=preferredVendorId; }
  return ctx;
}
function _openPurchasingFromSelection(){
  if(!_canAccessPurchasing() || typeof window._openPurchasingWorkspace!=='function') return;
  if(_selected && _selected.data){
    window._openPurchasingWorkspace(_purchasingContext(_selected.data, _selected.type));
    return;
  }
  window._openPurchasingWorkspace({ targetTab:'overview' });
}
function _master(){ return (typeof window._mdGetSnapshot==='function' ? (window._mdGetSnapshot()||{}) : {}); }
function _recordType(item){ if(item&&item._type) return item._type; if(item&&item.so_number) return 'so'; if(item&&item.jo_number) return 'jo'; return 'wo'; }
function _recordId(item){ var type=_recordType(item); return String(type==='so'?(item.so_number||''):(type==='jo'?(item.jo_number||''):(item.wo_number||''))); }
function _recordBand(item){ return String(((item||{}).operating||{}).health_band || 'ready'); }
function _recordPhase(item){ return String(((item||{}).operating||{}).phase || ''); }
function _recordReadiness(item){ var score=((item||{}).operating||{}).readiness_score; return score==null||score===''?null:Number(score); }
function _recordCompletion(item){ var score=((item||{}).operating||{}).completion_pct; return score==null||score===''?null:Number(score); }
function _recordLateDays(item){ return Number((((item||{}).operating||{}).late_days)||0); }
function _recordBlocked(item){ return !!(((item||{}).operating||{}).blocked); }
function _recordExceptionCount(item){ return Number((((item||{}).operating||{}).exception_count) || ((item||{}).exception_cards||[]).length || 0); }
function _recordTitle(item){ var type=_recordType(item); if(type==='so') return (item.customer_name||item.customer_id||'-') + (item.customer_po?' / PO '+item.customer_po:''); if(type==='jo') return _partRev(item.part_number,item.part_revision); return 'OP'+String(item.operation_number||'-')+' · '+(item.operation_desc||'-'); }
function _recordSupport(item){ var type=_recordType(item); if(type==='so') return [item.customer_site_name||item.customer_site_id,item.incoterm_name||item.incoterm_code,item.shipping_method_name||item.shipping_method_id].filter(Boolean).join(' · '); if(type==='jo') return [item.part_description,item.material_spec,item.routing_name||item.routing_id].filter(Boolean).join(' · '); return [item.machine_name||item.machine_id,item.work_center_name||item.work_center_id,item.operator_name||item.operator_id].filter(Boolean).join(' · '); }
function _recordDueDate(item){ return item.due_date || item.scheduled_end || ''; }
function _flatten(h){ var rows=[]; (h||[]).forEach(function(so){ rows.push(Object.assign({_type:'so', _root_so:so.so_number||''},so)); (so.job_orders||[]).forEach(function(jo){ rows.push(Object.assign({_type:'jo', _parent_so:so.so_number||'', _root_so:so.so_number||''},jo)); (jo.work_orders||[]).forEach(function(wo){ rows.push(Object.assign({_type:'wo', _parent_so:so.so_number||'', _parent_jo:jo.jo_number||'', _root_so:so.so_number||''},wo)); }); }); }); return rows; }
function _sortValue(item,key){ if(key==='risk') return _bandRank(_recordBand(item))*10000 + (_recordBlocked(item)?-100:0) - _recordLateDays(item); if(key==='readiness') return _recordReadiness(item)==null?-1:_recordReadiness(item); if(key==='order_number') return _recordId(item).toLowerCase(); if(key==='type') return _recordType(item); if(key==='subject') return (_recordTitle(item)+' '+_recordSupport(item)).toLowerCase(); if(key==='phase') return _recordPhase(item); if(key==='status') return String(item.status||''); if(key==='due_date') return String(_recordDueDate(item)||''); if(key==='exceptions') return _recordExceptionCount(item); return ''; }
function _sortRows(rows,key,dir){ return rows.slice().sort(function(a,b){ var va=_sortValue(a,key), vb=_sortValue(b,key), cmp=0; if(typeof va==='number'&&typeof vb==='number') cmp=va-vb; else cmp=va<vb?-1:(va>vb?1:0); return dir==='asc'?cmp:-cmp; }); }
function _filterRows(rows,q){ return rows.filter(function(r){ var hit=[r.so_number,r.jo_number,r.wo_number,r.customer_name,r.customer_id,r.customer_po,r.customer_site_name,r.customer_site_id,r.part_number,r.part_revision,r.part_description,r.operation_desc,r.machine_name,r.machine_id,r.work_center_name,r.work_center_id,r.status,_recordPhase(r),(r.gate_cards||[]).map(function(x){ return x.label_vi||x.label_en||''; }).join(' '),(r.exception_cards||[]).map(function(x){ return x.title_vi||x.title_en||''; }).join(' ')].filter(Boolean).join(' ').toLowerCase(); return !q || hit.indexOf(q)>=0; }); }
var _selectedPartForRev = '';
function _lookupRows(kind, filterContext){
  var m=_master();
  if(kind==='customers') return (m.customers||[]).map(function(x){ return { value:x.customer_id, label:x.customer_id, sub:x.customer_name||'' }; });
  if(kind==='customer_sites') return (m.customer_sites||[]).filter(function(x){ return !(filterContext&&filterContext.customer_id) || x.customer_id===filterContext.customer_id; }).map(function(x){ return { value:x.site_id, label:x.site_id, sub:[x.site_name,x.customer_id,x.country_code].filter(Boolean).join(' · ') }; });
  if(kind==='parts') return (m.parts||[]).map(function(x){ return { value:x.part_number, label:x.part_number, sub:x.part_description||'', description:x.part_description||'' }; });
  if(kind==='revisions'){
    var partFilter = (filterContext && filterContext.part_number) ? filterContext.part_number : _selectedPartForRev;
    return (m.revisions||[]).filter(function(x){
      if(partFilter && x.part_number !== partFilter) return false;
      return true;
    }).map(function(x){
      var statusTag = x.status || '';
      var warn = (statusTag === 'superseded' || statusTag === 'draft') ? ' ⚠' : '';
      return { value:x.revision, label:x.revision + warn, sub:(x.part_number||'') + (statusTag ? ' · ' + statusTag : ''), status:statusTag };
    });
  }
  if(kind==='incoterms') return (m.incoterms||[]).map(function(x){ return { value:x.incoterm_code, label:x.incoterm_code, sub:x.incoterm_name||'' }; });
  if(kind==='payment_terms') return (m.payment_terms||[]).map(function(x){ return { value:x.payment_term_code, label:x.payment_term_code, sub:x.payment_term_name||'' }; });
  if(kind==='shipping_methods') return (m.shipping_methods||[]).map(function(x){ return { value:x.shipping_method_id, label:x.shipping_method_id, sub:[x.shipping_method_name,x.mode].filter(Boolean).join(' · ') }; });
  if(kind==='routing_library') return (m.routing_library||[]).map(function(x){ return { value:x.routing_id, label:x.routing_id, sub:[x.routing_name,x.part_number,x.part_revision].filter(Boolean).join(' · ') }; });
  if(kind==='bom_library') return (m.bom_library||[]).map(function(x){ return { value:x.bom_id, label:x.bom_id, sub:[x.bom_name,x.part_number,x.part_revision].filter(Boolean).join(' · ') }; });
  if(kind==='control_plans') return (m.control_plans||[]).map(function(x){ return { value:x.control_plan_id, label:x.control_plan_id, sub:[x.control_plan_name,x.part_number,x.part_revision].filter(Boolean).join(' · ') }; });
  if(kind==='inspection_plans') return (m.inspection_plans||[]).map(function(x){ return { value:x.inspection_plan_id, label:x.inspection_plan_id, sub:[x.inspection_plan_name,x.part_number,x.part_revision].filter(Boolean).join(' · ') }; });
  if(kind==='traveler_templates') return (m.traveler_templates||[]).map(function(x){ return { value:x.traveler_template_id, label:x.traveler_template_id, sub:[x.traveler_template_name,x.part_number,x.part_revision].filter(Boolean).join(' · ') }; });
  if(kind==='suppliers') return (m.suppliers||[]).map(function(x){ return { value:x.supplier_id, label:x.supplier_id, sub:[x.supplier_name,x.supplier_type].filter(Boolean).join(' · ') }; });
  if(kind==='work_centers') return (m.work_centers||[]).map(function(x){ return { value:x.work_center_id, label:x.work_center_id, sub:x.work_center_name||'' }; });
  if(kind==='machines') return (m.machines||[]).map(function(x){ return { value:x.machine_id, label:x.machine_id, sub:(x.machine_name||'') + (x.work_center_id ? ' · ' + x.work_center_id : '') }; });
  if(kind==='operators') return (m.operators||[]).map(function(x){ return { value:x.operator_id, label:x.operator_id, sub:(x.operator_name||'') + (x.role ? ' · ' + x.role : '') }; });
  if(kind==='so') return _flat.filter(function(x){ return _recordType(x)==='so'; }).map(function(x){ return { value:x.so_number, label:x.so_number, sub:_recordTitle(x) }; });
  if(kind==='jo') return _flat.filter(function(x){ return _recordType(x)==='jo'; }).map(function(x){ return { value:x.jo_number, label:x.jo_number, sub:_partRev(x.part_number,x.part_revision) }; });
  return [];
}
function _fieldSelectOptions(field, currentValue){
  var opts = [];
  var valueText = currentValue == null ? '' : String(currentValue);
  if(window.HmRegistry && typeof HmRegistry.selectOptions === 'function'){
    opts = HmRegistry.selectOptions({ field:field || {} }) || [];
  }
  if((!opts || !opts.length) && Array.isArray(field && field.options)){
    opts = field.options.map(function(opt){ return { value:opt, label:opt, labelEn:opt }; });
  }
  if(valueText && opts && opts.length && !opts.some(function(opt){ return String(opt.value) === valueText; })){
    opts = opts.slice();
    opts.push({ value:valueText, label:valueText, labelEn:valueText });
  }
  return opts || [];
}
function _partRev(part, rev){ if(!part) return '-'; return part + (rev ? ' / ' + rev : ''); }
function _reloadRevisionDropdown(type, form, selectedPart){
  _selectedPartForRev = selectedPart || '';
  var revTarget = document.getElementById(_id+'-'+type+'-part_revision');
  if(!revTarget) return;
  var filteredRevs = _lookupRows('revisions', { part_number: selectedPart });
  if(typeof SearchableInput==='function'){
    new SearchableInput({ containerId:revTarget.id, fieldId:revTarget.id+'-si', name:'part_revision', dataSource:filteredRevs, displayField:'label', valueField:'value', subField:'sub', placeholderVi:_t('Tìm và chọn revision','Search and select revision'), placeholder:'Search and select revision', strictSelect:true, storeValueInHiddenField:true });
    var latestReleased = filteredRevs.find(function(r){ return r.status === 'released'; });
    if(latestReleased){ setTimeout(function(){ var si = SearchableInput.get(revTarget.id+'-si'); if(si) si.setValue(latestReleased.value); }, 50); }
  } else {
    revTarget.innerHTML='<select class="sj-input" name="part_revision"><option value="">'+_t('Chọn','Select')+'</option>'+filteredRevs.map(function(x){ return '<option value="'+_esc(x.value)+'">'+_esc(x.label+(x.sub?' · '+x.sub:''))+'</option>'; }).join('')+'</select>';
  }
}
function _reloadCustomerSiteDropdowns(type, form, customerId, currentValues){
  currentValues = currentValues || {};
  ['customer_site_id','ship_to_site_id'].forEach(function(fieldKey){
    var target = document.getElementById(_id+'-'+type+'-'+fieldKey);
    if(!target) return;
    var rows = _lookupRows('customer_sites', { customer_id: customerId || '' });
    if(typeof SearchableInput==='function'){
      new SearchableInput({
        containerId:target.id,
        fieldId:target.id+'-si',
        name:fieldKey,
        dataSource:rows,
        displayField:'label',
        valueField:'value',
        subField:'sub',
        placeholderVi:_t('Tìm và chọn','Search and select'),
        placeholder:'Search and select',
        strictSelect:true,
        storeValueInHiddenField:true,
        maxResults:40
      });
      if(currentValues[fieldKey]){
        setTimeout(function(){
          var si = SearchableInput.get(target.id+'-si');
          if(si) si.setValue(currentValues[fieldKey]);
        }, 0);
      }
    } else {
      target.innerHTML='<select class="sj-input" name="'+fieldKey+'"><option value="">'+_t('Chọn','Select')+'</option>'+rows.map(function(x){ return '<option value="'+_esc(x.value)+'">'+_esc(x.label+(x.sub?' · '+x.sub:''))+'</option>'; }).join('')+'</select>';
      var sel = target.querySelector('select');
      if(sel && currentValues[fieldKey] != null) sel.value = currentValues[fieldKey] || '';
    }
  });
}
function _hasActiveFilters(){ return !!(_filters.search || _filters.type!=='all' || _filters.band!=='all' || _filters.phase!=='all'); }
function _matchesFilters(item){ if(_filters.type!=='all' && _recordType(item)!==_filters.type) return false; if(_filters.band!=='all' && _recordBand(item)!==_filters.band) return false; if(_filters.phase!=='all' && _recordPhase(item)!==_filters.phase) return false; return true; }
function _filteredRows(){ return _sortRows(_filterRows(_flat,_filters.search.trim().toLowerCase()).filter(_matchesFilters),_tableSort.key,_tableSort.dir); }
function _filteredHierarchy(){ if(!_hasActiveFilters()) return _hierarchy.slice(); var rows=[]; (_hierarchy||[]).forEach(function(so){ var soMatch=_matchesFilters(Object.assign({_type:'so'},so)) && _filterRows([so],_filters.search.trim().toLowerCase()).length>0; var jobOrders=[]; (so.job_orders||[]).forEach(function(jo){ var joMatch=_matchesFilters(Object.assign({_type:'jo'},jo)) && _filterRows([jo],_filters.search.trim().toLowerCase()).length>0; var workOrders=[]; (jo.work_orders||[]).forEach(function(wo){ if((soMatch||joMatch||(_matchesFilters(Object.assign({_type:'wo'},wo))&&_filterRows([wo],_filters.search.trim().toLowerCase()).length>0))) workOrders.push(wo); }); if(soMatch||joMatch||workOrders.length){ var nextJo=Object.assign({},jo); nextJo.work_orders=(soMatch||joMatch)?(jo.work_orders||[]):workOrders; nextJo.operations=nextJo.work_orders; jobOrders.push(nextJo); } }); if(soMatch||jobOrders.length){ var nextSo=Object.assign({},so); nextSo.job_orders=soMatch?(so.job_orders||[]):jobOrders; rows.push(nextSo); } }); return rows; }
function _foundationSnapshot(){ var master=_master(); return FOUNDATION_GROUPS.map(function(group){ var total=0, missing=[]; var detail=group.items.map(function(key){ var count=Array.isArray(master[key])?master[key].length:0; total+=count; if(count===0) missing.push(key); return { key:key, count:count }; }); return { key:group.key, titleVi:group.titleVi, titleEn:group.titleEn, total:total, missing:missing, detail:detail }; }); }
function _phaseCount(key){ return Number(((_kpi.phase_counts||{})[key])||0); }
function _renderLoading(){ _container.innerHTML='<div class="sj-wrap"><div class="sj-loading"><div class="sj-spinner"></div><p>'+_t('Đang xây dựng control tower đơn hàng...','Building the order control tower...')+'</p></div></div>'; }
function _renderGateStrip(item,max){ var gates=Array.isArray(item.gate_cards)?item.gate_cards.slice(0,max||4):[]; if(!gates.length) return ''; return '<div class="sj-gate-strip">'+gates.map(function(gate){ var band=_bandMeta(gate.band||'info'); return '<span class="sj-gate-chip" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(gate.label_vi||'',gate.label_en||''))+'</span>'; }).join('')+'</div>'; }
function _renderRecordBadges(item){ var type=_recordType(item), band=_bandMeta(_recordBand(item)), phase=_phaseMeta(_recordPhase(item)), readiness=_recordReadiness(item), st=_status(type,item.status||''); var h='<div class="sj-record-badges"><span class="sj-type-pill type-'+type+'">'+type.toUpperCase()+'</span><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span><span class="sj-phase-pill">'+_esc(_t(phase.vi,phase.en))+'</span><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.10)+'">'+_esc(st.text)+'</span>'; if(readiness!=null) h+='<span class="sj-score-pill">'+_esc(Math.round(readiness))+'%</span>'; return h+'</div>'; }
function _renderInlineStats(item){ var rows=[]; if(_recordDueDate(item)) rows.push([_t('Hạn','Due'),_fmtDate(_recordDueDate(item))]); if(_recordLateDays(item)>0) rows.push([_t('Trễ','Late'),_recordLateDays(item)+'d']); if(_recordExceptionCount(item)>0) rows.push([_t('Ngoại lệ','Exceptions'),_recordExceptionCount(item)]); if(_recordCompletion(item)!=null) rows.push([_t('Hoàn thành','Complete'),Math.round(_recordCompletion(item))+'%']); return '<div class="sj-inline-stats">'+rows.slice(0,4).map(function(row){ return '<span><small>'+_esc(row[0])+'</small><strong>'+_esc(row[1])+'</strong></span>'; }).join('')+'</div>'; }
function _renderWoRow(wo){ var band=_bandMeta(_recordBand(wo)); return '<button type="button" class="sj-wo-row sj-select-order" data-id="'+_esc(_recordId(wo))+'" data-type="wo"><div class="sj-row-main"><div class="sj-row-title"><strong>'+_esc(_recordId(wo))+'</strong><span>'+_esc(_recordTitle(wo))+'</span></div><div class="sj-row-sub">'+_esc(_recordSupport(wo))+'</div>'+_renderGateStrip(wo,3)+'</div><div class="sj-row-side"><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span>'+( _recordReadiness(wo)!=null ? '<strong>'+_esc(Math.round(_recordReadiness(wo)))+'%</strong>' : '' )+'</div></button>'; }
function _renderJoBlock(jo){ return '<section class="sj-jo-block"><button type="button" class="sj-jo-head sj-select-order" data-id="'+_esc(_recordId(jo))+'" data-type="jo"><div class="sj-program-copy"><div class="sj-program-title-row"><h4>'+_esc(_recordTitle(jo))+'</h4><code>'+_esc(_recordId(jo))+'</code></div><p>'+_esc(_recordSupport(jo))+'</p>'+_renderGateStrip(jo,4)+_renderInlineStats(jo)+'</div><div class="sj-program-side">'+_renderRecordBadges(jo)+'</div></button><div class="sj-wo-stack">'+((jo.work_orders||[]).length?(jo.work_orders||[]).map(_renderWoRow).join(''):'<div class="sj-empty compact">'+_t('JO chưa có WO con phù hợp với bộ lọc hiện tại.','This JO does not have child WOs matching the current filter.')+'</div>')+'</div></section>'; }
function _renderSoBlock(so){ return '<article class="sj-program"><button type="button" class="sj-program-head sj-select-order" data-id="'+_esc(_recordId(so))+'" data-type="so"><div class="sj-program-copy"><div class="sj-program-title-row"><h3>'+_esc(_recordTitle(so))+'</h3><code>'+_esc(_recordId(so))+'</code></div><p>'+_esc(_recordSupport(so))+'</p>'+_renderGateStrip(so,5)+_renderInlineStats(so)+'</div><div class="sj-program-side">'+_renderRecordBadges(so)+'</div></button><div class="sj-program-body">'+((so.job_orders||[]).length?(so.job_orders||[]).map(_renderJoBlock).join(''):'<div class="sj-empty compact">'+_t('SO chưa có JO con phù hợp với bộ lọc hiện tại.','This SO does not have child JOs matching the current filter.')+'</div>')+'</div></article>'; }
function _renderPortfolioView(){ var hierarchy=_filteredHierarchy(); return hierarchy.length?'<section class="sj-portfolio">'+hierarchy.map(_renderSoBlock).join('')+'</section>':'<section class="sj-panel"><div class="sj-empty">'+_t('Không có chuỗi SO/JO/WO phù hợp với bộ lọc hiện tại.','No SO/JO/WO portfolio matches the current filters.')+'</div></section>'; }
function _renderDispatchCard(item){ var band=_bandMeta(_recordBand(item)); return '<button type="button" class="sj-card sj-select-order" data-id="'+_esc(_recordId(item))+'" data-type="'+_esc(_recordType(item))+'"><div class="sj-card-top"><span class="sj-type-pill type-'+_recordType(item)+'">'+_recordType(item).toUpperCase()+'</span><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span></div><strong>'+_esc(_recordId(item))+'</strong><h4>'+_esc(_recordTitle(item))+'</h4><p>'+_esc(_recordSupport(item))+'</p>'+_renderInlineStats(item)+( _recordCompletion(item)!=null ? '<div class="sj-progress"><span style="width:'+Math.max(0,Math.min(100,_recordCompletion(item)))+'%"></span></div>' : '' )+'</button>'; }
function _renderDispatchView(){ var rows=_filteredRows(), order=['commercial','engineering','planning','execution','quality','fulfillment','exception','closed']; return '<section class="sj-swimlanes">'+order.map(function(phase){ var items=rows.filter(function(row){ return _recordPhase(row)===phase; }); var meta=_phaseMeta(phase); return '<section class="sj-lane"><header><div><small>'+_esc(_t(meta.vi,meta.en))+'</small><strong>'+_esc(items.length)+'</strong></div></header><div class="sj-lane-body">'+(items.length?items.map(_renderDispatchCard).join(''):'<div class="sj-empty-col">'+_t('Không có bản ghi','No records')+'</div>')+'</div></section>'; }).join('')+'</section>'; }
function _renderTableView(){ var rows=_filteredRows(), h='<section class="sj-panel"><div class="sj-table-wrap"><table class="sj-table"><thead><tr><th data-sort="risk">'+_t('Rủi ro','Risk')+'</th><th data-sort="order_number">'+_t('Mã đơn','Order #')+'</th><th data-sort="type">'+_t('Loại','Type')+'</th><th data-sort="subject">'+_t('Mô tả','Subject')+'</th><th data-sort="phase">'+_t('Phase','Phase')+'</th><th data-sort="status">'+_t('Trạng thái','Status')+'</th><th data-sort="readiness">'+_t('Readiness','Readiness')+'</th><th data-sort="due_date">'+_t('Hạn','Due')+'</th><th data-sort="exceptions">'+_t('Ngoại lệ','Exceptions')+'</th></tr></thead><tbody>'; if(!rows.length) h+='<tr><td colspan="9" class="sj-empty-row">'+_t('Không có dữ liệu phù hợp.','No matching records.')+'</td></tr>'; rows.forEach(function(item){ var band=_bandMeta(_recordBand(item)), phase=_phaseMeta(_recordPhase(item)), st=_status(_recordType(item),item.status||''); h+='<tr class="sj-row sj-select-order" data-id="'+_esc(_recordId(item))+'" data-type="'+_esc(_recordType(item))+'"><td><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span></td><td><code>'+_esc(_recordId(item))+'</code></td><td>'+_recordType(item).toUpperCase()+'</td><td><strong>'+_esc(_recordTitle(item))+'</strong><span class="sj-table-sub">'+_esc(_recordSupport(item))+'</span></td><td>'+_esc(_t(phase.vi,phase.en))+'</td><td><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.10)+'">'+_esc(st.text)+'</span></td><td>'+(_recordReadiness(item)==null?'-':_esc(Math.round(_recordReadiness(item)))+'%')+'</td><td>'+(_recordDueDate(item)?_esc(_fmtDate(_recordDueDate(item))):'-')+'</td><td>'+_esc(_recordExceptionCount(item))+'</td></tr>'; }); return h+'</tbody></table></div></section>'; }
function _renderMetricDeck(){ var cards=[{ labelVi:'SO có rủi ro promise/commit', labelEn:'SOs at promise risk', tone:'critical', value:_kpi.at_risk_so||0, noteVi:'SO đang có gate cảnh báo hoặc chặn', noteEn:'SOs carrying warning or blocker gates' },{ labelVi:'JO sẵn sàng phát hành', labelEn:'Release-ready JOs', tone:'ready', value:_kpi.release_ready_jo||0, noteVi:'Readiness >= 80 và không bị block', noteEn:'Readiness >= 80 and not blocked' },{ labelVi:'WO bị chặn launch', labelEn:'Blocked WOs', tone:'warning', value:_kpi.blocked_wo||0, noteVi:'Bị chặn bởi gate MES / traceability / quality', noteEn:'Blocked by MES, traceability, or quality gates' },{ labelVi:'SO chờ bộ chứng từ giao', labelEn:'SOs with shipping docs pending', tone:'warning', value:_kpi.shipping_docs_pending||0, noteVi:'COC/COA/packing/export chưa xong', noteEn:'COC/COA/packing/export still pending' },{ labelVi:'OTD đã đóng', labelEn:'Closed OTD', tone:'info', value:typeof _kpi.otd_percent==='number'?_kpi.otd_percent+'%':'-', noteVi:'Tỷ lệ giao đúng hạn của SO đã đóng', noteEn:'On-time delivery for shipped or closed SOs' }]; var h='<section class="sj-panel sj-summary-panel"><div class="sj-panel-head compact"><div><small class="sj-eyebrow">'+_t('Bảng điều hành','Control summary')+'</small><h2>'+_t('Promise, readiness và launch đang ở đâu?','Where do promise, readiness, and launch stand?')+'</h2></div></div><div class="sj-metric-grid">'; cards.forEach(function(card){ h+='<article class="sj-metric tone-'+card.tone+'"><small>'+_esc(_t(card.labelVi,card.labelEn))+'</small><strong>'+_esc(card.value)+'</strong><span>'+_esc(_t(card.noteVi,card.noteEn))+'</span></article>'; }); h+='</div><div class="sj-load-strip">'+[[ _t('SO hoạt động','Active SO'),_kpi.active_so||0 ],[ _t('JO hoạt động','Active JO'),_kpi.active_jo||0 ],[ _t('WO hoạt động','Active WO'),_kpi.active_wo||0 ],[ _t('Quá hạn','Overdue'),_kpi.overdue_count||0 ],[ _t('Outside processing mở','Outside processing open'),_kpi.outside_processing_open||0 ]].map(function(row){ return '<div class="sj-load-pill"><span>'+_esc(row[0])+'</span><strong>'+_esc(row[1])+'</strong></div>'; }).join('')+'</div></section>'; return h; }
function _renderPhaseBoard(){ return '<section class="sj-panel sj-phase-panel"><div class="sj-panel-head compact"><div><small class="sj-eyebrow">'+_t('Theo phase','By phase')+'</small><h3>'+_t('Dòng chảy vận hành','Operational flow')+'</h3></div></div><div class="sj-phase-board">'+['commercial','engineering','planning','execution','quality','fulfillment','exception','closed'].map(function(key){ var meta=_phaseMeta(key); return '<div class="sj-phase-item"><span>'+_esc(_t(meta.vi,meta.en))+'</span><strong>'+_esc(_phaseCount(key))+'</strong></div>'; }).join('')+'</div></section>'; }
function _renderGovernanceBoard(){ var rows=[[ _t('NC release đang rủi ro','NC release queue'),_kpi.program_release_risk||0 ],[ _t('Tool readiness gap','Tool readiness gap'),_kpi.tool_readiness_risk||0 ],[ _t('Thiếu năng lực operator','Operator qualification gaps'),_kpi.operator_qualification_gaps||0 ],[ _t('Gap truy xuất vật liệu','Material trace gaps'),_kpi.material_trace_gaps||0 ],[ _t('Gap kết nối máy','Machine connectivity gaps'),_kpi.connector_governance_gaps||0 ],[ _t('Launch blockers','Launch blockers'),_kpi.launch_blockers||0 ]]; return '<section class="sj-panel sj-gov-panel"><div class="sj-panel-head compact"><div><small class="sj-eyebrow">'+_t('MES governance','MES governance')+'</small><h3>'+_t('Hàng đợi chặn lệnh','Launch blocker queues')+'</h3></div></div><div class="sj-gov-board">'+rows.map(function(row){ return '<div class="sj-gov-item"><span>'+_esc(row[0])+'</span><strong>'+_esc(row[1])+'</strong></div>'; }).join('')+'</div></section>'; }
function _renderExceptionRadar(){ var items=Array.isArray(_kpi.top_exceptions)?_kpi.top_exceptions:[]; return '<section class="sj-panel"><div class="sj-panel-head compact"><div><small class="sj-eyebrow">'+_t('Exception-first','Exception-first')+'</small><h3>'+_t('Ngoại lệ ưu tiên xử lý','Priority exceptions')+'</h3></div><span class="sj-count-pill">'+_esc(items.length)+'</span></div><div class="sj-panel-body">'+(items.length?'<div class="sj-exception-list">'+items.slice(0,8).map(function(item){ var band=_bandMeta(item.severity==='critical'?'critical':(item.severity==='warning'?'warning':'info')), phase=_phaseMeta(item.phase); return '<button type="button" class="sj-exception-item" data-order-id="'+_esc(item.order_id||'')+'" data-order-type="'+_esc(item.order_type||'so')+'"><span class="sj-sev" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span><div><strong>'+_esc(item.order_id||'-')+' · '+_esc(_t(item.title_vi||'',item.title_en||''))+'</strong><p>'+_esc(_t(item.message_vi||'',item.message_en||''))+'</p><small>'+_esc(_t(phase.vi,phase.en))+'</small></div></button>'; }).join('')+'</div>':'<div class="sj-empty">'+_t('Chưa có ngoại lệ mở trong read model hiện tại.','No open exceptions in the current read model.')+'</div>')+'</div></section>'; }
function _renderFoundationMini(){ var groups=_foundationSnapshot(); return '<section class="sj-panel"><div class="sj-panel-head compact"><div><small class="sj-eyebrow">'+_t('Data foundations','Data foundations')+'</small><h3>'+_t('Độ phủ dữ liệu nền','Foundation coverage')+'</h3></div><button type="button" class="sj-mini-link" id="'+_id+'-foundations">'+_t('Xem chi tiết','View details')+'</button></div><div class="sj-panel-body"><div class="sj-foundation-mini">'+groups.map(function(group){ return '<div class="sj-foundation-row"><span>'+_esc(_t(group.titleVi,group.titleEn))+'</span><strong>'+_esc(group.total)+'</strong></div>'; }).join('')+'</div>'+(typeof window._mdOpenControl==='function'?'<div class="sj-foundation-actions"><button type="button" class="sj-btn subtle" id="'+_id+'-md">'+_t('Mở dữ liệu nền','Open master data')+'</button></div>':'')+'</div></section>'; }
function _renderFilters(){ return '<section class="sj-panel sj-filter-panel"><div class="sj-panel-body"><div class="sj-filter-row"><div class="sj-search-wrap"><input id="'+_id+'-global-search" class="sj-input sj-search" value="'+_esc(_filters.search)+'" placeholder="'+_t('Tìm SO / JO / WO, khách hàng, part, gate, ngoại lệ...','Search SO / JO / WO, customer, part, gate, exception...')+'"></div><select id="'+_id+'-type-filter" class="sj-input sj-filter-select"><option value="all">'+_t('Tất cả loại','All types')+'</option><option value="so"'+(_filters.type==='so'?' selected':'')+'>SO</option><option value="jo"'+(_filters.type==='jo'?' selected':'')+'>JO</option><option value="wo"'+(_filters.type==='wo'?' selected':'')+'>WO</option></select><select id="'+_id+'-phase-filter" class="sj-input sj-filter-select"><option value="all">'+_t('Tất cả phase','All phases')+'</option>'+['commercial','engineering','planning','execution','quality','fulfillment','exception','closed','cancelled'].map(function(key){ var meta=_phaseMeta(key); return '<option value="'+key+'"'+(_filters.phase===key?' selected':'')+'>'+_esc(_t(meta.vi,meta.en))+'</option>'; }).join('')+'</select><div class="sj-chip-group">'+[{ key:'all', labelVi:'Tất cả', labelEn:'All' },{ key:'critical', labelVi:'Chặn', labelEn:'Blocked' },{ key:'warning', labelVi:'Theo dõi', labelEn:'Watch' },{ key:'ready', labelVi:'Ổn định', labelEn:'Stable' }].map(function(item){ return '<button type="button" class="sj-chip-filter'+(_filters.band===item.key?' active':'')+'" data-band="'+item.key+'">'+_esc(_t(item.labelVi,item.labelEn))+'</button>'; }).join('')+'</div><div class="sj-filter-meta">'+_esc(_filteredRows().length)+' '+_esc(_t('bản ghi phù hợp','matching records'))+'</div></div></div></section>'; }
function _renderView(){ if(_view==='table') return _renderTableView(); if(_view==='pipeline') return _renderDispatchView(); return _renderPortfolioView(); }

/* PR #2 Orders shell — top-level tab strip + 5 tab content branches.
 * Renders ABOVE the existing Order Control Tower so SO/JO/WO behaviour
 * is untouched. Other tabs are placeholders that subsequent PRs fill in. */
function _renderOrdersTabStrip(){
  var h = '<nav class="orders-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--border-1,#e5e7eb);background:var(--surface-1,#fff);padding:0 16px;margin:0 0 0 0;align-items:flex-end">';
  ORDERS_TABS.forEach(function(t){
    var active = _activeTab === t.id;
    var dot = t.status === 'coming'
      ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--amber-light,#f59e0b);margin-left:6px;vertical-align:middle" title="Coming soon"></span>'
      : '';
    h += '<button type="button" data-orders-tab="' + t.id + '" '
       + 'style="padding:10px 16px;border:none;background:none;cursor:pointer;'
       + 'border-bottom:' + (active ? '2px solid var(--brand-primary,#2563eb)' : '2px solid transparent') + ';'
       + 'color:' + (active ? 'var(--brand-primary,#2563eb)' : 'var(--text-2,#374151)') + ';'
       + 'font-weight:' + (active ? '700' : '500') + ';font-size:13px;white-space:nowrap">'
       + t.icon + ' ' + _esc(_t(t.labelVi, t.labelEn))
       + dot
       + '</button>';
  });
  h += '</nav>';
  return h;
}

function _renderTabPlaceholder(tabId){
  var t = ORDERS_TABS.find(function(x){ return x.id === tabId; }) || {};
  var msgMap = {
    'customer-pos': {
      vi: 'Danh sách Customer PO — đang được implement trong PR #4.',
      en: 'Customer PO listing — coming in PR #4.',
      desc_vi: 'Sẽ hiển thị tất cả Customer Purchase Orders, bao gồm CPO tạo từ AI Email Intake (badge 🤖) và CPO tạo manual. Filter theo customer, source, status, value, ngày nhận. Click row → mở CPO detail với danh sách SO/JO liên kết.',
      desc_en: 'Will list every Customer Purchase Order including AI-Intake-sourced ones (badge 🤖) and manual ones. Filter by customer, source, status, value, received date. Click row → CPO detail with linked SO/JOs.'
    },
    'ai-intake': {
      vi: 'AI Intake Queue — đang được implement trong PR #3.',
      en: 'AI Intake Queue — coming in PR #3.',
      desc_vi: 'Queue duyệt case từ AEOI module. List bên trái + drawer detail bên phải. Keyboard triage (j/k/Enter/e/r/Cmd+K). Check matrix 6/6 đèn xanh trước khi cho Approve. Bulk approve cho case 0 blockers.',
      desc_en: 'Review queue for cases produced by AEOI. Left list + right drawer. Keyboard triage. 6-check matrix gates Approve. Bulk approve for zero-blocker cases.'
    },
    'quarantine': {
      vi: 'Security Quarantine — đang được implement trong PR #4.',
      en: 'Security Quarantine — coming in PR #4.',
      desc_vi: 'Hàng đợi review email bị flag suspicious (SPF/DKIM fail, sender lạ, attachment nguy hiểm). Reviewer release → tạo normal case, hoặc block → add sender vào denylist + ghi audit.',
      desc_en: 'Review queue for flagged-suspicious emails (SPF/DKIM fail, unknown senders, dangerous attachments). Reviewer can release → create normal case, or block → denylist sender + audit event.'
    },
    'logs': {
      vi: 'Logs & Diagnostics — đang được implement trong PR #4.',
      en: 'Logs & Diagnostics — coming in PR #4.',
      desc_vi: 'Poll run history, message log (email_intake_message), error breakdown by reason_code. Dashboard sức khỏe cho AI Ops lead.',
      desc_en: 'Poll run history, message log, error breakdown by reason_code. Health dashboard for the AI Ops lead.'
    }
  };
  var info = msgMap[tabId] || { vi: 'Coming soon.', en: 'Coming soon.', desc_vi: '', desc_en: '' };
  return '<div style="padding:48px 24px;text-align:center;background:var(--surface-2,#f9fafb);min-height:240px">'
    + '<div style="font-size:48px;line-height:1;margin-bottom:12px">' + (t.icon || '🚧') + '</div>'
    + '<h2 style="font-size:18px;font-weight:700;color:var(--text-1,#111);margin:0 0 8px 0">' + _esc(_t(t.labelVi || '', t.labelEn || '')) + '</h2>'
    + '<p style="font-size:13px;color:var(--text-2,#374151);margin:0 0 12px 0">' + _esc(_t(info.vi, info.en)) + '</p>'
    + '<p style="font-size:12px;color:var(--text-3,#6b7280);max-width:640px;margin:0 auto 16px auto;line-height:1.6">' + _esc(_t(info.desc_vi, info.desc_en)) + '</p>'
    + '<a href="#admin/email-intake" style="display:inline-block;padding:8px 16px;background:var(--brand-primary,#2563eb);color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600">'
    + _t('Mở Admin Settings AI Order Intake →', 'Open AEOI Admin Settings →')
    + '</a>'
    + '</div>';
}

/* ════════════════════════════════════════════════════════════════════
 * PR #3 — AI Intake Queue (full implementation)
 *
 * Lives in this file so we don't introduce a new <script> tag in the
 * forbidden portal.html. Designed per Linear-style queue pattern from
 * the design spec: list table + slide-in drawer detail.
 *
 * Module namespace AiIntakeQueue keeps this self-contained — its
 * functions don't collide with the Order Control Tower's existing
 * _render, _refresh, _bind, etc.
 * ════════════════════════════════════════════════════════════════════ */
var AiIntakeQueue = (function(){
  var state = {
    cases: [],
    selected: null,
    filterStatus: '',
    filterSource: '',
    drawerOpen: false,
    masterEnabled: true,
    loading: false
  };

  function fmtMoney(v){
    var n = Number(v || 0);
    if (!isFinite(n)) return '-';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function statusBadge(s){
    var tone = {
      needs_review:       { bg:'#fef3c7', fg:'#92400e' },
      approved:           { bg:'#d1fae5', fg:'#065f46' },
      commit_ready:       { bg:'#d1fae5', fg:'#065f46' },
      committed_cpo:      { bg:'#bbf7d0', fg:'#14532d' },
      committed_so:       { bg:'#86efac', fg:'#14532d' },
      rejected:           { bg:'#fecaca', fg:'#991b1b' },
      security_hold:      { bg:'#fecaca', fg:'#991b1b' },
      duplicate_hold:     { bg:'#fed7aa', fg:'#9a3412' },
      engineering_review: { bg:'#e9d5ff', fg:'#6b21a8' },
      commercial_review:  { bg:'#dbeafe', fg:'#1e40af' },
      planning_review:    { bg:'#c7d2fe', fg:'#3730a3' },
      quality_review:     { bg:'#a5f3fc', fg:'#0e7490' },
      extraction_pending: { bg:'#f3f4f6', fg:'#374151' },
      error:              { bg:'#fecaca', fg:'#991b1b' }
    }[s] || { bg:'#f3f4f6', fg:'#374151' };
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:'+tone.bg+';color:'+tone.fg+'">' + _esc(s || '?') + '</span>';
  }

  function sourceBadge(extracted){
    // ai_order_intake cases all come from email, but show subtle badge
    return '<span title="From AI Email Intake" style="display:inline-block;font-size:11px;color:#6b7280">🤖 AI</span>';
  }

  function _renderKpiHeader(){
    var byStatus = {};
    (state.cases || []).forEach(function(c){
      var s = c.status || '?';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    var total = state.cases.length;
    var pending = (byStatus.needs_review || 0) + (byStatus.commercial_review || 0)
                 + (byStatus.engineering_review || 0) + (byStatus.planning_review || 0);
    var hold = (byStatus.security_hold || 0) + (byStatus.duplicate_hold || 0);
    var committed = (byStatus.committed_cpo || 0) + (byStatus.committed_so || 0);
    // listCases projection returns first-line fields only (part_number,
    // revision_number, quantity, uom on the case row) — full line_total
    // sums require getCase(). For the KPI we approximate by computing
    // first-line qty × unit_price, but most cases ship with unit_price
    // only after extraction, so the KPI is often $0 here. Real total
    // shows in the per-case drawer where we call getCase().
    var totalValue = 0;
    (state.cases || []).forEach(function(c){
      var qty   = Number(c.quantity   || 0);
      var price = Number(c.unit_price || 0);
      var lt = qty * price;
      if (isFinite(lt) && lt > 0) totalValue += lt;
    });
    function card(label, value, color){
      return '<div style="flex:1;min-width:120px;padding:12px 14px;background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:8px">'
        + '<div style="font-size:11px;color:var(--text-3,#6b7280);font-weight:500">' + _esc(label) + '</div>'
        + '<div style="font-size:22px;font-weight:700;color:' + color + ';margin-top:4px">' + _esc(value) + '</div>'
        + '</div>';
    }
    return '<div style="display:flex;gap:12px;padding:12px 16px;background:var(--surface-2,#f9fafb);flex-wrap:wrap">'
      + card(_t('Tổng case', 'Total cases'), String(total), 'var(--text-1,#111)')
      + card(_t('Chờ duyệt', 'Pending review'), String(pending), 'var(--amber-light,#b9691f)')
      + card(_t('Bị giữ', 'On hold'), String(hold), 'var(--red-light,#b42318)')
      + card(_t('Đã commit', 'Committed'), String(committed), 'var(--green-dark,#0f766e)')
      + card(_t('Tổng giá trị', 'Total value'), fmtMoney(totalValue), 'var(--brand-primary,#2563eb)')
      + '</div>';
  }

  function _renderFilters(){
    var statuses = ['', 'needs_review', 'approved', 'committed_cpo', 'committed_so',
                    'security_hold', 'duplicate_hold', 'engineering_review',
                    'commercial_review', 'rejected'];
    var statusOpts = statuses.map(function(s){
      var label = s ? s : _t('Tất cả', 'All');
      var sel = state.filterStatus === s ? ' selected' : '';
      return '<option value="' + s + '"' + sel + '>' + _esc(label) + '</option>';
    }).join('');
    return '<div style="display:flex;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid var(--border-1,#e5e7eb);align-items:center;flex-wrap:wrap">'
      + '<label style="font-size:12px;color:var(--text-2,#374151)">' + _t('Trạng thái:', 'Status:') + '</label>'
      + '<select id="aiq-filter-status" style="padding:4px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:4px;font-size:12px">' + statusOpts + '</select>'
      + '<button id="aiq-refresh" style="margin-left:auto;padding:6px 12px;background:var(--brand-primary,#2563eb);color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">'
      + _t('🔄 Làm mới', '🔄 Refresh')
      + '</button>'
      + '</div>';
  }

  function _renderList(){
    var cases = state.cases || [];
    var filtered = cases.filter(function(c){
      if (state.filterStatus && c.status !== state.filterStatus) return false;
      return true;
    });
    if (state.loading) {
      return '<div style="padding:48px;text-align:center;color:var(--text-3,#6b7280)">⏳ ' + _t('Đang tải...', 'Loading...') + '</div>';
    }
    if (filtered.length === 0) {
      return '<div style="padding:48px;text-align:center;color:var(--text-3,#6b7280)">'
        + '📭 ' + _t('Chưa có case nào khớp bộ lọc.', 'No cases match the current filter.')
        + '</div>';
    }
    var rows = filtered.map(function(c){
      var sel = state.selected && state.selected.id === c.id;
      var blockers = c.blocking_codes;
      if (typeof blockers === 'string') { try { blockers = JSON.parse(blockers); } catch(e) { blockers = []; } }
      blockers = Array.isArray(blockers) ? blockers : [];
      var blockerBadge = blockers.length > 0
        ? '<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;background:#fecaca;color:#991b1b;margin-left:4px">✗' + blockers.length + '</span>'
        : '';
      var conf = c.overall_confidence ? Number(c.overall_confidence).toFixed(2) : '-';
      var rcv = c.created_at ? new Date(c.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-';
      return '<tr data-aiq-case-id="' + _esc(c.id) + '" style="cursor:pointer;border-bottom:1px solid var(--border-1,#e5e7eb);background:' + (sel ? '#dbeafe' : '#fff') + '">'
        + '<td style="padding:8px 12px;font-size:12px;font-family:ui-monospace,monospace">' + _esc(c.intake_no || '?') + blockerBadge + '</td>'
        + '<td style="padding:8px 12px">' + statusBadge(c.status) + '</td>'
        + '<td style="padding:8px 12px;font-size:12px">' + _esc(c.customer_id || '-') + '</td>'
        + '<td style="padding:8px 12px;font-size:12px;font-family:ui-monospace,monospace">' + _esc(c.customer_po_number || '-') + '</td>'
        + '<td style="padding:8px 12px;font-size:12px;text-align:right">' + _esc(c.line_count || 0) + '</td>'
        + '<td style="padding:8px 12px;font-size:12px;text-align:right">' + _esc(conf) + '</td>'
        + '<td style="padding:8px 12px;font-size:11px;color:var(--text-3,#6b7280)">' + _esc(rcv) + '</td>'
        + '<td style="padding:8px 12px;font-size:11px">' + sourceBadge(c) + '</td>'
        + '</tr>';
    }).join('');
    return '<div style="background:#fff;flex:1;overflow:auto"><table style="width:100%;border-collapse:collapse">'
      + '<thead style="position:sticky;top:0;background:var(--surface-2,#f9fafb);z-index:1">'
      + '<tr style="border-bottom:2px solid var(--border-1,#e5e7eb)">'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Intake #', 'Intake #') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Trạng thái', 'Status') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Khách', 'Customer') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('PO #', 'PO #') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:right;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Lines', 'Lines') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:right;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Conf', 'Conf') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Nhận', 'Received') + '</th>'
      + '<th style="padding:8px 12px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _t('Source', 'Source') + '</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function _renderDrawer(){
    if (!state.drawerOpen || !state.selected) return '';
    var c = state.selected;
    var blockers = c.blocking_codes;
    if (typeof blockers === 'string') { try { blockers = JSON.parse(blockers); } catch(e) { blockers = []; } }
    blockers = Array.isArray(blockers) ? blockers : [];
    var warnings = c.warning_codes;
    if (typeof warnings === 'string') { try { warnings = JSON.parse(warnings); } catch(e) { warnings = []; } }
    warnings = Array.isArray(warnings) ? warnings : [];

    var isTerminal = ['committed_cpo','committed_so','rejected','closed'].indexOf(c.status) >= 0;
    var canApprove = c.status === 'needs_review' && blockers.length === 0;
    var canCommitCpo = c.status === 'approved' && !c.committed_customer_po_id;
    var canCommitSo = (c.status === 'approved' || c.status === 'committed_cpo') && !c.committed_so_number;

    function btn(label, action, enabled, color){
      var bg = enabled ? color : '#e5e7eb';
      var fg = enabled ? '#fff' : '#9ca3af';
      var dis = enabled ? '' : 'disabled';
      return '<button data-aiq-action="' + action + '" ' + dis + ' style="padding:8px 14px;background:' + bg + ';color:' + fg + ';border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:' + (enabled ? 'pointer' : 'not-allowed') + '">' + _esc(label) + '</button>';
    }

    var lines = c.lines || [];
    var attachments = c.attachments || [];

    // Chain breadcrumb
    var chain = '<div style="padding:10px 16px;background:var(--surface-2,#f9fafb);font-size:11px;color:var(--text-2,#374151);border-bottom:1px solid var(--border-1,#e5e7eb)">'
      + '📧 Email → 📦 Case ' + _esc(c.intake_no) + ' '
      + (c.committed_customer_po_id ? ' → 📋 ' + _esc(c.committed_customer_po_id) : ' → 📋 CPO')
      + (c.committed_so_number ? ' → 🛒 ' + _esc(c.committed_so_number) : ' → 🛒 SO')
      + ' → 🏭 JO → ⚙ WO'
      + '</div>';

    return '<aside id="aiq-drawer" style="position:fixed;top:0;right:0;width:520px;max-width:90vw;height:100vh;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.15);z-index:1000;display:flex;flex-direction:column">'
      + '<header style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border-1,#e5e7eb)">'
      +   '<div><div style="font-size:14px;font-weight:700">📦 ' + _esc(c.intake_no || '?') + '</div>'
      +   '<div style="font-size:11px;color:var(--text-3,#6b7280);margin-top:2px">' + statusBadge(c.status) + '</div></div>'
      +   '<button id="aiq-drawer-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-3,#6b7280)">×</button>'
      + '</header>'
      + chain
      + '<div style="flex:1;overflow:auto;padding:16px;font-size:12px">'
      // Customer + PO
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
      +   '<div><div style="font-size:10px;color:var(--text-3,#6b7280);text-transform:uppercase;letter-spacing:.5px">' + _t('Khách hàng', 'Customer') + '</div><div style="font-weight:600">' + _esc(c.customer_id || '-') + '</div><div style="font-size:11px;color:var(--text-2,#374151)">' + _esc(c.customer_name || '') + '</div></div>'
      +   '<div><div style="font-size:10px;color:var(--text-3,#6b7280);text-transform:uppercase;letter-spacing:.5px">PO #</div><div style="font-weight:600;font-family:ui-monospace,monospace">' + _esc(c.customer_po_number || '-') + '</div></div>'
      +   '<div><div style="font-size:10px;color:var(--text-3,#6b7280);text-transform:uppercase;letter-spacing:.5px">' + _t('Loại', 'Type') + '</div><div>' + _esc(c.document_type || '-') + ' / ' + _esc(c.action_type || '-') + '</div></div>'
      +   '<div><div style="font-size:10px;color:var(--text-3,#6b7280);text-transform:uppercase;letter-spacing:.5px">' + _t('Tin cậy', 'Confidence') + '</div><div style="font-weight:600">' + _esc(c.overall_confidence ? Number(c.overall_confidence).toFixed(2) : '-') + '</div></div>'
      + '</div>'
      // Blockers banner
      + (blockers.length > 0
          ? '<div style="padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin-bottom:12px;font-size:12px;color:#991b1b"><strong>✗ ' + blockers.length + ' blocker(s):</strong> ' + _esc(blockers.join(', ')) + '</div>'
          : warnings.length > 0
            ? '<div style="padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;margin-bottom:12px;font-size:12px;color:#92400e"><strong>⚠ ' + warnings.length + ' warning(s):</strong> ' + _esc(warnings.join(', ')) + '</div>'
            : '<div style="padding:8px 12px;background:#d1fae5;border:1px solid #a7f3d0;border-radius:6px;margin-bottom:12px;font-size:12px;color:#065f46">✓ ' + _t('Không có blocker hay warning.', 'No blockers or warnings.') + '</div>')
      // Committed info
      + (c.committed_customer_po_id || c.committed_so_number
          ? '<div style="padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;margin-bottom:12px;font-size:12px">'
            + (c.committed_customer_po_id ? '<div>📋 <strong>Customer PO:</strong> <span style="font-family:ui-monospace,monospace">' + _esc(c.committed_customer_po_id) + '</span></div>' : '')
            + (c.committed_so_number      ? '<div style="margin-top:4px">🛒 <strong>Sales Order:</strong> <span style="font-family:ui-monospace,monospace">' + _esc(c.committed_so_number) + '</span></div>' : '')
          + '</div>'
          : '')
      // Lines
      + '<h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);margin:12px 0 6px 0">📦 ' + _t('Lines', 'Lines') + ' (' + lines.length + ')</h4>'
      + (lines.length > 0
          ? '<table style="width:100%;font-size:11px;border-collapse:collapse">'
            + '<thead><tr style="background:var(--surface-2,#f9fafb)"><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Part</th><th style="padding:6px;text-align:left">Rev</th><th style="padding:6px;text-align:right">Qty</th><th style="padding:6px;text-align:right">Price</th></tr></thead>'
            + '<tbody>' + lines.map(function(l){
                return '<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:6px">' + _esc(l.line_no) + '</td><td style="padding:6px;font-family:ui-monospace,monospace">' + _esc(l.part_number) + '</td><td style="padding:6px">' + _esc(l.revision_number) + '</td><td style="padding:6px;text-align:right">' + _esc(l.quantity) + ' ' + _esc(l.uom || '') + '</td><td style="padding:6px;text-align:right">' + _esc(l.unit_price != null ? Number(l.unit_price).toFixed(2) : '-') + '</td></tr>';
              }).join('') + '</tbody></table>'
          : '<div style="color:var(--text-3,#6b7280);font-size:11px">' + _t('Không có line.', 'No lines.') + '</div>')
      // Attachments
      + '<h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);margin:14px 0 6px 0">📎 ' + _t('Đính kèm', 'Attachments') + ' (' + attachments.length + ')</h4>'
      + (attachments.length > 0
          ? '<div>' + attachments.map(function(a){
              var kb = a.file_size_bytes ? Math.round(a.file_size_bytes / 1024) + ' KB' : '?';
              return '<div style="padding:6px;font-size:11px"><span style="font-family:ui-monospace,monospace">' + _esc(a.original_filename) + '</span> · <span style="color:var(--text-3,#6b7280)">' + kb + ' · ' + _esc(a.mime_type || '') + '</span></div>';
            }).join('') + '</div>'
          : '<div style="color:var(--text-3,#6b7280);font-size:11px">' + _t('Không có attachment.', 'No attachments.') + '</div>')
      + '</div>'
      // Actions sticky footer
      + '<footer style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border-1,#e5e7eb);background:#fff">'
      +   btn(_t('🔄 Re-validate', '🔄 Re-validate'), 'revalidate', !isTerminal, '#6b7280')
      +   btn(_t('✗ Reject', '✗ Reject'), 'reject', !isTerminal && c.status !== 'rejected', '#dc2626')
      +   '<div style="flex:1"></div>'
      +   btn(_t('✓ Approve', '✓ Approve'), 'approve', canApprove, '#10b981')
      +   btn(_t('Commit CPO', 'Commit CPO'), 'commit_cpo', canCommitCpo, '#8b5cf6')
      +   btn(_t('Commit SO', 'Commit SO'), 'commit_so', canCommitSo, '#8b5cf6')
      + '</footer>'
      + '</aside>';
  }

  /* Wrappers around the Promise-returning window.apiCall.
   * window.apiCall URL-encodes the action argument so we cannot pass
   * &-delimited query strings through the action — params must come
   * via the payload object (which apiCall serializes to the query
   * string for GET methods).
   */
  function apiGet(action, payload){
    if (typeof window.apiCall !== 'function') {
      return Promise.resolve({ ok: false, error: 'apiCall_unavailable' });
    }
    return window.apiCall(action, payload || {}, 'GET')
      .then(function(r){ return r || { ok: false, error: 'empty' }; })
      .catch(function(e){ return { ok: false, error: String(e && e.message || e) }; });
  }
  function apiPost(action, payload){
    if (typeof window.apiCall !== 'function') {
      return Promise.resolve({ ok: false, error: 'apiCall_unavailable' });
    }
    return window.apiCall(action, payload || {}, 'POST')
      .then(function(r){ return r || { ok: false, error: 'empty' }; })
      .catch(function(e){ return { ok: false, error: String(e && e.message || e) }; });
  }

  function loadList(){
    state.loading = true;
    _bindAi();
    apiGet('ai_order_intake_case_list', { limit: 100, offset: 0 }).then(function(res){
      state.loading = false;
      if (res && res.ok) {
        state.cases = res.cases || (res.data && res.data.items) || res.items || [];
      } else {
        state.cases = [];
        console.error('[AiIntakeQueue] list_cases failed:', res);
      }
      _bindAi();
    });
  }

  function loadCaseDetail(caseId, cb){
    apiGet('ai_order_intake_case_detail', { id: caseId }).then(function(res){
      if (res && res.ok && res.case) {
        cb(res.case);
      } else {
        alert(_t('Lỗi tải chi tiết case: ', 'Failed to load case detail: ') + ((res && res.error) || 'unknown'));
      }
    });
  }

  function openCase(caseId){
    loadCaseDetail(caseId, function(detail){
      state.selected = detail;
      state.drawerOpen = true;
      _bindAi();
    });
  }

  function closeDrawer(){
    state.drawerOpen = false;
    state.selected = null;
    _bindAi();
  }

  function _bindAi(){
    // Re-render the dynamic regions
    var kpiMount = document.getElementById('aiq-kpi-mount');
    if (kpiMount) kpiMount.innerHTML = _renderKpiHeader();
    var filterMount = document.getElementById('aiq-filter-mount');
    if (filterMount) filterMount.innerHTML = _renderFilters();
    var listMount = document.getElementById('aiq-list-mount');
    if (listMount) listMount.innerHTML = _renderList();

    // Drawer
    var existing = document.getElementById('aiq-drawer');
    if (existing) existing.remove();
    if (state.drawerOpen) {
      document.body.insertAdjacentHTML('beforeend', _renderDrawer());
      var closeBtn = document.getElementById('aiq-drawer-close');
      if (closeBtn) closeBtn.onclick = closeDrawer;
      // Wire action buttons
      var drawer = document.getElementById('aiq-drawer');
      if (drawer) {
        Array.prototype.forEach.call(drawer.querySelectorAll('[data-aiq-action]'), function(btn){
          if (btn.disabled) return;
          btn.onclick = function(){ _doAction(btn.getAttribute('data-aiq-action')); };
        });
      }
    }

    // Row click handlers
    Array.prototype.forEach.call(document.querySelectorAll('[data-aiq-case-id]'), function(tr){
      tr.onclick = function(){ openCase(Number(tr.getAttribute('data-aiq-case-id'))); };
    });

    // Filter + refresh handlers
    var fs = document.getElementById('aiq-filter-status');
    if (fs) fs.onchange = function(){ state.filterStatus = fs.value; _bindAi(); };
    var rf = document.getElementById('aiq-refresh');
    if (rf) rf.onclick = loadList;
  }

  function _doAction(action){
    if (!state.selected) return;
    var caseId = state.selected.id;

    function reload(){
      loadList();
      loadCaseDetail(caseId, function(d){ state.selected = d; _bindAi(); });
    }

    if (action === 'revalidate') {
      apiPost('ai_order_intake_case_validate', { id: caseId }).then(function(res){
        if (res && res.ok) reload();
        else alert(_t('Re-validate lỗi: ', 'Re-validate failed: ') + ((res && res.error) || 'unknown'));
      });
      return;
    }
    if (action === 'reject') {
      var reason = prompt(_t('Lý do từ chối:', 'Rejection reason:'), '');
      if (reason === null || reason.trim() === '') return;
      apiPost('ai_order_intake_case_reject', { id: caseId, reason: reason }).then(function(res){
        if (res && res.ok) reload();
        else alert(_t('Reject lỗi: ', 'Reject failed: ') + ((res && res.error) || 'unknown'));
      });
      return;
    }
    if (action === 'approve') {
      if (!confirm(_t('Approve case này?', 'Approve this case?'))) return;
      var why = prompt(_t('Lý do approve (tùy chọn):', 'Approval reason (optional):'), '');
      apiPost('ai_order_intake_case_approve', { id: caseId, reason: why || '' }).then(function(res){
        if (res && res.ok) reload();
        else alert(_t('Approve lỗi: ', 'Approve failed: ') + ((res && res.error) || 'unknown'));
      });
      return;
    }
    if (action === 'commit_cpo') {
      if (!confirm(_t('Commit Customer PO? Action không undo được.', 'Commit Customer PO? Cannot be undone.'))) return;
      apiPost('ai_order_intake_commit_cpo', { id: caseId }).then(function(res){
        if (res && res.ok) {
          alert('✓ CPO: ' + (res.customer_po_id || res.cpo_id || res.target_ref || 'committed'));
          reload();
        } else alert(_t('Commit CPO lỗi: ', 'Commit CPO failed: ') + ((res && res.error) || 'unknown'));
      });
      return;
    }
    if (action === 'commit_so') {
      if (!confirm(_t('Commit Sales Order? Action không undo được.', 'Commit Sales Order? Cannot be undone.'))) return;
      apiPost('ai_order_intake_commit_so', { id: caseId }).then(function(res){
        if (res && res.ok) {
          alert('✓ SO: ' + (res.so_number || res.target_ref || 'committed'));
          reload();
        } else alert(_t('Commit SO lỗi: ', 'Commit SO failed: ') + ((res && res.error) || 'unknown'));
      });
      return;
    }
  }

  function init(){
    loadList();
    // Keyboard shortcuts: only when not typing in input/select/textarea
    if (!window._aiqKeyBound) {
      window._aiqKeyBound = true;
      document.addEventListener('keydown', function(ev){
        if (_activeTab !== 'ai-intake') return;
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (ev.key === 'Escape' && state.drawerOpen) { closeDrawer(); return; }
        if (ev.key === 'r' && state.drawerOpen) { _doAction('reject'); return; }
        if (ev.key === 'e' && state.drawerOpen) { _doAction('approve'); return; }
        // j/k navigation
        if (ev.key === 'j' || ev.key === 'k') {
          var filtered = state.cases.filter(function(c){
            return !state.filterStatus || c.status === state.filterStatus;
          });
          var idx = state.selected ? filtered.findIndex(function(c){ return c.id === state.selected.id; }) : -1;
          var next = ev.key === 'j' ? Math.min(filtered.length - 1, idx + 1) : Math.max(0, idx - 1);
          if (filtered[next]) openCase(filtered[next].id);
        }
      });
    }
  }

  return { init: init, openCase: openCase, closeDrawer: closeDrawer };
})();

/* ════════════════════════════════════════════════════════════════════
 * PR #4 — Customer POs list view
 * Reuses customer_purchase_order_list endpoint (registered in
 * mom/api/routes/operations-routes.php). Shows all CPOs with source
 * filter (AI Intake vs Manual).
 * ════════════════════════════════════════════════════════════════════ */
var OrdersCpoView = (function(){
  var state = { rows: [], loading: false, filterSource: '', errorMsg: '' };

  function apiGet(action, payload){
    if (typeof window.apiCall !== 'function') return Promise.resolve({ ok:false, error:'apiCall_unavailable' });
    return window.apiCall(action, payload || {}, 'GET')
      .then(function(r){ return r || { ok:false, error:'empty' }; })
      .catch(function(e){ return { ok:false, error:String(e && e.message || e) }; });
  }

  function fmtMoney(v){
    var n = Number(v || 0);
    if (!isFinite(n)) return '-';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function statusBadge(s){
    var tone = {
      received:    { bg:'#fef3c7', fg:'#92400e' },
      confirmed:   { bg:'#d1fae5', fg:'#065f46' },
      in_progress: { bg:'#dbeafe', fg:'#1e40af' },
      completed:   { bg:'#bbf7d0', fg:'#14532d' },
      cancelled:   { bg:'#fecaca', fg:'#991b1b' }
    }[s] || { bg:'#f3f4f6', fg:'#374151' };
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:'+tone.bg+';color:'+tone.fg+'">' + _esc(s || '?') + '</span>';
  }

  function _render(){
    var mount = document.getElementById('orders-cpo-mount');
    if (!mount) return;

    var rows = state.rows || [];
    var filtered = rows.filter(function(c){
      if (state.filterSource === 'ai_email') return (c.source === 'ai_order_intake');
      if (state.filterSource === 'manual')   return (c.source !== 'ai_order_intake');
      return true;
    });

    var totalValue = 0;
    var aiCount = 0;
    rows.forEach(function(c){
      (c.lines || []).forEach(function(l){
        var lt = Number(l.line_total != null ? l.line_total : Number(l.qty || 0) * Number(l.unit_price || 0));
        if (isFinite(lt)) totalValue += lt;
      });
      if (c.source === 'ai_order_intake') aiCount++;
    });

    var html = ''
      // KPI
      + '<div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">'
      +   _kpiCard(_t('Tổng CPO', 'Total CPOs'), String(rows.length), 'var(--text-1,#111)')
      +   _kpiCard(_t('Từ AI Intake', 'From AI Intake'), String(aiCount), 'var(--brand-primary,#2563eb)')
      +   _kpiCard(_t('Tổng giá trị', 'Total value'), fmtMoney(totalValue), 'var(--green-dark,#0f766e)')
      + '</div>'
      // Filter
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
      +   '<label style="font-size:12px;color:var(--text-2,#374151)">' + _t('Nguồn:', 'Source:') + '</label>'
      +   '<select id="cpo-filter-source" style="padding:4px 8px;border:1px solid var(--border-1,#e5e7eb);border-radius:4px;font-size:12px">'
      +     '<option value="">' + _t('Tất cả', 'All') + '</option>'
      +     '<option value="ai_email"' + (state.filterSource==='ai_email'?' selected':'') + '>🤖 AI Email Intake</option>'
      +     '<option value="manual"' + (state.filterSource==='manual'?' selected':'') + '>👤 Manual</option>'
      +   '</select>'
      +   '<button id="cpo-refresh" style="margin-left:auto;padding:6px 12px;background:var(--brand-primary,#2563eb);color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">'
      +     _t('🔄 Làm mới', '🔄 Refresh')
      +   '</button>'
      + '</div>';

    if (state.loading) {
      html += '<div style="padding:48px;text-align:center;color:var(--text-3,#6b7280)">⏳ ' + _t('Đang tải...', 'Loading...') + '</div>';
    } else if (state.errorMsg) {
      html += '<div style="padding:24px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;color:#92400e">'
        + '<div style="font-weight:700;margin-bottom:6px">⚠️ ' + _t('Không thể tải danh sách Customer PO', 'Could not load Customer POs') + '</div>'
        + '<div style="font-size:12px">' + _esc(state.errorMsg) + '</div>'
        + (state.errorDetail === 'org_id_required'
            ? '<div style="font-size:12px;margin-top:8px;color:#78350f">' + _t('Phiên đăng nhập của bạn chưa được gán Tổ chức (org_id). Liên hệ Admin để cấu hình tenant scoping cho tài khoản.', 'Your session has no Organization (org_id). Contact Admin to configure tenant scoping for your account.') + '</div>'
            : '')
        + '</div>';
    } else if (filtered.length === 0) {
      html += '<div style="padding:48px;text-align:center;color:var(--text-3,#6b7280);background:#fff;border-radius:6px;border:1px solid var(--border-1,#e5e7eb)">'
        + '📭 ' + (rows.length === 0
            ? _t('Chưa có Customer PO nào. AEOI commit hoặc tạo manual sẽ hiện ở đây.', 'No Customer POs yet. They will appear here after AEOI commit or manual create.')
            : _t('Không có CPO nào khớp bộ lọc.', 'No CPOs match the filter.'))
        + '</div>';
    } else {
      html += '<div style="background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;overflow:hidden">'
        + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
        + '<thead style="background:var(--surface-2,#f9fafb)"><tr>'
        +   _th('CPO ID') + _th(_t('Khách', 'Customer')) + _th('PO #')
        +   _th(_t('Trạng thái', 'Status')) + _th(_t('Lines', 'Lines'), 'right')
        +   _th(_t('Giá trị', 'Value'), 'right') + _th(_t('Nhận', 'Received'))
        +   _th(_t('Nguồn', 'Source')) + _th(_t('AEOI Case', 'AEOI Case'))
        + '</tr></thead><tbody>'
        + filtered.map(function(c){
            var lineCount = (c.lines || []).length;
            var lineValue = 0;
            (c.lines || []).forEach(function(l){
              var lt = Number(l.line_total != null ? l.line_total : Number(l.qty || 0) * Number(l.unit_price || 0));
              if (isFinite(lt)) lineValue += lt;
            });
            var rcv = c.received_at ? new Date(c.received_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '-';
            var srcBadge = c.source === 'ai_order_intake'
              ? '<span style="display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;background:#dbeafe;color:#1e40af">🤖 AI</span>'
              : '<span style="display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;background:#f3f4f6;color:#374151">👤 Manual</span>';
            var intakeRef = c.source_record_id
              ? '<span style="font-family:ui-monospace,monospace;font-size:11px;color:var(--brand-primary,#2563eb)">' + _esc(c.source_record_id) + '</span>'
              : '<span style="color:var(--text-3,#6b7280)">-</span>';
            return '<tr style="border-bottom:1px solid #f3f4f6">'
              + _td(_esc(c.customer_po_id || '-'), 'font-family:ui-monospace,monospace;font-weight:600')
              + _td(_esc(c.customer_id || '-') + (c.customer_name ? '<div style="font-size:10px;color:var(--text-3,#6b7280)">' + _esc(c.customer_name) + '</div>' : ''))
              + _td(_esc(c.customer_po_number || '-'), 'font-family:ui-monospace,monospace')
              + _td(statusBadge(c.po_status))
              + _td(String(lineCount), 'text-align:right')
              + _td(fmtMoney(lineValue), 'text-align:right;font-weight:600')
              + _td(_esc(rcv), 'font-size:11px;color:var(--text-3,#6b7280)')
              + _td(srcBadge)
              + _td(intakeRef)
              + '</tr>';
          }).join('')
        + '</tbody></table></div>';
    }

    mount.innerHTML = html;

    var fs = document.getElementById('cpo-filter-source');
    if (fs) fs.onchange = function(){ state.filterSource = fs.value; _render(); };
    var rb = document.getElementById('cpo-refresh');
    if (rb) rb.onclick = init;
  }

  function init(){
    state.loading = true;
    state.errorMsg = '';
    state.errorDetail = '';
    _render();
    apiGet('customer_purchase_order_list', { limit: 200 }).then(function(res){
      state.loading = false;
      if (res && res.ok) {
        state.rows = res.customer_purchase_orders || res.purchase_orders || res.cpos || res.data || res.items || [];
        state.errorMsg = '';
      } else {
        state.rows = [];
        state.errorMsg = (res && (res.error || res.message)) || 'unknown_error';
        state.errorDetail = (res && (res.detail || res.error)) || '';
        console.error('[OrdersCpoView] list failed:', res);
      }
      _render();
    });
  }

  return { init: init };
})();

/* ════════════════════════════════════════════════════════════════════
 * PR #4 — Security Quarantine
 * Email-level security holds (SPF/DKIM fail, suspicious sender, dangerous
 * attachment). Reviewer can release (creates case) or block (denylist).
 * ════════════════════════════════════════════════════════════════════ */
var OrdersQuarantineView = (function(){
  var state = { rows: [], loading: false, showResolved: false };

  function apiGet(action, payload){
    if (typeof window.apiCall !== 'function') return Promise.resolve({ ok:false, error:'apiCall_unavailable' });
    return window.apiCall(action, payload || {}, 'GET')
      .then(function(r){ return r || { ok:false, error:'empty' }; })
      .catch(function(e){ return { ok:false, error:String(e && e.message || e) }; });
  }
  function apiPost(action, payload){
    if (typeof window.apiCall !== 'function') return Promise.resolve({ ok:false, error:'apiCall_unavailable' });
    return window.apiCall(action, payload || {}, 'POST')
      .then(function(r){ return r || { ok:false, error:'empty' }; })
      .catch(function(e){ return { ok:false, error:String(e && e.message || e) }; });
  }

  function _render(){
    var mount = document.getElementById('orders-quar-mount');
    if (!mount) return;
    var rows = state.rows || [];
    var html = ''
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
      +   '<div style="font-size:14px;font-weight:700;color:var(--text-1,#111)">🔒 ' + _t('Hàng chờ kiểm duyệt bảo mật', 'Security Review Queue') + '</div>'
      +   '<div style="font-size:12px;color:var(--text-3,#6b7280)">' + String(rows.length) + ' ' + _t('mục', 'items') + '</div>'
      +   '<button id="quar-refresh" style="margin-left:auto;padding:6px 12px;background:var(--brand-primary,#2563eb);color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">'
      +     _t('🔄 Làm mới', '🔄 Refresh')
      +   '</button>'
      +   '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2,#374151);cursor:pointer">'
      +     '<input type="checkbox" id="quar-show-resolved"' + (state.showResolved?' checked':'') + '> ' + _t('Hiện đã xử lý', 'Show resolved')
      +   '</label>'
      + '</div>';

    if (state.loading) {
      html += '<div style="padding:48px;text-align:center;color:var(--text-3,#6b7280)">⏳ ' + _t('Đang tải...', 'Loading...') + '</div>';
    } else if (rows.length === 0) {
      html += '<div style="padding:48px;text-align:center;color:var(--green-dark,#065f46);background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px">'
        + '✅ ' + _t('Không có email nào cần kiểm duyệt. Hệ thống an toàn.', 'No emails awaiting review. System is clean.')
        + '</div>';
    } else {
      html += '<div style="background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;overflow:hidden">'
        + '<table style="width:100%;border-collapse:collapse;font-size:12px">'
        + '<thead style="background:var(--surface-2,#f9fafb)"><tr>'
        +   _th(_t('Sender', 'Sender')) + _th(_t('Subject', 'Subject'))
        +   _th(_t('Lý do', 'Reason')) + _th(_t('Severity', 'Severity'))
        +   _th(_t('Action', 'Action'))
        + '</tr></thead><tbody>'
        + rows.map(function(r){
            var sev = r.severity || 'medium';
            var sevColor = { high:'#dc2626', medium:'#f59e0b', low:'#6b7280' }[sev] || '#6b7280';
            var resolved = r.review_action && r.review_action !== 'pending';
            return '<tr style="border-bottom:1px solid #f3f4f6;' + (resolved?'opacity:.6':'') + '">'
              + _td(_esc(r.sender_email || r.from_email || '?'), 'font-family:ui-monospace,monospace;font-size:11px')
              + _td(_esc(r.subject || ''), 'font-size:11px')
              + _td(_esc(r.reason_code || ''), 'font-size:11px;color:var(--text-2,#374151)')
              + _td('<span style="color:' + sevColor + ';font-weight:600;text-transform:uppercase;font-size:10px">' + _esc(sev) + '</span>')
              + _td(resolved
                  ? '<span style="font-size:11px;color:var(--text-3,#6b7280)">' + _esc(r.review_action) + '</span>'
                  : '<div style="display:flex;gap:4px">'
                    + '<button data-quar-action="allow" data-quar-id="' + _esc(r.id) + '" style="padding:4px 8px;background:#10b981;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer">✓ ' + _t('Cho phép', 'Allow') + '</button>'
                    + '<button data-quar-action="block" data-quar-id="' + _esc(r.id) + '" style="padding:4px 8px;background:#dc2626;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer">✗ ' + _t('Block', 'Block') + '</button>'
                    + '<button data-quar-action="ignore" data-quar-id="' + _esc(r.id) + '" style="padding:4px 8px;background:#6b7280;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer">— ' + _t('Bỏ qua', 'Ignore') + '</button>'
                    + '</div>')
              + '</tr>';
          }).join('')
        + '</tbody></table></div>';
    }
    mount.innerHTML = html;

    var rb = document.getElementById('quar-refresh');
    if (rb) rb.onclick = init;
    var sr = document.getElementById('quar-show-resolved');
    if (sr) sr.onchange = function(){ state.showResolved = sr.checked; init(); };

    Array.prototype.forEach.call(document.querySelectorAll('[data-quar-action]'), function(btn){
      btn.onclick = function(){
        var id = btn.getAttribute('data-quar-id');
        var act = btn.getAttribute('data-quar-action');
        var notes = prompt(_t('Ghi chú (tùy chọn):', 'Notes (optional):'), '');
        apiPost('admin_email_intake_quarantine_action', { id: Number(id), action: act, notes: notes || '' }).then(function(res){
          if (res && res.ok) init();
          else alert(_t('Lỗi: ', 'Error: ') + ((res && res.error) || 'unknown'));
        });
      };
    });
  }

  function init(){
    state.loading = true;
    _render();
    apiGet('admin_email_intake_quarantine_get', { all: state.showResolved ? 1 : 0 }).then(function(res){
      state.loading = false;
      state.rows = (res && res.ok) ? (res.items || res.quarantine || []) : [];
      _render();
    });
  }

  return { init: init };
})();

/* ════════════════════════════════════════════════════════════════════
 * PR #4 — Logs & Diagnostics
 * Poll run history + message log + recent errors.
 * ════════════════════════════════════════════════════════════════════ */
var OrdersLogsView = (function(){
  var state = { pollLog: [], msgLog: [], loading: false };

  function apiGet(action, payload){
    if (typeof window.apiCall !== 'function') return Promise.resolve({ ok:false, error:'apiCall_unavailable' });
    return window.apiCall(action, payload || {}, 'GET')
      .then(function(r){ return r || { ok:false, error:'empty' }; })
      .catch(function(e){ return { ok:false, error:String(e && e.message || e) }; });
  }

  function _render(){
    var mount = document.getElementById('orders-logs-mount');
    if (!mount) return;
    var html = ''
      + '<div style="display:flex;gap:10px;margin-bottom:14px;align-items:center">'
      +   '<div style="font-size:14px;font-weight:700">📑 ' + _t('Nhật ký & chẩn đoán', 'Logs & Diagnostics') + '</div>'
      +   '<button id="logs-refresh" style="margin-left:auto;padding:6px 12px;background:var(--brand-primary,#2563eb);color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">'
      +     _t('🔄 Làm mới', '🔄 Refresh')
      +   '</button>'
      + '</div>';

    // Poll log section
    html += '<details open style="background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;margin-bottom:12px"><summary style="padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer">📊 ' + _t('Nhật ký Poll', 'Poll Runs') + ' (' + state.pollLog.length + ')</summary><div style="padding:0 14px 14px 14px">';
    if (state.pollLog.length === 0) {
      html += '<div style="padding:14px;color:var(--text-3,#6b7280);font-size:12px">' + _t('Chưa có poll run.', 'No poll runs yet.') + '</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px">'
        + '<thead><tr style="background:var(--surface-2,#f9fafb)">'
        + _th(_t('Lúc', 'When')) + _th(_t('Bởi', 'By')) + _th(_t('Trigger', 'Trigger'))
        + _th(_t('Fetched', 'Fetched'), 'right') + _th(_t('Created', 'Created'), 'right')
        + _th(_t('Skipped', 'Skipped'), 'right') + _th(_t('Errors', 'Errors'), 'right')
        + _th(_t('Trạng thái', 'Status'))
        + '</tr></thead><tbody>'
        + state.pollLog.slice(0, 50).map(function(p){
            var when = p.started_at ? new Date(p.started_at).toLocaleString('vi-VN') : '-';
            var stColor = { completed:'#065f46', partial:'#92400e', failed:'#991b1b', skipped:'#374151' }[p.status] || '#374151';
            return '<tr style="border-bottom:1px solid #f3f4f6">'
              + _td(_esc(when), 'font-size:10px')
              + _td(_esc(p.triggered_by_actor || p.triggered_by || '-'), 'font-size:10px')
              + _td(_esc(p.triggered_by || '-'))
              + _td(String(p.found || 0), 'text-align:right')
              + _td(String(p.created || 0), 'text-align:right')
              + _td(String(p.skipped || 0), 'text-align:right')
              + _td(String(p.errors || 0), 'text-align:right;color:' + (p.errors > 0 ? '#dc2626' : '#374151'))
              + _td('<span style="color:' + stColor + ';font-weight:600">' + _esc(p.status || '?') + '</span>')
              + '</tr>';
          }).join('')
        + '</tbody></table>';
    }
    html += '</div></details>';

    // Message log
    html += '<details style="background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:6px"><summary style="padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer">📧 ' + _t('Nhật ký email', 'Email log') + ' (' + state.msgLog.length + ')</summary><div style="padding:0 14px 14px 14px">';
    if (state.msgLog.length === 0) {
      html += '<div style="padding:14px;color:var(--text-3,#6b7280);font-size:12px">' + _t('Chưa có email.', 'No emails yet.') + '</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px">'
        + '<thead><tr style="background:var(--surface-2,#f9fafb)">'
        + _th('From') + _th('Subject') + _th(_t('Trạng thái', 'Status')) + _th(_t('Nhận', 'Received'))
        + '</tr></thead><tbody>'
        + state.msgLog.slice(0, 50).map(function(m){
            var recv = m.received_at ? new Date(m.received_at).toLocaleString('vi-VN') : '-';
            return '<tr style="border-bottom:1px solid #f3f4f6">'
              + _td(_esc(m.from_email || '-'), 'font-size:10px;font-family:ui-monospace,monospace')
              + _td(_esc((m.subject || '').slice(0, 70)), 'font-size:10px')
              + _td(_esc(m.status || '-'), 'font-size:10px')
              + _td(_esc(recv), 'font-size:10px')
              + '</tr>';
          }).join('')
        + '</tbody></table>';
    }
    html += '</div></details>';

    mount.innerHTML = html;
    var rb = document.getElementById('logs-refresh');
    if (rb) rb.onclick = init;
  }

  function init(){
    state.loading = true;
    _render();
    Promise.all([
      apiGet('admin_email_intake_poll_log', { limit: 50 }),
      apiGet('admin_email_intake_message_log', { limit: 50 })
    ]).then(function(results){
      state.loading = false;
      state.pollLog = (results[0] && results[0].ok && (results[0].items || results[0].poll_runs)) || [];
      state.msgLog  = (results[1] && results[1].ok && (results[1].items || results[1].messages)) || [];
      _render();
    });
  }

  return { init: init };
})();

/* Shared helpers used by all three views above. */
function _kpiCard(label, value, color){
  return '<div style="flex:1;min-width:120px;padding:12px 14px;background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:8px">'
    + '<div style="font-size:11px;color:var(--text-3,#6b7280);font-weight:500">' + _esc(label) + '</div>'
    + '<div style="font-size:22px;font-weight:700;color:' + color + ';margin-top:4px">' + _esc(value) + '</div>'
    + '</div>';
}
function _th(label, align){
  return '<th style="padding:8px 12px;font-size:11px;text-align:' + (align || 'left') + ';text-transform:uppercase;letter-spacing:.5px;color:var(--text-2,#374151);font-weight:600">' + _esc(label) + '</th>';
}
function _td(content, extraStyle){
  return '<td style="padding:8px 12px;' + (extraStyle || '') + '">' + content + '</td>';
}

function _renderAiIntakeShell(){
  // Static skeleton — populated by AiIntakeQueue._bindAi() once data loads.
  // The three mount-points are filled in by:
  //   #aiq-kpi-mount    → _renderKpiHeader()  (cards from state.cases)
  //   #aiq-filter-mount → _renderFilters()    (status select + refresh)
  //   #aiq-list-mount   → _renderList()       (table)
  return '<div style="display:flex;flex-direction:column;height:calc(100vh - 220px);background:#fff;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;overflow:hidden">'
    + '<div id="aiq-kpi-mount"></div>'
    + '<div id="aiq-filter-mount"></div>'
    + '<div id="aiq-list-mount" style="flex:1;overflow:auto"></div>'
    + '</div>';
}

function _render(){
  var h='<div class="sj-wrap">';
  // PR #2 — top-level tabs
  h += _renderOrdersTabStrip();

  if (_activeTab === 'ai-intake') {
    // PR #3 — AI Intake Queue (full implementation)
    h += _renderAiIntakeShell();
    h += '</div>';
    _container.innerHTML = h;
    _bind();
    AiIntakeQueue.init();
    return;
  }

  if (_activeTab === 'customer-pos') {
    // PR #4 — Customer POs list
    h += '<div id="orders-cpo-mount" style="padding:16px"></div>';
    h += '</div>';
    _container.innerHTML = h;
    _bind();
    OrdersCpoView.init();
    return;
  }

  if (_activeTab === 'quarantine') {
    // PR #4 — Security Quarantine
    h += '<div id="orders-quar-mount" style="padding:16px"></div>';
    h += '</div>';
    _container.innerHTML = h;
    _bind();
    OrdersQuarantineView.init();
    return;
  }

  if (_activeTab === 'logs') {
    // PR #4 — Logs & Diagnostics
    h += '<div id="orders-logs-mount" style="padding:16px"></div>';
    h += '</div>';
    _container.innerHTML = h;
    _bind();
    OrdersLogsView.init();
    return;
  }

  // ── SO/JO/WO tab — preserves existing Order Control Tower exactly
  h+='<header class="sj-topbar"><div class="sj-title-group"><small class="sj-eyebrow">'+_t('Order Control Tower','Order Control Tower')+'</small><h1>'+_t('Quản lý đơn hàng tích hợp','Integrated Order Management')+'</h1><p>'+_t('Bám promise/commit thương mại, readiness kỹ thuật, launch gate MES và bộ chứng từ giao hàng trên cùng một mặt điều hành.','Track commercial promise and commit, engineering readiness, MES launch gates, and shipment documents in one operating surface.')+'</p></div><div class="sj-toolbar"><div class="sj-toolbar-note">'+_t('Lần làm mới','Refreshed')+': <strong>'+_esc(_lastRefreshAt?_fmtDateTime(_lastRefreshAt):'-')+'</strong></div><div class="sj-actions"><button type="button" class="sj-btn" id="'+_id+'-refresh">'+_t('Làm mới','Refresh')+'</button>'+(_canAccessPurchasing()?'<button type="button" class="sj-btn subtle" id="'+_id+'-open-po">'+_t('PO / IQC','PO / IQC')+'</button>':'')+( _permission('so','create')?'<button type="button" class="sj-btn accent" id="'+_id+'-new-so">+ SO</button>':'' )+( _permission('jo','create')?'<button type="button" class="sj-btn accent-2" id="'+_id+'-new-jo">+ JO</button>':'' )+( _permission('wo','create')?'<button type="button" class="sj-btn accent-3" id="'+_id+'-new-wo">+ WO</button>':'' )+'</div><div class="sj-switch"><button class="'+(_view==='hierarchy'?'active':'')+'" data-view="hierarchy">'+_t('Chuỗi đơn','Portfolio')+'</button><button class="'+(_view==='pipeline'?'active':'')+'" data-view="pipeline">'+_t('Điều phối','Dispatch')+'</button><button class="'+(_view==='table'?'active':'')+'" data-view="table">'+_t('Đăng ký','Register')+'</button></div></div></header>';
  h+='<section class="sj-overview"><div class="sj-overview-main">'+_renderMetricDeck()+'</div><div class="sj-overview-side">'+_renderPhaseBoard()+_renderGovernanceBoard()+'</div></section>';
  h+='<section class="sj-layout"><aside class="sj-aside">'+_renderExceptionRadar()+_renderFoundationMini()+'</aside><main class="sj-workspace">'+_renderFilters()+_renderView()+'</main></section>';
  h+='<div class="sj-overlay" id="'+_id+'-overlay"></div><aside class="sj-detail" id="'+_id+'-detail"><div class="sj-detail-head"><div><small class="sj-eyebrow">'+_t('Inspector','Inspector')+'</small><h2>'+_t('Chi tiết đơn hàng','Order inspector')+'</h2></div><button type="button" id="'+_id+'-close-detail">×</button></div><div class="sj-detail-body" id="'+_id+'-detail-body"></div><div class="sj-detail-actions" id="'+_id+'-detail-actions"></div></aside></div>';
  _container.innerHTML=h;
  _bind();
}
function _detailField(label,val){ if(val==null||val==='') return ''; return '<div class="sj-f"><small>'+_esc(label)+'</small><strong>'+_esc(val)+'</strong></div>'; }
function _detailPrimaryFields(type,o){
  if(type==='so') return [
    _detailField(_t('Khách hàng','Customer'),o.customer_name||o.customer_id),
    _detailField(_t('Customer site','Customer site'),o.customer_site_name||o.customer_site_id),
    _detailField(_t('PO khách hàng','Customer PO'),o.customer_po),
    _detailField(_t('Requested date','Requested date'),o.requested_date?_fmtDate(o.requested_date):''),
    _detailField(_t('Promise date','Promise date'),o.promise_date?_fmtDate(o.promise_date):''),
    _detailField(_t('Commit date','Commit date'),o.commit_date?_fmtDate(o.commit_date):''),
    _detailField(_t('Due date','Due date'),o.due_date?_fmtDate(o.due_date):''),
    _detailField(_t('Incoterm','Incoterm'),o.incoterm_name||o.incoterm_code),
    _detailField(_t('Shipping method','Shipping method'),o.shipping_method_name||o.shipping_method_id),
    _detailField(_t('Payment term','Payment term'),o.payment_term_name||o.payment_term_code),
    _detailField(_t('Contract review','Contract review'),o.contract_review||o.contract_review_status),
    _detailField(_t('Fulfillment','Fulfillment'),o.fulfillment_status),
    _detailField(_t('Ưu tiên','Priority'),o.priority),
    _detailField(_t('Tổng số lượng','Total quantity'),o.total_qty)
  ].filter(Boolean).join('');
  if(type==='jo') return [
    _detailField(_t('SO gốc','Parent SO'),o.so_number),
    _detailField(_t('Khách hàng','Customer'),o.customer_name||o.customer_id),
    _detailField(_t('Part / Rev','Part / Rev'),_partRev(o.part_number,o.part_revision)),
    _detailField(_t('Mô tả part','Part description'),o.part_description),
    _detailField(_t('Material spec','Material spec'),o.material_spec),
    _detailField(_t('Qty ordered','Qty ordered'),o.qty_ordered),
    _detailField(_t('Planned start','Planned start'),o.start_date?_fmtDate(o.start_date):''),
    _detailField(_t('Release target','Release target'),o.release_target_date?_fmtDate(o.release_target_date):''),
    _detailField(_t('Due date','Due date'),o.due_date?_fmtDate(o.due_date):''),
    _detailField(_t('Routing','Routing'),o.routing_name||o.routing_id),
    _detailField(_t('BOM','BOM'),o.bom_name||o.bom_id),
    _detailField(_t('Control plan','Control plan'),o.control_plan_name||o.control_plan_id),
    _detailField(_t('Inspection plan','Inspection plan'),o.inspection_plan_name||o.inspection_plan_id),
    _detailField(_t('Traveler template','Traveler template'),o.traveler_template_name||o.traveler_template_id),
    _detailField(_t('Engineering release','Engineering release'),o.engineering_release_status),
    _detailField(_t('Material readiness','Material readiness'),o.material_ready_status),
    _detailField(_t('Quality plan','Quality plan'),o.quality_plan_status),
    _detailField(_t('Source inspection','Source inspection'),o.source_inspection_status),
    _detailField(_t('Outside processing','Outside processing'),o.outside_processing_status),
    _detailField(_t('Special process','Special process'),[o.special_process,o.special_process_supplier_id].filter(Boolean).join(' · ')),
    _detailField(_t('Traceability level','Traceability level'),o.traceability_level)
  ].filter(Boolean).join('');
  return [
    _detailField(_t('JO gốc','Parent JO'),o.jo_number),
    _detailField(_t('Operation','Operation'),'OP'+String(o.operation_number||'-')+' · '+(o.operation_desc||'-')),
    _detailField(_t('Machine','Machine'),o.machine_name||o.machine_id),
    _detailField(_t('Work center','Work center'),o.work_center_name||o.work_center_id),
    _detailField(_t('Operator','Operator'),o.operator_name||o.operator_id),
    _detailField(_t('Dispatch priority','Dispatch priority'),o.dispatch_priority),
    _detailField(_t('NC program','NC program'),o.nc_program_id),
    _detailField(_t('Scheduled start','Scheduled start'),o.scheduled_start?_fmtDateTime(o.scheduled_start):''),
    _detailField(_t('Scheduled end','Scheduled end'),o.scheduled_end?_fmtDateTime(o.scheduled_end):''),
    _detailField(_t('Actual start','Actual start'),o.actual_start?_fmtDateTime(o.actual_start):''),
    _detailField(_t('Actual end','Actual end'),o.actual_end?_fmtDateTime(o.actual_end):''),
    _detailField(_t('Setup est/act','Setup est/act'),[o.setup_time_est,o.setup_time_actual].filter(function(v){ return v!=null&&v!==''; }).join(' / ')),
    _detailField(_t('Run est/act','Run est/act'),[o.run_time_est,o.run_time_actual].filter(function(v){ return v!=null&&v!==''; }).join(' / ')),
    _detailField(_t('Quality gate','Quality gate'),o.quality_gate_status),
    _detailField(_t('First piece','First piece'),o.first_piece_status),
    _detailField(_t('Handover','Handover'),o.handover_status),
    _detailField(_t('Material lot','Material lot'),o.material_lot_number),
    _detailField(_t('Heat number','Heat number'),o.heat_number),
    _detailField(_t('Traveler','Traveler'),[o.traveler_number,o.traveler_status].filter(Boolean).join(' · ')),
    _detailField(_t('Material cert','Material cert'),o.material_cert_status)
  ].filter(Boolean).join('');
}
function _renderGateGrid(items){ return (items||[]).length?'<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Gate readiness','Gate readiness')+'</h4><p>'+_t('Các gate điều khiển phát hành, traceability và chứng từ của đơn hàng.','Governed gates controlling release, traceability, and shipment documentation.')+'</p></div><div class="sj-gate-grid">'+(items||[]).map(function(item){ var band=_bandMeta(item.band||'info'); return '<article class="sj-gate-card"><div class="sj-gate-top"><strong>'+_esc(_t(item.label_vi||'',item.label_en||''))+'</strong><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span></div><p>'+_esc(_t(item.message_vi||item.summary_vi||'',item.message_en||item.summary_en||''))+'</p>'+(item.blocker?'<small>'+_t('Gate này đang chặn bước tiếp theo.','This gate is blocking the next step.')+'</small>':'')+'</article>'; }).join('')+'</div></section>':''; }
function _renderExceptionGrid(items){ return (items||[]).length?'<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Ngoại lệ mở','Open exceptions')+'</h4><p>'+_t('Các ngoại lệ được gom từ gate readiness và open action.','Exceptions rolled up from gate readiness and open actions.')+'</p></div><div class="sj-exception-grid">'+(items||[]).map(function(item){ var band=_bandMeta(item.severity==='critical'?'critical':(item.severity==='warning'?'warning':'info')); return '<article class="sj-ex-card"><div class="sj-ex-card-top"><strong>'+_esc(_t(item.title_vi||'',item.title_en||''))+'</strong><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(_t(band.vi,band.en))+'</span></div><p>'+_esc(_t(item.message_vi||'',item.message_en||''))+'</p><div class="sj-ex-card-meta">'+(item.owner?'<span>'+_esc(item.owner)+'</span>':'')+(item.due_date?'<span>'+_esc(_fmtDate(item.due_date))+'</span>':'')+'</div></article>'; }).join('')+'</div></section>':''; }
function _renderMilestones(items){ return (items||[]).length?'<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Milestones','Milestones')+'</h4><p>'+_t('Mốc cam kết và thực thi được hệ thống theo dõi cho từng SO/JO/WO.','Committed and execution milestones tracked for each SO, JO, and WO.')+'</p></div><div class="sj-timeline sj-timeline-flat">'+(items||[]).map(function(item){ return '<div class="sj-tl-item"><div class="sj-tl-dot"></div><div class="sj-tl-content"><strong>'+_esc(_t(item.title_vi||item.code||'',item.title_en||item.code||''))+'</strong><span class="sj-tl-date">'+_esc(item.date?_fmtDate(item.date):'-')+'</span>'+(item.owner?'<span class="sj-tl-user">'+_esc(item.owner)+'</span>':'')+'</div></div>'; }).join('')+'</div></section>':''; }
function _renderDocuments(items){ return (items||[]).length?'<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Bộ chứng từ','Document pack')+'</h4><p>'+_t('Chứng từ bắt buộc cho release giao hàng và truy xuất khách hàng.','Mandatory documents for shipment release and customer traceability.')+'</p></div><div class="sj-doc-list">'+(items||[]).map(function(item){ var band=_bandMeta(item.status==='ready'||item.status==='approved'?'ready':(item.status==='not_required'?'not_required':'warning')); return '<div class="sj-doc-item"><div><strong>'+_esc(_t(item.title_vi||item.code||'',item.title_en||item.code||''))+'</strong><span>'+_esc(item.owner||'')+'</span></div><span class="sj-band-pill" style="background:'+band.bg+';color:'+band.color+'">'+_esc(item.status||'')+'</span></div>'; }).join('')+'</div></section>':''; }
function _renderRelatedSection(type,o){ var rows=[]; if(type==='so') rows=(o.job_orders||[]).map(function(jo){ return '<button type="button" class="sj-related-row sj-select-order" data-id="'+_esc(jo.jo_number||'')+'" data-type="jo"><strong>'+_esc(jo.jo_number||'-')+'</strong><span>'+_esc(_partRev(jo.part_number,jo.part_revision))+'</span></button>'; }); else if(type==='jo') rows=(o.work_orders||o.operations||[]).map(function(wo){ return '<button type="button" class="sj-related-row sj-select-order" data-id="'+_esc(wo.wo_number||'')+'" data-type="wo"><strong>'+_esc(wo.wo_number||'-')+'</strong><span>'+_esc('OP'+String(wo.operation_number||'-')+' · '+(wo.operation_desc||'-'))+'</span></button>'; }); else if(o.job_order) rows=['<button type="button" class="sj-related-row sj-select-order" data-id="'+_esc(o.job_order.jo_number||'')+'" data-type="jo"><strong>'+_esc(o.job_order.jo_number||'-')+'</strong><span>'+_esc(_partRev(o.job_order.part_number,o.job_order.part_revision))+'</span></button>']; return rows.length?'<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Liên kết cấu trúc','Related structure')+'</h4><p>'+_t('Các đơn liên quan trong chuỗi SO > JO > WO.','Related records in the SO > JO > WO structure.')+'</p></div><div class="sj-related-list">'+rows.join('')+'</div></section>':''; }
function _showDetail(id,type){
  var overlay=document.getElementById(_id+'-overlay'), detail=document.getElementById(_id+'-detail'), body=document.getElementById(_id+'-detail-body'), actions=document.getElementById(_id+'-detail-actions');
  overlay.classList.add('active'); detail.classList.add('open'); body.innerHTML='<div class="sj-loading"><div class="sj-spinner"></div></div>'; actions.innerHTML='';
  _api('order_detail',{ order_id:id, order_type:type }).then(function(res){
    if(!res||!res.ok){ body.innerHTML='<p class="sj-error">'+_t('Không thể tải chi tiết.','Unable to load detail.')+'</p>'; return; }
    var o=res.data||{}; _selected={ id:id, type:type, data:o }; var band=_bandMeta(_recordBand(o)); var html='<section class="sj-detail-hero"><div class="sj-detail-hero-main"><small class="sj-eyebrow">'+_recordType(o).toUpperCase()+'</small><h3>'+_esc(_recordTitle(o))+'</h3><p>'+_esc(_recordSupport(o)||_recordId(o))+'</p>'+_renderRecordBadges(o)+'</div><div class="sj-detail-kpi-grid"><div class="sj-detail-kpi"><small>'+_t('Readiness','Readiness')+'</small><strong>'+(_recordReadiness(o)==null?'-':_esc(Math.round(_recordReadiness(o)))+'%')+'</strong></div><div class="sj-detail-kpi"><small>'+_t('Hoàn thành','Complete')+'</small><strong>'+(_recordCompletion(o)==null?'-':_esc(Math.round(_recordCompletion(o)))+'%')+'</strong></div><div class="sj-detail-kpi"><small>'+_t('Ngoại lệ','Exceptions')+'</small><strong>'+_esc(_recordExceptionCount(o))+'</strong></div><div class="sj-detail-kpi"><small>'+_t('Trễ','Late')+'</small><strong>'+_esc(_recordLateDays(o)>0?_recordLateDays(o)+'d':'0d')+'</strong></div><div class="sj-detail-kpi tone-'+_recordBand(o)+'"><small>'+_t('Health band','Health band')+'</small><strong>'+_esc(_t(band.vi,band.en))+'</strong></div></div></section>';
    html+='<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Thông tin chính','Primary details')+'</h4><p>'+_t('Bộ dữ liệu nền và trường vận hành chính của bản ghi hiện tại.','Core master-data and operational fields for the selected record.')+'</p></div><div class="sj-grid">'+_detailPrimaryFields(type,o)+'</div></section>';
    html+=_renderGateGrid(o.gate_cards||[]);
    html+=_renderExceptionGrid(o.exception_cards||[]);
    html+=_renderMilestones(o.milestones||[]);
    html+=_renderDocuments(o.document_requirements||[]);
    html+=_renderRelatedSection(type,o);
    if((o.status_history||[]).length){ html+='<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Lịch sử trạng thái','Status history')+'</h4><p>'+_t('Dòng thời gian chuyển trạng thái của đơn hàng.','Lifecycle timeline for the selected record.')+'</p></div><div class="sj-history">'+(o.status_history||[]).slice().reverse().map(function(entry){ var st=_status(type,entry.status||''); return '<div class="sj-h"><strong>'+_esc(st.text)+'</strong><span>'+_esc(_fmtDateTime(entry.timestamp||entry.date||''))+'</span>'+(entry.user?'<em>'+_esc(entry.user)+'</em>':'')+(entry.note?'<p>'+_esc(entry.note)+'</p>':'')+'</div>'; }).join('')+'</div></section>'; }
    if((o.change_history||[]).length){ html+='<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Lịch sử chỉnh sửa','Change history')+'</h4><p>'+_t('Các thay đổi trường dữ liệu đã được lưu vết.','Tracked edits made on the order record.')+'</p></div><div class="sj-history">'+(o.change_history||[]).slice().reverse().map(function(entry){ var summary=(entry.changes||[]).map(function(c){ return (c.field||'') + ': ' + (c.old==null?'—':String(c.old)) + ' → ' + (c.new==null?'—':String(c.new)); }).join(' · '); return '<div class="sj-h"><strong>'+_esc(_fmtDateTime(entry.timestamp||''))+'</strong><span>'+_esc(entry.user||'')+'</span><p>'+_esc(summary||_t('Không có thay đổi nội dung.','No field change.'))+'</p></div>'; }).join('')+'</div></section>'; }
    html+='<section class="sj-sec"><div class="sj-sec-head"><h4>'+_t('Hồ sơ liên kết','Linked Evidence')+'</h4><p>'+_t('Biểu mẫu và chứng cứ đang liên kết với bản ghi này.','Forms and evidence currently linked to this record.')+'</p></div><div id="'+_id+'-linked-forms-panel"><div class="sj-loading"><div class="sj-spinner"></div></div></div>'+(_permission(type,'edit')?'<button type="button" class="sj-btn subtle" id="'+_id+'-link-form">'+_t('Liên kết hồ sơ','Link record')+'</button>':'')+'</section>';
    body.innerHTML=html;
    _loadLinkedFormsPanel(id, type);
    var next=(TRANSITIONS[type]&&TRANSITIONS[type][o.status||''])?TRANSITIONS[type][o.status||'']:[];
    var actHtml='';
    if(next.length){ actHtml+='<button type="button" class="sj-btn" id="'+_id+'-change-status">'+_t('Chuyển trạng thái','Change status')+'</button>'; }
    if(_permission(type,'edit')){ actHtml+='<button type="button" class="sj-btn subtle" id="'+_id+'-edit-order">'+_t('Chỉnh sửa','Edit')+'</button>'; }
    if(_canAccessPurchasing()){ actHtml+='<button type="button" class="sj-btn subtle" id="'+_id+'-open-purchasing-detail">'+_t('PO / IQC','PO / IQC')+'</button>'; }
    if(type==='so' && _permission('jo','create')){ actHtml+='<button type="button" class="sj-btn accent-2" id="'+_id+'-add-jo">+ JO</button>'; }
    if(type==='jo' && _permission('wo','create')){ actHtml+='<button type="button" class="sj-btn accent-3" id="'+_id+'-add-wo">+ WO</button>'; }
    actions.innerHTML=actHtml;
    var statusBtn=document.getElementById(_id+'-change-status'); if(statusBtn) statusBtn.onclick=function(){ _showStatusTransition(type,_selected.id,o.status||''); };
    var editBtn=document.getElementById(_id+'-edit-order'); if(editBtn) editBtn.onclick=function(){ _showEdit(type, _selected.data||o); };
    var openPurchasingBtn=document.getElementById(_id+'-open-purchasing-detail'); if(openPurchasingBtn) openPurchasingBtn.onclick=function(){ if(typeof window._openPurchasingWorkspace==='function') window._openPurchasingWorkspace(_purchasingContext(_selected.data||o, type)); };
    var addJoBtn=document.getElementById(_id+'-add-jo'); if(addJoBtn) addJoBtn.onclick=function(){ _showCreateInContext('jo',{ so_number:_selected.id }); };
    var addWoBtn=document.getElementById(_id+'-add-wo'); if(addWoBtn) addWoBtn.onclick=function(){ _showCreateInContext('wo',{ jo_number:_selected.id }); };
    var linkBtn=document.getElementById(_id+'-link-form'); if(linkBtn) linkBtn.onclick=_showLinkModal;
    Array.prototype.forEach.call(body.querySelectorAll('.sj-select-order'), function(btn){ btn.onclick=function(){ _showDetail(btn.getAttribute('data-id'),btn.getAttribute('data-type')); }; });
  });
}

// ── G2 P1-01: Linked Evidence panel ───────────────────────────────
function _loadLinkedFormsPanel(orderId, orderType) {
  var panel = document.getElementById(_id + '-linked-forms-panel');
  if (!panel) return;
  fetch('api.php?action=order_get_linked_forms&order_type=' + encodeURIComponent(orderType) + '&order_id=' + encodeURIComponent(orderId), {
    method: 'GET', credentials: 'include',
    headers: typeof csrfToken !== 'undefined' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
  }).then(function(r) { return r.json(); }).then(function(res) {
    if (!res || !res.ok) { panel.innerHTML = '<p class="sj-muted">' + _t('Không thể tải hồ sơ liên kết.', 'Unable to load linked forms.') + '</p>'; return; }
    var forms = res.forms || [];
    if (!forms.length) { panel.innerHTML = '<p class="sj-muted">' + _t('Chưa có hồ sơ liên kết nào.', 'No linked evidence yet.') + '</p>'; return; }
    var h = '<table class="sj-link-tbl"><thead><tr>'
      + '<th>' + _t('Mã hồ sơ', 'Record ID') + '</th>'
      + '<th>' + _t('Biểu mẫu', 'Form Code') + '</th>'
      + '<th>' + _t('Trạng thái', 'Status') + '</th>'
      + '<th>' + _t('Ngày', 'Date') + '</th>'
      + '<th>' + _t('Người tạo', 'Created by') + '</th>'
      + '<th>' + _t('Nguồn', 'Source') + '</th>'
      + '</tr></thead><tbody>';
    forms.forEach(function(f) {
      var st = f.alloc_status || f.status || 'linked';
      var stLabel = { linked: _t('Đã liên kết', 'Linked'), allocated: _t('Đã cấp phát', 'Allocated'), submitted: _t('Đã nộp', 'Submitted'), downloaded: _t('Đã tải', 'Downloaded'), received: _t('Đã nhận', 'Received'), void: _t('Đã hủy', 'Void') };
      var stColor = { linked: 'var(--blue-light,#3b82f6)', allocated: 'var(--text-secondary,#94a3b8)', submitted: 'var(--green-light,#10b981)', downloaded: 'var(--amber-light,#f59e0b)', received: 'var(--purple-light,#8b5cf6)', void: 'var(--red-light,#ef4444)' };
      var displaySt = stLabel[st] || _esc(st);
      var color = stColor[st] || '#94a3b8';
      var dateStr = _fmtDateTime(f.created_at || f.linked_at || '');
      var who = f.created_by || f.linked_by || '';
      var src = f.auto_linked ? _t('Tự động', 'Auto') : _t('Thủ công', 'Manual');
      h += '<tr>'
        + '<td><strong>' + _esc(f.record_id || '-') + '</strong></td>'
        + '<td>' + _esc(f.form_code || '-') + '</td>'
        + '<td><span class="sj-tag" style="background:' + _rgba(color, 0.12) + ';color:' + color + '">' + displaySt + '</span></td>'
        + '<td>' + _esc(dateStr) + '</td>'
        + '<td>' + _esc(who) + '</td>'
        + '<td><span class="sj-tag" style="background:' + (f.auto_linked ? _rgba('#10b981', 0.12) : _rgba('#3b82f6', 0.12)) + ';color:' + (f.auto_linked ? 'var(--green-light,#10b981)' : 'var(--blue-light,#3b82f6)') + '">' + src + '</span></td>'
        + '</tr>';
    });
    h += '</tbody></table>';
    panel.innerHTML = h;
  }).catch(function() {
    panel.innerHTML = '<p class="sj-muted">' + _t('Lỗi khi tải hồ sơ liên kết.', 'Error loading linked evidence.') + '</p>';
  });
}

function _showFoundations(){
  var groups=_foundationSnapshot();
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_t('Bản đồ dữ liệu nền','Foundation map')+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><div class="sj-foundation-grid">'+groups.map(function(group){ return '<section class="sj-foundation-card"><h4>'+_esc(_t(group.titleVi,group.titleEn))+'</h4><strong>'+_esc(group.total)+'</strong><div class="sj-foundation-detail">'+group.detail.map(function(item){ return '<div class="sj-foundation-detail-row"><span>'+_esc(item.key)+'</span><strong>'+_esc(item.count)+'</strong></div>'; }).join('')+'</div>'+(group.missing.length?'<p>'+_t('Thiếu: ','Missing: ')+_esc(group.missing.join(', '))+'</p>':'<p>'+_t('Đã có tối thiểu dữ liệu nền cho nhóm này.','Baseline data is present for this group.')+'</p>')+'</section>'; }).join('')+'</div></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Đóng','Close')+'</button>'+(typeof window._mdOpenControl==='function'?'<button type="button" class="sj-btn accent" id="'+_id+'-foundation-open">'+_t('Mở dữ liệu nền','Open master data')+'</button>':'')+'</div>';
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var openBtn=modal.querySelector('#'+_id+'-foundation-open');
  if(openBtn) openBtn.onclick=function(){ close(); window._mdOpenControl('customers', {scope:'order_foundation'}); };
}

function _showLinkModal(){
  if(!_selected) return;
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal sj-modal-sm';
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_t('Liên kết hồ sơ','Link record')+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><label>'+_t('Mã hồ sơ','Record ID')+'</label><input id="'+_id+'-record-link" class="sj-input" placeholder="NCR-2026-001"></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-record-submit">'+_t('Liên kết','Link')+'</button></div>';
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var submitBtn=modal.querySelector('#'+_id+'-record-submit');
  submitBtn.onclick=function(){ var rid=(modal.querySelector('#'+_id+'-record-link').value||'').trim().toUpperCase(); if(!rid){ _toast(_t('Vui lòng nhập mã hồ sơ.','Please enter a record ID.'),'warn'); return; } _setSubmitLoading(submitBtn, true); _api('order_link_form',{ order_id:_selected.id, order_type:_selected.type, record_id:rid }).then(function(r){ _setSubmitLoading(submitBtn, false); if(r&&r.ok){ close(); _toast(_t('Đã liên kết hồ sơ.','Record linked.'),'success'); _showDetail(_selected.id,_selected.type); } else { _toast(_t('Không thể liên kết hồ sơ.','Unable to link record.'),'error'); } }).catch(function(){ _setSubmitLoading(submitBtn, false); _toast(_t('Lỗi kết nối.','Connection error.'),'error'); }); };
}

/* ── G4 P1-04: Modal helpers ─────────────────────────────────────── */
function _closeModal(overlay, modal){
  if(overlay && overlay.parentNode) overlay.remove();
  if(modal && modal.parentNode) modal.remove();
}
function _modalKeyHandler(overlay, modal){
  function handler(e){ if(e.key==='Escape'){ _closeModal(overlay, modal); document.removeEventListener('keydown', handler); } }
  document.addEventListener('keydown', handler);
  return handler;
}
function _setSubmitLoading(btn, loading){
  if(!btn) return;
  if(loading){ btn._origText=btn.textContent; btn.disabled=true; btn.textContent=_t('Đang xử lý...','Processing...'); }
  else { btn.disabled=false; btn.textContent=btn._origText||_t('Xác nhận','Confirm'); }
}

/* ── G4 P1-04: Status Transition Modal ──────────────────────────── */
function _showStatusTransition(type, orderId, currentStatus){
  var next=(TRANSITIONS[type]&&TRANSITIONS[type][currentStatus])?TRANSITIONS[type][currentStatus]:[];
  if(!next.length) return;
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal sj-modal-sm';
  var curSt=_status(type, currentStatus);
  var requiresNote=['cancelled','on_hold'];
  var h='<div class="sj-modal-head"><h3>'+_t('Chuyển trạng thái','Change Status')+'</h3><button type="button" class="sj-x">×</button></div>';
  h+='<div class="sj-modal-body"><div class="sj-st-current"><small>'+_t('Trạng thái hiện tại','Current status')+'</small><span class="sj-status" style="color:'+curSt.color+';background:'+_rgba(curSt.color,.12)+'">'+_esc(curSt.text)+'</span></div>';
  h+='<div class="sj-st-options"><small>'+_t('Chuyển sang','Transition to')+'</small>';
  next.forEach(function(s, i){ var st=_status(type, s); h+='<label class="sj-st-radio"><input type="radio" name="next_status" value="'+_esc(s)+'"'+(i===0?' checked':'')+'/><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.12)+'">'+_esc(st.text)+'</span></label>'; });
  h+='</div>';
  h+='<div class="sj-st-reason" id="'+_id+'-st-reason-wrap"><label>'+_t('Lý do (bắt buộc cho Hủy / Tạm dừng)','Reason (required for Cancel / Hold)')+'</label><textarea class="sj-input" id="'+_id+'-st-reason" rows="3" placeholder="'+_t('Nhập lý do...','Enter reason...')+'"></textarea></div>';
  h+='</div>';
  h+='<div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-st-submit">'+_t('Xác nhận','Confirm')+'</button></div>';
  modal.innerHTML=h;
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  // Show/hide reason based on selected status
  var radios=modal.querySelectorAll('[name="next_status"]');
  var reasonWrap=document.getElementById(_id+'-st-reason-wrap');
  function updateReasonVisibility(){ var val=''; radios.forEach(function(r){ if(r.checked) val=r.value; }); reasonWrap.style.display=(requiresNote.indexOf(val)>=0)?'':'none'; }
  radios.forEach(function(r){ r.onchange=updateReasonVisibility; }); updateReasonVisibility();
  var submitBtn=document.getElementById(_id+'-st-submit');
  submitBtn.onclick=function(){
    var selected=''; radios.forEach(function(r){ if(r.checked) selected=r.value; });
    if(!selected){ _toast(_t('Vui lòng chọn trạng thái mới.','Please select a new status.'),'warn'); return; }
    var reason=(document.getElementById(_id+'-st-reason').value||'').trim();
    if(requiresNote.indexOf(selected)>=0 && !reason){ _toast(_t('Vui lòng nhập lý do.','Please enter a reason.'),'warn'); return; }
    var payload={ order_id:orderId, status:selected };
    if(reason) payload.note=reason;
    _setSubmitLoading(submitBtn, true);
    _api(type==='so'?'order_so_update_status':type==='jo'?'order_jo_update_status':'order_wo_update_status', payload).then(function(r){
      _setSubmitLoading(submitBtn, false);
      if(r&&r.ok){ close(); _toast(_t('Đã cập nhật trạng thái.','Status updated.'),'success'); _refresh(); }
      else { _toast(_governanceError(r,'Không thể cập nhật trạng thái.','Unable to update status.'),'error'); }
    }).catch(function(){ _setSubmitLoading(submitBtn, false); _toast(_t('Lỗi kết nối.','Connection error.'),'error'); });
  };
}

/* ── G4 P1-04: Context-aware Create Modal ───────────────────────── */
function _showCreateInContext(type, prefill){
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  var titleMap={ so:_t('Tạo đơn hàng mới','Create Sales Order'), jo:_t('Tạo lệnh sản xuất','Create Job Order'), wo:_t('Tạo lệnh công đoạn','Create Work Order') };
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_esc(type.toUpperCase())+' · '+_esc(titleMap[type]||_t('Tạo mới','Create'))+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><form id="'+_id+'-ctx-form" class="sj-form">'+FIELDS[type].map(function(f){ return _renderField(f,type); }).join('')+'</form></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-ctx-submit">'+_t('Tạo mới','Create')+'</button></div>';
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var form=modal.querySelector('#'+_id+'-ctx-form');
  _hydrateCreateForm(type, form);
  // Prefill parent fields and make them readonly
  if(prefill){ Object.keys(prefill).forEach(function(k){ var inp=form.querySelector('[name="'+k+'"]'); if(inp){ inp.value=prefill[k]; inp.readOnly=true; inp.style.background='var(--bg-surface-alt,#f1f5f9)'; } var siWrap=document.getElementById(_id+'-'+type+'-'+k); if(siWrap){ siWrap.innerHTML='<input class="sj-input" name="'+k+'" value="'+_esc(prefill[k])+'" readonly style="background:var(--bg-surface-alt,#f1f5f9)"/>'; } }); }
  var submitBtn=document.getElementById(_id+'-ctx-submit');
  submitBtn.onclick=function(){
    if(!form.checkValidity()){ form.reportValidity(); return; }
    var fd=new FormData(form), payload={};
    fd.forEach(function(v,k){ if(v==='') return; var def=FIELDS[type].find(function(x){ return x.key===k; }); if(def&&def.type==='integer') payload[k]=parseInt(v,10); else if(def&&def.type==='number') payload[k]=parseFloat(v); else if(def&&def.type==='boolean') payload[k]=(v==='true'); else payload[k]=v; });
    _setSubmitLoading(submitBtn, true);
    _api(type==='so'?'order_so_create':type==='jo'?'order_jo_create':'order_wo_create', payload).then(function(r){
      _setSubmitLoading(submitBtn, false);
      if(r&&r.ok){ close(); _toast(_t('Tạo đơn thành công.','Order created successfully.'),'success'); _refresh(); }
      else { _toast((r&&r.error==='missing_required_fields')?_t('Vui lòng điền đầy đủ các trường bắt buộc.','Please fill all required fields.'):_t('Không thể tạo đơn.','Unable to create order.'),'error'); }
    }).catch(function(){ _setSubmitLoading(submitBtn, false); _toast(_t('Lỗi kết nối.','Connection error.'),'error'); });
  };
}

function _renderField(field,type){
  var label=_t(field.labelVi,field.labelEn), req=field.required?' required':'';
  var wide=field.span==='wide'?' wide':'';
  if(field.lookup) return '<div class="sj-form-field'+wide+'"><label>'+_esc(label)+'</label><div id="'+_id+'-'+type+'-'+field.key+'"></div></div>';
  if(field.type==='textarea') return '<div class="sj-form-field'+wide+'"><label>'+_esc(label)+'</label><textarea class="sj-input" name="'+field.key+'"'+req+(field.readonly?' readonly':'')+'></textarea></div>';
  if(field.type==='select') return '<div class="sj-form-field'+wide+'"><label>'+_esc(label)+'</label><select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option>'+_fieldSelectOptions(field).map(function(opt){ return '<option value="'+_esc(opt.value)+'">'+_esc(_t(opt.label,opt.labelEn||opt.label))+'</option>'; }).join('')+'</select></div>';
  if(field.type==='boolean') return '<div class="sj-form-field'+wide+'"><label>'+_esc(label)+'</label><select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option>'+_fieldSelectOptions({ optionSet:'boolean_true_false' }).map(function(opt){ return '<option value="'+_esc(opt.value)+'">'+_esc(_t(opt.label,opt.labelEn||opt.label))+'</option>'; }).join('')+'</select></div>';
  return '<div class="sj-form-field'+wide+'"><label>'+_esc(label)+'</label><input class="sj-input" name="'+field.key+'" type="'+(field.type==='date'?'date':field.type==='datetime'?'datetime-local':field.type==='number'||field.type==='integer'?'number':'text')+'"'+req+(field.readonly?' readonly':'')+(field.type==='number'?' step="any"':'')+'></div>';
}

function _showCreate(type){
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  var titleMap={ so:_t('Tạo đơn hàng mới','Create Sales Order'), jo:_t('Tạo lệnh sản xuất','Create Job Order'), wo:_t('Tạo lệnh công đoạn','Create Work Order') };
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_esc(type.toUpperCase())+' · '+_esc(titleMap[type]||_t('Tạo mới','Create'))+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><form id="'+_id+'-create-form" class="sj-form">'+FIELDS[type].map(function(f){ return _renderField(f,type); }).join('')+'</form></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-submit-create">'+_t('Tạo mới','Create')+'</button></div>';
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var form=modal.querySelector('#'+_id+'-create-form');
  _hydrateCreateForm(type,form);
  var submitBtn=modal.querySelector('#'+_id+'-submit-create');
  submitBtn.onclick=function(){
    if(!form.checkValidity()){ form.reportValidity(); return; }
    var fd=new FormData(form), payload={};
    fd.forEach(function(v,k){ if(v==='') return; var def=FIELDS[type].find(function(x){ return x.key===k; }); if(def&&def.type==='integer') payload[k]=parseInt(v,10); else if(def&&def.type==='number') payload[k]=parseFloat(v); else if(def&&def.type==='boolean') payload[k]=(v==='true'); else payload[k]=v; });
    _setSubmitLoading(submitBtn, true);
    _api(type==='so'?'order_so_create':type==='jo'?'order_jo_create':'order_wo_create',payload).then(function(r){
      _setSubmitLoading(submitBtn, false);
      if(r&&r.ok){ close(); _toast(_t('Tạo đơn thành công.','Order created successfully.'),'success'); _refresh(); }
      else { _toast((r&&r.error==='missing_required_fields')?_t('Vui lòng điền đầy đủ các trường bắt buộc.','Please fill all required fields.'):_t('Không thể tạo đơn.','Unable to create order.'),'error'); }
    }).catch(function(){ _setSubmitLoading(submitBtn, false); _toast(_t('Lỗi kết nối.','Connection error.'),'error'); });
  };
}

function _hydrateCreateForm(type,form){
  if(typeof window._mdEnsureSnapshot==='function') window._mdEnsureSnapshot();
  FIELDS[type].forEach(function(field){
    if(!field.lookup) return;
    var target=document.getElementById(_id+'-'+type+'-'+field.key);
    if(!target) return;
    if(typeof SearchableInput==='function'){
      new SearchableInput({ containerId:target.id, fieldId:target.id+'-si', name:field.key, dataSource:_lookupRows(field.lookup), displayField:'label', valueField:'value', subField:'sub', placeholderVi:_t('Tìm và chọn','Search and select'), placeholder:'Search and select', strictSelect:true, storeValueInHiddenField:true, maxResults:40, onSelect:function(item){
        if(type==='so' && field.key==='customer_id'){
          _reloadCustomerSiteDropdowns(type, form, item && item.value ? item.value : '');
        }
        if(type==='jo' && field.key==='part_number'){
          var desc=form.querySelector('[name="part_description"]'); if(desc) desc.value=item.description||'';
          _reloadRevisionDropdown(type, form, item.value);
        }
      } });
    } else {
      target.innerHTML='<select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option>'+_lookupRows(field.lookup).map(function(x){ return '<option value="'+_esc(x.value)+'">'+_esc(x.label+(x.sub?' · '+x.sub:''))+'</option>'; }).join('')+'</select>';
      if(type==='jo' && field.key==='part_number'){
        var sel=target.querySelector('select');
        if(sel) sel.onchange=function(){ _reloadRevisionDropdown(type, form, sel.value); var desc=form.querySelector('[name="part_description"]'); if(desc){ var m=_master(); var p=(m.parts||[]).find(function(x){ return x.part_number===sel.value; }); desc.value=p?p.part_description||'':''; } };
      }
      if(type==='so' && field.key==='customer_id'){
        var customerSel=target.querySelector('select');
        if(customerSel) customerSel.onchange=function(){ _reloadCustomerSiteDropdowns(type, form, customerSel.value || ''); };
      }
    }
  });
  if(type==='so'){
    _reloadCustomerSiteDropdowns(type, form, '');
  }
  ['order_date','requested_date','promise_date','commit_date','due_date','start_date','release_target_date'].forEach(function(k){ var el=form.querySelector('[name="'+k+'"]'); if(el&&!el.value) el.value=_today(); });
  var desc=form.querySelector('[name="part_description"]'); if(desc) desc.readOnly=true;
}

function _datetimeLocal(value){
  if(!value) return '';
  var d = new Date(value);
  if(isNaN(d.getTime())) return String(value).replace(' ', 'T').slice(0, 16);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0, 16);
}

function _hydrateEditForm(type, form, data){
  if(typeof window._mdEnsureSnapshot==='function') window._mdEnsureSnapshot();
  var editable = EDITABLE_FIELDS[type] || [];
  FIELDS[type].forEach(function(field){
    var canEdit = editable.indexOf(field.key) >= 0;
    var target = document.getElementById(_id+'-'+type+'-'+field.key);
    var value = data[field.key];

    if(field.lookup){
      if(!target) return;
      if(!canEdit){
        target.innerHTML = '<input class="sj-input" name="'+field.key+'" value="'+_esc(value==null?'':value)+'" readonly style="background:var(--bg-surface-alt,#f1f5f9)">';
        return;
      }
      if(type==='jo' && field.key==='part_number') _selectedPartForRev = value || '';
      if(typeof SearchableInput==='function'){
        new SearchableInput({ containerId:target.id, fieldId:target.id+'-si', name:field.key, dataSource:_lookupRows(field.lookup), displayField:'label', valueField:'value', subField:'sub', placeholderVi:_t('Tìm và chọn','Search and select'), placeholder:'Search and select', strictSelect:true, storeValueInHiddenField:true, maxResults:40, onSelect:function(item){
          if(type==='so' && field.key==='customer_id'){
            _reloadCustomerSiteDropdowns(type, form, item && item.value ? item.value : '');
          }
          if(type==='jo' && field.key==='part_number'){
            var desc=form.querySelector('[name="part_description"]'); if(desc) desc.value=item.description||'';
            _reloadRevisionDropdown(type, form, item.value);
          }
        } });
        setTimeout(function(){ var si = SearchableInput.get(target.id+'-si'); if(si && value!=null && value!=='') si.setValue(value); }, 0);
      } else {
        target.innerHTML='<select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option>'+_lookupRows(field.lookup).map(function(x){ return '<option value="'+_esc(x.value)+'">'+_esc(x.label+(x.sub?' · '+x.sub:''))+'</option>'; }).join('')+'</select>';
        var sel = target.querySelector('select');
        if(sel) sel.value = value || '';
        if(type==='jo' && field.key==='part_number' && sel){
          sel.onchange=function(){ _reloadRevisionDropdown(type, form, sel.value); var desc=form.querySelector('[name="part_description"]'); if(desc){ var m=_master(); var p=(m.parts||[]).find(function(x){ return x.part_number===sel.value; }); desc.value=p?p.part_description||'':''; } };
        }
        if(type==='so' && field.key==='customer_id' && sel){
          sel.onchange=function(){ _reloadCustomerSiteDropdowns(type, form, sel.value || ''); };
        }
      }
      return;
    }

    var el = form.querySelector('[name="'+field.key+'"]');
    if(!el) return;
    if(field.type==='boolean') el.value = value === true ? 'true' : (value === false ? 'false' : '');
    else if(field.type==='datetime') el.value = _datetimeLocal(value);
    else el.value = value == null ? '' : value;
    if(!canEdit || field.readonly){
      if(el.tagName === 'SELECT'){ el.disabled = true; }
      else { el.readOnly = true; }
      el.style.background = 'var(--bg-surface-alt,#f1f5f9)';
    }
  });
  if(type==='so'){
    _reloadCustomerSiteDropdowns(type, form, data.customer_id || '', {
      customer_site_id: data.customer_site_id || '',
      ship_to_site_id: data.ship_to_site_id || ''
    });
  }
}

function _showEdit(type, data){
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  var titleMap={ so:_t('Chỉnh sửa đơn hàng','Edit Sales Order'), jo:_t('Chỉnh sửa lệnh sản xuất','Edit Job Order'), wo:_t('Chỉnh sửa lệnh công đoạn','Edit Work Order') };
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_esc(type.toUpperCase())+' · '+_esc(titleMap[type]||_t('Chỉnh sửa','Edit'))+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><form id="'+_id+'-edit-form" class="sj-form">'+FIELDS[type].map(function(f){ return _renderField(f,type); }).join('')+'</form></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-submit-edit">'+_t('Lưu thay đổi','Save changes')+'</button></div>';
  overlay.appendChild(modal); document.body.appendChild(overlay);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=function(e){ if(e.target===overlay) close(); }; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var form=modal.querySelector('#'+_id+'-edit-form');
  _hydrateEditForm(type, form, data||{});
  var submitBtn=modal.querySelector('#'+_id+'-submit-edit');
  submitBtn.onclick=function(){
    var fd=new FormData(form), changes={}, original=data||{};
    fd.forEach(function(v,k){ var def=FIELDS[type].find(function(x){ return x.key===k; }); if(!def) return;
      var parsed; if(def.type==='integer') parsed=parseInt(v,10); else if(def.type==='number') parsed=parseFloat(v); else if(def.type==='boolean') parsed=(v==='true'); else parsed=v;
      // Only include actually changed fields
      if(String(parsed) !== String(original[k] ?? '')) changes[k]=parsed;
    });
    if(!Object.keys(changes).length){ _toast(_t('Không có thay đổi nào.','No changes detected.'),'info'); return; }
    // ECR warning: part_revision, material_spec, routing_id on post-release JO
    var ECR_FIELDS = ['part_revision','material_spec','routing_id','bom_id','control_plan_id','inspection_plan_id','traveler_template_id'];
    var POST_RELEASE = ['released','active','on_hold','completed'];
    if(type==='jo' && POST_RELEASE.indexOf(original.status||'')>=0){
      var ecrChanged = ECR_FIELDS.filter(function(f){ return changes[f] !== undefined; });
      if(ecrChanged.length && !confirm(_t('Cảnh báo ECR: Bạn đang thay đổi ' + ecrChanged.join(', ') + ' trên JO đã phát hành. Thay đổi này yêu cầu Engineering Change Request (ECR). Tiếp tục?','ECR Warning: You are changing ' + ecrChanged.join(', ') + ' on a post-release JO. This requires an Engineering Change Request (ECR). Continue?'))){ return; }
    }
    _setSubmitLoading(submitBtn, true);
    _api('order_update_fields',{ order_type:type, order_id:data[type==='so'?'so_number':type==='jo'?'jo_number':'wo_number'], changes:changes }).then(function(r){
      _setSubmitLoading(submitBtn, false);
      if(r&&r.ok){ close(); _toast(_t('Đã cập nhật đơn hàng.','Order updated successfully.'),'success'); _refresh(); }
      else {
        var msg = (r&&r.message) ? r.message : _t('Không thể cập nhật đơn hàng.','Unable to update order.');
        if(r&&r.error==='revision_not_released') msg = _t('Revision chưa được phát hành. Chỉ revision đã released mới được sử dụng.','Revision is not released. Only released revisions are allowed.');
        if(r&&r.error==='ecr_required') msg = _t('Yêu cầu ECR trước khi thay đổi trường này.','ECR is required before changing this field.');
        _toast(msg,'error');
      }
    }).catch(function(){ _setSubmitLoading(submitBtn, false); _toast(_t('Lỗi kết nối.','Connection error.'),'error'); });
  };
}
function _bind(){
  // PR #2 — top-level tab strip click handler (binds before legacy IDs
  // so navigation works on placeholder tabs too).
  Array.prototype.forEach.call(_container.querySelectorAll('[data-orders-tab]'), function(btn){
    btn.onclick = function(){
      var next = btn.getAttribute('data-orders-tab');
      if (!next || next === _activeTab) return;
      _activeTab = next;
      _render();
    };
  });
  // For placeholder tabs (non SO/JO/WO), short-circuit the rest of the
  // bindings — the placeholder doesn't render the legacy IDs the code
  // below queries for.
  if (_activeTab !== 'so-jo-wo') {
    return;
  }
  var md=document.getElementById(_id+'-md'); if(md) md.onclick=function(){ if(typeof window._mdOpenControl==='function') window._mdOpenControl('customers', {scope:'order_foundation'}); };
  var foundations=document.getElementById(_id+'-foundations'); if(foundations) foundations.onclick=_showFoundations;
  var refresh=document.getElementById(_id+'-refresh'); if(refresh) refresh.onclick=_refresh;
  var openPo=document.getElementById(_id+'-open-po'); if(openPo) openPo.onclick=_openPurchasingFromSelection;
  var nso=document.getElementById(_id+'-new-so'); if(nso) nso.onclick=function(){ _showCreate('so'); };
  var njo=document.getElementById(_id+'-new-jo'); if(njo) njo.onclick=function(){ _showCreate('jo'); };
  var nwo=document.getElementById(_id+'-new-wo'); if(nwo) nwo.onclick=function(){ _showCreate('wo'); };
  Array.prototype.forEach.call(_container.querySelectorAll('.sj-switch button'), function(btn){ btn.onclick=function(){ _view=btn.getAttribute('data-view'); _render(); }; });
  Array.prototype.forEach.call(_container.querySelectorAll('.sj-select-order'), function(btn){ btn.onclick=function(){ _showDetail(btn.getAttribute('data-id'),btn.getAttribute('data-type')); }; });
  Array.prototype.forEach.call(_container.querySelectorAll('.sj-exception-item'), function(btn){ btn.onclick=function(){ _showDetail(btn.getAttribute('data-order-id'),btn.getAttribute('data-order-type')); }; });
  Array.prototype.forEach.call(_container.querySelectorAll('[data-sort]'), function(th){ th.onclick=function(){ var key=th.getAttribute('data-sort'); _tableSort={ key:key, dir:_tableSort.key===key&&_tableSort.dir==='asc'?'desc':'asc' }; _render(); }; });
  Array.prototype.forEach.call(_container.querySelectorAll('[data-band]'), function(btn){ btn.onclick=function(){ _filters.band=btn.getAttribute('data-band')||'all'; _render(); }; });
  var search=document.getElementById(_id+'-global-search'); if(search) search.oninput=function(){ _filters.search=search.value||''; _render(); };
  var typeFilter=document.getElementById(_id+'-type-filter'); if(typeFilter) typeFilter.onchange=function(){ _filters.type=typeFilter.value||'all'; _render(); };
  var phaseFilter=document.getElementById(_id+'-phase-filter'); if(phaseFilter) phaseFilter.onchange=function(){ _filters.phase=phaseFilter.value||'all'; _render(); };
  var close=document.getElementById(_id+'-close-detail'); if(close) close.onclick=function(){ document.getElementById(_id+'-detail').classList.remove('open'); document.getElementById(_id+'-overlay').classList.remove('active'); };
  var overlay=document.getElementById(_id+'-overlay'); if(overlay) overlay.onclick=function(){ document.getElementById(_id+'-detail').classList.remove('open'); overlay.classList.remove('active'); };
}

function _refresh(){
  if(!_container) return;
  _renderLoading();
  Promise.all([_api('order_dashboard_stats',{}), _api('order_hierarchy',{}), (typeof window._mdEnsureSnapshot==='function'?window._mdEnsureSnapshot(true):Promise.resolve(null))]).then(function(res){ _kpi=(res[0]&&res[0].ok)?(res[0].data||{}):{}; _hierarchy=(res[1]&&res[1].ok)?(res[1].data||res[1].hierarchy||[]):[]; _flat=_flatten(_hierarchy); _lastRefreshAt=(new Date()).toISOString(); _render(); if(_selected) _showDetail(_selected.id,_selected.type); }).catch(function(){ _kpi={}; _hierarchy=[]; _flat=[]; _lastRefreshAt=(new Date()).toISOString(); _render(); });
}

window._sojowoOpenCreate = function(type){
  var target = String(type || '').toLowerCase();
  if(['so','jo','wo'].indexOf(target) < 0) return false;
  if(!_container || !_container.isConnected) return false;
  _showCreate(target);
  return true;
};
window._sojowoRefresh = function(){ if(_container && _container.isConnected) _refresh(); };
window._renderSoJoWoDashboard=function(schemas,entries,container){ _container=container; _id=container.id||'sojowo'; if(!container.id) container.id=_id; _selected=null; _tableSearch=''; _filters={ search:'', type:'all', band:'all', phase:'all' }; _view='hierarchy'; _refresh(); };

})();

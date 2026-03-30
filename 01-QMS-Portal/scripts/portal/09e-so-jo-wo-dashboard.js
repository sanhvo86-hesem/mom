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
var _tableSort = { key:'order_number', dir:'asc' };
var _dragItem = null;

var STATUS = {
  so: {
    draft:{ vi:'Nháp', en:'Draft', color:'#94a3b8' },
    quoted:{ vi:'Đã báo giá', en:'Quoted', color:'#3b82f6' },
    confirmed:{ vi:'Đã xác nhận', en:'Confirmed', color:'#8b5cf6' },
    in_production:{ vi:'Đang sản xuất', en:'In Production', color:'#f59e0b' },
    shipped:{ vi:'Đã giao hàng', en:'Shipped', color:'#10b981' },
    closed:{ vi:'Đóng', en:'Closed', color:'#6b7280' },
    cancelled:{ vi:'Đã hủy', en:'Cancelled', color:'#ef4444' }
  },
  jo: {
    planned:{ vi:'Đã lập kế hoạch', en:'Planned', color:'#94a3b8' },
    released:{ vi:'Đã phát hành', en:'Released', color:'#3b82f6' },
    active:{ vi:'Đang chạy', en:'Active', color:'#f59e0b' },
    on_hold:{ vi:'Tạm dừng', en:'On Hold', color:'#ef4444' },
    completed:{ vi:'Hoàn thành', en:'Completed', color:'#10b981' },
    closed:{ vi:'Đóng', en:'Closed', color:'#6b7280' }
  },
  wo: {
    scheduled:{ vi:'Đã lên lịch', en:'Scheduled', color:'#94a3b8' },
    setup:{ vi:'Đang setup', en:'Setup', color:'#3b82f6' },
    running:{ vi:'Đang chạy', en:'Running', color:'#f59e0b' },
    inspection:{ vi:'Đang kiểm tra', en:'Inspection', color:'#8b5cf6' },
    completed:{ vi:'Hoàn thành', en:'Completed', color:'#10b981' },
    on_hold:{ vi:'Tạm dừng', en:'On Hold', color:'#ef4444' }
  }
};

var TRANSITIONS = {
  so:{ draft:['quoted','cancelled'], quoted:['confirmed','draft','cancelled'], confirmed:['in_production','cancelled'], in_production:['shipped','cancelled'], shipped:['closed'], closed:[], cancelled:[] },
  jo:{ planned:['released'], released:['active','on_hold'], active:['on_hold','completed'], on_hold:['active','released'], completed:['closed'], closed:[] },
  wo:{ scheduled:['setup','on_hold'], setup:['running','on_hold'], running:['inspection','completed','on_hold'], inspection:['completed','running'], completed:[], on_hold:['scheduled','setup','running'] }
};

var FIELDS = {
  so: [
    { key:'customer_id', labelVi:'Khách hàng', labelEn:'Customer', lookup:'customers', required:true },
    { key:'customer_po', labelVi:'PO khách hàng', labelEn:'Customer PO', required:true },
    { key:'order_date', labelVi:'Ngày đơn hàng', labelEn:'Order Date', type:'date', required:true },
    { key:'due_date', labelVi:'Ngày giao hàng', labelEn:'Due Date', type:'date', required:true },
    { key:'total_qty', labelVi:'Tổng số lượng', labelEn:'Total Qty', type:'integer', required:true },
    { key:'total_value', labelVi:'Giá trị đơn hàng (USD)', labelEn:'Order Value (USD)', type:'number' },
    { key:'priority', labelVi:'Mức ưu tiên', labelEn:'Priority', type:'select', options:['normal','high','urgent','aog'] },
    { key:'contract_review', labelVi:'Mã xem xét hợp đồng', labelEn:'Contract Review Ref' },
    { key:'special_requirements', labelVi:'Yêu cầu đặc biệt', labelEn:'Special Requirements', type:'textarea' }
  ],
  jo: [
    { key:'so_number', labelVi:'SO gốc', labelEn:'Parent SO', lookup:'so' },
    { key:'part_number', labelVi:'Part Number', labelEn:'Part Number', lookup:'parts', required:true },
    { key:'part_revision', labelVi:'Revision', labelEn:'Revision', lookup:'revisions', required:true },
    { key:'part_description', labelVi:'Mô tả chi tiết', labelEn:'Part Description', readonly:true },
    { key:'material_spec', labelVi:'Yêu cầu vật liệu', labelEn:'Material Spec', required:true },
    { key:'qty_ordered', labelVi:'Số lượng đặt', labelEn:'Qty Ordered', type:'integer', required:true },
    { key:'start_date', labelVi:'Ngày bắt đầu kế hoạch', labelEn:'Planned Start Date', type:'date', required:true },
    { key:'due_date', labelVi:'Ngày đến hạn JO', labelEn:'Job Due Date', type:'date', required:true },
    { key:'routing_id', labelVi:'Mã routing / process plan', labelEn:'Routing ID' },
    { key:'fai_required', labelVi:'Yêu cầu FAI', labelEn:'FAI Required', type:'boolean' },
    { key:'customer_source_inspection', labelVi:'Khách hàng witness / source inspection', labelEn:'Customer Source Inspection', type:'boolean' },
    { key:'special_process', labelVi:'Công đoạn đặc biệt', labelEn:'Special Process' }
  ],
  wo: [
    { key:'jo_number', labelVi:'JO gốc', labelEn:'Parent JO', lookup:'jo', required:true },
    { key:'operation_number', labelVi:'Số công đoạn', labelEn:'Operation Number', type:'integer', required:true },
    { key:'operation_desc', labelVi:'Tên công đoạn', labelEn:'Operation Description', required:true },
    { key:'machine_id', labelVi:'Mã máy', labelEn:'Machine ID', lookup:'machines', required:true },
    { key:'work_center_id', labelVi:'Mã work center', labelEn:'Work Center ID', lookup:'work_centers', required:true },
    { key:'operator_id', labelVi:'Người vận hành', labelEn:'Operator', lookup:'operators' },
    { key:'nc_program_id', labelVi:'Mã chương trình NC', labelEn:'NC Program ID' },
    { key:'setup_time_est', labelVi:'Setup kế hoạch (phút)', labelEn:'Estimated Setup (min)', type:'number' },
    { key:'run_time_est', labelVi:'Run kế hoạch (phút)', labelEn:'Estimated Run (min)', type:'number' },
    { key:'scheduled_start', labelVi:'Bắt đầu kế hoạch', labelEn:'Scheduled Start', type:'datetime' },
    { key:'scheduled_end', labelVi:'Kết thúc kế hoạch', labelEn:'Scheduled End', type:'datetime' },
    { key:'fixture_id', labelVi:'Mã đồ gá', labelEn:'Fixture ID' },
    { key:'material_lot_number', labelVi:'Số lô vật liệu', labelEn:'Material Lot Number' },
    { key:'heat_number', labelVi:'Số heat / melt', labelEn:'Heat Number' },
    { key:'traveler_number', labelVi:'Mã traveler', labelEn:'Traveler Number' },
    { key:'traveler_status', labelVi:'Trạng thái traveler', labelEn:'Traveler Status', type:'select', options:['pending','released','verified','attached','blocked'] },
    { key:'material_cert_status', labelVi:'Trạng thái chứng chỉ vật liệu', labelEn:'Material Certificate Status', type:'select', options:['pending','verified','approved','on_hold','rejected'] }
  ]
};

var EDITABLE_FIELDS = {
  so: ['customer_po','order_date','due_date','total_qty','priority','contract_review','special_requirements'],
  jo: ['part_revision','part_description','material_spec','qty_ordered','start_date','due_date','routing_id','fai_required','customer_source_inspection','special_process'],
  wo: ['operation_desc','machine_id','work_center_id','operator_id','nc_program_id','setup_time_est','run_time_est','scheduled_start','scheduled_end','fixture_id','material_lot_number','heat_number','traveler_number','traveler_status','material_cert_status']
};

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _fmtDate(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function _fmtDateTime(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):_fmtDate(v)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function _today(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _status(type, key){ var s=((STATUS[type]||{})[key]||{ vi:key||'-', en:key||'-', color:'#94a3b8' }); return { text:_t(s.vi,s.en), color:s.color }; }
function _rgba(hex,a){ var r=parseInt(hex.slice(1,3),16)||148, g=parseInt(hex.slice(3,5),16)||163, b=parseInt(hex.slice(5,7),16)||184; return 'rgba('+r+','+g+','+b+','+a+')'; }
function _api(action, payload, method){ if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000); return fetch('api.php?action='+encodeURIComponent(action), { method:method||'POST', credentials:'include', headers:{'Content-Type':'application/json', ...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})}, body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{}) }).then(function(r){ return r.json(); }); }
function _toast(msg, type){ var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); }, 180); }, 3200); }
function _governanceError(resp, fallbackVi, fallbackEn){ if(resp && resp.error==='wo_launch_blocked'){ var blockers=Array.isArray(resp.blockers)?resp.blockers:[]; var first=blockers[0]||{}; return _t(first.message_vi||'WO đang bị chặn vì chưa đạt điều kiện MES bắt buộc.','The WO is blocked because MES launch conditions are not yet satisfied.'); } return _t(fallbackVi, fallbackEn); }
function _permission(type, action){ var cfg={ so:{create:['sales_manager','estimator'],edit:['sales_manager','estimator','customer_service']}, jo:{create:['production_manager','planning_manager'],edit:['production_manager','planning_manager','quality_manager']}, wo:{create:['production_manager','planning_manager'],edit:['production_manager','planning_manager','supervisor','operator']} }; var role=(typeof currentUser!=='undefined'&&currentUser)?(currentUser.role||''):''; if(!role) return true; return ((cfg[type]||{})[action]||[]).indexOf(role)>=0; }
function _master(){ return (typeof window._mdGetSnapshot==='function' ? (window._mdGetSnapshot()||{}) : {}); }
function _flatten(h){ var rows=[]; (h||[]).forEach(function(so){ rows.push(Object.assign({_type:'so'},so)); (so.job_orders||[]).forEach(function(jo){ rows.push(Object.assign({_type:'jo'},jo)); (jo.work_orders||[]).forEach(function(wo){ rows.push(Object.assign({_type:'wo'},wo)); }); }); }); return rows; }
function _sortValue(item,key){ if(key==='order_number') return String(item.so_number||item.jo_number||item.wo_number||'').toLowerCase(); if(key==='type') return String(item._type||''); if(key==='subject') return String(item.customer_name||item.customer_id||item.part_number||item.operation_desc||'').toLowerCase(); if(key==='status') return String(item.status||''); if(key==='due_date') return String(item.due_date||item.scheduled_end||''); if(key==='qty') return Number(item.total_qty||item.qty_ordered||item.qty_completed||0); return ''; }
function _sortRows(rows,key,dir){ return rows.slice().sort(function(a,b){ var va=_sortValue(a,key), vb=_sortValue(b,key); var cmp=va<vb?-1:(va>vb?1:0); return dir==='asc'?cmp:-cmp; }); }
function _filterRows(rows,q){ if(!q) return rows; q=q.toLowerCase(); return rows.filter(function(r){ return [r.so_number,r.jo_number,r.wo_number,r.customer_name,r.customer_id,r.customer_po,r.part_number,r.part_revision,r.operation_desc,r.machine_id,r.status].filter(Boolean).join(' ').toLowerCase().indexOf(q)>=0; }); }
var _selectedPartForRev = '';
function _lookupRows(kind, filterContext){
  var m=_master();
  if(kind==='customers') return (m.customers||[]).map(function(x){ return { value:x.customer_id, label:x.customer_id, sub:x.customer_name||'' }; });
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
  if(kind==='work_centers') return (m.work_centers||[]).map(function(x){ return { value:x.work_center_id, label:x.work_center_id, sub:x.work_center_name||'' }; });
  if(kind==='machines') return (m.machines||[]).map(function(x){ return { value:x.machine_id, label:x.machine_id, sub:(x.machine_name||'') + (x.work_center_id ? ' · ' + x.work_center_id : '') }; });
  if(kind==='operators') return (m.operators||[]).map(function(x){ return { value:x.operator_id, label:x.operator_id, sub:(x.operator_name||'') + (x.role ? ' · ' + x.role : '') }; });
  if(kind==='so') return _flat.filter(function(x){ return x._type==='so'; }).map(function(x){ return { value:x.so_number, label:x.so_number, sub:(x.customer_name||x.customer_id||'') + (x.customer_po ? ' · PO ' + x.customer_po : '') }; });
  if(kind==='jo') return _flat.filter(function(x){ return x._type==='jo'; }).map(function(x){ return { value:x.jo_number, label:x.jo_number, sub:(x.part_number||'') + (x.part_revision ? ' · Rev.' + x.part_revision : '') }; });
  return [];
}
function _partRev(part, rev){ if(!part) return '-'; return part + (rev ? ' Rev.' + rev : ''); }
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
function _pipelineCol(status){ return ({ draft:'planned', quoted:'planned', confirmed:'active', in_production:'active', shipped:'completed', closed:'completed', cancelled:'cancelled', planned:'planned', released:'planned', active:'active', on_hold:'on_hold', scheduled:'planned', setup:'active', running:'active', inspection:'active', completed:'completed' })[status] || 'planned'; }
function _pipelineStatus(type,col){ var map={ so:{planned:'draft',active:'in_production',completed:'shipped',cancelled:'cancelled'}, jo:{planned:'planned',active:'active',on_hold:'on_hold',completed:'completed'}, wo:{planned:'scheduled',active:'running',on_hold:'on_hold',completed:'completed'} }; return map[type]?map[type][col]:null; }
function _renderLoading(){ _container.innerHTML='<div class="sj-wrap"><div class="sj-loading"><div class="sj-spinner"></div><p>'+_t('Đang tải dữ liệu đơn hàng...','Loading order data...')+'</p></div></div>'; }
function _renderTreeNode(node,type,depth){
  var id=node.so_number||node.jo_number||node.wo_number||'';
  var children=type==='so'?(node.job_orders||[]):(type==='jo'?(node.work_orders||[]):[]);
  var label=type==='so'?((node.customer_name||node.customer_id||'-') + (node.customer_po?' / PO '+node.customer_po:'')):type==='jo'?((node.part_number||'-')+(node.part_revision?' / Rev.'+node.part_revision:'')):((node.operation_desc||'-') + (node.machine_id?' ['+node.machine_id+']':''));
  var st=_status(type,node.status||'');
  var h='<div class="sj-node" style="padding-left:'+(depth*16)+'px"><div class="sj-node-row" data-id="'+_esc(id)+'" data-type="'+type+'">';
  h+=children.length?'<button type="button" class="sj-toggle" data-toggle="'+_esc(id)+'">▸</button>':'<span class="sj-toggle ph"></span>';
  h+='<span class="sj-chip">'+type.toUpperCase()+'</span><span class="sj-label">'+_esc(label)+'</span><span class="sj-id">'+_esc(id)+'</span>';
  if(node.due_date||node.scheduled_end) h+='<span class="sj-id">'+_esc(_fmtDate(node.due_date||node.scheduled_end))+'</span>';
  h+='<span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.12)+'">'+_esc(st.text)+'</span></div>';
  if(children.length){ h+='<div class="sj-children" data-children="'+_esc(id)+'">'; children.forEach(function(c){ h+=_renderTreeNode(c,type==='so'?'jo':'wo',depth+1); }); h+='</div>'; }
  h+='</div>'; return h;
}

function _renderView(){
  if(_view==='table'){
    var rows=_sortRows(_filterRows(_flat,_tableSearch.trim().toLowerCase()),_tableSort.key,_tableSort.dir);
    var h='<div class="sj-panel"><div class="sj-panel-head"><input id="'+_id+'-table-search" class="sj-input" value="'+_esc(_tableSearch)+'" placeholder="'+_t('Tìm SO / JO / WO, khách hàng, part...','Search SO / JO / WO, customer, part...')+'"></div><div class="sj-table-wrap"><table class="sj-table"><thead><tr><th data-sort="order_number">'+_t('Mã đơn','Order #')+'</th><th data-sort="type">'+_t('Loại','Type')+'</th><th data-sort="subject">'+_t('Khách hàng / Chi tiết','Customer / Part')+'</th><th data-sort="status">'+_t('Trạng thái','Status')+'</th><th data-sort="due_date">'+_t('Hạn','Due')+'</th><th data-sort="qty">'+_t('SL','Qty')+'</th></tr></thead><tbody>';
    if(!rows.length) h+='<tr><td colspan="6" class="sj-empty-row">'+_t('Không có dữ liệu','No data')+'</td></tr>';
    rows.forEach(function(r){ var type=r._type||'so', id=r.so_number||r.jo_number||r.wo_number||'', st=_status(type,r.status||''), subject=type==='so'?(r.customer_name||r.customer_id||'-'):type==='jo'?_partRev(r.part_number,r.part_revision):(r.operation_desc||'-')+(r.part_number?' · '+_partRev(r.part_number,r.part_revision):''); h+='<tr class="sj-row" data-id="'+_esc(id)+'" data-type="'+type+'"><td><code>'+_esc(id)+'</code></td><td>'+type.toUpperCase()+'</td><td>'+_esc(subject)+'</td><td><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.12)+'">'+_esc(st.text)+'</span></td><td>'+_esc(_fmtDate(r.due_date||r.scheduled_end||''))+'</td><td>'+_esc(r.total_qty||r.qty_ordered||r.qty_completed||'-')+'</td></tr>'; });
    return h+'</tbody></table></div></div>';
  }
  if(_view==='pipeline'){
    var groups={ planned:[], active:[], on_hold:[], completed:[], cancelled:[] }; _flat.forEach(function(r){ groups[_pipelineCol(r.status||'')].push(r); });
    return '<div class="sj-pipeline">'+['planned','active','on_hold','completed','cancelled'].map(function(col){ return '<section class="sj-col"><header>'+_esc(({ planned:_t('Kế hoạch','Planned'), active:_t('Đang chạy','Active'), on_hold:_t('Tạm dừng','On hold'), completed:_t('Hoàn thành','Completed'), cancelled:_t('Đã hủy','Cancelled') })[col])+'<span>'+groups[col].length+'</span></header><div class="sj-col-body" data-col="'+col+'">'+(groups[col].length?groups[col].map(function(r){ var type=r._type||'so', id=r.so_number||r.jo_number||r.wo_number||'', title=type==='so'?(r.customer_name||r.customer_id||'-'):type==='jo'?((r.part_number||'-')+(r.part_revision?' / Rev.'+r.part_revision:'')):(r.operation_desc||'-'); return '<article class="sj-card" draggable="true" data-id="'+_esc(id)+'" data-type="'+type+'"><strong>'+_esc(id)+'</strong><span>'+_esc(title)+'</span></article>'; }).join(''):'<div class="sj-empty-col">'+_t('Không có đơn','Empty')+'</div>')+'</div></section>'; }).join('')+'</div>';
  }
  return '<div class="sj-panel"><div class="sj-panel-head"><input id="'+_id+'-tree-search" class="sj-input" placeholder="'+_t('Tìm kiếm số đơn, khách hàng, part...','Search order number, customer, part...')+'"></div><div class="sj-tree" id="'+_id+'-tree">'+(_hierarchy.length?_hierarchy.map(function(x){ return _renderTreeNode(x,'so',0); }).join(''):'<div class="sj-empty">'+_t('Chưa có đơn hàng nào','No orders yet')+'</div>')+'</div></div>';
}

function _render(){
  var h='<div class="sj-wrap">';
  h+='<div class="sj-hero"><div><h1>'+_t('Quản lý đơn hàng','Order Management')+'</h1><p>'+_t('Kết nối khách hàng, SO, JO, WO và biểu mẫu để truy xuất thống nhất.','Connect customers, SOs, JOs, WOs, and records in one operating surface.')+'</p></div><div class="sj-actions">';
  if(typeof window._mdOpenControl==='function') h+='<button type="button" class="sj-btn" id="'+_id+'-md">'+_t('Dữ liệu nền','Master Data')+'</button>';
  h+='<button type="button" class="sj-btn" id="'+_id+'-refresh">'+_t('Làm mới','Refresh')+'</button>';
  if(_permission('so','create')) h+='<button type="button" class="sj-btn accent" id="'+_id+'-new-so">+ SO</button>';
  if(_permission('jo','create')) h+='<button type="button" class="sj-btn accent-2" id="'+_id+'-new-jo">+ JO</button>';
  if(_permission('wo','create')) h+='<button type="button" class="sj-btn accent-3" id="'+_id+'-new-wo">+ WO</button>';
  h+='<div class="sj-switch"><button class="'+(_view==='hierarchy'?'active':'')+'" data-view="hierarchy">'+_t('Cây phân cấp','Hierarchy')+'</button><button class="'+(_view==='pipeline'?'active':'')+'" data-view="pipeline">'+_t('Pipeline','Pipeline')+'</button><button class="'+(_view==='table'?'active':'')+'" data-view="table">'+_t('Bảng','Table')+'</button></div></div></div>';
  h+='<div class="sj-kpi"><div class="sj-kpi-card"><small>'+_t('SO đang hoạt động','Active SOs')+'</small><strong>'+_esc(_kpi.active_so||0)+'</strong></div><div class="sj-kpi-card"><small>'+_t('JO đang hoạt động','Active JOs')+'</small><strong>'+_esc(_kpi.active_jo||0)+'</strong></div><div class="sj-kpi-card"><small>'+_t('Tỷ lệ đúng hạn','On-time delivery')+'</small><strong>'+_esc(typeof _kpi.otd_percent==='number'?_kpi.otd_percent+'%':'-')+'</strong></div><div class="sj-kpi-card"><small>'+_t('Quá hạn','Overdue')+'</small><strong>'+_esc(_kpi.overdue_count||0)+'</strong></div></div>';
  h+='<div class="sj-main" id="'+_id+'-main">'+_renderView()+'</div><div class="sj-overlay" id="'+_id+'-overlay"></div><aside class="sj-detail" id="'+_id+'-detail"><div class="sj-detail-head"><h2>'+_t('Chi tiết đơn hàng','Order Details')+'</h2><button type="button" id="'+_id+'-close-detail">×</button></div><div class="sj-detail-body" id="'+_id+'-detail-body"></div><div class="sj-detail-actions" id="'+_id+'-detail-actions"></div></aside></div>';
  _container.innerHTML=h;
  _bind();
}
function _showDetail(id,type){
  var overlay=document.getElementById(_id+'-overlay'), detail=document.getElementById(_id+'-detail'), body=document.getElementById(_id+'-detail-body'), actions=document.getElementById(_id+'-detail-actions');
  overlay.classList.add('active'); detail.classList.add('open'); body.innerHTML='<div class="sj-loading"><div class="sj-spinner"></div></div>'; actions.innerHTML='';
  _api('order_detail',{ order_id:id, order_type:type }).then(function(res){
    if(!res||!res.ok){ body.innerHTML='<p class="sj-error">'+_t('Không thể tải chi tiết.','Unable to load detail.')+'</p>'; return; }
    var o=res.data||{}; _selected={ id:id, type:type, data:o };
    var html='<section class="sj-sec"><h4>'+_t('Thông tin chính','Primary information')+'</h4><div class="sj-grid">';
    var hasTransitions=(TRANSITIONS[type]&&TRANSITIONS[type][o.status||'']&&TRANSITIONS[type][o.status||''].length>0);
    Object.keys(o||{}).forEach(function(key){ if(typeof o[key]==='object' || o[key]==='' || o[key]==null || ['status_history','change_history','operations','linked_forms','job_orders','job_order','master_data_ref'].indexOf(key)>=0) return; var val=o[key]; if(key==='status'){ var st=_status(type,val||''); html+='<div class="sj-f'+(hasTransitions?' sj-f-clickable':'')+'"'+(hasTransitions?' id="'+_id+'-status-badge" role="button" tabindex="0"':'')+'><small>'+_esc(key)+'</small><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.12)+'">'+_esc(st.text)+(hasTransitions?' ▸':'')+'</span></div>'; return; } if(key.indexOf('_date')>=0||key.indexOf('_at')>=0) val=(key.indexOf('_at')>=0||String(val).indexOf('T')>=0)?_fmtDateTime(val):_fmtDate(val); if(typeof val==='boolean') val=val?_t('Có','Yes'):_t('Không','No'); html+='<div class="sj-f"><small>'+_esc(key)+'</small><strong>'+_esc(val)+'</strong></div>'; });
    html+='</div></section>';
    if((o.status_history||[]).length){ html+='<section class="sj-sec"><h4>'+_t('Lịch sử trạng thái','Status history')+'</h4><div class="sj-timeline">'+(o.status_history||[]).slice().reverse().map(function(h,i,arr){ var st=_status(type,h.status||''); var isFirst=(i===0); return '<div class="sj-tl-item'+(isFirst?' sj-tl-current':'')+'"><div class="sj-tl-dot" style="background:'+st.color+';box-shadow:0 0 0 4px '+_rgba(st.color,.18)+'"></div><div class="sj-tl-line"></div><div class="sj-tl-content"><span class="sj-status" style="color:'+st.color+';background:'+_rgba(st.color,.12)+'">'+_esc(st.text)+'</span><span class="sj-tl-date">'+_esc(_fmtDateTime(h.timestamp||h.date||''))+'</span><span class="sj-tl-user">'+_esc(h.user||'')+'</span>'+(h.note?'<span class="sj-tl-note">'+_esc(h.note)+'</span>':'')+'</div></div>'; }).join('')+'</div></section>'; }
    if((o.change_history||[]).length){ html+='<section class="sj-sec"><h4>'+_t('Lịch sử chỉnh sửa','Change history')+'</h4><div class="sj-history">'+(o.change_history||[]).slice().reverse().map(function(entry){ var summary=(entry.changes||[]).map(function(c){ return (c.field||'') + ': ' + (c.old==null?'—':String(c.old)) + ' → ' + (c.new==null?'—':String(c.new)); }).join(' · '); return '<div class="sj-h"><strong>'+_esc(_fmtDateTime(entry.timestamp||''))+'</strong><span>'+_esc(entry.user||'')+'</span><em>'+_esc(summary||_t('Không có thay đổi nội dung.','No field change.'))+'</em></div>'; }).join('')+'</div></section>'; }
    if(type==='jo' && (o.operations||[]).length){ html+='<section class="sj-sec"><h4>'+_t('Danh sách công đoạn','Operations')+'</h4><div class="sj-history">'+o.operations.map(function(op){ return '<div class="sj-h"><strong>OP'+_esc(op.operation_number||'')+' · '+_esc(op.operation_desc||'-')+'</strong><span>'+_esc(op.machine_id||'')+'</span><em>'+_esc(_status('wo',op.status||'').text)+'</em></div>'; }).join('')+'</div></section>'; }
    html+='<section class="sj-sec"><h4>'+_t('Hồ sơ liên kết','Linked Evidence')+'</h4><div id="'+_id+'-linked-forms-panel"><div class="sj-loading"><div class="sj-spinner"></div></div></div>'+(_permission(type,'edit')?'<button type="button" class="sj-btn mini" id="'+_id+'-link-form" style="margin-top:8px">+ '+_t('Liên kết hồ sơ','Link record')+'</button>':'')+'</section>';
    body.innerHTML=html;
    // ── G4 P1-04: Clickable status badge opens transition modal ──
    var statusBadge=document.getElementById(_id+'-status-badge');
    if(statusBadge) statusBadge.onclick=function(){ _showStatusTransition(type, id, o.status||''); };
    // ── G2 P1-01: Load enriched linked forms via dedicated endpoint ──
    _loadLinkedFormsPanel(id, type);
    var next=(TRANSITIONS[type]&&TRANSITIONS[type][o.status||''])?TRANSITIONS[type][o.status||'']:[];
    var actHtml='';
    if(next.length){ actHtml+='<button type="button" class="sj-btn mini sj-outline" id="'+_id+'-change-status" style="color:#1565c0;border-color:#1565c0">'+_t('Chuyển trạng thái','Change status')+'</button>'; }
    if(_permission(type,'edit')){ actHtml+='<button type="button" class="sj-btn mini" id="'+_id+'-edit-order">'+_t('Chỉnh sửa','Edit')+'</button>'; }
    if(type==='so' && _permission('jo','create')){ actHtml+='<button type="button" class="sj-btn mini accent-2" id="'+_id+'-add-jo">+ '+_t('Lệnh sản xuất','Job Order')+'</button>'; }
    if(type==='jo' && _permission('wo','create')){ actHtml+='<button type="button" class="sj-btn mini accent-3" id="'+_id+'-add-wo">+ '+_t('Lệnh công đoạn','Work Order')+'</button>'; }
    actions.innerHTML=actHtml;
    var statusBtn=document.getElementById(_id+'-change-status'); if(statusBtn) statusBtn.onclick=function(){ _showStatusTransition(type,_selected.id,o.status||''); };
    var editBtn=document.getElementById(_id+'-edit-order'); if(editBtn) editBtn.onclick=function(){ _showEdit(type, _selected.data||o); };
    var addJoBtn=document.getElementById(_id+'-add-jo'); if(addJoBtn) addJoBtn.onclick=function(){ _showCreateInContext('jo',{ so_number:_selected.id }); };
    var addWoBtn=document.getElementById(_id+'-add-wo'); if(addWoBtn) addWoBtn.onclick=function(){ _showCreateInContext('wo',{ jo_number:_selected.id }); };
    var linkBtn=document.getElementById(_id+'-link-form'); if(linkBtn) linkBtn.onclick=_showLinkModal;
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
      var stColor = { linked: '#3b82f6', allocated: '#94a3b8', submitted: '#10b981', downloaded: '#f59e0b', received: '#8b5cf6', void: '#ef4444' };
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
        + '<td><span class="sj-tag" style="background:' + (f.auto_linked ? _rgba('#10b981', 0.12) : _rgba('#3b82f6', 0.12)) + ';color:' + (f.auto_linked ? '#10b981' : '#3b82f6') + '">' + src + '</span></td>'
        + '</tr>';
    });
    h += '</tbody></table>';
    panel.innerHTML = h;
  }).catch(function() {
    panel.innerHTML = '<p class="sj-muted">' + _t('Lỗi khi tải hồ sơ liên kết.', 'Error loading linked evidence.') + '</p>';
  });
}

function _showLinkModal(){
  if(!_selected) return;
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal sj-modal-sm';
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_t('Liên kết hồ sơ','Link record')+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><label>'+_t('Mã hồ sơ','Record ID')+'</label><input id="'+_id+'-record-link" class="sj-input" placeholder="NCR-2026-001"></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-record-submit">'+_t('Liên kết','Link')+'</button></div>';
  document.body.appendChild(overlay); document.body.appendChild(modal);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=close; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
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
  document.body.appendChild(overlay); document.body.appendChild(modal);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=close; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
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
  document.body.appendChild(overlay); document.body.appendChild(modal);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=close; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
  _modalKeyHandler(overlay, modal);
  var form=modal.querySelector('#'+_id+'-ctx-form');
  _hydrateCreateForm(type, form);
  // Prefill parent fields and make them readonly
  if(prefill){ Object.keys(prefill).forEach(function(k){ var inp=form.querySelector('[name="'+k+'"]'); if(inp){ inp.value=prefill[k]; inp.readOnly=true; inp.style.background='#f1f5f9'; } var siWrap=document.getElementById(_id+'-'+type+'-'+k); if(siWrap){ siWrap.innerHTML='<input class="sj-input" name="'+k+'" value="'+_esc(prefill[k])+'" readonly style="background:#f1f5f9"/>'; } }); }
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
  if(field.lookup) return '<div class="sj-form-field"><label>'+_esc(label)+'</label><div id="'+_id+'-'+type+'-'+field.key+'"></div></div>';
  if(field.type==='textarea') return '<div class="sj-form-field wide"><label>'+_esc(label)+'</label><textarea class="sj-input" name="'+field.key+'"'+req+(field.readonly?' readonly':'')+'></textarea></div>';
  if(field.type==='select') return '<div class="sj-form-field"><label>'+_esc(label)+'</label><select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option>'+field.options.map(function(x){ return '<option value="'+_esc(x)+'">'+_esc(x)+'</option>'; }).join('')+'</select></div>';
  if(field.type==='boolean') return '<div class="sj-form-field"><label>'+_esc(label)+'</label><select class="sj-input" name="'+field.key+'"><option value="">'+_t('Chọn','Select')+'</option><option value="true">'+_t('Có','Yes')+'</option><option value="false">'+_t('Không','No')+'</option></select></div>';
  return '<div class="sj-form-field'+((field.key==='operation_desc'||field.key==='special_requirements')?' wide':'')+'"><label>'+_esc(label)+'</label><input class="sj-input" name="'+field.key+'" type="'+(field.type==='date'?'date':field.type==='datetime'?'datetime-local':field.type==='number'||field.type==='integer'?'number':'text')+'"'+req+(field.readonly?' readonly':'')+(field.type==='number'?' step="any"':'')+'></div>';
}

function _showCreate(type){
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  var titleMap={ so:_t('Tạo đơn hàng mới','Create Sales Order'), jo:_t('Tạo lệnh sản xuất','Create Job Order'), wo:_t('Tạo lệnh công đoạn','Create Work Order') };
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_esc(type.toUpperCase())+' · '+_esc(titleMap[type]||_t('Tạo mới','Create'))+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><form id="'+_id+'-create-form" class="sj-form">'+FIELDS[type].map(function(f){ return _renderField(f,type); }).join('')+'</form></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-submit-create">'+_t('Tạo mới','Create')+'</button></div>';
  document.body.appendChild(overlay); document.body.appendChild(modal);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=close; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
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
      new SearchableInput({ containerId:target.id, fieldId:target.id+'-si', name:field.key, dataSource:_lookupRows(field.lookup), displayField:'label', valueField:'value', subField:'sub', placeholderVi:_t('Tìm và chọn','Search and select'), placeholder:'Search and select', strictSelect:true, storeValueInHiddenField:true, onSelect:function(item){
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
    }
  });
  ['order_date','start_date','due_date'].forEach(function(k){ var el=form.querySelector('[name="'+k+'"]'); if(el&&!el.value) el.value=_today(); });
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
        target.innerHTML = '<input class="sj-input" name="'+field.key+'" value="'+_esc(value==null?'':value)+'" readonly style="background:#f1f5f9">';
        return;
      }
      if(type==='jo' && field.key==='part_number') _selectedPartForRev = value || '';
      if(typeof SearchableInput==='function'){
        new SearchableInput({ containerId:target.id, fieldId:target.id+'-si', name:field.key, dataSource:_lookupRows(field.lookup), displayField:'label', valueField:'value', subField:'sub', placeholderVi:_t('Tìm và chọn','Search and select'), placeholder:'Search and select', strictSelect:true, storeValueInHiddenField:true, onSelect:function(item){
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
      el.style.background = '#f1f5f9';
    }
  });
}

function _showEdit(type, data){
  var overlay=document.createElement('div'); overlay.className='sj-modal-overlay';
  var modal=document.createElement('div'); modal.className='sj-modal';
  var titleMap={ so:_t('Chỉnh sửa đơn hàng','Edit Sales Order'), jo:_t('Chỉnh sửa lệnh sản xuất','Edit Job Order'), wo:_t('Chỉnh sửa lệnh công đoạn','Edit Work Order') };
  modal.innerHTML='<div class="sj-modal-head"><h3>'+_esc(type.toUpperCase())+' · '+_esc(titleMap[type]||_t('Chỉnh sửa','Edit'))+'</h3><button type="button" class="sj-x">×</button></div><div class="sj-modal-body"><form id="'+_id+'-edit-form" class="sj-form">'+FIELDS[type].map(function(f){ return _renderField(f,type); }).join('')+'</form></div><div class="sj-modal-foot"><button type="button" class="sj-btn" data-close>'+_t('Hủy','Cancel')+'</button><button type="button" class="sj-btn accent" id="'+_id+'-submit-edit">'+_t('Lưu thay đổi','Save changes')+'</button></div>';
  document.body.appendChild(overlay); document.body.appendChild(modal);
  function close(){ _closeModal(overlay, modal); }
  overlay.onclick=close; modal.querySelector('.sj-x').onclick=close; modal.querySelector('[data-close]').onclick=close;
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
    var ECR_FIELDS = ['part_revision','material_spec','routing_id'];
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
  var md=document.getElementById(_id+'-md'); if(md) md.onclick=function(){ if(typeof window._mdOpenControl==='function') window._mdOpenControl(); };
  var refresh=document.getElementById(_id+'-refresh'); if(refresh) refresh.onclick=_refresh;
  var nso=document.getElementById(_id+'-new-so'); if(nso) nso.onclick=function(){ _showCreate('so'); };
  var njo=document.getElementById(_id+'-new-jo'); if(njo) njo.onclick=function(){ _showCreate('jo'); };
  var nwo=document.getElementById(_id+'-new-wo'); if(nwo) nwo.onclick=function(){ _showCreate('wo'); };
  Array.prototype.forEach.call(_container.querySelectorAll('.sj-switch button'), function(btn){ btn.onclick=function(){ _view=btn.getAttribute('data-view'); _render(); }; });
  var close=document.getElementById(_id+'-close-detail'); if(close) close.onclick=function(){ document.getElementById(_id+'-detail').classList.remove('open'); document.getElementById(_id+'-overlay').classList.remove('active'); };
  var overlay=document.getElementById(_id+'-overlay'); if(overlay) overlay.onclick=function(){ document.getElementById(_id+'-detail').classList.remove('open'); overlay.classList.remove('active'); };

  if(_view==='hierarchy'){
    var tree=document.getElementById(_id+'-tree'); if(tree) tree.onclick=function(e){ var t=e.target.closest('[data-toggle]'); if(t){ var key=t.getAttribute('data-toggle'); var box=tree.querySelector('[data-children="'+key+'"]'); if(box) box.style.display=(box.style.display==='none'?'':'none'); return; } var row=e.target.closest('.sj-node-row'); if(row) _showDetail(row.getAttribute('data-id'),row.getAttribute('data-type')); };
    var search=document.getElementById(_id+'-tree-search'); if(search) search.oninput=function(){ var q=(search.value||'').toLowerCase(); Array.prototype.forEach.call(tree.querySelectorAll('.sj-node'), function(node){ node.style.display=!q||node.textContent.toLowerCase().indexOf(q)>=0?'':'none'; }); };
  }
  if(_view==='table'){
    var main=document.getElementById(_id+'-main'); if(main) main.onclick=function(e){ var th=e.target.closest('[data-sort]'); if(th){ var key=th.getAttribute('data-sort'); _tableSort={ key:key, dir:_tableSort.key===key&&_tableSort.dir==='asc'?'desc':'asc' }; _render(); return; } var row=e.target.closest('.sj-row'); if(row) _showDetail(row.getAttribute('data-id'),row.getAttribute('data-type')); };
    var ts=document.getElementById(_id+'-table-search'); if(ts) ts.oninput=function(){ _tableSearch=ts.value||''; _render(); };
  }
  if(_view==='pipeline'){
    var mainp=document.getElementById(_id+'-main'); if(mainp) mainp.onclick=function(e){ var card=e.target.closest('.sj-card'); if(card) _showDetail(card.getAttribute('data-id'),card.getAttribute('data-type')); };
    Array.prototype.forEach.call(_container.querySelectorAll('.sj-card[draggable]'), function(card){
      card.addEventListener('dragstart', function(ev){ _dragItem={ id:card.getAttribute('data-id'), type:card.getAttribute('data-type') }; ev.dataTransfer.setData('text/plain',_dragItem.id); card.classList.add('drag'); });
      card.addEventListener('dragend', function(){ _dragItem=null; card.classList.remove('drag'); });
    });
    Array.prototype.forEach.call(_container.querySelectorAll('[data-col]'), function(col){
      col.addEventListener('dragover', function(ev){ ev.preventDefault(); col.classList.add('drop'); });
      col.addEventListener('dragleave', function(){ col.classList.remove('drop'); });
      col.addEventListener('drop', function(ev){ ev.preventDefault(); col.classList.remove('drop'); if(!_dragItem) return; var next=_pipelineStatus(_dragItem.type,col.getAttribute('data-col')); if(!next) return; _api(_dragItem.type==='so'?'order_so_update_status':_dragItem.type==='jo'?'order_jo_update_status':'order_wo_update_status',{ order_id:_dragItem.id, status:next }).then(function(r){ if(r&&r.ok){ _toast(_t('Đã cập nhật trạng thái.','Status updated.'),'success'); _refresh(); } else { _toast(_governanceError(r,'Không thể cập nhật trạng thái.','Unable to update status.'),'error'); } }); });
    });
  }
}

function _refresh(){
  if(!_container) return;
  _renderLoading();
  Promise.all([_api('order_dashboard_stats',{}), _api('order_hierarchy',{}), (typeof window._mdEnsureSnapshot==='function'?window._mdEnsureSnapshot(true):Promise.resolve(null))]).then(function(res){ _kpi=(res[0]&&res[0].ok)?(res[0].data||{}):{}; _hierarchy=(res[1]&&res[1].ok)?(res[1].data||res[1].hierarchy||[]):[]; _flat=_flatten(_hierarchy); _render(); if(_selected) _showDetail(_selected.id,_selected.type); }).catch(function(){ _kpi={}; _hierarchy=[]; _flat=[]; _render(); });
}

window._renderSoJoWoDashboard=function(schemas,entries,container){ _container=container; _id=container.id||'sojowo'; if(!container.id) container.id=_id; _selected=null; _tableSearch=''; _view='hierarchy'; _refresh(); };

(function(){
  if(document.getElementById('sj-styles')) return;
  var style=document.createElement('style');
  style.id='sj-styles';
  style.textContent=[
    '.sj-wrap{padding:28px;display:flex;flex-direction:column;gap:18px;color:#0f172a}',
    '.sj-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:22px 24px;border-radius:24px;background:linear-gradient(135deg,#0c2d48 0%,#15466f 58%,#1d5e96 100%);color:#fff;box-shadow:0 20px 50px rgba(12,45,72,.18)}',
    '.sj-hero h1{margin:0;font-size:1.9rem}.sj-hero p{margin:8px 0 0;max-width:600px;color:rgba(255,255,255,.78)}',
    '.sj-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}',
    '.sj-btn{height:38px;padding:0 14px;border:none;border-radius:12px;background:#fff;color:#0c2d48;font-weight:700;cursor:pointer}.sj-btn.accent{background:#fef3c7;color:#92400e}.sj-btn.accent-2{background:#ede9fe;color:#6d28d9}.sj-btn.accent-3{background:#dcfce7;color:#166534}.sj-btn.mini{height:34px;font-size:.84rem}.sj-btn.sj-outline{background:#fff;border:1px solid currentColor}',
    '.sj-switch{display:inline-flex;padding:4px;border-radius:14px;background:rgba(255,255,255,.12)}.sj-switch button{height:34px;padding:0 12px;border:none;border-radius:10px;background:transparent;color:rgba(255,255,255,.8);font-weight:700;cursor:pointer}.sj-switch button.active{background:#fff;color:#0c2d48}',
    '.sj-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sj-kpi-card{padding:16px 18px;border-radius:20px;border:1px solid #dbe7f3;background:#fff;box-shadow:0 12px 24px rgba(15,23,42,.05)}.sj-kpi-card small{display:block;font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b}.sj-kpi-card strong{display:block;margin-top:8px;font-size:1.9rem}',
    '.sj-panel,.sj-col{border:1px solid #dbe7f3;border-radius:22px;background:#fff;box-shadow:0 12px 24px rgba(15,23,42,.05)}.sj-panel-head{padding:18px 20px;border-bottom:1px solid #edf2f7}.sj-input, .sj-form-field textarea{width:100%;border:1px solid #d8e1ea;border-radius:14px;padding:10px 12px;background:#fff;font:inherit}.sj-input:focus,.sj-form-field textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.sj-tree{padding:14px 16px}.sj-node-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;cursor:pointer}.sj-node-row:hover{background:#f8fbff}.sj-toggle{width:24px;height:24px;border:none;border-radius:8px;background:#eff6ff;color:#1565c0;cursor:pointer}.sj-toggle.ph{visibility:hidden}.sj-chip{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:26px;padding:0 8px;border-radius:999px;background:#0c2d48;color:#fff;font-size:.72rem;font-weight:800}.sj-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}.sj-id{display:inline-flex;padding:4px 8px;border-radius:999px;background:#f8fafc;color:#64748b;font-size:.76rem;font-weight:700}',
    '.sj-status{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:.74rem;font-weight:800}',
    '.sj-pipeline{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.sj-col header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #edf2f7;font-size:.8rem;font-weight:800;text-transform:uppercase;color:#475569}.sj-col header span{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;background:#f8fafc}.sj-col-body{min-height:280px;padding:12px;display:flex;flex-direction:column;gap:10px}.sj-card{padding:12px 14px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 8px 18px rgba(15,23,42,.05);cursor:pointer}.sj-card strong{display:block;color:#0c2d48}.sj-card span{display:block;margin-top:6px;color:#475569;font-size:.88rem}.sj-card.drag{opacity:.45}.sj-col-body.drop{background:#eef5ff;border:2px dashed #1565c0;border-radius:18px}.sj-empty-col,.sj-empty{padding:28px;text-align:center;color:#94a3b8}',
    '.sj-table-wrap{overflow:auto}.sj-table{width:100%;border-collapse:collapse}.sj-table th,.sj-table td{padding:12px 14px;border-bottom:1px solid #edf2f7}.sj-table th{font-size:.76rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#64748b;cursor:pointer}.sj-row{cursor:pointer}.sj-row:hover td{background:#f8fbff}.sj-empty-row{text-align:center;color:#94a3b8}',
    '.sj-overlay{position:fixed;inset:0;background:rgba(15,23,42,.22);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:1200}.sj-overlay.active{opacity:1;pointer-events:auto}.sj-detail{position:fixed;top:18px;right:18px;bottom:18px;width:min(560px,calc(100vw - 36px));background:#fff;border-radius:26px;box-shadow:0 30px 70px rgba(15,23,42,.22);transform:translateX(calc(100% + 24px));transition:transform .2s ease;z-index:1210;display:flex;flex-direction:column;overflow:hidden}.sj-detail.open{transform:translateX(0)}.sj-detail-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf2f7}.sj-detail-head h2{margin:0;font-size:1.08rem}.sj-detail-head button,.sj-x{width:38px;height:38px;border:none;border-radius:12px;background:#f1f5f9;color:#0f172a;cursor:pointer;font-size:1.4rem}.sj-detail-body{flex:1;overflow:auto;padding:18px 20px}.sj-detail-actions{display:flex;gap:8px;flex-wrap:wrap;padding:16px 20px;border-top:1px solid #edf2f7}',
    '.sj-sec + .sj-sec{margin-top:18px}.sj-sec h4{margin:0 0 10px}.sj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sj-f{padding:12px;border:1px solid #edf2f7;border-radius:14px;background:#fbfdff}.sj-f small{display:block;color:#64748b;font-size:.74rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.sj-f strong{display:block;margin-top:6px;color:#0f172a}.sj-history{display:flex;flex-direction:column;gap:8px}.sj-h{padding:12px;border:1px solid #edf2f7;border-radius:14px;background:#fff}.sj-h strong{display:block}.sj-h span,.sj-h em,.sj-muted,.sj-error{display:block;margin-top:4px;color:#64748b;font-size:.84rem}.sj-error{color:#b91c1c}',
    '.sj-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.32);backdrop-filter:blur(4px);z-index:1300;display:flex;align-items:center;justify-content:center;padding:20px}.sj-modal{width:min(760px,96vw);max-height:88vh;background:#fff;border-radius:26px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 70px rgba(15,23,42,.24)}.sj-modal-sm{width:min(440px,96vw)}.sj-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #edf2f7}.sj-modal-head h3{margin:0}.sj-modal-body{padding:18px 20px;overflow:auto}.sj-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;border-top:1px solid #edf2f7}.sj-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.sj-form-field{display:flex;flex-direction:column;gap:6px}.sj-form-field.wide{grid-column:1 / -1}.sj-form-field label{font-size:.82rem;font-weight:800;color:#334155}',
    '.sj-loading{min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#64748b}.sj-spinner{width:28px;height:28px;border:3px solid #dbe7f3;border-top-color:#1565c0;border-radius:999px;animation:sjspin .7s linear infinite}@keyframes sjspin{to{transform:rotate(360deg)}}',
    '.sj-toast{position:fixed;right:24px;bottom:24px;padding:12px 16px;border-radius:14px;border-left:4px solid;box-shadow:0 16px 36px rgba(15,23,42,.14);z-index:1400;opacity:0;transform:translateY(10px);transition:all .18s ease}.sj-toast.show{opacity:1;transform:translateY(0)}.sj-toast.info{background:#dbeafe;color:#1d4ed8;border-color:#1565c0}.sj-toast.success{background:#dcfce7;color:#166534;border-color:#15803d}.sj-toast.warn{background:#fef3c7;color:#b45309;border-color:#d97706}.sj-toast.error{background:#fef2f2;color:#b91c1c;border-color:#dc2626}',
    '.sj-link-tbl{width:100%;border-collapse:collapse;font-size:.84rem}.sj-link-tbl th{padding:8px 10px;border-bottom:2px solid #e2e8f0;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b;text-align:left}.sj-link-tbl td{padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#334155}.sj-link-tbl tr:last-child td{border-bottom:none}.sj-link-tbl tr:hover td{background:#f8fbff}',
    '.sj-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.72rem;font-weight:700;white-space:nowrap}',
    '.sj-timeline{display:flex;flex-direction:column;gap:0;position:relative;padding-left:18px}',
    '.sj-tl-item{display:flex;gap:12px;position:relative;padding-bottom:16px}',
    '.sj-tl-item:last-child{padding-bottom:0}',
    '.sj-tl-item:last-child .sj-tl-line{display:none}',
    '.sj-tl-dot{width:12px;height:12px;border-radius:999px;flex-shrink:0;margin-top:6px;position:relative;z-index:1}',
    '.sj-tl-line{position:absolute;left:5px;top:20px;bottom:0;width:2px;background:#e2e8f0}',
    '.sj-tl-content{display:flex;flex-direction:column;gap:4px;min-width:0}',
    '.sj-tl-date{font-size:.78rem;color:#64748b}',
    '.sj-tl-user{font-size:.78rem;color:#94a3b8}',
    '.sj-tl-note{font-size:.8rem;color:#475569;font-style:italic;padding:6px 10px;background:#f8fafc;border-radius:8px;border-left:3px solid #d1d5db}',
    '.sj-tl-current .sj-tl-dot{animation:sjtlpulse 2s ease-in-out infinite}',
    '@keyframes sjtlpulse{0%,100%{opacity:1}50%{opacity:.5}}',
    '.sj-st-current{margin-bottom:16px}.sj-st-current small{display:block;font-size:.76rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}',
    '.sj-st-options{margin-bottom:16px}.sj-st-options small{display:block;font-size:.76rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}',
    '.sj-st-radio{display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:12px;cursor:pointer;margin-bottom:6px;transition:background .15s}',
    '.sj-st-radio:hover{background:#f8fbff}',
    '.sj-st-radio input[type="radio"]{accent-color:#1565c0}',
    '.sj-st-reason{margin-top:12px}.sj-st-reason label{display:block;font-size:.82rem;font-weight:800;color:#334155;margin-bottom:6px}',
    '.sj-f-clickable{cursor:pointer;transition:background .15s,border-color .15s}.sj-f-clickable:hover{background:#eff6ff;border-color:#93c5fd}',
    '@media (max-width: 1100px){.sj-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.sj-pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width: 860px){.sj-wrap{padding:16px}.sj-hero{flex-direction:column;align-items:flex-start;padding:18px}.sj-actions{justify-content:flex-start}.sj-kpi{grid-template-columns:1fr}.sj-pipeline{grid-template-columns:1fr}.sj-form,.sj-grid{grid-template-columns:1fr}.sj-detail{top:10px;right:10px;bottom:10px;width:calc(100vw - 20px)}.sj-modal-overlay{padding:10px}.sj-modal{width:100%;max-height:92vh}}'
  ].join('\n');
  document.head.appendChild(style);
})();

})();

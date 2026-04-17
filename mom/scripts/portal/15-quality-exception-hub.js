/* ===================================================================
   15-quality-exception-hub.js
   HESEM MOM Portal - Quality Exception Hub
   Unified management for NCR, CAPA, Customer Complaints, MRB,
   Deviations, and Concessions.
   =================================================================== */

(function(){
'use strict';

/* ── helpers ──────────────────────────────────────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{method:method||'POST',credentials:'include',headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})}).then(function(r){return r.json();});
}
function _toast(msg, type){ if(typeof showToast==='function') return showToast(msg, type); var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); },180); },3200); }
function _fmtDate(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function _daysBetween(from, to){ if(!from) return 0; var a=new Date(from), b=to?new Date(to):new Date(); return Math.max(0, Math.round((b-a)/(86400000))); }

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'qeh-styles';
var TABS = [
  { key:'dashboard', vi:'Tổng quan',     en:'Dashboard' },
  { key:'create',    vi:'Tạo mới',       en:'Create' },
  { key:'8d',        vi:'Báo cáo 8D',    en:'8D Report' },
  { key:'mrb',       vi:'MRB',           en:'MRB' },
  { key:'copq',      vi:'COPQ',          en:'COPQ' },
  { key:'trends',    vi:'Xu hướng',      en:'Trends' }
];

/* EXC_TYPES — đọc từ HmRegistry → 'exception_type_catalog' (single source of truth) */
var EXC_TYPES = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('exception_type_catalog');
    if(opts && opts.length) opts.forEach(function(o){ map[o.value] = {vi:o.label, en:o.labelEn||o.label, icon:o.icon||'', color:o.color||'#6b7280'}; });
  }
  if(!Object.keys(map).length) console.warn('[QEH] Registry key "exception_type_catalog" trống — exception types sẽ bị thiếu.');
  return map;
})();

/* SEVERITY — đọc từ HmRegistry → 'severity' (single source of truth) */
var SEVERITY = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('severity');
    if(opts && opts.length) opts.forEach(function(o){ map[o.value] = {vi:o.label, en:o.labelEn||o.label, color:o.color||'#6b7280'}; });
  }
  if(!Object.keys(map).length) console.warn('[QEH] Registry key "severity" trống — severity options sẽ bị thiếu.');
  return map;
})();

/* STATUS — đọc từ HmRegistry → 'exception_status' (single source of truth) */
var STATUS = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('exception_status');
    if(opts && opts.length) opts.forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn||o.label,color:o.color||'#6b7280'}; });
  }
  if(!Object.keys(map).length) console.warn('[QEH] Registry key "exception_status" trống — status options sẽ bị thiếu.');
  return map;
})();

/* MRB_DISPOSITIONS — đọc từ HmRegistry → 'mrb_disposition' (single source of truth) */
var MRB_DISPOSITIONS = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('mrb_disposition');
    if(opts && opts.length) opts.forEach(function(o){ map[o.value] = {vi:o.label, en:o.labelEn||o.label, color:o.color||'#6b7280'}; });
  }
  if(!Object.keys(map).length) console.warn('[QEH] Registry key "mrb_disposition" trống — disposition options sẽ bị thiếu.');
  return map;
})();

var D8_STEPS = [
  { key:'d1', vi:'D1 - Thành lập nhóm',         en:'D1 - Team Formation' },
  { key:'d2', vi:'D2 - Mô tả vấn đề',           en:'D2 - Problem Description' },
  { key:'d3', vi:'D3 - Hành động tạm thời',      en:'D3 - Interim Containment' },
  { key:'d4', vi:'D4 - Nguyên nhân gốc',         en:'D4 - Root Cause Analysis' },
  { key:'d5', vi:'D5 - Hành động khắc phục',      en:'D5 - Corrective Actions' },
  { key:'d6', vi:'D6 - Triển khai & xác nhận',    en:'D6 - Implementation & Validation' },
  { key:'d7', vi:'D7 - Phòng ngừa tái phát',      en:'D7 - Systemic Prevention' },
  { key:'d8', vi:'D8 - Kết thúc & ghi nhận',      en:'D8 - Closure & Congratulations' }
];

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'dashboard',
  exceptions: [],
  selectedId: null,
  selectedType: null,
  filters: { type:'all', severity:'all', status:'all', dateFrom:'', dateTo:'', department:'', assignedTo:'' },
  kpi: {},
  copq: {},
  trends: {},
  pagination: { offset:0, limit:50, total:0 },
  loading: false
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.qeh{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.qeh-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.qeh-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.qeh-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.qeh-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.qeh-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.qeh-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.qeh-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.qeh-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.qeh-kpi-sub{font-size:.6875rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.qeh-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.qeh-filters select,.qeh-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.qeh-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.qeh-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.qeh-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.qeh-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.qeh-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.qeh-type-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff}',
    '.qeh-aging{height:6px;border-radius:3px;background:var(--bg-hover,#e2e8f0);overflow:hidden;min-width:60px}',
    '.qeh-aging-fill{height:100%;border-radius:3px;transition:width .3s}',
    '.qeh-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px;cursor:pointer;transition:box-shadow .15s}',
    '.qeh-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}',
    '.qeh-card-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}',
    '.qeh-card-title{font-weight:700;font-size:.875rem}',
    '.qeh-card-meta{font-size:.75rem;color:var(--text-secondary,#64748b);display:flex;gap:12px;flex-wrap:wrap}',
    '.qeh-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.qeh-form.wide{grid-template-columns:1fr}',
    '.qeh-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.qeh-form input,.qeh-form select,.qeh-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.qeh-form textarea{min-height:80px;resize:vertical}',
    '.qeh-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s,box-shadow .15s}',
    '.qeh-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.qeh-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.qeh-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.qeh-btn-secondary:hover{background:var(--bg-hover,#e2e8f0)}',
    '.qeh-btn-danger{background:var(--red-light,#ef4444);color:var(--text-inverse,#fff)}',
    '.qeh-btn-danger:hover{background:#dc2626}',
    '.qeh-d8-wizard{margin-top:16px}',
    '.qeh-d8-step{border:1px solid var(--border,#e2e8f0);border-radius:8px;margin-bottom:8px;overflow:hidden}',
    '.qeh-d8-step-header{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-weight:700;font-size:.8125rem;background:var(--surface,#f8fafc);transition:background .15s}',
    '.qeh-d8-step-header:hover{background:var(--bg-hover,#e2e8f0)}',
    '.qeh-d8-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;color:#fff;background:var(--brand,#1565c0);flex-shrink:0}',
    '.qeh-d8-num.done{background:var(--green-light,#22c55e)}',
    '.qeh-d8-body{padding:16px;border-top:1px solid var(--border,#e2e8f0);display:none}',
    '.qeh-d8-body.open{display:block}',
    '.qeh-mrb-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
    '.qeh-copq-bar{display:flex;align-items:flex-end;gap:4px;height:200px;padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0)}',
    '.qeh-copq-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:40px}',
    '.qeh-copq-segment{width:100%;border-radius:3px 3px 0 0;transition:height .3s}',
    '.qeh-copq-label{font-size:.625rem;color:var(--text-secondary,#64748b);text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px}',
    '.qeh-pareto{margin-top:16px}',
    '.qeh-pareto-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
    '.qeh-pareto-name{width:120px;font-size:.75rem;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qeh-pareto-bar{flex:1;height:18px;background:var(--bg-hover,#e2e8f0);border-radius:var(--radius-sm,4px);overflow:hidden}',
    '.qeh-pareto-fill{height:100%;border-radius:4px;background:var(--brand,#1565c0);transition:width .3s}',
    '.qeh-pareto-val{width:60px;font-size:.75rem;font-weight:700}',
    '.qeh-detail{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;margin-bottom:16px}',
    '.qeh-detail h3{font-size:1rem;font-weight:800;margin:0 0 12px}',
    '.qeh-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.qeh-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.qeh-paging button:disabled{opacity:.4;cursor:default}',
    '.qeh-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.qeh-loading{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8)}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── render helpers ───────────────────────────────────── */
function _renderSeverityBadge(severity){
  var m=SEVERITY[severity]||SEVERITY.minor;
  return '<span class="qeh-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}

function _renderTypeBadge(type){
  var m=EXC_TYPES[type]||{vi:type,en:type,color:'var(--text-secondary,#64748b)',icon:''};
  return '<span class="qeh-type-badge" style="background:'+m.color+'">'+m.icon+' '+_esc(_t(m.vi,m.en))+'</span>';
}

function _renderStatusBadge(status){
  var m=STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="qeh-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}

function _renderAgingIndicator(days, maxDays){
  var max=maxDays||30;
  var pct=Math.min(100, Math.round((days/max)*100));
  var color=pct<50?'var(--green-light,#22c55e)':pct<80?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)';
  return '<div class="qeh-aging"><div class="qeh-aging-fill" style="width:'+pct+'%;background:'+color+'"></div></div>';
}

function _renderExceptionCard(item){
  var age=_daysBetween(item.created_at);
  var sla=item.sla_days||30;
  return '<div class="qeh-card" data-action="select" data-id="'+_esc(item.id)+'" data-type="'+_esc(item.type)+'">'
    +'<div class="qeh-card-header">'
      +'<div>'+_renderTypeBadge(item.type)+' '+_renderSeverityBadge(item.severity)+'</div>'
      +'<div>'+_renderStatusBadge(item.status)+'</div>'
    +'</div>'
    +'<div class="qeh-card-title">'+_esc(item.subject||item.title||'-')+'</div>'
    +'<div class="qeh-card-meta">'
      +'<span>'+_t('Tuổi','Age')+': '+age+_t(' ngày',' days')+'</span>'
      +'<span>'+_t('Phụ trách','Assigned')+': '+_esc(item.assigned_to||'-')+'</span>'
      +(item.linked_order?'<span>'+_t('Liên kết','Linked')+': '+_esc(item.linked_order)+'</span>':'')
    +'</div>'
    +'<div style="margin-top:var(--space-2,8px)">'+_renderAgingIndicator(age, sla)+'</div>'
  +'</div>';
}

function _renderExceptionDetail(item){
  if(!item) return '<div class="qeh-empty">'+_t('Chọn một exception','Select an exception')+'</div>';
  var age=_daysBetween(item.created_at);
  var html='<div class="qeh-detail">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2,8px)">'
      +'<h3>'+_esc(item.subject||item.title||'-')+'</h3>'
      +'<div>'+_renderTypeBadge(item.type)+' '+_renderSeverityBadge(item.severity)+' '+_renderStatusBadge(item.status)+'</div>'
    +'</div>'
    +'<div class="qeh-card-meta" style="margin-bottom:var(--space-3,12px)">'
      +'<span>ID: '+_esc(item.id)+'</span>'
      +'<span>'+_t('Ngày tạo','Created')+': '+_fmtDate(item.created_at)+'</span>'
      +'<span>'+_t('Tuổi','Age')+': '+age+_t(' ngày',' days')+'</span>'
      +'<span>'+_t('Phụ trách','Assigned')+': '+_esc(item.assigned_to||'-')+'</span>'
      +'<span>'+_t('Bộ phận','Dept')+': '+_esc(item.department||'-')+'</span>'
    +'</div>'
    +'<div style="margin-bottom:var(--space-3,12px)"><strong>'+_t('Mô tả','Description')+':</strong><br>'+_esc(item.description||'-')+'</div>';
  if(item.root_cause) html+='<div style="margin-bottom:var(--space-3,12px)"><strong>'+_t('Nguyên nhân gốc','Root Cause')+':</strong><br>'+_esc(item.root_cause)+'</div>';
  if(item.corrective_action) html+='<div style="margin-bottom:var(--space-3,12px)"><strong>'+_t('Hành động khắc phục','Corrective Action')+':</strong><br>'+_esc(item.corrective_action)+'</div>';
  html+='<div style="display:flex;gap:var(--space-2,8px);flex-wrap:wrap;margin-top:var(--space-3,12px)">';
  var sts=STATUS;
  Object.keys(sts).forEach(function(k){
    if(k===item.status) return;
    html+='<button class="qeh-btn qeh-btn-secondary" data-action="transition" data-id="'+_esc(item.id)+'" data-type="'+_esc(item.type)+'" data-status="'+k+'">'+_esc(_t(sts[k].vi,sts[k].en))+'</button>';
  });
  html+='</div></div>';
  return html;
}

/* ── tab renderers ────────────────────────────────────── */
function _renderDashboardTab(){
  var k=state.kpi;
  var html='<div class="qeh-kpis">'
    +_kpiCard(_t('NCR đang mở','Open NCRs'), k.open_ncrs||0, 'var(--red-light,#ef4444)')
    +_kpiCard(_t('CAPA đang mở','Open CAPAs'), k.open_capas||0, 'var(--blue-light,#3b82f6)')
    +_kpiCard(_t('Khiếu nại mở','Open Complaints'), k.open_complaints||0, 'var(--amber-light,#f59e0b)')
    +_kpiCard('COPQ MTD', k.copq_mtd?'$'+Number(k.copq_mtd).toLocaleString():'$0', 'var(--purple-light,#8b5cf6)')
    +_kpiCard(_t('Tuổi TB (ngày)','Avg Age (days)'), k.avg_age_days||0, 'var(--cyan-light,#06b6d4)')
  +'</div>';

  html+=_renderFilters();

  if(state.selectedId){
    var sel=state.exceptions.find(function(e){return e.id===state.selectedId;});
    html+=_renderExceptionDetail(sel);
    html+='<button class="qeh-btn qeh-btn-secondary" data-action="deselect" style="margin-bottom:var(--space-4,16px)">'+_t('Quay lại danh sách','Back to list')+'</button>';
  } else {
    html+=_renderExceptionTable();
    html+=_renderPaging();
  }
  return html;
}

function _kpiCard(label, value, color){
  return '<div class="qeh-kpi"><div class="qeh-kpi-label">'+_esc(label)+'</div><div class="qeh-kpi-value" style="color:'+color+'">'+_esc(value)+'</div></div>';
}

function _renderFilters(){
  var f=state.filters;
  var html='<div class="qeh-filters">';
  html+='<select data-filter="type"><option value="all">'+_t('Tất cả loại','All Types')+'</option>';
  Object.keys(EXC_TYPES).forEach(function(k){ var m=EXC_TYPES[k]; html+='<option value="'+k+'"'+(f.type===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<select data-filter="severity"><option value="all">'+_t('Mức độ','Severity')+'</option>';
  Object.keys(SEVERITY).forEach(function(k){ var m=SEVERITY[k]; html+='<option value="'+k+'"'+(f.severity===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<select data-filter="status"><option value="all">'+_t('Trạng thái','Status')+'</option>';
  Object.keys(STATUS).forEach(function(k){ var m=STATUS[k]; html+='<option value="'+k+'"'+(f.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<input type="date" data-filter="dateFrom" value="'+_esc(f.dateFrom)+'" title="'+_t('Từ ngày','From')+'">';
  html+='<input type="date" data-filter="dateTo" value="'+_esc(f.dateTo)+'" title="'+_t('Đến ngày','To')+'">';
  html+='<input type="text" data-filter="department" placeholder="'+_t('Bộ phận','Department')+'" value="'+_esc(f.department)+'" style="width:120px">';
  html+='<input type="text" data-filter="assignedTo" placeholder="'+_t('Phụ trách','Assigned To')+'" value="'+_esc(f.assignedTo)+'" style="width:120px">';
  html+='</div>';
  return html;
}

function _renderExceptionTable(){
  var items=state.exceptions;
  if(!items.length) return '<div class="qeh-empty">'+_t('Chưa có exception','No exceptions found')+'</div>';
  var html='<table class="qeh-table"><thead><tr>'
    +'<th>'+_t('Loại','Type')+'</th><th>'+_t('Tiêu đề','Subject')+'</th>'
    +'<th>'+_t('Mức độ','Severity')+'</th><th>'+_t('Trạng thái','Status')+'</th>'
    +'<th>'+_t('Tuổi','Age')+'</th><th>'+_t('Phụ trách','Assigned')+'</th>'
    +'<th>'+_t('Liên kết','Linked')+'</th>'
  +'</tr></thead><tbody>';
  items.forEach(function(item){
    var age=_daysBetween(item.created_at);
    var sla=item.sla_days||30;
    html+='<tr style="cursor:pointer" data-action="select" data-id="'+_esc(item.id)+'" data-type="'+_esc(item.type)+'">'
      +'<td>'+_renderTypeBadge(item.type)+'</td>'
      +'<td>'+_esc(item.subject||item.title||'-')+'</td>'
      +'<td>'+_renderSeverityBadge(item.severity)+'</td>'
      +'<td>'+_renderStatusBadge(item.status)+'</td>'
      +'<td><div style="display:flex;align-items:center;gap:var(--space-2,6px)"><span>'+age+_t('d','d')+'</span>'+_renderAgingIndicator(age, sla)+'</div></td>'
      +'<td>'+_esc(item.assigned_to||'-')+'</td>'
      +'<td>'+_esc(item.linked_order||'-')+'</td>'
    +'</tr>';
  });
  html+='</tbody></table>';
  return html;
}

function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="qeh-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Trước','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

function _renderCreateTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Tạo exception mới','Create New Exception')+'</h3>';
  html+='<div style="display:flex;gap:var(--space-3,10px);flex-wrap:wrap;margin-bottom:var(--space-5,20px)">';
  Object.keys(EXC_TYPES).forEach(function(k){
    var m=EXC_TYPES[k];
    html+='<button class="qeh-btn" style="background:'+m.color+';color:var(--text-inverse,#fff)" data-action="open-create" data-type="'+k+'">'+m.icon+' '+_esc(_t(m.vi,m.en))+'</button>';
  });
  html+='</div>';
  html+='<div id="qeh-create-form"></div>';
  return html;
}

function _openCreateDialog(type){
  var m=EXC_TYPES[type]||{vi:type,en:type};
  var el=state.container.querySelector('#qeh-create-form');
  if(!el) return;
  el.innerHTML='<div class="qeh-detail"><h3>'+_t('Tạo','Create')+' '+_esc(_t(m.vi,m.en))+'</h3>'
    +'<div class="qeh-form">'
      +'<div><label>'+_t('Tiêu đề','Subject')+'</label><input type="text" id="qeh-f-subject"></div>'
      +'<div><label>'+_t('Mức độ','Severity')+'</label><select id="qeh-f-severity">'
        +Object.keys(SEVERITY).map(function(k){var s=SEVERITY[k];return '<option value="'+k+'">'+_esc(_t(s.vi,s.en))+'</option>';}).join('')
      +'</select></div>'
      +'<div><label>'+_t('Bộ phận','Department')+'</label><input type="text" id="qeh-f-dept"></div>'
      +'<div><label>'+_t('Phụ trách','Assigned To')+'</label><input type="text" id="qeh-f-assigned"></div>'
      +'<div><label>'+_t('Liên kết đơn hàng','Linked Order')+'</label><input type="text" id="qeh-f-linked"></div>'
      +'<div><label>'+_t('SLA (ngày)','SLA (days)')+'</label><input type="number" id="qeh-f-sla" value="30"></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Mô tả','Description')+'</label><textarea id="qeh-f-desc"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:var(--space-4,14px);display:flex;gap:var(--space-2,8px)">'
      +'<button class="qeh-btn qeh-btn-primary" data-action="submit-create" data-type="'+type+'">'+_t('Lưu','Save')+'</button>'
      +'<button class="qeh-btn qeh-btn-secondary" data-action="cancel-create">'+_t('Hủy','Cancel')+'</button>'
    +'</div></div>';
}

function _render8dTab(){
  if(!state.selectedId){
    var complaints=state.exceptions.filter(function(e){return e.type==='complaint';});
    if(!complaints.length) return '<div class="qeh-empty">'+_t('Chưa có khiếu nại để tạo 8D','No complaints available for 8D')+'</div>';
    var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Chọn khiếu nại cho báo cáo 8D','Select Complaint for 8D Report')+'</h3>';
    html+='<table class="qeh-table"><thead><tr><th>ID</th><th>'+_t('Tiêu đề','Subject')+'</th><th>'+_t('Trạng thái','Status')+'</th><th></th></tr></thead><tbody>';
    complaints.forEach(function(c){
      html+='<tr><td>'+_esc(c.id)+'</td><td>'+_esc(c.subject||'-')+'</td><td>'+_renderStatusBadge(c.status)+'</td>'
        +'<td><button class="qeh-btn qeh-btn-primary" data-action="select-8d" data-id="'+_esc(c.id)+'">'+_t('Mở 8D','Open 8D')+'</button></td></tr>';
    });
    html+='</tbody></table>';
    return html;
  }
  var item=state.exceptions.find(function(e){return e.id===state.selectedId;});
  if(!item) return '<div class="qeh-empty">'+_t('Không tìm thấy','Not found')+'</div>';
  var d8=item.d8_report||{};
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    +'<h3 style="margin:0">'+_t('Báo cáo 8D','8D Report')+' - '+_esc(item.subject||item.id)+'</h3>'
    +'<button class="qeh-btn qeh-btn-secondary" data-action="deselect">'+_t('Quay lại','Back')+'</button>'
  +'</div>';
  html+='<div class="qeh-d8-wizard">';
  D8_STEPS.forEach(function(step, idx){
    var val=d8[step.key]||'';
    var done=!!val;
    html+='<div class="qeh-d8-step">'
      +'<div class="qeh-d8-step-header" data-action="toggle-d8" data-step="'+step.key+'">'
        +'<div class="qeh-d8-num'+(done?' done':'')+'">D'+(idx+1)+'</div>'
        +'<span>'+_esc(_t(step.vi,step.en))+'</span>'
        +(done?'<span style="margin-left:auto;color:var(--green-light,#22c55e);font-size:var(--text-xs,.75rem)">'+_t('Hoàn thành','Done')+'</span>':'')
      +'</div>'
      +'<div class="qeh-d8-body" id="qeh-d8-'+step.key+'">'
        +'<textarea id="qeh-d8-val-'+step.key+'" style="width:100%;min-height:80px;padding:var(--space-2,8px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-md,6px);font-size:var(--text-sm,.8125rem)" placeholder="'+_esc(_t(step.vi,step.en))+'">'+_esc(val)+'</textarea>'
        +'<button class="qeh-btn qeh-btn-primary" style="margin-top:var(--space-2,8px)" data-action="save-d8" data-step="'+step.key+'" data-id="'+_esc(item.id)+'">'+_t('Lưu','Save')+'</button>'
      +'</div>'
    +'</div>';
  });
  html+='</div>';
  return html;
}

function _renderMrbTab(){
  var mrbItems=state.exceptions.filter(function(e){return e.type==='mrb' && e.status!=='closed';});
  if(!mrbItems.length) return '<div class="qeh-empty">'+_t('Không có item chờ MRB','No items pending MRB')+'</div>';
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Vật phẩm chờ MRB','Items Pending MRB')+' ('+mrbItems.length+')</h3>';
  mrbItems.forEach(function(item){
    html+='<div class="qeh-card">'
      +'<div class="qeh-card-header"><div class="qeh-card-title">'+_esc(item.subject||item.id)+'</div>'+_renderSeverityBadge(item.severity)+'</div>'
      +'<div class="qeh-card-meta"><span>'+_t('Bộ phận','Dept')+': '+_esc(item.department||'-')+'</span><span>'+_t('Ngày tạo','Created')+': '+_fmtDate(item.created_at)+'</span></div>'
      +(item.description?'<div style="font-size:var(--text-sm,.8125rem);margin-top:var(--space-2,8px)">'+_esc(item.description)+'</div>':'')
      +'<div class="qeh-mrb-actions">';
    Object.keys(MRB_DISPOSITIONS).forEach(function(dk){
      var d=MRB_DISPOSITIONS[dk];
      html+='<button class="qeh-btn" style="background:'+d.color+';color:var(--text-inverse,#fff)" data-action="mrb-disposition" data-id="'+_esc(item.id)+'" data-disposition="'+dk+'">'+_esc(_t(d.vi,d.en))+'</button>';
    });
    html+='</div></div>';
  });
  return html;
}

function _renderCopqTab(){
  var c=state.copq;
  var periods=c.periods||[];
  var categories=c.categories||['Internal Failure','External Failure','Appraisal','Prevention'];
  var catColors=['var(--red-light,#ef4444)','var(--amber-light,#f59e0b)','var(--blue-light,#3b82f6)','var(--green-light,#22c55e)'];
  var maxVal=1;
  periods.forEach(function(p){ var s=0; (p.values||[]).forEach(function(v){s+=v;}); if(s>maxVal) maxVal=s; });

  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Chi phí chất lượng kém','Cost of Poor Quality')+'</h3>';
  html+='<div style="display:flex;gap:var(--space-3,12px);margin-bottom:var(--space-3,12px);flex-wrap:wrap">';
  categories.forEach(function(cat, i){
    html+='<span style="display:inline-flex;align-items:center;gap:var(--space-1,4px);font-size:var(--text-xs,.75rem)"><span style="width:var(--space-3,12px);height:var(--space-3,12px);border-radius:var(--radius-sm,3px);background:'+catColors[i%catColors.length]+'"></span>'+_esc(cat)+'</span>';
  });
  html+='</div>';

  if(!periods.length){
    html+='<div class="qeh-empty">'+_t('Chưa có dữ liệu COPQ','No COPQ data')+'</div>';
    return html;
  }

  html+='<div class="qeh-copq-bar">';
  periods.forEach(function(p){
    var vals=p.values||[];
    html+='<div class="qeh-copq-col">';
    for(var i=vals.length-1;i>=0;i--){
      var h=Math.round((vals[i]/maxVal)*180);
      html+='<div class="qeh-copq-segment" style="height:'+h+'px;background:'+catColors[i%catColors.length]+'"></div>';
    }
    html+='<div class="qeh-copq-label">'+_esc(p.label||'-')+'</div></div>';
  });
  html+='</div>';

  /* Pareto by defect type */
  var pareto=c.pareto||[];
  if(pareto.length){
    var paretoMax=pareto[0]?pareto[0].count:1;
    html+='<div class="qeh-pareto"><h4 style="margin:var(--space-4,16px) 0 var(--space-3,10px)">'+_t('Pareto theo loại lỗi','Pareto by Defect Type')+'</h4>';
    pareto.forEach(function(item){
      var pct=Math.round((item.count/paretoMax)*100);
      html+='<div class="qeh-pareto-row">'
        +'<div class="qeh-pareto-name">'+_esc(item.name||'-')+'</div>'
        +'<div class="qeh-pareto-bar"><div class="qeh-pareto-fill" style="width:'+pct+'%"></div></div>'
        +'<div class="qeh-pareto-val">'+_esc(item.count)+'</div>'
      +'</div>';
    });
    html+='</div>';
  }
  return html;
}

function _renderTrendsTab(){
  var t_data=state.trends;
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Xu hướng chất lượng','Quality Trends')+'</h3>';

  /* Pareto chart */
  var pareto=t_data.pareto||[];
  if(pareto.length){
    var pMax=pareto[0]?pareto[0].count:1;
    html+='<div class="qeh-detail"><h4 style="margin:0 0 var(--space-3,10px)">'+_t('Pareto nguyên nhân','Pareto by Cause')+'</h4>';
    pareto.forEach(function(item){
      var pct=Math.round((item.count/pMax)*100);
      html+='<div class="qeh-pareto-row">'
        +'<div class="qeh-pareto-name">'+_esc(item.name||'-')+'</div>'
        +'<div class="qeh-pareto-bar"><div class="qeh-pareto-fill" style="width:'+pct+'%"></div></div>'
        +'<div class="qeh-pareto-val">'+_esc(item.count)+'</div>'
      +'</div>';
    });
    html+='</div>';
  }

  /* Control chart placeholder */
  var control=t_data.control_chart||[];
  html+='<div class="qeh-detail"><h4 style="margin:0 0 var(--space-3,10px)">'+_t('Biểu đồ kiểm soát','Control Chart')+'</h4>';
  if(!control.length){
    html+='<div class="qeh-empty">'+_t('Chưa có dữ liệu','No data available')+'</div>';
  } else {
    var cMax=0; control.forEach(function(p){if(p.value>cMax) cMax=p.value;});
    if(cMax===0) cMax=1;
    var ucl=t_data.ucl||cMax*0.9, lcl=t_data.lcl||0, cl=t_data.cl||cMax*0.5;
    html+='<div style="position:relative;height:180px;border:1px solid var(--bg-hover,#e2e8f0);border-radius:var(--radius-md,6px);overflow:hidden;padding:var(--space-1,4px)">';
    html+='<div style="position:absolute;left:0;right:0;top:'+Math.round((1-ucl/cMax)*100)+'%;border-top:1px dashed var(--red-light,#ef4444);font-size:.625rem;color:var(--red-light,#ef4444);padding-left:var(--space-1,4px)">UCL</div>';
    html+='<div style="position:absolute;left:0;right:0;top:'+Math.round((1-cl/cMax)*100)+'%;border-top:1px dashed var(--blue-light,#3b82f6);font-size:.625rem;color:var(--blue-light,#3b82f6);padding-left:var(--space-1,4px)">CL</div>';
    html+='<div style="position:absolute;left:0;right:0;top:'+Math.round((1-lcl/cMax)*100)+'%;border-top:1px dashed var(--green-light,#22c55e);font-size:.625rem;color:var(--green-light,#22c55e);padding-left:var(--space-1,4px)">LCL</div>';
    html+='<svg style="width:100%;height:100%" viewBox="0 0 '+control.length*30+' 180" preserveAspectRatio="none">';
    var pts=control.map(function(p,i){ return (i*30+15)+','+Math.round((1-p.value/cMax)*170+5); });
    html+='<polyline fill="none" stroke="var(--brand,#1565c0)" stroke-width="2" points="'+pts.join(' ')+'"/>';
    control.forEach(function(p,i){ html+='<circle cx="'+(i*30+15)+'" cy="'+Math.round((1-p.value/cMax)*170+5)+'" r="3" fill="var(--brand,#1565c0)"/>'; });
    html+='</svg></div>';
  }
  html+='</div>';

  /* Heatmap placeholder */
  html+='<div class="qeh-detail"><h4 style="margin:0 0 var(--space-3,10px)">'+_t('Bản đồ nhiệt','Heatmap')+'</h4>';
  var heatmap=t_data.heatmap||[];
  if(!heatmap.length){
    html+='<div class="qeh-empty">'+_t('Chưa có dữ liệu heatmap','No heatmap data')+'</div>';
  } else {
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:var(--space-1,4px)">';
    heatmap.forEach(function(cell){
      var intensity=Math.min(1,cell.value/(t_data.heatmap_max||10));
      var bg='rgba(239,68,68,'+intensity.toFixed(2)+')';
      html+='<div style="padding:var(--space-2,8px);text-align:center;border-radius:var(--radius-sm,4px);font-size:.625rem;background:'+bg+';color:'+(intensity>0.5?'var(--text-inverse,#fff)':'#0f172a')+'">'+_esc(cell.label||'')+'<br>'+_esc(cell.value)+'</div>';
    });
    html+='</div>';
  }
  html+='</div>';
  return html;
}

/* ── data loading ─────────────────────────────────────── */
function _loadExceptions(){
  state.loading=true; _paint();
  var payload=Object.assign({}, state.filters, { offset:state.pagination.offset, limit:state.pagination.limit });
  _api('quality_exception_list', payload).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.exceptions=r.items||[];
      state.pagination.total=r.total||0;
    } else {
      _toast(_t('Lỗi tải danh sách','Failed to load exceptions'),'error');
    }
    _paint();
  }).catch(function(){
    state.loading=false; _toast(_t('Lỗi kết nối','Connection error'),'error'); _paint();
  });
}

function _loadKpi(){
  _api('quality_exception_kpi',{}).then(function(r){
    if(r&&r.ok) state.kpi=r.kpi||{};
    _paint();
  }).catch(function(){});
}

function _loadCopq(){
  _api('quality_exception_copq',{}).then(function(r){
    if(r&&r.ok) state.copq=r.copq||{};
    _paint();
  }).catch(function(){});
}

function _loadTrends(){
  _api('quality_exception_trends',{}).then(function(r){
    if(r&&r.ok) state.trends=r.trends||{};
    _paint();
  }).catch(function(){});
}

/* ── mutations ────────────────────────────────────────── */
function _createException(type, data){
  data.type=type;
  _api('quality_exception_create', data).then(function(r){
    if(r&&r.ok){
      _toast(_t('Tạo thành công','Created successfully'),'success');
      _loadExceptions(); _loadKpi();
      state.activeTab='dashboard'; _paint();
    } else {
      _toast(_t('Lỗi tạo','Creation failed'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi kết nối','Connection error'),'error'); });
}

function _transitionException(type, id, status){
  _api('quality_exception_transition',{type:type,id:id,status:status}).then(function(r){
    if(r&&r.ok){
      _toast(_t('Cập nhật thành công','Updated successfully'),'success');
      _loadExceptions(); _loadKpi();
    } else {
      _toast(r&&r.message?r.message:_t('Lỗi cập nhật','Update failed'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi kết nối','Connection error'),'error'); });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="qeh">';
  html+='<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<span style="font-size:1.2em">⚠️</span>'
    +'<div style="flex:1;min-width:180px"><b style="color:#b45309">'+_t('Module này đã được hợp nhất vào EQMS Suite','This module has been merged into EQMS Suite')+'</b>'
    +'<div style="font-size:0.85em;color:#78716c;margin-top:2px">'+_t('Dùng EQMS Suite → NCR / MRB / CAPA thay thế.','Use EQMS Suite → NCR / MRB / CAPA instead.')+'</div></div>'
    +'<button onclick="window.navigateTo&&navigateTo(\'eqms\')" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600;white-space:nowrap">'+_t('Mở EQMS Suite →','Open EQMS Suite →')+'</button>'
    +'</div>';
  html+='<div class="qeh-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="qeh-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';

  if(state.loading){
    html+='<div class="qeh-loading">'+_t('Đang tải...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'dashboard': html+=_renderDashboardTab(); break;
      case 'create':    html+=_renderCreateTab(); break;
      case '8d':        html+=_render8dTab(); break;
      case 'mrb':       html+=_renderMrbTab(); break;
      case 'copq':      html+=_renderCopqTab(); break;
      case 'trends':    html+=_renderTrendsTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
}

/* ── event delegation ─────────────────────────────────── */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab');
        state.selectedId=null;
        if(state.activeTab==='copq') _loadCopq();
        if(state.activeTab==='trends') _loadTrends();
        _paint();
        break;
      case 'select':
        state.selectedId=t.getAttribute('data-id');
        state.selectedType=t.getAttribute('data-type');
        _paint();
        break;
      case 'deselect':
        state.selectedId=null; state.selectedType=null; _paint();
        break;
      case 'transition':
        _transitionException(t.getAttribute('data-type'), t.getAttribute('data-id'), t.getAttribute('data-status'));
        break;
      case 'open-create':
        _openCreateDialog(t.getAttribute('data-type'));
        break;
      case 'cancel-create':
        var cf=state.container.querySelector('#qeh-create-form');
        if(cf) cf.innerHTML='';
        break;
      case 'submit-create':
        var data={
          subject: (state.container.querySelector('#qeh-f-subject')||{}).value||'',
          severity: (state.container.querySelector('#qeh-f-severity')||{}).value||'minor',
          department: (state.container.querySelector('#qeh-f-dept')||{}).value||'',
          assigned_to: (state.container.querySelector('#qeh-f-assigned')||{}).value||'',
          linked_order: (state.container.querySelector('#qeh-f-linked')||{}).value||'',
          sla_days: parseInt((state.container.querySelector('#qeh-f-sla')||{}).value)||30,
          description: (state.container.querySelector('#qeh-f-desc')||{}).value||''
        };
        _createException(t.getAttribute('data-type'), data);
        break;
      case 'select-8d':
        state.selectedId=t.getAttribute('data-id');
        _paint();
        break;
      case 'toggle-d8':
        var stepKey=t.getAttribute('data-step');
        var body=state.container.querySelector('#qeh-d8-'+stepKey);
        if(body) body.classList.toggle('open');
        break;
      case 'save-d8':
        var sKey=t.getAttribute('data-step');
        var sId=t.getAttribute('data-id');
        var val=(state.container.querySelector('#qeh-d8-val-'+sKey)||{}).value||'';
        _api('quality_exception_save_8d',{id:sId,step:sKey,value:val}).then(function(r){
          if(r&&r.ok){ _toast(_t('Đã lưu','Saved'),'success'); _loadExceptions(); }
          else { _toast(_t('Lỗi lưu','Save failed'),'error'); }
        }).catch(function(){ _toast(_t('Lỗi kết nối','Connection error'),'error'); });
        break;
      case 'mrb-disposition':
        var mId=t.getAttribute('data-id'), disp=t.getAttribute('data-disposition');
        _api('quality_exception_mrb_disposition',{id:mId,disposition:disp}).then(function(r){
          if(r&&r.ok){ _toast(_t('Đã phân loại','Disposition applied'),'success'); _loadExceptions(); _loadKpi(); }
          else { _toast(_t('Lỗi','Error'),'error'); }
        }).catch(function(){ _toast(_t('Lỗi kết nối','Connection error'),'error'); });
        break;
      case 'page-prev':
        state.pagination.offset=Math.max(0, state.pagination.offset-state.pagination.limit);
        _loadExceptions();
        break;
      case 'page-next':
        state.pagination.offset+=state.pagination.limit;
        _loadExceptions();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){
      state.filters[f]=e.target.value;
      state.pagination.offset=0;
      _loadExceptions();
    }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f && (f==='department'||f==='assignedTo')){
      state.filters[f]=e.target.value;
    }
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='dashboard';
  state.selectedId=null;
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadKpi();
  _loadExceptions();
}

window._renderQualityExceptionHub = render;

})();

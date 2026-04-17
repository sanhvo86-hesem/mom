/* ===================================================================
   24-fmea-control-plan.js
   HESEM MOM Portal - FMEA (AIAG/VDA 2019) & Control Plan Management
   DFMEA, PFMEA worksheets, failure modes, action tracking,
   control plans, RPN analytics, and Action Priority optimization.
   =================================================================== */

(function(){
'use strict';

/* -- helpers -------------------------------------------------- */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; }
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{method:method||'POST',credentials:'include',headers:{'Content-Type':'application/json',...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})}).then(function(r){return r.json();});
}
function _toast(msg, type){ if(typeof showToast==='function') return showToast(msg, type); var box=document.createElement('div'); box.className='sj-toast '+(type||'info'); box.textContent=msg; document.body.appendChild(box); requestAnimationFrame(function(){ box.classList.add('show'); }); setTimeout(function(){ box.classList.remove('show'); setTimeout(function(){ if(box.parentNode) box.remove(); },180); },3200); }
function _fmtDate(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'fm-styles';
var TABS = [
  { key:'list',      vi:'Danh sach FMEA',  en:'FMEA List' },
  { key:'detail',    vi:'Chi tiet FMEA',   en:'FMEA Detail' },
  { key:'add',       vi:'Tao / Sua FMEA',  en:'Add / Edit FMEA' },
  { key:'actions',   vi:'Theo doi HD',     en:'Actions Tracker' },
  { key:'cp_list',   vi:'Control Plan',    en:'Control Plans' },
  { key:'cp_detail', vi:'CP Chi tiet',     en:'CP Detail' },
  { key:'analytics', vi:'Phan tich RPN',   en:'RPN Analytics' }
];

var FMEA_TYPE = {
  dfmea: { vi:'DFMEA', en:'DFMEA', color:'var(--blue-light,#3b82f6)' },
  pfmea: { vi:'PFMEA', en:'PFMEA', color:'var(--purple-light,#8b5cf6)' }
};

/* FMEA_STATUS — đọc từ HmRegistry → 'fmea_status' */
var FMEA_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('fmea_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {draft:{vi:'Nháp',en:'Draft',color:'#94a3b8'},in_progress:{vi:'Đang thực hiện',en:'In Progress',color:'#f59e0b'},review:{vi:'Chờ duyệt',en:'Review',color:'#8b5cf6'},approved:{vi:'Đã duyệt',en:'Approved',color:'#22c55e'},archived:{vi:'Lưu trữ',en:'Archived',color:'#6b7280'}}; }
  return map;
})();

var AP_LEVEL = {
  HIGH:   { vi:'CAO',          en:'HIGH',   color:'var(--red-light,#ef4444)', text:'#fff' },
  MEDIUM: { vi:'TRUNG BÌNH',   en:'MEDIUM', color:'var(--amber-light,#f59e0b)', text:'#1a1a1a' },
  LOW:    { vi:'THẤP',         en:'LOW',    color:'var(--green-light,#22c55e)', text:'#fff' }
};

/* ACTION_STATUS — đọc từ HmRegistry → 'fmea_action_status' */
var ACTION_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('fmea_action_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {open:{vi:'Mở',en:'Open',color:'var(--red-light,#ef4444)'},in_progress:{vi:'Đang thực hiện',en:'In Progress',color:'var(--amber-light,#f59e0b)'},completed:{vi:'Hoàn thành',en:'Completed',color:'var(--green-light,#22c55e)'},overdue:{vi:'Quá hạn',en:'Overdue',color:'var(--red-light,#dc2626)'}}; }
  return map;
})();

var CP_TYPE = {
  prototype:  { vi:'Prototype',   en:'Prototype',   color:'var(--blue-light,#3b82f6)' },
  prelaunch:  { vi:'Pre-launch',  en:'Pre-launch',  color:'var(--amber-light,#f59e0b)' },
  production: { vi:'Production',  en:'Production',  color:'var(--green-light,#22c55e)' }
};

/* CP_STATUS — đọc từ HmRegistry → 'control_plan_status' */
var CP_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('control_plan_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {draft:{vi:'Nháp',en:'Draft',color:'var(--text-secondary,#94a3b8)'},active:{vi:'Hoạt động',en:'Active',color:'var(--green-light,#22c55e)'},archived:{vi:'Lưu trữ',en:'Archived',color:'var(--text-secondary,#6b7280)'}}; }
  return map;
})();

var CLASSIFICATION = {
  CC: { vi:'CC', en:'CC', color:'var(--red-light,#ef4444)', bg:'#fef2f2' },
  SC: { vi:'SC', en:'SC', color:'var(--amber-light,#f59e0b)', bg:'#fffbeb' },
  HI: { vi:'HI', en:'HI', color:'#ca8a04', bg:'#fefce8' },
  YC: { vi:'YC', en:'YC', color:'var(--blue-light,#3b82f6)', bg:'#eff6ff' }
};

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'list',
  fmeas: [],
  selectedFmea: null,
  failureModes: [],
  controlPlans: [],
  selectedCp: null,
  cpCharacteristics: [],
  actions: [],
  rpnData: {},
  filters: { type:'all', status:'all', item:'' },
  actionFilters: { status:'all', ap:'all' },
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.fm{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.fm-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.fm-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.fm-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.fm-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.fm-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.fm-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.fm-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.fm-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.fm-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.fm-filters select,.fm-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.fm-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.fm-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.fm-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.fm-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.fm-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:var(--text-inverse,#fff);white-space:nowrap}',
    '.fm-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.fm-btn-primary{background:var(--brand,#1565c0);color:var(--text-inverse,#fff)}',
    '.fm-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.fm-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.fm-btn-secondary:hover{background:var(--border,#e2e8f0)}',
    '.fm-btn-danger{background:var(--red-light,#ef4444);color:var(--text-inverse,#fff)}',
    '.fm-btn-sm{padding:4px 10px;font-size:.75rem}',
    '.fm-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px}',
    '.fm-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.fm-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.fm-form input,.fm-form select,.fm-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.fm-form textarea{min-height:80px;resize:vertical}',
    '.fm-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    /* worksheet */
    '.fm-worksheet{overflow-x:auto;margin-bottom:16px}',
    '.fm-worksheet table{min-width:1400px}',
    '.fm-worksheet th{position:sticky;top:0;background:var(--surface,#f8fafc);z-index:2}',
    '.fm-row-high td{background:rgba(239,68,68,.08)}',
    '.fm-row-medium td{background:rgba(245,158,11,.08)}',
    '.fm-row-low td{background:rgba(34,197,94,.08)}',
    '.fm-cell-num{text-align:center;font-weight:700;min-width:36px}',
    '.fm-rpn-cell{text-align:center;font-weight:800;font-size:.875rem}',
    '.fm-expandable{cursor:pointer}',
    '.fm-expand-row{display:none}',
    '.fm-expand-row.open{display:table-row}',
    /* control plan */
    '.fm-cp-table{min-width:1200px}',
    '.fm-cp-class{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.6875rem;font-weight:700}',
    /* chart */
    '.fm-chart{position:relative;min-height:200px;border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:16px;margin-bottom:16px}',
    '.fm-bar-row{display:flex;align-items:flex-end;gap:3px;height:180px;border-bottom:1px solid var(--border,#e2e8f0);padding-bottom:4px}',
    '.fm-bar{flex:1;min-width:12px;border-radius:3px 3px 0 0;position:relative;transition:height .3s}',
    '.fm-bar-label{font-size:.5625rem;text-align:center;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:50px;color:var(--text-secondary,#64748b)}',
    '.fm-donut{width:200px;height:200px;border-radius:50%;position:relative;margin:0 auto}',
    '.fm-legend{display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:.75rem;flex-wrap:wrap}',
    '.fm-legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:4px}',
    '.fm-inline-form{background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:14px;margin-bottom:12px}'
  ].join('\n');
  document.head.appendChild(s);
}

/* -- badge helpers -------------------------------------------- */
function _typeBadge(type){
  var m=FMEA_TYPE[type]||{vi:type,en:type,color:'var(--text-secondary,#64748b)'};
  return '<span class="fm-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _statusBadge(status){
  if(window.HmRegistry) return HmRegistry.badge('fmea_status', status);
  /* legacy fallback below */
  var m=FMEA_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="fm-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _apBadge(level){
  var m=AP_LEVEL[level]||{vi:level,en:level,color:'var(--text-secondary,#64748b)',text:'#fff'};
  return '<span class="fm-badge" style="background:'+m.color+';color:'+m.text+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _actionBadge(status){
  var m=ACTION_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="fm-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _cpTypeBadge(type){
  var m=CP_TYPE[type]||{vi:type,en:type,color:'var(--text-secondary,#64748b)'};
  return '<span class="fm-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _cpStatusBadge(status){
  var m=CP_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="fm-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _classBadge(cls){
  var m=CLASSIFICATION[cls];
  if(!m) return _esc(cls||'-');
  return '<span class="fm-cp-class" style="background:'+m.bg+';color:'+m.color+'">'+_esc(m.en)+'</span>';
}
function _kpiCard(label, value, color){
  return '<div class="fm-kpi"><div class="fm-kpi-label">'+_esc(label)+'</div><div class="fm-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* -- AP calc -------------------------------------------------- */
function _calcAP(s, o, d){
  s=parseInt(s)||1; o=parseInt(o)||1; d=parseInt(d)||1;
  if(s>=9||(s>=6&&o>=4)) return 'HIGH';
  if(s>=5||(o>=4&&d>=4)) return 'MEDIUM';
  return 'LOW';
}
function _calcRPN(s,o,d){ return (parseInt(s)||1)*(parseInt(o)||1)*(parseInt(d)||1); }
function _apRowClass(ap){
  if(ap==='HIGH') return 'fm-row-high';
  if(ap==='MEDIUM') return 'fm-row-medium';
  return 'fm-row-low';
}

/* ============================================================= */
/* TAB 1: FMEA List                                              */
/* ============================================================= */
function _renderListTab(){
  var html='<div class="fm-filters">';
  html+='<select data-filter="type"><option value="all">'+_t('Tat ca loai','All Types')+'</option>';
  Object.keys(FMEA_TYPE).forEach(function(k){ var m=FMEA_TYPE[k]; html+='<option value="'+k+'"'+(state.filters.type===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<select data-filter="status"><option value="all">'+_t('Tat ca trang thai','All Status')+'</option>';
  Object.keys(FMEA_STATUS).forEach(function(k){ var m=FMEA_STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<input type="text" data-filter="item" placeholder="'+_t('Tim kiem...','Search...')+'" value="'+_esc(state.filters.item)+'" style="width:200px">';
  html+='<button class="fm-btn fm-btn-primary" data-action="go-add">+ '+_t('Tao FMEA','New FMEA')+'</button>';
  html+='</div>';

  var rows=state.fmeas;
  if(state.filters.type!=='all') rows=rows.filter(function(f){ return f.type===state.filters.type; });
  if(state.filters.status!=='all') rows=rows.filter(function(f){ return f.status===state.filters.status; });
  if(state.filters.item) rows=rows.filter(function(f){ return (f.item||'').toLowerCase().indexOf(state.filters.item.toLowerCase())>=0 || (f.number||'').toLowerCase().indexOf(state.filters.item.toLowerCase())>=0; });

  if(!rows.length) return html+'<div class="fm-empty">'+_t('Chua co du lieu','No FMEAs found')+'</div>';

  html+='<table class="fm-table"><thead><tr>';
  html+='<th>'+_t('So','Number')+'</th><th>'+_t('Loai','Type')+'</th><th>'+_t('Item / Part','Item / Part')+'</th><th>'+_t('Trang thai','Status')+'</th><th>Rev</th><th>'+_t('Failure Modes','Failure Modes')+'</th><th>'+_t('Max AP','Max AP')+'</th><th></th>';
  html+='</tr></thead><tbody>';
  rows.forEach(function(f){
    html+='<tr>';
    html+='<td><strong>'+_esc(f.number)+'</strong></td>';
    html+='<td>'+_typeBadge(f.type)+'</td>';
    html+='<td>'+_esc(f.item||'-')+'</td>';
    html+='<td>'+_statusBadge(f.status)+'</td>';
    html+='<td>'+_esc(f.revision||'01')+'</td>';
    html+='<td style="text-align:center">'+_esc(f.fm_count||0)+'</td>';
    html+='<td>'+_apBadge(f.max_ap||'LOW')+'</td>';
    html+='<td><button class="fm-btn fm-btn-secondary fm-btn-sm" data-action="select-fmea" data-id="'+_esc(f.id)+'">'+_t('Mo','Open')+'</button></td>';
    html+='</tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ============================================================= */
/* TAB 2: FMEA Detail                                            */
/* ============================================================= */
function _renderDetailTab(){
  var f=state.selectedFmea;
  if(!f) return '<div class="fm-empty">'+_t('Chon mot FMEA tu danh sach','Select an FMEA from the list')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<div>';
  html+='<h3 style="margin:0">'+_esc(f.number)+' '+_typeBadge(f.type)+' '+_statusBadge(f.status)+'</h3>';
  html+='<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:4px">'+_esc(f.item||'-')+' | '+_t('Truong nhom','Team Lead')+': '+_esc(f.team_lead||'-')+' | Rev '+_esc(f.revision||'01')+'</div>';
  html+='</div>';
  html+='<div style="display:flex;gap:6px">';
  html+='<button class="fm-btn fm-btn-secondary" data-action="go-list">'+_t('Quay lai','Back')+'</button>';
  html+='<button class="fm-btn fm-btn-primary" data-action="add-fm">+ '+_t('Them Failure Mode','Add Failure Mode')+'</button>';
  html+='</div></div>';

  /* inline add form */
  html+='<div id="fm-add-fm-form"></div>';

  /* Failure modes worksheet */
  var modes=state.failureModes;
  if(!modes.length) return html+'<div class="fm-empty">'+_t('Chua co failure mode','No failure modes yet')+'</div>';

  html+='<div class="fm-worksheet"><table class="fm-table">';
  html+='<thead><tr>';
  html+='<th>#</th><th>'+_t('Buoc QT','Process Step')+'</th><th>'+_t('Chuc nang','Function')+'</th><th>'+_t('Failure Mode','Failure Mode')+'</th>';
  html+='<th>'+_t('Anh huong','Effect')+'</th><th>'+_t('Nguyen nhan','Cause')+'</th>';
  html+='<th>S</th><th>O</th><th>D</th><th>RPN</th><th>AP</th>';
  html+='<th>'+_t('Ngan ngua','Prevention')+'</th><th>'+_t('Phat hien','Detection')+'</th><th>'+_t('Hanh dong','Actions')+'</th>';
  html+='</tr></thead><tbody>';
  modes.forEach(function(m, idx){
    var ap=_calcAP(m.severity,m.occurrence,m.detection);
    var rpn=_calcRPN(m.severity,m.occurrence,m.detection);
    html+='<tr class="'+_apRowClass(ap)+' fm-expandable" data-action="toggle-expand" data-idx="'+idx+'">';
    html+='<td class="fm-cell-num">'+(idx+1)+'</td>';
    html+='<td>'+_esc(m.process_step||'-')+'</td>';
    html+='<td>'+_esc(m.function_desc||'-')+'</td>';
    html+='<td><strong>'+_esc(m.failure_mode||'-')+'</strong></td>';
    html+='<td>'+_esc(m.effect||'-')+'</td>';
    html+='<td>'+_esc(m.cause||'-')+'</td>';
    html+='<td class="fm-cell-num">'+_esc(m.severity||1)+'</td>';
    html+='<td class="fm-cell-num">'+_esc(m.occurrence||1)+'</td>';
    html+='<td class="fm-cell-num">'+_esc(m.detection||1)+'</td>';
    html+='<td class="fm-rpn-cell">'+rpn+'</td>';
    html+='<td>'+_apBadge(ap)+'</td>';
    html+='<td>'+_esc(m.prevention||'-')+'</td>';
    html+='<td>'+_esc(m.detection_method||'-')+'</td>';
    html+='<td style="text-align:center">'+(m.action_count||0)+'</td>';
    html+='</tr>';
    /* expandable row for recommended actions */
    var acts=m.actions||[];
    html+='<tr class="fm-expand-row" id="fm-expand-'+idx+'"><td colspan="14" style="padding:12px 20px;background:var(--surface,#f8fafc)">';
    if(acts.length){
      html+='<strong>'+_t('Hanh dong khuyen nghi','Recommended Actions')+':</strong>';
      html+='<table class="fm-table" style="margin-top:8px"><thead><tr><th>'+_t('Hanh dong','Action')+'</th><th>'+_t('Phu trach','Responsible')+'</th><th>'+_t('Ngay muc tieu','Target Date')+'</th><th>'+_t('Trang thai','Status')+'</th></tr></thead><tbody>';
      acts.forEach(function(a){
        html+='<tr><td>'+_esc(a.description||'-')+'</td><td>'+_esc(a.responsible||'-')+'</td><td>'+_fmtDate(a.target_date)+'</td><td>'+_actionBadge(a.status||'open')+'</td></tr>';
      });
      html+='</tbody></table>';
    } else {
      html+='<div style="font-size:.8125rem;color:var(--text-secondary,#94a3b8)">'+_t('Chua co hanh dong','No recommended actions')+'</div>';
    }
    html+='</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}

/* ============================================================= */
/* TAB 3: Add / Edit FMEA                                       */
/* ============================================================= */
function _renderAddTab(){
  var f=state.selectedFmea;
  var isEdit=!!f;
  var html='<div class="fm-card">';
  html+='<h3 style="margin:0 0 16px">'+(isEdit?_t('Sua FMEA','Edit FMEA'):_t('Tao FMEA moi','New FMEA'))+'</h3>';
  html+='<div class="fm-form">';
  html+='<div><label>'+_t('Loai FMEA','FMEA Type')+'</label><select id="fm-f-type">';
  Object.keys(FMEA_TYPE).forEach(function(k){ var m=FMEA_TYPE[k]; html+='<option value="'+k+'"'+(isEdit&&f.type===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select></div>';
  html+='<div><label>'+_t('Item / Part','Item / Part')+'</label><input type="text" id="fm-f-item" value="'+_esc(isEdit?f.item:'')+'"></div>';
  html+='<div><label>'+_t('Ten quy trinh','Process Name')+'</label><input type="text" id="fm-f-process" value="'+_esc(isEdit?f.process_name:'')+'"></div>';
  html+='<div><label>'+_t('Truong nhom','Team Lead')+'</label><input type="text" id="fm-f-lead" value="'+_esc(isEdit?f.team_lead:'')+'"></div>';
  html+='<div style="grid-column:1/-1"><label>'+_t('Thanh vien nhom','Team Members')+'</label><input type="text" id="fm-f-team" placeholder="'+_t('Phan cach bang dau phay','Comma-separated')+'" value="'+_esc(isEdit?(f.team_members||[]).join(', '):'')+'"></div>';
  html+='<div style="grid-column:1/-1"><label>'+_t('Pham vi','Scope')+'</label><textarea id="fm-f-scope">'+_esc(isEdit?f.scope:'')+'</textarea></div>';
  html+='</div>';
  html+='<div style="margin-top:14px;display:flex;gap:8px">';
  html+='<button class="fm-btn fm-btn-primary" data-action="save-fmea">'+_t('Luu ban nhap','Save as Draft')+'</button>';
  if(isEdit) html+='<button class="fm-btn fm-btn-secondary" data-action="go-list">'+_t('Huy','Cancel')+'</button>';
  html+='</div></div>';
  return html;
}

/* ============================================================= */
/* TAB 4: Actions Tracker                                        */
/* ============================================================= */
function _renderActionsTab(){
  var html='<div class="fm-filters">';
  html+='<select data-actionfilter="status"><option value="all">'+_t('Tat ca trang thai','All Status')+'</option>';
  Object.keys(ACTION_STATUS).forEach(function(k){ var m=ACTION_STATUS[k]; html+='<option value="'+k+'"'+(state.actionFilters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select>';
  html+='<select data-actionfilter="ap"><option value="all">'+_t('Tat ca AP','All AP Levels')+'</option>';
  Object.keys(AP_LEVEL).forEach(function(k){ var m=AP_LEVEL[k]; html+='<option value="'+k+'"'+(state.actionFilters.ap===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html+='</select></div>';

  var acts=state.actions;
  if(state.actionFilters.status!=='all') acts=acts.filter(function(a){ return a.status===state.actionFilters.status; });
  if(state.actionFilters.ap!=='all') acts=acts.filter(function(a){ return a.ap===state.actionFilters.ap; });

  if(!acts.length) return html+'<div class="fm-empty">'+_t('Chua co hanh dong','No actions found')+'</div>';

  html+='<table class="fm-table"><thead><tr>';
  html+='<th>'+_t('FMEA','FMEA')+'</th><th>'+_t('Failure Mode','Failure Mode')+'</th><th>'+_t('Hanh dong','Action')+'</th><th>'+_t('Phu trach','Responsible')+'</th>';
  html+='<th>'+_t('Muc tieu','Target')+'</th><th>AP</th><th>'+_t('Trang thai','Status')+'</th><th></th>';
  html+='</tr></thead><tbody>';
  acts.forEach(function(a){
    html+='<tr>';
    html+='<td>'+_esc(a.fmea_ref||'-')+'</td>';
    html+='<td>'+_esc(a.failure_mode||'-')+'</td>';
    html+='<td>'+_esc(a.description||'-')+'</td>';
    html+='<td>'+_esc(a.responsible||'-')+'</td>';
    html+='<td>'+_fmtDate(a.target_date)+'</td>';
    html+='<td>'+_apBadge(a.ap||'LOW')+'</td>';
    html+='<td>'+_actionBadge(a.status||'open')+'</td>';
    html+='<td>';
    if(a.status!=='completed'){
      html+='<button class="fm-btn fm-btn-primary fm-btn-sm" data-action="complete-action" data-id="'+_esc(a.id)+'">'+_t('Hoan thanh','Complete')+'</button>';
    } else {
      /* show improvement */
      var oldRpn=a.old_rpn||0, newRpn=a.new_rpn||0;
      if(oldRpn && newRpn) html+='<span style="font-size:.75rem;color:var(--green-light,#22c55e)">RPN '+oldRpn+' &rarr; '+newRpn+'</span>';
    }
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ============================================================= */
/* TAB 5: Control Plans List                                     */
/* ============================================================= */
function _renderCpListTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<h3 style="margin:0">'+_t('Control Plans','Control Plans')+'</h3>';
  html+='<div style="display:flex;gap:6px">';
  html+='<button class="fm-btn fm-btn-primary" data-action="auto-gen-cp">'+_t('Tu dong tao tu FMEA','Auto-Generate from FMEA')+'</button>';
  html+='</div></div>';

  if(!state.controlPlans.length) return html+'<div class="fm-empty">'+_t('Chua co control plan','No control plans')+'</div>';

  html+='<table class="fm-table"><thead><tr>';
  html+='<th>'+_t('So','Number')+'</th><th>'+_t('Loai','Type')+'</th><th>'+_t('Item','Item')+'</th><th>'+_t('FMEA lien ket','Linked FMEA')+'</th><th>'+_t('Trang thai','Status')+'</th><th></th>';
  html+='</tr></thead><tbody>';
  state.controlPlans.forEach(function(cp){
    html+='<tr>';
    html+='<td><strong>'+_esc(cp.number)+'</strong></td>';
    html+='<td>'+_cpTypeBadge(cp.type)+'</td>';
    html+='<td>'+_esc(cp.item||'-')+'</td>';
    html+='<td>'+_esc(cp.fmea_ref||'-')+'</td>';
    html+='<td>'+_cpStatusBadge(cp.status)+'</td>';
    html+='<td><button class="fm-btn fm-btn-secondary fm-btn-sm" data-action="select-cp" data-id="'+_esc(cp.id)+'">'+_t('Mo','Open')+'</button></td>';
    html+='</tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ============================================================= */
/* TAB 6: Control Plan Detail                                    */
/* ============================================================= */
function _renderCpDetailTab(){
  var cp=state.selectedCp;
  if(!cp) return '<div class="fm-empty">'+_t('Chon mot Control Plan','Select a Control Plan')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<div>';
  html+='<h3 style="margin:0">'+_esc(cp.number)+' '+_cpTypeBadge(cp.type)+' '+_cpStatusBadge(cp.status)+'</h3>';
  html+='<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:4px">'+_esc(cp.item||'-')+' | FMEA: '+_esc(cp.fmea_ref||'-')+'</div>';
  html+='</div>';
  html+='<div style="display:flex;gap:6px">';
  html+='<button class="fm-btn fm-btn-secondary" data-action="go-cp-list">'+_t('Quay lai','Back')+'</button>';
  html+='<button class="fm-btn fm-btn-primary" data-action="add-char">+ '+_t('Them dac tinh','Add Characteristic')+'</button>';
  html+='</div></div>';

  html+='<div id="fm-add-char-form"></div>';

  var chars=state.cpCharacteristics;
  if(!chars.length) return html+'<div class="fm-empty">'+_t('Chua co dac tinh','No characteristics yet')+'</div>';

  html+='<div class="fm-worksheet"><table class="fm-table fm-cp-table">';
  html+='<thead><tr>';
  html+='<th>#</th><th>'+_t('Buoc QT','Process Step')+'</th><th>'+_t('Dac tinh','Characteristic')+'</th><th>'+_t('Phan loai','Class')+'</th>';
  html+='<th>'+_t('Spec SP','Product Spec')+'</th><th>'+_t('Spec QT','Process Spec')+'</th>';
  html+='<th>'+_t('Phuong phap','Method')+'</th><th>'+_t('Co mau','Sample Size')+'</th><th>'+_t('Tan suat','Frequency')+'</th>';
  html+='<th>'+_t('Kiem soat','Control')+'</th><th>'+_t('Phan ung','Reaction Plan')+'</th>';
  html+='</tr></thead><tbody>';
  chars.forEach(function(c, idx){
    html+='<tr>';
    html+='<td class="fm-cell-num">'+(idx+1)+'</td>';
    html+='<td>'+_esc(c.process_step||'-')+'</td>';
    html+='<td><strong>'+_esc(c.characteristic||'-')+'</strong></td>';
    html+='<td>'+_classBadge(c.classification)+'</td>';
    html+='<td>'+_esc(c.product_spec||'-')+'</td>';
    html+='<td>'+_esc(c.process_spec||'-')+'</td>';
    html+='<td>'+_esc(c.method||'-')+'</td>';
    html+='<td>'+_esc(c.sample_size||'-')+'</td>';
    html+='<td>'+_esc(c.frequency||'-')+'</td>';
    html+='<td>'+_esc(c.control||'-')+'</td>';
    html+='<td>'+_esc(c.reaction_plan||'-')+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}

/* ============================================================= */
/* TAB 7: RPN Analytics                                          */
/* ============================================================= */
function _renderAnalyticsTab(){
  var data=state.rpnData;
  var modes=data.failure_modes||[];
  var dist=data.ap_distribution||{HIGH:0,MEDIUM:0,LOW:0};
  var trend=data.trend||[];

  var html='<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">';

  /* bar chart: before vs after */
  html+='<div class="fm-chart"><h4 style="margin:0 0 12px">'+_t('RPN theo Failure Mode (truoc / sau)','RPN by Failure Mode (Before / After)')+'</h4>';
  if(modes.length){
    var maxRpn=1;
    modes.forEach(function(m){ var v=Math.max(m.rpn_before||0, m.rpn_after||0); if(v>maxRpn) maxRpn=v; });
    html+='<div class="fm-bar-row">';
    modes.forEach(function(m){
      var hBefore=Math.round(((m.rpn_before||0)/maxRpn)*160);
      var hAfter=Math.round(((m.rpn_after||0)/maxRpn)*160);
      html+='<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:0">'
        +'<div style="display:flex;align-items:flex-end;gap:1px;height:160px">'
        +'<div class="fm-bar" style="height:'+hBefore+'px;background:var(--red-light,#ef4444);min-width:6px" title="'+_t('Truoc','Before')+': '+_esc(m.rpn_before)+'"></div>'
        +'<div class="fm-bar" style="height:'+hAfter+'px;background:var(--green-light,#22c55e);min-width:6px" title="'+_t('Sau','After')+': '+_esc(m.rpn_after)+'"></div>'
        +'</div>'
        +'<div class="fm-bar-label" title="'+_esc(m.name)+'">'+_esc(m.name)+'</div>'
        +'</div>';
    });
    html+='</div>';
    html+='<div class="fm-legend"><span><span class="fm-legend-dot" style="background:var(--red-light,#ef4444)"></span>'+_t('Truoc','Before')+'</span><span><span class="fm-legend-dot" style="background:var(--green-light,#22c55e)"></span>'+_t('Sau','After')+'</span></div>';
  } else {
    html+='<div class="fm-empty">'+_t('Chua co du lieu','No data')+'</div>';
  }
  html+='</div>';

  /* AP distribution donut */
  html+='<div class="fm-chart"><h4 style="margin:0 0 12px">'+_t('Phan bo AP','AP Distribution')+'</h4>';
  var total=dist.HIGH+dist.MEDIUM+dist.LOW;
  if(total>0){
    var pHigh=Math.round((dist.HIGH/total)*100);
    var pMedium=Math.round((dist.MEDIUM/total)*100);
    var pLow=100-pHigh-pMedium;
    html+='<div class="fm-donut" style="background:conic-gradient(var(--red-light,#ef4444) 0% '+pHigh+'%, var(--amber-light,#f59e0b) '+pHigh+'% '+(pHigh+pMedium)+'%, var(--green-light,#22c55e) '+(pHigh+pMedium)+'% 100%)">';
    html+='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100px;height:100px;border-radius:50%;background:var(--surface,#fff);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.25rem">'+total+'</div>';
    html+='</div>';
    html+='<div class="fm-legend">';
    html+='<span><span class="fm-legend-dot" style="background:var(--red-light,#ef4444)"></span>HIGH: '+dist.HIGH+'</span>';
    html+='<span><span class="fm-legend-dot" style="background:var(--amber-light,#f59e0b)"></span>MEDIUM: '+dist.MEDIUM+'</span>';
    html+='<span><span class="fm-legend-dot" style="background:var(--green-light,#22c55e)"></span>LOW: '+dist.LOW+'</span>';
    html+='</div>';
  } else {
    html+='<div class="fm-empty">'+_t('Chua co du lieu','No data')+'</div>';
  }
  html+='</div></div>';

  /* trend over revisions */
  if(trend.length){
    html+='<div class="fm-chart"><h4 style="margin:0 0 12px">'+_t('Xu huong RPN theo phien ban','RPN Trend by Revision')+'</h4>';
    var maxT=1; trend.forEach(function(t){ if(t.avg_rpn>maxT) maxT=t.avg_rpn; });
    html+='<div class="fm-bar-row">';
    trend.forEach(function(t){
      var h=Math.round((t.avg_rpn/maxT)*160);
      html+='<div style="display:flex;flex-direction:column;align-items:center;flex:1">'
        +'<div class="fm-bar" style="height:'+h+'px;background:var(--brand,#1565c0)"></div>'
        +'<div class="fm-bar-label">Rev '+_esc(t.revision)+'</div>'
        +'</div>';
    });
    html+='</div></div>';
  }
  return html;
}

/* -- inline forms --------------------------------------------- */
function _showAddFmForm(){
  var el=state.container.querySelector('#fm-add-fm-form');
  if(!el) return;
  el.innerHTML='<div class="fm-inline-form"><h4 style="margin:0 0 10px">'+_t('Them Failure Mode','Add Failure Mode')+'</h4>'
    +'<div class="fm-form">'
    +'<div><label>'+_t('Buoc QT','Process Step')+'</label><input type="text" id="fm-ff-step"></div>'
    +'<div><label>'+_t('Chuc nang','Function')+'</label><input type="text" id="fm-ff-func"></div>'
    +'<div><label>'+_t('Failure Mode','Failure Mode')+'</label><input type="text" id="fm-ff-mode"></div>'
    +'<div><label>'+_t('Anh huong','Effect')+'</label><input type="text" id="fm-ff-effect"></div>'
    +'<div><label>'+_t('Nguyen nhan','Cause')+'</label><input type="text" id="fm-ff-cause"></div>'
    +'<div style="display:flex;gap:8px">'
      +'<div><label>S (1-10)</label><input type="number" id="fm-ff-s" min="1" max="10" value="1" style="width:60px"></div>'
      +'<div><label>O (1-10)</label><input type="number" id="fm-ff-o" min="1" max="10" value="1" style="width:60px"></div>'
      +'<div><label>D (1-10)</label><input type="number" id="fm-ff-d" min="1" max="10" value="1" style="width:60px"></div>'
    +'</div>'
    +'<div><label>'+_t('Ngan ngua','Prevention')+'</label><input type="text" id="fm-ff-prev"></div>'
    +'<div><label>'+_t('Phat hien','Detection')+'</label><input type="text" id="fm-ff-det"></div>'
    +'</div>'
    +'<div style="margin-top:10px;display:flex;gap:8px">'
    +'<button class="fm-btn fm-btn-primary" data-action="submit-fm">'+_t('Luu','Save')+'</button>'
    +'<button class="fm-btn fm-btn-secondary" data-action="cancel-fm-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

function _showAddCharForm(){
  var el=state.container.querySelector('#fm-add-char-form');
  if(!el) return;
  el.innerHTML='<div class="fm-inline-form"><h4 style="margin:0 0 10px">'+_t('Them dac tinh','Add Characteristic')+'</h4>'
    +'<div class="fm-form">'
    +'<div><label>'+_t('Buoc QT','Process Step')+'</label><input type="text" id="fm-fc-step"></div>'
    +'<div><label>'+_t('Dac tinh','Characteristic')+'</label><input type="text" id="fm-fc-char"></div>'
    +'<div><label>'+_t('Phan loai','Classification')+'</label><select id="fm-fc-class"><option value="">-</option>';
  Object.keys(CLASSIFICATION).forEach(function(k){ el=el; }); // noop, build inline
  var classOpts='<option value="">-</option>';
  Object.keys(CLASSIFICATION).forEach(function(k){ classOpts+='<option value="'+k+'">'+k+'</option>'; });
  el=state.container.querySelector('#fm-add-char-form');
  el.innerHTML='<div class="fm-inline-form"><h4 style="margin:0 0 10px">'+_t('Them dac tinh','Add Characteristic')+'</h4>'
    +'<div class="fm-form">'
    +'<div><label>'+_t('Buoc QT','Process Step')+'</label><input type="text" id="fm-fc-step"></div>'
    +'<div><label>'+_t('Dac tinh','Characteristic')+'</label><input type="text" id="fm-fc-char"></div>'
    +'<div><label>'+_t('Phan loai','Classification')+'</label><select id="fm-fc-class">'+classOpts+'</select></div>'
    +'<div><label>'+_t('Spec SP','Product Spec')+'</label><input type="text" id="fm-fc-pspec"></div>'
    +'<div><label>'+_t('Spec QT','Process Spec')+'</label><input type="text" id="fm-fc-qspec"></div>'
    +'<div><label>'+_t('Phuong phap','Method')+'</label><input type="text" id="fm-fc-method"></div>'
    +'<div><label>'+_t('Co mau','Sample Size')+'</label><input type="text" id="fm-fc-size"></div>'
    +'<div><label>'+_t('Tan suat','Frequency')+'</label><input type="text" id="fm-fc-freq"></div>'
    +'<div><label>'+_t('Kiem soat','Control')+'</label><input type="text" id="fm-fc-ctrl"></div>'
    +'<div><label>'+_t('Phan ung','Reaction Plan')+'</label><input type="text" id="fm-fc-react"></div>'
    +'</div>'
    +'<div style="margin-top:10px;display:flex;gap:8px">'
    +'<button class="fm-btn fm-btn-primary" data-action="submit-char">'+_t('Luu','Save')+'</button>'
    +'<button class="fm-btn fm-btn-secondary" data-action="cancel-char-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

function _showCompleteActionForm(actionId){
  var el=state.container.querySelector('#fm-complete-action-form');
  if(!el){
    /* inject a form area after the actions table */
    var wrap=document.createElement('div');
    wrap.id='fm-complete-action-form';
    var tbl=state.container.querySelector('.fm-table');
    if(tbl) tbl.parentNode.insertBefore(wrap, tbl.nextSibling);
    el=wrap;
  }
  el.innerHTML='<div class="fm-inline-form"><h4 style="margin:0 0 10px">'+_t('Hoan thanh hanh dong','Complete Action')+' #'+_esc(actionId)+'</h4>'
    +'<div class="fm-form">'
    +'<div><label>'+_t('S moi','New Severity')+' (1-10)</label><input type="number" id="fm-fa-s" min="1" max="10" value="1"></div>'
    +'<div><label>'+_t('O moi','New Occurrence')+' (1-10)</label><input type="number" id="fm-fa-o" min="1" max="10" value="1"></div>'
    +'<div><label>'+_t('D moi','New Detection')+' (1-10)</label><input type="number" id="fm-fa-d" min="1" max="10" value="1"></div>'
    +'</div>'
    +'<div style="margin-top:10px;display:flex;gap:8px">'
    +'<button class="fm-btn fm-btn-primary" data-action="submit-complete-action" data-id="'+_esc(actionId)+'">'+_t('Xac nhan','Confirm')+'</button>'
    +'<button class="fm-btn fm-btn-secondary" data-action="cancel-complete-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

/* -- data loading --------------------------------------------- */
function _loadFmeas(){
  state.loading=true; _paint();
  _api('fmea_list', state.filters).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.fmeas=r.fmeas||[];
      state.actions=r.actions||[];
      state.controlPlans=r.control_plans||[];
      state.rpnData=r.rpn_data||{};
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadFmeaDetail(id){
  state.loading=true; _paint();
  _api('fmea_detail', {id:id}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.selectedFmea=r.fmea||null;
      state.failureModes=r.failure_modes||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadCpDetail(id){
  state.loading=true; _paint();
  _api('cp_detail', {id:id}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.selectedCp=r.control_plan||null;
      state.cpCharacteristics=r.characteristics||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

/* -- main paint ----------------------------------------------- */
function _paint(){
  if(!state.container) return;
  var html='<div class="fm">';
  html+='<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<span style="font-size:1.2em">⚠️</span>'
    +'<div style="flex:1;min-width:180px"><b style="color:#b45309">'+_t('Module này đã được hợp nhất vào EQMS Suite','This module has been merged into EQMS Suite')+'</b>'
    +'<div style="font-size:0.85em;color:#78716c;margin-top:2px">'+_t('Dùng EQMS Suite → Quản lý Rủi ro & FMEA thay thế.','Use EQMS Suite → Risk Management & FMEA instead.')+'</div></div>'
    +'<button onclick="window.navigateTo&&navigateTo(\'eqms\')" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600;white-space:nowrap">'+_t('Mở EQMS Suite →','Open EQMS Suite →')+'</button>'
    +'</div>';
  html+='<div class="fm-tabs">';
  TABS.forEach(function(tab){
    var hidden=(tab.key==='detail'&&!state.selectedFmea)||(tab.key==='cp_detail'&&!state.selectedCp);
    if(hidden) return;
    html+='<div class="fm-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="fm-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'list':      html+=_renderListTab(); break;
      case 'detail':    html+=_renderDetailTab(); break;
      case 'add':       html+=_renderAddTab(); break;
      case 'actions':   html+=_renderActionsTab(); break;
      case 'cp_list':   html+=_renderCpListTab(); break;
      case 'cp_detail': html+=_renderCpDetailTab(); break;
      case 'analytics': html+=_renderAnalyticsTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
}

/* -- event delegation ----------------------------------------- */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab'); _paint(); break;
      case 'go-list':
        state.activeTab='list'; state.selectedFmea=null; _paint(); break;
      case 'go-add':
        state.selectedFmea=null; state.activeTab='add'; _paint(); break;
      case 'go-cp-list':
        state.activeTab='cp_list'; state.selectedCp=null; _paint(); break;
      case 'select-fmea':
        _loadFmeaDetail(t.getAttribute('data-id'));
        state.activeTab='detail';
        break;
      case 'select-cp':
        _loadCpDetail(t.getAttribute('data-id'));
        state.activeTab='cp_detail';
        break;
      case 'add-fm':
        _showAddFmForm(); break;
      case 'cancel-fm-form':
        var fmForm=state.container.querySelector('#fm-add-fm-form');
        if(fmForm) fmForm.innerHTML='';
        break;
      case 'submit-fm':
        if(!state.selectedFmea) break;
        _api('fmea_add_failure_mode',{
          fmea_id:state.selectedFmea.id,
          process_step:(state.container.querySelector('#fm-ff-step')||{}).value||'',
          function_desc:(state.container.querySelector('#fm-ff-func')||{}).value||'',
          failure_mode:(state.container.querySelector('#fm-ff-mode')||{}).value||'',
          effect:(state.container.querySelector('#fm-ff-effect')||{}).value||'',
          cause:(state.container.querySelector('#fm-ff-cause')||{}).value||'',
          severity:parseInt((state.container.querySelector('#fm-ff-s')||{}).value)||1,
          occurrence:parseInt((state.container.querySelector('#fm-ff-o')||{}).value)||1,
          detection:parseInt((state.container.querySelector('#fm-ff-d')||{}).value)||1,
          prevention:(state.container.querySelector('#fm-ff-prev')||{}).value||'',
          detection_method:(state.container.querySelector('#fm-ff-det')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Da them','Added'),'success');_loadFmeaDetail(state.selectedFmea.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'add-char':
        _showAddCharForm(); break;
      case 'cancel-char-form':
        var chForm=state.container.querySelector('#fm-add-char-form');
        if(chForm) chForm.innerHTML='';
        break;
      case 'submit-char':
        if(!state.selectedCp) break;
        _api('cp_add_characteristic',{
          cp_id:state.selectedCp.id,
          process_step:(state.container.querySelector('#fm-fc-step')||{}).value||'',
          characteristic:(state.container.querySelector('#fm-fc-char')||{}).value||'',
          classification:(state.container.querySelector('#fm-fc-class')||{}).value||'',
          product_spec:(state.container.querySelector('#fm-fc-pspec')||{}).value||'',
          process_spec:(state.container.querySelector('#fm-fc-qspec')||{}).value||'',
          method:(state.container.querySelector('#fm-fc-method')||{}).value||'',
          sample_size:(state.container.querySelector('#fm-fc-size')||{}).value||'',
          frequency:(state.container.querySelector('#fm-fc-freq')||{}).value||'',
          control:(state.container.querySelector('#fm-fc-ctrl')||{}).value||'',
          reaction_plan:(state.container.querySelector('#fm-fc-react')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Da them','Added'),'success');_loadCpDetail(state.selectedCp.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'save-fmea':
        var payload={
          type:(state.container.querySelector('#fm-f-type')||{}).value||'pfmea',
          item:(state.container.querySelector('#fm-f-item')||{}).value||'',
          process_name:(state.container.querySelector('#fm-f-process')||{}).value||'',
          team_lead:(state.container.querySelector('#fm-f-lead')||{}).value||'',
          team_members:((state.container.querySelector('#fm-f-team')||{}).value||'').split(',').map(function(s){return s.trim();}).filter(Boolean),
          scope:(state.container.querySelector('#fm-f-scope')||{}).value||''
        };
        if(state.selectedFmea) payload.id=state.selectedFmea.id;
        _api('fmea_save', payload).then(function(r){
          if(r&&r.ok){_toast(_t('Da luu','Saved'),'success'); state.activeTab='list'; _loadFmeas();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'auto-gen-cp':
        _api('cp_auto_generate',{}).then(function(r){
          if(r&&r.ok){_toast(_t('Da tao Control Plan','Control Plan generated'),'success'); _loadFmeas();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'complete-action':
        _showCompleteActionForm(t.getAttribute('data-id'));
        break;
      case 'submit-complete-action':
        var aid=t.getAttribute('data-id');
        _api('fmea_complete_action',{
          id:aid,
          new_severity:parseInt((state.container.querySelector('#fm-fa-s')||{}).value)||1,
          new_occurrence:parseInt((state.container.querySelector('#fm-fa-o')||{}).value)||1,
          new_detection:parseInt((state.container.querySelector('#fm-fa-d')||{}).value)||1
        }).then(function(r){
          if(r&&r.ok){
            _toast(_t('Hoan thanh - AP da cap nhat','Completed - AP recalculated'),'success');
            _loadFmeas();
          } else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'cancel-complete-form':
        var cf=state.container.querySelector('#fm-complete-action-form');
        if(cf) cf.innerHTML='';
        break;
      case 'toggle-expand':
        var idx=t.getAttribute('data-idx');
        var row=state.container.querySelector('#fm-expand-'+idx);
        if(row) row.classList.toggle('open');
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; _paint(); return; }
    var af=e.target.getAttribute('data-actionfilter');
    if(af){ state.actionFilters[af]=e.target.value; _paint(); }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='item'){ state.filters.item=e.target.value; _paint(); }
  });
}

/* -- entry point ---------------------------------------------- */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='list';
  state.selectedFmea=null;
  state.selectedCp=null;
  _paint();
  _bind();
  _loadFmeas();
}

window._renderFmeaControlPlan = render;

})();

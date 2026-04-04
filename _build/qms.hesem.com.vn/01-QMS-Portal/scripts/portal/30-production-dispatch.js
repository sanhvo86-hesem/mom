/* ===================================================================
   30-production-dispatch.js
   HESEM QMS Portal - Production Dispatch & Timeline Module
   Gantt-style dispatch board, shift target creation, operator task
   reporting, shift summary dashboard, target list, shift settings.
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
function _fmtNum(v,dec){ if(v==null) return '0'; return Number(v).toFixed(dec!=null?dec:1); }
function _today(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _addDays(iso, n){ var d=new Date(iso); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function _shortDate(iso){ if(!iso) return ''; var p=iso.split('-'); return p[2]+'/'+p[1]; }
function _pct(a,b){ if(!b) return 0; return Math.round(a/b*1000)/10; }
function _achieveColor(pct){ if(pct>=100) return '#22c55e'; if(pct>=90) return '#16a34a'; if(pct>=70) return '#f59e0b'; return '#ef4444'; }
function _achieveBg(pct){ if(pct>=90) return 'rgba(34,197,94,.08)'; if(pct>=70) return 'rgba(245,158,11,.08)'; return 'rgba(239,68,68,.08)'; }

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'pd-styles';
var TABS = [
  { key:'timeline',  vi:'Dòng thời gian', en:'Timeline' },
  { key:'dispatch',  vi:'Phân công',      en:'Dispatch' },
  { key:'mytasks',   vi:'Lệnh của tôi',   en:'My Tasks' },
  { key:'summary',   vi:'Tổng hợp ca',    en:'Shift Summary' },
  { key:'list',      vi:'Danh sách',      en:'Target List' },
  { key:'settings',  vi:'Cài đặt',        en:'Settings' }
];

var SHIFTS = [
  { key:'morning',   vi:'Sáng',    en:'Morning',   start:'06:00', end:'14:00', color:'#fbbf24' },
  { key:'afternoon', vi:'Chiều',   en:'Afternoon', start:'14:00', end:'22:00', color:'#60a5fa' },
  { key:'night',     vi:'Đêm',     en:'Night',     start:'22:00', end:'06:00', color:'#818cf8' }
];

var STATUS_COLORS = {
  planned:     '#94a3b8',
  dispatched:  '#3b82f6',
  in_progress: '#f59e0b',
  completed:   '#10b981',
  cancelled:   '#ef4444'
};

var DEFECT_TYPES = [
  { key:'dimensional', vi:'Kich thuoc',  en:'Dimensional' },
  { key:'surface',     vi:'Be mat',      en:'Surface' },
  { key:'material',    vi:'Vat lieu',    en:'Material' },
  { key:'visual',      vi:'Ngoai quan',  en:'Visual' },
  { key:'burr',        vi:'Ba via',      en:'Burr' },
  { key:'thread',      vi:'Ren',         en:'Thread' },
  { key:'fod',         vi:'FOD',         en:'FOD' },
  { key:'other',       vi:'Khac',        en:'Other' }
];

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'timeline',
  targets: [],
  logs: {},
  dashboard: {},
  operatorTasks: [],
  selectedTarget: null,
  dateRange: { start: _today(), end: _addDays(_today(), 7) },
  filterMachine: '',
  filterOperator: '',
  filterStatus: 'all',
  /* dispatch form */
  machines: [],
  operators: [],
  openWOs: [],
  /* list pagination */
  listPage: 1,
  listTotal: 0,
  listSort: 'date',
  listDir: 'desc',
  listData: [],
  /* settings */
  shiftConfig: { morning:'06:00-14:00', afternoon:'14:00-22:00', night:'22:00-06:00', duration:480, breakTime:30 },
  /* ng detail expand */
  expandedNG: {},
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.pd{padding:16px;max-width:1400px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    /* tabs */
    '.pd-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}',
    '.pd-tab{padding:8px 16px;font-size:.82rem;font-weight:600;cursor:pointer;border-radius:8px;border:2px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);transition:all .15s}',
    '.pd-tab:hover{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.pd-tab.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:#fff}',
    /* controls bar */
    '.pd-controls{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center}',
    '.pd-controls input,.pd-controls select{padding:7px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem;background:var(--surface,#fff)}',
    '.pd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 18px;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;min-height:38px;transition:background .15s}',
    '.pd-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.pd-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.pd-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.pd-btn-success{background:#22c55e;color:#fff}',
    '.pd-btn-success:hover{background:#16a34a}',
    '.pd-btn-danger{background:#ef4444;color:#fff}',
    '.pd-btn-sm{padding:5px 12px;font-size:.78rem;min-height:30px}',
    '.pd-btn-lg{padding:14px 28px;font-size:1.05rem;min-height:56px;border-radius:12px}',
    '.pd-btn-full{width:100%}',
    /* KPI row */
    '.pd-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}',
    '.pd-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;text-align:center}',
    '.pd-kpi-val{font-size:1.5rem;font-weight:800;color:var(--brand,#1565c0)}',
    '.pd-kpi-label{font-size:.72rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    /* Gantt timeline */
    '.pd-gantt-wrap{overflow-x:auto;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--surface,#fff)}',
    '.pd-gantt{border-collapse:collapse;min-width:100%;font-size:.78rem}',
    '.pd-gantt th,.pd-gantt td{border:1px solid var(--border,#e2e8f0);padding:0;text-align:center;vertical-align:middle}',
    '.pd-gantt th{background:var(--bg-alt,#f8fafc);font-weight:700;padding:6px 4px;position:sticky;top:0;z-index:2}',
    '.pd-gantt th.pd-machine-hdr{position:sticky;left:0;z-index:3;background:var(--bg-alt,#f8fafc);min-width:100px;text-align:left;padding-left:10px}',
    '.pd-gantt td.pd-machine-cell{position:sticky;left:0;z-index:1;background:var(--surface,#fff);font-weight:700;text-align:left;padding:6px 10px;min-width:100px;white-space:nowrap}',
    '.pd-gantt td.pd-shift-cell{min-width:180px;height:48px;padding:3px;position:relative}',
    '.pd-bar{border-radius:5px;padding:3px 6px;font-size:.7rem;color:#fff;display:flex;align-items:center;gap:4px;height:100%;min-height:40px;overflow:hidden;position:relative;cursor:pointer;transition:opacity .15s}',
    '.pd-bar:hover{opacity:.88}',
    '.pd-bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:5px;opacity:.25;pointer-events:none}',
    '.pd-bar-text{position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}',
    '.pd-idle{color:var(--text-secondary,#94a3b8);font-size:.72rem;display:flex;align-items:center;justify-content:center;height:100%}',
    /* date header grouping */
    '.pd-gantt .pd-date-hdr{border-bottom:2px solid var(--border,#e2e8f0)}',
    /* table */
    '.pd-table{width:100%;border-collapse:collapse;font-size:.82rem}',
    '.pd-table th,.pd-table td{padding:8px 10px;border-bottom:1px solid var(--border,#e2e8f0);text-align:left}',
    '.pd-table th{background:var(--bg-alt,#f8fafc);font-weight:700;position:sticky;top:0;cursor:pointer;user-select:none}',
    '.pd-table tr:hover td{background:rgba(59,130,246,.03)}',
    '.pd-table .pd-sort-active{color:var(--brand,#1565c0)}',
    /* form */
    '.pd-form{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:20px;margin-bottom:20px}',
    '.pd-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}',
    '.pd-form-row.full{grid-template-columns:1fr}',
    '.pd-label{display:block;font-size:.8rem;font-weight:700;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.pd-input{width:100%;height:40px;padding:0 12px;border:1px solid var(--border,#d1d5db);border-radius:8px;font-size:.88rem;background:var(--surface,#fff);box-sizing:border-box}',
    '.pd-input:focus{border-color:var(--brand,#1565c0);outline:none}',
    '.pd-select{width:100%;height:40px;padding:0 12px;border:1px solid var(--border,#d1d5db);border-radius:8px;font-size:.88rem;background:var(--surface,#fff);box-sizing:border-box}',
    '.pd-textarea{width:100%;min-height:60px;padding:8px 12px;border:1px solid var(--border,#d1d5db);border-radius:8px;font-size:.88rem;resize:vertical;box-sizing:border-box}',
    '.pd-calc-box{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;font-size:1rem;font-weight:700;color:#166534;margin-top:4px}',
    /* operator task cards (mobile-first) */
    '.pd-task-card{background:var(--surface,#fff);border:2px solid var(--border,#e2e8f0);border-radius:14px;padding:16px;margin-bottom:14px;transition:box-shadow .15s}',
    '.pd-task-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.06)}',
    '.pd-task-header{font-weight:700;font-size:1rem;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.pd-task-meta{font-size:.88rem;color:var(--text-secondary,#64748b);margin-bottom:10px;line-height:1.5}',
    '.pd-qty-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}',
    '.pd-qty-box{text-align:center}',
    '.pd-qty-label{font-size:.75rem;font-weight:700;color:var(--text-secondary,#64748b);margin-bottom:4px}',
    '.pd-qty-input{width:100%;height:56px;text-align:center;font-size:32px;font-weight:800;font-family:"SF Mono",Monaco,Consolas,monospace;border:2px solid var(--border,#d1d5db);border-radius:10px;background:var(--surface,#fff);color:var(--text,#0f172a);box-sizing:border-box}',
    '.pd-qty-input:focus{border-color:var(--brand,#1565c0);outline:none}',
    '.pd-progress-wrap{margin-bottom:14px}',
    '.pd-progress-bar{height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden}',
    '.pd-progress-fill{height:100%;border-radius:6px;transition:width .3s}',
    '.pd-progress-text{font-size:.82rem;font-weight:700;margin-top:4px;text-align:right}',
    '.pd-task-actions{display:flex;gap:10px;flex-wrap:wrap}',
    /* NG detail expand */
    '.pd-ng-detail{background:var(--bg-alt,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;margin-top:10px;display:none}',
    '.pd-ng-detail.open{display:block}',
    '.pd-ng-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.pd-ng-item{display:flex;align-items:center;gap:8px;font-size:.82rem}',
    '.pd-ng-item input{width:60px;height:36px;text-align:center;font-size:1rem;font-weight:700;border:1px solid var(--border,#d1d5db);border-radius:6px}',
    /* shift badge */
    '.pd-shift-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700;color:#fff}',
    /* status badge */
    '.pd-status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700;color:#fff}',
    /* pagination */
    '.pd-pager{display:flex;gap:6px;justify-content:center;align-items:center;margin-top:16px;font-size:.85rem}',
    /* empty */
    '.pd-empty{text-align:center;padding:40px 20px;color:var(--text-secondary,#64748b);font-size:.9rem}',
    /* settings card */
    '.pd-setting-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;margin-bottom:14px}',
    '.pd-setting-card h3{margin:0 0 10px;font-size:1rem}',
    '.pd-setting-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:.88rem}',
    '.pd-setting-row label{min-width:160px;font-weight:600}',
    /* responsive mobile */
    '@media(max-width:640px){',
    '  .pd-form-row{grid-template-columns:1fr}',
    '  .pd-qty-row{grid-template-columns:1fr 1fr 1fr}',
    '  .pd-controls{flex-direction:column;align-items:stretch}',
    '  .pd-gantt td.pd-shift-cell{min-width:140px}',
    '}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ============================================================= */
/* -- PAINT (main render) -------------------------------------- */
/* ============================================================= */
function _paint(){
  if(!state.container) return;
  var h='<div class="pd">';
  /* tabs */
  h+='<div class="pd-tabs">';
  TABS.forEach(function(tab){
    h+='<div class="pd-tab'+(state.activeTab===tab.key?' active':'')+'" data-tab="'+tab.key+'">'+_t(tab.vi,tab.en)+'</div>';
  });
  h+='</div>';
  /* tab body */
  h+='<div class="pd-body">';
  switch(state.activeTab){
    case 'timeline':  h+=_renderTimeline(); break;
    case 'dispatch':  h+=_renderDispatch(); break;
    case 'mytasks':   h+=_renderMyTasks(); break;
    case 'summary':   h+=_renderSummary(); break;
    case 'list':      h+=_renderList(); break;
    case 'settings':  h+=_renderSettings(); break;
  }
  h+='</div></div>';
  state.container.innerHTML=h;
}

/* ============================================================= */
/* -- TAB 1: TIMELINE (Gantt) ---------------------------------- */
/* ============================================================= */
function _renderTimeline(){
  var h='';
  /* controls */
  h+='<div class="pd-controls">';
  h+='<label style="font-size:.82rem;font-weight:600">'+_t('Từ','From')+'</label>';
  h+='<input type="date" id="pd-date-start" value="'+_esc(state.dateRange.start)+'">';
  h+='<label style="font-size:.82rem;font-weight:600">'+_t('Đến','To')+'</label>';
  h+='<input type="date" id="pd-date-end" value="'+_esc(state.dateRange.end)+'">';
  h+='<select id="pd-filter-machine"><option value="">'+_t('Tất cả máy','All Machines')+'</option>';
  (state.machines||[]).forEach(function(m){ h+='<option value="'+_esc(m.id)+'"'+(state.filterMachine==m.id?' selected':'')+'>'+_esc(m.name)+'</option>'; });
  h+='</select>';
  h+='<select id="pd-filter-status"><option value="all">'+_t('Tất cả','All')+'</option>';
  Object.keys(STATUS_COLORS).forEach(function(s){ h+='<option value="'+s+'"'+(state.filterStatus===s?' selected':'')+'>'+_esc(s)+'</option>'; });
  h+='</select>';
  h+='<button class="pd-btn pd-btn-secondary" data-action="today">'+_t('Hôm nay','Today')+'</button>';
  h+='<button class="pd-btn pd-btn-primary" data-action="refresh-timeline">'+_t('Làm mới','Refresh')+'</button>';
  h+='</div>';

  if(state.loading) return h+'<div class="pd-empty">'+_t("Đang tải...","Loading...")+'</div>';

  /* build date/shift columns */
  var dates=[];
  var cur=state.dateRange.start;
  while(cur<=state.dateRange.end){ dates.push(cur); cur=_addDays(cur,1); }
  if(!dates.length) return h+'<div class="pd-empty">'+_t('Chọn khoảng ngày','Select date range')+'</div>';

  /* collect machines from targets */
  var machineMap={};
  (state.targets||[]).forEach(function(t){
    if(state.filterMachine && t.machine_id!=state.filterMachine) return;
    if(state.filterStatus!=='all' && t.status!==state.filterStatus) return;
    if(!machineMap[t.machine_id]) machineMap[t.machine_id]={ id:t.machine_id, name:t.machine_name||t.machine_id, targets:[] };
    machineMap[t.machine_id].targets.push(t);
  });
  /* also add machines from state.machines that have no targets */
  (state.machines||[]).forEach(function(m){
    if(state.filterMachine && m.id!=state.filterMachine) return;
    if(!machineMap[m.id]) machineMap[m.id]={ id:m.id, name:m.name||m.id, targets:[] };
  });
  var machineList=Object.keys(machineMap).sort().map(function(k){ return machineMap[k]; });

  if(!machineList.length) return h+'<div class="pd-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  /* Gantt table */
  h+='<div class="pd-gantt-wrap"><table class="pd-gantt">';
  /* header row 1: dates */
  h+='<tr><th class="pd-machine-hdr" rowspan="2">'+_t('Máy','Machine')+'</th>';
  dates.forEach(function(d){ h+='<th class="pd-date-hdr" colspan="3">'+_shortDate(d)+'</th>'; });
  h+='</tr>';
  /* header row 2: shifts */
  h+='<tr>';
  dates.forEach(function(){
    SHIFTS.forEach(function(sh){ h+='<th style="font-size:.7rem;color:'+sh.color+'">'+_t(sh.vi,sh.en)+'</th>'; });
  });
  h+='</tr>';
  /* rows */
  machineList.forEach(function(mac){
    h+='<tr><td class="pd-machine-cell">'+_esc(mac.name)+'</td>';
    dates.forEach(function(d){
      SHIFTS.forEach(function(sh){
        var cell=_findTarget(mac.targets, d, sh.key);
        h+='<td class="pd-shift-cell">';
        if(cell){
          var sc=STATUS_COLORS[cell.status]||'#94a3b8';
          var tgt=cell.target_quantity||cell.target_qty||0;
          var good=cell.qty_good||0;
          // Check production log for actual data
          var log=state.logs&&state.logs[cell.target_id];
          if(log){ good=log.quantity_good||0; }
          var pct=_pct(good, tgt);
          var fc=_achieveColor(pct);
          h+='<div class="pd-bar" style="background:'+sc+'" data-action="view-target" data-id="'+_esc(cell.target_id||cell.id||'')+'" title="'+_esc(cell.wo_number)+' | '+_esc(cell.item_id||cell.part_number||'')+' | '+pct+'%">';
          h+='<div class="pd-bar-fill" style="width:'+(Math.min(pct,100))+'%;background:'+fc+'"></div>';
          h+='<span class="pd-bar-text">'+_esc(cell.wo_number||'')+' | '+_esc(cell.item_id||cell.item_description||'')+' | '+tgt+' pcs</span>';
          h+='</div>';
        } else {
          h+='<div class="pd-idle">-</div>';
        }
        h+='</td>';
      });
    });
    h+='</tr>';
  });
  h+='</table></div>';
  /* legend */
  h+='<div style="display:flex;gap:14px;margin-top:10px;flex-wrap:wrap;font-size:.75rem">';
  Object.keys(STATUS_COLORS).forEach(function(s){
    h+='<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:14px;height:14px;border-radius:3px;background:'+STATUS_COLORS[s]+';display:inline-block"></span>'+_esc(s)+'</span>';
  });
  h+='</div>';
  return h;
}

function _findTarget(targets, date, shiftKey){
  for(var i=0;i<targets.length;i++){
    var t=targets[i];
    if((t.shift_date||t.target_date)===date && (t.shift_code||t.shift)===shiftKey) return t;
  }
  return null;
}

/* ============================================================= */
/* -- TAB 2: DISPATCH (Create & Assign) ------------------------ */
/* ============================================================= */
function _renderDispatch(){
  var h='';
  h+='<h3 style="margin:0 0 14px;font-size:1.1rem">'+_t('Tạo lệnh sản xuất','Create Shift Target')+'</h3>';
  h+='<div class="pd-form">';
  h+='<div class="pd-form-row">';
  /* WO */
  h+='<div><label class="pd-label">'+_t('Lệnh sản xuất (WO)','Work Order')+'</label>';
  h+='<select class="pd-select" id="pd-wo">';
  h+='<option value="">-- '+_t('Chọn WO','Select WO')+' --</option>';
  (state.openWOs||[]).forEach(function(w){ h+='<option value="'+_esc(w.id)+'">'+_esc(w.wo_number)+' - '+_esc(w.part_number||'')+' - '+_esc(w.part_name||'')+'</option>'; });
  h+='</select></div>';
  /* Machine */
  h+='<div><label class="pd-label">'+_t('Máy','Machine')+'</label>';
  h+='<select class="pd-select" id="pd-machine">';
  h+='<option value="">-- '+_t('Chọn máy','Select Machine')+' --</option>';
  (state.machines||[]).forEach(function(m){ h+='<option value="'+_esc(m.id)+'">'+_esc(m.name)+'</option>'; });
  h+='</select></div>';
  h+='</div>';

  h+='<div class="pd-form-row">';
  /* Operator */
  h+='<div><label class="pd-label">'+_t('Người vận hành','Operator')+'</label>';
  h+='<select class="pd-select" id="pd-operator">';
  h+='<option value="">-- '+_t('Chọn NVH','Select Operator')+' --</option>';
  (state.operators||[]).forEach(function(o){ h+='<option value="'+_esc(o.id)+'">'+_esc(o.name)+'</option>'; });
  h+='</select></div>';
  /* Shift */
  h+='<div><label class="pd-label">'+_t('Ca','Shift')+'</label>';
  h+='<select class="pd-select" id="pd-shift">';
  SHIFTS.forEach(function(sh){ h+='<option value="'+sh.key+'">'+_t(sh.vi,sh.en)+' ('+sh.start+' - '+sh.end+')</option>'; });
  h+='</select></div>';
  h+='</div>';

  h+='<div class="pd-form-row">';
  /* Date */
  h+='<div><label class="pd-label">'+_t('Ngày','Date')+'</label>';
  h+='<input type="date" class="pd-input" id="pd-target-date" value="'+_today()+'"></div>';
  /* Priority */
  h+='<div><label class="pd-label">'+_t('Độ ưu tiên','Priority')+' <span id="pd-priority-val">50</span>/100</label>';
  h+='<input type="range" min="1" max="100" value="50" id="pd-priority" style="width:100%;height:40px"></div>';
  h+='</div>';

  h+='<div class="pd-form-row">';
  /* Cycle time */
  h+='<div><label class="pd-label">'+_t('Thời gian chu kỳ','Cycle Time')+' ('+_t('phút/pc','min/pc')+')</label>';
  h+='<input type="number" step="0.1" min="0.1" class="pd-input" id="pd-cycle-time" placeholder="4.5"></div>';
  /* Setup time */
  h+='<div><label class="pd-label">'+_t('Thời gian setup','Setup Time')+' ('+_t('phút','min')+')</label>';
  h+='<input type="number" step="1" min="0" class="pd-input" id="pd-setup-time" placeholder="30" value="30"></div>';
  h+='</div>';

  h+='<div class="pd-form-row">';
  /* Shift duration */
  h+='<div><label class="pd-label">'+_t('Thời lượng ca','Shift Duration')+' ('+_t('phút','min')+')</label>';
  h+='<input type="number" class="pd-input" id="pd-shift-duration" value="480"></div>';
  /* Auto-calculated target */
  h+='<div><label class="pd-label">'+_t('Định mức (tự động)','Target Qty (auto)')+'</label>';
  h+='<div class="pd-calc-box" id="pd-auto-target">-- pcs</div></div>';
  h+='</div>';

  h+='<div class="pd-form-row full">';
  h+='<div><label class="pd-label">'+_t('Ghi chú','Notes')+'</label>';
  h+='<textarea class="pd-textarea" id="pd-notes" placeholder="'+_t("Ghi chú thêm...","Additional notes...")+'"></textarea></div>';
  h+='</div>';

  h+='<button class="pd-btn pd-btn-primary" data-action="create-target" style="margin-top:6px">'+_t('Tạo lệnh','Create Target')+'</button>';
  h+='</div>';

  /* today's planned targets */
  h+='<h3 style="margin:14px 0 10px;font-size:1rem">'+_t('Lệnh hôm nay (chưa gửi)','Today\'s Planned Targets')+'</h3>';
  var planned=(state.targets||[]).filter(function(t){ return t.target_date===_today() && t.status==='planned'; });
  if(!planned.length){
    h+='<div class="pd-empty">'+_t('Không có lệnh nào','No targets')+'</div>';
  } else {
    h+='<table class="pd-table"><thead><tr>';
    h+='<th>'+_t('Ca','Shift')+'</th><th>'+_t('Máy','Machine')+'</th><th>WO</th><th>Part</th><th>'+_t('NVH','Operator')+'</th><th>'+_t('Định mức','Target')+'</th><th></th>';
    h+='</tr></thead><tbody>';
    planned.forEach(function(t){
      var sh=SHIFTS.find(function(s){ return s.key===t.shift; })||SHIFTS[0];
      h+='<tr>';
      h+='<td><span class="pd-shift-badge" style="background:'+sh.color+'">'+_t(sh.vi,sh.en)+'</span></td>';
      h+='<td>'+_esc(t.machine_name||t.machine_id)+'</td>';
      h+='<td>'+_esc(t.wo_number)+'</td>';
      h+='<td>'+_esc(t.part_number)+'</td>';
      h+='<td>'+_esc(t.operator_name)+'</td>';
      h+='<td>'+_esc(t.target_qty)+' pcs</td>';
      h+='<td><button class="pd-btn pd-btn-success pd-btn-sm" data-action="dispatch-send" data-id="'+_esc(t.id)+'">'+_t('Gửi lệnh','Dispatch')+'</button></td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
  }
  return h;
}

/* ============================================================= */
/* -- TAB 3: MY TASKS (Operator mobile view) ------------------- */
/* ============================================================= */
function _renderMyTasks(){
  var h='';
  var shift=_currentShift();
  h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">';
  h+='<h3 style="margin:0;font-size:1.15rem">'+_t('Lệnh sản xuất hôm nay','Today\'s Production Orders')+'</h3>';
  h+='<span class="pd-shift-badge" style="background:'+(shift.color||'#64748b')+'">'+_t(shift.vi,shift.en)+'</span>';
  h+='<button class="pd-btn pd-btn-secondary pd-btn-sm" data-action="refresh-mytasks">'+_t('Làm mới','Refresh')+'</button>';
  h+='</div>';

  if(state.loading) return h+'<div class="pd-empty">'+_t("Đang tải...","Loading...")+'</div>';
  if(!(state.operatorTasks||[]).length) return h+'<div class="pd-empty">'+_t('Không có lệnh nào','No tasks assigned')+'</div>';

  state.operatorTasks.forEach(function(task, idx){
    var target=task.target_quantity||task.target_qty||0;
    var log=task.production_log;
    var good=log?(log.quantity_good||0):(task.qty_good||0);
    var ng=log?(log.quantity_ng||0):(task.qty_ng||0);
    var rework=log?(log.quantity_rework||0):(task.qty_rework||0);
    var pct=_pct(good, target);
    var pc=_achieveColor(pct);
    var shInfo=SHIFTS.find(function(s){ return s.key===(task.shift_code||task.shift); })||SHIFTS[0];

    h+='<div class="pd-task-card" data-task-idx="'+idx+'">';
    /* header */
    h+='<div class="pd-task-header">';
    h+='<span style="background:var(--brand,#1565c0);color:#fff;padding:2px 8px;border-radius:4px;font-size:.78rem">'+(idx+1)+'</span> ';
    h+=_esc(task.wo_number)+' &middot; '+_esc(task.machine_id)+' &middot; ';
    h+='<span class="pd-shift-badge" style="background:'+shInfo.color+'">Ca '+_t(shInfo.vi,shInfo.en)+'</span>';
    h+='</div>';
    /* meta */
    h+='<div class="pd-task-meta">';
    h+='Part: <b>'+_esc(task.item_id||task.part_number||'')+' '+_esc(task.item_description||task.part_name||'')+'</b><br>';
    h+=_t('Định mức','Target')+': <b>'+target+' pcs</b> | Cycle: <b>'+_fmtNum(task.cycle_time_minutes||task.cycle_time||0,1)+' '+_t('phút/pc','min/pc')+'</b>';
    h+='</div>';

    /* quantity inputs */
    h+='<div class="pd-qty-row">';
    h+='<div class="pd-qty-box"><div class="pd-qty-label" style="color:#16a34a">'+_t('SL Tốt','Good')+'</div>';
    h+='<input type="number" min="0" class="pd-qty-input" id="pd-good-'+idx+'" value="'+(good||'')+'" data-field="qty_good" data-idx="'+idx+'"></div>';
    h+='<div class="pd-qty-box"><div class="pd-qty-label" style="color:#ef4444">'+_t('SL NG','NG')+'</div>';
    h+='<input type="number" min="0" class="pd-qty-input" id="pd-ng-'+idx+'" value="'+(ng||'')+'" data-field="qty_ng" data-idx="'+idx+'"></div>';
    h+='<div class="pd-qty-box"><div class="pd-qty-label" style="color:#f59e0b">'+_t('SL Rework','Rework')+'</div>';
    h+='<input type="number" min="0" class="pd-qty-input" id="pd-rework-'+idx+'" value="'+(rework||'')+'" data-field="qty_rework" data-idx="'+idx+'"></div>';
    h+='</div>';

    /* progress bar */
    var barW=Math.min(pct,100);
    h+='<div class="pd-progress-wrap">';
    h+='<div class="pd-progress-bar"><div class="pd-progress-fill" style="width:'+barW+'%;background:'+pc+'"></div></div>';
    h+='<div class="pd-progress-text" style="color:'+pc+'">'+(pct>=100?'\uD83C\uDF89 ':'')+pct+'% ('+good+'/'+target+')</div>';
    h+='</div>';

    /* action buttons */
    h+='<div class="pd-task-actions">';
    h+='<button class="pd-btn pd-btn-primary pd-btn-lg" style="flex:1" data-action="report-production" data-idx="'+idx+'">'+_t('BÁO CÁO SẢN LƯỢNG','REPORT PRODUCTION')+'</button>';
    h+='<button class="pd-btn pd-btn-secondary pd-btn-lg" data-action="toggle-ng-detail" data-idx="'+idx+'">'+_t('NG CHI TIET','NG DETAIL')+'</button>';
    h+='</div>';

    /* NG detail (expandable) */
    h+='<div class="pd-ng-detail'+(state.expandedNG[idx]?' open':'')+'" id="pd-ng-detail-'+idx+'">';
    h+='<div style="font-weight:700;margin-bottom:8px;font-size:.88rem">'+_t('Phan loai NG','NG Breakdown')+'</div>';
    h+='<div class="pd-ng-grid">';
    DEFECT_TYPES.forEach(function(dt){
      var v=(task.ng_breakdown&&task.ng_breakdown[dt.key])||'';
      h+='<div class="pd-ng-item"><label style="min-width:80px">'+_t(dt.vi,dt.en)+'</label>';
      h+='<input type="number" min="0" value="'+v+'" data-ng-type="'+dt.key+'" data-idx="'+idx+'"></div>';
    });
    h+='</div>';
    h+='<div style="margin-top:8px;font-size:.78rem;color:var(--text-secondary,#64748b)">'+_t('Tong NG phai bang SL NG o tren','Total must equal NG quantity above')+'</div>';
    h+='</div>';
    h+='</div>';
  });
  return h;
}

function _currentShift(){
  var now=new Date();
  var hr=now.getHours();
  if(hr>=6 && hr<14) return SHIFTS[0];
  if(hr>=14 && hr<22) return SHIFTS[1];
  return SHIFTS[2];
}

/* ============================================================= */
/* -- TAB 4: SHIFT SUMMARY ------------------------------------- */
/* ============================================================= */
function _renderSummary(){
  var h='';
  h+='<div class="pd-controls">';
  h+='<label style="font-size:.82rem;font-weight:600">'+_t('Ngày','Date')+'</label>';
  h+='<input type="date" id="pd-summary-date" value="'+_today()+'">';
  h+='<button class="pd-btn pd-btn-primary" data-action="refresh-summary">'+_t('Làm mới','Refresh')+'</button>';
  h+='</div>';

  if(state.loading) return h+'<div class="pd-empty">'+_t("Đang tải...","Loading...")+'</div>';
  var d=state.dashboard||{};

  /* KPI cards */
  h+='<div class="pd-kpi-row">';
  h+=_kpi(_t('Tổng lệnh','Total Orders'), d.total_orders||0);
  h+=_kpi(_t('Đang chạy','In Progress'), d.in_progress||0);
  h+=_kpi(_t('Hoàn thành','Completed'), d.completed||0);
  h+=_kpi(_t('Tổng định mức','Total Target'), (d.total_target||0)+' pcs');
  h+=_kpi(_t('Tổng sản lượng','Total Output'), (d.total_good||0)+' pcs');
  h+=_kpi(_t('Đạt','Achievement'), _fmtNum(_pct(d.total_good||0, d.total_target||0),1)+'%');
  h+=_kpi(_t('Tổng NG','Total NG'), (d.total_ng||0)+' pcs');
  h+=_kpi(_t('Ty le NG','NG Rate'), _fmtNum(_pct(d.total_ng||0, (d.total_good||0)+(d.total_ng||0)),1)+'%');
  h+='</div>';

  /* per-machine table */
  h+='<h3 style="margin:16px 0 10px;font-size:1rem">'+_t('Theo máy','Per Machine')+'</h3>';
  var mach=d.by_machine||[];
  if(!mach.length){
    h+='<div class="pd-empty">'+_t('Không có dữ liệu','No data')+'</div>';
  } else {
    h+='<table class="pd-table"><thead><tr>';
    h+='<th>'+_t('Máy','Machine')+'</th><th>WO</th><th>Part</th><th>'+_t('Định mức','Target')+'</th><th>'+_t('Tốt','Good')+'</th><th>NG</th><th>Rework</th><th>'+_t('Dat %','Achieve')+'</th><th>NG %</th>';
    h+='</tr></thead><tbody>';
    mach.forEach(function(r){
      var pct=_pct(r.qty_good||0, r.target_qty||0);
      var ngPct=_pct(r.qty_ng||0, (r.qty_good||0)+(r.qty_ng||0));
      h+='<tr style="background:'+_achieveBg(pct)+'">';
      h+='<td><b>'+_esc(r.machine_name)+'</b></td>';
      h+='<td>'+_esc(r.wo_number)+'</td>';
      h+='<td>'+_esc(r.part_number)+'</td>';
      h+='<td>'+_esc(r.target_qty)+'</td>';
      h+='<td style="color:#16a34a;font-weight:700">'+_esc(r.qty_good||0)+'</td>';
      h+='<td style="color:#ef4444;font-weight:700">'+_esc(r.qty_ng||0)+'</td>';
      h+='<td style="color:#f59e0b;font-weight:700">'+_esc(r.qty_rework||0)+'</td>';
      h+='<td style="color:'+_achieveColor(pct)+';font-weight:700">'+_fmtNum(pct,1)+'%'+(pct>=100?' \uD83C\uDF89':'')+'</td>';
      h+='<td style="color:'+(ngPct>5?'#ef4444':'inherit')+'">'+_fmtNum(ngPct,1)+'%</td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
  }

  /* per-operator table */
  h+='<h3 style="margin:16px 0 10px;font-size:1rem">'+_t('Theo người vận hành','Per Operator')+'</h3>';
  var ops=d.by_operator||[];
  if(!ops.length){
    h+='<div class="pd-empty">'+_t('Không có dữ liệu','No data')+'</div>';
  } else {
    h+='<table class="pd-table"><thead><tr>';
    h+='<th>'+_t('Người vận hành','Operator')+'</th><th>'+_t('Ca','Shift')+'</th><th>'+_t('Máy','Machine')+'</th><th>'+_t('Định mức','Target')+'</th><th>'+_t('Tốt','Good')+'</th><th>NG</th><th>'+_t('Dat %','Achieve')+'</th>';
    h+='</tr></thead><tbody>';
    ops.forEach(function(r){
      var pct=_pct(r.qty_good||0, r.target_qty||0);
      var shInfo=SHIFTS.find(function(s){ return s.key===r.shift; })||SHIFTS[0];
      h+='<tr style="background:'+_achieveBg(pct)+'">';
      h+='<td><b>'+_esc(r.operator_name)+'</b></td>';
      h+='<td><span class="pd-shift-badge" style="background:'+shInfo.color+'">'+_t(shInfo.vi,shInfo.en)+'</span></td>';
      h+='<td>'+_esc(r.machine_name)+'</td>';
      h+='<td>'+_esc(r.target_qty)+'</td>';
      h+='<td style="color:#16a34a;font-weight:700">'+_esc(r.qty_good||0)+'</td>';
      h+='<td style="color:#ef4444;font-weight:700">'+_esc(r.qty_ng||0)+'</td>';
      h+='<td style="color:'+_achieveColor(pct)+';font-weight:700">'+_fmtNum(pct,1)+'%</td>';
      h+='</tr>';
    });
    h+='</tbody></table>';
  }
  return h;
}

function _kpi(label, val){
  return '<div class="pd-kpi"><div class="pd-kpi-val">'+_esc(val)+'</div><div class="pd-kpi-label">'+_esc(label)+'</div></div>';
}

/* ============================================================= */
/* -- TAB 5: TARGET LIST --------------------------------------- */
/* ============================================================= */
function _renderList(){
  var h='';
  /* filters */
  h+='<div class="pd-controls">';
  h+='<input type="date" id="pd-list-start" value="'+_esc(state.dateRange.start)+'">';
  h+='<input type="date" id="pd-list-end" value="'+_esc(state.dateRange.end)+'">';
  h+='<select id="pd-list-machine"><option value="">'+_t('Tất cả máy','All Machines')+'</option>';
  (state.machines||[]).forEach(function(m){ h+='<option value="'+_esc(m.id)+'"'+(state.filterMachine==m.id?' selected':'')+'>'+_esc(m.name)+'</option>'; });
  h+='</select>';
  h+='<select id="pd-list-status"><option value="all">'+_t('Tất cả','All')+'</option>';
  Object.keys(STATUS_COLORS).forEach(function(s){ h+='<option value="'+s+'"'+(state.filterStatus===s?' selected':'')+'>'+_esc(s)+'</option>'; });
  h+='</select>';
  h+='<button class="pd-btn pd-btn-primary" data-action="refresh-list">'+_t('Tìm','Search')+'</button>';
  h+='<button class="pd-btn pd-btn-success pd-btn-sm" data-action="bulk-dispatch">'+_t('Gửi lệnh hàng loạt','Bulk Dispatch')+'</button>';
  h+='</div>';

  if(state.loading) return h+'<div class="pd-empty">'+_t("Đang tải...","Loading...")+'</div>';
  var data=state.listData||[];
  if(!data.length) return h+'<div class="pd-empty">'+_t('Không có dữ liệu','No data')+'</div>';

  h+='<div style="overflow-x:auto">';
  h+='<table class="pd-table"><thead><tr>';
  h+='<th><input type="checkbox" id="pd-select-all"></th>';
  var cols=[
    {k:'target_date',l:_t('Ngày','Date')},{k:'shift',l:_t('Ca','Shift')},{k:'machine_name',l:_t('Máy','Machine')},
    {k:'wo_number',l:'WO'},{k:'part_number',l:'Part'},{k:'operator_name',l:_t('NVH','Operator')},
    {k:'target_qty',l:_t('Định mức','Target')},{k:'qty_good',l:_t('Thuc te','Actual')},
    {k:'achievement',l:_t('Dat %','%')},{k:'ng_rate',l:'NG %'},{k:'status',l:_t('Trạng thái','Status')}
  ];
  cols.forEach(function(c){
    var cls=(state.listSort===c.k)?' pd-sort-active':'';
    var arrow=(state.listSort===c.k)?(state.listDir==='asc'?' &#9650;':' &#9660;'):'';
    h+='<th class="'+cls+'" data-action="sort-list" data-col="'+c.k+'">'+c.l+arrow+'</th>';
  });
  h+='</tr></thead><tbody>';
  data.forEach(function(r){
    var pct=_pct(r.qty_good||0, r.target_qty||0);
    var ngPct=_pct(r.qty_ng||0, (r.qty_good||0)+(r.qty_ng||0));
    var sc=STATUS_COLORS[r.status]||'#94a3b8';
    var shInfo=SHIFTS.find(function(s){ return s.key===r.shift; })||SHIFTS[0];
    h+='<tr data-action="view-target" data-id="'+_esc(r.id)+'" style="cursor:pointer">';
    h+='<td><input type="checkbox" class="pd-row-check" value="'+_esc(r.id)+'" onclick="event.stopPropagation()"></td>';
    h+='<td>'+_fmtDate(r.target_date)+'</td>';
    h+='<td><span class="pd-shift-badge" style="background:'+shInfo.color+'">'+_t(shInfo.vi,shInfo.en)+'</span></td>';
    h+='<td>'+_esc(r.machine_name)+'</td>';
    h+='<td>'+_esc(r.wo_number)+'</td>';
    h+='<td>'+_esc(r.part_number)+'</td>';
    h+='<td>'+_esc(r.operator_name)+'</td>';
    h+='<td>'+_esc(r.target_qty)+'</td>';
    h+='<td>'+_esc(r.qty_good||0)+'</td>';
    h+='<td style="color:'+_achieveColor(pct)+';font-weight:700">'+_fmtNum(pct,1)+'%</td>';
    h+='<td style="color:'+(ngPct>5?'#ef4444':'inherit')+'">'+_fmtNum(ngPct,1)+'%</td>';
    h+='<td><span class="pd-status" style="background:'+sc+'">'+_esc(r.status)+'</span></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';

  /* pagination */
  var totalPages=Math.ceil((state.listTotal||data.length)/20)||1;
  h+='<div class="pd-pager">';
  h+='<button class="pd-btn pd-btn-secondary pd-btn-sm" data-action="list-page" data-page="'+(state.listPage-1)+'"'+(state.listPage<=1?' disabled':'')+'>&#9664;</button>';
  h+='<span>'+state.listPage+' / '+totalPages+'</span>';
  h+='<button class="pd-btn pd-btn-secondary pd-btn-sm" data-action="list-page" data-page="'+(state.listPage+1)+'"'+(state.listPage>=totalPages?' disabled':'')+'>&#9654;</button>';
  h+='</div>';
  return h;
}

/* ============================================================= */
/* -- TAB 6: SETTINGS ------------------------------------------ */
/* ============================================================= */
function _renderSettings(){
  var h='';
  h+='<h3 style="margin:0 0 14px;font-size:1.1rem">'+_t('Cài đặt ca & máy','Shift & Machine Settings')+'</h3>';

  /* shift definitions */
  h+='<div class="pd-setting-card">';
  h+='<h3>'+_t('Định nghĩa ca','Shift Definitions')+'</h3>';
  SHIFTS.forEach(function(sh){
    h+='<div class="pd-setting-row">';
    h+='<label><span class="pd-shift-badge" style="background:'+sh.color+'">'+_t(sh.vi,sh.en)+'</span></label>';
    h+='<span>'+sh.start+' - '+sh.end+'</span>';
    h+='</div>';
  });
  h+='<div class="pd-setting-row"><label>'+_t('Thời lượng ca','Shift Duration')+'</label><span>'+state.shiftConfig.duration+' '+_t('phút','min')+'</span></div>';
  h+='<div class="pd-setting-row"><label>'+_t('Thời gian nghỉ','Break Time')+'</label><span>'+state.shiftConfig.breakTime+' '+_t('phút','min')+'</span></div>';
  h+='</div>';

  /* machine list */
  h+='<div class="pd-setting-card">';
  h+='<h3>'+_t('Danh sách máy','Machine List')+'</h3>';
  if(!(state.machines||[]).length){
    h+='<div class="pd-empty">'+_t('Chưa có máy nào','No machines configured')+'</div>';
  } else {
    h+='<table class="pd-table"><thead><tr><th>ID</th><th>'+_t('Tên máy','Name')+'</th><th>'+_t('Loại','Type')+'</th><th>'+_t('Trạng thái','Status')+'</th></tr></thead><tbody>';
    state.machines.forEach(function(m){
      h+='<tr><td>'+_esc(m.id)+'</td><td><b>'+_esc(m.name)+'</b></td><td>'+_esc(m.type||'-')+'</td><td>'+_esc(m.status||'active')+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';

  /* defect types reference */
  h+='<div class="pd-setting-card">';
  h+='<h3>'+_t('Loai loi NG','NG Defect Types')+'</h3>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px">';
  DEFECT_TYPES.forEach(function(dt){
    h+='<span style="padding:4px 12px;background:var(--bg-alt,#f1f5f9);border-radius:6px;font-size:.82rem">'+_t(dt.vi,dt.en)+'</span>';
  });
  h+='</div></div>';
  return h;
}

/* ============================================================= */
/* -- DATA LOADERS --------------------------------------------- */
/* ============================================================= */
function _loadTimeline(){
  state.loading=true; _paint();
  _api('dispatch_timeline',{ start_date:state.dateRange.start, end_date:state.dateRange.end },'GET')
  .then(function(r){
    state.loading=false;
    if(r&&r.ok){
      // API returns {timeline: [{machine_id, days: {date: [targets]}}], logs: {}}
      // Flatten into a flat array of targets for the renderer
      var flat=[];
      (r.timeline||[]).forEach(function(m){
        var days=m.days||{};
        Object.keys(days).forEach(function(d){
          (days[d]||[]).forEach(function(t){ flat.push(t); });
        });
      });
      state.targets=flat;
      state.logs=r.logs||{};
    }
    _paint();
  }).catch(function(){ state.loading=false; _paint(); _toast(_t('Lỗi tải dữ liệu','Error loading data'),'error'); });
}

function _loadDispatchData(){
  // Load today's targets for the dispatch form
  _api('dispatch_list_targets',{ start_date:_today(), end_date:_today() },'GET')
  .then(function(r){
    if(r&&r.ok){
      state.targets=r.targets||[];
    }
    _paint();
  }).catch(function(){ _paint(); });
}

function _loadMyTasks(){
  state.loading=true; _paint();
  _api('dispatch_operator_tasks',{ date:_today() },'GET')
  .then(function(r){
    state.loading=false;
    if(r&&r.ok) state.operatorTasks=r.tasks||[];
    _paint();
  }).catch(function(){ state.loading=false; _paint(); _toast(_t('Lỗi tải dữ liệu','Error loading data'),'error'); });
}

function _loadDashboard(date){
  state.loading=true; _paint();
  _api('dispatch_dashboard',{ date:date||_today() },'GET')
  .then(function(r){
    state.loading=false;
    if(r&&r.ok) state.dashboard=r.dashboard||r||{};
    _paint();
  }).catch(function(){ state.loading=false; _paint(); _toast(_t('Lỗi tải dữ liệu','Error loading data'),'error'); });
}

function _loadList(){
  state.loading=true; _paint();
  _api('dispatch_list_targets',{
    start_date:state.dateRange.start, end_date:state.dateRange.end,
    machine:state.filterMachine, status:state.filterStatus,
    sort:state.listSort, dir:state.listDir,
    page:state.listPage, per_page:20
  },'GET')
  .then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.listData=r.targets||[];
      state.listTotal=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _paint(); _toast(_t('Lỗi tải dữ liệu','Error loading data'),'error'); });
}

/* ============================================================= */
/* -- ACTIONS -------------------------------------------------- */
/* ============================================================= */
function _createTarget(){
  var c=state.container;
  var woEl=c.querySelector('#pd-wo');
  var machEl=c.querySelector('#pd-machine');
  var opEl=c.querySelector('#pd-operator');
  var shiftEl=c.querySelector('#pd-shift');
  var dateEl=c.querySelector('#pd-target-date');
  var cycleEl=c.querySelector('#pd-cycle-time');
  var setupEl=c.querySelector('#pd-setup-time');
  var durEl=c.querySelector('#pd-shift-duration');
  var prioEl=c.querySelector('#pd-priority');
  var notesEl=c.querySelector('#pd-notes');

  if(!woEl||!woEl.value){ _toast(_t('Chon WO','Select a WO'),'warn'); return; }
  if(!machEl||!machEl.value){ _toast(_t('Chọn máy','Select a machine'),'warn'); return; }
  if(!opEl||!opEl.value){ _toast(_t('Chon NVH','Select an operator'),'warn'); return; }
  var cycle=parseFloat(cycleEl?cycleEl.value:0);
  var setup=parseFloat(setupEl?setupEl.value:0);
  var dur=parseFloat(durEl?durEl.value:480);
  if(!cycle||cycle<=0){ _toast(_t('Nhập thời gian chu kỳ','Enter cycle time'),'warn'); return; }

  var targetQty=Math.floor((dur-setup)/cycle);
  if(targetQty<=0){ _toast(_t('Định mức không hợp lệ','Invalid target qty'),'warn'); return; }

  var payload={
    wo_id: woEl.value,
    machine_id: machEl.value,
    operator_id: opEl.value,
    shift: shiftEl?shiftEl.value:'morning',
    target_date: dateEl?dateEl.value:_today(),
    cycle_time: cycle,
    setup_time: setup,
    shift_duration: dur,
    target_qty: targetQty,
    priority: prioEl?parseInt(prioEl.value):50,
    notes: notesEl?notesEl.value:''
  };

  _api('dispatch_create_target', payload).then(function(r){
    if(r&&r.ok){
      _toast(_t('Da tao lenh: ','Created target: ')+targetQty+' pcs','success');
      _loadDispatchData();
    } else {
      _toast((r&&r.error)||_t('Lỗi tạo lệnh','Error creating target'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi tạo lệnh','Error creating target'),'error'); });
}

function _dispatchSend(targetId){
  _api('dispatch_send',{ target_id:targetId }).then(function(r){
    if(r&&r.ok){
      _toast(_t('Đã gửi lệnh','Dispatched successfully'),'success');
      _loadDispatchData();
    } else {
      _toast((r&&r.error)||_t('Lỗi gửi lệnh','Error dispatching'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi gửi lệnh','Error dispatching'),'error'); });
}

function _reportProduction(idx){
  var task=state.operatorTasks[idx];
  if(!task) return;
  var c=state.container;
  var goodEl=c.querySelector('#pd-good-'+idx);
  var ngEl=c.querySelector('#pd-ng-'+idx);
  var rwEl=c.querySelector('#pd-rework-'+idx);
  var good=parseInt(goodEl?goodEl.value:0)||0;
  var ng=parseInt(ngEl?ngEl.value:0)||0;
  var rework=parseInt(rwEl?rwEl.value:0)||0;

  /* collect NG breakdown */
  var ngBreakdown={};
  var ngDetailEl=c.querySelector('#pd-ng-detail-'+idx);
  if(ngDetailEl){
    var ngInputs=ngDetailEl.querySelectorAll('input[data-ng-type]');
    ngInputs.forEach(function(inp){ var v=parseInt(inp.value)||0; if(v>0) ngBreakdown[inp.getAttribute('data-ng-type')]=v; });
  }

  var payload={
    target_id: task.target_id||task.id,
    quantity_good: good,
    quantity_ng: ng,
    quantity_rework: rework,
    ng_details: Object.keys(ngBreakdown).map(function(k){ return {type:k, qty:ngBreakdown[k]}; })
  };

  _api('dispatch_report_production', payload).then(function(r){
    if(r&&r.ok){
      /* update locally for instant feedback */
      task.qty_good=good;
      task.qty_ng=ng;
      task.qty_rework=rework;
      task.ng_breakdown=ngBreakdown;
      var pct=_pct(good, task.target_qty||0);
      _toast(_t('Đã báo cáo: ','Reported: ')+good+' '+_t('tot','good')+', '+ng+' NG, '+rework+' rework ('+_fmtNum(pct,1)+'%)','success');
      _paint();
    } else {
      _toast((r&&r.error)||_t('Lỗi báo cáo','Error reporting'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi báo cáo','Error reporting'),'error'); });
}

function _bulkDispatch(){
  var checks=state.container.querySelectorAll('.pd-row-check:checked');
  if(!checks.length){ _toast(_t('Chọn ít nhất 1 lệnh','Select at least 1 target'),'warn'); return; }
  var ids=[];
  checks.forEach(function(cb){ ids.push(cb.value); });
  _api('dispatch_bulk_send',{ target_ids:ids }).then(function(r){
    if(r&&r.ok){
      _toast(_t('Đã gửi ','Dispatched ')+ids.length+_t(' lệnh',' targets'),'success');
      _loadList();
    } else {
      _toast((r&&r.error)||_t('Lỗi gửi lệnh','Error dispatching'),'error');
    }
  }).catch(function(){ _toast(_t('Lỗi gửi lệnh','Error dispatching'),'error'); });
}

/* ============================================================= */
/* -- AUTO-CALCULATE ------------------------------------------- */
/* ============================================================= */
function _recalcTarget(){
  var c=state.container;
  var cycleEl=c.querySelector('#pd-cycle-time');
  var setupEl=c.querySelector('#pd-setup-time');
  var durEl=c.querySelector('#pd-shift-duration');
  var box=c.querySelector('#pd-auto-target');
  if(!box) return;
  var cycle=parseFloat(cycleEl?cycleEl.value:0);
  var setup=parseFloat(setupEl?setupEl.value:0);
  var dur=parseFloat(durEl?durEl.value:480);
  if(!cycle||cycle<=0){ box.textContent='-- pcs'; return; }
  var qty=Math.floor((dur-setup)/cycle);
  box.textContent=(qty>0?qty:0)+' pcs';
}

/* ============================================================= */
/* -- EVENT BINDING -------------------------------------------- */
/* ============================================================= */
function _bind(){
  if(!state.container) return;

  /* tab clicks */
  state.container.addEventListener('click', function(e){
    /* tab switch */
    var tab=e.target.closest('[data-tab]');
    if(tab){
      state.activeTab=tab.getAttribute('data-tab');
      _paint();
      _loadTabData();
      return;
    }

    var action=e.target.closest('[data-action]');
    if(!action) return;
    var act=action.getAttribute('data-action');

    switch(act){
      case 'today':
        state.dateRange={ start:_today(), end:_addDays(_today(),7) };
        _loadTimeline();
        break;
      case 'refresh-timeline':
        var sEl=state.container.querySelector('#pd-date-start');
        var eEl=state.container.querySelector('#pd-date-end');
        if(sEl) state.dateRange.start=sEl.value;
        if(eEl) state.dateRange.end=eEl.value;
        var mfEl=state.container.querySelector('#pd-filter-machine');
        var sfEl=state.container.querySelector('#pd-filter-status');
        if(mfEl) state.filterMachine=mfEl.value;
        if(sfEl) state.filterStatus=sfEl.value;
        _loadTimeline();
        break;
      case 'create-target':
        _createTarget();
        break;
      case 'dispatch-send':
        _dispatchSend(action.getAttribute('data-id'));
        break;
      case 'refresh-mytasks':
        _loadMyTasks();
        break;
      case 'report-production':
        _reportProduction(parseInt(action.getAttribute('data-idx')));
        break;
      case 'toggle-ng-detail':
        var ngIdx=parseInt(action.getAttribute('data-idx'));
        state.expandedNG[ngIdx]=!state.expandedNG[ngIdx];
        var det=state.container.querySelector('#pd-ng-detail-'+ngIdx);
        if(det) det.classList.toggle('open');
        break;
      case 'refresh-summary':
        var sdEl=state.container.querySelector('#pd-summary-date');
        _loadDashboard(sdEl?sdEl.value:_today());
        break;
      case 'refresh-list':
        var lsEl=state.container.querySelector('#pd-list-start');
        var leEl=state.container.querySelector('#pd-list-end');
        var lmEl=state.container.querySelector('#pd-list-machine');
        var lstEl=state.container.querySelector('#pd-list-status');
        if(lsEl) state.dateRange.start=lsEl.value;
        if(leEl) state.dateRange.end=leEl.value;
        if(lmEl) state.filterMachine=lmEl.value;
        if(lstEl) state.filterStatus=lstEl.value;
        state.listPage=1;
        _loadList();
        break;
      case 'sort-list':
        var col=action.getAttribute('data-col');
        if(state.listSort===col){ state.listDir=(state.listDir==='asc'?'desc':'asc'); }
        else { state.listSort=col; state.listDir='asc'; }
        _loadList();
        break;
      case 'list-page':
        var pg=parseInt(action.getAttribute('data-page'));
        if(pg>=1) { state.listPage=pg; _loadList(); }
        break;
      case 'bulk-dispatch':
        _bulkDispatch();
        break;
      case 'view-target':
        var tid=action.getAttribute('data-id')||(e.target.closest('[data-id]')?e.target.closest('[data-id]').getAttribute('data-id'):null);
        if(tid) _toast(_t('Xem chi tiết lệnh: ','View target: ')+tid,'info');
        break;
    }
  });

  /* select-all checkbox */
  state.container.addEventListener('change', function(e){
    if(e.target.id==='pd-select-all'){
      var checks=state.container.querySelectorAll('.pd-row-check');
      checks.forEach(function(cb){ cb.checked=e.target.checked; });
    }
  });

  /* auto-calculate on input */
  state.container.addEventListener('input', function(e){
    var id=e.target.id;
    if(id==='pd-cycle-time'||id==='pd-setup-time'||id==='pd-shift-duration'){
      _recalcTarget();
    }
    if(id==='pd-priority'){
      var valEl=state.container.querySelector('#pd-priority-val');
      if(valEl) valEl.textContent=e.target.value;
    }
    /* live progress update for operator qty inputs */
    if(e.target.classList.contains('pd-qty-input')){
      var idx=parseInt(e.target.getAttribute('data-idx'));
      var field=e.target.getAttribute('data-field');
      if(state.operatorTasks[idx]!==undefined && field){
        state.operatorTasks[idx][field]=parseInt(e.target.value)||0;
        /* update progress bar */
        var task=state.operatorTasks[idx];
        var pct=_pct(task.qty_good||0, task.target_qty||0);
        var pc=_achieveColor(pct);
        var card=e.target.closest('.pd-task-card');
        if(card){
          var fill=card.querySelector('.pd-progress-fill');
          var txt=card.querySelector('.pd-progress-text');
          if(fill){ fill.style.width=Math.min(pct,100)+'%'; fill.style.background=pc; }
          if(txt){ txt.style.color=pc; txt.textContent=(pct>=100?'\uD83C\uDF89 ':'')+pct+'% ('+(task.qty_good||0)+'/'+(task.target_qty||0)+')'; }
        }
      }
    }
  });
}

/* load data for active tab */
function _loadTabData(){
  switch(state.activeTab){
    case 'timeline': _loadTimeline(); break;
    case 'dispatch': _loadDispatchData(); break;
    case 'mytasks':  _loadMyTasks(); break;
    case 'summary':  _loadDashboard(); break;
    case 'list':     _loadList(); break;
  }
}

/* ============================================================= */
/* -- ENTRY POINT ---------------------------------------------- */
/* ============================================================= */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='timeline';
  state.targets=[];
  state.operatorTasks=[];
  state.dashboard={};
  state.listData=[];
  state.listPage=1;
  state.expandedNG={};
  state.filterMachine='';
  state.filterStatus='all';
  state.dateRange={ start:_today(), end:_addDays(_today(),7) };
  _paint();
  _bind();
  _loadTimeline();
}

window._renderProductionDispatch = render;

})();

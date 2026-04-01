/* ===================================================================
   26-mobile-shopfloor.js
   HESEM QMS Portal - Mobile Shop Floor Module
   Operator-facing, touch-optimized: work queue, time clock,
   first piece / in-process inspection, quick NCR, offline sync.
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
function _fmtTime(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'ms-styles';
var TABS = [
  { key:'queue',    vi:'Hang doi',       en:'My Queue',       icon:'&#9776;' },
  { key:'clock',    vi:'Cham cong',      en:'Time Clock',     icon:'&#9201;' },
  { key:'first',    vi:'First Piece',    en:'First Piece',    icon:'&#9989;' },
  { key:'inprocess',vi:'In-Process',     en:'In-Process',     icon:'&#128270;' },
  { key:'ncr',      vi:'Quick NCR',      en:'Quick NCR',      icon:'&#9888;' },
  { key:'sync',     vi:'Dong bo',        en:'Sync Status',    icon:'&#128259;' }
];

var PRIORITY = {
  urgent: { vi:'Khan cap', en:'Urgent', color:'#ef4444', bg:'rgba(239,68,68,.1)' },
  high:   { vi:'Cao',      en:'High',   color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
  normal: { vi:'Binh thuong', en:'Normal', color:'#3b82f6', bg:'rgba(59,130,246,.1)' },
  low:    { vi:'Thap',     en:'Low',    color:'#94a3b8', bg:'rgba(148,163,184,.1)' }
};

var LABOR_TYPES = [
  { key:'setup',      vi:'Setup',      en:'Setup' },
  { key:'run',        vi:'Run',        en:'Run' },
  { key:'rework',     vi:'Rework',     en:'Rework' },
  { key:'inspection', vi:'Kiem tra',   en:'Inspection' },
  { key:'idle',       vi:'Nghi',       en:'Idle' }
];

var DEFECT_TYPES = [
  { key:'dimensional', vi:'Kich thuoc',  en:'Dimensional', icon:'&#128207;' },
  { key:'surface',     vi:'Be mat',      en:'Surface',     icon:'&#128065;' },
  { key:'material',    vi:'Vat lieu',    en:'Material',    icon:'&#129521;' },
  { key:'visual',      vi:'Ngoai quan',  en:'Visual',      icon:'&#128064;' },
  { key:'thread',      vi:'Ren',         en:'Thread',      icon:'&#128297;' },
  { key:'burr',        vi:'Ba via',      en:'Burr',        icon:'&#128296;' }
];

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'queue',
  operatorId: null,
  queue: [],
  timeEntries: [],
  inspections: [],
  currentTask: null,
  clockedIn: null,
  clockStartTime: null,
  laborType: 'run',
  timerInterval: null,
  /* first piece / in-process */
  inspectionPlan: [],
  spcData: [],
  sampleIndex: 0,
  sampleTotal: 5,
  /* NCR */
  selectedDefectType: null,
  ncrSeverity: 5,
  /* offline */
  offlineQueue: [],
  syncHistory: [],
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.ms{padding:12px;max-width:800px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    /* tabs: large touch-friendly */
    '.ms-tabs{display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;justify-content:center}',
    '.ms-tab{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 14px;font-size:.75rem;font-weight:700;cursor:pointer;border-radius:10px;border:2px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);transition:all .15s;min-width:60px;min-height:48px;justify-content:center}',
    '.ms-tab:hover{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.ms-tab.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:#fff}',
    '.ms-tab-icon{font-size:1.25rem;line-height:1}',
    /* queue cards */
    '.ms-queue-card{background:var(--surface,#fff);border:2px solid var(--border,#e2e8f0);border-radius:12px;padding:16px;margin-bottom:10px;min-height:80px;position:relative;transition:box-shadow .15s}',
    '.ms-queue-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}',
    '.ms-queue-card.active-task{border-color:var(--brand,#1565c0);animation:ms-pulse 2s ease-in-out infinite}',
    '@keyframes ms-pulse{0%,100%{box-shadow:0 0 0 0 rgba(21,101,192,.2)}50%{box-shadow:0 0 0 6px rgba(21,101,192,.15)}}',
    '.ms-priority-bar{position:absolute;left:0;top:0;bottom:0;width:6px;border-radius:12px 0 0 12px}',
    /* buttons: 48px min touch target */
    '.ms-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;min-height:48px;transition:background .15s}',
    '.ms-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.ms-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.ms-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:2px solid var(--border,#d1d5db)}',
    '.ms-btn-danger{background:#ef4444;color:#fff}',
    '.ms-btn-danger:hover{background:#dc2626}',
    '.ms-btn-success{background:#22c55e;color:#fff}',
    '.ms-btn-success:hover{background:#16a34a}',
    '.ms-btn-full{width:100%}',
    '.ms-btn-lg{padding:16px 32px;font-size:1.125rem;min-height:56px}',
    /* timer */
    '.ms-timer{font-size:72px;font-family:"SF Mono",Monaco,Consolas,monospace;font-weight:800;text-align:center;letter-spacing:-.02em;padding:16px 0}',
    /* forms: large inputs */
    '.ms-input{width:100%;height:48px;padding:0 14px;border:2px solid var(--border,#d1d5db);border-radius:10px;font-size:18px;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.ms-input:focus{border-color:var(--brand,#1565c0);outline:none}',
    '.ms-select{width:100%;height:48px;padding:0 14px;border:2px solid var(--border,#d1d5db);border-radius:10px;font-size:16px;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.ms-label{display:block;font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-secondary,#64748b)}',
    /* measurement table */
    '.ms-meas-table{width:100%;border-collapse:collapse;font-size:14px}',
    '.ms-meas-table th{text-align:left;padding:10px 8px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);font-size:12px;text-transform:uppercase;color:var(--text-secondary,#64748b)}',
    '.ms-meas-table td{padding:10px 8px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.ms-meas-table input{height:40px;width:100%;padding:0 8px;border:2px solid var(--border,#d1d5db);border-radius:8px;font-size:16px;text-align:center}',
    '.ms-meas-pass{background:#dcfce7;color:#166534;font-weight:700;text-align:center;padding:4px 10px;border-radius:6px}',
    '.ms-meas-fail{background:#fef2f2;color:#991b1b;font-weight:700;text-align:center;padding:4px 10px;border-radius:6px}',
    /* SPC mini chart */
    '.ms-spc{display:flex;align-items:flex-end;gap:2px;height:60px;padding:4px 0;position:relative;border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:8px;margin:12px 0}',
    '.ms-spc-bar{flex:1;min-width:4px;border-radius:2px 2px 0 0}',
    '.ms-spc-limit{position:absolute;left:0;right:0;border-top:2px dashed #ef4444}',
    '.ms-spc-center{position:absolute;left:0;right:0;border-top:1px solid #22c55e}',
    /* defect type buttons */
    '.ms-defect-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}',
    '.ms-defect-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 8px;border:2px solid var(--border,#e2e8f0);border-radius:12px;cursor:pointer;font-size:.8125rem;font-weight:600;background:var(--surface,#fff);min-height:80px;justify-content:center;transition:all .15s}',
    '.ms-defect-btn:hover{border-color:var(--brand,#1565c0)}',
    '.ms-defect-btn.selected{border-color:#ef4444;background:rgba(239,68,68,.05)}',
    '.ms-defect-icon{font-size:1.75rem}',
    /* severity slider */
    '.ms-slider{width:100%;height:8px;border-radius:4px;-webkit-appearance:none;background:#e2e8f0;outline:none}',
    '.ms-slider::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;border-radius:50%;background:var(--brand,#1565c0);cursor:pointer;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)}',
    /* sync */
    '.ms-sync-dot{width:12px;height:12px;border-radius:50%;display:inline-block}',
    '.ms-sync-online{background:#22c55e}',
    '.ms-sync-offline{background:#ef4444}',
    '.ms-sync-pending{background:#f59e0b}',
    /* card */
    '.ms-card{background:var(--surface,#fff);border:2px solid var(--border,#e2e8f0);border-radius:12px;padding:16px;margin-bottom:12px}',
    /* status indicator */
    '.ms-status{font-size:20px;font-weight:800;text-align:center;padding:12px;border-radius:10px;margin-bottom:16px}',
    '.ms-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.75rem;font-weight:700;color:#fff;white-space:nowrap}',
    /* empty */
    '.ms-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:16px}',
    /* labor type selector */
    '.ms-labor-grid{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
    '.ms-labor-btn{padding:10px 16px;border:2px solid var(--border,#d1d5db);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;background:var(--surface,#fff);min-height:48px;display:flex;align-items:center}',
    '.ms-labor-btn.active{border-color:var(--brand,#1565c0);background:rgba(21,101,192,.08);color:var(--brand,#1565c0)}',
    /* time entries */
    '.ms-time-list{margin-top:16px}',
    '.ms-time-entry{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border,#f1f5f9);font-size:14px}'
  ].join('\n');
  document.head.appendChild(s);
}

/* -- helpers -------------------------------------------------- */
function _isOnline(){ return typeof navigator!=='undefined' && navigator.onLine!==false; }
function _syncBadge(){
  if(_isOnline()) return '<span class="ms-sync-dot ms-sync-online"></span>';
  return '<span class="ms-sync-dot ms-sync-offline"></span>';
}
function _priorityColor(p){ return (PRIORITY[p]||PRIORITY.normal).color; }
function _priorityBg(p){ return (PRIORITY[p]||PRIORITY.normal).bg; }

function _formatDuration(ms){
  if(!ms||ms<0) ms=0;
  var secs=Math.floor(ms/1000);
  var h=Math.floor(secs/3600);
  var m=Math.floor((secs%3600)/60);
  var s=secs%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function _queueOfflineAction(action, payload){
  state.offlineQueue.push({action:action, payload:payload, timestamp:Date.now()});
  try{ localStorage.setItem('ms_offline_queue', JSON.stringify(state.offlineQueue)); }catch(e){}
}

function _loadOfflineQueue(){
  try{
    var data=localStorage.getItem('ms_offline_queue');
    if(data) state.offlineQueue=JSON.parse(data)||[];
  }catch(e){ state.offlineQueue=[]; }
}

/* ============================================================= */
/* TAB 1: My Queue                                               */
/* ============================================================= */
function _renderQueueTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html+='<h3 style="margin:0;font-size:20px">'+_t('Hang doi hom nay','My Queue Today')+' '+_syncBadge()+'</h3>';
  html+='<button class="ms-btn ms-btn-secondary" data-action="refresh-queue" style="padding:8px 16px;font-size:.875rem">'+_t('Lam moi','Refresh')+'</button>';
  html+='</div>';

  if(!state.queue.length) return html+'<div class="ms-empty">'+_t('Khong co cong viec','No tasks in queue')+'</div>';

  state.queue.forEach(function(task){
    var isActive=state.currentTask&&state.currentTask.id===task.id;
    html+='<div class="ms-queue-card'+(isActive?' active-task':'')+'" style="padding-left:22px">';
    html+='<div class="ms-priority-bar" style="background:'+_priorityColor(task.priority)+'"></div>';
    html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">';
    html+='<div>';
    html+='<div style="font-size:18px;font-weight:800">'+_esc(task.wo_number||'-')+'</div>';
    html+='<div style="font-size:14px;color:var(--text-secondary,#64748b);margin-top:2px">'+_esc(task.operation||'-')+' | '+_esc(task.machine||'-')+'</div>';
    html+='</div>';
    html+='<div style="text-align:right">';
    html+='<div style="font-size:14px;font-weight:600">'+_esc(task.est_time||'-')+'</div>';
    var syncColor=task.synced?'#22c55e':'#f59e0b';
    html+='<span class="ms-sync-dot" style="background:'+syncColor+';margin-top:4px" title="'+(task.synced?'Synced':'Pending sync')+'"></span>';
    html+='</div></div>';
    if(isActive){
      html+='<button class="ms-btn ms-btn-success ms-btn-full" data-action="complete-task" data-id="'+_esc(task.id)+'">'+_t('HOAN THANH','COMPLETE')+'</button>';
    } else {
      html+='<button class="ms-btn ms-btn-primary ms-btn-full" data-action="start-task" data-id="'+_esc(task.id)+'">'+_t('BAT DAU','START')+'</button>';
    }
    html+='</div>';
  });
  return html;
}

/* ============================================================= */
/* TAB 2: Time Clock                                             */
/* ============================================================= */
function _renderClockTab(){
  var html='';

  if(state.clockedIn){
    var elapsed=Date.now()-(state.clockStartTime||Date.now());
    html+='<div class="ms-status" style="background:rgba(34,197,94,.1);color:#166534">'+_t('DANG LAM VIEC','CLOCKED IN')+'</div>';
    html+='<div class="ms-card" style="text-align:center">';
    html+='<div style="font-size:16px;color:var(--text-secondary,#64748b);margin-bottom:4px">'+_esc(state.clockedIn.wo_number||'-')+' '+_esc(state.clockedIn.operation||'-')+' on '+_esc(state.clockedIn.machine||'-')+'</div>';
    html+='<div class="ms-timer" id="ms-timer-display">'+_formatDuration(elapsed)+'</div>';

    /* labor type selector */
    html+='<div class="ms-label" style="text-align:left;margin-top:8px">'+_t('Loai lao dong','Labor Type')+'</div>';
    html+='<div class="ms-labor-grid">';
    LABOR_TYPES.forEach(function(lt){
      html+='<div class="ms-labor-btn'+(state.laborType===lt.key?' active':'')+'" data-action="set-labor" data-type="'+lt.key+'">'+_esc(_t(lt.vi,lt.en))+'</div>';
    });
    html+='</div>';

    html+='<button class="ms-btn ms-btn-danger ms-btn-full ms-btn-lg" data-action="clock-out" style="margin-top:16px">'+_t('KET THUC','CLOCK OUT')+'</button>';
    html+='</div>';
  } else {
    html+='<div class="ms-status" style="background:rgba(148,163,184,.1);color:#64748b">'+_t('CHUA CHAM CONG','NOT CLOCKED IN')+'</div>';
    if(state.currentTask){
      html+='<div class="ms-card" style="text-align:center">';
      html+='<div style="font-size:16px;margin-bottom:12px">'+_t('Cong viec hien tai','Current Task')+': <strong>'+_esc(state.currentTask.wo_number)+'</strong></div>';
      html+='<button class="ms-btn ms-btn-primary ms-btn-full ms-btn-lg" data-action="clock-in">'+_t('BAT DAU CHAM CONG','CLOCK IN')+'</button>';
      html+='</div>';
    } else {
      html+='<div class="ms-empty">'+_t('Chon cong viec truoc','Select a task from queue first')+'</div>';
    }
  }

  /* today's time entries */
  if(state.timeEntries.length){
    html+='<div class="ms-time-list"><h4 style="font-size:16px;margin:0 0 8px">'+_t('Hom nay','Today')+'</h4>';
    state.timeEntries.forEach(function(te){
      html+='<div class="ms-time-entry">';
      html+='<div><strong>'+_esc(te.wo_number||'-')+'</strong> '+_esc(te.operation||'-')+'</div>';
      html+='<div style="display:flex;align-items:center;gap:8px">';
      html+='<span class="ms-badge" style="background:var(--brand,#1565c0)">'+_esc(te.labor_type||'run')+'</span>';
      html+='<span style="font-weight:700">'+_esc(te.duration||'-')+'</span>';
      html+='</div></div>';
    });
    html+='</div>';
  }
  return html;
}

/* ============================================================= */
/* TAB 3: First Piece                                            */
/* ============================================================= */
function _renderFirstPieceTab(){
  var html='<h3 style="margin:0 0 12px;font-size:20px">'+_t('Kiem tra First Piece','First Piece Inspection')+'</h3>';

  if(!state.currentTask){
    return html+'<div class="ms-empty">'+_t('Bat dau cong viec truoc','Start a task from queue first')+'</div>';
  }

  html+='<div class="ms-card">';
  html+='<div style="font-size:16px;font-weight:700;margin-bottom:8px">'+_esc(state.currentTask.wo_number)+' - '+_esc(state.currentTask.operation||'-')+'</div>';

  if(!state.inspectionPlan.length){
    html+='<button class="ms-btn ms-btn-primary ms-btn-full" data-action="load-inspection">'+_t('Tai ke hoach kiem tra','Load Inspection Plan')+'</button>';
    html+='</div>';
    return html;
  }

  html+=_renderMeasurementTable('first');
  html+='<div style="display:flex;gap:8px;margin-top:12px">';
  html+='<button class="ms-btn ms-btn-secondary" data-action="camera-first" style="flex:1">'+_t('Chup anh','Camera')+'</button>';
  html+='<button class="ms-btn ms-btn-success" data-action="submit-first" style="flex:2">'+_t('NOP KET QUA','SUBMIT')+'</button>';
  html+='</div></div>';
  return html;
}

/* ============================================================= */
/* TAB 4: In-Process Check                                       */
/* ============================================================= */
function _renderInProcessTab(){
  var html='<h3 style="margin:0 0 12px;font-size:20px">'+_t('Kiem tra trong QT','In-Process Check')+'</h3>';

  if(!state.currentTask){
    return html+'<div class="ms-empty">'+_t('Bat dau cong viec truoc','Start a task from queue first')+'</div>';
  }

  html+='<div class="ms-card">';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html+='<div style="font-size:16px;font-weight:700">'+_esc(state.currentTask.wo_number)+'</div>';
  html+='<div style="font-size:14px;font-weight:600;color:var(--brand,#1565c0)">'+_t('Mau','Sample')+' '+(state.sampleIndex+1)+' / '+state.sampleTotal+'</div>';
  html+='</div>';

  if(!state.inspectionPlan.length){
    html+='<button class="ms-btn ms-btn-primary ms-btn-full" data-action="load-inspection">'+_t('Tai ke hoach kiem tra','Load Inspection Plan')+'</button>';
    html+='</div>';
    return html;
  }

  html+=_renderMeasurementTable('inprocess');

  /* SPC mini chart */
  if(state.spcData.length){
    html+='<div style="margin-top:12px"><div class="ms-label">SPC '+_t('Do thi','Chart')+'</div>';
    html+='<div class="ms-spc">';
    var maxVal=1, minVal=999999;
    state.spcData.forEach(function(v){ if(v>maxVal) maxVal=v; if(v<minVal) minVal=v; });
    var range=maxVal-minVal||1;
    var ucl=maxVal+range*0.1, lcl=Math.max(0,minVal-range*0.1);
    var chartRange=ucl-lcl||1;
    state.spcData.forEach(function(v){
      var h=Math.max(4,Math.round(((v-lcl)/chartRange)*50));
      var col=v>ucl||v<lcl?'#ef4444':'#3b82f6';
      html+='<div class="ms-spc-bar" style="height:'+h+'px;background:'+col+'" title="'+v+'"></div>';
    });
    html+='</div></div>';
  }

  html+='<div style="display:flex;gap:8px;margin-top:12px">';
  html+='<button class="ms-btn ms-btn-success" data-action="submit-inprocess" style="flex:2">'+_t('LUU MAU','SAVE SAMPLE')+'</button>';
  html+='<button class="ms-btn ms-btn-secondary" data-action="next-sample" style="flex:1">'+_t('Mau tiep','Next')+'</button>';
  html+='</div></div>';
  return html;
}

/* -- shared measurement table --------------------------------- */
function _renderMeasurementTable(prefix){
  var plan=state.inspectionPlan;
  var html='<table class="ms-meas-table"><thead><tr>';
  html+='<th>'+_t('Dac tinh','Characteristic')+'</th><th>'+_t('Danh nghia','Nominal')+'</th>';
  html+='<th>Tol-</th><th>Tol+</th><th>'+_t('Thuc te','Actual')+'</th><th>'+_t('Ket qua','Result')+'</th>';
  html+='</tr></thead><tbody>';
  plan.forEach(function(c, idx){
    html+='<tr>';
    html+='<td style="font-weight:600;font-size:14px">'+_esc(c.name||'-')+'</td>';
    html+='<td style="text-align:center">'+_esc(c.nominal||'-')+'</td>';
    html+='<td style="text-align:center">'+_esc(c.tol_minus||'-')+'</td>';
    html+='<td style="text-align:center">'+_esc(c.tol_plus||'-')+'</td>';
    html+='<td><input type="number" step="any" class="ms-actual-input" data-idx="'+idx+'" data-prefix="'+prefix+'" id="'+prefix+'-actual-'+idx+'" value="'+_esc(c._actual||'')+'"></td>';
    html+='<td id="'+prefix+'-result-'+idx+'">';
    if(c._actual!==undefined&&c._actual!==''){
      var val=parseFloat(c._actual);
      var nom=parseFloat(c.nominal)||0;
      var tminus=parseFloat(c.tol_minus)||0;
      var tplus=parseFloat(c.tol_plus)||0;
      var pass=val>=(nom+tminus) && val<=(nom+tplus);
      html+='<div class="'+(pass?'ms-meas-pass':'ms-meas-fail')+'">'+(pass?'PASS':'FAIL')+'</div>';
    }
    html+='</td></tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ============================================================= */
/* TAB 5: Quick NCR                                              */
/* ============================================================= */
function _renderNcrTab(){
  var html='<h3 style="margin:0 0 12px;font-size:20px">'+_t('Bao cao NCR nhanh','Quick NCR Report')+'</h3>';

  html+='<div class="ms-card">';
  /* auto-populated fields */
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
  html+='<div><div class="ms-label">'+_t('WO','WO')+'</div><input type="text" class="ms-input" id="ms-ncr-wo" value="'+_esc(state.currentTask?state.currentTask.wo_number:'')+'" readonly style="background:#f1f5f9"></div>';
  html+='<div><div class="ms-label">'+_t('May','Machine')+'</div><input type="text" class="ms-input" id="ms-ncr-machine" value="'+_esc(state.currentTask?state.currentTask.machine:'')+'" readonly style="background:#f1f5f9"></div>';
  html+='</div>';

  /* defect type grid */
  html+='<div class="ms-label">'+_t('Loai loi','Defect Type')+'</div>';
  html+='<div class="ms-defect-grid">';
  DEFECT_TYPES.forEach(function(dt){
    html+='<div class="ms-defect-btn'+(state.selectedDefectType===dt.key?' selected':'')+'" data-action="select-defect" data-type="'+dt.key+'">';
    html+='<span class="ms-defect-icon">'+dt.icon+'</span>';
    html+='<span>'+_esc(_t(dt.vi,dt.en))+'</span>';
    html+='</div>';
  });
  html+='</div>';

  /* severity slider */
  html+='<div class="ms-label" style="margin-top:12px">'+_t('Muc do','Severity')+': <strong id="ms-sev-val">'+state.ncrSeverity+'</strong> / 10</div>';
  html+='<input type="range" class="ms-slider" id="ms-ncr-severity" min="1" max="10" value="'+state.ncrSeverity+'" data-action="severity-change">';

  /* description */
  html+='<div class="ms-label" style="margin-top:12px">'+_t('Mo ta','Description')+'</div>';
  html+='<textarea class="ms-input" id="ms-ncr-desc" style="height:80px;padding:12px;resize:vertical" placeholder="'+_t('Mo ta loi...','Describe the defect...')+'"></textarea>';

  /* camera + submit */
  html+='<div style="display:flex;gap:8px;margin-top:12px">';
  html+='<button class="ms-btn ms-btn-secondary" data-action="camera-ncr" style="flex:1">'+_t('Chup anh','Camera')+'</button>';
  html+='<button class="ms-btn ms-btn-danger" data-action="submit-ncr" style="flex:2">'+_t('TAO NCR','SUBMIT NCR')+'</button>';
  html+='</div></div>';
  return html;
}

/* ============================================================= */
/* TAB 6: Sync Status                                            */
/* ============================================================= */
function _renderSyncTab(){
  var online=_isOnline();
  var html='<h3 style="margin:0 0 12px;font-size:20px">'+_t('Trang thai dong bo','Sync Status')+'</h3>';

  /* connection indicator */
  html+='<div class="ms-status" style="background:'+(online?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)')+';color:'+(online?'#166534':'#991b1b')+'">';
  html+='<span class="ms-sync-dot '+(online?'ms-sync-online':'ms-sync-offline')+'" style="margin-right:8px"></span>';
  html+=(online?_t('TRUC TUYEN','ONLINE'):_t('NGOAI TUYEN','OFFLINE'));
  html+='</div>';

  /* pending items */
  html+='<div class="ms-card">';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html+='<div><div style="font-size:14px;color:var(--text-secondary,#64748b)">'+_t('Muc cho dong bo','Pending Items')+'</div>';
  html+='<div style="font-size:28px;font-weight:800">'+state.offlineQueue.length+'</div></div>';
  html+='<button class="ms-btn ms-btn-primary" data-action="sync-now"'+(online&&state.offlineQueue.length?'':' disabled style="opacity:.4"')+'>'+_t('DONG BO','SYNC NOW')+'</button>';
  html+='</div>';

  if(state.offlineQueue.length){
    state.offlineQueue.forEach(function(item, idx){
      html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border,#f1f5f9);font-size:14px">';
      html+='<div><span class="ms-sync-dot ms-sync-pending" style="margin-right:6px"></span>'+_esc(item.action||'-')+'</div>';
      html+='<div style="font-size:12px;color:var(--text-secondary,#94a3b8)">'+_fmtTime(item.timestamp)+'</div>';
      html+='</div>';
    });
  }
  html+='</div>';

  /* conflict resolution */
  var conflicts=(state.syncHistory||[]).filter(function(h){return h.conflict;});
  if(conflicts.length){
    html+='<div class="ms-card"><h4 style="margin:0 0 8px;font-size:16px;color:#ef4444">'+_t('Xung dot','Conflicts')+'</h4>';
    conflicts.forEach(function(c){
      html+='<div style="padding:8px 0;border-bottom:1px solid var(--border,#f1f5f9)">';
      html+='<div style="font-size:14px;font-weight:600">'+_esc(c.description||'-')+'</div>';
      html+='<div style="display:flex;gap:8px;margin-top:6px">';
      html+='<button class="ms-btn ms-btn-primary" style="padding:8px 16px;font-size:.8125rem" data-action="resolve-conflict" data-id="'+_esc(c.id)+'" data-resolution="server">'+_t('Nhan Server','Accept Server')+'</button>';
      html+='<button class="ms-btn ms-btn-secondary" style="padding:8px 16px;font-size:.8125rem" data-action="resolve-conflict" data-id="'+_esc(c.id)+'" data-resolution="client">'+_t('Giu Client','Keep Client')+'</button>';
      html+='</div></div>';
    });
    html+='</div>';
  }

  /* sync history */
  var hist=(state.syncHistory||[]).filter(function(h){return !h.conflict;}).slice(0,20);
  if(hist.length){
    html+='<div class="ms-card"><h4 style="margin:0 0 8px;font-size:16px">'+_t('Lich su dong bo','Sync History')+'</h4>';
    hist.forEach(function(h){
      html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border,#f1f5f9);font-size:14px">';
      html+='<span>'+_esc(h.description||h.action||'-')+'</span>';
      html+='<span style="font-size:12px;color:var(--text-secondary,#94a3b8)">'+_fmtTime(h.timestamp)+'</span>';
      html+='</div>';
    });
    html+='</div>';
  }
  return html;
}

/* -- data loading --------------------------------------------- */
function _loadQueue(){
  state.loading=true; _paint();
  _api('mobile_queue', {operator_id:state.operatorId}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.queue=r.queue||[];
      state.timeEntries=r.time_entries||[];
      state.currentTask=r.current_task||state.currentTask;
      state.clockedIn=r.clocked_in||null;
      state.clockStartTime=r.clock_start?new Date(r.clock_start).getTime():null;
      state.syncHistory=r.sync_history||[];
    }
    _paint();
    if(state.clockedIn) _startTimer();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadInspectionPlan(){
  if(!state.currentTask) return;
  _api('mobile_inspection_plan', {wo_id:state.currentTask.id}).then(function(r){
    if(r&&r.ok){
      state.inspectionPlan=(r.plan||[]).map(function(c){ c._actual=''; return c; });
      state.spcData=r.spc_data||[];
      _paint();
    }
  });
}

/* -- timer ---------------------------------------------------- */
function _startTimer(){
  _stopTimer();
  state.timerInterval=setInterval(function(){
    var el=state.container?state.container.querySelector('#ms-timer-display'):null;
    if(el&&state.clockStartTime){
      el.textContent=_formatDuration(Date.now()-state.clockStartTime);
    }
  }, 1000);
}
function _stopTimer(){
  if(state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; }
}

/* -- main paint ----------------------------------------------- */
function _paint(){
  if(!state.container) return;
  var html='<div class="ms">';
  /* tabs */
  html+='<div class="ms-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="ms-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">';
    html+='<span class="ms-tab-icon">'+tab.icon+'</span>';
    html+='<span>'+_esc(_t(tab.vi,tab.en))+'</span>';
    html+='</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="ms-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'queue':     html+=_renderQueueTab(); break;
      case 'clock':     html+=_renderClockTab(); break;
      case 'first':     html+=_renderFirstPieceTab(); break;
      case 'inprocess': html+=_renderInProcessTab(); break;
      case 'ncr':       html+=_renderNcrTab(); break;
      case 'sync':      html+=_renderSyncTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
  /* restart timer display if clocked in */
  if(state.clockedIn&&state.clockStartTime) _startTimer();
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

      /* Queue */
      case 'refresh-queue':
        _loadQueue(); break;
      case 'start-task':
        var taskId=t.getAttribute('data-id');
        state.currentTask=state.queue.find(function(q){return q.id==taskId;})||null;
        if(_isOnline()){
          _api('mobile_start_task',{task_id:taskId}).then(function(r){
            if(r&&r.ok){ _toast(_t('Da bat dau','Started'),'success'); _loadQueue(); }
            else { _toast(_t('Loi','Error'),'error'); }
          });
        } else {
          _queueOfflineAction('start_task',{task_id:taskId});
          _toast(_t('Da luu offline','Saved offline'),'info');
          _paint();
        }
        break;
      case 'complete-task':
        var cid=t.getAttribute('data-id');
        if(_isOnline()){
          _api('mobile_complete_task',{task_id:cid}).then(function(r){
            if(r&&r.ok){ _toast(_t('Hoan thanh','Completed'),'success'); state.currentTask=null; _loadQueue(); }
            else { _toast(_t('Loi','Error'),'error'); }
          });
        } else {
          _queueOfflineAction('complete_task',{task_id:cid});
          state.currentTask=null;
          _toast(_t('Da luu offline','Saved offline'),'info');
          _paint();
        }
        break;

      /* Time Clock */
      case 'clock-in':
        if(!state.currentTask) break;
        state.clockedIn=state.currentTask;
        state.clockStartTime=Date.now();
        if(_isOnline()){
          _api('mobile_clock_in',{task_id:state.currentTask.id,labor_type:state.laborType});
        } else {
          _queueOfflineAction('clock_in',{task_id:state.currentTask.id,labor_type:state.laborType,start:state.clockStartTime});
        }
        _paint();
        break;
      case 'clock-out':
        _stopTimer();
        var duration=state.clockStartTime?Date.now()-state.clockStartTime:0;
        if(_isOnline()){
          _api('mobile_clock_out',{task_id:(state.clockedIn||{}).id,duration:duration,labor_type:state.laborType}).then(function(r){
            if(r&&r.ok){_toast(_t('Da ket thuc','Clocked out'),'success'); _loadQueue();}
          });
        } else {
          _queueOfflineAction('clock_out',{task_id:(state.clockedIn||{}).id,duration:duration,labor_type:state.laborType});
          _toast(_t('Da luu offline','Saved offline'),'info');
        }
        state.clockedIn=null;
        state.clockStartTime=null;
        _paint();
        break;
      case 'set-labor':
        state.laborType=t.getAttribute('data-type')||'run';
        _paint();
        break;

      /* Inspection */
      case 'load-inspection':
        _loadInspectionPlan(); break;
      case 'camera-first': case 'camera-ncr':
        _toast(_t('Chuc nang camera dang phat trien','Camera feature in development'),'info'); break;
      case 'submit-first':
        var results=[];
        state.inspectionPlan.forEach(function(c,i){
          var inp=state.container.querySelector('#first-actual-'+i);
          results.push({idx:i, actual:inp?inp.value:'', name:c.name});
        });
        if(_isOnline()){
          _api('mobile_submit_first_piece',{task_id:(state.currentTask||{}).id, results:results}).then(function(r){
            if(r&&r.ok){_toast(_t('Da nop','Submitted'),'success'); state.inspectionPlan=[]; _paint();}
            else {_toast(_t('Loi','Error'),'error');}
          });
        } else {
          _queueOfflineAction('submit_first_piece',{task_id:(state.currentTask||{}).id, results:results});
          _toast(_t('Da luu offline','Saved offline'),'info');
          state.inspectionPlan=[]; _paint();
        }
        break;
      case 'submit-inprocess':
        var ipResults=[];
        state.inspectionPlan.forEach(function(c,i){
          var inp=state.container.querySelector('#inprocess-actual-'+i);
          ipResults.push({idx:i, actual:inp?inp.value:'', name:c.name});
        });
        if(_isOnline()){
          _api('mobile_submit_inprocess',{task_id:(state.currentTask||{}).id, sample:state.sampleIndex+1, results:ipResults}).then(function(r){
            if(r&&r.ok){_toast(_t('Da luu mau','Sample saved'),'success');}
            else {_toast(_t('Loi','Error'),'error');}
          });
        } else {
          _queueOfflineAction('submit_inprocess',{task_id:(state.currentTask||{}).id, sample:state.sampleIndex+1, results:ipResults});
          _toast(_t('Da luu offline','Saved offline'),'info');
        }
        break;
      case 'next-sample':
        state.sampleIndex=Math.min(state.sampleIndex+1, state.sampleTotal-1);
        state.inspectionPlan.forEach(function(c){ c._actual=''; });
        _paint();
        break;

      /* NCR */
      case 'select-defect':
        state.selectedDefectType=t.getAttribute('data-type');
        _paint();
        break;
      case 'submit-ncr':
        var ncrData={
          wo_number:(state.container.querySelector('#ms-ncr-wo')||{}).value||'',
          machine:(state.container.querySelector('#ms-ncr-machine')||{}).value||'',
          defect_type:state.selectedDefectType||'',
          severity:state.ncrSeverity,
          description:(state.container.querySelector('#ms-ncr-desc')||{}).value||''
        };
        if(_isOnline()){
          _api('mobile_create_ncr', ncrData).then(function(r){
            if(r&&r.ok){_toast(_t('NCR da tao','NCR created'),'success'); state.selectedDefectType=null; state.ncrSeverity=5; _paint();}
            else {_toast(_t('Loi','Error'),'error');}
          });
        } else {
          _queueOfflineAction('create_ncr', ncrData);
          _toast(_t('NCR da luu offline','NCR saved offline'),'info');
          state.selectedDefectType=null; state.ncrSeverity=5; _paint();
        }
        break;

      /* Sync */
      case 'sync-now':
        if(!_isOnline()||!state.offlineQueue.length) break;
        _api('mobile_sync', {items:state.offlineQueue}).then(function(r){
          if(r&&r.ok){
            state.offlineQueue=[];
            try{ localStorage.removeItem('ms_offline_queue'); }catch(e){}
            _toast(_t('Dong bo thanh cong','Sync complete'),'success');
            _loadQueue();
          } else {_toast(_t('Loi dong bo','Sync error'),'error');}
        });
        break;
      case 'resolve-conflict':
        var conflictId=t.getAttribute('data-id');
        var resolution=t.getAttribute('data-resolution');
        _api('mobile_resolve_conflict',{id:conflictId,resolution:resolution}).then(function(r){
          if(r&&r.ok){_toast(_t('Da giai quyet','Resolved'),'success'); _loadQueue();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
    }
  });

  /* measurement actual input */
  state.container.addEventListener('input', function(e){
    if(e.target.classList.contains('ms-actual-input')){
      var idx=parseInt(e.target.getAttribute('data-idx'));
      var prefix=e.target.getAttribute('data-prefix')||'first';
      if(state.inspectionPlan[idx]!==undefined){
        state.inspectionPlan[idx]._actual=e.target.value;
        /* auto-calc pass/fail */
        var c=state.inspectionPlan[idx];
        var resultEl=state.container.querySelector('#'+prefix+'-result-'+idx);
        if(resultEl&&e.target.value!==''){
          var val=parseFloat(e.target.value);
          var nom=parseFloat(c.nominal)||0;
          var tminus=parseFloat(c.tol_minus)||0;
          var tplus=parseFloat(c.tol_plus)||0;
          var pass=val>=(nom+tminus)&&val<=(nom+tplus);
          resultEl.innerHTML='<div class="'+(pass?'ms-meas-pass':'ms-meas-fail')+'">'+(pass?'PASS':'FAIL')+'</div>';
        } else if(resultEl){
          resultEl.innerHTML='';
        }
      }
    }

    /* severity slider */
    if(e.target.id==='ms-ncr-severity'){
      state.ncrSeverity=parseInt(e.target.value)||5;
      var sevEl=state.container.querySelector('#ms-sev-val');
      if(sevEl) sevEl.textContent=state.ncrSeverity;
    }
  });

  /* online/offline events */
  window.addEventListener('online', function(){ _paint(); });
  window.addEventListener('offline', function(){ _paint(); });
}

/* -- entry point ---------------------------------------------- */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='queue';
  state.currentTask=null;
  state.clockedIn=null;
  state.inspectionPlan=[];
  state.selectedDefectType=null;
  state.ncrSeverity=5;
  state.sampleIndex=0;
  _loadOfflineQueue();
  _paint();
  _bind();
  _loadQueue();
}

window._renderMobileShopFloor = render;

})();

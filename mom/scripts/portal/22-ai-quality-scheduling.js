/* ===================================================================
   22-ai-quality-scheduling.js
   HESEM MOM Portal - AI Predictive Quality + APS Scheduling
   Prediction dashboard, SPC anomaly monitoring, tool wear forecasts,
   Gantt scheduling, capacity heatmap, and promise calculator.
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
function _fmtDateTime(v){ if(!v) return ''; var d=new Date(v); return isNaN(d.getTime())?String(v):_fmtDate(v)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

/* ── constants ────────────────────────────────────────── */
var STYLE_ID_AQ = 'aq-styles';
var STYLE_ID_SC = 'sc-styles';
var TABS = [
  { key:'predictions', vi:'Du doan',        en:'Predictions',     section:'ai' },
  { key:'spc',         vi:'SPC',            en:'SPC Monitor',     section:'ai' },
  { key:'toolwear',    vi:'Hao mon dao',    en:'Tool Wear',       section:'ai' },
  { key:'maintenance', vi:'Bao tri du doan', en:'Predictive Maintenance', section:'ai' },
  { key:'gantt',       vi:'Gantt',          en:'Gantt Schedule',  section:'sched' },
  { key:'heatmap',     vi:'Cong suat',      en:'Capacity Heatmap', section:'sched' },
  { key:'promise',     vi:'Hen giao',       en:'Promise Calculator', section:'sched' },
  { key:'machines',    vi:'Trang thai may',  en:'Machine Status',     section:'machines' }
];

var SEVERITY_COLORS = {
  info:     'var(--blue-light,#3b82f6)',
  watch:    'var(--amber-light,#f59e0b)',
  warning:  '#f97316',
  critical: 'var(--red-light,#ef4444)'
};

var SLOT_COLORS = {
  production:  'var(--blue-light,#3b82f6)',
  setup:       'var(--amber-light,#f59e0b)',
  maintenance: '#9ca3af',
  idle:        '#e5e7eb'
};

var SPC_RULES = {
  WE1:{ label:'1 point > 3\u03c3',       severity:'critical' },
  WE2:{ label:'2 of 3 > 2\u03c3',        severity:'warning' },
  WE3:{ label:'4 of 5 > 1\u03c3',        severity:'watch' },
  WE4:{ label:'8 consecutive same side',  severity:'watch' },
  NELSON1:{ label:'1 point > 3\u03c3',    severity:'critical' },
  NELSON2:{ label:'9 points same side',   severity:'warning' },
  NELSON3:{ label:'6 points trending',    severity:'watch' },
  NELSON4:{ label:'14 alternating',       severity:'info' },
  NELSON5:{ label:'2 of 3 > 2\u03c3',    severity:'warning' },
  NELSON6:{ label:'4 of 5 > 1\u03c3',    severity:'watch' },
  NELSON7:{ label:'15 within 1\u03c3',    severity:'info' },
  NELSON8:{ label:'8 points > 1\u03c3 both sides', severity:'watch' }
};

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'predictions',
  predictions: [],
  spcViolations: [],
  toolWear: [],
  schedule: [],
  capacity: {},
  conflicts: [],
  promiseResult: null,
  kpi: {},
  filters: {},
  dateRange: { start:'', end:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false,
  /* machine status tab */
  machines: [],
  machineDetail: null,       // expanded machine_id or null
  machineRefreshTimer: null,
  machineCharts: []          // track chart DOM refs for cleanup
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(!document.getElementById(STYLE_ID_AQ)){
    var s=document.createElement('style'); s.id=STYLE_ID_AQ;
    s.textContent=[
      '.aq{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
      '.aq-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
      '.aq-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
      '.aq-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
      '.aq-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
      '.aq-tab-sep{width:1px;background:var(--border,#e2e8f0);margin:4px 8px;align-self:stretch}',
      '.aq-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
      '.aq-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
      '.aq-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
      '.aq-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
      '.aq-kpi-sub{font-size:.6875rem;color:var(--text-secondary,#64748b);margin-top:2px}',
      '.aq-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
      '.aq-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;margin-bottom:12px;transition:box-shadow .15s}',
      '.aq-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.06)}',
      '.aq-btn{display:inline-flex;align-items:center;gap:var(--space-2,6px);padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
      '.aq-btn-primary{background:var(--brand,#1565c0);color:#fff}',
      '.aq-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
      '.aq-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
      '.aq-btn-secondary:hover{background:var(--bg-hover,#e2e8f0)}',
      '.aq-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
      '.aq-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
      '.aq-filters select,.aq-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
      '.aq-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
      '.aq-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
      '.aq-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
      '.aq-table tr:hover td{background:var(--surface,#f8fafc)}',
      '.aq-spc-chart{display:flex;align-items:flex-end;gap:2px;height:80px;padding:4px 0;position:relative}',
      '.aq-spc-bar{flex:1;min-width:3px;border-radius:2px 2px 0 0;transition:height .2s}',
      '.aq-spc-limit{position:absolute;left:0;right:0;border-top:1px dashed var(--red-light,#ef4444);font-size:.6rem;color:var(--red-light,#ef4444)}',
      '.aq-spc-center{position:absolute;left:0;right:0;border-top:1px solid var(--green-light,#22c55e);font-size:.6rem;color:var(--green-light,#22c55e)}',
      '.aq-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
      '.aq-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
      '.aq-form input,.aq-form select,.aq-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
      '.aq-toolwear-bar{height:12px;border-radius:var(--radius-md,6px);background:var(--bg-hover,#e2e8f0);overflow:hidden;position:relative}',
      '.aq-toolwear-fill{height:100%;border-radius:6px;transition:width .3s}'
    ].join('\n');
    document.head.appendChild(s);
  }
  if(!document.getElementById(STYLE_ID_SC)){
    var s2=document.createElement('style'); s2.id=STYLE_ID_SC;
    s2.textContent=[
      '.sc-gantt{overflow-x:auto;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--surface,#fff);position:relative}',
      '.sc-gantt-header{display:flex;position:sticky;top:0;background:var(--surface,#f8fafc);border-bottom:2px solid var(--border,#e2e8f0);z-index:2}',
      '.sc-gantt-label{min-width:140px;max-width:140px;padding:8px 12px;font-size:.75rem;font-weight:700;color:var(--text-secondary,#64748b);border-right:1px solid var(--border,#e2e8f0);position:sticky;left:0;background:inherit;z-index:3}',
      '.sc-gantt-row{display:flex;border-bottom:1px solid var(--border,#f1f5f9);min-height:36px;position:relative}',
      '.sc-gantt-cell{min-width:60px;border-right:1px solid var(--border,#f1f5f9);position:relative}',
      '.sc-gantt-bar{position:absolute;top:4px;bottom:4px;border-radius:var(--radius-sm,4px);cursor:pointer;font-size:.6rem;color:var(--text-inverse,#fff);display:flex;align-items:center;padding:0 6px;overflow:hidden;white-space:nowrap;z-index:1}',
      '.sc-gantt-bar.conflict{border:2px solid var(--red-light,#ef4444)}',
      '.sc-gantt-today{position:absolute;top:0;bottom:0;width:2px;background:var(--red-light,#ef4444);z-index:2}',
      '.sc-gantt-today::before{content:"Today";position:absolute;top:-14px;left:-14px;font-size:.6rem;color:var(--red-light,#ef4444);font-weight:700}',
      '.sc-heatmap{display:grid;gap:2px;font-size:.6875rem}',
      '.sc-heatmap-cell{padding:8px;text-align:center;border-radius:4px;font-weight:700;cursor:pointer;min-height:40px;display:flex;align-items:center;justify-content:center}',
      '.sc-heatmap-header{font-weight:700;color:var(--text-secondary,#64748b);padding:8px;text-align:center;font-size:.6875rem}',
      '.sc-promise{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px}',
      '.sc-promise-result{margin-top:16px;padding:16px;border-radius:10px;border:1px solid var(--border,#e2e8f0)}',
      '.sc-promise-timeline{display:flex;align-items:center;gap:4px;margin-top:12px;padding:8px;background:var(--surface,#f8fafc);border-radius:6px;overflow-x:auto}',
      '.sc-promise-slot{padding:4px 8px;border-radius:4px;font-size:.6875rem;font-weight:600;white-space:nowrap}'
    ].join('\n');
    document.head.appendChild(s2);
  }
}

/* ── badge / KPI helpers ─────────────────────────────── */
function _sevBadge(severity){
  var color=SEVERITY_COLORS[severity]||'var(--text-secondary,#64748b)';
  return '<span class="aq-badge" style="background:'+color+'">'+_esc(severity)+'</span>';
}
function _kpiCard(label, value, color, sub){
  var html='<div class="aq-kpi"><div class="aq-kpi-label">'+_esc(label)+'</div><div class="aq-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div>';
  if(sub) html+='<div class="aq-kpi-sub">'+_esc(sub)+'</div>';
  html+='</div>';
  return html;
}

/* ── tab: prediction dashboard ───────────────────────── */
function _renderPredictionsTab(){
  var k=state.kpi;
  var html='<div class="aq-kpis">'
    +_kpiCard(_t('Du doan hoat dong','Active Predictions'), k.active_predictions||0, 'var(--blue-light,#3b82f6)')
    +_kpiCard(_t('Do chinh xac','Accuracy Rate'), (k.accuracy_rate||0)+'%', 'var(--green-light,#22c55e)')
    +_kpiCard(_t('Loi da ngan','Prevented Defects'), k.prevented_defects||0, 'var(--purple-light,#8b5cf6)')
    +_kpiCard(_t('Chi phi tiet kiem','Cost Saved'), '$'+_esc(k.cost_saved||0), 'var(--green-light,#10b981)')
  +'</div>';

  if(!state.predictions.length) return html+'<div class="aq-empty">'+_t('Khong co du doan','No active predictions')+'</div>';

  state.predictions.forEach(function(pred){
    var sevColor=SEVERITY_COLORS[pred.severity]||'var(--text-secondary,#64748b)';
    html+='<div class="aq-card" style="border-left:4px solid '+sevColor+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3,12px)">'
        +'<div style="display:flex;align-items:center;gap:var(--space-2,8px)">'
          +'<span style="font-size:var(--text-lg,1.25rem)">'+_esc(pred.icon||'\u26a0\ufe0f')+'</span>'
          +'<strong>'+_esc(pred.title||pred.type||'-')+'</strong>'
        +'</div>'
        +'<div style="display:flex;gap:var(--space-2,6px);align-items:center">'
          +_sevBadge(pred.severity)
          +'<span class="aq-badge" style="background:var(--brand,#1565c0)">'+_esc(pred.confidence||0)+'%</span>'
        +'</div>'
      +'</div>'
      +'<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:var(--space-2,6px)">'
        +_esc(pred.item||'-')+' | '+_esc(pred.machine||'-')+' | '+_esc(pred.operator||'-')
      +'</div>'
      +'<div style="font-size:.8125rem;margin-top:var(--space-2,6px)">'+_esc(pred.recommendation||'-')+'</div>'
      +'<div style="display:flex;gap:var(--space-2,6px);margin-top:var(--space-3,10px)">'
        +'<button class="aq-btn aq-btn-secondary" style="padding:var(--space-1,4px) var(--space-3,10px);font-size:var(--text-xs,.75rem)" data-action="acknowledge-pred" data-id="'+_esc(pred.id)+'">'+_t('Xac nhan','Acknowledge')+'</button>'
        +'<button class="aq-btn" style="padding:var(--space-1,4px) var(--space-3,10px);font-size:var(--text-xs,.75rem);background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)" data-action="resolve-pred" data-id="'+_esc(pred.id)+'">'+_t('Giai quyet','Resolve')+'</button>'
        +'<button class="aq-btn" style="padding:var(--space-1,4px) var(--space-3,10px);font-size:var(--text-xs,.75rem);background:var(--text-secondary,#94a3b8);color:var(--text-inverse,#fff)" data-action="false-positive" data-id="'+_esc(pred.id)+'">'+_t('Bao dong gia','False Positive')+'</button>'
      +'</div>'
    +'</div>';
  });
  return html;
}

/* ── tab: Enhanced SPC quality prediction (ECharts) ─── */
function _renderSpcTab(){
  var html='';

  /* Part/characteristic selector */
  html+='<div class="aq-spc-controls" style="display:flex;gap:var(--space-sm,10px);margin-bottom:var(--space-md,16px);flex-wrap:wrap;align-items:center">';
  html+='<input id="aq-spc-part" placeholder="'+_t('Ma chi tiet...','Part number...')+'" style="padding:var(--space-xs,4px) var(--space-sm,8px);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-sm,4px);background:var(--surface,#fff);color:var(--text,#0f172a);flex:1;min-width:150px;">';
  html+='<input id="aq-spc-char" placeholder="'+_t('Dac tinh...','Characteristic...')+'" style="padding:var(--space-xs,4px) var(--space-sm,8px);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-sm,4px);background:var(--surface,#fff);color:var(--text,#0f172a);flex:1;min-width:150px;">';
  html+='<button class="aq-btn aq-btn-primary" data-action="load-spc">'+_t('Xem','View')+'</button>';
  html+='<button class="aq-btn aq-btn-secondary" data-action="predict-next">'+_t('Du doan tiep','Predict Next')+'</button>';
  html+='</div>';

  /* Main layout: charts + capability panel */
  html+='<div style="display:flex;gap:var(--space-md,16px);flex-wrap:wrap;">';

  /* X-bar & R chart column */
  html+='<div style="flex:1;min-width:300px;">';
  html+='<div id="aq-spc-xbar" class="ai-chart-wrap" style="height:300px;"></div>';
  html+='<div id="aq-spc-rchart" class="ai-chart-wrap" style="height:200px;margin-top:var(--space-sm,8px);"></div>';
  html+='</div>';

  /* Capability side panel */
  html+='<div style="width:200px;min-width:180px;">';
  html+='<div class="ai-kpi-card" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">Cp</div><div id="aq-spc-cp" class="ai-kpi-value">&mdash;</div></div>';
  html+='<div class="ai-kpi-card" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">Cpk</div><div id="aq-spc-cpk" class="ai-kpi-value">&mdash;</div></div>';
  html+='<div class="ai-kpi-card" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">Pp</div><div id="aq-spc-pp" class="ai-kpi-value">&mdash;</div></div>';
  html+='<div class="ai-kpi-card" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">Ppk</div><div id="aq-spc-ppk" class="ai-kpi-value">&mdash;</div></div>';
  html+='<div id="aq-spc-status" class="ai-kpi-card"></div>';
  html+='</div>';

  html+='</div>'; /* end flex layout */

  /* Anomaly details section */
  html+='<div id="aq-spc-anomalies" style="margin-top:var(--space-md,16px);"></div>';

  /* Also show existing SPC violations as cards below if any */
  if(state.spcViolations.length){
    html+='<h4 style="margin:var(--space-md,16px) 0 var(--space-sm,8px);color:var(--text,#0f172a);">'+_t('Vi pham SPC gan day','Recent SPC Violations')+'</h4>';
    state.spcViolations.forEach(function(v){
      var rule=SPC_RULES[v.rule_code]||{label:v.rule_code,severity:'info'};
      var sevColor=SEVERITY_COLORS[rule.severity]||'var(--text-secondary,#64748b)';
      html+='<div class="aq-card" style="border-left:4px solid '+sevColor+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center">'
          +'<div><strong>'+_esc(v.rule_code)+'</strong> - '+_esc(rule.label)+'</div>'
          +_sevBadge(rule.severity)
        +'</div>'
        +'<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:var(--space-1,4px)">'
          +_t('Dac tinh','Characteristic')+': '+_esc(v.characteristic||'-')
          +' | '+_t('May','Machine')+': '+_esc(v.machine||'-')
          +' | '+_fmtDateTime(v.detected_at)
        +'</div>'
        +'<div style="font-size:.8125rem;margin-top:var(--space-2,6px)"><strong>'+_t('Khuyen nghi','Recommendation')+':</strong> '+_esc(v.recommended_action||'-')+'</div>'
      +'</div>';
    });
  }

  return html;
}

function _loadSpcData(){
  var partEl=document.getElementById('aq-spc-part');
  var charEl=document.getElementById('aq-spc-char');
  var partNum=partEl?partEl.value.trim():'';
  var charName=charEl?charEl.value.trim():'';

  if(!partNum&&!charName){
    _toast(_t('Nhap ma chi tiet hoac dac tinh','Enter part number or characteristic'),'warning');
    return;
  }

  _api('spc_chart_data',{part_number:partNum,characteristic:charName}).then(function(r){
    if(!r||!r.ok){
      _toast(_t('Khong co du lieu SPC','No SPC data found'),'warning');
      return;
    }
    var data=r.data||r;
    _renderSpcCharts(data);
  }).catch(function(){
    _toast(_t('Loi ket noi','Connection error'),'error');
  });
}

function _renderSpcCharts(data){
  var xbarEl=document.getElementById('aq-spc-xbar');
  if(!xbarEl||!window.HmChart) return;

  /* Build anomaly index array from anomalies list */
  var anomalyIndices=[];
  var anomalies=data.anomalies||[];
  anomalies.forEach(function(a){
    if(typeof a==='number') anomalyIndices.push(a);
    else if(a.index!=null) anomalyIndices.push(a.index);
  });

  /* X-bar chart */
  var spcOpts={
    data:      data.measurements||data.data||[],
    ucl:       data.ucl,
    lcl:       data.lcl,
    cl:        data.center_line||data.cl,
    anomalies: anomalyIndices,
    title:     _t('Bieu do X-bar','X-bar Chart')
  };

  /* Add sigma zones if available */
  if(data.sigma1!=null) spcOpts.sigma1=data.sigma1;
  if(data.sigma2!=null) spcOpts.sigma2=data.sigma2;

  HmChart.create(xbarEl,'spc',spcOpts);

  /* R-chart */
  var rEl=document.getElementById('aq-spc-rchart');
  if(rEl&&(data.ranges||data.r_data)){
    HmChart.create(rEl,'spc',{
      data:  data.ranges||data.r_data||[],
      ucl:   data.r_ucl,
      lcl:   data.r_lcl||0,
      cl:    data.r_cl,
      title: _t('Bieu do R','R Chart')
    });
  }

  /* Update capability values */
  _updateSpcCapability(data.capability||{});

  /* Show anomaly details */
  _renderSpcAnomalies(anomalies, data);
}

function _updateSpcCapability(cap){
  var fields=['cp','cpk','pp','ppk'];
  fields.forEach(function(f){
    var el=document.getElementById('aq-spc-'+f);
    if(!el) return;
    var val=cap[f]||cap[f.charAt(0).toUpperCase()+f.slice(1)];
    if(val===undefined||val===null){ el.textContent='\u2014'; el.style.color=''; return; }
    val=parseFloat(val);
    el.textContent=val.toFixed(2);
    /* Color: green >= 1.67, yellow 1.33-1.67, red < 1.33 */
    el.style.color=val>=1.67?'var(--green,#22c55e)':val>=1.33?'var(--amber,#f59e0b)':'var(--red,#ef4444)';
  });

  /* Update status card */
  var statusEl=document.getElementById('aq-spc-status');
  if(statusEl){
    var cpk=parseFloat(cap.cpk||cap.Cpk||0);
    var statusText, statusColor;
    if(cpk>=1.67){ statusText=_t('Qua trinh xuat sac','Process Excellent'); statusColor='var(--green,#22c55e)'; }
    else if(cpk>=1.33){ statusText=_t('Qua trinh tot','Process Good'); statusColor='var(--amber,#f59e0b)'; }
    else if(cpk>=1.0){ statusText=_t('Qua trinh chap nhan','Process Acceptable'); statusColor='var(--amber,#f59e0b)'; }
    else { statusText=_t('Qua trinh kem','Process Poor'); statusColor='var(--red,#ef4444)'; }
    statusEl.innerHTML='<div class="ai-kpi-label">'+_t('Trang thai','Status')+'</div><div class="ai-kpi-value" style="font-size:var(--text-sm,.875rem);color:'+statusColor+'">'+statusText+'</div>';
  }
}

function _renderSpcAnomalies(anomalies, data){
  var el=document.getElementById('aq-spc-anomalies');
  if(!el||!anomalies.length) return;

  var html='<h4 style="color:var(--text,#0f172a);margin-bottom:var(--space-sm,8px);">'+_t('Bat thuong phat hien','Detected Anomalies')+'</h4>';
  html+='<table class="aq-table"><thead><tr><th>#</th><th>'+_t('Vi tri','Position')+'</th><th>'+_t('Gia tri','Value')+'</th><th>'+_t('Loai','Type')+'</th></tr></thead><tbody>';
  anomalies.forEach(function(a,i){
    var idx=typeof a==='number'?a:(a.index!=null?a.index:i);
    var val=typeof a==='number'?(data.measurements?data.measurements[a]:'-'):(a.value||'-');
    var type=typeof a==='object'?(a.rule||a.type||'-'):'-';
    html+='<tr><td>'+(i+1)+'</td><td>'+_esc(idx)+'</td><td>'+_esc(val)+'</td><td>'+_esc(type)+'</td></tr>';
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}

function _handlePredictNext(){
  var partEl=document.getElementById('aq-spc-part');
  var charEl=document.getElementById('aq-spc-char');
  var partNum=partEl?partEl.value.trim():'';
  var charName=charEl?charEl.value.trim():'';

  if(!partNum&&!charName){
    _toast(_t('Nhap ma chi tiet hoac dac tinh','Enter part number or characteristic'),'warning');
    return;
  }

  _toast(_t('Dang du doan...','Predicting...'),'info');

  _api('ai_spc_predict',{part_number:partNum,characteristic:charName}).then(function(r){
    if(!r||!r.ok){
      _toast(_t('Loi du doan','Prediction error'),'error');
      return;
    }
    var data=r.data||r;

    /* Re-render SPC chart with forecast overlay if possible */
    var xbarEl=document.getElementById('aq-spc-xbar');
    if(xbarEl&&window.HmChart&&data.forecast){
      /* Build a timeseries view with actuals + forecast */
      var actuals=(data.measurements||data.data||[]).map(function(v,i){ return [i,v]; });
      var forecastData=(data.forecast.data||data.forecast||[]).map(function(v,i){ return [actuals.length+i,v]; });

      HmChart.create(xbarEl,'timeseries',{
        seriesName: _t('Gia tri do','Measured'),
        data: actuals,
        xType: 'category',
        forecastName: _t('Du doan','Forecast'),
        forecast: forecastData,
        confidenceUpper: data.forecast.upper?data.forecast.upper.map(function(v,i){ return [actuals.length+i,v]; }):null,
        confidenceLower: data.forecast.lower?data.forecast.lower.map(function(v,i){ return [actuals.length+i,v]; }):null,
        yAxisName: data.unit||'',
        title: _t('Bieu do X-bar voi du doan','X-bar with Forecast')
      });
    }
    _toast(_t('Du doan hoan tat','Prediction complete'),'success');
  }).catch(function(){
    _toast(_t('Loi ket noi','Connection error'),'error');
  });
}

/* ── tab: tool wear predictions ──────────────────────── */
function _renderToolWearTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Du doan hao mon dao','Tool Wear Predictions')+'</h3>';

  if(!state.toolWear.length) return html+'<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';

  html+='<table class="aq-table"><thead><tr><th>'+_t('May','Machine')+'</th><th>'+_t('Dao','Tool')+'</th><th>'+_t('Con lai','Remaining')+'</th><th>'+_t('Do chinh xac','Accuracy')+'</th><th>'+_t('Trang thai','Status')+'</th></tr></thead><tbody>';
  state.toolWear.forEach(function(tw){
    var pct=Math.min(100,Math.max(0, (tw.remaining_min||0)/(tw.total_life_min||1)*100));
    var color=pct<=20?'var(--red-light,#ef4444)':pct<=40?'var(--amber-light,#f59e0b)':'var(--green-light,#22c55e)';
    var alert=tw.remaining_min<30;
    html+='<tr'+(alert?' style="background:var(--red-light-bg,#fef2f2)"':'')+'>'
      +'<td>'+_esc(tw.machine||'-')+'</td>'
      +'<td>'+_esc(tw.tool_name||'-')+'</td>'
      +'<td>'
        +'<div style="display:flex;align-items:center;gap:var(--space-2,8px)">'
          +'<div class="aq-toolwear-bar" style="width:120px"><div class="aq-toolwear-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'
          +'<span style="font-weight:700;color:'+color+'">'+_esc(tw.remaining_min||0)+' '+_t('phut','min')+'</span>'
        +'</div>'
      +'</td>'
      +'<td>'+_esc((tw.prediction_accuracy||0)+'%')+'</td>'
      +'<td>'+(alert?'<span class="aq-badge" style="background:var(--red-light,#ef4444)">'+_t('Canh bao','Alert')+'</span>':'<span class="aq-badge" style="background:var(--green-light,#22c55e)">OK</span>')+'</td>'
    +'</tr>';
  });
  html+='</tbody></table>';
  return html;
}

/* ── tab: Enhanced Gantt schedule (ECharts) ─────────── */
function _renderGanttTab(){
  var html='';

  /* Controls bar */
  html+='<div class="aq-gantt-controls" style="display:flex;gap:var(--space-sm,10px);margin-bottom:var(--space-md,16px);flex-wrap:wrap;align-items:center">';
  html+='<select id="aq-gantt-range" style="padding:var(--space-xs,4px) var(--space-sm,8px);border:1px solid var(--border,#e2e8f0);border-radius:var(--radius-sm,4px);background:var(--surface,#fff);color:var(--text,#0f172a);">';
  html+='<option value="1">'+_t('1 ngay','1 Day')+'</option>';
  html+='<option value="3" selected>'+_t('3 ngay','3 Days')+'</option>';
  html+='<option value="7">'+_t('7 ngay','7 Days')+'</option>';
  html+='</select>';
  html+='<button class="aq-btn aq-btn-primary" data-action="optimize-schedule">'+_t('Toi uu hoa','Optimize')+'</button>';
  html+='<button class="aq-btn aq-btn-secondary" id="aq-gantt-apply-btn" data-action="apply-suggestions" style="display:none;">'+_t('Ap dung goi y','Apply Suggestions')+'</button>';
  html+='</div>';

  /* Gantt chart container */
  html+='<div id="aq-gantt-chart" class="ai-chart-wrap" style="height:400px;"></div>';

  /* Optimization comparison (hidden until optimize is clicked) */
  html+='<div id="aq-gantt-optimization" style="display:none;margin-top:var(--space-md,16px);">';
  html+='<h4 style="color:var(--text,#0f172a);">'+_t('Ket qua toi uu hoa','Optimization Results')+'</h4>';
  html+='<div id="aq-gantt-improvements" class="ai-kpi-row"></div>';
  html+='<div id="aq-gantt-changes" style="margin-top:var(--space-sm,8px);"></div>';
  html+='</div>';

  return html;
}

/* load gantt data for N days and render via ECharts */
function _loadGanttData(days){
  var startDate=new Date().toISOString().slice(0,10);
  var endDate=new Date(Date.now()+days*86400000).toISOString().slice(0,10);

  _api('schedule_slots',{start_date:startDate,end_date:endDate}).then(function(r){
    if(!r||!r.ok){
      var chartEl=document.getElementById('aq-gantt-chart');
      if(chartEl) chartEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu lich trinh','No schedule data')+'</div>';
      return;
    }
    var slots=r.data||r.slots||[];
    _renderGanttChart(slots);
  }).catch(function(){
    var chartEl=document.getElementById('aq-gantt-chart');
    if(chartEl) chartEl.innerHTML='<div class="aq-empty">'+_t('Loi ket noi','Connection error')+'</div>';
  });
}

function _renderGanttChart(slots){
  var chartEl=document.getElementById('aq-gantt-chart');
  if(!chartEl||!window.HmChart) return;

  /* Group slots by machine */
  var machines=[];
  var machineSet={};
  var tasks=[];

  slots.forEach(function(slot){
    var mid=slot.machine_id||slot.machine||'Unknown';
    if(!machineSet[mid]){
      machineSet[mid]=machines.length;
      machines.push(mid);
    }

    var statusColors={
      scheduled:   'var(--info,#3b82f6)',
      in_progress: 'var(--success,#22c55e)',
      delayed:     'var(--danger,#ef4444)',
      setup:       'var(--warning,#f59e0b)',
      completed:   '#888',
      production:  'var(--info,#3b82f6)',
      maintenance: '#9ca3af',
      idle:        '#e5e7eb'
    };

    tasks.push({
      machine:      mid,
      machineIndex: machineSet[mid],
      start:        slot.start_time||slot.start,
      end:          slot.end_time||slot.end,
      name:         slot.wo_number||slot.job_number||'Job',
      status:       slot.status||slot.type||'scheduled',
      color:        statusColors[slot.status||slot.type]||statusColors.scheduled,
      slot_id:      slot.slot_id||slot.id
    });
  });

  if(!machines.length){
    chartEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu lich trinh','No schedule data')+'</div>';
    return;
  }

  HmChart.create(chartEl,'gantt',{
    machines: machines,
    tasks:    tasks
  });
}

function _handleOptimizeSchedule(){
  var rangeEl=document.getElementById('aq-gantt-range');
  var days=rangeEl?parseInt(rangeEl.value,10):3;
  var startDate=new Date().toISOString().slice(0,10);
  var endDate=new Date(Date.now()+days*86400000).toISOString().slice(0,10);

  _toast(_t('Dang toi uu hoa...','Optimizing...'),'info');

  _api('ai_schedule_optimize',{start_date:startDate,end_date:endDate}).then(function(r){
    if(!r||!r.ok){
      _toast(_t('Loi toi uu hoa','Optimization error'),'error');
      return;
    }

    var data=r.data||r;
    var optDiv=document.getElementById('aq-gantt-optimization');
    if(optDiv) optDiv.style.display='block';

    /* Show improvement KPIs */
    var impEl=document.getElementById('aq-gantt-improvements');
    if(impEl){
      var html='';
      html+='<div class="ai-kpi-card accent-success"><div class="ai-kpi-label">'+_t('Giam thoi gian setup','Setup Time Reduction')+'</div><div class="ai-kpi-value" style="color:var(--green,#22c55e)">'+_esc(data.setup_time_reduction||0)+'%</div></div>';
      html+='<div class="ai-kpi-card accent-info"><div class="ai-kpi-label">'+_t('Can bang tai','Load Balance')+'</div><div class="ai-kpi-value" style="color:var(--blue,#3b82f6)">'+_esc(data.load_balance||0)+'%</div></div>';
      html+='<div class="ai-kpi-card accent-warning"><div class="ai-kpi-label">'+_t('Thay doi dung hen','On-Time Change')+'</div><div class="ai-kpi-value" style="color:var(--amber,#f59e0b)">'+(data.on_time_change>0?'+':'')+_esc(data.on_time_change||0)+'%</div></div>';
      impEl.innerHTML=html;
    }

    /* Show changes table */
    var chgEl=document.getElementById('aq-gantt-changes');
    var changes=data.changes||[];
    if(chgEl&&changes.length){
      var tHtml='<table class="aq-table"><thead><tr><th>'+_t('Lenh','Job')+'</th><th>'+_t('May cu','From Machine')+'</th><th>'+_t('May moi','To Machine')+'</th><th>'+_t('Ly do','Reason')+'</th></tr></thead><tbody>';
      changes.forEach(function(c){
        tHtml+='<tr><td>'+_esc(c.wo_number||c.job||'-')+'</td><td>'+_esc(c.from_machine||'-')+'</td><td>'+_esc(c.to_machine||'-')+'</td><td>'+_esc(c.reason||'-')+'</td></tr>';
      });
      tHtml+='</tbody></table>';
      chgEl.innerHTML=tHtml;
    }

    /* Show Apply button */
    var applyBtn=document.getElementById('aq-gantt-apply-btn');
    if(applyBtn) applyBtn.style.display='inline-flex';

    /* Store optimization id for apply */
    state._ganttOptimizationId=data.optimization_id||data.id||null;

    _toast(_t('Toi uu hoa hoan tat','Optimization complete'),'success');
  }).catch(function(){
    _toast(_t('Loi ket noi','Connection error'),'error');
  });
}

function _handleApplySuggestions(){
  if(!state._ganttOptimizationId){
    _toast(_t('Khong co goi y','No suggestions to apply'),'warning');
    return;
  }
  _api('ai_schedule_apply',{optimization_id:state._ganttOptimizationId}).then(function(r){
    if(r&&r.ok){
      _toast(_t('Da ap dung goi y','Suggestions applied'),'success');
      var rangeEl=document.getElementById('aq-gantt-range');
      var days=rangeEl?parseInt(rangeEl.value,10):3;
      _loadGanttData(days);
      var applyBtn=document.getElementById('aq-gantt-apply-btn');
      if(applyBtn) applyBtn.style.display='none';
    } else {
      _toast(_t('Loi ap dung','Apply error'),'error');
    }
  }).catch(function(){
    _toast(_t('Loi ket noi','Connection error'),'error');
  });
}

/* ── tab: capacity heatmap ───────────────────────────── */
function _renderHeatmapTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Ban do cong suat','Capacity Heatmap')+'</h3>';

  var cap=state.capacity;
  var machines=cap.machines||[];
  var days=cap.days||[];

  if(!machines.length||!days.length) return html+'<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';

  var cols=days.length+1;
  html+='<div class="sc-heatmap" style="grid-template-columns:140px repeat('+(cols-1)+',1fr)">';

  /* header row */
  html+='<div class="sc-heatmap-header"></div>';
  days.forEach(function(day){ html+='<div class="sc-heatmap-header">'+_esc(day.label||day.date||'')+'</div>'; });

  /* data rows */
  machines.forEach(function(m){
    html+='<div class="sc-heatmap-header" style="text-align:left">'+_esc(m.name||'-')+'</div>';
    days.forEach(function(day){
      var key=m.id+'_'+day.date;
      var util=(cap.utilization||{})[key];
      var pct=util!=null?util:null;
      var bg,fg;
      if(pct===null){ bg='var(--bg-surface-alt,#f1f5f9)'; fg='var(--text-secondary,#94a3b8)'; }
      else if(pct<=70){ bg='#dcfce7'; fg='var(--green-dark,#166534)'; }
      else if(pct<=90){ bg='#fef3c7'; fg='#92400e'; }
      else { bg='#fecaca'; fg='#991b1b'; }
      html+='<div class="sc-heatmap-cell" style="background:'+bg+';color:'+fg+'" data-action="heatmap-cell" data-machine="'+_esc(m.id)+'" data-day="'+_esc(day.date)+'">'
        +(pct!=null?pct+'%':'-')
      +'</div>';
    });
  });
  html+='</div>';

  /* legend */
  html+='<div style="display:flex;gap:var(--space-4,16px);margin-top:var(--space-3,12px);font-size:var(--text-xs,.75rem)">';
  html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);background:#dcfce7"></div>&le;70%</div>';
  html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);background:#fef3c7"></div>70-90%</div>';
  html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);background:#fecaca"></div>&gt;90%</div>';
  html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);background:var(--bg-surface-alt,#f1f5f9)"></div>'+_t('Khong co DL','No data')+'</div>';
  html+='</div>';
  return html;
}

/* ── tab: promise calculator ─────────────────────────── */
function _renderPromiseTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Tinh ngay hen giao','Promise Calculator')+'</h3>';

  html+='<div class="sc-promise">';
  html+='<div class="aq-form">';
  html+='<div><label>'+_t('Thoi gian gia cong (phut)','Machining Time (min)')+'</label><input type="number" id="aq-f-machining-time" value="'+(state.promiseInput&&state.promiseInput.time||'')+'"></div>';
  html+='<div><label>'+_t('Loai may uu tien','Preferred Machine Type')+'</label><select id="aq-f-machine-type">'
    +'<option value="">'+_t('Tat ca','Any')+'</option>'
    +(function(){ var optHtml=''; if(window.HmRegistry){ var opts=HmRegistry.statusSet('machine_type'); if(opts&&opts.length) opts.forEach(function(o){ optHtml+='<option value="'+o.value+'">'+((typeof lang!=='undefined'&&lang==='en')?(o.labelEn||o.label):o.label)+'</option>'; }); } if(!optHtml) console.warn('[AQ] Registry key "machine_type" trống — machine type dropdown sẽ bị thiếu.'); return optHtml; })()
  +'</select></div>';
  html+='</div>';
  html+='<div style="margin-top:var(--space-3,12px)"><button class="aq-btn aq-btn-primary" data-action="calculate-promise">'+_t('Tinh toan','Calculate')+'</button></div>';

  var result=state.promiseResult;
  if(result){
    html+='<div class="sc-promise-result" style="border-left:var(--space-1,4px) solid '+(result.confidence>=80?'var(--green-light,#22c55e)':result.confidence>=50?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)')+'">';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3,12px)">';
    html+='<div><div style="font-size:.6875rem;text-transform:uppercase;color:var(--text-secondary,#64748b);font-weight:700">'+_t('Ngay hen','Promise Date')+'</div><div style="font-size:1.25rem;font-weight:var(--font-display-weight,800)">'+_fmtDate(result.promise_date)+'</div></div>';
    html+='<div><div style="font-size:.6875rem;text-transform:uppercase;color:var(--text-secondary,#64748b);font-weight:700">'+_t('May','Machine')+'</div><div style="font-size:1.25rem;font-weight:var(--font-display-weight,800)">'+_esc(result.machine_name||'-')+'</div></div>';
    html+='<div><div style="font-size:.6875rem;text-transform:uppercase;color:var(--text-secondary,#64748b);font-weight:700">'+_t('Do tin cay','Confidence')+'</div><div style="font-size:1.25rem;font-weight:800;color:'+(result.confidence>=80?'var(--green-light,#22c55e)':'var(--amber-light,#f59e0b)')+'">'+_esc(result.confidence||0)+'%</div></div>';
    html+='</div>';

    /* mini timeline */
    if(result.timeline){
      html+='<div class="sc-promise-timeline">';
      (result.timeline||[]).forEach(function(slot){
        var color=SLOT_COLORS[slot.type]||'#e5e7eb';
        html+='<div class="sc-promise-slot" style="background:'+color+';color:var(--text-inverse,#fff)">'+_esc(slot.label||slot.type)+'</div>';
        html+='<div style="font-size:.75rem;color:var(--text-secondary,#94a3b8)">\u2192</div>';
      });
      html+='<div class="sc-promise-slot" style="background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)">'+_t('Xong','Done')+'</div>';
      html+='</div>';
    }

    /* alternatives */
    var alts=result.alternatives||[];
    if(alts.length){
      html+='<h5 style="margin:var(--space-4,14px) 0 var(--space-2,8px);font-size:var(--text-xs,.75rem);text-transform:uppercase;color:var(--text-secondary,#64748b)">'+_t('Lua chon thay the','Alternative Options')+'</h5>';
      html+='<table class="aq-table"><thead><tr><th>'+_t('May','Machine')+'</th><th>'+_t('Ngay','Date')+'</th><th>'+_t('Do tin cay','Confidence')+'</th></tr></thead><tbody>';
      alts.forEach(function(a){
        html+='<tr><td>'+_esc(a.machine_name||'-')+'</td><td>'+_fmtDate(a.promise_date)+'</td><td>'+_esc(a.confidence||0)+'%</td></tr>';
      });
      html+='</tbody></table>';
    }
    html+='</div>';
  }
  html+='</div>';
  return html;
}

/* ── tab: Predictive Maintenance Dashboard ──────────── */
function _renderMaintenanceTab(){
  var html='';

  /* Tool wear curves chart */
  html+='<h4 style="color:var(--text,#0f172a);margin-bottom:var(--space-sm,8px);">'+_t('Duong cong mai mon dung cu','Tool Wear Curves')+'</h4>';
  html+='<div id="aq-maint-wear-chart" class="ai-chart-wrap" style="height:300px;"></div>';

  /* RUL table */
  html+='<h4 style="color:var(--text,#0f172a);margin:var(--space-md,16px) 0 var(--space-sm,8px);">'+_t('Tuoi tho con lai','Remaining Useful Life')+'</h4>';
  html+='<div id="aq-maint-rul-table"></div>';

  /* Bottom row: cost avoidance + accuracy */
  html+='<div style="display:flex;gap:var(--space-md,16px);margin-top:var(--space-md,16px);flex-wrap:wrap;">';
  html+='<div style="flex:1;min-width:250px;">';
  html+='<h4 style="color:var(--text,#0f172a);margin-bottom:var(--space-sm,8px);">'+_t('Chi phi tranh duoc','Cost Avoidance')+'</h4>';
  html+='<div id="aq-maint-cost" class="ai-kpi-row"></div>';
  html+='</div>';
  html+='<div style="flex:1;min-width:250px;">';
  html+='<h4 style="color:var(--text,#0f172a);margin-bottom:var(--space-sm,8px);">'+_t('Do chinh xac du doan','Prediction Accuracy')+'</h4>';
  html+='<div id="aq-maint-accuracy-chart" class="ai-chart-wrap" style="height:200px;"></div>';
  html+='</div>';
  html+='</div>';

  return html;
}

function _loadMaintenanceData(){
  /* Load tool wear predictions */
  _api('tool_wear_predictions').then(function(r){
    if(!r||!r.ok){
      var wEl=document.getElementById('aq-maint-wear-chart');
      if(wEl) wEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
      var tEl=document.getElementById('aq-maint-rul-table');
      if(tEl) tEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
      return;
    }
    var tools=r.data||r.predictions||[];
    _renderWearCurves(tools);
    _renderRulTable(tools);
  }).catch(function(){
    var wEl=document.getElementById('aq-maint-wear-chart');
    if(wEl) wEl.innerHTML='<div class="aq-empty">'+_t('Loi ket noi','Connection error')+'</div>';
  });

  /* Load dashboard for cost/accuracy */
  _api('ai_dashboard_combined').then(function(r){
    if(!r||!r.ok){
      var cEl=document.getElementById('aq-maint-cost');
      if(cEl) cEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
      return;
    }
    var data=r.data||r;
    _renderCostAvoidance(data);
    _renderAccuracyChart(data);
  }).catch(function(){
    var cEl=document.getElementById('aq-maint-cost');
    if(cEl) cEl.innerHTML='<div class="aq-empty">'+_t('Loi ket noi','Connection error')+'</div>';
  });
}

function _renderWearCurves(tools){
  var chartEl=document.getElementById('aq-maint-wear-chart');
  if(!chartEl||!window.HmChart) return;

  if(!tools.length){
    chartEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
    return;
  }

  /* Build multi-series timeseries */
  var series=[];
  tools.forEach(function(tool){
    var wearPct=parseFloat(tool.wear_pct||tool.current_wear||0);
    var rul=parseFloat(tool.remaining_hours||tool.rul_hours||0);

    /* Current point + projected endpoint */
    var now=new Date();
    var failureTime=new Date(now.getTime()+rul*3600000);

    series.push({
      name: tool.tool_id||tool.name||'Tool',
      type: 'line',
      data: [
        [now.toISOString(), wearPct],
        [failureTime.toISOString(), 100]
      ],
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { type: wearPct>80?'solid':'dashed', width: 2 }
    });
  });

  HmChart.create(chartEl,'timeseries',{
    series:     series,
    yAxisName:  _t('Mai mon %','Wear %'),
    title:      _t('Du doan mai mon','Wear Projection'),
    area:       false,
    smooth:     false
  });
}

function _renderRulTable(tools){
  var el=document.getElementById('aq-maint-rul-table');
  if(!el) return;

  if(!tools.length){
    el.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
    return;
  }

  var html='<table class="aq-table"><thead><tr style="border-bottom:2px solid var(--border,#e2e8f0);">';
  html+='<th>'+_t('Dung cu','Tool ID')+'</th>';
  html+='<th style="text-align:center;">'+_t('Mai mon','Wear %')+'</th>';
  html+='<th style="text-align:center;">'+_t('Con lai','RUL')+'</th>';
  html+='<th style="text-align:center;">'+_t('Hanh dong','Action')+'</th>';
  html+='<th style="text-align:center;">'+_t('Tin cay','Confidence')+'</th>';
  html+='</tr></thead><tbody>';

  /* Sort by wear descending */
  tools.sort(function(a,b){
    return (parseFloat(b.wear_pct||b.current_wear||0))-(parseFloat(a.wear_pct||a.current_wear||0));
  });

  tools.forEach(function(tool){
    var wear=parseFloat(tool.wear_pct||tool.current_wear||0);
    var rul=tool.remaining_hours||tool.rul_hours||'?';
    var conf=parseFloat(tool.confidence||0);
    var color=wear>80?'var(--red,#ef4444)':wear>60?'var(--amber,#f59e0b)':'var(--green,#22c55e)';
    var icon=wear>80?'\uD83D\uDD34':wear>60?'\uD83D\uDFE1':'\uD83D\uDFE2';
    var action=wear>80?_t('Thay the','Replace'):wear>60?_t('Theo doi','Monitor'):'OK';

    html+='<tr style="border-bottom:1px solid var(--border,#e2e8f0);">';
    html+='<td>'+icon+' '+_esc(tool.tool_id||tool.name||'')+'</td>';
    html+='<td style="text-align:center;color:'+color+';font-weight:600;">'+wear.toFixed(0)+'%</td>';
    html+='<td style="text-align:center;">~'+_esc(String(rul))+'h</td>';
    html+='<td style="text-align:center;">';
    if(wear>60){
      html+='<button class="aq-btn aq-btn-secondary" data-action="schedule-pm" data-tool="'+_esc(tool.tool_id||'')+'" style="padding:var(--space-1,4px) var(--space-sm,8px);font-size:var(--text-xs,.75rem);">'+action+'</button>';
    } else {
      html+=action;
    }
    html+='</td>';
    html+='<td style="text-align:center;">'+conf.toFixed(0)+'%</td>';
    html+='</tr>';
  });

  html+='</tbody></table>';
  el.innerHTML=html;
}

function _renderCostAvoidance(data){
  var el=document.getElementById('aq-maint-cost');
  if(!el) return;

  var maint=data.maintenance||data.cost_avoidance||data;
  var html='';
  html+='<div class="ai-kpi-card accent-success" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">'+_t('Tiet kiem thang nay','Saved This Month')+'</div><div class="ai-kpi-value" style="color:var(--green,#22c55e)">$'+_esc(maint.monthly_savings||maint.saved_this_month||0)+'</div></div>';
  html+='<div class="ai-kpi-card accent-info" style="margin-bottom:var(--space-sm,8px);"><div class="ai-kpi-label">'+_t('Su co tranh duoc','Incidents Prevented')+'</div><div class="ai-kpi-value" style="color:var(--blue,#3b82f6)">'+_esc(maint.incidents_prevented||0)+'</div></div>';
  html+='<div class="ai-kpi-card accent-purple"><div class="ai-kpi-label">'+_t('Thoi gian hoat dong them','Extra Uptime')+'</div><div class="ai-kpi-value" style="color:var(--purple,#7c3aed)">'+_esc(maint.extra_uptime_hours||0)+'h</div></div>';
  el.innerHTML=html;
}

function _renderAccuracyChart(data){
  var chartEl=document.getElementById('aq-maint-accuracy-chart');
  if(!chartEl||!window.HmChart) return;

  var accuracy=data.prediction_accuracy||data.accuracy||{};
  var value=parseFloat(accuracy.overall||accuracy.value||0);

  if(!value&&!accuracy.history){
    chartEl.innerHTML='<div class="aq-empty">'+_t('Khong co du lieu','No data')+'</div>';
    return;
  }

  /* If we have history data, render as timeseries; otherwise as gauge */
  if(accuracy.history&&accuracy.history.length){
    HmChart.create(chartEl,'timeseries',{
      seriesName: _t('Do chinh xac','Accuracy'),
      data: accuracy.history.map(function(pt){ return [pt.date||pt.t, pt.value||pt.v]; }),
      area: true,
      smooth: true,
      yAxisName: '%'
    });
  } else {
    HmChart.create(chartEl,'gauge',{
      value: value,
      min:   0,
      max:   100,
      title: _t('Do chinh xac','Accuracy'),
      unit:  '%'
    });
  }
}

function _handleSchedulePm(toolId){
  if(!toolId) return;
  _toast(_t('Dang len lich bao tri...','Scheduling maintenance...'),'info');
  _api('ai_schedule_pm',{tool_id:toolId}).then(function(r){
    if(r&&r.ok){
      _toast(_t('Da len lich bao tri','Maintenance scheduled'),'success');
    } else {
      _toast(_t('Loi len lich','Scheduling error'),'error');
    }
  }).catch(function(){
    _toast(_t('Loi ket noi','Connection error'),'error');
  });
}

/* ── Machine Status constants ────────────────────────── */
var MACHINE_STATUS_META = {
  running:     { vi:'Dang chay',   en:'Running',     color:'var(--green,#22c55e)' },
  idle:        { vi:'Ranh',        en:'Idle',         color:'var(--amber,#f59e0b)' },
  alarm:       { vi:'Bao dong',    en:'Alarm',        color:'var(--red,#ef4444)' },
  maintenance: { vi:'Bao tri',     en:'Maintenance',  color:'var(--text-secondary,#64748b)' }
};

/* ── tab: machine status ─────────────────────────────── */
function _renderMachinesTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<h3 style="margin:0;display:flex;align-items:center;gap:var(--space-2,8px)">'
      +_t('Trang thai may','Machine Status')
      +' <span class="ai-status-dot ai-sse-status '+(window.HmAiStream?HmAiStream.getStatus():'disconnected')+'"></span>'
      +'<span class="ai-status-label">'+(window.HmAiStream&&HmAiStream.getStatus()==='connected'?'Live':'--')+'</span>'
    +'</h3>'
    +'<button class="aq-btn aq-btn-secondary" data-action="refresh-machines">'+_t('Tai lai','Refresh')+'</button>'
  +'</div>';

  if(!state.machines||!state.machines.length){
    return html+'<div class="aq-empty">'+_t('Khong co du lieu may','No machine data')+'</div>';
  }

  html+='<div class="ai-machine-grid">';
  state.machines.forEach(function(m){
    var st=m.status||'idle';
    var meta=MACHINE_STATUS_META[st]||MACHINE_STATUS_META.idle;
    var oee=m.oee||{};
    var isExpanded=(state.machineDetail===m.machine_id);

    html+='<div class="ai-machine-card '+_esc(st)+'" data-action="toggle-machine" data-machine-id="'+_esc(m.machine_id)+'">';

    /* header */
    html+='<div class="ai-machine-name">'+_esc(m.machine_name||m.machine_id||'-')+'</div>';
    html+='<div class="ai-machine-status">'+_esc(_t(meta.vi,meta.en))+'</div>';

    /* OEE gauge container */
    html+='<div class="ai-chart-wrap" style="margin-top:var(--space-3,12px);padding:var(--space-2,8px);border:none;box-shadow:none">'
      +'<div class="ai-machine-oee-gauge" data-machine-oee="'+_esc(m.machine_id)+'" style="height:120px"></div>'
    +'</div>';

    /* current job */
    if(m.current_job){
      html+='<div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);margin-top:var(--space-2,8px)">'
        +'<strong>'+_t('Lenh','Job')+':</strong> '+_esc(m.current_job.wo_number||'-')
        +' | '+_esc(m.current_job.part_number||'-')
        +' | Op '+_esc(m.current_job.operation||'-')
      +'</div>';
    }

    /* telemetry mini metrics */
    var tel=m.telemetry||{};
    html+='<div class="ai-machine-metrics">'
      +'<div class="ai-machine-metric">'+_t('Rung','Vibration')+'<strong>'+_esc(tel.vibration_rms!=null?tel.vibration_rms.toFixed(2):'-')+' mm/s</strong></div>'
      +'<div class="ai-machine-metric">'+_t('Nhiet do','Temp')+'<strong>'+_esc(tel.spindle_temp!=null?tel.spindle_temp.toFixed(1):'-')+' C</strong></div>'
      +'<div class="ai-machine-metric">'+_t('Tai','Load')+'<strong>'+_esc(tel.spindle_load!=null?tel.spindle_load+'%':'-')+'</strong></div>'
      +'<div class="ai-machine-metric">OEE<strong style="color:'+((oee.overall||0)>=80?'var(--green,#22c55e)':(oee.overall||0)>=60?'var(--amber,#f59e0b)':'var(--red,#ef4444)')+'">'+_esc((oee.overall||0).toFixed(1))+'%</strong></div>'
    +'</div>';

    /* AI prediction badges */
    var preds=m.predictions||[];
    if(preds.length){
      html+='<div style="display:flex;flex-wrap:wrap;gap:var(--space-1,4px);margin-top:var(--space-2,8px)">';
      preds.forEach(function(p){
        var confClass=p.confidence>=80?'high-confidence':p.confidence>=50?'medium-confidence':'low-confidence';
        html+='<span class="ai-prediction-badge '+confClass+'">'
          +_esc(p.prediction_type||p.message||'-')
          +' <span class="ai-confidence-bar"><span class="ai-confidence-fill" style="width:'+_esc(p.confidence||0)+'%"></span></span>'
          +_esc(p.confidence||0)+'%'
        +'</span>';
      });
      html+='</div>';
    }

    /* expanded detail area */
    if(isExpanded){
      html+='<div style="margin-top:var(--space-4,16px);padding-top:var(--space-4,16px);border-top:1px solid var(--border,#e2e8f0)">';

      /* OEE breakdown */
      html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-2,8px);margin-bottom:var(--space-4,16px)">'
        +'<div style="text-align:center"><div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);text-transform:uppercase;font-weight:700">'+_t('San sang','Availability')+'</div><div style="font-size:var(--text-lg,1.25rem);font-weight:800;color:var(--blue,#3b82f6)">'+_esc((oee.availability||0).toFixed(1))+'%</div></div>'
        +'<div style="text-align:center"><div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);text-transform:uppercase;font-weight:700">'+_t('Hieu suat','Performance')+'</div><div style="font-size:var(--text-lg,1.25rem);font-weight:800;color:var(--amber,#f59e0b)">'+_esc((oee.performance||0).toFixed(1))+'%</div></div>'
        +'<div style="text-align:center"><div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);text-transform:uppercase;font-weight:700">'+_t('Chat luong','Quality')+'</div><div style="font-size:var(--text-lg,1.25rem);font-weight:800;color:var(--green,#22c55e)">'+_esc((oee.quality||0).toFixed(1))+'%</div></div>'
      +'</div>';

      /* vibration chart */
      html+='<div class="ai-chart-wrap">'
        +'<div class="ai-chart-title">'+_t('Rung 24h','24h Vibration')+'</div>'
        +'<div class="ai-chart-area ai-machine-vibration-chart" data-machine-vib="'+_esc(m.machine_id)+'" style="min-height:200px"></div>'
      +'</div>';

      /* temperature chart */
      html+='<div class="ai-chart-wrap">'
        +'<div class="ai-chart-title">'+_t('Nhiet do 24h','24h Temperature')+'</div>'
        +'<div class="ai-chart-area ai-machine-temp-chart" data-machine-temp="'+_esc(m.machine_id)+'" style="min-height:200px"></div>'
      +'</div>';

      /* active predictions list */
      if(preds.length){
        html+='<h5 style="margin:var(--space-3,12px) 0 var(--space-2,8px);font-size:var(--text-xs,.75rem);text-transform:uppercase;color:var(--text-secondary,#64748b);font-weight:700">'+_t('Du doan dang hoat dong','Active Predictions')+'</h5>';
        html+='<table class="aq-table"><thead><tr><th>'+_t('Loai','Type')+'</th><th>'+_t('Muc do','Severity')+'</th><th>'+_t('Do tin cay','Confidence')+'</th><th>'+_t('Thong bao','Message')+'</th></tr></thead><tbody>';
        preds.forEach(function(p){
          var sevColor=SEVERITY_COLORS[p.severity]||'var(--text-secondary,#64748b)';
          html+='<tr>'
            +'<td>'+_esc(p.prediction_type||'-')+'</td>'
            +'<td><span class="aq-badge" style="background:'+sevColor+'">'+_esc(p.severity||'-')+'</span></td>'
            +'<td>'+_esc(p.confidence||0)+'%</td>'
            +'<td>'+_esc(p.message||'-')+'</td>'
          +'</tr>';
        });
        html+='</tbody></table>';
      }

      html+='</div>'; /* end expanded detail */
    }

    html+='</div>'; /* end .ai-machine-card */
  });
  html+='</div>'; /* end .ai-machine-grid */
  return html;
}

/* ── machine data loading ────────────────────────────── */
function _loadMachineData(){
  _api('ai_dashboard', { section:'machines' }).then(function(r){
    if(r&&r.ok){
      state.machines=r.machines||[];
      _paint();
      _initMachineCharts();
    }
  }).catch(function(){
    /* silent fail — will retry on next poll */
  });
}

/* ── initialize ECharts on machine cards ─────────────── */
function _initMachineCharts(){
  if(!state.container||!window.HmChart) return;

  /* OEE gauges */
  var gauges=state.container.querySelectorAll('.ai-machine-oee-gauge');
  for(var i=0;i<gauges.length;i++){
    var gEl=gauges[i];
    var mid=gEl.getAttribute('data-machine-oee');
    var machine=_findMachine(mid);
    if(machine&&machine.oee){
      HmChart.create(gEl, 'gauge', {
        value: machine.oee.overall||0,
        min: 0, max: 100,
        title: 'OEE'
      });
    }
  }

  /* Vibration timeseries (expanded cards) */
  var vibCharts=state.container.querySelectorAll('.ai-machine-vibration-chart');
  for(var v=0;v<vibCharts.length;v++){
    var vEl=vibCharts[v];
    var vmid=vEl.getAttribute('data-machine-vib');
    _loadMachineTelemetry(vmid, 'vibration', vEl);
  }

  /* Temperature timeseries (expanded cards) */
  var tempCharts=state.container.querySelectorAll('.ai-machine-temp-chart');
  for(var tc=0;tc<tempCharts.length;tc++){
    var tEl=tempCharts[tc];
    var tmid=tEl.getAttribute('data-machine-temp');
    _loadMachineTelemetry(tmid, 'temperature', tEl);
  }
}

function _loadMachineTelemetry(machineId, metric, el){
  _api('ai_machine_telemetry', { machine_id:machineId, metric:metric, range:'24h' }).then(function(r){
    if(r&&r.ok&&window.HmChart){
      var seriesName=metric==='vibration'?_t('Rung RMS','Vibration RMS'):_t('Nhiet do truc chinh','Spindle Temp');
      var unit=metric==='vibration'?'mm/s':'C';
      HmChart.create(el, 'timeseries', {
        seriesName: seriesName,
        data: (r.data||[]).map(function(pt){ return [pt.time||pt.t, pt.value||pt.v]; }),
        area: true,
        smooth: true,
        xAxis: { type:'time' },
        yAxisName: unit
      });
    }
  }).catch(function(){ /* silent */ });
}

function _findMachine(id){
  for(var i=0;i<state.machines.length;i++){
    if(state.machines[i].machine_id===id) return state.machines[i];
  }
  return null;
}

/* ── machine auto-refresh (30s polling) ──────────────── */
function _startMachinePolling(){
  _stopMachinePolling();
  _loadMachineData();
  state.machineRefreshTimer=setInterval(function(){
    if(state.activeTab==='machines') _loadMachineData();
  }, 30000);
}

function _stopMachinePolling(){
  if(state.machineRefreshTimer){
    clearInterval(state.machineRefreshTimer);
    state.machineRefreshTimer=null;
  }
}

/* ── SSE integration for machine events ──────────────── */
function _registerMachineSSE(){
  if(!window.HmAiStream) return;

  HmAiStream.on('ai.machine.status_changed', function(data){
    if(state.activeTab!=='machines') return;
    var m=_findMachine(data.machine_id);
    if(m){
      m.status=data.status||m.status;
      if(data.telemetry) m.telemetry=data.telemetry;
      _paint();
      _initMachineCharts();
    }
  });

  HmAiStream.on('ai.machine.telemetry_update', function(data){
    if(state.activeTab!=='machines') return;
    var m=_findMachine(data.machine_id);
    if(m&&data.telemetry){
      m.telemetry=data.telemetry;
      /* lightweight update: just re-render metric numbers without full repaint */
      var card=state.container?state.container.querySelector('[data-machine-id="'+data.machine_id+'"]'):null;
      if(card){
        var metrics=card.querySelectorAll('.ai-machine-metric strong');
        if(metrics.length>=3){
          var tel=data.telemetry;
          metrics[0].textContent=(tel.vibration_rms!=null?tel.vibration_rms.toFixed(2):'-')+' mm/s';
          metrics[1].textContent=(tel.spindle_temp!=null?tel.spindle_temp.toFixed(1):'-')+' C';
          metrics[2].textContent=(tel.spindle_load!=null?tel.spindle_load+'%':'-');
        }
      }
    }
  });

  HmAiStream.on('ai.prediction.created', function(data){
    if(state.activeTab!=='machines') return;
    if(!data.machine_id) return;
    var m=_findMachine(data.machine_id);
    if(m){
      if(!m.predictions) m.predictions=[];
      m.predictions.push(data);
      _paint();
      _initMachineCharts();
    }
  });
}
_registerMachineSSE();

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  state.loading=true; _paint();
  _api('ai_quality_scheduling_data', {
    filters:state.filters,
    date_range:state.dateRange,
    offset:state.pagination.offset,
    limit:state.pagination.limit
  }).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.predictions=r.predictions||[];
      state.spcViolations=r.spc_violations||[];
      state.toolWear=r.tool_wear||[];
      state.schedule=r.schedule||[];
      state.capacity=r.capacity||{};
      state.conflicts=r.conflicts||[];
      state.kpi=r.kpi||{};
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

/* ── build dynamic tabs (includes external AI Chat if available) ── */
function _buildTabs(){
  var tabs = TABS.slice();
  if(window._aiChatRenderer){
    tabs.push({ key:'ai_chat', vi:'Tro ly AI', en:'AI Assistant', section:'ai_ext' });
  }
  return tabs;
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var allTabs = _buildTabs();
  var html='<div class="aq">';
  html+='<div class="aq-tabs">';
  var lastSection='';
  allTabs.forEach(function(tab){
    if(lastSection&&lastSection!==tab.section) html+='<div class="aq-tab-sep"></div>';
    lastSection=tab.section;
    html+='<div class="aq-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.activeTab==='ai_chat' && window._aiChatRenderer){
    html+='<div id="aq-ai-chat-mount"></div>';
    html+='</div>';
    state.container.innerHTML=html;
    var mount=state.container.querySelector('#aq-ai-chat-mount');
    if(mount) window._aiChatRenderer(mount);
    return;
  }
  if(state.loading){
    html+='<div class="aq-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'predictions':  html+=_renderPredictionsTab(); break;
      case 'spc':          html+=_renderSpcTab(); break;
      case 'toolwear':     html+=_renderToolWearTab(); break;
      case 'maintenance':  html+=_renderMaintenanceTab(); break;
      case 'gantt':        html+=_renderGanttTab(); break;
      case 'heatmap':      html+=_renderHeatmapTab(); break;
      case 'promise':      html+=_renderPromiseTab(); break;
      case 'machines':     html+=_renderMachinesTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;

  /* post-paint: init charts for enhanced tabs */
  if(!state.loading){
    if(state.activeTab==='machines') _initMachineCharts();
    if(state.activeTab==='gantt'&&!state._ganttLoaded){
      state._ganttLoaded=true;
      _loadGanttData(3);
    }
    if(state.activeTab==='maintenance'&&!state._maintLoaded){
      state._maintLoaded=true;
      _loadMaintenanceData();
    }
  }
}

/* ── event delegation ─────────────────────────────────── */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    var id=t.getAttribute('data-id');
    switch(action){
      case 'tab':
        var newTab=t.getAttribute('data-tab');
        var oldTab=state.activeTab;
        state.activeTab=newTab;
        state.pagination.offset=0;
        /* reset load flags so enhanced tabs re-fetch data on switch */
        if(newTab==='gantt') state._ganttLoaded=false;
        if(newTab==='maintenance') state._maintLoaded=false;
        /* start/stop machine polling on tab switch */
        if(newTab==='machines'&&oldTab!=='machines') _startMachinePolling();
        if(newTab!=='machines'&&oldTab==='machines') _stopMachinePolling();
        _paint();
        break;
      case 'acknowledge-pred':
        _api('ai_prediction_acknowledge',{id:id}).then(function(r){
          if(r&&r.ok){_toast(_t('Da xac nhan','Acknowledged'),'success');_loadData();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'resolve-pred':
        _api('ai_prediction_resolve',{id:id}).then(function(r){
          if(r&&r.ok){_toast(_t('Da giai quyet','Resolved'),'success');_loadData();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'false-positive':
        _api('ai_prediction_false_positive',{id:id}).then(function(r){
          if(r&&r.ok){_toast(_t('Da danh dau bao dong gia','Marked as false positive'),'success');_loadData();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'refresh-gantt':
        _loadData();
        break;
      case 'slot-detail':
        _api('schedule_slot_detail',{id:id}).then(function(r){
          if(r&&r.ok){
            var s=r.slot;
            var msg=(s.wo_number||'Slot')+' | '+_fmtDateTime(s.start)+' - '+_fmtDateTime(s.end)+' | '+(s.type||'-');
            _toast(msg,'info');
          }
        });
        break;
      case 'toggle-machine':
        var tmid=t.getAttribute('data-machine-id');
        state.machineDetail=(state.machineDetail===tmid)?null:tmid;
        _paint();
        break;
      case 'refresh-machines':
        _loadMachineData();
        break;
      case 'heatmap-cell':
        var machineId=t.getAttribute('data-machine');
        var day=t.getAttribute('data-day');
        _api('schedule_slot_breakdown',{machine_id:machineId,day:day}).then(function(r){
          if(r&&r.ok){
            var slots=r.slots||[];
            var msg=slots.map(function(s){return (s.type||'-')+': '+_esc(s.hours||0)+'h';}).join(', ');
            _toast(msg||_t('Khong co du lieu','No data'),'info');
          }
        });
        break;
      case 'calculate-promise':
        var time=parseFloat((state.container.querySelector('#aq-f-machining-time')||{}).value)||0;
        var machineType=(state.container.querySelector('#aq-f-machine-type')||{}).value||'';
        if(!time){ _toast(_t('Nhap thoi gian','Enter machining time'),'warning'); return; }
        _api('schedule_promise_calculate',{machining_time:time,machine_type:machineType}).then(function(r){
          if(r&&r.ok){ state.promiseResult=r.result; _paint(); }
          else { _toast(_t('Loi tinh toan','Calculation error'),'error'); }
        });
        break;
      /* Enhanced Gantt actions */
      case 'optimize-schedule':
        _handleOptimizeSchedule();
        break;
      case 'apply-suggestions':
        _handleApplySuggestions();
        break;
      /* Enhanced SPC actions */
      case 'load-spc':
        _loadSpcData();
        break;
      case 'predict-next':
        _handlePredictNext();
        break;
      /* Predictive Maintenance actions */
      case 'schedule-pm':
        _handleSchedulePm(t.getAttribute('data-tool'));
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='gantt_start'){ state.dateRange.start=e.target.value; return; }
    if(f==='gantt_end'){ state.dateRange.end=e.target.value; return; }
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadData(); }
    /* Enhanced Gantt: range dropdown */
    if(e.target.id==='aq-gantt-range'){
      var days=parseInt(e.target.value,10)||3;
      _loadGanttData(days);
    }
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='predictions';
  state.promiseResult=null;
  state.pagination.offset=0;

  /* default date range: this week */
  var now=new Date();
  state.dateRange.start=now.toISOString().slice(0,10);
  state.dateRange.end=new Date(now.getTime()+7*86400000).toISOString().slice(0,10);

  _paint();
  _bind();
  _loadData();
}

window._renderAiQualityScheduling = render;

})();

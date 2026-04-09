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
  { key:'gantt',       vi:'Gantt',          en:'Gantt Schedule',  section:'sched' },
  { key:'heatmap',     vi:'Cong suat',      en:'Capacity Heatmap', section:'sched' },
  { key:'promise',     vi:'Hen giao',       en:'Promise Calculator', section:'sched' }
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
  loading: false
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

/* ── tab: SPC anomaly monitor ────────────────────────── */
function _renderSpcTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Giam sat SPC','SPC Anomaly Monitor')+'</h3>';

  if(!state.spcViolations.length) return html+'<div class="aq-empty">'+_t('Khong co vi pham SPC','No SPC violations')+'</div>';

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
      +'</div>';

    /* mini SPC chart */
    var points=v.last_points||[];
    if(points.length){
      var maxVal=Math.max.apply(null, points.map(function(p){return Math.abs(p.value||0);}))||1;
      html+='<div class="aq-spc-chart" style="margin-top:var(--space-2,8px)">';
      points.forEach(function(pt, idx){
        var h=Math.round(Math.abs(pt.value||0)/maxVal*70)+10;
        var barColor=pt.violation?sevColor:'var(--brand,#1565c0)';
        html+='<div class="aq-spc-bar" style="height:'+h+'%;background:'+barColor+';opacity:'+(pt.violation?1:0.4)+'"></div>';
      });
      html+='</div>';
    }

    html+='<div style="font-size:.8125rem;margin-top:var(--space-2,6px)"><strong>'+_t('Khuyen nghi','Recommendation')+':</strong> '+_esc(v.recommended_action||'-')+'</div>'
    +'</div>';
  });
  return html;
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

/* ── tab: Gantt schedule ─────────────────────────────── */
function _renderGanttTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<h3 style="margin:0">'+_t('Lich trinh Gantt','Gantt Schedule')+'</h3>'
    +'<div class="aq-filters" style="margin-bottom:0">'
      +'<input type="date" data-filter="gantt_start" value="'+_esc(state.dateRange.start)+'">'
      +'<input type="date" data-filter="gantt_end" value="'+_esc(state.dateRange.end)+'">'
      +'<button class="aq-btn aq-btn-primary" data-action="refresh-gantt">'+_t('Tai lai','Refresh')+'</button>'
    +'</div>'
  +'</div>';

  var machines=state.schedule;
  if(!machines||!machines.length) return html+'<div class="aq-empty">'+_t('Khong co du lieu lich trinh','No schedule data')+'</div>';

  /* compute day columns */
  var startDate=state.dateRange.start?new Date(state.dateRange.start):new Date();
  var endDate=state.dateRange.end?new Date(state.dateRange.end):new Date(startDate.getTime()+7*86400000);
  var days=[];
  var d=new Date(startDate);
  while(d<=endDate){ days.push(new Date(d)); d=new Date(d.getTime()+86400000); }
  var totalDays=days.length||1;

  html+='<div class="sc-gantt" style="min-height:'+(machines.length*40+40)+'px">';
  /* header */
  html+='<div class="sc-gantt-header"><div class="sc-gantt-label">'+_t('May','Machine')+'</div>';
  days.forEach(function(day){
    html+='<div class="sc-gantt-cell" style="min-width:60px;padding:var(--space-1,4px);text-align:center;font-size:.6875rem;font-weight:var(--font-heading-weight,600)">'
      +String(day.getDate()).padStart(2,'0')+'/'+String(day.getMonth()+1).padStart(2,'0')
    +'</div>';
  });
  html+='</div>';

  /* rows */
  machines.forEach(function(m){
    html+='<div class="sc-gantt-row"><div class="sc-gantt-label" style="font-size:var(--text-xs,.75rem);display:flex;align-items:center">'+_esc(m.machine_name||'-')+'</div>';
    days.forEach(function(){ html+='<div class="sc-gantt-cell"></div>'; });

    /* slots/bars */
    var slots=m.slots||[];
    slots.forEach(function(slot){
      var slotStart=new Date(slot.start);
      var slotEnd=new Date(slot.end);
      var leftPct=Math.max(0,(slotStart-startDate)/(endDate-startDate)*100);
      var widthPct=Math.max(1,(slotEnd-slotStart)/(endDate-startDate)*100);
      var color=SLOT_COLORS[slot.type]||'#94a3b8';
      var conflict=slot.conflict?' conflict':'';
      html+='<div class="sc-gantt-bar'+conflict+'" style="left:calc(140px + '+leftPct+'%);width:'+widthPct+'%;background:'+color+'" data-action="slot-detail" data-id="'+_esc(slot.id)+'" title="'+_esc(slot.wo_number||slot.type||'')+'">'
        +_esc(slot.wo_number||slot.label||'')
      +'</div>';
    });
    html+='</div>';
  });

  /* today line */
  var now=new Date();
  if(now>=startDate&&now<=endDate){
    var todayPct=(now-startDate)/(endDate-startDate)*100;
    html+='<div class="sc-gantt-today" style="left:calc(140px + '+todayPct+'%)"></div>';
  }
  html+='</div>';

  /* legend */
  html+='<div style="display:flex;gap:var(--space-4,16px);margin-top:var(--space-3,10px);font-size:var(--text-xs,.75rem)">';
  Object.keys(SLOT_COLORS).forEach(function(k){
    html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);background:'+SLOT_COLORS[k]+'"></div>'+_esc(k)+'</div>';
  });
  html+='<div style="display:flex;align-items:center;gap:var(--space-1,4px)"><div style="width:14px;height:14px;border-radius:var(--radius-sm,3px);border:2px solid var(--red-light,#ef4444)"></div>'+_t('Xung dot','Conflict')+'</div>';
  html+='</div>';
  return html;
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

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="aq">';
  html+='<div class="aq-tabs">';
  var lastSection='';
  TABS.forEach(function(tab){
    if(lastSection&&lastSection!==tab.section) html+='<div class="aq-tab-sep"></div>';
    lastSection=tab.section;
    html+='<div class="aq-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="aq-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'predictions': html+=_renderPredictionsTab(); break;
      case 'spc':         html+=_renderSpcTab(); break;
      case 'toolwear':    html+=_renderToolWearTab(); break;
      case 'gantt':       html+=_renderGanttTab(); break;
      case 'heatmap':     html+=_renderHeatmapTab(); break;
      case 'promise':     html+=_renderPromiseTab(); break;
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
    var id=t.getAttribute('data-id');
    switch(action){
      case 'tab':
        state.activeTab=t.getAttribute('data-tab');
        state.pagination.offset=0;
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
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='gantt_start'){ state.dateRange.start=e.target.value; return; }
    if(f==='gantt_end'){ state.dateRange.end=e.target.value; return; }
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadData(); }
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

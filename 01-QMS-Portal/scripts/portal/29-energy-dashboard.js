/* ===================================================================
   29-energy-dashboard.js
   HESEM QMS Portal - Energy & Resource Monitoring Dashboard
   Visualizes MES energy data (mes_energy_snapshots, mes_cost_tracking
   tables from migration 031). kWh, cost, per-part energy, idle waste.
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
function _fmtVND(v){ if(v==null) return '0'; return Number(v).toLocaleString('vi-VN'); }
function _fmtNum(v,dec){ if(v==null) return '0'; return Number(v).toFixed(dec!=null?dec:1); }

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'en-styles';
var TABS = [
  { key:'overview',  vi:'Tong quan',       en:'Overview' },
  { key:'machine',   vi:'Chi tiet may',    en:'Machine Detail' },
  { key:'perpart',   vi:'Nang luong/SP',   en:'Per-Part Energy' },
  { key:'cost',      vi:'Phan tich CP',    en:'Cost Analysis' }
];

var MACHINE_CATEGORIES = {
  cnc_3axis:  { vi:'CNC 3-truc',  en:'CNC 3-Axis',  color:'#3b82f6' },
  cnc_5axis:  { vi:'CNC 5-truc',  en:'CNC 5-Axis',  color:'#8b5cf6' },
  turning:    { vi:'Tien',        en:'Turning',      color:'#f59e0b' },
  grinding:   { vi:'Mai',         en:'Grinding',     color:'#ef4444' },
  edm:        { vi:'EDM',         en:'EDM',          color:'#06b6d4' },
  other:      { vi:'Khac',        en:'Other',        color:'#6b7280' }
};

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'overview',
  machines: [],
  snapshots: [],
  dateRange: { start:'', end:'' },
  selectedMachine: null,
  overview: null,
  machineDetail: null,
  perPartData: [],
  costTrend: [],
  costByCategory: [],
  recommendations: [],
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.en{padding:16px;max-width:1200px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.en-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}',
    '.en-tab{padding:8px 16px;font-size:.82rem;font-weight:600;cursor:pointer;border-radius:8px;border:2px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);transition:all .15s}',
    '.en-tab:hover{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.en-tab.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:#fff}',
    /* KPI row */
    '.en-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}',
    '.en-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;text-align:center}',
    '.en-kpi-val{font-size:1.6rem;font-weight:800;color:var(--brand,#1565c0)}',
    '.en-kpi-label{font-size:.75rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.en-kpi-sub{font-size:.7rem;color:var(--text-secondary,#64748b)}',
    /* horizontal bar chart */
    '.en-hbar-chart{display:flex;flex-direction:column;gap:8px;margin-top:12px}',
    '.en-hbar-row{display:flex;align-items:center;gap:8px;font-size:.82rem}',
    '.en-hbar-label{width:160px;text-align:right;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.en-hbar{height:24px;border-radius:4px;min-width:4px;transition:width .3s;position:relative}',
    '.en-hbar-val{position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:.72rem;font-weight:700;color:#fff}',
    '.en-hbar-val-out{font-weight:700;font-size:.75rem;color:var(--text-secondary,#64748b);margin-left:6px}',
    /* daily chart (vertical bars) */
    '.en-day-chart{display:flex;align-items:flex-end;gap:4px;height:180px;margin:16px 0;padding:0 4px}',
    '.en-day-bar{flex:1;min-width:12px;max-width:40px;border-radius:4px 4px 0 0;transition:height .3s;cursor:pointer;position:relative}',
    '.en-day-bar:hover{opacity:.85}',
    '.en-day-label{text-align:center;font-size:.6rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.en-day-tooltip{position:absolute;bottom:105%;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:4px 8px;border-radius:4px;font-size:.7rem;white-space:nowrap;display:none;z-index:10}',
    '.en-day-bar:hover .en-day-tooltip{display:block}',
    /* split bar (idle vs production) */
    '.en-split-wrap{display:flex;gap:20px;margin:16px 0;flex-wrap:wrap}',
    '.en-split-box{flex:1;min-width:200px;background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;text-align:center}',
    '.en-split-bar{height:20px;border-radius:4px;display:flex;overflow:hidden;margin-top:8px}',
    '.en-split-seg{height:100%;transition:width .3s}',
    /* table */
    '.en-table{width:100%;border-collapse:collapse;font-size:.82rem}',
    '.en-table th,.en-table td{padding:8px 10px;border-bottom:1px solid var(--border,#e2e8f0);text-align:left}',
    '.en-table th{background:var(--bg-alt,#f8fafc);font-weight:700;position:sticky;top:0}',
    '.en-table tr:hover td{background:rgba(59,130,246,.03)}',
    '.en-table .sort{cursor:pointer;user-select:none}',
    /* month chart */
    '.en-month-chart{display:flex;align-items:flex-end;gap:6px;height:200px;margin:16px 0;padding:0 4px}',
    '.en-month-bar{flex:1;min-width:20px;border-radius:4px 4px 0 0;transition:height .3s;position:relative;cursor:pointer}',
    '.en-month-bar:hover{opacity:.85}',
    '.en-month-label{text-align:center;font-size:.65rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    '.en-month-tooltip{position:absolute;bottom:105%;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:4px 8px;border-radius:4px;font-size:.7rem;white-space:nowrap;display:none;z-index:10}',
    '.en-month-bar:hover .en-month-tooltip{display:block}',
    /* category cost bars */
    '.en-cat-bars{display:flex;flex-direction:column;gap:8px;max-width:600px;margin-top:12px}',
    '.en-cat-row{display:flex;align-items:center;gap:8px;font-size:.82rem}',
    '.en-cat-label{width:120px;text-align:right;font-weight:600}',
    '.en-cat-bar{height:24px;border-radius:4px;min-width:4px;transition:width .3s}',
    '.en-cat-val{font-weight:700;font-size:.75rem;color:var(--text-secondary,#64748b)}',
    /* recommendation cards */
    '.en-rec{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;margin-bottom:8px}',
    '.en-rec-title{font-weight:700;font-size:.88rem;margin-bottom:4px}',
    '.en-rec-body{font-size:.82rem;color:var(--text-secondary,#64748b);line-height:1.5}',
    '.en-rec-savings{font-weight:700;color:#22c55e;font-size:.82rem;margin-top:4px}',
    /* machine select */
    '.en-machine-select{margin-bottom:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.en-machine-select select{padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem;background:var(--surface,#fff)}',
    '.en-empty{text-align:center;padding:40px 20px;color:var(--text-secondary,#64748b);font-size:.9rem}',
    '.en-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700}',
    /* efficiency score */
    '.en-eff{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700}',
    '.en-eff-good{background:rgba(34,197,94,.1);color:#22c55e}',
    '.en-eff-ok{background:rgba(245,158,11,.1);color:#f59e0b}',
    '.en-eff-bad{background:rgba(239,68,68,.1);color:#ef4444}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ============================================================= */
/*  Tab renderers                                                 */
/* ============================================================= */

/* -- Overview ------------------------------------------------- */
function _renderOverviewTab(){
  var o=state.overview||{};
  var html='<h3 style="margin:0 0 16px">'+_t('Tong quan nang luong','Energy Overview')+'</h3>';

  /* KPI cards */
  html+='<div class="en-kpi-row">';
  html+='<div class="en-kpi"><div class="en-kpi-val">'+_esc(_fmtNum(o.total_kwh_today,1))+'</div><div class="en-kpi-label">kWh '+_t('Hom nay','Today')+'</div></div>';
  html+='<div class="en-kpi"><div class="en-kpi-val" style="font-size:1.2rem">'+_esc(_fmtVND(o.cost_today||0))+'</div><div class="en-kpi-label">VND '+_t('Hom nay','Today')+'</div></div>';
  html+='<div class="en-kpi"><div class="en-kpi-val">'+_esc(_fmtNum(o.kwh_per_part,2))+'</div><div class="en-kpi-label">kWh/'+_t('San pham','Part')+' (avg)</div></div>';
  html+='<div class="en-kpi"><div class="en-kpi-val" style="color:'+(Number(o.idle_waste_pct)>25?'#ef4444':'#f59e0b')+'">'+_esc(_fmtNum(o.idle_waste_pct,1))+'%</div><div class="en-kpi-label">'+_t('Lang phi idle','Idle Energy Waste')+'</div></div>';
  html+='</div>';

  /* per-machine horizontal bars */
  var machines=o.machine_energy||[];
  if(machines.length){
    html+='<h4 style="margin:16px 0 8px">'+_t('Tieu thu theo may','Energy by Machine')+'</h4>';
    var maxKwh=Math.max.apply(null,machines.map(function(m){return m.kwh||0;}))||1;
    html+='<div class="en-hbar-chart">';
    machines.forEach(function(m){
      var pct=Math.round(((m.kwh||0)/maxKwh)*100);
      var color=m.kwh>(maxKwh*0.8)?'#ef4444':m.kwh>(maxKwh*0.5)?'#f59e0b':'#3b82f6';
      html+='<div class="en-hbar-row">';
      html+='<span class="en-hbar-label">'+_esc(m.name)+'</span>';
      html+='<div class="en-hbar" style="width:'+Math.max(pct,3)+'%;background:'+color+'"><span class="en-hbar-val">'+_esc(_fmtNum(m.kwh,1))+'</span></div>';
      html+='</div>';
    });
    html+='</div>';
  }

  /* top 5 consumers */
  var top5=o.top_consumers||(machines.slice().sort(function(a,b){return(b.kwh||0)-(a.kwh||0);}).slice(0,5));
  if(top5.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('Top 5 tieu thu nhieu','Top 5 Energy Consumers')+'</h4>';
    html+='<div style="overflow-x:auto"><table class="en-table"><thead><tr><th>#</th><th>'+_t('May','Machine')+'</th><th style="text-align:right">kWh</th><th style="text-align:right">'+_t('Chi phi','Cost')+' (VND)</th></tr></thead><tbody>';
    top5.forEach(function(m,i){
      html+='<tr><td>'+(i+1)+'</td><td>'+_esc(m.name)+'</td><td style="text-align:right;font-weight:700">'+_esc(_fmtNum(m.kwh,1))+'</td><td style="text-align:right">'+_esc(_fmtVND(m.cost||0))+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}

/* -- Machine Detail ------------------------------------------- */
function _renderMachineTab(){
  var html='<h3 style="margin:0 0 12px">'+_t('Chi tiet nang luong may','Machine Energy Detail')+'</h3>';

  /* machine selector */
  var machines=state.machines.length?state.machines:((state.overview||{}).machine_energy||[]);
  html+='<div class="en-machine-select">';
  html+='<label style="font-weight:600;font-size:.85rem">'+_t('Chon may:','Select Machine:')+'</label>';
  html+='<select data-bind="select-machine">';
  html+='<option value="">-- '+_t('Chon','Select')+' --</option>';
  machines.forEach(function(m){
    html+='<option value="'+_esc(m.id||m.name)+'"'+(state.selectedMachine&&String(state.selectedMachine)==String(m.id||m.name)?' selected':'')+'>'+_esc(m.name)+'</option>';
  });
  html+='</select></div>';

  var md=state.machineDetail;
  if(!md){
    html+='<div class="en-empty">'+_t('Chon may de xem chi tiet.','Select a machine to view details.')+'</div>';
    return html;
  }

  /* daily energy bar chart */
  var daily=md.daily||[];
  if(daily.length){
    html+='<h4 style="margin:12px 0 6px">'+_t('Tieu thu hang ngay (30 ngay)','Daily Consumption (30 days)')+'</h4>';
    var maxDay=Math.max.apply(null,daily.map(function(d){return d.kwh||0;}))||1;
    html+='<div class="en-day-chart">';
    daily.forEach(function(d){
      var h=Math.max(Math.round(((d.kwh||0)/maxDay)*160),4);
      var color=(d.kwh||0)>(maxDay*0.8)?'#ef4444':(d.kwh||0)>(maxDay*0.5)?'#f59e0b':'#3b82f6';
      html+='<div style="flex:1;text-align:center"><div class="en-day-bar" style="height:'+h+'px;background:'+color+'"><div class="en-day-tooltip">'+_esc(d.date)+': '+_esc(_fmtNum(d.kwh,1))+' kWh</div></div><div class="en-day-label">'+_esc((d.date||'').substring(8))+'</div></div>';
    });
    html+='</div>';
  }

  /* peak demand times */
  if(md.peak_hours&&md.peak_hours.length){
    html+='<h4 style="margin:16px 0 6px">'+_t('Gio cao diem','Peak Demand Hours')+'</h4>';
    html+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    md.peak_hours.forEach(function(h){
      html+='<span class="en-badge" style="background:rgba(239,68,68,.1);color:#ef4444">'+_esc(h)+':00</span>';
    });
    html+='</div>';
  }

  /* idle vs production split */
  var idlePct=md.idle_pct||0;
  var prodPct=md.production_pct||(100-idlePct);
  html+='<div class="en-split-wrap">';
  html+='<div class="en-split-box"><div style="font-weight:700;font-size:.85rem">'+_t('Idle vs San xuat','Idle vs Production')+'</div>';
  html+='<div class="en-split-bar"><div class="en-split-seg" style="width:'+prodPct+'%;background:#3b82f6" title="Production '+_esc(_fmtNum(prodPct,1))+'%"></div><div class="en-split-seg" style="width:'+idlePct+'%;background:#ef4444" title="Idle '+_esc(_fmtNum(idlePct,1))+'%"></div></div>';
  html+='<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-top:4px;color:var(--text-secondary,#64748b)"><span style="color:#3b82f6;font-weight:700">'+_t('San xuat','Production')+' '+_esc(_fmtNum(prodPct,1))+'%</span><span style="color:#ef4444;font-weight:700">Idle '+_esc(_fmtNum(idlePct,1))+'%</span></div>';
  html+='</div>';

  /* cost breakdown */
  html+='<div class="en-split-box"><div style="font-weight:700;font-size:.85rem">'+_t('Chi phi','Cost Breakdown')+'</div>';
  html+='<div style="margin-top:8px;font-size:.85rem">';
  html+='<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border,#e2e8f0)"><span>'+_t('San xuat','Production')+'</span><strong>'+_esc(_fmtVND(md.cost_production||0))+' VND</strong></div>';
  html+='<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border,#e2e8f0)"><span>Idle</span><strong style="color:#ef4444">'+_esc(_fmtVND(md.cost_idle||0))+' VND</strong></div>';
  html+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700"><span>'+_t('Tong','Total')+'</span><span>'+_esc(_fmtVND(md.cost_total||0))+' VND</span></div>';
  html+='</div></div></div>';

  return html;
}

/* -- Per-Part Energy ------------------------------------------ */
function _renderPerPartTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Nang luong tren san pham','Per-Part Energy')+'</h3>';
  var data=state.perPartData||[];
  if(!data.length){
    html+='<div class="en-empty">'+_t('Chua co du lieu.','No data available.')+'</div>';
    return html;
  }

  html+='<div style="overflow-x:auto"><table class="en-table"><thead><tr>';
  html+='<th>'+_t('Ma SP','Part Number')+'</th>';
  html+='<th style="text-align:right">'+_t('Avg kWh/SP','Avg kWh/Part')+'</th>';
  html+='<th style="text-align:right">'+_t('Avg Cycle (min)','Avg Cycle (min)')+'</th>';
  html+='<th>'+_t('Hieu suat NL','Energy Efficiency')+'</th>';
  html+='<th style="text-align:right">'+_t('So luong','Qty Produced')+'</th>';
  html+='</tr></thead><tbody>';

  data.forEach(function(p){
    var score=Number(p.efficiency_score)||0;
    var effClass=score>=80?'en-eff-good':score>=50?'en-eff-ok':'en-eff-bad';
    html+='<tr>';
    html+='<td><strong>'+_esc(p.part_number)+'</strong></td>';
    html+='<td style="text-align:right">'+_esc(_fmtNum(p.avg_kwh,2))+'</td>';
    html+='<td style="text-align:right">'+_esc(_fmtNum(p.avg_cycle_min,1))+'</td>';
    html+='<td><span class="en-eff '+effClass+'">'+_esc(score)+'/100</span></td>';
    html+='<td style="text-align:right">'+_esc(p.qty||0)+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}

/* -- Cost Analysis -------------------------------------------- */
function _renderCostTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Phan tich chi phi nang luong','Energy Cost Analysis')+'</h3>';

  /* 12-month trend bar chart */
  var trend=state.costTrend||[];
  if(trend.length){
    html+='<h4 style="margin:12px 0 6px">'+_t('Chi phi 12 thang','12-Month Cost Trend')+'</h4>';
    var maxMonth=Math.max.apply(null,trend.map(function(m){return m.cost||0;}))||1;
    html+='<div class="en-month-chart">';
    trend.forEach(function(m){
      var h=Math.max(Math.round(((m.cost||0)/maxMonth)*180),4);
      html+='<div style="flex:1;text-align:center"><div class="en-month-bar" style="height:'+h+'px;background:var(--brand,#1565c0)"><div class="en-month-tooltip">'+_esc(m.month)+': '+_esc(_fmtVND(m.cost))+' VND</div></div><div class="en-month-label">'+_esc(m.month)+'</div></div>';
    });
    html+='</div>';
  }

  /* cost by machine category */
  var cats=state.costByCategory||[];
  if(cats.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('Chi phi theo loai may','Cost by Machine Category')+'</h4>';
    var maxCat=Math.max.apply(null,cats.map(function(c){return c.cost||0;}))||1;
    html+='<div class="en-cat-bars">';
    cats.forEach(function(c){
      var mc=MACHINE_CATEGORIES[c.category]||MACHINE_CATEGORIES.other;
      var pct=Math.round(((c.cost||0)/maxCat)*100);
      html+='<div class="en-cat-row"><span class="en-cat-label">'+_esc(_t(mc.vi,mc.en))+'</span><div class="en-cat-bar" style="width:'+pct+'%;background:'+mc.color+'"></div><span class="en-cat-val">'+_esc(_fmtVND(c.cost))+' VND</span></div>';
    });
    html+='</div>';
  }

  /* cost optimization recommendations */
  var recs=state.recommendations||[];
  if(recs.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('Khuyen nghi toi uu','Optimization Recommendations')+'</h4>';
    recs.forEach(function(r){
      html+='<div class="en-rec">';
      html+='<div class="en-rec-title">'+_esc(r.title)+'</div>';
      html+='<div class="en-rec-body">'+_esc(r.description)+'</div>';
      if(r.potential_savings) html+='<div class="en-rec-savings">'+_t('Tiet kiem du kien:','Potential Savings:')+' '+_esc(_fmtVND(r.potential_savings))+' VND/'+_t('thang','month')+'</div>';
      html+='</div>';
    });
  }

  if(!trend.length&&!cats.length){
    html+='<div class="en-empty">'+_t('Chua co du lieu chi phi.','No cost data available.')+'</div>';
  }
  return html;
}

/* ============================================================= */
/*  Data loading                                                  */
/* ============================================================= */
function _loadOverview(){
  state.loading=true; _paint();
  _api('energy_overview', state.dateRange).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.overview=r.overview||r;
      state.machines=r.machines||(r.overview||{}).machine_energy||[];
      state.perPartData=r.per_part||[];
      state.costTrend=r.cost_trend||[];
      state.costByCategory=r.cost_by_category||[];
      state.recommendations=r.recommendations||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadMachineDetail(machineId){
  state.loading=true; _paint();
  _api('energy_machine_detail', {machine_id:machineId}).then(function(r){
    state.loading=false;
    if(r&&r.ok){ state.machineDetail=r.detail||r; }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadPerPart(){
  _api('energy_per_part', {}).then(function(r){
    if(r&&r.ok){ state.perPartData=r.parts||r.per_part||[]; _paint(); }
  }).catch(function(){});
}

function _loadCostTrend(){
  _api('energy_cost_trend', {}).then(function(r){
    if(r&&r.ok){
      state.costTrend=r.trend||[];
      state.costByCategory=r.by_category||[];
      state.recommendations=r.recommendations||[];
      _paint();
    }
  }).catch(function(){});
}

/* ============================================================= */
/*  Main paint                                                    */
/* ============================================================= */
function _paint(){
  if(!state.container) return;
  var html='<div class="en">';
  html+='<div class="en-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="en-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="en-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'overview': html+=_renderOverviewTab(); break;
      case 'machine':  html+=_renderMachineTab(); break;
      case 'perpart':  html+=_renderPerPartTab(); break;
      case 'cost':     html+=_renderCostTab(); break;
    }
  }
  html+='</div>';
  state.container.innerHTML=html;
}

/* ============================================================= */
/*  Event delegation                                              */
/* ============================================================= */
function _bind(){
  state.container.addEventListener('click', function(e){
    var t=e.target.closest('[data-action]');
    if(!t) return;
    var action=t.getAttribute('data-action');
    switch(action){
      case 'tab':
        var tab=t.getAttribute('data-tab');
        state.activeTab=tab;
        if(tab==='perpart') _loadPerPart();
        else if(tab==='cost') _loadCostTrend();
        _paint();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    if(e.target.getAttribute('data-bind')==='select-machine'){
      var val=e.target.value;
      if(val){ state.selectedMachine=val; _loadMachineDetail(val); }
      else { state.selectedMachine=null; state.machineDetail=null; _paint(); }
    }
  });
}

/* ============================================================= */
/*  Entry point                                                   */
/* ============================================================= */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='overview';
  state.selectedMachine=null;
  state.machineDetail=null;
  state.dateRange={start:'',end:''};
  _paint();
  _bind();
  _loadOverview();
}

window._renderEnergyDashboard = render;

})();

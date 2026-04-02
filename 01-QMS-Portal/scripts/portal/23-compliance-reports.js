/* ===================================================================
   23-compliance-reports.js
   HESEM QMS Portal - Compliance Report Generation
   Management review, customer quality, supplier review, COPQ analysis,
   audit packages, shipment evidence packages.
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
function _fmtCurrency(v){ if(v==null) return '-'; return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(v); }
function _pct(v){ return (v==null?0:v).toFixed(1)+'%'; }

/* ── constants ────────────────────────────────────────── */
var STYLE_ID = 'cr-styles';
var TABS = [
  { key:'dashboard',   vi:'Tổng quan',        en:'Dashboard' },
  { key:'mgmt_review', vi:'Xem xét lãnh đạo', en:'Management Review' },
  { key:'customer',    vi:'Báo cáo KH',       en:'Customer Report' },
  { key:'supplier',    vi:'Đánh giá NCC',     en:'Supplier Review' },
  { key:'copq',        vi:'COPQ',             en:'COPQ Analysis' },
  { key:'evidence',    vi:'Gói chứng cứ',     en:'Evidence Package' }
];

var REPORT_ICONS = {
  management_review: '\ud83d\udcca',
  customer_quality:  '\ud83e\udd1d',
  supplier_review:   '\ud83c\udfed',
  audit_package:     '\ud83d\udee1\ufe0f',
  copq_analysis:     '\ud83d\udcb0',
  evidence_package:  '\ud83d\udce6'
};

var COPQ_COLORS = {
  prevention:       '#22c55e',
  appraisal:        '#3b82f6',
  internal_failure: '#f59e0b',
  external_failure: '#ef4444'
};

/* EVIDENCE_STATUS — đọc từ HmRegistry → 'evidence_status' */
var EVIDENCE_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('evidence_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color,icon:o.icon||''}; }); }
  if(!Object.keys(map).length){ map = {present:{vi:'Đạt',en:'Present',color:'#22c55e',icon:'✅'},missing:{vi:'Thiếu',en:'Missing',color:'#ef4444',icon:'❌'},pending:{vi:'Chờ',en:'Pending',color:'#f59e0b',icon:'⏳'}}; }
  return map;
})();

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'dashboard',
  reportTypes: [],
  generatedReports: [],
  selectedReport: null,
  generating: false,
  // tab-specific
  mgmtData: null,
  customerData: null,
  supplierData: null,
  copqData: null,
  evidenceData: null,
  // filters
  selectedCustomer: '',
  selectedVendor: '',
  selectedPeriod: _currentQuarter(),
  soNumber: ''
};

function _currentQuarter(){
  var d=new Date(); var q=Math.ceil((d.getMonth()+1)/3);
  return d.getFullYear()+'-Q'+q;
}

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.cr{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.cr-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.cr-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.cr-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.cr-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.cr-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.cr-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.cr-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.cr-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.cr-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px}',
    '.cr-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:box-shadow .15s}',
    '.cr-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}',
    '.cr-card-icon{font-size:2rem;margin-bottom:8px}',
    '.cr-card-title{font-size:.9375rem;font-weight:800;margin-bottom:4px}',
    '.cr-card-desc{font-size:.75rem;color:var(--text-secondary,#64748b);margin-bottom:12px;line-height:1.4}',
    '.cr-card-freq{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;background:#e0f2fe;color:#0369a1;margin-bottom:12px}',
    '.cr-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.cr-filters select,.cr-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.cr-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.cr-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.cr-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.cr-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.cr-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:#fff;white-space:nowrap}',
    '.cr-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.cr-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.cr-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.cr-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.cr-btn-secondary:hover{background:#e2e8f0}',
    '.cr-btn-success{background:#22c55e;color:#fff}',
    '.cr-btn-success:hover{background:#16a34a}',
    '.cr-btn:disabled{opacity:.5;cursor:not-allowed}',
    '.cr-section{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:20px;margin-bottom:16px}',
    '.cr-section h3{font-size:1rem;font-weight:800;margin:0 0 12px}',
    '.cr-section h4{font-size:.875rem;font-weight:700;margin:0 0 10px;color:var(--text-secondary,#475569)}',
    '.cr-bar-chart{display:flex;flex-direction:column;gap:8px;margin:12px 0}',
    '.cr-bar-row{display:flex;align-items:center;gap:10px;font-size:.8125rem}',
    '.cr-bar-label{min-width:120px;font-weight:600;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cr-bar-track{flex:1;height:22px;background:var(--border,#e2e8f0);border-radius:4px;overflow:hidden;position:relative}',
    '.cr-bar-fill{height:100%;border-radius:4px;transition:width .4s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:.6875rem;font-weight:700;color:#fff;min-width:2px}',
    '.cr-bar-value{min-width:60px;font-size:.75rem;font-weight:700;text-align:right}',
    '.cr-stacked-chart{margin:12px 0}',
    '.cr-stacked-row{display:flex;height:28px;border-radius:4px;overflow:hidden;margin-bottom:4px}',
    '.cr-stacked-seg{transition:width .4s ease;position:relative}',
    '.cr-stacked-seg:hover{opacity:.85}',
    '.cr-legend{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0;font-size:.75rem}',
    '.cr-legend-item{display:flex;align-items:center;gap:4px}',
    '.cr-legend-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}',
    '.cr-trend-chart{display:flex;align-items:flex-end;gap:3px;height:120px;margin:12px 0;padding-bottom:20px;position:relative}',
    '.cr-trend-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;position:relative;min-width:12px}',
    '.cr-trend-seg{width:100%;transition:height .3s ease}',
    '.cr-trend-label{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:.5625rem;color:var(--text-secondary,#94a3b8);white-space:nowrap}',
    '.cr-checklist{list-style:none;padding:0;margin:0}',
    '.cr-checklist li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);font-size:.8125rem}',
    '.cr-checklist li:last-child{border-bottom:none}',
    '.cr-check-icon{font-size:1rem;flex-shrink:0}',
    '.cr-check-label{flex:1;font-weight:600}',
    '.cr-check-ref{font-size:.75rem;color:var(--text-secondary,#64748b);font-family:monospace}',
    '.cr-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.cr-history{margin-top:24px}',
    '.cr-history h3{font-size:.9375rem;font-weight:800;margin:0 0 12px}',
    '.cr-spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:cr-spin .6s linear infinite}',
    '@keyframes cr-spin{to{transform:rotate(360deg)}}',
    '.cr-completeness{display:flex;align-items:center;gap:12px;margin-bottom:16px}',
    '.cr-completeness-ring{width:80px;height:80px;position:relative}',
    '.cr-completeness-ring svg{transform:rotate(-90deg)}',
    '.cr-completeness-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:800}',
    '.cr-completeness-text{font-size:.875rem}',
    '.cr-form-row{display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap}',
    '.cr-form-row label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.cr-form-row input,.cr-form-row select{height:36px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge / KPI helpers ─────────────────────────────── */
function _kpiCard(label, value, color){
  return '<div class="cr-kpi"><div class="cr-kpi-label">'+_esc(label)+'</div><div class="cr-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

function _statusBadge(text, color){
  return '<span class="cr-badge" style="background:'+(color||'#64748b')+'">'+_esc(text)+'</span>';
}

/* ── CSS bar chart ───────────────────────────────────── */
function _barChart(items, maxVal, colorFn){
  if(!items||!items.length) return '<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u','No data')+'</div>';
  if(!maxVal){ maxVal=0; items.forEach(function(it){ if(it.value>maxVal) maxVal=it.value; }); }
  if(maxVal<=0) maxVal=1;
  var html='<div class="cr-bar-chart">';
  items.forEach(function(it){
    var pct=Math.min(100,Math.max(1,(it.value/maxVal)*100));
    var c=typeof colorFn==='function'?colorFn(it):it.color||'var(--brand,#1565c0)';
    html+='<div class="cr-bar-row">';
    html+='<div class="cr-bar-label" title="'+_esc(it.label)+'">'+_esc(it.label)+'</div>';
    html+='<div class="cr-bar-track"><div class="cr-bar-fill" style="width:'+pct.toFixed(1)+'%;background:'+c+'">'+( pct>15?_esc(it.display||it.value):'')+'</div></div>';
    html+='<div class="cr-bar-value">'+_esc(it.display||it.value)+'</div>';
    html+='</div>';
  });
  html+='</div>';
  return html;
}

/* ── stacked bar (COPQ categories) ───────────────────── */
function _stackedBar(segments, total){
  if(!total) return '';
  var html='<div class="cr-stacked-row">';
  segments.forEach(function(seg){
    var pct=(seg.value/total)*100;
    if(pct<0.5) return;
    html+='<div class="cr-stacked-seg" style="width:'+pct.toFixed(1)+'%;background:'+seg.color+'" title="'+_esc(seg.label)+': '+_esc(seg.display||seg.value)+'"></div>';
  });
  html+='</div>';
  return html;
}

/* ── trend chart (12-month vertical bars) ────────────── */
function _trendChart(months){
  if(!months||!months.length) return '<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u','No data')+'</div>';
  var maxVal=0;
  months.forEach(function(m){ if(m.total>maxVal) maxVal=m.total; });
  if(maxVal<=0) maxVal=1;

  var html='<div class="cr-trend-chart">';
  months.forEach(function(m){
    var hPrev=Math.max(1,(m.prevention/maxVal)*100);
    var hAppr=Math.max(0,(m.appraisal/maxVal)*100);
    var hInt =Math.max(0,(m.internal/maxVal)*100);
    var hExt =Math.max(0,(m.external/maxVal)*100);
    var lbl=m.period?m.period.substring(5):'';
    html+='<div class="cr-trend-bar">';
    html+='<div class="cr-trend-seg" style="height:'+hExt.toFixed(1)+'%;background:'+COPQ_COLORS.external_failure+'"></div>';
    html+='<div class="cr-trend-seg" style="height:'+hInt.toFixed(1)+'%;background:'+COPQ_COLORS.internal_failure+'"></div>';
    html+='<div class="cr-trend-seg" style="height:'+hAppr.toFixed(1)+'%;background:'+COPQ_COLORS.appraisal+'"></div>';
    html+='<div class="cr-trend-seg" style="height:'+hPrev.toFixed(1)+'%;background:'+COPQ_COLORS.prevention+'"></div>';
    html+='<div class="cr-trend-label">'+_esc(lbl)+'</div>';
    html+='</div>';
  });
  html+='</div>';
  return html;
}

/* ── completeness ring (SVG donut) ───────────────────── */
function _completenessRing(pct){
  var r=34, circ=2*Math.PI*r;
  var fill=circ*(pct/100);
  var color=pct>=100?'#22c55e':pct>=70?'#f59e0b':'#ef4444';
  return '<div class="cr-completeness-ring">'
    +'<svg width="80" height="80" viewBox="0 0 80 80">'
    +'<circle cx="40" cy="40" r="'+r+'" fill="none" stroke="#e2e8f0" stroke-width="6"/>'
    +'<circle cx="40" cy="40" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="6" stroke-dasharray="'+fill.toFixed(1)+' '+(circ-fill).toFixed(1)+'" stroke-linecap="round"/>'
    +'</svg>'
    +'<div class="cr-completeness-pct" style="color:'+color+'">'+Math.round(pct)+'%</div>'
    +'</div>';
}

/* ── period selector HTML ────────────────────────────── */
function _periodSelector(){
  var y=new Date().getFullYear();
  var opts='';
  for(var yr=y;yr>=y-2;yr--){
    for(var q=4;q>=1;q--){
      var val=yr+'-Q'+q;
      opts+='<option value="'+val+'"'+(val===state.selectedPeriod?' selected':'')+'>'+val+'</option>';
    }
  }
  return '<select data-filter="period">'+opts+'</select>';
}

/* ── TABS ─────────────────────────────────────────────── */
function _renderTabs(){
  var html='<div class="cr-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="cr-tab'+(state.activeTab===tab.key?' active':'')+'" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  return html;
}

/* ── TAB: Dashboard ──────────────────────────────────── */
function _renderDashboardTab(){
  var html='';

  // Report type cards
  html+='<h3 style="font-size:1rem;font-weight:800;margin:0 0 16px">'+_t('Lo\u1ea1i b\u00e1o c\u00e1o','Available Reports')+'</h3>';
  html+='<div class="cr-cards">';
  if(state.reportTypes.length===0){
    // Fallback static list
    var fallback=[
      {type:'management_review',label:_t('\u0110\u1ea7u v\u00e0o xem x\u00e9t l\u00e3nh \u0111\u1ea1o','Management Review Input'),desc:_t('AS9100D m\u1ee5c 9.3','AS9100D clause 9.3'),freq:'quarterly'},
      {type:'customer_quality',label:_t('B\u00e1o c\u00e1o ch\u1ea5t l\u01b0\u1ee3ng KH','Customer Quality Report'),desc:_t('B\u00e1o c\u00e1o ch\u1ea5t l\u01b0\u1ee3ng cho kh\u00e1ch h\u00e0ng','Quality performance for customers'),freq:'quarterly'},
      {type:'supplier_review',label:_t('\u0110\u00e1nh gi\u00e1 NCC','Supplier Performance Review'),desc:_t('\u0110\u00e1nh gi\u00e1 hi\u1ec7u su\u1ea5t NCC','Periodic supplier evaluation'),freq:'semi_annual'},
      {type:'audit_package',label:_t('G\u00f3i ki\u1ec3m to\u00e1n','Audit Evidence Package'),desc:_t('Ch\u1ee9ng c\u1ee9 cho AS9100/NADCAP','Evidence for AS9100/NADCAP audits'),freq:null},
      {type:'copq_analysis',label:_t('COPQ','Cost of Poor Quality'),desc:_t('Ph\u00e2n t\u00edch PAF','PAF model analysis'),freq:'monthly'},
      {type:'evidence_package',label:_t('G\u00f3i giao h\u00e0ng','Shipment Evidence Package'),desc:_t('Ch\u1ee9ng c\u1ee9 giao h\u00e0ng SO','Evidence for SO shipment'),freq:null}
    ];
    fallback.forEach(function(rt){ state.reportTypes.push(rt); });
  }
  state.reportTypes.forEach(function(rt){
    var icon=REPORT_ICONS[rt.type]||'\ud83d\udcc4';
    html+='<div class="cr-card" data-action="goto-tab" data-report-type="'+_esc(rt.type)+'">';
    html+='<div class="cr-card-icon">'+icon+'</div>';
    html+='<div class="cr-card-title">'+_esc(rt.label||rt.label_vi||rt.type)+'</div>';
    html+='<div class="cr-card-desc">'+_esc(rt.desc||rt.description||'')+'</div>';
    if(rt.freq||rt.frequency){
      var fLabel={'quarterly':_t('H\u00e0ng qu\u00fd','Quarterly'),'monthly':_t('H\u00e0ng th\u00e1ng','Monthly'),'semi_annual':_t('N\u1eeda n\u0103m','Semi-annual')};
      html+='<div class="cr-card-freq">'+_esc(fLabel[rt.freq||rt.frequency]||(rt.freq||rt.frequency))+'</div>';
    }
    html+='</div>';
  });
  html+='</div>';

  // Recent reports
  html+='<div class="cr-history"><h3>'+_t('B\u00e1o c\u00e1o g\u1ea7n \u0111\u00e2y','Recent Reports')+'</h3>';
  if(!state.generatedReports||state.generatedReports.length===0){
    html+='<div class="cr-empty">'+_t('Ch\u01b0a c\u00f3 b\u00e1o c\u00e1o n\u00e0o','No reports generated yet')+'</div>';
  } else {
    html+='<table class="cr-table"><thead><tr>';
    html+='<th>'+_t('Lo\u1ea1i','Type')+'</th><th>'+_t('Chu k\u1ef3','Period')+'</th><th>'+_t('Ng\u00e0y t\u1ea1o','Generated')+'</th><th>'+_t('Ng\u01b0\u1eddi t\u1ea1o','By')+'</th><th></th>';
    html+='</tr></thead><tbody>';
    state.generatedReports.slice(0,10).forEach(function(r){
      var icon=REPORT_ICONS[r.report_type]||'\ud83d\udcc4';
      html+='<tr>';
      html+='<td>'+icon+' '+_esc(r.report_type)+'</td>';
      html+='<td>'+_esc(r.period||'-')+'</td>';
      html+='<td>'+_fmtDateTime(r.generated_at)+'</td>';
      html+='<td>'+_esc(r.generated_by||'-')+'</td>';
      html+='<td><button class="cr-btn cr-btn-secondary" data-action="view-report" data-report-id="'+_esc(r.report_id)+'">'+_t('Xem','View')+'</button></td>';
      html+='</tr>';
    });
    html+='</tbody></table>';
  }
  html+='</div>';

  return html;
}

/* ── TAB: Management Review ──────────────────────────── */
function _renderMgmtReviewTab(){
  var html='';
  html+='<div class="cr-form-row">';
  html+='<div><label>'+_t('Chu k\u1ef3','Period')+'</label>'+_periodSelector()+'</div>';
  html+='<div><button class="cr-btn cr-btn-primary" data-action="generate-mgmt"'+(state.generating?' disabled':'')+'>'+
    (state.generating?'<span class="cr-spinner"></span> ':'')+_t('T\u1ea1o b\u00e1o c\u00e1o','Generate Report')+'</button></div>';
  html+='</div>';

  var d=state.mgmtData;
  if(!d){
    html+='<div class="cr-empty">'+_t('Ch\u1ecdn chu k\u1ef3 v\u00e0 nh\u1ea5n T\u1ea1o b\u00e1o c\u00e1o','Select a period and click Generate Report')+'</div>';
    return html;
  }

  var sec=d.sections||{};
  var kpi=sec.kpi_summary||{};

  // KPI cards
  html+='<div class="cr-kpis">';
  html+=_kpiCard('OTD',_pct(kpi.OTD),kpi.OTD>=95?'#22c55e':'#ef4444');
  html+=_kpiCard('FPY',_pct(kpi.FPY),kpi.FPY>=98?'#22c55e':'#f59e0b');
  html+=_kpiCard('COPQ',_fmtCurrency(kpi.COPQ),'#ef4444');
  html+=_kpiCard('OEE',_pct(kpi.OEE),kpi.OEE>=85?'#22c55e':'#f59e0b');
  html+=_kpiCard(_t('T\u1ef7 l\u1ec7 ph\u1ebf','Scrap Rate'),_pct(kpi.SCRAP_RATE),kpi.SCRAP_RATE<=2?'#22c55e':'#ef4444');
  html+=_kpiCard(_t('\u0110\u00f3ng CAPA','CAPA Closure'),_pct(kpi.CAPA_CLOSURE),kpi.CAPA_CLOSURE>=90?'#22c55e':'#f59e0b');
  html+='</div>';

  // NCR trend
  var ncrList=sec.ncr_trend||[];
  html+='<div class="cr-section"><h3>'+_t('Xu h\u01b0\u1edbng NCR','NCR Trends')+' ('+ncrList.length+')</h3>';
  if(ncrList.length>0){
    html+='<table class="cr-table"><thead><tr><th>ID</th><th>'+_t('Ng\u00e0y','Date')+'</th><th>'+_t('Lo\u1ea1i','Type')+'</th><th>'+_t('Tr\u1ea1ng th\u00e1i','Status')+'</th></tr></thead><tbody>';
    ncrList.slice(0,15).forEach(function(n){
      html+='<tr><td>'+_esc(n.ncr_id||n.id||'-')+'</td><td>'+_fmtDate(n.date||n.created_at)+'</td><td>'+_esc(n.defect_type||n.type||'-')+'</td><td>'+_esc(n.status||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 NCR','No NCRs')+'</div>';
  }
  html+='</div>';

  // Supplier performance summary
  var suppList=sec.supplier_performance||[];
  html+='<div class="cr-section"><h3>'+_t('Hi\u1ec7u su\u1ea5t NCC','Supplier Performance')+'</h3>';
  if(suppList.length>0){
    var barItems=suppList.map(function(s){ return {label:s.vendor_name||s.vendor_id,value:s.overall_score||0,color:s.overall_score>=80?'#22c55e':s.overall_score>=60?'#f59e0b':'#ef4444'}; });
    html+=_barChart(barItems,100);
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u','No data')+'</div>';
  }
  html+='</div>';

  // Action items
  var actions=sec.actions||[];
  html+='<div class="cr-section"><h3>'+_t('H\u00e0nh \u0111\u1ed9ng','Action Items')+' ('+actions.length+')</h3>';
  if(actions.length>0){
    html+='<table class="cr-table"><thead><tr><th>'+_t('H\u00e0nh \u0111\u1ed9ng','Action')+'</th><th>'+_t('Ch\u1ecbu TN','Owner')+'</th><th>'+_t('H\u1ea1n','Due')+'</th><th>'+_t('Tr\u1ea1ng th\u00e1i','Status')+'</th></tr></thead><tbody>';
    actions.forEach(function(a){
      html+='<tr><td>'+_esc(a.description||a.title||'-')+'</td><td>'+_esc(a.owner||'-')+'</td><td>'+_fmtDate(a.due_date)+'</td><td>'+_esc(a.status||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 h\u00e0nh \u0111\u1ed9ng','No action items')+'</div>';
  }
  html+='</div>';

  return html;
}

/* ── TAB: Customer Report ────────────────────────────── */
function _renderCustomerTab(){
  var html='';
  html+='<div class="cr-form-row">';
  html+='<div><label>'+_t('Kh\u00e1ch h\u00e0ng','Customer')+'</label><input type="text" data-filter="customer" value="'+_esc(state.selectedCustomer)+'" placeholder="'+_t('M\u00e3 KH','Customer ID')+'"/></div>';
  html+='<div><label>'+_t('Chu k\u1ef3','Period')+'</label>'+_periodSelector()+'</div>';
  html+='<div><button class="cr-btn cr-btn-primary" data-action="generate-customer"'+(state.generating?' disabled':'')+'>'+
    (state.generating?'<span class="cr-spinner"></span> ':'')+_t('T\u1ea1o','Generate')+'</button></div>';
  html+='</div>';

  var d=state.customerData;
  if(!d){
    html+='<div class="cr-empty">'+_t('Ch\u1ecdn kh\u00e1ch h\u00e0ng v\u00e0 chu k\u1ef3','Select customer and period')+'</div>';
    return html;
  }

  var sec=d.sections||{};

  // Quality metrics
  var qm=sec.quality_metrics||{};
  var dp=sec.delivery_performance||{};
  html+='<div class="cr-kpis">';
  html+=_kpiCard('PPM',String(qm.ppm||0),qm.ppm<=500?'#22c55e':'#ef4444');
  html+=_kpiCard('FPY',_pct(qm.fpy_pct),'#3b82f6');
  html+=_kpiCard('OTD',_pct(dp.otd_pct),dp.otd_pct>=95?'#22c55e':'#ef4444');
  html+='</div>';

  // CAPA status
  var capa=sec.capa_status||{};
  html+='<div class="cr-section"><h3>'+_t('Tr\u1ea1ng th\u00e1i CAPA','CAPA Status')+'</h3>';
  html+='<div style="display:flex;gap:20px;align-items:center">';
  html+=_completenessRing(capa.closure_rate||0);
  html+='<div class="cr-completeness-text">'+_t('T\u1ed5ng','Total')+': <b>'+_esc(capa.total||0)+'</b> &middot; '+_t('\u0110\u00e3 \u0111\u00f3ng','Closed')+': <b>'+_esc(capa.closed||0)+'</b></div>';
  html+='</div></div>';

  // NCR summary
  var ncrList=sec.ncr_summary||[];
  html+='<div class="cr-section"><h3>'+_t('T\u1ed5ng h\u1ee3p NCR','NCR Summary')+' ('+ncrList.length+')</h3>';
  if(ncrList.length>0){
    html+='<table class="cr-table"><thead><tr><th>ID</th><th>'+_t('Lo\u1ea1i l\u1ed7i','Defect')+'</th><th>'+_t('SL t\u1eeb ch\u1ed1i','Reject Qty')+'</th><th>'+_t('Tr\u1ea1ng th\u00e1i','Status')+'</th></tr></thead><tbody>';
    ncrList.forEach(function(n){
      html+='<tr><td>'+_esc(n.ncr_id||n.id||'-')+'</td><td>'+_esc(n.defect_type||'-')+'</td><td>'+_esc(n.reject_qty||0)+'</td><td>'+_esc(n.status||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 NCR','No NCRs')+'</div>';
  }
  html+='</div>';

  // FAI
  var fai=sec.fai_status||{};
  html+='<div class="cr-section"><h3>'+_t('Tr\u1ea1ng th\u00e1i FAI','FAI Status')+'</h3>';
  html+='<div style="display:flex;gap:20px">';
  html+=_kpiCard(_t('T\u1ed5ng','Total'),String(fai.total||0),'#475569');
  html+=_kpiCard(_t('\u0110\u00e3 duy\u1ec7t','Approved'),String(fai.approved||0),'#22c55e');
  html+=_kpiCard(_t('Ch\u1edd','Pending'),String(fai.pending||0),'#f59e0b');
  html+='</div></div>';

  return html;
}

/* ── TAB: Supplier Review ────────────────────────────── */
function _renderSupplierTab(){
  var html='';
  html+='<div class="cr-form-row">';
  html+='<div><label>'+_t('NCC','Supplier')+'</label><input type="text" data-filter="vendor" value="'+_esc(state.selectedVendor)+'" placeholder="'+_t('M\u00e3 NCC','Vendor ID')+'"/></div>';
  html+='<div><label>'+_t('Chu k\u1ef3','Period')+'</label>'+_periodSelector()+'</div>';
  html+='<div><button class="cr-btn cr-btn-primary" data-action="generate-supplier"'+(state.generating?' disabled':'')+'>'+
    (state.generating?'<span class="cr-spinner"></span> ':'')+_t('T\u1ea1o','Generate')+'</button></div>';
  html+='</div>';

  var d=state.supplierData;
  if(!d){
    html+='<div class="cr-empty">'+_t('Ch\u1ecdn NCC v\u00e0 chu k\u1ef3','Select supplier and period')+'</div>';
    return html;
  }

  var sec=d.sections||{};

  // Scorecard trend
  var trend=sec.scorecard_trend||[];
  html+='<div class="cr-section"><h3>'+_t('Xu h\u01b0\u1edbng \u0111i\u1ec3m s\u1ed1','Scorecard Trend')+'</h3>';
  if(trend.length>0){
    var barItems=trend.map(function(t){ return {label:t.period||t.date||'-',value:t.score||t.overall||0,color:t.score>=80?'#22c55e':t.score>=60?'#f59e0b':'#ef4444'}; });
    html+=_barChart(barItems,100);
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u','No data')+'</div>';
  }
  html+='</div>';

  // SCAR history
  var scars=sec.scar_history||[];
  html+='<div class="cr-section"><h3>'+_t('L\u1ecbch s\u1eed SCAR','SCAR History')+' ('+scars.length+')</h3>';
  if(scars.length>0){
    html+='<table class="cr-table"><thead><tr><th>SCAR #</th><th>'+_t('Ng\u00e0y','Date')+'</th><th>'+_t('M\u00f4 t\u1ea3','Description')+'</th><th>'+_t('Tr\u1ea1ng th\u00e1i','Status')+'</th></tr></thead><tbody>';
    scars.forEach(function(s){
      html+='<tr><td>'+_esc(s.scar_id||s.id||'-')+'</td><td>'+_fmtDate(s.date||s.created_at)+'</td><td>'+_esc(s.description||s.title||'-')+'</td><td>'+_esc(s.status||'-')+'</td></tr>';
    });
    html+='</tbody></table>';
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 SCAR','No SCARs')+'</div>';
  }
  html+='</div>';

  // Incoming inspection
  var incoming=sec.incoming_results||[];
  html+='<div class="cr-section"><h3>'+_t('Ki\u1ec3m tra nh\u1eadp h\u00e0ng','Incoming Inspection')+' ('+incoming.length+')</h3>';
  if(incoming.length>0){
    var passCount=0,failCount=0;
    incoming.forEach(function(i){ if(i.result==='pass'||i.status==='pass') passCount++; else failCount++; });
    html+='<div style="display:flex;gap:16px;margin-bottom:12px">';
    html+=_kpiCard(_t('\u0110\u1ea1t','Pass'),String(passCount),'#22c55e');
    html+=_kpiCard(_t('Kh\u00f4ng \u0111\u1ea1t','Fail'),String(failCount),'#ef4444');
    html+='</div>';
    html+='<table class="cr-table"><thead><tr><th>PO</th><th>'+_t('Ng\u00e0y','Date')+'</th><th>'+_t('K\u1ebft qu\u1ea3','Result')+'</th></tr></thead><tbody>';
    incoming.slice(0,10).forEach(function(i){
      var color=i.result==='pass'||i.status==='pass'?'#22c55e':'#ef4444';
      html+='<tr><td>'+_esc(i.po_number||i.lot||'-')+'</td><td>'+_fmtDate(i.date)+'</td><td>'+_statusBadge(i.result||i.status||'-',color)+'</td></tr>';
    });
    html+='</tbody></table>';
  } else {
    html+='<div class="cr-empty">'+_t('Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u','No data')+'</div>';
  }
  html+='</div>';

  // Certifications
  var certs=sec.certification_status||{};
  var certList=certs.certifications||certs.items||[];
  if(Array.isArray(certList)&&certList.length>0){
    html+='<div class="cr-section"><h3>'+_t('Ch\u1ee9ng nh\u1eadn','Certifications')+'</h3>';
    html+='<table class="cr-table"><thead><tr><th>'+_t('Ch\u1ee9ng nh\u1eadn','Certificate')+'</th><th>'+_t('H\u1ebft h\u1ea1n','Expiry')+'</th><th>'+_t('Tr\u1ea1ng th\u00e1i','Status')+'</th></tr></thead><tbody>';
    certList.forEach(function(c){
      html+='<tr><td>'+_esc(c.name||c.cert_type||'-')+'</td><td>'+_fmtDate(c.expiry||c.expiry_date)+'</td><td>'+_esc(c.status||'-')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }

  return html;
}

/* ── TAB: COPQ Analysis ──────────────────────────────── */
function _renderCopqTab(){
  var html='';
  html+='<div class="cr-form-row">';
  html+='<div><label>'+_t('Chu k\u1ef3','Period')+'</label>'+_periodSelector()+'</div>';
  html+='<div><button class="cr-btn cr-btn-primary" data-action="generate-copq"'+(state.generating?' disabled':'')+'>'+
    (state.generating?'<span class="cr-spinner"></span> ':'')+_t('T\u1ea1o','Generate')+'</button></div>';
  html+='</div>';

  var d=state.copqData;
  if(!d){
    html+='<div class="cr-empty">'+_t('Ch\u1ecdn chu k\u1ef3 v\u00e0 nh\u1ea5n T\u1ea1o','Select period and click Generate')+'</div>';
    return html;
  }

  var sec=d.sections||{};

  // Total COPQ
  html+='<div class="cr-kpis">';
  html+=_kpiCard(_t('T\u1ed5ng COPQ','Total COPQ'),_fmtCurrency(sec.total_copq||0),'#ef4444');
  html+=_kpiCard(_t('Ph\u00f2ng ng\u1eeba','Prevention'),_pct((sec.prevention||{}).pct),'#22c55e');
  html+=_kpiCard(_t('\u0110\u00e1nh gi\u00e1','Appraisal'),_pct((sec.appraisal||{}).pct),'#3b82f6');
  html+=_kpiCard(_t('L\u1ed7i n\u1ed9i b\u1ed9','Internal'),_pct((sec.internal_failure||{}).pct),'#f59e0b');
  html+=_kpiCard(_t('L\u1ed7i b\u00ean ngo\u00e0i','External'),_pct((sec.external_failure||{}).pct),'#ef4444');
  html+='</div>';

  // Stacked bar
  var total=sec.total_copq||0;
  if(total>0){
    html+='<div class="cr-section"><h4>'+_t('Ph\u00e2n b\u1ed5 PAF','PAF Distribution')+'</h4>';
    var segs=[
      {label:_t('Ph\u00f2ng ng\u1eeba','Prevention'),value:(sec.prevention||{}).total||0,color:COPQ_COLORS.prevention},
      {label:_t('\u0110\u00e1nh gi\u00e1','Appraisal'),value:(sec.appraisal||{}).total||0,color:COPQ_COLORS.appraisal},
      {label:_t('L\u1ed7i n\u1ed9i b\u1ed9','Internal'),value:(sec.internal_failure||{}).total||0,color:COPQ_COLORS.internal_failure},
      {label:_t('L\u1ed7i b\u00ean ngo\u00e0i','External'),value:(sec.external_failure||{}).total||0,color:COPQ_COLORS.external_failure}
    ];
    html+=_stackedBar(segs,total);
    html+='<div class="cr-legend">';
    segs.forEach(function(sg){
      html+='<div class="cr-legend-item"><div class="cr-legend-dot" style="background:'+sg.color+'"></div>'+_esc(sg.label)+' ('+_fmtCurrency(sg.value)+')</div>';
    });
    html+='</div></div>';
  }

  // Pareto - top defects
  var pareto=sec.pareto||{};
  var byDefect=pareto.by_defect||[];
  if(byDefect.length>0){
    html+='<div class="cr-section"><h3>'+_t('Pareto theo lo\u1ea1i l\u1ed7i','Pareto by Defect Type')+'</h3>';
    var maxCost=byDefect[0]?byDefect[0].cost:1;
    var barItems=byDefect.map(function(d){ return {label:d.label,value:d.cost,display:_fmtCurrency(d.cost),color:'#ef4444'}; });
    html+=_barChart(barItems,maxCost);
    html+='</div>';
  }

  var byMachine=pareto.by_machine||[];
  if(byMachine.length>0){
    html+='<div class="cr-section"><h3>'+_t('Pareto theo m\u00e1y','Pareto by Machine')+'</h3>';
    var mMax=byMachine[0]?byMachine[0].cost:1;
    var mItems=byMachine.map(function(d){ return {label:d.label,value:d.cost,display:_fmtCurrency(d.cost),color:'#f59e0b'}; });
    html+=_barChart(mItems,mMax);
    html+='</div>';
  }

  // 12-month trend
  var trend=sec.trend||[];
  if(trend.length>0){
    html+='<div class="cr-section"><h3>'+_t('Xu h\u01b0\u1edbng 12 th\u00e1ng','12-Month Trend')+'</h3>';
    html+=_trendChart(trend);
    html+='<div class="cr-legend">';
    html+='<div class="cr-legend-item"><div class="cr-legend-dot" style="background:'+COPQ_COLORS.prevention+'"></div>'+_t('Ph\u00f2ng ng\u1eeba','Prevention')+'</div>';
    html+='<div class="cr-legend-item"><div class="cr-legend-dot" style="background:'+COPQ_COLORS.appraisal+'"></div>'+_t('\u0110\u00e1nh gi\u00e1','Appraisal')+'</div>';
    html+='<div class="cr-legend-item"><div class="cr-legend-dot" style="background:'+COPQ_COLORS.internal_failure+'"></div>'+_t('N\u1ed9i b\u1ed9','Internal')+'</div>';
    html+='<div class="cr-legend-item"><div class="cr-legend-dot" style="background:'+COPQ_COLORS.external_failure+'"></div>'+_t('B\u00ean ngo\u00e0i','External')+'</div>';
    html+='</div></div>';
  }

  // Top cost drivers
  var drivers=sec.top_cost_drivers||[];
  if(drivers.length>0){
    html+='<div class="cr-section"><h3>'+_t('Top 10 nguy\u00ean nh\u00e2n chi ph\u00ed','Top 10 Cost Drivers')+'</h3>';
    html+='<table class="cr-table"><thead><tr><th>#</th><th>'+_t('Nguy\u00ean nh\u00e2n','Driver')+'</th><th>'+_t('Chi ph\u00ed','Cost')+'</th></tr></thead><tbody>';
    drivers.forEach(function(dr,i){
      html+='<tr><td>'+(i+1)+'</td><td>'+_esc(dr.label)+'</td><td style="font-weight:700">'+_fmtCurrency(dr.cost)+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }

  return html;
}

/* ── TAB: Evidence Package ───────────────────────────── */
function _renderEvidenceTab(){
  var html='';
  html+='<div class="cr-form-row">';
  html+='<div><label>'+_t('S\u1ed1 SO','SO Number')+'</label><input type="text" data-filter="so" value="'+_esc(state.soNumber)+'" placeholder="SO-2026-0001"/></div>';
  html+='<div><button class="cr-btn cr-btn-primary" data-action="generate-evidence"'+(state.generating?' disabled':'')+'>'+
    (state.generating?'<span class="cr-spinner"></span> ':'')+_t('Ki\u1ec3m tra','Check')+'</button></div>';
  html+='</div>';

  var d=state.evidenceData;
  if(!d){
    html+='<div class="cr-empty">'+_t('Nh\u1eadp s\u1ed1 SO v\u00e0 nh\u1ea5n Ki\u1ec3m tra','Enter SO number and click Check')+'</div>';
    return html;
  }

  // Completeness ring
  var summary=d.summary||{};
  var totalReq=summary.total_required||1;
  var totalPres=summary.total_present||0;
  var pct=Math.round((totalPres/totalReq)*100);

  html+='<div class="cr-section">';
  html+='<h3>'+_t('Ho\u00e0n ch\u1ec9nh giao h\u00e0ng','Shipment Completeness')+': '+_esc(d.so_number)+'</h3>';
  html+='<div class="cr-completeness">';
  html+=_completenessRing(pct);
  html+='<div class="cr-completeness-text">';
  html+='<div>'+_esc(totalPres)+' / '+_esc(totalReq)+' '+_t('lo\u1ea1i ch\u1ee9ng c\u1ee9','evidence types')+'</div>';
  html+='<div style="margin-top:4px;font-size:.8125rem">'+_esc(summary.total_items||0)+' '+_t('t\u00e0i li\u1ec7u','documents')+'</div>';
  if(d.complete){
    html+='<div style="margin-top:8px;color:#22c55e;font-weight:700">'+_t('\u0110\u1ea7y \u0111\u1ee7 - s\u1eb5n s\u00e0ng giao','Complete - ready to ship')+'</div>';
  } else {
    html+='<div style="margin-top:8px;color:#ef4444;font-weight:700">'+_t('Thi\u1ebfu ch\u1ee9ng c\u1ee9','Missing evidence')+'</div>';
  }
  html+='</div></div></div>';

  // Checklist
  var template=d.template||{};
  var sections=template.sections||[];
  var items=d.items||[];
  var missing=d.missing||[];

  html+='<div class="cr-section"><h3>'+_t('Danh s\u00e1ch ki\u1ec3m tra','Checklist')+'</h3>';
  html+='<ul class="cr-checklist">';
  sections.forEach(function(sec){
    var key=sec.key;
    var isMissing=missing.indexOf(key)>=0;
    var secItems=items.filter(function(it){ return it.type===key; });
    var icon=isMissing?'\u274c':'\u2705';
    var statusText=isMissing?_t('Thi\u1ebfu','Missing'):_t('\u0110\u1ea1t','Present')+' ('+secItems.length+')';
    var statusColor=isMissing?'#ef4444':'#22c55e';

    html+='<li>';
    html+='<div class="cr-check-icon">'+icon+'</div>';
    html+='<div class="cr-check-label">'+_esc(_t(sec.label_vi,sec.label))+'</div>';
    html+='<span class="cr-badge" style="background:'+statusColor+'">'+_esc(statusText)+'</span>';
    html+='</li>';

    // Show individual items if present
    secItems.forEach(function(it){
      html+='<li style="padding-left:40px;font-size:.75rem;color:var(--text-secondary,#64748b)">';
      html+='<div class="cr-check-ref">'+_esc(it.reference||it.file_ref||'-')+'</div>';
      html+='</li>';
    });
  });
  html+='</ul></div>';

  return html;
}

/* ── paint ────────────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="cr">';
  html+=_renderTabs();
  html+='<div class="cr-content">';

  switch(state.activeTab){
    case 'dashboard':   html+=_renderDashboardTab(); break;
    case 'mgmt_review': html+=_renderMgmtReviewTab(); break;
    case 'customer':    html+=_renderCustomerTab(); break;
    case 'supplier':    html+=_renderSupplierTab(); break;
    case 'copq':        html+=_renderCopqTab(); break;
    case 'evidence':    html+=_renderEvidenceTab(); break;
    default:            html+=_renderDashboardTab();
  }

  html+='</div></div>';
  state.container.innerHTML=html;
}

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  // Load report types from config
  _api('compliance_report_list',{},'POST').then(function(res){
    if(res&&res.ok&&res.data){
      state.reportTypes=res.data;
    }
  }).catch(function(){});

  // Load report history
  _api('compliance_report_history',{},'POST').then(function(res){
    if(res&&res.ok&&res.data){
      state.generatedReports=res.data;
      _paint();
    }
  }).catch(function(){});
}

function _generate(action, payload, targetKey){
  state.generating=true;
  _paint();
  _api(action,payload,'POST').then(function(res){
    state.generating=false;
    if(res&&res.ok&&res.data){
      state[targetKey]=res.data;
      // Refresh history
      _api('compliance_report_history',{},'POST').then(function(hr){
        if(hr&&hr.ok&&hr.data) state.generatedReports=hr.data;
        _paint();
      }).catch(function(){ _paint(); });
      _toast(_t('\u0110\u00e3 t\u1ea1o b\u00e1o c\u00e1o th\u00e0nh c\u00f4ng','Report generated successfully'),'success');
    } else {
      _paint();
      _toast((res&&res.error)||_t('L\u1ed7i t\u1ea1o b\u00e1o c\u00e1o','Failed to generate report'),'error');
    }
  }).catch(function(err){
    state.generating=false;
    _paint();
    _toast(_t('L\u1ed7i k\u1ebft n\u1ed1i','Connection error'),'error');
  });
}

/* ── tab routing from report type cards ──────────────── */
var REPORT_TAB_MAP = {
  management_review: 'mgmt_review',
  customer_quality:  'customer',
  supplier_review:   'supplier',
  audit_package:     'dashboard',
  copq_analysis:     'copq',
  evidence_package:  'evidence'
};

/* ── event binding ────────────────────────────────────── */
function _bind(){
  state.container.addEventListener('click', function(e){
    var el=e.target.closest('[data-tab]');
    if(el){
      state.activeTab=el.getAttribute('data-tab');
      _paint();
      return;
    }

    var action=e.target.closest('[data-action]');
    if(!action) return;
    var act=action.getAttribute('data-action');

    switch(act){
      case 'goto-tab':
        var rt=action.getAttribute('data-report-type');
        if(rt&&REPORT_TAB_MAP[rt]){
          state.activeTab=REPORT_TAB_MAP[rt];
          _paint();
        }
        break;

      case 'generate-mgmt':
        _generate('compliance_report_management_review',{period:state.selectedPeriod},'mgmtData');
        break;

      case 'generate-customer':
        if(!state.selectedCustomer){ _toast(_t('Vui l\u00f2ng nh\u1eadp m\u00e3 KH','Please enter customer ID'),'warning'); return; }
        _generate('compliance_report_customer_quality',{period:state.selectedPeriod,customer_id:state.selectedCustomer},'customerData');
        break;

      case 'generate-supplier':
        if(!state.selectedVendor){ _toast(_t('Vui l\u00f2ng nh\u1eadp m\u00e3 NCC','Please enter vendor ID'),'warning'); return; }
        _generate('compliance_report_supplier_review',{period:state.selectedPeriod,vendor_id:state.selectedVendor},'supplierData');
        break;

      case 'generate-copq':
        _generate('compliance_report_copq',{period:state.selectedPeriod},'copqData');
        break;

      case 'generate-evidence':
        if(!state.soNumber){ _toast(_t('Vui l\u00f2ng nh\u1eadp s\u1ed1 SO','Please enter SO number'),'warning'); return; }
        _generate('compliance_report_evidence_package',{so_number:state.soNumber},'evidenceData');
        break;

      case 'view-report':
        var rid=action.getAttribute('data-report-id');
        _toast(_t('Xem b\u00e1o c\u00e1o: ','View report: ')+rid,'info');
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='period'){ state.selectedPeriod=e.target.value; }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='customer') state.selectedCustomer=e.target.value.trim();
    if(f==='vendor')   state.selectedVendor=e.target.value.trim();
    if(f==='so')       state.soNumber=e.target.value.trim();
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='dashboard';
  state.selectedReport=null;
  state.mgmtData=null;
  state.customerData=null;
  state.supplierData=null;
  state.copqData=null;
  state.evidenceData=null;
  _paint();
  _bind();
  _loadData();
}

window._renderComplianceReports = render;

})();

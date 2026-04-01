/* ===================================================================
   28-continuous-improvement.js
   HESEM QMS Portal - Continuous Improvement / Kaizen Tracking
   Activates improvement_projects table (migration 014).
   Suggestion box, PDCA project board, A3 problem solving, ROI.
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

/* -- constants ------------------------------------------------ */
var STYLE_ID = 'ci-styles';
var TABS = [
  { key:'dashboard',  vi:'Tong quan',        en:'CI Dashboard' },
  { key:'suggest',    vi:'De xuat',          en:'Submit Suggestion' },
  { key:'board',      vi:'Bang du an',       en:'Project Board' },
  { key:'a3',         vi:'A3 Problem',       en:'A3 Problem Solving' },
  { key:'roi',        vi:'ROI Tracker',      en:'ROI Tracker' }
];

var PDCA_PHASES = {
  plan:   { vi:'Plan',  en:'Plan',   color:'#3b82f6', bg:'rgba(59,130,246,.08)' },
  do:     { vi:'Do',    en:'Do',     color:'#f59e0b', bg:'rgba(245,158,11,.08)' },
  check:  { vi:'Check', en:'Check',  color:'#8b5cf6', bg:'rgba(139,92,246,.08)' },
  act:    { vi:'Act',   en:'Act',    color:'#10b981', bg:'rgba(16,185,129,.08)' },
  closed: { vi:'Dong',  en:'Closed', color:'#6b7280', bg:'rgba(107,114,128,.08)' }
};
var PDCA_ORDER = ['plan','do','check','act','closed'];

var SUGGESTION_CATEGORIES = {
  quality:      { vi:'Chat luong',   en:'Quality',      color:'#3b82f6' },
  productivity: { vi:'Nang suat',    en:'Productivity',  color:'#10b981' },
  safety:       { vi:'An toan',      en:'Safety',        color:'#ef4444' },
  cost:         { vi:'Chi phi',      en:'Cost',          color:'#f59e0b' },
  ergonomics:   { vi:'Ergonomics',   en:'Ergonomics',    color:'#8b5cf6' }
};

var SUG_STATUS = {
  submitted: { vi:'Da gui',       en:'Submitted',  color:'#3b82f6' },
  reviewing: { vi:'Dang xem xet', en:'Reviewing',  color:'#f59e0b' },
  approved:  { vi:'Chap nhan',    en:'Approved',   color:'#22c55e' },
  rejected:  { vi:'Tu choi',      en:'Rejected',   color:'#94a3b8' },
  implemented:{ vi:'Da thuc hien', en:'Implemented', color:'#10b981' }
};

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'dashboard',
  projects: [],
  suggestions: [],
  selectedProject: null,
  dashboard: null,
  roi: [],
  filters: { status:'all', category:'all' },
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.ci{padding:16px;max-width:1200px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.ci-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}',
    '.ci-tab{padding:8px 16px;font-size:.82rem;font-weight:600;cursor:pointer;border-radius:8px;border:2px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);transition:all .15s}',
    '.ci-tab:hover{border-color:var(--brand,#1565c0);color:var(--brand,#1565c0)}',
    '.ci-tab.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:#fff}',
    /* KPI row */
    '.ci-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}',
    '.ci-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;text-align:center}',
    '.ci-kpi-val{font-size:1.6rem;font-weight:800;color:var(--brand,#1565c0)}',
    '.ci-kpi-label{font-size:.75rem;color:var(--text-secondary,#64748b);margin-top:2px}',
    /* donut chart (CSS-based) */
    '.ci-donut-wrap{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:20px}',
    '.ci-donut{width:160px;height:160px;border-radius:50%;position:relative;display:flex;align-items:center;justify-content:center}',
    '.ci-donut-center{width:80px;height:80px;border-radius:50%;background:var(--surface,#fff);position:absolute;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem}',
    '.ci-donut-legend{display:flex;flex-direction:column;gap:6px;font-size:.82rem}',
    '.ci-donut-legend-item{display:flex;align-items:center;gap:6px}',
    '.ci-donut-swatch{width:12px;height:12px;border-radius:3px}',
    /* kanban board */
    '.ci-board{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;min-height:300px}',
    '@media(max-width:900px){.ci-board{grid-template-columns:1fr}}',
    '.ci-col{background:var(--bg-alt,#f8fafc);border-radius:10px;padding:10px;min-height:200px}',
    '.ci-col-title{font-weight:700;font-size:.82rem;text-align:center;padding:6px;border-radius:6px;margin-bottom:8px}',
    '.ci-proj-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:10px;margin-bottom:8px;font-size:.82rem;cursor:pointer;transition:box-shadow .15s}',
    '.ci-proj-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}',
    '.ci-proj-card-title{font-weight:700;margin-bottom:4px}',
    '.ci-proj-card-meta{color:var(--text-secondary,#64748b);font-size:.75rem}',
    '.ci-transition{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}',
    '.ci-trans-btn{padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:600;cursor:pointer;border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);transition:all .12s}',
    '.ci-trans-btn:hover{background:var(--brand,#1565c0);color:#fff;border-color:var(--brand,#1565c0)}',
    /* form */
    '.ci-form{display:grid;gap:14px;max-width:700px}',
    '.ci-form label{display:block;font-weight:600;font-size:.82rem;margin-bottom:4px}',
    '.ci-form input,.ci-form select,.ci-form textarea{width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.85rem;background:var(--surface,#fff);box-sizing:border-box}',
    '.ci-form textarea{min-height:100px;resize:vertical}',
    /* buttons */
    '.ci-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;border:none;transition:all .15s}',
    '.ci-btn-primary{background:var(--brand,#1565c0);color:#fff}',
    '.ci-btn-primary:hover{opacity:.9}',
    '.ci-btn-secondary{background:var(--bg-alt,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#e2e8f0)}',
    /* A3 template */
    '.ci-a3{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}',
    '@media(max-width:768px){.ci-a3{grid-template-columns:1fr}}',
    '.ci-a3-box{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;min-height:100px}',
    '.ci-a3-box h5{margin:0 0 8px;font-size:.85rem;color:var(--brand,#1565c0)}',
    '.ci-a3-box p{font-size:.82rem;line-height:1.6;margin:0;white-space:pre-wrap}',
    '.ci-a3-full{grid-column:1/-1}',
    /* activity feed */
    '.ci-feed{max-height:300px;overflow-y:auto;border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px}',
    '.ci-feed-item{padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:.82rem;display:flex;gap:8px}',
    '.ci-feed-item:last-child{border-bottom:none}',
    '.ci-feed-date{color:var(--text-secondary,#64748b);white-space:nowrap;font-size:.72rem;min-width:70px}',
    /* ROI table */
    '.ci-table{width:100%;border-collapse:collapse;font-size:.82rem}',
    '.ci-table th,.ci-table td{padding:8px 10px;border-bottom:1px solid var(--border,#e2e8f0);text-align:left}',
    '.ci-table th{background:var(--bg-alt,#f8fafc);font-weight:700;position:sticky;top:0}',
    '.ci-table tr:hover td{background:rgba(59,130,246,.03)}',
    /* bar chart */
    '.ci-bar-chart{display:flex;flex-direction:column;gap:6px;max-width:600px;margin-top:12px}',
    '.ci-bar-row{display:flex;align-items:center;gap:8px;font-size:.8rem}',
    '.ci-bar-label{width:100px;text-align:right;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ci-bar{height:22px;border-radius:4px;min-width:4px;transition:width .3s}',
    '.ci-bar-val{font-weight:700;font-size:.75rem;color:var(--text-secondary,#64748b)}',
    '.ci-empty{text-align:center;padding:40px 20px;color:var(--text-secondary,#64748b);font-size:.9rem}',
    '.ci-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ============================================================= */
/*  Tab renderers                                                 */
/* ============================================================= */

/* -- CI Dashboard --------------------------------------------- */
function _renderDashboardTab(){
  var d=state.dashboard||{};
  var html='<h3 style="margin:0 0 16px">'+_t('Cai tien lien tuc','Continuous Improvement Dashboard')+'</h3>';

  /* KPIs */
  html+='<div class="ci-kpi-row">';
  html+='<div class="ci-kpi"><div class="ci-kpi-val">'+_esc(d.active_projects||0)+'</div><div class="ci-kpi-label">'+_t('Du an dang hoat dong','Active Projects')+'</div></div>';
  html+='<div class="ci-kpi"><div class="ci-kpi-val">'+_esc(d.suggestions_count||0)+'</div><div class="ci-kpi-label">'+_t('De xuat da gui','Suggestions Submitted')+'</div></div>';
  html+='<div class="ci-kpi"><div class="ci-kpi-val">'+_esc(d.implemented_count||0)+'</div><div class="ci-kpi-label">'+_t('Da thuc hien','Implemented')+'</div></div>';
  html+='<div class="ci-kpi"><div class="ci-kpi-val" style="font-size:1.2rem">'+_esc(_fmtVND(d.total_cost_saved||0))+' <span style="font-size:.7rem">VND</span></div><div class="ci-kpi-label">'+_t('Tiet kiem','Cost Saved')+'</div></div>';
  html+='</div>';

  /* Donut chart — projects by PDCA phase */
  var phases=d.phase_counts||{};
  var total=0; PDCA_ORDER.forEach(function(k){ total+=(phases[k]||0); });
  html+='<div class="ci-donut-wrap">';
  if(total>0){
    var gradient='', cumPct=0;
    PDCA_ORDER.forEach(function(k){
      var count=phases[k]||0;
      var pct=(count/total)*100;
      var ph=PDCA_PHASES[k];
      gradient+=(cumPct===0?'':',')+ph.color+' '+cumPct.toFixed(1)+'% '+(cumPct+pct).toFixed(1)+'%';
      cumPct+=pct;
    });
    html+='<div class="ci-donut" style="background:conic-gradient('+gradient+')"><div class="ci-donut-center">'+total+'</div></div>';
  } else {
    html+='<div class="ci-donut" style="background:#e2e8f0"><div class="ci-donut-center">0</div></div>';
  }
  html+='<div class="ci-donut-legend">';
  PDCA_ORDER.forEach(function(k){
    var ph=PDCA_PHASES[k];
    html+='<div class="ci-donut-legend-item"><span class="ci-donut-swatch" style="background:'+ph.color+'"></span>'+_esc(_t(ph.vi,ph.en))+': '+(phases[k]||0)+'</div>';
  });
  html+='</div></div>';

  /* activity feed */
  var feed=d.recent_activity||[];
  if(feed.length){
    html+='<h4 style="margin:16px 0 8px">'+_t('Hoat dong gan day','Recent Activity')+'</h4>';
    html+='<div class="ci-feed">';
    feed.forEach(function(f){
      html+='<div class="ci-feed-item"><span class="ci-feed-date">'+_esc(_fmtDate(f.date))+'</span><span>'+_esc(f.text)+'</span></div>';
    });
    html+='</div>';
  }
  return html;
}

/* -- Submit Suggestion ---------------------------------------- */
function _renderSuggestTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Gui de xuat cai tien','Submit Improvement Suggestion')+'</h3>';
  html+='<div class="ci-form">';
  html+='<div><label>'+_t('Tieu de','Title')+' *</label><input type="text" id="ci-s-title"></div>';
  html+='<div><label>'+_t('Danh muc','Category')+' *</label><select id="ci-s-category">';
  Object.keys(SUGGESTION_CATEGORIES).forEach(function(k){ var c=SUGGESTION_CATEGORIES[k]; html+='<option value="'+k+'">'+_esc(_t(c.vi,c.en))+'</option>'; });
  html+='</select></div>';
  html+='<div><label>'+_t('Mo ta','Description')+' *</label><textarea id="ci-s-desc" placeholder="'+_esc(_t('Mo ta van de va giai phap de xuat...','Describe the problem and proposed solution...'))+'"></textarea></div>';
  html+='<div><label>'+_t('Loi ich du kien','Expected Benefit')+'</label><textarea id="ci-s-benefit" style="min-height:60px" placeholder="'+_esc(_t('Tiet kiem chi phi, tang nang suat, giam loi...','Cost savings, productivity gain, defect reduction...'))+'"></textarea></div>';
  html+='<div><label>'+_t('Khu vuc / May / Quy trinh anh huong','Affected Area / Machine / Process')+'</label><input type="text" id="ci-s-area"></div>';
  html+='<div style="display:flex;gap:8px;margin-top:4px">';
  html+='<button class="ci-btn ci-btn-primary" data-action="submit-suggestion">'+_t('Gui de xuat','Submit Suggestion')+'</button>';
  html+='<button class="ci-btn ci-btn-secondary" data-action="tab" data-tab="dashboard">'+_t('Huy','Cancel')+'</button>';
  html+='</div></div>';
  return html;
}

/* -- Project Board (Kanban) ----------------------------------- */
function _renderBoardTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">';
  html+='<h3 style="margin:0">'+_t('Bang du an Kaizen','Kaizen Project Board')+'</h3>';
  html+='<button class="ci-btn ci-btn-primary" data-action="show-create-project">+ '+_t('Du an moi','New Project')+'</button>';
  html+='</div>';

  html+='<div class="ci-board">';
  PDCA_ORDER.forEach(function(phase){
    var ph=PDCA_PHASES[phase];
    var cards=state.projects.filter(function(p){ return p.phase===phase; });
    html+='<div class="ci-col">';
    html+='<div class="ci-col-title" style="background:'+ph.bg+';color:'+ph.color+'">'+_esc(_t(ph.vi,ph.en))+' ('+cards.length+')</div>';
    cards.forEach(function(proj){
      html+='<div class="ci-proj-card" data-action="select-project" data-id="'+_esc(proj.id)+'">';
      html+='<div class="ci-proj-card-title">'+_esc(proj.title)+'</div>';
      html+='<div class="ci-proj-card-meta">'+_esc(proj.owner||'---')+' &middot; '+_esc(_fmtDate(proj.target_date))+'</div>';
      if(proj.cost_impact) html+='<div style="font-size:.72rem;color:#22c55e;font-weight:700;margin-top:2px">'+_esc(_fmtVND(proj.cost_impact))+' VND</div>';
      /* transition buttons */
      html+='<div class="ci-transition">';
      var idx=PDCA_ORDER.indexOf(phase);
      if(idx>0) html+='<span class="ci-trans-btn" data-action="transition" data-id="'+_esc(proj.id)+'" data-phase="'+PDCA_ORDER[idx-1]+'">&larr; '+_esc(PDCA_PHASES[PDCA_ORDER[idx-1]].en)+'</span>';
      if(idx<PDCA_ORDER.length-1) html+='<span class="ci-trans-btn" data-action="transition" data-id="'+_esc(proj.id)+'" data-phase="'+PDCA_ORDER[idx+1]+'">'+_esc(PDCA_PHASES[PDCA_ORDER[idx+1]].en)+' &rarr;</span>';
      html+='</div>';
      html+='</div>';
    });
    html+='</div>';
  });
  html+='</div>';

  /* inline project creation form (hidden by default) */
  html+='<div id="ci-create-project-form" style="display:none;margin-top:16px">';
  html+='<h4 style="margin:0 0 12px">'+_t('Tao du an moi','Create New Project')+'</h4>';
  html+='<div class="ci-form">';
  html+='<div><label>'+_t('Ten du an','Project Title')+' *</label><input type="text" id="ci-p-title"></div>';
  html+='<div><label>'+_t('Nguoi phu trach','Owner')+'</label><input type="text" id="ci-p-owner"></div>';
  html+='<div><label>'+_t('Danh muc','Category')+'</label><select id="ci-p-category">';
  Object.keys(SUGGESTION_CATEGORIES).forEach(function(k){ var c=SUGGESTION_CATEGORIES[k]; html+='<option value="'+k+'">'+_esc(_t(c.vi,c.en))+'</option>'; });
  html+='</select></div>';
  html+='<div><label>'+_t('Ngay muc tieu','Target Date')+'</label><input type="date" id="ci-p-target"></div>';
  html+='<div><label>'+_t('Mo ta','Description')+'</label><textarea id="ci-p-desc"></textarea></div>';
  html+='<div><label>'+_t('Tac dong chi phi du kien (VND)','Expected Cost Impact (VND)')+'</label><input type="number" id="ci-p-cost" min="0"></div>';
  html+='<div style="display:flex;gap:8px"><button class="ci-btn ci-btn-primary" data-action="create-project">'+_t('Tao','Create')+'</button><button class="ci-btn ci-btn-secondary" data-action="hide-create-project">'+_t('Huy','Cancel')+'</button></div>';
  html+='</div></div>';
  return html;
}

/* -- A3 Problem Solving --------------------------------------- */
function _renderA3Tab(){
  var proj=state.selectedProject;
  if(!proj){
    /* show project selector */
    var html='<h3 style="margin:0 0 16px">'+_t('A3 Problem Solving','A3 Problem Solving')+'</h3>';
    if(!state.projects.length) return html+'<div class="ci-empty">'+_t('Chua co du an nao.','No projects yet.')+'</div>';
    html+='<div style="margin-bottom:12px;font-size:.85rem">'+_t('Chon du an de xem A3:','Select a project to view its A3:')+'</div>';
    state.projects.forEach(function(p){
      html+='<div class="ci-proj-card" data-action="select-project-a3" data-id="'+_esc(p.id)+'" style="max-width:500px"><div class="ci-proj-card-title">'+_esc(p.title)+'</div><div class="ci-proj-card-meta">'+_esc(p.owner)+' &middot; Phase: '+_esc(p.phase)+'</div></div>';
    });
    return html;
  }

  var a3=proj.a3||{};
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">';
  html+='<h3 style="margin:0">A3: '+_esc(proj.title)+'</h3>';
  html+='<button class="ci-btn ci-btn-secondary" data-action="deselect-project">&larr; '+_t('Quay lai','Back')+'</button>';
  html+='</div>';

  html+='<div class="ci-a3">';
  var sections=[
    {key:'background',       vi:'Boi canh',            en:'Background',          full:false},
    {key:'current_condition', vi:'Tinh trang hien tai', en:'Current Condition',   full:false},
    {key:'goal',             vi:'Muc tieu',            en:'Goal',                full:false},
    {key:'root_cause',       vi:'Nguyen nhan goc',     en:'Root Cause Analysis', full:false},
    {key:'countermeasures',  vi:'Bien phap',           en:'Countermeasures',     full:true},
    {key:'implementation',   vi:'Ke hoach thuc hien',  en:'Implementation Plan', full:true},
    {key:'followup',         vi:'Theo doi',            en:'Follow-up',           full:true}
  ];
  sections.forEach(function(sec){
    html+='<div class="ci-a3-box'+(sec.full?' ci-a3-full':'')+'">';
    html+='<h5>'+_esc(_t(sec.vi,sec.en))+'</h5>';
    html+='<p>'+_esc(a3[sec.key]||_t('Chua co du lieu','No data yet'))+'</p>';
    html+='</div>';
  });
  html+='</div>';

  /* linked data */
  if(proj.linked_fmea||proj.linked_ncr){
    html+='<div style="margin-top:14px;font-size:.82rem">';
    if(proj.linked_fmea) html+='<div><strong>'+_t('FMEA lien quan:','Linked FMEA:')+'</strong> '+_esc(proj.linked_fmea)+'</div>';
    if(proj.linked_ncr) html+='<div><strong>'+_t('NCR/CAPA lien quan:','Linked NCR/CAPA:')+'</strong> '+_esc(proj.linked_ncr)+'</div>';
    html+='</div>';
  }
  return html;
}

/* -- ROI Tracker ---------------------------------------------- */
function _renderRoiTab(){
  var html='<h3 style="margin:0 0 16px">'+_t('Theo doi ROI','ROI Tracker')+'</h3>';
  var completed=state.roi.length?state.roi:state.projects.filter(function(p){ return p.phase==='closed'&&p.cost_to_implement!=null; });

  if(!completed.length){
    html+='<div class="ci-empty">'+_t('Chua co du an hoan thanh de tinh ROI.','No completed projects to calculate ROI.')+'</div>';
    return html;
  }

  html+='<div style="overflow-x:auto"><table class="ci-table"><thead><tr>';
  html+='<th>'+_t('Du an','Project')+'</th>';
  html+='<th style="text-align:right">'+_t('Chi phi','Cost to Implement')+'</th>';
  html+='<th style="text-align:right">'+_t('Tiet kiem/nam','Annual Savings')+'</th>';
  html+='<th style="text-align:right">ROI%</th>';
  html+='<th style="text-align:right">'+_t('Payback (thang)','Payback (months)')+'</th>';
  html+='<th>'+_t('Danh muc','Category')+'</th>';
  html+='</tr></thead><tbody>';

  var totalSaved=0, savingsByCategory={};
  completed.forEach(function(p){
    var cost=Number(p.cost_to_implement)||0;
    var savings=Number(p.annual_savings)||0;
    var roi=cost>0?Math.round((savings/cost)*100):0;
    var payback=savings>0?Math.round((cost/savings)*12*10)/10:0;
    totalSaved+=savings;
    var catKey=p.category||'quality';
    savingsByCategory[catKey]=(savingsByCategory[catKey]||0)+savings;

    var cat=SUGGESTION_CATEGORIES[catKey]||SUGGESTION_CATEGORIES.quality;
    html+='<tr>';
    html+='<td>'+_esc(p.title)+'</td>';
    html+='<td style="text-align:right">'+_esc(_fmtVND(cost))+'</td>';
    html+='<td style="text-align:right;color:#22c55e;font-weight:700">'+_esc(_fmtVND(savings))+'</td>';
    html+='<td style="text-align:right;font-weight:700">'+_esc(roi)+'%</td>';
    html+='<td style="text-align:right">'+_esc(payback)+'</td>';
    html+='<td><span class="ci-badge" style="background:rgba(0,0,0,.06);color:'+cat.color+'">'+_esc(_t(cat.vi,cat.en))+'</span></td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';

  html+='<div style="margin-top:14px;font-weight:700;font-size:.95rem">'+_t('Tong tiet kiem hang nam:','Total Annual Savings:')+' <span style="color:#22c55e">'+_esc(_fmtVND(totalSaved))+' VND</span></div>';

  /* savings by category bar chart */
  var catKeys=Object.keys(savingsByCategory);
  if(catKeys.length){
    html+='<h4 style="margin:20px 0 8px">'+_t('Tiet kiem theo danh muc','Savings by Category')+'</h4>';
    var maxVal=Math.max.apply(null,catKeys.map(function(k){return savingsByCategory[k];}))||1;
    html+='<div class="ci-bar-chart">';
    catKeys.forEach(function(k){
      var cat=SUGGESTION_CATEGORIES[k]||SUGGESTION_CATEGORIES.quality;
      var val=savingsByCategory[k];
      var pct=Math.round((val/maxVal)*100);
      html+='<div class="ci-bar-row"><span class="ci-bar-label">'+_esc(_t(cat.vi,cat.en))+'</span><div class="ci-bar" style="width:'+pct+'%;background:'+cat.color+'"></div><span class="ci-bar-val">'+_esc(_fmtVND(val))+'</span></div>';
    });
    html+='</div>';
  }
  return html;
}

/* ============================================================= */
/*  Data loading                                                  */
/* ============================================================= */
function _loadDashboard(){
  state.loading=true; _paint();
  _api('ci_dashboard',{}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.dashboard=r.dashboard||r;
      state.projects=r.projects||state.projects;
      state.suggestions=r.suggestions||state.suggestions;
      state.roi=r.roi||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadProjects(){
  _api('ci_project_list', state.filters).then(function(r){
    if(r&&r.ok){ state.projects=r.projects||[]; _paint(); }
  }).catch(function(){});
}

/* ============================================================= */
/*  Main paint                                                    */
/* ============================================================= */
function _paint(){
  if(!state.container) return;
  var html='<div class="ci">';
  html+='<div class="ci-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="ci-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="ci-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'dashboard': html+=_renderDashboardTab(); break;
      case 'suggest':   html+=_renderSuggestTab(); break;
      case 'board':     html+=_renderBoardTab(); break;
      case 'a3':        html+=_renderA3Tab(); break;
      case 'roi':       html+=_renderRoiTab(); break;
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
        state.activeTab=t.getAttribute('data-tab'); _paint(); break;
      case 'submit-suggestion':
        var title=(state.container.querySelector('#ci-s-title')||{}).value||'';
        var desc=(state.container.querySelector('#ci-s-desc')||{}).value||'';
        if(!title||!desc){ _toast(_t('Nhap tieu de va mo ta','Enter title and description'),'warning'); break; }
        _api('ci_suggestion_create',{
          title:title,
          category:(state.container.querySelector('#ci-s-category')||{}).value||'quality',
          description:desc,
          expected_benefit:(state.container.querySelector('#ci-s-benefit')||{}).value||'',
          affected_area:(state.container.querySelector('#ci-s-area')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){ _toast(_t('Da gui de xuat!','Suggestion submitted!'),'success'); state.activeTab='dashboard'; _loadDashboard(); }
          else { _toast(_t('Loi','Error'),'error'); }
        });
        break;
      case 'show-create-project':
        var form=state.container.querySelector('#ci-create-project-form');
        if(form) form.style.display='block';
        break;
      case 'hide-create-project':
        var form2=state.container.querySelector('#ci-create-project-form');
        if(form2) form2.style.display='none';
        break;
      case 'create-project':
        var pTitle=(state.container.querySelector('#ci-p-title')||{}).value||'';
        if(!pTitle){ _toast(_t('Nhap ten du an','Enter project title'),'warning'); break; }
        _api('ci_project_create',{
          title:pTitle,
          owner:(state.container.querySelector('#ci-p-owner')||{}).value||'',
          category:(state.container.querySelector('#ci-p-category')||{}).value||'quality',
          target_date:(state.container.querySelector('#ci-p-target')||{}).value||'',
          description:(state.container.querySelector('#ci-p-desc')||{}).value||'',
          cost_impact:Number((state.container.querySelector('#ci-p-cost')||{}).value)||0
        }).then(function(r){
          if(r&&r.ok){ _toast(_t('Da tao du an!','Project created!'),'success'); _loadProjects(); }
          else { _toast(_t('Loi','Error'),'error'); }
        });
        break;
      case 'transition':
        var projId=t.getAttribute('data-id');
        var newPhase=t.getAttribute('data-phase');
        _api('ci_project_transition',{id:projId, phase:newPhase}).then(function(r){
          if(r&&r.ok){ _toast(_t('Da chuyen','Transitioned'),'success'); _loadProjects(); }
          else { _toast(_t('Loi','Error'),'error'); }
        });
        break;
      case 'select-project':
        var id=t.getAttribute('data-id');
        state.selectedProject=state.projects.find(function(p){ return String(p.id)===String(id); })||null;
        _paint();
        break;
      case 'select-project-a3':
        var aid=t.getAttribute('data-id');
        state.selectedProject=state.projects.find(function(p){ return String(p.id)===String(aid); })||null;
        _paint();
        break;
      case 'deselect-project':
        state.selectedProject=null; _paint();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; _loadProjects(); }
  });
}

/* ============================================================= */
/*  Entry point                                                   */
/* ============================================================= */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='dashboard';
  state.selectedProject=null;
  state.filters={status:'all', category:'all'};
  _paint();
  _bind();
  _loadDashboard();
}

window._renderContinuousImprovement = render;

})();

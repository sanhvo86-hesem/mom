/* ===================================================================
   25-apqp-ppap.js
   HESEM MOM Portal - APQP (AS9145) & PPAP Management
   Aerospace product quality planning: 5-phase APQP, gate reviews,
   PPAP submissions (11 elements), PSW, lessons learned.
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
var STYLE_ID = 'ap-styles';
var TABS = [
  { key:'dashboard', vi:'Tong quan',       en:'Dashboard' },
  { key:'detail',    vi:'Chi tiet du an',  en:'Project Detail' },
  { key:'gate',      vi:'Gate Review',     en:'Gate Review' },
  { key:'ppap',      vi:'PPAP Submission', en:'PPAP Submission' },
  { key:'create',    vi:'Tao du an',       en:'Create Project' },
  { key:'lessons',   vi:'Bai hoc KN',      en:'Lessons Learned' }
];

var PHASES = [
  { num:1, vi:'Lap ke hoach',       en:'Plan & Define',    color:'var(--blue-light,#3b82f6)' },
  { num:2, vi:'Thiet ke SP',        en:'Product Design',   color:'var(--purple-light,#8b5cf6)' },
  { num:3, vi:'Thiet ke QT',        en:'Process Design',   color:'var(--amber-light,#f59e0b)' },
  { num:4, vi:'Xac nhan SP & QT',   en:'Validation',       color:'var(--green-light,#10b981)' },
  { num:5, vi:'San xuat',           en:'Production',       color:'var(--text-secondary,#6b7280)' }
];

/* PROJECT_STATUS — đọc từ HmRegistry → 'apqp_project_status' */
var PROJECT_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('apqp_project_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {active:{vi:'Hoạt động',en:'Active',color:'var(--green-light,#22c55e)'},on_hold:{vi:'Tạm dừng',en:'On Hold',color:'var(--amber-light,#f59e0b)'},completed:{vi:'Hoàn thành',en:'Completed',color:'var(--blue-light,#3b82f6)'},cancelled:{vi:'Đã hủy',en:'Cancelled',color:'var(--text-secondary,#94a3b8)'}}; }
  return map;
})();

var GATE_DECISION = {
  approved:    { vi:'Duyệt',         en:'Approved',    color:'var(--green-light,#22c55e)' },
  conditional: { vi:'Có điều kiện',  en:'Conditional', color:'var(--amber-light,#f59e0b)' },
  rejected:    { vi:'Từ chối',       en:'Rejected',    color:'var(--red-light,#ef4444)' },
  pending:     { vi:'Chờ duyệt',     en:'Pending',     color:'var(--text-secondary,#94a3b8)' }
};

var PPAP_ELEMENTS = [
  { num:1,  vi:'Hồ sơ thiết kế',         en:'Design Records' },
  { num:2,  vi:'DFMEA',                   en:'DFMEA' },
  { num:3,  vi:'Sơ đồ quy trình',        en:'Process Flow Diagram' },
  { num:4,  vi:'PFMEA',                   en:'PFMEA' },
  { num:5,  vi:'Control Plan',            en:'Control Plan' },
  { num:6,  vi:'MSA',                     en:'MSA Studies' },
  { num:7,  vi:'Kết quả đo lường',        en:'Dimensional Results' },
  { num:8,  vi:'Thử nghiệm vật liệu',    en:'Material Test Results' },
  { num:9,  vi:'Thử nghiệm hiệu suất',   en:'Performance Test Results' },
  { num:10, vi:'FAI',                     en:'First Article Inspection' },
  { num:11, vi:'PSW',                     en:'Part Submission Warrant' }
];

/* ELEMENT_STATUS — đọc từ HmRegistry → 'apqp_element_status' */
var ELEMENT_STATUS = (function(){
  var map = {};
  if(window.HmRegistry){ HmRegistry.statusSet('apqp_element_status').forEach(function(o){ map[o.value]={vi:o.label,en:o.labelEn,color:o.color}; }); }
  if(!Object.keys(map).length){ map = {not_required:{vi:'Không yêu cầu',en:'Not Required',color:'#94a3b8'},pending:{vi:'Chờ',en:'Pending',color:'#f59e0b'},submitted:{vi:'Đã nộp',en:'Submitted',color:'#3b82f6'},approved:{vi:'Đã duyệt',en:'Approved',color:'#22c55e'},rejected:{vi:'Từ chối',en:'Rejected',color:'#ef4444'}}; }
  return map;
})();

/* AS9145 phase deliverables */
var PHASE_DELIVERABLES = {
  1:['Voice of Customer','Quality objectives','BOM preliminary','Risk assessment','Project timing plan','Team assignment'],
  2:['DFMEA','Design reviews','DVP&R','Special characteristics','Subcontractor build'],
  3:['PFMEA','Process flow diagram','Control plan (pre-launch)','Floor plan layout','MSA plan','Operator instructions'],
  4:['Production trial run','MSA results','Cpk/Ppk studies','PPAP submission','Control plan (production)','Quality planning sign-off'],
  5:['Lessons learned','Reduced variation','Customer satisfaction','Delivery & service']
};

/* -- state ---------------------------------------------------- */
var state = {
  container: null,
  activeTab: 'dashboard',
  projects: [],
  selectedProject: null,
  gates: [],
  ppapSubmissions: [],
  selectedPpap: null,
  lessons: [],
  kpi: {},
  filters: { phase:'all', status:'all' },
  lessonFilter: '',
  loading: false
};

/* -- CSS injection -------------------------------------------- */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.ap{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.ap-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.ap-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.ap-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.ap-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.ap-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.ap-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.ap-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.ap-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.ap-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.ap-filters select,.ap-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.ap-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.ap-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.ap-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.ap-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.ap-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:var(--text-inverse,#fff);white-space:nowrap}',
    '.ap-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.ap-btn-primary{background:var(--brand,#1565c0);color:var(--text-inverse,#fff)}',
    '.ap-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.ap-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.ap-btn-secondary:hover{background:var(--border,#e2e8f0)}',
    '.ap-btn-danger{background:var(--red-light,#ef4444);color:var(--text-inverse,#fff)}',
    '.ap-btn-success{background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)}',
    '.ap-btn-warning{background:var(--amber-light,#f59e0b);color:var(--text-inverse,#fff)}',
    '.ap-btn-sm{padding:4px 10px;font-size:.75rem}',
    '.ap-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px;transition:box-shadow .15s}',
    '.ap-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.06)}',
    '.ap-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;margin-bottom:16px}',
    '.ap-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.ap-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.ap-form input,.ap-form select,.ap-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.ap-form textarea{min-height:80px;resize:vertical}',
    '.ap-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    /* phase timeline */
    '.ap-phase-bar{display:flex;align-items:center;gap:0;margin:20px 0}',
    '.ap-phase-node{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:800;border:3px solid var(--border,#d1d5db);background:var(--bg-surface,#fff);color:var(--text-secondary,#94a3b8);position:relative;z-index:1;flex-shrink:0}',
    '.ap-phase-node.completed{border-color:var(--green-light,#22c55e);background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)}',
    '.ap-phase-node.active{border-color:var(--brand,#1565c0);background:var(--brand,#1565c0);color:var(--text-inverse,#fff);box-shadow:0 0 0 6px rgba(21,101,192,.2);animation:ap-pulse 2s ease-in-out infinite}',
    '@keyframes ap-pulse{0%,100%{box-shadow:0 0 0 4px rgba(21,101,192,.15)}50%{box-shadow:0 0 0 8px rgba(21,101,192,.25)}}',
    '.ap-phase-line{flex:1;height:3px;background:var(--border,#d1d5db)}',
    '.ap-phase-line.completed{background:var(--green-light,#22c55e)}',
    '.ap-phase-labels{display:flex;align-items:flex-start;gap:0;margin-top:6px}',
    '.ap-phase-label{flex:1;text-align:center;font-size:.625rem;color:var(--text-secondary,#64748b)}',
    /* checklist */
    '.ap-checklist{list-style:none;padding:0;margin:0}',
    '.ap-checklist li{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#f1f5f9);font-size:.8125rem}',
    '.ap-checklist li input[type=checkbox]{width:18px;height:18px;cursor:pointer}',
    '.ap-check-done{text-decoration:line-through;color:var(--text-secondary,#94a3b8)}',
    /* PPAP elements grid */
    '.ap-ppap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:16px 0}',
    '.ap-ppap-element{border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.ap-ppap-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6875rem;font-weight:800;color:var(--text-inverse,#fff);background:var(--brand,#1565c0);flex-shrink:0}',
    /* progress bar */
    '.ap-progress{height:8px;border-radius:4px;background:var(--border,#e2e8f0);overflow:hidden}',
    '.ap-progress-fill{height:100%;border-radius:4px;transition:width .3s}',
    /* PSW section */
    '.ap-psw{border:2px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;margin-top:16px}',
    /* mini bar chart */
    '.ap-minibar{display:flex;align-items:flex-end;gap:2px;height:40px}',
    '.ap-minibar-seg{flex:1;border-radius:2px 2px 0 0;min-width:6px}'
  ].join('\n');
  document.head.appendChild(s);
}

/* -- badge helpers -------------------------------------------- */
function _statusBadge(status){
  if(window.HmRegistry) return HmRegistry.badge('apqp_project_status', status);
  /* legacy fallback below */
  var m=PROJECT_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="ap-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _gateBadge(decision){
  var m=GATE_DECISION[decision]||{vi:decision,en:decision,color:'var(--text-secondary,#64748b)'};
  return '<span class="ap-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _elemBadge(status){
  var m=ELEMENT_STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="ap-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _phaseBadge(num){
  var p=PHASES[num-1]; if(!p) return '';
  return '<span class="ap-badge" style="background:'+p.color+'">'+_t('Giai doan','Phase')+' '+p.num+'</span>';
}
function _kpiCard(label, value, color){
  return '<div class="ap-kpi"><div class="ap-kpi-label">'+_esc(label)+'</div><div class="ap-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* -- phase timeline ------------------------------------------- */
function _renderPhaseTimeline(currentPhase){
  var cp=parseInt(currentPhase)||1;
  var html='<div class="ap-phase-bar">';
  PHASES.forEach(function(p, i){
    if(i>0){
      html+='<div class="ap-phase-line'+(p.num<cp?' completed':'')+'"></div>';
    }
    var cls='ap-phase-node';
    if(p.num<cp) cls+=' completed';
    else if(p.num===cp) cls+=' active';
    html+='<div class="'+cls+'">'+p.num+'</div>';
  });
  html+='</div>';
  html+='<div class="ap-phase-labels">';
  PHASES.forEach(function(p){
    html+='<div class="ap-phase-label">'+_esc(_t(p.vi,p.en))+'</div>';
  });
  html+='</div>';
  return html;
}

/* ============================================================= */
/* TAB 1: Dashboard                                              */
/* ============================================================= */
function _renderDashboardTab(){
  var k=state.kpi;
  var html='<div class="ap-kpis">';
  html+=_kpiCard(_t('Du an hoat dong','Active Projects'), k.active_count||0, 'var(--green-light,#22c55e)');
  html+=_kpiCard(_t('Gate qua han','Overdue Gates'), k.overdue_gates||0, 'var(--red-light,#ef4444)');
  html+=_kpiCard(_t('PPAP cho duyet','PPAP Pending'), k.ppap_pending||0, 'var(--amber-light,#f59e0b)');

  /* phase distribution mini bar */
  var dist=k.phase_distribution||{1:0,2:0,3:0,4:0,5:0};
  var maxDist=1; for(var dk in dist){ if(dist[dk]>maxDist) maxDist=dist[dk]; }
  html+='<div class="ap-kpi"><div class="ap-kpi-label">'+_t('Phan bo giai doan','Phase Distribution')+'</div>';
  html+='<div class="ap-minibar">';
  PHASES.forEach(function(p){
    var h=Math.max(4,Math.round(((dist[p.num]||0)/maxDist)*36));
    html+='<div class="ap-minibar-seg" style="height:'+h+'px;background:'+p.color+'" title="P'+p.num+': '+(dist[p.num]||0)+'"></div>';
  });
  html+='</div></div>';
  html+='</div>';

  /* Project cards */
  var html2='<div class="ap-filters">';
  html2+='<select data-filter="status"><option value="all">'+_t('Tat ca trang thai','All Status')+'</option>';
  Object.keys(PROJECT_STATUS).forEach(function(k){ var m=PROJECT_STATUS[k]; html2+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
  html2+='</select>';
  html2+='<select data-filter="phase"><option value="all">'+_t('Tat ca giai doan','All Phases')+'</option>';
  PHASES.forEach(function(p){ html2+='<option value="'+p.num+'"'+(state.filters.phase==p.num?' selected':'')+'>P'+p.num+' - '+_esc(_t(p.vi,p.en))+'</option>'; });
  html2+='</select>';
  html2+='<button class="ap-btn ap-btn-primary" data-action="go-create">+ '+_t('Tao du an','New Project')+'</button>';
  html2+='</div>';
  html+=html2;

  var rows=state.projects;
  if(state.filters.status!=='all') rows=rows.filter(function(p){ return p.status===state.filters.status; });
  if(state.filters.phase!=='all') rows=rows.filter(function(p){ return p.current_phase==state.filters.phase; });

  if(!rows.length) return html+'<div class="ap-empty">'+_t('Chua co du an','No projects')+'</div>';

  html+='<div class="ap-card-grid">';
  rows.forEach(function(p){
    var phasesCompleted=Math.max(0,(parseInt(p.current_phase)||1)-1);
    var pct=Math.round((phasesCompleted/5)*100);
    html+='<div class="ap-card" data-action="select-project" data-id="'+_esc(p.id)+'" style="cursor:pointer">';
    html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html+='<strong>'+_esc(p.number||p.id)+'</strong>';
    html+=_statusBadge(p.status);
    html+='</div>';
    html+='<div style="font-size:.8125rem;margin-bottom:4px">'+_esc(p.item||'-')+' | '+_esc(p.customer||'-')+'</div>';
    html+='<div style="margin-bottom:6px">'+_phaseBadge(p.current_phase||1)+'</div>';
    html+='<div class="ap-progress"><div class="ap-progress-fill" style="width:'+pct+'%;background:var(--brand,#1565c0)"></div></div>';
    html+='<div style="font-size:.6875rem;color:var(--text-secondary,#64748b);margin-top:4px">'+phasesCompleted+'/5 '+_t('giai doan','phases')+'</div>';
    html+='</div>';
  });
  html+='</div>';
  return html;
}

/* ============================================================= */
/* TAB 2: Project Detail                                         */
/* ============================================================= */
function _renderDetailTab(){
  var p=state.selectedProject;
  if(!p) return '<div class="ap-empty">'+_t('Chon du an tu Dashboard','Select a project from Dashboard')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<div>';
  html+='<h3 style="margin:0">'+_esc(p.number||p.id)+' '+_statusBadge(p.status)+'</h3>';
  html+='<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:4px">'+_esc(p.item||'-')+' | '+_t('Khach hang','Customer')+': '+_esc(p.customer||'-')+' | '+_t('Truong nhom','Lead')+': '+_esc(p.team_lead||'-')+'</div>';
  html+='</div>';
  html+='<button class="ap-btn ap-btn-secondary" data-action="go-dashboard">'+_t('Quay lai','Back')+'</button>';
  html+='</div>';

  /* Phase timeline */
  html+=_renderPhaseTimeline(p.current_phase||1);

  var cp=parseInt(p.current_phase)||1;

  /* Current phase deliverables */
  html+='<div class="ap-card" style="margin-top:16px"><h4 style="margin:0 0 12px">'+_t('Giai doan','Phase')+' '+cp+': '+_esc(_t(PHASES[cp-1].vi, PHASES[cp-1].en))+' - '+_t('San pham ban giao','Deliverables')+'</h4>';
  var deliverables=PHASE_DELIVERABLES[cp]||[];
  var delivStatus=p.deliverable_status||{};
  html+='<ul class="ap-checklist">';
  deliverables.forEach(function(d, i){
    var done=delivStatus[cp+'_'+i];
    html+='<li><input type="checkbox" class="ap-deliv-check" data-phase="'+cp+'" data-idx="'+i+'"'+(done?' checked':'')+'>'
      +'<span class="'+(done?'ap-check-done':'')+'">'+_esc(d)+'</span></li>';
  });
  html+='</ul></div>';

  /* Gate review status */
  var gateForPhase=(state.gates||[]).find(function(g){ return g.phase==cp; });
  html+='<div class="ap-card"><h4 style="margin:0 0 8px">'+_t('Gate Review','Gate Review')+' - P'+cp+'</h4>';
  if(gateForPhase){
    html+='<div>'+_t('Ket qua','Decision')+': '+_gateBadge(gateForPhase.decision||'pending')+'</div>';
    if(gateForPhase.notes) html+='<div style="font-size:.8125rem;margin-top:6px;color:var(--text-secondary,#64748b)">'+_esc(gateForPhase.notes)+'</div>';
  } else {
    html+='<div style="font-size:.8125rem;color:var(--text-secondary,#94a3b8)">'+_t('Chua co gate review','No gate review yet')+'</div>';
  }
  html+='<div style="margin-top:8px"><button class="ap-btn ap-btn-primary ap-btn-sm" data-action="go-gate">'+_t('Thuc hien Gate Review','Conduct Gate Review')+'</button></div>';
  html+='</div>';

  /* Linked references */
  html+='<div class="ap-card"><h4 style="margin:0 0 8px">'+_t('Lien ket','Linked References')+'</h4>';
  html+='<div style="display:flex;gap:16px;font-size:.8125rem;flex-wrap:wrap">';
  html+='<div>FMEA: <strong>'+_esc(p.fmea_ref||'-')+'</strong></div>';
  html+='<div>Control Plan: <strong>'+_esc(p.cp_ref||'-')+'</strong></div>';
  html+='<div>PPAP: <strong>'+_esc(p.ppap_ref||'-')+'</strong></div>';
  html+='</div></div>';

  return html;
}

/* ============================================================= */
/* TAB 3: Gate Review                                            */
/* ============================================================= */
function _renderGateTab(){
  var p=state.selectedProject;
  if(!p) return '<div class="ap-empty">'+_t('Chon du an truoc','Select a project first')+'</div>';

  var cp=parseInt(p.current_phase)||1;
  var deliverables=PHASE_DELIVERABLES[cp]||[];
  var delivStatus=p.deliverable_status||{};
  var doneCount=0;
  deliverables.forEach(function(d,i){ if(delivStatus[cp+'_'+i]) doneCount++; });
  var pct=deliverables.length?Math.round((doneCount/deliverables.length)*100):0;

  var html='<div class="ap-card"><h3 style="margin:0 0 16px">'+_t('Gate Review','Gate Review')+' - '+_esc(p.number||p.id)+' P'+cp+'</h3>';

  /* Progress bar */
  html+='<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:.75rem;font-weight:600;margin-bottom:4px"><span>'+_t('Tien do','Progress')+'</span><span>'+pct+'%</span></div>';
  html+='<div class="ap-progress" style="height:12px"><div class="ap-progress-fill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green-light,#22c55e)':pct>=50?'var(--amber-light,#f59e0b)':'var(--red-light,#ef4444)')+'"></div></div></div>';

  /* Deliverables checklist */
  html+='<h4 style="margin:0 0 8px">'+_t('San pham ban giao','Deliverables')+'</h4>';
  html+='<ul class="ap-checklist">';
  deliverables.forEach(function(d,i){
    var done=delivStatus[cp+'_'+i];
    html+='<li><input type="checkbox" class="ap-deliv-check" data-phase="'+cp+'" data-idx="'+i+'"'+(done?' checked':'')+'>';
    html+='<span class="'+(done?'ap-check-done':'')+'">'+_esc(d)+'</span>';
    html+='<span class="ap-badge" style="background:'+(done?'var(--green-light,#22c55e)':'var(--text-secondary,#94a3b8)')+';margin-left:auto">'+(done?'OK':'Pending')+'</span>';
    html+='</li>';
  });
  html+='</ul>';

  /* Reviewers */
  var reviewers=p.gate_reviewers||[];
  if(reviewers.length){
    html+='<h4 style="margin:16px 0 8px">'+_t('Nguoi duyet','Reviewers')+'</h4>';
    html+='<div style="display:flex;gap:12px;flex-wrap:wrap">';
    reviewers.forEach(function(r){
      html+='<div style="display:flex;align-items:center;gap:6px;font-size:.8125rem">'
        +'<span style="width:10px;height:10px;border-radius:50%;background:'+(r.signed?'var(--green-light,#22c55e)':'var(--text-secondary,#94a3b8)')+'"></span>'
        +_esc(r.name)+' '+(r.signed?'<span style="color:var(--green-light,#22c55e);font-size:.75rem">Signed</span>':'')
        +'</div>';
    });
    html+='</div>';
  }

  /* Meeting minutes */
  html+='<h4 style="margin:16px 0 8px">'+_t('Bien ban hop','Meeting Minutes')+'</h4>';
  html+='<textarea id="ap-gate-minutes" style="width:100%;min-height:100px;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem" placeholder="'+_t('Ghi chu...','Notes...')+'"></textarea>';

  /* Action items */
  html+='<h4 style="margin:16px 0 8px">'+_t('Hanh dong can thuc hien','Action Items')+'</h4>';
  html+='<textarea id="ap-gate-actions" style="width:100%;min-height:60px;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem" placeholder="'+_t('Mot hanh dong moi dong...','One action item per line...')+'"></textarea>';

  /* Decision buttons */
  html+='<div style="margin-top:16px;display:flex;gap:8px">';
  html+='<button class="ap-btn ap-btn-success" data-action="gate-approve">'+_t('Duyet','Approve')+'</button>';
  html+='<button class="ap-btn ap-btn-warning" data-action="gate-conditional">'+_t('Co dieu kien','Conditional')+'</button>';
  html+='<button class="ap-btn ap-btn-danger" data-action="gate-reject">'+_t('Tu choi','Reject')+'</button>';
  html+='</div></div>';
  return html;
}

/* ============================================================= */
/* TAB 4: PPAP Submission                                        */
/* ============================================================= */
function _renderPpapTab(){
  var p=state.selectedProject;
  if(!p) return '<div class="ap-empty">'+_t('Chon du an truoc','Select a project first')+'</div>';

  var ppap=state.selectedPpap||(state.ppapSubmissions.length?state.ppapSubmissions[0]:null);
  if(!ppap) return '<div class="ap-empty">'+_t('Chua co PPAP','No PPAP submission yet')+'<br><button class="ap-btn ap-btn-primary" style="margin-top:12px" data-action="create-ppap">'+_t('Tao PPAP','Create PPAP')+'</button></div>';

  /* Overall rollup */
  var elements=ppap.elements||[];
  var approvedCount=0, totalRequired=0;
  PPAP_ELEMENTS.forEach(function(pe){
    var el=elements.find(function(e){return e.num===pe.num;});
    var st=el?el.status:'pending';
    if(st!=='not_required') totalRequired++;
    if(st==='approved') approvedCount++;
  });
  var overallPct=totalRequired?Math.round((approvedCount/totalRequired)*100):0;

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<div><h3 style="margin:0">PPAP - '+_esc(p.number||p.id)+'</h3>';
  html+='<div style="font-size:.8125rem;color:var(--text-secondary,#64748b);margin-top:4px">'+_t('Tien do','Progress')+': '+approvedCount+'/'+totalRequired+' ('+overallPct+'%)</div></div>';
  html+='<button class="ap-btn ap-btn-secondary" data-action="back-dashboard">'+_t('Quay lai','Back')+'</button></div>';

  html+='<div class="ap-progress" style="height:10px;margin-bottom:16px"><div class="ap-progress-fill" style="width:'+overallPct+'%;background:'+(overallPct>=100?'var(--green-light,#22c55e)':'var(--brand,#1565c0)')+'"></div></div>';

  /* Elements table */
  html+='<table class="ap-table"><thead><tr>';
  html+='<th>#</th><th>'+_t('Yeu to','Element')+'</th><th>'+_t('Trang thai','Status')+'</th><th>'+_t('Tham chieu','Reference')+'</th><th>'+_t('Ngay','Date')+'</th><th></th>';
  html+='</tr></thead><tbody>';
  PPAP_ELEMENTS.forEach(function(pe){
    var el=elements.find(function(e){return e.num===pe.num;})||{};
    var st=el.status||'pending';
    html+='<tr>';
    html+='<td><span class="ap-ppap-num">'+pe.num+'</span></td>';
    html+='<td><strong>'+_esc(_t(pe.vi,pe.en))+'</strong></td>';
    html+='<td><select class="ap-elem-status" data-num="'+pe.num+'" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border,#d1d5db);font-size:.75rem">';
    Object.keys(ELEMENT_STATUS).forEach(function(k){ var m=ELEMENT_STATUS[k]; html+='<option value="'+k+'"'+(st===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>'; });
    html+='</select></td>';
    html+='<td>'+_esc(el.reference||'-')+'</td>';
    html+='<td>'+_fmtDate(el.date)+'</td>';
    html+='<td><button class="ap-btn ap-btn-secondary ap-btn-sm" data-action="upload-ppap-ref" data-num="'+pe.num+'">'+_t('Tai len','Upload')+'</button></td>';
    html+='</tr>';
  });
  html+='</tbody></table>';

  /* PSW section */
  html+='<div class="ap-psw"><h4 style="margin:0 0 12px">'+_t('PSW - Part Submission Warrant','PSW - Part Submission Warrant')+'</h4>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:.8125rem">';
  html+='<div><strong>'+_t('Nha cung cap','Supplier')+':</strong> '+_esc(ppap.supplier_name||p.item||'-')+'</div>';
  html+='<div><strong>'+_t('Khach hang','Customer')+':</strong> '+_esc(p.customer||'-')+'</div>';
  html+='<div><strong>'+_t('Ngay nop','Submission Date')+':</strong> '+_fmtDate(ppap.submission_date)+'</div>';
  html+='<div><strong>'+_t('Cap do','Level')+':</strong> '+_esc(ppap.level||3)+'</div>';
  html+='</div>';

  /* Customer response */
  html+='<h4 style="margin:16px 0 8px">'+_t('Phan hoi khach hang','Customer Response')+'</h4>';
  var custResp=ppap.customer_response||'pending';
  html+='<div>'+_t('Trang thai','Status')+': '+_gateBadge(custResp)+'</div>';
  if(ppap.customer_comments) html+='<div style="font-size:.8125rem;margin-top:6px;color:var(--text-secondary,#64748b)">'+_esc(ppap.customer_comments)+'</div>';
  html+='</div>';
  return html;
}

/* ============================================================= */
/* TAB 5: Create Project                                         */
/* ============================================================= */
function _renderCreateTab(){
  var html='<div class="ap-card"><h3 style="margin:0 0 16px">'+_t('Tao du an APQP moi','Create New APQP Project')+'</h3>';
  html+='<div class="ap-form">';
  html+='<div><label>'+_t('Item / Part','Item / Part')+'</label><input type="text" id="ap-f-item"></div>';
  html+='<div><label>'+_t('Khach hang','Customer')+'</label><input type="text" id="ap-f-customer"></div>';
  html+='<div><label>'+_t('Ngay muc tieu PPAP','Target PPAP Date')+'</label><input type="date" id="ap-f-target"></div>';
  html+='<div><label>'+_t('Cap do PPAP','Submission Level')+'</label><select id="ap-f-level">';
  for(var l=1;l<=5;l++) html+='<option value="'+l+'"'+(l===3?' selected':'')+'> Level '+l+'</option>';
  html+='</select></div>';
  html+='<div><label>'+_t('Truong nhom','Team Lead')+'</label><input type="text" id="ap-f-lead"></div>';
  html+='<div><label>'+_t('Thanh vien','Team Members')+'</label><input type="text" id="ap-f-team" placeholder="'+_t('Phan cach dau phay','Comma-separated')+'"></div>';
  html+='<div><label>'+_t('SO lien ket','Linked SO')+'</label><input type="text" id="ap-f-so"></div>';
  html+='</div>';
  html+='<div style="margin-top:14px;display:flex;gap:8px">';
  html+='<button class="ap-btn ap-btn-primary" data-action="submit-project">'+_t('Tao du an','Create Project')+'</button>';
  html+='<button class="ap-btn ap-btn-secondary" data-action="go-dashboard">'+_t('Huy','Cancel')+'</button>';
  html+='</div></div>';
  return html;
}

/* ============================================================= */
/* TAB 6: Lessons Learned                                        */
/* ============================================================= */
function _renderLessonsTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html+='<h3 style="margin:0">'+_t('Bai hoc kinh nghiem','Lessons Learned')+'</h3>';
  html+='<div class="ap-filters" style="margin-bottom:0">';
  html+='<input type="text" data-lessonfilter="search" placeholder="'+_t('Tim kiem...','Search...')+'" value="'+_esc(state.lessonFilter)+'" style="width:200px">';
  html+='</div></div>';

  var lessons=state.lessons;
  if(state.lessonFilter){
    var q=state.lessonFilter.toLowerCase();
    lessons=lessons.filter(function(l){
      return (l.title||'').toLowerCase().indexOf(q)>=0
        || (l.description||'').toLowerCase().indexOf(q)>=0
        || (l.tags||[]).some(function(t){return t.toLowerCase().indexOf(q)>=0;});
    });
  }

  if(!lessons.length) return html+'<div class="ap-empty">'+_t('Chua co bai hoc','No lessons learned yet')+'</div>';

  /* Group by phase */
  PHASES.forEach(function(phase){
    var phaseLessons=lessons.filter(function(l){ return l.phase==phase.num; });
    if(!phaseLessons.length) return;
    html+='<h4 style="margin:16px 0 8px;color:'+phase.color+'">'+_t('Giai doan','Phase')+' '+phase.num+': '+_esc(_t(phase.vi,phase.en))+'</h4>';
    phaseLessons.forEach(function(l){
      html+='<div class="ap-card" style="cursor:default">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center">';
      html+='<strong>'+_esc(l.title||'-')+'</strong>';
      html+='<div style="font-size:.6875rem;color:var(--text-secondary,#64748b)">'+_fmtDate(l.created_at)+' | '+_esc(l.project_ref||'-')+'</div>';
      html+='</div>';
      html+='<div style="font-size:.8125rem;margin-top:6px">'+_esc(l.description||'-')+'</div>';
      if(l.tags&&l.tags.length){
        html+='<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">';
        l.tags.forEach(function(tag){
          html+='<span class="ap-badge" style="background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)">'+_esc(tag)+'</span>';
        });
        html+='</div>';
      }
      html+='</div>';
    });
  });

  /* Unphased lessons */
  var unphased=lessons.filter(function(l){ return !l.phase; });
  if(unphased.length){
    html+='<h4 style="margin:16px 0 8px">'+_t('Chung','General')+'</h4>';
    unphased.forEach(function(l){
      html+='<div class="ap-card" style="cursor:default"><strong>'+_esc(l.title||'-')+'</strong>';
      html+='<div style="font-size:.8125rem;margin-top:6px">'+_esc(l.description||'-')+'</div></div>';
    });
  }
  return html;
}

/* -- data loading --------------------------------------------- */
function _loadProjects(){
  state.loading=true; _paint();
  _api('apqp_list', state.filters).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.projects=r.projects||[];
      state.kpi=r.kpi||{};
      state.lessons=r.lessons||[];
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadProjectDetail(id){
  state.loading=true; _paint();
  _api('apqp_detail', {id:id}).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.selectedProject=r.project||null;
      state.gates=r.gates||[];
      state.ppapSubmissions=r.ppap_submissions||[];
      state.selectedPpap=state.ppapSubmissions.length?state.ppapSubmissions[0]:null;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

/* -- main paint ----------------------------------------------- */
function _paint(){
  if(!state.container) return;
  var html='<div class="ap">';
  html+='<div class="ap-tabs">';
  TABS.forEach(function(tab){
    var hidden=(tab.key==='detail'||tab.key==='gate'||tab.key==='ppap')&&!state.selectedProject;
    if(hidden) return;
    html+='<div class="ap-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="ap-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'dashboard': html+=_renderDashboardTab(); break;
      case 'detail':    html+=_renderDetailTab(); break;
      case 'gate':      html+=_renderGateTab(); break;
      case 'ppap':      html+=_renderPpapTab(); break;
      case 'create':    html+=_renderCreateTab(); break;
      case 'lessons':   html+=_renderLessonsTab(); break;
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
      case 'go-dashboard': case 'back-dashboard':
        state.activeTab='dashboard'; _paint(); break;
      case 'go-create':
        state.activeTab='create'; _paint(); break;
      case 'go-gate':
        state.activeTab='gate'; _paint(); break;
      case 'select-project':
        _loadProjectDetail(t.getAttribute('data-id'));
        state.activeTab='detail';
        break;
      case 'submit-project':
        _api('apqp_create',{
          item:(state.container.querySelector('#ap-f-item')||{}).value||'',
          customer:(state.container.querySelector('#ap-f-customer')||{}).value||'',
          target_date:(state.container.querySelector('#ap-f-target')||{}).value||'',
          level:parseInt((state.container.querySelector('#ap-f-level')||{}).value)||3,
          team_lead:(state.container.querySelector('#ap-f-lead')||{}).value||'',
          team_members:((state.container.querySelector('#ap-f-team')||{}).value||'').split(',').map(function(s){return s.trim();}).filter(Boolean),
          linked_so:(state.container.querySelector('#ap-f-so')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Du an da tao','Project created'),'success'); state.activeTab='dashboard'; _loadProjects();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'gate-approve': case 'gate-conditional': case 'gate-reject':
        if(!state.selectedProject) break;
        var decision=action.replace('gate-','');
        _api('apqp_gate_review',{
          project_id:state.selectedProject.id,
          phase:state.selectedProject.current_phase||1,
          decision:decision,
          minutes:(state.container.querySelector('#ap-gate-minutes')||{}).value||'',
          action_items:(state.container.querySelector('#ap-gate-actions')||{}).value||''
        }).then(function(r){
          if(r&&r.ok){_toast(_t('Gate review da luu','Gate review saved'),'success'); _loadProjectDetail(state.selectedProject.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'create-ppap':
        if(!state.selectedProject) break;
        _api('ppap_create',{project_id:state.selectedProject.id}).then(function(r){
          if(r&&r.ok){_toast(_t('PPAP da tao','PPAP created'),'success'); _loadProjectDetail(state.selectedProject.id);}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'upload-ppap-ref':
        _toast(_t('Chuc nang tai len dang phat trien','Upload feature in development'),'info');
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f){ state.filters[f]=e.target.value; _paint(); return; }

    /* PPAP element status change */
    if(e.target.classList.contains('ap-elem-status') && state.selectedPpap){
      var num=e.target.getAttribute('data-num');
      _api('ppap_update_element',{ppap_id:state.selectedPpap.id,element_num:parseInt(num),status:e.target.value}).then(function(r){
        if(r&&r.ok){_toast(_t('Da cap nhat','Updated'),'success'); _loadProjectDetail(state.selectedProject.id);}
        else {_toast(_t('Loi','Error'),'error');}
      });
    }

    /* Deliverable check */
    if(e.target.classList.contains('ap-deliv-check') && state.selectedProject){
      var phase=e.target.getAttribute('data-phase');
      var idx=e.target.getAttribute('data-idx');
      _api('apqp_toggle_deliverable',{
        project_id:state.selectedProject.id,
        key:phase+'_'+idx,
        done:e.target.checked
      }).then(function(r){
        if(r&&r.ok){
          if(!state.selectedProject.deliverable_status) state.selectedProject.deliverable_status={};
          state.selectedProject.deliverable_status[phase+'_'+idx]=e.target.checked;
        }
      });
    }
  });

  state.container.addEventListener('input', function(e){
    var lf=e.target.getAttribute('data-lessonfilter');
    if(lf==='search'){ state.lessonFilter=e.target.value; _paint(); }
  });
}

/* -- entry point ---------------------------------------------- */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='dashboard';
  state.selectedProject=null;
  state.selectedPpap=null;
  _paint();
  _bind();
  _loadProjects();
}

window._renderApqpPpap = render;

/* Bridge: expose inside EQMS Shell module registry.
 * When user clicks APQP/PPAP inside EQMS Shell, shows a card linking
 * to the full standalone APQP/PPAP page (avoids CSS nesting conflicts). */
window.EqmsModules = window.EqmsModules || {};
window.EqmsModules['apqp-ppap'] = {
  render: function(container) {
    var isEn = (typeof window.lang !== 'undefined' && window.lang === 'en');
    container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;height:100%;box-sizing:border-box">'
      + '<div style="font-size:3em;margin-bottom:16px">\u{1F3AF}</div>'
      + '<h2 style="margin:0 0 8px;font-size:1.4em;font-weight:700">APQP / PPAP</h2>'
      + '<p style="color:#6b7280;margin:0 0 4px;font-size:0.95em">'
      + (isEn ? 'Advanced Product Quality Planning &amp; Production Part Approval Process' : 'Lập kế hoạch Chất lượng Sản phẩm Nâng cao &amp; Phê duyệt Chi tiết Sản xuất')
      + '</p>'
      + '<p style="font-size:0.82em;color:#9ca3af;margin:0 0 24px">AS9145 / IATF 16949 &nbsp;&middot;&nbsp; '
      + (isEn ? '5-phase APQP · PPAP levels 1-5 · Gate Reviews · PSW' : 'APQP 5 pha · PPAP cấp độ 1-5 · Gate Reviews · PSW')
      + '</p>'
      + '<button onclick="window.navigateTo&&navigateTo(\'apqp-ppap\')" style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:11px 28px;cursor:pointer;font-size:1em;font-weight:600;letter-spacing:0.01em">'
      + (isEn ? 'Open APQP / PPAP \u2192' : 'M\u1edf module APQP / PPAP \u2192')
      + '</button>'
      + '</div>';
  }
};

})();

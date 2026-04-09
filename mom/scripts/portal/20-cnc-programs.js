/* ===================================================================
   20-cnc-programs.js
   HESEM MOM Portal - CNC Program Management
   NC program library, version control, G-code diff, setup sheets,
   and approval workflow.
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
var STYLE_ID = 'nc-styles';
var TABS = [
  { key:'list',     vi:'Thu vien',         en:'Program Library' },
  { key:'detail',   vi:'Chi tiet',         en:'Program Detail' },
  { key:'compare',  vi:'So sanh',          en:'Version Compare' },
  { key:'setup',    vi:'Setup Sheet',      en:'Setup Sheets' },
  { key:'approval', vi:'Duyet',            en:'Approval Queue' }
];

/* STATUS — đọc từ HmRegistry (status-options.json → 'cnc_program_status') */
var STATUS = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('cnc_program_status');
    opts.forEach(function(o){ map[o.value] = { vi:o.label, en:o.labelEn, color:o.color }; });
  }
  if(!Object.keys(map).length){
    map = {
      draft:{vi:'Nháp',en:'Draft',color:'var(--text-secondary,#94a3b8)'}, in_review:{vi:'Đang duyệt',en:'In Review',color:'var(--blue-light,#3b82f6)'},
      approved:{vi:'Đã duyệt',en:'Approved',color:'var(--purple-light,#8b5cf6)'}, released:{vi:'Phát hành',en:'Released',color:'var(--green-light,#10b981)'},
      superseded:{vi:'Thay thế',en:'Superseded',color:'var(--amber-light,#f59e0b)'}, obsolete:{vi:'Lỗi thời',en:'Obsolete',color:'var(--text-secondary,#6b7280)'}
    };
  }
  return map;
})();

/* APPROVAL_RESULT — đọc từ HmRegistry → 'cnc_approval_result' */
var APPROVAL_RESULT = (function(){
  var map = {};
  if(window.HmRegistry){
    var opts = HmRegistry.statusSet('cnc_approval_result');
    opts.forEach(function(o){ map[o.value] = { vi:o.label, en:o.labelEn, color:o.color }; });
  }
  if(!Object.keys(map).length){
    map = {
      approved:{vi:'Chấp nhận',en:'Approved',color:'var(--green-light,#22c55e)'},
      rejected:{vi:'Từ chối',en:'Rejected',color:'var(--red-light,#ef4444)'},
      conditional:{vi:'Có điều kiện',en:'Conditional',color:'var(--amber-light,#f59e0b)'}
    };
  }
  return map;
})();

/* ── state ────────────────────────────────────────────── */
var state = {
  container: null,
  activeTab: 'list',
  programs: [],
  selectedProgram: null,
  setupSheets: [],
  approvalQueue: [],
  compareVersions: { a:null, b:null },
  filters: { status:'all', machine:'', part:'' },
  pagination: { offset:0, limit:50, total:0 },
  loading: false
};

/* ── CSS injection ────────────────────────────────────── */
function _ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style'); s.id=STYLE_ID;
  s.textContent=[
    '.nc{padding:24px;max-width:1500px;margin:0 auto;font-family:var(--font-sans,system-ui,sans-serif);color:var(--text,#0f172a)}',
    '.nc-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border,#e2e8f0);margin-bottom:20px;flex-wrap:wrap}',
    '.nc-tab{padding:10px 18px;font-size:.8125rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-secondary,#64748b);transition:color .15s,border-color .15s;border-radius:6px 6px 0 0;white-space:nowrap}',
    '.nc-tab:hover{color:var(--brand,#1565c0);background:var(--surface,#f8fafc)}',
    '.nc-tab.active{color:var(--brand,#1565c0);border-bottom-color:var(--brand,#1565c0)}',
    '.nc-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:20px}',
    '.nc-kpi{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}',
    '.nc-kpi-label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary,#64748b);font-weight:700;margin-bottom:4px}',
    '.nc-kpi-value{font-size:1.75rem;font-weight:800;letter-spacing:-.02em}',
    '.nc-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center}',
    '.nc-filters select,.nc-filters input{height:34px;padding:0 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem;background:var(--surface,#fff);color:var(--text,#0f172a)}',
    '.nc-table{width:100%;border-collapse:collapse;font-size:.8125rem}',
    '.nc-table th{text-align:left;padding:10px 12px;font-weight:700;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;color:var(--text-secondary,#64748b);font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em}',
    '.nc-table td{padding:10px 12px;border-bottom:1px solid var(--border,#f1f5f9);vertical-align:middle}',
    '.nc-table tr:hover td{background:var(--surface,#f8fafc)}',
    '.nc-badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.6875rem;font-weight:700;color:var(--text-inverse,#fff);white-space:nowrap}',
    '.nc-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:6px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:background .15s}',
    '.nc-btn-primary{background:var(--brand,#1565c0);color:var(--text-inverse,#fff)}',
    '.nc-btn-primary:hover{background:var(--brand-2,#0d47a1)}',
    '.nc-btn-secondary{background:var(--surface,#f1f5f9);color:var(--text,#0f172a);border:1px solid var(--border,#d1d5db)}',
    '.nc-btn-secondary:hover{background:var(--border,#e2e8f0)}',
    '.nc-btn-success{background:var(--green-light,#22c55e);color:var(--text-inverse,#fff)}',
    '.nc-btn-success:hover{background:var(--green-dark,#16a34a)}',
    '.nc-btn-danger{background:var(--red-light,#ef4444);color:var(--text-inverse,#fff)}',
    '.nc-card{background:var(--surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:18px;margin-bottom:12px}',
    '.nc-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.nc-form label{display:block;font-size:.75rem;font-weight:600;margin-bottom:4px;color:var(--text-secondary,#64748b)}',
    '.nc-form input,.nc-form select,.nc-form textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#d1d5db);border-radius:6px;font-size:.8125rem}',
    '.nc-form textarea{min-height:80px;resize:vertical}',
    '.nc-empty{text-align:center;padding:40px;color:var(--text-secondary,#94a3b8);font-size:.875rem}',
    '.nc-paging{display:flex;justify-content:center;gap:8px;margin-top:16px;align-items:center;font-size:.8125rem}',
    '.nc-paging button{padding:6px 12px;border:1px solid var(--border,#d1d5db);border-radius:6px;background:var(--surface,#fff);cursor:pointer;font-size:.8125rem}',
    '.nc-paging button:disabled{opacity:.4;cursor:default}',
    '.nc-diff{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border,#e2e8f0);border-radius:8px;overflow:hidden;font-family:monospace;font-size:.75rem}',
    '.nc-diff-side{padding:12px;overflow-x:auto;background:var(--bg-surface-alt,#f8fafc);max-height:500px;overflow-y:auto;white-space:pre}',
    '.nc-diff-header{background:var(--surface,#e2e8f0);padding:8px 12px;font-weight:700;font-size:.75rem}',
    '.nc-diff-add{background:#dcfce7;color:var(--green-dark,#166534)}',
    '.nc-diff-del{background:#fef2f2;color:#991b1b}',
    '.nc-timeline{position:relative;padding-left:28px;margin-top:16px}',
    '.nc-timeline::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:2px;background:var(--border,#e2e8f0)}',
    '.nc-timeline-item{position:relative;margin-bottom:14px;padding:10px 14px;background:var(--surface,#f8fafc);border-radius:8px;border:1px solid var(--border,#e2e8f0);font-size:.8125rem}',
    '.nc-timeline-item::before{content:"";position:absolute;left:-22px;top:14px;width:10px;height:10px;border-radius:50%;border:2px solid #fff}',
    '.nc-setup-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:12px 0}',
    '.nc-setup-photo{height:120px;border-radius:8px;background:var(--border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:2rem;overflow:hidden;border:1px solid var(--border,#d1d5db)}',
    '.nc-setup-photo img{width:100%;height:100%;object-fit:cover}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── badge helpers ────────────────────────────────────── */
function _statusBadge(status){
  if(window.HmRegistry) return HmRegistry.badge('cnc_program_status', status);
  var m=STATUS[status]||{vi:status,en:status,color:'var(--text-secondary,#64748b)'};
  return '<span class="nc-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}
function _approvalBadge(result){
  if(window.HmRegistry) return HmRegistry.badge('cnc_approval_result', result);
  var m=APPROVAL_RESULT[result]||{vi:result,en:result,color:'var(--text-secondary,#64748b)'};
  return '<span class="nc-badge" style="background:'+m.color+'">'+_esc(_t(m.vi,m.en))+'</span>';
}

/* ── KPI card ─────────────────────────────────────────── */
function _kpiCard(label, value, color){
  return '<div class="nc-kpi"><div class="nc-kpi-label">'+_esc(label)+'</div><div class="nc-kpi-value" style="color:'+(color||'inherit')+'">'+_esc(value)+'</div></div>';
}

/* ── tab: program library ────────────────────────────── */
function _renderListTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<h3 style="margin:0">'+_t('Thu vien chuong trinh NC','NC Program Library')+'</h3>'
    +'<button class="nc-btn nc-btn-primary" data-action="create-program">+ '+_t('Tao moi','New Program')+'</button>'
  +'</div>';
  html+='<div id="nc-program-form"></div>';

  html+='<div class="nc-filters">';
  html+='<input type="text" data-filter="part" placeholder="'+_t('Tim part / chuong trinh','Search part / program')+'" value="'+_esc(state.filters.part)+'" style="width:220px">';
  html+='<select data-filter="status"><option value="all">'+_t('Tat ca trang thai','All Status')+'</option>';
  Object.keys(STATUS).forEach(function(k){var m=STATUS[k]; html+='<option value="'+k+'"'+(state.filters.status===k?' selected':'')+'>'+_esc(_t(m.vi,m.en))+'</option>';});
  html+='</select>';
  html+='<input type="text" data-filter="machine" placeholder="'+_t('May','Machine')+'" value="'+_esc(state.filters.machine)+'" style="width:140px">';
  html+='</div>';

  if(!state.programs.length) return html+'<div class="nc-empty">'+_t('Chua co chuong trinh','No programs')+'</div>';

  html+='<table class="nc-table"><thead><tr><th>'+_t('Ma CT','Program #')+'</th><th>'+_t('Part','Part')+'</th><th>'+_t('May','Machine')+'</th><th>'+_t('Trang thai','Status')+'</th><th>'+_t('Phien ban','Version')+'</th><th>'+_t('Cycle Time','Cycle Time')+'</th><th></th></tr></thead><tbody>';
  state.programs.forEach(function(p){
    html+='<tr><td><strong>'+_esc(p.program_number)+'</strong></td><td>'+_esc(p.part_number||'-')+'</td><td>'+_esc(p.machine||'-')+'</td><td>'+_statusBadge(p.status)+'</td><td>v'+_esc(p.current_version||1)+'</td><td>'+_esc(p.cycle_time?p.cycle_time+' min':'-')+'</td>'
      +'<td><button class="nc-btn nc-btn-secondary" style="padding:var(--space-1,4px) var(--space-2,8px);font-size:var(--text-xs,.75rem)" data-action="select-program" data-id="'+_esc(p.id)+'">'+_t('Chi tiet','Detail')+'</button></td></tr>';
  });
  html+='</tbody></table>';
  html+=_renderPaging();
  return html;
}

/* ── tab: program detail ─────────────────────────────── */
function _renderDetailTab(){
  var prog=state.selectedProgram;
  if(!prog) return '<div class="nc-empty">'+_t('Chon chuong trinh tu thu vien','Select a program from the library')+'</div>';

  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<h3 style="margin:0">'+_esc(prog.program_number)+' - '+_esc(prog.part_number||'')+'</h3>'
    +'<div style="display:flex;gap:var(--space-2,8px)">'
      +_statusBadge(prog.status)
      +'<button class="nc-btn nc-btn-secondary" data-action="back-to-list">'+_t('Quay lai','Back')+'</button>'
    +'</div>'
  +'</div>';

  /* metadata */
  html+='<div class="nc-card"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Thong tin','Metadata')+'</h4>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3,10px);font-size:var(--text-sm,.8125rem)">';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('May','Machine')+':</span> '+_esc(prog.machine||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('Part','Part')+':</span> '+_esc(prog.part_number||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('Phien ban','Version')+':</span> v'+_esc(prog.current_version||1)+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('Cycle Time','Cycle Time')+':</span> '+_esc(prog.cycle_time?prog.cycle_time+' min':'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('Nguoi tao','Author')+':</span> '+_esc(prog.author||'-')+'</div>';
  html+='<div><span style="color:var(--text-secondary,#64748b);font-weight:var(--font-heading-weight,600)">'+_t('Ngay tao','Created')+':</span> '+_fmtDate(prog.created_at)+'</div>';
  html+='</div></div>';

  /* version history */
  var versions=prog.versions||[];
  html+='<div class="nc-card"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Lich su phien ban','Version History')+'</h4>';
  if(versions.length){
    html+='<table class="nc-table"><thead><tr><th>'+_t('Phien ban','Version')+'</th><th>'+_t('Ngay','Date')+'</th><th>'+_t('Nguoi sua','Author')+'</th><th>'+_t('Ghi chu','Notes')+'</th><th>'+_t('Trang thai','Status')+'</th><th></th></tr></thead><tbody>';
    versions.forEach(function(v){
      html+='<tr><td>v'+_esc(v.version)+'</td><td>'+_fmtDate(v.date)+'</td><td>'+_esc(v.author||'-')+'</td><td>'+_esc(v.notes||'-')+'</td><td>'+_statusBadge(v.status)+'</td>'
        +'<td><button class="nc-btn nc-btn-secondary" style="padding:2px var(--space-2,8px);font-size:var(--text-xs,.6875rem)" data-action="compare-version" data-version="'+_esc(v.version)+'">'+_t('So sanh','Compare')+'</button></td></tr>';
    });
    html+='</tbody></table>';
  } else { html+='<div class="nc-empty">-</div>'; }
  html+='</div>';

  /* approval timeline */
  var approvals=prog.approvals||[];
  if(approvals.length){
    html+='<div class="nc-card"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Quy trinh duyet','Approval Workflow')+'</h4>';
    html+='<div class="nc-timeline">';
    approvals.forEach(function(a){
      var color=(APPROVAL_RESULT[a.result]||{color:'var(--text-secondary,#64748b)'}).color;
      html+='<div class="nc-timeline-item" style="border-left:3px solid '+color+'">'
        +'<div style="display:flex;justify-content:space-between">'
          +'<strong>'+_esc(a.approver||'-')+'</strong>'
          +(a.result?_approvalBadge(a.result):'<span class="nc-badge" style="background:var(--text-secondary,#94a3b8)">'+_t('Cho','Pending')+'</span>')
        +'</div>'
        +'<div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);margin-top:var(--space-1,4px)">'+_fmtDateTime(a.date)+' - '+_esc(a.comments||'')+'</div>'
      +'</div>';
    });
    html+='</div></div>';
  }

  /* linked setup sheet */
  if(prog.setup_sheet_id){
    html+='<div class="nc-card"><div style="display:flex;justify-content:space-between;align-items:center">'
      +'<h4 style="margin:0">'+_t('Setup Sheet lien ket','Linked Setup Sheet')+'</h4>'
      +'<button class="nc-btn nc-btn-secondary" style="padding:var(--space-1,4px) var(--space-3,10px);font-size:var(--text-xs,.75rem)" data-action="view-setup" data-id="'+_esc(prog.setup_sheet_id)+'">'+_t('Xem','View')+'</button>'
    +'</div></div>';
  }

  return html;
}

/* ── tab: version compare ────────────────────────────── */
function _renderCompareTab(){
  var prog=state.selectedProgram;
  if(!prog) return '<div class="nc-empty">'+_t('Chon chuong trinh truoc','Select a program first')+'</div>';

  var versions=prog.versions||[];
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('So sanh phien ban','Version Compare')+' - '+_esc(prog.program_number)+'</h3>';

  html+='<div class="nc-filters">';
  html+='<label style="font-size:var(--text-sm,.8125rem);font-weight:var(--font-heading-weight,600)">'+_t('Phien ban A','Version A')+': </label>';
  html+='<select data-filter="compare_a">';
  versions.forEach(function(v){ html+='<option value="'+_esc(v.version)+'"'+(state.compareVersions.a==v.version?' selected':'')+'>v'+_esc(v.version)+'</option>'; });
  html+='</select>';
  html+='<label style="font-size:var(--text-sm,.8125rem);font-weight:var(--font-heading-weight,600);margin-left:var(--space-4,16px)">'+_t('Phien ban B','Version B')+': </label>';
  html+='<select data-filter="compare_b">';
  versions.forEach(function(v){ html+='<option value="'+_esc(v.version)+'"'+(state.compareVersions.b==v.version?' selected':'')+'>v'+_esc(v.version)+'</option>'; });
  html+='</select>';
  html+='<button class="nc-btn nc-btn-primary" style="margin-left:var(--space-3,12px)" data-action="run-compare">'+_t('So sanh','Compare')+'</button>';
  html+='</div>';

  /* diff view */
  var diffData=state.diffResult||null;
  if(diffData){
    html+='<div class="nc-diff">';
    html+='<div><div class="nc-diff-header">v'+_esc(diffData.version_a)+'</div><div class="nc-diff-side">';
    (diffData.lines_a||[]).forEach(function(line){
      var cls=line.type==='removed'?' nc-diff-del':'';
      html+='<div class="'+cls+'">'+_esc(line.text)+'</div>';
    });
    html+='</div></div>';
    html+='<div><div class="nc-diff-header">v'+_esc(diffData.version_b)+'</div><div class="nc-diff-side">';
    (diffData.lines_b||[]).forEach(function(line){
      var cls=line.type==='added'?' nc-diff-add':'';
      html+='<div class="'+cls+'">'+_esc(line.text)+'</div>';
    });
    html+='</div></div>';
    html+='</div>';
  } else {
    html+='<div class="nc-empty">'+_t('Chon 2 phien ban va nhan So sanh','Select two versions and click Compare')+'</div>';
  }

  /* upload new version */
  html+='<div class="nc-card" style="margin-top:var(--space-4,16px)"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Tai len phien ban moi','Upload New Version')+'</h4>';
  html+='<div class="nc-form">';
  html+='<div style="grid-column:1/-1"><label>'+_t('Ghi chu','Notes')+'</label><textarea id="nc-f-version-notes"></textarea></div>';
  html+='</div>';
  html+='<div style="margin-top:12px"><button class="nc-btn nc-btn-primary" data-action="upload-version">'+_t('Tai len','Upload')+'</button></div>';
  html+='</div>';

  return html;
}

/* ── tab: setup sheets ───────────────────────────────── */
function _renderSetupTab(){
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4,16px)">'
    +'<h3 style="margin:0">'+_t('Setup Sheets','Setup Sheets')+'</h3>'
    +'<button class="nc-btn nc-btn-primary" data-action="create-setup">+ '+_t('Tao moi','New Setup Sheet')+'</button>'
  +'</div>';
  html+='<div id="nc-setup-form"></div>';

  if(!state.setupSheets.length) return html+'<div class="nc-empty">'+_t('Chua co setup sheet','No setup sheets')+'</div>';

  state.setupSheets.forEach(function(ss){
    html+='<div class="nc-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3,10px)">'
        +'<div><strong>'+_esc(ss.title||ss.id)+'</strong> - '+_esc(ss.program_number||'-')+'</div>'
        +'<button class="nc-btn nc-btn-secondary" style="padding:var(--space-1,4px) var(--space-2,8px);font-size:var(--text-xs,.75rem)" data-action="edit-setup" data-id="'+_esc(ss.id)+'">'+_t('Sua','Edit')+'</button>'
      +'</div>';

    /* photos */
    var photos=ss.photos||[];
    if(photos.length){
      html+='<div class="nc-setup-photos">';
      photos.forEach(function(ph){
        html+='<div class="nc-setup-photo">'+(ph.url?'<img src="'+_esc(ph.url)+'" alt="'+_esc(ph.caption||'')+'">':'&#128247;')+'</div>';
      });
      html+='</div>';
    }

    /* tool list */
    var tools=ss.tools||[];
    if(tools.length){
      html+='<h5 style="margin:var(--space-3,10px) 0 var(--space-2,6px);font-size:var(--text-xs,.75rem);text-transform:uppercase;color:var(--text-secondary,#64748b)">'+_t('Danh sach dao cu','Tool List')+'</h5>';
      html+='<table class="nc-table"><thead><tr><th>T#</th><th>'+_t('Dao','Tool')+'</th><th>'+_t('Offset','Offset')+'</th><th>'+_t('Ghi chu','Notes')+'</th></tr></thead><tbody>';
      tools.forEach(function(tool){
        html+='<tr><td>T'+_esc(tool.slot||tool.number)+'</td><td>'+_esc(tool.description||'-')+'</td><td>'+_esc(tool.offset||'-')+'</td><td>'+_esc(tool.notes||'-')+'</td></tr>';
      });
      html+='</tbody></table>';
    }

    /* fixture */
    var fixtures=ss.fixtures||[];
    if(fixtures.length){
      html+='<h5 style="margin:var(--space-3,10px) 0 var(--space-2,6px);font-size:var(--text-xs,.75rem);text-transform:uppercase;color:var(--text-secondary,#64748b)">'+_t('Fixture','Fixtures')+'</h5>';
      html+='<ul style="font-size:.8125rem;margin:0;padding-left:20px">';
      fixtures.forEach(function(f){ html+='<li>'+_esc(f.description||f)+'</li>'; });
      html+='</ul>';
    }

    /* steps */
    var steps=ss.steps||[];
    if(steps.length){
      html+='<h5 style="margin:var(--space-3,10px) 0 var(--space-2,6px);font-size:var(--text-xs,.75rem);text-transform:uppercase;color:var(--text-secondary,#64748b)">'+_t('Cac buoc','Steps')+'</h5>';
      html+='<ol style="font-size:.8125rem;margin:0;padding-left:20px">';
      steps.forEach(function(st){ html+='<li>'+_esc(st.text||st)+'</li>'; });
      html+='</ol>';
    }
    html+='</div>';
  });
  return html;
}

/* ── tab: approval queue ─────────────────────────────── */
function _renderApprovalTab(){
  var html='<h3 style="margin:0 0 var(--space-4,16px)">'+_t('Hang doi duyet','Approval Queue')+'</h3>';

  if(!state.approvalQueue.length) return html+'<div class="nc-empty">'+_t('Khong co chuong trinh cho duyet','No programs pending approval')+'</div>';

  state.approvalQueue.forEach(function(item){
    html+='<div class="nc-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:center">'
        +'<div><strong>'+_esc(item.program_number)+'</strong> v'+_esc(item.version)+' - '+_esc(item.part_number||'-')+'</div>'
        +_statusBadge(item.status)
      +'</div>'
      +'<div style="font-size:var(--text-sm,.8125rem);color:var(--text-secondary,#64748b);margin-top:var(--space-2,6px)">'
        +_t('May','Machine')+': '+_esc(item.machine||'-')
        +' | '+_t('Gui boi','Submitted by')+': '+_esc(item.submitted_by||'-')
        +' | '+_fmtDate(item.submitted_at)
      +'</div>'
      +'<div style="font-size:var(--text-sm,.8125rem);margin-top:var(--space-2,6px)">'+_esc(item.notes||'-')+'</div>'
      +'<div style="margin-top:var(--space-3,10px)"><label style="font-size:var(--text-xs,.75rem);font-weight:var(--font-heading-weight,600);color:var(--text-secondary,#64748b)">'+_t('Nhan xet','Comments')+'</label>'
        +'<textarea class="nc-approval-comment" data-program-id="'+_esc(item.id)+'" style="width:100%;padding:var(--space-2,6px) var(--space-2,8px);border:1px solid var(--border,#d1d5db);border-radius:var(--radius-md,6px);font-size:var(--text-sm,.8125rem);min-height:40px;resize:vertical;margin-top:var(--space-1,4px)"></textarea>'
      +'</div>'
      +'<div style="display:flex;gap:var(--space-2,6px);margin-top:var(--space-3,10px)">'
        +'<button class="nc-btn nc-btn-success" style="padding:var(--space-2,6px) var(--space-4,14px)" data-action="approve-program" data-id="'+_esc(item.id)+'">'+_t('Duyet','Approve')+'</button>'
        +'<button class="nc-btn nc-btn-danger" style="padding:var(--space-2,6px) var(--space-4,14px)" data-action="reject-program" data-id="'+_esc(item.id)+'">'+_t('Tu choi','Reject')+'</button>'
        +'<button class="nc-btn" style="padding:var(--space-2,6px) var(--space-4,14px);background:var(--amber-light,#f59e0b);color:var(--text-inverse,#fff)" data-action="conditional-program" data-id="'+_esc(item.id)+'">'+_t('Co dieu kien','Conditional')+'</button>'
      +'</div>'
    +'</div>';
  });
  return html;
}

/* ── paging ───────────────────────────────────────────── */
function _renderPaging(){
  var p=state.pagination;
  var page=Math.floor(p.offset/p.limit)+1;
  var pages=Math.max(1,Math.ceil(p.total/p.limit));
  return '<div class="nc-paging">'
    +'<button data-action="page-prev"'+(page<=1?' disabled':'')+'>'+_t('Truoc','Prev')+'</button>'
    +'<span>'+page+' / '+pages+' ('+p.total+')</span>'
    +'<button data-action="page-next"'+(page>=pages?' disabled':'')+'>'+_t('Sau','Next')+'</button>'
  +'</div>';
}

/* ── inline forms ─────────────────────────────────────── */
function _showProgramForm(){
  var el=state.container.querySelector('#nc-program-form');
  if(!el) return;
  el.innerHTML='<div class="nc-card"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Tao chuong trinh moi','New CNC Program')+'</h4>'
    +'<div class="nc-form">'
      +'<div><label>'+_t('Ma chuong trinh','Program Number')+'</label><input type="text" id="nc-f-number"></div>'
      +'<div><label>'+_t('Part','Part Number')+'</label><input type="text" id="nc-f-part"></div>'
      +'<div><label>'+_t('May','Machine')+'</label><input type="text" id="nc-f-machine"></div>'
      +'<div><label>'+_t('Cycle Time (min)','Cycle Time (min)')+'</label><input type="number" id="nc-f-cycle" step="0.1"></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Ghi chu','Notes')+'</label><textarea id="nc-f-notes"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:var(--space-3,12px);display:flex;gap:var(--space-2,8px)">'
      +'<button class="nc-btn nc-btn-primary" data-action="submit-program">'+_t('Luu','Save')+'</button>'
      +'<button class="nc-btn nc-btn-secondary" data-action="cancel-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

function _showSetupForm(){
  var el=state.container.querySelector('#nc-setup-form');
  if(!el) return;
  el.innerHTML='<div class="nc-card"><h4 style="margin:0 0 var(--space-3,12px)">'+_t('Tao Setup Sheet','New Setup Sheet')+'</h4>'
    +'<div class="nc-form">'
      +'<div><label>'+_t('Tieu de','Title')+'</label><input type="text" id="nc-f-ss-title"></div>'
      +'<div><label>'+_t('Chuong trinh','Program')+'</label><input type="text" id="nc-f-ss-program" placeholder="'+_t('Ma chuong trinh','Program number')+'"></div>'
      +'<div style="grid-column:1/-1"><label>'+_t('Huong dan','Instructions')+'</label><textarea id="nc-f-ss-instructions"></textarea></div>'
    +'</div>'
    +'<div style="margin-top:var(--space-3,12px);display:flex;gap:var(--space-2,8px)">'
      +'<button class="nc-btn nc-btn-primary" data-action="submit-setup">'+_t('Luu','Save')+'</button>'
      +'<button class="nc-btn nc-btn-secondary" data-action="cancel-form">'+_t('Huy','Cancel')+'</button>'
    +'</div></div>';
}

/* ── data loading ─────────────────────────────────────── */
function _loadData(){
  state.loading=true; _paint();
  var p=Object.assign({}, state.filters, { offset:state.pagination.offset, limit:state.pagination.limit });
  _api('cnc_program_data', p).then(function(r){
    state.loading=false;
    if(r&&r.ok){
      state.programs=r.programs||[];
      state.setupSheets=r.setup_sheets||[];
      state.approvalQueue=r.approval_queue||[];
      state.pagination.total=r.total||0;
    }
    _paint();
  }).catch(function(){ state.loading=false; _toast(_t('Loi ket noi','Connection error'),'error'); _paint(); });
}

function _loadProgramDetail(id){
  _api('cnc_program_detail',{id:id}).then(function(r){
    if(r&&r.ok){
      state.selectedProgram=r.program||null;
      state.activeTab='detail';
      _paint();
    } else { _toast(_t('Khong tim thay','Not found'),'error'); }
  });
}

/* ── main paint ───────────────────────────────────────── */
function _paint(){
  if(!state.container) return;
  var html='<div class="nc">';
  html+='<div class="nc-tabs">';
  TABS.forEach(function(tab){
    html+='<div class="nc-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+tab.key+'">'+_esc(_t(tab.vi,tab.en))+'</div>';
  });
  html+='</div>';
  if(state.loading){
    html+='<div class="nc-empty">'+_t('Dang tai...','Loading...')+'</div>';
  } else {
    switch(state.activeTab){
      case 'list':     html+=_renderListTab(); break;
      case 'detail':   html+=_renderDetailTab(); break;
      case 'compare':  html+=_renderCompareTab(); break;
      case 'setup':    html+=_renderSetupTab(); break;
      case 'approval': html+=_renderApprovalTab(); break;
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
      case 'select-program':
        _loadProgramDetail(id);
        break;
      case 'back-to-list':
        state.selectedProgram=null;
        state.activeTab='list';
        _paint();
        break;
      case 'create-program': _showProgramForm(); break;
      case 'create-setup': _showSetupForm(); break;
      case 'cancel-form':
        ['#nc-program-form','#nc-setup-form'].forEach(function(sel){
          var el=state.container.querySelector(sel); if(el) el.innerHTML='';
        });
        break;
      case 'submit-program':
        _api('cnc_program_create',{
          program_number:(state.container.querySelector('#nc-f-number')||{}).value||'',
          part_number:(state.container.querySelector('#nc-f-part')||{}).value||'',
          machine:(state.container.querySelector('#nc-f-machine')||{}).value||'',
          cycle_time:parseFloat((state.container.querySelector('#nc-f-cycle')||{}).value)||0,
          notes:(state.container.querySelector('#nc-f-notes')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Da tao','Created'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');} });
        break;
      case 'submit-setup':
        _api('cnc_setup_sheet_create',{
          title:(state.container.querySelector('#nc-f-ss-title')||{}).value||'',
          program_number:(state.container.querySelector('#nc-f-ss-program')||{}).value||'',
          instructions:(state.container.querySelector('#nc-f-ss-instructions')||{}).value||''
        }).then(function(r){ if(r&&r.ok){_toast(_t('Da tao setup sheet','Setup sheet created'),'success');_loadData();} else {_toast(_t('Loi','Error'),'error');} });
        break;
      case 'compare-version':
        var ver=t.getAttribute('data-version');
        if(!state.compareVersions.a) state.compareVersions.a=ver;
        else state.compareVersions.b=ver;
        state.activeTab='compare';
        _paint();
        break;
      case 'run-compare':
        if(state.selectedProgram&&state.compareVersions.a&&state.compareVersions.b){
          _api('cnc_program_compare',{id:state.selectedProgram.id,version_a:state.compareVersions.a,version_b:state.compareVersions.b}).then(function(r){
            if(r&&r.ok){ state.diffResult=r.diff; _paint(); }
            else { _toast(_t('Loi so sanh','Compare error'),'error'); }
          });
        }
        break;
      case 'upload-version':
        if(state.selectedProgram){
          _api('cnc_program_upload_version',{
            id:state.selectedProgram.id,
            notes:(state.container.querySelector('#nc-f-version-notes')||{}).value||''
          }).then(function(r){
            if(r&&r.ok){_toast(_t('Da tai len','Uploaded'),'success');_loadProgramDetail(state.selectedProgram.id);}
            else {_toast(_t('Loi','Error'),'error');}
          });
        }
        break;
      case 'approve-program':
      case 'reject-program':
      case 'conditional-program':
        var result=action==='approve-program'?'approved':action==='reject-program'?'rejected':'conditional';
        var commentEl=state.container.querySelector('.nc-approval-comment[data-program-id="'+id+'"]');
        _api('cnc_program_approve',{id:id,result:result,comments:commentEl?commentEl.value:''}).then(function(r){
          if(r&&r.ok){_toast(_t('Da xu ly','Processed'),'success');_loadData();}
          else {_toast(_t('Loi','Error'),'error');}
        });
        break;
      case 'view-setup':
        state.activeTab='setup';
        _paint();
        break;
      case 'edit-setup':
        _toast(_t('Chuc nang sua dang phat trien','Edit feature in development'),'info');
        break;
      case 'page-prev':
        state.pagination.offset=Math.max(0,state.pagination.offset-state.pagination.limit);
        _loadData();
        break;
      case 'page-next':
        state.pagination.offset+=state.pagination.limit;
        _loadData();
        break;
    }
  });

  state.container.addEventListener('change', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='compare_a'){ state.compareVersions.a=e.target.value; return; }
    if(f==='compare_b'){ state.compareVersions.b=e.target.value; return; }
    if(f){ state.filters[f]=e.target.value; state.pagination.offset=0; _loadData(); }
  });

  state.container.addEventListener('input', function(e){
    var f=e.target.getAttribute('data-filter');
    if(f==='part'||f==='machine') state.filters[f]=e.target.value;
  });
}

/* ── entry point ──────────────────────────────────────── */
function render(container){
  _ensureStyles();
  state.container=container;
  state.activeTab='list';
  state.selectedProgram=null;
  state.diffResult=null;
  state.compareVersions={a:null,b:null};
  state.pagination.offset=0;
  _paint();
  _bind();
  _loadData();
}

window._renderCncPrograms = render;

})();

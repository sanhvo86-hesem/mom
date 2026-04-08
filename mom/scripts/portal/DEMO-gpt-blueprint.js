/* HESEM MOM - MASTER MODULE TEMPLATE showcase */
(function(){
'use strict';

var BE = window.HmBlockEngine || {};
function _t(vi,en){ return BE._t ? BE._t(vi,en) : ((typeof lang!=='undefined' && lang==='en') ? en : vi); }
function _esc(v){ return BE._esc ? BE._esc(v) : String(v==null?'':v).replace(/[&<>"']/g,function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; }); }
function _clone(v){ return JSON.parse(JSON.stringify(v||{})); }
function _nowIso(){ return new Date().toISOString(); }
function _fmtDate(v){ var d=new Date(String(v||'')); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString((typeof lang!=='undefined'&&lang==='en')?'en-GB':'vi-VN'); }
function _toast(msg,type){ if(BE.toast) return BE.toast(msg,type); if(typeof showToast==='function') return showToast(msg,type); }
function _progress(v,m,c){
  if(BE.progressBar) return BE.progressBar(v,m,c);
  var pct=Math.max(0,Math.min(100,Math.round((Number(v||0)/Math.max(1,Number(m||100)))*100)));
  return '<div style="height:8px;background:var(--gray-100);border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(c||'var(--brand-2)')+'"></div></div>';
}
function _badge(status){
  var s=String(status||'draft').toLowerCase();
  var labels={draft:_t('Nháp','Draft'),planned:_t('Kế hoạch','Planned'),active:_t('Đang triển khai','Active'),review:_t('Đang review','In review'),approved:_t('Đã chuẩn hóa','Approved'),blocked:_t('Bị chặn','Blocked')};
  var cls={draft:'hm-badge hm-badge-draft',planned:'hm-badge hm-badge-planned',active:'hm-badge hm-badge-active',review:'hm-badge hm-badge-review',approved:'hm-badge hm-badge-approved',blocked:'hm-badge hm-badge-cancelled'};
  return '<span class="'+(cls[s]||cls.draft)+'">'+_esc(labels[s]||status)+'</span>';
}

var TITLE={vi:'Master Module Template',en:'Master Module Template'};
var SUBTITLE={
  vi:'Showcase cho scaffold chuẩn của module portal, bám theo core-standards về workflow, UI hm-* và API mapping.',
  en:'Showcase for the governed portal module scaffold, aligned with core standards for workflow, hm-* UI, and API mapping.'
};
var SOURCE_BADGES=['30-hesem-design-system.md','31-feature-inventory-restructure.md','32-module-architecture-v2.md','33-api-mapping-per-module.md'];
var TYPE_LABELS={
  workflow_core:{vi:'Luồng vận hành chính',en:'Workflow core'},
  quality_stack:{vi:'Chất lượng',en:'Quality stack'},
  records_stack:{vi:'Hồ sơ & chứng cứ',en:'Records stack'},
  support_stack:{vi:'Hỗ trợ / quản trị',en:'Support stack'}
};
var PRINCIPLES={
  workflow_first:{vi:'Workflow-first',en:'Workflow-first'},
  role_focused:{vi:'Role-focused',en:'Role-focused'},
  shared_data:{vi:'Shared-data downstream',en:'Shared-data downstream'},
  governed_ui:{vi:'Governed hm-* UI',en:'Governed hm-* UI'},
  api_ready:{vi:'API-ready wiring',en:'API-ready wiring'}
};
var ITEMS=[
  {id:'MMT-001',code:'MMT-001',name:'Orders & Production Backbone',route:'/orders',owner:'Sales + Planner',type:'workflow_core',status:'approved',priority:92,progress:100,overdue:false,api_bundle:'quote_* / order_* / dispatch_*',refs:['31','32','33'],principles:['workflow_first','role_focused','shared_data','governed_ui','api_ready'],created_by:'Architecture Team',created_at:'2026-03-27T09:20:00+07:00',updated_at:'2026-04-01T18:10:00+07:00',notes:'Quote -> SO -> JO -> WO -> dispatch, đúng với core-standards về chia module theo workflow.'},
  {id:'MMT-002',code:'MMT-002',name:'Supplier Quality Workbench',route:'/supplier-quality',owner:'SCM + QA',type:'quality_stack',status:'approved',priority:88,progress:100,overdue:false,api_bundle:'supplier_* / supplier_scar_*',refs:['31','32','33'],principles:['workflow_first','role_focused','governed_ui','api_ready'],created_by:'Architecture Team',created_at:'2026-03-28T08:45:00+07:00',updated_at:'2026-04-01T17:35:00+07:00',notes:'Scorecard, IQC, ASL và SCAR gom trong một khung UI chuẩn.'},
  {id:'MMT-003',code:'MMT-003',name:'Quality Exception Hub',route:'/quality-exceptions',owner:'QA Engineer',type:'quality_stack',status:'active',priority:86,progress:78,overdue:false,api_bundle:'exception_* / capa_* / ncr_*',refs:['31','32','33'],principles:['workflow_first','role_focused','shared_data','governed_ui'],created_by:'Architecture Team',created_at:'2026-03-29T10:30:00+07:00',updated_at:'2026-04-01T16:42:00+07:00',notes:'Dùng template shell để chứa NCR, CAPA và complaint mà không viết lại khung giao diện.'},
  {id:'MMT-004',code:'MMT-004',name:'Evidence & Records Surface',route:'/forms',owner:'QA + Auditor',type:'records_stack',status:'review',priority:80,progress:72,overdue:false,api_bundle:'record_* / evidence_* / allocation_*',refs:['30','31','32','33'],principles:['workflow_first','shared_data','governed_ui','api_ready'],created_by:'Architecture Team',created_at:'2026-03-30T09:15:00+07:00',updated_at:'2026-04-01T15:55:00+07:00',notes:'Biểu mẫu, chứng cứ và allocation tracking cùng một interaction pattern.'},
  {id:'MMT-005',code:'MMT-005',name:'CNC Programs Control',route:'/cnc-programs',owner:'Engineering',type:'support_stack',status:'active',priority:76,progress:64,overdue:true,api_bundle:'program_* / revision_* / master_data_*',refs:['30','32','33'],principles:['role_focused','shared_data','governed_ui','api_ready'],created_by:'Architecture Team',created_at:'2026-03-30T14:10:00+07:00',updated_at:'2026-04-01T14:22:00+07:00',notes:'Còn pending phần API lineage của release NC và máy áp dụng.'},
  {id:'MMT-006',code:'MMT-006',name:'Reports & Improvement Board',route:'/compliance-reports',owner:'Manager + QA',type:'support_stack',status:'planned',priority:68,progress:48,overdue:false,api_bundle:'report_* / ci_* / dashboard_*',refs:['31','32','33'],principles:['workflow_first','role_focused','api_ready'],created_by:'Architecture Team',created_at:'2026-03-31T08:05:00+07:00',updated_at:'2026-04-01T12:40:00+07:00',notes:'Khung cho management review, COPQ analytics và continuous improvement.'}
];
var TABS=[
  {key:'overview',vi:'Tổng quan',en:'Overview',icon:'📐'},
  {key:'catalog',vi:'Danh sách blueprint',en:'Blueprint list',icon:'🗂️'},
  {key:'create',vi:'Tạo blueprint',en:'Create blueprint',icon:'➕'},
  {key:'detail',vi:'Chi tiết',en:'Detail',icon:'🔍'}
];

var state={container:null,activeTab:'overview',store:_clone(ITEMS),detail:null,filters:{search:'',status:'',type:''},page:{offset:0,limit:6,total:0},list:[],recent:[],kpi:{}};

function _label(map,key){ var r=map[key]||{vi:key||'-',en:key||'-'}; return _t(r.vi,r.en); }
function _statusProgress(s){ s=String(s||'').toLowerCase(); if(s==='approved') return 100; if(s==='review') return 82; if(s==='active') return 68; if(s==='planned') return 42; return 18; }
function _nextCode(){ var max=0; state.store.forEach(function(it){ var m=String(it.code||'').match(/MMT-(\d+)/); if(m) max=Math.max(max,parseInt(m[1],10)||0); }); return 'MMT-'+String(max+1).padStart(3,'0'); }
function _refreshDerived(){
  var total=state.store.length, active=0, approved=0, overdue=0;
  state.store.forEach(function(it){ var s=String(it.status||'').toLowerCase(); if(s==='active'||s==='review') active++; if(s==='approved') approved++; if(it.overdue) overdue++; });
  state.kpi={total:total,active:active,approved:approved,overdue:overdue,rate:total?Math.round((approved/total)*100):0};
  state.recent=_clone(state.store).sort(function(a,b){ return new Date(b.updated_at)-new Date(a.updated_at); });
  var rows=_clone(state.store).filter(function(it){
    var q=String(state.filters.search||'').trim().toLowerCase(), st=String(state.filters.status||'').toLowerCase(), tp=String(state.filters.type||'').toLowerCase();
    if(st && String(it.status||'').toLowerCase()!==st) return false;
    if(tp && String(it.type||'').toLowerCase()!==tp) return false;
    if(!q) return true;
    return [it.code,it.name,it.route,it.owner,it.api_bundle,it.notes].join(' ').toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){ return new Date(b.updated_at)-new Date(a.updated_at); });
  state.page.total=rows.length;
  state.list=rows.slice(state.page.offset,state.page.offset+state.page.limit);
  if(state.detail) state.detail=_clone(state.store.find(function(it){ return it.id===state.detail.id; })||state.detail);
}

function render(container){ state.container=container; _load('overview'); }
function _load(tab){ state.activeTab=tab||state.activeTab; _refreshDerived(); _paint(); }

function _paint(){
  var root=state.container; if(!root) return;
  var html='';
  html+='<div class="hm-page-header"><div><h1 class="hm-page-title">'+_esc(_t(TITLE.vi,TITLE.en))+'</h1><p class="hm-page-subtitle">'+_esc(_t(SUBTITLE.vi,SUBTITLE.en))+'</p></div><div style="display:flex;gap:var(--space-2);flex-wrap:wrap"><button class="hm-btn hm-btn-primary" data-action="create-new">'+_esc(_t('+ Tạo blueprint','+ Create blueprint'))+'</button><button class="hm-btn hm-btn-secondary" data-action="refresh">'+_esc(_t('Làm mới','Refresh'))+'</button></div></div>';
  html+='<div class="hm-card hm-card-flat" style="margin-bottom:var(--space-4)"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3)"><div><div class="hm-label">'+_esc(_t('Nguồn core-standards đang bám','Core standards in scope'))+'</div><div style="display:flex;gap:var(--space-2);flex-wrap:wrap">'+SOURCE_BADGES.map(function(name){ return '<span class="hm-badge hm-badge-planned">'+_esc(name)+'</span>'; }).join('')+'</div></div><div><div class="hm-label">'+_esc(_t('Chuẩn được thể hiện trên trang','Standards surfaced on this page'))+'</div><div style="display:flex;gap:var(--space-2);flex-wrap:wrap">'+Object.keys(PRINCIPLES).map(function(key){ return '<span class="hm-badge hm-badge-approved">'+_esc(_label(PRINCIPLES,key))+'</span>'; }).join('')+'</div></div></div></div>';
  html+='<div class="hm-tabs">'+TABS.map(function(tab){ return '<button class="hm-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="switch-tab" data-tab="'+_esc(tab.key)+'">'+_esc(tab.icon+' '+_t(tab.vi,tab.en))+'</button>'; }).join('')+'</div>';
  html+='<div class="hm-tab-content">'+(state.activeTab==='overview'?_renderOverview():state.activeTab==='catalog'?_renderCatalog():state.activeTab==='create'?_renderCreate():_renderDetail())+'</div>';
  root.innerHTML=html;
  root.removeEventListener('click',_handleClick); root.addEventListener('click',_handleClick);
  root.removeEventListener('input',_handleInput); root.addEventListener('input',_handleInput);
  root.removeEventListener('change',_handleInput); root.addEventListener('change',_handleInput);
}

function _renderOverview(){
  var html='<div class="hm-kpi-row">';
  [
    {k:'total',c:'var(--brand-2)',s:'',vi:'Blueprint tổng',en:'Total blueprints'},
    {k:'active',c:'var(--amber)',s:'',vi:'Đang triển khai',en:'Active / review'},
    {k:'approved',c:'var(--green)',s:'',vi:'Đã chuẩn hóa',en:'Approved'},
    {k:'overdue',c:'var(--red)',s:'',vi:'Cần xử lý',en:'Needs attention'},
    {k:'rate',c:'var(--brand)',s:'%',vi:'Tỷ lệ chuẩn hóa',en:'Governed coverage'}
  ].forEach(function(card){ html+='<div class="hm-kpi-card"><div class="hm-kpi-value" style="color:'+card.c+'">'+_esc(String(state.kpi[card.k]||0))+card.s+'</div><div class="hm-kpi-label">'+_esc(_t(card.vi,card.en))+'</div></div>'; });
  html+='</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:var(--space-4);margin-bottom:var(--space-4)"><div class="hm-card"><h3 style="margin:0 0 var(--space-3);font-size:var(--text-lg)">'+_esc(_t('Những gì template này khóa chuẩn','What this template governs'))+'</h3><div style="display:grid;gap:var(--space-3)">'+[
    _t('Header, KPI row, tabs, filter bar, bảng dữ liệu và detail panel đều dùng lớp hm-* từ design system.','Header, KPI row, tabs, filter bar, data table, and detail panel all use hm-* classes from the design system.'),
    _t('Cấu trúc module bám workflow-first, role-focused và shared-data downstream của core-standards.','The module structure follows workflow-first, role-focused, and shared-data downstream from the core standards.'),
    _t('Trang đang chạy bằng dữ liệu mẫu để review template trước khi gắn API thật của từng module.','The page runs on sample data so the template can be reviewed before real module APIs are wired in.'),
    _t('Khi clone sang module thật, chỉ cần thay action mapping và data source.','When cloned into a real module, only the action mapping and data source need to change.')
  ].map(function(txt){ return '<div style="display:flex;gap:var(--space-2);align-items:flex-start"><span class="hm-badge hm-badge-approved">OK</span><div style="font-size:var(--text-sm);line-height:1.55">'+_esc(txt)+'</div></div>'; }).join('')+'</div></div>';
  html+='<div class="hm-card"><h3 style="margin:0 0 var(--space-3);font-size:var(--text-lg)">'+_esc(_t('Blueprint mới nhất','Latest blueprint activity'))+'</h3><div style="display:grid;gap:var(--space-3)">'+state.recent.slice(0,4).map(function(it){ return '<div style="padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-lg)"><div style="display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start"><div><div style="font-weight:var(--font-bold)">'+_esc(it.code+' · '+it.name)+'</div><div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">'+_esc(it.route+' · '+it.owner)+'</div></div>'+_badge(it.status)+'</div><div style="margin-top:var(--space-3)">'+_progress(it.progress,100)+'</div><div style="display:flex;justify-content:space-between;gap:var(--space-3);margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-secondary)"><span>'+_esc(_t('Cập nhật','Updated')+': '+_fmtDate(it.updated_at))+'</span><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="view-detail" data-id="'+_esc(it.id)+'">'+_esc(_t('Xem chi tiết','View detail'))+'</button></div></div>'; }).join('')+'</div></div></div>';
  html+='<div class="hm-card"><h3 style="margin:0 0 var(--space-3);font-size:var(--text-lg)">'+_esc(_t('Danh sách blueprint gần đây','Recent blueprint list'))+'</h3><table class="hm-table"><thead><tr><th>'+_esc(_t('Mã','Code'))+'</th><th>'+_esc(_t('Tên module','Module name'))+'</th><th>'+_esc(_t('API bundle','API bundle'))+'</th><th>'+_esc(_t('Tiến độ','Progress'))+'</th><th>'+_esc(_t('Trạng thái','Status'))+'</th><th></th></tr></thead><tbody>'+state.recent.slice(0,5).map(function(it){ return '<tr><td style="font-weight:var(--font-semibold)">'+_esc(it.code)+'</td><td>'+_esc(it.name)+'</td><td style="font-family:var(--font-mono);font-size:var(--text-xs)">'+_esc(it.api_bundle)+'</td><td style="min-width:140px">'+_progress(it.progress,100)+'</td><td>'+_badge(it.status)+'</td><td><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="view-detail" data-id="'+_esc(it.id)+'">'+_esc(_t('Xem','View'))+'</button></td></tr>'; }).join('')+'</tbody></table></div>';
  return html;
}

function _renderCatalog(){
  var totalPages=Math.max(1,Math.ceil(state.page.total/state.page.limit)), currentPage=Math.floor(state.page.offset/state.page.limit)+1, start=state.page.total?(state.page.offset+1):0, end=Math.min(state.page.offset+state.page.limit,state.page.total);
  var html='<div class="hm-filter-bar"><input type="text" class="hm-input" data-filter="search" value="'+_esc(state.filters.search||'')+'" placeholder="'+_esc(_t('Tìm theo mã, route, owner...','Search by code, route, owner...'))+'" style="max-width:280px"><select class="hm-input hm-select" data-filter="status" style="max-width:180px"><option value="">'+_esc(_t('Tất cả trạng thái','All statuses'))+'</option>'+['draft','planned','active','review','approved','blocked'].map(function(s){ return '<option value="'+_esc(s)+'"'+(state.filters.status===s?' selected':'')+'>'+_esc({draft:_t('Nháp','Draft'),planned:_t('Kế hoạch','Planned'),active:_t('Đang triển khai','Active'),review:_t('Đang review','In review'),approved:_t('Đã chuẩn hóa','Approved'),blocked:_t('Bị chặn','Blocked')}[s])+'</option>'; }).join('')+'</select><select class="hm-input hm-select" data-filter="type" style="max-width:220px"><option value="">'+_esc(_t('Tất cả nhóm module','All module families'))+'</option>'+Object.keys(TYPE_LABELS).map(function(t){ return '<option value="'+_esc(t)+'"'+(state.filters.type===t?' selected':'')+'>'+_esc(_label(TYPE_LABELS,t))+'</option>'; }).join('')+'</select><button class="hm-btn hm-btn-primary" data-action="apply-filter">'+_esc(_t('Lọc','Apply'))+'</button></div>';
  if(!state.list.length) return html+'<div class="hm-empty"><div class="hm-empty-icon">🗂️</div>'+_esc(_t('Không có blueprint nào khớp bộ lọc hiện tại.','No blueprints match the current filters.'))+'</div>';
  html+='<div class="hm-card"><table class="hm-table"><thead><tr><th>'+_esc(_t('Blueprint','Blueprint'))+'</th><th>'+_esc(_t('Route','Route'))+'</th><th>'+_esc(_t('Owner','Owner'))+'</th><th>'+_esc(_t('Tiến độ','Progress'))+'</th><th>'+_esc(_t('Trạng thái','Status'))+'</th><th style="text-align:right">'+_esc(_t('Thao tác','Actions'))+'</th></tr></thead><tbody>'+state.list.map(function(it){ return '<tr><td><div style="font-weight:var(--font-bold)">'+_esc(it.code)+'</div><div style="font-size:var(--text-sm);color:var(--text-secondary)">'+_esc(it.name)+'</div></td><td style="font-family:var(--font-mono);font-size:var(--text-xs)">'+_esc(it.route)+'</td><td>'+_esc(it.owner)+'<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:4px">'+_esc(_label(TYPE_LABELS,it.type))+'</div></td><td style="min-width:150px"><div style="display:grid;gap:6px"><span style="font-size:var(--text-xs);color:var(--text-secondary)">'+_esc(String(it.progress||0)+'%')+'</span>'+_progress(it.progress,100)+'</div></td><td>'+_badge(it.status)+'</td><td style="text-align:right"><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="view-detail" data-id="'+_esc(it.id)+'">'+_esc(_t('Xem','View'))+'</button></td></tr>'; }).join('')+'</tbody></table><div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);margin-top:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary)"><span>'+_esc(_t('Hiển thị','Showing')+' '+start+'-'+end+' / '+state.page.total)+'</span><div style="display:flex;gap:var(--space-2);align-items:center">'+(currentPage>1?'<button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="page-prev">←</button>':'')+'<span>'+_esc(String(currentPage)+' / '+String(totalPages))+'</span>'+(currentPage<totalPages?'<button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="page-next">→</button>':'')+'</div></div></div>';
  return html;
}

function _renderCreate(){
  return '<div class="hm-card" style="max-width:960px"><h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_esc(_t('Tạo blueprint mới từ Master Module Template','Create a new blueprint from the Master Module Template'))+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-4)"><div><label class="hm-label">'+_esc(_t('Mã blueprint','Blueprint code'))+'</label><input id="tpl-code" class="hm-input" type="text" disabled value="'+_esc(_nextCode())+'"></div><div><label class="hm-label hm-label-required">'+_esc(_t('Tên module','Module name'))+'</label><input id="tpl-name" class="hm-input" type="text" placeholder="'+_esc(_t('Ví dụ: Quality Review Cockpit','Example: Quality Review Cockpit'))+'"></div><div><label class="hm-label hm-label-required">'+_esc(_t('Route','Route'))+'</label><input id="tpl-route" class="hm-input" type="text" value="/new-module" placeholder="/your-module"></div><div><label class="hm-label hm-label-required">'+_esc(_t('Owner chính','Primary owner'))+'</label><input id="tpl-owner" class="hm-input" type="text" placeholder="'+_esc(_t('Ví dụ: QA + Planner','Example: QA + Planner'))+'"></div><div><label class="hm-label hm-label-required">'+_esc(_t('Nhóm module','Module family'))+'</label><select id="tpl-type" class="hm-input hm-select">'+Object.keys(TYPE_LABELS).map(function(t,i){ return '<option value="'+_esc(t)+'"'+(i===0?' selected':'')+'>'+_esc(_label(TYPE_LABELS,t))+'</option>'; }).join('')+'</select></div><div><label class="hm-label hm-label-required">'+_esc(_t('Trạng thái blueprint','Blueprint status'))+'</label><select id="tpl-status" class="hm-input hm-select">'+['draft','planned','active','review','approved'].map(function(s,i){ return '<option value="'+_esc(s)+'"'+(i===0?' selected':'')+'>'+_esc({draft:_t('Nháp','Draft'),planned:_t('Kế hoạch','Planned'),active:_t('Đang triển khai','Active'),review:_t('Đang review','In review'),approved:_t('Đã chuẩn hóa','Approved')}[s])+'</option>'; }).join('')+'</select></div><div><label class="hm-label">'+_esc(_t('Mức ưu tiên','Priority'))+' <span id="tpl-priority-label" style="font-weight:var(--font-bold)">70</span>/100</label><input id="tpl-priority" type="range" min="1" max="100" value="70" style="width:100%"></div><div><label class="hm-label">'+_esc(_t('API bundle','API bundle'))+'</label><input id="tpl-api-bundle" class="hm-input" type="text" value="module_* / dashboard_*" placeholder="module_* / dashboard_*"></div></div><div style="margin-top:var(--space-4)"><label class="hm-label">'+_esc(_t('Ghi chú thiết kế','Design notes'))+'</label><textarea id="tpl-notes" class="hm-input hm-textarea" rows="4" placeholder="'+_esc(_t('Ghi rõ workflow, actor chính, dữ liệu chia sẻ và endpoint dự kiến...','Describe workflow, primary actors, shared data, and expected endpoints...'))+'"></textarea></div><div style="margin-top:var(--space-4);padding:var(--space-3);border-radius:var(--radius-lg);background:var(--bg-surface-alt);font-size:var(--text-sm);color:var(--text-secondary)">'+_esc(_t('Blueprint mới sẽ tự gắn các nguyên tắc workflow-first, role-focused, governed hm-* UI và API-ready wiring để bạn review ngay trên màn hình detail.','A new blueprint automatically inherits workflow-first, role-focused, governed hm-* UI, and API-ready wiring for immediate review in the detail screen.'))+'</div><div style="display:flex;justify-content:flex-end;gap:var(--space-3);margin-top:var(--space-5)"><button class="hm-btn hm-btn-secondary" data-action="cancel-create">'+_esc(_t('Hủy','Cancel'))+'</button><button class="hm-btn hm-btn-primary" data-action="submit-create">'+_esc(_t('Tạo blueprint','Create blueprint'))+'</button></div></div>';
}

function _renderDetail(){
  var it=state.detail;
  if(!it) return '<div class="hm-empty"><div class="hm-empty-icon">🔍</div>'+_esc(_t('Chọn một blueprint trong danh sách để xem chi tiết triển khai.','Select a blueprint from the list to review its implementation details.'))+'</div>';
  return '<div class="hm-card"><div style="display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start;flex-wrap:wrap"><div><div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-secondary);letter-spacing:.08em">'+_esc(it.code)+'</div><h2 style="margin:6px 0 4px;font-size:var(--text-2xl)">'+_esc(it.name)+'</h2><div style="color:var(--text-secondary);font-size:var(--text-md)">'+_esc(it.route+' · '+it.owner)+'</div></div><div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap">'+_badge(it.status)+'<span class="hm-badge hm-badge-planned">'+_esc(_label(TYPE_LABELS,it.type))+'</span></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--space-4);margin-top:var(--space-5)"><div class="hm-card hm-card-flat"><h3 style="margin:0 0 var(--space-3);font-size:var(--text-md)">'+_esc(_t('Thông tin blueprint','Blueprint summary'))+'</h3>'+[
    [_t('API bundle','API bundle'),it.api_bundle],
    [_t('Owner chính','Primary owner'),it.owner],
    [_t('Ngày tạo','Created at'),_fmtDate(it.created_at)],
    [_t('Cập nhật gần nhất','Last updated'),_fmtDate(it.updated_at)],
    [_t('Người tạo','Created by'),it.created_by],
    [_t('Ưu tiên','Priority'),String(it.priority||0)+'/100']
  ].map(function(row){ return '<div style="padding:10px 0;border-bottom:1px solid var(--border)"><div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-secondary);letter-spacing:.06em">'+_esc(row[0])+'</div><div style="margin-top:4px">'+_esc(row[1])+'</div></div>'; }).join('')+'<div style="margin-top:var(--space-4)"><div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:6px"><span>'+_esc(_t('Tiến độ chuẩn hóa','Governed completion'))+'</span><strong>'+_esc(String(it.progress||0)+'%')+'</strong></div>'+_progress(it.progress,100)+'</div></div><div class="hm-card hm-card-flat"><h3 style="margin:0 0 var(--space-3);font-size:var(--text-md)">'+_esc(_t('Căn chỉnh với core-standards','Core standards alignment'))+'</h3><div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">'+(it.principles||[]).map(function(key){ return '<span class="hm-badge hm-badge-approved">'+_esc(_label(PRINCIPLES,key))+'</span>'; }).join('')+'</div><div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">'+(it.refs||[]).map(function(ref){ return '<span class="hm-badge hm-badge-review">'+_esc('core-standards/'+ref)+'</span>'; }).join('')+'</div><div style="font-size:var(--text-sm);line-height:1.65;white-space:pre-wrap">'+_esc(it.notes||_t('Chưa có ghi chú bổ sung.','No extra notes yet.'))+'</div>'+(it.overdue?'<div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--red-bg);color:var(--red);border-radius:var(--radius-lg);font-size:var(--text-sm)">'+_esc(_t('Blueprint này còn hạng mục pending cần chốt trước khi clone sang module thật.','This blueprint still has pending items to close before cloning into a real module.'))+'</div>':'')+'</div></div></div>';
}

function _showDetail(id){ var it=state.store.find(function(row){ return row.id===id; }); if(!it) return; state.detail=_clone(it); state.activeTab='detail'; _paint(); }

function _submitCreate(){
  var root=state.container; if(!root) return;
  var name=((root.querySelector('#tpl-name')||{}).value||'').trim(), route=((root.querySelector('#tpl-route')||{}).value||'').trim(), owner=((root.querySelector('#tpl-owner')||{}).value||'').trim();
  if(!name||!route||!owner){ _toast(_t('Vui lòng nhập đủ tên module, route và owner chính.','Please fill module name, route, and primary owner.'),'warning'); return; }
  var status=((root.querySelector('#tpl-status')||{}).value||'draft').trim(), code=_nextCode(), who=(window.currentUser&&(window.currentUser.name||window.currentUser.username))||'Template Admin';
  var item={id:code,code:code,name:name,route:route.charAt(0)==='/'?route:'/'+route,owner:owner,type:((root.querySelector('#tpl-type')||{}).value||'workflow_core').trim(),status:status,priority:parseInt(((root.querySelector('#tpl-priority')||{}).value||'70'),10)||70,progress:_statusProgress(status),overdue:false,api_bundle:((root.querySelector('#tpl-api-bundle')||{}).value||'module_* / dashboard_*').trim(),refs:['30','31','32','33'],principles:['workflow_first','role_focused','shared_data','governed_ui','api_ready'],created_by:who,created_at:_nowIso(),updated_at:_nowIso(),notes:((root.querySelector('#tpl-notes')||{}).value||'').trim()};
  state.store.unshift(item); state.page.offset=0; state.detail=_clone(item); _load('detail'); _toast(_t('Đã tạo blueprint mới từ Master Module Template.','New blueprint created from the Master Module Template.'),'success');
}

function _handleInput(e){
  var el=e.target; if(!el) return;
  if(el.id==='tpl-priority'){ var label=state.container&&state.container.querySelector('#tpl-priority-label'); if(label) label.textContent=el.value; }
  if(el.hasAttribute('data-filter')) state.filters[el.getAttribute('data-filter')]=el.value||'';
}

function _handleClick(e){
  var btn=e.target.closest('[data-action]'); if(!btn) return; var action=btn.getAttribute('data-action');
  if(action==='switch-tab') return _load(btn.getAttribute('data-tab')||'overview');
  if(action==='refresh'){ _load(state.activeTab); _toast(_t('Đã làm mới dữ liệu demo của Master Module Template.','Master Module Template demo data refreshed.'),'success'); return; }
  if(action==='create-new'){ state.activeTab='create'; _paint(); return; }
  if(action==='cancel-create') return _load('overview');
  if(action==='submit-create') return _submitCreate();
  if(action==='view-detail') return _showDetail(btn.getAttribute('data-id')||'');
  if(action==='apply-filter'){ state.page.offset=0; return _load('catalog'); }
  if(action==='page-prev' && state.page.offset>=state.page.limit){ state.page.offset-=state.page.limit; return _load('catalog'); }
  if(action==='page-next' && state.page.offset+state.page.limit<state.page.total){ state.page.offset+=state.page.limit; return _load('catalog'); }
}

window._renderTemplateModule=render;

})();

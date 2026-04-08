/* ============================================================================
   HESEM MOM — MASTER MODULE TEMPLATE v2 (Claude version)
   So sánh với GPT version (DEMO-gpt-blueprint.js)
   ============================================================================ */
(function(){
'use strict';

var BE = window.HmBlockEngine || {};
function _t(vi,en){ return BE._t ? BE._t(vi,en) : ((typeof lang!=='undefined'&&lang==='en')?en:vi); }
function _esc(v){ return BE._esc ? BE._esc(v) : String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
function _toast(m,t){ if(BE.toast) BE.toast(m,t); }
function _fmtDate(v){ if(!v) return '-'; try{ var d=new Date(v); return isNaN(d)?'-':d.toLocaleDateString('vi-VN'); }catch(e){return '-';} }

/* ── Sample Data (giống GPT để so sánh công bằng) ────────────────────── */
var MODULES = [
  { id:'M1', code:'💰 Báo giá',        route:'/quoting',     owner:'Sales, Estimator',    type:'sales',      status:'approved',  progress:100, apis:'quote_*',                    desc:'RFQ → Quote → Convert to SO' },
  { id:'M2', code:'📦 Đơn hàng',       route:'/orders',      owner:'Sales, Manager',      type:'production', status:'approved',  progress:95,  apis:'order_* / packing_* / delivery_*', desc:'SO lifecycle + contract review + shipment gate' },
  { id:'M3', code:'📋 Kế hoạch',       route:'/planning',    owner:'Planner, Engineering', type:'production', status:'active',    progress:88,  apis:'order_jo_* / dispatch_* / schedule_* / shift_* / subcontract_*', desc:'JO/WO + dispatch + scheduling + outsource + parts/shifts' },
  { id:'M4', code:'🚚 Mua hàng & IQC', route:'/purchasing',  owner:'SCM, QC',             type:'scm',        status:'approved',  progress:100, apis:'supplier_*',                  desc:'Supplier scorecard + incoming inspection + SCAR' },
  { id:'M5', code:'🏭 Sản xuất',       route:'/production',  owner:'Operator, Supervisor', type:'production', status:'active',    progress:82,  apis:'dispatch_operator_* / mobile_* / cnc_* / knowledge_* / energy_*', desc:'Operator mobile + MES + CNC + knowledge + energy' },
  { id:'M6', code:'🔴 Chất lượng',     route:'/quality',     owner:'QA Engineer, Manager', type:'quality',    status:'active',    progress:78,  apis:'exception_* / fmea_* / apqp_* / oqc_* / spc_* / ai_*', desc:'NCR/CAPA/8D/MRB + FMEA + APQP + OQC + SPC + AI' },
  { id:'M7', code:'📋 Hồ sơ',          route:'/records',     owner:'QA, Auditor',          type:'records',    status:'review',    progress:72,  apis:'online_form_* / evidence_* / product_passport_*', desc:'Forms + evidence vault + DPP + genealogy' },
  { id:'M8', code:'📊 Báo cáo',        route:'/reports',     owner:'Manager, CEO',         type:'support',    status:'planned',   progress:55,  apis:'compliance_report_* / ci_* / dispatch_dashboard', desc:'Reports + CI/Kaizen + shift summary' },
  { id:'M9', code:'📁 Tài liệu',       route:'/documents',   owner:'All',                  type:'records',    status:'approved',  progress:100, apis:'doc_* / scan_folders',         desc:'Document control (existing)' },
  { id:'M10',code:'⚙ Quản trị',        route:'/admin',       owner:'Admin, IT',            type:'support',    status:'approved',  progress:100, apis:'admin_* / master_data_*',      desc:'Users + master data + settings' },
];

var TYPE_COLORS = { sales:'#f59e0b', production:'#3b82f6', scm:'#8b5cf6', quality:'#ef4444', records:'#0891b2', support:'#64748b' };
var TYPE_LABELS = { sales:'Kinh doanh', production:'Sản xuất', scm:'Cung ứng', quality:'Chất lượng', records:'Hồ sơ', support:'Hỗ trợ' };

var TABS = [
  { key:'overview', icon:'📐', vi:'Tổng quan', en:'Overview' },
  { key:'modules',  icon:'🧩', vi:'10 Modules', en:'10 Modules' },
  { key:'flow',     icon:'🔗', vi:'Luồng dữ liệu', en:'Data Flow' },
  { key:'api',      icon:'⚡', vi:'API Coverage', en:'API Coverage' },
];

var state = { container:null, activeTab:'overview', selected:null };

function render(container){
  state.container = container;
  _paint();
}

function _paint(){
  var c = state.container;
  if(!c) return;
  var h = '';

  /* ── Header with gradient accent bar ───────────────────────────────── */
  h += '<div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 100%);color:#fff;padding:var(--space-6) var(--space-6) var(--space-5);border-radius:var(--radius-xl);margin-bottom:var(--space-5)">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-4)">';
  h += '<div>';
  h += '<div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.15em;opacity:0.7;margin-bottom:var(--space-2)">HESEM MOM — MODULE ARCHITECTURE v2.0</div>';
  h += '<h1 style="margin:0;font-size:var(--text-2xl);font-weight:var(--font-bold)">'+_t('10 Modules theo Workflow Sản xuất','10 Workflow-based Modules')+'</h1>';
  h += '<p style="margin:var(--space-2) 0 0;opacity:0.85;font-size:var(--text-sm);max-width:600px">'+_t('Chia theo dòng chảy: Báo giá → Đơn hàng → Kế hoạch → Mua hàng → Sản xuất → Chất lượng → Giao hàng','Organized by production flow: Quoting → Orders → Planning → Purchasing → Production → Quality → Shipping')+'</p>';
  h += '</div>';
  h += '<div style="display:flex;gap:var(--space-2)">';
  h += '<span style="background:rgba(255,255,255,0.15);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold)">192 API endpoints</span>';
  h += '<span style="background:rgba(255,255,255,0.15);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold)">45 migrations</span>';
  h += '<span style="background:rgba(255,255,255,0.15);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold)">87 features</span>';
  h += '</div>';
  h += '</div></div>';

  /* ── Tabs ──────────────────────────────────────────────────────────── */
  h += '<div class="hm-tabs">';
  TABS.forEach(function(tab){
    h += '<button class="hm-tab'+(state.activeTab===tab.key?' active':'')+'" data-action="tab" data-tab="'+_esc(tab.key)+'">';
    h += tab.icon+' '+_t(tab.vi,tab.en);
    h += '</button>';
  });
  h += '</div>';

  /* ── Tab Content ───────────────────────────────────────────────────── */
  switch(state.activeTab){
    case 'overview': h += _renderOverview(); break;
    case 'modules':  h += _renderModules(); break;
    case 'flow':     h += _renderFlow(); break;
    case 'api':      h += _renderApi(); break;
  }

  c.innerHTML = h;
  c.onclick = function(e){
    var btn = e.target.closest('[data-action]');
    if(!btn) return;
    var action = btn.getAttribute('data-action');
    if(action === 'tab'){ state.activeTab = btn.getAttribute('data-tab'); _paint(); }
    if(action === 'select'){ state.selected = btn.getAttribute('data-id'); state.activeTab = 'modules'; _paint(); }
  };
}

/* ── TAB 1: OVERVIEW ─────────────────────────────────────────────────── */
function _renderOverview(){
  var approved = MODULES.filter(function(m){return m.status==='approved';}).length;
  var active   = MODULES.filter(function(m){return m.status==='active';}).length;
  var avgProg  = Math.round(MODULES.reduce(function(s,m){return s+m.progress;},0)/MODULES.length);
  var h = '';

  /* KPI Row — style khác GPT: dùng border-left color accent */
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-6)">';
  var kpis = [
    { value:'10',       label:_t('Tổng modules','Total Modules'),    color:'var(--brand-2)', icon:'🧩' },
    { value:approved,   label:_t('Đã hoàn thiện','Completed'),        color:'var(--green)',    icon:'✅' },
    { value:active,     label:_t('Đang xây dựng','In Progress'),      color:'var(--amber)',    icon:'🔨' },
    { value:avgProg+'%',label:_t('Tiến độ TB','Avg Progress'),        color:'var(--brand-2)', icon:'📈' },
    { value:'192',      label:_t('API Endpoints','API Endpoints'),    color:'var(--purple)',   icon:'⚡' },
  ];
  kpis.forEach(function(kpi){
    h += '<div style="background:var(--bg-surface);border:1px solid var(--border);border-left:4px solid '+kpi.color+';border-radius:var(--radius-lg);padding:var(--space-4);display:flex;gap:var(--space-3);align-items:center">';
    h += '<div style="font-size:1.5rem">'+kpi.icon+'</div>';
    h += '<div>';
    h += '<div style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:'+kpi.color+'">'+_esc(String(kpi.value))+'</div>';
    h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em">'+_esc(kpi.label)+'</div>';
    h += '</div></div>';
  });
  h += '</div>';

  /* 2-column layout: Workflow stages + Module cards */
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">';

  /* Left: Production workflow stages */
  h += '<div class="hm-card">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg);font-weight:var(--font-bold)">'+_t('Dòng chảy sản xuất','Production Flow')+'</h3>';
  var stages = [
    { icon:'💰', name:_t('Báo giá','Quoting'),          module:'M1', color:'#f59e0b' },
    { icon:'📦', name:_t('Đơn hàng','Orders'),           module:'M2', color:'#3b82f6' },
    { icon:'📋', name:_t('Kế hoạch','Planning'),          module:'M3', color:'#6366f1' },
    { icon:'🚚', name:_t('Mua hàng & IQC','Purchasing'),  module:'M4', color:'#8b5cf6' },
    { icon:'🏭', name:_t('Sản xuất','Production'),        module:'M5', color:'#10b981' },
    { icon:'🔴', name:_t('Chất lượng','Quality'),         module:'M6', color:'#ef4444' },
    { icon:'📦', name:_t('Giao hàng','Shipping'),         module:'M2', color:'#0891b2' },
  ];
  stages.forEach(function(s, i){
    var mod = MODULES.find(function(m){return m.id===s.module;});
    h += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);'+(i<stages.length-1?'border-bottom:1px solid var(--border);':'')+'cursor:pointer" data-action="select" data-id="'+_esc(s.module)+'">';
    h += '<div style="width:36px;height:36px;border-radius:50%;background:'+s.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">'+s.icon+'</div>';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">'+_esc(s.name)+'</div>';
    h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(mod?mod.desc:'')+'</div>';
    h += '</div>';
    h += '<div style="display:flex;align-items:center;gap:var(--space-2)">';
    if(mod) h += _statusBadge(mod.status);
    h += '<span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--text-secondary)">'+(mod?mod.progress:'0')+'%</span>';
    h += '</div>';
    if(i < stages.length-1) h += '<div style="color:var(--text-tertiary);font-size:var(--text-xs)">→</div>';
    h += '</div>';
  });
  h += '</div>';

  /* Right: Module progress cards */
  h += '<div class="hm-card">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg);font-weight:var(--font-bold)">'+_t('Tiến độ từng module','Module Progress')+'</h3>';
  MODULES.forEach(function(mod){
    var barColor = mod.progress >= 90 ? 'var(--green)' : mod.progress >= 70 ? 'var(--amber)' : 'var(--red)';
    h += '<div style="margin-bottom:var(--space-3);cursor:pointer" data-action="select" data-id="'+_esc(mod.id)+'">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    h += '<span style="font-size:var(--text-sm);font-weight:var(--font-medium)">'+_esc(mod.code)+'</span>';
    h += '<span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:'+barColor+'">'+mod.progress+'%</span>';
    h += '</div>';
    h += '<div style="height:6px;background:var(--gray-100);border-radius:var(--radius-full);overflow:hidden">';
    h += '<div style="height:100%;width:'+mod.progress+'%;background:'+barColor+';border-radius:var(--radius-full);transition:width 0.3s"></div>';
    h += '</div></div>';
  });
  h += '</div>';

  h += '</div>'; // close grid

  return h;
}

/* ── TAB 2: MODULES ──────────────────────────────────────────────────── */
function _renderModules(){
  var h = '';

  /* Module cards grid */
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-4)">';
  MODULES.forEach(function(mod){
    var typeColor = TYPE_COLORS[mod.type] || '#94a3b8';
    var selected = state.selected === mod.id;
    h += '<div class="hm-card" style="border-left:4px solid '+typeColor+';'+(selected?'box-shadow:0 0 0 2px var(--brand-2);':'')+'cursor:pointer" data-action="select" data-id="'+_esc(mod.id)+'">';

    /* Card header */
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3)">';
    h += '<div>';
    h += '<div style="font-size:var(--text-lg);font-weight:var(--font-bold)">'+_esc(mod.code)+'</div>';
    h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">'+_esc(mod.route)+' · '+_esc(mod.owner)+'</div>';
    h += '</div>';
    h += _statusBadge(mod.status);
    h += '</div>';

    /* Description */
    h += '<p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0 0 var(--space-3);line-height:1.5">'+_esc(mod.desc)+'</p>';

    /* API bundle */
    h += '<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-tertiary);background:var(--bg-surface-alt);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);margin-bottom:var(--space-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+_esc(mod.apis)+'">'+_esc(mod.apis)+'</div>';

    /* Progress bar */
    h += '<div style="display:flex;align-items:center;gap:var(--space-3)">';
    h += '<div style="flex:1;height:6px;background:var(--gray-100);border-radius:var(--radius-full);overflow:hidden">';
    var barColor = mod.progress >= 90 ? 'var(--green)' : mod.progress >= 70 ? 'var(--amber)' : 'var(--red)';
    h += '<div style="height:100%;width:'+mod.progress+'%;background:'+barColor+';border-radius:var(--radius-full)"></div>';
    h += '</div>';
    h += '<span style="font-size:var(--text-sm);font-weight:var(--font-bold);min-width:40px;text-align:right">'+mod.progress+'%</span>';
    h += '</div>';

    /* Type badge */
    h += '<div style="margin-top:var(--space-3);display:flex;gap:var(--space-2)">';
    h += '<span style="font-size:var(--text-xs);padding:2px 8px;border-radius:var(--radius-full);background:'+typeColor+'15;color:'+typeColor+';font-weight:var(--font-semibold)">'+_esc(TYPE_LABELS[mod.type] || mod.type)+'</span>';
    h += '</div>';

    h += '</div>';
  });
  h += '</div>';

  return h;
}

/* ── TAB 3: DATA FLOW ────────────────────────────────────────────────── */
function _renderFlow(){
  var h = '';

  h += '<div class="hm-card" style="overflow-x:auto">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_t('Dòng chảy dữ liệu giữa 10 modules','Cross-module Data Flow')+'</h3>';

  /* Flow diagram using CSS */
  var flow = [
    { from:'💰 Báo giá',    to:'📦 Đơn hàng',    data:'quote → SO',          color:'#f59e0b' },
    { from:'📦 Đơn hàng',   to:'📋 Kế hoạch',     data:'SO → JO/WO',          color:'#3b82f6' },
    { from:'📋 Kế hoạch',    to:'🚚 Mua hàng',    data:'BOM → PO',            color:'#6366f1' },
    { from:'📋 Kế hoạch',    to:'🏭 Sản xuất',    data:'dispatch → operator',  color:'#10b981' },
    { from:'🚚 Mua hàng',   to:'🏭 Sản xuất',    data:'material received',    color:'#8b5cf6' },
    { from:'🏭 Sản xuất',   to:'🔴 Chất lượng',   data:'NCR / inspection',     color:'#ef4444' },
    { from:'🔴 Chất lượng',  to:'📦 Đơn hàng',    data:'OQC pass → ship',      color:'#0891b2' },
    { from:'🏭 Sản xuất',   to:'📋 Hồ sơ',       data:'evidence',             color:'#0891b2' },
    { from:'All modules',    to:'📊 Báo cáo',     data:'KPI aggregation',      color:'#64748b' },
  ];

  h += '<table class="hm-table">';
  h += '<thead><tr>';
  h += '<th>'+_t('Từ','From')+'</th>';
  h += '<th></th>';
  h += '<th>'+_t('Đến','To')+'</th>';
  h += '<th>'+_t('Dữ liệu truyền','Data Transferred')+'</th>';
  h += '</tr></thead><tbody>';

  flow.forEach(function(f){
    h += '<tr>';
    h += '<td style="font-weight:var(--font-semibold)">'+_esc(f.from)+'</td>';
    h += '<td style="text-align:center;color:'+f.color+';font-size:var(--text-lg)">→</td>';
    h += '<td style="font-weight:var(--font-semibold)">'+_esc(f.to)+'</td>';
    h += '<td><span style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--bg-surface-alt);padding:2px 8px;border-radius:var(--radius-sm)">'+_esc(f.data)+'</span></td>';
    h += '</tr>';
  });
  h += '</tbody></table>';
  h += '</div>';

  /* Shared entities */
  h += '<div class="hm-card" style="margin-top:var(--space-4)">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_t('Entities chia sẻ giữa modules','Shared Entities')+'</h3>';

  var entities = [
    { key:'so_number',    created:'📦 Đơn hàng', used:'📋📚🏭🔴📋📊',   desc:_t('Số đơn hàng','Sales Order number') },
    { key:'jo_number',    created:'📋 Kế hoạch',  used:'🏭🔴📋',          desc:_t('Số lệnh sản xuất','Job Order number') },
    { key:'wo_number',    created:'📋 Kế hoạch',  used:'🏭🔴📋',          desc:_t('Số lệnh công đoạn','Work Order number') },
    { key:'part_number',  created:'📋 Kế hoạch',  used:'ALL',              desc:_t('Mã chi tiết','Part number') },
    { key:'machine_id',   created:'⚙ Quản trị',  used:'📋🏭',            desc:_t('Mã máy','Machine ID') },
    { key:'operator_id',  created:'⚙ Quản trị',  used:'📋🏭',            desc:_t('Mã công nhân','Operator ID') },
    { key:'ncr_id',       created:'🔴 Chất lượng',used:'🏭📋',            desc:_t('Mã NCR','NCR ID') },
    { key:'evidence_id',  created:'📋 Hồ sơ',     used:'ALL',              desc:_t('Mã chứng cứ','Evidence ID') },
  ];

  h += '<table class="hm-table">';
  h += '<thead><tr><th>Entity Key</th><th>'+_t('Tạo bởi','Created by')+'</th><th>'+_t('Dùng bởi','Used by')+'</th><th>'+_t('Mô tả','Description')+'</th></tr></thead><tbody>';
  entities.forEach(function(e){
    h += '<tr>';
    h += '<td style="font-family:var(--font-mono);font-weight:var(--font-bold);font-size:var(--text-xs)">'+_esc(e.key)+'</td>';
    h += '<td>'+_esc(e.created)+'</td>';
    h += '<td>'+_esc(e.used)+'</td>';
    h += '<td style="color:var(--text-secondary);font-size:var(--text-sm)">'+_esc(e.desc)+'</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';

  return h;
}

/* ── TAB 4: API COVERAGE ─────────────────────────────────────────────── */
function _renderApi(){
  var h = '';

  var apiData = [
    { module:'💰 Báo giá',        get:2,  post:5,  total:7 },
    { module:'📦 Đơn hàng',       get:8,  post:10, total:18 },
    { module:'📋 Kế hoạch',        get:14, post:16, total:30 },
    { module:'🚚 Mua hàng & IQC', get:7,  post:10, total:17 },
    { module:'🏭 Sản xuất',       get:11, post:11, total:22 },
    { module:'🔴 Chất lượng',      get:14, post:22, total:36 },
    { module:'📋 Hồ sơ',          get:10, post:6,  total:16 },
    { module:'📊 Báo cáo',        get:8,  post:4,  total:12 },
    { module:'📁 Tài liệu',       get:8,  post:8,  total:16 },
    { module:'⚙ Quản trị',        get:8,  post:10, total:18 },
  ];
  var totalGet = 0, totalPost = 0, totalAll = 0;
  apiData.forEach(function(a){ totalGet += a.get; totalPost += a.post; totalAll += a.total; });
  var maxTotal = Math.max.apply(null, apiData.map(function(a){return a.total;}));

  h += '<div class="hm-card">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_t('API Coverage theo Module','API Coverage by Module')+' <span style="font-weight:var(--font-normal);color:var(--text-secondary);font-size:var(--text-sm)">('+totalAll+' '+_t('endpoints tổng','total endpoints')+')</span></h3>';

  h += '<table class="hm-table">';
  h += '<thead><tr><th>Module</th><th style="text-align:center">GET</th><th style="text-align:center">POST</th><th style="text-align:center">Total</th><th style="min-width:200px">'+_t('Tỷ lệ','Distribution')+'</th></tr></thead><tbody>';

  apiData.forEach(function(a){
    var pct = Math.round((a.total / totalAll) * 100);
    var getPct = Math.round((a.get / a.total) * 100);
    h += '<tr>';
    h += '<td style="font-weight:var(--font-semibold);white-space:nowrap">'+_esc(a.module)+'</td>';
    h += '<td style="text-align:center;color:var(--green);font-weight:var(--font-semibold)">'+a.get+'</td>';
    h += '<td style="text-align:center;color:var(--blue);font-weight:var(--font-semibold)">'+a.post+'</td>';
    h += '<td style="text-align:center;font-weight:var(--font-bold)">'+a.total+'</td>';
    h += '<td>';
    h += '<div style="display:flex;align-items:center;gap:var(--space-2)">';
    h += '<div style="flex:1;height:16px;background:var(--gray-100);border-radius:var(--radius-sm);overflow:hidden;display:flex">';
    h += '<div style="width:'+getPct+'%;height:100%;background:var(--green)" title="GET: '+a.get+'"></div>';
    h += '<div style="width:'+(100-getPct)+'%;height:100%;background:var(--blue)" title="POST: '+a.post+'"></div>';
    h += '</div>';
    h += '<span style="font-size:var(--text-xs);color:var(--text-secondary);min-width:30px">'+pct+'%</span>';
    h += '</div></td>';
    h += '</tr>';
  });

  h += '<tr style="font-weight:var(--font-bold);border-top:2px solid var(--border)">';
  h += '<td>'+_t('TỔNG','TOTAL')+'</td>';
  h += '<td style="text-align:center;color:var(--green)">'+totalGet+'</td>';
  h += '<td style="text-align:center;color:var(--blue)">'+totalPost+'</td>';
  h += '<td style="text-align:center">'+totalAll+'</td>';
  h += '<td>';
  h += '<div style="display:flex;gap:var(--space-3);font-size:var(--text-xs)">';
  h += '<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--green)"></span> GET</span>';
  h += '<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--blue)"></span> POST</span>';
  h += '</div></td>';
  h += '</tr>';
  h += '</tbody></table></div>';

  return h;
}

/* ── Status Badge — delegate to HmRegistry for centralized data ───── */
function _statusBadge(status){
  /* HmRegistry.badge returns standardized badge from status-options.json */
  if(window.HmRegistry && typeof hmBadge === 'function') return hmBadge('doc_status', status);
  var map = {
    approved:  { bg:'var(--green-bg)',  color:'var(--green)',  label:_t('Hoàn thiện','Completed') },
    active:    { bg:'var(--amber-bg)',  color:'var(--amber)',  label:_t('Đang xây dựng','In Progress') },
    review:    { bg:'var(--purple-bg)', color:'var(--purple)', label:_t('Đang review','In Review') },
    planned:   { bg:'var(--cyan-bg)',   color:'var(--cyan)',   label:_t('Kế hoạch','Planned') },
    draft:     { bg:'var(--gray-100)',  color:'var(--gray-600)',label:_t('Nháp','Draft') },
  };
  var s = map[status] || map.draft;
  return '<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:var(--font-semibold);background:'+s.bg+';color:'+s.color+'">'+_esc(s.label)+'</span>';
}

/* ── Export ───────────────────────────────────────────────────────────── */
window._renderTemplateModule = render;

})();

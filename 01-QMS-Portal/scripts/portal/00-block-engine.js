/* ============================================================================
   HESEM QMS Module Builder Engine v2.0
   Core file that renders ALL modules from JSON schemas.
   - Reads module schema JSON (from API or localStorage)
   - Renders tabs + blocks based on schema
   - Edit mode: block toolbar, add/remove/reorder blocks
   - API binding: blocks fetch data from configured API endpoints
   - Advanced data table with sort / filter / resize / pagination
   - User overrides saved to localStorage
   ============================================================================ */
(function(){
'use strict';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function _t(vi,en){ return (typeof lang!=='undefined'&&lang==='en')?en:vi; }
function _esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(v==null?'':String(v))); return d.innerHTML; }

/** Internal API wrapper — delegates to global apiCall() when available */
function _api(action, payload, method){
  if(typeof apiCall==='function') return apiCall(action, payload||{}, method||'POST', 30000);
  return fetch('api.php?action='+encodeURIComponent(action),{
    method: method||'POST', credentials:'include',
    headers:{'Content-Type':'application/json',
      ...(typeof csrfToken!=='undefined'&&csrfToken?{'X-CSRF-Token':csrfToken}:{})},
    body:(method||'POST')==='GET'?undefined:JSON.stringify(payload||{})
  }).then(function(r){ return r.json(); });
}

/** Format a number with thousands separator */
function _fmt(n){
  if(n==null) return '0';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}

/** Generate a short unique ID */
function _uid(){ return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ── Block Registry ─────────────────────────────────────────────────────── */
var BLOCK_CATALOG = {
  /* LAYOUT */
  'page-header':    { label:'Tieu de trang',     labelEn:'Page Header',    category:'layout',  icon:'\u{1F4C4}', desc:'Tieu de + breadcrumb', descEn:'Title + breadcrumb' },
  'kpi-row':        { label:'Day KPI',            labelEn:'KPI Row',        category:'layout',  icon:'\u{1F4CA}', desc:'Hang cac the KPI', descEn:'Row of KPI cards' },
  'tab-bar':        { label:'Thanh tab',          labelEn:'Tab Bar',        category:'layout',  icon:'\u{1F4D1}', desc:'Dieu huong tab', descEn:'Tab navigation' },
  'filter-bar':     { label:'Bo loc',             labelEn:'Filter Bar',     category:'layout',  icon:'\u{1F50D}', desc:'Tim kiem + loc', descEn:'Search + filter controls' },
  'section-header': { label:'Tieu de muc',        labelEn:'Section Header', category:'layout',  icon:'\u{1F4DD}', desc:'H2/H3 voi duong ke', descEn:'H2/H3 with divider' },
  'spacer':         { label:'Khoang cach',        labelEn:'Spacer',         category:'layout',  icon:'\u21D5',    desc:'Khoang cach trong', descEn:'Empty spacing' },
  'info-banner':    { label:'Banner thong bao',   labelEn:'Info Banner',    category:'layout',  icon:'\u{1F4E2}', desc:'Thong bao mau sac', descEn:'Colored notice banner' },

  /* DATA */
  'data-table':     { label:'Bang du lieu',       labelEn:'Data Table',     category:'data',    icon:'\u{1F4CB}', desc:'Bang sort/filter/phan trang', descEn:'Table with sort/filter/pagination' },
  'data-cards':     { label:'Luoi the',           labelEn:'Card Grid',      category:'data',    icon:'\u{1F5C2}', desc:'Luoi the responsive', descEn:'Responsive card grid' },
  'data-list':      { label:'Danh sach',          labelEn:'List',           category:'data',    icon:'\u{1F4C3}', desc:'Danh sach don gian', descEn:'Simple list' },
  'data-tree':      { label:'Cay phan cap',       labelEn:'Tree View',      category:'data',    icon:'\u{1F333}', desc:'Cau truc cay', descEn:'Tree structure' },
  'data-timeline':  { label:'Dong thoi gian',     labelEn:'Timeline',       category:'data',    icon:'\u{1F4C5}', desc:'Timeline doc', descEn:'Vertical timeline' },
  'data-gantt':     { label:'Bieu do Gantt',      labelEn:'Gantt Chart',    category:'data',    icon:'\u{1F4CA}', desc:'Bieu do tien do', descEn:'Gantt schedule' },

  /* FORM */
  'form-standard':  { label:'Bieu mau',           labelEn:'Form',           category:'form',    icon:'\u{1F4DD}', desc:'Form nhieu cot', descEn:'Multi-column form' },
  'form-wizard':    { label:'Bieu mau tung buoc', labelEn:'Step Wizard',    category:'form',    icon:'\u{1F9D9}', desc:'Form wizard', descEn:'Step-by-step form' },
  'form-inline':    { label:'Chinh sua nhanh',    labelEn:'Inline Edit',    category:'form',    icon:'\u270F',    desc:'Edit tai cho', descEn:'In-place editing' },

  /* CHART */
  'chart-bar':      { label:'Bieu do cot',        labelEn:'Bar Chart',      category:'chart',   icon:'\u{1F4CA}', desc:'Bieu do ngang', descEn:'Horizontal bar chart' },
  'chart-donut':    { label:'Bieu do tron',       labelEn:'Donut Chart',    category:'chart',   icon:'\u{1F369}', desc:'Conic-gradient donut', descEn:'CSS donut chart' },
  'chart-line':     { label:'Bieu do duong',      labelEn:'Line Chart',     category:'chart',   icon:'\u{1F4C8}', desc:'Bieu do xu huong', descEn:'Trend line chart' },
  'chart-heatmap':  { label:'Ban do nhiet',       labelEn:'Heatmap',        category:'chart',   icon:'\u{1F5FA}', desc:'Luoi mau theo gia tri', descEn:'Value-colored grid' },

  /* ACTION */
  'action-toolbar': { label:'Thanh cong cu',      labelEn:'Toolbar',        category:'action',  icon:'\u{1F527}', desc:'Nhom nut hanh dong', descEn:'Action button group' },
  'action-summary': { label:'Tom tat',            labelEn:'Summary',        category:'action',  icon:'\u{1F4CB}', desc:'Panel tom tat', descEn:'Summary panel' },
};

var BLOCK_CATEGORIES = [
  { key:'layout', label:'Bo cuc',      labelEn:'Layout',  color:'#3b82f6' },
  { key:'data',   label:'Du lieu',     labelEn:'Data',    color:'#16a34a' },
  { key:'form',   label:'Bieu mau',    labelEn:'Form',    color:'#7c3aed' },
  { key:'chart',  label:'Bieu do',     labelEn:'Chart',   color:'#d97706' },
  { key:'action', label:'Hanh dong',   labelEn:'Action',  color:'#dc2626' },
];

/* ── API Catalog (commonly used endpoints for the binding dropdown) ──── */
var API_CATALOG = [
  /* Don hang / Orders */
  { action:'order_so_list',          method:'GET',  label:'Danh sach SO',        module:'Don hang',    responseKeys:['sales_orders'] },
  { action:'order_jo_list',          method:'GET',  label:'Danh sach JO',        module:'Don hang',    responseKeys:['job_orders'] },
  { action:'order_wo_list',          method:'GET',  label:'Danh sach WO',        module:'Don hang',    responseKeys:['work_orders'] },
  { action:'order_dashboard_kpi',    method:'GET',  label:'KPI don hang',        module:'Don hang',    responseKeys:['active_so_count','on_time_pct','active_holds'] },
  { action:'order_detail',           method:'POST', label:'Chi tiet don hang',   module:'Don hang',    responseKeys:['order'] },
  { action:'order_hierarchy',        method:'GET',  label:'Cay SO-JO-WO',       module:'Don hang',    responseKeys:['hierarchy'] },
  /* San xuat / Production */
  { action:'dispatch_dashboard',     method:'GET',  label:'Tong hop ca',         module:'San xuat',    responseKeys:['total_tasks','total_good','total_ng','achievement_pct'] },
  { action:'dispatch_task_list',     method:'GET',  label:'DS task san xuat',    module:'San xuat',    responseKeys:['tasks'] },
  { action:'dispatch_shift_report',  method:'GET',  label:'Bao cao ca',          module:'San xuat',    responseKeys:['report'] },
  { action:'production_oee',        method:'GET',  label:'OEE tong hop',        module:'San xuat',    responseKeys:['oee','availability','performance','quality'] },
  /* Chat luong / Quality */
  { action:'exception_dashboard',    method:'GET',  label:'KPI chat luong',      module:'Chat luong',  responseKeys:['open_ncr','open_capa','copq_mtd'] },
  { action:'exception_list',         method:'GET',  label:'DS exception',        module:'Chat luong',  responseKeys:['exceptions'] },
  { action:'exception_detail',       method:'POST', label:'Chi tiet exception',  module:'Chat luong',  responseKeys:['exception'] },
  { action:'ncr_list',               method:'GET',  label:'Danh sach NCR',       module:'Chat luong',  responseKeys:['ncrs'] },
  { action:'capa_list',              method:'GET',  label:'Danh sach CAPA',      module:'Chat luong',  responseKeys:['capas'] },
  { action:'fmea_list',              method:'GET',  label:'Danh sach FMEA',      module:'Chat luong',  responseKeys:['items'] },
  /* Mua hang / Purchasing */
  { action:'supplier_dashboard',     method:'GET',  label:'KPI NCC',             module:'Mua hang',    responseKeys:['avg_score','open_scars','incoming_reject_rate'] },
  { action:'supplier_list',          method:'GET',  label:'Danh sach NCC',       module:'Mua hang',    responseKeys:['suppliers'] },
  { action:'scar_list',              method:'GET',  label:'Danh sach SCAR',      module:'Mua hang',    responseKeys:['scars'] },
  { action:'incoming_inspection_list',method:'GET', label:'DS IQC',              module:'Mua hang',    responseKeys:['inspections'] },
  /* Bao gia / Quoting */
  { action:'quote_dashboard',        method:'GET',  label:'KPI bao gia',         module:'Bao gia',     responseKeys:['pipeline_value','win_rate'] },
  { action:'quote_list',             method:'GET',  label:'Danh sach bao gia',   module:'Bao gia',     responseKeys:['quotes'] },
  /* Master data */
  { action:'master_data_snapshot',   method:'GET',  label:'Master data',         module:'He thong',    responseKeys:['data'] },
  { action:'user_list',              method:'GET',  label:'Danh sach user',      module:'He thong',    responseKeys:['users'] },
  /* Tai lieu / Documents */
  { action:'doc_index',              method:'GET',  label:'Danh sach tai lieu',  module:'Tai lieu',    responseKeys:['documents'] },
  { action:'doc_search',             method:'POST', label:'Tim tai lieu',        module:'Tai lieu',    responseKeys:['results'] },
  /* Thiet bi / Equipment */
  { action:'equipment_list',         method:'GET',  label:'DS thiet bi',         module:'Thiet bi',    responseKeys:['items'] },
  { action:'calibration_schedule',   method:'GET',  label:'Lich hieu chuan',     module:'Thiet bi',    responseKeys:['schedule'] },
  /* Bao cao / Reports */
  { action:'compliance_reports',     method:'GET',  label:'Bao cao tuan thu',    module:'Bao cao',     responseKeys:['reports'] },
  { action:'energy_dashboard',       method:'GET',  label:'KPI nang luong',      module:'Bao cao',     responseKeys:['consumption','cost'] },
  /* Module schema */
  { action:'module_schema_get',      method:'GET',  label:'Lay schema module',   module:'He thong',    responseKeys:['schema'] },
  { action:'module_schema_save',     method:'POST', label:'Luu schema module',   module:'He thong',    responseKeys:['ok'] },
  { action:'module_schema_reset',    method:'POST', label:'Reset schema module',  module:'He thong',   responseKeys:['ok'] },
];

/* ── Runtime State Management ────────────────────────────────────────── */
var _moduleStates = {};

function getModuleState(moduleId){
  if(!_moduleStates[moduleId]){
    _moduleStates[moduleId] = {
      activeTab: null,
      blockData: {},
      tableStates: {},
      editMode: false,
      selectedBlock: null,
      loading: {},
    };
  }
  return _moduleStates[moduleId];
}

/* ── Data Fetching per Block ─────────────────────────────────────────── */
var _fetchCache = {};  // key = action+JSON(params) → { promise, ts }
var CACHE_TTL = 60000; // 60 s

function fetchBlockData(block){
  var ds = block.config && block.config.dataSource;
  if(!ds || !ds.api) return Promise.resolve(null);

  var cacheKey = ds.api + '|' + JSON.stringify(ds.params||{});
  var cached = _fetchCache[cacheKey];
  if(cached && (Date.now()-cached.ts) < CACHE_TTL) return cached.promise;

  var p = _api(ds.api, ds.params||{}, ds.method||'GET').then(function(resp){
    if(!resp) return null;
    if(ds.dataKey) return resp[ds.dataKey] !== undefined ? resp[ds.dataKey] : resp.data;
    return resp.data || resp;
  }).catch(function(err){
    console.warn('[BlockEngine] fetch failed:', ds.api, err);
    return null;
  });

  _fetchCache[cacheKey] = { promise:p, ts:Date.now() };
  return p;
}

function invalidateCache(action){
  Object.keys(_fetchCache).forEach(function(k){
    if(!action || k.indexOf(action)===0) delete _fetchCache[k];
  });
}

/* ── Module Schema CRUD ──────────────────────────────────────────────── */

function loadModuleSchema(moduleId){
  // Try API first
  return _api('module_schema_get', {id:moduleId}, 'GET').then(function(resp){
    if(resp && resp.schema) return resp.schema;
    // Fallback to localStorage
    return _loadSchemaLocal(moduleId);
  }).catch(function(){
    return _loadSchemaLocal(moduleId);
  });
}

function _loadSchemaLocal(moduleId){
  try{
    var raw = localStorage.getItem('hm_schema_'+moduleId);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function saveModuleSchema(moduleId, schema){
  // Save to localStorage first (backup)
  try{ localStorage.setItem('hm_schema_'+moduleId, JSON.stringify(schema)); }catch(e){}
  // Then persist via API
  return _api('module_schema_save', { moduleId:moduleId, schema:schema }, 'POST').then(function(resp){
    toast(_t('Da luu thanh cong','Saved successfully'), 'success');
    return resp;
  }).catch(function(err){
    toast(_t('Luu that bai, da luu cuc bo','Save failed, saved locally'), 'warning');
    return { ok:false, local:true };
  });
}

function resetModuleSchema(moduleId){
  try{ localStorage.removeItem('hm_schema_'+moduleId); }catch(e){}
  return _api('module_schema_reset', { moduleId:moduleId }, 'POST').then(function(resp){
    toast(_t('Da khoi phuc mac dinh','Reset to defaults'), 'success');
    return resp;
  }).catch(function(){ return { ok:false }; });
}

function createNewModule(config){
  var id = config.id || ('mod-'+_uid());
  var schema = {
    moduleId: id,
    title: config.title || { vi:'Module moi', en:'New Module' },
    icon: config.icon || '\u{1F4E6}',
    route: config.route || id,
    roles: config.roles || ['admin'],
    tabs: [{
      tabId: 'main',
      title: { vi:'Chinh', en:'Main' },
      blocks: []
    }]
  };
  return saveModuleSchema(id, schema).then(function(){ return schema; });
}

/* ── User Override Persistence ────────────────────────────────────────── */

function _loadUserOverrides(moduleId){
  try{
    var raw = localStorage.getItem('hesem_layout_'+moduleId);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function _saveUserOverrides(moduleId, overrides){
  try{ localStorage.setItem('hesem_layout_'+moduleId, JSON.stringify(overrides)); }catch(e){}
}

/* ── Module Schema Renderer ──────────────────────────────────────────── */

function renderModuleFromSchema(container, schema, options){
  if(!container || !schema) return;
  options = options || {};
  var moduleId = schema.moduleId;
  var state = getModuleState(moduleId);
  state._schema = schema;

  // Default to first tab
  if(!state.activeTab && schema.tabs && schema.tabs.length){
    state.activeTab = schema.tabs[0].tabId;
  }

  // Apply user overrides to tab/block ordering
  var renderSchema = _applyOverrides(moduleId, schema);

  var html = '';
  // Page header
  html += '<div class="hm-page-header">';
  html += '<h1 class="hm-page-title">';
  if(schema.icon) html += '<span class="hm-page-icon">'+schema.icon+'</span> ';
  html += _esc(_t(schema.title.vi||'', schema.title.en||''));
  html += '</h1>';
  // Edit mode toggle
  html += '<div class="hm-page-actions">';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-toggle-edit" data-module="'+_esc(moduleId)+'">';
  html += state.editMode ? _t('Thoat chinh sua','Exit Edit') : _t('Tuy chinh','Customize');
  html += '</button>';
  html += '</div></div>';

  // Tab bar
  if(renderSchema.tabs && renderSchema.tabs.length > 1){
    html += '<div class="hm-tab-bar" data-module="'+_esc(moduleId)+'">';
    renderSchema.tabs.forEach(function(tab){
      var active = tab.tabId === state.activeTab;
      html += '<button class="hm-tab'+(active?' hm-tab-active':'')+'" data-action="hm-switch-tab" data-tab="'+_esc(tab.tabId)+'" data-module="'+_esc(moduleId)+'">';
      html += _esc(_t(tab.title.vi||tab.tabId, tab.title.en||tab.tabId));
      html += '</button>';
    });
    html += '</div>';
  }

  // Active tab blocks
  var activeTab = renderSchema.tabs.find(function(t){ return t.tabId===state.activeTab; });
  if(activeTab){
    html += '<div class="hm-blocks-container" data-module="'+_esc(moduleId)+'" data-tab="'+_esc(activeTab.tabId)+'">';

    // Add-block button at top (edit mode)
    if(state.editMode){
      html += _renderAddBlockBtn(moduleId, activeTab.tabId, null);
    }

    activeTab.blocks.forEach(function(block){
      if(!state.editMode && block.visible===false) return;
      html += renderBlock(block, state.blockData[block.id]||{}, state);
      if(state.editMode){
        html += _renderAddBlockBtn(moduleId, activeTab.tabId, block.id);
      }
    });

    html += '</div>';
  }

  // Properties panel (edit mode + selected block)
  if(state.editMode && state.selectedBlock){
    html += renderPropertiesPanel(state.selectedBlock, moduleId);
  }

  container.innerHTML = html;

  // Attach event delegation
  _attachModuleEvents(container, moduleId);

  // Fetch data for blocks with data sources
  if(activeTab){
    activeTab.blocks.forEach(function(block){
      if(block.config && block.config.dataSource){
        state.loading[block.id] = true;
        _showBlockLoading(container, block.id);
        fetchBlockData(block).then(function(data){
          state.loading[block.id] = false;
          state.blockData[block.id] = data;
          _rerenderBlockContent(container, block, data, state);
        });
      }
    });
  }
}

function _applyOverrides(moduleId, schema){
  var s = JSON.parse(JSON.stringify(schema));
  var ov = _loadUserOverrides(moduleId);
  if(!ov) return s;

  // Tab ordering
  if(ov.tabOrder && Array.isArray(ov.tabOrder)){
    var ordered = [];
    ov.tabOrder.forEach(function(tid){
      var t = s.tabs.find(function(x){ return x.tabId===tid; });
      if(t) ordered.push(t);
    });
    s.tabs.forEach(function(t){
      if(!ordered.find(function(o){ return o.tabId===t.tabId; })) ordered.push(t);
    });
    s.tabs = ordered;
  }

  // Block visibility + ordering
  if(ov.hiddenBlocks || ov.blockOrder){
    s.tabs.forEach(function(tab){
      if(ov.hiddenBlocks){
        tab.blocks = tab.blocks.map(function(b){
          if(ov.hiddenBlocks.indexOf(b.id)>=0) b.visible = false;
          return b;
        });
      }
      if(ov.blockOrder && ov.blockOrder[tab.tabId]){
        var ob = [];
        ov.blockOrder[tab.tabId].forEach(function(bid){
          var bl = tab.blocks.find(function(b){ return b.id===bid; });
          if(bl) ob.push(bl);
        });
        tab.blocks.forEach(function(b){
          if(!ob.find(function(o){ return o.id===b.id; })) ob.push(b);
        });
        tab.blocks = ob;
      }
    });
  }
  return s;
}

function _showBlockLoading(container, blockId){
  var el = container.querySelector('[data-block-id="'+blockId+'"] .hm-block-content');
  if(el) el.innerHTML = '<div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div><div class="hm-skeleton-line"></div></div>';
}

function _rerenderBlockContent(container, block, data, state){
  var el = container.querySelector('[data-block-id="'+block.id+'"] .hm-block-content');
  if(!el) return;
  el.innerHTML = _renderBlockInner(block, data, state);
}

function _renderAddBlockBtn(moduleId, tabId, afterBlockId){
  return '<div class="hm-add-block-zone" data-action="hm-add-block" data-module="'+_esc(moduleId)+'" data-tab="'+_esc(tabId)+'" data-after="'+_esc(afterBlockId||'')+'">'
    + '<button class="hm-btn hm-btn-dashed hm-btn-sm">+ '+_t('Them block','Add block')+'</button></div>';
}

/* ── Event Delegation ────────────────────────────────────────────────── */

function _attachModuleEvents(container, moduleId){
  // Remove previous listener to avoid duplicates
  container.removeEventListener('click', container._hmClick);
  container._hmClick = function(e){
    var btn = e.target.closest('[data-action]');
    if(!btn) return;
    var action = btn.getAttribute('data-action');
    var state = getModuleState(moduleId);

    switch(action){
      case 'hm-toggle-edit':
        toggleEditMode(moduleId);
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-switch-tab':
        state.activeTab = btn.getAttribute('data-tab');
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-add-block':
        var tabId = btn.getAttribute('data-tab') || btn.closest('[data-tab]').getAttribute('data-tab');
        var after = btn.getAttribute('data-after') || btn.closest('[data-after]') && btn.closest('[data-after]').getAttribute('data-after') || '';
        showBlockLibrary(function(blockType){
          addBlock(moduleId, tabId, after||null, blockType);
          renderModuleFromSchema(container, state._schema);
        });
        break;
      case 'hm-move-up':
        moveBlockUp(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-move-down':
        moveBlockDown(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-toggle-block':
        toggleBlockVisibility(moduleId, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-delete-block':
        if(confirm(_t('Xoa block nay?','Delete this block?'))){
          deleteBlock(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
          renderModuleFromSchema(container, state._schema);
        }
        break;
      case 'hm-select-block':
        state.selectedBlock = _findBlockById(state._schema, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-save-schema':
        saveModuleSchema(moduleId, state._schema);
        break;
      case 'hm-table-sort':
        _handleTableSort(container, moduleId, btn);
        break;
      case 'hm-table-page':
        _handleTablePage(container, moduleId, btn);
        break;
      case 'hm-table-pagesize':
        _handleTablePageSize(container, moduleId, btn);
        break;
      case 'refresh':
        invalidateCache();
        renderModuleFromSchema(container, state._schema);
        break;
    }
  };
  container.addEventListener('click', container._hmClick);

  // Filter input events (debounced)
  container.removeEventListener('input', container._hmInput);
  container._hmInput = _debounce(function(e){
    var el = e.target;
    if(el.hasAttribute('data-filter')){
      var blockEl = el.closest('.hm-block');
      if(blockEl) _handleFilterChange(container, moduleId, blockEl.getAttribute('data-block-id'));
    }
    if(el.hasAttribute('data-table-filter')){
      var blockEl2 = el.closest('.hm-block');
      if(blockEl2) _handleColumnFilter(container, moduleId, blockEl2.getAttribute('data-block-id'));
    }
  }, 300);
  container.addEventListener('input', container._hmInput);
}

function _debounce(fn, ms){
  var t;
  return function(e){
    clearTimeout(t);
    var ev = e;
    t = setTimeout(function(){ fn(ev); }, ms);
  };
}

function _findBlockById(schema, blockId){
  if(!schema||!schema.tabs) return null;
  for(var i=0;i<schema.tabs.length;i++){
    var blocks = schema.tabs[i].blocks||[];
    for(var j=0;j<blocks.length;j++){
      if(blocks[j].id===blockId) return blocks[j];
    }
  }
  return null;
}

/* ── Render Block ────────────────────────────────────────────────────── */

function renderBlock(block, data, state){
  if(!block) return '';
  var isHidden = block.visible===false;
  var editMode = state && state.editMode;

  var html = '<div class="hm-block'+(isHidden?' hm-block-hidden':'')+'" data-block-id="'+_esc(block.id)+'" data-block-type="'+_esc(block.type)+'">';

  // Edit mode toolbar
  if(editMode){
    html += '<div class="hm-block-toolbar">';
    html += '<button class="hm-block-btn" data-action="hm-move-up" data-block-id="'+_esc(block.id)+'" title="'+_t('Di len','Move up')+'">&#9650;</button>';
    html += '<button class="hm-block-btn" data-action="hm-move-down" data-block-id="'+_esc(block.id)+'" title="'+_t('Di xuong','Move down')+'">&#9660;</button>';
    html += '<button class="hm-block-btn" data-action="hm-toggle-block" data-block-id="'+_esc(block.id)+'" title="'+_t('An/hien','Toggle')+'">'+(isHidden?'\u{1F441}\u200D\u{1F5E8}':'\u{1F441}')+'</button>';
    html += '<button class="hm-block-btn" data-action="hm-select-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Cau hinh','Config')+'">&#9881;</button>';
    html += '<button class="hm-block-btn hm-block-btn-danger" data-action="hm-delete-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Xoa','Delete')+'">&#128465;</button>';
    html += '</div>';
  }

  // Block header
  if(block.title){
    html += '<div class="hm-block-header">';
    html += '<span class="hm-block-title">'+_esc(_t(block.title.vi||block.title, block.title.en||block.title))+'</span>';
    html += '</div>';
  }

  // Block content
  html += '<div class="hm-block-content">';
  html += _renderBlockInner(block, data, state);
  html += '</div></div>';
  return html;
}

function _renderBlockInner(block, data, state){
  var config = block.config || {};
  switch(block.type){
    case 'kpi-row':         return renderKpiRow(config, data);
    case 'data-table':      return renderAdvancedTable(config, data, state, block.id);
    case 'filter-bar':      return renderFilterBar(config, data);
    case 'section-header':  return renderSectionHeader(config);
    case 'spacer':          return '<div style="height:'+(config.height||16)+'px"></div>';
    case 'info-banner':     return renderInfoBanner(config);
    case 'chart-bar':       return renderBarChart(config, data);
    case 'chart-donut':     return renderDonutChart(config, data);
    case 'action-toolbar':  return renderToolbar(config, data);
    case 'data-cards':      return renderCardGrid(config, data);
    case 'data-timeline':   return renderTimeline(config, data);
    case 'form-standard':   return renderFormStandard(config, data);
    default:
      return '<div class="hm-empty">'+_t('Block chua co noi dung','Block has no content')+'</div>';
  }
}

/* ── Block Renderers ─────────────────────────────────────────────────── */

/* --- KPI Row --- */
function renderKpiRow(config, data){
  var items = config.items || [];
  var html = '<div class="hm-kpi-row">';
  items.forEach(function(item){
    var val = data && data[item.dataKey]!==undefined ? data[item.dataKey] : (item.default||0);
    var color = item.accentColor || item.color || 'var(--brand-2)';
    html += '<div class="hm-kpi-card" style="border-left:3px solid '+color+'">';
    html += '<div class="hm-kpi-value" style="color:'+color+'">'+_esc(typeof val==='number'?_fmt(val):String(val))+(item.suffix||'')+'</div>';
    html += '<div class="hm-kpi-label">'+_esc(_t(item.label||'', item.labelEn||''))+'</div>';
    if(item.trend){
      var up = item.trend > 0;
      html += '<div class="hm-kpi-trend hm-kpi-trend-'+(up?'up':'down')+'">'+(up?'&#9650;':'&#9660;')+' '+Math.abs(item.trend)+'%</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Advanced Data Table --- */
function renderAdvancedTable(config, data, state, blockId){
  var columns = config.columns || [];
  var dataKey = config.dataKey || 'items';
  var allRows = (data && (Array.isArray(data) ? data : data[dataKey])) || [];

  if(!columns.length) return '<div class="hm-empty">'+_t('Chua cau hinh cot','No columns configured')+'</div>';

  // Get or init table state
  var moduleId = state && state._schema ? state._schema.moduleId : '_';
  var ms = getModuleState(moduleId);
  if(!ms.tableStates[blockId]){
    ms.tableStates[blockId] = { sortCol:null, sortDir:null, filters:{}, page:1, pageSize:config.pageSize||20 };
  }
  var ts = ms.tableStates[blockId];

  // Apply column filters
  var rows = allRows;
  columns.forEach(function(col){
    var fv = ts.filters[col.key];
    if(fv){
      rows = rows.filter(function(r){
        var cell = String(r[col.key]||'').toLowerCase();
        return cell.indexOf(fv.toLowerCase()) >= 0;
      });
    }
  });

  // Apply sorting
  if(ts.sortCol){
    var dir = ts.sortDir === 'desc' ? -1 : 1;
    var sk = ts.sortCol;
    rows = rows.slice().sort(function(a,b){
      var va = a[sk], vb = b[sk];
      if(va==null) va = '';
      if(vb==null) vb = '';
      if(typeof va==='number' && typeof vb==='number') return (va-vb)*dir;
      return String(va).localeCompare(String(vb),'vi')*dir;
    });
  }

  // Pagination
  var totalRows = rows.length;
  var totalPages = Math.max(1, Math.ceil(totalRows / ts.pageSize));
  if(ts.page > totalPages) ts.page = totalPages;
  var startIdx = (ts.page - 1) * ts.pageSize;
  var pageRows = rows.slice(startIdx, startIdx + ts.pageSize);

  // Empty state
  if(!allRows.length){
    return '<div class="hm-empty"><div class="hm-empty-icon">&#128203;</div><div>'+_t('Khong co du lieu','No data')+'</div></div>';
  }

  var html = '<div class="hm-table-wrapper" style="overflow-x:auto">';
  html += '<table class="hm-table hm-table-advanced">';

  // Column headers with sort
  html += '<thead><tr>';
  columns.forEach(function(col){
    var sortIndicator = '';
    if(ts.sortCol===col.key){
      sortIndicator = ts.sortDir==='asc' ? ' &#9650;' : ' &#9660;';
    }
    var align = col.type==='number' ? 'text-align:right' : '';
    html += '<th class="hm-th-sortable" style="'+align+';cursor:pointer;user-select:none;position:relative" data-action="hm-table-sort" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'">';
    html += _esc(_t(col.label||col.key, col.labelEn||col.key));
    html += '<span class="hm-sort-indicator">'+sortIndicator+'</span>';
    // Resize handle
    html += '<span class="hm-col-resize" style="position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize"></span>';
    html += '</th>';
  });
  html += '</tr>';

  // Column filter row
  html += '<tr class="hm-table-filter-row">';
  columns.forEach(function(col){
    var fv = ts.filters[col.key] || '';
    if(col.filterable===false){
      html += '<th></th>';
    } else if(col.filterType==='select' && col.filterOptions){
      html += '<th><select class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'">';
      html += '<option value="">'+_t('Tat ca','All')+'</option>';
      (col.filterOptions||[]).forEach(function(opt){
        var sel = fv===String(opt.value) ? ' selected' : '';
        html += '<option value="'+_esc(opt.value)+'"'+sel+'>'+_esc(_t(opt.label, opt.labelEn||opt.label))+'</option>';
      });
      html += '</select></th>';
    } else {
      html += '<th><input type="text" class="hm-input hm-input-xs" placeholder="'+_t('Loc...','Filter...')+'" data-table-filter="'+_esc(col.key)+'" value="'+_esc(fv)+'"></th>';
    }
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  if(!pageRows.length){
    html += '<tr><td colspan="'+columns.length+'" class="hm-empty">'+_t('Khong tim thay','No results found')+'</td></tr>';
  }
  pageRows.forEach(function(row, ri){
    var rowAction = config.rowAction ? ' data-action="'+_esc(config.rowAction)+'" data-row-idx="'+ri+'"' : '';
    html += '<tr class="hm-table-row"'+rowAction+' style="cursor:'+(config.rowAction?'pointer':'default')+'">';
    columns.forEach(function(col){
      var val = row[col.key]!=null ? row[col.key] : '';
      var align = col.type==='number' ? 'text-align:right;font-variant-numeric:tabular-nums' : '';
      if(col.type==='badge'){
        html += '<td><span class="hm-badge hm-badge-'+_esc(String(val))+'">'+_esc(String(val))+'</span></td>';
      } else if(col.type==='number'){
        html += '<td style="'+align+'">'+_esc(typeof val==='number'?_fmt(val):String(val))+'</td>';
      } else if(col.type==='date'){
        html += '<td>'+_esc(val ? String(val).slice(0,10) : '')+'</td>';
      } else if(col.type==='progress'){
        var pct = Number(val)||0;
        html += '<td>'+progressBar(pct,100)+'</td>';
      } else {
        html += '<td>'+_esc(String(val))+'</td>';
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // Pagination bar
  html += '<div class="hm-table-pagination">';
  html += '<span class="hm-table-info">'+_t('Hien thi','Showing')+' '+(startIdx+1)+'-'+Math.min(startIdx+ts.pageSize, totalRows)+' / '+totalRows+'</span>';
  html += '<span class="hm-table-page-controls">';
  // Page size selector
  html += '<select class="hm-input hm-input-xs" data-action="hm-table-pagesize" data-block-id="'+_esc(blockId)+'">';
  [10,20,50,100].forEach(function(ps){
    html += '<option value="'+ps+'"'+(ts.pageSize===ps?' selected':'')+'>'+ps+'/'+_t('trang','page')+'</option>';
  });
  html += '</select>';
  // Page buttons
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="1"'+(ts.page<=1?' disabled':'')+'>&#171;</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+(ts.page-1)+'"'+(ts.page<=1?' disabled':'')+'>&#8249;</button>';
  html += '<span class="hm-page-num">'+ts.page+'/'+totalPages+'</span>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+(ts.page+1)+'"'+(ts.page>=totalPages?' disabled':'')+'>&#8250;</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-page" data-block-id="'+_esc(blockId)+'" data-page="'+totalPages+'"'+(ts.page>=totalPages?' disabled':'')+'>&#187;</button>';
  html += '</span></div>';

  return html;
}

function _handleTableSort(container, moduleId, btn){
  var col = btn.getAttribute('data-col');
  var blockId = btn.getAttribute('data-block-id') || btn.closest('.hm-block').getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  if(ts.sortCol===col){
    ts.sortDir = ts.sortDir==='asc' ? 'desc' : ts.sortDir==='desc' ? null : 'asc';
    if(!ts.sortDir) ts.sortCol = null;
  } else {
    ts.sortCol = col; ts.sortDir = 'asc';
  }
  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

function _handleTablePage(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var page = parseInt(btn.getAttribute('data-page'),10);
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts || isNaN(page) || page<1) return;
  ts.page = page;
  renderModuleFromSchema(container, ms._schema);
}

function _handleTablePageSize(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ps = parseInt(btn.value||btn.getAttribute('data-value'),10);
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts || isNaN(ps)) return;
  ts.pageSize = ps;
  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

function _handleFilterChange(container, moduleId, blockId){
  // Re-fetch or re-render with new filter values
  // Filters from filter-bar are stored on the data source params
  var ms = getModuleState(moduleId);
  invalidateCache();
  renderModuleFromSchema(container, ms._schema);
}

function _handleColumnFilter(container, moduleId, blockId){
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  // Read all filter inputs inside this block
  var blockEl = container.querySelector('[data-block-id="'+blockId+'"]');
  if(!blockEl) return;
  ts.filters = {};
  blockEl.querySelectorAll('[data-table-filter]').forEach(function(el){
    var k = el.getAttribute('data-table-filter');
    var v = el.value;
    if(v) ts.filters[k] = v;
  });
  ts.page = 1;
  renderModuleFromSchema(container, ms._schema);
}

/* --- Filter Bar --- */
function renderFilterBar(config, data){
  var filters = config.filters || [];
  var html = '<div class="hm-filter-bar">';
  filters.forEach(function(f){
    if(f.type==='search'){
      html += '<input type="text" class="hm-input" placeholder="'+_esc(_t(f.placeholder||'Tim kiem...',f.placeholderEn||'Search...'))+'" data-filter="'+_esc(f.key)+'">';
    } else if(f.type==='select'){
      html += '<select class="hm-input hm-select" data-filter="'+_esc(f.key)+'">';
      html += '<option value="">'+_esc(_t(f.allLabel||'Tat ca',f.allLabelEn||'All'))+'</option>';
      (f.options||[]).forEach(function(opt){
        html += '<option value="'+_esc(opt.value)+'">'+_esc(_t(opt.label,opt.labelEn||opt.label))+'</option>';
      });
      html += '</select>';
    } else if(f.type==='date'){
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'" style="width:auto">';
    } else if(f.type==='daterange'){
      html += '<span class="hm-filter-daterange">';
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'_from" style="width:auto">';
      html += '<span class="hm-filter-sep">-</span>';
      html += '<input type="date" class="hm-input" data-filter="'+_esc(f.key)+'_to" style="width:auto">';
      html += '</span>';
    }
  });
  if(config.showApply!==false){
    html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="refresh">'+_t('Ap dung','Apply')+'</button>';
  }
  html += '</div>';
  return html;
}

/* --- Bar Chart --- */
function renderBarChart(config, data){
  var items = (data && data[config.dataKey]) || config.items || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Khong co du lieu','No data')+'</div>';

  var max = 0;
  items.forEach(function(i){ if((i.value||0)>max) max = i.value||0; });
  if(max===0) max = 1;

  var html = '<div class="hm-bar-chart">';
  items.forEach(function(item){
    var pct = Math.round(((item.value||0)/max)*100);
    var color = item.color || 'var(--brand-2)';
    html += '<div class="hm-bar-row">';
    html += '<span class="hm-bar-label">'+_esc(_t(item.label||'',item.labelEn||''))+'</span>';
    html += '<div class="hm-bar-track"><div class="hm-bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>';
    html += '<span class="hm-bar-value">'+_esc(_fmt(item.value||0))+'</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Donut Chart --- */
function renderDonutChart(config, data){
  var items = (data && data[config.dataKey]) || config.items || [];
  var total = 0;
  items.forEach(function(i){ total += (i.value||0); });
  if(total===0) return '<div class="hm-empty">'+_t('Khong co du lieu','No data')+'</div>';

  var gradientParts = [];
  var cumPct = 0;
  items.forEach(function(item){
    var pct = ((item.value||0)/total)*100;
    gradientParts.push((item.color||'#94a3b8')+' '+cumPct+'% '+(cumPct+pct)+'%');
    cumPct += pct;
  });

  var html = '<div class="hm-donut-container">';
  html += '<div class="hm-donut-ring" style="background:conic-gradient('+gradientParts.join(',')+')">';
  html += '<div class="hm-donut-hole">'+_fmt(total)+'</div>';
  html += '</div>';
  html += '<div class="hm-donut-legend">';
  items.forEach(function(item){
    html += '<div class="hm-donut-legend-item">';
    html += '<span class="hm-donut-swatch" style="background:'+(item.color||'#94a3b8')+'"></span>';
    html += '<span>'+_esc(_t(item.label||'',item.labelEn||''))+': <b>'+_fmt(item.value||0)+'</b></span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

/* --- Toolbar --- */
function renderToolbar(config, data){
  var buttons = config.buttons || [];
  var html = '<div class="hm-toolbar">';
  buttons.forEach(function(btn){
    var cls = 'hm-btn hm-btn-'+(btn.variant||'secondary');
    if(btn.size) cls += ' hm-btn-'+btn.size;
    html += '<button class="'+cls+'" data-action="'+_esc(btn.action||'')+'">';
    if(btn.icon) html += '<span class="hm-btn-icon">'+btn.icon+'</span> ';
    html += _esc(_t(btn.label||'',btn.labelEn||''));
    html += '</button>';
  });
  html += '</div>';
  return html;
}

/* --- Card Grid --- */
function renderCardGrid(config, data){
  var items = (data && data[config.dataKey]) || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Khong co du lieu','No data')+'</div>';

  var cols = config.columns || 3;
  var html = '<div class="hm-card-grid" style="grid-template-columns:repeat('+cols+',1fr)">';
  items.forEach(function(item){
    html += '<div class="hm-card">';
    if(config.titleKey) html += '<div class="hm-card-title">'+_esc(item[config.titleKey]||'')+'</div>';
    if(config.subtitleKey) html += '<div class="hm-card-subtitle">'+_esc(item[config.subtitleKey]||'')+'</div>';
    if(config.badgeKey) html += '<span class="hm-badge hm-badge-'+_esc(item[config.badgeKey]||'draft')+'">'+_esc(item[config.badgeKey]||'')+'</span>';
    if(config.bodyKeys){
      config.bodyKeys.forEach(function(bk){
        html += '<div class="hm-card-field"><span class="hm-card-field-label">'+_esc(_t(bk.label||'',bk.labelEn||''))+':</span> '+_esc(item[bk.key]||'')+'</div>';
      });
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* --- Timeline --- */
function renderTimeline(config, data){
  var items = (data && data[config.dataKey]) || config.items || [];
  if(!items.length) return '<div class="hm-empty">'+_t('Khong co du lieu','No data')+'</div>';

  var html = '<div class="hm-timeline">';
  items.forEach(function(item, idx){
    var isLast = idx === items.length-1;
    html += '<div class="hm-timeline-item'+(isLast?' hm-timeline-last':'')+'">';
    html += '<div class="hm-timeline-dot" style="background:'+(item.color||'var(--brand-2)')+'"></div>';
    if(!isLast) html += '<div class="hm-timeline-line"></div>';
    html += '<div class="hm-timeline-content">';
    if(item.date) html += '<div class="hm-timeline-date">'+_esc(item.date)+'</div>';
    html += '<div class="hm-timeline-title">'+_esc(_t(item.title||'',item.titleEn||''))+'</div>';
    if(item.desc) html += '<div class="hm-timeline-desc">'+_esc(_t(item.desc||'',item.descEn||''))+'</div>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

/* --- Form Standard --- */
function renderFormStandard(config, data){
  var fields = config.fields || [];
  var cols = config.columns || 2;
  var html = '<form class="hm-form" style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:var(--space-4)" onsubmit="return false">';
  fields.forEach(function(f){
    var span = f.span || 1;
    html += '<div class="hm-form-group" style="grid-column:span '+span+'">';
    html += '<label class="hm-label">'+_esc(_t(f.label||'',f.labelEn||''))+(f.required?' <span class="hm-required">*</span>':'')+'</label>';
    var val = (data && data[f.key]!=null) ? data[f.key] : (f.default||'');
    if(f.type==='textarea'){
      html += '<textarea class="hm-input hm-textarea" name="'+_esc(f.key)+'" rows="'+(f.rows||3)+'"'+(f.required?' required':'')+'>'+_esc(val)+'</textarea>';
    } else if(f.type==='select'){
      html += '<select class="hm-input hm-select" name="'+_esc(f.key)+'"'+(f.required?' required':'')+'>';
      html += '<option value="">'+_t('Chon...','Select...')+'</option>';
      (f.options||[]).forEach(function(opt){
        var sel = String(val)===String(opt.value) ? ' selected' : '';
        html += '<option value="'+_esc(opt.value)+'"'+sel+'>'+_esc(_t(opt.label,opt.labelEn||opt.label))+'</option>';
      });
      html += '</select>';
    } else if(f.type==='checkbox'){
      html += '<label class="hm-checkbox-label"><input type="checkbox" name="'+_esc(f.key)+'"'+(val?' checked':'')+'> '+_esc(_t(f.checkLabel||'',f.checkLabelEn||''))+'</label>';
    } else {
      html += '<input type="'+(f.type||'text')+'" class="hm-input" name="'+_esc(f.key)+'" value="'+_esc(val)+'"'+(f.required?' required':'')+(f.placeholder?' placeholder="'+_esc(_t(f.placeholder,f.placeholderEn||f.placeholder))+'"':'')+'>';
    }
    html += '</div>';
  });
  if(config.showSubmit!==false){
    html += '<div class="hm-form-group" style="grid-column:1/-1;display:flex;gap:var(--space-2);justify-content:flex-end">';
    html += '<button type="reset" class="hm-btn hm-btn-ghost">'+_t('Huy','Cancel')+'</button>';
    html += '<button type="submit" class="hm-btn hm-btn-primary" data-action="'+(config.submitAction||'form-submit')+'">'+_t(config.submitLabel||'Luu',config.submitLabelEn||'Save')+'</button>';
    html += '</div>';
  }
  html += '</form>';
  return html;
}

/* --- Section Header --- */
function renderSectionHeader(config){
  var tag = config.level==='h2' ? 'h2' : 'h3';
  var html = '<'+tag+' class="hm-section-header">'+_esc(_t(config.text||'',config.textEn||''))+'</'+tag+'>';
  if(config.divider!==false) html += '<hr class="hm-divider">';
  return html;
}

/* --- Info Banner --- */
function renderInfoBanner(config){
  var type = config.type || 'info'; // info, success, warning, danger
  var html = '<div class="hm-banner hm-banner-'+_esc(type)+'">';
  if(config.icon) html += '<span class="hm-banner-icon">'+config.icon+'</span>';
  html += '<div class="hm-banner-text">'+_esc(_t(config.text||'',config.textEn||''))+'</div>';
  if(config.dismissible) html += '<button class="hm-banner-close" data-action="hm-dismiss">&times;</button>';
  html += '</div>';
  return html;
}

/* ── Edit Mode System ────────────────────────────────────────────────── */

function toggleEditMode(moduleId){
  var state = getModuleState(moduleId);
  state.editMode = !state.editMode;
  if(!state.editMode) state.selectedBlock = null;
  document.body.classList.toggle('hm-edit-mode', state.editMode);
  return state.editMode;
}

function moveBlockUp(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx <= 0) return;
  var tmp = tab.blocks[idx-1];
  tab.blocks[idx-1] = tab.blocks[idx];
  tab.blocks[idx] = tmp;
}

function moveBlockDown(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx < 0 || idx >= tab.blocks.length-1) return;
  var tmp = tab.blocks[idx+1];
  tab.blocks[idx+1] = tab.blocks[idx];
  tab.blocks[idx] = tmp;
}

function toggleBlockVisibility(moduleId, blockId){
  var block = _findBlockById(getModuleState(moduleId)._schema, blockId);
  if(block) block.visible = block.visible===false ? true : false;
}

function deleteBlock(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  tab.blocks = tab.blocks.filter(function(b){ return b.id!==blockId; });
}

function addBlock(moduleId, tabKey, afterBlockId, blockType){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;

  var newBlock = {
    id: _uid(),
    type: blockType,
    title: { vi: BLOCK_CATALOG[blockType]?BLOCK_CATALOG[blockType].label:blockType,
             en: BLOCK_CATALOG[blockType]?BLOCK_CATALOG[blockType].labelEn:blockType },
    visible: true,
    config: _defaultConfigForType(blockType),
  };

  if(!afterBlockId){
    tab.blocks.unshift(newBlock);
  } else {
    var idx = tab.blocks.findIndex(function(b){ return b.id===afterBlockId; });
    if(idx < 0) tab.blocks.push(newBlock);
    else tab.blocks.splice(idx+1, 0, newBlock);
  }
}

function _defaultConfigForType(type){
  switch(type){
    case 'kpi-row':    return { items:[] };
    case 'data-table': return { columns:[], dataKey:'items', pageSize:20 };
    case 'filter-bar': return { filters:[] };
    case 'chart-bar':  return { dataKey:'items', items:[] };
    case 'chart-donut':return { dataKey:'items', items:[] };
    case 'data-cards': return { dataKey:'items', columns:3 };
    case 'form-standard': return { fields:[], columns:2 };
    case 'section-header': return { text:'', textEn:'', level:'h3' };
    case 'info-banner':    return { text:'', textEn:'', type:'info' };
    case 'action-toolbar': return { buttons:[] };
    case 'spacer':         return { height:16 };
    default:               return {};
  }
}

/* ── Block Library Popup ─────────────────────────────────────────────── */

function showBlockLibrary(callback){
  // Create modal overlay
  var overlay = document.createElement('div');
  overlay.className = 'hm-modal-overlay';

  var modal = document.createElement('div');
  modal.className = 'hm-modal hm-block-library';

  var html = '<div class="hm-modal-header">';
  html += '<h3 class="hm-modal-title">'+_t('Thu vien block','Block Library')+'</h3>';
  html += '<button class="hm-modal-close" data-action="close">&times;</button>';
  html += '</div>';
  html += '<div class="hm-modal-body">';

  BLOCK_CATEGORIES.forEach(function(cat){
    html += '<div class="hm-lib-category">';
    html += '<h4 class="hm-lib-cat-title" style="color:'+cat.color+'">'+_esc(_t(cat.label,cat.labelEn))+'</h4>';
    html += '<div class="hm-lib-grid">';
    Object.keys(BLOCK_CATALOG).forEach(function(key){
      var b = BLOCK_CATALOG[key];
      if(b.category !== cat.key) return;
      html += '<div class="hm-lib-item" data-block-type="'+_esc(key)+'">';
      html += '<span class="hm-lib-icon">'+b.icon+'</span>';
      html += '<span class="hm-lib-name">'+_esc(_t(b.label,b.labelEn))+'</span>';
      html += '<span class="hm-lib-desc">'+_esc(_t(b.desc||'',b.descEn||''))+'</span>';
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  modal.innerHTML = html;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Events
  function close(){ if(overlay.parentNode) overlay.remove(); }
  overlay.addEventListener('click', function(e){
    if(e.target===overlay) close();
    var closeBtn = e.target.closest('[data-action="close"]');
    if(closeBtn) close();
    var item = e.target.closest('[data-block-type]');
    if(item){
      var type = item.getAttribute('data-block-type');
      close();
      if(callback) callback(type);
    }
  });
}

/* ── Properties Panel Renderer ───────────────────────────────────────── */

function renderPropertiesPanel(block, moduleId){
  if(!block) return '';

  var html = '<div class="hm-props-panel">';
  html += '<div class="hm-props-header">';
  html += '<h4>'+_t('Thuoc tinh','Properties')+'</h4>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-select-block" data-block-id="">&times;</button>';
  html += '</div>';
  html += '<div class="hm-props-body">';

  // Title
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Tieu de','Title')+'</label>';
  html += '<input class="hm-input" id="hm-prop-title-vi" value="'+_esc(block.title?block.title.vi||'':'')+'" placeholder="Tieng Viet">';
  html += '<input class="hm-input" id="hm-prop-title-en" value="'+_esc(block.title?block.title.en||'':'')+'" placeholder="English" style="margin-top:4px">';
  html += '</div>';

  // Block type (read-only)
  var catalog = BLOCK_CATALOG[block.type];
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Loai','Type')+'</label>';
  html += '<div class="hm-prop-readonly">'+(catalog?catalog.icon+' ':'')+_esc(block.type)+'</div>';
  html += '</div>';

  // API endpoint selector
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Nguon du lieu','Data Source')+'</label>';
  html += '<select class="hm-input hm-select" id="hm-prop-api">';
  html += '<option value="">'+_t('Khong','None')+'</option>';
  var currentApi = (block.config && block.config.dataSource) ? block.config.dataSource.api : '';
  // Group by module
  var grouped = {};
  API_CATALOG.forEach(function(a){
    if(!grouped[a.module]) grouped[a.module] = [];
    grouped[a.module].push(a);
  });
  Object.keys(grouped).forEach(function(mod){
    html += '<optgroup label="'+_esc(mod)+'">';
    grouped[mod].forEach(function(a){
      var sel = currentApi===a.action ? ' selected' : '';
      html += '<option value="'+_esc(a.action)+'"'+sel+'>'+_esc(a.label)+' ('+a.method+')</option>';
    });
    html += '</optgroup>';
  });
  html += '</select>';
  html += '</div>';

  // Type-specific config
  if(block.type==='data-table'){
    html += _renderColumnEditor(block.config);
  } else if(block.type==='kpi-row'){
    html += _renderKpiEditor(block.config);
  } else if(block.type==='filter-bar'){
    html += _renderFilterEditor(block.config);
  }

  html += '</div>'; // .hm-props-body

  // Save / Cancel
  html += '<div class="hm-props-footer">';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-select-block" data-block-id="">'+_t('Huy','Cancel')+'</button>';
  html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="hm-save-schema">'+_t('Luu','Save')+'</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

function _renderColumnEditor(config){
  var cols = (config && config.columns) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Cac cot','Columns')+' ('+cols.length+')</label>';
  html += '<div class="hm-prop-list">';
  cols.forEach(function(c,i){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(c.key)+' <small>('+_esc(c.type||'text')+')</small></span>';
    html += '<span class="hm-prop-list-label">'+_esc(_t(c.label||c.key,c.labelEn||c.key))+'</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _renderKpiEditor(config){
  var items = (config && config.items) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Chi so KPI','KPI Items')+' ('+items.length+')</label>';
  html += '<div class="hm-prop-list">';
  items.forEach(function(item){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(item.dataKey||'')+'</span>';
    html += '<span class="hm-prop-list-label">'+_esc(_t(item.label||'',item.labelEn||''))+'</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _renderFilterEditor(config){
  var filters = (config && config.filters) || [];
  var html = '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Bo loc','Filters')+' ('+filters.length+')</label>';
  html += '<div class="hm-prop-list">';
  filters.forEach(function(f){
    html += '<div class="hm-prop-list-item">';
    html += '<span>'+_esc(f.key)+' <small>('+_esc(f.type)+')</small></span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

/* ── Utility Functions ───────────────────────────────────────────────── */

function badge(status){
  return '<span class="hm-badge hm-badge-'+_esc(String(status||'draft'))+'">'+_esc(String(status||''))+'</span>';
}

function progressBar(value, max, colorClass){
  var pct = max > 0 ? Math.min(Math.round((value/max)*100),100) : 0;
  var cls = colorClass || (pct>=90?'green':pct>=70?'amber':'red');
  return '<div class="hm-progress hm-progress-'+cls+'"><div class="hm-progress-fill" style="width:'+pct+'%"></div></div>';
}

function toast(msg, type){
  var el = document.createElement('div');
  el.className = 'hm-toast hm-toast-'+(type||'info');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  setTimeout(function(){
    el.classList.remove('show');
    setTimeout(function(){ if(el.parentNode) el.remove(); }, 200);
  }, 3500);
}

/* ── Legacy Compatibility ────────────────────────────────────────────── */
/* Keep registerModule / getModuleLayout for existing code that uses them */

var _moduleLayouts = {};

function registerModule(moduleId, layout){
  _moduleLayouts[moduleId] = JSON.parse(JSON.stringify(layout));
}

function getModuleLayout(moduleId){
  var base = _moduleLayouts[moduleId];
  if(!base) return null;
  return _applyOverrides(moduleId, JSON.parse(JSON.stringify(base)));
}

function resetModuleLayout(moduleId){
  try{ localStorage.removeItem('hesem_layout_'+moduleId); }catch(e){}
}

function moveBlock(moduleId, tabKey, blockId, direction){
  if(direction==='up') moveBlockUp(moduleId, tabKey, blockId);
  else moveBlockDown(moduleId, tabKey, blockId);
}

function isEditMode(moduleId){
  if(moduleId) return getModuleState(moduleId).editMode;
  // Fallback: check body class
  return document.body.classList.contains('hm-edit-mode');
}

/* ── Export ───────────────────────────────────────────────────────────── */
window.HmBlockEngine = {
  // Catalog
  BLOCK_CATALOG: BLOCK_CATALOG,
  BLOCK_CATEGORIES: BLOCK_CATEGORIES,
  API_CATALOG: API_CATALOG,

  // Schema operations
  renderModuleFromSchema: renderModuleFromSchema,
  loadModuleSchema: loadModuleSchema,
  saveModuleSchema: saveModuleSchema,
  resetModuleSchema: resetModuleSchema,
  createNewModule: createNewModule,

  // Edit mode
  toggleEditMode: toggleEditMode,
  showBlockLibrary: showBlockLibrary,

  // Block renderers
  renderBlock: renderBlock,
  renderAdvancedTable: renderAdvancedTable,
  renderKpiRow: renderKpiRow,
  renderFilterBar: renderFilterBar,
  renderBarChart: renderBarChart,
  renderDonutChart: renderDonutChart,
  renderToolbar: renderToolbar,
  renderCardGrid: renderCardGrid,
  renderTimeline: renderTimeline,
  renderFormStandard: renderFormStandard,
  renderSectionHeader: renderSectionHeader,
  renderInfoBanner: renderInfoBanner,

  // Properties
  renderPropertiesPanel: renderPropertiesPanel,

  // Utilities
  badge: badge,
  progressBar: progressBar,
  toast: toast,
  _t: _t,
  _esc: _esc,
  _fmt: _fmt,

  // State
  getModuleState: getModuleState,
  invalidateCache: invalidateCache,
  fetchBlockData: fetchBlockData,

  // Legacy compat
  registerModule: registerModule,
  getModuleLayout: getModuleLayout,
  moveBlock: moveBlock,
  toggleBlockVisibility: toggleBlockVisibility,
  resetModuleLayout: resetModuleLayout,
  isEditMode: isEditMode,
};

})();

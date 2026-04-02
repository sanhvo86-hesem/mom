/* ============================================================================
   HESEM QMS Module Builder Engine v3.0
   Core file that renders ALL modules from JSON schemas.
   - Reads module schema JSON (from API or localStorage)
   - Renders tabs + blocks based on schema
   - Edit mode: block toolbar, add/remove/reorder blocks, drag-drop
   - API binding: blocks fetch data from configured API endpoints
   - Advanced data table v3 with sort/filter/resize/pagination/inline-edit
   - Reactive data binding with {{ expression }} evaluation
   - Computed fields & formula engine
   - Conditional visibility per block
   - Event system with action triggers & chaining
   - Undo/redo for schema changes
   - Drag-drop block reordering (HTML5 native)
   - Dependency graph & auto-refresh chain
   - Theme variants & block templates
   - Slot system for block composition
   - Keyboard shortcuts for edit mode
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

/** Deep clone helper */
function _clone(obj){ return JSON.parse(JSON.stringify(obj)); }

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
  'two-column':     { label:'Hai cot',            labelEn:'Two Column',     category:'layout',  icon:'\u{1F4D0}', desc:'Chia 2 cot trai-phai', descEn:'Left-right split layout' },
  'card-container': { label:'Hop chua',           labelEn:'Card Container', category:'layout',  icon:'\u{1F4E6}', desc:'Khung chua block con', descEn:'Container for child blocks' },

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

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — REACTIVE DATA BINDING (Appsmith-style)
   {{ expression }} evaluation with sandboxed Function constructor
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Evaluate a single JS expression within a sandboxed context.
 * context = { data:{}, filters:{}, state:{}, currentUser:{}, blocks:{}, row:{}, ... }
 * Returns result or empty string on error.
 */
function evaluateExpression(expr, context){
  if(expr==null || expr==='') return '';
  try {
    var keys = Object.keys(context||{});
    var vals = keys.map(function(k){ return context[k]; });
    // Create a function with named params matching context keys
    var fn = new Function(keys.join(','), 'try{return ('+expr+')}catch(e){return ""}');
    var result = fn.apply(null, vals);
    return result==null ? '' : result;
  } catch(e){
    return '';
  }
}

/**
 * Replace all {{ ... }} mustache bindings in a template string.
 * Example: "Tong: {{data.total}} don" -> "Tong: 42 don"
 */
function resolveBindings(template, context){
  if(typeof template !== 'string') return template;
  return template.replace(/\{\{(.+?)\}\}/g, function(match, expr){
    var result = evaluateExpression(expr.trim(), context);
    return result==null ? '' : String(result);
  });
}

/**
 * Build full reactive context for a module.
 * Merges block data, filters, current user, and state into one object.
 */
function _buildReactiveContext(moduleId){
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  var blocksData = {};

  // Build blocks map: blocks.blk_xxx.data = { ... }
  if(schema && schema.tabs){
    schema.tabs.forEach(function(tab){
      (tab.blocks||[]).forEach(function(block){
        blocksData[block.id] = {
          data: ms.blockData[block.id] || null,
          config: block.config || {},
          type: block.type
        };
      });
    });
  }

  return {
    data: ms.blockData || {},
    blocks: blocksData,
    filters: ms.filterValues || {},
    state: ms.customState || {},
    currentUser: (typeof currentUser !== 'undefined') ? currentUser : {},
    lang: (typeof lang !== 'undefined') ? lang : 'vi',
    Math: Math,
    Date: Date,
    Number: Number,
    String: String,
    Array: Array,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    encodeURIComponent: encodeURIComponent,
  };
}

/**
 * Resolve all bindings in a block's config object recursively.
 * Walks strings, arrays, and plain objects.
 */
function _resolveConfigBindings(config, context){
  if(typeof config === 'string') return resolveBindings(config, context);
  if(Array.isArray(config)){
    return config.map(function(item){ return _resolveConfigBindings(item, context); });
  }
  if(config && typeof config === 'object'){
    var out = {};
    Object.keys(config).forEach(function(k){
      out[k] = _resolveConfigBindings(config[k], context);
    });
    return out;
  }
  return config;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — COMPUTED FIELDS & FORMULA ENGINE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Evaluate a formula for a table row.
 * formula = '{{ row.qty * row.unit_price }}'
 * row = current row data object
 * context = module-level reactive context
 */
function evaluateFormula(formula, row, context){
  if(!formula) return '';
  // Strip {{ }} if present
  var expr = formula;
  var m = expr.match(/^\{\{(.+)\}\}$/);
  if(m) expr = m[1].trim();

  var localCtx = {};
  if(context){
    Object.keys(context).forEach(function(k){ localCtx[k] = context[k]; });
  }
  localCtx.row = row || {};
  return evaluateExpression(expr, localCtx);
}

/**
 * Apply computed columns to a data array.
 * Columns with a 'formula' property get their values computed per row.
 * Returns a new array with computed values injected.
 */
function _applyComputedColumns(columns, rows, context){
  var formulaCols = columns.filter(function(c){ return !!c.formula; });
  if(!formulaCols.length) return rows;

  return rows.map(function(originalRow){
    var row = {};
    Object.keys(originalRow).forEach(function(k){ row[k] = originalRow[k]; });
    formulaCols.forEach(function(col){
      row[col.key] = evaluateFormula(col.formula, row, context);
    });
    return row;
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — CONDITIONAL VISIBILITY
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Determine if a block should be visible based on visibleWhen expression.
 * block.visibleWhen = '{{ state.activeTab === "overview" }}'
 * Falls back to block.visible property if no expression set.
 */
function isBlockVisible(block, context){
  if(!block) return false;
  if(block.visibleWhen){
    var expr = block.visibleWhen;
    var m = expr.match(/^\{\{(.+)\}\}$/);
    if(m) expr = m[1].trim();
    return !!evaluateExpression(expr, context);
  }
  return block.visible !== false;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 4 — EVENT SYSTEM (Action triggers)
   ══════════════════════════════════════════════════════════════════════════ */

var EVENT_TYPES = {
  navigate: function(config, context){
    // Switch tab and pass params
    if(config.tab && context._moduleId){
      var ms = getModuleState(context._moduleId);
      ms.activeTab = resolveBindings(config.tab, context);
      if(config.pass){
        var params = {};
        Object.keys(config.pass).forEach(function(k){
          params[k] = resolveBindings(String(config.pass[k]), context);
        });
        ms.navParams = params;
      }
      if(context._container && ms._schema){
        renderModuleFromSchema(context._container, ms._schema);
      }
    }
  },

  api: function(config, context){
    var action = resolveBindings(config.action, context);
    var body = config.body ? JSON.parse(resolveBindings(
      typeof config.body === 'string' ? config.body : JSON.stringify(config.body),
      context
    )) : {};
    var method = config.method || 'POST';

    return _api(action, body, method).then(function(resp){
      // Handle onSuccess chain
      if(config.onSuccess){
        var successActions = config.onSuccess.split('|');
        successActions.forEach(function(act){
          act = act.trim();
          if(act === 'toast'){
            toast(_t('Thanh cong','Success'), 'success');
          } else if(act === 'refresh'){
            invalidateCache(action);
            if(context._container && context._moduleId){
              var ms = getModuleState(context._moduleId);
              renderModuleFromSchema(context._container, ms._schema);
            }
          } else if(act.indexOf('navigate:') === 0){
            var tab = act.split(':')[1];
            EVENT_TYPES.navigate({tab:tab}, context);
          }
        });
      }
      return resp;
    }).catch(function(err){
      if(config.onError === 'toast' || !config.onError){
        toast(_t('Loi: ','Error: ')+String(err), 'danger');
      }
      return null;
    });
  },

  refresh: function(config, context){
    var blockIds = config.blocks || [];
    var moduleId = context._moduleId;
    if(!moduleId) return;
    var ms = getModuleState(moduleId);
    var schema = ms._schema;
    if(!schema) return;

    // Invalidate cache for specified blocks
    blockIds.forEach(function(bid){
      var block = _findBlockById(schema, bid);
      if(block && block.config && block.config.dataSource){
        invalidateCache(block.config.dataSource.api);
      }
    });

    if(context._container){
      renderModuleFromSchema(context._container, schema);
    }
  },

  toast: function(config, context){
    var msg = resolveBindings(config.message || config.msg || '', context);
    toast(msg, config.type || 'info');
  },

  openModal: function(config, context){
    // Open a form modal with optional pre-filled data
    var title = resolveBindings(config.title || '', context);
    var formConfig = config.form || {};

    var overlay = document.createElement('div');
    overlay.className = 'hm-modal-overlay';
    var modal = document.createElement('div');
    modal.className = 'hm-modal';

    var html = '<div class="hm-modal-header">';
    html += '<h3 class="hm-modal-title">'+_esc(title)+'</h3>';
    html += '<button class="hm-modal-close" data-action="close">&times;</button>';
    html += '</div>';
    html += '<div class="hm-modal-body">';

    if(formConfig.fields){
      html += renderFormStandard(formConfig, config.data || {});
    } else {
      html += '<div class="hm-empty">'+_t('Chua cau hinh form','No form configured')+'</div>';
    }

    html += '</div>';
    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close(){ if(overlay.parentNode) overlay.remove(); }
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) close();
      if(e.target.closest('[data-action="close"]')) close();
    });
  },

  setFilter: function(config, context){
    var moduleId = context._moduleId;
    if(!moduleId) return;
    var ms = getModuleState(moduleId);
    if(!ms.filterValues) ms.filterValues = {};
    Object.keys(config.values || {}).forEach(function(k){
      ms.filterValues[k] = resolveBindings(String(config.values[k]), context);
    });
    if(context._container && ms._schema){
      invalidateCache();
      renderModuleFromSchema(context._container, ms._schema);
    }
  },

  chain: function(config, context){
    // Run multiple actions in sequence
    var actions = config.actions || [];
    var promise = Promise.resolve();
    actions.forEach(function(actionConfig){
      promise = promise.then(function(){
        return executeEvent(actionConfig, context);
      });
    });
    return promise;
  },
};

/**
 * Execute an event action with expression resolution.
 * eventConfig = { type:'navigate', tab:'detail', pass:{ id:'{{row.id}}' } }
 */
function executeEvent(eventConfig, context){
  if(!eventConfig || !eventConfig.type) return Promise.resolve();
  var handler = EVENT_TYPES[eventConfig.type];
  if(!handler){
    console.warn('[BlockEngine] Unknown event type:', eventConfig.type);
    return Promise.resolve();
  }
  var result = handler(eventConfig, context);
  // Ensure promise return
  return (result && typeof result.then === 'function') ? result : Promise.resolve(result);
}

/**
 * Fire all events for a given event name on a block.
 * block.events = { onClick: {...}, onLoad: {...} }
 */
function _fireBlockEvent(block, eventName, context){
  if(!block || !block.events || !block.events[eventName]) return Promise.resolve();
  return executeEvent(block.events[eventName], context);
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 5 — UNDO / REDO SYSTEM
   ══════════════════════════════════════════════════════════════════════════ */

var _undoStack = []; // max 50 entries
var _redoStack = [];

/**
 * Push a schema snapshot to the undo stack before making a change.
 */
function pushUndo(moduleId, action, previousState){
  _undoStack.push({
    moduleId: moduleId,
    action: action,
    state: _clone(previousState),
    timestamp: Date.now()
  });
  if(_undoStack.length > 50) _undoStack.shift();
  _redoStack = []; // clear redo on new action
}

/**
 * Get the current schema state for undo/redo snapshots.
 */
function _getCurrentSchemaState(moduleId){
  var ms = getModuleState(moduleId);
  return ms._schema ? _clone(ms._schema) : null;
}

/**
 * Apply a schema state from an undo/redo entry.
 */
function _applySchemaState(moduleId, state){
  var ms = getModuleState(moduleId);
  ms._schema = _clone(state);
}

/**
 * Undo the last schema change.
 */
function undo(moduleId){
  if(!_undoStack.length) return false;
  // Find last entry for this module
  var idx = -1;
  for(var i = _undoStack.length - 1; i >= 0; i--){
    if(_undoStack[i].moduleId === moduleId){ idx = i; break; }
  }
  if(idx < 0) return false;

  var entry = _undoStack.splice(idx, 1)[0];
  // Save current state to redo
  _redoStack.push({
    moduleId: moduleId,
    action: entry.action,
    state: _getCurrentSchemaState(moduleId),
    timestamp: Date.now()
  });
  // Restore previous state
  _applySchemaState(moduleId, entry.state);
  toast(_t('Hoan tac: '+entry.action, 'Undo: '+entry.action), 'info');
  return true;
}

/**
 * Redo the last undone schema change.
 */
function redo(moduleId){
  if(!_redoStack.length) return false;
  var idx = -1;
  for(var i = _redoStack.length - 1; i >= 0; i--){
    if(_redoStack[i].moduleId === moduleId){ idx = i; break; }
  }
  if(idx < 0) return false;

  var entry = _redoStack.splice(idx, 1)[0];
  // Save current state to undo
  _undoStack.push({
    moduleId: moduleId,
    action: entry.action,
    state: _getCurrentSchemaState(moduleId),
    timestamp: Date.now()
  });
  // Apply redo state
  _applySchemaState(moduleId, entry.state);
  toast(_t('Lam lai: '+entry.action, 'Redo: '+entry.action), 'info');
  return true;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 6 — DRAG-DROP BLOCK REORDERING (HTML5 native)
   ══════════════════════════════════════════════════════════════════════════ */

var _dragState = { dragging: null, placeholder: null };

/**
 * Initialize drag-drop for blocks within a container in edit mode.
 */
function initDragDrop(container, moduleId, tabKey){
  if(!container) return;

  var blocks = container.querySelectorAll('.hm-block[data-block-id]');
  blocks.forEach(function(el){
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', function(e){
      _dragState.dragging = el.getAttribute('data-block-id');
      el.classList.add('hm-block-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _dragState.dragging);

      // Create placeholder
      _dragState.placeholder = document.createElement('div');
      _dragState.placeholder.className = 'hm-drop-indicator';
      _dragState.placeholder.style.cssText = 'height:4px;background:var(--brand-2,#2563eb);border-radius:2px;margin:4px 0;transition:opacity .15s';
    });

    el.addEventListener('dragend', function(){
      el.classList.remove('hm-block-dragging');
      _dragState.dragging = null;
      if(_dragState.placeholder && _dragState.placeholder.parentNode){
        _dragState.placeholder.remove();
      }
      _dragState.placeholder = null;
      // Remove all drag-over styles
      container.querySelectorAll('.hm-block-dragover').forEach(function(b){
        b.classList.remove('hm-block-dragover');
      });
    });

    el.addEventListener('dragover', function(e){
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(!_dragState.dragging) return;
      var targetId = el.getAttribute('data-block-id');
      if(targetId === _dragState.dragging) return;

      // Determine drop position (top half vs bottom half)
      var rect = el.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      var isAbove = e.clientY < midY;

      // Remove existing placeholder
      if(_dragState.placeholder && _dragState.placeholder.parentNode){
        _dragState.placeholder.remove();
      }

      if(isAbove){
        el.parentNode.insertBefore(_dragState.placeholder, el);
      } else {
        el.parentNode.insertBefore(_dragState.placeholder, el.nextSibling);
      }
    });

    el.addEventListener('dragleave', function(){
      el.classList.remove('hm-block-dragover');
    });

    el.addEventListener('drop', function(e){
      e.preventDefault();
      if(!_dragState.dragging) return;
      var draggedId = _dragState.dragging;
      var targetId = el.getAttribute('data-block-id');
      if(draggedId === targetId) return;

      // Determine drop position
      var rect = el.getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      var insertBefore = e.clientY < midY;

      // Push undo before reorder
      var ms = getModuleState(moduleId);
      pushUndo(moduleId, 'reorder-block', ms._schema);

      // Perform reorder in schema
      var schema = ms._schema;
      var tab = schema.tabs.find(function(t){ return t.tabId === tabKey; });
      if(!tab) return;

      // Remove dragged block
      var draggedIdx = -1;
      var draggedBlock = null;
      for(var i = 0; i < tab.blocks.length; i++){
        if(tab.blocks[i].id === draggedId){
          draggedIdx = i;
          draggedBlock = tab.blocks[i];
          break;
        }
      }
      if(!draggedBlock) return;
      tab.blocks.splice(draggedIdx, 1);

      // Find target index after removal
      var targetIdx = -1;
      for(var j = 0; j < tab.blocks.length; j++){
        if(tab.blocks[j].id === targetId){ targetIdx = j; break; }
      }
      if(targetIdx < 0) targetIdx = tab.blocks.length;

      // Insert at position
      var insertIdx = insertBefore ? targetIdx : targetIdx + 1;
      tab.blocks.splice(insertIdx, 0, draggedBlock);

      // Re-render
      renderModuleFromSchema(container.closest('[data-module]') || container, schema);
    });
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 7 — DEPENDENCY GRAPH (auto-refresh chain)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Scan all blocks for {{ blocks.xxx }} references.
 * Returns: { blockId: [dependsOnBlockIds] }
 */
function buildDependencyGraph(schema){
  var graph = {};
  if(!schema || !schema.tabs) return graph;

  var bindingPattern = /\{\{\s*blocks\.(\w+)/g;

  schema.tabs.forEach(function(tab){
    (tab.blocks||[]).forEach(function(block){
      var deps = [];
      var configStr = JSON.stringify(block.config || {});
      // Also scan title, visibleWhen, events
      if(block.title){
        configStr += JSON.stringify(block.title);
      }
      if(block.visibleWhen) configStr += block.visibleWhen;
      if(block.events) configStr += JSON.stringify(block.events);

      var match;
      while((match = bindingPattern.exec(configStr)) !== null){
        var depId = match[1];
        if(depId !== block.id && deps.indexOf(depId) < 0){
          deps.push(depId);
        }
      }
      bindingPattern.lastIndex = 0; // reset regex

      if(deps.length) graph[block.id] = deps;
    });
  });

  return graph;
}

/**
 * Find all blocks that depend on changedBlockId (direct + transitive).
 */
function _findDependents(graph, changedBlockId){
  var dependents = [];
  Object.keys(graph).forEach(function(bid){
    if(graph[bid].indexOf(changedBlockId) >= 0){
      if(dependents.indexOf(bid) < 0) dependents.push(bid);
    }
  });
  return dependents;
}

/**
 * When a block's data changes, auto-refresh all blocks that depend on it.
 */
function refreshDependents(moduleId, changedBlockId){
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  if(!schema) return;

  var graph = buildDependencyGraph(schema);
  var toRefresh = _findDependents(graph, changedBlockId);
  if(!toRefresh.length) return;

  toRefresh.forEach(function(bid){
    var block = _findBlockById(schema, bid);
    if(!block) return;
    if(block.config && block.config.dataSource){
      invalidateCache(block.config.dataSource.api);
      ms.loading[bid] = true;
      fetchBlockData(block).then(function(data){
        ms.loading[bid] = false;
        ms.blockData[bid] = data;
        // Cascade: check if this block also has dependents
        refreshDependents(moduleId, bid);
      });
    }
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 8 — THEME VARIANTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Get CSS class string for a block based on variant and color scheme.
 */
function getBlockClasses(block){
  var cls = 'hm-block';
  if(!block || !block.config) return cls;
  if(block.config.variant) cls += ' hm-block-' + block.config.variant;
  if(block.config.colorScheme) cls += ' hm-block-' + block.config.colorScheme;
  if(block.config.noPadding) cls += ' hm-block-no-pad';
  if(block.config.fullWidth) cls += ' hm-block-full';
  return cls;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 9 — BLOCK TEMPLATES (Presets)
   ══════════════════════════════════════════════════════════════════════════ */

var BLOCK_TEMPLATES = {
  'order-kpi-row': {
    type: 'kpi-row',
    title: { vi:'KPI Don hang', en:'Order KPI' },
    config: {
      dataSource: { api:'order_dashboard_kpi', method:'GET' },
      items: [
        { label:'Don hoat dong', labelEn:'Active Orders', dataKey:'active_so_count', color:'var(--brand-2)' },
        { label:'OTD %', labelEn:'OTD %', dataKey:'on_time_pct', color:'var(--green)', suffix:'%' },
        { label:'Qua han', labelEn:'Overdue', dataKey:'overdue_count', color:'var(--red)' },
        { label:'Tam dung', labelEn:'On Hold', dataKey:'active_holds', color:'var(--amber)' },
      ]
    }
  },
  'production-shift-summary': {
    type: 'kpi-row',
    title: { vi:'Tong hop ca san xuat', en:'Shift Summary' },
    config: {
      dataSource: { api:'dispatch_dashboard', method:'GET' },
      items: [
        { label:'Tong task', labelEn:'Total Tasks', dataKey:'total_tasks', color:'var(--brand-2)' },
        { label:'San pham tot', labelEn:'Good Output', dataKey:'total_good', color:'var(--green)' },
        { label:'NG', labelEn:'NG', dataKey:'total_ng', color:'var(--red)' },
        { label:'Dat %', labelEn:'Achievement', dataKey:'achievement_pct', color:'var(--brand-1)', suffix:'%' },
      ]
    }
  },
  'quality-ncr-table': {
    type: 'data-table',
    title: { vi:'Danh sach NCR', en:'NCR List' },
    config: {
      dataSource: { api:'ncr_list', method:'GET', dataKey:'ncrs' },
      dataKey: 'ncrs',
      pageSize: 20,
      columns: [
        { key:'ncr_id', label:'Ma NCR', labelEn:'NCR ID', type:'text' },
        { key:'title', label:'Tieu de', labelEn:'Title', type:'text' },
        { key:'status', label:'Trang thai', labelEn:'Status', type:'badge' },
        { key:'severity', label:'Muc do', labelEn:'Severity', type:'badge' },
        { key:'created_at', label:'Ngay tao', labelEn:'Created', type:'date' },
        { key:'assigned_to', label:'Nguoi xu ly', labelEn:'Assignee', type:'text' },
      ]
    }
  },
  'quality-exception-kpi': {
    type: 'kpi-row',
    title: { vi:'KPI Chat luong', en:'Quality KPI' },
    config: {
      dataSource: { api:'exception_dashboard', method:'GET' },
      items: [
        { label:'NCR mo', labelEn:'Open NCR', dataKey:'open_ncr', color:'var(--red)' },
        { label:'CAPA mo', labelEn:'Open CAPA', dataKey:'open_capa', color:'var(--amber)' },
        { label:'COPQ MTD', labelEn:'COPQ MTD', dataKey:'copq_mtd', color:'var(--brand-2)', suffix:' VND' },
      ]
    }
  },
  'supplier-dashboard-kpi': {
    type: 'kpi-row',
    title: { vi:'KPI Nha cung cap', en:'Supplier KPI' },
    config: {
      dataSource: { api:'supplier_dashboard', method:'GET' },
      items: [
        { label:'Diem TB', labelEn:'Avg Score', dataKey:'avg_score', color:'var(--brand-2)' },
        { label:'SCAR mo', labelEn:'Open SCAR', dataKey:'open_scars', color:'var(--red)' },
        { label:'Ti le tu choi IQC', labelEn:'IQC Reject %', dataKey:'incoming_reject_rate', color:'var(--amber)', suffix:'%' },
      ]
    }
  },
  'oee-kpi-row': {
    type: 'kpi-row',
    title: { vi:'OEE Tong hop', en:'OEE Overview' },
    config: {
      dataSource: { api:'production_oee', method:'GET' },
      items: [
        { label:'OEE', labelEn:'OEE', dataKey:'oee', color:'var(--brand-2)', suffix:'%' },
        { label:'Availability', labelEn:'Availability', dataKey:'availability', color:'var(--green)', suffix:'%' },
        { label:'Performance', labelEn:'Performance', dataKey:'performance', color:'var(--amber)', suffix:'%' },
        { label:'Quality', labelEn:'Quality', dataKey:'quality', color:'var(--brand-1)', suffix:'%' },
      ]
    }
  },
  'empty-filter-bar': {
    type: 'filter-bar',
    title: { vi:'Bo loc', en:'Filters' },
    config: {
      filters: [
        { key:'search', type:'search', placeholder:'Tim kiem...', placeholderEn:'Search...' },
        { key:'status', type:'select', allLabel:'Tat ca', allLabelEn:'All', options:[
          { value:'active', label:'Dang hoat dong', labelEn:'Active' },
          { value:'closed', label:'Da dong', labelEn:'Closed' },
        ]},
      ]
    }
  },
  'empty-data-table': {
    type: 'data-table',
    title: { vi:'Bang du lieu', en:'Data Table' },
    config: { columns:[], dataKey:'items', pageSize:20 }
  },
  'so-list-table': {
    type: 'data-table',
    title: { vi:'Danh sach SO', en:'Sales Order List' },
    config: {
      dataSource: { api:'order_so_list', method:'GET', dataKey:'sales_orders' },
      dataKey: 'sales_orders',
      pageSize: 20,
      columns: [
        { key:'so_number', label:'Ma SO', labelEn:'SO Number', type:'text' },
        { key:'customer', label:'Khach hang', labelEn:'Customer', type:'text' },
        { key:'status', label:'Trang thai', labelEn:'Status', type:'badge' },
        { key:'total_value', label:'Gia tri', labelEn:'Value', type:'number' },
        { key:'due_date', label:'Han giao', labelEn:'Due Date', type:'date' },
      ]
    }
  },
  'scar-list-table': {
    type: 'data-table',
    title: { vi:'Danh sach SCAR', en:'SCAR List' },
    config: {
      dataSource: { api:'scar_list', method:'GET', dataKey:'scars' },
      dataKey: 'scars',
      pageSize: 20,
      columns: [
        { key:'scar_id', label:'Ma SCAR', labelEn:'SCAR ID', type:'text' },
        { key:'supplier', label:'NCC', labelEn:'Supplier', type:'text' },
        { key:'status', label:'Trang thai', labelEn:'Status', type:'badge' },
        { key:'issue_date', label:'Ngay phat hanh', labelEn:'Issue Date', type:'date' },
      ]
    }
  },
  'equipment-list-table': {
    type: 'data-table',
    title: { vi:'Danh sach thiet bi', en:'Equipment List' },
    config: {
      dataSource: { api:'equipment_list', method:'GET', dataKey:'items' },
      dataKey: 'items',
      pageSize: 20,
      columns: [
        { key:'code', label:'Ma TB', labelEn:'Code', type:'text' },
        { key:'name', label:'Ten', labelEn:'Name', type:'text' },
        { key:'status', label:'Trang thai', labelEn:'Status', type:'badge' },
        { key:'location', label:'Vi tri', labelEn:'Location', type:'text' },
        { key:'next_cal', label:'Hieu chuan tiep', labelEn:'Next Cal.', type:'date' },
      ]
    }
  },
  'two-col-layout': {
    type: 'two-column',
    title: { vi:'Bo cuc 2 cot', en:'Two Column Layout' },
    config: { ratio:'60-40' },
    slots: { left:[], right:[] }
  },
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 10 — SLOT SYSTEM (Block composition)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Render a two-column block with left/right slots.
 */
function renderTwoColumn(block, data, state){
  var config = block.config || {};
  var ratio = config.ratio || '50-50';
  var parts = ratio.split('-');
  var leftPct = parseInt(parts[0],10) || 50;
  var rightPct = parseInt(parts[1],10) || 50;

  var slots = block.slots || {};
  var leftBlocks = slots.left || [];
  var rightBlocks = slots.right || [];

  var html = '<div class="hm-two-col" style="display:grid;grid-template-columns:'+leftPct+'fr '+rightPct+'fr;gap:var(--space-4)">';

  // Left slot
  html += '<div class="hm-slot hm-slot-left">';
  leftBlocks.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !leftBlocks.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';

  // Right slot
  html += '<div class="hm-slot hm-slot-right">';
  rightBlocks.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !rightBlocks.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

/**
 * Render a card container with a single content slot.
 */
function renderCardContainer(block, data, state){
  var slots = block.slots || {};
  var children = slots.content || [];

  var html = '<div class="hm-card-container">';
  children.forEach(function(childBlock){
    html += renderBlock(childBlock, state.blockData[childBlock.id]||{}, state);
  });
  if(state.editMode && !children.length){
    html += '<div class="hm-slot-empty">'+_t('Keo block vao day','Drop block here')+'</div>';
  }
  html += '</div>';
  return html;
}


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 11 — KEYBOARD SHORTCUTS
   ══════════════════════════════════════════════════════════════════════════ */

var _currentModuleId = null;
var _currentContainer = null;

var SHORTCUTS = {
  'ctrl+z': function(){ if(_currentModuleId){ undo(_currentModuleId); _rerender(); } },
  'ctrl+shift+z': function(){ if(_currentModuleId){ redo(_currentModuleId); _rerender(); } },
  'ctrl+y': function(){ if(_currentModuleId){ redo(_currentModuleId); _rerender(); } },
  'ctrl+e': function(){ if(_currentModuleId){ toggleEditMode(_currentModuleId); _rerender(); } },
  'ctrl+s': function(){ if(_currentModuleId){ var ms = getModuleState(_currentModuleId); saveModuleSchema(_currentModuleId, ms._schema); } },
  'ctrl+b': function(){ showBlockLibrary(); },
  'escape': function(){ if(_currentModuleId){ var ms = getModuleState(_currentModuleId); if(ms.editMode){ toggleEditMode(_currentModuleId); _rerender(); } } },
};

function _rerender(){
  if(_currentModuleId && _currentContainer){
    var ms = getModuleState(_currentModuleId);
    if(ms._schema) renderModuleFromSchema(_currentContainer, ms._schema);
  }
}

var _shortcutsInitialized = false;
function _initKeyboardShortcuts(){
  if(_shortcutsInitialized) return;
  _shortcutsInitialized = true;

  document.addEventListener('keydown', function(e){
    // Only active in edit mode (except ctrl+e which toggles)
    var ms = _currentModuleId ? getModuleState(_currentModuleId) : null;
    var inEdit = ms && ms.editMode;

    // Build key combo string
    var parts = [];
    if(e.ctrlKey || e.metaKey) parts.push('ctrl');
    if(e.shiftKey) parts.push('shift');
    if(e.altKey) parts.push('alt');
    var key = e.key.toLowerCase();
    if(key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta'){
      parts.push(key);
    }
    var combo = parts.join('+');

    // Check if this combo is registered
    var handler = SHORTCUTS[combo];
    if(handler){
      // ctrl+e works always; others only in edit mode
      if(combo === 'ctrl+e' || inEdit){
        e.preventDefault();
        e.stopPropagation();
        handler();
      }
    }
  });
}


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
      filterValues: {},
      customState: {},
      navParams: {},
      inlineEdits: {},
      selectedRows: {},
      expandedRows: {},
      columnVisibility: {},
    };
  }
  return _moduleStates[moduleId];
}

/* ── Data Fetching per Block ─────────────────────────────────────────── */
var _fetchCache = {};  // key = action+JSON(params) -> { promise, ts }
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

  // Track current module for keyboard shortcuts
  _currentModuleId = moduleId;
  _currentContainer = container;
  _initKeyboardShortcuts();

  // Build reactive context
  var reactiveCtx = _buildReactiveContext(moduleId);

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
  var titleText = schema.title;
  if(typeof titleText === 'object') titleText = _t(titleText.vi||'', titleText.en||'');
  html += _esc(resolveBindings(String(titleText), reactiveCtx));
  html += '</h1>';
  // Edit mode toggle + undo/redo controls
  html += '<div class="hm-page-actions">';
  if(state.editMode){
    html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-undo" data-module="'+_esc(moduleId)+'" title="Ctrl+Z">&#8630; '+_t('Hoan tac','Undo')+'</button>';
    html += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="hm-redo" data-module="'+_esc(moduleId)+'" title="Ctrl+Shift+Z">&#8631; '+_t('Lam lai','Redo')+'</button>';
    html += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="hm-save-schema" data-module="'+_esc(moduleId)+'" title="Ctrl+S">'+_t('Luu','Save')+'</button>';
  }
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
      // Conditional visibility check
      var visible = isBlockVisible(block, reactiveCtx);
      if(!state.editMode && !visible) return;

      var blockClasses = getBlockClasses(block);
      if(!visible) blockClasses += ' hm-block-hidden';

      html += _renderBlockWrapper(block, state.blockData[block.id]||{}, state, blockClasses, reactiveCtx);
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

  // Initialize drag-drop in edit mode
  if(state.editMode && activeTab){
    initDragDrop(
      container.querySelector('.hm-blocks-container'),
      moduleId,
      activeTab.tabId
    );
  }

  // Fetch data for blocks with data sources
  if(activeTab){
    var depGraph = buildDependencyGraph(schema);

    activeTab.blocks.forEach(function(block){
      if(block.config && block.config.dataSource){
        state.loading[block.id] = true;
        _showBlockLoading(container, block.id);
        fetchBlockData(block).then(function(data){
          state.loading[block.id] = false;
          state.blockData[block.id] = data;
          _rerenderBlockContent(container, block, data, state);

          // Fire onLoad event if defined
          if(block.events && block.events.onLoad){
            var ctx = _buildReactiveContext(moduleId);
            ctx._moduleId = moduleId;
            ctx._container = container;
            _fireBlockEvent(block, 'onLoad', ctx);
          }

          // Auto-refresh dependents
          refreshDependents(moduleId, block.id);
        });
      }

      // Fetch data for slot children too
      if(block.slots){
        Object.keys(block.slots).forEach(function(slotKey){
          (block.slots[slotKey]||[]).forEach(function(child){
            if(child.config && child.config.dataSource){
              state.loading[child.id] = true;
              fetchBlockData(child).then(function(data){
                state.loading[child.id] = false;
                state.blockData[child.id] = data;
              });
            }
          });
        });
      }
    });
  }
}

/**
 * Render a block wrapper with classes, toolbar, and content.
 */
function _renderBlockWrapper(block, data, state, blockClasses, reactiveCtx){
  var editMode = state && state.editMode;

  var html = '<div class="'+blockClasses+'" data-block-id="'+_esc(block.id)+'" data-block-type="'+_esc(block.type)+'">';

  // Edit mode toolbar
  if(editMode){
    html += '<div class="hm-block-toolbar">';
    html += '<button class="hm-block-btn" data-action="hm-move-up" data-block-id="'+_esc(block.id)+'" title="'+_t('Di len','Move up')+'">&#9650;</button>';
    html += '<button class="hm-block-btn" data-action="hm-move-down" data-block-id="'+_esc(block.id)+'" title="'+_t('Di xuong','Move down')+'">&#9660;</button>';
    html += '<button class="hm-block-btn" data-action="hm-toggle-block" data-block-id="'+_esc(block.id)+'" title="'+_t('An/hien','Toggle')+'">'+(block.visible===false?'\u{1F441}\u200D\u{1F5E8}':'\u{1F441}')+'</button>';
    html += '<button class="hm-block-btn" data-action="hm-select-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Cau hinh','Config')+'">&#9881;</button>';
    html += '<button class="hm-block-btn" data-action="hm-duplicate-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Nhan ban','Duplicate')+'">&#128203;</button>';
    html += '<button class="hm-block-btn hm-block-btn-danger" data-action="hm-delete-block" data-block-id="'+_esc(block.id)+'" title="'+_t('Xoa','Delete')+'">&#128465;</button>';
    html += '</div>';
  }

  // Block header (with binding resolution)
  if(block.title){
    var titleVi = block.title.vi || block.title;
    var titleEn = block.title.en || block.title;
    if(reactiveCtx){
      titleVi = resolveBindings(String(titleVi), reactiveCtx);
      titleEn = resolveBindings(String(titleEn), reactiveCtx);
    }
    html += '<div class="hm-block-header">';
    html += '<span class="hm-block-title">'+_esc(_t(titleVi, titleEn))+'</span>';
    html += '</div>';
  }

  // Block content
  html += '<div class="hm-block-content">';
  html += _renderBlockInner(block, data, state, reactiveCtx);
  html += '</div></div>';
  return html;
}

function _applyOverrides(moduleId, schema){
  var s = _clone(schema);
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
  var moduleId = state && state._schema ? state._schema.moduleId : '_';
  var reactiveCtx = _buildReactiveContext(moduleId);
  el.innerHTML = _renderBlockInner(block, data, state, reactiveCtx);
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
          pushUndo(moduleId, 'add-block', state._schema);
          addBlock(moduleId, tabId, after||null, blockType);
          renderModuleFromSchema(container, state._schema);
        });
        break;
      case 'hm-move-up':
        pushUndo(moduleId, 'move-up', state._schema);
        moveBlockUp(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-move-down':
        pushUndo(moduleId, 'move-down', state._schema);
        moveBlockDown(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-toggle-block':
        pushUndo(moduleId, 'toggle-visibility', state._schema);
        toggleBlockVisibility(moduleId, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-delete-block':
        if(confirm(_t('Xoa block nay?','Delete this block?'))){
          pushUndo(moduleId, 'delete-block', state._schema);
          deleteBlock(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
          renderModuleFromSchema(container, state._schema);
        }
        break;
      case 'hm-duplicate-block':
        pushUndo(moduleId, 'duplicate-block', state._schema);
        _duplicateBlock(moduleId, state.activeTab, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-select-block':
        state.selectedBlock = _findBlockById(state._schema, btn.getAttribute('data-block-id'));
        renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-save-schema':
        saveModuleSchema(moduleId, state._schema);
        break;
      case 'hm-undo':
        if(undo(moduleId)) renderModuleFromSchema(container, state._schema);
        break;
      case 'hm-redo':
        if(redo(moduleId)) renderModuleFromSchema(container, state._schema);
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
      case 'hm-table-select-row':
        _handleRowSelect(moduleId, btn);
        break;
      case 'hm-table-select-all':
        _handleSelectAll(moduleId, btn);
        break;
      case 'hm-table-expand-row':
        _handleRowExpand(container, moduleId, btn);
        break;
      case 'hm-table-col-toggle':
        _handleColumnToggle(container, moduleId, btn);
        break;
      case 'hm-table-export':
        _handleTableExport(moduleId, btn);
        break;
      case 'hm-add-from-template':
        var tplKey = btn.getAttribute('data-template');
        if(tplKey && BLOCK_TEMPLATES[tplKey]){
          pushUndo(moduleId, 'add-template', state._schema);
          _addBlockFromTemplate(moduleId, state.activeTab, null, tplKey);
          renderModuleFromSchema(container, state._schema);
        }
        break;
      case 'refresh':
        invalidateCache();
        renderModuleFromSchema(container, state._schema);
        break;
      default:
        // Check for block-level event handlers
        var blockEl = btn.closest('.hm-block[data-block-id]');
        if(blockEl){
          var blockId = blockEl.getAttribute('data-block-id');
          var block = _findBlockById(state._schema, blockId);
          if(block && block.events && block.events.onClick){
            var ctx = _buildReactiveContext(moduleId);
            ctx._moduleId = moduleId;
            ctx._container = container;
            // Pass row data if inside a table row
            var rowEl = btn.closest('[data-row-idx]');
            if(rowEl){
              ctx.rowIndex = parseInt(rowEl.getAttribute('data-row-idx'),10);
            }
            _fireBlockEvent(block, 'onClick', ctx);
          }
        }
        break;
    }
  };
  container.addEventListener('click', container._hmClick);

  // Double-click for inline editing
  container.removeEventListener('dblclick', container._hmDblClick);
  container._hmDblClick = function(e){
    var cell = e.target.closest('.hm-cell-editable');
    if(!cell) return;
    _startInlineEdit(container, moduleId, cell);
  };
  container.addEventListener('dblclick', container._hmDblClick);

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

  // Change events for select-based page size
  container.removeEventListener('change', container._hmChange);
  container._hmChange = function(e){
    var el = e.target;
    if(el.hasAttribute('data-action')){
      var act = el.getAttribute('data-action');
      if(act === 'hm-table-pagesize'){
        _handleTablePageSize(container, moduleId, el);
      }
    }
    if(el.hasAttribute('data-table-filter')){
      var blockEl = el.closest('.hm-block');
      if(blockEl) _handleColumnFilter(container, moduleId, blockEl.getAttribute('data-block-id'));
    }
  };
  container.addEventListener('change', container._hmChange);
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
      // Check slots
      if(blocks[j].slots){
        var slots = blocks[j].slots;
        var slotKeys = Object.keys(slots);
        for(var s=0;s<slotKeys.length;s++){
          var children = slots[slotKeys[s]]||[];
          for(var c=0;c<children.length;c++){
            if(children[c].id===blockId) return children[c];
          }
        }
      }
    }
  }
  return null;
}

/* ── Render Block ────────────────────────────────────────────────────── */

function renderBlock(block, data, state){
  if(!block) return '';
  var blockClasses = getBlockClasses(block);
  if(block.visible===false) blockClasses += ' hm-block-hidden';
  return _renderBlockWrapper(block, data, state, blockClasses, null);
}

function _renderBlockInner(block, data, state, reactiveCtx){
  var config = block.config || {};

  // Resolve bindings in config if reactive context available
  var resolvedConfig = config;
  if(reactiveCtx){
    try { resolvedConfig = _resolveConfigBindings(config, reactiveCtx); } catch(e){ /* fallback */ }
  }

  switch(block.type){
    case 'kpi-row':         return renderKpiRow(resolvedConfig, data);
    case 'data-table':      return renderAdvancedTableV3(resolvedConfig, data, state, block.id, reactiveCtx);
    case 'filter-bar':      return renderFilterBar(resolvedConfig, data);
    case 'section-header':  return renderSectionHeader(resolvedConfig);
    case 'spacer':          return '<div style="height:'+(resolvedConfig.height||16)+'px"></div>';
    case 'info-banner':     return renderInfoBanner(resolvedConfig);
    case 'chart-bar':       return renderBarChart(resolvedConfig, data);
    case 'chart-donut':     return renderDonutChart(resolvedConfig, data);
    case 'action-toolbar':  return renderToolbar(resolvedConfig, data);
    case 'data-cards':      return renderCardGrid(resolvedConfig, data);
    case 'data-timeline':   return renderTimeline(resolvedConfig, data);
    case 'form-standard':   return renderFormStandard(resolvedConfig, data);
    case 'two-column':      return renderTwoColumn(block, data, state);
    case 'card-container':  return renderCardContainer(block, data, state);
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

/* --- Advanced Data Table v3 (TanStack-inspired) --- */
function renderAdvancedTableV3(config, data, state, blockId, reactiveCtx){
  var columns = config.columns || [];
  var dataKey = config.dataKey || 'items';
  var allRows = (data && (Array.isArray(data) ? data : data[dataKey])) || [];

  if(!columns.length) return '<div class="hm-empty">'+_t('Chua cau hinh cot','No columns configured')+'</div>';

  // Get or init table state
  var moduleId = state && state._schema ? state._schema.moduleId : '_';
  var ms = getModuleState(moduleId);
  if(!ms.tableStates[blockId]){
    ms.tableStates[blockId] = {
      sortCol: null,
      sortDir: null,
      sortStack: [],       // multi-column sort
      filters: {},
      page: 1,
      pageSize: config.pageSize||20,
      columnWidths: {},
      pinnedLeft: [],
      pinnedRight: [],
    };
  }
  var ts = ms.tableStates[blockId];

  // Column visibility
  if(!ms.columnVisibility[blockId]){
    ms.columnVisibility[blockId] = {};
    columns.forEach(function(col){ ms.columnVisibility[blockId][col.key] = true; });
  }
  var colVis = ms.columnVisibility[blockId];

  // Filter visible columns
  var visibleColumns = columns.filter(function(col){
    return colVis[col.key] !== false;
  });

  // Apply computed columns (formula engine)
  var processedRows = _applyComputedColumns(columns, allRows, reactiveCtx || {});

  // Apply column filters
  var rows = processedRows;
  visibleColumns.forEach(function(col){
    var fv = ts.filters[col.key];
    if(fv && fv !== ''){
      if(col.filterType === 'number-range'){
        // fv = { min: X, max: Y }
        if(typeof fv === 'object'){
          rows = rows.filter(function(r){
            var v = Number(r[col.key]);
            if(isNaN(v)) return false;
            if(fv.min != null && v < Number(fv.min)) return false;
            if(fv.max != null && v > Number(fv.max)) return false;
            return true;
          });
        }
      } else if(col.filterType === 'date-range'){
        if(typeof fv === 'object'){
          rows = rows.filter(function(r){
            var d = r[col.key] ? String(r[col.key]).slice(0,10) : '';
            if(!d) return false;
            if(fv.from && d < fv.from) return false;
            if(fv.to && d > fv.to) return false;
            return true;
          });
        }
      } else if(col.filterType === 'boolean'){
        rows = rows.filter(function(r){
          return String(!!r[col.key]) === String(fv);
        });
      } else {
        rows = rows.filter(function(r){
          var cell = String(r[col.key]||'').toLowerCase();
          return cell.indexOf(String(fv).toLowerCase()) >= 0;
        });
      }
    }
  });

  // Apply multi-column sort
  if(ts.sortStack && ts.sortStack.length){
    rows = rows.slice().sort(function(a,b){
      for(var si=0; si<ts.sortStack.length; si++){
        var sk = ts.sortStack[si].col;
        var dir = ts.sortStack[si].dir === 'desc' ? -1 : 1;
        var va = a[sk], vb = b[sk];
        if(va==null) va = '';
        if(vb==null) vb = '';
        var cmp = 0;
        if(typeof va==='number' && typeof vb==='number') cmp = (va-vb)*dir;
        else cmp = String(va).localeCompare(String(vb),'vi')*dir;
        if(cmp !== 0) return cmp;
      }
      return 0;
    });
  } else if(ts.sortCol){
    // Single column sort (backward compat)
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

  // Aggregation calculations
  var aggregations = _computeAggregations(visibleColumns, rows);

  // Empty state
  if(!allRows.length){
    return '<div class="hm-empty"><div class="hm-empty-icon">&#128203;</div><div>'+_t('Khong co du lieu','No data')+'</div></div>';
  }

  // Build table HTML
  var html = '';

  // Toolbar: column toggle + export
  html += '<div class="hm-table-toolbar">';
  // Column visibility dropdown
  html += '<div class="hm-dropdown">';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs">&#9776; '+_t('Cot','Columns')+'</button>';
  html += '<div class="hm-dropdown-content">';
  columns.forEach(function(col){
    var checked = colVis[col.key] !== false ? ' checked' : '';
    html += '<label class="hm-dropdown-item"><input type="checkbox" data-action="hm-table-col-toggle" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'"'+checked+'> '+_esc(_t(col.label||col.key, col.labelEn||col.key))+'</label>';
  });
  html += '</div></div>';
  // Export buttons
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="csv" title="CSV">&#128196; CSV</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="json" title="JSON">{ } JSON</button>';
  html += '<button class="hm-btn hm-btn-ghost hm-btn-xs" data-action="hm-table-export" data-block-id="'+_esc(blockId)+'" data-format="clipboard" title="'+_t('Sao chep','Copy')+'">&#128203; '+_t('Sao chep','Copy')+'</button>';
  // Row count
  html += '<span class="hm-table-rowcount">'+_fmt(totalRows)+' '+_t('dong','rows')+'</span>';
  html += '</div>';

  // Table
  html += '<div class="hm-table-wrapper" style="overflow-x:auto;position:relative">';

  // Loading skeleton overlay
  if(ms.loading[blockId]){
    html += '<div class="hm-table-loading-overlay"><div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div><div class="hm-skeleton-line"></div></div></div>';
  }

  html += '<table class="hm-table hm-table-advanced">';

  // Column headers with sort (supports multi-sort via shift+click)
  html += '<thead><tr>';

  // Row selection checkbox column
  if(config.selectable){
    var allSelected = pageRows.length > 0 && pageRows.every(function(r,i){ return ms.selectedRows[blockId] && ms.selectedRows[blockId][startIdx+i]; });
    html += '<th style="width:36px;text-align:center"><input type="checkbox" data-action="hm-table-select-all" data-block-id="'+_esc(blockId)+'"'+(allSelected?' checked':'')+'></th>';
  }

  // Row expansion column
  if(config.expandable){
    html += '<th style="width:36px"></th>';
  }

  visibleColumns.forEach(function(col){
    // Sort indicators (supports multi-sort)
    var sortIndicator = '';
    var sortIdx = -1;
    if(ts.sortStack){
      for(var si=0;si<ts.sortStack.length;si++){
        if(ts.sortStack[si].col===col.key){ sortIdx=si; break; }
      }
    }
    if(sortIdx >= 0){
      sortIndicator = ts.sortStack[sortIdx].dir==='asc' ? ' &#9650;' : ' &#9660;';
      if(ts.sortStack.length > 1) sortIndicator += '<sup>'+(sortIdx+1)+'</sup>';
    } else if(ts.sortCol===col.key){
      sortIndicator = ts.sortDir==='asc' ? ' &#9650;' : ' &#9660;';
    }

    var align = col.type==='number' || col.type==='currency' || col.type==='percentage' ? 'text-align:right' : '';
    var width = ts.columnWidths[col.key] ? 'width:'+ts.columnWidths[col.key]+'px;' : (col.width ? 'width:'+col.width+';' : '');
    var minW = col.minWidth ? 'min-width:'+col.minWidth+';' : '';
    var pinCls = '';
    if(ts.pinnedLeft.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-left';
    if(ts.pinnedRight.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-right';

    html += '<th class="hm-th-sortable'+pinCls+'" style="'+align+width+minW+'cursor:pointer;user-select:none;position:relative" data-action="hm-table-sort" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'">';
    html += _esc(_t(col.label||col.key, col.labelEn||col.key));
    html += '<span class="hm-sort-indicator">'+sortIndicator+'</span>';
    // Resize handle
    html += '<span class="hm-col-resize" data-col="'+_esc(col.key)+'" data-block-id="'+_esc(blockId)+'" style="position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize"></span>';
    html += '</th>';
  });
  html += '</tr>';

  // Column filter row
  html += '<tr class="hm-table-filter-row">';
  if(config.selectable) html += '<th></th>';
  if(config.expandable) html += '<th></th>';

  visibleColumns.forEach(function(col){
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
    } else if(col.filterType==='number-range'){
      var minVal = (typeof fv==='object' && fv.min!=null) ? fv.min : '';
      var maxVal = (typeof fv==='object' && fv.max!=null) ? fv.max : '';
      html += '<th style="display:flex;gap:2px"><input type="number" class="hm-input hm-input-xs" placeholder="Min" data-table-filter="'+_esc(col.key)+'_min" value="'+_esc(minVal)+'" style="width:50%">';
      html += '<input type="number" class="hm-input hm-input-xs" placeholder="Max" data-table-filter="'+_esc(col.key)+'_max" value="'+_esc(maxVal)+'" style="width:50%"></th>';
    } else if(col.filterType==='date-range'){
      var fromVal = (typeof fv==='object' && fv.from) ? fv.from : '';
      var toVal = (typeof fv==='object' && fv.to) ? fv.to : '';
      html += '<th style="display:flex;gap:2px"><input type="date" class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'_from" value="'+_esc(fromVal)+'" style="width:50%">';
      html += '<input type="date" class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'_to" value="'+_esc(toVal)+'" style="width:50%"></th>';
    } else if(col.filterType==='boolean'){
      html += '<th><select class="hm-input hm-input-xs" data-table-filter="'+_esc(col.key)+'">';
      html += '<option value="">'+_t('Tat ca','All')+'</option>';
      html += '<option value="true"'+(fv==='true'?' selected':'')+'>'+_t('Co','Yes')+'</option>';
      html += '<option value="false"'+(fv==='false'?' selected':'')+'>'+_t('Khong','No')+'</option>';
      html += '</select></th>';
    } else {
      html += '<th><input type="text" class="hm-input hm-input-xs" placeholder="'+_t('Loc...','Filter...')+'" data-table-filter="'+_esc(col.key)+'" value="'+_esc(typeof fv==='string'?fv:'')+'"></th>';
    }
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  if(!pageRows.length){
    var colspan = visibleColumns.length + (config.selectable?1:0) + (config.expandable?1:0);
    html += '<tr><td colspan="'+colspan+'" class="hm-empty">'+_t('Khong tim thay','No results found')+'</td></tr>';
  }

  pageRows.forEach(function(row, ri){
    var absIdx = startIdx + ri;
    var rowAction = config.rowAction ? ' data-action="'+_esc(config.rowAction)+'"' : '';
    var rowSelected = ms.selectedRows[blockId] && ms.selectedRows[blockId][absIdx];
    html += '<tr class="hm-table-row'+(rowSelected?' hm-row-selected':'')+'" data-row-idx="'+ri+'"'+rowAction+' style="cursor:'+(config.rowAction?'pointer':'default')+'">';

    // Selection checkbox
    if(config.selectable){
      html += '<td style="text-align:center"><input type="checkbox" data-action="hm-table-select-row" data-block-id="'+_esc(blockId)+'" data-row="'+absIdx+'"'+(rowSelected?' checked':'')+'></td>';
    }

    // Expansion toggle
    if(config.expandable){
      var isExpanded = ms.expandedRows[blockId] && ms.expandedRows[blockId][absIdx];
      html += '<td style="text-align:center;cursor:pointer" data-action="hm-table-expand-row" data-block-id="'+_esc(blockId)+'" data-row="'+absIdx+'">'+(isExpanded?'&#9660;':'&#9654;')+'</td>';
    }

    visibleColumns.forEach(function(col){
      var val = row[col.key]!=null ? row[col.key] : '';
      var align = (col.type==='number'||col.type==='currency'||col.type==='percentage') ? 'text-align:right;font-variant-numeric:tabular-nums' : '';
      var editable = col.editable ? ' hm-cell-editable' : '';
      var pinCls = '';
      if(ts.pinnedLeft.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-left';
      if(ts.pinnedRight.indexOf(col.key)>=0) pinCls = ' hm-col-pinned-right';

      html += '<td class="'+pinCls+editable+'" style="'+align+'" data-col="'+_esc(col.key)+'" data-row-idx="'+ri+'">';
      html += _formatCellValue(val, col, row);
      html += '</td>';
    });
    html += '</tr>';

    // Expanded row detail
    if(config.expandable && ms.expandedRows[blockId] && ms.expandedRows[blockId][absIdx]){
      var expandColspan = visibleColumns.length + (config.selectable?1:0) + 1;
      html += '<tr class="hm-row-expanded"><td colspan="'+expandColspan+'">';
      if(config.expandTemplate){
        html += resolveBindings(config.expandTemplate, Object.assign({}, reactiveCtx||{}, { row:row }));
      } else {
        // Default: show all fields as key-value
        html += '<div class="hm-row-detail">';
        Object.keys(row).forEach(function(k){
          html += '<div class="hm-detail-field"><strong>'+_esc(k)+':</strong> '+_esc(String(row[k]!=null?row[k]:''))+'</div>';
        });
        html += '</div>';
      }
      html += '</td></tr>';
    }
  });
  html += '</tbody>';

  // Aggregation footer
  if(_hasAggregations(visibleColumns)){
    html += '<tfoot><tr class="hm-table-footer">';
    if(config.selectable) html += '<td></td>';
    if(config.expandable) html += '<td></td>';
    visibleColumns.forEach(function(col){
      if(col.aggregate && aggregations[col.key] != null){
        var aggLabel = col.aggregate.toUpperCase();
        var aggVal = aggregations[col.key];
        if(typeof aggVal === 'number') aggVal = _fmt(Math.round(aggVal*100)/100);
        html += '<td style="font-weight:600;'+(col.type==='number'||col.type==='currency'?'text-align:right':'')+'"><small>'+aggLabel+':</small> '+_esc(String(aggVal))+'</td>';
      } else {
        html += '<td></td>';
      }
    });
    html += '</tr></tfoot>';
  }

  html += '</table></div>';

  // Pagination bar
  html += '<div class="hm-table-pagination">';
  html += '<span class="hm-table-info">'+_t('Hien thi','Showing')+' '+(totalRows>0?startIdx+1:0)+'-'+Math.min(startIdx+ts.pageSize, totalRows)+' / '+totalRows+'</span>';
  html += '<span class="hm-table-page-controls">';
  // Page size selector
  html += '<select class="hm-input hm-input-xs" data-action="hm-table-pagesize" data-block-id="'+_esc(blockId)+'">';
  [10,20,50,100,200].forEach(function(ps){
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

/** Format a cell value based on column type */
function _formatCellValue(val, col, row){
  switch(col.type){
    case 'badge':
      return '<span class="hm-badge hm-badge-'+_esc(String(val))+'">'+_esc(String(val))+'</span>';
    case 'number':
      return _esc(typeof val==='number'?_fmt(val):String(val));
    case 'currency':
      var num = typeof val==='number' ? val : parseFloat(val);
      if(isNaN(num)) return _esc(String(val));
      return _esc(_fmt(Math.round(num)))+(col.currencySuffix||'');
    case 'date':
      return _esc(val ? String(val).slice(0,10) : '');
    case 'percentage':
      var pct = typeof val==='number' ? val : parseFloat(val);
      if(isNaN(pct)) return _esc(String(val));
      return '<div class="hm-pct-cell"><span>'+Math.round(pct)+'%</span><div class="hm-pct-bar" style="width:'+Math.min(100,Math.max(0,pct))+'%;background:'+(pct>=90?'var(--green,#16a34a)':pct>=70?'var(--amber,#d97706)':'var(--red,#dc2626)')+'"></div></div>';
    case 'progress':
      var p = Number(val)||0;
      return progressBar(p, 100);
    case 'boolean':
      return val ? '<span class="hm-bool-true">&#10003;</span>' : '<span class="hm-bool-false">&#10007;</span>';
    case 'link':
      return '<a href="'+_esc(String(val))+'" class="hm-link" target="_blank">'+_esc(col.linkText||String(val))+'</a>';
    case 'image':
      return val ? '<img src="'+_esc(String(val))+'" class="hm-cell-img" alt="">' : '';
    default:
      var text = _esc(String(val));
      if(col.suffix) text += _esc(col.suffix);
      if(col.prefix) text = _esc(col.prefix) + text;
      return text;
  }
}

/** Compute aggregation values for footer */
function _computeAggregations(columns, rows){
  var aggs = {};
  columns.forEach(function(col){
    if(!col.aggregate) return;
    var vals = rows.map(function(r){ return Number(r[col.key]); }).filter(function(v){ return !isNaN(v); });
    switch(col.aggregate){
      case 'sum':
        aggs[col.key] = vals.reduce(function(a,b){ return a+b; }, 0);
        break;
      case 'avg':
        aggs[col.key] = vals.length ? vals.reduce(function(a,b){ return a+b; }, 0) / vals.length : 0;
        break;
      case 'count':
        aggs[col.key] = rows.length;
        break;
      case 'min':
        aggs[col.key] = vals.length ? Math.min.apply(null, vals) : 0;
        break;
      case 'max':
        aggs[col.key] = vals.length ? Math.max.apply(null, vals) : 0;
        break;
      default:
        aggs[col.key] = null;
    }
  });
  return aggs;
}

function _hasAggregations(columns){
  return columns.some(function(c){ return !!c.aggregate; });
}

/* --- Inline Cell Editing --- */
function _startInlineEdit(container, moduleId, cell){
  var colKey = cell.getAttribute('data-col');
  var rowIdx = parseInt(cell.getAttribute('data-row-idx'),10);
  if(!colKey || isNaN(rowIdx)) return;

  var currentVal = cell.textContent.trim();
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'hm-input hm-input-xs hm-inline-edit-input';
  input.value = currentVal;
  input.style.cssText = 'width:100%;box-sizing:border-box';

  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  function commit(){
    var newVal = input.value;
    cell.textContent = newVal;
    // Store edit in state
    var ms = getModuleState(moduleId);
    if(!ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')]){
      ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')] = {};
    }
    ms.inlineEdits[cell.closest('.hm-block').getAttribute('data-block-id')][rowIdx+'_'+colKey] = newVal;
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){ input.value = currentVal; input.blur(); }
  });
}

/* --- Row Selection --- */
function _handleRowSelect(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowIdx = parseInt(btn.getAttribute('data-row'),10);
  var ms = getModuleState(moduleId);
  if(!ms.selectedRows[blockId]) ms.selectedRows[blockId] = {};
  ms.selectedRows[blockId][rowIdx] = btn.checked;
}

function _handleSelectAll(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  if(!ms.selectedRows[blockId]) ms.selectedRows[blockId] = {};
  var startIdx = (ts.page - 1) * ts.pageSize;
  for(var i = startIdx; i < startIdx + ts.pageSize; i++){
    ms.selectedRows[blockId][i] = btn.checked;
  }
  // Update individual checkboxes
  var container = btn.closest('.hm-block');
  if(container){
    container.querySelectorAll('input[data-action="hm-table-select-row"]').forEach(function(cb){
      cb.checked = btn.checked;
    });
  }
}

/* --- Row Expansion --- */
function _handleRowExpand(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var rowIdx = parseInt(btn.getAttribute('data-row'),10);
  var ms = getModuleState(moduleId);
  if(!ms.expandedRows[blockId]) ms.expandedRows[blockId] = {};
  ms.expandedRows[blockId][rowIdx] = !ms.expandedRows[blockId][rowIdx];
  renderModuleFromSchema(container.closest('[data-module]') || container, ms._schema);
}

/* --- Column Toggle --- */
function _handleColumnToggle(container, moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var colKey = btn.getAttribute('data-col');
  var ms = getModuleState(moduleId);
  if(!ms.columnVisibility[blockId]) ms.columnVisibility[blockId] = {};
  ms.columnVisibility[blockId][colKey] = btn.checked;
  renderModuleFromSchema(container.closest('[data-module]') || container, ms._schema);
}

/* --- Table Export --- */
function _handleTableExport(moduleId, btn){
  var blockId = btn.getAttribute('data-block-id');
  var format = btn.getAttribute('data-format') || 'csv';
  var ms = getModuleState(moduleId);
  var schema = ms._schema;
  if(!schema) return;

  var block = _findBlockById(schema, blockId);
  if(!block) return;
  var config = block.config || {};
  var columns = config.columns || [];
  var dataKey = config.dataKey || 'items';
  var data = ms.blockData[blockId];
  var allRows = (data && (Array.isArray(data) ? data : data[dataKey])) || [];

  // Apply computed columns
  var rows = _applyComputedColumns(columns, allRows, _buildReactiveContext(moduleId));

  // Filter visible columns
  var colVis = ms.columnVisibility[blockId] || {};
  var visCols = columns.filter(function(c){ return colVis[c.key] !== false; });

  if(format === 'csv'){
    var csvLines = [];
    // Header
    csvLines.push(visCols.map(function(c){ return '"'+_t(c.label||c.key, c.labelEn||c.key).replace(/"/g,'""')+'"'; }).join(','));
    // Rows
    rows.forEach(function(row){
      csvLines.push(visCols.map(function(c){
        var v = row[c.key]!=null ? String(row[c.key]) : '';
        return '"'+v.replace(/"/g,'""')+'"';
      }).join(','));
    });
    _downloadText(csvLines.join('\n'), 'export.csv', 'text/csv');
  } else if(format === 'json'){
    var jsonData = rows.map(function(row){
      var obj = {};
      visCols.forEach(function(c){ obj[c.key] = row[c.key]; });
      return obj;
    });
    _downloadText(JSON.stringify(jsonData, null, 2), 'export.json', 'application/json');
  } else if(format === 'clipboard'){
    var lines = [];
    lines.push(visCols.map(function(c){ return _t(c.label||c.key, c.labelEn||c.key); }).join('\t'));
    rows.forEach(function(row){
      lines.push(visCols.map(function(c){ return row[c.key]!=null ? String(row[c.key]) : ''; }).join('\t'));
    });
    _copyToClipboard(lines.join('\n'));
    toast(_t('Da sao chep '+rows.length+' dong','Copied '+rows.length+' rows'), 'success');
  }
}

function _downloadText(text, filename, mime){
  var blob = new Blob(['\uFEFF'+text], { type: mime+';charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

/* --- v2 backward-compatible table renderer (delegates to v3) --- */
function renderAdvancedTable(config, data, state, blockId){
  return renderAdvancedTableV3(config, data, state, blockId, null);
}

/* --- Table event handlers --- */
function _handleTableSort(container, moduleId, btn){
  var col = btn.getAttribute('data-col');
  var blockId = btn.getAttribute('data-block-id') || btn.closest('.hm-block').getAttribute('data-block-id');
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;

  // Check if shift key was held (multi-sort)
  var shiftHeld = btn._hmShift || false;

  if(shiftHeld && ts.sortStack){
    // Multi-column sort
    var existing = -1;
    for(var i=0;i<ts.sortStack.length;i++){
      if(ts.sortStack[i].col===col){ existing=i; break; }
    }
    if(existing >= 0){
      var entry = ts.sortStack[existing];
      if(entry.dir === 'asc') entry.dir = 'desc';
      else if(entry.dir === 'desc') ts.sortStack.splice(existing, 1);
    } else {
      ts.sortStack.push({ col:col, dir:'asc' });
    }
    // Sync single-sort fields
    ts.sortCol = ts.sortStack.length ? ts.sortStack[0].col : null;
    ts.sortDir = ts.sortStack.length ? ts.sortStack[0].dir : null;
  } else {
    // Single column sort (original behavior)
    if(ts.sortCol===col){
      ts.sortDir = ts.sortDir==='asc' ? 'desc' : ts.sortDir==='desc' ? null : 'asc';
      if(!ts.sortDir) ts.sortCol = null;
    } else {
      ts.sortCol = col; ts.sortDir = 'asc';
    }
    // Sync multi-sort
    if(ts.sortCol){
      ts.sortStack = [{ col:ts.sortCol, dir:ts.sortDir }];
    } else {
      ts.sortStack = [];
    }
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
  var ms = getModuleState(moduleId);
  invalidateCache();
  renderModuleFromSchema(container, ms._schema);
}

function _handleColumnFilter(container, moduleId, blockId){
  var ms = getModuleState(moduleId);
  var ts = ms.tableStates[blockId];
  if(!ts) return;
  var blockEl = container.querySelector('[data-block-id="'+blockId+'"]');
  if(!blockEl) return;
  ts.filters = {};
  blockEl.querySelectorAll('[data-table-filter]').forEach(function(el){
    var k = el.getAttribute('data-table-filter');
    var v = el.value;

    // Handle range filters (min/max, from/to)
    if(k.match(/_min$/) || k.match(/_max$/)){
      var baseKey = k.replace(/_min$|_max$/, '');
      if(!ts.filters[baseKey]) ts.filters[baseKey] = {};
      if(k.match(/_min$/)) ts.filters[baseKey].min = v || null;
      else ts.filters[baseKey].max = v || null;
    } else if(k.match(/_from$/) || k.match(/_to$/)){
      var baseKey2 = k.replace(/_from$|_to$/, '');
      if(!ts.filters[baseKey2]) ts.filters[baseKey2] = {};
      if(k.match(/_from$/)) ts.filters[baseKey2].from = v || null;
      else ts.filters[baseKey2].to = v || null;
    } else {
      if(v) ts.filters[k] = v;
    }
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

function _duplicateBlock(moduleId, tabKey, blockId){
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;
  var idx = tab.blocks.findIndex(function(b){ return b.id===blockId; });
  if(idx < 0) return;
  var original = tab.blocks[idx];
  var dup = _clone(original);
  dup.id = _uid();
  if(dup.title){
    if(typeof dup.title === 'object'){
      if(dup.title.vi) dup.title.vi += ' (ban sao)';
      if(dup.title.en) dup.title.en += ' (copy)';
    }
  }
  tab.blocks.splice(idx+1, 0, dup);
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

function _addBlockFromTemplate(moduleId, tabKey, afterBlockId, templateKey){
  var tpl = BLOCK_TEMPLATES[templateKey];
  if(!tpl) return;
  var schema = getModuleState(moduleId)._schema;
  if(!schema) return;
  var tab = schema.tabs.find(function(t){ return t.tabId===tabKey; });
  if(!tab) return;

  var newBlock = _clone(tpl);
  newBlock.id = _uid();
  newBlock.visible = true;

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
    case 'kpi-row':        return { items:[] };
    case 'data-table':     return { columns:[], dataKey:'items', pageSize:20 };
    case 'filter-bar':     return { filters:[] };
    case 'chart-bar':      return { dataKey:'items', items:[] };
    case 'chart-donut':    return { dataKey:'items', items:[] };
    case 'data-cards':     return { dataKey:'items', columns:3 };
    case 'form-standard':  return { fields:[], columns:2 };
    case 'section-header': return { text:'', textEn:'', level:'h3' };
    case 'info-banner':    return { text:'', textEn:'', type:'info' };
    case 'action-toolbar': return { buttons:[] };
    case 'spacer':         return { height:16 };
    case 'two-column':     return { ratio:'50-50' };
    case 'card-container': return {};
    default:               return {};
  }
}

/* ── Block Library Popup ─────────────────────────────────────────────── */

function showBlockLibrary(callback){
  var overlay = document.createElement('div');
  overlay.className = 'hm-modal-overlay';

  var modal = document.createElement('div');
  modal.className = 'hm-modal hm-block-library';

  var html = '<div class="hm-modal-header">';
  html += '<h3 class="hm-modal-title">'+_t('Thu vien block','Block Library')+'</h3>';
  html += '<button class="hm-modal-close" data-action="close">&times;</button>';
  html += '</div>';
  html += '<div class="hm-modal-body">';

  // Block catalog (by category)
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

  // Templates section
  var templateKeys = Object.keys(BLOCK_TEMPLATES);
  if(templateKeys.length){
    html += '<div class="hm-lib-category">';
    html += '<h4 class="hm-lib-cat-title" style="color:#6366f1">'+_t('Mau co san','Templates')+'</h4>';
    html += '<div class="hm-lib-grid">';
    templateKeys.forEach(function(key){
      var tpl = BLOCK_TEMPLATES[key];
      var catInfo = BLOCK_CATALOG[tpl.type];
      html += '<div class="hm-lib-item hm-lib-template" data-template="'+_esc(key)+'">';
      html += '<span class="hm-lib-icon">'+(catInfo?catInfo.icon:'&#128230;')+'</span>';
      html += '<span class="hm-lib-name">'+_esc(key)+'</span>';
      html += '<span class="hm-lib-desc">'+_esc(_t(tpl.title?tpl.title.vi||'':'', tpl.title?tpl.title.en||'':''))+'</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

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
    var tplItem = e.target.closest('[data-template]');
    if(tplItem){
      var tplKey = tplItem.getAttribute('data-template');
      close();
      // Add template block
      if(_currentModuleId){
        var ms = getModuleState(_currentModuleId);
        pushUndo(_currentModuleId, 'add-template', ms._schema);
        _addBlockFromTemplate(_currentModuleId, ms.activeTab, null, tplKey);
        if(_currentContainer && ms._schema) renderModuleFromSchema(_currentContainer, ms._schema);
      }
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

  // Conditional visibility
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Dieu kien hien thi','Visible When')+'</label>';
  html += '<input class="hm-input hm-input-sm" id="hm-prop-visible-when" value="'+_esc(block.visibleWhen||'')+'" placeholder="{{ expression }}">';
  html += '<small class="hm-hint">'+_t('VD: {{ state.activeTab === &quot;overview&quot; }}','E.g.: {{ state.activeTab === &quot;overview&quot; }}')+'</small>';
  html += '</div>';

  // Variant
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Kieu hien thi','Variant')+'</label>';
  html += '<select class="hm-input hm-select hm-input-sm" id="hm-prop-variant">';
  ['default','compact','spacious','mobile'].forEach(function(v){
    var sel = (block.config && block.config.variant === v) ? ' selected' : (!block.config||!block.config.variant) && v==='default' ? ' selected' : '';
    html += '<option value="'+v+'"'+sel+'>'+v+'</option>';
  });
  html += '</select>';
  html += '</div>';

  // Color scheme
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Phoi mau','Color Scheme')+'</label>';
  html += '<select class="hm-input hm-select hm-input-sm" id="hm-prop-color-scheme">';
  ['light','dark','brand','transparent'].forEach(function(v){
    var sel = (block.config && block.config.colorScheme === v) ? ' selected' : (!block.config||!block.config.colorScheme) && v==='light' ? ' selected' : '';
    html += '<option value="'+v+'"'+sel+'>'+v+'</option>';
  });
  html += '</select>';
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

  // Events section
  html += '<div class="hm-form-group">';
  html += '<label class="hm-label">'+_t('Su kien','Events')+'</label>';
  html += '<small class="hm-hint">'+_t('Cau hinh su kien qua JSON','Configure events via JSON')+'</small>';
  html += '<textarea class="hm-input hm-textarea hm-input-sm" id="hm-prop-events" rows="4" placeholder=\'{"onClick":{"type":"navigate","tab":"detail"}}\'>';
  html += _esc(block.events ? JSON.stringify(block.events, null, 2) : '');
  html += '</textarea>';
  html += '</div>';

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
    if(c.formula) html += '<small class="hm-hint">fx: '+_esc(c.formula)+'</small>';
    if(c.aggregate) html += '<small class="hm-hint">agg: '+_esc(c.aggregate)+'</small>';
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
  _moduleLayouts[moduleId] = _clone(layout);
}

function getModuleLayout(moduleId){
  var base = _moduleLayouts[moduleId];
  if(!base) return null;
  return _applyOverrides(moduleId, _clone(base));
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

  // Block renderers (v2 compat)
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

  // v3 Block renderers
  renderAdvancedTableV3: renderAdvancedTableV3,
  renderTwoColumn: renderTwoColumn,
  renderCardContainer: renderCardContainer,

  // Properties
  renderPropertiesPanel: renderPropertiesPanel,

  // Reactive data binding (v3)
  evaluateExpression: evaluateExpression,
  resolveBindings: resolveBindings,
  evaluateFormula: evaluateFormula,

  // Conditional visibility (v3)
  isBlockVisible: isBlockVisible,

  // Event system (v3)
  executeEvent: executeEvent,
  EVENT_TYPES: EVENT_TYPES,

  // Undo/redo (v3)
  undo: undo,
  redo: redo,
  pushUndo: pushUndo,

  // Drag-drop (v3)
  initDragDrop: initDragDrop,

  // Dependency graph (v3)
  buildDependencyGraph: buildDependencyGraph,
  refreshDependents: refreshDependents,

  // Block templates (v3)
  BLOCK_TEMPLATES: BLOCK_TEMPLATES,

  // Theme (v3)
  getBlockClasses: getBlockClasses,

  // Keyboard shortcuts (v3)
  SHORTCUTS: SHORTCUTS,

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

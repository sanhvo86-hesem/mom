/* ============================================================================
   HESEM QMS — Module Builder v1.0
   Trang trắng: Người dùng xây module từ đầu bằng block library.
   Click "➕ Tạo Module mới" trên sidebar → vào đây.
   ============================================================================ */
(function(){
'use strict';

var BE = window.HmBlockEngine || {};
var MR = window.HmModuleRouter || {};
function _t(vi,en){ return BE._t ? BE._t(vi,en) : vi; }
function _esc(v){ return BE._esc ? BE._esc(v) : String(v==null?'':v); }
function _uid(){ return 'blk-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function _clone(obj){ return obj == null ? obj : JSON.parse(JSON.stringify(obj)); }
function _isObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
function _mergeDeep(target, source){
  target = target || {};
  Object.keys(source || {}).forEach(function(key){
    var value = source[key];
    if(Array.isArray(value)){
      target[key] = _clone(value);
    } else if(_isObject(value)){
      if(!_isObject(target[key])) target[key] = {};
      _mergeDeep(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
}
function _getByPath(obj, path){
  var parts = (path || '').split('.');
  var ctx = obj;
  var i;
  for(i = 0; i < parts.length; i++){
    if(!parts[i]) continue;
    if(ctx == null) return undefined;
    ctx = ctx[parts[i]];
  }
  return ctx;
}
function _setByPath(obj, path, value){
  var parts = (path || '').split('.');
  var ctx = obj;
  var i;
  for(i = 0; i < parts.length - 1; i++){
    if(!parts[i]) continue;
    if(!_isObject(ctx[parts[i]]) && !Array.isArray(ctx[parts[i]])) ctx[parts[i]] = {};
    ctx = ctx[parts[i]];
  }
  if(parts.length) ctx[parts[parts.length - 1]] = value;
}
function _deleteByPath(obj, path){
  var parts = (path || '').split('.');
  var ctx = obj;
  var i;
  for(i = 0; i < parts.length - 1; i++){
    if(!ctx || ctx[parts[i]] == null) return;
    ctx = ctx[parts[i]];
  }
  if(ctx && parts.length) delete ctx[parts[parts.length - 1]];
}

var ICONS = ['📦','📋','🏭','🔴','🚚','💰','📊','⚙','🔍','📱','🎯','💡','🔒','🤖','⚡','📝','🌐','🔗','🔄','📈'];

/* ── State ────────────────────────────────────────────────────────────────── */
var state = {
  container: null,
  step: 'setup',        // 'setup' | 'build' | 'preview'
  schema: null,          // The module schema being built
  activeTab: null,
  selectedBlock: null,   // Block being configured in properties panel
  showLibrary: false,
  librarySearch: '',
  insertAfter: null,     // blockId to insert after (or null for beginning)
  insertTab: null,       // tabId to insert into
  savedModules: [],      // List of user-created modules
  propsTab: 'general',
  propsDraft: null,
  libraryMode: 'blocks',
  fieldSearch: {},
  fieldFilter: {},
  apiSearch: {},
  packPicker: null,
  showDigitalThreadLinks: true,
  pendingApiSelection: {},
  pendingApiSelectionSeq: 0,
  registries: {
    loading: false,
    loaded: false,
    error: '',
    loadingMessage: '',
    fieldTypes: {},
    statusOptions: {},
    dataFields: {},
    dataFieldsText: '',
    dataFieldsLoading: {},
    computedFormulas: {},
    iotConnectors: {},
    validationRules: {},
    workflows: {},
    domainPacks: {},
    relationMap: {},
    endpointCatalog: {}
  }
};

/* ── Render Entry ─────────────────────────────────────────────────────────── */
function render(container){
  state.container = container;
  _loadSavedModules();
  _paint();
}

function _paint(){
  var c = state.container;
  if(!c) return;

  switch(state.step){
    case 'setup':   c.innerHTML = _renderSetup(); break;
    case 'build':   c.innerHTML = _renderBuilder(); break;
    case 'preview': c.innerHTML = _renderPreview(); break;
  }

  c.onclick = _handleClick;
  c.oninput = _handleInput;
  c.onchange = _handleInput;
}

/* ── STEP 1: SETUP — Tên module, icon, route ─────────────────────────────── */
function _renderSetup(){
  var h = '';

  /* Header */
  h += '<div style="max-width:700px;margin:0 auto;padding:var(--space-8) var(--space-4)">';
  h += '<div style="text-align:center;margin-bottom:var(--space-8)">';
  h += '<div style="font-size:3rem;margin-bottom:var(--space-3)">🧩</div>';
  h += '<h1 style="margin:0;font-size:var(--text-2xl);font-weight:var(--font-bold)">'+_t('Tạo Module Mới','Create New Module')+'</h1>';
  h += '<p style="color:var(--text-secondary);margin-top:var(--space-2)">'+_t('Bắt đầu với trang trắng — thêm blocks, gắn API, xây dựng module theo ý bạn.','Start with a blank page — add blocks, bind APIs, build your module your way.')+'</p>';
  h += '</div>';

  /* Hoặc mở module đã lưu */
  if(state.savedModules.length){
    h += '<div class="hm-card" style="margin-bottom:var(--space-6)">';
    h += '<h3 style="margin:0 0 var(--space-3);font-size:var(--text-md)">'+_t('Modules đã tạo','Your Modules')+'</h3>';
    h += '<div style="display:grid;gap:var(--space-2)">';
    state.savedModules.forEach(function(m){
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer" data-action="open-module" data-id="'+_esc(m.moduleId)+'">';
      h += '<div><span style="font-size:1.2rem;margin-right:var(--space-2)">'+_esc(m.icon||'📦')+'</span><strong>'+_esc(_t(m.title.vi,m.title.en))+'</strong><span style="color:var(--text-secondary);margin-left:var(--space-2);font-size:var(--text-sm)">'+_esc(m.route)+'</span></div>';
      h += '<div style="display:flex;gap:var(--space-2)">';
      h += '<button class="hm-btn hm-btn-primary hm-btn-sm" data-action="open-module" data-id="'+_esc(m.moduleId)+'">'+_t('Mở','Open')+'</button>';
      h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="delete-module" data-id="'+_esc(m.moduleId)+'">🗑</button>';
      h += '</div></div>';
    });
    h += '</div></div>';
    h += '<div style="text-align:center;color:var(--text-tertiary);margin-bottom:var(--space-4)">— '+_t('hoặc tạo mới','or create new')+' —</div>';
  }

  /* Form tạo mới */
  h += '<div class="hm-card">';
  h += '<h3 style="margin:0 0 var(--space-4);font-size:var(--text-lg)">'+_t('Thông tin module','Module Info')+'</h3>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">';

  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Tên module','Module Name')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-name" placeholder="'+_t('Ví dụ: Quản lý đơn hàng','E.g.: Order Management')+'">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label hm-label-required">'+_t('Tên tiếng Anh','English Name')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-name-en" placeholder="E.g.: Order Management">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label">'+_t('Route (URL)','Route (URL)')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-route" placeholder="/my-module" value="/new-module">';
  h += '</div>';

  h += '<div>';
  h += '<label class="hm-label">'+_t('Chọn icon','Choose Icon')+'</label>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">';
  ICONS.forEach(function(icon, i){
    h += '<button class="hm-btn hm-btn-ghost" style="font-size:1.2rem;width:40px;height:40px;padding:0;'+(i===0?'border:2px solid var(--brand-2);':'')+'" data-action="pick-icon" data-icon="'+_esc(icon)+'" id="mb-icon-'+i+'">'+icon+'</button>';
  });
  h += '</div>';
  h += '<input type="hidden" id="mb-icon" value="📦">';
  h += '</div>';

  h += '</div>'; // grid

  /* Tabs khởi tạo */
  h += '<div style="margin-top:var(--space-5)">';
  h += '<label class="hm-label">'+_t('Tabs ban đầu (phân cách bằng dấu phẩy)','Initial Tabs (comma separated)')+'</label>';
  h += '<input type="text" class="hm-input" id="mb-tabs" value="'+_t('Tổng quan, Danh sách, Tạo mới','Overview, List, Create')+'" placeholder="Tab 1, Tab 2, Tab 3">';
  h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-1)">'+_t('Bạn có thể thêm/xóa tabs sau khi tạo','You can add/remove tabs after creation')+'</div>';
  h += '</div>';

  h += '<div style="margin-top:var(--space-6);display:flex;justify-content:flex-end">';
  h += '<button class="hm-btn hm-btn-primary hm-btn-lg" data-action="create-blank">'+_t('🚀 Tạo Module Trắng','🚀 Create Blank Module')+'</button>';
  h += '</div>';

  h += '</div></div>';
  return h;
}

/* ── STEP 2: BUILD — Trang trắng + Edit Mode ─────────────────────────────── */
function _renderBuilder(){
  var schema = state.schema;
  if(!schema) return '<div class="hm-empty">No schema</div>';

  var h = '';

  /* Header */
  h += '<div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 100%);color:#fff;padding:var(--space-4) var(--space-6);border-radius:var(--radius-xl);margin-bottom:var(--space-4);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">';
  h += '<div>';
  h += '<div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.1em;opacity:0.7">MODULE BUILDER</div>';
  h += '<h1 style="margin:var(--space-1) 0 0;font-size:var(--text-xl)">'+_esc(schema.icon||'')+ ' '+_esc(_t(schema.title.vi, schema.title.en))+'</h1>';
  h += '</div>';
  h += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,0.15);color:#fff" data-action="preview-module">👁 '+_t('Xem trước','Preview')+'</button>';
  h += '<button class="hm-btn" style="background:var(--green);color:#fff" data-action="save-module">💾 '+_t('Lưu','Save')+'</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,0.1);color:#fff" data-action="back-setup">← '+_t('Quay lại','Back')+'</button>';
  h += '</div></div>';

  /* Tabs */
  h += '<div class="hm-tabs">';
  (schema.tabs||[]).forEach(function(tab){
    h += '<button class="hm-tab'+(state.activeTab===tab.tabId?' active':'')+'" data-action="switch-tab" data-tab="'+_esc(tab.tabId)+'">';
    h += (tab.icon||'') + ' ' + _esc(_t(tab.title.vi, tab.title.en));
    h += '</button>';
  });
  h += '<button class="hm-tab" style="opacity:0.5;border:1px dashed var(--border)" data-action="add-tab">+ '+_t('Thêm tab','Add Tab')+'</button>';
  h += '</div>';

  /* Active tab content — TRANG TRẮNG với blocks */
  var activeTab = (schema.tabs||[]).find(function(t){ return t.tabId === state.activeTab; });
  if(activeTab){
    h += '<div style="min-height:300px;border:2px dashed var(--border);border-radius:var(--radius-xl);padding:var(--space-4)">';

    var blocks = (activeTab.blocks||[]).sort(function(a,b){ return (a.order||0)-(b.order||0); });

    if(!blocks.length){
      /* Trang trắng — prompt thêm block */
      h += '<div style="text-align:center;padding:var(--space-10)">';
      h += '<div style="font-size:3rem;margin-bottom:var(--space-3);opacity:0.3">📄</div>';
      h += '<h3 style="color:var(--text-secondary);margin:0 0 var(--space-2)">'+_t('Trang trắng','Blank Page')+'</h3>';
      h += '<p style="color:var(--text-tertiary);margin:0 0 var(--space-5);max-width:400px;margin-left:auto;margin-right:auto">'+_t('Bắt đầu xây module bằng cách thêm blocks từ thư viện. Mỗi block là một thành phần UI: bảng dữ liệu, biểu đồ, form, KPI...','Start building by adding blocks from the library. Each block is a UI component: data table, chart, form, KPI...')+'</p>';
      h += '<button class="hm-btn hm-btn-primary hm-btn-lg" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="">➕ '+_t('Thêm Block đầu tiên','Add First Block')+'</button>';
      h += '</div>';
    } else {
      /* Render each block with edit toolbar */
      blocks.forEach(function(block, idx){
        /* Add block button before first block */
        if(idx === 0){
          h += '<div style="display:flex;justify-content:center;padding:var(--space-1)"><button class="hm-btn hm-btn-ghost hm-btn-sm" style="border:1px dashed var(--border);color:var(--text-tertiary);font-size:var(--text-xs)" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="">+ '+_t('Thêm block','Add block')+'</button></div>';
        }

        var isSelected = state.selectedBlock === block.blockId;

        h += '<div style="border:2px solid '+(isSelected?'var(--brand-2)':'var(--border)')+';border-radius:var(--radius-lg);margin-bottom:var(--space-3);overflow:hidden;transition:border-color 0.15s" data-block-wrapper="'+_esc(block.blockId)+'">';

        /* Block toolbar */
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:'+(isSelected?'var(--blue-bg)':'var(--gray-50)')+';border-bottom:1px solid var(--border);font-size:var(--text-xs)">';
        h += '<div style="display:flex;align-items:center;gap:var(--space-2)">';
        h += '<span style="font-weight:var(--font-bold);color:var(--text-secondary)">'+_esc(_getCatalogLabel(block.type))+'</span>';
        if(block.title) h += '<span style="color:var(--text-tertiary)">— '+_esc(_t(block.title.vi||'',block.title.en||''))+'</span>';
        h += '</div>';
        h += '<div style="display:flex;gap:2px">';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-up" data-block="'+_esc(block.blockId)+'" title="▲">▲</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-down" data-block="'+_esc(block.blockId)+'" title="▼">▼</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="config-block" data-block="'+_esc(block.blockId)+'" title="⚙">⚙</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="duplicate-block" data-block="'+_esc(block.blockId)+'" title="📋">📋</button>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="delete-block" data-block="'+_esc(block.blockId)+'" title="🗑">🗑</button>';
        h += '</div></div>';

        /* Block preview */
        h += '<div style="padding:var(--space-3);min-height:60px">';
        h += _renderBlockPreview(block);
        h += '</div>';

        h += '</div>';

        /* Add block button after each block */
        h += '<div style="display:flex;justify-content:center;padding:var(--space-1)"><button class="hm-btn hm-btn-ghost hm-btn-sm" style="border:1px dashed var(--border);color:var(--text-tertiary);font-size:var(--text-xs)" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-after="'+_esc(block.blockId)+'">+ '+_t('Thêm block','Add block')+'</button></div>';
      });
    }

    h += '</div>';
  }

  /* Block Library Sidebar (right panel when open) */
  if(state.showLibrary){
    h += _renderLibraryPanel();
  }

  /* Properties Panel (when block selected) */
  if(state.selectedBlock && !state.showLibrary){
    h += _renderPropertiesPanel();
  }

  return h;
}

/* ── Block Preview (simplified render for builder) ───────────────────────── */
function _renderBlockPreview(block){
  var type = block.type;
  var config = block.config || {};
  var entry = (BE.BLOCK_CATALOG||{})[type] || {};
  var renderType = entry.renderer || type;
  var h = '';
  var previewOverrides = {
    'data-kanban': 'data-kanban',
    'kanban-board': 'data-kanban',
    'data-gantt': 'data-gantt',
    'gantt-board': 'data-gantt',
    'schedule-grid': 'schedule-grid',
    'calendar-board': 'schedule-grid',
    'pivot-table': 'pivot-table',
    'matrix-grid': 'pivot-table',
    'heat-table': 'pivot-table',
    'record-detail': 'record-detail',
    'master-detail': 'record-detail',
    'data-tree': 'data-tree',
    'tree-view': 'data-tree',
    'data-stat-compare': 'data-stat-compare',
    'audit-log': 'audit-log',
    'compliance-log': 'audit-log',
    'chart-line': 'chart-line',
    'chart-area': 'chart-line',
    'chart-radar': 'chart-radar',
    'chart-gauge': 'chart-gauge',
    'chart-waterfall': 'chart-waterfall',
    'chart-scatter': 'chart-scatter',
    'chart-bubble': 'chart-scatter',
    'mfg-machine-status': 'mfg-machine-status',
    'mfg-oee-trend': 'mfg-oee-trend',
    'iot-oee-board': 'mfg-oee-trend',
    'mfg-andon-board': 'mfg-andon-board',
    'mfg-tool-life': 'mfg-tool-life',
    'quality-spc-chart': 'quality-spc-chart',
    'quality-control-chart': 'quality-spc-chart',
    'quality-pareto': 'quality-pareto',
    'quality-capability': 'quality-capability',
    'quality-capa-board': 'quality-capa-board',
    'quality-8d-board': 'quality-capa-board',
    'quality-inspection-form': 'quality-inspection-form',
    'quality-checksheet': 'quality-inspection-form',
    'form-wizard': 'form-wizard',
    'approval-form': 'approval-form',
    'iot-live-trend': 'iot-live-trend',
    'iot-sensor-strip': 'iot-live-trend'
  };
  var i;

  if(previewOverrides[type]) renderType = previewOverrides[type];

  function _pvText(value, valueEn, fallbackVi, fallbackEn){
    if(value && typeof value === 'object'){
      return _esc(_t(value.vi || fallbackVi || '', value.en || fallbackEn || value.vi || fallbackVi || ''));
    }
    if(typeof value === 'string'){
      return _esc(value);
    }
    if(typeof valueEn === 'string' && value){
      return _esc(_t(String(value), valueEn));
    }
    return _esc(_t(fallbackVi || '', fallbackEn || fallbackVi || ''));
  }

  function _pvLabel(def, fallbackVi, fallbackEn){
    if(!def) return _esc(_t(fallbackVi || '', fallbackEn || fallbackVi || ''));
    if(def.label && typeof def.label === 'object'){
      return _esc(_t(def.label.vi || fallbackVi || '', def.label.en || fallbackEn || def.label.vi || fallbackVi || ''));
    }
    if(typeof def.label === 'string'){
      return _esc(_t(def.label, def.labelEn || fallbackEn || def.label));
    }
    if(def.title && typeof def.title === 'object'){
      return _esc(_t(def.title.vi || fallbackVi || '', def.title.en || fallbackEn || def.title.vi || fallbackVi || ''));
    }
    if(typeof def.title === 'string'){
      return _esc(def.title);
    }
    if(typeof def.name === 'string'){
      return _esc(def.name);
    }
    if(typeof def.key === 'string'){
      return _esc(def.key);
    }
    return _esc(_t(fallbackVi || '', fallbackEn || fallbackVi || ''));
  }

  function _pvStatusColor(value, fallback){
    var key = String(value || '').toLowerCase();
    if(key.indexOf('run') >= 0 || key.indexOf('ok') >= 0 || key.indexOf('approved') >= 0 || key.indexOf('won') >= 0 || key.indexOf('pass') >= 0 || key.indexOf('closed') >= 0 || key.indexOf('success') >= 0 || key.indexOf('verified') >= 0) return 'var(--green)';
    if(key.indexOf('warn') >= 0 || key.indexOf('idle') >= 0 || key.indexOf('review') >= 0 || key.indexOf('draft') >= 0 || key.indexOf('pending') >= 0 || key.indexOf('submit') >= 0 || key.indexOf('hold') >= 0) return 'var(--amber)';
    if(key.indexOf('down') >= 0 || key.indexOf('fail') >= 0 || key.indexOf('reject') >= 0 || key.indexOf('lost') >= 0 || key.indexOf('overdue') >= 0 || key.indexOf('critical') >= 0 || key.indexOf('major') >= 0) return 'var(--red)';
    return fallback || 'var(--brand-2)';
  }

  function _pvPill(text, color, fg){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:'+(color || 'var(--gray-100)')+';color:'+(fg || '#fff')+';font-size:11px;font-weight:700;line-height:1.2">'+text+'</span>';
  }

  switch(renderType){
    case 'kpi-row':
      h += '<div style="display:flex;gap:var(--space-3);flex-wrap:wrap">';
      (config.items||[{},{},{}]).forEach(function(item){
        h += '<div style="flex:1;min-width:120px;padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);text-align:center">';
        h += '<div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:'+(item.color||'var(--brand-2)')+'">--</div>';
        h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">'+_esc(item.label?_t(item.label.vi||'KPI',item.label.en||'KPI'):'KPI Item')+'</div>';
        h += '</div>';
      });
      h += '</div>';
      break;

    case 'data-table':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden">';
      h += '<div style="display:flex;background:var(--gray-50);border-bottom:1px solid var(--border)">';
      (config.columns||[{label:{vi:'Cột 1'}},{label:{vi:'Cột 2'}},{label:{vi:'Cột 3'}}]).forEach(function(col){
        h += '<div style="flex:1;padding:var(--space-2) var(--space-3);font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--text-secondary)">'+_esc(col.label?_t(col.label.vi||'',col.label.en||''):'Column')+'</div>';
      });
      h += '</div>';
      for(var r=0;r<3;r++){
        h += '<div style="display:flex;border-bottom:1px solid var(--border)">';
        (config.columns||[{},{},{}]).forEach(function(){
          h += '<div style="flex:1;padding:var(--space-2) var(--space-3);font-size:var(--text-sm);color:var(--text-tertiary)">---</div>';
        });
        h += '</div>';
      }
      h += '</div>';
      if(config.dataSource && config.dataSource.api){
        h += '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">API: <code style="background:var(--gray-50);padding:1px 4px;border-radius:3px">'+_esc(config.dataSource.api)+'</code></div>';
      }
      break;

    case 'filter-bar':
      h += '<div style="display:flex;gap:var(--space-2);padding:var(--space-2);background:var(--gray-50);border-radius:var(--radius-md);flex-wrap:wrap">';
      (config.filters||[{}]).forEach(function(f){
        if(f.type==='search') h += '<div style="flex:1;min-width:150px;height:32px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);display:flex;align-items:center;padding:0 var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">🔍 '+_esc(f.placeholder?_t(f.placeholder.vi||'',f.placeholder.en||''):'Search...')+'</div>';
        else h += '<div style="height:32px;min-width:120px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);display:flex;align-items:center;padding:0 var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">'+_esc(f.key||'filter')+' ▾</div>';
      });
      h += '<div style="height:32px;padding:0 var(--space-3);background:var(--brand-2);color:#fff;border-radius:var(--radius-md);display:flex;align-items:center;font-size:var(--text-xs);font-weight:var(--font-semibold)">'+_t('Tìm','Search')+'</div>';
      h += '</div>';
      break;

    case 'form-standard':
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md)">';
      (config.fields||[{label:{vi:'Trường 1'}},{label:{vi:'Trường 2'}},{label:{vi:'Trường 3'}},{label:{vi:'Trường 4'}}]).slice(0,6).forEach(function(f){
        var span = f.span==='full'?'grid-column:1/-1;':'';
        h += '<div style="'+span+'"><div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:2px">'+_esc(f.label?_t(f.label.vi||'',f.label.en||''):'Field')+'</div><div style="height:32px;background:var(--gray-50);border:1px solid var(--border);border-radius:var(--radius-md)"></div></div>';
      });
      h += '</div>';
      break;

    case 'action-status-flow':
      var wf = config.workflow || {};
      var states = wf.states || [];
      var transitions = wf.transitions || [];
      h += '<div style="display:grid;gap:10px">';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
      (states.length ? states : [{ id:'draft', label:'Draft' }, { id:'review', label:'Review' }, { id:'approved', label:'Approved' }]).slice(0,5).forEach(function(item, idx){
        h += '<div style="padding:6px 10px;border-radius:999px;border:1px solid '+(idx === 0 ? 'var(--brand-2)' : 'var(--border)')+';background:'+(idx === 0 ? 'rgba(37,99,235,0.08)' : '#fff')+';font-size:12px;font-weight:700">'+_esc(item.label || item.labelEn || item.id || item.value)+'</div>';
        if(idx < ((states.length ? states : [1,2,3]).slice(0,5).length - 1)) h += '<span style="color:var(--text-tertiary)">→</span>';
      });
      h += '</div>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      (transitions.length ? transitions : [{ label:{ vi:'Gửi duyệt' }, variant:'primary' }, { label:{ vi:'Từ chối' }, variant:'danger' }]).slice(0,4).forEach(function(item){
        h += '<div style="padding:8px 12px;border-radius:12px;font-size:12px;font-weight:700;'+(item.variant === 'danger' ? 'background:rgba(220,38,38,0.12);color:var(--red)' : item.variant === 'primary' ? 'background:var(--brand-2);color:#fff' : 'border:1px solid var(--border);color:var(--text-secondary)')+'">'+_esc(item.label && item.label.vi || item.labelEn || item.label || item.to || 'Transition')+'</div>';
      });
      h += '</div>';
      if(wf.sla && Object.keys(wf.sla).length){
        h += '<div style="font-size:11px;color:var(--text-tertiary)">'+_t('SLA và digital thread sẽ tự lấy từ workflow registry.', 'SLA and digital thread metadata will be derived from the workflow registry.')+'</div>';
      }
      h += '</div>';
      break;

    case 'chart-bar':
      h += '<div style="display:flex;flex-direction:column;gap:4px;padding:var(--space-2)">';
      [75,60,45,30].forEach(function(w){
        h += '<div style="display:flex;align-items:center;gap:var(--space-2)"><span style="font-size:var(--text-xs);color:var(--text-secondary);min-width:40px">Item</span><div style="height:16px;width:'+w+'%;background:var(--brand-2);border-radius:var(--radius-sm);opacity:0.6"></div></div>';
      });
      h += '</div>';
      break;

    case 'chart-donut':
      h += '<div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-2)">';
      h += '<div style="width:80px;height:80px;border-radius:50%;background:conic-gradient(var(--green) 0% 40%,var(--amber) 40% 70%,var(--red) 70% 85%,var(--gray-200) 85% 100%);display:flex;align-items:center;justify-content:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff"></div></div>';
      h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">Donut Chart Preview</div>';
      h += '</div>';
      break;

    case 'section-header':
      h += '<div style="padding:var(--space-3);border-left:4px solid var(--brand-2);background:var(--gray-50);border-radius:var(--radius-md)">';
      h += '<div style="font-size:var(--text-lg);font-weight:var(--font-bold);color:var(--text-primary)">'+_esc(block.title?_t(block.title.vi||'',block.title.en||''):_getCatalogLabel(type))+'</div>';
      h += '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px">'+_esc(block.subtitle?_t(block.subtitle.vi||'',block.subtitle.en||''):'Section summary')+'</div>';
      h += '</div>';
      break;

    case 'card-container':
      h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)">';
      [1,2,3].forEach(function(){
        h += '<div style="height:68px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--gray-50)"></div>';
      });
      h += '</div>';
      break;

    case 'two-column':
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">';
      h += '<div style="height:92px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--gray-50)"></div>';
      h += '<div style="height:92px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--gray-50)"></div>';
      h += '</div>';
      break;

    case 'spacer':
      h += '<div style="height:24px;border:1px dashed var(--border);border-radius:var(--radius-md);background:repeating-linear-gradient(90deg,var(--gray-50),var(--gray-50) 12px,#fff 12px,#fff 24px)"></div>';
      break;

    case 'action-toolbar':
      h += '<div style="display:flex;gap:var(--space-2)">';
      (config.buttons||[{label:{vi:'Nút 1'},variant:'primary'},{label:{vi:'Nút 2'},variant:'secondary'}]).forEach(function(btn){
        h += '<div style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold);'+(btn.variant==='primary'?'background:var(--brand-2);color:#fff':'border:1px solid var(--border);color:var(--text-secondary)')+'">'+_esc(btn.label?_t(btn.label.vi||'',btn.label.en||''):'Button')+'</div>';
      });
      h += '</div>';
      break;

    case 'info-banner':
      var bannerColor = config.type==='warning'?'var(--amber)':config.type==='error'?'var(--red)':config.type==='success'?'var(--green)':'var(--brand-2)';
      h += '<div style="padding:var(--space-3);border-left:4px solid '+bannerColor+';background:var(--gray-50);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--text-secondary)">'+_esc(config.text?_t(config.text.vi||'',config.text.en||''):'Info banner')+'</div>';
      break;

    case 'data-timeline':
      h += '<div style="padding:var(--space-2)">';
      [1,2,3].forEach(function(i){
        h += '<div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-2)"><div style="width:10px;height:10px;border-radius:50%;background:var(--brand-2);margin-top:4px;flex-shrink:0"></div><div><div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--text-secondary)">Event '+i+'</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">Description...</div></div></div>';
      });
      h += '</div>';
      break;

    case 'data-kanban':
      var lanes = (config.kanban && config.kanban.lanes && config.kanban.lanes.length ? config.kanban.lanes : [
        { key:'draft', label:{vi:'Nháp', en:'Draft'}, color:'#94a3b8', limit:6 },
        { key:'submitted', label:{vi:'Đã gửi', en:'Submitted'}, color:'#38bdf8', limit:4 },
        { key:'reviewing', label:{vi:'Đang duyệt', en:'Reviewing'}, color:'#f59e0b', limit:3 },
        { key:'won', label:{vi:'Thắng', en:'Won'}, color:'#22c55e', limit:2 }
      ]).slice(0,4);
      var cardTitleField = config.kanban && config.kanban.card && config.kanban.card.titleField ? config.kanban.card.titleField : 'record_number';
      var cardSubtitleField = config.kanban && config.kanban.card && config.kanban.card.subtitleField ? config.kanban.card.subtitleField : 'customer_name';
      h += '<div style="display:grid;grid-template-columns:repeat('+lanes.length+',minmax(0,1fr));gap:var(--space-2)">';
      lanes.forEach(function(lane, laneIndex){
        var laneColor = lane.color || ['#94a3b8','#38bdf8','#f59e0b','#22c55e'][laneIndex % 4];
        var laneCount = lane.limit || (laneIndex + 2);
        h += '<div style="background:#fff;border:1px solid var(--border);border-top:3px solid '+laneColor+';border-radius:var(--radius-md);padding:var(--space-2);min-height:148px">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)"><div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--text-primary)">'+_pvLabel(lane, 'Làn', 'Lane')+'</div><div style="padding:2px 8px;border-radius:999px;background:'+laneColor+'1A;color:'+laneColor+';font-size:11px;font-weight:700">'+laneCount+'</div></div>';
        for(i=0;i<Math.min(3, laneIndex===1 ? 3 : 2);i++){
          h += '<div style="padding:var(--space-2);margin-bottom:var(--space-2);border:1px solid var(--border);border-radius:var(--radius-md);background:linear-gradient(180deg,#fff,#f8fafc);box-shadow:0 1px 2px rgba(15,23,42,0.04)">';
          h += '<div style="display:flex;justify-content:space-between;gap:var(--space-2);margin-bottom:4px"><strong style="font-size:var(--text-xs);color:var(--text-primary)">'+_esc(cardTitleField.toUpperCase())+'-'+(laneIndex+1)+(i+1)+'</strong>'+_pvPill(_esc(_t('Ưu tiên','Priority')), laneColor, '#fff')+'</div>';
          h += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">'+_esc(cardSubtitleField)+' · CNC Aerospace</div>';
          h += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary)"><span>'+_t('Hạn','Due')+': 0'+(i+2)+'/04</span><span>'+_t('SL','Qty')+': '+((i+1)*12)+'</span></div>';
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)"><code style="background:var(--gray-50);padding:1px 5px;border-radius:999px">'+_esc(cardTitleField)+'</code> · <code style="background:var(--gray-50);padding:1px 5px;border-radius:999px">'+_esc(cardSubtitleField)+'</code></div>';
      break;

    case 'data-gantt':
      var ganttRows = ['MC-01', 'MC-03', 'CMM-02', 'EDM-01'];
      var ganttDates = ['01/04', '03/04', '05/04', '07/04', '09/04'];
      var scheduleCfg = config.schedule || {};
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:#fff">';
      h += '<div style="display:grid;grid-template-columns:84px 1fr;background:var(--gray-50);border-bottom:1px solid var(--border)"><div style="padding:var(--space-2) var(--space-3);font-size:11px;font-weight:700;color:var(--text-secondary)">'+_t('Nguồn lực','Resource')+'</div><div style="display:grid;grid-template-columns:repeat('+ganttDates.length+',1fr)">';
      ganttDates.forEach(function(label){
        h += '<div style="padding:var(--space-2);text-align:center;font-size:11px;font-weight:700;color:var(--text-secondary);border-left:1px solid var(--border)">'+_esc(label)+'</div>';
      });
      h += '</div></div>';
      ganttRows.forEach(function(row, rowIndex){
        var left = [4, 20, 42, 58][rowIndex];
        var width = [28, 36, 22, 26][rowIndex];
        var color = ['#2563eb', '#0f766e', '#f59e0b', '#ef4444'][rowIndex];
        h += '<div style="display:grid;grid-template-columns:84px 1fr;align-items:center;border-bottom:1px solid var(--border)"><div style="padding:var(--space-2) var(--space-3);font-size:11px;font-weight:700;color:var(--text-primary)">'+_esc(row)+'</div><div style="position:relative;height:34px;background:repeating-linear-gradient(90deg,#f8fafc,#f8fafc 18%,#fff 18%,#fff 20%)">';
        h += '<div style="position:absolute;left:'+left+'%;top:9px;width:'+width+'%;height:16px;border-radius:999px;background:'+color+';box-shadow:inset 0 0 0 1px rgba(255,255,255,0.25)"></div>';
        h += '<div style="position:absolute;left:'+(left + 2)+'%;top:12px;font-size:10px;color:#fff;font-weight:700">WO-'+(rowIndex+11)+'</div>';
        h += '</div></div>';
      });
      h += '</div>';
      h += '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)">'+_t('Trường','Fields')+': <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(scheduleCfg.resourceField || 'machine_id')+'</code> <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(scheduleCfg.startField || 'planned_start')+'</code> <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(scheduleCfg.endField || 'planned_end')+'</code></div>';
      break;

    case 'schedule-grid':
      var dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      var slotLabels = ['06:00', '14:00', '22:00'];
      h += '<div style="display:grid;grid-template-columns:56px repeat(7,minmax(0,1fr));border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:#fff">';
      h += '<div style="background:var(--gray-50);border-bottom:1px solid var(--border)"></div>';
      dayLabels.forEach(function(label){
        h += '<div style="padding:var(--space-2);text-align:center;font-size:11px;font-weight:700;color:var(--text-secondary);background:var(--gray-50);border-left:1px solid var(--border);border-bottom:1px solid var(--border)">'+_esc(label)+'</div>';
      });
      slotLabels.forEach(function(slot, slotIndex){
        h += '<div style="padding:var(--space-2);font-size:11px;font-weight:700;color:var(--text-secondary);background:var(--gray-50);border-top:1px solid var(--border)">'+_esc(slot)+'</div>';
        dayLabels.forEach(function(_, dayIndex){
          var badge = '';
          if((slotIndex===0 && dayIndex===1) || (slotIndex===1 && dayIndex===3)) badge = '<div style="height:16px;border-radius:6px;background:#0ea5e9;opacity:0.85"></div>';
          if(slotIndex===1 && dayIndex===5) badge = '<div style="height:16px;border-radius:6px;background:#f59e0b;opacity:0.85"></div>';
          if(slotIndex===2 && dayIndex===2) badge = '<div style="height:16px;border-radius:6px;background:#22c55e;opacity:0.85"></div>';
          h += '<div style="padding:6px;border-left:1px solid var(--border);border-top:1px solid var(--border);min-height:36px;background:'+(dayIndex===6?'#fafafa':'#fff')+'">'+badge+'</div>';
        });
      });
      h += '</div>';
      h += '<div style="margin-top:var(--space-2);display:flex;gap:var(--space-2);font-size:11px;color:var(--text-tertiary)">'+_pvPill(_esc(_t('Lệnh chạy','Running job')), '#0ea5e9', '#fff')+_pvPill(_esc(_t('Bảo trì','Maintenance')), '#f59e0b', '#fff')+_pvPill(_esc(_t('Khả dụng','Available')), '#22c55e', '#fff')+'</div>';
      break;

    case 'pivot-table':
      var matrixCfg = config.matrix || {};
      var matrixRows = (matrixCfg.rows && matrixCfg.rows.length ? matrixCfg.rows : [
        { label:{vi:'CNC 3 trục', en:'3-axis CNC'} },
        { label:{vi:'CNC 5 trục', en:'5-axis CNC'} },
        { label:{vi:'CMM', en:'CMM'} }
      ]).slice(0,3);
      var matrixCols = (matrixCfg.columns && matrixCfg.columns.length ? matrixCfg.columns : [
        { label:{vi:'Sai kích thước', en:'Dimensional'} },
        { label:{vi:'Bavia', en:'Burr'} },
        { label:{vi:'Xước bề mặt', en:'Surface'} }
      ]).slice(0,3);
      var matrixVals = [[14, 38, 72], [22, 56, 88], [10, 31, 64]];
      h += '<table style="width:100%;border-collapse:collapse;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;background:#fff">';
      h += '<thead><tr><th style="padding:var(--space-2) var(--space-3);text-align:left;font-size:11px;color:var(--text-secondary);background:var(--gray-50);border-bottom:1px solid var(--border)">'+_t('Dòng / Cột','Rows / Columns')+'</th>';
      matrixCols.forEach(function(col){
        h += '<th style="padding:var(--space-2);font-size:11px;color:var(--text-secondary);background:var(--gray-50);border-left:1px solid var(--border);border-bottom:1px solid var(--border)">'+_pvLabel(col, 'Cột', 'Column')+'</th>';
      });
      h += '</tr></thead><tbody>';
      matrixRows.forEach(function(row, rowIndex){
        h += '<tr><td style="padding:var(--space-2) var(--space-3);font-size:11px;font-weight:700;color:var(--text-primary);border-bottom:1px solid var(--border)">'+_pvLabel(row, 'Dòng', 'Row')+'</td>';
        matrixCols.forEach(function(_, colIndex){
          var val = matrixVals[rowIndex][colIndex];
          h += '<td style="padding:var(--space-2);text-align:center;font-size:11px;font-weight:700;color:var(--text-primary);background:rgba(14,165,233,'+(0.14 + (val/100)*0.55)+');border-left:1px solid var(--border);border-bottom:1px solid var(--border)">'+val+'</td>';
        });
        h += '</tr>';
      });
      if(matrixCfg.showTotals){
        h += '<tr><td style="padding:var(--space-2) var(--space-3);font-size:11px;font-weight:700;background:var(--gray-50)">'+_t('Tổng','Total')+'</td><td style="text-align:center;font-size:11px;font-weight:700;background:var(--gray-50);border-left:1px solid var(--border)">46</td><td style="text-align:center;font-size:11px;font-weight:700;background:var(--gray-50);border-left:1px solid var(--border)">125</td><td style="text-align:center;font-size:11px;font-weight:700;background:var(--gray-50);border-left:1px solid var(--border)">224</td></tr>';
      }
      h += '</tbody></table>';
      h += '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary)"><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(matrixCfg.rowField || 'row_field')+'</code> × <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(matrixCfg.columnField || 'column_field')+'</code> → <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(matrixCfg.valueField || 'value_field')+'</code></div>';
      break;

    case 'record-detail':
      var detailCfg = config.detail || {};
      var detailSections = (detailCfg.sections && detailCfg.sections.length ? detailCfg.sections : [
        { label:{vi:'Thông tin chính', en:'Overview'} },
        { label:{vi:'Truy xuất', en:'Traceability'} },
        { label:{vi:'Đính kèm', en:'Attachments'} }
      ]).slice(0,3);
      h += '<div style="display:grid;grid-template-columns:170px 1fr;gap:var(--space-2)">';
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      for(i=0;i<3;i++){
        h += '<div style="padding:var(--space-2);border-radius:var(--radius-md);margin-bottom:6px;background:'+(i===0?'var(--brand-2)':'var(--gray-50)')+';color:'+(i===0?'#fff':'var(--text-primary)')+'">';
        h += '<div style="font-size:11px;font-weight:700">'+_esc((detailCfg.titleField || 'record_number').toUpperCase())+'-'+(104 + i)+'</div>';
        h += '<div style="font-size:10px;opacity:0.85">'+_esc(detailCfg.subtitleField || 'description')+'</div></div>';
      }
      h += '</div>';
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div style="display:flex;justify-content:space-between;gap:var(--space-2);align-items:flex-start;margin-bottom:var(--space-2)"><div><div style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">QMS-REC-104</div><div style="font-size:11px;color:var(--text-secondary)">Titanium housing inspection dossier</div></div>'+_pvPill(_esc(detailCfg.statusField || 'status'), 'var(--green)', '#fff')+'</div>';
      h += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">'+_pvPill(_esc(detailCfg.ownerField || 'owner_name'), 'var(--gray-100)', 'var(--text-primary)')+_pvPill(_esc(detailCfg.updatedAtField || 'updated_at'), 'var(--gray-100)', 'var(--text-primary)')+'</div>';
      detailSections.forEach(function(section){
        h += '<div style="padding:var(--space-2) 0;border-top:1px solid var(--border)"><div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px">'+_pvLabel(section, 'Phần', 'Section')+'</div><div style="height:10px;border-radius:999px;background:linear-gradient(90deg,var(--gray-100),var(--gray-50) 70%,transparent 70%)"></div></div>';
      });
      h += '</div></div>';
      break;

    case 'data-tree':
      var treeChildKey = config.childrenKey || 'children';
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div style="font-size:11px;color:var(--text-tertiary);margin-bottom:var(--space-2)">'+_t('Cấu trúc cây','Tree structure')+' · <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(treeChildKey)+'</code></div>';
      h += '<div style="display:flex;align-items:center;gap:8px;font-size:var(--text-sm);font-weight:700;color:var(--text-primary)"><span style="color:var(--brand-2)">▾</span><span>SO-24018</span></div>';
      h += '<div style="margin-left:16px;border-left:1px dashed var(--border);padding-left:var(--space-3);margin-top:6px">';
      h += '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-primary);margin-bottom:6px"><span style="color:var(--amber)">▾</span><span>JO-24018-A</span>'+_pvPill(_esc(_t('Đang chạy','Running')), 'var(--green)', '#fff')+'</div>';
      h += '<div style="margin-left:16px;border-left:1px dashed var(--border);padding-left:var(--space-3)">';
      h += '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-secondary);margin-bottom:6px"><span style="color:var(--text-tertiary)">•</span><span>WO-24018-01 / Setup</span></div>';
      h += '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-secondary)"><span style="color:var(--text-tertiary)">•</span><span>WO-24018-02 / Final QC</span></div>';
      h += '</div>';
      h += '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text-primary);margin-top:6px"><span style="color:var(--text-secondary)">▸</span><span>JO-24018-B</span></div>';
      h += '</div></div>';
      break;

    case 'data-stat-compare':
      var deltaDown = config.deltaDirection === 'down';
      var deltaArrow = deltaDown ? '▼' : '▲';
      var deltaColor = deltaDown ? 'var(--red)' : 'var(--green)';
      h += '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:var(--space-3);align-items:center;border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div><div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'+_t('Hiện tại','Current')+'</div><div style="display:flex;align-items:flex-end;gap:var(--space-2);margin-top:6px"><div style="font-size:28px;line-height:1;font-weight:800;color:var(--text-primary)">98.4%</div>'+_pvPill(_esc(deltaArrow+' 2.3%'), deltaColor, '#fff')+'</div><div style="font-size:11px;color:var(--text-tertiary);margin-top:8px"><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(config.valueField || (config.gauge && config.gauge.valueField) || 'current_value')+'</code> vs <code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(config.targetField || (config.gauge && config.gauge.targetField) || 'target_value')+'</code></div></div>';
      h += '<div style="height:70px;border-radius:var(--radius-md);background:linear-gradient(180deg,#eff6ff,#fff);padding:var(--space-2)"><svg viewBox="0 0 120 56" width="100%" height="100%"><polyline fill="none" stroke="#94a3b8" stroke-width="2" points="4,40 24,34 44,38 64,24 84,18 104,14"/><circle cx="104" cy="14" r="4" fill="#2563eb"/></svg><div style="font-size:10px;color:var(--text-secondary);margin-top:4px">'+_t('So với kỳ trước','Compared to previous period')+'</div></div>';
      h += '</div>';
      break;

    case 'audit-log':
      var logRows = [
        { time:'08:14', user:'qa.lead', action:_t('Phê duyệt CAPA','Approved CAPA'), status:'approved' },
        { time:'09:02', user:'planner.01', action:_t('Cập nhật WO-24021','Updated WO-24021'), status:'review' },
        { time:'10:37', user:'it.audit', action:_t('Đồng bộ hash chain','Synced hash chain'), status:'verified' }
      ];
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      logRows.forEach(function(row, rowIndex){
        var rowColor = _pvStatusColor(row.status);
        h += '<div style="display:grid;grid-template-columns:56px 88px 1fr auto;gap:var(--space-2);align-items:center;padding:'+(rowIndex===0?'0':'var(--space-2) 0 0')+';margin-top:'+(rowIndex===0?'0':'var(--space-2)')+';border-top:'+(rowIndex===0?'none':'1px solid var(--border)')+'">';
        h += '<div style="font-size:11px;font-weight:700;color:var(--text-secondary)">'+_esc(row.time)+'</div>';
        h += '<div style="font-size:11px;color:var(--text-primary)">'+_esc(row.user)+'</div>';
        h += '<div style="font-size:11px;color:var(--text-secondary)">'+_esc(row.action)+'</div>';
        h += _pvPill(_esc(row.status.toUpperCase()), rowColor, '#fff');
        h += '</div>';
      });
      h += '</div>';
      break;

    case 'chart-line':
      var lineCfg = config.chart || {};
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:linear-gradient(180deg,#fff,#f8fafc);padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="16" y1="92" x2="208" y2="92" stroke="#cbd5e1" stroke-width="1"/><line x1="16" y1="18" x2="16" y2="92" stroke="#cbd5e1" stroke-width="1"/>';
      h += '<line x1="16" y1="68" x2="208" y2="68" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/><line x1="16" y1="44" x2="208" y2="44" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>';
      h += '<path d="M16 88 L44 72 L72 76 L100 48 L128 56 L156 32 L184 38 L208 22 L208 92 L16 92 Z" fill="rgba(37,99,235,0.12)"></path>';
      h += '<polyline fill="none" stroke="#2563eb" stroke-width="3" points="16,88 44,72 72,76 100,48 128,56 156,32 184,38 208,22"></polyline>';
      [16,44,72,100,128,156,184,208].forEach(function(x, idx){
        var y = [88,72,76,48,56,32,38,22][idx];
        h += '<circle cx="'+x+'" cy="'+y+'" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"></circle>';
      });
      h += '</svg>';
      h += '<div style="display:flex;justify-content:space-between;gap:var(--space-2);font-size:11px;color:var(--text-tertiary)"><span><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(lineCfg.xField || 'period')+'</code></span><span><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(lineCfg.yField || 'value')+'</code></span></div>';
      h += '</div>';
      break;

    case 'chart-radar':
      var radarCfg = config.chart || {};
      h += '<div style="display:grid;grid-template-columns:120px 1fr;gap:var(--space-3);align-items:center;border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">';
      h += '<polygon points="60,12 92,30 104,60 92,90 60,108 28,90 16,60 28,30" fill="none" stroke="#cbd5e1"/>';
      h += '<polygon points="60,24 82,36 90,60 82,84 60,96 38,84 30,60 38,36" fill="none" stroke="#dbeafe"/>';
      h += '<polygon points="60,36 72,42 78,60 72,78 60,84 48,78 42,60 48,42" fill="none" stroke="#dbeafe"/>';
      h += '<polygon points="60,18 84,40 76,68 68,86 44,80 34,56 42,34 52,24" fill="rgba(14,165,233,0.28)" stroke="#0ea5e9" stroke-width="2"></polygon>';
      h += '</svg>';
      h += '<div><div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">'+_t('So sánh đa tiêu chí','Multi-axis comparison')+'</div>';
      ['Quality', 'Delivery', 'Cost', 'Risk'].forEach(function(label, idx){
        h += '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-bottom:4px"><span>'+_esc(label)+'</span><div style="width:'+(72 - idx*10)+'%;height:8px;border-radius:999px;background:#dbeafe"><div style="width:'+(60 + idx*8)+'%;height:8px;border-radius:999px;background:#0ea5e9"></div></div></div>';
      });
      h += '<div style="font-size:10px;color:var(--text-tertiary);margin-top:6px"><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(radarCfg.seriesField || 'series_field')+'</code></div></div>';
      h += '</div>';
      break;

    case 'chart-gauge':
      var gaugeCfg = config.gauge || {};
      h += '<div style="display:grid;grid-template-columns:180px 1fr;gap:var(--space-3);align-items:center;border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div style="position:relative;width:180px;height:96px;overflow:hidden"><div style="position:absolute;left:0;top:0;width:180px;height:180px;border-radius:50%;background:conic-gradient(#22c55e 0 40%,#f59e0b 40% 72%,#ef4444 72% 100%)"></div><div style="position:absolute;left:24px;top:24px;width:132px;height:132px;border-radius:50%;background:#fff"></div><div style="position:absolute;left:89px;top:38px;width:2px;height:52px;background:#0f172a;transform-origin:bottom center;transform:rotate(34deg)"></div><div style="position:absolute;left:84px;top:82px;width:12px;height:12px;border-radius:50%;background:#0f172a"></div></div>';
      h += '<div><div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'+_t('Mức hiện tại','Current level')+'</div><div style="font-size:30px;font-weight:800;color:var(--text-primary);line-height:1;margin:6px 0">82'+_esc(gaugeCfg.unit || '%')+'</div><div style="display:flex;gap:var(--space-2);flex-wrap:wrap">'+_pvPill(_esc(_t('Mục tiêu 85%','Target 85%')), 'var(--gray-100)', 'var(--text-primary)')+_pvPill(_esc(gaugeCfg.valueField || 'value_field'), 'var(--gray-100)', 'var(--text-primary)')+'</div></div>';
      h += '</div>';
      break;

    case 'chart-waterfall':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="14" y1="90" x2="210" y2="90" stroke="#cbd5e1" stroke-width="1"></line>';
      h += '<rect x="24" y="42" width="24" height="48" rx="4" fill="#22c55e"></rect><line x1="48" y1="42" x2="78" y2="42" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"></line>';
      h += '<rect x="78" y="56" width="24" height="34" rx="4" fill="#ef4444"></rect><line x1="102" y1="56" x2="132" y2="56" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"></line>';
      h += '<rect x="132" y="34" width="24" height="56" rx="4" fill="#22c55e"></rect><line x1="156" y1="34" x2="186" y2="34" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"></line>';
      h += '<rect x="186" y="24" width="24" height="66" rx="4" fill="#2563eb"></rect>';
      h += '<text x="27" y="102" font-size="10" fill="#64748b">Base</text><text x="79" y="102" font-size="10" fill="#64748b">Loss</text><text x="128" y="102" font-size="10" fill="#64748b">Gain</text><text x="186" y="102" font-size="10" fill="#64748b">Total</text>';
      h += '</svg>';
      h += '</div>';
      break;

    case 'chart-scatter':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="16" y1="92" x2="208" y2="92" stroke="#cbd5e1" stroke-width="1"/><line x1="16" y1="16" x2="16" y2="92" stroke="#cbd5e1" stroke-width="1"/>';
      h += '<line x1="64" y1="16" x2="64" y2="92" stroke="#e2e8f0" stroke-dasharray="4 4"/><line x1="112" y1="16" x2="112" y2="92" stroke="#e2e8f0" stroke-dasharray="4 4"/><line x1="160" y1="16" x2="160" y2="92" stroke="#e2e8f0" stroke-dasharray="4 4"/>';
      h += '<line x1="16" y1="68" x2="208" y2="68" stroke="#e2e8f0" stroke-dasharray="4 4"/><line x1="16" y1="44" x2="208" y2="44" stroke="#e2e8f0" stroke-dasharray="4 4"/>';
      h += '<circle cx="44" cy="72" r="5" fill="rgba(14,165,233,0.65)"></circle><circle cx="68" cy="60" r="7" fill="rgba(14,165,233,0.45)"></circle><circle cx="94" cy="54" r="4" fill="rgba(34,197,94,0.7)"></circle><circle cx="116" cy="36" r="8" fill="rgba(34,197,94,0.45)"></circle><circle cx="146" cy="48" r="6" fill="rgba(245,158,11,0.7)"></circle><circle cx="174" cy="28" r="10" fill="rgba(239,68,68,0.4)"></circle>';
      h += '</svg>';
      h += '</div>';
      break;

    case 'mfg-machine-status':
      var statusMap = (config.machine && config.machine.statusMap && config.machine.statusMap.length ? config.machine.statusMap : [
        { key:'running', label:{vi:'Chạy', en:'Running'}, color:'var(--green)' },
        { key:'idle', label:{vi:'Chờ', en:'Idle'}, color:'var(--amber)' },
        { key:'down', label:{vi:'Dừng', en:'Down'}, color:'var(--red)' }
      ]);
      h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)">';
      [0,1,2,0,1,2].forEach(function(statusIdx, machineIdx){
        var status = statusMap[statusIdx] || statusMap[0];
        h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)"><strong style="font-size:var(--text-sm)">MC-'+('0'+(machineIdx+1)).slice(-2)+'</strong><span style="width:10px;height:10px;border-radius:50%;background:'+_esc(status.color || _pvStatusColor(status.key))+';box-shadow:0 0 0 3px rgba(148,163,184,0.16)"></span></div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">'+_pvLabel(status, 'Trạng thái', 'Status')+'</div><div style="height:8px;border-radius:999px;background:var(--gray-100);overflow:hidden"><div style="width:'+(52 + (machineIdx*7))+'%;height:8px;border-radius:999px;background:'+_esc(status.color || _pvStatusColor(status.key))+'"></div></div></div>';
      });
      h += '</div>';
      break;

    case 'mfg-oee-trend':
      var oeeCfg = config.oee || {};
      var rings = [
        { key:'A', value:89, color:'#22c55e', field:oeeCfg.availabilityField || 'availability' },
        { key:'P', value:83, color:'#0ea5e9', field:oeeCfg.performanceField || 'performance' },
        { key:'Q', value:97, color:'#f59e0b', field:oeeCfg.qualityField || 'quality' }
      ];
      h += '<div style="display:grid;grid-template-columns:repeat(3,86px) 1fr;gap:var(--space-3);align-items:center">';
      rings.forEach(function(ring){
        h += '<div style="text-align:center"><div style="width:74px;height:74px;margin:0 auto 6px;border-radius:50%;background:conic-gradient('+ring.color+' 0 '+ring.value+'%,#e2e8f0 '+ring.value+'% 100%);display:flex;align-items:center;justify-content:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--text-primary)">'+ring.value+'%</div></div><div style="font-size:11px;font-weight:700;color:var(--text-secondary)">'+_esc(ring.key)+'</div></div>';
      });
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)"><div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'+_t('OEE tổng hợp','Overall OEE')+'</div><div style="display:flex;align-items:flex-end;gap:var(--space-2);margin-top:6px"><div style="font-size:30px;font-weight:800;color:var(--text-primary)">71.7%</div>'+_pvPill(_esc(oeeCfg.oeeField || 'oee'), 'var(--brand-2)', '#fff')+'</div><div style="margin-top:8px;height:34px"><svg viewBox="0 0 120 30" width="100%" height="100%"><polyline fill="none" stroke="#2563eb" stroke-width="2.5" points="0,24 18,22 36,20 54,18 72,16 90,11 108,9 120,8"/></svg></div></div>';
      h += '</div>';
      break;

    case 'mfg-andon-board':
      h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)">';
      ['CNC-01', 'CNC-02', 'CMM-01'].forEach(function(station, stationIdx){
        h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)"><div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:var(--space-2)">'+_esc(station)+'</div><div style="display:flex;justify-content:center;gap:10px">';
        ['#22c55e', '#f59e0b', '#ef4444'].forEach(function(lightColor, lightIdx){
          var active = stationIdx === lightIdx || (stationIdx === 2 && lightIdx === 1);
          h += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+lightColor+';opacity:'+(active?'1':'0.22')+';box-shadow:'+(active?'0 0 12px '+lightColor:'none')+'"></span>';
        });
        h += '</div><div style="margin-top:var(--space-2);font-size:10px;text-align:center;color:var(--text-tertiary)">'+(stationIdx===0?_t('Đang chạy ổn định','Running steady'):stationIdx===1?_t('Chờ hỗ trợ vật tư','Waiting for material'):_t('Báo lỗi chất lượng','Quality alarm'))+'</div></div>';
      });
      h += '</div>';
      break;

    case 'mfg-tool-life':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      [
        { code:'T01', value:78, remain:'42 pcs', color:'#0ea5e9' },
        { code:'T07', value:55, remain:'118 pcs', color:'#22c55e' },
        { code:'T11', value:92, remain:'8 pcs', color:'#ef4444' }
      ].forEach(function(tool, idx){
        h += '<div style="display:grid;grid-template-columns:48px 1fr 56px;gap:var(--space-2);align-items:center;margin-top:'+(idx===0?'0':'var(--space-2)')+'"><strong style="font-size:11px;color:var(--text-primary)">'+_esc(tool.code)+'</strong><div style="height:10px;border-radius:999px;background:var(--gray-100);overflow:hidden"><div style="width:'+tool.value+'%;height:10px;border-radius:999px;background:'+tool.color+'"></div></div><div style="font-size:11px;text-align:right;color:var(--text-secondary)">'+_esc(tool.remain)+'</div></div>';
      });
      h += '</div>';
      break;

    case 'quality-spc-chart':
      var spcCfg = config.spc || {};
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="16" y1="20" x2="208" y2="20" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4"></line>';
      h += '<line x1="16" y1="54" x2="208" y2="54" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 4"></line>';
      h += '<line x1="16" y1="86" x2="208" y2="86" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4"></line>';
      h += '<polyline fill="none" stroke="#2563eb" stroke-width="2.5" points="16,64 40,58 64,60 88,44 112,52 136,28 160,56 184,50 208,70"></polyline>';
      h += '<circle cx="136" cy="28" r="4.5" fill="#ef4444"></circle><circle cx="208" cy="70" r="4.5" fill="#ef4444"></circle>';
      [16,40,64,88,112,136,160,184,208].forEach(function(x, idx){
        var y = [64,58,60,44,52,28,56,50,70][idx];
        h += '<circle cx="'+x+'" cy="'+y+'" r="3" fill="#2563eb" stroke="#fff" stroke-width="1.5"></circle>';
      });
      h += '</svg>';
      h += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;font-size:11px;color:var(--text-tertiary)">'+_pvPill(_esc(spcCfg.uclField || 'ucl'), '#fee2e2', '#b91c1c')+_pvPill(_esc(spcCfg.centerLineField || 'centerline'), '#e2e8f0', '#334155')+_pvPill(_esc(spcCfg.lclField || 'lcl'), '#fee2e2', '#b91c1c')+'</div>';
      h += '</div>';
      break;

    case 'quality-pareto':
      var paretoCfg = config.distribution || {};
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="16" y1="90" x2="208" y2="90" stroke="#cbd5e1" stroke-width="1"></line>';
      h += '<line x1="16" y1="32" x2="208" y2="32" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4"></line>';
      h += '<rect x="28" y="36" width="20" height="54" rx="3" fill="#2563eb"></rect><rect x="62" y="46" width="20" height="44" rx="3" fill="#3b82f6"></rect><rect x="96" y="56" width="20" height="34" rx="3" fill="#60a5fa"></rect><rect x="130" y="64" width="20" height="26" rx="3" fill="#93c5fd"></rect><rect x="164" y="72" width="20" height="18" rx="3" fill="#bfdbfe"></rect>';
      h += '<polyline fill="none" stroke="#f97316" stroke-width="2.5" points="38,70 72,48 106,36 140,28 174,24"></polyline>';
      [38,72,106,140,174].forEach(function(x, idx){
        var y = [70,48,36,28,24][idx];
        h += '<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="#f97316"></circle>';
      });
      h += '</svg>';
      h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-tertiary)"><span><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(paretoCfg.categoryField || 'category')+'</code></span><span>'+_t('Mốc 80/20','80/20 line')+'</span></div>';
      h += '</div>';
      break;

    case 'quality-capability':
      var capabilityCfg = config.spc || {};
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-2)">';
      h += '<svg viewBox="0 0 220 110" width="100%" height="120" aria-hidden="true">';
      h += '<line x1="48" y1="18" x2="48" y2="92" stroke="#ef4444" stroke-width="2"></line><line x1="172" y1="18" x2="172" y2="92" stroke="#ef4444" stroke-width="2"></line>';
      h += '<path d="M16 90 C52 90 62 24 110 24 C158 24 168 90 204 90" fill="none" stroke="#2563eb" stroke-width="3"></path>';
      h += '<path d="M16 90 C52 90 62 24 110 24 C158 24 168 90 204 90 L204 92 L16 92 Z" fill="rgba(37,99,235,0.12)"></path>';
      h += '<line x1="110" y1="18" x2="110" y2="92" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"></line>';
      h += '</svg>';
      h += '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;font-size:11px">'+_pvPill(_esc('Cp 1.67'), '#dbeafe', '#1d4ed8')+_pvPill(_esc('Cpk 1.42'), '#dcfce7', '#166534')+_pvPill(_esc((capabilityCfg.lslField || 'lsl')+' / '+(capabilityCfg.uslField || 'usl')), '#fee2e2', '#b91c1c')+'</div>';
      h += '</div>';
      break;

    case 'quality-capa-board':
      h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-2)">';
      [
        { code:'CAPA-124', severity:'Critical', status:'Open', due:'05/04', color:'var(--red)' },
        { code:'8D-031', severity:'Major', status:'Containment', due:'08/04', color:'var(--amber)' },
        { code:'CAPA-129', severity:'Minor', status:'Verified', due:'12/04', color:'var(--green)' }
      ].forEach(function(card){
        h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)"><div style="display:flex;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-2)"><strong style="font-size:var(--text-sm);color:var(--text-primary)">'+_esc(card.code)+'</strong>'+_pvPill(_esc(card.severity), card.color, '#fff')+'</div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">'+_t('Containment / corrective action owner assigned','Containment / corrective action owner assigned')+'</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary)"><span>'+_t('Hạn','Due')+': '+_esc(card.due)+'</span>'+_pvPill(_esc(card.status), 'var(--gray-100)', 'var(--text-primary)')+'</div></div>';
      });
      h += '</div>';
      break;

    case 'quality-inspection-form':
      var checklistCfg = config.checklist || {};
      var checklistItems = (checklistCfg.items && checklistCfg.items.length ? checklistCfg.items : [
        { label:{vi:'Kích thước Ø ngoài', en:'Outer diameter'} },
        { label:{vi:'Độ nhám bề mặt', en:'Surface roughness'} },
        { label:{vi:'Vết xước / va đập', en:'Scratch / dent'} },
        { label:{vi:'Tem truy xuất', en:'Traceability label'} }
      ]).slice(0,4);
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      checklistItems.forEach(function(item, itemIdx){
        h += '<div style="display:grid;grid-template-columns:1fr 64px 88px;gap:var(--space-2);align-items:center;padding:'+(itemIdx===0?'0':'var(--space-2) 0 0')+';margin-top:'+(itemIdx===0?'0':'var(--space-2)')+';border-top:'+(itemIdx===0?'none':'1px solid var(--border)')+'"><div style="font-size:11px;color:var(--text-primary)">'+_pvLabel(item, 'Điểm kiểm', 'Checkpoint')+'</div><div style="text-align:center;font-size:16px">'+(itemIdx===2?'❌':'✅')+'</div><div style="text-align:right">'+_pvPill(_esc(itemIdx===2?_t('NG','NG'):_t('OK','OK')), itemIdx===2?'var(--red)':'var(--green)', '#fff')+'</div></div>';
      });
      h += '<div style="margin-top:var(--space-3);display:flex;justify-content:space-between;font-size:11px;color:var(--text-tertiary)"><span>'+_t('Điểm đạt','Pass score')+': '+_esc(String(checklistCfg.passScore || 90))+'</span><span>'+_t('Stop on fail','Stop on fail')+': '+_esc(checklistCfg.stopOnFail ? _t('Có','Yes') : _t('Không','No'))+'</span></div>';
      h += '</div>';
      break;

    case 'form-wizard':
      var wizardCfg = config.wizard || {};
      var wizardSteps = (wizardCfg.steps && wizardCfg.steps.length ? wizardCfg.steps : [
        { label:{vi:'Thông tin', en:'Info'} },
        { label:{vi:'Chi tiết', en:'Details'} },
        { label:{vi:'Xác nhận', en:'Confirm'} }
      ]).slice(0,4);
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:var(--space-3)">';
      wizardSteps.forEach(function(step, stepIdx){
        var activeStep = stepIdx === 1 ? 'background:var(--brand-2);color:#fff;border-color:var(--brand-2)' : 'background:#fff;color:var(--text-secondary);border-color:var(--border)';
        h += '<div style="display:flex;align-items:center;gap:8px">';
        h += '<div style="width:28px;height:28px;border-radius:50%;border:1px solid '+(stepIdx===1?'var(--brand-2)':'var(--border)')+';'+activeStep+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">'+(stepIdx+1)+'</div>';
        h += '<div style="font-size:11px;font-weight:700;color:'+(stepIdx===1?'var(--brand-2)':'var(--text-secondary)')+'">'+_pvLabel(step, 'Bước', 'Step')+'</div>';
        h += '</div>';
        if(stepIdx < wizardSteps.length-1){
          h += '<div style="flex:1;min-width:18px;height:1px;background:var(--border)"></div>';
        }
      });
      h += '</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)"><div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">'+_t('Trường bước hiện tại','Active step field')+'</div><div style="height:34px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--gray-50)"></div></div><div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">'+_t('Xác nhận dữ liệu','Validation')+'</div><div style="height:34px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--gray-50)"></div></div></div>';
      h += '</div>';
      break;

    case 'approval-form':
      h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div style="display:flex;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-3)"><div><div style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">'+_t('Phiếu phê duyệt thay đổi quy trình','Process change approval form')+'</div><div style="font-size:11px;color:var(--text-secondary)">'+_t('Người duyệt: QA Manager / Production Head','Reviewer: QA Manager / Production Head')+'</div></div>'+_pvPill(_esc(_t('Chờ phê duyệt','Pending approval')), 'var(--amber)', '#fff')+'</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)"><div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">'+_t('Người gửi','Submitted by')+'</div><div style="height:34px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--gray-50)"></div></div><div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">'+_t('Ngày yêu cầu','Request date')+'</div><div style="height:34px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--gray-50)"></div></div></div>';
      h += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">'+_t('Ý kiến phê duyệt','Reviewer comment')+'</div><div style="height:54px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--gray-50);margin-bottom:var(--space-3)"></div>';
      h += '<div style="display:flex;justify-content:flex-end;gap:var(--space-2)"><div style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);border:1px solid var(--red);color:var(--red);font-size:11px;font-weight:700">'+_t('Reject','Reject')+'</div><div style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--green);color:#fff;font-size:11px;font-weight:700">'+_t('Approve','Approve')+'</div></div>';
      h += '</div>';
      break;

    case 'iot-live-trend':
      var liveCfg = config.chart || {};
      h += '<div style="display:grid;grid-template-columns:1fr 120px;gap:var(--space-3);align-items:center;border:1px solid var(--border);border-radius:var(--radius-md);background:#fff;padding:var(--space-3)">';
      h += '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">'+_t('Tín hiệu realtime','Live telemetry')+'</div><div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--green)"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(34,197,94,0.15)"></span>'+_t('Live','Live')+'</div></div><svg viewBox="0 0 220 72" width="100%" height="72" aria-hidden="true"><polyline fill="none" stroke="#0ea5e9" stroke-width="2.5" points="0,48 24,44 48,46 72,30 96,28 120,16 144,24 168,18 192,22 220,12"></polyline><circle cx="220" cy="12" r="4" fill="#0ea5e9"></circle></svg><div style="font-size:10px;color:var(--text-tertiary)"><code style="background:var(--gray-50);padding:1px 4px;border-radius:999px">'+_esc(liveCfg.yField || 'sensor_value')+'</code></div></div>';
      h += '<div style="text-align:center;border-left:1px solid var(--border);padding-left:var(--space-3)"><div style="font-size:11px;color:var(--text-secondary)">'+_t('Giá trị hiện tại','Current value')+'</div><div style="font-size:28px;font-weight:800;color:var(--text-primary);line-height:1.1;margin:6px 0">2.314</div>'+_pvPill(_esc(_t('Ổn định','Stable')), 'var(--green)', '#fff')+'</div>';
      h += '</div>';
      break;

    default:
      h += '<div style="padding:var(--space-4);border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--gray-50)">';
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-2);margin-bottom:var(--space-2)">';
      h += '<div><div style="font-weight:var(--font-semibold);color:var(--text-primary)">'+_esc(_getCatalogLabel(type))+'</div>';
      h += '<div style="font-size:var(--text-xs);color:var(--text-tertiary)">'+_esc(entry.category||'custom')+'</div></div>';
      h += '<div style="font-size:1.2rem">'+_esc(entry.icon||'📦')+'</div></div>';
      if(config.dataSource && config.dataSource.api){
        h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-2)">API: <code style="background:#fff;padding:2px 6px;border:1px solid var(--border);border-radius:999px">'+_esc(config.dataSource.api)+'</code></div>';
      }
      h += '<div style="font-size:var(--text-sm);color:var(--text-tertiary)">'+_t('Block đang dùng preview tổng quát. Mở panel thuộc tính để cấu hình chi tiết.','This block is using the generic preview. Open properties to configure the details.')+'</div>';
      h += '</div>';
  }

  return h;
}

/* ── Block Library Panel ─────────────────────────────────────────────────── */
function _renderLibraryPanel(){
  var h = '';
  h += '<div style="position:fixed;right:0;top:0;bottom:0;width:380px;background:var(--bg-surface);border-left:1px solid var(--border);z-index:var(--z-modal);box-shadow:var(--shadow-xl);display:flex;flex-direction:column">';

  /* Header */
  h += '<div style="padding:var(--space-4);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">';
  h += '<h3 style="margin:0;font-size:var(--text-lg)">'+_t('Thư viện Block','Block Library')+'</h3>';
  h += '<button class="hm-btn hm-btn-ghost" data-action="close-library" style="font-size:1.2rem">×</button>';
  h += '</div>';

  /* Search */
  h += '<div style="padding:var(--space-3)">';
  h += '<input type="text" class="hm-input" id="mb-lib-search" placeholder="'+_t('Tìm block...','Search blocks...')+'" value="'+_esc(state.librarySearch)+'">';
  h += '</div>';

  /* Categories + blocks */
  h += '<div style="flex:1;overflow-y:auto;padding:0 var(--space-3) var(--space-3)">';
  var catalog = BE.BLOCK_CATALOG || {};
  var categories = BE.BLOCK_CATEGORIES || [];
  var search = (state.librarySearch||'').toLowerCase();

  if(state.libraryMode === 'packs'){
    _ensureRegistriesLoaded();
    if(state.registries.loading && !Object.keys(packMap).length){
      h += '<div class="mb-inline-loading"><span class="mb-spinner"></span><span>'+_esc(state.registries.loadingMessage || _t('Đang nạp field pack...', 'Loading field packs...'))+'</span></div>';
    }
    ['bao_gia','don_hang','ke_hoach','mua_hang','san_xuat','chat_luong','ho_so','bao_cao','tai_lieu','quan_tri'].forEach(function(moduleKey){
      var items = Object.keys(packMap).filter(function(packKey){
        var info = _getPackInfo(packKey, packMap[packKey] || []);
        var haystack = _normalizeSearchText(packKey + ' ' + info.label + ' ' + info.description + ' ' + info.module);
        return info.module === moduleKey && (!search || haystack.indexOf(_normalizeSearchText(search)) >= 0);
      });
      if(!items.length) return;
      h += '<div style="margin-top:16px">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);font-weight:700;margin-bottom:8px">'+_esc(_packModuleInfo(moduleKey).icon)+' '+_esc(_packModuleInfo(moduleKey).label)+' ('+items.length+')</div>';
      items.forEach(function(packKey){
        var info = _getPackInfo(packKey, packMap[packKey] || []);
        h += '<div class="mb-pack-card" draggable="true" data-field-pack="'+_esc(packKey)+'">';
        h += '<div class="mb-pack-head"><div class="mb-pack-icon">'+_esc(info.icon)+'</div><div style="flex:1"><div class="mb-pack-name">'+_esc(info.label)+'</div><div class="mb-pack-meta">'+_esc(info.moduleLabel)+' • '+info.count+' '+_t('trường', 'fields')+'</div></div></div>';
        h += '<div class="mb-pack-desc">'+_esc(info.description)+'</div>';
        h += '<div class="mb-pack-actions"><button class="hm-btn hm-btn-primary hm-btn-sm" data-action="open-pack-picker" data-pack="'+_esc(packKey)+'">'+_t('Thêm nhanh', 'Quick add')+'</button></div>';
        h += '</div>';
      });
      h += '</div>';
    });
  } else {
  categories.forEach(function(cat){
    var blocks = Object.keys(catalog).filter(function(key){
      var entry = catalog[key];
      if(entry.category !== cat.key) return false;
      if(search && entry.label.toLowerCase().indexOf(search)<0 && (entry.labelEn||'').toLowerCase().indexOf(search)<0 && key.indexOf(search)<0) return false;
      return true;
    });
    if(!blocks.length) return;

    h += '<div style="margin-bottom:var(--space-4)">';
    h += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:'+cat.color+';text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2)">'+_esc(_t(cat.label,cat.labelEn||cat.label))+' ('+blocks.length+')</div>';

    blocks.forEach(function(key){
      var entry = catalog[key];
      h += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer;transition:background 0.1s" data-action="add-block-type" data-type="'+_esc(key)+'" onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'\'">';
      h += '<div style="font-size:1.3rem;width:36px;text-align:center">'+_esc(entry.icon||'📦')+'</div>';
      h += '<div>';
      h += '<div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">'+_esc(entry.label)+'</div>';
      h += '<div style="font-size:var(--text-xs);color:var(--text-secondary)">'+_esc(entry.labelEn||'')+'</div>';
      if(entry.desc) h += '<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px">'+_esc(entry.desc)+'</div>';
      h += '</div></div>';
    });

    h += '</div>';
  });

  /* Block Templates */
  var templates = BE.BLOCK_TEMPLATES || {};
  var templateKeys = Object.keys(templates);
  if(templateKeys.length){
    h += '<div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:2px solid var(--border)">';
    h += '<div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--amber);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2)">⭐ '+_t('Block Templates','Block Templates')+' ('+templateKeys.length+')</div>';
    templateKeys.forEach(function(key){
      var tpl = templates[key];
      h += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--amber);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer;background:var(--amber-bg)" data-action="add-template" data-key="'+_esc(key)+'">';
      h += '<div style="font-size:1rem">⭐</div>';
      h += '<div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">'+_esc(key)+'</div>';
      h += '</div>';
    });
    h += '</div>';
  }
  }

  h += '</div></div>';

  /* Overlay */
  h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.2);z-index:'+(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-modal'))||1300 - 1)+'" data-action="close-library"></div>' + h;

  return h;
}

/* ── Properties Panel ────────────────────────────────────────────────────── */
function _renderPropertiesPanel(){
  var block = _findBlock(state.selectedBlock);
  if(!block) return '';
  _ensurePropsDraft(block);
  _ensureRegistriesLoaded();

  var draft = state.propsDraft || block;
  var catalog = (BE.BLOCK_CATALOG||{})[draft.type] || {};
  var tabs = ((BE.BLOCK_PROPERTIES_SCHEMA||{})[draft.type] || []);
  var activeKey = state.propsTab || (tabs[0] && tabs[0].key) || 'general';
  var activeTab = tabs.find(function(tab){ return tab.key === activeKey; }) || tabs[0];

  var h = '';
  h += '<div style="position:fixed;right:0;top:0;bottom:0;width:400px;background:var(--bg-surface);border-left:1px solid var(--border);z-index:var(--z-modal);box-shadow:var(--shadow-xl);display:flex;flex-direction:column">';

  h += '<div style="padding:var(--space-4);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">';
  h += '<div>';
  h += '<div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--text-tertiary)">'+_t('Bộ thuộc tính','Property Inspector')+'</div>';
  h += '<h3 style="margin:4px 0 0;font-size:var(--text-lg)">'+_esc(catalog.icon||'📦')+' '+_t('Cấu hình Block','Block Config')+'</h3>';
  h += '</div>';
  h += '<button class="hm-btn hm-btn-ghost" data-action="close-props" style="font-size:1.2rem">×</button>';
  h += '</div>';

  h += '<div style="padding:var(--space-3);border-bottom:1px solid var(--border);background:var(--gray-50)">';
  h += '<div style="display:flex;gap:var(--space-2);overflow:auto">';
  tabs.forEach(function(tab){
    h += '<button class="hm-btn '+(activeKey===tab.key?'hm-btn-primary':'hm-btn-ghost')+'" data-action="props-tab" data-tab="'+_esc(tab.key)+'" style="white-space:nowrap">'+_esc(tab.icon||'')+' '+_esc(_t(tab.label,tab.labelEn||tab.label))+'</button>';
  });
  h += '</div>';
  h += '</div>';

  h += '<div style="flex:1;overflow-y:auto;padding:var(--space-4)">';
  h += '<div style="padding:var(--space-3);border:1px solid var(--border);border-radius:var(--radius-md);background:var(--gray-50);margin-bottom:var(--space-4)">';
  h += '<div style="display:flex;justify-content:space-between;gap:var(--space-2);align-items:flex-start">';
  h += '<div><strong style="display:block">'+_esc(_getCatalogLabel(draft.type))+'</strong><span style="font-size:var(--text-xs);color:var(--text-tertiary)">'+_esc(draft.blockId||'')+'</span></div>';
  h += '<span style="font-size:1.2rem">'+_esc(catalog.icon||'📦')+'</span></div>';
  if(catalog.desc) h += '<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-2)">'+_esc(catalog.desc)+'</div>';
  h += '</div>';

  if(state.registries.loading){
    h += '<div style="padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--text-secondary);background:var(--amber-bg);border:1px solid var(--amber);border-radius:var(--radius-md)">'+_t('Đang nạp registry local...','Loading local registries...')+'</div>';
  } else if(state.registries.error){
    h += '<div style="padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--red);background:var(--red-bg);border:1px solid var(--red);border-radius:var(--radius-md);display:flex;justify-content:space-between;gap:var(--space-2);align-items:center">';
    h += '<span>'+_esc(state.registries.error)+'</span>';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="registry-retry">'+_t('Thử lại','Retry')+'</button></div>';
  }

  if(activeTab){
    (activeTab.sections||[]).forEach(function(section){
      h += _renderPropSection(section, draft);
    });
  } else {
    h += '<div class="hm-empty">'+_t('Không tìm thấy property schema cho block này','No property schema was found for this block')+'</div>';
  }

  h += '</div>';
  h += '<div style="padding:var(--space-4);border-top:1px solid var(--border);display:flex;justify-content:space-between;gap:var(--space-2)">';
  h += '<button class="hm-btn hm-btn-secondary" data-action="close-props">'+_t('Đóng','Close')+'</button>';
  h += '<button class="hm-btn hm-btn-primary" data-action="save-props">'+_t('Áp dụng','Apply')+'</button>';
  h += '</div></div>';

  h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.2);z-index:'+(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--z-modal'))||1300 - 1)+'" data-action="close-props"></div>' + h;

  return h;
}

/* ── STEP 3: PREVIEW ─────────────────────────────────────────────────────── */
function _renderPreview(){
  var h = '';
  h += '<div style="margin-bottom:var(--space-4);display:flex;justify-content:space-between;align-items:center">';
  h += '<h2 style="margin:0;font-size:var(--text-lg)">👁 '+_t('Xem trước Module','Module Preview')+'</h2>';
  h += '<div style="display:flex;gap:var(--space-2)">';
  h += '<button class="hm-btn hm-btn-secondary" data-action="back-build">← '+_t('Quay lại Builder','Back to Builder')+'</button>';
  h += '<button class="hm-btn hm-btn-primary" data-action="save-module">💾 '+_t('Lưu & Xuất bản','Save & Publish')+'</button>';
  h += '</div></div>';
  h += '<div id="mb-preview-container" style="border:1px solid var(--border);border-radius:var(--radius-xl);padding:var(--space-4);min-height:400px;background:var(--bg-page)"></div>';

  // Render preview via Module Router after DOM update
  setTimeout(function(){
    var previewEl = document.getElementById('mb-preview-container');
    if(previewEl && state.schema){
      // Use Module Router to render with real API
      if(MR.renderModuleById){
        // Save schema to localStorage so router can find it
        try{ localStorage.setItem('hm_module_schema_'+state.schema.moduleId, JSON.stringify(state.schema)); }catch(e){}
        MR.renderModuleById(previewEl, state.schema.moduleId);
      }
    }
  }, 100);

  return h;
}

/* ── Event Handlers ──────────────────────────────────────────────────────── */
function _handleClick(e){
  var btn = e.target.closest('[data-action]');
  if(!btn) return;
  var action = btn.getAttribute('data-action');

  switch(action){
    case 'pick-icon':
      var icon = btn.getAttribute('data-icon');
      document.getElementById('mb-icon').value = icon;
      state.container.querySelectorAll('[data-action="pick-icon"]').forEach(function(b){ b.style.border=''; });
      btn.style.border = '2px solid var(--brand-2)';
      break;

    case 'create-blank':
      _createBlankModule();
      break;

    case 'open-module':
      var mid = btn.getAttribute('data-id');
      _openSavedModule(mid);
      break;

    case 'delete-module':
      var did = btn.getAttribute('data-id');
      if(confirm(_t('Xóa module này?','Delete this module?'))){
        _deleteSavedModule(did);
        _paint();
      }
      break;

    case 'switch-tab':
      state.activeTab = btn.getAttribute('data-tab');
      state.selectedBlock = null;
      state.showLibrary = false;
      _paint();
      break;

    case 'add-tab':
      var tabName = prompt(_t('Tên tab mới:','New tab name:'));
      if(tabName){
        state.schema.tabs.push({
          tabId: 'tab-'+Date.now().toString(36),
          title: { vi: tabName, en: tabName },
          icon: '',
          blocks: []
        });
        state.activeTab = state.schema.tabs[state.schema.tabs.length-1].tabId;
        _paint();
      }
      break;

    case 'open-library':
      state.showLibrary = true;
      state.selectedBlock = null;
      state.propsDraft = null;
      state.insertTab = btn.getAttribute('data-tab');
      state.insertAfter = btn.getAttribute('data-after') || null;
      _paint();
      break;

    case 'close-library':
      state.showLibrary = false;
      _paint();
      break;

    case 'add-block-type':
      var blockType = btn.getAttribute('data-type');
      _addBlockToSchema(blockType);
      state.showLibrary = false;
      _paint();
      break;

    case 'add-template':
      var tplKey = btn.getAttribute('data-key');
      var tpl = (BE.BLOCK_TEMPLATES||{})[tplKey];
      if(tpl) _addBlockToSchema(tpl.type, tpl.config);
      state.showLibrary = false;
      _paint();
      break;

    case 'config-block':
      _openBlockConfig(btn.getAttribute('data-block'));
      break;

    case 'props-tab':
      state.propsTab = btn.getAttribute('data-tab') || 'general';
      _paint();
      break;

    case 'close-props':
      state.selectedBlock = null;
      state.propsDraft = null;
      _paint();
      break;

    case 'save-props':
      _saveBlockProps();
      state.selectedBlock = null;
      state.propsDraft = null;
      _paint();
      break;

    case 'delete-block':
      var delId = btn.getAttribute('data-block');
      if(confirm(_t('Xóa block này?','Delete this block?'))){
        _removeBlock(delId);
        _paint();
      }
      break;

    case 'duplicate-block':
      _duplicateBlock(btn.getAttribute('data-block'));
      _paint();
      break;

    case 'move-up':
    case 'move-down':
      _moveBlock(btn.getAttribute('data-block'), action==='move-up'?-1:1);
      _paint();
      break;

    case 'collection-add':
      _collectionAdd(btn.getAttribute('data-path'));
      _paint();
      break;

    case 'collection-remove':
      _collectionRemove(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'),10));
      _paint();
      break;

    case 'collection-duplicate':
      _collectionDuplicate(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'),10));
      _paint();
      break;

    case 'collection-up':
    case 'collection-down':
      _collectionMove(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'),10), action==='collection-up'?-1:1);
      _paint();
      break;

    case 'registry-retry':
      state.registries.loading = false;
      state.registries.loaded = false;
      state.registries.error = '';
      _ensureRegistriesLoaded(true);
      _paint();
      break;

    case 'save-module':
      _saveModule();
      break;

    case 'preview-module':
      state.step = 'preview';
      _paint();
      break;

    case 'back-build':
      state.step = 'build';
      _paint();
      break;

    case 'back-setup':
      state.step = 'setup';
      _paint();
      break;
  }
}

function _handleInput(e){
  if(e.target.id === 'mb-lib-search'){
    state.librarySearch = e.target.value;
    _paint();
    return;
  }

  if(e.target.hasAttribute('data-field-path')){
    _updateDraftValue(e.target);
    if(e.target.getAttribute('data-trigger-repaint') === '1') _paint();
  }
}

/* ── Schema Operations ───────────────────────────────────────────────────── */
function _createBlankModule(){
  var nameVi = (document.getElementById('mb-name')||{}).value || 'Module mới';
  var nameEn = (document.getElementById('mb-name-en')||{}).value || 'New Module';
  var route = (document.getElementById('mb-route')||{}).value || '/new-module';
  var icon = (document.getElementById('mb-icon')||{}).value || '📦';
  var tabsStr = (document.getElementById('mb-tabs')||{}).value || 'Tab 1';

  var tabs = tabsStr.split(',').map(function(t, i){
    return {
      tabId: 'tab-'+i+'-'+Date.now().toString(36),
      title: { vi: t.trim(), en: t.trim() },
      icon: '',
      blocks: []
    };
  });

  state.schema = {
    moduleId: 'custom-'+Date.now().toString(36),
    title: { vi: nameVi, en: nameEn },
    subtitle: { vi: '', en: '' },
    icon: icon,
    route: route,
    roles: ['ceo','it_admin'],
    version: 1,
    createdBy: (typeof currentUser!=='undefined' && currentUser) ? currentUser.username : 'admin',
    createdAt: new Date().toISOString(),
    tabs: tabs
  };

  state.selectedBlock = null;
  state.propsDraft = null;
  state.propsTab = 'general';
  state.activeTab = tabs[0].tabId;
  state.step = 'build';
  _paint();
}

function _addBlockToSchema(blockType, preConfig){
  if(!state.schema) return;
  var tab = state.schema.tabs.find(function(t){ return t.tabId === state.insertTab; });
  if(!tab) tab = state.schema.tabs.find(function(t){ return t.tabId === state.activeTab; });
  if(!tab && state.schema.tabs.length) tab = state.schema.tabs[0];
  if(!tab) return;

  var newBlock = _createBlockScaffold(blockType, preConfig);
  newBlock.order = (tab.blocks||[]).length + 1;

  if(state.insertAfter){
    var idx = tab.blocks.findIndex(function(b){ return b.blockId === state.insertAfter; });
    tab.blocks.splice(idx+1, 0, newBlock);
  } else {
    tab.blocks.push(newBlock);
  }
  tab.blocks.forEach(function(b,i){ b.order = i+1; });
  state.selectedBlock = newBlock.blockId;
  state.propsDraft = _clone(newBlock);
  state.propsTab = 'general';
}

function _removeBlock(blockId){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    tab.blocks = (tab.blocks||[]).filter(function(b){ return b.blockId !== blockId; });
    tab.blocks.forEach(function(b,i){ b.order = i+1; });
  });
}

function _duplicateBlock(blockId){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    var idx = (tab.blocks||[]).findIndex(function(b){ return b.blockId === blockId; });
    if(idx >= 0){
      var clone = JSON.parse(JSON.stringify(tab.blocks[idx]));
      clone.blockId = _uid();
      tab.blocks.splice(idx+1, 0, clone);
      tab.blocks.forEach(function(b,i){ b.order = i+1; });
    }
  });
}

function _moveBlock(blockId, direction){
  if(!state.schema) return;
  state.schema.tabs.forEach(function(tab){
    var idx = (tab.blocks||[]).findIndex(function(b){ return b.blockId === blockId; });
    if(idx < 0) return;
    var swap = idx + direction;
    if(swap < 0 || swap >= tab.blocks.length) return;
    var tmp = tab.blocks[idx];
    tab.blocks[idx] = tab.blocks[swap];
    tab.blocks[swap] = tmp;
    tab.blocks.forEach(function(b,i){ b.order = i+1; });
  });
}

function _findBlock(blockId){
  if(!state.schema) return null;
  var found = null;
  state.schema.tabs.forEach(function(tab){
    (tab.blocks||[]).forEach(function(b){
      var currentId = b.blockId || b.id;
      if(currentId === blockId) found = b;
    });
  });
  return found;
}

function _saveBlockProps(){
  var block = _findBlock(state.selectedBlock);
  var draft = state.propsDraft;
  if(!block || !draft) return;
  _applySchemaDefaults(draft, _getBlockSchema(draft.type));
  Object.keys(block).forEach(function(key){ delete block[key]; });
  Object.keys(draft).forEach(function(key){ block[key] = _clone(draft[key]); });
}

function _saveModule(){
  if(!state.schema) return;
  state.schema.version = (state.schema.version||0) + 1;
  state.schema.updatedAt = new Date().toISOString();

  // Save to localStorage
  try{
    localStorage.setItem('hm_module_schema_'+state.schema.moduleId, JSON.stringify(state.schema));
  }catch(e){}

  // Save to saved modules list
  _addToSavedModules(state.schema);

  // Try save to backend
  if(typeof apiCall === 'function'){
    apiCall('module_schema_save', { schema: state.schema }, 'POST', 10000).catch(function(){});
  }

  BE.toast(_t('Đã lưu module: ','Module saved: ')+_t(state.schema.title.vi, state.schema.title.en), 'success');
}

function _loadSavedModules(){
  try{
    var raw = localStorage.getItem('hm_saved_modules');
    state.savedModules = raw ? JSON.parse(raw) : [];
  }catch(e){ state.savedModules = []; }
}

function _addToSavedModules(schema){
  _loadSavedModules();
  var idx = state.savedModules.findIndex(function(m){ return m.moduleId === schema.moduleId; });
  var summary = {
    moduleId: schema.moduleId,
    title: schema.title,
    icon: schema.icon,
    route: schema.route,
    version: schema.version,
    updatedAt: schema.updatedAt
  };
  if(idx >= 0) state.savedModules[idx] = summary;
  else state.savedModules.push(summary);
  try{ localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); }catch(e){}
}

function _openSavedModule(moduleId){
  try{
    var raw = localStorage.getItem('hm_module_schema_'+moduleId);
    if(raw){
      state.schema = JSON.parse(raw);
      _normalizeSchemaBlocks();
      state.selectedBlock = null;
      state.propsDraft = null;
      state.propsTab = 'general';
      state.activeTab = state.schema.tabs && state.schema.tabs.length ? state.schema.tabs[0].tabId : null;
      state.step = 'build';
      _paint();
    }
  }catch(e){}
}

function _deleteSavedModule(moduleId){
  try{ localStorage.removeItem('hm_module_schema_'+moduleId); }catch(e){}
  state.savedModules = state.savedModules.filter(function(m){ return m.moduleId !== moduleId; });
  try{ localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); }catch(e){}
}

function _getCatalogLabel(type){
  var entry = (BE.BLOCK_CATALOG||{})[type];
  return entry ? _t(entry.label, entry.labelEn||entry.label) : type;
}

function _getBlockSchema(type){
  return ((BE.BLOCK_PROPERTIES_SCHEMA||{})[type] || []);
}

function _ensurePropsDraft(block){
  if(!block) return;
  if(state.propsDraft && state.propsDraft.blockId === (block.blockId||block.id)) return;
  state.propsDraft = _clone(block);
  _applySchemaDefaults(state.propsDraft, _getBlockSchema(block.type));
}

function _applySchemaDefaults(target, tabs){
  (tabs||[]).forEach(function(tab){
    (tab.sections||[]).forEach(function(section){
      (section.fields||[]).forEach(function(field){
        if(field.default === undefined) return;
        if(_getByPath(target, field.path) === undefined) _setByPath(target, field.path, _clone(field.default));
      });
    });
  });
  if(!target.blockId && target.id) target.blockId = target.id;
  if(!target.id && target.blockId) target.id = target.blockId;
  if(!target.title) target.title = { vi:'', en:'' };
  if(!target.subtitle) target.subtitle = { vi:'', en:'' };
  if(!target.config) target.config = {};
  return target;
}

function _createBlockScaffold(blockType, preConfig){
  var catalog = (BE.BLOCK_CATALOG||{})[blockType] || {};
  var id = _uid();
  var block = {
    blockId: id,
    id: id,
    type: blockType,
    visible: true,
    title: { vi: catalog.label || blockType, en: catalog.labelEn || blockType },
    subtitle: { vi:'', en:'' },
    config: {}
  };
  _applySchemaDefaults(block, _getBlockSchema(blockType));
  if(preConfig) _mergeDeep(block.config, _clone(preConfig));
  return block;
}

function _openBlockConfig(blockId){
  var block = _findBlock(blockId);
  if(!block) return;
  state.selectedBlock = block.blockId || block.id;
  state.propsTab = 'general';
  state.propsDraft = _clone(block);
  _applySchemaDefaults(state.propsDraft, _getBlockSchema(block.type));
  _ensureRegistriesLoaded();
  _paint();
}

function _normalizeSchemaBlocks(){
  if(!state.schema) return;
  (state.schema.tabs||[]).forEach(function(tab){
    (tab.blocks||[]).forEach(function(block, index){
      if(!block.blockId && block.id) block.blockId = block.id;
      if(!block.id && block.blockId) block.id = block.blockId;
      if(!block.blockId){
        block.blockId = _uid();
        block.id = block.blockId;
      }
      if(block.order == null) block.order = index + 1;
      _applySchemaDefaults(block, _getBlockSchema(block.type));
    });
  });
}

function _renderPropSection(section, draft){
  var h = '';
  h += '<section class="hm-card hm-card-flat" style="margin-bottom:var(--space-3);padding:var(--space-3)">';
  h += '<div style="margin-bottom:var(--space-3)"><div style="font-weight:var(--font-semibold)">'+_esc(_t(section.label,section.labelEn||section.label))+'</div></div>';
  (section.fields||[]).forEach(function(field){
    h += _renderPropField(field, field.path, _getByPath(draft, field.path));
  });
  h += '</section>';
  return h;
}

function _renderPropField(field, path, value){
  var label = _t(field.label, field.labelEn||field.label);
  var h = '<div style="margin-bottom:var(--space-3)">';
  if(field.type === 'collection'){
    h += '<div class="hm-label">'+_esc(label)+'</div>';
    h += _renderCollectionField(field, path, Array.isArray(value) ? value : []);
    h += '</div>';
    return h;
  }
  h += '<label class="hm-label">'+_esc(label)+'</label>';
  h += _renderFieldControl(field, path, value);
  h += '</div>';
  return h;
}

function _renderCollectionField(field, path, items){
  var h = '';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">';
  h += '<div style="font-size:var(--text-xs);color:var(--text-tertiary)">'+_esc((field.itemLabel||'Item')+' × '+items.length)+'</div>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="collection-add" data-path="'+_esc(path)+'">+ '+_esc(field.addLabel||'Add item')+'</button>';
  h += '</div>';
  if(!items.length){
    h += '<div style="padding:var(--space-3);border:1px dashed var(--border);border-radius:var(--radius-md);color:var(--text-tertiary);font-size:var(--text-sm)">'+_t('Chưa có item nào. Bấm nút thêm để bắt đầu.','No items yet. Add one to begin.')+'</div>';
    return h;
  }
  items.forEach(function(item, index){
    h += '<div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2)">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)">';
    h += '<strong style="font-size:var(--text-sm)">'+_esc(_getCollectionItemTitle(field, item, index))+'</strong>';
    h += '<div style="display:flex;gap:2px">';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="collection-up" data-path="'+_esc(path)+'" data-index="'+index+'">▲</button>';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="collection-down" data-path="'+_esc(path)+'" data-index="'+index+'">▼</button>';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="collection-duplicate" data-path="'+_esc(path)+'" data-index="'+index+'">⧉</button>';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="collection-remove" data-path="'+_esc(path)+'" data-index="'+index+'">🗑</button>';
    h += '</div></div>';
    (field.itemFields||[]).forEach(function(itemField){
      var itemPath = path + '.' + index + '.' + itemField.path;
      h += _renderPropField(itemField, itemPath, _getByPath(state.propsDraft, itemPath));
    });
    h += '</div>';
  });
  return h;
}

function _renderFieldControl(field, path, value){
  var type = field.type;
  var attrs = ' data-field-path="'+_esc(path)+'" data-field-type="'+_esc(type)+'"'+(field.repaintOnChange?' data-trigger-repaint="1"':'');
  var placeholder = field.placeholder ? ' placeholder="'+_esc(field.placeholder)+'"' : '';
  var options;
  var textValue = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));

  if(type === 'api-select'){
    return _renderApiSelect(field, path, textValue, attrs, placeholder);
  }
  if(type === 'field-select'){
    return _renderRegistryFieldSelect(field, path, textValue, attrs, placeholder);
  }
  if(type === 'toggle'){
    return '<label style="display:flex;align-items:center;gap:var(--space-2);height:40px"><input type="checkbox"'+attrs+(value?' checked':'')+'> <span style="font-size:var(--text-sm);color:var(--text-secondary)">'+_t('Bat','Enabled')+'</span></label>';
  }
  if(type === 'select' || type === 'formula-select' || type === 'status-set-select' || type === 'iot-connector-select' || type === 'field-type-select' || type === 'workflow-select'){
    options = _getFieldOptions(field);
    if(!options.length){
      return '<input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'>';
    }
    var h = '<select class="hm-input hm-select"'+attrs+'>';
    h += '<option value=""></option>';
    options.forEach(function(option){
      var raw = _normalizeOption(option);
      var selected = String(raw.value) === String(textValue) ? ' selected' : '';
      h += '<option value="'+_esc(raw.value)+'"'+selected+'>'+_esc(raw.label)+'</option>';
    });
    if(textValue && !options.some(function(option){ return String(_normalizeOption(option).value) === String(textValue); })){
      h += '<option value="'+_esc(textValue)+'" selected>'+_esc(textValue)+'</option>';
    }
    h += '</select>';
    return h;
  }
  if(type === 'textarea' || type === 'json' || type === 'code' || type === 'expression'){
    return '<textarea class="hm-input" style="height:'+(field.rows ? (field.rows*28+18) : 104)+'px;font-family:'+(type === 'textarea' ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace')+'"' + attrs + placeholder + '>'+_esc(textValue)+'</textarea>';
  }
  if(type === 'color'){
    return '<input type="color" class="hm-input" style="padding:6px;height:40px"'+attrs+' value="'+_esc(textValue || '#2563eb')+'">';
  }
  if(type === 'number'){
    return '<input type="number" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+(field.min!=null?' min="'+field.min+'"':'')+(field.max!=null?' max="'+field.max+'"':'')+(field.step!=null?' step="'+field.step+'"':'')+placeholder+'>';
  }
  return '<input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'>';
}

function _normalizeOption(option){
  if(option && typeof option === 'object') return { value: option.value, label: option.label || option.labelEn || option.name || option.nameEn || option.value };
  return { value: option, label: option };
}

function _getFieldOptions(field){
  var workflowMap;
  if(field.options) return field.options;
  switch(field.type){
    case 'api-select':
      return (BE.API_CATALOG||[]).map(function(api){
        return { value: api.action, label: api.action + ' - ' + (api.label || api.action) };
      });
    case 'field-select':
      return [];
    case 'formula-select':
      return Object.keys(state.registries.computedFormulas||{}).filter(function(key){ return key !== '_meta'; }).map(function(key){
        var item = state.registries.computedFormulas[key] || {};
        return { value:key, label:key + ' - ' + (item.name || item.label || item.nameEn || item.labelEn || key) };
      });
    case 'status-set-select':
      return Object.keys(state.registries.statusOptions||{}).filter(function(key){ return key !== '_meta'; }).map(function(key){
        var item = state.registries.statusOptions[key] || {};
        return { value:key, label:key + ' - ' + (item.labelEn || item.label || key) };
      });
    case 'iot-connector-select':
      return Object.keys(state.registries.iotConnectors||{}).filter(function(key){ return key !== '_meta'; }).map(function(key){
        var item = state.registries.iotConnectors[key] || {};
        return { value:key, label:key + ' - ' + (item.labelVi || item.label || key) };
      });
    case 'field-type-select':
      return Object.keys(state.registries.fieldTypes||{}).filter(function(key){ return key !== '_meta'; }).map(function(key){
        return { value:key, label:key };
      });
    case 'workflow-select':
      workflowMap = _getWorkflowRegistryMap();
      return Object.keys(workflowMap).map(function(key){
        var workflow = workflowMap[key] || {};
        return { value:key, label:key + ' - ' + (workflow.name || workflow.nameEn || key) };
      });
    default:
      return [];
  }
}

function _getCollectionItemTitle(field, item, index){
  return _getByPath(item,'label.vi')
    || _getByPath(item,'label.en')
    || item.key
    || item.actionId
    || item.signal
    || item.point
    || item.connector
    || item.fieldRef
    || item.valueField
    || item.from
    || item.to
    || ((field.itemLabel||'Item') + ' ' + (index+1));
}

function _createCollectionItem(field){
  var item = {};
  (field.itemFields||[]).forEach(function(itemField){
    if(itemField.default !== undefined) _setByPath(item, itemField.path, _clone(itemField.default));
  });
  return item;
}

function _collectionFieldByPath(path){
  var tabs = _getBlockSchema((state.propsDraft||{}).type);
  var found = null;
  tabs.forEach(function(tab){
    (tab.sections||[]).forEach(function(section){
      (section.fields||[]).forEach(function(field){
        if(field.type === 'collection' && field.path === path) found = field;
      });
    });
  });
  return found;
}

function _collectionAdd(path){
  if(!state.propsDraft) return;
  var field = _collectionFieldByPath(path);
  var items = _getByPath(state.propsDraft, path);
  if(!Array.isArray(items)){
    items = [];
    _setByPath(state.propsDraft, path, items);
  }
  items.push(_createCollectionItem(field || {}));
}

function _collectionRemove(path, index){
  var items = _getByPath(state.propsDraft, path);
  if(!Array.isArray(items)) return;
  items.splice(index, 1);
}

function _collectionDuplicate(path, index){
  var items = _getByPath(state.propsDraft, path);
  if(!Array.isArray(items) || !items[index]) return;
  items.splice(index + 1, 0, _clone(items[index]));
}

function _collectionMove(path, index, direction){
  var items = _getByPath(state.propsDraft, path);
  var swap = index + direction;
  var tmp;
  if(!Array.isArray(items) || swap < 0 || swap >= items.length) return;
  tmp = items[index];
  items[index] = items[swap];
  items[swap] = tmp;
}

function _updateDraftValue(target){
  var path = target.getAttribute('data-field-path');
  var type = target.getAttribute('data-field-type');
  var value = target.value;
  if(!state.propsDraft || !path) return;

  if(type === 'toggle'){
    _setByPath(state.propsDraft, path, !!target.checked);
    return;
  }
  if(type === 'number'){
    _setByPath(state.propsDraft, path, value === '' ? 0 : Number(value));
    return;
  }
  if(type === 'json'){
    try {
      _setByPath(state.propsDraft, path, value ? JSON.parse(value) : {});
    } catch(err){
      _setByPath(state.propsDraft, path, value);
    }
    return;
  }
  _setByPath(state.propsDraft, path, value);
}

function _ensureRegistriesLoaded(force){
  if(state.registries.loading) return;
  if(state.registries.loaded && !force) return;

  var HR = window.HmRegistry;

  // ── Path A: HmRegistry available → delegate to centralized service ──
  if(HR && typeof HR.init === 'function'){
    state.registries.loading = true;
    state.registries.error = '';
    state.registries.loadingMessage = _t('Đang nạp metadata từ HmRegistry...', 'Loading from HmRegistry...');

    HR.init(function(){
      // Populate state.registries from HmRegistry cache (backward compat)
      state.registries.fieldTypes       = HR.raw('field-types') || {};
      state.registries.statusOptions    = HR.raw('status-options') || {};
      state.registries.computedFormulas = HR.raw('computed-formulas') || {};
      state.registries.iotConnectors    = HR.raw('iot-connectors') || (BE.IOT_CONNECTORS || {});

      // Lazy-load remaining registries via HmRegistry preload
      var remaining = 5;
      function _onLazy(){ remaining--; if(remaining <= 0){ _finishRegistryLoad(); } }

      HR.preload('validation-rules', function(d){ state.registries.validationRules = d || {}; _onLazy(); });
      HR.preload('workflow-library', function(d){ state.registries.workflows = d || {}; _onLazy(); });
      HR.preload('domain-field-packs', function(d){ state.registries.domainPacks = d || {}; _onLazy(); });
      HR.preload('relation-map', function(d){ state.registries.relationMap = d || {}; _onLazy(); });
      HR.preload('endpoint-catalog', function(d){ state.registries.endpointCatalog = d || {}; _onLazy(); });
    });
    return;
  }

  // ── Path B: HmRegistry NOT available → fallback to legacy direct fetch ──
  if(typeof fetch !== 'function') return;
  state.registries.loading = true;
  state.registries.error = '';
  state.registries.loadingMessage = _t('Đang nạp metadata từ registry...', 'Loading registry metadata...');
  Promise.all([
    _loadRegistry('field-types', 'fieldTypes'),
    _loadRegistry('status-options', 'statusOptions'),
    _loadRegistry('computed-formulas', 'computedFormulas'),
    _loadRegistry('iot-connectors', 'iotConnectors'),
    _loadRegistry('validation-rules', 'validationRules'),
    _loadRegistry('workflow-library', 'workflows'),
    _loadRegistry('domain-field-packs', 'domainPacks'),
    _loadRegistry('relation-map', 'relationMap'),
    _loadRegistry('endpoint-catalog', 'endpointCatalog')
  ]).then(function(){
    _finishRegistryLoad();
  }).catch(function(){
    state.registries.loading = false;
    state.registries.loadingMessage = '';
    state.registries.error = _t('Không thể nạp một phần registry local. Bạn vẫn có thể nhập tay.','Could not load one or more local registries. You can still enter values manually.');
    if(state.selectedBlock) _paint();
  });
}

function _finishRegistryLoad(){
  state.registries.loading = false;
  state.registries.loadingMessage = '';
  state.registries.loaded = true;
  _applyEndpointCatalog();
  if(state.container) _paint();
}

function _endpointCatalogItems(){
  var raw = state.registries.endpointCatalog || {};
  var endpoints = raw.endpoints || raw;
  if(Array.isArray(endpoints)) return endpoints;
  return Object.keys(endpoints || {}).filter(function(key){ return key !== '_meta'; }).map(function(key){
    return endpoints[key];
  });
}

function _applyEndpointCatalog(){
  var items = _endpointCatalogItems();
  if(!items.length) return;
  BE.API_CATALOG = items;
  if(window.HmBlockEngine) window.HmBlockEngine.API_CATALOG = items;
}

function _getApiCatalogOptions(){
  var items = (BE.API_CATALOG && BE.API_CATALOG.length ? BE.API_CATALOG : _endpointCatalogItems()) || [];
  return items.map(function(api){
    var value = '';
    var label = '';
    var category = '';
    var method = '';
    if(api && typeof api === 'object'){
      value = api.action || api.value || api.key || api.id || '';
      label = api.label || api.labelVi || api.labelEn || api.name || api.description || '';
      category = api.module || api.domain || api.category || '';
      method = api.method || '';
    } else {
      value = String(api == null ? '' : api);
    }
    if(!value) return null;
    return {
      value: value,
      label: label || value,
      displayLabel: value + (label && label !== value ? ' - ' + label : ''),
      category: category,
      method: method
    };
  }).filter(function(option){
    return !!option;
  });
}

function _sanitizeRegistryFieldList(items){
  if(!Array.isArray(items)) return [];
  return items.reduce(function(list, item){
    if(item == null) return list;
    if(typeof item === 'string' || typeof item === 'number'){
      list.push({ key: String(item), label: String(item), type: 'text' });
      return list;
    }
    if(typeof item === 'object' && item.key != null && item.key !== ''){
      list.push(item);
    }
    return list;
  }, []);
}

function _cacheRegistryFieldList(key, items){
  var normalized = _sanitizeRegistryFieldList(items);
  state.registries.dataFields[key] = normalized;
  return normalized;
}

function _trackPendingApiSelection(path){
  state.pendingApiSelectionSeq = (state.pendingApiSelectionSeq || 0) + 1;
  if(!state.pendingApiSelection) state.pendingApiSelection = {};
  state.pendingApiSelection[path] = state.pendingApiSelectionSeq;
  return state.pendingApiSelectionSeq;
}

function _isPendingApiSelectionCurrent(path, token){
  return !!state.pendingApiSelection && state.pendingApiSelection[path] === token;
}

function _loadRegistry(file, key){
  var fallback = key === 'iotConnectors' ? (BE.IOT_CONNECTORS||{}) : {};
  return _fetchJsonWithFallback(_registryPaths(file), 0).catch(function(){
    return fallback;
  }).then(function(data){
    state.registries[key] = data || {};
    return data;
  });
}

function _loadDataFieldsRegistry(){
  return _fetchJsonWithFallback(_registryPaths('data-fields'), 0).then(function(data){
    var parts = Array.isArray(data && data.parts) ? data.parts : (data && data._meta && Array.isArray(data._meta.parts) ? data._meta.parts : []);
    if(!parts.length){
      state.registries.dataFields = data || {};
      return state.registries.dataFields;
    }
    return Promise.all(parts.map(function(part){
      var file = String((part && part.file) || '').replace(/\.json$/i, '');
      if(!file) return Promise.resolve({});
      return _fetchJsonWithFallback(_registryPaths(file), 0).catch(function(){ return {}; });
    })).then(function(payloads){
      var merged = data || {};
      payloads.forEach(function(payload){
        Object.keys(payload || {}).forEach(function(key){
          if(key === '_meta') return;
          merged[key] = payload[key];
        });
      });
      state.registries.dataFields = merged;
      return merged;
    });
  });
}

function _loadRegistryText(file){
  return _fetchTextWithFallback(_registryPaths(file), 0);
}

function _registryPaths(file){
  return [
    'qms-data/registry/' + file + '.json',
    './qms-data/registry/' + file + '.json',
    '/qms-data/registry/' + file + '.json',
    '01-QMS-Portal/qms-data/registry/' + file + '.json',
    './01-QMS-Portal/qms-data/registry/' + file + '.json',
    '/01-QMS-Portal/qms-data/registry/' + file + '.json'
  ];
}

function _fetchJsonWithFallback(paths, index){
  if(index >= paths.length) return Promise.reject(new Error('not-found'));
  return fetch(paths[index], { cache:'no-store' }).then(function(resp){
    if(!resp.ok) throw new Error('bad-response');
    return resp.json();
  }).catch(function(){
    return _fetchJsonWithFallback(paths, index + 1);
  });
}

function _fetchTextWithFallback(paths, index){
  if(index >= paths.length) return Promise.reject(new Error('not-found'));
  return fetch(paths[index], { cache:'no-store' }).then(function(resp){
    if(!resp.ok) throw new Error('bad-response');
    return resp.text();
  }).catch(function(){
    return _fetchTextWithFallback(paths, index + 1);
  });
}

function _toastBuilder(message, type){
  if(BE.toast) BE.toast(message, type || 'info');
}

function _normalizeSearchText(value){
  var text = String(value == null ? '' : value).toLowerCase();
  if(typeof text.normalize === 'function'){
    try {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch(err){}
  }
  return text;
}

function _safeBindingKey(value){
  var text = String(value == null ? '' : value).replace(/[^A-Za-z0-9_]/g, '_');
  if(!text) return 'block_ref';
  if(/^[0-9]/.test(text)) text = 'block_' + text;
  return text;
}

function _humanizeKey(key){
  return String(key == null ? '' : key).replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b([a-z])/g, function(all, ch){
    return ch.toUpperCase();
  }).trim();
}

function _highlightRegistryMatch(text, query){
  var raw = String(text == null ? '' : text);
  var haystack = _normalizeSearchText(raw);
  var needle = _normalizeSearchText(query);
  var index;
  if(!needle) return _esc(raw);
  index = haystack.indexOf(needle);
  if(index < 0) return _esc(raw);
  return _esc(raw.slice(0, index)) + '<mark>' + _esc(raw.slice(index, index + needle.length)) + '</mark>' + _esc(raw.slice(index + needle.length));
}

function _fieldTypeLabel(type){
  var map = {
    string: 'string',
    textarea: 'textarea',
    number: 'number',
    integer: 'integer',
    date: 'date',
    datetime: 'datetime',
    boolean: 'boolean',
    badge: 'badge',
    select: 'select',
    currency: 'currency',
    percent: 'percent',
    percentage: 'percentage',
    email: 'email',
    phone: 'phone',
    file: 'file'
  };
  return map[type] || type || 'text';
}

function _getWorkflowRegistryMap(){
  var workflows = state.registries.workflows || {};
  return workflows.workflows || workflows;
}

function _getDomainPackMap(){
  var packs = state.registries.domainPacks || {};
  return packs.packs || packs;
}

function _getValidationRuleList(){
  var rules = state.registries.validationRules || {};
  return rules.rules || [];
}

function _getRelationList(){
  var relationMap = state.registries.relationMap || {};
  return relationMap.relations || [];
}

function _getRelationEntityMap(){
  var relationMap = state.registries.relationMap || {};
  return relationMap.entities || {};
}

function _dataFieldKeyCandidates(api){
  var candidates = [];
  var raw = String(api || '');
  function add(value){
    if(value && candidates.indexOf(value) < 0) candidates.push(value);
  }
  add(raw);
  add(raw.replace(/[\.\/]/g, '_'));
  add(raw.replace(/[^A-Za-z0-9_]/g, '_'));
  if(/_detail$/.test(raw)) add(raw.replace(/_detail$/, '_list'));
  if(/_workspace$/.test(raw)) add(raw.replace(/_workspace$/, '_list'));
  if(/_workspace_meta$/.test(raw)) add(raw.replace(/_workspace_meta$/, '_list'));
  return candidates.filter(function(item){ return !!item; });
}

function _extractNamedJsonArray(text, key){
  var marker = '"' + String(key).replace(/"/g, '\\"') + '"';
  var markerIndex = text.indexOf(marker);
  var start = -1;
  var depth = 0;
  var inString = false;
  var escapeNext = false;
  var i;
  var ch = '';
  if(markerIndex < 0) return null;
  for(i = markerIndex + marker.length; i < text.length; i++){
    ch = text.charAt(i);
    if(ch === '['){
      start = i;
      break;
    }
    if(ch !== ':' && /\S/.test(ch)) return null;
  }
  if(start < 0) return null;
  for(i = start; i < text.length; i++){
    ch = text.charAt(i);
    if(inString){
      if(escapeNext){
        escapeNext = false;
      } else if(ch === '\\'){
        escapeNext = true;
      } else if(ch === '"'){
        inString = false;
      }
      continue;
    }
    if(ch === '"'){
      inString = true;
      continue;
    }
    if(ch === '['){
      depth++;
      continue;
    }
    if(ch === ']'){
      depth--;
      if(depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function _ensureDataFieldsForApi(api, force){
  var candidates;
  var loadingKey;
  var promise;
  var HR = window.HmRegistry;
  if(!api) return Promise.resolve([]);
  candidates = _dataFieldKeyCandidates(api);
  candidates.forEach(function(candidate){
    if(Array.isArray(state.registries.dataFields[candidate]) && !Array.isArray(state.registries.dataFields[api])){
      state.registries.dataFields[api] = _cacheRegistryFieldList(candidate, state.registries.dataFields[candidate]);
    }
  });
  if(Array.isArray(state.registries.dataFields[api]) && !force){
    return Promise.resolve(_cacheRegistryFieldList(api, state.registries.dataFields[api]));
  }
  loadingKey = candidates.join('|');
  if(state.registries.dataFieldsLoading[loadingKey] && !force) return state.registries.dataFieldsLoading[loadingKey];
  state.registries.loading = true;
  state.registries.loadingMessage = _t('Đang nạp trường dữ liệu cho API: ', 'Loading field metadata for API: ') + api;
  promise = ((HR && typeof HR.preload === 'function')
    ? new Promise(function(resolve){
        HR.preload('data-fields', function(data){
          state.registries.dataFields = data || {};
          resolve(state.registries.dataFields);
        });
      })
    : _loadDataFieldsRegistry()).then(function(dataMap){
    var parsed = [];
    var i;
    dataMap = dataMap || {};
    for(i = 0; i < candidates.length; i++){
      if(Array.isArray(dataMap[candidates[i]])){
        parsed = _cacheRegistryFieldList(candidates[i], dataMap[candidates[i]]);
        state.registries.dataFields[api] = parsed;
        return parsed;
      }
    }
    return _cacheRegistryFieldList(api, []);
  }).then(function(fields){
    delete state.registries.dataFieldsLoading[loadingKey];
    state.registries.loading = false;
    state.registries.loadingMessage = '';
    return _cacheRegistryFieldList(api, fields);
  }, function(){
    delete state.registries.dataFieldsLoading[loadingKey];
    state.registries.loading = false;
    state.registries.loadingMessage = '';
    state.registries.error = _t('Không thể nạp danh sách trường cho API đã chọn. Bạn vẫn có thể nhập tay.', 'Could not load fields for the selected API. You can still type manually.');
    return _cacheRegistryFieldList(api, []);
  });
  state.registries.dataFieldsLoading[loadingKey] = promise;
  return promise;
}

function _getRegistryFieldsForApi(api){
  var candidates;
  var i;
  if(!api) return [];
  if(Array.isArray(state.registries.dataFields[api])){
    return _cacheRegistryFieldList(api, state.registries.dataFields[api]);
  }
  candidates = _dataFieldKeyCandidates(api);
  for(i = 0; i < candidates.length; i++){
    if(Array.isArray(state.registries.dataFields[candidates[i]])){
      return _cacheRegistryFieldList(candidates[i], state.registries.dataFields[candidates[i]]);
    }
  }
  return [];
}

function _renderRegistryFieldSelect(field, path, textValue, attrs, placeholder){
  var api = _getByPath(state.propsDraft, 'config.dataSource.api');
  var loadingKey = _dataFieldKeyCandidates(api).join('|');
  var search = state.fieldSearch[path] || '';
  var allFields = _getRegistryFieldsForApi(api);
  var grouped = {};
  var orderedGroups = ['general', 'dimensions', 'cost', 'quality', 'scheduling', 'compliance', 'traceability'];
  var filtered = [];
  var exists = false;
  var h = '';
  if(!api){
    return '<div class="mb-field-select-wrap"><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Chọn API endpoint trước để builder gợi ý đúng trường dữ liệu.', 'Choose an API endpoint first so the builder can suggest available fields.')+'</div></div>';
  }
  if(!allFields.length && !state.registries.dataFieldsLoading[loadingKey]){
    _ensureDataFieldsForApi(api).then(function(){
      if(state.selectedBlock) _paint();
    });
  }
  if(state.registries.dataFieldsLoading[loadingKey]){
    return '<div class="mb-field-select-wrap"><div class="mb-inline-loading"><span class="mb-spinner"></span><span>'+_t('Đang nạp trường dữ liệu cho API ', 'Loading fields for API ')+'<code>'+_esc(api)+'</code></span></div><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Builder sẽ tự chuyển sang dropdown khi registry trả về schema endpoint.', 'The builder will switch to a dropdown when the endpoint schema arrives.')+'</div></div>';
  }
  if(!allFields.length){
    return '<div class="mb-field-select-wrap"><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Registry chưa có schema cho API này. Bạn vẫn có thể nhập key trường thủ công.', 'No registry schema is available for this API yet. You can still type a field key manually.')+'</div></div>';
  }
  filtered = allFields.filter(function(item){
    var haystack = _normalizeSearchText((item.key || '') + ' ' + (item.label || '') + ' ' + (item.labelEn || ''));
    return !search || haystack.indexOf(_normalizeSearchText(search)) >= 0;
  });
  filtered.forEach(function(item){
    var groupKey = item.group || 'general';
    if(!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(item);
    if(String(item.key) === String(textValue)) exists = true;
  });
  h += '<div class="mb-field-select-wrap">';
  h += '<input type="text" class="hm-input hm-input-sm" data-field-search-path="'+_esc(path)+'" placeholder="'+_t('Tìm key, nhãn VI hoặc nhãn EN...', 'Search by key, VI label, or EN label...')+'" value="'+_esc(search)+'">';
  h += '<select class="hm-input hm-select"'+attrs+'>';
  h += '<option value=""></option>';
  orderedGroups.concat(Object.keys(grouped).filter(function(key){ return orderedGroups.indexOf(key) < 0; })).forEach(function(groupKey){
    var items = grouped[groupKey] || [];
    if(!items.length) return;
    h += '<optgroup label="'+_esc(_humanizeKey(groupKey))+' ('+items.length+')">';
    items.forEach(function(item){
      var meta = [];
      var selected = String(item.key) === String(textValue) ? ' selected' : '';
      meta.push(_fieldTypeLabel(item.type));
      if(item.required) meta.push(_t('bắt buộc', 'required'));
      if(item.constraints && item.constraints.maxLength) meta.push('≤ ' + item.constraints.maxLength);
      h += '<option value="'+_esc(item.key)+'"'+selected+'>'+_esc((item.label || item.labelEn || item.key) + ' (' + item.key + ') — ' + meta.join(', '))+'</option>';
    });
    h += '</optgroup>';
  });
  if(textValue && !exists){
    h += '<option value="'+_esc(textValue)+'" selected>'+_esc(textValue)+'</option>';
  }
  h += '</select>';
  h += '<div class="mb-field-hint">'+_t('Schema đang lấy từ registry endpoint ', 'Schema is sourced from registry endpoint ')+'<code>'+_esc(api)+'</code></div>';
  if(search){
    if(filtered.length){
      h += '<div class="mb-field-match-list">';
      filtered.slice(0, 5).forEach(function(item){
        h += '<div class="mb-field-match-item"><strong>'+_highlightRegistryMatch(item.label || item.key, search)+'</strong><span>'+_highlightRegistryMatch(item.key, search)+' • '+_esc(_fieldTypeLabel(item.type))+'</span></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="mb-field-hint">'+_t('Không có trường nào khớp với từ khóa vừa nhập.', 'No fields matched the current keyword.')+'</div>';
    }
  }
  h += '</div>';
  return h;
}

function _renderApiSelect(field, path, textValue, attrs, placeholder){
  var search = state.apiSearch[path];
  var options = _getApiCatalogOptions();
  var normalizedSearch;
  var filtered = [];
  var visible = [];
  var initialLimit = 80;
  var limit = 120;
  var selectedOption = null;
  var h = '';
  if(search == null) search = textValue || '';
  normalizedSearch = _normalizeSearchText(search);
  filtered = options.filter(function(option){
    var haystack = _normalizeSearchText((option.value || '') + ' ' + (option.label || '') + ' ' + (option.category || '') + ' ' + (option.method || ''));
    return !normalizedSearch || haystack.indexOf(normalizedSearch) >= 0;
  });
  visible = normalizedSearch ? filtered.slice(0, limit) : filtered.slice(0, initialLimit);
  if(textValue){
    selectedOption = options.filter(function(option){
      return String(option.value) === String(textValue);
    })[0] || { value: textValue, displayLabel: textValue, category: '', method: '' };
    if(!visible.some(function(option){ return String(option.value) === String(textValue); })){
      visible = [selectedOption].concat(visible);
    }
  }
  if(!options.length){
    return '<div class="mb-field-select-wrap"><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Chua tai duoc API catalog. Ban van co the nhap endpoint thu cong.', 'API catalog is not available yet. You can still enter an endpoint manually.')+'</div></div>';
  }
  h += '<div class="mb-field-select-wrap">';
  h += '<input type="text" class="hm-input hm-input-sm" data-api-search-path="'+_esc(path)+'" placeholder="'+_t('Tim endpoint, module hoac ten API...', 'Search endpoint, module, or API label...')+'" value="'+_esc(search)+'">';
  h += '<select class="hm-input hm-select"'+attrs+'>';
  h += '<option value=""></option>';
  visible.forEach(function(option){
    var selected = String(option.value) === String(textValue) ? ' selected' : '';
    var meta = [option.method, option.category].filter(Boolean).join(' | ');
    h += '<option value="'+_esc(option.value)+'"'+selected+'>'+_esc(option.displayLabel + (meta ? ' [' + meta + ']' : ''))+'</option>';
  });
  h += '</select>';
  h += '<div class="mb-combo-meta"><span>'+_t('Hien thi ', 'Showing ') + visible.length + ' / ' + filtered.length + ' ' + _t('API', 'APIs') + '</span><span>'+_t('Search truoc roi moi chon trong danh sach.', 'Search first, then pick from the list.')+'</span></div>';
  if(normalizedSearch && filtered.length > limit){
    h += '<div class="mb-field-hint">'+_t('Ket qua dang gioi han o 120 API dau tien. Hay bo sung keyword de loc sat hon.', 'Results are capped to the first 120 APIs. Add more keywords to narrow further.')+'</div>';
  } else if(!normalizedSearch && filtered.length > initialLimit){
    h += '<div class="mb-field-hint">'+_t('Builder chi hien thi 80 API dau tien khi chua search. Dung o tim kiem de tranh dropdown qua dai.', 'The builder only shows the first 80 APIs until you search. Use search to avoid an oversized dropdown.')+'</div>';
  }
  h += '</div>';
  return h;
}

function _renderRegistryFieldSelect(field, path, textValue, attrs, placeholder){
  var api = _getByPath(state.propsDraft, 'config.dataSource.api');
  var loadingKey = _dataFieldKeyCandidates(api).join('|');
  var search = state.fieldSearch[path] || '';
  var filterState = state.fieldFilter[path] || {};
  var groupFilter = filterState.group || '';
  var typeFilter = filterState.type || '';
  var normalizedSearch = _normalizeSearchText(search);
  var allFields = _sanitizeRegistryFieldList(_getRegistryFieldsForApi(api));
  var grouped = {};
  var orderedGroups = ['general', 'dimensions', 'cost', 'quality', 'scheduling', 'compliance', 'traceability'];
  var availableGroups = {};
  var availableTypes = {};
  var filtered = [];
  var visible = [];
  var visibleLimit = 120;
  var exists = false;
  var h = '';
  if(!api){
    return '<div class="mb-field-select-wrap"><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Chon API endpoint truoc de builder goi y dung truong du lieu.', 'Choose an API endpoint first so the builder can suggest available fields.')+'</div></div>';
  }
  if(!allFields.length && !state.registries.dataFieldsLoading[loadingKey]){
    _ensureDataFieldsForApi(api).then(function(){
      if(state.selectedBlock) _paint();
    });
  }
  if(state.registries.dataFieldsLoading[loadingKey]){
    return '<div class="mb-field-select-wrap"><div class="mb-inline-loading"><span class="mb-spinner"></span><span>'+_t('Dang nap truong du lieu cho API ', 'Loading fields for API ')+'<code>'+_esc(api)+'</code></span></div><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Builder se chuyen sang dropdown sau khi registry tra ve schema endpoint.', 'The builder will switch to a dropdown when the endpoint schema arrives.')+'</div></div>';
  }
  if(!allFields.length){
    return '<div class="mb-field-select-wrap"><input type="text" class="hm-input"'+attrs+' value="'+_esc(textValue)+'"'+placeholder+'><div class="mb-field-hint">'+_t('Registry chua co schema cho API nay. Ban van co the nhap key truong thu cong.', 'No registry schema is available for this API yet. You can still type a field key manually.')+'</div></div>';
  }
  allFields.forEach(function(item){
    availableGroups[item.group || 'general'] = true;
    availableTypes[item.type || 'text'] = true;
  });
  filtered = allFields.filter(function(item){
    var groupKey = item.group || 'general';
    var typeKey = item.type || 'text';
    var haystack = _normalizeSearchText((item.key || '') + ' ' + (item.label || '') + ' ' + (item.labelEn || ''));
    if(groupFilter && groupKey !== groupFilter) return false;
    if(typeFilter && typeKey !== typeFilter) return false;
    return !normalizedSearch || haystack.indexOf(normalizedSearch) >= 0;
  });
  visible = filtered.slice(0, visibleLimit);
  visible.forEach(function(item){
    var groupKey = item.group || 'general';
    if(!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(item);
    if(String(item.key) === String(textValue)) exists = true;
  });
  h += '<div class="mb-field-select-wrap">';
  h += '<div class="mb-field-filter-row">';
  h += '<input type="text" class="hm-input hm-input-sm" data-field-search-path="'+_esc(path)+'" placeholder="'+_t('Tim key, nhan VI hoac nhan EN...', 'Search by key, VI label, or EN label...')+'" value="'+_esc(search)+'">';
  h += '<select class="hm-input hm-select hm-input-sm" data-field-group-filter-path="'+_esc(path)+'"><option value="">'+_esc(_t('Tat ca nhom', 'All groups'))+'</option>';
  orderedGroups.concat(Object.keys(availableGroups).filter(function(key){ return orderedGroups.indexOf(key) < 0; }).sort()).forEach(function(groupKey){
    var selected = groupKey === groupFilter ? ' selected' : '';
    h += '<option value="'+_esc(groupKey)+'"'+selected+'>'+_esc(_humanizeKey(groupKey))+'</option>';
  });
  h += '</select>';
  h += '<select class="hm-input hm-select hm-input-sm" data-field-type-filter-path="'+_esc(path)+'"><option value="">'+_esc(_t('Tat ca kieu', 'All types'))+'</option>';
  Object.keys(availableTypes).sort().forEach(function(typeKey){
    var selected = typeKey === typeFilter ? ' selected' : '';
    h += '<option value="'+_esc(typeKey)+'"'+selected+'>'+_esc(_fieldTypeLabel(typeKey))+'</option>';
  });
  h += '</select>';
  h += '</div>';
  h += '<select class="hm-input hm-select"'+attrs+'>';
  h += '<option value=""></option>';
  orderedGroups.concat(Object.keys(grouped).filter(function(key){ return orderedGroups.indexOf(key) < 0; })).forEach(function(groupKey){
    var items = grouped[groupKey] || [];
    if(!items.length) return;
    h += '<optgroup label="'+_esc(_humanizeKey(groupKey))+' ('+items.length+')">';
    items.forEach(function(item){
      var meta = [];
      var selected = String(item.key) === String(textValue) ? ' selected' : '';
      meta.push(_fieldTypeLabel(item.type));
      if(item.required) meta.push(_t('bat buoc', 'required'));
      if(item.constraints && item.constraints.maxLength) meta.push('<= ' + item.constraints.maxLength);
      h += '<option value="'+_esc(item.key)+'"'+selected+'>'+_esc((item.label || item.labelEn || item.key) + ' (' + item.key + ') - ' + meta.join(', '))+'</option>';
    });
    h += '</optgroup>';
  });
  if(textValue && !exists){
    h += '<option value="'+_esc(textValue)+'" selected>'+_esc(textValue)+'</option>';
  }
  h += '</select>';
  h += '<div class="mb-field-hint">'+_t('Schema dang lay tu registry endpoint ', 'Schema is sourced from registry endpoint ')+'<code>'+_esc(api)+'</code></div>';
  h += '<div class="mb-combo-meta"><span>'+_t('Hien thi ', 'Showing ') + visible.length + ' / ' + filtered.length + ' ' + _t('truong', 'fields') + '</span><span>'+_t('Loc theo nhom va kieu du lieu de tranh dropdown qua dai.', 'Filter by group and data type to avoid oversized dropdowns.')+'</span></div>';
  if(filtered.length > visibleLimit){
    h += '<div class="mb-field-hint">'+_t('Danh sach dang gioi han o 120 field dau tien. Hay them keyword hoac filter de thu hep ket qua.', 'The list is capped to the first 120 fields. Add a keyword or filter to narrow the results.')+'</div>';
  }
  if(search){
    if(filtered.length){
      h += '<div class="mb-field-match-list">';
      filtered.slice(0, 5).forEach(function(item){
        h += '<div class="mb-field-match-item"><strong>'+_highlightRegistryMatch(item.label || item.key, search)+'</strong><span>'+_highlightRegistryMatch(item.key, search)+' | '+_esc(_fieldTypeLabel(item.type))+'</span></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="mb-field-hint">'+_t('Khong co truong nao khop voi bo loc hien tai.', 'No fields matched the current filters.')+'</div>';
    }
  }
  h += '</div>';
  return h;
}

function _entityAliasMap(){
  return {
    quote: ['quote', 'quote_header', 'quoting'],
    sales_order: ['sales_order', 'salesorder', 'so', 'so_header', 'order_so'],
    job_order: ['job_order', 'joborder', 'jo', 'jo_header', 'order_jo'],
    work_order: ['work_order', 'workorder', 'wo', 'wo_header', 'order_wo'],
    work_order_operation: ['work_order_operation', 'wo_operation', 'operation'],
    work_order_material: ['work_order_material', 'wo_material'],
    work_order_labor: ['work_order_labor', 'wo_labor'],
    ncr: ['ncr', 'nonconformance'],
    capa: ['capa'],
    goods_receipt: ['goods_receipt', 'goodsreceipt', 'gr', 'gr_header'],
    receiving_inspection: ['receiving_inspection', 'inspection_receiving', 'ri'],
    purchase_order: ['purchase_order', 'purchaseorder', 'po', 'po_header'],
    supplier: ['supplier'],
    inspection_lot: ['inspection_lot', 'inspectionlot'],
    lot: ['lot'],
    item: ['item'],
    bom_header: ['bom_header', 'bom'],
    routing_header: ['routing_header', 'routing'],
    document: ['document', 'doc'],
    doc_master: ['doc_master'],
    customer_complaint: ['customer_complaint', 'complaint'],
    audit_finding: ['audit_finding'],
    supplier_audit: ['supplier_audit'],
    ppap: ['ppap'],
    fai: ['fai'],
    special_process: ['special_process'],
    machine_setup: ['machine_setup'],
    tool_management: ['tool_management']
  };
}

function _aliasCandidatesForEntity(entity, api){
  var aliases = _entityAliasMap();
  var list = aliases[entity] ? aliases[entity].slice() : [];
  function add(value){
    if(value && list.indexOf(value) < 0) list.push(value);
  }
  add(String(entity || ''));
  if(api){
    String(api).split(/[^A-Za-z0-9]+/).forEach(function(token){ add(token); });
  }
  return list;
}

function _inferEntityFromApi(api){
  var text = _normalizeSearchText(api);
  var aliases = _entityAliasMap();
  var relationEntities = Object.keys(_getRelationEntityMap());
  var candidates = relationEntities.length ? relationEntities : Object.keys(aliases);
  var best = '';
  var bestScore = -1;
  candidates.forEach(function(entity){
    _aliasCandidatesForEntity(entity).forEach(function(alias){
      var normalized = _normalizeSearchText(alias).replace(/_/g, '');
      var score = normalized && text.indexOf(normalized) >= 0 ? normalized.length : -1;
      if(score > bestScore){
        bestScore = score;
        best = entity;
      }
    });
  });
  return best || '';
}

function _statusOptionsForSet(statusSet){
  var set = (state.registries.statusOptions || {})[statusSet] || {};
  return set.options || [];
}

function _matchStatusSetForField(api, field, entity){
  var key = String(field && field.key || '').toLowerCase();
  var aliases = _aliasCandidatesForEntity(entity, api);
  var candidates = [];
  function add(value){
    if(value && candidates.indexOf(value) < 0) candidates.push(value);
  }
  add(field && field.statusSet);
  add(key);
  if(key.indexOf('severity') >= 0) add('severity');
  if(key.indexOf('priority') >= 0) add('priority');
  if(key.indexOf('disposition') >= 0) add('disposition');
  if(key.indexOf('shift') >= 0) add('shift_code');
  if(key.indexOf('workflow') >= 0) add('workflow_status');
  if(key.indexOf('digital_thread') >= 0) add('digital_thread_status');
  if(field && field.type === 'badge' || key === 'status' || key.indexOf('status') >= 0){
    aliases.forEach(function(alias){
      add(alias + '_status');
    });
    add('workflow_status');
  }
  return candidates.filter(function(candidate){
    return !!(state.registries.statusOptions || {})[candidate];
  })[0] || '';
}

function _scoreRegistryField(field){
  var score = 0;
  var key = String(field && field.key || '').toLowerCase();
  if(!field) return score;
  if(field.required) score += 16;
  if(field.sortable) score += 10;
  if(field.filterable) score += 10;
  if((field.group || '') === 'general') score += 8;
  if(key === 'status' || key.indexOf('status') >= 0) score += 6;
  if(key === 'name' || key === 'title' || key === 'description') score += 5;
  if(key.indexOf('date') >= 0) score += 4;
  if(field.type === 'badge') score += 5;
  return score;
}

function _sortRegistryFields(fields){
  return (fields || []).slice().sort(function(a, b){
    var scoreA = _scoreRegistryField(a);
    var scoreB = _scoreRegistryField(b);
    if(scoreA !== scoreB) return scoreB - scoreA;
    if(!!a.required !== !!b.required) return a.required ? -1 : 1;
    return String(a.key || '').localeCompare(String(b.key || ''), 'vi');
  });
}

function _inferFormulaDomain(entity, api){
  var value = entity || _inferEntityFromApi(api);
  if(!value) return '';
  if(/quote/.test(value)) return 'quoting';
  if(/sales_order|job_order/.test(value)) return 'planning';
  if(/work_order|machine|routing|bom|tool/.test(value)) return 'manufacturing';
  if(/ncr|capa|inspection|audit|complaint/.test(value)) return 'quality';
  if(/supplier|purchase_order|goods_receipt/.test(value)) return 'supplier';
  if(/document|doc_master|ppap|fai/.test(value)) return 'compliance';
  if(/lot|trace/.test(value)) return 'traceability';
  return '';
}

function _getValidationRulesForField(entity, fieldKey){
  return _getValidationRuleList().filter(function(rule){
    return (!entity || rule.entity === entity) && rule.field === fieldKey;
  });
}

function _applyValidationToFieldConfig(fieldConfig, rules){
  var validation = {};
  var summary = [];
  (rules || []).forEach(function(rule){
    var params = rule.params || {};
    summary.push(rule.type);
    if(rule.type === 'required') validation.required = true;
    if(rule.type === 'minLength' && params.min != null) validation.minLength = Math.max(validation.minLength || 0, Number(params.min));
    if(rule.type === 'maxLength' && params.max != null) validation.maxLength = validation.maxLength == null ? Number(params.max) : Math.min(validation.maxLength, Number(params.max));
    if(rule.type === 'range'){
      if(params.min != null) validation.min = Number(params.min);
      if(params.max != null) validation.max = Number(params.max);
    }
    if(rule.type === 'enum' && params.values && params.values.length){
      fieldConfig.type = 'select';
      fieldConfig.options = params.values.map(function(option){
        return { value: option, label: option, labelEn: option };
      });
      validation.enum = params.values.slice();
    }
  });
  fieldConfig.validation = validation;
  fieldConfig.validationRules = (rules || []).map(function(rule){
    return _clone(rule);
  });
  fieldConfig.rules = summary.join(', ');
  if(validation.required) fieldConfig.required = true;
}

function _guessColumnWidth(type){
  var map = {
    string: '200',
    textarea: '280',
    number: '120',
    integer: '120',
    badge: '130',
    currency: '140',
    percentage: '120',
    percent: '120',
    date: '120',
    datetime: '160',
    boolean: '110'
  };
  return (map[type] || '180') + 'px';
}

function _coerceFormFieldType(type){
  if(type === 'badge') return 'select';
  if(type === 'integer') return 'number';
  if(type === 'percent') return 'number';
  return type || 'string';
}

function _buildAutoColumnsFromRegistry(api, fields, entity){
  return _sortRegistryFields(fields).slice(0, 8).map(function(field){
    var statusSet = _matchStatusSetForField(api, field, entity);
    return {
      key: field.key,
      fieldRef: field.key,
      label: { vi: field.label || field.labelEn || field.key, en: field.labelEn || field.label || field.key },
      type: field.type || 'string',
      width: _guessColumnWidth(field.type),
      sortable: !!field.sortable,
      filterable: !!field.filterable,
      statusSet: statusSet
    };
  });
}

function _buildAutoFormFieldsFromRegistry(api, fields, entity){
  var sorted = _sortRegistryFields(fields);
  var required = sorted.filter(function(item){ return !!item.required; });
  var optional = sorted.filter(function(item){ return !item.required; });
  var selected = required.concat(optional.slice(0, Math.max(0, 8 - required.length)));
  return selected.slice(0, 10).map(function(field){
    var statusSet = _matchStatusSetForField(api, field, entity);
    var config = {
      key: field.key,
      fieldRef: field.key,
      label: { vi: field.label || field.labelEn || field.key, en: field.labelEn || field.label || field.key },
      type: statusSet ? 'select' : _coerceFormFieldType(field.type),
      required: !!field.required,
      span: field.type === 'textarea' ? 'full' : 'half',
      statusSet: statusSet,
      placeholder: { vi: field.label || field.key, en: field.labelEn || field.label || field.key }
    };
    if(statusSet) config.options = _statusOptionsForSet(statusSet);
    _applyValidationToFieldConfig(config, _getValidationRulesForField(entity, field.key));
    return config;
  });
}

function _buildAutoFiltersFromRegistry(api, fields, entity){
  var filters = [{
    key: 'keyword',
    label: { vi: 'Từ khóa', en: 'Keyword' },
    type: 'search',
    placeholder: { vi: 'Nhập từ khóa', en: 'Search keyword' }
  }];
  var statusField = _sortRegistryFields(fields).filter(function(field){
    return field.type === 'badge' || String(field.key || '').toLowerCase().indexOf('status') >= 0;
  })[0];
  var dateField = _sortRegistryFields(fields).filter(function(field){
    return field.type === 'date' || field.type === 'datetime';
  })[0];
  if(statusField){
    filters.push({
      key: statusField.key,
      fieldRef: statusField.key,
      label: { vi: statusField.label || 'Trạng thái', en: statusField.labelEn || 'Status' },
      type: 'status',
      statusSet: _matchStatusSetForField(api, statusField, entity)
    });
  }
  if(dateField){
    filters.push({
      key: dateField.key,
      fieldRef: dateField.key,
      label: { vi: dateField.label || 'Ngày', en: dateField.labelEn || 'Date' },
      type: 'date-range'
    });
  }
  return filters;
}

function _buildAutoKpisFromRegistry(entity, api){
  var domain = _inferFormulaDomain(entity, api);
  return Object.keys(state.registries.computedFormulas || {}).filter(function(key){
    var formula = state.registries.computedFormulas[key] || {};
    if(key === '_meta') return false;
    return !domain || formula.category === domain;
  }).slice(0, 4).map(function(key){
    var formula = state.registries.computedFormulas[key] || {};
    return {
      dataKey: key,
      formulaId: key,
      label: { vi: formula.name || formula.label || key, en: formula.nameEn || formula.labelEn || formula.name || key },
      suffix: formula.unit === 'percentage' || formula.unit === 'percent' ? '%' : '',
      color: formula.category === 'quality' ? '#dc2626' : (formula.category === 'manufacturing' ? '#2563eb' : '#0f766e')
    };
  });
}

function _guessTransitionApi(entity){
  var aliases = _aliasCandidatesForEntity(entity);
  var catalog = BE.API_CATALOG || [];
  var matched = '';
  catalog.forEach(function(item){
    var action = String(item.action || '');
    var actionText = _normalizeSearchText(action);
    if(matched) return;
    if(actionText.indexOf('transition') < 0) return;
    aliases.forEach(function(alias){
      if(!matched && actionText.indexOf(_normalizeSearchText(alias).replace(/_/g, '')) >= 0){
        matched = action;
      }
    });
  });
  return matched;
}

function _guessTransitionVariant(transition){
  var to = String((transition && transition.to) || '').toLowerCase();
  if(to.indexOf('cancel') >= 0 || to.indexOf('reject') >= 0 || to.indexOf('void') >= 0 || to.indexOf('lost') >= 0) return 'danger';
  if(to.indexOf('approved') >= 0 || to.indexOf('active') >= 0 || to.indexOf('released') >= 0 || to.indexOf('closed') >= 0) return 'primary';
  return 'secondary';
}

function _guessTransitionIcon(transition){
  var trigger = String((transition && transition.trigger) || '').toLowerCase();
  if(trigger.indexOf('approve') >= 0 || trigger.indexOf('release') >= 0) return '✔';
  if(trigger.indexOf('reject') >= 0 || trigger.indexOf('cancel') >= 0) return '✖';
  if(trigger.indexOf('submit') >= 0 || trigger.indexOf('send') >= 0) return '➜';
  return '↻';
}

function _applyWorkflowRegistryToDraft(draft, workflowId){
  var workflow = _getWorkflowRegistryMap()[workflowId];
  var entity;
  if(!workflow || !draft) return 0;
  if(!draft.config) draft.config = {};
  if(!draft.config.workflow) draft.config.workflow = {};
  entity = workflow.entity || _inferEntityFromApi(_getByPath(draft, 'config.dataSource.api'));
  draft.config.workflow.workflowId = workflowId;
  draft.config.workflow.entity = entity || '';
  draft.config.workflow.stateField = draft.config.workflow.stateField || 'status';
  draft.config.workflow.states = _clone(workflow.states || []);
  draft.config.workflow.transitions = (workflow.transitions || []).map(function(transition){
    return {
      from: transition.from,
      to: transition.to,
      label: { vi: transition.label || transition.trigger || transition.to, en: transition.labelEn || transition.label || transition.trigger || transition.to },
      icon: _guessTransitionIcon(transition),
      variant: _guessTransitionVariant(transition),
      endpoint: _guessTransitionApi(entity),
      method: 'POST',
      guards: _clone(transition.guards || []),
      actions: _clone(transition.actions || [])
    };
  });
  draft.config.workflow.guards = (workflow.transitions || []).map(function(transition){
    return {
      from: transition.from,
      to: transition.to,
      guards: _clone(transition.guards || [])
    };
  });
  draft.config.workflow.sla = _clone(workflow.sla || {});
  draft.config.workflow.digitalThread = _clone(workflow.digitalThread || {});
  if(draft.config.workflow.showDiagram == null) draft.config.workflow.showDiagram = true;
  if(draft.config.workflow.showSla == null) draft.config.workflow.showSla = true;
  if(draft.config.workflow.showDigitalThread == null) draft.config.workflow.showDigitalThread = true;
  return (workflow.transitions || []).length;
}

function _autoPopulateDraftFromApi(draft, api){
  var fields = _getRegistryFieldsForApi(api);
  var entity = _inferEntityFromApi(api);
  var count = 0;
  var noun = '';
  if(!draft || !draft.config || !api || !fields.length) return null;
  draft.config.dataSource = draft.config.dataSource || {};
  draft.config.dataSource.api = api;
  draft.config.entity = entity || draft.config.entity || '';
  if(draft.type === 'data-table'){
    draft.config.columns = _buildAutoColumnsFromRegistry(api, fields, entity);
    count = draft.config.columns.length;
    noun = _t('cột', 'columns');
  } else if(draft.type === 'form-standard'){
    draft.config.fields = _buildAutoFormFieldsFromRegistry(api, fields, entity);
    count = draft.config.fields.length;
    noun = _t('trường', 'fields');
  } else if(draft.type === 'filter-bar'){
    draft.config.filters = _buildAutoFiltersFromRegistry(api, fields, entity);
    count = draft.config.filters.length;
    noun = _t('bộ lọc', 'filters');
  } else if(draft.type === 'kpi-row'){
    draft.config.items = _buildAutoKpisFromRegistry(entity, api);
    count = draft.config.items.length;
    noun = _t('KPI', 'KPIs');
  }
  return count ? { count: count, noun: noun, entity: entity } : null;
}

function _syncDraftToSelectedBlock(label){
  var selectedId = state.selectedBlock;
  var draft = state.propsDraft;
  if(!selectedId || !draft) return;
  _mutateSchema(label || _t('Đồng bộ block từ registry', 'Sync block from registry'), function(){
    var block = _findBlock(selectedId);
    if(!block) return;
    _applySchemaDefaults(draft, _getBlockSchema(draft.type));
    Object.keys(block).forEach(function(key){ delete block[key]; });
    Object.keys(draft).forEach(function(key){ block[key] = _clone(draft[key]); });
    state.selectedBlock = block.blockId || block.id;
    state.propsDraft = _clone(block);
    _applySchemaDefaults(state.propsDraft, _getBlockSchema(block.type));
  });
}

function _inferPackModule(packKey){
  var key = _normalizeSearchText(packKey);
  if(key.indexOf('quote') >= 0) return 'bao_gia';
  if(key.indexOf('so') >= 0 || key.indexOf('jo') >= 0 || key.indexOf('order') >= 0) return 'don_hang';
  if(key.indexOf('plan') >= 0 || key.indexOf('schedule') >= 0) return 'ke_hoach';
  if(key.indexOf('po') >= 0 || key.indexOf('supplier') >= 0 || key.indexOf('receipt') >= 0 || key.indexOf('receiving') >= 0) return 'mua_hang';
  if(key.indexOf('wo') >= 0 || key.indexOf('machine') >= 0 || key.indexOf('setup') >= 0 || key.indexOf('tool') >= 0 || key.indexOf('production') >= 0) return 'san_xuat';
  if(key.indexOf('ncr') >= 0 || key.indexOf('capa') >= 0 || key.indexOf('audit') >= 0 || key.indexOf('inspection') >= 0 || key.indexOf('scar') >= 0 || key.indexOf('quality') >= 0) return 'chat_luong';
  if(key.indexOf('doc') >= 0 || key.indexOf('record') >= 0 || key.indexOf('form') >= 0) return 'ho_so';
  if(key.indexOf('dashboard') >= 0 || key.indexOf('report') >= 0 || key.indexOf('kpi') >= 0) return 'bao_cao';
  if(key.indexOf('training') >= 0 || key.indexOf('knowledge') >= 0) return 'tai_lieu';
  return 'quan_tri';
}

function _packModuleInfo(moduleKey){
  var map = {
    bao_gia: { icon:'💰', label:_t('Báo giá', 'Quoting') },
    don_hang: { icon:'📦', label:_t('Đơn hàng', 'Orders') },
    ke_hoach: { icon:'🗓', label:_t('Kế hoạch', 'Planning') },
    mua_hang: { icon:'🧾', label:_t('Mua hàng', 'Purchasing') },
    san_xuat: { icon:'🏭', label:_t('Sản xuất', 'Manufacturing') },
    chat_luong: { icon:'🧪', label:_t('Chất lượng', 'Quality') },
    ho_so: { icon:'🗂', label:_t('Hồ sơ', 'Records') },
    bao_cao: { icon:'📊', label:_t('Báo cáo', 'Reports') },
    tai_lieu: { icon:'📚', label:_t('Tài liệu', 'Documents') },
    quan_tri: { icon:'⚙', label:_t('Quản trị', 'Admin') }
  };
  return map[moduleKey] || map.quan_tri;
}

function _getPackInfo(packKey, fields){
  var moduleKey = _inferPackModule(packKey);
  var moduleInfo = _packModuleInfo(moduleKey);
  var labels = (fields || []).slice(0, 3).map(function(field){
    return field.label || field.labelEn || field.key;
  });
  return {
    key: packKey,
    module: moduleKey,
    icon: moduleInfo.icon,
    moduleLabel: moduleInfo.label,
    label: _humanizeKey(packKey),
    count: (fields || []).length,
    description: labels.length ? _t('Gồm các trường: ', 'Includes fields: ') + labels.join(', ') + ((fields || []).length > 3 ? '…' : '') : _t('Pack trường kéo thả theo domain.', 'Domain-driven drag-and-drop field pack.')
  };
}

function _packPayloadForType(blockType, packKey, fields, entity, api){
  if(blockType === 'data-table') return { columns: _buildAutoColumnsFromRegistry(api || packKey, fields, entity) };
  if(blockType === 'filter-bar') return { filters: _buildAutoFiltersFromRegistry(api || packKey, fields, entity) };
  return { fields: _buildAutoFormFieldsFromRegistry(api || packKey, fields, entity), columns: 2 };
}

function _isPackCompatibleBlock(block){
  return !!(block && ['form-standard', 'data-table', 'filter-bar'].indexOf(block.type) >= 0);
}

function _mergePackIntoBlock(block, packKey){
  var packFields = _getDomainPackMap()[packKey] || [];
  var entity = (block.config && block.config.entity) || _inferEntityFromApi((block.config && block.config.dataSource && block.config.dataSource.api) || packKey);
  var api = block.config && block.config.dataSource ? block.config.dataSource.api : '';
  var payload = _packPayloadForType(block.type, packKey, packFields, entity, api);
  if(block.type === 'data-table'){
    block.config.columns = (block.config.columns || []).concat(payload.columns || []);
  } else if(block.type === 'filter-bar'){
    block.config.filters = (block.config.filters || []).concat(payload.filters || []);
  } else {
    block.config.fields = (block.config.fields || []).concat(payload.fields || []);
  }
  block.config.entity = entity || block.config.entity || '';
}

function _openPackPicker(packKey){
  state.packPicker = { packKey: packKey };
  _paint();
}

function _renderPackPickerModal(){
  var packKey;
  var packFields;
  var info;
  var tab;
  var h = '';
  if(!state.packPicker) return '';
  packKey = state.packPicker.packKey;
  packFields = _getDomainPackMap()[packKey] || [];
  info = _getPackInfo(packKey, packFields);
  tab = _getActiveTab();
  h += '<div class="mb-modal-surface" data-action="close-pack-picker">';
  h += '<div class="mb-modal-card" onclick="event.stopPropagation()">';
  h += '<div class="mb-panel-header" style="padding:0 0 14px;border-bottom:1px solid var(--border);margin-bottom:14px"><div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary)">'+_t('Field Pack', 'Field Pack')+'</div><strong>'+_esc(info.icon)+' '+_esc(info.label)+'</strong></div><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="close-pack-picker">×</button></div>';
  h += '<div class="mb-pack-desc">'+_esc(info.description)+'</div>';
  h += '<div class="mb-choice-list">';
  if(tab){
    (tab.blocks || []).filter(function(block){ return _isPackCompatibleBlock(block); }).forEach(function(block){
      h += '<div class="mb-choice-card"><div><strong>'+_esc(_getBlockTitle(block))+'</strong><div class="mb-pack-meta">'+_esc(_getCatalogLabel(block.type))+'</div></div><button class="hm-btn hm-btn-primary hm-btn-sm" data-action="apply-pack-target" data-pack="'+_esc(packKey)+'" data-target="'+_esc(block.blockId || block.id)+'">'+_t('Thêm vào block này', 'Add to this block')+'</button></div>';
    });
  }
  h += '<div class="mb-choice-card"><div><strong>'+_t('Tạo form mới', 'Create new form')+'</strong><div class="mb-pack-meta">'+_t('Khi canvas chưa có block phù hợp', 'When no compatible block exists')+'</div></div><button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="apply-pack-create" data-pack="'+_esc(packKey)+'" data-type="form-standard">'+_t('Tạo form', 'Create form')+'</button></div>';
  h += '<div class="mb-choice-card"><div><strong>'+_t('Tạo bảng mới', 'Create new table')+'</strong><div class="mb-pack-meta">'+_t('Dành cho pack thiên về danh sách dữ liệu', 'Best for list-oriented packs')+'</div></div><button class="hm-btn hm-btn-secondary hm-btn-sm" data-action="apply-pack-create" data-pack="'+_esc(packKey)+'" data-type="data-table">'+_t('Tạo bảng', 'Create table')+'</button></div>';
  h += '</div></div></div>';
  return h;
}

function _applyPackToTarget(packKey, blockId){
  _mutateSchema(_t('Thêm field pack', 'Apply field pack'), function(){
    var block = _findBlock(blockId);
    if(!block || !_isPackCompatibleBlock(block)) return;
    _mergePackIntoBlock(block, packKey);
    state.selectedBlock = block.blockId || block.id;
    state.propsDraft = _clone(block);
  });
  state.packPicker = null;
  _toastBuilder(_t('Đã thêm field pack vào block đã chọn.', 'Field pack added to the selected block.'), 'success');
}

function _createBlockFromPack(packKey, blockType, target){
  var packFields = _getDomainPackMap()[packKey] || [];
  var entity = _inferEntityFromApi(packKey);
  var preConfig = _packPayloadForType(blockType, packKey, packFields, entity, '');
  target = target || {
    tabId: state.activeTab,
    parentId: state.insertParent || null,
    slotKey: state.insertSlot || 'default',
    insertIndex: state.insertPosition
  };
  preConfig.entity = entity || '';
  _mutateSchema(_t('Tạo block từ field pack', 'Create block from field pack'), function(){
    _insertBlockAtTarget(blockType, preConfig, target);
  });
  state.packPicker = null;
  _toastBuilder(_t('Đã tạo block mới từ field pack.', 'Created a new block from the field pack.'), 'success');
}

function _tabEntityBlocks(tab){
  return (tab && tab.blocks || []).filter(function(block){
    return !!(block && block.config && block.config.dataSource && block.config.dataSource.api);
  }).map(function(block){
    return {
      block: block,
      blockId: block.blockId || block.id,
      bindingId: _safeBindingKey(block.blockId || block.id),
      api: block.config.dataSource.api,
      entity: (block.config && block.config.entity) || _inferEntityFromApi(block.config.dataSource.api)
    };
  }).filter(function(item){
    return !!item.entity;
  });
}

function _isSuggestionConfigured(suggestion){
  var target = suggestion && suggestion.target && suggestion.target.block;
  var link = target && target.config ? target.config.crossBlockLink : null;
  return !!(link && link.relationId === suggestion.relation.id && link.sourceBlockId === suggestion.source.blockId);
}

function _relationSuggestionsForTab(tab){
  var entities = _tabEntityBlocks(tab);
  var suggestions = [];
  _getRelationList().forEach(function(relation){
    entities.forEach(function(source){
      entities.forEach(function(target){
        if(source.blockId === target.blockId) return;
        if(source.entity === relation.from.entity && target.entity === relation.to.entity){
          suggestions.push({
            relation: relation,
            source: source,
            target: target
          });
        }
      });
    });
  });
  return suggestions;
}

function _findRelationSuggestionByIds(tab, relationId, sourceId, targetId){
  var suggestions = _relationSuggestionsForTab(tab);
  var i;
  for(i = 0; i < suggestions.length; i++){
    if((!relationId || suggestions[i].relation.id === relationId) &&
       suggestions[i].source.blockId === sourceId &&
       suggestions[i].target.blockId === targetId){
      return suggestions[i];
    }
  }
  return null;
}

function _applyRelationSuggestion(suggestion){
  if(!suggestion || !suggestion.target || !suggestion.target.block) return;
  _mutateSchema(_t('Thiết lập liên kết số', 'Setup digital thread link'), function(){
    var target = _findBlock(suggestion.target.blockId);
    if(!target) return;
    if(!target.config) target.config = {};
    if(!target.config.dataSource) target.config.dataSource = {};
    if(!target.config.dataSource.params) target.config.dataSource.params = {};
    target.config.dataSource.params[suggestion.relation.to.field] = '{{ blocks.' + suggestion.source.bindingId + '.selectedRow.' + suggestion.relation.from.field + ' }}';
    target.config.crossBlockLink = {
      relationId: suggestion.relation.id,
      sourceBlockId: suggestion.source.blockId,
      sourceBindingId: suggestion.source.bindingId,
      sourceField: suggestion.relation.from.field,
      targetField: suggestion.relation.to.field,
      type: suggestion.relation.type,
      label: suggestion.relation.label || suggestion.relation.labelEn || ''
    };
  });
  _toastBuilder(_t('Đã cấu hình liên kết giữa hai block theo relation map.', 'Configured a registry-driven link between the two blocks.'), 'success');
}

function _relationsForSelectedBlock(blockId){
  return _relationSuggestionsForTab(_getActiveTab()).filter(function(item){
    return item.source.blockId === blockId || item.target.blockId === blockId;
  });
}

function _renderRelationsPanel(block){
  var suggestions = _relationsForSelectedBlock(block.blockId || block.id);
  var h = '';
  if(!_getRelationList().length){
    return '<div class="mb-helper-note">'+_t('Relation map chưa sẵn sàng. Builder sẽ hiện gợi ý liên kết khi registry tải xong.', 'Relation map is not ready yet. Suggestions will appear after registry loading completes.')+'</div>';
  }
  h += '<div class="mb-helper-note">'+_t('Builder đang dò quan hệ trực tiếp giữa các block trong cùng tab để gợi ý digital thread link.', 'The builder is scanning direct relationships between blocks in the same tab to suggest digital thread links.')+'</div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px"><strong>'+_t('Liên kết khả dụng', 'Available links')+'</strong><button class="hm-btn '+(state.showDigitalThreadLinks ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="toggle-digital-thread-links">'+_t('🔗 Hiện/Ẩn links', '🔗 Toggle links')+'</button></div>';
  if(!suggestions.length){
    h += '<div class="mb-field-hint">'+_t('Chưa phát hiện relation trực tiếp phù hợp với block này trong tab hiện tại.', 'No direct relation suggestion was detected for this block in the active tab.')+'</div>';
    return h;
  }
  suggestions.forEach(function(item){
    var targetLabel = item.target.blockId === (block.blockId || block.id) ? _t('Nhận lọc từ', 'Receive filter from') : _t('Lọc block', 'Filter block');
    var other = item.target.blockId === (block.blockId || block.id) ? item.source : item.target;
    h += '<div class="mb-choice-card"><div><strong>'+_esc(item.relation.label || item.relation.labelEn || item.relation.id)+'</strong><div class="mb-pack-desc">'+_esc(targetLabel)+' <code>'+_esc(_getBlockTitle(other.block))+'</code> • '+_esc(item.relation.type)+'</div></div>';
    h += '<button class="hm-btn '+(_isSuggestionConfigured(item) ? 'hm-btn-secondary' : 'hm-btn-primary')+' hm-btn-sm" data-action="apply-relation-link" data-relation-id="'+_esc(item.relation.id)+'" data-source="'+_esc(item.source.blockId)+'" data-target="'+_esc(item.target.blockId)+'">'+(_isSuggestionConfigured(item) ? _t('Đã kết nối', 'Linked') : _t('Kết nối', 'Connect'))+'</button></div>';
  });
  return h;
}

function _configuredDigitalLinks(tab){
  return (tab && tab.blocks || []).map(function(block){
    if(!(block && block.config && block.config.crossBlockLink)) return null;
    return {
      sourceBlockId: block.config.crossBlockLink.sourceBlockId,
      targetBlockId: block.blockId || block.id,
      label: block.config.crossBlockLink.label || '',
      type: block.config.crossBlockLink.type || '',
      relationId: block.config.crossBlockLink.relationId || ''
    };
  }).filter(function(item){ return !!item; });
}

function _paintDigitalThreadOverlay(){
  var stage = state.container && state.container.querySelector ? state.container.querySelector('.mb-canvas-stage') : null;
  var links = _configuredDigitalLinks(_getActiveTab());
  var svg;
  var stageRect;
  if(!stage) return;
  svg = stage.querySelector('.mb-link-overlay');
  if(svg && svg.parentNode) svg.parentNode.removeChild(svg);
  if(state.step !== 'build' || !state.showDigitalThreadLinks || !links.length) return;
  stageRect = stage.getBoundingClientRect();
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mb-link-overlay');
  svg.setAttribute('width', stage.scrollWidth || stage.clientWidth || 0);
  svg.setAttribute('height', stage.scrollHeight || stage.clientHeight || 0);
  links.forEach(function(link){
    var source = stage.querySelector('[data-block-wrapper="'+link.sourceBlockId+'"]');
    var target = stage.querySelector('[data-block-wrapper="'+link.targetBlockId+'"]');
    var sourceRect;
    var targetRect;
    var startX;
    var startY;
    var endX;
    var endY;
    var path;
    var circle;
    var label;
    var title;
    if(!source || !target) return;
    sourceRect = source.getBoundingClientRect();
    targetRect = target.getBoundingClientRect();
    startX = sourceRect.right - stageRect.left + stage.scrollLeft;
    startY = sourceRect.top - stageRect.top + stage.scrollTop + sourceRect.height / 2;
    endX = targetRect.left - stageRect.left + stage.scrollLeft;
    endY = targetRect.top - stageRect.top + stage.scrollTop + targetRect.height / 2;
    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M ' + startX + ' ' + startY + ' C ' + (startX + 44) + ' ' + startY + ', ' + (endX - 44) + ' ' + endY + ', ' + endX + ' ' + endY);
    title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = (link.label || link.relationId || '') + (link.type ? ' • ' + link.type : '');
    path.appendChild(title);
    svg.appendChild(path);
    circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', endX);
    circle.setAttribute('cy', endY);
    circle.setAttribute('r', 4);
    svg.appendChild(circle);
    label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (startX + endX) / 2);
    label.setAttribute('y', Math.min(startY, endY) - 8);
    label.textContent = link.label || link.type || '';
    svg.appendChild(label);
  });
  stage.appendChild(svg);
}

function _renderRegistryValidationSummary(draft){
  var entity = (draft.config && draft.config.entity) || _inferEntityFromApi(_getByPath(draft, 'config.dataSource.api'));
  var fields = _getByPath(draft, 'config.fields') || [];
  var rules = _getValidationRuleList().filter(function(rule){
    return !entity || rule.entity === entity;
  });
  var h = '';
  h += '<div class="mb-helper-note">'+_t('Validation tự động đang đồng bộ từ registry theo entity hiện tại.', 'Automatic validation is being synced from the registry for the current entity.')+'</div>';
  h += _renderPropField({ label:_t('Bật validation tự động', 'Auto validation from registry'), labelEn:'Auto validation from registry', type:'toggle', path:'config.validation.autoApply' }, 'config.validation.autoApply', _getByPath(draft, 'config.validation.autoApply') !== false);
  h += '<div class="mb-choice-list">';
  h += '<div class="mb-choice-card"><div><strong>'+_t('Entity hiện tại', 'Current entity')+'</strong><div class="mb-pack-meta">'+_esc(entity || _t('Chưa xác định', 'Unknown'))+'</div></div><div class="mb-pack-meta">'+rules.length+' '+_t('rule', 'rules')+'</div></div>';
  fields.slice(0, 10).forEach(function(field){
    var fieldRules = _getValidationRulesForField(entity, field.key);
    if(!fieldRules.length) return;
    h += '<div class="mb-choice-card"><div><strong>'+_esc(field.label && (field.label.vi || field.label.en) || field.key)+'</strong><div class="mb-pack-desc">'+_esc(fieldRules.map(function(rule){ return rule.type; }).join(', '))+'</div></div><div class="mb-pack-meta">'+_esc(fieldRules[0].message || fieldRules[0].messageEn || '')+'</div></div>';
  });
  h += '</div>';
  return h;
}

function _renderWorkflowRegistrySummary(draft){
  var workflowId = _getByPath(draft, 'config.workflow.workflowId');
  var workflow = _getWorkflowRegistryMap()[workflowId] || {};
  var transitions = _getByPath(draft, 'config.workflow.transitions') || [];
  var h = '';
  h += '<div class="mb-helper-note">'+_t('Chọn workflow để builder tự tạo button chuyển trạng thái, guards, SLA và digital thread metadata.', 'Choose a workflow so the builder can auto-create transition buttons, guards, SLA, and digital thread metadata.')+'</div>';
  if(!workflowId){
    h += '<div class="mb-field-hint">'+_t('Chưa chọn workflow. Block vẫn có thể cấu hình tay danh sách transition.', 'No workflow selected yet. You can still configure transitions manually.')+'</div>';
    return h;
  }
  h += '<div class="mb-choice-list">';
  h += '<div class="mb-choice-card"><div><strong>'+_esc(workflow.name || workflow.nameEn || workflowId)+'</strong><div class="mb-pack-meta">'+_esc(workflow.entity || '')+'</div></div><div class="mb-pack-meta">'+transitions.length+' '+_t('transition', 'transitions')+'</div></div>';
  (workflow.states || []).slice(0, 6).forEach(function(stateItem){
    h += '<div class="mb-choice-card"><div><strong>'+_esc(stateItem.label || stateItem.labelEn || stateItem.id)+'</strong><div class="mb-pack-desc">'+_esc(stateItem.id)+'</div></div><div class="mb-pack-meta">'+_esc(stateItem.color || '')+'</div></div>';
  });
  h += '</div>';
  return h;
}

/* ============================================================================
   BUILDER V2 OVERRIDE
   Tree canvas + undo/redo + clipboard + drag-drop + layout controls
   ============================================================================ */

state.showTree = true;
state.showShortcuts = false;
state.treeCollapsed = {};
state.contextMenu = null;
state.insertParent = null;
state.insertSlot = 'default';
state.insertPosition = null;
state.pendingUndoLabel = '';
state.pendingScrollBlock = null;

var undoManager = {
  stack: [],
  position: -1,
  maxDepth: 200,
  commit: function(snapshot, label){
    if(snapshot == null) return;
    if(this.position >= 0 && this.stack[this.position] && this.stack[this.position].snapshot === snapshot) return;
    if(this.position < this.stack.length - 1){
      this.stack = this.stack.slice(0, this.position + 1);
    }
    this.stack.push({
      snapshot: snapshot,
      label: label || ''
    });
    if(this.stack.length > this.maxDepth){
      this.stack.shift();
    }
    this.position = this.stack.length - 1;
  },
  undo: function(){
    if(!this.hasUndo()) return null;
    this.position--;
    return this.stack[this.position] || null;
  },
  redo: function(){
    if(!this.hasRedo()) return null;
    this.position++;
    return this.stack[this.position] || null;
  },
  hasUndo: function(){ return this.position > 0; },
  hasRedo: function(){ return this.position >= 0 && this.position < this.stack.length - 1; },
  clear: function(){
    this.stack = [];
    this.position = -1;
  },
  getInfo: function(){
    return {
      canUndo: this.hasUndo(),
      canRedo: this.hasRedo(),
      depth: this.stack.length,
      position: this.position
    };
  }
};

var clipboard = { block: null };
var dragState = { source: null, target: null, indicatorKey: '' };
var _keyboardReady = false;
var _builderStyleId = 'hm-module-builder-v2-style';
var _handleDragStart;
var _handleDragOver;
var _handleDrop;
var _handleDragEnd;
var _handleContextMenu;
var _handleTouchStart;
var _handleTouchMove;
var _handleTouchEnd;
var _handleTouchCancel;
var touchDragState = {
  source: null,
  target: null,
  active: false,
  timer: null,
  startX: 0,
  startY: 0
};

function _ensureBuilderState(){
  if(state.showTree === undefined) state.showTree = true;
  if(state.showShortcuts === undefined) state.showShortcuts = false;
  if(!state.treeCollapsed) state.treeCollapsed = {};
  if(state.insertParent === undefined) state.insertParent = null;
  if(!state.insertSlot) state.insertSlot = 'default';
  if(state.insertPosition === undefined) state.insertPosition = null;
  if(state.contextMenu === undefined) state.contextMenu = null;
  if(state.pendingUndoLabel === undefined) state.pendingUndoLabel = '';
  if(!state.libraryMode) state.libraryMode = 'blocks';
  if(!state.fieldSearch) state.fieldSearch = {};
  if(!state.fieldFilter) state.fieldFilter = {};
  if(!state.apiSearch) state.apiSearch = {};
  if(state.packPicker === undefined) state.packPicker = null;
  if(state.showDigitalThreadLinks === undefined) state.showDigitalThreadLinks = true;
  if(!state.pendingApiSelection) state.pendingApiSelection = {};
  if(state.pendingApiSelectionSeq == null) state.pendingApiSelectionSeq = 0;
  if(!state.registries.dataFieldsLoading) state.registries.dataFieldsLoading = {};
  if(state.registries.loadingMessage === undefined) state.registries.loadingMessage = '';
}

function _ensureBuilderStyles(){
  var style = document.getElementById(_builderStyleId);
  var css = '';
  if(style) return;
  style = document.createElement('style');
  style.id = _builderStyleId;
  css += '.mb-builder-shell{display:flex;gap:16px;align-items:stretch;min-height:560px}';
  css += '.mb-side-panel,.mb-main-panel,.mb-rail-panel{background:var(--bg-surface);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-sm)}';
  css += '.mb-side-panel{width:240px;overflow:hidden;display:flex;flex-direction:column}';
  css += '.mb-main-panel{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}';
  css += '.mb-right-rail{width:400px;display:flex;flex-direction:column;gap:16px}';
  css += '.mb-rail-panel{display:flex;flex-direction:column;overflow:hidden}';
  css += '.mb-panel-header{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(37,99,235,0.05));backdrop-filter:blur(10px)}';
  css += '.mb-panel-body{padding:14px 16px;overflow:auto;flex:1;min-height:0}';
  css += '.mb-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);background:rgba(248,250,252,0.9);backdrop-filter:blur(10px)}';
  css += '.mb-toolbar-group{display:flex;gap:8px;align-items:center;flex-wrap:wrap}';
  css += '.mb-toolbar-spacer{flex:1 1 auto}';
  css += '.mb-canvas-stage{padding:18px;min-height:520px;background:radial-gradient(circle at top left,rgba(37,99,235,0.08),rgba(255,255,255,0) 34%),linear-gradient(180deg,rgba(37,99,235,0.04),rgba(255,255,255,0));overflow:auto;position:relative}';
  css += '.mb-canvas-root{min-height:400px;padding:18px;border:1px dashed rgba(37,99,235,0.3);border-radius:20px;background:linear-gradient(180deg,#fff,rgba(248,250,252,0.98));box-shadow:inset 0 1px 0 rgba(255,255,255,0.75)}';
  css += '.mb-layout-stack{display:flex;flex-direction:column}';
  css += '.mb-layout-grid{display:grid}';
  css += '.mb-layout-flex{display:flex;flex-wrap:wrap}';
  css += '.mb-slot{border:1px dashed var(--border);border-radius:16px;padding:10px;min-height:84px;background:rgba(255,255,255,0.82);position:relative}';
  css += '.mb-slot + .mb-slot{margin-top:12px}';
  css += '.mb-slot-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);margin-bottom:8px;font-weight:700}';
  css += '.mb-slot-empty{padding:18px 12px;text-align:center;color:var(--text-tertiary);font-size:13px}';
  css += '.mb-slot-actions{display:flex;justify-content:center;margin-top:10px}';
  css += '.mb-block-card{border:1px solid var(--border);border-radius:18px;background:#fff;overflow:hidden;position:relative;transition:border-color .15s, box-shadow .15s, transform .15s;margin-bottom:14px}';
  css += '.mb-block-card.is-selected{border-color:var(--brand-2);box-shadow:0 0 0 2px rgba(37,99,235,0.12)}';
  css += '.mb-block-card.is-hidden{opacity:.72}';
  css += '.mb-block-card.is-locked{background:rgba(15,23,42,0.03)}';
  css += '.mb-block-card.hm-block-dragging{opacity:.45;transform:scale(.985)}';
  css += '.mb-block-card,.mb-tree-node,[data-library-type]{touch-action:manipulation}';
  css += '.mb-block-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:12px 14px;background:linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0))}';
  css += '.mb-block-meta{display:flex;gap:8px;align-items:flex-start}';
  css += '.mb-block-icon{font-size:18px;line-height:1;width:24px;text-align:center}';
  css += '.mb-block-name{font-weight:700;color:var(--text-primary);font-size:14px}';
  css += '.mb-block-type{font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}';
  css += '.mb-block-tools{display:flex;gap:4px;flex-wrap:wrap}';
  css += '.mb-block-body{padding:0 14px 14px}';
  css += '.mb-drop-above:before,.mb-drop-below:after{content:\"\";position:absolute;left:10px;right:10px;height:2px;background:var(--brand-2);border-radius:999px}';
  css += '.mb-drop-above:before{top:0}';
  css += '.mb-drop-below:after{bottom:0}';
  css += '.mb-drop-zone-active{border-color:var(--brand-2);box-shadow:0 0 0 2px rgba(37,99,235,0.12)}';
  css += '.mb-tree-scroll{padding:10px 10px 14px;overflow:auto;flex:1}';
  css += '.mb-tree-root{font-size:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;padding:0 8px 8px;font-weight:700}';
  css += '.mb-tree-node{display:flex;align-items:center;gap:6px;padding:7px 8px;border-radius:12px;cursor:pointer;margin-bottom:4px;position:relative}';
  css += '.mb-tree-node:hover{background:var(--gray-50)}';
  css += '.mb-tree-node.is-selected{background:rgba(37,99,235,0.08);color:var(--brand-2)}';
  css += '.mb-tree-node.is-hidden{opacity:.68}';
  css += '.mb-tree-node.is-locked{background:rgba(15,23,42,0.04)}';
  css += '.mb-tree-label{flex:1 1 auto;min-width:0}';
  css += '.mb-tree-title{display:block;font-weight:600;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  css += '.mb-tree-type{display:block;font-size:11px;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  css += '.mb-tree-tools{display:flex;gap:2px}';
  css += '.mb-tab-strip{display:flex;gap:8px;flex-wrap:wrap;padding:14px 16px;border-bottom:1px solid var(--border)}';
  css += '.mb-tab-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:8px 12px;background:#fff;cursor:pointer;font-weight:600;font-size:13px}';
  css += '.mb-tab-pill.is-active{background:var(--brand-2);border-color:var(--brand-2);color:#fff}';
  css += '.mb-shortcuts{position:fixed;right:28px;top:110px;width:300px;max-width:calc(100vw - 32px);background:#0f172a;color:#fff;border-radius:18px;box-shadow:var(--shadow-xl);padding:16px;z-index:1400}';
  css += '.mb-shortcuts h4{margin:0 0 10px;font-size:14px}';
  css += '.mb-shortcuts-list{display:grid;grid-template-columns:1fr auto;gap:8px 12px;font-size:13px}';
  css += '.mb-shortcuts-list kbd{background:rgba(255,255,255,0.14);border-radius:8px;padding:2px 8px;font-family:inherit;font-size:12px}';
  css += '.mb-context-menu{position:fixed;z-index:1450;min-width:180px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-xl);padding:8px}';
  css += '.mb-context-menu button{width:100%;text-align:left;border:0;background:none;padding:9px 10px;border-radius:10px;cursor:pointer;font:inherit;color:var(--text-primary)}';
  css += '.mb-context-menu button:hover{background:var(--gray-50)}';
  css += '.mb-helper-note{padding:10px 12px;border:1px solid rgba(37,99,235,0.18);background:rgba(37,99,235,0.05);border-radius:12px;color:var(--text-secondary);font-size:12px;margin-bottom:12px}';
  css += '.mb-inline-loading{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px dashed rgba(37,99,235,0.22);border-radius:12px;background:rgba(37,99,235,0.04);font-size:12px;color:var(--text-secondary);margin-bottom:10px}';
  css += '.mb-spinner{width:14px;height:14px;border:2px solid rgba(37,99,235,0.18);border-top-color:var(--brand-2);border-radius:50%;display:inline-block;animation:mb-spin .8s linear infinite}';
  css += '.mb-field-select-wrap{display:grid;gap:8px}';
  css += '.mb-field-filter-row{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(0,1fr) minmax(0,1fr);gap:8px}';
  css += '.mb-field-hint{font-size:12px;color:var(--text-tertiary)}';
  css += '.mb-combo-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--text-tertiary)}';
  css += '.mb-field-match-list{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:rgba(15,23,42,0.02)}';
  css += '.mb-field-match-item{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--text-secondary)}';
  css += '.mb-field-match-item strong{font-size:12px;color:var(--text-primary)}';
  css += '.mb-field-match-item span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  css += '.mb-field-match-item mark{background:rgba(245,158,11,0.22);padding:0 2px;border-radius:4px}';
  css += '.mb-library-tabs{display:flex;gap:8px;margin-bottom:12px}';
  css += '.mb-pack-card{display:grid;gap:8px;padding:12px 14px;border:1px solid var(--border);border-radius:16px;background:#fff;margin-bottom:10px;cursor:pointer;transition:border-color .15s, box-shadow .15s, transform .15s}';
  css += '.mb-pack-card:hover{border-color:rgba(37,99,235,0.35);box-shadow:0 12px 24px rgba(15,23,42,0.06);transform:translateY(-1px)}';
  css += '.mb-pack-head{display:flex;align-items:flex-start;gap:10px}';
  css += '.mb-pack-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,0.08);font-size:18px}';
  css += '.mb-pack-name{font-weight:700;font-size:14px;color:var(--text-primary)}';
  css += '.mb-pack-meta{font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em}';
  css += '.mb-pack-desc{font-size:12px;color:var(--text-secondary);line-height:1.45}';
  css += '.mb-pack-actions{display:flex;gap:8px;flex-wrap:wrap}';
  css += '.mb-link-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid rgba(15,118,110,0.24);border-radius:16px;background:rgba(15,118,110,0.06);margin:0 16px 14px}';
  css += '.mb-link-banner strong{display:block;color:#0f766e;margin-bottom:4px}';
  css += '.mb-link-overlay{position:absolute;inset:18px;pointer-events:none;overflow:visible}';
  css += '.mb-link-overlay path{fill:none;stroke:rgba(15,118,110,0.48);stroke-width:2.25;stroke-dasharray:8 6}';
  css += '.mb-link-overlay circle{fill:#0f766e}';
  css += '.mb-link-overlay text{font-size:11px;fill:#0f766e;font-weight:700}';
  css += '.mb-modal-surface{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.36);z-index:1500;padding:24px}';
  css += '.mb-modal-card{width:min(560px,100%);max-height:calc(100vh - 48px);overflow:auto;background:#fff;border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow-xl);padding:18px}';
  css += '.mb-choice-list{display:grid;gap:10px;margin-top:14px}';
  css += '.mb-choice-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:#fff}';
  css += '.mb-choice-card strong{display:block;font-size:14px;color:var(--text-primary)}';
  css += '.mb-kbd-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border);padding:4px 8px;border-radius:999px;background:#fff;font-size:12px;color:var(--text-secondary)}';
  css += '@keyframes mb-spin{to{transform:rotate(360deg)}}';
  css += '@media (max-width: 1360px){.mb-builder-shell{flex-direction:column}.mb-side-panel,.mb-right-rail{width:auto}.mb-field-filter-row{grid-template-columns:1fr}}';
  style.textContent = css;
  document.head.appendChild(style);
}

function _builderStorageKey(moduleId){
  return 'hm_module_builder_' + moduleId;
}

function _snapshotSchema(){
  if(!state.schema) return '';
  try { return JSON.stringify(state.schema); } catch(err){ return ''; }
}

function _restoreSchemaSnapshot(snapshot){
  if(!snapshot) return;
  try {
    state.schema = JSON.parse(snapshot);
    _normalizeSchemaBlocks();
    if(!_getTabById(state.activeTab)){
      state.activeTab = state.schema && state.schema.tabs && state.schema.tabs.length ? state.schema.tabs[0].tabId : null;
    }
    if(state.selectedBlock && !_findBlock(state.selectedBlock)){
      state.selectedBlock = null;
      state.propsDraft = null;
    }
  } catch(err){}
}

function _resetUndoBaseline(label){
  undoManager.clear();
  undoManager.commit(_snapshotSchema(), label || _t('Khởi tạo module', 'Initialize module'));
}

function _pushUndoState(label){
  if(!state.schema) return;
  if(!undoManager.stack.length){
    undoManager.commit(_snapshotSchema(), label || _t('Khởi tạo module', 'Initialize module'));
  }
  state.pendingUndoLabel = label || '';
}

function _commitUndoState(label){
  if(!state.schema) return;
  undoManager.commit(_snapshotSchema(), label || state.pendingUndoLabel || '');
  state.pendingUndoLabel = '';
}

function _getUndoToastLabel(entry){
  return entry && entry.label ? entry.label : _t('thay đổi', 'change');
}

function _undo(){
  var entry = undoManager.undo();
  if(!entry) return;
  _restoreSchemaSnapshot(entry.snapshot);
  if(BE.toast) BE.toast(_t('↩ Hoàn tác: ', '↩ Undo: ') + _getUndoToastLabel(entry), 'info');
  _paint();
}

function _redo(){
  var entry = undoManager.redo();
  if(!entry) return;
  _restoreSchemaSnapshot(entry.snapshot);
  if(BE.toast) BE.toast(_t('↪ Làm lại: ', '↪ Redo: ') + _getUndoToastLabel(entry), 'info');
  _paint();
}

function _mutateSchema(label, mutateFn){
  if(!state.schema || typeof mutateFn !== 'function') return;
  _pushUndoState(label);
  mutateFn();
  _normalizeSchemaBlocks();
  _commitUndoState(label);
  _paint();
}

function _getTabById(tabId){
  var tabs = state.schema && state.schema.tabs ? state.schema.tabs : [];
  var i;
  for(i = 0; i < tabs.length; i++){
    if(tabs[i].tabId === tabId) return tabs[i];
  }
  return null;
}

function _getActiveTab(){
  if(!state.schema || !state.schema.tabs || !state.schema.tabs.length) return null;
  return _getTabById(state.activeTab) || state.schema.tabs[0];
}

function _ensureTabLayout(tab){
  if(!tab) return null;
  if(!_isObject(tab.layout)) tab.layout = {};
  if(!tab.layout.type) tab.layout.type = 'stack';
  if(!tab.layout.columns) tab.layout.columns = tab.layout.type === 'grid' ? 2 : 1;
  if(!tab.layout.gap) tab.layout.gap = '16px';
  if(!tab.layout.align) tab.layout.align = 'stretch';
  return tab.layout;
}

function _isContainerType(type){
  return ['two-column', 'three-column', 'card-container', 'accordion-group'].indexOf(type) >= 0;
}

function _getContainerSlots(type){
  if(type === 'two-column') return ['left', 'right'];
  return ['content'];
}

function _defaultBlockLayout(type){
  if(type === 'three-column'){
    return { type:'grid', columns:3, gap:'16px', align:'stretch' };
  }
  if(type === 'accordion-group'){
    return { type:'stack', columns:1, gap:'12px', align:'stretch' };
  }
  return { type:'stack', columns:1, gap:'16px', align:'stretch' };
}

function _ensureBlockBuilderDefaults(block){
  if(!block) return block;
  if(!block.blockId && block.id) block.blockId = block.id;
  if(!block.id && block.blockId) block.id = block.blockId;
  if(!block.blockId){
    block.blockId = _uid();
    block.id = block.blockId;
  }
  if(block.parentId === undefined) block.parentId = null;
  if(!block.slotKey) block.slotKey = block.parentId ? 'content' : 'default';
  if(!_isObject(block.layout)) block.layout = _defaultBlockLayout(block.type);
  if(!block.layout.type) block.layout.type = 'stack';
  if(!block.layout.columns) block.layout.columns = block.layout.type === 'grid' ? 2 : 1;
  if(!block.layout.gap) block.layout.gap = '16px';
  if(!block.layout.align) block.layout.align = 'stretch';
  if(block.locked == null) block.locked = false;
  if(block.collapsed == null) block.collapsed = false;
  if(block.visible == null) block.visible = true;
  return block;
}

function _flattenRuntimeBlocks(blocks, parentId, slotKey, out){
  var i;
  var block;
  var slots;
  var slotKeys;
  var s;
  var children;
  for(i = 0; i < (blocks || []).length; i++){
    block = blocks[i];
    if(!block) continue;
    _ensureBlockBuilderDefaults(block);
    block.parentId = parentId || null;
    block.slotKey = slotKey || 'default';
    slots = block.slots;
    delete block.slots;
    out.push(block);
    if(slots){
      slotKeys = Object.keys(slots);
      for(s = 0; s < slotKeys.length; s++){
        children = slots[slotKeys[s]] || [];
        _flattenRuntimeBlocks(children, block.blockId || block.id, slotKeys[s], out);
      }
    }
  }
}

function _layoutStyle(layout){
  var actual = layout || { type:'stack', columns:1, gap:'16px', align:'stretch' };
  var style = 'gap:' + _esc(actual.gap || '16px') + ';';
  if(actual.type === 'grid'){
    style += 'display:grid;grid-template-columns:repeat(' + Math.max(1, Math.min(6, parseInt(actual.columns, 10) || 1)) + ',minmax(0,1fr));';
  } else if(actual.type === 'flex'){
    style += 'display:flex;flex-wrap:wrap;align-items:' + _esc(actual.align || 'stretch') + ';';
  } else {
    style += 'display:flex;flex-direction:column;';
  }
  return style;
}

function _resequenceTabBlocks(tab){
  if(!tab) return;
  (tab.blocks || []).forEach(function(block, index){
    block.order = index + 1;
  });
}

function _normalizeSchemaBlocks(){
  var tabs;
  if(!state.schema) return;
  tabs = state.schema.tabs || [];
  tabs.forEach(function(tab){
    var flat = [];
    var hasRuntimeSlots = false;
    _ensureTabLayout(tab);
    (tab.blocks || []).forEach(function(block){
      if(block && block.slots) hasRuntimeSlots = true;
    });
    if(hasRuntimeSlots){
      _flattenRuntimeBlocks(tab.blocks || [], null, 'default', flat);
      tab.blocks = flat;
    } else {
      tab.blocks = tab.blocks || [];
    }
    (tab.blocks || []).forEach(function(block){
      _ensureBlockBuilderDefaults(block);
      _applySchemaDefaults(block, _getBlockSchema(block.type));
    });
    tab.blocks.sort(function(a, b){
      return (a.order || 0) - (b.order || 0);
    });
    _resequenceTabBlocks(tab);
  });
}

function _buildTabTree(tab){
  var tree = { roots: [], children: {}, byId: {} };
  var blocks = (tab && tab.blocks ? tab.blocks.slice() : []).sort(function(a, b){
    return (a.order || 0) - (b.order || 0);
  });
  blocks.forEach(function(block){
    tree.byId[block.blockId] = block;
  });
  blocks.forEach(function(block){
    var parentId = block.parentId || '';
    var slotKey = block.slotKey || 'default';
    if(parentId){
      if(!tree.children[parentId]) tree.children[parentId] = {};
      if(!tree.children[parentId][slotKey]) tree.children[parentId][slotKey] = [];
      tree.children[parentId][slotKey].push(block);
    } else {
      tree.roots.push(block);
    }
  });
  return tree;
}

function _getTreeChildren(tree, parentId, slotKey){
  if(!parentId) return tree.roots || [];
  return tree.children[parentId] && tree.children[parentId][slotKey] ? tree.children[parentId][slotKey] : [];
}

function _getSiblingBlocks(tab, parentId, slotKey, excludeIds){
  var ids = excludeIds || [];
  return (tab.blocks || []).filter(function(block){
    var currentParent = block.parentId || null;
    var currentSlot = block.slotKey || 'default';
    return currentParent === (parentId || null) && currentSlot === (slotKey || 'default') && ids.indexOf(block.blockId) < 0;
  }).sort(function(a, b){
    return (a.order || 0) - (b.order || 0);
  });
}

function _findBlockLocation(blockId){
  var result = null;
  (state.schema && state.schema.tabs ? state.schema.tabs : []).forEach(function(tab, tabIndex){
    (tab.blocks || []).forEach(function(block, blockIndex){
      if(block.blockId === blockId){
        result = {
          tab: tab,
          tabId: tab.tabId,
          tabIndex: tabIndex,
          block: block,
          blockIndex: blockIndex
        };
      }
    });
  });
  return result;
}

function _getDescendantIds(tab, blockId){
  var ids = [];
  function walk(parentId){
    (tab.blocks || []).forEach(function(block){
      if((block.parentId || null) === parentId){
        ids.push(block.blockId);
        walk(block.blockId);
      }
    });
  }
  walk(blockId);
  return ids;
}

function _getBlockTreeIds(tab, blockId){
  return [blockId].concat(_getDescendantIds(tab, blockId));
}

function _detachBlockTree(tab, blockId){
  var ids = _getBlockTreeIds(tab, blockId);
  var removed = [];
  (tab.blocks || []).forEach(function(block){
    if(ids.indexOf(block.blockId) >= 0) removed.push(block);
  });
  tab.blocks = (tab.blocks || []).filter(function(block){
    return ids.indexOf(block.blockId) < 0;
  });
  return removed;
}

function _findFlatIndex(tab, blockId){
  var i;
  for(i = 0; i < (tab.blocks || []).length; i++){
    if(tab.blocks[i].blockId === blockId) return i;
  }
  return -1;
}

function _insertBlockTree(tab, blocks, rootId, parentId, slotKey, siblingIndex){
  var anchor;
  var insertIndex;
  var siblings = _getSiblingBlocks(tab, parentId, slotKey, []);
  var rootBlock = null;
  blocks.forEach(function(block){
    if(block.blockId === rootId) rootBlock = block;
  });
  if(!rootBlock) return;
  rootBlock.parentId = parentId || null;
  rootBlock.slotKey = slotKey || 'default';
  anchor = siblingIndex < siblings.length ? siblings[siblingIndex] : null;
  insertIndex = anchor ? _findFlatIndex(tab, anchor.blockId) : (tab.blocks || []).length;
  if(insertIndex < 0) insertIndex = (tab.blocks || []).length;
  Array.prototype.splice.apply(tab.blocks, [insertIndex, 0].concat(blocks));
  _resequenceTabBlocks(tab);
}

function _cloneBlockTreeData(blockId){
  var location = _findBlockLocation(blockId);
  var ids;
  var blocks;
  if(!location) return null;
  ids = _getBlockTreeIds(location.tab, blockId);
  blocks = (location.tab.blocks || []).filter(function(block){
    return ids.indexOf(block.blockId) >= 0;
  }).map(function(block){
    return _clone(block);
  });
  return {
    rootId: blockId,
    blocks: blocks
  };
}

function _remapTreeIds(treeData){
  var map = {};
  var blocks;
  var rootId;
  if(!treeData) return null;
  blocks = (treeData.blocks || []).map(function(block){
    var clone = _clone(block);
    var newId = _uid();
    map[clone.blockId] = newId;
    clone.blockId = newId;
    clone.id = newId;
    return clone;
  });
  blocks.forEach(function(block){
    if(block.parentId && map[block.parentId]) block.parentId = map[block.parentId];
  });
  rootId = map[treeData.rootId] || '';
  return { rootId: rootId, blocks: blocks };
}

function _compileRuntimeSchema(schema){
  var runtime = _clone(schema || {});
  (runtime.tabs || []).forEach(function(tab){
    var byId = {};
    var roots = [];
    var blocks = (tab.blocks || []).slice().sort(function(a, b){
      return (a.order || 0) - (b.order || 0);
    });
    blocks.forEach(function(block){
      var item = _clone(block);
      var slots = {};
      _getContainerSlots(item.type).forEach(function(slot){
        slots[slot] = [];
      });
      if(_isContainerType(item.type)) item.slots = slots;
      byId[item.blockId || item.id] = item;
    });
    blocks.forEach(function(block){
      var id = block.blockId || block.id;
      var compiled = byId[id];
      var parentId = block.parentId || null;
      var slotKey = block.slotKey || 'content';
      if(parentId && byId[parentId] && byId[parentId].slots){
        if(!byId[parentId].slots[slotKey]) byId[parentId].slots[slotKey] = [];
        byId[parentId].slots[slotKey].push(compiled);
      } else {
        roots.push(compiled);
      }
    });
    tab.blocks = roots;
  });
  return runtime;
}

function _saveBuilderSnapshotLocal(){
  if(!state.schema) return;
  try { localStorage.setItem(_builderStorageKey(state.schema.moduleId), JSON.stringify(state.schema)); } catch(err){}
}

function _clearBuilderSnapshotLocal(moduleId){
  try { localStorage.removeItem(_builderStorageKey(moduleId)); } catch(err){}
}

function _runtimeSchemaStorageKeys(moduleId){
  return ['hm_module_schema_' + moduleId, 'hm_schema_' + moduleId];
}

function _readRuntimeSchemaLocal(moduleId){
  var raw = null;
  var keys = _runtimeSchemaStorageKeys(moduleId);
  var i;
  try {
    for(i = 0; i < keys.length; i++){
      raw = localStorage.getItem(keys[i]);
      if(raw) return JSON.parse(raw);
    }
  } catch(err){}
  return null;
}

function _writeRuntimeSchemaLocal(moduleId, schema){
  try {
    _runtimeSchemaStorageKeys(moduleId).forEach(function(key){
      localStorage.setItem(key, JSON.stringify(schema));
    });
  } catch(err){}
}

function _clearRuntimeSchemaLocal(moduleId){
  try {
    _runtimeSchemaStorageKeys(moduleId).forEach(function(key){
      localStorage.removeItem(key);
    });
  } catch(err){}
}

function _clearRuntimeModuleCache(moduleId){
  if(MR && typeof MR.clearCache === 'function') MR.clearCache(moduleId);
}

function _normalizeSavedModuleSummary(schema){
  var fallbackTitle = schema && schema.moduleId ? schema.moduleId : 'module';
  if(!schema || !schema.moduleId) return null;
  return {
    moduleId: schema.moduleId,
    title: _clone(schema.title || { vi:fallbackTitle, en:fallbackTitle }),
    icon: schema.icon || '',
    route: schema.route || '',
    version: schema.version || 1,
    updatedAt: schema.updatedAt || schema.createdAt || '',
    updatedBy: schema.updatedBy || schema.createdBy || ''
  };
}

function _mergeSavedModules(primary, secondary){
  var map = {};
  var out = [];
  function pushItem(item){
    var normalized = _normalizeSavedModuleSummary(item);
    var existing;
    if(!normalized) return;
    existing = map[normalized.moduleId];
    if(!existing){
      map[normalized.moduleId] = normalized;
      out.push(normalized);
      return;
    }
    if((normalized.updatedAt || '') >= (existing.updatedAt || '')){
      Object.keys(existing).forEach(function(key){ delete existing[key]; });
      Object.keys(normalized).forEach(function(key){ existing[key] = normalized[key]; });
    }
  }
  (secondary || []).forEach(pushItem);
  (primary || []).forEach(pushItem);
  out.sort(function(a, b){
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  return out;
}

function _getBlockTitle(block){
  var title = block && block.title ? _t(block.title.vi || '', block.title.en || '') : '';
  if(title) return title;
  return _getCatalogLabel(block.type);
}

function _isBlockLocked(blockId){
  var block = _findBlock(blockId);
  return !!(block && block.locked);
}

function _collectBlockSequence(tab){
  var tree = _buildTabTree(tab);
  var list = [];
  function walk(block){
    list.push(block);
    _getContainerSlots(block.type).forEach(function(slotKey){
      _getTreeChildren(tree, block.blockId, slotKey).forEach(function(child){
        walk(child);
      });
    });
  }
  tree.roots.forEach(function(root){
    walk(root);
  });
  return list;
}

function _navigateSelection(delta){
  var tab = _getActiveTab();
  var sequence;
  var index = -1;
  if(!tab) return;
  sequence = _collectBlockSequence(tab);
  sequence.forEach(function(block, idx){
    if(block.blockId === state.selectedBlock) index = idx;
  });
  if(index < 0 && sequence.length){
    state.selectedBlock = sequence[0].blockId;
  } else if(sequence[index + delta]){
    state.selectedBlock = sequence[index + delta].blockId;
  }
  state.pendingScrollBlock = state.selectedBlock;
  _paint();
}

function _copyBlock(blockId){
  var treeData = _cloneBlockTreeData(blockId || state.selectedBlock);
  if(!treeData) return;
  clipboard.block = treeData;
  if(BE.toast) BE.toast(_t('Đã sao chép block', 'Block copied'), 'success');
}

function _pasteBlock(targetBlockId){
  var treeData = clipboard.block ? _remapTreeIds(clipboard.block) : null;
  var targetLocation;
  var tab;
  var siblings;
  var siblingIndex = 0;
  if(!treeData || !treeData.blocks.length) return;
  targetLocation = targetBlockId ? _findBlockLocation(targetBlockId) : null;
  tab = targetLocation ? targetLocation.tab : _getActiveTab();
  if(!tab) return;
  _mutateSchema(_t('Dán block', 'Paste block'), function(){
    if(targetLocation){
      siblings = _getSiblingBlocks(tab, targetLocation.block.parentId || null, targetLocation.block.slotKey || 'default', []);
      siblings.forEach(function(item, index){
        if(item.blockId === targetLocation.block.blockId) siblingIndex = index + 1;
      });
      _insertBlockTree(tab, treeData.blocks, treeData.rootId, targetLocation.block.parentId || null, targetLocation.block.slotKey || 'default', siblingIndex);
    } else {
      _insertBlockTree(tab, treeData.blocks, treeData.rootId, null, 'default', _getSiblingBlocks(tab, null, 'default', []).length);
    }
    state.selectedBlock = treeData.rootId;
    state.pendingScrollBlock = treeData.rootId;
  });
}

function _setInsertTarget(tabId, parentId, slotKey, position){
  state.insertTab = tabId || (state.activeTab || '');
  state.insertParent = parentId || null;
  state.insertSlot = slotKey || 'default';
  state.insertPosition = position == null ? null : position;
}

function _insertBlockAtTarget(blockType, preConfig, target){
  var tab = _getTabById(target.tabId) || _getActiveTab();
  var newBlock;
  if(!tab) return;
  newBlock = _createBlockScaffold(blockType, preConfig);
  _insertBlockTree(tab, [newBlock], newBlock.blockId, target.parentId || null, target.slotKey || 'default', target.insertIndex == null ? _getSiblingBlocks(tab, target.parentId || null, target.slotKey || 'default', []).length : target.insertIndex);
  state.selectedBlock = newBlock.blockId;
  state.propsDraft = _clone(newBlock);
  state.propsTab = 'general';
  state.pendingScrollBlock = newBlock.blockId;
}

function _moveTreeToTarget(blockId, target){
  var sourceLocation = _findBlockLocation(blockId);
  var sourceIds;
  var detached;
  var targetTab;
  if(!sourceLocation || !target) return;
  sourceIds = _getBlockTreeIds(sourceLocation.tab, blockId);
  if(target.parentId && sourceIds.indexOf(target.parentId) >= 0) return;
  detached = _detachBlockTree(sourceLocation.tab, blockId);
  targetTab = _getTabById(target.tabId) || sourceLocation.tab;
  _insertBlockTree(targetTab, detached, blockId, target.parentId || null, target.slotKey || 'default', target.insertIndex == null ? _getSiblingBlocks(targetTab, target.parentId || null, target.slotKey || 'default', []).length : target.insertIndex);
  _resequenceTabBlocks(sourceLocation.tab);
  if(targetTab !== sourceLocation.tab) _resequenceTabBlocks(targetTab);
  state.activeTab = targetTab.tabId;
  state.selectedBlock = blockId;
  state.pendingScrollBlock = blockId;
}

function _renderShortcutPopover(){
  if(!state.showShortcuts) return '';
  var h = '';
  h += '<div class="mb-shortcuts">';
  h += '<h4>'+_t('⌨ Phím tắt Builder', '⌨ Builder Shortcuts')+'</h4>';
  h += '<div class="mb-shortcuts-list">';
  h += '<span>'+_t('Hoàn tác / Làm lại', 'Undo / Redo')+'</span><kbd>Ctrl+Z / Ctrl+Y</kbd>';
  h += '<span>'+_t('Lưu module', 'Save module')+'</span><kbd>Ctrl+S</kbd>';
  h += '<span>'+_t('Nhân đôi block', 'Duplicate block')+'</span><kbd>Ctrl+D</kbd>';
  h += '<span>'+_t('Sao chép / Cắt / Dán', 'Copy / Cut / Paste')+'</span><kbd>Ctrl+C / X / V</kbd>';
  h += '<span>'+_t('Xóa block', 'Delete block')+'</span><kbd>Delete</kbd>';
  h += '<span>'+_t('Đi lên / xuống block', 'Navigate blocks')+'</span><kbd>↑ / ↓</kbd>';
  h += '<span>'+_t('Đổi tab', 'Cycle tabs')+'</span><kbd>Tab</kbd>';
  h += '<span>'+_t('Mở thư viện / cây widget', 'Toggle library / tree')+'</span><kbd>L / T</kbd>';
  h += '<span>'+_t('Bỏ chọn / đóng panel', 'Deselect / close panels')+'</span><kbd>Esc</kbd>';
  h += '</div></div>';
  return h;
}

function _renderContextMenu(){
  if(!state.contextMenu || !state.contextMenu.blockId) return '';
  var blockId = state.contextMenu.blockId;
  var disabledPaste = clipboard.block ? '' : ' disabled';
  var h = '';
  h += '<div class="mb-context-menu" data-context-menu="1" style="left:'+state.contextMenu.x+'px;top:'+state.contextMenu.y+'px">';
  h += '<button data-action="duplicate-block" data-block="'+_esc(blockId)+'">'+_t('Nhân đôi', 'Duplicate')+'</button>';
  h += '<button data-action="copy-block" data-block="'+_esc(blockId)+'">'+_t('Sao chép', 'Copy')+'</button>';
  h += '<button data-action="cut-block" data-block="'+_esc(blockId)+'">'+_t('Cắt', 'Cut')+'</button>';
  h += '<button data-action="paste-block" data-block="'+_esc(blockId)+'"'+disabledPaste+'>'+_t('Dán', 'Paste')+'</button>';
  h += '<button data-action="delete-block" data-block="'+_esc(blockId)+'" style="color:var(--red)">'+_t('Xóa', 'Delete')+'</button>';
  h += '</div>';
  return h;
}

function _renderTreeNode(block, tab, tree, depth){
  var catalog = (BE.BLOCK_CATALOG || {})[block.type] || {};
  var slots = _getContainerSlots(block.type);
  var hasChildren = false;
  var collapsedKey = 'block:' + block.blockId;
  var rowClass = 'mb-tree-node';
  var h = '';
  slots.forEach(function(slotKey){
    if(_getTreeChildren(tree, block.blockId, slotKey).length) hasChildren = true;
  });
  if(state.selectedBlock === block.blockId) rowClass += ' is-selected';
  if(block.visible === false) rowClass += ' is-hidden';
  if(block.locked) rowClass += ' is-locked';
  h += '<div style="margin-left:'+(depth * 12)+'px">';
  h += '<div class="'+rowClass+'" data-context-block="'+_esc(block.blockId)+'" draggable="'+(block.locked ? 'false' : 'true')+'" data-drag-block="'+_esc(block.blockId)+'" data-drag-tab="'+_esc(tab.tabId)+'" data-drag-disabled="'+(block.locked ? '1' : '0')+'">';
  if(hasChildren || _isContainerType(block.type)){
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-node-collapse" data-block="'+_esc(block.blockId)+'">'+(state.treeCollapsed[collapsedKey] ? '▸' : '▾')+'</button>';
  } else {
    h += '<span style="display:inline-block;width:26px"></span>';
  }
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="select-block" data-block="'+_esc(block.blockId)+'" style="padding:0;border:0;background:none;display:flex;align-items:center;gap:8px;flex:1;min-width:0">';
  h += '<span style="font-size:14px">'+_esc(catalog.icon || '📦')+'</span>';
  h += '<span class="mb-tree-label"><span class="mb-tree-title">'+_esc(_getBlockTitle(block))+'</span><span class="mb-tree-type">'+_esc(_getCatalogLabel(block.type))+'</span></span>';
  h += '</button>';
  h += '<div class="mb-tree-tools">';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-block-visibility" data-block="'+_esc(block.blockId)+'" title="'+_t('Hiện / Ẩn', 'Show / Hide')+'">'+(block.visible === false ? '🙈' : '👁')+'</button>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-block-lock" data-block="'+_esc(block.blockId)+'" title="'+_t('Khóa / Mở khóa', 'Lock / Unlock')+'">'+(block.locked ? '🔒' : '🔓')+'</button>';
  h += '</div></div>';
  if(!state.treeCollapsed[collapsedKey]){
    slots.forEach(function(slotKey){
      _getTreeChildren(tree, block.blockId, slotKey).forEach(function(child){
        h += _renderTreeNode(child, tab, tree, depth + 1);
      });
    });
  }
  h += '</div>';
  return h;
}

function _renderWidgetTree(){
  var h = '';
  h += '<div class="mb-side-panel">';
  h += '<div class="mb-panel-header"><div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary)">'+_t('Widget Tree', 'Widget Tree')+'</div><strong>'+_t('Cây module', 'Module Tree')+'</strong></div><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-tree">×</button></div>';
  h += '<div class="mb-tree-scroll">';
  h += '<div class="mb-tree-root">'+_esc(state.schema ? _t(state.schema.title.vi, state.schema.title.en) : _t('Module', 'Module'))+'</div>';
  (state.schema && state.schema.tabs ? state.schema.tabs : []).forEach(function(tab){
    var tree = _buildTabTree(tab);
    var tabCollapsedKey = 'tab:' + tab.tabId;
    h += '<div style="margin-bottom:10px">';
    h += '<div class="mb-tree-node'+(state.activeTab === tab.tabId ? ' is-selected' : '')+'">';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-node-collapse" data-block="'+_esc(tabCollapsedKey)+'">'+(state.treeCollapsed[tabCollapsedKey] ? '▸' : '▾')+'</button>';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="switch-tab" data-tab="'+_esc(tab.tabId)+'" style="padding:0;border:0;background:none;display:flex;align-items:center;gap:8px;flex:1;min-width:0"><span style="font-size:14px">'+_esc(tab.icon || '📑')+'</span><span class="mb-tree-label"><span class="mb-tree-title">'+_esc(_t(tab.title.vi, tab.title.en))+'</span><span class="mb-tree-type">'+_esc(_t('Tab', 'Tab'))+' • '+tree.roots.length+'</span></span></button>';
    h += '</div>';
    if(!state.treeCollapsed[tabCollapsedKey]){
      if(!tree.roots.length){
        h += '<div style="margin-left:24px;color:var(--text-tertiary);font-size:12px;padding:6px 8px">'+_t('Chưa có block', 'No blocks yet')+'</div>';
      }
      tree.roots.forEach(function(root){
        h += _renderTreeNode(root, tab, tree, 1);
      });
    }
    h += '</div>';
  });
  h += '</div></div>';
  return h;
}

function _renderSlotChildren(tab, tree, parentId, slotKey, slotLabel){
  var children = _getTreeChildren(tree, parentId, slotKey);
  var h = '';
  h += '<div class="mb-slot" data-drop-zone="1" data-drop-tab="'+_esc(tab.tabId)+'" data-drop-parent="'+_esc(parentId || '')+'" data-drop-slot="'+_esc(slotKey || 'default')+'">';
  h += '<div class="mb-slot-title">'+_esc(slotLabel)+'</div>';
  if(!children.length){
    h += '<div class="mb-slot-empty">'+_t('Kéo block vào đây hoặc mở thư viện để thêm nhanh.', 'Drop a block here or open the library to add one quickly.')+'</div>';
  }
  children.forEach(function(child){
    h += _renderCanvasBlock(child, tab, tree, 0);
  });
  h += '<div class="mb-slot-actions"><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="open-library" data-tab="'+_esc(tab.tabId)+'" data-parent="'+_esc(parentId || '')+'" data-slot="'+_esc(slotKey || 'default')+'">+ '+_t('Thêm block', 'Add block')+'</button></div>';
  h += '</div>';
  return h;
}

function _renderCanvasBlock(block, tab, tree, depth){
  var catalog = (BE.BLOCK_CATALOG || {})[block.type] || {};
  var cardClass = 'mb-block-card';
  var h = '';
  if(state.selectedBlock === block.blockId) cardClass += ' is-selected';
  if(block.visible === false) cardClass += ' is-hidden';
  if(block.locked) cardClass += ' is-locked';
  h += '<div class="'+cardClass+'" data-context-block="'+_esc(block.blockId)+'" data-block-wrapper="'+_esc(block.blockId)+'" data-tab-id="'+_esc(tab.tabId)+'" draggable="'+(block.locked ? 'false' : 'true')+'" data-drag-block="'+_esc(block.blockId)+'" data-drag-tab="'+_esc(tab.tabId)+'" data-drag-disabled="'+(block.locked ? '1' : '0')+'">';
  h += '<div class="mb-block-head">';
  h += '<div class="mb-block-meta">';
  h += '<div class="mb-block-icon">'+_esc(catalog.icon || '📦')+'</div>';
  h += '<div><div class="mb-block-name">'+_esc(_getBlockTitle(block))+'</div><div class="mb-block-type">'+_esc(_getCatalogLabel(block.type))+(block.locked ? ' • '+_t('Đã khóa', 'Locked') : '')+(block.visible === false ? ' • '+_t('Đang ẩn', 'Hidden') : '')+'</div></div>';
  h += '</div>';
  h += '<div class="mb-block-tools">';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-up" data-block="'+_esc(block.blockId)+'" title="'+_t('Lên trên', 'Move up')+'">▲</button>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="move-down" data-block="'+_esc(block.blockId)+'" title="'+_t('Xuống dưới', 'Move down')+'">▼</button>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="config-block" data-block="'+_esc(block.blockId)+'" title="'+_t('Cấu hình', 'Configure')+'">⚙</button>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="duplicate-block" data-block="'+_esc(block.blockId)+'" title="'+_t('Nhân đôi', 'Duplicate')+'">📋</button>';
  h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" style="color:var(--red)" data-action="delete-block" data-block="'+_esc(block.blockId)+'" title="'+_t('Xóa', 'Delete')+'">🗑</button>';
  h += '</div></div>';
  h += '<div class="mb-block-body">';
  h += _renderBlockPreview(block);
  if(_isContainerType(block.type) && !state.treeCollapsed['block:'+block.blockId]){
    if(block.type === 'two-column'){
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">';
      h += _renderSlotChildren(tab, tree, block.blockId, 'left', _t('Cột trái', 'Left column'));
      h += _renderSlotChildren(tab, tree, block.blockId, 'right', _t('Cột phải', 'Right column'));
      h += '</div>';
    } else {
      h += '<div style="'+_layoutStyle(block.layout)+'margin-top:12px">';
      h += _renderSlotChildren(tab, tree, block.blockId, 'content', _t('Vùng nội dung', 'Content slot'));
      h += '</div>';
    }
  }
  h += '</div></div>';
  return h;
}

_renderLibraryPanel = function(){
  var h = '';
  var catalog = BE.BLOCK_CATALOG || {};
  var categories = BE.BLOCK_CATEGORIES || [];
  var packMap = _getDomainPackMap();
  var search = state.librarySearch || '';
  var normalizedSearch = _normalizeSearchText(search);
  h += '<div class="mb-rail-panel">';
  h += '<div class="mb-panel-header"><div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary)">'+_t('Library', 'Library')+'</div><strong>'+_t('Thư viện block', 'Block Library')+'</strong></div><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="close-library">×</button></div>';
  h += '<div class="mb-panel-body">';
  h += '<div class="mb-library-tabs">';
  h += '<button class="hm-btn '+(state.libraryMode === 'blocks' ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="library-mode" data-mode="blocks">🧩 '+_t('Blocks', 'Blocks')+'</button>';
  h += '<button class="hm-btn '+(state.libraryMode === 'packs' ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="library-mode" data-mode="packs">📦 '+_t('Field Packs', 'Field Packs')+'</button>';
  h += '</div>';
  if(state.libraryMode === 'packs'){
    h += '<div class="mb-helper-note">'+_t('Kéo field pack vào block biểu mẫu, bảng dữ liệu hoặc thanh lọc để builder tự ghép schema theo domain.', 'Drag a field pack into a form, table, or filter bar so the builder can merge domain-aware schema automatically.')+'</div>';
    h += '<input type="text" class="hm-input" id="mb-lib-search" placeholder="'+_t('Tìm field pack...', 'Search field packs...')+'" value="'+_esc(state.librarySearch || '')+'">';
    _ensureRegistriesLoaded();
    if(state.registries.loading && !Object.keys(packMap).length){
      h += '<div class="mb-inline-loading"><span class="mb-spinner"></span><span>'+_esc(state.registries.loadingMessage || _t('Đang nạp field pack...', 'Loading field packs...'))+'</span></div>';
    }
    ['bao_gia','don_hang','ke_hoach','mua_hang','san_xuat','chat_luong','ho_so','bao_cao','tai_lieu','quan_tri'].forEach(function(moduleKey){
      var items = Object.keys(packMap).filter(function(packKey){
        var info = _getPackInfo(packKey, packMap[packKey] || []);
        var haystack = _normalizeSearchText(packKey + ' ' + info.label + ' ' + info.description + ' ' + info.moduleLabel);
        return info.module === moduleKey && (!normalizedSearch || haystack.indexOf(normalizedSearch) >= 0);
      });
      if(!items.length) return;
      h += '<div style="margin-top:16px">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);font-weight:700;margin-bottom:8px">'+_esc(_packModuleInfo(moduleKey).icon)+' '+_esc(_packModuleInfo(moduleKey).label)+' ('+items.length+')</div>';
      items.forEach(function(packKey){
        var info = _getPackInfo(packKey, packMap[packKey] || []);
        h += '<div class="mb-pack-card" draggable="true" data-field-pack="'+_esc(packKey)+'">';
        h += '<div class="mb-pack-head"><div class="mb-pack-icon">'+_esc(info.icon)+'</div><div style="flex:1"><div class="mb-pack-name">'+_esc(info.label)+'</div><div class="mb-pack-meta">'+_esc(info.moduleLabel)+' • '+info.count+' '+_t('trường', 'fields')+'</div></div></div>';
        h += '<div class="mb-pack-desc">'+_esc(info.description)+'</div>';
        h += '<div class="mb-pack-actions"><button class="hm-btn hm-btn-primary hm-btn-sm" data-action="open-pack-picker" data-pack="'+_esc(packKey)+'">'+_t('Thêm nhanh', 'Quick add')+'</button></div>';
        h += '</div>';
      });
      h += '</div>';
    });
  } else {
    h += '<div class="mb-helper-note">'+_t('Kéo trực tiếp block từ thư viện vào canvas hoặc bấm để chèn vào vị trí đang chọn.', 'Drag blocks directly from the library into the canvas or click to insert at the selected position.')+'</div>';
    h += '<input type="text" class="hm-input" id="mb-lib-search" placeholder="'+_t('Tìm block...', 'Search blocks...')+'" value="'+_esc(state.librarySearch || '')+'">';
    categories.forEach(function(cat){
      var keys = Object.keys(catalog).filter(function(key){
        var entry = catalog[key];
        var label = _normalizeSearchText(entry.label || '');
        var labelEn = _normalizeSearchText(entry.labelEn || '');
        return entry.category === cat.key && (!normalizedSearch || label.indexOf(normalizedSearch) >= 0 || labelEn.indexOf(normalizedSearch) >= 0 || _normalizeSearchText(key).indexOf(normalizedSearch) >= 0);
      });
      if(!keys.length) return;
      h += '<div style="margin-top:16px">';
      h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:'+cat.color+';font-weight:700;margin-bottom:8px">'+_esc(_t(cat.label, cat.labelEn || cat.label))+' ('+keys.length+')</div>';
      keys.forEach(function(key){
        var entry = catalog[key];
        h += '<div class="mb-tree-node" draggable="true" data-library-type="'+_esc(key)+'" style="border:1px solid var(--border);margin-bottom:8px">';
        h += '<div style="font-size:18px;width:26px;text-align:center">'+_esc(entry.icon || '📦')+'</div>';
        h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="add-block-type" data-type="'+_esc(key)+'" style="padding:0;border:0;background:none;display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;text-align:left">';
        h += '<span class="mb-tree-label"><span class="mb-tree-title">'+_esc(entry.label)+'</span><span class="mb-tree-type">'+_esc(entry.labelEn || '')+'</span></span></button>';
        h += '</div>';
      });
      h += '</div>';
    });
  }
  h += '</div></div>';
  return h;
};

_renderPropertiesPanel = function(){
  var block = _findBlock(state.selectedBlock);
  var draft;
  var catalog;
  var tabs;
  var activeKey;
  var activeTab = null;
  var i;
  var h = '';
  if(!block) return '';
  _ensurePropsDraft(block);
  _ensureRegistriesLoaded();
  draft = state.propsDraft || block;
  catalog = (BE.BLOCK_CATALOG || {})[draft.type] || {};
  tabs = ((BE.BLOCK_PROPERTIES_SCHEMA || {})[draft.type] || []).slice();
  if(_relationsForSelectedBlock(draft.blockId || draft.id).length || _getRelationList().length){
    tabs.push({ key:'relations', label:'Liên kết', labelEn:'Links', icon:'🔗' });
  }
  activeKey = state.propsTab || (tabs[0] && tabs[0].key) || 'general';
  for(i = 0; i < tabs.length; i++){
    if(tabs[i].key === activeKey) activeTab = tabs[i];
  }
  if(!activeTab && tabs.length) activeTab = tabs[0];
  h += '<div class="mb-rail-panel">';
  h += '<div class="mb-panel-header"><div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary)">'+_t('Properties', 'Properties')+'</div><strong>'+_esc(catalog.icon || '📦')+' '+_esc(_getCatalogLabel(draft.type))+'</strong></div><button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="close-props">×</button></div>';
  h += '<div class="mb-panel-body">';
  h += '<div class="mb-helper-note">'+_t('Hỗ trợ binding kiểu {{ data.total || 0 }} và pipe filter như {{ data.total | number }}.', 'Supports bindings like {{ data.total || 0 }} and pipe filters like {{ data.total | number }}.')+'</div>';
  if(block.locked){
    h += '<div style="padding:10px 12px;border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.08);border-radius:12px;color:var(--text-secondary);font-size:12px;margin-bottom:12px">'+_t('Block này đang khóa. Bạn vẫn có thể mở để xem cấu hình hoặc mở khóa từ cây widget.', 'This block is locked. You can inspect it here or unlock it from the widget tree.')+'</div>';
  }
  h += _renderPropField({ label:_t('Hiển thị', 'Visible'), labelEn:'Visible', type:'toggle', path:'visible' }, 'visible', draft.visible);
  h += _renderPropField({ label:_t('Khóa chỉnh sửa', 'Lock editing'), labelEn:'Lock editing', type:'toggle', path:'locked' }, 'locked', draft.locked);
  if(_isContainerType(draft.type)){
    h += _renderPropField({ label:_t('Kiểu bố cục', 'Layout type'), labelEn:'Layout type', type:'select', path:'layout.type', repaintOnChange:true, options:[{ value:'stack', label:_t('Xếp dọc', 'Stack') }, { value:'grid', label:_t('Lưới', 'Grid') }, { value:'flex', label:_t('Flex', 'Flex') }] }, 'layout.type', _getByPath(draft, 'layout.type'));
    h += _renderPropField({ label:_t('Số cột', 'Columns'), labelEn:'Columns', type:'number', path:'layout.columns', repaintOnChange:true, min:1, max:6, step:1 }, 'layout.columns', _getByPath(draft, 'layout.columns'));
    h += _renderPropField({ label:_t('Khoảng cách', 'Gap'), labelEn:'Gap', type:'text', path:'layout.gap' }, 'layout.gap', _getByPath(draft, 'layout.gap'));
    h += _renderPropField({ label:_t('Canh flex', 'Flex align'), labelEn:'Flex align', type:'select', path:'layout.align', options:['stretch','start','center','end'] }, 'layout.align', _getByPath(draft, 'layout.align'));
  }
  h += '<div style="font-size:12px;color:var(--text-tertiary);margin:0 0 16px">'+_t('Parent: ', 'Parent: ')+_esc(draft.parentId || 'root')+' • Slot: '+_esc(draft.slotKey || 'default')+'</div>';
  if(tabs.length){
    h += '<div class="mb-toolbar" style="padding:0 0 12px;border:0;background:none">';
    tabs.forEach(function(tab){
      h += '<button class="hm-btn '+(activeKey === tab.key ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="props-tab" data-tab="'+_esc(tab.key)+'">'+_esc(tab.icon || '')+' '+_esc(_t(tab.label, tab.labelEn || tab.label))+'</button>';
    });
    h += '</div>';
  }
  if(activeKey === 'relations'){
    h += _renderRelationsPanel(draft);
  } else if(activeTab){
    (activeTab.sections || []).forEach(function(section){
      h += _renderPropSection(section, draft);
    });
    if(draft.type === 'form-standard'){
      h += _renderRegistryValidationSummary(draft);
    }
    if(draft.type === 'action-status-flow'){
      h += _renderWorkflowRegistrySummary(draft);
    }
  }
  h += '</div><div class="mb-panel-header" style="border-top:1px solid var(--border);border-bottom:0;background:#fff">';
  h += '<button class="hm-btn hm-btn-secondary" data-action="close-props">'+_t('Đóng', 'Close')+'</button>';
  h += '<button class="hm-btn hm-btn-primary" data-action="save-props">'+_t('Áp dụng', 'Apply')+'</button>';
  h += '</div></div>';
  return h;
};

_renderBuilder = function(){
  var schema = state.schema;
  var activeTab;
  var tree;
  var roots;
  var undoInfo;
  var relationSuggestions;
  var configuredLinks;
  var h = '';
  if(!schema) return '<div class="hm-empty">No schema</div>';
  activeTab = _getActiveTab();
  tree = activeTab ? _buildTabTree(activeTab) : { roots: [] };
  roots = tree.roots || [];
  undoInfo = undoManager.getInfo();
  relationSuggestions = activeTab ? _relationSuggestionsForTab(activeTab) : [];
  configuredLinks = activeTab ? _configuredDigitalLinks(activeTab) : [];
  h += '<div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 100%);color:#fff;padding:20px 24px;border-radius:24px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">';
  h += '<div><div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.72">MODULE BUILDER V2</div><h1 style="margin:6px 0 0;font-size:24px">'+_esc(schema.icon || '📦')+' '+_esc(_t(schema.title.vi, schema.title.en))+'</h1><div style="margin-top:8px;opacity:.85;font-size:13px">'+_t('Canvas dạng tree, kéo thả HTML5, undo/redo 200 bước và binding {{ }} an toàn.', 'Tree canvas, HTML5 drag-drop, 200-step undo/redo, and safe {{ }} bindings.')+'</div></div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,.16);color:#fff" data-action="undo-builder">'+_t('↩ Hoàn tác', '↩ Undo')+' ('+(undoInfo.position > 0 ? undoInfo.position : 0)+')</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,.12);color:#fff" data-action="redo-builder">'+_t('↪ Làm lại', '↪ Redo')+' ('+(undoInfo.canRedo ? (undoInfo.depth - undoInfo.position - 1) : 0)+')</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,.12);color:#fff" data-action="toggle-shortcuts">⌨</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,.16);color:#fff" data-action="preview-module">👁 '+_t('Xem trước', 'Preview')+'</button>';
  h += '<button class="hm-btn" style="background:var(--green);color:#fff" data-action="save-module">💾 '+_t('Lưu', 'Save')+'</button>';
  h += '<button class="hm-btn" style="background:rgba(255,255,255,.12);color:#fff" data-action="back-setup">← '+_t('Quay lại', 'Back')+'</button>';
  h += '</div></div>';
  h += '<div class="mb-builder-shell">';
  if(state.showTree) h += _renderWidgetTree();
  h += '<div class="mb-main-panel">';
  h += '<div class="mb-tab-strip">';
  (schema.tabs || []).forEach(function(tab){
    h += '<button class="mb-tab-pill'+(state.activeTab === tab.tabId ? ' is-active' : '')+'" data-action="switch-tab" data-tab="'+_esc(tab.tabId)+'">'+_esc(tab.icon || '📑')+' '+_esc(_t(tab.title.vi, tab.title.en))+'</button>';
  });
  h += '<button class="mb-tab-pill" data-action="add-tab">+ '+_t('Thêm tab', 'Add tab')+'</button>';
  if(schema.tabs && schema.tabs.length > 1){
    h += '<button class="mb-tab-pill" data-action="remove-tab">'+_t('🗑 Xóa tab hiện tại', '🗑 Remove active tab')+'</button>';
  }
  h += '</div>';
  if(activeTab){
    _ensureTabLayout(activeTab);
    h += '<div class="mb-toolbar">';
    h += '<div class="mb-toolbar-group">';
    h += '<button class="hm-btn '+(activeTab.layout.type === 'stack' ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="set-tab-layout" data-layout="stack">⬇ '+_t('Stack', 'Stack')+'</button>';
    h += '<button class="hm-btn '+(activeTab.layout.type === 'grid' ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="set-tab-layout" data-layout="grid">⊞ '+_t('Grid', 'Grid')+'</button>';
    h += '<button class="hm-btn '+(activeTab.layout.type === 'flex' ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="set-tab-layout" data-layout="flex">↔ '+_t('Flex', 'Flex')+'</button>';
    h += '</div>';
    h += '<div class="mb-toolbar-group">';
    h += '<span class="mb-kbd-chip">'+_t('Cột', 'Columns')+': <select class="hm-input hm-select" id="mb-layout-columns" style="height:30px;padding:2px 8px;min-width:68px"><option value="1"'+(String(activeTab.layout.columns) === '1' ? ' selected' : '')+'>1</option><option value="2"'+(String(activeTab.layout.columns) === '2' ? ' selected' : '')+'>2</option><option value="3"'+(String(activeTab.layout.columns) === '3' ? ' selected' : '')+'>3</option><option value="4"'+(String(activeTab.layout.columns) === '4' ? ' selected' : '')+'>4</option><option value="5"'+(String(activeTab.layout.columns) === '5' ? ' selected' : '')+'>5</option><option value="6"'+(String(activeTab.layout.columns) === '6' ? ' selected' : '')+'>6</option></select></span>';
    h += '<span class="mb-kbd-chip">'+_t('Gap', 'Gap')+': <select class="hm-input hm-select" id="mb-layout-gap" style="height:30px;padding:2px 8px;min-width:84px"><option value="8px"'+(activeTab.layout.gap === '8px' ? ' selected' : '')+'>8px</option><option value="12px"'+(activeTab.layout.gap === '12px' ? ' selected' : '')+'>12px</option><option value="16px"'+(activeTab.layout.gap === '16px' ? ' selected' : '')+'>16px</option><option value="24px"'+(activeTab.layout.gap === '24px' ? ' selected' : '')+'>24px</option></select></span>';
    h += '</div>';
    h += '<div class="mb-toolbar-spacer"></div>';
    h += '<div class="mb-toolbar-group">';
    h += '<button class="hm-btn hm-btn-ghost hm-btn-sm" data-action="toggle-tree">🌳 '+_t('Tree', 'Tree')+'</button>';
    h += '<button class="hm-btn '+(state.showLibrary ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-parent="" data-slot="default">📚 '+_t('Library', 'Library')+'</button>';
    h += '</div></div>';
    if(relationSuggestions.length || configuredLinks.length){
      h += '<div class="mb-link-banner">';
      h += '<div><strong>'+_t('Registry phát hiện digital thread giữa các block', 'Registry detected digital thread opportunities between blocks')+'</strong><div style="font-size:12px;color:var(--text-secondary)">'+_t('Gợi ý '+relationSuggestions.length+' liên kết mới và đang hiển thị '+configuredLinks.length+' liên kết đã cấu hình trên canvas hiện tại.', 'There are '+relationSuggestions.length+' suggested links and '+configuredLinks.length+' configured links on the current canvas.')+'</div></div>';
      h += '<button class="hm-btn '+(state.showDigitalThreadLinks ? 'hm-btn-primary' : 'hm-btn-ghost')+' hm-btn-sm" data-action="toggle-digital-thread-links">'+_t('🔗 Hiện/Ẩn links', '🔗 Toggle links')+'</button>';
      h += '</div>';
    }
    h += '<div class="mb-canvas-stage">';
    h += '<div class="mb-canvas-root" data-drop-zone="1" data-drop-tab="'+_esc(activeTab.tabId)+'" data-drop-parent="" data-drop-slot="default" style="'+_layoutStyle(activeTab.layout)+'">';
    if(!roots.length){
      h += '<div class="mb-slot-empty">'+_t('Trang đang trống. Bấm mở thư viện hoặc kéo block vào canvas để bắt đầu.', 'This page is empty. Open the library or drag a block onto the canvas to start.')+'</div>';
    }
    roots.forEach(function(root){
      h += _renderCanvasBlock(root, activeTab, tree, 0);
    });
    h += '<div class="mb-slot-actions"><button class="hm-btn hm-btn-primary hm-btn-sm" data-action="open-library" data-tab="'+_esc(activeTab.tabId)+'" data-parent="" data-slot="default">+ '+_t('Thêm block ở cuối canvas', 'Add block to canvas end')+'</button></div>';
    h += '</div></div>';
  }
  h += '</div>';
  if(state.showLibrary || state.selectedBlock){
    h += '<div class="mb-right-rail">';
    if(state.showLibrary) h += _renderLibraryPanel();
    if(state.selectedBlock) h += _renderPropertiesPanel();
    h += '</div>';
  }
  h += '</div>';
  h += _renderShortcutPopover();
  h += _renderContextMenu();
  if(state.packPicker) h += _renderPackPickerModal();
  return h;
};

_renderPreview = function(){
  var runtimeSchema = _compileRuntimeSchema(state.schema);
  var h = '';
  h += '<div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">';
  h += '<h2 style="margin:0;font-size:18px">👁 '+_t('Xem trước module', 'Module Preview')+'</h2>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hm-btn hm-btn-secondary" data-action="back-build">← '+_t('Quay lại Builder', 'Back to Builder')+'</button><button class="hm-btn hm-btn-primary" data-action="save-module">💾 '+_t('Lưu & Xuất bản', 'Save & Publish')+'</button></div>';
  h += '</div>';
  h += '<div id="mb-preview-container" style="border:1px solid var(--border);border-radius:24px;padding:16px;min-height:420px;background:var(--bg-page)"></div>';
  setTimeout(function(){
    var previewEl = document.getElementById('mb-preview-container');
    if(previewEl && runtimeSchema){
      _writeRuntimeSchemaLocal(runtimeSchema.moduleId, runtimeSchema);
      _saveBuilderSnapshotLocal();
      _clearRuntimeModuleCache(runtimeSchema.moduleId);
      if(BE.renderModuleFromSchema){
        BE.renderModuleFromSchema(previewEl, runtimeSchema);
      } else if(MR.renderModuleById){
        MR.renderModuleById(previewEl, runtimeSchema.moduleId);
      }
    }
  }, 100);
  return h;
};

_createBlockScaffold = function(blockType, preConfig){
  var catalog = (BE.BLOCK_CATALOG || {})[blockType] || {};
  var id = _uid();
  var block = {
    blockId: id,
    id: id,
    type: blockType,
    visible: true,
    locked: false,
    collapsed: false,
    parentId: null,
    slotKey: 'default',
    layout: _defaultBlockLayout(blockType),
    title: { vi: catalog.label || blockType, en: catalog.labelEn || blockType },
    subtitle: { vi:'', en:'' },
    config: {}
  };
  _applySchemaDefaults(block, _getBlockSchema(blockType));
  if(preConfig) _mergeDeep(block.config, _clone(preConfig));
  return block;
};

_createBlankModule = function(){
  var nameVi = (document.getElementById('mb-name') || {}).value || 'Module mới';
  var nameEn = (document.getElementById('mb-name-en') || {}).value || 'New Module';
  var route = (document.getElementById('mb-route') || {}).value || '/new-module';
  var icon = (document.getElementById('mb-icon') || {}).value || '📦';
  var tabsStr = (document.getElementById('mb-tabs') || {}).value || 'Tổng quan';
  var tabs = tabsStr.split(',').map(function(item, index){
    var title = item.replace(/^\s+|\s+$/g, '');
    return {
      tabId: 'tab-' + index + '-' + Date.now().toString(36),
      title: { vi: title, en: title },
      icon: '',
      layout: { type:'stack', columns:1, gap:'16px', align:'stretch' },
      blocks: []
    };
  });
  state.schema = {
    moduleId: 'custom-' + Date.now().toString(36),
    title: { vi: nameVi, en: nameEn },
    subtitle: { vi:'', en:'' },
    icon: icon,
    route: route,
    roles: ['ceo', 'it_admin'],
    version: 1,
    createdBy: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.username : 'admin',
    createdAt: new Date().toISOString(),
    tabs: tabs
  };
  state.selectedBlock = null;
  state.propsDraft = null;
  state.propsTab = 'general';
  state.activeTab = tabs.length ? tabs[0].tabId : null;
  state.step = 'build';
  _normalizeSchemaBlocks();
  _resetUndoBaseline(_t('Tạo module trắng', 'Create blank module'));
  _paint();
};

_addBlockToSchema = function(blockType, preConfig){
  var target = {
    tabId: state.insertTab || (state.activeTab || ''),
    parentId: state.insertParent || null,
    slotKey: state.insertSlot || 'default',
    insertIndex: state.insertPosition
  };
  _mutateSchema(_t('Thêm block', 'Add block'), function(){
    _insertBlockAtTarget(blockType, preConfig, target);
  });
};

_removeBlock = function(blockId){
  _mutateSchema(_t('Xóa block', 'Delete block'), function(){
    var location = _findBlockLocation(blockId);
    var ids;
    if(!location) return;
    ids = _getBlockTreeIds(location.tab, blockId);
    location.tab.blocks = (location.tab.blocks || []).filter(function(block){
      return ids.indexOf(block.blockId) < 0;
    });
    if(ids.indexOf(state.selectedBlock) >= 0){
      state.selectedBlock = null;
      state.propsDraft = null;
    }
  });
};

_duplicateBlock = function(blockId){
  _mutateSchema(_t('Nhân đôi block', 'Duplicate block'), function(){
    var location = _findBlockLocation(blockId);
    var treeData;
    var cloneData;
    var siblings;
    var siblingIndex = 0;
    if(!location) return;
    treeData = _cloneBlockTreeData(blockId);
    cloneData = _remapTreeIds(treeData);
    siblings = _getSiblingBlocks(location.tab, location.block.parentId || null, location.block.slotKey || 'default', []);
    siblings.forEach(function(item, index){
      if(item.blockId === location.block.blockId) siblingIndex = index + 1;
    });
    _insertBlockTree(location.tab, cloneData.blocks, cloneData.rootId, location.block.parentId || null, location.block.slotKey || 'default', siblingIndex);
    state.selectedBlock = cloneData.rootId;
    state.pendingScrollBlock = cloneData.rootId;
  });
};

_moveBlock = function(blockId, direction){
  _mutateSchema(direction < 0 ? _t('Di chuyển block lên', 'Move block up') : _t('Di chuyển block xuống', 'Move block down'), function(){
    var location = _findBlockLocation(blockId);
    var siblings;
    var currentIndex = -1;
    var targetIndex;
    var detached;
    if(!location) return;
    siblings = _getSiblingBlocks(location.tab, location.block.parentId || null, location.block.slotKey || 'default', []);
    siblings.forEach(function(item, index){
      if(item.blockId === blockId) currentIndex = index;
    });
    targetIndex = currentIndex + direction;
    if(currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    detached = _detachBlockTree(location.tab, blockId);
    _insertBlockTree(location.tab, detached, blockId, location.block.parentId || null, location.block.slotKey || 'default', targetIndex);
    state.pendingScrollBlock = blockId;
  });
};

_saveBlockProps = function(){
  var selectedId = state.selectedBlock;
  var draft = state.propsDraft;
  _mutateSchema(_t('Cập nhật thuộc tính block', 'Update block properties'), function(){
    var block = _findBlock(selectedId);
    if(!block || !draft) return;
    _applySchemaDefaults(draft, _getBlockSchema(draft.type));
    Object.keys(block).forEach(function(key){ delete block[key]; });
    Object.keys(draft).forEach(function(key){ block[key] = _clone(draft[key]); });
  });
};

_loadSavedModules = function(){
  var localModules = [];
  try {
    localModules = JSON.parse(localStorage.getItem('hm_saved_modules') || '[]');
  } catch(err){
    localModules = [];
  }
  state.savedModules = _mergeSavedModules(localModules, []);
  if(state.savedModulesLoading || state.savedModulesLoaded || typeof apiCall !== 'function') return;
  state.savedModulesLoading = true;
  apiCall('module_schema_list', {}, 'GET', 10000).then(function(resp){
    state.savedModulesLoading = false;
    state.savedModulesLoaded = true;
    if(!resp || resp.ok === false || !Array.isArray(resp.schemas)) return;
    state.savedModules = _mergeSavedModules(resp.schemas, state.savedModules);
    try { localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); } catch(err){}
    if(state.step === 'setup') _paint();
  }).catch(function(){
    state.savedModulesLoading = false;
  });
};

_addToSavedModules = function(schema){
  state.savedModules = _mergeSavedModules([schema], state.savedModules);
  try { localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); } catch(err){}
};

var _legacySaveModule = function(){
  var runtimeSchema;
  if(!state.schema) return;
  state.schema.version = (state.schema.version || 0) + 1;
  state.schema.updatedAt = new Date().toISOString();
  runtimeSchema = _compileRuntimeSchema(state.schema);
  try { localStorage.setItem('hm_module_schema_'+state.schema.moduleId, JSON.stringify(runtimeSchema)); } catch(err){}
  _saveBuilderSnapshotLocal();
  _addToSavedModules(state.schema);
  if(typeof apiCall === 'function'){
    apiCall('module_schema_save', { schema: runtimeSchema }, 'POST', 10000).catch(function(){});
  }
  if(BE.toast) BE.toast(_t('Đã lưu module: ', 'Module saved: ') + _t(state.schema.title.vi, state.schema.title.en), 'success');
};

var _legacyOpenSavedModule = function(moduleId){
  var raw = null;
  try { raw = localStorage.getItem(_builderStorageKey(moduleId)) || localStorage.getItem('hm_module_schema_'+moduleId); } catch(err){}
  if(!raw) return;
  try {
    state.schema = JSON.parse(raw);
    _normalizeSchemaBlocks();
    state.selectedBlock = null;
    state.propsDraft = null;
    state.propsTab = 'general';
    state.activeTab = state.schema.tabs && state.schema.tabs.length ? state.schema.tabs[0].tabId : null;
    state.step = 'build';
    _resetUndoBaseline(_t('Mở module', 'Open module'));
    _paint();
  } catch(err){}
};

var _legacyDeleteSavedModule = function(moduleId){
  try { localStorage.removeItem('hm_module_schema_'+moduleId); } catch(err){}
  _clearBuilderSnapshotLocal(moduleId);
  state.savedModules = state.savedModules.filter(function(item){
    return item.moduleId !== moduleId;
  });
  try { localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); } catch(err){}
};

_saveModule = function(){
  var runtimeSchema;
  var savedAt;
  var currentUserName;
  var saveRequest;
  if(!state.schema) return;
  savedAt = new Date().toISOString();
  currentUserName = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : (state.schema.updatedBy || state.schema.createdBy || 'admin');
  state.schema.updatedAt = savedAt;
  state.schema.updatedBy = currentUserName;
  runtimeSchema = _compileRuntimeSchema(state.schema);
  runtimeSchema.updatedAt = state.schema.updatedAt;
  runtimeSchema.updatedBy = state.schema.updatedBy;
  _writeRuntimeSchemaLocal(state.schema.moduleId, runtimeSchema);
  _saveBuilderSnapshotLocal();
  _clearRuntimeModuleCache(state.schema.moduleId);
  if(typeof apiCall !== 'function'){
    state.schema.version = (state.schema.version || 0) + 1;
    runtimeSchema.version = state.schema.version;
    runtimeSchema.updatedAt = state.schema.updatedAt;
    runtimeSchema.updatedBy = state.schema.updatedBy;
    _writeRuntimeSchemaLocal(state.schema.moduleId, runtimeSchema);
    _saveBuilderSnapshotLocal();
    _addToSavedModules(state.schema);
    if(BE.toast) BE.toast(_t('Da luu module: ', 'Module saved: ') + _t(state.schema.title.vi, state.schema.title.en), 'success');
    return Promise.resolve({ ok:true, local:true, schema:runtimeSchema });
  }
  saveRequest = apiCall('module_schema_save', { schema: runtimeSchema }, 'POST', 10000).then(function(resp){
    if(!resp || resp.ok === false || resp.saved === false){
      throw new Error((resp && (resp.detail || resp.error)) || 'save_failed');
    }
    state.schema.version = resp.version != null ? resp.version : ((state.schema.version || 0) + 1);
    state.schema.updatedAt = resp.updatedAt || savedAt;
    state.schema.updatedBy = resp.updatedBy || state.schema.updatedBy;
    runtimeSchema.version = state.schema.version;
    runtimeSchema.updatedAt = state.schema.updatedAt;
    runtimeSchema.updatedBy = state.schema.updatedBy;
    _writeRuntimeSchemaLocal(state.schema.moduleId, runtimeSchema);
    _saveBuilderSnapshotLocal();
    _addToSavedModules(state.schema);
    _clearRuntimeModuleCache(state.schema.moduleId);
    if(BE.toast) BE.toast(_t('Da luu module: ', 'Module saved: ') + _t(state.schema.title.vi, state.schema.title.en), 'success');
    return resp;
  }).catch(function(err){
    _addToSavedModules(state.schema);
    if(BE.toast) BE.toast(_t('Luu that bai, da giu ban local', 'Save failed, kept local copy'), 'warning');
    return { ok:false, local:true, error: err && err.message ? err.message : 'save_failed' };
  });
  return saveRequest;
};

_openSavedModule = function(moduleId){
  function applySchema(schema){
    if(!schema) return false;
    state.schema = _clone(schema);
    _normalizeSchemaBlocks();
    state.selectedBlock = null;
    state.propsDraft = null;
    state.propsTab = 'general';
    state.activeTab = state.schema.tabs && state.schema.tabs.length ? state.schema.tabs[0].tabId : null;
    state.step = 'build';
    _clearRuntimeModuleCache(moduleId);
    _saveBuilderSnapshotLocal();
    _resetUndoBaseline(_t('Mo module', 'Open module'));
    _paint();
    return true;
  }
  var raw = null;
  var runtimeLocal = null;
  try { raw = localStorage.getItem(_builderStorageKey(moduleId)); } catch(err){}
  if(raw){
    try {
      if(applySchema(JSON.parse(raw))) return Promise.resolve(true);
    } catch(err){}
  }
  runtimeLocal = _readRuntimeSchemaLocal(moduleId);
  if(runtimeLocal && applySchema(runtimeLocal)){
    return Promise.resolve(true);
  }
  if(typeof apiCall !== 'function') return Promise.resolve(false);
  return apiCall('module_schema_get', { id: moduleId }, 'GET', 10000).then(function(resp){
    if(!resp || resp.ok === false || !resp.schema){
      throw new Error((resp && (resp.detail || resp.error)) || 'not_found');
    }
    _writeRuntimeSchemaLocal(moduleId, resp.schema);
    return applySchema(resp.schema);
  }).catch(function(){
    if(BE.toast) BE.toast(_t('Khong mo duoc module da luu', 'Unable to open saved module'), 'error');
    return false;
  });
};

_deleteSavedModule = function(moduleId){
  function finalizeDelete(){
    _clearRuntimeSchemaLocal(moduleId);
    _clearBuilderSnapshotLocal(moduleId);
    _clearRuntimeModuleCache(moduleId);
    state.savedModules = (state.savedModules || []).filter(function(item){
      return item.moduleId !== moduleId;
    });
    try { localStorage.setItem('hm_saved_modules', JSON.stringify(state.savedModules)); } catch(err){}
    if(state.schema && state.schema.moduleId === moduleId){
      state.schema = null;
      state.selectedBlock = null;
      state.propsDraft = null;
      state.activeTab = null;
      state.step = 'setup';
    }
    return true;
  }
  if(typeof apiCall !== 'function'){
    return Promise.resolve(finalizeDelete());
  }
  return apiCall('module_schema_delete', { moduleId: moduleId }, 'POST', 10000).then(function(resp){
    if(!resp || resp.ok === false || resp.deleted === false){
      throw new Error((resp && (resp.detail || resp.error)) || 'delete_failed');
    }
    return finalizeDelete();
  }).catch(function(){
    if(BE.toast) BE.toast(_t('Xoa module that bai', 'Delete module failed'), 'error');
    return false;
  });
};

_openBlockConfig = function(blockId){
  var block = _findBlock(blockId);
  var api;
  if(!block) return;
  state.selectedBlock = block.blockId || block.id;
  state.propsTab = 'general';
  state.propsDraft = _clone(block);
  _applySchemaDefaults(state.propsDraft, _getBlockSchema(block.type));
  state.showLibrary = false;
  state.contextMenu = null;
  _ensureRegistriesLoaded();
  api = _getByPath(state.propsDraft, 'config.dataSource.api');
  if(api){
    _ensureDataFieldsForApi(api).then(function(){
      if(state.selectedBlock === (block.blockId || block.id)) _paint();
    });
  }
  _paint();
};

function _scrollSelectedIntoView(){
  if(!state.pendingScrollBlock) return;
  setTimeout(function(){
    var el = state.container && state.container.querySelector('[data-block-wrapper="'+state.pendingScrollBlock+'"]');
    if(el && el.scrollIntoView) el.scrollIntoView({ block:'nearest', behavior:'smooth' });
    state.pendingScrollBlock = null;
  }, 30);
}

render = function(container){
  state.container = container;
  _ensureBuilderState();
  _ensureBuilderStyles();
  _setupKeyboardShortcuts();
  _loadSavedModules();
  if(state.schema) _normalizeSchemaBlocks();
  _paint();
};

_paint = function(){
  var c = state.container;
  if(!c) return;
  _ensureBuilderState();
  _ensureBuilderStyles();
  switch(state.step){
    case 'setup': c.innerHTML = _renderSetup(); break;
    case 'preview': c.innerHTML = _renderPreview(); break;
    default: c.innerHTML = _renderBuilder(); break;
  }
  c.onclick = _handleClick;
  c.oninput = _handleInput;
  c.onchange = _handleInput;
  c.ondragstart = _handleDragStart;
  c.ondragover = _handleDragOver;
  c.ondrop = _handleDrop;
  c.ondragend = _handleDragEnd;
  c.ontouchstart = _handleTouchStart;
  c.ontouchmove = _handleTouchMove;
  c.ontouchend = _handleTouchEnd;
  c.ontouchcancel = _handleTouchCancel;
  c.oncontextmenu = _handleContextMenu;
  _paintDigitalThreadOverlay();
  _scrollSelectedIntoView();
};

function _resolveDropTarget(targetNode, clientY){
  var wrapper = targetNode && targetNode.closest ? targetNode.closest('[data-block-wrapper]') : null;
  var zone = targetNode && targetNode.closest ? targetNode.closest('[data-drop-zone="1"]') : null;
  var location;
  var siblings;
  var index = 0;
  var rect;
  var above;
  if(wrapper){
    location = _findBlockLocation(wrapper.getAttribute('data-block-wrapper'));
    if(!location) return null;
    siblings = _getSiblingBlocks(location.tab, location.block.parentId || null, location.block.slotKey || 'default', []);
    siblings.forEach(function(item, idx){
      if(item.blockId === location.block.blockId) index = idx;
    });
    rect = wrapper.getBoundingClientRect();
    above = clientY < (rect.top + rect.height / 2);
    return {
      tabId: location.tabId,
      parentId: location.block.parentId || null,
      slotKey: location.block.slotKey || 'default',
      insertIndex: above ? index : index + 1,
      indicatorType: above ? 'above' : 'below',
      indicatorId: location.block.blockId
    };
  }
  if(zone){
    return {
      tabId: zone.getAttribute('data-drop-tab') || state.activeTab,
      parentId: zone.getAttribute('data-drop-parent') || null,
      slotKey: zone.getAttribute('data-drop-slot') || 'default',
      insertIndex: null,
      indicatorType: 'zone',
      indicatorId: (zone.getAttribute('data-drop-parent') || 'root') + ':' + (zone.getAttribute('data-drop-slot') || 'default')
    };
  }
  return null;
}

function _clearDragIndicators(){
  if(!state.container) return;
  (state.container.querySelectorAll('.mb-drop-above') || []).forEach(function(el){ el.classList.remove('mb-drop-above'); });
  (state.container.querySelectorAll('.mb-drop-below') || []).forEach(function(el){ el.classList.remove('mb-drop-below'); });
  (state.container.querySelectorAll('.mb-drop-zone-active') || []).forEach(function(el){ el.classList.remove('mb-drop-zone-active'); });
  dragState.indicatorKey = '';
}

function _applyDragIndicator(target){
  var wrapper;
  var zone;
  var key;
  if(!target || !state.container) return;
  key = target.indicatorType + ':' + target.indicatorId;
  if(dragState.indicatorKey === key) return;
  _clearDragIndicators();
  dragState.indicatorKey = key;
  if(target.indicatorType === 'zone'){
    zone = state.container.querySelector('[data-drop-zone="1"][data-drop-parent="'+_esc(target.parentId || '')+'"][data-drop-slot="'+_esc(target.slotKey || 'default')+'"][data-drop-tab="'+_esc(target.tabId || '')+'"]');
    if(zone) zone.classList.add('mb-drop-zone-active');
  } else {
    wrapper = state.container.querySelector('[data-block-wrapper="'+_esc(target.indicatorId)+'"]');
    if(wrapper) wrapper.classList.add(target.indicatorType === 'above' ? 'mb-drop-above' : 'mb-drop-below');
  }
}

function _resolveDragSourceFromNode(node){
  var el = node && node.closest ? node.closest('[data-library-type],[data-drag-block],[data-field-pack]') : null;
  if(!el) return null;
  if(el.getAttribute('data-drag-disabled') === '1') return null;
  if(el.getAttribute('data-library-type')){
    return { kind:'library', blockType:el.getAttribute('data-library-type') };
  }
  if(el.getAttribute('data-field-pack')){
    return { kind:'field-pack', packKey:el.getAttribute('data-field-pack') };
  }
  return { kind:'block', blockId:el.getAttribute('data-drag-block'), tabId:el.getAttribute('data-drag-tab') };
}

function _performDropAction(source, target){
  var targetBlock;
  if(!source || !target) return;
  if(source.kind === 'library'){
    _mutateSchema(_t('Thêm block bằng kéo thả', 'Add block by drag-drop'), function(){
      _insertBlockAtTarget(source.blockType, null, target);
    });
  } else if(source.kind === 'field-pack' && source.packKey){
    targetBlock = target.indicatorType === 'zone' ? null : _findBlock(target.indicatorId);
    if(targetBlock && _isPackCompatibleBlock(targetBlock)){
      _mutateSchema(_t('Thả field pack vào block', 'Drop field pack into block'), function(){
        _mergePackIntoBlock(targetBlock, source.packKey);
        state.selectedBlock = targetBlock.blockId || targetBlock.id;
        state.propsDraft = _clone(targetBlock);
      });
      _toastBuilder(_t('Đã thêm field pack vào block đang thả.', 'Field pack added to the hovered block.'), 'success');
    } else {
      _createBlockFromPack(source.packKey, 'form-standard', target);
    }
  } else if(source.kind === 'block' && source.blockId){
    _mutateSchema(_t('Sắp xếp lại block', 'Reorder block'), function(){
      _moveTreeToTarget(source.blockId, target);
    });
  }
}

function _resetTouchDragState(){
  if(touchDragState.timer){
    clearTimeout(touchDragState.timer);
    touchDragState.timer = null;
  }
  touchDragState.source = null;
  touchDragState.target = null;
  touchDragState.active = false;
  _clearDragIndicators();
}

_handleDragStart = function(e){
  var el = e.target && e.target.closest ? e.target.closest('[data-library-type],[data-drag-block],[data-field-pack]') : null;
  var payload = _resolveDragSourceFromNode(e.target);
  if(!el) return;
  if(!payload){ e.preventDefault(); return; }
  dragState.source = payload;
  dragState.target = null;
  if(e.dataTransfer){
    e.dataTransfer.effectAllowed = payload.kind === 'library' ? 'copy' : 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    if(e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(el, 24, 24);
  }
  if(el.classList) el.classList.add('hm-block-dragging');
};

_handleDragOver = function(e){
  var target;
  if(!dragState.source) return;
  target = _resolveDropTarget(e.target, e.clientY);
  if(!target) return;
  e.preventDefault();
  dragState.target = target;
  _applyDragIndicator(target);
};

_handleDrop = function(e){
  var source = dragState.source;
  var target = dragState.target || _resolveDropTarget(e.target, e.clientY);
  if(!source || !target) return;
  e.preventDefault();
  _performDropAction(source, target);
  _clearDragIndicators();
  dragState.source = null;
  dragState.target = null;
};

_handleDragEnd = function(){
  if(!state.container) return;
  (state.container.querySelectorAll('.hm-block-dragging') || []).forEach(function(el){ el.classList.remove('hm-block-dragging'); });
  _clearDragIndicators();
  dragState.source = null;
  dragState.target = null;
};

_handleTouchStart = function(e){
  var touch = e.touches && e.touches[0];
  var source = _resolveDragSourceFromNode(e.target);
  if(!touch || !source) return;
  _resetTouchDragState();
  touchDragState.source = source;
  touchDragState.startX = touch.clientX;
  touchDragState.startY = touch.clientY;
  touchDragState.timer = setTimeout(function(){
    touchDragState.active = true;
    if(BE.toast){
      BE.toast(_t('Đang kéo thả block. Thả tay để chèn vào vị trí mới.', 'Dragging block. Release to drop at the new position.'), 'info');
    }
  }, 180);
};

_handleTouchMove = function(e){
  var touch = e.touches && e.touches[0];
  var dx;
  var dy;
  var targetNode;
  var target;
  if(!touch || !touchDragState.source) return;
  dx = Math.abs(touch.clientX - touchDragState.startX);
  dy = Math.abs(touch.clientY - touchDragState.startY);
  if(!touchDragState.active && (dx > 10 || dy > 10)){
    if(touchDragState.timer){
      clearTimeout(touchDragState.timer);
      touchDragState.timer = null;
    }
    touchDragState.source = null;
    return;
  }
  if(!touchDragState.active) return;
  e.preventDefault();
  targetNode = document.elementFromPoint ? document.elementFromPoint(touch.clientX, touch.clientY) : e.target;
  target = _resolveDropTarget(targetNode, touch.clientY);
  if(!target) return;
  touchDragState.target = target;
  _applyDragIndicator(target);
};

_handleTouchEnd = function(e){
  if(touchDragState.timer){
    clearTimeout(touchDragState.timer);
    touchDragState.timer = null;
  }
  if(touchDragState.active && touchDragState.source && touchDragState.target){
    e.preventDefault();
    _performDropAction(touchDragState.source, touchDragState.target);
  }
  _resetTouchDragState();
};

_handleTouchCancel = function(){
  _resetTouchDragState();
};

_handleContextMenu = function(e){
  var trigger = e.target && e.target.closest ? e.target.closest('[data-context-block]') : null;
  if(!trigger || !trigger.getAttribute('data-context-block')) return;
  e.preventDefault();
  state.contextMenu = {
    blockId: trigger.getAttribute('data-context-block'),
    x: e.clientX,
    y: e.clientY
  };
  _paint();
};

function _setupKeyboardShortcuts(){
  if(_keyboardReady) return;
  document.addEventListener('keydown', function(e){
    var key = String(e.key || '').toLowerCase();
    var isMeta = e.ctrlKey || e.metaKey;
    var target = e.target || {};
    var tag = target.tagName ? target.tagName.toLowerCase() : '';
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    if(!state.container || !document.body.contains(state.container) || state.step !== 'build') return;
    if(isMeta && key === 'z' && !e.shiftKey){ e.preventDefault(); _undo(); return; }
    if(isMeta && (key === 'y' || (key === 'z' && e.shiftKey))){ e.preventDefault(); _redo(); return; }
    if(isMeta && key === 's'){ e.preventDefault(); _saveModule(); return; }
    if(typing) return;
    if(isMeta && key === 'd' && state.selectedBlock){ e.preventDefault(); _duplicateBlock(state.selectedBlock); return; }
    if(isMeta && key === 'c' && state.selectedBlock){ e.preventDefault(); _copyBlock(state.selectedBlock); return; }
    if(isMeta && key === 'x' && state.selectedBlock){ e.preventDefault(); _copyBlock(state.selectedBlock); _removeBlock(state.selectedBlock); return; }
    if(isMeta && key === 'v'){ e.preventDefault(); _pasteBlock(state.selectedBlock); return; }
    if((key === 'delete' || key === 'backspace') && state.selectedBlock){
      e.preventDefault();
      if(confirm(_t('Xóa block đang chọn?', 'Delete selected block?'))) _removeBlock(state.selectedBlock);
      return;
    }
    if(key === 'escape'){
      state.selectedBlock = null;
      state.propsDraft = null;
      state.showLibrary = false;
      state.contextMenu = null;
      state.showShortcuts = false;
      _paint();
      return;
    }
    if(key === 'arrowup'){ e.preventDefault(); _navigateSelection(-1); return; }
    if(key === 'arrowdown'){ e.preventDefault(); _navigateSelection(1); return; }
    if(key === 'enter' && state.selectedBlock){ e.preventDefault(); _openBlockConfig(state.selectedBlock); return; }
    if(key === 'tab'){
      var tabs = state.schema && state.schema.tabs ? state.schema.tabs : [];
      var index = 0;
      e.preventDefault();
      tabs.forEach(function(tab, idx){ if(tab.tabId === state.activeTab) index = idx; });
      if(tabs.length){
        state.activeTab = tabs[(index + 1) % tabs.length].tabId;
        _paint();
      }
      return;
    }
    if(key === 'l'){ state.showLibrary = !state.showLibrary; _paint(); return; }
    if(key === 't'){ state.showTree = !state.showTree; _paint(); }
  });
  _keyboardReady = true;
}

_handleClick = function(e){
  var btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
  var action;
  var blockId;
  var suggestion;
  if(state.contextMenu && (!e.target.closest || !e.target.closest('[data-context-menu]'))){
    state.contextMenu = null;
    if(!btn){ _paint(); return; }
  }
  if(!btn) return;
  action = btn.getAttribute('data-action');
  blockId = btn.getAttribute('data-block');
  if(blockId && ['delete-block', 'duplicate-block', 'move-up', 'move-down'].indexOf(action) >= 0 && _isBlockLocked(blockId)){
    if(BE.toast) BE.toast(_t('Block đang khóa. Hãy mở khóa trong cây widget trước khi chỉnh sửa.', 'This block is locked. Unlock it in the widget tree before editing.'), 'warning');
    return;
  }
  if(action === 'save-props' && _isBlockLocked(state.selectedBlock)){
    if(BE.toast) BE.toast(_t('Block đang khóa. Hãy mở khóa trong cây widget trước khi chỉnh sửa.', 'This block is locked. Unlock it in the widget tree before editing.'), 'warning');
    return;
  }
  switch(action){
    case 'pick-icon':
      var icon = btn.getAttribute('data-icon');
      document.getElementById('mb-icon').value = icon;
      state.container.querySelectorAll('[data-action="pick-icon"]').forEach(function(node){ node.style.border = ''; });
      btn.style.border = '2px solid var(--brand-2)';
      break;
    case 'create-blank':
      _createBlankModule();
      break;
    case 'open-module':
      _openSavedModule(btn.getAttribute('data-id'));
      break;
    case 'delete-module':
      if(confirm(_t('Xóa module này?', 'Delete this module?'))){
        _deleteSavedModule(btn.getAttribute('data-id')).then(function(deleted){
          if(deleted) _paint();
        });
      }
      break;
    case 'switch-tab':
      state.activeTab = btn.getAttribute('data-tab');
      _paint();
      break;
    case 'add-tab':
      var tabName = prompt(_t('Tên tab mới:', 'New tab name:'));
      if(tabName){
        _mutateSchema(_t('Thêm tab', 'Add tab'), function(){
          state.schema.tabs.push({ tabId:'tab-'+Date.now().toString(36), title:{ vi:tabName, en:tabName }, icon:'', layout:{ type:'stack', columns:1, gap:'16px', align:'stretch' }, blocks:[] });
          state.activeTab = state.schema.tabs[state.schema.tabs.length - 1].tabId;
        });
      }
      break;
    case 'remove-tab':
      if(state.schema.tabs.length > 1 && confirm(_t('Xóa tab hiện tại?', 'Delete current tab?'))){
        _mutateSchema(_t('Xóa tab', 'Delete tab'), function(){
          state.schema.tabs = state.schema.tabs.filter(function(tab){ return tab.tabId !== state.activeTab; });
          state.activeTab = state.schema.tabs[0] ? state.schema.tabs[0].tabId : null;
          state.selectedBlock = null;
          state.propsDraft = null;
        });
      }
      break;
    case 'set-tab-layout':
      _mutateSchema(_t('Đổi bố cục canvas', 'Change canvas layout'), function(){
        var tab = _getActiveTab();
        if(!tab) return;
        _ensureTabLayout(tab);
        tab.layout.type = btn.getAttribute('data-layout') || 'stack';
        if(tab.layout.type === 'grid' && (!tab.layout.columns || tab.layout.columns < 2)) tab.layout.columns = 2;
      });
      break;
    case 'toggle-tree':
      state.showTree = !state.showTree;
      _paint();
      break;
    case 'toggle-shortcuts':
      state.showShortcuts = !state.showShortcuts;
      _paint();
      break;
    case 'open-library':
      state.showLibrary = true;
      _setInsertTarget(btn.getAttribute('data-tab') || state.activeTab, btn.getAttribute('data-parent') || null, btn.getAttribute('data-slot') || 'default', null);
      _paint();
      break;
    case 'library-mode':
      state.libraryMode = btn.getAttribute('data-mode') || 'blocks';
      if(state.libraryMode === 'packs') _ensureRegistriesLoaded();
      _paint();
      break;
    case 'close-library':
      state.showLibrary = false;
      _paint();
      break;
    case 'add-block-type':
      _addBlockToSchema(btn.getAttribute('data-type'));
      state.showLibrary = false;
      break;
    case 'open-pack-picker':
      _openPackPicker(btn.getAttribute('data-pack'));
      break;
    case 'close-pack-picker':
      state.packPicker = null;
      _paint();
      break;
    case 'apply-pack-target':
      _applyPackToTarget(btn.getAttribute('data-pack'), btn.getAttribute('data-target'));
      break;
    case 'apply-pack-create':
      _createBlockFromPack(btn.getAttribute('data-pack'), btn.getAttribute('data-type') || 'form-standard');
      break;
    case 'config-block':
    case 'select-block':
      _openBlockConfig(btn.getAttribute('data-block'));
      break;
    case 'props-tab':
      state.propsTab = btn.getAttribute('data-tab') || 'general';
      _paint();
      break;
    case 'close-props':
      state.selectedBlock = null;
      state.propsDraft = null;
      _paint();
      break;
    case 'save-props':
      _saveBlockProps();
      state.propsDraft = null;
      break;
    case 'delete-block':
      if(confirm(_t('Xóa block này?', 'Delete this block?'))) _removeBlock(btn.getAttribute('data-block'));
      break;
    case 'duplicate-block':
      _duplicateBlock(btn.getAttribute('data-block'));
      break;
    case 'move-up':
      _moveBlock(btn.getAttribute('data-block'), -1);
      break;
    case 'move-down':
      _moveBlock(btn.getAttribute('data-block'), 1);
      break;
    case 'toggle-block-visibility':
      _mutateSchema(_t('Bật / tắt hiển thị block', 'Toggle block visibility'), function(){
        var block = _findBlock(btn.getAttribute('data-block'));
        if(block) block.visible = block.visible === false;
      });
      break;
    case 'toggle-block-lock':
      _mutateSchema(_t('Khóa / mở khóa block', 'Toggle block lock'), function(){
        var block = _findBlock(btn.getAttribute('data-block'));
        if(block) block.locked = !block.locked;
      });
      break;
    case 'toggle-node-collapse':
      var collapseKey = btn.getAttribute('data-block') || '';
      state.treeCollapsed[collapseKey] = !state.treeCollapsed[collapseKey];
      _paint();
      break;
    case 'copy-block':
      _copyBlock(btn.getAttribute('data-block'));
      state.contextMenu = null;
      _paint();
      break;
    case 'cut-block':
      _copyBlock(btn.getAttribute('data-block'));
      _removeBlock(btn.getAttribute('data-block'));
      break;
    case 'paste-block':
      _pasteBlock(btn.getAttribute('data-block'));
      state.contextMenu = null;
      break;
    case 'collection-add':
      _collectionAdd(btn.getAttribute('data-path'));
      _paint();
      break;
    case 'collection-remove':
      _collectionRemove(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'), 10));
      _paint();
      break;
    case 'collection-duplicate':
      _collectionDuplicate(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'), 10));
      _paint();
      break;
    case 'collection-up':
      _collectionMove(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'), 10), -1);
      _paint();
      break;
    case 'collection-down':
      _collectionMove(btn.getAttribute('data-path'), parseInt(btn.getAttribute('data-index'), 10), 1);
      _paint();
      break;
    case 'apply-relation-link':
      suggestion = _findRelationSuggestionByIds(
        _getActiveTab(),
        btn.getAttribute('data-relation-id'),
        btn.getAttribute('data-source'),
        btn.getAttribute('data-target')
      );
      if(suggestion) _applyRelationSuggestion(suggestion);
      break;
    case 'toggle-digital-thread-links':
      state.showDigitalThreadLinks = !state.showDigitalThreadLinks;
      _paint();
      break;
    case 'registry-retry':
      state.registries.loading = false;
      state.registries.loaded = false;
      state.registries.error = '';
      _ensureRegistriesLoaded(true);
      _paint();
      break;
    case 'undo-builder':
      _undo();
      break;
    case 'redo-builder':
      _redo();
      break;
    case 'save-module':
      _saveModule();
      break;
    case 'preview-module':
      state.step = 'preview';
      _paint();
      break;
    case 'back-build':
      state.step = 'build';
      _paint();
      break;
    case 'back-setup':
      state.step = 'setup';
      _paint();
      break;
  }
};

_handleInput = function(e){
  var target = e.target;
  var path;
  var api;
  var workflowId;
  if(target.id === 'mb-lib-search'){
    state.librarySearch = target.value;
    _paint();
    return;
  }
  if(target.id === 'mb-layout-columns'){
    _mutateSchema(_t('Cập nhật số cột', 'Update column count'), function(){
      var tab = _getActiveTab();
      if(!tab) return;
      _ensureTabLayout(tab);
      tab.layout.columns = parseInt(target.value, 10) || 1;
      if(tab.layout.type !== 'grid') tab.layout.type = 'grid';
    });
    return;
  }
  if(target.id === 'mb-layout-gap'){
    _mutateSchema(_t('Cập nhật khoảng cách canvas', 'Update canvas gap'), function(){
      var tab = _getActiveTab();
      if(!tab) return;
      _ensureTabLayout(tab);
      tab.layout.gap = target.value || '16px';
    });
    return;
  }
  if(target.hasAttribute('data-field-search-path')){
    state.fieldSearch[target.getAttribute('data-field-search-path')] = target.value || '';
    _paint();
    return;
  }
  if(target.hasAttribute('data-field-path')){
    path = target.getAttribute('data-field-path');
    _updateDraftValue(target);
    if(path === 'config.dataSource.api'){
      api = target.value || '';
      if(api){
        _paint();
        _ensureDataFieldsForApi(api).then(function(){
          var result = _autoPopulateDraftFromApi(state.propsDraft, api);
          if(result){
            _syncDraftToSelectedBlock(_t('Tự động thêm schema từ registry', 'Auto-populate from registry'));
            _toastBuilder(_t('Đã tự động thêm ', 'Auto-added ') + result.count + ' ' + result.noun + _t(' từ registry.', ' from registry.'), 'success');
          } else if(state.selectedBlock){
            _paint();
          }
        });
        return;
      }
    }
    if(path === 'config.workflow.workflowId'){
      workflowId = target.value || '';
      if(workflowId && _applyWorkflowRegistryToDraft(state.propsDraft, workflowId)){
        _syncDraftToSelectedBlock(_t('Đồng bộ workflow từ registry', 'Sync workflow from registry'));
        _toastBuilder(_t('Đã tự động tạo transitions, guards và SLA từ workflow đã chọn.', 'Transitions, guards, and SLA were generated from the selected workflow.'), 'success');
        return;
      }
    }
    if(path === 'config.validation.autoApply' && state.propsDraft && state.propsDraft.type === 'form-standard'){
      _syncDraftToSelectedBlock(_t('Cập nhật validation tự động', 'Update automatic validation'));
      return;
    }
    if(target.getAttribute('data-trigger-repaint') === '1') _paint();
  }
};

/* ── Export ───────────────────────────────────────────────────────────────── */
_handleInput = function(e){
  var target = e.target;
  var path;
  var api;
  var requestToken;
  var selectedBlockId;
  var workflowId;
  if(target.id === 'mb-lib-search'){
    state.librarySearch = target.value;
    _paint();
    return;
  }
  if(target.id === 'mb-layout-columns'){
    _mutateSchema(_t('Cap nhat so cot', 'Update column count'), function(){
      var tab = _getActiveTab();
      if(!tab) return;
      _ensureTabLayout(tab);
      tab.layout.columns = parseInt(target.value, 10) || 1;
      if(tab.layout.type !== 'grid') tab.layout.type = 'grid';
    });
    return;
  }
  if(target.id === 'mb-layout-gap'){
    _mutateSchema(_t('Cap nhat khoang cach canvas', 'Update canvas gap'), function(){
      var tab = _getActiveTab();
      if(!tab) return;
      _ensureTabLayout(tab);
      tab.layout.gap = target.value || '16px';
    });
    return;
  }
  if(target.hasAttribute('data-field-search-path')){
    state.fieldSearch[target.getAttribute('data-field-search-path')] = target.value || '';
    _paint();
    return;
  }
  if(target.hasAttribute('data-field-group-filter-path')){
    path = target.getAttribute('data-field-group-filter-path');
    if(!state.fieldFilter[path]) state.fieldFilter[path] = { group: '', type: '' };
    state.fieldFilter[path].group = target.value || '';
    _paint();
    return;
  }
  if(target.hasAttribute('data-field-type-filter-path')){
    path = target.getAttribute('data-field-type-filter-path');
    if(!state.fieldFilter[path]) state.fieldFilter[path] = { group: '', type: '' };
    state.fieldFilter[path].type = target.value || '';
    _paint();
    return;
  }
  if(target.hasAttribute('data-api-search-path')){
    state.apiSearch[target.getAttribute('data-api-search-path')] = target.value || '';
    _paint();
    return;
  }
  if(target.hasAttribute('data-field-path')){
    path = target.getAttribute('data-field-path');
    _updateDraftValue(target);
    if(path === 'config.dataSource.api'){
      api = target.value || '';
      state.apiSearch[path] = api;
      state.fieldSearch = {};
      state.fieldFilter = {};
      selectedBlockId = state.selectedBlock;
      requestToken = _trackPendingApiSelection(path);
      if(api){
        _paint();
        _ensureDataFieldsForApi(api).then(function(){
          var result;
          if(!_isPendingApiSelectionCurrent(path, requestToken)) return;
          if(!state.propsDraft || state.selectedBlock !== selectedBlockId) return;
          if(_getByPath(state.propsDraft, path) !== api) return;
          result = _autoPopulateDraftFromApi(state.propsDraft, api);
          if(result){
            _syncDraftToSelectedBlock(_t('Tu dong them schema tu registry', 'Auto-populate from registry'));
            _toastBuilder(_t('Da tu dong them ', 'Auto-added ') + result.count + ' ' + result.noun + _t(' tu registry.', ' from registry.'), 'success');
          } else if(state.selectedBlock === selectedBlockId){
            _paint();
          }
        }).catch(function(){
          if(state.selectedBlock === selectedBlockId && _isPendingApiSelectionCurrent(path, requestToken)) _paint();
        });
        return;
      }
      if(target.getAttribute('data-trigger-repaint') === '1') _paint();
      return;
    }
    if(path === 'config.workflow.workflowId'){
      workflowId = target.value || '';
      if(workflowId && _applyWorkflowRegistryToDraft(state.propsDraft, workflowId)){
        _syncDraftToSelectedBlock(_t('Dong bo workflow tu registry', 'Sync workflow from registry'));
        _toastBuilder(_t('Da tu dong tao transitions, guards va SLA tu workflow da chon.', 'Transitions, guards, and SLA were generated from the selected workflow.'), 'success');
        return;
      }
    }
    if(path === 'config.validation.autoApply' && state.propsDraft && state.propsDraft.type === 'form-standard'){
      _syncDraftToSelectedBlock(_t('Cap nhat validation tu dong', 'Update automatic validation'));
      return;
    }
    if(target.getAttribute('data-trigger-repaint') === '1') _paint();
  }
};

window._renderModuleBuilder = render;

})();

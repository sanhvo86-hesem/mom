(function(window){
'use strict';

var MODULE_ID = 'schema-studio';
var PAGE_ID = 'page-schema-studio';
var LS_PREFIX = 'hesem:schema-studio:';
var UI_PREFS_KEY = LS_PREFIX + 'ui';
var SVG_NS = 'http://www.w3.org/2000/svg';
var MIN_ZOOM = 0.1;
var MAX_ZOOM = 4;
var ZOOM_STEP = 0.1;
var TABLE_DEFAULT_WIDTH = 260;
var TABLE_HEADER_HEIGHT = 40;
var TABLE_FOOTER_HEIGHT = 28;
var COLUMN_HEIGHT = 31;

var PG_TYPES = [
  { name:'varchar', group:'text', params:['length'], hint:'varchar(255)' },
  { name:'char', group:'text', params:['length'], hint:'char(10)' },
  { name:'text', group:'text', params:[], hint:'Unlimited text' },
  { name:'citext', group:'text', params:[], hint:'Case insensitive' },
  { name:'smallint', group:'number', params:[] },
  { name:'integer', group:'number', params:[] },
  { name:'bigint', group:'number', params:[] },
  { name:'numeric', group:'number', params:['precision','scale'], hint:'numeric(10,2)' },
  { name:'real', group:'number', params:[] },
  { name:'double precision', group:'number', params:[] },
  { name:'serial', group:'number', params:[] },
  { name:'bigserial', group:'number', params:[] },
  { name:'uuid', group:'id', params:[] },
  { name:'boolean', group:'bool', params:[] },
  { name:'date', group:'datetime', params:[] },
  { name:'time', group:'datetime', params:[] },
  { name:'timestamp', group:'datetime', params:[] },
  { name:'timestamptz', group:'datetime', params:[] },
  { name:'interval', group:'datetime', params:[] },
  { name:'json', group:'json', params:[] },
  { name:'jsonb', group:'json', params:[] },
  { name:'text[]', group:'array', params:[] },
  { name:'integer[]', group:'array', params:[] },
  { name:'uuid[]', group:'array', params:[] },
  { name:'bytea', group:'special', params:[] },
  { name:'inet', group:'special', params:[] },
  { name:'money', group:'special', params:[] },
  { name:'vector', group:'special', params:['dimensions'] },
  { name:'__custom__', group:'custom', params:[] }
];

var ON_ACTIONS = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];
var NOTATION_MODES = ['crowsfoot', 'uml', 'arrow'];

var DOMAIN_COLORS = {
  finance: 'var(--brand-2)',
  supplier_relationship: 'var(--purple)',
  quality_management: 'var(--red)',
  production: 'var(--amber)',
  document_control: 'var(--green)',
  hcm_workforce: 'var(--cyan)',
  inventory: 'var(--amber)',
  compliance: 'var(--green)',
  customer_portal: 'var(--purple)',
  plant_maintenance: 'var(--purple)',
  engineering: 'var(--blue)',
  logistics: 'var(--green)',
  audit_risk: 'var(--amber)',
  training_hr: 'var(--cyan)',
  sales: 'var(--purple)',
  purchasing: 'var(--purple)',
  mes_execution: 'var(--blue)',
  scheduling: 'var(--cyan)',
  fmea_apqp: 'var(--red)',
  spc: 'var(--blue)',
  core_system: 'var(--cyan)',
  master_data_governance: 'var(--green)',
  default: 'var(--brand-2)'
};

var STORE = {
  designs: [],
  currentDesignId: null,
  schema: null,
  baseline: null,
  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0,
    selection: [],
    dragState: null,
    connecting: null,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
    snapToGrid: false,
    gridSize: 20,
    lasso: null
  },
  inspector: {
    target: null,
    tab: 'props'
  },
  browser: {
    open: true,
    filter: '',
    expandedDomains: {},
    hiddenDomains: {},
    isolatedDomain: '',
    view: 'domains',
    activeDomain: ''
  },
  codePanel: {
    open: false,
    format: 'sql',
    content: ''
  },
  validation: {
    results: [],
    ran: false,
    running: false,
    panelEl: null
  },
  migration: {
    diff: null,
    previewOpen: false,
    applying: false,
    overlayEl: null
  },
  undo: [],
  redo: [],
  mode: 'canvas',
  cmdPaletteOpen: false,
  dirty: false,
  loading: false,
  loadingMsg: '',
  error: '',
  notation: 'crowsfoot',
  clipboard: null
};

var refs = {
  page: null,
  root: null,
  toolbar: null,
  browser: null,
  canvasWrap: null,
  inspector: null,
  codePanel: null
};

var keyboardBound = false;
var resizeBound = false;

function _t(vi, en){
  var currentLang = window._lang || window.lang || 'vi';
  return currentLang === 'en' ? en : vi;
}

function _api(action, payload, method){
  var reqMethod = String(method || 'POST').toUpperCase();
  var body = payload || {};
  var useMvcEndpoint = String(action || '').indexOf('schema_studio_') === 0;
  var endpoint = useMvcEndpoint ? 'api/index.php?' : 'api.php?';
  if(typeof window.apiCall === 'function' && !useMvcEndpoint){
    return window.apiCall(action, body, reqMethod, 30000);
  }
  var qs = new URLSearchParams();
  qs.set('action', action);
  if(reqMethod === 'GET'){
    Object.keys(body).forEach(function(key){
      if(body[key] == null) return;
      qs.set(key, String(body[key]));
    });
  }
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrf = window.csrfToken || (csrfMeta && csrfMeta.content) || '';
  var headers = { 'Content-Type': 'application/json' };
  if(csrf) headers['X-CSRF-Token'] = csrf;
  return fetch(endpoint + qs.toString(), {
    method: reqMethod,
    credentials: 'include',
    headers: headers,
    body: reqMethod === 'GET' ? undefined : JSON.stringify(body)
  }).then(function(res){
    return res.json().catch(function(){
      return { ok:false, error:'invalid_json_response' };
    });
  }).then(function(data){
    if(data && data.ok === false){
      throw new Error(data.detail || data.error || 'request_failed');
    }
    return data;
  });
}

function _uid(){
  return 'ss_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function _slug(str){
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function _clone(obj){
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

function _esc(str){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str == null ? '' : String(str)));
  return div.innerHTML;
}

function currentUsername(){
  return (window.currentUser && (window.currentUser.username || window.currentUser.user_id)) || 'system';
}

function createBlankSchemaDoc(name){
  return {
    _meta: {
      id: _uid(),
      name: name || _t('Schema moi', 'New schema'),
      version: '1.0.0',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: currentUsername()
    },
    enums: [],
    tables: [],
    relations: [],
    groups: [],
    notes: []
  };
}

function ensureSchema(){
  if(!STORE.schema){
    STORE.schema = createBlankSchemaDoc(_t('Workspace schema', 'Workspace schema'));
  }
  return STORE.schema;
}

function markDirty(){
  STORE.dirty = true;
  if(STORE.schema && STORE.schema._meta){
    STORE.schema._meta.updatedAt = new Date().toISOString();
  }
  renderToolbar(refs.toolbar);
}

function toast(msg, type){
  var el = document.createElement('div');
  el.className = 'ss-toast ' + (type || 'info');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function(){
    if(el && el.parentNode) el.parentNode.removeChild(el);
  }, 3000);
}

function removeNode(node){
  if(node && node.parentNode){
    node.parentNode.removeChild(node);
  }
}

function confirm2(msg, dangerous){
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    var step = dangerous ? 1 : 2;
    overlay.className = 'ss-confirm-overlay';
    function close(result){
      removeNode(overlay);
      resolve(!!result);
    }
    function render(){
      overlay.innerHTML = [
        '<div class="ss-confirm-modal">',
          '<div class="ss-confirm-header"><strong>',
            dangerous ? _esc(_t('Xac nhan thao tac nguy hiem', 'Confirm destructive action')) : _esc(_t('Xac nhan', 'Confirm')),
          '</strong></div>',
          '<div class="ss-confirm-body">',
            '<div>', _esc(msg), '</div>',
            dangerous && step === 1 ? '<div class="ss-field-hint">' + _esc(_t('Thao tac nay co the gay mat du lieu. Ban se can xac nhan them 1 lan nua.', 'This action can cause data loss. You will need to confirm one more time.')) + '</div>' : '',
            dangerous && step === 2 ? '<div class="ss-import-error" style="display:block">' + _esc(_t('Day la xac nhan lan 2. Chi tiep tuc neu ban chac chan.', 'This is the second confirmation. Continue only if you are sure.')) + '</div>' : '',
          '</div>',
          '<div class="ss-confirm-actions">',
            '<button type="button" class="hm-btn hm-btn-ghost" data-ss-confirm="cancel">', _esc(_t('Huy', 'Cancel')), '</button>',
            '<button type="button" class="hm-btn ', dangerous ? 'hm-btn-danger' : 'hm-btn-primary', '" data-ss-confirm="ok">', _esc(step === 1 ? _t('Tiep tuc', 'Continue') : _t('Xac nhan', 'Confirm')), '</button>',
          '</div>',
        '</div>'
      ].join('');
      overlay.querySelector('[data-ss-confirm="cancel"]').onclick = function(){ close(false); };
      overlay.querySelector('[data-ss-confirm="ok"]').onclick = function(){
        if(dangerous && step === 1){
          step = 2;
          render();
          return;
        }
        close(true);
      };
    }
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) close(false);
    });
    render();
    document.body.appendChild(overlay);
  });
}

function pushUndo(){
  if(!STORE.schema) return;
  var snapshot = JSON.stringify(STORE.schema);
  if(STORE.undo.length && STORE.undo[STORE.undo.length - 1] === snapshot) return;
  STORE.undo.push(snapshot);
  if(STORE.undo.length > 80) STORE.undo.shift();
  STORE.redo = [];
}

function applySnapshot(snapshot){
  if(!snapshot) return;
  STORE.schema = JSON.parse(snapshot);
  Browser.render();
  Canvas.render();
  Inspector.render();
  if(STORE.codePanel.open) CodePanel.render();
  renderToolbar(refs.toolbar);
}

function undo(){
  if(!STORE.undo.length || !STORE.schema) return;
  STORE.redo.push(JSON.stringify(STORE.schema));
  applySnapshot(STORE.undo.pop());
  markDirty();
  saveDraft();
}

function redo(){
  if(!STORE.redo.length || !STORE.schema) return;
  STORE.undo.push(JSON.stringify(STORE.schema));
  applySnapshot(STORE.redo.pop());
  markDirty();
  saveDraft();
}

function findTable(id){
  var tables = (STORE.schema && STORE.schema.tables) || [];
  var i;
  for(i = 0; i < tables.length; i++){
    if(tables[i].id === id) return tables[i];
  }
  return null;
}

function findTableByName(name){
  var target = String(name || '').toLowerCase();
  var tables = (STORE.schema && STORE.schema.tables) || [];
  var i;
  for(i = 0; i < tables.length; i++){
    if(String(tables[i].name || '').toLowerCase() === target) return tables[i];
  }
  return null;
}

function findCol(tableId, colId){
  var tbl = findTable(tableId);
  var i;
  if(!tbl || !tbl.columns) return null;
  for(i = 0; i < tbl.columns.length; i++){
    if(tbl.columns[i].id === colId) return tbl.columns[i];
  }
  return null;
}

function findRelation(id){
  var relations = (STORE.schema && STORE.schema.relations) || [];
  var i;
  for(i = 0; i < relations.length; i++){
    if(relations[i].id === id) return relations[i];
  }
  return null;
}

function saveDraft(){
  if(!STORE.schema) return;
  var id = STORE.currentDesignId || (STORE.schema._meta && STORE.schema._meta.id) || 'workspace';
  try{
    localStorage.setItem(LS_PREFIX + id, JSON.stringify(STORE.schema));
  }catch(err){}
}

function loadDraft(id){
  try{
    return localStorage.getItem(LS_PREFIX + id);
  }catch(err){
    return null;
  }
}

function clearDraft(id){
  try{
    localStorage.removeItem(LS_PREFIX + id);
  }catch(err){}
}

function saveUiPrefs(){
  try{
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({
      browser: {
        open: STORE.browser.open,
        expandedDomains: STORE.browser.expandedDomains,
        hiddenDomains: STORE.browser.hiddenDomains,
        isolatedDomain: STORE.browser.isolatedDomain,
        view: STORE.browser.view,
        activeDomain: STORE.browser.activeDomain
      }
    }));
  }catch(err){}
}

function loadUiPrefs(){
  try{
    var raw = localStorage.getItem(UI_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(err){
    return null;
  }
}

function applyUiPrefs(prefs){
  if(!prefs || typeof prefs !== 'object') return;
  if(prefs.browser && typeof prefs.browser === 'object'){
    if(typeof prefs.browser.open === 'boolean'){
      STORE.browser.open = prefs.browser.open;
    }
    if(prefs.browser.expandedDomains && typeof prefs.browser.expandedDomains === 'object'){
      STORE.browser.expandedDomains = _clone(prefs.browser.expandedDomains);
    }
    if(prefs.browser.hiddenDomains && typeof prefs.browser.hiddenDomains === 'object'){
      STORE.browser.hiddenDomains = _clone(prefs.browser.hiddenDomains);
    }
    if(typeof prefs.browser.isolatedDomain === 'string'){
      STORE.browser.isolatedDomain = prefs.browser.isolatedDomain;
    }
    if(prefs.browser.view === 'tables' || prefs.browser.view === 'domains'){
      STORE.browser.view = prefs.browser.view;
    }
    if(typeof prefs.browser.activeDomain === 'string'){
      STORE.browser.activeDomain = prefs.browser.activeDomain;
    }
  }
}

function screenToCanvas(screenX, screenY){
  if(!refs.canvasWrap) return { x: 0, y: 0 };
  var rect = refs.canvasWrap.getBoundingClientRect();
  var localX = screenX - rect.left;
  var localY = screenY - rect.top;
  return {
    x: (localX - STORE.canvas.panX) / STORE.canvas.zoom,
    y: (localY - STORE.canvas.panY) / STORE.canvas.zoom
  };
}

function canvasToScreen(canvasX, canvasY){
  return {
    x: canvasX * STORE.canvas.zoom + STORE.canvas.panX,
    y: canvasY * STORE.canvas.zoom + STORE.canvas.panY
  };
}

function getTableHeight(tbl){
  if(!tbl) return 0;
  if(tbl.canvas && tbl.canvas.collapsed) return TABLE_HEADER_HEIGHT;
  var columnCount = (tbl.columns || []).length;
  return TABLE_HEADER_HEIGHT + (columnCount * COLUMN_HEIGHT) + TABLE_FOOTER_HEIGHT + 32;
}

function generateUniqueTableName(base){
  var name = _slug(base || 'new_table') || 'new_table';
  var index = 1;
  var existing = {};
  ((STORE.schema && STORE.schema.tables) || []).forEach(function(tbl){ existing[tbl.name] = true; });
  while(existing[name]){
    index += 1;
    name = _slug(base || 'new_table') + '_' + index;
  }
  return name;
}

function generateUniqueColumnName(tbl, base){
  var name = _slug(base || 'new_column') || 'new_column';
  var index = 1;
  var existing = {};
  (tbl.columns || []).forEach(function(col){ existing[col.name] = true; });
  while(existing[name]){
    index += 1;
    name = _slug(base || 'new_column') + '_' + index;
  }
  return name;
}

function parseTypeDefinition(raw){
  var text = String(raw || '').trim();
  var isArray = /\[\]$/.test(text);
  var match = text.replace(/\[\]$/, '').match(/^([a-zA-Z_][a-zA-Z0-9_ ]*)(?:\((\d+)(?:\s*,\s*(\d+))?\))?$/);
  if(!match){
    return { type: text || 'text', length: null, scale: null, is_array: isArray };
  }
  return {
    type: String(match[1] || '').toLowerCase(),
    length: match[2] ? parseInt(match[2], 10) : null,
    scale: match[3] ? parseInt(match[3], 10) : null,
    is_array: isArray
  };
}

function fmtColType(col){
  if(!col) return '';
  var t = col.type || 'text';
  if(col.length){
    t += '(' + col.length + (col.scale != null ? ',' + col.scale : '') + ')';
  } else if(col.scale != null && /numeric|decimal/i.test(t)){
    t += '(10,' + col.scale + ')';
  }
  if(col.is_array && !/\[\]$/.test(t)) t += '[]';
  return t;
}

function colBadges(col, tbl){
  var badges = [];
  if(col.primary_key) badges.push({ cls:'pk', text:'PK' });
  if(col.foreign_key) badges.push({ cls:'fk', text:'FK' });
  if(!col.nullable) badges.push({ cls:'nn', text:'NN' });
  if(col.unique) badges.push({ cls:'uq', text:'UQ' });
  if(col.generated_expr) badges.push({ cls:'gn', text:'GN' });
  if(tbl && (tbl.indexes || []).some(function(idx){
    return (idx.columns || []).some(function(item){ return item.name === col.name; });
  })) badges.push({ cls:'idx', text:'IDX' });
  return badges;
}

function needsLength(type){
  return ['varchar', 'char', 'vector'].indexOf(String(type || '').toLowerCase()) >= 0;
}

function needsScale(type){
  var normalized = String(type || '').toLowerCase();
  return normalized === 'numeric' || normalized === 'decimal';
}

function isReservedWord(name){
  return Validator.PG_RESERVED[String(name || '').toLowerCase()] === true;
}

function isValidIdentifier(name){
  return /^[a-z][a-z0-9_]*$/.test(String(name || '').trim());
}

function getSchemaQualifiedName(tbl){
  if(!tbl) return '';
  return (tbl.schema && tbl.schema !== 'public' ? tbl.schema + '.' : '') + tbl.name;
}

function createDefaultTable(x, y){
  return {
    id: _uid(),
    name: generateUniqueTableName('new_table'),
    schema: 'public',
    comment: '',
    domain: 'default',
    color: null,
    tags: [],
    rls_enabled: false,
    canvas: { x: x || 120, y: y || 120, width: TABLE_DEFAULT_WIDTH, collapsed: false },
    columns: [
      { id:_uid(), name:'id', type:'uuid', length:null, scale:null, is_array:false, nullable:false, unique:false, primary_key:true, pk_order:1, default_val:'uuid_generate_v4()', check_expr:null, generated_expr:null, generated_stored:false, comment:'Primary key', foreign_key:null },
      { id:_uid(), name:'created_at', type:'timestamptz', length:null, scale:null, is_array:false, nullable:false, unique:false, primary_key:false, pk_order:null, default_val:'now()', check_expr:null, generated_expr:null, generated_stored:false, comment:'', foreign_key:null },
      { id:_uid(), name:'updated_at', type:'timestamptz', length:null, scale:null, is_array:false, nullable:false, unique:false, primary_key:false, pk_order:null, default_val:'now()', check_expr:null, generated_expr:null, generated_stored:false, comment:'', foreign_key:null }
    ],
    indexes: [],
    check_constraints: [],
    triggers: []
  };
}

function findTableInSchema(schema, id){
  var tables = (schema && schema.tables) || [];
  var i;
  for(i = 0; i < tables.length; i++){
    if(tables[i].id === id) return tables[i];
  }
  return null;
}

function findColInSchema(schema, tableId, colId){
  var tbl = findTableInSchema(schema, tableId);
  var i;
  if(!tbl) return null;
  for(i = 0; i < (tbl.columns || []).length; i++){
    if(tbl.columns[i].id === colId) return tbl.columns[i];
  }
  return null;
}

var Canvas = {
  init: function(container){
    refs.canvasWrap = container;
    container.innerHTML = [
      '<div class="ss-canvas-bg ss-canvas-grid"></div>',
      '<svg class="ss-canvas-svg" id="ss-canvas-svg">',
        '<g class="ss-canvas-group" id="ss-canvas-group">',
          '<g class="ss-edges-layer" id="ss-edges-layer"></g>',
          '<path class="ss-temp-edge" id="ss-temp-edge" style="display:none"></path>',
        '</g>',
      '</svg>',
      '<div class="ss-tables-layer" id="ss-tables-layer"></div>',
      '<div class="ss-minimap" id="ss-minimap">',
        '<canvas class="ss-minimap-canvas" id="ss-minimap-canvas" width="160" height="100"></canvas>',
        '<div class="ss-minimap-viewport" id="ss-minimap-viewport"></div>',
      '</div>',
      '<div class="ss-zoom-controls">',
        '<button type="button" id="ss-zoom-in" title="Zoom in">+</button>',
        '<button type="button" id="ss-zoom-reset" class="ss-zoom-val" title="Reset zoom">100%</button>',
        '<button type="button" id="ss-zoom-out" title="Zoom out">-</button>',
      '</div>',
      '<div class="ss-canvas-mode-indicator" id="ss-canvas-mode-indicator"></div>'
    ].join('');
    refs.canvasSvg = document.getElementById('ss-canvas-svg');
    refs.canvasGroup = document.getElementById('ss-canvas-group');
    refs.edgesLayer = document.getElementById('ss-edges-layer');
    refs.tempEdge = document.getElementById('ss-temp-edge');
    refs.tablesLayer = document.getElementById('ss-tables-layer');
    refs.minimapCanvas = document.getElementById('ss-minimap-canvas');
    refs.minimapViewport = document.getElementById('ss-minimap-viewport');
    refs.modeIndicator = document.getElementById('ss-canvas-mode-indicator');
    EdgeLayer.init(refs.edgesLayer);

    container.onwheel = Canvas.onWheel;
    container.ondblclick = Canvas.onDblClick;
    container.onmousedown = function(ev){
      if(ev.target.closest('.ss-table-card')) return;
      if(ev.target.closest('.ss-validation-panel')) return;
      if(ev.target.closest('.ss-cmd-palette')) return;
      if(ev.shiftKey || ev.ctrlKey || ev.metaKey){
        Canvas.startLasso(ev);
        return;
      }
      Canvas.startPan(ev);
    };
    container.onclick = function(ev){
      if(Canvas._justLassoed){
        Canvas._justLassoed = false;
        return;
      }
      if(ev.target === container || ev.target === refs.canvasSvg || ev.target === refs.tablesLayer || ev.target.classList.contains('ss-canvas-bg')){
        Canvas.clearSelection();
        Inspector.close();
      }
    };
    document.getElementById('ss-zoom-in').onclick = Canvas.zoomIn;
    document.getElementById('ss-zoom-out').onclick = Canvas.zoomOut;
    document.getElementById('ss-zoom-reset').onclick = Canvas.zoomReset;
    document.getElementById('ss-minimap').onclick = function(ev){
      if(!Canvas._miniBounds) return;
      var rect = refs.minimapCanvas.getBoundingClientRect();
      var localX = ev.clientX - rect.left;
      var localY = ev.clientY - rect.top;
      var bounds = Canvas._miniBounds;
      var canvasX = bounds.minX + ((localX - bounds.pad) / bounds.scale);
      var canvasY = bounds.minY + ((localY - bounds.padY) / bounds.scale);
      STORE.canvas.panX = (refs.canvasWrap.clientWidth / 2) - (canvasX * STORE.canvas.zoom);
      STORE.canvas.panY = (refs.canvasWrap.clientHeight / 2) - (canvasY * STORE.canvas.zoom);
      Canvas.applyTransform();
    };
    if(!resizeBound){
      resizeBound = true;
      window.addEventListener('resize', function(){
        if(isActivePage()) Canvas.applyTransform();
      });
    }
    Canvas.applyTransform();
  },

  applyTransform: function(){
    if(!refs.canvasGroup || !refs.tablesLayer) return;
    refs.canvasGroup.setAttribute('transform', 'translate(' + STORE.canvas.panX + ' ' + STORE.canvas.panY + ') scale(' + STORE.canvas.zoom + ')');
    refs.tablesLayer.style.transform = 'translate(' + STORE.canvas.panX + 'px,' + STORE.canvas.panY + 'px) scale(' + STORE.canvas.zoom + ')';
    var zoomVal = Math.round(STORE.canvas.zoom * 100) + '%';
    var zoomReset = document.getElementById('ss-zoom-reset');
    if(zoomReset) zoomReset.textContent = zoomVal;
    var toolbarZoom = document.getElementById('ss-toolbar-zoom');
    if(toolbarZoom) toolbarZoom.textContent = zoomVal;
    if(refs.modeIndicator) refs.modeIndicator.textContent = _t('Chế độ', 'Mode') + ': ' + modeLabel(STORE.mode || 'canvas');
    Canvas.updateGrid();
    VirtualRenderer.scheduleUpdate();
  },

  zoomIn: function(){
    STORE.canvas.zoom = Math.min(MAX_ZOOM, STORE.canvas.zoom + ZOOM_STEP);
    Canvas.applyTransform();
  },

  zoomOut: function(){
    STORE.canvas.zoom = Math.max(MIN_ZOOM, STORE.canvas.zoom - ZOOM_STEP);
    Canvas.applyTransform();
  },

  zoomReset: function(){
    STORE.canvas.zoom = 1;
    STORE.canvas.panX = 0;
    STORE.canvas.panY = 0;
    Canvas.applyTransform();
  },

  toggleSnap: function(){
    STORE.canvas.snapToGrid = !STORE.canvas.snapToGrid;
    toast(_t('Snap to grid: ' + (STORE.canvas.snapToGrid ? 'BAT' : 'TAT'), 'Snap to grid: ' + (STORE.canvas.snapToGrid ? 'ON' : 'OFF')), 'info');
  },

  zoomToFit: function(){
    var tables = typeof Browser !== 'undefined' && Browser.getCanvasTables ? Browser.getCanvasTables() : ((STORE.schema && STORE.schema.tables) || []);
    if(!tables.length || !refs.canvasWrap) return;
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    tables.forEach(function(tbl){
      minX = Math.min(minX, tbl.canvas.x);
      minY = Math.min(minY, tbl.canvas.y);
      maxX = Math.max(maxX, tbl.canvas.x + (tbl.canvas.width || TABLE_DEFAULT_WIDTH));
      maxY = Math.max(maxY, tbl.canvas.y + getTableHeight(tbl));
    });
    var width = Math.max(maxX - minX, 400);
    var height = Math.max(maxY - minY, 300);
    var padding = 80;
    var viewportW = refs.canvasWrap.clientWidth - padding;
    var viewportH = refs.canvasWrap.clientHeight - padding;
    var zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(viewportW / width, viewportH / height)));
    STORE.canvas.zoom = zoom;
    STORE.canvas.panX = ((refs.canvasWrap.clientWidth - (width * zoom)) / 2) - (minX * zoom);
    STORE.canvas.panY = ((refs.canvasWrap.clientHeight - (height * zoom)) / 2) - (minY * zoom);
    Canvas.applyTransform();
  },

  startPan: function(ev){
    if(ev.button !== 0) return;
    STORE.canvas.isPanning = true;
    STORE.canvas.lastMouseX = ev.clientX;
    STORE.canvas.lastMouseY = ev.clientY;
    refs.canvasWrap.classList.add('is-panning');
    document.addEventListener('mousemove', Canvas.doPan);
    document.addEventListener('mouseup', Canvas.endPan);
  },

  doPan: function(ev){
    if(!STORE.canvas.isPanning) return;
    STORE.canvas.panX += ev.clientX - STORE.canvas.lastMouseX;
    STORE.canvas.panY += ev.clientY - STORE.canvas.lastMouseY;
    STORE.canvas.lastMouseX = ev.clientX;
    STORE.canvas.lastMouseY = ev.clientY;
    Canvas.applyTransform();
  },

  endPan: function(){
    STORE.canvas.isPanning = false;
    if(refs.canvasWrap) refs.canvasWrap.classList.remove('is-panning');
    document.removeEventListener('mousemove', Canvas.doPan);
    document.removeEventListener('mouseup', Canvas.endPan);
  },

  onWheel: function(ev){
    if(!refs.canvasWrap) return;
    ev.preventDefault();
    var delta = ev.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    var oldZoom = STORE.canvas.zoom;
    var newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
    var rect = refs.canvasWrap.getBoundingClientRect();
    var mouseX = ev.clientX - rect.left;
    var mouseY = ev.clientY - rect.top;
    STORE.canvas.panX = mouseX - (mouseX - STORE.canvas.panX) * (newZoom / oldZoom);
    STORE.canvas.panY = mouseY - (mouseY - STORE.canvas.panY) * (newZoom / oldZoom);
    STORE.canvas.zoom = newZoom;
    Canvas.applyTransform();
  },

  clearSelection: function(){
    STORE.canvas.selection = [];
    STORE.canvas.lasso = null;
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.selected'), function(node){ node.classList.remove('selected'); });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.multi-selected'), function(node){ node.classList.remove('multi-selected'); });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group.selected'), function(node){ node.classList.remove('selected'); });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-col-item.active'), function(node){ node.classList.remove('active'); });
    removeNode(document.getElementById('ss-lasso'));
    Canvas.updateSelectionBadge();
    Browser.render();
  },

  selectTable: function(tableId, add){
    var existingIndex;
    STORE.canvas.selection = (STORE.canvas.selection || []).filter(function(item){ return item.kind === 'table'; });
    if(!add){
      STORE.canvas.selection = [{ kind:'table', id:tableId }];
    } else {
      existingIndex = STORE.canvas.selection.findIndex(function(item){ return item.kind === 'table' && item.id === tableId; });
      if(existingIndex >= 0){
        STORE.canvas.selection.splice(existingIndex, 1);
      } else {
        STORE.canvas.selection.push({ kind:'table', id:tableId });
      }
    }
    Canvas.syncSelectionClasses();
    Browser.render();
  },

  selectEdge: function(edgeId){
    STORE.canvas.selection = [{ kind:'edge', id:edgeId }];
    Canvas.syncSelectionClasses();
    Browser.render();
  },

  syncSelectionClasses: function(){
    var selectedTableIds = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; });
    var multi = selectedTableIds.length > 1;
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card'), function(node){
      var active = selectedTableIds.indexOf(node.getAttribute('data-table-id')) >= 0;
      node.classList.toggle('selected', active);
      node.classList.toggle('multi-selected', multi && active);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var active = STORE.canvas.selection.some(function(item){ return item.kind === 'edge' && item.id === node.getAttribute('data-edge-id'); });
      node.classList.toggle('selected', active);
    });
    Canvas.updateSelectionBadge();
  },

  updateSelectionBadge: function(){
    var count = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).length;
    var badge = document.getElementById('ss-selection-badge');
    if(!badge){
      badge = document.createElement('div');
      badge.id = 'ss-selection-badge';
      badge.className = 'ss-selection-badge';
      document.body.appendChild(badge);
    }
    if(count > 1){
      badge.textContent = count + ' ' + _t('bang duoc chon', 'tables selected');
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  },

  startLasso: function(ev){
    var pos;
    if(ev.button !== 0) return;
    if(ev.target.closest('.ss-table-card')) return;
    ev.preventDefault();
    pos = screenToCanvas(ev.clientX, ev.clientY);
    STORE.canvas.lasso = {
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      additive: !!(ev.shiftKey || ev.ctrlKey || ev.metaKey),
      baseSelection: (STORE.canvas.selection || []).filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; })
    };
    if(!STORE.canvas.lasso.additive){
      Canvas.clearSelection();
      STORE.canvas.lasso.baseSelection = [];
    }
    Canvas.renderLasso();
    document.addEventListener('mousemove', Canvas.updateLasso);
    document.addEventListener('mouseup', Canvas.endLasso);
  },

  updateLasso: function(ev){
    var pos;
    if(!STORE.canvas.lasso) return;
    pos = screenToCanvas(ev.clientX, ev.clientY);
    STORE.canvas.lasso.currentX = pos.x;
    STORE.canvas.lasso.currentY = pos.y;
    Canvas.renderLasso();
    Canvas.selectTablesInLasso();
  },

  endLasso: function(){
    document.removeEventListener('mousemove', Canvas.updateLasso);
    document.removeEventListener('mouseup', Canvas.endLasso);
    if(!STORE.canvas.lasso) return;
    Canvas.selectTablesInLasso();
    STORE.canvas.lasso = null;
    removeNode(document.getElementById('ss-lasso'));
    Canvas._justLassoed = true;
  },

  renderLasso: function(){
    var l = STORE.canvas.lasso;
    var lassoEl;
    var x;
    var y;
    var w;
    var h;
    if(!l || !refs.canvasGroup) return;
    x = Math.min(l.startX, l.currentX);
    y = Math.min(l.startY, l.currentY);
    w = Math.abs(l.currentX - l.startX);
    h = Math.abs(l.currentY - l.startY);
    lassoEl = document.getElementById('ss-lasso');
    if(!lassoEl){
      lassoEl = svgNode('rect');
      lassoEl.setAttribute('id', 'ss-lasso');
      lassoEl.setAttribute('class', 'ss-lasso');
      refs.canvasGroup.appendChild(lassoEl);
    }
    lassoEl.setAttribute('x', String(x));
    lassoEl.setAttribute('y', String(y));
    lassoEl.setAttribute('width', String(w));
    lassoEl.setAttribute('height', String(h));
  },

  selectTablesInLasso: function(){
    var l = STORE.canvas.lasso;
    var x1;
    var y1;
    var x2;
    var y2;
    var selectedIds = [];
    if(!l) return;
    x1 = Math.min(l.startX, l.currentX);
    y1 = Math.min(l.startY, l.currentY);
    x2 = Math.max(l.startX, l.currentX);
    y2 = Math.max(l.startY, l.currentY);
    ((STORE.schema && STORE.schema.tables) || []).forEach(function(tbl){
      var tableHeight = getTableHeight(tbl);
      if(tbl.canvas.x < x2 && (tbl.canvas.x + (tbl.canvas.width || TABLE_DEFAULT_WIDTH)) > x1 && tbl.canvas.y < y2 && (tbl.canvas.y + tableHeight) > y1){
        selectedIds.push(tbl.id);
      }
    });
    if(l.additive){
      l.baseSelection.forEach(function(id){
        if(selectedIds.indexOf(id) < 0) selectedIds.push(id);
      });
    }
    STORE.canvas.selection = selectedIds.map(function(id){
      return { kind:'table', id:id };
    });
    Canvas.syncSelectionClasses();
  },

  updateMinimap: function(){
    if(!refs.minimapCanvas) return;
    var ctx = refs.minimapCanvas.getContext('2d');
    var canvas = refs.minimapCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var tables = typeof Browser !== 'undefined' && Browser.getCanvasTables ? Browser.getCanvasTables() : ((STORE.schema && STORE.schema.tables) || []);
    if(!tables.length){
      Canvas._miniBounds = null;
      if(refs.minimapViewport){
        refs.minimapViewport.style.width = '0';
        refs.minimapViewport.style.height = '0';
      }
      return;
    }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    tables.forEach(function(tbl){
      minX = Math.min(minX, tbl.canvas.x);
      minY = Math.min(minY, tbl.canvas.y);
      maxX = Math.max(maxX, tbl.canvas.x + (tbl.canvas.width || TABLE_DEFAULT_WIDTH));
      maxY = Math.max(maxY, tbl.canvas.y + getTableHeight(tbl));
    });
    var pad = 8;
    var width = Math.max(maxX - minX, 1);
    var height = Math.max(maxY - minY, 1);
    var scale = Math.min((canvas.width - (pad * 2)) / width, (canvas.height - (pad * 2)) / height);
    var padY = Math.max(pad, (canvas.height - (height * scale)) / 2);
    Canvas._miniBounds = { minX:minX, minY:minY, scale:scale, pad:pad, padY:padY };
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    tables.forEach(function(tbl){
      var x = pad + ((tbl.canvas.x - minX) * scale);
      var y = padY + ((tbl.canvas.y - minY) * scale);
      var w = Math.max(12, (tbl.canvas.width || TABLE_DEFAULT_WIDTH) * scale);
      var h = Math.max(8, getTableHeight(tbl) * scale);
      ctx.fillStyle = STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === tbl.id; }) ? '#2563eb' : (tbl.color || DOMAIN_COLORS[tbl.domain] || '#94a3b8');
      ctx.fillRect(x, y, w, h);
    });
    if(refs.minimapViewport && refs.canvasWrap){
      var viewX = (-STORE.canvas.panX) / STORE.canvas.zoom;
      var viewY = (-STORE.canvas.panY) / STORE.canvas.zoom;
      var viewW = refs.canvasWrap.clientWidth / STORE.canvas.zoom;
      var viewH = refs.canvasWrap.clientHeight / STORE.canvas.zoom;
      refs.minimapViewport.style.left = (pad + ((viewX - minX) * scale)) + 'px';
      refs.minimapViewport.style.top = (padY + ((viewY - minY) * scale)) + 'px';
      refs.minimapViewport.style.width = Math.max(8, viewW * scale) + 'px';
      refs.minimapViewport.style.height = Math.max(8, viewH * scale) + 'px';
    }
  },

  updateGrid: function(){
    if(!refs.canvasWrap) return;
    var bg = refs.canvasWrap.querySelector('.ss-canvas-bg');
    if(!bg) return;
    var size = STORE.canvas.zoom < 0.5 ? 40 : STORE.canvas.zoom > 2 ? 18 : 24;
    bg.style.backgroundSize = size + 'px ' + size + 'px';
    bg.style.backgroundPosition = STORE.canvas.panX + 'px ' + STORE.canvas.panY + 'px';
  },

  onDblClick: function(ev){
    if(ev.target.closest('.ss-table-card')) return;
    var pos = screenToCanvas(ev.clientX, ev.clientY);
    TableCard.createNew(pos.x - 120, pos.y - 20);
  },

  render: function(){
    ensureSchema();
    if(!refs.tablesLayer) return;
    TableCard.renderAll();
    Canvas.applyTransform();
  }
};

function getPortPosition(tableId, colId){
  var tbl = findTable(tableId);
  if(!tbl) return null;
  var width = tbl.canvas.width || TABLE_DEFAULT_WIDTH;
  var index = -1;
  (tbl.columns || []).forEach(function(col, colIndex){
    if(col.id === colId) index = colIndex;
  });
  if(index < 0) return null;
  return { x: tbl.canvas.x + width, y: tbl.canvas.y + TABLE_HEADER_HEIGHT + (index * COLUMN_HEIGHT) + (COLUMN_HEIGHT / 2) };
}

function getTableCenter(tableId){
  var tbl = findTable(tableId);
  if(!tbl) return null;
  return { x: tbl.canvas.x + ((tbl.canvas.width || TABLE_DEFAULT_WIDTH) / 2), y: tbl.canvas.y + (getTableHeight(tbl) / 2) };
}

function routeOrthogonal(p1, p2){
  if(!p1 || !p2) return '';
  if(p1.x < p2.x){
    var midX = (p1.x + p2.x) / 2;
    return 'M ' + p1.x + ',' + p1.y + ' H ' + midX + ' V ' + p2.y + ' H ' + p2.x;
  }
  var bypassX = Math.min(p1.x, p2.x) - 40;
  return 'M ' + p1.x + ',' + p1.y + ' H ' + bypassX + ' V ' + p2.y + ' H ' + p2.x;
}

function routeCurved(p1, p2){
  var cp1x = p1.x + ((p2.x - p1.x) * 0.5);
  var cp2x = p2.x - ((p2.x - p1.x) * 0.5);
  return 'M ' + p1.x + ',' + p1.y + ' C ' + cp1x + ',' + p1.y + ' ' + cp2x + ',' + p2.y + ' ' + p2.x + ',' + p2.y;
}

function svgNode(name){
  return document.createElementNS(SVG_NS, name);
}

function drawCrowsFoot(svgGroup, point, direction, cardinality){
  var sign = direction === 'left' ? -1 : 1;
  var barX = point.x + (sign * 10);
  function line(x1, y1, x2, y2){
    var node = svgNode('line');
    node.setAttribute('x1', x1);
    node.setAttribute('y1', y1);
    node.setAttribute('x2', x2);
    node.setAttribute('y2', y2);
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1.4');
    svgGroup.appendChild(node);
  }
  function circle(cx, cy, r){
    var node = svgNode('circle');
    node.setAttribute('cx', cx);
    node.setAttribute('cy', cy);
    node.setAttribute('r', r);
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1.2');
    svgGroup.appendChild(node);
  }
  if(cardinality === 'one' || cardinality === 'one-or-many'){
    line(barX, point.y - 6, barX, point.y + 6);
    line(barX + (sign * 4), point.y - 6, barX + (sign * 4), point.y + 6);
  }
  if(cardinality === 'many' || cardinality === 'one-or-many'){
    line(point.x, point.y, point.x + (sign * 10), point.y - 8);
    line(point.x, point.y, point.x + (sign * 10), point.y);
    line(point.x, point.y, point.x + (sign * 10), point.y + 8);
  }
  if(cardinality === 'zero-one'){
    circle(point.x + (sign * 6), point.y, 4);
    line(barX + (sign * 6), point.y - 6, barX + (sign * 6), point.y + 6);
  }
}

var EdgeLayer = {
  svgLayer: null,

  init: function(svgGroup){
    EdgeLayer.svgLayer = svgGroup;
  },

  renderEdge: function(rel){
    if(!EdgeLayer.svgLayer) return;
    var fromPos = getPortPosition(rel.from_table_id, rel.from_col_id);
    var toPos = getPortPosition(rel.to_table_id, rel.to_col_id);
    if(!fromPos || !toPos) return;
    var g = svgNode('g');
    var d = rel.edge && rel.edge.type === 'curved' ? routeCurved(fromPos, toPos) : routeOrthogonal(fromPos, toPos);
    g.setAttribute('class', 'ss-edge-group');
    g.setAttribute('data-edge-id', rel.id);
    g.style.color = rel.on_delete === 'CASCADE' ? 'var(--green)' : rel.on_delete === 'RESTRICT' ? 'var(--amber)' : 'var(--cyan)';
    var hitbox = svgNode('path');
    hitbox.setAttribute('d', d);
    hitbox.setAttribute('stroke', 'transparent');
    hitbox.setAttribute('stroke-width', '12');
    hitbox.setAttribute('fill', 'none');
    hitbox.style.cursor = 'pointer';
    hitbox.onclick = function(ev){
      ev.stopPropagation();
      Canvas.selectEdge(rel.id);
      Inspector.openRelation(rel.id);
    };
    var path = svgNode('path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'ss-edge');
    if(rel.on_delete === 'CASCADE') path.style.stroke = 'var(--green)';
    if(rel.on_delete === 'RESTRICT') path.style.stroke = 'var(--amber)';
    var fromCol = findCol(rel.from_table_id, rel.from_col_id);
    if(fromCol && fromCol.nullable) path.style.strokeDasharray = '4 2';
    g.appendChild(hitbox);
    g.appendChild(path);
    drawCrowsFoot(g, fromPos, 'right', 'many');
    drawCrowsFoot(g, toPos, 'left', 'one');
    if(rel.name){
      var text = svgNode('text');
      text.setAttribute('x', String((fromPos.x + toPos.x) / 2));
      text.setAttribute('y', String((fromPos.y + toPos.y) / 2 - 6));
      text.setAttribute('class', 'ss-edge-label');
      text.textContent = rel.name;
      g.appendChild(text);
    }
    if(STORE.canvas.selection.some(function(item){ return item.kind === 'edge' && item.id === rel.id; })){
      g.classList.add('selected');
    }
    EdgeLayer.svgLayer.appendChild(g);
  },

  renderAll: function(){
    if(!EdgeLayer.svgLayer) return;
    EdgeLayer.svgLayer.innerHTML = '';
    ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){ EdgeLayer.renderEdge(rel); });
  },

  clearAll: function(){
    if(EdgeLayer.svgLayer) EdgeLayer.svgLayer.innerHTML = '';
  },

  renderForVisible: function(visibleIds){
    if(!EdgeLayer.svgLayer) return;
    EdgeLayer.svgLayer.innerHTML = '';
    ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
      if((!visibleIds || (visibleIds.has(rel.from_table_id) && visibleIds.has(rel.to_table_id))) && (!Browser || (Browser.isTableVisible(findTable(rel.from_table_id)) && Browser.isTableVisible(findTable(rel.to_table_id))))){
        EdgeLayer.renderEdge(rel);
      }
    });
  },

  updateEdgesForTable: function(tableId){
    if(!EdgeLayer.svgLayer) return;
    Array.prototype.forEach.call(EdgeLayer.svgLayer.querySelectorAll('.ss-edge-group'), function(node){
      var rel = findRelation(node.getAttribute('data-edge-id'));
      if(rel && (rel.from_table_id === tableId || rel.to_table_id === tableId)){
        removeNode(node);
      }
    });
    ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
      var visibleIds = VirtualRenderer.getVisibleSet();
      if((rel.from_table_id === tableId || rel.to_table_id === tableId) && (!visibleIds || !visibleIds.size || (visibleIds.has(rel.from_table_id) && visibleIds.has(rel.to_table_id))) && (!Browser || (Browser.isTableVisible(findTable(rel.from_table_id)) && Browser.isTableVisible(findTable(rel.to_table_id))))){
        EdgeLayer.renderEdge(rel);
      }
    });
    Canvas.syncSelectionClasses();
  }
};

var Connector = {
  startConnect: function(tableId, colId, ev){
    ev.preventDefault();
    ev.stopPropagation();
    STORE.canvas.connecting = { fromTableId: tableId, fromColId: colId, currentX: 0, currentY: 0 };
    if(refs.canvasWrap) refs.canvasWrap.classList.add('connect-mode');
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card'), function(el){
      if(el.getAttribute('data-table-id') !== tableId) el.classList.add('ss-connect-target');
    });
    if(refs.tempEdge) refs.tempEdge.style.display = '';
    document.addEventListener('mousemove', Connector.onMove);
    document.addEventListener('mouseup', Connector.onEnd);
  },

  onMove: function(ev){
    if(!STORE.canvas.connecting || !refs.tempEdge) return;
    var pos = screenToCanvas(ev.clientX, ev.clientY);
    var fromPos = getPortPosition(STORE.canvas.connecting.fromTableId, STORE.canvas.connecting.fromColId);
    refs.tempEdge.setAttribute('d', routeCurved(fromPos, pos));
  },

  onEnd: function(ev){
    document.removeEventListener('mousemove', Connector.onMove);
    document.removeEventListener('mouseup', Connector.onEnd);
    if(refs.canvasWrap) refs.canvasWrap.classList.remove('connect-mode');
    Array.prototype.forEach.call(document.querySelectorAll('.ss-connect-target'), function(el){ el.classList.remove('ss-connect-target'); });
    if(refs.tempEdge) refs.tempEdge.style.display = 'none';
    var connecting = STORE.canvas.connecting;
    STORE.canvas.connecting = null;
    var target = document.elementFromPoint(ev.clientX, ev.clientY);
    var tableCard = target && target.closest ? target.closest('.ss-table-card') : null;
    if(!tableCard || tableCard.getAttribute('data-table-id') === connecting.fromTableId) return;
    var colItem = target && target.closest ? target.closest('.ss-col-item') : null;
    var toTableId = tableCard.getAttribute('data-table-id');
    var toColId = colItem ? colItem.getAttribute('data-col-id') : null;
    Connector.openFkWizard(connecting.fromTableId, connecting.fromColId, toTableId, toColId);
  },

  openFkWizard: function(fromTableId, fromColId, toTableId, preselectedColId){
    var fromTable = findTable(fromTableId);
    var fromCol = findCol(fromTableId, fromColId);
    if(!fromTable || !fromCol) return;
    var overlay = document.createElement('div');
    overlay.className = 'ss-modal-overlay';
    var tableOptions = ((STORE.schema && STORE.schema.tables) || []).filter(function(tbl){ return tbl.id !== fromTableId; });
    var activeTableId = toTableId || (tableOptions[0] && tableOptions[0].id) || '';
    function buildColumnOptions(targetId){
      var targetTable = findTable(targetId);
      var targetCols = targetTable ? targetTable.columns : [];
      var preferred = preselectedColId || (targetCols.filter(function(col){ return col.primary_key; })[0] || targetCols[0] || {}).id || '';
      return {
        selected: preferred,
        html: targetCols.map(function(col){
          return '<option value="' + _esc(col.id) + '"' + (col.id === preferred ? ' selected' : '') + '>' + _esc(col.name) + '</option>';
        }).join('')
      };
    }
    function render(){
      var columnState = buildColumnOptions(activeTableId);
      overlay.innerHTML = [
        '<div class="ss-modal">',
          '<div class="ss-modal-header"><h3>', _esc(_t('Tao khoa ngoai', 'Create foreign key')), '</h3><button type="button" class="hm-btn hm-btn-ghost" data-ss-close="fk">X</button></div>',
          '<div class="ss-modal-body">',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Nguon', 'Source')), '</div><div class="ss-rel-card">', _esc(fromTable.name + '.' + fromCol.name), '</div></div>',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Bang dich', 'Target table')), '</div><select class="hm-input" id="ss-fk-target-table">', tableOptions.map(function(tbl){ return '<option value="' + _esc(tbl.id) + '"' + (tbl.id === activeTableId ? ' selected' : '') + '>' + _esc(tbl.name) + '</option>'; }).join(''), '</select></div>',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Cot dich', 'Target column')), '</div><select class="hm-input" id="ss-fk-target-col">', columnState.html, '</select></div>',
            '<div class="ss-field-row">',
              '<div class="ss-field-group" style="flex:1"><div class="ss-field-label">ON DELETE</div><select class="hm-input" id="ss-fk-on-delete">', ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === 'RESTRICT' ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join(''), '</select></div>',
              '<div class="ss-field-group" style="flex:1"><div class="ss-field-label">ON UPDATE</div><select class="hm-input" id="ss-fk-on-update">', ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === 'CASCADE' ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join(''), '</select></div>',
            '</div>',
          '</div>',
          '<div class="ss-modal-footer"><button type="button" class="hm-btn hm-btn-ghost" data-ss-close="fk">', _esc(_t('Huy', 'Cancel')), '</button><button type="button" class="hm-btn hm-btn-primary" id="ss-fk-confirm">', _esc(_t('Xac nhan', 'Confirm')), '</button></div>',
        '</div>'
      ].join('');
      overlay.querySelectorAll('[data-ss-close="fk"]').forEach(function(node){ node.onclick = function(){ removeNode(overlay); }; });
      document.body.appendChild(overlay);
      overlay.querySelector('#ss-fk-target-table').onchange = function(){
        activeTableId = this.value;
        overlay.querySelector('#ss-fk-target-col').innerHTML = buildColumnOptions(activeTableId).html;
      };
      overlay.querySelector('#ss-fk-confirm').onclick = function(){
        var selectedTableId = overlay.querySelector('#ss-fk-target-table').value;
        var selectedColId = overlay.querySelector('#ss-fk-target-col').value;
        var onDelete = overlay.querySelector('#ss-fk-on-delete').value;
        var onUpdate = overlay.querySelector('#ss-fk-on-update').value;
        removeNode(overlay);
        Connector.createRelation(fromTableId, fromColId, selectedTableId, selectedColId, onDelete, onUpdate);
      };
      overlay.addEventListener('click', function(ev){ if(ev.target === overlay) removeNode(overlay); });
    }
    render();
  },

  createRelation: function(fromTblId, fromColId, toTblId, toColId, onDelete, onUpdate){
    var fromTbl = findTable(fromTblId);
    var fromCol = findCol(fromTblId, fromColId);
    var toTbl = findTable(toTblId);
    var toCol = findCol(toTblId, toColId);
    if(!fromTbl || !fromCol || !toTbl || !toCol) return;
    pushUndo();
    STORE.schema.relations = (STORE.schema.relations || []).filter(function(rel){ return rel.from_col_id !== fromColId; });
    fromCol.foreign_key = {
      ref_table_id: toTblId,
      ref_col_id: toColId,
      on_delete: onDelete || 'RESTRICT',
      on_update: onUpdate || 'CASCADE',
      constraint_name: 'fk_' + fromTbl.name + '_' + fromCol.name,
      deferrable: false
    };
    STORE.schema.relations.push({
      id: _uid(),
      from_table_id: fromTblId,
      from_col_id: fromColId,
      to_table_id: toTblId,
      to_col_id: toColId,
      name: fromCol.foreign_key.constraint_name,
      on_delete: fromCol.foreign_key.on_delete,
      on_update: fromCol.foreign_key.on_update,
      nullable: !!fromCol.nullable,
      edge: { type:'orthogonal', waypoints:[] }
    });
    TableCard.reRender(fromTblId);
    VirtualRenderer.scheduleUpdate();
    markDirty();
    Browser.render();
    saveDraft();
    toast(_t('Da tao khoa ngoai', 'Foreign key created'), 'success');
  }
};

var TableCard = {
  createNew: function(x, y){
    ensureSchema();
    pushUndo();
    var tbl = createDefaultTable(x, y);
    STORE.schema.tables.push(tbl);
    Canvas.render();
    Canvas.selectTable(tbl.id);
    Inspector.open({ kind:'table', tableId:tbl.id });
    markDirty();
    saveDraft();
    return tbl;
  },

  renderTable: function(tbl){
    if(!refs.tablesLayer) return;
    if(document.getElementById('tc_' + tbl.id)) return;
    var card = document.createElement('div');
    var domainColor = tbl.color || DOMAIN_COLORS[tbl.domain] || DOMAIN_COLORS.default;
    card.className = 'ss-table-card' + (tbl.canvas.collapsed ? ' collapsed' : '');
    card.id = 'tc_' + tbl.id;
    card.setAttribute('data-table-id', tbl.id);
    card.style.transform = 'translate(' + tbl.canvas.x + 'px,' + tbl.canvas.y + 'px)';
    card.style.width = (tbl.canvas.width || TABLE_DEFAULT_WIDTH) + 'px';
    card.style.setProperty('--ss-domain-color', domainColor);
    card.innerHTML = [
      '<div class="ss-table-card-header">',
        '<span class="ss-tbl-drag">::</span>',
        '<span class="ss-tbl-name" title="' + _esc(tbl.name) + '">' + _esc(tbl.name) + '</span>',
        '<span class="ss-tbl-schema-badge">' + _esc(tbl.schema || 'public') + '</span>',
        '<div class="ss-table-actions">',
          '<button type="button" class="ss-icon-btn" data-ss-action="collapse" title="' + _esc(_t('Thu gon', 'Collapse')) + '">' + (tbl.canvas.collapsed ? '+' : '-') + '</button>',
          '<button type="button" class="ss-icon-btn danger" data-ss-action="delete" title="' + _esc(_t('Xoa', 'Delete')) + '">&#128465;</button>',
        '</div>',
      '</div>',
      '<ul class="ss-col-list">',
        (tbl.columns || []).map(function(col){
          var iconClass = col.primary_key ? 'is-pk' : (col.foreign_key ? 'is-fk' : '');
          var icon = col.primary_key ? 'K' : (col.foreign_key ? 'F' : '.');
          return '<li class="ss-col-item" data-col-id="' + _esc(col.id) + '"><span class="ss-col-icon ' + iconClass + '">' + _esc(icon) + '</span><span class="ss-col-name">' + _esc(col.name) + '</span><span class="ss-col-type">' + _esc(fmtColType(col)) + '</span><span class="ss-col-badges">' + colBadges(col, tbl).map(function(badge){
            if(badge.cls === 'fk' && col.foreign_key){
              return '<span class="ss-col-badge fk ss-fk-navigate" title="' + _esc(_t('Di toi bang tham chieu', 'Jump to referenced table')) + '" onclick="TableCard.navigateFK(event,\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">FK ↗</span>';
            }
            return '<span class="ss-col-badge ' + _esc(badge.cls) + '">' + _esc(badge.text) + '</span>';
          }).join('') + '</span><span class="ss-fk-port" data-port-col="' + _esc(col.id) + '" title="' + _esc(_t('Keo de tao FK', 'Drag to create FK')) + '"></span></li>';
        }).join(''),
      '</ul>',
      '<div class="ss-col-item-add" data-ss-action="add-column">+ ' + _esc(_t('Them cot', 'Add column')) + '</div>',
      '<div class="ss-table-footer">' + _esc(((tbl.indexes || []).length + ' indexes · ' + (tbl.columns || []).length + ' ' + _t('cot', 'columns'))) + '</div>'
    ].join('');
    refs.tablesLayer.appendChild(card);
    if(STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === tbl.id; })){
      card.classList.add('selected');
    }
    card.addEventListener('mousedown', function(ev){
      if(ev.target.closest('.ss-fk-port') || ev.target.closest('.ss-icon-btn')) return;
      if(ev.target.closest('.ss-table-card-header')){
        TableCard.startMove(tbl.id, ev);
        return;
      }
      Canvas.selectTable(tbl.id, ev.shiftKey || ev.ctrlKey || ev.metaKey);
    });
    card.addEventListener('click', function(ev){
      if(ev.target.closest('.ss-fk-port') || ev.target.closest('.ss-icon-btn') || ev.target.closest('.ss-col-item') || ev.target.closest('.ss-col-item-add')) return;
      Canvas.selectTable(tbl.id, ev.shiftKey || ev.ctrlKey || ev.metaKey);
      Inspector.open({ kind:'table', tableId:tbl.id });
    });
    card.querySelector('.ss-tbl-name').ondblclick = function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      TableCard.inlineRenameTable(tbl.id);
    };
    card.querySelector('[data-ss-action="collapse"]').onclick = function(ev){ ev.stopPropagation(); TableCard.toggleCollapse(tbl.id); };
    card.querySelector('[data-ss-action="delete"]').onclick = function(ev){ ev.stopPropagation(); TableCard.confirmDelete(tbl.id); };
    card.querySelector('[data-ss-action="add-column"]').onclick = function(ev){ ev.stopPropagation(); TableCard.addColumn(tbl.id); };
    Array.prototype.forEach.call(card.querySelectorAll('.ss-col-item'), function(node){
      node.onclick = function(ev){
        ev.stopPropagation();
        Canvas.selectTable(tbl.id);
        Inspector.openColumn(tbl.id, node.getAttribute('data-col-id'));
      };
    });
    Array.prototype.forEach.call(card.querySelectorAll('.ss-fk-port'), function(port){
      port.onmousedown = function(ev){ Connector.startConnect(tbl.id, port.getAttribute('data-port-col'), ev); };
    });
  },

  startMove: function(tableId, ev){
    if(ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    var modifier = ev.shiftKey || ev.ctrlKey || ev.metaKey;
    var selectedTableIds = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; });
    var isMultiMove;
    var tablesToMove;
    var tbl = findTable(tableId);
    var rafHandle = null;
    var startPositions = {};
    var pendingDX = 0;
    var pendingDY = 0;
    if(!tbl) return;
    if(selectedTableIds.indexOf(tableId) < 0){
      Canvas.selectTable(tableId, modifier);
      selectedTableIds = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; });
    }
    isMultiMove = selectedTableIds.indexOf(tableId) >= 0 && selectedTableIds.length > 1;
    tablesToMove = isMultiMove ? selectedTableIds.slice() : [tableId];
    pushUndo();
    tablesToMove.forEach(function(id){
      var moveTbl = findTable(id);
      var moveCard = document.getElementById('tc_' + id);
      if(moveTbl){
        startPositions[id] = { x: moveTbl.canvas.x, y: moveTbl.canvas.y };
      }
      if(moveCard){
        moveCard.classList.add('ss-dragging');
      }
    });
    var startCanvasX = (ev.clientX - STORE.canvas.panX) / STORE.canvas.zoom;
    var startCanvasY = (ev.clientY - STORE.canvas.panY) / STORE.canvas.zoom;
    function onMove(moveEv){
      var cx = (moveEv.clientX - STORE.canvas.panX) / STORE.canvas.zoom;
      var cy = (moveEv.clientY - STORE.canvas.panY) / STORE.canvas.zoom;
      pendingDX = cx - startCanvasX;
      pendingDY = cy - startCanvasY;
      if(rafHandle) return;
      rafHandle = requestAnimationFrame(function(){
        rafHandle = null;
        tablesToMove.forEach(function(id){
          var moveTbl = findTable(id);
          var moveCard = document.getElementById('tc_' + id);
          if(!moveTbl || !startPositions[id]) return;
          moveTbl.canvas.x = Math.max(0, startPositions[id].x + pendingDX);
          moveTbl.canvas.y = Math.max(0, startPositions[id].y + pendingDY);
          if(moveCard){
            moveCard.style.transform = 'translate(' + moveTbl.canvas.x + 'px,' + moveTbl.canvas.y + 'px)';
          }
          EdgeLayer.updateEdgesForTable(id);
        });
      });
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(rafHandle){
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      tablesToMove.forEach(function(id){
        var moveTbl = findTable(id);
        var moveCard = document.getElementById('tc_' + id);
        if(moveCard) moveCard.classList.remove('ss-dragging');
        if(!moveTbl) return;
        if(STORE.canvas.snapToGrid){
          moveTbl.canvas.x = Math.round(moveTbl.canvas.x / STORE.canvas.gridSize) * STORE.canvas.gridSize;
          moveTbl.canvas.y = Math.round(moveTbl.canvas.y / STORE.canvas.gridSize) * STORE.canvas.gridSize;
          if(moveCard){
            moveCard.style.transform = 'translate(' + moveTbl.canvas.x + 'px,' + moveTbl.canvas.y + 'px)';
          }
        }
        EdgeLayer.updateEdgesForTable(id);
      });
      VirtualRenderer.scheduleUpdate();
      markDirty();
      saveDraft();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  },

  inlineRenameTable: function(tableId){
    var tbl = findTable(tableId);
    var card = document.getElementById('tc_' + tableId);
    if(!tbl || !card) return;
    var titleEl = card.querySelector('.ss-tbl-name');
    var input = document.createElement('input');
    input.className = 'hm-input';
    input.value = tbl.name;
    input.style.height = '24px';
    input.style.minWidth = '0';
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    function cancel(){ TableCard.reRender(tableId); }
    function commit(){
      var nextName = _slug(input.value);
      if(!isValidIdentifier(nextName)){
        toast(_t('Ten bang phai la snake_case', 'Table name must be snake_case'), 'error');
        cancel();
        return;
      }
      if(findTableByName(nextName) && nextName !== tbl.name){
        toast(_t('Ten bang da ton tai', 'Table name already exists'), 'error');
        cancel();
        return;
      }
      pushUndo();
      tbl.name = nextName;
      TableCard.reRender(tableId);
      Browser.render();
      Inspector.render();
      markDirty();
      saveDraft();
    }
    input.onkeydown = function(ev){
      if(ev.key === 'Enter') commit();
      if(ev.key === 'Escape') cancel();
    };
    input.onblur = commit;
  },

  toggleCollapse: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.canvas.collapsed = !tbl.canvas.collapsed;
    TableCard.reRender(tableId);
    EdgeLayer.updateEdgesForTable(tableId);
    markDirty();
    saveDraft();
  },

  confirmDelete: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    var rels = ((STORE.schema && STORE.schema.relations) || []).filter(function(rel){
      return rel.from_table_id === tableId || rel.to_table_id === tableId;
    });
    var msg = rels.length > 0
      ? _t('Bang nay co ' + rels.length + ' lien ket FK. Xoa se xoa toan bo lien ket lien quan.', 'This table has ' + rels.length + ' foreign-key links. Deleting it will remove all related links.')
      : _t('Xoa bang ' + tbl.name + '?', 'Delete table ' + tbl.name + '?');
    confirm2(msg, true).then(function(ok){
      if(!ok) return;
      pushUndo();
      ((STORE.schema && STORE.schema.tables) || []).forEach(function(target){
        (target.columns || []).forEach(function(col){
          if(col.foreign_key && (col.foreign_key.ref_table_id === tableId || target.id === tableId)){
            col.foreign_key = null;
          }
        });
      });
      STORE.schema.tables = STORE.schema.tables.filter(function(item){ return item.id !== tableId; });
      STORE.schema.relations = STORE.schema.relations.filter(function(rel){ return rel.from_table_id !== tableId && rel.to_table_id !== tableId; });
      Canvas.clearSelection();
      Inspector.close();
      Canvas.render();
      markDirty();
      saveDraft();
    });
  },

  addColumn: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    var col = { id:_uid(), name:generateUniqueColumnName(tbl, 'new_column'), type:'varchar', length:255, scale:null, is_array:false, nullable:true, unique:false, primary_key:false, pk_order:null, default_val:null, check_expr:null, generated_expr:null, generated_stored:false, comment:'', foreign_key:null };
    tbl.columns.push(col);
    TableCard.reRender(tableId);
    Inspector.openColumn(tableId, col.id);
    markDirty();
    saveDraft();
  },

  deleteColumn: function(tableId, colId){
    var tbl = findTable(tableId);
    var col = findCol(tableId, colId);
    if(!tbl || !col) return;
    if(col.primary_key){
      toast(_t('Khong the xoa cot Primary Key mac dinh', 'Cannot delete the primary key column'), 'error');
      return;
    }
    confirm2(_t('Xoa cot ' + col.name + '?', 'Delete column ' + col.name + '?'), true).then(function(ok){
      if(!ok) return;
      pushUndo();
      tbl.columns = tbl.columns.filter(function(item){ return item.id !== colId; });
      STORE.schema.relations = STORE.schema.relations.filter(function(rel){ return rel.from_col_id !== colId && rel.to_col_id !== colId; });
      ((STORE.schema && STORE.schema.tables) || []).forEach(function(otherTbl){
        (otherTbl.columns || []).forEach(function(otherCol){
          if(otherCol.foreign_key && (otherCol.foreign_key.ref_col_id === colId || otherCol.id === colId)){
            otherCol.foreign_key = null;
          }
        });
      });
      TableCard.reRender(tableId);
      VirtualRenderer.scheduleUpdate();
      Inspector.open({ kind:'table', tableId:tableId });
      markDirty();
      saveDraft();
    });
  },

  reRender: function(tableId){
    var node = document.getElementById('tc_' + tableId);
    if(node) removeNode(node);
    var tbl = findTable(tableId);
    if(tbl && VirtualRenderer.isVisible(tbl)) TableCard.renderTable(tbl);
    Canvas.syncSelectionClasses();
    EdgeLayer.updateEdgesForTable(tableId);
    VirtualRenderer.scheduleUpdate();
  },

  duplicate: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    var cloned = _clone(tbl);
    cloned.id = _uid();
    cloned.name = generateUniqueTableName(tbl.name + '_copy');
    cloned.canvas.x += 40;
    cloned.canvas.y += 40;
    cloned.columns = cloned.columns.map(function(col){
      col.id = _uid();
      col.foreign_key = null;
      return col;
    });
    STORE.schema.tables.push(cloned);
    Canvas.render();
    Canvas.selectTable(cloned.id);
    markDirty();
    saveDraft();
  },

  navigateFK: function(ev, tableId, colId){
    var col;
    var refTableId;
    var rel;
    var edgeEl;
    var refTable;
    ev.stopPropagation();
    col = findCol(tableId, colId);
    if(!col || !col.foreign_key) return;
    refTableId = col.foreign_key.ref_table_id;
    if(!refTableId) return;
    Browser.focusTable(refTableId);
    Canvas.selectTable(refTableId);
    Inspector.open({ kind:'table', tableId:refTableId });
    rel = ((STORE.schema && STORE.schema.relations) || []).filter(function(item){
      return item.from_table_id === tableId && item.from_col_id === colId;
    })[0];
    if(rel){
      edgeEl = document.querySelector('[data-edge-id="' + rel.id + '"]');
      if(edgeEl){
        edgeEl.classList.add('ss-edge-flash');
        setTimeout(function(){ edgeEl.classList.remove('ss-edge-flash'); }, 1500);
      }
    }
    refTable = findTable(refTableId);
    if(refTable){
      toast('→ ' + refTable.name, 'info');
    }
  },

  renderAll: function(){
    VirtualRenderer.reset();
  }
};

function buildTypeOptions(selectedType){
  var groups = {};
  PG_TYPES.forEach(function(item){
    if(!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });
  return Object.keys(groups).map(function(group){
    return '<optgroup label="' + _esc(group) + '">' + groups[group].map(function(item){
      return '<option value="' + _esc(item.name) + '"' + (item.name === selectedType ? ' selected' : '') + '>' + _esc(item.name) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');
}

var Inspector = {
  open: function(target){
    STORE.inspector.target = target;
    Inspector.render();
  },

  backToTable: function(tableId){
    Inspector.open({ kind:'table', tableId:tableId });
  },

  openColumn: function(tableId, colId){
    Inspector.open({ kind:'column', tableId:tableId, colId:colId });
  },

  openRelation: function(relId){
    Inspector.open({ kind:'relation', relId:relId });
  },

  close: function(){
    STORE.inspector.target = null;
    Inspector.render();
  },

  switchTab: function(tab, tableId){
    STORE.inspector.tab = tab;
    Inspector.renderTable(tableId);
  },

  render: function(){
    if(!refs.inspector) return;
    var target = STORE.inspector.target;
    if(!target || !target.kind){
      Inspector.renderEmpty();
      return;
    }
    if(target.kind === 'table') Inspector.renderTable(target.tableId);
    if(target.kind === 'column') Inspector.renderColumn(target.tableId, target.colId);
    if(target.kind === 'relation') Inspector.renderRelation(target.relId);
  },

  renderEmpty: function(){
    refs.inspector.innerHTML = '<div class="ss-empty-state"><div><div class="ss-empty-icon">○</div><div>' + _esc(_t('Chọn bảng hoặc cột để chỉnh sửa', 'Select a table or column to edit')) + '</div><div class="ss-field-hint">' + _esc(_t('Canvas ở giữa, inspector ở bên phải.', 'Canvas in the middle, inspector on the right.')) + '</div></div></div>';
  },

  renderTable: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl || !refs.inspector){
      Inspector.renderEmpty();
      return;
    }
    refs.inspector.innerHTML = [
      '<div class="ss-inspector-tabs">',
        '<button class="ss-itab', STORE.inspector.tab === 'props' ? ' active' : '', '" onclick="Inspector.switchTab(\'props\',\'' + _esc(tableId) + '\')">', _esc(_t('Thuoc tinh', 'Properties')), '</button>',
        '<button class="ss-itab', STORE.inspector.tab === 'indexes' ? ' active' : '', '" onclick="Inspector.switchTab(\'indexes\',\'' + _esc(tableId) + '\')">Indexes</button>',
        '<button class="ss-itab', STORE.inspector.tab === 'constraints' ? ' active' : '', '" onclick="Inspector.switchTab(\'constraints\',\'' + _esc(tableId) + '\')">', _esc(_t('Rang buoc', 'Constraints')), '</button>',
        '<button class="ss-itab', STORE.inspector.tab === 'triggers' ? ' active' : '', '" onclick="Inspector.switchTab(\'triggers\',\'' + _esc(tableId) + '\')">Triggers</button>',
      '</div>',
      '<div class="ss-inspector-body" id="ss-inspector-body"></div>'
    ].join('');
    Inspector.renderTableTab(tableId, STORE.inspector.tab);
  },

  renderTableTab: function(tableId, tab){
    var tbl = findTable(tableId);
    var body = document.getElementById('ss-inspector-body');
    if(!tbl || !body) return;
    if(tab === 'indexes'){
      body.innerHTML = Inspector.buildIndexesHTML(tbl);
      return;
    }
    if(tab === 'constraints'){
      body.innerHTML = Inspector.buildConstraintsHTML(tbl);
      return;
    }
    if(tab === 'triggers'){
      body.innerHTML = Inspector.buildTriggersHTML(tbl);
      return;
    }
    body.innerHTML = Inspector.buildTablePropsHTML(tbl);
  },

  buildTablePropsHTML: function(tbl){
    var relCount = ((STORE.schema && STORE.schema.relations) || []).filter(function(rel){
      return rel.from_table_id === tbl.id || rel.to_table_id === tbl.id;
    }).length;
    return [
      Inspector.fieldGroup(_t('Ten bang', 'Table name'),
        '<input class="hm-input" id="inp-tbl-name" value="' + _esc(tbl.name) + '" placeholder="snake_case_name" />' +
        '<div class="ss-field-hint">snake_case</div>'),
      Inspector.fieldGroup('Schema',
        '<input class="hm-input" id="inp-tbl-schema" value="' + _esc(tbl.schema || 'public') + '" placeholder="public" />'),
      Inspector.fieldGroup('Domain',
        '<select class="hm-input" id="inp-tbl-domain">' + Object.keys(DOMAIN_COLORS).sort().map(function(domain){
          return '<option value="' + _esc(domain) + '"' + (domain === (tbl.domain || 'default') ? ' selected' : '') + '>' + _esc(domain) + '</option>';
        }).join('') + '</select>'),
      Inspector.fieldGroup(_t('Mo ta', 'Comment'),
        '<textarea class="hm-input" id="inp-tbl-comment" rows="3">' + _esc(tbl.comment || '') + '</textarea>'),
      Inspector.fieldGroup('Tags',
        '<input class="hm-input" id="inp-tbl-tags" value="' + _esc((tbl.tags || []).join(', ')) + '" placeholder="core, audit, qms" />'),
      Inspector.fieldGroup(_t('Mau hien thi', 'Display color'),
        '<input type="color" id="inp-tbl-color" value="' + _esc(Inspector.colorValue(tbl.color || DOMAIN_COLORS[tbl.domain] || DOMAIN_COLORS.default)) + '" />'),
      '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="chk-tbl-rls"' + (tbl.rls_enabled ? ' checked' : '') + ' /><span>Row Level Security (RLS)</span></label></div>',
      '<div class="ss-table-meta-row">',
        '<div class="ss-index-card"><strong>' + String((tbl.columns || []).length) + '</strong><span>' + _esc(_t('cot', 'columns')) + '</span></div>',
        '<div class="ss-index-card"><strong>' + String((tbl.indexes || []).length) + '</strong><span>Indexes</span></div>',
        '<div class="ss-index-card"><strong>' + String(relCount) + '</strong><span>FK</span></div>',
      '</div>',
      '<div class="ss-inspector-actions">',
        '<button class="hm-btn hm-btn-primary" onclick="Inspector.saveTable(\'' + _esc(tbl.id) + '\')">' + _esc(_t('Luu bang', 'Save table')) + '</button>',
        '<button class="hm-btn hm-btn-ghost" onclick="TableCard.inlineRenameTable(\'' + _esc(tbl.id) + '\')">' + _esc(_t('Doi ten nhanh', 'Quick rename')) + '</button>',
      '</div>'
    ].join('');
  },

  buildIndexesHTML: function(tbl){
    var indexes = tbl.indexes || [];
    return [
      '<div class="ss-field-group"><button class="hm-btn hm-btn-secondary" onclick="Inspector.addIndex(\'' + _esc(tbl.id) + '\')">+ Index</button></div>',
      indexes.length ? indexes.map(function(idx){
        return [
          '<div class="ss-index-card" data-index-id="' + _esc(idx.id) + '">',
            '<div class="ss-field-group"><div class="ss-field-label">Name</div><input class="hm-input" data-field="name" value="' + _esc(idx.name || '') + '" /></div>',
            '<div class="ss-field-row">',
              '<div class="ss-field-group" style="flex:1"><div class="ss-field-label">Type</div><input class="hm-input" data-field="type" value="' + _esc(idx.type || 'BTREE') + '" /></div>',
              '<div class="ss-field-group" style="flex:1"><label class="ss-toggle-row"><input type="checkbox" data-field="unique"' + (idx.unique ? ' checked' : '') + ' /><span>UNIQUE</span></label></div>',
            '</div>',
            '<div class="ss-field-group"><div class="ss-field-label">' + _esc(_t('Cac cot', 'Columns')) + '</div><input class="hm-input" data-field="columns" value="' + _esc((idx.columns || []).map(function(col){ return col.name; }).join(', ')) + '" placeholder="column_a, column_b" /></div>',
            '<div class="ss-field-group"><div class="ss-field-label">WHERE</div><input class="hm-input" data-field="where" value="' + _esc(idx.where || '') + '" placeholder="status = \'ACTIVE\'" /></div>',
            '<div class="ss-inspector-actions">',
              '<button class="hm-btn hm-btn-primary" onclick="Inspector.saveIndex(\'' + _esc(tbl.id) + '\',\'' + _esc(idx.id) + '\')">' + _esc(_t('Luu', 'Save')) + '</button>',
              '<button class="hm-btn hm-btn-danger" onclick="Inspector.deleteIndex(\'' + _esc(tbl.id) + '\',\'' + _esc(idx.id) + '\')">' + _esc(_t('Xoa', 'Delete')) + '</button>',
            '</div>',
          '</div>'
        ].join('');
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chua co index nao', 'No indexes yet')) + '</div></div>'
    ].join('');
  },

  buildConstraintsHTML: function(tbl){
    var constraints = tbl.check_constraints || [];
    return [
      '<div class="ss-field-group"><button class="hm-btn hm-btn-secondary" onclick="Inspector.addConstraint(\'' + _esc(tbl.id) + '\')">+ CHECK</button></div>',
      constraints.length ? constraints.map(function(item){
        return '<div class="ss-index-card" data-constraint-id="' + _esc(item.id) + '"><div class="ss-field-group"><div class="ss-field-label">Name</div><input class="hm-input" data-field="name" value="' + _esc(item.name || '') + '" /></div><div class="ss-field-group"><div class="ss-field-label">Expression</div><textarea class="hm-input" rows="3" data-field="expression">' + _esc(item.expression || '') + '</textarea></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveConstraint(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Luu', 'Save')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.deleteConstraint(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Xoa', 'Delete')) + '</button></div></div>';
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chua co rang buoc CHECK', 'No CHECK constraints yet')) + '</div></div>'
    ].join('');
  },

  buildTriggersHTML: function(tbl){
    var triggers = tbl.triggers || [];
    return [
      '<div class="ss-field-group"><button class="hm-btn hm-btn-secondary" onclick="Inspector.addTrigger(\'' + _esc(tbl.id) + '\')">+ Trigger</button></div>',
      triggers.length ? triggers.map(function(item){
        return '<div class="ss-index-card" data-trigger-id="' + _esc(item.id) + '"><div class="ss-field-group"><div class="ss-field-label">Name</div><input class="hm-input" data-field="name" value="' + _esc(item.name || '') + '" /></div><div class="ss-field-row"><div class="ss-field-group" style="flex:1"><div class="ss-field-label">Timing</div><input class="hm-input" data-field="timing" value="' + _esc(item.timing || 'BEFORE') + '" /></div><div class="ss-field-group" style="flex:1"><div class="ss-field-label">Event</div><input class="hm-input" data-field="event" value="' + _esc(item.event || 'INSERT') + '" /></div></div><div class="ss-field-group"><div class="ss-field-label">Function</div><input class="hm-input" data-field="function_name" value="' + _esc(item.function_name || '') + '" placeholder="fn_set_updated_at" /></div><div class="ss-field-group"><div class="ss-field-label">WHEN</div><input class="hm-input" data-field="when_clause" value="' + _esc(item.when_clause || '') + '" placeholder="NEW.status IS DISTINCT FROM OLD.status" /></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveTrigger(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Luu', 'Save')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.deleteTrigger(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Xoa', 'Delete')) + '</button></div></div>';
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chua co trigger nao', 'No triggers yet')) + '</div></div>'
    ].join('');
  },

  saveTable: function(tableId){
    var tbl = findTable(tableId);
    var nextName;
    var duplicated;
    if(!tbl) return;
    nextName = _slug(document.getElementById('inp-tbl-name').value);
    if(!isValidIdentifier(nextName)){
      toast(_t('Ten bang phai la snake_case hop le', 'Table name must be valid snake_case'), 'error');
      return;
    }
    duplicated = ((STORE.schema && STORE.schema.tables) || []).some(function(item){
      return item.id !== tableId && item.name === nextName;
    });
    if(duplicated){
      toast(_t('Ten bang da ton tai', 'Table name already exists'), 'error');
      return;
    }
    pushUndo();
    tbl.name = nextName;
    tbl.schema = _slug(document.getElementById('inp-tbl-schema').value || 'public') || 'public';
    tbl.domain = document.getElementById('inp-tbl-domain').value || 'default';
    tbl.comment = document.getElementById('inp-tbl-comment').value.trim();
    tbl.tags = document.getElementById('inp-tbl-tags').value.split(',').map(function(item){ return item.trim(); }).filter(Boolean);
    tbl.color = document.getElementById('inp-tbl-color').value || null;
    tbl.rls_enabled = !!document.getElementById('chk-tbl-rls').checked;
    TableCard.reRender(tableId);
    Browser.render();
    markDirty();
    saveDraft();
    toast(_t('Da luu bang ' + tbl.name, 'Saved table ' + tbl.name), 'success');
  },

  addIndex: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.indexes = tbl.indexes || [];
    tbl.indexes.push({
      id: _uid(),
      name: 'idx_' + tbl.name + '_' + ((tbl.indexes.length || 0) + 1),
      type: 'BTREE',
      unique: false,
      columns: tbl.columns && tbl.columns[0] ? [{ name: tbl.columns[0].name, order:'ASC' }] : [],
      where: '',
      include: []
    });
    Inspector.renderTable(tableId);
    markDirty();
    saveDraft();
  },

  saveIndex: function(tableId, indexId){
    var tbl = findTable(tableId);
    var card;
    var idx;
    if(!tbl) return;
    card = refs.inspector.querySelector('[data-index-id="' + indexId + '"]');
    idx = (tbl.indexes || []).filter(function(item){ return item.id === indexId; })[0];
    if(!card || !idx) return;
    pushUndo();
    idx.name = _slug(card.querySelector('[data-field="name"]').value) || idx.name;
    idx.type = String(card.querySelector('[data-field="type"]').value || 'BTREE').toUpperCase();
    idx.unique = !!card.querySelector('[data-field="unique"]').checked;
    idx.columns = String(card.querySelector('[data-field="columns"]').value || '').split(',').map(function(item){
      var name = _slug(item);
      return name ? { name:name, order:'ASC' } : null;
    }).filter(Boolean);
    idx.where = card.querySelector('[data-field="where"]').value.trim();
    markDirty();
    saveDraft();
    TableCard.reRender(tableId);
    Inspector.renderTable(tableId);
  },

  deleteIndex: function(tableId, indexId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.indexes = (tbl.indexes || []).filter(function(item){ return item.id !== indexId; });
    Inspector.renderTable(tableId);
    TableCard.reRender(tableId);
    markDirty();
    saveDraft();
  },

  addConstraint: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.check_constraints = tbl.check_constraints || [];
    tbl.check_constraints.push({ id:_uid(), name:'chk_' + tbl.name + '_' + ((tbl.check_constraints.length || 0) + 1), expression:'' });
    Inspector.renderTable(tableId);
    markDirty();
    saveDraft();
  },

  saveConstraint: function(tableId, constraintId){
    var tbl = findTable(tableId);
    var card;
    var item;
    if(!tbl) return;
    card = refs.inspector.querySelector('[data-constraint-id="' + constraintId + '"]');
    item = (tbl.check_constraints || []).filter(function(entry){ return entry.id === constraintId; })[0];
    if(!card || !item) return;
    pushUndo();
    item.name = _slug(card.querySelector('[data-field="name"]').value) || item.name;
    item.expression = card.querySelector('[data-field="expression"]').value.trim();
    markDirty();
    saveDraft();
    Inspector.renderTable(tableId);
  },

  deleteConstraint: function(tableId, constraintId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.check_constraints = (tbl.check_constraints || []).filter(function(entry){ return entry.id !== constraintId; });
    Inspector.renderTable(tableId);
    markDirty();
    saveDraft();
  },

  addTrigger: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.triggers = tbl.triggers || [];
    tbl.triggers.push({ id:_uid(), name:'trg_' + tbl.name + '_' + ((tbl.triggers.length || 0) + 1), timing:'BEFORE', event:'UPDATE', function_name:'', when_clause:'' });
    Inspector.renderTable(tableId);
    markDirty();
    saveDraft();
  },

  saveTrigger: function(tableId, triggerId){
    var tbl = findTable(tableId);
    var card;
    var item;
    if(!tbl) return;
    card = refs.inspector.querySelector('[data-trigger-id="' + triggerId + '"]');
    item = (tbl.triggers || []).filter(function(entry){ return entry.id === triggerId; })[0];
    if(!card || !item) return;
    pushUndo();
    item.name = _slug(card.querySelector('[data-field="name"]').value) || item.name;
    item.timing = card.querySelector('[data-field="timing"]').value.trim().toUpperCase() || 'BEFORE';
    item.event = card.querySelector('[data-field="event"]').value.trim().toUpperCase() || 'INSERT';
    item.function_name = card.querySelector('[data-field="function_name"]').value.trim();
    item.when_clause = card.querySelector('[data-field="when_clause"]').value.trim();
    markDirty();
    saveDraft();
    Inspector.renderTable(tableId);
  },

  deleteTrigger: function(tableId, triggerId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    tbl.triggers = (tbl.triggers || []).filter(function(entry){ return entry.id !== triggerId; });
    Inspector.renderTable(tableId);
    markDirty();
    saveDraft();
  },

  renderColumn: function(tableId, colId){
    var tbl = findTable(tableId);
    var col = findCol(tableId, colId);
    if(!tbl || !col || !refs.inspector){
      Inspector.renderEmpty();
      return;
    }
    refs.inspector.innerHTML = [
      '<div class="ss-inspector-header">',
        '<button class="hm-btn hm-btn-ghost ss-back-btn" onclick="Inspector.backToTable(\'' + _esc(tableId) + '\')">&larr; ' + _esc(tbl.name) + '</button>',
        '<div class="ss-col-header-title">' + _esc(col.name) + '</div>',
      '</div>',
      '<div class="ss-inspector-body">',
        Inspector.buildColumnFormHTML(tbl, col),
      '</div>'
    ].join('');
    Inspector.bindColumnFormEvents(tbl, col);
  },

  buildColumnFormHTML: function(tbl, col){
    var relation = relationByColumn(tbl.id, col.id);
    return [
      Inspector.fieldGroup(_t('Ten cot', 'Column name'),
        '<input class="hm-input" id="col-name" value="' + _esc(col.name) + '" />'),
      Inspector.fieldGroup(_t('Kieu du lieu', 'Data type'),
        '<select class="hm-input" id="col-type">' + buildTypeOptions(col.type) + '</select>'),
      '<div id="col-length-row"' + (needsLength(col.type) ? '' : ' style="display:none"') + '>' +
        Inspector.fieldGroup('Length', '<input class="hm-input" id="col-length" type="number" value="' + _esc(col.length == null ? '' : col.length) + '" />') +
      '</div>',
      '<div id="col-scale-row"' + (needsScale(col.type) ? '' : ' style="display:none"') + '>' +
        Inspector.fieldGroup('Scale', '<input class="hm-input" id="col-scale" type="number" value="' + _esc(col.scale == null ? '' : col.scale) + '" />') +
      '</div>',
      '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="col-is-array"' + (col.is_array ? ' checked' : '') + ' /><span>Array []</span></label></div>',
      Inspector.fieldGroup(_t('Gia tri mac dinh', 'Default value'),
        '<input class="hm-input" id="col-default" value="' + _esc(col.default_val || '') + '" placeholder="now() / uuid_generate_v4()" />'),
      Inspector.fieldGroup('Comment',
        '<input class="hm-input" id="col-comment" value="' + _esc(col.comment || '') + '" />'),
      '<div class="ss-constraint-grid">',
        '<label class="ss-toggle-row"><input type="checkbox" id="col-nullable"' + (col.nullable ? ' checked' : '') + ' /><span>NULL</span></label>',
        '<label class="ss-toggle-row"><input type="checkbox" id="col-unique"' + (col.unique ? ' checked' : '') + ' /><span>UNIQUE</span></label>',
        '<label class="ss-toggle-row"><input type="checkbox" id="col-pk"' + (col.primary_key ? ' checked' : '') + ' /><span>PK</span></label>',
      '</div>',
      Inspector.fieldGroup('CHECK', '<input class="hm-input" id="col-check" value="' + _esc(col.check_expr || '') + '" placeholder="value > 0" />'),
      Inspector.fieldGroup(_t('Generated expression', 'Generated expression'),
        '<input class="hm-input" id="col-generated" value="' + _esc(col.generated_expr || '') + '" placeholder="col_a + col_b" />'),
      '<div class="ss-field-group" id="col-generated-opts"' + (col.generated_expr ? '' : ' style="display:none"') + '><label class="ss-toggle-row"><input type="checkbox" id="col-generated-stored"' + (col.generated_stored ? ' checked' : '') + ' /><span>STORED</span></label></div>',
      '<div class="ss-fk-section">',
        relation ? '<div class="ss-field-label">Foreign Key</div><div class="ss-rel-card">' + _esc((findTable(relation.to_table_id) || { name:"?" }).name + "." + ((findCol(relation.to_table_id, relation.to_col_id) || { name:"?" }).name)) + '</div>' + Inspector.fieldGroup('ON DELETE', '<select class="hm-input" id="col-on-delete">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === relation.on_delete ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>') + Inspector.fieldGroup('ON UPDATE', '<select class="hm-input" id="col-on-update">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === relation.on_update ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>') + '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="col-fk-deferrable"' + ((col.foreign_key && col.foreign_key.deferrable) ? ' checked' : '') + ' /><span>DEFERRABLE</span></label></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-ghost" onclick="Inspector.openRelation(\'' + _esc(relation.id) + '\')">' + _esc(_t('Mo relation', 'Open relation')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.removeFK(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Go FK', 'Remove FK')) + '</button></div>' : '<button class="hm-btn hm-btn-secondary" onclick="Connector.openFkWizard(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">+ Foreign Key</button>',
      '</div>',
      '<div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveColumn(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Luu cot', 'Save column')) + '</button><button class="hm-btn hm-btn-danger" onclick="TableCard.deleteColumn(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Xoa cot', 'Delete column')) + '</button></div>'
    ].join('');
  },

  bindColumnFormEvents: function(tbl, col){
    var typeInput = document.getElementById('col-type');
    var generatedInput = document.getElementById('col-generated');
    function sync(){
      var type = typeInput ? typeInput.value : col.type;
      var lengthRow = document.getElementById('col-length-row');
      var scaleRow = document.getElementById('col-scale-row');
      if(lengthRow) lengthRow.style.display = needsLength(type) ? '' : 'none';
      if(scaleRow) scaleRow.style.display = needsScale(type) ? '' : 'none';
    }
    function syncGenerated(){
      var opts = document.getElementById('col-generated-opts');
      if(opts) opts.style.display = generatedInput && generatedInput.value.trim() ? '' : 'none';
    }
    if(typeInput) typeInput.onchange = sync;
    if(generatedInput) generatedInput.oninput = syncGenerated;
    sync();
    syncGenerated();
  },

  saveColumn: function(tableId, colId){
    var col = findCol(tableId, colId);
    var tbl = findTable(tableId);
    var relation = relationByColumn(tableId, colId);
    var nextName;
    if(!col || !tbl) return;
    nextName = _slug(document.getElementById('col-name').value);
    if(!isValidIdentifier(nextName)){
      toast(_t('Ten cot phai la snake_case hop le', 'Column name must be valid snake_case'), 'error');
      return;
    }
    if(isReservedWord(nextName)){
      toast(_t('Ten cot dang trung tu khoa SQL', 'Column name uses a reserved SQL keyword'), 'error');
      return;
    }
    if((tbl.columns || []).some(function(item){ return item.id !== colId && item.name === nextName; })){
      toast(_t('Ten cot da ton tai trong bang', 'Column name already exists in table'), 'error');
      return;
    }
    pushUndo();
    col.name = nextName;
    col.type = document.getElementById('col-type').value;
    col.length = parseInt(document.getElementById('col-length').value || '', 10);
    if(isNaN(col.length)) col.length = null;
    col.scale = parseInt(document.getElementById('col-scale').value || '', 10);
    if(isNaN(col.scale)) col.scale = null;
    col.is_array = !!document.getElementById('col-is-array').checked;
    col.default_val = document.getElementById('col-default').value.trim() || null;
    col.comment = document.getElementById('col-comment').value.trim();
    col.nullable = !!document.getElementById('col-nullable').checked;
    col.unique = !!document.getElementById('col-unique').checked;
    col.primary_key = !!document.getElementById('col-pk').checked;
    col.pk_order = col.primary_key ? (col.pk_order || 1) : null;
    col.check_expr = document.getElementById('col-check').value.trim() || null;
    col.generated_expr = document.getElementById('col-generated').value.trim() || null;
    col.generated_stored = !!document.getElementById('col-generated-stored') && !!document.getElementById('col-generated-stored').checked;
    if(relation && col.foreign_key){
      relation.on_delete = document.getElementById('col-on-delete').value;
      relation.on_update = document.getElementById('col-on-update').value;
      relation.nullable = !!col.nullable;
      col.foreign_key.on_delete = relation.on_delete;
      col.foreign_key.on_update = relation.on_update;
      col.foreign_key.deferrable = !!document.getElementById('col-fk-deferrable').checked;
    }
    TableCard.reRender(tableId);
    VirtualRenderer.scheduleUpdate();
    Browser.render();
    markDirty();
    saveDraft();
    toast(_t('Da luu cot ' + col.name, 'Saved column ' + col.name), 'success');
    Inspector.renderColumn(tableId, colId);
  },

  renderRelation: function(relId){
    var rel = findRelation(relId);
    var fromTbl;
    var fromCol;
    var toTbl;
    var toCol;
    if(!rel || !refs.inspector){
      Inspector.renderEmpty();
      return;
    }
    fromTbl = findTable(rel.from_table_id);
    fromCol = findCol(rel.from_table_id, rel.from_col_id);
    toTbl = findTable(rel.to_table_id);
    toCol = findCol(rel.to_table_id, rel.to_col_id);
    refs.inspector.innerHTML = [
      '<div class="ss-inspector-header">',
        '<button class="hm-btn hm-btn-ghost ss-back-btn" onclick="Inspector.backToTable(\'' + _esc(rel.from_table_id) + '\')">&larr; ' + _esc(fromTbl ? fromTbl.name : 'table') + '</button>',
        '<div class="ss-col-header-title">' + _esc(rel.name || 'relation') + '</div>',
      '</div>',
      '<div class="ss-inspector-body">',
        '<div class="ss-field-group"><div class="ss-field-label">' + _esc(_t('Tu', 'From')) + '</div><div class="ss-rel-card">' + _esc((fromTbl ? fromTbl.name : '?') + '.' + (fromCol ? fromCol.name : '?')) + '</div></div>',
        '<div class="ss-field-group"><div class="ss-field-label">' + _esc(_t('Den', 'To')) + '</div><div class="ss-rel-card">' + _esc((toTbl ? toTbl.name : '?') + '.' + (toCol ? toCol.name : '?')) + '</div></div>',
        Inspector.fieldGroup('Name', '<input class="hm-input" id="rel-name" value="' + _esc(rel.name || '') + '" />'),
        Inspector.fieldGroup('ON DELETE', '<select class="hm-input" id="rel-on-delete">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === rel.on_delete ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>'),
        Inspector.fieldGroup('ON UPDATE', '<select class="hm-input" id="rel-on-update">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === rel.on_update ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>'),
        '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="rel-edge-curved"' + ((rel.edge && rel.edge.type === 'curved') ? ' checked' : '') + ' /><span>' + _esc(_t('Canh cong', 'Curved edge')) + '</span></label></div>',
        '<div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveRelation(\'' + _esc(rel.id) + '\')">' + _esc(_t('Luu relation', 'Save relation')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.removeRelation(\'' + _esc(rel.id) + '\')">' + _esc(_t('Xoa relation', 'Delete relation')) + '</button></div>',
      '</div>'
    ].join('');
  },

  saveRelation: function(relId){
    var rel = findRelation(relId);
    var fromCol;
    if(!rel) return;
    pushUndo();
    rel.name = _slug(document.getElementById('rel-name').value) || rel.name;
    rel.on_delete = document.getElementById('rel-on-delete').value;
    rel.on_update = document.getElementById('rel-on-update').value;
    rel.edge = rel.edge || { type:'orthogonal', waypoints:[] };
    rel.edge.type = document.getElementById('rel-edge-curved').checked ? 'curved' : 'orthogonal';
    fromCol = findCol(rel.from_table_id, rel.from_col_id);
    if(fromCol){
      fromCol.foreign_key = fromCol.foreign_key || {};
      fromCol.foreign_key.ref_table_id = rel.to_table_id;
      fromCol.foreign_key.ref_col_id = rel.to_col_id;
      fromCol.foreign_key.on_delete = rel.on_delete;
      fromCol.foreign_key.on_update = rel.on_update;
      fromCol.foreign_key.constraint_name = rel.name;
    }
    TableCard.reRender(rel.from_table_id);
    VirtualRenderer.scheduleUpdate();
    markDirty();
    saveDraft();
    toast(_t('Da luu relation', 'Relation saved'), 'success');
  },

  removeFK: function(tableId, colId){
    var rel = relationByColumn(tableId, colId);
    var col;
    if(!rel){
      col = findCol(tableId, colId);
      if(col) col.foreign_key = null;
      TableCard.reRender(tableId);
      markDirty();
      saveDraft();
      Inspector.renderColumn(tableId, colId);
      return;
    }
    Inspector.removeRelation(rel.id);
  },

  removeRelation: function(relId){
    var rel = findRelation(relId);
    var fromCol;
    if(!rel) return;
    pushUndo();
    fromCol = findCol(rel.from_table_id, rel.from_col_id);
    if(fromCol) fromCol.foreign_key = null;
    STORE.schema.relations = (STORE.schema.relations || []).filter(function(item){ return item.id !== relId; });
    TableCard.reRender(rel.from_table_id);
    VirtualRenderer.scheduleUpdate();
    Browser.render();
    markDirty();
    saveDraft();
    Inspector.backToTable(rel.from_table_id);
  },

  fieldGroup: function(label, content){
    return '<div class="ss-field-group">' + (label ? '<div class="ss-field-label">' + _esc(label) + '</div>' : '') + content + '</div>';
  },

  colorValue: function(value){
    var raw = String(value || '').trim();
    if(/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    return '#1565c0';
  }
};

function relationByColumn(tableId, colId){
  return ((STORE.schema && STORE.schema.relations) || []).filter(function(rel){
    return rel.from_table_id === tableId && rel.from_col_id === colId;
  })[0] || null;
}

function formatDomainLabel(domain){
  var acronyms = {
    ai: 'AI',
    ap: 'AP',
    apqp: 'APQP',
    ar: 'AR',
    bi: 'BI',
    cnc: 'CNC',
    crm: 'CRM',
    ehs: 'EHS',
    erp: 'ERP',
    fmea: 'FMEA',
    hcm: 'HCM',
    hr: 'HR',
    mes: 'MES',
    ncc: 'NCC',
    plm: 'PLM',
    ppap: 'PPAP',
    qms: 'QMS',
    rls: 'RLS',
    spc: 'SPC',
    sql: 'SQL',
    ui: 'UI',
    ux: 'UX'
  };
  return String(domain || 'default').split('_').map(function(part){
    var key = String(part || '').toLowerCase();
    if(acronyms[key]) return acronyms[key];
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : '';
  }).join(' ');
}

function modeLabel(mode){
  if(mode === 'code') return _t('Mã', 'Code');
  if(mode === 'validate') return _t('Kiểm tra', 'Validate');
  return _t('Sơ đồ', 'Canvas');
}

var BrowserLegacy = {
  getVisibleTables: function(){
    var tables = typeof Browser !== 'undefined' && Browser.getCanvasTables ? Browser.getCanvasTables() : ((STORE.schema && STORE.schema.tables) || []);
    var filter = String(STORE.browser.filter || '').trim().toLowerCase();
    if(!filter) return tables.slice();
    return tables.filter(function(tbl){
      if(String(tbl.name || '').toLowerCase().indexOf(filter) >= 0) return true;
      if(String(tbl.domain || '').toLowerCase().indexOf(filter) >= 0) return true;
      if(String(tbl.comment || '').toLowerCase().indexOf(filter) >= 0) return true;
      return (tbl.columns || []).some(function(col){
        return String(col.name || '').toLowerCase().indexOf(filter) >= 0 || String(col.comment || '').toLowerCase().indexOf(filter) >= 0;
      });
    });
  },

  groupTables: function(tables){
    var groups = {};
    (tables || []).forEach(function(tbl){
      var domain = tbl.domain || 'default';
      if(!groups[domain]) groups[domain] = [];
      groups[domain].push(tbl);
    });
    return groups;
  },

  toggleOpen: function(forceState){
    STORE.browser.open = typeof forceState === 'boolean' ? forceState : !STORE.browser.open;
    saveUiPrefs();
    if(refs.root){
      refs.root.classList.toggle('browser-collapsed', !STORE.browser.open);
    }
    if(refs.toolbar){
      renderToolbar(refs.toolbar);
    }
    Browser.render();
    if(isActivePage()){
      setTimeout(function(){
        Canvas.applyTransform();
        if(window.VirtualRenderer && typeof VirtualRenderer.scheduleUpdate === 'function'){
          VirtualRenderer.scheduleUpdate();
        }
      }, 120);
    }
  },

  expandAll: function(){
    var groups = Browser.groupTables((STORE.schema && STORE.schema.tables) || []);
    Object.keys(groups).forEach(function(domain){
      STORE.browser.expandedDomains[domain] = true;
    });
    saveUiPrefs();
    Browser.render();
  },

  collapseAll: function(){
    var groups = Browser.groupTables((STORE.schema && STORE.schema.tables) || []);
    Object.keys(groups).forEach(function(domain){
      STORE.browser.expandedDomains[domain] = false;
    });
    saveUiPrefs();
    Browser.render();
  },

  render: function(){
    var tables;
    var filtered;
    var groups;
    var domains;
    var filter;
    var filterActive;
    if(!refs.browser) return;
    tables = (STORE.schema && STORE.schema.tables) || [];
    filtered = Browser.getVisibleTables();
    groups = Browser.groupTables(filtered);
    domains = Object.keys(groups).sort();
    filter = String(STORE.browser.filter || '').trim();
    filterActive = !!filter;
    if(!STORE.browser.open){
      refs.browser.innerHTML = [
        '<div class="ss-browser-collapsed-shell">',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở thanh điều hướng (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở thanh điều hướng', 'Open schema browser')) + '">▸</button>',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.expandAll(); Browser.toggleOpen(true)" title="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '" aria-label="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '">＋</button>',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.collapseAll(); Browser.toggleOpen(true)" title="' + _esc(_t('Thu gọn tất cả domain', 'Collapse all domains')) + '" aria-label="' + _esc(_t('Thu gọn tất cả domain', 'Collapse all domains')) + '">－</button>',
          '<div class="ss-browser-rail-stats"><strong>' + String(tables.length) + '</strong><span>' + _esc(_t('bảng', 'tables')) + '</span></div>',
        '</div>'
      ].join('');
      return;
    }
    refs.browser.innerHTML = [
      '<div class="ss-browser-header">',
        '<div class="ss-browser-title-group"><div class="ss-browser-title">' + _esc(_t('Trình duyệt schema', 'Schema browser')) + '</div><div class="ss-browser-subtitle">' + String(tables.length) + ' ' + _esc(_t('bảng', 'tables')) + ' · ' + String(domains.length) + ' ' + _esc(_t('domain', 'domains')) + '</div></div>',
        '<div class="ss-browser-tools">',
          '<button class="ss-browser-tool" type="button" onclick="Browser.expandAll()" title="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '" aria-label="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '">＋</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.collapseAll()" title="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '" aria-label="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '">－</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.toggleOpen(false)" title="' + _esc(_t('Ẩn thanh điều hướng (B)', 'Hide schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn thanh điều hướng', 'Hide schema browser')) + '">◂</button>',
        '</div>',
      '</div>',
      '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /><div class="ss-browser-search-meta">' + _esc(filterActive ? (_t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')) : _t('Nhấp đúp vào bảng để đưa vào giữa màn hình', 'Double-click a table to focus it on canvas')) + '</div></div>',
      '<div class="ss-browser-list">',
        domains.length ? domains.map(function(domain){
          var expanded = filterActive ? true : STORE.browser.expandedDomains[domain] !== false;
          return [
            '<div class="ss-domain-group" data-domain="' + _esc(domain) + '">',
              '<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">',
                '<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>',
                '<span class="ss-domain-name">' + _esc(formatDomainLabel(domain)) + '</span>',
                '<span class="ss-domain-count">' + String(groups[domain].length) + '</span>',
              '</div>',
              expanded ? '<div class="ss-domain-tables">' + groups[domain].map(function(tbl){
                var active = STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === tbl.id; });
                var fkCount = ((STORE.schema && STORE.schema.relations) || []).filter(function(rel){
                  return rel.from_table_id === tbl.id || rel.to_table_id === tbl.id;
                }).length;
                return '<div class="ss-table-item' + (active ? ' active' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
              }).join('') + '</div>' : '',
            '</div>'
          ].join('');
        }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có bảng nào', 'No tables yet')) + '</div></div>',
      '</div>',
      '<div class="ss-browser-footer"><span>' + String(tables.length) + ' ' + _esc(_t('bảng', 'tables')) + '</span><span>&middot;</span><span>' + String(domains.length) + ' ' + _esc(_t('domain', 'domains')) + '</span><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="TableCard.createNew(100,100)">+ ' + _esc(_t('Tạo bảng', 'New table')) + '</button></div>'
    ].join('');
  },

  onFilter: function(value){
    var activeInput = document.activeElement;
    var keepFocus = !!(activeInput && activeInput.classList && activeInput.classList.contains('ss-browser-search'));
    var selStart = keepFocus && typeof activeInput.selectionStart === 'number' ? activeInput.selectionStart : null;
    var selEnd = keepFocus && typeof activeInput.selectionEnd === 'number' ? activeInput.selectionEnd : selStart;
    STORE.browser.filter = value || '';
    Browser.render();
    if(keepFocus && refs.browser){
      var nextInput = refs.browser.querySelector('.ss-browser-search');
      if(nextInput){
        nextInput.focus();
        if(selStart !== null && typeof nextInput.setSelectionRange === 'function'){
          nextInput.setSelectionRange(selStart, selEnd);
        }
      }
    }
  },

  toggleDomain: function(domain){
    STORE.browser.expandedDomains[domain] = STORE.browser.expandedDomains[domain] === false ? true : false;
    saveUiPrefs();
    Browser.render();
  },

  selectTable: function(tableId){
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    Browser.render();
  },

  focusTable: function(tableId){
    var tbl = findTable(tableId);
    var el;
    if(!tbl || !refs.canvasWrap) return;
    STORE.canvas.zoom = Math.min(1.35, Math.max(STORE.canvas.zoom, 0.9));
    STORE.canvas.panX = (refs.canvasWrap.clientWidth / 2) - ((tbl.canvas.x + ((tbl.canvas.width || TABLE_DEFAULT_WIDTH) / 2)) * STORE.canvas.zoom);
    STORE.canvas.panY = (refs.canvasWrap.clientHeight / 2) - ((tbl.canvas.y + (getTableHeight(tbl) / 2)) * STORE.canvas.zoom);
    Canvas.applyTransform();
    VirtualRenderer.update();
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    el = document.getElementById('tc_' + tableId);
    if(el){
      el.classList.add('ss-highlight-pulse');
      setTimeout(function(){ el.classList.remove('ss-highlight-pulse'); }, 1000);
    }
  }
};

var Browser = {
  getAllTables: function(){
    return (STORE.schema && STORE.schema.tables) || [];
  },

  isDomainHidden: function(domain){
    var key = domain || 'default';
    if(STORE.browser.isolatedDomain){
      return STORE.browser.isolatedDomain !== key;
    }
    return STORE.browser.hiddenDomains[key] === true;
  },

  isDomainVisible: function(domain){
    return !Browser.isDomainHidden(domain);
  },

  isTableVisible: function(tbl){
    return !!(tbl && Browser.isDomainVisible(tbl.domain || 'default'));
  },

  getCanvasTables: function(){
    return Browser.getAllTables().filter(function(tbl){
      return Browser.isTableVisible(tbl);
    });
  },

  getVisibleTables: function(){
    var tables = Browser.getAllTables();
    var filter = String(STORE.browser.filter || '').trim().toLowerCase();
    if(!filter) return tables.slice();
    return tables.filter(function(tbl){
      if(String(tbl.name || '').toLowerCase().indexOf(filter) >= 0) return true;
      if(String(tbl.domain || '').toLowerCase().indexOf(filter) >= 0) return true;
      if(String(tbl.comment || '').toLowerCase().indexOf(filter) >= 0) return true;
      return (tbl.columns || []).some(function(col){
        return String(col.name || '').toLowerCase().indexOf(filter) >= 0 || String(col.comment || '').toLowerCase().indexOf(filter) >= 0;
      });
    });
  },

  groupTables: function(tables){
    var groups = {};
    (tables || []).forEach(function(tbl){
      var domain = tbl.domain || 'default';
      if(!groups[domain]) groups[domain] = [];
      groups[domain].push(tbl);
    });
    return groups;
  },

  getDomainStats: function(){
    var groups = Browser.groupTables(Browser.getAllTables());
    var domains = Object.keys(groups);
    var visibleTables = Browser.getCanvasTables();
    var visibleDomains = domains.filter(function(domain){
      return Browser.isDomainVisible(domain);
    });
    return {
      totalTables: Browser.getAllTables().length,
      visibleTables: visibleTables.length,
      hiddenTables: Math.max(Browser.getAllTables().length - visibleTables.length, 0),
      totalDomains: domains.length,
      visibleDomains: visibleDomains.length,
      hiddenDomains: Math.max(domains.length - visibleDomains.length, 0)
    };
  },

  syncSelectionToVisibility: function(){
    STORE.canvas.selection = (STORE.canvas.selection || []).filter(function(item){
      var rel;
      var tbl;
      if(item.kind === 'table'){
        tbl = findTable(item.id);
        return Browser.isTableVisible(tbl);
      }
      if(item.kind === 'edge'){
        rel = findRelation(item.id);
        return !!(rel && Browser.isTableVisible(findTable(rel.from_table_id)) && Browser.isTableVisible(findTable(rel.to_table_id)));
      }
      return true;
    });
    if(STORE.inspector.target){
      if(STORE.inspector.target.kind === 'table' && !Browser.isTableVisible(findTable(STORE.inspector.target.tableId))){
        STORE.inspector.target = null;
      }
      if(STORE.inspector.target && STORE.inspector.target.kind === 'column' && !Browser.isTableVisible(findTable(STORE.inspector.target.tableId))){
        STORE.inspector.target = null;
      }
      if(STORE.inspector.target && STORE.inspector.target.kind === 'relation'){
        var rel = findRelation(STORE.inspector.target.relId);
        if(!rel || !Browser.isTableVisible(findTable(rel.from_table_id)) || !Browser.isTableVisible(findTable(rel.to_table_id))){
          STORE.inspector.target = null;
        }
      }
    }
  },

  refreshVisibility: function(options){
    saveUiPrefs();
    Browser.syncSelectionToVisibility();
    Browser.render();
    if(refs.inspector){
      if(STORE.inspector.target){
        Inspector.render();
      }else{
        Inspector.renderEmpty();
      }
    }
    if(refs.tablesLayer){
      VirtualRenderer.reset();
    }else if(refs.canvasWrap){
      Canvas.render();
    }
    if(options && options.zoomToFit){
      setTimeout(function(){ Canvas.zoomToFit(); }, 90);
    }else{
      Canvas.updateMinimap();
    }
  },

  toggleOpen: function(forceState){
    STORE.browser.open = typeof forceState === 'boolean' ? forceState : !STORE.browser.open;
    saveUiPrefs();
    if(refs.root){
      refs.root.classList.toggle('browser-collapsed', !STORE.browser.open);
    }
    if(refs.toolbar){
      renderToolbar(refs.toolbar);
    }
    Browser.render();
    if(isActivePage()){
      setTimeout(function(){
        Canvas.applyTransform();
        if(window.VirtualRenderer && typeof VirtualRenderer.scheduleUpdate === 'function'){
          VirtualRenderer.scheduleUpdate();
        }
      }, 120);
    }
  },

  setDomainVisible: function(domain, visible, options){
    var key = domain || 'default';
    if(visible){
      delete STORE.browser.hiddenDomains[key];
    }else{
      STORE.browser.hiddenDomains[key] = true;
      if(STORE.browser.isolatedDomain === key){
        STORE.browser.isolatedDomain = '';
      }
    }
    Browser.refreshVisibility(options);
  },

  toggleDomainVisibility: function(domain, ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
    }
    Browser.setDomainVisible(domain, Browser.isDomainHidden(domain), null);
  },

  isolateDomain: function(domain, ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
    }
    STORE.browser.isolatedDomain = STORE.browser.isolatedDomain === domain ? '' : domain;
    if(STORE.browser.isolatedDomain){
      delete STORE.browser.hiddenDomains[domain];
      STORE.browser.expandedDomains[domain] = true;
    }
    Browser.refreshVisibility({ zoomToFit:true });
  },

  showAllDomains: function(ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
    }
    STORE.browser.hiddenDomains = {};
    STORE.browser.isolatedDomain = '';
    Browser.refreshVisibility({ zoomToFit:true });
  },

  ensureDomainVisible: function(domain){
    var key = domain || 'default';
    var changed = false;
    if(STORE.browser.isolatedDomain && STORE.browser.isolatedDomain !== key){
      STORE.browser.isolatedDomain = '';
      changed = true;
    }
    if(STORE.browser.hiddenDomains[key]){
      delete STORE.browser.hiddenDomains[key];
      changed = true;
    }
    if(STORE.browser.expandedDomains[key] === false){
      changed = true;
    }
    STORE.browser.expandedDomains[key] = true;
    if(changed){
      saveUiPrefs();
      Browser.render();
      if(refs.tablesLayer){
        VirtualRenderer.reset();
      }
    }
  },

  expandAll: function(){
    var groups = Browser.groupTables(Browser.getAllTables());
    Object.keys(groups).forEach(function(domain){
      STORE.browser.expandedDomains[domain] = true;
    });
    saveUiPrefs();
    Browser.render();
  },

  collapseAll: function(){
    var groups = Browser.groupTables(Browser.getAllTables());
    Object.keys(groups).forEach(function(domain){
      STORE.browser.expandedDomains[domain] = false;
    });
    saveUiPrefs();
    Browser.render();
  },

  render: function(){
    var tables;
    var filtered;
    var allGroups;
    var filteredGroups;
    var domains;
    var filter;
    var filterActive;
    var stats;
    if(!refs.browser) return;
    tables = Browser.getAllTables();
    filtered = Browser.getVisibleTables();
    allGroups = Browser.groupTables(tables);
    filteredGroups = Browser.groupTables(filtered);
    domains = Object.keys(allGroups).sort();
    filter = String(STORE.browser.filter || '').trim();
    filterActive = !!filter;
    stats = Browser.getDomainStats();
    if(!STORE.browser.open){
      refs.browser.innerHTML = [
        '<div class="ss-browser-collapsed-shell">',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">▸</button>',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.showAllDomains(); Browser.toggleOpen(true)" title="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '" aria-label="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '">◌</button>',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.expandAll(); Browser.toggleOpen(true)" title="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '" aria-label="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '">+</button>',
          '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
        '</div>'
      ].join('');
      return;
    }
    refs.browser.innerHTML = [
      '<div class="ss-browser-header">',
        '<div class="ss-browser-title-group"><div class="ss-browser-title">' + _esc(_t('Trình duyệt schema', 'Schema browser')) + '</div><div class="ss-browser-subtitle">' + String(stats.visibleTables) + '/' + String(stats.totalTables) + ' ' + _esc(_t('bảng đang hiện', 'tables visible')) + ' · ' + String(stats.visibleDomains) + '/' + String(stats.totalDomains) + ' ' + _esc(_t('domain', 'domains')) + '</div></div>',
        '<div class="ss-browser-tools">',
          '<button class="ss-browser-tool" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '" aria-label="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '">◌</button>',
          '<button class="ss-browser-tool" type="button" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible tables to save space')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">⤢</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.expandAll()" title="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '" aria-label="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '">+</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.collapseAll()" title="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '" aria-label="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '">−</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.toggleOpen(false)" title="' + _esc(_t('Ẩn trình duyệt schema (B)', 'Hide schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn trình duyệt schema', 'Hide schema browser')) + '">◂</button>',
        '</div>',
      '</div>',
      '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /><div class="ss-browser-search-meta">' + _esc(filterActive ? (_t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')) : _t('Nhấp đúp vào bảng để đưa vào giữa màn hình', 'Double-click a table to focus it on canvas')) + '</div><div class="ss-domain-chip-strip"><button class="ss-domain-chip ss-domain-chip-reset' + (!stats.hiddenDomains && !STORE.browser.isolatedDomain ? ' active' : '') + '" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện toàn bộ domain', 'Show every domain')) + '"><span class="ss-domain-chip-label">' + _esc(_t('Tất cả', 'All')) + '</span><strong>' + String(stats.totalDomains) + '</strong></button>' + domains.map(function(domain){ var totalCount = (allGroups[domain] || []).length; var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(_t('Bấm để chỉ hiện domain này', 'Click to isolate this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div></div>',
      '<div class="ss-browser-list">',
        domains.length ? domains.filter(function(domain){
          return !filterActive || ((filteredGroups[domain] || []).length > 0);
        }).map(function(domain){
          var hidden = Browser.isDomainHidden(domain);
          var isolated = STORE.browser.isolatedDomain === domain;
          var totalCount = (allGroups[domain] || []).length;
          var tablesForDomain = filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || []);
          var expanded = hidden ? false : (filterActive ? true : STORE.browser.expandedDomains[domain] !== false);
          return [
            '<div class="ss-domain-group' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" data-domain="' + _esc(domain) + '">',
              '<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">',
                '<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>',
                '<span class="ss-domain-name">' + _esc(formatDomainLabel(domain)) + '</span>',
                hidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '',
                '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(isolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(isolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(domain) + '\', event)" title="' + _esc(hidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(hidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div>',
                '<span class="ss-domain-count">' + String(filterActive ? tablesForDomain.length : totalCount) + '</span>',
              '</div>',
              expanded ? '<div class="ss-domain-tables">' + tablesForDomain.map(function(tbl){
                var active = STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === tbl.id; });
                var fkCount = ((STORE.schema && STORE.schema.relations) || []).filter(function(rel){
                  return rel.from_table_id === tbl.id || rel.to_table_id === tbl.id;
                }).length;
                return '<div class="ss-table-item' + (active ? ' active' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
              }).join('') + '</div>' : (hidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : ''),
            '</div>'
          ].join('');
        }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có bảng nào', 'No tables yet')) + '</div></div>',
      '</div>',
      '<div class="ss-browser-footer"><div class="ss-browser-footer-meta"><span>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + ' ' + _esc(_t('bảng', 'tables')) + '</span><span>&middot;</span><span>' + String(stats.hiddenDomains) + ' ' + _esc(_t('domain đang ẩn', 'hidden domains')) + '</span></div><div class="ss-browser-footer-actions"><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Browser.showAllDomains()">' + _esc(_t('Hiện tất cả', 'Show all')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="TableCard.createNew(100,100)">+ ' + _esc(_t('Tạo bảng', 'New table')) + '</button></div></div>'
    ].join('');
  },

  onFilter: function(value){
    var activeInput = document.activeElement;
    var keepFocus = !!(activeInput && activeInput.classList && activeInput.classList.contains('ss-browser-search'));
    var selStart = keepFocus && typeof activeInput.selectionStart === 'number' ? activeInput.selectionStart : null;
    var selEnd = keepFocus && typeof activeInput.selectionEnd === 'number' ? activeInput.selectionEnd : selStart;
    STORE.browser.filter = value || '';
    Browser.render();
    if(keepFocus && refs.browser){
      var nextInput = refs.browser.querySelector('.ss-browser-search');
      if(nextInput){
        nextInput.focus();
        if(selStart !== null && typeof nextInput.setSelectionRange === 'function'){
          nextInput.setSelectionRange(selStart, selEnd);
        }
      }
    }
  },

  toggleDomain: function(domain){
    STORE.browser.expandedDomains[domain] = STORE.browser.expandedDomains[domain] === false ? true : false;
    saveUiPrefs();
    Browser.render();
  },

  selectTable: function(tableId){
    var tbl = findTable(tableId);
    if(tbl) Browser.ensureDomainVisible(tbl.domain || 'default');
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    Browser.render();
  },

  focusTable: function(tableId){
    var tbl = findTable(tableId);
    var el;
    if(!tbl || !refs.canvasWrap) return;
    Browser.ensureDomainVisible(tbl.domain || 'default');
    STORE.canvas.zoom = Math.min(1.35, Math.max(STORE.canvas.zoom, 0.9));
    STORE.canvas.panX = (refs.canvasWrap.clientWidth / 2) - ((tbl.canvas.x + ((tbl.canvas.width || TABLE_DEFAULT_WIDTH) / 2)) * STORE.canvas.zoom);
    STORE.canvas.panY = (refs.canvasWrap.clientHeight / 2) - ((tbl.canvas.y + (getTableHeight(tbl) / 2)) * STORE.canvas.zoom);
    Canvas.applyTransform();
    VirtualRenderer.update();
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    el = document.getElementById('tc_' + tableId);
    if(el){
      el.classList.add('ss-highlight-pulse');
      setTimeout(function(){ el.classList.remove('ss-highlight-pulse'); }, 1000);
    }
  }
};

Browser.getSelectedTables = function(){
  return (STORE.canvas.selection || []).filter(function(item){
    return item.kind === 'table';
  }).map(function(item){
    return findTable(item.id);
  }).filter(Boolean);
};

Browser.setView = function(view){
  var nextView = view === 'tables' ? 'tables' : 'domains';
  if(STORE.browser.view === nextView){
    if(refs.toolbar) renderToolbar(refs.toolbar);
    if(refs.browser) Browser.render();
    return;
  }
  STORE.browser.view = nextView;
  saveUiPrefs();
  if(refs.toolbar) renderToolbar(refs.toolbar);
  Browser.render();
};

Browser.focusSelectedDomain = function(){
  var selected = Browser.getSelectedTables()[0];
  if(!selected){
    toast(_t('Hãy chọn một bảng trước', 'Select a table first'), 'info');
    return;
  }
  Browser.setView('domains');
  Browser.isolateDomain(selected.domain || 'default');
};

Browser.focusNeighborhood = function(){
  var selectedTables = Browser.getSelectedTables();
  var selectedIds = {};
  var allowedDomains = {};
  var allGroups;
  if(!selectedTables.length){
    toast(_t('Hãy chọn ít nhất một bảng', 'Select at least one table'), 'info');
    return;
  }
  selectedTables.forEach(function(tbl){
    selectedIds[tbl.id] = true;
    allowedDomains[tbl.domain || 'default'] = true;
  });
  ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
    if(!selectedIds[rel.from_table_id] && !selectedIds[rel.to_table_id]) return;
    var fromTable = findTable(rel.from_table_id);
    var toTable = findTable(rel.to_table_id);
    if(fromTable) allowedDomains[fromTable.domain || 'default'] = true;
    if(toTable) allowedDomains[toTable.domain || 'default'] = true;
  });
  allGroups = Browser.groupTables(Browser.getAllTables());
  STORE.browser.isolatedDomain = '';
  STORE.browser.hiddenDomains = {};
  Object.keys(allGroups).forEach(function(domain){
    if(!allowedDomains[domain]){
      STORE.browser.hiddenDomains[domain] = true;
    }
  });
  Browser.refreshVisibility({ zoomToFit:true });
  Browser.setView('domains');
};

Browser.render = function(){
  var tables;
  var filtered;
  var allGroups;
  var filteredGroups;
  var domains;
  var filter;
  var filterActive;
  var stats;
  var sortedTables;
  var selectedTableMap = {};
  var relatedCountMap = {};
  var searchMeta;
  if(!refs.browser) return;
  tables = Browser.getAllTables();
  filtered = Browser.getVisibleTables();
  allGroups = Browser.groupTables(tables);
  filteredGroups = Browser.groupTables(filtered);
  domains = Object.keys(allGroups).sort(function(a, b){
    return formatDomainLabel(a).localeCompare(formatDomainLabel(b));
  });
  filter = String(STORE.browser.filter || '').trim();
  filterActive = !!filter;
  stats = Browser.getDomainStats();
  Browser.getSelectedTables().forEach(function(tbl){
    selectedTableMap[tbl.id] = true;
  });
  ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
    relatedCountMap[rel.from_table_id] = (relatedCountMap[rel.from_table_id] || 0) + 1;
    relatedCountMap[rel.to_table_id] = (relatedCountMap[rel.to_table_id] || 0) + 1;
  });
  sortedTables = filtered.slice().sort(function(a, b){
    var aSelected = selectedTableMap[a.id] ? 0 : 1;
    var bSelected = selectedTableMap[b.id] ? 0 : 1;
    var domainCompare;
    if(aSelected !== bSelected) return aSelected - bSelected;
    domainCompare = formatDomainLabel(a.domain || 'default').localeCompare(formatDomainLabel(b.domain || 'default'));
    if(domainCompare !== 0) return domainCompare;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  searchMeta = filterActive
    ? _t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')
    : (STORE.browser.view === 'tables'
      ? _t('Nhấp để chọn, nhấp đúp để đưa bảng vào giữa màn hình', 'Click to select, double-click to focus a table')
      : _t('Nhấp đúp vào bảng để đưa vào giữa màn hình', 'Double-click a table to focus it on canvas'));
  if(!STORE.browser.open){
    refs.browser.innerHTML = [
      '<div class="ss-browser-collapsed-shell">',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">▸</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'domains\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '" aria-label="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '">◎</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'tables\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '" aria-label="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '">≣</button>',
        '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
      '</div>'
    ].join('');
    return;
  }
  refs.browser.innerHTML = [
    '<div class="ss-browser-header">',
      '<div class="ss-browser-header-top">',
        '<div class="ss-browser-title-group"><div class="ss-browser-title">' + _esc(_t('Trình duyệt schema', 'Schema browser')) + '</div><div class="ss-browser-subtitle">' + _esc(_t('Điều hướng nhanh, lọc gọn và tập trung đúng phần đang làm', 'Fast navigation, tighter filtering, and focused workspace')) + '</div></div>',
        '<div class="ss-browser-tools">',
          '<button class="ss-browser-tool" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '" aria-label="' + _esc(_t('Hiện tất cả domain', 'Show all domains')) + '">◌</button>',
          '<button class="ss-browser-tool" type="button" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible tables to save space')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">⤢</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus the neighborhood of the selected table')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus neighborhood')) + '">⌘</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.toggleOpen(false)" title="' + _esc(_t('Ẩn trình duyệt schema (B)', 'Hide schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn trình duyệt schema', 'Hide schema browser')) + '">◂</button>',
        '</div>',
      '</div>',
      '<div class="ss-browser-summary"><span class="ss-browser-summary-pill"><strong>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + '</strong><span>' + _esc(_t('bảng đang hiện', 'tables visible')) + '</span></span><span class="ss-browser-summary-pill"><strong>' + String(stats.visibleDomains) + '/' + String(stats.totalDomains) + '</strong><span>' + _esc(_t('domain', 'domains')) + '</span></span><span class="ss-browser-summary-pill"><strong>' + String(stats.hiddenDomains) + '</strong><span>' + _esc(_t('domain đang ẩn', 'hidden domains')) + '</span></span></div>',
    '</div>',
    '<div class="ss-browser-search-wrap"><div class="ss-browser-tabs"><button class="ss-browser-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" type="button" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-browser-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" type="button" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /><div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>' + (STORE.browser.view === 'domains' ? '<div class="ss-domain-chip-strip"><button class="ss-domain-chip ss-domain-chip-reset' + (!stats.hiddenDomains && !STORE.browser.isolatedDomain ? ' active' : '') + '" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện toàn bộ domain', 'Show every domain')) + '"><span class="ss-domain-chip-label">' + _esc(_t('Tất cả', 'All')) + '</span><strong>' + String(stats.totalDomains) + '</strong></button>' + domains.map(function(domain){ var totalCount = (allGroups[domain] || []).length; var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(_t('Bấm để chỉ hiện domain này', 'Click to isolate this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div>' : '') + '</div>',
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var hidden = Browser.isDomainHidden(tbl.domain || 'default'); var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (domains.length ? domains.filter(function(domain){ return !filterActive || ((filteredGroups[domain] || []).length > 0); }).map(function(domain){ var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; var totalCount = (allGroups[domain] || []).length; var tablesForDomain = filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || []); var expanded = hidden ? false : (filterActive ? true : STORE.browser.expandedDomains[domain] !== false); return ['<div class="ss-domain-group' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" data-domain="' + _esc(domain) + '">','<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">','<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>','<span class="ss-domain-name">' + _esc(formatDomainLabel(domain)) + '</span>', hidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '','<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(isolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(isolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(domain) + '\', event)" title="' + _esc(hidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(hidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div>','<span class="ss-domain-count">' + String(filterActive ? tablesForDomain.length : totalCount) + '</span>','</div>', expanded ? '<div class="ss-domain-tables">' + tablesForDomain.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item' + (active ? ' active' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : (hidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : ''),'</div>'].join(''); }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có bảng nào', 'No tables yet')) + '</div></div>')) + '</div>',
    '<div class="ss-browser-footer"><div class="ss-browser-footer-meta"><span>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + ' ' + _esc(_t('bảng', 'tables')) + '</span><span>&middot;</span><span>' + String(stats.hiddenDomains) + ' ' + _esc(_t('domain đang ẩn', 'hidden domains')) + '</span></div><div class="ss-browser-footer-actions"><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Browser.showAllDomains()">' + _esc(_t('Hiện tất cả', 'Show all')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Browser.focusSelectedDomain()">' + _esc(_t('Domain của bảng chọn', 'Selected table domain')) + '</button></div></div>'
  ].join('');
};

Browser.onFilter = function(value){
  var activeInput = document.activeElement;
  var keepFocus = !!(activeInput && activeInput.classList && activeInput.classList.contains('ss-browser-search'));
  var selStart = keepFocus && typeof activeInput.selectionStart === 'number' ? activeInput.selectionStart : null;
  var selEnd = keepFocus && typeof activeInput.selectionEnd === 'number' ? activeInput.selectionEnd : selStart;
  STORE.browser.filter = value || '';
  Browser.render();
  if(keepFocus && refs.browser){
    var nextInput = refs.browser.querySelector('.ss-browser-search');
    if(nextInput){
      nextInput.focus();
      if(selStart !== null && typeof nextInput.setSelectionRange === 'function'){
        nextInput.setSelectionRange(selStart, selEnd);
      }
    }
  }
};

function renderToolbar(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span>' + _esc(_t('Trình duyệt', 'Browser')) + '</button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

var CodeGen = {
  tableSql: function(tbl, schema){
    var lines = [];
    var defs = [];
    var pkCols;
    if(tbl.comment){
      lines.push('-- ' + tbl.comment);
    }
    lines.push('CREATE TABLE ' + getSchemaQualifiedName(tbl) + ' (');
    (tbl.columns || []).forEach(function(col){
      var def = '    ' + col.name + ' ' + fmtColType(col);
      if(col.primary_key && (tbl.columns || []).filter(function(item){ return item.primary_key; }).length === 1){
        def += ' PRIMARY KEY';
      }
      if(!col.nullable) def += ' NOT NULL';
      if(col.unique && !col.primary_key) def += ' UNIQUE';
      if(col.default_val) def += ' DEFAULT ' + col.default_val;
      if(col.check_expr) def += ' CHECK (' + col.check_expr + ')';
      if(col.generated_expr){
        def += ' GENERATED ALWAYS AS (' + col.generated_expr + ')';
        if(col.generated_stored) def += ' STORED';
      }
      defs.push(def);
    });
    pkCols = (tbl.columns || []).filter(function(col){ return col.primary_key; }).sort(function(a, b){
      return (a.pk_order || 0) - (b.pk_order || 0);
    });
    if(pkCols.length > 1){
      defs.push('    PRIMARY KEY (' + pkCols.map(function(col){ return col.name; }).join(', ') + ')');
    }
    (tbl.check_constraints || []).forEach(function(item){
      defs.push('    CONSTRAINT ' + item.name + ' CHECK (' + item.expression + ')');
    });
    (tbl.columns || []).forEach(function(col){
      var fk = col.foreign_key;
      var refTbl;
      var refCol;
      var line;
      if(!fk) return;
      refTbl = findTableInSchema(schema || STORE.schema, fk.ref_table_id);
      refCol = findColInSchema(schema || STORE.schema, fk.ref_table_id, fk.ref_col_id);
      if(!refTbl || !refCol) return;
      line = '    CONSTRAINT ' + (fk.constraint_name || ('fk_' + tbl.name + '_' + col.name)) + ' FOREIGN KEY (' + col.name + ') REFERENCES ' + getSchemaQualifiedName(refTbl) + '(' + refCol.name + ')';
      if(fk.on_delete && fk.on_delete !== 'NO ACTION') line += ' ON DELETE ' + fk.on_delete;
      if(fk.on_update && fk.on_update !== 'NO ACTION') line += ' ON UPDATE ' + fk.on_update;
      if(fk.deferrable) line += ' DEFERRABLE INITIALLY DEFERRED';
      defs.push(line);
    });
    lines.push(defs.join(',\n'));
    lines.push(');');
    (tbl.indexes || []).forEach(function(idx){
      var sql = 'CREATE ' + (idx.unique ? 'UNIQUE ' : '') + 'INDEX ' + idx.name + ' ON ' + getSchemaQualifiedName(tbl) + ' USING ' + (idx.type || 'BTREE') + ' (' + (idx.columns || []).map(function(col){
        return col.name + (col.order === 'DESC' ? ' DESC' : '');
      }).join(', ') + ')';
      if(idx.where) sql += ' WHERE ' + idx.where;
      sql += ';';
      lines.push(sql);
    });
    if(tbl.comment){
      lines.push("COMMENT ON TABLE " + getSchemaQualifiedName(tbl) + " IS '" + tbl.comment.replace(/'/g, "''") + "';");
    }
    return lines.join('\n');
  },

  toSQL: function(schema){
    var lines = [];
    if(!schema) return '-- No schema loaded';
    lines.push('-- Schema Studio export');
    lines.push('-- Schema: ' + ((schema._meta && schema._meta.name) || 'unnamed'));
    lines.push('-- Generated: ' + new Date().toISOString());
    lines.push('');
    (schema.enums || []).forEach(function(en){
      lines.push('CREATE TYPE ' + ((en.schema && en.schema !== 'public') ? en.schema + '.' : '') + en.name + ' AS ENUM (' + (en.values || []).map(function(value){
        return "'" + String(value).replace(/'/g, "''") + "'";
      }).join(', ') + ');');
      lines.push('');
    });
    (schema.tables || []).forEach(function(tbl){
      lines.push(CodeGen.tableSql(tbl, schema));
      lines.push('');
    });
    return lines.join('\n').trim();
  },

  toDBML: function(schema){
    var lines = [];
    if(!schema) return '// No schema loaded';
    lines.push('// Schema Studio export');
    lines.push('// Schema: ' + ((schema._meta && schema._meta.name) || 'unnamed'));
    lines.push('');
    (schema.enums || []).forEach(function(en){
      lines.push('Enum ' + en.name + ' {');
      (en.values || []).forEach(function(value){ lines.push('  ' + value); });
      lines.push('}');
      lines.push('');
    });
    (schema.tables || []).forEach(function(tbl){
      lines.push('Table ' + tbl.name + (tbl.schema && tbl.schema !== 'public' ? ' [schema: ' + tbl.schema + ']' : '') + ' {');
      (tbl.columns || []).forEach(function(col){
        var opts = [];
        if(col.primary_key) opts.push('pk');
        if(!col.nullable) opts.push('not null');
        if(col.unique) opts.push('unique');
        if(col.default_val) opts.push('default: `' + col.default_val + '`');
        lines.push('  ' + col.name + ' ' + fmtColType(col) + (opts.length ? ' [' + opts.join(', ') + ']' : ''));
      });
      lines.push('}');
      lines.push('');
    });
    (schema.relations || []).forEach(function(rel){
      var fromTbl = findTableInSchema(schema, rel.from_table_id);
      var fromCol = findColInSchema(schema, rel.from_table_id, rel.from_col_id);
      var toTbl = findTableInSchema(schema, rel.to_table_id);
      var toCol = findColInSchema(schema, rel.to_table_id, rel.to_col_id);
      if(fromTbl && fromCol && toTbl && toCol){
        lines.push('Ref: ' + fromTbl.name + '.' + fromCol.name + ' > ' + toTbl.name + '.' + toCol.name);
      }
    });
    return lines.join('\n').trim();
  }
};

var CodePanel = {
  open: function(format){
    STORE.codePanel.open = true;
    STORE.codePanel.format = format || 'sql';
    STORE.mode = 'code';
    renderShell();
    CodePanel.render();
  },

  close: function(){
    STORE.codePanel.open = false;
    if(STORE.mode === 'code') STORE.mode = 'canvas';
    renderShell();
  },

  contentForCurrentFormat: function(){
    if(STORE.codePanel.format === 'json') return JSON.stringify(STORE.schema || {}, null, 2);
    if(STORE.codePanel.format === 'dbml') return CodeGen.toDBML(STORE.schema);
    return CodeGen.toSQL(STORE.schema);
  },

  render: function(){
    if(!refs.codePanel) return;
    STORE.codePanel.content = CodePanel.contentForCurrentFormat();
    refs.codePanel.innerHTML = [
      '<div class="ss-code-header"><div class="ss-code-tabs">',
        '<button class="ss-code-tab', STORE.codePanel.format === 'sql' ? ' active' : '', '" onclick="CodePanel.open(\'sql\')">SQL</button>',
        '<button class="ss-code-tab', STORE.codePanel.format === 'dbml' ? ' active' : '', '" onclick="CodePanel.open(\'dbml\')">DBML</button>',
        '<button class="ss-code-tab', STORE.codePanel.format === 'json' ? ' active' : '', '" onclick="CodePanel.open(\'json\')">JSON</button>',
      '</div><div class="ss-code-actions"><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CodePanel.copy()">Copy</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CodePanel.download()">Download</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CodePanel.close()">X</button></div></div>',
      '<div class="ss-code-body"><pre class="ss-code-pre">' + CodePanel.highlight(STORE.codePanel.content, STORE.codePanel.format) + '</pre></div>'
    ].join('');
  },

  highlight: function(code, format){
    if(format !== 'sql') return _esc(code);
    return _esc(code)
      .replace(/\b(CREATE|TABLE|ALTER|ADD|DROP|COLUMN|INDEX|UNIQUE|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|DEFAULT|ON|DELETE|UPDATE|CASCADE|RESTRICT|CHECK|COMMENT|TYPE|ENUM)\b/gi, '<span class="sql-keyword">$1</span>')
      .replace(/\b(UUID|VARCHAR|TEXT|INTEGER|BIGINT|BOOLEAN|TIMESTAMPTZ|TIMESTAMP|JSONB|JSON|NUMERIC|SERIAL|BIGSERIAL|DATE|INET|VECTOR)\b/gi, '<span class="sql-type">$1</span>')
      .replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>')
      .replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');
  },

  copy: function(){
    navigator.clipboard.writeText(STORE.codePanel.content || '');
    toast(_t('Da copy vao clipboard', 'Copied to clipboard'), 'success');
  },

  download: function(){
    var ext = STORE.codePanel.format === 'dbml' ? 'dbml' : STORE.codePanel.format === 'json' ? 'json' : 'sql';
    var blob = new Blob([STORE.codePanel.content || ''], { type:'text/plain' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (((STORE.schema && STORE.schema._meta && STORE.schema._meta.name) || 'schema-studio') + '.' + ext).replace(/\s+/g, '_');
    link.click();
  }
};

var MigGen = {
  computeDiff: function(baseline, current){
    var changes = { safe:[], destructive:[], sql:[] };
    var baseTables = {};
    var currentTables = {};
    (baseline.tables || []).forEach(function(tbl){ baseTables[tbl.name] = tbl; });
    (current.tables || []).forEach(function(tbl){ currentTables[tbl.name] = tbl; });
    (current.tables || []).forEach(function(tbl){
      var baseTbl = baseTables[tbl.name];
      if(!baseTbl){
        changes.safe.push({ type:'CREATE_TABLE', table:tbl.name, detail:String((tbl.columns || []).length) + ' columns' });
        changes.sql.push(CodeGen.tableSql(tbl, current) + '\n');
      }
    });
    (baseline.tables || []).forEach(function(tbl){
      if(!currentTables[tbl.name]){
        changes.destructive.push({ type:'DROP_TABLE', table:tbl.name, detail:'drop table' });
        changes.sql.push('-- DROP TABLE ' + getSchemaQualifiedName(tbl) + ';');
      }
    });
    (current.tables || []).forEach(function(tbl){
      var baseTbl = baseTables[tbl.name];
      var baseCols = {};
      if(!baseTbl) return;
      (baseTbl.columns || []).forEach(function(col){ baseCols[col.name] = col; });
      (tbl.columns || []).forEach(function(col){
        var baseCol = baseCols[col.name];
        if(!baseCol){
          changes.safe.push({ type:'ADD_COLUMN', table:tbl.name, column:col.name, detail:fmtColType(col) });
          changes.sql.push('ALTER TABLE ' + getSchemaQualifiedName(tbl) + ' ADD COLUMN ' + col.name + ' ' + fmtColType(col) + (col.nullable ? '' : ' NOT NULL') + (col.default_val ? ' DEFAULT ' + col.default_val : '') + ';');
          return;
        }
        if(fmtColType(baseCol) !== fmtColType(col)){
          changes.safe.push({ type:'ALTER_TYPE', table:tbl.name, column:col.name, detail:fmtColType(baseCol) + ' -> ' + fmtColType(col) });
          changes.sql.push('ALTER TABLE ' + getSchemaQualifiedName(tbl) + ' ALTER COLUMN ' + col.name + ' TYPE ' + fmtColType(col) + ';');
        }
        if(!!baseCol.nullable !== !!col.nullable){
          changes.safe.push({ type:'ALTER_NULL', table:tbl.name, column:col.name, detail:col.nullable ? 'DROP NOT NULL' : 'SET NOT NULL' });
          changes.sql.push('ALTER TABLE ' + getSchemaQualifiedName(tbl) + ' ALTER COLUMN ' + col.name + ' ' + (col.nullable ? 'DROP NOT NULL' : 'SET NOT NULL') + ';');
        }
      });
      (baseTbl.columns || []).forEach(function(col){
        if(!(tbl.columns || []).some(function(item){ return item.name === col.name; })){
          changes.destructive.push({ type:'DROP_COLUMN', table:tbl.name, column:col.name, detail:'drop column' });
          changes.sql.push('-- ALTER TABLE ' + getSchemaQualifiedName(tbl) + ' DROP COLUMN ' + col.name + ';');
        }
      });
    });
    return changes;
  },

  setBaseline: function(){
    if(!STORE.schema) return Promise.resolve();
    return _api('schema_studio_set_baseline', {
      design_id: STORE.currentDesignId || (STORE.schema._meta && STORE.schema._meta.id) || 'workspace',
      schema: STORE.schema
    }).then(function(){
      STORE.baseline = _clone(STORE.schema);
      toast(_t('Đã đặt baseline', 'Baseline saved'), 'success');
    }).catch(function(err){
      toast(_t('Không đặt được baseline', 'Failed to save baseline') + ': ' + (err.message || ''), 'error');
    });
  },

  renderPreview: function(){
    var diff;
    var sql;
    var overlay;
    if(!STORE.schema) return;
    if(!STORE.baseline){
      toast(_t('Chưa có baseline. Hãy đặt baseline trước.', 'No baseline set yet. Save a baseline first.'), 'error');
      return;
    }
    diff = MigGen.computeDiff(STORE.baseline, STORE.schema);
    STORE.migration.diff = diff;
    sql = ['BEGIN;', '', diff.sql.join('\n\n'), '', 'COMMIT;'].join('\n');
    overlay = document.createElement('div');
    overlay.className = 'ss-migration-overlay';
    overlay.innerHTML = [
      '<div class="ss-diff-panel">',
        '<div class="ss-diff-header"><strong>Migration Preview - ' + String(diff.safe.length + diff.destructive.length) + ' changes</strong><button class="hm-btn hm-btn-ghost" onclick="MigGen.closePreview()">X</button></div>',
        '<div class="ss-diff-body">',
          '<div class="ss-diff-safe"><div class="ss-diff-section-title">Safe changes (' + String(diff.safe.length) + ')</div>' + (diff.safe.length ? diff.safe.map(function(item){
            return '<div class="ss-diff-item safe"><span class="ss-diff-type">' + _esc(item.type) + '</span><span class="ss-diff-target">' + _esc((item.table || '') + (item.column ? '.' + item.column : '')) + '</span><span class="ss-diff-detail">' + _esc(item.detail || '') + '</span></div>';
          }).join('') : '<div class="ss-diff-item safe">No safe changes</div>') + '</div>',
          '<div class="ss-diff-warning"><div class="ss-diff-section-title">Destructive changes (' + String(diff.destructive.length) + ')</div>' + (diff.destructive.length ? diff.destructive.map(function(item){
            return '<div class="ss-diff-item destructive"><span class="ss-diff-type">' + _esc(item.type) + '</span><span class="ss-diff-target">' + _esc((item.table || '') + (item.column ? '.' + item.column : '')) + '</span><span class="ss-diff-detail">' + _esc(item.detail || '') + '</span></div>';
          }).join('') : '<div class="ss-diff-item">No destructive changes</div>') + '</div>',
          '<div class="ss-diff-sql-preview"><div class="ss-diff-section-title">SQL Preview</div><pre class="ss-code-pre">' + CodePanel.highlight(sql, 'sql') + '</pre></div>',
        '</div>',
        '<div class="ss-diff-actions"><button class="hm-btn hm-btn-secondary" onclick="MigGen.downloadSQL()">Download .sql</button><button class="hm-btn hm-btn-secondary" onclick="MigGen.copySQL()">Copy SQL</button><button class="hm-btn ' + (diff.destructive.length ? 'hm-btn-danger' : 'hm-btn-primary') + '" onclick="MigGen.applyMigration()">Apply</button><button class="hm-btn hm-btn-ghost" onclick="MigGen.closePreview()">Close</button></div>',
      '</div>'
    ].join('');
    STORE.migration.previewOpen = true;
    STORE.migration.overlayEl = overlay;
    STORE.migration.previewSql = sql;
    document.body.appendChild(overlay);
  },

  closePreview: function(){
    if(STORE.migration.overlayEl){
      removeNode(STORE.migration.overlayEl);
      STORE.migration.overlayEl = null;
    }
    STORE.migration.previewOpen = false;
  },

  downloadSQL: function(){
    var blob = new Blob([STORE.migration.previewSql || ''], { type:'text/plain' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'schema_studio_migration.sql';
    link.click();
  },

  copySQL: function(){
    navigator.clipboard.writeText(STORE.migration.previewSql || '');
    toast(_t('Đã copy SQL', 'Copied SQL'), 'success');
  },

  applyMigration: function(){
    var diff = STORE.migration.diff || { destructive:[] };
    confirm2(_t('Áp dụng migration lên database?', 'Apply migration to the database?'), diff.destructive.length > 0).then(function(ok){
      if(!ok) return;
      return _api('schema_studio_apply_migration', {
        sql: STORE.migration.previewSql || '',
        design_id: STORE.currentDesignId || (STORE.schema && STORE.schema._meta && STORE.schema._meta.id) || null,
        allow_destructive: diff.destructive.length > 0
      }).then(function(){
        STORE.baseline = _clone(STORE.schema);
        MigGen.closePreview();
        toast(_t('Migration thành công', 'Migration applied'), 'success');
      }).catch(function(err){
        toast(_t('Migration thất bại', 'Migration failed') + ': ' + (err.message || ''), 'error');
      });
    });
  }
};

var Validator = {
  PG_RESERVED: {
    select:true, from:true, where:true, table:true, index:true, column:true, constraint:true,
    primary:true, foreign:true, references:true, default:true, check:true, unique:true, null:true, not:true,
    and:true, or:true, join:true, order:true, group:true, by:true, insert:true, update:true, delete:true,
    create:true, drop:true, alter:true, add:true, user:true, role:true, trigger:true, view:true, sequence:true,
    schema:true, database:true
  },
  _fixes: {},

  addResult: function(results, data, fixFn){
    data.id = _uid();
    results.push(data);
    if(typeof fixFn === 'function'){
      Validator._fixes[data.id] = fixFn;
    }
  },

  run: function(){
    var schema = STORE.schema;
    var results = [];
    var tableNames = {};
    var meta = schema && schema._meta ? schema._meta : {};
    var validationProfile = String(meta.validation_profile || '').toLowerCase();
    var isRegistrySchema = validationProfile === 'logical_registry' || String(meta.source || '').toLowerCase().indexOf('registry') >= 0;
    var lifecycleColumns = ['created_at', 'updated_at', 'recorded_at', 'logged_at', 'event_time', 'posted_at', 'issued_at'];
    Validator._fixes = {};
    if(!schema){
      STORE.validation.results = [];
      STORE.validation.ran = true;
      Validator.renderPanel();
      return [];
    }
    if(isRegistrySchema){
      Validator.addResult(results, {
        level:'info',
        code:'I00',
        msg:_t('Đang kiểm tra schema ở chế độ registry logic. Một số rule vật lý như index và timestamp đã được giảm bớt.', 'Validating this schema in logical registry mode. Some physical rules like indexes and timestamps are softened.')
      });
    }
    (schema.tables || []).forEach(function(tbl){
      if(tableNames[tbl.name]){
        Validator.addResult(results, { level:'error', code:'E03', tableId:tbl.id, table:tbl.name, msg:_t('Bảng bị trùng tên: ' + tbl.name, 'Duplicate table name: ' + tbl.name) });
      }
      tableNames[tbl.name] = true;
      if(!(tbl.columns || []).some(function(col){ return col.primary_key; })){
        Validator.addResult(results, { level:'error', code:'E01', tableId:tbl.id, table:tbl.name, msg:_t('Bảng "' + tbl.name + '" không có primary key', 'Table "' + tbl.name + '" has no primary key') });
      }
      if(!isValidIdentifier(tbl.name)){
        Validator.addResult(results, { level:'error', code:'E04', tableId:tbl.id, table:tbl.name, msg:_t('Tên bảng không đúng snake_case: ' + tbl.name, 'Table name is not snake_case: ' + tbl.name) });
      }
      (tbl.columns || []).forEach(function(col){
        var dupCount = (tbl.columns || []).filter(function(item){ return item.name === col.name; }).length;
        if(dupCount > 1){
          Validator.addResult(results, { level:'error', code:'E05', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Cột bị trùng tên: ' + tbl.name + '.' + col.name, 'Duplicate column: ' + tbl.name + '.' + col.name) });
        }
        if(!isValidIdentifier(col.name)){
          Validator.addResult(results, { level:'error', code:'E06', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Tên cột không hợp lệ: ' + tbl.name + '.' + col.name, 'Invalid column name: ' + tbl.name + '.' + col.name) });
        }
        if(isReservedWord(col.name)){
          Validator.addResult(results, { level:'error', code:'E07', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Cột dùng từ khóa SQL: ' + tbl.name + '.' + col.name, 'Column uses SQL keyword: ' + tbl.name + '.' + col.name) });
        }
        if(col.type === 'varchar' && !col.length){
          Validator.addResult(results, { level:'warning', code:'W02', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('varchar chưa có length: ' + tbl.name + '.' + col.name, 'varchar has no length: ' + tbl.name + '.' + col.name) }, function(){
            pushUndo();
            col.type = 'text';
            col.length = null;
            TableCard.reRender(tbl.id);
            markDirty();
            saveDraft();
            Validator.run();
          });
        }
        if(col.primary_key && col.type === 'uuid' && String(col.default_val || '').indexOf('uuid_generate_v4') < 0){
          Validator.addResult(results, { level:'warning', code:'W03', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('UUID PK chưa có default uuid_generate_v4(): ' + tbl.name + '.' + col.name, 'UUID PK missing uuid_generate_v4(): ' + tbl.name + '.' + col.name) }, function(){
            pushUndo();
            col.default_val = 'uuid_generate_v4()';
            TableCard.reRender(tbl.id);
            markDirty();
            saveDraft();
            Validator.run();
          });
        }
        if(col.foreign_key){
          var indexed = (tbl.indexes || []).some(function(idx){
            return (idx.columns || []).some(function(ic){ return ic.name === col.name; });
          });
          if(!indexed && !isRegistrySchema){
            Validator.addResult(results, { level:'warning', code:'W04', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('FK chưa được index: ' + tbl.name + '.' + col.name, 'FK is not indexed: ' + tbl.name + '.' + col.name) }, function(){
              pushUndo();
              tbl.indexes = tbl.indexes || [];
              tbl.indexes.push({ id:_uid(), name:'idx_' + tbl.name + '_' + col.name, type:'BTREE', unique:false, columns:[{ name:col.name, order:'ASC' }], where:'', include:[] });
              TableCard.reRender(tbl.id);
              markDirty();
              saveDraft();
              Validator.run();
            });
          }
          if(!isRegistrySchema && col.nullable && (!col.foreign_key.on_delete || col.foreign_key.on_delete === 'NO ACTION')){
            Validator.addResult(results, { level:'warning', code:'W05', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('FK nullable chưa có ON DELETE: ' + tbl.name + '.' + col.name, 'Nullable FK missing ON DELETE: ' + tbl.name + '.' + col.name) });
          }
        }
        if(col.type === 'jsonb'){
          var hasGin = (tbl.indexes || []).some(function(idx){
            return String(idx.type || '').toUpperCase() === 'GIN' && (idx.columns || []).some(function(ic){ return ic.name === col.name; });
          });
          if(!hasGin && !isRegistrySchema){
            Validator.addResult(results, { level:'warning', code:'W06', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('jsonb chưa có GIN index: ' + tbl.name + '.' + col.name, 'jsonb missing GIN index: ' + tbl.name + '.' + col.name) });
          }
        }
      });
      if(!isRegistrySchema && (tbl.columns || []).length > 15 && !(tbl.indexes || []).length){
        Validator.addResult(results, { level:'warning', code:'W07', tableId:tbl.id, table:tbl.name, msg:_t('Bảng lớn nhưng chưa có index: ' + tbl.name, 'Large table has no indexes: ' + tbl.name) });
      }
      if(!isRegistrySchema && !(tbl.columns || []).some(function(col){ return lifecycleColumns.indexOf(String(col.name || '').toLowerCase()) >= 0; })){
        Validator.addResult(results, { level:'warning', code:'W01', tableId:tbl.id, table:tbl.name, msg:_t('Bảng thiếu created_at/updated_at: ' + tbl.name, 'Table missing created_at/updated_at: ' + tbl.name) }, function(){
          pushUndo();
          if(!(tbl.columns || []).some(function(col){ return col.name === 'created_at'; })){
            tbl.columns.push({ id:_uid(), name:'created_at', type:'timestamptz', length:null, scale:null, is_array:false, nullable:false, unique:false, primary_key:false, pk_order:null, default_val:'now()', check_expr:null, generated_expr:null, generated_stored:false, comment:'', foreign_key:null });
          }
          if(!(tbl.columns || []).some(function(col){ return col.name === 'updated_at'; })){
            tbl.columns.push({ id:_uid(), name:'updated_at', type:'timestamptz', length:null, scale:null, is_array:false, nullable:false, unique:false, primary_key:false, pk_order:null, default_val:'now()', check_expr:null, generated_expr:null, generated_stored:false, comment:'', foreign_key:null });
          }
          TableCard.reRender(tbl.id);
          markDirty();
          saveDraft();
          Validator.run();
        });
      }
      if(!tbl.comment){
        Validator.addResult(results, { level:'info', code:'I01', tableId:tbl.id, table:tbl.name, msg:_t('Bảng chưa có comment: ' + tbl.name, 'Table has no comment: ' + tbl.name) });
      }
      if(tbl.rls_enabled){
        Validator.addResult(results, { level:'info', code:'I02', tableId:tbl.id, table:tbl.name, msg:_t('Bảng đang bật RLS, nhớ viết policy trong migration: ' + tbl.name, 'RLS enabled - remember policies in migration: ' + tbl.name) });
      }
      if(String(tbl.name || '').length > 63){
        Validator.addResult(results, { level:'info', code:'I04', tableId:tbl.id, table:tbl.name, msg:_t('Tên bảng "' + tbl.name + '" dài ' + tbl.name.length + ' ký tự (PostgreSQL giới hạn 63)', 'Table name "' + tbl.name + '" is ' + tbl.name.length + ' chars (PostgreSQL max 63)') });
      }
      if((tbl.columns || []).length === 1){
        Validator.addResult(results, { level:'warning', code:'W10', tableId:tbl.id, table:tbl.name, msg:_t('Bảng "' + tbl.name + '" chỉ có 1 cột', 'Table "' + tbl.name + '" has only 1 column') });
      }
      if((tbl.columns || []).some(function(col){ return col.primary_key && col.type === 'uuid'; }) && (tbl.columns || []).some(function(col){ return col.type === 'serial' || col.type === 'bigserial'; })){
        Validator.addResult(results, { level:'info', code:'I06', tableId:tbl.id, table:tbl.name, msg:_t('Bảng "' + tbl.name + '" đang trộn UUID PK với serial', 'Table "' + tbl.name + '" mixes UUID PK with serial') });
      }
    });
    (schema.relations || []).forEach(function(rel){
      var toTbl = findTable(rel.to_table_id);
      var toCol = findCol(rel.to_table_id, rel.to_col_id);
      if(!toTbl || !toCol){
        Validator.addResult(results, { level:'error', code:'E02', tableId:rel.from_table_id, msg:_t('Relation bị hỏng: ' + (rel.name || rel.id), 'Broken relation: ' + (rel.name || rel.id)) });
      }
    });
    STORE.validation.results = results;
    STORE.validation.ran = true;
    STORE.mode = 'validate';
    renderShell();
    Validator.renderPanel();
    return results;
  },

  runFix: function(id){
    if(Validator._fixes[id]){
      Validator._fixes[id]();
    }
  },

  locate: function(tableId){
    if(tableId) Browser.focusTable(tableId);
  },

  renderPanel: function(){
    var panel = refs.validationPanel;
    var results = STORE.validation.results || [];
    var errors = results.filter(function(item){ return item.level === 'error'; }).length;
    var warnings = results.filter(function(item){ return item.level === 'warning'; }).length;
    var infos = results.filter(function(item){ return item.level === 'info'; }).length;
    if(!panel) return;
    panel.innerHTML = [
      '<div class="ss-val-header"><div class="ss-val-summary">' + (results.length ? '<span class="ss-val-error">● ' + String(errors) + ' ' + _esc(_t('Loi', 'Errors')) + '</span><span class="ss-val-warn">⚠ ' + String(warnings) + ' ' + _esc(_t('Canh bao', 'Warnings')) + '</span><span class="ss-val-info">ℹ ' + String(infos) + ' Info</span>' : '<span class="ss-val-ok">Valid</span>') + '</div><div><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Validator.run()">Run</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Validator.closePanel()">X</button></div></div>',
      '<div class="ss-val-list">',
        results.length ? results.map(function(item){
          return '<div class="ss-val-item ' + _esc(item.level) + '"><span class="ss-val-code">' + _esc(item.code) + '</span><span class="ss-val-msg">' + _esc(item.msg) + '</span>' + (Validator._fixes[item.id] ? '<button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Validator.runFix(\'' + _esc(item.id) + '\')">Fix</button>' : '') + (item.tableId ? '<button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Validator.locate(\'' + _esc(item.tableId) + '\')">Locate</button>' : '') + '</div>';
        }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Khong co van de nao duoc tim thay', 'No issues found')) + '</div></div>',
      '</div>'
    ].join('');
  },

  closePanel: function(){
    STORE.mode = 'canvas';
    STORE.validation.ran = false;
    if(refs.validationPanel){
      refs.validationPanel.innerHTML = '';
      refs.validationPanel.style.display = 'none';
    }
    if(refs.toolbar){
      renderToolbar(refs.toolbar);
    }
    if(refs.modeIndicator){
      refs.modeIndicator.textContent = _t('Chế độ', 'Mode') + ': ' + modeLabel('canvas');
    }
  }
};

var Importer = {
  openModal: function(){
    var overlay = document.createElement('div');
    overlay.className = 'ss-modal-overlay';
    overlay.innerHTML = [
      '<div class="ss-modal">',
        '<div class="ss-modal-header"><h3>' + _esc(_t('Import schema', 'Import schema')) + '</h3><button class="hm-btn hm-btn-ghost" onclick="this.closest(\'.ss-modal-overlay\').remove()">X</button></div>',
        '<div class="ss-modal-body">',
          '<div class="ss-import-tabs"><button class="ss-itab active" data-tab="sql" onclick="Importer.switchTab(this,\'sql\')">SQL</button><button class="ss-itab" data-tab="registry" onclick="Importer.switchTab(this,\'registry\')">Registry</button></div>',
          '<div id="ss-import-tab-sql"><textarea id="ss-import-sql-input" class="hm-input ss-import-textarea" rows="14" placeholder="CREATE TABLE users (...);"></textarea></div>',
          '<div id="ss-import-tab-registry" style="display:none"><div class="ss-field-group"><div class="ss-field-hint">' + _esc(_t('Load tu registry JSON hien co', 'Load from existing registry JSON')) + '</div><button class="hm-btn hm-btn-secondary" onclick="Importer.loadFromRegistry()">Load registry</button></div></div>',
          '<div id="ss-import-error" class="ss-import-error" style="display:none"></div>',
        '</div>',
        '<div class="ss-modal-footer"><button class="hm-btn hm-btn-primary" onclick="Importer.doImport()">' + _esc(_t('Import', 'Import')) + '</button><button class="hm-btn hm-btn-ghost" onclick="this.closest(\'.ss-modal-overlay\').remove()">' + _esc(_t('Huy', 'Cancel')) + '</button></div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
  },

  switchTab: function(btn, tab){
    Array.prototype.forEach.call(btn.parentNode.querySelectorAll('.ss-itab'), function(item){ item.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('ss-import-tab-sql').style.display = tab === 'sql' ? '' : 'none';
    document.getElementById('ss-import-tab-registry').style.display = tab === 'registry' ? '' : 'none';
  },

  doImport: function(){
    var active = document.querySelector('.ss-import-tabs .ss-itab.active');
    var tab = active ? active.getAttribute('data-tab') : 'sql';
    var errorBox = document.getElementById('ss-import-error');
    if(tab === 'registry'){
      Importer.loadFromRegistry();
      return;
    }
    try{
      Importer.applySchema(Importer.parseSQL(document.getElementById('ss-import-sql-input').value || ''));
    }catch(err){
      if(errorBox){
        errorBox.style.display = 'block';
        errorBox.textContent = err.message || 'Import failed';
      }
    }
  },

  parseSQL: function(sql){
    var schema = createBlankSchemaDoc('imported_schema');
    var regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    var match;
    var tableSeq = 0;
    while((match = regex.exec(sql)) !== null){
      var tbl = createDefaultTable(80 + ((tableSeq % 4) * 320), 80 + (Math.floor(tableSeq / 4) * 260));
      var lines;
      tableSeq += 1;
      tbl.name = match[2];
      tbl.schema = match[1] || 'public';
      tbl.columns = [];
      lines = match[3].split('\n').map(function(line){ return line.trim().replace(/,$/, ''); }).filter(Boolean);
      lines.forEach(function(line){
        var colMatch;
        var rest;
        if(/^(CONSTRAINT|PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b/i.test(line)) return;
        colMatch = line.match(/^(\w+)\s+([a-zA-Z_][a-zA-Z0-9_ ]*(?:\([^)]+\))?(?:\[\])?)(.*)$/);
        if(!colMatch) return;
        rest = colMatch[3] || '';
        var parsed = parseTypeDefinition(colMatch[2]);
        var col = {
          id:_uid(),
          name:colMatch[1],
          type:parsed.type,
          length:parsed.length,
          scale:parsed.scale,
          is_array:parsed.is_array,
          nullable: !/NOT\s+NULL/i.test(rest),
          unique: /\bUNIQUE\b/i.test(rest),
          primary_key: /PRIMARY\s+KEY/i.test(rest),
          pk_order: /PRIMARY\s+KEY/i.test(rest) ? 1 : null,
          default_val: null,
          check_expr: null,
          generated_expr: null,
          generated_stored: false,
          comment: '',
          foreign_key: null
        };
        if(/DEFAULT\s+([^\s,]+(?:\([^)]+\))?)/i.test(rest)){
          col.default_val = rest.match(/DEFAULT\s+([^\s,]+(?:\([^)]+\))?)/i)[1];
        }
        if(/REFERENCES\s+(\w+)\s*\((\w+)\)/i.test(rest)){
          var ref = rest.match(/REFERENCES\s+(\w+)\s*\((\w+)\)/i);
          col.foreign_key = { ref_table_id:'__pending__' + ref[1], ref_col_id:'__pending__' + ref[2], on_delete:'RESTRICT', on_update:'CASCADE', constraint_name:'fk_' + tbl.name + '_' + col.name, deferrable:false };
        }
        tbl.columns.push(col);
      });
      if(!tbl.columns.length){
        tbl.columns = createDefaultTable().columns;
      }
      schema.tables.push(tbl);
    }
    schema.tables.forEach(function(tbl){
      (tbl.columns || []).forEach(function(col){
        var refTbl;
        var refCol;
        if(!col.foreign_key || String(col.foreign_key.ref_table_id).indexOf('__pending__') !== 0) return;
        refTbl = (schema.tables || []).filter(function(item){ return item.name === String(col.foreign_key.ref_table_id).replace('__pending__', ''); })[0];
        refCol = refTbl ? (refTbl.columns || []).filter(function(item){ return item.name === String(col.foreign_key.ref_col_id).replace('__pending__', ''); })[0] : null;
        if(refTbl && refCol){
          col.foreign_key.ref_table_id = refTbl.id;
          col.foreign_key.ref_col_id = refCol.id;
          schema.relations.push({ id:_uid(), from_table_id:tbl.id, from_col_id:col.id, to_table_id:refTbl.id, to_col_id:refCol.id, name:col.foreign_key.constraint_name, on_delete:'RESTRICT', on_update:'CASCADE', nullable:!!col.nullable, edge:{ type:'orthogonal', waypoints:[] } });
        }else{
          col.foreign_key = null;
        }
      });
    });
    return schema;
  },

  loadFromRegistry: function(){
    return _api('schema_studio_load_registry').then(function(res){
      if(res && res.schema){
        Importer.applySchema(res.schema);
      }
    }).catch(function(err){
      toast(_t('Khong load duoc registry', 'Failed to load registry') + ': ' + (err.message || ''), 'error');
    });
  },

  applySchema: function(schema){
    pushUndo();
    STORE.schema = schema;
    STORE.currentDesignId = (schema._meta && schema._meta.id) || null;
    STORE.dirty = true;
    renderShell();
    Canvas.render();
    Browser.render();
    Layout.auto('force');
    setTimeout(function(){ Canvas.zoomToFit(); }, 120);
    saveDraft();
    toast(_t('Import thanh cong', 'Import successful'), 'success');
    Array.prototype.forEach.call(document.querySelectorAll('.ss-modal-overlay'), function(node){ removeNode(node); });
  }
};

var Layout = {
  auto: function(algorithm){
    if(!STORE.schema || !(STORE.schema.tables || []).length) return;
    pushUndo();
    if(algorithm === 'grid'){
      Layout.grid();
    } else if(algorithm === 'hierarchical'){
      Layout.hierarchical();
    } else if(algorithm === 'domain'){
      Layout.domainClusters();
    } else if(algorithm === 'compact-visible'){
      Layout.compactVisible();
    } else {
      Layout.forceDirected();
    }
    Canvas.render();
    markDirty();
    saveDraft();
  },

  grid: function(){
    var cols = Math.max(1, Math.ceil(Math.sqrt((STORE.schema.tables || []).length)));
    (STORE.schema.tables || []).forEach(function(tbl, index){
      tbl.canvas.x = 80 + ((index % cols) * 320);
      tbl.canvas.y = 80 + (Math.floor(index / cols) * 260);
    });
  },

  domainClusters: function(){
    var groups = {};
    var domains;
    (STORE.schema.tables || []).forEach(function(tbl){
      var key = tbl.domain || 'default';
      if(!groups[key]) groups[key] = [];
      groups[key].push(tbl);
    });
    domains = Object.keys(groups);
    domains.forEach(function(domain, idx){
      var clusterX = 80 + ((idx % 3) * 980);
      var clusterY = 80 + (Math.floor(idx / 3) * 760);
      groups[domain].forEach(function(tbl, tIndex){
        tbl.canvas.x = clusterX + ((tIndex % 3) * 300);
        tbl.canvas.y = clusterY + (Math.floor(tIndex / 3) * 240);
      });
    });
  },

  hierarchical: function(){
    var layers = {};
    var placed = {};
    (STORE.schema.tables || []).forEach(function(tbl){
      layers[tbl.id] = 0;
    });
    (STORE.schema.relations || []).forEach(function(rel){
      layers[rel.from_table_id] = Math.max(layers[rel.from_table_id] || 0, (layers[rel.to_table_id] || 0) + 1);
    });
    (STORE.schema.tables || []).forEach(function(tbl){
      var depth = layers[tbl.id] || 0;
      if(!placed[depth]) placed[depth] = 0;
      tbl.canvas.x = 80 + (depth * 360);
      tbl.canvas.y = 80 + (placed[depth] * 240);
      placed[depth] += 1;
    });
  },

  forceDirected: function(){
    var tables = STORE.schema.tables || [];
    var relations = STORE.schema.relations || [];
    var temp = 160;
    var i;
    var j;
    if(!tables.length) return;
    for(i = 0; i < tables.length; i += 1){
      if(tables[i].canvas.x == null) tables[i].canvas.x = 80 + (i * 40);
      if(tables[i].canvas.y == null) tables[i].canvas.y = 80 + (i * 20);
    }
    for(i = 0; i < 28; i += 1){
      var disp = tables.map(function(){ return { x:0, y:0 }; });
      for(j = 0; j < tables.length; j += 1){
        var k;
        for(k = j + 1; k < tables.length; k += 1){
          var dx = tables[j].canvas.x - tables[k].canvas.x;
          var dy = tables[j].canvas.y - tables[k].canvas.y;
          var dist = Math.max(Math.sqrt((dx * dx) + (dy * dy)), 1);
          var force = 26000 / dist;
          disp[j].x += (dx / dist) * force;
          disp[j].y += (dy / dist) * force;
          disp[k].x -= (dx / dist) * force;
          disp[k].y -= (dy / dist) * force;
        }
      }
      relations.forEach(function(rel){
        var fromIdx = tables.findIndex(function(tbl){ return tbl.id === rel.from_table_id; });
        var toIdx = tables.findIndex(function(tbl){ return tbl.id === rel.to_table_id; });
        var dx;
        var dy;
        var dist;
        var force;
        if(fromIdx < 0 || toIdx < 0) return;
        dx = tables[fromIdx].canvas.x - tables[toIdx].canvas.x;
        dy = tables[fromIdx].canvas.y - tables[toIdx].canvas.y;
        dist = Math.max(Math.sqrt((dx * dx) + (dy * dy)), 1);
        force = dist * 0.18;
        disp[fromIdx].x -= (dx / dist) * force;
        disp[fromIdx].y -= (dy / dist) * force;
        disp[toIdx].x += (dx / dist) * force;
        disp[toIdx].y += (dy / dist) * force;
      });
      tables.forEach(function(tbl, index){
        var len = Math.max(Math.sqrt((disp[index].x * disp[index].x) + (disp[index].y * disp[index].y)), 1);
        tbl.canvas.x = Math.max(20, tbl.canvas.x + ((disp[index].x / len) * Math.min(len, temp)));
        tbl.canvas.y = Math.max(20, tbl.canvas.y + ((disp[index].y / len) * Math.min(len, temp)));
      });
      temp *= 0.92;
    }
  },

  compactVisible: function(){
    var tables = typeof Browser !== 'undefined' && Browser.getCanvasTables ? Browser.getCanvasTables() : (STORE.schema.tables || []);
    var cursorX = 80;
    var cursorY = 80;
    var maxColumnWidth = 0;
    var columnBottom = 0;
    var wrapHeight = refs.canvasWrap ? Math.max(refs.canvasWrap.clientHeight - 120, 520) : 760;
    var gutterX = 56;
    var gutterY = 28;
    if(!tables.length) return;
    tables.slice().sort(function(a, b){
      if(a.canvas.y === b.canvas.y) return a.canvas.x - b.canvas.x;
      return a.canvas.y - b.canvas.y;
    }).forEach(function(tbl){
      var width = (tbl.canvas && tbl.canvas.width) || TABLE_DEFAULT_WIDTH;
      var height = getTableHeight(tbl);
      if(cursorY + height > wrapHeight && cursorY > 80){
        cursorX += maxColumnWidth + gutterX;
        cursorY = 80;
        maxColumnWidth = 0;
      }
      tbl.canvas.x = cursorX;
      tbl.canvas.y = cursorY;
      cursorY += height + gutterY;
      columnBottom = Math.max(columnBottom, tbl.canvas.y + height);
      maxColumnWidth = Math.max(maxColumnWidth, width);
    });
  }
};

var VirtualRenderer = {
  BUFFER: 300,
  _rendered: new Set(),
  _visible: new Set(),
  _raf: null,
  _scheduled: false,

  getViewportBounds: function(){
    if(!refs.canvasWrap) return null;
    var zoom = STORE.canvas.zoom || 1;
    var panX = STORE.canvas.panX || 0;
    var panY = STORE.canvas.panY || 0;
    var buf = VirtualRenderer.BUFFER;
    return {
      left: (-panX / zoom) - buf,
      top: (-panY / zoom) - buf,
      right: ((-panX + refs.canvasWrap.clientWidth) / zoom) + buf,
      bottom: ((-panY + refs.canvasWrap.clientHeight) / zoom) + buf
    };
  },

  isVisible: function(tbl){
    var vp = VirtualRenderer.getViewportBounds();
    var width;
    var height;
    if(!tbl) return false;
    if(!vp) return true;
    width = tbl.canvas && tbl.canvas.width ? tbl.canvas.width : TABLE_DEFAULT_WIDTH;
    height = getTableHeight(tbl);
    return !(
      (tbl.canvas.x + width) < vp.left ||
      tbl.canvas.x > vp.right ||
      (tbl.canvas.y + height) < vp.top ||
      tbl.canvas.y > vp.bottom
    );
  },

  getVisibleSet: function(){
    return VirtualRenderer._visible;
  },

  scheduleUpdate: function(){
    if(VirtualRenderer._scheduled) return;
    VirtualRenderer._scheduled = true;
    VirtualRenderer._raf = window.requestAnimationFrame(function(){
      VirtualRenderer._scheduled = false;
      VirtualRenderer._raf = null;
      VirtualRenderer.update();
    });
  },

  update: function(){
    var tables = typeof Browser !== 'undefined' && Browser.getCanvasTables ? Browser.getCanvasTables() : ((STORE.schema && STORE.schema.tables) || []);
    var nowVisible = new Set();
    var removeIds = [];
    if(!refs.tablesLayer){
      return;
    }
    if(!tables.length){
      refs.tablesLayer.innerHTML = '';
      VirtualRenderer._rendered.clear();
      VirtualRenderer._visible = nowVisible;
      EdgeLayer.clearAll();
      Canvas.updateMinimap();
      return;
    }
    tables.forEach(function(tbl){
      if(VirtualRenderer.isVisible(tbl)){
        nowVisible.add(tbl.id);
      }
    });
    nowVisible.forEach(function(id){
      if(!VirtualRenderer._rendered.has(id)){
        var tbl = findTable(id);
        if(tbl) TableCard.renderTable(tbl);
        VirtualRenderer._rendered.add(id);
      }
    });
    VirtualRenderer._rendered.forEach(function(id){
      if(!nowVisible.has(id)){
        removeIds.push(id);
      }
    });
    removeIds.forEach(function(id){
      var el = document.getElementById('tc_' + id);
      if(el) removeNode(el);
      VirtualRenderer._rendered.delete(id);
    });
    VirtualRenderer._visible = nowVisible;
    EdgeLayer.renderForVisible(nowVisible);
    Canvas.syncSelectionClasses();
    Canvas.updateMinimap();
  },

  reset: function(){
    if(VirtualRenderer._raf){
      window.cancelAnimationFrame(VirtualRenderer._raf);
      VirtualRenderer._raf = null;
    }
    VirtualRenderer._scheduled = false;
    VirtualRenderer._visible = new Set();
    VirtualRenderer._rendered.clear();
    if(refs.tablesLayer) refs.tablesLayer.innerHTML = '';
    EdgeLayer.clearAll();
    VirtualRenderer.update();
  }
};

var CmdPalette = {
  _el: null,
  _filteredCommands: [],
  _selectedIdx: 0,
  COMMANDS: [
    { icon:'+', label:'Tao bang moi', label_en:'New table', category:'action', action:function(){ TableCard.createNew(200, 200); } },
    { icon:'S', label:'Luu schema', label_en:'Save schema', category:'action', action:function(){ SchemaLib.save(); } },
    { icon:'I', label:'Import schema', label_en:'Import schema', category:'action', action:function(){ Importer.openModal(); } },
    { icon:'D', label:'Load tu DB', label_en:'Load from DB', category:'action', action:function(){ SchemaLib.loadFromLiveDB(); } },
    { icon:'V', label:'Validation', label_en:'Validation', category:'action', action:function(){ Validator.run(); } },
    { icon:'M', label:'Migration preview', label_en:'Migration preview', category:'action', action:function(){ MigGen.renderPreview(); } },
    { icon:'Z', label:'Zoom to fit', label_en:'Zoom to fit', category:'view', action:function(){ Canvas.zoomToFit(); } },
    { icon:'B', label:'Ẩn hiện trình duyệt schema', label_en:'Toggle schema browser', category:'view', action:function(){ Browser.toggleOpen(); } },
    { icon:'◌', label:'Hiện tất cả domain', label_en:'Show all domains', category:'view', action:function(){ Browser.showAllDomains(); } },
    { icon:'+', label:'Mở rộng tất cả domain', label_en:'Expand all domains', category:'view', action:function(){ Browser.expandAll(); } },
    { icon:'−', label:'Thu gọn tất cả domain', label_en:'Collapse all domains', category:'view', action:function(){ Browser.collapseAll(); } },
    { icon:'⤢', label:'Nén view đang hiện', label_en:'Compact visible view', category:'layout', action:function(){ Layout.auto('compact-visible'); } },
    { icon:'#', label:'Bat tat snap grid', label_en:'Toggle snap grid', category:'view', action:function(){ Canvas.toggleSnap(); } },
    { icon:'G', label:'Grid layout', label_en:'Grid layout', category:'layout', action:function(){ Layout.auto('grid'); } },
    { icon:'F', label:'Force layout', label_en:'Force layout', category:'layout', action:function(){ Layout.auto('force'); } },
    { icon:'H', label:'Hierarchical layout', label_en:'Hierarchical layout', category:'layout', action:function(){ Layout.auto('hierarchical'); } },
    { icon:'C', label:'Mo SQL', label_en:'Open SQL', category:'export', action:function(){ CodePanel.open('sql'); } },
    { icon:'B', label:'Dat baseline', label_en:'Set baseline', category:'migration', action:function(){ MigGen.setBaseline(); } }
  ],

  open: function(){
    var overlay;
    var palette;
    var input;
    if(CmdPalette._el) return;
    overlay = document.createElement('div');
    overlay.className = 'ss-cmd-overlay';
    overlay.onclick = CmdPalette.close;
    palette = document.createElement('div');
    palette.className = 'ss-cmd-palette';
    palette.innerHTML = '<input class="ss-cmd-input" id="ss-cmd-input" placeholder="' + _esc(_t('Tim lenh hoac bang...', 'Search commands or tables...')) + '" /><div class="ss-cmd-results" id="ss-cmd-results"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(palette);
    CmdPalette._el = palette;
    STORE.cmdPaletteOpen = true;
    CmdPalette.renderResults('');
    input = document.getElementById('ss-cmd-input');
    input.focus();
    input.oninput = function(){ CmdPalette.renderResults(this.value); };
    input.onkeydown = CmdPalette.onKey;
  },

  close: function(){
    Array.prototype.forEach.call(document.querySelectorAll('.ss-cmd-overlay'), function(node){ removeNode(node); });
    if(CmdPalette._el) removeNode(CmdPalette._el);
    CmdPalette._el = null;
    STORE.cmdPaletteOpen = false;
  },

  onKey: function(ev){
    var items = document.querySelectorAll('.ss-cmd-item');
    if(ev.key === 'ArrowDown'){
      CmdPalette._selectedIdx = Math.min(CmdPalette._selectedIdx + 1, items.length - 1);
      CmdPalette.highlightSelected();
      ev.preventDefault();
    } else if(ev.key === 'ArrowUp'){
      CmdPalette._selectedIdx = Math.max(CmdPalette._selectedIdx - 1, 0);
      CmdPalette.highlightSelected();
      ev.preventDefault();
    } else if(ev.key === 'Enter'){
      if(items[CmdPalette._selectedIdx]) items[CmdPalette._selectedIdx].click();
    } else if(ev.key === 'Escape'){
      CmdPalette.close();
    }
  },

  highlightSelected: function(){
    Array.prototype.forEach.call(document.querySelectorAll('.ss-cmd-item'), function(node, index){
      node.classList.toggle('active', index === CmdPalette._selectedIdx);
    });
  },

  renderResults: function(query){
    var normalized = String(query || '').toLowerCase().trim();
    var commandResults = CmdPalette.COMMANDS.filter(function(item){
      return !normalized || item.label.toLowerCase().indexOf(normalized) >= 0 || item.label_en.toLowerCase().indexOf(normalized) >= 0 || item.category.indexOf(normalized) >= 0;
    });
    var tableResults = ((STORE.schema && STORE.schema.tables) || []).filter(function(tbl){
      return !normalized || String(tbl.name || '').toLowerCase().indexOf(normalized) >= 0 || String(tbl.domain || '').toLowerCase().indexOf(normalized) >= 0;
    }).slice(0, 6);
    CmdPalette._filteredCommands = commandResults;
    CmdPalette._selectedIdx = 0;
    document.getElementById('ss-cmd-results').innerHTML = [
      commandResults.length ? '<div class="ss-cmd-group-label">' + _esc(_t('Lenh', 'Commands')) + '</div>' + commandResults.map(function(item, index){
        return '<div class="ss-cmd-item' + (index === 0 ? ' active' : '') + '" onclick="CmdPalette.execute(' + index + ')"><span class="ss-cmd-icon">' + _esc(item.icon) + '</span><span class="ss-cmd-label">' + _esc((window._lang === 'en' ? item.label_en : item.label)) + '</span><span class="ss-cmd-cat">' + _esc(item.category) + '</span></div>';
      }).join('') : '',
      tableResults.length ? '<div class="ss-cmd-group-label">' + _esc(_t('Bang', 'Tables')) + '</div>' + tableResults.map(function(tbl){
        return '<div class="ss-cmd-item" onclick="Browser.focusTable(\'' + _esc(tbl.id) + '\');CmdPalette.close()"><span class="ss-cmd-icon">T</span><span class="ss-cmd-label">' + _esc(tbl.name) + '</span><span class="ss-cmd-cat">' + _esc(tbl.domain || '') + '</span></div>';
      }).join('') : '',
      (!commandResults.length && !tableResults.length) ? '<div class="ss-cmd-empty">' + _esc(_t('Khong tim thay', 'No results')) + '</div>' : ''
    ].join('');
  },

  execute: function(index){
    var item = CmdPalette._filteredCommands[index];
    CmdPalette.close();
    if(item && typeof item.action === 'function') item.action();
  }
};

CmdPalette.COMMANDS = CmdPalette.COMMANDS.concat([
  { icon:'◎', label:'Xem theo domain', label_en:'Switch to domain view', category:'view', action:function(){ Browser.setView('domains'); } },
  { icon:'≣', label:'Xem theo bảng', label_en:'Switch to table view', category:'view', action:function(){ Browser.setView('tables'); } },
  { icon:'◉', label:'Chỉ hiện domain của bảng đang chọn', label_en:'Isolate selected table domain', category:'view', action:function(){ Browser.focusSelectedDomain(); } },
  { icon:'⌘', label:'Tập trung vùng lân cận của bảng chọn', label_en:'Focus selected table neighborhood', category:'view', action:function(){ Browser.focusNeighborhood(); } }
]);

var SchemaLib = {
  _autoLoadedSystem: false,

  withSystemEntries: function(designs){
    var items = Array.isArray(designs) ? designs.slice() : [];
    items.unshift({
      id: '__system_registry__',
      name: _t('HESEM System Registry', 'HESEM System Registry'),
      version: 'registry',
      updatedAt: '',
      author: 'system',
      tableCount: 528,
      isSystem: true
    });
    return items;
  },

  loadList: function(){
    return _api('schema_studio_list', {}, 'POST').then(function(res){
      var savedDesigns = res.designs || [];
      STORE.designs = SchemaLib.withSystemEntries(savedDesigns);
      SchemaLib.renderSelector();
      if(!savedDesigns.length && !SchemaLib._autoLoadedSystem && !STORE.currentDesignId && STORE.schema && !((STORE.schema.tables || []).length)){
        SchemaLib._autoLoadedSystem = true;
        return SchemaLib.loadSystemRegistry(true);
      }
    }).catch(function(){
      STORE.designs = SchemaLib.withSystemEntries([]);
      SchemaLib.renderSelector();
      if(!SchemaLib._autoLoadedSystem && !STORE.currentDesignId && STORE.schema && !((STORE.schema.tables || []).length)){
        SchemaLib._autoLoadedSystem = true;
        return SchemaLib.loadSystemRegistry(true);
      }
    });
  },

  renderSelector: function(){
    var select = document.getElementById('ss-schema-select');
    var currentValue = STORE.currentDesignId || '';
    if(!select) return;
    select.innerHTML = '<option value="">' + _esc(_t('-- Chọn schema --', '-- Select schema --')) + '</option>' + (STORE.designs || []).map(function(item){
      return '<option value="' + _esc(item.id) + '"' + (item.id === currentValue ? ' selected' : '') + '>' + _esc(item.name) + (item.isSystem ? ' [' + _esc(_t('Hệ thống', 'System')) + ']' : '') + '</option>';
    }).join('') + '<option value="__new__">+ ' + _esc(_t('Tạo mới', 'Create new')) + '</option><option value="__load_live__">DB ' + _esc(_t('Nạp từ DB', 'Load DB')) + '</option>';
  },

  onSelectChange: function(value){
    if(value === '__new__'){
      SchemaLib.createNew();
      return;
    }
    if(value === '__load_live__'){
      SchemaLib.loadFromLiveDB();
      return;
    }
    if(value === '__system_registry__'){
      SchemaLib.loadSystemRegistry(false);
      return;
    }
    if(value){
      SchemaLib.load(value);
    }
  },

  createNew: function(){
    var name = window.prompt(_t('Tên schema mới', 'New schema name'), 'schema_studio');
    if(!name) return;
    STORE.schema = createBlankSchemaDoc(name);
    STORE.currentDesignId = STORE.schema._meta.id;
    STORE.baseline = null;
    STORE.undo = [];
    STORE.redo = [];
    STORE.dirty = true;
    renderShell();
    Canvas.render();
    Browser.render();
    Inspector.close();
    toast(_t('Đã tạo schema mới', 'Created new schema'), 'success');
  },

  load: function(designId){
    return _api('schema_studio_get', { id:designId }, 'POST').then(function(res){
      var schema = res.schema;
      var draft = loadDraft(designId);
      if(draft){
        try{
          var draftDoc = JSON.parse(draft);
          var draftTime = new Date((draftDoc._meta && draftDoc._meta.updatedAt) || 0).getTime();
          var serverTime = new Date((schema._meta && schema._meta.updatedAt) || 0).getTime();
          if(draftTime > serverTime && window.confirm(_t('Co ban nhap chua luu. Dung ban nhap?', 'An unsaved draft exists. Use the draft?'))){
            schema = draftDoc;
          }
        }catch(ignoreErr){}
      }
      STORE.schema = schema;
      STORE.currentDesignId = designId;
      STORE.baseline = res.baseline || null;
      STORE.undo = [];
      STORE.redo = [];
      STORE.dirty = false;
      renderShell();
      Canvas.render();
      Browser.render();
      Inspector.close();
      setTimeout(function(){ Canvas.zoomToFit(); }, 120);
    }).catch(function(err){
      toast(_t('Khong tai duoc schema', 'Failed to load schema') + ': ' + (err.message || ''), 'error');
    });
  },

  save: function(){
    if(!STORE.schema) return Promise.resolve();
    STORE.schema._meta = STORE.schema._meta || {};
    STORE.schema._meta.updatedAt = new Date().toISOString();
    STORE.schema._meta.author = currentUsername();
    return _api('schema_studio_save', { schema:STORE.schema }, 'POST').then(function(res){
      STORE.currentDesignId = res.id || STORE.currentDesignId;
      STORE.dirty = false;
      clearDraft(STORE.currentDesignId);
      renderToolbar(refs.toolbar);
      SchemaLib.loadList();
      toast(_t('Đã lưu schema', 'Schema saved'), 'success');
    }).catch(function(err){
      toast(_t('Không lưu được schema', 'Failed to save schema') + ': ' + (err.message || ''), 'error');
    });
  },

  loadSystemRegistry: function(silent){
    return _api('schema_studio_load_registry', {}, 'POST').then(function(res){
      if(res && res.schema){
        STORE.schema = res.schema;
        STORE.currentDesignId = '__system_registry__';
        STORE.baseline = null;
        STORE.undo = [];
        STORE.redo = [];
        STORE.dirty = false;
        STORE.schema._meta = STORE.schema._meta || {};
        STORE.schema._meta.source = 'system_registry';
        renderShell();
        Canvas.render();
        Browser.render();
        Inspector.close();
        setTimeout(function(){ Canvas.zoomToFit(); }, 120);
        if(!silent){
          toast(_t('Đã nạp schema hệ thống từ registry', 'Loaded system schema from registry'), 'success');
        }
      }
    }).catch(function(err){
      toast(_t('Không nạp được schema hệ thống', 'Failed to load system schema') + ': ' + (err.message || ''), 'error');
    });
  },

  loadFromLiveDB: function(){
    return _api('schema_studio_reverse_engineer', {}, 'POST').then(function(res){
      if(res && res.schema){
        STORE.schema = res.schema;
        STORE.currentDesignId = null;
        STORE.baseline = null;
        STORE.dirty = true;
        renderShell();
        Canvas.render();
        Browser.render();
        setTimeout(function(){ Canvas.zoomToFit(); }, 120);
        toast(_t('Đã nạp schema từ DB', 'Loaded schema from DB'), 'success');
      }
    }).catch(function(err){
      toast(_t('Không reverse engineer được DB', 'Failed to reverse engineer DB') + ': ' + (err.message || ''), 'error');
    });
  }
};

function switchMode(mode){
  STORE.mode = mode;
  if(mode === 'code'){
    STORE.codePanel.open = true;
  } else if(mode === 'validate'){
    STORE.validation.ran = true;
  } else if(mode === 'diff'){
    MigGen.renderPreview();
    STORE.mode = 'canvas';
    return;
  } else {
    STORE.codePanel.open = false;
  }
  renderShell();
  if(STORE.codePanel.open) CodePanel.render();
  if(STORE.validation.ran) Validator.renderPanel();
}

function renderToolbar(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện thanh trình duyệt (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện thanh trình duyệt', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span>' + _esc(_t('Trình duyệt', 'Browser')) + '</button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

function renderShell(){
  if(!refs.page) return;
  refs.page.innerHTML = [
    '<div class="ss-root' + (STORE.codePanel.open ? ' code-open' : '') + (STORE.browser.open ? '' : ' browser-collapsed') + '">',
      '<div class="ss-toolbar" id="ss-toolbar"></div>',
      '<div class="ss-browser" id="ss-browser"></div>',
      '<div class="ss-canvas-wrap" id="ss-canvas-wrap"></div>',
      '<div class="ss-inspector" id="ss-inspector"></div>',
      '<div class="ss-code-panel" id="ss-code-panel"></div>',
      '<div class="ss-validation-panel" id="ss-validation-panel"' + (STORE.mode === 'validate' || STORE.validation.ran ? '' : ' style="display:none"') + '></div>',
    '</div>'
  ].join('');
  refs.root = refs.page.firstElementChild;
  refs.toolbar = document.getElementById('ss-toolbar');
  refs.browser = document.getElementById('ss-browser');
  refs.inspector = document.getElementById('ss-inspector');
  refs.codePanel = document.getElementById('ss-code-panel');
  refs.validationPanel = document.getElementById('ss-validation-panel');
  renderToolbar(refs.toolbar);
  Browser.render();
  Canvas.init(document.getElementById('ss-canvas-wrap'));
  if(STORE.schema){
    Canvas.render();
    Inspector.render();
  } else {
    Inspector.renderEmpty();
  }
  if(STORE.codePanel.open){
    CodePanel.render();
  } else if(refs.codePanel){
    refs.codePanel.innerHTML = '';
  }
  if(STORE.mode === 'validate' || STORE.validation.ran){
    refs.validationPanel.style.display = '';
    Validator.renderPanel();
  }
}

function isActivePage(){
  return !!(refs.page && refs.page.classList.contains('active'));
}

function bindKeyboard(){
  if(keyboardBound) return;
  keyboardBound = true;
  document.addEventListener('keydown', function(ev){
    var ctrl = ev.ctrlKey || ev.metaKey;
    var inEditable = !!(document.activeElement && (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable));
    var selectedTableIds;
    if(!isActivePage()) return;
    if(ctrl && ev.key.toLowerCase() === 'k'){
      ev.preventDefault();
      CmdPalette.open();
      return;
    }
    if(!ctrl && !inEditable && ev.key.toLowerCase() === 'b'){
      ev.preventDefault();
      Browser.toggleOpen();
      return;
    }
    if(ctrl && ev.key.toLowerCase() === 's'){
      ev.preventDefault();
      SchemaLib.save();
      return;
    }
    if(ctrl && ev.key.toLowerCase() === 'z'){
      ev.preventDefault();
      undo();
      return;
    }
    if(ctrl && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))){
      ev.preventDefault();
      redo();
      return;
    }
    if(ctrl && ev.key.toLowerCase() === 'c'){
      if(inEditable) return;
      selectedTableIds = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; });
      if(selectedTableIds.length){
        STORE.clipboard = {
          tables: selectedTableIds.map(function(id){ return _clone(findTable(id)); }).filter(Boolean)
        };
        toast(_t('Da copy ' + selectedTableIds.length + ' bang', 'Copied ' + selectedTableIds.length + ' table(s)'), 'info');
        ev.preventDefault();
      }
      return;
    }
    if(ctrl && ev.key.toLowerCase() === 'v'){
      if(inEditable) return;
      if(STORE.clipboard && STORE.clipboard.tables && STORE.clipboard.tables.length){
        pushUndo();
        Canvas.clearSelection();
        STORE.clipboard.tables.forEach(function(tbl){
          var newTbl = _clone(tbl);
          newTbl.id = _uid();
          newTbl.name = generateUniqueTableName(tbl.name + '_copy');
          newTbl.canvas.x += 40;
          newTbl.canvas.y += 40;
          newTbl.columns = (newTbl.columns || []).map(function(col){
            return Object.assign({}, col, { id:_uid(), foreign_key:null });
          });
          STORE.schema.tables.push(newTbl);
          STORE.canvas.selection.push({ kind:'table', id:newTbl.id });
        });
        VirtualRenderer.reset();
        Canvas.syncSelectionClasses();
        Browser.render();
        markDirty();
        saveDraft();
        toast(_t('Da paste ' + STORE.clipboard.tables.length + ' bang', 'Pasted ' + STORE.clipboard.tables.length + ' table(s)'), 'success');
        ev.preventDefault();
      }
      return;
    }
    if(ctrl && ev.key.toLowerCase() === 'd'){
      if(inEditable) return;
      var selected = STORE.canvas.selection[0];
      if(selected && selected.kind === 'table'){
        ev.preventDefault();
        TableCard.duplicate(selected.id);
      }
      return;
    }
    if(ctrl && ev.key === '0'){
      ev.preventDefault();
      Canvas.zoomReset();
      return;
    }
    if(ctrl && (ev.key === '=' || ev.key === '+')){
      ev.preventDefault();
      Canvas.zoomIn();
      return;
    }
    if(ctrl && ev.key === '-'){
      ev.preventDefault();
      Canvas.zoomOut();
      return;
    }
    if(ev.key === 'Delete' || ev.key === 'Backspace'){
      if(inEditable) return;
      var active = STORE.canvas.selection[0];
      if(active && active.kind === 'table'){
        TableCard.confirmDelete(active.id);
      }
      if(active && active.kind === 'edge'){
        Inspector.removeRelation(active.id);
      }
      return;
    }
    if(ev.key === 'Escape'){
      Canvas.clearSelection();
      Inspector.close();
      CmdPalette.close();
    }
  });
}

function renderToolbar(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span>' + _esc(_t('Trình duyệt', 'Browser')) + '</button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

Browser.render = function(){
  var tables;
  var filtered;
  var allGroups;
  var filteredGroups;
  var domains;
  var filter;
  var filterActive;
  var stats;
  var sortedTables;
  var selectedTableMap = {};
  var relatedCountMap = {};
  var searchMeta;
  if(!refs.browser) return;
  tables = Browser.getAllTables();
  filtered = Browser.getVisibleTables();
  allGroups = Browser.groupTables(tables);
  filteredGroups = Browser.groupTables(filtered);
  domains = Object.keys(allGroups).sort(function(a, b){
    return formatDomainLabel(a).localeCompare(formatDomainLabel(b));
  });
  filter = String(STORE.browser.filter || '').trim();
  filterActive = !!filter;
  stats = Browser.getDomainStats();
  Browser.getSelectedTables().forEach(function(tbl){
    selectedTableMap[tbl.id] = true;
  });
  ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
    relatedCountMap[rel.from_table_id] = (relatedCountMap[rel.from_table_id] || 0) + 1;
    relatedCountMap[rel.to_table_id] = (relatedCountMap[rel.to_table_id] || 0) + 1;
  });
  sortedTables = filtered.slice().sort(function(a, b){
    var aSelected = selectedTableMap[a.id] ? 0 : 1;
    var bSelected = selectedTableMap[b.id] ? 0 : 1;
    var domainCompare;
    if(aSelected !== bSelected) return aSelected - bSelected;
    domainCompare = formatDomainLabel(a.domain || 'default').localeCompare(formatDomainLabel(b.domain || 'default'));
    if(domainCompare !== 0) return domainCompare;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  searchMeta = filterActive
    ? _t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')
    : (STORE.browser.view === 'tables'
      ? _t('Nhấp để chọn, nhấp đúp để đưa bảng vào giữa màn hình', 'Click to select, double-click to focus a table')
      : _t('Nhấp đúp vào bảng để đưa vào giữa màn hình', 'Double-click a table to focus it on canvas'));
  if(!STORE.browser.open){
    refs.browser.innerHTML = [
      '<div class="ss-browser-collapsed-shell">',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">▸</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'domains\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '" aria-label="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '">◎</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'tables\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '" aria-label="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '">≣</button>',
        '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
      '</div>'
    ].join('');
    return;
  }
  refs.browser.innerHTML = [
    '<div class="ss-browser-header">',
      '<div class="ss-browser-header-top">',
        '<div class="ss-browser-title-group"><div class="ss-browser-title">' + _esc(_t('Trình duyệt schema', 'Schema browser')) + '</div></div>',
        '<div class="ss-browser-tools">',
          '<button class="ss-browser-tool" type="button" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible tables to save space')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">⤢</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus the neighborhood of the selected table')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus neighborhood')) + '">⌘</button>',
        '</div>',
      '</div>',
      '<div class="ss-browser-summary"><span class="ss-browser-summary-pill"><strong>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + '</strong><span>' + _esc(_t('bảng đang hiện', 'tables visible')) + '</span></span><span class="ss-browser-summary-pill"><strong>' + String(stats.visibleDomains) + '/' + String(stats.totalDomains) + '</strong><span>' + _esc(_t('domain', 'domains')) + '</span></span><span class="ss-browser-summary-pill"><strong>' + String(stats.hiddenDomains) + '</strong><span>' + _esc(_t('domain đang ẩn', 'hidden domains')) + '</span></span></div>',
    '</div>',
    '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /><div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>' + (STORE.browser.view === 'domains' ? '<div class="ss-domain-chip-strip"><button class="ss-domain-chip ss-domain-chip-reset' + (!stats.hiddenDomains && !STORE.browser.isolatedDomain ? ' active' : '') + '" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện toàn bộ domain', 'Show every domain')) + '"><span class="ss-domain-chip-label">' + _esc(_t('Tất cả', 'All')) + '</span><strong>' + String(stats.totalDomains) + '</strong></button>' + domains.map(function(domain){ var totalCount = (allGroups[domain] || []).length; var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(_t('Bấm để chỉ hiện domain này', 'Click to isolate this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div>' : '') + '</div>',
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var hidden = Browser.isDomainHidden(tbl.domain || 'default'); var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (domains.length ? domains.filter(function(domain){ return !filterActive || ((filteredGroups[domain] || []).length > 0); }).map(function(domain){ var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; var totalCount = (allGroups[domain] || []).length; var tablesForDomain = filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || []); var expanded = hidden ? false : (filterActive ? true : STORE.browser.expandedDomains[domain] !== false); return ['<div class="ss-domain-group' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" data-domain="' + _esc(domain) + '">','<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">','<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>','<span class="ss-domain-name">' + _esc(formatDomainLabel(domain)) + '</span>', hidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '','<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(isolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(isolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(domain) + '\', event)" title="' + _esc(hidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(hidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div>','<span class="ss-domain-count">' + String(filterActive ? tablesForDomain.length : totalCount) + '</span>','</div>', expanded ? '<div class="ss-domain-tables">' + tablesForDomain.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item' + (active ? ' active' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : (hidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : ''),'</div>'].join(''); }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có bảng nào', 'No tables yet')) + '</div></div>')) + '</div>',
    '<div class="ss-browser-footer"><div class="ss-browser-footer-meta"><span>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + ' ' + _esc(_t('bảng', 'tables')) + '</span><span>&middot;</span><span>' + String(stats.hiddenDomains) + ' ' + _esc(_t('domain đang ẩn', 'hidden domains')) + '</span></div><div class="ss-browser-footer-actions"><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Browser.showAllDomains()">' + _esc(_t('Hiện tất cả', 'Show all')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Browser.focusSelectedDomain()">' + _esc(_t('Domain của bảng chọn', 'Selected table domain')) + '</button></div></div>'
  ].join('');
};

Browser.resolveActiveDomain = function(allGroups, filteredGroups, filterActive){
  var domains = Object.keys(allGroups || {});
  var active = STORE.browser.activeDomain || STORE.browser.isolatedDomain || '';
  var visibleCandidates;
  if(!domains.length) return '';
  if(active && domains.indexOf(active) >= 0 && (!filterActive || ((filteredGroups[active] || []).length > 0))){
    return active;
  }
  visibleCandidates = domains.filter(function(domain){
    if(filterActive && !(filteredGroups[domain] || []).length) return false;
    return Browser.isDomainVisible(domain);
  });
  if(visibleCandidates.length) return visibleCandidates[0];
  return domains.filter(function(domain){
    return !filterActive || ((filteredGroups[domain] || []).length > 0);
  })[0] || domains[0];
};

Browser.setActiveDomain = function(domain){
  if(!domain) return;
  STORE.browser.activeDomain = domain;
  saveUiPrefs();
  Browser.render();
};

Browser.focusSelectedDomain = function(){
  var selected = Browser.getSelectedTables()[0];
  if(!selected){
    toast(_t('Hãy chọn một bảng trước', 'Select a table first'), 'info');
    return;
  }
  STORE.browser.activeDomain = selected.domain || 'default';
  Browser.setView('domains');
  Browser.isolateDomain(STORE.browser.activeDomain);
};

function buildHeaderStatusHTML(stats){
  return [
    '<div class="doc-toolbar-shell ss-header-toolbar-shell">',
      '<div class="ss-toolbar-status">',
        '<span class="ss-toolbar-status-pill"><strong>' + String(stats.visibleTables) + '/' + String(stats.totalTables) + '</strong><span>' + _esc(_t('bảng đang hiển thị', 'tables visible')) + '</span></span>',
        '<span class="ss-toolbar-status-pill"><strong>' + String(stats.visibleDomains) + '/' + String(stats.totalDomains) + '</strong><span>' + _esc(_t('miền', 'domains')) + '</span></span>',
        '<span class="ss-toolbar-status-pill"><strong>' + String(stats.hiddenDomains) + '</strong><span>' + _esc(_t('miền đang ẩn', 'hidden domains')) + '</span></span>',
      '</div>',
    '</div>'
  ].join('');
}

function renderHeaderStatus(){
  var breadcrumb = document.getElementById('header-breadcrumb');
  var stats;
  if(typeof window.setDocHeaderToolbar !== 'function') return;
  if(!refs.page || !refs.root || !document.body.contains(refs.page)){
    window.setDocHeaderToolbar('');
    if(breadcrumb) breadcrumb.classList.remove('ss-has-doc-toolbar');
    return;
  }
  stats = Browser.getDomainStats ? Browser.getDomainStats() : {
    visibleTables: 0,
    totalTables: 0,
    visibleDomains: 0,
    totalDomains: 0,
    hiddenDomains: 0
  };
  window.setDocHeaderToolbar(buildHeaderStatusHTML(stats));
  if(breadcrumb) breadcrumb.classList.add('ss-has-doc-toolbar');
}

function renderToolbar(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn ss-toolbar-icon-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span></button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible view')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">⤢</button><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus selected table neighborhood')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus selected table neighborhood')) + '">⌘</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
  renderHeaderStatus();
}

Browser.render = function(){
  var tables;
  var filtered;
  var allGroups;
  var filteredGroups;
  var domains;
  var filter;
  var filterActive;
  var stats;
  var sortedTables;
  var selectedTableMap = {};
  var relatedCountMap = {};
  var searchMeta;
  var domainCandidates;
  var activeDomain;
  var activeDomainTables;
  var activeHidden;
  var activeIsolated;
  var activeDomainColor;
  if(!refs.browser) return;
  refs.browser.classList.toggle('is-domain-view', STORE.browser.view === 'domains' && !!STORE.browser.open);
  refs.browser.classList.toggle('is-table-view', STORE.browser.view === 'tables' && !!STORE.browser.open);
  tables = Browser.getAllTables();
  filtered = Browser.getVisibleTables();
  allGroups = Browser.groupTables(tables);
  filteredGroups = Browser.groupTables(filtered);
  domains = Object.keys(allGroups).sort(function(a, b){
    return formatDomainLabel(a).localeCompare(formatDomainLabel(b));
  });
  filter = String(STORE.browser.filter || '').trim();
  filterActive = !!filter;
  stats = Browser.getDomainStats();
  Browser.getSelectedTables().forEach(function(tbl){
    selectedTableMap[tbl.id] = true;
  });
  ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
    relatedCountMap[rel.from_table_id] = (relatedCountMap[rel.from_table_id] || 0) + 1;
    relatedCountMap[rel.to_table_id] = (relatedCountMap[rel.to_table_id] || 0) + 1;
  });
  sortedTables = filtered.slice().sort(function(a, b){
    var aSelected = selectedTableMap[a.id] ? 0 : 1;
    var bSelected = selectedTableMap[b.id] ? 0 : 1;
    var domainCompare;
    if(aSelected !== bSelected) return aSelected - bSelected;
    domainCompare = formatDomainLabel(a.domain || 'default').localeCompare(formatDomainLabel(b.domain || 'default'));
    if(domainCompare !== 0) return domainCompare;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  domainCandidates = domains.filter(function(domain){
    return !filterActive || ((filteredGroups[domain] || []).length > 0);
  });
  activeDomain = Browser.resolveActiveDomain(allGroups, filteredGroups, filterActive);
  STORE.browser.activeDomain = activeDomain;
  activeDomainTables = activeDomain ? (filterActive ? (filteredGroups[activeDomain] || []) : (allGroups[activeDomain] || [])) : [];
  activeHidden = !!(activeDomain && Browser.isDomainHidden(activeDomain));
  activeIsolated = !!(activeDomain && STORE.browser.isolatedDomain === activeDomain);
  activeDomainColor = activeDomain ? (DOMAIN_COLORS[activeDomain] || DOMAIN_COLORS.default) : DOMAIN_COLORS.default;
  searchMeta = filterActive
    ? _t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')
    : (STORE.browser.view === 'tables'
      ? _t('Nhấp để chọn, nhấp đúp để đưa bảng vào giữa màn hình', 'Click to select, double-click to focus a table')
      : _t('Chọn domain ở trên để xem bảng của domain đó', 'Select a domain above to see that domain tables'));
  if(!STORE.browser.open){
    refs.browser.classList.remove('is-domain-view');
    refs.browser.classList.remove('is-table-view');
    refs.browser.innerHTML = [
      '<div class="ss-browser-collapsed-shell">',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">▸</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'domains\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '" aria-label="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '">◎</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'tables\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '" aria-label="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '">≣</button>',
        '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
      '</div>'
    ].join('');
    renderHeaderStatus();
    return;
  }
  refs.browser.innerHTML = [
    '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc miền...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />' + (STORE.browser.view === 'domains' ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){ var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length; var hidden = Browser.isDomainHidden(domain); var active = STORE.browser.activeDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn miền này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div>' : '') + '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div></div>',
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var hidden = Browser.isDomainHidden(tbl.domain || 'default'); var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (activeDomain ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : (activeDomainTables.length ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item' + (active ? ' active' : '') + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>',
    ''
  ].join('');
  renderHeaderStatus();
};

function init(page){
  refs.page = page || document.getElementById(PAGE_ID);
  if(!refs.page) return;
  applyUiPrefs(loadUiPrefs());
  if(!STORE.schema){
    STORE.schema = createBlankSchemaDoc(_t('Schema làm việc', 'Workspace schema'));
  }
  renderShell();
  bindKeyboard();
  SchemaLib.loadList();
}

function destroy(){
  var breadcrumb = document.getElementById('header-breadcrumb');
  if(refs.page){
    refs.page.innerHTML = '';
  }
  if(typeof window.setDocHeaderToolbar === 'function'){
    window.setDocHeaderToolbar('');
  }
  if(breadcrumb){
    breadcrumb.classList.remove('ss-has-doc-toolbar');
  }
  refs.root = null;
  refs.toolbar = null;
  refs.browser = null;
  refs.canvasWrap = null;
  refs.inspector = null;
  refs.codePanel = null;
  refs.validationPanel = null;
}

window.STORE = STORE;
window.Canvas = Canvas;
window.EdgeLayer = EdgeLayer;
window.Connector = Connector;
window.TableCard = TableCard;
window.Inspector = Inspector;
window.Browser = Browser;
window.CodePanel = CodePanel;
window.MigGen = MigGen;
window.Validator = Validator;
window.Importer = Importer;
window.Layout = Layout;
window.VirtualRenderer = VirtualRenderer;
window.CmdPalette = CmdPalette;
window.SchemaLib = SchemaLib;
window.switchMode = switchMode;
window.SchemaStudio = { init:init, destroy:destroy };
window._renderSchemaStudio = function(page){
  init(page);
};

})(window);

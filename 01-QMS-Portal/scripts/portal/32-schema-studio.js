(function(window){
'use strict';

var MODULE_ID = 'schema-studio';
var PAGE_ID = 'page-schema-studio';
var LS_PREFIX = 'hesem:schema-studio:';
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
    lastMouseY: 0
  },
  inspector: {
    target: null,
    tab: 'props'
  },
  browser: {
    open: true,
    filter: '',
    expandedDomains: {}
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
  notation: 'crowsfoot'
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

function _t(vi, en){
  var currentLang = window._lang || window.lang || 'vi';
  return currentLang === 'en' ? en : vi;
}

function _api(action, payload, method){
  var reqMethod = String(method || 'POST').toUpperCase();
  var body = payload || {};
  if(typeof window.apiCall === 'function'){
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
  return fetch('api.php?' + qs.toString(), {
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
      '<div class="ss-canvas-bg"></div>',
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
      Canvas.startPan(ev);
    };
    container.onclick = function(ev){
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
    window.addEventListener('resize', function(){
      if(isActivePage()) Canvas.applyTransform();
    });
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
    if(refs.modeIndicator) refs.modeIndicator.textContent = _t('Mode', 'Mode') + ': ' + String(STORE.mode || 'canvas').toUpperCase();
    Canvas.updateGrid();
    Canvas.updateMinimap();
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

  zoomToFit: function(){
    var tables = (STORE.schema && STORE.schema.tables) || [];
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
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.selected'), function(node){ node.classList.remove('selected'); });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group.selected'), function(node){ node.classList.remove('selected'); });
    Browser.render();
  },

  selectTable: function(tableId, add){
    if(!add) STORE.canvas.selection = [];
    STORE.canvas.selection = [{ kind:'table', id:tableId }];
    Canvas.syncSelectionClasses();
    Browser.render();
  },

  selectEdge: function(edgeId){
    STORE.canvas.selection = [{ kind:'edge', id:edgeId }];
    Canvas.syncSelectionClasses();
    Browser.render();
  },

  syncSelectionClasses: function(){
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card'), function(node){
      var active = STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === node.getAttribute('data-table-id'); });
      node.classList.toggle('selected', active);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var active = STORE.canvas.selection.some(function(item){ return item.kind === 'edge' && item.id === node.getAttribute('data-edge-id'); });
      node.classList.toggle('selected', active);
    });
  },

  updateMinimap: function(){
    if(!refs.minimapCanvas) return;
    var ctx = refs.minimapCanvas.getContext('2d');
    var canvas = refs.minimapCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var tables = (STORE.schema && STORE.schema.tables) || [];
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
      ctx.fillStyle = STORE.canvas.selection.some(function(item){ return item.kind === 'table' && item.id === tbl.id; }) ? '#2563eb' : '#94a3b8';
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
    EdgeLayer.renderAll();
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

  updateEdgesForTable: function(tableId){
    if(!EdgeLayer.svgLayer) return;
    Array.prototype.forEach.call(EdgeLayer.svgLayer.querySelectorAll('.ss-edge-group'), function(node){
      var rel = findRelation(node.getAttribute('data-edge-id'));
      if(rel && (rel.from_table_id === tableId || rel.to_table_id === tableId)){
        removeNode(node);
      }
    });
    ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
      if(rel.from_table_id === tableId || rel.to_table_id === tableId){
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
    EdgeLayer.renderAll();
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
    var card = document.createElement('div');
    var domainColor = tbl.color || DOMAIN_COLORS[tbl.domain] || DOMAIN_COLORS.default;
    card.className = 'ss-table-card' + (tbl.canvas.collapsed ? ' collapsed' : '');
    card.id = 'tc_' + tbl.id;
    card.setAttribute('data-table-id', tbl.id);
    card.style.left = tbl.canvas.x + 'px';
    card.style.top = tbl.canvas.y + 'px';
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
          return '<li class="ss-col-item" data-col-id="' + _esc(col.id) + '"><span class="ss-col-icon ' + iconClass + '">' + _esc(icon) + '</span><span class="ss-col-name">' + _esc(col.name) + '</span><span class="ss-col-type">' + _esc(fmtColType(col)) + '</span><span class="ss-col-badges">' + colBadges(col, tbl).map(function(badge){ return '<span class="ss-col-badge ' + _esc(badge.cls) + '">' + _esc(badge.text) + '</span>'; }).join('') + '</span><span class="ss-fk-port" data-port-col="' + _esc(col.id) + '" title="' + _esc(_t('Keo de tao FK', 'Drag to create FK')) + '"></span></li>';
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
      Canvas.selectTable(tbl.id);
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
    var tbl = findTable(tableId);
    if(!tbl) return;
    pushUndo();
    Canvas.selectTable(tableId);
    var startX = ev.clientX;
    var startY = ev.clientY;
    var originX = tbl.canvas.x;
    var originY = tbl.canvas.y;
    function onMove(moveEv){
      var deltaX = (moveEv.clientX - startX) / STORE.canvas.zoom;
      var deltaY = (moveEv.clientY - startY) / STORE.canvas.zoom;
      tbl.canvas.x = Math.round(originX + deltaX);
      tbl.canvas.y = Math.round(originY + deltaY);
      var card = document.getElementById('tc_' + tableId);
      if(card){
        card.style.left = tbl.canvas.x + 'px';
        card.style.top = tbl.canvas.y + 'px';
      }
      EdgeLayer.updateEdgesForTable(tableId);
      Canvas.updateMinimap();
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
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
      EdgeLayer.renderAll();
      Inspector.open({ kind:'table', tableId:tableId });
      markDirty();
      saveDraft();
    });
  },

  reRender: function(tableId){
    var node = document.getElementById('tc_' + tableId);
    if(node) removeNode(node);
    var tbl = findTable(tableId);
    if(tbl) TableCard.renderTable(tbl);
    Canvas.syncSelectionClasses();
    EdgeLayer.updateEdgesForTable(tableId);
    Canvas.updateMinimap();
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

  renderAll: function(){
    if(!refs.tablesLayer) return;
    refs.tablesLayer.innerHTML = '';
    ((STORE.schema && STORE.schema.tables) || []).forEach(function(tbl){ TableCard.renderTable(tbl); });
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
    refs.inspector.innerHTML = '<div class="ss-empty-state"><div><div class="ss-empty-icon">O</div><div>' + _esc(_t('Chon bang hoac cot de chinh sua', 'Select a table or column to edit')) + '</div><div class="ss-field-hint">' + _esc(_t('Canvas o giua, inspector o ben phai.', 'Canvas in the middle, inspector on the right.')) + '</div></div></div>';
  },


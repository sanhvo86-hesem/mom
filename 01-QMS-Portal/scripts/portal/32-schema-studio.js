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
var resizeBound = false;

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
    EdgeLayer.renderAll();
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
    EdgeLayer.renderAll();
    TableCard.reRender(rel.from_table_id);
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
    EdgeLayer.renderAll();
    TableCard.reRender(rel.from_table_id);
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

var Browser = {
  render: function(){
    var tables;
    var filtered;
    var groups = {};
    var domains;
    if(!refs.browser) return;
    tables = (STORE.schema && STORE.schema.tables) || [];
    filtered = STORE.browser.filter ? tables.filter(function(tbl){
      var filter = STORE.browser.filter.toLowerCase();
      return String(tbl.name || '').toLowerCase().indexOf(filter) >= 0 || String(tbl.domain || '').toLowerCase().indexOf(filter) >= 0;
    }) : tables.slice();
    filtered.forEach(function(tbl){
      var domain = tbl.domain || 'default';
      if(!groups[domain]) groups[domain] = [];
      groups[domain].push(tbl);
    });
    domains = Object.keys(groups).sort();
    refs.browser.innerHTML = [
      '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tim bang...', 'Search tables...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /></div>',
      '<div class="ss-browser-list">',
        domains.length ? domains.map(function(domain){
          var expanded = STORE.browser.expandedDomains[domain] !== false;
          return [
            '<div class="ss-domain-group" data-domain="' + _esc(domain) + '">',
              '<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">',
                '<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>',
                '<span class="ss-domain-name">' + _esc(domain.replace(/_/g, ' ')) + '</span>',
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
        }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chua co bang nao', 'No tables yet')) + '</div></div>',
      '</div>',
      '<div class="ss-browser-footer"><span>' + String(tables.length) + ' ' + _esc(_t('bang', 'tables')) + '</span><span>&middot;</span><span>' + String(domains.length) + ' domains</span><button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="TableCard.createNew(100,100)">+ ' + _esc(_t('Tao bang', 'New table')) + '</button></div>'
    ].join('');
  },

  onFilter: function(value){
    STORE.browser.filter = value || '';
    Browser.render();
  },

  toggleDomain: function(domain){
    STORE.browser.expandedDomains[domain] = STORE.browser.expandedDomains[domain] === false ? true : false;
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
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    el = document.getElementById('tc_' + tableId);
    if(el){
      el.classList.add('ss-highlight-pulse');
      setTimeout(function(){ el.classList.remove('ss-highlight-pulse'); }, 1000);
    }
  }
};

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
      toast(_t('Da dat baseline', 'Baseline saved'), 'success');
    }).catch(function(err){
      toast(_t('Khong dat duoc baseline', 'Failed to save baseline') + ': ' + (err.message || ''), 'error');
    });
  },

  renderPreview: function(){
    var diff;
    var sql;
    var overlay;
    if(!STORE.schema) return;
    if(!STORE.baseline){
      toast(_t('Chua co baseline. Hay dat baseline truoc.', 'No baseline set yet. Save a baseline first.'), 'error');
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
    toast(_t('Da copy SQL', 'Copied SQL'), 'success');
  },

  applyMigration: function(){
    var diff = STORE.migration.diff || { destructive:[] };
    confirm2(_t('Ap dung migration len database?', 'Apply migration to the database?'), diff.destructive.length > 0).then(function(ok){
      if(!ok) return;
      return _api('schema_studio_apply_migration', {
        sql: STORE.migration.previewSql || '',
        design_id: STORE.currentDesignId || (STORE.schema && STORE.schema._meta && STORE.schema._meta.id) || null,
        allow_destructive: diff.destructive.length > 0
      }).then(function(){
        STORE.baseline = _clone(STORE.schema);
        MigGen.closePreview();
        toast(_t('Migration thanh cong', 'Migration applied'), 'success');
      }).catch(function(err){
        toast(_t('Migration that bai', 'Migration failed') + ': ' + (err.message || ''), 'error');
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
    Validator._fixes = {};
    if(!schema){
      STORE.validation.results = [];
      STORE.validation.ran = true;
      Validator.renderPanel();
      return [];
    }
    (schema.tables || []).forEach(function(tbl){
      if(tableNames[tbl.name]){
        Validator.addResult(results, { level:'error', code:'E03', tableId:tbl.id, table:tbl.name, msg:_t('Bang bi trung ten: ' + tbl.name, 'Duplicate table name: ' + tbl.name) });
      }
      tableNames[tbl.name] = true;
      if(!(tbl.columns || []).some(function(col){ return col.primary_key; })){
        Validator.addResult(results, { level:'error', code:'E01', tableId:tbl.id, table:tbl.name, msg:_t('Bang "' + tbl.name + '" khong co primary key', 'Table "' + tbl.name + '" has no primary key') });
      }
      if(!isValidIdentifier(tbl.name)){
        Validator.addResult(results, { level:'error', code:'E04', tableId:tbl.id, table:tbl.name, msg:_t('Ten bang khong dung snake_case: ' + tbl.name, 'Table name is not snake_case: ' + tbl.name) });
      }
      (tbl.columns || []).forEach(function(col){
        var dupCount = (tbl.columns || []).filter(function(item){ return item.name === col.name; }).length;
        if(dupCount > 1){
          Validator.addResult(results, { level:'error', code:'E05', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Cot bi trung ten: ' + tbl.name + '.' + col.name, 'Duplicate column: ' + tbl.name + '.' + col.name) });
        }
        if(!isValidIdentifier(col.name)){
          Validator.addResult(results, { level:'error', code:'E06', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Ten cot khong hop le: ' + tbl.name + '.' + col.name, 'Invalid column name: ' + tbl.name + '.' + col.name) });
        }
        if(isReservedWord(col.name)){
          Validator.addResult(results, { level:'error', code:'E07', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('Cot dung tu khoa SQL: ' + tbl.name + '.' + col.name, 'Column uses SQL keyword: ' + tbl.name + '.' + col.name) });
        }
        if(col.type === 'varchar' && !col.length){
          Validator.addResult(results, { level:'warning', code:'W02', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('varchar chua co length: ' + tbl.name + '.' + col.name, 'varchar has no length: ' + tbl.name + '.' + col.name) }, function(){
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
          Validator.addResult(results, { level:'warning', code:'W03', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('UUID PK chua co default uuid_generate_v4(): ' + tbl.name + '.' + col.name, 'UUID PK missing uuid_generate_v4(): ' + tbl.name + '.' + col.name) }, function(){
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
          if(!indexed){
            Validator.addResult(results, { level:'warning', code:'W04', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('FK chua duoc index: ' + tbl.name + '.' + col.name, 'FK is not indexed: ' + tbl.name + '.' + col.name) }, function(){
              pushUndo();
              tbl.indexes = tbl.indexes || [];
              tbl.indexes.push({ id:_uid(), name:'idx_' + tbl.name + '_' + col.name, type:'BTREE', unique:false, columns:[{ name:col.name, order:'ASC' }], where:'', include:[] });
              TableCard.reRender(tbl.id);
              markDirty();
              saveDraft();
              Validator.run();
            });
          }
          if(col.nullable && (!col.foreign_key.on_delete || col.foreign_key.on_delete === 'NO ACTION')){
            Validator.addResult(results, { level:'warning', code:'W05', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('FK nullable chua co ON DELETE: ' + tbl.name + '.' + col.name, 'Nullable FK missing ON DELETE: ' + tbl.name + '.' + col.name) });
          }
        }
        if(col.type === 'jsonb'){
          var hasGin = (tbl.indexes || []).some(function(idx){
            return String(idx.type || '').toUpperCase() === 'GIN' && (idx.columns || []).some(function(ic){ return ic.name === col.name; });
          });
          if(!hasGin){
            Validator.addResult(results, { level:'warning', code:'W06', tableId:tbl.id, colId:col.id, table:tbl.name, col:col.name, msg:_t('jsonb chua co GIN index: ' + tbl.name + '.' + col.name, 'jsonb missing GIN index: ' + tbl.name + '.' + col.name) });
          }
        }
      });
      if((tbl.columns || []).length > 15 && !(tbl.indexes || []).length){
        Validator.addResult(results, { level:'warning', code:'W07', tableId:tbl.id, table:tbl.name, msg:_t('Bang lon nhung chua co index: ' + tbl.name, 'Large table has no indexes: ' + tbl.name) });
      }
      if(!(tbl.columns || []).some(function(col){ return col.name === 'created_at'; }) || !(tbl.columns || []).some(function(col){ return col.name === 'updated_at'; })){
        Validator.addResult(results, { level:'warning', code:'W01', tableId:tbl.id, table:tbl.name, msg:_t('Bang thieu created_at/updated_at: ' + tbl.name, 'Table missing created_at/updated_at: ' + tbl.name) }, function(){
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
        Validator.addResult(results, { level:'info', code:'I01', tableId:tbl.id, table:tbl.name, msg:_t('Bang chua co comment: ' + tbl.name, 'Table has no comment: ' + tbl.name) });
      }
      if(tbl.rls_enabled){
        Validator.addResult(results, { level:'info', code:'I02', tableId:tbl.id, table:tbl.name, msg:_t('Bang dang bat RLS, nho viet policy trong migration: ' + tbl.name, 'RLS enabled - remember policies in migration: ' + tbl.name) });
      }
    });
    (schema.relations || []).forEach(function(rel){
      var toTbl = findTable(rel.to_table_id);
      var toCol = findCol(rel.to_table_id, rel.to_col_id);
      if(!toTbl || !toCol){
        Validator.addResult(results, { level:'error', code:'E02', tableId:rel.from_table_id, msg:_t('Relation bi hong: ' + (rel.name || rel.id), 'Broken relation: ' + (rel.name || rel.id)) });
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
    renderShell();
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

var SchemaLib = {
  loadList: function(){
    return _api('schema_studio_list', {}, 'POST').then(function(res){
      STORE.designs = res.designs || [];
      SchemaLib.renderSelector();
    }).catch(function(){
      STORE.designs = [];
      SchemaLib.renderSelector();
    });
  },

  renderSelector: function(){
    var select = document.getElementById('ss-schema-select');
    if(!select) return;
    select.innerHTML = '<option value="">' + _esc(_t('-- Chon schema --', '-- Select schema --')) + '</option>' + (STORE.designs || []).map(function(item){
      return '<option value="' + _esc(item.id) + '"' + (item.id === STORE.currentDesignId ? ' selected' : '') + '>' + _esc(item.name) + '</option>';
    }).join('') + '<option value="__new__">+ ' + _esc(_t('Tao moi', 'Create new')) + '</option><option value="__load_live__">DB ' + _esc(_t('Load DB', 'Load DB')) + '</option>';
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
    if(value){
      SchemaLib.load(value);
    }
  },

  createNew: function(){
    var name = window.prompt(_t('Ten schema moi', 'New schema name'), 'schema_studio');
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
    toast(_t('Da tao schema moi', 'Created new schema'), 'success');
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
      toast(_t('Da luu schema', 'Schema saved'), 'success');
    }).catch(function(err){
      toast(_t('Khong luu duoc schema', 'Failed to save schema') + ': ' + (err.message || ''), 'error');
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
        toast(_t('Da load schema tu DB', 'Loaded schema from DB'), 'success');
      }
    }).catch(function(err){
      toast(_t('Khong reverse engineer duoc DB', 'Failed to reverse engineer DB') + ': ' + (err.message || ''), 'error');
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
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">Canvas</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">Code</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">Validate</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">Migration</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">Reset</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Import', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Baseline', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Luu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

function renderShell(){
  if(!refs.page) return;
  refs.page.innerHTML = [
    '<div class="ss-root' + (STORE.codePanel.open ? ' code-open' : '') + '">',
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
    if(!isActivePage()) return;
    if(ctrl && ev.key.toLowerCase() === 'k'){
      ev.preventDefault();
      CmdPalette.open();
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
    if(ctrl && ev.key.toLowerCase() === 'd'){
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
      if(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
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

function init(page){
  refs.page = page || document.getElementById(PAGE_ID);
  if(!refs.page) return;
  if(!STORE.schema){
    STORE.schema = createBlankSchemaDoc(_t('Workspace schema', 'Workspace schema'));
  }
  renderShell();
  bindKeyboard();
  SchemaLib.loadList();
}

function destroy(){
  if(refs.page){
    refs.page.innerHTML = '';
  }
  refs.root = null;
  refs.toolbar = null;
  refs.browser = null;
  refs.canvasWrap = null;
  refs.inspector = null;
  refs.codePanel = null;
  refs.validationPanel = null;
}

window.switchMode = switchMode;
window.SchemaStudio = { init:init, destroy:destroy };
window._renderSchemaStudio = function(page){
  init(page);
};

})(window);

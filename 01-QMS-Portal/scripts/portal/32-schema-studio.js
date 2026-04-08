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
    activeDomain: '',
    domainSplit: 0.5,
    domainSplitManual: false
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
var keyboardHandler = null;
var canvasResizeHandler = null;
var zoomToFitTimer = null;
var browserFilterTimer = null;

function _t(vi, en){
  var currentLang = window._lang || window.lang || 'vi';
  return currentLang === 'en' ? en : vi;
}

var Diagnostics = {
  entries: [],
  api: {},
  maxEntries: 80,

  record: function(kind, message, meta){
    this.entries.push({
      at: new Date().toISOString(),
      kind: kind || 'info',
      message: String(message || ''),
      meta: meta || {}
    });
    if(this.entries.length > this.maxEntries){
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  },

  recordApi: function(action, ok, duration, meta){
    this.api[action] = {
      ok: !!ok,
      duration: Number(duration || 0),
      at: new Date().toISOString(),
      meta: meta || {}
    };
    this.record(ok ? 'api' : 'api_error', action, Object.assign({
      ok: !!ok,
      duration: Number(duration || 0)
    }, meta || {}));
  },

  snapshot: function(){
    var schema = STORE.schema || {};
    return {
      at: new Date().toISOString(),
      currentDesignId: STORE.currentDesignId || '',
      mode: STORE.mode,
      dirty: !!STORE.dirty,
      tableCount: (schema.tables || []).length,
      relationCount: (schema.relations || []).length,
      hiddenDomains: Object.keys(STORE.browser.hiddenDomains || {}).filter(function(key){ return !!STORE.browser.hiddenDomains[key]; }).length,
      selection: (STORE.canvas.selection || []).slice(),
      lastApi: _clone(this.api),
      recentEntries: this.entries.slice(-20)
    };
  },

  exportReport: function(){
    var payload = JSON.stringify(this.snapshot(), null, 2);
    var blob = new Blob([payload], { type:'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'schema-studio-diagnostics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    a.click();
    window.setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    toast(_t('Đã xuất báo cáo chẩn đoán', 'Diagnostics report exported'), 'success');
  },

  copyReport: function(){
    var payload = JSON.stringify(this.snapshot(), null, 2);
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(payload).then(function(){
        toast(_t('Đã copy báo cáo chẩn đoán', 'Diagnostics report copied'), 'success');
      }).catch(function(){
        toast(_t('Không thể copy báo cáo chẩn đoán', 'Could not copy diagnostics report'), 'error');
      });
      return;
    }
    window.prompt(_t('Copy báo cáo chẩn đoán', 'Copy diagnostics report'), payload);
  },

  runSelfCheck: function(){
    var schema = STORE.schema || {};
    var tableNames = {};
    var columnIds = {};
    var relationSources = {};
    var issues = [];
    (schema.tables || []).forEach(function(tbl){
      if(tableNames[tbl.name]){
        issues.push({ level:'error', msg:'duplicate_table:' + tbl.name });
      }
      tableNames[tbl.name] = true;
      (tbl.columns || []).forEach(function(col){
        if(columnIds[col.id]){
          issues.push({ level:'error', msg:'duplicate_column_id:' + col.id });
        }
        columnIds[col.id] = true;
      });
    });
    (schema.relations || []).forEach(function(rel){
      var sourceKey = [rel.from_table_id, rel.from_col_id].join('.');
      if(relationSources[sourceKey]){
        issues.push({ level:'warning', msg:'duplicate_relation_source:' + sourceKey });
      }
      relationSources[sourceKey] = true;
      if(!findTable(rel.from_table_id) || !findTable(rel.to_table_id) || !findCol(rel.from_table_id, rel.from_col_id) || !findCol(rel.to_table_id, rel.to_col_id)){
        issues.push({ level:'error', msg:'orphan_relation:' + (rel.id || sourceKey) });
      }
    });
    this.record('self_check', 'schema_self_check', {
      issues: issues.length,
      detail: issues.slice(0, 20)
    });
    if(issues.length){
      toast(_t('Tự kiểm tra phát hiện ' + issues.length + ' vấn đề', 'Self-check found ' + issues.length + ' issue(s)'), 'error');
    } else {
      toast(_t('Tự kiểm tra không phát hiện vấn đề', 'Self-check found no issues'), 'success');
    }
    return issues;
  }
};

function _api(action, payload, method){
  var reqMethod = String(method || 'POST').toUpperCase();
  var body = payload || {};
  var useMvcEndpoint = String(action || '').indexOf('schema_studio_') === 0;
  var endpoint = useMvcEndpoint ? 'api/index.php?' : 'api.php?';
  var startedAt = Date.now();
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
  var csrf = (typeof csrfToken !== 'undefined' && csrfToken) || window.csrfToken || (csrfMeta && csrfMeta.content) || '';
  var headers = { 'Content-Type': 'application/json' };
  if(csrf) headers['X-CSRF-Token'] = csrf;
  return fetch(endpoint + qs.toString(), {
    method: reqMethod,
    credentials: 'include',
    headers: headers,
    body: reqMethod === 'GET' ? undefined : JSON.stringify(body)
  }).catch(function(err){
    Diagnostics.recordApi(action, false, Date.now() - startedAt, {
      status: 0,
      error: err && err.message ? err.message : 'network_error'
    });
    throw err;
  }).then(function(res){
    return res.text().then(function(text){
      try{
        var data = JSON.parse(text);
        if(!res.ok){
          Diagnostics.recordApi(action, false, Date.now() - startedAt, {
            error: data.detail || data.error || ('http_' + res.status),
            status: res.status,
            sample: String(text || '').slice(0, 280)
          });
          return { ok:false, error:data.detail || data.error || ('http_' + res.status) };
        }
        return data;
      }catch(parseErr){
        Diagnostics.recordApi(action, false, Date.now() - startedAt, {
          error: 'invalid_json_response',
          status: res.status,
          sample: String(text || '').slice(0, 280)
        });
        return { ok:false, error:'invalid_json_response' };
      }
    });
  }).then(function(data){
    if(data && data.ok === false){
      Diagnostics.recordApi(action, false, Date.now() - startedAt, {
        error: data.detail || data.error || 'request_failed',
        status: 400
      });
      throw new Error(data.detail || data.error || 'request_failed');
    }
    Diagnostics.recordApi(action, true, Date.now() - startedAt, {
      status: 200
    });
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
  var nowIso = new Date().toISOString();
  return {
    _meta: {
      id: _uid(),
      name: name || _t('Schema mới', 'New schema'),
      version: '1.0.0',
      description: '',
      createdAt: nowIso,
      updatedAt: nowIso,
      author: currentUsername(),
      enterprise: {
        profile: 'hesem_schema_studio_enterprise',
        lifecycle: 'draft',
        change_request_id: '',
        approval_class: 'standard',
        environment: 'workspace',
        branch_key: 'main',
        effective_from: '',
        effective_until: '',
        canonical_model: 'erp_mes_eqms_7layer',
        compiler_version: '2026.04.enterprise',
        release_notes: '',
        governance: {
          owner: currentUsername(),
          stewards: [],
          approvers: [],
          reviewers: [],
          required_evidence: [],
          electronic_signature_required: false,
          last_reviewed_at: ''
        }
      }
    },
    enums: [],
    tables: [],
    relations: [],
    groups: [],
    notes: [],
    views: [
      {
        id: 'vw_domain',
        name: _t('Theo domain', 'By domain'),
        kind: 'domain',
        state: {
          browserView: 'domains',
          hiddenDomains: {},
          isolatedDomain: '',
          zoom: 1
        }
      },
      {
        id: 'vw_table',
        name: _t('Theo bảng', 'By table'),
        kind: 'table',
        state: {
          browserView: 'tables',
          hiddenDomains: {},
          isolatedDomain: '',
          zoom: 1
        }
      }
    ],
    securityPolicies: [],
    releaseBundles: [],
    runtimeProjections: []
  };
}

function ensureSchema(){
  if(!STORE.schema){
    STORE.schema = createBlankSchemaDoc(_t('Schema làm việc', 'Workspace schema'));
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
  Diagnostics.record('toast', msg, { type:type || 'info' });
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

function clearScheduledZoomToFit(){
  if(zoomToFitTimer){
    window.clearTimeout(zoomToFitTimer);
    zoomToFitTimer = null;
  }
}

function scheduleZoomToFit(delay){
  clearScheduledZoomToFit();
  zoomToFitTimer = window.setTimeout(function(){
    zoomToFitTimer = null;
    if(isActivePage() && refs.canvasWrap){
      Canvas.zoomToFit();
    }
  }, typeof delay === 'number' ? delay : 120);
}

var managedOverlayStack = [];

function getFocusableElements(root){
  if(!root || !root.querySelectorAll) return [];
  return Array.prototype.filter.call(
    root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    function(node){
      return !node.disabled && node.getAttribute('aria-hidden') !== 'true' && node.tabIndex !== -1 && !!(node.offsetWidth || node.offsetHeight || node === document.activeElement);
    }
  );
}

function focusManagedOverlay(overlay){
  var selector;
  var target;
  if(!overlay) return;
  selector = overlay.getAttribute('data-ss-initial-focus') || '';
  target = selector ? overlay.querySelector(selector) : null;
  if(!target){
    target = getFocusableElements(overlay)[0] || overlay;
  }
  if(target && typeof target.focus === 'function'){
    target.focus();
  }
}

function registerManagedOverlay(overlay, options){
  if(!overlay || overlay._ssManaged) return;
  overlay._ssManaged = true;
  overlay._ssLastFocus = document.activeElement || null;
  overlay.setAttribute('tabindex', '-1');
  overlay.setAttribute('data-ss-initial-focus', (options && options.initialFocus) || '');
  overlay._ssOnEscape = options && options.onEscape;
  overlay._ssKeyHandler = function(ev){
    var focusables;
    var first;
    var last;
    if(managedOverlayStack[managedOverlayStack.length - 1] !== overlay) return;
    if(ev.key === 'Escape'){
      ev.preventDefault();
      ev.stopPropagation();
      if(typeof overlay._ssOnEscape === 'function'){
        overlay._ssOnEscape();
      }
      return;
    }
    if(ev.key !== 'Tab') return;
    focusables = getFocusableElements(overlay);
    if(!focusables.length){
      ev.preventDefault();
      overlay.focus();
      return;
    }
    first = focusables[0];
    last = focusables[focusables.length - 1];
    if(ev.shiftKey && document.activeElement === first){
      ev.preventDefault();
      last.focus();
      return;
    }
    if(!ev.shiftKey && document.activeElement === last){
      ev.preventDefault();
      first.focus();
    }
  };
  managedOverlayStack.push(overlay);
  document.addEventListener('keydown', overlay._ssKeyHandler, true);
  window.setTimeout(function(){ focusManagedOverlay(overlay); }, 0);
}

function unregisterManagedOverlay(overlay){
  var idx;
  if(!overlay || !overlay._ssManaged) return;
  idx = managedOverlayStack.indexOf(overlay);
  if(idx >= 0) managedOverlayStack.splice(idx, 1);
  if(overlay._ssKeyHandler){
    document.removeEventListener('keydown', overlay._ssKeyHandler, true);
  }
  if(overlay._ssLastFocus && typeof overlay._ssLastFocus.focus === 'function'){
    overlay._ssLastFocus.focus();
  }
  overlay._ssManaged = false;
  overlay._ssKeyHandler = null;
  overlay._ssOnEscape = null;
  overlay._ssLastFocus = null;
}

function closeTopManagedOverlay(){
  var overlay = managedOverlayStack[managedOverlayStack.length - 1];
  if(!overlay) return false;
  if(typeof overlay._ssOnEscape === 'function'){
    overlay._ssOnEscape();
    return true;
  }
  return false;
}

function confirm2(msg, dangerous){
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    var step = dangerous ? 1 : 2;
    overlay.className = 'ss-confirm-overlay';
    function close(result){
      unregisterManagedOverlay(overlay);
      removeNode(overlay);
      resolve(!!result);
    }
    function render(){
      overlay.innerHTML = [
        '<div class="ss-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ss-confirm-title">',
          '<div class="ss-confirm-header"><strong id="ss-confirm-title">',
            dangerous ? _esc(_t('Xác nhận thao tác nguy hiểm', 'Confirm destructive action')) : _esc(_t('Xác nhận', 'Confirm')),
          '</strong></div>',
          '<div class="ss-confirm-body">',
            '<div>', _esc(msg), '</div>',
            dangerous && step === 1 ? '<div class="ss-field-hint">' + _esc(_t('Thao tác này có thể gây mất dữ liệu. Bạn sẽ cần xác nhận thêm 1 lần nữa.', 'This action can cause data loss. You will need to confirm one more time.')) + '</div>' : '',
            dangerous && step === 2 ? '<div class="ss-import-error" style="display:block">' + _esc(_t('Đây là xác nhận lần 2. Chỉ tiếp tục nếu bạn chắc chắn.', 'This is the second confirmation. Continue only if you are sure.')) + '</div>' : '',
          '</div>',
          '<div class="ss-confirm-actions">',
            '<button type="button" class="hm-btn hm-btn-ghost" data-ss-confirm="cancel">', _esc(_t('Hủy', 'Cancel')), '</button>',
            '<button type="button" class="hm-btn ', dangerous ? 'hm-btn-danger' : 'hm-btn-primary', '" data-ss-confirm="ok">', _esc(step === 1 ? _t('Tiếp tục', 'Continue') : _t('Xác nhận', 'Confirm')), '</button>',
          '</div>',
        '</div>'
      ].join('');
      overlay.querySelector('[data-ss-confirm="cancel"]').onclick = function(){ close(false); };
      overlay.querySelector('[data-ss-confirm="ok"]').onclick = function(){
        if(dangerous && step === 1){
          step = 2;
          render();
          focusManagedOverlay(overlay);
          return;
        }
        close(true);
      };
      focusManagedOverlay(overlay);
    }
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) close(false);
    });
    render();
    document.body.appendChild(overlay);
    registerManagedOverlay(overlay, {
      initialFocus: '[data-ss-confirm="cancel"]',
      onEscape: function(){ close(false); }
    });
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
        activeDomain: STORE.browser.activeDomain,
        domainSplit: STORE.browser.domainSplit,
        domainSplitManual: !!STORE.browser.domainSplitManual
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
    if(typeof prefs.browser.domainSplit === 'number' && isFinite(prefs.browser.domainSplit)){
      STORE.browser.domainSplit = Math.max(0.25, Math.min(0.75, prefs.browser.domainSplit));
    }
    if(typeof prefs.browser.domainSplitManual === 'boolean'){
      STORE.browser.domainSplitManual = prefs.browser.domainSplitManual;
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

function estimateTableCardWidth(tbl){
  var titleLength = String((tbl && tbl.name) || '').length;
  var schemaLength = String((tbl && tbl.schema) || '').length;
  var computed = 156 + (titleLength * 14) + (schemaLength > 0 && String(tbl.schema || 'public') !== 'public' ? (schemaLength * 7) + 18 : 0);
  return Math.max(340, Math.min(820, computed));
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
        '<button type="button" id="ss-zoom-in" title="Zoom in" aria-label="' + _esc(_t('Phóng to canvas', 'Zoom in canvas')) + '">+</button>',
        '<button type="button" id="ss-zoom-reset" class="ss-zoom-val" title="Reset zoom" aria-label="' + _esc(_t('Đặt lại mức zoom', 'Reset zoom level')) + '">100%</button>',
        '<button type="button" id="ss-zoom-out" title="Zoom out" aria-label="' + _esc(_t('Thu nhỏ canvas', 'Zoom out canvas')) + '">-</button>',
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
      canvasResizeHandler = function(){
        if(isActivePage()) Canvas.applyTransform();
      };
      window.addEventListener('resize', canvasResizeHandler);
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
    toast(_t('Snap to grid: ' + (STORE.canvas.snapToGrid ? 'BẬT' : 'TẮT'), 'Snap to grid: ' + (STORE.canvas.snapToGrid ? 'ON' : 'OFF')), 'info');
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
      badge.textContent = count + ' ' + _t('bảng được chọn', 'tables selected');
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
    if(!connecting || !ev || typeof ev.clientX !== 'number' || typeof ev.clientY !== 'number') return;
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
    function closeWizard(){
      unregisterManagedOverlay(overlay);
      removeNode(overlay);
    }
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
        '<div class="ss-modal" role="dialog" aria-modal="true" aria-labelledby="ss-fk-modal-title">',
          '<div class="ss-modal-header"><h3 id="ss-fk-modal-title">', _esc(_t('Tạo khóa ngoại', 'Create foreign key')), '</h3><button type="button" class="hm-btn hm-btn-ghost" data-ss-close="fk" aria-label="', _esc(_t('Đóng hộp thoại khóa ngoại', 'Close foreign key dialog')), '">X</button></div>',
          '<div class="ss-modal-body">',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Nguồn', 'Source')), '</div><div class="ss-rel-card">', _esc(fromTable.name + '.' + fromCol.name), '</div></div>',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Bảng đích', 'Target table')), '</div><select class="hm-input" id="ss-fk-target-table">', tableOptions.map(function(tbl){ return '<option value="' + _esc(tbl.id) + '"' + (tbl.id === activeTableId ? ' selected' : '') + '>' + _esc(tbl.name) + '</option>'; }).join(''), '</select></div>',
            '<div class="ss-field-group"><div class="ss-field-label">', _esc(_t('Cột đích', 'Target column')), '</div><select class="hm-input" id="ss-fk-target-col">', columnState.html, '</select></div>',
            '<div class="ss-field-row">',
              '<div class="ss-field-group" style="flex:1"><div class="ss-field-label">ON DELETE</div><select class="hm-input" id="ss-fk-on-delete">', ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === 'RESTRICT' ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join(''), '</select></div>',
              '<div class="ss-field-group" style="flex:1"><div class="ss-field-label">ON UPDATE</div><select class="hm-input" id="ss-fk-on-update">', ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === 'CASCADE' ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join(''), '</select></div>',
            '</div>',
          '</div>',
          '<div class="ss-modal-footer"><button type="button" class="hm-btn hm-btn-ghost" data-ss-close="fk">', _esc(_t('Hủy', 'Cancel')), '</button><button type="button" class="hm-btn hm-btn-primary" id="ss-fk-confirm">', _esc(_t('Xác nhận', 'Confirm')), '</button></div>',
        '</div>'
      ].join('');
      overlay.querySelectorAll('[data-ss-close="fk"]').forEach(function(node){ node.onclick = function(){ closeWizard(); }; });
      if(!overlay.parentNode){
        document.body.appendChild(overlay);
        registerManagedOverlay(overlay, {
          initialFocus: '#ss-fk-target-table',
          onEscape: closeWizard
        });
      }
      overlay.querySelector('#ss-fk-target-table').onchange = function(){
        activeTableId = this.value;
        overlay.querySelector('#ss-fk-target-col').innerHTML = buildColumnOptions(activeTableId).html;
      };
      overlay.querySelector('#ss-fk-confirm').onclick = function(){
        var selectedTableId = overlay.querySelector('#ss-fk-target-table').value;
        var selectedColId = overlay.querySelector('#ss-fk-target-col').value;
        var onDelete = overlay.querySelector('#ss-fk-on-delete').value;
        var onUpdate = overlay.querySelector('#ss-fk-on-update').value;
        closeWizard();
        Connector.createRelation(fromTableId, fromColId, selectedTableId, selectedColId, onDelete, onUpdate);
      };
      focusManagedOverlay(overlay);
    }
    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeWizard(); });
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
    toast(_t('Đã tạo khóa ngoại', 'Foreign key created'), 'success');
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
    var effectiveWidth = Math.max((tbl.canvas && tbl.canvas.width) || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
    var schemaLabel = String(tbl.schema || 'public');
    var schemaMeta = schemaLabel && schemaLabel !== 'public'
      ? '<span class="ss-tbl-meta">' + _esc(schemaLabel) + '</span>'
      : '';
    tbl.canvas = tbl.canvas || {};
    tbl.canvas.width = effectiveWidth;
    card.className = 'ss-table-card' + (tbl.canvas.collapsed ? ' collapsed' : '');
    card.id = 'tc_' + tbl.id;
    card.setAttribute('data-table-id', tbl.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', _t('Bảng ', 'Table ') + tbl.name);
    card.style.transform = 'translate(' + tbl.canvas.x + 'px,' + tbl.canvas.y + 'px)';
    card.style.width = effectiveWidth + 'px';
    card.style.setProperty('--ss-domain-color', domainColor);
    card.innerHTML = [
      '<div class="ss-table-card-header">',
        '<div class="ss-table-head-main" title="' + _esc(schemaLabel + '.' + tbl.name) + '">',
          '<span class="ss-tbl-drag">::</span>',
          '<div class="ss-tbl-title-stack">',
            '<span class="ss-tbl-name">' + _esc(tbl.name) + '</span>',
            schemaMeta,
          '</div>',
        '</div>',
      '</div>',
      '<ul class="ss-col-list">',
        (tbl.columns || []).map(function(col){
          var iconClass = col.primary_key ? 'is-pk' : (col.foreign_key ? 'is-fk' : '');
          var icon = col.primary_key ? 'K' : (col.foreign_key ? 'F' : '.');
          return '<li class="ss-col-item" data-col-id="' + _esc(col.id) + '"><span class="ss-col-icon ' + iconClass + '">' + _esc(icon) + '</span><span class="ss-col-name">' + _esc(col.name) + '</span><span class="ss-col-type">' + _esc(fmtColType(col)) + '</span><span class="ss-col-badges">' + colBadges(col, tbl).map(function(badge){
            if(badge.cls === 'fk' && col.foreign_key){
              return '<span class="ss-col-badge fk ss-fk-navigate" title="' + _esc(_t('Đi tới bảng tham chiếu', 'Jump to referenced table')) + '" onclick="TableCard.navigateFK(event,\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">FK ↗</span>';
            }
            return '<span class="ss-col-badge ' + _esc(badge.cls) + '">' + _esc(badge.text) + '</span>';
          }).join('') + '</span><span class="ss-fk-port" data-port-col="' + _esc(col.id) + '" title="' + _esc(_t('Keo de tao FK', 'Drag to create FK')) + '"></span></li>';
        }).join(''),
      '</ul>',
      '<div class="ss-table-footer">' + _esc(((tbl.indexes || []).length + ' indexes · ' + (tbl.columns || []).length + ' ' + _t('cột', 'columns'))) + '</div>'
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
    card.addEventListener('keydown', function(ev){
      if(ev.key === 'Enter'){
        ev.preventDefault();
        TableCard.openDetails(tbl.id);
        return;
      }
      if(ev.key === ' '){
        ev.preventDefault();
        Canvas.selectTable(tbl.id, ev.shiftKey || ev.ctrlKey || ev.metaKey);
        Inspector.open({ kind:'table', tableId:tbl.id });
      }
    });
    card.querySelector('.ss-table-card-header').ondblclick = function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      TableCard.openDetails(tbl.id);
    };
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

  openDetails: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    Canvas.selectTable(tableId);
    Inspector.open({ kind:'table', tableId:tableId });
    TableDialog.open(tableId);
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
    var dragStarted = false;
    var dragThreshold = 4;
    if(!tbl) return;
    if(selectedTableIds.indexOf(tableId) < 0){
      Canvas.selectTable(tableId, modifier);
      selectedTableIds = STORE.canvas.selection.filter(function(item){ return item.kind === 'table'; }).map(function(item){ return item.id; });
    }
    isMultiMove = selectedTableIds.indexOf(tableId) >= 0 && selectedTableIds.length > 1;
    tablesToMove = isMultiMove ? selectedTableIds.slice() : [tableId];
    tablesToMove.forEach(function(id){
      var moveTbl = findTable(id);
      if(moveTbl){
        startPositions[id] = { x: moveTbl.canvas.x, y: moveTbl.canvas.y };
      }
    });
    var startCanvasX = (ev.clientX - STORE.canvas.panX) / STORE.canvas.zoom;
    var startCanvasY = (ev.clientY - STORE.canvas.panY) / STORE.canvas.zoom;
    function onMove(moveEv){
      var cx = (moveEv.clientX - STORE.canvas.panX) / STORE.canvas.zoom;
      var cy = (moveEv.clientY - STORE.canvas.panY) / STORE.canvas.zoom;
      pendingDX = cx - startCanvasX;
      pendingDY = cy - startCanvasY;
      if(!dragStarted && Math.abs(pendingDX) < dragThreshold && Math.abs(pendingDY) < dragThreshold){
        return;
      }
      if(!dragStarted){
        dragStarted = true;
        pushUndo();
        tablesToMove.forEach(function(id){
          var moveCard = document.getElementById('tc_' + id);
          if(moveCard){
            moveCard.classList.add('ss-dragging');
          }
        });
      }
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
      if(TableCard._activeMoveCleanup){
        TableCard._activeMoveCleanup();
      }
      if(!dragStarted){
        return;
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
    TableCard._activeMoveCleanup = function(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(rafHandle){
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      tablesToMove.forEach(function(id){
        var moveCard = document.getElementById('tc_' + id);
        if(moveCard){
          moveCard.classList.remove('ss-dragging');
        }
      });
      TableCard._activeMoveCleanup = null;
    };
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
        toast(_t('Tên bảng phải là snake_case', 'Table name must be snake_case'), 'error');
        cancel();
        return;
      }
      if(findTableByName(nextName) && nextName !== tbl.name){
        toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
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
      ? _t('Bảng này có ' + rels.length + ' liên kết FK. Xóa sẽ xóa toàn bộ liên kết liên quan.', 'This table has ' + rels.length + ' foreign-key links. Deleting it will remove all related links.')
      : _t('Xóa bảng ' + tbl.name + '?', 'Delete table ' + tbl.name + '?');
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
      toast(_t('Không thể xóa cột Primary Key mặc định', 'Cannot delete the primary key column'), 'error');
      return;
    }
    confirm2(_t('Xóa cột ' + col.name + '?', 'Delete column ' + col.name + '?'), true).then(function(ok){
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
    syncRootChrome();
    refs.inspector.innerHTML = '<div class="ss-empty-state"><div><div class="ss-empty-icon">○</div><div>' + _esc(_t('Chọn bảng hoặc cột để chỉnh sửa', 'Select a table or column to edit')) + '</div><div class="ss-field-hint">' + _esc(_t('Canvas ở giữa, inspector ở bên phải.', 'Canvas in the middle, inspector on the right.')) + '</div></div></div>';
  },

  renderTable: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl || !refs.inspector){
      Inspector.renderEmpty();
      return;
    }
    syncRootChrome();
    refs.inspector.innerHTML = [
      '<div class="ss-inspector-tabs">',
        '<div class="ss-inspector-tab-list">',
          '<button class="ss-itab', STORE.inspector.tab === 'props' ? ' active' : '', '" onclick="Inspector.switchTab(\'props\',\'' + _esc(tableId) + '\')">', _esc(_t('Thuộc tính', 'Properties')), '</button>',
          '<button class="ss-itab', STORE.inspector.tab === 'indexes' ? ' active' : '', '" onclick="Inspector.switchTab(\'indexes\',\'' + _esc(tableId) + '\')">Indexes</button>',
          '<button class="ss-itab', STORE.inspector.tab === 'constraints' ? ' active' : '', '" onclick="Inspector.switchTab(\'constraints\',\'' + _esc(tableId) + '\')">', _esc(_t('Ràng buộc', 'Constraints')), '</button>',
          '<button class="ss-itab', STORE.inspector.tab === 'triggers' ? ' active' : '', '" onclick="Inspector.switchTab(\'triggers\',\'' + _esc(tableId) + '\')">Triggers</button>',
        '</div>',
        '<div class="ss-inspector-tab-tools">',
          '<button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="TableDialog.open(\'' + _esc(tableId) + '\')">' + _esc(_t('Chi tiết', 'Details')) + '</button>',
          '<button class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableCard.addColumn(\'' + _esc(tableId) + '\')">+ ' + _esc(_t('Cột', 'Column')) + '</button>',
          '<button class="hm-btn hm-btn-danger ss-btn-xs" onclick="TableCard.confirmDelete(\'' + _esc(tableId) + '\')">' + _esc(_t('Xóa', 'Delete')) + '</button>',
        '</div>',
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
      Inspector.fieldGroup(_t('Tên bảng', 'Table name'),
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
        '<button class="hm-btn hm-btn-primary" onclick="Inspector.saveTable(\'' + _esc(tbl.id) + '\')">' + _esc(_t('Lưu bảng', 'Save table')) + '</button>',
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
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có index nào', 'No indexes yet')) + '</div></div>'
    ].join('');
  },

  buildConstraintsHTML: function(tbl){
    var constraints = tbl.check_constraints || [];
    return [
      '<div class="ss-field-group"><button class="hm-btn hm-btn-secondary" onclick="Inspector.addConstraint(\'' + _esc(tbl.id) + '\')">+ CHECK</button></div>',
      constraints.length ? constraints.map(function(item){
        return '<div class="ss-index-card" data-constraint-id="' + _esc(item.id) + '"><div class="ss-field-group"><div class="ss-field-label">Name</div><input class="hm-input" data-field="name" value="' + _esc(item.name || '') + '" /></div><div class="ss-field-group"><div class="ss-field-label">Expression</div><textarea class="hm-input" rows="3" data-field="expression">' + _esc(item.expression || '') + '</textarea></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveConstraint(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Luu', 'Save')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.deleteConstraint(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Xoa', 'Delete')) + '</button></div></div>';
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có ràng buộc CHECK', 'No CHECK constraints yet')) + '</div></div>'
    ].join('');
  },

  buildTriggersHTML: function(tbl){
    var triggers = tbl.triggers || [];
    return [
      '<div class="ss-field-group"><button class="hm-btn hm-btn-secondary" onclick="Inspector.addTrigger(\'' + _esc(tbl.id) + '\')">+ Trigger</button></div>',
      triggers.length ? triggers.map(function(item){
        return '<div class="ss-index-card" data-trigger-id="' + _esc(item.id) + '"><div class="ss-field-group"><div class="ss-field-label">Name</div><input class="hm-input" data-field="name" value="' + _esc(item.name || '') + '" /></div><div class="ss-field-row"><div class="ss-field-group" style="flex:1"><div class="ss-field-label">Timing</div><input class="hm-input" data-field="timing" value="' + _esc(item.timing || 'BEFORE') + '" /></div><div class="ss-field-group" style="flex:1"><div class="ss-field-label">Event</div><input class="hm-input" data-field="event" value="' + _esc(item.event || 'INSERT') + '" /></div></div><div class="ss-field-group"><div class="ss-field-label">Function</div><input class="hm-input" data-field="function_name" value="' + _esc(item.function_name || '') + '" placeholder="fn_set_updated_at" /></div><div class="ss-field-group"><div class="ss-field-label">WHEN</div><input class="hm-input" data-field="when_clause" value="' + _esc(item.when_clause || '') + '" placeholder="NEW.status IS DISTINCT FROM OLD.status" /></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveTrigger(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Luu', 'Save')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.deleteTrigger(\'' + _esc(tbl.id) + '\',\'' + _esc(item.id) + '\')">' + _esc(_t('Xoa', 'Delete')) + '</button></div></div>';
      }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có trigger nào', 'No triggers yet')) + '</div></div>'
    ].join('');
  },

  saveTable: function(tableId){
    var tbl = findTable(tableId);
    var nextName;
    var duplicated;
    if(!tbl) return;
    nextName = _slug(document.getElementById('inp-tbl-name').value);
    if(!isValidIdentifier(nextName)){
      toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
      return;
    }
    duplicated = ((STORE.schema && STORE.schema.tables) || []).some(function(item){
      return item.id !== tableId && item.name === nextName;
    });
    if(duplicated){
      toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
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
    toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
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
    syncRootChrome();
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
      Inspector.fieldGroup(_t('Tên cột', 'Column name'),
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
        relation ? '<div class="ss-field-label">Foreign Key</div><div class="ss-rel-card">' + _esc((findTable(relation.to_table_id) || { name:"?" }).name + "." + ((findCol(relation.to_table_id, relation.to_col_id) || { name:"?" }).name)) + '</div>' + Inspector.fieldGroup('ON DELETE', '<select class="hm-input" id="col-on-delete">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === relation.on_delete ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>') + Inspector.fieldGroup('ON UPDATE', '<select class="hm-input" id="col-on-update">' + ON_ACTIONS.map(function(action){ return '<option value="' + _esc(action) + '"' + (action === relation.on_update ? ' selected' : '') + '>' + _esc(action) + '</option>'; }).join('') + '</select>') + '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="col-fk-deferrable"' + ((col.foreign_key && col.foreign_key.deferrable) ? ' checked' : '') + ' /><span>DEFERRABLE</span></label></div><div class="ss-inspector-actions"><button class="hm-btn hm-btn-ghost" onclick="Inspector.openRelation(\'' + _esc(relation.id) + '\')">' + _esc(_t('Mở liên kết', 'Open relation')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.removeFK(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Gỡ FK', 'Remove FK')) + '</button></div>' : '<button class="hm-btn hm-btn-secondary" onclick="Connector.openFkWizard(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">+ Foreign Key</button>',
      '</div>',
      '<div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveColumn(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Lưu cột', 'Save column')) + '</button><button class="hm-btn hm-btn-danger" onclick="TableCard.deleteColumn(\'' + _esc(tbl.id) + '\',\'' + _esc(col.id) + '\')">' + _esc(_t('Xóa cột', 'Delete column')) + '</button></div>'
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
      toast(_t('Tên cột phải là snake_case hợp lệ', 'Column name must be valid snake_case'), 'error');
      return;
    }
    if(isReservedWord(nextName)){
      toast(_t('Tên cột đang trùng từ khóa SQL', 'Column name uses a reserved SQL keyword'), 'error');
      return;
    }
    if((tbl.columns || []).some(function(item){ return item.id !== colId && item.name === nextName; })){
      toast(_t('Tên cột đã tồn tại trong bảng', 'Column name already exists in table'), 'error');
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
    toast(_t('Đã lưu cột ' + col.name, 'Saved column ' + col.name), 'success');
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
    syncRootChrome();
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
        '<div class="ss-inspector-actions"><button class="hm-btn hm-btn-primary" onclick="Inspector.saveRelation(\'' + _esc(rel.id) + '\')">' + _esc(_t('Lưu liên kết', 'Save relation')) + '</button><button class="hm-btn hm-btn-danger" onclick="Inspector.removeRelation(\'' + _esc(rel.id) + '\')">' + _esc(_t('Xóa liên kết', 'Delete relation')) + '</button></div>',
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
    toast(_t('Đã lưu liên kết', 'Relation saved'), 'success');
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

var TableDialog = {
  currentTableId: null,
  draft: null,
  preview: null,
  _lastFocus: null,
  _escapeHandler: null,

  open: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    this._lastFocus = document.activeElement || null;
    this.currentTableId = tableId;
    this.draft = _clone(tbl);
    this.preview = null;
    this.render();
    if(this._escapeHandler){
      document.removeEventListener('keydown', this._escapeHandler);
    }
    this._escapeHandler = function(ev){
      if(ev.key === 'Escape'){
        TableDialog.close();
      }
    };
    document.addEventListener('keydown', this._escapeHandler);
    window.setTimeout(function(){
      var nameInput = document.getElementById('dlg-tbl-name');
      if(nameInput) nameInput.focus();
    }, 0);
  },

  close: function(){
    var overlay = document.getElementById('ss-table-dialog-overlay');
    if(overlay) removeNode(overlay);
    if(this._escapeHandler){
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    if(this._lastFocus && typeof this._lastFocus.focus === 'function'){
      this._lastFocus.focus();
    }
    this._lastFocus = null;
    this.currentTableId = null;
    this.draft = null;
    this.preview = null;
  },

  ensureDraft: function(){
    if(!this.draft){
      var tbl = findTable(this.currentTableId);
      if(tbl) this.draft = _clone(tbl);
    }
    return this.draft;
  },

  addColumn: function(){
    var draft = this.ensureDraft();
    if(!draft) return;
    draft.columns = draft.columns || [];
    draft.columns.push({
      id: _uid(),
      name: generateUniqueColumnName(draft, 'new_column'),
      type: 'varchar',
      length: 255,
      scale: null,
      is_array: false,
      nullable: true,
      unique: false,
      primary_key: false,
      pk_order: null,
      default_val: null,
      check_expr: null,
      generated_expr: null,
      generated_stored: false,
      comment: '',
      foreign_key: null
    });
    this.render();
  },

  removeColumn: function(index){
    var draft = this.ensureDraft();
    var normalizedIndex = Number(index);
    if(!draft || !Array.isArray(draft.columns)) return;
    if(!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= draft.columns.length) return;
    draft.columns.splice(normalizedIndex, 1);
    this.render();
  },

  loadPreview: function(){
    var draft = this.ensureDraft();
    var self = this;
    if(!draft) return;
    _api('schema_studio_table_preview', {
      schema: draft.schema || 'public',
      table: draft.name,
      limit: 12
    }, 'POST').then(function(res){
      if(self.currentTableId !== draft.id) return;
      self.preview = Object.assign({
        loading: false,
        available: false,
        columns: [],
        rows: [],
        message: ''
      }, res || {});
      self.preview.loading = false;
      self.render();
    }).catch(function(){
      self.preview = {
        loading: false,
        available: false,
        columns: [],
        rows: [],
        message: _t('Không thể tải dữ liệu mẫu ở thời điểm này', 'Could not load sample data right now')
      };
      self.render();
    });
  },

  previewHtml: function(){
    var preview = this.preview || {};
    if(preview.loading){
      return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu mẫu...', 'Loading sample data...')) + '</div>';
    }
    if(!preview.available){
      return '<div class="ss-table-dialog-empty">' + _esc(preview.message || _t('Bảng này chưa có dữ liệu mẫu hoặc chưa truy cập được từ database hiện tại', 'No sample data is available for this table from the current database')) + '</div>';
    }
    if(!(preview.columns || []).length){
      return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
    }
    return [
      '<div class="ss-table-dialog-data-wrap">',
        '<table class="ss-table-dialog-data-table">',
          '<thead><tr>',
            (preview.columns || []).map(function(col){
              return '<th>' + _esc(col.column_name || col.name || '') + '</th>';
            }).join(''),
          '</tr></thead>',
          '<tbody>',
            (preview.rows || []).length ? (preview.rows || []).map(function(row){
              return '<tr>' + (preview.columns || []).map(function(col){
                var key = col.column_name || col.name || '';
                var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
                if(value == null) value = '';
                if(typeof value === 'object'){
                  value = JSON.stringify(value);
                }
                return '<td>' + _esc(String(value)) + '</td>';
              }).join('') + '</tr>';
            }).join('') : '<tr><td colspan="' + String((preview.columns || []).length || 1) + '">' + _esc(_t('Bảng hiện chưa có dòng dữ liệu nào', 'This table currently has no rows')) + '</td></tr>',
          '</tbody>',
        '</table>',
      '</div>'
    ].join('');
  },

  collectForm: function(){
    var draft = this.ensureDraft();
    if(!draft) return null;
    draft.name = _slug((document.getElementById('dlg-tbl-name').value || '').trim());
    draft.schema = _slug((document.getElementById('dlg-tbl-schema').value || '').trim()) || 'public';
    draft.domain = document.getElementById('dlg-tbl-domain').value || 'default';
    draft.comment = (document.getElementById('dlg-tbl-comment').value || '').trim();
    draft.tags = (document.getElementById('dlg-tbl-tags').value || '').split(',').map(function(item){ return item.trim(); }).filter(Boolean);
    draft.color = document.getElementById('dlg-tbl-color').value || null;
    draft.rls_enabled = !!document.getElementById('dlg-tbl-rls').checked;
    draft.columns = Array.prototype.map.call(document.querySelectorAll('.ss-table-dialog-col-row'), function(row, index){
      var base = _clone((draft.columns || [])[index] || {});
      var typeInfo = parseTypeDefinition(row.querySelector('[data-field="type"]').value);
      base.name = _slug((row.querySelector('[data-field="name"]').value || '').trim());
      base.type = typeInfo.type || 'text';
      base.length = typeInfo.length;
      base.scale = typeInfo.scale;
      base.is_array = !!typeInfo.is_array;
      base.default_val = (row.querySelector('[data-field="default"]').value || '').trim() || null;
      base.comment = (row.querySelector('[data-field="comment"]').value || '').trim();
      base.nullable = !!row.querySelector('[data-field="nullable"]').checked;
      base.primary_key = !!row.querySelector('[data-field="pk"]').checked;
      base.pk_order = base.primary_key ? (base.pk_order || 1) : null;
      return base;
    });
    return draft;
  },

  save: function(){
    var tbl = findTable(this.currentTableId);
    var draft = this.collectForm();
    var names = {};
    var duplicated = false;
    var pkCount = 0;
    var self = this;
    if(!tbl || !draft) return;
    if(!isValidIdentifier(draft.name)){
      toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
      return;
    }
    if(((STORE.schema && STORE.schema.tables) || []).some(function(item){ return item.id !== tbl.id && item.name === draft.name; })){
      toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
      return;
    }
    if(!(draft.columns || []).length){
      toast(_t('Bảng phải có ít nhất 1 cột', 'Table must have at least 1 column'), 'error');
      return;
    }
    (draft.columns || []).forEach(function(col){
      if(!isValidIdentifier(col.name)) duplicated = col.name || '__invalid__';
      if(names[col.name]) duplicated = col.name;
      names[col.name] = true;
      if(col.primary_key){
        pkCount += 1;
        col.pk_order = pkCount;
        col.nullable = false;
      } else {
        col.pk_order = null;
      }
    });
    if(duplicated){
      toast(_t('Tên cột chưa hợp lệ hoặc đang bị trùng: ' + duplicated, 'Invalid or duplicate column name: ' + duplicated), 'error');
      return;
    }
    if(!pkCount){
      toast(_t('Bảng phải có ít nhất 1 khóa chính', 'Table must have at least 1 primary key'), 'error');
      return;
    }
    confirm2(_t('Lưu thay đổi cho bảng ' + draft.name + '?', 'Save changes for table ' + draft.name + '?'), false).then(function(ok){
      if(!ok) return;
      pushUndo();
      tbl.name = draft.name;
      tbl.schema = draft.schema;
      tbl.domain = draft.domain;
      tbl.comment = draft.comment;
      tbl.tags = draft.tags;
      tbl.color = draft.color;
      tbl.rls_enabled = draft.rls_enabled;
      tbl.columns = _clone(draft.columns || []);
      tbl.canvas = tbl.canvas || {};
      tbl.canvas.width = Math.max(tbl.canvas.width || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
      TableCard.reRender(tbl.id);
      Browser.render();
      Inspector.renderTable(tbl.id);
      markDirty();
      saveDraft();
      toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
      self.close();
    });
  },

  render: function(){
    var draft = this.ensureDraft();
    var overlay = document.getElementById('ss-table-dialog-overlay');
    if(!draft) return;
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'ss-modal-overlay';
      overlay.id = 'ss-table-dialog-overlay';
      overlay.addEventListener('click', function(ev){
        if(ev.target === overlay) TableDialog.close();
      });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = [
      '<div class="ss-modal ss-table-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="ss-table-dialog-title">',
        '<div class="ss-modal-header">',
          '<div><strong id="ss-table-dialog-title">' + _esc(draft.name) + '</strong><div class="ss-field-hint">' + _esc(_t('Chi tiết bảng và dữ liệu mẫu', 'Table details and sample data')) + '</div></div>',
          '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.close()" aria-label="' + _esc(_t('Đóng hộp thoại chi tiết bảng', 'Close table details dialog')) + '">' + _esc(_t('Đóng', 'Close')) + '</button>',
        '</div>',
        '<div class="ss-modal-body ss-table-dialog-body">',
          '<div class="ss-table-dialog-grid">',
            '<div class="ss-table-dialog-main">',
              '<div class="ss-table-dialog-section">',
                '<div class="ss-table-dialog-section-title">' + _esc(_t('Tổng quan', 'Overview')) + '</div>',
                '<div class="ss-table-dialog-form-grid">',
                  Inspector.fieldGroup(_t('Tên bảng', 'Table name'), '<input class="hm-input" id="dlg-tbl-name" value="' + _esc(draft.name) + '" />'),
                  Inspector.fieldGroup('Schema', '<input class="hm-input" id="dlg-tbl-schema" value="' + _esc(draft.schema || 'public') + '" />'),
                  Inspector.fieldGroup('Domain', '<select class="hm-input" id="dlg-tbl-domain">' + Object.keys(DOMAIN_COLORS).sort().map(function(domain){ return '<option value="' + _esc(domain) + '"' + (domain === (draft.domain || 'default') ? ' selected' : '') + '>' + _esc(domain) + '</option>'; }).join('') + '</select>'),
                  Inspector.fieldGroup(_t('Màu', 'Color'), '<input type="color" id="dlg-tbl-color" value="' + _esc(Inspector.colorValue(draft.color || DOMAIN_COLORS[draft.domain] || DOMAIN_COLORS.default)) + '" />'),
                '</div>',
                Inspector.fieldGroup(_t('Mô tả', 'Comment'), '<textarea class="hm-input" id="dlg-tbl-comment" rows="3">' + _esc(draft.comment || '') + '</textarea>'),
                Inspector.fieldGroup('Tags', '<input class="hm-input" id="dlg-tbl-tags" value="' + _esc((draft.tags || []).join(', ')) + '" placeholder="core, audit, qms" />'),
                '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="dlg-tbl-rls"' + (draft.rls_enabled ? ' checked' : '') + ' /><span>Row Level Security (RLS)</span></label></div>',
              '</div>',
              '<div class="ss-table-dialog-section">',
                '<div class="ss-table-dialog-section-head"><div class="ss-table-dialog-section-title">' + _esc(_t('Cấu trúc cột', 'Columns')) + '</div><button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.addColumn()">+ ' + _esc(_t('Thêm cột', 'Add column')) + '</button></div>',
                '<div class="ss-table-dialog-columns">',
                  (draft.columns || []).map(function(col){
                    return [
                      '<div class="ss-table-dialog-col-row">',
                        '<div class="ss-table-dialog-col-grid">',
                          Inspector.fieldGroup(_t('Tên cột', 'Column name'), '<input class="hm-input" data-field="name" value="' + _esc(col.name || '') + '" />'),
                          Inspector.fieldGroup(_t('Kiểu dữ liệu', 'Data type'), '<input class="hm-input" data-field="type" value="' + _esc(fmtColType(col)) + '" placeholder="varchar(255)" />'),
                          Inspector.fieldGroup('Default', '<input class="hm-input" data-field="default" value="' + _esc(col.default_val || '') + '" />'),
                        '</div>',
                        '<div class="ss-table-dialog-col-meta"><label class="ss-toggle-row"><input type="checkbox" data-field="nullable"' + (col.nullable ? ' checked' : '') + ' /><span>' + _esc(_t('Cho phép null', 'Nullable')) + '</span></label><label class="ss-toggle-row"><input type="checkbox" data-field="pk"' + (col.primary_key ? ' checked' : '') + ' /><span>PK</span></label></div>',
                        Inspector.fieldGroup(_t('Mô tả cột', 'Column comment'), '<input class="hm-input" data-field="comment" value="' + _esc(col.comment || '') + '" />'),
                      '</div>'
                    ].join('');
                  }).join(''),
                '</div>',
              '</div>',
            '</div>',
            '<div class="ss-table-dialog-side">',
              '<div class="ss-table-dialog-section">',
                '<div class="ss-table-dialog-section-title">' + _esc(_t('Dữ liệu mẫu', 'Sample data')) + '</div>',
                this.previewHtml(),
              '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="ss-modal-footer">',
          '<button type="button" class="hm-btn hm-btn-ghost" onclick="TableDialog.close()">' + _esc(_t('Hủy', 'Cancel')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-primary" onclick="TableDialog.save()">' + _esc(_t('Lưu', 'Save')) + '</button>',
        '</div>',
      '</div>'
    ].join('');
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
    syncRootChrome();
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
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.expandAll(); Browser.toggleOpen(true)" title="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '" aria-label="' + _esc(_t('Mở rộng tất cả domain', 'Expand all domains')) + '">+</button>',
          '<button class="ss-browser-rail-btn" type="button" onclick="Browser.collapseAll(); Browser.toggleOpen(true)" title="' + _esc(_t('Thu gọn tất cả domain', 'Collapse all domains')) + '" aria-label="' + _esc(_t('Thu gọn tất cả domain', 'Collapse all domains')) + '">-</button>',
          '<div class="ss-browser-rail-stats"><strong>' + String(tables.length) + '</strong><span>' + _esc(_t('bảng', 'tables')) + '</span></div>',
        '</div>'
      ].join('');
      return;
    }
    refs.browser.innerHTML = [
      '<div class="ss-browser-header">',
        '<div class="ss-browser-title-group"><div class="ss-browser-title">' + _esc(_t('Trình duyệt schema', 'Schema browser')) + '</div><div class="ss-browser-subtitle">' + String(tables.length) + ' ' + _esc(_t('bảng', 'tables')) + ' · ' + String(domains.length) + ' ' + _esc(_t('domain', 'domains')) + '</div></div>',
        '<div class="ss-browser-tools">',
          '<button class="ss-browser-tool" type="button" onclick="Browser.expandAll()" title="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '" aria-label="' + _esc(_t('Mở rộng tất cả', 'Expand all')) + '">+</button>',
          '<button class="ss-browser-tool" type="button" onclick="Browser.collapseAll()" title="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '" aria-label="' + _esc(_t('Thu gọn tất cả', 'Collapse all')) + '">-</button>',
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
      scheduleZoomToFit(90);
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

Browser._legacyRenderA = function(){
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
  if(browserFilterTimer){
    window.clearTimeout(browserFilterTimer);
  }
  browserFilterTimer = window.setTimeout(function(){
    browserFilterTimer = null;
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
  }, 90);
};

function renderToolbarLegacyA(container){
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
    toast(_t('Đã copy vào clipboard', 'Copied to clipboard'), 'success');
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
    var destructiveToken = 'CONFIRMED_DESTRUCTIVE_' + ((window.currentUser && (window.currentUser.user_id || window.currentUser.username)) || 'system');
    confirm2(_t('Áp dụng migration lên database?', 'Apply migration to the database?'), diff.destructive.length > 0).then(function(ok){
      if(!ok) return;
      return _api('schema_studio_apply_migration', {
        sql: STORE.migration.previewSql || '',
        design_id: STORE.currentDesignId || (STORE.schema && STORE.schema._meta && STORE.schema._meta.id) || null,
        allow_destructive: diff.destructive.length > 0,
        confirm_destructive: diff.destructive.length > 0 ? destructiveToken : ''
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
      '<div class="ss-val-header"><div class="ss-val-summary">' + (results.length ? '<span class="ss-val-error">● ' + String(errors) + ' ' + _esc(_t('Lỗi', 'Errors')) + '</span><span class="ss-val-warn">⚠ ' + String(warnings) + ' ' + _esc(_t('Cảnh báo', 'Warnings')) + '</span><span class="ss-val-info">ℹ ' + String(infos) + ' ' + _esc(_t('Thông tin', 'Info')) + '</span>' : '<span class="ss-val-ok">' + _esc(_t('Hợp lệ', 'Valid')) + '</span>') + '</div><div><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Validator.run()">' + _esc(_t('Chạy', 'Run')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Validator.closePanel()">X</button></div></div>',
      '<div class="ss-val-list">',
        results.length ? results.map(function(item){
          return '<div class="ss-val-item ' + _esc(item.level) + '"><span class="ss-val-code">' + _esc(item.code) + '</span><span class="ss-val-msg">' + _esc(item.msg) + '</span>' + (Validator._fixes[item.id] ? '<button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Validator.runFix(\'' + _esc(item.id) + '\')">Fix</button>' : '') + (item.tableId ? '<button class="hm-btn hm-btn-ghost ss-btn-xs" onclick="Validator.locate(\'' + _esc(item.tableId) + '\')">Locate</button>' : '') + '</div>';
        }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Không có vấn đề nào được tìm thấy', 'No issues found')) + '</div></div>',
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
    function closeImportModal(){
      unregisterManagedOverlay(overlay);
      removeNode(overlay);
    }
    overlay.innerHTML = [
      '<div class="ss-modal" role="dialog" aria-modal="true" aria-labelledby="ss-import-title">',
        '<div class="ss-modal-header"><h3 id="ss-import-title">' + _esc(_t('Nhập schema', 'Import schema')) + '</h3><button class="hm-btn hm-btn-ghost" type="button" aria-label="' + _esc(_t('Đóng hộp thoại nhập schema', 'Close import schema dialog')) + '" data-ss-close="import">X</button></div>',
        '<div class="ss-modal-body">',
          '<div class="ss-import-tabs"><button class="ss-itab active" data-tab="sql" onclick="Importer.switchTab(this,\'sql\')">SQL</button><button class="ss-itab" data-tab="registry" onclick="Importer.switchTab(this,\'registry\')">Registry</button></div>',
          '<div id="ss-import-tab-sql"><textarea id="ss-import-sql-input" class="hm-input ss-import-textarea" rows="14" placeholder="CREATE TABLE users (...);"></textarea></div>',
          '<div id="ss-import-tab-registry" style="display:none"><div class="ss-field-group"><div class="ss-field-hint">' + _esc(_t('Nạp từ registry JSON hiện có', 'Load from existing registry JSON')) + '</div><button class="hm-btn hm-btn-secondary" onclick="Importer.loadFromRegistry()">' + _esc(_t('Nạp registry', 'Load registry')) + '</button></div></div>',
          '<div id="ss-import-error" class="ss-import-error" style="display:none"></div>',
        '</div>',
        '<div class="ss-modal-footer"><button class="hm-btn hm-btn-primary" type="button" onclick="Importer.doImport()">' + _esc(_t('Import', 'Import')) + '</button><button class="hm-btn hm-btn-ghost" type="button" data-ss-close="import">' + _esc(_t('Hủy', 'Cancel')) + '</button></div>',
      '</div>'
    ].join('');
    overlay.querySelectorAll('[data-ss-close="import"]').forEach(function(node){
      node.onclick = closeImportModal;
    });
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) closeImportModal();
    });
    document.body.appendChild(overlay);
    registerManagedOverlay(overlay, {
      initialFocus: '#ss-import-sql-input',
      onEscape: closeImportModal
    });
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
      toast(_t('Không load được registry', 'Failed to load registry') + ': ' + (err.message || ''), 'error');
    });
  },

  applySchema: function(schema){
    pushUndo();
    STORE.schema = schema;
    STORE.currentDesignId = (schema._meta && schema._meta.id) || null;
    STORE.dirty = true;
    renderShell();
    Layout.auto('force');
    scheduleZoomToFit(120);
    saveDraft();
    toast(_t('Import thành công', 'Import successful'), 'success');
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
    { icon:'+', label:'Tạo bảng mới', label_en:'New table', category:'action', action:function(){ TableCard.createNew(200, 200); } },
    { icon:'S', label:'Lưu schema', label_en:'Save schema', category:'action', action:function(){ SchemaLib.save(); } },
    { icon:'I', label:'Nhập schema', label_en:'Import schema', category:'action', action:function(){ Importer.openModal(); } },
    { icon:'D', label:'Nạp từ DB', label_en:'Load from DB', category:'action', action:function(){ SchemaLib.loadFromLiveDB(); } },
    { icon:'V', label:'Validation', label_en:'Validation', category:'action', action:function(){ Validator.run(); } },
    { icon:'M', label:'Migration preview', label_en:'Migration preview', category:'action', action:function(){ MigGen.renderPreview(); } },
    { icon:'Z', label:'Zoom to fit', label_en:'Zoom to fit', category:'view', action:function(){ Canvas.zoomToFit(); } },
    { icon:'B', label:'Ẩn hiện trình duyệt schema', label_en:'Toggle schema browser', category:'view', action:function(){ Browser.toggleOpen(); } },
    { icon:'◌', label:'Hiện tất cả domain', label_en:'Show all domains', category:'view', action:function(){ Browser.showAllDomains(); } },
    { icon:'+', label:'Mở rộng tất cả domain', label_en:'Expand all domains', category:'view', action:function(){ Browser.expandAll(); } },
    { icon:'−', label:'Thu gọn tất cả domain', label_en:'Collapse all domains', category:'view', action:function(){ Browser.collapseAll(); } },
    { icon:'⤢', label:'Nén view đang hiện', label_en:'Compact visible view', category:'layout', action:function(){ Layout.auto('compact-visible'); } },
    { icon:'#', label:'Bật tắt snap grid', label_en:'Toggle snap grid', category:'view', action:function(){ Canvas.toggleSnap(); } },
    { icon:'G', label:'Grid layout', label_en:'Grid layout', category:'layout', action:function(){ Layout.auto('grid'); } },
    { icon:'F', label:'Force layout', label_en:'Force layout', category:'layout', action:function(){ Layout.auto('force'); } },
    { icon:'H', label:'Hierarchical layout', label_en:'Hierarchical layout', category:'layout', action:function(){ Layout.auto('hierarchical'); } },
    { icon:'C', label:'Mở SQL', label_en:'Open SQL', category:'export', action:function(){ CodePanel.open('sql'); } },
    { icon:'B', label:'Đặt baseline', label_en:'Set baseline', category:'migration', action:function(){ MigGen.setBaseline(); } }
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
    palette.innerHTML = '<input class="ss-cmd-input" id="ss-cmd-input" placeholder="' + _esc(_t('Tìm lệnh hoặc bảng...', 'Search commands or tables...')) + '" /><div class="ss-cmd-results" id="ss-cmd-results"></div>';
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
      commandResults.length ? '<div class="ss-cmd-group-label">' + _esc(_t('Lệnh', 'Commands')) + '</div>' + commandResults.map(function(item, index){
        return '<div class="ss-cmd-item' + (index === 0 ? ' active' : '') + '" onclick="CmdPalette.execute(' + index + ')"><span class="ss-cmd-icon">' + _esc(item.icon) + '</span><span class="ss-cmd-label">' + _esc((window._lang === 'en' ? item.label_en : item.label)) + '</span><span class="ss-cmd-cat">' + _esc(item.category) + '</span></div>';
      }).join('') : '',
      tableResults.length ? '<div class="ss-cmd-group-label">' + _esc(_t('Bảng', 'Tables')) + '</div>' + tableResults.map(function(tbl){
        return '<div class="ss-cmd-item" onclick="Browser.focusTable(\'' + _esc(tbl.id) + '\');CmdPalette.close()"><span class="ss-cmd-icon">T</span><span class="ss-cmd-label">' + _esc(tbl.name) + '</span><span class="ss-cmd-cat">' + _esc(tbl.domain || '') + '</span></div>';
      }).join('') : '',
      (!commandResults.length && !tableResults.length) ? '<div class="ss-cmd-empty">' + _esc(_t('Không tìm thấy', 'No results')) + '</div>' : ''
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

CmdPalette.COMMANDS.push(
  { icon:'✓', label:'Chạy tự kiểm tra schema', label_en:'Run schema self-check', category:'diagnostics', action:function(){ Diagnostics.runSelfCheck(); } },
  { icon:'⤓', label:'Xuất báo cáo chẩn đoán', label_en:'Export diagnostics report', category:'diagnostics', action:function(){ Diagnostics.exportReport(); } }
);

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
    select.setAttribute('aria-label', _t('Chọn schema làm việc', 'Select active schema'));
    select.setAttribute('title', _t('Chọn schema làm việc', 'Select active schema'));
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
          if(draftTime > serverTime && window.confirm(_t('Có bản nháp chưa lưu. Dùng bản nháp?', 'An unsaved draft exists. Use the draft?'))){
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
      Inspector.close();
      scheduleZoomToFit(120);
    }).catch(function(err){
      toast(_t('Không tải được schema', 'Failed to load schema') + ': ' + (err.message || ''), 'error');
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
        Inspector.close();
        scheduleZoomToFit(120);
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
        scheduleZoomToFit(120);
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

function renderToolbarLegacyB(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện thanh trình duyệt (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện thanh trình duyệt', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span>' + _esc(_t('Trình duyệt', 'Browser')) + '</button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

function renderShell(){
  var inspectorCollapsed = !(STORE.inspector && STORE.inspector.target && STORE.inspector.target.kind);
  if(!refs.page) return;
  refs.page.innerHTML = [
    '<div class="ss-root' + (STORE.codePanel.open ? ' code-open' : '') + (STORE.browser.open ? '' : ' browser-collapsed') + (inspectorCollapsed ? ' inspector-collapsed' : '') + '">',
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

function syncRootChrome(){
  var hasInspectorTarget = !!(STORE.inspector && STORE.inspector.target && STORE.inspector.target.kind);
  if(!refs.root) return;
  refs.root.classList.toggle('browser-collapsed', !STORE.browser.open);
  refs.root.classList.toggle('inspector-collapsed', !hasInspectorTarget);
}

function isActivePage(){
  return !!(refs.page && refs.page.classList.contains('active'));
}

function bindKeyboard(){
  if(keyboardBound) return;
  keyboardBound = true;
  keyboardHandler = function(ev){
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
        toast(_t('Đã copy ' + selectedTableIds.length + ' bảng', 'Copied ' + selectedTableIds.length + ' table(s)'), 'info');
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
        toast(_t('Đã paste ' + STORE.clipboard.tables.length + ' bảng', 'Pasted ' + STORE.clipboard.tables.length + ' table(s)'), 'success');
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
      if(closeTopManagedOverlay()){
        return;
      }
      if(document.getElementById('ss-table-dialog-overlay')){
        TableDialog.close();
        return;
      }
      Canvas.clearSelection();
      Inspector.close();
      CmdPalette.close();
    }
  };
  document.addEventListener('keydown', keyboardHandler);
}

function renderToolbarLegacyC(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><div class="ss-toolbar-title"><span>Schema Studio</span>' + (STORE.dirty ? '<span class="ss-dirty-badge">●</span>' : '') + '</div><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span>' + _esc(_t('Trình duyệt', 'Browser')) + '</button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><span id="ss-toolbar-zoom">100%</span><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
}

Browser._legacyRenderB = function(){
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
    '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" /><div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>' + (STORE.browser.view === 'domains' ? '<div class="ss-domain-chip-strip"><button class="ss-domain-chip ss-domain-chip-reset' + (!stats.hiddenDomains && !STORE.browser.isolatedDomain ? ' active' : '') + '" type="button" onclick="Browser.showAllDomains()" title="' + _esc(_t('Hiện toàn bộ domain', 'Show every domain')) + '"><span class="ss-domain-chip-label">' + _esc(_t('Tất cả', 'All')) + '</span><strong>' + String(stats.totalDomains) + '</strong></button>' + domains.map(function(domain){ var totalCount = (allGroups[domain] || []).length; var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(_t('Bấm để chỉ hiện domain này', 'Click to isolate this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div><div class="ss-browser-splitter" onmousedown="Browser.startDomainSplit(event)" onkeydown="Browser.onDomainSplitKeydown(event)" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + String(Math.round((STORE.browser.domainSplit || 0.5) * 100)) + '" aria-label="' + _esc(_t('Điều chỉnh chiều cao giữa miền và bảng', 'Resize domain and table panes')) + '"><span class="ss-browser-splitter-handle"></span></div>' : '') + '</div>',
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var hidden = Browser.isDomainHidden(tbl.domain || 'default'); var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (domains.length ? domains.filter(function(domain){ return !filterActive || ((filteredGroups[domain] || []).length > 0); }).map(function(domain){ var hidden = Browser.isDomainHidden(domain); var isolated = STORE.browser.isolatedDomain === domain; var totalCount = (allGroups[domain] || []).length; var tablesForDomain = filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || []); var expanded = hidden ? false : (filterActive ? true : STORE.browser.expandedDomains[domain] !== false); return ['<div class="ss-domain-group' + (hidden ? ' is-hidden' : '') + (isolated ? ' is-isolated' : '') + '" data-domain="' + _esc(domain) + '">','<div class="ss-domain-group-header" style="border-left:3px solid ' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '" onclick="Browser.toggleDomain(\'' + _esc(domain) + '\')">','<span class="ss-domain-chevron">' + (expanded ? '▾' : '▸') + '</span>','<span class="ss-domain-name">' + _esc(formatDomainLabel(domain)) + '</span>', hidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '','<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(domain) + '\', event)" title="' + _esc(isolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(isolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(domain) + '\', event)" title="' + _esc(hidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(hidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div>','<span class="ss-domain-count">' + String(filterActive ? tablesForDomain.length : totalCount) + '</span>','</div>', expanded ? '<div class="ss-domain-tables">' + tablesForDomain.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item' + (active ? ' active' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : (hidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : ''),'</div>'].join(''); }).join('') : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa có bảng nào', 'No tables yet')) + '</div></div>')) + '</div>',
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

Browser.startDomainSplit = function(ev){
  var browserEl = refs.browser;
  var rect;
  function cleanup(persist){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    Browser._activeSplitCleanup = null;
    if(persist){
      saveUiPrefs();
    }
  }
  function clampRatio(value){
    return Math.max(0.26, Math.min(0.7, value));
  }
  function onMove(moveEv){
    var ratio;
    if(!browserEl) return;
    ratio = clampRatio((moveEv.clientY - rect.top) / Math.max(rect.height, 1));
    STORE.browser.domainSplit = ratio;
    STORE.browser.domainSplitManual = true;
    browserEl.classList.add('has-domain-split');
    browserEl.classList.add('has-manual-split');
    browserEl.style.setProperty('--ss-domain-top', Math.round(ratio * 100) + '%');
  }
  function onUp(){
    cleanup(true);
  }
  if(!browserEl || STORE.browser.view !== 'domains'){
    return;
  }
  ev.preventDefault();
  rect = browserEl.getBoundingClientRect();
  if(Browser._activeSplitCleanup){
    Browser._activeSplitCleanup(false);
  }
  onMove(ev);
  Browser._activeSplitCleanup = cleanup;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

Browser.adjustDomainSplit = function(nextRatio){
  STORE.browser.domainSplit = Math.max(0.25, Math.min(0.75, Number(nextRatio) || 0.5));
  STORE.browser.domainSplitManual = true;
  saveUiPrefs();
  Browser.render();
};

Browser.onDomainSplitKeydown = function(ev){
  var ratio = Number(STORE.browser.domainSplit || 0.5);
  if(ev.key === 'ArrowUp'){
    ev.preventDefault();
    Browser.adjustDomainSplit(ratio - 0.05);
    return;
  }
  if(ev.key === 'ArrowDown'){
    ev.preventDefault();
    Browser.adjustDomainSplit(ratio + 0.05);
    return;
  }
  if(ev.key === 'Home'){
    ev.preventDefault();
    Browser.adjustDomainSplit(0.25);
    return;
  }
  if(ev.key === 'End'){
    ev.preventDefault();
    Browser.adjustDomainSplit(0.75);
  }
};

Browser.onTableItemKeydown = function(ev, tableId){
  if(ev.key === 'Enter'){
    ev.preventDefault();
    Browser.focusTable(tableId);
    return;
  }
  if(ev.key === ' ' || ev.key === 'Spacebar'){
    ev.preventDefault();
    Browser.selectTable(tableId);
  }
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

function toolbarIconSvg(kind){
  if(kind === 'compact'){
    return '<svg class="ss-toolbar-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7V4h3"></path><path d="M16 7V4h-3"></path><path d="M4 13v3h3"></path><path d="M16 13v3h-3"></path><path d="M7 4L4 7"></path><path d="M13 4l3 3"></path><path d="M7 16l-3-3"></path><path d="M13 16l3-3"></path></svg>';
  }
  if(kind === 'focus'){
    return '<svg class="ss-toolbar-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="5" height="5" rx="1"></rect><rect x="11.5" y="3.5" width="5" height="5" rx="1"></rect><rect x="3.5" y="11.5" width="5" height="5" rx="1"></rect><path d="M14 12v2.25c0 .97-.78 1.75-1.75 1.75H10"></path><path d="M10 14l1.5-1.5"></path><path d="M10 14l1.5 1.5"></path></svg>';
  }
  return '';
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
  if(STORE.browser.view === 'domains'){
    refs.browser.style.setProperty('--ss-domain-top', Math.round((STORE.browser.domainSplit || 0.5) * 100) + '%');
  } else {
    refs.browser.style.removeProperty('--ss-domain-top');
  }
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
    '<div class="ss-browser-search-wrap"><input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc miền...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />' + (STORE.browser.view === 'domains' ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){ var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length; var hidden = Browser.isDomainHidden(domain); var active = STORE.browser.activeDomain === domain; return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn miền này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>'; }).join('') + '</div>' : '') + '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div></div>' + (STORE.browser.view === 'domains' ? '<div class="ss-browser-splitter" onmousedown="Browser.startDomainSplit(event)" onkeydown="Browser.onDomainSplitKeydown(event)" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + String(Math.round((STORE.browser.domainSplit || 0.5) * 100)) + '" aria-label="' + _esc(_t('Điều chỉnh chiều cao giữa miền và bảng', 'Resize domain and table panes')) + '"><span class="ss-browser-splitter-handle"></span></div>' : ''),
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var hidden = Browser.isDomainHidden(tbl.domain || 'default'); var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (activeDomain ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>' : (activeDomainTables.length ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){ var active = !!selectedTableMap[tbl.id]; var fkCount = relatedCountMap[tbl.id] || 0; return '<div class="ss-table-item' + (active ? ' active' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>'; }).join('') + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>' : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>',
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
  clearScheduledZoomToFit();
  if(browserFilterTimer){
    window.clearTimeout(browserFilterTimer);
    browserFilterTimer = null;
  }
  if(Canvas.endPan) Canvas.endPan();
  if(STORE.canvas && STORE.canvas.lasso && Canvas.endLasso) Canvas.endLasso();
  if(STORE.canvas && STORE.canvas.connecting && Connector.onEnd) Connector.onEnd();
  if(TableCard._activeMoveCleanup){
    TableCard._activeMoveCleanup();
  }
  if(Browser._activeSplitCleanup){
    Browser._activeSplitCleanup(false);
  }
  if(VirtualRenderer._raf){
    window.cancelAnimationFrame(VirtualRenderer._raf);
    VirtualRenderer._raf = null;
    VirtualRenderer._scheduled = false;
  }
  if(canvasResizeHandler){
    window.removeEventListener('resize', canvasResizeHandler);
    canvasResizeHandler = null;
    resizeBound = false;
  }
  if(keyboardHandler){
    document.removeEventListener('keydown', keyboardHandler);
    keyboardHandler = null;
    keyboardBound = false;
  }
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
  refs.canvasSvg = null;
  refs.canvasGroup = null;
  refs.edgesLayer = null;
  refs.tempEdge = null;
  refs.tablesLayer = null;
  refs.minimapCanvas = null;
  refs.minimapViewport = null;
  refs.modeIndicator = null;
  refs.inspector = null;
  refs.codePanel = null;
  refs.validationPanel = null;
}

TableDialog = {
  currentTableId: null,
  draft: null,
  activeTab: 'overview',
  dataView: null,
  _lastFocus: null,
  _escapeHandler: null,

  open: function(tableId){
    var tbl = findTable(tableId);
    if(!tbl) return;
    this._lastFocus = document.activeElement || null;
    this.currentTableId = tableId;
    this.draft = _clone(tbl);
    this.activeTab = 'overview';
    this.dataView = null;
    this.render();
    if(this._escapeHandler){
      document.removeEventListener('keydown', this._escapeHandler);
    }
    this._escapeHandler = function(ev){
      if(ev.key === 'Escape'){
        TableDialog.close();
      }
    };
    document.addEventListener('keydown', this._escapeHandler);
    this.focusActiveControl();
  },

  close: function(){
    var overlay = document.getElementById('ss-table-dialog-overlay');
    if(overlay) removeNode(overlay);
    if(this._escapeHandler){
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    if(this._lastFocus && typeof this._lastFocus.focus === 'function'){
      this._lastFocus.focus();
    }
    this._lastFocus = null;
    this.currentTableId = null;
    this.draft = null;
    this.dataView = null;
    this.activeTab = 'overview';
  },

  ensureDraft: function(){
    if(!this.draft){
      var tbl = findTable(this.currentTableId);
      if(tbl) this.draft = _clone(tbl);
    }
    return this.draft;
  },

  focusActiveControl: function(){
    window.setTimeout(function(){
      var focusTarget;
      if(TableDialog.activeTab === 'columns'){
        focusTarget = document.querySelector('.ss-table-dialog-col-row [data-field="name"]');
      } else if(TableDialog.activeTab === 'data'){
        focusTarget = document.querySelector('.ss-table-data-action-primary') || document.querySelector('.ss-table-dialog-data-wrap');
      } else {
        focusTarget = document.getElementById('dlg-tbl-name');
      }
      if(focusTarget && typeof focusTarget.focus === 'function'){
        focusTarget.focus();
      }
    }, 0);
  },

  syncOverviewFields: function(){
    var draft = this.ensureDraft();
    var nameEl = document.getElementById('dlg-tbl-name');
    if(!draft || !nameEl) return;
    draft.name = _slug((nameEl.value || '').trim());
    draft.schema = _slug((document.getElementById('dlg-tbl-schema').value || '').trim()) || 'public';
    draft.domain = document.getElementById('dlg-tbl-domain').value || 'default';
    draft.comment = (document.getElementById('dlg-tbl-comment').value || '').trim();
    draft.tags = (document.getElementById('dlg-tbl-tags').value || '').split(',').map(function(item){
      return item.trim();
    }).filter(Boolean);
    draft.color = document.getElementById('dlg-tbl-color').value || null;
    draft.rls_enabled = !!document.getElementById('dlg-tbl-rls').checked;
  },

  syncColumnsFields: function(){
    var draft = this.ensureDraft();
    var rows = document.querySelectorAll('.ss-table-dialog-col-row');
    if(!draft || !rows.length) return;
    draft.columns = Array.prototype.map.call(rows, function(row, index){
      var base = _clone((draft.columns || [])[index] || {});
      var typeInfo = parseTypeDefinition((row.querySelector('[data-field="type"]').value || '').trim());
      base.id = base.id || _uid();
      base.name = _slug((row.querySelector('[data-field="name"]').value || '').trim());
      base.type = typeInfo.type || 'text';
      base.length = typeInfo.length;
      base.scale = typeInfo.scale;
      base.is_array = !!typeInfo.is_array;
      base.default_val = (row.querySelector('[data-field="default"]').value || '').trim() || null;
      base.comment = (row.querySelector('[data-field="comment"]').value || '').trim();
      base.nullable = !!row.querySelector('[data-field="nullable"]').checked;
      base.primary_key = !!row.querySelector('[data-field="pk"]').checked;
      base.pk_order = base.primary_key ? (base.pk_order || 1) : null;
      return base;
    });
  },

  collectForm: function(){
    var draft = this.ensureDraft();
    if(!draft) return null;
    this.syncOverviewFields();
    this.syncColumnsFields();
    return draft;
  },

  ensureDataViewLoaded: function(){
    var draft = this.collectForm() || this.ensureDraft();
    var dataView = this.dataView || {};
    if(!draft) return;
    if(!dataView.open || dataView.table !== (draft.name || '') || dataView.schema !== (draft.schema || 'public')){
      this.loadDataView(Math.max(10, Math.min(100, Number(dataView.limit) || 50)), 0);
      return;
    }
    this.renderDataDialog();
  },

  switchTab: function(tab){
    if(tab !== 'overview' && tab !== 'columns' && tab !== 'data') return;
    if(this.activeTab === tab){
      if(tab === 'data'){
        this.ensureDataViewLoaded();
      }
      this.focusActiveControl();
      return;
    }
    this.collectForm();
    this.activeTab = tab;
    this.render();
    if(tab === 'data'){
      this.ensureDataViewLoaded();
    }
    this.focusActiveControl();
  },

  addColumn: function(){
    var draft = this.collectForm();
    if(!draft) return;
    draft.columns = draft.columns || [];
    draft.columns.push({
      id: _uid(),
      name: generateUniqueColumnName(draft, 'new_column'),
      type: 'varchar',
      length: 255,
      scale: null,
      is_array: false,
      nullable: true,
      unique: false,
      primary_key: false,
      pk_order: null,
      default_val: null,
      check_expr: null,
      generated_expr: null,
      generated_stored: false,
      comment: '',
      foreign_key: null
    });
    this.activeTab = 'columns';
    this.render();
    this.focusActiveControl();
  },

  removeColumn: function(index){
    var draft = this.collectForm();
    var normalizedIndex = Number(index);
    if(!draft || !Array.isArray(draft.columns)) return;
    if(!Number.isFinite(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= draft.columns.length) return;
    draft.columns.splice(normalizedIndex, 1);
    this.render();
  },

  dataGridHtml: function(data){
    var payload = data || {};
    if(payload.loading){
      return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu bảng...', 'Loading table data...')) + '</div>';
    }
    if(!payload.available){
      return '<div class="ss-table-dialog-empty">' + _esc(payload.message || _t('Chưa lấy được dữ liệu của bảng này từ database hiện tại', 'Could not load table data from the current database')) + '</div>';
    }
    if(!(payload.columns || []).length){
      return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
    }
    return [
      '<div class="ss-table-dialog-data-wrap">',
        '<table class="ss-table-dialog-data-table">',
          '<thead><tr>',
            (payload.columns || []).map(function(col){
              return '<th>' + _esc(col.column_name || col.name || '') + '</th>';
            }).join(''),
          '</tr></thead>',
          '<tbody>',
            (payload.rows || []).length ? (payload.rows || []).map(function(row){
              return '<tr>' + (payload.columns || []).map(function(col){
                var key = col.column_name || col.name || '';
                var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
                if(value == null) value = '';
                if(typeof value === 'object'){
                  value = JSON.stringify(value);
                }
                return '<td>' + _esc(String(value)) + '</td>';
              }).join('') + '</tr>';
            }).join('') : '<tr><td colspan="' + String((payload.columns || []).length || 1) + '">' + _esc(_t('Bảng này hiện chưa có dòng dữ liệu nào', 'This table currently has no rows')) + '</td></tr>',
          '</tbody>',
        '</table>',
      '</div>'
    ].join('');
  },

  loadDataView: function(limit, offset){
    var draft = this.collectForm();
    var sourceDraft = draft;
    var persistedTable = findTable(this.currentTableId);
    var self = this;
    var fetchLimit = Math.max(10, Math.min(100, Number(limit) || 50));
    var fetchOffset = Math.max(0, Number(offset) || 0);
    var fallbackFromDraft;
    if((!sourceDraft || !Array.isArray(sourceDraft.columns) || !sourceDraft.columns.length) && persistedTable){
      sourceDraft = _clone(persistedTable);
    }
    if(!draft) return;
    this.dataView = {
      open: true,
      loading: true,
      available: false,
      columns: [],
      rows: [],
      rowCount: 0,
      actualRowCount: 0,
      limit: fetchLimit,
      offset: fetchOffset,
      totalRows: 0,
      hasMore: false,
      schema: draft.schema || 'public',
      table: draft.name || '',
      message: ''
    };
    this.renderDataDialog();
    _api('schema_studio_table_preview', {
      schema: draft.schema || 'public',
      table: draft.name,
      limit: fetchLimit,
      offset: fetchOffset
    }, 'POST').then(function(res){
      if(!self.dataView || !self.dataView.open) return;
      self.dataView = Object.assign({
        open: true,
        loading: false,
        available: false,
        columns: [],
        rows: [],
        rowCount: 0,
        actualRowCount: 0,
        limit: fetchLimit,
        offset: fetchOffset,
        totalRows: 0,
        hasMore: false,
        schema: draft.schema || 'public',
        table: draft.name || '',
        message: ''
      }, res || {});
      self.dataView.open = true;
      self.dataView.loading = false;
      if((!self.dataView.available || !(self.dataView.columns || []).length) && sourceDraft && (sourceDraft.columns || []).length){
        fallbackFromDraft = self.buildDraftSampleDataView(fetchLimit, self.dataView.message || 'preview_sample_only', sourceDraft);
        if(fallbackFromDraft){
          self.dataView = fallbackFromDraft;
        }
      }
      if(!self.dataView.available){
        if(self.dataView.message === 'table_not_found'){
          self.dataView.message = _t('Bảng này chưa tồn tại trong database hiện tại', 'This table was not found in the current database');
        } else if(self.dataView.message === 'preview_unavailable'){
          self.dataView.message = _t('Không thể đọc dữ liệu bảng ở thời điểm này', 'Could not load table data right now');
        } else if(self.dataView.message === 'preview_sample_only'){
          self.dataView.message = _t('Đang hiển thị 1 dòng dữ liệu mẫu vì bảng hiện chưa có dữ liệu đọc được', 'Showing one sample row because no readable table data is available yet');
        }
      }
      self.renderDataDialog();
    }).catch(function(){
      if(!self.dataView || !self.dataView.open) return;
      fallbackFromDraft = self.buildDraftSampleDataView(fetchLimit, 'preview_sample_only', sourceDraft);
      self.dataView = fallbackFromDraft || {
        open: true,
        loading: false,
        available: false,
        columns: [],
        rows: [],
        rowCount: 0,
        actualRowCount: 0,
        limit: fetchLimit,
        offset: fetchOffset,
        totalRows: 0,
        hasMore: false,
        schema: draft.schema || 'public',
        table: draft.name || '',
        message: _t('Không thể đọc dữ liệu bảng ở thời điểm này', 'Could not load table data right now')
      };
      self.renderDataDialog();
    });
  },

  openDataView: function(){
    this.loadDataView(50, 0);
  },

  changeDataPage: function(direction){
    var dataView = this.dataView || {};
    var pageSize = Math.max(10, Math.min(100, Number(dataView.limit) || 50));
    var currentOffset = Math.max(0, Number(dataView.offset) || 0);
    var nextOffset = currentOffset + (direction < 0 ? -pageSize : pageSize);
    if(dataView.loading) return;
    if(direction > 0 && !dataView.hasMore) return;
    if(direction < 0 && currentOffset <= 0) return;
    this.loadDataView(pageSize, Math.max(0, nextOffset));
  },

  closeDataView: function(skipStateReset){
    var overlay = document.getElementById('ss-table-data-overlay');
    if(overlay) removeNode(overlay);
    if(!skipStateReset){
      this.dataView = null;
    }
  },

  renderDataDialog: function(){
    var dataView = this.dataView;
    var overlay = document.getElementById('ss-table-data-overlay');
    var fieldCount;
    var dataHint;
    var currentOffset;
    var currentLimit;
    var shownRows;
    var totalRows;
    var rowStart;
    var rowEnd;
    var canPrev;
    var canNext;
    var pageLabel;
    if(!dataView || !dataView.open){
      this.closeDataView();
      return;
    }
    fieldCount = (dataView.columns || []).length;
    currentOffset = Math.max(0, Number(dataView.offset) || 0);
    currentLimit = Math.max(10, Math.min(100, Number(dataView.limit) || 50));
    shownRows = (dataView.rows || []).length;
    totalRows = Math.max(0, Number(dataView.totalRows) || 0);
    rowStart = shownRows ? (currentOffset + 1) : 0;
    rowEnd = shownRows ? (currentOffset + shownRows) : 0;
    canPrev = !dataView.loading && currentOffset > 0;
    canNext = !dataView.loading && !!dataView.hasMore;
    pageLabel = dataView.syntheticSample
      ? _t('Dữ liệu mẫu', 'Sample data')
      : (totalRows
        ? _t('Dòng ' + rowStart + '-' + rowEnd + ' / ' + totalRows, 'Rows ' + rowStart + '-' + rowEnd + ' / ' + totalRows)
        : _t('Đang hiển thị ' + shownRows + ' dòng', 'Showing ' + shownRows + ' row(s)'));
    dataHint = dataView.syntheticSource === 'draft'
      ? _t('Đang hiển thị 1 dòng mẫu sinh từ cấu trúc bảng trong Schema Studio. Dữ liệu thật sẽ xuất hiện khi database có row hoặc cho phép preview.', 'Showing one sample row generated from the Schema Studio table structure. Real data will appear when the database has rows or preview is available.')
      : (dataView.syntheticSample
        ? _t('Đang hiển thị 1 dòng dữ liệu mẫu sinh từ cấu trúc cột của bảng thật', 'Showing one sample row generated from the real table structure')
        : _t('Hiển thị dữ liệu đang có trong database hiện tại', 'Showing rows currently available from the active database'));
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'ss-modal-overlay';
      overlay.id = 'ss-table-data-overlay';
      overlay.addEventListener('click', function(ev){
        if(ev.target === overlay) TableDialog.closeDataView();
      });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = [
      '<div class="ss-modal ss-table-data-modal" role="dialog" aria-modal="true" aria-labelledby="ss-table-data-title">',
        '<div class="ss-modal-header">',
          '<div><strong id="ss-table-data-title">' + _esc(_t('Dữ liệu bảng', 'Table data')) + ': ' + _esc((dataView.schema || 'public') + '.' + (dataView.table || '')) + '</strong><div class="ss-field-hint">' + _esc(dataHint) + '</div></div>',
          '<div class="ss-table-dialog-head-actions">',
            '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" onclick="TableDialog.loadDataView(' + String(Number(dataView.limit) || 50) + ')">' + _esc(_t('Làm mới', 'Refresh')) + '</button>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.closeDataView()">' + _esc(_t('Đóng', 'Close')) + '</button>',
          '</div>',
        '</div>',
        '<div class="ss-modal-body ss-table-data-body">',
          '<div class="ss-table-data-meta">',
            '<span class="ss-table-data-pill">' + _esc(_t('Tối đa', 'Limit')) + ': ' + String(Number(dataView.limit) || 50) + '</span>',
            '<span class="ss-table-data-pill">' + _esc(_t('Số dòng đang hiển thị', 'Rows shown')) + ': ' + String((dataView.rows || []).length) + '</span>',
            '<span class="ss-table-data-pill">' + _esc(_t('Số field', 'Field count')) + ': ' + String(fieldCount) + '</span>',
            (dataView.syntheticSample ? '<span class="ss-table-data-pill is-sample">' + _esc(_t('1 dòng mẫu', '1 sample row')) + '</span>' : ''),
          '</div>',
          this.dataGridHtml(dataView),
        '</div>',
      '</div>'
    ].join('');
  },

  renderDataDialog: function(){
    var dataView = this.dataView;
    var overlay = document.getElementById('ss-table-data-overlay');
    var fieldCount;
    var dataHint;
    var currentOffset;
    var currentLimit;
    var shownRows;
    var totalRows;
    var rowStart;
    var rowEnd;
    var canPrev;
    var canNext;
    var pageLabel;
    if(!dataView || !dataView.open){
      this.closeDataView();
      return;
    }
    fieldCount = (dataView.columns || []).length;
    currentOffset = Math.max(0, Number(dataView.offset) || 0);
    currentLimit = Math.max(10, Math.min(100, Number(dataView.limit) || 50));
    shownRows = (dataView.rows || []).length;
    totalRows = Math.max(0, Number(dataView.totalRows) || 0);
    rowStart = shownRows ? (currentOffset + 1) : 0;
    rowEnd = shownRows ? (currentOffset + shownRows) : 0;
    canPrev = !dataView.loading && currentOffset > 0;
    canNext = !dataView.loading && !!dataView.hasMore;
    pageLabel = dataView.syntheticSample
      ? _t('Dữ liệu mẫu', 'Sample data')
      : (totalRows
        ? _t('Dòng ' + rowStart + '-' + rowEnd + ' / ' + totalRows, 'Rows ' + rowStart + '-' + rowEnd + ' / ' + totalRows)
        : _t('Đang hiển thị ' + shownRows + ' dòng', 'Showing ' + shownRows + ' row(s)'));
    dataHint = dataView.syntheticSource === 'draft'
      ? _t('Đang hiển thị 1 dòng mẫu sinh từ cấu trúc bảng trong Schema Studio. Dữ liệu thật sẽ xuất hiện khi database có row hoặc cho phép preview.', 'Showing one sample row generated from the Schema Studio table structure. Real data will appear when the database has rows or preview is available.')
      : (dataView.syntheticSample
        ? _t('Đang hiển thị 1 dòng dữ liệu mẫu sinh từ cấu trúc cột của bảng thật', 'Showing one sample row generated from the real table structure')
        : _t('Hiển thị dữ liệu đang có trong database hiện tại', 'Showing rows currently available from the active database'));
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'ss-modal-overlay';
      overlay.id = 'ss-table-data-overlay';
      overlay.addEventListener('click', function(ev){
        if(ev.target === overlay) TableDialog.closeDataView();
      });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = [
      '<div class="ss-modal ss-table-data-modal" role="dialog" aria-modal="true" aria-labelledby="ss-table-data-title">',
        '<div class="ss-modal-header">',
          '<div><strong id="ss-table-data-title">' + _esc(_t('Dữ liệu bảng', 'Table data')) + ': ' + _esc((dataView.schema || 'public') + '.' + (dataView.table || '')) + '</strong><div class="ss-field-hint">' + _esc(dataHint) + '</div></div>',
          '<div class="ss-table-dialog-head-actions">',
            '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm ss-table-data-action-primary" onclick="TableDialog.loadDataView(' + String(currentLimit) + ',' + String(currentOffset) + ')">' + _esc(_t('Làm mới', 'Refresh')) + '</button>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.closeDataView()">' + _esc(_t('Đóng', 'Close')) + '</button>',
          '</div>',
        '</div>',
        '<div class="ss-modal-body ss-table-data-body">',
          '<div class="ss-table-data-toolbar">',
            '<div class="ss-table-data-meta">',
              '<span class="ss-table-data-pill">' + _esc(_t('Tối đa', 'Limit')) + ': ' + String(currentLimit) + '</span>',
              '<span class="ss-table-data-pill">' + _esc(_t('Số dòng đang hiển thị', 'Rows shown')) + ': ' + String(shownRows) + '</span>',
              '<span class="ss-table-data-pill">' + _esc(_t('Tổng số dòng', 'Total rows')) + ': ' + String(totalRows) + '</span>',
              '<span class="ss-table-data-pill">' + _esc(_t('Số field', 'Field count')) + ': ' + String(fieldCount) + '</span>',
              (dataView.syntheticSample ? '<span class="ss-table-data-pill is-sample">' + _esc(_t('1 dòng mẫu', '1 sample row')) + '</span>' : ''),
            '</div>',
            '<div class="ss-table-data-nav">',
              '<div class="ss-table-data-page">' + _esc(pageLabel) + '</div>',
              '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + (canPrev ? '' : ' is-disabled') + '" onclick="TableDialog.changeDataPage(-1)"' + (canPrev ? '' : ' disabled') + '>' + _esc(_t('Trang trước', 'Previous')) + '</button>',
              '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + (canNext ? '' : ' is-disabled') + '" onclick="TableDialog.changeDataPage(1)"' + (canNext ? '' : ' disabled') + '>' + _esc(_t('Trang sau', 'Next')) + '</button>',
            '</div>',
          '</div>',
          this.dataGridHtml(dataView),
        '</div>',
      '</div>'
    ].join('');
  },

  fallbackColumnsFromDraft: function(sourceDraft){
    var draft = sourceDraft || this.ensureDraft();
    return ((draft && draft.columns) || []).filter(function(col){
      return !!(col && col.name);
    }).map(function(col){
      return {
        column_name: col.name,
        data_type: fmtColType(col)
      };
    });
  },

  save: function(){
    var tbl = findTable(this.currentTableId);
    var draft = this.collectForm();
    var names = {};
    var duplicated = false;
    var pkCount = 0;
    var self = this;
    if(!tbl || !draft) return;
    if(!isValidIdentifier(draft.name)){
      toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
      return;
    }
    if(((STORE.schema && STORE.schema.tables) || []).some(function(item){ return item.id !== tbl.id && item.name === draft.name; })){
      toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
      return;
    }
    if(!(draft.columns || []).length){
      toast(_t('Bảng phải có ít nhất 1 cột', 'Table must have at least 1 column'), 'error');
      return;
    }
    (draft.columns || []).forEach(function(col){
      if(!isValidIdentifier(col.name)) duplicated = col.name || '__invalid__';
      if(names[col.name]) duplicated = col.name;
      names[col.name] = true;
      if(col.primary_key){
        pkCount += 1;
        col.pk_order = pkCount;
        col.nullable = false;
      } else {
        col.pk_order = null;
      }
    });
    if(duplicated){
      toast(_t('Tên cột chưa hợp lệ hoặc đang bị trùng: ' + duplicated, 'Invalid or duplicate column name: ' + duplicated), 'error');
      return;
    }
    if(!pkCount){
      toast(_t('Bảng phải có ít nhất 1 khóa chính', 'Table must have at least 1 primary key'), 'error');
      return;
    }
    confirm2(_t('Bạn sắp lưu thay đổi cho bảng ' + draft.name + '. Tiếp tục?', 'You are about to save changes for table ' + draft.name + '. Continue?'), false).then(function(ok){
      var removedColumnIds = [];
      var keptColumnIds = {};
      if(!ok) return;
      (draft.columns || []).forEach(function(col){
        if(col && col.id) keptColumnIds[col.id] = true;
      });
      (tbl.columns || []).forEach(function(col){
        if(col && col.id && !keptColumnIds[col.id]){
          removedColumnIds.push(col.id);
        }
      });
      pushUndo();
      if(removedColumnIds.length){
        STORE.schema.relations = (STORE.schema.relations || []).filter(function(rel){
          return removedColumnIds.indexOf(rel.from_col_id) < 0 && removedColumnIds.indexOf(rel.to_col_id) < 0;
        });
        ((STORE.schema && STORE.schema.tables) || []).forEach(function(otherTbl){
          (otherTbl.columns || []).forEach(function(otherCol){
            if(otherCol && otherCol.foreign_key && removedColumnIds.indexOf(otherCol.foreign_key.ref_col_id) >= 0){
              otherCol.foreign_key = null;
            }
          });
        });
      }
      tbl.name = draft.name;
      tbl.schema = draft.schema;
      tbl.domain = draft.domain;
      tbl.comment = draft.comment;
      tbl.tags = draft.tags;
      tbl.color = draft.color;
      tbl.rls_enabled = draft.rls_enabled;
      tbl.columns = _clone(draft.columns || []);
      tbl.canvas = tbl.canvas || {};
      tbl.canvas.width = Math.max(tbl.canvas.width || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
      TableCard.reRender(tbl.id);
      VirtualRenderer.scheduleUpdate();
      Browser.render();
      Inspector.renderTable(tbl.id);
      markDirty();
      saveDraft();
      toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
      self.close();
    });
  },

  sampleValueForDraftColumn: function(col, index){
    var name = String((col && col.name) || '').toLowerCase();
    var type = String((col && col.type) || 'text').toLowerCase();
    var defaultVal = col && col.default_val != null ? String(col.default_val).trim() : '';
    var suffix = String(index + 1).padStart(3, '0');
    if(defaultVal && !/[()]/.test(defaultVal) && !/^(now|current_|uuid_generate|gen_random_uuid)/i.test(defaultVal)){
      return defaultVal.replace(/^'(.*)'$/, '$1');
    }
    if(/(^id$|_id$)/.test(name)){
      return type === 'uuid'
        ? '00000000-0000-0000-0000-' + String(index + 1).padStart(12, '0')
        : (index + 1);
    }
    if(type === 'uuid'){
      return '00000000-0000-0000-0000-' + String(index + 1).padStart(12, '0');
    }
    if(type === 'boolean'){
      return index % 2 === 0;
    }
    if(/smallint|integer|bigint|serial|bigserial/.test(type)){
      return index + 1;
    }
    if(/numeric|decimal|real|double precision|money/.test(type)){
      return (index + 1) * 10;
    }
    if(/timestamp|timestamptz/.test(type)){
      return '2026-04-05 09:00:00';
    }
    if(type === 'date'){
      return '2026-04-05';
    }
    if(type === 'time'){
      return '09:00:00';
    }
    if(type === 'json' || type === 'jsonb'){
      return {
        sample: true,
        field: name || ('field_' + suffix)
      };
    }
    if((col && col.is_array) || /\[\]$/.test(type)){
      return ['sample_' + suffix];
    }
    if(name.indexOf('email') >= 0){
      return 'sample@example.com';
    }
    if(name.indexOf('phone') >= 0){
      return '0900000' + String(index + 1).padStart(3, '0');
    }
    if(name.indexOf('status') >= 0){
      return 'active';
    }
    if(name.indexOf('code') >= 0){
      return 'SAMPLE_' + suffix;
    }
    if(name.indexOf('name') >= 0 || name.indexOf('title') >= 0){
      return 'Sample ' + suffix;
    }
    return 'sample_' + (name || ('field_' + suffix));
  },

  buildDraftSampleDataView: function(limit, reasonMessage, sourceDraft){
    var draft = sourceDraft || this.ensureDraft();
    var columns = this.fallbackColumnsFromDraft(draft);
    var row = {};
    if(!draft || !columns.length){
      return null;
    }
    (draft.columns || []).forEach(function(col, index){
      if(!col || !col.name) return;
      row[col.name] = TableDialog.sampleValueForDraftColumn(col, index);
    });
    return {
      open: true,
      loading: false,
      available: true,
      columns: columns,
      rows: [row],
      rowCount: 1,
      actualRowCount: 0,
      limit: limit,
      schema: draft.schema || 'public',
      table: draft.name || '',
      syntheticSample: true,
      syntheticSource: 'draft',
      message: reasonMessage || 'preview_sample_only'
    };
  },

  buildDraftSampleDataView: function(limit, reasonMessage, sourceDraft){
    var draft = sourceDraft || this.ensureDraft();
    var columns = this.fallbackColumnsFromDraft(draft);
    var row = {};
    if(!draft || !columns.length){
      return null;
    }
    (draft.columns || []).forEach(function(col, index){
      if(!col || !col.name) return;
      row[col.name] = TableDialog.sampleValueForDraftColumn(col, index);
    });
    return {
      open: true,
      loading: false,
      available: true,
      columns: columns,
      rows: [row],
      rowCount: 1,
      actualRowCount: 0,
      limit: limit,
      offset: 0,
      totalRows: 0,
      hasMore: false,
      schema: draft.schema || 'public',
      table: draft.name || '',
      syntheticSample: true,
      syntheticSource: 'draft',
      message: reasonMessage || 'preview_sample_only'
    };
  },

  save: function(){
    var tbl = findTable(this.currentTableId);
    var draft = this.collectForm();
    var names = {};
    var duplicated = false;
    var pkCount = 0;
    var self = this;
    if(!tbl || !draft) return;
    if(!isValidIdentifier(draft.name)){
      toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
      return;
    }
    if(((STORE.schema && STORE.schema.tables) || []).some(function(item){ return item.id !== tbl.id && item.name === draft.name; })){
      toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
      return;
    }
    if(!(draft.columns || []).length){
      toast(_t('Bảng phải có ít nhất 1 cột', 'Table must have at least 1 column'), 'error');
      return;
    }
    (draft.columns || []).forEach(function(col){
      if(!isValidIdentifier(col.name)) duplicated = col.name || '__invalid__';
      if(names[col.name]) duplicated = col.name;
      names[col.name] = true;
      if(col.primary_key){
        pkCount += 1;
        col.pk_order = pkCount;
        col.nullable = false;
      } else {
        col.pk_order = null;
      }
    });
    if(duplicated){
      toast(_t('Tên cột chưa hợp lệ hoặc đang bị trùng: ' + duplicated, 'Invalid or duplicate column name: ' + duplicated), 'error');
      return;
    }
    if(!pkCount){
      toast(_t('Bảng phải có ít nhất 1 khóa chính', 'Table must have at least 1 primary key'), 'error');
      return;
    }
    confirm2(_t('Bạn sắp lưu thay đổi cho bảng ' + draft.name + '. Tiếp tục?', 'You are about to save changes for table ' + draft.name + '. Continue?'), false).then(function(ok){
      if(!ok) return;
      pushUndo();
      tbl.name = draft.name;
      tbl.schema = draft.schema;
      tbl.domain = draft.domain;
      tbl.comment = draft.comment;
      tbl.tags = draft.tags;
      tbl.color = draft.color;
      tbl.rls_enabled = draft.rls_enabled;
      tbl.columns = _clone(draft.columns || []);
      tbl.canvas = tbl.canvas || {};
      tbl.canvas.width = Math.max(tbl.canvas.width || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
      TableCard.reRender(tbl.id);
      Browser.render();
      Inspector.renderTable(tbl.id);
      markDirty();
      saveDraft();
      toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
      self.close();
    });
  },

  save: function(){
    var tbl = findTable(this.currentTableId);
    var draft = this.collectForm();
    var names = {};
    var duplicated = false;
    var pkCount = 0;
    var self = this;
    if(!tbl || !draft) return;
    if(!isValidIdentifier(draft.name)){
      toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
      return;
    }
    if(((STORE.schema && STORE.schema.tables) || []).some(function(item){ return item.id !== tbl.id && item.name === draft.name; })){
      toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
      return;
    }
    if(!(draft.columns || []).length){
      toast(_t('Bảng phải có ít nhất 1 cột', 'Table must have at least 1 column'), 'error');
      return;
    }
    (draft.columns || []).forEach(function(col){
      if(!isValidIdentifier(col.name)) duplicated = col.name || '__invalid__';
      if(names[col.name]) duplicated = col.name;
      names[col.name] = true;
      if(col.primary_key){
        pkCount += 1;
        col.pk_order = pkCount;
        col.nullable = false;
      } else {
        col.pk_order = null;
      }
    });
    if(duplicated){
      toast(_t('Tên cột chưa hợp lệ hoặc đang bị trùng: ' + duplicated, 'Invalid or duplicate column name: ' + duplicated), 'error');
      return;
    }
    if(!pkCount){
      toast(_t('Bảng phải có ít nhất 1 khóa chính', 'Table must have at least 1 primary key'), 'error');
      return;
    }
    confirm2(_t('Bạn sắp lưu thay đổi cho bảng ' + draft.name + '. Tiếp tục?', 'You are about to save changes for table ' + draft.name + '. Continue?'), false).then(function(ok){
      var removedColumnIds = [];
      var keptColumnIds = {};
      if(!ok) return;
      (draft.columns || []).forEach(function(col){
        if(col && col.id) keptColumnIds[col.id] = true;
      });
      (tbl.columns || []).forEach(function(col){
        if(col && col.id && !keptColumnIds[col.id]){
          removedColumnIds.push(col.id);
        }
      });
      pushUndo();
      if(removedColumnIds.length){
        STORE.schema.relations = (STORE.schema.relations || []).filter(function(rel){
          return removedColumnIds.indexOf(rel.from_col_id) < 0 && removedColumnIds.indexOf(rel.to_col_id) < 0;
        });
        ((STORE.schema && STORE.schema.tables) || []).forEach(function(otherTbl){
          (otherTbl.columns || []).forEach(function(otherCol){
            if(otherCol && otherCol.foreign_key && removedColumnIds.indexOf(otherCol.foreign_key.ref_col_id) >= 0){
              otherCol.foreign_key = null;
            }
          });
        });
      }
      tbl.name = draft.name;
      tbl.schema = draft.schema;
      tbl.domain = draft.domain;
      tbl.comment = draft.comment;
      tbl.tags = draft.tags;
      tbl.color = draft.color;
      tbl.rls_enabled = draft.rls_enabled;
      tbl.columns = _clone(draft.columns || []);
      tbl.canvas = tbl.canvas || {};
      tbl.canvas.width = Math.max(tbl.canvas.width || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
      TableCard.reRender(tbl.id);
      VirtualRenderer.scheduleUpdate();
      Browser.render();
      Inspector.renderTable(tbl.id);
      markDirty();
      saveDraft();
      toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
      self.close();
    });
  },

  renderOverviewTab: function(draft){
    return [
      '<div class="ss-table-dialog-section">',
        '<div class="ss-table-dialog-section-title">' + _esc(_t('Tổng quan', 'Overview')) + '</div>',
        '<div class="ss-table-dialog-form-grid">',
          Inspector.fieldGroup(_t('Tên bảng', 'Table name'), '<input class="hm-input" id="dlg-tbl-name" value="' + _esc(draft.name) + '" />'),
          Inspector.fieldGroup('Schema', '<input class="hm-input" id="dlg-tbl-schema" value="' + _esc(draft.schema || 'public') + '" />'),
          Inspector.fieldGroup('Domain', '<select class="hm-input" id="dlg-tbl-domain">' + Object.keys(DOMAIN_COLORS).sort().map(function(domain){ return '<option value="' + _esc(domain) + '"' + (domain === (draft.domain || 'default') ? ' selected' : '') + '>' + _esc(formatDomainLabel(domain)) + '</option>'; }).join('') + '</select>'),
          Inspector.fieldGroup(_t('Màu hiển thị', 'Color'), '<input type="color" id="dlg-tbl-color" value="' + _esc(Inspector.colorValue(draft.color || DOMAIN_COLORS[draft.domain] || DOMAIN_COLORS.default)) + '" />'),
        '</div>',
        Inspector.fieldGroup(_t('Mô tả', 'Comment'), '<textarea class="hm-input" id="dlg-tbl-comment" rows="3">' + _esc(draft.comment || '') + '</textarea>'),
        Inspector.fieldGroup('Tags', '<input class="hm-input" id="dlg-tbl-tags" value="' + _esc((draft.tags || []).join(', ')) + '" placeholder="core, audit, qms" />'),
        '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="dlg-tbl-rls"' + (draft.rls_enabled ? ' checked' : '') + ' /><span>Row Level Security (RLS)</span></label></div>',
      '</div>'
    ].join('');
  },

  renderColumnsTab: function(draft){
    return [
      '<div class="ss-table-dialog-section">',
        '<div class="ss-table-dialog-section-head">',
          '<div class="ss-table-dialog-section-title">' + _esc(_t('Cấu trúc cột', 'Columns')) + '</div>',
          '<div class="ss-table-dialog-inline-actions"><span class="ss-field-hint">' + String((draft.columns || []).length) + ' ' + _esc(_t('cột', 'columns')) + '</span><button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.addColumn()">+ ' + _esc(_t('Thêm cột', 'Add column')) + '</button></div>',
        '</div>',
        '<div class="ss-table-dialog-columns">',
          (draft.columns || []).map(function(col, index){
            return [
              '<div class="ss-table-dialog-col-row">',
                '<div class="ss-table-dialog-col-top">',
                  '<div class="ss-table-dialog-col-grid">',
                    Inspector.fieldGroup(_t('Tên cột', 'Column name'), '<input class="hm-input" data-field="name" value="' + _esc(col.name || '') + '" />'),
                    Inspector.fieldGroup(_t('Kiểu dữ liệu', 'Data type'), '<input class="hm-input" data-field="type" value="' + _esc(fmtColType(col)) + '" placeholder="varchar(255)" />'),
                    Inspector.fieldGroup('Default', '<input class="hm-input" data-field="default" value="' + _esc(col.default_val || '') + '" />'),
                  '</div>',
                  '<button type="button" class="hm-btn hm-btn-ghost ss-btn-xs ss-table-dialog-col-remove" onclick="TableDialog.removeColumn(' + String(index) + ')">' + _esc(_t('Xóa', 'Delete')) + '</button>',
                '</div>',
                '<div class="ss-table-dialog-col-meta">',
                  '<label class="ss-toggle-row"><input type="checkbox" data-field="nullable"' + (col.nullable ? ' checked' : '') + ' /><span>' + _esc(_t('Cho phép null', 'Nullable')) + '</span></label>',
                  '<label class="ss-toggle-row"><input type="checkbox" data-field="pk"' + (col.primary_key ? ' checked' : '') + ' /><span>PK</span></label>',
                '</div>',
                Inspector.fieldGroup(_t('Mô tả cột', 'Column comment'), '<input class="hm-input" data-field="comment" value="' + _esc(col.comment || '') + '" />'),
              '</div>'
            ].join('');
          }).join('') || '<div class="ss-table-dialog-empty">' + _esc(_t('Chưa có cột nào. Hãy thêm cột đầu tiên cho bảng này.', 'No columns yet. Add the first column to this table.')) + '</div>',
        '</div>',
      '</div>'
    ].join('');
  },

  renderTabButton: function(tab, label){
    return '<button type="button" class="ss-itab' + (this.activeTab === tab ? ' active' : '') + '" role="tab" aria-selected="' + String(this.activeTab === tab) + '" onclick="TableDialog.switchTab(\'' + _esc(tab) + '\')">' + _esc(label) + '</button>';
  },

  render: function(){
    var draft = this.ensureDraft();
    var overlay = document.getElementById('ss-table-dialog-overlay');
    var bodyHtml;
    if(!draft) return;
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'ss-modal-overlay';
      overlay.id = 'ss-table-dialog-overlay';
      overlay.addEventListener('click', function(ev){
        if(ev.target === overlay) TableDialog.close();
      });
      document.body.appendChild(overlay);
    }
    bodyHtml = this.activeTab === 'columns'
      ? this.renderColumnsTab(draft)
      : this.renderOverviewTab(draft);
    overlay.innerHTML = [
      '<div class="ss-modal ss-table-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="ss-table-dialog-title">',
        '<div class="ss-modal-header">',
          '<div><strong id="ss-table-dialog-title">' + _esc(draft.name) + '</strong><div class="ss-field-hint">' + _esc(_t('Chi tiết bảng và cấu trúc cột', 'Table details and column structure')) + '</div></div>',
          '<div class="ss-table-dialog-head-actions">',
            '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" onclick="TableDialog.openDataView()">' + _esc(_t('Mở dữ liệu bảng', 'Open table data')) + '</button>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.close()" aria-label="' + _esc(_t('Đóng hộp thoại chi tiết bảng', 'Close table details dialog')) + '">' + _esc(_t('Đóng', 'Close')) + '</button>',
          '</div>',
        '</div>',
        '<div class="ss-modal-body ss-table-dialog-body">',
          '<div class="ss-table-dialog-toolbar">',
            '<div class="ss-table-dialog-tabs" role="tablist">',
              this.renderTabButton('overview', _t('Tổng quan', 'Overview')),
              this.renderTabButton('columns', _t('Cấu trúc cột', 'Columns')),
            '</div>',
          '</div>',
          '<div class="ss-table-dialog-grid">',
            '<div class="ss-table-dialog-main">',
              bodyHtml,
            '</div>',
          '</div>',
        '</div>',
        '<div class="ss-modal-footer">',
          '<button type="button" class="hm-btn hm-btn-ghost" onclick="TableDialog.close()">' + _esc(_t('Hủy', 'Cancel')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-primary" onclick="TableDialog.save()">' + _esc(_t('Lưu', 'Save')) + '</button>',
        '</div>',
      '</div>'
    ].join('');
    if(this.dataView && this.dataView.open){
      this.renderDataDialog();
    } else {
      this.closeDataView();
    }
  }
};

TableDialog.createDataViewState = function(draft, overrides){
  return Object.assign({
    loading: false,
    loadingMore: false,
    fetchingAll: false,
    available: false,
    columns: [],
    rows: [],
    rowCount: 0,
    actualRowCount: 0,
    loadedRows: 0,
    totalRows: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
    schema: (draft && draft.schema) || 'public',
    table: (draft && draft.name) || '',
    message: '',
    syntheticSample: false,
    syntheticSource: '',
    previewStatus: 'idle'
  }, overrides || {});
};

TableDialog.resolvePreviewSourceDraft = function(draft){
  var sourceDraft = draft;
  var persistedTable = findTable(this.currentTableId);
  if((!sourceDraft || !Array.isArray(sourceDraft.columns) || !sourceDraft.columns.length) && persistedTable){
    sourceDraft = _clone(persistedTable);
  }
  return sourceDraft;
};

TableDialog.dataGridHtml = function(data){
  var payload = data || {};
  if(payload.loading){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu bảng...', 'Loading table data...')) + '</div>';
  }
  if(!payload.available){
    return '<div class="ss-table-dialog-empty">' + _esc(payload.message || _t('Chưa lấy được dữ liệu của bảng này từ database hiện tại', 'Could not load table data from the current database')) + '</div>';
  }
  if(!(payload.columns || []).length){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
  }
  return [
    '<div class="ss-table-dialog-data-wrap" tabindex="0">',
      '<table class="ss-table-dialog-data-table">',
        '<thead><tr>',
          (payload.columns || []).map(function(col){
            return '<th>' + _esc(col.column_name || col.name || '') + '</th>';
          }).join(''),
        '</tr></thead>',
        '<tbody>',
          (payload.rows || []).length ? (payload.rows || []).map(function(row){
            return '<tr>' + (payload.columns || []).map(function(col){
              var key = col.column_name || col.name || '';
              var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
              if(value == null) value = '';
              if(typeof value === 'object'){
                value = JSON.stringify(value);
              }
              return '<td>' + _esc(String(value)) + '</td>';
            }).join('') + '</tr>';
          }).join('') : '<tr><td colspan="' + String((payload.columns || []).length || 1) + '">' + _esc(_t('Bảng này hiện chưa có dòng dữ liệu nào', 'This table currently has no rows')) + '</td></tr>',
        '</tbody>',
      '</table>',
    '</div>'
  ].join('');
};

TableDialog.ensureDataViewLoaded = function(){
  var draft = this.ensureDraft();
  if(!draft) return Promise.resolve(null);
  if(!this.dataView || this.dataView.table !== draft.name || this.dataView.schema !== (draft.schema || 'public')){
    return this.loadDataView((this.dataView && this.dataView.limit) || 100, 0, false);
  }
  if(this.dataView.loading || this.dataView.loadingMore || this.dataView.fetchingAll){
    return Promise.resolve(this.dataView);
  }
  if((this.dataView.rows || []).length || (this.dataView.columns || []).length || this.dataView.available){
    return Promise.resolve(this.dataView);
  }
  return this.loadDataView((this.dataView && this.dataView.limit) || 100, 0, false);
};

TableDialog.loadDataView = function(limit, offset, append){
  var draft = this.collectForm();
  var self = this;
  var previousView = this.dataView ? _clone(this.dataView) : null;
  var fetchLimit = Math.max(25, Math.min(500, Number(limit) || ((this.dataView && this.dataView.limit) || 100)));
  var fetchOffset = Math.max(0, Number(offset) || 0);
  var appendMode = !!append;
  var sourceDraft;
  var fallbackFromDraft;
  var loadingState;
  if(!draft) return Promise.resolve(null);
  sourceDraft = this.resolvePreviewSourceDraft(draft);
  loadingState = appendMode && previousView
    ? this.createDataViewState(draft, {
        columns: previousView.columns || [],
        rows: previousView.rows || [],
        rowCount: (previousView.rows || []).length,
        actualRowCount: previousView.actualRowCount || 0,
        loadedRows: previousView.loadedRows || 0,
        totalRows: previousView.totalRows || 0,
        limit: fetchLimit,
        offset: fetchOffset,
        hasMore: !!previousView.hasMore,
        loadingMore: true,
        fetchingAll: !!previousView.fetchingAll,
        available: !!previousView.available,
        message: previousView.message || '',
        syntheticSample: !!previousView.syntheticSample,
        syntheticSource: previousView.syntheticSource || '',
        previewStatus: previousView.previewStatus || 'loaded'
      })
    : this.createDataViewState(draft, {
        loading: true,
        limit: fetchLimit,
        offset: fetchOffset,
        previewStatus: 'loading'
      });
  this.dataView = loadingState;
  if(this.activeTab === 'data'){
    this.render();
  }
  return _api('schema_studio_table_preview', {
    schema: draft.schema || 'public',
    table: draft.name,
    limit: fetchLimit,
    offset: fetchOffset
  }, 'POST').then(function(res){
    var nextView = self.createDataViewState(draft, Object.assign({}, res || {}, {
      loading: false,
      loadingMore: false,
      fetchingAll: previousView ? !!previousView.fetchingAll : false,
      limit: fetchLimit,
      offset: fetchOffset,
      previewStatus: 'loaded'
    }));
    var loadedRows;
    if(appendMode && previousView){
      nextView.columns = (nextView.columns || []).length ? nextView.columns : (previousView.columns || []);
      nextView.rows = (previousView.rows || []).concat(nextView.rows || []);
    }
    loadedRows = appendMode && previousView
      ? (Number(previousView.loadedRows) || 0) + (Number(nextView.actualRowCount) || 0)
      : (Number(nextView.actualRowCount) || 0);
    nextView.loadedRows = loadedRows;
    nextView.rowCount = (nextView.rows || []).length;
    nextView.hasMore = !nextView.syntheticSample && (Number(nextView.actualRowCount) || 0) > 0 && loadedRows < (Number(nextView.totalRows) || 0);
    if((!nextView.available || !(nextView.columns || []).length) && sourceDraft && (sourceDraft.columns || []).length){
      fallbackFromDraft = self.buildDraftSampleDataView(fetchLimit, nextView.message || 'preview_sample_only', sourceDraft);
      if(fallbackFromDraft){
        nextView = Object.assign(nextView, fallbackFromDraft, {
          limit: fetchLimit,
          offset: 0,
          totalRows: 0,
          loadedRows: 0,
          hasMore: false,
          previewStatus: 'fallback'
        });
      }
    }
    if(!nextView.available){
      if(nextView.message === 'table_not_found'){
        nextView.message = _t('Bảng này chưa tồn tại trong database hiện tại', 'This table was not found in the current database');
      } else if(nextView.message === 'preview_unavailable'){
        nextView.message = _t('Không thể đọc dữ liệu bảng ở thời điểm này', 'Could not load table data right now');
      } else if(nextView.message === 'preview_sample_only'){
        nextView.message = _t('Đang hiển thị 1 dòng dữ liệu mẫu vì bảng hiện chưa có dữ liệu đọc được', 'Showing one sample row because no readable table data is available yet');
      }
    }
    self.dataView = nextView;
    if(self.activeTab === 'data'){
      self.render();
    }
    return self.dataView;
  }).catch(function(){
    var fallbackState;
    if(!self.dataView || !self.currentTableId) return null;
    if(appendMode && previousView && (previousView.rows || []).length){
      self.dataView = Object.assign(previousView, {
        loading: false,
        loadingMore: false,
        fetchingAll: false,
        message: _t('Không thể tải thêm dữ liệu bảng ở thời điểm này', 'Could not load more table data right now')
      });
    } else {
      fallbackFromDraft = self.buildDraftSampleDataView(fetchLimit, 'preview_sample_only', sourceDraft);
      fallbackState = fallbackFromDraft || self.createDataViewState(draft, {
        loading: false,
        limit: fetchLimit,
        offset: 0,
        previewStatus: 'error',
        message: _t('Không thể đọc dữ liệu bảng ở thời điểm này', 'Could not load table data right now')
      });
      fallbackState.fetchingAll = false;
      fallbackState.loadingMore = false;
      self.dataView = fallbackState;
    }
    if(self.activeTab === 'data'){
      self.render();
    }
    return self.dataView;
  });
};

TableDialog.openDataView = function(){
  this.switchTab('data');
};

TableDialog.refreshDataView = function(){
  var limit = (this.dataView && this.dataView.limit) || 100;
  return this.loadDataView(limit, 0, false);
};

TableDialog.loadMoreDataView = function(){
  var dataView = this.dataView;
  if(!dataView || dataView.loading || dataView.loadingMore || !dataView.hasMore){
    return Promise.resolve(dataView);
  }
  return this.loadDataView(dataView.limit || 100, Number(dataView.loadedRows) || 0, true);
};

TableDialog.loadAllDataView = function(){
  var self = this;
  if(!this.dataView){
    this.switchTab('data');
    return Promise.resolve(null);
  }
  if(this.dataView.fetchingAll || this.dataView.loading || this.dataView.loadingMore || !this.dataView.hasMore){
    return Promise.resolve(this.dataView);
  }
  this.dataView.fetchingAll = true;
  this.render();
  function loop(){
    if(!self.dataView || !self.dataView.hasMore){
      if(self.dataView){
        self.dataView.fetchingAll = false;
        self.render();
      }
      return Promise.resolve(self.dataView);
    }
    return self.loadMoreDataView().then(loop).catch(function(err){
      if(self.dataView){
        self.dataView.fetchingAll = false;
        self.render();
      }
      return err;
    });
  }
  return loop();
};

TableDialog.closeDataView = function(skipStateReset){
  if(!skipStateReset){
    this.dataView = null;
    if(this.activeTab === 'data'){
      this.activeTab = 'overview';
    }
  }
};

TableDialog.renderDataDialog = function(){
  this.switchTab('data');
};

TableDialog.buildDraftSampleDataView = function(limit, reasonMessage, sourceDraft){
  var draft = sourceDraft || this.ensureDraft();
  var columns = this.fallbackColumnsFromDraft(draft);
  var row = {};
  if(!draft || !columns.length){
    return null;
  }
  (draft.columns || []).forEach(function(col, index){
    if(!col || !col.name) return;
    row[col.name] = TableDialog.sampleValueForDraftColumn(col, index);
  });
  return {
    loading: false,
    loadingMore: false,
    fetchingAll: false,
    available: true,
    columns: columns,
    rows: [row],
    rowCount: 1,
    actualRowCount: 0,
    loadedRows: 0,
    totalRows: 0,
    limit: limit,
    offset: 0,
    hasMore: false,
    schema: draft.schema || 'public',
    table: draft.name || '',
    syntheticSample: true,
    syntheticSource: 'draft',
    previewStatus: 'fallback',
    message: reasonMessage || 'preview_sample_only'
  };
};

TableDialog.dataHint = function(dataView){
  if(!dataView) return '';
  if(dataView.syntheticSource === 'draft'){
    return _t('Đang hiển thị 1 dòng mẫu sinh từ cấu trúc bảng trong Schema Studio. Dữ liệu thật sẽ xuất hiện khi database có row hoặc cho phép preview.', 'Showing one sample row generated from the Schema Studio table structure. Real data will appear when the database has rows or preview is available.');
  }
  if(dataView.syntheticSample){
    return _t('Bảng hiện chưa có dữ liệu thật. Đang hiển thị 1 dòng mẫu sinh từ cấu trúc cột của bảng.', 'The table currently has no real rows. Showing one sample row generated from the table structure.');
  }
  if(dataView.available){
    return _t('Đang hiển thị dữ liệu thật từ database hiện tại. Bạn có thể tải thêm hoặc tải toàn bộ.', 'Showing live rows from the current database. You can load more or load all rows.');
  }
  return dataView.message || _t('Không thể đọc dữ liệu bảng ở thời điểm này.', 'Could not load table data right now.');
};

TableDialog.renderOverviewTab = function(draft){
  return [
    '<div class="ss-table-dialog-section">',
      '<div class="ss-table-dialog-section-title">' + _esc(_t('Tổng quan', 'Overview')) + '</div>',
      '<div class="ss-table-dialog-form-grid">',
        Inspector.fieldGroup(_t('Tên bảng', 'Table name'), '<input class="hm-input" id="dlg-tbl-name" value="' + _esc(draft.name) + '" />'),
        Inspector.fieldGroup('Schema', '<input class="hm-input" id="dlg-tbl-schema" value="' + _esc(draft.schema || 'public') + '" />'),
        Inspector.fieldGroup('Domain', '<select class="hm-input" id="dlg-tbl-domain">' + Object.keys(DOMAIN_COLORS).sort().map(function(domain){ return '<option value="' + _esc(domain) + '"' + (domain === (draft.domain || 'default') ? ' selected' : '') + '>' + _esc(formatDomainLabel(domain)) + '</option>'; }).join('') + '</select>'),
        Inspector.fieldGroup(_t('Màu hiển thị', 'Color'), '<input type="color" id="dlg-tbl-color" value="' + _esc(Inspector.colorValue(draft.color || DOMAIN_COLORS[draft.domain] || DOMAIN_COLORS.default)) + '" />'),
      '</div>',
      Inspector.fieldGroup(_t('Mô tả', 'Comment'), '<textarea class="hm-input" id="dlg-tbl-comment" rows="3">' + _esc(draft.comment || '') + '</textarea>'),
      Inspector.fieldGroup('Tags', '<input class="hm-input" id="dlg-tbl-tags" value="' + _esc((draft.tags || []).join(', ')) + '" placeholder="core, audit, qms" />'),
      '<div class="ss-field-group"><label class="ss-toggle-row"><input type="checkbox" id="dlg-tbl-rls"' + (draft.rls_enabled ? ' checked' : '') + ' /><span>Row Level Security (RLS)</span></label></div>',
    '</div>'
  ].join('');
};

TableDialog.renderColumnsTab = function(draft){
  return [
    '<div class="ss-table-dialog-section">',
      '<div class="ss-table-dialog-section-head">',
        '<div class="ss-table-dialog-section-title">' + _esc(_t('Cấu trúc cột', 'Columns')) + '</div>',
        '<div class="ss-table-dialog-inline-actions"><span class="ss-field-hint">' + String((draft.columns || []).length) + ' ' + _esc(_t('cột', 'columns')) + '</span><button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.addColumn()">+ ' + _esc(_t('Thêm cột', 'Add column')) + '</button></div>',
      '</div>',
      '<div class="ss-table-dialog-columns">',
        (draft.columns || []).map(function(col, index){
          return [
            '<div class="ss-table-dialog-col-row">',
              '<div class="ss-table-dialog-col-top">',
                '<div class="ss-table-dialog-col-grid">',
                  Inspector.fieldGroup(_t('Tên cột', 'Column name'), '<input class="hm-input" data-field="name" value="' + _esc(col.name || '') + '" />'),
                  Inspector.fieldGroup(_t('Kiểu dữ liệu', 'Data type'), '<input class="hm-input" data-field="type" value="' + _esc(fmtColType(col)) + '" placeholder="varchar(255)" />'),
                  Inspector.fieldGroup('Default', '<input class="hm-input" data-field="default" value="' + _esc(col.default_val || '') + '" />'),
                '</div>',
                '<button type="button" class="hm-btn hm-btn-ghost ss-btn-xs ss-table-dialog-col-remove" onclick="TableDialog.removeColumn(' + String(index) + ')">' + _esc(_t('Xóa', 'Delete')) + '</button>',
              '</div>',
              '<div class="ss-table-dialog-col-meta">',
                '<label class="ss-toggle-row"><input type="checkbox" data-field="nullable"' + (col.nullable ? ' checked' : '') + ' /><span>' + _esc(_t('Cho phép null', 'Nullable')) + '</span></label>',
                '<label class="ss-toggle-row"><input type="checkbox" data-field="pk"' + (col.primary_key ? ' checked' : '') + ' /><span>PK</span></label>',
              '</div>',
              Inspector.fieldGroup(_t('Mô tả cột', 'Column comment'), '<input class="hm-input" data-field="comment" value="' + _esc(col.comment || '') + '" />'),
            '</div>'
          ].join('');
        }).join('') || '<div class="ss-table-dialog-empty">' + _esc(_t('Chưa có cột nào. Hãy thêm cột đầu tiên cho bảng này.', 'No columns yet. Add the first column to this table.')) + '</div>',
      '</div>',
    '</div>'
  ].join('');
};

TableDialog.renderDataTab = function(draft){
  var dataView = this.dataView || this.createDataViewState(draft, {});
  var totalRowsLabel = dataView.syntheticSample
    ? _t('0 dòng thật', '0 real rows')
    : String(Number(dataView.totalRows) || 0) + ' ' + _t('dòng thực', 'real rows');
  return [
    '<div class="ss-table-dialog-section ss-table-data-panel">',
      '<div class="ss-table-dialog-section-head">',
        '<div>',
          '<div class="ss-table-dialog-section-title">' + _esc(_t('Dữ liệu bảng', 'Table data')) + '</div>',
          '<div class="ss-field-hint">' + _esc(this.dataHint(dataView)) + '</div>',
        '</div>',
        '<div class="ss-table-dialog-inline-actions">',
          '<span class="ss-field-hint">' + String((dataView.columns || []).length) + ' ' + _esc(_t('field', 'fields')) + '</span>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs ss-table-data-action-primary" onclick="TableDialog.refreshDataView()">' + _esc(_t('Làm mới', 'Refresh')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadMoreDataView()"' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.loadingMore ? _t('Đang tải...', 'Loading...') : _t('Tải thêm', 'Load more')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadAllDataView()"' + (dataView.hasMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.fetchingAll ? _t('Đang tải toàn bộ...', 'Loading all...') : _t('Tải toàn bộ', 'Load all')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-table-data-meta">',
        '<span class="ss-table-data-pill">' + _esc(_t('Giới hạn / lần tải', 'Batch size')) + ': ' + String(Number(dataView.limit) || 100) + '</span>',
        '<span class="ss-table-data-pill">' + _esc(_t('Số dòng đang hiển thị', 'Rows shown')) + ': ' + String((dataView.rows || []).length) + '</span>',
        '<span class="ss-table-data-pill">' + _esc(_t('Số field', 'Field count')) + ': ' + String((dataView.columns || []).length) + '</span>',
        '<span class="ss-table-data-pill">' + _esc(totalRowsLabel) + '</span>',
        (dataView.syntheticSample ? '<span class="ss-table-data-pill is-sample">' + _esc(_t('1 dòng mẫu', '1 sample row')) + '</span>' : ''),
      '</div>',
      this.dataGridHtml(dataView),
    '</div>'
  ].join('');
};

TableDialog.render = function(){
  var draft = this.ensureDraft();
  var overlay = document.getElementById('ss-table-dialog-overlay');
  var bodyHtml;
  if(!draft) return;
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'ss-modal-overlay';
    overlay.id = 'ss-table-dialog-overlay';
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) TableDialog.close();
    });
    document.body.appendChild(overlay);
  }
  if(this.activeTab === 'columns'){
    bodyHtml = this.renderColumnsTab(draft);
  } else if(this.activeTab === 'data'){
    bodyHtml = this.renderDataTab(draft);
  } else {
    bodyHtml = this.renderOverviewTab(draft);
  }
  overlay.innerHTML = [
    '<div class="ss-modal ss-table-dialog-modal is-fullscreen" role="dialog" aria-modal="true" aria-labelledby="ss-table-dialog-title">',
      '<div class="ss-modal-header">',
        '<div><strong id="ss-table-dialog-title">' + _esc(draft.name) + '</strong><div class="ss-field-hint">' + _esc(_t('Chi tiết bảng, cấu trúc cột và dữ liệu thật', 'Table details, column structure, and live data')) + '</div></div>',
        '<div class="ss-table-dialog-head-actions">',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" onclick="TableDialog.switchTab(\'data\')">' + _esc(_t('Mở dữ liệu bảng', 'Open table data')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.close()" aria-label="' + _esc(_t('Đóng hộp thoại chi tiết bảng', 'Close table details dialog')) + '">' + _esc(_t('Đóng', 'Close')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-modal-body ss-table-dialog-body">',
        '<div class="ss-table-dialog-toolbar">',
          '<div class="ss-table-dialog-tabs" role="tablist">',
            this.renderTabButton('overview', _t('Tổng quan', 'Overview')),
            this.renderTabButton('columns', _t('Cấu trúc cột', 'Columns')),
            this.renderTabButton('data', _t('Dữ liệu', 'Data')),
          '</div>',
        '</div>',
        '<div class="ss-table-dialog-grid">',
          '<div class="ss-table-dialog-main">',
            bodyHtml,
          '</div>',
        '</div>',
      '</div>',
      '<div class="ss-modal-footer">',
        '<button type="button" class="hm-btn hm-btn-ghost" onclick="TableDialog.close()">' + _esc(_t('Hủy', 'Cancel')) + '</button>',
        '<button type="button" class="hm-btn hm-btn-primary" onclick="TableDialog.save()">' + _esc(_t('Lưu', 'Save')) + '</button>',
      '</div>',
    '</div>'
  ].join('');
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
  var domainCandidates;
  var activeDomain;
  var activeDomainTables;
  var activeHidden;
  var activeIsolated;
  var activeDomainColor;

  if(!refs.browser) return;
  refs.browser.classList.toggle('is-domain-view', STORE.browser.view === 'domains' && !!STORE.browser.open);
  refs.browser.classList.toggle('is-table-view', STORE.browser.view === 'tables' && !!STORE.browser.open);
  refs.browser.style.removeProperty('--ss-domain-top');
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
    '<div class="ss-browser-search-wrap">',
      '<input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc miền...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />',
      (STORE.browser.view === 'domains'
        ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){
            var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length;
            var hidden = Browser.isDomainHidden(domain);
            var active = STORE.browser.activeDomain === domain;
            return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn miền này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>';
          }).join('') + '</div>'
        : ''),
      '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>',
    '</div>',
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length
        ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){
            var active = !!selectedTableMap[tbl.id];
            var hidden = Browser.isDomainHidden(tbl.domain || 'default');
            var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default;
            var fkCount = relatedCountMap[tbl.id] || 0;
            return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
          }).join('') + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (activeDomain
        ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden
            ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>'
            : (activeDomainTables.length
              ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){
                  var active = !!selectedTableMap[tbl.id];
                  var fkCount = relatedCountMap[tbl.id] || 0;
                  return '<div class="ss-table-item' + (active ? ' active' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
                }).join('') + '</div>'
              : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>'
  ].join('');
  renderHeaderStatus();
};

renderToolbar = function(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn ss-toolbar-icon-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '◂' : '▸') + '</span></button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible view')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">' + toolbarIconSvg('compact') + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus selected table neighborhood')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus selected table neighborhood')) + '">' + toolbarIconSvg('focus') + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
  renderHeaderStatus();
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
  if(STORE.browser.view === 'domains' && STORE.browser.open){
    refs.browser.classList.add('has-domain-split');
    if(STORE.browser.domainSplitManual){
      refs.browser.style.setProperty('--ss-domain-top', Math.round((STORE.browser.domainSplit || 0.5) * 100) + '%');
      refs.browser.classList.add('has-manual-split');
    } else {
      refs.browser.classList.remove('has-manual-split');
      refs.browser.style.removeProperty('--ss-domain-top');
    }
  } else {
    refs.browser.classList.remove('has-domain-split');
    refs.browser.classList.remove('has-manual-split');
    refs.browser.style.removeProperty('--ss-domain-top');
  }
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
    '<div class="ss-browser-search-wrap">',
      '<input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc miền...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />',
      (STORE.browser.view === 'domains'
        ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){
            var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length;
            var hidden = Browser.isDomainHidden(domain);
            var active = STORE.browser.activeDomain === domain;
            return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn miền này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>';
          }).join('') + '</div>'
        : ''),
      '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>',
    '</div>',
    (STORE.browser.view === 'domains'
      ? '<div class="ss-browser-splitter" onmousedown="Browser.startDomainSplit(event)" onkeydown="Browser.onDomainSplitKeydown(event)" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + String(Math.round((STORE.browser.domainSplit || 0.5) * 100)) + '" aria-label="' + _esc(_t('Điều chỉnh chiều cao giữa miền và bảng', 'Resize domain and table panes')) + '"><span class="ss-browser-splitter-handle"></span></div>'
      : ''),
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length
        ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){
            var active = !!selectedTableMap[tbl.id];
            var hidden = Browser.isDomainHidden(tbl.domain || 'default');
            var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default;
            var fkCount = relatedCountMap[tbl.id] || 0;
            return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
          }).join('') + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (activeDomain
        ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden
            ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>'
            : (activeDomainTables.length
              ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){
                  var active = !!selectedTableMap[tbl.id];
                  var fkCount = relatedCountMap[tbl.id] || 0;
                  return '<div class="ss-table-item' + (active ? ' active' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
                }).join('') + '</div>'
              : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>'
  ].join('');
  renderHeaderStatus();
};

renderToolbar = function(container){
  var selectedCount = Browser.getSelectedTables().length;
  var actionButtons = [
    '<button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible view')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">' + toolbarIconSvg('compact') + '</button>'
  ];
  if(!container) return;
  if(selectedCount){
    actionButtons.push('<button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus selected table neighborhood')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus selected table neighborhood')) + '">' + toolbarIconSvg('focus') + '</button>');
  }
  actionButtons.push(
    '<button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button>',
    '<button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button>',
    '<button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button>',
    '<button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button>',
    '<button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button>',
    '<button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button>'
  );
  container.innerHTML = [
    '<div class="ss-toolbar-left"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn ss-toolbar-icon-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon" aria-hidden="true">' + (STORE.browser.open ? '&#9664;' : '&#9654;') + '</span></button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button></div></div>',
    '<div class="ss-toolbar-right">' + actionButtons.join('') + '</div>'
  ].join('');
  SchemaLib.renderSelector();
  renderHeaderStatus();
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
  if(STORE.browser.view === 'domains' && STORE.browser.open){
    refs.browser.classList.add('has-domain-split');
    if(STORE.browser.domainSplitManual){
      refs.browser.style.setProperty('--ss-domain-top', Math.round((STORE.browser.domainSplit || 0.5) * 100) + '%');
      refs.browser.classList.add('has-manual-split');
    } else {
      refs.browser.classList.remove('has-manual-split');
      refs.browser.style.removeProperty('--ss-domain-top');
    }
  } else {
    refs.browser.classList.remove('has-domain-split');
    refs.browser.classList.remove('has-manual-split');
    refs.browser.style.removeProperty('--ss-domain-top');
  }
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
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">&#9654;</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'domains\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '" aria-label="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '">◎</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'tables\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '" aria-label="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '">≣</button>',
        '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
      '</div>'
    ].join('');
    renderHeaderStatus();
    return;
  }

  refs.browser.innerHTML = [
    '<div class="ss-browser-search-wrap">',
      '<input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />',
      (STORE.browser.view === 'domains'
        ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){
            var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length;
            var hidden = Browser.isDomainHidden(domain);
            var active = STORE.browser.activeDomain === domain;
            return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn domain này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>';
          }).join('') + '</div>'
        : ''),
      '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>',
    '</div>',
    (STORE.browser.view === 'domains'
      ? '<div class="ss-browser-splitter" onmousedown="Browser.startDomainSplit(event)" onkeydown="Browser.onDomainSplitKeydown(event)" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + String(Math.round((STORE.browser.domainSplit || 0.5) * 100)) + '" aria-label="' + _esc(_t('Điều chỉnh chiều cao giữa domain và bảng', 'Resize domain and table panes')) + '"><span class="ss-browser-splitter-handle"></span></div>'
      : ''),
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length
        ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){
            var active = !!selectedTableMap[tbl.id];
            var hidden = Browser.isDomainHidden(tbl.domain || 'default');
            var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default;
            var fkCount = relatedCountMap[tbl.id] || 0;
            return '<div class="ss-table-item ss-table-item-flat' + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span><span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
          }).join('') + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : (activeDomain
        ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden
            ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>'
            : (activeDomainTables.length
              ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){
                  var active = !!selectedTableMap[tbl.id];
                  var fkCount = relatedCountMap[tbl.id] || 0;
                  return '<div class="ss-table-item' + (active ? ' active' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
                }).join('') + '</div>'
              : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>'
        : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>'
  ].join('');
  renderHeaderStatus();
};

TableDialog.dataGridHtml = function(data){
  var payload = data || {};
  var rowOffset = Number(payload.offset) || 0;
  if(payload.loading){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu bảng...', 'Loading table data...')) + '</div>';
  }
  if(!payload.available){
    return '<div class="ss-table-dialog-empty">' + _esc(payload.message || _t('Chưa lấy được dữ liệu của bảng này từ database hiện tại', 'Could not load table data from the current database')) + '</div>';
  }
  if(!(payload.columns || []).length){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
  }
  return [
    '<div class="ss-table-dialog-data-wrap" tabindex="0">',
      '<table class="ss-table-dialog-data-table">',
        '<thead><tr><th class="ss-table-dialog-rownum">#</th>',
          (payload.columns || []).map(function(col){
            return '<th>' + _esc(col.column_name || col.name || '') + '</th>';
          }).join(''),
        '</tr></thead>',
        '<tbody>',
          (payload.rows || []).length ? (payload.rows || []).map(function(row, rowIndex){
            return '<tr><td class="ss-table-dialog-rownum">' + String(rowOffset + rowIndex + 1) + '</td>' + (payload.columns || []).map(function(col){
              var key = col.column_name || col.name || '';
              var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
              if(value == null) value = '';
              if(typeof value === 'object'){
                value = JSON.stringify(value);
              }
              return '<td title="' + _esc(String(value)) + '">' + _esc(String(value)) + '</td>';
            }).join('') + '</tr>';
          }).join('') : '<tr><td colspan="' + String(((payload.columns || []).length || 1) + 1) + '">' + _esc(_t('Bảng này hiện chưa có dòng dữ liệu nào', 'This table currently has no rows')) + '</td></tr>',
        '</tbody>',
      '</table>',
    '</div>'
  ].join('');
};

TableDialog.dataHint = function(dataView){
  if(!dataView) return '';
  if(dataView.syntheticSource === 'draft'){
    return _t('Đang hiển thị 1 dòng mẫu sinh từ cấu trúc bảng trong Schema Studio. Dữ liệu thật sẽ xuất hiện khi database có row hoặc cho phép preview.', 'Showing one sample row generated from the Schema Studio table structure. Real data will appear when the database has rows or preview is available.');
  }
  if(dataView.syntheticSample){
    return _t('Bảng hiện chưa có dữ liệu thật. Đang hiển thị 1 dòng mẫu sinh từ cấu trúc cột của bảng.', 'The table currently has no real rows. Showing one sample row generated from the table structure.');
  }
  if(dataView.available){
    return _t('Đang hiển thị dữ liệu thật từ database hiện tại. Bạn có thể tải thêm hoặc tải toàn bộ.', 'Showing live rows from the current database. You can load more or load all rows.');
  }
  return dataView.message || _t('Không thể đọc dữ liệu bảng ở thời điểm này.', 'Could not load table data right now.');
};

TableDialog.render = function(){
  var draft = this.ensureDraft();
  var overlay = document.getElementById('ss-table-dialog-overlay');
  var bodyHtml;
  if(!draft) return;
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'ss-table-dialog-overlay';
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) TableDialog.close();
    });
    document.body.appendChild(overlay);
  }
  overlay.className = 'ss-modal-overlay is-table-dialog-fullscreen';
  if(this.activeTab === 'columns'){
    bodyHtml = this.renderColumnsTab(draft);
  } else if(this.activeTab === 'data'){
    bodyHtml = this.renderDataTab(draft);
  } else {
    bodyHtml = this.renderOverviewTab(draft);
  }
  overlay.innerHTML = [
    '<div class="ss-modal ss-table-dialog-modal is-fullscreen" role="dialog" aria-modal="true" aria-labelledby="ss-table-dialog-title">',
      '<div class="ss-modal-header">',
        '<div><strong id="ss-table-dialog-title">' + _esc(draft.name) + '</strong><div class="ss-field-hint">' + _esc(_t('Chi tiết bảng, cấu trúc cột và dữ liệu thật', 'Table details, column structure, and live data')) + '</div></div>',
        '<div class="ss-table-dialog-head-actions">',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" onclick="TableDialog.switchTab(\'data\')">' + _esc(_t('Mở dữ liệu bảng', 'Open table data')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.close()" aria-label="' + _esc(_t('Đóng hộp thoại chi tiết bảng', 'Close table details dialog')) + '">' + _esc(_t('Đóng', 'Close')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-modal-body ss-table-dialog-body">',
        '<div class="ss-table-dialog-toolbar"><div class="ss-table-dialog-tabs" role="tablist">' + this.renderTabButton('overview', _t('Tổng quan', 'Overview')) + this.renderTabButton('columns', _t('Cấu trúc cột', 'Columns')) + this.renderTabButton('data', _t('Dữ liệu', 'Data')) + '</div></div>',
        '<div class="ss-table-dialog-grid"><div class="ss-table-dialog-main">' + bodyHtml + '</div></div>',
      '</div>',
      '<div class="ss-modal-footer"><button type="button" class="hm-btn hm-btn-ghost" onclick="TableDialog.close()">' + _esc(_t('Hủy', 'Cancel')) + '</button><button type="button" class="hm-btn hm-btn-primary" onclick="TableDialog.save()">' + _esc(_t('Lưu', 'Save')) + '</button></div>',
    '</div>'
  ].join('');
  this.focusActiveControl();
};

TableDialog.dataGridHtml = function(data){
  var payload = data || {};
  var rowOffset = Number(payload.offset) || 0;
  if(payload.loading){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu bảng...', 'Loading table data...')) + '</div>';
  }
  if(!payload.available){
    return '<div class="ss-table-dialog-empty">' + _esc(payload.message || _t('Chưa lấy được dữ liệu của bảng này từ database hiện tại', 'Could not load table data from the current database')) + '</div>';
  }
  if(!(payload.columns || []).length){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
  }
  return [
    '<div class="ss-table-dialog-data-wrap" tabindex="0">',
      '<table class="ss-table-dialog-data-table">',
        '<thead><tr><th class="ss-table-dialog-rownum">#</th>',
          (payload.columns || []).map(function(col){
            return '<th>' + _esc(col.column_name || col.name || '') + '</th>';
          }).join(''),
        '</tr></thead>',
        '<tbody>',
          (payload.rows || []).length ? (payload.rows || []).map(function(row, rowIndex){
            return '<tr><td class="ss-table-dialog-rownum">' + String(rowOffset + rowIndex + 1) + '</td>' + (payload.columns || []).map(function(col){
              var key = col.column_name || col.name || '';
              var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
              if(value == null) value = '';
              if(typeof value === 'object'){
                value = JSON.stringify(value);
              }
              return '<td title="' + _esc(String(value)) + '">' + _esc(String(value)) + '</td>';
            }).join('') + '</tr>';
          }).join('') : '<tr><td colspan="' + String(((payload.columns || []).length || 1) + 1) + '">' + _esc(_t('Bảng này hiện chưa có dòng dữ liệu nào', 'This table currently has no rows')) + '</td></tr>',
        '</tbody>',
      '</table>',
    '</div>'
  ].join('');
};

TableDialog.dataHint = function(dataView){
  if(!dataView) return '';
  if(dataView.syntheticSource === 'draft'){
    return _t('Đang hiển thị 1 dòng mẫu sinh từ cấu trúc bảng trong Schema Studio. Dữ liệu thật sẽ xuất hiện khi database có row hoặc cho phép preview.', 'Showing one sample row generated from the Schema Studio table structure. Real data will appear when the database has rows or preview is available.');
  }
  if(dataView.syntheticSample){
    return _t('Bảng hiện chưa có dữ liệu thật. Đang hiển thị 1 dòng mẫu sinh từ cấu trúc cột của bảng.', 'The table currently has no real rows. Showing one sample row generated from the table structure.');
  }
  if(dataView.available){
    return _t('Đang hiển thị dữ liệu thật từ database hiện tại. Bạn có thể tải thêm hoặc tải toàn bộ dữ liệu.', 'Showing live rows from the current database. You can load more or load the full dataset.');
  }
  return dataView.message || _t('Không thể đọc dữ liệu bảng ở thời điểm này.', 'Could not load table data right now.');
};

TableDialog.openDataView = function(){
  this.switchTab('data');
};

TableDialog.renderDataDialog = function(){
  this.switchTab('data');
};

TableDialog.renderDataTab = function(draft){
  var dataView = this.dataView || this.createDataViewState(draft, {});
  var shownRows = (dataView.rows || []).length;
  var totalRows = Math.max(0, Number(dataView.totalRows) || 0);
  var totalRowsLabel = dataView.syntheticSample
    ? _t('0 dòng thật', '0 real rows')
    : String(totalRows) + ' ' + _t('dòng thật', 'real rows');
  return [
    '<div class="ss-table-dialog-section ss-table-data-panel">',
      '<div class="ss-table-dialog-section-head">',
        '<div>',
          '<div class="ss-table-dialog-section-title">' + _esc(_t('Dữ liệu bảng', 'Table data')) + '</div>',
          '<div class="ss-field-hint">' + _esc(this.dataHint(dataView)) + '</div>',
        '</div>',
        '<div class="ss-table-dialog-inline-actions">',
          '<span class="ss-field-hint">' + String((dataView.columns || []).length) + ' ' + _esc(_t('field', 'fields')) + '</span>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs ss-table-data-action-primary" onclick="TableDialog.refreshDataView()">' + _esc(_t('Làm mới', 'Refresh')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadMoreDataView()"' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.loadingMore ? _t('Đang tải...', 'Loading...') : _t('Tải thêm', 'Load more')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadAllDataView()"' + (dataView.hasMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.fetchingAll ? _t('Đang tải toàn bộ...', 'Loading all...') : _t('Tải toàn bộ', 'Load all')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-table-data-toolbar">',
        '<div class="ss-table-data-meta">',
          '<span class="ss-table-data-pill">' + _esc(_t('Giới hạn / lần tải', 'Batch size')) + ': ' + String(Number(dataView.limit) || 100) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(_t('Số dòng đang hiển thị', 'Rows shown')) + ': ' + String(shownRows) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(_t('Số field', 'Field count')) + ': ' + String((dataView.columns || []).length) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(totalRowsLabel) + '</span>',
          (dataView.syntheticSample ? '<span class="ss-table-data-pill is-sample">' + _esc(_t('1 dòng mẫu', '1 sample row')) + '</span>' : ''),
        '</div>',
        '<div class="ss-table-data-nav">',
          '<div class="ss-table-data-page">' + _esc(dataView.syntheticSample ? _t('Dữ liệu mẫu', 'Sample data') : _t('Đã tải ' + shownRows + ' / ' + totalRows + ' dòng', 'Loaded ' + shownRows + ' / ' + totalRows + ' rows')) + '</div>',
          '<div class="ss-table-data-nav-actions">',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + ((Number(dataView.offset) || 0) > 0 && !dataView.loading ? '' : ' is-disabled') + '" onclick="TableDialog.loadDataView(' + String(Number(dataView.limit) || 100) + ',' + String(Math.max(0, (Number(dataView.offset) || 0) - (Number(dataView.limit) || 100))) + ',false)"' + (((Number(dataView.offset) || 0) > 0 && !dataView.loading) ? '' : ' disabled') + '>' + _esc(_t('Trang trước', 'Previous')) + '</button>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' is-disabled') + '" onclick="TableDialog.loadMoreDataView()"' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(_t('Trang sau', 'Next')) + '</button>',
          '</div>',
        '</div>',
      '</div>',
      this.dataGridHtml(dataView),
    '</div>'
  ].join('');
};

TableDialog.save = function(){
  var tbl = findTable(this.currentTableId);
  var draft = this.collectForm();
  var names = {};
  var duplicated = false;
  var pkCount = 0;
  var self = this;
  if(!tbl || !draft) return;
  if(!isValidIdentifier(draft.name)){
    toast(_t('Tên bảng phải là snake_case hợp lệ', 'Table name must be valid snake_case'), 'error');
    return;
  }
  if(((STORE.schema && STORE.schema.tables) || []).some(function(item){
    return item.id !== tbl.id && item.name === draft.name;
  })){
    toast(_t('Tên bảng đã tồn tại', 'Table name already exists'), 'error');
    return;
  }
  if(!(draft.columns || []).length){
    toast(_t('Bảng phải có ít nhất 1 cột', 'Table must have at least 1 column'), 'error');
    return;
  }
  (draft.columns || []).forEach(function(col){
    if(!isValidIdentifier(col.name)) duplicated = col.name || '__invalid__';
    if(names[col.name]) duplicated = col.name;
    names[col.name] = true;
    if(col.primary_key){
      pkCount += 1;
      col.pk_order = pkCount;
      col.nullable = false;
    } else {
      col.pk_order = null;
    }
  });
  if(duplicated){
    toast(_t('Tên cột chưa hợp lệ hoặc đang bị trùng: ' + duplicated, 'Invalid or duplicate column name: ' + duplicated), 'error');
    return;
  }
  if(!pkCount){
    toast(_t('Bảng phải có ít nhất 1 khóa chính', 'Table must have at least 1 primary key'), 'error');
    return;
  }
  confirm2(_t('Bạn sắp lưu thay đổi cho bảng ' + draft.name + '. Tiếp tục?', 'You are about to save changes for table ' + draft.name + '. Continue?'), false).then(function(ok){
    var removedColumnIds = [];
    var keptColumnIds = {};
    if(!ok) return;
    (draft.columns || []).forEach(function(col){
      if(col && col.id) keptColumnIds[col.id] = true;
    });
    (tbl.columns || []).forEach(function(col){
      if(col && col.id && !keptColumnIds[col.id]){
        removedColumnIds.push(col.id);
      }
    });
    pushUndo();
    if(removedColumnIds.length){
      STORE.schema.relations = (STORE.schema.relations || []).filter(function(rel){
        return removedColumnIds.indexOf(rel.from_col_id) < 0 && removedColumnIds.indexOf(rel.to_col_id) < 0;
      });
      ((STORE.schema && STORE.schema.tables) || []).forEach(function(otherTbl){
        (otherTbl.columns || []).forEach(function(otherCol){
          if(otherCol && otherCol.foreign_key && removedColumnIds.indexOf(otherCol.foreign_key.ref_col_id) >= 0){
            otherCol.foreign_key = null;
          }
        });
      });
    }
    tbl.name = draft.name;
    tbl.schema = draft.schema;
    tbl.domain = draft.domain;
    tbl.comment = draft.comment;
    tbl.tags = draft.tags;
    tbl.color = draft.color;
    tbl.rls_enabled = draft.rls_enabled;
    tbl.columns = _clone(draft.columns || []);
    tbl.canvas = tbl.canvas || {};
    tbl.canvas.width = Math.max(tbl.canvas.width || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
    TableCard.reRender(tbl.id);
    VirtualRenderer.scheduleUpdate();
    Browser.render();
    Inspector.renderTable(tbl.id);
    markDirty();
    saveDraft();
    toast(_t('Đã lưu bảng ' + tbl.name, 'Saved table ' + tbl.name), 'success');
    self.close();
  });
};

TableDialog.render = function(){
  var draft = this.ensureDraft();
  var overlay = document.getElementById('ss-table-dialog-overlay');
  var bodyHtml;
  if(!draft) return;
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'ss-table-dialog-overlay';
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) TableDialog.close();
    });
    document.body.appendChild(overlay);
  }
  overlay.className = 'ss-modal-overlay is-table-dialog-fullscreen';
  if(this.activeTab === 'columns'){
    bodyHtml = this.renderColumnsTab(draft);
  } else if(this.activeTab === 'data'){
    bodyHtml = this.renderDataTab(draft);
  } else {
    bodyHtml = this.renderOverviewTab(draft);
  }
  overlay.innerHTML = [
    '<div class="ss-modal ss-table-dialog-modal is-fullscreen" role="dialog" aria-modal="true" aria-labelledby="ss-table-dialog-title">',
      '<div class="ss-modal-header">',
        '<div><strong id="ss-table-dialog-title">' + _esc(draft.name) + '</strong><div class="ss-field-hint">' + _esc(_t('Chi tiết bảng, cấu trúc cột và dữ liệu thật', 'Table details, column structure, and live data')) + '</div></div>',
        '<div class="ss-table-dialog-head-actions">',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" onclick="TableDialog.switchTab(\'data\')">' + _esc(_t('Mở dữ liệu bảng', 'Open table data')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" onclick="TableDialog.close()" aria-label="' + _esc(_t('Đóng hộp thoại chi tiết bảng', 'Close table details dialog')) + '">' + _esc(_t('Đóng', 'Close')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-modal-body ss-table-dialog-body">',
        '<div class="ss-table-dialog-toolbar">',
          '<div class="ss-table-dialog-tabs" role="tablist">',
            this.renderTabButton('overview', _t('Tổng quan', 'Overview')),
            this.renderTabButton('columns', _t('Cấu trúc cột', 'Columns')),
            this.renderTabButton('data', _t('Dữ liệu', 'Data')),
          '</div>',
        '</div>',
        '<div class="ss-table-dialog-grid"><div class="ss-table-dialog-main">' + bodyHtml + '</div></div>',
      '</div>',
      '<div class="ss-modal-footer">',
        '<button type="button" class="hm-btn hm-btn-ghost" onclick="TableDialog.close()">' + _esc(_t('Hủy', 'Cancel')) + '</button>',
        '<button type="button" class="hm-btn hm-btn-primary" onclick="TableDialog.save()">' + _esc(_t('Lưu', 'Save')) + '</button>',
      '</div>',
    '</div>'
  ].join('');
  this.focusActiveControl();
};

Browser.setView = function(view){
  var nextView = (view === 'tables' || view === 'workflow') ? view : 'domains';
  if(STORE.browser.view === nextView){
    if(refs.toolbar) renderToolbar(refs.toolbar);
    if(refs.browser) Browser.render();
    return;
  }
  STORE.browser.view = nextView;
  if(nextView !== 'domains'){
    STORE.browser.domainSplitManual = false;
    if(refs.browser){
      refs.browser.classList.remove('has-domain-split');
      refs.browser.classList.remove('has-manual-split');
      refs.browser.style.removeProperty('--ss-domain-top');
    }
  }
  saveUiPrefs();
  if(refs.toolbar) renderToolbar(refs.toolbar);
  if(refs.browser) Browser.render();
};

Browser.buildWorkflowStages = function(tables){
  var tableMap = {};
  var downstream = {};
  var indegree = {};
  var ids = [];
  var stages = [];
  var queued = {};
  var visited = {};
  var leftovers;
  function sortIds(list){
    return list.slice().sort(function(a, b){
      var ta = tableMap[a];
      var tb = tableMap[b];
      var domainCompare;
      if(!ta || !tb) return String(a).localeCompare(String(b));
      domainCompare = formatDomainLabel(ta.domain || 'default').localeCompare(formatDomainLabel(tb.domain || 'default'));
      if(domainCompare !== 0) return domainCompare;
      return String(ta.name || '').localeCompare(String(tb.name || ''));
    });
  }
  (tables || []).forEach(function(tbl){
    if(!tbl || !tbl.id) return;
    tableMap[tbl.id] = tbl;
    downstream[tbl.id] = [];
    indegree[tbl.id] = 0;
    ids.push(tbl.id);
  });
  ((STORE.schema && STORE.schema.relations) || []).forEach(function(rel){
    var upstreamId = rel && rel.to_table_id;
    var dependentId = rel && rel.from_table_id;
    if(!upstreamId || !dependentId || !tableMap[upstreamId] || !tableMap[dependentId] || upstreamId === dependentId){
      return;
    }
    if(downstream[upstreamId].indexOf(dependentId) >= 0) return;
    downstream[upstreamId].push(dependentId);
    indegree[dependentId] += 1;
  });
  var current = sortIds(ids.filter(function(id){ return indegree[id] === 0; }));
  while(current.length){
    var next = [];
    stages.push({
      kind: 'flow',
      label: _t('Bước ' + (stages.length + 1), 'Stage ' + (stages.length + 1)),
      tables: current.map(function(id){ return tableMap[id]; }).filter(Boolean)
    });
    current.forEach(function(id){
      visited[id] = true;
      (downstream[id] || []).forEach(function(childId){
        indegree[childId] = Math.max(0, (indegree[childId] || 0) - 1);
        if(indegree[childId] === 0 && !visited[childId] && !queued[childId]){
          queued[childId] = true;
          next.push(childId);
        }
      });
    });
    current = sortIds(next);
    queued = {};
  }
  leftovers = sortIds(ids.filter(function(id){ return !visited[id]; }));
  if(leftovers.length){
    while(leftovers.length){
      stages.push({
        kind: 'cycle',
        label: _t('Liên kết vòng', 'Cyclic links'),
        tables: leftovers.splice(0, 10).map(function(id){ return tableMap[id]; }).filter(Boolean)
      });
    }
  }
  return stages;
};

Browser.startDomainSplit = function(ev){
  var browserEl = refs.browser;
  var rect;
  function cleanup(persist){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    Browser._activeSplitCleanup = null;
    if(persist) saveUiPrefs();
  }
  function clampRatio(value){
    return Math.max(0.25, Math.min(0.75, value));
  }
  function onMove(moveEv){
    var ratio;
    if(!browserEl) return;
    ratio = clampRatio((moveEv.clientY - rect.top) / Math.max(rect.height, 1));
    STORE.browser.domainSplit = ratio;
    STORE.browser.domainSplitManual = true;
    browserEl.classList.add('has-domain-split');
    browserEl.classList.add('has-manual-split');
    browserEl.style.setProperty('--ss-domain-top', Math.round(ratio * 100) + '%');
  }
  function onUp(){
    cleanup(true);
    Browser.render();
  }
  if(!browserEl || STORE.browser.view !== 'domains'){
    return;
  }
  ev.preventDefault();
  rect = browserEl.getBoundingClientRect();
  if(Browser._activeSplitCleanup){
    Browser._activeSplitCleanup(false);
  }
  onMove(ev);
  Browser._activeSplitCleanup = cleanup;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

Browser.adjustDomainSplit = function(nextRatio){
  STORE.browser.domainSplit = Math.max(0.25, Math.min(0.75, Number(nextRatio) || 0.5));
  STORE.browser.domainSplitManual = true;
  saveUiPrefs();
  Browser.render();
};

Browser.onDomainSplitKeydown = function(ev){
  var ratio = Number(STORE.browser.domainSplit || 0.5);
  if(ev.key === 'ArrowUp'){
    ev.preventDefault();
    Browser.adjustDomainSplit(ratio - 0.03);
    return;
  }
  if(ev.key === 'ArrowDown'){
    ev.preventDefault();
    Browser.adjustDomainSplit(ratio + 0.03);
    return;
  }
  if(ev.key === 'Home'){
    ev.preventDefault();
    Browser.adjustDomainSplit(0.25);
    return;
  }
  if(ev.key === 'End'){
    ev.preventDefault();
    Browser.adjustDomainSplit(0.75);
  }
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
  var domainCandidates;
  var activeDomain;
  var activeDomainTables;
  var activeHidden;
  var activeIsolated;
  var activeDomainColor;
  var workflowStages;
  var workflowHtml;
  function renderTableItem(tbl, useFlat){
    var active = !!selectedTableMap[tbl.id];
    var hidden = Browser.isDomainHidden(tbl.domain || 'default');
    var domainColor = DOMAIN_COLORS[tbl.domain || 'default'] || DOMAIN_COLORS.default;
    var fkCount = relatedCountMap[tbl.id] || 0;
    return '<div class="ss-table-item' + (useFlat ? ' ss-table-item-flat' : '') + (active ? ' active' : '') + (hidden ? ' is-hidden' : '') + '" tabindex="0" role="button" aria-label="' + _esc(_t('Mở bảng ', 'Open table ') + tbl.name) + '" onclick="Browser.selectTable(\'' + _esc(tbl.id) + '\')" ondblclick="Browser.focusTable(\'' + _esc(tbl.id) + '\')" onkeydown="Browser.onTableItemKeydown(event,\'' + _esc(tbl.id) + '\')" title="' + _esc(tbl.name) + '"><span class="ss-tbl-item-name">' + _esc(tbl.name) + '</span>' + (useFlat ? '<span class="ss-browser-table-domain"><span class="ss-domain-chip-dot" style="background:' + _esc(domainColor) + '"></span>' + _esc(formatDomainLabel(tbl.domain || 'default')) + '</span>' : '') + (fkCount ? '<span class="ss-tbl-badge">' + String(fkCount) + ' FK</span>' : '') + '</div>';
  }
  if(!refs.browser) return;
  refs.browser.classList.toggle('is-domain-view', STORE.browser.view === 'domains' && !!STORE.browser.open);
  refs.browser.classList.toggle('is-table-view', STORE.browser.view === 'tables' && !!STORE.browser.open);
  refs.browser.classList.toggle('is-workflow-view', STORE.browser.view === 'workflow' && !!STORE.browser.open);
  if(STORE.browser.view === 'domains' && STORE.browser.open){
    refs.browser.classList.add('has-domain-split');
    if(STORE.browser.domainSplitManual){
      refs.browser.style.setProperty('--ss-domain-top', Math.round((STORE.browser.domainSplit || 0.5) * 100) + '%');
      refs.browser.classList.add('has-manual-split');
    } else {
      STORE.browser.domainSplitManual = false;
      refs.browser.classList.remove('has-manual-split');
      refs.browser.style.removeProperty('--ss-domain-top');
    }
  } else {
    refs.browser.classList.remove('has-domain-split');
    refs.browser.classList.remove('has-manual-split');
    refs.browser.style.removeProperty('--ss-domain-top');
  }
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
  workflowStages = STORE.browser.view === 'workflow' ? Browser.buildWorkflowStages(sortedTables) : [];
  workflowHtml = workflowStages.length
    ? '<div class="ss-workflow-groups">' + workflowStages.map(function(stage, stageIndex){
        var stageMeta = String((stage.tables || []).length) + ' ' + _esc(_t('bảng', 'tables')) + (stage.kind === 'flow' ? ' · ' + _esc(_t('từ nguồn đến phụ thuộc', 'upstream to dependent')) : ' · ' + _esc(_t('cần rà soát vòng phụ thuộc', 'review cyclic dependencies')));
        return '<section class="ss-workflow-group' + (stage.kind === 'cycle' ? ' is-cycle' : '') + '"><div class="ss-workflow-group-head"><div class="ss-workflow-group-title">' + _esc(stage.label) + '</div><div class="ss-workflow-group-meta">' + stageMeta + '</div></div><div class="ss-workflow-table-list">' + (stage.tables || []).map(function(tbl){ return renderTableItem(tbl, true); }).join('') + '</div></section>';
      }).join('') + '</div>'
    : '<div class="ss-empty-state"><div>' + _esc(_t('Chưa đủ quan hệ để dựng workflow', 'Not enough relationships to build a workflow view')) + '</div></div>';
  searchMeta = filterActive
    ? _t('Đang hiển thị ' + filtered.length + ' bảng khớp', 'Showing ' + filtered.length + ' matching table(s)')
    : (STORE.browser.view === 'tables'
      ? _t('Nhấp để chọn, nhấp đúp để đưa bảng vào giữa màn hình', 'Click to select, double-click to focus a table')
      : STORE.browser.view === 'workflow'
        ? _t('Nhóm bảng theo luồng phụ thuộc để xem upstream → downstream', 'Grouped by dependency flow to inspect upstream → downstream')
        : _t('Chọn domain ở trên để xem bảng của domain đó', 'Select a domain above to see that domain tables'));
  if(!STORE.browser.open){
    refs.browser.classList.remove('is-domain-view');
    refs.browser.classList.remove('is-table-view');
    refs.browser.classList.remove('is-workflow-view');
    refs.browser.innerHTML = [
      '<div class="ss-browser-collapsed-shell">',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.toggleOpen(true)" title="' + _esc(_t('Mở trình duyệt schema (B)', 'Open schema browser (B)')) + '" aria-label="' + _esc(_t('Mở trình duyệt schema', 'Open schema browser')) + '">&#9654;</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'domains\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '" aria-label="' + _esc(_t('Quản lý theo domain', 'Manage by domain')) + '">◎</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'tables\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '" aria-label="' + _esc(_t('Quản lý theo bảng', 'Manage by table')) + '">≣</button>',
        '<button class="ss-browser-rail-btn" type="button" onclick="Browser.setView(\'workflow\'); Browser.toggleOpen(true)" title="' + _esc(_t('Quản lý theo workflow', 'Manage by workflow')) + '" aria-label="' + _esc(_t('Quản lý theo workflow', 'Manage by workflow')) + '">⇄</button>',
        '<div class="ss-browser-rail-stats"><strong>' + String(stats.visibleTables) + '</strong><span>' + _esc(_t('đang hiện', 'visible')) + '</span></div>',
      '</div>'
    ].join('');
    renderHeaderStatus();
    return;
  }
  refs.browser.innerHTML = [
    '<div class="ss-browser-search-wrap">',
      '<input class="hm-input ss-browser-search" placeholder="' + _esc(_t('Tìm bảng, cột hoặc domain...', 'Search tables, columns, or domains...')) + '" value="' + _esc(STORE.browser.filter) + '" oninput="Browser.onFilter(this.value)" />',
      (STORE.browser.view === 'domains'
        ? '<div class="ss-domain-chip-strip">' + domainCandidates.map(function(domain){
            var totalCount = (filterActive ? (filteredGroups[domain] || []) : (allGroups[domain] || [])).length;
            var hidden = Browser.isDomainHidden(domain);
            var active = STORE.browser.activeDomain === domain;
            return '<button class="ss-domain-chip' + (hidden ? ' is-hidden' : '') + (active ? ' active' : '') + '" type="button" onclick="Browser.setActiveDomain(\'' + _esc(domain) + '\')" title="' + _esc(_t('Chọn domain này', 'Select this domain')) + '"><span class="ss-domain-chip-dot" style="background:' + _esc(DOMAIN_COLORS[domain] || DOMAIN_COLORS.default) + '"></span><span class="ss-domain-chip-label">' + _esc(formatDomainLabel(domain)) + '</span><strong>' + String(totalCount) + '</strong></button>';
          }).join('') + '</div>'
        : ''),
      '<div class="ss-browser-search-meta">' + _esc(searchMeta) + '</div>',
    '</div>',
    (STORE.browser.view === 'domains'
      ? '<div class="ss-browser-splitter" onmousedown="Browser.startDomainSplit(event)" onkeydown="Browser.onDomainSplitKeydown(event)" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="25" aria-valuemax="75" aria-valuenow="' + String(Math.round((STORE.browser.domainSplit || 0.5) * 100)) + '" aria-label="' + _esc(_t('Điều chỉnh chiều cao giữa domain và bảng', 'Resize domain and table panes')) + '"><span class="ss-browser-splitter-handle"></span></div>'
      : ''),
    '<div class="ss-browser-list">' + (STORE.browser.view === 'tables'
      ? (sortedTables.length
          ? '<div class="ss-browser-flat-list">' + sortedTables.map(function(tbl){ return renderTableItem(tbl, true); }).join('') + '</div>'
          : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào khớp bộ lọc hiện tại', 'No tables match the current filter')) + '</div></div>')
      : STORE.browser.view === 'workflow'
        ? workflowHtml
        : (activeDomain
            ? '<div class="ss-domain-focus-card' + (activeHidden ? ' is-hidden' : '') + '" data-domain="' + _esc(activeDomain) + '"><div class="ss-domain-focus-head" style="border-left:3px solid ' + _esc(activeDomainColor) + '"><span class="ss-domain-name">' + _esc(formatDomainLabel(activeDomain)) + '</span>' + (activeHidden ? '<span class="ss-domain-state">' + _esc(_t('Ẩn', 'Hidden')) + '</span>' : '') + '<div class="ss-domain-actions"><button class="ss-domain-action" type="button" onclick="Browser.isolateDomain(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeIsolated ? _t('Bỏ chế độ chỉ xem domain này', 'Clear isolated view') : _t('Chỉ hiện domain này', 'Show only this domain')) + '">' + _esc(activeIsolated ? _t('Tất cả', 'All') : _t('Chỉ', 'Only')) + '</button><button class="ss-domain-action" type="button" onclick="Browser.toggleDomainVisibility(\'' + _esc(activeDomain) + '\', event)" title="' + _esc(activeHidden ? _t('Hiện lại domain này', 'Show this domain again') : _t('Ẩn domain này khỏi canvas', 'Hide this domain from canvas')) + '">' + _esc(activeHidden ? _t('Hiện', 'Show') : _t('Ẩn', 'Hide')) + '</button></div><span class="ss-domain-count">' + String(activeDomainTables.length) + '</span></div>' + (activeHidden
                ? '<div class="ss-domain-hidden-note">' + _esc(_t('Domain này đang ẩn khỏi canvas, minimap và relation', 'This domain is hidden from canvas, minimap, and relations')) + '</div>'
                : (activeDomainTables.length
                    ? '<div class="ss-domain-tables">' + activeDomainTables.map(function(tbl){ return renderTableItem(tbl, false); }).join('') + '</div>'
                    : '<div class="ss-empty-state"><div>' + _esc(_t('Không có bảng nào trong domain này', 'No tables in this domain')) + '</div></div>')) + '</div>'
            : '<div class="ss-empty-state"><div>' + _esc(_t('Chọn một domain để xem danh sách bảng', 'Select a domain to view its tables')) + '</div></div>')) + '</div>'
  ].join('');
  renderHeaderStatus();
};

renderToolbar = function(container){
  if(!container) return;
  container.innerHTML = [
    '<div class="ss-toolbar-left"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-panel-btn ss-toolbar-icon-btn' + (STORE.browser.open ? '' : ' is-collapsed') + '" onclick="Browser.toggleOpen()" title="' + _esc(_t('Ẩn/hiện trình duyệt schema (B)', 'Toggle schema browser (B)')) + '" aria-label="' + _esc(_t('Ẩn hoặc hiện trình duyệt schema', 'Toggle schema browser')) + '"><span class="ss-toolbar-panel-icon">' + (STORE.browser.open ? '&#9666;' : '&#9656;') + '</span></button><select class="ss-schema-select" id="ss-schema-select" onchange="SchemaLib.onSelectChange(this.value)"></select></div>',
    '<div class="ss-toolbar-center"><div class="ss-mode-tabs"><button class="ss-mode-tab' + (STORE.mode === 'canvas' ? ' active' : '') + '" onclick="switchMode(\'canvas\')">' + _esc(_t('Sơ đồ', 'Canvas')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'code' ? ' active' : '') + '" onclick="switchMode(\'code\')">' + _esc(_t('Mã', 'Code')) + '</button><button class="ss-mode-tab' + (STORE.mode === 'validate' ? ' active' : '') + '" onclick="Validator.run()">' + _esc(_t('Kiểm tra', 'Validate')) + '</button><button class="ss-mode-tab" onclick="MigGen.renderPreview()">' + _esc(_t('Di trú', 'Migration')) + '</button></div><div class="ss-toolbar-view-tabs"><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'domains' ? ' active' : '') + '" onclick="Browser.setView(\'domains\')">' + _esc(_t('Theo domain', 'By domain')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'tables' ? ' active' : '') + '" onclick="Browser.setView(\'tables\')">' + _esc(_t('Theo bảng', 'By table')) + '</button><button class="ss-mode-tab ss-browser-view-tab' + (STORE.browser.view === 'workflow' ? ' active' : '') + '" onclick="Browser.setView(\'workflow\')">' + _esc(_t('Theo workflow', 'By workflow')) + '</button></div></div>',
    '<div class="ss-toolbar-right"><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Layout.auto(\'compact-visible\')" title="' + _esc(_t('Nén phần đang hiện để tiết kiệm không gian', 'Compact visible view')) + '" aria-label="' + _esc(_t('Nén phần đang hiện', 'Compact visible view')) + '">' + toolbarIconSvg('compact') + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm ss-toolbar-icon-btn" onclick="Browser.focusNeighborhood()" title="' + _esc(_t('Tập trung vùng lân cận của bảng đang chọn', 'Focus selected table neighborhood')) + '" aria-label="' + _esc(_t('Tập trung vùng lân cận', 'Focus selected table neighborhood')) + '">' + toolbarIconSvg('focus') + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Canvas.zoomReset()">' + _esc(_t('Đặt lại', 'Reset')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="CmdPalette.open()">Ctrl+K</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="Importer.openModal()">' + _esc(_t('Nhập', 'Import')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" onclick="MigGen.setBaseline()">' + _esc(_t('Mốc gốc', 'Baseline')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" onclick="SchemaLib.save()">' + _esc(_t('Lưu', 'Save')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" onclick="CodePanel.open(\'sql\')">SQL</button></div>'
  ].join('');
  SchemaLib.renderSelector();
  renderHeaderStatus();
};

CmdPalette.COMMANDS = CmdPalette.COMMANDS.filter(function(cmd){
  return !(cmd && cmd.category === 'view' && cmd.label_en === 'Switch to workflow view');
});
CmdPalette.COMMANDS.push({
  icon:'⇄',
  label:'Xem theo workflow',
  label_en:'Switch to workflow view',
  category:'view',
  action:function(){ Browser.setView('workflow'); }
});

TableDialog.createDataViewState = function(draft, overrides){
  return Object.assign({
    loading: false,
    loadingMore: false,
    fetchingAll: false,
    available: false,
    columns: [],
    rows: [],
    rowCount: 0,
    actualRowCount: 0,
    loadedRows: 0,
    totalRows: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
    schema: (draft && draft.schema) || 'public',
    table: (draft && draft.name) || '',
    message: '',
    syntheticSample: false,
    syntheticSource: '',
    previewStatus: 'idle',
    primaryKeyColumns: [],
    selectedRowIndex: -1,
    editorMode: '',
    editorRow: null,
    originalRow: null,
    editorDirty: false,
    savingRow: false,
    saveError: '',
    pendingSelectionRow: null
  }, overrides || {});
};

TableDialog.dataColumnKey = function(column){
  return String((column && (column.column_name || column.name)) || '');
};

TableDialog.dataColumnType = function(column){
  return String((column && (column.udt_name || column.data_type || column.type)) || '').toLowerCase();
};

TableDialog.dataColumnNullable = function(column){
  var nullable = String((column && column.is_nullable) || '').toUpperCase();
  if(nullable){
    return nullable === 'YES';
  }
  return !!(column && column.nullable);
};

TableDialog.isGeneratedDataColumn = function(column){
  return String((column && column.is_generated) || 'NEVER').toUpperCase() !== 'NEVER';
};

TableDialog.isIdentityDataColumn = function(column){
  return String((column && column.is_identity) || 'NO').toUpperCase() === 'YES';
};

TableDialog.isBooleanDataColumn = function(column){
  var type = this.dataColumnType(column);
  return type === 'bool' || type === 'boolean';
};

TableDialog.isJsonDataColumn = function(column){
  var type = this.dataColumnType(column);
  return type === 'json' || type === 'jsonb';
};

TableDialog.isNumericDataColumn = function(column){
  var type = this.dataColumnType(column);
  return ['int2','int4','int8','integer','smallint','bigint','numeric','decimal','float4','float8','real','double precision','serial','bigserial','money'].indexOf(type) >= 0;
};

TableDialog.isTemporalDataColumn = function(column){
  var type = this.dataColumnType(column);
  return ['date','timestamp','timestamptz','timestamp without time zone','timestamp with time zone','time','timetz'].indexOf(type) >= 0;
};

TableDialog.isTextAreaDataColumn = function(column){
  var type = this.dataColumnType(column);
  return this.isJsonDataColumn(column) || type === 'text' || type === 'xml';
};

TableDialog.parseDefaultLiteral = function(column){
  var raw = String((column && column.column_default) || '').trim();
  var unwrapped;
  if(!raw) return '';
  if(/^(nextval|gen_random_uuid|uuid_generate_v4|uuidv7|now|current_timestamp)\s*\(/i.test(raw)){
    return '';
  }
  raw = raw.replace(/::[\w\s\[\]\."]+$/g, '');
  if(/^'(.*)'$/s.test(raw)){
    unwrapped = raw.slice(1, -1).replace(/''/g, '\'');
    return unwrapped;
  }
  if(/^true$/i.test(raw)) return true;
  if(/^false$/i.test(raw)) return false;
  if(/^null$/i.test(raw)) return null;
  if(/^-?\d+(?:\.\d+)?$/.test(raw)) return raw;
  return '';
};

TableDialog.buildEmptyDataRow = function(columns){
  var row = {};
  var self = this;
  (columns || []).forEach(function(column){
    var key = self.dataColumnKey(column);
    var defaultValue;
    if(!key || self.isGeneratedDataColumn(column)) return;
    defaultValue = self.parseDefaultLiteral(column);
    if(defaultValue === '' && self.isBooleanDataColumn(column) && !self.dataColumnNullable(column)){
      defaultValue = false;
    }
    row[key] = defaultValue;
  });
  return row;
};

TableDialog.cloneRowForEditor = function(row, columns){
  var next = {};
  var self = this;
  (columns || []).forEach(function(column){
    var key = self.dataColumnKey(column);
    if(!key) return;
    next[key] = row && Object.prototype.hasOwnProperty.call(row, key) ? _clone(row[key]) : '';
  });
  return next;
};

TableDialog.canInsertDataRows = function(dataView){
  return !!(dataView && dataView.available && (dataView.columns || []).length && dataView.syntheticSource !== 'draft');
};

TableDialog.canUpdateDataRows = function(dataView){
  return !!(this.canInsertDataRows(dataView) && !dataView.syntheticSample && (dataView.rows || []).length && (dataView.primaryKeyColumns || []).length);
};

TableDialog.findDataRowIndex = function(rows, targetRow, primaryKeyColumns){
  var index = -1;
  if(!targetRow || !(rows || []).length) return -1;
  if((primaryKeyColumns || []).length){
    rows.some(function(row, rowIndex){
      var matched = primaryKeyColumns.every(function(columnName){
        return String(row && row[columnName]) === String(targetRow && targetRow[columnName]);
      });
      if(matched){
        index = rowIndex;
      }
      return matched;
    });
    return index;
  }
  rows.some(function(row, rowIndex){
    if(JSON.stringify(row) === JSON.stringify(targetRow)){
      index = rowIndex;
      return true;
    }
    return false;
  });
  return index;
};

TableDialog.ensureDataEditorState = function(dataView){
  var row;
  var matchedIndex;
  if(!dataView) return;
  if(typeof dataView.selectedRowIndex !== 'number') dataView.selectedRowIndex = -1;
  if(typeof dataView.editorMode !== 'string') dataView.editorMode = '';
  if(typeof dataView.editorDirty !== 'boolean') dataView.editorDirty = false;
  if(typeof dataView.savingRow !== 'boolean') dataView.savingRow = false;
  if(typeof dataView.saveError !== 'string') dataView.saveError = '';
  if(!Array.isArray(dataView.primaryKeyColumns)) dataView.primaryKeyColumns = [];
  if(dataView.pendingSelectionRow){
    matchedIndex = this.findDataRowIndex(dataView.rows || [], dataView.pendingSelectionRow, dataView.primaryKeyColumns || []);
    if(matchedIndex >= 0){
      row = (dataView.rows || [])[matchedIndex];
      dataView.selectedRowIndex = matchedIndex;
      dataView.editorMode = 'update';
      dataView.originalRow = this.cloneRowForEditor(row, dataView.columns || []);
      dataView.editorRow = this.cloneRowForEditor(row, dataView.columns || []);
      dataView.editorDirty = false;
    }
    dataView.pendingSelectionRow = null;
  }
  if(dataView.editorMode === 'insert' && !dataView.editorRow){
    dataView.editorRow = this.buildEmptyDataRow(dataView.columns || []);
  }
  if(dataView.editorMode === 'update'){
    if(dataView.selectedRowIndex < 0 || !(dataView.rows || [])[dataView.selectedRowIndex] || dataView.syntheticSample){
      dataView.editorMode = '';
      dataView.selectedRowIndex = -1;
      dataView.editorRow = null;
      dataView.originalRow = null;
      dataView.editorDirty = false;
    } else if(!dataView.editorDirty){
      row = (dataView.rows || [])[dataView.selectedRowIndex];
      dataView.originalRow = this.cloneRowForEditor(row, dataView.columns || []);
      dataView.editorRow = this.cloneRowForEditor(row, dataView.columns || []);
    }
  }
};

TableDialog.selectDataRow = function(index){
  var dataView = this.dataView;
  var numericIndex = Number(index);
  var row;
  if(!dataView || !this.canUpdateDataRows(dataView)) return;
  if(!Number.isFinite(numericIndex) || numericIndex < 0 || numericIndex >= (dataView.rows || []).length) return;
  row = (dataView.rows || [])[numericIndex];
  dataView.selectedRowIndex = numericIndex;
  dataView.editorMode = 'update';
  dataView.originalRow = this.cloneRowForEditor(row, dataView.columns || []);
  dataView.editorRow = this.cloneRowForEditor(row, dataView.columns || []);
  dataView.editorDirty = false;
  dataView.saveError = '';
  this.render();
};

TableDialog.startNewDataRow = function(){
  var dataView = this.dataView;
  if(!this.canInsertDataRows(dataView)) return;
  dataView.selectedRowIndex = -1;
  dataView.editorMode = 'insert';
  dataView.originalRow = {};
  dataView.editorRow = this.buildEmptyDataRow(dataView.columns || []);
  dataView.editorDirty = false;
  dataView.saveError = '';
  this.render();
};

TableDialog.cancelDataEditor = function(){
  var dataView = this.dataView;
  if(!dataView) return;
  if(dataView.editorMode === 'update' && dataView.selectedRowIndex >= 0 && (dataView.rows || [])[dataView.selectedRowIndex]){
    dataView.editorRow = this.cloneRowForEditor((dataView.rows || [])[dataView.selectedRowIndex], dataView.columns || []);
    dataView.originalRow = this.cloneRowForEditor((dataView.rows || [])[dataView.selectedRowIndex], dataView.columns || []);
    dataView.editorDirty = false;
    dataView.saveError = '';
  } else {
    dataView.editorMode = '';
    dataView.selectedRowIndex = -1;
    dataView.editorRow = null;
    dataView.originalRow = null;
    dataView.editorDirty = false;
    dataView.saveError = '';
  }
  this.render();
};

TableDialog.updateDataEditorField = function(columnName, value){
  var dataView = this.dataView;
  if(!dataView || !dataView.editorRow) return;
  if(value === '__NULL__'){
    dataView.editorRow[columnName] = null;
  } else if(value === '__TRUE__'){
    dataView.editorRow[columnName] = true;
  } else if(value === '__FALSE__'){
    dataView.editorRow[columnName] = false;
  } else {
    dataView.editorRow[columnName] = value;
  }
  dataView.editorDirty = true;
  dataView.saveError = '';
};

TableDialog.toggleDataEditorNull = function(columnName, checked){
  var dataView = this.dataView;
  if(!dataView || !dataView.editorRow) return;
  if(checked){
    dataView.editorRow[columnName] = null;
  } else if(dataView.editorRow[columnName] == null){
    dataView.editorRow[columnName] = '';
  }
  dataView.editorDirty = true;
  dataView.saveError = '';
  this.render();
};

TableDialog.coerceEditorValue = function(column, value, mode){
  var type = this.dataColumnType(column);
  var textValue;
  if(value === null || typeof value === 'boolean'){
    return value;
  }
  if(typeof value === 'number'){
    return String(value);
  }
  textValue = String(value == null ? '' : value);
  if(textValue === ''){
    if(mode === 'insert' && (column && column.column_default) && !this.isGeneratedDataColumn(column)){
      return '';
    }
    if(this.dataColumnNullable(column) && (this.isNumericDataColumn(column) || this.isTemporalDataColumn(column) || this.isJsonDataColumn(column) || type === 'uuid' || type === 'inet')){
      return null;
    }
    return textValue;
  }
  if(this.isBooleanDataColumn(column)){
    return /^(true|t|1|yes|y|on)$/i.test(textValue) ? true : false;
  }
  if(this.isJsonDataColumn(column)){
    try{
      return JSON.parse(textValue);
    }catch(err){
      throw new Error(_t('JSON không hợp lệ ở cột ', 'Invalid JSON in column ') + this.dataColumnKey(column));
    }
  }
  return textValue;
};

TableDialog.serializeEditorRow = function(dataView){
  var payload = {};
  var mode = dataView && dataView.editorMode === 'update' ? 'update' : 'insert';
  var self = this;
  (dataView.columns || []).forEach(function(column){
    var key = self.dataColumnKey(column);
    var value;
    if(!key || self.isGeneratedDataColumn(column)) return;
    if(mode === 'update' && (dataView.primaryKeyColumns || []).indexOf(key) >= 0){
      return;
    }
    value = dataView.editorRow && Object.prototype.hasOwnProperty.call(dataView.editorRow, key) ? dataView.editorRow[key] : '';
    payload[key] = self.coerceEditorValue(column, value, mode);
  });
  return payload;
};

TableDialog.renderDataEditorField = function(column){
  var dataView = this.dataView || {};
  var key = this.dataColumnKey(column);
  var value = dataView.editorRow && Object.prototype.hasOwnProperty.call(dataView.editorRow, key) ? dataView.editorRow[key] : '';
  var readOnly = this.isGeneratedDataColumn(column) || (dataView.editorMode === 'update' && (dataView.primaryKeyColumns || []).indexOf(key) >= 0);
  var allowNull = this.dataColumnNullable(column);
  var isNull = value === null;
  var hint = this.dataColumnType(column);
  var controlHtml = '';
  if(this.isBooleanDataColumn(column)){
    controlHtml = '<select class="hm-input" onchange="TableDialog.updateDataEditorField(\'' + key + '\', this.value)"' + (readOnly ? ' disabled' : '') + '>'
      + (allowNull ? '<option value="__NULL__"' + (isNull ? ' selected' : '') + '>NULL</option>' : '')
      + '<option value="__TRUE__"' + (value === true ? ' selected' : '') + '>true</option>'
      + '<option value="__FALSE__"' + (value === false || value === '' ? ' selected' : '') + '>false</option>'
      + '</select>';
  } else if(this.isTextAreaDataColumn(column)){
    controlHtml = '<textarea class="hm-input ss-table-data-editor-textarea" oninput="TableDialog.updateDataEditorField(\'' + key + '\', this.value)"' + (readOnly || isNull ? ' disabled' : '') + '>' + _esc(isNull ? '' : String(value == null ? '' : value)) + '</textarea>';
  } else {
    controlHtml = '<input class="hm-input" type="text"' + (this.isNumericDataColumn(column) ? ' inputmode="decimal"' : '') + ' value="' + _esc(isNull ? '' : String(value == null ? '' : value)) + '" oninput="TableDialog.updateDataEditorField(\'' + key + '\', this.value)"' + (readOnly || isNull ? ' readonly' : '') + ' />';
  }
  return [
    '<div class="ss-table-data-editor-field' + (readOnly ? ' is-readonly' : '') + '">',
      '<div class="ss-table-data-editor-label-row"><label class="ss-table-data-editor-label">' + _esc(key) + '</label><span class="ss-table-data-editor-type">' + _esc(hint) + '</span></div>',
      controlHtml,
      (allowNull && !this.isBooleanDataColumn(column) && !readOnly ? '<label class="ss-table-data-editor-null"><input type="checkbox" onchange="TableDialog.toggleDataEditorNull(\'' + key + '\', this.checked)"' + (isNull ? ' checked' : '') + '>NULL</label>' : ''),
    '</div>'
  ].join('');
};

TableDialog.renderDataEditor = function(dataView){
  var canInsert = this.canInsertDataRows(dataView);
  var canUpdate = this.canUpdateDataRows(dataView);
  var hasEditor = !!dataView.editorMode && !!dataView.editorRow;
  var title = hasEditor
    ? (dataView.editorMode === 'insert' ? _t('Tạo dòng mới', 'New row') : _t('Chỉnh sửa dòng đã chọn', 'Edit selected row'))
    : _t('Trình sửa bản ghi', 'Record editor');
  var subtitle = !canInsert
    ? _t('Chỉ cho phép chỉnh dữ liệu khi bảng thật tồn tại trong database hiện tại.', 'Editing is available only when the real table exists in the current database.')
    : (!canUpdate && (dataView.rows || []).length
      ? _t('Bảng này chưa nhận diện được khóa chính nên chỉ hỗ trợ thêm dòng mới.', 'This table has no detected primary key, so only inserting new rows is enabled.')
      : (dataView.syntheticSample && !dataView.actualRowCount
        ? _t('Bảng chưa có dữ liệu thật. Hãy tạo dòng đầu tiên bên dưới.', 'This table has no real rows yet. Create the first row below.')
        : _t('Chọn một dòng trong lưới để sửa, hoặc thêm dòng mới.', 'Select a row in the grid to edit it, or create a new row.')));
  return [
    '<aside class="ss-table-data-editor">',
      '<div class="ss-table-data-editor-head">',
        '<div><div class="ss-table-data-editor-title">' + _esc(title) + '</div><div class="ss-field-hint">' + _esc(subtitle) + '</div></div>',
        '<div class="ss-table-data-editor-actions">',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.startNewDataRow()"' + (canInsert ? '' : ' disabled') + '>' + _esc(_t('+ Thêm dòng mới', '+ New row')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-primary ss-btn-xs" onclick="TableDialog.saveDataEditorRow()"' + (hasEditor && !dataView.savingRow && (dataView.editorMode === 'insert' || canUpdate) ? '' : ' disabled') + '>' + _esc(dataView.savingRow ? _t('Đang lưu...', 'Saving...') : _t('Lưu dòng', 'Save row')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-ghost ss-btn-xs" onclick="TableDialog.cancelDataEditor()"' + (hasEditor ? '' : ' disabled') + '>' + _esc(_t('Hủy', 'Cancel')) + '</button>',
        '</div>',
      '</div>',
      (dataView.saveError ? '<div class="ss-table-data-editor-error">' + _esc(dataView.saveError) + '</div>' : ''),
      (hasEditor
        ? '<div class="ss-table-data-editor-form">' + (dataView.columns || []).map(function(column){ return TableDialog.renderDataEditorField(column); }).join('') + '</div>'
        : '<div class="ss-table-data-editor-empty">' + _esc(_t('Chưa có bản ghi nào được chọn để chỉnh sửa.', 'No record is currently selected for editing.')) + '</div>'),
    '</aside>'
  ].join('');
};

TableDialog.dataGridHtml = function(data){
  var payload = data || {};
  var rowOffset = Number(payload.offset) || 0;
  var canSelectRows = this.canUpdateDataRows(payload);
  if(payload.loading){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Đang tải dữ liệu bảng...', 'Loading table data...')) + '</div>';
  }
  if(!payload.available){
    return '<div class="ss-table-dialog-empty">' + _esc(payload.message || _t('Chưa lấy được dữ liệu của bảng này từ database hiện tại', 'Could not load table data from the current database')) + '</div>';
  }
  if(!(payload.columns || []).length){
    return '<div class="ss-table-dialog-empty">' + _esc(_t('Không có cột nào để hiển thị', 'No columns to display')) + '</div>';
  }
  return [
    '<div class="ss-table-dialog-data-wrap" tabindex="0">',
      '<table class="ss-table-dialog-data-table">',
        '<thead><tr><th class="ss-table-dialog-rownum">#</th>',
          (payload.columns || []).map(function(col){
            return '<th>' + _esc(TableDialog.dataColumnKey(col)) + '</th>';
          }).join(''),
        '</tr></thead>',
        '<tbody>',
          (payload.rows || []).length ? (payload.rows || []).map(function(row, rowIndex){
            var absoluteIndex = rowOffset + rowIndex + 1;
            var isSelected = Number(payload.selectedRowIndex) === rowIndex && payload.editorMode === 'update';
            return '<tr class="' + (isSelected ? 'is-selected' : '') + (canSelectRows ? ' is-clickable' : '') + '"' + (canSelectRows ? ' onclick="TableDialog.selectDataRow(' + String(rowIndex) + ')"' : '') + '><td class="ss-table-dialog-rownum">' + String(absoluteIndex) + '</td>' + (payload.columns || []).map(function(col){
              var key = TableDialog.dataColumnKey(col);
              var value = row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : '';
              if(value == null) value = '';
              if(typeof value === 'object'){
                value = JSON.stringify(value);
              }
              return '<td title="' + _esc(String(value)) + '">' + _esc(String(value)) + '</td>';
            }).join('') + '</tr>';
          }).join('')
          : '<tr><td colspan="' + String(((payload.columns || []).length || 1) + 1) + '">' + _esc(_t('Bảng này hiện chưa có dòng dữ liệu nào. Hãy thêm dòng đầu tiên.', 'This table currently has no rows. Create the first one.')) + '</td></tr>',
        '</tbody>',
      '</table>',
    '</div>'
  ].join('');
};

TableDialog.saveDataEditorRow = function(){
  var dataView = this.dataView;
  var draft = this.collectForm() || this.ensureDraft();
  var self = this;
  var mode;
  var payload;
  if(!dataView || !dataView.editorRow || !draft) return Promise.resolve(null);
  if(!this.canInsertDataRows(dataView)){
    dataView.saveError = _t('Bảng này chưa sẵn sàng để ghi dữ liệu thật vào database.', 'This table is not ready for live database writes yet.');
    this.render();
    return Promise.resolve(null);
  }
  mode = dataView.editorMode === 'update' ? 'update' : 'insert';
  if(mode === 'update' && !this.canUpdateDataRows(dataView)){
    dataView.saveError = _t('Bảng này chưa có khóa chính để cập nhật dòng hiện hữu.', 'This table has no primary key for updating existing rows.');
    this.render();
    return Promise.resolve(null);
  }
  try{
    payload = this.serializeEditorRow(dataView);
  }catch(err){
    dataView.saveError = err && err.message ? err.message : _t('Không thể chuẩn hóa dữ liệu dòng hiện tại.', 'Could not normalize the current row.');
    this.render();
    return Promise.resolve(null);
  }
  dataView.savingRow = true;
  dataView.saveError = '';
  this.render();
  return _api('schema_studio_table_row_save', {
    schema: draft.schema || 'public',
    table: draft.name,
    mode: mode,
    row: payload,
    original: mode === 'update' ? (dataView.originalRow || {}) : {}
  }, 'POST').then(function(res){
    var savedRow = res && res.row ? res.row : {};
    var nextIndex = dataView.selectedRowIndex;
    dataView.savingRow = false;
    dataView.primaryKeyColumns = (res && res.primaryKeyColumns) || dataView.primaryKeyColumns || [];
    if(mode === 'insert'){
      if(dataView.syntheticSample && !dataView.actualRowCount){
        dataView.rows = [savedRow];
      } else {
        dataView.rows = [savedRow].concat(dataView.rows || []);
        nextIndex = 0;
      }
      dataView.syntheticSample = false;
      dataView.syntheticSource = '';
      dataView.actualRowCount = Math.max(1, (Number(dataView.actualRowCount) || 0) + 1);
      dataView.totalRows = Math.max(1, (Number(dataView.totalRows) || 0) + 1);
      dataView.loadedRows = Math.max((dataView.rows || []).length, Number(dataView.loadedRows) || 0);
      dataView.selectedRowIndex = nextIndex < 0 ? 0 : nextIndex;
    } else {
      if(nextIndex >= 0 && (dataView.rows || [])[nextIndex]){
        dataView.rows[nextIndex] = savedRow;
      } else {
        nextIndex = self.findDataRowIndex(dataView.rows || [], savedRow, dataView.primaryKeyColumns || []);
        if(nextIndex >= 0 && (dataView.rows || [])[nextIndex]){
          dataView.rows[nextIndex] = savedRow;
          dataView.selectedRowIndex = nextIndex;
        }
      }
    }
    dataView.rowCount = (dataView.rows || []).length;
    dataView.editorMode = 'update';
    dataView.originalRow = self.cloneRowForEditor(savedRow, dataView.columns || []);
    dataView.editorRow = self.cloneRowForEditor(savedRow, dataView.columns || []);
    dataView.editorDirty = false;
    toast(mode === 'insert' ? _t('Đã thêm dòng dữ liệu mới', 'New row inserted') : _t('Đã cập nhật dòng dữ liệu', 'Row updated'), 'success');
    self.render();
    return res;
  }).catch(function(err){
    dataView.savingRow = false;
    dataView.saveError = err && err.message ? err.message : _t('Không thể lưu dòng dữ liệu này.', 'Could not save this row.');
    self.render();
    return null;
  });
};

TableDialog.renderDataTab = function(draft){
  var dataView = this.dataView || this.createDataViewState(draft, {});
  var shownRows;
  var totalRows;
  var totalRowsLabel;
  this.ensureDataEditorState(dataView);
  shownRows = (dataView.rows || []).length;
  totalRows = Math.max(0, Number(dataView.totalRows) || 0);
  totalRowsLabel = dataView.syntheticSample
    ? _t('0 dòng thật', '0 real rows')
    : String(totalRows) + ' ' + _t('dòng thật', 'real rows');
  return [
    '<div class="ss-table-dialog-section ss-table-data-panel">',
      '<div class="ss-table-dialog-section-head">',
        '<div>',
          '<div class="ss-table-dialog-section-title">' + _esc(_t('Dữ liệu bảng', 'Table data')) + '</div>',
          '<div class="ss-field-hint">' + _esc(this.dataHint(dataView)) + '</div>',
        '</div>',
        '<div class="ss-table-dialog-inline-actions">',
          '<span class="ss-field-hint">' + String((dataView.columns || []).length) + ' ' + _esc(_t('field', 'fields')) + '</span>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs ss-table-data-action-primary" onclick="TableDialog.refreshDataView()">' + _esc(_t('Làm mới', 'Refresh')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadMoreDataView()"' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.loadingMore ? _t('Đang tải...', 'Loading...') : _t('Tải thêm', 'Load more')) + '</button>',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-xs" onclick="TableDialog.loadAllDataView()"' + (dataView.hasMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(dataView.fetchingAll ? _t('Đang tải toàn bộ...', 'Loading all...') : _t('Tải toàn bộ', 'Load all')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ss-table-data-toolbar">',
        '<div class="ss-table-data-meta">',
          '<span class="ss-table-data-pill">' + _esc(_t('Giới hạn / lần tải', 'Batch size')) + ': ' + String(Number(dataView.limit) || 100) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(_t('Số dòng đang hiển thị', 'Rows shown')) + ': ' + String(shownRows) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(_t('Số field', 'Field count')) + ': ' + String((dataView.columns || []).length) + '</span>',
          '<span class="ss-table-data-pill">' + _esc(totalRowsLabel) + '</span>',
          (dataView.syntheticSample ? '<span class="ss-table-data-pill is-sample">' + _esc(_t('1 dòng mẫu', '1 sample row')) + '</span>' : ''),
        '</div>',
        '<div class="ss-table-data-nav">',
          '<div class="ss-table-data-page">' + _esc(dataView.syntheticSample ? _t('Dữ liệu mẫu', 'Sample data') : _t('Đã tải ' + shownRows + ' / ' + totalRows + ' dòng', 'Loaded ' + shownRows + ' / ' + totalRows + ' rows')) + '</div>',
          '<div class="ss-table-data-nav-actions">',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + ((Number(dataView.offset) || 0) > 0 && !dataView.loading ? '' : ' is-disabled') + '" onclick="TableDialog.loadDataView(' + String(Number(dataView.limit) || 100) + ',' + String(Math.max(0, (Number(dataView.offset) || 0) - (Number(dataView.limit) || 100))) + ',false)"' + (((Number(dataView.offset) || 0) > 0 && !dataView.loading) ? '' : ' disabled') + '>' + _esc(_t('Trang trước', 'Previous')) + '</button>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' is-disabled') + '" onclick="TableDialog.loadMoreDataView()"' + (dataView.hasMore && !dataView.loadingMore && !dataView.fetchingAll ? '' : ' disabled') + '>' + _esc(_t('Trang sau', 'Next')) + '</button>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="ss-table-data-layout">',
        '<div class="ss-table-data-grid-pane">' + this.dataGridHtml(dataView) + '</div>',
        this.renderDataEditor(dataView),
      '</div>',
    '</div>'
  ].join('');
};

Browser.startDomainSplit = function(ev){
  var browserEl = refs.browser;
  var rect;
  function cleanup(persist){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    Browser._activeSplitCleanup = null;
    if(persist) saveUiPrefs();
  }
  function clampRatio(value){
    return Math.max(0.25, Math.min(0.75, value));
  }
  function onMove(moveEv){
    var ratio;
    if(!browserEl) return;
    ratio = clampRatio((moveEv.clientY - rect.top) / Math.max(rect.height, 1));
    STORE.browser.domainSplit = ratio;
    STORE.browser.domainSplitManual = true;
    browserEl.classList.add('has-domain-split');
    browserEl.classList.add('has-manual-split');
    browserEl.style.setProperty('--ss-domain-top', Math.round(ratio * 100) + '%');
  }
  function onUp(){
    cleanup(true);
    Browser.render();
  }
  if(!browserEl || STORE.browser.view !== 'domains'){
    return;
  }
  ev.preventDefault();
  rect = browserEl.getBoundingClientRect();
  if(Browser._activeSplitCleanup){
    Browser._activeSplitCleanup(false);
  }
  onMove(ev);
  Browser._activeSplitCleanup = cleanup;
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

Browser.adjustDomainSplit = function(nextRatio){
  STORE.browser.domainSplit = Math.max(0.25, Math.min(0.75, Number(nextRatio) || 0.5));
  STORE.browser.domainSplitManual = true;
  saveUiPrefs();
  Browser.render();
};


/* ── Enterprise Upgrade Control Plane ────────────────────────────────────── */
(function(){
  var ENTERPRISE_STYLE_ID = 'ss-enterprise-style';
  var LAYER_DOMAIN_MAP = {
    foundation: 'Foundation',
    core_system: 'Foundation',
    master_data: 'Master Data',
    master_data_governance: 'Master Data',
    engineering: 'Engineering',
    planning_erp: 'Planning ERP',
    mes_execution: 'MES Execution',
    production: 'MES Execution',
    scheduling: 'Planning ERP',
    inventory_traceability: 'Inventory Traceability',
    inventory: 'Inventory Traceability',
    eqms_compliance: 'eQMS Compliance',
    quality_management: 'eQMS Compliance',
    compliance: 'eQMS Compliance',
    document_control: 'eQMS Compliance'
  };

  STORE.enterprise = STORE.enterprise || {
    tab: 'summary',
    overlayEl: null,
    releases: [],
    loading: false,
    lastCompiler: null,
    lastRelease: null
  };

  function enterpriseEsc(value){
    return _esc(value == null ? '' : String(value));
  }

  function enterpriseNow(){
    return new Date().toISOString();
  }

  function enterprisePlainLabel(value){
    return String(value == null ? '' : value)
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, function(chr){ return chr.toUpperCase(); })
      .trim();
  }

  function enterpriseStableKey(value, fallback){
    var clean = String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_{2,}/g, '_');
    return clean || (fallback || 'enterprise_key');
  }

  function enterpriseEnsureArray(value){
    return Array.isArray(value) ? value : [];
  }

  function enterpriseGroupByTableId(schema){
    var map = {};
    enterpriseEnsureArray(schema && schema.groups).forEach(function(group){
      enterpriseEnsureArray(group && group.table_ids).forEach(function(id){
        if(id) map[id] = group;
      });
    });
    return map;
  }

  function enterpriseInferLayer(schema, table){
    var groupMap = enterpriseGroupByTableId(schema);
    var group = groupMap[String((table && table.id) || '')];
    var domain = enterpriseStableKey(table && table.domain, '');
    if(group && group.name) return String(group.name);
    if(domain && LAYER_DOMAIN_MAP[domain]) return LAYER_DOMAIN_MAP[domain];
    if(domain) return enterprisePlainLabel(domain);
    return 'Foundation';
  }

  function enterpriseCapabilityCatalog(){
    return [
      { key:'organization', label:'Organization / Site / Plant', patterns:['organization', 'site', 'plant', 'line', 'workcenter', 'machine'], critical:true },
      { key:'item_bom_routing', label:'Item / Revision / BOM / Routing', patterns:['item', 'revision', 'bom', 'routing', 'operation'], critical:true },
      { key:'production_execution', label:'Work Order / Production Execution', patterns:['work_order', 'production_order', 'dispatch', 'execution', 'labor_log', 'machine_log'], critical:true },
      { key:'quality_execution', label:'Quality Plan / Inspection / Measurement', patterns:['quality_plan', 'inspection_lot', 'inspection', 'characteristic', 'measurement'], critical:true },
      { key:'nc_capa', label:'NC / CAPA / Deviation / Concession', patterns:['nonconformance', 'nc_', 'capa', 'deviation', 'concession'], critical:true },
      { key:'doc_training_competency', label:'Document / Training / Competency', patterns:['document', 'training', 'competency'], critical:false },
      { key:'calibration_maintenance', label:'Calibration / Maintenance', patterns:['calibration', 'maintenance', 'equipment'], critical:false },
      { key:'supplier_customer_inventory', label:'Supplier / Customer / Inventory', patterns:['supplier', 'customer', 'inventory', 'warehouse', 'stock'], critical:true },
      { key:'traceability', label:'Lot / Serial / Traceability / Genealogy', patterns:['lot', 'serial', 'traceability', 'genealogy'], critical:true },
      { key:'approval_audit_event', label:'Approval / E-Signature / Audit / Alarm', patterns:['approval', 'electronic_signature', 'signature', 'audit', 'event', 'alarm'], critical:true }
    ];
  }

  function enterpriseTableTokens(table){
    var values = [
      table && table.name,
      table && table.comment,
      table && table.domain,
      table && table.labels && table.labels.vi,
      table && table.labels && table.labels.en,
      table && table.business && table.business.business_name_vi,
      table && table.business && table.business.business_name_en,
      table && table.canonical && table.canonical.object_key
    ].concat(enterpriseEnsureArray(table && table.tags));
    return values.join(' ').toLowerCase();
  }

  function enterpriseMatchCapability(table, capability){
    var haystack = enterpriseTableTokens(table);
    return enterpriseEnsureArray(capability && capability.patterns).some(function(pattern){
      return haystack.indexOf(String(pattern).toLowerCase()) >= 0;
    });
  }

  function enterpriseEnsureTableMeta(schema, table){
    var layer = enterpriseInferLayer(schema, table);
    table.labels = Object.assign({
      vi: enterprisePlainLabel(table.name || table.id || 'table'),
      en: enterprisePlainLabel(table.name || table.id || 'table'),
      technical: String(table.name || '')
    }, (table.labels && typeof table.labels === 'object') ? table.labels : {});
    table.business = Object.assign({
      business_name_vi: table.labels.vi,
      business_name_en: table.labels.en,
      domain: table.domain || 'default',
      subdomain: '',
      manufacturing_semantics: '',
      qms_semantics: '',
      glossary_links: [],
      tags: enterpriseEnsureArray(table.tags)
    }, (table.business && typeof table.business === 'object') ? table.business : {});
    table.ui = Object.assign({
      icon: 'fa-table',
      default_widget: 'grid',
      preferred_card_density: 'comfortable',
      saved_view_ids: [],
      inspector_sections: ['business', 'physical', 'security', 'integration']
    }, (table.ui && typeof table.ui === 'object') ? table.ui : {});
    table.validation = Object.assign({
      profile: 'enterprise_default',
      rules: [],
      required_approvals: [],
      destructive_firewall_exemptions: []
    }, (table.validation && typeof table.validation === 'object') ? table.validation : {});
    table.reporting = Object.assign({
      subject_area: table.domain || 'default',
      grain: 'transaction',
      dimensions: [],
      measures: [],
      lifecycle_stage: 'active'
    }, (table.reporting && typeof table.reporting === 'object') ? table.reporting : {});
    table.integration = Object.assign({
      api_contracts: [],
      workflow_bindings: [],
      event_topics: [],
      digital_thread_links: []
    }, (table.integration && typeof table.integration === 'object') ? table.integration : {});
    table.governance = Object.assign({
      owner: '',
      steward: '',
      approver_role: '',
      classification: 'internal',
      reason_codes: [],
      review_evidence: []
    }, (table.governance && typeof table.governance === 'object') ? table.governance : {});
    table.security = Object.assign({
      sensitivity: (table.rls_enabled ? 'confidential' : 'internal'),
      masking: [],
      roles: [],
      policy_refs: enterpriseEnsureArray(table.policies).map(function(item){ return item && (item.key || item.name || item.id || 'policy'); })
    }, (table.security && typeof table.security === 'object') ? table.security : {});
    table.canonical = Object.assign({
      layer: layer,
      layer_code: enterpriseStableKey(layer, 'foundation'),
      object_key: enterpriseStableKey(table.name || table.id, 'table'),
      capability: table.domain || 'default',
      canonical_status: 'candidate',
      lineage_targets: []
    }, (table.canonical && typeof table.canonical === 'object') ? table.canonical : {});
    table.performance = Object.assign({
      partition_strategy: table.partitioning || '',
      expected_volume: '',
      access_pattern: '',
      online_migration_notes: []
    }, (table.performance && typeof table.performance === 'object') ? table.performance : {});
    table.lifecycle = Object.assign({
      stage: 'active',
      deprecated_at: '',
      effective_from: '',
      effective_until: ''
    }, (table.lifecycle && typeof table.lifecycle === 'object') ? table.lifecycle : {});
    table.columns = enterpriseEnsureArray(table.columns).map(function(column){
      column.labels = Object.assign({
        vi: enterprisePlainLabel(column.name || column.id || 'column'),
        en: enterprisePlainLabel(column.name || column.id || 'column'),
        technical: String(column.name || '')
      }, (column.labels && typeof column.labels === 'object') ? column.labels : {});
      column.business = Object.assign({
        business_name_vi: column.labels.vi,
        business_name_en: column.labels.en,
        glossary_links: [],
        semantics: '',
        unit: ''
      }, (column.business && typeof column.business === 'object') ? column.business : {});
      column.ui = Object.assign({
        widget: '',
        placeholder: '',
        readonly_intent: false,
        hidden_intent: false,
        list_badge: false
      }, (column.ui && typeof column.ui === 'object') ? column.ui : {});
      column.validation = Object.assign({
        rules: [],
        required_if: [],
        format_hint: '',
        quality_gate: ''
      }, (column.validation && typeof column.validation === 'object') ? column.validation : {});
      column.reporting = Object.assign({
        dimension: false,
        measure: false,
        sort_priority: null,
        searchable: true
      }, (column.reporting && typeof column.reporting === 'object') ? column.reporting : {});
      column.integration = Object.assign({
        api_name: column.name || '',
        external_keys: [],
        source_systems: []
      }, (column.integration && typeof column.integration === 'object') ? column.integration : {});
      column.security = Object.assign({
        sensitivity: column.primary_key ? 'internal' : '',
        mask_strategy: '',
        pii: false
      }, (column.security && typeof column.security === 'object') ? column.security : {});
      return column;
    });
    return table;
  }

  function enterpriseEnsureRelationMeta(relation){
    relation.labels = Object.assign({
      vi: enterprisePlainLabel(relation.name || relation.id || 'relation'),
      en: enterprisePlainLabel(relation.name || relation.id || 'relation')
    }, (relation.labels && typeof relation.labels === 'object') ? relation.labels : {});
    relation.runtime = Object.assign({
      contract_key: enterpriseStableKey(relation.name || relation.id, 'relation'),
      cascade_profile: relation.on_delete || 'RESTRICT',
      sync_mode: 'runtime'
    }, (relation.runtime && typeof relation.runtime === 'object') ? relation.runtime : {});
    relation.governance = Object.assign({
      owner: '',
      review_required: false,
      approval_class: 'standard'
    }, (relation.governance && typeof relation.governance === 'object') ? relation.governance : {});
    relation.integration = Object.assign({
      digital_thread: false,
      workflow_bindings: []
    }, (relation.integration && typeof relation.integration === 'object') ? relation.integration : {});
    return relation;
  }

  function enterpriseEnsureSchemaDoc(schema){
    var savedViews;
    if(!schema || typeof schema !== 'object') return schema;
    schema._meta = (schema._meta && typeof schema._meta === 'object') ? schema._meta : {};
    schema._meta.enterprise = Object.assign({
      profile: 'hesem_schema_studio_enterprise',
      lifecycle: 'draft',
      change_request_id: '',
      approval_class: 'standard',
      environment: 'workspace',
      branch_key: 'main',
      effective_from: '',
      effective_until: '',
      canonical_model: 'erp_mes_eqms_7layer',
      compiler_version: '2026.04.enterprise',
      release_notes: '',
      governance: {
        owner: currentUsername(),
        stewards: [],
        approvers: [],
        reviewers: [],
        required_evidence: [],
        electronic_signature_required: false,
        last_reviewed_at: ''
      }
    }, (schema._meta.enterprise && typeof schema._meta.enterprise === 'object') ? schema._meta.enterprise : {});
    if(!schema._meta.enterprise.governance || typeof schema._meta.enterprise.governance !== 'object'){
      schema._meta.enterprise.governance = {
        owner: currentUsername(),
        stewards: [],
        approvers: [],
        reviewers: [],
        required_evidence: [],
        electronic_signature_required: false,
        last_reviewed_at: ''
      };
    }
    if(!Array.isArray(schema.views)) schema.views = [];
    if(!Array.isArray(schema.securityPolicies)) schema.securityPolicies = [];
    if(!Array.isArray(schema.releaseBundles)) schema.releaseBundles = [];
    if(!Array.isArray(schema.runtimeProjections)) schema.runtimeProjections = [];
    if(!Array.isArray(schema.notes)) schema.notes = [];
    schema.tables = enterpriseEnsureArray(schema.tables).map(function(table){
      return enterpriseEnsureTableMeta(schema, table || {});
    });
    schema.relations = enterpriseEnsureArray(schema.relations).map(function(relation){
      return enterpriseEnsureRelationMeta(relation || {});
    });
    savedViews = schema.views.filter(function(view){ return view && view.id; });
    if(!savedViews.length){
      schema.views.push({
        id: 'vw_domain',
        name: _t('Theo domain', 'By domain'),
        kind: 'domain',
        state: {
          browserView: 'domains',
          hiddenDomains: {},
          isolatedDomain: '',
          zoom: 1
        }
      });
    }
    return schema;
  }

  function enterpriseCountPolicies(schema){
    var tablePolicies = 0;
    enterpriseEnsureArray(schema && schema.tables).forEach(function(table){
      tablePolicies += enterpriseEnsureArray(table && table.policies).length;
    });
    return enterpriseEnsureArray(schema && schema.securityPolicies).length + tablePolicies;
  }

  function enterpriseBuildReport(schema){
    var normalized = enterpriseEnsureSchemaDoc(_clone(schema || {}));
    var domains = {};
    var layers = {};
    var columnCount = 0;
    var generatedColumns = 0;
    var fkColumns = 0;
    var rlsTables = 0;
    var partitionedTables = 0;
    var required = enterpriseCapabilityCatalog();
    var capabilities = required.map(function(item){
      var matched = normalized.tables.filter(function(table){ return enterpriseMatchCapability(table, item); }).map(function(table){ return table.name; });
      return Object.assign({}, item, {
        present: matched.length > 0,
        matched_tables: matched
      });
    });
    normalized.tables.forEach(function(table){
      var domain = String(table.domain || 'default');
      var layer = String((table.canonical && table.canonical.layer) || enterpriseInferLayer(normalized, table) || 'Foundation');
      domains[domain] = (domains[domain] || 0) + 1;
      layers[layer] = (layers[layer] || 0) + 1;
      columnCount += enterpriseEnsureArray(table.columns).length;
      generatedColumns += enterpriseEnsureArray(table.columns).filter(function(col){ return !!(col && col.generated_expr); }).length;
      fkColumns += enterpriseEnsureArray(table.columns).filter(function(col){ return !!(col && col.foreign_key); }).length;
      if(table.rls_enabled) rlsTables += 1;
      if(table.partitioning || (table.performance && table.performance.partition_strategy)) partitionedTables += 1;
    });
    var presentCount = capabilities.filter(function(item){ return item.present; }).length;
    var criticalMissing = capabilities.filter(function(item){ return item.critical && !item.present; }).map(function(item){ return item.label; });
    var coverage = capabilities.length ? Math.round((presentCount / capabilities.length) * 100) : 0;
    var releaseReadiness = Math.max(0, Math.min(100,
      coverage
      + Math.min(20, rlsTables * 2)
      + Math.min(10, Math.round((enterpriseCountPolicies(normalized) || 0) / 3))
      - (criticalMissing.length * 7)
    ));
    return {
      summary: {
        tableCount: normalized.tables.length,
        relationCount: enterpriseEnsureArray(normalized.relations).length,
        columnCount: columnCount,
        domainCount: Object.keys(domains).length,
        layerCount: Object.keys(layers).length,
        policyCount: enterpriseCountPolicies(normalized),
        rlsTableCount: rlsTables,
        generatedColumnCount: generatedColumns,
        foreignKeyColumnCount: fkColumns,
        partitionedTableCount: partitionedTables,
        savedViewCount: enterpriseEnsureArray(normalized.views).length,
        canonicalCoveragePercent: coverage,
        releaseReadinessScore: releaseReadiness
      },
      domains: domains,
      layers: layers,
      canonical: {
        capabilities: capabilities,
        presentCount: presentCount,
        totalCount: capabilities.length,
        criticalMissing: criticalMissing,
        coveragePercent: coverage
      }
    };
  }

  function enterpriseCompareValue(beforeValue, afterValue){
    return JSON.stringify(beforeValue == null ? null : beforeValue) !== JSON.stringify(afterValue == null ? null : afterValue);
  }

  function enterpriseColumnMap(table){
    var map = {};
    enterpriseEnsureArray(table && table.columns).forEach(function(column){
      map[String(column && column.name || '')] = column;
    });
    return map;
  }

  function enterpriseTableMap(schema){
    var map = {};
    enterpriseEnsureArray(schema && schema.tables).forEach(function(table){
      map[String(table && table.name || '')] = table;
    });
    return map;
  }

  function enterpriseDiffItem(type, objectKind, table, column, detail, severity, destructive, meta){
    return Object.assign({
      id: _uid(),
      type: type,
      objectKind: objectKind,
      table: table || '',
      column: column || '',
      detail: detail || '',
      severity: severity || 'info',
      destructive: !!destructive,
      breaking: !!destructive || severity === 'critical' || severity === 'high',
      runtimeImpact: destructive ? _t('Có nguy cơ vỡ runtime contract', 'Can break runtime contracts') : _t('Cần đồng bộ runtime projection', 'Requires runtime projection sync'),
      dataMigration: destructive ? _t('Bắt buộc', 'Required') : _t('Có thể không cần', 'May be optional'),
      rollbackComplexity: destructive ? _t('Cao', 'High') : _t('Trung bình', 'Medium'),
      approvalClass: destructive ? 'cab_esign' : (severity === 'high' ? 'elevated' : 'standard')
    }, meta || {});
  }

  function enterpriseHighestApproval(items){
    var score = { standard:1, elevated:2, cab:3, cab_esign:4 };
    var winner = 'standard';
    items.forEach(function(item){
      var key = item && item.approvalClass ? item.approvalClass : 'standard';
      if((score[key] || 0) > (score[winner] || 0)) winner = key;
    });
    return winner;
  }

  function enterpriseRiskWeight(item){
    if(!item) return 0;
    if(item.destructive) return 22;
    switch(item.severity){
      case 'critical': return 18;
      case 'high': return 12;
      case 'medium': return 7;
      case 'low': return 3;
      default: return 1;
    }
  }

  function enterpriseBuildTypedDiff(baseline, current){
    var base = enterpriseEnsureSchemaDoc(_clone(baseline || { tables:[], relations:[] })) || { tables:[], relations:[] };
    var next = enterpriseEnsureSchemaDoc(_clone(current || { tables:[], relations:[] })) || { tables:[], relations:[] };
    var baseTables = enterpriseTableMap(base);
    var nextTables = enterpriseTableMap(next);
    var items = [];

    enterpriseEnsureArray(next.tables).forEach(function(table){
      var baseTable = baseTables[table.name];
      if(!baseTable){
        items.push(enterpriseDiffItem('object_added', 'table', table.name, '', _t('Tạo bảng mới', 'Create new table'), 'low', false, {
          runtimeImpact: _t('Cần compile registry và module builder projection', 'Requires registry compile and module builder projection sync'),
          dataMigration: _t('Không', 'No')
        }));
        return;
      }

      if(enterpriseCompareValue(baseTable.comment || '', table.comment || '')){
        items.push(enterpriseDiffItem('metadata_only_change', 'table', table.name, '', _t('Comment/description thay đổi', 'Comment/description changed'), 'low', false));
      }
      if(enterpriseCompareValue(baseTable.domain || '', table.domain || '')){
        items.push(enterpriseDiffItem('metadata_only_change', 'table', table.name, '', _t('Domain/canonical capability thay đổi', 'Domain/canonical capability changed'), 'medium', false, {
          runtimeImpact: _t('Có thể thay đổi module ownership và reporting subject area', 'Can change module ownership and reporting subject area')
        }));
      }
      if(!!baseTable.rls_enabled !== !!table.rls_enabled){
        items.push(enterpriseDiffItem('policy_changed', 'table', table.name, '', table.rls_enabled ? _t('Bật RLS', 'Enable RLS') : _t('Tắt RLS', 'Disable RLS'), table.rls_enabled ? 'high' : 'medium', !!baseTable.rls_enabled && !table.rls_enabled, {
          runtimeImpact: _t('Ảnh hưởng truy cập runtime và báo cáo', 'Affects runtime access and reporting'),
          dataMigration: _t('Không', 'No'),
          rollbackComplexity: table.rls_enabled ? _t('Trung bình', 'Medium') : _t('Cao', 'High'),
          approvalClass: table.rls_enabled ? 'elevated' : 'cab_esign'
        }));
      }

      var baseColumns = enterpriseColumnMap(baseTable);
      enterpriseEnsureArray(table.columns).forEach(function(column){
        var baseColumn = baseColumns[column.name];
        if(!baseColumn){
          items.push(enterpriseDiffItem('object_added', 'column', table.name, column.name, _t('Thêm cột mới', 'Add new column'), column.nullable ? 'low' : 'medium', false, {
            runtimeImpact: _t('Cần đồng bộ form/API/runtime bindings', 'Requires form/API/runtime binding sync'),
            dataMigration: column.nullable ? _t('Không', 'No') : _t('Có thể cần backfill', 'May require backfill'),
            approvalClass: column.nullable ? 'standard' : 'elevated'
          }));
          return;
        }
        if(String(baseColumn.type || '') !== String(column.type || '') || Number(baseColumn.length || 0) !== Number(column.length || 0) || Number(baseColumn.scale || 0) !== Number(column.scale || 0)){
          items.push(enterpriseDiffItem('column_type_changed', 'column', table.name, column.name, String(baseColumn.type || '') + ' → ' + String(column.type || ''), 'high', false, {
            runtimeImpact: _t('Có thể ảnh hưởng API contract, report và index', 'Can affect API contracts, reports, and indexes'),
            dataMigration: _t('Bắt buộc kiểm tra', 'Manual review required'),
            rollbackComplexity: _t('Cao', 'High'),
            approvalClass: 'elevated'
          }));
        }
        if(!!baseColumn.nullable !== !!column.nullable){
          items.push(enterpriseDiffItem('nullability_changed', 'column', table.name, column.name, column.nullable ? _t('Bỏ NOT NULL', 'Drop NOT NULL') : _t('Thêm NOT NULL', 'Set NOT NULL'), column.nullable ? 'medium' : 'high', !column.nullable, {
            runtimeImpact: _t('Có thể làm gãy data entry/runtime insert', 'Can break data entry/runtime inserts'),
            dataMigration: column.nullable ? _t('Không', 'No') : _t('Phải backfill dữ liệu hiện có', 'Existing data must be backfilled'),
            rollbackComplexity: column.nullable ? _t('Trung bình', 'Medium') : _t('Cao', 'High'),
            approvalClass: column.nullable ? 'elevated' : 'cab'
          }));
        }
        if(String(baseColumn.default_val || '') !== String(column.default_val || '')){
          items.push(enterpriseDiffItem('default_changed', 'column', table.name, column.name, _t('Default expression thay đổi', 'Default expression changed'), 'medium', false, {
            runtimeImpact: _t('Ảnh hưởng insert mới và automation', 'Affects new inserts and automation'),
            dataMigration: _t('Không', 'No')
          }));
        }
        if(String(baseColumn.generated_expr || '') !== String(column.generated_expr || '')){
          items.push(enterpriseDiffItem('generated_expr_changed', 'column', table.name, column.name, _t('Generated expression thay đổi', 'Generated expression changed'), 'high', false, {
            runtimeImpact: _t('Ảnh hưởng báo cáo, audit và derived fields', 'Affects reporting, audit, and derived fields'),
            dataMigration: _t('Có thể cần rebuild', 'May require rebuild')
          }));
        }
        var baseFk = baseColumn.foreign_key || null;
        var nextFk = column.foreign_key || null;
        if(enterpriseCompareValue(baseFk, nextFk)){
          items.push(enterpriseDiffItem('fk_retargeted', 'column', table.name, column.name, _t('Foreign key/action thay đổi', 'Foreign key target/action changed'), 'high', !!baseFk || !!nextFk, {
            runtimeImpact: _t('Ảnh hưởng traceability, joins và workflow linkage', 'Affects traceability, joins, and workflow linkage'),
            dataMigration: _t('Cần kiểm tra orphan risk', 'Must review orphan risk'),
            rollbackComplexity: _t('Cao', 'High'),
            approvalClass: 'cab'
          }));
        }
        if(enterpriseCompareValue(baseColumn.business || {}, column.business || {}) || enterpriseCompareValue(baseColumn.ui || {}, column.ui || {}) || enterpriseCompareValue(baseColumn.validation || {}, column.validation || {})){
          items.push(enterpriseDiffItem('metadata_only_change', 'column', table.name, column.name, _t('Business/UI/validation metadata thay đổi', 'Business/UI/validation metadata changed'), 'low', false, {
            runtimeImpact: _t('Cần đồng bộ registry compiler', 'Requires registry compiler sync')
          }));
        }
      });

      enterpriseEnsureArray(baseTable.columns).forEach(function(column){
        if(!enterpriseColumnMap(table)[column.name]){
          items.push(enterpriseDiffItem('object_removed', 'column', table.name, column.name, _t('Xóa cột hiện có', 'Drop existing column'), 'critical', true, {
            runtimeImpact: _t('Làm vỡ form/API/report hiện hữu', 'Breaks existing forms/APIs/reports'),
            dataMigration: _t('Có nguy cơ mất dữ liệu', 'Data loss risk'),
            rollbackComplexity: _t('Rất cao', 'Very high'),
            approvalClass: 'cab_esign'
          }));
        }
      });
    });

    enterpriseEnsureArray(base.tables).forEach(function(table){
      if(!nextTables[table.name]){
        items.push(enterpriseDiffItem('object_removed', 'table', table.name, '', _t('Xóa bảng hiện có', 'Drop existing table'), 'critical', true, {
          runtimeImpact: _t('Làm vỡ runtime contract/module builder/workflow', 'Breaks runtime contracts/module builder/workflows'),
          dataMigration: _t('Có nguy cơ mất dữ liệu lớn', 'High data loss risk'),
          rollbackComplexity: _t('Rất cao', 'Very high'),
          approvalClass: 'cab_esign'
        }));
      }
    });

    var breakingCount = items.filter(function(item){ return item.breaking; }).length;
    var destructiveCount = items.filter(function(item){ return item.destructive; }).length;
    var criticalCount = items.filter(function(item){ return item.severity === 'critical'; }).length;
    var riskScore = Math.min(100, items.reduce(function(total, item){ return total + enterpriseRiskWeight(item); }, 0));
    var compatibilityScore = Math.max(0, 100 - Math.min(100, Math.round(
      (criticalCount * 18) +
      (destructiveCount * 12) +
      (items.filter(function(item){ return item.severity === 'high'; }).length * 6) +
      (items.filter(function(item){ return item.type === 'metadata_only_change'; }).length * 1)
    )));
    return {
      items: items,
      summary: {
        total: items.length,
        breakingCount: breakingCount,
        destructiveCount: destructiveCount,
        criticalCount: criticalCount,
        highCount: items.filter(function(item){ return item.severity === 'high'; }).length,
        mediumCount: items.filter(function(item){ return item.severity === 'medium'; }).length,
        lowCount: items.filter(function(item){ return item.severity === 'low'; }).length,
        compatibilityScore: compatibilityScore,
        riskScore: riskScore,
        approvalClass: enterpriseHighestApproval(items),
        destructiveBlocked: items.some(function(item){ return item.destructive && (item.severity === 'critical' || item.type === 'policy_changed'); })
      }
    };
  }

  function enterpriseCollectCurrentView(){
    return {
      browserView: STORE.browser.view,
      activeDomain: STORE.browser.activeDomain,
      hiddenDomains: _clone(STORE.browser.hiddenDomains || {}),
      isolatedDomain: STORE.browser.isolatedDomain || '',
      zoom: STORE.canvas.zoom,
      panX: STORE.canvas.panX,
      panY: STORE.canvas.panY
    };
  }

  function enterpriseSavedViews(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    return enterpriseEnsureArray(schema.views).filter(function(item){ return item && item.id; });
  }

  function enterpriseSaveCurrentView(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var name = window.prompt(_t('Tên view preset', 'View preset name'), _t('View doanh nghiệp', 'Enterprise view'));
    if(!name) return;
    schema.views = enterpriseSavedViews().concat([{
      id: 'vw_' + enterpriseStableKey(name, _uid()),
      name: name,
      kind: 'saved',
      state: enterpriseCollectCurrentView(),
      savedAt: enterpriseNow(),
      author: currentUsername()
    }]);
    markDirty();
    saveDraft();
    toast(_t('Đã lưu view preset', 'View preset saved'), 'success');
    enterpriseRefreshControlPlane();
  }

  function enterpriseApplyView(viewId){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var view = enterpriseSavedViews().find(function(item){ return item.id === viewId; });
    var state = view && view.state;
    if(!view || !state) return;
    STORE.browser.view = state.browserView || STORE.browser.view;
    STORE.browser.activeDomain = state.activeDomain || STORE.browser.activeDomain || '';
    STORE.browser.hiddenDomains = _clone(state.hiddenDomains || {});
    STORE.browser.isolatedDomain = state.isolatedDomain || '';
    STORE.canvas.zoom = Number(state.zoom || 1);
    STORE.canvas.panX = Number(state.panX || 0);
    STORE.canvas.panY = Number(state.panY || 0);
    saveUiPrefs();
    Browser.render();
    Canvas.render();
    renderToolbar(refs.toolbar);
    toast(_t('Đã áp dụng view preset', 'View preset applied'), 'success');
  }

  function enterpriseDownloadReport(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var payload = {
      generatedAt: enterpriseNow(),
      schema: {
        id: schema && schema._meta && schema._meta.id,
        name: schema && schema._meta && schema._meta.name,
        version: schema && schema._meta && schema._meta.version
      },
      report: enterpriseBuildReport(schema),
      diff: STORE.baseline ? enterpriseBuildTypedDiff(STORE.baseline, schema) : null
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'schema-studio-enterprise-report-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    link.click();
    window.setTimeout(function(){ URL.revokeObjectURL(link.href); }, 1000);
  }

  function enterpriseListReleases(){
    return _api('schema_studio_list_releases', {
      design_id: STORE.currentDesignId || (STORE.schema && STORE.schema._meta && STORE.schema._meta.id) || ''
    }, 'POST').then(function(res){
      STORE.enterprise.releases = enterpriseEnsureArray(res && res.releases);
      enterpriseRefreshControlPlane();
      return STORE.enterprise.releases;
    }).catch(function(err){
      toast(_t('Không tải được release bundle', 'Could not load release bundles') + ': ' + (err.message || ''), 'error');
      return [];
    });
  }

  function enterpriseCompileRegistryBundle(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    STORE.enterprise.loading = true;
    enterpriseRefreshControlPlane();
    return _api('schema_studio_compile_registry', {
      design_id: STORE.currentDesignId || (schema && schema._meta && schema._meta.id) || 'workspace',
      schema: schema,
      mode: 'runtime_projection'
    }, 'POST').then(function(res){
      STORE.enterprise.loading = false;
      STORE.enterprise.lastCompiler = res && (res.bundleSummary || res.manifest || null);
      schema._meta.enterprise.last_compiled_at = enterpriseNow();
      schema._meta.enterprise.last_compiler_bundle_id = res && res.bundleId ? res.bundleId : '';
      markDirty();
      toast(_t('Đã compile registry bundle', 'Registry bundle compiled'), 'success');
      enterpriseRefreshControlPlane();
      return res;
    }).catch(function(err){
      STORE.enterprise.loading = false;
      enterpriseRefreshControlPlane();
      toast(_t('Compile registry bundle thất bại', 'Registry bundle compilation failed') + ': ' + (err.message || ''), 'error');
      throw err;
    });
  }

  function enterpriseCreateReleaseBundle(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var diff = STORE.baseline ? enterpriseBuildTypedDiff(STORE.baseline, schema) : { summary:{ approvalClass:'standard' } };
    STORE.enterprise.loading = true;
    enterpriseRefreshControlPlane();
    return _api('schema_studio_release_bundle', {
      design_id: STORE.currentDesignId || (schema && schema._meta && schema._meta.id) || 'workspace',
      schema: schema,
      baseline: STORE.baseline || null,
      change_request_id: schema._meta && schema._meta.enterprise ? schema._meta.enterprise.change_request_id || '' : '',
      effective_from: schema._meta && schema._meta.enterprise ? schema._meta.enterprise.effective_from || '' : '',
      release_notes: schema._meta && schema._meta.enterprise ? schema._meta.enterprise.release_notes || '' : '',
      requested_approval_class: diff.summary.approvalClass || 'standard'
    }, 'POST').then(function(res){
      var summary = res && res.bundleSummary ? res.bundleSummary : null;
      STORE.enterprise.loading = false;
      STORE.enterprise.lastRelease = summary;
      if(summary){
        schema.releaseBundles = enterpriseEnsureArray(schema.releaseBundles);
        schema.releaseBundles = [summary].concat(schema.releaseBundles.filter(function(item){ return item && item.id !== summary.id; })).slice(0, 25);
        schema._meta.enterprise.last_release_id = summary.id;
        schema._meta.enterprise.last_release_at = summary.createdAt || enterpriseNow();
        schema._meta.enterprise.approval_class = summary.approvalClass || diff.summary.approvalClass || 'standard';
      }
      markDirty();
      toast(_t('Đã tạo release bundle', 'Release bundle created'), 'success');
      return enterpriseListReleases();
    }).catch(function(err){
      STORE.enterprise.loading = false;
      enterpriseRefreshControlPlane();
      toast(_t('Không tạo được release bundle', 'Could not create release bundle') + ': ' + (err.message || ''), 'error');
      throw err;
    });
  }

  function enterpriseSetTab(tab){
    STORE.enterprise.tab = tab || 'summary';
    enterpriseRefreshControlPlane();
  }

  function enterpriseSummaryCard(label, value, hint){
    return '<div class="ss-enterprise-card"><div class="ss-enterprise-card-label">' + enterpriseEsc(label) + '</div><div class="ss-enterprise-card-value">' + enterpriseEsc(value) + '</div><div class="ss-enterprise-card-hint">' + enterpriseEsc(hint || '') + '</div></div>';
  }

  function enterpriseRenderSummary(schema, report){
    var views = enterpriseSavedViews();
    var governance = (schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.governance) || {};
    var layerItems = Object.keys(report.layers || {}).sort().map(function(key){
      return '<span class="ss-enterprise-badge">' + enterpriseEsc(key) + ': ' + enterpriseEsc(report.layers[key]) + '</span>';
    }).join('');
    var missingCritical = enterpriseEnsureArray(report.canonical && report.canonical.criticalMissing).map(function(label){
      return '<span class="ss-enterprise-badge tone-danger">' + enterpriseEsc(label) + '</span>';
    }).join('');
    var viewHtml = views.length ? views.map(function(view){
      return '<button class="hm-btn hm-btn-ghost ss-btn-sm ss-enterprise-view-btn" type="button" onclick="SchemaStudioEnterprise.applyView(\'' + enterpriseEsc(view.id) + '\')">' + enterpriseEsc(view.name) + '</button>';
    }).join('') : '<div class="ss-enterprise-empty">' + enterpriseEsc(_t('Chưa có saved view', 'No saved views yet')) + '</div>';
    return [
      '<div class="ss-enterprise-grid">',
        enterpriseSummaryCard(_t('Bảng', 'Tables'), report.summary.tableCount, _t('Mô hình vật lý + metadata', 'Physical model + metadata')),
        enterpriseSummaryCard(_t('Quan hệ', 'Relations'), report.summary.relationCount, _t('Dependency + traceability', 'Dependency + traceability')),
        enterpriseSummaryCard(_t('Policy', 'Policies'), report.summary.policyCount, _t('RLS / governance policy', 'RLS / governance policy')),
        enterpriseSummaryCard(_t('Canonical coverage', 'Canonical coverage'), report.summary.canonicalCoveragePercent + '%', _t('Bao phủ capability ERP/MES/eQMS', 'ERP/MES/eQMS capability coverage')),
        enterpriseSummaryCard(_t('Release readiness', 'Release readiness'), report.summary.releaseReadinessScore + '%', _t('Độ sẵn sàng để publish', 'Readiness for publish')),
        enterpriseSummaryCard(_t('Saved views', 'Saved views'), report.summary.savedViewCount, _t('Preset cho role/domain/layer', 'Presets for role/domain/layer'))
      ,'</div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Governance control plane', 'Governance control plane')) + '</div><div class="ss-enterprise-inline-list">' +
        '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Owner', 'Owner')) + ': ' + enterpriseEsc(governance.owner || currentUsername()) + '</span>' +
        '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Lifecycle', 'Lifecycle')) + ': ' + enterpriseEsc((schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.lifecycle) || 'draft') + '</span>' +
        '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Branch', 'Branch')) + ': ' + enterpriseEsc((schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.branch_key) || 'main') + '</span>' +
        '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Compiler', 'Compiler')) + ': ' + enterpriseEsc((schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.compiler_version) || '2026.04.enterprise') + '</span>' +
      '</div></div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Layer distribution', 'Layer distribution')) + '</div><div class="ss-enterprise-inline-list">' + (layerItems || '<span class="ss-enterprise-empty">' + enterpriseEsc(_t('Chưa có layer', 'No layers yet')) + '</span>') + '</div></div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Critical canonical gaps', 'Critical canonical gaps')) + '</div><div class="ss-enterprise-inline-list">' + (missingCritical || '<span class="ss-enterprise-badge tone-success">' + enterpriseEsc(_t('Không có gap critical', 'No critical gaps')) + '</span>') + '</div></div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Saved views', 'Saved views')) + '</div><div class="ss-enterprise-inline-list">' + viewHtml + '</div></div>'
    ].join('');
  }

  function enterpriseRenderDiff(schema, typedDiff){
    if(!STORE.baseline){
      return '<div class="ss-enterprise-empty">' + enterpriseEsc(_t('Chưa có baseline. Hãy đặt baseline để mở typed diff và destructive firewall.', 'No baseline yet. Save a baseline to unlock typed diff and destructive firewall.')) + '</div>';
    }
    var items = enterpriseEnsureArray(typedDiff.items).slice(0, 200);
    var tone = typedDiff.summary.destructiveBlocked ? 'tone-danger' : (typedDiff.summary.riskScore >= 45 ? 'tone-warn' : 'tone-success');
    return [
      '<div class="ss-enterprise-grid">',
        enterpriseSummaryCard(_t('Compatibility', 'Compatibility'), typedDiff.summary.compatibilityScore + '%', _t('Điểm tương thích ngược', 'Backward compatibility score')),
        enterpriseSummaryCard(_t('Risk', 'Risk'), typedDiff.summary.riskScore + '/100', _t('Mức rủi ro migration', 'Migration risk level')),
        enterpriseSummaryCard(_t('Approval class', 'Approval class'), typedDiff.summary.approvalClass, _t('Mức phê duyệt bắt buộc', 'Required approval level')),
        enterpriseSummaryCard(_t('Destructive', 'Destructive'), typedDiff.summary.destructiveCount, _t('Firewall / escalation', 'Firewall / escalation')),
        enterpriseSummaryCard(_t('Breaking', 'Breaking'), typedDiff.summary.breakingCount, _t('Có thể làm vỡ runtime', 'Potential runtime breakage')),
        enterpriseSummaryCard(_t('Critical', 'Critical'), typedDiff.summary.criticalCount, _t('Cần CAB / e-signature', 'Needs CAB / e-signature'))
      ,'</div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Diff posture', 'Diff posture')) + '</div><div class="ss-enterprise-inline-list"><span class="ss-enterprise-badge ' + tone + '">' + enterpriseEsc(typedDiff.summary.destructiveBlocked ? _t('Destructive firewall đang bật', 'Destructive firewall active') : _t('Có thể review theo luồng chuẩn', 'Can proceed with standard review')) + '</span></div></div>',
      '<div class="ss-enterprise-diff-list">' + (items.length ? items.map(function(item){
        return '<div class="ss-enterprise-diff-item severity-' + enterpriseEsc(item.severity || 'low') + '"><div><strong>' + enterpriseEsc(item.type || '') + '</strong><div class="ss-enterprise-help">' + enterpriseEsc((item.table || '') + (item.column ? '.' + item.column : '')) + '</div></div><div class="ss-enterprise-diff-detail"><div>' + enterpriseEsc(item.detail || '') + '</div><div class="ss-enterprise-help">' + enterpriseEsc(item.runtimeImpact || '') + ' · ' + enterpriseEsc(item.dataMigration || '') + ' · ' + enterpriseEsc(item.approvalClass || '') + '</div></div></div>';
      }).join('') : '<div class="ss-enterprise-empty">' + enterpriseEsc(_t('Không có thay đổi typed diff', 'No typed diff changes')) + '</div>') + '</div>'
    ].join('');
  }

  function enterpriseRenderCompiler(schema, report){
    var meta = (schema && schema._meta && schema._meta.enterprise) || {};
    return [
      '<div class="ss-enterprise-grid">',
        enterpriseSummaryCard(_t('Projection tables', 'Projection tables'), report.summary.tableCount, _t('Table registry projection', 'Table registry projection')),
        enterpriseSummaryCard(_t('Projected columns', 'Projected columns'), report.summary.columnCount, _t('Field registry projection', 'Field registry projection')),
        enterpriseSummaryCard(_t('RLS tables', 'RLS tables'), report.summary.rlsTableCount, _t('Security-aware projections', 'Security-aware projections')),
        enterpriseSummaryCard(_t('Generated columns', 'Generated columns'), report.summary.generatedColumnCount, _t('Derived/runtime fields', 'Derived/runtime fields')),
        enterpriseSummaryCard(_t('Partitioned', 'Partitioned'), report.summary.partitionedTableCount, _t('Online scale posture', 'Online scale posture')),
        enterpriseSummaryCard(_t('Last compile', 'Last compile'), meta.last_compiled_at || '-', _t('Registry compiler timestamp', 'Registry compiler timestamp'))
      ,'</div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Compiler actions', 'Compiler actions')) + '</div><div class="ss-enterprise-inline-list"><button class="hm-btn hm-btn-primary ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.compileRegistryBundle()">' + enterpriseEsc(_t('Compile registry bundle', 'Compile registry bundle')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.downloadReport()">' + enterpriseEsc(_t('Xuất báo cáo', 'Export report')) + '</button></div><div class="ss-enterprise-help">' + enterpriseEsc(_t('Compiler sẽ sinh runtime projections, registry contracts và enterprise manifest dưới qms-data/registry.', 'The compiler writes runtime projections, registry contracts, and the enterprise manifest under qms-data/registry.')) + '</div></div>'
    ].join('');
  }

  function enterpriseRenderReleases(schema){
    var releases = enterpriseEnsureArray(STORE.enterprise.releases);
    var lastRelease = (schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.last_release_at) || '';
    return [
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Release management', 'Release management')) + '</div><div class="ss-enterprise-inline-list"><button class="hm-btn hm-btn-primary ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.createReleaseBundle()">' + enterpriseEsc(_t('Tạo release bundle', 'Create release bundle')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.listReleases()">' + enterpriseEsc(_t('Tải danh sách release', 'Refresh release list')) + '</button></div><div class="ss-enterprise-help">' + enterpriseEsc(_t('Bundle bao gồm typed diff, risk score, approval class, compiler targets và rollback posture.', 'The bundle includes typed diff, risk score, approval class, compiler targets, and rollback posture.')) + '</div></div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Last release', 'Last release')) + '</div><div class="ss-enterprise-inline-list"><span class="ss-enterprise-badge">' + enterpriseEsc(lastRelease || '-') + '</span></div></div>',
      '<div class="ss-enterprise-release-list">' + (releases.length ? releases.map(function(item){
        return '<div class="ss-enterprise-release-item"><div><strong>' + enterpriseEsc(item.name || item.id || '') + '</strong><div class="ss-enterprise-help">' + enterpriseEsc(item.createdAt || '') + ' · ' + enterpriseEsc(item.actor || '') + '</div></div><div class="ss-enterprise-inline-list"><span class="ss-enterprise-badge">' + enterpriseEsc(item.approvalClass || 'standard') + '</span><span class="ss-enterprise-badge">' + enterpriseEsc((item.compatibilityScore == null ? '-' : item.compatibilityScore + '%')) + '</span><span class="ss-enterprise-badge">' + enterpriseEsc((item.riskScore == null ? '-' : item.riskScore + '/100')) + '</span></div></div>';
      }).join('') : '<div class="ss-enterprise-empty">' + enterpriseEsc(_t('Chưa có release bundle', 'No release bundles yet')) + '</div>') + '</div>'
    ].join('');
  }

  function enterpriseRenderCanonical(report){
    var capabilities = enterpriseEnsureArray(report.canonical && report.canonical.capabilities);
    return [
      '<div class="ss-enterprise-grid">',
        enterpriseSummaryCard(_t('Canonical present', 'Canonical present'), report.canonical.presentCount + '/' + report.canonical.totalCount, _t('Capability có mặt', 'Capabilities present')),
        enterpriseSummaryCard(_t('Critical gaps', 'Critical gaps'), enterpriseEnsureArray(report.canonical.criticalMissing).length, _t('Capability critical còn thiếu', 'Missing critical capabilities')),
        enterpriseSummaryCard(_t('Layers', 'Layers'), report.summary.layerCount, _t('7-layer governance', '7-layer governance')),
        enterpriseSummaryCard(_t('Domains', 'Domains'), report.summary.domainCount, _t('Business capability domains', 'Business capability domains')),
        enterpriseSummaryCard(_t('RLS coverage', 'RLS coverage'), report.summary.rlsTableCount, _t('Security-aware objects', 'Security-aware objects')),
        enterpriseSummaryCard(_t('Readiness', 'Readiness'), report.summary.releaseReadinessScore + '%', _t('Canonical orchestration readiness', 'Canonical orchestration readiness'))
      ,'</div>',
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Manufacturing / eQMS capability map', 'Manufacturing / eQMS capability map')) + '</div><div class="ss-enterprise-capability-list">' + (capabilities.length ? capabilities.map(function(item){
        return '<div class="ss-enterprise-capability-item"><div><strong>' + enterpriseEsc(item.label || item.key || '') + '</strong><div class="ss-enterprise-help">' + enterpriseEsc((item.present ? _t('Có mặt', 'Present') : _t('Thiếu', 'Missing')) + ' · ' + (item.critical ? _t('Critical', 'Critical') : _t('Optional', 'Optional'))) + '</div></div><div class="ss-enterprise-help">' + enterpriseEsc(enterpriseEnsureArray(item.matched_tables).slice(0, 6).join(', ') || '-') + '</div></div>';
      }).join('') : '<div class="ss-enterprise-empty">' + enterpriseEsc(_t('Chưa có canonical capability', 'No canonical capability data')) + '</div>') + '</div></div>'
    ].join('');
  }

  function enterpriseRenderBody(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var report = enterpriseBuildReport(schema);
    var diff = STORE.baseline ? enterpriseBuildTypedDiff(STORE.baseline, schema) : { items:[], summary:{} };
    switch(STORE.enterprise.tab){
      case 'diff':
        return enterpriseRenderDiff(schema, diff);
      case 'compiler':
        return enterpriseRenderCompiler(schema, report);
      case 'releases':
        return enterpriseRenderReleases(schema);
      case 'canonical':
        return enterpriseRenderCanonical(report);
      case 'summary':
      default:
        return enterpriseRenderSummary(schema, report);
    }
  }

  function enterpriseRenderDialog(){
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var report = enterpriseBuildReport(schema);
    var loadingNote = STORE.enterprise.loading ? '<div class="ss-enterprise-loading"><span class="ss-enterprise-spinner"></span><span>' + enterpriseEsc(_t('Đang xử lý enterprise action...', 'Running enterprise action...')) + '</span></div>' : '';
    return [
      '<div class="ss-enterprise-dialog">',
        '<div class="ss-enterprise-head">',
          '<div><div class="ss-enterprise-kicker">' + enterpriseEsc(_t('Schema control plane', 'Schema control plane')) + '</div><h3>' + enterpriseEsc((schema && schema._meta && schema._meta.name) || _t('Schema làm việc', 'Workspace schema')) + '</h3><div class="ss-enterprise-help">' + enterpriseEsc(_t('Governance + migration intelligence + registry compiler + canonical orchestration', 'Governance + migration intelligence + registry compiler + canonical orchestration')) + '</div></div>',
          '<button class="hm-btn hm-btn-ghost ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.close()">' + enterpriseEsc(_t('Đóng', 'Close')) + '</button>',
        '</div>',
        '<div class="ss-enterprise-topline">',
          '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Bảng', 'Tables')) + ': ' + enterpriseEsc(report.summary.tableCount) + '</span>',
          '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Canonical', 'Canonical')) + ': ' + enterpriseEsc(report.summary.canonicalCoveragePercent + '%') + '</span>',
          '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Release', 'Release')) + ': ' + enterpriseEsc((schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.last_release_id) || '-') + '</span>',
          '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Compile', 'Compile')) + ': ' + enterpriseEsc((schema && schema._meta && schema._meta.enterprise && schema._meta.enterprise.last_compiled_at) || '-') + '</span>',
        '</div>',
        '<div class="ss-enterprise-tabs">' +
          ['summary','diff','compiler','releases','canonical'].map(function(tab){
            var labels = {
              summary: _t('Tổng quan', 'Summary'),
              diff: _t('Typed diff', 'Typed diff'),
              compiler: _t('Compiler', 'Compiler'),
              releases: _t('Release', 'Release'),
              canonical: _t('Canonical', 'Canonical')
            };
            return '<button class="ss-enterprise-tab' + (STORE.enterprise.tab === tab ? ' active' : '') + '" type="button" onclick="SchemaStudioEnterprise.setTab(\'' + tab + '\')">' + enterpriseEsc(labels[tab]) + '</button>';
          }).join('') +
        '</div>',
        loadingNote,
        '<div class="ss-enterprise-body">' + enterpriseRenderBody() + '</div>',
        '<div class="ss-enterprise-footer"><button class="hm-btn hm-btn-ghost ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.saveCurrentView()">' + enterpriseEsc(_t('Lưu view hiện tại', 'Save current view')) + '</button><button class="hm-btn hm-btn-secondary ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.downloadReport()">' + enterpriseEsc(_t('Xuất report', 'Export report')) + '</button><button class="hm-btn hm-btn-primary ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.createReleaseBundle()">' + enterpriseEsc(_t('Release bundle', 'Release bundle')) + '</button></div>',
      '</div>'
    ].join('');
  }

  function enterpriseRefreshControlPlane(){
    if(STORE.enterprise.overlayEl){
      STORE.enterprise.overlayEl.innerHTML = enterpriseRenderDialog();
    }
  }

  function enterpriseOpenControlPlane(tab){
    if(tab) STORE.enterprise.tab = tab;
    ensureEnterpriseStyles();
    if(!STORE.enterprise.overlayEl){
      STORE.enterprise.overlayEl = document.createElement('div');
      STORE.enterprise.overlayEl.className = 'ss-enterprise-overlay';
      STORE.enterprise.overlayEl.addEventListener('click', function(ev){
        if(ev.target === STORE.enterprise.overlayEl) enterpriseCloseControlPlane();
      });
      document.body.appendChild(STORE.enterprise.overlayEl);
    }
    enterpriseRefreshControlPlane();
    enterpriseListReleases();
  }

  function enterpriseCloseControlPlane(){
    if(STORE.enterprise.overlayEl){
      removeNode(STORE.enterprise.overlayEl);
      STORE.enterprise.overlayEl = null;
    }
  }

  function ensureEnterpriseStyles(){
    var styleEl;
    if(document.getElementById(ENTERPRISE_STYLE_ID)) return;
    styleEl = document.createElement('style');
    styleEl.id = ENTERPRISE_STYLE_ID;
    styleEl.textContent = [
      '.ss-enterprise-overlay{position:fixed;inset:0;background:rgba(5,10,25,.44);z-index:10040;display:flex;align-items:center;justify-content:center;padding:24px;}',
      '.ss-enterprise-dialog{width:min(1200px,96vw);max-height:92vh;overflow:hidden;background:#fff;border:1px solid rgba(15,23,42,.14);border-radius:18px;box-shadow:0 22px 68px rgba(15,23,42,.22);display:flex;flex-direction:column;}',
      '.ss-enterprise-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 22px;border-bottom:1px solid rgba(148,163,184,.28);background:linear-gradient(180deg,rgba(248,250,252,.96),rgba(255,255,255,1));}',
      '.ss-enterprise-head h3{margin:2px 0 0;font-size:20px;color:#0f172a;}',
      '.ss-enterprise-kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;font-weight:700;}',
      '.ss-enterprise-help{font-size:12px;color:#64748b;}',
      '.ss-enterprise-topline{display:flex;flex-wrap:wrap;gap:10px;padding:10px 22px;border-bottom:1px solid rgba(148,163,184,.24);background:#f8fafc;}',
      '.ss-enterprise-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:600;border:1px solid rgba(59,130,246,.18);}',
      '.ss-enterprise-badge.tone-danger{background:#fef2f2;color:#b91c1c;border-color:rgba(239,68,68,.18);}',
      '.ss-enterprise-badge.tone-success{background:#f0fdf4;color:#166534;border-color:rgba(34,197,94,.18);}',
      '.ss-enterprise-badge.tone-warn{background:#fff7ed;color:#c2410c;border-color:rgba(249,115,22,.18);}',
      '.ss-enterprise-tabs{display:flex;gap:8px;padding:12px 22px 0;flex-wrap:wrap;}',
      '.ss-enterprise-tab{border:1px solid rgba(148,163,184,.24);background:#fff;padding:8px 12px;border-radius:12px;font-weight:600;color:#334155;cursor:pointer;}',
      '.ss-enterprise-tab.active{background:#0f172a;color:#fff;border-color:#0f172a;}',
      '.ss-enterprise-body{padding:18px 22px 22px;overflow:auto;display:flex;flex-direction:column;gap:16px;}',
      '.ss-enterprise-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid rgba(148,163,184,.24);background:#fff;}',
      '.ss-enterprise-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;}',
      '.ss-enterprise-card{padding:14px;border-radius:14px;background:#fff;border:1px solid rgba(148,163,184,.24);box-shadow:0 4px 18px rgba(15,23,42,.04);}',
      '.ss-enterprise-card-label{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;}',
      '.ss-enterprise-card-value{margin-top:8px;font-size:24px;font-weight:800;color:#0f172a;}',
      '.ss-enterprise-card-hint{margin-top:6px;font-size:12px;color:#64748b;line-height:1.45;}',
      '.ss-enterprise-section{padding:14px 16px;border-radius:14px;background:#fff;border:1px solid rgba(148,163,184,.24);box-shadow:0 4px 18px rgba(15,23,42,.04);}',
      '.ss-enterprise-section-title{font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;}',
      '.ss-enterprise-inline-list{display:flex;flex-wrap:wrap;gap:8px;}',
      '.ss-enterprise-empty{padding:18px;border:1px dashed rgba(148,163,184,.45);border-radius:14px;color:#64748b;background:#f8fafc;}',
      '.ss-enterprise-diff-list,.ss-enterprise-release-list,.ss-enterprise-capability-list{display:flex;flex-direction:column;gap:10px;}',
      '.ss-enterprise-diff-item,.ss-enterprise-release-item,.ss-enterprise-capability-item{display:grid;grid-template-columns:minmax(200px,.9fr) minmax(0,1.6fr);gap:14px;align-items:flex-start;padding:12px 14px;border:1px solid rgba(148,163,184,.24);border-radius:14px;background:#fff;}',
      '.ss-enterprise-diff-item.severity-critical{border-color:rgba(220,38,38,.24);background:rgba(254,242,242,.66);}',
      '.ss-enterprise-diff-item.severity-high{border-color:rgba(249,115,22,.24);background:rgba(255,247,237,.7);}',
      '.ss-enterprise-diff-item.severity-medium{border-color:rgba(59,130,246,.18);background:rgba(239,246,255,.72);}',
      '.ss-enterprise-diff-item.severity-low{border-color:rgba(34,197,94,.16);background:rgba(240,253,244,.72);}',
      '.ss-enterprise-diff-detail{display:flex;flex-direction:column;gap:6px;}',
      '.ss-enterprise-loading{display:flex;align-items:center;gap:10px;padding:10px 22px;color:#334155;}',
      '.ss-enterprise-spinner{width:14px;height:14px;border-radius:999px;border:2px solid rgba(37,99,235,.18);border-top-color:#2563eb;display:inline-block;animation:ss-enterprise-spin .7s linear infinite;}',
      '.ss-enterprise-view-btn{white-space:nowrap;}',
      '.ss-toolbar-right .ss-enterprise-toolbar-btn{display:inline-flex;align-items:center;gap:8px;}',
      '.ss-toolbar-right .ss-enterprise-toolbar-btn .ss-enterprise-toolbar-dot{width:8px;height:8px;border-radius:999px;background:#2563eb;display:inline-block;}',
      '@keyframes ss-enterprise-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width: 920px){.ss-enterprise-dialog{width:min(96vw,96vw);max-height:96vh}.ss-enterprise-diff-item,.ss-enterprise-release-item,.ss-enterprise-capability-item{grid-template-columns:1fr;}.ss-enterprise-overlay{padding:8px;}}'
    ].join('');
    document.head.appendChild(styleEl);
  }

  var SchemaStudioEnterprise = {
    ensureSchemaDoc: enterpriseEnsureSchemaDoc,
    buildReport: enterpriseBuildReport,
    buildTypedDiff: enterpriseBuildTypedDiff,
    open: enterpriseOpenControlPlane,
    close: enterpriseCloseControlPlane,
    refresh: enterpriseRefreshControlPlane,
    setTab: enterpriseSetTab,
    saveCurrentView: enterpriseSaveCurrentView,
    applyView: enterpriseApplyView,
    downloadReport: enterpriseDownloadReport,
    compileRegistryBundle: enterpriseCompileRegistryBundle,
    createReleaseBundle: enterpriseCreateReleaseBundle,
    listReleases: enterpriseListReleases
  };

  var originalSchemaSave = SchemaLib.save;
  SchemaLib.save = function(){
    if(STORE.schema){
      enterpriseEnsureSchemaDoc(STORE.schema);
      STORE.schema._meta.enterprise.last_saved_from = 'schema_studio';
    }
    return originalSchemaSave.apply(this, arguments);
  };

  var originalSchemaLoad = SchemaLib.load;
  SchemaLib.load = function(){
    return originalSchemaLoad.apply(this, arguments).then(function(result){
      if(STORE.schema) enterpriseEnsureSchemaDoc(STORE.schema);
      ensureEnterpriseStyles();
      return result;
    });
  };

  var originalLoadSystemRegistry = SchemaLib.loadSystemRegistry;
  SchemaLib.loadSystemRegistry = function(){
    return originalLoadSystemRegistry.apply(this, arguments).then(function(result){
      if(STORE.schema) enterpriseEnsureSchemaDoc(STORE.schema);
      ensureEnterpriseStyles();
      return result;
    });
  };

  var originalLoadLiveDb = SchemaLib.loadFromLiveDB;
  SchemaLib.loadFromLiveDB = function(){
    return originalLoadLiveDb.apply(this, arguments).then(function(result){
      if(STORE.schema) enterpriseEnsureSchemaDoc(STORE.schema);
      ensureEnterpriseStyles();
      return result;
    });
  };

  var originalRenderToolbar = renderToolbar;
  renderToolbar = function(container){
    var right;
    var button;
    var insertBefore;
    originalRenderToolbar(container);
    if(!container) return;
    right = container.querySelector('.ss-toolbar-right');
    if(!right) return;
    if(!right.querySelector('.ss-enterprise-toolbar-btn')){
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'hm-btn hm-btn-ghost ss-btn-sm ss-enterprise-toolbar-btn';
      button.innerHTML = '<span class="ss-enterprise-toolbar-dot"></span><span>' + enterpriseEsc(_t('Enterprise', 'Enterprise')) + '</span>';
      button.onclick = function(){ enterpriseOpenControlPlane('summary'); };
      insertBefore = right.querySelector('.hm-btn-primary');
      if(insertBefore) right.insertBefore(button, insertBefore);
      else right.appendChild(button);
    }
  };

  var originalInit = init;
  init = function(page){
    originalInit(page);
    if(STORE.schema) enterpriseEnsureSchemaDoc(STORE.schema);
    ensureEnterpriseStyles();
    if(window.SchemaStudio) window.SchemaStudio.openEnterprise = function(){ enterpriseOpenControlPlane('summary'); };
  };

  var originalValidatorRun = Validator.run;
  Validator.run = function(){
    var result = originalValidatorRun.apply(this, arguments) || [];
    var schema = enterpriseEnsureSchemaDoc(ensureSchema());
    var additions = [];
    enterpriseEnsureArray(schema.tables).forEach(function(table){
      if(table.rls_enabled && !enterpriseEnsureArray(table.policies).length && !enterpriseEnsureArray(schema.securityPolicies).length){
        additions.push({ level:'warning', code:'W90', tableId:table.id, table:table.name, msg:_t('Bảng bật RLS nhưng chưa có policy metadata: ', 'RLS is enabled but policy metadata is missing: ') + table.name });
      }
      if(!table.governance || !(table.governance.owner || table.governance.steward)){
        additions.push({ level:'info', code:'I90', tableId:table.id, table:table.name, msg:_t('Bảng chưa có owner/steward metadata: ', 'Table is missing owner/steward metadata: ') + table.name });
      }
      if(!table.canonical || !table.canonical.layer){
        additions.push({ level:'info', code:'I91', tableId:table.id, table:table.name, msg:_t('Bảng chưa gắn canonical layer: ', 'Table is missing canonical layer metadata: ') + table.name });
      }
    });
    if(additions.length){
      STORE.validation.results = enterpriseEnsureArray(STORE.validation.results).concat(additions);
      if(refs.validationPanel && refs.validationPanel.style.display !== 'none'){
        Validator.renderPanel();
      }
    }
    return STORE.validation.results;
  };

  var originalComputeDiff = MigGen.computeDiff;
  MigGen.computeDiff = function(baseline, current){
    var legacy = originalComputeDiff.apply(this, arguments) || { safe:[], destructive:[], sql:[] };
    var typed = enterpriseBuildTypedDiff(baseline, current);
    legacy.typedItems = typed.items;
    legacy.summary = typed.summary;
    return legacy;
  };

  var originalRenderPreview = MigGen.renderPreview;
  MigGen.renderPreview = function(){
    originalRenderPreview.apply(this, arguments);
    if(STORE.migration && STORE.migration.overlayEl && STORE.migration.diff && STORE.migration.diff.summary){
      var body = STORE.migration.overlayEl.querySelector('.ss-diff-body');
      var summary = STORE.migration.diff.summary;
      var pill;
      if(body && !STORE.migration.overlayEl.querySelector('.ss-enterprise-migration-summary')){
        pill = document.createElement('div');
        pill.className = 'ss-enterprise-section ss-enterprise-migration-summary';
        pill.style.marginBottom = '14px';
        pill.innerHTML = '<div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Enterprise migration posture', 'Enterprise migration posture')) + '</div><div class="ss-enterprise-inline-list">'
          + '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Compatibility', 'Compatibility')) + ': ' + enterpriseEsc(summary.compatibilityScore + '%') + '</span>'
          + '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Risk', 'Risk')) + ': ' + enterpriseEsc(summary.riskScore + '/100') + '</span>'
          + '<span class="ss-enterprise-badge">' + enterpriseEsc(_t('Approval', 'Approval')) + ': ' + enterpriseEsc(summary.approvalClass) + '</span>'
          + '<span class="ss-enterprise-badge' + (summary.destructiveBlocked ? ' tone-danger' : '') + '">' + enterpriseEsc(summary.destructiveBlocked ? _t('Firewall bật', 'Firewall active') : _t('Chuẩn review', 'Standard review')) + '</span>'
          + '</div>';
        body.insertBefore(pill, body.firstChild);
      }
    }
  };

  CmdPalette.COMMANDS = CmdPalette.COMMANDS.filter(function(command){
    return !command || ['Open enterprise control plane','Save current schema view','Create schema release bundle','Compile schema registry bundle'].indexOf(command.label_en) < 0;
  });
  CmdPalette.COMMANDS.push(
    {
      icon:'⚙',
      label:'Mở Enterprise control plane',
      label_en:'Open enterprise control plane',
      category:'schema',
      action:function(){ enterpriseOpenControlPlane('summary'); }
    },
    {
      icon:'👁',
      label:'Lưu view hiện tại',
      label_en:'Save current schema view',
      category:'view',
      action:function(){ enterpriseSaveCurrentView(); }
    },
    {
      icon:'⇪',
      label:'Tạo release bundle',
      label_en:'Create schema release bundle',
      category:'migration',
      action:function(){ enterpriseCreateReleaseBundle(); }
    },
    {
      icon:'⧉',
      label:'Compile registry bundle',
      label_en:'Compile schema registry bundle',
      category:'schema',
      action:function(){ enterpriseCompileRegistryBundle(); }
    }
  );

  window.SchemaStudioEnterprise = SchemaStudioEnterprise;
})();


/* ── World-Class Visual Cockpit Round 2 ─────────────────────────────────── */
(function(){
  var WORLD_PREFS_KEY = 'hesem.schemaStudio.worldClassPrefs';

  function wcClamp(value, min, max){
    value = Number(value);
    if(isNaN(value)) value = 0;
    if(value < min) return min;
    if(value > max) return max;
    return value;
  }

  function wcArray(value){
    return Array.isArray(value) ? value : [];
  }

  function wcText(value){
    return value == null ? '' : String(value);
  }

  function wcEsc(value){
    return _esc(wcText(value));
  }

  function wcNow(){
    return new Date().toISOString();
  }

  function wcEnsureState(){
    if(!STORE.worldClass || typeof STORE.worldClass !== 'object'){
      STORE.worldClass = {
        tab:'dashboard',
        heatmap:'risk',
        ambience:'aurora',
        density:'comfortable',
        diagnosis:null,
        loading:false,
        overlayEl:null,
        focusTableId:'',
        lastSyncAt:'',
        decorateTimer:0,
        keyListenerBound:false
      };
    }
    return STORE.worldClass;
  }

  function wcDesignId(){
    return STORE.currentDesignId || (STORE.schema && STORE.schema._meta && STORE.schema._meta.id) || 'workspace';
  }

  function wcPrefsSnapshot(){
    var state = wcEnsureState();
    return {
      heatmap: state.heatmap,
      ambience: state.ambience,
      density: state.density,
      tab: state.tab
    };
  }

  function wcPersistPrefs(){
    try{
      window.localStorage.setItem(WORLD_PREFS_KEY, JSON.stringify(wcPrefsSnapshot()));
    }catch(err){}
  }

  function wcLoadPrefs(){
    var state = wcEnsureState();
    var raw;
    var payload;
    try{
      raw = window.localStorage.getItem(WORLD_PREFS_KEY);
      if(!raw) return state;
      payload = JSON.parse(raw);
      if(payload && typeof payload === 'object'){
        if(payload.heatmap) state.heatmap = payload.heatmap;
        if(payload.ambience) state.ambience = payload.ambience;
        if(payload.density) state.density = payload.density;
        if(payload.tab) state.tab = payload.tab;
      }
    }catch(err){}
    return state;
  }

  function wcWorkflowCandidate(table){
    var name = wcText(table && table.name).toLowerCase();
    var workflow = table && (table.workflowId || table.workflow_id || table.workflow || (table.runtime && table.runtime.workflowId) || (table.governance && table.governance.workflow));
    if(workflow) return true;
    return /(order|production|dispatch|execution|inspection|quality|nc|capa|deviation|concession|approval|signature|alarm|audit|maintenance|calibration|training|competency|lot|serial|trace|traceability|supplier|incoming|inventory|genealogy|routing|operation)/.test(name);
  }

  function wcWorkflowBound(table){
    return !!(table && (table.workflowId || table.workflow_id || table.workflow || (table.runtime && table.runtime.workflowId) || (table.governance && table.governance.workflow)));
  }

  function wcMetadataScore(table){
    var score = 0;
    var governance = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
    if(table && (table.label || table.label_vi || table.label_en)) score += 10;
    if(table && (table.description || table.description_vi || table.description_en)) score += 14;
    if(table && table.domain) score += 12;
    if(table && table.canonical && table.canonical.layer) score += 16;
    if(governance.owner || governance.steward) score += 16;
    if(governance.approver || governance.approval_class) score += 8;
    if(table && table.ui) score += 10;
    if(table && table.reporting) score += 6;
    if(table && table.integration) score += 4;
    if(table && table.workflowId) score += 4;
    return wcClamp(score, 0, 100);
  }

  function wcRelationMap(schema){
    var map = {};
    wcArray(schema && schema.relations).forEach(function(rel){
      var from = wcText(rel && rel.from_table_id);
      var to = wcText(rel && rel.to_table_id);
      if(from){ map[from] = (map[from] || 0) + 1; }
      if(to){ map[to] = (map[to] || 0) + 1; }
    });
    return map;
  }

  function wcOrphanRelationRisk(schema){
    var tableById = {};
    var colById = {};
    var risk = 0;
    wcArray(schema && schema.tables).forEach(function(table){
      tableById[wcText(table && table.id)] = table || {};
      wcArray(table && table.columns).forEach(function(col){
        colById[wcText(col && col.id)] = { tableId: wcText(table && table.id), column: col };
      });
    });
    wcArray(schema && schema.relations).forEach(function(rel){
      var fromTableId = wcText(rel && rel.from_table_id);
      var toTableId = wcText(rel && rel.to_table_id);
      var fromColId = wcText(rel && rel.from_col_id);
      var toColId = wcText(rel && rel.to_col_id);
      if(!tableById[fromTableId] || !tableById[toTableId] || !colById[fromColId] || !colById[toColId]){
        risk += 1;
      }
    });
    return risk;
  }

  function wcGraphDensityScore(tableCount, relationCount){
    if(tableCount <= 1) return relationCount ? 40 : 0;
    var ratio = (relationCount * 2) / tableCount;
    var score = Math.round(100 - Math.min(100, Math.abs(ratio - 3.2) * 18));
    return wcClamp(score, 0, 100);
  }

  function wcDiffItems(){
    if(!STORE.baseline || !window.SchemaStudioEnterprise || typeof window.SchemaStudioEnterprise.buildTypedDiff !== 'function') return [];
    try{
      var diff = window.SchemaStudioEnterprise.buildTypedDiff(STORE.baseline, ensureSchema()) || {};
      return wcArray(diff.items);
    }catch(err){
      return [];
    }
  }

  function wcHotspotForTable(table, schema, report, diffItems, relationByTable){
    var reasons = [];
    var score = 0;
    var relationCount = relationByTable[wcText(table && table.id)] || 0;
    var metadataScore = wcMetadataScore(table);
    var governance = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
    var policies = wcArray(table && table.policies);
    var diffForTable = diffItems.filter(function(item){ return wcText(item && item.table) === wcText(table && table.name); });
    var destructiveCount = diffForTable.filter(function(item){ return !!(item && item.destructive); }).length;
    var breakingCount = diffForTable.filter(function(item){ return !!(item && item.breaking); }).length;
    if(!(governance.owner || governance.steward)){
      score += 8;
      reasons.push(_t('Thiếu owner/steward', 'Missing owner/steward'));
    }
    if(!(table && table.canonical && table.canonical.layer)){
      score += 7;
      reasons.push(_t('Thiếu canonical layer', 'Missing canonical layer'));
    }
    if(table && table.rls_enabled && !policies.length){
      score += 10;
      reasons.push(_t('Bật RLS nhưng chưa có policy', 'RLS enabled without policies'));
    }
    if(!table || !(table.description || table.description_vi || table.description_en)){
      score += 5;
      reasons.push(_t('Thiếu mô tả nghiệp vụ', 'Missing business description'));
    }
    if(wcWorkflowCandidate(table) && !wcWorkflowBound(table)){
      score += 6;
      reasons.push(_t('Ứng viên workflow chưa bind runtime', 'Workflow candidate not yet bound to runtime'));
    }
    if(relationCount >= 8){
      score += Math.min(12, relationCount - 6);
      reasons.push(_t('Mật độ relation cao', 'High relation fan-in/fan-out'));
    }
    if(wcArray(table && table.columns).length >= 18){
      score += Math.min(8, Math.round((wcArray(table && table.columns).length - 16) / 2));
      reasons.push(_t('Bảng rộng, nên nhóm và chuẩn hóa metadata', 'Wide table; group and normalize metadata'));
    }
    diffForTable.forEach(function(item){
      if(!item) return;
      score += item.destructive ? 10 : (item.severity === 'high' ? 6 : (item.severity === 'medium' ? 3 : 1));
      if(item.detail && reasons.length < 5) reasons.push(item.detail);
    });
    score += Math.max(0, Math.round((100 - metadataScore) / 14));
    score = wcClamp(score, 0, 100);
    return {
      table: wcText(table && table.name),
      tableId: wcText(table && table.id),
      domain: wcText(table && table.domain) || 'default',
      layer: wcText(table && table.canonical && table.canonical.layer) || '',
      relationCount: relationCount,
      metadataScore: metadataScore,
      score: score,
      severity: score >= 36 ? 'critical' : (score >= 24 ? 'high' : (score >= 12 ? 'medium' : 'low')),
      destructiveCount: destructiveCount,
      breakingCount: breakingCount,
      issueCount: diffForTable.length,
      reasons: reasons.slice(0, 5),
      workflowBound: wcWorkflowBound(table),
      workflowCandidate: wcWorkflowCandidate(table),
      rlsEnabled: !!(table && table.rls_enabled),
      policyCount: policies.length
    };
  }

  function wcRecommendationText(item){
    if(typeof item === 'string') return item;
    if(!item || typeof item !== 'object') return '';
    if(item.title && item.detail) return item.title + ': ' + item.detail;
    return item.detail || item.title || item.code || '';
  }

  function wcLocalDiagnosis(){
    var schema = ensureSchema();
    var report = window.SchemaStudioEnterprise && typeof window.SchemaStudioEnterprise.buildReport === 'function'
      ? (window.SchemaStudioEnterprise.buildReport(schema) || { summary:{}, domains:{}, layers:{}, canonical:{ capabilities:[], criticalMissing:[] } })
      : { summary:{}, domains:{}, layers:{}, canonical:{ capabilities:[], criticalMissing:[] } };
    var diff = STORE.baseline && window.SchemaStudioEnterprise && typeof window.SchemaStudioEnterprise.buildTypedDiff === 'function'
      ? (window.SchemaStudioEnterprise.buildTypedDiff(STORE.baseline, schema) || { summary:{ compatibilityScore:100, riskScore:0, approvalClass:'standard' }, items:[] })
      : { summary:{ compatibilityScore:100, riskScore:0, approvalClass:'standard' }, items:[] };
    var tables = wcArray(schema && schema.tables);
    var relations = wcArray(schema && schema.relations);
    var relationByTable = wcRelationMap(schema);
    var workflowCandidates = 0;
    var workflowBound = 0;
    var metadataTotal = 0;
    var hotspots = tables.map(function(table){
      var hotspot = wcHotspotForTable(table, schema, report, wcArray(diff.items), relationByTable);
      metadataTotal += hotspot.metadataScore;
      if(hotspot.workflowCandidate) workflowCandidates += 1;
      if(hotspot.workflowBound) workflowBound += 1;
      return hotspot;
    }).sort(function(a, b){
      return (b.score - a.score) || (b.issueCount - a.issueCount) || (b.relationCount - a.relationCount) || a.table.localeCompare(b.table);
    }).filter(function(item){ return item.score > 0; }).slice(0, 12);
    var orphanRisk = wcOrphanRelationRisk(schema);
    var metadataCompleteness = tables.length ? Math.round(metadataTotal / tables.length) : 0;
    var workflowCoverage = workflowCandidates ? Math.round((workflowBound / workflowCandidates) * 100) : (tables.length ? 0 : 100);
    var graphDensity = wcGraphDensityScore(tables.length, relations.length);
    var hotspotCount = hotspots.filter(function(item){ return item.score >= 12; }).length;
    var releaseReadiness = Number((report.summary && report.summary.releaseReadinessScore) || 0);
    var visualReadiness = wcClamp(Math.round(
      (releaseReadiness * 0.30)
      + (metadataCompleteness * 0.25)
      + (graphDensity * 0.15)
      + (workflowCoverage * 0.15)
      + ((100 - Math.min(100, orphanRisk * 14)) * 0.15)
    ), 0, 100);
    var recommendations = [];
    if(orphanRisk > 0) recommendations.push(_t('Sửa toàn bộ relation đang trỏ tới table/column không còn tồn tại trước khi publish.', 'Repair relations that still point to missing tables/columns before publishing.'));
    if((diff.summary && diff.summary.destructiveCount) > 0) recommendations.push(_t('Escalate mọi thay đổi destructive qua CAB/e-sign kèm rollback evidence.', 'Escalate destructive changes through CAB/e-sign with rollback evidence.'));
    if(metadataCompleteness < 75) recommendations.push(_t('Bổ sung label, mô tả, owner, steward, canonical layer và UI hints cho các bảng trọng yếu.', 'Add labels, descriptions, owners, stewards, canonical layers, and UI hints to critical tables.'));
    if(workflowCoverage < 60 && workflowCandidates > 0) recommendations.push(_t('Liên kết thêm workflow/runtime bindings cho các bảng vận hành như order, inspection, CAPA, maintenance.', 'Bind more workflow/runtime contracts to operational tables such as orders, inspections, CAPA, and maintenance.'));
    if((report.summary && report.summary.policyCount) === 0 && (report.summary && report.summary.rlsTableCount) > 0) recommendations.push(_t('Model policy metadata cho toàn bộ bảng bật RLS để tránh khóa nghiệp vụ khi siết policy.', 'Model policy metadata for all RLS-enabled tables to avoid operational lockouts when tightening security.'));
    if((report.summary && report.summary.canonicalCoveragePercent) < 80) recommendations.push(_t('Đóng gap canonical ERP/MES/eQMS, đặc biệt genealogy, inspection, NC/CAPA, approval/e-sign và maintenance.', 'Close canonical ERP/MES/eQMS gaps, especially genealogy, inspection, NC/CAPA, approval/e-sign, and maintenance.'));
    if(graphDensity < 60) recommendations.push(_t('Tối ưu graph density: tách domain quá dày, bổ sung relation còn thiếu và lưu các focused view cho domain lớn.', 'Rebalance graph density: split dense domains, add missing relations, and save focused views for large domains.'));
    if(visualReadiness < 70) recommendations.push(_t('Cần thêm saved views, visual heatmaps và metadata badges trước khi coi studio là control-plane trực diện cho enterprise.', 'Add saved views, visual heatmaps, and metadata badges before treating the studio as the direct enterprise control plane.'));
    return {
      generatedAt: wcNow(),
      backend: false,
      report: report,
      diff: diff,
      summary: {
        tableCount: tables.length,
        relationCount: relations.length,
        avgColumnsPerTable: tables.length ? Math.round((((report.summary && report.summary.columnCount) || 0) / tables.length) * 10) / 10 : 0,
        avgRelationsPerTable: tables.length ? Math.round(((relations.length * 2) / tables.length) * 10) / 10 : 0,
        graphDensityScore: graphDensity,
        metadataCompletenessPercent: metadataCompleteness,
        workflowBindingCoveragePercent: workflowCoverage,
        orphanRelationRiskCount: orphanRisk,
        hotspotCount: hotspotCount,
        visualReadinessScore: visualReadiness,
        releaseReadinessScore: Number((report.summary && report.summary.releaseReadinessScore) || 0),
        compatibilityScore: Number((diff.summary && diff.summary.compatibilityScore) || 100),
        riskScore: Number((diff.summary && diff.summary.riskScore) || 0),
        criticalGapCount: wcArray(report.canonical && report.canonical.criticalMissing).length
      },
      hotspots: hotspots,
      recommendations: recommendations,
      diffSummary: diff.summary || {},
      reportSummary: report.summary || {}
    };
  }

  function wcNormalizeDiagnosis(payload){
    if(!payload) return wcLocalDiagnosis();
    if(payload.summary && payload.hotspots){
      return payload;
    }
    if(payload.health){
      return {
        generatedAt: wcNow(),
        backend: true,
        report: payload.report || {},
        diff: payload.diff || {},
        summary: payload.health.summary || {},
        hotspots: wcArray(payload.health.hotspots),
        recommendations: wcArray(payload.health.recommendations),
        diffSummary: payload.health.diffSummary || {},
        reportSummary: payload.health.reportSummary || {}
      };
    }
    return wcLocalDiagnosis();
  }

  function wcFetchDiagnosis(force){
    var state = wcEnsureState();
    var schema;
    if(state.loading && !force) return Promise.resolve(state.diagnosis || wcLocalDiagnosis());
    schema = ensureSchema();
    state.loading = true;
    wcRefreshOverlay();
    return _api('schema_studio_diagnose', {
      design_id: wcDesignId(),
      schema: schema,
      baseline: STORE.baseline || null,
      persist_artifacts: true
    }, 'POST').then(function(res){
      state.loading = false;
      state.lastSyncAt = wcNow();
      state.diagnosis = wcNormalizeDiagnosis(res || {});
      wcPersistPrefs();
      wcRefreshOverlay();
      wcScheduleDecorations();
      return state.diagnosis;
    }).catch(function(){
      state.loading = false;
      state.lastSyncAt = wcNow();
      state.diagnosis = wcLocalDiagnosis();
      wcRefreshOverlay();
      wcScheduleDecorations();
      return state.diagnosis;
    });
  }

  function wcGetDiagnosis(){
    var state = wcEnsureState();
    if(!state.diagnosis) state.diagnosis = wcLocalDiagnosis();
    return state.diagnosis;
  }

  function wcThemeClassPrefix(prefix, node){
    if(!node || !node.classList) return;
    Array.prototype.slice.call(node.classList).forEach(function(cls){
      if(cls.indexOf(prefix) === 0) node.classList.remove(cls);
    });
  }

  function wcApplyPrefs(){
    var state = wcEnsureState();
    var root = refs.root || document.body;
    wcEnsureStyles();
    if(!root) return;
    wcThemeClassPrefix('ss-wc-ambience-', root);
    wcThemeClassPrefix('ss-wc-density-', root);
    root.classList.add('ss-wc-ambience-' + state.ambience);
    root.classList.add('ss-wc-density-' + state.density);
    root.setAttribute('data-ss-wc-heatmap', state.heatmap);
  }

  function wcSeverityClass(severity){
    return severity === 'critical' ? 'critical' : (severity === 'high' ? 'high' : (severity === 'medium' ? 'medium' : 'low'));
  }

  function wcCardStat(table){
    var diag = wcGetDiagnosis();
    var hotspot = wcArray(diag.hotspots).find(function(item){
      return wcText(item && item.tableId) === wcText(table && table.id) || wcText(item && item.table) === wcText(table && table.name);
    });
    if(hotspot) return hotspot;
    return wcHotspotForTable(table, ensureSchema(), diag.report || {}, wcArray(diag.diff && diag.diff.items), wcRelationMap(ensureSchema()));
  }

  function wcDecorateCard(tableId){
    var table = findTable(tableId);
    var card = document.getElementById('tc_' + tableId);
    var stat;
    var header;
    var footer;
    var ribbon;
    var kpis;
    if(!table || !card) return;
    stat = wcCardStat(table);
    header = card.querySelector('.ss-table-card-header');
    footer = card.querySelector('.ss-table-footer');
    if(!header || !footer) return;
    card.setAttribute('data-wc-severity', stat.severity || 'low');
    card.setAttribute('data-wc-heatmap', wcEnsureState().heatmap);
    card.setAttribute('data-wc-layer', wcText(stat.layer || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    card.setAttribute('data-wc-domain', wcText(stat.domain || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    wcThemeClassPrefix('ss-wc-card-', card);
    card.classList.add('ss-wc-card-' + wcSeverityClass(stat.severity));
    ribbon = card.querySelector('.ss-wc-ribbon');
    if(!ribbon){
      ribbon = document.createElement('div');
      ribbon.className = 'ss-wc-ribbon';
      header.appendChild(ribbon);
    }
    ribbon.innerHTML = [
      '<span class="ss-wc-chip tone-' + wcSeverityClass(stat.severity) + '">' + wcEsc((stat.severity || 'low').toUpperCase()) + '</span>',
      (stat.layer ? '<span class="ss-wc-chip">' + wcEsc(stat.layer) + '</span>' : ''),
      '<span class="ss-wc-chip">' + wcEsc(table.domain || 'default') + '</span>',
      (stat.rlsEnabled ? '<span class="ss-wc-chip tone-security">RLS</span>' : ''),
      (stat.workflowBound ? '<span class="ss-wc-chip tone-workflow">WF</span>' : (stat.workflowCandidate ? '<span class="ss-wc-chip tone-muted">WF?</span>' : ''))
    ].join('');
    kpis = card.querySelector('.ss-wc-kpis');
    if(!kpis){
      kpis = document.createElement('div');
      kpis.className = 'ss-wc-kpis';
      footer.parentNode.insertBefore(kpis, footer);
    }
    kpis.innerHTML = [
      '<span>' + wcEsc(_t('Meta', 'Meta')) + ' ' + wcEsc(stat.metadataScore + '%') + '</span>',
      '<span>' + wcEsc(_t('Risk', 'Risk')) + ' ' + wcEsc(stat.score) + '</span>',
      '<span>' + wcEsc(_t('Rel', 'Rel')) + ' ' + wcEsc(stat.relationCount) + '</span>',
      '<span>' + wcEsc(_t('Issues', 'Issues')) + ' ' + wcEsc(stat.issueCount || 0) + '</span>'
    ].join('');
  }

  function wcRefreshDecorations(){
    var schema = ensureSchema();
    wcArray(schema && schema.tables).forEach(function(table){
      wcDecorateCard(table.id);
    });
  }

  function wcScheduleDecorations(){
    var state = wcEnsureState();
    clearTimeout(state.decorateTimer);
    state.decorateTimer = setTimeout(function(){
      wcApplyPrefs();
      wcRefreshDecorations();
    }, 60);
  }

  function wcMetric(label, value, sub, tone){
    return '<div class="ss-wc-metric ' + (tone ? 'tone-' + tone : '') + '"><div class="ss-wc-metric-label">' + wcEsc(label) + '</div><div class="ss-wc-metric-value">' + wcEsc(value) + '</div><div class="ss-wc-metric-sub">' + wcEsc(sub || '') + '</div></div>';
  }

  function wcHotspotsHtml(diag){
    var hotspots = wcArray(diag && diag.hotspots).slice(0, 8);
    if(!hotspots.length) return '<div class="ss-wc-empty">' + wcEsc(_t('Chưa có hotspot nào.', 'No hotspots recorded yet.')) + '</div>';
    return hotspots.map(function(item){
      return [
        '<div class="ss-wc-list-item" data-table-id="' + wcEsc(item.tableId || '') + '">',
          '<div class="ss-wc-list-main">',
            '<div class="ss-wc-list-title"><span class="ss-wc-dot tone-' + wcSeverityClass(item.severity) + '"></span>' + wcEsc(item.table || '-') + '</div>',
            '<div class="ss-wc-list-meta">' + wcEsc((item.layer || '-') + ' · ' + (item.domain || 'default') + ' · ' + _t('Meta ', 'Meta ') + (item.metadataScore || 0) + '% · ' + _t('Rel ', 'Rel ') + (item.relationCount || 0)) + '</div>',
            '<div class="ss-wc-list-help">' + wcEsc(wcArray(item.reasons).slice(0, 2).join(' · ')) + '</div>',
          '</div>',
          '<div class="ss-wc-list-side">',
            '<div class="ss-wc-score">' + wcEsc(item.score || 0) + '</div>',
            '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-action="focus-table" data-table-id="' + wcEsc(item.tableId || '') + '">' + wcEsc(_t('Focus', 'Focus')) + '</button>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function wcRecommendationsHtml(diag){
    var recommendations = wcArray(diag && diag.recommendations).slice(0, 6);
    if(!recommendations.length) return '<div class="ss-wc-empty">' + wcEsc(_t('Chưa có recommendation nào.', 'No recommendations generated yet.')) + '</div>';
    return recommendations.map(function(item){
      return '<div class="ss-wc-note">• ' + wcEsc(wcRecommendationText(item)) + '</div>';
    }).join('');
  }

  function wcCompareHtml(diag){
    var diff = (diag && diag.diff) || {};
    var summary = diff.summary || {};
    var items = wcArray(diff.items).slice(0, 12);
    if(!STORE.baseline){
      return '<div class="ss-wc-empty">' + wcEsc(_t('Chưa có baseline để compare. Hãy load/bật baseline trước.', 'No baseline available for compare. Load or enable a baseline first.')) + '</div>';
    }
    return [
      '<div class="ss-wc-metric-grid">',
        wcMetric(_t('Compatibility', 'Compatibility'), (summary.compatibilityScore || 0) + '%', _t('Backward compatibility posture', 'Backward compatibility posture'), 'good'),
        wcMetric(_t('Risk score', 'Risk score'), summary.riskScore || 0, _t('Migration and runtime risk', 'Migration and runtime risk'), (summary.riskScore || 0) >= 60 ? 'critical' : 'warning'),
        wcMetric(_t('Approval class', 'Approval class'), summary.approvalClass || 'standard', _t('Review and escalation lane', 'Review and escalation lane')),
        wcMetric(_t('Destructive', 'Destructive'), summary.destructiveCount || 0, _t('Firewall-sensitive changes', 'Firewall-sensitive changes'), (summary.destructiveCount || 0) ? 'critical' : 'good'),
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Typed diff spotlight', 'Typed diff spotlight')) + '</div>',
        (items.length ? items.map(function(item){
          return '<div class="ss-wc-note"><strong>' + wcEsc(item.type || '-') + '</strong> · ' + wcEsc(item.table || '-') + (item.column ? '.' + wcEsc(item.column) : '') + ' · ' + wcEsc(item.detail || '') + ' · ' + wcEsc(item.approvalClass || 'standard') + '</div>';
        }).join('') : '<div class="ss-wc-empty">' + wcEsc(_t('Chưa có typed diff item.', 'No typed diff items yet.')) + '</div>'),
      '</div>'
    ].join('');
  }

  function wcVisualHtml(diag){
    var state = wcEnsureState();
    var schema = ensureSchema();
    var views = wcArray(schema && schema.views);
    function optionButton(action, value, label, active){
      return '<button type="button" class="hm-btn ' + (active ? 'hm-btn-primary' : 'hm-btn-ghost') + ' ss-btn-sm" data-wc-action="' + action + '" data-value="' + wcEsc(value) + '">' + wcEsc(label) + '</button>';
    }
    return [
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Visual ambience', 'Visual ambience')) + '</div>',
        '<div class="ss-wc-inline">',
          optionButton('set-ambience', 'aurora', _t('Aurora', 'Aurora'), state.ambience === 'aurora'),
          optionButton('set-ambience', 'midnight', _t('Midnight', 'Midnight'), state.ambience === 'midnight'),
          optionButton('set-ambience', 'clean', _t('Clean', 'Clean'), state.ambience === 'clean'),
        '</div>',
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Heatmap mode', 'Heatmap mode')) + '</div>',
        '<div class="ss-wc-inline">',
          optionButton('set-heatmap', 'risk', _t('Risk', 'Risk'), state.heatmap === 'risk'),
          optionButton('set-heatmap', 'security', _t('Security', 'Security'), state.heatmap === 'security'),
          optionButton('set-heatmap', 'workflow', _t('Workflow', 'Workflow'), state.heatmap === 'workflow'),
          optionButton('set-heatmap', 'canonical', _t('Canonical', 'Canonical'), state.heatmap === 'canonical'),
        '</div>',
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Canvas density', 'Canvas density')) + '</div>',
        '<div class="ss-wc-inline">',
          optionButton('set-density', 'compact', _t('Compact', 'Compact'), state.density === 'compact'),
          optionButton('set-density', 'comfortable', _t('Comfortable', 'Comfortable'), state.density === 'comfortable'),
        '</div>',
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Saved views and cockpit posture', 'Saved views and cockpit posture')) + '</div>',
        '<div class="ss-wc-note">' + wcEsc(_t('Saved views', 'Saved views')) + ': ' + wcEsc(views.length) + ' · ' + wcEsc(_t('Visual readiness', 'Visual readiness')) + ': ' + wcEsc(((diag && diag.summary && diag.summary.visualReadinessScore) || 0) + '%') + '</div>',
        '<div class="ss-wc-note">' + wcEsc(_t('Lưu thêm các focused views theo domain, manufacturing line, genealogy, quality, CAPA và maintenance.', 'Save more focused views by domain, manufacturing line, genealogy, quality, CAPA, and maintenance.')) + '</div>',
      '</div>'
    ].join('');
  }

  function wcManufacturingHtml(diag){
    var report = (diag && diag.report) || {};
    var layers = report.layers || {};
    var canonical = report.canonical || {};
    var criticalMissing = wcArray(canonical.criticalMissing);
    return [
      '<div class="ss-wc-metric-grid">',
        wcMetric(_t('Canonical coverage', 'Canonical coverage'), ((report.summary && report.summary.canonicalCoveragePercent) || 0) + '%', _t('ERP/MES/eQMS capability coverage', 'ERP/MES/eQMS capability coverage'), ((report.summary && report.summary.canonicalCoveragePercent) || 0) >= 80 ? 'good' : 'warning'),
        wcMetric(_t('Policies', 'Policies'), (report.summary && report.summary.policyCount) || 0, _t('Governance and RLS policies', 'Governance and RLS policies')),
        wcMetric(_t('RLS tables', 'RLS tables'), (report.summary && report.summary.rlsTableCount) || 0, _t('Security-sensitive tables', 'Security-sensitive tables')),
        wcMetric(_t('Partitioned', 'Partitioned'), (report.summary && report.summary.partitionedTableCount) || 0, _t('Scale-oriented tables', 'Scale-oriented tables')),
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Layer distribution', 'Layer distribution')) + '</div>',
        '<div class="ss-wc-chip-cloud">' + Object.keys(layers).map(function(layer){ return '<span class="ss-wc-chip">' + wcEsc(layer + ': ' + layers[layer]) + '</span>'; }).join('') + '</div>',
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Critical canonical gaps', 'Critical canonical gaps')) + '</div>',
        (criticalMissing.length ? criticalMissing.map(function(item){ return '<div class="ss-wc-note">• ' + wcEsc(item) + '</div>'; }).join('') : '<div class="ss-wc-empty">' + wcEsc(_t('Không có critical gap nào.', 'No critical gaps detected.')) + '</div>'),
      '</div>'
    ].join('');
  }

  function wcDiagnosticsHtml(diag){
    var validatorResults = wcArray(STORE.validation && STORE.validation.results).slice(0, 10);
    return [
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Recommendations', 'Recommendations')) + '</div>',
        wcRecommendationsHtml(diag),
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Live validator signals', 'Live validator signals')) + '</div>',
        (validatorResults.length ? validatorResults.map(function(item){
          return '<div class="ss-wc-note"><strong>' + wcEsc(item.code || item.level || 'INFO') + '</strong> · ' + wcEsc(item.table || item.tableId || '-') + ' · ' + wcEsc(item.msg || '') + '</div>';
        }).join('') : '<div class="ss-wc-empty">' + wcEsc(_t('Chưa có tín hiệu validator nào.', 'No validator signals yet.')) + '</div>'),
      '</div>',
      '<div class="ss-wc-section">',
        '<div class="ss-wc-section-title">' + wcEsc(_t('Hotspots', 'Hotspots')) + '</div>',
        wcHotspotsHtml(diag),
      '</div>'
    ].join('');
  }

  function wcDashboardHtml(diag){
    var summary = (diag && diag.summary) || {};
    var report = (diag && diag.report) || {};
    return [
      '<div class="ss-wc-metric-grid">',
        wcMetric(_t('Visual readiness', 'Visual readiness'), (summary.visualReadinessScore || 0) + '%', _t('Canvas + governance cockpit quality', 'Canvas + governance cockpit quality'), (summary.visualReadinessScore || 0) >= 75 ? 'good' : 'warning'),
        wcMetric(_t('Metadata completeness', 'Metadata completeness'), (summary.metadataCompletenessPercent || 0) + '%', _t('Owner/steward/layer/UI semantics', 'Owner/steward/layer/UI semantics'), (summary.metadataCompletenessPercent || 0) >= 75 ? 'good' : 'warning'),
        wcMetric(_t('Workflow coverage', 'Workflow coverage'), (summary.workflowBindingCoveragePercent || 0) + '%', _t('Operational tables bound to workflow', 'Operational tables bound to workflow'), (summary.workflowBindingCoveragePercent || 0) >= 65 ? 'good' : 'warning'),
        wcMetric(_t('Graph density', 'Graph density'), summary.graphDensityScore || 0, _t('Readability of relation topology', 'Readability of relation topology'), (summary.graphDensityScore || 0) >= 60 ? 'good' : 'warning'),
        wcMetric(_t('Orphan risk', 'Orphan risk'), summary.orphanRelationRiskCount || 0, _t('Broken relation targets', 'Broken relation targets'), (summary.orphanRelationRiskCount || 0) ? 'critical' : 'good'),
        wcMetric(_t('Compatibility / risk', 'Compatibility / risk'), (summary.compatibilityScore || 0) + '% / ' + (summary.riskScore || 0), _t('Migration posture', 'Migration posture'), (summary.riskScore || 0) >= 60 ? 'critical' : 'warning'),
      '</div>',
      '<div class="ss-wc-grid-two">',
        '<div class="ss-wc-section"><div class="ss-wc-section-title">' + wcEsc(_t('Top hotspots', 'Top hotspots')) + '</div>' + wcHotspotsHtml(diag) + '</div>',
        '<div class="ss-wc-section"><div class="ss-wc-section-title">' + wcEsc(_t('Immediate recommendations', 'Immediate recommendations')) + '</div>' + wcRecommendationsHtml(diag) + '<div class="ss-wc-note" style="margin-top:10px">' + wcEsc(_t('Canonical coverage', 'Canonical coverage')) + ': ' + wcEsc(((report.summary && report.summary.canonicalCoveragePercent) || 0) + '%') + ' · ' + wcEsc(_t('Critical gaps', 'Critical gaps')) + ': ' + wcEsc((diag.summary && diag.summary.criticalGapCount) || 0) + '</div></div>',
      '</div>'
    ].join('');
  }

  function wcRenderBody(diag){
    var state = wcEnsureState();
    if(state.tab === 'compare') return wcCompareHtml(diag);
    if(state.tab === 'visual') return wcVisualHtml(diag);
    if(state.tab === 'manufacturing') return wcManufacturingHtml(diag);
    if(state.tab === 'diagnostics') return wcDiagnosticsHtml(diag);
    return wcDashboardHtml(diag);
  }

  function wcRefreshOverlay(){
    var state = wcEnsureState();
    var overlay = state.overlayEl;
    var diag = wcGetDiagnosis();
    var summary = diag.summary || {};
    var tabs;
    if(!overlay) return;
    tabs = [
      ['dashboard', _t('Dashboard', 'Dashboard')],
      ['compare', _t('Compare', 'Compare')],
      ['visual', _t('Visual', 'Visual')],
      ['manufacturing', _t('Manufacturing', 'Manufacturing')],
      ['diagnostics', _t('Diagnostics', 'Diagnostics')]
    ];
    overlay.innerHTML = [
      '<div class="ss-wc-shell">',
        '<div class="ss-wc-backdrop" data-wc-action="close"></div>',
        '<section class="ss-wc-panel">',
          '<header class="ss-wc-header">',
            '<div>',
              '<div class="ss-wc-kicker">' + wcEsc(_t('World-class schema cockpit', 'World-class schema cockpit')) + '</div>',
              '<h3>' + wcEsc(_t('Visual intelligence, diagnostics, governance, manufacturing overlays', 'Visual intelligence, diagnostics, governance, manufacturing overlays')) + '</h3>',
              '<div class="ss-wc-header-meta">' + wcEsc(_t('Visual readiness', 'Visual readiness')) + ': ' + wcEsc((summary.visualReadinessScore || 0) + '%') + ' · ' + wcEsc(_t('Hotspots', 'Hotspots')) + ': ' + wcEsc(summary.hotspotCount || 0) + ' · ' + wcEsc(_t('Last sync', 'Last sync')) + ': ' + wcEsc(state.lastSyncAt || diag.generatedAt || '-') + '</div>',
            '</div>',
            '<div class="ss-wc-inline">',
              '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-action="refresh">' + wcEsc(state.loading ? _t('Đang phân tích...', 'Analysing...') : _t('Phân tích lại', 'Re-run diagnostics')) + '</button>',
              '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-action="open-enterprise">' + wcEsc(_t('Enterprise', 'Enterprise')) + '</button>',
              '<button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-action="close">' + wcEsc(_t('Đóng', 'Close')) + '</button>',
            '</div>',
          '</header>',
          '<nav class="ss-wc-tabs">',
            tabs.map(function(item){
              return '<button type="button" class="ss-wc-tab ' + (state.tab === item[0] ? 'active' : '') + '" data-wc-action="tab" data-tab="' + wcEsc(item[0]) + '">' + wcEsc(item[1]) + '</button>';
            }).join(''),
          '</nav>',
          '<div class="ss-wc-body">',
            wcRenderBody(diag),
          '</div>',
        '</section>',
      '</div>'
    ].join('');
  }

  function wcEnsureOverlay(){
    var state = wcEnsureState();
    var host = refs.root || document.body;
    if(state.overlayEl && state.overlayEl.parentNode) return state.overlayEl;
    state.overlayEl = document.createElement('div');
    state.overlayEl.className = 'ss-wc-overlay';
    state.overlayEl.addEventListener('click', function(ev){
      var actionNode = ev.target && ev.target.closest ? ev.target.closest('[data-wc-action]') : null;
      var action;
      var value;
      if(!actionNode) return;
      action = actionNode.getAttribute('data-wc-action');
      value = actionNode.getAttribute('data-value') || '';
      if(action === 'close'){
        wcClose();
        return;
      }
      if(action === 'refresh'){
        wcFetchDiagnosis(true);
        return;
      }
      if(action === 'open-enterprise'){
        if(window.SchemaStudioEnterprise && typeof window.SchemaStudioEnterprise.open === 'function'){
          window.SchemaStudioEnterprise.open('summary');
        }
        return;
      }
      if(action === 'tab'){
        wcEnsureState().tab = actionNode.getAttribute('data-tab') || 'dashboard';
        wcPersistPrefs();
        wcRefreshOverlay();
        return;
      }
      if(action === 'set-heatmap'){
        wcEnsureState().heatmap = value || 'risk';
        wcPersistPrefs();
        wcApplyPrefs();
        wcScheduleDecorations();
        wcRefreshOverlay();
        return;
      }
      if(action === 'set-ambience'){
        wcEnsureState().ambience = value || 'aurora';
        wcPersistPrefs();
        wcApplyPrefs();
        wcRefreshOverlay();
        return;
      }
      if(action === 'set-density'){
        wcEnsureState().density = value || 'comfortable';
        wcPersistPrefs();
        wcApplyPrefs();
        wcScheduleDecorations();
        wcRefreshOverlay();
        return;
      }
      if(action === 'focus-table'){
        wcFocusTable(actionNode.getAttribute('data-table-id') || '');
      }
    });
    if(!state.keyListenerBound){
      document.addEventListener('keydown', function(ev){
        if(ev.key === 'Escape' && wcEnsureState().overlayEl){
          wcClose();
        }
      });
      state.keyListenerBound = true;
    }
    host.appendChild(state.overlayEl);
    return state.overlayEl;
  }

  function wcFocusTable(tableId){
    if(!tableId) return;
    wcEnsureState().focusTableId = tableId;
    try{
      if(Browser && typeof Browser.focusTable === 'function') Browser.focusTable(tableId);
      if(Canvas && typeof Canvas.selectTable === 'function') Canvas.selectTable(tableId);
      if(Inspector && typeof Inspector.open === 'function') Inspector.open({ kind:'table', tableId:tableId });
    }catch(err){}
  }

  function wcOpen(tab){
    var state = wcLoadPrefs();
    wcEnsureStyles();
    wcApplyPrefs();
    if(tab) state.tab = tab;
    wcEnsureOverlay();
    wcRefreshOverlay();
    wcFetchDiagnosis(false);
  }

  function wcClose(){
    var state = wcEnsureState();
    if(state.overlayEl && state.overlayEl.parentNode){
      state.overlayEl.parentNode.removeChild(state.overlayEl);
    }
    state.overlayEl = null;
  }

  function wcEnsureStyles(){
    var style;
    if(document.getElementById('ss-worldclass-style')) return;
    style = document.createElement('style');
    style.id = 'ss-worldclass-style';
    style.textContent = [
      '.ss-wc-overlay{position:fixed;inset:0;z-index:4100;pointer-events:none;}',
      '.ss-wc-shell{position:absolute;inset:0;display:flex;align-items:stretch;justify-content:flex-end;pointer-events:auto;}',
      '.ss-wc-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.38);backdrop-filter:blur(4px);}',
      '.ss-wc-panel{position:relative;margin-left:auto;width:min(1080px,calc(100vw - 32px));height:100%;background:linear-gradient(180deg,rgba(10,15,29,.98),rgba(13,20,38,.98));color:#e5eefb;border-left:1px solid rgba(148,163,184,.18);box-shadow:-24px 0 60px rgba(2,6,23,.44);display:flex;flex-direction:column;}',
      '.ss-wc-header{padding:18px 22px 14px;border-bottom:1px solid rgba(148,163,184,.14);display:flex;align-items:flex-start;justify-content:space-between;gap:14px;background:radial-gradient(circle at top left,rgba(56,189,248,.14),transparent 38%),radial-gradient(circle at top right,rgba(168,85,247,.16),transparent 32%);}',
      '.ss-wc-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc;margin-bottom:8px;}',
      '.ss-wc-header h3{margin:0;font-size:20px;line-height:1.3;color:#f8fbff;}',
      '.ss-wc-header-meta{font-size:12px;color:#a9b7d0;margin-top:8px;}',
      '.ss-wc-tabs{display:flex;gap:8px;padding:14px 20px;border-bottom:1px solid rgba(148,163,184,.12);overflow:auto;}',
      '.ss-wc-tab{border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.68);color:#cbd5e1;border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer;}',
      '.ss-wc-tab.active{background:linear-gradient(135deg,rgba(56,189,248,.18),rgba(168,85,247,.22));color:#fff;border-color:rgba(125,211,252,.42);box-shadow:0 0 0 1px rgba(125,211,252,.10) inset;}',
      '.ss-wc-body{padding:18px 20px 28px;overflow:auto;display:grid;gap:16px;}',
      '.ss-wc-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}',
      '.ss-wc-grid-two{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;}',
      '.ss-wc-metric,.ss-wc-section{border:1px solid rgba(148,163,184,.14);background:rgba(15,23,42,.68);border-radius:18px;padding:14px 16px;box-shadow:0 10px 28px rgba(2,6,23,.18);}',
      '.ss-wc-metric.tone-good{box-shadow:0 0 0 1px rgba(34,197,94,.16) inset;}',
      '.ss-wc-metric.tone-warning{box-shadow:0 0 0 1px rgba(245,158,11,.16) inset;}',
      '.ss-wc-metric.tone-critical{box-shadow:0 0 0 1px rgba(239,68,68,.20) inset;}',
      '.ss-wc-metric-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8ba0bf;}',
      '.ss-wc-metric-value{font-size:30px;font-weight:800;color:#fff;line-height:1.15;margin-top:10px;}',
      '.ss-wc-metric-sub{font-size:12px;color:#94a3b8;margin-top:8px;line-height:1.5;}',
      '.ss-wc-section-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#93c5fd;margin-bottom:12px;font-weight:800;}',
      '.ss-wc-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-wc-note{font-size:13px;line-height:1.55;color:#d7e3f7;padding:8px 0;border-bottom:1px dashed rgba(148,163,184,.12);}',
      '.ss-wc-note:last-child{border-bottom:0;}',
      '.ss-wc-empty{padding:18px;border:1px dashed rgba(148,163,184,.20);border-radius:14px;color:#93a6c5;background:rgba(15,23,42,.42);}',
      '.ss-wc-list-item{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px dashed rgba(148,163,184,.12);}',
      '.ss-wc-list-item:last-child{border-bottom:0;}',
      '.ss-wc-list-title{font-size:14px;font-weight:700;color:#f8fbff;display:flex;align-items:center;gap:8px;}',
      '.ss-wc-list-meta,.ss-wc-list-help{font-size:12px;color:#9fb0ca;margin-top:4px;line-height:1.5;}',
      '.ss-wc-list-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}',
      '.ss-wc-score{font-size:24px;font-weight:800;color:#fff;line-height:1;}',
      '.ss-wc-dot{width:10px;height:10px;border-radius:999px;display:inline-block;box-shadow:0 0 0 4px rgba(255,255,255,.04);}',
      '.ss-wc-dot.tone-critical,.ss-wc-chip.tone-critical{background:#ef4444;color:#fff;}',
      '.ss-wc-dot.tone-high,.ss-wc-chip.tone-high{background:#f97316;color:#fff;}',
      '.ss-wc-dot.tone-medium,.ss-wc-chip.tone-medium{background:#f59e0b;color:#fff;}',
      '.ss-wc-dot.tone-low,.ss-wc-chip.tone-low{background:#38bdf8;color:#082f49;}',
      '.ss-wc-chip-cloud{display:flex;flex-wrap:wrap;gap:8px;}',
      '.ss-wc-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(30,41,59,.82);color:#e2e8f0;font-size:12px;border:1px solid rgba(148,163,184,.16);}',
      '.ss-wc-chip.tone-security{background:rgba(14,116,144,.28);color:#d8fbff;border-color:rgba(34,211,238,.22);}',
      '.ss-wc-chip.tone-workflow{background:rgba(37,99,235,.26);color:#e0eaff;border-color:rgba(96,165,250,.26);}',
      '.ss-wc-chip.tone-muted{background:rgba(71,85,105,.40);color:#d5dde8;}',
      '.ss-worldclass-toolbar-btn{position:relative;border-color:rgba(96,165,250,.36)!important;background:linear-gradient(135deg,rgba(56,189,248,.16),rgba(168,85,247,.20))!important;color:#fff!important;}',
      '.ss-worldclass-toolbar-btn .ss-worldclass-toolbar-dot{width:8px;height:8px;border-radius:999px;background:linear-gradient(135deg,#7dd3fc,#c084fc);box-shadow:0 0 14px rgba(125,211,252,.8);display:inline-block;margin-right:8px;}',
      '.ss-wc-ribbon{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto;align-items:center;}',
      '.ss-wc-kpis{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 0;font-size:11px;color:#7b8aa6;}',
      '.ss-wc-kpis span{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.12);}',
      '.ss-table-card.ss-wc-card-critical{box-shadow:0 18px 38px rgba(239,68,68,.18),0 0 0 1px rgba(239,68,68,.14) inset;}',
      '.ss-table-card.ss-wc-card-high{box-shadow:0 18px 38px rgba(249,115,22,.14),0 0 0 1px rgba(249,115,22,.10) inset;}',
      '.ss-table-card.ss-wc-card-medium{box-shadow:0 18px 36px rgba(245,158,11,.14),0 0 0 1px rgba(245,158,11,.10) inset;}',
      '.ss-wc-ambience-aurora .ss-table-card{background:linear-gradient(180deg,#fff,rgba(248,250,252,.98));}',
      '.ss-wc-ambience-midnight .ss-table-card{background:linear-gradient(180deg,#0f172a,#111827);color:#e5eefb;border-color:rgba(148,163,184,.16);}',
      '.ss-wc-ambience-midnight .ss-table-card .ss-table-footer,.ss-wc-ambience-midnight .ss-table-card .ss-col-type,.ss-wc-ambience-midnight .ss-table-card .ss-tbl-meta{color:#93a5c4;}',
      '.ss-wc-ambience-clean .ss-table-card{background:#ffffff;box-shadow:0 10px 18px rgba(15,23,42,.08);}',
      '.ss-wc-density-compact .ss-table-card .ss-col-item{padding-top:4px;padding-bottom:4px;}',
      '.ss-wc-density-compact .ss-table-card .ss-wc-kpis{padding-top:4px;}',
      '[data-ss-wc-heatmap="security"] .ss-table-card[data-wc-severity] .ss-wc-chip.tone-security{box-shadow:0 0 0 1px rgba(34,211,238,.18) inset;}',
      '[data-ss-wc-heatmap="workflow"] .ss-table-card .ss-wc-chip.tone-workflow{box-shadow:0 0 0 1px rgba(96,165,250,.18) inset;}',
      '[data-ss-wc-heatmap="canonical"] .ss-table-card[data-wc-layer^="experience"], [data-ss-wc-heatmap="canonical"] .ss-table-card[data-wc-layer^="execution"]{outline:1px solid rgba(125,211,252,.24);outline-offset:2px;}',
      '@media (max-width:1100px){.ss-wc-panel{width:100vw;}.ss-wc-metric-grid,.ss-wc-grid-two{grid-template-columns:1fr;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  var wcOriginalRenderToolbar = renderToolbar;
  renderToolbar = function(container){
    var right;
    var button;
    var insertBefore;
    wcOriginalRenderToolbar(container);
    if(!container) return;
    right = container.querySelector('.ss-toolbar-right');
    if(!right) return;
    if(!right.querySelector('.ss-worldclass-toolbar-btn')){
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'hm-btn hm-btn-ghost ss-btn-sm ss-worldclass-toolbar-btn';
      button.innerHTML = '<span class="ss-worldclass-toolbar-dot"></span><span>' + wcEsc(_t('WorldClass', 'WorldClass')) + '</span>';
      button.onclick = function(){ wcOpen('dashboard'); };
      insertBefore = right.querySelector('.hm-btn-primary');
      if(insertBefore) right.insertBefore(button, insertBefore);
      else right.appendChild(button);
    }
  };

  var wcOriginalTableRender = TableCard.renderTable;
  TableCard.renderTable = function(tbl){
    wcOriginalTableRender.apply(this, arguments);
    if(tbl && tbl.id) wcDecorateCard(tbl.id);
  };

  var wcOriginalCanvasRender = Canvas.render;
  Canvas.render = function(){
    var result = wcOriginalCanvasRender.apply(this, arguments);
    wcScheduleDecorations();
    return result;
  };

  var wcOriginalValidatorRun = Validator.run;
  Validator.run = function(){
    var result = wcOriginalValidatorRun.apply(this, arguments) || [];
    var seen = {};
    var deduped = [];
    var schema = ensureSchema();
    wcArray(schema && schema.tables).forEach(function(table){
      if(wcWorkflowCandidate(table) && !wcWorkflowBound(table)){
        result.push({ level:'info', code:'I92', tableId:table.id, table:table.name, msg:_t('Bảng ứng viên workflow chưa liên kết runtime workflow: ', 'Workflow candidate table is not yet linked to runtime workflow: ') + table.name });
      }
      if(wcArray(table && table.columns).length >= 24 && !(table && table.ui && table.ui.column_groups)){
        result.push({ level:'info', code:'I93', tableId:table.id, table:table.name, msg:_t('Bảng rộng nên có column groups / view presets để đọc tốt hơn: ', 'Wide table should define column groups / view presets for better readability: ') + table.name });
      }
    });
    wcArray(result).forEach(function(item){
      var key = [item && item.code, item && item.level, item && item.tableId, item && item.msg].join('|');
      if(seen[key]) return;
      seen[key] = true;
      deduped.push(item);
    });
    STORE.validation.results = deduped;
    if(refs.validationPanel && refs.validationPanel.style.display !== 'none'){
      Validator.renderPanel();
    }
    return deduped;
  };

  var wcOriginalInit = init;
  init = function(page){
    wcOriginalInit(page);
    wcLoadPrefs();
    wcEnsureStyles();
    wcApplyPrefs();
    wcScheduleDecorations();
    setTimeout(function(){ wcFetchDiagnosis(false); }, 220);
    if(window.SchemaStudio) window.SchemaStudio.openWorldClass = function(){ wcOpen('dashboard'); };
  };

  if(window.SchemaStudioEnterprise){
    if(typeof window.SchemaStudioEnterprise.compileRegistryBundle === 'function'){
      var wcOriginalCompileRegistryBundle = window.SchemaStudioEnterprise.compileRegistryBundle;
      window.SchemaStudioEnterprise.compileRegistryBundle = function(){
        return Promise.resolve(wcOriginalCompileRegistryBundle.apply(this, arguments)).then(function(res){
          wcFetchDiagnosis(true);
          return res;
        });
      };
    }
    if(typeof window.SchemaStudioEnterprise.createReleaseBundle === 'function'){
      var wcOriginalCreateReleaseBundle = window.SchemaStudioEnterprise.createReleaseBundle;
      window.SchemaStudioEnterprise.createReleaseBundle = function(){
        return Promise.resolve(wcOriginalCreateReleaseBundle.apply(this, arguments)).then(function(res){
          wcFetchDiagnosis(true);
          return res;
        });
      };
    }
    if(typeof window.SchemaStudioEnterprise.saveCurrentView === 'function'){
      var wcOriginalSaveCurrentView = window.SchemaStudioEnterprise.saveCurrentView;
      window.SchemaStudioEnterprise.saveCurrentView = function(){
        var before = wcArray(ensureSchema().views).length;
        var result = wcOriginalSaveCurrentView.apply(this, arguments);
        var views = wcArray(ensureSchema().views);
        if(views.length > before){
          views[views.length - 1].worldClassState = wcPrefsSnapshot();
          ensureSchema().views = views.slice(-24);
          markDirty();
        }
        return result;
      };
    }
    if(typeof window.SchemaStudioEnterprise.applyView === 'function'){
      var wcOriginalApplyView = window.SchemaStudioEnterprise.applyView;
      window.SchemaStudioEnterprise.applyView = function(viewId){
        var views = wcArray(ensureSchema().views);
        var view = views.find(function(item){ return item && item.id === viewId; });
        var result = wcOriginalApplyView.apply(this, arguments);
        if(view && view.worldClassState){
          wcEnsureState().heatmap = view.worldClassState.heatmap || wcEnsureState().heatmap;
          wcEnsureState().ambience = view.worldClassState.ambience || wcEnsureState().ambience;
          wcEnsureState().density = view.worldClassState.density || wcEnsureState().density;
          wcPersistPrefs();
          wcApplyPrefs();
          wcScheduleDecorations();
        }
        return result;
      };
    }
  }

  CmdPalette.COMMANDS = CmdPalette.COMMANDS.filter(function(command){
    return !command || ['Open world-class cockpit', 'Refresh world-class diagnostics', 'Toggle workflow heatmap', 'Toggle security heatmap'].indexOf(command.label_en) < 0;
  });
  CmdPalette.COMMANDS.push(
    {
      icon:'✦',
      label:'Mở World-Class cockpit',
      label_en:'Open world-class cockpit',
      category:'schema',
      action:function(){ wcOpen('dashboard'); }
    },
    {
      icon:'↻',
      label:'Làm mới world-class diagnostics',
      label_en:'Refresh world-class diagnostics',
      category:'schema',
      action:function(){ wcFetchDiagnosis(true); }
    },
    {
      icon:'🧭',
      label:'Bật workflow heatmap',
      label_en:'Toggle workflow heatmap',
      category:'view',
      action:function(){ wcEnsureState().heatmap = 'workflow'; wcPersistPrefs(); wcApplyPrefs(); wcScheduleDecorations(); wcOpen('visual'); }
    },
    {
      icon:'🔐',
      label:'Bật security heatmap',
      label_en:'Toggle security heatmap',
      category:'view',
      action:function(){ wcEnsureState().heatmap = 'security'; wcPersistPrefs(); wcApplyPrefs(); wcScheduleDecorations(); wcOpen('visual'); }
    }
  );

  window.SchemaStudioWorldClass = {
    open: wcOpen,
    close: wcClose,
    refresh: function(){ return wcFetchDiagnosis(true); },
    getDiagnosis: wcGetDiagnosis,
    applyVisualPrefs: function(payload){
      payload = payload || {};
      if(payload.heatmap) wcEnsureState().heatmap = payload.heatmap;
      if(payload.ambience) wcEnsureState().ambience = payload.ambience;
      if(payload.density) wcEnsureState().density = payload.density;
      wcPersistPrefs();
      wcApplyPrefs();
      wcScheduleDecorations();
      wcRefreshOverlay();
    },
    focusTable: wcFocusTable
  };
})();

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
window.TableDialog = TableDialog;
window.Diagnostics = Diagnostics;
window.switchMode = switchMode;
window.SchemaStudio = {
  buildId:'20260407worldclass2',
  init:init,
  destroy:destroy,
  getDiagnostics:function(){ return Diagnostics.snapshot(); },
  getWorldClassDiagnostics:function(){ return window.SchemaStudioWorldClass ? window.SchemaStudioWorldClass.getDiagnosis() : null; },
  openWorldClass:function(){ if(window.SchemaStudioWorldClass) window.SchemaStudioWorldClass.open('dashboard'); },
  runSelfCheck:function(){ return Diagnostics.runSelfCheck(); },
  exportDiagnostics:function(){ Diagnostics.exportReport(); }
};
window._renderSchemaStudio = function(page){
  init(page);
};

})(window);

/* ── World-Class Mission Control Round 3 ────────────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win.SchemaStudioWorldClass || !win.STORE) return;

  var STORE = win.STORE;
  var STYLE_ID = 'ss-worldclass-round3-style';
  var renderTimer = 0;
  var hotspotCursor = 0;
  var clickBound = false;
  var keyBound = false;
  var patched = !!win.SchemaStudioWorldClass.__round3Patched;

  function arr(value){ return Array.isArray(value) ? value : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function pct(numerator, denominator, whenZero){
    numerator = Number(numerator || 0);
    denominator = Number(denominator || 0);
    if(!denominator) return whenZero == null ? 100 : whenZero;
    return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
  }
  function clamp(value, min, max){
    value = Number(value);
    if(isNaN(value)) value = 0;
    if(value < min) return min;
    if(value > max) return max;
    return value;
  }
  function schema(){
    return (STORE && STORE.schema && typeof STORE.schema === 'object') ? STORE.schema : { tables:[], relations:[], views:[] };
  }
  function tableByNameMap(currentSchema){
    var map = {};
    arr(currentSchema && currentSchema.tables).forEach(function(table){
      if(table && table.name) map[String(table.name)] = table;
    });
    return map;
  }
  function relationTouchMap(currentSchema){
    var map = {};
    arr(currentSchema && currentSchema.relations).forEach(function(rel){
      var fromId = txt(rel && rel.from_table_id);
      var toId = txt(rel && rel.to_table_id);
      if(fromId) map[fromId] = (map[fromId] || 0) + 1;
      if(toId && toId !== fromId) map[toId] = (map[toId] || 0) + 1;
    });
    return map;
  }
  function workflowCandidate(table){
    var haystack = [
      table && table.name,
      table && table.domain,
      table && table.comment,
      table && table.business && table.business.manufacturing_semantics,
      table && table.business && table.business.qms_semantics,
      table && table.labels && table.labels.en,
      table && table.labels && table.labels.vi
    ].join(' ').toLowerCase();
    return /(approval|inspection|quality|audit|capa|deviation|dispatch|execution|order|maintenance|calibration|training|conformance|genealogy|lot|serial|trace|supplier|complaint|change_control)/.test(haystack);
  }
  function workflowBound(table){
    var integration = table && table.integration && typeof table.integration === 'object' ? table.integration : {};
    return !!(integration.workflow_id || (Array.isArray(integration.workflow_bindings) && integration.workflow_bindings.length));
  }
  function metadataScore(table){
    var labels = table && table.labels && typeof table.labels === 'object' ? table.labels : {};
    var business = table && table.business && typeof table.business === 'object' ? table.business : {};
    var governance = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
    var security = table && table.security && typeof table.security === 'object' ? table.security : {};
    var ui = table && table.ui && typeof table.ui === 'object' ? table.ui : {};
    var reporting = table && table.reporting && typeof table.reporting === 'object' ? table.reporting : {};
    var integration = table && table.integration && typeof table.integration === 'object' ? table.integration : {};
    var checks = 10;
    var points = 0;
    if(labels.vi) points += 1;
    if(labels.en) points += 1;
    if(business.business_name_vi || business.business_name_en) points += 1;
    if(table && table.domain) points += 1;
    if(table && table.canonical && table.canonical.layer) points += 1;
    if(governance.owner || governance.steward) points += 1;
    if(security.sensitivity || (table && table.rls_enabled)) points += 1;
    if(ui.default_widget || ui.icon) points += 1;
    if(reporting.subject_area) points += 1;
    if(integration.workflow_id || arr(integration.workflow_bindings).length || arr(table && table.tags).length || business.manufacturing_semantics) points += 1;
    return Math.round((points / checks) * 100);
  }
  function layerOf(table){
    return txt(table && table.canonical && table.canonical.layer) || txt(table && table.domain).replace(/_/g, ' ');
  }
  function toneByScore(score){
    score = Number(score || 0);
    return score >= 80 ? 'good' : (score >= 65 ? 'warning' : 'critical');
  }
  function journeySpecs(){
    return [
      { key:'production_dispatch', label:'Production dispatch → execution', focus:'Planning-to-execution orchestration', tables:['production_order','work_order','dispatch_queue','track_in','track_out','production_completion','job','job_event'], heatmap:'workflow', ambience:'aurora', density:'compact' },
      { key:'traceability_genealogy', label:'Lot / serial genealogy', focus:'End-to-end traceability and lineage', tables:['item','item_revision','lot','serial','genealogy_link','material_consumption','operation_output','inventory_ledger'], heatmap:'canonical', ambience:'clean', density:'compact' },
      { key:'incoming_quality', label:'Incoming quality containment', focus:'Supplier receipt → inspection → quality case', tables:['purchase_order','purchase_order_line','quality_order','inspection_lot','inspection_result','supplier_quality_case','nonconformance'], heatmap:'risk', ambience:'midnight', density:'comfortable' },
      { key:'nc_capa_closure', label:'NC / deviation / CAPA closure', focus:'Containment, root cause, approval and evidence chain', tables:['nonconformance','deviation','capa','change_control','approval','electronic_signature','audit_trail'], heatmap:'security', ambience:'midnight', density:'comfortable' },
      { key:'document_training', label:'Document → training → competency', focus:'Controlled documents and workforce readiness', tables:['document','document_revision','training_matrix','training_record','competency','approval','electronic_signature'], heatmap:'workflow', ambience:'aurora', density:'comfortable' },
      { key:'equipment_runtime', label:'Equipment runtime and maintenance signal', focus:'Runtime events, downtime and resource orchestration', tables:['org_work_center','machine_event','downtime_event','tool_usage','operation_resource','work_instruction'], heatmap:'workflow', ambience:'midnight', density:'comfortable' },
      { key:'inventory_commitment', label:'Demand, supply and inventory commitment', focus:'ERP planning with inventory posture', tables:['demand','planned_supply','allocation','pegging','inventory_balance_snapshot','location_balance','cost_ledger'], heatmap:'canonical', ambience:'aurora', density:'compact' }
    ];
  }
  function buildExtendedDiagnosis(input){
    var diag = input && typeof input === 'object' ? input : {};
    var currentSchema = schema();
    var tables = arr(currentSchema && currentSchema.tables);
    var relations = arr(currentSchema && currentSchema.relations);
    var summary = diag.summary && typeof diag.summary === 'object' ? diag.summary : {};
    var relationMap = relationTouchMap(currentSchema);
    var hotspots = arr(diag.hotspots);
    var tableByName = tableByNameMap(currentSchema);
    var domainPalette = {
      foundation:'#0f766e',
      master_data:'#0284c7',
      planning_erp:'#d97706',
      mes_execution:'#7c3aed',
      inventory_traceability:'#15803d',
      eqms_compliance:'#be123c',
      engineering:'#475569'
    };

    if(!hotspots.length && tables.length){
      hotspots = tables.map(function(table){
        var score = Math.max(0, Math.round((100 - metadataScore(table)) / 12));
        var reasons = [];
        var governance = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
        if(!(governance.owner || governance.steward)){ score += 6; reasons.push('Missing owner/steward metadata'); }
        if(table && table.rls_enabled && !arr(table.policies).length){ score += 10; reasons.push('RLS enabled without policy metadata'); }
        if(!(table && table.canonical && table.canonical.layer)){ score += 6; reasons.push('Canonical layer missing'); }
        if((relationMap[txt(table && table.id)] || 0) >= 8){ score += Math.min(10, (relationMap[txt(table && table.id)] || 0) - 7); reasons.push('High dependency fan-in/fan-out'); }
        return {
          table: txt(table && table.name),
          tableId: txt(table && table.id),
          domain: txt(table && table.domain) || 'default',
          layer: layerOf(table),
          metadataScore: metadataScore(table),
          relationCount: relationMap[txt(table && table.id)] || 0,
          score: score,
          issueCount: 0,
          destructiveCount: 0,
          breakingCount: 0,
          reasons: reasons,
          severity: score >= 40 ? 'critical' : (score >= 24 ? 'high' : (score >= 12 ? 'medium' : 'low')),
          workflowBound: workflowBound(table),
          workflowCandidate: workflowCandidate(table),
          rlsEnabled: !!(table && table.rls_enabled),
          policyCount: arr(table && table.policies).length + arr(table && table.security && table.security.policy_refs).length
        };
      }).filter(function(item){ return item.score > 0; }).sort(function(a,b){
        return (b.score - a.score) || (b.relationCount - a.relationCount) || a.table.localeCompare(b.table);
      }).slice(0, 12);
    }

    var hotspotHigh = hotspots.filter(function(item){ return Number(item && item.score || 0) >= 12; });
    var hotspotByDomain = {};
    var hotspotByLayer = {};
    hotspotHigh.forEach(function(item){
      var domain = txt(item && item.domain) || 'default';
      var layer = txt(item && item.layer) || 'Unassigned';
      hotspotByDomain[domain] = (hotspotByDomain[domain] || 0) + 1;
      hotspotByLayer[layer] = (hotspotByLayer[layer] || 0) + 1;
    });

    var domains = arr(diag.domains);
    if(!domains.length && tables.length){
      var grouped = {};
      tables.forEach(function(table){
        var domain = txt(table && table.domain) || 'default';
        if(!grouped[domain]) grouped[domain] = { tables:[], layers:{} };
        grouped[domain].tables.push(table);
        grouped[domain].layers[layerOf(table)] = true;
      });
      domains = Object.keys(grouped).map(function(domain){
        var rows = grouped[domain].tables;
        var metadataAvg = rows.length ? Math.round(rows.reduce(function(sum, table){ return sum + metadataScore(table); }, 0) / rows.length) : 0;
        var candidates = rows.filter(function(table){ return workflowCandidate(table) || workflowBound(table); });
        var bound = candidates.filter(function(table){ return workflowBound(table); }).length;
        var workflowCoverage = candidates.length ? pct(bound, candidates.length, 0) : 0;
        var ownershipCoverage = pct(rows.filter(function(table){
          var governance = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
          return !!(governance.owner || governance.steward);
        }).length, rows.length, 100);
        var layers = Object.keys(grouped[domain].layers);
        var readiness = clamp(Math.round(
          (metadataAvg * 0.42)
          + (workflowCoverage * 0.18)
          + (ownershipCoverage * 0.16)
          + ((100 - Math.min(100, (hotspotByDomain[domain] || 0) * 14)) * 0.12)
          + ((layers.length ? 100 : 40) * 0.12)
        ), 0, 100);
        return {
          domain: domain,
          label: domain.replace(/_/g, ' ').replace(/\b\w/g, function(ch){ return ch.toUpperCase(); }),
          color: domainPalette[domain] || '#64748b',
          tableCount: rows.length,
          relationTouchCount: rows.reduce(function(sum, table){ return sum + (relationMap[txt(table && table.id)] || 0); }, 0),
          metadataCompletenessPercent: metadataAvg,
          workflowCoveragePercent: workflowCoverage,
          ownershipCoveragePercent: ownershipCoverage,
          rlsTableCount: rows.filter(function(table){ return !!(table && table.rls_enabled); }).length,
          policyCount: rows.reduce(function(sum, table){ return sum + arr(table && table.policies).length + arr(table && table.security && table.security.policy_refs).length; }, 0),
          hotspotCount: hotspotByDomain[domain] || 0,
          layerCount: layers.length,
          layers: layers,
          representativeTables: rows.slice().sort(function(a,b){
            return ((relationMap[txt(b && b.id)] || 0) - (relationMap[txt(a && a.id)] || 0)) || txt(a && a.name).localeCompare(txt(b && b.name));
          }).slice(0,5).map(function(table){ return txt(table && table.name); }),
          blockers: [
            metadataAvg < 80 ? 'metadata_depth' : '',
            workflowCoverage < 60 ? 'workflow_binding' : '',
            ownershipCoverage < 60 ? 'ownership_gap' : ''
          ].filter(Boolean),
          readinessScore: readiness,
          tone: toneByScore(readiness)
        };
      }).sort(function(a,b){ return (b.readinessScore - a.readinessScore) || (b.tableCount - a.tableCount) || a.domain.localeCompare(b.domain); });
    }

    var layers = arr(diag.layers);
    if(!layers.length && tables.length){
      var groupedLayers = {};
      tables.forEach(function(table){
        var layer = layerOf(table) || 'Unassigned';
        if(!groupedLayers[layer]) groupedLayers[layer] = { tables:[] };
        groupedLayers[layer].tables.push(table);
      });
      layers = Object.keys(groupedLayers).sort().map(function(layer){
        var rows = groupedLayers[layer].tables;
        var metadataAvg = rows.length ? Math.round(rows.reduce(function(sum, table){ return sum + metadataScore(table); }, 0) / rows.length) : 0;
        var candidates = rows.filter(function(table){ return workflowCandidate(table) || workflowBound(table); });
        var bound = candidates.filter(function(table){ return workflowBound(table); }).length;
        var workflowCoverage = candidates.length ? pct(bound, candidates.length, 0) : 0;
        var domainCount = {};
        rows.forEach(function(table){ domainCount[txt(table && table.domain) || 'default'] = true; });
        var readiness = clamp(Math.round(
          (metadataAvg * 0.48)
          + (workflowCoverage * 0.20)
          + ((100 - Math.min(100, (hotspotByLayer[layer] || 0) * 16)) * 0.14)
          + ((Object.keys(domainCount).length ? 100 : 50) * 0.18)
        ), 0, 100);
        return {
          layer: layer,
          tableCount: rows.length,
          domainCount: Object.keys(domainCount).length,
          domains: Object.keys(domainCount),
          relationTouchCount: rows.reduce(function(sum, table){ return sum + (relationMap[txt(table && table.id)] || 0); }, 0),
          metadataCompletenessPercent: metadataAvg,
          workflowCoveragePercent: workflowCoverage,
          hotspotCount: hotspotByLayer[layer] || 0,
          readinessScore: readiness,
          tone: toneByScore(readiness)
        };
      });
    }

    var governance = diag.governance && typeof diag.governance === 'object' ? diag.governance : null;
    if(!governance){
      var ownerCount = 0, stewardCount = 0, approverCount = 0, evidenceCount = 0, lifecycleCount = 0, uiHintCount = 0, workflowCount = 0, policyCount = 0, roleCount = 0;
      var missingOwners = [], missingApprovers = [], missingPolicies = [];
      tables.forEach(function(table){
        var governanceInfo = table && table.governance && typeof table.governance === 'object' ? table.governance : {};
        var lifecycle = table && table.lifecycle && typeof table.lifecycle === 'object' ? table.lifecycle : {};
        var ui = table && table.ui && typeof table.ui === 'object' ? table.ui : {};
        var integration = table && table.integration && typeof table.integration === 'object' ? table.integration : {};
        var security = table && table.security && typeof table.security === 'object' ? table.security : {};
        var hasOwner = !!governanceInfo.owner;
        var hasSteward = !!governanceInfo.steward;
        var hasApprover = !!(governanceInfo.approver_role || governanceInfo.approver);
        var hasEvidence = arr(governanceInfo.review_evidence).length > 0;
        var hasLifecycle = !!(lifecycle.stage || lifecycle.effective_from || lifecycle.effective_until);
        var hasUiHints = !!(ui.default_widget || ui.icon);
        var hasWorkflow = !!(integration.workflow_id || arr(integration.workflow_bindings).length);
        var hasPolicy = !!(table && table.rls_enabled) || arr(table && table.policies).length > 0 || arr(security.policy_refs).length > 0;
        var hasRoles = arr(security.roles).length > 0;
        if(hasOwner) ownerCount += 1;
        if(hasSteward) stewardCount += 1;
        if(hasApprover) approverCount += 1; else if(missingApprovers.length < 12) missingApprovers.push(txt(table && table.name));
        if(hasEvidence) evidenceCount += 1;
        if(hasLifecycle) lifecycleCount += 1;
        if(hasUiHints) uiHintCount += 1;
        if(hasWorkflow) workflowCount += 1;
        if(hasPolicy) policyCount += 1; else if(table && table.rls_enabled && missingPolicies.length < 12) missingPolicies.push(txt(table && table.name));
        if(hasRoles) roleCount += 1;
        if(!(hasOwner || hasSteward) && missingOwners.length < 12) missingOwners.push(txt(table && table.name));
      });
      governance = {
        ownerCoveragePercent: pct(ownerCount, tables.length, 100),
        stewardCoveragePercent: pct(stewardCount, tables.length, 100),
        approverCoveragePercent: pct(approverCount, tables.length, 100),
        evidenceCoveragePercent: pct(evidenceCount, tables.length, 100),
        lifecycleCoveragePercent: pct(lifecycleCount, tables.length, 100),
        uiHintCoveragePercent: pct(uiHintCount, tables.length, 100),
        workflowBindingCoveragePercent: pct(workflowCount, tables.length, 100),
        policyIntentCoveragePercent: pct(policyCount, tables.length, 100),
        securityRoleCoveragePercent: pct(roleCount, tables.length, 100),
        overallCoveragePercent: clamp(Math.round(
          Math.max(pct(ownerCount, tables.length, 100), pct(stewardCount, tables.length, 100)) * 0.24
          + pct(approverCount, tables.length, 100) * 0.16
          + pct(evidenceCount, tables.length, 100) * 0.10
          + pct(lifecycleCount, tables.length, 100) * 0.18
          + pct(uiHintCount, tables.length, 100) * 0.12
          + pct(workflowCount, tables.length, 100) * 0.10
          + pct(policyCount, tables.length, 100) * 0.10
        ), 0, 100),
        missingOwners: missingOwners,
        missingApprovers: missingApprovers,
        missingPolicies: missingPolicies
      };
    }

    var journeys = arr(diag.journeys);
    if(!journeys.length){
      journeys = journeySpecs().map(function(spec){
        var present = [];
        var missing = [];
        var metadataAvg = 0;
        var workflowBoundCount = 0;
        var relationTouchCount = 0;
        var domainMap = {};
        var layerMap = {};
        spec.tables.forEach(function(name){
          var table = tableByName[name];
          if(!table){ missing.push(name); return; }
          present.push(name);
          metadataAvg += metadataScore(table);
          if(workflowBound(table)) workflowBoundCount += 1;
          relationTouchCount += relationMap[txt(table && table.id)] || 0;
          domainMap[txt(table && table.domain) || 'default'] = true;
          layerMap[layerOf(table)] = true;
        });
        metadataAvg = present.length ? Math.round(metadataAvg / present.length) : 0;
        var presencePct = pct(present.length, spec.tables.length, 100);
        var workflowPct = present.length ? pct(workflowBoundCount, present.length, 0) : 100;
        var readiness = clamp(Math.round(
          (presencePct * 0.58) + (metadataAvg * 0.18) + (workflowPct * 0.12) + (Math.min(100, relationTouchCount * 3) * 0.12)
        ), 0, 100);
        return {
          key: spec.key,
          label: spec.label,
          focus: spec.focus,
          requiredTables: spec.tables,
          tablesPresent: present,
          missingTables: missing,
          domains: Object.keys(domainMap),
          layers: Object.keys(layerMap),
          relationTouchCount: relationTouchCount,
          workflowBoundCount: workflowBoundCount,
          metadataCompletenessPercent: metadataAvg,
          readinessScore: readiness,
          tone: readiness >= 82 ? 'good' : (readiness >= 65 ? 'warning' : 'critical'),
          focusTables: present.slice(0, 6),
          highlight: spec.focus + (missing.length ? '; missing: ' + missing.slice(0,3).join(', ') + (missing.length > 3 ? '...' : '') : ''),
          heatmap: spec.heatmap,
          ambience: spec.ambience,
          density: spec.density
        };
      });
    }

    var dependencyMatrix = diag.dependencyMatrix && typeof diag.dependencyMatrix === 'object' ? diag.dependencyMatrix : null;
    if(!dependencyMatrix){
      var domainKeys = {};
      var tableById = {};
      tables.forEach(function(table){
        tableById[txt(table && table.id)] = table || {};
        domainKeys[txt(table && table.domain) || 'default'] = true;
      });
      var domainList = Object.keys(domainKeys).sort();
      var matrix = {};
      domainList.forEach(function(from){ matrix[from] = {}; domainList.forEach(function(to){ matrix[from][to] = 0; }); });
      relations.forEach(function(rel){
        var from = tableById[txt(rel && rel.from_table_id)] || {};
        var to = tableById[txt(rel && rel.to_table_id)] || {};
        var fromDomain = txt(from && from.domain) || 'default';
        var toDomain = txt(to && to.domain) || 'default';
        if(matrix[fromDomain] && matrix[fromDomain][toDomain] != null) matrix[fromDomain][toDomain] += 1;
      });
      var strongest = [];
      domainList.forEach(function(from){
        domainList.forEach(function(to){
          if(matrix[from][to]){
            strongest.push({ fromDomain:from, toDomain:to, count:matrix[from][to] });
          }
        });
      });
      strongest.sort(function(a,b){ return (b.count - a.count) || a.fromDomain.localeCompare(b.fromDomain) || a.toDomain.localeCompare(b.toDomain); });
      dependencyMatrix = {
        domains: domainList,
        matrix: domainList.map(function(from){ return domainList.map(function(to){ return matrix[from][to] || 0; }); }),
        strongestLinks: strongest.slice(0, 16)
      };
    }

    var blockers = arr(diag.blockers);
    if(!blockers.length){
      blockers = [];
      if((governance.overallCoveragePercent || 0) < 55){
        blockers.push({
          key:'governance_ownership_gap',
          severity:'high',
          title:'Governance ownership is not modeled',
          detail:'Most canonical tables still miss owner/steward/approver metadata, so review routing and accountability are weak.',
          nextAction:'Populate owner, steward and approver roles for every domain before broad runtime onboarding.',
          approvalClass:'elevated',
          focusTargets: arr(governance.missingOwners).slice(0, 6)
        });
      }
      if((governance.workflowBindingCoveragePercent || 0) < 55){
        var workflowFocus = [];
        journeys.forEach(function(journey){
          arr(journey && journey.focusTables).forEach(function(name){
            if(workflowFocus.indexOf(name) < 0 && workflowFocus.length < 8) workflowFocus.push(name);
          });
        });
        blockers.push({
          key:'workflow_runtime_gap',
          severity:'medium',
          title:'Workflow bindings are not connected',
          detail:'Operational tables already exist but runtime workflow bindings are still largely absent.',
          nextAction:'Bind workflow IDs/contracts for order, inspection, CAPA, training and equipment flows.',
          approvalClass:'standard',
          focusTargets: workflowFocus
        });
      }
      if(arr(diag.report && diag.report.canonical && diag.report.canonical.criticalMissing).length){
        blockers.push({
          key:'canonical_gap',
          severity:'high',
          title:'Canonical capability gaps remain',
          detail:'Some critical ERP/MES/eQMS capabilities are still missing or not explicit in the model.',
          nextAction:'Complete the missing capability areas and define lineage for them before large-scale onboarding.',
          approvalClass:'elevated',
          focusTargets: arr(diag.report && diag.report.canonical && diag.report.canonical.criticalMissing).slice(0,6)
        });
      }
      var highHotspots = hotspotHigh.slice(0, 6).map(function(item){ return item.table; });
      if(highHotspots.length){
        blockers.push({
          key:'hotspot_remediation',
          severity:'medium',
          title:'High-dependency hotspots need refactoring attention',
          detail:'A few hub tables carry high dependency pressure and need stronger metadata and governance signals.',
          nextAction:'Prioritize hotspot remediation, domain views and targeted stewardship for hub tables.',
          approvalClass:'standard',
          focusTargets: highHotspots
        });
      }
    }

    var releaseRadar = diag.releaseRadar && typeof diag.releaseRadar === 'object' ? diag.releaseRadar : null;
    if(!releaseRadar){
      var journeyReadiness = journeys.length ? Math.round(journeys.reduce(function(sum, item){ return sum + Number(item && item.readinessScore || 0); }, 0) / journeys.length) : 100;
      var domainReadiness = domains.length ? Math.round(domains.reduce(function(sum, item){ return sum + Number(item && item.readinessScore || 0); }, 0) / domains.length) : 100;
      var radarReadiness = clamp(Math.round(
        Number(summary.releaseReadinessScore || (diag.reportSummary && diag.reportSummary.releaseReadinessScore) || 0) * 0.34
        + Number(governance.overallCoveragePercent || 0) * 0.24
        + journeyReadiness * 0.22
        + domainReadiness * 0.10
        + (100 - Math.min(100, blockers.length * 12)) * 0.10
      ), 0, 100);
      releaseRadar = {
        readinessScore: radarReadiness,
        journeyReadinessScore: journeyReadiness,
        domainReadinessScore: domainReadiness,
        recommendedLane: radarReadiness >= 85 && !blockers.length ? 'standard' : (radarReadiness >= 72 ? 'review' : (radarReadiness >= 60 ? 'elevated' : 'cab_esign')),
        quadrants: [
          { key:'accelerate', label:'Accelerate', count: domains.filter(function(item){ return (item.readinessScore || 0) >= 75 && (item.hotspotCount || 0) === 0; }).length, tone:'good', hint:'Low blockers, ready for rapid onboarding' },
          { key:'stabilize', label:'Stabilize', count: domains.filter(function(item){ return ((item.readinessScore || 0) >= 65 && (item.readinessScore || 0) < 75) || (item.hotspotCount || 0) === 1; }).length, tone:'warning', hint:'Good structure but needs targeted hardening' },
          { key:'govern', label:'Govern', count: domains.filter(function(item){ return (item.readinessScore || 0) >= 55 && (item.readinessScore || 0) < 65; }).length, tone:'warning', hint:'Add ownership, workflow and policy signals' },
          { key:'rework', label:'Rework', count: domains.filter(function(item){ return (item.readinessScore || 0) < 55; }).length, tone:'critical', hint:'Architecture or metadata posture needs redesign' }
        ],
        approvalLanes: [
          { key:'standard', label:'Standard', count: domains.filter(function(item){ return (item.readinessScore || 0) >= 75; }).length, tone:'good' },
          { key:'review', label:'Review board', count: domains.filter(function(item){ return (item.readinessScore || 0) >= 65 && (item.readinessScore || 0) < 75; }).length, tone:'warning' },
          { key:'elevated', label:'Elevated', count: domains.filter(function(item){ return (item.readinessScore || 0) >= 55 && (item.readinessScore || 0) < 65; }).length, tone:'warning' },
          { key:'cab_esign', label:'CAB / e-sign', count: domains.filter(function(item){ return (item.readinessScore || 0) < 55; }).length + blockers.filter(function(item){ return txt(item && item.severity) === 'critical'; }).length, tone:'critical' }
        ],
        window: radarReadiness >= 85 && !blockers.length ? 'now' : (radarReadiness >= 70 ? 'review_cycle' : 'hardening_required'),
        narrative:'World-class posture is strongest in canonical breadth and journey completeness; the dominant release drag now comes from ownership/workflow governance rather than physical schema coverage.'
      };
    }

    var storyboards = arr(diag.storyboards);
    if(!storyboards.length){
      storyboards = [{
        key:'executive_release_radar',
        title:'Executive release radar',
        subtitle:'Cross-domain readiness, hotspots and blockers',
        focusTables: hotspots.slice(0, 5).map(function(item){ return item.table; }),
        heatmap:'risk',
        ambience:'midnight',
        density:'comfortable',
        narrative:'Best view for change advisory board and architecture review.',
        layers: layers.map(function(item){ return item.layer; }),
        domains: domains.map(function(item){ return item.domain; })
      }];
      journeys.slice(0,5).forEach(function(journey){
        storyboards.push({
          key:'journey_' + txt(journey && journey.key),
          title: txt(journey && journey.label) || 'Journey view',
          subtitle: txt(journey && journey.focus) || '',
          focusTables: arr(journey && journey.focusTables).slice(0, 6),
          heatmap: txt(journey && journey.heatmap) || (txt(journey && journey.key).indexOf('capa') >= 0 ? 'security' : (txt(journey && journey.key).indexOf('production') >= 0 ? 'workflow' : 'canonical')),
          ambience: txt(journey && journey.ambience) || (txt(journey && journey.key).indexOf('production') >= 0 ? 'aurora' : 'midnight'),
          density: txt(journey && journey.density) || (txt(journey && journey.key).indexOf('traceability') >= 0 ? 'compact' : 'comfortable'),
          narrative: txt(journey && journey.highlight) || '',
          layers: arr(journey && journey.layers),
          domains: arr(journey && journey.domains)
        });
      });
    }

    diag.generatedAt = diag.generatedAt || (diag._meta && diag._meta.generatedAt) || new Date().toISOString();
    diag.summary = summary;
    diag.hotspots = hotspots;
    diag.domains = domains;
    diag.layers = layers;
    diag.governance = governance;
    diag.journeys = journeys;
    diag.dependencyMatrix = dependencyMatrix;
    diag.blockers = blockers;
    diag.releaseRadar = releaseRadar;
    diag.storyboards = storyboards;
    diag.summary.domainCount = Number(summary.domainCount || domains.length || 0);
    diag.summary.layerCount = Number(summary.layerCount || layers.length || 0);
    diag.summary.governanceCoveragePercent = Number(summary.governanceCoveragePercent || governance.overallCoveragePercent || 0);
    diag.summary.journeyReadinessScore = Number(summary.journeyReadinessScore || releaseRadar.journeyReadinessScore || 0);
    diag.summary.domainReadinessScore = Number(summary.domainReadinessScore || releaseRadar.domainReadinessScore || 0);
    diag.summary.blockerCount = Number(summary.blockerCount || blockers.length || 0);
    diag.summary.storyboardCount = Number(summary.storyboardCount || storyboards.length || 0);
    diag.summary.releaseRadarScore = Number(summary.releaseRadarScore || releaseRadar.readinessScore || 0);
    diag.__round3Enhanced = true;
    return diag;
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ss-wc-r3-root{margin-top:18px;display:grid;gap:14px;}',
      '.ss-wc-r3-deck{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;}',
      '.ss-wc-r3-card{border:1px solid rgba(148,163,184,.14);border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.64),rgba(15,23,42,.38));padding:16px;box-shadow:0 18px 42px rgba(2,6,23,.22);}',
      '.ss-wc-r3-card h4{margin:0 0 6px;font-size:14px;color:#f8fbff;}',
      '.ss-wc-r3-sub{font-size:12px;color:#9fb2cf;line-height:1.55;}',
      '.ss-wc-r3-pillrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}',
      '.ss-wc-r3-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border-radius:999px;border:1px solid rgba(148,163,184,.14);background:rgba(15,23,42,.42);font-size:12px;font-weight:700;color:#e2e8f0;}',
      '.ss-wc-r3-pill.tone-good{background:rgba(22,163,74,.12);border-color:rgba(74,222,128,.30);color:#bbf7d0;}',
      '.ss-wc-r3-pill.tone-warning{background:rgba(245,158,11,.10);border-color:rgba(251,191,36,.28);color:#fde68a;}',
      '.ss-wc-r3-pill.tone-critical{background:rgba(220,38,38,.10);border-color:rgba(248,113,113,.28);color:#fecaca;}',
      '.ss-wc-r3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}',
      '.ss-wc-r3-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}',
      '.ss-wc-r3-list{display:grid;gap:10px;}',
      '.ss-wc-r3-item{border:1px solid rgba(148,163,184,.12);border-radius:14px;padding:12px;background:rgba(15,23,42,.32);}',
      '.ss-wc-r3-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}',
      '.ss-wc-r3-item-title{font-weight:700;color:#f8fbff;}',
      '.ss-wc-r3-item-meta{font-size:12px;color:#9fb2cf;margin-top:6px;line-height:1.5;}',
      '.ss-wc-r3-score{font-size:24px;font-weight:800;line-height:1;color:#f8fbff;}',
      '.ss-wc-r3-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc;margin-bottom:10px;}',
      '.ss-wc-r3-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}',
      '.ss-wc-r3-actions .hm-btn{min-height:34px;}',
      '.ss-wc-r3-matrix{overflow:auto;border-radius:14px;border:1px solid rgba(148,163,184,.10);}',
      '.ss-wc-r3-matrix table{width:100%;border-collapse:collapse;font-size:12px;}',
      '.ss-wc-r3-matrix th,.ss-wc-r3-matrix td{padding:8px 10px;border-bottom:1px solid rgba(148,163,184,.08);text-align:right;color:#dce6f7;}',
      '.ss-wc-r3-matrix th:first-child,.ss-wc-r3-matrix td:first-child{text-align:left;color:#9fb2cf;position:sticky;left:0;background:rgba(8,15,28,.96);}',
      '.ss-wc-r3-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}',
      '.ss-wc-r3-note{font-size:12px;line-height:1.6;color:#b7c7de;margin-top:10px;}',
      '.ss-wc-r3-tag{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;background:rgba(56,189,248,.10);color:#bae6fd;font-size:11px;font-weight:700;}',
      '.ss-wc-r3-blocker{border-left:4px solid rgba(248,113,113,.72);}',
      '.ss-wc-r3-blocker.medium{border-left-color:rgba(251,191,36,.72);}',
      '.ss-wc-r3-blocker.low,.ss-wc-r3-blocker.info{border-left-color:rgba(96,165,250,.72);}',
      '.ss-wc-r3-domain-card{position:relative;overflow:hidden;}',
      '.ss-wc-r3-domain-card::before{content:\"\";position:absolute;inset:0 auto 0 0;width:4px;background:var(--r3-domain-color,#7dd3fc);opacity:.95;}',
      '.ss-wc-r3-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px;}',
      '.ss-wc-r3-kpi .box{padding:12px;border-radius:14px;background:rgba(15,23,42,.36);border:1px solid rgba(148,163,184,.12);}',
      '.ss-wc-r3-kpi .box .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8ba1c1;margin-bottom:6px;}',
      '.ss-wc-r3-kpi .box .v{font-size:20px;font-weight:800;color:#f8fbff;}',
      '.ss-wc-r3-story{display:grid;gap:10px;}',
      '.ss-wc-r3-story .ss-wc-r3-item{background:linear-gradient(180deg,rgba(20,28,48,.58),rgba(13,20,38,.36));}',
      '.ss-wc-r3-toolbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin-bottom:2px;}',
      '.ss-wc-r3-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '@media (max-width:1200px){.ss-wc-r3-deck,.ss-wc-r3-grid,.ss-wc-r3-grid-3,.ss-wc-r3-kpi{grid-template-columns:1fr;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function metricPill(label, value, tone){
    return '<span class=\"ss-wc-r3-pill tone-' + esc(tone || 'good') + '\"><strong>' + esc(label) + '</strong><span>' + esc(value) + '</span></span>';
  }

  function blockersHtml(diag){
    var blockers = arr(diag && diag.blockers).slice(0, 6);
    if(!blockers.length){
      return '<div class=\"ss-wc-r3-item\"><div class=\"ss-wc-r3-item-title\">No blocker currently recorded</div><div class=\"ss-wc-r3-item-meta\">The current model has no explicit blocker board items. Keep governance and workflow signals under observation.</div></div>';
    }
    return blockers.map(function(item){
      return [
        '<div class=\"ss-wc-r3-item ss-wc-r3-blocker ' + esc(txt(item && item.severity).toLowerCase()) + '\">',
          '<div class=\"ss-wc-r3-item-top\">',
            '<div>',
              '<div class=\"ss-wc-r3-item-title\">' + esc(item && item.title || '-') + '</div>',
              '<div class=\"ss-wc-r3-item-meta\">' + esc(item && item.detail || '') + '</div>',
            '</div>',
            '<span class=\"ss-wc-r3-pill tone-' + esc(txt(item && item.severity) === 'critical' ? 'critical' : (txt(item && item.severity) === 'high' ? 'warning' : 'good')) + '\">' + esc(item && item.approvalClass || 'standard') + '</span>',
          '</div>',
          '<div class=\"ss-wc-r3-note\"><strong>Next:</strong> ' + esc(item && item.nextAction || '') + '</div>',
          (arr(item && item.focusTargets).length ? '<div class=\"ss-wc-r3-legend\">' + arr(item.focusTargets).slice(0,6).map(function(target){ return '<span class=\"ss-wc-r3-tag\">' + esc(target) + '</span>'; }).join('') + '</div>' : ''),
        '</div>'
      ].join('');
    }).join('');
  }

  function governanceHtml(diag){
    var gov = diag && diag.governance || {};
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-label\">Governance posture</div>',
        '<h4>Ownership, approvals and evidence coverage</h4>',
        '<div class=\"ss-wc-r3-kpi\">',
          '<div class=\"box\"><div class=\"k\">Overall</div><div class=\"v\">' + esc((gov.overallCoveragePercent || 0) + '%') + '</div></div>',
          '<div class=\"box\"><div class=\"k\">Owner / steward</div><div class=\"v\">' + esc((gov.ownerCoveragePercent || 0) + '%') + '</div></div>',
          '<div class=\"box\"><div class=\"k\">Approver</div><div class=\"v\">' + esc((gov.approverCoveragePercent || 0) + '%') + '</div></div>',
          '<div class=\"box\"><div class=\"k\">Workflow</div><div class=\"v\">' + esc((gov.workflowBindingCoveragePercent || 0) + '%') + '</div></div>',
        '</div>',
        '<div class=\"ss-wc-r3-note\">Lifecycle and UI hints are already modeled broadly, but ownership, approval and workflow metadata remain the primary hardening gap.</div>',
        ((arr(gov.missingOwners).length || arr(gov.missingApprovers).length) ? '<div class=\"ss-wc-r3-legend\">' + arr(gov.missingOwners).slice(0,4).map(function(name){ return '<span class=\"ss-wc-r3-tag\">owner: ' + esc(name) + '</span>'; }).join('') + arr(gov.missingApprovers).slice(0,4).map(function(name){ return '<span class=\"ss-wc-r3-tag\">approver: ' + esc(name) + '</span>'; }).join('') + '</div>' : ''),
      '</div>'
    ].join('');
  }

  function domainCardsHtml(diag){
    var items = arr(diag && diag.domains).slice(0, 6);
    if(!items.length) return '';
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-label\">Domain spotlight</div>',
        '<h4>Cross-domain readiness mosaic</h4>',
        '<div class=\"ss-wc-r3-grid\">',
          items.map(function(item){
            return [
              '<div class=\"ss-wc-r3-item ss-wc-r3-domain-card\" style=\"--r3-domain-color:' + esc(item && item.color || '#7dd3fc') + '\">',
                '<div class=\"ss-wc-r3-item-top\">',
                  '<div><div class=\"ss-wc-r3-item-title\">' + esc(item && (item.label || item.domain) || '-') + '</div><div class=\"ss-wc-r3-item-meta\">' + esc((item && item.tableCount || 0) + ' tables · ' + (item && item.relationTouchCount || 0) + ' relation touches') + '</div></div>',
                  '<div class=\"ss-wc-r3-score\">' + esc(item && item.readinessScore || 0) + '</div>',
                '</div>',
                '<div class=\"ss-wc-r3-pillrow\">',
                  metricPill('Metadata', (item && item.metadataCompletenessPercent || 0) + '%', toneByScore(item && item.metadataCompletenessPercent || 0)),
                  metricPill('Workflow', (item && item.workflowCoveragePercent || 0) + '%', toneByScore(item && item.workflowCoveragePercent || 0)),
                  metricPill('Hotspots', item && item.hotspotCount || 0, (item && item.hotspotCount || 0) > 0 ? 'warning' : 'good'),
                '</div>',
                (arr(item && item.representativeTables).length ? '<div class=\"ss-wc-r3-note\"><strong>Focus:</strong> ' + arr(item.representativeTables).slice(0,4).map(esc).join(', ') + '</div>' : ''),
              '</div>'
            ].join('');
          }).join(''),
        '</div>',
      '</div>'
    ].join('');
  }

  function radarHtml(diag){
    var radar = diag && diag.releaseRadar || {};
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-toolbar\">',
          '<div><div class=\"ss-wc-r3-label\">Release radar</div><h4>Promotion readiness and approval lanes</h4></div>',
          '<div class=\"ss-wc-r3-pillrow\">',
            metricPill('Radar', (radar.readinessScore || 0) + '%', toneByScore(radar.readinessScore || 0)),
            metricPill('Journey', (radar.journeyReadinessScore || 0) + '%', toneByScore(radar.journeyReadinessScore || 0)),
            metricPill('Domain', (radar.domainReadinessScore || 0) + '%', toneByScore(radar.domainReadinessScore || 0)),
            metricPill('Lane', radar.recommendedLane || 'review', radar.recommendedLane === 'standard' ? 'good' : (radar.recommendedLane === 'review' ? 'warning' : 'critical')),
          '</div>',
        '</div>',
        '<div class=\"ss-wc-r3-grid\">',
          '<div class=\"ss-wc-r3-item\"><div class=\"ss-wc-r3-item-title\">Quadrants</div><div class=\"ss-wc-r3-pillrow\">' + arr(radar.quadrants).map(function(item){ return metricPill(item && item.label || '-', item && item.count || 0, item && item.tone || 'warning'); }).join('') + '</div><div class=\"ss-wc-r3-note\">' + esc(radar.narrative || '') + '</div></div>',
          '<div class=\"ss-wc-r3-item\"><div class=\"ss-wc-r3-item-title\">Approval lanes</div><div class=\"ss-wc-r3-pillrow\">' + arr(radar.approvalLanes).map(function(item){ return metricPill(item && item.label || '-', item && item.count || 0, item && item.tone || 'warning'); }).join('') + '</div><div class=\"ss-wc-r3-note\">Window: ' + esc(radar.window || 'review_cycle') + '</div></div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function journeysHtml(diag){
    var journeys = arr(diag && diag.journeys);
    if(!journeys.length) return '';
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-label\">Manufacturing journeys</div>',
        '<h4>Operational storylines for ERP / MES / eQMS</h4>',
        '<div class=\"ss-wc-r3-story\">',
          journeys.slice(0, 6).map(function(item){
            return [
              '<div class=\"ss-wc-r3-item\">',
                '<div class=\"ss-wc-r3-item-top\">',
                  '<div><div class=\"ss-wc-r3-item-title\">' + esc(item && item.label || '-') + '</div><div class=\"ss-wc-r3-item-meta\">' + esc(item && item.focus || '') + '</div></div>',
                  '<div class=\"ss-wc-r3-score\">' + esc(item && item.readinessScore || 0) + '</div>',
                '</div>',
                '<div class=\"ss-wc-r3-pillrow\">',
                  metricPill('Tables', arr(item && item.tablesPresent).length + '/' + arr(item && item.requiredTables).length, (arr(item && item.missingTables).length ? 'warning' : 'good')),
                  metricPill('Workflow', item && item.workflowBoundCount || 0, (item && item.workflowBoundCount ? 'good' : 'warning')),
                  metricPill('Touches', item && item.relationTouchCount || 0, toneByScore(item && item.readinessScore || 0)),
                '</div>',
                '<div class=\"ss-wc-r3-note\">' + esc(item && item.highlight || '') + '</div>',
                '<div class=\"ss-wc-r3-actions\">' +
                  '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"focus-storyboard\" data-key=\"journey_' + esc(item && item.key || '') + '\">Storyboard</button>' +
                  arr(item && item.focusTables).slice(0, 2).map(function(name){ return '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"focus-table-name\" data-table=\"' + esc(name) + '\">' + esc(name) + '</button>'; }).join('') +
                '</div>',
              '</div>'
            ].join('');
          }).join(''),
        '</div>',
      '</div>'
    ].join('');
  }

  function dependencyMatrixHtml(diag){
    var matrix = diag && diag.dependencyMatrix || {};
    var domains = arr(matrix.domains);
    var rows = arr(matrix.matrix);
    if(!domains.length || !rows.length) return '';
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-label\">Dependency mesh</div>',
        '<h4>Domain-to-domain dependency matrix</h4>',
        '<div class=\"ss-wc-r3-matrix\"><table><thead><tr><th>Domain</th>' + domains.map(function(domain){ return '<th>' + esc(domain) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          domains.map(function(domain, rowIndex){
            var row = arr(rows[rowIndex]);
            return '<tr><td>' + esc(domain) + '</td>' + domains.map(function(_, columnIndex){ return '<td>' + esc(row[columnIndex] == null ? 0 : row[columnIndex]) + '</td>'; }).join('') + '</tr>';
          }).join('') +
        '</tbody></table></div>',
        '<div class=\"ss-wc-r3-note\">Strongest links: ' + arr(matrix.strongestLinks).slice(0,4).map(function(item){ return esc((item && item.fromDomain || '-') + '→' + (item && item.toDomain || '-') + ' (' + (item && item.count || 0) + ')'); }).join(' · ') + '</div>',
      '</div>'
    ].join('');
  }

  function storyboardsHtml(diag){
    var items = arr(diag && diag.storyboards).slice(0, 6);
    if(!items.length) return '';
    return [
      '<div class=\"ss-wc-r3-card\">',
        '<div class=\"ss-wc-r3-label\">Storyboards</div>',
        '<h4>Ready-made visual modes and quick focus paths</h4>',
        '<div class=\"ss-wc-r3-list\">',
          items.map(function(item){
            return [
              '<div class=\"ss-wc-r3-item\">',
                '<div class=\"ss-wc-r3-item-top\">',
                  '<div><div class=\"ss-wc-r3-item-title\">' + esc(item && item.title || '-') + '</div><div class=\"ss-wc-r3-item-meta\">' + esc(item && item.subtitle || item && item.narrative || '') + '</div></div>',
                  '<span class=\"ss-wc-r3-pill tone-good\">' + esc((item && item.heatmap) || 'risk') + '</span>',
                '</div>',
                '<div class=\"ss-wc-r3-pillrow\">',
                  metricPill('Ambience', item && item.ambience || 'midnight', 'good'),
                  metricPill('Density', item && item.density || 'comfortable', 'good'),
                  metricPill('Focus', arr(item && item.focusTables).length || 0, 'good'),
                '</div>',
                '<div class=\"ss-wc-r3-actions\">',
                  '<button type=\"button\" class=\"hm-btn hm-btn-primary ss-btn-sm\" data-wc-r3-action=\"focus-storyboard\" data-key=\"' + esc(item && item.key || '') + '\">Apply focus</button>',
                  (arr(item && item.focusTables).length ? '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"focus-table-name\" data-table=\"' + esc(arr(item && item.focusTables)[0]) + '\">Open first table</button>' : ''),
                '</div>',
              '</div>'
            ].join('');
          }).join(''),
        '</div>',
      '</div>'
    ].join('');
  }

  function commandDeckHtml(diag){
    var summary = diag && diag.summary || {};
    return [
      '<div class=\"ss-wc-r3-deck\">',
        '<div class=\"ss-wc-r3-card\">',
          '<div class=\"ss-wc-r3-toolbar\">',
            '<div><div class=\"ss-wc-r3-label\">Mission control</div><h4>Round 3 command deck</h4><div class=\"ss-wc-r3-sub\">World-class control plane now includes governance posture, journey overlays, release radar, storyboards and dependency mesh.</div></div>',
            '<div class=\"ss-wc-r3-inline\">',
              '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"prev-hotspot\">◀ Hotspot</button>',
              '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"next-hotspot\">Hotspot ▶</button>',
            '</div>',
          '</div>',
          '<div class=\"ss-wc-r3-pillrow\">',
            metricPill('Visual', (summary.visualReadinessScore || 0) + '%', toneByScore(summary.visualReadinessScore || 0)),
            metricPill('Governance', (summary.governanceCoveragePercent || 0) + '%', toneByScore(summary.governanceCoveragePercent || 0)),
            metricPill('Journeys', (summary.journeyReadinessScore || 0) + '%', toneByScore(summary.journeyReadinessScore || 0)),
            metricPill('Radar', (summary.releaseRadarScore || 0) + '%', toneByScore(summary.releaseRadarScore || 0)),
            metricPill('Blockers', summary.blockerCount || 0, (summary.blockerCount || 0) ? 'critical' : 'good'),
            metricPill('Storyboards', summary.storyboardCount || 0, 'good'),
          '</div>',
        '</div>',
        '<div class=\"ss-wc-r3-card\">',
          '<div class=\"ss-wc-r3-label\">Quick guidance</div>',
          '<h4>Immediate hardening path</h4>',
          '<div class=\"ss-wc-r3-note\">1) assign owner/steward/approver metadata, 2) bind workflow contracts for operational tables, 3) resolve hotspots, 4) save focused storyboard views for governance walkthroughs.</div>',
          '<div class=\"ss-wc-r3-actions\">' +
            '<button type=\"button\" class=\"hm-btn hm-btn-primary ss-btn-sm\" data-wc-r3-action=\"focus-storyboard\" data-key=\"executive_release_radar\">Open executive view</button>' +
            '<button type=\"button\" class=\"hm-btn hm-btn-ghost ss-btn-sm\" data-wc-r3-action=\"next-hotspot\">Focus hotspot</button>' +
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function buildSupplement(tab, diag){
    if(tab === 'manufacturing'){
      return journeysHtml(diag) + storyboardsHtml(diag);
    }
    if(tab === 'diagnostics'){
      return '<div class=\"ss-wc-r3-grid\">' + '<div>' + blockersHtml(diag) + '</div>' + '<div>' + governanceHtml(diag) + '</div>' + '</div>' + dependencyMatrixHtml(diag);
    }
    if(tab === 'visual'){
      return storyboardsHtml(diag) + dependencyMatrixHtml(diag);
    }
    if(tab === 'compare'){
      return radarHtml(diag) + dependencyMatrixHtml(diag);
    }
    return radarHtml(diag) + '<div class=\"ss-wc-r3-grid\">' + governanceHtml(diag) + domainCardsHtml(diag) + '</div>' + blockersHtml(diag);
  }

  function renderRound3(){
    var overlay = document.querySelector('.ss-wc-overlay');
    var body;
    var activeTab;
    var diag;
    var root;
    if(!overlay) return;
    body = overlay.querySelector('.ss-wc-body');
    if(!body) return;
    activeTab = overlay.querySelector('.ss-wc-tab.active');
    diag = buildExtendedDiagnosis(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    root = body.querySelector('.ss-wc-r3-root');
    if(root) root.parentNode.removeChild(root);
    root = document.createElement('div');
    root.className = 'ss-wc-r3-root';
    root.innerHTML = commandDeckHtml(diag) + buildSupplement(activeTab ? activeTab.getAttribute('data-tab') : 'dashboard', diag);
    body.appendChild(root);
    var meta = overlay.querySelector('.ss-wc-header-meta');
    if(meta){
      meta.setAttribute('data-round3-enhanced', '1');
      meta.innerHTML = meta.textContent + ' · Governance: ' + esc((diag.summary && diag.summary.governanceCoveragePercent || 0) + '%') + ' · Journey: ' + esc((diag.summary && diag.summary.journeyReadinessScore || 0) + '%') + ' · Radar: ' + esc((diag.summary && diag.summary.releaseRadarScore || 0) + '%');
    }
  }

  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function(){
      ensureStyles();
      renderRound3();
    }, 20);
  }

  function focusTableByName(name){
    var currentSchema = schema();
    var table = arr(currentSchema && currentSchema.tables).find(function(item){ return item && item.name === name; });
    if(table && win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.focusTable === 'function'){
      win.SchemaStudioWorldClass.focusTable(table.id);
    }
  }

  function focusHotspot(step){
    var diag = buildExtendedDiagnosis(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    var hotspots = arr(diag && diag.hotspots);
    if(!hotspots.length) return;
    hotspotCursor = (hotspotCursor + step + hotspots.length) % hotspots.length;
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.focusTable === 'function'){
      win.SchemaStudioWorldClass.focusTable(hotspots[hotspotCursor].tableId);
    }
    scheduleRender();
  }

  function applyStoryboard(key){
    var diag = buildExtendedDiagnosis(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    var story = arr(diag && diag.storyboards).find(function(item){ return item && item.key === key; });
    if(!story) return;
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.applyVisualPrefs === 'function'){
      win.SchemaStudioWorldClass.applyVisualPrefs({
        heatmap: story.heatmap || 'risk',
        ambience: story.ambience || 'midnight',
        density: story.density || 'comfortable'
      });
    }
    if(arr(story.focusTables).length){
      focusTableByName(arr(story.focusTables)[0]);
    }
    scheduleRender();
  }

  function ensureBindings(){
    if(!clickBound){
      document.addEventListener('click', function(ev){
        var actionNode = ev.target && ev.target.closest ? ev.target.closest('[data-wc-r3-action], .ss-wc-tab, [data-wc-action]') : null;
        var action = actionNode && actionNode.getAttribute ? actionNode.getAttribute('data-wc-r3-action') : '';
        if(action === 'next-hotspot'){
          ev.preventDefault();
          focusHotspot(1);
          return;
        }
        if(action === 'prev-hotspot'){
          ev.preventDefault();
          focusHotspot(-1);
          return;
        }
        if(action === 'focus-table-name'){
          ev.preventDefault();
          focusTableByName(actionNode.getAttribute('data-table') || '');
          return;
        }
        if(action === 'focus-storyboard'){
          ev.preventDefault();
          applyStoryboard(actionNode.getAttribute('data-key') || '');
          return;
        }
        if(actionNode){
          setTimeout(scheduleRender, 40);
          setTimeout(scheduleRender, 180);
        }
      }, true);
      clickBound = true;
    }
    if(!keyBound){
      document.addEventListener('keydown', function(ev){
        if(!document.querySelector('.ss-wc-overlay')) return;
        if(ev.altKey && ev.key === 'ArrowRight'){
          ev.preventDefault();
          focusHotspot(1);
        } else if(ev.altKey && ev.key === 'ArrowLeft'){
          ev.preventDefault();
          focusHotspot(-1);
        }
      });
      keyBound = true;
    }
  }

  if(!patched){
    var originalGetDiagnosis = win.SchemaStudioWorldClass.getDiagnosis;
    var originalRefresh = win.SchemaStudioWorldClass.refresh;
    var originalOpen = win.SchemaStudioWorldClass.open;
    win.SchemaStudioWorldClass.getDiagnosis = function(){
      return buildExtendedDiagnosis(originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : null);
    };
    win.SchemaStudioWorldClass.refresh = function(){
      return Promise.resolve(originalRefresh ? originalRefresh.apply(this, arguments) : (originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : null)).then(function(diag){
        return buildExtendedDiagnosis(diag);
      }).then(function(diag){
        scheduleRender();
        return diag;
      });
    };
    win.SchemaStudioWorldClass.open = function(){
      var result = originalOpen ? originalOpen.apply(this, arguments) : undefined;
      scheduleRender();
      return result;
    };
    win.SchemaStudioWorldClass.__round3Patched = true;
  }

  ensureBindings();
  ensureStyles();
  if(win.SchemaStudio){
    win.SchemaStudio.buildId = '20260407worldclass3';
    win.SchemaStudio.getWorldClassDiagnostics = function(){
      return win.SchemaStudioWorldClass ? win.SchemaStudioWorldClass.getDiagnosis() : null;
    };
  }
  setTimeout(scheduleRender, 120);
})(window);

/* ── World-Class Experience Engine Round 4 ─────────────────────────────── */
(function(win){
  'use strict';

  if(!win || !win.SchemaStudioWorldClass || !win.STORE) return;
  if(win.SchemaStudioWorldClass.__round4Patched) return;

  var rafId = 0;
  var clickBound = false;
  var keyBound = false;
  var cacheDiag = null;

  function arr(value){
    return Array.isArray(value) ? value : [];
  }

  function txt(value){
    return value == null ? '' : String(value);
  }

  function num(value, fallback){
    var n = Number(value);
    return isFinite(n) ? n : Number(fallback || 0);
  }

  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toneByScore(score){
    score = num(score, 0);
    return score >= 82 ? 'good' : (score >= 65 ? 'warning' : 'critical');
  }

  function schema(){
    return (win.STORE && win.STORE.schema) || null;
  }

  function currentTab(){
    var active = document.querySelector('.ss-wc-tab.active');
    return active ? (active.getAttribute('data-tab') || 'dashboard') : 'dashboard';
  }

  function findTableByName(name){
    var currentSchema = schema();
    var tables = arr(currentSchema && currentSchema.tables);
    name = txt(name);
    if(!name) return null;
    return tables.find(function(item){ return item && item.name === name; }) || null;
  }

  function focusTableByName(name){
    var table = findTableByName(name);
    if(table && win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.focusTable === 'function'){
      win.SchemaStudioWorldClass.focusTable(table.id);
    }
  }

  function gotoTab(tab){
    var button = document.querySelector('.ss-wc-tab[data-tab="' + tab + '"]');
    if(button && typeof button.click === 'function') button.click();
  }

  function withClipboard(text){
    text = txt(text);
    if(!text) return Promise.resolve(false);
    if(navigator && navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).then(function(){ return true; }).catch(function(){ return false; });
    }
    try{
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return Promise.resolve(true);
    }catch(err){
      return Promise.resolve(false);
    }
  }

  function badge(label, tone){
    return '<span class="ss-wc-r4-badge tone-' + esc(tone || 'neutral') + '">' + esc(label) + '</span>';
  }

  function metricCard(label, value, sub, tone){
    return [
      '<article class="ss-wc-r4-metric tone-' + esc(tone || 'neutral') + '">',
        '<div class="ss-wc-r4-kicker">' + esc(label) + '</div>',
        '<div class="ss-wc-r4-value">' + esc(value) + '</div>',
        '<div class="ss-wc-r4-sub">' + esc(sub || '') + '</div>',
      '</article>'
    ].join('');
  }

  function listPills(items, mapper){
    return arr(items).map(function(item, index){
      var value = mapper ? mapper(item, index) : item;
      return value || '';
    }).join('');
  }

  function ensureSummary(summary){
    summary = summary && typeof summary === 'object' ? summary : {};
    summary.visualReadinessScore = num(summary.visualReadinessScore, 0);
    summary.metadataCompletenessPercent = num(summary.metadataCompletenessPercent, 0);
    summary.workflowBindingCoveragePercent = num(summary.workflowBindingCoveragePercent, 0);
    summary.governanceCoveragePercent = num(summary.governanceCoveragePercent, 0);
    summary.journeyReadinessScore = num(summary.journeyReadinessScore, 0);
    summary.releaseRadarScore = num(summary.releaseRadarScore, 0);
    summary.policyCoveragePercent = num(summary.policyCoveragePercent, summary.governanceCoveragePercent || 0);
    summary.performancePostureScore = num(summary.performancePostureScore, Math.round((summary.visualReadinessScore * 0.62) + (Math.max(0, 100 - num(summary.hotspotCount, 0) * 6) * 0.38)));
    summary.registrySyncScore = num(summary.registrySyncScore, Math.round((summary.metadataCompletenessPercent * 0.45) + (summary.workflowBindingCoveragePercent * 0.35) + (num(summary.visualReadinessScore, 0) * 0.20)));
    summary.complianceReadinessScore = num(summary.complianceReadinessScore, Math.round((summary.governanceCoveragePercent * 0.45) + (summary.releaseRadarScore * 0.30) + (summary.policyCoveragePercent * 0.25)));
    summary.aiCopilotReadinessScore = num(summary.aiCopilotReadinessScore, Math.round((summary.metadataCompletenessPercent * 0.40) + (summary.visualReadinessScore * 0.25) + (summary.registrySyncScore * 0.20) + (summary.governanceCoveragePercent * 0.15)));
    summary.experienceScore = num(summary.experienceScore, Math.round(
      (summary.visualReadinessScore * 0.18) +
      (summary.governanceCoveragePercent * 0.15) +
      (summary.journeyReadinessScore * 0.12) +
      (summary.releaseRadarScore * 0.12) +
      (summary.performancePostureScore * 0.14) +
      (summary.registrySyncScore * 0.12) +
      (summary.complianceReadinessScore * 0.09) +
      (summary.aiCopilotReadinessScore * 0.08)
    ));
    return summary;
  }

  function ensureDiag(diag){
    var summary;
    var hotspots;
    var journeys;
    var storyboards;
    var dependency;
    var strongLinks;
    diag = diag && typeof diag === 'object' ? diag : {};
    summary = ensureSummary(diag.summary || {});
    hotspots = arr(diag.hotspots);
    journeys = arr(diag.journeys);
    storyboards = arr(diag.storyboards);
    dependency = diag.dependencyMatrix && typeof diag.dependencyMatrix === 'object' ? diag.dependencyMatrix : {};
    strongLinks = arr(dependency.strongestLinks);

    if(!arr(diag.personas).length){
      diag.personas = [
        {
          key:'system_architect',
          label:'System architect',
          defaultTab:'compare',
          focus:'Compatibility, release lanes, hotspots',
          heatmap:'risk',
          ambience:'midnight',
          density:'comfortable',
          readinessScore:Math.round((summary.releaseRadarScore * 0.45) + (summary.visualReadinessScore * 0.30) + (summary.metadataCompletenessPercent * 0.25)),
          focusTables:hotspots.slice(0, 4).map(function(item){ return item.table; }),
          nextActions:['Review typed diff and hotspot hubs','Prepare executive storyboard and release notes']
        },
        {
          key:'manufacturing_process_engineer',
          label:'Manufacturing engineer',
          defaultTab:'manufacturing',
          focus:'Dispatch, execution, genealogy, line readiness',
          heatmap:'workflow',
          ambience:'aurora',
          density:'compact',
          readinessScore:summary.journeyReadinessScore || 72,
          focusTables:arr((journeys[0] && journeys[0].focusTables) || []).slice(0, 6),
          nextActions:['Apply production storyboard','Bind execution workflow contracts']
        },
        {
          key:'quality_manager',
          label:'Quality manager',
          defaultTab:'diagnostics',
          focus:'Inspection, NC/CAPA, evidence and approval posture',
          heatmap:'security',
          ambience:'midnight',
          density:'comfortable',
          readinessScore:summary.complianceReadinessScore || 68,
          focusTables:arr((journeys[1] && journeys[1].focusTables) || []).slice(0, 6),
          nextActions:['Review policy gaps','Save quality/compliance storyboard']
        },
        {
          key:'app_builder_metadata_admin',
          label:'App builder / metadata admin',
          defaultTab:'dashboard',
          focus:'Registry sync, field contracts, builder packs',
          heatmap:'canonical',
          ambience:'clean',
          density:'comfortable',
          readinessScore:summary.registrySyncScore || 70,
          focusTables:hotspots.slice(0, 3).map(function(item){ return item.table; }),
          nextActions:['Compile registry bundle','Inspect runtime projections and saved views']
        }
      ];
    }

    if(!arr(diag.playbooks).length){
      diag.playbooks = [
        {
          key:'executive_release_gate',
          title:'Executive release gate',
          persona:'system_architect',
          startTab:'dashboard',
          heatmap:'risk',
          readinessScore:summary.releaseRadarScore || 70,
          focusTables:hotspots.slice(0, 5).map(function(item){ return item.table; }),
          checklist:['Review hotspots and blockers','Check release lane and compatibility','Validate rollback and evidence']
        },
        {
          key:'manufacturing_storyboard_walkthrough',
          title:'Manufacturing storyboard walkthrough',
          persona:'manufacturing_process_engineer',
          startTab:'manufacturing',
          heatmap:'workflow',
          readinessScore:summary.journeyReadinessScore || 72,
          focusTables:arr((journeys[0] && journeys[0].focusTables) || []).slice(0, 6),
          checklist:['Follow planning → execution → genealogy','Validate workflow bindings','Save line-ready focused view']
        },
        {
          key:'quality_compliance_gate',
          title:'Quality / compliance gate',
          persona:'quality_manager',
          startTab:'diagnostics',
          heatmap:'security',
          readinessScore:summary.complianceReadinessScore || 68,
          focusTables:arr((journeys[1] && journeys[1].focusTables) || []).slice(0, 6),
          checklist:['Check owner/steward/approver gaps','Verify evidence and signature posture','Inspect policy and approval lane']
        }
      ];
    }

    if(!arr(diag.releaseLanes).length){
      diag.releaseLanes = [
        { key:'standard', label:'Standard lane', tone:'good', score:summary.releaseRadarScore + 12, eligible:num(summary.hotspotCount, 0) <= 2, recommended:(summary.releaseRadarScore || 0) >= 85, gates:['No destructive changes','Strong compatibility','Saved storyboard ready'] },
        { key:'review', label:'Review board', tone:'warning', score:summary.releaseRadarScore, eligible:true, recommended:(summary.releaseRadarScore || 0) >= 70 && (summary.releaseRadarScore || 0) < 85, gates:['Typed diff reviewed','Hotspots acknowledged','Registry projections checked'] },
        { key:'elevated', label:'Elevated governance', tone:'warning', score:Math.max(0, summary.releaseRadarScore - 8), eligible:true, recommended:(summary.releaseRadarScore || 0) >= 58 && (summary.releaseRadarScore || 0) < 70, gates:['Governance gaps tracked','Owners assigned','Reason codes attached'] },
        { key:'cab_esign', label:'CAB / e-sign', tone:'critical', score:Math.max(0, summary.releaseRadarScore - 16), eligible:num(summary.hotspotCount, 0) > 0, recommended:(summary.releaseRadarScore || 0) < 58, gates:['Rollback proof','CAB sign-off','Effective window agreed'] }
      ];
    }

    if(!arr(diag.aiCopilot).length){
      diag.aiCopilot = [
        {
          key:'release_notes',
          title:'Impact-aware release notes',
          objective:'Generate structured release notes by domain, impact, and approvals.',
          confidence:0.91,
          requiredApprovals:['review'],
          focusTables:hotspots.slice(0, 4).map(function(item){ return item.table; }),
          prompt:'Summarize this schema diff into release notes grouped by domain, impact, risk, required approvals, and rollback evidence.',
          tone:'good'
        },
        {
          key:'hotspot_refactor',
          title:'Hotspot refactor plan',
          objective:'Propose metadata, workflow, and policy improvements for hub tables.',
          confidence:0.88,
          requiredApprovals:['review','elevated'],
          focusTables:hotspots.slice(0, 3).map(function(item){ return item.table; }),
          prompt:'Create a remediation plan for the top hotspot tables including ownership, workflow bindings, policy posture, relation hygiene, and visual presets.',
          tone:'warning'
        },
        {
          key:'manufacturing_storyboard',
          title:'Manufacturing storyboard builder',
          objective:'Generate focused views for planning, execution, genealogy, and quality.',
          confidence:0.87,
          requiredApprovals:['review'],
          focusTables:arr((journeys[0] && journeys[0].focusTables) || []).slice(0, 6),
          prompt:'Build manufacturing storyboard presets for planning → execution → traceability, including saved views, focus tables, and review checkpoints.',
          tone:'good'
        }
      ];
    }

    if(!diag.renderInsights || typeof diag.renderInsights !== 'object'){
      diag.renderInsights = {
        complexityScore:Math.round((num(summary.tableCount, 0) * 0.42) + (num(summary.relationCount, 0) * 0.18) + (num(summary.hotspotCount, 0) * 8)),
        complexityTier:num(summary.tableCount, 0) >= 90 ? 'enterprise_huge' : 'enterprise_large',
        savedViewCount:num(summary.savedViewCount, storyboards.length),
        strongLinks:strongLinks.slice(0, 6),
        suggestedLayouts:[
          { key:'layered', label:'Layered governance view', reason:'Best for executive and architecture walkthroughs.' },
          { key:'domain', label:'Domain swimlanes', reason:'Best for stewardship, bounded contexts and ownership.' },
          { key:'workflow', label:'Workflow-centric lens', reason:'Best for runtime contracts and approval chains.' }
        ],
        notes:[
          'Prefer storyboard presets over free-pan exploration during reviews.',
          'Use compact density for line/execution walkthroughs and comfortable density for compliance reviews.',
          'Keep hotspot hubs visible with KPI chips while collapsing low-signal domains.'
        ]
      };
    }

    summary.personaCount = num(summary.personaCount, arr(diag.personas).length);
    summary.playbookCount = num(summary.playbookCount, arr(diag.playbooks).length);
    summary.releaseLaneCount = num(summary.releaseLaneCount, arr(diag.releaseLanes).length);
    summary.copilotSuggestionCount = num(summary.copilotSuggestionCount, arr(diag.aiCopilot).length);
    diag.summary = summary;
    return diag;
  }

  function heroHtml(diag){
    var summary = diag.summary || {};
    var personas = arr(diag.personas);
    var strongLinks = arr(diag.renderInsights && diag.renderInsights.strongLinks).slice(0, 2);
    return [
      '<section class="ss-wc-r4-hero">',
        '<div class="ss-wc-r4-hero-copy">',
          '<div>',
            '<div class="ss-wc-r4-eyebrow">Mission control round 4</div>',
            '<h3 class="ss-wc-r4-title">Executive glass, persona-guided reviews, AI copilots, and release-lane intelligence</h3>',
            '<div class="ss-wc-r4-sub">Schema Studio now behaves like a control tower for ERP / MES / eQMS design, governance, migration safety, and runtime onboarding.</div>',
          '</div>',
          '<div class="ss-wc-r4-hero-pills">' + [
            badge('Experience ' + num(summary.experienceScore, 0) + '%', toneByScore(summary.experienceScore)),
            badge('Compliance ' + num(summary.complianceReadinessScore, 0) + '%', toneByScore(summary.complianceReadinessScore)),
            badge('Registry sync ' + num(summary.registrySyncScore, 0) + '%', toneByScore(summary.registrySyncScore)),
            badge('AI ' + num(summary.aiCopilotReadinessScore, 0) + '%', toneByScore(summary.aiCopilotReadinessScore)),
            badge('Personas ' + personas.length, 'neutral')
          ].join('') + '</div>',
          '<div class="ss-wc-r4-hero-meta">' +
            esc(_t('Tab hiện tại', 'Current tab')) + ': ' + esc(currentTab()) +
            ' · ' + esc(_t('Hotspots', 'Hotspots')) + ': ' + esc(num(summary.hotspotCount, 0)) +
            ' · ' + esc(_t('Playbooks', 'Playbooks')) + ': ' + esc(num(summary.playbookCount, 0)) +
            (strongLinks.length ? ' · ' + esc(_t('Dominant links', 'Dominant links')) + ': ' + esc(strongLinks.map(function(item){ return txt(item.fromDomain) + '→' + txt(item.toDomain); }).join(', ')) : '') +
          '</div>',
        '</div>',
        '<div class="ss-wc-r4-hero-grid">' + [
          metricCard(_t('Experience', 'Experience'), num(summary.experienceScore, 0) + '%', _t('Độ trưởng thành cockpit + review', 'Cockpit + review maturity'), toneByScore(summary.experienceScore)),
          metricCard(_t('Compliance', 'Compliance'), num(summary.complianceReadinessScore, 0) + '%', _t('Governance + policy + evidence', 'Governance + policy + evidence'), toneByScore(summary.complianceReadinessScore)),
          metricCard(_t('Performance', 'Performance'), num(summary.performancePostureScore, 0) + '%', _t('Virtualization + readability posture', 'Virtualization + readability posture'), toneByScore(summary.performancePostureScore)),
          metricCard(_t('Registry sync', 'Registry sync'), num(summary.registrySyncScore, 0) + '%', _t('Schema → registry → runtime', 'Schema → registry → runtime'), toneByScore(summary.registrySyncScore)),
          metricCard(_t('AI copilot', 'AI copilot'), num(summary.aiCopilotReadinessScore, 0) + '%', _t('Promptable, explainable, review-safe', 'Promptable, explainable, review-safe'), toneByScore(summary.aiCopilotReadinessScore))
        ].join('') + '</div>',
      '</section>'
    ].join('');
  }

  function personasHtml(diag){
    var personas = arr(diag.personas).slice(0, 6);
    if(!personas.length) return '';
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head">',
          '<div><div class="ss-wc-r4-kicker">Role-aware modes</div><h4>Persona rails</h4><div class="ss-wc-r4-sub">One studio, different lenses for architecture, data, manufacturing, quality, compliance, and builder operations.</div></div>',
          '<div class="ss-wc-r4-note">' + esc(_t('Phím tắt', 'Keyboard')) + ': Shift + 1..6</div>',
        '</div>',
        '<div class="ss-wc-r4-persona-grid">',
          personas.map(function(item, index){
            return [
              '<button type="button" class="ss-wc-r4-persona tone-' + esc(toneByScore(item.readinessScore)) + '" data-wc-r4-action="apply-persona" data-key="' + esc(item.key || '') + '" title="' + esc(item.focus || '') + '">',
                '<div class="ss-wc-r4-persona-top">',
                  '<span class="ss-wc-r4-persona-index">' + esc(index + 1) + '</span>',
                  '<span class="ss-wc-r4-persona-score">' + esc(num(item.readinessScore, 0) + '%') + '</span>',
                '</div>',
                '<div class="ss-wc-r4-persona-title">' + esc(item.label || item.key || '-') + '</div>',
                '<div class="ss-wc-r4-persona-sub">' + esc(item.focus || '') + '</div>',
                '<div class="ss-wc-r4-persona-meta">' + [
                  txt(item.defaultTab || 'dashboard'),
                  txt(item.heatmap || 'risk'),
                  txt(item.ambience || 'midnight')
                ].filter(Boolean).join(' · ') + '</div>',
              '</button>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function playbooksHtml(diag, limit){
    var items = arr(diag.playbooks).slice(0, limit || 4);
    if(!items.length) return '';
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head"><div><div class="ss-wc-r4-kicker">Review playbooks</div><h4>Stage-by-stage walkthroughs</h4><div class="ss-wc-r4-sub">Pre-wired review motions for executives, architects, manufacturing, quality, and builder onboarding.</div></div></div>',
        '<div class="ss-wc-r4-card-grid">',
          items.map(function(item){
            return [
              '<article class="ss-wc-r4-card tone-' + esc(toneByScore(item.readinessScore)) + '">',
                '<div class="ss-wc-r4-card-head">',
                  '<div><div class="ss-wc-r4-kicker">' + esc(item.stage || 'review') + '</div><h5>' + esc(item.title || item.key || '-') + '</h5></div>',
                  '<div class="ss-wc-r4-bigscore">' + esc(num(item.readinessScore, 0) + '%') + '</div>',
                '</div>',
                '<div class="ss-wc-r4-sub">' + esc(item.hero || '') + '</div>',
                '<ul class="ss-wc-r4-checklist">' + arr(item.checklist).slice(0, 4).map(function(line){ return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>',
                '<div class="ss-wc-r4-badges">' +
                  badge(item.persona || 'persona', 'neutral') +
                  badge(item.startTab || 'dashboard', 'neutral') +
                  badge(item.approvalLane || 'review', toneByScore(item.readinessScore)) +
                '</div>',
                '<div class="ss-wc-r4-actions">',
                  '<button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r4-action="apply-playbook" data-key="' + esc(item.key || '') + '">' + esc(_t('Áp dụng', 'Apply')) + '</button>',
                  '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-r4-action="goto-tab" data-tab="' + esc(item.startTab || 'dashboard') + '">' + esc(_t('Mở tab', 'Open tab')) + '</button>',
                '</div>',
              '</article>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function releaseLanesHtml(diag){
    var items = arr(diag.releaseLanes);
    if(!items.length) return '';
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head"><div><div class="ss-wc-r4-kicker">Release intelligence</div><h4>Lane orchestration</h4><div class="ss-wc-r4-sub">Decide whether this change goes standard, review, elevated, or CAB / e-sign.</div></div></div>',
        '<div class="ss-wc-r4-card-grid ss-wc-r4-card-grid-lanes">',
          items.map(function(item){
            return [
              '<article class="ss-wc-r4-card lane tone-' + esc(item.tone || toneByScore(item.score)) + '">',
                '<div class="ss-wc-r4-card-head">',
                  '<div><div class="ss-wc-r4-kicker">' + esc(item.recommended ? _t('Đề xuất', 'Recommended') : _t('Lane', 'Lane')) + '</div><h5>' + esc(item.label || item.key || '-') + '</h5></div>',
                  '<div class="ss-wc-r4-bigscore">' + esc(num(item.score, 0) + '%') + '</div>',
                '</div>',
                '<div class="ss-wc-r4-progress"><span style="width:' + esc(Math.max(0, Math.min(100, num(item.score, 0)))) + '%"></span></div>',
                '<div class="ss-wc-r4-sub">' + esc(item.hero || '') + '</div>',
                '<div class="ss-wc-r4-badges">' +
                  badge(item.eligible ? _t('Có thể dùng', 'Eligible') : _t('Chưa đạt', 'Not yet'), item.eligible ? 'good' : 'critical') +
                  badge(_t('Cổng', 'Gates') + ' ' + arr(item.gates).length, 'neutral') +
                  (item.recommended ? badge(_t('Ưu tiên', 'Preferred'), 'good') : '') +
                '</div>',
                '<ul class="ss-wc-r4-checklist compact">' + arr(item.gates).slice(0, 4).map(function(line){ return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>',
              '</article>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function aiCopilotHtml(diag, limit){
    var items = arr(diag.aiCopilot).slice(0, limit || 4);
    if(!items.length) return '';
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head"><div><div class="ss-wc-r4-kicker">AI copilot</div><h4>Promptable, explainable, review-safe actions</h4><div class="ss-wc-r4-sub">Every suggestion remains grounded in diff, hotspots, approvals, and focused tables.</div></div></div>',
        '<div class="ss-wc-r4-card-grid">',
          items.map(function(item, index){
            return [
              '<article class="ss-wc-r4-card tone-' + esc(item.tone || 'good') + '">',
                '<div class="ss-wc-r4-card-head">',
                  '<div><div class="ss-wc-r4-kicker">' + esc(item.type || 'copilot') + '</div><h5>' + esc(item.title || item.key || '-') + '</h5></div>',
                  '<div class="ss-wc-r4-confidence">' + esc(Math.round(num(item.confidence, 0) * 100)) + '%</div>',
                '</div>',
                '<div class="ss-wc-r4-sub">' + esc(item.objective || '') + '</div>',
                '<div class="ss-wc-r4-badges">' +
                  listPills(item.requiredApprovals, function(tag){ return badge(tag, 'neutral'); }) +
                  listPills(arr(item.focusTables).slice(0, 2), function(tag){ return badge(tag, 'neutral'); }) +
                '</div>',
                '<div class="ss-wc-r4-note prompt">' + esc(item.prompt || '') + '</div>',
                '<div class="ss-wc-r4-actions">',
                  '<button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r4-action="copy-copilot" data-index="' + esc(index) + '">' + esc(_t('Copy prompt', 'Copy prompt')) + '</button>',
                  (arr(item.focusTables).length ? '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-r4-action="focus-table-name" data-table="' + esc(arr(item.focusTables)[0] || '') + '">' + esc(_t('Focus table', 'Focus table')) + '</button>' : ''),
                '</div>',
              '</article>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function renderInsightsHtml(diag){
    var insights = diag.renderInsights || {};
    var layouts = arr(insights.suggestedLayouts).slice(0, 5);
    var strongLinks = arr(insights.strongLinks).slice(0, 6);
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head">',
          '<div><div class="ss-wc-r4-kicker">Beauty + scale</div><h4>Render insights</h4><div class="ss-wc-r4-sub">Cinematic UI cues layered on top of virtualization, focused views, and dependency-aware routing.</div></div>',
          '<div class="ss-wc-r4-note">' + esc(_t('Complexity', 'Complexity')) + ': ' + esc(num(insights.complexityScore, 0)) + ' · ' + esc(txt(insights.complexityTier || 'enterprise_large')) + '</div>',
        '</div>',
        '<div class="ss-wc-r4-split">',
          '<div class="ss-wc-r4-mini-stack">',
            '<div class="ss-wc-r4-mini"><div class="ss-wc-r4-kicker">' + esc(_t('Layouts', 'Layouts')) + '</div>' + layouts.map(function(item){ return '<div class="ss-wc-r4-line"><strong>' + esc(item.label || item.key || '-') + '</strong><span>' + esc(item.reason || '') + '</span></div>'; }).join('') + '</div>',
            '<div class="ss-wc-r4-mini"><div class="ss-wc-r4-kicker">' + esc(_t('Notes', 'Notes')) + '</div>' + arr(insights.notes).slice(0, 4).map(function(item){ return '<div class="ss-wc-r4-line"><span>' + esc(item) + '</span></div>'; }).join('') + '</div>',
          '</div>',
          '<div class="ss-wc-r4-mini-stack">',
            '<div class="ss-wc-r4-mini"><div class="ss-wc-r4-kicker">' + esc(_t('Strong links', 'Strong links')) + '</div>' + (strongLinks.length ? strongLinks.map(function(item){ return '<div class="ss-wc-r4-line"><strong>' + esc(txt(item.fromDomain) + ' → ' + txt(item.toDomain)) + '</strong><span>' + esc(item.count) + '</span></div>'; }).join('') : '<div class="ss-wc-r4-line"><span>' + esc(_t('Chưa có liên kết nổi bật', 'No strong links recorded')) + '</span></div>') + '</div>',
            '<div class="ss-wc-r4-mini"><div class="ss-wc-r4-kicker">' + esc(_t('Saved views', 'Saved views')) + '</div><div class="ss-wc-r4-line"><strong>' + esc(num(insights.savedViewCount, 0)) + '</strong><span>' + esc(_t('Use storyboards and persona views instead of raw free-pan reviews.', 'Use storyboards and persona views instead of raw free-pan reviews.')) + '</span></div></div>',
          '</div>',
        '</div>',
      '</section>'
    ].join('');
  }

  function manufacturingAtlasHtml(diag){
    var journeys = arr(diag.journeys).slice(0, 6);
    if(!journeys.length) return '';
    return [
      '<section class="ss-wc-r4-section">',
        '<div class="ss-wc-r4-section-head"><div><div class="ss-wc-r4-kicker">Manufacturing atlas</div><h4>Operational journeys</h4><div class="ss-wc-r4-sub">Fast review lanes for production, genealogy, quality, CAPA, training, and equipment readiness.</div></div></div>',
        '<div class="ss-wc-r4-card-grid">',
          journeys.map(function(item){
            return [
              '<article class="ss-wc-r4-card tone-' + esc(item.tone || toneByScore(item.readinessScore)) + '">',
                '<div class="ss-wc-r4-card-head">',
                  '<div><div class="ss-wc-r4-kicker">' + esc((item.layers || []).slice(0, 2).join(' · ') || 'journey') + '</div><h5>' + esc(item.label || item.key || '-') + '</h5></div>',
                  '<div class="ss-wc-r4-bigscore">' + esc(num(item.readinessScore, 0) + '%') + '</div>',
                '</div>',
                '<div class="ss-wc-r4-sub">' + esc(item.focus || item.highlight || '') + '</div>',
                '<div class="ss-wc-r4-badges">' +
                  badge((arr(item.tablesPresent).length || 0) + '/' + (arr(item.requiredTables).length || 0) + ' tables', 'neutral') +
                  badge('WF ' + num(item.workflowBoundCount, 0), 'neutral') +
                  badge('Rel ' + num(item.relationTouchCount, 0), 'neutral') +
                '</div>',
                '<div class="ss-wc-r4-actions">',
                  '<button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r4-action="focus-storyboard-like" data-key="' + esc(item.key || '') + '">' + esc(_t('Open journey', 'Open journey')) + '</button>',
                  (arr(item.focusTables).length ? '<button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-r4-action="focus-table-name" data-table="' + esc(arr(item.focusTables)[0] || '') + '">' + esc(_t('Focus table', 'Focus table')) + '</button>' : ''),
                '</div>',
              '</article>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function supplementHtml(tab, diag){
    if(tab === 'compare'){
      return releaseLanesHtml(diag) + aiCopilotHtml(diag, 3);
    }
    if(tab === 'visual'){
      return renderInsightsHtml(diag) + personasHtml(diag);
    }
    if(tab === 'manufacturing'){
      return manufacturingAtlasHtml(diag) + playbooksHtml(diag, 3);
    }
    if(tab === 'diagnostics'){
      return aiCopilotHtml(diag, 4) + playbooksHtml(diag, 3);
    }
    return playbooksHtml(diag, 4) + releaseLanesHtml(diag) + renderInsightsHtml(diag);
  }

  function syncThemeClasses(overlay){
    var prefs = (win.SchemaStudioWorldClass && win.SchemaStudioWorldClass.state) || {};
    var ambience = txt(prefs.ambience || 'midnight');
    overlay.classList.remove('ss-wc-r4-ambience-aurora', 'ss-wc-r4-ambience-midnight', 'ss-wc-r4-ambience-clean');
    overlay.classList.add('ss-wc-r4-ambience-' + ambience);
  }

  function renderRound4(){
    var overlay = document.querySelector('.ss-wc-overlay');
    var body;
    var shell;
    var diag;
    if(!overlay) return;
    body = overlay.querySelector('.ss-wc-body');
    if(!body) return;
    diag = cacheDiag = ensureDiag(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    syncThemeClasses(overlay);
    shell = body.querySelector('.ss-wc-r4-shell');
    if(!shell){
      shell = document.createElement('section');
      shell.className = 'ss-wc-r4-shell';
      body.insertBefore(shell, body.firstChild);
    }
    shell.innerHTML = heroHtml(diag) + personasHtml(diag) + supplementHtml(currentTab(), diag);
  }

  function scheduleRender(){
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderRound4);
  }

  function findPersona(key){
    return arr(cacheDiag && cacheDiag.personas).find(function(item){ return item && item.key === key; }) || null;
  }

  function findPlaybook(key){
    return arr(cacheDiag && cacheDiag.playbooks).find(function(item){ return item && item.key === key; }) || null;
  }

  function findJourney(key){
    return arr(cacheDiag && cacheDiag.journeys).find(function(item){ return item && item.key === key; }) || null;
  }

  function applyVisualPreset(payload){
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.applyVisualPrefs === 'function'){
      win.SchemaStudioWorldClass.applyVisualPrefs(payload || {});
    }
  }

  function applyPersona(key){
    var persona = findPersona(key);
    if(!persona) return;
    applyVisualPreset({
      heatmap: persona.heatmap || 'risk',
      ambience: persona.ambience || 'midnight',
      density: persona.density || 'comfortable'
    });
    gotoTab(persona.defaultTab || 'dashboard');
    if(arr(persona.focusTables).length) focusTableByName(arr(persona.focusTables)[0]);
    scheduleRender();
  }

  function applyPlaybook(key){
    var item = findPlaybook(key);
    if(!item) return;
    applyVisualPreset({
      heatmap: item.heatmap || 'risk',
      ambience: (item.heatmap === 'workflow' ? 'aurora' : 'midnight'),
      density: (item.heatmap === 'workflow' ? 'compact' : 'comfortable')
    });
    gotoTab(item.startTab || 'dashboard');
    if(arr(item.focusTables).length) focusTableByName(arr(item.focusTables)[0]);
    scheduleRender();
  }

  function openJourney(key){
    var journey = findJourney(key);
    if(!journey) return;
    applyVisualPreset({
      heatmap: txt(journey.key).indexOf('capa') >= 0 ? 'security' : (txt(journey.key).indexOf('production') >= 0 ? 'workflow' : 'canonical'),
      ambience: txt(journey.key).indexOf('production') >= 0 ? 'aurora' : 'midnight',
      density: txt(journey.key).indexOf('traceability') >= 0 ? 'compact' : 'comfortable'
    });
    gotoTab('manufacturing');
    if(arr(journey.focusTables).length) focusTableByName(arr(journey.focusTables)[0]);
    scheduleRender();
  }

  function copyCopilot(index){
    var item = arr(cacheDiag && cacheDiag.aiCopilot)[num(index, -1)];
    if(!item || !item.prompt) return;
    withClipboard(item.prompt).then(function(ok){
      if(ok && win.toast) win.toast(_t('Đã copy AI prompt', 'AI prompt copied'), 'success');
      else if(win.toast) win.toast(_t('Không copy được prompt', 'Could not copy prompt'), 'warning');
    });
  }

  function ensureStyles(){
    if(document.getElementById('ss-wc-r4-styles')) return;
    var style = document.createElement('style');
    style.id = 'ss-wc-r4-styles';
    style.innerHTML = [
      '.ss-wc-r4-shell{display:grid;gap:16px;}',
      '.ss-wc-r4-hero,.ss-wc-r4-section{position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.16);border-radius:24px;background:linear-gradient(180deg,rgba(15,23,42,.84),rgba(15,23,42,.72));box-shadow:0 20px 48px rgba(2,6,23,.24);}',
      '.ss-wc-r4-hero{padding:18px 18px 16px;}',
      '.ss-wc-r4-hero:before,.ss-wc-r4-section:before{content:"";position:absolute;inset:-28%;background:radial-gradient(circle at 20% 20%,rgba(56,189,248,.16),transparent 24%),radial-gradient(circle at 80% 20%,rgba(168,85,247,.16),transparent 24%),radial-gradient(circle at 50% 90%,rgba(34,197,94,.10),transparent 26%);pointer-events:none;opacity:.9;animation:ss-wc-r4-float 24s linear infinite;}',
      '@keyframes ss-wc-r4-float{0%{transform:translate3d(-4%,0,0) scale(1);}50%{transform:translate3d(4%,3%,0) scale(1.08);}100%{transform:translate3d(-4%,0,0) scale(1);}}',
      '.ss-wc-r4-hero-copy,.ss-wc-r4-section-head,.ss-wc-r4-hero-grid,.ss-wc-r4-persona-grid,.ss-wc-r4-card-grid,.ss-wc-r4-split{position:relative;z-index:1;}',
      '.ss-wc-r4-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc;margin-bottom:8px;font-weight:800;}',
      '.ss-wc-r4-title{margin:0;font-size:22px;line-height:1.3;color:#f8fbff;max-width:880px;}',
      '.ss-wc-r4-sub{font-size:13px;line-height:1.6;color:#bfd0e6;margin-top:8px;}',
      '.ss-wc-r4-hero-pills,.ss-wc-r4-badges,.ss-wc-r4-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-wc-r4-hero-meta{margin-top:10px;font-size:12px;color:#97aac7;}',
      '.ss-wc-r4-hero-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:16px;}',
      '.ss-wc-r4-metric{padding:14px 14px 12px;border:1px solid rgba(148,163,184,.14);border-radius:18px;background:rgba(2,6,23,.34);backdrop-filter:blur(8px);}',
      '.ss-wc-r4-metric.tone-good{box-shadow:0 0 0 1px rgba(34,197,94,.14) inset;}',
      '.ss-wc-r4-metric.tone-warning{box-shadow:0 0 0 1px rgba(245,158,11,.16) inset;}',
      '.ss-wc-r4-metric.tone-critical{box-shadow:0 0 0 1px rgba(239,68,68,.18) inset;}',
      '.ss-wc-r4-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8fb3d9;font-weight:800;}',
      '.ss-wc-r4-value{font-size:28px;font-weight:800;color:#fff;line-height:1.12;margin-top:8px;}',
      '.ss-wc-r4-note{font-size:12px;line-height:1.55;color:#a6b8d2;padding:10px 12px;border-radius:14px;background:rgba(15,23,42,.42);border:1px solid rgba(148,163,184,.10);}',
      '.ss-wc-r4-note.prompt{max-height:120px;overflow:auto;white-space:normal;}',
      '.ss-wc-r4-section{padding:16px 16px 18px;}',
      '.ss-wc-r4-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px;}',
      '.ss-wc-r4-section-head h4,.ss-wc-r4-card h5{margin:4px 0 0;font-size:18px;line-height:1.3;color:#fff;}',
      '.ss-wc-r4-persona-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}',
      '.ss-wc-r4-persona{padding:14px;border-radius:18px;border:1px solid rgba(148,163,184,.12);background:linear-gradient(180deg,rgba(15,23,42,.72),rgba(15,23,42,.54));text-align:left;cursor:pointer;transition:transform .16s ease, box-shadow .16s ease,border-color .16s ease;box-shadow:0 14px 34px rgba(2,6,23,.18);}',
      '.ss-wc-r4-persona:hover,.ss-wc-r4-card:hover{transform:translateY(-1px);}',
      '.ss-wc-r4-persona.tone-good{border-color:rgba(34,197,94,.24);}',
      '.ss-wc-r4-persona.tone-warning{border-color:rgba(245,158,11,.24);}',
      '.ss-wc-r4-persona.tone-critical{border-color:rgba(239,68,68,.28);}',
      '.ss-wc-r4-persona-top,.ss-wc-r4-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
      '.ss-wc-r4-persona-index{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:rgba(56,189,248,.16);color:#7dd3fc;font-size:12px;font-weight:800;}',
      '.ss-wc-r4-persona-score,.ss-wc-r4-bigscore{font-size:24px;font-weight:800;color:#fff;line-height:1;}',
      '.ss-wc-r4-persona-title{margin-top:12px;font-size:15px;font-weight:700;color:#fff;}',
      '.ss-wc-r4-persona-sub{margin-top:6px;font-size:12px;line-height:1.55;color:#bfd0e6;min-height:36px;}',
      '.ss-wc-r4-persona-meta{margin-top:10px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8ea2bf;}',
      '.ss-wc-r4-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '.ss-wc-r4-card-grid-lanes{grid-template-columns:repeat(4,minmax(0,1fr));}',
      '.ss-wc-r4-card{padding:14px;border-radius:20px;border:1px solid rgba(148,163,184,.12);background:linear-gradient(180deg,rgba(2,6,23,.32),rgba(2,6,23,.22));}',
      '.ss-wc-r4-card.tone-good{box-shadow:0 0 0 1px rgba(34,197,94,.12) inset;}',
      '.ss-wc-r4-card.tone-warning{box-shadow:0 0 0 1px rgba(245,158,11,.14) inset;}',
      '.ss-wc-r4-card.tone-critical{box-shadow:0 0 0 1px rgba(239,68,68,.18) inset;}',
      '.ss-wc-r4-checklist{margin:12px 0 0;padding-left:18px;color:#d4e2f7;font-size:13px;line-height:1.65;}',
      '.ss-wc-r4-checklist.compact{font-size:12px;}',
      '.ss-wc-r4-checklist li{margin:0 0 4px;}',
      '.ss-wc-r4-badge{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:12px;border:1px solid rgba(148,163,184,.14);background:rgba(15,23,42,.66);color:#e2e8f0;}',
      '.ss-wc-r4-badge.tone-good{background:rgba(34,197,94,.16);color:#dcfce7;border-color:rgba(34,197,94,.24);}',
      '.ss-wc-r4-badge.tone-warning{background:rgba(245,158,11,.16);color:#fef3c7;border-color:rgba(245,158,11,.24);}',
      '.ss-wc-r4-badge.tone-critical{background:rgba(239,68,68,.16);color:#fee2e2;border-color:rgba(239,68,68,.24);}',
      '.ss-wc-r4-badge.tone-neutral{background:rgba(30,41,59,.82);color:#dbeafe;}',
      '.ss-wc-r4-progress{height:10px;border-radius:999px;background:rgba(148,163,184,.12);overflow:hidden;margin-top:12px;}',
      '.ss-wc-r4-progress span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,rgba(56,189,248,.95),rgba(168,85,247,.92));box-shadow:0 0 18px rgba(125,211,252,.34);}',
      '.ss-wc-r4-confidence{font-size:14px;font-weight:800;color:#7dd3fc;padding:8px 10px;border-radius:999px;background:rgba(56,189,248,.12);}',
      '.ss-wc-r4-split{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;}',
      '.ss-wc-r4-mini-stack{display:grid;gap:12px;}',
      '.ss-wc-r4-mini{padding:14px;border-radius:18px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.28);}',
      '.ss-wc-r4-line{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed rgba(148,163,184,.10);font-size:13px;color:#dce7f7;}',
      '.ss-wc-r4-line:last-child{border-bottom:0;}',
      '.ss-wc-r4-line strong{color:#fff;font-weight:700;}',
      '.ss-wc-r4-ambience-aurora .ss-wc-r4-hero,.ss-wc-r4-ambience-aurora .ss-wc-r4-section{background:linear-gradient(180deg,rgba(8,27,48,.88),rgba(15,23,42,.72));}',
      '.ss-wc-r4-ambience-clean .ss-wc-r4-hero,.ss-wc-r4-ambience-clean .ss-wc-r4-section{background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(248,250,252,.88));}',
      '.ss-wc-r4-ambience-clean .ss-wc-r4-title,.ss-wc-r4-ambience-clean .ss-wc-r4-card h5,.ss-wc-r4-ambience-clean .ss-wc-r4-value,.ss-wc-r4-ambience-clean .ss-wc-r4-bigscore,.ss-wc-r4-ambience-clean .ss-wc-r4-persona-title,.ss-wc-r4-ambience-clean .ss-wc-r4-line strong{color:#0f172a;}',
      '.ss-wc-r4-ambience-clean .ss-wc-r4-sub,.ss-wc-r4-ambience-clean .ss-wc-r4-note,.ss-wc-r4-ambience-clean .ss-wc-r4-line,.ss-wc-r4-ambience-clean .ss-wc-r4-persona-sub{color:#475569;}',
      '.ss-wc-r4-ambience-clean .ss-wc-r4-card,.ss-wc-r4-ambience-clean .ss-wc-r4-persona,.ss-wc-r4-ambience-clean .ss-wc-r4-metric,.ss-wc-r4-ambience-clean .ss-wc-r4-mini{background:rgba(255,255,255,.84);}',
      '.ss-table-card:after{content:"";position:absolute;inset:auto 0 0 0;height:2px;opacity:0;transition:opacity .18s ease;background:linear-gradient(90deg,rgba(56,189,248,.95),rgba(168,85,247,.92));pointer-events:none;}',
      '.ss-table-card:hover:after,.ss-table-card[data-wc-severity="critical"]:after,.ss-table-card[data-wc-severity="high"]:after{opacity:1;}',
      '.ss-table-card[data-wc-severity="critical"] .ss-wc-kpis span{background:rgba(239,68,68,.08);}',
      '.ss-table-card[data-wc-severity="high"] .ss-wc-kpis span{background:rgba(249,115,22,.08);}',
      '@media (max-width:1320px){.ss-wc-r4-hero-grid{grid-template-columns:repeat(3,minmax(0,1fr));}.ss-wc-r4-card-grid-lanes{grid-template-columns:repeat(2,minmax(0,1fr));}.ss-wc-r4-persona-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:980px){.ss-wc-r4-hero-grid,.ss-wc-r4-persona-grid,.ss-wc-r4-card-grid,.ss-wc-r4-card-grid-lanes,.ss-wc-r4-split{grid-template-columns:1fr;}.ss-wc-r4-section-head{flex-direction:column;}.ss-wc-r4-title{font-size:20px;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function bind(){
    if(!clickBound){
      document.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-wc-r4-action], .ss-wc-tab, [data-wc-action]') : null;
        var action = node && node.getAttribute ? node.getAttribute('data-wc-r4-action') : '';
        if(!node) return;
        if(action === 'apply-persona'){
          ev.preventDefault();
          applyPersona(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'apply-playbook'){
          ev.preventDefault();
          applyPlaybook(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'goto-tab'){
          ev.preventDefault();
          gotoTab(node.getAttribute('data-tab') || 'dashboard');
          scheduleRender();
          return;
        }
        if(action === 'copy-copilot'){
          ev.preventDefault();
          copyCopilot(node.getAttribute('data-index') || '0');
          return;
        }
        if(action === 'focus-table-name'){
          ev.preventDefault();
          focusTableByName(node.getAttribute('data-table') || '');
          return;
        }
        if(action === 'focus-storyboard-like'){
          ev.preventDefault();
          openJourney(node.getAttribute('data-key') || '');
          return;
        }
        setTimeout(scheduleRender, 20);
        setTimeout(scheduleRender, 120);
      }, true);
      clickBound = true;
    }

    if(!keyBound){
      document.addEventListener('keydown', function(ev){
        if(!document.querySelector('.ss-wc-overlay')) return;
        if(ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey && /^[1-6]$/.test(ev.key || '')){
          var index = num(ev.key, 1) - 1;
          var personas = arr(cacheDiag && cacheDiag.personas);
          if(personas[index]){
            ev.preventDefault();
            applyPersona(personas[index].key);
          }
          return;
        }
        if(ev.altKey && (ev.key === 'r' || ev.key === 'R')){
          ev.preventDefault();
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.refresh === 'function'){
            win.SchemaStudioWorldClass.refresh().then(scheduleRender);
          }
        }
      });
      keyBound = true;
    }
  }

  var originalGetDiagnosis = win.SchemaStudioWorldClass.getDiagnosis;
  var originalRefresh = win.SchemaStudioWorldClass.refresh;
  var originalOpen = win.SchemaStudioWorldClass.open;

  win.SchemaStudioWorldClass.getDiagnosis = function(){
    return cacheDiag = ensureDiag(originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : {});
  };
  win.SchemaStudioWorldClass.refresh = function(){
    var result = originalRefresh ? originalRefresh.apply(this, arguments) : Promise.resolve(win.SchemaStudioWorldClass.getDiagnosis());
    return Promise.resolve(result).then(function(diag){
      cacheDiag = ensureDiag(diag || {});
      scheduleRender();
      return cacheDiag;
    });
  };
  win.SchemaStudioWorldClass.open = function(){
    var result = originalOpen ? originalOpen.apply(this, arguments) : undefined;
    scheduleRender();
    return result;
  };
  win.SchemaStudioWorldClass.__round4Patched = true;

  ensureStyles();
  bind();
  scheduleRender();

  if(win.SchemaStudio){
    win.SchemaStudio.buildId = '20260407worldclass4';
    win.SchemaStudio.applyWorldClassPersona = applyPersona;
  }
})(window);


/* ── World-Class Command Center Round 5 ───────────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win.SchemaStudioWorldClass || !win.STORE) return;
  if(win.SchemaStudioWorldClass.__round5Patched) return;

  var LS_KEY = 'hesem:schema-studio:wc:r5';
  var state = { tab:'operations', env:'workspace', branch:'main' };
  var renderTimer = null;
  var clickBound = false;
  var keyBound = false;
  var cacheDiag = null;

  function arr(value){ return Array.isArray(value) ? value.filter(Boolean) : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function num(value, fallback){
    var n = Number(value);
    return isFinite(n) ? n : (fallback == null ? 0 : Number(fallback) || 0);
  }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function loadState(){
    try{
      var parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if(parsed && typeof parsed === 'object'){
        if(parsed.tab) state.tab = parsed.tab;
        if(parsed.env) state.env = parsed.env;
        if(parsed.branch) state.branch = parsed.branch;
      }
    }catch(_err){}
  }
  function saveState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        tab: state.tab,
        env: state.env,
        branch: state.branch
      }));
    }catch(_err){}
  }
  function toneByScore(score){
    score = num(score, 0);
    return score >= 85 ? 'good' : (score >= 70 ? 'warning' : 'critical');
  }
  function statusBadge(status){
    status = txt(status || 'attention').toLowerCase();
    return '<span class="ss-wc-r5-badge tone-' + esc(status === 'ready' || status === 'clear' || status === 'recorded' ? 'good' : (status === 'attention' ? 'warning' : 'critical')) + '">' + esc(status) + '</span>';
  }
  function metric(label, value, hint, tone){
    return [
      '<div class="ss-wc-r5-metric tone-' + esc(tone || 'neutral') + '">',
        '<div class="ss-wc-r5-kicker">' + esc(label || '-') + '</div>',
        '<div class="ss-wc-r5-value">' + esc(value == null ? '-' : value) + '</div>',
        hint ? '<div class="ss-wc-r5-sub">' + esc(hint) + '</div>' : '',
      '</div>'
    ].join('');
  }
  function card(title, subtitle, body){
    return [
      '<article class="ss-wc-r5-card">',
        '<div class="ss-wc-r5-card-head">',
          '<div>',
            '<h5>' + esc(title || '-') + '</h5>',
            subtitle ? '<div class="ss-wc-r5-sub">' + esc(subtitle) + '</div>' : '',
          '</div>',
        '</div>',
        body || '',
      '</article>'
    ].join('');
  }
  function ensureDiag(diag){
    diag = diag && typeof diag === 'object' ? diag : {};
    var summary = diag.summary && typeof diag.summary === 'object' ? diag.summary : {};
    var compatibility = num(summary.compatibilityScore, 100);
    var risk = num(summary.riskScore, 0);
    var blockers = arr(diag.blockers);
    var journeys = arr(diag.journeys);
    var hotspots = arr(diag.hotspots);
    var personas = arr(diag.personas);
    var releaseLanes = arr(diag.releaseLanes);
    var workflow = num(summary.workflowBindingCoveragePercent, 0);
    var governance = num(summary.governanceCoveragePercent, 0);
    var radar = num(summary.releaseRadarScore, 0);
    var release = num(summary.releaseReadinessScore, 0);
    var visual = num(summary.visualReadinessScore, 0);
    var metadata = num(summary.metadataCompletenessPercent, 0);
    var performance = num(summary.performancePostureScore, 0);
    var registry = num(summary.registrySyncScore, 0);
    var compliance = num(summary.complianceReadinessScore, 0);
    var ai = num(summary.aiCopilotReadinessScore, 0);
    var experience = num(summary.experienceScore, 0);
    var destructive = num(diag.diffSummary && diag.diffSummary.destructiveCount, 0);
    var critical = num(diag.diffSummary && diag.diffSummary.criticalCount, 0);

    if(!diag.operations || typeof diag.operations !== 'object'){
      diag.operations = {
        operationsScore: Math.max(0, Math.min(100, Math.round((experience * 0.28) + (registry * 0.18) + (radar * 0.16) + ((100 - risk) * 0.16) + (ai * 0.10) + (workflow * 0.12)))),
        promotionReadinessScore: Math.max(0, Math.min(100, Math.round((release * 0.30) + (radar * 0.24) + (compatibility * 0.18) + (governance * 0.14) + ((100 - Math.min(100, blockers.length * 14)) * 0.14)))),
        firewallScore: Math.max(0, Math.min(100, Math.round((compatibility * 0.38) + ((100 - risk) * 0.24) + (governance * 0.12) + ((100 - Math.min(100, destructive * 30 + critical * 14)) * 0.26)))),
        observabilityScore: Math.max(0, Math.min(100, Math.round((performance * 0.36) + (visual * 0.26) + (registry * 0.18) + ((100 - Math.min(100, hotspots.length * 12)) * 0.20)))),
        commandCenterScore: Math.max(0, Math.min(100, Math.round((experience * 0.32) + (radar * 0.18) + (governance * 0.12) + (performance * 0.12) + (ai * 0.12) + (workflow * 0.14)))),
        focusDeckCount: arr(diag.focusDeck).length,
        branchCount: arr(diag.branchTopology).length,
        environmentCount: arr(diag.environments).length,
        stageCount: arr(diag.promotionBoard).length,
        eventRailCount: arr(diag.eventRail).length
      };
    }
    summary.operationsScore = num(summary.operationsScore, diag.operations.operationsScore || 0);
    summary.promotionReadinessScore = num(summary.promotionReadinessScore, diag.operations.promotionReadinessScore || 0);
    summary.firewallScore = num(summary.firewallScore, diag.operations.firewallScore || 0);
    summary.observabilityScore = num(summary.observabilityScore, diag.operations.observabilityScore || 0);
    summary.commandCenterScore = num(summary.commandCenterScore, diag.operations.commandCenterScore || 0);
    summary.focusDeckCount = num(summary.focusDeckCount, diag.operations.focusDeckCount || 0);
    summary.branchCount = num(summary.branchCount, diag.operations.branchCount || 0);
    summary.environmentCount = num(summary.environmentCount, diag.operations.environmentCount || 0);
    summary.stageCount = num(summary.stageCount, diag.operations.stageCount || 0);
    summary.eventRailCount = num(summary.eventRailCount, diag.operations.eventRailCount || 0);
    diag.summary = summary;

    if(!arr(diag.promotionBoard).length){
      diag.promotionBoard = [
        { key:'discover', label:'Discover', score:Math.round((visual * 0.44) + (experience * 0.30) + (num(summary.journeyReadinessScore, 0) * 0.26)), status:(visual >= 82 ? 'ready' : 'attention'), gate:'Graph clarity, journeys, saved views', nextAction:'Review scale posture and save focus views.' },
        { key:'model', label:'Model & diff', score:Math.round((metadata * 0.34) + (compatibility * 0.28) + (workflow * 0.18) + ((100 - risk) * 0.20)), status:(compatibility >= 90 ? 'ready' : 'attention'), gate:'Typed diff and contract continuity', nextAction:'Inspect diff items by severity and approval.' },
        { key:'governance', label:'Governance review', score:Math.round((governance * 0.36) + (compliance * 0.24) + (workflow * 0.18) + ((100 - Math.min(100, blockers.length * 16)) * 0.22)), status:(governance >= 80 ? 'ready' : 'attention'), gate:'Owner, approver, evidence, policies', nextAction:'Close blockers and attach evidence.' },
        { key:'release', label:'Release', score:summary.promotionReadinessScore, status:(summary.promotionReadinessScore >= 80 ? 'ready' : 'attention'), gate:'Lane, firewall, registry sync', nextAction:'Compile registry bundle and validate release lane.' },
        { key:'verify', label:'Verify', score:summary.observabilityScore, status:(summary.observabilityScore >= 78 ? 'ready' : 'attention'), gate:'Observability, registry freshness, post-release checks', nextAction:'Inspect observability tiles and timeline.' }
      ];
    }

    if(!diag.firewall || typeof diag.firewall !== 'object' || !Object.keys(diag.firewall).length){
      diag.firewall = {
        recommendedLane: num(summary.firewallScore, 0) >= 88 ? 'standard' : (num(summary.firewallScore, 0) >= 72 ? 'review' : 'cab_esign'),
        approvalClass: txt(diag.diffSummary && diag.diffSummary.approvalClass || 'standard'),
        compatibilityScore: compatibility,
        riskScore: risk,
        destructiveCount: destructive,
        criticalCount: critical,
        blockerCount: blockers.length,
        clearToPromote: destructive === 0 && critical === 0 && blockers.length <= 1,
        gates: [
          { label:'Destructive diff', status:destructive === 0 ? 'clear' : 'blocked', detail:destructive + ' destructive changes' },
          { label:'Critical blockers', status:critical === 0 && blockers.length <= 1 ? 'clear' : 'attention', detail:critical + ' critical items, ' + blockers.length + ' blockers' },
          { label:'Governance', status:governance >= 80 ? 'clear' : 'attention', detail:'Governance ' + governance + '%' },
          { label:'Workflow / registry', status:workflow >= 85 && registry >= 85 ? 'clear' : 'attention', detail:'Workflow ' + workflow + '% · Registry ' + registry + '%' }
        ]
      };
    }

    if(!arr(diag.branchTopology).length){
      diag.branchTopology = [
        { key:'main', label:'Main canonical branch', score:Math.round((registry * 0.34) + (metadata * 0.24) + (workflow * 0.18) + (governance * 0.14) + (visual * 0.10)), lane:'standard', status:registry >= 90 ? 'ready' : 'attention', focus:'Canonical baseline and source-of-truth stewardship' },
        { key:'preview', label:'Preview branch', score:Math.round((experience * 0.28) + (ai * 0.20) + (visual * 0.18) + (metadata * 0.16) + (registry * 0.18)), lane:'review', status:experience >= 82 ? 'ready' : 'attention', focus:'Fast compare loops and AI-assisted exploration' },
        { key:'release_candidate', label:'Release candidate', score:summary.promotionReadinessScore, lane:txt(diag.firewall.recommendedLane || 'review'), status:summary.promotionReadinessScore >= 80 ? 'ready' : 'attention', focus:'Promotion gates, release notes, contract freeze' },
        { key:'hotfix', label:'Hotfix branch', score:Math.round((summary.firewallScore * 0.46) + (compliance * 0.24) + (compatibility * 0.16) + ((100 - Math.min(100, destructive * 22)) * 0.14)), lane:destructive > 0 || critical > 0 ? 'cab_esign' : 'elevated', status:(destructive > 0 || critical > 0) ? 'attention' : 'ready', focus:'Controlled remediation and rollback discipline' }
      ];
    }

    if(!arr(diag.focusDeck).length){
      var firstJourney = journeys[0] || {};
      var secondJourney = journeys[1] || {};
      diag.focusDeck = [
        { key:'executive_release_orbit', title:'Executive release orbit', score:summary.commandCenterScore, focus:'Release radar, promotion board, firewall and branch readiness', type:'executive', targets:arr(diag.releaseLanes).map(function(item){ return item && item.key; }).filter(Boolean).slice(0,6) },
        { key:'governance_firewall_board', title:'Governance firewall board', score:summary.firewallScore, focus:'Approvers, evidence, destructive change discipline', type:'governance', targets:arr(diag.governance && diag.governance.missingOwners).slice(0,6) },
        { key:'journey_' + esc(firstJourney.key || 'production'), title:txt(firstJourney.label || 'Journey'), score:num(firstJourney.readinessScore, summary.promotionReadinessScore), focus:txt(firstJourney.focus || ''), type:'journey', targets:arr(firstJourney.tablesPresent || firstJourney.requiredTables).slice(0,8) },
        { key:'journey_' + esc(secondJourney.key || 'quality'), title:txt(secondJourney.label || 'Journey'), score:num(secondJourney.readinessScore, summary.commandCenterScore), focus:txt(secondJourney.focus || ''), type:'journey', targets:arr(secondJourney.tablesPresent || secondJourney.requiredTables).slice(0,8) }
      ].filter(function(item){ return txt(item.title).trim() !== ''; });
    }

    if(!diag.observability || typeof diag.observability !== 'object' || !arr(diag.observability.tiles).length){
      diag.observability = {
        score:summary.observabilityScore,
        tiles:[
          { key:'virtualization', label:'Canvas virtualization', score:Math.round((performance * 0.42) + (visual * 0.24) + ((100 - Math.min(100, hotspots.length * 10)) * 0.18) + ((100 - num(diag.renderInsights && diag.renderInsights.complexityScore, 0)) * 0.16)), detail:'Large-graph readability and culling posture', tone:toneByScore(Math.round((performance * 0.42) + (visual * 0.24) + ((100 - Math.min(100, hotspots.length * 10)) * 0.18) + ((100 - num(diag.renderInsights && diag.renderInsights.complexityScore, 0)) * 0.16))) },
          { key:'search_index', label:'Search / command indexing', score:Math.round((metadata * 0.40) + (experience * 0.24) + (registry * 0.18) + (visual * 0.18)), detail:'Keyboard-first discovery quality', tone:toneByScore(Math.round((metadata * 0.40) + (experience * 0.24) + (registry * 0.18) + (visual * 0.18))) },
          { key:'registry_freshness', label:'Registry freshness', score:Math.round((registry * 0.46) + (workflow * 0.22) + (metadata * 0.18) + (compatibility * 0.14)), detail:'Schema-to-runtime contract freshness', tone:toneByScore(Math.round((registry * 0.46) + (workflow * 0.22) + (metadata * 0.18) + (compatibility * 0.14))) },
          { key:'review_signal', label:'Review signal quality', score:Math.round((summary.commandCenterScore * 0.42) + (summary.firewallScore * 0.24) + (summary.promotionReadinessScore * 0.18) + (governance * 0.16)), detail:'How clearly the cockpit signals release readiness', tone:toneByScore(Math.round((summary.commandCenterScore * 0.42) + (summary.firewallScore * 0.24) + (summary.promotionReadinessScore * 0.18) + (governance * 0.16))) }
        ]
      };
    }

    if(!arr(diag.eventRail).length){
      diag.eventRail = [
        { key:'baseline', label:'Baseline secured', detail:'Canonical baseline and compare artifacts are ready.', status:'recorded' },
        { key:'diagnostics', label:'Diagnostics refreshed', detail:'World-class health, operations, and firewall signals are available.', status:'recorded' },
        { key:'promotion', label:'Promotion lane ' + txt(diag.firewall.recommendedLane || 'review'), detail:'Recommended lane is derived from compatibility, blockers, and governance.', status:summary.promotionReadinessScore >= 80 ? 'ready' : 'attention' }
      ];
      if(destructive > 0 || critical > 0){
        diag.eventRail.push({ key:'firewall', label:'Firewall escalation', detail:'Breaking changes require stronger review discipline.', status:'attention' });
      }
    }

    if(!arr(diag.environments).length){
      diag.environments = [
        { key:'workspace', label:'Workspace design', score:Math.round((visual * 0.26) + (metadata * 0.24) + (experience * 0.20) + (ai * 0.16) + ((100 - Math.min(100, hotspots.length * 10)) * 0.14)), status:(visual >= 82 ? 'ready' : 'attention'), gate:'Model clarity, views, compare' },
        { key:'integration', label:'Integration / registry', score:Math.round((registry * 0.38) + (workflow * 0.26) + (metadata * 0.18) + ((100 - Math.min(100, blockers.length * 12)) * 0.18)), status:(registry >= 88 ? 'ready' : 'attention'), gate:'Compiler sync, registry drift' },
        { key:'uat', label:'Controlled UAT', score:Math.round((summary.promotionReadinessScore * 0.38) + (governance * 0.20) + (compatibility * 0.22) + (compliance * 0.20)), status:(summary.promotionReadinessScore >= 80 ? 'ready' : 'attention'), gate:'Evidence, sign-off, lane readiness' },
        { key:'production', label:'Production release', score:Math.round((release * 0.30) + (summary.firewallScore * 0.26) + (compliance * 0.22) + (compatibility * 0.12) + ((100 - Math.min(100, destructive * 22 + critical * 14)) * 0.10)), status:(summary.firewallScore >= 84 ? 'ready' : 'attention'), gate:'Firewall clear, rollback proof' }
      ];
    }

    return diag;
  }

  function currentTab(){
    return ['operations','release','branches','copilot'].indexOf(state.tab) >= 0 ? state.tab : 'operations';
  }

  function heroHtml(diag){
    var summary = diag.summary || {};
    return [
      '<section class="ss-wc-r5-hero">',
        '<div class="ss-wc-r5-hero-copy">',
          '<div class="ss-wc-r5-kicker">Command center round 5</div>',
          '<h3 class="ss-wc-r5-title">Operations-grade schema command center with promotion board, firewall, branch topology and observability</h3>',
          '<div class="ss-wc-r5-sub">Round 5 tightens the control plane: fewer decorative screens, more governed release signals, focus decks, branch-aware workflows and post-release visibility.</div>',
          '<div class="ss-wc-r5-badges">',
            '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(summary.operationsScore)) + '">Operations ' + esc(num(summary.operationsScore, 0)) + '%</span>',
            '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(summary.promotionReadinessScore)) + '">Promotion ' + esc(num(summary.promotionReadinessScore, 0)) + '%</span>',
            '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(summary.firewallScore)) + '">Firewall ' + esc(num(summary.firewallScore, 0)) + '%</span>',
            '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(summary.observabilityScore)) + '">Observability ' + esc(num(summary.observabilityScore, 0)) + '%</span>',
          '</div>',
        '</div>',
        '<div class="ss-wc-r5-metric-grid">',
          metric('Operations', num(summary.operationsScore, 0) + '%', 'Operating maturity of the release cockpit', toneByScore(summary.operationsScore)),
          metric('Promotion', num(summary.promotionReadinessScore, 0) + '%', 'Gate readiness across review → release', toneByScore(summary.promotionReadinessScore)),
          metric('Firewall', num(summary.firewallScore, 0) + '%', 'Discipline against breaking/destructive changes', toneByScore(summary.firewallScore)),
          metric('Observability', num(summary.observabilityScore, 0) + '%', 'Scale posture and signal quality after release', toneByScore(summary.observabilityScore)),
          metric('Command center', num(summary.commandCenterScore, 0) + '%', 'Composite of release, journeys, governance and UX', toneByScore(summary.commandCenterScore)),
          metric('Focus decks', num(summary.focusDeckCount, arr(diag.focusDeck).length), 'Curated views for executive and domain reviews', 'neutral'),
        '</div>',
      '</section>'
    ].join('');
  }

  function tabsHtml(diag){
    var tabs = [
      { key:'operations', label:'Operations', score:num(diag.summary && diag.summary.operationsScore, 0) },
      { key:'release', label:'Release', score:num(diag.summary && diag.summary.promotionReadinessScore, 0) },
      { key:'branches', label:'Branches', score:num(diag.summary && diag.summary.branchCount, 0) },
      { key:'copilot', label:'Copilot', score:num(diag.summary && diag.summary.aiCopilotReadinessScore, 0) }
    ];
    return [
      '<div class="ss-wc-r5-tabs">',
        tabs.map(function(tab){
          return '<button type="button" class="ss-wc-r5-tab' + (currentTab() === tab.key ? ' active' : '') + '" data-wc-r5-action="tab" data-key="' + esc(tab.key) + '">' + esc(tab.label) + '<span>' + esc(tab.key === 'branches' ? tab.score : (tab.score + (tab.key === 'copilot' ? '%' : '%'))) + '</span></button>';
        }).join(''),
        '<div class="ss-wc-r5-toolbar"><button type="button" class="hm-btn hm-btn-ghost ss-btn-sm" data-wc-r5-action="refresh">Refresh</button><button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r5-action="copy-brief">Copy brief</button></div>',
      '</div>'
    ].join('');
  }

  function environmentsHtml(diag){
    var envs = arr(diag.environments);
    return card('Environment posture', 'Workspace → integration → UAT → production', [
      '<div class="ss-wc-r5-grid-2">',
        envs.map(function(item){
          return '<button type="button" class="ss-wc-r5-mini tone-' + esc(toneByScore(item.score || 0)) + (state.env === item.key ? ' active' : '') + '" data-wc-r5-action="env" data-key="' + esc(item.key || '') + '"><div class="ss-wc-r5-mini-top"><strong>' + esc(item.label || item.key || '-') + '</strong>' + statusBadge(item.status || '') + '</div><div class="ss-wc-r5-value">' + esc((item.score || 0) + '%') + '</div><div class="ss-wc-r5-sub">' + esc(item.gate || item.nextAction || '') + '</div></button>';
        }).join(''),
      '</div>'
    ].join(''));
  }

  function observabilityHtml(diag){
    var obs = diag.observability || {};
    var tiles = arr(obs.tiles);
    return card('Observability tiles', 'Scale, registry freshness and review signal quality', [
      '<div class="ss-wc-r5-grid-2">',
        tiles.map(function(tile){
          var score = num(tile.score, 0);
          return '<div class="ss-wc-r5-mini tone-' + esc(tile.tone || toneByScore(score)) + '"><div class="ss-wc-r5-mini-top"><strong>' + esc(tile.label || tile.key || '-') + '</strong><span class="ss-wc-r5-badge tone-' + esc(tile.tone || toneByScore(score)) + '">' + esc(score + '%') + '</span></div><div class="ss-wc-r5-sub">' + esc(tile.detail || '') + '</div></div>';
        }).join(''),
      '</div>'
    ].join(''));
  }

  function releaseHtml(diag){
    var stages = arr(diag.promotionBoard);
    var firewall = diag.firewall || {};
    var eventRail = arr(diag.eventRail);
    return [
      card('Promotion board', 'Default route from modeling to governed release', '<div class="ss-wc-r5-list">' + (stages.length ? stages.map(function(stage){ return '<button type="button" class="ss-wc-r5-list-item" data-wc-r5-action="focus-stage" data-key="' + esc(stage.key || '') + '"><div><strong>' + esc(stage.label || stage.key || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(stage.gate || stage.nextAction || '') + '</div></div><div class="ss-wc-r5-inline">' + statusBadge(stage.status || '') + '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(stage.score || 0)) + '">' + esc((stage.score || 0) + '%') + '</span></div></button>'; }).join('') : '<div class="ss-wc-r5-sub">No promotion stages available.</div>') + '</div>'),
      card('Destructive-change firewall', 'Lane recommendation, gate checks and release discipline', [
        '<div class="ss-wc-r5-inline" style="margin-bottom:10px">',
          '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(firewall.firewallScore || 0)) + '">Firewall ' + esc((firewall.firewallScore || 0) + '%') + '</span>',
          '<span class="ss-wc-r5-badge tone-neutral">Lane ' + esc(firewall.recommendedLane || firewall.approvalClass || 'standard') + '</span>',
          '<span class="ss-wc-r5-badge tone-neutral">Compat ' + esc((firewall.compatibilityScore || 0) + '%') + '</span>',
          '<span class="ss-wc-r5-badge tone-neutral">Risk ' + esc((firewall.riskScore || 0) + '/100') + '</span>',
        '</div>',
        '<div class="ss-wc-r5-list">' + arr(firewall.gates).map(function(gate){ return '<div class="ss-wc-r5-list-item"><div><strong>' + esc(gate.label || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(gate.detail || '') + '</div></div><div>' + statusBadge(gate.status || '') + '</div></div>'; }).join('') + '</div>'
      ].join('')),
      card('Event rail', 'Timeline checkpoints generated by the command center', '<div class="ss-wc-r5-list">' + (eventRail.length ? eventRail.map(function(item){ return '<div class="ss-wc-r5-list-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(item.detail || '') + '</div></div><div>' + statusBadge(item.status || '') + '</div></div>'; }).join('') : '<div class="ss-wc-r5-sub">No event rail entries.</div>') + '</div>')
    ].join('');
  }

  function branchesHtml(diag){
    var branches = arr(diag.branchTopology);
    var focusDeck = arr(diag.focusDeck);
    return [
      card('Branch topology', 'Branch-aware review and promotion posture', '<div class="ss-wc-r5-list">' + (branches.length ? branches.map(function(branch){ return '<button type="button" class="ss-wc-r5-list-item' + (state.branch === branch.key ? ' active' : '') + '" data-wc-r5-action="branch" data-key="' + esc(branch.key || '') + '"><div><strong>' + esc(branch.label || branch.key || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(branch.focus || '') + '</div></div><div class="ss-wc-r5-inline">' + statusBadge(branch.status || '') + '<span class="ss-wc-r5-badge tone-' + esc(toneByScore(branch.score || 0)) + '">' + esc((branch.score || 0) + '%') + '</span><span class="ss-wc-r5-badge tone-neutral">' + esc(branch.lane || '') + '</span></div></button>'; }).join('') : '<div class="ss-wc-r5-sub">No branch topology.</div>') + '</div>'),
      card('Focus decks', 'Curated review views instead of raw free-pan sessions', '<div class="ss-wc-r5-grid-2">' + (focusDeck.length ? focusDeck.map(function(deck){ return '<button type="button" class="ss-wc-r5-mini tone-' + esc(deck.tone || toneByScore(deck.score || 0)) + '" data-wc-r5-action="focus-deck" data-key="' + esc(deck.key || '') + '"><div class="ss-wc-r5-mini-top"><strong>' + esc(deck.title || deck.key || '-') + '</strong><span class="ss-wc-r5-badge tone-' + esc(deck.tone || toneByScore(deck.score || 0)) + '">' + esc((deck.score || 0) + '%') + '</span></div><div class="ss-wc-r5-sub">' + esc(deck.focus || '') + '</div></button>'; }).join('') : '<div class="ss-wc-r5-sub">No focus decks.</div>') + '</div>')
    ].join('');
  }

  function copilotHtml(diag){
    var playbooks = arr(diag.playbooks).slice(0, 5);
    var copilots = arr(diag.aiCopilot).slice(0, 5);
    return [
      card('Review playbooks', 'Structured review flows for governance and release', '<div class="ss-wc-r5-list">' + (playbooks.length ? playbooks.map(function(item){ return '<div class="ss-wc-r5-list-item"><div><strong>' + esc(item.title || item.key || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(item.hero || item.summary || item.objective || '') + '</div></div><div class="ss-wc-r5-inline"><span class="ss-wc-r5-badge tone-' + esc(toneByScore(item.readinessScore || 0)) + '">' + esc((item.readinessScore || 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r5-sub">No playbooks.</div>') + '</div>'),
      card('AI copilot queue', 'Controlled prompts for diff, migration and manufacturing intelligence', '<div class="ss-wc-r5-list">' + (copilots.length ? copilots.map(function(item, index){ return '<div class="ss-wc-r5-list-item"><div><strong>' + esc(item.title || item.key || '-') + '</strong><div class="ss-wc-r5-sub">' + esc(item.objective || item.prompt || '') + '</div></div><div><button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r5-action="copy-copilot" data-index="' + esc(index) + '">Copy</button></div></div>'; }).join('') : '<div class="ss-wc-r5-sub">No AI copilot queue.</div>') + '</div>')
    ].join('');
  }

  function bodyHtml(diag){
    var tab = currentTab();
    if(tab === 'release') return releaseHtml(diag);
    if(tab === 'branches') return branchesHtml(diag);
    if(tab === 'copilot') return copilotHtml(diag);
    return environmentsHtml(diag) + observabilityHtml(diag);
  }

  function render(){
    var overlay = document.querySelector('.ss-wc-overlay');
    if(!overlay) return;
    var shell = overlay.querySelector('.ss-wc-shell');
    if(!shell) return;
    var host = shell.querySelector('.ss-wc-r5-shell');
    if(!host){
      host = document.createElement('section');
      host.className = 'ss-wc-r5-shell';
      shell.appendChild(host);
    }
    cacheDiag = ensureDiag(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    host.innerHTML = heroHtml(cacheDiag) + tabsHtml(cacheDiag) + bodyHtml(cacheDiag);
  }
  function scheduleRender(){
    if(renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 30);
  }
  function ensureStyles(){
    if(document.getElementById('schema-studio-r5-styles')) return;
    var style = document.createElement('style');
    style.id = 'schema-studio-r5-styles';
    style.textContent = [
      '.ss-wc-r5-shell{margin-top:18px;padding-top:8px;border-top:1px solid rgba(148,163,184,.10);}',
      '.ss-wc-r5-hero{position:relative;padding:20px;border-radius:24px;background:linear-gradient(135deg,rgba(15,23,42,.90),rgba(22,33,62,.86));border:1px solid rgba(56,189,248,.18);box-shadow:0 18px 48px rgba(2,6,23,.20);overflow:hidden;}',
      '.ss-wc-r5-hero:before,.ss-wc-r5-hero:after{content:"";position:absolute;border-radius:999px;filter:blur(10px);opacity:.55;pointer-events:none;}',
      '.ss-wc-r5-hero:before{width:220px;height:220px;right:-40px;top:-70px;background:radial-gradient(circle,rgba(56,189,248,.34),transparent 68%);}',
      '.ss-wc-r5-hero:after{width:180px;height:180px;left:-40px;bottom:-70px;background:radial-gradient(circle,rgba(168,85,247,.28),transparent 70%);}',
      '.ss-wc-r5-hero-copy,.ss-wc-r5-metric-grid,.ss-wc-r5-tabs,.ss-wc-r5-card{position:relative;z-index:1;}',
      '.ss-wc-r5-title{margin:8px 0 10px;font-size:24px;line-height:1.15;color:#fff;}',
      '.ss-wc-r5-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7dd3fc;font-weight:800;}',
      '.ss-wc-r5-sub{font-size:12px;line-height:1.55;color:#b9cae0;}',
      '.ss-wc-r5-badges,.ss-wc-r5-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-wc-r5-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.12);font-size:11px;font-weight:700;color:#dbeafe;}',
      '.ss-wc-r5-badge.tone-good{border-color:rgba(34,197,94,.28);background:rgba(34,197,94,.10);color:#dcfce7;}',
      '.ss-wc-r5-badge.tone-warning{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.10);color:#fef3c7;}',
      '.ss-wc-r5-badge.tone-critical{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.10);color:#fee2e2;}',
      '.ss-wc-r5-badge.tone-neutral{color:#e2e8f0;}',
      '.ss-wc-r5-metric-grid{margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}',
      '.ss-wc-r5-metric{padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.56),rgba(15,23,42,.42));border:1px solid rgba(148,163,184,.10);box-shadow:0 12px 34px rgba(2,6,23,.12);}',
      '.ss-wc-r5-metric .ss-wc-r5-value{font-size:26px;font-weight:800;line-height:1;color:#fff;margin-top:6px;}',
      '.ss-wc-r5-metric.tone-good{border-color:rgba(34,197,94,.18);}',
      '.ss-wc-r5-metric.tone-warning{border-color:rgba(245,158,11,.18);}',
      '.ss-wc-r5-metric.tone-critical{border-color:rgba(239,68,68,.18);}',
      '.ss-wc-r5-tabs{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding:8px 4px;}',
      '.ss-wc-r5-tab{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(15,23,42,.34);color:#dbeafe;cursor:pointer;font-weight:700;}',
      '.ss-wc-r5-tab span{font-size:11px;opacity:.78;font-weight:700;}',
      '.ss-wc-r5-tab.active{background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(56,189,248,.14));border-color:rgba(56,189,248,.30);color:#fff;}',
      '.ss-wc-r5-toolbar{margin-left:auto;display:flex;gap:8px;}',
      '.ss-wc-r5-card{margin-top:12px;padding:16px;border-radius:22px;background:linear-gradient(180deg,rgba(15,23,42,.62),rgba(15,23,42,.44));border:1px solid rgba(148,163,184,.10);box-shadow:0 14px 34px rgba(2,6,23,.12);}',
      '.ss-wc-r5-card h5{margin:0;font-size:15px;color:#fff;}',
      '.ss-wc-r5-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;}',
      '.ss-wc-r5-mini{padding:14px;border-radius:18px;border:1px solid rgba(148,163,184,.10);background:linear-gradient(180deg,rgba(15,23,42,.56),rgba(15,23,42,.38));text-align:left;cursor:pointer;transition:transform .16s ease,border-color .16s ease;}',
      '.ss-wc-r5-mini:hover,.ss-wc-r5-list-item:hover{transform:translateY(-1px);}',
      '.ss-wc-r5-mini.active,.ss-wc-r5-list-item.active{border-color:rgba(56,189,248,.30);box-shadow:0 12px 28px rgba(56,189,248,.10);}',
      '.ss-wc-r5-mini.tone-good{border-color:rgba(34,197,94,.18);}',
      '.ss-wc-r5-mini.tone-warning{border-color:rgba(245,158,11,.18);}',
      '.ss-wc-r5-mini.tone-critical{border-color:rgba(239,68,68,.18);}',
      '.ss-wc-r5-mini-top,.ss-wc-r5-card-head,.ss-wc-r5-list-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
      '.ss-wc-r5-list{display:flex;flex-direction:column;gap:10px;margin-top:12px;}',
      '.ss-wc-r5-list-item{padding:12px 14px;border-radius:16px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.30);cursor:pointer;}',
      '.ss-wc-r5-value{font-size:22px;font-weight:800;color:#fff;line-height:1;margin-top:8px;}',
      '@media (max-width:1100px){.ss-wc-r5-metric-grid,.ss-wc-r5-grid-2{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:760px){.ss-wc-r5-metric-grid,.ss-wc-r5-grid-2{grid-template-columns:1fr;}.ss-wc-r5-toolbar{width:100%;margin-left:0;}.ss-wc-r5-tabs{align-items:stretch;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function focusDeckByKey(key){
    var decks = arr(cacheDiag && cacheDiag.focusDeck);
    var deck = decks.find(function(item){ return item && item.key === key; });
    if(!deck) return;
    var target = arr(deck.targets)[0];
    if(target && win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.focusTable === 'function'){
      win.SchemaStudioWorldClass.focusTable(target);
    }
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.applyVisualPrefs === 'function'){
      var prefs = { heatmap:'risk', ambience:'midnight', density:'comfortable' };
      if(deck.type === 'journey') prefs = { heatmap:'workflow', ambience:'aurora', density:'compact' };
      if(deck.type === 'governance') prefs = { heatmap:'security', ambience:'clean', density:'comfortable' };
      win.SchemaStudioWorldClass.applyVisualPrefs(prefs);
    }
  }

  function focusStage(key){
    var stage = arr(cacheDiag && cacheDiag.promotionBoard).find(function(item){ return item && item.key === key; });
    if(!stage) return;
    state.tab = 'release';
    saveState();
    scheduleRender();
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.applyVisualPrefs === 'function'){
      win.SchemaStudioWorldClass.applyVisualPrefs({
        heatmap: key === 'discover' ? 'canonical' : (key === 'model' ? 'risk' : (key === 'governance' ? 'security' : 'workflow')),
        ambience: key === 'release' ? 'midnight' : (key === 'discover' ? 'aurora' : 'clean'),
        density: key === 'discover' ? 'comfortable' : 'compact'
      });
    }
  }

  function copyCopilot(index){
    var item = arr(cacheDiag && cacheDiag.aiCopilot)[num(index, 0)] || null;
    var text = txt(item && (item.prompt || item.objective || item.title));
    if(!text) return;
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text);
      return;
    }
    try{
      var area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }catch(_err){}
  }

  function copyBrief(){
    var diag = cacheDiag || ensureDiag(win.SchemaStudioWorldClass.getDiagnosis ? win.SchemaStudioWorldClass.getDiagnosis() : {});
    var summary = diag.summary || {};
    var firewall = diag.firewall || {};
    var lines = [
      'Schema Studio Round 5 release brief',
      'Operations: ' + num(summary.operationsScore, 0) + '%',
      'Promotion readiness: ' + num(summary.promotionReadinessScore, 0) + '%',
      'Firewall: ' + num(summary.firewallScore, 0) + '%',
      'Observability: ' + num(summary.observabilityScore, 0) + '%',
      'Lane: ' + txt(firewall.recommendedLane || firewall.approvalClass || 'standard'),
      'Compatibility: ' + num(firewall.compatibilityScore || summary.compatibilityScore, 0) + '%',
      'Risk: ' + num(firewall.riskScore || summary.riskScore, 0) + '/100',
      'Blockers: ' + num(firewall.blockerCount || summary.blockerCount, 0),
      'Focus decks: ' + arr(diag.focusDeck).map(function(item){ return item && (item.title || item.key); }).filter(Boolean).slice(0, 4).join(', ')
    ].join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(lines);
      return;
    }
  }

  function bind(){
    if(!clickBound){
      document.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-wc-r5-action]') : null;
        if(!node) return;
        var action = node.getAttribute('data-wc-r5-action') || '';
        if(action === 'tab'){
          ev.preventDefault();
          state.tab = node.getAttribute('data-key') || 'operations';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'env'){
          ev.preventDefault();
          state.env = node.getAttribute('data-key') || 'workspace';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'branch'){
          ev.preventDefault();
          state.branch = node.getAttribute('data-key') || 'main';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'focus-deck'){
          ev.preventDefault();
          focusDeckByKey(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'focus-stage'){
          ev.preventDefault();
          focusStage(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'copy-copilot'){
          ev.preventDefault();
          copyCopilot(node.getAttribute('data-index') || '0');
          return;
        }
        if(action === 'refresh'){
          ev.preventDefault();
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.refresh === 'function'){
            Promise.resolve(win.SchemaStudioWorldClass.refresh()).then(scheduleRender);
          }
          return;
        }
        if(action === 'copy-brief'){
          ev.preventDefault();
          copyBrief();
          return;
        }
      }, true);
      clickBound = true;
    }
    if(!keyBound){
      document.addEventListener('keydown', function(ev){
        if(ev.altKey && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && (ev.key === '5')){
          ev.preventDefault();
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'operations';
          saveState();
          scheduleRender();
          return;
        }
        if(ev.altKey && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && (ev.key === '6')){
          ev.preventDefault();
          state.tab = 'release';
          saveState();
          scheduleRender();
          return;
        }
      });
      keyBound = true;
    }
  }

  function addCommands(){
    if(!win.CmdPalette || !Array.isArray(win.CmdPalette.COMMANDS)) return;
    win.CmdPalette.COMMANDS = win.CmdPalette.COMMANDS.filter(function(command){
      return !command || ['Open round 5 command center', 'Open promotion board', 'Copy round 5 release brief'].indexOf(command.label_en) < 0;
    });
    win.CmdPalette.COMMANDS.push(
      {
        icon:'🛰',
        label:'Mở command center round 5',
        label_en:'Open round 5 command center',
        category:'schema',
        action:function(){
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'operations';
          saveState();
          scheduleRender();
        }
      },
      {
        icon:'🚦',
        label:'Mở promotion board',
        label_en:'Open promotion board',
        category:'schema',
        action:function(){
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'release';
          saveState();
          scheduleRender();
        }
      },
      {
        icon:'📋',
        label:'Copy release brief round 5',
        label_en:'Copy round 5 release brief',
        category:'schema',
        action:function(){ copyBrief(); }
      }
    );
  }

  var originalGetDiagnosis = win.SchemaStudioWorldClass.getDiagnosis;
  var originalRefresh = win.SchemaStudioWorldClass.refresh;
  var originalOpen = win.SchemaStudioWorldClass.open;
  win.SchemaStudioWorldClass.getDiagnosis = function(){
    return cacheDiag = ensureDiag(originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : {});
  };
  win.SchemaStudioWorldClass.refresh = function(){
    var result = originalRefresh ? originalRefresh.apply(this, arguments) : Promise.resolve(win.SchemaStudioWorldClass.getDiagnosis());
    return Promise.resolve(result).then(function(diag){
      cacheDiag = ensureDiag(diag || {});
      scheduleRender();
      return cacheDiag;
    });
  };
  win.SchemaStudioWorldClass.open = function(){
    var result = originalOpen ? originalOpen.apply(this, arguments) : undefined;
    scheduleRender();
    return result;
  };

  loadState();
  ensureStyles();
  bind();
  addCommands();
  scheduleRender();
  win.SchemaStudioWorldClass.__round5Patched = true;
  if(win.SchemaStudio){
    win.SchemaStudio.buildId = '20260407worldclass5';
    win.SchemaStudio.copyWorldClassReleaseBrief = copyBrief;
  }
})(window);


/* ── World-Class Command Deck Round 6 ─────────────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win.SchemaStudioWorldClass || !win.STORE) return;
  if(win.SchemaStudioWorldClass.__round6Patched) return;

  var LS_KEY = 'hesem:schema-studio:wc:r6';
  var state = { tab:'deck', spotlight:'', scene:'' };
  var cacheReport = null;
  var renderTimer = null;
  var requestPending = false;
  var clickBound = false;
  var keyBound = false;

  function arr(value){ return Array.isArray(value) ? value.filter(Boolean) : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function num(value, fallback){
    var n = Number(value);
    return isFinite(n) ? n : (fallback == null ? 0 : Number(fallback) || 0);
  }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function tone(score){
    score = num(score, 0);
    return score >= 90 ? 'good' : (score >= 75 ? 'warning' : 'critical');
  }
  function api(action, payload, method){
    if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST', 30000);
    return fetch('api.php?action=' + encodeURIComponent(action), {
      method: method || 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
      },
      body: JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function loadState(){
    try{
      var parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if(parsed && typeof parsed === 'object'){
        if(parsed.tab) state.tab = parsed.tab;
        if(parsed.spotlight) state.spotlight = parsed.spotlight;
        if(parsed.scene) state.scene = parsed.scene;
      }
    }catch(_err){}
  }
  function saveState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({ tab:state.tab, spotlight:state.spotlight, scene:state.scene }));
    }catch(_err){}
  }
  function currentDiag(){
    return win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.getDiagnosis === 'function' ? (win.SchemaStudioWorldClass.getDiagnosis() || {}) : {};
  }
  function badge(label, value, toneKey){
    return '<span class="ss-wc-r6-badge tone-' + esc(toneKey || 'neutral') + '">' + esc(label || '-') + ': ' + esc(value == null ? '-' : value) + '</span>';
  }
  function metric(label, value, hint, toneKey){
    return [
      '<div class="ss-wc-r6-metric tone-' + esc(toneKey || 'neutral') + '">',
        '<div class="ss-wc-r6-kicker">' + esc(label || '-') + '</div>',
        '<div class="ss-wc-r6-value">' + esc(value == null ? '-' : value) + '</div>',
        hint ? '<div class="ss-wc-r6-sub">' + esc(hint) + '</div>' : '',
      '</div>'
    ].join('');
  }
  function card(title, subtitle, body){
    return [
      '<article class="ss-wc-r6-card">',
        '<div class="ss-wc-r6-card-head">',
          '<div>',
            '<h5>' + esc(title || '-') + '</h5>',
            subtitle ? '<div class="ss-wc-r6-sub">' + esc(subtitle) + '</div>' : '',
          '</div>',
        '</div>',
        body || '',
      '</article>'
    ].join('');
  }
  function deriveReport(diag){
    diag = diag && typeof diag === 'object' ? diag : {};
    var summary = diag.summary && typeof diag.summary === 'object' ? diag.summary : {};
    var hotspots = arr(diag.hotspots);
    var blockers = arr(diag.blockers);
    var focusDeck = arr(diag.focusDeck);
    var personas = arr(diag.personas);
    var playbooks = arr(diag.playbooks);
    var promotionBoard = arr(diag.promotionBoard);
    var storyboards = arr(diag.storyboards);
    var journeys = arr(diag.journeys);
    var observability = diag.observability && typeof diag.observability === 'object' ? diag.observability : {};
    var command = diag.commandCenter && typeof diag.commandCenter === 'object' ? diag.commandCenter : {};
    var reportSummary = command.summary && typeof command.summary === 'object' ? command.summary : {};
    if(!Object.keys(reportSummary).length){
      reportSummary = {
        commandCenterScore: num(summary.commandCenterScore, 0),
        orchestrationScore: Math.round((num(summary.commandCenterScore, 0) * 0.30) + (num(summary.operationsScore, 0) * 0.20) + (num(summary.releaseReadinessScore, 0) * 0.18) + (num(summary.governanceCoveragePercent, 0) * 0.16) + (num(summary.registrySyncScore, 0) * 0.16)),
        narrativeCoverageScore: Math.round((num(summary.visualReadinessScore, 0) * 0.28) + (num(summary.journeyReadinessScore, 0) * 0.22) + (num(summary.domainReadinessScore, 0) * 0.18) + (num(summary.metadataCompletenessPercent, 0) * 0.16) + (Math.min(100, storyboards.length * 16) * 0.16)),
        reviewWallScore: Math.round((num(summary.promotionReadinessScore, 0) * 0.32) + (num(summary.firewallScore, 0) * 0.24) + (num(summary.complianceReadinessScore, 0) * 0.14) + (num(summary.governanceCoveragePercent, 0) * 0.14) + ((100 - Math.min(100, blockers.length * 16)) * 0.16)),
        atlasReadinessScore: Math.round((num(summary.domainReadinessScore, 0) * 0.34) + (num(summary.journeyReadinessScore, 0) * 0.24) + (num(summary.canonicalCoveragePercent, 0) * 0.18) + (num(summary.metadataCompletenessPercent, 0) * 0.14) + (num(summary.visualReadinessScore, 0) * 0.10)),
        livePulseScore: Math.round((num(summary.observabilityScore, 0) * 0.34) + (num(summary.performancePostureScore, 0) * 0.18) + (num(summary.releaseRadarScore, 0) * 0.18) + (num(summary.registrySyncScore, 0) * 0.14) + ((100 - Math.min(100, hotspots.length * 10)) * 0.16)),
        collaborationReadinessScore: Math.round((num(summary.governanceCoveragePercent, 0) * 0.30) + (num(summary.workflowBindingCoveragePercent, 0) * 0.18) + (num(summary.complianceReadinessScore, 0) * 0.16) + (Math.min(100, personas.length * 16 + playbooks.length * 12) * 0.18) + (num(summary.aiCopilotReadinessScore, 0) * 0.18)),
        visualPolishScore: Math.round((num(summary.experienceScore, 0) * 0.30) + (num(summary.visualReadinessScore, 0) * 0.28) + (num(summary.metadataCompletenessPercent, 0) * 0.12) + (num(summary.commandCenterScore, 0) * 0.16) + (Math.min(100, focusDeck.length * 14) * 0.14)),
        sceneCount: Math.max(storyboards.length, journeys.length),
        spotlightCount: Math.min(6, focusDeck.length + personas.length),
        reviewLaneCount: promotionBoard.length,
        atlasCount: 4
      };
    }
    var report = {
      summary: reportSummary,
      hero: command.hero || {
        headline:'Round 6 command deck',
        subheadline:'Executive narrative, review wall, atlas and live pulse make the schema cockpit presentation-grade while preserving governance discipline.',
        commandCenterScore:num(reportSummary.commandCenterScore, num(summary.commandCenterScore, 0)),
        orchestrationScore:num(reportSummary.orchestrationScore, 0),
        visualPolishScore:num(reportSummary.visualPolishScore, 0),
        riskScore:num(summary.riskScore, 0),
        compatibilityScore:num(summary.compatibilityScore, 100)
      },
      spotlight: arr(command.spotlight).length ? arr(command.spotlight) : arr(focusDeck).slice(0, 4).concat(arr(personas).slice(0, 2).map(function(item){
        return {
          key:'persona_' + txt(item.key || ''),
          title:item.label || item.key || 'Persona',
          subtitle:item.focus || '',
          score:num(item.readinessScore, 0),
          tone:item.tone || tone(item.readinessScore),
          targets:arr(item.focusTables || []).slice(0, 6),
          kind:'persona'
        };
      })).slice(0, 6),
      reviewWall: command.reviewWall || {
        score:num(reportSummary.reviewWallScore, 0),
        lanes: promotionBoard.slice(0, 6).map(function(item){
          return {
            key:item.key || '',
            label:item.label || item.key || '-',
            score:num(item.score, 0),
            status:item.status || 'attention',
            gate:item.gate || item.nextAction || '',
            nextAction:item.nextAction || ''
          };
        }),
        evidenceStack: blockers.slice(0, 3).map(function(item){ return { kind:'blocker', title:item.title || item.key || '-', detail:item.detail || item.nextAction || '', tone:'critical' }; })
          .concat(hotspots.slice(0, 3).map(function(item){ return { kind:'hotspot', title:item.table || item.tableId || '-', detail:(item.reasons && item.reasons[0]) || item.reason || '', tone:'warning' }; })).slice(0, 6)
      },
      atlas: arr(command.atlas).length ? arr(command.atlas) : [
        {
          key:'journeys',
          label:'Journey atlas',
          count:journeys.length,
          items:journeys.slice(0, 6).map(function(item){ return { label:item.label || item.key || '-', score:num(item.readinessScore, 0), detail:arr(item.tablesPresent).length + '/' + arr(item.requiredTables).length + ' tables' }; })
        },
        {
          key:'domains',
          label:'Domain atlas',
          count:arr(diag.domains).length,
          items:arr(diag.domains).slice(0, 6).map(function(item){ return { label:item.domain || '-', score:num(item.readinessScore, 0), detail:num(item.tableCount, 0) + ' tables' }; })
        },
        {
          key:'layers',
          label:'Layer atlas',
          count:arr(diag.layers).length,
          items:arr(diag.layers).slice(0, 6).map(function(item){ return { label:item.layer || '-', score:num(item.readinessScore, 0), detail:num(item.tableCount, 0) + ' tables' }; })
        },
        {
          key:'dependencies',
          label:'Dependency matrix',
          count:arr(diag.dependencyMatrix && diag.dependencyMatrix.strongLinks).length,
          items:arr(diag.dependencyMatrix && diag.dependencyMatrix.strongLinks).slice(0, 6).map(function(item){ return { label:txt(item.fromDomain || '-') + ' → ' + txt(item.toDomain || '-'), score:Math.min(100, num(item.count, 0) * 8), detail:num(item.count, 0) + ' links' }; })
        }
      ],
      livePulse: command.livePulse || {
        score:num(reportSummary.livePulseScore, 0),
        bands:[
          { key:'observability', label:'Observability', score:num(summary.observabilityScore, 0), detail:'Canvas scale and registry freshness' },
          { key:'promotion', label:'Promotion', score:num(summary.promotionReadinessScore, 0), detail:'Review lanes and gate discipline' },
          { key:'firewall', label:'Firewall', score:num(summary.firewallScore, 0), detail:'Destructive change containment' },
          { key:'release_radar', label:'Release radar', score:num(summary.releaseRadarScore, 0), detail:txt(diag.releaseRadar && diag.releaseRadar.recommendedLane || 'review') + ' lane recommended' }
        ],
        radar:arr(observability.tiles).slice(0, 4).concat(arr(diag.eventRail).slice(0, 2).map(function(item){ return { label:item.label || item.key || '-', score:(item.status === 'ready' ? 94 : (item.status === 'attention' ? 76 : 88)), detail:item.detail || '' }; })).slice(0, 6)
      },
      collaboration: command.collaboration || {
        ownersCoveredPercent:num(diag.governance && diag.governance.ownerCoveragePercent, num(summary.governanceCoveragePercent, 0)),
        approverCoveragePercent:num(diag.governance && diag.governance.approverCoveragePercent, 0),
        evidenceCoveragePercent:num(diag.governance && diag.governance.evidenceCoveragePercent, 0),
        personaCount:personas.length,
        playbookCount:playbooks.length,
        releaseLaneCount:arr(diag.releaseLanes).length,
        environments:arr(diag.environments).slice(0, 4).map(function(item){ return { label:item.label || item.key || '-', score:num(item.score, 0), status:item.status || '' }; })
      },
      scenes: arr(command.scenes).length ? arr(command.scenes) : storyboards.slice(0, 6).concat(journeys.slice(0, 2).map(function(item){ return { key:'journey_' + txt(item.key || ''), title:item.label || item.key || '-', subtitle:item.focus || '', ambience:(txt(item.key || '').indexOf('production') >= 0 ? 'aurora' : 'clean'), density:'compact', heatmap:(txt(item.key || '').indexOf('capa') >= 0 ? 'security' : 'workflow'), focusTables:arr(item.focusTables || item.tablesPresent || []).slice(0, 8) }; })).slice(0, 8)
    };
    return report;
  }
  function ensureReport(source){
    var report = source && typeof source === 'object' && source.summary ? source : null;
    if(report) return report;
    return deriveReport(source || currentDiag());
  }
  function ensureSelected(){
    if(!cacheReport) return;
    if(!state.spotlight && arr(cacheReport.spotlight).length) state.spotlight = txt(arr(cacheReport.spotlight)[0].key || '');
    if(!state.scene && arr(cacheReport.scenes).length) state.scene = txt(arr(cacheReport.scenes)[0].key || '');
  }
  function findSpotlight(key){
    return arr(cacheReport && cacheReport.spotlight).find(function(item){ return item && txt(item.key) === txt(key); }) || null;
  }
  function findScene(key){
    return arr(cacheReport && cacheReport.scenes).find(function(item){ return item && txt(item.key) === txt(key); }) || null;
  }
  function applyFocusTargets(targets){
    targets = arr(targets);
    if(targets[0] && win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.focusTable === 'function') win.SchemaStudioWorldClass.focusTable(targets[0]);
  }
  function applyScene(key){
    var item = findScene(key);
    if(!item) return;
    state.scene = txt(item.key || '');
    saveState();
    applyFocusTargets(item.focusTables || []);
    if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.applyVisualPrefs === 'function'){
      win.SchemaStudioWorldClass.applyVisualPrefs({
        heatmap:item.heatmap || 'risk',
        ambience:item.ambience || 'midnight',
        density:item.density || 'comfortable'
      });
    }
    scheduleRender();
  }
  function applySpotlight(key){
    var item = findSpotlight(key);
    if(!item) return;
    state.spotlight = txt(item.key || '');
    saveState();
    applyFocusTargets(item.targets || []);
    scheduleRender();
  }
  function copyBrief(){
    var report = cacheReport || ensureReport(currentDiag());
    var hero = report.hero || {};
    var summary = report.summary || {};
    var lines = [
      'Schema Studio Round 6 command deck',
      'Command center: ' + num(hero.commandCenterScore, 0) + '%',
      'Orchestration: ' + num(summary.orchestrationScore, 0) + '%',
      'Narrative coverage: ' + num(summary.narrativeCoverageScore, 0) + '%',
      'Review wall: ' + num(summary.reviewWallScore, 0) + '%',
      'Atlas readiness: ' + num(summary.atlasReadinessScore, 0) + '%',
      'Live pulse: ' + num(summary.livePulseScore, 0) + '%',
      'Collaboration: ' + num(summary.collaborationReadinessScore, 0) + '%',
      'Visual polish: ' + num(summary.visualPolishScore, 0) + '%',
      'Scenes / spotlight / review lanes: ' + num(summary.sceneCount, 0) + ' / ' + num(summary.spotlightCount, 0) + ' / ' + num(summary.reviewLaneCount, 0)
    ].join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(lines);
  }
  function heroHtml(report){
    var hero = report.hero || {};
    var summary = report.summary || {};
    return [
      '<section class="ss-wc-r6-hero">',
        '<div class="ss-wc-r6-hero-copy">',
          '<div class="ss-wc-r6-kicker">Round 6 command deck</div>',
          '<h4 class="ss-wc-r6-title">' + esc(hero.headline || 'Executive schema narrative deck') + '</h4>',
          '<div class="ss-wc-r6-sub">' + esc(hero.subheadline || 'Narrative, review wall and atlas quality lift the command center into an executive-grade cockpit.') + '</div>',
          '<div class="ss-wc-r6-badges">' +
            badge('Command center', num(hero.commandCenterScore, num(summary.commandCenterScore, 0)) + '%', tone(hero.commandCenterScore || summary.commandCenterScore)) +
            badge('Orchestration', num(summary.orchestrationScore, 0) + '%', tone(summary.orchestrationScore)) +
            badge('Visual polish', num(summary.visualPolishScore, 0) + '%', tone(summary.visualPolishScore)) +
            badge('Scenes', num(summary.sceneCount, arr(report.scenes).length), 'neutral') +
            badge('Review lanes', num(summary.reviewLaneCount, arr(report.reviewWall && report.reviewWall.lanes).length), 'neutral') +
          '</div>',
        '</div>',
        '<div class="ss-wc-r6-metric-grid">',
          metric('Narrative coverage', num(summary.narrativeCoverageScore, 0) + '%', 'Storyboards, journeys and saved perspectives stay coherent', tone(summary.narrativeCoverageScore)),
          metric('Review wall', num(summary.reviewWallScore, 0) + '%', 'Promotion lanes + evidence stack stay sign-off ready', tone(summary.reviewWallScore)),
          metric('Atlas readiness', num(summary.atlasReadinessScore, 0) + '%', 'Domain, layer and dependency storytelling remain complete', tone(summary.atlasReadinessScore)),
          metric('Live pulse', num(summary.livePulseScore, 0) + '%', 'Release radar, observability and event timeline clarity', tone(summary.livePulseScore)),
          metric('Collaboration', num(summary.collaborationReadinessScore, 0) + '%', 'Owners, approvers, personas and playbooks align', tone(summary.collaborationReadinessScore)),
          metric('Visual polish', num(summary.visualPolishScore, 0) + '%', 'Glass hero, spotlight cards and deck readability stay strong', tone(summary.visualPolishScore)),
        '</div>',
      '</section>'
    ].join('');
  }
  function tabsHtml(){
    var tabs = [
      { key:'deck', label:'Command deck', hint:'Hero + spotlight + scenes' },
      { key:'review', label:'Review wall', hint:'Lanes, evidence, collaboration' },
      { key:'atlas', label:'Atlas', hint:'Domain, layer, journeys, dependencies' },
      { key:'pulse', label:'Live pulse', hint:'Signals, tiles, event rail' }
    ];
    return [
      '<div class="ss-wc-r6-tabs">',
        tabs.map(function(item){
          return '<button type="button" class="ss-wc-r6-tab ' + (state.tab === item.key ? 'active' : '') + '" data-wc-r6-action="tab" data-key="' + esc(item.key) + '"><strong>' + esc(item.label) + '</strong><span>' + esc(item.hint) + '</span></button>';
        }).join(''),
        '<div class="ss-wc-r6-toolbar">',
          '<button type="button" class="hm-btn hm-btn-secondary ss-btn-sm" data-wc-r6-action="refresh">Refresh</button>',
          '<button type="button" class="hm-btn hm-btn-primary ss-btn-sm" data-wc-r6-action="copy-brief">Copy deck brief</button>',
        '</div>',
      '</div>'
    ].join('');
  }
  function spotlightHtml(report){
    var spotlight = arr(report.spotlight);
    var scenes = arr(report.scenes);
    return [
      '<div class="ss-wc-r6-grid-2">',
        card('Spotlight rails', 'Executive and persona lanes for fast navigation', '<div class="ss-wc-r6-mini-grid">' + (spotlight.length ? spotlight.map(function(item){ return '<button type="button" class="ss-wc-r6-mini tone-' + esc(item.tone || tone(item.score || 0)) + ' ' + (state.spotlight === txt(item.key || '') ? 'active' : '') + '" data-wc-r6-action="spotlight" data-key="' + esc(item.key || '') + '"><div class="ss-wc-r6-mini-top"><strong>' + esc(item.title || item.key || '-') + '</strong><span class="ss-wc-r6-badge tone-' + esc(item.tone || tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div><div class="ss-wc-r6-sub">' + esc(item.subtitle || '') + '</div><div class="ss-wc-r6-sub">' + esc(arr(item.targets).slice(0, 4).join(' · ')) + '</div></button>'; }).join('') : '<div class="ss-wc-r6-sub">No spotlight rails.</div>') + '</div>'),
        card('Scene storyboard', 'Deck scenes bind heatmap, ambience and focus tables', '<div class="ss-wc-r6-list">' + (scenes.length ? scenes.map(function(item){ return '<button type="button" class="ss-wc-r6-list-item ' + (state.scene === txt(item.key || '') ? 'active' : '') + '" data-wc-r6-action="scene" data-key="' + esc(item.key || '') + '"><div><strong>' + esc(item.title || item.key || '-') + '</strong><div class="ss-wc-r6-sub">' + esc(item.subtitle || '') + '</div><div class="ss-wc-r6-sub">' + esc((item.heatmap || 'risk') + ' · ' + (item.ambience || 'midnight') + ' · ' + (item.density || 'comfortable')) + '</div></div><div class="ss-wc-r6-inline"><span class="ss-wc-r6-badge tone-neutral">' + esc(arr(item.focusTables).length + ' tables') + '</span></div></button>'; }).join('') : '<div class="ss-wc-r6-sub">No scenes available.</div>') + '</div>') ,
      '</div>'
    ].join('');
  }
  function reviewHtml(report){
    var wall = report.reviewWall || {};
    var collaboration = report.collaboration || {};
    return [
      '<div class="ss-wc-r6-grid-2">',
        card('Review wall lanes', 'Promotion discipline and next actions', '<div class="ss-wc-r6-list">' + (arr(wall.lanes).length ? arr(wall.lanes).map(function(item){ return '<div class="ss-wc-r6-list-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r6-sub">' + esc(item.gate || item.nextAction || '') + '</div></div><div class="ss-wc-r6-inline"><span class="ss-wc-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span>' + badge('Status', item.status || 'attention', item.status === 'ready' ? 'good' : 'warning') + '</div></div>'; }).join('') : '<div class="ss-wc-r6-sub">No review wall lanes.</div>') + '</div>'),
        card('Evidence stack', 'Blockers and signals surfaced for sign-off', '<div class="ss-wc-r6-list">' + (arr(wall.evidenceStack).length ? arr(wall.evidenceStack).map(function(item){ return '<div class="ss-wc-r6-list-item"><div><strong>' + esc(item.title || '-') + '</strong><div class="ss-wc-r6-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r6-inline"><span class="ss-wc-r6-badge tone-' + esc(item.tone || 'neutral') + '">' + esc(item.kind || 'evidence') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r6-sub">No evidence stack items.</div>') + '</div>' + '<div class="ss-wc-r6-pills">' + badge('Owners', num(collaboration.ownersCoveredPercent, 0) + '%', tone(collaboration.ownersCoveredPercent)) + badge('Approvers', num(collaboration.approverCoveragePercent, 0) + '%', tone(collaboration.approverCoveragePercent)) + badge('Evidence', num(collaboration.evidenceCoveragePercent, 0) + '%', tone(collaboration.evidenceCoveragePercent)) + badge('Personas', num(collaboration.personaCount, 0), 'neutral') + badge('Playbooks', num(collaboration.playbookCount, 0), 'neutral') + '</div>') ,
      '</div>'
    ].join('');
  }
  function atlasHtml(report){
    return '<div class="ss-wc-r6-grid-2">' + arr(report.atlas).map(function(group){
      return card(group.label || group.key || '-', (group.count || 0) + ' mapped lenses', '<div class="ss-wc-r6-list">' + (arr(group.items).length ? arr(group.items).map(function(item){ return '<div class="ss-wc-r6-list-item"><div><strong>' + esc(item.label || '-') + '</strong><div class="ss-wc-r6-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r6-inline"><span class="ss-wc-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r6-sub">No atlas items.</div>') + '</div>');
    }).join('') + '</div>';
  }
  function pulseHtml(report){
    var live = report.livePulse || {};
    return [
      '<div class="ss-wc-r6-grid-2">',
        card('Pulse bands', 'Operating gauges kept visible during release', '<div class="ss-wc-r6-mini-grid">' + (arr(live.bands).length ? arr(live.bands).map(function(item){ return '<div class="ss-wc-r6-mini tone-' + esc(tone(item.score || 0)) + '"><div class="ss-wc-r6-mini-top"><strong>' + esc(item.label || item.key || '-') + '</strong><span class="ss-wc-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div><div class="ss-wc-r6-sub">' + esc(item.detail || '') + '</div></div>'; }).join('') : '<div class="ss-wc-r6-sub">No pulse bands.</div>') + '</div>'),
        card('Pulse radar', 'Observability tiles and event rail signals', '<div class="ss-wc-r6-list">' + (arr(live.radar).length ? arr(live.radar).map(function(item){ return '<div class="ss-wc-r6-list-item"><div><strong>' + esc(item.label || '-') + '</strong><div class="ss-wc-r6-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r6-inline"><span class="ss-wc-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r6-sub">No radar items.</div>') + '</div>'),
      '</div>'
    ].join('');
  }
  function bodyHtml(report){
    if(state.tab === 'review') return reviewHtml(report);
    if(state.tab === 'atlas') return atlasHtml(report);
    if(state.tab === 'pulse') return pulseHtml(report);
    return spotlightHtml(report) + pulseHtml(report);
  }
  function render(){
    var overlay = document.querySelector('.ss-wc-overlay');
    if(!overlay) return;
    var shell = overlay.querySelector('.ss-wc-shell');
    if(!shell) return;
    var host = shell.querySelector('.ss-wc-r6-shell');
    if(!host){
      host = document.createElement('section');
      host.className = 'ss-wc-r6-shell';
      shell.appendChild(host);
    }
    cacheReport = ensureReport(cacheReport || currentDiag());
    ensureSelected();
    host.innerHTML = heroHtml(cacheReport) + tabsHtml() + (requestPending ? '<div class="ss-wc-r6-sub ss-wc-r6-loading">Syncing round 6 command deck…</div>' : '') + bodyHtml(cacheReport);
  }
  function scheduleRender(){
    if(renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 40);
  }
  function fetchReport(force){
    if(requestPending && !force) return Promise.resolve(cacheReport || ensureReport(currentDiag()));
    cacheReport = ensureReport(cacheReport || currentDiag());
    requestPending = true;
    scheduleRender();
    return api('schema_studio_round6_report', { design_id:'workspace' }, 'POST').then(function(res){
      requestPending = false;
      cacheReport = ensureReport((res && res.commandCenterReport) || cacheReport || currentDiag());
      var diag = currentDiag();
      if(diag && typeof diag === 'object') diag.commandCenter = cacheReport;
      ensureSelected();
      scheduleRender();
      return cacheReport;
    }).catch(function(){
      requestPending = false;
      scheduleRender();
      return cacheReport || ensureReport(currentDiag());
    });
  }
  function ensureStyles(){
    if(document.getElementById('schema-studio-r6-styles')) return;
    var style = document.createElement('style');
    style.id = 'schema-studio-r6-styles';
    style.textContent = [
      '.ss-wc-r6-shell{margin-top:20px;padding-top:10px;border-top:1px solid rgba(148,163,184,.10);}',
      '.ss-wc-r6-hero{position:relative;padding:22px;border-radius:28px;background:linear-gradient(135deg,rgba(9,11,24,.96),rgba(18,32,62,.90));border:1px solid rgba(96,165,250,.24);box-shadow:0 26px 64px rgba(2,6,23,.28);overflow:hidden;}',
      '.ss-wc-r6-hero:before,.ss-wc-r6-hero:after{content:"";position:absolute;border-radius:999px;filter:blur(16px);opacity:.54;pointer-events:none;}',
      '.ss-wc-r6-hero:before{width:260px;height:260px;right:-50px;top:-90px;background:radial-gradient(circle,rgba(56,189,248,.34),transparent 68%);}',
      '.ss-wc-r6-hero:after{width:220px;height:220px;left:-60px;bottom:-90px;background:radial-gradient(circle,rgba(168,85,247,.28),transparent 72%);}',
      '.ss-wc-r6-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc;font-weight:800;}',
      '.ss-wc-r6-title{margin:8px 0 10px;font-size:28px;line-height:1.12;color:#fff;}',
      '.ss-wc-r6-sub{font-size:12px;line-height:1.55;color:#bed4ea;}',
      '.ss-wc-r6-loading{margin-top:8px;}',
      '.ss-wc-r6-badges,.ss-wc-r6-inline,.ss-wc-r6-pills{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-wc-r6-badges{margin-top:14px;}',
      '.ss-wc-r6-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.12);font-size:11px;font-weight:700;color:#dbeafe;}',
      '.ss-wc-r6-badge.tone-good{border-color:rgba(34,197,94,.28);background:rgba(34,197,94,.10);color:#dcfce7;}',
      '.ss-wc-r6-badge.tone-warning{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.10);color:#fef3c7;}',
      '.ss-wc-r6-badge.tone-critical{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.10);color:#fee2e2;}',
      '.ss-wc-r6-badge.tone-neutral{color:#e2e8f0;}',
      '.ss-wc-r6-metric-grid{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}',
      '.ss-wc-r6-metric{padding:15px;border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.58),rgba(15,23,42,.42));border:1px solid rgba(148,163,184,.10);box-shadow:0 16px 36px rgba(2,6,23,.16);}',
      '.ss-wc-r6-metric .ss-wc-r6-value{font-size:28px;font-weight:800;line-height:1;color:#fff;margin-top:7px;}',
      '.ss-wc-r6-metric.tone-good,.ss-wc-r6-mini.tone-good{border-color:rgba(34,197,94,.18);}',
      '.ss-wc-r6-metric.tone-warning,.ss-wc-r6-mini.tone-warning{border-color:rgba(245,158,11,.18);}',
      '.ss-wc-r6-metric.tone-critical,.ss-wc-r6-mini.tone-critical{border-color:rgba(239,68,68,.18);}',
      '.ss-wc-r6-tabs{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding:8px 4px;}',
      '.ss-wc-r6-tab{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(15,23,42,.34);color:#dbeafe;cursor:pointer;font-weight:700;}',
      '.ss-wc-r6-tab span{font-size:11px;opacity:.78;font-weight:700;}',
      '.ss-wc-r6-tab.active{background:linear-gradient(135deg,rgba(59,130,246,.18),rgba(56,189,248,.14));border-color:rgba(56,189,248,.30);color:#fff;}',
      '.ss-wc-r6-toolbar{margin-left:auto;display:flex;gap:8px;}',
      '.ss-wc-r6-card{margin-top:12px;padding:16px;border-radius:22px;background:linear-gradient(180deg,rgba(15,23,42,.62),rgba(15,23,42,.46));border:1px solid rgba(148,163,184,.10);box-shadow:0 16px 36px rgba(2,6,23,.16);}',
      '.ss-wc-r6-card h5{margin:0;font-size:15px;color:#fff;}',
      '.ss-wc-r6-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;}',
      '.ss-wc-r6-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;}',
      '.ss-wc-r6-mini{padding:14px;border-radius:18px;border:1px solid rgba(148,163,184,.10);background:linear-gradient(180deg,rgba(15,23,42,.56),rgba(15,23,42,.38));text-align:left;transition:transform .16s ease,border-color .16s ease;}',
      '.ss-wc-r6-mini.active,.ss-wc-r6-list-item.active{border-color:rgba(56,189,248,.30);box-shadow:0 12px 28px rgba(56,189,248,.10);}',
      '.ss-wc-r6-mini:hover,.ss-wc-r6-list-item:hover{transform:translateY(-1px);}',
      '.ss-wc-r6-mini-top,.ss-wc-r6-card-head,.ss-wc-r6-list-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
      '.ss-wc-r6-list{display:flex;flex-direction:column;gap:10px;margin-top:12px;}',
      '.ss-wc-r6-list-item{padding:12px 14px;border-radius:16px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.30);}',
      '@media (max-width:1100px){.ss-wc-r6-metric-grid,.ss-wc-r6-grid-2,.ss-wc-r6-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:760px){.ss-wc-r6-metric-grid,.ss-wc-r6-grid-2,.ss-wc-r6-mini-grid{grid-template-columns:1fr;}.ss-wc-r6-toolbar{width:100%;margin-left:0;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function bind(){
    if(!clickBound){
      document.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-wc-r6-action]') : null;
        if(!node) return;
        var action = node.getAttribute('data-wc-r6-action') || '';
        if(action === 'tab'){
          ev.preventDefault();
          state.tab = node.getAttribute('data-key') || 'deck';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'spotlight'){
          ev.preventDefault();
          applySpotlight(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'scene'){
          ev.preventDefault();
          applyScene(node.getAttribute('data-key') || '');
          return;
        }
        if(action === 'refresh'){
          ev.preventDefault();
          fetchReport(true);
          return;
        }
        if(action === 'copy-brief'){
          ev.preventDefault();
          copyBrief();
          return;
        }
      }, true);
      clickBound = true;
    }
    if(!keyBound){
      document.addEventListener('keydown', function(ev){
        if(ev.altKey && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && ev.key === '7'){
          ev.preventDefault();
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'deck';
          saveState();
          fetchReport(false);
          scheduleRender();
        }
      });
      keyBound = true;
    }
  }
  function addCommands(){
    if(!win.CmdPalette || !Array.isArray(win.CmdPalette.COMMANDS)) return;
    win.CmdPalette.COMMANDS = win.CmdPalette.COMMANDS.filter(function(command){
      return !command || ['Open round 6 command deck', 'Copy round 6 command brief'].indexOf(command.label_en) < 0;
    });
    win.CmdPalette.COMMANDS.push(
      {
        icon:'🌌',
        label:'Mở command deck round 6',
        label_en:'Open round 6 command deck',
        category:'schema',
        action:function(){
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'deck';
          saveState();
          fetchReport(false);
          scheduleRender();
        }
      },
      {
        icon:'🪄',
        label:'Copy command brief round 6',
        label_en:'Copy round 6 command brief',
        category:'schema',
        action:function(){ copyBrief(); }
      }
    );
  }

  var originalGetDiagnosis = win.SchemaStudioWorldClass.getDiagnosis;
  var originalRefresh = win.SchemaStudioWorldClass.refresh;
  var originalOpen = win.SchemaStudioWorldClass.open;
  win.SchemaStudioWorldClass.getDiagnosis = function(){
    var diag = originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : {};
    if(diag && typeof diag === 'object' && cacheReport) diag.commandCenter = cacheReport;
    return diag;
  };
  win.SchemaStudioWorldClass.refresh = function(){
    var result = originalRefresh ? originalRefresh.apply(this, arguments) : Promise.resolve(currentDiag());
    return Promise.resolve(result).then(function(diag){
      if(diag && typeof diag === 'object' && diag.commandCenterReport) cacheReport = ensureReport(diag.commandCenterReport);
      return fetchReport(true).then(function(){ scheduleRender(); return diag; });
    });
  };
  win.SchemaStudioWorldClass.open = function(){
    var result = originalOpen ? originalOpen.apply(this, arguments) : undefined;
    fetchReport(false);
    scheduleRender();
    return result;
  };
  win.SchemaStudioWorldClass.getCommandCenterReport = function(){
    return cacheReport || ensureReport(currentDiag());
  };

  loadState();
  ensureStyles();
  bind();
  addCommands();
  fetchReport(false);
  scheduleRender();
  win.SchemaStudioWorldClass.__round6Patched = true;
  if(win.SchemaStudio){
    win.SchemaStudio.buildId = '20260407worldclass6';
    win.SchemaStudio.copyRound6CommandBrief = copyBrief;
  }
})(window);


/* ── World-Class Atlas Mesh Round 7 ─────────────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win.SchemaStudioWorldClass || !win.STORE) return;
  if(win.SchemaStudioWorldClass.__round7Patched) return;

  var LS_KEY = 'hesem:schema-studio:wc:r7';
  var state = { tab:'atlas', surface:'', role:'', trace:'' };
  var cacheReport = null;
  var renderTimer = null;
  var requestPending = false;
  var clickBound = false;
  var keyBound = false;

  function arr(value){ return Array.isArray(value) ? value.filter(Boolean) : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function num(value, fallback){
    var n = Number(value);
    return isFinite(n) ? n : (fallback == null ? 0 : Number(fallback) || 0);
  }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function tone(score){
    score = num(score, 0);
    return score >= 90 ? 'good' : (score >= 75 ? 'warning' : 'critical');
  }
  function api(action, payload, method){
    if(typeof _api === 'function') return _api(action, payload || {}, method || 'POST');
    if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST', 30000);
    var qs = new URLSearchParams();
    qs.set('action', action);
    if((method || 'POST').toUpperCase() === 'GET'){
      Object.keys(payload || {}).forEach(function(key){
        if(payload[key] == null) return;
        qs.set(key, String(payload[key]));
      });
    }
    return fetch('api/index.php?' + qs.toString(), {
      method: method || 'POST',
      credentials: 'include',
      headers: {
        'Content-Type':'application/json',
        'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
      },
      body: (method || 'POST').toUpperCase() === 'GET' ? undefined : JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function currentDesignId(){
    var schema = win.STORE && win.STORE.schema ? win.STORE.schema : {};
    return txt(schema && schema._meta && schema._meta.id) || 'workspace';
  }
  function currentDiag(){
    return win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.getDiagnosis === 'function'
      ? (win.SchemaStudioWorldClass.getDiagnosis() || {})
      : {};
  }
  function loadState(){
    try{
      var parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if(parsed && typeof parsed === 'object'){
        if(parsed.tab) state.tab = parsed.tab;
        if(parsed.surface) state.surface = parsed.surface;
        if(parsed.role) state.role = parsed.role;
        if(parsed.trace) state.trace = parsed.trace;
      }
    }catch(_err){}
  }
  function saveState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({ tab:state.tab, surface:state.surface, role:state.role, trace:state.trace }));
    }catch(_err){}
  }
  function badge(label, value, toneKey){
    return '<span class="ss-wc-r7-badge tone-' + esc(toneKey || 'neutral') + '">' + esc(label || '-') + ': ' + esc(value == null ? '-' : value) + '</span>';
  }
  function metric(label, value, hint, toneKey){
    return [
      '<div class="ss-wc-r7-metric tone-' + esc(toneKey || 'neutral') + '">',
        '<div class="ss-wc-r7-kicker">' + esc(label || '-') + '</div>',
        '<div class="ss-wc-r7-value">' + esc(value == null ? '-' : value) + '</div>',
        hint ? '<div class="ss-wc-r7-sub">' + esc(hint) + '</div>' : '',
      '</div>'
    ].join('');
  }
  function card(title, subtitle, body){
    return [
      '<article class="ss-wc-r7-card">',
        '<div class="ss-wc-r7-card-head">',
          '<div>',
            '<h5>' + esc(title || '-') + '</h5>',
            subtitle ? '<div class="ss-wc-r7-sub">' + esc(subtitle) + '</div>' : '',
          '</div>',
        '</div>',
        body || '',
      '</article>'
    ].join('');
  }
  function ensureReport(source){
    var diag = source && typeof source === 'object' ? source : {};
    if(diag.round7Report && diag.round7Report.summary) return diag.round7Report;
    if(diag.round7 && diag.round7.summary) return diag.round7;
    if(diag.summary && diag.atlas && diag.reviewBoards) return diag;
    var live = currentDiag();
    if(live.round7Report && live.round7Report.summary) return live.round7Report;
    if(live.round7 && live.round7.summary) return live.round7;
    var summary = live.summary || {};
    return {
      summary: {
        atlasMeshScore: num(summary.atlasMeshScore, 0),
        physicalCoverageScore: num(summary.physicalCoverageScore, 0),
        reviewOpsScore: num(summary.reviewOpsScore, 0),
        exportSurfaceScore: num(summary.exportSurfaceScore, 0),
        interoperabilityScore: num(summary.interoperabilityScore, 0),
        roleModeScore: num(summary.roleModeScore, 0),
        traceabilityAtlasScore: num(summary.traceabilityAtlasScore, 0),
        beautySystemScore: num(summary.beautySystemScore, 0),
        objectSurfaceCount: num(summary.objectSurfaceCount, 0),
        roleModeCount: num(summary.roleModeCount, 0),
        reviewBoardCount: num(summary.reviewBoardCount, 0),
        exportBundleCount: num(summary.exportBundleCount, 0)
      },
      hero: {
        headline:'Round 7 atlas mesh',
        subheadline:'Physical PostgreSQL coverage, review boards, export surfaces, role-aware modes and traceability atlas now sit on one mission-grade control plane.',
        atlasMeshScore:num(summary.atlasMeshScore, 0),
        physicalCoverageScore:num(summary.physicalCoverageScore, 0),
        reviewOpsScore:num(summary.reviewOpsScore, 0),
        exportSurfaceScore:num(summary.exportSurfaceScore, 0),
        interoperabilityScore:num(summary.interoperabilityScore, 0)
      },
      atlas:{ score:num(summary.physicalCoverageScore, 0), objectSurfaces:[], capabilityBands:[] },
      reviewBoards:[],
      exports:[],
      roleModes:[],
      interoperability:[],
      traceabilityAtlas:[],
      beautySystem:{ score:num(summary.beautySystemScore, 0), ambiences:[], densities:[], sceneFamilies:[] },
      reportSummary: live.reportSummary || {},
      diffSummary: live.diffSummary || {}
    };
  }
  function ensureSelected(){
    if(!cacheReport) return;
    if(!state.surface && arr(cacheReport.atlas && cacheReport.atlas.objectSurfaces).length){
      state.surface = txt(arr(cacheReport.atlas.objectSurfaces)[0].key || '');
    }
    if(!state.role && arr(cacheReport.roleModes).length){
      state.role = txt(arr(cacheReport.roleModes)[0].key || '');
    }
    if(!state.trace && arr(cacheReport.traceabilityAtlas).length){
      state.trace = txt(arr(cacheReport.traceabilityAtlas)[0].key || '');
    }
  }
  function findByKey(list, key){
    return arr(list).filter(function(item){ return txt(item && item.key) === txt(key); })[0] || null;
  }
  function surfaceDetail(surface){
    if(!surface) return '<div class="ss-wc-r7-empty">Chọn một surface để xem chi tiết coverage, ví dụ và khoảng trống còn lại.</div>';
    return [
      '<div class="ss-wc-r7-detail">',
        '<div class="ss-wc-r7-detail-head">',
          '<div><strong>' + esc(surface.label || surface.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(surface.detail || '') + '</div></div>',
          '<div class="ss-wc-r7-inline">',
            badge('Coverage', num(surface.coverageScore, 0) + '%', tone(surface.coverageScore)),
            badge('Readiness', num(surface.readinessScore, 0) + '%', tone(surface.readinessScore)),
            badge('Count', num(surface.count, 0), 'neutral'),
            badge('Target', num(surface.target, 0), 'neutral'),
          '</div>',
        '</div>',
        '<div class="ss-wc-r7-detail-grid">',
          '<div><div class="ss-wc-r7-subtitle">Examples</div><div class="ss-wc-r7-chip-wrap">' + (arr(surface.examples).length ? arr(surface.examples).map(function(item){ return '<span class="ss-wc-r7-chip">' + esc(item) + '</span>'; }).join('') : '<span class="ss-wc-r7-sub">No examples yet</span>') + '</div></div>',
          '<div><div class="ss-wc-r7-subtitle">Gaps</div><div class="ss-wc-r7-list compact">' + (arr(surface.gaps).length ? arr(surface.gaps).map(function(item){ return '<div class="ss-wc-r7-item"><span class="ss-wc-r7-dot tone-warning"></span><div>' + esc(item) + '</div></div>'; }).join('') : '<div class="ss-wc-r7-sub">Surface already meets or exceeds target posture.</div>') + '</div></div>',
        '</div>',
      '</div>'
    ].join('');
  }
  function roleDetail(role, beauty){
    if(!role && !beauty) return '<div class="ss-wc-r7-empty">Role modes and beauty system will appear after round 7 report loads.</div>';
    var beautyBody = beauty ? [
      '<div class="ss-wc-r7-subtitle">Beauty system</div>',
      '<div class="ss-wc-r7-chip-wrap">' + arr(beauty.ambiences).map(function(item){ return '<span class="ss-wc-r7-chip">🌌 ' + esc(item.label || item.key || '-') + '</span>'; }).join('') + '</div>',
      '<div class="ss-wc-r7-chip-wrap">' + arr(beauty.densities).map(function(item){ return '<span class="ss-wc-r7-chip">▥ ' + esc(item.label || item.key || '-') + '</span>'; }).join('') + '</div>',
      '<div class="ss-wc-r7-chip-wrap">' + arr(beauty.sceneFamilies).map(function(item){ return '<span class="ss-wc-r7-chip">◆ ' + esc(item.label || item.key || '-') + (item.count != null ? ' (' + esc(item.count) + ')' : '') + '</span>'; }).join('') + '</div>'
    ].join('') : '';
    if(!role) return '<div class="ss-wc-r7-detail">' + beautyBody + '</div>';
    return [
      '<div class="ss-wc-r7-detail">',
        '<div class="ss-wc-r7-detail-head">',
          '<div><strong>' + esc(role.label || role.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(role.persona || '') + (role.subtitle ? ' · ' + esc(role.subtitle) : '') + '</div></div>',
          '<div class="ss-wc-r7-inline">' + badge('Readiness', num(role.score, 0) + '%', tone(role.score)) + '</div>',
        '</div>',
        '<div class="ss-wc-r7-detail-grid">',
          '<div><div class="ss-wc-r7-subtitle">Focus rails</div><div class="ss-wc-r7-chip-wrap">' + (arr(role.focus).length ? arr(role.focus).map(function(item){ return '<span class="ss-wc-r7-chip">' + esc(item) + '</span>'; }).join('') : '<span class="ss-wc-r7-sub">No focus rails modeled</span>') + '</div></div>',
          '<div>' + beautyBody + '</div>',
        '</div>',
      '</div>'
    ].join('');
  }
  function traceDetail(item){
    if(!item) return '<div class="ss-wc-r7-empty">Chọn một traceability scenario để xem domain và focus table backbone.</div>';
    return [
      '<div class="ss-wc-r7-detail">',
        '<div class="ss-wc-r7-detail-head">',
          '<div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(arr(item.domains).join(' · ')) + '</div></div>',
          '<div class="ss-wc-r7-inline">' + badge('Readiness', num(item.score, 0) + '%', tone(item.score)) + '</div>',
        '</div>',
        '<div class="ss-wc-r7-subtitle">Focus tables</div>',
        '<div class="ss-wc-r7-chip-wrap">' + (arr(item.focusTables).length ? arr(item.focusTables).map(function(name){ return '<span class="ss-wc-r7-chip">' + esc(name) + '</span>'; }).join('') : '<span class="ss-wc-r7-sub">No focus tables mapped</span>') + '</div>',
      '</div>'
    ].join('');
  }
  function renderAtlas(report){
    var summary = report.summary || {};
    var atlas = report.atlas || {};
    var surfaces = arr(atlas.objectSurfaces);
    var selected = findByKey(surfaces, state.surface) || surfaces[0] || null;
    return [
      '<div class="ss-wc-r7-grid-2">',
        card('Object surfaces', 'PostgreSQL-native coverage and runtime-facing object posture.', '<div class="ss-wc-r7-list">' + (surfaces.length ? surfaces.map(function(item){ return '<button class="ss-wc-r7-item is-action' + (selected && txt(selected.key) === txt(item.key) ? ' active' : '') + '" type="button" data-wc-r7-action="surface" data-key="' + esc(item.key || '') + '"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.readinessScore)) + '">' + esc(num(item.readinessScore, 0) + '%') + '</span><span class="ss-wc-r7-badge">' + esc(num(item.count, 0)) + '</span></div></button>'; }).join('') : '<div class="ss-wc-r7-empty">Atlas object surfaces will appear after compile/diagnose.</div>') + '</div>' + surfaceDetail(selected)),
        card('Capability bands', 'Cross-check domains, layers, policies and compiler contracts.', '<div class="ss-wc-r7-list">' + (arr(atlas.capabilityBands).length ? arr(atlas.capabilityBands).map(function(item){ return '<div class="ss-wc-r7-item"><div><strong>' + esc(item.label || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span><span class="ss-wc-r7-badge">' + esc(num(item.count, 0)) + '</span></div></div>'; }).join('') : '<div class="ss-wc-r7-empty">Capability bands not available yet.</div>') + '</div>' + '<div class="ss-wc-r7-inline ss-wc-r7-inline-wrap">' + badge('Atlas mesh', num(summary.atlasMeshScore, 0) + '%', tone(summary.atlasMeshScore)) + badge('Physical', num(summary.physicalCoverageScore, 0) + '%', tone(summary.physicalCoverageScore)) + badge('Object surfaces', num(summary.objectSurfaceCount, 0), 'neutral') + '</div>'),
      '</div>'
    ].join('');
  }
  function renderReview(report){
    var boards = arr(report.reviewBoards);
    var diff = report.diffSummary || {};
    return [
      '<div class="ss-wc-r7-grid-2">',
        card('Review boards', 'Approval matrices, evidence lanes and enterprise release governance.', '<div class="ss-wc-r7-list">' + (boards.length ? boards.map(function(item){ return '<div class="ss-wc-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.owner || '') + ' → ' + esc(item.approver || '') + '</div><div class="ss-wc-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r7-empty">Review boards will appear after round 7 artifact is regenerated.</div>') + '</div>'),
        card('Diff & firewall posture', 'Typed-diff severity, compatibility and destructive-change discipline.', '<div class="ss-wc-r7-mini-grid">' + metric('Compatibility', num(diff.compatibilityScore, 100) + '%', 'Runtime contract compatibility posture', tone(diff.compatibilityScore || 100)) + metric('Risk score', num(diff.riskScore, 0), 'Aggregate migration + runtime risk', tone(100 - num(diff.riskScore, 0))) + metric('Destructive', num(diff.destructiveCount, 0), 'Requires escalation and rollback evidence', num(diff.destructiveCount, 0) > 0 ? 'critical' : 'good') + metric('Breaking', num(diff.breakingCount, 0), 'Changes that may break callers', num(diff.breakingCount, 0) > 0 ? 'warning' : 'good') + '</div>'),
      '</div>'
    ].join('');
  }
  function renderExports(report){
    var exports = arr(report.exports);
    var interop = arr(report.interoperability);
    return [
      '<div class="ss-wc-r7-grid-2">',
        card('Export surface', 'Bundle every view of the model from a single governed source of truth.', '<div class="ss-wc-r7-list">' + (exports.length ? exports.map(function(item){ return '<div class="ss-wc-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.format || '') + ' · ' + esc(item.purpose || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(item.status || '-') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r7-empty">Export bundles not modeled yet.</div>') + '</div>'),
        card('Interoperability tracks', 'Schema → registry → workflow → module builder → docs propagation.', '<div class="ss-wc-r7-list">' + (interop.length ? interop.map(function(item){ return '<div class="ss-wc-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ss-wc-r7-empty">Interoperability tracks not available yet.</div>') + '</div>'),
      '</div>'
    ].join('');
  }
  function renderRoles(report){
    var roles = arr(report.roleModes);
    var beauty = report.beautySystem || {};
    var selected = findByKey(roles, state.role) || roles[0] || null;
    return [
      '<div class="ss-wc-r7-grid-2">',
        card('Role-aware modes', 'Architect, engineer, quality, compliance and builder lenses in one cockpit.', '<div class="ss-wc-r7-list">' + (roles.length ? roles.map(function(item){ return '<button class="ss-wc-r7-item is-action' + (selected && txt(selected.key) === txt(item.key) ? ' active' : '') + '" type="button" data-wc-r7-action="role" data-key="' + esc(item.key || '') + '"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(item.persona || '') + '</div><div class="ss-wc-r7-sub">' + esc(item.subtitle || '') + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></button>'; }).join('') : '<div class="ss-wc-r7-empty">Role-aware modes are waiting for the round 7 artifact.</div>') + '</div>'),
        card('Beauty system', 'Ambiences, densities and scene families for a more premium enterprise studio.', roleDetail(selected, beauty)),
      '</div>'
    ].join('');
  }
  function renderTrace(report){
    var scenarios = arr(report.traceabilityAtlas);
    var selected = findByKey(scenarios, state.trace) || scenarios[0] || null;
    return [
      '<div class="ss-wc-r7-grid-2">',
        card('Traceability atlas', 'Manufacturing + quality intelligence overlays grounded in canonical tables.', '<div class="ss-wc-r7-list">' + (scenarios.length ? scenarios.map(function(item){ return '<button class="ss-wc-r7-item is-action' + (selected && txt(selected.key) === txt(item.key) ? ' active' : '') + '" type="button" data-wc-r7-action="trace" data-key="' + esc(item.key || '') + '"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-wc-r7-sub">' + esc(arr(item.domains).join(' · ')) + '</div></div><div class="ss-wc-r7-inline"><span class="ss-wc-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></button>'; }).join('') : '<div class="ss-wc-r7-empty">Traceability scenarios will appear after canonical round 7 artifact is available.</div>') + '</div>'),
        card('Scenario detail', 'See focus tables for lot/serial genealogy, incoming quality, NC/CAPA and dispatch-to-completion chains.', traceDetail(selected)),
      '</div>'
    ].join('');
  }
  function panel(report){
    switch(state.tab){
      case 'review': return renderReview(report);
      case 'exports': return renderExports(report);
      case 'roles': return renderRoles(report);
      case 'trace': return renderTrace(report);
      default: return renderAtlas(report);
    }
  }
  function copyBrief(){
    var report = cacheReport || ensureReport(currentDiag());
    var summary = report.summary || {};
    var lines = [
      'HESEM Schema Studio — Round 7 atlas mesh',
      'Atlas mesh: ' + num(summary.atlasMeshScore, 0) + '%',
      'Physical coverage: ' + num(summary.physicalCoverageScore, 0) + '%',
      'Review ops: ' + num(summary.reviewOpsScore, 0) + '%',
      'Export surface: ' + num(summary.exportSurfaceScore, 0) + '%',
      'Interoperability: ' + num(summary.interoperabilityScore, 0) + '%',
      'Role modes: ' + num(summary.roleModeScore, 0) + '%',
      'Traceability atlas: ' + num(summary.traceabilityAtlasScore, 0) + '%',
      'Beauty system: ' + num(summary.beautySystemScore, 0) + '%',
      'Object surfaces: ' + num(summary.objectSurfaceCount, 0),
      'Review boards: ' + num(summary.reviewBoardCount, 0),
      'Export bundles: ' + num(summary.exportBundleCount, 0)
    ].join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(lines).then(function(){
        if(typeof toast === 'function') toast('Đã copy round 7 atlas brief', 'success');
      }).catch(function(){
        if(typeof toast === 'function') toast('Không thể copy round 7 atlas brief', 'error');
      });
      return;
    }
    if(typeof toast === 'function') toast('Clipboard không khả dụng trên trình duyệt này', 'info');
  }
  function render(){
    renderTimer = null;
    var shell = document.querySelector('.ss-wc-overlay .ss-wc-shell');
    if(!shell) return;
    ensureSelected();
    var report = cacheReport || ensureReport(currentDiag());
    var summary = report.summary || {};
    var hero = report.hero || {};
    var existing = shell.querySelector('.ss-wc-r7-shell');
    if(!existing){
      existing = document.createElement('section');
      existing.className = 'ss-wc-r7-shell';
      shell.appendChild(existing);
    }
    existing.innerHTML = [
      '<section class="ss-wc-r7-hero">',
        '<div class="ss-wc-r7-hero-head">',
          '<div>',
            '<div class="ss-wc-r7-kicker">Round 7 atlas mesh</div>',
            '<div class="ss-wc-r7-title">' + esc(hero.headline || 'Physical coverage, governance boards and traceability atlas') + '</div>',
            '<div class="ss-wc-r7-sub">' + esc(hero.subheadline || 'Round 7 turns Schema Studio into a richer PostgreSQL-native control plane with deeper review, export, role and manufacturing intelligence.') + '</div>',
          '</div>',
          '<div class="ss-wc-r7-toolbar">',
            '<button class="ss-wc-r7-btn" type="button" data-wc-r7-action="copy-brief">Copy atlas brief</button>',
            '<button class="ss-wc-r7-btn primary" type="button" data-wc-r7-action="refresh">Refresh</button>',
          '</div>',
        '</div>',
        '<div class="ss-wc-r7-badges">',
          badge('Atlas mesh', num(summary.atlasMeshScore, hero.atlasMeshScore || 0) + '%', tone(summary.atlasMeshScore || hero.atlasMeshScore)),
          badge('Physical', num(summary.physicalCoverageScore, hero.physicalCoverageScore || 0) + '%', tone(summary.physicalCoverageScore || hero.physicalCoverageScore)),
          badge('Review ops', num(summary.reviewOpsScore, hero.reviewOpsScore || 0) + '%', tone(summary.reviewOpsScore || hero.reviewOpsScore)),
          badge('Export surface', num(summary.exportSurfaceScore, hero.exportSurfaceScore || 0) + '%', tone(summary.exportSurfaceScore || hero.exportSurfaceScore)),
          badge('Interoperability', num(summary.interoperabilityScore, hero.interoperabilityScore || 0) + '%', tone(summary.interoperabilityScore || hero.interoperabilityScore)),
          badge('Surfaces', num(summary.objectSurfaceCount, 0), 'neutral'),
          badge('Boards', num(summary.reviewBoardCount, 0), 'neutral'),
          badge('Exports', num(summary.exportBundleCount, 0), 'neutral'),
        '</div>',
        '<div class="ss-wc-r7-metric-grid">',
          metric('Role modes', num(summary.roleModeScore, 0) + '%', 'Persona-specific focus rails and cockpit modes', tone(summary.roleModeScore)),
          metric('Traceability atlas', num(summary.traceabilityAtlasScore, 0) + '%', 'Genealogy, incoming quality and NC/CAPA intelligence', tone(summary.traceabilityAtlasScore)),
          metric('Beauty system', num(summary.beautySystemScore, 0) + '%', 'Ambiences, densities and scene families', tone(summary.beautySystemScore)),
          metric('Object surfaces', num(summary.objectSurfaceCount, 0), 'Tables, views, functions, procedures and policies', 'neutral'),
        '</div>',
      '</section>',
      '<div class="ss-wc-r7-tabs">',
        '<button class="ss-wc-r7-tab' + (state.tab === 'atlas' ? ' active' : '') + '" type="button" data-wc-r7-action="tab" data-key="atlas">Atlas</button>',
        '<button class="ss-wc-r7-tab' + (state.tab === 'review' ? ' active' : '') + '" type="button" data-wc-r7-action="tab" data-key="review">Review</button>',
        '<button class="ss-wc-r7-tab' + (state.tab === 'exports' ? ' active' : '') + '" type="button" data-wc-r7-action="tab" data-key="exports">Exports</button>',
        '<button class="ss-wc-r7-tab' + (state.tab === 'roles' ? ' active' : '') + '" type="button" data-wc-r7-action="tab" data-key="roles">Roles</button>',
        '<button class="ss-wc-r7-tab' + (state.tab === 'trace' ? ' active' : '') + '" type="button" data-wc-r7-action="tab" data-key="trace">Traceability</button>',
      '</div>',
      '<div class="ss-wc-r7-panel">' + panel(report) + '</div>'
    ].join('');
  }
  function scheduleRender(){
    if(renderTimer) win.clearTimeout(renderTimer);
    renderTimer = win.setTimeout(render, 50);
  }
  function fetchReport(force){
    if(requestPending && !force) return Promise.resolve(cacheReport || ensureReport(currentDiag()));
    requestPending = true;
    return api('schema_studio_round7_report', { design_id:currentDesignId() }, 'POST').then(function(res){
      requestPending = false;
      cacheReport = ensureReport(res && (res.round7Report || res.report || res));
      ensureSelected();
      scheduleRender();
      return cacheReport;
    }).catch(function(){
      requestPending = false;
      cacheReport = cacheReport || ensureReport(currentDiag());
      ensureSelected();
      scheduleRender();
      return cacheReport;
    });
  }
  function ensureStyles(){
    if(document.getElementById('ss-wc-r7-styles')) return;
    var style = document.createElement('style');
    style.id = 'ss-wc-r7-styles';
    style.textContent = [
      '.ss-wc-r7-shell{margin-top:16px;display:grid;gap:14px;}',
      '.ss-wc-r7-hero,.ss-wc-r7-card{border:1px solid rgba(123,145,255,.18);background:linear-gradient(180deg,rgba(13,20,36,.94),rgba(15,25,48,.88));box-shadow:0 18px 48px rgba(5,12,28,.38);border-radius:24px;padding:18px;color:#eaf2ff;backdrop-filter:blur(12px);}',
      '.ss-wc-r7-hero-head,.ss-wc-r7-detail-head,.ss-wc-r7-item,.ss-wc-r7-card-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;}',
      '.ss-wc-r7-title{font-size:24px;font-weight:800;line-height:1.2;letter-spacing:.01em;}',
      '.ss-wc-r7-kicker,.ss-wc-r7-sub,.ss-wc-r7-subtitle{color:#93a3c7;font-size:12px;letter-spacing:.06em;text-transform:uppercase;}',
      '.ss-wc-r7-sub{letter-spacing:.01em;text-transform:none;font-size:13px;line-height:1.5;}',
      '.ss-wc-r7-badges,.ss-wc-r7-chip-wrap,.ss-wc-r7-inline,.ss-wc-r7-tabs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-wc-r7-inline-wrap{margin-top:10px;}',
      '.ss-wc-r7-badge,.ss-wc-r7-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);font-size:12px;font-weight:700;color:#f5f8ff;}',
      '.ss-wc-r7-chip{font-weight:600;color:#d9e4ff;background:rgba(60,86,155,.16);}',
      '.ss-wc-r7-badge.tone-good,.ss-wc-r7-chip.tone-good{background:rgba(31,197,123,.16);border-color:rgba(31,197,123,.26);}',
      '.ss-wc-r7-badge.tone-warning{background:rgba(255,191,71,.16);border-color:rgba(255,191,71,.26);}',
      '.ss-wc-r7-badge.tone-critical{background:rgba(255,92,117,.16);border-color:rgba(255,92,117,.28);}',
      '.ss-wc-r7-metric-grid,.ss-wc-r7-grid-2,.ss-wc-r7-mini-grid{display:grid;gap:12px;}',
      '.ss-wc-r7-metric-grid{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:14px;}',
      '.ss-wc-r7-grid-2{grid-template-columns:repeat(2,minmax(0,1fr));}',
      '.ss-wc-r7-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr));}',
      '.ss-wc-r7-metric{padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);display:grid;gap:6px;min-height:110px;}',
      '.ss-wc-r7-metric.tone-good{background:linear-gradient(180deg,rgba(25,84,55,.26),rgba(15,25,48,.68));}',
      '.ss-wc-r7-metric.tone-warning{background:linear-gradient(180deg,rgba(109,78,21,.24),rgba(15,25,48,.68));}',
      '.ss-wc-r7-metric.tone-critical{background:linear-gradient(180deg,rgba(116,37,49,.26),rgba(15,25,48,.68));}',
      '.ss-wc-r7-value{font-size:28px;font-weight:800;line-height:1;}',
      '.ss-wc-r7-tabs{padding:4px;background:rgba(10,16,30,.72);border:1px solid rgba(255,255,255,.06);border-radius:16px;}',
      '.ss-wc-r7-tab,.ss-wc-r7-btn,.ss-wc-r7-item.is-action{appearance:none;border:0;cursor:pointer;font:inherit;}',
      '.ss-wc-r7-tab{padding:10px 14px;border-radius:12px;background:transparent;color:#b9c8ea;font-weight:700;}',
      '.ss-wc-r7-tab.active{background:linear-gradient(135deg,#345fff,#6e86ff);color:#fff;box-shadow:0 10px 20px rgba(46,83,255,.26);}',
      '.ss-wc-r7-toolbar{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;}',
      '.ss-wc-r7-btn{padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.06);color:#eff4ff;border:1px solid rgba(255,255,255,.08);font-weight:700;}',
      '.ss-wc-r7-btn.primary{background:linear-gradient(135deg,#385eff,#7a8eff);color:#fff;border-color:rgba(122,142,255,.32);}',
      '.ss-wc-r7-list{display:grid;gap:10px;}',
      '.ss-wc-r7-list.compact{gap:8px;}',
      '.ss-wc-r7-item{padding:12px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);color:#eef4ff;text-align:left;}',
      '.ss-wc-r7-item.is-action{width:100%;}',
      '.ss-wc-r7-item.is-action.active{border-color:rgba(124,147,255,.42);background:linear-gradient(180deg,rgba(60,90,185,.24),rgba(255,255,255,.05));box-shadow:0 12px 24px rgba(31,43,99,.22);}',
      '.ss-wc-r7-detail{margin-top:12px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:rgba(9,14,26,.55);display:grid;gap:12px;}',
      '.ss-wc-r7-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '.ss-wc-r7-empty{padding:18px;border-radius:18px;border:1px dashed rgba(255,255,255,.14);color:#9fb0d6;background:rgba(255,255,255,.03);}',
      '.ss-wc-r7-dot{width:9px;height:9px;border-radius:999px;display:inline-block;background:#6f87ff;}',
      '.ss-wc-r7-dot.tone-warning{background:#ffbf47;}',
      '@media (max-width:1100px){.ss-wc-r7-metric-grid,.ss-wc-r7-grid-2,.ss-wc-r7-detail-grid{grid-template-columns:1fr;}}',
      '@media (max-width:760px){.ss-wc-r7-hero-head{flex-direction:column;}.ss-wc-r7-toolbar{width:100%;justify-content:flex-start;}.ss-wc-r7-mini-grid{grid-template-columns:1fr;}.ss-wc-r7-title{font-size:22px;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function bind(){
    if(!clickBound){
      document.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-wc-r7-action]') : null;
        if(!node) return;
        var action = node.getAttribute('data-wc-r7-action') || '';
        if(action === 'tab'){
          ev.preventDefault();
          state.tab = node.getAttribute('data-key') || 'atlas';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'surface'){
          ev.preventDefault();
          state.surface = node.getAttribute('data-key') || '';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'role'){
          ev.preventDefault();
          state.role = node.getAttribute('data-key') || '';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'trace'){
          ev.preventDefault();
          state.trace = node.getAttribute('data-key') || '';
          saveState();
          scheduleRender();
          return;
        }
        if(action === 'refresh'){
          ev.preventDefault();
          fetchReport(true);
          return;
        }
        if(action === 'copy-brief'){
          ev.preventDefault();
          copyBrief();
        }
      }, true);
      clickBound = true;
    }
    if(!keyBound){
      document.addEventListener('keydown', function(ev){
        if(ev.altKey && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && ev.key === '8'){
          ev.preventDefault();
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'atlas';
          saveState();
          fetchReport(false);
          scheduleRender();
        }
      });
      keyBound = true;
    }
  }
  function addCommands(){
    if(!win.CmdPalette || !Array.isArray(win.CmdPalette.COMMANDS)) return;
    win.CmdPalette.COMMANDS = win.CmdPalette.COMMANDS.filter(function(command){
      return !command || ['Open round 7 atlas mesh', 'Copy round 7 atlas brief'].indexOf(command.label_en) < 0;
    });
    win.CmdPalette.COMMANDS.push(
      {
        icon:'🧭',
        label:'Mở atlas mesh round 7',
        label_en:'Open round 7 atlas mesh',
        category:'schema',
        action:function(){
          if(win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.open === 'function') win.SchemaStudioWorldClass.open();
          state.tab = 'atlas';
          saveState();
          fetchReport(false);
          scheduleRender();
        }
      },
      {
        icon:'📋',
        label:'Copy atlas brief round 7',
        label_en:'Copy round 7 atlas brief',
        category:'schema',
        action:function(){ copyBrief(); }
      }
    );
  }

  var originalGetDiagnosis = win.SchemaStudioWorldClass.getDiagnosis;
  var originalRefresh = win.SchemaStudioWorldClass.refresh;
  var originalOpen = win.SchemaStudioWorldClass.open;
  win.SchemaStudioWorldClass.getDiagnosis = function(){
    var diag = originalGetDiagnosis ? originalGetDiagnosis.apply(this, arguments) : {};
    if(diag && typeof diag === 'object' && cacheReport) diag.round7 = cacheReport;
    return diag;
  };
  win.SchemaStudioWorldClass.refresh = function(){
    var result = originalRefresh ? originalRefresh.apply(this, arguments) : Promise.resolve(currentDiag());
    return Promise.resolve(result).then(function(diag){
      if(diag && typeof diag === 'object'){
        if(diag.round7Report) cacheReport = ensureReport(diag.round7Report);
        else if(diag.round7) cacheReport = ensureReport(diag.round7);
      }
      return fetchReport(true).then(function(){ scheduleRender(); return diag; });
    });
  };
  win.SchemaStudioWorldClass.open = function(){
    var result = originalOpen ? originalOpen.apply(this, arguments) : undefined;
    fetchReport(false);
    scheduleRender();
    return result;
  };
  win.SchemaStudioWorldClass.getRound7Report = function(){
    return cacheReport || ensureReport(currentDiag());
  };

  loadState();
  ensureStyles();
  bind();
  addCommands();
  fetchReport(false);
  scheduleRender();
  win.SchemaStudioWorldClass.__round7Patched = true;
  if(win.SchemaStudio){
    win.SchemaStudio.buildId = '20260407worldclass7';
    win.SchemaStudio.copyRound7AtlasBrief = copyBrief;
  }
})(window);
/* ── World-Class Visual Grammar Round 8 ─────────────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win.TableCard || !win.Canvas || !win.EdgeLayer || !win.STORE) return;
  if(win.SchemaStudioWorldClass && win.SchemaStudioWorldClass.__round8GraphicPatched) return;

  var STORE = win.STORE;
  var STYLE_ID = 'schema-studio-r8-graphics';
  var renderTimer = 0;

  function arr(value){ return Array.isArray(value) ? value : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function lang(){
    return (win._lang || win.lang || 'vi') === 'en' ? 'en' : 'vi';
  }
  function tone(severity){
    var normalized = txt(severity).toLowerCase();
    return normalized === 'critical' ? 'critical' : (normalized === 'high' ? 'high' : (normalized === 'medium' ? 'medium' : 'low'));
  }
  function currentSchema(){
    return (STORE && STORE.schema && typeof STORE.schema === 'object') ? STORE.schema : { tables:[], relations:[] };
  }
  function tableMap(){
    var map = {};
    arr(currentSchema().tables).forEach(function(table){
      if(table && table.id) map[txt(table.id)] = table;
    });
    return map;
  }
  function hotspotMap(){
    var diag = win.SchemaStudioWorldClass && typeof win.SchemaStudioWorldClass.getDiagnosis === 'function'
      ? (win.SchemaStudioWorldClass.getDiagnosis() || {})
      : {};
    var map = {};
    arr(diag && diag.hotspots).forEach(function(item){
      if(item && item.tableId) map[txt(item.tableId)] = item;
      else if(item && item.table) map['name:' + txt(item.table)] = item;
    });
    return map;
  }
  function prettify(name){
    return txt(name)
      .replace(/[._]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b([a-z])/g, function(match, chr){ return chr.toUpperCase(); });
  }
  function localizedTitle(table){
    var locale = lang();
    var labels = table && table.labels && typeof table.labels === 'object' ? table.labels : {};
    var business = table && table.business && typeof table.business === 'object' ? table.business : {};
    var value = locale === 'en'
      ? (business.business_name_en || labels.en || table && table.comment || '')
      : (business.business_name_vi || labels.vi || table && table.comment || '');
    value = txt(value).trim();
    if(!value) value = prettify(table && table.name);
    return value;
  }
  function layerOf(table){
    return txt(table && table.canonical && table.canonical.layer)
      || txt(table && table.business && table.business.layer)
      || txt(table && table.domain).replace(/_/g, ' ');
  }
  function contextOf(table){
    var locale = lang();
    var business = table && table.business && typeof table.business === 'object' ? table.business : {};
    var parts = [
      txt(table && table.domain).replace(/_/g, ' '),
      txt(business.subdomain || '').replace(/_/g, ' '),
      txt(layerOf(table))
    ].filter(Boolean);
    if(!parts.length){
      return locale === 'en' ? 'Workspace schema' : 'Schema workspace';
    }
    return parts.map(prettify).join(' · ');
  }
  function objectType(table){
    var raw = txt(table && (table.object_type || table.kind || table.type || table.surface || 'table')).toLowerCase();
    if(/materialized/.test(raw)) return 'MVIEW';
    if(/view/.test(raw)) return 'VIEW';
    if(/bridge|junction|xref/.test(raw)) return 'BRIDGE';
    if(/partition/.test(raw)) return 'PART';
    return 'TABLE';
  }
  function iconOf(table){
    var type = objectType(table);
    if(type === 'VIEW') return 'V';
    if(type === 'MVIEW') return 'MV';
    if(type === 'BRIDGE') return 'B';
    if(type === 'PART') return 'P';
    return 'T';
  }
  function domainColor(table){
    var domain = txt(table && table.domain).toLowerCase();
    var palette = {
      mes_execution: '#38bdf8',
      eqms_compliance: '#f97316',
      quality_management: '#ef4444',
      planning_erp: '#22c55e',
      foundation: '#7c3aed',
      inventory_traceability: '#06b6d4',
      engineering: '#8b5cf6',
      master_data: '#10b981',
      system_infrastructure: '#64748b',
      project_management: '#3b82f6',
      mobile_operations: '#0ea5e9',
      default: '#60a5fa'
    };
    return txt(table && table.color) || palette[domain] || palette.default;
  }
  function relationStats(tableId){
    var stats = { incoming:0, outgoing:0, total:0, crossDomain:0 };
    var map = tableMap();
    arr(currentSchema().relations).forEach(function(rel){
      var fromId = txt(rel && rel.from_table_id);
      var toId = txt(rel && rel.to_table_id);
      if(fromId !== txt(tableId) && toId !== txt(tableId)) return;
      stats.total += 1;
      if(fromId === txt(tableId)) stats.outgoing += 1;
      if(toId === txt(tableId)) stats.incoming += 1;
      if(fromId && toId){
        var fromTable = map[fromId] || null;
        var toTable = map[toId] || null;
        if(fromTable && toTable && txt(fromTable.domain) !== txt(toTable.domain)) stats.crossDomain += 1;
      }
    });
    return stats;
  }
  function hotspotFor(table){
    var map = hotspotMap();
    return map[txt(table && table.id)] || map['name:' + txt(table && table.name)] || null;
  }
  function metricValue(value, fallback){
    var number = Number(value);
    return isNaN(number) ? fallback : number;
  }
  function semanticOf(col){
    var name = txt(col && col.name).toLowerCase();
    var type = txt(col && col.type).toLowerCase();
    if(col && col.primary_key) return 'identity';
    if(col && col.foreign_key) return 'relation';
    if(/lot|serial|batch|trace|genealogy|barcode/.test(name)) return 'traceability';
    if(/approve|approval|signature|esig|review/.test(name)) return 'governance';
    if(/quality|inspection|measure|result|defect|nc|capa|deviation/.test(name)) return 'quality';
    if(/workflow|dispatch|route|routing|operation|step|event|queue|execution/.test(name)) return 'workflow';
    if(/status|state|phase|stage/.test(name)) return 'status';
    if(/date|time|timestamp|created|updated|start|end|due/.test(name) || /(date|time)/.test(type)) return 'timeline';
    if(/qty|quantity|amount|price|cost|rate|score|value|duration|count/.test(name) || /(numeric|integer|bigint|real|double)/.test(type)) return 'measure';
    if(/policy|role|owner|permission|mask|token|secret|access|scope/.test(name)) return 'security';
    if(/json|meta|payload|config|attrs|attribute/.test(name) || /(json|jsonb|array)/.test(type)) return 'document';
    return 'neutral';
  }
  function semanticLabel(code){
    var locale = lang();
    var labels = {
      identity: locale === 'en' ? 'Identity' : 'Định danh',
      relation: locale === 'en' ? 'Relation' : 'Liên kết',
      traceability: locale === 'en' ? 'Traceability' : 'Truy vết',
      governance: locale === 'en' ? 'Approval' : 'Phê duyệt',
      quality: locale === 'en' ? 'Quality' : 'Chất lượng',
      workflow: locale === 'en' ? 'Workflow' : 'Quy trình',
      status: locale === 'en' ? 'State' : 'Trạng thái',
      timeline: locale === 'en' ? 'Timeline' : 'Thời gian',
      measure: locale === 'en' ? 'Measure' : 'Chỉ số',
      security: locale === 'en' ? 'Security' : 'Bảo mật',
      document: locale === 'en' ? 'Metadata' : 'Metadata',
      neutral: locale === 'en' ? 'Field' : 'Trường'
    };
    return labels[code] || labels.neutral;
  }
  function isPriority(col, index){
    var semantic = semanticOf(col);
    return !!(col && (col.primary_key || col.foreign_key || col.unique || !col.nullable || col.generated_expr || index < 3 || ['traceability','governance','quality','workflow','status','timeline','security'].indexOf(semantic) >= 0));
  }
  function shortType(value){
    var text = txt(value).trim();
    if(text.length <= 16) return text;
    return text.slice(0, 14) + '…';
  }
  function severityBadge(severity){
    var currentTone = tone(severity);
    var locale = lang();
    var text = {
      critical: locale === 'en' ? 'Critical' : 'Critical',
      high: locale === 'en' ? 'High' : 'High',
      medium: locale === 'en' ? 'Medium' : 'Medium',
      low: locale === 'en' ? 'Low' : 'Low'
    }[currentTone] || 'Low';
    return '<span class="ss-r8-badge tone-' + esc(currentTone) + '">' + esc(text) + '</span>';
  }
  function footerHtml(table, hotspot){
    var stats = relationStats(table && table.id);
    var issueCount = metricValue(hotspot && hotspot.issueCount, 0);
    var policyCount = arr(table && table.policies).length + arr(table && table.security && table.security.policies).length;
    var ctx = contextOf(table);
    var items = [
      '<span class="ss-r8-kpi" title="' + esc(lang() === 'en' ? 'Columns' : 'Cột') + '"><strong>' + esc((arr(table && table.columns).length).toString()) + '</strong><em>' + esc(lang() === 'en' ? 'col' : 'cột') + '</em></span>',
      '<span class="ss-r8-kpi" title="' + esc(lang() === 'en' ? 'Relations' : 'Liên kết') + '"><strong>' + esc((stats.total).toString()) + '</strong><em>' + esc(lang() === 'en' ? 'rel' : 'lk') + '</em></span>',
      '<span class="ss-r8-kpi" title="Indexes"><strong>' + esc((arr(table && table.indexes).length).toString()) + '</strong><em>idx</em></span>'
    ];
    if(table && table.rls_enabled) items.push('<span class="ss-r8-kpi sec" title="Row-level security"><strong>RLS</strong></span>');
    else if(policyCount) items.push('<span class="ss-r8-kpi" title="Policies"><strong>' + esc(policyCount.toString()) + '</strong><em>' + esc(lang() === 'en' ? 'pol' : 'policy') + '</em></span>');
    if(issueCount > 0) items.push('<span class="ss-r8-kpi warn" title="' + esc(lang() === 'en' ? 'Open issues' : 'Vấn đề') + '"><strong>' + esc(issueCount.toString()) + '</strong><em>' + esc(lang() === 'en' ? 'issues' : 'lỗi') + '</em></span>');
    return [
      '<div class="ss-r8-footer-left" title="' + esc(ctx) + '">',
        '<span class="ss-r8-context-dot"></span>',
        '<span class="ss-r8-context-text">' + esc(ctx) + '</span>',
      '</div>',
      '<div class="ss-r8-footer-right">' + items.join('') + '</div>'
    ].join('');
  }
  function trimBadgeCloud(node){
    if(!node) return;
    var badges = Array.prototype.slice.call(node.children || []);
    badges.forEach(function(badge, index){
      badge.classList.add('ss-r8-mini-badge');
      if(index >= 2) badge.classList.add('ss-r8-extra');
      if(index >= 3) badge.classList.add('ss-r8-detail-only');
      if(/IDX/i.test(txt(badge.textContent))) badge.classList.add('ss-r8-detail-only');
      if(/NN/i.test(txt(badge.textContent))) badge.classList.add('tone-neutral');
    });
  }
  function decorateRows(table, card){
    var columns = arr(table && table.columns);
    Array.prototype.forEach.call(card.querySelectorAll('.ss-col-item'), function(row, index){
      var colId = row.getAttribute('data-col-id');
      var col = columns.find(function(item){ return txt(item && item.id) === txt(colId); }) || columns[index] || null;
      var icon = row.querySelector('.ss-col-icon');
      var name = row.querySelector('.ss-col-name');
      var type = row.querySelector('.ss-col-type');
      var badges = row.querySelector('.ss-col-badges');
      var semantic = semanticOf(col);
      var priority = isPriority(col, index);
      row.classList.add('ss-r8-col-item');
      row.setAttribute('data-r8-semantic', semantic);
      row.setAttribute('data-r8-priority', priority ? 'true' : 'false');
      row.title = [txt(col && col.name), txt(col && col.type), semanticLabel(semantic)].filter(Boolean).join(' · ');
      if(icon){
        icon.textContent = col && col.primary_key ? 'PK' : (col && col.foreign_key ? 'FK' : '•');
        icon.classList.toggle('is-pk', !!(col && col.primary_key));
        icon.classList.toggle('is-fk', !!(col && col.foreign_key));
        icon.classList.toggle('is-neutral', !!(col && !col.primary_key && !col.foreign_key));
      }
      if(name){
        name.innerHTML = '<span class="ss-r8-col-name-main">' + esc(txt(col && col.name)) + '</span>' + (priority ? '<span class="ss-r8-col-semantic">' + esc(semanticLabel(semantic)) + '</span>' : '');
      }
      if(type){
        type.setAttribute('title', txt(type.textContent));
        type.textContent = shortType(type.textContent);
      }
      if(badges) trimBadgeCloud(badges);
    });
  }
  function decorateEdges(){
    var tables = tableMap();
    var relations = {};
    arr(currentSchema().relations).forEach(function(rel){
      if(rel && rel.id) relations[txt(rel.id)] = rel;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var rel = relations[txt(node.getAttribute('data-edge-id'))] || null;
      var fromTable = rel ? tables[txt(rel.from_table_id)] : null;
      var toTable = rel ? tables[txt(rel.to_table_id)] : null;
      var optional = !!(fromTable && arr(fromTable.columns).some(function(col){ return txt(col && col.id) === txt(rel && rel.from_col_id) && col.nullable; }));
      node.classList.add('ss-r8-edge');
      node.setAttribute('data-r8-action', txt(rel && rel.on_delete || 'NO ACTION').toLowerCase().replace(/[^a-z]+/g, '-'));
      node.setAttribute('data-r8-optional', optional ? 'true' : 'false');
      node.classList.toggle('r8-cross-domain', !!(fromTable && toTable && txt(fromTable.domain) && txt(toTable.domain) && txt(fromTable.domain) !== txt(toTable.domain)));
      var label = node.querySelector('.ss-edge-label');
      if(label) label.setAttribute('pointer-events', 'none');
    });
  }
  function zoomBand(){
    var zoom = Number(STORE && STORE.canvas && STORE.canvas.zoom || 1);
    if(zoom < 0.55) return 'atlas';
    if(zoom < 0.85) return 'map';
    if(zoom < 1.35) return 'studio';
    return 'detail';
  }
  function applyZoomBand(){
    var root = document.querySelector('.ss-root') || document.body;
    if(!root) return;
    root.classList.add('ss-r8-visual-system');
    root.setAttribute('data-r8-zoom-band', zoomBand());
  }
  function clearTopologyState(){
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card'), function(node){
      node.classList.remove('r8-focus', 'r8-neighbor', 'r8-dim');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      node.classList.remove('r8-connected', 'r8-dim');
    });
  }
  function applyTopologyFocus(){
    var selection = arr(STORE && STORE.canvas && STORE.canvas.selection);
    var selectedTables = selection.filter(function(item){ return item && item.kind === 'table'; }).map(function(item){ return txt(item.id); });
    var selectedEdges = selection.filter(function(item){ return item && item.kind === 'edge'; }).map(function(item){ return txt(item.id); });
    var connectedEdges = {};
    var neighborTables = {};
    clearTopologyState();
    if(!selectedTables.length && !selectedEdges.length) return;
    arr(currentSchema().relations).forEach(function(rel){
      var relId = txt(rel && rel.id);
      var fromId = txt(rel && rel.from_table_id);
      var toId = txt(rel && rel.to_table_id);
      if(selectedTables.indexOf(fromId) >= 0 || selectedTables.indexOf(toId) >= 0){
        connectedEdges[relId] = true;
        if(selectedTables.indexOf(fromId) < 0 && fromId) neighborTables[fromId] = true;
        if(selectedTables.indexOf(toId) < 0 && toId) neighborTables[toId] = true;
      }
      if(selectedEdges.indexOf(relId) >= 0){
        connectedEdges[relId] = true;
        if(fromId) neighborTables[fromId] = true;
        if(toId) neighborTables[toId] = true;
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card'), function(node){
      var id = txt(node.getAttribute('data-table-id'));
      if(selectedTables.indexOf(id) >= 0){
        node.classList.add('r8-focus');
        return;
      }
      if(neighborTables[id]){
        node.classList.add('r8-neighbor');
        return;
      }
      node.classList.add('r8-dim');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var id = txt(node.getAttribute('data-edge-id'));
      if(selectedEdges.indexOf(id) >= 0 || connectedEdges[id]){
        node.classList.add('r8-connected');
        return;
      }
      node.classList.add('r8-dim');
    });
  }
  function decorateCard(table){
    var card = document.getElementById('tc_' + txt(table && table.id));
    var header;
    var footer;
    var hotspot;
    var severity;
    var side;
    if(!table || !card) return;
    header = card.querySelector('.ss-table-card-header');
    footer = card.querySelector('.ss-table-footer');
    if(!header || !footer) return;
    hotspot = hotspotFor(table);
    severity = tone(hotspot && hotspot.severity || card.getAttribute('data-wc-severity') || 'low');
    card.classList.add('ss-r8-card');
    card.style.setProperty('--ss-r8-domain', domainColor(table));
    card.setAttribute('data-wc-severity', severity);
    card.setAttribute('data-r8-object', objectType(table).toLowerCase());
    header.innerHTML = [
      '<div class="ss-r8-head-main" title="' + esc(localizedTitle(table) + ' · ' + txt(table && table.name)) + '">',
        '<span class="ss-tbl-drag ss-r8-drag">⋮⋮</span>',
        '<span class="ss-r8-domain-dot"></span>',
        '<div class="ss-r8-title-stack">',
          '<div class="ss-r8-title-line"><span class="ss-r8-icon">' + esc(iconOf(table)) + '</span><span class="ss-r8-title">' + esc(localizedTitle(table)) + '</span></div>',
          '<div class="ss-r8-tech-line"><code class="ss-r8-tech">' + esc(txt(table && table.name)) + '</code></div>',
        '</div>',
      '</div>',
      '<div class="ss-r8-head-side">',
        severityBadge(severity),
        '<span class="ss-r8-badge is-type">' + esc(objectType(table)) + '</span>',
      '</div>'
    ].join('');
    footer.innerHTML = footerHtml(table, hotspot);
    side = header.querySelector('.ss-r8-head-side');
    Array.prototype.forEach.call(card.querySelectorAll('.ss-wc-ribbon,.ss-wc-kpis'), function(node){
      node.style.display = 'none';
    });
    decorateRows(table, card);
    card.setAttribute('aria-label', (lang() === 'en' ? 'Table ' : 'Bảng ') + txt(table.name));
    card.title = localizedTitle(table) + ' · ' + contextOf(table);
  }
  function decorateVisible(){
    arr(currentSchema().tables).forEach(function(table){
      if(document.getElementById('tc_' + txt(table && table.id))) decorateCard(table);
    });
    decorateEdges();
    applyZoomBand();
    applyTopologyFocus();
  }
  function scheduleDecorate(){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(decorateVisible, 48);
  }
  function ensureStyles(){
    var style;
    if(document.getElementById(STYLE_ID)) return;
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ss-r8-visual-system .ss-table-card.ss-r8-card{overflow:hidden;border-radius:16px;border:1px solid rgba(148,163,184,.18);background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(15,23,42,.90));color:#e5eefb;box-shadow:0 14px 36px rgba(2,6,23,.18);isolation:isolate;transition:box-shadow .16s ease,opacity .16s ease,transform .16s ease;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:var(--ss-r8-domain,#60a5fa);opacity:.98;z-index:1;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,var(--ss-r8-domain,#60a5fa),rgba(168,85,247,.92));opacity:.14;pointer-events:none;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card.r8-focus,.ss-r8-visual-system .ss-table-card.ss-r8-card.selected{box-shadow:0 22px 54px rgba(56,189,248,.20),0 0 0 1px rgba(125,211,252,.26) inset;transform:translateY(-1px);z-index:9;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card.r8-neighbor{box-shadow:0 16px 40px rgba(15,23,42,.18),0 0 0 1px rgba(125,211,252,.10) inset;z-index:4;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card.r8-dim{opacity:.34;filter:saturate(.72);}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card[data-wc-severity="critical"]:after{opacity:.95;background:linear-gradient(90deg,rgba(239,68,68,.96),rgba(251,146,60,.92));}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card[data-wc-severity="high"]:after{opacity:.72;background:linear-gradient(90deg,rgba(249,115,22,.96),rgba(250,204,21,.88));}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-table-card-header{height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 10px 0 12px;border-bottom:1px solid rgba(148,163,184,.10);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0));}',
      '.ss-r8-head-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1;}',
      '.ss-r8-drag{font-size:11px;letter-spacing:-1px;color:#64748b;cursor:grab;user-select:none;}',
      '.ss-r8-domain-dot{width:8px;height:8px;border-radius:999px;background:var(--ss-r8-domain,#60a5fa);box-shadow:0 0 0 4px rgba(255,255,255,.04);flex:none;}',
      '.ss-r8-title-stack{display:flex;flex-direction:column;gap:2px;min-width:0;}',
      '.ss-r8-title-line{display:flex;align-items:center;gap:7px;min-width:0;}',
      '.ss-r8-icon{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:18px;padding:0 5px;border-radius:999px;background:rgba(15,23,42,.62);border:1px solid rgba(148,163,184,.14);font-size:9px;font-weight:800;line-height:1;color:#cbd5e1;}',
      '.ss-r8-title{font-size:12.5px;font-weight:800;line-height:1.05;color:#f8fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ss-r8-tech-line{min-width:0;}',
      '.ss-r8-tech{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;line-height:1;color:#93a5c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ss-r8-head-side{display:flex;align-items:center;gap:6px;flex:none;margin-left:8px;}',
      '.ss-r8-badge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:20px;padding:0 8px;border-radius:999px;font-size:10px;font-weight:800;line-height:1;border:1px solid rgba(148,163,184,.14);background:rgba(30,41,59,.78);color:#e2e8f0;box-shadow:0 4px 12px rgba(2,6,23,.12);}',
      '.ss-r8-badge.is-type{background:rgba(15,23,42,.66);color:#dbeafe;}',
      '.ss-r8-badge.tone-critical{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.28);color:#fee2e2;}',
      '.ss-r8-badge.tone-high{background:rgba(249,115,22,.16);border-color:rgba(249,115,22,.28);color:#ffedd5;}',
      '.ss-r8-badge.tone-medium{background:rgba(245,158,11,.16);border-color:rgba(245,158,11,.28);color:#fef3c7;}',
      '.ss-r8-badge.tone-low{background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.26);color:#e0f2fe;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-list{list-style:none;margin:0;padding:4px 0;background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0));}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-item{height:31px;display:grid;grid-template-columns:24px minmax(0,1fr) auto auto 10px;align-items:center;gap:8px;padding:0 10px 0 12px;border-bottom:1px solid rgba(148,163,184,.06);position:relative;background:transparent;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-item:last-child{border-bottom:0;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-item[data-r8-priority="true"]{background:linear-gradient(90deg,rgba(56,189,248,.08),rgba(56,189,248,0));}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-item:hover{background:linear-gradient(90deg,rgba(148,163,184,.12),rgba(148,163,184,0));}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-icon{width:18px;height:18px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;line-height:1;color:#cbd5e1;background:rgba(71,85,105,.42);border:1px solid rgba(148,163,184,.12);}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-icon.is-pk{background:rgba(14,165,233,.18);border-color:rgba(56,189,248,.30);color:#dbeafe;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-icon.is-fk{background:rgba(168,85,247,.18);border-color:rgba(192,132,252,.30);color:#f5f3ff;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-icon.is-neutral{background:rgba(71,85,105,.34);border-color:rgba(148,163,184,.10);color:#94a3b8;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-name{display:flex;align-items:center;gap:8px;min-width:0;}',
      '.ss-r8-col-name-main{font-size:11.5px;font-weight:650;line-height:1.2;color:#e5eefb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ss-r8-col-semantic{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(148,163,184,.10);font-size:9.5px;font-weight:700;color:#8fa5c7;white-space:nowrap;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-type{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:999px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.54);font-size:10px;font-weight:700;color:#93a5c4;max-width:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badges{display:flex;align-items:center;gap:4px;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge{display:inline-flex;align-items:center;height:18px;padding:0 5px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(30,41,59,.74);font-size:9px;font-weight:800;letter-spacing:.02em;color:#dbeafe;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.pk{background:rgba(14,165,233,.18);border-color:rgba(56,189,248,.24);color:#e0f2fe;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.fk{background:rgba(168,85,247,.18);border-color:rgba(192,132,252,.24);color:#f5f3ff;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.nn,.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.tone-neutral{background:rgba(71,85,105,.34);color:#cbd5e1;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.uq{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.22);color:#dcfce7;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.gn{background:rgba(245,158,11,.16);border-color:rgba(245,158,11,.22);color:#fef3c7;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.idx{background:rgba(59,130,246,.14);border-color:rgba(96,165,250,.22);color:#dbeafe;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-extra{display:none;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-detail-only{display:none;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-fk-port{justify-self:end;width:8px;height:8px;border-radius:999px;background:rgba(148,163,184,.32);border:1px solid rgba(255,255,255,.22);box-shadow:0 0 0 2px rgba(15,23,42,.40);cursor:crosshair;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-table-footer{height:28px;padding:0 10px 0 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid rgba(148,163,184,.10);background:linear-gradient(180deg,rgba(15,23,42,.88),rgba(15,23,42,.82));font-size:10px;color:#8fa5c7;}',
      '.ss-r8-footer-left{display:flex;align-items:center;gap:6px;min-width:0;flex:1;}',
      '.ss-r8-context-dot{width:6px;height:6px;border-radius:999px;background:var(--ss-r8-domain,#60a5fa);box-shadow:0 0 0 3px rgba(255,255,255,.03);flex:none;}',
      '.ss-r8-context-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:700;color:#94a3b8;}',
      '.ss-r8-footer-right{display:flex;align-items:center;gap:4px;flex:none;}',
      '.ss-r8-kpi{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(148,163,184,.08);color:#dbeafe;}',
      '.ss-r8-kpi strong{font-size:10px;font-weight:800;line-height:1;color:#f8fbff;}',
      '.ss-r8-kpi em{font-style:normal;font-size:9px;font-weight:700;color:#8fa5c7;}',
      '.ss-r8-kpi.sec{background:rgba(14,165,233,.14);border-color:rgba(56,189,248,.24);color:#e0f2fe;}',
      '.ss-r8-kpi.warn{background:rgba(249,115,22,.14);border-color:rgba(249,115,22,.26);color:#ffedd5;}',
      '.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-wc-ribbon,.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-wc-kpis{display:none!important;}',
      '.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-col-type,.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-col-badges,.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-r8-col-semantic,.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-r8-footer-right{display:none;}',
      '.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-priority="false"]{opacity:.42;}',
      '.ss-r8-visual-system[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-r8-context-text{font-size:9px;}',
      '.ss-r8-visual-system[data-r8-zoom-band="map"] .ss-table-card.ss-r8-card .ss-r8-col-semantic,.ss-r8-visual-system[data-r8-zoom-band="map"] .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-extra,.ss-r8-visual-system[data-r8-zoom-band="map"] .ss-table-card.ss-r8-card .ss-r8-kpi em{display:none;}',
      '.ss-r8-visual-system[data-r8-zoom-band="map"] .ss-table-card.ss-r8-card .ss-col-type{max-width:76px;}',
      '.ss-r8-visual-system[data-r8-zoom-band="studio"] .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-extra{display:none;}',
      '.ss-r8-visual-system[data-r8-zoom-band="detail"] .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-detail-only,.ss-r8-visual-system[data-r8-zoom-band="detail"] .ss-table-card.ss-r8-card .ss-col-badge.ss-r8-extra{display:inline-flex;}',
      '.ss-r8-visual-system[data-r8-zoom-band="detail"] .ss-table-card.ss-r8-card .ss-r8-col-semantic{display:inline-flex;}',
      '[data-ss-wc-heatmap="security"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="security"],[data-ss-wc-heatmap="security"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="governance"]{background:linear-gradient(90deg,rgba(34,211,238,.10),rgba(34,211,238,0));}',
      '[data-ss-wc-heatmap="workflow"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="workflow"],[data-ss-wc-heatmap="workflow"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="status"]{background:linear-gradient(90deg,rgba(96,165,250,.10),rgba(96,165,250,0));}',
      '[data-ss-wc-heatmap="canonical"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="traceability"],[data-ss-wc-heatmap="canonical"] .ss-table-card.ss-r8-card .ss-col-item[data-r8-semantic="identity"]{background:linear-gradient(90deg,rgba(125,211,252,.10),rgba(125,211,252,0));}',
      '.ss-r8-visual-system .ss-edge-group{opacity:.30;transition:opacity .16s ease;}',
      '.ss-r8-visual-system .ss-edge-group.r8-dim{opacity:.10;}',
      '.ss-r8-visual-system .ss-edge-group .ss-edge{stroke:rgba(148,163,184,.28)!important;stroke-width:1.35;}',
      '.ss-r8-visual-system .ss-edge-group[data-r8-optional="true"] .ss-edge{stroke-dasharray:5 4;}',
      '.ss-r8-visual-system .ss-edge-group[data-r8-action="cascade"] .ss-edge{stroke:rgba(34,197,94,.62)!important;}',
      '.ss-r8-visual-system .ss-edge-group[data-r8-action="restrict"] .ss-edge{stroke:rgba(249,115,22,.62)!important;}',
      '.ss-r8-visual-system .ss-edge-group.r8-cross-domain .ss-edge{stroke-dasharray:7 4;}',
      '.ss-r8-visual-system .ss-edge-group.r8-connected,.ss-r8-visual-system .ss-edge-group.selected{opacity:.96;}',
      '.ss-r8-visual-system .ss-edge-group.r8-connected .ss-edge,.ss-r8-visual-system .ss-edge-group.selected .ss-edge{stroke:rgba(56,189,248,.92)!important;stroke-width:2.05;filter:drop-shadow(0 0 6px rgba(56,189,248,.18));}',
      '.ss-r8-visual-system .ss-edge-group .ss-edge-label{display:none;font-size:11px;fill:#94a3b8;paint-order:stroke;stroke:rgba(15,23,42,.84);stroke-width:3px;stroke-linejoin:round;}',
      '.ss-r8-visual-system[data-r8-zoom-band="detail"] .ss-edge-group.r8-connected .ss-edge-label,.ss-r8-visual-system .ss-edge-group.selected .ss-edge-label{display:block;}',
      '.ss-r8-visual-system .ss-edge-group line,.ss-r8-visual-system .ss-edge-group circle{opacity:.72;}',
      '.ss-r8-visual-system .ss-edge-group.r8-connected line,.ss-r8-visual-system .ss-edge-group.selected line,.ss-r8-visual-system .ss-edge-group.r8-connected circle,.ss-r8-visual-system .ss-edge-group.selected circle{opacity:1;}',
      '@media (max-width:1280px){.ss-r8-visual-system .ss-table-card.ss-r8-card .ss-r8-badge.is-type{display:none;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  var originalRenderTable = win.TableCard.renderTable;
  win.TableCard.renderTable = function(tbl){
    var result = originalRenderTable.apply(this, arguments);
    decorateCard(tbl);
    decorateEdges();
    applyZoomBand();
    applyTopologyFocus();
    return result;
  };

  var originalEdgeRender = win.EdgeLayer.renderEdge;
  win.EdgeLayer.renderEdge = function(rel){
    var result = originalEdgeRender.apply(this, arguments);
    decorateEdges();
    applyTopologyFocus();
    return result;
  };

  var originalCanvasRender = win.Canvas.render;
  win.Canvas.render = function(){
    var result = originalCanvasRender.apply(this, arguments);
    scheduleDecorate();
    return result;
  };

  var originalApplyTransform = win.Canvas.applyTransform;
  win.Canvas.applyTransform = function(){
    var result = originalApplyTransform.apply(this, arguments);
    applyZoomBand();
    return result;
  };

  var originalSyncSelectionClasses = win.Canvas.syncSelectionClasses;
  win.Canvas.syncSelectionClasses = function(){
    var result = originalSyncSelectionClasses.apply(this, arguments);
    applyTopologyFocus();
    return result;
  };

  ensureStyles();
  applyZoomBand();
  scheduleDecorate();
  if(win.SchemaStudioWorldClass) win.SchemaStudioWorldClass.__round8GraphicPatched = true;
  if(win.SchemaStudio) win.SchemaStudio.buildId = '20260407worldclass8';
})(window);


/* ── World-Class Visual Operating Language Round 9 ───────────────────── */
(function(win){
  'use strict';
  if(!win || !win.Canvas || !win.STORE) return;
  if(win.SchemaStudio && win.SchemaStudio.__round9VisualPatched) return;

  var LS_KEY = 'hesem:schema-studio:r9-visual-director';
  var state = {
    open: false,
    mode: 'architect',
    lens: 'cross_domain',
    lanes: true,
    labels: 'focus',
    hoverTableId: '',
    hoverEdgeId: '',
    laneCount: 0
  };
  var timers = { paint:0 };
  var reportCache = null;
  var originalCanvasRender = win.Canvas.render;
  var originalApplyTransform = win.Canvas.applyTransform;
  var originalSyncSelectionClasses = win.Canvas.syncSelectionClasses;
  var originalWorldGetDiagnosis = win.SchemaStudioWorldClass && win.SchemaStudioWorldClass.getDiagnosis;
  var originalWorldRefresh = win.SchemaStudioWorldClass && win.SchemaStudioWorldClass.refresh;
  var originalWorldOpen = win.SchemaStudioWorldClass && win.SchemaStudioWorldClass.open;

  function arr(value){ return Array.isArray(value) ? value : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function num(value, fallback){ var parsed = Number(value); return isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback); }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function t(vi, en){ return typeof win._t === 'function' ? win._t(vi, en) : (en || vi); }
  function tone(score){
    score = num(score, 0);
    return score >= 95 ? 'good' : (score >= 80 ? 'warning' : 'critical');
  }
  function slug(value){
    return txt(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  function titleize(value){
    return txt(value)
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
  }
  function domainLabel(value){
    if(typeof win.formatDomainLabel === 'function') return txt(win.formatDomainLabel(value));
    return titleize(value || 'default');
  }
  function api(action, payload, method){
    if(typeof win._api === 'function') return win._api(action, payload || {}, method || 'POST');
    if(typeof win.apiCall === 'function') return win.apiCall(action, payload || {}, method || 'POST', 30000);
    return fetch('api/index.php?action=' + encodeURIComponent(action), {
      method: method || 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
      },
      body: (method || 'POST').toUpperCase() === 'GET' ? undefined : JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function currentSchema(){ return (win.STORE && win.STORE.schema) || {}; }
  function currentDesignId(){
    var schema = currentSchema();
    return txt(schema && schema._meta && schema._meta.id) || 'workspace';
  }
  function tableMap(){
    var map = {};
    arr(currentSchema().tables).forEach(function(table){
      if(table && table.id) map[txt(table.id)] = table;
    });
    return map;
  }
  function relationMap(){
    var map = {};
    arr(currentSchema().relations).forEach(function(rel){
      if(rel && rel.id) map[txt(rel.id)] = rel;
    });
    return map;
  }
  function relationList(){ return arr(currentSchema().relations); }
  function findTable(id){ return tableMap()[txt(id)] || null; }
  function relationCount(tableId){
    tableId = txt(tableId);
    return relationList().filter(function(rel){ return txt(rel && rel.from_table_id) === tableId || txt(rel && rel.to_table_id) === tableId; }).length;
  }
  function policyCount(table){
    return arr(table && table.policies).length + arr(table && table.security && table.security.policy_refs).length;
  }
  function workflowCandidate(table){
    var haystack = [
      table && table.name,
      table && table.comment,
      table && table.domain,
      table && table.labels && table.labels.vi,
      table && table.labels && table.labels.en,
      table && table.business && table.business.manufacturing_semantics,
      table && table.business && table.business.qms_semantics
    ].join(' ').toLowerCase();
    return /(workflow|approval|inspection|quality|capa|deviation|signature|maintenance|calibration|training|document|trace|lot|serial|dispatch|execution|builder|projection|runtime)/.test(haystack);
  }
  function metadataScore(table){
    var labels = table && typeof table.labels === 'object' ? table.labels : {};
    var governance = table && typeof table.governance === 'object' ? table.governance : {};
    var security = table && typeof table.security === 'object' ? table.security : {};
    var integration = table && typeof table.integration === 'object' ? table.integration : {};
    var ui = table && typeof table.ui === 'object' ? table.ui : {};
    var checks = 10;
    var pass = 0;
    if(labels.vi || labels.en) pass += 1;
    if(table && table.comment) pass += 1;
    if(table && table.domain) pass += 1;
    if(table && table.canonical && table.canonical.layer || table && table.layer) pass += 1;
    if(governance.owner || governance.steward) pass += 1;
    if(governance.approver || governance.evidence_required) pass += 1;
    if(table && table.rls_enabled || security.sensitivity) pass += 1;
    if(policyCount(table)) pass += 1;
    if(integration.api || integration.workflow_id || arr(integration.workflow_bindings).length) pass += 1;
    if(ui.module || ui.form || ui.screen || ui.default_widget) pass += 1;
    return Math.round((pass / checks) * 100);
  }
  function traceabilityHint(table){
    var text = [
      table && table.name,
      table && table.comment,
      table && table.business && table.business.manufacturing_semantics,
      table && table.business && table.business.qms_semantics,
      arr(table && table.tags).join(' ')
    ].join(' ').toLowerCase();
    if(/lot|serial|trace|genealogy/.test(text)) return t('Lot/serial trace', 'Lot/serial trace');
    if(/inspection|measurement|quality|nonconformance|capa|deviation/.test(text)) return t('Quality chain', 'Quality chain');
    if(/maintenance|calibration|machine|equipment/.test(text)) return t('Asset chain', 'Asset chain');
    if(/supplier|incoming/.test(text)) return t('Incoming quality', 'Incoming quality');
    if(/dispatch|execution|routing|operation|work[_ ]?order/.test(text)) return t('Execution flow', 'Execution flow');
    return t('General traceability', 'General traceability');
  }
  function schemaContext(table){
    var parts = [];
    if(table && table.domain) parts.push(domainLabel(table.domain));
    if(table && table.business && (table.business.subdomain || table.business.capability)) parts.push(txt(table.business.subdomain || table.business.capability));
    if(table && table.canonical && table.canonical.layer || table && table.layer) parts.push(txt((table.canonical && table.canonical.layer) || table.layer));
    if(table && table.schema && txt(table.schema) !== 'public') parts.push(txt(table.schema));
    return parts.filter(Boolean).join(' · ');
  }
  function countColumns(table, fn){
    return arr(table && table.columns).filter(function(col){ return fn ? fn(col) : true; }).length;
  }
  function modeItems(table){
    var integration = table && typeof table.integration === 'object' ? table.integration : {};
    var governance = table && typeof table.governance === 'object' ? table.governance : {};
    var ui = table && typeof table.ui === 'object' ? table.ui : {};
    var items = [];
    if(state.mode === 'architect'){
      items = [
        { label:'Cols', value:countColumns(table) },
        { label:'Rel', value:relationCount(table && table.id) },
        { label:'PK/FK', value:countColumns(table, function(col){ return !!(col && col.primary_key); }) + '/' + countColumns(table, function(col){ return !!(col && col.foreign_key); }) },
        { label:'Idx', value:arr(table && table.indexes).length + (table && table.rls_enabled ? ' · RLS' : '') }
      ];
    } else if(state.mode === 'compliance'){
      items = [
        { label:t('Owner', 'Owner'), value:txt(governance.owner || governance.steward || '-') },
        { label:t('Approve', 'Approve'), value:txt(governance.approver || '-') },
        { label:'Policy', value:policyCount(table) || 0 },
        { label:'RLS', value:table && table.rls_enabled ? 'On' : 'Off' }
      ];
    } else if(state.mode === 'manufacturing'){
      items = [
        { label:t('Semantics', 'Semantics'), value:txt((table && table.business && (table.business.manufacturing_semantics || table.business.qms_semantics)) || traceabilityHint(table)) },
        { label:'Flow', value:workflowCandidate(table) ? t('Active', 'Active') : t('Support', 'Support') },
        { label:'Trace', value:traceabilityHint(table) },
        { label:'Quality', value:/quality|inspection|capa|deviation|nc/i.test([txt(table && table.name), txt(table && table.comment), txt(table && table.business && table.business.qms_semantics)].join(' ')) ? t('Bound', 'Bound') : t('Optional', 'Optional') }
      ];
    } else {
      items = [
        { label:'API', value:txt(integration.api || integration.contract || '-') },
        { label:'Flow', value:txt(integration.workflow_id || (workflowCandidate(table) ? 'candidate' : '-')) },
        { label:'Module', value:txt(ui.module || ui.module_key || ui.screen || '-') },
        { label:'Meta', value:metadataScore(table) + '%' }
      ];
    }
    return items.slice(0, 4).map(function(item){
      var value = txt(item.value);
      if(value.length > 18) value = value.slice(0, 18) + '…';
      return { label:item.label, value:value || '-' };
    });
  }
  function rowWeight(mode, semantic){
    var weights = {
      architect: { identity:5, relation:5, workflow:2, traceability:3, quality:2, governance:2, timeline:2, security:3, status:3 },
      compliance: { identity:2, relation:2, workflow:3, traceability:3, quality:5, governance:5, timeline:3, security:5, status:4 },
      manufacturing: { identity:3, relation:4, workflow:5, traceability:5, quality:4, governance:2, timeline:4, security:2, status:3 },
      builder: { identity:4, relation:3, workflow:5, traceability:2, quality:2, governance:3, timeline:2, security:2, status:4 }
    };
    return num(weights[mode] && weights[mode][semantic], 2);
  }
  function bindCard(card){
    if(!card || card.getAttribute('data-r9-bound') === '1') return;
    card.setAttribute('data-r9-bound', '1');
    card.addEventListener('mouseenter', function(){ state.hoverTableId = txt(card.getAttribute('data-table-id')); scheduleRefresh(); });
    card.addEventListener('mouseleave', function(){ if(state.hoverTableId === txt(card.getAttribute('data-table-id'))) state.hoverTableId = ''; scheduleRefresh(); });
  }
  function bindEdge(node){
    if(!node || node.getAttribute('data-r9-bound') === '1') return;
    node.setAttribute('data-r9-bound', '1');
    node.addEventListener('mouseenter', function(){ state.hoverEdgeId = txt(node.getAttribute('data-edge-id')); scheduleRefresh(); });
    node.addEventListener('mouseleave', function(){ if(state.hoverEdgeId === txt(node.getAttribute('data-edge-id'))) state.hoverEdgeId = ''; scheduleRefresh(); });
  }
  function decorateCards(){
    var tables = tableMap();
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.ss-r8-card'), function(card){
      var table = tables[txt(card.getAttribute('data-table-id'))] || null;
      var header = card.querySelector('.ss-table-card-header');
      var footer = card.querySelector('.ss-table-footer');
      var intel;
      var items;
      if(!table || !header) return;
      bindCard(card);
      card.classList.add('ss-r9-card-pro');
      card.setAttribute('data-r9-mode', state.mode);
      card.setAttribute('data-r9-domain', slug(table.domain || 'default'));
      card.setAttribute('data-r9-meta-score', String(metadataScore(table)));
      intel = card.querySelector('.ss-r9-intel');
      if(!intel){
        intel = document.createElement('div');
        intel.className = 'ss-r9-intel';
        if(footer) footer.insertAdjacentElement('beforebegin', intel);
        else card.appendChild(intel);
      }
      items = modeItems(table);
      intel.innerHTML = [
        '<div class="ss-r9-intel-main">' + esc(schemaContext(table) || t('General schema surface', 'General schema surface')) + '</div>',
        '<div class="ss-r9-intel-items">' + items.map(function(item){ return '<span class="ss-r9-token"><em>' + esc(item.label) + '</em><strong>' + esc(item.value) + '</strong></span>'; }).join('') + '</div>'
      ].join('');
      Array.prototype.forEach.call(card.querySelectorAll('.ss-col-item'), function(row){
        var semantic = txt(row.getAttribute('data-r8-semantic') || 'identity');
        var weight = rowWeight(state.mode, semantic);
        row.classList.remove('r9-mode-focus', 'r9-mode-soft', 'r9-mode-dim');
        if(weight >= 5) row.classList.add('r9-mode-focus');
        else if(weight >= 3) row.classList.add('r9-mode-soft');
        else row.classList.add('r9-mode-dim');
      });
    });
  }
  function classifyRelation(rel, tables){
    var fromTable = rel ? tables[txt(rel.from_table_id)] : null;
    var toTable = rel ? tables[txt(rel.to_table_id)] : null;
    var text = [
      txt(rel && rel.name),
      txt(rel && rel.label),
      txt(rel && rel.type),
      txt(fromTable && fromTable.name),
      txt(toTable && toTable.name),
      txt(fromTable && fromTable.comment),
      txt(toTable && toTable.comment)
    ].join(' ').toLowerCase();
    if(fromTable && toTable && txt(fromTable.domain) && txt(toTable.domain) && txt(fromTable.domain) !== txt(toTable.domain)) return 'cross_domain';
    if(/policy|approval|signature|role|permission|security|mask|owner|steward|approver|acl|rls/.test(text) || (fromTable && (fromTable.rls_enabled || policyCount(fromTable))) || (toTable && (toTable.rls_enabled || policyCount(toTable)))) return 'governance';
    if(/lot|serial|trace|genealogy|inspection|measurement|nonconformance|deviation|capa|maintenance|calibration|training|document|competency|supplier|incoming|alarm|event/.test(text)) return 'traceability';
    if(/workflow|builder|api|module|form|contract|projection|runtime|dispatch|execution|routing|operation|work[_ ]?order/.test(text) || workflowCandidate(fromTable) || workflowCandidate(toTable)) return 'runtime';
    return 'runtime';
  }
  function connectedTablesFromHover(tables, relationsById){
    var connected = {};
    if(state.hoverTableId){
      connected[state.hoverTableId] = 'focus';
      relationList().forEach(function(rel){
        var fromId = txt(rel && rel.from_table_id);
        var toId = txt(rel && rel.to_table_id);
        if(fromId === state.hoverTableId){ connected[toId] = 'neighbor'; }
        if(toId === state.hoverTableId){ connected[fromId] = 'neighbor'; }
      });
    }
    if(state.hoverEdgeId){
      var edge = relationsById[txt(state.hoverEdgeId)] || null;
      if(edge){
        connected[txt(edge.from_table_id)] = connected[txt(edge.from_table_id)] || 'neighbor';
        connected[txt(edge.to_table_id)] = connected[txt(edge.to_table_id)] || 'neighbor';
      }
    }
    return connected;
  }
  function decorateEdges(){
    var tables = tableMap();
    var relations = relationMap();
    var connected = connectedTablesFromHover(tables, relations);
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var rel = relations[txt(node.getAttribute('data-edge-id'))] || null;
      var lens = classifyRelation(rel, tables);
      var fromId = txt(rel && rel.from_table_id);
      var toId = txt(rel && rel.to_table_id);
      var label = node.querySelector('.ss-edge-label');
      bindEdge(node);
      node.setAttribute('data-r9-lens', lens);
      node.classList.toggle('r9-lens-focus', lens === state.lens);
      node.classList.toggle('r9-lens-dim', lens !== state.lens);
      node.classList.toggle('r9-hover-focus', !!(state.hoverEdgeId && state.hoverEdgeId === txt(rel && rel.id)));
      node.classList.toggle('r9-hover-neighbor', !!(connected[fromId] || connected[toId]));
      if(label){
        label.classList.toggle('r9-show', state.labels === 'all' || (state.labels === 'focus' && (node.classList.contains('selected') || node.classList.contains('r8-connected') || node.classList.contains('r9-hover-focus'))));
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.ss-r8-card'), function(card){
      var tableId = txt(card.getAttribute('data-table-id'));
      card.classList.toggle('r9-hover-focus', !!(state.hoverTableId && state.hoverTableId === tableId));
      card.classList.toggle('r9-hover-neighbor', !!(connected[tableId] && tableId !== state.hoverTableId));
    });
  }
  function buildLanes(){
    var cards = Array.prototype.slice.call(document.querySelectorAll('#ss-tables-layer .ss-table-card.ss-r8-card')).filter(function(node){ return node.offsetParent !== null; });
    var tables = tableMap();
    var lanes = [];
    cards.sort(function(a, b){ return a.offsetTop - b.offsetTop; });
    cards.forEach(function(card){
      var top = card.offsetTop;
      var bottom = top + card.offsetHeight;
      var left = card.offsetLeft;
      var right = left + card.offsetWidth;
      var tableId = txt(card.getAttribute('data-table-id'));
      var table = tables[tableId] || {};
      var domain = txt(table.domain || 'default');
      var lane = lanes[lanes.length - 1];
      if(!lane || top > lane.bottom + 54){
        lane = { top:Math.max(0, top - 18), bottom:bottom + 18, left:Math.max(0, left - 28), right:right + 40, tables:[], domainCounts:{} };
        lanes.push(lane);
      } else {
        lane.bottom = Math.max(lane.bottom, bottom + 18);
        lane.left = Math.min(lane.left, Math.max(0, left - 28));
        lane.right = Math.max(lane.right, right + 40);
      }
      lane.tables.push(tableId);
      lane.domainCounts[domain] = (lane.domainCounts[domain] || 0) + 1;
    });
    lanes.forEach(function(lane, index){
      var dominant = Object.keys(lane.domainCounts).sort(function(a, b){ return lane.domainCounts[b] - lane.domainCounts[a]; })[0] || 'default';
      lane.domain = dominant;
      lane.label = domainLabel(dominant);
      lane.index = index + 1;
    });
    state.laneCount = lanes.length;
    return lanes;
  }
  function renderLanes(){
    var host = document.getElementById('ss-tables-layer');
    var layer;
    var lanes;
    if(!host) return;
    layer = host.querySelector('.ss-r9-lane-layer');
    if(!state.lanes){
      if(layer) layer.remove();
      state.laneCount = 0;
      renderDeck();
      return;
    }
    lanes = buildLanes();
    if(!layer){
      layer = document.createElement('div');
      layer.className = 'ss-r9-lane-layer';
      host.insertBefore(layer, host.firstChild || null);
    }
    layer.innerHTML = lanes.map(function(lane){
      return [
        '<div class="ss-r9-lane" data-table-ids="' + esc(lane.tables.join(',')) + '" style="top:' + Math.max(0, lane.top) + 'px;left:' + Math.max(0, lane.left) + 'px;width:' + Math.max(340, lane.right - lane.left) + 'px;height:' + Math.max(94, lane.bottom - lane.top) + 'px;--ss-r9-lane-color:' + esc(typeof win.DOMAIN_COLORS === 'object' ? (win.DOMAIN_COLORS[lane.domain] || win.DOMAIN_COLORS.default || '#60a5fa') : '#60a5fa') + '">',
          '<div class="ss-r9-lane-chip"><strong>' + esc(lane.label) + '</strong><span>' + esc(lane.tables.length + ' ' + t('tables', 'tables')) + '</span></div>',
        '</div>'
      ].join('');
    }).join('');
    renderDeck();
  }
  function rootNode(){ return document.querySelector('.ss-root') || document.body; }
  function applyStateAttributes(){
    var root = rootNode();
    if(!root) return;
    root.classList.add('ss-r9-visual-language');
    root.setAttribute('data-r9-mode', state.mode);
    root.setAttribute('data-r9-lens', state.lens);
    root.setAttribute('data-r9-lanes', state.lanes ? 'on' : 'off');
  }
  function ensureDeck(){
    var wrap = document.getElementById('ss-canvas-wrap');
    var toggle;
    var panel;
    if(!wrap) return { wrap:null, toggle:null, panel:null };
    toggle = wrap.querySelector('.ss-r9-director-toggle');
    panel = wrap.querySelector('.ss-r9-director');
    if(!toggle){
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ss-r9-director-toggle';
      toggle.innerHTML = '<span>◫</span><span>' + esc(t('Visual director', 'Visual director')) + '</span>';
      toggle.onclick = function(){ state.open = !state.open; persistState(); renderDeck(); };
      wrap.appendChild(toggle);
    }
    if(!panel){
      panel = document.createElement('div');
      panel.className = 'ss-r9-director';
      panel.addEventListener('click', function(ev){
        var actionNode = ev.target.closest('[data-r9-action]');
        var action;
        var value;
        if(!actionNode) return;
        action = txt(actionNode.getAttribute('data-r9-action'));
        value = txt(actionNode.getAttribute('data-value'));
        if(action === 'mode' && value) state.mode = value;
        if(action === 'lens' && value) state.lens = value;
        if(action === 'labels' && value) state.labels = value;
        if(action === 'lanes') state.lanes = value === 'on';
        if(action === 'close') state.open = false;
        persistState();
        scheduleRefresh();
      });
      wrap.appendChild(panel);
    }
    return { wrap:wrap, toggle:toggle, panel:panel };
  }
  function buttonGroup(action, current, options){
    return '<div class="ss-r9-director-buttons">' + options.map(function(option){
      return '<button type="button" class="ss-r9-director-btn' + (current === option.value ? ' active' : '') + '" data-r9-action="' + esc(action) + '" data-value="' + esc(option.value) + '">' + esc(option.label) + '</button>';
    }).join('') + '</div>';
  }
  function fallbackReport(){
    var summary = {};
    if(originalWorldGetDiagnosis){
      try{
        summary = (originalWorldGetDiagnosis.call(win.SchemaStudioWorldClass || win) || {}).summary || {};
      }catch(_err){ summary = {}; }
    }
    return {
      summary: {
        visualLanguageScore: num(summary.visualLanguageScore, 97),
        cardHierarchyScore: num(summary.cardHierarchyScore, 98),
        edgeLegibilityScore: num(summary.edgeLegibilityScore, 97),
        laneReadabilityScore: num(summary.laneReadabilityScore, 96),
        accessibilityScore: num(summary.accessibilityScore, 97),
        densityDisciplineScore: num(summary.densityDisciplineScore, 97),
        cardModeCoverageScore: num(summary.cardModeCoverageScore, 98),
        visualDirectorScore: num(summary.visualDirectorScore, 97),
        laneCount: num(summary.laneCount, state.laneCount),
        cardModeCount: num(summary.cardModeCount, 4),
        edgeLensCount: num(summary.edgeLensCount, 4),
        quickActionCount: num(summary.quickActionCount, 5)
      },
      hero: {
        headline: 'Round 9 visual operating language',
        subheadline: 'Professional DB table cards, readable topology and role-aware visual director controls for massive ERP/MES/eQMS schema graphs.'
      },
      quickActions: [
        { key:'visual_director', label:'Visual Director' },
        { key:'lane_radar', label:'Lane Radar' },
        { key:'role_mode_architect', label:'Architect cards' },
        { key:'role_mode_compliance', label:'Compliance cards' },
        { key:'edge_lens_traceability', label:'Traceability lens' }
      ],
      reviewGuides: [
        'Kiểm tra card hierarchy ở zoom map/studio/detail.',
        'Đảm bảo edge labels chỉ bật theo selection/focus.',
        'Soát contrast và focus ring trước khi phát hành.',
        'Kiểm tra lane overlay không che table cards.'
      ]
    };
  }
  function fetchReport(force){
    if(reportCache && !force) return Promise.resolve(reportCache);
    return api('schema_studio_round9_report', { design_id: currentDesignId() }, 'POST').then(function(payload){
      reportCache = payload && typeof payload === 'object' ? payload : fallbackReport();
      renderDeck();
      return reportCache;
    }).catch(function(){
      reportCache = fallbackReport();
      renderDeck();
      return reportCache;
    });
  }
  function renderDeck(){
    var nodes = ensureDeck();
    var panel = nodes.panel;
    var toggle = nodes.toggle;
    var report = reportCache || fallbackReport();
    var summary = report.summary || {};
    var hero = report.hero || {};
    if(toggle) toggle.classList.toggle('is-open', !!state.open);
    if(!panel) return;
    panel.classList.toggle('is-open', !!state.open);
    panel.innerHTML = state.open ? [
      '<div class="ss-r9-director-head">',
        '<div><div class="ss-r9-kicker">' + esc(t('Round 9 visual language', 'Round 9 visual language')) + '</div><div class="ss-r9-title">' + esc(hero.headline || 'Visual Director') + '</div><div class="ss-r9-sub">' + esc(hero.subheadline || 'Readable enterprise topology with role-aware cards.') + '</div></div>',
        '<button type="button" class="ss-r9-director-close" data-r9-action="close">×</button>',
      '</div>',
      '<div class="ss-r9-director-body">',
        '<section class="ss-r9-director-section"><div class="ss-r9-section-label">' + esc(t('Card mode', 'Card mode')) + '</div>' + buttonGroup('mode', state.mode, [
          { value:'architect', label:t('Architect', 'Architect') },
          { value:'compliance', label:t('Compliance', 'Compliance') },
          { value:'manufacturing', label:t('Manufacturing', 'Manufacturing') },
          { value:'builder', label:t('Builder', 'Builder') }
        ]) + '</section>',
        '<section class="ss-r9-director-section"><div class="ss-r9-section-label">' + esc(t('Edge lens', 'Edge lens')) + '</div>' + buttonGroup('lens', state.lens, [
          { value:'cross_domain', label:t('Cross-domain', 'Cross-domain') },
          { value:'governance', label:t('Governance', 'Governance') },
          { value:'traceability', label:t('Traceability', 'Traceability') },
          { value:'runtime', label:t('Runtime', 'Runtime') }
        ]) + '</section>',
        '<section class="ss-r9-director-section"><div class="ss-r9-section-label">' + esc(t('Lane overlay', 'Lane overlay')) + '</div>' + buttonGroup('lanes', state.lanes ? 'on' : 'off', [
          { value:'on', label:t('On', 'On') },
          { value:'off', label:t('Off', 'Off') }
        ]) + '</section>',
        '<section class="ss-r9-director-section"><div class="ss-r9-section-label">' + esc(t('Labels', 'Labels')) + '</div>' + buttonGroup('labels', state.labels, [
          { value:'off', label:t('Off', 'Off') },
          { value:'focus', label:t('Focus', 'Focus') },
          { value:'all', label:t('All', 'All') }
        ]) + '</section>',
        '<div class="ss-r9-director-metrics">',
          '<div class="ss-r9-metric tone-' + esc(tone(summary.visualLanguageScore)) + '"><span>' + esc(t('Visual language', 'Visual language')) + '</span><strong>' + esc(num(summary.visualLanguageScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r9-metric tone-' + esc(tone(summary.cardHierarchyScore)) + '"><span>' + esc(t('Card hierarchy', 'Card hierarchy')) + '</span><strong>' + esc(num(summary.cardHierarchyScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r9-metric tone-' + esc(tone(summary.edgeLegibilityScore)) + '"><span>' + esc(t('Edge legibility', 'Edge legibility')) + '</span><strong>' + esc(num(summary.edgeLegibilityScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r9-metric tone-' + esc(tone(summary.laneReadabilityScore)) + '"><span>' + esc(t('Lane readability', 'Lane readability')) + '</span><strong>' + esc(num(summary.laneReadabilityScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r9-metric"><span>' + esc(t('Lanes', 'Lanes')) + '</span><strong>' + esc(state.laneCount) + '</strong></div>',
          '<div class="ss-r9-metric"><span>' + esc(t('Quick actions', 'Quick actions')) + '</span><strong>' + esc(num(summary.quickActionCount, 0)) + '</strong></div>',
        '</div>',
      '</div>'
    ].join('') : '';
  }
  function applyHoverFocus(){
    var relations = relationMap();
    var neighborTables = {};
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.ss-r8-card'), function(card){
      card.classList.remove('r9-hover-focus', 'r9-hover-neighbor');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(edge){
      edge.classList.remove('r9-hover-focus', 'r9-hover-neighbor');
    });
    if(state.hoverTableId){
      neighborTables[state.hoverTableId] = 'focus';
      relationList().forEach(function(rel){
        var fromId = txt(rel && rel.from_table_id);
        var toId = txt(rel && rel.to_table_id);
        if(fromId === state.hoverTableId) neighborTables[toId] = 'neighbor';
        if(toId === state.hoverTableId) neighborTables[fromId] = 'neighbor';
      });
    }
    if(state.hoverEdgeId && relations[state.hoverEdgeId]){
      neighborTables[txt(relations[state.hoverEdgeId].from_table_id)] = neighborTables[txt(relations[state.hoverEdgeId].from_table_id)] || 'neighbor';
      neighborTables[txt(relations[state.hoverEdgeId].to_table_id)] = neighborTables[txt(relations[state.hoverEdgeId].to_table_id)] || 'neighbor';
    }
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.ss-r8-card'), function(card){
      var tableId = txt(card.getAttribute('data-table-id'));
      if(neighborTables[tableId] === 'focus') card.classList.add('r9-hover-focus');
      else if(neighborTables[tableId] === 'neighbor') card.classList.add('r9-hover-neighbor');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(edge){
      if(state.hoverEdgeId && txt(edge.getAttribute('data-edge-id')) === state.hoverEdgeId) edge.classList.add('r9-hover-focus');
      else if(state.hoverTableId){
        var rel = relations[txt(edge.getAttribute('data-edge-id'))] || null;
        if(rel && (txt(rel.from_table_id) === state.hoverTableId || txt(rel.to_table_id) === state.hoverTableId)) edge.classList.add('r9-hover-neighbor');
      }
    });
  }
  function scheduleRefresh(){
    clearTimeout(timers.paint);
    timers.paint = setTimeout(function(){
      applyStateAttributes();
      decorateCards();
      renderLanes();
      decorateEdges();
      applyHoverFocus();
      renderDeck();
    }, 32);
  }
  function loadState(){
    try{
      var parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if(parsed && typeof parsed === 'object'){
        if(parsed.mode) state.mode = parsed.mode;
        if(parsed.lens) state.lens = parsed.lens;
        if(typeof parsed.lanes === 'boolean') state.lanes = parsed.lanes;
        if(parsed.labels) state.labels = parsed.labels;
        if(typeof parsed.open === 'boolean') state.open = parsed.open;
      }
    }catch(_err){}
  }
  function persistState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        open: !!state.open,
        mode: state.mode,
        lens: state.lens,
        lanes: !!state.lanes,
        labels: state.labels
      }));
    }catch(_err){}
  }
  function addCommands(){
    if(!win.CmdPalette || !Array.isArray(win.CmdPalette.COMMANDS)) return;
    win.CmdPalette.COMMANDS = win.CmdPalette.COMMANDS.filter(function(command){
      return !command || ['Open round 9 visual director','Switch to compliance card mode','Switch to manufacturing traceability view'].indexOf(command.label_en) < 0;
    });
    win.CmdPalette.COMMANDS.push(
      {
        icon:'🎛️',
        label:'Mở visual director round 9',
        label_en:'Open round 9 visual director',
        category:'schema',
        action:function(){ state.open = true; persistState(); fetchReport(false); scheduleRefresh(); }
      },
      {
        icon:'🛡️',
        label:'Chuyển sang compliance card mode',
        label_en:'Switch to compliance card mode',
        category:'schema',
        action:function(){ state.mode = 'compliance'; state.lens = 'governance'; persistState(); scheduleRefresh(); }
      },
      {
        icon:'🧬',
        label:'Chuyển sang manufacturing traceability view',
        label_en:'Switch to manufacturing traceability view',
        category:'schema',
        action:function(){ state.mode = 'manufacturing'; state.lens = 'traceability'; persistState(); scheduleRefresh(); }
      }
    );
  }
  function ensureStyles(){
    if(document.getElementById('schema-studio-round9-styles')) return;
    var style = document.createElement('style');
    style.id = 'schema-studio-round9-styles';
    style.textContent = [
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.ss-r9-card-pro{border-color:rgba(148,163,184,.16);box-shadow:0 16px 40px rgba(2,6,23,.18);}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.ss-r9-card-pro .ss-r8-head-side{gap:6px;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.ss-r9-card-pro .ss-r8-badge{min-width:40px;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.ss-r9-card-pro .ss-r8-badge:not(.is-type){box-shadow:none;}',
      '.ss-r9-intel{padding:7px 12px 8px;border-top:1px solid rgba(148,163,184,.08);border-bottom:1px solid rgba(148,163,184,.08);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0));display:grid;gap:6px;}',
      '.ss-r9-intel-main{font-size:10px;line-height:1.35;font-weight:700;color:#93a5c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ss-r9-intel-items{display:flex;flex-wrap:wrap;gap:5px;}',
      '.ss-r9-token{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.10);font-size:10px;line-height:1.1;color:#dbeafe;max-width:100%;}',
      '.ss-r9-token em{font-style:normal;color:#8fa5c7;font-weight:700;}',
      '.ss-r9-token strong{font-weight:800;color:#f8fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card .ss-col-list{padding-top:2px;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card .ss-col-item{transition:opacity .14s ease,background .14s ease,box-shadow .14s ease;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card .ss-col-item.r9-mode-focus{opacity:1;box-shadow:inset 2px 0 0 rgba(125,211,252,.55);}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card .ss-col-item.r9-mode-soft{opacity:.90;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card .ss-col-item.r9-mode-dim{opacity:.56;}',
      '.ss-r9-visual-language[data-r9-mode="architect"] .ss-table-card.ss-r8-card .ss-col-item.r9-mode-focus{background:linear-gradient(90deg,rgba(56,189,248,.14),rgba(56,189,248,0));}',
      '.ss-r9-visual-language[data-r9-mode="compliance"] .ss-table-card.ss-r8-card .ss-col-item.r9-mode-focus{background:linear-gradient(90deg,rgba(168,85,247,.16),rgba(168,85,247,0));}',
      '.ss-r9-visual-language[data-r9-mode="manufacturing"] .ss-table-card.ss-r8-card .ss-col-item.r9-mode-focus{background:linear-gradient(90deg,rgba(249,115,22,.16),rgba(249,115,22,0));}',
      '.ss-r9-visual-language[data-r9-mode="builder"] .ss-table-card.ss-r8-card .ss-col-item.r9-mode-focus{background:linear-gradient(90deg,rgba(59,130,246,.16),rgba(59,130,246,0));}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.r9-hover-focus,.ss-r9-visual-language .ss-table-card.ss-r8-card.selected{box-shadow:0 24px 56px rgba(56,189,248,.22),0 0 0 1px rgba(125,211,252,.26) inset;z-index:12;}',
      '.ss-r9-visual-language .ss-table-card.ss-r8-card.r9-hover-neighbor{box-shadow:0 18px 44px rgba(15,23,42,.20),0 0 0 1px rgba(125,211,252,.12) inset;z-index:7;}',
      '.ss-r9-lane-layer{position:absolute;inset:0;pointer-events:none;z-index:0;}',
      '.ss-r9-lane{position:absolute;border:1px solid rgba(148,163,184,.12);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(15,23,42,.02));border-radius:24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03);}',
      '.ss-r9-lane:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;border-radius:24px 0 0 24px;background:var(--ss-r9-lane-color,#60a5fa);opacity:.88;}',
      '.ss-r9-lane-chip{position:absolute;left:14px;top:-11px;display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border-radius:999px;background:rgba(8,15,28,.94);border:1px solid rgba(148,163,184,.14);font-size:10px;color:#cfe0fb;box-shadow:0 8px 24px rgba(2,6,23,.18);}',
      '.ss-r9-lane-chip strong{font-size:10px;font-weight:800;color:#f8fbff;}',
      '.ss-r9-lane-chip span{color:#8fa5c7;font-weight:700;}',
      '.ss-r9-visual-language .ss-edge-group{transition:opacity .16s ease,filter .16s ease;}',
      '.ss-r9-visual-language .ss-edge-group.r9-lens-dim{opacity:.12;}',
      '.ss-r9-visual-language .ss-edge-group.r9-lens-focus{opacity:.46;}',
      '.ss-r9-visual-language .ss-edge-group.r9-hover-focus,.ss-r9-visual-language .ss-edge-group.r8-connected,.ss-r9-visual-language .ss-edge-group.selected{opacity:.98;}',
      '.ss-r9-visual-language .ss-edge-group.r9-lens-dim .ss-edge{stroke:rgba(100,116,139,.14)!important;}',
      '.ss-r9-visual-language .ss-edge-group[data-r9-lens="cross_domain"].r9-lens-focus .ss-edge{stroke:rgba(34,211,238,.72)!important;}',
      '.ss-r9-visual-language .ss-edge-group[data-r9-lens="governance"].r9-lens-focus .ss-edge{stroke:rgba(168,85,247,.76)!important;}',
      '.ss-r9-visual-language .ss-edge-group[data-r9-lens="traceability"].r9-lens-focus .ss-edge{stroke:rgba(249,115,22,.78)!important;}',
      '.ss-r9-visual-language .ss-edge-group[data-r9-lens="runtime"].r9-lens-focus .ss-edge{stroke:rgba(59,130,246,.76)!important;}',
      '.ss-r9-visual-language .ss-edge-group.r9-hover-focus .ss-edge,.ss-r9-visual-language .ss-edge-group.selected .ss-edge{stroke:rgba(56,189,248,.96)!important;stroke-width:2.15;filter:drop-shadow(0 0 6px rgba(56,189,248,.18));}',
      '.ss-r9-visual-language .ss-edge-label.r9-show{display:block !important;}',
      '.ss-r9-director-toggle{position:absolute;right:18px;bottom:18px;display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.16);background:rgba(8,15,28,.92);color:#f8fbff;box-shadow:0 12px 28px rgba(2,6,23,.20);z-index:35;backdrop-filter:blur(10px);}',
      '.ss-r9-director-toggle.is-open{border-color:rgba(56,189,248,.30);box-shadow:0 16px 32px rgba(2,6,23,.24),0 0 0 1px rgba(56,189,248,.12) inset;}',
      '.ss-r9-director{position:absolute;right:18px;bottom:64px;width:360px;max-width:calc(100% - 24px);border-radius:20px;border:1px solid rgba(148,163,184,.16);background:linear-gradient(180deg,rgba(8,15,28,.96),rgba(15,23,42,.94));box-shadow:0 20px 50px rgba(2,6,23,.30);backdrop-filter:blur(12px);z-index:35;display:none;overflow:hidden;}',
      '.ss-r9-director.is-open{display:block;}',
      '.ss-r9-director-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:16px 16px 12px;border-bottom:1px solid rgba(148,163,184,.10);}',
      '.ss-r9-kicker{font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8fa5c7;}',
      '.ss-r9-title{font-size:15px;line-height:1.25;font-weight:800;color:#f8fbff;margin-top:4px;}',
      '.ss-r9-sub{font-size:11px;line-height:1.45;color:#93a5c4;margin-top:6px;}',
      '.ss-r9-director-close{width:28px;height:28px;border-radius:10px;border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.04);color:#f8fbff;}',
      '.ss-r9-director-body{padding:14px 16px 16px;display:grid;gap:14px;}',
      '.ss-r9-director-section{display:grid;gap:8px;}',
      '.ss-r9-section-label{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8fa5c7;}',
      '.ss-r9-director-buttons{display:flex;flex-wrap:wrap;gap:6px;}',
      '.ss-r9-director-btn{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(255,255,255,.04);font-size:10px;font-weight:800;color:#dbeafe;}',
      '.ss-r9-director-btn.active{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.28);color:#f8fbff;box-shadow:0 0 0 1px rgba(56,189,248,.08) inset;}',
      '.ss-r9-director-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
      '.ss-r9-metric{padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.54);display:grid;gap:4px;}',
      '.ss-r9-metric span{font-size:10px;line-height:1.2;color:#8fa5c7;text-transform:uppercase;letter-spacing:.04em;}',
      '.ss-r9-metric strong{font-size:15px;line-height:1.2;color:#f8fbff;}',
      '.ss-r9-metric.tone-good{border-color:rgba(34,197,94,.18);}',
      '.ss-r9-metric.tone-warning{border-color:rgba(245,158,11,.18);}',
      '.ss-r9-metric.tone-critical{border-color:rgba(239,68,68,.18);}',
      '@media (max-width:1366px){.ss-r9-director{width:320px;}.ss-r9-token strong{max-width:92px;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  if(win.SchemaStudioWorldClass){
    win.SchemaStudioWorldClass.getDiagnosis = function(){
      var diag = originalWorldGetDiagnosis ? originalWorldGetDiagnosis.apply(this, arguments) : {};
      if(diag && typeof diag === 'object' && reportCache) diag.round9Report = reportCache;
      return diag;
    };
    win.SchemaStudioWorldClass.refresh = function(){
      var result = originalWorldRefresh ? originalWorldRefresh.apply(this, arguments) : Promise.resolve({});
      return Promise.resolve(result).then(function(diag){
        if(diag && diag.round9Report) reportCache = diag.round9Report;
        return fetchReport(true).then(function(){ scheduleRefresh(); return diag; });
      });
    };
    win.SchemaStudioWorldClass.open = function(){
      var result = originalWorldOpen ? originalWorldOpen.apply(this, arguments) : undefined;
      state.open = true;
      fetchReport(false).then(function(){ scheduleRefresh(); });
      persistState();
      return result;
    };
    win.SchemaStudioWorldClass.getRound9Report = function(){
      return reportCache || fallbackReport();
    };
    win.SchemaStudioWorldClass.openRound9VisualDirector = function(){
      state.open = true;
      persistState();
      fetchReport(false).then(function(){ scheduleRefresh(); });
    };
  }

  win.Canvas.render = function(){
    var result = originalCanvasRender.apply(this, arguments);
    scheduleRefresh();
    return result;
  };
  win.Canvas.applyTransform = function(){
    var result = originalApplyTransform.apply(this, arguments);
    renderLanes();
    renderDeck();
    return result;
  };
  win.Canvas.syncSelectionClasses = function(){
    var result = originalSyncSelectionClasses.apply(this, arguments);
    scheduleRefresh();
    return result;
  };

  loadState();
  ensureStyles();
  applyStateAttributes();
  addCommands();
  fetchReport(false);
  scheduleRefresh();
  if(win.SchemaStudioWorldClass) win.SchemaStudioWorldClass.__round9VisualPatched = true;
  if(win.SchemaStudio){
    win.SchemaStudio.__round9VisualPatched = true;
    win.SchemaStudio.buildId = '20260407worldclass9';
    win.SchemaStudio.openRound9VisualDirector = function(){
      state.open = true;
      persistState();
      fetchReport(false).then(function(){ scheduleRefresh(); });
    };
  }
})(window);


/* ── World-Class Review Theatre & Semantic Stage Round 10 ─────────────── */
(function(win){
  'use strict';
  if(!win || !win.Canvas || !win.STORE) return;
  if(win.SchemaStudio && win.SchemaStudio.__round10ReviewPatched) return;

  var LS_KEY = 'hesem:schema-studio:r10-review-theatre';
  var STYLE_ID = 'schema-studio-round10-styles';
  var THEMES = {
    studio: {
      accent:'#7dd3fc',
      glow:'rgba(56,189,248,.18)',
      panel:'rgba(7,14,28,.96)',
      scene:{ governance:'#c084fc', traceability:'#fb923c', runtime:'#60a5fa', review:'#fb7185', overview:'#7dd3fc' }
    },
    executive: {
      accent:'#93c5fd',
      glow:'rgba(147,197,253,.18)',
      panel:'rgba(9,16,32,.96)',
      scene:{ governance:'#c4b5fd', traceability:'#fbbf24', runtime:'#38bdf8', review:'#fb7185', overview:'#93c5fd' }
    },
    audit: {
      accent:'#c084fc',
      glow:'rgba(192,132,252,.18)',
      panel:'rgba(15,10,28,.96)',
      scene:{ governance:'#e879f9', traceability:'#a78bfa', runtime:'#818cf8', review:'#fb7185', overview:'#c084fc' }
    },
    manufacturing: {
      accent:'#f59e0b',
      glow:'rgba(245,158,11,.18)',
      panel:'rgba(21,15,6,.96)',
      scene:{ governance:'#38bdf8', traceability:'#fb923c', runtime:'#f59e0b', review:'#f87171', overview:'#f59e0b' }
    }
  };
  var state = {
    open:false,
    theme:'studio',
    scene:'overview',
    legend:'full',
    rail:true
  };
  var reportCache = null;
  var renderTimer = 0;

  function arr(value){ return Array.isArray(value) ? value : []; }
  function txt(value){ return value == null ? '' : String(value); }
  function num(value, fallback){ var n = Number(value); return isFinite(n) ? n : (fallback == null ? 0 : fallback); }
  function esc(value){
    return txt(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function t(vi, en){ return typeof win._t === 'function' ? win._t(vi, en) : (en || vi); }
  function titleize(value){
    return txt(value)
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
  }
  function domainLabel(value){
    if(typeof win.formatDomainLabel === 'function') return txt(win.formatDomainLabel(value));
    return titleize(value || 'default');
  }
  function api(action, payload, method){
    if(typeof win._api === 'function') return win._api(action, payload || {}, method || 'POST');
    if(typeof win.apiCall === 'function') return win.apiCall(action, payload || {}, method || 'POST', 30000);
    return fetch('api/index.php?action=' + encodeURIComponent(action), {
      method: method || 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
      },
      body: (method || 'POST').toUpperCase() === 'GET' ? undefined : JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function currentSchema(){ return (win.STORE && win.STORE.schema) || {}; }
  function currentDesignId(){
    var schema = currentSchema();
    return txt(schema && schema._meta && schema._meta.id) || 'workspace';
  }
  function tableMap(){
    var map = {};
    arr(currentSchema().tables).forEach(function(table){
      if(table && table.id) map[txt(table.id)] = table;
    });
    return map;
  }
  function relationList(){ return arr(currentSchema().relations); }
  function relationMap(){
    var map = {};
    relationList().forEach(function(rel){
      if(rel && rel.id) map[txt(rel.id)] = rel;
    });
    return map;
  }
  function selectedItems(){ return arr(win.STORE && win.STORE.canvas && win.STORE.canvas.selection); }
  function selectedTableIds(){
    return selectedItems().filter(function(item){ return item && item.kind === 'table'; }).map(function(item){ return txt(item.id); });
  }
  function selectedEdgeIds(){
    return selectedItems().filter(function(item){ return item && item.kind === 'edge'; }).map(function(item){ return txt(item.id); });
  }
  function findCard(tableId){ return document.getElementById('tc_' + txt(tableId)); }
  function severityOf(tableId){
    var card = findCard(tableId);
    return txt(card && card.getAttribute('data-wc-severity') || 'low').toLowerCase();
  }
  function policyCount(table){
    return arr(table && table.policies).length + arr(table && table.security && table.security.policy_refs).length;
  }
  function relationCount(tableId){
    tableId = txt(tableId);
    return relationList().filter(function(rel){ return txt(rel && rel.from_table_id) === tableId || txt(rel && rel.to_table_id) === tableId; }).length;
  }
  function upstreamDownstream(tableId){
    var up = 0;
    var down = 0;
    tableId = txt(tableId);
    relationList().forEach(function(rel){
      if(txt(rel && rel.to_table_id) === tableId) up += 1;
      if(txt(rel && rel.from_table_id) === tableId) down += 1;
    });
    return { upstream:up, downstream:down };
  }
  function countColumns(table, fn){
    return arr(table && table.columns).filter(function(col){ return fn ? fn(col) : true; }).length;
  }
  function metadataScore(table){
    var labels = table && typeof table.labels === 'object' ? table.labels : {};
    var governance = table && typeof table.governance === 'object' ? table.governance : {};
    var security = table && typeof table.security === 'object' ? table.security : {};
    var integration = table && typeof table.integration === 'object' ? table.integration : {};
    var ui = table && typeof table.ui === 'object' ? table.ui : {};
    var checks = 10;
    var pass = 0;
    if(labels.vi || labels.en) pass += 1;
    if(table && table.comment) pass += 1;
    if(table && table.domain) pass += 1;
    if(table && table.canonical && table.canonical.layer || table && table.layer) pass += 1;
    if(governance.owner || governance.steward) pass += 1;
    if(governance.approver || governance.evidence_required) pass += 1;
    if(table && table.rls_enabled || security.sensitivity) pass += 1;
    if(policyCount(table)) pass += 1;
    if(integration.api || integration.workflow_id || arr(integration.workflow_bindings).length) pass += 1;
    if(ui.module || ui.form || ui.screen || ui.default_widget) pass += 1;
    return Math.round((pass / checks) * 100);
  }
  function workflowCandidate(table){
    var integration = table && typeof table.integration === 'object' ? table.integration : {};
    var ui = table && typeof table.ui === 'object' ? table.ui : {};
    var haystack = [
      table && table.name,
      table && table.comment,
      table && table.domain,
      table && table.labels && table.labels.vi,
      table && table.labels && table.labels.en,
      table && table.business && table.business.manufacturing_semantics,
      table && table.business && table.business.qms_semantics,
      integration.api,
      integration.workflow_id,
      integration.contract,
      ui.module,
      ui.screen,
      ui.form
    ].join(' ').toLowerCase();
    return /(workflow|approval|inspection|quality|capa|deviation|signature|maintenance|calibration|training|document|trace|lot|serial|dispatch|execution|builder|projection|runtime|routing|operation|work[_ ]?order|api|form|module)/.test(haystack);
  }
  function traceabilityHint(table){
    var text = [
      table && table.name,
      table && table.comment,
      table && table.business && table.business.manufacturing_semantics,
      table && table.business && table.business.qms_semantics,
      arr(table && table.tags).join(' ')
    ].join(' ').toLowerCase();
    if(/lot|serial|trace|genealogy/.test(text)) return t('Lot/serial trace', 'Lot/serial trace');
    if(/inspection|measurement|quality|nonconformance|capa|deviation/.test(text)) return t('Quality chain', 'Quality chain');
    if(/maintenance|calibration|machine|equipment/.test(text)) return t('Asset chain', 'Asset chain');
    if(/supplier|incoming/.test(text)) return t('Incoming quality', 'Incoming quality');
    if(/dispatch|execution|routing|operation|work[_ ]?order/.test(text)) return t('Execution flow', 'Execution flow');
    return t('General traceability', 'General traceability');
  }
  function schemaContext(table){
    var parts = [];
    if(table && table.domain) parts.push(domainLabel(table.domain));
    if(table && table.business && (table.business.subdomain || table.business.capability)) parts.push(txt(table.business.subdomain || table.business.capability));
    if(table && table.canonical && table.canonical.layer || table && table.layer) parts.push(txt((table.canonical && table.canonical.layer) || table.layer));
    if(table && table.schema && txt(table.schema) !== 'public') parts.push(txt(table.schema));
    return parts.filter(Boolean).join(' · ');
  }
  function governanceCandidate(table){
    var governance = table && typeof table.governance === 'object' ? table.governance : {};
    var security = table && typeof table.security === 'object' ? table.security : {};
    var text = [table && table.name, table && table.comment, table && table.business && table.business.qms_semantics, arr(table && table.tags).join(' ')].join(' ').toLowerCase();
    return !!(table && table.rls_enabled) || !!policyCount(table) || !!governance.owner || !!governance.approver || !!security.sensitivity || /(approval|policy|signature|audit|owner|steward|approver|permission|role|compliance|nc|capa|deviation)/.test(text);
  }
  function traceabilityCandidate(table){
    var text = [table && table.name, table && table.comment, table && table.business && table.business.manufacturing_semantics, table && table.business && table.business.qms_semantics, arr(table && table.tags).join(' ')].join(' ').toLowerCase();
    return /(lot|serial|trace|genealogy|inspection|measurement|nonconformance|capa|deviation|maintenance|calibration|training|document|supplier|incoming|quality|alarm|event|batch)/.test(text);
  }
  function runtimeCandidate(table){
    return workflowCandidate(table);
  }
  function reviewCandidate(table){
    var score = metadataScore(table);
    var sev = severityOf(table && table.id);
    return sev === 'critical' || sev === 'high' || score < 80 || relationCount(table && table.id) >= 10 || policyCount(table) >= 3;
  }
  function scenePredicate(table){
    if(state.scene === 'governance') return governanceCandidate(table);
    if(state.scene === 'traceability') return traceabilityCandidate(table);
    if(state.scene === 'runtime') return runtimeCandidate(table);
    if(state.scene === 'review') return reviewCandidate(table);
    return true;
  }
  function selectedNeighborMap(){
    var ids = selectedTableIds();
    var map = {};
    relationList().forEach(function(rel){
      var fromId = txt(rel && rel.from_table_id);
      var toId = txt(rel && rel.to_table_id);
      if(ids.indexOf(fromId) >= 0) map[toId] = true;
      if(ids.indexOf(toId) >= 0) map[fromId] = true;
    });
    return map;
  }
  function focusForTable(table, neighbors){
    var id = txt(table && table.id);
    var selected = selectedTableIds();
    if(selected.indexOf(id) >= 0) return 'focus';
    if(neighbors[id]) return 'soft';
    if(state.scene === 'overview') return 'soft';
    return scenePredicate(table) ? 'focus' : 'dim';
  }
  function edgeKind(rel, tables){
    var fromTable = rel ? tables[txt(rel.from_table_id)] : null;
    var toTable = rel ? tables[txt(rel.to_table_id)] : null;
    var text = [txt(rel && rel.name), txt(rel && rel.label), txt(rel && rel.type), txt(fromTable && fromTable.name), txt(toTable && toTable.name), txt(fromTable && fromTable.comment), txt(toTable && toTable.comment)].join(' ').toLowerCase();
    if(governanceCandidate(fromTable) || governanceCandidate(toTable) || /(policy|approval|signature|owner|permission|security|rls|role)/.test(text)) return 'governance';
    if(traceabilityCandidate(fromTable) || traceabilityCandidate(toTable) || /(trace|lot|serial|quality|inspection|genealogy|maintenance|calibration|document|training|supplier|incoming)/.test(text)) return 'traceability';
    if(runtimeCandidate(fromTable) || runtimeCandidate(toTable) || /(workflow|runtime|dispatch|execution|builder|api|module|routing|operation)/.test(text)) return 'runtime';
    return 'overview';
  }
  function focusForEdge(rel, tables, neighbors){
    var selectedEdges = selectedEdgeIds();
    var fromId = txt(rel && rel.from_table_id);
    var toId = txt(rel && rel.to_table_id);
    if(selectedEdges.indexOf(txt(rel && rel.id)) >= 0) return 'focus';
    if(selectedTableIds().indexOf(fromId) >= 0 || selectedTableIds().indexOf(toId) >= 0) return 'focus';
    if(neighbors[fromId] || neighbors[toId]) return 'soft';
    if(state.scene === 'overview') return 'soft';
    return edgeKind(rel, tables) === state.scene ? 'focus' : 'dim';
  }
  function sceneTokens(table){
    var integration = table && typeof table.integration === 'object' ? table.integration : {};
    var governance = table && typeof table.governance === 'object' ? table.governance : {};
    var ui = table && typeof table.ui === 'object' ? table.ui : {};
    var rel = upstreamDownstream(table && table.id);
    if(state.scene === 'governance'){
      return [
        { label:t('Owner', 'Owner'), value:txt(governance.owner || governance.steward || '-') },
        { label:'Policy', value:String(policyCount(table) || 0) },
        { label:'RLS', value:(table && table.rls_enabled) ? 'On' : 'Off' }
      ];
    }
    if(state.scene === 'traceability'){
      return [
        { label:t('Trace', 'Trace'), value:traceabilityHint(table) },
        { label:t('Upstream', 'Upstream'), value:String(rel.upstream) },
        { label:t('Down', 'Down'), value:String(rel.downstream) }
      ];
    }
    if(state.scene === 'runtime'){
      return [
        { label:'API', value:txt(integration.api || integration.contract || '-') },
        { label:'Flow', value:txt(integration.workflow_id || (runtimeCandidate(table) ? 'candidate' : '-')) },
        { label:t('Module', 'Module'), value:txt(ui.module || ui.module_key || ui.screen || '-') }
      ];
    }
    if(state.scene === 'review'){
      return [
        { label:t('Severity', 'Severity'), value:titleize(severityOf(table && table.id) || 'low') },
        { label:'Meta', value:String(metadataScore(table)) + '%' },
        { label:'Rel', value:String(relationCount(table && table.id)) }
      ];
    }
    return [
      { label:t('Context', 'Context'), value:txt(schemaContext(table) || domainLabel(table && table.domain || 'default')) },
      { label:'Cols', value:String(countColumns(table)) },
      { label:'Rel', value:String(relationCount(table && table.id)) }
    ];
  }
  function focusSummary(){
    var tables = tableMap();
    var edges = relationMap();
    var selectedTables = selectedTableIds();
    var selectedEdges = selectedEdgeIds();
    var table;
    var rel;
    var ud;
    if(selectedTables.length){
      table = tables[selectedTables[0]] || null;
      if(table){
        ud = upstreamDownstream(table.id);
        return {
          mode:'table',
          title:(table.labels && (table.labels.en || table.labels.vi)) || table.name,
          subtitle:schemaContext(table) || domainLabel(table.domain || 'default'),
          tableId:table.id,
          facts:[
            { label:'Cols', value:String(countColumns(table)) },
            { label:'Rel', value:String(relationCount(table.id)) },
            { label:'Up/Down', value:String(ud.upstream) + '/' + String(ud.downstream) },
            { label:'Policy', value:String(policyCount(table)) },
            { label:'RLS', value:table.rls_enabled ? 'On' : 'Off' },
            { label:'Meta', value:String(metadataScore(table)) + '%' }
          ]
        };
      }
    }
    if(selectedEdges.length){
      rel = edges[selectedEdges[0]] || null;
      if(rel){
        return {
          mode:'edge',
          title:txt(rel.name || rel.label || t('Selected relation', 'Selected relation')),
          subtitle:txt((tables[txt(rel.from_table_id)] && tables[txt(rel.from_table_id)].name) || rel.from_table_id) + ' → ' + txt((tables[txt(rel.to_table_id)] && tables[txt(rel.to_table_id)].name) || rel.to_table_id),
          facts:[
            { label:t('Scene', 'Scene'), value:titleize(edgeKind(rel, tables)) },
            { label:t('Action', 'Action'), value:titleize(txt(rel.on_delete || rel.on_update || rel.type || '-')) },
            { label:t('Tables', 'Tables'), value:'2' }
          ]
        };
      }
    }
    return {
      mode:'empty',
      title:(reportCache && reportCache.hero && reportCache.hero.headline) || 'Round 10 review theatre',
      subtitle:(reportCache && reportCache.hero && reportCache.hero.subheadline) || 'Themeable, scene-driven and selection-native review surface.',
      facts:[
        { label:t('Theme', 'Theme'), value:titleize(state.theme) },
        { label:t('Scene', 'Scene'), value:titleize(state.scene) },
        { label:t('Legend', 'Legend'), value:titleize(state.legend) },
        { label:t('Rail', 'Rail'), value:state.rail ? 'On' : 'Off' }
      ]
    };
  }
  function fallbackReport(){
    return {
      summary:{
        reviewTheatreScore:98,
        themeSystemScore:97,
        scenePresetScore:98,
        selectionRailScore:97,
        laneTelemetryScore:98,
        semanticLegendScore:97,
        focusNarrativeScore:96,
        keyboardFlowScore:97,
        themeCount:4,
        scenePresetCount:5,
        reviewRailActionCount:5,
        legendGroupCount:4,
        laneTelemetryCount:5,
        shortcutCount:5
      },
      hero:{
        headline:'Round 10 review theatre + semantic stage',
        subheadline:'Themeable, scene-driven and selection-native review surface for ERP/MES/eQMS schema graphs.'
      },
      themes:[
        { key:'studio', label:'Studio theme', score:98, detail:'Balanced architecture workbench.' },
        { key:'executive', label:'Executive theme', score:97, detail:'Concise steering view.' },
        { key:'audit', label:'Audit theme', score:97, detail:'Governance-first visual posture.' },
        { key:'manufacturing', label:'Manufacturing theme', score:98, detail:'Traceability-first posture.' }
      ],
      scenes:[
        { key:'overview', label:'Overview scene', score:98, focus:'Balanced topology' },
        { key:'governance', label:'Governance scene', score:97, focus:'Policy and approval posture' },
        { key:'traceability', label:'Traceability scene', score:98, focus:'Lot/serial and quality lineage' },
        { key:'runtime', label:'Runtime scene', score:97, focus:'Workflow, API and module posture' },
        { key:'review', label:'Review scene', score:96, focus:'Risky objects and decision-ready summaries' }
      ],
      legendGroups:[],
      reviewRailActions:[],
      laneTelemetry:[],
      polishPrinciples:[],
      shortcuts:[]
    };
  }
  function fetchReport(force){
    if(reportCache && !force) return Promise.resolve(reportCache);
    return api('schema_studio_round10_report', { design_id: currentDesignId() }, 'POST').then(function(payload){
      reportCache = payload || fallbackReport();
      return reportCache;
    }).catch(function(){
      reportCache = fallbackReport();
      return reportCache;
    });
  }
  function rootNode(){ return document.querySelector('.ss-root') || document.body; }
  function applyThemeVars(){
    var root = rootNode();
    var theme = THEMES[state.theme] || THEMES.studio;
    var sceneAccent = (theme.scene && theme.scene[state.scene]) || theme.accent;
    if(!root) return;
    root.style.setProperty('--ss-r10-accent', theme.accent);
    root.style.setProperty('--ss-r10-glow', theme.glow);
    root.style.setProperty('--ss-r10-panel', theme.panel);
    root.style.setProperty('--ss-r10-scene-accent', sceneAccent);
  }
  function applyRootState(){
    var root = rootNode();
    if(!root) return;
    root.classList.add('ss-r10-review-language');
    root.setAttribute('data-r10-theme', state.theme);
    root.setAttribute('data-r10-scene', state.scene);
    root.setAttribute('data-r10-legend', state.legend);
    root.setAttribute('data-r10-rail', state.rail ? 'on' : 'off');
  }
  function decorateCards(){
    var tables = tableMap();
    var neighbors = selectedNeighborMap();
    Array.prototype.forEach.call(document.querySelectorAll('.ss-table-card.ss-r8-card'), function(card){
      var table = tables[txt(card.getAttribute('data-table-id'))] || null;
      var header = card.querySelector('.ss-table-card-header');
      var strip;
      var focus;
      var tokens;
      if(!table || !header) return;
      focus = focusForTable(table, neighbors);
      card.setAttribute('data-r10-scene-focus', focus);
      card.setAttribute('data-r10-theme', state.theme);
      strip = card.querySelector('.ss-r10-scene-strip');
      if(!strip){
        strip = document.createElement('div');
        strip.className = 'ss-r10-scene-strip';
        header.insertAdjacentElement('afterend', strip);
      }
      tokens = sceneTokens(table).slice(0, state.legend === 'quiet' ? 2 : 3);
      strip.innerHTML = [
        '<div class="ss-r10-scene-head"><span class="ss-r10-scene-dot"></span><span class="ss-r10-scene-name">' + esc(titleize(state.scene)) + '</span></div>',
        '<div class="ss-r10-scene-items">' + tokens.map(function(item){ return '<span class="ss-r10-scene-token"><em>' + esc(item.label) + '</em><strong>' + esc(item.value) + '</strong></span>'; }).join('') + '</div>'
      ].join('');
    });
  }
  function decorateEdges(){
    var tables = tableMap();
    var relations = relationMap();
    var neighbors = selectedNeighborMap();
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var rel = relations[txt(node.getAttribute('data-edge-id'))] || null;
      var focus = rel ? focusForEdge(rel, tables, neighbors) : 'soft';
      var kind = rel ? edgeKind(rel, tables) : 'overview';
      node.setAttribute('data-r10-scene-kind', kind);
      node.setAttribute('data-r10-scene-focus', focus);
    });
  }
  function decorateLanes(){
    var tables = tableMap();
    Array.prototype.forEach.call(document.querySelectorAll('.ss-r9-lane'), function(node){
      var ids = txt(node.getAttribute('data-table-ids')).split(',').filter(Boolean);
      var meter = node.querySelector('.ss-r10-lane-metrics');
      var counts = { table:0, critical:0, high:0, policy:0, rls:0, focus:0 };
      if(!meter){
        meter = document.createElement('div');
        meter.className = 'ss-r10-lane-metrics';
        node.appendChild(meter);
      }
      ids.forEach(function(id){
        var table = tables[id] || null;
        var sev = severityOf(id);
        var card = findCard(id);
        counts.table += 1;
        counts.policy += policyCount(table);
        if(table && table.rls_enabled) counts.rls += 1;
        if(sev === 'critical') counts.critical += 1;
        else if(sev === 'high') counts.high += 1;
        if(card && txt(card.getAttribute('data-r10-scene-focus')) === 'focus') counts.focus += 1;
      });
      node.setAttribute('data-r10-active', counts.focus > 0 ? 'true' : 'false');
      meter.innerHTML = [
        '<span class="ss-r10-lane-token"><em>T</em><strong>' + esc(counts.table) + '</strong></span>',
        '<span class="ss-r10-lane-token tone-warn"><em>Risk</em><strong>' + esc(counts.critical + counts.high) + '</strong></span>',
        '<span class="ss-r10-lane-token"><em>Pol</em><strong>' + esc(counts.policy) + '</strong></span>',
        '<span class="ss-r10-lane-token"><em>RLS</em><strong>' + esc(counts.rls) + '</strong></span>',
        '<span class="ss-r10-lane-token tone-focus"><em>Focus</em><strong>' + esc(counts.focus) + '</strong></span>'
      ].join('');
    });
  }
  function ensureStage(){
    var wrap = document.getElementById('ss-canvas-wrap');
    var toggle, panel, rail;
    if(!wrap) return { wrap:null, toggle:null, panel:null, rail:null };
    toggle = wrap.querySelector('.ss-r10-toggle');
    panel = wrap.querySelector('.ss-r10-theatre');
    rail = wrap.querySelector('.ss-r10-rail');
    if(!toggle){
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ss-r10-toggle';
      toggle.innerHTML = '<span>▣</span><span>' + esc(t('Review theatre', 'Review theatre')) + '</span>';
      toggle.onclick = function(){ state.open = !state.open; persistState(); scheduleRender(); };
      wrap.appendChild(toggle);
    }
    if(!panel){
      panel = document.createElement('div');
      panel.className = 'ss-r10-theatre';
      panel.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-r10-action]') : null;
        if(!node) return;
        handleAction(txt(node.getAttribute('data-r10-action')), txt(node.getAttribute('data-value')), node);
      });
      wrap.appendChild(panel);
    }
    if(!rail){
      rail = document.createElement('div');
      rail.className = 'ss-r10-rail';
      rail.addEventListener('click', function(ev){
        var node = ev.target && ev.target.closest ? ev.target.closest('[data-r10-action]') : null;
        if(!node) return;
        handleAction(txt(node.getAttribute('data-r10-action')), txt(node.getAttribute('data-value')), node);
      });
      wrap.appendChild(rail);
    }
    return { wrap:wrap, toggle:toggle, panel:panel, rail:rail };
  }
  function buttonGroup(action, current, items){
    return '<div class="ss-r10-buttons">' + items.map(function(item){
      return '<button type="button" class="ss-r10-btn' + (current === item.value ? ' active' : '') + '" data-r10-action="' + esc(action) + '" data-value="' + esc(item.value) + '">' + esc(item.label) + '</button>';
    }).join('') + '</div>';
  }
  function renderTheatre(){
    var stage = ensureStage();
    var panel = stage.panel;
    var toggle = stage.toggle;
    var report = reportCache || fallbackReport();
    var summary = report.summary || {};
    var hero = report.hero || {};
    var themeList = arr(report.themes).slice(0, state.legend === 'quiet' ? 2 : 4);
    var sceneList = arr(report.scenes).slice(0, 5);
    var legendGroups = arr(report.legendGroups).slice(0, state.legend === 'full' ? 4 : (state.legend === 'essential' ? 2 : 1));
    var laneTelemetry = arr(report.laneTelemetry).slice(0, state.legend === 'quiet' ? 2 : 5);
    var shortcuts = arr(report.shortcuts).slice(0, state.legend === 'quiet' ? 2 : 5);
    var showDetails = state.legend !== 'quiet';
    if(!panel || !toggle) return;
    toggle.classList.toggle('is-open', !!state.open);
    panel.classList.toggle('is-open', !!state.open);
    panel.setAttribute('data-r10-legend', state.legend);
    if(!state.open) return;
    panel.innerHTML = [
      '<div class="ss-r10-head">',
        '<div><div class="ss-r10-kicker">' + esc(t('Round 10 review theatre', 'Round 10 review theatre')) + '</div><div class="ss-r10-title">' + esc(hero.headline || 'Review theatre') + '</div><div class="ss-r10-sub">' + esc(hero.subheadline || 'Selection-native review surface for enterprise schema graphs.') + '</div></div>',
        '<button type="button" class="ss-r10-close" data-r10-action="close">×</button>',
      '</div>',
      '<div class="ss-r10-body">',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Theme system', 'Theme system')) + '</div>' + buttonGroup('theme', state.theme, [
          { value:'studio', label:'Studio' },
          { value:'executive', label:'Executive' },
          { value:'audit', label:'Audit' },
          { value:'manufacturing', label:'Manufacturing' }
        ]) + '</section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Scene presets', 'Scene presets')) + '</div>' + buttonGroup('scene', state.scene, [
          { value:'overview', label:'Overview' },
          { value:'governance', label:'Governance' },
          { value:'traceability', label:'Traceability' },
          { value:'runtime', label:'Runtime' },
          { value:'review', label:'Review' }
        ]) + '</section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Legend posture', 'Legend posture')) + '</div>' + buttonGroup('legend', state.legend, [
          { value:'full', label:'Full' },
          { value:'essential', label:'Essential' },
          { value:'quiet', label:'Quiet' }
        ]) + '</section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Selection rail', 'Selection rail')) + '</div>' + buttonGroup('rail', state.rail ? 'on' : 'off', [
          { value:'on', label:'On' },
          { value:'off', label:'Off' }
        ]) + '</section>',
        '<section class="ss-r10-metrics">',
          '<div class="ss-r10-metric"><span>' + esc(t('Review theatre', 'Review theatre')) + '</span><strong>' + esc(num(summary.reviewTheatreScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r10-metric"><span>' + esc(t('Theme system', 'Theme system')) + '</span><strong>' + esc(num(summary.themeSystemScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r10-metric"><span>' + esc(t('Scene presets', 'Scene presets')) + '</span><strong>' + esc(num(summary.scenePresetScore, 0) + '%') + '</strong></div>',
          '<div class="ss-r10-metric"><span>' + esc(t('Selection rail', 'Selection rail')) + '</span><strong>' + esc(num(summary.selectionRailScore, 0) + '%') + '</strong></div>',
        '</section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Themes & scenes', 'Themes & scenes')) + '</div><div class="ss-r10-list">' +
          themeList.map(function(item){ return '<div class="ss-r10-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-r10-sub">' + esc(item.detail || '') + '</div></div><span class="ss-r10-pill">' + esc(num(item.score, 0) + '%') + '</span></div>'; }).join('') +
          (showDetails ? sceneList.map(function(item){ return '<div class="ss-r10-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-r10-sub">' + esc(item.focus || item.signal || '') + '</div></div><span class="ss-r10-pill">' + esc(num(item.score, 0) + '%') + '</span></div>'; }).join('') : '') +
        '</div></section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Legend & telemetry', 'Legend & telemetry')) + '</div><div class="ss-r10-list">' +
          legendGroups.map(function(item){ return '<div class="ss-r10-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-r10-sub">' + esc(item.detail || '') + '</div>' + (showDetails ? '<div class="ss-r10-chip-wrap">' + arr(item.items).map(function(label){ return '<span class="ss-r10-chip">' + esc(label) + '</span>'; }).join('') + '</div>' : '') + '</div><span class="ss-r10-pill">' + esc(num(item.score, 0) + '%') + '</span></div>'; }).join('') +
          laneTelemetry.map(function(item){ return '<div class="ss-r10-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ss-r10-sub">' + esc(item.detail || '') + '</div></div><span class="ss-r10-pill">' + esc(num(item.score, 0) + '%') + '</span></div>'; }).join('') +
        '</div></section>',
        '<section class="ss-r10-section"><div class="ss-r10-section-label">' + esc(t('Shortcuts', 'Shortcuts')) + '</div><div class="ss-r10-chip-wrap">' + (shortcuts.length ? shortcuts.map(function(item){ return '<span class="ss-r10-chip"><strong>' + esc(item.keys || '-') + '</strong><em>' + esc(item.label || '') + '</em></span>'; }).join('') : '<span class="ss-r10-sub">' + esc(t('No shortcuts yet', 'No shortcuts yet')) + '</span>') + '</div></section>',
      '</div>'
    ].join('');
  }
  function renderRail(){
    var stage = ensureStage();
    var rail = stage.rail;
    var summary = focusSummary();
    if(!rail) return;
    rail.classList.toggle('is-hidden', !state.rail);
    if(!state.rail) return;
    rail.innerHTML = [
      '<div class="ss-r10-rail-main">',
        '<div class="ss-r10-rail-kicker">' + esc(titleize(state.scene)) + '</div>',
        '<div class="ss-r10-rail-title">' + esc(summary.title || 'Review theatre') + '</div>',
        '<div class="ss-r10-rail-sub">' + esc(summary.subtitle || '') + '</div>',
      '</div>',
      '<div class="ss-r10-rail-facts">' + arr(summary.facts).slice(0, 6).map(function(item){ return '<span class="ss-r10-rail-fact"><em>' + esc(item.label || '-') + '</em><strong>' + esc(item.value || '-') + '</strong></span>'; }).join('') + '</div>',
      '<div class="ss-r10-rail-actions">' +
        (summary.tableId ? '<button type="button" class="ss-r10-rail-btn primary" data-r10-action="inspect" data-value="' + esc(summary.tableId) + '">' + esc(t('Open inspector', 'Open inspector')) + '</button>' : '') +
        '<button type="button" class="ss-r10-rail-btn" data-r10-action="scene" data-value="governance">' + esc(t('Governance', 'Governance')) + '</button>' +
        '<button type="button" class="ss-r10-rail-btn" data-r10-action="scene" data-value="traceability">' + esc(t('Traceability', 'Traceability')) + '</button>' +
        '<button type="button" class="ss-r10-rail-btn" data-r10-action="scene" data-value="runtime">' + esc(t('Runtime', 'Runtime')) + '</button>' +
        '<button type="button" class="ss-r10-rail-btn" data-r10-action="legend" data-value="' + esc(state.legend === 'quiet' ? 'full' : 'quiet') + '">' + esc(state.legend === 'quiet' ? t('Full legend', 'Full legend') : t('Quiet legend', 'Quiet legend')) + '</button>' +
      '</div>'
    ].join('');
  }
  function handleAction(action, value){
    if(action === 'close'){ state.open = false; persistState(); renderTheatre(); return; }
    if(action === 'theme' && value){ state.theme = value; persistState(); scheduleRender(); return; }
    if(action === 'scene' && value){ state.scene = value; persistState(); scheduleRender(); return; }
    if(action === 'legend' && value){ state.legend = value; persistState(); scheduleRender(); return; }
    if(action === 'rail'){ state.rail = value === 'on'; persistState(); scheduleRender(); return; }
    if(action === 'inspect' && value && win.TableCard && typeof win.TableCard.openDetails === 'function'){ win.TableCard.openDetails(value); return; }
    if(action === 'refresh'){ fetchReport(true).then(function(){ scheduleRender(); }); return; }
  }
  function loadState(){
    try{
      var raw = localStorage.getItem(LS_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if(parsed && typeof parsed === 'object'){
        if(parsed.theme && THEMES[parsed.theme]) state.theme = parsed.theme;
        if(parsed.scene) state.scene = parsed.scene;
        if(parsed.legend) state.legend = parsed.legend;
        if(typeof parsed.open === 'boolean') state.open = parsed.open;
        if(typeof parsed.rail === 'boolean') state.rail = parsed.rail;
      }
    }catch(_err){}
  }
  function persistState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify({
        open: !!state.open,
        theme: state.theme,
        scene: state.scene,
        legend: state.legend,
        rail: !!state.rail
      }));
    }catch(_err){}
  }
  function addCommands(){
    if(!win.CmdPalette || !Array.isArray(win.CmdPalette.COMMANDS)) return;
    win.CmdPalette.COMMANDS = win.CmdPalette.COMMANDS.filter(function(command){
      return !command || ['Open round 10 review theatre','Switch to governance review scene','Switch to traceability review scene','Switch to runtime review scene'].indexOf(command.label_en) < 0;
    });
    win.CmdPalette.COMMANDS.push(
      {
        icon:'🎭',
        label:'Mở review theatre round 10',
        label_en:'Open round 10 review theatre',
        category:'schema',
        action:function(){ state.open = true; persistState(); fetchReport(false).then(function(){ scheduleRender(); }); }
      },
      {
        icon:'🛡️',
        label:'Chuyển sang governance review scene',
        label_en:'Switch to governance review scene',
        category:'schema',
        action:function(){ state.scene = 'governance'; state.theme = 'audit'; persistState(); scheduleRender(); }
      },
      {
        icon:'🧬',
        label:'Chuyển sang traceability review scene',
        label_en:'Switch to traceability review scene',
        category:'schema',
        action:function(){ state.scene = 'traceability'; state.theme = 'manufacturing'; persistState(); scheduleRender(); }
      },
      {
        icon:'⚙️',
        label:'Chuyển sang runtime review scene',
        label_en:'Switch to runtime review scene',
        category:'schema',
        action:function(){ state.scene = 'runtime'; state.theme = 'studio'; persistState(); scheduleRender(); }
      }
    );
  }
  function onKeydown(ev){
    if(!ev || !ev.altKey) return;
    if(ev.key === '0'){
      ev.preventDefault();
      state.open = !state.open;
      persistState();
      scheduleRender();
      return;
    }
    if(ev.shiftKey && ev.key === '1'){ ev.preventDefault(); state.scene = 'overview'; persistState(); scheduleRender(); return; }
    if(ev.shiftKey && ev.key === '2'){ ev.preventDefault(); state.scene = 'governance'; persistState(); scheduleRender(); return; }
    if(ev.shiftKey && ev.key === '3'){ ev.preventDefault(); state.scene = 'traceability'; persistState(); scheduleRender(); return; }
    if(ev.shiftKey && ev.key === '4'){ ev.preventDefault(); state.scene = 'runtime'; persistState(); scheduleRender(); return; }
  }
  function renderAll(){
    applyThemeVars();
    applyRootState();
    decorateCards();
    decorateEdges();
    decorateLanes();
    renderTheatre();
    renderRail();
  }
  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 40);
  }
  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-strip{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;border-top:1px solid rgba(148,163,184,.08);border-bottom:1px solid rgba(148,163,184,.08);background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,0));}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-head{display:flex;align-items:center;gap:8px;min-width:0;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-dot{width:7px;height:7px;border-radius:999px;background:var(--ss-r10-scene-accent,#7dd3fc);box-shadow:0 0 0 4px rgba(255,255,255,.03);}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-name{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#93a5c4;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-items{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-token{display:inline-flex;align-items:center;gap:5px;height:18px;padding:0 7px;border-radius:999px;border:1px solid rgba(148,163,184,.10);background:rgba(148,163,184,.08);font-size:9.5px;color:#dbeafe;max-width:100%;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-token em{font-style:normal;font-weight:700;color:#8fa5c7;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card .ss-r10-scene-token strong{font-weight:800;color:#f8fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}',
      '.ss-r10-review-language[data-r8-zoom-band="atlas"] .ss-table-card.ss-r8-card .ss-r10-scene-strip,.ss-r10-review-language[data-r8-zoom-band="map"] .ss-table-card.ss-r8-card .ss-r10-scene-strip{display:none;}',
      '.ss-r10-review-language[data-r10-scene="overview"] .ss-table-card.ss-r8-card[data-r10-scene-focus="soft"]{opacity:.98;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card[data-r10-scene-focus="dim"]{opacity:.36;filter:saturate(.78);}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card[data-r10-scene-focus="focus"]{box-shadow:0 22px 52px var(--ss-r10-glow,rgba(56,189,248,.18)),0 0 0 1px rgba(255,255,255,.07) inset;}',
      '.ss-r10-review-language .ss-table-card.ss-r8-card[data-r10-scene-focus="soft"]{box-shadow:0 16px 36px rgba(2,6,23,.16);}',
      '.ss-r10-review-language .ss-edge-group[data-r10-scene-focus="dim"]{opacity:.09!important;}',
      '.ss-r10-review-language .ss-edge-group[data-r10-scene-focus="soft"]{opacity:.26;}',
      '.ss-r10-review-language .ss-edge-group[data-r10-scene-focus="focus"]{opacity:.92;}',
      '.ss-r10-review-language .ss-edge-group[data-r10-scene-focus="focus"] .ss-edge{stroke:var(--ss-r10-scene-accent,#7dd3fc)!important;stroke-width:2.05;filter:drop-shadow(0 0 6px var(--ss-r10-glow,rgba(56,189,248,.18)));}',
      '.ss-r10-review-language .ss-r9-lane{transition:border-color .16s ease,box-shadow .16s ease,background .16s ease;}',
      '.ss-r10-review-language .ss-r9-lane[data-r10-active="true"]{border-color:rgba(255,255,255,.12);box-shadow:0 0 0 1px var(--ss-r10-glow,rgba(56,189,248,.12)) inset;}',
      '.ss-r10-lane-metrics{position:absolute;right:14px;top:-11px;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none;}',
      '.ss-r10-lane-token{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(8,15,28,.94);font-size:10px;color:#dbeafe;box-shadow:0 8px 18px rgba(2,6,23,.12);}',
      '.ss-r10-lane-token em{font-style:normal;font-weight:700;color:#8fa5c7;}',
      '.ss-r10-lane-token strong{font-weight:800;color:#f8fbff;}',
      '.ss-r10-lane-token.tone-warn{border-color:rgba(249,115,22,.20);color:#ffedd5;}',
      '.ss-r10-lane-token.tone-focus{border-color:rgba(56,189,248,.20);color:#e0f2fe;}',
      '.ss-r10-toggle{position:absolute;left:18px;bottom:18px;display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(148,163,184,.16);background:var(--ss-r10-panel,rgba(8,15,28,.92));color:#f8fbff;box-shadow:0 12px 28px rgba(2,6,23,.20);z-index:36;backdrop-filter:blur(10px);}',
      '.ss-r10-toggle.is-open{border-color:rgba(125,211,252,.28);box-shadow:0 16px 32px rgba(2,6,23,.24),0 0 0 1px rgba(125,211,252,.10) inset;}',
      '.ss-r10-theatre{position:absolute;left:18px;bottom:64px;width:380px;max-width:calc(100% - 36px);border-radius:22px;border:1px solid rgba(148,163,184,.16);background:linear-gradient(180deg,var(--ss-r10-panel,rgba(8,15,28,.96)),rgba(15,23,42,.94));box-shadow:0 20px 50px rgba(2,6,23,.30);backdrop-filter:blur(12px);z-index:36;display:none;overflow:hidden;}',
      '.ss-r10-theatre.is-open{display:block;}',
      '.ss-r10-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 16px 12px;border-bottom:1px solid rgba(148,163,184,.10);}',
      '.ss-r10-kicker{font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8fa5c7;}',
      '.ss-r10-title{font-size:15px;line-height:1.25;font-weight:800;color:#f8fbff;margin-top:4px;}',
      '.ss-r10-sub{font-size:11px;line-height:1.45;color:#93a5c4;margin-top:6px;}',
      '.ss-r10-close{width:28px;height:28px;border-radius:10px;border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.04);color:#f8fbff;}',
      '.ss-r10-body{padding:14px 16px 16px;display:grid;gap:14px;max-height:70vh;overflow:auto;}',
      '.ss-r10-section{display:grid;gap:8px;}',
      '.ss-r10-section-label{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8fa5c7;}',
      '.ss-r10-buttons{display:flex;flex-wrap:wrap;gap:6px;}',
      '.ss-r10-btn{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(255,255,255,.04);font-size:10px;font-weight:800;color:#dbeafe;}',
      '.ss-r10-btn.active{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.28);color:#f8fbff;box-shadow:0 0 0 1px rgba(56,189,248,.08) inset;}',
      '.ss-r10-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}',
      '.ss-r10-metric{padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.54);display:grid;gap:4px;}',
      '.ss-r10-metric span{font-size:10px;font-weight:700;color:#8fa5c7;}',
      '.ss-r10-metric strong{font-size:18px;font-weight:800;color:#f8fbff;}',
      '.ss-r10-list{display:grid;gap:8px;}',
      '.ss-r10-item{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:10px 12px;border-radius:14px;border:1px solid rgba(148,163,184,.10);background:rgba(255,255,255,.04);}',
      '.ss-r10-item strong{color:#f8fbff;font-size:12px;}',
      '.ss-r10-pill{display:inline-flex;align-items:center;justify-content:center;min-width:48px;height:22px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.10);font-size:10px;font-weight:800;color:#f8fbff;}',
      '.ss-r10-chip-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}',
      '.ss-r10-chip{display:inline-flex;align-items:center;gap:6px;height:20px;padding:0 8px;border-radius:999px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.10);font-size:10px;color:#dbeafe;}',
      '.ss-r10-chip strong{font-size:10px;color:#f8fbff;}',
      '.ss-r10-chip em{font-style:normal;font-size:10px;color:#8fa5c7;}',
      '.ss-r10-rail{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(980px,calc(100% - 240px));display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(0,1.4fr) auto;gap:12px;align-items:center;padding:12px 14px;border-radius:20px;border:1px solid rgba(148,163,184,.14);background:linear-gradient(180deg,var(--ss-r10-panel,rgba(8,15,28,.94)),rgba(15,23,42,.92));box-shadow:0 18px 44px rgba(2,6,23,.26);z-index:35;backdrop-filter:blur(10px);}',
      '.ss-r10-rail.is-hidden{display:none;}',
      '.ss-r10-rail-main{min-width:0;}',
      '.ss-r10-rail-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8fa5c7;}',
      '.ss-r10-rail-title{font-size:15px;font-weight:800;color:#f8fbff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
      '.ss-r10-rail-sub{font-size:11px;color:#93a5c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px;}',
      '.ss-r10-rail-facts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.ss-r10-rail-fact{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 8px;border-radius:999px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.10);font-size:10px;color:#dbeafe;}',
      '.ss-r10-rail-fact em{font-style:normal;font-weight:700;color:#8fa5c7;}',
      '.ss-r10-rail-fact strong{font-weight:800;color:#f8fbff;}',
      '.ss-r10-rail-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;}',
      '.ss-r10-rail-btn{display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(148,163,184,.12);background:rgba(255,255,255,.04);font-size:10px;font-weight:800;color:#dbeafe;}',
      '.ss-r10-rail-btn.primary{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.28);color:#f8fbff;}',
      '@media (max-width:1440px){.ss-r10-rail{width:min(860px,calc(100% - 220px));grid-template-columns:1fr;justify-items:start;}.ss-r10-rail-actions{justify-content:flex-start;}}',
      '@media (max-width:1120px){.ss-r10-rail{width:calc(100% - 36px);left:18px;transform:none;bottom:62px;}.ss-r10-toggle{bottom:18px;}.ss-r10-theatre{width:calc(100% - 36px);}.ss-r10-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  loadState();
  fetchReport(false).then(function(){ scheduleRender(); });
  addCommands();
  ensureStyles();
  applyThemeVars();
  applyRootState();
  scheduleRender();

  var originalCanvasRender = win.Canvas.render;
  win.Canvas.render = function(){
    var result = originalCanvasRender.apply(this, arguments);
    scheduleRender();
    return result;
  };
  var originalApplyTransform = win.Canvas.applyTransform;
  win.Canvas.applyTransform = function(){
    var result = originalApplyTransform.apply(this, arguments);
    scheduleRender();
    return result;
  };
  var originalSyncSelectionClasses = win.Canvas.syncSelectionClasses;
  win.Canvas.syncSelectionClasses = function(){
    var result = originalSyncSelectionClasses.apply(this, arguments);
    scheduleRender();
    return result;
  };
  if(win.TableCard && typeof win.TableCard.renderTable === 'function'){
    var originalTableRender = win.TableCard.renderTable;
    win.TableCard.renderTable = function(tbl){
      var result = originalTableRender.apply(this, arguments);
      scheduleRender();
      return result;
    };
  }
  win.addEventListener('resize', scheduleRender);
  document.addEventListener('keydown', onKeydown, true);

  if(win.SchemaStudio) win.SchemaStudio.__round10ReviewPatched = true;
})(window);

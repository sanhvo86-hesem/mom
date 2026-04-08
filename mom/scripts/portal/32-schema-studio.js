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
      '<div class="ss-enterprise-section"><div class="ss-enterprise-section-title">' + enterpriseEsc(_t('Compiler actions', 'Compiler actions')) + '</div><div class="ss-enterprise-inline-list"><button class="hm-btn hm-btn-primary ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.compileRegistryBundle()">' + enterpriseEsc(_t('Compile registry bundle', 'Compile registry bundle')) + '</button><button class="hm-btn hm-btn-ghost ss-btn-sm" type="button" onclick="SchemaStudioEnterprise.downloadReport()">' + enterpriseEsc(_t('Xuất báo cáo', 'Export report')) + '</button></div><div class="ss-enterprise-help">' + enterpriseEsc(_t('Compiler sẽ sinh runtime projections, registry contracts và enterprise manifest dưới data/registry.', 'The compiler writes runtime projections, registry contracts, and the enterprise manifest under data/registry.')) + '</div></div>'
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
  buildId:'20260407enterprise',
  init:init,
  destroy:destroy,
  getDiagnostics:function(){ return Diagnostics.snapshot(); },
  runSelfCheck:function(){ return Diagnostics.runSelfCheck(); },
  exportDiagnostics:function(){ Diagnostics.exportReport(); }
};
window._renderSchemaStudio = function(page){
  init(page);
};


/* Round 13 Lite fix: registry-only workspace + detail options + performance hardening */
(function(){
  var LITE_PREFS_KEY = LS_PREFIX + 'round13-lite';
  var LITE_SYSTEM_ONLY_ID = '__system_registry__';
  var LITE_STYLE_ID = 'ss-round13-lite-style';
  var LITE_DEFAULTS = {
    tableDetailMode: 'minimal',
    edgeLabelMode: 'focus'
  };

  function liteReadPrefs(){
    var parsed;
    try{
      parsed = JSON.parse(localStorage.getItem(LITE_PREFS_KEY) || '{}');
    }catch(err){
      parsed = {};
    }
    return {
      tableDetailMode: ['minimal', 'standard', 'full'].indexOf(parsed.tableDetailMode) >= 0 ? parsed.tableDetailMode : LITE_DEFAULTS.tableDetailMode,
      edgeLabelMode: ['off', 'focus', 'all'].indexOf(parsed.edgeLabelMode) >= 0 ? parsed.edgeLabelMode : LITE_DEFAULTS.edgeLabelMode
    };
  }

  function liteEnsureState(){
    if(!STORE.presentationLite){
      STORE.presentationLite = liteReadPrefs();
    }
    return STORE.presentationLite;
  }

  function liteSavePrefs(){
    liteEnsureState();
    try{
      localStorage.setItem(LITE_PREFS_KEY, JSON.stringify(STORE.presentationLite));
    }catch(err){}
  }

  function liteSystemEntry(){
    var tableCount = STORE.schema && STORE.currentDesignId === LITE_SYSTEM_ONLY_ID && STORE.schema.tables ? STORE.schema.tables.length : 628;
    return {
      id: LITE_SYSTEM_ONLY_ID,
      name: _t('HESEM System Registry', 'HESEM System Registry'),
      version: 'registry',
      updatedAt: '',
      author: 'system',
      tableCount: tableCount,
      isSystem: true
    };
  }

  function liteEnsureStyles(){
    var style;
    if(document.getElementById(LITE_STYLE_ID)) return;
    style = document.createElement('style');
    style.id = LITE_STYLE_ID;
    style.textContent = [
      '.ss-lite-toolbar-btn{display:inline-flex;align-items:center;gap:8px;}',
      '.ss-lite-toolbar-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:var(--amber);box-shadow:0 0 0 3px rgba(245,158,11,.16);}',
      '.ss-lite-options-grid{display:grid;gap:14px;}',
      '.ss-lite-option-card{padding:14px 16px;border:1px solid rgba(148,163,184,.24);border-radius:14px;background:rgba(255,255,255,.72);backdrop-filter:blur(8px);}',
      '.ss-lite-option-title{font-weight:700;font-size:14px;margin-bottom:10px;color:var(--ink);}',
      '.ss-lite-radio-list{display:grid;gap:10px;}',
      '.ss-lite-radio-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid rgba(148,163,184,.24);border-radius:12px;background:rgba(255,255,255,.78);}',
      '.ss-lite-radio-item input{margin-top:2px;}',
      '.ss-lite-radio-label{display:block;font-weight:700;color:var(--ink);}',
      '.ss-lite-radio-hint{display:block;margin-top:4px;font-size:12px;line-height:1.45;color:var(--muted);}',
      '.ss-lite-lock-note{font-size:12px;line-height:1.5;color:var(--muted);margin-top:10px;}',
      '.ss-lite-system-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.04);font-weight:700;}',
      '.ss-lite-system-chip strong{font-size:12px;}',
      '.ss-tbl-meta-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
      '.ss-table-card.ss-detail-minimal{min-height:' + String(TABLE_HEADER_HEIGHT + 20) + 'px;}',
      '.ss-table-card.ss-detail-minimal .ss-col-list,.ss-table-card.ss-detail-minimal .ss-table-footer{display:none;}',
      '.ss-table-card.ss-detail-standard .ss-table-footer{padding-top:8px;}',
      '.ss-table-card.ss-detail-standard .ss-col-item,.ss-table-card.ss-detail-minimal .ss-table-card-header{backdrop-filter:saturate(1.05);}',
      '.ss-col-item.ss-col-item-overflow{cursor:default;opacity:.76;font-style:italic;}',
      '.ss-col-item.ss-col-item-overflow .ss-fk-port{display:none;}',
      '.ss-edge-label[data-lite-hidden="1"]{display:none;}',
      '.ss-schema-select[disabled]{opacity:1;cursor:default;}',
      '.ss-lite-toolbar-note{display:inline-flex;align-items:center;padding:0 10px;height:32px;border-radius:999px;background:rgba(15,23,42,.04);font-size:12px;color:var(--muted);}',
      '@media (max-width: 1180px){.ss-lite-toolbar-note{display:none;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function liteVisibleColumns(tbl){
    var mode = liteEnsureState().tableDetailMode;
    var cols = (tbl && tbl.columns) || [];
    if(!tbl || (tbl.canvas && tbl.canvas.collapsed)) return [];
    if(mode === 'minimal') return [];
    if(mode === 'standard') return cols.slice(0, 8);
    return cols.slice();
  }

  function liteHiddenColumnCount(tbl){
    var total = ((tbl && tbl.columns) || []).length;
    var visible = liteVisibleColumns(tbl).length;
    return Math.max(0, total - visible);
  }

  function liteShouldShowEdgeLabel(rel){
    var mode = liteEnsureState().edgeLabelMode;
    var selection = STORE.canvas.selection || [];
    if(mode === 'all') return true;
    if(mode === 'off') return false;
    if(!selection.length) return false;
    return selection.some(function(item){
      if(item.kind === 'edge') return item.id === rel.id;
      if(item.kind === 'table') return item.id === rel.from_table_id || item.id === rel.to_table_id;
      return false;
    });
  }

  function liteRefreshRelationLabels(){
    Array.prototype.forEach.call(document.querySelectorAll('.ss-edge-group'), function(node){
      var rel = findRelation(node.getAttribute('data-edge-id'));
      var label = node.querySelector('.ss-edge-label');
      var visible = !!(rel && label && liteShouldShowEdgeLabel(rel));
      if(label){
        label.setAttribute('data-lite-hidden', visible ? '0' : '1');
      }
    });
  }

  function liteCloseOptions(overlay){
    unregisterManagedOverlay(overlay);
    removeNode(overlay);
  }

  function liteRerender(){
    renderToolbar(refs.toolbar);
    Browser.render();
    Canvas.render();
    liteRefreshRelationLabels();
  }

  function liteOpenOptions(){
    var prefs = liteEnsureState();
    var overlay = document.createElement('div');
    overlay.className = 'ss-modal-overlay';
    overlay.innerHTML = [
      '<div class="ss-modal" role="dialog" aria-modal="true" aria-labelledby="ss-lite-options-title">',
        '<div class="ss-modal-header"><h3 id="ss-lite-options-title">' + _esc(_t('Tùy chọn hiển thị', 'Display options')) + '</h3><button type="button" class="hm-btn hm-btn-ghost" data-ss-lite-close="1" aria-label="' + _esc(_t('Đóng tùy chọn hiển thị', 'Close display options')) + '">X</button></div>',
        '<div class="ss-modal-body">',
          '<div class="ss-lite-options-grid">',
            '<div class="ss-lite-option-card">',
              '<div class="ss-lite-option-title">' + _esc(_t('Mức chi tiết đối tượng trên canvas', 'Object detail level on canvas')) + '</div>',
              '<div class="ss-lite-radio-list">',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-table-mode" value="minimal"' + (prefs.tableDetailMode === 'minimal' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Tối giản', 'Minimal')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Chỉ giữ tên bảng và số cột. Giảm chiều cao mạnh nhất để tránh che màn hình.', 'Keep only table name and column count. Reduces card height the most to avoid covering the screen.')) + '</span></span></label>',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-table-mode" value="standard"' + (prefs.tableDetailMode === 'standard' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Chuẩn', 'Standard')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Hiện tối đa 8 cột đầu, ẩn loại dữ liệu và badge phụ.', 'Shows up to the first 8 columns and hides data types and secondary badges.')) + '</span></span></label>',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-table-mode" value="full"' + (prefs.tableDetailMode === 'full' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Đầy đủ', 'Full')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Hiện toàn bộ cột, kiểu dữ liệu và badge như studio đầy đủ.', 'Shows all columns, data types, and badges like the full studio.')) + '</span></span></label>',
              '</div>',
            '</div>',
            '<div class="ss-lite-option-card">',
              '<div class="ss-lite-option-title">' + _esc(_t('Nhãn liên kết', 'Relation labels')) + '</div>',
              '<div class="ss-lite-radio-list">',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-edge-mode" value="off"' + (prefs.edgeLabelMode === 'off' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Tắt', 'Off')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Ẩn toàn bộ tên liên kết để giảm rối và tăng hiệu năng.', 'Hide every relation label to reduce clutter and improve performance.')) + '</span></span></label>',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-edge-mode" value="focus"' + (prefs.edgeLabelMode === 'focus' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Theo chọn', 'Selected only')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Chỉ hiện label của cạnh đang chọn hoặc cạnh nối với bảng đang chọn.', 'Only show labels for the selected edge or edges attached to the selected table.')) + '</span></span></label>',
                '<label class="ss-lite-radio-item"><input type="radio" name="ss-lite-edge-mode" value="all"' + (prefs.edgeLabelMode === 'all' ? ' checked' : '') + ' /><span><span class="ss-lite-radio-label">' + _esc(_t('Tất cả', 'All')) + '</span><span class="ss-lite-radio-hint">' + _esc(_t('Hiện toàn bộ nhãn liên kết. Chỉ nên dùng khi cần đọc kỹ dependency.', 'Show every relation label. Use only when you need to inspect dependencies in detail.')) + '</span></span></label>',
              '</div>',
            '</div>',
            '<div class="ss-lite-option-card">',
              '<div class="ss-lite-option-title">' + _esc(_t('Phạm vi schema hiện hành', 'Current schema scope')) + '</div>',
              '<div class="ss-lite-system-chip"><span class="ss-lite-toolbar-dot"></span><strong>' + _esc(_t('Đã khóa vào HESEM System Registry', 'Locked to HESEM System Registry')) + '</strong></div>',
              '<div class="ss-lite-lock-note">' + _esc(_t('Bản vá này chỉ giữ lại schema hệ thống trong selector để loại bỏ danh sách schema khác khỏi giao diện hiện tại. Dữ liệu cũ trên server không bị xóa vật lý, nhưng sẽ không còn xuất hiện trong studio này.', 'This patch keeps only the system schema in the selector to remove other schemas from the current interface. Older server-side records are not physically deleted, but they are no longer exposed in this studio.')) + '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="ss-modal-footer"><button type="button" class="hm-btn hm-btn-ghost" data-ss-lite-close="1">' + _esc(_t('Đóng', 'Close')) + '</button><button type="button" class="hm-btn hm-btn-primary" id="ss-lite-apply">' + _esc(_t('Áp dụng', 'Apply')) + '</button></div>',
      '</div>'
    ].join('');
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay || ev.target.getAttribute('data-ss-lite-close') === '1'){
        liteCloseOptions(overlay);
      }
    });
    overlay.querySelector('#ss-lite-apply').onclick = function(){
      var tableChoice = overlay.querySelector('input[name="ss-lite-table-mode"]:checked');
      var edgeChoice = overlay.querySelector('input[name="ss-lite-edge-mode"]:checked');
      STORE.presentationLite.tableDetailMode = tableChoice ? tableChoice.value : LITE_DEFAULTS.tableDetailMode;
      STORE.presentationLite.edgeLabelMode = edgeChoice ? edgeChoice.value : LITE_DEFAULTS.edgeLabelMode;
      liteSavePrefs();
      liteCloseOptions(overlay);
      liteRerender();
      toast(_t('Đã cập nhật tùy chọn hiển thị', 'Display options updated'), 'success');
    };
    document.body.appendChild(overlay);
    registerManagedOverlay(overlay, { initialFocus:'#ss-lite-apply', onEscape:function(){ liteCloseOptions(overlay); } });
  }

  var originalEstimateTableCardWidth = estimateTableCardWidth;
  estimateTableCardWidth = function(tbl){
    var mode = liteEnsureState().tableDetailMode;
    var base = originalEstimateTableCardWidth(tbl);
    if(mode === 'minimal') return Math.max(250, Math.min(360, Math.round(base * 0.74)));
    if(mode === 'standard') return Math.max(280, Math.min(420, Math.round(base * 0.82)));
    return base;
  };

  var originalGetTableHeight = getTableHeight;
  getTableHeight = function(tbl){
    var mode = liteEnsureState().tableDetailMode;
    var columnCount;
    var visibleCount;
    if(!tbl) return 0;
    if(tbl.canvas && tbl.canvas.collapsed) return TABLE_HEADER_HEIGHT;
    if(mode === 'minimal') return TABLE_HEADER_HEIGHT + 16;
    if(mode === 'standard'){
      columnCount = (tbl.columns || []).length;
      visibleCount = Math.min(columnCount, 8);
      if(columnCount > visibleCount) visibleCount += 1;
      return TABLE_HEADER_HEIGHT + (visibleCount * COLUMN_HEIGHT) + TABLE_FOOTER_HEIGHT;
    }
    return originalGetTableHeight(tbl);
  };

  var originalGetPortPosition = getPortPosition;
  getPortPosition = function(tableId, colId){
    var tbl = findTable(tableId);
    var width;
    var allCols;
    var rawIndex = -1;
    var visibleCols;
    var visibleIndex;
    var overflowIndex;
    var slot;
    var mode = liteEnsureState().tableDetailMode;
    if(!tbl) return null;
    if(mode === 'full') return originalGetPortPosition(tableId, colId);
    width = tbl.canvas.width || TABLE_DEFAULT_WIDTH;
    if(tbl.canvas && tbl.canvas.collapsed){
      return { x: tbl.canvas.x + width, y: tbl.canvas.y + (TABLE_HEADER_HEIGHT / 2) };
    }
    allCols = tbl.columns || [];
    allCols.forEach(function(col, idx){ if(col.id === colId) rawIndex = idx; });
    if(rawIndex < 0) return null;
    if(mode === 'minimal'){
      slot = rawIndex % 4;
      return { x: tbl.canvas.x + width, y: tbl.canvas.y + 16 + (slot * 8) };
    }
    visibleCols = liteVisibleColumns(tbl);
    visibleIndex = visibleCols.findIndex(function(col){ return col.id === colId; });
    if(visibleIndex >= 0){
      return { x: tbl.canvas.x + width, y: tbl.canvas.y + TABLE_HEADER_HEIGHT + (visibleIndex * COLUMN_HEIGHT) + (COLUMN_HEIGHT / 2) };
    }
    overflowIndex = visibleCols.length;
    return { x: tbl.canvas.x + width, y: tbl.canvas.y + TABLE_HEADER_HEIGHT + (overflowIndex * COLUMN_HEIGHT) + (COLUMN_HEIGHT / 2) };
  };

  var originalRenderEdge = EdgeLayer.renderEdge;
  EdgeLayer.renderEdge = function(rel){
    var before = EdgeLayer.svgLayer ? EdgeLayer.svgLayer.childElementCount : 0;
    var result = originalRenderEdge.apply(this, arguments);
    var group;
    var label;
    if(EdgeLayer.svgLayer && EdgeLayer.svgLayer.childElementCount > before){
      group = EdgeLayer.svgLayer.lastElementChild;
      label = group ? group.querySelector('.ss-edge-label') : null;
      if(label){
        label.setAttribute('data-lite-hidden', liteShouldShowEdgeLabel(rel) ? '0' : '1');
      }
    }
    return result;
  };

  var originalCanvasSelectTable = Canvas.selectTable;
  Canvas.selectTable = function(){
    var result = originalCanvasSelectTable.apply(this, arguments);
    liteRefreshRelationLabels();
    return result;
  };

  var originalCanvasSelectEdge = Canvas.selectEdge;
  Canvas.selectEdge = function(){
    var result = originalCanvasSelectEdge.apply(this, arguments);
    liteRefreshRelationLabels();
    return result;
  };

  var originalCanvasClearSelection = Canvas.clearSelection;
  Canvas.clearSelection = function(){
    var result = originalCanvasClearSelection.apply(this, arguments);
    liteRefreshRelationLabels();
    return result;
  };

  var originalTableRender = TableCard.renderTable;
  TableCard.renderTable = function(tbl){
    var mode = liteEnsureState().tableDetailMode;
    var card;
    var domainColor;
    var effectiveWidth;
    var schemaLabel;
    var metaItems;
    var visibleColumns;
    var hiddenCount;
    if(mode === 'full'){
      return originalTableRender.apply(this, arguments);
    }
    if(!refs.tablesLayer) return;
    if(document.getElementById('tc_' + tbl.id)) return;
    card = document.createElement('div');
    domainColor = tbl.color || DOMAIN_COLORS[tbl.domain] || DOMAIN_COLORS.default;
    effectiveWidth = Math.max((tbl.canvas && tbl.canvas.width) || TABLE_DEFAULT_WIDTH, estimateTableCardWidth(tbl));
    schemaLabel = String(tbl.schema || 'public');
    metaItems = [];
    visibleColumns = liteVisibleColumns(tbl);
    hiddenCount = liteHiddenColumnCount(tbl);
    if(schemaLabel && schemaLabel !== 'public'){
      metaItems.push('<span class="ss-tbl-meta">' + _esc(schemaLabel) + '</span>');
    }
    metaItems.push('<span class="ss-tbl-meta">' + _esc(String((tbl.columns || []).length) + ' ' + _t('cột', 'columns')) + '</span>');
    tbl.canvas = tbl.canvas || {};
    tbl.canvas.width = effectiveWidth;
    card.className = 'ss-table-card ss-detail-' + mode + (tbl.canvas.collapsed ? ' collapsed' : '');
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
            '<span class="ss-tbl-meta-row">' + metaItems.join('') + '</span>',
          '</div>',
        '</div>',
      '</div>',
      visibleColumns.length ? '<ul class="ss-col-list">' + visibleColumns.map(function(col){
        var iconClass = col.primary_key ? 'is-pk' : (col.foreign_key ? 'is-fk' : '');
        var icon = col.primary_key ? 'K' : (col.foreign_key ? 'F' : '.');
        return '<li class="ss-col-item" data-col-id="' + _esc(col.id) + '"><span class="ss-col-icon ' + iconClass + '">' + _esc(icon) + '</span><span class="ss-col-name">' + _esc(col.name) + '</span><span class="ss-fk-port" data-port-col="' + _esc(col.id) + '" title="' + _esc(_t('Kéo để tạo FK', 'Drag to create FK')) + '"></span></li>';
      }).join('') + (hiddenCount ? '<li class="ss-col-item ss-col-item-overflow"><span class="ss-col-icon">…</span><span class="ss-col-name">+' + String(hiddenCount) + ' ' + _esc(_t('cột khác', 'more columns')) + '</span></li>' : '') + '</ul>' : '',
      mode === 'standard' ? '<div class="ss-table-footer">' + _esc(hiddenCount ? (_t('Đang rút gọn để tăng hiệu năng', 'Reduced for performance')) : (_t('Đang hiển thị mức chuẩn', 'Standard detail'))) + '</div>' : ''
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
      if(ev.target.closest('.ss-fk-port') || ev.target.closest('.ss-icon-btn') || ev.target.closest('.ss-col-item[data-col-id]') || ev.target.closest('.ss-col-item-add')) return;
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
    Array.prototype.forEach.call(card.querySelectorAll('.ss-col-item[data-col-id]'), function(node){
      node.onclick = function(ev){
        ev.stopPropagation();
        Canvas.selectTable(tbl.id);
        Inspector.openColumn(tbl.id, node.getAttribute('data-col-id'));
      };
    });
    Array.prototype.forEach.call(card.querySelectorAll('.ss-fk-port'), function(port){
      port.onmousedown = function(ev){ Connector.startConnect(tbl.id, port.getAttribute('data-port-col'), ev); };
    });
  };

  SchemaLib.withSystemEntries = function(){
    return [liteSystemEntry()];
  };

  var originalRenderSelector = SchemaLib.renderSelector;
  SchemaLib.renderSelector = function(){
    var select = document.getElementById('ss-schema-select');
    if(!select){
      return originalRenderSelector ? originalRenderSelector.apply(this, arguments) : undefined;
    }
    select.setAttribute('aria-label', _t('Schema hệ thống đang dùng', 'Active system schema'));
    select.setAttribute('title', _t('HESEM System Registry đang được khóa để giảm tải giao diện', 'HESEM System Registry is locked to reduce UI load'));
    select.innerHTML = '<option value="' + LITE_SYSTEM_ONLY_ID + '">' + _esc(_t('HESEM System Registry [Hệ thống]', 'HESEM System Registry [System]')) + '</option>';
    select.value = LITE_SYSTEM_ONLY_ID;
    select.disabled = true;
  };

  var originalLoadList = SchemaLib.loadList;
  SchemaLib.loadList = function(){
    liteEnsureState();
    return Promise.resolve(originalLoadList ? originalLoadList.apply(this, arguments) : undefined).then(function(result){
      STORE.designs = [liteSystemEntry()];
      SchemaLib.renderSelector();
      if(STORE.currentDesignId !== LITE_SYSTEM_ONLY_ID || !STORE.schema || !((STORE.schema.tables || []).length)){
        return SchemaLib.loadSystemRegistry(true).then(function(){ return result; });
      }
      liteRefreshRelationLabels();
      return result;
    }).catch(function(err){
      STORE.designs = [liteSystemEntry()];
      SchemaLib.renderSelector();
      if(STORE.currentDesignId !== LITE_SYSTEM_ONLY_ID || !STORE.schema || !((STORE.schema.tables || []).length)){
        return SchemaLib.loadSystemRegistry(true);
      }
      throw err;
    });
  };

  SchemaLib.onSelectChange = function(){
    return SchemaLib.loadSystemRegistry(false);
  };

  SchemaLib.createNew = function(){
    toast(_t('Đã khóa chế độ tạo schema mới. Studio hiện chỉ dùng HESEM System Registry.', 'New schema creation is locked. This studio now works only with HESEM System Registry.'), 'info');
    return Promise.resolve();
  };

  SchemaLib.loadFromLiveDB = function(){
    toast(_t('Đã tắt nạp schema từ DB trong bản vá tối ưu giao diện này.', 'Loading schema from DB is disabled in this optimized UI patch.'), 'info');
    return Promise.resolve();
  };

  var originalLoadSystemRegistry = SchemaLib.loadSystemRegistry;
  SchemaLib.loadSystemRegistry = function(silent){
    liteEnsureState();
    liteEnsureStyles();
    return Promise.resolve(originalLoadSystemRegistry.call(this, true)).then(function(result){
      var draftRaw = loadDraft(LITE_SYSTEM_ONLY_ID);
      var draftDoc;
      if(draftRaw){
        try{
          draftDoc = JSON.parse(draftRaw);
        }catch(ignoreErr){
          draftDoc = null;
        }
      }
      if(draftDoc){
        STORE.schema = draftDoc;
        STORE.currentDesignId = LITE_SYSTEM_ONLY_ID;
        STORE.baseline = null;
        STORE.undo = [];
        STORE.redo = [];
        STORE.dirty = false;
        renderShell();
        Inspector.close();
        scheduleZoomToFit(120);
        liteRefreshRelationLabels();
        if(!silent){
          toast(_t('Đã nạp HESEM System Registry từ nháp cục bộ', 'Loaded HESEM System Registry from local draft'), 'success');
        }
        return result;
      }
      STORE.currentDesignId = LITE_SYSTEM_ONLY_ID;
      if(refs.toolbar) renderToolbar(refs.toolbar);
      liteRefreshRelationLabels();
      if(!silent){
        toast(_t('Đã nạp HESEM System Registry', 'Loaded HESEM System Registry'), 'success');
      }
      return result;
    });
  };

  SchemaLib.load = function(){
    return SchemaLib.loadSystemRegistry(false);
  };

  var originalSave = SchemaLib.save;
  SchemaLib.save = function(){
    if(STORE.currentDesignId === LITE_SYSTEM_ONLY_ID || (STORE.schema && STORE.schema._meta && STORE.schema._meta.source === 'system_registry')){
      saveDraft();
      STORE.dirty = false;
      if(refs.toolbar) renderToolbar(refs.toolbar);
      toast(_t('Đã lưu nháp cục bộ cho HESEM System Registry', 'Saved a local draft for HESEM System Registry'), 'success');
      return Promise.resolve({ localDraft:true });
    }
    return originalSave.apply(this, arguments);
  };

  var originalRenderToolbar = renderToolbar;
  renderToolbar = function(container){
    var right;
    var selector;
    var button;
    var note;
    liteEnsureState();
    liteEnsureStyles();
    originalRenderToolbar(container);
    if(!container) return;
    selector = container.querySelector('#ss-schema-select');
    if(selector){
      selector.disabled = true;
      selector.value = LITE_SYSTEM_ONLY_ID;
    }
    right = container.querySelector('.ss-toolbar-right');
    if(!right) return;
    note = right.querySelector('.ss-lite-toolbar-note');
    if(!note){
      note = document.createElement('span');
      note.className = 'ss-lite-toolbar-note';
      note.textContent = _t('Chế độ nhẹ • chỉ HESEM System Registry', 'Lite mode • HESEM System Registry only');
      right.insertBefore(note, right.firstChild || null);
    }
    button = right.querySelector('.ss-lite-toolbar-btn');
    if(!button){
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'hm-btn hm-btn-ghost ss-btn-sm ss-lite-toolbar-btn';
      button.innerHTML = '<span class="ss-lite-toolbar-dot"></span><span>' + _esc(_t('Tùy chọn', 'Options')) + '</span>';
      button.onclick = function(){ liteOpenOptions(); };
      right.insertBefore(button, right.firstChild || null);
    }
  };

  CmdPalette.COMMANDS = CmdPalette.COMMANDS.filter(function(cmd){
    return !(cmd && cmd.label_en === 'Load from DB');
  });
  CmdPalette.COMMANDS.push({
    icon:'⚙',
    label:'Tùy chọn hiển thị',
    label_en:'Display options',
    category:'view',
    action:function(){ liteOpenOptions(); }
  });

  var originalInit = init;
  init = function(page){
    var result;
    liteEnsureState();
    liteEnsureStyles();
    result = originalInit(page);
    if(STORE.currentDesignId && STORE.currentDesignId !== LITE_SYSTEM_ONLY_ID){
      SchemaLib.loadSystemRegistry(true);
    }
    if(window.SchemaStudio){
      window.SchemaStudio.openLiteOptions = liteOpenOptions;
      window.SchemaStudio.buildId = '20260408round13lite';
    }
    return result;
  };
})();

})(window);

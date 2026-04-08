/* ============================================================================
   HESEM MOM — HmRegistry v1.0
   Centralized Data Layer: Single source of truth for ALL modules.

   Mọi module, block engine, form engine, workflow engine đều đọc qua đây:
   - Status labels, colors, icons   → HmRegistry.status() / .badge()
   - Field definitions               → HmRegistry.fields()
   - Workflow states & transitions   → HmRegistry.workflow() / .canTransition()
   - Validation rules                → HmRegistry.validate()
   - Computed formulas               → HmRegistry.formula()
   - Roles & permissions             → HmRegistry.roles()
   - Domain field packs              → HmRegistry.packs()
   - Entity relations                → HmRegistry.relations()

   Load order: MUST be loaded BEFORE 00-block-engine.js
   Pattern: IIFE, ES5 strict, exposes window.HmRegistry
   ============================================================================ */
(function(){
'use strict';

/* ── Internal State ────────────────────────────────────────────────────── */
var _cache = {};          // { 'status-options': {...}, 'data-fields': {...}, ... }
var _pending = {};        // { 'status-options': { callbacks:[], loading:true }, ... }
var _listeners = [];      // [{ event:'loaded', callback:fn }, ...]
var _initialized = false;
var _initCallbacks = [];

var FALLBACK_COLOR = '#6b7280';
var FALLBACK_BADGE_STYLE = 'display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#fff;background:';

function _isObject(value){
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function _stripRegistryMeta(value){
  var out = {};
  Object.keys(value || {}).forEach(function(key){
    if(key === '_meta' || key === 'parts') return;
    out[key] = value[key];
  });
  return out;
}

function _statusMap(raw){
  var map = {};
  if(_isObject(raw && raw.statusSets)){
    Object.keys(raw.statusSets).forEach(function(key){
      if(_isObject(raw.statusSets[key]) && Array.isArray(raw.statusSets[key].options)) map[key] = raw.statusSets[key];
    });
  }
  Object.keys(raw || {}).forEach(function(key){
    if(key === '_meta' || key === 'statusSets') return;
    if(_isObject(raw[key]) && Array.isArray(raw[key].options)) map[key] = raw[key];
  });
  return map;
}

function _workflowMap(raw){
  return _isObject(raw && raw.workflows) ? raw.workflows : (raw || {});
}

function _tableMap(raw){
  return _isObject(raw && raw.tables) ? raw.tables : (raw || {});
}

function _formulaMap(raw){
  return _isObject(raw && raw.formulas) ? raw.formulas : (raw || {});
}

function _packMap(raw){
  return _isObject(raw && raw.packs) ? raw.packs : (raw || {});
}

function _relationList(raw){
  if(Array.isArray(raw)) return raw;
  return (raw && (raw.relations || raw.edges)) || [];
}

function _splitParts(data){
  return Array.isArray(data && data.parts) ? data.parts : (data && data._meta && Array.isArray(data._meta.parts) ? data._meta.parts : []);
}

function _isSplitRegistryIndex(data){
  return !!_splitParts(data).length;
}

function _mergeSplitRegistry(data, onSuccess, onError){
  var parts = _splitParts(data);
  if(!parts.length){
    if(onSuccess) onSuccess(data || {});
    return;
  }

  var merged = _stripRegistryMeta(data || {});
  var remaining = parts.length;

  function finalize(){
    remaining--;
    if(remaining <= 0 && onSuccess) onSuccess(merged);
  }

  parts.forEach(function(part){
    var file = String((part && part.file) || '').replace(/\.json$/i, '');
    if(!file){
      finalize();
      return;
    }
    _fetchJson(_paths(file), 0, function(payload){
      if(_isObject(payload)){
        Object.keys(payload).forEach(function(key){
          if(key === '_meta') return;
          merged[key] = payload[key];
        });
      }
      finalize();
    }, function(){
      if(onError && remaining === parts.length) onError();
      finalize();
    });
  });
}

/** Helper: bilingual label */
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? (en || vi) : vi;
}

/** Helper: HTML escape */
function _esc(v){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(v == null ? '' : String(v)));
  return d.innerHTML;
}

function _pushUnique(list, value){
  var text = String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
  if(!text || list.indexOf(text) >= 0) return;
  list.push(text);
}

function _optionObjects(list){
  return (list || []).map(function(opt){
    if(opt && typeof opt === 'object' && !Array.isArray(opt)){
      return {
        value: opt.value,
        label: opt.label != null ? opt.label : opt.value,
        labelEn: opt.labelEn != null ? opt.labelEn : (opt.label != null ? opt.label : opt.value),
        color: opt.color || '',
        icon: opt.icon || ''
      };
    }
    return { value: opt, label: opt, labelEn: opt, color: '', icon: '' };
  });
}

/* ── Registry File Paths ───────────────────────────────────────────────── */

/** Build array of fallback paths for a registry file */
function _paths(name){
  var base = 'data/registry/' + name + '.json';
  return [
    base,
    './' + base,
    '/' + base,
    'mom/' + base,
    './mom/' + base
  ];
}

/** Fetch JSON with path fallback */
function _fetchJson(paths, idx, onSuccess, onError){
  if(idx >= paths.length){
    if(onError) onError(new Error('Registry not found: ' + paths[0]));
    return;
  }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', paths[idx], true);
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status >= 200 && xhr.status < 300){
      try{
        var data = JSON.parse(xhr.responseText);
        if(onSuccess) onSuccess(data);
      }catch(e){
        _fetchJson(paths, idx + 1, onSuccess, onError);
      }
    } else {
      _fetchJson(paths, idx + 1, onSuccess, onError);
    }
  };
  xhr.send();
}

/** Try API endpoint first, fallback to direct file */
function _fetchRegistry(name, onSuccess, onError){
  // Try API first: api.php?action=registry_{name_with_underscores}
  var apiAction = 'registry_' + name.replace(/-/g, '_');
  var apiUrl = 'api.php?action=' + encodeURIComponent(apiAction);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', apiUrl, true);
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  if(typeof csrfToken !== 'undefined' && csrfToken){
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
  }
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status >= 200 && xhr.status < 300){
      try{
        var resp = JSON.parse(xhr.responseText);
        // RegistryController returns { ok:true, data:{...} }
        var data = (resp && resp.data) ? resp.data : resp;
        if(data && typeof data === 'object'){
          if(name === 'data-fields' && _isSplitRegistryIndex(data)){
            _mergeSplitRegistry(data, onSuccess, onError);
            return;
          }
          if(onSuccess) onSuccess(data);
          return;
        }
      }catch(e){}
    }
    // API failed → fallback to direct file fetch
    _fetchJson(_paths(name), 0, function(data){
      if(name === 'data-fields' && _isSplitRegistryIndex(data)){
        _mergeSplitRegistry(data, onSuccess, onError);
        return;
      }
      if(onSuccess) onSuccess(data);
    }, onError);
  };
  xhr.send();
}

/* ── Loading Engine ────────────────────────────────────────────────────── */

/** Load a registry file (with deduplication) */
function _load(name, callback){
  // Already cached → return immediately
  if(_cache[name]){
    if(callback) callback(_cache[name]);
    return;
  }

  // Already loading → queue callback
  if(_pending[name]){
    if(callback) _pending[name].callbacks.push(callback);
    return;
  }

  // Start loading
  _pending[name] = { callbacks: callback ? [callback] : [] };

  _fetchRegistry(name, function(data){
    _cache[name] = data || {};
    var cbs = _pending[name] ? _pending[name].callbacks : [];
    delete _pending[name];
    cbs.forEach(function(cb){ try{ cb(_cache[name]); }catch(e){} });
    _emit('loaded', { registry: name });
  }, function(){
    _cache[name] = {};
    var cbs = _pending[name] ? _pending[name].callbacks : [];
    delete _pending[name];
    cbs.forEach(function(cb){ try{ cb(_cache[name]); }catch(e){} });
  });
}

/** Ensure a registry is loaded, return data (sync if cached, trigger load if not) */
function _ensure(name){
  if(_cache[name]) return _cache[name];
  _load(name);
  return null;
}

/* ── Init ──────────────────────────────────────────────────────────────── */

/**
 * Initialize HmRegistry — eager load small critical files.
 * Call once at app startup. Safe to call multiple times.
 * @param {Function} [callback] — called when critical registries loaded
 */
function init(callback){
  if(_initialized){
    if(callback) callback();
    return;
  }
  if(callback) _initCallbacks.push(callback);
  if(_pending.__init__) return;
  _pending.__init__ = true;

  // Eager load 3 small critical registries
  var remaining = 3;
  function onDone(){
    remaining--;
    if(remaining <= 0){
      _initialized = true;
      delete _pending.__init__;
      var cbs = _initCallbacks.splice(0);
      cbs.forEach(function(cb){ try{ cb(); }catch(e){} });
      _emit('ready', {});
    }
  }

  _load('status-options', onDone);
  _load('field-types', onDone);
  _load('computed-formulas', onDone);
}

/* ── Event System ──────────────────────────────────────────────────────── */

function _emit(event, detail){
  _listeners.forEach(function(l){
    if(l.event === event || l.event === '*'){
      try{ l.callback(detail); }catch(e){}
    }
  });
}

function on(event, callback){
  _listeners.push({ event: event, callback: callback });
}

function off(event, callback){
  _listeners = _listeners.filter(function(l){
    return !(l.event === event && l.callback === callback);
  });
}

/* ── STATUS API ────────────────────────────────────────────────────────── */

/**
 * Get status metadata for a specific value in a status set.
 * @param {string} setKey - e.g. 'ncr_status', 'so_status'
 * @param {string} value  - e.g. 'draft', 'open', 'approved'
 * @returns {{ label:string, labelEn:string, color:string, icon:string, value:string }}
 */
function status(setKey, value){
  var opts = _statusMap(_cache['status-options']);
  if(!opts) opts = _ensure('status-options');
  opts = _statusMap(opts);
  if(!opts || !opts[setKey] || !opts[setKey].options) {
    return { value: value, label: value, labelEn: value, color: FALLBACK_COLOR, icon: '' };
  }
  var set = opts[setKey].options;
  for(var i = 0; i < set.length; i++){
    if(set[i].value === value) return set[i];
  }
  return { value: value, label: value, labelEn: value, color: FALLBACK_COLOR, icon: '' };
}

/**
 * Get all options for a status set.
 * @param {string} setKey
 * @returns {Array<{value,label,labelEn,color,icon}>}
 */
function statusSet(setKey){
  var opts = _statusMap(_cache['status-options']);
  if(!opts) opts = _ensure('status-options');
  opts = _statusMap(opts);
  if(!opts || !opts[setKey]) return [];
  return opts[setKey].options || [];
}

/**
 * Get all status set keys.
 * @returns {Array<string>}
 */
function statusSetKeys(){
  var opts = _statusMap(_cache['status-options']);
  if(!opts) opts = _ensure('status-options');
  opts = _statusMap(opts);
  if(!opts) return [];
  return Object.keys(opts);
}

/**
 * Render a status badge HTML.
 * Replaces ALL hardcoded statusBadge() functions across 13+ files.
 * @param {string} setKey - e.g. 'so_status'
 * @param {string} value  - e.g. 'draft'
 * @returns {string} HTML string
 */
function badge(setKey, value){
  var s = status(setKey, value);
  var label = _t(s.label, s.labelEn);
  var color = s.color || FALLBACK_COLOR;
  return '<span style="' + FALLBACK_BADGE_STYLE + _esc(color) + '">' + _esc(label) + '</span>';
}

/* ── FIELD API ─────────────────────────────────────────────────────────── */

/**
 * Get field definitions for an API endpoint.
 * LAZY: triggers load of data-fields.json on first call.
 * @param {string} endpoint - e.g. 'quality.ncr.list'
 * @returns {Array|null} - null if not yet loaded
 */
function fields(endpoint){
  var df = _cache['data-fields'];
  if(!df){
    _load('data-fields');
    return null;
  }
  // data-fields.json structure: { "action_key": [ { key, label, ... }, ... ] }
  return df[endpoint] || null;
}

/**
 * Get a single field definition.
 * @param {string} endpoint
 * @param {string} fieldKey
 * @returns {Object|null}
 */
function field(endpoint, fieldKey){
  var list = fields(endpoint);
  if(!list) return null;
  for(var i = 0; i < list.length; i++){
    if(list[i].key === fieldKey) return list[i];
  }
  return null;
}

/**
 * Get bilingual label for a field.
 * @param {string} endpoint
 * @param {string} fieldKey
 * @returns {string}
 */
function fieldLabel(endpoint, fieldKey){
  var f = field(endpoint, fieldKey);
  if(!f) return fieldKey;
  return _t(f.label, f.labelEn);
}

/**
 * Get all field types.
 * @returns {Object} - keyed by type name
 */
function fieldTypes(){
  return _cache['field-types'] || _ensure('field-types') || {};
}

/**
 * Get table registry metadata for a database table.
 * @param {string} tableName
 * @returns {Object|null}
 */
function table(tableName){
  var tables = _tableMap(_cache['table-registry']);
  if(!tables){
    tables = _ensure('table-registry');
  }
  tables = _tableMap(tables);
  if(!tables || !tableName) return null;
  return tables[tableName] || null;
}

/**
 * Get column metadata from table-registry.
 * @param {string} tableName
 * @param {string} columnName
 * @returns {Object|null}
 */
function column(tableName, columnName){
  var t = table(tableName);
  if(!t || !t.columns || !columnName) return null;
  return t.columns[columnName] || null;
}

/**
 * Alias for generic enum / option sets stored in status-options.json.
 * @param {string} setKey
 * @returns {Array<{value,label,labelEn,color,icon}>}
 */
function optionSet(setKey){
  return statusSet(setKey);
}

/**
 * Get all enum / option set keys.
 * @returns {Array<string>}
 */
function optionSetKeys(){
  return statusSetKeys();
}

/**
 * Resolve dropdown options from the single registry source.
 * Supports field-level keys, table/column metadata, and explicit optionSet/statusSet references.
 * @param {Object} meta
 * @returns {Array<{value,label,labelEn,color,icon}>}
 */
function selectOptions(meta){
  var fieldMeta = meta && meta.field ? meta.field : (meta || {});
  var tableName = meta && meta.table ? meta.table : (fieldMeta.table || fieldMeta.dbTable || '');
  var fieldKey = meta && meta.fieldKey ? meta.fieldKey : (fieldMeta.fieldKey || fieldMeta.dbColumn || fieldMeta.column || fieldMeta.key || '');
  var colMeta = null;
  var tableMeta = null;
  var keys = [];
  var options = [];

  _pushUnique(keys, meta && meta.optionSet);
  _pushUnique(keys, meta && meta.statusSet);
  _pushUnique(keys, fieldMeta.optionSet);
  _pushUnique(keys, fieldMeta.statusSet);
  _pushUnique(keys, fieldMeta.registryKey);
  _pushUnique(keys, fieldMeta.enumRef);
  _pushUnique(keys, fieldMeta.constraints && fieldMeta.constraints.enumRef);

  if(tableName && fieldKey){
    tableMeta = table(tableName);
    colMeta = column(tableName, fieldKey);
    if(colMeta){
      _pushUnique(keys, colMeta.optionSet);
      _pushUnique(keys, colMeta.statusSet);
      _pushUnique(keys, colMeta.enumRef);
      if(colMeta.uiType === 'reference' || colMeta.references) return [];
    }
    if(tableMeta && tableMeta.statusColumn === fieldKey){
      _pushUnique(keys, tableMeta.statusSet);
    }
    _pushUnique(keys, tableName + '_' + fieldKey);
    _pushUnique(keys, tableName + '_' + fieldKey + '_set');
  }

  if(fieldKey){
    _pushUnique(keys, fieldKey);
    _pushUnique(keys, fieldKey + '_status');
    _pushUnique(keys, fieldKey + '_set');
  }

  keys.some(function(key){
    options = statusSet(key);
    return !!(options && options.length);
  });
  if(options && options.length) return _optionObjects(options);

  if(Array.isArray(fieldMeta.options) && fieldMeta.options.length){
    return _optionObjects(fieldMeta.options);
  }
  return [];
}

/* ── WORKFLOW API ──────────────────────────────────────────────────────── */

/**
 * Get workflow definition for an entity type.
 * LAZY: triggers load of workflow-library.json on first call.
 * @param {string} entityType - e.g. 'ncr', 'capa', 'doc'
 * @returns {Object|null} - { states, transitions, guards, sla, digitalThread }
 */
function workflow(entityType){
  var wf = _workflowMap(_cache['workflow-library']);
  if(!wf){
    _load('workflow-library');
    return null;
  }
  wf = _workflowMap(wf);
  // Support both keyed by ID and by entity name
  var key = entityType.toLowerCase();
  if(wf[key]) return wf[key];
  // Try prefixed: 'wf_ncr'
  if(wf['wf_' + key]) return wf['wf_' + key];
  // Search by entity field
  var keys = Object.keys(wf);
  for(var i = 0; i < keys.length; i++){
    var w = wf[keys[i]];
    if(w && w.entity === key) return w;
  }
  return null;
}

/**
 * Check if a transition is allowed.
 * @param {string} entityType
 * @param {string} fromState
 * @param {string} toState
 * @param {Array<string>} userRoles
 * @returns {{ allowed:boolean, reason:string }}
 */
function canTransition(entityType, fromState, toState, userRoles){
  var wf = workflow(entityType);
  if(!wf || !wf.transitions) return { allowed: false, reason: 'Workflow chưa tải' };

  var trans = null;
  var transitions = wf.transitions;

  // Support array format: [{ from, to, guards, ... }]
  if(Array.isArray(transitions)){
    for(var i = 0; i < transitions.length; i++){
      if(transitions[i].from === fromState && transitions[i].to === toState){
        trans = transitions[i];
        break;
      }
    }
  }
  // Support object format: { from_state: { to_state: {...} } }
  else if(transitions[fromState] && transitions[fromState][toState]){
    trans = transitions[fromState][toState];
  }

  if(!trans) return { allowed: false, reason: 'Chuyển trạng thái không hợp lệ: ' + fromState + ' → ' + toState };

  // Check role guards
  var guards = trans.guards || [];
  for(var g = 0; g < guards.length; g++){
    var guard = guards[g];
    if(guard.type === 'role' && guard.roles && userRoles){
      var hasRole = false;
      for(var r = 0; r < guard.roles.length; r++){
        if(userRoles.indexOf(guard.roles[r]) >= 0){ hasRole = true; break; }
      }
      if(!hasRole){
        return { allowed: false, reason: 'Cần vai trò: ' + guard.roles.join(', ') };
      }
    }
  }

  return { allowed: true, reason: '' };
}

/**
 * Get available transitions from a state.
 * @param {string} entityType
 * @param {string} fromState
 * @param {Array<string>} [userRoles]
 * @returns {Array<{to,label,labelEn,guards}>}
 */
function availableTransitions(entityType, fromState, userRoles){
  var wf = workflow(entityType);
  if(!wf || !wf.transitions) return [];

  var result = [];
  var transitions = wf.transitions;

  if(Array.isArray(transitions)){
    transitions.forEach(function(t){
      if(t.from === fromState){
        var check = canTransition(entityType, fromState, t.to, userRoles);
        result.push({
          to: t.to,
          label: t.label || t.to,
          labelEn: t.labelEn || t.label || t.to,
          allowed: check.allowed,
          reason: check.reason,
          guards: t.guards || []
        });
      }
    });
  } else if(transitions[fromState]){
    Object.keys(transitions[fromState]).forEach(function(toState){
      var t = transitions[fromState][toState];
      var check = canTransition(entityType, fromState, toState, userRoles);
      result.push({
        to: toState,
        label: t.label || toState,
        labelEn: t.labelEn || t.label || toState,
        allowed: check.allowed,
        reason: check.reason,
        guards: t.guards || []
      });
    });
  }

  return result;
}

/* ── VALIDATION API ────────────────────────────────────────────────────── */

/**
 * Validate a field value against registry rules.
 * LAZY: triggers load of validation-rules.json on first call.
 * @param {string} entity - e.g. 'ncr', 'capa'
 * @param {string} fieldKey - e.g. 'description'
 * @param {*} value
 * @returns {{ valid:boolean, message:string, messageEn:string, severity:string }}
 */
function validate(entity, fieldKey, value){
  var rules = _cache['validation-rules'];
  if(!rules){
    _load('validation-rules');
    return { valid: true, message: '', messageEn: '', severity: 'info' };
  }

  var ok = { valid: true, message: '', messageEn: '', severity: 'info' };

  // Support array format: [{ ruleId, entity, field, type, params, message, ... }]
  var ruleList = Array.isArray(rules) ? rules : (rules.rules || []);

  for(var i = 0; i < ruleList.length; i++){
    var rule = ruleList[i];
    if(rule.entity !== entity || rule.field !== fieldKey) continue;

    var fail = false;
    var p = rule.params || {};

    switch(rule.type){
      case 'required':
        if(value == null || value === '' || (Array.isArray(value) && !value.length)) fail = true;
        break;
      case 'minLength':
        if(typeof value === 'string' && value.length < (p.min || 0)) fail = true;
        break;
      case 'maxLength':
        if(typeof value === 'string' && value.length > (p.max || Infinity)) fail = true;
        break;
      case 'range':
        var num = Number(value);
        if(isNaN(num) || num < (p.min || -Infinity) || num > (p.max || Infinity)) fail = true;
        break;
      case 'pattern':
        if(p.regex && typeof value === 'string'){
          try{ if(!new RegExp(p.regex).test(value)) fail = true; }catch(e){}
        }
        break;
      case 'enum':
        if(p.values && p.values.indexOf(value) < 0) fail = true;
        break;
    }

    if(fail){
      return {
        valid: false,
        message: rule.message || ('Trường ' + fieldKey + ' không hợp lệ'),
        messageEn: rule.messageEn || ('Field ' + fieldKey + ' is invalid'),
        severity: rule.severity || 'error'
      };
    }
  }

  return ok;
}

/* ── FORMULA API ───────────────────────────────────────────────────────── */

/**
 * Get formula definition.
 * @param {string} formulaId - e.g. 'f_oee', 'f_copq'
 * @returns {Object|null}
 */
function formula(formulaId){
  var formulas = _formulaMap(_cache['computed-formulas']);
  if(!formulas) formulas = _ensure('computed-formulas');
  formulas = _formulaMap(formulas);
  if(!formulas) return null;

  // Support array format
  if(Array.isArray(formulas)){
    for(var i = 0; i < formulas.length; i++){
      if(formulas[i].formulaId === formulaId || formulas[i].id === formulaId) return formulas[i];
    }
    return null;
  }
  // Support object format (keyed by ID)
  return formulas[formulaId] || null;
}

/**
 * Get all formulas, optionally filtered by category.
 * @param {string} [category] - e.g. 'manufacturing', 'quality'
 * @returns {Array}
 */
function formulas(category){
  var f = _formulaMap(_cache['computed-formulas']);
  if(!f) f = _ensure('computed-formulas');
  f = _formulaMap(f);
  if(!f) return [];

  var list = Array.isArray(f) ? f : Object.keys(f).filter(function(k){ return k !== '_meta'; }).map(function(k){ return f[k]; });

  if(category){
    return list.filter(function(item){ return item.category === category; });
  }
  return list;
}

/* ── ROLES API ─────────────────────────────────────────────────────────── */

/**
 * Get roles object.
 * Falls back to globally defined ROLES (from 01-data-config.js) if registry not available.
 * @returns {Object} - keyed by role key
 */
function roles(){
  // Future: load from data/registry/roles.json
  // For now: delegate to the existing global ROLES
  if(typeof ROLES !== 'undefined') return ROLES;
  return {};
}

/**
 * Get a single role definition.
 * @param {string} roleKey
 * @returns {Object|null}
 */
function role(roleKey){
  var r = roles();
  return r[roleKey] || null;
}

/* ── DOMAIN PACKS API ──────────────────────────────────────────────────── */

/**
 * Get domain field packs for a module.
 * LAZY: triggers load.
 * @param {string} [module] - e.g. 'quality', 'manufacturing'
 * @returns {Array|null}
 */
function packs(module){
  var p = _packMap(_cache['domain-field-packs']);
  if(!p){
    _load('domain-field-packs');
    return null;
  }
  p = _packMap(p);

  // Support array or object format
  var list = Array.isArray(p) ? p : Object.keys(p).filter(function(k){ return k !== '_meta'; }).map(function(key){
    var fields = p[key];
    var first = Array.isArray(fields) && fields.length ? fields[0] : {};
    return {
      packId: key,
      module: first.module || first.domain || '',
      table: first.dbTable || '',
      packType: (String(key).split('_').slice(-1)[0] || '').toLowerCase(),
      fields: Array.isArray(fields) ? fields : []
    };
  });

  if(module){
    return list.filter(function(pack){ return pack.module === module; });
  }
  return list;
}

/* ── RELATIONS API ─────────────────────────────────────────────────────── */

/**
 * Get entity relations.
 * LAZY: triggers load.
 * @param {string} [entity] - filter by entity name
 * @returns {Array|null}
 */
function relations(entity){
  var r = _relationList(_cache['relation-map']);
  if(!r){
    _load('relation-map');
    return null;
  }

  var list = _relationList(r);

  if(entity){
    return list.filter(function(rel){
      return (rel.from && rel.from.entity === entity) || (rel.to && rel.to.entity === entity);
    });
  }
  return list;
}

/* ── CACHE MANAGEMENT ──────────────────────────────────────────────────── */

/**
 * Flush cache for a specific registry or all.
 * @param {string} [registryName] - if omitted, flush all
 */
function flush(registryName){
  if(registryName){
    delete _cache[registryName];
  } else {
    _cache = {};
    _initialized = false;
  }
  _emit('change', { registry: registryName || '*' });
}

/**
 * Check if a registry is loaded.
 * @param {string} name
 * @returns {boolean}
 */
function isLoaded(name){
  return !!_cache[name];
}

/**
 * Check if HmRegistry is initialized (critical registries loaded).
 * @returns {boolean}
 */
function isReady(){
  return _initialized;
}

/**
 * Get raw cache for a registry (used by Module Builder for backward compat).
 * @param {string} name
 * @returns {Object|null}
 */
function raw(name){
  return _cache[name] || null;
}

/**
 * Preload a registry (non-blocking).
 * @param {string} name
 * @param {Function} [callback]
 */
function preload(name, callback){
  _load(name, callback);
}

/* ── EXPOSE ────────────────────────────────────────────────────────────── */

window.HmRegistry = {
  // Lifecycle
  init: init,
  isReady: isReady,
  isLoaded: isLoaded,
  flush: flush,
  preload: preload,
  raw: raw,

  // Status
  status: status,
  statusSet: statusSet,
  statusSetKeys: statusSetKeys,
  badge: badge,

  // Fields
  fields: fields,
  field: field,
  fieldLabel: fieldLabel,
  fieldTypes: fieldTypes,
  table: table,
  column: column,
  optionSet: optionSet,
  optionSetKeys: optionSetKeys,
  selectOptions: selectOptions,

  // Workflow
  workflow: workflow,
  canTransition: canTransition,
  availableTransitions: availableTransitions,

  // Validation
  validate: validate,

  // Formulas
  formula: formula,
  formulas: formulas,

  // Roles
  roles: roles,
  role: role,

  // Domain Packs
  packs: packs,

  // Relations
  relations: relations,

  // Events
  on: on,
  off: off
};

})();

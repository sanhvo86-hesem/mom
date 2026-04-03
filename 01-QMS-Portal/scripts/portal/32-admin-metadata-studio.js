(function(){
'use strict';

var STYLE_ID = 'admin-metadata-studio-style';

var state = {
  container: null,
  bound: false,
  boundContainer: null,
  loading: false,
  loaded: false,
  error: '',
  detailLoading: false,
  detailError: '',
  saveLoading: false,
  subTab: 'overview',
  summary: null,
  apiSearch: '',
  tableSearch: '',
  schemaSearch: '',
  variableSearch: '',
  fieldSearch: '',
  selectedApi: '',
  selectedTable: '',
  selectedSchema: '',
  selectedVariable: '',
  apiEditor: null,
  tableEditor: null,
  schemaEditor: null,
  variableEditor: null
};

function T(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function esc(v){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(v == null ? '' : v)));
  return d.innerHTML;
}

function clone(obj){
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

function slugify(value, separator){
  separator = separator || '_';
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, separator)
    .replace(new RegExp('\\' + separator + '+', 'g'), separator)
    .replace(new RegExp('^\\' + separator + '+|\\' + separator + '+$', 'g'), '');
}

function splitLines(value){
  return String(value || '')
    .split(/\r?\n|,/)
    .map(function(item){ return item.trim(); })
    .filter(Boolean);
}

function stringifyLines(list){
  return Array.isArray(list) ? list.join('\n') : '';
}

function ensureArray(list){
  return Array.isArray(list) ? list : [];
}

function endpointOptions(){
  return (((state.summary || {}).lists || {}).apis || []);
}

function tableOptions(){
  return (((state.summary || {}).lists || {}).tables || []);
}

function schemaOptions(){
  return (((state.summary || {}).lists || {}).schemas || []);
}

function variableOptions(){
  return (((state.summary || {}).lists || {}).variables || []);
}

function apiRequestDefaults(){
  return { query_params: [], body_fields: [], required_body_fields: [] };
}

function apiResponseDefaults(){
  return { collection_key: '', response_fields: [], paginated: false };
}

function blankApiEditor(){
  return {
    key: '',
    item: {
      action: '',
      label: '',
      labelEn: '',
      module: 'Platform',
      moduleEn: 'Platform',
      method: 'GET',
      kind: 'list',
      domain: '',
      entity: '',
      source: 'admin_metadata_studio',
      primary_key: '',
      field_count: 0,
      security: {
        auth_required: true,
        csrf_required: false,
        admin_only: false,
        dynamic_permission: true,
        permission_keys: []
      },
      request: apiRequestDefaults(),
      response: apiResponseDefaults()
    },
    apiParams: {
      method: 'GET',
      module: 'Platform',
      description: '',
      descriptionEn: '',
      params: [],
      response: { type: 'object', fields: [], pagination: false }
    },
    fields: []
  };
}

function blankTableEditor(){
  return {
    key: '',
    item: {
      domain: '',
      migration: '',
      label: '',
      labelEn: '',
      description: '',
      primaryKey: [],
      statusColumn: '',
      statusSet: '',
      workflowId: '',
      supportTable: false,
      columns: {}
    },
    columnsList: []
  };
}

function blankSchemaEditor(){
  return {
    key: '',
    item: { description: '', tables: [], migrations: [] }
  };
}

function blankVariableEditor(){
  return {
    key: '',
    item: { label: '', label_vi: '', description: '', variables: {} },
    variablesList: []
  };
}

function api(action, payload, method){
  if(typeof apiCall === 'function'){
    return apiCall(action, payload || {}, method || 'GET', 30000);
  }
  var reqMethod = method || 'GET';
  if(reqMethod === 'GET'){
    var qs = Object.keys(payload || {}).map(function(key){
      return encodeURIComponent(key) + '=' + encodeURIComponent(payload[key]);
    }).join('&');
    return fetch('api.php?action=' + encodeURIComponent(action) + (qs ? '&' + qs : ''), {
      credentials: 'include'
    }).then(function(r){ return r.json(); });
  }
  return fetch('api.php?action=' + encodeURIComponent(action), {
    method: reqMethod,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
    },
    body: JSON.stringify(payload || {})
  }).then(function(r){ return r.json(); });
}

function ensureStyles(){
  if(document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = [
    '.ams{display:grid;gap:18px}',
    '.ams-topbar{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.8fr);gap:16px;align-items:stretch}',
    '.ams-hero,.ams-sidecard,.ams-list,.ams-editor,.ams-overview-card,.ams-benchmark{background:#fff;border:1px solid #dbe4f0;border-radius:22px;box-shadow:0 16px 40px rgba(15,23,42,.04)}',
    '.ams-hero{padding:24px;background:linear-gradient(140deg,#fffef6 0%,#f7fbff 52%,#eef2ff 100%)}',
    '.ams-kicker{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#9a3412}',
    '.ams-hero h3{margin:10px 0 8px;font-size:28px;line-height:1.08;color:#102a43}',
    '.ams-hero p,.ams-editor-title p,.ams-sidecard p,.ams-help,.ams-principle p{margin:0;color:#52667a;line-height:1.6;font-size:13px}',
    '.ams-sidecard{padding:18px 20px;display:grid;gap:12px}',
    '.ams-sidecard h4,.ams-list h4,.ams-editor h4,.ams-benchmark h4{margin:0;color:#102a43}',
    '.ams-pillrow,.ams-subtabs,.ams-actions,.ams-inline-actions,.ams-focus-list,.ams-item-meta{display:flex;flex-wrap:wrap;gap:8px}',
    '.ams-pill,.ams-tag,.ams-focus{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700}',
    '.ams-pill{background:#eef4ff;color:#1d4ed8}',
    '.ams-tag,.ams-focus{background:#f8fafc;color:#475569}',
    '.ams-tag.method-get{background:#dcfce7;color:#166534}.ams-tag.method-post{background:#dbeafe;color:#1d4ed8}.ams-tag.method-put,.ams-tag.method-patch{background:#fef3c7;color:#92400e}.ams-tag.method-delete{background:#fee2e2;color:#b91c1c}',
    '.ams-subtab,.ams-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;transition:.16s;text-decoration:none;border:none}',
    '.ams-subtab{border:1px solid #dbe4f0;background:#fff;color:#334e68;border-radius:999px}',
    '.ams-subtab.active{background:#102a43;border-color:#102a43;color:#fff;box-shadow:0 14px 28px rgba(16,42,67,.16)}',
    '.ams-btn-primary{background:#102a43;color:#fff;box-shadow:0 16px 32px rgba(16,42,67,.18)}.ams-btn-secondary{background:#eef2ff;color:#1e3a8a}.ams-btn-ghost{background:#fff;color:#475569;border:1px solid #dbe4f0}.ams-btn-danger{background:#fef2f2;color:#991b1b}',
    '.ams-metrics,.ams-overview-grid,.ams-principles,.ams-grid,.ams-workspace,.ams-kv{display:grid;gap:12px}',
    '.ams-metrics{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}.ams-overview-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.ams-principles{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.ams-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.ams-workspace{grid-template-columns:320px minmax(0,1fr);gap:16px;align-items:start}.ams-kv{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}',
    '.ams-overview-card,.ams-benchmark,.ams-principle,.ams-kv-card,.ams-section{padding:16px 18px}',
    '.ams-overview-card .label,.ams-kv-card .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-weight:800}',
    '.ams-overview-card .value{margin-top:8px;font-size:28px;font-weight:800;color:#102a43}.ams-overview-card .sub{margin-top:6px;font-size:12px;color:#64748b}',
    '.ams-principle,.ams-kv-card,.ams-section{border:1px solid #dbe4f0;border-radius:18px;background:#fff}.ams-section{background:#f8fafc}.ams-kv-card .v{margin-top:7px;font-size:17px;font-weight:800;color:#102a43;word-break:break-word}',
    '.ams-list{padding:14px;display:grid;gap:12px;position:sticky;top:12px}.ams-editor{padding:18px 20px;display:grid;gap:16px;min-height:520px}.ams-list-head,.ams-section-head,.ams-editor-top,.ams-item-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}',
    '.ams-search,.ams-input,.ams-select,.ams-textarea{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:14px;font-size:13px;background:#fff;color:#102a43;font-family:inherit}.ams-search{background:#f8fafc}.ams-textarea{min-height:94px;resize:vertical;line-height:1.55}',
    '.ams-catalog{display:grid;gap:8px;max-height:72vh;overflow:auto;padding-right:4px}.ams-item{padding:12px 14px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:grid;gap:6px;transition:.16s;text-align:left}.ams-item.active{background:#eff6ff;border-color:#3b82f6}',
    '.ams-item-title{font-size:13px;font-weight:800;color:#102a43}.ams-note,.ams-error,.ams-empty,.ams-loading{padding:12px 14px;border-radius:16px;font-size:13px;line-height:1.6}.ams-note{background:#fff7ed;border:1px solid #fdba74;color:#9a3412}.ams-error{background:#fff1f2;border:1px solid #fda4af;color:#9f1239}.ams-empty{display:grid;place-items:center;min-height:260px;border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;text-align:center}.ams-loading{display:grid;place-items:center;min-height:220px;color:#52667a}',
    '.ams-field{display:grid;gap:6px}.ams-field label,.ams-check{font-size:12px;color:#334155;font-weight:700}.ams-check{display:flex;align-items:center;gap:8px}.ams-check input{width:16px;height:16px}',
    '.ams-table-wrap{overflow:auto;border-radius:16px;border:1px solid #dbe4f0;background:#fff}.ams-table{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}.ams-table th{padding:10px 12px;background:#f8fafc;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-size:10px;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:bottom}.ams-table td{padding:10px 12px;border-bottom:1px solid #eef2f7;vertical-align:top}.ams-table td .ams-input,.ams-table td .ams-select,.ams-table td .ams-textarea{font-size:12px;padding:8px 9px;border-radius:12px}',
    '.ams-link,.ams-benchmark a{color:#0f62fe;text-decoration:none;font-weight:700}.ams-benchmark a:hover,.ams-link:hover{text-decoration:underline}',
    '@media (max-width:1200px){.ams-topbar{grid-template-columns:1fr}.ams-workspace{grid-template-columns:1fr}.ams-list{position:static}}',
    '@media (max-width:768px){.ams-hero h3{font-size:24px}.ams-editor{padding:16px}.ams-list{padding:12px}.ams-table{min-width:680px}}'
  ].join('\n');
  document.head.appendChild(s);
}

function getValue(selector){
  var el = state.container ? state.container.querySelector(selector) : null;
  return el ? el.value : '';
}

function getChecked(selector){
  var el = state.container ? state.container.querySelector(selector) : null;
  return !!(el && el.checked);
}

function collectRows(selector, currentRows, fields){
  var rows = state.container ? state.container.querySelectorAll(selector) : [];
  var out = [];
  Array.prototype.forEach.call(rows, function(row, index){
    var base = clone((currentRows || [])[index] || {});
    fields.forEach(function(field){
      var el = row.querySelector('[data-col="' + field.key + '"]');
      if(!el) return;
      base[field.key] = field.type === 'checkbox' ? !!el.checked : el.value;
    });
    if(base.key || base.label || base.labelEn || base.description || base.dbColumn || base.type){
      out.push(base);
    }
  });
  return out;
}

function bind(){
  if(!state.container) return;
  if(state.boundContainer === state.container) return;
  state.bound = true;
  state.boundContainer = state.container;

  state.container.addEventListener('click', function(e){
    var target = e.target.closest('[data-ams-action]');
    if(!target) return;
    var action = target.getAttribute('data-ams-action');

    if(action === 'refresh-summary'){
      loadSummary(true);
      return;
    }

    if(action === 'switch-subtab'){
      captureVisibleEditor();
      state.subTab = target.getAttribute('data-tab') || 'overview';
      state.detailError = '';
      paint();
      ensureDefaultSelection();
      return;
    }

    if(action === 'select-api'){ captureVisibleEditor(); loadApiDetail(target.getAttribute('data-key') || ''); return; }
    if(action === 'new-api'){ captureVisibleEditor(); state.selectedApi=''; state.apiEditor=blankApiEditor(); state.subTab='apis'; paint(); return; }
    if(action === 'save-api'){ saveApi(); return; }
    if(action === 'add-param-row'){
      captureApiEditor();
      if(!state.apiEditor) state.apiEditor = blankApiEditor();
      state.apiEditor.apiParams.params.push({ key:'', type:'string', required:false, description:'' });
      paint();
      return;
    }
    if(action === 'remove-param-row'){
      captureApiEditor();
      if(state.apiEditor && Array.isArray(state.apiEditor.apiParams.params)){
        state.apiEditor.apiParams.params.splice(Number(target.getAttribute('data-index') || 0), 1);
        paint();
      }
      return;
    }
    if(action === 'add-field-row'){
      captureApiEditor();
      if(!state.apiEditor) state.apiEditor = blankApiEditor();
      state.apiEditor.fields.push({
        key:'', label:'', labelEn:'', type:'string', required:false, dbTable:'', dbColumn:'', description:''
      });
      state.subTab = 'fields';
      paint();
      return;
    }
    if(action === 'remove-field-row'){
      captureApiEditor();
      if(state.apiEditor && Array.isArray(state.apiEditor.fields)){
        state.apiEditor.fields.splice(Number(target.getAttribute('data-index') || 0), 1);
        paint();
      }
      return;
    }

    if(action === 'select-table'){ captureVisibleEditor(); loadTableDetail(target.getAttribute('data-key') || ''); return; }
    if(action === 'new-table'){ captureVisibleEditor(); state.selectedTable=''; state.tableEditor=blankTableEditor(); state.subTab='tables'; paint(); return; }
    if(action === 'save-table'){ saveTable(); return; }
    if(action === 'add-column-row'){
      captureTableEditor();
      if(!state.tableEditor) state.tableEditor = blankTableEditor();
      state.tableEditor.columnsList.push({
        key:'', type:'VARCHAR(255)', label:'', labelEn:'', required:false, pk:false, unique:false, generated:false, default:null, uiType:'string', references:'', description:''
      });
      paint();
      return;
    }
    if(action === 'remove-column-row'){
      captureTableEditor();
      if(state.tableEditor && Array.isArray(state.tableEditor.columnsList)){
        state.tableEditor.columnsList.splice(Number(target.getAttribute('data-index') || 0), 1);
        paint();
      }
      return;
    }

    if(action === 'select-schema'){ captureVisibleEditor(); loadSchemaDetail(target.getAttribute('data-key') || ''); return; }
    if(action === 'new-schema'){ captureVisibleEditor(); state.selectedSchema=''; state.schemaEditor=blankSchemaEditor(); state.subTab='schemas'; paint(); return; }
    if(action === 'save-schema'){ saveSchema(); return; }

    if(action === 'select-variable'){ captureVisibleEditor(); loadVariableDetail(target.getAttribute('data-key') || ''); return; }
    if(action === 'new-variable'){ captureVisibleEditor(); state.selectedVariable=''; state.variableEditor=blankVariableEditor(); state.subTab='variables'; paint(); return; }
    if(action === 'save-variable'){ saveVariable(); return; }
    if(action === 'add-variable-row'){
      captureVariableEditor();
      if(!state.variableEditor) state.variableEditor = blankVariableEditor();
      state.variableEditor.variablesList.push({
        key:'', label:'', label_vi:'', type:'string', required:false, source:'', example:'', validation:'', description:''
      });
      paint();
      return;
    }
    if(action === 'remove-variable-row'){
      captureVariableEditor();
      if(state.variableEditor && Array.isArray(state.variableEditor.variablesList)){
        state.variableEditor.variablesList.splice(Number(target.getAttribute('data-index') || 0), 1);
        paint();
      }
    }
  });

  state.container.addEventListener('input', function(e){
    var searchType = e.target.getAttribute('data-ams-search');
    if(!searchType) return;
    var value = e.target.value || '';
    if(searchType === 'apis') state.apiSearch = value;
    if(searchType === 'tables') state.tableSearch = value;
    if(searchType === 'schemas') state.schemaSearch = value;
    if(searchType === 'variables') state.variableSearch = value;
    if(searchType === 'fields') state.fieldSearch = value;
    applyFilter(searchType, value);
  });
}

function applyFilter(type, query){
  if(!state.container) return;
  var rows = state.container.querySelectorAll('[data-ams-list="' + type + '"] [data-ams-row]');
  var q = String(query || '').trim().toLowerCase();
  Array.prototype.forEach.call(rows, function(row){
    var hay = (row.getAttribute('data-search') || '').toLowerCase();
    row.style.display = !q || hay.indexOf(q) >= 0 ? '' : 'none';
  });
}

function loadSummary(force){
  if(state.loading) return Promise.resolve();
  if(state.loaded && !force){
    ensureDefaultSelection();
    return Promise.resolve();
  }
  state.loading = true;
  state.error = '';
  paint();
  return api('admin_metadata_studio_summary', null, 'GET').then(function(resp){
    state.loading = false;
    if(!resp || resp.ok === false){
      state.error = (resp && (resp.detail || resp.error)) || 'admin_metadata_studio_summary_failed';
      paint();
      return;
    }
    state.summary = resp;
    state.loaded = true;
    state.error = '';
    paint();
    ensureDefaultSelection();
  }).catch(function(err){
    state.loading = false;
    state.error = String((err && err.message) || err || 'admin_metadata_studio_summary_failed');
    paint();
  });
}

function ensureDefaultSelection(){
  if(!state.summary || !state.summary.lists) return;
  if((state.subTab === 'apis' || state.subTab === 'fields') && !state.selectedApi && endpointOptions().length){ loadApiDetail(endpointOptions()[0].key); return; }
  if(state.subTab === 'tables' && !state.selectedTable && tableOptions().length){ loadTableDetail(tableOptions()[0].key); return; }
  if(state.subTab === 'schemas' && !state.selectedSchema && schemaOptions().length){ loadSchemaDetail(schemaOptions()[0].key); return; }
  if(state.subTab === 'variables' && !state.selectedVariable && variableOptions().length){ loadVariableDetail(variableOptions()[0].key); }
}

function loadApiDetail(key){
  if(!key) return;
  state.detailLoading = true;
  state.detailError = '';
  state.selectedApi = key;
  paint();
  return api('admin_metadata_studio_detail', { type:'api', key:key }, 'GET').then(function(resp){
    state.detailLoading = false;
    if(!resp || resp.ok === false){
      state.detailError = (resp && (resp.detail || resp.error)) || 'api_detail_failed';
      paint();
      return;
    }
    state.apiEditor = { key:key, item:clone(resp.item || {}), apiParams:clone(resp.api_params || {}), fields:ensureArray(clone(resp.fields || [])) };
    if(!state.apiEditor.item.security) state.apiEditor.item.security = blankApiEditor().item.security;
    if(!state.apiEditor.item.request) state.apiEditor.item.request = apiRequestDefaults();
    if(!state.apiEditor.item.response) state.apiEditor.item.response = apiResponseDefaults();
    if(!Array.isArray(state.apiEditor.apiParams.params)) state.apiEditor.apiParams.params = [];
    if(!state.apiEditor.apiParams.response) state.apiEditor.apiParams.response = { type:'object', fields:[], pagination:false };
    paint();
  }).catch(function(err){
    state.detailLoading = false;
    state.detailError = String((err && err.message) || err || 'api_detail_failed');
    paint();
  });
}

function loadTableDetail(key){
  if(!key) return;
  state.detailLoading = true;
  state.detailError = '';
  state.selectedTable = key;
  paint();
  return api('admin_metadata_studio_detail', { type:'table', key:key }, 'GET').then(function(resp){
    state.detailLoading = false;
    if(!resp || resp.ok === false){
      state.detailError = (resp && (resp.detail || resp.error)) || 'table_detail_failed';
      paint();
      return;
    }
    var item = clone(resp.item || {});
    var columns = [];
    Object.keys(item.columns || {}).sort().forEach(function(columnKey){
      var meta = clone(item.columns[columnKey] || {});
      meta.key = columnKey;
      columns.push(meta);
    });
    state.tableEditor = { key:key, item:item, columnsList:columns };
    paint();
  }).catch(function(err){
    state.detailLoading = false;
    state.detailError = String((err && err.message) || err || 'table_detail_failed');
    paint();
  });
}

function loadSchemaDetail(key){
  if(!key) return;
  state.detailLoading = true;
  state.detailError = '';
  state.selectedSchema = key;
  paint();
  return api('admin_metadata_studio_detail', { type:'schema', key:key }, 'GET').then(function(resp){
    state.detailLoading = false;
    if(!resp || resp.ok === false){
      state.detailError = (resp && (resp.detail || resp.error)) || 'schema_detail_failed';
      paint();
      return;
    }
    state.schemaEditor = { key:key, item:clone(resp.item || {}) };
    if(!Array.isArray(state.schemaEditor.item.tables)) state.schemaEditor.item.tables = [];
    if(!Array.isArray(state.schemaEditor.item.migrations)) state.schemaEditor.item.migrations = [];
    paint();
  }).catch(function(err){
    state.detailLoading = false;
    state.detailError = String((err && err.message) || err || 'schema_detail_failed');
    paint();
  });
}

function loadVariableDetail(key){
  if(!key) return;
  state.detailLoading = true;
  state.detailError = '';
  state.selectedVariable = key;
  paint();
  return api('admin_metadata_studio_detail', { type:'variable', key:key }, 'GET').then(function(resp){
    state.detailLoading = false;
    if(!resp || resp.ok === false){
      state.detailError = (resp && (resp.detail || resp.error)) || 'variable_detail_failed';
      paint();
      return;
    }
    var item = clone(resp.item || {});
    var variablesList = [];
    Object.keys(item.variables || {}).sort().forEach(function(variableKey){
      var meta = clone(item.variables[variableKey] || {});
      meta.key = variableKey;
      variablesList.push(meta);
    });
    state.variableEditor = { key:key, item:item, variablesList:variablesList };
    paint();
  }).catch(function(err){
    state.detailLoading = false;
    state.detailError = String((err && err.message) || err || 'variable_detail_failed');
    paint();
  });
}

function captureApiEditor(){
  if(!state.apiEditor || !state.container) return;
  var ed = state.apiEditor;
  ed.key = getValue('[data-api-key]').trim();
  ed.item.action = ed.key;
  ed.item.label = getValue('[data-api-label]').trim();
  ed.item.labelEn = getValue('[data-api-label-en]').trim();
  ed.item.module = getValue('[data-api-module]').trim();
  ed.item.moduleEn = getValue('[data-api-module-en]').trim();
  ed.item.method = getValue('[data-api-method]').trim() || 'GET';
  ed.item.kind = getValue('[data-api-kind]').trim();
  ed.item.domain = getValue('[data-api-domain]').trim();
  ed.item.entity = getValue('[data-api-entity]').trim();
  ed.item.source = getValue('[data-api-source]').trim();
  ed.item.primary_key = getValue('[data-api-primary-key]').trim();
  ed.item.security = {
    auth_required: getChecked('[data-api-auth-required]'),
    csrf_required: getChecked('[data-api-csrf-required]'),
    admin_only: getChecked('[data-api-admin-only]'),
    dynamic_permission: getChecked('[data-api-dynamic-permission]'),
    permission_keys: splitLines(getValue('[data-api-permission-keys]'))
  };
  ed.item.request = {
    query_params: splitLines(getValue('[data-api-query-params]')),
    body_fields: splitLines(getValue('[data-api-body-fields]')),
    required_body_fields: splitLines(getValue('[data-api-required-body-fields]'))
  };
  ed.item.response = {
    collection_key: getValue('[data-api-collection-key]').trim(),
    response_fields: splitLines(getValue('[data-api-response-fields]')),
    paginated: getChecked('[data-api-paginated]')
  };
  ed.apiParams.method = ed.item.method;
  ed.apiParams.module = ed.item.module;
  ed.apiParams.description = getValue('[data-api-description]').trim();
  ed.apiParams.descriptionEn = getValue('[data-api-description-en]').trim();
  ed.apiParams.params = collectRows('[data-api-param-row]', ed.apiParams.params, [
    { key:'key', type:'text' }, { key:'type', type:'text' }, { key:'required', type:'checkbox' }, { key:'description', type:'text' }
  ]);
  ed.apiParams.response = {
    type: getValue('[data-api-response-type]').trim() || 'object',
    fields: splitLines(getValue('[data-api-contract-fields]')),
    pagination: getChecked('[data-api-contract-pagination]')
  };
  ed.fields = collectRows('[data-api-field-row]', ed.fields, [
    { key:'key', type:'text' }, { key:'label', type:'text' }, { key:'labelEn', type:'text' }, { key:'type', type:'text' },
    { key:'required', type:'checkbox' }, { key:'dbTable', type:'text' }, { key:'dbColumn', type:'text' }, { key:'description', type:'text' }
  ]);
  ed.item.field_count = ed.fields.length;
}

function captureTableEditor(){
  if(!state.tableEditor || !state.container) return;
  var ed = state.tableEditor;
  ed.key = getValue('[data-table-key]').trim();
  ed.item.domain = getValue('[data-table-domain]').trim();
  ed.item.migration = getValue('[data-table-migration]').trim();
  ed.item.label = getValue('[data-table-label]').trim();
  ed.item.labelEn = getValue('[data-table-label-en]').trim();
  ed.item.description = getValue('[data-table-description]').trim();
  ed.item.primaryKey = splitLines(getValue('[data-table-primary-keys]'));
  ed.item.statusColumn = getValue('[data-table-status-column]').trim();
  ed.item.statusSet = getValue('[data-table-status-set]').trim();
  ed.item.workflowId = getValue('[data-table-workflow-id]').trim();
  ed.item.supportTable = getChecked('[data-table-support-table]');
  ed.columnsList = collectRows('[data-column-row]', ed.columnsList, [
    { key:'key', type:'text' }, { key:'type', type:'text' }, { key:'label', type:'text' }, { key:'labelEn', type:'text' },
    { key:'required', type:'checkbox' }, { key:'pk', type:'checkbox' }, { key:'unique', type:'checkbox' }, { key:'generated', type:'checkbox' },
    { key:'default', type:'text' }, { key:'uiType', type:'text' }, { key:'references', type:'text' }, { key:'description', type:'text' }
  ]);
  var columns = {};
  ed.columnsList.forEach(function(column){
    if(!column.key) return;
    var copy = clone(column);
    delete copy.key;
    columns[column.key] = copy;
  });
  ed.item.columns = columns;
  ed.item.columnCount = ed.columnsList.length;
}

function captureSchemaEditor(){
  if(!state.schemaEditor || !state.container) return;
  var ed = state.schemaEditor;
  ed.key = getValue('[data-schema-key]').trim();
  ed.item.description = getValue('[data-schema-description]').trim();
  ed.item.tables = splitLines(getValue('[data-schema-tables]'));
  ed.item.migrations = splitLines(getValue('[data-schema-migrations]'));
}

function captureVariableEditor(){
  if(!state.variableEditor || !state.container) return;
  var ed = state.variableEditor;
  ed.key = getValue('[data-variable-key]').trim();
  ed.item.label = getValue('[data-variable-label]').trim();
  ed.item.label_vi = getValue('[data-variable-label-vi]').trim();
  ed.item.description = getValue('[data-variable-description]').trim();
  ed.variablesList = collectRows('[data-variable-row]', ed.variablesList, [
    { key:'key', type:'text' }, { key:'label', type:'text' }, { key:'label_vi', type:'text' }, { key:'type', type:'text' },
    { key:'required', type:'checkbox' }, { key:'source', type:'text' }, { key:'example', type:'text' }, { key:'validation', type:'text' }, { key:'description', type:'text' }
  ]);
  var variables = {};
  ed.variablesList.forEach(function(variable){
    if(!variable.key) return;
    var copy = clone(variable);
    delete copy.key;
    variables[variable.key] = copy;
  });
  ed.item.variables = variables;
}

function captureVisibleEditor(){
  if(state.subTab === 'apis' || state.subTab === 'fields') captureApiEditor();
  if(state.subTab === 'tables') captureTableEditor();
  if(state.subTab === 'schemas') captureSchemaEditor();
  if(state.subTab === 'variables') captureVariableEditor();
}

function finishSave(type, key, message, loader){
  state.saveLoading = false;
  if(typeof showToast === 'function') showToast(message, 'success');
  loadSummary(true).then(function(){ loader(key); });
}

function saveApi(){
  captureApiEditor();
  if(!state.apiEditor) return;
  var key = (state.apiEditor.key || state.apiEditor.item.action || '').trim();
  if(!key){
    if(typeof showToast === 'function') showToast(T('Can key action API truoc khi luu.', 'API action key is required before saving.'), 'error');
    return;
  }
  state.saveLoading = true;
  paint();
  api('admin_metadata_studio_save', {
    type:'api',
    key:key,
    item:state.apiEditor.item,
    api_params:state.apiEditor.apiParams,
    fields:state.apiEditor.fields
  }, 'POST').then(function(resp){
    if(!resp || resp.ok === false){
      state.saveLoading = false;
      state.detailError = (resp && (resp.detail || resp.error)) || 'api_save_failed';
      paint();
      return;
    }
    state.selectedApi = resp.key || key;
    finishSave('api', state.selectedApi, T('Da luu API va field registry.', 'API and field registry saved.'), loadApiDetail);
  }).catch(function(err){
    state.saveLoading = false;
    state.detailError = String((err && err.message) || err || 'api_save_failed');
    paint();
  });
}

function saveTable(){
  captureTableEditor();
  if(!state.tableEditor) return;
  var key = state.tableEditor.key || slugify(state.tableEditor.item.labelEn || state.tableEditor.item.label || '', '_');
  if(!key){
    if(typeof showToast === 'function') showToast(T('Can key bang du lieu truoc khi luu.', 'Table key is required before saving.'), 'error');
    return;
  }
  state.saveLoading = true;
  paint();
  api('admin_metadata_studio_save', { type:'table', key:key, item:state.tableEditor.item }, 'POST').then(function(resp){
    if(!resp || resp.ok === false){
      state.saveLoading = false;
      state.detailError = (resp && (resp.detail || resp.error)) || 'table_save_failed';
      paint();
      return;
    }
    state.selectedTable = resp.key || key;
    finishSave('table', state.selectedTable, T('Da luu table registry.', 'Table registry saved.'), loadTableDetail);
  }).catch(function(err){
    state.saveLoading = false;
    state.detailError = String((err && err.message) || err || 'table_save_failed');
    paint();
  });
}

function saveSchema(){
  captureSchemaEditor();
  if(!state.schemaEditor) return;
  var key = state.schemaEditor.key || slugify(state.schemaEditor.item.description || '', '_');
  if(!key){
    if(typeof showToast === 'function') showToast(T('Can key schema truoc khi luu.', 'Schema key is required before saving.'), 'error');
    return;
  }
  state.saveLoading = true;
  paint();
  api('admin_metadata_studio_save', { type:'schema', key:key, item:state.schemaEditor.item }, 'POST').then(function(resp){
    if(!resp || resp.ok === false){
      state.saveLoading = false;
      state.detailError = (resp && (resp.detail || resp.error)) || 'schema_save_failed';
      paint();
      return;
    }
    state.selectedSchema = resp.key || key;
    finishSave('schema', state.selectedSchema, T('Da luu schema blueprint.', 'Schema blueprint saved.'), loadSchemaDetail);
  }).catch(function(err){
    state.saveLoading = false;
    state.detailError = String((err && err.message) || err || 'schema_save_failed');
    paint();
  });
}

function saveVariable(){
  captureVariableEditor();
  if(!state.variableEditor) return;
  var key = state.variableEditor.key || slugify(state.variableEditor.item.label || state.variableEditor.item.label_vi || '', '_');
  if(!key){
    if(typeof showToast === 'function') showToast(T('Can key category variable truoc khi luu.', 'Variable category key is required before saving.'), 'error');
    return;
  }
  state.saveLoading = true;
  paint();
  api('admin_metadata_studio_save', { type:'variable', key:key, item:state.variableEditor.item }, 'POST').then(function(resp){
    if(!resp || resp.ok === false){
      state.saveLoading = false;
      state.detailError = (resp && (resp.detail || resp.error)) || 'variable_save_failed';
      paint();
      return;
    }
    state.selectedVariable = resp.key || key;
    finishSave('variable', state.selectedVariable, T('Da luu variable library.', 'Variable library saved.'), loadVariableDetail);
  }).catch(function(err){
    state.saveLoading = false;
    state.detailError = String((err && err.message) || err || 'variable_save_failed');
    paint();
  });
}

function methodClass(method){
  return 'method-' + String(method || 'get').toLowerCase();
}

function listSubtitle(parts){
  return parts.filter(Boolean).join(' | ');
}

function renderHeader(){
  var overview = ((state.summary || {}).overview || {});
  var benchmarkCount = ensureArray((state.summary || {}).benchmarks).length;
  return [
    '<div class="ams-topbar">',
      '<section class="ams-hero">',
        '<div class="ams-kicker">Metadata control tower</div>',
        '<h3>' + esc(T('API va Database Studio cho admin', 'Admin API and Database Studio')) + '</h3>',
        '<p>' + esc(T(
          'Mot tab chinh de doc, them va chinh sua API catalog, table registry, data field, schema va variable library theo kieu governance metadata.',
          'One main admin tab to read, add, and edit the API catalog, table registry, data fields, schemas, and variable library in a metadata-governance workflow.'
        )) + '</p>',
        '<div class="ams-pillrow">',
          '<span class="ams-pill">' + esc(T('API: ', 'APIs: ')) + esc(overview.endpointCount || 0) + '</span>',
          '<span class="ams-pill">' + esc(T('Tables: ', 'Tables: ')) + esc(overview.tableCount || 0) + '</span>',
          '<span class="ams-pill">' + esc(T('Schemas: ', 'Schemas: ')) + esc(overview.schemaCount || 0) + '</span>',
          '<span class="ams-pill">' + esc(T('Variable categories: ', 'Variable categories: ')) + esc(overview.variableCategoryCount || 0) + '</span>',
        '</div>',
      '</section>',
      '<aside class="ams-sidecard">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('Case study va benchmark', 'Case studies and benchmarks')) + '</h4>',
            '<p>' + esc(T(
              'Huong thiet ke tham chieu Postman, Supabase, Directus, Dataverse va Hasura: central catalog, table editor, logical labels va governance metadata.',
              'The interface borrows from Postman, Supabase, Directus, Dataverse, and Hasura: central catalogs, table editors, logical labels, and metadata governance.'
            )) + '</p>',
          '</div>',
          '<button type="button" class="ams-btn ams-btn-secondary" data-ams-action="refresh-summary">' + esc(T('Lam moi', 'Refresh')) + '</button>',
        '</div>',
        '<div class="ams-kv">',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Benchmark refs', 'Benchmark refs')) + '</div><div class="v">' + esc(benchmarkCount) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Data field packs', 'Data field packs')) + '</div><div class="v">' + esc(overview.dataFieldEndpointCount || 0) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Variables', 'Variables')) + '</div><div class="v">' + esc(overview.variableCount || 0) + '</div></div>',
        '</div>',
      '</aside>',
    '</div>'
  ].join('');
}

function renderSubTabs(){
  var tabs = [
    ['overview', T('Overview', 'Overview')],
    ['apis', T('API Catalog', 'API Catalog')],
    ['fields', T('Data Fields', 'Data Fields')],
    ['tables', T('DB Tables', 'DB Tables')],
    ['schemas', T('Schema', 'Schemas')],
    ['variables', T('Variables', 'Variables')]
  ];
  return [
    '<div class="ams-subtabs">',
      tabs.map(function(item){
        return '<button type="button" class="ams-subtab ' + (state.subTab === item[0] ? 'active' : '') + '" data-ams-action="switch-subtab" data-tab="' + esc(item[0]) + '">' + esc(item[1]) + '</button>';
      }).join(''),
    '</div>'
  ].join('');
}

function renderOverview(){
  var summary = state.summary || {};
  var overview = summary.overview || {};
  var benchmarks = ensureArray(summary.benchmarks);
  var principles = ensureArray(summary.principles);

  return [
    '<section class="ams-metrics">',
      '<article class="ams-overview-card"><div class="label">' + esc(T('API catalog', 'API catalog')) + '</div><div class="value">' + esc(overview.endpointCount || 0) + '</div><div class="sub">' + esc(T('Endpoint metadata co owner/module/domain', 'Endpoint metadata with owner/module/domain')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('DB tables', 'DB tables')) + '</div><div class="value">' + esc(overview.tableCount || 0) + '</div><div class="sub">' + esc(T('Table registry va column mapping', 'Table registry and column mapping')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Schema groups', 'Schema groups')) + '</div><div class="value">' + esc(overview.schemaCount || 0) + '</div><div class="sub">' + esc(T('Blueprint nghiep vu va migration', 'Business blueprints and migrations')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Reusable variables', 'Reusable variables')) + '</div><div class="value">' + esc(overview.variableCount || 0) + '</div><div class="sub">' + esc(T('Dung lai cho form, document, automation', 'Reused across forms, documents, and automation')) + '</div></article>',
    '</section>',
    '<section class="ams-overview-grid">',
      '<article class="ams-benchmark">',
        '<h4>' + esc(T('Design pattern tham chieu', 'Referenced design patterns')) + '</h4>',
        '<p>' + esc(T(
          'Cach to chuc nay gop metadata vao mot xuong song duy nhat: API, table, field, schema va variable khong bi tach roi thanh nhieu trang admin nho.',
          'This structure consolidates metadata into one spine so APIs, tables, fields, schemas, and variables do not drift across disconnected admin pages.'
        )) + '</p>',
        '<div class="ams-grid" style="margin-top:14px">',
          benchmarks.map(function(item){
            return [
              '<div class="ams-section">',
                '<div class="ams-item-title">',
                  '<div>',
                    '<strong>' + esc(item.platform || item.key || '') + '</strong>',
                    '<div class="ams-help">' + esc(ensureArray(item.focus).slice(0, 3).join(' | ')) + '</div>',
                  '</div>',
                '</div>',
                '<div style="margin-top:10px"><a class="ams-link" target="_blank" rel="noopener" href="' + esc(item.url || '#') + '">' + esc(T('Mo tai lieu', 'Open source')) + '</a></div>',
              '</div>'
            ].join('');
          }).join(''),
        '</div>',
      '</article>',
      '<article class="ams-benchmark">',
        '<h4>' + esc(T('Nguyen tac van hanh', 'Operating principles')) + '</h4>',
        '<div class="ams-principles" style="margin-top:14px">',
          principles.map(function(item){
            return [
              '<div class="ams-principle">',
                '<strong>' + esc(item.title || '') + '</strong>',
                '<p style="margin-top:8px">' + esc(item.description || '') + '</p>',
              '</div>'
            ].join('');
          }).join(''),
        '</div>',
      '</article>',
    '</section>'
  ].join('');
}

function renderCatalog(type){
  var items = [];
  var title = '';
  var searchValue = '';
  var action = '';
  var newAction = '';
  var selected = '';

  if(type === 'apis'){
    title = T('API endpoints', 'API endpoints');
    items = endpointOptions().map(function(item){
      return {
        key: item.key,
        title: item.action || item.key,
        meta: [
          '<span class="ams-tag ' + methodClass(item.method) + '">' + esc(item.method || 'GET') + '</span>',
          '<span class="ams-tag">' + esc(item.moduleEn || item.module || '-') + '</span>',
          '<span class="ams-tag">' + esc(item.kind || '-') + '</span>'
        ].join(' '),
        subtitle: listSubtitle([item.labelEn || item.label || '', item.entity || '', item.domain || '', T('Fields', 'Fields') + ': ' + (item.field_count || 0)]),
        search: [item.key, item.action, item.label, item.labelEn, item.module, item.moduleEn, item.domain, item.entity].join(' ')
      };
    });
    searchValue = state.apiSearch;
    action = 'select-api';
    newAction = 'new-api';
    selected = state.selectedApi;
  } else if(type === 'fields'){
    title = T('Field packs theo endpoint', 'Field packs by endpoint');
    items = endpointOptions().map(function(item){
      return {
        key: item.key,
        title: item.action || item.key,
        meta: [
          '<span class="ams-tag">' + esc(item.entity || '-') + '</span>',
          '<span class="ams-tag">' + esc(item.domain || '-') + '</span>'
        ].join(' '),
        subtitle: listSubtitle([item.labelEn || item.label || '', T('Mapped fields', 'Mapped fields') + ': ' + (item.field_count || 0)]),
        search: [item.key, item.action, item.label, item.labelEn, item.module, item.domain, item.entity].join(' ')
      };
    });
    searchValue = state.fieldSearch;
    action = 'select-api';
    newAction = 'new-api';
    selected = state.selectedApi;
  } else if(type === 'tables'){
    title = T('Database tables', 'Database tables');
    items = tableOptions().map(function(item){
      return {
        key: item.key,
        title: item.key,
        meta: [
          '<span class="ams-tag">' + esc(item.domain || '-') + '</span>',
          item.supportTable ? '<span class="ams-tag">' + esc(T('Support', 'Support')) + '</span>' : ''
        ].join(' '),
        subtitle: listSubtitle([item.labelEn || item.label || '', T('Columns', 'Columns') + ': ' + (item.columnCount || 0), item.workflowId || '']),
        search: [item.key, item.label, item.labelEn, item.domain, item.workflowId].join(' ')
      };
    });
    searchValue = state.tableSearch;
    action = 'select-table';
    newAction = 'new-table';
    selected = state.selectedTable;
  } else if(type === 'schemas'){
    title = T('Schema blueprints', 'Schema blueprints');
    items = schemaOptions().map(function(item){
      return {
        key: item.key,
        title: item.key,
        meta: '<span class="ams-tag">' + esc(T('Tables', 'Tables') + ': ' + (item.tableCount || 0)) + '</span>',
        subtitle: listSubtitle([item.description || '', T('Migrations', 'Migrations') + ': ' + (item.migrationCount || 0)]),
        search: [item.key, item.description].join(' ')
      };
    });
    searchValue = state.schemaSearch;
    action = 'select-schema';
    newAction = 'new-schema';
    selected = state.selectedSchema;
  } else if(type === 'variables'){
    title = T('Variable categories', 'Variable categories');
    items = variableOptions().map(function(item){
      return {
        key: item.key,
        title: item.key,
        meta: '<span class="ams-tag">' + esc(T('Variables', 'Variables') + ': ' + (item.variableCount || 0)) + '</span>',
        subtitle: listSubtitle([item.label || item.label_vi || '', item.description || '']),
        search: [item.key, item.label, item.label_vi, item.description].join(' ')
      };
    });
    searchValue = state.variableSearch;
    action = 'select-variable';
    newAction = 'new-variable';
    selected = state.selectedVariable;
  }

  return [
    '<aside class="ams-list">',
      '<div class="ams-list-head">',
        '<div>',
          '<h4>' + esc(title) + '</h4>',
          '<p>' + esc(T('Chon mot item de doc/chinh sua hoac tao moi.', 'Pick an item to inspect, edit, or create a new one.')) + '</p>',
        '</div>',
        '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="' + esc(newAction) + '">' + esc(T('Them moi', 'New')) + '</button>',
      '</div>',
      '<input class="ams-search" data-ams-search="' + esc(type) + '" value="' + esc(searchValue) + '" placeholder="' + esc(T('Tim kiem metadata...', 'Search metadata...')) + '">',
      '<div class="ams-catalog" data-ams-list="' + esc(type) + '">',
        items.length ? items.map(function(item){
          return [
            '<button type="button" class="ams-item ' + (selected === item.key ? 'active' : '') + '" data-ams-row data-ams-action="' + esc(action) + '" data-key="' + esc(item.key) + '" data-search="' + esc(item.search || '') + '">',
              '<div class="ams-item-title"><span>' + esc(item.title || item.key) + '</span></div>',
              item.meta ? '<div class="ams-item-meta">' + item.meta + '</div>' : '',
              item.subtitle ? '<div class="ams-help">' + esc(item.subtitle) + '</div>' : '',
            '</button>'
          ].join('');
        }).join('') : '<div class="ams-empty">' + esc(T('Chua co item nao.', 'No items found yet.')) + '</div>',
      '</div>',
    '</aside>'
  ].join('');
}

function renderLoadingOrError(emptyMessage){
  if(state.detailLoading){
    return '<div class="ams-loading">' + esc(T('Dang tai metadata...', 'Loading metadata...')) + '</div>';
  }
  if(state.detailError){
    return '<div class="ams-error">' + esc(state.detailError) + '</div>';
  }
  return '<div class="ams-empty">' + esc(emptyMessage) + '</div>';
}

function renderApiEditor(){
  var ed = state.apiEditor;
  if(!ed) return renderLoadingOrError(T('Chon mot API de xem hoac tao moi.', 'Select an API to inspect or create a new one.'));
  var item = ed.item || {};
  var security = item.security || {};
  var request = item.request || apiRequestDefaults();
  var response = item.response || apiResponseDefaults();
  var contract = ed.apiParams || { params: [], response: { type:'object', fields:[], pagination:false } };
  var contractResp = contract.response || { type:'object', fields:[], pagination:false };
  var params = ensureArray(contract.params);

  return [
    '<section class="ams-editor">',
      '<div class="ams-editor-top">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('API Catalog Editor', 'API Catalog Editor')) + '</h4>',
            '<p>' + esc(T(
              'Giu action, contract va governance trong mot man, theo pattern catalog cua Postman va metadata layer cua Hasura.',
              'Keep action, contract, and governance in one surface, inspired by Postman catalogs and Hasura metadata layers.'
            )) + '</p>',
          '</div>',
        '</div>',
        '<div class="ams-actions">',
          '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="save-api">' + esc(state.saveLoading ? T('Dang luu...', 'Saving...') : T('Luu API', 'Save API')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ams-grid">',
        '<div class="ams-field"><label>' + esc(T('Action key', 'Action key')) + '</label><input class="ams-input" data-api-key value="' + esc(ed.key || item.action || '') + '" placeholder="quality.inspection.list"></div>',
        '<div class="ams-field"><label>Label</label><input class="ams-input" data-api-label value="' + esc(item.label || '') + '"></div>',
        '<div class="ams-field"><label>Label EN</label><input class="ams-input" data-api-label-en value="' + esc(item.labelEn || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Module', 'Module')) + '</label><input class="ams-input" data-api-module value="' + esc(item.module || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Module EN', 'Module EN')) + '</label><input class="ams-input" data-api-module-en value="' + esc(item.moduleEn || '') + '"></div>',
        '<div class="ams-field"><label>Method</label><select class="ams-select" data-api-method">' +
          ['GET','POST','PUT','PATCH','DELETE'].map(function(method){
            return '<option value="' + method + '" ' + ((String(item.method || 'GET').toUpperCase() === method) ? 'selected' : '') + '>' + method + '</option>';
          }).join('') +
        '</select></div>',
        '<div class="ams-field"><label>' + esc(T('Kind', 'Kind')) + '</label><input class="ams-input" data-api-kind value="' + esc(item.kind || '') + '" placeholder="list/detail/create"></div>',
        '<div class="ams-field"><label>' + esc(T('Domain', 'Domain')) + '</label><input class="ams-input" data-api-domain value="' + esc(item.domain || '') + '" placeholder="quality"></div>',
        '<div class="ams-field"><label>' + esc(T('Entity', 'Entity')) + '</label><input class="ams-input" data-api-entity value="' + esc(item.entity || '') + '" placeholder="inspection_records"></div>',
        '<div class="ams-field"><label>' + esc(T('Source', 'Source')) + '</label><input class="ams-input" data-api-source value="' + esc(item.source || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Primary key', 'Primary key')) + '</label><input class="ams-input" data-api-primary-key value="' + esc(item.primary_key || '') + '"></div>',
      '</div>',
      '<div class="ams-kv">',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Field count', 'Field count')) + '</div><div class="v">' + esc(ensureArray(ed.fields).length) + '</div></div>',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Query params', 'Query params')) + '</div><div class="v">' + esc(ensureArray(request.query_params).length) + '</div></div>',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Contract params', 'Contract params')) + '</div><div class="v">' + esc(params.length) + '</div></div>',
      '</div>',
      '<section class="ams-section">',
        '<div class="ams-section-head"><strong>' + esc(T('Security va routing', 'Security and routing')) + '</strong></div>',
        '<div class="ams-grid" style="margin-top:12px">',
          '<label class="ams-check"><input type="checkbox" data-api-auth-required ' + (security.auth_required ? 'checked' : '') + '><span>' + esc(T('Can dang nhap', 'Authentication required')) + '</span></label>',
          '<label class="ams-check"><input type="checkbox" data-api-csrf-required ' + (security.csrf_required ? 'checked' : '') + '><span>CSRF</span></label>',
          '<label class="ams-check"><input type="checkbox" data-api-admin-only ' + (security.admin_only ? 'checked' : '') + '><span>' + esc(T('Chi admin', 'Admin only')) + '</span></label>',
          '<label class="ams-check"><input type="checkbox" data-api-dynamic-permission ' + (security.dynamic_permission ? 'checked' : '') + '><span>' + esc(T('Dynamic permission', 'Dynamic permission')) + '</span></label>',
          '<div class="ams-field" style="grid-column:1/-1"><label>' + esc(T('Permission keys', 'Permission keys')) + '</label><textarea class="ams-textarea" data-api-permission-keys placeholder="qc.view\nqc.edit">' + esc(stringifyLines(security.permission_keys)) + '</textarea></div>',
        '</div>',
      '</section>',
      '<section class="ams-section">',
        '<div class="ams-section-head"><strong>' + esc(T('Request va response metadata', 'Request and response metadata')) + '</strong></div>',
        '<div class="ams-grid" style="margin-top:12px">',
          '<div class="ams-field"><label>' + esc(T('Query params', 'Query params')) + '</label><textarea class="ams-textarea" data-api-query-params>' + esc(stringifyLines(request.query_params)) + '</textarea></div>',
          '<div class="ams-field"><label>' + esc(T('Body fields', 'Body fields')) + '</label><textarea class="ams-textarea" data-api-body-fields>' + esc(stringifyLines(request.body_fields)) + '</textarea></div>',
          '<div class="ams-field"><label>' + esc(T('Required body fields', 'Required body fields')) + '</label><textarea class="ams-textarea" data-api-required-body-fields>' + esc(stringifyLines(request.required_body_fields)) + '</textarea></div>',
          '<div class="ams-field"><label>' + esc(T('Collection key', 'Collection key')) + '</label><input class="ams-input" data-api-collection-key value="' + esc(response.collection_key || '') + '" placeholder="records"></div>',
          '<div class="ams-field"><label>' + esc(T('Response fields', 'Response fields')) + '</label><textarea class="ams-textarea" data-api-response-fields>' + esc(stringifyLines(response.response_fields)) + '</textarea></div>',
          '<label class="ams-check"><input type="checkbox" data-api-paginated ' + (response.paginated ? 'checked' : '') + '><span>' + esc(T('Response co phan trang', 'Paginated response')) + '</span></label>',
          '<div class="ams-field"><label>' + esc(T('Description', 'Description')) + '</label><textarea class="ams-textarea" data-api-description>' + esc(contract.description || '') + '</textarea></div>',
          '<div class="ams-field"><label>' + esc(T('Description EN', 'Description EN')) + '</label><textarea class="ams-textarea" data-api-description-en>' + esc(contract.descriptionEn || '') + '</textarea></div>',
          '<div class="ams-field"><label>' + esc(T('Contract response type', 'Contract response type')) + '</label><input class="ams-input" data-api-response-type value="' + esc(contractResp.type || 'object') + '"></div>',
          '<div class="ams-field"><label>' + esc(T('Contract response fields', 'Contract response fields')) + '</label><textarea class="ams-textarea" data-api-contract-fields>' + esc(stringifyLines(contractResp.fields)) + '</textarea></div>',
          '<label class="ams-check"><input type="checkbox" data-api-contract-pagination ' + (contractResp.pagination ? 'checked' : '') + '><span>' + esc(T('Contract co pagination', 'Contract includes pagination')) + '</span></label>',
        '</div>',
      '</section>',
      '<section class="ams-section">',
        '<div class="ams-section-head">',
          '<strong>' + esc(T('Input contract params', 'Input contract params')) + '</strong>',
          '<button type="button" class="ams-btn ams-btn-ghost" data-ams-action="add-param-row">' + esc(T('Them param', 'Add param')) + '</button>',
        '</div>',
        '<div class="ams-table-wrap" style="margin-top:12px">',
          '<table class="ams-table">',
            '<thead><tr><th>Key</th><th>Type</th><th>' + esc(T('Required', 'Required')) + '</th><th>' + esc(T('Description', 'Description')) + '</th><th></th></tr></thead>',
            '<tbody>',
              (params.length ? params : [{ key:'', type:'string', required:false, description:'' }]).map(function(row, index){
                return '<tr data-api-param-row><td><input class="ams-input" data-col="key" value="' + esc(row.key || '') + '"></td><td><input class="ams-input" data-col="type" value="' + esc(row.type || '') + '"></td><td><label class="ams-check"><input type="checkbox" data-col="required" ' + (row.required ? 'checked' : '') + '><span>' + esc(T('Yes', 'Yes')) + '</span></label></td><td><input class="ams-input" data-col="description" value="' + esc(row.description || '') + '"></td><td><button type="button" class="ams-btn ams-btn-danger" data-ams-action="remove-param-row" data-index="' + index + '">' + esc(T('Xoa', 'Remove')) + '</button></td></tr>';
              }).join(''),
            '</tbody>',
          '</table>',
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}

function renderFieldsEditor(){
  var ed = state.apiEditor;
  if(!ed) return renderLoadingOrError(T('Chon mot endpoint de quan tri data field.', 'Select an endpoint to manage data fields.'));
  var item = ed.item || {};
  var fields = ensureArray(ed.fields);

  return [
    '<section class="ams-editor">',
      '<div class="ams-editor-top">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('Field Mapping Workspace', 'Field Mapping Workspace')) + '</h4>',
            '<p>' + esc(T(
              'Mo hinh nay theo cach Directus va Dataverse tach logical label khoi db column, de admin nghiep vu van doc va cap nhat duoc.',
              'This follows Directus and Dataverse by separating logical labels from physical columns so business admins can still read and maintain the model.'
            )) + '</p>',
          '</div>',
        '</div>',
        '<div class="ams-actions">',
          '<button type="button" class="ams-btn ams-btn-secondary" data-ams-action="switch-subtab" data-tab="apis">' + esc(T('Mo thong tin API', 'Open API info')) + '</button>',
          '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="save-api">' + esc(state.saveLoading ? T('Dang luu...', 'Saving...') : T('Luu field map', 'Save field map')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ams-kv">',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Endpoint', 'Endpoint')) + '</div><div class="v">' + esc(ed.key || item.action || '') + '</div></div>',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Entity', 'Entity')) + '</div><div class="v">' + esc(item.entity || '-') + '</div></div>',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Domain', 'Domain')) + '</div><div class="v">' + esc(item.domain || '-') + '</div></div>',
        '<div class="ams-kv-card"><div class="k">' + esc(T('Mapped fields', 'Mapped fields')) + '</div><div class="v">' + esc(fields.length) + '</div></div>',
      '</div>',
      '<div class="ams-note">' + esc(T(
        'Case study: Supabase hien table/column truc quan, con studio nay them lop label, required, db table/db column va mo ta nghiep vu de dung lai cho UI, docs va automation.',
        'Case study: Supabase makes tables and columns visible; this studio adds logical labels, required flags, db table/db column mapping, and business descriptions for reuse across UI, docs, and automation.'
      )) + '</div>',
      '<section class="ams-section">',
        '<div class="ams-section-head">',
          '<strong>' + esc(T('Field definitions', 'Field definitions')) + '</strong>',
          '<button type="button" class="ams-btn ams-btn-ghost" data-ams-action="add-field-row">' + esc(T('Them field', 'Add field')) + '</button>',
        '</div>',
        '<div class="ams-table-wrap" style="margin-top:12px">',
          '<table class="ams-table">',
            '<thead><tr><th>Key</th><th>Label</th><th>Label EN</th><th>Type</th><th>' + esc(T('Required', 'Required')) + '</th><th>DB Table</th><th>DB Column</th><th>' + esc(T('Description', 'Description')) + '</th><th></th></tr></thead>',
            '<tbody>',
              (fields.length ? fields : [{ key:'', label:'', labelEn:'', type:'string', required:false, dbTable:'', dbColumn:'', description:'' }]).map(function(row, index){
                return '<tr data-api-field-row><td><input class="ams-input" data-col="key" value="' + esc(row.key || '') + '"></td><td><input class="ams-input" data-col="label" value="' + esc(row.label || '') + '"></td><td><input class="ams-input" data-col="labelEn" value="' + esc(row.labelEn || '') + '"></td><td><input class="ams-input" data-col="type" value="' + esc(row.type || '') + '"></td><td><label class="ams-check"><input type="checkbox" data-col="required" ' + (row.required ? 'checked' : '') + '><span>' + esc(T('Yes', 'Yes')) + '</span></label></td><td><input class="ams-input" data-col="dbTable" value="' + esc(row.dbTable || '') + '"></td><td><input class="ams-input" data-col="dbColumn" value="' + esc(row.dbColumn || '') + '"></td><td><textarea class="ams-textarea" data-col="description">' + esc(row.description || '') + '</textarea></td><td><button type="button" class="ams-btn ams-btn-danger" data-ams-action="remove-field-row" data-index="' + index + '">' + esc(T('Xoa', 'Remove')) + '</button></td></tr>';
              }).join(''),
            '</tbody>',
          '</table>',
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}

function renderTableEditor(){
  var ed = state.tableEditor;
  if(!ed) return renderLoadingOrError(T('Chon mot DB table de xem hoac tao moi.', 'Select a database table to inspect or create a new one.'));
  var item = ed.item || {};
  var columns = ensureArray(ed.columnsList);

  return [
    '<section class="ams-editor">',
      '<div class="ams-editor-top">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('Table Registry Editor', 'Table Registry Editor')) + '</h4>',
            '<p>' + esc(T(
              'Theo pattern cua Supabase va Directus: mot workspace de quan ly physical table, column, status set, workflow va relation.',
              'Following Supabase and Directus: one workspace to manage physical tables, columns, status sets, workflows, and relations.'
            )) + '</p>',
          '</div>',
        '</div>',
        '<div class="ams-actions">',
          '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="save-table">' + esc(state.saveLoading ? T('Dang luu...', 'Saving...') : T('Luu table', 'Save table')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ams-grid">',
        '<div class="ams-field"><label>' + esc(T('Table key', 'Table key')) + '</label><input class="ams-input" data-table-key value="' + esc(ed.key || '') + '" placeholder="inspection_records"></div>',
        '<div class="ams-field"><label>' + esc(T('Domain', 'Domain')) + '</label><input class="ams-input" data-table-domain value="' + esc(item.domain || '') + '" placeholder="quality"></div>',
        '<div class="ams-field"><label>' + esc(T('Migration', 'Migration')) + '</label><input class="ams-input" data-table-migration value="' + esc(item.migration || '') + '"></div>',
        '<div class="ams-field"><label>Label</label><input class="ams-input" data-table-label value="' + esc(item.label || '') + '"></div>',
        '<div class="ams-field"><label>Label EN</label><input class="ams-input" data-table-label-en value="' + esc(item.labelEn || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Primary keys', 'Primary keys')) + '</label><textarea class="ams-textarea" data-table-primary-keys>' + esc(stringifyLines(item.primaryKey)) + '</textarea></div>',
        '<div class="ams-field"><label>' + esc(T('Status column', 'Status column')) + '</label><input class="ams-input" data-table-status-column value="' + esc(item.statusColumn || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Status set', 'Status set')) + '</label><input class="ams-input" data-table-status-set value="' + esc(item.statusSet || '') + '"></div>',
        '<div class="ams-field"><label>' + esc(T('Workflow id', 'Workflow id')) + '</label><input class="ams-input" data-table-workflow-id value="' + esc(item.workflowId || '') + '"></div>',
        '<div class="ams-field" style="grid-column:1/-1"><label>' + esc(T('Description', 'Description')) + '</label><textarea class="ams-textarea" data-table-description>' + esc(item.description || '') + '</textarea></div>',
        '<label class="ams-check"><input type="checkbox" data-table-support-table ' + (item.supportTable ? 'checked' : '') + '><span>' + esc(T('Support table', 'Support table')) + '</span></label>',
      '</div>',
      '<section class="ams-section">',
        '<div class="ams-section-head">',
          '<strong>' + esc(T('Columns', 'Columns')) + '</strong>',
          '<button type="button" class="ams-btn ams-btn-ghost" data-ams-action="add-column-row">' + esc(T('Them column', 'Add column')) + '</button>',
        '</div>',
        '<div class="ams-table-wrap" style="margin-top:12px">',
          '<table class="ams-table">',
            '<thead><tr><th>Key</th><th>Type</th><th>Label</th><th>Label EN</th><th>Req</th><th>PK</th><th>Unique</th><th>Generated</th><th>Default</th><th>UI Type</th><th>References</th><th>' + esc(T('Description', 'Description')) + '</th><th></th></tr></thead>',
            '<tbody>',
              (columns.length ? columns : [{ key:'', type:'VARCHAR(255)', label:'', labelEn:'', required:false, pk:false, unique:false, generated:false, default:'', uiType:'string', references:'', description:'' }]).map(function(row, index){
                return '<tr data-column-row><td><input class="ams-input" data-col="key" value="' + esc(row.key || '') + '"></td><td><input class="ams-input" data-col="type" value="' + esc(row.type || '') + '"></td><td><input class="ams-input" data-col="label" value="' + esc(row.label || '') + '"></td><td><input class="ams-input" data-col="labelEn" value="' + esc(row.labelEn || '') + '"></td><td><label class="ams-check"><input type="checkbox" data-col="required" ' + (row.required ? 'checked' : '') + '><span>Y</span></label></td><td><label class="ams-check"><input type="checkbox" data-col="pk" ' + (row.pk ? 'checked' : '') + '><span>Y</span></label></td><td><label class="ams-check"><input type="checkbox" data-col="unique" ' + (row.unique ? 'checked' : '') + '><span>Y</span></label></td><td><label class="ams-check"><input type="checkbox" data-col="generated" ' + (row.generated ? 'checked' : '') + '><span>Y</span></label></td><td><input class="ams-input" data-col="default" value="' + esc(row.default || '') + '"></td><td><input class="ams-input" data-col="uiType" value="' + esc(row.uiType || '') + '"></td><td><input class="ams-input" data-col="references" value="' + esc(row.references || '') + '"></td><td><textarea class="ams-textarea" data-col="description">' + esc(row.description || '') + '</textarea></td><td><button type="button" class="ams-btn ams-btn-danger" data-ams-action="remove-column-row" data-index="' + index + '">' + esc(T('Xoa', 'Remove')) + '</button></td></tr>';
              }).join(''),
            '</tbody>',
          '</table>',
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}

function renderSchemaEditor(){
  var ed = state.schemaEditor;
  if(!ed) return renderLoadingOrError(T('Chon mot schema group de xem hoac tao moi.', 'Select a schema group to inspect or create a new one.'));
  var item = ed.item || {};

  return [
    '<section class="ams-editor">',
      '<div class="ams-editor-top">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('Schema Blueprint Editor', 'Schema Blueprint Editor')) + '</h4>',
            '<p>' + esc(T(
              'Schema nhom business capability, giup nhin duoc bang va migration theo khoi nghiep vu thay vi tung file rieng le.',
              'Schemas group business capabilities so teams can view related tables and migrations together instead of chasing individual files.'
            )) + '</p>',
          '</div>',
        '</div>',
        '<div class="ams-actions">',
          '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="save-schema">' + esc(state.saveLoading ? T('Dang luu...', 'Saving...') : T('Luu schema', 'Save schema')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ams-grid">',
        '<div class="ams-field"><label>' + esc(T('Schema key', 'Schema key')) + '</label><input class="ams-input" data-schema-key value="' + esc(ed.key || '') + '" placeholder="quality_control"></div>',
        '<div class="ams-field" style="grid-column:1/-1"><label>' + esc(T('Description', 'Description')) + '</label><textarea class="ams-textarea" data-schema-description>' + esc(item.description || '') + '</textarea></div>',
        '<div class="ams-field"><label>' + esc(T('Tables', 'Tables')) + '</label><textarea class="ams-textarea" data-schema-tables>' + esc(stringifyLines(item.tables)) + '</textarea></div>',
        '<div class="ams-field"><label>' + esc(T('Migrations', 'Migrations')) + '</label><textarea class="ams-textarea" data-schema-migrations>' + esc(stringifyLines(item.migrations)) + '</textarea></div>',
      '</div>',
      '<div class="ams-note">' + esc(T(
        'Case study: Supabase va Dataverse deu cho phep nhin logic schema/metadata theo nhom, khong chi o cap bang vat ly.',
        'Case study: Supabase and Dataverse both make it easier to see schema logic as grouped metadata, not only as physical tables.'
      )) + '</div>',
    '</section>'
  ].join('');
}

function renderVariableEditor(){
  var ed = state.variableEditor;
  if(!ed) return renderLoadingOrError(T('Chon mot nhom variable de xem hoac tao moi.', 'Select a variable group to inspect or create a new one.'));
  var item = ed.item || {};
  var variables = ensureArray(ed.variablesList);

  return [
    '<section class="ams-editor">',
      '<div class="ams-editor-top">',
        '<div class="ams-editor-title">',
          '<div>',
            '<h4>' + esc(T('Variable Library Editor', 'Variable Library Editor')) + '</h4>',
            '<p>' + esc(T(
              'Variables duoc quan tri nhu tai san dung chung cho form, document, template va automation.',
              'Variables are governed as reusable assets for forms, documents, templates, and automation.'
            )) + '</p>',
          '</div>',
        '</div>',
        '<div class="ams-actions">',
          '<button type="button" class="ams-btn ams-btn-primary" data-ams-action="save-variable">' + esc(state.saveLoading ? T('Dang luu...', 'Saving...') : T('Luu variable', 'Save variable')) + '</button>',
        '</div>',
      '</div>',
      '<div class="ams-grid">',
        '<div class="ams-field"><label>' + esc(T('Category key', 'Category key')) + '</label><input class="ams-input" data-variable-key value="' + esc(ed.key || '') + '" placeholder="document_header"></div>',
        '<div class="ams-field"><label>Label</label><input class="ams-input" data-variable-label value="' + esc(item.label || '') + '"></div>',
        '<div class="ams-field"><label>Label VI</label><input class="ams-input" data-variable-label-vi value="' + esc(item.label_vi || '') + '"></div>',
        '<div class="ams-field" style="grid-column:1/-1"><label>' + esc(T('Description', 'Description')) + '</label><textarea class="ams-textarea" data-variable-description>' + esc(item.description || '') + '</textarea></div>',
      '</div>',
      '<section class="ams-section">',
        '<div class="ams-section-head">',
          '<strong>' + esc(T('Variables', 'Variables')) + '</strong>',
          '<button type="button" class="ams-btn ams-btn-ghost" data-ams-action="add-variable-row">' + esc(T('Them variable', 'Add variable')) + '</button>',
        '</div>',
        '<div class="ams-table-wrap" style="margin-top:12px">',
          '<table class="ams-table">',
            '<thead><tr><th>Key</th><th>Label</th><th>Label VI</th><th>Type</th><th>Req</th><th>Source</th><th>Example</th><th>Validation</th><th>' + esc(T('Description', 'Description')) + '</th><th></th></tr></thead>',
            '<tbody>',
              (variables.length ? variables : [{ key:'', label:'', label_vi:'', type:'string', required:false, source:'', example:'', validation:'', description:'' }]).map(function(row, index){
                return '<tr data-variable-row><td><input class="ams-input" data-col="key" value="' + esc(row.key || '') + '"></td><td><input class="ams-input" data-col="label" value="' + esc(row.label || '') + '"></td><td><input class="ams-input" data-col="label_vi" value="' + esc(row.label_vi || '') + '"></td><td><input class="ams-input" data-col="type" value="' + esc(row.type || '') + '"></td><td><label class="ams-check"><input type="checkbox" data-col="required" ' + (row.required ? 'checked' : '') + '><span>Y</span></label></td><td><input class="ams-input" data-col="source" value="' + esc(row.source || '') + '"></td><td><input class="ams-input" data-col="example" value="' + esc(row.example || '') + '"></td><td><input class="ams-input" data-col="validation" value="' + esc(row.validation || '') + '"></td><td><textarea class="ams-textarea" data-col="description">' + esc(row.description || '') + '</textarea></td><td><button type="button" class="ams-btn ams-btn-danger" data-ams-action="remove-variable-row" data-index="' + index + '">' + esc(T('Xoa', 'Remove')) + '</button></td></tr>';
              }).join(''),
            '</tbody>',
          '</table>',
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}

function renderWorkspace(){
  var body = '';

  if(state.subTab === 'overview'){
    body = renderOverview();
  } else if(state.subTab === 'apis'){
    body = '<section class="ams-workspace">' + renderCatalog('apis') + renderApiEditor() + '</section>';
  } else if(state.subTab === 'fields'){
    body = '<section class="ams-workspace">' + renderCatalog('fields') + renderFieldsEditor() + '</section>';
  } else if(state.subTab === 'tables'){
    body = '<section class="ams-workspace">' + renderCatalog('tables') + renderTableEditor() + '</section>';
  } else if(state.subTab === 'schemas'){
    body = '<section class="ams-workspace">' + renderCatalog('schemas') + renderSchemaEditor() + '</section>';
  } else if(state.subTab === 'variables'){
    body = '<section class="ams-workspace">' + renderCatalog('variables') + renderVariableEditor() + '</section>';
  }

  return [
    '<div class="ams">',
      renderHeader(),
      renderSubTabs(),
      state.error ? '<div class="ams-error">' + esc(state.error) + '</div>' : '',
      body,
    '</div>'
  ].join('');
}

function paint(){
  if(!state.container) return;
  ensureStyles();
  bind();

  if(state.loading && !state.loaded){
    state.container.innerHTML = [
      '<div class="ams">',
        '<div class="ams-loading">' + esc(T('Dang tai metadata studio...', 'Loading metadata studio...')) + '</div>',
      '</div>'
    ].join('');
    return;
  }

  state.container.innerHTML = renderWorkspace();
  applyFilter('apis', state.apiSearch);
  applyFilter('fields', state.fieldSearch);
  applyFilter('tables', state.tableSearch);
  applyFilter('schemas', state.schemaSearch);
  applyFilter('variables', state.variableSearch);
}

function render(container){
  state.container = container;
  ensureStyles();
  bind();
  paint();
  loadSummary(false);
}

window._renderAdminMetadataStudio = render;

})();

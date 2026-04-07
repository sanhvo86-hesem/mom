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
    '.ams-hero,.ams-sidecard,.ams-list,.ams-editor,.ams-overview-card,.ams-benchmark{background:var(--bg-surface,#fff);border:1px solid var(--border,#dbe4f0);border-radius:22px;box-shadow:0 16px 40px rgba(15,23,42,.04)}',
    '.ams-hero{padding:24px;background:linear-gradient(140deg,color-mix(in srgb, var(--amber,#f59e0b) 8%, var(--bg-surface,#fff)) 0%,color-mix(in srgb, var(--blue,#3b82f6) 7%, var(--bg-surface,#fff)) 52%,color-mix(in srgb, var(--purple,#8b5cf6) 8%, var(--bg-surface,#fff)) 100%)}',
    '.ams-kicker{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--amber,#9a3412)}',
    '.ams-hero h3{margin:10px 0 8px;font-size:28px;line-height:1.08;color:var(--text-primary,#102a43)}',
    '.ams-hero p,.ams-editor-title p,.ams-sidecard p,.ams-help,.ams-principle p{margin:0;color:var(--text-secondary,#52667a);line-height:1.6;font-size:13px}',
    '.ams-sidecard{padding:18px 20px;display:grid;gap:12px}',
    '.ams-sidecard h4,.ams-list h4,.ams-editor h4,.ams-benchmark h4{margin:0;color:var(--text-primary,#102a43)}',
    '.ams-pillrow,.ams-subtabs,.ams-actions,.ams-inline-actions,.ams-focus-list,.ams-item-meta{display:flex;flex-wrap:wrap;gap:8px}',
    '.ams-pill,.ams-tag,.ams-focus{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700}',
    '.ams-pill{background:color-mix(in srgb, var(--brand-2,#1d4ed8) 12%, var(--bg-surface,#fff));color:var(--brand-2,#1d4ed8)}',
    '.ams-tag,.ams-focus{background:var(--bg-surface-alt,#f8fafc);color:var(--text-secondary,#475569)}',
    '.ams-tag.method-get{background:color-mix(in srgb, var(--green,#16a34a) 14%, var(--bg-surface,#fff));color:var(--green,#166534)}.ams-tag.method-post{background:color-mix(in srgb, var(--brand-2,#1d4ed8) 12%, var(--bg-surface,#fff));color:var(--brand-2,#1d4ed8)}.ams-tag.method-put,.ams-tag.method-patch{background:color-mix(in srgb, var(--amber,#f59e0b) 14%, var(--bg-surface,#fff));color:var(--amber,#92400e)}.ams-tag.method-delete{background:color-mix(in srgb, var(--red,#dc2626) 12%, var(--bg-surface,#fff));color:var(--red,#b91c1c)}',
    '.ams-subtab,.ams-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;transition:.16s;text-decoration:none;border:none}',
    '.ams-subtab{border:1px solid var(--border,#dbe4f0);background:var(--bg-surface,#fff);color:var(--text-secondary,#334e68);border-radius:999px}',
    '.ams-subtab.active{background:var(--brand-2,#102a43);border-color:var(--brand-2,#102a43);color:var(--text-inverse,#fff);box-shadow:0 14px 28px rgba(16,42,67,.16)}',
    '.ams-btn-primary{background:var(--brand-2,#102a43);color:var(--text-inverse,#fff);box-shadow:0 16px 32px rgba(16,42,67,.18)}.ams-btn-secondary{background:color-mix(in srgb, var(--brand-2,#1e3a8a) 10%, var(--bg-surface,#fff));color:var(--brand-2,#1e3a8a)}.ams-btn-ghost{background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);border:1px solid var(--border,#dbe4f0)}.ams-btn-danger{background:color-mix(in srgb, var(--red,#dc2626) 10%, var(--bg-surface,#fff));color:var(--red,#991b1b)}',
    '.ams-metrics,.ams-overview-grid,.ams-principles,.ams-grid,.ams-workspace,.ams-kv{display:grid;gap:12px}',
    '.ams-metrics{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}.ams-overview-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.ams-principles{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.ams-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.ams-workspace{grid-template-columns:320px minmax(0,1fr);gap:16px;align-items:start}.ams-kv{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}',
    '.ams-overview-card,.ams-benchmark,.ams-principle,.ams-kv-card,.ams-section{padding:16px 18px}',
    '.ams-overview-card .label,.ams-kv-card .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary,#64748b);font-weight:800}',
    '.ams-overview-card .value{margin-top:8px;font-size:28px;font-weight:800;color:var(--text-primary,#102a43)}.ams-overview-card .sub{margin-top:6px;font-size:12px;color:var(--text-tertiary,#64748b)}',
    '.ams-principle,.ams-kv-card,.ams-section{border:1px solid var(--border,#dbe4f0);border-radius:18px;background:var(--bg-surface,#fff)}.ams-section{background:var(--bg-surface-alt,#f8fafc)}.ams-kv-card .v{margin-top:7px;font-size:17px;font-weight:800;color:var(--text-primary,#102a43);word-break:break-word}',
    '.ams-list{padding:14px;display:grid;gap:12px;position:sticky;top:12px}.ams-editor{padding:18px 20px;display:grid;gap:16px;min-height:520px}.ams-list-head,.ams-section-head,.ams-editor-top,.ams-item-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}',
    '.ams-search,.ams-input,.ams-select,.ams-textarea{width:100%;padding:10px 12px;border:1px solid var(--border,#cbd5e1);border-radius:14px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#102a43);font-family:inherit}.ams-search{background:var(--bg-surface-alt,#f8fafc)}.ams-textarea{min-height:94px;resize:vertical;line-height:1.55}',
    '.ams-catalog{display:grid;gap:8px;max-height:72vh;overflow:auto;padding-right:4px}.ams-item{padding:12px 14px;border-radius:16px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);cursor:pointer;display:grid;gap:6px;transition:.16s;text-align:left;color:var(--text-primary,#102a43)}.ams-item.active{background:color-mix(in srgb, var(--brand-2,#3b82f6) 12%, var(--bg-surface,#fff));border-color:var(--brand-2,#3b82f6)}',
    '.ams-item-title{font-size:13px;font-weight:800;color:var(--text-primary,#102a43)}.ams-note,.ams-error,.ams-empty,.ams-loading{padding:12px 14px;border-radius:16px;font-size:13px;line-height:1.6}.ams-note{background:color-mix(in srgb, var(--amber,#f59e0b) 12%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber,#f59e0b) 24%, var(--border,#fdba74));color:var(--amber,#9a3412)}.ams-error{background:color-mix(in srgb, var(--red,#dc2626) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--red,#dc2626) 24%, var(--border,#fda4af));color:var(--red,#9f1239)}.ams-empty{display:grid;place-items:center;min-height:260px;border:1px dashed var(--border,#cbd5e1);background:var(--bg-surface-alt,#f8fafc);color:var(--text-tertiary,#64748b);text-align:center}.ams-loading{display:grid;place-items:center;min-height:220px;color:var(--text-secondary,#52667a)}',
    '.ams-field{display:grid;gap:6px}.ams-field label,.ams-check{font-size:12px;color:var(--text-secondary,#334155);font-weight:700}.ams-check{display:flex;align-items:center;gap:8px}.ams-check input{width:16px;height:16px}',
    '.ams-table-wrap{overflow:auto;border-radius:16px;border:1px solid var(--border,#dbe4f0);background:var(--bg-surface,#fff)}.ams-table{width:100%;border-collapse:collapse;font-size:12px;min-width:760px}.ams-table th{padding:10px 12px;background:var(--bg-surface-alt,#f8fafc);color:var(--text-tertiary,#64748b);text-transform:uppercase;letter-spacing:.06em;font-size:10px;text-align:left;border-bottom:1px solid var(--border,#e2e8f0);vertical-align:bottom}.ams-table td{padding:10px 12px;border-bottom:1px solid color-mix(in srgb, var(--border,#e2e8f0) 78%, transparent);vertical-align:top;color:var(--text-primary,#102a43)}.ams-table td .ams-input,.ams-table td .ams-select,.ams-table td .ams-textarea{font-size:12px;padding:8px 9px;border-radius:12px}',
    '.ams-link,.ams-benchmark a{color:var(--text-link,#0f62fe);text-decoration:none;font-weight:700}.ams-benchmark a:hover,.ams-link:hover{text-decoration:underline}',
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
  var schemaStudioCoverage = overview.schemaStudioCanonicalCoverage || 0;
  var schemaStudioReleaseCount = overview.schemaStudioReleaseCount || 0;
  var visualReadiness = overview.schemaStudioVisualReadiness || 0;
  var metadataCompleteness = overview.schemaStudioMetadataCompleteness || 0;
  var workflowCoverage = overview.schemaStudioWorkflowCoverage || 0;
  var hotspotCount = overview.schemaStudioHotspots || 0;
  var governanceCoverage = overview.schemaStudioGovernanceCoverage || 0;
  var journeyReadiness = overview.schemaStudioJourneyReadiness || 0;
  var blockerCount = overview.schemaStudioBlockers || 0;
  var performancePosture = overview.schemaStudioPerformancePosture || 0;
  var registrySync = overview.schemaStudioRegistrySync || 0;
  var complianceReadiness = overview.schemaStudioComplianceReadiness || 0;
  var aiCopilotReadiness = overview.schemaStudioAICopilotReadiness || 0;
  var experienceScore = overview.schemaStudioExperienceScore || 0;
  var operationsScore = overview.schemaStudioOperationsScore || 0;
  var promotionReadiness = overview.schemaStudioPromotionReadiness || 0;
  var firewallScore = overview.schemaStudioFirewallScore || 0;
  var observabilityScore = overview.schemaStudioObservabilityScore || 0;
  var personaCount = overview.schemaStudioPersonaCount || 0;
  var playbookCount = overview.schemaStudioPlaybookCount || 0;
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
          '<span class="ams-pill">' + esc(T('Schema Studio releases: ', 'Schema Studio releases: ')) + esc(schemaStudioReleaseCount) + '</span>',
          '<span class="ams-pill">' + esc(T('Canonical coverage: ', 'Canonical coverage: ')) + esc(schemaStudioCoverage) + '%</span>',
          '<span class="ams-pill">' + esc(T('Visual readiness: ', 'Visual readiness: ')) + esc(visualReadiness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Metadata completeness: ', 'Metadata completeness: ')) + esc(metadataCompleteness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Workflow coverage: ', 'Workflow coverage: ')) + esc(workflowCoverage) + '%</span>',
          '<span class="ams-pill">' + esc(T('Governance: ', 'Governance: ')) + esc(governanceCoverage) + '%</span>',
          '<span class="ams-pill">' + esc(T('Journey readiness: ', 'Journey readiness: ')) + esc(journeyReadiness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Hotspots: ', 'Hotspots: ')) + esc(hotspotCount) + '</span>',
          '<span class="ams-pill">' + esc(T('Blockers: ', 'Blockers: ')) + esc(blockerCount) + '</span>',
          '<span class="ams-pill">' + esc(T('Experience: ', 'Experience: ')) + esc(experienceScore) + '%</span>',
          '<span class="ams-pill">' + esc(T('Operations: ', 'Operations: ')) + esc(operationsScore) + '%</span>',
          '<span class="ams-pill">' + esc(T('Promotion: ', 'Promotion: ')) + esc(promotionReadiness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Firewall: ', 'Firewall: ')) + esc(firewallScore) + '%</span>',
          '<span class="ams-pill">' + esc(T('Observability: ', 'Observability: ')) + esc(observabilityScore) + '%</span>',
          '<span class="ams-pill">' + esc(T('Compliance: ', 'Compliance: ')) + esc(complianceReadiness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Performance: ', 'Performance: ')) + esc(performancePosture) + '%</span>',
          '<span class="ams-pill">' + esc(T('Registry sync: ', 'Registry sync: ')) + esc(registrySync) + '%</span>',
          '<span class="ams-pill">' + esc(T('AI copilot: ', 'AI copilot: ')) + esc(aiCopilotReadiness) + '%</span>',
          '<span class="ams-pill">' + esc(T('Personas / playbooks: ', 'Personas / playbooks: ')) + esc(personaCount + ' / ' + playbookCount) + '</span>',
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
          '<div class="ams-kv-card"><div class="k">' + esc(T('Schema Studio policies', 'Schema Studio policies')) + '</div><div class="v">' + esc(overview.schemaStudioPolicyCount || 0) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Canonical critical gaps', 'Canonical critical gaps')) + '</div><div class="v">' + esc(overview.schemaStudioCriticalGaps || 0) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Visual readiness', 'Visual readiness')) + '</div><div class="v">' + esc(visualReadiness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Metadata completeness', 'Metadata completeness')) + '</div><div class="v">' + esc(metadataCompleteness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Workflow coverage', 'Workflow coverage')) + '</div><div class="v">' + esc(workflowCoverage) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Governance coverage', 'Governance coverage')) + '</div><div class="v">' + esc(governanceCoverage) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Journey readiness', 'Journey readiness')) + '</div><div class="v">' + esc(journeyReadiness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Graph density', 'Graph density')) + '</div><div class="v">' + esc(overview.schemaStudioGraphDensity || 0) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Orphan relation risk', 'Orphan relation risk')) + '</div><div class="v">' + esc(overview.schemaStudioOrphanRisk || 0) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Hotspots', 'Hotspots')) + '</div><div class="v">' + esc(hotspotCount) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Blockers', 'Blockers')) + '</div><div class="v">' + esc(blockerCount) + '</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Experience score', 'Experience score')) + '</div><div class="v">' + esc(experienceScore) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Operations score', 'Operations score')) + '</div><div class="v">' + esc(operationsScore) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Promotion readiness', 'Promotion readiness')) + '</div><div class="v">' + esc(promotionReadiness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Firewall score', 'Firewall score')) + '</div><div class="v">' + esc(firewallScore) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Observability', 'Observability')) + '</div><div class="v">' + esc(observabilityScore) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Compliance readiness', 'Compliance readiness')) + '</div><div class="v">' + esc(complianceReadiness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Performance posture', 'Performance posture')) + '</div><div class="v">' + esc(performancePosture) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Registry sync', 'Registry sync')) + '</div><div class="v">' + esc(registrySync) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('AI copilot', 'AI copilot')) + '</div><div class="v">' + esc(aiCopilotReadiness) + '%</div></div>',
          '<div class="ams-kv-card"><div class="k">' + esc(T('Persona / playbook', 'Persona / playbook')) + '</div><div class="v">' + esc(personaCount + ' / ' + playbookCount) + '</div></div>',
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
  var schemaStudio = summary.schemaStudio || {};
  var schemaStudioManifest = schemaStudio.manifest || {};
  var schemaStudioReleaseLog = ensureArray(schemaStudio.releaseLog);
  var schemaStudioDiagnostics = schemaStudio.diagnostics || {};
  var schemaStudioExperience = schemaStudio.experienceReport || {};
  var schemaStudioOperations = schemaStudio.operationsReport || {};
  var schemaStudioSummary = (schemaStudioManifest.summary || {});
  var experienceSummary = schemaStudioExperience.summary || {};
  var operationsSummary = schemaStudioOperations.summary || {};
  var hotspotItems = ensureArray(schemaStudioDiagnostics.hotspots).slice(0, 6);
  var recommendationItems = ensureArray(schemaStudioDiagnostics.recommendations).slice(0, 5);
  var blockerItems = ensureArray(schemaStudioDiagnostics.blockers).slice(0, 5);
  var journeyItems = ensureArray(schemaStudioDiagnostics.journeys).slice(0, 4);
  var personaItems = ensureArray(schemaStudioDiagnostics.personas || schemaStudioExperience.personas).slice(0, 4);
  var playbookItems = ensureArray(schemaStudioDiagnostics.playbooks || schemaStudioExperience.playbooks).slice(0, 4);
  var copilotItems = ensureArray(schemaStudioDiagnostics.aiCopilot || schemaStudioExperience.aiCopilot).slice(0, 4);
  var focusDeckItems = ensureArray(schemaStudioDiagnostics.focusDeck || schemaStudioExperience.focusDeck || schemaStudioOperations.focusDeck).slice(0, 4);
  var promotionItems = ensureArray(schemaStudioDiagnostics.promotionBoard || schemaStudioOperations.promotionBoard).slice(0, 5);
  var branchItems = ensureArray(schemaStudioDiagnostics.branchTopology || schemaStudioExperience.branchTopology || schemaStudioOperations.branchTopology).slice(0, 4);
  var environmentItems = ensureArray(schemaStudioDiagnostics.environments || schemaStudioOperations.environments).slice(0, 4);
  var eventRailItems = ensureArray(schemaStudioDiagnostics.eventRail || schemaStudioExperience.eventRail || schemaStudioOperations.eventRail).slice(0, 4);
  var firewall = schemaStudioDiagnostics.firewall || schemaStudioExperience.firewall || schemaStudioOperations.firewall || {};
  var observability = schemaStudioDiagnostics.observability || schemaStudioExperience.observability || schemaStudioOperations.observability || {};
  var observabilityTiles = ensureArray(observability.tiles).slice(0, 4);

  return [
    '<section class="ams-metrics">',
      '<article class="ams-overview-card"><div class="label">' + esc(T('API catalog', 'API catalog')) + '</div><div class="value">' + esc(overview.endpointCount || 0) + '</div><div class="sub">' + esc(T('Endpoint metadata co owner/module/domain', 'Endpoint metadata with owner/module/domain')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('DB tables', 'DB tables')) + '</div><div class="value">' + esc(overview.tableCount || 0) + '</div><div class="sub">' + esc(T('Table registry va column mapping', 'Table registry and column mapping')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Schema groups', 'Schema groups')) + '</div><div class="value">' + esc(overview.schemaCount || 0) + '</div><div class="sub">' + esc(T('Blueprint nghiep vu va migration', 'Business blueprints and migrations')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Reusable variables', 'Reusable variables')) + '</div><div class="value">' + esc(overview.variableCount || 0) + '</div><div class="sub">' + esc(T('Dung lai cho form, document, automation', 'Reused across forms, documents, and automation')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Schema Studio projections', 'Schema Studio projections')) + '</div><div class="value">' + esc(overview.schemaStudioProjectionCount || 0) + '</div><div class="sub">' + esc(T('Runtime projection compiler output', 'Runtime projection compiler output')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Canonical coverage', 'Canonical coverage')) + '</div><div class="value">' + esc(overview.schemaStudioCanonicalCoverage || 0) + '%</div><div class="sub">' + esc(T('ERP/MES/eQMS capability coverage', 'ERP/MES/eQMS capability coverage')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Operations score', 'Operations score')) + '</div><div class="value">' + esc(overview.schemaStudioOperationsScore || operationsSummary.operationsScore || 0) + '%</div><div class="sub">' + esc(T('Do san sang van hanh control plane va release cockpit', 'Control-plane operating and release-cockpit readiness')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Promotion / firewall', 'Promotion / firewall')) + '</div><div class="value">' + esc((overview.schemaStudioPromotionReadiness || operationsSummary.promotionReadinessScore || 0) + '% / ' + (overview.schemaStudioFirewallScore || operationsSummary.firewallScore || 0) + '%') + '</div><div class="sub">' + esc(T('Gate readiness va destructive change discipline', 'Gate readiness and destructive-change discipline')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Observability / command center', 'Observability / command center')) + '</div><div class="value">' + esc((overview.schemaStudioObservabilityScore || operationsSummary.observabilityScore || 0) + '% / ' + (overview.schemaStudioCommandCenterScore || operationsSummary.commandCenterScore || 0) + '%') + '</div><div class="sub">' + esc(T('Scale posture, cockpit clarity, release signal quality', 'Scale posture, cockpit clarity, and release-signal quality')) + '</div></article>',
      '<article class="ams-overview-card"><div class="label">' + esc(T('Focus decks / branches', 'Focus decks / branches')) + '</div><div class="value">' + esc((overview.schemaStudioFocusDeckCount || operationsSummary.focusDeckCount || focusDeckItems.length || 0) + ' / ' + (overview.schemaStudioBranchCount || operationsSummary.branchCount || branchItems.length || 0)) + '</div><div class="sub">' + esc(T('Curated review views va topology branch/promotion', 'Curated review views and branch/promotion topology')) + '</div></article>',
    '</section>',
    ((overview.schemaStudioProjectionCount || 0) || (overview.schemaStudioReleaseCount || 0) ? '<section class="ams-overview-grid"><article class="ams-benchmark"><h4>' + esc(T('Schema Studio enterprise compiler', 'Schema Studio enterprise compiler')) + '</h4><p>' + esc(T('Bang thong ke nay tong hop runtime projections, release bundles, policy coverage va canonical posture duoc sinh tu Schema Studio enterprise control plane.', 'This summary consolidates runtime projections, release bundles, policy coverage, and canonical posture generated by the Schema Studio enterprise control plane.')) + '</p><div class="ams-grid" style="margin-top:14px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Runtime projections', 'Runtime projections')) + '</strong><div class="ams-help">' + esc(T('Table + relation + field registry projections', 'Table + relation + field registry projections')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioProjectionCount || 0) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Release bundles', 'Release bundles')) + '</strong><div class="ams-help">' + esc(T('Typed diff, risk score, approval class', 'Typed diff, risk score, approval class')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioReleaseCount || 0) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Policy coverage', 'Policy coverage')) + '</strong><div class="ams-help">' + esc(T('RLS va governance policies duoc model hoa', 'RLS and governance policies modeled declaratively')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioPolicyCount || 0) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Last releases', 'Last releases')) + '</strong><div class="ams-help">' + esc(T('Ban phat hanh moi nhat tu control plane', 'Most recent control plane release bundles')) + '</div></div></div><div style="margin-top:10px">' + (schemaStudioReleaseLog.length ? schemaStudioReleaseLog.slice(0, 3).map(function(item){ return '<div class="ams-help" style="margin-bottom:6px"><strong>' + esc(item.name || item.id || '') + '</strong> · ' + esc(item.approvalClass || 'standard') + ' · ' + esc(item.compatibilityScore || 0) + '%</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co release bundle', 'No release bundles yet')) + '</div>') + '</div></div></div></article></section>' : ''),
    ((overview.schemaStudioVisualReadiness || 0) || hotspotItems.length || recommendationItems.length ? '<section class="ams-overview-grid"><article class="ams-benchmark"><h4>' + esc(T('Schema Studio world-class cockpit', 'Schema Studio world-class cockpit')) + '</h4><p>' + esc(T('Lop diagnostics nay mo rong enterprise compiler thanh control tower danh gia do dep, do ro, do day metadata, workflow binding va diem nong can xu ly trong mo hinh schema.', 'This diagnostics layer extends the enterprise compiler into a control tower that scores visual clarity, metadata depth, workflow binding, and hotspots that still need remediation across the schema model.')) + '</p><div class="ams-grid" style="margin-top:14px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Visual readiness', 'Visual readiness')) + '</strong><div class="ams-help">' + esc(T('Kha nang doc/quan tri/so sanh tren canvas lon', 'Readability/governance/compare readiness on large canvases')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioVisualReadiness || schemaStudioSummary.visualReadinessScore || 0) + '%</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Metadata completeness', 'Metadata completeness')) + '</strong><div class="ams-help">' + esc(T('Owner/steward/domain/layer/workflow/semantic tags', 'Owner/steward/domain/layer/workflow/semantic tags')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioMetadataCompleteness || schemaStudioSummary.metadataCompletenessPercent || 0) + '%</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Workflow coverage', 'Workflow coverage')) + '</strong><div class="ams-help">' + esc(T('Bang duoc lien ket voi workflow/runtime contract', 'Tables linked to workflow/runtime contracts')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc(overview.schemaStudioWorkflowCoverage || schemaStudioSummary.workflowBindingCoveragePercent || 0) + '%</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Graph density / orphan risk', 'Graph density / orphan risk')) + '</strong><div class="ams-help">' + esc(T('Do day relation va nguy co mo co metadata', 'Relation richness versus metadata orphan risk')) + '</div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioGraphDensity || schemaStudioSummary.graphDensityScore || 0) + ' / ' + (overview.schemaStudioOrphanRisk || schemaStudioSummary.orphanRelationRiskCount || 0)) + '</div></div></div><div class="ams-grid" style="margin-top:16px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Top hotspots', 'Top hotspots')) + '</strong><div class="ams-help">' + esc(T('Bang uu tien can bo sung metadata, policy, workflow hoac relation hygiene', 'Priority tables needing metadata, policy, workflow, or relation hygiene upgrades')) + '</div></div></div><div style="margin-top:10px">' + (hotspotItems.length ? hotspotItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.table || item.tableName || item.id || '-') + '</strong> · ' + esc((item.score || 0) + ' pts') + (item.reason ? ' · ' + esc(item.reason) : '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co hotspot nao duoc ghi nhan', 'No hotspots recorded yet')) + '</div>') + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Recommendations', 'Recommendations')) + '</strong><div class="ams-help">' + esc(T('Checklist de day metadata, giam risk va dep hon tren canvas', 'Checklist to deepen metadata, reduce risk, and improve visual clarity on canvas')) + '</div></div></div><div style="margin-top:10px">' + (recommendationItems.length ? recommendationItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px">• ' + esc(item) + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('He thong chua sinh recommendation', 'No recommendations generated yet')) + '</div>') + '</div></div></div></article></section>' : ''),
    ((overview.schemaStudioGovernanceCoverage || 0) || blockerItems.length || journeyItems.length ? '<section class="ams-overview-grid"><article class="ams-benchmark"><h4>' + esc(T('Schema Studio mission control round 3', 'Schema Studio mission control round 3')) + '</h4><p>' + esc(T('Round 3 day diagnostics thanh ban do van hanh: governance coverage, journey readiness, blocker board, release radar va cac storyline de review nhanh theo manufacturing / quality / compliance.', 'Round 3 turns diagnostics into an operating map: governance coverage, journey readiness, blocker board, release radar, and fast-review storylines for manufacturing, quality, and compliance.')) + '</p><div class="ams-grid" style="margin-top:14px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Governance / journey / radar', 'Governance / journey / radar')) + '</strong><div class="ams-help">' + esc(T('Ba thang do moi cua control plane world-class', 'Three new control-plane gauges for world-class readiness')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioGovernanceCoverage || 0) + '% / ' + (overview.schemaStudioJourneyReadiness || 0) + '% / ' + (overview.schemaStudioReleaseRadar || 0) + '%') + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('Governance, journey orchestration va release radar can duoc day song song de studio tro thanh control tower that su.', 'Governance, journey orchestration and release radar need to move together for the studio to become a true control tower.')) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Domains / layers / storyboards', 'Domains / layers / storyboards')) + '</strong><div class="ams-help">' + esc(T('Do rong cua enterprise canvas va cac man hinh review san co', 'Breadth of the enterprise canvas and ready-made review screens')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioDomainCount || 0) + ' / ' + (overview.schemaStudioLayerCount || 0) + ' / ' + (overview.schemaStudioStoryboardCount || 0)) + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('So domain, layer va storyboard da duoc cockpit nhan dien/seed san.', 'Number of domains, layers, and storyboards currently recognized or seeded by the cockpit.')) + '</div></div></div><div class="ams-grid" style="margin-top:16px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Blocker board', 'Blocker board')) + '</strong><div class="ams-help">' + esc(T('Cac rao chan can xu ly de release va onboarding nhanh hon', 'Constraints that must be addressed to accelerate release and onboarding')) + '</div></div></div></div><div style="margin-top:10px">' + (blockerItems.length ? blockerItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.title || item.key || '-') + '</strong> · ' + esc(item.severity || 'info') + ' · ' + esc(item.nextAction || item.detail || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co blocker nao duoc ghi nhan', 'No blockers recorded yet')) + '</div>') + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Manufacturing / QMS journeys', 'Manufacturing / QMS journeys')) + '</strong><div class="ams-help">' + esc(T('Cac storyline de review nhanh phan plan-execute-quality-compliance-traceability', 'Storylines for fast review across plan-execute-quality-compliance-traceability')) + '</div></div></div></div><div style="margin-top:10px">' + (journeyItems.length ? journeyItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.label || item.key || '-') + '</strong> · ' + esc((item.readinessScore || 0) + '%') + ' · ' + esc((ensureArray(item.tablesPresent).length || 0) + '/' + (ensureArray(item.requiredTables).length || 0)) + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('He thong chua sinh journey diagnostics', 'No journey diagnostics generated yet')) + '</div>') + '</div></div></div></article></section>' : ''),
    (((overview.schemaStudioExperienceScore || experienceSummary.experienceScore || 0) || personaItems.length || playbookItems.length || copilotItems.length) ? '<section class="ams-overview-grid"><article class="ams-benchmark"><h4>' + esc(T('Schema Studio experience engine round 4', 'Schema Studio experience engine round 4')) + '</h4><p>' + esc(T('Round 4 bo sung lop giao dien executive glass, persona rails, release lanes, AI copilots va render insights de studio khong chi manh ma con cuc ky truc quan va dep.', 'Round 4 adds executive glass UI, persona rails, release lanes, AI copilots, and render insights so the studio becomes not only powerful but also highly visual and beautiful.')) + '</p><div class="ams-grid" style="margin-top:14px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Experience / compliance / performance', 'Experience / compliance / performance')) + '</strong><div class="ams-help">' + esc(T('Ba thang do moi cua mission control round 4', 'Three new gauges introduced by the round 4 mission control layer')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioExperienceScore || experienceSummary.experienceScore || 0) + '% / ' + (overview.schemaStudioComplianceReadiness || experienceSummary.complianceReadinessScore || 0) + '% / ' + (overview.schemaStudioPerformancePosture || experienceSummary.performancePostureScore || 0) + '%') + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('Experience score danh gia do dep + do ro + do san sang review; compliance readiness danh gia governance/evidence/policy; performance posture danh gia scale va readability.', 'Experience score reflects visual polish + clarity + review readiness; compliance readiness tracks governance/evidence/policy; performance posture tracks scale and readability.')) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Registry / AI / personas', 'Registry / AI / personas')) + '</strong><div class="ams-help">' + esc(T('Schema-to-runtime posture, prompt intelligence va role-aware modes', 'Schema-to-runtime posture, prompt intelligence, and role-aware modes')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioRegistrySync || experienceSummary.registrySyncScore || 0) + '% / ' + (overview.schemaStudioAICopilotReadiness || experienceSummary.aiCopilotReadinessScore || 0) + '% / ' + ((overview.schemaStudioPersonaCount || personaItems.length || 0) + ' / ' + (overview.schemaStudioPlaybookCount || playbookItems.length || 0))) + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('Cac metric nay mo ta studio da san sang den muc nao de day metadata sang registry va su dung AI co kiem soat.', 'These metrics show how ready the studio is to project metadata into runtime registries and to use AI in a controlled way.')) + '</div></div></div><div class="ams-grid" style="margin-top:16px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Persona rails', 'Persona rails')) + '</strong><div class="ams-help">' + esc(T('Che do xem cho architect, manufacturing, quality, compliance va builder', 'View modes for architects, manufacturing, quality, compliance, and builders')) + '</div></div></div></div><div style="margin-top:10px">' + (personaItems.length ? personaItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.label || item.key || '-') + '</strong> · ' + esc((item.readinessScore || 0) + '%') + ' · ' + esc(item.focus || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co persona mode nao duoc sinh', 'No persona modes have been generated yet')) + '</div>') + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Playbooks / AI copilots', 'Playbooks / AI copilots')) + '</strong><div class="ams-help">' + esc(T('Checklist review san co va prompt AI de thao tac nhanh', 'Ready-made review checklists and AI prompts for fast action')) + '</div></div></div></div><div style="margin-top:10px">' + (playbookItems.length ? playbookItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.title || item.key || '-') + '</strong> · ' + esc((item.readinessScore || 0) + '%') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co playbook nao duoc sinh', 'No playbooks generated yet')) + '</div>') + (copilotItems.length ? '<div class="ams-help" style="margin-top:12px"><strong>' + esc(T('AI copilots', 'AI copilots')) + ':</strong><br>' + copilotItems.map(function(item){ return '• ' + esc(item.title || item.key || '-'); }).join('<br>') + '</div>' : '') + '</div></div></div></article></section>' : ''),
    (((overview.schemaStudioOperationsScore || operationsSummary.operationsScore || 0) || promotionItems.length || focusDeckItems.length || branchItems.length || observabilityTiles.length) ? '<section class="ams-overview-grid"><article class="ams-benchmark"><h4>' + esc(T('Schema Studio command center round 5', 'Schema Studio command center round 5')) + '</h4><p>' + esc(T('Round 5 day mission control thanh release command center that su: co operations score, promotion board, destructive-change firewall, branch topology, focus decks va observability tiles de review nhanh ma van rat ky luat.', 'Round 5 turns mission control into a true release command center with an operations score, promotion board, destructive-change firewall, branch topology, focus decks, and observability tiles for fast but disciplined reviews.')) + '</p><div class="ams-grid" style="margin-top:14px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Operations / promotion / firewall', 'Operations / promotion / firewall')) + '</strong><div class="ams-help">' + esc(T('Ba thang do moi cua round 5', 'Three new round 5 operating gauges')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioOperationsScore || operationsSummary.operationsScore || 0) + '% / ' + (overview.schemaStudioPromotionReadiness || operationsSummary.promotionReadinessScore || 0) + '% / ' + (overview.schemaStudioFirewallScore || operationsSummary.firewallScore || 0) + '%') + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('Operations score danh gia kha nang van hanh cockpit; promotion readiness danh gia gate review; firewall score danh gia ky luat doi voi change pha vo.', 'Operations score measures cockpit operating maturity; promotion readiness measures gate review posture; firewall score measures discipline against breaking changes.')) + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Observability / command center', 'Observability / command center')) + '</strong><div class="ams-help">' + esc(T('Scale, registry freshness va signal quality sau release', 'Scale, registry freshness, and post-release signal quality')) + '</div></div></div></div><div style="margin-top:10px;font-size:28px;font-weight:700">' + esc((overview.schemaStudioObservabilityScore || operationsSummary.observabilityScore || 0) + '% / ' + (overview.schemaStudioCommandCenterScore || operationsSummary.commandCenterScore || 0) + '%') + '</div><div class="ams-help" style="margin-top:8px">' + esc(T('Observability tap trung vao tile scale/readability; command center score tong hop release + firewall + journeys + UX control.', 'Observability focuses on scale/readability tiles; command center score blends release, firewall, journeys, and UX control.')) + '</div></div></div><div class="ams-grid" style="margin-top:16px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Promotion board', 'Promotion board')) + '</strong><div class="ams-help">' + esc(T('Tuyen review mac dinh de dua schema tu workspace ra production', 'Default review route for moving schema from workspace to production')) + '</div></div></div></div><div style="margin-top:10px">' + (promotionItems.length ? promotionItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.label || item.key || '-') + '</strong> · ' + esc((item.score || 0) + '%') + ' · ' + esc(item.status || '') + ' · ' + esc(item.gate || item.nextAction || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co promotion board', 'No promotion board yet')) + '</div>') + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Firewall / focus decks', 'Firewall / focus decks')) + '</strong><div class="ams-help">' + esc(T('Gate destructive change va cac view review san co', 'Destructive-change gate and curated review decks')) + '</div></div></div></div><div style="margin-top:10px">' + '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(T('Lane', 'Lane')) + ':</strong> ' + esc(firewall.recommendedLane || firewall.approvalClass || 'standard') + ' · <strong>' + esc(T('Compat', 'Compat')) + ':</strong> ' + esc((firewall.compatibilityScore || schemaStudioSummary.compatibilityScore || 0) + '%') + ' · <strong>' + esc(T('Risk', 'Risk')) + ':</strong> ' + esc((firewall.riskScore || schemaStudioSummary.riskScore || 0) + '/100') + '</div>' + (focusDeckItems.length ? focusDeckItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.title || item.key || '-') + '</strong> · ' + esc((item.score || 0) + '%') + ' · ' + esc(item.focus || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co focus deck', 'No focus deck yet')) + '</div>') + '</div></div></div><div class="ams-grid" style="margin-top:16px"><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Branch topology / environments', 'Branch topology / environments')) + '</strong><div class="ams-help">' + esc(T('Branch van hanh va environment review duoc de xuat boi control plane', 'Operational branches and review environments proposed by the control plane')) + '</div></div></div></div><div style="margin-top:10px">' + (branchItems.length ? branchItems.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.label || item.key || '-') + '</strong> · ' + esc((item.score || 0) + '%') + ' · ' + esc(item.lane || '') + ' · ' + esc(item.focus || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co branch topology', 'No branch topology yet')) + '</div>') + (environmentItems.length ? '<div class="ams-help" style="margin-top:12px"><strong>' + esc(T('Environments', 'Environments')) + ':</strong><br>' + environmentItems.map(function(item){ return '• ' + esc((item.label || item.key || '-')) + ' · ' + esc((item.score || 0) + '%') + ' · ' + esc(item.status || ''); }).join('<br>') + '</div>' : '') + '</div></div><div class="ams-section"><div class="ams-item-title"><div><strong>' + esc(T('Observability / event rail', 'Observability / event rail')) + '</strong><div class="ams-help">' + esc(T('Tile scale/readability va timeline review', 'Scale/readability tiles and review timeline')) + '</div></div></div></div><div style="margin-top:10px">' + (observabilityTiles.length ? observabilityTiles.map(function(item){ return '<div class="ams-help" style="margin-bottom:8px"><strong>' + esc(item.label || item.key || '-') + '</strong> · ' + esc((item.score || 0) + '%') + ' · ' + esc(item.detail || '') + '</div>'; }).join('') : '<div class="ams-help">' + esc(T('Chua co observability tile', 'No observability tiles yet')) + '</div>') + (eventRailItems.length ? '<div class="ams-help" style="margin-top:12px"><strong>' + esc(T('Event rail', 'Event rail')) + ':</strong><br>' + eventRailItems.map(function(item){ return '• ' + esc(item.label || item.key || '-') + ' · ' + esc(item.status || '') + ' · ' + esc(item.detail || ''); }).join('<br>') + '</div>' : '') + '</div></div></div></article></section>' : ''),
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


/* ── Admin Metadata Studio Round 6 Command Deck ───────────────────────── */
(function(win){
  'use strict';
  if(!win || !win._renderAdminMetadataStudio) return;
  if(win._renderAdminMetadataStudio.__round6Patched) return;

  var state = { container:null, summary:null, loading:false, observer:null };

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
    if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
    if((method || 'GET') === 'GET'){
      return fetch('api.php?action=' + encodeURIComponent(action), { credentials:'include' }).then(function(r){ return r.json(); });
    }
    return fetch('api.php?action=' + encodeURIComponent(action), {
      method: method || 'POST',
      credentials:'include',
      headers:{ 'Content-Type':'application/json', 'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '') },
      body: JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function ensureStyles(){
    if(document.getElementById('admin-metadata-round6-styles')) return;
    var style = document.createElement('style');
    style.id = 'admin-metadata-round6-styles';
    style.textContent = [
      '.ams-r6-shell{margin-top:18px;display:grid;gap:14px;}',
      '.ams-r6-hero{position:relative;padding:20px;border-radius:24px;background:linear-gradient(135deg,rgba(9,11,24,.96),rgba(18,32,62,.90));border:1px solid rgba(96,165,250,.24);box-shadow:0 22px 54px rgba(2,6,23,.18);overflow:hidden;}',
      '.ams-r6-hero:before,.ams-r6-hero:after{content:"";position:absolute;border-radius:999px;filter:blur(14px);opacity:.48;pointer-events:none;}',
      '.ams-r6-hero:before{width:220px;height:220px;right:-50px;top:-80px;background:radial-gradient(circle,rgba(56,189,248,.34),transparent 68%);}',
      '.ams-r6-hero:after{width:200px;height:200px;left:-50px;bottom:-90px;background:radial-gradient(circle,rgba(168,85,247,.26),transparent 72%);}',
      '.ams-r6-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc;font-weight:800;position:relative;z-index:1;}',
      '.ams-r6-title{margin:8px 0 10px;font-size:26px;line-height:1.1;color:#fff;position:relative;z-index:1;}',
      '.ams-r6-sub{font-size:12px;line-height:1.55;color:#cbd5e1;position:relative;z-index:1;}',
      '.ams-r6-badges,.ams-r6-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:center;position:relative;z-index:1;}',
      '.ams-r6-badges{margin-top:14px;}',
      '.ams-r6-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.12);font-size:11px;font-weight:700;color:#dbeafe;}',
      '.ams-r6-badge.tone-good{border-color:rgba(34,197,94,.28);background:rgba(34,197,94,.10);color:#dcfce7;}',
      '.ams-r6-badge.tone-warning{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.10);color:#fef3c7;}',
      '.ams-r6-badge.tone-critical{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.10);color:#fee2e2;}',
      '.ams-r6-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}',
      '.ams-r6-card{padding:16px;border-radius:22px;background:linear-gradient(180deg,rgba(15,23,42,.62),rgba(15,23,42,.46));border:1px solid rgba(148,163,184,.10);box-shadow:0 14px 34px rgba(2,6,23,.12);}',
      '.ams-r6-card h4{margin:0 0 8px;font-size:15px;color:#fff;}',
      '.ams-r6-list{display:flex;flex-direction:column;gap:10px;margin-top:12px;}',
      '.ams-r6-item{padding:12px 14px;border-radius:16px;border:1px solid rgba(148,163,184,.10);background:rgba(15,23,42,.30);display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}',
      '.ams-r6-metrics{margin-top:16px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;position:relative;z-index:1;}',
      '.ams-r6-metric{padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.56),rgba(15,23,42,.42));border:1px solid rgba(148,163,184,.10);}',
      '.ams-r6-metric strong{display:block;font-size:24px;color:#fff;line-height:1;margin-top:6px;}',
      '.ams-r6-metric.tone-good{border-color:rgba(34,197,94,.18);}',
      '.ams-r6-metric.tone-warning{border-color:rgba(245,158,11,.18);}',
      '.ams-r6-metric.tone-critical{border-color:rgba(239,68,68,.18);}',
      '@media (max-width:1100px){.ams-r6-grid,.ams-r6-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:760px){.ams-r6-grid,.ams-r6-metrics{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function normalizeSummary(payload){
    payload = payload && typeof payload === 'object' ? payload : {};
    var overview = payload.overview || {};
    var schemaStudio = payload.schemaStudio || {};
    var report = schemaStudio.commandCenterReport || {};
    if(!report.summary){
      report = {
        summary: {
          orchestrationScore:num(overview.schemaStudioOrchestrationScore, 0),
          narrativeCoverageScore:num(overview.schemaStudioNarrativeCoverage, 0),
          reviewWallScore:num(overview.schemaStudioReviewWallScore, 0),
          atlasReadinessScore:num(overview.schemaStudioAtlasReadiness, 0),
          livePulseScore:num(overview.schemaStudioLivePulseScore, 0),
          collaborationReadinessScore:num(overview.schemaStudioCollaborationReadiness, 0),
          visualPolishScore:num(overview.schemaStudioVisualPolish, 0),
          sceneCount:num(overview.schemaStudioSceneCount, 0),
          spotlightCount:num(overview.schemaStudioSpotlightCount, 0),
          reviewLaneCount:num(overview.schemaStudioReviewLaneCount, 0),
          atlasCount:num(overview.schemaStudioAtlasCount, 0)
        },
        hero:{
          headline:'Round 6 command deck',
          subheadline:'Admin Metadata Studio now sees the same orchestration, narrative, atlas and live-pulse posture as Schema Studio.',
          commandCenterScore:num(overview.schemaStudioCommandCenterScore, 0)
        },
        spotlight:[],
        reviewWall:{ lanes:[] },
        atlas:[],
        livePulse:{ radar:[] }
      };
    }
    return { overview:overview, report:report };
  }
  function metric(label, value, hint, toneKey){
    return '<div class="ams-r6-metric tone-' + esc(toneKey || 'neutral') + '"><div class="ams-r6-sub">' + esc(label || '-') + '</div><strong>' + esc(value == null ? '-' : value) + '</strong><div class="ams-r6-sub">' + esc(hint || '') + '</div></div>';
  }
  function render(){
    if(!state.container) return;
    var root = state.container.querySelector('.ams');
    if(!root) return;
    var metrics = root.querySelector('.ams-metrics');
    var existing = root.querySelector('.ams-r6-shell');
    if(!metrics){
      if(existing) existing.remove();
      return;
    }
    if(!state.summary) return;
    ensureStyles();
    var data = normalizeSummary(state.summary);
    var overview = data.overview;
    var report = data.report;
    var summary = report.summary || {};
    var hero = report.hero || {};
    var spotlight = arr(report.spotlight).slice(0, 4);
    var lanes = arr(report.reviewWall && report.reviewWall.lanes).slice(0, 5);
    var atlas = arr(report.atlas).slice(0, 4);
    var radar = arr(report.livePulse && report.livePulse.radar).slice(0, 5);
    if(!existing){
      existing = document.createElement('section');
      existing.className = 'ams-r6-shell';
      metrics.insertAdjacentElement('afterend', existing);
    }
    existing.innerHTML = [
      '<section class="ams-r6-hero">',
        '<div class="ams-r6-kicker">Round 6 command deck</div>',
        '<div class="ams-r6-title">' + esc(hero.headline || 'Executive command deck for schema + metadata') + '</div>',
        '<div class="ams-r6-sub">' + esc(hero.subheadline || 'Metadata governance now receives a presentation-grade lens across orchestration, narrative, review wall and live pulse.') + '</div>',
        '<div class="ams-r6-badges">',
          '<span class="ams-r6-badge tone-' + esc(tone(overview.schemaStudioCommandCenterScore || hero.commandCenterScore || 0)) + '">Command center: ' + esc(num(overview.schemaStudioCommandCenterScore || hero.commandCenterScore, 0) + '%') + '</span>',
          '<span class="ams-r6-badge tone-' + esc(tone(summary.orchestrationScore || overview.schemaStudioOrchestrationScore || 0)) + '">Orchestration: ' + esc(num(summary.orchestrationScore || overview.schemaStudioOrchestrationScore, 0) + '%') + '</span>',
          '<span class="ams-r6-badge tone-' + esc(tone(summary.visualPolishScore || overview.schemaStudioVisualPolish || 0)) + '">Visual polish: ' + esc(num(summary.visualPolishScore || overview.schemaStudioVisualPolish, 0) + '%') + '</span>',
          '<span class="ams-r6-badge">Scenes: ' + esc(num(summary.sceneCount || overview.schemaStudioSceneCount, 0)) + '</span>',
          '<span class="ams-r6-badge">Spotlights: ' + esc(num(summary.spotlightCount || overview.schemaStudioSpotlightCount, 0)) + '</span>',
        '</div>',
        '<div class="ams-r6-metrics">',
          metric('Narrative coverage', num(summary.narrativeCoverageScore || overview.schemaStudioNarrativeCoverage, 0) + '%', 'Storyboards and journeys remain coherent', tone(summary.narrativeCoverageScore || overview.schemaStudioNarrativeCoverage)),
          metric('Review wall', num(summary.reviewWallScore || overview.schemaStudioReviewWallScore, 0) + '%', 'Promotion lanes and evidence stay visible', tone(summary.reviewWallScore || overview.schemaStudioReviewWallScore)),
          metric('Atlas readiness', num(summary.atlasReadinessScore || overview.schemaStudioAtlasReadiness, 0) + '%', 'Domain, layer and dependency maps stay complete', tone(summary.atlasReadinessScore || overview.schemaStudioAtlasReadiness)),
          metric('Live pulse', num(summary.livePulseScore || overview.schemaStudioLivePulseScore, 0) + '%', 'Release radar and observability stay visible', tone(summary.livePulseScore || overview.schemaStudioLivePulseScore)),
        '</div>',
      '</section>',
      '<div class="ams-r6-grid">',
        '<article class="ams-r6-card"><h4>Spotlight rails</h4><div class="ams-r6-sub">Focused decks and personas worth surfacing to admins and architects.</div><div class="ams-r6-list">' + (spotlight.length ? spotlight.map(function(item){ return '<div class="ams-r6-item"><div><strong>' + esc(item.title || item.key || '-') + '</strong><div class="ams-r6-sub">' + esc(item.subtitle || '') + '</div></div><div class="ams-r6-inline"><span class="ams-r6-badge tone-' + esc(item.tone || tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ams-r6-sub">Use the command center report to surface spotlight rails here.</div>') + '</div></article>',
        '<article class="ams-r6-card"><h4>Review wall</h4><div class="ams-r6-sub">Promotion lanes and mandatory evidence items synced from the release control plane.</div><div class="ams-r6-list">' + (lanes.length ? lanes.map(function(item){ return '<div class="ams-r6-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r6-sub">' + esc(item.gate || item.nextAction || '') + '</div></div><div class="ams-r6-inline"><span class="ams-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ams-r6-sub">Review wall metrics are available once the round 6 artifact is regenerated.</div>') + '</div></article>',
        '<article class="ams-r6-card"><h4>Atlas packs</h4><div class="ams-r6-sub">Cross-check domain/layer/journey/dependency coverage directly from metadata control plane.</div><div class="ams-r6-list">' + (atlas.length ? atlas.map(function(group){ return '<div class="ams-r6-item"><div><strong>' + esc(group.label || group.key || '-') + '</strong><div class="ams-r6-sub">' + esc(num(group.count, 0) + ' mapped lenses') + '</div></div><div class="ams-r6-inline"><span class="ams-r6-badge">' + esc(arr(group.items).length) + ' items</span></div></div>'; }).join('') : '<div class="ams-r6-sub">Atlas packs will appear after the command center report is present.</div>') + '</div></article>',
        '<article class="ams-r6-card"><h4>Live pulse</h4><div class="ams-r6-sub">Watch the same release radar and observability signals without leaving metadata studio.</div><div class="ams-r6-list">' + (radar.length ? radar.map(function(item){ return '<div class="ams-r6-item"><div><strong>' + esc(item.label || '-') + '</strong><div class="ams-r6-sub">' + esc(item.detail || '') + '</div></div><div class="ams-r6-inline"><span class="ams-r6-badge tone-' + esc(tone(item.score || 0)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ams-r6-sub">Live pulse tiles are waiting for the regenerated round 6 artifact.</div>') + '</div></article>',
      '</div>'
    ].join('');
  }
  function fetchSummary(force){
    if(state.loading && !force) return Promise.resolve(state.summary || null);
    state.loading = true;
    return api('admin_metadata_studio_summary', {}, 'GET').then(function(payload){
      state.loading = false;
      state.summary = payload || null;
      render();
      return state.summary;
    }).catch(function(){
      state.loading = false;
      render();
      return state.summary || null;
    });
  }
  function attach(container){
    state.container = container;
    if(state.observer){ state.observer.disconnect(); state.observer = null; }
    if(container && typeof MutationObserver !== 'undefined'){
      state.observer = new MutationObserver(function(){ render(); });
      state.observer.observe(container, { childList:true, subtree:true });
    }
    render();
    fetchSummary(false);
  }

  var original = win._renderAdminMetadataStudio;
  win._renderAdminMetadataStudio = function(container){
    var result = original ? original.apply(this, arguments) : undefined;
    attach(container);
    return result;
  };
  win._renderAdminMetadataStudio.__round6Patched = true;
})(window);


/* ── Admin Metadata Studio Round 7 Atlas Mesh ────────────────────────── */
(function(win){
  'use strict';
  if(!win || !win._renderAdminMetadataStudio) return;
  if(win._renderAdminMetadataStudio.__round7Patched) return;

  var state = { container:null, summary:null, loading:false, observer:null };

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
    if(typeof window.apiCall === 'function') return window.apiCall(action, payload || {}, method || 'GET', 30000);
    return fetch('api.php?action=' + encodeURIComponent(action), {
      method: method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': (typeof csrfToken !== 'undefined' ? csrfToken : '')
      },
      body: (method || 'GET').toUpperCase() === 'GET' ? undefined : JSON.stringify(payload || {})
    }).then(function(r){ return r.json(); });
  }
  function metric(label, value, hint, toneKey){
    return '<div class="ams-r7-metric tone-' + esc(toneKey || 'neutral') + '"><div class="ams-r7-sub">' + esc(label || '-') + '</div><strong>' + esc(value == null ? '-' : value) + '</strong><div class="ams-r7-sub">' + esc(hint || '') + '</div></div>';
  }
  function normalize(payload){
    payload = payload && typeof payload === 'object' ? payload : {};
    var overview = payload.overview || {};
    var schemaStudio = payload.schemaStudio || {};
    var report = schemaStudio.round7Report || {};
    if(!report.summary){
      report = {
        summary: {
          atlasMeshScore:num(overview.schemaStudioAtlasMeshScore, 0),
          physicalCoverageScore:num(overview.schemaStudioPhysicalCoverage, 0),
          reviewOpsScore:num(overview.schemaStudioReviewOpsScore, 0),
          exportSurfaceScore:num(overview.schemaStudioExportSurfaceScore, 0),
          interoperabilityScore:num(overview.schemaStudioInteroperabilityScore, 0),
          roleModeScore:num(overview.schemaStudioRoleModeScore, 0),
          traceabilityAtlasScore:num(overview.schemaStudioTraceabilityAtlasScore, 0),
          beautySystemScore:num(overview.schemaStudioBeautySystemScore, 0),
          objectSurfaceCount:num(overview.schemaStudioObjectSurfaceCount, 0),
          roleModeCount:num(overview.schemaStudioRoleModeCount, 0),
          reviewBoardCount:num(overview.schemaStudioReviewBoardCount, 0),
          exportBundleCount:num(overview.schemaStudioExportBundleCount, 0)
        },
        hero:{
          headline:'Round 7 atlas mesh',
          subheadline:'Admin metadata now sees the same physical coverage, review boards, export surfaces, role modes and traceability atlas posture as Schema Studio.'
        },
        atlas:{ objectSurfaces:[], capabilityBands:[] },
        reviewBoards:[],
        exports:[],
        roleModes:[],
        interoperability:[],
        traceabilityAtlas:[],
        beautySystem:{ ambiences:[], densities:[], sceneFamilies:[] }
      };
    }
    return { overview:overview, report:report };
  }
  function ensureStyles(){
    if(document.getElementById('ams-r7-styles')) return;
    var style = document.createElement('style');
    style.id = 'ams-r7-styles';
    style.textContent = [
      '.ams-r7-shell{display:grid;gap:14px;margin-top:16px;}',
      '.ams-r7-hero,.ams-r7-card{border:1px solid rgba(117,139,255,.16);background:linear-gradient(180deg,rgba(13,20,36,.96),rgba(12,21,42,.9));box-shadow:0 18px 42px rgba(3,9,24,.28);border-radius:24px;padding:18px;color:#eaf2ff;}',
      '.ams-r7-title{font-size:24px;font-weight:800;line-height:1.2;}',
      '.ams-r7-sub{color:#93a3c7;font-size:12px;letter-spacing:.01em;line-height:1.45;}',
      '.ams-r7-kicker{color:#93a3c7;font-size:12px;text-transform:uppercase;letter-spacing:.08em;}',
      '.ams-r7-badges,.ams-r7-grid,.ams-r7-inline,.ams-r7-chip-wrap,.ams-r7-metrics{display:flex;flex-wrap:wrap;gap:8px;}',
      '.ams-r7-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '.ams-r7-badge,.ams-r7-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);font-size:12px;font-weight:700;color:#f5f8ff;}',
      '.ams-r7-badge.tone-good{background:rgba(31,197,123,.16);border-color:rgba(31,197,123,.26);}',
      '.ams-r7-badge.tone-warning{background:rgba(255,191,71,.16);border-color:rgba(255,191,71,.26);}',
      '.ams-r7-badge.tone-critical{background:rgba(255,92,117,.16);border-color:rgba(255,92,117,.28);}',
      '.ams-r7-chip{font-weight:600;color:#d9e4ff;background:rgba(60,86,155,.16);}',
      '.ams-r7-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px;}',
      '.ams-r7-metric{padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);display:grid;gap:6px;min-height:102px;}',
      '.ams-r7-metric strong{font-size:28px;line-height:1;}',
      '.ams-r7-metric.tone-good{background:linear-gradient(180deg,rgba(25,84,55,.26),rgba(15,25,48,.68));}',
      '.ams-r7-metric.tone-warning{background:linear-gradient(180deg,rgba(109,78,21,.24),rgba(15,25,48,.68));}',
      '.ams-r7-metric.tone-critical{background:linear-gradient(180deg,rgba(116,37,49,.26),rgba(15,25,48,.68));}',
      '.ams-r7-list{display:grid;gap:10px;}',
      '.ams-r7-item{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);}',
      '@media (max-width:1100px){.ams-r7-grid,.ams-r7-metrics{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(style);
  }
  function render(){
    if(!state.container) return;
    var root = state.container.querySelector('.ams');
    if(!root) return;
    var metrics = root.querySelector('.ams-metrics');
    if(!metrics) return;
    if(!state.summary) return;
    ensureStyles();
    var data = normalize(state.summary);
    var report = data.report;
    var summary = report.summary || {};
    var hero = report.hero || {};
    var surfaces = arr(report.atlas && report.atlas.objectSurfaces).slice(0, 6);
    var boards = arr(report.reviewBoards).slice(0, 4);
    var modes = arr(report.roleModes).slice(0, 4);
    var exports = arr(report.exports).slice(0, 4);
    var interop = arr(report.interoperability).slice(0, 4);
    var trace = arr(report.traceabilityAtlas).slice(0, 4);
    var beauty = report.beautySystem || {};
    var existing = root.querySelector('.ams-r7-shell');
    if(!existing){
      existing = document.createElement('section');
      existing.className = 'ams-r7-shell';
      var anchor = root.querySelector('.ams-r6-shell') || metrics;
      anchor.insertAdjacentElement('afterend', existing);
    }
    existing.innerHTML = [
      '<section class="ams-r7-hero">',
        '<div class="ams-r7-kicker">Round 7 atlas mesh</div>',
        '<div class="ams-r7-title">' + esc(hero.headline || 'Physical coverage and traceability atlas for admins') + '</div>',
        '<div class="ams-r7-sub">' + esc(hero.subheadline || 'Metadata admins now see the same world-class control-plane posture as schema architects.') + '</div>',
        '<div class="ams-r7-badges">',
          '<span class="ams-r7-badge tone-' + esc(tone(summary.atlasMeshScore)) + '">Atlas mesh: ' + esc(num(summary.atlasMeshScore, 0) + '%') + '</span>',
          '<span class="ams-r7-badge tone-' + esc(tone(summary.physicalCoverageScore)) + '">Physical: ' + esc(num(summary.physicalCoverageScore, 0) + '%') + '</span>',
          '<span class="ams-r7-badge tone-' + esc(tone(summary.reviewOpsScore)) + '">Review ops: ' + esc(num(summary.reviewOpsScore, 0) + '%') + '</span>',
          '<span class="ams-r7-badge tone-' + esc(tone(summary.exportSurfaceScore)) + '">Export surface: ' + esc(num(summary.exportSurfaceScore, 0) + '%') + '</span>',
          '<span class="ams-r7-badge">Surfaces: ' + esc(num(summary.objectSurfaceCount, 0)) + '</span>',
          '<span class="ams-r7-badge">Boards: ' + esc(num(summary.reviewBoardCount, 0)) + '</span>',
          '<span class="ams-r7-badge">Role modes: ' + esc(num(summary.roleModeCount, 0)) + '</span>',
        '</div>',
        '<div class="ams-r7-metrics">',
          metric('Interoperability', num(summary.interoperabilityScore, 0) + '%', 'Registry, API, workflow and builder propagation', tone(summary.interoperabilityScore)),
          metric('Role modes', num(summary.roleModeScore, 0) + '%', 'Persona-aware control-plane views', tone(summary.roleModeScore)),
          metric('Traceability atlas', num(summary.traceabilityAtlasScore, 0) + '%', 'Genealogy, quality and dispatch scenario maps', tone(summary.traceabilityAtlasScore)),
          metric('Beauty system', num(summary.beautySystemScore, 0) + '%', 'Ambience, density and storyboard system', tone(summary.beautySystemScore)),
        '</div>',
      '</section>',
      '<div class="ams-r7-grid">',
        '<article class="ams-r7-card"><h4>Object surfaces</h4><div class="ams-r7-sub">Physical modeling posture visible to metadata governance.</div><div class="ams-r7-list">' + (surfaces.length ? surfaces.map(function(item){ return '<div class="ams-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ams-r7-inline"><span class="ams-r7-badge tone-' + esc(item.tone || tone(item.readinessScore)) + '">' + esc(num(item.readinessScore, 0) + '%') + '</span><span class="ams-r7-badge">' + esc(num(item.count, 0)) + '</span></div></div>'; }).join('') : '<div class="ams-r7-sub">No object surface data yet.</div>') + '</div></article>',
        '<article class="ams-r7-card"><h4>Review boards</h4><div class="ams-r7-sub">Approval matrices and evidence lanes synced from Schema Studio.</div><div class="ams-r7-list">' + (boards.length ? boards.map(function(item){ return '<div class="ams-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r7-sub">' + esc(item.owner || '') + ' → ' + esc(item.approver || '') + '</div></div><div class="ams-r7-inline"><span class="ams-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ams-r7-sub">Review boards will appear once the round 7 artifact is regenerated.</div>') + '</div></article>',
        '<article class="ams-r7-card"><h4>Exports & interoperability</h4><div class="ams-r7-sub">Governed export bundles and propagation tracks.</div><div class="ams-r7-list">' + (exports.length ? exports.map(function(item){ return '<div class="ams-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r7-sub">' + esc(item.format || '') + ' · ' + esc(item.purpose || '') + '</div></div><div class="ams-r7-inline"><span class="ams-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(item.status || '-') + '</span></div></div>'; }).join('') : '<div class="ams-r7-sub">No export bundles yet.</div>') + (interop.length ? interop.map(function(item){ return '<div class="ams-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r7-sub">' + esc(item.detail || '') + '</div></div><div class="ams-r7-inline"><span class="ams-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '') + '</div></article>',
        '<article class="ams-r7-card"><h4>Role modes, beauty & traceability</h4><div class="ams-r7-sub">Persona rails and premium visual system now visible from metadata control plane.</div><div class="ams-r7-chip-wrap">' + (modes.length ? modes.map(function(item){ return '<span class="ams-r7-chip">' + esc(item.label || item.key || '-') + ' · ' + esc(num(item.score, 0) + '%') + '</span>'; }).join('') : '<span class="ams-r7-sub">No role modes yet.</span>') + '</div><div class="ams-r7-chip-wrap">' + arr(beauty.ambiences).map(function(item){ return '<span class="ams-r7-chip">🌌 ' + esc(item.label || item.key || '-') + '</span>'; }).join('') + '</div><div class="ams-r7-chip-wrap">' + arr(beauty.densities).map(function(item){ return '<span class="ams-r7-chip">▥ ' + esc(item.label || item.key || '-') + '</span>'; }).join('') + '</div><div class="ams-r7-list">' + (trace.length ? trace.map(function(item){ return '<div class="ams-r7-item"><div><strong>' + esc(item.label || item.key || '-') + '</strong><div class="ams-r7-sub">' + esc(arr(item.domains).join(' · ')) + '</div></div><div class="ams-r7-inline"><span class="ams-r7-badge tone-' + esc(item.tone || tone(item.score)) + '">' + esc(num(item.score, 0) + '%') + '</span></div></div>'; }).join('') : '<div class="ams-r7-sub">Traceability atlas not available yet.</div>') + '</div></article>',
      '</div>'
    ].join('');
  }
  function fetchSummary(force){
    if(state.loading && !force) return Promise.resolve(state.summary || null);
    state.loading = true;
    return api('admin_metadata_studio_summary', {}, 'GET').then(function(payload){
      state.loading = false;
      state.summary = payload || null;
      render();
      return state.summary;
    }).catch(function(){
      state.loading = false;
      render();
      return state.summary || null;
    });
  }
  function attach(container){
    state.container = container;
    if(state.observer){ state.observer.disconnect(); state.observer = null; }
    if(container && typeof MutationObserver !== 'undefined'){
      state.observer = new MutationObserver(function(){ render(); });
      state.observer.observe(container, { childList:true, subtree:true });
    }
    render();
    fetchSummary(false);
  }

  var original = win._renderAdminMetadataStudio;
  win._renderAdminMetadataStudio = function(container){
    var result = original ? original.apply(this, arguments) : undefined;
    attach(container);
    return result;
  };
  win._renderAdminMetadataStudio.__round7Patched = true;
})(window);

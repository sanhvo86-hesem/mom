(function(){
'use strict';

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){
  var node = document.createElement('div');
  node.appendChild(document.createTextNode(String(v == null ? '' : v)));
  return node.innerHTML;
}
function _js(v){
  return JSON.stringify(String(v == null ? '' : v));
}
function _api(action, payload, method, timeoutMs){
  var requestMethod = String(method || 'GET').toUpperCase();
  var useMvcEndpoint = String(action || '').indexOf('admin_metadata_studio_') === 0;
  if(typeof apiCall === 'function' && !useMvcEndpoint) return apiCall(action, payload || {}, requestMethod, timeoutMs || 30000);
  var url = (useMvcEndpoint ? 'api/index.php' : 'api.php') + '?action=' + encodeURIComponent(action);
  if(requestMethod === 'GET' && payload){
    var params = new URLSearchParams();
    Object.keys(payload || {}).forEach(function(key){
      if(payload[key] == null || payload[key] === '') return;
      params.append(key, String(payload[key]));
    });
    var query = params.toString();
    if(query) url += '&' + query;
  }
  return fetch(url, {
    method: requestMethod,
    credentials: 'include',
    headers: Object.assign(
      {},
      requestMethod === 'GET' ? {} : {'Content-Type':'application/json'},
      (typeof csrfToken !== 'undefined' && csrfToken ? {'X-CSRF-Token': csrfToken} : {})
    ),
    body: requestMethod === 'GET' ? undefined : JSON.stringify(payload || {})
  }).then(function(r){
    return r.text().then(function(text){
      var data = null;
      try{
        data = text ? JSON.parse(text) : null;
      }catch(err){
        throw new Error('invalid_json_response http_' + String(r.status));
      }
      if(!data){
        throw new Error('empty_response http_' + String(r.status));
      }
      if(!r.ok && data && data.ok !== false){
        data.ok = false;
        data.error = data.error || ('http_' + String(r.status));
      }
      return data;
    });
  });
}
function _toast(message, type){
  if(typeof showToast === 'function') return showToast(message, type);
  console[type === 'error' ? 'error' : 'log'](message);
}
function _fmtInt(value){
  var num = Number(value || 0);
  if(!isFinite(num)) return '0';
  return num.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
}
function _fmtPct(value){
  var num = Number(value || 0);
  if(!isFinite(num)) return '0%';
  return Math.round(num) + '%';
}
function _fmtTime(value){
  if(!value) return '—';
  try{
    return new Date(value).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
  }catch(_err){
    return String(value);
  }
}
function _tone(status){
  var key = String(status || '').toLowerCase();
  if(key === 'ok' || key === 'good' || key === 'pass' || key === 'ready' || key === 'reachable') return 'good';
  if(key === 'warn' || key === 'warning' || key === 'review_required' || key === 'partial' || key === 'medium') return 'warn';
  if(key === 'bad' || key === 'error' || key === 'failed' || key === 'unreachable' || key === 'blocked' || key === 'critical' || key === 'high') return 'bad';
  return 'neutral';
}
function _boolTone(flag){
  return flag ? 'good' : 'bad';
}
function _truthTone(status){
  var key = String(status || '').toLowerCase();
  if(key === 'db_verified' || key === 'contract_runtime_linked' || key === 'controller_linked' || key === 'runtime_contract_authority' || key === 'config_library') return 'good';
  if(key === 'registry_api_linked' || key === 'schema_authority_linked' || key === 'reference_blueprint' || key === 'non_runtime_design_draft') return 'neutral';
  if(key === 'partial_link' || key === 'missing_direct_scope') return 'warn';
  if(key === 'unlinked') return 'bad';
  return _tone(key);
}
function _jsonPretty(value){
  return JSON.stringify(value == null ? {} : value, null, 2);
}
function _parseJson(text, fallbackLabel){
  try{
    return { ok:true, value: JSON.parse(String(text || '{}')) };
  }catch(err){
    return { ok:false, error: (fallbackLabel || 'invalid_json') + ': ' + err.message };
  }
}
function _actionError(res, fallback){
  var code = res && res.error ? String(res.error) : '';
  if(code === 'stale_design_workspace_revision' || code === 'missing_design_revision_token'){
    return new Error(_t('Design hoặc baseline đã đổi trên server. Tải lại design mới nhất rồi chạy lại thao tác.', 'The design or baseline changed on the server. Reload the latest design before retrying.'));
  }
  if(code === 'release_gate_blocked'){
    var reasons = res && res.release_gate && Array.isArray(res.release_gate.reasons) ? res.release_gate.reasons.join(' · ') : '';
    return new Error(reasons || _t('Release gate đang bị chặn bởi rủi ro vận hành.', 'The release gate is blocked by operational risks.'));
  }
  return new Error((res && (res.detail || res.error)) || fallback || 'action_failed');
}
function _copyText(text){
  if(navigator && navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(String(text || ''));
  }
  return Promise.reject(new Error('clipboard_unavailable'));
}
function _badge(label, tone){
  return '<span class="ds-badge tone-' + _esc(tone || 'neutral') + '">' + _esc(label) + '</span>';
}
function _methodBadge(method){
  return '<span class="ds-method method-' + _esc(String(method || 'GET').toLowerCase()) + '">' + _esc(method || 'GET') + '</span>';
}
function _emptyState(title, text){
  return '<div class="ds-empty"><div class="ds-empty-icon">∅</div><div class="ds-empty-title">' + _esc(title) + '</div><p>' + _esc(text) + '</p></div>';
}
function _humanizeKey(key){
  return String(key || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function _fmtBytes(value){
  var bytes = Number(value || 0);
  if(!isFinite(bytes) || bytes <= 0) return '0 B';
  if(bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if(bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if(bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return Math.round(bytes) + ' B';
}
function _dbProbeApplicable(scope){
  return !!(scope && scope.db_probe_applicable);
}
function _dbProbeResolved(scope){
  return !!(scope && (scope.db_probe_resolved || scope.db_probe_reachable || scope.reachable));
}
function _dbProbeReachable(scope){
  return !!(scope && (scope.db_probe_reachable || scope.reachable));
}
function _dbStatusLabel(applicable, resolved, present){
  if(!applicable) return _t('DB N/A', 'DB N/A');
  if(!resolved) return _t('Unknown', 'Unknown');
  return present ? _t('DB', 'DB') : _t('Missing', 'Missing');
}
function _dbStatusTone(applicable, resolved, present){
  if(!applicable || !resolved) return 'neutral';
  return present ? 'good' : 'bad';
}
function _dbStatusLabelFor(item){
  var status = String((item && item.db_status) || '').toLowerCase();
  if(status === 'verified') return _t('DB OK', 'DB OK');
  if(status === 'not_configured') return _t('DB N/A', 'DB N/A');
  if(status === 'unresolved') return _t('DB unknown', 'DB unknown');
  if(status === 'missing_from_untracked_target') return _t('DB ledger gap', 'DB ledger gap');
  if(status === 'missing_from_incomplete_target') return _t('DB target gap', 'DB target gap');
  return _dbStatusLabel(!!(item && item.db_probe_applicable), !!(item && item.db_probe_resolved), !!(item && item.db_present === true));
}
function _dbStatusToneFor(item){
  var status = String((item && item.db_status) || '').toLowerCase();
  if(status === 'verified') return 'good';
  if(status === 'missing_from_untracked_target' || status === 'missing_from_incomplete_target') return 'warn';
  if(status === 'missing') return 'bad';
  return _dbStatusTone(!!(item && item.db_probe_applicable), !!(item && item.db_probe_resolved), !!(item && item.db_present === true));
}
function _dbTargetAlert(connection){
  var status = String((connection && connection.db_target_status) || '').toLowerCase();
  if(!status || status === 'aligned') return '';
  var tone = (status === 'not_configured') ? 'neutral' : 'warn';
  var reason = connection && connection.db_target_reason ? String(connection.db_target_reason) : '';
  var nextAction = connection && connection.db_target_next_action ? String(connection.db_target_next_action) : '';
  var label = status.replace(/_/g, ' ');
  return '<div class="ds-inline-alert tone-' + _esc(tone) + '"><strong>' + _esc(_t('DB target', 'DB target')) + ': ' + _esc(label) + '.</strong> ' + _esc(reason) + (nextAction ? ' ' + _esc(_t('Hành động', 'Action')) + ': ' + _esc(nextAction) : '') + '</div>';
}
function _dbProbeTone(status){
  var key = String(status || '').toLowerCase();
  if(key === 'verified') return 'good';
  if(key === 'missing') return 'bad';
  if(key === 'missing_from_untracked_target' || key === 'missing_from_incomplete_target') return 'warn';
  return 'neutral';
}

var state = {
  container: null,
  loading: false,
  workspace: null,
  tab: 'overview',
  apiSearch: '',
  apiDomain: 'ALL',
  apiMethod: 'ALL',
  apiKind: 'ALL',
  tableSearch: '',
  tableDomain: 'ALL',
  libraryTab: 'schemas',
  selectedApiKey: '',
  apiDetail: null,
  apiEditor: '',
  selectedTableKey: '',
  tableDetail: null,
  tableEditor: '',
  tablePreview: null,
  tablePreviewOffset: 0,
  tablePreviewBusy: false,
  rowEditorOpen: false,
  rowEditorMode: 'insert',
  rowEditorJson: '{}',
  rowEditorOriginal: null,
  selectedSchemaKey: '',
  schemaDetail: null,
  schemaEditor: '',
  selectedVariableKey: '',
  variableDetail: null,
  variableEditor: '',
  selectedDesignId: '',
  designSchema: null,
  designBaseline: null,
  designRevisions: null,
  designSavePolicy: null,
  designEditor: '',
  designBusy: false,
  designResult: null,
  releases: [],
  busyKey: '',
  error: ''
};

var TABS = [
  { id:'overview', labelEn:'Overview', labelVi:'Tổng quan' },
  { id:'apis', labelEn:'API Catalog', labelVi:'Catalog API' },
  { id:'tables', labelEn:'Tables & Data', labelVi:'Bảng & dữ liệu' },
  { id:'designs', labelEn:'Designs & Releases', labelVi:'Design & release' },
  { id:'libraries', labelEn:'Libraries', labelVi:'Thư viện' }
];

function _workspace(){
  return state.workspace || { metrics:{}, lists:{}, highlights:{}, domains:[], artifacts:{}, audits:{}, connection:{} };
}

function _list(name){
  var ws = _workspace();
  return Array.isArray(ws.lists && ws.lists[name]) ? ws.lists[name] : [];
}

function _selectedApiSummary(){
  var rows = _list('apis');
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i] && rows[i].key || '') === String(state.selectedApiKey || '')){
      return rows[i];
    }
  }
  return null;
}

function _selectedTableSummary(){
  var rows = _list('tables');
  for(var i = 0; i < rows.length; i += 1){
    if(String(rows[i] && rows[i].key || '') === String(state.selectedTableKey || '')){
      return rows[i];
    }
  }
  return null;
}

function _currentDetailRevision(type){
  var detail = null;
  if(type === 'api') detail = state.apiDetail;
  if(type === 'table') detail = state.tableDetail;
  if(type === 'schema') detail = state.schemaDetail;
  if(type === 'variable') detail = state.variableDetail;
  return detail && detail.revision ? detail.revision : null;
}

function _currentSavePolicy(type){
  var detail = null;
  if(type === 'api') detail = state.apiDetail;
  if(type === 'table') detail = state.tableDetail;
  if(type === 'schema') detail = state.schemaDetail;
  if(type === 'variable') detail = state.variableDetail;
  return detail && detail.save_policy ? detail.save_policy : ((_workspace().save_policy) || {});
}

function _currentDesignRevisions(){
  return state.designRevisions || null;
}

function _currentDesignSavePolicy(){
  return state.designSavePolicy || ((_workspace().save_policy) || {});
}

function _renderSaveGuard(detail, type){
  var policy = detail && detail.save_policy ? detail.save_policy : _currentSavePolicy(type);
  var revision = detail && detail.revision ? detail.revision : _currentDetailRevision(type);
  if(!policy || !policy.requiresRevision) return '';
  return '<div class="ds-helper-text">' + _esc(_t('Save được khóa bằng revision token; nếu file đổi trên server, hệ thống sẽ trả 409 thay vì ghi đè im lặng.', 'Saves are guarded by revision tokens; if the file changed on the server, the save returns 409 instead of silently overwriting it.')) + ' ' + _esc(_t('Loaded at', 'Loaded at')) + ': ' + _fmtTime(revision && revision.capturedAt) + ' · ' + _esc(_t('Payload limit', 'Payload limit')) + ': ' + _esc(_fmtBytes(policy.maxPayloadBytes || 0)) + '</div>';
}

function _renderDesignSaveGuard(){
  var policy = _currentDesignSavePolicy();
  var revisions = _currentDesignRevisions();
  if(!policy || !policy.requiresRevision) return '';
  return '<div class="ds-helper-text">' + _esc(_t('Các thao tác save / baseline / diagnose / compile / release đều khóa theo revision của design và baseline; nếu file đổi trên server, hệ thống sẽ chặn để tránh build từ editor cũ.', 'Save / baseline / diagnose / compile / release are locked to the current design and baseline revisions; if the files changed on the server, the system blocks the action to avoid building from a stale editor.')) + ' ' + _esc(_t('Loaded at', 'Loaded at')) + ': ' + _fmtTime(revisions && revisions.capturedAt) + ' · ' + _esc(_t('Payload limit', 'Payload limit')) + ': ' + _esc(_fmtBytes(policy.maxPayloadBytes || 0)) + '</div>';
}

function _syncSelections(){
  var apis = _list('apis');
  var tables = _list('tables');
  var schemas = _list('schemas');
  var variables = _list('variables');
  var designs = _list('designs');

  if(!apis.some(function(item){ return String(item.key) === String(state.selectedApiKey); })){
    state.selectedApiKey = apis.length ? String(apis[0].key) : '';
  }
  if(!tables.some(function(item){ return String(item.key) === String(state.selectedTableKey); })){
    state.selectedTableKey = tables.length ? String(tables[0].key) : '';
  }
  if(!schemas.some(function(item){ return String(item.key) === String(state.selectedSchemaKey); })){
    state.selectedSchemaKey = schemas.length ? String(schemas[0].key) : '';
  }
  if(!variables.some(function(item){ return String(item.key) === String(state.selectedVariableKey); })){
    state.selectedVariableKey = variables.length ? String(variables[0].key) : '';
  }
  if(!designs.some(function(item){ return String(item.id) === String(state.selectedDesignId); })){
    state.selectedDesignId = designs.length ? String(designs[0].id) : '';
  }
  state.releases = _list('releases');
}

async function _loadWorkspace(silent){
  if(!silent){
    state.loading = true;
  }
  state.error = '';
  _paint();
  try{
    var res = await _api('admin_metadata_studio_summary', null, 'GET', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'summary_failed');
    state.workspace = res.workspace || {};
    _syncSelections();
    if(state.tab === 'apis' && state.selectedApiKey) await _loadApiDetail(state.selectedApiKey, true);
    if(state.tab === 'tables' && state.selectedTableKey) await _loadTableDetail(state.selectedTableKey, true);
    if(state.tab === 'libraries'){
      if(state.libraryTab === 'schemas' && state.selectedSchemaKey) await _loadSchemaDetail(state.selectedSchemaKey, true);
      if(state.libraryTab === 'variables' && state.selectedVariableKey) await _loadVariableDetail(state.selectedVariableKey, true);
    }
    if(state.tab === 'designs' && state.selectedDesignId && !state.designSchema){
      await _loadDesign(state.selectedDesignId, true);
    }
  }catch(err){
    state.workspace = null;
    state.error = (err && err.message) || 'summary_failed';
    if(!silent) _toast(_t('Không thể tải Data Schema workspace.', 'Could not load the Data Schema workspace.'), 'error');
  }finally{
    state.loading = false;
    _paint();
  }
}

async function _refresh(){
  state.apiDetail = null;
  state.tableDetail = null;
  state.schemaDetail = null;
  state.variableDetail = null;
  state.tablePreview = null;
  state.rowEditorOpen = false;
  await _loadWorkspace(false);
  _toast(_t('Đã làm mới Data Schema workspace.', 'Data Schema workspace refreshed.'), 'success');
}

async function _loadApiDetail(key, silent){
  if(!key) return;
  state.busyKey = silent ? state.busyKey : 'api:' + key;
  if(!silent) _paint();
  try{
    var res = await _api('admin_metadata_studio_detail', {type:'api', key:key}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'api_detail_failed');
    state.selectedApiKey = key;
    state.apiDetail = res;
    state.apiEditor = _jsonPretty({
      item: res.item || {},
      api_params: res.api_params || {},
      fields: res.fields || []
    });
  }catch(err){
    if(!silent) _toast(_t('Không thể tải chi tiết API.', 'Could not load API detail.'), 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _loadTableDetail(key, silent){
  if(!key) return;
  state.busyKey = silent ? state.busyKey : 'table:' + key;
  if(!silent) _paint();
  try{
    var res = await _api('admin_metadata_studio_detail', {type:'table', key:key}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'table_detail_failed');
    state.selectedTableKey = key;
    state.tableDetail = res;
    state.tableEditor = _jsonPretty({ item: res.item || {} });
    state.tablePreview = null;
    state.tablePreviewOffset = 0;
    state.rowEditorOpen = false;
  }catch(err){
    if(!silent) _toast(_t('Không thể tải chi tiết bảng.', 'Could not load table detail.'), 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _loadSchemaDetail(key, silent){
  if(!key) return;
  state.busyKey = silent ? state.busyKey : 'schema:' + key;
  if(!silent) _paint();
  try{
    var res = await _api('admin_metadata_studio_detail', {type:'schema', key:key}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'schema_detail_failed');
    state.selectedSchemaKey = key;
    state.schemaDetail = res;
    state.schemaEditor = _jsonPretty({ item: res.item || {} });
  }catch(err){
    if(!silent) _toast(_t('Không thể tải blueprint schema.', 'Could not load schema blueprint.'), 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _loadVariableDetail(key, silent){
  if(!key) return;
  state.busyKey = silent ? state.busyKey : 'variable:' + key;
  if(!silent) _paint();
  try{
    var res = await _api('admin_metadata_studio_detail', {type:'variable', key:key}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'variable_detail_failed');
    state.selectedVariableKey = key;
    state.variableDetail = res;
    state.variableEditor = _jsonPretty({ item: res.item || {} });
  }catch(err){
    if(!silent) _toast(_t('Không thể tải variable library.', 'Could not load variable library.'), 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _loadDesign(id, silent){
  if(!id) return;
  state.designBusy = true;
  if(!silent) _paint();
  try{
    var res = await _api('schema_studio_get', {id:id}, 'POST', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'design_load_failed');
    state.selectedDesignId = id;
    state.designSchema = res.schema || null;
    state.designBaseline = res.baseline || null;
    state.designRevisions = res.revisions || null;
    state.designSavePolicy = res.save_policy || null;
    state.designEditor = _jsonPretty(state.designSchema || {});
    state.designResult = null;
  }catch(err){
    if(!silent) _toast(_t('Không thể tải design schema.', 'Could not load the schema design.'), 'error');
  }finally{
    state.designBusy = false;
    _paint();
  }
}

async function _loadReleases(){
  var designId = _currentDesignId();
  state.designBusy = true;
  _paint();
  try{
    var res = await _api('schema_studio_list_releases', {design_id: designId || ''}, 'POST', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'release_list_failed');
    state.releases = Array.isArray(res.releases) ? res.releases : [];
    state.designResult = { type:'release_list', payload: res };
  }catch(err){
    _toast(_t('Không thể tải release bundle.', 'Could not load release bundles.'), 'error');
  }finally{
    state.designBusy = false;
    _paint();
  }
}

function _currentDesignId(){
  if(state.designSchema && state.designSchema._meta && state.designSchema._meta.id){
    return String(state.designSchema._meta.id);
  }
  return String(state.selectedDesignId || '');
}

async function _saveEditor(type){
  var editorMap = {
    api: state.apiEditor,
    table: state.tableEditor,
    schema: state.schemaEditor,
    variable: state.variableEditor
  };
  var keyMap = {
    api: state.selectedApiKey,
    table: state.selectedTableKey,
    schema: state.selectedSchemaKey,
    variable: state.selectedVariableKey
  };
  var parsed = _parseJson(editorMap[type], type);
  if(!parsed.ok){
    _toast(parsed.error, 'error');
    return;
  }
  state.busyKey = 'save:' + type;
  _paint();
  try{
    var payload = Object.assign({ type:type, key:keyMap[type], revision:_currentDetailRevision(type) }, parsed.value || {});
    var res = await _api('admin_metadata_studio_save', payload, 'POST', 45000);
    if(!res || !res.ok){
      if(res && res.error === 'stale_workspace_revision'){
        throw new Error(_t('Metadata đã đổi trên server. Tải lại detail mới rồi áp lại thay đổi.', 'The metadata changed on the server. Reload the latest detail and reapply the change.'));
      }
      if(res && res.error === 'missing_revision_token'){
        throw new Error(_t('Editor này không còn revision token hợp lệ. Hãy tải lại detail trước khi lưu.', 'This editor no longer has a valid revision token. Reload the detail before saving.'));
      }
      throw new Error((res && (res.detail || res.error)) || 'save_failed');
    }
    await _loadWorkspace(true);
    if(type === 'api') await _loadApiDetail(res.key || keyMap[type], true);
    if(type === 'table') await _loadTableDetail(res.key || keyMap[type], true);
    if(type === 'schema') await _loadSchemaDetail(res.key || keyMap[type], true);
    if(type === 'variable') await _loadVariableDetail(res.key || keyMap[type], true);
    _toast(_t('Đã lưu metadata.', 'Metadata saved.'), 'success');
  }catch(err){
    _toast((err && err.message) || 'save_failed', 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _loadTablePreview(offset){
  if(!state.selectedTableKey) return;
  state.tablePreviewBusy = true;
  if(typeof offset === 'number') state.tablePreviewOffset = Math.max(0, offset);
  _paint();
  try{
    var res = await _api('schema_studio_table_preview', {
      schema: 'public',
      table: state.selectedTableKey,
      limit: 25,
      offset: state.tablePreviewOffset
    }, 'POST', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'table_preview_failed');
    state.tablePreview = res;
    state.rowEditorOpen = false;
  }catch(err){
    _toast(_t('Không thể tải preview dữ liệu.', 'Could not load table preview.'), 'error');
  }finally{
    state.tablePreviewBusy = false;
    _paint();
  }
}

function _openRowInsert(){
  state.rowEditorMode = 'insert';
  state.rowEditorOriginal = null;
  state.rowEditorJson = '{}';
  state.rowEditorOpen = true;
  _paint();
}

function _openRowUpdate(index){
  var preview = state.tablePreview || {};
  var rows = Array.isArray(preview.rows) ? preview.rows : [];
  var row = rows[index];
  if(!row) return;
  state.rowEditorMode = 'update';
  state.rowEditorOriginal = row;
  state.rowEditorJson = _jsonPretty(row);
  state.rowEditorOpen = true;
  _paint();
}

function _closeRowEditor(){
  state.rowEditorOpen = false;
  _paint();
}

async function _saveRowEditor(){
  if(!state.selectedTableKey) return;
  var parsed = _parseJson(state.rowEditorJson, 'row_editor');
  if(!parsed.ok){
    _toast(parsed.error, 'error');
    return;
  }
  state.busyKey = 'row_save';
  _paint();
  try{
    var res = await _api('schema_studio_table_row_save', {
      schema: 'public',
      table: state.selectedTableKey,
      mode: state.rowEditorMode,
      row: parsed.value || {},
      original: state.rowEditorOriginal || {}
    }, 'POST', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'row_save_failed');
    _toast(_t('Đã lưu dữ liệu bảng.', 'Table data saved.'), 'success');
    state.rowEditorOpen = false;
    await _loadTablePreview(state.tablePreviewOffset || 0);
  }catch(err){
    _toast((err && err.message) || 'row_save_failed', 'error');
  }finally{
    state.busyKey = '';
    _paint();
  }
}

async function _runDesignAction(actionId){
  var designId = _currentDesignId();
  var schema = state.designSchema;
  if(!actionId) return;
  if(['save_design','validate','set_baseline','diagnose','compile','release'].indexOf(actionId) !== -1 && !schema){
    _toast(_t('Chưa có working design để chạy thao tác này.', 'No working design is loaded for this action.'), 'error');
    return;
  }

  state.designBusy = true;
  _paint();
  try{
    var res;
    if(actionId === 'load_registry'){
      res = await _api('schema_studio_load_registry', {}, 'POST', 45000);
      if(!res || !res.ok) throw _actionError(res, 'load_registry_failed');
      state.designSchema = res.schema || null;
      state.designBaseline = null;
      state.designRevisions = null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designEditor = _jsonPretty(state.designSchema || {});
      state.selectedDesignId = _currentDesignId();
      state.designResult = { type: actionId, payload: res };
    } else if(actionId === 'reverse_engineer'){
      res = await _api('schema_studio_reverse_engineer', {}, 'POST', 45000);
      if(!res || !res.ok) throw _actionError(res, 'reverse_engineer_failed');
      state.designSchema = res.schema || null;
      state.designBaseline = null;
      state.designRevisions = null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designEditor = _jsonPretty(state.designSchema || {});
      state.selectedDesignId = _currentDesignId();
      state.designResult = { type: actionId, payload: res };
    } else if(actionId === 'save_design'){
      var parsedDesign = _parseJson(state.designEditor, 'design_editor');
      if(!parsedDesign.ok) throw new Error(parsedDesign.error);
      state.designSchema = parsedDesign.value || {};
      res = await _api('schema_studio_save', { schema: state.designSchema, revisions: _currentDesignRevisions() }, 'POST', 45000);
      if(!res || !res.ok) throw _actionError(res, 'design_save_failed');
      state.selectedDesignId = res.id || _currentDesignId();
      state.designRevisions = res.revisions || null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designResult = { type: actionId, payload: res };
      await _loadWorkspace(true);
      if(state.selectedDesignId) await _loadDesign(state.selectedDesignId, true);
    } else if(actionId === 'validate'){
      var parsedValidate = _parseJson(state.designEditor, 'design_editor');
      if(!parsedValidate.ok) throw new Error(parsedValidate.error);
      state.designSchema = parsedValidate.value || {};
      res = await _api('schema_studio_validate', { schema: state.designSchema }, 'POST', 45000);
      if(!res || !res.ok) throw _actionError(res, 'design_validate_failed');
      state.designResult = { type: actionId, payload: res };
    } else if(actionId === 'set_baseline'){
      var parsedBaseline = _parseJson(state.designEditor, 'design_editor');
      if(!parsedBaseline.ok) throw new Error(parsedBaseline.error);
      state.designSchema = parsedBaseline.value || {};
      res = await _api('schema_studio_set_baseline', { design_id: designId || 'workspace', schema: state.designSchema, revisions: _currentDesignRevisions() }, 'POST', 45000);
      if(!res || !res.ok) throw _actionError(res, 'set_baseline_failed');
      state.designBaseline = JSON.parse(JSON.stringify(state.designSchema));
      state.designRevisions = res.revisions || null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designResult = { type: actionId, payload: res };
      await _loadWorkspace(true);
    } else if(actionId === 'diagnose'){
      var parsedDiagnose = _parseJson(state.designEditor, 'design_editor');
      if(!parsedDiagnose.ok) throw new Error(parsedDiagnose.error);
      state.designSchema = parsedDiagnose.value || {};
      res = await _api('schema_studio_diagnose', {
        design_id: designId || 'workspace',
        schema: state.designSchema,
        baseline: state.designBaseline || undefined,
        revisions: _currentDesignRevisions()
      }, 'POST', 60000);
      if(!res || !res.ok) throw _actionError(res, 'diagnose_failed');
      state.designRevisions = res.revisions || null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designResult = { type: actionId, payload: res };
      await _loadWorkspace(true);
    } else if(actionId === 'compile'){
      var parsedCompile = _parseJson(state.designEditor, 'design_editor');
      if(!parsedCompile.ok) throw new Error(parsedCompile.error);
      state.designSchema = parsedCompile.value || {};
      res = await _api('schema_studio_compile_registry', {
        design_id: designId || 'workspace',
        schema: state.designSchema,
        revisions: _currentDesignRevisions()
      }, 'POST', 60000);
      if(!res || !res.ok) throw _actionError(res, 'compile_failed');
      state.designRevisions = res.revisions || null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designResult = { type: actionId, payload: res };
      await _loadWorkspace(true);
    } else if(actionId === 'release'){
      var parsedRelease = _parseJson(state.designEditor, 'design_editor');
      if(!parsedRelease.ok) throw new Error(parsedRelease.error);
      state.designSchema = parsedRelease.value || {};
      res = await _api('schema_studio_release_bundle', {
        design_id: designId || 'workspace',
        schema: state.designSchema,
        baseline: state.designBaseline || undefined,
        revisions: _currentDesignRevisions()
      }, 'POST', 60000);
      if(!res || !res.ok) throw _actionError(res, 'release_failed');
      state.designRevisions = res.revisions || null;
      state.designSavePolicy = res.save_policy || _currentDesignSavePolicy();
      state.designResult = { type: actionId, payload: res };
      await _loadWorkspace(true);
      await _loadReleases();
    } else if(actionId === 'refresh_releases'){
      await _loadReleases();
    }
    _toast(_t('Đã chạy thao tác schema.', 'Schema action completed.'), 'success');
  }catch(err){
    _toast((err && err.message) || 'design_action_failed', 'error');
  }finally{
    state.designBusy = false;
    _paint();
  }
}

function _filteredApis(){
  var rows = _list('apis');
  return rows.filter(function(item){
    var search = String(state.apiSearch || '').trim().toLowerCase();
    if(search){
      var hay = [
        item.key, item.label, item.labelEn, item.domain, item.entity, item.path, item.module
      ].join(' ').toLowerCase();
      if(hay.indexOf(search) === -1) return false;
    }
    if(state.apiDomain !== 'ALL' && String(item.domain || '') !== state.apiDomain) return false;
    if(state.apiMethod !== 'ALL' && String(item.method || '') !== state.apiMethod) return false;
    if(state.apiKind !== 'ALL' && String(item.kind || '') !== state.apiKind) return false;
    return true;
  });
}

function _filteredTables(){
  var rows = _list('tables');
  return rows.filter(function(item){
    var search = String(state.tableSearch || '').trim().toLowerCase();
    if(search){
      var hay = [
        item.key, item.label, item.labelEn, item.domain, item.primaryKey, item.workflowId
      ].join(' ').toLowerCase();
      if(hay.indexOf(search) === -1) return false;
    }
    if(state.tableDomain !== 'ALL' && String(item.domain || '') !== state.tableDomain) return false;
    return true;
  });
}

function _apiDomains(){
  var seen = {};
  var rows = [];
  _list('apis').forEach(function(item){
    var key = String(item.domain || '');
    if(!key || seen[key]) return;
    seen[key] = true;
    rows.push(key);
  });
  rows.sort();
  return rows;
}

function _tableDomains(){
  var seen = {};
  var rows = [];
  _list('tables').forEach(function(item){
    var key = String(item.domain || '');
    if(!key || seen[key]) return;
    seen[key] = true;
    rows.push(key);
  });
  rows.sort();
  return rows;
}

function _apiKinds(){
  var seen = {};
  var rows = [];
  _list('apis').forEach(function(item){
    var key = String(item.kind || '');
    if(!key || seen[key]) return;
    seen[key] = true;
    rows.push(key);
  });
  rows.sort();
  return rows;
}

function _renderMetricCards(){
  var ws = _workspace();
  var m = ws.metrics || {};
  var connection = ws.connection || {};
  var dbProbeApplicable = _dbProbeApplicable(connection) || _dbProbeApplicable(m);
  var dbProbeResolved = _dbProbeResolved(connection) || _dbProbeResolved(m);
  var unlinkedComponentCount = Number(m.unlinked_endpoint_count || 0) + Number(m.unlinked_table_count || 0);
  var cards = [
    { label:_t('Endpoint catalog', 'Endpoint catalog'), value:m.endpoint_count, note:_t('Tổng endpoint có contract.', 'Total endpoints under contract.') },
    { label:_t('Runtime-linked APIs', 'Runtime-linked APIs'), value:_fmtInt(m.runtime_ready_endpoint_count) + ' / ' + _fmtInt(m.endpoint_count), note:_t('Endpoint có path, controller và handler thật trong backend.', 'Endpoints with a real backend path, controller and handler.') },
    { label:_t('Tables covered', 'Tables covered'), value:m.table_count, note:_t('Union từ registry + relation map.', 'Union from registry + relation map.') },
    { label:_t('Runtime-linked tables', 'Runtime-linked tables'), value:_fmtInt(m.runtime_contract_linked_table_count) + ' / ' + _fmtInt(m.table_count), note:_t('Bảng có migration, registry, relation map và API controller link.', 'Tables linked to migration, registry, relation map and API controllers.') },
    { label:_t('Unlinked components', 'Unlinked components'), value:unlinkedComponentCount, note:_t('Component không có bằng chứng runtime thật sẽ phải cách ly hoặc xóa.', 'Components without real runtime proof must be quarantined or removed.') },
    { label:_t('DB target status', 'DB target status'), value:(m.db_target_status || connection.db_target_status || 'not_configured'), note:(connection.db_target_reason || _t('Trạng thái DB đang được web runtime probe.', 'Status of the DB target probed by the web runtime.')) },
    { label:_t('Present in DB', 'Present in DB'), value:!dbProbeApplicable ? _t('N/A', 'N/A') : (dbProbeResolved ? m.db_present_table_count : '—'), note:!dbProbeApplicable ? _t('Chưa có hồ sơ DB thật để probe trực tiếp.', 'No live DB profile is configured for direct probing.') : (dbProbeResolved ? _t('Bảng thật tìm thấy trong PostgreSQL.', 'Tables found in live PostgreSQL.') : _t('Đã có hồ sơ DB nhưng probe hiện chưa resolve được truth từ PostgreSQL.', 'A DB profile exists, but the probe has not resolved live PostgreSQL truth yet.')) },
    { label:_t('Structural drift', 'Structural drift'), value:!dbProbeApplicable ? _t('N/A', 'N/A') : (dbProbeResolved ? m.db_structural_drift_table_count : '—'), note:!dbProbeApplicable ? _t('Chưa cấu hình DB probe nên không thể so drift.', 'No DB probe is configured, so structural drift cannot be compared.') : (dbProbeResolved ? _t('Bảng live lệch cột/PK so với authority.', 'Live tables drifting in columns or PK from authority.') : _t('Probe DB đang lỗi hoặc chưa tới được PostgreSQL nên drift chưa thể kết luận.', 'The DB probe is currently failing or cannot reach PostgreSQL, so structural drift is still unknown.')) },
    { label:_t('Operational risks', 'Operational risks'), value:m.operational_risk_count, note:_t('Rủi ro vận hành và logic chưa an toàn.', 'Operational and logic risks that still need treatment.') },
    { label:_t('Blocking risks', 'Blocking risks'), value:m.blocking_operational_risk_count, note:_t('Điểm đang chặn release gate.', 'Risks currently blocking the release gate.') },
    { label:_t('Stale artifacts', 'Stale artifacts'), value:m.stale_artifact_count, note:_t('Artifact quá tuổi hoặc lệch chu kỳ sinh.', 'Artifacts that are stale or generated out of cycle.') },
    { label:_t('Dependency drift', 'Dependency drift'), value:m.dependency_outdated_artifact_count, note:_t('Artifact dẫn xuất bị source vượt mặt.', 'Derived artifacts that lag behind their source documents.') },
    { label:_t('Blind spots critical', 'Blind spots critical'), value:m.operational_blind_spot_critical_count, note:_t('Khe hở nghiệp vụ/governance còn ở mức critical.', 'Critical business/governance blind spots still open.') },
    { label:_t('Stress paths critical', 'Stress paths critical'), value:m.operational_stress_critical_count, note:_t('Tình huống thực chiến còn fail truth.', 'Critical real-world stress paths still fail truth.') },
    { label:_t('Publishability blockers', 'Publishability blockers'), value:m.publishability_blockers, note:_t('Frontend/contract blockers từ quality report.', 'Frontend/contract blockers from the quality report.') },
    { label:_t('Designs / releases', 'Designs / releases'), value:_fmtInt(m.design_count) + ' / ' + _fmtInt(m.release_count), note:_t('Working design và bundle phát hành.', 'Working designs and release bundles.') }
  ];
  return '<div class="ds-metric-grid">' + cards.map(function(card){
    return '<article class="ds-metric-card"><small>' + _esc(card.label) + '</small><strong>' + _esc(String(card.value == null ? '0' : card.value)) + '</strong><p>' + _esc(card.note) + '</p></article>';
  }).join('') + '</div>';
}

function _renderOverview(){
  var ws = _workspace();
  var metrics = ws.metrics || {};
  var connection = ws.connection || {};
  var dataLayer = connection.data_layer || {};
  var dbProbeApplicable = _dbProbeApplicable(connection) || _dbProbeApplicable(metrics);
  var dbProbeResolved = _dbProbeResolved(connection) || _dbProbeResolved(metrics);
  var dbProbeReachable = _dbProbeReachable(connection) || _dbProbeReachable(metrics);
  var runtimePathActive = !!(connection.runtime_path_active || dataLayer.postgres_path_active || metrics.runtime_postgres_path_active);
  var highlights = ws.highlights || {};
  var audits = ws.audits || {};
  var artifacts = ws.artifacts || {};
  var operational = ws.operational || {};
  var domains = Array.isArray(ws.domains) ? ws.domains.slice(0, 12) : [];

  var blockers = Array.isArray(highlights.blockers) ? highlights.blockers : [];
  var governanceGaps = Array.isArray(highlights.governance_gaps) ? highlights.governance_gaps : [];
  var governanceDirectMissing = Array.isArray(highlights.governance_direct_missing) ? highlights.governance_direct_missing : [];
  var unlinkedComponents = Array.isArray(highlights.unlinked_components) ? highlights.unlinked_components : [];
  var registryGaps = Array.isArray(highlights.registry_gaps) ? highlights.registry_gaps : [];
  var dbMissing = Array.isArray(highlights.db_missing_tables) ? highlights.db_missing_tables : [];
  var dbUnexpected = Array.isArray(highlights.db_unexpected_tables) ? highlights.db_unexpected_tables : [];
  var structuralDrift = Array.isArray(highlights.structural_drift) ? highlights.structural_drift : [];
  var blindSpots = Array.isArray(highlights.blind_spots) ? highlights.blind_spots : [];
  var stressScenarios = Array.isArray(highlights.stress_scenarios) ? highlights.stress_scenarios : [];
  var migrationHotspots = Array.isArray(highlights.migration_hotspots) ? highlights.migration_hotspots : [];
  var operationalRisks = Array.isArray(operational.risks) ? operational.risks : [];
  var coverageGaps = Array.isArray(operational.coverageGaps) ? operational.coverageGaps : [];
  var freshness = operational.freshness || {};
  var freshnessArtifacts = Array.isArray(freshness.artifacts) ? freshness.artifacts : [];
  var releaseGate = operational.releaseGate || {};
  var saveGuard = operational.saveGuard || ws.save_policy || {};
  var blindSpotSummary = audits.blind_spots && audits.blind_spots.summary ? audits.blind_spots.summary : {};
  var stressSummary = audits.stress && audits.stress.summary ? audits.stress.summary : {};
  var migrationTablePresent = !!connection.migration_table_present;
  var appliedMigrationCount = Number(connection.applied_migration_count || 0);
  var migrationFileCount = Number(connection.migration_file_count || 0);
  var pendingMigrationCount = Number(connection.pending_migration_count || 0);
  var migrationLedgerTone = !dbProbeReachable ? 'neutral' : (migrationTablePresent ? (appliedMigrationCount > 0 ? 'good' : 'bad') : 'bad');
  var migrationLedgerStatus = !dbProbeReachable
    ? _t('N/A', 'N/A')
    : (migrationTablePresent
      ? (appliedMigrationCount > 0 ? _t('Tracked', 'Tracked') : _t('Empty', 'Empty'))
      : _t('Missing', 'Missing'));
  var dbHeroTone = !dbProbeApplicable ? 'neutral' : (!dbProbeReachable ? 'bad' : (runtimePathActive ? 'good' : 'warn'));
  var dbHeroStatus = !dbProbeApplicable
    ? _t('Not configured', 'Not configured')
    : (!dbProbeReachable
      ? _t('Unavailable', 'Unavailable')
      : (runtimePathActive ? _t('Connected', 'Connected') : _t('Connected / runtime JSON', 'Connected / runtime JSON')));
  var dbHeroText = !dbProbeApplicable
    ? _t('Chưa có hồ sơ kết nối DB thật để kiểm tra production truth.', 'No live DB connection profile is configured for production truth checks.')
    : (dbProbeReachable
      ? ((connection.database || '—') + ' / ' + (connection.schema || '—') + (runtimePathActive ? '' : ' · ' + _t('runtime vẫn đang JSON_ONLY hoặc shadow gap', 'runtime still runs JSON_ONLY or remains split-brain')))
      : (connection.error || _t('Không thể tới PostgreSQL bằng profile đang lưu.', 'Could not reach PostgreSQL with the stored connection profile.')));

  return [
    '<section class="ds-hero">',
      '<div class="ds-hero-copy">',
        '<span class="ds-kicker">' + _esc(_t('Admin data platform', 'Admin data platform')) + '</span>',
        '<h2>' + _esc(_t('Data Schema control plane rebuilt around registry truth, PostgreSQL truth and release truth', 'Data Schema control plane rebuilt around registry truth, PostgreSQL truth and release truth')) + '</h2>',
        '<p>' + _esc(_t(
          'Module này bây giờ phải trả lời được 4 câu hỏi vận hành thật: dữ liệu có đồng bộ chu kỳ không, release có đang bị chặn không, runtime có đang nhìn cùng một nguồn sự thật không, và save có còn nguy cơ ghi đè im lặng hay không.',
          'This module now has to answer four real operating questions: are artifacts generated in sync, is release currently blocked, is runtime looking at the same source of truth, and can saves still overwrite silently.'
        )) + '</p>',
      '</div>',
      '<div class="ds-hero-side">',
        '<div class="ds-hero-card">',
          '<small>' + _esc(_t('Live DB probe', 'Live DB probe')) + '</small>',
          '<strong class="tone-' + _esc(dbHeroTone) + '">' + _esc(dbHeroStatus) + '</strong>',
          '<p>' + _esc(dbHeroText) + '</p>',
        '</div>',
        '<div class="ds-hero-card">',
          '<small>' + _esc(_t('Release gate', 'Release gate')) + '</small>',
          '<strong class="tone-' + _esc(_tone(releaseGate.blocking ? 'blocked' : (releaseGate.status || 'neutral'))) + '">' + _esc(releaseGate.status || '—') + '</strong>',
          '<p>' + _esc(_t('Blocking reasons', 'Blocking reasons') + ': ' + _fmtInt(releaseGate.reasonCount || 0)) + '</p>',
        '</div>',
        '<div class="ds-hero-card">',
          '<small>' + _esc(_t('Save guard', 'Save guard')) + '</small>',
          '<strong class="tone-' + _esc(saveGuard.requiresRevision ? 'good' : 'warn') + '">' + _esc(saveGuard.requiresRevision ? _t('Revision locked', 'Revision locked') : _t('Unsafe', 'Unsafe')) + '</strong>',
          '<p>' + _esc(_t('Payload limit', 'Payload limit') + ': ' + _fmtBytes(saveGuard.maxPayloadBytes || 0)) + '</p>',
        '</div>',
      '</div>',
    '</section>',
    _renderMetricCards(),
    '<div class="ds-grid ds-grid-2">',
      '<section class="ds-panel">',
        '<div class="ds-panel-head"><div><small>' + _esc(_t('Connection reality', 'Connection reality')) + '</small><h3>' + _esc(_t('Registry vs PostgreSQL', 'Registry vs PostgreSQL')) + '</h3></div></div>',
        '<div class="ds-panel-body">',
          _dbTargetAlert(connection),
          '<div class="ds-facts">',
            '<div><span>' + _esc(_t('DB target status', 'DB target status')) + '</span><strong class="tone-' + _esc(connection.db_target_healthy ? 'good' : (dbProbeApplicable ? 'warn' : 'neutral')) + '">' + _esc(connection.db_target_status || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Authority coverage', 'Authority coverage')) + '</span><strong class="tone-' + _esc(connection.db_target_healthy ? 'good' : 'warn') + '">' + _esc(_fmtInt(connection.present_table_count || 0) + ' / ' + _fmtInt(connection.db_target_authority_table_count || metrics.table_count || 0)) + '</strong></div>',
            '<div><span>' + _esc(_t('Probe configured', 'Probe configured')) + '</span><strong class="tone-' + _esc(dbProbeApplicable ? 'good' : 'neutral') + '">' + _esc(dbProbeApplicable ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
            '<div><span>' + _esc(_t('Reachable', 'Reachable')) + '</span><strong class="tone-' + _esc(dbProbeApplicable ? (dbProbeReachable ? 'good' : 'bad') : 'neutral') + '">' + _esc(dbProbeApplicable ? (dbProbeReachable ? _t('Yes', 'Yes') : _t('No', 'No')) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Present tables', 'Present tables')) + '</span><strong>' + _esc(dbProbeResolved ? _fmtInt(connection.present_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Missing tables', 'Missing tables')) + '</span><strong class="tone-' + _esc(dbProbeResolved ? (connection.missing_table_count ? 'warn' : 'good') : 'neutral') + '">' + _esc(dbProbeResolved ? _fmtInt(connection.missing_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Structural drift tables', 'Structural drift tables')) + '</span><strong class="tone-' + _esc(dbProbeResolved ? (connection.structural_drift_table_count ? 'warn' : 'good') : 'neutral') + '">' + _esc(dbProbeResolved ? _fmtInt(connection.structural_drift_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Authoritative count', 'Authoritative count')) + '</span><strong>' + _esc(_fmtInt(metrics.authoritative_table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Registry count', 'Registry count')) + '</span><strong>' + _esc(_fmtInt(metrics.registry_table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Registry gaps', 'Registry gaps')) + '</span><strong class="tone-' + _esc(metrics.registry_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(metrics.registry_gap_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Data layer mode', 'Data layer mode')) + '</span><strong>' + _esc(dataLayer.mode || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Postgres path', 'Postgres path')) + '</span><strong class="tone-' + _esc(runtimePathActive ? 'good' : 'warn') + '">' + _esc(runtimePathActive ? _t('Active', 'Active') : _t('Inactive', 'Inactive')) + '</strong></div>',
            '<div><span>' + _esc(_t('JSON fallback', 'JSON fallback')) + '</span><strong class="tone-' + _esc(dataLayer.json_fallback ? 'warn' : 'good') + '">' + _esc(dataLayer.json_fallback ? _t('Enabled', 'Enabled') : _t('Off', 'Off')) + '</strong></div>',
            '<div><span>' + _esc(_t('DB target', 'DB target')) + '</span><strong>' + _esc((connection.host || '—') + ':' + (connection.port || '—')) + '</strong></div>',
            '<div><span>' + _esc(_t('Migration ledger', 'Migration ledger')) + '</span><strong class="tone-' + _esc(migrationLedgerTone) + '">' + _esc(migrationLedgerStatus) + '</strong></div>',
            '<div><span>' + _esc(_t('Applied migrations', 'Applied migrations')) + '</span><strong class="tone-' + _esc(dbProbeReachable && pendingMigrationCount > 0 ? 'warn' : 'good') + '">' + _esc(_fmtInt(appliedMigrationCount) + ' / ' + _fmtInt(migrationFileCount)) + '</strong></div>',
          '</div>',
          (!dbProbeApplicable ? '<div class="ds-inline-alert tone-neutral">' + _esc(_t('Chưa có hồ sơ DB thật nên module này chưa thể kiểm tra production truth từ PostgreSQL.', 'No live DB profile is configured yet, so this module cannot verify production truth from PostgreSQL.')) + '</div>' : ''),
          (dbProbeApplicable && dbProbeReachable && !runtimePathActive ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('DB thật đang reachable, nhưng runtime ứng dụng vẫn chưa chạy trên PostgreSQL. Đây là trạng thái split-brain: Data Schema nhìn thấy DB truth còn app runtime vẫn có thể đọc/ghi qua JSON path.', 'The live DB is reachable, but the application runtime is still not on PostgreSQL. This is a split-brain state: Data Schema can see DB truth while the app runtime may still read/write through the JSON path.')) + '</div>' : ''),
          (dbProbeReachable && connection.present_table_count > 0 && (!migrationTablePresent || appliedMigrationCount <= 0) ? '<div class="ds-inline-alert tone-bad">' + _esc(_t('PostgreSQL đã có bảng live, nhưng authority ledger schema_migrations đang thiếu hoặc rỗng. Đây là khe hở vận hành: không thể biết DB hiện tại đã được áp những migration nào.', 'PostgreSQL already contains live tables, but the schema_migrations authority ledger is missing or empty. This is an operational gap: the system cannot prove which migrations produced the current DB state.')) + '</div>' : ''),
          (connection.error ? '<div class="ds-inline-alert tone-bad"><strong>' + _esc(_t('DB probe error', 'DB probe error')) + ':</strong> ' + _esc(connection.error) + '</div>' : ''),
        '</div>',
      '</section>',
      '<section class="ds-panel">',
        '<div class="ds-panel-head"><div><small>' + _esc(_t('Registry quality', 'Registry quality')) + '</small><h3>' + _esc(_t('Publishability and authority', 'Publishability and authority')) + '</h3></div></div>',
        '<div class="ds-panel-body">',
          '<div class="ds-facts">',
            '<div><span>' + _esc(_t('Frontend blocked', 'Frontend blocked')) + '</span><strong class="tone-' + _esc((artifacts.registry_quality && artifacts.registry_quality.summary && artifacts.registry_quality.summary.frontendBlockedEntities) ? 'warn' : 'good') + '">' + _esc(_fmtInt(artifacts.registry_quality && artifacts.registry_quality.summary && artifacts.registry_quality.summary.frontendBlockedEntities)) + '</strong></div>',
            '<div><span>' + _esc(_t('Contract issues', 'Contract issues')) + '</span><strong class="tone-' + _esc((artifacts.registry_quality && artifacts.registry_quality.summary && artifacts.registry_quality.summary.contractIssues) ? 'warn' : 'good') + '">' + _esc(_fmtInt(artifacts.registry_quality && artifacts.registry_quality.summary && artifacts.registry_quality.summary.contractIssues)) + '</strong></div>',
            '<div><span>' + _esc(_t('Publishability', 'Publishability')) + '</span><strong class="tone-' + _esc(_tone(artifacts.registry_quality && artifacts.registry_quality.publishability && artifacts.registry_quality.publishability.status)) + '">' + _esc((artifacts.registry_quality && artifacts.registry_quality.publishability && artifacts.registry_quality.publishability.status) || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Schema authority', 'Schema authority')) + '</span><strong>' + _esc(_fmtInt(metrics.authoritative_table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('API implementation linked', 'API implementation linked')) + '</span><strong class="tone-' + _esc(metrics.unlinked_endpoint_count ? 'bad' : 'good') + '">' + _esc(_fmtInt(metrics.runtime_ready_endpoint_count) + ' / ' + _fmtInt(metrics.endpoint_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Runtime contract tables', 'Runtime contract tables')) + '</span><strong class="tone-' + _esc(metrics.unlinked_table_count ? 'bad' : 'good') + '">' + _esc(_fmtInt(metrics.runtime_contract_linked_table_count) + ' / ' + _fmtInt(metrics.table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Unlinked components', 'Unlinked components')) + '</span><strong class="tone-' + _esc((Number(metrics.unlinked_endpoint_count || 0) + Number(metrics.unlinked_table_count || 0)) ? 'bad' : 'good') + '">' + _esc(_fmtInt(Number(metrics.unlinked_endpoint_count || 0) + Number(metrics.unlinked_table_count || 0))) + '</strong></div>',
            '<div><span>' + _esc(_t('Artifact drift', 'Artifact drift')) + '</span><strong class="tone-' + _esc(_tone(freshness.driftStatus || 'neutral')) + '">' + _esc(freshness.driftLabel || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Dependency drift', 'Dependency drift')) + '</span><strong class="tone-' + _esc((metrics.dependency_outdated_artifact_count ? 'warn' : 'good')) + '">' + _esc(_fmtInt(metrics.dependency_outdated_artifact_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Blind spots critical', 'Blind spots critical')) + '</span><strong class="tone-' + _esc((blindSpotSummary.critical ? 'bad' : 'good')) + '">' + _esc(_fmtInt(blindSpotSummary.critical)) + '</strong></div>',
            '<div><span>' + _esc(_t('Stress paths critical', 'Stress paths critical')) + '</span><strong class="tone-' + _esc((stressSummary.critical ? 'bad' : 'good')) + '">' + _esc(_fmtInt(stressSummary.critical)) + '</strong></div>',
            '<div><span>' + _esc(_t('Release gate', 'Release gate')) + '</span><strong class="tone-' + _esc(_tone(releaseGate.blocking ? 'blocked' : (releaseGate.status || 'neutral'))) + '">' + _esc(releaseGate.status || '—') + '</strong></div>',
          '</div>',
          '<div class="ds-helper-text">' + _esc(_t('Authority vẫn là migrations -> schema.sql. Registry chỉ là metadata vận hành, nên khoảng lệch phải hiện ra rõ ràng tại đây.', 'Authority remains migrations -> schema.sql. The registry is an operational metadata layer, so drift must be shown clearly here.')) + '</div>',
        '</div>',
      '</section>',
    '</div>',
    '<div class="ds-grid ds-grid-3">',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Operational risks', 'Operational risks')) + '</small><h3>' + _esc(_t('Rủi ro vận hành thật', 'Real operational risks')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(operationalRisks, 'operational') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Blockers', 'Blockers')) + '</small><h3>' + _esc(_t('Điểm nghẽn thật', 'Real blockers')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(blockers, 'blocker') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Governance gaps', 'Governance gaps')) + '</small><h3>' + _esc(_t('Thiếu metadata governance', 'Missing governance metadata')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(governanceGaps, 'governance') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Migration hotspots', 'Migration hotspots')) + '</small><h3>' + _esc(_t('Khoảng trống schema authority', 'Schema authority gaps')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(migrationHotspots, 'migration') + '</div></section>',
    '</div>',
    '<div class="ds-grid ds-grid-2">',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Runtime linkage', 'Runtime linkage')) + '</small><h3>' + _esc(_t('Thành phần không link hệ thống thật', 'Components not linked to real system truth')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(unlinkedComponents, 'unlinked') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Governance posture', 'Governance posture')) + '</small><h3>' + _esc(_t('Direct metadata được kế thừa / root-scope', 'Direct metadata inherited / root-scoped')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(governanceDirectMissing, 'direct_governance') + '</div></section>',
    '</div>',
    '<div class="ds-grid ds-grid-2">',
      '<section class="ds-panel">',
        '<div class="ds-panel-head"><div><small>' + _esc(_t('Missing coverage', 'Missing coverage')) + '</small><h3>' + _esc(_t('Registry / DB drift surfaces', 'Registry / DB drift surfaces')) + '</h3></div></div>',
        '<div class="ds-panel-body">',
          '<div class="ds-chip-row">' + (registryGaps.length ? registryGaps.map(function(item){ return _badge(item.table, 'warn'); }).join('') : _badge(_t('No registry gaps', 'No registry gaps'), 'good')) + '</div>',
          '<div class="ds-chip-row">' + (dbMissing.length ? dbMissing.map(function(item){ return _badge(item, 'bad'); }).join('') : _badge(_t('No DB gaps', 'No DB gaps'), 'good')) + '</div>',
          '<div class="ds-chip-row">' + (dbUnexpected.length ? dbUnexpected.map(function(item){ return _badge(item, 'warn'); }).join('') : _badge(_t('No unmanaged tables', 'No unmanaged tables'), 'good')) + '</div>',
        '</div>',
      '</section>',
      '<section class="ds-panel">',
        '<div class="ds-panel-head"><div><small>' + _esc(_t('Coverage gaps', 'Coverage gaps')) + '</small><h3>' + _esc(_t('Các điểm hệ thống chưa bao phủ đủ', 'Areas the system still does not cover well')) + '</h3></div></div>',
        '<div class="ds-panel-body">' + _renderIssueList(coverageGaps, 'coverage') + '</div>',
      '</section>',
    '</div>',
    '<div class="ds-grid ds-grid-3">',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Structural drift', 'Structural drift')) + '</small><h3>' + _esc(_t('Lệch cấu trúc DB thật', 'Live DB structural drift')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(structuralDrift, 'drift') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Blind spots', 'Blind spots')) + '</small><h3>' + _esc(_t('Khe hở vận hành critical', 'Critical operational blind spots')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(blindSpots, 'audit') + '</div></section>',
      '<section class="ds-panel"><div class="ds-panel-head"><div><small>' + _esc(_t('Stress paths', 'Stress paths')) + '</small><h3>' + _esc(_t('Stress scenario critical', 'Critical stress scenarios')) + '</h3></div></div><div class="ds-panel-body">' + _renderIssueList(stressScenarios, 'audit') + '</div></section>',
    '</div>',
    '<section class="ds-panel">',
      '<div class="ds-panel-head"><div><small>' + _esc(_t('Artifact freshness', 'Artifact freshness')) + '</small><h3>' + _esc(_t('Chu kỳ sinh registry / authority', 'Registry / authority generation cycles')) + '</h3></div></div>',
      '<div class="ds-panel-body">' + _renderArtifactFreshnessTable(freshnessArtifacts) + '</div>',
    '</section>',
    '<section class="ds-panel">',
      '<div class="ds-panel-head"><div><small>' + _esc(_t('Action rail', 'Action rail')) + '</small><h3>' + _esc(_t('Luồng xử lý chuẩn', 'Standard remediation flow')) + '</h3></div></div>',
      '<div class="ds-panel-body">',
        '<div class="ds-action-rail">',
          '<button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.setTab("designs")\'>' + _esc(_t('Mở workspace design', 'Open design workspace')) + '</button>',
          '<button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.setTab("tables")\'>' + _esc(_t('Rà soát bảng thật', 'Audit live tables')) + '</button>',
          '<button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.setTab("apis")\'>' + _esc(_t('Rà soát API contract', 'Audit API contracts')) + '</button>',
          '<button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.setTab("libraries")\'>' + _esc(_t('Sửa blueprint / variable', 'Fix blueprint / variables')) + '</button>',
        '</div>',
      '</div>',
    '</section>',
    '<section class="ds-panel">',
      '<div class="ds-panel-head"><div><small>' + _esc(_t('Domain coverage', 'Domain coverage')) + '</small><h3>' + _esc(_t('Bức tranh theo domain', 'Domain posture by domain')) + '</h3></div></div>',
      '<div class="ds-panel-body">' + _renderDomainTable(domains) + '</div>',
    '</section>'
  ].join('');
}

function _renderIssueList(items, mode){
  if(!Array.isArray(items) || !items.length){
    return _emptyState(_t('Không có mục nào', 'No items'), _t('Không có vấn đề nào ở nhóm này.', 'There are no issues in this group.'));
  }
  return '<div class="ds-issue-stack">' + items.map(function(item){
    if(mode === 'blocker'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.severity || 'info', _tone(item.severity || 'warn')) + '<strong>' + _esc(item.title || item.source || 'blocker') + '</strong></div><p>' + _esc(item.detail || '') + '</p>' + (item.nextAction ? '<div class="ds-helper-text">' + _esc(item.nextAction) + '</div>' : '') + '</article>';
    }
    if(mode === 'governance'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.domain || 'domain', 'warn') + '<strong>' + _esc(item.table || item.label || 'table') + '</strong></div><p>' + _esc((item.missing || []).join(', ')) + '</p></article>';
    }
    if(mode === 'direct_governance'){
      var inheritedVia = Array.isArray(item.inherited_via) && item.inherited_via.length ? ' · ' + _t('inherited via', 'inherited via') + ': ' + item.inherited_via.join(', ') : '';
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.status || 'classified', 'neutral') + _badge(item.domain || 'domain', 'neutral') + '<strong>' + _esc(item.table || item.label || 'table') + '</strong></div><p>' + _esc(((item.missing || []).join(', ') || _t('Không có field trực tiếp bị thiếu.', 'No direct fields missing.')) + inheritedVia) + '</p><div class="ds-helper-text">' + _esc(_t('Đây là posture đã phân loại, không phải blocker nếu bảng là root-scope hoặc kế thừa governance qua quan hệ thật.', 'This is classified posture, not a blocker when the table is root-scoped or inherits governance through real relationships.')) + '</div></article>';
    }
    if(mode === 'unlinked'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.type || 'component', 'bad') + '<strong>' + _esc(item.key || item.label || 'component') + '</strong></div><p>' + _esc(item.reason || _t('Không có bằng chứng link runtime.', 'No runtime link proof found.')) + '</p></article>';
    }
    if(mode === 'migration'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.priority || 'medium', _tone(item.priority || 'warn')) + '<strong>' + _esc(item.table || 'table') + '</strong></div><p>' + _esc(item.reason || '') + '</p>' + (item.suggestedMigration ? '<div class="ds-helper-text">' + _esc(item.suggestedMigration) + '</div>' : '') + '</article>';
    }
    if(mode === 'operational'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.severity || 'warn', _tone(item.severity || 'warn')) + (item.blocking ? _badge(_t('blocking', 'blocking'), 'bad') : '') + '<strong>' + _esc(item.title || item.id || 'risk') + '</strong></div><p>' + _esc(item.detail || '') + '</p>' + (item.nextAction ? '<div class="ds-helper-text">' + _esc(item.nextAction) + '</div>' : '') + '</article>';
    }
    if(mode === 'drift'){
      var driftBits = [];
      if(Array.isArray(item.missing) && item.missing.length) driftBits.push(_t('Missing', 'Missing') + ': ' + item.missing.join(', '));
      if(Array.isArray(item.unexpected) && item.unexpected.length) driftBits.push(_t('Unexpected', 'Unexpected') + ': ' + item.unexpected.join(', '));
      if(item.pk_drift) driftBits.push(_t('Primary key mismatch', 'Primary key mismatch'));
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.domain || 'domain', 'warn') + '<strong>' + _esc(item.table || item.label || 'table') + '</strong></div><p>' + _esc(driftBits.join(' · ')) + '</p></article>';
    }
    if(mode === 'audit'){
      var rationale = Array.isArray(item.rationale) ? item.rationale.join(' ') : '';
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(item.severity || item.priority || 'warn', _tone(item.severity || item.priority || 'warn')) + '<strong>' + _esc((item.id || 'audit') + ' · ' + (item.title || '')) + '</strong></div><p>' + _esc(rationale || _t('Chưa có rationale chi tiết.', 'No detailed rationale is attached.')) + '</p></article>';
    }
    if(mode === 'coverage'){
      return '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('gap', 'gap'), 'warn') + '<strong>' + _esc(item.title || 'gap') + '</strong></div><p>' + _esc(item.detail || '') + '</p></article>';
    }
    return '<article class="ds-issue-card"><strong>' + _esc(item.title || item.table || item.label || 'item') + '</strong></article>';
  }).join('') + '</div>';
}

function _renderArtifactFreshnessTable(rows){
  if(!Array.isArray(rows) || !rows.length){
    return _emptyState(_t('Chưa có artifact', 'No artifacts'), _t('Không có dữ liệu freshness cho artifacts.', 'No freshness data is available for artifacts.'));
  }
  return '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>' + _esc(_t('Artifact', 'Artifact')) + '</th><th>' + _esc(_t('Category', 'Category')) + '</th><th>' + _esc(_t('Status', 'Status')) + '</th><th>' + _esc(_t('Age', 'Age')) + '</th><th>' + _esc(_t('Source drift', 'Source drift')) + '</th><th>' + _esc(_t('Size', 'Size')) + '</th><th>' + _esc(_t('Source', 'Source')) + '</th></tr></thead><tbody>' + rows.map(function(row){
    var sourceDrift = row.dependencyStatus === 'n/a'
      ? _badge(_t('n/a', 'n/a'), 'neutral')
      : _badge(row.dependencyStatus || 'aligned', _tone(row.dependencyStatus || 'neutral'));
    var releaseBadge = row.requiredForRelease ? _badge(_t('release', 'release'), 'warn') : '';
    return '<tr><td><strong>' + _esc(row.label || row.id) + '</strong><div class="ds-table-note">' + _esc(row.id || '') + '</div><div class="ds-chip-row">' + releaseBadge + '</div></td><td>' + _badge(row.category || 'artifact', 'neutral') + '</td><td>' + _badge(row.status || 'unknown', _tone(row.status || 'neutral')) + '</td><td>' + _esc(row.ageLabel || '—') + '<div class="ds-table-note">' + _esc(_fmtTime(row.generatedAt || row.fileMtime)) + '</div></td><td>' + sourceDrift + '<div class="ds-table-note">' + _esc(row.sourceDriftLabel || '0s') + (row.latestDependencyAt ? ' · ' + _esc(_fmtTime(row.latestDependencyAt)) : '') + '</div>' + (row.latestDependencyPath ? '<div class="ds-table-note"><code>' + _esc(row.latestDependencyPath) + '</code></div>' : '') + '</td><td>' + _esc(row.sizeLabel || _fmtBytes(row.sizeBytes || 0)) + '</td><td><code>' + _esc(row.path || '') + '</code></td></tr>';
  }).join('') + '</tbody></table></div>';
}

function _renderDomainTable(rows){
  if(!rows.length){
    return _emptyState(_t('Chưa có domain', 'No domains'), _t('Không có dữ liệu domain để hiển thị.', 'No domain data is available.'));
  }
  return '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>' + _esc(_t('Domain', 'Domain')) + '</th><th>' + _esc(_t('API', 'API')) + '</th><th>' + _esc(_t('Tables', 'Tables')) + '</th><th>' + _esc(_t('Runtime linked', 'Runtime linked')) + '</th><th>' + _esc(_t('API-backed', 'API-backed')) + '</th><th>' + _esc(_t('Workflow', 'Workflow')) + '</th><th>' + _esc(_t('Gov gaps', 'Gov gaps')) + '</th><th>' + _esc(_t('Direct gov', 'Direct gov')) + '</th><th>' + _esc(_t('Unlinked', 'Unlinked')) + '</th><th>' + _esc(_t('Structural drift', 'Structural drift')) + '</th></tr></thead><tbody>' + rows.map(function(row){
    return '<tr><td><strong>' + _esc(row.label || row.id) + '</strong><div class="ds-table-note">' + _esc(row.id || '') + '</div></td><td>' + _esc(_fmtInt(row.api_count)) + '</td><td>' + _esc(_fmtInt(row.table_count)) + '</td><td class="tone-' + _esc(row.unlinked_table_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.runtime_linked_table_count)) + '</td><td>' + _esc(_fmtInt(row.api_backed_table_count)) + '</td><td>' + _esc(_fmtInt(row.workflow_table_count)) + '</td><td class="tone-' + _esc(row.governance_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.governance_gap_count)) + '</td><td class="tone-neutral">' + _esc(_fmtInt(row.governance_direct_gap_count)) + '</td><td class="tone-' + _esc(row.unlinked_table_count ? 'bad' : 'good') + '">' + _esc(_fmtInt(row.unlinked_table_count)) + '</td><td class="tone-' + _esc(row.structural_drift_table_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.structural_drift_table_count)) + '</td></tr>';
  }).join('') + '</tbody></table></div>';
}

function _renderApiTab(){
  var rows = _filteredApis();
  var detail = state.apiDetail;
  var summary = _selectedApiSummary();
  var current = detail && detail.item ? Object.assign({}, summary || {}, detail.item || {}) : (summary || null);
  var toolbar = [
    '<div class="ds-toolbar">',
      '<div class="ds-search"><input value="' + _esc(state.apiSearch) + '" placeholder="' + _esc(_t('Tìm action, path, entity...', 'Search action, path, entity...')) + '" oninput=\'DataSchemaAdmin.setApiSearch(this.value)\'></div>',
      '<div class="ds-select-row">',
        '<select onchange=\'DataSchemaAdmin.setApiDomain(this.value)\'><option value="ALL">All domains</option>' + _apiDomains().map(function(key){ return '<option value="' + _esc(key) + '"' + (state.apiDomain===key?' selected':'') + '>' + _esc(key) + '</option>'; }).join('') + '</select>',
        '<select onchange=\'DataSchemaAdmin.setApiMethod(this.value)\'><option value="ALL">All methods</option>' + ['GET','POST','PUT','PATCH','DELETE'].map(function(key){ return '<option value="' + _esc(key) + '"' + (state.apiMethod===key?' selected':'') + '>' + _esc(key) + '</option>'; }).join('') + '</select>',
        '<select onchange=\'DataSchemaAdmin.setApiKind(this.value)\'><option value="ALL">All kinds</option>' + _apiKinds().map(function(key){ return '<option value="' + _esc(key) + '"' + (state.apiKind===key?' selected':'') + '>' + _esc(key) + '</option>'; }).join('') + '</select>',
      '</div>',
    '</div>'
  ].join('');

  var listHtml = rows.length ? rows.map(function(item){
    var active = String(item.key) === String(state.selectedApiKey);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectApi(' + _js(item.key) + ')\'><div class="ds-list-head">' + _methodBadge(item.method) + '<strong>' + _esc(item.label || item.key) + '</strong></div><div class="ds-list-meta">' + _esc(item.key) + '</div><div class="ds-chip-row">' + _badge(item.domain || 'domain', 'neutral') + _badge(item.kind || 'kind', 'neutral') + _badge(item.implementation_linked ? 'CTRL LINKED' : 'UNLINKED', item.implementation_linked ? 'good' : 'bad') + _badge(item.truth_status || 'truth', _truthTone(item.truth_status)) + ((item.csrf_required) ? _badge('CSRF', 'warn') : '') + ((item.admin_only) ? _badge('ADMIN', 'bad') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Không có API', 'No APIs'), _t('Không còn API phù hợp bộ lọc hiện tại.', 'No APIs match the current filters.'));

  var authRequired = !!(current && ((current.security && current.security.auth_required) || current.auth_required));
  var csrfRequired = !!(current && ((current.security && current.security.csrf_required) || current.csrf_required));
  var adminOnly = !!(current && ((current.security && current.security.admin_only) || current.admin_only));
  var implementationLinked = !!(current && current.implementation_linked);
  var truthBinding = current && current.truthBinding ? current.truthBinding : {};
  var detailHtml = current ? [
    '<div class="ds-detail-scroll">',
      '<div class="ds-detail-head">',
        '<div><small>' + _esc(_t('Endpoint detail', 'Endpoint detail')) + '</small><h3>' + _esc(current.label || state.selectedApiKey) + '</h3><p>' + _esc(current.action || state.selectedApiKey) + '</p></div>',
        '<div class="ds-chip-row">' + _methodBadge(current.method || 'GET') + _badge(current.domain || 'domain', 'neutral') + _badge(current.kind || 'kind', 'neutral') + _badge(implementationLinked ? 'CTRL LINKED' : 'UNLINKED', implementationLinked ? 'good' : 'bad') + _badge(current.truth_status || 'truth', _truthTone(current.truth_status)) + '</div>',
      '</div>',
      '<div class="ds-facts">',
        '<div><span>Path</span><strong>' + _esc(current.path || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Controller', 'Controller')) + '</span><strong>' + _esc((current.controller || '—') + '::' + (current.handler || '—')) + '</strong></div>',
        '<div><span>' + _esc(_t('Truth link', 'Truth link')) + '</span><strong class="tone-' + _esc(_truthTone(current.truth_status)) + '">' + _esc(current.truth_status || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Implementation', 'Implementation')) + '</span><strong class="tone-' + _esc(implementationLinked ? 'good' : 'bad') + '">' + _esc(implementationLinked ? _t('Linked', 'Linked') : _t('Unlinked', 'Unlinked')) + '</strong></div>',
        '<div><span>' + _esc(_t('Field count', 'Field count')) + '</span><strong>' + _esc(_fmtInt(current.field_count)) + '</strong></div>',
        '<div><span>' + _esc(_t('Workflow mode', 'Workflow mode')) + '</span><strong>' + _esc(current.workflow_mode || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Security', 'Security')) + '</span><strong>' + _esc(authRequired ? 'auth' : 'public') + '</strong></div>',
      '</div>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Runtime binding', 'Runtime binding')) + '</h4><div class="ds-facts">' +
        '<div><span>' + _esc(_t('Layer', 'Layer')) + '</span><strong>' + _esc(truthBinding.layer || 'api_controller') + '</strong></div>' +
        '<div><span>' + _esc(_t('Status', 'Status')) + '</span><strong class="tone-' + _esc(_truthTone(current.truth_status)) + '">' + _esc(truthBinding.status || current.truth_status || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('Route', 'Route')) + '</span><strong>' + _esc(truthBinding.path || current.path || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('Handler', 'Handler')) + '</span><strong>' + _esc((truthBinding.controller || current.controller || '—') + '::' + (truthBinding.handler || current.handler || '—')) + '</strong></div>' +
      '</div>' + (!implementationLinked ? '<div class="ds-inline-alert tone-bad">' + _esc(_t('Endpoint này chưa có bằng chứng controller/handler thật nên không được coi là contract vận hành.', 'This endpoint has no real controller/handler proof and must not be treated as an operational contract.')) + '</div>' : '') + '</section>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Security and contract', 'Security and contract')) + '</h4><div class="ds-chip-row">' +
        _badge(authRequired ? 'AUTH' : 'PUBLIC', _boolTone(authRequired)) +
        _badge(csrfRequired ? 'CSRF' : 'NO CSRF', csrfRequired ? 'warn' : 'neutral') +
        _badge(adminOnly ? 'ADMIN ONLY' : 'SHARED', adminOnly ? 'bad' : 'good') +
        '</div><div class="ds-helper-text">' + _esc(_t('Dùng editor JSON bên dưới để chỉnh metadata endpoint, request/response và field packs.', 'Use the JSON editor below to update endpoint metadata, request/response and field packs.')) + '</div>' + _renderSaveGuard(detail, 'api') + '</section>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Request / response summary', 'Request / response summary')) + '</h4>' +
        '<div class="ds-inline-grid"><article class="ds-mini-card"><small>Request</small><strong>' + _esc(_fmtInt((detail.api_params && detail.api_params.params && detail.api_params.params.length) || (current.request && current.request.body_fields && current.request.body_fields.length) || 0)) + '</strong><p>' + _esc(_t('tham số / field được khai báo', 'declared params / fields')) + '</p></article>' +
        '<article class="ds-mini-card"><small>Fields</small><strong>' + _esc(_fmtInt((detail.fields || []).length)) + '</strong><p>' + _esc(_t('field definitions gắn với endpoint', 'field definitions bound to the endpoint')) + '</p></article>' +
        '<article class="ds-mini-card"><small>Deletion</small><strong>' + _esc((current.capabilities && current.capabilities.deletion && current.capabilities.deletion.mode) || '—') + '</strong><p>' + _esc(_t('chính sách xóa hiện tại', 'current deletion posture')) + '</p></article></div></section>',
      '<section class="ds-detail-section"><h4>JSON</h4><textarea class="ds-editor" oninput=\'DataSchemaAdmin.setApiEditor(this.value)\'>' + _esc(state.apiEditor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.saveApi()\'>' + _esc(_t('Lưu API metadata', 'Save API metadata')) + '</button><button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.copyApiPath()\'>' + _esc(_t('Copy path', 'Copy path')) + '</button></div></section>',
    '</div>'
  ].join('') : _emptyState(_t('Chọn một API', 'Select an API'), _t('Chọn một endpoint bên trái để xem contract và chỉnh metadata.', 'Select an endpoint on the left to inspect its contract and edit metadata.'));

  return '<div class="ds-shell"><aside class="ds-shell-list">' + toolbar + '<div class="ds-list-scroll">' + listHtml + '</div></aside><section class="ds-shell-detail">' + detailHtml + '</section></div>';
}

function _tableColumnRows(item, preview){
  var rows = [];
  var previewColumns = Array.isArray(preview && preview.columns) ? preview.columns : [];
  if(previewColumns.length){
    previewColumns.forEach(function(column){
      rows.push({
        name: column.column_name || '',
        type: column.data_type || column.udt_name || 'text',
        nullable: !!column.is_nullable || String(column.is_nullable||'').toUpperCase() === 'YES',
        source: 'db'
      });
    });
    return rows;
  }
  var columns = item && item.columns && typeof item.columns === 'object' ? item.columns : {};
  Object.keys(columns).forEach(function(name){
    var column = columns[name] || {};
    rows.push({
      name: name,
      type: column.type || 'text',
      nullable: !!column.nullable,
      source: 'registry'
    });
  });
  return rows;
}

function _renderPreviewTable(preview){
  if(!preview){
    return _emptyState(_t('Chưa tải preview', 'Preview not loaded'), _t('Bấm "Load preview" để lấy dữ liệu thật từ PostgreSQL.', 'Click "Load preview" to fetch live data from PostgreSQL.'));
  }
  if(preview.available === false){
    return '<div class="ds-inline-alert tone-warn">' + _esc(preview.message || _t('Preview không khả dụng.', 'Preview is unavailable.')) + '</div>';
  }
  var columns = Array.isArray(preview.columns) ? preview.columns : [];
  var rows = Array.isArray(preview.rows) ? preview.rows : [];
  if(!columns.length){
    return _emptyState(_t('Không có cột', 'No columns'), _t('Không lấy được metadata cột cho bảng này.', 'No column metadata could be loaded for this table.'));
  }
  return [
    '<div class="ds-preview-toolbar">',
      '<div class="ds-chip-row">',
        _badge(_t('Rows', 'Rows') + ': ' + _fmtInt(preview.totalRows || rows.length), 'neutral'),
        _badge(_t('Offset', 'Offset') + ': ' + _fmtInt(preview.offset || 0), 'neutral'),
        (preview.syntheticSample ? _badge(_t('Sample only', 'Sample only'), 'warn') : ''),
      '</div>',
      '<div class="ds-editor-actions">',
        '<button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.prevPreviewPage()\' ' + ((preview.offset || 0) <= 0 ? 'disabled' : '') + '>' + _esc(_t('Trang trước', 'Previous')) + '</button>',
        '<button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.nextPreviewPage()\' ' + (!preview.hasMore ? 'disabled' : '') + '>' + _esc(_t('Trang sau', 'Next')) + '</button>',
      '</div>',
    '</div>',
    '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>#</th>' + columns.map(function(column){ return '<th>' + _esc(column.column_name || '') + '</th>'; }).join('') + '<th>' + _esc(_t('Action', 'Action')) + '</th></tr></thead><tbody>' + (rows.length ? rows.map(function(row, index){
      return '<tr><td>' + _esc(String(index + 1 + (preview.offset || 0))) + '</td>' + columns.map(function(column){
        var value = row[column.column_name];
        if(value && typeof value === 'object') return '<td><code>' + _esc(JSON.stringify(value)) + '</code></td>';
        return '<td>' + _esc(value == null ? '' : String(value)) + '</td>';
      }).join('') + '<td><button class="ds-btn sm" type="button" onclick=\'DataSchemaAdmin.openRowUpdate(' + String(index) + ')\'>' + _esc(_t('Sửa', 'Edit')) + '</button></td></tr>';
    }).join('') : '<tr><td colspan="' + String(columns.length + 2) + '">' + _esc(_t('Không có dòng dữ liệu.', 'No rows available.')) + '</td></tr>') + '</tbody></table></div>'
  ].join('');
}

function _renderTableTab(){
  var rows = _filteredTables();
  var connection = _workspace().connection || {};
  var targetAlert = _dbTargetAlert(connection);
  var detail = state.tableDetail;
  var summary = _selectedTableSummary();
  var item = detail && detail.item ? Object.assign({}, summary || {}, detail.item || {}) : (summary || null);
  var preview = state.tablePreview;
  var columns = _tableColumnRows(item, preview);
  var tableTruthBinding = item && item.truthBinding ? item.truthBinding : {};
  var tableTruthStatus = item && item.truth_status ? item.truth_status : '';
  var governanceInheritedVia = item && Array.isArray(item.governance_inherited_via) ? item.governance_inherited_via : [];

  var listHtml = rows.length ? rows.map(function(row){
    var active = String(row.key) === String(state.selectedTableKey);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectTable(' + _js(row.key) + ')\'><div class="ds-list-head"><strong>' + _esc(row.label || row.key) + '</strong>' + _badge(_dbStatusLabelFor(row), _dbStatusToneFor(row)) + '</div><div class="ds-list-meta">' + _esc(row.key) + '</div><div class="ds-chip-row">' + _badge(row.domain || 'domain', 'neutral') + _badge(row.truth_status || 'truth', _truthTone(row.truth_status)) + _badge(row.runtime_contract_linked ? 'RUNTIME LINKED' : 'PARTIAL', row.runtime_contract_linked ? 'good' : _truthTone(row.truth_status)) + _badge(_fmtInt(row.linked_endpoint_count) + '/' + _fmtInt(row.endpoint_count) + ' API', row.linked_endpoint_count ? 'good' : 'neutral') + _badge(row.operationalRole || 'role', 'neutral') + (row.workflowId ? _badge('WF', 'good') : '') + (row.governance_gap_count ? _badge('GAP ' + row.governance_gap_count, 'warn') : '') + (row.column_drift_count ? _badge('DRIFT ' + row.column_drift_count, 'warn') : '') + (row.pk_drift ? _badge('PK', 'bad') : '') + (row.unlinked ? _badge('UNLINKED', 'bad') : '') + ((!row.registry_present) ? _badge('NOT IN REGISTRY', 'bad') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Không có bảng', 'No tables'), _t('Không còn bảng phù hợp bộ lọc hiện tại.', 'No tables match the current filters.'));

  var detailHtml = item ? [
    '<div class="ds-detail-scroll">',
      targetAlert,
      '<div class="ds-detail-head"><div><small>' + _esc(_t('Table detail', 'Table detail')) + '</small><h3>' + _esc(item.label || state.selectedTableKey) + '</h3><p>' + _esc(state.selectedTableKey) + '</p></div><div class="ds-chip-row">' + _badge(item.domain || 'domain', 'neutral') + _badge(tableTruthStatus || 'truth', _truthTone(tableTruthStatus)) + _badge(item.runtime_contract_linked ? 'RUNTIME LINKED' : 'PARTIAL', item.runtime_contract_linked ? 'good' : _truthTone(tableTruthStatus)) + _badge((item.primaryKey || 'no_pk'), item.primaryKey ? 'good' : 'warn') + _badge(_dbStatusLabelFor(item), _dbStatusToneFor(item)) + _badge(item.registry_present === false ? 'RELATION ONLY' : 'REGISTRY', item.registry_present === false ? 'warn' : 'good') + '</div></div>',
      '<div class="ds-facts">',
        '<div><span>' + _esc(_t('Columns', 'Columns')) + '</span><strong>' + _esc(_fmtInt(item.columnCount || columns.length)) + '</strong></div>',
        '<div><span>' + _esc(_t('DB columns', 'DB columns')) + '</span><strong class="tone-' + _esc(item.db_probe_applicable && item.db_probe_resolved ? (item.db_present ? 'good' : 'neutral') : 'neutral') + '">' + _esc(item.db_probe_applicable && item.db_probe_resolved ? _fmtInt(item.db_column_count || 0) : _t('N/A', 'N/A')) + '</strong></div>',
        '<div><span>' + _esc(_t('Primary key', 'Primary key')) + '</span><strong>' + _esc(item.primaryKey || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Status column', 'Status column')) + '</span><strong>' + _esc(item.statusColumn || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Workflow', 'Workflow')) + '</span><strong>' + _esc(item.workflowId || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Operational role', 'Operational role')) + '</span><strong>' + _esc(item.operationalRole || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('API links', 'API links')) + '</span><strong class="tone-' + _esc(item.linked_endpoint_count ? 'good' : 'neutral') + '">' + _esc(_fmtInt(item.linked_endpoint_count) + ' / ' + _fmtInt(item.endpoint_count)) + '</strong></div>',
        '<div><span>' + _esc(_t('Migration source', 'Migration source')) + '</span><strong class="tone-' + _esc(item.migration_source_present ? 'good' : 'warn') + '">' + _esc(item.migration || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Support table', 'Support table')) + '</span><strong>' + _esc(item.supportTable ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
        '<div><span>' + _esc(_t('Registry source', 'Registry source')) + '</span><strong>' + _esc(item.source || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Truth status', 'Truth status')) + '</span><strong class="tone-' + _esc(_truthTone(tableTruthStatus)) + '">' + _esc(tableTruthStatus || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Governance gaps', 'Governance gaps')) + '</span><strong class="tone-' + _esc(item.governance_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.governance_gap_count)) + '</strong></div>',
        '<div><span>' + _esc(_t('Governance mode', 'Governance mode')) + '</span><strong class="tone-' + _esc(item.governance_gap_count ? 'warn' : 'neutral') + '">' + _esc(item.governance_mode || item.governance_status || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Missing columns', 'Missing columns')) + '</span><strong class="tone-' + _esc(item.missing_column_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.missing_column_count || 0)) + '</strong></div>',
        '<div><span>' + _esc(_t('Unexpected columns', 'Unexpected columns')) + '</span><strong class="tone-' + _esc(item.unexpected_column_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.unexpected_column_count || 0)) + '</strong></div>',
        '<div><span>' + _esc(_t('Type drift', 'Type drift')) + '</span><strong class="tone-' + _esc(item.type_drift_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.type_drift_count || 0)) + '</strong></div>',
        '<div><span>' + _esc(_t('Primary key drift', 'Primary key drift')) + '</span><strong class="tone-' + _esc(item.pk_drift ? 'bad' : 'good') + '">' + _esc(item.pk_drift ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
        '<div><span>' + _esc(_t('Digital thread', 'Digital thread')) + '</span><strong>' + _esc(item.digital_thread ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
      '</div>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Runtime truth binding', 'Runtime truth binding')) + '</h4><div class="ds-facts">' +
        '<div><span>' + _esc(_t('Schema authority', 'Schema authority')) + '</span><strong class="tone-' + _esc(tableTruthBinding.schemaAuthority === 'linked' ? 'good' : 'warn') + '">' + _esc(tableTruthBinding.schemaAuthority || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('Registry', 'Registry')) + '</span><strong class="tone-' + _esc(tableTruthBinding.registry === 'linked' ? 'good' : 'bad') + '">' + _esc(tableTruthBinding.registry || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('Relation map', 'Relation map')) + '</span><strong class="tone-' + _esc(tableTruthBinding.relationMap === 'linked' ? 'good' : 'warn') + '">' + _esc(tableTruthBinding.relationMap || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('API controller', 'API controller')) + '</span><strong class="tone-' + _esc(tableTruthBinding.apiController === 'linked' ? 'good' : 'neutral') + '">' + _esc(tableTruthBinding.apiController || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('DB probe', 'DB probe')) + '</span><strong class="tone-' + _esc(_dbProbeTone(tableTruthBinding.dbProbe)) + '">' + _esc(tableTruthBinding.dbProbe || '—') + '</strong></div>' +
        '<div><span>' + _esc(_t('Migration path', 'Migration path')) + '</span><strong>' + _esc(item.migration_path || '—') + '</strong></div>' +
      '</div>' + (item.unlinked ? '<div class="ds-inline-alert tone-bad">' + _esc(_t('Bảng này không có bằng chứng link hệ thống thật và phải được cách ly khỏi contract vận hành.', 'This table has no proof linking it to the real system and must be quarantined from operational contracts.')) + '</div>' : '') + '</section>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Governance posture', 'Governance posture')) + '</h4>' + (item.governance_gap_count ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('Bảng này còn thiếu governance metadata bắt buộc ở scope trực tiếp.', 'This table still misses required governance metadata in its direct scope.')) + ' ' + _esc((item.governance_missing || []).join(', ')) + '</div>' : '<div class="ds-inline-alert tone-good">' + _esc(_t('Không còn governance gap có thể hành động cho bảng này.', 'No actionable governance gap remains for this table.')) + '</div>') + (item.governance_direct_missing_count ? '<div class="ds-helper-text">' + _esc(_t('Direct missing đã được phân loại', 'Classified direct missing') + ': ' + (item.governance_direct_missing || []).join(', ') + (governanceInheritedVia.length ? ' · ' + _t('inherited via', 'inherited via') + ': ' + governanceInheritedVia.join(', ') : '')) + '</div>' : '') + '</section>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Structural drift', 'Structural drift')) + '</h4>' + (
        (!item.db_probe_applicable)
          ? '<div class="ds-inline-alert tone-neutral">' + _esc(_t('Chưa có hồ sơ DB thật cho bảng này, nên module chưa thể đối chiếu drift với PostgreSQL.', 'No live DB profile is configured for this table yet, so the module cannot compare drift against PostgreSQL.')) + '</div>'
          : (!item.db_probe_resolved)
          ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('DB probe đã được cấu hình nhưng hiện chưa resolve được truth từ PostgreSQL, nên chưa thể kết luận drift cột/PK.', 'The DB probe is configured but has not resolved PostgreSQL truth yet, so column/PK drift cannot be concluded.')) + '</div>'
          : (item.db_status === 'missing_from_untracked_target')
          ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('Bảng này không có trong DB đang probe vì target DB có dữ liệu nhưng migration ledger rỗng. Đây là vấn đề cấu hình/baseline DB, không phải lỗi registry riêng của bảng.', 'This table is absent from the probed DB because the target DB has data but an empty migration ledger. This is a DB target/baseline issue, not an isolated registry defect.')) + '</div>'
          : (item.db_status === 'missing_from_incomplete_target')
          ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('Bảng này không có trong DB đang probe vì target DB chưa được nâng đủ theo authority schema. Cần promotion schema không mất dữ liệu trước khi dùng DB làm runtime authority.', 'This table is absent from the probed DB because the target DB has not been promoted to the full authority schema. A no-data-loss schema promotion is required before using DB as runtime authority.')) + '</div>'
          : (!item.db_present)
          ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('Bảng này chưa hiện diện trong PostgreSQL đang probe, nên chưa thể so drift cột/PK.', 'This table is not present in the probed PostgreSQL database yet, so column/PK drift cannot be compared.')) + '</div>'
          : (
            (!item.missing_column_count && !item.unexpected_column_count && !item.type_drift_count && !item.pk_drift)
              ? '<div class="ds-inline-alert tone-good">' + _esc(_t('Không phát hiện drift cột/type/PK giữa registry authority và DB thật.', 'No column/type/PK drift detected between registry authority and the live DB.')) + '</div>'
              : '<div class="ds-issue-stack">' +
                (item.missing_column_count ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('missing', 'missing'), 'warn') + '<strong>' + _esc(_t('Registry expects columns not present in DB', 'Registry expects columns not present in DB')) + '</strong></div><p>' + _esc((item.missing_columns || []).join(', ')) + '</p></article>' : '') +
                (item.unexpected_column_count ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('unexpected', 'unexpected'), 'warn') + '<strong>' + _esc(_t('DB contains unmanaged columns', 'DB contains unmanaged columns')) + '</strong></div><p>' + _esc((item.unexpected_columns || []).join(', ')) + '</p></article>' : '') +
                (item.type_drift_count ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('type', 'type'), 'warn') + '<strong>' + _esc(_t('DB column types differ from registry', 'DB column types differ from registry')) + '</strong></div><p>' + _esc((item.type_drifts || []).map(function(drift){ return (drift.column || '?') + ': ' + (drift.db || '?') + ' -> ' + (drift.expected || '?'); }).join(', ')) + '</p></article>' : '') +
                (item.pk_drift ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge('pk', 'bad') + '<strong>' + _esc(_t('Primary key posture differs', 'Primary key posture differs')) + '</strong></div><p>' + _esc(_t('Expected', 'Expected') + ': ' + (item.expected_primary_key_fields || []).join(', ') + ' · ' + _t('DB', 'DB') + ': ' + (item.db_primary_key_fields || []).join(', ')) + '</p></article>' : '') +
                '</div>'
          )
      ) + '</section>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Columns', 'Columns')) + '</h4>' + (columns.length ? '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>' + _esc(_t('Name', 'Name')) + '</th><th>' + _esc(_t('Type', 'Type')) + '</th><th>' + _esc(_t('Nullable', 'Nullable')) + '</th><th>' + _esc(_t('Source', 'Source')) + '</th></tr></thead><tbody>' + columns.map(function(column){
        return '<tr><td>' + _esc(column.name) + '</td><td>' + _esc(column.type) + '</td><td>' + _esc(column.nullable ? 'YES' : 'NO') + '</td><td>' + _esc(column.source || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : _emptyState(_t('Không có cột', 'No columns'), _t('Không lấy được cấu trúc cột.', 'Could not resolve the column structure.'))) + '</section>',
      '<section class="ds-detail-section"><div class="ds-section-head"><h4>' + _esc(_t('Live preview', 'Live preview')) + '</h4><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.loadPreview()\'>' + _esc(_t('Load preview', 'Load preview')) + '</button><button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.openRowInsert()\'>' + _esc(_t('Thêm dòng', 'Insert row')) + '</button></div></div>' + _renderPreviewTable(preview) + '</section>',
      (state.rowEditorOpen ? '<section class="ds-detail-section"><h4>' + _esc(state.rowEditorMode === 'insert' ? _t('Insert row JSON', 'Insert row JSON') : _t('Update row JSON', 'Update row JSON')) + '</h4><textarea class="ds-editor" oninput=\'DataSchemaAdmin.setRowEditorJson(this.value)\'>' + _esc(state.rowEditorJson) + '</textarea><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.saveRow()\'>' + _esc(_t('Lưu dòng', 'Save row')) + '</button><button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.closeRowEditor()\'>' + _esc(_t('Đóng', 'Close')) + '</button></div></section>' : ''),
      '<section class="ds-detail-section"><h4>' + _esc(_t('Registry JSON editor', 'Registry JSON editor')) + '</h4>' + _renderSaveGuard(detail, 'table') + '<textarea class="ds-editor" oninput=\'DataSchemaAdmin.setTableEditor(this.value)\'>' + _esc(state.tableEditor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.saveTable()\'>' + _esc(_t('Lưu table metadata', 'Save table metadata')) + '</button></div></section>',
    '</div>'
  ].join('') : _emptyState(_t('Chọn một bảng', 'Select a table'), _t('Chọn một bảng bên trái để xem runtime posture, preview dữ liệu và chỉnh metadata.', 'Select a table on the left to inspect runtime posture, preview data and edit metadata.'));

  return '<div class="ds-shell"><aside class="ds-shell-list"><div class="ds-toolbar">' + targetAlert + '<div class="ds-search"><input value="' + _esc(state.tableSearch) + '" placeholder="' + _esc(_t('Tìm bảng, khóa chính, workflow...', 'Search table, primary key, workflow...')) + '" oninput=\'DataSchemaAdmin.setTableSearch(this.value)\'></div><div class="ds-select-row"><select onchange=\'DataSchemaAdmin.setTableDomain(this.value)\'><option value="ALL">All domains</option>' + _tableDomains().map(function(key){ return '<option value="' + _esc(key) + '"' + (state.tableDomain===key?' selected':'') + '>' + _esc(key) + '</option>'; }).join('') + '</select></div></div><div class="ds-list-scroll">' + listHtml + '</div></aside><section class="ds-shell-detail">' + detailHtml + '</section></div>';
}

function _renderDesignResult(){
  if(!state.designResult) return _emptyState(_t('Chưa có kết quả action', 'No action result yet'), _t('Chạy validate, diagnose, compile hoặc release để xem kết quả ở đây.', 'Run validate, diagnose, compile or release to inspect the result here.'));
  return '<div class="ds-result-card"><div class="ds-result-head"><strong>' + _esc(state.designResult.type || 'result') + '</strong></div><pre class="ds-code">' + _esc(_jsonPretty(state.designResult.payload || {})) + '</pre></div>';
}

function _renderDesignTab(){
  var designs = _list('designs');
  var actions = (_workspace().actions || []).filter(function(item){ return item && item.id; });
  var designSummary = state.designSchema && state.designSchema._meta ? state.designSchema._meta : null;
  var releases = Array.isArray(state.releases) ? state.releases : [];
  var operational = _workspace().operational || {};
  var releaseGate = operational.releaseGate || {};
  var selectedDesignSummary = null;
  designs.forEach(function(item){
    if(String(item.id) === String(state.selectedDesignId)) selectedDesignSummary = item;
  });
  var designAuthority = selectedDesignSummary || designSummary || {};

  var listHtml = designs.length ? designs.map(function(item){
    var active = String(item.id) === String(state.selectedDesignId);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectDesign(' + _js(item.id) + ')\'><div class="ds-list-head"><strong>' + _esc(item.name || item.id) + '</strong>' + _badge(item.baselineAvailable ? 'BASELINE' : 'NO BASELINE', item.baselineAvailable ? 'good' : 'warn') + '</div><div class="ds-list-meta">' + _esc(item.id) + '</div><div class="ds-chip-row">' + _badge(item.profile || 'profile', 'neutral') + _badge(_fmtInt(item.tableCount) + ' tbl', 'neutral') + _badge(item.readOnly ? 'READ ONLY' : 'EDITABLE', item.readOnly ? 'neutral' : 'good') + _badge(item.runtimeLinked ? 'RUNTIME AUTHORITY' : 'NON-RUNTIME', item.runtimeLinked ? 'good' : 'neutral') + _badge(item.truth_status || item.authorityLayer || 'truth', _truthTone(item.truth_status || item.authorityLayer)) + (item.lastReleaseId ? _badge('RELEASED', 'good') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Chưa có design', 'No designs'), _t('Hãy load từ registry hoặc reverse engineer để tạo working design đầu tiên.', 'Load from the registry or reverse engineer the database to create the first working design.'));

  return [
    '<div class="ds-shell">',
      '<aside class="ds-shell-list">',
        '<div class="ds-toolbar"><div class="ds-section-title">' + _esc(_t('Design documents', 'Design documents')) + '</div></div>',
        '<div class="ds-list-scroll">' + listHtml + '</div>',
      '</aside>',
      '<section class="ds-shell-detail">',
        '<div class="ds-detail-scroll">',
          '<div class="ds-detail-head"><div><small>' + _esc(_t('Schema layer', 'Schema layer')) + '</small><h3>' + _esc((designAuthority && (designAuthority.name || designAuthority.displayName || designAuthority.id)) || _t('Chưa có schema layer', 'No schema layer loaded')) + '</h3><p>' + _esc(_currentDesignId() || state.selectedDesignId || '—') + '</p></div><div class="ds-chip-row">' + (state.designBaseline ? _badge('BASELINE', 'good') : _badge('NO BASELINE', 'warn')) + _badge(designAuthority.readOnly ? 'READ ONLY' : 'EDITABLE', designAuthority.readOnly ? 'neutral' : 'good') + _badge(designAuthority.runtimeLinked ? 'RUNTIME AUTHORITY' : 'NON-RUNTIME', designAuthority.runtimeLinked ? 'good' : 'neutral') + _badge(designAuthority.truth_status || designAuthority.authorityLayer || 'truth', _truthTone(designAuthority.truth_status || designAuthority.authorityLayer)) + (designSummary && designSummary.enterprise && designSummary.enterprise.profile ? _badge(designSummary.enterprise.profile, 'neutral') : '') + '</div></div>',
          (releaseGate.blocking ? '<div class="ds-inline-alert tone-warn"><strong>' + _esc(_t('Release gate is blocked.', 'Release gate is blocked.')) + '</strong> ' + _esc((releaseGate.reasons || []).join(' · ')) + '</div>' : ''),
          (designAuthority && designAuthority.truth_status === 'non_runtime_design_draft' ? '<div class="ds-inline-alert tone-neutral">' + _esc(_t('Workspace Design Draft là vùng thiết kế có revision guard. Nó không phải DB schema thật và không được dùng làm runtime authority.', 'Workspace Design Draft is a revision-guarded design surface. It is not the physical DB schema and must not be used as runtime authority.')) + '</div>' : ''),
          (designAuthority && designAuthority.readOnly ? '<div class="ds-inline-alert tone-good">' + _esc(_t('System Contract Registry là lớp authority chỉ đọc sinh từ migrations/schema.sql/registry. Muốn thay đổi runtime phải đi qua migration và pipeline publish, không sửa trực tiếp tại đây.', 'System Contract Registry is a read-only authority layer generated from migrations/schema.sql/registry. Runtime changes must go through migrations and the publish pipeline, not direct editing here.')) + '</div>' : ''),
          '<div class="ds-facts">',
            '<div><span>' + _esc(_t('Tables', 'Tables')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.tables && state.designSchema.tables.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Relations', 'Relations')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.relations && state.designSchema.relations.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Groups', 'Groups')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.groups && state.designSchema.groups.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Updated', 'Updated')) + '</span><strong>' + _esc(_fmtTime(designSummary && (designSummary.updatedAt || designSummary.generated_at))) + '</strong></div>',
            '<div><span>' + _esc(_t('Authority layer', 'Authority layer')) + '</span><strong>' + _esc(designAuthority.authorityLayer || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Authority source', 'Authority source')) + '</span><strong>' + _esc(designAuthority.authoritySource || designAuthority.source || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Write policy', 'Write policy')) + '</span><strong>' + _esc(designAuthority.writePolicy || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Data loss impact', 'Data loss impact')) + '</span><strong>' + _esc(designAuthority.dataLossImpact || '—') + '</strong></div>',
          '</div>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Action runner', 'Action runner')) + '</h4><div class="ds-action-grid">' + actions.map(function(action){
            var requiresDesign = ['validate','set_baseline','diagnose','compile','release'].indexOf(action.id) !== -1;
            var writesDesign = ['set_baseline','compile','release'].indexOf(action.id) !== -1;
            var disabled = (requiresDesign && !state.designSchema) || (action.id === 'release' && releaseGate.blocking) || (!!designAuthority.readOnly && writesDesign);
            return '<button class="ds-action-card' + (disabled ? ' disabled' : '') + '" type="button" onclick=\'DataSchemaAdmin.runDesignAction(' + _js(action.id) + ')\' ' + (disabled ? 'disabled' : '') + '><strong>' + _esc(action.label_vi || action.label) + '</strong><span>' + _esc(action.description || '') + '</span></button>';
          }).join('') + '<button class="ds-action-card' + ((!state.designSchema || designAuthority.readOnly) ? ' disabled' : '') + '" type="button" onclick=\'DataSchemaAdmin.runDesignAction("save_design")\' ' + ((!state.designSchema || designAuthority.readOnly) ? 'disabled' : '') + '><strong>' + _esc(_t('Lưu working design', 'Save working design')) + '</strong><span>' + _esc(_t('Ghi working schema hiện tại xuống thư mục design.', 'Persist the current working schema into the design store.')) + '</span></button><button class="ds-action-card" type="button" onclick=\'DataSchemaAdmin.runDesignAction("refresh_releases")\'><strong>' + _esc(_t('Tải release bundle', 'Refresh release bundles')) + '</strong><span>' + _esc(_t('Lấy danh sách release bundle mới nhất.', 'Fetch the latest release bundle list.')) + '</span></button></div></section>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Schema layer JSON', 'Schema layer JSON')) + '</h4>' + _renderDesignSaveGuard() + '<textarea class="ds-editor ds-editor-xl" ' + (designAuthority.readOnly ? 'readonly ' : '') + 'oninput=\'DataSchemaAdmin.setDesignEditor(this.value)\'>' + _esc(state.designEditor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.prettifyDesignEditor()\'>' + _esc(_t('Format JSON', 'Format JSON')) + '</button></div></section>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Action result', 'Action result')) + '</h4>' + _renderDesignResult() + '</section>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Recent releases', 'Recent releases')) + '</h4>' + (releases.length ? '<div class="ds-release-list">' + releases.slice(0, 12).map(function(item){
            return '<article class="ds-release-card"><div><strong>' + _esc(item.name || item.id) + '</strong><p>' + _esc(item.designId || '') + '</p></div><div class="ds-chip-row">' + _badge(item.approvalClass || 'standard', 'neutral') + _badge('risk ' + _fmtInt(item.riskScore), item.riskScore ? 'warn' : 'good') + '</div></article>';
          }).join('') + '</div>' : _emptyState(_t('Chưa có release', 'No releases'), _t('Chưa có release bundle nào trong workspace này.', 'No release bundles exist for this workspace yet.'))) + '</section>',
        '</div>',
      '</section>',
    '</div>'
  ].join('');
}

function _renderLibraryTab(){
  var leftRows = state.libraryTab === 'schemas' ? _list('schemas') : _list('variables');
  var current = state.libraryTab === 'schemas' ? state.schemaDetail : state.variableDetail;
  var editor = state.libraryTab === 'schemas' ? state.schemaEditor : state.variableEditor;
  var selectedLibraryKey = state.libraryTab === 'schemas' ? state.selectedSchemaKey : state.selectedVariableKey;
  var currentSummary = null;
  leftRows.forEach(function(row){
    if(String(row.key) === String(selectedLibraryKey)) currentSummary = row;
  });
  var currentItem = current && current.item ? Object.assign({}, currentSummary || {}, current.item || {}) : currentSummary;

  var listHtml = leftRows.length ? leftRows.map(function(item){
    var key = String(item.key || '');
    var active = state.libraryTab === 'schemas'
      ? key === String(state.selectedSchemaKey)
      : key === String(state.selectedVariableKey);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectLibraryItem(' + _js(state.libraryTab) + ',' + _js(key) + ')\'><div class="ds-list-head"><strong>' + _esc(item.label || item.label_vi || key) + '</strong></div><div class="ds-list-meta">' + _esc(key) + '</div><div class="ds-chip-row">' + (state.libraryTab === 'schemas' ? _badge(_fmtInt(item.tableCount) + ' tbl', 'neutral') + _badge(_fmtInt(item.migrationCount) + ' mig', 'neutral') : _badge(_fmtInt(item.variableCount) + ' vars', 'neutral')) + _badge(item.authorityLayer || 'metadata', 'neutral') + _badge(item.truth_status || 'truth', _truthTone(item.truth_status)) + _badge(item.runtimeLinked ? 'RUNTIME USED' : 'REFERENCE ONLY', item.runtimeLinked ? 'good' : 'neutral') + '</div></button>';
  }).join('') : _emptyState(_t('Không có thư viện', 'No libraries'), _t('Không có dữ liệu cho nhóm thư viện hiện tại.', 'There is no data for the current library group.'));

  var detailHtml = currentItem ? [
    '<div class="ds-detail-scroll">',
      '<div class="ds-detail-head"><div><small>' + _esc(state.libraryTab === 'schemas' ? _t('Schema blueprint', 'Schema blueprint') : _t('Variable category', 'Variable category')) + '</small><h3>' + _esc((currentItem.label || currentItem.label_vi || currentItem.key || selectedLibraryKey)) + '</h3><p>' + _esc(selectedLibraryKey) + '</p></div><div class="ds-chip-row">' + _badge(currentItem.authorityLayer || 'metadata', 'neutral') + _badge(currentItem.truth_status || 'truth', _truthTone(currentItem.truth_status)) + _badge(currentItem.runtimeLinked ? 'RUNTIME USED' : 'REFERENCE ONLY', currentItem.runtimeLinked ? 'good' : 'neutral') + '</div></div>',
      '<div class="ds-facts">',
        '<div><span>' + _esc(_t('Authority layer', 'Authority layer')) + '</span><strong>' + _esc(currentItem.authorityLayer || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Runtime linked', 'Runtime linked')) + '</span><strong class="tone-' + _esc(currentItem.runtimeLinked ? 'good' : 'neutral') + '">' + _esc(currentItem.runtimeLinked ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
        '<div><span>' + _esc(_t('Source', 'Source')) + '</span><strong>' + _esc(currentItem.source || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Purpose', 'Purpose')) + '</span><strong>' + _esc(currentItem.purpose || currentItem.description || '—') + '</strong></div>',
      '</div>',
      '<section class="ds-detail-section">' + _renderSaveGuard(current || {}, state.libraryTab === 'schemas' ? 'schema' : 'variable') + '<textarea class="ds-editor ds-editor-xl" oninput=\'DataSchemaAdmin.setLibraryEditor(this.value)\'>' + _esc(editor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.saveLibrary()\'>' + _esc(_t('Lưu thư viện', 'Save library')) + '</button></div></section>',
    '</div>'
  ].join('') : _emptyState(_t('Chọn một mục', 'Select an item'), _t('Chọn một blueprint hoặc variable category để chỉnh metadata.', 'Select a blueprint or variable category to edit metadata.'));

  return '<div class="ds-shell"><aside class="ds-shell-list"><div class="ds-toolbar"><div class="ds-toggle-row"><button class="ds-btn ' + (state.libraryTab === 'schemas' ? 'primary' : '') + '" type="button" onclick=\'DataSchemaAdmin.setLibraryTab("schemas")\'>' + _esc(_t('Blueprints', 'Blueprints')) + '</button><button class="ds-btn ' + (state.libraryTab === 'variables' ? 'primary' : '') + '" type="button" onclick=\'DataSchemaAdmin.setLibraryTab("variables")\'>' + _esc(_t('Variables', 'Variables')) + '</button></div></div><div class="ds-list-scroll">' + listHtml + '</div></aside><section class="ds-shell-detail">' + detailHtml + '</section></div>';
}

function _paint(){
  if(!state.container) return;
  if(state.loading && !state.workspace){
    state.container.innerHTML = '<div class="ds-root"><div class="ds-loading"><div class="ds-spinner"></div><span>' + _esc(_t('Đang tải Data Schema workspace...', 'Loading Data Schema workspace...')) + '</span></div></div>';
    return;
  }
  var body = '';
  if(state.error){
    body += '<div class="ds-inline-alert tone-bad">' + _esc(state.error) + '</div>';
  }
  if(!state.workspace){
    body += _emptyState(_t('Không có dữ liệu', 'No data'), _t('Workspace chưa tải được dữ liệu backend.', 'The workspace could not load backend data.'));
  } else {
    if(state.tab === 'overview') body += _renderOverview();
    if(state.tab === 'apis') body += _renderApiTab();
    if(state.tab === 'tables') body += _renderTableTab();
    if(state.tab === 'designs') body += _renderDesignTab();
    if(state.tab === 'libraries') body += _renderLibraryTab();
  }
  state.container.innerHTML = [
    '<div class="ds-root">',
      '<header class="ds-topbar">',
        '<div>',
          '<div class="ds-topbar-kicker">' + _esc(_t('Admin / Data platform', 'Admin / Data platform')) + '</div>',
          '<h2>' + _esc(_t('Data Schema', 'Data Schema')) + '</h2>',
          '<p>' + _esc(_t('Catalog API, runtime table coverage, design workspace, diagnostics, compile/release và metadata libraries.', 'API catalog, runtime table coverage, design workspace, diagnostics, compile/release and metadata libraries.')) + '</p>',
        '</div>',
        '<div class="ds-topbar-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.refresh()\'>' + _esc(_t('Làm mới', 'Refresh')) + '</button></div>',
      '</header>',
      '<nav class="ds-tabs">' + TABS.map(function(tab){
        return '<button class="ds-tab' + (state.tab===tab.id?' active':'') + '" type="button" onclick=\'DataSchemaAdmin.setTab(' + _js(tab.id) + ')\'>' + _esc((typeof lang !== 'undefined' && lang === 'en') ? tab.labelEn : tab.labelVi) + '</button>';
      }).join('') + '</nav>',
      '<div class="ds-content">' + body + '</div>',
    '</div>'
  ].join('');
}

var DataSchemaAdmin = {
  render: function(container){
    state.container = container;
    if(!state.workspace) _loadWorkspace(false);
    else _paint();
  },
  refresh: function(){ _refresh(); },
  setTab: function(tab){
    state.tab = String(tab || 'overview');
    if(state.tab === 'apis' && state.selectedApiKey && !state.apiDetail) _loadApiDetail(state.selectedApiKey, false);
    if(state.tab === 'tables' && state.selectedTableKey && !state.tableDetail) _loadTableDetail(state.selectedTableKey, false);
    if(state.tab === 'libraries'){
      if(state.libraryTab === 'schemas' && state.selectedSchemaKey && !state.schemaDetail) _loadSchemaDetail(state.selectedSchemaKey, false);
      if(state.libraryTab === 'variables' && state.selectedVariableKey && !state.variableDetail) _loadVariableDetail(state.selectedVariableKey, false);
    }
    if(state.tab === 'designs' && state.selectedDesignId && !state.designSchema) _loadDesign(state.selectedDesignId, false);
    _paint();
  },
  setApiSearch: function(value){ state.apiSearch = String(value || ''); _paint(); },
  setApiDomain: function(value){ state.apiDomain = String(value || 'ALL'); _paint(); },
  setApiMethod: function(value){ state.apiMethod = String(value || 'ALL'); _paint(); },
  setApiKind: function(value){ state.apiKind = String(value || 'ALL'); _paint(); },
  selectApi: function(key){ _loadApiDetail(String(key || ''), false); },
  setApiEditor: function(value){ state.apiEditor = String(value || ''); },
  saveApi: function(){ _saveEditor('api'); },
  copyApiPath: function(){
    var current = state.apiDetail && state.apiDetail.item ? state.apiDetail.item : null;
    if(!current || !current.path) return;
    _copyText(current.path).then(function(){ _toast(_t('Đã copy path API.', 'API path copied.'), 'success'); }).catch(function(){ _toast('clipboard_unavailable', 'error'); });
  },
  setTableSearch: function(value){ state.tableSearch = String(value || ''); _paint(); },
  setTableDomain: function(value){ state.tableDomain = String(value || 'ALL'); _paint(); },
  selectTable: function(key){ _loadTableDetail(String(key || ''), false); },
  setTableEditor: function(value){ state.tableEditor = String(value || ''); },
  saveTable: function(){ _saveEditor('table'); },
  loadPreview: function(){ _loadTablePreview(0); },
  prevPreviewPage: function(){ var current = state.tablePreview || {}; _loadTablePreview(Math.max(0, Number(current.offset || 0) - 25)); },
  nextPreviewPage: function(){ var current = state.tablePreview || {}; _loadTablePreview(Number(current.offset || 0) + 25); },
  openRowInsert: function(){ _openRowInsert(); },
  openRowUpdate: function(index){ _openRowUpdate(Number(index || 0)); },
  closeRowEditor: function(){ _closeRowEditor(); },
  setRowEditorJson: function(value){ state.rowEditorJson = String(value || ''); },
  saveRow: function(){ _saveRowEditor(); },
  selectDesign: function(id){ _loadDesign(String(id || ''), false); },
  setDesignEditor: function(value){ state.designEditor = String(value || ''); },
  prettifyDesignEditor: function(){
    var parsed = _parseJson(state.designEditor, 'design_editor');
    if(!parsed.ok){ _toast(parsed.error, 'error'); return; }
    state.designEditor = _jsonPretty(parsed.value || {});
    _paint();
  },
  runDesignAction: function(actionId){ _runDesignAction(String(actionId || '')); },
  setLibraryTab: function(tab){
    state.libraryTab = String(tab || 'schemas');
    if(state.libraryTab === 'schemas' && state.selectedSchemaKey && !state.schemaDetail) _loadSchemaDetail(state.selectedSchemaKey, false);
    if(state.libraryTab === 'variables' && state.selectedVariableKey && !state.variableDetail) _loadVariableDetail(state.selectedVariableKey, false);
    _paint();
  },
  selectLibraryItem: function(type, key){
    if(String(type) === 'schemas') _loadSchemaDetail(String(key || ''), false);
    else _loadVariableDetail(String(key || ''), false);
  },
  setLibraryEditor: function(value){
    if(state.libraryTab === 'schemas') state.schemaEditor = String(value || '');
    else state.variableEditor = String(value || '');
  },
  saveLibrary: function(){
    if(state.libraryTab === 'schemas') _saveEditor('schema');
    else _saveEditor('variable');
  }
};

window.DataSchemaAdmin = DataSchemaAdmin;
window._renderAdminMetadataStudio = function(container){
  DataSchemaAdmin.render(container);
};
})();

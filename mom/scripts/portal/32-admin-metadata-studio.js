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
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', timeoutMs || 30000);
  var url = 'api.php?action=' + encodeURIComponent(action);
  if((method || 'GET') === 'GET' && payload){
    var params = new URLSearchParams();
    Object.keys(payload || {}).forEach(function(key){
      if(payload[key] == null || payload[key] === '') return;
      params.append(key, String(payload[key]));
    });
    var query = params.toString();
    if(query) url += '&' + query;
  }
  return fetch(url, {
    method: method || 'GET',
    credentials: 'include',
    headers: Object.assign(
      {},
      (method || 'GET') === 'GET' ? {} : {'Content-Type':'application/json'},
      (typeof csrfToken !== 'undefined' && csrfToken ? {'X-CSRF-Token': csrfToken} : {})
    ),
    body: (method || 'GET') === 'GET' ? undefined : JSON.stringify(payload || {})
  }).then(function(r){ return r.json(); });
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
function _dbStatusLabel(applicable, present){
  if(!applicable) return _t('DB N/A', 'DB N/A');
  return present ? _t('DB', 'DB') : _t('Missing', 'Missing');
}
function _dbStatusTone(applicable, present){
  if(!applicable) return 'neutral';
  return present ? 'good' : 'bad';
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
  var dbProbeApplicable = _dbProbeApplicable(m) || _dbProbeApplicable(connection);
  var cards = [
    { label:_t('Endpoint catalog', 'Endpoint catalog'), value:m.endpoint_count, note:_t('Tổng endpoint có contract.', 'Total endpoints under contract.') },
    { label:_t('Tables covered', 'Tables covered'), value:m.table_count, note:_t('Union từ registry + relation map.', 'Union from registry + relation map.') },
    { label:_t('Present in DB', 'Present in DB'), value:dbProbeApplicable ? m.db_present_table_count : _t('N/A', 'N/A'), note:dbProbeApplicable ? _t('Bảng thật tìm thấy trong PostgreSQL.', 'Tables found in live PostgreSQL.') : _t('Runtime hiện không bật PostgreSQL path, nên metric này không áp dụng.', 'The runtime does not currently use the PostgreSQL path, so this metric is not applicable.') },
    { label:_t('Structural drift', 'Structural drift'), value:dbProbeApplicable ? m.db_structural_drift_table_count : _t('N/A', 'N/A'), note:dbProbeApplicable ? _t('Bảng live lệch cột/PK so với authority.', 'Live tables drifting in columns or PK from authority.') : _t('Chỉ tính khi PostgreSQL là runtime truth đang hoạt động.', 'Only applies when PostgreSQL is the active runtime truth.') },
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
  var highlights = ws.highlights || {};
  var audits = ws.audits || {};
  var artifacts = ws.artifacts || {};
  var operational = ws.operational || {};
  var domains = Array.isArray(ws.domains) ? ws.domains.slice(0, 12) : [];

  var blockers = Array.isArray(highlights.blockers) ? highlights.blockers : [];
  var governanceGaps = Array.isArray(highlights.governance_gaps) ? highlights.governance_gaps : [];
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
          '<strong class="tone-' + _esc(dbProbeApplicable ? _boolTone(connection.reachable) : 'neutral') + '">' + _esc(dbProbeApplicable ? (connection.reachable ? _t('Connected', 'Connected') : _t('Unavailable', 'Unavailable')) : _t('Not enabled', 'Not enabled')) + '</strong>',
          '<p>' + _esc(dbProbeApplicable ? ((connection.database || '—') + ' / ' + (connection.schema || '—')) : _t('Runtime đang dùng JSON_ONLY thay vì PostgreSQL.', 'The runtime is using JSON_ONLY instead of PostgreSQL.')) + '</p>',
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
          '<div class="ds-facts">',
            '<div><span>' + _esc(_t('Reachable', 'Reachable')) + '</span><strong class="tone-' + _esc(dbProbeApplicable ? _boolTone(connection.reachable) : 'neutral') + '">' + _esc(dbProbeApplicable ? (connection.reachable ? _t('Yes', 'Yes') : _t('No', 'No')) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Present tables', 'Present tables')) + '</span><strong>' + _esc(dbProbeApplicable ? _fmtInt(connection.present_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Missing tables', 'Missing tables')) + '</span><strong class="tone-' + _esc(dbProbeApplicable ? (connection.missing_table_count ? 'warn' : 'good') : 'neutral') + '">' + _esc(dbProbeApplicable ? _fmtInt(connection.missing_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Structural drift tables', 'Structural drift tables')) + '</span><strong class="tone-' + _esc(dbProbeApplicable ? (connection.structural_drift_table_count ? 'warn' : 'good') : 'neutral') + '">' + _esc(dbProbeApplicable ? _fmtInt(connection.structural_drift_table_count) : _t('N/A', 'N/A')) + '</strong></div>',
            '<div><span>' + _esc(_t('Authoritative count', 'Authoritative count')) + '</span><strong>' + _esc(_fmtInt(metrics.authoritative_table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Registry count', 'Registry count')) + '</span><strong>' + _esc(_fmtInt(metrics.registry_table_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Registry gaps', 'Registry gaps')) + '</span><strong class="tone-' + _esc(metrics.registry_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(metrics.registry_gap_count)) + '</strong></div>',
            '<div><span>' + _esc(_t('Data layer mode', 'Data layer mode')) + '</span><strong>' + _esc(dataLayer.mode || '—') + '</strong></div>',
            '<div><span>' + _esc(_t('Postgres path', 'Postgres path')) + '</span><strong class="tone-' + _esc(dataLayer.postgres_path_active ? 'good' : 'neutral') + '">' + _esc(dataLayer.postgres_path_active ? _t('Active', 'Active') : _t('Inactive', 'Inactive')) + '</strong></div>',
            '<div><span>' + _esc(_t('JSON fallback', 'JSON fallback')) + '</span><strong class="tone-' + _esc(dataLayer.json_fallback ? 'warn' : 'good') + '">' + _esc(dataLayer.json_fallback ? _t('Enabled', 'Enabled') : _t('Off', 'Off')) + '</strong></div>',
          '</div>',
          (!dbProbeApplicable ? '<div class="ds-inline-alert tone-neutral">' + _esc(_t('Live PostgreSQL probe đang được tắt đúng thiết kế vì runtime hiện không chạy PostgreSQL path. Các chỉ số DB được đánh dấu N/A thay vì báo lỗi giả.', 'The live PostgreSQL probe is intentionally disabled because the runtime is not using the PostgreSQL path. DB metrics are marked N/A instead of being reported as false failures.')) + '</div>' : ''),
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
  return '<div class="ds-table-wrap"><table class="ds-table"><thead><tr><th>' + _esc(_t('Domain', 'Domain')) + '</th><th>' + _esc(_t('API', 'API')) + '</th><th>' + _esc(_t('Tables', 'Tables')) + '</th><th>' + _esc(_t('Present', 'Present')) + '</th><th>' + _esc(_t('Workflow', 'Workflow')) + '</th><th>' + _esc(_t('Gov gaps', 'Gov gaps')) + '</th><th>' + _esc(_t('Registry gaps', 'Registry gaps')) + '</th><th>' + _esc(_t('Structural drift', 'Structural drift')) + '</th></tr></thead><tbody>' + rows.map(function(row){
    return '<tr><td><strong>' + _esc(row.label || row.id) + '</strong><div class="ds-table-note">' + _esc(row.id || '') + '</div></td><td>' + _esc(_fmtInt(row.api_count)) + '</td><td>' + _esc(_fmtInt(row.table_count)) + '</td><td>' + _esc(_fmtInt(row.present_table_count)) + '</td><td>' + _esc(_fmtInt(row.workflow_table_count)) + '</td><td class="tone-' + _esc(row.governance_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.governance_gap_count)) + '</td><td class="tone-' + _esc(row.registry_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.registry_gap_count)) + '</td><td class="tone-' + _esc(row.structural_drift_table_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(row.structural_drift_table_count)) + '</td></tr>';
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
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectApi(' + _js(item.key) + ')\'><div class="ds-list-head">' + _methodBadge(item.method) + '<strong>' + _esc(item.label || item.key) + '</strong></div><div class="ds-list-meta">' + _esc(item.key) + '</div><div class="ds-chip-row">' + _badge(item.domain || 'domain', 'neutral') + _badge(item.kind || 'kind', 'neutral') + ((item.csrf_required) ? _badge('CSRF', 'warn') : '') + ((item.admin_only) ? _badge('ADMIN', 'bad') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Không có API', 'No APIs'), _t('Không còn API phù hợp bộ lọc hiện tại.', 'No APIs match the current filters.'));

  var detailHtml = current ? [
    '<div class="ds-detail-scroll">',
      '<div class="ds-detail-head">',
        '<div><small>' + _esc(_t('Endpoint detail', 'Endpoint detail')) + '</small><h3>' + _esc(current.label || state.selectedApiKey) + '</h3><p>' + _esc(current.action || state.selectedApiKey) + '</p></div>',
        '<div class="ds-chip-row">' + _methodBadge(current.method || 'GET') + _badge(current.domain || 'domain', 'neutral') + _badge(current.kind || 'kind', 'neutral') + '</div>',
      '</div>',
      '<div class="ds-facts">',
        '<div><span>Path</span><strong>' + _esc(current.path || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Controller', 'Controller')) + '</span><strong>' + _esc((current.controller || '—') + '::' + (current.handler || '—')) + '</strong></div>',
        '<div><span>' + _esc(_t('Field count', 'Field count')) + '</span><strong>' + _esc(_fmtInt(current.field_count)) + '</strong></div>',
        '<div><span>' + _esc(_t('Workflow mode', 'Workflow mode')) + '</span><strong>' + _esc(current.workflow_mode || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Security', 'Security')) + '</span><strong>' + _esc((current.security && current.security.auth_required ? 'auth' : 'public')) + '</strong></div>',
      '</div>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Security and contract', 'Security and contract')) + '</h4><div class="ds-chip-row">' +
        _badge((current.security && current.security.auth_required) ? 'AUTH' : 'PUBLIC', _boolTone(current.security && current.security.auth_required)) +
        _badge((current.security && current.security.csrf_required) ? 'CSRF' : 'NO CSRF', (current.security && current.security.csrf_required) ? 'warn' : 'neutral') +
        _badge((current.security && current.security.admin_only) ? 'ADMIN ONLY' : 'SHARED', (current.security && current.security.admin_only) ? 'bad' : 'good') +
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
  var detail = state.tableDetail;
  var summary = _selectedTableSummary();
  var item = detail && detail.item ? Object.assign({}, summary || {}, detail.item || {}) : (summary || null);
  var preview = state.tablePreview;
  var columns = _tableColumnRows(item, preview);

  var listHtml = rows.length ? rows.map(function(row){
    var active = String(row.key) === String(state.selectedTableKey);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectTable(' + _js(row.key) + ')\'><div class="ds-list-head"><strong>' + _esc(row.label || row.key) + '</strong>' + _badge(_dbStatusLabel(!!row.db_probe_applicable, row.db_present === true), _dbStatusTone(!!row.db_probe_applicable, row.db_present === true)) + '</div><div class="ds-list-meta">' + _esc(row.key) + '</div><div class="ds-chip-row">' + _badge(row.domain || 'domain', 'neutral') + (row.workflowId ? _badge('WF', 'good') : '') + (row.governance_gap_count ? _badge('GAP ' + row.governance_gap_count, 'warn') : '') + (row.column_drift_count ? _badge('DRIFT ' + row.column_drift_count, 'warn') : '') + (row.pk_drift ? _badge('PK', 'bad') : '') + ((!row.registry_present) ? _badge('NOT IN REGISTRY', 'bad') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Không có bảng', 'No tables'), _t('Không còn bảng phù hợp bộ lọc hiện tại.', 'No tables match the current filters.'));

  var detailHtml = item ? [
    '<div class="ds-detail-scroll">',
      '<div class="ds-detail-head"><div><small>' + _esc(_t('Table detail', 'Table detail')) + '</small><h3>' + _esc(item.label || state.selectedTableKey) + '</h3><p>' + _esc(state.selectedTableKey) + '</p></div><div class="ds-chip-row">' + _badge(item.domain || 'domain', 'neutral') + _badge((item.primaryKey || 'no_pk'), item.primaryKey ? 'good' : 'warn') + _badge(item.db_probe_applicable ? (item.db_present ? 'DB OK' : 'DB MISSING') : _t('DB N/A', 'DB N/A'), item.db_probe_applicable ? (item.db_present ? 'good' : 'bad') : 'neutral') + _badge(item.registry_present === false ? 'RELATION ONLY' : 'REGISTRY', item.registry_present === false ? 'warn' : 'good') + '</div></div>',
      '<div class="ds-facts">',
        '<div><span>' + _esc(_t('Columns', 'Columns')) + '</span><strong>' + _esc(_fmtInt(item.columnCount || columns.length)) + '</strong></div>',
        '<div><span>' + _esc(_t('DB columns', 'DB columns')) + '</span><strong class="tone-' + _esc(item.db_probe_applicable ? (item.db_present ? 'good' : 'neutral') : 'neutral') + '">' + _esc(item.db_probe_applicable ? _fmtInt(item.db_column_count || 0) : _t('N/A', 'N/A')) + '</strong></div>',
        '<div><span>' + _esc(_t('Primary key', 'Primary key')) + '</span><strong>' + _esc(item.primaryKey || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Status column', 'Status column')) + '</span><strong>' + _esc(item.statusColumn || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Workflow', 'Workflow')) + '</span><strong>' + _esc(item.workflowId || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Support table', 'Support table')) + '</span><strong>' + _esc(item.supportTable ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
        '<div><span>' + _esc(_t('Registry source', 'Registry source')) + '</span><strong>' + _esc(item.source || '—') + '</strong></div>',
        '<div><span>' + _esc(_t('Governance gaps', 'Governance gaps')) + '</span><strong class="tone-' + _esc(item.governance_gap_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.governance_gap_count)) + '</strong></div>',
        '<div><span>' + _esc(_t('Missing columns', 'Missing columns')) + '</span><strong class="tone-' + _esc(item.missing_column_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.missing_column_count || 0)) + '</strong></div>',
        '<div><span>' + _esc(_t('Unexpected columns', 'Unexpected columns')) + '</span><strong class="tone-' + _esc(item.unexpected_column_count ? 'warn' : 'good') + '">' + _esc(_fmtInt(item.unexpected_column_count || 0)) + '</strong></div>',
        '<div><span>' + _esc(_t('Primary key drift', 'Primary key drift')) + '</span><strong class="tone-' + _esc(item.pk_drift ? 'bad' : 'good') + '">' + _esc(item.pk_drift ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
        '<div><span>' + _esc(_t('Digital thread', 'Digital thread')) + '</span><strong>' + _esc(item.digital_thread ? _t('Yes', 'Yes') : _t('No', 'No')) + '</strong></div>',
      '</div>',
      '<section class="ds-detail-section"><h4>' + _esc(_t('Structural drift', 'Structural drift')) + '</h4>' + (
        (!item.db_probe_applicable)
          ? '<div class="ds-inline-alert tone-neutral">' + _esc(_t('Runtime hiện không dùng PostgreSQL path, nên so sánh drift cột/PK với DB thật chưa được áp dụng ở bảng này.', 'The runtime is not currently using the PostgreSQL path, so live DB column/PK drift is not applicable for this table yet.')) + '</div>'
          : (!item.db_present)
          ? '<div class="ds-inline-alert tone-warn">' + _esc(_t('Bảng này chưa hiện diện trong PostgreSQL đang probe, nên chưa thể so drift cột/PK.', 'This table is not present in the probed PostgreSQL database yet, so column/PK drift cannot be compared.')) + '</div>'
          : (
            (!item.missing_column_count && !item.unexpected_column_count && !item.pk_drift)
              ? '<div class="ds-inline-alert tone-good">' + _esc(_t('Không phát hiện drift cột/PK giữa registry authority và DB thật.', 'No column/PK drift detected between registry authority and the live DB.')) + '</div>'
              : '<div class="ds-issue-stack">' +
                (item.missing_column_count ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('missing', 'missing'), 'warn') + '<strong>' + _esc(_t('Registry expects columns not present in DB', 'Registry expects columns not present in DB')) + '</strong></div><p>' + _esc((item.missing_columns || []).join(', ')) + '</p></article>' : '') +
                (item.unexpected_column_count ? '<article class="ds-issue-card"><div class="ds-issue-head">' + _badge(_t('unexpected', 'unexpected'), 'warn') + '<strong>' + _esc(_t('DB contains unmanaged columns', 'DB contains unmanaged columns')) + '</strong></div><p>' + _esc((item.unexpected_columns || []).join(', ')) + '</p></article>' : '') +
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

  return '<div class="ds-shell"><aside class="ds-shell-list"><div class="ds-toolbar"><div class="ds-search"><input value="' + _esc(state.tableSearch) + '" placeholder="' + _esc(_t('Tìm bảng, khóa chính, workflow...', 'Search table, primary key, workflow...')) + '" oninput=\'DataSchemaAdmin.setTableSearch(this.value)\'></div><div class="ds-select-row"><select onchange=\'DataSchemaAdmin.setTableDomain(this.value)\'><option value="ALL">All domains</option>' + _tableDomains().map(function(key){ return '<option value="' + _esc(key) + '"' + (state.tableDomain===key?' selected':'') + '>' + _esc(key) + '</option>'; }).join('') + '</select></div></div><div class="ds-list-scroll">' + listHtml + '</div></aside><section class="ds-shell-detail">' + detailHtml + '</section></div>';
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

  var listHtml = designs.length ? designs.map(function(item){
    var active = String(item.id) === String(state.selectedDesignId);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectDesign(' + _js(item.id) + ')\'><div class="ds-list-head"><strong>' + _esc(item.name || item.id) + '</strong>' + _badge(item.baselineAvailable ? 'BASELINE' : 'NO BASELINE', item.baselineAvailable ? 'good' : 'warn') + '</div><div class="ds-list-meta">' + _esc(item.id) + '</div><div class="ds-chip-row">' + _badge(item.profile || 'profile', 'neutral') + _badge(_fmtInt(item.tableCount) + ' tbl', 'neutral') + (item.lastReleaseId ? _badge('RELEASED', 'good') : '') + '</div></button>';
  }).join('') : _emptyState(_t('Chưa có design', 'No designs'), _t('Hãy load từ registry hoặc reverse engineer để tạo working design đầu tiên.', 'Load from the registry or reverse engineer the database to create the first working design.'));

  return [
    '<div class="ds-shell">',
      '<aside class="ds-shell-list">',
        '<div class="ds-toolbar"><div class="ds-section-title">' + _esc(_t('Design documents', 'Design documents')) + '</div></div>',
        '<div class="ds-list-scroll">' + listHtml + '</div>',
      '</aside>',
      '<section class="ds-shell-detail">',
        '<div class="ds-detail-scroll">',
          '<div class="ds-detail-head"><div><small>' + _esc(_t('Working design', 'Working design')) + '</small><h3>' + _esc((designSummary && (designSummary.name || designSummary.id)) || _t('Chưa có working design', 'No working design loaded')) + '</h3><p>' + _esc(_currentDesignId() || '—') + '</p></div><div class="ds-chip-row">' + (state.designBaseline ? _badge('BASELINE', 'good') : _badge('NO BASELINE', 'warn')) + (designSummary && designSummary.enterprise && designSummary.enterprise.profile ? _badge(designSummary.enterprise.profile, 'neutral') : '') + '</div></div>',
          (releaseGate.blocking ? '<div class="ds-inline-alert tone-warn"><strong>' + _esc(_t('Release gate is blocked.', 'Release gate is blocked.')) + '</strong> ' + _esc((releaseGate.reasons || []).join(' · ')) + '</div>' : ''),
          '<div class="ds-facts">',
            '<div><span>' + _esc(_t('Tables', 'Tables')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.tables && state.designSchema.tables.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Relations', 'Relations')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.relations && state.designSchema.relations.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Groups', 'Groups')) + '</span><strong>' + _esc(_fmtInt(state.designSchema && state.designSchema.groups && state.designSchema.groups.length)) + '</strong></div>',
            '<div><span>' + _esc(_t('Updated', 'Updated')) + '</span><strong>' + _esc(_fmtTime(designSummary && (designSummary.updatedAt || designSummary.generated_at))) + '</strong></div>',
          '</div>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Action runner', 'Action runner')) + '</h4><div class="ds-action-grid">' + actions.map(function(action){
            var requiresDesign = ['validate','set_baseline','diagnose','compile','release'].indexOf(action.id) !== -1;
            var disabled = (requiresDesign && !state.designSchema) || (action.id === 'release' && releaseGate.blocking);
            return '<button class="ds-action-card' + (disabled ? ' disabled' : '') + '" type="button" onclick=\'DataSchemaAdmin.runDesignAction(' + _js(action.id) + ')\' ' + (disabled ? 'disabled' : '') + '><strong>' + _esc(action.label_vi || action.label) + '</strong><span>' + _esc(action.description || '') + '</span></button>';
          }).join('') + '<button class="ds-action-card" type="button" onclick=\'DataSchemaAdmin.runDesignAction("save_design")\' ' + (!state.designSchema ? 'disabled' : '') + '><strong>' + _esc(_t('Lưu working design', 'Save working design')) + '</strong><span>' + _esc(_t('Ghi working schema hiện tại xuống thư mục design.', 'Persist the current working schema into the design store.')) + '</span></button><button class="ds-action-card" type="button" onclick=\'DataSchemaAdmin.runDesignAction("refresh_releases")\'><strong>' + _esc(_t('Tải release bundle', 'Refresh release bundles')) + '</strong><span>' + _esc(_t('Lấy danh sách release bundle mới nhất.', 'Fetch the latest release bundle list.')) + '</span></button></div></section>',
          '<section class="ds-detail-section"><h4>' + _esc(_t('Working schema JSON', 'Working schema JSON')) + '</h4>' + _renderDesignSaveGuard() + '<textarea class="ds-editor ds-editor-xl" oninput=\'DataSchemaAdmin.setDesignEditor(this.value)\'>' + _esc(state.designEditor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn" type="button" onclick=\'DataSchemaAdmin.prettifyDesignEditor()\'>' + _esc(_t('Format JSON', 'Format JSON')) + '</button></div></section>',
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

  var listHtml = leftRows.length ? leftRows.map(function(item){
    var key = String(item.key || '');
    var active = state.libraryTab === 'schemas'
      ? key === String(state.selectedSchemaKey)
      : key === String(state.selectedVariableKey);
    return '<button class="ds-list-item' + (active ? ' active' : '') + '" type="button" onclick=\'DataSchemaAdmin.selectLibraryItem(' + _js(state.libraryTab) + ',' + _js(key) + ')\'><div class="ds-list-head"><strong>' + _esc(item.label || item.label_vi || key) + '</strong></div><div class="ds-list-meta">' + _esc(key) + '</div><div class="ds-chip-row">' + (state.libraryTab === 'schemas' ? _badge(_fmtInt(item.tableCount) + ' tbl', 'neutral') + _badge(_fmtInt(item.migrationCount) + ' mig', 'neutral') : _badge(_fmtInt(item.variableCount) + ' vars', 'neutral')) + '</div></button>';
  }).join('') : _emptyState(_t('Không có thư viện', 'No libraries'), _t('Không có dữ liệu cho nhóm thư viện hiện tại.', 'There is no data for the current library group.'));

  var detailHtml = current && current.item ? [
    '<div class="ds-detail-scroll">',
      '<div class="ds-detail-head"><div><small>' + _esc(state.libraryTab === 'schemas' ? _t('Schema blueprint', 'Schema blueprint') : _t('Variable category', 'Variable category')) + '</small><h3>' + _esc((current.item.label || current.item.label_vi || (current.item.key || (state.libraryTab === 'schemas' ? state.selectedSchemaKey : state.selectedVariableKey)))) + '</h3><p>' + _esc(state.libraryTab === 'schemas' ? state.selectedSchemaKey : state.selectedVariableKey) + '</p></div></div>',
      '<section class="ds-detail-section">' + _renderSaveGuard(current, state.libraryTab === 'schemas' ? 'schema' : 'variable') + '<textarea class="ds-editor ds-editor-xl" oninput=\'DataSchemaAdmin.setLibraryEditor(this.value)\'>' + _esc(editor) + '</textarea><div class="ds-editor-actions"><button class="ds-btn primary" type="button" onclick=\'DataSchemaAdmin.saveLibrary()\'>' + _esc(_t('Lưu thư viện', 'Save library')) + '</button></div></section>',
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

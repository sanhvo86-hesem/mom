(function(){
'use strict';

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){
  var node = document.createElement('div');
  node.appendChild(document.createTextNode(String(v == null ? '' : v)));
  return node.innerHTML;
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
function _apiFormData(action, formData, timeoutMs){
  if(typeof apiCallFormData === 'function') return apiCallFormData(action, formData, timeoutMs || 180000);
  var headers = {};
  if(typeof csrfToken !== 'undefined' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return fetch('api.php?action=' + encodeURIComponent(action), {
    method: 'POST',
    credentials: 'include',
    headers: headers,
    body: formData
  }).then(function(r){ return r.json(); });
}
function _toast(message, type){
  if(typeof showToast === 'function') return showToast(message, type);
  console[type === 'error' ? 'error' : 'log'](message);
}
function _statusClass(status){
  var key = String(status || '').toLowerCase();
  if(key === 'ok' || key === 'active' || key === 'online' || key === 'green') return 'good';
  if(key === 'warning' || key === 'warn' || key === 'degraded' || key === 'amber') return 'warn';
  if(key === 'error' || key === 'critical' || key === 'offline' || key === 'inactive' || key === 'red' || key === 'unavailable') return 'bad';
  return 'neutral';
}
function _fmtTime(value){
  if(!value) return '—';
  try{
    return new Date(value).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
  }catch(_err){
    return String(value);
  }
}
function _fmtInt(value){
  var num = Number(value || 0);
  if(!isFinite(num)) return '0';
  return num.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
}
function _fmtMs(value){
  if(value == null || value === '') return '—';
  var num = Number(value);
  if(!isFinite(num)) return '—';
  return Math.round(num) + ' ms';
}
function _fmtSizeFromKb(value){
  var num = Number(value || 0);
  if(!isFinite(num) || num <= 0) return '—';
  var bytes = num * 1024;
  var units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var unit = 0;
  while(bytes >= 1024 && unit < units.length - 1){
    bytes /= 1024;
    unit += 1;
  }
  return (bytes >= 10 || unit === 0 ? Math.round(bytes) : bytes.toFixed(1)) + ' ' + units[unit];
}
function _fmtSizeFromMb(value){
  var num = Number(value || 0);
  if(!isFinite(num) || num <= 0) return '—';
  if(num >= 1024){
    var gb = num / 1024;
    return (gb >= 10 ? Math.round(gb) : gb.toFixed(1)) + ' GB';
  }
  return Math.round(num) + ' MB';
}
function _fmtBytes(value){
  var num = Number(value || 0);
  if(!isFinite(num) || num <= 0) return '0 B';
  var units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var unit = 0;
  while(num >= 1024 && unit < units.length - 1){
    num /= 1024;
    unit += 1;
  }
  return (num >= 10 || unit === 0 ? Math.round(num) : num.toFixed(1)) + ' ' + units[unit];
}
function _progressWidth(text){
  var raw = parseFloat(String(text || '').replace('%', '').trim());
  if(!isFinite(raw) || raw < 0) return '0%';
  if(raw > 100) raw = 100;
  return raw + '%';
}
function _webHref(value){
  var url = String(value || '').trim();
  if(!url) return '';
  if(/^https?:\/\//i.test(url)) return url;
  if(/^\//.test(url)) return url;
  if(/^api\.php\?/i.test(url)) return url;
  return '';
}
function _assetHref(value, download){
  var direct = _webHref(value);
  if(direct) return direct;
  var path = String(value || '').trim();
  if(!path) return '';
  return 'api.php?action=vps_control_asset&path=' + encodeURIComponent(path) + (download ? '&download=1' : '');
}
function _countStatus(items, target){
  return (Array.isArray(items) ? items : []).filter(function(item){
    return String(item && item.status || '') === target;
  }).length;
}
function _hostModeLabel(mode){
  var key = String(mode || '').toLowerCase();
  if(key === 'local' || key === 'localhost') return _t('local runner', 'local runner');
  if(key === 'ssh') return 'SSH';
  return key || _t('inventory', 'inventory');
}

var state = {
  container: null,
  loading: false,
  tab: 'overview',
  overview: null,
  selectedHostId: '',
  selectedTerminalId: '',
  selectedObservabilityId: '',
  selectedFileRootId: '',
  filePath: '',
  fileQuery: '',
  fileShowHidden: false,
  fileLoading: false,
  fileExplorer: null,
  filePreview: null,
  fileSelectedPath: '',
  fileSelectedType: '',
  fileSelectedName: '',
  fileClipboard: null,
  fileOperationBusy: '',
  fileContextMenu: null,
  fileUploadTarget: '',
  fileEditing: false,
  fileEditContent: '',
  fileHistory: [''],
  fileHistoryIndex: 0,
  host: null,
  actionBusy: '',
  actionResult: null
};

function _syncTerminalSelection(host){
  var terminals = Array.isArray(host && host.terminals) ? host.terminals : [];
  if(!terminals.length){
    state.selectedTerminalId = '';
    return;
  }
  var exists = terminals.some(function(item){
    return String(item && item.id || '') === String(state.selectedTerminalId || '');
  });
  if(!exists){
    state.selectedTerminalId = String(terminals[0].id || '');
  }
}

function _syncObservabilitySelection(host){
  var panels = Array.isArray(host && host.observability) ? host.observability : [];
  if(!panels.length){
    state.selectedObservabilityId = '';
    return;
  }
  var exists = panels.some(function(item){
    return String(item && item.id || '') === String(state.selectedObservabilityId || '');
  });
  if(!exists){
    state.selectedObservabilityId = String(panels[0].id || '');
  }
}

function _syncFileRootSelection(host){
  var roots = Array.isArray(host && host.file_roots) ? host.file_roots : [];
  if(!roots.length){
    state.selectedFileRootId = '';
    state.filePath = '';
    state.fileExplorer = null;
    state.filePreview = null;
    state.fileSelectedPath = '';
    state.fileSelectedType = '';
    state.fileSelectedName = '';
    state.fileContextMenu = null;
    state.fileEditing = false;
    state.fileEditContent = '';
    _resetFileHistory('');
    return;
  }
  var exists = roots.some(function(item){
    return String(item && item.id || '') === String(state.selectedFileRootId || '');
  });
  if(!exists){
    state.selectedFileRootId = String(roots[0].id || '');
    state.filePath = '';
    state.fileExplorer = null;
    state.filePreview = null;
    state.fileSelectedPath = '';
    state.fileSelectedType = '';
    state.fileSelectedName = '';
    state.fileContextMenu = null;
    state.fileEditing = false;
    state.fileEditContent = '';
    _resetFileHistory('');
  }
}

function _resetFileHistory(path){
  state.fileHistory = [String(path || '')];
  state.fileHistoryIndex = 0;
}

function _selectedTerminal(host){
  var items = Array.isArray(host && host.terminals) ? host.terminals : [];
  for(var i = 0; i < items.length; i += 1){
    if(String(items[i] && items[i].id || '') === String(state.selectedTerminalId || '')){
      return items[i];
    }
  }
  return items[0] || null;
}

function _selectedFileRoot(host){
  var items = Array.isArray(host && host.file_roots) ? host.file_roots : [];
  for(var i = 0; i < items.length; i += 1){
    if(String(items[i] && items[i].id || '') === String(state.selectedFileRootId || '')){
      return items[i];
    }
  }
  return items[0] || null;
}

function _selectedObservability(host){
  var items = Array.isArray(host && host.observability) ? host.observability : [];
  for(var i = 0; i < items.length; i += 1){
    if(String(items[i] && items[i].id || '') === String(state.selectedObservabilityId || '')){
      return items[i];
    }
  }
  return items[0] || null;
}

function _render(container){
  state.container = container;
  if(!state.overview){
    _loadOverview();
    return;
  }
  _paint();
}

async function _loadOverview(){
  state.loading = true;
  _paint();
  try{
    var res = await _api('vps_control_overview', null, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'overview_failed');
    state.overview = res.overview || {};
    var hosts = Array.isArray(state.overview.hosts) ? state.overview.hosts : [];
    if(!hosts.some(function(host){ return String(host && host.id || '') === String(state.selectedHostId || ''); })){
      state.selectedHostId = hosts.length ? String(hosts[0].id || '') : '';
    }
    if(state.selectedHostId){
      await _loadHost(false);
      return;
    }
    state.host = null;
  }catch(err){
    state.overview = {error: (err && err.message) || 'overview_failed'};
    state.host = null;
    _toast(_t('Không thể tải trạng thái VPS live.', 'Could not load the live VPS state.'), 'error');
  }finally{
    state.loading = false;
    _paint();
  }
}

async function _loadHost(showSpinner){
  if(!state.selectedHostId){
    state.host = null;
    _paint();
    return;
  }
  if(showSpinner){
    state.loading = true;
    _paint();
  }
  try{
    var res = await _api('vps_control_host', {host_id: state.selectedHostId}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'host_failed');
    state.host = res.host || null;
    _syncTerminalSelection(state.host);
    _syncObservabilitySelection(state.host);
    _syncFileRootSelection(state.host);
    if(state.tab === 'files' && state.selectedFileRootId){
      await _loadFiles(state.filePath || '', false);
      return;
    }
  }catch(err){
    state.host = null;
    state.selectedTerminalId = '';
    state.selectedObservabilityId = '';
    state.selectedFileRootId = '';
    state.fileExplorer = null;
    state.filePreview = null;
    state.fileSelectedPath = '';
    state.fileSelectedType = '';
    state.fileSelectedName = '';
    state.fileContextMenu = null;
    state.fileEditing = false;
    state.fileEditContent = '';
    _resetFileHistory('');
    _toast(_t('Không thể tải chi tiết host.', 'Could not load the host detail.'), 'error');
  }finally{
    state.loading = false;
    _paint();
  }
}

async function _refresh(){
  if(state.loading) return;
  state.actionResult = null;
  await _loadOverview();
  _toast(_t('Đã làm mới trạng thái live.', 'Live state refreshed.'), 'success');
}

async function _runAction(actionId){
  if(!state.selectedHostId || !actionId || state.actionBusy) return;
  state.actionBusy = actionId;
  state.actionResult = null;
  _paint();
  try{
    var res = await _api('vps_control_action', {host_id: state.selectedHostId, action: actionId}, 'POST', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'action_failed');
    state.actionResult = res.result || null;
    if(state.actionResult && state.actionResult.host_after){
      state.host = state.actionResult.host_after;
      _syncTerminalSelection(state.host);
      _syncObservabilitySelection(state.host);
      _syncFileRootSelection(state.host);
    }else{
      await _loadHost(false);
      return;
    }
    _toast(_t('Đã chạy action an toàn.', 'Safe action completed.'), 'success');
  }catch(err){
    state.actionResult = {
      label: actionId,
      ok: false,
      exit_code: 1,
      output: (err && err.message) || 'action_failed',
      executed_at: new Date().toISOString()
    };
    _toast(_t('Action không chạy được.', 'The action could not be executed.'), 'error');
  }finally{
    state.actionBusy = '';
    _paint();
  }
}

function _setTab(tabId){
  if(!tabId || tabId === state.tab) return;
  state.fileContextMenu = null;
  state.tab = tabId;
  if(tabId === 'files' && !state.fileExplorer && state.selectedFileRootId){
    _loadFiles(state.filePath || '', false);
    return;
  }
  _paint();
}

function _setHost(hostId){
  if(!hostId || hostId === state.selectedHostId) return;
  state.selectedHostId = hostId;
  state.selectedTerminalId = '';
  state.selectedObservabilityId = '';
  state.selectedFileRootId = '';
  state.filePath = '';
  state.fileQuery = '';
  state.fileExplorer = null;
  state.filePreview = null;
  state.fileSelectedPath = '';
  state.fileSelectedType = '';
  state.fileSelectedName = '';
  state.fileContextMenu = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  _resetFileHistory('');
  state.actionResult = null;
  _loadHost(true);
}

function _setTerminal(terminalId){
  if(!terminalId || terminalId === state.selectedTerminalId) return;
  state.selectedTerminalId = terminalId;
  _paint();
}

function _setObservability(panelId){
  if(!panelId || panelId === state.selectedObservabilityId) return;
  state.selectedObservabilityId = panelId;
  _paint();
}

function _setFileRoot(rootId){
  if(!rootId || rootId === state.selectedFileRootId) return;
  state.selectedFileRootId = rootId;
  state.filePath = '';
  state.fileQuery = '';
  state.fileExplorer = null;
  state.filePreview = null;
  state.fileSelectedPath = '';
  state.fileSelectedType = '';
  state.fileSelectedName = '';
  state.fileContextMenu = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  _resetFileHistory('');
  _loadFiles('', true);
}

function _fileParams(extra){
  return Object.assign({
    host_id: state.selectedHostId,
    root_id: state.selectedFileRootId,
    path: state.filePath || '',
    hidden: state.fileShowHidden ? '1' : ''
  }, extra || {});
}

async function _loadFiles(path, showToastOnSuccess, fromHistory){
  if(!state.selectedHostId || !state.selectedFileRootId || state.fileLoading) return;
  state.fileLoading = true;
  state.filePath = String(path || '');
  state.fileQuery = '';
  state.filePreview = null;
  state.fileSelectedPath = '';
  state.fileSelectedType = '';
  state.fileSelectedName = '';
  state.fileContextMenu = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  _paint();
  try{
    var res = await _api('vps_file_list', _fileParams({path: state.filePath}), 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'file_list_failed');
    state.fileExplorer = res.explorer || null;
    state.filePath = String(state.fileExplorer && state.fileExplorer.path || '');
    if(!fromHistory){
      var currentHistoryPath = String(state.fileHistory[state.fileHistoryIndex] || '');
      if(state.filePath !== currentHistoryPath){
        state.fileHistory = state.fileHistory.slice(0, state.fileHistoryIndex + 1);
        state.fileHistory.push(state.filePath);
        if(state.fileHistory.length > 60){
          state.fileHistory.shift();
        }
        state.fileHistoryIndex = state.fileHistory.length - 1;
      }
    }
    if(showToastOnSuccess) _toast(_t('Đã tải thư mục.', 'Folder loaded.'), 'success');
  }catch(err){
    state.fileExplorer = {error: (err && err.message) || 'file_list_failed', entries: []};
    _toast(_t('Không thể tải file explorer.', 'Could not load the file explorer.'), 'error');
  }finally{
    state.fileLoading = false;
    _paint();
  }
}

function _goFileHistory(delta){
  var nextIndex = state.fileHistoryIndex + Number(delta || 0);
  if(nextIndex < 0 || nextIndex >= state.fileHistory.length) return;
  state.fileHistoryIndex = nextIndex;
  _loadFiles(state.fileHistory[nextIndex] || '', false, true);
}

async function _searchFiles(query){
  query = String(query || '').trim();
  if(!query){
    _loadFiles(state.filePath || '', false);
    return;
  }
  if(!state.selectedHostId || !state.selectedFileRootId || state.fileLoading) return;
  state.fileLoading = true;
  state.fileQuery = query;
  state.filePreview = null;
  state.fileSelectedPath = '';
  state.fileSelectedType = '';
  state.fileSelectedName = '';
  state.fileContextMenu = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  _paint();
  try{
    var res = await _api('vps_file_search', _fileParams({q: query}), 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'file_search_failed');
    state.fileExplorer = res.explorer || null;
  }catch(err){
    state.fileExplorer = {error: (err && err.message) || 'file_search_failed', entries: []};
    _toast(_t('Không thể tìm file.', 'Could not search files.'), 'error');
  }finally{
    state.fileLoading = false;
    _paint();
  }
}

async function _readFile(path, editAfterRead){
  if(!path || !state.selectedHostId || !state.selectedFileRootId || state.fileLoading) return;
  state.fileLoading = true;
  state.fileSelectedPath = String(path || '');
  state.fileSelectedType = state.fileSelectedType || 'file';
  state.fileSelectedName = state.fileSelectedName || _fileBaseName(path);
  state.filePreview = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  _paint();
  try{
    var res = await _api('vps_file_read', _fileParams({path: path}), 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'file_read_failed');
    state.filePreview = res.explorer || null;
    if(state.filePreview && state.filePreview.file){
      state.fileSelectedPath = String(state.filePreview.file.relative_path || state.filePreview.path || path || '');
      state.fileSelectedType = String(state.filePreview.file.type || 'file');
      state.fileSelectedName = String(state.filePreview.file.name || _fileBaseName(state.fileSelectedPath));
    }
    if(editAfterRead){
      if(state.filePreview && state.filePreview.encoding === 'utf-8' && typeof state.filePreview.content === 'string'){
        state.fileEditing = true;
        state.fileEditContent = String(state.filePreview.content || '');
      }else{
        _toast(_t('File này không phải text hoặc vượt giới hạn edit.', 'This file is not text or exceeds the edit limit.'), 'error');
      }
    }
  }catch(err){
    state.filePreview = {error: (err && err.message) || 'file_read_failed'};
    _toast(_t('Không thể đọc file.', 'Could not read the file.'), 'error');
  }finally{
    state.fileLoading = false;
    _paint();
  }
}

function _selectFile(path, type, name, preview){
  state.fileSelectedPath = String(path || '');
  state.fileSelectedType = String(type || 'file');
  state.fileSelectedName = String(name || _fileBaseName(path));
  state.fileContextMenu = null;
  state.fileEditing = false;
  state.fileEditContent = '';
  if(preview && state.fileSelectedType !== 'directory'){
    _readFile(state.fileSelectedPath);
    return;
  }
  state.filePreview = null;
  _paint();
}

async function _mutateFile(operation, payload){
  if(state.fileOperationBusy || !state.selectedHostId || !state.selectedFileRootId) return;
  payload = payload || {};
  state.fileOperationBusy = operation;
  _paint();
  try{
    var res = await _api('vps_file_mutate', Object.assign({
      host_id: state.selectedHostId,
      root_id: state.selectedFileRootId,
      operation: operation
    }, payload), 'POST', 120000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'file_mutate_failed');
    var result = res.explorer || {};
    if(operation === 'move' && state.fileClipboard && state.fileClipboard.mode === 'cut'){
      state.fileClipboard = null;
    }
    state.fileSelectedPath = '';
    state.fileSelectedType = '';
    state.fileSelectedName = '';
    state.fileEditing = false;
    state.fileEditContent = '';
    state.fileOperationBusy = '';
    _toast(_t('Đã cập nhật file.', 'File operation completed.'), 'success');
    await _loadFiles(String(result.path || state.filePath || ''), false, true);
  }catch(err){
    state.fileOperationBusy = '';
    _paint();
    _toast((err && err.message) || _t('Không thể cập nhật file.', 'File operation failed.'), 'error');
  }
}

function _fileCurrentRoot(){
  return (state.fileExplorer && state.fileExplorer.root) || _selectedFileRoot(state.host) || {};
}

function _fileIsReadOnly(){
  return !!(_fileCurrentRoot().read_only);
}

function _closeFileContextMenu(repaint){
  state.fileContextMenu = null;
  if(repaint) _paint();
}

function _openFileContextMenu(event, item){
  if(event){
    event.preventDefault();
    event.stopPropagation();
  }
  item = item || {};
  var path = String(item.path || '');
  var type = String(item.type || '');
  var name = String(item.name || _fileBaseName(path));
  if(path){
    state.fileSelectedPath = path;
    state.fileSelectedType = type || 'file';
    state.fileSelectedName = name;
    state.filePreview = null;
    state.fileEditing = false;
    state.fileEditContent = '';
  }
  var x = event ? Number(event.clientX || 0) : 80;
  var y = event ? Number(event.clientY || 0) : 80;
  var width = 236;
  var height = 350;
  if(typeof window !== 'undefined'){
    x = Math.max(8, Math.min(x, Math.max(8, window.innerWidth - width - 8)));
    y = Math.max(8, Math.min(y, Math.max(8, window.innerHeight - height - 8)));
  }
  state.fileContextMenu = {
    x: x,
    y: y,
    path: path,
    type: type || (path ? 'file' : ''),
    name: name,
    scope: path ? 'item' : 'folder',
    targetPath: path && type === 'directory' ? path : String(state.filePath || '')
  };
  _paint();
}

function _triggerFileUpload(targetPath){
  if(_fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileUploadTarget = String(targetPath || state.filePath || '');
  state.fileContextMenu = null;
  _paint();
  setTimeout(function(){
    var input = state.container ? state.container.querySelector('[data-file-upload-input]') : null;
    if(input) input.click();
  }, 0);
}

function _newFolder(targetPath){
  if(_fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  var name = window.prompt(_t('Tên thư mục mới', 'New folder name'), _t('Thư mục mới', 'New folder'));
  if(!name){
    _paint();
    return;
  }
  _mutateFile('mkdir', {path: String(targetPath || state.filePath || ''), name: name});
}

function _renameSelected(){
  if(!state.fileSelectedPath || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  var name = window.prompt(_t('Tên mới', 'New name'), state.fileSelectedName || _fileBaseName(state.fileSelectedPath));
  if(!name){
    _paint();
    return;
  }
  _mutateFile('rename', {path: state.fileSelectedPath, name: name});
}

function _copySelected(mode){
  if(!state.fileSelectedPath || state.fileOperationBusy) return;
  mode = mode === 'cut' ? 'cut' : 'copy';
  if(mode === 'cut' && _fileIsReadOnly()) return;
  state.fileClipboard = {mode: mode, path: state.fileSelectedPath, name: state.fileSelectedName || _fileBaseName(state.fileSelectedPath), type: state.fileSelectedType || 'file'};
  state.fileContextMenu = null;
  _toast(mode === 'cut' ? _t('Đã cut vào clipboard.', 'Cut to clipboard.') : _t('Đã copy vào clipboard.', 'Copied to clipboard.'), 'success');
  _paint();
}

function _pasteFile(targetPath){
  if(!state.fileClipboard || !state.fileClipboard.path || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  _mutateFile(state.fileClipboard.mode === 'cut' ? 'move' : 'copy', {
    path: state.fileClipboard.path,
    target_path: String(targetPath || state.filePath || ''),
    name: state.fileClipboard.name || ''
  });
}

function _deleteSelected(){
  if(!state.fileSelectedPath || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  var label = state.fileSelectedName || _fileBaseName(state.fileSelectedPath);
  if(!window.confirm(_t('Xóa mục này khỏi VPS?', 'Delete this item from the VPS?') + '\n' + label)){
    _paint();
    return;
  }
  _mutateFile('delete', {path: state.fileSelectedPath});
}

function _zipSelected(){
  if(!state.fileSelectedPath || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  var baseName = state.fileSelectedName || _fileBaseName(state.fileSelectedPath);
  var defaultName = baseName + '.zip';
  var name = window.prompt(_t('Tên file ZIP', 'ZIP file name'), defaultName);
  if(!name){
    _paint();
    return;
  }
  _mutateFile('zip', {
    path: state.fileSelectedPath,
    target_path: _fileParentPath(state.fileSelectedPath),
    name: name
  });
}

function _unzipSelected(){
  if(!state.fileSelectedPath || !_fileIsZip(state.fileSelectedPath) || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  var folderName = window.prompt(_t('Giải nén vào thư mục', 'Extract to folder'), _fileNameWithoutZip(state.fileSelectedPath));
  if(!folderName){
    _paint();
    return;
  }
  _mutateFile('unzip', {
    path: state.fileSelectedPath,
    target_path: _fileParentPath(state.fileSelectedPath),
    name: folderName
  });
}

function _openSelected(){
  state.fileContextMenu = null;
  if(!state.fileSelectedPath){
    _paint();
    return;
  }
  if(state.fileSelectedType === 'directory') _loadFiles(state.fileSelectedPath, true);
  else _readFile(state.fileSelectedPath);
}

function _editSelectedText(){
  if(!state.fileSelectedPath || state.fileSelectedType === 'directory' || _fileIsReadOnly() || state.fileOperationBusy) return;
  state.fileContextMenu = null;
  if(state.filePreview && state.filePreview.path === state.fileSelectedPath && state.filePreview.encoding === 'utf-8' && typeof state.filePreview.content === 'string'){
    state.fileEditing = true;
    state.fileEditContent = String(state.filePreview.content || '');
    _paint();
    return;
  }
  _readFile(state.fileSelectedPath, true);
}

function _cancelTextEdit(){
  state.fileEditing = false;
  state.fileEditContent = '';
  _paint();
}

function _saveTextEdit(){
  if(!state.fileSelectedPath || state.fileSelectedType === 'directory' || _fileIsReadOnly() || state.fileOperationBusy) return;
  var editor = state.container ? state.container.querySelector('[data-file-editor]') : null;
  var content = editor ? String(editor.value || '') : String(state.fileEditContent || '');
  state.fileEditContent = content;
  var parent = _fileParentPath(state.fileSelectedPath);
  var name = _fileBaseName(state.fileSelectedPath);
  var blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
  var file = null;
  try{
    file = new File([blob], name, {type: 'text/plain;charset=utf-8'});
  }catch(_err){
    file = blob;
  }
  _uploadFiles([file], parent, true, name);
}

async function _uploadFiles(files, targetPath, overwrite, forcedName){
  files = Array.prototype.slice.call(files || []).filter(Boolean);
  if(!files.length || state.fileOperationBusy || !state.selectedHostId || !state.selectedFileRootId) return;
  var formData = new FormData();
  formData.append('host_id', state.selectedHostId || '');
  formData.append('root_id', state.selectedFileRootId || '');
  formData.append('path', String(targetPath || state.filePath || ''));
  if(overwrite) formData.append('overwrite', '1');
  files.forEach(function(file){ formData.append('files[]', file, forcedName || file.name || 'upload.bin'); });
  state.fileOperationBusy = 'upload';
  _paint();
  try{
    var res = await _apiFormData('vps_file_upload', formData, 240000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'file_upload_failed');
    state.fileOperationBusy = '';
    state.fileEditing = false;
    state.fileEditContent = '';
    _toast(_t('Đã tải file lên VPS.', 'Files uploaded to the VPS.'), 'success');
    await _loadFiles(String(targetPath || state.filePath || ''), false, true);
  }catch(err){
    state.fileOperationBusy = '';
    _paint();
    _toast((err && err.message) || _t('Không thể upload file.', 'Could not upload files.'), 'error');
  }
}

function _fileDownloadHref(path){
  var params = new URLSearchParams();
  params.set('action', 'vps_file_read');
  params.set('host_id', state.selectedHostId || '');
  params.set('root_id', state.selectedFileRootId || '');
  params.set('path', path || '');
  params.set('download', '1');
  return 'api.php?' + params.toString();
}

function _summaryCards(metrics){
  metrics = metrics || {};
  var items = [
    {
      title: _t('Host online', 'Hosts online'),
      value: _fmtInt(metrics.reachable_hosts || 0) + '/' + _fmtInt(metrics.host_count || 0),
      tone: (metrics.reachable_hosts || 0) === (metrics.host_count || 0) ? 'good' : 'warn',
      detail: _t('Probe host thật sự đang trả dữ liệu.', 'Hosts whose probe currently returns live data.')
    },
    {
      title: _t('Service khỏe', 'Healthy services'),
      value: _fmtInt(metrics.active_services || 0) + '/' + _fmtInt(metrics.declared_services || 0),
      tone: (metrics.active_services || 0) === (metrics.declared_services || 0) ? 'good' : 'warn',
      detail: _t('Systemd service khai báo và đang active.', 'Declared systemd services that are currently active.')
    },
    {
      title: _t('Site sống', 'Healthy sites'),
      value: _fmtInt(metrics.healthy_sites || 0) + '/' + _fmtInt(metrics.sites_count || 0),
      tone: (metrics.healthy_sites || 0) === (metrics.sites_count || 0) ? 'good' : 'warn',
      detail: _t('HTTP probe của domain/site trong inventory.', 'HTTP probe status for sites in the inventory.')
    },
    {
      title: 'DNS',
      value: _fmtInt(metrics.healthy_dns_records || 0) + '/' + _fmtInt(metrics.dns_records || 0),
      tone: (metrics.healthy_dns_records || 0) === (metrics.dns_records || 0) ? 'good' : 'warn',
      detail: _t('Record phân giải đúng với inventory hiện tại.', 'Records whose resolution currently matches the inventory.')
    },
    {
      title: _t('Terminal', 'Terminal'),
      value: _fmtInt(metrics.healthy_terminals || 0) + '/' + _fmtInt(metrics.terminals_count || 0),
      tone: (metrics.healthy_terminals || 0) === (metrics.terminals_count || 0) ? 'good' : 'warn',
      detail: _t('Gateway terminal nội bộ đang reachable đúng mã phản hồi mong đợi.', 'Terminal gateways responding with the expected internal status codes.')
    },
    {
      title: _t('Observability', 'Observability'),
      value: _fmtInt(metrics.healthy_observability_panels || 0) + '/' + _fmtInt(metrics.observability_panels || 0),
      tone: (metrics.healthy_observability_panels || 0) === (metrics.observability_panels || 0) ? 'good' : 'warn',
      detail: _t('Netdata/Grafana panel đang probe được thật.', 'Netdata and Grafana panels whose probes currently succeed.')
    },
    {
      title: _t('File roots', 'File roots'),
      value: _fmtInt(metrics.file_roots_count || 0),
      tone: (metrics.file_roots_count || 0) > 0 ? 'good' : 'warn',
      detail: _t('Root filesystem được allowlist cho file explorer.', 'Allowlisted filesystem roots available to the file explorer.')
    },
    {
      title: _t('Cảnh báo', 'Alerts'),
      value: _fmtInt(metrics.alert_count || 0),
      tone: (metrics.alert_count || 0) > 0 ? 'bad' : 'good',
      detail: _t('Điểm lệch giữa inventory và trạng thái live.', 'Current mismatches between inventory and live state.')
    }
  ];
  return '<div class="vps-summary-grid">' + items.map(function(item){
    return '<article class="vps-summary-card tone-' + _esc(item.tone) + '">' +
      '<small>' + _esc(item.title) + '</small>' +
      '<strong>' + _esc(item.value) + '</strong>' +
      '<span>' + _esc(item.detail) + '</span>' +
    '</article>';
  }).join('') + '</div>';
}

function _header(overview, host){
  overview = overview || {};
  host = host || {};
  var terminal = _selectedTerminal(host);
  var observability = _selectedObservability(host);
  var hostStatus = host && host.connection ? host.connection.status : 'neutral';
  return '' +
    '<section class="vps-ops-header">' +
      '<div class="vps-ops-header-main">' +
        '<div class="vps-ops-title-row">' +
          '<div>' +
            '<small class="vps-section-kicker">' + _esc(overview.product || 'HESEM VPS CONTROL TOWER') + '</small>' +
            '<h2>' + _esc(_t('Hạ tầng VPS', 'VPS Infrastructure')) + '</h2>' +
          '</div>' +
          '<span class="vps-status ' + _statusClass(hostStatus) + '">' + _esc(host && host.connection && host.connection.message ? host.connection.message : _t('Chưa có host', 'No host selected')) + '</span>' +
        '</div>' +
        '<p class="vps-ops-subtitle">' + _esc(_t(
          'Mọi khối trong module này đều phải bám probe thật từ backend: host, service, site, DNS, terminal, observability và output action. Không còn tab chiến lược hay nhãn placeholder ở bề mặt điều hành.',
          'Every surface in this module is tied to a real backend probe: host, service, site, DNS, terminal, observability, and safe-action output. Decorative strategy tabs and placeholder labels have been removed from the operational surface.'
        )) + '</p>' +
        '<div class="vps-chip-list">' +
          (host.label ? '<span class="vps-chip">' + _esc(host.label) + '</span>' : '') +
          (host.public_ip ? '<span class="vps-chip">' + _esc(host.public_ip) + '</span>' : '') +
          ((host.execution_mode || host.mode) ? '<span class="vps-chip">' + _esc(_hostModeLabel(host.execution_mode || host.mode)) + '</span>' : '') +
          (host.system && host.system.last_probe_at ? '<span class="vps-chip">' + _esc(_t('Probe lúc', 'Probed at')) + ': ' + _esc(_fmtTime(host.system.last_probe_at)) + '</span>' : '') +
          '<span class="vps-chip">' + _esc(_t('Admin only', 'Admin only')) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="vps-ops-header-actions">' +
        '<button class="vps-action-btn primary" data-refresh-live="1"' + (state.loading ? ' disabled' : '') + '>' + _esc(state.loading ? _t('Đang tải...', 'Loading...') : _t('Làm mới live', 'Refresh live')) + '</button>' +
        (terminal && terminal.url ? '<a class="vps-link-btn" href="' + _esc(terminal.url) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở terminal', 'Open terminal')) + '</a>' : '') +
        (observability && observability.url ? '<a class="vps-link-btn" href="' + _esc(observability.url) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở observability', 'Open observability')) + '</a>' : '') +
      '</div>' +
    '</section>';
}

function _hostPicker(hosts){
  if(!hosts || !hosts.length) return '';
  return '<div class="vps-host-strip">' + hosts.map(function(host){
    var active = String(host.id || '') === String(state.selectedHostId || '');
    var status = host.connection && host.connection.status ? host.connection.status : 'neutral';
    return '<button class="vps-host-pill' + (active ? ' active' : '') + '" data-host-id="' + _esc(host.id) + '">' +
      '<span>' + _esc(host.label || host.id || '') + '</span>' +
      '<span class="vps-status ' + _statusClass(status) + '">' + _esc(host.connection && host.connection.label ? host.connection.label : status) + '</span>' +
    '</button>';
  }).join('') + '</div>';
}

function _tabs(){
  var tabs = [
    {id:'overview', label:_t('Tổng quan live', 'Live overview')},
    {id:'services', label:_t('Service', 'Services')},
    {id:'network', label:_t('Site & DNS', 'Sites & DNS')},
    {id:'files', label:'File Explorer'},
    {id:'terminal', label:'Terminal'},
    {id:'observability', label:'Observability'},
    {id:'actions', label:_t('Actions', 'Actions')}
  ];
  return '<div class="vps-tabs vps-control-tab-strip" role="tablist" aria-label="' + _esc(_t('Tab điều khiển VPS', 'VPS control tabs')) + '">' + tabs.map(function(tab){
    var active = state.tab === tab.id;
    return '<button type="button" role="tab" aria-selected="' + (active ? 'true' : 'false') + '" class="vps-tab' + (active ? ' active' : '') + '" data-vps-tab="' + _esc(tab.id) + '">' + _esc(tab.label) + '</button>';
  }).join('') + '</div>';
}

function _empty(message){
  return '<div class="vps-panel"><div class="vps-panel-body"><div class="vps-empty">' + _esc(message) + '</div></div></div>';
}

function _healthCards(host){
  var services = Array.isArray(host && host.services) ? host.services : [];
  var sites = Array.isArray(host && host.sites) ? host.sites : [];
  var dns = Array.isArray(host && host.dns_records) ? host.dns_records : [];
  var terminals = Array.isArray(host && host.terminals) ? host.terminals : [];
  var panels = Array.isArray(host && host.observability) ? host.observability : [];
  var fileRoots = Array.isArray(host && host.file_roots) ? host.file_roots : [];
  var items = [
    {label:_t('Service active', 'Active services'), good:_countStatus(services, 'active'), total:services.length},
    {label:_t('Site HTTP OK', 'Healthy sites'), good:_countStatus(sites, 'ok'), total:sites.length},
    {label:'DNS', good:_countStatus(dns, 'ok'), total:dns.length},
    {label:'Terminal', good:_countStatus(terminals, 'ok'), total:terminals.length},
    {label:'Observability', good:_countStatus(panels, 'ok'), total:panels.length},
    {label:_t('File roots', 'File roots'), good:fileRoots.length, total:fileRoots.length}
  ];
  return '<div class="vps-health-grid">' + items.map(function(item){
    var tone = item.total > 0 && item.good === item.total ? 'good' : (item.good > 0 ? 'warn' : 'bad');
    return '<article class="vps-health-card tone-' + _esc(tone) + '">' +
      '<small>' + _esc(item.label) + '</small>' +
      '<strong>' + _esc(_fmtInt(item.good) + '/' + _fmtInt(item.total)) + '</strong>' +
    '</article>';
  }).join('') + '</div>';
}

function _resourceMeters(resources){
  resources = resources || {};
  var diskLine = _fmtSizeFromKb(resources.disk_used_kb || 0) + ' / ' + _fmtSizeFromKb(resources.disk_total_kb || 0);
  var memLine = _fmtSizeFromMb(resources.memory_used_mb || 0) + ' / ' + _fmtSizeFromMb(resources.memory_total_mb || 0);
  return '<div class="vps-meter-grid">' +
    '<article class="vps-meter-card">' +
      '<small>' + _esc(_t('Dung lượng root', 'Root filesystem')) + '</small>' +
      '<strong>' + _esc(resources.disk_used_pct || '—') + '</strong>' +
      '<div class="vps-meter"><span style="width:' + _esc(_progressWidth(resources.disk_used_pct)) + '"></span></div>' +
      '<span>' + _esc(diskLine) + '</span>' +
    '</article>' +
    '<article class="vps-meter-card">' +
      '<small>' + _esc(_t('Bộ nhớ', 'Memory')) + '</small>' +
      '<strong>' + _esc(resources.memory_used_pct || '—') + '</strong>' +
      '<div class="vps-meter"><span style="width:' + _esc(_progressWidth(resources.memory_used_pct)) + '"></span></div>' +
      '<span>' + _esc(memLine) + '</span>' +
    '</article>' +
  '</div>';
}

function _facts(host){
  host = host || {};
  var system = host.system || {};
  var capabilities = host.capabilities || {};
  var roles = Array.isArray(host.roles) ? host.roles : [];
  return '<div class="vps-fact-grid">' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Hostname', 'Hostname')) + '</small><strong>' + _esc(system.hostname || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('OS / arch', 'OS / arch')) + '</small><strong>' + _esc([system.os, system.arch].filter(Boolean).join(' / ') || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Load', 'Load')) + '</small><strong>' + _esc(system.load || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Uptime', 'Uptime')) + '</small><strong>' + _esc(system.uptime || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Docker', 'Docker')) + '</small><strong>' + _esc(capabilities.docker ? _t('Có', 'Available') : _t('Không có', 'Not installed')) + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Vai trò', 'Roles')) + '</small><strong>' + _esc(roles.join(', ') || '—') + '</strong></article>' +
  '</div>';
}

function _alerts(host){
  var alerts = Array.isArray(host && host.alerts) ? host.alerts : [];
  if(!alerts.length){
    return '<div class="vps-note">' + _esc(_t('Không có cảnh báo active từ probe hiện tại.', 'No active alerts in the current probe.')) + '</div>';
  }
  return '<div class="vps-alert-list">' + alerts.map(function(item){
    return '<article class="vps-alert-item">' +
      '<span class="vps-status ' + _statusClass('error') + '">' + _esc(item.scope || 'alert') + '</span>' +
      '<strong>' + _esc(item.label || '') + '</strong>' +
      '<p>' + _esc(item.detail || '') + '</p>' +
    '</article>';
  }).join('') + '</div>';
}

function _servicesTable(host){
  var services = Array.isArray(host && host.services) ? host.services : [];
  if(!services.length){
    return '<div class="vps-empty">' + _esc(_t('Chưa khai báo service.', 'No services declared.')) + '</div>';
  }
  return '<div class="vps-table-wrap"><table class="vps-service-table"><thead><tr>' +
    '<th>' + _esc(_t('Service', 'Service')) + '</th>' +
    '<th>' + _esc(_t('Unit', 'Unit')) + '</th>' +
    '<th>' + _esc(_t('Status', 'Status')) + '</th>' +
    '<th>' + _esc(_t('Chi tiết', 'Detail')) + '</th>' +
  '</tr></thead><tbody>' + services.map(function(item){
    return '<tr>' +
      '<td><strong>' + _esc(item.label || item.name || '') + '</strong><br><span>' + _esc(item.name || '') + '</span></td>' +
      '<td>' + _esc(item.resolved_unit || '—') + '</td>' +
      '<td><span class="vps-status ' + _statusClass(item.status) + '">' + _esc(item.status || 'unknown') + '</span></td>' +
      '<td>' + _esc(item.detail || '—') + '</td>' +
    '</tr>';
  }).join('') + '</tbody></table></div>';
}

function _containersPanel(host){
  var capabilities = host && host.capabilities ? host.capabilities : {};
  var containers = Array.isArray(host && host.containers) ? host.containers : [];
  if(!capabilities.docker){
    return '<div class="vps-note warn">' + _esc(_t('Docker chưa được cài trên host này.', 'Docker is not installed on this host.')) + '</div>';
  }
  if(!containers.length){
    return '<div class="vps-note">' + _esc(_t('Docker có mặt nhưng hiện không có container đang chạy.', 'Docker is available but no containers are running right now.')) + '</div>';
  }
  return '<div class="vps-table-wrap"><table class="vps-list-table"><thead><tr>' +
    '<th>' + _esc(_t('Container', 'Container')) + '</th>' +
    '<th>' + _esc(_t('Image', 'Image')) + '</th>' +
    '<th>' + _esc(_t('Status', 'Status')) + '</th>' +
    '<th>' + _esc(_t('Ports', 'Ports')) + '</th>' +
  '</tr></thead><tbody>' + containers.map(function(item){
    return '<tr>' +
      '<td>' + _esc(item.name || '—') + '</td>' +
      '<td>' + _esc(item.image || '—') + '</td>' +
      '<td>' + _esc(item.status || '—') + '</td>' +
      '<td>' + _esc(item.ports || '—') + '</td>' +
    '</tr>';
  }).join('') + '</tbody></table></div>';
}

function _portsPanel(host){
  var ports = Array.isArray(host && host.ports) ? host.ports : [];
  if(!ports.length){
    return '<div class="vps-note">' + _esc(_t('Chưa lấy được listen ports từ probe hiện tại.', 'No listening ports were returned by the current probe.')) + '</div>';
  }
  return '<div class="vps-chip-list">' + ports.map(function(port){
    return '<span class="vps-chip code">' + _esc(port) + '</span>';
  }).join('') + '</div>';
}

function _sitesTable(host){
  var sites = Array.isArray(host && host.sites) ? host.sites : [];
  if(!sites.length){
    return '<div class="vps-empty">' + _esc(_t('Chưa khai báo site.', 'No sites declared.')) + '</div>';
  }
  return '<div class="vps-table-wrap"><table class="vps-list-table"><thead><tr>' +
    '<th>' + _esc(_t('Domain', 'Domain')) + '</th>' +
    '<th>' + _esc(_t('Status', 'Status')) + '</th>' +
    '<th>HTTP</th>' +
    '<th>' + _esc(_t('Role', 'Role')) + '</th>' +
    '<th>' + _esc(_t('Final URL', 'Final URL')) + '</th>' +
    '<th>' + _esc(_t('Latency', 'Latency')) + '</th>' +
    '<th>IP</th>' +
  '</tr></thead><tbody>' + sites.map(function(site){
    var href = site.url || site.final_url || '';
    return '<tr>' +
      '<td>' + (href ? '<a href="' + _esc(href) + '" target="_blank" rel="noopener noreferrer">' + _esc(site.host || href) + '</a>' : _esc(site.host || '—')) + '<br><span>' + _esc(site.detail || '') + '</span></td>' +
      '<td><span class="vps-status ' + _statusClass(site.status) + '">' + _esc(site.status || 'unknown') + '</span></td>' +
      '<td>' + _esc(site.http_status || '—') + '</td>' +
      '<td>' + _esc(site.role || '—') + '</td>' +
      '<td>' + (site.final_url ? '<a href="' + _esc(site.final_url) + '" target="_blank" rel="noopener noreferrer">' + _esc(site.final_url) + '</a>' : '—') + '</td>' +
      '<td>' + _esc(_fmtMs(site.response_ms)) + '</td>' +
      '<td>' + _esc(site.remote_ip || '—') + '</td>' +
    '</tr>';
  }).join('') + '</tbody></table></div>';
}

function _dnsTable(host){
  var records = Array.isArray(host && host.dns_records) ? host.dns_records : [];
  if(!records.length){
    return '<div class="vps-empty">' + _esc(_t('Chưa khai báo DNS.', 'No DNS records declared.')) + '</div>';
  }
  return '<div class="vps-table-wrap"><table class="vps-list-table"><thead><tr>' +
    '<th>' + _esc(_t('Name', 'Name')) + '</th>' +
    '<th>' + _esc(_t('Status', 'Status')) + '</th>' +
    '<th>' + _esc(_t('Type', 'Type')) + '</th>' +
    '<th>' + _esc(_t('Inventory', 'Inventory')) + '</th>' +
    '<th>' + _esc(_t('Resolved', 'Resolved')) + '</th>' +
    '<th>' + _esc(_t('Chi tiết', 'Detail')) + '</th>' +
  '</tr></thead><tbody>' + records.map(function(item){
    var resolved = Array.isArray(item.resolved_values) && item.resolved_values.length ? item.resolved_values.join(', ') : '—';
    return '<tr>' +
      '<td>' + _esc(item.name || '—') + '</td>' +
      '<td><span class="vps-status ' + _statusClass(item.status) + '">' + _esc(item.status || 'unknown') + '</span></td>' +
      '<td>' + _esc(item.type || '—') + '</td>' +
      '<td>' + _esc(item.value || '—') + '</td>' +
      '<td>' + _esc(resolved) + '</td>' +
      '<td>' + _esc(item.detail || '—') + '</td>' +
    '</tr>';
  }).join('') + '</tbody></table></div>';
}

function _endpointTiles(items, kind){
  items = Array.isArray(items) ? items : [];
  if(!items.length){
    return '<div class="vps-note warn">' + _esc(kind === 'terminal' ? _t('Host này chưa có terminal được cấu hình.', 'No terminal is configured for this host.') : _t('Host này chưa có panel observability được cấu hình.', 'No observability panel is configured for this host.')) + '</div>';
  }
  return '<div class="vps-endpoint-grid">' + items.map(function(item){
    var selected = kind === 'terminal'
      ? String(item.id || '') === String(state.selectedTerminalId || '')
      : String(item.id || '') === String(state.selectedObservabilityId || '');
    var href = item.url || '';
    var meta = [];
    if(item.access) meta.push(item.access);
    if(item.kind) meta.push(item.kind);
    if(item.http_status) meta.push('HTTP ' + item.http_status);
    return '<button class="vps-endpoint-card' + (selected ? ' active' : '') + '" ' +
      (kind === 'terminal' ? 'data-terminal-id="' + _esc(item.id || '') + '"' : 'data-observability-id="' + _esc(item.id || '') + '"') + '>' +
      '<div class="vps-endpoint-head">' +
        '<strong>' + _esc(item.label || item.id || '') + '</strong>' +
        '<span class="vps-status ' + _statusClass(item.status) + '">' + _esc(item.status || 'unknown') + '</span>' +
      '</div>' +
      '<p>' + _esc(item.detail || item.note || '') + '</p>' +
      '<div class="vps-endpoint-meta">' + meta.map(function(token){ return '<span>' + _esc(token) + '</span>'; }).join('') + '</div>' +
      (href ? '<div class="vps-endpoint-link">' + _esc(href) + '</div>' : '') +
    '</button>';
  }).join('') + '</div>';
}

function _selectedEndpointDetail(item, modeLabel){
  if(!item) return '';
  return '<div class="vps-fact-grid compact">' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Truy cập', 'Access')) + '</small><strong>' + _esc(item.access || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(_t('Service', 'Service')) + '</small><strong>' + _esc(item.service_name || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>HTTP</small><strong>' + _esc(item.http_status || '—') + '</strong></article>' +
    '<article class="vps-fact-card"><small>' + _esc(modeLabel) + '</small><strong>' + _esc(item.reachable ? _t('Reachable', 'Reachable') : _t('Chưa probe được', 'Not reachable')) + '</strong></article>' +
  '</div>' +
  '<div class="vps-note' + ((item.status || '') === 'ok' ? '' : ' warn') + '">' + _esc(item.detail || item.note || '') + '</div>' +
  (item.summary ? '<div class="vps-console compact"><div class="vps-console-head"><span>' + _esc(_t('Probe summary', 'Probe summary')) + '</span></div><pre>' + _esc(item.summary) + '</pre></div>' : '');
}

function _quickLinks(overview){
  var assets = Array.isArray(overview && overview.control_assets) ? overview.control_assets : [];
  var commands = Array.isArray(overview && overview.quick_commands) ? overview.quick_commands : [];
  var gateway = overview && overview.terminal_gateway ? overview.terminal_gateway : {};
  var stack = overview && overview.observability_stack ? overview.observability_stack : {};
  var links = [];
  if(gateway.setup_doc) links.push({label:_t('Setup terminal', 'Terminal setup'), href:_assetHref(gateway.setup_doc)});
  if(gateway.install_script) links.push({label:_t('Installer terminal', 'Terminal installer'), href:_assetHref(gateway.install_script)});
  if(stack.setup_doc) links.push({label:_t('Setup observability', 'Observability setup'), href:_assetHref(stack.setup_doc)});
  if(stack.install_script) links.push({label:_t('Installer observability', 'Observability installer'), href:_assetHref(stack.install_script)});
  assets.slice(0, 4).forEach(function(item){
    links.push({label:item.label || item.relative_path || item.path || item.id || 'asset', href:_assetHref(item.path)});
  });
  return '' +
    '<section class="vps-panel">' +
      '<div class="vps-panel-head"><div><h3>' + _esc(_t('Hỗ trợ vận hành', 'Operational support')) + '</h3><p>' + _esc(_t('Link kỹ thuật và lệnh thật, không phải tab roadmap.', 'Technical links and real commands, not roadmap tabs.')) + '</p></div></div>' +
      '<div class="vps-panel-body">' +
        (links.length ? '<div class="vps-support-links">' + links.map(function(item){
          return '<a class="vps-link-btn" href="' + _esc(item.href || '#') + '" target="_blank" rel="noopener noreferrer">' + _esc(item.label || 'link') + '</a>';
        }).join('') + '</div>' : '') +
        (commands.length ? '<div class="vps-command-stack">' + commands.map(function(cmd){
          return '<div class="vps-command-card compact"><small>' + _esc(cmd.label || '') + '</small><code>' + _esc(cmd.command || '') + '</code></div>';
        }).join('') + '</div>' : '<div class="vps-empty">' + _esc(_t('Chưa có quick command.', 'No quick commands declared.')) + '</div>') +
      '</div>' +
    '</section>';
}

function _console(result){
  if(!result){
    return '<div class="vps-console"><div class="vps-console-head"><span>' + _esc(_t('Action output', 'Action output')) + '</span><span>' + _esc(_t('Chọn action an toàn để lấy dữ liệu thật từ host.', 'Run a safe action to fetch live output from the host.')) + '</span></div><pre>' + _esc(_t('Chưa có output nào.', 'No output yet.')) + '</pre></div>';
  }
  return '<div class="vps-console"><div class="vps-console-head"><span>' + _esc(result.label || result.action || 'command') + '</span><span>' + _esc(_fmtTime(result.executed_at)) + ' • exit ' + _esc(result.exit_code) + '</span></div><pre>' + _esc(result.output || _t('Không có output.', 'No output.')) + '</pre></div>';
}

function _overviewTab(host){
  if(!host){
    return _empty(_t('Chưa có host live để hiển thị.', 'No live host is available to display.'));
  }
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('Snapshot hiện tại', 'Current snapshot')) + '</h3><p>' + _esc(_t('Thông số này lấy từ probe live gần nhất.', 'These values come from the most recent live probe.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          _facts(host) +
          '<div style="height:14px"></div>' +
          _resourceMeters(host.resources || {}) +
          '<div style="height:14px"></div>' +
          _healthCards(host) +
        '</div>' +
      '</section>' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('Cảnh báo đang mở', 'Open alerts')) + '</h3><p>' + _esc(_t('Bất kỳ mục nào ở đây đều là lệch thật giữa inventory và trạng thái live.', 'Everything listed here is a real mismatch between the inventory and the live state.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' + _alerts(host) + '</div>' +
      '</section>' +
    '</div>';
}

function _servicesTab(host){
  if(!host){
    return _empty(_t('Chưa có host live để hiển thị service.', 'No live host is available to display services.'));
  }
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('Service health', 'Service health')) + '</h3><p>' + _esc(_t('Status lấy từ systemctl thật trên host.', 'Statuses are derived from the actual systemctl state on the host.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' + _servicesTable(host) + '</div>' +
      '</section>' +
      '<div class="vps-stack-column">' +
        '<section class="vps-panel">' +
          '<div class="vps-panel-head"><div><h3>' + _esc(_t('Containers', 'Containers')) + '</h3><p>' + _esc(_t('Nếu Docker không có, module phải nói thẳng.', 'If Docker is absent, the module should say so explicitly.')) + '</p></div></div>' +
          '<div class="vps-panel-body">' + _containersPanel(host) + '</div>' +
        '</section>' +
        '<section class="vps-panel">' +
          '<div class="vps-panel-head"><div><h3>' + _esc(_t('Listen ports', 'Listen ports')) + '</h3><p>' + _esc(_t('Danh sách lấy trực tiếp từ ss/netstat.', 'This list is read directly from ss or netstat.')) + '</p></div></div>' +
          '<div class="vps-panel-body">' + _portsPanel(host) + '</div>' +
        '</section>' +
      '</div>' +
    '</div>';
}

function _networkTab(host){
  if(!host){
    return _empty(_t('Chưa có host live để hiển thị site và DNS.', 'No live host is available to display sites and DNS.'));
  }
  return '' +
    '<div class="vps-stack-column">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('Site probes', 'Site probes')) + '</h3><p>' + _esc(_t('Bảng này cho thấy domain nào đang sống thật, đang redirect đi đâu, và đang gán role gì trong inventory.', 'This table shows which domains are really alive, where they redirect, and which role they are currently assigned in the inventory.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' + _sitesTable(host) + '</div>' +
      '</section>' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('DNS probes', 'DNS probes')) + '</h3><p>' + _esc(_t('Record nào không khớp inventory sẽ hiện rõ ở đây.', 'Any DNS record that does not match the inventory is surfaced here.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' + _dnsTable(host) + '</div>' +
      '</section>' +
    '</div>';
}

function _fileRootName(root){
  return root && (root.label || root.id) ? String(root.label || root.id) : 'This VPS';
}

function _fileDisplayPath(path){
  path = String(path || '').replace(/^\/+/, '');
  return path ? '/' + path : '/';
}

function _filePathInputValue(path){
  return String(path || '').replace(/^\/+/, '');
}

function _fileBaseName(path){
  var parts = String(path || '').split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '/';
}

function _fileParentPath(path){
  var parts = String(path || '').split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function _fileNameWithoutZip(path){
  return _fileBaseName(path).replace(/\.zip$/i, '') || 'archive';
}

function _fileIsZip(path){
  return /\.zip$/i.test(String(path || ''));
}

function _fileTypeLabel(item){
  item = item || {};
  if(item.type === 'directory') return _t('File folder', 'File folder');
  if(item.type === 'symlink') return _t('Symbolic link', 'Symbolic link');
  var ext = String(item.extension || '').replace(/^\./, '').toUpperCase();
  if(ext) return ext + ' File';
  return item.mime || _t('File', 'File');
}

function _fileIcon(item, large){
  var type = item && item.type === 'directory' ? 'folder' : 'file';
  return '<span class="vps-win-icon ' + _esc(type) + (large ? ' large' : '') + '" aria-hidden="true"></span>';
}

function _fileNavigationPane(host){
  var roots = Array.isArray(host && host.file_roots) ? host.file_roots : [];
  if(!roots.length){
    return '<nav class="vps-win-nav"><div class="vps-win-nav-empty">' + _esc(_t('Host này chưa khai báo root cho File Explorer.', 'No file explorer root is declared for this host.')) + '</div></nav>';
  }
  var hostLabel = host && (host.label || host.id) ? String(host.label || host.id) : _t('VPS hiện tại', 'Current VPS');
  return '' +
    '<nav class="vps-win-nav" aria-label="File Explorer navigation">' +
      '<div class="vps-win-nav-section">' +
        '<div class="vps-win-nav-title">' + _esc(_t('Quick access', 'Quick access')) + '</div>' +
        '<button class="vps-win-nav-item static" data-file-open="">' +
          '<span class="vps-win-nav-glyph">PC</span><span>' + _esc(hostLabel) + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="vps-win-nav-section">' +
        '<div class="vps-win-nav-title">' + _esc(_t('This VPS', 'This VPS')) + '</div>' +
        roots.map(function(root){
          var active = String(root.id || '') === String(state.selectedFileRootId || '');
          return '<button class="vps-win-nav-item' + (active ? ' active' : '') + '" data-file-root="' + _esc(root.id || '') + '">' +
            '<span class="vps-win-nav-glyph">D</span>' +
            '<span><strong>' + _esc(root.label || root.id || '') + '</strong><small>' + _esc(root.path || '') + '</small></span>' +
          '</button>';
        }).join('') +
      '</div>' +
    '</nav>';
}

function _fileBreadcrumbs(path){
  var root = _selectedFileRoot(state.host);
  var parts = String(path || '').split('/').filter(Boolean);
  var acc = '';
  var nodes = [
    '<button data-file-open="" class="vps-win-crumb">' + _esc(_t('This PC', 'This PC')) + '</button>',
    '<button data-file-open="" class="vps-win-crumb">' + _esc(_fileRootName(root)) + '</button>'
  ];
  parts.forEach(function(part){
    acc = acc ? acc + '/' + part : part;
    nodes.push('<button data-file-open="' + _esc(acc) + '" class="vps-win-crumb">' + _esc(part) + '</button>');
  });
  return '<div class="vps-win-breadcrumbs">' + nodes.join('<span>›</span>') + '</div>';
}

function _fileToolbar(explorer){
  explorer = explorer || {};
  var path = String(explorer.path || state.filePath || '');
  var parent = path ? String(explorer.parent_path || '') : '';
  var root = explorer.root || _selectedFileRoot(state.host) || {};
  var readOnly = !!root.read_only;
  var hasSelection = !!state.fileSelectedPath;
  var selectedIsZip = _fileIsZip(state.fileSelectedPath);
  var hasClipboard = !!(state.fileClipboard && state.fileClipboard.path);
  var busy = !!state.fileOperationBusy;
  var backDisabled = state.fileHistoryIndex <= 0;
  var forwardDisabled = state.fileHistoryIndex >= state.fileHistory.length - 1;
  var searching = explorer.mode === 'search' || !!state.fileQuery;
  return '' +
    '<div class="vps-win-commandbar">' +
      '<button class="vps-win-cmd" data-file-history="-1"' + (backDisabled ? ' disabled' : '') + ' aria-label="' + _esc(_t('Quay lại', 'Back')) + '">←</button>' +
      '<button class="vps-win-cmd" data-file-history="1"' + (forwardDisabled ? ' disabled' : '') + ' aria-label="' + _esc(_t('Tiến tới', 'Forward')) + '">→</button>' +
      '<button class="vps-win-cmd" data-file-parent="' + _esc(parent) + '"' + (!path ? ' disabled' : '') + ' aria-label="' + _esc(_t('Lên một cấp', 'Up')) + '">↑</button>' +
      '<span class="vps-win-separator"></span>' +
      '<button class="vps-win-cmd text" data-file-refresh="1">' + _esc(_t('Refresh', 'Refresh')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-hidden="1">' + _esc(state.fileShowHidden ? _t('Hide dotfiles', 'Hide dotfiles') : _t('Show dotfiles', 'Show dotfiles')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-clear-search="1"' + (!state.fileQuery ? ' disabled' : '') + '>' + _esc(_t('Clear search', 'Clear search')) + '</button>' +
      '<span class="vps-win-separator"></span>' +
      '<button class="vps-win-cmd text" data-file-upload-trigger="1"' + (readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Upload', 'Upload')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-new-folder="1"' + (readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('New folder', 'New folder')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-rename="1"' + (!hasSelection || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Rename', 'Rename')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-copy="1"' + (!hasSelection || busy ? ' disabled' : '') + '>' + _esc(_t('Copy', 'Copy')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-cut="1"' + (!hasSelection || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Cut', 'Cut')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-paste="1"' + (!hasClipboard || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Paste', 'Paste')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-zip="1"' + (!hasSelection || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Zip', 'Zip')) + '</button>' +
      '<button class="vps-win-cmd text" data-file-unzip="1"' + (!selectedIsZip || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Extract ZIP', 'Extract ZIP')) + '</button>' +
      '<button class="vps-win-cmd text danger" data-file-delete="1"' + (!hasSelection || readOnly || busy ? ' disabled' : '') + '>' + _esc(_t('Delete', 'Delete')) + '</button>' +
      '<input class="vps-win-upload-input" type="file" multiple data-file-upload-input>' +
      '<span class="vps-win-mode">' + _esc(busy ? _t('Working...', 'Working...') : (searching ? _t('Search results', 'Search results') : (readOnly ? _t('Read-only', 'Read-only') : _t('Writable', 'Writable')))) + '</span>' +
    '</div>' +
    '<div class="vps-win-address-row">' +
      '<div class="vps-win-address">' +
        _fileBreadcrumbs(path) +
        '<div class="vps-win-path-entry">' +
          '<span>' + _esc(_t('Path', 'Path')) + '</span>' +
          '<input type="text" data-file-path-input value="' + _esc(_filePathInputValue(path)) + '" placeholder="/">' +
          '<button class="vps-win-go" data-file-path-go="1">' + _esc(_t('Go', 'Go')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="vps-win-searchbox">' +
        '<input type="search" data-file-search-input value="' + _esc(state.fileQuery || '') + '" placeholder="' + _esc(_t('Search files', 'Search files')) + '">' +
        '<button data-file-search-submit="1">' + _esc(_t('Search', 'Search')) + '</button>' +
      '</div>' +
    '</div>';
}

function _fileTable(explorer){
  explorer = explorer || {};
  if(explorer.error){
    return '<div class="vps-win-empty danger">' + _esc(explorer.error) + '</div>';
  }
  var entries = Array.isArray(explorer.entries) ? explorer.entries : [];
  if(state.fileLoading && !entries.length){
    return '<div class="vps-win-empty">' + _esc(_t('Đang tải File Explorer...', 'Loading File Explorer...')) + '</div>';
  }
  if(!entries.length){
    return '<div class="vps-win-empty">' + _esc(_t('Không có file phù hợp trong phạm vi này.', 'No matching files in this scope.')) + '</div>';
  }
  var selectedPath = String(state.fileSelectedPath || '');
  return '<div class="vps-win-table-wrap"><table class="vps-win-table"><thead><tr>' +
    '<th>' + _esc(_t('Name', 'Name')) + '</th>' +
    '<th>' + _esc(_t('Date modified', 'Date modified')) + '</th>' +
    '<th>' + _esc(_t('Type', 'Type')) + '</th>' +
    '<th>' + _esc(_t('Size', 'Size')) + '</th>' +
  '</tr></thead><tbody>' + entries.map(function(item){
    var isDir = item.type === 'directory';
    var isFile = item.type === 'file' || item.type === 'symlink';
    var path = item.relative_path || '';
    var nameButton = isDir
      ? '<button class="vps-win-name dir" data-file-select="' + _esc(path) + '" data-file-type="directory" data-file-name="' + _esc(item.name || path || '/') + '">' + _fileIcon(item) + '<span><strong>' + _esc(item.name || path || '/') + '</strong>' + (path ? '<small>' + _esc(_fileDisplayPath(path)) + '</small>' : '') + '</span></button>'
      : '<button class="vps-win-name" data-file-select="' + _esc(path) + '" data-file-type="' + _esc(item.type || 'file') + '" data-file-name="' + _esc(item.name || path || '/') + '">' + _fileIcon(item) + '<span><strong>' + _esc(item.name || path || '/') + '</strong>' + (item.denied ? '<small>' + _esc(_t('Guarded by policy', 'Guarded by policy')) + '</small>' : (path ? '<small>' + _esc(_fileDisplayPath(path)) + '</small>' : '')) + '</span></button>';
    return '<tr draggable="true" data-file-row-path="' + _esc(path) + '" data-file-row-type="' + _esc(item.type || '') + '" data-file-row-name="' + _esc(item.name || path || '/') + '"' + (isDir ? ' data-file-drop-target="' + _esc(path) + '"' : '') + (selectedPath && selectedPath === String(path) ? ' class="selected"' : '') + '>' +
      '<td>' + nameButton + '</td>' +
      '<td>' + _esc(_fmtTime(item.modified_at)) + '</td>' +
      '<td>' + _esc(_fileTypeLabel(item)) + (isDir && item.child_count != null ? '<small>' + _esc(_fmtInt(item.child_count) + ' items') + '</small>' : '') + '</td>' +
      '<td>' + _esc(isFile ? _fmtBytes(item.size_bytes || 0) : '') + '</td>' +
    '</tr>';
  }).join('') + '</tbody></table></div>';
}

function _fileDetailsPane(){
  var preview = state.filePreview || null;
  var root = _selectedFileRoot(state.host);
  if(!preview && state.fileSelectedPath && state.fileSelectedType === 'directory'){
    return '' +
      '<div class="vps-win-details-head">' +
        _fileIcon({type:'directory'}, true) +
        '<strong>' + _esc(state.fileSelectedName || _fileBaseName(state.fileSelectedPath)) + '</strong>' +
        '<span>' + _esc(_fileDisplayPath(state.fileSelectedPath)) + '</span>' +
      '</div>' +
      '<div class="vps-win-detail-actions">' +
        '<button class="vps-win-btn" data-file-open="' + _esc(state.fileSelectedPath) + '">' + _esc(_t('Open', 'Open')) + '</button>' +
      '</div>' +
      '<div class="vps-win-detail-list">' +
        '<div><span>' + _esc(_t('Type', 'Type')) + '</span><strong>' + _esc(_t('File folder', 'File folder')) + '</strong></div>' +
        '<div><span>' + _esc(_t('Path', 'Path')) + '</span><strong>' + _esc(_fileDisplayPath(state.fileSelectedPath)) + '</strong></div>' +
      '</div>';
  }
  if(!preview && state.fileSelectedPath){
    return '' +
      '<div class="vps-win-details-head">' +
        _fileIcon({type:state.fileSelectedType || 'file'}, true) +
        '<strong>' + _esc(state.fileSelectedName || _fileBaseName(state.fileSelectedPath)) + '</strong>' +
        '<span>' + _esc(_fileDisplayPath(state.fileSelectedPath)) + '</span>' +
      '</div>' +
      '<div class="vps-win-detail-actions">' +
        '<button class="vps-win-btn primary" data-file-read="' + _esc(state.fileSelectedPath) + '">' + _esc(_t('Open', 'Open')) + '</button>' +
        '<a class="vps-win-btn" href="' + _esc(_fileDownloadHref(state.fileSelectedPath)) + '">' + _esc(_t('Download', 'Download')) + '</a>' +
      '</div>' +
      '<div class="vps-win-detail-list">' +
        '<div><span>' + _esc(_t('Type', 'Type')) + '</span><strong>' + _esc(_fileTypeLabel({type:state.fileSelectedType || 'file'})) + '</strong></div>' +
        '<div><span>' + _esc(_t('Path', 'Path')) + '</span><strong>' + _esc(_fileDisplayPath(state.fileSelectedPath)) + '</strong></div>' +
      '</div>';
  }
  if(!preview){
    return '' +
      '<div class="vps-win-details-head">' +
        _fileIcon({type:'directory'}, true) +
        '<strong>' + _esc(_fileRootName(root)) + '</strong>' +
        '<span>' + _esc(root && root.path ? root.path : _t('Chọn file để xem thông tin.', 'Select a file to view details.')) + '</span>' +
      '</div>' +
      '<div class="vps-win-detail-list">' +
        '<div><span>' + _esc(_t('Mode', 'Mode')) + '</span><strong>' + _esc(_t('Read-only', 'Read-only')) + '</strong></div>' +
        '<div><span>' + _esc(_t('Root', 'Root')) + '</span><strong>' + _esc(root && root.path ? root.path : '—') + '</strong></div>' +
      '</div>' +
      '<div class="vps-win-note">' + _esc(_t('Chọn file text để xem nhanh. File nhạy cảm chỉ hiện metadata và bị chặn preview/download.', 'Select a text file for preview. Sensitive files expose metadata only and block preview/download.')) + '</div>';
  }
  if(preview.error){
    return '<div class="vps-win-empty danger">' + _esc(preview.error) + '</div>';
  }
  var file = preview.file || {};
  var content = String(preview.content || '');
  var filePath = file.relative_path || preview.path || '';
  var canEditText = !file.denied && !_fileIsReadOnly() && preview.encoding === 'utf-8' && typeof preview.content === 'string';
  return '' +
    '<div class="vps-win-details-head">' +
      _fileIcon(file, true) +
      '<strong>' + _esc(_fileBaseName(filePath)) + '</strong>' +
      '<span>' + _esc(_fileDisplayPath(filePath)) + '</span>' +
    '</div>' +
    '<div class="vps-win-detail-actions">' +
      (file.downloadable ? '<a class="vps-win-btn primary" href="' + _esc(_fileDownloadHref(filePath)) + '">' + _esc(_t('Download', 'Download')) + '</a>' : '') +
      (canEditText && !state.fileEditing ? '<button class="vps-win-btn" data-file-edit="1">' + _esc(_t('Edit text', 'Edit text')) + '</button>' : '') +
      (canEditText && state.fileEditing ? '<button class="vps-win-btn primary" data-file-edit-save="1">' + _esc(_t('Save', 'Save')) + '</button><button class="vps-win-btn" data-file-edit-cancel="1">' + _esc(_t('Cancel', 'Cancel')) + '</button>' : '') +
    '</div>' +
    '<div class="vps-win-detail-list">' +
      '<div><span>' + _esc(_t('Type', 'Type')) + '</span><strong>' + _esc(_fileTypeLabel(file)) + '</strong></div>' +
      '<div><span>' + _esc(_t('Size', 'Size')) + '</span><strong>' + _esc(_fmtBytes(file.size_bytes || 0)) + '</strong></div>' +
      '<div><span>' + _esc(_t('Date modified', 'Date modified')) + '</span><strong>' + _esc(_fmtTime(file.modified_at)) + '</strong></div>' +
      '<div><span>MIME</span><strong>' + _esc(file.mime || '—') + '</strong></div>' +
      '<div><span>' + _esc(_t('Mode', 'Mode')) + '</span><strong>' + _esc(file.mode || '—') + '</strong></div>' +
    '</div>' +
    (state.fileEditing
      ? '<textarea class="vps-win-editor" data-file-editor spellcheck="false">' + _esc(state.fileEditContent) + '</textarea>'
      : content
      ? '<div class="vps-win-preview"><pre>' + _esc(content) + '</pre></div>'
      : '<div class="vps-win-note warn">' + _esc(file.denied ? _t('File này khớp guardrail bảo mật nên không được preview.', 'This file matches a security guardrail and cannot be previewed.') : _t('File này không phải text hoặc vượt giới hạn preview.', 'This file is not text or exceeds the preview limit.')) + '</div>');
}

function _fileContextMenu(){
  var menu = state.fileContextMenu || null;
  if(!menu) return '';
  var path = String(menu.path || '');
  var targetPath = String(menu.targetPath || state.filePath || '');
  var isItem = menu.scope === 'item' && !!path;
  var isDir = isItem && menu.type === 'directory';
  var isFile = isItem && !isDir;
  var isZip = isFile && _fileIsZip(path);
  var readOnly = _fileIsReadOnly();
  var busy = !!state.fileOperationBusy;
  var canWrite = !readOnly && !busy;
  var hasClipboard = !!(state.fileClipboard && state.fileClipboard.path);
  var style = 'left:' + _esc(menu.x || 0) + 'px;top:' + _esc(menu.y || 0) + 'px;';
  return '' +
    '<div class="vps-win-context-menu" style="' + style + '" data-file-context-menu>' +
      '<div class="vps-win-context-title">' +
        '<strong>' + _esc(isItem ? (menu.name || _fileBaseName(path)) : _t('Current folder', 'Current folder')) + '</strong>' +
        '<span>' + _esc(isItem ? _fileDisplayPath(path) : _fileDisplayPath(targetPath)) + '</span>' +
      '</div>' +
      (isItem ? '<button data-file-context-action="open">' + _esc(isDir ? _t('Open', 'Open') : _t('Open preview', 'Open preview')) + '</button>' : '') +
      (isFile ? '<button data-file-context-action="edit"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Edit text', 'Edit text')) + '</button>' : '') +
      (isFile ? '<a href="' + _esc(_fileDownloadHref(path)) + '">' + _esc(_t('Download', 'Download')) + '</a>' : '') +
      (isItem ? '<div class="vps-win-context-sep"></div>' : '') +
      (isItem ? '<button data-file-context-action="copy"' + (busy ? ' disabled' : '') + '>' + _esc(_t('Copy', 'Copy')) + '</button>' : '') +
      (isItem ? '<button data-file-context-action="cut"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Cut', 'Cut')) + '</button>' : '') +
      '<button data-file-context-action="paste"' + (!canWrite || !hasClipboard ? ' disabled' : '') + '>' + _esc(_t('Paste', 'Paste')) + (hasClipboard ? ' <span>' + _esc(state.fileClipboard.mode === 'cut' ? _t('Move here', 'Move here') : _t('Copy here', 'Copy here')) + '</span>' : '') + '</button>' +
      (isItem ? '<button data-file-context-action="zip"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Compress to ZIP', 'Compress to ZIP')) + '</button>' : '') +
      (isZip ? '<button data-file-context-action="unzip"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Extract ZIP', 'Extract ZIP')) + '</button>' : '') +
      '<div class="vps-win-context-sep"></div>' +
      '<button data-file-context-action="upload"' + (!canWrite ? ' disabled' : '') + '>' + _esc(isDir ? _t('Upload here', 'Upload here') : _t('Upload', 'Upload')) + '</button>' +
      '<button data-file-context-action="new-folder"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('New folder', 'New folder')) + '</button>' +
      (isItem ? '<button data-file-context-action="rename"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Rename', 'Rename')) + '</button>' : '') +
      (isItem ? '<button class="danger" data-file-context-action="delete"' + (!canWrite ? ' disabled' : '') + '>' + _esc(_t('Delete', 'Delete')) + '</button>' : '') +
      '<div class="vps-win-context-sep"></div>' +
      '<button data-file-context-action="refresh">' + _esc(_t('Refresh', 'Refresh')) + '</button>' +
      '<button data-file-context-action="hidden">' + _esc(state.fileShowHidden ? _t('Hide dotfiles', 'Hide dotfiles') : _t('Show dotfiles', 'Show dotfiles')) + '</button>' +
    '</div>';
}

function _filesTab(host){
  if(!host){
    return '<section class="vps-win-explorer"><div class="vps-win-titlebar"><div class="vps-win-title-left"><span class="vps-win-appicon"></span><strong>File Explorer</strong></div></div><div class="vps-win-empty">' + _esc(_t('Chưa có host live để hiển thị File Explorer.', 'No live host is available to display File Explorer.')) + '</div></section>';
  }
  _syncFileRootSelection(host);
  var explorer = state.fileExplorer || null;
  var summary = explorer && explorer.summary ? explorer.summary : {};
  var root = _selectedFileRoot(host);
  var entriesCount = summary.count != null ? Number(summary.count || 0) : (explorer && Array.isArray(explorer.entries) ? explorer.entries.length : 0);
  var selectedName = state.fileSelectedName || (state.filePreview && state.filePreview.file ? _fileBaseName(state.filePreview.file.relative_path || state.filePreview.path || '') : '');
  return '' +
    '<section class="vps-win-explorer" aria-label="File Explorer">' +
      '<div class="vps-win-titlebar">' +
        '<div class="vps-win-title-left"><span class="vps-win-appicon"></span><strong>File Explorer</strong><span>' + _esc(root ? _fileRootName(root) : _t('No root', 'No root')) + '</span></div>' +
        '<div class="vps-win-window-controls" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '</div>' +
      _fileToolbar(explorer || {path: state.filePath || ''}) +
      '<div class="vps-win-body">' +
        _fileNavigationPane(host) +
        '<main class="vps-win-main" data-file-current-path="' + _esc(state.filePath || '') + '" data-file-current-query="' + _esc(state.fileQuery || '') + '">' + _fileTable(explorer || {entries: []}) + '</main>' +
        '<aside class="vps-win-details" aria-label="Details pane">' + _fileDetailsPane() + '</aside>' +
      '</div>' +
      _fileContextMenu() +
      '<div class="vps-win-statusbar">' +
        '<span>' + _esc(_fmtInt(entriesCount) + ' items') + '</span>' +
        '<span>' + _esc(selectedName ? (_t('Selected', 'Selected') + ': ' + selectedName) : _t('No item selected', 'No item selected')) + '</span>' +
        '<span>' + _esc(root && root.path ? ((root.read_only ? _t('Read-only', 'Read-only') : _t('Writable', 'Writable')) + ' • ' + root.path) : '') + '</span>' +
      '</div>' +
    '</section>';
}

function _terminalTab(host, overview){
  if(!host){
    return _empty(_t('Chưa có host live để hiển thị terminal.', 'No live host is available to display terminals.'));
  }
  var selected = _selectedTerminal(host);
  var canEmbed = !!(selected && selected.url && selected.embed !== false);
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>Terminal</h3><p>' + _esc(_t('Mỗi terminal phải có cả service state và HTTP probe thật.', 'Each terminal must have both a service state and a real HTTP probe.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          _endpointTiles(host.terminals || [], 'terminal') +
          (selected ? '<div style="height:16px"></div>' + _selectedEndpointDetail(selected, _t('Gateway', 'Gateway')) : '') +
          (selected && selected.url ? '<div class="vps-inline-actions">' +
            '<a class="vps-link-btn primary" href="' + _esc(selected.url) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở terminal', 'Open terminal')) + '</a>' +
          '</div>' : '') +
          '<div style="height:16px"></div>' +
          (canEmbed
            ? '<iframe class="vps-terminal-frame" src="' + _esc(selected.url) + '" title="' + _esc(selected.label || selected.id || 'terminal') + '" loading="lazy" referrerpolicy="same-origin"></iframe>'
            : '<div class="vps-note warn">' + _esc(_t('Terminal này chưa có URL nhúng hợp lệ.', 'This terminal does not have a valid embeddable URL yet.')) + '</div>') +
        '</div>' +
      '</section>' +
      _quickLinks(overview) +
    '</div>';
}

function _observabilityTab(host, overview){
  if(!host){
    return _empty(_t('Chưa có host live để hiển thị observability.', 'No live host is available to display observability.'));
  }
  var selected = _selectedObservability(host);
  var canEmbed = !!(selected && selected.url && selected.embed !== false);
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>Observability</h3><p>' + _esc(_t('Panel nào dùng được phải trả probe OK và nhúng được trong portal.', 'A usable panel must return a successful probe and be embeddable inside the portal.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          _endpointTiles(host.observability || [], 'observability') +
          (selected ? '<div style="height:16px"></div>' + _selectedEndpointDetail(selected, _t('Panel', 'Panel')) : '') +
          (selected && selected.url ? '<div class="vps-inline-actions">' +
            '<a class="vps-link-btn primary" href="' + _esc(selected.url) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở panel', 'Open panel')) + '</a>' +
          '</div>' : '') +
          '<div style="height:16px"></div>' +
          (canEmbed
            ? '<iframe class="vps-terminal-frame" src="' + _esc(selected.url) + '" title="' + _esc(selected.label || selected.id || 'observability') + '" loading="lazy" referrerpolicy="same-origin"></iframe>'
            : '<div class="vps-note warn">' + _esc(_t('Panel này chưa có URL nhúng hợp lệ.', 'This panel does not have a valid embeddable URL yet.')) + '</div>') +
        '</div>' +
      '</section>' +
      _quickLinks(overview) +
    '</div>';
}

function _actionsTab(host, overview){
  if(!host){
    return _empty(_t('Chưa có host live để chạy action.', 'No live host is available for actions.'));
  }
  var actions = Array.isArray(host.allowed_actions) ? host.allowed_actions : [];
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h3>' + _esc(_t('Safe action runner', 'Safe action runner')) + '</h3><p>' + _esc(_t('Chỉ cho phép action whitelist. Không có shell tùy ý trong PHP.', 'Only whitelisted actions are allowed. No arbitrary shell is exposed in PHP.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          '<div class="vps-actions">' +
            (actions.length ? actions.map(function(action){
              var active = state.actionBusy && state.actionBusy === action.id;
              return '<button class="vps-action-btn' + (action.emphasis ? ' primary' : '') + '" data-action="' + _esc(action.id) + '"' + (active ? ' disabled' : '') + '>' + _esc(active ? _t('Đang chạy...', 'Running...') : action.label || action.id) + '</button>';
            }).join('') : '<div class="vps-note warn">' + _esc(_t('Host này chưa khai báo safe action.', 'No safe actions are declared for this host.')) + '</div>') +
          '</div>' +
          '<div style="height:16px"></div>' +
          _console(state.actionResult) +
        '</div>' +
      '</section>' +
      _quickLinks(overview) +
    '</div>';
}

function _body(){
  var overview = state.overview || {};
  if(overview.error){
    return _empty(overview.error);
  }
  var hosts = Array.isArray(overview.hosts) ? overview.hosts : [];
  var body = _header(overview, state.host || {}) + _summaryCards(overview.metrics || {});
  body += _tabs();
  body += _hostPicker(hosts);
  body += '<div style="height:16px"></div>';
  if(state.tab === 'files') return body + _filesTab(state.host);
  if(state.tab === 'overview') body += _overviewTab(state.host);
  if(state.tab === 'services') body += _servicesTab(state.host);
  if(state.tab === 'network') body += _networkTab(state.host);
  if(state.tab === 'terminal') body += _terminalTab(state.host, overview);
  if(state.tab === 'observability') body += _observabilityTab(state.host, overview);
  if(state.tab === 'actions') body += _actionsTab(state.host, overview);
  return body;
}

function _paint(){
  if(!state.container) return;
  if(state.loading && !state.overview){
    state.container.innerHTML = '<div class="vps-ct"><div class="vps-panel"><div class="vps-panel-body"><div class="vps-empty">' + _esc(_t('Đang tải trạng thái VPS live...', 'Loading the live VPS state...')) + '</div></div></div></div>';
    return;
  }
  var fileScroll = null;
  if(state.tab === 'files'){
    var currentMain = state.container.querySelector('.vps-win-main');
    if(currentMain){
      var samePath = String(currentMain.getAttribute('data-file-current-path') || '') === String(state.filePath || '');
      var sameQuery = String(currentMain.getAttribute('data-file-current-query') || '') === String(state.fileQuery || '');
      if(samePath && sameQuery){
        fileScroll = {
          top: currentMain.scrollTop || 0,
          left: currentMain.scrollLeft || 0
        };
      }
    }
  }
  state.container.innerHTML = '<div class="vps-ct">' + _body() + '</div>';
  _bind();
  if(fileScroll){
    var nextMain = state.container.querySelector('.vps-win-main');
    if(nextMain){
      nextMain.scrollTop = fileScroll.top;
      nextMain.scrollLeft = fileScroll.left;
    }
  }
}

function _fitFileContextMenu(){
  if(!state.container) return;
  var menu = state.container.querySelector('[data-file-context-menu]');
  if(!menu) return;
  var viewport = window.visualViewport || null;
  var vw = viewport ? viewport.width : window.innerWidth;
  var vh = viewport ? viewport.height : window.innerHeight;
  var ox = viewport ? viewport.offsetLeft : 0;
  var oy = viewport ? viewport.offsetTop : 0;
  var margin = 8;
  var left = parseFloat(menu.style.left || '0') || 0;
  var top = parseFloat(menu.style.top || '0') || 0;
  var rect = menu.getBoundingClientRect();
  var rightLimit = ox + vw - margin;
  var bottomLimit = oy + vh - margin;
  if(rect.right > rightLimit) left -= rect.right - rightLimit;
  if(rect.bottom > bottomLimit) top -= rect.bottom - bottomLimit;
  left = Math.max(ox + margin, Math.min(left, rightLimit - Math.min(rect.width, vw - margin * 2)));
  top = Math.max(oy + margin, Math.min(top, bottomLimit - Math.min(rect.height, vh - margin * 2)));
  menu.style.left = Math.round(left) + 'px';
  menu.style.top = Math.round(top) + 'px';
}

function _bind(){
  if(!state.container) return;
  state.container.querySelectorAll('[data-vps-tab]').forEach(function(btn){
    btn.onclick = function(){ _setTab(btn.getAttribute('data-vps-tab')); };
  });
  state.container.querySelectorAll('[data-host-id]').forEach(function(btn){
    btn.onclick = function(){ _setHost(btn.getAttribute('data-host-id')); };
  });
  state.container.querySelectorAll('[data-action]').forEach(function(btn){
    btn.onclick = function(){ _runAction(btn.getAttribute('data-action')); };
  });
  state.container.querySelectorAll('[data-terminal-id]').forEach(function(btn){
    btn.onclick = function(){ _setTerminal(btn.getAttribute('data-terminal-id')); };
  });
  state.container.querySelectorAll('[data-observability-id]').forEach(function(btn){
    btn.onclick = function(){ _setObservability(btn.getAttribute('data-observability-id')); };
  });
  state.container.querySelectorAll('[data-file-root]').forEach(function(btn){
    btn.onclick = function(){ _setFileRoot(btn.getAttribute('data-file-root')); };
  });
  state.container.querySelectorAll('[data-file-open]').forEach(function(btn){
    btn.onclick = function(){ _loadFiles(btn.getAttribute('data-file-open') || '', true); };
  });
  state.container.querySelectorAll('[data-file-select]').forEach(function(btn){
    btn.onclick = function(event){
      event.preventDefault();
      _selectFile(btn.getAttribute('data-file-select') || '', btn.getAttribute('data-file-type') || 'file', btn.getAttribute('data-file-name') || '', true);
    };
    btn.ondblclick = function(event){
      event.preventDefault();
      var path = btn.getAttribute('data-file-select') || '';
      var type = btn.getAttribute('data-file-type') || 'file';
      if(type === 'directory') _loadFiles(path, true);
      else _readFile(path);
    };
  });
  state.container.querySelectorAll('[data-file-parent]').forEach(function(btn){
    btn.onclick = function(){ _loadFiles(btn.getAttribute('data-file-parent') || '', true); };
  });
  state.container.querySelectorAll('[data-file-history]').forEach(function(btn){
    btn.onclick = function(){ _goFileHistory(Number(btn.getAttribute('data-file-history') || 0)); };
  });
  state.container.querySelectorAll('[data-file-refresh]').forEach(function(btn){
    btn.onclick = function(){
      if(state.fileQuery) _searchFiles(state.fileQuery);
      else _loadFiles(state.filePath || '', false, true);
    };
  });
  state.container.querySelectorAll('[data-file-read]').forEach(function(btn){
    btn.onclick = function(){ _readFile(btn.getAttribute('data-file-read') || ''); };
  });
  state.container.querySelectorAll('[data-file-hidden]').forEach(function(btn){
    btn.onclick = function(){
      state.fileShowHidden = !state.fileShowHidden;
      if(state.fileQuery) _searchFiles(state.fileQuery);
      else _loadFiles(state.filePath || '', false, true);
    };
  });
  state.container.querySelectorAll('[data-file-path-go]').forEach(function(btn){
    btn.onclick = function(){
      var input = state.container.querySelector('[data-file-path-input]');
      var value = input ? String(input.value || '').trim().replace(/^\/+/, '') : '';
      _loadFiles(value, true);
    };
  });
  state.container.querySelectorAll('[data-file-path-input]').forEach(function(input){
    input.onkeydown = function(event){
      if(event.key === 'Enter'){
        event.preventDefault();
        _loadFiles(String(input.value || '').trim().replace(/^\/+/, ''), true);
      }
    };
  });
  state.container.querySelectorAll('[data-file-search-submit]').forEach(function(btn){
    btn.onclick = function(){
      var input = state.container.querySelector('[data-file-search-input]');
      _searchFiles(input ? input.value : '');
    };
  });
  state.container.querySelectorAll('[data-file-search-input]').forEach(function(input){
    input.onkeydown = function(event){
      if(event.key === 'Enter'){
        event.preventDefault();
        _searchFiles(input.value);
      }
    };
  });
  state.container.querySelectorAll('[data-file-clear-search]').forEach(function(btn){
    btn.onclick = function(){
      state.fileQuery = '';
      _loadFiles(state.filePath || '', false, true);
    };
  });
  state.container.querySelectorAll('[data-file-upload-trigger]').forEach(function(btn){
    btn.onclick = function(){
      _triggerFileUpload(state.filePath || '');
    };
  });
  state.container.querySelectorAll('[data-file-upload-input]').forEach(function(input){
    input.onchange = function(){
      _uploadFiles(input.files, state.fileUploadTarget || state.filePath || '');
      state.fileUploadTarget = '';
      input.value = '';
    };
  });
  state.container.querySelectorAll('[data-file-new-folder]').forEach(function(btn){
    btn.onclick = function(){
      _newFolder(state.filePath || '');
    };
  });
  state.container.querySelectorAll('[data-file-rename]').forEach(function(btn){
    btn.onclick = function(){
      _renameSelected();
    };
  });
  state.container.querySelectorAll('[data-file-copy]').forEach(function(btn){
    btn.onclick = function(){
      _copySelected('copy');
    };
  });
  state.container.querySelectorAll('[data-file-cut]').forEach(function(btn){
    btn.onclick = function(){
      _copySelected('cut');
    };
  });
  state.container.querySelectorAll('[data-file-paste]').forEach(function(btn){
    btn.onclick = function(){
      _pasteFile(state.filePath || '');
    };
  });
  state.container.querySelectorAll('[data-file-zip]').forEach(function(btn){
    btn.onclick = function(){
      _zipSelected();
    };
  });
  state.container.querySelectorAll('[data-file-unzip]').forEach(function(btn){
    btn.onclick = function(){
      _unzipSelected();
    };
  });
  state.container.querySelectorAll('[data-file-delete]').forEach(function(btn){
    btn.onclick = function(){
      _deleteSelected();
    };
  });
  state.container.querySelectorAll('[data-file-edit]').forEach(function(btn){
    btn.onclick = function(){ _editSelectedText(); };
  });
  state.container.querySelectorAll('[data-file-edit-save]').forEach(function(btn){
    btn.onclick = function(){ _saveTextEdit(); };
  });
  state.container.querySelectorAll('[data-file-edit-cancel]').forEach(function(btn){
    btn.onclick = function(){ _cancelTextEdit(); };
  });
  state.container.querySelectorAll('[data-file-context-action]').forEach(function(btn){
    btn.onclick = function(event){
      event.preventDefault();
      event.stopPropagation();
      var action = btn.getAttribute('data-file-context-action') || '';
      var targetPath = state.fileContextMenu ? String(state.fileContextMenu.targetPath || state.filePath || '') : String(state.filePath || '');
      if(action === 'open') _openSelected();
      if(action === 'edit') _editSelectedText();
      if(action === 'copy') _copySelected('copy');
      if(action === 'cut') _copySelected('cut');
      if(action === 'paste') _pasteFile(targetPath);
      if(action === 'zip') _zipSelected();
      if(action === 'unzip') _unzipSelected();
      if(action === 'upload') _triggerFileUpload(targetPath);
      if(action === 'new-folder') _newFolder(targetPath);
      if(action === 'rename') _renameSelected();
      if(action === 'delete') _deleteSelected();
      if(action === 'refresh'){
        _closeFileContextMenu(false);
        if(state.fileQuery) _searchFiles(state.fileQuery);
        else _loadFiles(state.filePath || '', false, true);
      }
      if(action === 'hidden'){
        _closeFileContextMenu(false);
        state.fileShowHidden = !state.fileShowHidden;
        if(state.fileQuery) _searchFiles(state.fileQuery);
        else _loadFiles(state.filePath || '', false, true);
      }
    };
  });
  state.container.querySelectorAll('[data-file-context-menu]').forEach(function(menu){
    menu.onclick = function(event){ event.stopPropagation(); };
    menu.oncontextmenu = function(event){ event.preventDefault(); event.stopPropagation(); };
  });
  state.container.querySelectorAll('[data-file-row-path]').forEach(function(row){
    row.onclick = function(event){
      if(event.target && event.target.closest && event.target.closest('button,a,input,textarea')) return;
      _selectFile(
        row.getAttribute('data-file-row-path') || '',
        row.getAttribute('data-file-row-type') || 'file',
        row.getAttribute('data-file-row-name') || '',
        false
      );
    };
    row.ondblclick = function(event){
      if(event.target && event.target.closest && event.target.closest('button,a,input,textarea')) return;
      event.preventDefault();
      var path = row.getAttribute('data-file-row-path') || '';
      var type = row.getAttribute('data-file-row-type') || 'file';
      if(type === 'directory') _loadFiles(path, true);
      else _readFile(path);
    };
    row.oncontextmenu = function(event){
      _openFileContextMenu(event, {
        path: row.getAttribute('data-file-row-path') || '',
        type: row.getAttribute('data-file-row-type') || 'file',
        name: row.getAttribute('data-file-row-name') || ''
      });
    };
    row.ondragstart = function(event){
      var path = row.getAttribute('data-file-row-path') || '';
      if(!path || !event.dataTransfer) return;
      event.dataTransfer.effectAllowed = 'copyMove';
      event.dataTransfer.setData('text/plain', path);
      event.dataTransfer.setData('application/x-vps-file-path', path);
    };
  });
  state.container.querySelectorAll('[data-file-drop-target]').forEach(function(row){
    row.ondragover = function(event){
      event.preventDefault();
      event.stopPropagation();
      if(event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      row.classList.add('drop-target');
    };
    row.ondragleave = function(){ row.classList.remove('drop-target'); };
    row.ondrop = function(event){
      event.preventDefault();
      event.stopPropagation();
      row.classList.remove('drop-target');
      if(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length){
        _uploadFiles(event.dataTransfer.files, row.getAttribute('data-file-drop-target') || state.filePath || '');
        return;
      }
      var source = event.dataTransfer ? (event.dataTransfer.getData('application/x-vps-file-path') || event.dataTransfer.getData('text/plain')) : '';
      var target = row.getAttribute('data-file-drop-target') || '';
      if(source && target && source !== target && _fileParentPath(source) !== target) _mutateFile('move', {path: source, target_path: target});
    };
  });
  var dropZone = state.container.querySelector('.vps-win-main');
  if(dropZone){
    dropZone.oncontextmenu = function(event){
      if(event.target && event.target.closest && event.target.closest('[data-file-row-path]')) return;
      _openFileContextMenu(event, {path: '', type: '', name: _t('Current folder', 'Current folder')});
    };
    dropZone.ondragover = function(event){
      event.preventDefault();
      if(event.dataTransfer) event.dataTransfer.dropEffect = event.dataTransfer.files && event.dataTransfer.files.length ? 'copy' : 'move';
      dropZone.classList.add('drag-over');
    };
    dropZone.ondragleave = function(event){
      if(event.currentTarget === dropZone) dropZone.classList.remove('drag-over');
    };
    dropZone.ondrop = function(event){
      event.preventDefault();
      dropZone.classList.remove('drag-over');
      if(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length){
        _uploadFiles(event.dataTransfer.files, state.filePath || '');
        return;
      }
      var source = event.dataTransfer ? (event.dataTransfer.getData('application/x-vps-file-path') || event.dataTransfer.getData('text/plain')) : '';
      if(source && _fileParentPath(source) !== String(state.filePath || '')) _mutateFile('move', {path: source, target_path: state.filePath || ''});
    };
  }
  state.container.onclick = function(event){
    if(!state.fileContextMenu) return;
    if(event.target && event.target.closest && event.target.closest('[data-file-context-menu]')) return;
    _closeFileContextMenu(true);
  };
  state.container.onkeydown = function(event){
    if(event.key === 'Escape' && state.fileContextMenu){
      event.preventDefault();
      _closeFileContextMenu(true);
    }
  };
  if(state.fileContextMenu && typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'){
    window.requestAnimationFrame(_fitFileContextMenu);
  }else{
    _fitFileContextMenu();
  }
  state.container.querySelectorAll('[data-refresh-live]').forEach(function(btn){
    btn.onclick = function(){ _refresh(); };
  });
}

window._renderVpsControlTower = _render;
})();

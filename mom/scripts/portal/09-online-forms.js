/* ==========================================================================
   09-online-forms.js - Evidence Control orchestrator
   ========================================================================== */

(function(){
'use strict';

var FORM_COLORS = {
  production:  { bg:'var(--amber-bg,#fef3c7)', icon:'PR' },
  quality:     { bg:'var(--green-bg,#dcfce7)', icon:'QA' },
  maintenance: { bg:'var(--amber-bg,#fff9db)', icon:'MT' },
  hr:          { bg:'var(--purple-bg,#f3e8ff)', icon:'HR' },
  logistics:   { bg:'var(--amber-bg,#fff4e6)', icon:'LG' },
  safety:      { bg:'var(--red-bg,#fee2e2)', icon:'HS' },
  other:       { bg:'var(--bg-surface-alt,#f1f5f9)', icon:'EC' }
};

function _registryOptions(setKey){
  if(!window.HmRegistry || typeof HmRegistry.selectOptions !== 'function') return [];
  return HmRegistry.selectOptions({ optionSet:setKey }).map(function(opt){
    return { value:opt.value, label:opt.label, labelEn:opt.labelEn || opt.label };
  });
}

var DEPARTMENTS = _registryOptions('department_code');

var state = {
  forms: [],
  formMap: {},
  recordTypes: {},
  formToRecordType: {},
  allocations: [],
  selectedFormCode: '',
  selectedAllocationId: '',
  filter: 'all',
  search: '',
  searchTimer: null,
  workspaceMode: 'mine',
  workspaceLoading: false,
  ready: false,
  activeTab: 'mine',
  pendingFillSelection: null,
  pendingUploadSelection: null,
  pendingContext: null,
  _eqmsOpenCode: '',
  _eqmsOpenOptions: null,
  _eqmsBuilderFormCode: '',
  _eqmsBuilderOptions: null,
  runtimeGuard: {
    dirty: false,
    formCode: '',
    recordId: '',
    allocationId: '',
    lastSavedAt: '',
    lastDirtyAt: '',
    summary: ''
  },
  workQueue: {
    pending: [],
    exceptions: [],
    loading: false,
    loaded: false,
    partial: false,
    error: '',
    department: '',
    formCode: '',
    exceptionType: '',
    dateFrom: '',
    dateTo: '',
    days: 30,
    lastLoaded: '',
    promise: null,
    pollTimer: null,
    quarantine: {}
  },
  registry: {
    rows: [],
    summary: { issued_count:0, draft_count:0, submitted_count:0, resubmitted_count:0, completed_count:0 },
    loading: false,
    loaded: false,
    error: '',
    page: 1,
    pages: 1,
    total: 0,
    formCode: '',
    deliveryMode: '',
    state: '',
    search: '',
    mineOnly: true,
    promise: null
  },
  evidence: {
    mode: 'browse',
    items: [], loading: false, loaded: false, error: '',
    filters: { type: '', dateFrom: '', dateTo: '', linkedTo: '' },
    detail: null, detailLoading: false, detailError: '',
    searchQuery: '', searchResults: [], searchLoading: false,
    integrityRunning: false, integrityResult: null, integrityProgress: 0,
    uploadProgress: 0, uploadResult: null
  }
};

window._ecState = state;

/* Emergency fallback — populated dynamically from form_catalog_snapshot API.
   Add entries here ONLY if the API is permanently unavailable. */
var KNOWN_HTML_RUNTIME_FORMS = {};

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(value == null ? '' : value)));
  return div.innerHTML;
}

function resetRuntimeGuard(){
  state.runtimeGuard = {
    dirty: false,
    formCode: '',
    recordId: '',
    allocationId: '',
    lastSavedAt: '',
    lastDirtyAt: '',
    summary: ''
  };
}

function setRuntimeGuard(payload){
  payload = payload || {};
  state.runtimeGuard.dirty = !!payload.dirty;
  state.runtimeGuard.formCode = String(payload.form_code || payload.formCode || state.runtimeGuard.formCode || '').trim();
  state.runtimeGuard.recordId = String(payload.record_id || payload.recordId || state.runtimeGuard.recordId || '').trim();
  state.runtimeGuard.allocationId = String(payload.allocation_id || payload.allocationId || state.runtimeGuard.allocationId || '').trim();
  state.runtimeGuard.lastSavedAt = String(payload.last_saved_at || payload.lastSavedAt || state.runtimeGuard.lastSavedAt || '').trim();
  state.runtimeGuard.lastDirtyAt = String(payload.last_dirty_at || payload.lastDirtyAt || state.runtimeGuard.lastDirtyAt || '').trim();
  state.runtimeGuard.summary = String(payload.summary || state.runtimeGuard.summary || '').trim();
  if(!state.runtimeGuard.dirty){
    state.runtimeGuard.summary = '';
    state.runtimeGuard.lastDirtyAt = '';
  }
}

function hasRuntimeDirtySession(){
  return !!(state.runtimeGuard && state.runtimeGuard.dirty);
}

function runtimeFrame(){
  return document.getElementById('eqms-standalone-frame');
}

function runtimeGuardMessage(){
  var label = state.runtimeGuard.recordId || state.runtimeGuard.formCode || t('biểu mẫu hiện tại', 'the current form');
  return t(
    'Biểu mẫu ' + label + ' đang có dữ liệu dang dở. Trước khi mở liên kết khác, chuyển tab hoặc làm mới hệ thống/pull dữ liệu, hãy chọn cách xử lý để tránh treo phiên và mất ngữ cảnh.',
    'The form ' + label + ' has unfinished data. Before opening another link, switching tabs, or refreshing the system/pulling new data, choose how to handle the in-progress work.'
  );
}

function openRuntimeGuardDialog(){
  return new Promise(function(resolve){
    var existing = document.getElementById('ec-runtime-guard-backdrop');
    if(existing) existing.remove();
    var backdrop = document.createElement('div');
    backdrop.className = 'ec-dialog-backdrop';
    backdrop.id = 'ec-runtime-guard-backdrop';
    backdrop.innerHTML =
      '<div class="ec-dialog ec-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="ec-runtime-guard-title">' +
        '<div class="ec-dialog-head">' +
          '<h3 id="ec-runtime-guard-title">' + esc(t('Dữ liệu đang làm dở chưa được xử lý', 'Unfinished data needs a decision')) + '</h3>' +
          '<button type="button" class="ec-dialog-close" data-close-runtime-guard="1" aria-label="' + esc(t('Đóng', 'Close')) + '">x</button>' +
        '</div>' +
        '<p class="ec-dialog-copy">' + esc(runtimeGuardMessage()) + '</p>' +
        '<div class="ec-choice-stack">' +
          '<button type="button" class="ec-choice-btn save" data-runtime-choice="save">' +
            '<strong>' + esc(t('Lưu nháp rồi tiếp tục', 'Save draft and continue')) + '</strong>' +
            '<span>' + esc(t('Lưu trạng thái hiện tại thành bản nháp an toàn trước khi rời khỏi màn hình này.', 'Store the current state as a safe draft before leaving this screen.')) + '</span>' +
          '</button>' +
          '<button type="button" class="ec-choice-btn discard" data-runtime-choice="discard">' +
            '<strong>' + esc(t('Rời đi không lưu', 'Leave without saving')) + '</strong>' +
            '<span>' + esc(t('Bỏ phần dữ liệu dang dở của phiên hiện tại và tiếp tục sang nơi khác.', 'Drop the unfinished edits in this session and continue elsewhere.')) + '</span>' +
          '</button>' +
          '<button type="button" class="ec-choice-btn stay" data-runtime-choice="stay">' +
            '<strong>' + esc(t('Ở lại để xử lý tiếp', 'Stay on this form')) + '</strong>' +
            '<span>' + esc(t('Tiếp tục làm việc tại chỗ, không thay đổi màn hình và không làm mới hệ thống lúc này.', 'Keep working here without changing the screen or refreshing the system right now.')) + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);

    function cleanup(value){
      document.removeEventListener('keydown', onKeyDown, true);
      if(backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      resolve(value);
    }
    function onKeyDown(event){
      if(event.key === 'Escape'){
        event.preventDefault();
        cleanup('stay');
      }
    }
    backdrop.addEventListener('click', function(event){
      var choice = event.target.getAttribute('data-runtime-choice');
      if(choice){ cleanup(choice); return; }
      if(event.target === backdrop || event.target.getAttribute('data-close-runtime-guard') === '1') cleanup('stay');
    });
    document.addEventListener('keydown', onKeyDown, true);
  });
}

function sendRuntimeCommand(command){
  var frame = runtimeFrame();
  if(!frame || !frame.contentWindow){
    return Promise.resolve({ ok:false, error:'runtime_unavailable' });
  }
  var requestId = 'rt-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  window._ecRuntimePendingCommands = window._ecRuntimePendingCommands || {};
  return new Promise(function(resolve){
    var timer = window.setTimeout(function(){
      try{ delete window._ecRuntimePendingCommands[requestId]; }catch(_err){}
      resolve({ ok:false, error:'runtime_timeout', command:command });
    }, 12000);
    window._ecRuntimePendingCommands[requestId] = function(payload){
      window.clearTimeout(timer);
      try{ delete window._ecRuntimePendingCommands[requestId]; }catch(_err){}
      resolve(payload || { ok:false, error:'runtime_empty', command:command });
    };
    frame.contentWindow.postMessage({
      type: 'ec-form-runtime-command',
      command: command,
      request_id: requestId
    }, window.location.origin || '*');
  });
}

function runWithRuntimeGuard(action){
  if(!hasRuntimeDirtySession()){
    action();
    return true;
  }
  openRuntimeGuardDialog().then(function(choice){
    if(choice === 'stay' || !choice) return;
    if(choice === 'save'){
      sendRuntimeCommand('save-draft').then(function(resp){
        if(!(resp && resp.ok)){
          toast(t('Không thể lưu nháp an toàn từ runtime lúc này. Hãy ở lại màn hình hiện tại hoặc thử lưu lại thủ công.', 'Could not save the draft safely from the runtime. Stay on the current screen or save manually first.'), 'warn');
          return;
        }
        resetRuntimeGuard();
        action();
      });
      return;
    }
    sendRuntimeCommand('discard').finally(function(){
      resetRuntimeGuard();
      action();
    });
  });
  return false;
}

function normalizeRecordTypeRegistry(recordTypes){
  var normalized = {};
  if(Array.isArray(recordTypes)){
    recordTypes.forEach(function(item, index){
      if(!item || typeof item !== 'object') return;
      var code = String(item.code || item.record_type || item.id || index).trim().toUpperCase();
      if(!code) return;
      normalized[code] = Object.assign({}, item, { code: code });
    });
    return normalized;
  }
  Object.keys(recordTypes || {}).forEach(function(code){
    var key = String(code || '').trim().toUpperCase();
    var item = recordTypes[code];
    if(!key || !item || typeof item !== 'object') return;
    normalized[key] = Object.assign({}, item, { code: String(item.code || key).trim().toUpperCase() || key });
  });
  return normalized;
}

function buildFormToRecordTypeMap(forms, recordTypes){
  var map = {};
  Object.keys(recordTypes || {}).forEach(function(code){
    var row = recordTypes[code] || {};
    var linkedForm = String(row.linked_form || row.form_code || '').trim().toUpperCase();
    if(linkedForm) map[linkedForm] = code;
  });
  (forms || []).forEach(function(form){
    if(!form || typeof form !== 'object') return;
    var formCode = String(form.form_code || '').trim().toUpperCase();
    if(!formCode || map[formCode]) return;
    var directRecordType = String(
      form.record_type ||
      (form.schema && form.schema.record_type) ||
      (form.schema && form.schema.record_context && form.schema.record_context.record_type) ||
      ''
    ).trim().toUpperCase();
    if(directRecordType && recordTypes[directRecordType]) map[formCode] = directRecordType;
  });
  return map;
}

function ensureKnownHtmlRuntimeForms(){
  /* Add emergency fallback forms if API failed to load them */
  Object.keys(KNOWN_HTML_RUNTIME_FORMS).forEach(function(code){
    if(state.formMap[code]) return;
    var seed = Object.assign({}, KNOWN_HTML_RUNTIME_FORMS[code]);
    state.forms.push(seed);
    state.formMap[code] = seed;
  });
  normalizeFormAliases();
}

/* Data-driven form alias normalization — runs after API load */
function normalizeFormAliases(){
  /* FRM-403 (Excel) → FRM-403-SCAR (online HTML runtime) */
  var alias = state.formMap['FRM-403'];
  var target = state.formMap['FRM-403-SCAR'];
  if(alias && target){
    if(!alias.html_runtime_form_code) alias.html_runtime_form_code = 'FRM-403-SCAR';
    if(!alias.standalone_html && target.standalone_html) alias.standalone_html = target.standalone_html;
  }
  /* Generic: any form with linked_excel pointing to another form code gets aliased */
  (state.forms || []).forEach(function(form){
    if(!form || !form.linked_excel) return;
    var linkedCode = String(form.linked_excel).trim().toUpperCase();
    var linkedForm = state.formMap[linkedCode];
    if(linkedForm && !linkedForm.html_runtime_form_code && form.standalone_html){
      linkedForm.html_runtime_form_code = form.form_code;
      if(!linkedForm.standalone_html) linkedForm.standalone_html = form.standalone_html;
    }
  });
}

function buildQuery(payload){
  var params = new URLSearchParams();
  Object.keys(payload || {}).forEach(function(key){
    var value = payload[key];
    if(value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

function api(action, payload, method){
  var httpMethod = method || 'GET';
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, httpMethod, 30000);
  var query = httpMethod === 'GET' ? buildQuery(payload || {}) : '';
  var url = 'api.php?action=' + encodeURIComponent(action) + (query ? '&' + query : '');
  var opts = { method:httpMethod, credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(httpMethod !== 'GET'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload || {});
  }
  return fetch(url, opts).then(function(resp){
    if(!resp.ok) return resp.json().catch(function(){ return {}; }).then(function(body){
      var err = new Error('HTTP ' + resp.status);
      err.status = resp.status;
      err.body = body;
      throw err;
    });
    return resp.json();
  });
}

function showToast(message, type){
  var existing = document.querySelector('.ec-toast');
  if(existing) existing.remove();
  var el = document.createElement('div');
  el.className = 'ec-toast ' + (type || 'info');
  el.textContent = String(message || '');
  document.body.appendChild(el);
  setTimeout(function(){ el.classList.add('show'); }, 10);
  setTimeout(function(){
    el.classList.remove('show');
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 250);
  }, 2800);
}

function openPromptDialog(options){
  options = options || {};
  return new Promise(function(resolve){
    var existing = document.querySelector('.ec-dialog-backdrop');
    if(existing) existing.remove();
    var backdrop = document.createElement('div');
    var tag = options.multiline ? 'textarea' : 'input';
    var typeAttr = options.multiline ? '' : ' type="' + esc(options.type || 'text') + '"';
    backdrop.className = 'ec-dialog-backdrop';
    backdrop.innerHTML =
      '<div class="ec-dialog" role="dialog" aria-modal="true" aria-labelledby="ec-dialog-title">' +
        '<div class="ec-dialog-head">' +
          '<h3 id="ec-dialog-title">' + esc(options.title || t('Xác nhận', 'Confirm')) + '</h3>' +
          '<button type="button" class="ec-dialog-close" data-close-dialog="1" aria-label="' + esc(t('Đóng', 'Close')) + '">x</button>' +
        '</div>' +
        (options.message ? '<p class="ec-dialog-copy">' + esc(options.message) + '</p>' : '') +
        '<' + tag + typeAttr + ' class="ec-dialog-input" id="ec-dialog-input" placeholder="' + esc(options.placeholder || '') + '">' +
          esc(options.multiline ? (options.value || '') : '') +
        '</' + tag + '>' +
        '<div class="ec-dialog-actions">' +
          '<button type="button" class="ec-btn ghost" data-close-dialog="1">' + esc(options.cancelLabel || t('Hủy', 'Cancel')) + '</button>' +
          '<button type="button" class="ec-btn primary" id="ec-dialog-confirm">' + esc(options.confirmLabel || t('Xác nhận', 'Confirm')) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);

    var input = document.getElementById('ec-dialog-input');
    if(input && !options.multiline) input.value = options.value || '';
    if(input) input.focus();

    function cleanup(value){
      document.removeEventListener('keydown', onKeyDown, true);
      if(backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      resolve(value);
    }

    function confirm(){
      var value = input ? String(input.value || '') : '';
      if(options.required && !value.trim()){
        if(input) input.focus();
        return;
      }
      cleanup(options.trim === false ? value : value.trim());
    }

    function onKeyDown(event){
      if(event.key === 'Escape'){ event.preventDefault(); cleanup(null); }
      if(event.key === 'Enter' && !options.multiline){ event.preventDefault(); confirm(); }
    }

    backdrop.addEventListener('click', function(event){
      if(event.target === backdrop || event.target.getAttribute('data-close-dialog') === '1') cleanup(null);
    });
    document.addEventListener('keydown', onKeyDown, true);
    document.getElementById('ec-dialog-confirm').onclick = confirm;
  });
}

window._ecApi = api;
window._ecShowToast = showToast;
window._ecT = t;
window._ecEsc = esc;
window._ecPromptDialog = openPromptDialog;
window._ecOpenEqmsHub = openEqmsHub;
window._ecOpenEqmsBuilder = openEqmsTemplateEditor;
window._ecOpenEqmsTemplateEditor = openEqmsTemplateEditor;
window._ecSetRuntimeDirty = setRuntimeGuard;
window._ecHasPendingRuntimeChanges = hasRuntimeDirtySession;
window._renderFormBuilder = function(formOrCode){
  var code = '';
  if(typeof formOrCode === 'string') code = formOrCode;
  else if(formOrCode && typeof formOrCode === 'object') code = formOrCode.form_code || formOrCode.code || '';
  openEqmsTemplateEditor(code || 'FRM-403-SCAR');
};

window.addEventListener('message', function(event){
  var data = event.data || {};
  if(!data || typeof data !== 'object') return;
  if(data.type === 'ec-form-runtime-dirty'){
    setRuntimeGuard(data);
    return;
  }
  if(data.type === 'ec-form-runtime-command-result' && data.request_id && window._ecRuntimePendingCommands){
    var resolver = window._ecRuntimePendingCommands[data.request_id];
    if(typeof resolver === 'function') resolver(data);
  }
});

window.addEventListener('beforeunload', function(event){
  if(!hasRuntimeDirtySession()) return;
  var msg = runtimeGuardMessage();
  event.preventDefault();
  event.returnValue = msg;
  return msg;
});

window._ecPendingPortalNavigate = null;
window._ecBeforePortalNavigate = function(target){
  target = target || {};
  if(hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){
      if(typeof navigateTo === 'function') navigateTo(target.page, target.filter, true);
    });
    return true;
  }
  if(typeof editMode !== 'undefined' && editMode && typeof editingDoc !== 'undefined' && editingDoc){
    var hasUnsaved = true;
    try{
      hasUnsaved = (typeof edHasUnsavedChanges === 'function')
        ? edHasUnsavedChanges(editingDoc)
        : (!!getEditedHtml(editingDoc) || !!edModified);
    }catch(_err){
      hasUnsaved = true;
    }
    if(hasUnsaved && typeof showUnsavedDialog === 'function'){
      window._ecPendingPortalNavigate = { page:target.page || '', filter:target.filter };
      showUnsavedDialog(editingDoc, null);
      return true;
    }
  }
  return false;
};

function pageEl(){ return document.getElementById('page-forms'); }
function requestRender(){ var page = pageEl(); if(page) render(page); }
function renderWorkspaceSkeleton(){
  return '<div class="ec-skeleton-shell">' +
    '<div class="ec-skeleton-hero">' +
      '<div class="ec-skeleton shimmer" style="height:20px;width:160px"></div>' +
      '<div class="ec-skeleton shimmer" style="height:44px;width:320px"></div>' +
      '<div class="ec-skeleton shimmer" style="height:14px;width:100%"></div>' +
      '<div class="ec-skeleton shimmer" style="height:14px;width:78%"></div>' +
    '</div>' +
    '<div class="ec-skeleton-grid">' +
      '<div class="ec-skeleton-card">' +
        '<div class="ec-skeleton shimmer" style="height:16px;width:140px"></div>' +
        '<div class="ec-skeleton shimmer" style="height:96px;width:100%"></div>' +
      '</div>' +
      '<div class="ec-skeleton-card">' +
        '<div class="ec-skeleton shimmer" style="height:16px;width:120px"></div>' +
        '<div class="ec-skeleton shimmer" style="height:22px;width:72%"></div>' +
        '<div class="ec-skeleton shimmer" style="height:22px;width:88%"></div>' +
        '<div class="ec-skeleton shimmer" style="height:22px;width:64%"></div>' +
      '</div>' +
    '</div>' +
    '<div class="ec-skeleton-card">' +
      '<div class="ec-skeleton shimmer" style="height:18px;width:180px"></div>' +
      '<div class="ec-skeleton shimmer" style="height:140px;width:100%"></div>' +
    '</div>' +
  '</div>';
}

function renderLoadFailure(error){
  var detail = '';
  if(error && error.message) detail = String(error.message || '').trim();
  return '<div class="ec-load-failure">' +
    '<div class="ec-load-failure-mark">!</div>' +
    '<div class="ec-load-failure-copy">' +
      '<small>' + esc(t('Phân hệ chưa tải được', 'Workspace load failed')) + '</small>' +
      '<h3>' + esc(t('Không thể mở Kiểm soát chứng cứ lúc này', 'Could not open Evidence Control right now')) + '</h3>' +
      '<p>' + esc(t('Hãy kiểm tra phiên đăng nhập, kết nối mạng và quyền truy cập API rồi thử lại. Nếu lỗi vẫn lặp lại, hãy mở Trợ lý tạo mã để kiểm tra phản hồi máy chủ.', 'Check your session, network connection, and API access, then try again. If the issue persists, open the Record ID Assistant to inspect the server response.')) + '</p>' +
      (detail ? '<div class="ec-inline-alert error"><strong>' + esc(t('Chi tiết kỹ thuật', 'Technical detail')) + '</strong><span>' + esc(detail) + '</span></div>' : '') +
      '<div class="ec-load-failure-actions"><button type="button" class="ec-btn primary" id="ec-retry-load">' + esc(t('Thử tải lại', 'Retry loading')) + '</button></div>' +
    '</div>' +
  '</div>';
}

function stopWorkQueuePolling(){
  if(state.workQueue.pollTimer){
    clearInterval(state.workQueue.pollTimer);
    state.workQueue.pollTimer = null;
  }
}

function ensureWorkQueuePolling(){
  if(state.workspaceMode !== 'mine'){
    stopWorkQueuePolling();
    return;
  }
  if(state.workQueue.pollTimer) return;
  state.workQueue.pollTimer = setInterval(function(){
    if(state.workspaceMode !== 'mine'){
      stopWorkQueuePolling();
      return;
    }
    loadWorkQueue(true).then(function(){
      if(state.workspaceMode === 'mine') requestRender();
    });
  }, 60000);
}

function roleList(){
  var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
  var roles = Array.isArray(user.roles) ? user.roles : [user.role || ''];
  return roles.map(function(role){ return String(role || '').trim().toLowerCase(); }).filter(Boolean);
}

function currentDept(){
  var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
  return String(user.dept || '').trim().toUpperCase();
}

function canSeeAllWorkQueue(){
  var roles = roleList();
  if(!roles.length) return true;
  /* Elevated roles: loaded from HmRegistry → 'elevated_management_roles' (single source of truth) */
  var elevated = (window.HmRegistry && typeof HmRegistry.selectOptions === 'function')
    ? (HmRegistry.selectOptions('elevated_management_roles') || []).map(function(o){ return o.value; })
    : [];
  if(!elevated.length) elevated = ['admin','it_admin','ceo','production_director','qa_manager','quality_manager','production_manager','engineering_manager','qms_engineer'];
  return roles.some(function(role){ return elevated.indexOf(role) >= 0; });
}

function ensureWorkQueueDefaults(){
  if(!state.workQueue.department && currentDept()) state.workQueue.department = currentDept();
}

function fmtDateTime(value){
  if(!value) return '-';
  try {
    var locale = (typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
  } catch(_err){
    return String(value);
  }
}

function renderAgeBadge(value){
  if(!value) return '';
  var hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000);
  if(!isFinite(hours) || hours < 0) return '';
  var tone = hours >= 120 ? 'fail' : (hours >= 48 ? 'warn' : 'info');
  var label = hours >= 24
    ? (Math.floor(hours / 24) + ' ' + t('ngày', 'days'))
    : (hours + ' ' + t('giờ', 'hours'));
  return '<span class="ec-badge ' + tone + '">' + esc(label) + '</span>';
}

function recordTypeForItem(item){
  if(item && item.record_type) return String(item.record_type || '').trim().toUpperCase();
  var formCode = String((item && item.form_code) || '').trim();
  if(formCode && state.formToRecordType && state.formToRecordType[formCode]) return String(state.formToRecordType[formCode] || '').trim().toUpperCase();
  var recordId = String((item && item.record_id) || '').trim();
  var prefix = recordId.split('-')[0] || '';
  return prefix.toUpperCase();
}

function reviewSlaHours(item){
  var recordType = recordTypeForItem(item);
  var cfg = (state.recordTypes && state.recordTypes[recordType]) ? state.recordTypes[recordType] : {};
  var policy = cfg.review_sla_policy || {};
  var configured = Number(policy.review_hours || cfg.sla_review_hours || cfg.sla_hours || 0);
  if(isFinite(configured) && configured > 0) return configured;
  if(recordType === 'NCR' || recordType === 'CAPA' || recordType === 'AUD') return 48;
  if(recordType === 'FAI' || recordType === 'SCAR') return 72;
  return 72;
}

function formatSlaDistance(hours){
  hours = Math.abs(Number(hours || 0));
  if(!isFinite(hours) || hours <= 0) return t('0 giờ', '0h');
  if(hours >= 24){
    var days = Math.round((hours / 24) * 10) / 10;
    var clean = String(days).replace(/\.0$/, '');
    return clean + ' ' + t('ngày', 'd');
  }
  return Math.round(hours) + ' ' + t('giờ', 'h');
}

function reviewSlaMeta(item){
  var reviewSla = item && item.review_sla ? item.review_sla : null;
  if(reviewSla && reviewSla.state){
    return {
      state: String(reviewSla.state || '').trim().toLowerCase(),
      remainingHours: Number(reviewSla.remaining_hours),
      overdueHours: Number(reviewSla.overdue_hours),
      hoursToEscalation: Number(reviewSla.hours_to_escalation),
      escalated: !!reviewSla.escalated,
      dueAt: String(reviewSla.due_at || ''),
      escalationDueAt: String(reviewSla.escalation_due_at || '')
    };
  }
  var stamp = new Date((item && (item.submitted_at || item.updated_at || item.created_at)) || '').getTime();
  if(!stamp) return null;
  var dueAt = stamp + (reviewSlaHours(item) * 3600000);
  var diff = dueAt - Date.now();
  return {
    state: diff < 0 ? 'overdue' : (Math.round(diff / 3600000) <= 12 ? 'due_soon' : 'tracking'),
    remainingHours: Math.floor(diff / 3600000),
    overdueHours: diff < 0 ? Math.ceil(Math.abs(diff) / 3600000) : 0,
    hoursToEscalation: NaN,
    escalated: false,
    dueAt: new Date(dueAt).toISOString(),
    escalationDueAt: ''
  };
}

function renderSlaBadge(item){
  var meta = reviewSlaMeta(item);
  if(!meta) return '';
  var tone = 'info';
  var label = t('Trong SLA', 'Within SLA');
  if(meta.state === 'escalated' || meta.state === 'closed_after_escalation'){
    tone = 'fail';
    label = t('Đã leo cấp ', 'Escalated ') + formatSlaDistance(meta.overdueHours || meta.remainingHours || 0);
  } else if(meta.state === 'overdue' || meta.state === 'closed_late'){
    tone = 'fail';
    label = t('Quá hạn ', 'Overdue ') + formatSlaDistance(meta.overdueHours || meta.remainingHours || 0);
  } else if(meta.state === 'due_soon'){
    tone = 'warn';
    label = t('Sắp đến hạn ', 'Due soon ') + formatSlaDistance(meta.remainingHours || 0);
  } else if(meta.state === 'closed_on_time'){
    tone = 'pass';
    label = t('Đóng trong SLA', 'Closed in SLA');
  } else if(isFinite(meta.remainingHours)){
    tone = 'info';
    label = t('Còn ', 'Due in ') + formatSlaDistance(meta.remainingHours);
  }
  return '<span class="ec-badge ' + tone + '">' + esc(label) + '</span>';
}

function renderEscalationBadge(item){
  var meta = reviewSlaMeta(item);
  if(!meta) return '';
  if(meta.state === 'overdue' && isFinite(meta.hoursToEscalation) && meta.hoursToEscalation > 0){
    return '<span class="ec-badge warn">' + esc(t('Leo cấp sau ', 'Escalates in ') + formatSlaDistance(meta.hoursToEscalation)) + '</span>';
  }
  if(meta.state === 'escalated' || meta.state === 'closed_after_escalation'){
    return '<span class="ec-badge warn">' + esc(t('Đã chuyển leo cấp', 'Escalated')) + '</span>';
  }
  return '';
}

function statusLabel(status){
  /* Delegate to HmRegistry → 'form_submission_status' or 'doc_status' */
  if(window.HmRegistry){
    var info = HmRegistry.status('form_submission_status', status);
    if(info && info.label && info.label !== status) return (typeof lang!=='undefined'&&lang==='en') ? (info.labelEn||info.label) : info.label;
    info = HmRegistry.status('doc_status', status);
    if(info && info.label && info.label !== status) return (typeof lang!=='undefined'&&lang==='en') ? (info.labelEn||info.label) : info.label;
  }
  var key = String(status || '').trim().toLowerCase();
  var labels = {
    draft: t('Bản nháp', 'Draft'),
    allocated: t('Đã cấp mã', 'Allocated'),
    downloaded: t('Đã tải biểu mẫu', 'Downloaded'),
    submitted: t('Đã nộp', 'Submitted'),
    received: t('Đã tiếp nhận', 'Received'),
    in_review: t('Đang xem xét', 'In review'),
    approved: t('Đã phê duyệt', 'Approved'),
    closed: t('Đã đóng', 'Closed'),
    rejected: t('Bị từ chối', 'Rejected'),
    voided: t('Đã hủy', 'Voided'),
    void: t('Đã hủy', 'Voided'),
    pending: t('Chờ xử lý', 'Pending')
  };
  return labels[key] || String(status || '-');
}

function renderStatusPill(status){
  /* Delegate to HmRegistry.badge() if available */
  if(window.HmRegistry){
    var badge = HmRegistry.badge('form_submission_status', status);
    if(badge && badge.indexOf('#6b7280') < 0) return badge;
    badge = HmRegistry.badge('doc_status', status);
    if(badge && badge.indexOf('#6b7280') < 0) return badge;
  }
  var key = String(status || '').trim().toLowerCase();
  var tone = 'info';
  if(key === 'approved' || key === 'closed') tone = 'pass';
  else if(key === 'draft') tone = 'neutral';
  else if(key === 'rejected' || key === 'voided' || key === 'void') tone = 'fail';
  else if(key === 'submitted' || key === 'received' || key === 'in_review') tone = 'warn';
  return '<span class="ec-badge ' + tone + '">' + esc(statusLabel(status)) + '</span>';
}

function traceSummary(ctx){
  ctx = ctx || {};
  var parts = [];
  if(ctx.customer_id) parts.push(ctx.customer_id);
  if(ctx.so_number) parts.push(ctx.so_number);
  if(ctx.jo_number) parts.push(ctx.jo_number);
  if(ctx.wo_number) parts.push(ctx.wo_number);
  if(ctx.part_number || ctx.part_revision) parts.push([ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join('/'));
  if(ctx.capa_number) parts.push(ctx.capa_number);
  return parts.join(' · ');
}

function loadAll(){
  var catalogError = '';
  return Promise.all([
    api('form_catalog_snapshot', {}, 'GET').then(function(resp){
      state.forms = (resp && Array.isArray(resp.forms)) ? resp.forms : [];
      state.formMap = {};
      state.forms.forEach(function(form){
        if(!form.category) form.category = 'other';
        if(form.online !== false) form.online = true;
        state.formMap[form.form_code] = form;
      });
    }).catch(function(err){
      state.forms = [];
      state.formMap = {};
      catalogError = (err && err.status === 401) ? t('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Session expired. Please log in again.') : t('Không thể tải danh mục form.', 'Could not load form catalog.');
    }),
    api('config_record_types', {}, 'GET').then(function(resp){
      state.recordTypes = normalizeRecordTypeRegistry(resp && resp.record_types ? resp.record_types : {});
      state.formToRecordType = buildFormToRecordTypeMap(state.forms, state.recordTypes);
    }).catch(function(){
      state.recordTypes = {};
      state.formToRecordType = {};
    })
  ]).then(function(){
    ensureKnownHtmlRuntimeForms();
    state.formToRecordType = buildFormToRecordTypeMap(state.forms, state.recordTypes);
    state._loadError = catalogError;
    if(catalogError && !state.forms.length) throw new Error(catalogError);
  });
}

function loadAllocations(){
  if(!state.selectedFormCode || !window.AllocationTracker){
    state.allocations = [];
    return Promise.resolve([]);
  }
  return window.AllocationTracker.getHistory({ form_code: state.selectedFormCode, page_size: 50 }).then(function(resp){
    var rows = (resp && Array.isArray(resp.entries)) ? resp.entries : [];
    state.allocations = rows.filter(function(row){
      return String(row.form_code || '') === String(state.selectedFormCode);
    });
    if(state.selectedAllocationId && !state.allocations.some(function(row){ return row.allocation_id === state.selectedAllocationId; })){
      state.selectedAllocationId = '';
    }
    if(!state.selectedAllocationId && state.allocations.length){
      state.selectedAllocationId = state.allocations[0].allocation_id || '';
    }
    return state.allocations;
  }).catch(function(){
    state.allocations = [];
    return [];
  });
}

function openFormWorkspace(formCode, allocationId, bypassGuard){
  if(!bypassGuard && hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ openFormWorkspace(formCode, allocationId, true); });
    return;
  }
  if(formCode) state.selectedFormCode = formCode;
  if(allocationId !== undefined && allocationId !== null) state.selectedAllocationId = allocationId || '';
  resetRuntimeGuard();
  state.workspaceMode = 'forms';
  state.workspaceLoading = true;
  requestRender();
  loadAllocations().then(function(){
    state.workspaceLoading = false;
    requestRender();
  }).catch(function(){
    state.workspaceLoading = false;
    requestRender();
  });
}

function openUploadWorkspace(allocationId, formCode, bypassGuard){
  if(!bypassGuard && hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ openUploadWorkspace(allocationId, formCode, true); });
    return;
  }
  if(formCode) state.selectedFormCode = formCode;
  if(allocationId) state.selectedAllocationId = allocationId;
  state.pendingUploadSelection = allocationId ? { allocationId: allocationId, formCode: formCode || state.selectedFormCode || '' } : null;
  resetRuntimeGuard();
  state.workspaceMode = 'evidence';
  requestRender();
}

function docRegistry(){
  try{
    if(typeof DOCS !== 'undefined' && Array.isArray(DOCS)) return DOCS;
  }catch(_err){}
  return Array.isArray(window.DOCS) ? window.DOCS : [];
}

function normalizeEqmsPath(path){
  return String(path || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^(\.\.\/)+/, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function eqmsStandalonePath(form){
  return normalizeEqmsPath((form && form.standalone_html) || (form && form.schema && form.schema.standalone_html) || '');
}

function canonicalEqmsForm(formOrCode){
  var baseForm = null;
  if(typeof formOrCode === 'string'){
    baseForm = state.formMap[formOrCode] || (state.forms || []).find(function(item){
      return String(item && item.form_code || '').trim() === String(formOrCode || '').trim();
    }) || null;
  } else if(formOrCode && typeof formOrCode === 'object'){
    baseForm = formOrCode;
  }
  if(!baseForm) return null;
  var runtimeCode = String((baseForm.html_runtime_form_code || (baseForm.schema && baseForm.schema.html_runtime_form_code) || '')).trim();
  if(runtimeCode){
    baseForm = state.formMap[runtimeCode] || (state.forms || []).find(function(item){
      return String(item && item.form_code || '').trim() === runtimeCode;
    }) || KNOWN_HTML_RUNTIME_FORMS[runtimeCode] || baseForm;
  }
  var standalonePath = eqmsStandalonePath(baseForm);
  if(!standalonePath) return baseForm;
  var matches = (state.forms || []).filter(function(candidate){
    return eqmsStandalonePath(candidate) === standalonePath;
  });
  if(!matches.length) return baseForm;
  matches.sort(function(a, b){
    return eqmsFormRank(b) - eqmsFormRank(a) || String(a.form_code || '').localeCompare(String(b.form_code || ''));
  });
  return matches[0] || baseForm;
}

function canonicalEqmsFormCode(formCode){
  var canonical = canonicalEqmsForm(formCode);
  return canonical ? String(canonical.form_code || formCode || '').trim() : String(formCode || '').trim();
}

function eqmsFormRank(form){
  var code = String(form && form.form_code || '').trim().toUpperCase();
  var rank = 0;
  if(eqmsStandalonePath(form)) rank += 10;
  if(form && form.online !== false) rank += 4;
  if(form && (form.linked_excel_form || form.offline_form_code || form.blank_path || form.offline_fallback_available)) rank += 3;
  if(code && !/^FRM-\d+$/.test(code)) rank += 2;
  if(/-[A-Z0-9]+$/.test(code)) rank += 1;
  return rank;
}

function eqmsForms(){
  var buckets = {};
  (state.forms || []).forEach(function(form){
    if(!form || !form.form_code) return;
    var runtimeAlias = String(form.html_runtime_form_code || (form.schema && form.schema.html_runtime_form_code) || '').trim();
    if(form.online === false && runtimeAlias) return;
    var standalonePath = eqmsStandalonePath(form);
    /* Include forms with a standalone HTML runtime OR explicitly online JSON-schema forms */
    var isOnlineJsonForm = !standalonePath && (form.online === true || form.delivery_mode === 'online' || form.delivery_mode === 'hybrid');
    if(!standalonePath && !isOnlineJsonForm) return;
    var bucketKey = standalonePath || runtimeAlias || String(form.form_code || '').trim().toUpperCase();
    if(!buckets[bucketKey] || eqmsFormRank(form) > eqmsFormRank(buckets[bucketKey])){
      buckets[bucketKey] = form;
    }
  });
  return Object.keys(buckets).map(function(key){ return buckets[key]; }).sort(function(a, b){
    return String(a.form_code || '').localeCompare(String(b.form_code || ''));
  });
}

function findLocalDraftForForm(formCode){
  if(typeof window.listUserDrafts !== 'function') return null;
  var drafts = window.listUserDrafts() || [];
  for(var i = 0; i < drafts.length; i++){
    var draft = drafts[i];
    if(String(draft.formCode || '') === String(formCode || '')) return draft;
  }
  return null;
}

function resolveRecordTypeForForm(form){
  if(!form) return 'GENR';
  // 1. Explicit record_type on the form/schema
  var direct = String(form.record_type || '').trim().toUpperCase();
  if(direct) return direct;
  // 2. Registry/catalog map built at load time
  var code = String(form.form_code || '').trim().toUpperCase();
  if(state.formToRecordType[code]) return state.formToRecordType[code];
  var base = code.replace(/-[A-Z0-9]+$/, '');
  var fromMap = String(state.formToRecordType[base] || '').trim().toUpperCase();
  if(fromMap) return fromMap;
  // 3. Auto-derive from FRM-xxx numeric series (Standard 15 universal coverage)
  return _deriveRecordTypeFromSeries(code);
}

/**
 * Derive a series-level record type from a form code.
 * Maps FRM-Nxx → the catch-all type defined in document_type_registry.json.
 * Guarantees every form gets a traceable code even without an explicit registry entry.
 */
function _deriveRecordTypeFromSeries(code){
  /* Maps FRM-Nxx to the nearest supported allocation record type.
     Supported: NCR, CAPA, FAI, TRN, AUD, ECR, CAL, SCAR, IMP, MR, RISK, DOWNTIME, PO-EXCEPTION */
  var m = String(code || '').match(/^(?:FRM-)?(\d+)/i);
  if(!m) return 'MR';
  var n = parseInt(m[1], 10);
  if(n < 200) return 'RISK';      // 100s: Foundation / risk / change control
  if(n < 300) return 'MR';        // 200s: Sales / customer / management
  if(n < 400) return 'FAI';       // 300s: Engineering / first article / setup
  if(n < 500) return 'SCAR';      // 400s: Supply chain / supplier corrective action
  if(n < 600) return 'DOWNTIME';  // 500s: Production / operations / maintenance
  if(n < 700) return 'NCR';       // 600s: Quality / calibration / inspection
  if(n < 800) return 'MR';        // 700s: Warehouse / logistics
  if(n < 900) return 'TRN';       // 800s: Training / HR / competency
  if(n < 1000) return 'AUD';      // 900s: Audit / management review / improvement
  return 'MR';
}

/**
 * Derive a valid 2-5 uppercase department code for a form.
 * Used when sending allocation requests to the backend.
 * Falls back through: dept_code field → owner first token → category → 'QA'.
 */
function _resolveDeptCodeForForm(form){
  // Explicit dept field
  var direct = String(form.dept_code || form.department || '').trim().toUpperCase();
  if(direct && /^[A-Z]{2,5}$/.test(direct)) return direct;

  // Extract first 2-5 letter token from owner field (e.g. "QA / QMS Engineer" → "QA")
  var owner = String(form.owner || '').trim();
  if(owner){
    var parts = owner.split(/\s*[\/,]\s*/);
    for(var i = 0; i < parts.length; i++){
      var p = parts[i].trim().toUpperCase();
      if(/^[A-Z]{2,5}$/.test(p)) return p;
    }
  }

  // Derive from category
  var cat = String(form.category || '').toLowerCase();
  if(cat === 'production') return 'PRO';
  if(cat === 'quality') return 'QA';
  if(cat === 'hr') return 'HR';
  if(cat === 'logistics') return 'WH';
  if(cat === 'engineering') return 'ENG';
  if(cat === 'scm' || cat === 'supply_chain') return 'SCM';
  if(cat === 'management' || cat === 'management_review') return 'EXE';

  return 'QA';
}

function openEqmsRuntime(formCode, options, bypassGuard){
  if(!bypassGuard && hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ openEqmsRuntime(formCode, options, true); });
    return;
  }
  formCode = canonicalEqmsFormCode(formCode);
  state.workspaceMode = 'forms';
  state._eqmsOpenCode = formCode || '';
  state._eqmsOpenOptions = Object.assign({}, options || {});
  state._eqmsBuilderFormCode = '';
  state._eqmsBuilderOptions = null;
  requestRender();
}

function openEqmsHub(bypassGuard){
  if(!bypassGuard && hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ openEqmsHub(true); });
    return;
  }
  state.workspaceMode = 'forms';
  state._eqmsOpenCode = '';
  state._eqmsOpenOptions = null;
  state._eqmsBuilderFormCode = '';
  state._eqmsBuilderOptions = null;
  resetRuntimeGuard();
  requestRender();
  loadRegistry(false).then(function(){
    if(state.workspaceMode === 'forms' && !state._eqmsOpenCode) requestRender();
  });
}

function resolveEqmsHtmlDocument(formCode){
  var form = canonicalEqmsForm(formCode) || state.formMap[formCode] || KNOWN_HTML_RUNTIME_FORMS[String(formCode || '').trim()] || null;
  var runtimeCode = String((form && (form.html_runtime_form_code || (form.schema && form.schema.html_runtime_form_code)) || '')).trim();
  if(runtimeCode){
    var runtimeForm = canonicalEqmsForm(runtimeCode) || state.formMap[runtimeCode] || KNOWN_HTML_RUNTIME_FORMS[runtimeCode] || null;
    if(runtimeForm) form = runtimeForm;
  }
  var standalonePath = eqmsStandalonePath(form);
  var docs = docRegistry();
  if(runtimeCode){
    for(var r = 0; r < docs.length; r++){
      var runtimeDoc = docs[r];
      if(!runtimeDoc) continue;
      if(String(runtimeDoc.code || '').trim().toUpperCase() === runtimeCode.toUpperCase()) return runtimeDoc;
    }
  }
  if(standalonePath){
    for(var i = 0; i < docs.length; i++){
      var pathDoc = docs[i];
      if(!pathDoc) continue;
      if(normalizeEqmsPath(pathDoc.path || '') === standalonePath) return pathDoc;
    }
  }
  var targetCode = String((form && form.form_code) || formCode || '').trim().toUpperCase();
  for(var j = 0; j < docs.length; j++){
    var doc = docs[j];
    if(!doc || !doc.code) continue;
    if(String(doc.code || '').trim().toUpperCase() === targetCode) return doc;
  }
  if(typeof findDocByRelativePath === 'function' && standalonePath){
    var linkedDoc = findDocByRelativePath(standalonePath);
    if(linkedDoc) return linkedDoc;
  }
  if(form && standalonePath){
    var syntheticCode = targetCode;
    var fileMatch = standalonePath.match(/([^\/]+)\.html?$/i);
    if(fileMatch && fileMatch[1]){
      var fileCodeMatch = String(fileMatch[1]).trim().toUpperCase().match(/^(FRM-[A-Z0-9-]+)/);
      if(fileCodeMatch && fileCodeMatch[1]) syntheticCode = fileCodeMatch[1];
    }
    var synthetic = {
      code: syntheticCode,
      title: form.title || form.form_code || formCode || 'HTML Form',
      title_vi: form.title_vi || form.description_vi || '',
      description: form.description || '',
      path: standalonePath,
      ext: 'html',
      cat: 'FRM',
      owner: form.owner || 'QA / SCM',
      rev: form.version || 'V1',
      status: 'approved',
      control_status: 'RELEASED',
      delivery_mode: 'browser',
      portal_behavior: 'browser_open',
      browser_open_enabled: true
    };
    docs.push(synthetic);
    return synthetic;
  }
  return null;
}

function waitForDocViewerReady(docRef){
  var doc = (typeof docRef === 'object' && docRef) ? docRef : resolveEqmsHtmlDocument(docRef);
  var expectedCode = String(doc && doc.code || docRef || '').trim();
  var expectedPath = normalizeEqmsPath(doc && doc.path || '');
  return new Promise(function(resolve){
    var startedAt = Date.now();
    (function poll(){
      var iframe = document.getElementById('doc-iframe');
      var viewer = document.getElementById('doc-viewer');
      var ready = false;
      try{
        var iframeDoc = iframe && iframe.contentDocument;
        var readyState = !!(iframeDoc && iframeDoc.readyState === 'complete');
        var sameCode = !!(expectedCode && window.currentDoc === expectedCode);
        var samePath = !!(expectedPath && normalizeEqmsPath(window.currentDocPath || '') === expectedPath);
        var srcMatches = !!(expectedPath && iframe && String(iframe.src || '').indexOf(expectedPath) >= 0);
        var hasBody = !!(iframeDoc && iframeDoc.body && String(iframeDoc.body.innerHTML || '').replace(/\s+/g, '').length > 40);
        var hasFormCanvas = !!(iframeDoc && iframeDoc.body && iframeDoc.body.querySelector && iframeDoc.body.querySelector('.form-header,[data-form-edit-root],#scarForm,.qf-section,.scar-record-strip'));
        ready = !!(iframe && viewer && viewer.classList.contains('active') && readyState && hasBody && (hasFormCanvas || String(iframeDoc.body.textContent || '').trim().length > 30) && (sameCode || samePath || srcMatches));
      }catch(_err){
        ready = false;
      }
      if(ready){
        resolve();
        return;
      }
      if(Date.now() - startedAt > 12000){
        resolve(false);
        return;
      }
      setTimeout(poll, 160);
    })();
  });
}

function openEqmsTemplateEditor(formCode, bypassGuard){
  if(!bypassGuard && hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ openEqmsTemplateEditor(formCode, true); });
    return;
  }
  formCode = canonicalEqmsFormCode(formCode);
  var doc = resolveEqmsHtmlDocument(formCode);
  if(!doc || !doc.code){
    showToast(t('Chưa tìm thấy biểu mẫu HTML chuẩn để chỉnh sửa.', 'Could not find the governed HTML form template.'), 'warn');
    return;
  }
  if(typeof openDoc !== 'function' || typeof startEdit !== 'function'){
    showToast(t('Trình chỉnh sửa tài liệu HTML chưa sẵn sàng.', 'The HTML document editor is not ready yet.'), 'warn');
    return;
  }
  Promise.resolve(openDoc(doc)).then(function(){
    return waitForDocViewerReady(doc);
  }).then(function(viewerReady){
    if(viewerReady === false) throw new Error('viewer_not_ready');
    var targetRef = doc.path || doc.code || doc;
    var resolved = (typeof window._resolveDocRecord === 'function') ? window._resolveDocRecord(targetRef) : doc;
    var canDirectEdit = !!(resolved && typeof canEdit === 'function' && canEdit(resolved));
    if(canDirectEdit){
      try{ startEdit(targetRef); }catch(_err){}
    }else if(typeof startNewRevision === 'function'){
      try{ startNewRevision(targetRef); }catch(_err2){}
    }else{
      throw new Error('editor_not_ready');
    }
    return waitForEqmsEditorReady(doc).then(function(ready){
      if(!ready) throw new Error('editor_not_ready');
      showToast(t('Đã mở mẫu HTML để chỉnh sửa bằng cùng bề mặt hiển thị.', 'Opened the HTML template in the same visual surface.'), 'success');
    });
  }).catch(function(){
    showToast(t('Không thể mở trình chỉnh sửa mẫu HTML lúc này.', 'Could not open the HTML template editor right now.'), 'error');
  });
}

function openEqmsBuilder(formCode, options){
  if(options && options.seedForm){
    showToast(t('Chế độ tạo mẫu mới sẽ đi qua editor HTML chuẩn. Hãy dùng mẫu HTML hiện có làm điểm bắt đầu.', 'New template creation will use the governed HTML editor. Use an existing HTML form as the starting point.'), 'info');
  }
  openEqmsTemplateEditor(formCode || 'FRM-403-SCAR');
}

function startNewEqmsOnline(formCode){
  var form = state.formMap[formCode] || null;
  if(!form || !window.AllocationTracker){
    showToast(t('Biểu mẫu online chưa sẵn sàng.', 'Online form is not ready.'), 'warn');
    return;
  }
  var recordType = resolveRecordTypeForForm(form); // always returns a value now
  var dept = _resolveDeptCodeForForm(form);
  showToast(t('Đang cấp mã cho biểu mẫu online...', 'Issuing a code for the online form...'), 'info');
  window.AllocationTracker.allocate(recordType, dept, {
    year: new Date().getFullYear(),
    form_code: formCode,
    notes: 'eqms_online_new_form'
  }).then(function(resp){
    if(!(resp && resp.ok)){
      showToast(t('Không thể cấp mã mới.', 'Could not issue a new code.'), 'error');
      return;
    }
    openEqmsRuntime(formCode, {
      allocationId: resp.allocation_id || '',
      recordId: resp.record_id || '',
      editMode: true,
      createIfMissing: false,
      forceNew: true,
      editOrigin: 'new'
    });
  }).catch(function(err){
    showToast((window.AllocationTracker && window.AllocationTracker.describeError)
      ? window.AllocationTracker.describeError(err && err.body ? err.body : {}, 'allocation').message
      : t('Không thể cấp mã mới.', 'Could not issue a new code.'), 'error');
  });
}

function startNewEqmsOffline(formCode){
  var form = state.formMap[formCode] || null;
  if(!form || !window.AllocationTracker){
    showToast(t('Biểu mẫu offline chưa sẵn sàng.', 'Offline form is not ready.'), 'warn');
    return;
  }
  var targetFormCode = String(form.offline_form_code || form.linked_excel_form || form.form_code || '');
  if(!targetFormCode){
    showToast(t('Chưa cấu hình luồng offline cho form này.', 'Offline flow is not configured for this form.'), 'error');
    return;
  }
  var recordType = resolveRecordTypeForForm(form); // always returns a value now
  var dept = _resolveDeptCodeForForm(form);
  showToast(t('Đang cấp mã và chuẩn bị file Excel kiểm soát...', 'Issuing the code and preparing the controlled Excel workbook...'), 'info');
  window.AllocationTracker.allocate(recordType, dept, {
    year: new Date().getFullYear(),
    form_code: targetFormCode,
    notes: 'eqms_offline_new_form'
  }).then(function(resp){
    if(!(resp && resp.ok)) throw new Error('allocation_failed');
    return window.AllocationTracker.downloadForm(resp.allocation_id || '', targetFormCode, {}).then(function(downloadResp){
      showToast(t('Đã cấp mã và tải file offline.', 'The offline file has been issued and downloaded.'), downloadResp && downloadResp.ok ? 'success' : 'warn');
      loadRegistry(true);
      return downloadResp;
    });
  }).catch(function(){
    showToast(t('Không thể cấp mã hoặc tải file offline.', 'Could not issue the code or download the offline file.'), 'error');
  });
}

function loadRegistry(force){
  if(state.registry.loading) return state.registry.promise || Promise.resolve(state.registry);
  if(!force && state.registry.loaded) return Promise.resolve(state.registry);

  if(!canSeeAllWorkQueue()) state.registry.mineOnly = true;
  state.registry.loading = true;
  state.registry.error = '';
  state.registry.promise = api('eqms_record_registry', {
    form_code: state.registry.formCode,
    delivery_mode: state.registry.deliveryMode,
    state: state.registry.state,
    search: state.registry.search,
    mine_only: state.registry.mineOnly ? 1 : 0,
    page: state.registry.page,
    page_size: 50
  }, 'GET').then(function(resp){
    state.registry.rows = (resp && Array.isArray(resp.rows)) ? resp.rows : [];
    state.registry.summary = (resp && resp.summary) ? resp.summary : state.registry.summary;
    state.registry.total = Number(resp && resp.total || 0) || 0;
    state.registry.page = Number(resp && resp.page || 1) || 1;
    state.registry.pages = Number(resp && resp.pages || 1) || 1;
    state.registry.loaded = true;
    return state.registry;
  }).catch(function(err){
    state.registry.rows = [];
    state.registry.loaded = false;
    state.registry.error = (err && err.body && err.body.error) ? String(err.body.error) : t('Không thể tải sổ quản lý mã.', 'Could not load the record registry.');
    return state.registry;
  }).finally(function(){
    state.registry.loading = false;
    state.registry.promise = null;
  });
  return state.registry.promise;
}

function loadWorkQueue(force){
  ensureWorkQueueDefaults();
  if(state.workQueue.loading) return state.workQueue.promise || Promise.resolve(state.workQueue);
  if(!force && state.workQueue.loaded && !state.workQueue.partial) return Promise.resolve(state.workQueue);

  state.workQueue.department = canSeeAllWorkQueue() ? String(state.workQueue.department || '').trim().toUpperCase() : currentDept();
  state.workQueue.formCode = String(state.workQueue.formCode || '').trim();
  state.workQueue.days = Math.max(1, Number(state.workQueue.days || 30) || 30);
  state.workQueue.loading = true;
  state.workQueue.error = '';
  state.workQueue.partial = false;

  var pendingReq = api('evidence_get_pending', {
    department: state.workQueue.department,
    form_code: state.workQueue.formCode
  }, 'GET').catch(function(){
    return { ok:false, error:'pending_failed', pending:[] };
  });

  var exceptionReq = api('upload_exception_queue', {
    department: state.workQueue.department,
    form_code: state.workQueue.formCode,
    status: state.workQueue.exceptionType,
    date_from: state.workQueue.dateFrom,
    date_to: state.workQueue.dateTo,
    days: state.workQueue.days
  }, 'GET').catch(function(){
    return { ok:false, error:'exception_queue_failed', exceptions:[] };
  });

  state.workQueue.promise = Promise.all([pendingReq, exceptionReq]).then(function(results){
    var pendingResp = results[0] || {};
    var exceptionResp = results[1] || {};
    var pendingOk = pendingResp.ok !== false;
    var exceptionOk = exceptionResp.ok !== false;

    state.workQueue.pending = Array.isArray(pendingResp.pending) ? pendingResp.pending.slice().sort(function(a, b){
      var left = new Date((a && (a.submitted_at || a.updated_at || a.created_at)) || 0).getTime();
      var right = new Date((b && (b.submitted_at || b.updated_at || b.created_at)) || 0).getTime();
      return left - right;
    }) : [];
    state.workQueue.exceptions = Array.isArray(exceptionResp.exceptions) ? exceptionResp.exceptions.slice() : [];
    state.workQueue.loaded = pendingOk || exceptionOk;
    state.workQueue.partial = state.workQueue.loaded && (!pendingOk || !exceptionOk);
    state.workQueue.lastLoaded = state.workQueue.loaded ? new Date().toISOString() : '';

    if(!state.workQueue.loaded){
      state.workQueue.error = t('Không thể tải hàng chờ xử lý.', 'Could not load the work queue.');
      showToast(state.workQueue.error, 'error');
    } else if(state.workQueue.partial){
      state.workQueue.error = t('Một phần hàng chờ chưa tải được.', 'Part of the work queue could not be loaded.');
      showToast(state.workQueue.error, 'warn');
    }
    return state.workQueue;
  }).finally(function(){
    state.workQueue.loading = false;
    state.workQueue.promise = null;
  });

  return state.workQueue.promise;
}

function filterForms(){
  return state.forms.filter(function(form){
    if(state.filter !== 'all' && (form.category || 'other') !== state.filter) return false;
    if(state.search){
      var q = state.search.toLowerCase();
      var haystack = [form.form_code, form.title, form.title_vi, form.description, form.description_vi, form.sop_ref, form.category].join(' ').toLowerCase();
      if(haystack.indexOf(q) < 0) return false;
    }
    return true;
  });
}

function filteredExceptions(){
  var formCode = String(state.workQueue.formCode || '').trim();
  var typeFilter = String(state.workQueue.exceptionType || '').trim();
  var fromDate = state.workQueue.dateFrom ? new Date(state.workQueue.dateFrom + 'T00:00:00').getTime() : 0;
  var toDate = state.workQueue.dateTo ? new Date(state.workQueue.dateTo + 'T23:59:59').getTime() : 0;
  return (state.workQueue.exceptions || []).filter(function(item){
    var extra = item && item.extra ? item.extra : {};
    if(formCode && String(item.form_code || extra.form_code || '').trim() !== formCode) return false;
    if(typeFilter && String(item.type || '').trim() !== typeFilter) return false;
    if(fromDate || toDate){
      var stamp = new Date((item && item.timestamp) || '').getTime();
      if(fromDate && (!stamp || stamp < fromDate)) return false;
      if(toDate && (!stamp || stamp > toDate)) return false;
    }
    return true;
  });
}

function quarantineIdOf(item){
  var extra = item && item.extra ? item.extra : {};
  return String((item && item.quarantine_id) || extra.quarantine_id || '').trim();
}

function quarantineState(id){
  if(!id) return {};
  if(!state.workQueue.quarantine[id]) state.workQueue.quarantine[id] = {};
  return state.workQueue.quarantine[id];
}

function updateQuarantineState(id, patch){
  if(!id) return {};
  state.workQueue.quarantine[id] = Object.assign({}, quarantineState(id), patch || {});
  return state.workQueue.quarantine[id];
}

function renderMiniField(label, value){
  return '<div class="ec-mini"><small>' + esc(label) + '</small><strong>' + esc(value || '-') + '</strong></div>';
}

function exceptionTypeLabel(type){
  var labels = {
    upload_error: t('Lỗi tải lên', 'Upload error'),
    blocked_extension: t('Phần mở rộng bị chặn', 'Blocked extension'),
    file_too_large: t('Tệp quá lớn', 'File too large'),
    mime_rejected: t('MIME bị từ chối', 'MIME rejected'),
    move_failed: t('Không di chuyển được tệp', 'File move failed'),
    verification_failed: t('Xác minh thất bại', 'Verification failed'),
    rejected: t('Từ chối thủ công', 'Rejected manually')
  };
  return labels[type] || String(type || 'exception');
}

function renderPendingItem(item){
  var ctx = item.master_context || {};
  var summary = [item.form_code || '', item.department || '', traceSummary(ctx)].filter(Boolean).join(' · ');
  var statusHtml = renderStatusPill(item.status || 'in_review');
  var approvalSummary = item.approval_summary || {};
  var approvalBadge = '';
  if(String(approvalSummary.approval_mode || '') === 'parallel'){
    approvalBadge = '<span class="ec-badge info">' + esc(String(approvalSummary.collected_approvals || 0) + '/' + String(approvalSummary.minimum_approvals || 0) + ' ' + t('phê duyệt', 'approvals')) + '</span>';
  }
  var escalationBadge = renderEscalationBadge(item);
  return '<article class="ec-work-card">' +
    '<div class="ec-work-card-top">' +
      '<div><div class="ec-work-id">' + esc(item.record_id || item.allocation_id || '-') + '</div><div class="ec-work-sub">' + esc(summary || t('Chưa có ngữ cảnh truy xuất', 'Traceability context not available')) + '</div></div>' +
      '<div class="ec-work-status">' + approvalBadge + renderSlaBadge(item) + escalationBadge + renderAgeBadge(item.submitted_at || item.updated_at || item.created_at || '') + statusHtml + '</div>' +
    '</div>' +
    '<div class="ec-work-grid">' +
      renderMiniField(t('Người gửi', 'Submitted by'), item.submitted_by || item.updated_by || '-') +
      renderMiniField(t('Thời điểm', 'Timestamp'), fmtDateTime(item.submitted_at || item.updated_at || item.created_at || '')) +
      renderMiniField(t('Ghi chú', 'Notes'), item.notes || '-') +
    '</div>' +
    '<div class="ec-work-actions">' +
      '<button type="button" class="ec-btn primary" data-open-allocation="' + esc(item.allocation_id || '') + '" data-open-form="' + esc(item.form_code || '') + '">' + esc(t('Mở hồ sơ', 'Open record')) + '</button>' +
    '</div>' +
  '</article>';
}

function renderExceptionItem(item){
  var extra = item && item.extra ? item.extra : {};
  var quarantineId = quarantineIdOf(item);
  var qState = quarantineState(quarantineId);
  var formCode = item.form_code || extra.form_code || '';
  var allocationId = item.allocation_id || extra.allocation_id || '';
  var scope = [formCode, item.record_id || '', quarantineId].filter(Boolean).join(' · ');
  var hasUploadTarget = !!allocationId;
  var hasFormTarget = !!formCode;
  var verifyTone = qState.status === 'passed' ? 'pass' : (qState.status === 'failed' ? 'fail' : 'neutral');
  var verifySummary = '';

  if(quarantineId && qState.status){
    verifySummary = '<div class="ec-work-review ' + verifyTone + '">' +
      esc(qState.status === 'passed'
        ? t('Tệp cách ly đã được xác minh an toàn.', 'Quarantine verified successfully.')
        : t('Tệp cách ly chưa đạt. Hãy từ chối hoặc rà soát lại.', 'Quarantine verification failed. Reject or investigate before accepting.')) +
    '</div>';
  } else if(quarantineId){
    verifySummary = '<div class="ec-work-review neutral">' +
      esc(t('Tệp này đang ở vùng cách ly. Hãy xác minh trước khi chấp nhận.', 'This file is in quarantine. Verify it before acceptance.')) +
    '</div>';
  }

  return '<article class="ec-work-card warn">' +
    '<div class="ec-work-card-top">' +
      '<div><div class="ec-work-id">' + esc(exceptionTypeLabel(item.type)) + '</div><div class="ec-work-sub">' + esc(item.message || '') + '</div></div>' +
      '<span class="ec-badge fail">' + esc(t('Cần xử lý', 'Needs action')) + '</span>' +
    '</div>' +
    '<div class="ec-work-grid">' +
      renderMiniField(t('Người tải', 'Uploaded by'), item.uploaded_by || '-') +
      renderMiniField(t('Phạm vi', 'Scope'), scope || '-') +
      renderMiniField(t('Thời điểm', 'Timestamp'), fmtDateTime(item.timestamp || '')) +
    '</div>' +
    verifySummary +
    '<div class="ec-work-actions">' +
      (quarantineId ? '<button type="button" class="ec-btn ghost" data-verify-quarantine="' + esc(quarantineId) + '"' + (qState.busy ? ' disabled' : '') + '>' + esc(qState.busy ? t('Đang xác minh...', 'Verifying...') : t('Xác minh tệp cách ly', 'Verify quarantine')) + '</button>' : '') +
      (quarantineId ? '<button type="button" class="ec-btn secondary" data-accept-quarantine="' + esc(quarantineId) + '" data-accept-target="' + esc(allocationId) + '"' + ((qState.busy || qState.status !== 'passed') ? ' disabled' : '') + '>' + esc(t('Chấp nhận tệp', 'Accept file')) + '</button>' : '') +
      (quarantineId ? '<button type="button" class="ec-btn danger" data-reject-quarantine="' + esc(quarantineId) + '"' + (qState.busy ? ' disabled' : '') + '>' + esc(t('Từ chối tệp', 'Reject file')) + '</button>' : '') +
      (hasUploadTarget ? '<button type="button" class="ec-btn secondary" data-open-upload="' + esc(allocationId) + '" data-open-upload-form="' + esc(formCode) + '">' + esc(t('Mở khu vực Tải lên & Kiểm tra', 'Open Upload & Verify')) + '</button>' : '') +
      (!hasUploadTarget && hasFormTarget ? '<button type="button" class="ec-btn ghost" data-open-form-only="' + esc(formCode) + '">' + esc(t('Mở biểu mẫu liên quan', 'Open related form')) + '</button>' : '') +
    '</div>' +
  '</article>';
}

function renderMyDraftsPanel(){
  /* Get drafts from eQMS runtime if available */
  var localDrafts = (typeof window.listUserDrafts === 'function') ? window.listUserDrafts() :
    (function(){ /* inline localStorage scan */
      var out = [];
      try {
        for(var i = 0; i < localStorage.length; i++){
          var key = localStorage.key(i);
          if(!key || key.indexOf('eqms_draft_') !== 0) continue;
          var raw = localStorage.getItem(key);
          if(!raw) continue;
          try { var d = JSON.parse(raw); if(d && d.formCode) out.push(d); } catch(e){}
        }
      } catch(e){}
      out.sort(function(a, b){ return (b.savedAt || '').localeCompare(a.savedAt || ''); });
      return out;
    })();

  var drafts = [];
  var seen = {};
  localDrafts.forEach(function(d){
    var key = String(d.allocationId || '') || ('local:' + String(d.formCode || '') + ':' + String(d.savedAt || ''));
    if(seen[key]) return;
    seen[key] = true;
    drafts.push({
      formCode: d.formCode || '',
      allocationId: d.allocationId || '',
      recordId: d.recordId || '',
      entryId: d.entryId || '',
      savedAt: d.savedAt || '',
      source: 'local'
    });
  });
  (state.registry.rows || []).forEach(function(row){
    if(!row || !row.mine || !row.draft_exists || row.delivery_mode !== 'online') return;
    var key = String(row.allocation_id || '');
    if(!key || seen[key]) return;
    seen[key] = true;
    drafts.push({
      formCode: row.form_code || '',
      allocationId: row.allocation_id || '',
      recordId: row.record_id || '',
      entryId: row.entry_id || '',
      savedAt: row.draft_saved_at || row.last_action_at || row.updated_at || row.created_at || '',
      source: 'server'
    });
  });
  drafts.sort(function(a, b){ return String(b.savedAt || '').localeCompare(String(a.savedAt || '')); });

  var draftsHtml = '';
  if(!drafts.length){
    draftsHtml = '<div class="ec-work-empty"><strong>' + esc(t('Không có bản nháp', 'No drafts')) + '</strong>' + esc(t('Khi bạn lưu nháp biểu mẫu online, chúng sẽ hiện ở đây.', 'Saved online form drafts will appear here.')) + '</div>';
  } else {
    drafts.forEach(function(d){
      var ago = d.savedAt ? fmtDateTime(d.savedAt) : '—';
      draftsHtml += '<article class="ec-work-card">' +
        '<div class="ec-work-card-top">' +
          '<div><div class="ec-work-id">' + esc(d.formCode || '') + (d.recordId ? ' · ' + esc(d.recordId) : '') + '</div>' +
          '<div class="ec-work-sub">' + esc(t('Lưu lúc', 'Saved at')) + ' ' + esc(ago) + ' · ' + esc(d.source === 'server' ? t('Nháp máy chủ', 'Server draft') : t('Nháp trình duyệt', 'Browser draft')) + '</div></div>' +
          '<span class="ec-badge neutral">' + esc(t('Bản nháp', 'Draft')) + '</span>' +
        '</div>' +
        '<div class="ec-work-actions">' +
          '<button type="button" class="ec-btn primary" data-resume-draft="' + esc(d.formCode || '') + '" data-alloc="' + esc(d.allocationId || '') + '" data-record="' + esc(d.recordId || '') + '" data-entry="' + esc(d.entryId || '') + '">' + esc(t('Tiếp tục điền', 'Resume filling')) + '</button>' +
        '</div>' +
      '</article>';
    });
  }

  return '<article class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Bản nháp của tôi', 'My Drafts')) + '</h3><p>' + esc(t('Các biểu mẫu online đang điền dở. Nhấn để tiếp tục.', 'Online forms in progress. Click to resume.')) + '</p></div><span class="ec-badge neutral">' + esc(drafts.length) + '</span></div><div class="ec-work-list">' + draftsHtml + '</div></article>';
}

function renderCompletedPanel(){
  var rows = (state.registry.rows || []).filter(function(row){ return row && row.completed && row.mine; }).slice(0, 6);
  var html = '';
  if(state.registry.loading && !state.registry.loaded){
    html = '<div class="ec-work-empty"><strong>' + esc(t('Đang tải hồ sơ hoàn thành', 'Loading completed records')) + '</strong>' + esc(t('Hệ thống đang lấy các hồ sơ form đã hoàn tất gần đây.', 'The system is fetching recently completed form records.')) + '</div>';
  } else if(!rows.length){
    html = '<div class="ec-work-empty"><strong>' + esc(t('Chưa có hồ sơ hoàn thành', 'No completed records yet')) + '</strong>' + esc(t('Các hồ sơ online/offline hoàn thành gần đây sẽ hiện ở đây để tra cứu nhanh.', 'Recently completed online/offline records will appear here for quick access.')) + '</div>';
  } else {
    html = rows.map(function(row){
      return '<article class="ec-work-card">' +
        '<div class="ec-work-card-top">' +
          '<div><div class="ec-work-id">' + esc(row.record_id || '') + '</div><div class="ec-work-sub">' + esc(row.form_code || '') + ' · ' + esc(fmtDateTime(row.last_action_at || row.created_at || '')) + '</div></div>' +
          renderStatusPill(row.workflow_state || row.status || 'received') +
        '</div>' +
        '<div class="ec-work-actions">' +
          ((row.delivery_mode === 'online')
            ? '<button type="button" class="ec-btn ghost" data-reg-open="' + esc(row.form_code || '') + '" data-reg-alloc="' + esc(row.allocation_id || '') + '" data-reg-record="' + esc(row.record_id || '') + '" data-reg-entry="' + esc(row.entry_id || '') + '">' + esc(t('Mở hồ sơ', 'Open record')) + '</button>'
            : '<button type="button" class="ec-btn ghost" data-reg-download-received="' + esc(row.allocation_id || '') + '">' + esc(t('Tải bản đã nộp', 'Download received')) + '</button>') +
        '</div>' +
      '</article>';
    }).join('');
  }
  return '<article class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Đã hoàn thành gần đây', 'Recently completed')) + '</h3><p>' + esc(t('Tra cứu nhanh các hồ sơ form đã hoàn tất hoặc đã tiếp nhận.', 'Quick access to records that have been completed or formally received.')) + '</p></div><span class="ec-badge neutral">' + esc(rows.length) + '</span></div><div class="ec-work-list">' + html + '</div></article>';
}

function renderWorkQueue(container){
  ensureWorkQueueDefaults();
  var work = state.workQueue;
  var exceptions = filteredExceptions();
  var selectedDept = canSeeAllWorkQueue() ? String(work.department || '') : currentDept();
  var totalOpen = (work.pending || []).length + exceptions.length;

  var deptControl = canSeeAllWorkQueue()
    ? '<div class="ec-filter-field"><label>' + esc(t('Phòng ban', 'Department')) + '</label><select id="ec-wq-dept" class="ec-select"><option value="">' + esc(t('Tất cả phòng ban', 'All departments')) + '</option>' + DEPARTMENTS.map(function(dept){
        return '<option value="' + esc(dept.value) + '"' + (String(dept.value) === String(selectedDept) ? ' selected' : '') + '>' + esc(t(dept.label, dept.labelEn)) + '</option>';
      }).join('') + '</select></div>'
    : '<div class="ec-filter-field readonly"><label>' + esc(t('Phòng ban', 'Department')) + '</label><div class="ec-filter-value">' + esc(selectedDept || '-') + '</div></div>';

  var formOptions = '<option value="">' + esc(t('Tất cả biểu mẫu', 'All forms')) + '</option>' +
    state.forms.slice().sort(function(a, b){
      return String(a.form_code || '').localeCompare(String(b.form_code || ''));
    }).map(function(form){
      return '<option value="' + esc(form.form_code || '') + '"' + (String(form.form_code || '') === String(work.formCode || '') ? ' selected' : '') + '>' + esc((form.form_code || '') + ' · ' + (form.title_vi || form.title || form.form_code || '')) + '</option>';
    }).join('');
  var exceptionTypeOptions = [
    ['', t('Tất cả ngoại lệ', 'All exception types')],
    ['upload_error', t('Lỗi tải lên', 'Upload error')],
    ['blocked_extension', t('Phần mở rộng bị chặn', 'Blocked extension')],
    ['file_too_large', t('Tệp quá lớn', 'File too large')],
    ['mime_rejected', t('MIME bị từ chối', 'MIME rejected')],
    ['move_failed', t('Di chuyển thất bại', 'Move failed')],
    ['verification_failed', t('Xác minh thất bại', 'Verification failed')],
    ['rejected', t('Từ chối thủ công', 'Rejected manually')]
  ].map(function(row){
    return '<option value="' + esc(row[0]) + '"' + (String(row[0]) === String(work.exceptionType || '') ? ' selected' : '') + '>' + esc(row[1]) + '</option>';
  }).join('');

  var pendingHtml = work.loading && !work.loaded
    ? '<div class="ec-work-empty"><strong>' + esc(t('Đang tải hàng chờ duyệt', 'Loading pending queue')) + '</strong>' + esc(t('Hệ thống đang lấy các hồ sơ đang chờ xem xét.', 'The system is fetching records currently waiting for review.')) + '</div>'
    : ((work.pending || []).length ? work.pending.map(renderPendingItem).join('') : '<div class="ec-work-empty"><strong>' + esc(t('Không có hồ sơ chờ duyệt', 'No pending evidence')) + '</strong>' + esc(t('Hàng chờ hiện rỗng với bộ lọc đang chọn.', 'The queue is empty for the current filters.')) + '</div>');

  var exceptionHtml = work.loading && !work.loaded
    ? '<div class="ec-work-empty"><strong>' + esc(t('Đang tải hàng đợi tải lên', 'Loading upload queue')) + '</strong>' + esc(t('Hệ thống đang lấy các tệp bị chặn hoặc không qua kiểm tra.', 'The system is fetching files that were blocked or failed verification.')) + '</div>'
    : (exceptions.length ? exceptions.map(renderExceptionItem).join('') : '<div class="ec-work-empty"><strong>' + esc(t('Không có ngoại lệ tải lên', 'No upload exception')) + '</strong>' + esc(t('Không có tệp nào cần rà soát trong khoảng thời gian đang chọn.', 'There are no uploads to investigate in the selected time window.')) + '</div>');

  container.innerHTML =
    '<div class="ec-board">' +
      '<section class="ec-board-hero">' +
        '<div class="ec-board-copy">' +
          '<div class="ec-board-kicker">' + esc(t('Việc của tôi', 'My Work')) + '</div>' +
          '<h2>' + esc(t('Hàng chờ xử lý: hồ sơ, tải lên & chứng cứ', 'Action queue: records, uploads & evidence')) + '</h2>' +
          '<p>' + esc(t('Xem xét hồ sơ chờ duyệt, xử lý tệp cách ly, bắt đầu form mới hoặc tải lên chứng cứ ngay tại đây.', 'Review pending records, resolve quarantined uploads, start new forms, or upload evidence — all in one place.')) + '</p>' +
          (work.error ? '<div class="ec-inline-alert">' + esc(work.error) + '</div>' : '') +
        '</div>' +
        '<div class="ec-toolbar-actions" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="ec-btn primary" id="ec-mw-new-form">' + esc(t('Bắt đầu form mới', '+ New form')) + '</button>' +
          '<button type="button" class="ec-btn secondary" id="ec-mw-goto-codes">' + esc(t('Cấp mã mới', 'Issue code')) + '</button>' +
          '<button type="button" class="ec-btn ghost" id="ec-mw-goto-evidence">' + esc(t('Kho chứng cứ', 'Evidence vault')) + '</button>' +
        '</div>' +
        '<div class="ec-kpi-grid">' +
          '<div class="ec-kpi-card primary"><small>' + esc(t('Tổng việc đang mở', 'Open actions')) + '</small><strong>' + esc(totalOpen) + '</strong><span>' + esc(t('Tổng số mục cần xử lý trong phạm vi đang lọc.', 'Total items needing attention.')) + '</span></div>' +
          '<div class="ec-kpi-card warning"><small>' + esc(t('Chờ duyệt', 'Pending review')) + '</small><strong>' + esc((work.pending || []).length) + '</strong><span>' + esc(t('Hồ sơ đang ở trạng thái xem xét.', 'Records currently in review.')) + '</span></div>' +
          '<div class="ec-kpi-card danger"><small>' + esc(t('Ngoại lệ tải lên', 'Upload exceptions')) + '</small><strong>' + esc(exceptions.length) + '</strong><span>' + esc(t('Tệp bị chặn hoặc xác minh thất bại.', 'Blocked or failed verification files.')) + '</span></div>' +
          '<div class="ec-kpi-card neutral"><small>' + esc(t('Bản nháp cục bộ', 'Local drafts')) + '</small><strong>' + esc(typeof window.listUserDrafts === 'function' ? (window.listUserDrafts() || []).length : 0) + '</strong><span>' + esc(t('Bản nháp form lưu trong trình duyệt này.', 'Form drafts saved in this browser.')) + '</span></div>' +
        '</div>' +
      '</section>' +
      '<section class="ec-board-toolbar">' +
        deptControl +
        '<div class="ec-filter-field"><label>' + esc(t('Biểu mẫu', 'Form')) + '</label><select id="ec-wq-form" class="ec-select">' + formOptions + '</select></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Loại ngoại lệ', 'Exception type')) + '</label><select id="ec-wq-type" class="ec-select">' + exceptionTypeOptions + '</select></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Từ ngày', 'From date')) + '</label><input id="ec-wq-from" class="ec-input" type="date" value="' + esc(work.dateFrom || '') + '"></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Đến ngày', 'To date')) + '</label><input id="ec-wq-to" class="ec-input" type="date" value="' + esc(work.dateTo || '') + '"></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Khoảng ngoại lệ', 'Exception window')) + '</label><select id="ec-wq-days" class="ec-select">' + [7, 30, 90].map(function(days){
          return '<option value="' + days + '"' + (Number(work.days) === Number(days) ? ' selected' : '') + '>' + esc(days + ' ' + t('ngày', 'days')) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="ec-toolbar-actions"><button type="button" class="ec-btn secondary" id="ec-wq-refresh">' + esc(work.loading ? t('Đang tải...', 'Refreshing...') : t('Làm mới', 'Refresh')) + '</button></div>' +
      '</section>' +
      '<section class="ec-board-grid">' +
        renderMyDraftsPanel() +
        renderCompletedPanel() +
        '<article class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Hồ sơ chờ duyệt', 'Pending evidence')) + '</h3><p>' + esc(t('Mở thẳng khu vực xử lý của hồ sơ để xem xét, từ chối hoặc mở lại.', 'Jump straight into the record workspace to review, reject, or reopen.')) + '</p></div><span class="ec-badge info">' + esc((work.pending || []).length) + '</span></div><div class="ec-work-list">' + pendingHtml + '</div></article>' +
        '<article class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Hàng đợi kiểm soát tải lên', 'Upload hardening queue')) + '</h3><p>' + esc(t('Hàng đợi này bám theo bộ lọc phòng ban và biểu mẫu khi hệ thống xác định được mã cấp phát. Bạn có thể xác minh, chấp nhận hoặc từ chối trực tiếp ngay tại đây.', 'This queue follows the selected department and form whenever the backend can resolve the allocation. You can verify, accept, or reject directly from here.')) + '</p></div><span class="ec-badge warn">' + esc(exceptions.length) + '</span></div><div class="ec-work-list">' + exceptionHtml + '</div></article>' +
      '</section>' +
    '</div>';
  bindWorkQueue(container);
}

function verifyQuarantine(quarantineId){
  if(!quarantineId) return Promise.resolve(null);
  updateQuarantineState(quarantineId, { busy:true });
  requestRender();
  return api('upload_verify_quarantine', { quarantine_id: quarantineId }, 'POST').then(function(resp){
    updateQuarantineState(quarantineId, {
      busy:false,
      status:(resp && resp.status === 'verified') ? 'passed' : ((resp && resp.ok) ? 'passed' : 'failed'),
      checks:(resp && resp.checks) || [],
      metadata:(resp && resp.metadata) || null
    });
    showToast(resp && resp.ok ? t('Tệp cách ly đã được xác minh an toàn.', 'Quarantine verified successfully.') : t('Tệp cách ly không đạt.', 'Quarantine verification failed.'), resp && resp.ok ? 'success' : 'warn');
    if(state.workspaceMode === 'mine') requestRender();
    return resp;
  }).catch(function(){
    updateQuarantineState(quarantineId, { busy:false, status:'failed' });
    showToast(t('Không thể xác minh tệp cách ly.', 'Could not verify quarantine.'), 'error');
    if(state.workspaceMode === 'mine') requestRender();
    return null;
  });
}

function acceptQuarantine(quarantineId, targetDir){
  if(!quarantineId) return Promise.resolve(null);
  updateQuarantineState(quarantineId, { busy:true });
  requestRender();
  return api('upload_accept', { quarantine_id: quarantineId, target_dir: targetDir || '' }, 'POST').then(function(resp){
    updateQuarantineState(quarantineId, { busy:false, accepted:!!(resp && resp.ok) });
    showToast(resp && resp.ok ? t('Đã chấp nhận tệp cách ly.', 'Quarantine file accepted.') : t('Không thể chấp nhận tệp.', 'Could not accept the file.'), resp && resp.ok ? 'success' : 'error');
    return loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); return resp; });
  }).catch(function(){
    updateQuarantineState(quarantineId, { busy:false });
    showToast(t('Không thể chấp nhận tệp.', 'Could not accept the file.'), 'error');
    if(state.workspaceMode === 'mine') requestRender();
    return null;
  });
}

function rejectQuarantine(quarantineId){
  if(!quarantineId) return Promise.resolve(null);
  return openPromptDialog({
    title:t('Từ chối tệp cách ly', 'Reject quarantine file'),
    message:t('Nhập lý do từ chối tệp này.', 'Enter a reason for rejecting this file.'),
    confirmLabel:t('Từ chối', 'Reject'),
    cancelLabel:t('Hủy', 'Cancel'),
    required:true,
    multiline:true
  }).then(function(reason){
    if(!reason) return null;
    updateQuarantineState(quarantineId, { busy:true });
    requestRender();
    return api('upload_reject', { quarantine_id: quarantineId, reason: reason }, 'POST').then(function(resp){
      updateQuarantineState(quarantineId, { busy:false, rejected:!!(resp && resp.ok) });
      showToast(resp && resp.ok ? t('Đã từ chối tệp cách ly.', 'Quarantine file rejected.') : t('Không thể từ chối tệp.', 'Could not reject the file.'), resp && resp.ok ? 'success' : 'error');
      return loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); return resp; });
    }).catch(function(){
      updateQuarantineState(quarantineId, { busy:false });
      showToast(t('Không thể từ chối tệp.', 'Could not reject the file.'), 'error');
      if(state.workspaceMode === 'mine') requestRender();
      return null;
    });
  });
}

function bindWorkQueue(container){
  var deptEl = document.getElementById('ec-wq-dept');
  if(deptEl) deptEl.onchange = function(){
    state.workQueue.department = deptEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var formEl = document.getElementById('ec-wq-form');
  if(formEl) formEl.onchange = function(){
    state.workQueue.formCode = formEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var typeEl = document.getElementById('ec-wq-type');
  if(typeEl) typeEl.onchange = function(){
    state.workQueue.exceptionType = typeEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var fromEl = document.getElementById('ec-wq-from');
  if(fromEl) fromEl.onchange = function(){
    state.workQueue.dateFrom = fromEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var toEl = document.getElementById('ec-wq-to');
  if(toEl) toEl.onchange = function(){
    state.workQueue.dateTo = toEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var daysEl = document.getElementById('ec-wq-days');
  if(daysEl) daysEl.onchange = function(){
    state.workQueue.days = Number(daysEl.value || 30) || 30;
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  var refreshBtn = document.getElementById('ec-wq-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  };

  Array.prototype.forEach.call(container.querySelectorAll('[data-open-allocation]'), function(btn){
    btn.onclick = function(){ openFormWorkspace(btn.getAttribute('data-open-form') || '', btn.getAttribute('data-open-allocation') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-open-upload]'), function(btn){
    btn.onclick = function(){ openUploadWorkspace(btn.getAttribute('data-open-upload') || '', btn.getAttribute('data-open-upload-form') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-open-form-only]'), function(btn){
    btn.onclick = function(){ openFormWorkspace(btn.getAttribute('data-open-form-only') || '', ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-verify-quarantine]'), function(btn){
    btn.onclick = function(){ verifyQuarantine(btn.getAttribute('data-verify-quarantine') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-accept-quarantine]'), function(btn){
    btn.onclick = function(){ acceptQuarantine(btn.getAttribute('data-accept-quarantine') || '', btn.getAttribute('data-accept-target') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reject-quarantine]'), function(btn){
    btn.onclick = function(){ rejectQuarantine(btn.getAttribute('data-reject-quarantine') || ''); };
  });

  /* Resume draft buttons */
  Array.prototype.forEach.call(container.querySelectorAll('[data-resume-draft]'), function(btn){
    btn.onclick = function(){
      var code = btn.getAttribute('data-resume-draft') || '';
      var alloc = btn.getAttribute('data-alloc') || '';
      if(code){
        openEqmsRuntime(code, {
          allocationId: alloc,
          recordId: btn.getAttribute('data-record') || '',
          entryId: btn.getAttribute('data-entry') || '',
          editMode: true,
          editOrigin: 'draft_resume'
        });
      }
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-open]'), function(btn){
    btn.onclick = function(){
      openEqmsRuntime(btn.getAttribute('data-reg-open') || '', {
        allocationId: btn.getAttribute('data-reg-alloc') || '',
        recordId: btn.getAttribute('data-reg-record') || '',
        entryId: btn.getAttribute('data-reg-entry') || '',
        editMode: false,
        editOrigin: 'view_existing'
      });
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-download-received]'), function(btn){
    btn.onclick = function(){
      var allocationId = btn.getAttribute('data-reg-download-received') || '';
      if(!allocationId) return;
      window.open('api.php?action=form_fill_download_received&allocation_id=' + encodeURIComponent(allocationId), '_blank');
    };
  });

  /* My Work quick-action buttons */
  var newFormBtn = document.getElementById('ec-mw-new-form');
  if(newFormBtn) newFormBtn.onclick = function(){ state.workspaceMode = 'forms'; requestRender(); };
  var gotoCodesBtn = document.getElementById('ec-mw-goto-codes');
  if(gotoCodesBtn) gotoCodesBtn.onclick = function(){ state.workspaceMode = 'codes'; requestRender(); loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var gotoEvidenceBtn = document.getElementById('ec-mw-goto-evidence');
  if(gotoEvidenceBtn) gotoEvidenceBtn.onclick = function(){ state.workspaceMode = 'evidence'; requestRender(); };
}

function render(container){
  var workCount = state.workQueue.loaded ? ((state.workQueue.pending || []).length + (state.workQueue.exceptions || []).length) : 0;
  var m = state.workspaceMode;

  container.innerHTML =
    '<div class="ec-tabs" id="ec-tabs">' +
      '<button type="button" class="ec-tab' + (m === 'mine' ? ' active' : '') + '" data-tab="mine">' +
        esc(t('Việc của tôi', 'My Work')) +
        (workCount ? '<span class="ec-tab-badge">' + workCount + '</span>' : '') +
      '</button>' +
      '<button type="button" class="ec-tab' + (m === 'forms' ? ' active' : '') + '" data-tab="forms">' +
        esc(t('Biểu mẫu', 'Forms')) +
      '</button>' +
      '<button type="button" class="ec-tab' + (m === 'codes' ? ' active' : '') + '" data-tab="codes">' +
        esc(t('Tạo & Quản lý mã', 'Codes')) +
      '</button>' +
      '<button type="button" class="ec-tab' + (m === 'evidence' ? ' active' : '') + '" data-tab="evidence">' +
        esc(t('Chứng cứ', 'Evidence')) +
      '</button>' +
    '</div>' +
    '<div class="ec-shell"><div class="ec-workspace ec-workspace-full" id="ec-workspace"></div></div>';
  bindSidebar(container);
  renderWorkspacePane();
}

function renderSidebar(){
  var forms = filterForms();
  var categories = {};
  /* Form categories: loaded from HmRegistry → 'form_category' (single source of truth) */
  var cats = ['all'];
  var catLabels = { all:t('Tất cả','All') };
  if(window.HmRegistry && typeof HmRegistry.selectOptions === 'function'){
    var regCats = HmRegistry.selectOptions('form_category') || [];
    regCats.forEach(function(o){ cats.push(o.value); catLabels[o.value] = o.label || o.value; });
  }
  if(cats.length <= 1){ cats = ['all','quality','production','maintenance','hr','logistics','safety','other']; catLabels = { all:t('Tất cả','All'), quality:t('Chất lượng','Quality'), production:t('Sản xuất','Production'), maintenance:t('Bảo trì','Maintenance'), hr:t('Nhân sự','HR'), logistics:t('Kho vận','Logistics'), safety:t('An toàn','Safety'), other:t('Khác','Other') }; }
  var workCount = state.workQueue.loaded ? ((state.workQueue.pending || []).length + (state.workQueue.exceptions || []).length) : 0;

  forms.forEach(function(form){
    var category = form.category || 'other';
    if(!categories[category]) categories[category] = [];
    categories[category].push(form);
  });

  var formListHtml = '';
  if(!forms.length){
    formListHtml = '<div style="padding:24px;text-align:center;color:var(--ec-text-muted);font-size:12px">' + esc(t('Không tìm thấy biểu mẫu nào', 'No forms found')) + '</div>';
  } else {
    Object.keys(categories).sort().forEach(function(category){
      var meta = FORM_COLORS[category] || FORM_COLORS.other;
      formListHtml += categories[category].map(function(form){
        var isActive = state.selectedFormCode === form.form_code;
        return '<div class="ec-form-item' + (isActive ? ' active' : '') + '" data-form="' + esc(form.form_code) + '">' +
          '<div class="ec-form-icon" style="background:' + meta.bg + '">' + esc(meta.icon) + '</div>' +
          '<div class="ec-form-info"><div class="ec-form-code">' + esc(form.form_code) + '</div><div class="ec-form-name">' + esc(form.title_vi || form.title || form.form_code) + '</div></div>' +
          '<span class="ec-mode-badge ' + (form.online === false ? 'offline' : 'online') + '">' + esc(form.online === false ? t('Ngoại tuyến', 'Offline') : t('Trực tuyến', 'Online')) + '</span>' +
        '</div>';
      }).join('');
    });
  }

  var allocHtml = '';
  if(state.selectedFormCode && state.workspaceMode === 'form' && state.allocations.length){
    allocHtml = state.allocations.map(function(allocation){
      var isActive = state.selectedAllocationId === allocation.allocation_id;
      return '<div class="ec-alloc-item' + (isActive ? ' active' : '') + '" data-alloc="' + esc(allocation.allocation_id) + '">' +
        '<div style="flex:1;min-width:0"><div class="ec-alloc-id">' + esc(allocation.record_id || '') + '</div><div class="ec-alloc-meta">' + esc(allocation.department || '') + ' · ' + esc(statusLabel(allocation.status || 'allocated')) + '</div></div>' +
        renderStatusPill(allocation.status || 'allocated') +
      '</div>';
    }).join('');
  }

  return '<aside class="ec-sidebar" role="navigation" aria-label="' + esc(t('Danh mục biểu mẫu', 'Form catalog')) + '">' +
    '<div class="ec-sidebar-header">' +
      '<div class="ec-sidebar-title">' + esc(t('Danh mục biểu mẫu', 'Form catalog')) + '</div>' +
      '<input class="ec-search" id="ec-search" type="search" value="' + esc(state.search) + '" placeholder="' + esc(t('Tìm biểu mẫu...', 'Search forms...')) + '">' +
    '</div>' +
    '<div class="ec-filters" id="ec-filters">' + cats.map(function(cat){
      return '<button type="button" class="ec-chip' + (state.filter === cat ? ' active' : '') + '" data-filter="' + cat + '">' + esc(catLabels[cat] || cat) + '</button>';
    }).join('') + '</div>' +
    '<div class="ec-form-list" id="ec-form-list">' + formListHtml + '</div>' +
    (state.selectedFormCode && state.workspaceMode === 'form' ? '<div class="ec-alloc-section"><div class="ec-alloc-section-head"><span>' + esc(t('Mã đã cấp', 'Allocations')) + ' (' + state.allocations.length + ')</span></div>' + (allocHtml || '<div style="padding:8px 16px;font-size:11px;color:var(--ec-text-muted)">' + esc(t('Chưa có mã', 'None yet')) + '</div>') + '</div>' : '') +
  '</aside>';
}

/* renderEqmsFormList removed — was dead code (never called). Forms now load dynamically via eqmsForms() from API. */

function renderEqmsHub(container){
  var forms = eqmsForms();
  var html =
    '<div class="ec-eqms-hub">' +
      '<section class="ec-board-hero">' +
        '<div class="ec-board-copy">' +
          '<div class="ec-board-kicker">' + esc(t('Online Form', 'Online Form')) + '</div>' +
          '<h2>' + esc(t('Trung tâm vận hành eQMS form', 'eQMS form operations hub')) + '</h2>' +
          '<p>' + esc(t('Tạo mới hồ sơ online hoặc offline từ cùng một form, tiếp tục bản nháp đang dở, và chuyển sang sổ quản lý mã đã cấp để theo dõi toàn bộ vòng đời.', 'Start online or offline records from the same form, resume in-progress drafts, and jump into the issued-code registry to track the full lifecycle.')) + '</p>' +
        '</div>' +
        '<div class="ec-toolbar-actions">' +
          '<button type="button" class="ec-btn primary" id="ec-eqms-create-form">' + esc(t('Tạo form eQMS mới', 'Create new eQMS form')) + '</button>' +
          '<button type="button" class="ec-btn ghost" id="ec-eqms-builder-new">' + esc(t('Mở editor form HTML', 'Open HTML form editor')) + '</button>' +
        '</div>' +
        '<div class="ec-kpi-grid">' +
          '<div class="ec-kpi-card primary"><small>' + esc(t('Form eQMS', 'eQMS forms')) + '</small><strong>' + esc(forms.length) + '</strong><span>' + esc(t('Biểu mẫu có thể vận hành theo luồng điện tử hoặc kết hợp điện tử/Excel.', 'Forms available in electronic or hybrid electronic/Excel mode.')) + '</span></div>' +
          '<div class="ec-kpi-card neutral"><small>' + esc(t('Bản nháp cục bộ', 'Local drafts')) + '</small><strong>' + esc((typeof window.listUserDrafts === 'function' ? (window.listUserDrafts() || []).length : 0)) + '</strong><span>' + esc(t('Các bản nháp đang lưu trên trình duyệt này để tiếp tục điền.', 'Drafts saved in this browser and ready to resume.')) + '</span></div>' +
          '<div class="ec-kpi-card warning"><small>' + esc(t('Mã đã cấp', 'Issued codes')) + '</small><strong>' + esc(state.registry.summary.issued_count || 0) + '</strong><span>' + esc(t('Tổng số hồ sơ form đang được hệ thống kiểm soát.', 'Total form records currently under system control.')) + '</span></div>' +
        '</div>' +
      '</section>' +
      '<section class="ec-board-grid">';

  if(!forms.length){
    html += '<article class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Chưa có form eQMS', 'No eQMS forms')) + '</h3><p>' + esc(t('Danh mục form chưa tải được hoặc chưa có schema online/offline tương ứng.', 'The form catalog is not loaded or there are no matching online/offline definitions yet.')) + '</p></div></div></article>';
  } else {
    forms.forEach(function(form){
      var draft = findLocalDraftForForm(form.form_code);
      var hasOnline = form.online !== false;
      var hasOffline = !!(form.offline_fallback_available || form.blank_path || form.linked_excel_form || form.offline_form_code);
      html += '<article class="ec-panel ec-eqms-card">' +
        '<div class="ec-panel-head">' +
          '<div><h3>' + esc((form.form_code || '') + ' · ' + (form.title || form.form_code || '')) + '</h3><p>' + esc(form.description_vi || form.description || '') + '</p></div>' +
          '<div class="ec-eqms-meta">' +
            '<span class="ec-badge info">' + esc(form.version || 'V1') + '</span>' +
            (form.sop_ref ? '<span class="ec-badge neutral">' + esc(form.sop_ref) + '</span>' : '') +
            (hasOnline ? '<span class="ec-badge success">' + esc(t('Online', 'Online')) + '</span>' : '') +
            (hasOffline ? '<span class="ec-badge warn">' + esc(t('Offline', 'Offline')) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="ec-eqms-actions">' +
          (hasOnline ? '<button type="button" class="ec-btn primary" data-eqms-new-online="' + esc(form.form_code || '') + '">' + esc(t('Tạo mới online', 'New online record')) + '</button>' : '') +
          (hasOffline ? '<button type="button" class="ec-btn secondary" data-eqms-new-offline="' + esc(form.form_code || '') + '">' + esc(t('Tạo mới offline', 'New offline record')) + '</button>' : '') +
          (draft ? '<button type="button" class="ec-btn ghost" data-eqms-resume="' + esc(form.form_code || '') + '" data-eqms-resume-alloc="' + esc(draft.allocationId || '') + '" data-eqms-resume-record="' + esc(draft.recordId || '') + '" data-eqms-resume-entry="' + esc(draft.entryId || '') + '">' + esc(t('Tiếp tục bản nháp', 'Resume draft')) + '</button>' : '') +
          '<button type="button" class="ec-btn ghost" data-eqms-edit-template="' + esc(form.form_code || '') + '">' + esc(t('Chỉnh sửa mẫu', 'Edit template')) + '</button>' +
          '<button type="button" class="ec-btn ghost" data-eqms-open-registry="' + esc(form.form_code || '') + '">' + esc(t('Quản lý mã đã cấp', 'Manage issued codes')) + '</button>' +
        '</div>' +
      '</article>';
    });
  }

  html += '</section></div>';
  container.innerHTML = html;

  Array.prototype.forEach.call(container.querySelectorAll('[data-eqms-new-online]'), function(btn){
    btn.onclick = function(){ startNewEqmsOnline(btn.getAttribute('data-eqms-new-online') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-eqms-new-offline]'), function(btn){
    btn.onclick = function(){ startNewEqmsOffline(btn.getAttribute('data-eqms-new-offline') || ''); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-eqms-resume]'), function(btn){
    btn.onclick = function(){
      openEqmsRuntime(btn.getAttribute('data-eqms-resume') || '', {
        allocationId: btn.getAttribute('data-eqms-resume-alloc') || '',
        recordId: btn.getAttribute('data-eqms-resume-record') || '',
        entryId: btn.getAttribute('data-eqms-resume-entry') || '',
        editMode: true,
        editOrigin: 'draft_resume'
      });
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-eqms-open-registry]'), function(btn){
    btn.onclick = function(){
      state.registry.formCode = btn.getAttribute('data-eqms-open-registry') || '';
      state.registry.page = 1;
      state.workspaceMode = 'codes';
      requestRender();
      loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); });
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-eqms-edit-template]'), function(btn){
    btn.onclick = function(){ openEqmsTemplateEditor(btn.getAttribute('data-eqms-edit-template') || ''); };
  });
  var newBuilderBtn = document.getElementById('ec-eqms-builder-new');
  if(newBuilderBtn) newBuilderBtn.onclick = function(){
    var firstHtmlForm = forms.find(function(form){
      return !!resolveEqmsHtmlDocument(form && form.form_code);
    });
    if(firstHtmlForm){
      openEqmsTemplateEditor(firstHtmlForm.form_code || '');
      return;
    }
    showToast(t('Chưa có mẫu HTML nào sẵn sàng để mở editor.', 'No governed HTML form template is ready for editing yet.'), 'warn');
  };

  /* Create form button */
  var createBtn = document.getElementById('ec-eqms-create-form');
  if(createBtn) createBtn.onclick = function(){ openEqmsFormCreator(); };
}

/* ── eQMS Form Creator Wizard (Module-Builder approach) ── */
function openEqmsFormCreator(){
  var overlay = document.createElement('div');
  overlay.className = 'ec-modal-overlay';
  overlay.innerHTML =
    '<div class="ec-modal ec-modal-lg">' +
      '<div class="ec-modal-header">' +
        '<h3>' + esc(t('Tạo form eQMS mới', 'Create new eQMS form')) + '</h3>' +
        '<button type="button" class="ec-modal-close" data-action="close">&times;</button>' +
      '</div>' +
      '<div class="ec-modal-body">' +
        '<p style="color:var(--text-secondary,#64748b);font-size:13px;margin:0 0 var(--space-4,16px)">' + esc(t('Điền thông tin cơ bản để tạo JSON schema mới. Sau đó thêm sections và fields qua form builder.', 'Fill in basic info to generate a new JSON schema. Then add sections and fields via the form builder.')) + '</p>' +
        '<div style="display:grid;gap:14px;grid-template-columns:1fr 1fr">' +
          '<div><label class="ec-field-label">' + esc(t('Mã form', 'Form Code')) + ' *</label><input id="ec-fc-code" class="ec-input" placeholder="VD: FRM-701-AUDIT" style="font-family:monospace"></div>' +
          '<div><label class="ec-field-label">' + esc(t('Phiên bản', 'Version')) + '</label><input id="ec-fc-version" class="ec-input" value="V1"></div>' +
          '<div style="grid-column:1/-1"><label class="ec-field-label">' + esc(t('Tên form (EN)', 'Form Title (EN)')) + ' *</label><input id="ec-fc-title" class="ec-input" placeholder="e.g. Internal Audit Report"></div>' +
          '<div style="grid-column:1/-1"><label class="ec-field-label">' + esc(t('Tên form (VI)', 'Form Title (VI)')) + '</label><input id="ec-fc-title-vi" class="ec-input" placeholder="VD: Báo cáo đánh giá nội bộ"></div>' +
          '<div><label class="ec-field-label">' + esc(t('Danh mục', 'Category')) + '</label><select id="ec-fc-category" class="ec-select"><option value="quality">Quality</option><option value="production">Production</option><option value="hr">HR</option><option value="logistics">Logistics</option><option value="safety">Safety</option><option value="other">Other</option></select></div>' +
          '<div><label class="ec-field-label">' + esc(t('SOP tham chiếu', 'SOP Reference')) + '</label><input id="ec-fc-sop" class="ec-input" placeholder="VD: SOP-601"></div>' +
          '<div><label class="ec-field-label">' + esc(t('Record Type', 'Record Type')) + '</label><input id="ec-fc-record-type" class="ec-input" placeholder="VD: AUDIT, NCR, CAPA"></div>' +
          '<div><label class="ec-field-label">' + esc(t('Chủ sở hữu', 'Owner')) + '</label><input id="ec-fc-owner" class="ec-input" placeholder="VD: QA / ENG"></div>' +
          '<div style="grid-column:1/-1"><label class="ec-field-label">' + esc(t('Mô tả (EN)', 'Description (EN)')) + '</label><textarea id="ec-fc-desc" class="ec-input" rows="2" placeholder="Brief description of the form purpose"></textarea></div>' +
        '</div>' +
        '<div style="margin-top:var(--space-4,16px);padding:14px;background:var(--bg-surface-alt,#f8fafc);border-radius:10px;border:1px solid var(--border,#e2e8f0)">' +
          '<div style="font-size:var(--text-xs,.75rem);font-weight:var(--font-display-weight,700);color:var(--text-secondary,#334155);margin-bottom:var(--space-2,8px)">' + esc(t('Template khởi tạo', 'Starter Template')) + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<label class="ec-radio-card"><input type="radio" name="ec-fc-template" value="blank" checked> ' + esc(t('Trống', 'Blank')) + '</label>' +
            '<label class="ec-radio-card"><input type="radio" name="ec-fc-template" value="scar"> SCAR (FRM-403)</label>' +
            '<label class="ec-radio-card"><input type="radio" name="ec-fc-template" value="ncr"> NCR (FRM-631)</label>' +
            '<label class="ec-radio-card"><input type="radio" name="ec-fc-template" value="capa"> CAPA (FRM-641)</label>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ec-modal-footer">' +
        '<button type="button" class="ec-btn ghost" data-action="close">' + esc(t('Hủy', 'Cancel')) + '</button>' +
        '<button type="button" class="ec-btn primary" data-action="create">' + esc(t('Tạo schema và mở builder', 'Create schema & open builder')) + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e){
    var action = e.target.getAttribute('data-action') || '';
    if(action === 'close' || e.target === overlay){
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
      return;
    }
    if(action === 'create'){
      var code = String((document.getElementById('ec-fc-code') || {}).value || '').trim().toUpperCase();
      var title = String((document.getElementById('ec-fc-title') || {}).value || '').trim();
      if(!code || !title){
        showToast(t('Mã form và tên form là bắt buộc.', 'Form code and title are required.'), 'warn');
        return;
      }
      var templateVal = '';
      var templateRadios = overlay.querySelectorAll('[name="ec-fc-template"]');
      for(var i = 0; i < templateRadios.length; i++){ if(templateRadios[i].checked){ templateVal = templateRadios[i].value; break; } }

      var newSchema = buildNewFormSchema({
        form_code: code,
        title: title,
        title_vi: String((document.getElementById('ec-fc-title-vi') || {}).value || '').trim(),
        version: String((document.getElementById('ec-fc-version') || {}).value || 'V1').trim(),
        category: String((document.getElementById('ec-fc-category') || {}).value || 'quality').trim(),
        sop_ref: String((document.getElementById('ec-fc-sop') || {}).value || '').trim(),
        record_type: String((document.getElementById('ec-fc-record-type') || {}).value || '').trim().toUpperCase(),
        owner: String((document.getElementById('ec-fc-owner') || {}).value || '').trim(),
        description: String((document.getElementById('ec-fc-desc') || {}).value || '').trim(),
        template: templateVal
      });

      /* Save schema to server */
      apiCall('eqms_form_schema_save', { schema: newSchema }, 'POST', 15000)
        .then(function(resp){
          if(resp && resp.ok){
            showToast(t('Đã tạo schema ' + code + '. Mở form builder...', 'Created schema ' + code + '. Opening form builder...'), 'success');
          } else {
            /* Fallback: save to localStorage */
            try { localStorage.setItem('hesem:builder:' + code, JSON.stringify({ saved_at: new Date().toISOString(), schema: newSchema })); } catch(e){}
            showToast(t('Đã lưu schema cục bộ. API chưa sẵn sàng — sẽ đồng bộ sau.', 'Schema saved locally. API not ready — will sync later.'), 'info');
          }
          if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
          /* Open the form builder for the new schema */
          if(typeof window._ecOpenEqmsBuilder === 'function'){
            window._ecOpenEqmsBuilder(code, newSchema);
          } else {
            openEqmsRuntime(code, { editMode: true, createIfMissing: true });
          }
        })
        .catch(function(){
          try { localStorage.setItem('hesem:builder:' + code, JSON.stringify({ saved_at: new Date().toISOString(), schema: newSchema })); } catch(e){}
          showToast(t('Đã lưu schema cục bộ.', 'Schema saved locally.'), 'info');
          if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
          openEqmsRuntime(code, { editMode: true, createIfMissing: true });
        });
    }
  });
}

function buildNewFormSchema(opts){
  var schema = {
    '$schema': 'hesem-eqms-form/v1',
    form_code: opts.form_code,
    title: opts.title,
    title_vi: opts.title_vi || '',
    version: opts.version || 'V1',
    version_int: 1,
    category: opts.category || 'quality',
    frequency: 'per_event',
    online: true,
    delivery_mode: 'online',
    sop_ref: opts.sop_ref || '',
    record_type: opts.record_type || '',
    owner: opts.owner || '',
    approver: opts.owner || '',
    description: opts.description || '',
    description_vi: opts.title_vi || '',
    roles_allowed: {
      create: ['admin', 'qa_manager', 'quality_engineer'],
      fill: ['admin', 'qa_manager', 'quality_engineer'],
      review: ['qa_manager'],
      approve: ['qa_manager'],
      view: ['all']
    },
    workflow: {
      type: 'sequential',
      states: ['draft', 'submitted', 'in_review', 'approved', 'closed', 'voided'],
      transitions: {
        draft: { next: ['submitted'], roles: ['fill'] },
        submitted: { next: ['in_review'], roles: ['review'] },
        in_review: { next: ['approved', 'draft'], roles: ['approve'] },
        approved: { next: ['closed', 'voided'], roles: ['approve'] },
        closed: { next: [], terminal: true },
        voided: { next: [], terminal: true }
      }
    },
    sections: [
      {
        id: 'general',
        title: 'General Information',
        title_vi: 'Thông tin chung',
        description: 'Basic record identification and context.',
        description_vi: 'Nhận diện hồ sơ và ngữ cảnh cơ bản.',
        color: 'var(--blue-light,#1971c2)',
        field_ids: ['record_date', 'department', 'description_field']
      }
    ],
    fields: [
      { id: 'record_date', type: 'date', label: 'Record Date', label_vi: 'Ngày ghi nhận', required: true, default: 'today', audit_tracked: true },
      { id: 'department', type: 'select', label: 'Department', label_vi: 'Phòng ban', required: true, options: _registryOptions('department_code'), audit_tracked: true },
      { id: 'description_field', type: 'textarea', label: 'Description', label_vi: 'Mô tả', width: 'full', required: true, audit_tracked: true }
    ],
    signature_blocks: [
      { id: 'originator', label: 'Người tạo', label_en: 'Originator', meaning: 'Authored', required_on_submit: true, roles: ['fill'] },
      { id: 'approver', label: 'Người phê duyệt', label_en: 'Approver', meaning: 'Approved', required_on_approve: true, roles: ['approve'] }
    ],
    auto_fields: ['record_id', 'submitted_by', 'submitted_at', 'entry_id'],
    cross_validation: [],
    evidence_requirements: []
  };

  /* Apply template sections if selected */
  if(opts.template === 'scar' || opts.template === 'ncr' || opts.template === 'capa'){
    schema.sections.push({
      id: 'findings',
      title: 'Findings & Containment',
      title_vi: 'Phát hiện và ngăn chặn',
      color: 'var(--red-light,#e03131)',
      field_ids: ['finding_description', 'severity', 'containment_action']
    });
    schema.fields.push(
      { id: 'finding_description', type: 'textarea', label: 'Finding Description', label_vi: 'Mô tả phát hiện', width: 'full', required: true, audit_tracked: true },
      { id: 'severity', type: 'select', label: 'Severity', label_vi: 'Muc do', required: true, options: _registryOptions('default_severity'), audit_tracked: true },
      { id: 'containment_action', type: 'textarea', label: 'Containment Action', label_vi: 'Hành động ngăn chặn', width: 'full', required: true, audit_tracked: true }
    );
    schema.sections.push({
      id: 'root_cause',
      title: 'Root Cause & Corrective Action',
      title_vi: 'Nguyên nhân gốc và hành động khắc phục',
      color: 'var(--amber-light,#d97706)',
      field_ids: ['root_cause_analysis', 'corrective_action', 'preventive_action']
    });
    schema.fields.push(
      { id: 'root_cause_analysis', type: 'textarea', label: 'Root Cause Analysis', label_vi: 'Phân tích nguyên nhân gốc', width: 'full', required: true, audit_tracked: true },
      { id: 'corrective_action', type: 'textarea', label: 'Corrective Action', label_vi: 'Hành động khắc phục', width: 'full', required: true, audit_tracked: true },
      { id: 'preventive_action', type: 'textarea', label: 'Preventive Action', label_vi: 'Hành động phòng ngừa', width: 'full', audit_tracked: true }
    );
    schema.sections.push({
      id: 'verification',
      title: 'Verification & Closeout',
      title_vi: 'Xác nhận và đóng hồ sơ',
      color: 'var(--green-dark,#2f9e44)',
      field_ids: ['verification_method', 'verification_result']
    });
    schema.fields.push(
      { id: 'verification_method', type: 'text', label: 'Verification Method', label_vi: 'Phương pháp xác nhận', width: 'full', audit_tracked: true },
      { id: 'verification_result', type: 'textarea', label: 'Verification Result', label_vi: 'Kết quả xác nhận', width: 'full', audit_tracked: true }
    );
  }

  return schema;
}

function renderEqmsRegistry(container){
  var reg = state.registry;
  var forms = eqmsForms();
  var formOptions = '<option value="">' + esc(t('Tất cả form', 'All forms')) + '</option>' +
    forms.map(function(form){
      return '<option value="' + esc(form.form_code || '') + '"' + (String(form.form_code || '') === String(reg.formCode || '') ? ' selected' : '') + '>' + esc((form.form_code || '') + ' · ' + (form.title || form.form_code || '')) + '</option>';
    }).join('');
  var rowsHtml = '';
  if(reg.loading && !reg.loaded){
    rowsHtml = '<tr><td colspan="9">' + esc(t('Đang tải sổ quản lý mã...', 'Loading registry...')) + '</td></tr>';
  } else if(!reg.rows.length){
    rowsHtml = '<tr><td colspan="9">' + esc(t('Không có hồ sơ nào trong phạm vi lọc hiện tại.', 'No records match the current registry filters.')) + '</td></tr>';
  } else {
    rowsHtml = reg.rows.map(function(row){
      return '<tr>' +
        '<td class="mono">' + esc(row.record_id || '') + '</td>' +
        '<td><strong>' + esc(row.form_code || '') + '</strong><br><span>' + esc(row.form_title || '') + '</span></td>' +
        '<td>' + esc(row.delivery_mode || '-') + '</td>' +
        '<td>' + renderStatusPill(row.workflow_state || row.status || 'allocated') + '</td>' +
        '<td>' + esc(fmtDateTime(row.last_action_at || row.created_at || '')) + '</td>' +
        '<td><strong>' + esc(String(row.submission_count || 0)) + '</strong><br><span>' + esc(row.latest_submission_ref || '—') + '</span></td>' +
        '<td>' + esc(String(row.resubmission_count || 0)) + '</td>' +
        '<td>' + esc(row.latest_filename || '—') + '</td>' +
        '<td class="ec-registry-actions">' +
          ((row.delivery_mode === 'online')
            ? '<button type="button" class="ec-btn ghost" data-reg-open="' + esc(row.form_code || '') + '" data-reg-alloc="' + esc(row.allocation_id || '') + '" data-reg-record="' + esc(row.record_id || '') + '" data-reg-entry="' + esc(row.entry_id || '') + '">' + esc(t('Mở', 'Open')) + '</button>' +
              '<button type="button" class="ec-btn secondary" data-reg-edit="' + esc(row.form_code || '') + '" data-reg-edit-alloc="' + esc(row.allocation_id || '') + '" data-reg-edit-record="' + esc(row.record_id || '') + '" data-reg-edit-entry="' + esc(row.entry_id || '') + '" data-reg-edit-source-entry="' + esc(row.entry_id || '') + '" data-reg-edit-revision="' + esc(String(row.submission_count || 0)) + '">' + esc(t('Chỉnh sửa', 'Edit')) + '</button>'
            : '<button type="button" class="ec-btn ghost" data-reg-download-received="' + esc(row.allocation_id || '') + '">' + esc(t('Tải bản đã nộp', 'Download received')) + '</button>' +
              '<button type="button" class="ec-btn secondary" data-reg-open-upload="' + esc(row.allocation_id || '') + '" data-reg-open-upload-form="' + esc(row.form_code || '') + '">' + esc(t('Mở tải lên', 'Open upload')) + '</button>') +
        '</td>' +
      '</tr>';
    }).join('');
  }

  container.innerHTML =
    '<div class="ec-board">' +
      '<section class="ec-board-hero">' +
        '<div class="ec-board-copy">' +
          '<div class="ec-board-kicker">' + esc(t('Quản lý mã', 'Code registry')) + '</div>' +
          '<h2>' + esc(t('Sổ quản lý mã biểu mẫu eQMS', 'eQMS issued-code registry')) + '</h2>' +
          '<p>' + esc(t('Theo dõi mã đã cấp, trạng thái hiện tại, số lần nộp, số lần nộp lại và file mới nhất cho cả online và offline forms.', 'Track issued codes, current state, submission counts, resubmissions, and the latest file for both online and offline forms.')) + '</p>' +
          (reg.error ? '<div class="ec-inline-alert">' + esc(reg.error) + '</div>' : '') +
        '</div>' +
        '<div class="ec-kpi-grid">' +
          '<div class="ec-kpi-card primary"><small>' + esc(t('Đã cấp mã', 'Issued')) + '</small><strong>' + esc(reg.summary.issued_count || 0) + '</strong><span>' + esc(t('Tất cả hồ sơ đã được tạo mã trong phạm vi hiện tại.', 'All records issued in the current scope.')) + '</span></div>' +
          '<div class="ec-kpi-card warning"><small>' + esc(t('Đã nộp', 'Submitted')) + '</small><strong>' + esc(reg.summary.submitted_count || 0) + '</strong><span>' + esc(t('Hồ sơ đã có ít nhất một lần nộp dữ liệu hoặc workbook.', 'Records with at least one data or workbook submission.')) + '</span></div>' +
          '<div class="ec-kpi-card danger"><small>' + esc(t('Nộp lại', 'Resubmitted')) + '</small><strong>' + esc(reg.summary.resubmitted_count || 0) + '</strong><span>' + esc(t('Hồ sơ đã phát sinh ít nhất một lần nộp lại có kiểm soát.', 'Records that already went through at least one controlled resubmission.')) + '</span></div>' +
          '<div class="ec-kpi-card neutral"><small>' + esc(t('Hoàn thành', 'Completed')) + '</small><strong>' + esc(reg.summary.completed_count || 0) + '</strong><span>' + esc(t('Hồ sơ đã kết thúc vòng đời hiện hành.', 'Records that have reached their current end state.')) + '</span></div>' +
        '</div>' +
      '</section>' +
      '<section class="ec-board-toolbar">' +
        '<div class="ec-filter-field"><label>' + esc(t('Form', 'Form')) + '</label><select id="ec-reg-form" class="ec-select">' + formOptions + '</select></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Luồng', 'Mode')) + '</label><select id="ec-reg-mode" class="ec-select"><option value="">' + esc(t('Tất cả', 'All')) + '</option><option value="online"' + (reg.deliveryMode === 'online' ? ' selected' : '') + '>online</option><option value="offline"' + (reg.deliveryMode === 'offline' ? ' selected' : '') + '>offline</option></select></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Trạng thái', 'State')) + '</label><select id="ec-reg-state" class="ec-select"><option value="">' + esc(t('Tất cả trạng thái', 'All states')) + '</option>' + ((window.HmRegistry && typeof HmRegistry.selectOptions === 'function' ? (HmRegistry.selectOptions('allocation_status') || []).map(function(o){ return o.value; }) : []).length ? (HmRegistry.selectOptions('allocation_status') || []).map(function(o){ return o.value; }) : ['draft','allocated','submitted','approved','closed','received','rejected','void']).map(function(value){ return '<option value="' + value + '"' + (reg.state === value ? ' selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Tìm kiếm', 'Search')) + '</label><input id="ec-reg-search" class="ec-input" type="search" value="' + esc(reg.search || '') + '" placeholder="' + esc(t('Mã, form, file...', 'Record, form, file...')) + '"></div>' +
        '<div class="ec-filter-field"><label>' + esc(t('Phạm vi', 'Scope')) + '</label><select id="ec-reg-scope" class="ec-select"><option value="mine"' + (reg.mineOnly ? ' selected' : '') + '>' + esc(t('Của tôi', 'Mine')) + '</option>' + (canSeeAllWorkQueue() ? '<option value="all"' + (!reg.mineOnly ? ' selected' : '') + '>' + esc(t('Tất cả', 'All')) + '</option>' : '') + '</select></div>' +
        '<div class="ec-toolbar-actions"><button type="button" class="ec-btn secondary" id="ec-reg-refresh">' + esc(reg.loading ? t('Đang tải...', 'Refreshing...') : t('Làm mới', 'Refresh')) + '</button></div>' +
      '</section>' +
      '<section class="ec-panel"><div class="ec-panel-head"><div><h3>' + esc(t('Danh sách hồ sơ', 'Record list')) + '</h3><p>' + esc(t('Mỗi dòng là một mã hồ sơ đã cấp cho form online hoặc offline.', 'Each row is one issued record for an online or offline form.')) + '</p></div><span class="ec-badge neutral">' + esc(reg.total || 0) + '</span></div><div class="ec-table-scroll"><table class="ec-table ec-registry-table"><thead><tr><th>' + esc(t('Mã hồ sơ', 'Record ID')) + '</th><th>' + esc(t('Form', 'Form')) + '</th><th>' + esc(t('Luồng', 'Mode')) + '</th><th>' + esc(t('Trạng thái', 'State')) + '</th><th>' + esc(t('Lần hoạt động gần nhất', 'Last activity')) + '</th><th>' + esc(t('Số lần nộp', 'Submissions')) + '</th><th>' + esc(t('Số lần nộp lại', 'Resubmissions')) + '</th><th>' + esc(t('Tệp mới nhất', 'Latest file')) + '</th><th>' + esc(t('Thao tác', 'Actions')) + '</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div></section>' +
    '</div>';
  bindEqmsRegistry(container);
}

function bindEqmsRegistry(container){
  var formEl = document.getElementById('ec-reg-form');
  if(formEl) formEl.onchange = function(){ state.registry.formCode = formEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var modeEl = document.getElementById('ec-reg-mode');
  if(modeEl) modeEl.onchange = function(){ state.registry.deliveryMode = modeEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var stateEl = document.getElementById('ec-reg-state');
  if(stateEl) stateEl.onchange = function(){ state.registry.state = stateEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var searchEl = document.getElementById('ec-reg-search');
  if(searchEl) searchEl.onchange = searchEl.onsearch = function(){ state.registry.search = searchEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var scopeEl = document.getElementById('ec-reg-scope');
  if(scopeEl) scopeEl.onchange = function(){ state.registry.mineOnly = scopeEl.value !== 'all'; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var refreshBtn = document.getElementById('ec-reg-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){ loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };

  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-open]'), function(btn){
    btn.onclick = function(){
      openEqmsRuntime(btn.getAttribute('data-reg-open') || '', {
        allocationId: btn.getAttribute('data-reg-alloc') || '',
        recordId: btn.getAttribute('data-reg-record') || '',
        entryId: btn.getAttribute('data-reg-entry') || '',
        editMode: false,
        editOrigin: 'view_existing'
      });
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-edit]'), function(btn){
    btn.onclick = function(){
      openEqmsRuntime(btn.getAttribute('data-reg-edit') || '', {
        allocationId: btn.getAttribute('data-reg-edit-alloc') || '',
        recordId: btn.getAttribute('data-reg-edit-record') || '',
        entryId: btn.getAttribute('data-reg-edit-entry') || '',
        editMode: true,
        editOrigin: 'controlled_edit',
        sourceEntryId: btn.getAttribute('data-reg-edit-source-entry') || '',
        sourceSubmissionRevision: Number(btn.getAttribute('data-reg-edit-revision') || 0) || 0
      });
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-download-received]'), function(btn){
    btn.onclick = function(){
      var allocationId = btn.getAttribute('data-reg-download-received') || '';
      if(!allocationId) return;
      window.open('api.php?action=form_fill_download_received&allocation_id=' + encodeURIComponent(allocationId), '_blank');
    };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-open-upload]'), function(btn){
    btn.onclick = function(){ openUploadWorkspace(btn.getAttribute('data-reg-open-upload') || '', btn.getAttribute('data-reg-open-upload-form') || ''); };
  });
}

/* ── Forms Library (Tab 2: "Biểu mẫu") ────────────────────────── */
function renderFormsLibrary(container){
  /* If a form runtime is open inside this tab, delegate to it */
  if(state._eqmsOpenCode){
    if(typeof window.openEqmsForm === 'function'){
      window.openEqmsForm(state._eqmsOpenCode, container, Object.assign({ editMode: true }, state._eqmsOpenOptions || {}));
    }
    return;
  }

  var forms = state.forms || [];
  /* Category counts */
  var catCounts = {};
  forms.forEach(function(f){ var c = f.category || 'other'; catCounts[c] = (catCounts[c] || 0) + 1; });

  /* Category labels */
  var cats = ['all'];
  var catLabels = { all: t('Tất cả', 'All') };
  if(window.HmRegistry && typeof HmRegistry.selectOptions === 'function'){
    (HmRegistry.selectOptions('form_category') || []).forEach(function(o){ cats.push(o.value); catLabels[o.value] = o.label || o.value; });
  }
  if(cats.length <= 1){ cats = ['all','quality','production','maintenance','hr','logistics','safety','other']; catLabels = { all: t('Tất cả','All'), quality: t('Chất lượng','Quality'), production: t('Sản xuất','Production'), maintenance: t('Bảo trì','Maintenance'), hr: t('Nhân sự','HR'), logistics: t('Kho vận','Logistics'), safety: t('An toàn','Safety'), other: t('Khác','Other') }; }

  /* Filter forms */
  var sq = String(state.search || '').trim().toLowerCase();
  var filtered = forms.filter(function(f){
    if(state.filter !== 'all' && (f.category || 'other') !== state.filter) return false;
    if(sq){ return (f.form_code || '').toLowerCase().indexOf(sq) >= 0 || (f.title || '').toLowerCase().indexOf(sq) >= 0 || (f.title_vi || '').toLowerCase().indexOf(sq) >= 0; }
    return true;
  });

  /* Build form cards */
  var cardsHtml = '';
  if(!filtered.length){
    cardsHtml = '<div class="ec-empty ec-fl-empty"><h3>' + esc(t('Không tìm thấy biểu mẫu', 'No forms found')) + '</h3><p>' + esc(t('Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.', 'Try changing the filter or search keyword.')) + '</p></div>';
  } else {
    filtered.forEach(function(form){
      var draft = findLocalDraftForForm(form.form_code);
      var hasOnline = form.online !== false;
      var hasOffline = !!(form.offline_fallback_available || form.blank_path || form.linked_excel_form || form.offline_form_code);
      var meta = FORM_COLORS[form.category || 'other'] || FORM_COLORS.other;
      cardsHtml +=
        '<article class="ec-form-card">' +
          '<div class="ec-form-card-head" style="background:' + meta.bg + '">' +
            '<span class="ec-form-card-icon">' + esc(meta.icon) + '</span>' +
            '<div class="ec-form-card-badges">' +
              (hasOnline ? '<span class="ec-badge success">' + esc(t('Online','Online')) + '</span>' : '') +
              (hasOffline ? '<span class="ec-badge warn">' + esc(t('Offline','Offline')) + '</span>' : '') +
              (form.version ? '<span class="ec-badge info">' + esc(form.version) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="ec-form-card-body">' +
            '<div class="ec-form-card-code">' + esc(form.form_code || '') + '</div>' +
            '<div class="ec-form-card-title">' + esc(form.title_vi || form.title || form.form_code || '') + '</div>' +
            (form.description_vi || form.description ? '<div class="ec-form-card-desc">' + esc(String(form.description_vi || form.description || '').slice(0, 100)) + '</div>' : '') +
            (form.sop_ref ? '<div class="ec-form-card-sop">' + esc(form.sop_ref) + '</div>' : '') +
          '</div>' +
          '<div class="ec-form-card-actions">' +
            (hasOnline ? '<button type="button" class="ec-btn primary sm" data-eqms-new-online="' + esc(form.form_code || '') + '">' + esc(t('Online mới','New online')) + '</button>' : '') +
            (hasOffline ? '<button type="button" class="ec-btn secondary sm" data-eqms-new-offline="' + esc(form.form_code || '') + '">' + esc(t('Offline mới','New offline')) + '</button>' : '') +
            (draft ? '<button type="button" class="ec-btn ghost sm" data-eqms-resume="' + esc(form.form_code || '') + '" data-eqms-resume-alloc="' + esc(draft.allocationId || '') + '" data-eqms-resume-record="' + esc(draft.recordId || '') + '" data-eqms-resume-entry="' + esc(draft.entryId || '') + '">' + esc(t('Tiếp tục bản nháp','Resume draft')) + '</button>' : '') +
            '<button type="button" class="ec-btn ghost sm" data-eqms-open-registry="' + esc(form.form_code || '') + '">' + esc(t('Xem mã','View codes')) + '</button>' +
          '</div>' +
        '</article>';
    });
  }

  container.innerHTML =
    '<div class="ec-forms-library">' +
      '<div class="ec-forms-toolbar">' +
        '<input class="ec-input ec-fl-search" type="search" id="ec-fl-search" value="' + esc(state.search || '') + '" placeholder="' + esc(t('Tìm biểu mẫu...','Search forms...')) + '">' +
        '<div class="ec-chip-bar" id="ec-fl-chips">' +
          cats.map(function(cat){
            var cnt = cat === 'all' ? forms.length : (catCounts[cat] || 0);
            return '<button type="button" class="ec-chip' + (state.filter === cat ? ' active' : '') + '" data-filter="' + cat + '">' + esc(catLabels[cat] || cat) + (cnt ? ' <span class="ec-chip-count">' + cnt + '</span>' : '') + '</button>';
          }).join('') +
        '</div>' +
        '<div class="ec-toolbar-actions">' +
          '<button type="button" class="ec-btn secondary" id="ec-fl-create-btn">' + esc(t('Tạo form mới','+ New form schema')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ec-forms-grid" id="ec-forms-grid">' + cardsHtml + '</div>' +
    '</div>';

  /* Bind search */
  var searchEl = document.getElementById('ec-fl-search');
  if(searchEl) searchEl.oninput = function(){
    state.search = searchEl.value;
    if(state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(function(){ state.searchTimer = null; renderFormsLibrary(container); }, 250);
  };

  /* Bind clicks */
  container.onclick = function(e){
    var filterBtn = e.target.closest('[data-filter]');
    if(filterBtn){ state.filter = filterBtn.getAttribute('data-filter') || 'all'; renderFormsLibrary(container); return; }

    var newOnline = e.target.closest('[data-eqms-new-online]');
    if(newOnline){ startNewEqmsOnline(newOnline.getAttribute('data-eqms-new-online') || ''); return; }

    var newOffline = e.target.closest('[data-eqms-new-offline]');
    if(newOffline){ startNewEqmsOffline(newOffline.getAttribute('data-eqms-new-offline') || ''); return; }

    var resumeBtn = e.target.closest('[data-eqms-resume]');
    if(resumeBtn){
      openEqmsRuntime(resumeBtn.getAttribute('data-eqms-resume') || '', {
        allocationId: resumeBtn.getAttribute('data-eqms-resume-alloc') || '',
        recordId: resumeBtn.getAttribute('data-eqms-resume-record') || '',
        entryId: resumeBtn.getAttribute('data-eqms-resume-entry') || '',
        editMode: true, editOrigin: 'draft_resume'
      });
      return;
    }

    var openReg = e.target.closest('[data-eqms-open-registry]');
    if(openReg){
      state.registry.formCode = openReg.getAttribute('data-eqms-open-registry') || '';
      state.registry.page = 1;
      state.workspaceMode = 'codes';
      requestRender();
      loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); });
      return;
    }

    var createBtn = document.getElementById('ec-fl-create-btn');
    if(e.target === createBtn || (createBtn && createBtn.contains(e.target))){ openEqmsFormCreator(); return; }
  };
}

/* ── Code Management (Tab 3: "Tạo & Quản lý mã") ──────────────── */
function renderCodeManagement(container){
  var reg = state.registry;
  var forms = state.forms || [];

  /* Allocation panel form options */
  var allocFormOpts = '<option value="">' + esc(t('-- Chọn form --','-- Select form --')) + '</option>' +
    forms.map(function(f){
      return '<option value="' + esc(f.form_code || '') + '">' + esc((f.form_code || '') + ' · ' + (f.title_vi || f.title || f.form_code || '')) + '</option>';
    }).join('');

  /* Registry table options */
  var regFormOpts = '<option value="">' + esc(t('Tất cả form','All forms')) + '</option>' +
    forms.map(function(f){
      return '<option value="' + esc(f.form_code || '') + '"' + (String(f.form_code || '') === String(reg.formCode || '') ? ' selected' : '') + '>' + esc((f.form_code || '') + ' · ' + (f.title || f.form_code || '')) + '</option>';
    }).join('');

  /* Registry rows */
  var rowsHtml = (reg.loading && !reg.loaded)
    ? '<tr><td colspan="8">' + esc(t('Đang tải...','Loading...')) + '</td></tr>'
    : (!reg.rows.length
      ? '<tr><td colspan="8">' + esc(t('Không có hồ sơ nào trong phạm vi lọc.','No records match current filters.')) + '</td></tr>'
      : reg.rows.map(function(row){
          return '<tr>' +
            '<td class="mono">' + esc(row.record_id || '') + '</td>' +
            '<td><strong>' + esc(row.form_code || '') + '</strong></td>' +
            '<td>' + esc(row.delivery_mode || '-') + '</td>' +
            '<td>' + renderStatusPill(row.workflow_state || row.status || 'allocated') + '</td>' +
            '<td>' + esc(fmtDateTime(row.last_action_at || row.created_at || '')) + '</td>' +
            '<td><strong>' + esc(String(row.submission_count || 0)) + '</strong></td>' +
            '<td>' + esc(row.latest_filename || '—') + '</td>' +
            '<td class="ec-registry-actions">' +
              (row.delivery_mode === 'online'
                ? '<button type="button" class="ec-btn ghost" data-reg-open="' + esc(row.form_code||'') + '" data-reg-alloc="' + esc(row.allocation_id||'') + '" data-reg-record="' + esc(row.record_id||'') + '" data-reg-entry="' + esc(row.entry_id||'') + '">' + esc(t('Mở','Open')) + '</button>' +
                  '<button type="button" class="ec-btn secondary" data-reg-edit="' + esc(row.form_code||'') + '" data-reg-edit-alloc="' + esc(row.allocation_id||'') + '" data-reg-edit-record="' + esc(row.record_id||'') + '" data-reg-edit-entry="' + esc(row.entry_id||'') + '" data-reg-edit-source-entry="' + esc(row.entry_id||'') + '" data-reg-edit-revision="' + esc(String(row.submission_count||0)) + '">' + esc(t('Sửa','Edit')) + '</button>'
                : '<button type="button" class="ec-btn ghost" data-reg-download-received="' + esc(row.allocation_id||'') + '">' + esc(t('Tải','Download')) + '</button>' +
                  '<button type="button" class="ec-btn secondary" data-reg-open-upload="' + esc(row.allocation_id||'') + '" data-reg-open-upload-form="' + esc(row.form_code||'') + '">' + esc(t('Tải lên','Upload')) + '</button>') +
            '</td>' +
          '</tr>';
        }).join(''));

  var stateOpts = ['draft','allocated','submitted','approved','closed','received','rejected','void'].map(function(v){
    return '<option value="' + v + '"' + (reg.state === v ? ' selected' : '') + '>' + esc(v) + '</option>';
  }).join('');

  container.innerHTML =
    '<div class="ec-code-mgmt">' +

      /* ── Quick Allocation Panel ── */
      '<section class="ec-panel ec-alloc-panel">' +
        '<div class="ec-panel-head">' +
          '<div>' +
            '<h3>' + esc(t('Cấp mã hồ sơ mới','Issue new record code')) + '</h3>' +
            '<p>' + esc(t('Mọi đối tượng quản lý đều phải có mã kiểm soát. Bất kỳ ai cũng có thể cấp mã.','Every controlled object must have a tracking code. Anyone can issue codes.')) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="ec-alloc-form">' +
          '<div class="ec-field-group">' +
            '<label class="ec-field-label">' + esc(t('Form / Loại tài liệu','Form / Document type')) + '</label>' +
            '<select id="ec-alloc-form-code" class="ec-select">' + allocFormOpts + '</select>' +
          '</div>' +
          '<div class="ec-field-group">' +
            '<label class="ec-field-label">' + esc(t('Mã phòng ban','Dept code')) + ' <span class="ec-req">*</span></label>' +
            '<input id="ec-alloc-dept" class="ec-input" type="text" maxlength="5" placeholder="QA, PRO, ENG..." value="' + esc(currentDept() || '') + '">' +
          '</div>' +
          '<div class="ec-field-group">' +
            '<label class="ec-field-label">' + esc(t('Ưu tiên','Priority')) + '</label>' +
            '<select id="ec-alloc-priority" class="ec-select"><option value="normal">' + esc(t('Bình thường','Normal')) + '</option><option value="urgent">' + esc(t('Khẩn','Urgent')) + '</option></select>' +
          '</div>' +
          '<div class="ec-field-group ec-field-group-wide">' +
            '<label class="ec-field-label">' + esc(t('Ghi chú','Notes')) + '</label>' +
            '<input id="ec-alloc-notes" class="ec-input" type="text" placeholder="' + esc(t('Mục đích cấp mã...','Purpose...')) + '">' +
          '</div>' +
          '<div class="ec-alloc-submit-row">' +
            '<button type="button" class="ec-btn primary" id="ec-alloc-submit-btn">' + esc(t('Cấp mã ngay','Issue code now')) + '</button>' +
            '<div class="ec-alloc-result" id="ec-alloc-result" style="display:none"></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      /* ── Registry ── */
      '<div class="ec-board">' +
        '<section class="ec-board-hero" style="padding-bottom:0">' +
          '<div class="ec-board-copy">' +
            '<div class="ec-board-kicker">' + esc(t('Sổ quản lý mã','Code registry')) + '</div>' +
            '<h2>' + esc(t('Danh sách mã hồ sơ đã cấp','Issued record code registry')) + '</h2>' +
            (reg.error ? '<div class="ec-inline-alert">' + esc(reg.error) + '</div>' : '') +
          '</div>' +
          '<div class="ec-kpi-grid">' +
            '<div class="ec-kpi-card primary"><small>' + esc(t('Đã cấp','Issued')) + '</small><strong>' + esc(reg.summary.issued_count || 0) + '</strong></div>' +
            '<div class="ec-kpi-card warning"><small>' + esc(t('Đã nộp','Submitted')) + '</small><strong>' + esc(reg.summary.submitted_count || 0) + '</strong></div>' +
            '<div class="ec-kpi-card danger"><small>' + esc(t('Nộp lại','Resubmitted')) + '</small><strong>' + esc(reg.summary.resubmitted_count || 0) + '</strong></div>' +
            '<div class="ec-kpi-card neutral"><small>' + esc(t('Hoàn thành','Completed')) + '</small><strong>' + esc(reg.summary.completed_count || 0) + '</strong></div>' +
          '</div>' +
        '</section>' +
        '<section class="ec-board-toolbar">' +
          '<div class="ec-filter-field"><label>' + esc(t('Form','Form')) + '</label><select id="ec-reg-form" class="ec-select">' + regFormOpts + '</select></div>' +
          '<div class="ec-filter-field"><label>' + esc(t('Luồng','Mode')) + '</label><select id="ec-reg-mode" class="ec-select"><option value="">' + esc(t('Tất cả','All')) + '</option><option value="online"' + (reg.deliveryMode === 'online' ? ' selected' : '') + '>online</option><option value="offline"' + (reg.deliveryMode === 'offline' ? ' selected' : '') + '>offline</option></select></div>' +
          '<div class="ec-filter-field"><label>' + esc(t('Trạng thái','State')) + '</label><select id="ec-reg-state" class="ec-select"><option value="">' + esc(t('Tất cả','All')) + '</option>' + stateOpts + '</select></div>' +
          '<div class="ec-filter-field"><label>' + esc(t('Tìm kiếm','Search')) + '</label><input id="ec-reg-search" class="ec-input" type="search" value="' + esc(reg.search || '') + '" placeholder="' + esc(t('Mã, form, file...','Record, form, file...')) + '"></div>' +
          '<div class="ec-filter-field"><label>' + esc(t('Phạm vi','Scope')) + '</label><select id="ec-reg-scope" class="ec-select"><option value="mine"' + (reg.mineOnly ? ' selected' : '') + '>' + esc(t('Của tôi','Mine')) + '</option>' + (canSeeAllWorkQueue() ? '<option value="all"' + (!reg.mineOnly ? ' selected' : '') + '>' + esc(t('Tất cả','All')) + '</option>' : '') + '</select></div>' +
          '<div class="ec-toolbar-actions"><button type="button" class="ec-btn secondary" id="ec-reg-refresh">' + esc(reg.loading ? t('Đang tải...','Loading...') : t('Làm mới','Refresh')) + '</button></div>' +
        '</section>' +
        '<section class="ec-panel"><div class="ec-table-scroll"><table class="ec-table ec-registry-table">' +
          '<thead><tr>' +
            '<th>' + esc(t('Mã hồ sơ','Record ID')) + '</th>' +
            '<th>' + esc(t('Form','Form')) + '</th>' +
            '<th>' + esc(t('Luồng','Mode')) + '</th>' +
            '<th>' + esc(t('Trạng thái','State')) + '</th>' +
            '<th>' + esc(t('Thời gian','Last activity')) + '</th>' +
            '<th>' + esc(t('Nộp','Submissions')) + '</th>' +
            '<th>' + esc(t('File mới nhất','Latest file')) + '</th>' +
            '<th>' + esc(t('Thao tác','Actions')) + '</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table></div></section>' +
      '</div>' +
    '</div>';

  /* ── Bind allocation form ── */
  var submitBtn = document.getElementById('ec-alloc-submit-btn');
  if(submitBtn) submitBtn.onclick = function(){
    var formCode = String((document.getElementById('ec-alloc-form-code') || {}).value || '').trim();
    var dept = String((document.getElementById('ec-alloc-dept') || {}).value || '').trim().toUpperCase();
    var priority = String((document.getElementById('ec-alloc-priority') || {}).value || 'normal').trim();
    var notes = String((document.getElementById('ec-alloc-notes') || {}).value || '').trim();
    var resultEl = document.getElementById('ec-alloc-result');
    if(!dept || !/^[A-Z]{2,5}$/.test(dept)){
      showToast(t('Mã phòng ban không hợp lệ (2–5 chữ cái in hoa).','Invalid dept code (2–5 uppercase letters).'), 'warn');
      return;
    }
    if(!window.AllocationTracker){
      showToast(t('AllocationTracker chưa sẵn sàng.','AllocationTracker not ready.'), 'error');
      return;
    }
    var form = formCode ? (state.formMap[formCode] || { form_code: formCode }) : null;
    var recordType = form ? resolveRecordTypeForForm(form) : 'GENR';
    submitBtn.disabled = true;
    submitBtn.textContent = t('Đang cấp...','Issuing...');
    window.AllocationTracker.allocate(recordType, dept, {
      year: new Date().getFullYear(),
      form_code: formCode || '',
      priority: priority,
      notes: notes || 'manual_allocation'
    }).then(function(resp){
      submitBtn.disabled = false;
      submitBtn.textContent = t('Cấp mã ngay','Issue code now');
      if(resp && resp.ok){
        var recordId = resp.record_id || '?';
        if(resultEl){ resultEl.style.display = 'block'; resultEl.innerHTML = '<span class="ec-badge success">' + esc(t('Đã cấp','Issued') + ': ') + '<strong>' + esc(recordId) + '</strong></span>'; }
        showToast(t('Đã cấp mã: ','Issued code: ') + recordId, 'success');
        loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); });
      } else {
        showToast(t('Không thể cấp mã mới.','Could not issue a new code.'), 'error');
      }
    }).catch(function(err){
      submitBtn.disabled = false;
      submitBtn.textContent = t('Cấp mã ngay','Issue code now');
      showToast((window.AllocationTracker && window.AllocationTracker.describeError)
        ? window.AllocationTracker.describeError(err && err.body ? err.body : {}, 'allocation').message
        : t('Không thể cấp mã mới.','Could not issue a new code.'), 'error');
    });
  };

  /* ── Bind registry filters ── */
  var formEl = document.getElementById('ec-reg-form');
  if(formEl) formEl.onchange = function(){ state.registry.formCode = formEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var modeEl = document.getElementById('ec-reg-mode');
  if(modeEl) modeEl.onchange = function(){ state.registry.deliveryMode = modeEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var stateEl = document.getElementById('ec-reg-state');
  if(stateEl) stateEl.onchange = function(){ state.registry.state = stateEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var searchEl = document.getElementById('ec-reg-search');
  if(searchEl) searchEl.onchange = searchEl.onsearch = function(){ state.registry.search = searchEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var scopeEl = document.getElementById('ec-reg-scope');
  if(scopeEl) scopeEl.onchange = function(){ state.registry.mineOnly = scopeEl.value !== 'all'; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };
  var refreshBtn = document.getElementById('ec-reg-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){ loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); }); };

  /* ── Bind row actions ── */
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-open]'), function(btn){
    btn.onclick = function(){ openEqmsRuntime(btn.getAttribute('data-reg-open') || '', { allocationId: btn.getAttribute('data-reg-alloc') || '', recordId: btn.getAttribute('data-reg-record') || '', entryId: btn.getAttribute('data-reg-entry') || '', editMode: false, editOrigin: 'view_existing' }); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-edit]'), function(btn){
    btn.onclick = function(){ openEqmsRuntime(btn.getAttribute('data-reg-edit') || '', { allocationId: btn.getAttribute('data-reg-edit-alloc') || '', recordId: btn.getAttribute('data-reg-edit-record') || '', entryId: btn.getAttribute('data-reg-edit-entry') || '', editMode: true, editOrigin: 'controlled_edit', sourceEntryId: btn.getAttribute('data-reg-edit-source-entry') || '', sourceSubmissionRevision: Number(btn.getAttribute('data-reg-edit-revision') || 0) || 0 }); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-download-received]'), function(btn){
    btn.onclick = function(){ var id = btn.getAttribute('data-reg-download-received') || ''; if(!id) return; window.open('api.php?action=form_fill_download_received&allocation_id=' + encodeURIComponent(id), '_blank'); };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-reg-open-upload]'), function(btn){
    btn.onclick = function(){ openUploadWorkspace(btn.getAttribute('data-reg-open-upload') || '', btn.getAttribute('data-reg-open-upload-form') || ''); };
  });
}

function renderWorkspacePane(){
  var wsEl = document.getElementById('ec-workspace');
  if(!wsEl) return;
  /* Normalize legacy mode names to the 4-tab model */
  if(state.workspaceMode === 'work') state.workspaceMode = 'mine';
  else if(state.workspaceMode === 'eqms' || state.workspaceMode === 'eqms-builder' || state.workspaceMode === 'form') state.workspaceMode = 'forms';
  else if(state.workspaceMode === 'registry' || state.workspaceMode === 'record-id') state.workspaceMode = 'codes';
  else if(state.workspaceMode === 'upload') state.workspaceMode = 'evidence';
  if(state.workspaceMode !== 'mine') stopWorkQueuePolling();
  if(typeof setDocHeaderToolbar === 'function') setDocHeaderToolbar('');
  if(state.workspaceLoading){
    wsEl.innerHTML = renderWorkspaceSkeleton();
    return;
  }

  /* Tab 1 — My Work */
  if(state.workspaceMode === 'mine'){
    ensureWorkQueuePolling();
    renderWorkQueue(wsEl);
    if(!state.workQueue.loaded && !state.workQueue.loading) loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
    if(!state.registry.loaded && !state.registry.loading) loadRegistry(false).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
    return;
  }

  /* Tab 2 — Forms Library */
  if(state.workspaceMode === 'forms'){
    renderFormsLibrary(wsEl);
    if(!state.registry.loaded && !state.registry.loading) loadRegistry(false);
    return;
  }

  /* Tab 3 — Code Management */
  if(state.workspaceMode === 'codes'){
    renderCodeManagement(wsEl);
    if(!state.registry.loaded && !state.registry.loading) loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); });
    return;
  }

  /* Tab 4 — Evidence (merged Evidence Vault + offline form upload) */
  if(state.workspaceMode === 'evidence'){
    renderEvidenceTab(wsEl);
    return;
  }

  wsEl.innerHTML = '<div class="ec-empty"><div class="ec-empty-icon">EC</div><h3>' + esc(t('Chọn tab để bắt đầu', 'Select a tab to begin')) + '</h3></div>';
}

function bindSidebar(container){
  var searchEl = document.getElementById('ec-search');
  if(searchEl) searchEl.oninput = function(){
    state.search = searchEl.value;
    if(state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(function(){
      state.searchTimer = null;
      refreshFormList(container);
    }, 250);
  };

  container.onclick = function(event){
    var filterBtn = event.target.closest('[data-filter]');
    if(filterBtn){ state.filter = filterBtn.getAttribute('data-filter') || 'all'; refreshFormList(container); return; }

    var formItem = event.target.closest('[data-form]');
    if(formItem){
      /* Legacy sidebar item — navigate to forms tab with this form selected */
      var code = formItem.getAttribute('data-form') || '';
      state.selectedFormCode = code;
      state.workspaceMode = 'forms';
      state._eqmsOpenCode = '';
      render(container);
      return;
    }

    var allocItem = event.target.closest('[data-alloc]');
    if(allocItem){ state.selectedAllocationId = allocItem.getAttribute('data-alloc') || ''; render(container); return; }

    var toolBtn = event.target.closest('[data-tool]');
    if(toolBtn){
      /* Legacy tool buttons — map to new modes */
      var rawMode = toolBtn.getAttribute('data-tool') || 'mine';
      var nextMode = _normalizeTabMode(rawMode);
      if(nextMode === state.workspaceMode) nextMode = 'mine';
      if(nextMode !== state.workspaceMode && hasRuntimeDirtySession()){
        runWithRuntimeGuard(function(){
          state.workspaceMode = nextMode;
          render(container);
          if(state.workspaceMode === 'mine') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') render(container); });
        });
        return;
      }
      state.workspaceMode = nextMode;
      render(container);
      if(state.workspaceMode === 'mine') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') render(container); });
      return;
    }

    var tabBtn = event.target.closest('[data-tab]');
    /* Ignore [data-tab] clicks from inside the Evidence pane — handled by capture listener */
    if(tabBtn && tabBtn.closest('#ec-ev-container')) return;
    if(tabBtn){
      var tabMode = _normalizeTabMode(tabBtn.getAttribute('data-tab') || 'mine');
      var applyTabSwitch = function(){
        if(tabMode !== state.workspaceMode){
          state._formFolderInited = false;
          state._eqmsOpenCode = '';
          state._eqmsOpenOptions = null;
          state._eqmsBuilderFormCode = '';
          state._eqmsBuilderOptions = null;
          resetRuntimeGuard();
        }
        state.workspaceMode = tabMode;
        render(container);
        if(tabMode === 'mine') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') render(container); });
        if(tabMode === 'codes') loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') render(container); });
      };
      if(tabMode !== state.workspaceMode && hasRuntimeDirtySession()){
        runWithRuntimeGuard(applyTabSwitch);
        return;
      }
      applyTabSwitch();
    }
  };

  var sidebarToggle = document.getElementById('ec-sidebar-toggle');
  if(sidebarToggle) sidebarToggle.onclick = function(){
    var sb = container.querySelector('.ec-sidebar');
    if(sb) sb.classList.toggle('collapsed');
  };
}

function refreshFormList(container){
  var listEl = document.getElementById('ec-form-list');
  var filtersEl = document.getElementById('ec-filters');
  if(!listEl) return;
  var forms = filterForms();
  var categories = {};
  forms.forEach(function(form){ var category = form.category || 'other'; if(!categories[category]) categories[category] = []; categories[category].push(form); });

  var html = '';
  if(!forms.length){
    html = '<div style="padding:24px;text-align:center;color:var(--ec-text-muted);font-size:12px">' + esc(t('Không tìm thấy biểu mẫu nào', 'No forms found')) + '</div>';
  } else {
    Object.keys(categories).sort().forEach(function(category){
      var meta = FORM_COLORS[category] || FORM_COLORS.other;
      html += categories[category].map(function(form){
        return '<div class="ec-form-item' + (state.selectedFormCode === form.form_code ? ' active' : '') + '" data-form="' + esc(form.form_code) + '">' +
          '<div class="ec-form-icon" style="background:' + meta.bg + '">' + esc(meta.icon) + '</div>' +
          '<div class="ec-form-info"><div class="ec-form-code">' + esc(form.form_code) + '</div><div class="ec-form-name">' + esc(form.title_vi || form.title || form.form_code) + '</div></div>' +
          '<span class="ec-mode-badge ' + (form.online === false ? 'offline' : 'online') + '">' + esc(form.online === false ? t('Ngoại tuyến', 'Offline') : t('Trực tuyến', 'Online')) + '</span>' +
        '</div>';
      }).join('');
    });
  }
  listEl.innerHTML = html;
  if(filtersEl) Array.prototype.forEach.call(filtersEl.querySelectorAll('.ec-chip'), function(btn){ btn.classList.toggle('active', btn.getAttribute('data-filter') === state.filter); });
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVIDENCE TAB — Tab 4: "Chứng cứ"
   Self-contained. Uses data-ev-mode / data-ev-action (NOT data-tab) to avoid
   collision with bindSidebar's [data-tab] listener.
   ═══════════════════════════════════════════════════════════════════════════ */

var _EV_MODES = [
  { id:'browse',    vi:'Duyệt',    en:'Browse' },
  { id:'upload',    vi:'Tải lên',  en:'Upload' },
  { id:'detail',    vi:'Chi tiết', en:'Detail' },
  { id:'search',    vi:'Tìm kiếm', en:'Search' },
  { id:'integrity', vi:'Toàn vẹn', en:'Integrity' }
];
var _EV_TYPE_OPTS = [
  { value:'',            vi:'Tất cả loại',  en:'All types' },
  { value:'photo',       vi:'Ảnh',          en:'Photo' },
  { value:'video',       vi:'Video',         en:'Video' },
  { value:'document',    vi:'Tài liệu',      en:'Document' },
  { value:'measurement', vi:'Đo lường',      en:'Measurement' },
  { value:'machine_log', vi:'Nhật ký máy',   en:'Machine log' },
  { value:'cert',        vi:'Chứng nhận',    en:'Certificate' }
];

function _evS(){ return state.evidence; }

function _evRepaint(){
  if(state.workspaceMode !== 'evidence') return;
  var ws = document.getElementById('ec-workspace');
  if(ws) renderEvidencePane(ws);
}

function _evLoadItems(){
  var ev = _evS(); if(ev.loading) return;
  ev.loading = true; ev.error = '';
  var p = { offset:0, limit:50 };
  if(ev.filters.type)     p.type     = ev.filters.type;
  if(ev.filters.dateFrom) p.dateFrom = ev.filters.dateFrom;
  if(ev.filters.dateTo)   p.dateTo   = ev.filters.dateTo;
  if(ev.filters.linkedTo) p.linkedTo = ev.filters.linkedTo;
  api('evidence_list', p, 'GET').then(function(r){
    ev.items = (r && r.items) ? r.items : (Array.isArray(r) ? r : []);
    ev.loaded = true; ev.loading = false; _evRepaint();
  }).catch(function(err){
    ev.loading = false; ev.loaded = true;
    ev.error = (err && err.message) || t('Lỗi tải dữ liệu', 'Load error'); _evRepaint();
  });
}

function _evLoadDetail(id){
  var ev = _evS();
  ev.mode = 'detail'; ev.detail = null; ev.detailLoading = true; ev.detailError = '';
  _evRepaint();
  api('evidence_detail', {id:id}, 'GET').then(function(r){
    ev.detailLoading = false;
    ev.detail = (r && r.item) ? r.item : r;
    _evRepaint();
  }).catch(function(err){
    ev.detailLoading = false;
    ev.detailError = (err && err.message) || t('Lỗi tải chi tiết', 'Detail load error');
    _evRepaint();
  });
}

function _evSearch(){
  var ev = _evS(); if(!ev.searchQuery.trim()) return;
  ev.searchLoading = true; _evRepaint();
  api('evidence_search', {query:ev.searchQuery}, 'GET').then(function(r){
    ev.searchResults = (r && r.results) ? r.results : (Array.isArray(r) ? r : []);
    ev.searchLoading = false; _evRepaint();
  }).catch(function(){
    ev.searchLoading = false; _evRepaint();
  });
}

function _evVerifyChain(){
  var ev = _evS(); if(ev.integrityRunning) return;
  ev.integrityRunning = true; ev.integrityResult = null; ev.integrityProgress = 10;
  _evRepaint();
  var ticker = setInterval(function(){
    ev.integrityProgress = Math.min(88, ev.integrityProgress + 14);
    _evRepaint();
  }, 400);
  api('evidence_verify_chain', {}, 'GET').then(function(r){
    clearInterval(ticker);
    ev.integrityProgress = 100; ev.integrityRunning = false; ev.integrityResult = r;
    _evRepaint();
  }).catch(function(err){
    clearInterval(ticker);
    ev.integrityRunning = false;
    ev.integrityResult = { valid:false, error:(err && err.message)||'Error' };
    _evRepaint();
  });
}

function _evDoUpload(evCont){
  var fileInput = evCont.querySelector('#ec-ev-file-input');
  if(!fileInput || !fileInput.files.length){
    showToast(t('Chưa chọn tệp', 'No files selected'), 'warn'); return;
  }
  var fd = new FormData();
  Array.from(fileInput.files).forEach(function(f){ fd.append('files[]', f); });
  var g = function(id){ return (evCont.querySelector('#' + id) || {}).value || ''; };
  if(g('ec-ev-title'))  fd.append('title',       g('ec-ev-title'));
  if(g('ec-ev-type'))   fd.append('type',         g('ec-ev-type'));
  if(g('ec-ev-tags'))   fd.append('tags',         g('ec-ev-tags'));
  if(g('ec-ev-linked')) fd.append('linked',       g('ec-ev-linked'));
  if(g('ec-ev-desc'))   fd.append('description',  g('ec-ev-desc'));
  var ev = _evS();
  ev.uploadProgress = 20; ev.uploadResult = null;
  var ws = document.getElementById('ec-workspace');
  if(ws) renderEvidencePane(ws);
  var hdrs = {};
  if(typeof csrfToken !== 'undefined' && csrfToken) hdrs['X-CSRF-Token'] = csrfToken;
  fetch('api.php?action=evidence_upload', {method:'POST', credentials:'include', headers:hdrs, body:fd})
    .then(function(r){ return r.json(); })
    .then(function(r){
      ev.uploadProgress = 100;
      ev.uploadResult = { ok:!!(r && r.success), message:(r && r.message)||t('Tải lên thành công!','Upload successful!') };
      if(r && r.success){ ev.loaded = false; showToast(ev.uploadResult.message, 'success'); }
      else showToast(ev.uploadResult.message, 'error');
      if(ws) renderEvidencePane(ws);
    })
    .catch(function(err){
      ev.uploadProgress = 0;
      ev.uploadResult = { ok:false, message:t('Lỗi: ','Error: ') + (err.message||'Unknown') };
      if(ws) renderEvidencePane(ws);
    });
}

/* ── Render helpers ── */
function _evRenderBrowse(ev){
  var typeOpts = _EV_TYPE_OPTS.map(function(o){
    return '<option value="' + esc(o.value) + '"' + (ev.filters.type === o.value ? ' selected' : '') + '>' + esc(t(o.vi,o.en)) + '</option>';
  }).join('');
  var filters =
    '<div class="ec-ev-filters">' +
      '<select class="ec-input ec-ev-fsel" data-ev-filter="type">' + typeOpts + '</select>' +
      '<input type="date" class="ec-input ec-ev-finp" data-ev-filter="dateFrom" value="' + esc(ev.filters.dateFrom) + '" title="' + t('Từ ngày','From') + '">' +
      '<input type="date" class="ec-input ec-ev-finp" data-ev-filter="dateTo" value="' + esc(ev.filters.dateTo) + '" title="' + t('Đến ngày','To') + '">' +
      '<input type="text" class="ec-input ec-ev-finp" data-ev-filter="linkedTo" value="' + esc(ev.filters.linkedTo) + '" placeholder="' + t('Liên kết (NCR...)','Linked (NCR...)') + '">' +
      '<button type="button" class="ec-btn primary sm" data-ev-action="browse-refresh">' + t('Làm mới','Refresh') + '</button>' +
    '</div>';
  if(ev.loading) return filters + '<div class="ec-ev-state">' + t('Đang tải...','Loading...') + '</div>';
  if(ev.error)   return filters + '<div class="ec-ev-state error">' + esc(ev.error) + '</div>';
  if(!ev.items || !ev.items.length) return filters +
    '<div class="ec-ev-state empty">' +
      '<div style="font-size:2.5rem;margin-bottom:12px">📂</div>' +
      '<p>' + t('Chưa có bằng chứng. Dùng tab Tải lên để thêm.','No evidence yet. Use Upload to add.') + '</p>' +
      '<button type="button" class="ec-btn primary" data-ev-mode="upload">' + t('Tải lên ngay','Upload now') + '</button>' +
    '</div>';
  var cards = ev.items.map(function(item){
    var ICONS = {photo:'🖼️',video:'🎥',measurement:'📐',machine_log:'🖥️',cert:'🏅',document:'📄'};
    var icon = ICONS[item.type] || '📄';
    var media = item.thumbnail_url
      ? '<img src="' + esc(item.thumbnail_url) + '" class="ec-ev-card-thumb" alt="">'
      : '<div class="ec-ev-card-icon">' + icon + '</div>';
    var size = item.file_size ? (item.file_size/1024).toFixed(0) + ' KB' : '';
    return '<div class="ec-ev-card" data-ev-action="view-detail" data-ev-id="' + esc(item.id) + '">' +
      '<div class="ec-ev-card-media">' + media + '</div>' +
      '<div class="ec-ev-card-body">' +
        '<div class="ec-ev-card-title">' + esc(item.title || item.filename || item.id) + '</div>' +
        '<div class="ec-ev-card-meta">' +
          '<span class="ec-badge info">' + esc(item.type||'doc') + '</span>' +
          (size ? '<span class="ec-ev-meta-dim">' + size + '</span>' : '') +
          (item.created_at ? '<span class="ec-ev-meta-dim">' + esc(item.created_at.slice(0,10)) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  return filters + '<div class="ec-ev-grid">' + cards + '</div>';
}

function _evRenderUpload(ev){
  var typeOpts = _EV_TYPE_OPTS.filter(function(o){ return o.value; }).map(function(o){
    return '<option value="' + esc(o.value) + '">' + esc(t(o.vi,o.en)) + '</option>';
  }).join('');
  var progressHtml = (ev.uploadProgress > 0 && ev.uploadProgress < 100)
    ? '<div class="ec-ev-progress"><div class="ec-ev-progress-bar" style="width:' + ev.uploadProgress + '%"></div></div>' : '';
  var resultHtml = ev.uploadResult
    ? '<div class="ec-ev-upload-result ' + (ev.uploadResult.ok ? 'ok' : 'err') + '">' + esc(ev.uploadResult.message) + '</div>' : '';
  return '<div class="ec-ev-upload-wrap">' +
    '<div class="ec-ev-dropzone" id="ec-ev-dropzone">' +
      '<div style="font-size:2rem">📤</div>' +
      '<div class="ec-ev-dz-text">' + t('Kéo thả tệp vào đây hoặc','Drag files here or') + '</div>' +
      '<label class="ec-btn primary sm" style="cursor:pointer">' +
        t('Chọn tệp','Choose files') +
        '<input type="file" id="ec-ev-file-input" multiple accept="image/*,application/pdf,video/mp4,.csv,.xlsx,.txt,.json" style="display:none">' +
      '</label>' +
      '<div id="ec-ev-selected-files" class="ec-ev-selected-files"></div>' +
    '</div>' +
    '<div class="ec-ev-upload-form">' +
      '<div class="ec-field-group"><label class="ec-label">' + t('Tiêu đề','Title') + '</label><input type="text" class="ec-input" id="ec-ev-title" placeholder="' + t('Tên mô tả...','Descriptive name...') + '"></div>' +
      '<div class="ec-field-group"><label class="ec-label">' + t('Loại bằng chứng','Type') + '</label><select class="ec-input" id="ec-ev-type">' + typeOpts + '</select></div>' +
      '<div class="ec-field-group"><label class="ec-label">' + t('Nhãn (phân cách bởi dấu phẩy)','Tags (comma-separated)') + '</label><input type="text" class="ec-input" id="ec-ev-tags" placeholder="qc, sop-302..."></div>' +
      '<div class="ec-field-group"><label class="ec-label">' + t('Liên kết hồ sơ','Linked record') + '</label><input type="text" class="ec-input" id="ec-ev-linked" placeholder="NCR-001, SO-456..."></div>' +
      '<div class="ec-field-group"><label class="ec-label">' + t('Mô tả','Description') + '</label><textarea class="ec-input" id="ec-ev-desc" rows="3"></textarea></div>' +
      progressHtml + resultHtml +
      '<div class="ec-alloc-submit-row"><button type="button" class="ec-btn primary" data-ev-action="do-upload">' + t('Tải lên','Upload') + '</button></div>' +
    '</div>' +
  '</div>';
}

function _evRenderDetail(ev){
  if(ev.detailLoading) return '<div class="ec-ev-state">' + t('Đang tải...','Loading...') + '</div>';
  if(ev.detailError)   return '<div class="ec-ev-state error">' + esc(ev.detailError) + '</div>';
  if(!ev.detail) return '<div class="ec-ev-state empty">' + t('Chọn một mục từ tab Duyệt.','Select an item from Browse.') + '</div>';
  var item = ev.detail;
  var ICONS = {photo:'🖼️',video:'🎥',measurement:'📐',machine_log:'🖥️',cert:'🏅',document:'📄'};
  var media = item.thumbnail_url
    ? '<img src="' + esc(item.thumbnail_url) + '" class="ec-ev-detail-img">'
    : '<div class="ec-ev-detail-icon-lg">' + (ICONS[item.type]||'📄') + '</div>';
  var rows = [
    [t('Loại','Type'),     item.type],
    [t('Kích thước','Size'), item.file_size ? (item.file_size/1024).toFixed(0)+' KB' : '—'],
    [t('Ngày tải','Date'),  item.created_at ? item.created_at.slice(0,16).replace('T',' ') : '—'],
    [t('Người tải','By'),   item.created_by],
    ['SHA-256',             item.hash ? item.hash.slice(0,20)+'…' : '—']
  ].map(function(r){
    return '<div class="ec-ev-drow"><span class="ec-ev-dlabel">' + esc(r[0]) + '</span><span class="ec-ev-dval">' + esc(r[1]||'—') + '</span></div>';
  }).join('');
  var CUST_COLORS = {uploaded:'#3b82f6',viewed:'#8b5cf6',linked:'#f59e0b',verified:'#10b981',modified:'#ef4444',downloaded:'#06b6d4'};
  var custodyHtml = '';
  if(item.chain_of_custody && item.chain_of_custody.length){
    custodyHtml = '<div class="ec-ev-custody"><div class="ec-ev-sec-title">' + t('Chuỗi giám sát','Chain of custody') + '</div>' +
      item.chain_of_custody.map(function(c){
        var col = CUST_COLORS[c.action]||'#64748b';
        return '<div class="ec-ev-cust-row" style="border-left-color:' + col + '">' +
          '<span class="ec-ev-cust-act" style="color:' + col + '">' + esc(c.action) + '</span>' +
          '<span class="ec-ev-cust-who">' + esc(c.user||'') + '</span>' +
          '<span class="ec-ev-cust-when">' + esc((c.timestamp||'').slice(0,16).replace('T',' ')) + '</span>' +
          (c.note ? '<span class="ec-ev-cust-note">' + esc(c.note) + '</span>' : '') +
        '</div>';
      }).join('') + '</div>';
  }
  var tagsHtml = (item.tags && item.tags.length)
    ? '<div class="ec-ev-tags">' + item.tags.map(function(tg){ return '<span class="ec-badge info">' + esc(tg) + '</span>'; }).join('') + '</div>' : '';
  return '<div class="ec-ev-detail">' +
    '<button type="button" class="ec-btn sm" data-ev-action="back-to-browse">← ' + t('Quay lại','Back') + '</button>' +
    '<div class="ec-ev-detail-hdr">' + media + '<div class="ec-ev-detail-ttl">' + esc(item.title||item.filename||item.id) + '</div></div>' +
    '<div class="ec-ev-dgrid">' + rows + '</div>' +
    (item.description ? '<div class="ec-ev-detail-desc">' + esc(item.description) + '</div>' : '') +
    tagsHtml + custodyHtml +
    '<div class="ec-ev-link-sec"><div class="ec-ev-sec-title">' + t('Liên kết hồ sơ','Link record') + '</div>' +
      '<div class="ec-ev-link-row"><input type="text" class="ec-input" id="ec-ev-link-inp" placeholder="NCR-001...">' +
      '<button type="button" class="ec-btn primary sm" data-ev-action="link-entity" data-ev-id="' + esc(item.id) + '">' + t('Liên kết','Link') + '</button></div>' +
    '</div>' +
  '</div>';
}

function _evRenderSearch(ev){
  var resultsHtml = '';
  if(ev.searchLoading){
    resultsHtml = '<div class="ec-ev-state">' + t('Đang tìm...','Searching...') + '</div>';
  } else if(ev.searchResults && ev.searchResults.length){
    var ICONS = {photo:'🖼️',video:'🎥',measurement:'📐',machine_log:'🖥️',cert:'🏅',document:'📄'};
    resultsHtml = '<div class="ec-ev-search-list">' +
      ev.searchResults.map(function(item){
        return '<div class="ec-ev-srow" data-ev-action="view-detail" data-ev-id="' + esc(item.id) + '">' +
          '<span class="ec-ev-sicon">' + (ICONS[item.type]||'📄') + '</span>' +
          '<div class="ec-ev-sinfo">' +
            '<div class="ec-ev-stitle">' + esc(item.title||item.filename) + '</div>' +
            '<div class="ec-ev-smeta">' +
              '<span class="ec-badge info">' + esc(item.type||'doc') + '</span>' +
              (item.created_at ? '<span class="ec-ev-meta-dim">' + esc(item.created_at.slice(0,10)) + '</span>' : '') +
            '</div>' +
            (item.snippet ? '<div class="ec-ev-snippet">' + item.snippet + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
  } else if(ev.searchQuery){
    resultsHtml = '<div class="ec-ev-state empty">' + t('Không tìm thấy kết quả.','No results found.') + '</div>';
  }
  return '<div class="ec-ev-search-wrap">' +
    '<div class="ec-ev-sbar">' +
      '<input type="text" class="ec-input" id="ec-ev-search-inp" value="' + esc(ev.searchQuery) + '" placeholder="' + t('Tìm kiếm bằng chứng...','Search evidence...') + '">' +
      '<button type="button" class="ec-btn primary" data-ev-action="do-search">' + t('Tìm','Search') + '</button>' +
    '</div>' + resultsHtml +
  '</div>';
}

function _evRenderIntegrity(ev){
  var body = '';
  if(ev.integrityRunning){
    body = '<div class="ec-ev-progress ec-ev-igprog"><div class="ec-ev-progress-bar" style="width:' + ev.integrityProgress + '%"></div></div>' +
      '<p style="color:var(--ec-text-secondary);margin-top:8px">' + t('Đang xác minh chuỗi băm...','Verifying hash chain...') + '</p>';
  } else if(ev.integrityResult){
    var r = ev.integrityResult;
    var isApiErr = !!r.error;
    var ok = !isApiErr && r.valid === true;
    body = '<div class="ec-ev-ig-verdict ' + (ok ? 'ok' : 'fail') + '">' +
      (ok
        ? '✅ ' + t('Dữ liệu toàn vẹn — Chuỗi băm hợp lệ','Integrity verified — Hash chain valid')
        : isApiErr
          ? '⚠️ ' + t('Không thể xác minh — Máy chủ không phản hồi','Cannot verify — Server did not respond')
          : '❌ ' + t('CẢNH BÁO — Phát hiện can thiệp dữ liệu','WARNING — Data tampering detected')) +
    '</div>';
    if(isApiErr && r.error){
      body += '<p style="color:var(--ec-text-muted);font-size:12px;margin-top:6px">' + esc(r.error) + '</p>';
    }
    if(r.chain && r.chain.length){
      body += '<div class="ec-ev-ig-list">' +
        r.chain.map(function(ci){
          return '<div class="ec-ev-ig-row">' +
            '<span class="ec-ev-ig-st ' + (ci.valid ? 'ok' : 'fail') + '">' + (ci.valid ? '✓' : '✗') + '</span>' +
            '<span class="ec-ev-ig-ttl">' + esc(ci.title||ci.id) + '</span>' +
            '<code class="ec-ev-ig-hash">' + (ci.hash||'').slice(0,12) + '…</code>' +
          '</div>';
        }).join('') + '</div>';
    }
  }
  return '<div class="ec-ev-ig-wrap">' +
    '<div class="ec-ev-sec-title">' + t('Xác minh tính toàn vẹn','Integrity Verification') + '</div>' +
    '<p class="ec-ev-ig-desc">' + t('Kiểm tra chuỗi băm SHA-256 để phát hiện bất kỳ sự can thiệp nào.','Verify SHA-256 hash chain to detect tampering.') + '</p>' +
    '<button type="button" class="ec-btn primary" data-ev-action="do-integrity"' + (ev.integrityRunning ? ' disabled' : '') + '>' +
      (ev.integrityRunning ? t('Đang xác minh...','Verifying...') : t('Bắt đầu xác minh','Start Verification')) +
    '</button>' +
    body +
  '</div>';
}

/* ── Main entry points ── */
function renderEvidenceTab(container){
  /* Offline pending upload — hand off to upload validator */
  if(state.pendingUploadSelection && state.pendingUploadSelection.allocationId && typeof window._renderUploadVerify === 'function'){
    window._renderUploadVerify(state.forms, state.pendingUploadSelection, container);
    state.pendingUploadSelection = null;
    return;
  }
  renderEvidencePane(container);
  if(!state.evidence.loaded && !state.evidence.loading) _evLoadItems();
}

function renderEvidencePane(container){
  var ev = _evS(); var m = ev.mode;
  var modeBar = _EV_MODES.map(function(mode){
    return '<button type="button" class="ec-ev-mode-btn' + (m === mode.id ? ' active' : '') + '" data-ev-mode="' + mode.id + '">' + t(mode.vi, mode.en) + '</button>';
  }).join('');
  var pane = '';
  if(m === 'browse')    pane = _evRenderBrowse(ev);
  else if(m === 'upload')    pane = _evRenderUpload(ev);
  else if(m === 'detail')    pane = _evRenderDetail(ev);
  else if(m === 'search')    pane = _evRenderSearch(ev);
  else if(m === 'integrity') pane = _evRenderIntegrity(ev);
  container.innerHTML =
    '<div class="ec-ev-container" id="ec-ev-container">' +
      '<div class="ec-ev-modebar">' + modeBar + '</div>' +
      '<div class="ec-ev-pane" id="ec-ev-pane">' + pane + '</div>' +
    '</div>';
  _evBindEvents(container);
}

function _evBindEvents(container){
  var root = container.querySelector('#ec-ev-container');
  if(!root) return;

  /* Use capture phase so ev-actions fire before any bubbling to bindSidebar */
  root.addEventListener('click', function(e){
    var modeBtn = e.target.closest('[data-ev-mode]');
    if(modeBtn){
      e.stopPropagation();
      var nm = modeBtn.getAttribute('data-ev-mode');
      state.evidence.mode = nm;
      if(nm === 'browse' && !state.evidence.loaded) _evLoadItems();
      renderEvidencePane(container);
      return;
    }
    var actBtn = e.target.closest('[data-ev-action]');
    if(actBtn){
      e.stopPropagation();
      var action = actBtn.getAttribute('data-ev-action');
      var itemId = actBtn.getAttribute('data-ev-id') || '';
      if(action === 'browse-refresh'){
        var ev2 = _evS();
        var q = function(sel){ return root.querySelector(sel); };
        var ts = q('[data-ev-filter="type"]'); if(ts) ev2.filters.type = ts.value;
        var df = q('[data-ev-filter="dateFrom"]'); if(df) ev2.filters.dateFrom = df.value;
        var dt = q('[data-ev-filter="dateTo"]'); if(dt) ev2.filters.dateTo = dt.value;
        var ln = q('[data-ev-filter="linkedTo"]'); if(ln) ev2.filters.linkedTo = ln.value;
        ev2.loaded = false; _evLoadItems();
      } else if(action === 'view-detail'){
        _evLoadDetail(itemId);
      } else if(action === 'back-to-browse'){
        state.evidence.mode = 'browse'; renderEvidencePane(container);
      } else if(action === 'do-search'){
        var si = root.querySelector('#ec-ev-search-inp');
        if(si) state.evidence.searchQuery = si.value.trim();
        _evSearch();
      } else if(action === 'do-integrity'){
        _evVerifyChain();
      } else if(action === 'do-upload'){
        _evDoUpload(root);
      } else if(action === 'link-entity'){
        var li = root.querySelector('#ec-ev-link-inp');
        var entityVal = li ? li.value.trim() : '';
        if(!entityVal || !itemId){ showToast(t('Nhập ID hồ sơ để liên kết','Enter record ID to link'), 'warn'); return; }
        api('evidence_link', {id:itemId, entity:entityVal}, 'POST').then(function(){
          showToast(t('Đã liên kết','Linked'), 'success'); _evLoadDetail(itemId);
        }).catch(function(){ showToast(t('Lỗi liên kết','Link failed'), 'error'); });
      }
    }
  }, true);

  /* Search on Enter */
  var si2 = root.querySelector('#ec-ev-search-inp');
  if(si2) si2.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ state.evidence.searchQuery = this.value.trim(); _evSearch(); }
  });

  /* File input change → show selected filenames */
  var fi = root.querySelector('#ec-ev-file-input');
  if(fi) fi.addEventListener('change', function(){
    var sel = root.querySelector('#ec-ev-selected-files'); if(!sel) return;
    sel.innerHTML = Array.from(this.files).map(function(f){
      return '<div class="ec-ev-fitem">📎 ' + esc(f.name) + ' (' + (f.size/1024).toFixed(0) + ' KB)</div>';
    }).join('');
  });

  /* Dropzone drag-and-drop */
  var dz = root.querySelector('#ec-ev-dropzone');
  if(dz){
    dz.addEventListener('dragover', function(e){ e.preventDefault(); this.classList.add('drag-over'); });
    dz.addEventListener('dragleave', function(){ this.classList.remove('drag-over'); });
    dz.addEventListener('drop', function(e){
      e.preventDefault(); this.classList.remove('drag-over');
      var fi2 = root.querySelector('#ec-ev-file-input');
      if(fi2 && e.dataTransfer.files.length){
        try{ var dt = new DataTransfer(); Array.from(e.dataTransfer.files).forEach(function(f){ dt.items.add(f); }); fi2.files = dt.files; fi2.dispatchEvent(new Event('change')); }catch(ex){}
      }
    });
  }
}

/* Map legacy tab/mode names to the current 4-tab model */
function _normalizeTabMode(mode){
  var m = String(mode || '').trim();
  if(m === 'work' || m === 'my-work' || m === 'mine') return 'mine';
  if(m === 'form' || m === 'eqms' || m === 'eqms-builder' || m === 'forms' || m === 'fill' || m === 'fill-download') return 'forms';
  if(m === 'registry' || m === 'record-id' || m === 'codes') return 'codes';
  if(m === 'upload' || m === 'upload-verify' || m === 'evidence') return 'evidence';
  return 'mine';
}

window._renderOnlineFormsLegacy = function(formCode){
  var page = pageEl();
  if(!page) return;
  if(!formCode && state.pendingFillSelection && state.pendingFillSelection.formCode){
    formCode = state.pendingFillSelection.formCode;
    if(state.pendingFillSelection.allocationId) state.selectedAllocationId = state.pendingFillSelection.allocationId;
    state.workspaceMode = 'forms';
  }
  if(formCode) state.selectedFormCode = formCode;
  page.innerHTML = renderWorkspaceSkeleton();
  loadAll().then(function(){
    if(state.pendingFillSelection && state.pendingFillSelection.formCode){
      state.selectedFormCode = state.pendingFillSelection.formCode;
      if(state.pendingFillSelection.allocationId) state.selectedAllocationId = state.pendingFillSelection.allocationId;
      state.pendingFillSelection = null;
    }
    state.ready = true;
    render(page);
  }).catch(function(){
    page.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Không thể tải dữ liệu', 'Could not load data')) + '</h3><p>' + esc(t('Vui lòng kiểm tra kết nối và thử lại.', 'Please check your connection and try again.')) + '</p></div>';
  });
};

window._fhSwitchTab = function(target){
  if(hasRuntimeDirtySession()){
    runWithRuntimeGuard(function(){ window._fhSwitchTab(target); });
    return;
  }
  var mode = _normalizeTabMode(target);
  state.activeTab = mode;
  state.workspaceMode = mode;
  if(target === 'fill' || target === 'fill-download'){
    var pending = state.pendingFillSelection || {};
    if(pending.formCode || state.selectedFormCode){
      openFormWorkspace(pending.formCode || state.selectedFormCode, pending.allocationId || state.selectedAllocationId || '');
      state.pendingFillSelection = null;
      return;
    }
  }
  requestRender();
  if(mode === 'mine') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  if(mode === 'codes') loadRegistry(true).then(function(){ if(state.workspaceMode === 'codes') requestRender(); });
};

window.renderOnlineForms = function(formCode){
  var page = pageEl();
  if(!page) return;

  /* If a specific form is requested, navigate to forms tab and open it */
  if(formCode){
    state.selectedFormCode = formCode;
    state.workspaceMode = 'forms';
    state._eqmsOpenCode = '';
  } else {
    /* Default: "My Work" tab */
    if(!state.workspaceMode || state.workspaceMode === 'form' || state.workspaceMode === 'work') state.workspaceMode = 'mine';
  }
  page.innerHTML = renderWorkspaceSkeleton();
  loadAll().then(function(){
    state.ready = true;
    render(page);
    if(state.workspaceMode === 'mine') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'mine') requestRender(); });
  }).catch(function(err){
    page.innerHTML = renderLoadFailure(err);
    var retry = page.querySelector('#ec-retry-load');
    if(retry) retry.onclick = function(){ window.renderOnlineForms(); };
  });
};

window._fhState = state;
window._fhShowToast = showToast;
window._fhT = t;
window._fhEscHtml = esc;
window._fhOpenFormWorkspace = openFormWorkspace;
window.addEventListener('beforeunload', stopWorkQueuePolling);

})();

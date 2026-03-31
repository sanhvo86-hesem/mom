/* ==========================================================================
   09-online-forms.js - Evidence Control orchestrator
   ========================================================================== */

(function(){
'use strict';

var FORM_COLORS = {
  production:  { bg:'#fef3c7', icon:'PR' },
  quality:     { bg:'#dcfce7', icon:'QA' },
  maintenance: { bg:'#fff9db', icon:'MT' },
  hr:          { bg:'#f3e8ff', icon:'HR' },
  logistics:   { bg:'#fff4e6', icon:'LG' },
  safety:      { bg:'#fee2e2', icon:'HS' },
  other:       { bg:'#f1f5f9', icon:'EC' }
};

var DEPARTMENTS = [
  { value:'QA',  label:'Đảm bảo chất lượng', labelEn:'Quality Assurance' },
  { value:'PRO', label:'Sản xuất', labelEn:'Production' },
  { value:'ENG', label:'Kỹ thuật', labelEn:'Engineering' },
  { value:'SCM', label:'Chuỗi cung ứng', labelEn:'Supply Chain' },
  { value:'HR',  label:'Nhân sự và Đào tạo', labelEn:'HR & Training' },
  { value:'EXE', label:'Ban giám đốc', labelEn:'Executive / Management' },
  { value:'SAL', label:'Kinh doanh', labelEn:'Sales' },
  { value:'WH',  label:'Kho vận', labelEn:'Warehouse / Logistics' },
  { value:'IT',  label:'Công nghệ thông tin', labelEn:'IT / Digital' },
  { value:'EHS', label:'An toàn và Môi trường', labelEn:'EHS / Safety' }
];

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
  workspaceMode: 'form',
  workspaceLoading: false,
  ready: false,
  activeTab: 'form',
  pendingFillSelection: null,
  pendingUploadSelection: null,
  pendingContext: null,
  _eqmsOpenCode: '',
  _eqmsOpenOptions: null,
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
  }
};

window._ecState = state;

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(value == null ? '' : value)));
  return div.innerHTML;
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
  if(state.workspaceMode !== 'work'){
    stopWorkQueuePolling();
    return;
  }
  if(state.workQueue.pollTimer) return;
  state.workQueue.pollTimer = setInterval(function(){
    if(state.workspaceMode !== 'work'){
      stopWorkQueuePolling();
      return;
    }
    loadWorkQueue(true).then(function(){
      if(state.workspaceMode === 'work') requestRender();
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
  var elevated = ['admin','it_admin','ceo','production_director','qa_manager','quality_manager','production_manager','engineering_manager','qms_engineer'];
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

function openFormWorkspace(formCode, allocationId){
  if(formCode) state.selectedFormCode = formCode;
  if(allocationId !== undefined && allocationId !== null) state.selectedAllocationId = allocationId || '';
  state.workspaceMode = 'form';
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

function openUploadWorkspace(allocationId, formCode){
  if(formCode) state.selectedFormCode = formCode;
  if(allocationId) state.selectedAllocationId = allocationId;
  state.pendingUploadSelection = allocationId ? { allocationId: allocationId, formCode: formCode || state.selectedFormCode || '' } : null;
  state.workspaceMode = 'upload';
  requestRender();
}

function eqmsForms(){
  var seen = {};
  return state.forms.filter(function(form){
    if(!form || !form.form_code) return false;
    if(!form.online && !form.offline_fallback_available && !form.blank_path && !form.linked_excel_form) return false;
    if(seen[form.form_code]) return false;
    seen[form.form_code] = true;
    return true;
  }).sort(function(a, b){
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
  if(!form) return '';
  var direct = String(form.record_type || '').trim().toUpperCase();
  if(direct) return direct;
  var code = String(form.form_code || '').trim().toUpperCase();
  if(state.formToRecordType[code]) return state.formToRecordType[code];
  var base = code.replace(/-[A-Z0-9]+$/, '');
  return String(state.formToRecordType[base] || '').trim().toUpperCase();
}

function openEqmsRuntime(formCode, options){
  state.workspaceMode = 'eqms';
  state._eqmsOpenCode = formCode || '';
  state._eqmsOpenOptions = Object.assign({}, options || {});
  requestRender();
}

function startNewEqmsOnline(formCode){
  var form = state.formMap[formCode] || null;
  if(!form || !window.AllocationTracker){
    showToast(t('Biểu mẫu online chưa sẵn sàng.', 'Online form is not ready.'), 'warn');
    return;
  }
  var recordType = resolveRecordTypeForForm(form);
  if(!recordType){
    showToast(t('Chưa cấu hình record type cho form này.', 'Record type is not configured for this form.'), 'error');
    return;
  }
  var dept = String((form.owner || 'QA').split('/')[0] || 'QA').trim().toUpperCase();
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
  var recordType = resolveRecordTypeForForm(form);
  if(!recordType || !targetFormCode){
    showToast(t('Chưa cấu hình luồng offline cho form này.', 'Offline flow is not configured for this form.'), 'error');
    return;
  }
  var dept = String((form.owner || 'QA').split('/')[0] || 'QA').trim().toUpperCase();
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
          '<h2>' + esc(t('Hàng chờ xử lý cho hồ sơ và tải lên', 'Action queue for evidence and uploads')) + '</h2>' +
          '<p>' + esc(t('Mở thẳng hồ sơ để xem xét và xử lý tệp cách ly ngay trong cùng phân hệ.', 'Open records for review and resolve quarantined uploads directly inside the same module.')) + '</p>' +
          (work.error ? '<div class="ec-inline-alert">' + esc(work.error) + '</div>' : '') +
        '</div>' +
        '<div class="ec-kpi-grid">' +
          '<div class="ec-kpi-card primary"><small>' + esc(t('Tổng việc đang mở', 'Open actions')) + '</small><strong>' + esc(totalOpen) + '</strong><span>' + esc(t('Tổng số mục cần xử lý trong phạm vi đang lọc.', 'Total items that need attention in the current scope.')) + '</span></div>' +
          '<div class="ec-kpi-card warning"><small>' + esc(t('Chờ duyệt', 'Pending review')) + '</small><strong>' + esc((work.pending || []).length) + '</strong><span>' + esc(t('Hồ sơ đang ở trạng thái đang xem xét.', 'Evidence records currently in review.')) + '</span></div>' +
          '<div class="ec-kpi-card danger"><small>' + esc(t('Ngoại lệ tải lên', 'Upload exceptions')) + '</small><strong>' + esc(exceptions.length) + '</strong><span>' + esc(t('Tệp bị chặn hoặc xác minh thất bại.', 'Files that were blocked or failed verification.')) + '</span></div>' +
          '<div class="ec-kpi-card neutral"><small>' + esc(t('Lần làm mới gần nhất', 'Last refresh')) + '</small><strong>' + esc(work.lastLoaded ? fmtDateTime(work.lastLoaded) : t('Chưa tải', 'Not loaded')) + '</strong><span>' + esc(t('Bạn có thể làm mới bất cứ lúc nào.', 'You can refresh manually at any time.')) + '</span></div>' +
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
    if(state.workspaceMode === 'work') requestRender();
    return resp;
  }).catch(function(){
    updateQuarantineState(quarantineId, { busy:false, status:'failed' });
    showToast(t('Không thể xác minh tệp cách ly.', 'Could not verify quarantine.'), 'error');
    if(state.workspaceMode === 'work') requestRender();
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
    return loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); return resp; });
  }).catch(function(){
    updateQuarantineState(quarantineId, { busy:false });
    showToast(t('Không thể chấp nhận tệp.', 'Could not accept the file.'), 'error');
    if(state.workspaceMode === 'work') requestRender();
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
      return loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); return resp; });
    }).catch(function(){
      updateQuarantineState(quarantineId, { busy:false });
      showToast(t('Không thể từ chối tệp.', 'Could not reject the file.'), 'error');
      if(state.workspaceMode === 'work') requestRender();
      return null;
    });
  });
}

function bindWorkQueue(container){
  var deptEl = document.getElementById('ec-wq-dept');
  if(deptEl) deptEl.onchange = function(){
    state.workQueue.department = deptEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var formEl = document.getElementById('ec-wq-form');
  if(formEl) formEl.onchange = function(){
    state.workQueue.formCode = formEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var typeEl = document.getElementById('ec-wq-type');
  if(typeEl) typeEl.onchange = function(){
    state.workQueue.exceptionType = typeEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var fromEl = document.getElementById('ec-wq-from');
  if(fromEl) fromEl.onchange = function(){
    state.workQueue.dateFrom = fromEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var toEl = document.getElementById('ec-wq-to');
  if(toEl) toEl.onchange = function(){
    state.workQueue.dateTo = toEl.value || '';
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var daysEl = document.getElementById('ec-wq-days');
  if(daysEl) daysEl.onchange = function(){
    state.workQueue.days = Number(daysEl.value || 30) || 30;
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
  };

  var refreshBtn = document.getElementById('ec-wq-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){
    loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
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
}

function render(container){
  var workCount = state.workQueue.loaded ? ((state.workQueue.pending || []).length + (state.workQueue.exceptions || []).length) : 0;

  container.innerHTML =
    '<div class="ec-tabs" id="ec-tabs">' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'work' ? ' active' : '') + '" data-tab="work">' + esc(t('Việc của tôi', 'My Work')) + (workCount ? '<span class="ec-tab-badge">' + workCount + '</span>' : '') + '</button>' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'form' ? ' active' : '') + '" data-tab="form">' + esc(t('Biểu mẫu', 'Forms')) + '</button>' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'eqms' ? ' active' : '') + '" data-tab="eqms">' + esc(t('Online Form', 'Online Form')) + '</button>' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'registry' ? ' active' : '') + '" data-tab="registry">' + esc(t('Quản lý mã', 'Code Registry')) + '</button>' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'upload' ? ' active' : '') + '" data-tab="upload">' + esc(t('Tải lên', 'Upload')) + '</button>' +
      '<button type="button" class="ec-tab' + (state.workspaceMode === 'record-id' ? ' active' : '') + '" data-tab="record-id">' + esc(t('Tạo mã', 'Record ID')) + '</button>' +
    '</div>' +
    '<div class="ec-shell"><div class="ec-workspace ec-workspace-full" id="ec-workspace"></div></div>';
  bindSidebar(container);
  renderWorkspacePane();
}

function renderSidebar(){
  var forms = filterForms();
  var categories = {};
  var cats = ['all','quality','production','maintenance','hr','logistics','safety','other'];
  var catLabels = { all:t('Tất cả','All'), quality:t('Chất lượng','Quality'), production:t('Sản xuất','Production'), maintenance:t('Bảo trì','Maintenance'), hr:t('Nhân sự','HR'), logistics:t('Kho vận','Logistics'), safety:t('An toàn','Safety'), other:t('Khác','Other') };
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

function renderEqmsFormList(container){
  /* Known eQMS online forms — no API dependency */
  var KNOWN_FORMS = [
    { code:'FRM-403-SCAR', title:'Supplier Corrective Action Request (SCAR)', version:'V1', sop:'SOP-401', desc:'SCAR form for supplier corrective actions. Covers identification, quality issue, containment, supplier response, and verification.' }
  ];

  var html = '<div style="max-width:900px;margin:0 auto;padding:24px">' +
    '<h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 4px">Online Forms (eQMS Web Form)</h2>' +
    '<p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6">Select a form to open. Online forms use the eQMS runtime with audit trail, e-signature, workflow, and version control.</p>' +
    '<div style="display:grid;gap:12px">';

  KNOWN_FORMS.forEach(function(f){
    html += '<div data-open-eqms="' + esc(f.code) + '" style="cursor:pointer;padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;display:flex;align-items:center;gap:16px;transition:border-color .15s,box-shadow .15s">' +
      '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#dbeafe,#eff6ff);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">\uD83D\uDCCB</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-family:Consolas,monospace;font-size:14px;font-weight:800;color:#0f172a">' + esc(f.code) +
          ' <span style="font-size:11px;font-weight:600;color:#1565c0;background:#dbeafe;padding:2px 8px;border-radius:999px;margin-left:6px">' + esc(f.version) + '</span>' +
          ' <span style="font-size:11px;font-weight:600;color:#1565c0;margin-left:4px">' + esc(f.sop) + '</span>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:600;color:#334155;margin-top:3px">' + esc(f.title) + '</div>' +
        '<div style="font-size:12px;color:#94a3b8;margin-top:3px;line-height:1.5">' + esc(f.desc) + '</div>' +
      '</div>' +
      '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
        '<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 10px;border-radius:999px;background:#dcfce7;color:#16a34a;letter-spacing:.04em">eQMS Online</span>' +
        '<span style="font-size:11px;color:#64748b">Click to open \u2192</span>' +
      '</div>' +
    '</div>';
  });

  html += '</div></div>';
  container.innerHTML = html;

  /* Bind click */
  Array.prototype.forEach.call(container.querySelectorAll('[data-open-eqms]'), function(card){
    card.onmouseenter = function(){ card.style.borderColor = '#93c5fd'; card.style.boxShadow = '0 4px 16px rgba(21,101,192,.1)'; };
    card.onmouseleave = function(){ card.style.borderColor = '#e2e8f0'; card.style.boxShadow = 'none'; };
    card.onclick = function(){
      var code = card.getAttribute('data-open-eqms');
      if(!code) return;
      state._eqmsOpenCode = code;
      var page = pageEl();
      if(page) render(page);
    };
  });
}

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
      state.workspaceMode = 'registry';
      requestRender();
      loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); });
    };
  });
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
        '<div class="ec-filter-field"><label>' + esc(t('Trạng thái', 'State')) + '</label><select id="ec-reg-state" class="ec-select"><option value="">' + esc(t('Tất cả trạng thái', 'All states')) + '</option>' + ['draft','allocated','submitted','approved','closed','received','rejected','void'].map(function(value){ return '<option value="' + value + '"' + (reg.state === value ? ' selected' : '') + '>' + esc(value) + '</option>'; }).join('') + '</select></div>' +
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
  if(formEl) formEl.onchange = function(){ state.registry.formCode = formEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };
  var modeEl = document.getElementById('ec-reg-mode');
  if(modeEl) modeEl.onchange = function(){ state.registry.deliveryMode = modeEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };
  var stateEl = document.getElementById('ec-reg-state');
  if(stateEl) stateEl.onchange = function(){ state.registry.state = stateEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };
  var searchEl = document.getElementById('ec-reg-search');
  if(searchEl) searchEl.onchange = searchEl.onsearch = function(){ state.registry.search = searchEl.value || ''; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };
  var scopeEl = document.getElementById('ec-reg-scope');
  if(scopeEl) scopeEl.onchange = function(){ state.registry.mineOnly = scopeEl.value !== 'all'; state.registry.page = 1; loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };
  var refreshBtn = document.getElementById('ec-reg-refresh');
  if(refreshBtn) refreshBtn.onclick = function(){ loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); };

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

function renderWorkspacePane(){
  var wsEl = document.getElementById('ec-workspace');
  if(!wsEl) return;
  if(state.workspaceMode !== 'work') stopWorkQueuePolling();
  /* Clear main header toolbar when not viewing a specific form */
  if(state.workspaceMode !== 'form' && typeof setDocHeaderToolbar === 'function') setDocHeaderToolbar('');
  if(state.workspaceLoading){
    wsEl.innerHTML = renderWorkspaceSkeleton();
    return;
  }
  if(state.workspaceMode === 'work'){
    ensureWorkQueuePolling();
    renderWorkQueue(wsEl);
    if(!state.workQueue.loaded && !state.workQueue.loading) loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
    if(!state.registry.loaded && !state.registry.loading) loadRegistry(false).then(function(){ if(state.workspaceMode === 'work') requestRender(); });
    return;
  }
  if(state.workspaceMode === 'record-id'){
    if(typeof window._renderRecordIdGenerator === 'function') window._renderRecordIdGenerator(state.forms, {}, wsEl);
    else wsEl.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Phân hệ Trợ lý tạo mã chưa sẵn sàng', 'Record ID Assistant not ready')) + '</h3></div>';
    return;
  }
  if(state.workspaceMode === 'registry'){
    renderEqmsRegistry(wsEl);
    if(!state.registry.loaded && !state.registry.loading) loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); });
    return;
  }
  if(state.workspaceMode === 'upload'){
    if(typeof window._renderUploadVerify === 'function') window._renderUploadVerify(state.forms, {}, wsEl);
    else wsEl.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Phân hệ Tải lên & Kiểm tra chưa sẵn sàng', 'Upload & Verify not ready')) + '</h3></div>';
    return;
  }

  /* eQMS Online Form tab */
  if(state.workspaceMode === 'eqms'){
    if(state._eqmsOpenCode){
      /* A specific form was selected — open it */
      if(typeof window.openEqmsForm === 'function'){
        window.openEqmsForm(state._eqmsOpenCode, wsEl, Object.assign({ editMode: true }, state._eqmsOpenOptions || {}));
      }
    } else {
      /* Show form list */
      renderEqmsHub(wsEl);
      if(!state.registry.loaded && !state.registry.loading) loadRegistry(false);
    }
    return;
  }

  /* Form tab: embed the document file explorer for FRM category */
  if(state.workspaceMode === 'form'){
    /* Set document browser state to show FRM category */
    if(typeof currentFilter !== 'undefined') currentFilter = 'FRM';
    if(typeof currentFolderPath !== 'undefined' && !state._formFolderInited){
      currentFolderPath = [];
      state._formFolderInited = true;
    }
    /* Render document explorer into our workspace container */
    if(typeof renderDocuments === 'function'){
      renderDocuments('ec-workspace');
    } else {
      wsEl.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Trình duyệt tài liệu chưa sẵn sàng', 'Document browser not ready')) + '</h3></div>';
    }
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
      var code = formItem.getAttribute('data-form') || '';
      if(code === state.selectedFormCode && state.workspaceMode === 'form') return;
      state.selectedFormCode = code;
      state.selectedAllocationId = '';
      state.allocations = [];
      state.workspaceMode = 'form';
      state.workspaceLoading = true;
      render(container);
      loadAllocations().then(function(){
        state.workspaceLoading = false;
        render(container);
      }).catch(function(){
        state.workspaceLoading = false;
        render(container);
      });
      return;
    }

    var allocItem = event.target.closest('[data-alloc]');
    if(allocItem){ state.selectedAllocationId = allocItem.getAttribute('data-alloc') || ''; render(container); return; }

    var toolBtn = event.target.closest('[data-tool]');
    if(toolBtn){
      var mode = toolBtn.getAttribute('data-tool') || 'form';
      state.workspaceMode = (state.workspaceMode === mode) ? 'form' : mode;
      render(container);
      if(state.workspaceMode === 'work') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') render(container); });
      return;
    }

    var tabBtn = event.target.closest('[data-tab]');
    if(tabBtn){
      var tabMode = tabBtn.getAttribute('data-tab') || 'form';
      if(tabMode !== state.workspaceMode){ state._formFolderInited = false; state._eqmsOpenCode = ''; state._eqmsOpenOptions = null; }
      state.workspaceMode = tabMode;
      render(container);
      if(tabMode === 'work') loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') render(container); });
      if(tabMode === 'registry') loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') render(container); });
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

window._renderOnlineFormsLegacy = function(formCode){
  var page = pageEl();
  if(!page) return;
  if(!formCode && state.pendingFillSelection && state.pendingFillSelection.formCode){
    formCode = state.pendingFillSelection.formCode;
    if(state.pendingFillSelection.allocationId) state.selectedAllocationId = state.pendingFillSelection.allocationId;
    state.workspaceMode = 'form';
  }
  if(formCode) state.selectedFormCode = formCode;
  page.innerHTML = renderWorkspaceSkeleton();
  loadAll().then(function(){
    if(state.pendingFillSelection && state.pendingFillSelection.formCode){
      state.selectedFormCode = state.pendingFillSelection.formCode;
      if(state.pendingFillSelection.allocationId) state.selectedAllocationId = state.pendingFillSelection.allocationId;
      state.pendingFillSelection = null;
    }
    if(!state.selectedFormCode && state.forms.length) state.selectedFormCode = state.forms[0].form_code;
    return loadAllocations();
  }).then(function(){
    state.ready = true;
    render(page);
  }).catch(function(){
    page.innerHTML = '<div class="ec-empty"><h3>' + esc(t('Không thể tải dữ liệu', 'Could not load data')) + '</h3><p>' + esc(t('Vui lòng kiểm tra kết nối và thử lại.', 'Please check your connection and try again.')) + '</p></div>';
  });
};

window._fhSwitchTab = function(target){
  state.activeTab = target || '';
  if(target === 'record-id'){ state.workspaceMode = 'record-id'; requestRender(); return; }
  if(target === 'upload' || target === 'upload-verify'){ state.workspaceMode = 'upload'; requestRender(); return; }
  if(target === 'registry'){ state.workspaceMode = 'registry'; requestRender(); loadRegistry(true).then(function(){ if(state.workspaceMode === 'registry') requestRender(); }); return; }
  if(target === 'work' || target === 'my-work'){ state.workspaceMode = 'work'; requestRender(); loadWorkQueue(true).then(function(){ if(state.workspaceMode === 'work') requestRender(); }); return; }
  if(target === 'fill' || target === 'fill-download'){
    var pending = state.pendingFillSelection || {};
    if(pending.formCode || state.selectedFormCode){
      openFormWorkspace(pending.formCode || state.selectedFormCode, pending.allocationId || state.selectedAllocationId || '');
      state.pendingFillSelection = null;
      return;
    }
  }
  state.workspaceMode = 'form';
  requestRender();
};

window.renderOnlineForms = function(formCode){
  var page = pageEl();
  if(!page) return;

  /* If a specific form is requested, navigate to document browser to open it */
  if(formCode){
    if(typeof navigateTo === 'function'){
      navigateTo('documents', 'FRM');
      /* After navigating, try to open the specific document */
      setTimeout(function(){
        if(typeof openDoc === 'function') openDoc(formCode);
      }, 500);
    }
    return;
  }

  /* Default: show work queue (Việc của tôi) */
  if(!state.workspaceMode || state.workspaceMode === 'form') state.workspaceMode = 'work';
  page.innerHTML = renderWorkspaceSkeleton();
  loadAll().then(function(){
    state.ready = true;
    render(page);
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

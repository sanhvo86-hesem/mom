(function(){
'use strict';

var FORM_CODE = String((new URLSearchParams(window.location.search || '')).get('form_code') || 'FRM-403-SCAR').trim() || 'FRM-403-SCAR';
var PORTAL_API_URL = '/mom/api.php';
var FIELD_IDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','part_rev','lot_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','root_cause_required','supplier_response_due_date','supplier_root_cause','supplier_corrective_action','supplier_preventive_action','verification_method','verification_result','scar_status','issued_by','approved_by','supplier_contact'];
var REQUIRED_FIELDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','supplier_response_due_date','scar_status','issued_by'];
var ROOT_CAUSE_FIELDS = ['supplier_root_cause','supplier_corrective_action','supplier_preventive_action'];
var LOOKUP_FIELDS = {
  supplier_name: {
    hostId: 'supplier_name_lookup',
    source: 'suppliers',
    placeholder: 'Tìm và chọn nhà cung cấp từ dữ liệu nền',
    helper: 'Chọn nhà cung cấp để tự động điền mã và liên hệ.',
    onSelect: function(item){
      state.data.supplier_name = String(item.supplier_name || item.label || '').trim();
      state.data.supplier_id = String(item.supplier_id || item.value || '').trim();
      state.data.supplier_contact = buildSupplierContact(item);
    }
  },
  part_number: {
    hostId: 'part_number_lookup',
    source: 'parts',
    placeholder: 'Tìm và chọn part / revision từ dữ liệu nền',
    helper: 'Chọn part để tự động gắn revision hiện hành.',
    onSelect: function(item){
      state.data.part_number = String(item.part_number || item.value || '').trim();
      state.data.part_rev = String(item.revision || '').trim();
      if(!state.data.supplier_id && item.preferred_supplier_id){
        applySupplierById(String(item.preferred_supplier_id || '').trim(), false);
      }
    }
  },
  issued_by: {
    hostId: 'issued_by_lookup',
    source: 'company_users',
    placeholder: 'Tìm và chọn người phát hành',
    helper: 'Chọn từ danh sách công ty hoặc dùng người đăng nhập.',
    allowCurrentUser: true,
    onSelect: function(item){
      state.data.issued_by = String(item.person_name || item.label || item.value || '').trim();
    }
  },
  approved_by: {
    hostId: 'approved_by_lookup',
    source: 'company_users',
    placeholder: 'Tìm và chọn người phê duyệt',
    helper: 'Chọn từ danh sách công ty hoặc dùng người đăng nhập.',
    allowCurrentUser: true,
    onSelect: function(item){
      state.data.approved_by = String(item.person_name || item.label || item.value || '').trim();
    }
  },
  defect_type: {
    hostId: 'defect_type_lookup',
    source: 'defect_catalog',
    placeholder: 'Tìm và chọn loại lỗi từ danh mục kiểm soát',
    helper: 'Loại lỗi dùng chung giữa EQMS, ERP và MES.',
    onSelect: function(item){
      state.data.defect_type = String(item.defect_name || item.label || item.value || '').trim();
    }
  }
};
var STATUS_LABELS = { open:'Mở', awaiting_response:'Chờ phản hồi nhà cung cấp', under_review:'Đang xem xét', verification:'Đang xác nhận', closed:'Đã đóng' };
var SEVERITY_META = {
  minor:{ label:'Nhẹ', note:'Theo dõi theo nhịp xử lý thông thường, không cần escalations tức thời.', className:'success' },
  major:{ label:'Nặng', note:'Cần containment rõ ràng và phản hồi nguyên nhân gốc trong hạn ngắn.', className:'warning' },
  critical:{ label:'Nghiêm trọng', note:'Cần điều phối khẩn, nhấn mạnh nguy cơ tái diễn và xác minh hiệu lực chặt chẽ.', className:'danger' }
};

var params = new URLSearchParams(window.location.search || '');
var state = {
  lang: params.get('lang') === 'en' ? 'en-US' : 'vi-VN',
  allocationId: String(params.get('allocation_id') || '').trim(),
  recordId: String(params.get('record_id') || '').trim(),
  csrfToken: '',
  loggedIn: false,
  currentUser: null,
  schema: null,
  allocation: null,
  entry: null,
  serverDraft: null,
  localDraft: null,
  master: null,
  companyDirectory: [],
  signatures: {},
  resetSignaturesSnapshot: {},
  approvalSummary: null,
  reviewSla: null,
  data: {},
  resetSnapshot: {},
  loadedSource: 'Mặc định từ hồ sơ',
  lastLocalSaveAt: '',
  lastServerSaveAt: '',
  saveTimer: null,
  busySave: false,
  busySubmit: false,
  localKey: '',
  editMode: true,
  isDirty: false,
  lookupsMounted: false
};
var els = {};
var runtimeMojibakeObserver = null;

document.addEventListener('DOMContentLoaded', init);

function init(){
  cacheElements();
  state.localKey = localDraftKey();
  bindEvents();
  bindRuntimeGuards();
  repairVisibleMojibake(document.body);
  installRuntimeMojibakeObserver();
  updateActionState();
  updateRuntimeAlert('info', 'Đang khởi tạo biểu mẫu', 'Hệ thống đang tải thông tin hồ sơ, nháp gần nhất và dữ liệu nền nhà cung cấp.', 'Khởi tạo');
  loadRuntime();
}

function cacheElements(){
  els.form = byId('scarForm');
  els.supplierHints = byId('supplierHints');
  els.saveMeta = byId('saveMeta');
  els.entryMeta = byId('entryMeta');
  els.workflowPanel = byId('scarWorkflowPanel');
  els.btnSaveDraft = byId('btnSaveDraft');
  els.btnReset = byId('btnReset');
  els.btnSubmit = byId('btnSubmit');
  els.btnEdit   = byId('btnEdit');
  els.btnCancel = byId('btnCancel');
  els.btnPrint  = byId('btnPrint');
}

function bindEvents(){
  if(els.form){
    els.form.addEventListener('input', handleFieldChange);
    els.form.addEventListener('change', handleFieldChange);
    els.form.addEventListener('submit', handleSubmit);
  }
  if(els.btnSaveDraft) els.btnSaveDraft.addEventListener('click', handleSaveDraft);
  if(els.btnReset) els.btnReset.addEventListener('click', handleReset);
  if(els.btnEdit)   els.btnEdit.addEventListener('click', handleEnterEdit);
  if(els.btnCancel) els.btnCancel.addEventListener('click', handleCancelEdit);
  if(els.btnPrint)  els.btnPrint.addEventListener('click', handlePrint);
  if(els.supplierHints){
    els.supplierHints.addEventListener('click', function(event){
      var button = event.target.closest('[data-supplier-id]');
      if(!button) return;
      event.preventDefault();
      applySupplierById(String(button.getAttribute('data-supplier-id') || '').trim(), true);
    });
  }
}

function loadRuntime(){
  fetchStatus().then(function(){
    return Promise.all([loadSchema(), loadAllocation(), loadServerDraft(), loadMasterData(), loadCompanyDirectory()]);
  }).then(function(){
    state.localDraft = loadLocalDraft();
    return loadEntry();
  }).then(function(){
    state.signatures = buildMergedSignatures();
    state.data = buildMergedData();
    state.resetSnapshot = clone(state.data);
    state.resetSignaturesSnapshot = clone(state.signatures);
    populateForm();
    mountLookupControls();
    renderAll();
    updateActionState();
    var hasSubmitted = !!(state.entry && state.entry.entry_id);
    setMode(hasSubmitted ? 'view' : 'edit');
    if(!state.loggedIn){
      updateRuntimeAlert('warning', 'Phiên đăng nhập chưa sẵn sàng', 'Biểu mẫu vẫn cho phép nhập và tính toán cục bộ, nhưng muốn lưu nháp máy chủ hoặc gửi hồ sơ thì cần đăng nhập QMS hợp lệ.', 'Khách');
    } else if(!state.allocationId){
      updateRuntimeAlert('warning', 'Biểu mẫu đang mở độc lập', 'Chưa có allocation_id nên anh chỉ có thể nhập thử và lưu cục bộ. Muốn gửi SCAR thật, hãy mở từ workspace đã cấp mã hồ sơ.', 'Chưa cấp mã');
    } else {
      updateRuntimeAlert('success', 'Biểu mẫu đã sẵn sàng', 'Dữ liệu hồ sơ, nháp và ngữ cảnh truy xuất đã được đồng bộ. Anh có thể tiếp tục hoàn thiện SCAR ngay trên file HTML độc lập này.', 'Sẵn sàng');
    }
    notifyHeight();
  }).catch(function(error){
    console.error(error);
    updateRuntimeAlert('danger', 'Không thể khởi tạo biểu mẫu', error && error.message ? error.message : 'Hệ thống không tải được dữ liệu cần thiết cho SCAR.', 'Lỗi');
    updateActionState();
    notifyParentToast('Không thể khởi tạo biểu mẫu SCAR.', 'error');
  });
}

function fetchStatus(){
  return callApiDirect('status', {}, 'GET').then(function(resp){
    state.loggedIn = !!(resp && resp.ok && resp.logged_in);
    state.currentUser = resp && resp.user ? resp.user : null;
    state.csrfToken = String(resp && resp.csrf_token || '').trim();
    return resp;
  });
}

function loadSchema(){
  return callApi('form_fill_load_schema', { form_code: FORM_CODE }, 'GET').then(function(resp){
    state.schema = resp && resp.ok ? (resp.schema || null) : null;
    setText('metaVersion', (state.schema && state.schema.version) || 'V1');
    return state.schema;
  }).catch(function(){ state.schema = null; return null; });
}

function loadAllocation(){
  if(!state.allocationId) return Promise.resolve(null);
  return callApi('upload_allocation_status', { allocation_id: state.allocationId }, 'GET').then(function(resp){
    state.allocation = resp && resp.ok ? (resp.allocation || null) : null;
    if(state.allocation && !state.recordId) state.recordId = String(state.allocation.record_id || '').trim();
    state.approvalSummary = state.allocation && state.allocation.approval_summary ? clone(state.allocation.approval_summary) : null;
    state.reviewSla = state.allocation && state.allocation.review_sla ? clone(state.allocation.review_sla) : null;
    return state.allocation;
  }).catch(function(){ state.allocation = null; return null; });
}

function loadEntry(){
  if(!state.loggedIn || !state.allocationId) return Promise.resolve(null);
  return callApi('online_form_entry_get', {
    form_code: FORM_CODE,
    allocation_id: state.allocationId,
    entry_id: state.allocation && state.allocation.online_submission ? String(state.allocation.online_submission.entry_id || '') : ''
  }, 'POST').then(function(resp){
    state.entry = resp && resp.ok ? (resp.entry || null) : null;
    return state.entry;
  }).catch(function(){ state.entry = null; return null; });
}

function loadServerDraft(){
  if(!state.loggedIn || !state.allocationId) return Promise.resolve(null);
  return callApi('form_fill_get_draft', { allocation_id: state.allocationId }, 'GET').then(function(resp){
    state.serverDraft = resp && resp.ok ? (resp.draft || null) : null;
    return state.serverDraft;
  }).catch(function(){ state.serverDraft = null; return null; });
}

function loadMasterData(){
  if(!state.loggedIn) return Promise.resolve(null);
  return callApi('master_data_snapshot', {}, 'GET').then(function(resp){
    state.master = resp && resp.ok ? (resp.data || null) : null;
    hydrateSupplierDatalist();
    return state.master;
  }).catch(function(){ state.master = null; return null; });
}

function loadCompanyDirectory(){
  if(!state.loggedIn) return Promise.resolve([]);
  return callApi('company_directory_list', {}, 'GET').then(function(resp){
    state.companyDirectory = Array.isArray(resp && resp.users) ? resp.users : [];
    return state.companyDirectory;
  }).catch(function(){
    state.companyDirectory = [];
    return state.companyDirectory;
  });
}

function buildMergedData(){
  var base = defaultData();
  mergeFieldMap(base, allocationPrefill());
  [
    { label:'Bản nộp gần nhất', timestamp:parseTimestamp(state.entry && (state.entry.updated_at || state.entry.submitted_at || state.entry.created_at)), values:extractEntryValues(state.entry), order:1 },
    { label:'Nháp máy chủ', timestamp:parseTimestamp(state.serverDraft && state.serverDraft.saved_at), values:extractDraftValues(state.serverDraft), order:2 },
    { label:'Nháp cục bộ', timestamp:parseTimestamp(state.localDraft && state.localDraft.saved_at), values:extractDraftValues(state.localDraft), order:3 }
  ].filter(function(item){
    return item.values && Object.keys(item.values).length;
  }).sort(function(a, b){
    return (a.timestamp || 0) - (b.timestamp || 0) || a.order - b.order;
  }).forEach(function(item){
    mergeFieldMap(base, item.values);
    state.loadedSource = item.label;
  });
  normalizeData(base);
  autoFillSupplierFromPart(base, false);
  autoFillSupplierIdentity(base, false);
  return base;
}

function defaultData(){
  var today = isoToday();
  return {
    scar_date: today,
    supplier_name: '',
    supplier_id: '',
    po_number: '',
    part_number: '',
    part_rev: '',
    lot_number: '',
    quantity_received: '',
    quantity_rejected: '',
    defect_type: '',
    defect_description: '',
    severity: '',
    containment_action: '',
    root_cause_required: true,
    supplier_response_due_date: addDays(today, 7),
    supplier_root_cause: '',
    supplier_corrective_action: '',
    supplier_preventive_action: '',
    verification_method: '',
    verification_result: '',
    scar_status: 'open',
    issued_by: defaultIssuer(),
    approved_by: '',
    supplier_contact: ''
  };
}

function allocationPrefill(){
  var ctx = state.allocation && state.allocation.master_context ? state.allocation.master_context : {};
  return {
    supplier_name: ctx.supplier_name || '',
    supplier_id: ctx.supplier_id || '',
    po_number: ctx.po_number || ctx.purchase_order || '',
    part_number: ctx.part_number || '',
    part_rev: ctx.part_revision || '',
    lot_number: ctx.lot_number || ctx.heat_number || '',
    issued_by: defaultIssuer()
  };
}

function extractEntryValues(entry){
  var values = {};
  if(!entry || typeof entry !== 'object') return values;
  FIELD_IDS.forEach(function(fieldId){
    if(Object.prototype.hasOwnProperty.call(entry, fieldId)) values[fieldId] = entry[fieldId];
  });
  return values;
}

function extractDraftValues(draft){
  if(!draft || typeof draft !== 'object') return {};
  var source = null;
  if(draft.data && typeof draft.data === 'object' && draft.data.fieldValues && typeof draft.data.fieldValues === 'object') source = draft.data.fieldValues;
  else if(draft.fieldValues && typeof draft.fieldValues === 'object') source = draft.fieldValues;
  else if(draft.data && typeof draft.data === 'object') source = draft.data;
  if(!source || typeof source !== 'object') return {};
  var values = {};
  FIELD_IDS.forEach(function(fieldId){
    if(Object.prototype.hasOwnProperty.call(source, fieldId)) values[fieldId] = source[fieldId];
  });
  return values;
}

function buildMergedSignatures(){
  var merged = {};
  mergeSignatureMap(merged, state.serverDraft && state.serverDraft.data ? state.serverDraft.data.signatures : null);
  mergeSignatureMap(merged, state.serverDraft && state.serverDraft.signatures ? state.serverDraft.signatures : null);
  mergeSignatureMap(merged, state.localDraft && state.localDraft.signatures ? state.localDraft.signatures : null);
  mergeSignatureMap(merged, state.entry && state.entry.signatures ? state.entry.signatures : null);
  mergeSignatureMap(merged, state.allocation && state.allocation.signatures ? state.allocation.signatures : null);
  if(state.allocation && state.allocation.approval_signature && !merged.approver){
    merged.approver = normalizeSignature(state.allocation.approval_signature, 'Approved');
  }
  var approvalRecords = Array.isArray(state.allocation && state.allocation.approval_records) ? state.allocation.approval_records : [];
  approvalRecords.forEach(function(record){
    if(!record || typeof record !== 'object' || !record.signature) return;
    var normalized = normalizeSignature(record.signature, record.meaning || 'Approved');
    if(record.meaning === 'reviewed' && !merged.qa_reviewer) merged.qa_reviewer = normalized;
    if((record.meaning === 'approved' || !record.meaning) && !merged.approver) merged.approver = normalized;
  });
  return merged;
}

function mergeSignatureMap(target, source){
  if(!source || typeof source !== 'object') return;
  Object.keys(source).forEach(function(key){
    var normalized = normalizeSignature(source[key], '');
    if(normalized) target[key] = normalized;
  });
}

function normalizeSignature(signature, fallbackMeaning){
  if(!signature || typeof signature !== 'object') return null;
  return {
    signerName: String(signature.signerName || signature.printed_name || signature.signer_name || '').trim(),
    signerRole: String(signature.signerRole || signature.signer_role || '').trim(),
    signerId: String(signature.signerId || signature.signer_id || '').trim(),
    meaning: String(signature.meaning || signature.signature_meaning || fallbackMeaning || '').trim(),
    timestamp: String(signature.timestamp || signature.signed_at || '').trim(),
    hash: String(signature.hash || '').trim(),
    reason: String(signature.reason || '').trim(),
    typed_name: String(signature.typed_name || '').trim(),
    image_data: String(signature.image_data || signature.data_url || '').trim(),
    mode: String(signature.mode || '').trim()
  };
}

function normalizeData(data){
  FIELD_IDS.forEach(function(fieldId){
    if(fieldId === 'root_cause_required'){
      data[fieldId] = data[fieldId] === true || data[fieldId] === 'true' || data[fieldId] === 1 || data[fieldId] === '1' || data[fieldId] === '';
      return;
    }
    if(data[fieldId] === undefined || data[fieldId] === null) data[fieldId] = '';
  });
  if(!data.scar_status) data.scar_status = 'open';
  if(!data.scar_date) data.scar_date = isoToday();
  if(!data.supplier_response_due_date && data.scar_date) data.supplier_response_due_date = addDays(data.scar_date, 7);
  if(!data.issued_by) data.issued_by = defaultIssuer();
}

function populateForm(){
  FIELD_IDS.forEach(function(fieldId){
    var node = byId(fieldId);
    if(!node) return;
    if(node.type === 'checkbox') node.checked = !!state.data[fieldId];
    else node.value = state.data[fieldId] == null ? '' : String(state.data[fieldId]);
  });
  syncLookupControlsFromState();
}

function handleFieldChange(event){
  var target = event.target;
  if(!target || !target.name) return;
  syncDataFromDom();
  if(target.id === 'supplier_name' || target.id === 'supplier_id') autoFillSupplierIdentity(state.data, true);
  if(target.id === 'part_number') autoFillSupplierFromPart(state.data, true);
  clearFieldError(target.name);
  renderAll();
  scheduleLocalSave();
}

function syncDataFromDom(){
  FIELD_IDS.forEach(function(fieldId){
    var node = byId(fieldId);
    if(!node) return;
    state.data[fieldId] = node.type === 'checkbox' ? !!node.checked : node.value;
  });
  normalizeData(state.data);
}

function snapshotData(data){
  var copy = clone(data || {});
  normalizeData(copy);
  return JSON.stringify(copy);
}

function hasDirtyChanges(){
  return snapshotData(state.data) !== snapshotData(state.resetSnapshot) ||
    JSON.stringify(state.signatures || {}) !== JSON.stringify(state.resetSignaturesSnapshot || {});
}

function publishDirtyState(source){
  var dirty = hasDirtyChanges();
  state.isDirty = dirty;
  postParentMessage({
    type: 'ec-form-runtime-dirty',
    form_code: FORM_CODE,
    allocation_id: state.allocationId,
    record_id: currentRecordId(),
    dirty: dirty,
    source: source || '',
    last_saved_at: state.lastServerSaveAt || state.lastLocalSaveAt || '',
    last_dirty_at: dirty ? new Date().toISOString() : '',
    summary: dirty ? 'Biểu mẫu đang có thay đổi chưa được chốt thành bản nháp an toàn.' : ''
  });
  return dirty;
}

function markCurrentStateSaved(){
  state.resetSnapshot = clone(state.data);
  state.resetSignaturesSnapshot = clone(state.signatures);
  publishDirtyState('saved');
}

function bindRuntimeGuards(){
  window.addEventListener('beforeunload', function(event){
    try{ syncDataFromDom(); }catch(_err){}
    if(!publishDirtyState('beforeunload')) return;
    try{ saveLocalDraft('beforeunload'); }catch(_err){}
    var msg = 'Biểu mẫu đang có dữ liệu dang dở. Hãy lưu nháp trước khi mở liên kết khác hoặc làm mới hệ thống.';
    event.preventDefault();
    event.returnValue = msg;
    return msg;
  });
  window.addEventListener('pagehide', function(){
    try{
      syncDataFromDom();
      if(hasDirtyChanges()) saveLocalDraft('pagehide');
      publishDirtyState('pagehide');
    }catch(_err){}
  });
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) return;
    try{
      syncDataFromDom();
      if(hasDirtyChanges()) saveLocalDraft('visibilitychange');
      publishDirtyState('visibilitychange');
    }catch(_err){}
  });
  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if(!link) return;
    var href = String(link.getAttribute('href') || '').trim();
    if(!href || href.charAt(0) === '#') return;
    try{ syncDataFromDom(); }catch(_err){}
    if(!publishDirtyState('link-intent')) return;
    var leave = window.confirm('Biểu mẫu đang có dữ liệu dang dở. Hãy lưu nháp trước khi mở liên kết khác. Nhấn OK để rời đi không lưu, hoặc Cancel để ở lại biểu mẫu.');
    if(!leave){
      event.preventDefault();
      event.stopPropagation();
      notifyParentToast('Hãy lưu nháp trước khi rời biểu mẫu nếu muốn giữ dữ liệu đang làm dở.', 'warn');
      return;
    }
    try{ saveLocalDraft('link-leave'); }catch(_ignore){}
  }, true);
  window.addEventListener('message', handleParentRuntimeCommand);
}

function handleParentRuntimeCommand(event){
  var data = event.data || {};
  if(!data || typeof data !== 'object' || data.type !== 'ec-form-runtime-command') return;
  if(event.source !== window.parent) return;
  var requestId = String(data.request_id || '').trim();
  function reply(payload){
    postParentMessage(Object.assign({
      type: 'ec-form-runtime-command-result',
      request_id: requestId,
      command: data.command,
      form_code: FORM_CODE,
      allocation_id: state.allocationId,
      record_id: currentRecordId()
    }, payload || {}));
  }
  if(data.command === 'query-dirty'){
    try{ syncDataFromDom(); }catch(_err){}
    reply({ ok:true, dirty: publishDirtyState('query-dirty') });
    return;
  }
  if(data.command === 'save-draft'){
    saveDraftWorkflow('guard').then(function(result){
      reply({
        ok: !!(result && result.ok),
        dirty: publishDirtyState('command-save'),
        scope: result && result.scope ? result.scope : ''
      });
    });
    return;
  }
  if(data.command === 'discard'){
    state.data = clone(state.resetSnapshot);
    state.signatures = clone(state.resetSignaturesSnapshot);
    normalizeData(state.data);
    populateForm();
    renderAll();
    reply({ ok:true, dirty: publishDirtyState('command-discard') });
    return;
  }
  reply({ ok:false, error:'unknown_command', dirty: publishDirtyState('unknown-command') });
}

function renderAll(){
  syncDataFromDom();
  renderHero();
  renderMetrics();
  renderKpis();
  renderContainmentHint();
  renderOptionalSectionState();
  renderCloseout();
  renderSidebar();
  renderSupplierHints();
  renderWorkflowPanel();
  updateMetaFootnotes();
  updateActionState();
  renderDisplayValues();
  repairVisibleMojibake(document.body);
  publishDirtyState('render');
  notifyHeight();
}

function renderHero(){
  var poPart = [state.data.po_number || '', compactPartLabel()].filter(Boolean).join(' · ') || 'Chưa có ngữ cảnh';
  setText('heroSupplier', state.data.supplier_name || 'Chưa xác định nhà cung cấp');
  setText('heroRecordId', currentRecordId() || 'Chưa cấp mã');
  setText('heroPoPart', poPart);
  setText('heroLot', state.data.lot_number || 'Chưa xác định');
  setText('heroIssuedBy', state.data.issued_by || 'Chưa ghi nhận');
}

function renderMetrics(){
  var severity = severityMeta(state.data.severity);
  setMetricClass('metricSeverity', severity.className || 'info');
  setText('metricSeverityValue', severity.label || 'Chưa chọn');
  setText('metricSeverityNote', severity.note || 'Chọn đúng mức độ để điều phối phản hồi và review phù hợp.');

  var dueMeta = dueDateMeta();
  setMetricClass('metricDue', dueMeta.className);
  setText('metricDueValue', dueMeta.title);
  setText('metricDueNote', dueMeta.note);

  var rejectInfo = rejectMeta();
  setMetricClass('metricRejectRate', rejectInfo.className);
  setText('metricRejectRateValue', rejectInfo.rateText);
  setText('metricRejectRateNote', rejectInfo.note);

  var statusLabel = STATUS_LABELS[state.data.scar_status] || 'Mở';
  setMetricClass('metricStatus', statusMetricClass());
  setText('metricStatusValue', statusLabel);
  setText('metricStatusNote', statusNote(statusLabel));
}

function renderKpis(){
  var qtyReceived = parseNumber(state.data.quantity_received);
  var qtyRejected = parseNumber(state.data.quantity_rejected);
  var qtyAccepted = Math.max(qtyReceived - qtyRejected, 0);
  var rate = qtyReceived > 0 ? (qtyRejected / qtyReceived) * 100 : 0;
  setText('kpiReceived', formatNumber(qtyReceived, 0));
  setText('kpiRejected', formatNumber(qtyRejected, 0));
  setText('kpiAccepted', formatNumber(qtyAccepted, 0));
  setText('kpiRejectRate', formatPercent(rate));
  setValue('quantity_accepted_calc', formatNumber(qtyAccepted, 0));
}

function renderContainmentHint(){
  var title = state.data.root_cause_required ? 'Yêu cầu phản hồi đầy đủ' : 'Chế độ containment rút gọn';
  var note = state.data.root_cause_required
    ? 'Nhà cung cấp phải nộp nguyên nhân gốc, hành động khắc phục và hành động phòng ngừa trước khi xem xét đóng hồ sơ.'
    : 'QA đã tắt yêu cầu nguyên nhân gốc. Phản hồi nhà cung cấp vẫn có thể nhập, nhưng hệ thống không ép đủ bộ RCA/CAPA/PAPA khi gửi.';
  setTextInside('containmentHint', 'strong', title);
  setTextInside('containmentHint', 'span', note);
}

function renderOptionalSectionState(){
  var section = byId('supplierResponseSection');
  if(section) section.classList.toggle('scar-section-optional', !state.data.root_cause_required);
}

function renderCloseout(){
  setValue('closeout_ready', closeoutMeta().label);
}

function renderSidebar(){
  var progress = progressMeta();
  setText('sideProgressValue', formatPercent(progress.percent));
  setText('sideProgressText', progress.note);
  setProgressValue('sideProgressBar', progress.percent);
  setText('sideRecordId', currentRecordId() || 'Chưa cấp mã');
  setText('sideStatus', STATUS_LABELS[state.data.scar_status] || 'Mở');
  setText('sideSeverity', severityMeta(state.data.severity).label || 'Chưa chọn');
  setText('sideDue', dueDateMeta().shortTitle);
  setText('sideRejectRate', rejectMeta().rateText);
  setText('sideSupplierName', state.data.supplier_name || 'Chưa xác định');
  setText('sideSupplierContact', state.data.supplier_contact || 'Chưa có liên hệ phản hồi.');
}

function renderSupplierHints(){
  /* Supplier quick-picks removed â supplier is chosen via the lookup dropdown only. */
  if(els.supplierHints) els.supplierHints.innerHTML = '';
}

function renderWorkflowPanel(){
  if(!els.workflowPanel) return;
  var workflowState = currentWorkflowState();
  var summary = currentApprovalSummary();
  var reviewSla = currentReviewSla();
  var submissionRevision = currentSubmissionRevision();
  var resubmissions = Math.max(0, submissionRevision - 1);
  var signatureBlocks = Array.isArray(state.schema && state.schema.signature_blocks) ? state.schema.signature_blocks : [];
  var html = '<div class="scar-workflow-summary">' +
      summaryCard('Trạng thái workflow', workflowStateLabel(workflowState), workflowStateNote(workflowState)) +
      summaryCard('Bản nộp hiện tại', submissionRevision > 0 ? ('R' + submissionRevision) : 'Chưa nộp', resubmissions > 0 ? ('Đã nộp lại ' + resubmissions + ' lần.') : 'Chưa phát sinh nộp lại có kiểm soát.') +
      summaryCard('Phê duyệt', approvalHeadline(summary), approvalSubline(summary)) +
      summaryCard('SLA review', reviewSlaHeadline(reviewSla), reviewSlaSubline(reviewSla)) +
    '</div>';

  if(signatureBlocks.length){
    html += '<div class="scar-signature-grid">';
    signatureBlocks.forEach(function(block){
      html += renderSignatureCard(block, state.signatures[block.id]);
    });
    html += '</div>';
  }

  html += '<div class="scar-workflow-actions">' + renderWorkflowActions(workflowState) + '</div>' +
    '<div class="scar-workflow-note">Workflow review, chữ ký điện tử và hành động reopen đều chạy trên cùng HTML SCAR này để tránh tách bề mặt hiển thị khỏi bề mặt vận hành.</div>';

  els.workflowPanel.innerHTML = html;
  bindWorkflowActions();
}

function summaryCard(label, value, note){
  return '<div class="scar-summary-card"><small>' + esc(label) + '</small><strong>' + esc(value) + '</strong><span>' + esc(note) + '</span></div>';
}

function renderSignatureCard(block, signatureData){
  var normalized = normalizeSignature(signatureData, String(block.meaning || '').trim());
  var canSign = canSignBlock(block);
  var signed = !!(normalized && (normalized.signerName || normalized.timestamp || normalized.hash));
  var title = String(block.label_en || block.label || block.id || '').trim();
  var subtitle = String(block.label || '').trim();
  var meaning = String(block.meaning || '').trim() || 'Signed';
  var html = '<div class="scar-signature-card' + (signed ? ' signed' : '') + '">' +
    '<div class="scar-signature-head">' +
      '<div><strong>' + esc(title) + '</strong>' + (subtitle && subtitle !== title ? '<span>' + esc(subtitle) + '</span>' : '') + '</div>' +
      '<span class="scar-signature-meaning">' + esc(meaning) + '</span>' +
    '</div>' +
    '<div class="scar-signature-pad">';
  if(signed){
    html += '<div><strong>' + esc(normalized.signerName || 'Đã ký') + '</strong></div>' +
      '<div>' + esc(normalized.signerRole || 'Vai trò chưa ghi nhận') + '</div>' +
      '<div>' + esc(normalized.reason || 'Đã xác nhận điện tử trên hệ thống.') + '</div>';
  } else {
    html += '<div class="scar-signature-empty">Chưa ký</div><div>Khối chữ ký này sẽ được kích hoạt đúng thời điểm trong workflow.</div>';
  }
  html += '</div>';
  if(signed){
    html += '<div class="scar-signature-meta">' +
      '<span>' + esc(normalized.timestamp ? formatDateTime(normalized.timestamp) : 'Chưa có thời điểm') + '</span>' +
      '<span>' + esc(normalized.signerId || meaning) + '</span>' +
    '</div>';
  }
  html += '<div class="scar-signature-actions">';
  if(canSign && !signed){
    html += '<button type="button" class="qf-btn secondary" data-sign-block="' + esc(block.id) + '">Ký</button>';
  }
  if(canClearSignature(block, signed)){
    html += '<button type="button" class="qf-btn ghost" data-sign-clear="' + esc(block.id) + '">Xóa chữ ký</button>';
  }
  html += '</div></div>';
  return html;
}

function renderWorkflowActions(workflowState){
  var actions = [];
  if(canSubmitForReview(workflowState)){
    actions.push('<button type="button" class="qf-btn secondary" data-workflow-action="submit-review">Gửi xem xét</button>');
  }
  if(canReject(workflowState)){
    actions.push('<button type="button" class="qf-btn ghost" data-workflow-action="reject">Từ chối</button>');
  }
  if(canApprove(workflowState)){
    actions.push('<button type="button" class="qf-btn primary" data-workflow-action="approve">Phê duyệt</button>');
  }
  if(canReopen(workflowState)){
    actions.push('<button type="button" class="qf-btn ghost" data-workflow-action="reopen">Mở lại hồ sơ</button>');
  }
  if(!actions.length && ['draft', 'allocated', 'rejected'].indexOf(workflowState) >= 0){
    actions.push('<button type="button" class="qf-btn ghost" disabled>Ký phát hành rồi dùng nút Gửi SCAR ở cuối form</button>');
  }
  if(!actions.length) actions.push('<button type="button" class="qf-btn ghost" disabled>Chưa có thao tác workflow phù hợp ở trạng thái hiện tại</button>');
  return actions.join('');
}

function bindWorkflowActions(){
  if(!els.workflowPanel) return;
  Array.prototype.forEach.call(els.workflowPanel.querySelectorAll('[data-sign-block]'), function(btn){
    btn.onclick = function(){
      captureSignature(btn.getAttribute('data-sign-block') || '');
    };
  });
  Array.prototype.forEach.call(els.workflowPanel.querySelectorAll('[data-sign-clear]'), function(btn){
    btn.onclick = function(){
      var blockId = btn.getAttribute('data-sign-clear') || '';
      if(!blockId) return;
      delete state.signatures[blockId];
      saveLocalDraft('signature_clear');
      renderAll();
    };
  });
  Array.prototype.forEach.call(els.workflowPanel.querySelectorAll('[data-workflow-action]'), function(btn){
    btn.onclick = function(){
      var action = btn.getAttribute('data-workflow-action') || '';
      if(action === 'submit-review') doSubmitForReview();
      else if(action === 'approve') doReviewAction('approve');
      else if(action === 'reject') doReviewAction('reject');
      else if(action === 'reopen') doReopen();
    };
  });
}

function currentWorkflowState(){
  return String((state.allocation && state.allocation.status) || (state.entry && state.entry.workflow_state) || 'draft').trim().toLowerCase();
}

function currentApprovalSummary(){
  if(state.approvalSummary && typeof state.approvalSummary === 'object') return state.approvalSummary;
  if(state.allocation && state.allocation.approval_summary && typeof state.allocation.approval_summary === 'object') return state.allocation.approval_summary;
  return {};
}

function currentReviewSla(){
  if(state.reviewSla && typeof state.reviewSla === 'object') return state.reviewSla;
  if(state.allocation && state.allocation.review_sla && typeof state.allocation.review_sla === 'object') return state.allocation.review_sla;
  return {};
}

function currentSubmissionRevision(){
  if(state.entry && state.entry.submission_revision) return Number(state.entry.submission_revision || 0);
  if(state.allocation && state.allocation.online_submission && state.allocation.online_submission.submission_revision) return Number(state.allocation.online_submission.submission_revision || 0);
  return 0;
}

function workflowStateLabel(stateKey){
  var map = {
    draft: 'Draft',
    allocated: 'Allocated',
    submitted: 'Submitted',
    received: 'Received',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Rejected',
    closed: 'Closed',
    voided: 'Voided'
  };
  return map[stateKey] || (stateKey || 'Draft');
}

function workflowStateNote(stateKey){
  if(stateKey === 'submitted') return 'Biểu mẫu đã gửi dữ liệu online và đang chờ chuyển sang bước xem xét.';
  if(stateKey === 'in_review') return 'Hồ sơ đang ở hàng chờ review/phê duyệt và có thể thao tác ngay tại section này.';
  if(stateKey === 'approved') return 'Hồ sơ đã được phê duyệt. Có thể mở lại nếu cần controlled edit.';
  if(stateKey === 'rejected') return 'Hồ sơ đã bị từ chối và cần chỉnh sửa/nộp lại có kiểm soát.';
  if(stateKey === 'closed') return 'Hồ sơ đã đóng vòng đời hiện hành.';
  return 'Hoàn thiện biểu mẫu, ký phát hành và gửi xem xét trên cùng bề mặt HTML.';
}

function approvalHeadline(summary){
  var complete = !!summary.is_complete;
  var collected = Number(summary.collected_approvals || 0);
  var required = Number(summary.minimum_approvals || 1);
  if(complete) return 'Đã đủ phê duyệt';
  return collected + '/' + required + ' phê duyệt';
}

function approvalSubline(summary){
  if(summary.status_label_vi) return String(summary.status_label_vi);
  if(summary.status_label) return String(summary.status_label);
  return 'Theo dõi số chữ ký/phê duyệt đã thu thập trên allocation hiện hành.';
}

function reviewSlaHeadline(reviewSla){
  if(!reviewSla || typeof reviewSla !== 'object') return 'Chưa kích hoạt';
  if(reviewSla.overdue) return 'Quá hạn review';
  if(reviewSla.deadline_at) return reviewSla.status_label_vi || reviewSla.status_label || 'Đang theo SLA';
  return 'Chưa khởi tạo';
}

function reviewSlaSubline(reviewSla){
  if(!reviewSla || typeof reviewSla !== 'object') return 'SLA sẽ bắt đầu khi hồ sơ được gửi vào bước xem xét.';
  if(reviewSla.deadline_at) return 'Hạn: ' + formatDateTime(reviewSla.deadline_at);
  return 'SLA review sẽ được vật liệu hóa sau khi gửi xem xét.';
}

function userRoles(){
  var user = state.currentUser || {};
  var roles = Array.isArray(user.roles) ? user.roles : [user.role];
  return roles.map(function(role){ return String(role || '').trim().toLowerCase(); }).filter(Boolean);
}

function schemaRoles(bucket){
  var rolesAllowed = state.schema && state.schema.roles_allowed ? state.schema.roles_allowed : {};
  if(Array.isArray(rolesAllowed)) return rolesAllowed.map(function(role){ return String(role || '').trim().toLowerCase(); }).filter(Boolean);
  var bucketRoles = Array.isArray(rolesAllowed[bucket]) ? rolesAllowed[bucket] : [];
  return bucketRoles.map(function(role){ return String(role || '').trim().toLowerCase(); }).filter(Boolean);
}

function userHasSchemaRole(bucket){
  var allowed = schemaRoles(bucket);
  if(!allowed.length) return true;
  var mine = userRoles();
  return allowed.some(function(role){ return mine.indexOf(role) >= 0 || role === 'all'; });
}

function normalizeIdentity(value){
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function currentUserMatchesField(fieldId){
  var user = state.currentUser || {};
  var fieldValue = normalizeIdentity(state.data && state.data[fieldId]);
  if(!fieldValue) return false;
  var candidates = [
    user.username,
    user.display_name,
    user.name,
    user.full_name,
    user.employee_name,
    user.employee_code
  ].map(normalizeIdentity).filter(Boolean);
  return candidates.some(function(candidate){ return candidate === fieldValue; });
}

function userIsElevatedWorkflowActor(){
  var roles = userRoles();
  if(roles.some(function(role){
    return ['admin', 'system_admin', 'super_admin', 'ceo', 'qa_manager', 'quality_manager'].indexOf(role) >= 0;
  })) return true;
  var user = state.currentUser || {};
  var title = normalizeIdentity(user.title || user.job_title || '');
  return ['ceo', 'chief executive officer', 'general director', 'system admin', 'quality manager', 'qa manager'].some(function(token){
    return title.indexOf(token) >= 0;
  });
}

function canAuthorCurrentScar(){
  return userHasSchemaRole('fill') || currentUserMatchesField('issued_by') || userIsElevatedWorkflowActor();
}

function canSignBlock(block){
  if(!state.loggedIn || !state.editMode || !block) return false;
  var workflowState = currentWorkflowState();
  if(block.id === 'originator'){
    return ['approved', 'closed', 'voided'].indexOf(workflowState) < 0 && canAuthorCurrentScar();
  }
  if(block.id === 'qa_reviewer') return workflowState === 'in_review' && (userHasSchemaRole('review') || userHasSchemaRole('approve') || currentUserMatchesField('approved_by') || userIsElevatedWorkflowActor());
  if(block.id === 'approver') return workflowState === 'in_review' && (userHasSchemaRole('approve') || currentUserMatchesField('approved_by') || userIsElevatedWorkflowActor());
  return false;
}

function canClearSignature(block, signed){
  if(!signed || !block || !state.editMode) return false;
  if(block.id !== 'originator') return false;
  return ['draft', 'allocated', 'submitted', 'received', 'rejected'].indexOf(currentWorkflowState()) >= 0;
}

function canSubmitForReview(workflowState){
  return !!state.loggedIn && !!state.allocationId && ['submitted', 'received'].indexOf(workflowState) >= 0 && (canAuthorCurrentScar() || userHasSchemaRole('review') || userHasSchemaRole('approve'));
}

function canApprove(workflowState){
  return !!state.loggedIn && !!state.allocationId && workflowState === 'in_review' && (userHasSchemaRole('approve') || currentUserMatchesField('approved_by') || userIsElevatedWorkflowActor());
}

function canReject(workflowState){
  return !!state.loggedIn && !!state.allocationId && workflowState === 'in_review' && (userHasSchemaRole('review') || userHasSchemaRole('approve') || currentUserMatchesField('approved_by') || userIsElevatedWorkflowActor());
}

function canReopen(workflowState){
  return !!state.loggedIn && !!state.allocationId && ['approved', 'rejected', 'closed'].indexOf(workflowState) >= 0 && (userHasSchemaRole('approve') || currentUserMatchesField('approved_by') || userIsElevatedWorkflowActor());
}

function submitReadiness(){
  var errors = validateBeforeSubmit();
  var missingSignatures = missingRequiredSubmitSignatures();
  return {
    valid: !Object.keys(errors).length && !missingSignatures.length,
    errors: errors,
    missingSignatures: missingSignatures
  };
}
function getESignatureCtor(){
  if(typeof window.ESignature === 'function') return window.ESignature;
  try{
    if(window.parent && window.parent !== window && typeof window.parent.ESignature === 'function') return window.parent.ESignature;
  }catch(_err){}
  return null;
}

function ensureSignatureModuleReady(){
  var existing = getESignatureCtor();
  if(typeof existing === 'function') return Promise.resolve(existing);
  if(window.__scarSignatureLoader) return window.__scarSignatureLoader;
  window.__scarSignatureLoader = new Promise(function(resolve){
    var src = '/mom/scripts/portal/11-e-signature.js?v=scar403-runtime-20260401-8';
    var script = document.querySelector('script[data-esignature-loader="scar-runtime"]');
    if(!script){
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.esignatureLoader = 'scar-runtime';
      document.head.appendChild(script);
    }
    if(script.dataset.loaded === '1'){
      resolve(getESignatureCtor() || null);
      return;
    }
    var done = function(){
      var ctor = getESignatureCtor();
      if(typeof ctor === 'function') script.dataset.loaded = '1';
      resolve(typeof ctor === 'function' ? ctor : null);
    };
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', function(){ resolve(null); }, { once: true });
    window.setTimeout(done, 1500);
  }).finally(function(){
    window.__scarSignatureLoader = null;
  });
  return window.__scarSignatureLoader;
}

function cleanupBrokenSignatureOverlay(){
  Array.prototype.forEach.call(document.querySelectorAll('.esig-overlay, .scar-signature-overlay'), function(node){
    if(node && node.parentNode) node.parentNode.removeChild(node);
  });
}

function ensureScarSignatureStyles(){
  if(byId('scar-signature-inline-styles')) return;
  var style = document.createElement('style');
  style.id = 'scar-signature-inline-styles';
  style.textContent = [
    '.scar-signature-overlay{position:fixed;inset:0;z-index:10020;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}',
    '.scar-signature-modal{width:min(560px,96vw);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(15,23,42,.28);overflow:hidden}',
    '.scar-signature-modal header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #e2e8f0}',
    '.scar-signature-modal header h3{margin:0;font-size:20px;line-height:1.3;color:#0f172a}',
    '.scar-signature-modal header p{margin:6px 0 0;color:#64748b;line-height:1.5}',
    '.scar-signature-close{border:none;background:#f8fafc;color:#334155;width:38px;height:38px;border-radius:12px;cursor:pointer;font-size:20px}',
    '.scar-signature-body{padding:22px;display:grid;gap:16px}',
    '.scar-signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.scar-signature-field{display:grid;gap:6px}',
    '.scar-signature-field label{font-size:12px;font-weight:800;color:#475569;letter-spacing:.03em;text-transform:uppercase}',
    '.scar-signature-field input,.scar-signature-field textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:11px 12px;font:inherit;color:#0f172a;background:#fff}',
    '.scar-signature-field input[readonly]{background:#f8fafc;color:#475569}',
    '.scar-signature-field textarea{min-height:88px;resize:vertical}',
    '.scar-signature-preview{border:1px dashed #93c5fd;border-radius:14px;background:#eff6ff;padding:18px;text-align:center}',
    '.scar-signature-preview strong{display:block;font-size:28px;line-height:1.2;color:#0c2d48;font-family:"Segoe Script","Brush Script MT","Segoe UI",cursive}',
    '.scar-signature-preview span{display:block;margin-top:8px;font-size:13px;color:#475569}',
    '.scar-signature-actions{display:flex;justify-content:flex-end;gap:10px;padding:18px 22px;border-top:1px solid #e2e8f0;background:#f8fafc}',
    '.scar-signature-actions button{min-width:130px;padding:11px 16px;border-radius:12px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:700;cursor:pointer}',
    '.scar-signature-actions .primary{background:#1565c0;border-color:#1565c0;color:#fff}',
    '.scar-signature-error{padding:0 22px 16px;color:#b91c1c;font-size:13px;font-weight:700}',
    '@media (max-width:640px){.scar-signature-grid{grid-template-columns:1fr}}'
  ].join('');
  document.head.appendChild(style);
}

function hashSignaturePayload(value){
  var text = String(value || '');
  if(window.crypto && window.crypto.subtle && window.TextEncoder){
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function(buffer){
      return Array.from(new Uint8Array(buffer)).map(function(byte){
        return byte.toString(16).padStart(2, '0');
      }).join('');
    });
  }
  var hash = 0;
  for(var i = 0; i < text.length; i += 1){
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Promise.resolve('fallback-' + Math.abs(hash));
}

function escAttr(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function openScarSignatureDialog(block){
  cleanupBrokenSignatureOverlay();
  ensureScarSignatureStyles();
  var me = state.currentUser || {};
  var signerName = String(me.display_name || me.name || me.username || state.data.issued_by || '').trim();
  var signerRole = String(me.title || me.role || '').trim();
  var meaning = String(block && (block.meaning || block.label_en || block.label || block.id) || 'Signed').trim();
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    overlay.className = 'scar-signature-overlay';
    overlay.innerHTML =
      '<div class="scar-signature-modal" role="dialog" aria-modal="true" aria-label="Ký điện tử SCAR">' +
        '<header>' +
          '<div><h3>Ký điện tử SCAR</h3><p>Xác nhận bước <strong>' + esc(meaning) + '</strong> ngay trên biểu mẫu HTML này. Toàn bộ thông tin ký sẽ được băm và lưu vào hồ sơ.</p></div>' +
          '<button type="button" class="scar-signature-close" aria-label="Đóng">×</button>' +
        '</header>' +
        '<div class="scar-signature-body">' +
          '<div class="scar-signature-grid">' +
            '<div class="scar-signature-field"><label>Người ký</label><input type="text" data-sign-name value="' + escAttr(signerName) + '"' + (signerName ? ' readonly' : '') + '></div>' +
            '<div class="scar-signature-field"><label>Chức vụ</label><input type="text" data-sign-role value="' + escAttr(signerRole) + '"' + (signerRole ? ' readonly' : '') + '></div>' +
          '</div>' +
          '<div class="scar-signature-field"><label>Lý do ký</label><textarea data-sign-reason placeholder="Ví dụ: Xác nhận phát hành hồ sơ SCAR để gửi xem xét.">Xác nhận bước ' + esc(meaning) + '</textarea></div>' +
          '<div class="scar-signature-preview"><strong>' + esc(signerName || 'Người ký') + '</strong><span>Chữ ký điện tử sẽ lưu tên người ký, thời điểm ký và mã băm xác thực.</span></div>' +
        '</div>' +
        '<div class="scar-signature-error scar-hidden" data-sign-error></div>' +
        '<div class="scar-signature-actions">' +
          '<button type="button" data-action="cancel">Hủy</button>' +
          '<button type="button" class="primary" data-action="confirm">Ký và xác nhận</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    repairVisibleMojibake(overlay);
    var nameInput = overlay.querySelector('[data-sign-name]');
    var roleInput = overlay.querySelector('[data-sign-role]');
    var reasonInput = overlay.querySelector('[data-sign-reason]');
    var preview = overlay.querySelector('.scar-signature-preview strong');
    var errorNode = overlay.querySelector('[data-sign-error]');
    function close(result){
      if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result || null);
    }
    function showError(message){
      if(!errorNode) return;
      errorNode.textContent = message;
      errorNode.classList.remove('scar-hidden');
    }
    function hideError(){
      if(!errorNode) return;
      errorNode.textContent = '';
      errorNode.classList.add('scar-hidden');
    }
    function syncPreview(){
      if(preview) preview.textContent = String(nameInput && nameInput.value || 'Người ký').trim() || 'Người ký';
    }
    if(nameInput && !nameInput.readOnly) nameInput.addEventListener('input', syncPreview);
    overlay.querySelector('.scar-signature-close').onclick = function(){ close(null); };
    overlay.querySelector('[data-action="cancel"]').onclick = function(){ close(null); };
    overlay.addEventListener('click', function(event){
      if(event.target === overlay) close(null);
    });
    document.addEventListener('keydown', function escClose(event){
      if(event.key === 'Escape'){
        document.removeEventListener('keydown', escClose);
        close(null);
      }
    }, { once:true });
    overlay.querySelector('[data-action="confirm"]').onclick = function(){
      hideError();
      var finalName = String(nameInput && nameInput.value || '').trim();
      var finalRole = String(roleInput && roleInput.value || '').trim();
      var finalReason = String(reasonInput && reasonInput.value || '').trim();
      if(!finalName){
        showError('Hãy nhập hoặc xác nhận họ tên người ký.');
        if(nameInput) nameInput.focus();
        return;
      }
      if(!finalReason){
        showError('Hãy nhập lý do ký trước khi xác nhận.');
        if(reasonInput) reasonInput.focus();
        return;
      }
      var signedAt = new Date().toISOString();
      hashSignaturePayload([FORM_CODE, currentRecordId(), block.id, finalName, finalRole, finalReason, signedAt].join('|')).then(function(hash){
        close({
          signer_name: finalName,
          signer_role: finalRole,
          signer_id: String(me.username || '').trim(),
          signed_at: signedAt,
          reason: finalReason,
          signature_meaning: meaning,
          hash: hash,
          typed_name: finalName,
          mode: 'typed'
        });
      });
    };
    syncPreview();
    if(reasonInput) reasonInput.focus();
  });
}

function captureSignature(blockId){
  var block = ((state.schema && state.schema.signature_blocks) || []).find(function(item){ return item && item.id === blockId; }) || null;
  if(!block){
    notifyParentToast('Không tìm thấy cấu hình chữ ký cho bước này.', 'warn');
    return Promise.resolve(null);
  }
  ensureSignatureModuleReady().catch(function(){ return null; });
  return openScarSignatureDialog(block).then(function(sigData){
    if(!sigData) return null;
    state.signatures[blockId] = normalizeSignature(sigData, block.meaning || '');
    saveLocalDraft('signature_capture');
    renderAll();
    return state.signatures[blockId];
  });
}

function doSubmitForReview(){
  if(!state.allocationId) return;
  callApi('evidence_submit_for_review', { allocation_id: state.allocationId }, 'POST').then(function(resp){
    if(!resp || !resp.ok) throw new Error(serverErrorMessage(resp) || 'Máy chủ chưa nhận chuyển bước xem xét.');
    state.allocation = resp.allocation || state.allocation;
    state.approvalSummary = resp.approval_summary || state.approvalSummary;
    state.reviewSla = resp.review_sla || state.reviewSla;
    updateRuntimeAlert('success', 'Đã chuyển sang bước xem xét', 'Hồ sơ SCAR đã vào workflow review. Chữ ký và trạng thái ở section 6 đã được làm mới.', 'Review');
    notifyParentToast('Đã gửi hồ sơ sang bước xem xét.', 'success');
    notifyParentRefresh();
    return refreshRuntimeState();
  }).catch(function(error){
    updateRuntimeAlert('danger', 'Không thể gửi xem xét', (error && error.message) || 'Máy chủ chưa chấp nhận chuyển bước xem xét.', 'Lỗi');
    notifyParentToast('Không thể gửi hồ sơ sang bước xem xét.', 'error');
  });
}

function doReviewAction(action){
  if(!state.allocationId) return;
  if(action === 'approve'){
    var proceed = (state.signatures.approver && state.signatures.approver.hash)
      ? Promise.resolve(state.signatures.approver)
      : captureSignature('approver');
    proceed.then(function(signature){
      if(!signature) return null;
      return askTextDialog({
        title: 'Xác thực phê duyệt',
        message: 'Nhập mật khẩu hiện tại để hoàn tất phê duyệt hồ sơ SCAR này.',
        placeholder: 'Mật khẩu tài khoản QMS',
        password: true
      }).then(function(password){
        if(!password) return null;
        return callApi('evidence_review', {
          allocation_id: state.allocationId,
          action: 'approve',
          password: password,
          signature_data: signature,
          signature_meaning: 'approved',
          reason: 'Phê duyệt hồ sơ SCAR trên HTML runtime'
        }, 'POST');
      });
    }).then(function(resp){
      if(!resp) return;
      if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'Máy chủ chưa xác nhận phê duyệt.');
      state.allocation = resp.allocation || state.allocation;
      state.approvalSummary = resp.approval_summary || state.approvalSummary;
      state.reviewSla = resp.review_sla || state.reviewSla;
      if(state.allocation && state.allocation.approval_signature) state.signatures.approver = normalizeSignature(state.allocation.approval_signature, 'Approved');
      updateRuntimeAlert('success', 'Đã phê duyệt hồ sơ', 'SCAR đã được phê duyệt trong workflow và lưu dấu vết điện tử đầy đủ.', 'Approved');
      notifyParentToast('Đã phê duyệt SCAR.', 'success');
      notifyParentRefresh();
      return refreshRuntimeState();
    }).catch(function(error){
      updateRuntimeAlert('danger', 'Không thể phê duyệt', (error && error.message) || 'Máy chủ chưa chấp nhận phê duyệt.', 'Lỗi');
      notifyParentToast('Không thể phê duyệt SCAR.', 'error');
    });
    return;
  }
  askTextDialog({
    title: 'Lý do từ chối',
    message: 'Nhập lý do từ chối để trả hồ sơ về bước chỉnh sửa có kiểm soát.',
    placeholder: 'Lý do từ chối'
  }).then(function(reason){
    if(!reason) return null;
    return callApi('evidence_review', {
      allocation_id: state.allocationId,
      action: 'reject',
      reason: reason
    }, 'POST');
  }).then(function(resp){
    if(!resp) return;
    if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'Máy chủ chưa chấp nhận từ chối.');
    state.allocation = resp.allocation || state.allocation;
    state.approvalSummary = resp.approval_summary || state.approvalSummary;
    state.reviewSla = resp.review_sla || state.reviewSla;
    updateRuntimeAlert('warning', 'Đã từ chối hồ sơ', 'SCAR đã bị trả về để chỉnh sửa và nộp lại có kiểm soát.', 'Rejected');
    notifyParentToast('Đã từ chối SCAR.', 'warn');
    notifyParentRefresh();
    return refreshRuntimeState();
  }).catch(function(error){
    updateRuntimeAlert('danger', 'Không thể từ chối', (error && error.message) || 'Máy chủ chưa chấp nhận thao tác từ chối.', 'Lỗi');
    notifyParentToast('Không thể từ chối SCAR.', 'error');
  });
}

function doReopen(){
  if(!state.allocationId) return;
  askTextDialog({
    title: 'Lý do mở lại',
    message: 'Nhập lý do mở lại hồ sơ để hệ thống tạo controlled edit đúng chuẩn.',
    placeholder: 'Lý do mở lại'
  }).then(function(reason){
    if(!reason) return null;
    return callApi('evidence_reopen', { allocation_id: state.allocationId, reason: reason }, 'POST');
  }).then(function(resp){
    if(!resp) return;
    if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'Máy chủ chưa chấp nhận mở lại hồ sơ.');
    state.allocation = resp.allocation || state.allocation;
    state.approvalSummary = resp.approval_summary || null;
    state.reviewSla = resp.review_sla || null;
    updateRuntimeAlert('warning', 'Đã mở lại hồ sơ', 'SCAR đã quay về controlled edit. Anh có thể chỉnh sửa và nộp lại trên cùng HTML này.', 'Reopen');
    notifyParentToast('Đã mở lại SCAR để controlled edit.', 'warn');
    notifyParentRefresh();
    return refreshRuntimeState();
  }).catch(function(error){
    updateRuntimeAlert('danger', 'Không thể mở lại hồ sơ', (error && error.message) || 'Máy chủ chưa chấp nhận mở lại.', 'Lỗi');
    notifyParentToast('Không thể mở lại SCAR.', 'error');
  });
}

function refreshRuntimeState(){
  return Promise.all([loadAllocation(), loadEntry(), loadServerDraft()]).then(function(){
    state.signatures = buildMergedSignatures();
    state.resetSignaturesSnapshot = clone(state.signatures);
    if(state.entry){
      mergeFieldMap(state.data, extractEntryValues(state.entry));
      normalizeData(state.data);
      populateForm();
    }
    renderAll();
  });
}

function updateMetaFootnotes(){
  if(els.saveMeta){
    if(state.lastServerSaveAt) els.saveMeta.textContent = repairStringValue('Đã đồng bộ máy chủ lúc ' + formatDateTime(state.lastServerSaveAt) + '.');
    else if(state.lastLocalSaveAt) els.saveMeta.textContent = repairStringValue('Đã lưu cục bộ lúc ' + formatDateTime(state.lastLocalSaveAt) + '.');
    else els.saveMeta.textContent = repairStringValue('Chưa có lượt lưu nào trong phiên này.');
  }
  if(els.entryMeta){
    var revision = state.entry && state.entry.submission_revision ? ' · Revision nộp: R' + state.entry.submission_revision : '';
    els.entryMeta.textContent = repairStringValue('Nguồn dữ liệu khởi tạo: ' + state.loadedSource + revision + '.');
  }
  repairVisibleMojibake(document.body);
}

function updateActionState(){
  var readiness = submitReadiness();
  if(els.btnSaveDraft){
    els.btnSaveDraft.disabled = !!state.busySave || !!state.busySubmit;
    els.btnSaveDraft.textContent = repairStringValue(state.busySave ? 'Đang lưu...' : (state.loggedIn && state.allocationId ? 'Lưu nháp' : 'Lưu cục bộ'));
  }
  if(els.btnReset) els.btnReset.disabled = !!state.busySave || !!state.busySubmit;
  if(els.btnSubmit){
    els.btnSubmit.disabled = !!state.busySubmit || !state.loggedIn || !state.allocationId || !readiness.valid;
    if(state.busySubmit) els.btnSubmit.textContent = repairStringValue('Đang gửi SCAR...');
    else if(readiness.missingSignatures.length) els.btnSubmit.textContent = repairStringValue('Ký phát hành trước');
    else if(Object.keys(readiness.errors).length) els.btnSubmit.textContent = repairStringValue('Hoàn thiện trường bắt buộc');
    else els.btnSubmit.textContent = repairStringValue('Gửi SCAR');
  }
  var isView = !state.editMode;
  // in view mode: disable submit (already disabled if not logged in)
  if(els.btnSubmit && isView) els.btnSubmit.disabled = true;
  repairVisibleMojibake(document.body);
}

function handleSaveDraft(){
  return saveDraftWorkflow('manual');
  if(state.busySave || state.busySubmit) return;
  syncDataFromDom();
  clearFieldErrors();
  saveLocalDraft('manual');
  if(!state.loggedIn || !state.allocationId){
    updateRuntimeAlert('warning', 'Đã lưu cục bộ', 'Phiên hiện tại chưa có mã hồ sơ hoặc chưa đăng nhập, nên bản lưu này chỉ nằm trên trình duyệt hiện tại.', 'Cục bộ');
    notifyParentToast('Đã lưu cục bộ biểu mẫu SCAR.', 'info');
    updateMetaFootnotes();
    return;
  }
  state.busySave = true;
  updateActionState();
  callApi('form_fill_save_draft', {
    allocation_id: state.allocationId,
    form_code: FORM_CODE,
    data: { fieldValues: clone(state.data), runtime_mode: 'standalone_html' }
  }, 'POST').then(function(resp){
    if(!resp || !resp.ok) throw new Error('Máy chủ không xác nhận lưu nháp.');
    state.lastServerSaveAt = new Date().toISOString();
    state.resetSnapshot = clone(state.data);
    updateRuntimeAlert('success', 'Đã lưu nháp máy chủ', 'Biểu mẫu SCAR đã được đồng bộ nháp lên máy chủ. Anh có thể tiếp tục làm việc hoặc quay lại sau mà không mất dữ liệu.', 'Đã lưu');
    notifyParentToast('Đã lưu nháp SCAR lên máy chủ.', 'success');
  }).catch(function(error){
    updateRuntimeAlert('warning', 'Máy chủ chưa lưu được nháp', (error && error.message) || 'Bản cục bộ vẫn còn trên trình duyệt này.', 'Cảnh báo');
    notifyParentToast('Không thể lưu nháp SCAR lên máy chủ.', 'warn');
  }).finally(function(){
    state.busySave = false;
    updateMetaFootnotes();
    updateActionState();
    notifyHeight();
  });
}

function saveDraftWorkflow(source){
  if(state.busySave || state.busySubmit) return Promise.resolve({ ok:false, error:'busy' });
  syncDataFromDom();
  clearFieldErrors();
  saveLocalDraft(source || 'manual');
  markCurrentStateSaved();
  if(!state.loggedIn || !state.allocationId){
    updateRuntimeAlert('warning', 'Đã lưu cục bộ', 'Phiên hiện tại chưa có mã hồ sơ hoặc chưa đăng nhập, nên bản lưu này chỉ nằm trên trình duyệt hiện tại.', 'Cục bộ');
    notifyParentToast('Đã lưu cục bộ biểu mẫu SCAR.', 'info');
    updateMetaFootnotes();
    return Promise.resolve({ ok:true, scope:'local' });
  }
  state.busySave = true;
  updateActionState();
  return callApi('form_fill_save_draft', {
    allocation_id: state.allocationId,
    form_code: FORM_CODE,
    data: { fieldValues: clone(state.data), signatures: clone(state.signatures), runtime_mode: 'standalone_html' }
  }, 'POST').then(function(resp){
    if(!resp || !resp.ok) throw new Error('Máy chủ không xác nhận lưu nháp.');
    state.lastServerSaveAt = new Date().toISOString();
    markCurrentStateSaved();
    updateRuntimeAlert('success', 'Đã lưu nháp máy chủ', 'Biểu mẫu SCAR đã được đồng bộ nháp lên máy chủ. Anh có thể tiếp tục làm việc hoặc quay lại sau mà không mất dữ liệu.', 'Đã lưu');
    notifyParentToast('Đã lưu nháp SCAR lên máy chủ.', 'success');
    return { ok:true, scope:'server' };
  }).catch(function(error){
    updateRuntimeAlert('warning', 'Máy chủ chưa lưu được nháp', (error && error.message) || 'Bản cục bộ vẫn còn trên trình duyệt này.', 'Cảnh báo');
    notifyParentToast('Không thể lưu nháp SCAR lên máy chủ.', 'warn');
    markCurrentStateSaved();
    return { ok:true, scope:'local', warning:true };
  }).finally(function(){
    state.busySave = false;
    updateMetaFootnotes();
    updateActionState();
    notifyHeight();
  });
}

function handleReset(){
  clearFieldErrors();
  state.data = clone(state.resetSnapshot);
  state.signatures = clone(state.resetSignaturesSnapshot);
  normalizeData(state.data);
  populateForm();
  renderAll();
  saveLocalDraft('reset');
  publishDirtyState('reset');
  updateRuntimeAlert('info', 'Đã khôi phục dữ liệu', 'Biểu mẫu đã quay về ảnh chụp dữ liệu gần nhất được tải hoặc lưu thủ công.', 'Khôi phục');
  notifyParentToast('Đã khôi phục dữ liệu biểu mẫu SCAR.', 'info');
}

function setMode(mode){
  state.editMode = (mode === 'edit');
  document.body.setAttribute('data-mode', mode);
  renderDisplayValues();
  updateActionState();
  notifyHeight();
}

function handleEnterEdit(){
  setMode('edit');
  notifyParentToast('Đang chỉnh sửa biểu mẫu SCAR.', 'info');
}

function handleCancelEdit(){
  state.data = clone(state.resetSnapshot);
  state.signatures = clone(state.resetSignaturesSnapshot);
  normalizeData(state.data);
  populateForm();
  renderDisplayValues();
  setMode('view');
  publishDirtyState('cancel-edit');
  notifyParentToast('Đã hủy chỉnh sửa, khôi phục dữ liệu hiển thị.', 'info');
}

function handlePrint(){
  var prev = document.body.getAttribute('data-mode') || 'edit';
  document.body.setAttribute('data-mode', 'view');
  renderDisplayValues();
  window.print();
  document.body.setAttribute('data-mode', prev);
}

var SEVERITY_DV_LABELS = { minor:'Nhẹ (Minor)', major:'Nặng (Major)', critical:'Nghiêm trọng (Critical)' };
var STATUS_DV_LABELS = { open:'Mở (Open)', awaiting_response:'Chờ phản hồi NCC', under_review:'Đang xem xét', verification:'Đang xác nhận', closed:'Đã đóng (Closed)' };

function formatDateDv(iso){
  if(!iso) return '—';
  var parts = String(iso).split('-');
  if(parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return iso;
}

function renderDisplayValues(){
  var DV_MAP = {
    scar_date: function(v){ return formatDateDv(v); },
    supplier_response_due_date: function(v){ return formatDateDv(v); },
    scar_status: function(v){ return STATUS_DV_LABELS[v] || v || '—'; },
    severity: function(v){ return SEVERITY_DV_LABELS[v] || v || '—'; },
    quantity_received: function(v){ return v || v === 0 ? String(parseNumber(v) || 0) : '—'; },
    quantity_rejected: function(v){ return v || v === 0 ? String(parseNumber(v) || 0) : '—'; },
    quantity_accepted_calc: function(v){ return v || '0'; },
    root_cause_required: function(v){ return v ? '✓ Yêu cầu phân tích nguyên nhân gốc (RCA)' : '✕ Chế độ containment rút gọn'; },
    closeout_ready: function(v){ return v || '—'; }
  };
  FIELD_IDS.forEach(function(fieldId){
    var dv = byId(fieldId + '__dv');
    if(!dv) return;
    var value = state.data[fieldId];
    var fmt = DV_MAP[fieldId];
    var text = fmt ? fmt(value) : (String(value == null ? '' : value).trim() || '—');
    dv.textContent = text;
    dv.className = 'qf-dv' + (text === '—' || !String(value || '').trim() ? ' qf-dv--empty' : '');
  });
  // Also update the root_cause display span (special case - it's after the label, not an input)
  var rcDv = byId('root_cause_required__dv');
  if(rcDv){
    var rcVal = state.data.root_cause_required;
    rcDv.textContent = rcVal ? '✓ Yêu cầu phân tích nguyên nhân gốc (RCA)' : '✕ Chế độ containment rút gọn';
    rcDv.className = 'qf-dv';
  }
}

function handleSubmit(event){
  event.preventDefault();
  if(state.busySubmit) return;
  syncDataFromDom();
  clearFieldErrors();
  var errors = validateBeforeSubmit();
  if(Object.keys(errors).length){
    applyFieldErrors(errors);
    updateRuntimeAlert('danger', 'Biểu mẫu chưa đủ điều kiện gửi', 'Hãy hoàn thiện các trường bắt buộc, kiểm tra số lượng và xác nhận đủ phản hồi nhà cung cấp trước khi gửi SCAR.', 'Thiếu dữ liệu');
    focusFirstError(errors);
    notifyParentToast('SCAR chưa đủ điều kiện gửi.', 'warn');
    return;
  }
  var missingSignatures = missingRequiredSubmitSignatures();
  if(missingSignatures.length){
    updateRuntimeAlert('warning', 'Thiếu chữ ký bắt buộc', 'Hãy ký các block bắt buộc trước khi gửi: ' + missingSignatures.join(', ') + '.', 'Thiếu chữ ký');
    notifyParentToast('Thiếu chữ ký bắt buộc trước khi gửi SCAR.', 'warn');
    if(els.workflowPanel && typeof els.workflowPanel.scrollIntoView === 'function') els.workflowPanel.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  if(!state.loggedIn || !state.allocationId){
    updateRuntimeAlert('warning', 'Chưa thể gửi SCAR', 'Biểu mẫu cần được mở từ workspace đã cấp mã hồ sơ và phiên QMS phải còn hiệu lực.', 'Chưa sẵn sàng');
    notifyParentToast('Chưa có mã hồ sơ hoặc phiên đăng nhập để gửi SCAR.', 'warn');
    return;
  }
  state.busySubmit = true;
  updateActionState();
  var payload = buildSubmitPayload();
  callApi('form_fill_submit_online', { allocation_id: state.allocationId, form_code: FORM_CODE, form_data: payload }, 'POST').then(function(resp){
    if(!resp || !resp.ok) throw new Error(serverErrorMessage(resp) || 'Máy chủ không nhận được SCAR.');
    state.allocation = resp.allocation || state.allocation;
    state.entry = mergeSubmittedEntry(payload, resp);
    state.lastServerSaveAt = new Date().toISOString();
    state.resetSnapshot = clone(state.data);
    saveLocalDraft('submitted');
    return linkOrderIfPossible().catch(function(){ return false; }).then(function(){
      updateRuntimeAlert('success', 'Đã gửi SCAR thành công', 'Máy chủ đã ghi nhận bản nộp trực tuyến của hồ sơ này. Workflow review và checklist ngoài portal sẽ được làm mới ngay sau đó.', 'Đã gửi');
      notifyParentToast('Đã gửi SCAR thành công.', 'success');
      notifyParentRefresh();
      renderAll();
      setMode('view');
    });
  }).catch(function(error){
    updateRuntimeAlert('danger', 'Không thể gửi SCAR', (error && error.message) || 'Hệ thống chưa ghi nhận được bản nộp trực tuyến.', 'Lỗi');
    notifyParentToast('Không thể gửi SCAR.', 'error');
  }).finally(function(){
    state.busySubmit = false;
    updateMetaFootnotes();
    updateActionState();
    notifyHeight();
  });
}

function validateBeforeSubmit(){
  var errors = {};
  REQUIRED_FIELDS.forEach(function(fieldId){
    if(!hasMeaningfulValue(state.data[fieldId])) errors[fieldId] = 'Trường này là bắt buộc.';
  });
  var qtyReceived = parseNumber(state.data.quantity_received);
  var qtyRejected = parseNumber(state.data.quantity_rejected);
  if(qtyReceived <= 0) errors.quantity_received = 'Số lượng nhận phải lớn hơn 0.';
  if(qtyRejected < 0) errors.quantity_rejected = 'Số lượng loại bỏ không được âm.';
  if(qtyRejected > qtyReceived && qtyReceived > 0) errors.quantity_rejected = 'Số lượng loại bỏ không được lớn hơn số lượng nhận.';
  if(state.data.supplier_response_due_date && state.data.scar_date){
    var scarDate = Date.parse(state.data.scar_date);
    var dueDate = Date.parse(state.data.supplier_response_due_date);
    if(isFinite(scarDate) && isFinite(dueDate) && dueDate < scarDate){
      errors.supplier_response_due_date = 'Hạn phản hồi không được sớm hơn ngày phát hành SCAR.';
    }
  }
  if(state.data.root_cause_required){
    ROOT_CAUSE_FIELDS.forEach(function(fieldId){
      if(!hasMeaningfulValue(state.data[fieldId])) errors[fieldId] = 'Trường này bắt buộc khi yêu cầu phân tích nguyên nhân gốc.';
    });
  }
  if(String(state.data.scar_status || '') === 'closed'){
    if(!hasMeaningfulValue(state.data.verification_method)) errors.verification_method = 'Cần nêu phương pháp xác nhận trước khi đóng SCAR.';
    if(!hasMeaningfulValue(state.data.verification_result)) errors.verification_result = 'Cần có kết quả xác nhận trước khi đóng SCAR.';
  }
  return errors;
}

function applyFieldErrors(errors){
  Object.keys(errors).forEach(function(fieldId){
    var field = byName(fieldId);
    var fieldWrap = field ? field.closest('.qf-field') : null;
    var msg = document.querySelector('[data-error-for="' + cssEscape(fieldId) + '"]');
    if(fieldWrap) fieldWrap.classList.add('is-error');
    if(msg){
      msg.textContent = errors[fieldId];
      msg.classList.remove('scar-hidden');
    }
  });
}

function clearFieldErrors(){
  document.querySelectorAll('.qf-field.is-error').forEach(function(node){ node.classList.remove('is-error'); });
  document.querySelectorAll('[data-error-for]').forEach(function(node){
    node.textContent = '';
    node.classList.add('scar-hidden');
  });
}

function clearFieldError(fieldId){
  var field = byName(fieldId);
  var fieldWrap = field ? field.closest('.qf-field') : null;
  var msg = document.querySelector('[data-error-for="' + cssEscape(fieldId) + '"]');
  if(fieldWrap) fieldWrap.classList.remove('is-error');
  if(msg){
    msg.textContent = '';
    msg.classList.add('scar-hidden');
  }
}

function focusFirstError(errors){
  var firstFieldId = Object.keys(errors)[0];
  if(!firstFieldId) return;
  var node = byName(firstFieldId);
  if(!node) return;
  if(typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior:'smooth', block:'center' });
  if(typeof node.focus === 'function') node.focus();
}

function buildSubmitPayload(){
  var payload = clone(state.data);
  payload.quantity_received = hasMeaningfulValue(payload.quantity_received) ? parseNumber(payload.quantity_received) : '';
  payload.quantity_rejected = hasMeaningfulValue(payload.quantity_rejected) ? parseNumber(payload.quantity_rejected) : '';
  payload.root_cause_required = !!payload.root_cause_required;
  payload.entry_id = state.entry && state.entry.entry_id ? String(state.entry.entry_id) : '';
  payload.form_version = (state.schema && state.schema.version) || 'V1';
  payload.runtime_mode = 'standalone_html';
  payload.approval_state = state.entry && state.entry.approval_state ? state.entry.approval_state : 'draft';
  payload.master_context = buildMasterContext();
  payload.signatures = clone(state.signatures);
  return payload;
}

function missingRequiredSubmitSignatures(){
  return ((state.schema && state.schema.signature_blocks) || []).filter(function(block){
    return block && block.required_on_submit && !state.signatures[block.id];
  }).map(function(block){
    return String(block.label || block.label_en || block.id || '').trim();
  });
}

function buildMasterContext(){
  var context = state.allocation && state.allocation.master_context ? clone(state.allocation.master_context) : {};
  context.supplier_id = state.data.supplier_id || context.supplier_id || '';
  context.supplier_name = state.data.supplier_name || context.supplier_name || '';
  context.po_number = state.data.po_number || context.po_number || '';
  context.part_number = state.data.part_number || context.part_number || '';
  context.part_revision = state.data.part_rev || context.part_revision || '';
  context.lot_number = state.data.lot_number || context.lot_number || '';
  return context;
}

function mergeSubmittedEntry(payload, resp){
  var entry = clone(payload);
  entry.entry_id = resp && resp.entry_id ? resp.entry_id : payload.entry_id;
  entry.allocation_id = state.allocationId;
  entry.record_id = currentRecordId();
  entry.submitted_at = new Date().toISOString();
  entry.updated_at = entry.submitted_at;
  entry.submission_revision = state.allocation && state.allocation.online_submission ? Number(state.allocation.online_submission.submission_revision || 1) : 1;
  entry.workflow_state = 'submitted';
  entry.signatures = clone(state.signatures);
  return entry;
}

function linkOrderIfPossible(){
  var context = state.allocation && state.allocation.master_context ? state.allocation.master_context : {};
  var orderType = context.wo_number ? 'wo' : (context.jo_number ? 'jo' : (context.so_number ? 'so' : ''));
  var orderId = context.wo_number || context.jo_number || context.so_number || '';
  if(!orderType || !orderId || !currentRecordId()) return Promise.resolve(false);
  return callApi('order_link_form', { order_type: orderType, order_id: orderId, record_id: currentRecordId() }, 'POST').then(function(resp){
    return !!(resp && resp.ok);
  }).catch(function(){ return false; });
}

function scheduleLocalSave(){
  if(state.saveTimer) window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(function(){ saveLocalDraft('auto'); }, 900);
}

function saveLocalDraft(source){
  var payload = {
    form_code: FORM_CODE,
    allocation_id: state.allocationId,
    fieldValues: clone(state.data),
    signatures: clone(state.signatures),
    entryId: state.entry && state.entry.entry_id ? String(state.entry.entry_id) : '',
    recordId: currentRecordId(),
    saved_at: new Date().toISOString(),
    source: source || 'auto'
  };
  try {
    window.localStorage.setItem(state.localKey, JSON.stringify(payload));
    state.lastLocalSaveAt = payload.saved_at;
    state.localDraft = payload;
  } catch(_err){}
  updateMetaFootnotes();
}

function loadLocalDraft(){
  try {
    var raw = window.localStorage.getItem(state.localKey);
    return raw ? JSON.parse(raw) : null;
  } catch(_err){
    return null;
  }
}

function mountLookupControls(){
  if(typeof window.SearchableInput !== 'function') return;
  Object.keys(LOOKUP_FIELDS).forEach(function(fieldId){
    var cfg = LOOKUP_FIELDS[fieldId];
    var host = byId(cfg.hostId);
    var input = byId(fieldId);
    if(!host || !input) return;
    input.classList.add('scar-hidden');

    var instanceId = 'scar-si-' + fieldId;
    var items = buildLookupItems(cfg.source);
    var existing = window.SearchableInput.get(instanceId);
    if(existing){
      existing.setData(items);
      syncLookupControlValue(fieldId, existing);
      ensureCurrentUserShortcut(cfg, fieldId, host);
      return;
    }

    new window.SearchableInput({
      containerId: cfg.hostId,
      fieldId: instanceId,
      placeholderVi: cfg.placeholder,
      placeholder: cfg.placeholder,
      dataSource: items,
      displayField: 'label',
      valueField: 'value',
      subField: 'sub',
      strictSelect: true,
      onSelect: function(item){
        applyLookupSelection(fieldId, item, cfg);
      }
    });
    syncLookupControlValue(fieldId, window.SearchableInput.get(instanceId));
    ensureCurrentUserShortcut(cfg, fieldId, host);
  });
  state.lookupsMounted = true;
}

function ensureCurrentUserShortcut(cfg, fieldId, host){
  if(!cfg || !cfg.allowCurrentUser || !host) return;
  var existing = host.parentElement && host.parentElement.querySelector('[data-use-current-user="' + fieldId + '"]');
  if(existing) return;
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'qf-btn ghost scar-lookup-self';
  button.setAttribute('data-use-current-user', fieldId);
  button.textContent = 'Dùng người đăng nhập';
  button.addEventListener('click', function(){
    var item = currentCompanyUserItem();
    if(!item){
      notifyParentToast('Không tìm thấy người đăng nhập trong danh sách công ty.', 'warn');
      return;
    }
    applyLookupSelection(fieldId, item, cfg);
  });
  host.insertAdjacentElement('afterend', button);
}

function syncLookupControlsFromState(){
  if(typeof window.SearchableInput !== 'function') return;
  Object.keys(LOOKUP_FIELDS).forEach(function(fieldId){
    syncLookupControlValue(fieldId, window.SearchableInput.get('scar-si-' + fieldId));
  });
}

function syncLookupControlValue(fieldId, instance){
  if(!instance) return;
  var value = state.data[fieldId];
  if(value === undefined || value === null || value === '') return instance.reset();
  instance.setValue(String(value));
}

function buildLookupItems(source){
  if(source === 'company_users') return companyDirectoryItems();
  if(source === 'defect_catalog'){
    var defectRows = Array.isArray(state.master && state.master.defect_catalog) ? state.master.defect_catalog : [];
    if(defectRows.length){
      return defectRows.map(function(row){
        return {
          value: String(row.defect_name || row.defect_code || '').trim(),
          label: String(row.defect_name || row.defect_code || '').trim(),
          sub: [String(row.defect_code || '').trim(), String(row.defect_family || '').trim()].filter(Boolean).join(' Â· '),
          defect_name: String(row.defect_name || row.defect_code || '').trim(),
          defect_code: String(row.defect_code || '').trim(),
          defect_family: String(row.defect_family || '').trim()
        };
      });
    }
    return defaultDefectCatalogItems();
  }
  if(source === 'suppliers'){
    return (Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : []).map(function(supplier){
      return {
        value: String(supplier.supplier_name || '').trim(),
        label: String(supplier.supplier_name || '').trim(),
        sub: [String(supplier.supplier_id || '').trim(), buildSupplierContact(supplier)].filter(Boolean).join(' Â· '),
        supplier_id: String(supplier.supplier_id || '').trim(),
        supplier_name: String(supplier.supplier_name || '').trim(),
        contact_name: String(supplier.contact_name || '').trim(),
        contact_email: String(supplier.contact_email || '').trim(),
        status: String(supplier.status || '').trim()
      };
    });
  }
  if(source === 'parts'){
    return (Array.isArray(state.master && state.master.parts) ? state.master.parts : []).map(function(part){
      var revision = resolvePartRevision(part);
      return {
        value: String(part.part_number || '').trim(),
        label: [String(part.part_number || '').trim(), revision].filter(Boolean).join(' / '),
        sub: [String(part.part_description || '').trim(), String(part.customer_id || '').trim()].filter(Boolean).join(' Â· '),
        part_number: String(part.part_number || '').trim(),
        revision: revision,
        preferred_supplier_id: String(part.preferred_supplier_id || '').trim(),
        part_description: String(part.part_description || '').trim()
      };
    });
  }
  return [];
}

function companyDirectoryItems(){
  var rows = Array.isArray(state.companyDirectory) ? state.companyDirectory.slice() : [];
  var current = currentCompanyUserItem();
  if(current && !rows.some(function(person){
    return String(person.username || '').trim().toLowerCase() === String(current.username || '').trim().toLowerCase();
  })){
    rows.unshift(current);
  }
  return rows.map(function(person){
    var fullName = String(person.name || person.display_name || person.username || '').trim();
    return {
      value: fullName,
      label: fullName,
      sub: [String(person.username || '').trim() ? ('@' + String(person.username || '').trim()) : '', String(person.title || person.role || '').trim(), String(person.dept || '').trim()].filter(Boolean).join(' Â· '),
      username: String(person.username || '').trim(),
      person_name: fullName,
      role: String(person.role || '').trim(),
      dept: String(person.dept || '').trim(),
      title: String(person.title || '').trim()
    };
  });
}

function currentCompanyUserItem(){
  var user = state.currentUser || {};
  var username = String(user.username || '').trim();
  var displayName = String(user.display_name || user.name || user.username || '').trim();
  if(!username && !displayName) return null;
  var existing = (Array.isArray(state.companyDirectory) ? state.companyDirectory : []).find(function(person){
    var personUsername = String(person.username || '').trim().toLowerCase();
    var personName = String(person.name || person.display_name || '').trim().toLowerCase();
    return (username && personUsername === username.toLowerCase()) || (displayName && personName === displayName.toLowerCase());
  });
  if(existing) return existing;
  return {
    username: username,
    name: displayName,
    role: String(user.role || '').trim(),
    dept: String(user.dept || '').trim(),
    title: String(user.title || '').trim()
  };
}

function applyLookupSelection(fieldId, item, cfg){
  if(!item || !cfg) return;
  cfg.onSelect(item);
  populateForm();
  renderAll();
  saveLocalDraft('lookup:' + fieldId);
  clearFieldError(fieldId);
}

function resolvePartRevision(part){
  if(!part || typeof part !== 'object') return '';
  if(part.revision) return String(part.revision || '').trim();
  var revisions = Array.isArray(state.master && state.master.revisions) ? state.master.revisions : [];
  var released = revisions.filter(function(row){
    return String(row.part_number || '').trim().toUpperCase() === String(part.part_number || '').trim().toUpperCase();
  }).sort(function(a, b){
    var aReleased = String(a.status || '').trim().toLowerCase() === 'released' ? 1 : 0;
    var bReleased = String(b.status || '').trim().toLowerCase() === 'released' ? 1 : 0;
    return bReleased - aReleased || String(b.release_date || '').localeCompare(String(a.release_date || ''));
  });
  return released.length ? String(released[0].revision || '').trim() : '';
}

function defaultDefectCatalogItems(){
  return [
    { value:'Dimensional', label:'Dimensional', sub:'Kích thước / dung sai', defect_name:'Dimensional', defect_code:'DEF-DIM' },
    { value:'Surface', label:'Surface', sub:'Bề mặt / xử lý bề mặt', defect_name:'Surface', defect_code:'DEF-SUR' },
    { value:'Packaging', label:'Packaging', sub:'Đóng gói / bảo quản', defect_name:'Packaging', defect_code:'DEF-PKG' },
    { value:'Documentation', label:'Documentation', sub:'Tài liệu / chứng từ', defect_name:'Documentation', defect_code:'DEF-DOC' },
    { value:'Material', label:'Material', sub:'Vật liệu / heat / lot', defect_name:'Material', defect_code:'DEF-MAT' },
    { value:'Traceability', label:'Traceability', sub:'Truy xuất / nhãn / marking', defect_name:'Traceability', defect_code:'DEF-TRC' }
  ];
}

function supplierSuggestions(){
  var suppliers = Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : [];
  var seen = {};
  var out = [];
  function pushSupplier(supplier, note){
    if(!supplier || !supplier.supplier_id || seen[supplier.supplier_id]) return;
    seen[supplier.supplier_id] = true;
    out.push({
      supplier_id: String(supplier.supplier_id || ''),
      supplier_name: String(supplier.supplier_name || ''),
      note: note
    });
  }
  var preferred = preferredSupplierForPart(state.data.part_number);
  if(preferred) pushSupplier(preferred, 'Nhà cung cấp ưu tiên theo mã chi tiết đang chọn.');
  var typedId = String(state.data.supplier_id || '').trim().toUpperCase();
  var typedName = String(state.data.supplier_name || '').trim().toLowerCase();
  suppliers.forEach(function(item){
    var supplierId = String(item.supplier_id || '').trim().toUpperCase();
    var supplierName = String(item.supplier_name || '').trim().toLowerCase();
    if(typedId && supplierId === typedId) pushSupplier(item, 'Khớp trực tiếp với mã nhà cung cấp đang nhập.');
    else if(typedName && supplierName && supplierName.indexOf(typedName) >= 0) pushSupplier(item, 'Khớp với tên nhà cung cấp đang nhập.');
  });
  suppliers.filter(function(item){
    return String(item.status || '').toLowerCase() === 'approved';
  }).slice(0, 2).forEach(function(item){
    pushSupplier(item, 'Nhà cung cấp đã được phê duyệt trong danh mục nền.');
  });
  return out.slice(0, 4);
}

function autoFillSupplierFromPart(data, rerender){
  /* Auto-fill from preferred_supplier_id removed â user must select supplier from dropdown. */
  void data; void rerender;
}

function autoFillSupplierIdentity(data, rerender){
  if(!data) return;
  var suppliers = Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : [];
  var supplier = null;
  var typedId = String(data.supplier_id || '').trim().toUpperCase();
  var typedName = String(data.supplier_name || '').trim().toLowerCase();
  if(typedId){
    supplier = suppliers.find(function(item){
      return String(item.supplier_id || '').trim().toUpperCase() === typedId;
    }) || null;
  }
  if(!supplier && typedName){
    supplier = suppliers.find(function(item){
      return String(item.supplier_name || '').trim().toLowerCase() === typedName;
    }) || null;
  }
  if(!supplier) return;
  data.supplier_id = String(supplier.supplier_id || data.supplier_id || '');
  data.supplier_name = String(supplier.supplier_name || data.supplier_name || '');
  if(!hasMeaningfulValue(data.supplier_contact)) data.supplier_contact = buildSupplierContact(supplier);
  if(rerender){
    populateForm();
    renderAll();
  }
}

function applySupplierById(supplierId, rerender){
  if(!supplierId) return;
  var suppliers = Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : [];
  var supplier = suppliers.find(function(item){
    return String(item.supplier_id || '').trim().toUpperCase() === supplierId.toUpperCase();
  }) || null;
  if(!supplier) return;
  state.data.supplier_id = String(supplier.supplier_id || '');
  state.data.supplier_name = String(supplier.supplier_name || '');
  state.data.supplier_contact = buildSupplierContact(supplier);
  if(rerender){
    populateForm();
    renderAll();
    saveLocalDraft('supplier_hint');
  }
}

function preferredSupplierForPart(partNumber){
  if(!partNumber) return null;
  var parts = Array.isArray(state.master && state.master.parts) ? state.master.parts : [];
  var match = parts.find(function(item){
    return String(item.part_number || '').trim().toUpperCase() === String(partNumber || '').trim().toUpperCase();
  }) || null;
  if(!match || !match.preferred_supplier_id) return null;
  var suppliers = Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : [];
  return suppliers.find(function(item){
    return String(item.supplier_id || '').trim().toUpperCase() === String(match.preferred_supplier_id || '').trim().toUpperCase();
  }) || null;
}

function buildSupplierContact(supplier){
  if(!supplier || typeof supplier !== 'object') return '';
  return [String(supplier.contact_name || '').trim(), String(supplier.contact_email || '').trim()].filter(Boolean).join(' · ');
}

function hydrateSupplierDatalist(){
  var datalist = byId('supplierList');
  if(!datalist) return;
  datalist.innerHTML = '';
  (Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : []).forEach(function(supplier){
    var option = document.createElement('option');
    option.value = String(supplier.supplier_name || '');
    option.label = [String(supplier.supplier_id || ''), buildSupplierContact(supplier)].filter(Boolean).join(' · ');
    datalist.appendChild(option);
  });
}

function progressMeta(){
  var requiredIds = REQUIRED_FIELDS.slice();
  if(state.data.root_cause_required) requiredIds = requiredIds.concat(ROOT_CAUSE_FIELDS);
  if(String(state.data.scar_status || '') === 'closed') requiredIds.push('verification_method', 'verification_result');
  var filled = 0;
  requiredIds.forEach(function(fieldId){
    if(hasMeaningfulValue(state.data[fieldId])) filled += 1;
  });
  return {
    percent: requiredIds.length ? (filled / requiredIds.length) * 100 : 0,
    note: 'Hoàn tất ' + filled + '/' + requiredIds.length + ' trường bắt buộc đang áp dụng cho SCAR này.'
  };
}

function closeoutMeta(){
  if(!hasMeaningfulValue(state.data.containment_action)) return { label:'Chưa sẵn sàng' };
  if(state.data.root_cause_required){
    var missingRoot = ROOT_CAUSE_FIELDS.some(function(fieldId){ return !hasMeaningfulValue(state.data[fieldId]); });
    if(missingRoot) return { label:'Chờ phản hồi NCC' };
  }
  if(!hasMeaningfulValue(state.data.verification_method) || !hasMeaningfulValue(state.data.verification_result)){
    return { label:'Chờ xác nhận hiệu lực' };
  }
  if(String(state.data.scar_status || '') !== 'closed') return { label:'Đủ dữ liệu để xem xét đóng' };
  return { label:'Sẵn sàng đóng hồ sơ' };
}

function dueDateMeta(){
  if(!state.data.supplier_response_due_date){
    return { className:'warning', title:'Chưa thiết lập', shortTitle:'Chưa thiết lập', note:'Thiết lập hạn phản hồi để theo dõi nhà cung cấp và escalations.' };
  }
  var due = new Date(state.data.supplier_response_due_date + 'T23:59:59');
  var now = new Date();
  var diffHours = Math.round((due.getTime() - now.getTime()) / 3600000);
  if(diffHours < 0){
    return { className:'danger', title:'Quá hạn ' + formatNumber(Math.abs(diffHours), 0) + ' giờ', shortTitle:'Quá hạn', note:'Nhà cung cấp đã vượt hạn phản hồi. Cần cập nhật trạng thái và escalations ngay.' };
  }
  if(diffHours <= 24){
    return { className:'warning', title:'Còn ' + formatNumber(diffHours, 0) + ' giờ', shortTitle:'Còn ' + formatNumber(diffHours, 0) + ' giờ', note:'SCAR đang gần hạn. Cần bám sát phản hồi của nhà cung cấp trong ngày.' };
  }
  var diffDays = Math.ceil(diffHours / 24);
  return { className: diffDays <= 3 ? 'warning' : 'info', title:'Còn ' + formatNumber(diffDays, 0) + ' ngày', shortTitle:'Còn ' + formatNumber(diffDays, 0) + ' ngày', note:'Còn thời gian để theo dõi phản hồi, nhưng vẫn nên giữ containment và cập nhật tiến độ đều đặn.' };
}

function rejectMeta(){
  var qtyReceived = parseNumber(state.data.quantity_received);
  var qtyRejected = parseNumber(state.data.quantity_rejected);
  var rate = qtyReceived > 0 ? (qtyRejected / qtyReceived) * 100 : 0;
  return {
    className: rate >= 20 ? 'danger' : (rate >= 5 ? 'warning' : 'success'),
    rateText: formatPercent(rate),
    note: formatNumber(qtyRejected, 0) + ' / ' + formatNumber(qtyReceived, 0) + ' chi tiáº¿t bá»‹ loáº¡i bá».'
  };
}

function statusMetricClass(){
  var status = String(state.data.scar_status || 'open');
  if(status === 'closed') return 'success';
  if(status === 'verification') return 'info';
  if(status === 'awaiting_response') return 'warning';
  return 'danger';
}

function statusNote(statusLabel){
  if(statusLabel === 'Đã đóng') return 'SCAR đã được đóng sau khi xác nhận hiệu lực và hoàn thiện hồ sơ.';
  if(statusLabel === 'Đang xác nhận') return 'Đang kiểm tra hiệu lực của hành động khắc phục trước khi quyết định đóng.';
  if(statusLabel === 'Chờ phản hồi nhà cung cấp') return 'Ưu tiên bám sát deadline và cập nhật ngay khi nhà cung cấp phản hồi.';
  if(statusLabel === 'Đang xem xét') return 'Đang đánh giá chất lượng phản hồi, mức độ hiệu lực và bằng chứng hỗ trợ.';
  return 'SCAR đang mở và chờ hoàn thiện dữ liệu hoặc phản hồi của nhà cung cấp.';
}

function severityMeta(value){
  return SEVERITY_META[String(value || '').trim().toLowerCase()] || { label:'Chưa chọn', note:'Chọn đúng mức độ để điều phối phản hồi và review phù hợp.', className:'info' };
}

function currentRecordId(){
  return String(state.recordId || (state.allocation && state.allocation.record_id) || '').trim();
}

function defaultIssuer(){
  var user = state.currentUser || {};
  return String(user.display_name || user.name || user.username || '').trim();
}

function serverErrorMessage(resp){
  if(!resp || typeof resp !== 'object') return '';
  if(resp.message) return String(resp.message);
  if(resp.error === 'missing_required_context' && resp.field) return 'Thiáº¿u ngá»¯ cáº£nh báº¯t buá»™c: ' + resp.field + '.';
  if(resp.error === 'missing_required_signature') return 'Máy chủ yêu cầu chữ ký bắt buộc trước khi gửi.';
  if(resp.error) return 'Máy chủ trả về lỗi: ' + String(resp.error);
  return '';
}

function askTextDialog(options){
  if(typeof window._ecPromptDialog === 'function'){
    return window._ecPromptDialog({
      title: options && options.title || '',
      message: options && options.message || '',
      placeholder: options && options.placeholder || '',
      type: options && options.type ? options.type : (options && options.password ? 'password' : 'text')
    });
  }
  var fallback = window.prompt((options && options.message) || '', (options && options.value) || '');
  return Promise.resolve(fallback ? String(fallback).trim() : '');
}

function callApi(action, payload, method){
  method = String(method || 'GET').toUpperCase();
  if(method !== 'GET' && !hasParentApi() && !state.csrfToken){
    return fetchStatus().then(function(){ return callApiDirect(action, payload, method); });
  }
  return callApiDirect(action, payload, method);
}

function callApiDirect(action, payload, method){
  method = String(method || 'GET').toUpperCase();
  if(hasParentApi()) return Promise.resolve(window.parent._ecApi(action, payload || {}, method));
  var url = PORTAL_API_URL + '?action=' + encodeURIComponent(action);
  var options = { method: method, credentials: 'include', headers: { 'Accept': 'application/json' } };
  if(method === 'GET'){
    var query = new URLSearchParams();
    Object.keys(payload || {}).forEach(function(key){
      var value = payload[key];
      if(value === undefined || value === null || value === '') return;
      query.set(key, String(value));
    });
    if(query.toString()) url += '&' + query.toString();
  } else {
    options.headers['Content-Type'] = 'application/json';
    if(state.csrfToken) options.headers['X-CSRF-Token'] = state.csrfToken;
    options.body = JSON.stringify(payload || {});
  }
  return window.fetch(url, options).then(function(response){
    var contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if(contentType.indexOf('application/json') < 0){
      return response.text().then(function(){
        throw new Error('API trả về nội dung không phải JSON hợp lệ.');
      });
    }
    return response.json();
  });
}

function hasParentApi(){
  try {
    return !!(window.parent && window.parent !== window && typeof window.parent._ecApi === 'function');
  } catch(_err){
    return false;
  }
}

function notifyParentRefresh(){
  postParentMessage({ type:'ec-form-runtime-refresh', form_code:FORM_CODE, allocation_id:state.allocationId });
}

function notifyParentToast(message, level){
  postParentMessage({ type:'ec-form-runtime-toast', form_code:FORM_CODE, allocation_id:state.allocationId, message:message, level:level || 'info' });
}

function notifyHeight(){
  window.requestAnimationFrame(function(){
    var body = document.body;
    var html = document.documentElement;
    var height = Math.max(body ? body.scrollHeight : 0, html ? html.scrollHeight : 0, 720);
    postParentMessage({ type:'ec-form-runtime-height', form_code:FORM_CODE, allocation_id:state.allocationId, height:height });
  });
}

function postParentMessage(payload){
  if(window.parent && window.parent !== window) window.parent.postMessage(payload, window.location.origin || '*');
}

function runtimeRepairCleanup(value){
  return String(value == null ? '' : value)
    .replace(/\uFFFD/g, '')
    .replace(/[\u0018\u0019]/g, '')
    .replace(/Â·/g, '·')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€œ/g, '“')
    .replace(/â€|â€�/g, '”')
    .replace(/â€˜|â€™/g, '’')
    .replace(/â€¦/g, '…')
    .replace(/Ã /g, 'à')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¢/g, 'â')
    .replace(/Äƒ/g, 'ă')
    .replace(/Ä‘/g, 'đ')
    .replace(/Ä/g, 'Đ')
    .replace(/Æ°/g, 'ư')
    .replace(/Æ¡/g, 'ơ')
    .replace(/áº¡/g, 'ạ')
    .replace(/áº£/g, 'ả')
    .replace(/áº¥/g, 'ấ')
    .replace(/áº§/g, 'ầ')
    .replace(/á»™/g, 'ộ')
    .replace(/á»›/g, 'ớ')
    .replace(/á»/g, 'ờ')
    .replace(/á»§/g, 'ủ')
    .replace(/á»«/g, 'ừ')
    .replace(/á»¯/g, 'ữ')
    .replace(/Ký phát hành trư:c/g, 'Ký phát hành trước')
    .replace(/Dùng người Ēng nhập/g, 'Dùng người đăng nhập')
    .replace(/Nhà cung cấp ã ược/g, 'Nhà cung cấp đã được')
    .replace(/đã ược/g, 'đã được')
    .replace(/Dùng ể/g, 'Dùng để')
    .replace(/thi!t/g, 'thiết')
    .replace(/Hoàn thi!n/g, 'Hoàn thiện')
    .replace(/bu\"c/g, 'buộc');
}

function runtimeRepairScore(value){
  var text = String(value == null ? '' : value);
  if(!text) return 0;
  var bad = (text.match(/Ã|Â|Æ|Ä|â|ð|�|\uFFFD|\u0018|\u0019|Ē|€™|€|™|!t|trư:c|bu\"c/g) || []).length;
  var good = (text.match(/[àáạảãăằắặẳẵâầấậẩẫđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]/g) || []).length;
  var bonus = 0;
  [
    'không','đã','chưa','người','biểu mẫu','nhà cung cấp','phê duyệt','xem xét','dữ liệu',
    'trường','bắt buộc','lưu nháp','ký','gửi','phản hồi','khởi tạo','phiên bản','ngày hiệu lực'
  ].forEach(function(token){
    if(text.toLowerCase().indexOf(token) >= 0) bonus += 3;
  });
  return (good * 2) + bonus - (bad * 6);
}

function runtimeRepairDecodeCandidate(value){
  var source = String(value == null ? '' : value);
  var candidates = [source];
  try{
    candidates.push(decodeURIComponent(escape(source)));
  }catch(_err){}
  try{
    var bytes = new Uint8Array(Array.prototype.map.call(source, function(ch){
      return ch.charCodeAt(0) & 255;
    }));
    candidates.push(new TextDecoder('utf-8').decode(bytes));
  }catch(_err2){}
  return candidates;
}

function repairStringValue(value){
  var fixed = runtimeRepairCleanup(value);
  var best = fixed;
  var bestScore = runtimeRepairScore(best);
  for(var attempt = 0; attempt < 5; attempt += 1){
    var improved = false;
    runtimeRepairDecodeCandidate(best).forEach(function(candidate){
      var cleaned = runtimeRepairCleanup(candidate);
      var score = runtimeRepairScore(cleaned);
      if(score > bestScore){
        best = cleaned;
        bestScore = score;
        improved = true;
      }
    });
    if(!improved) break;
  }
  return best;
}

function repairRuntimeNode(node){
  if(!node) return;
  if(node.nodeType === Node.TEXT_NODE){
    var fixedText = repairStringValue(node.nodeValue);
    if(fixedText !== node.nodeValue) node.nodeValue = fixedText;
    return;
  }
  if(node.nodeType !== Node.ELEMENT_NODE) return;
  Array.prototype.forEach.call(node.childNodes || [], function(child){
    repairRuntimeNode(child);
  });
  ['placeholder','title','aria-label','value'].forEach(function(attr){
    if(node.hasAttribute && node.hasAttribute(attr)){
      var raw = node.getAttribute(attr);
      var fixedAttr = repairStringValue(raw);
      if(fixedAttr !== raw) node.setAttribute(attr, fixedAttr);
    }
  });
}

function repairVisibleMojibake(root){
  if(!root) return;
  repairRuntimeNode(root);
}

function installRuntimeMojibakeObserver(){
  if(runtimeMojibakeObserver || !document.body || typeof MutationObserver !== 'function') return;
  runtimeMojibakeObserver = new MutationObserver(function(records){
    records.forEach(function(record){
      if(record.type === 'childList'){
        Array.prototype.forEach.call(record.addedNodes || [], function(node){
          repairRuntimeNode(node);
        });
      }else if(record.type === 'attributes' && record.target){
        repairRuntimeNode(record.target);
      }
    });
  });
  runtimeMojibakeObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['placeholder','title','aria-label','value']
  });
}

function esc(value){
  var node = document.createElement('div');
  node.appendChild(document.createTextNode(repairStringValue(value)));
  return node.innerHTML;
}

function byId(id){ return document.getElementById(id); }
function byName(name){ return document.querySelector('[name="' + cssEscape(name) + '"]'); }
function setText(id, value){ var node = byId(id); if(node) node.textContent = repairStringValue(value); }
function setValue(id, value){ var node = byId(id); if(node) node.value = repairStringValue(value); }
function setTextInside(containerId, selector, value){ var c = byId(containerId); if(!c) return; var n = c.querySelector(selector); if(n) n.textContent = repairStringValue(value); }
function setMetricClass(id, className){ var n = byId(id); if(!n) return; n.classList.remove('info','warning','danger','success'); n.classList.add(className || 'info'); }
function setProgressValue(id, percent){ var n = byId(id); if(n) n.style.setProperty('--scar-progress', percent.toFixed(1) + '%'); }
function updateRuntimeAlert(className, title, text, pill){
  var alert = byId('runtimeAlert');
  if(alert){
    alert.classList.remove('info','warning','danger','success');
    alert.classList.add(className || 'info');
  }
  setText('runtimeAlertTitle', title);
  setText('runtimeAlertText', text);
  setText('runtimeAlertPill', pill);
}
function parseTimestamp(value){ var parsed = value ? Date.parse(value) : 0; return isFinite(parsed) ? parsed : 0; }
function parseNumber(value){ var parsed = Number(value); return isFinite(parsed) ? parsed : 0; }
function hasMeaningfulValue(value){ return !(value === undefined || value === null || value === ''); }
function mergeFieldMap(target, source){ if(!source || typeof source !== 'object') return; FIELD_IDS.forEach(function(fieldId){ if(Object.prototype.hasOwnProperty.call(source, fieldId) && source[fieldId] !== undefined && source[fieldId] !== null) target[fieldId] = source[fieldId]; }); }
function clone(value){ return JSON.parse(JSON.stringify(value || {})); }
function isoToday(){ return new Date().toISOString().slice(0, 10); }
function addDays(dateValue, days){ var date = new Date((dateValue || isoToday()) + 'T00:00:00'); date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); }
function compactPartLabel(){ var part = String(state.data.part_number || '').trim(); var rev = String(state.data.part_rev || '').trim(); return [part, rev].filter(Boolean).join('/'); }
function formatNumber(value, digits){ return new Intl.NumberFormat(state.lang, { minimumFractionDigits:0, maximumFractionDigits:digits == null ? 1 : digits }).format(Number(value || 0)); }
function formatPercent(value){ return formatNumber(value || 0, 1) + '%'; }
function formatDateTime(value){
  if(!value) return 'Chưa có';
  try {
    return new Intl.DateTimeFormat(state.lang, { dateStyle:'short', timeStyle:'short' }).format(new Date(value));
  } catch(_err){
    return String(value);
  }
}
function localDraftKey(){ return 'hesem:form-runtime:' + FORM_CODE + ':' + (state.allocationId || 'unallocated'); }
function cssEscape(value){ if(window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value); return String(value).replace(/[^A-Za-z0-9_-]/g, '\\$&'); }

})();

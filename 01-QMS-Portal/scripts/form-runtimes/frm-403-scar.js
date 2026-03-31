(function(){
'use strict';

var FORM_CODE = String((new URLSearchParams(window.location.search || '')).get('form_code') || 'FRM-403-SCAR').trim() || 'FRM-403-SCAR';
var PORTAL_API_URL = '/01-QMS-Portal/api.php';
var FIELD_IDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','part_rev','lot_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','root_cause_required','supplier_response_due_date','supplier_root_cause','supplier_corrective_action','supplier_preventive_action','verification_method','verification_result','scar_status','issued_by','approved_by','supplier_contact'];
var REQUIRED_FIELDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','supplier_response_due_date','scar_status','issued_by'];
var ROOT_CAUSE_FIELDS = ['supplier_root_cause','supplier_corrective_action','supplier_preventive_action'];
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
  isDirty: false
};
var els = {};

document.addEventListener('DOMContentLoaded', init);

function init(){
  cacheElements();
  state.localKey = localDraftKey();
  bindEvents();
  bindRuntimeGuards();
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
    return Promise.all([loadSchema(), loadAllocation(), loadServerDraft(), loadMasterData()]);
  }).then(function(){
    state.localDraft = loadLocalDraft();
    return loadEntry();
  }).then(function(){
    state.signatures = buildMergedSignatures();
    state.data = buildMergedData();
    state.resetSnapshot = clone(state.data);
    state.resetSignaturesSnapshot = clone(state.signatures);
    populateForm();
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
  if(!els.supplierHints) return;
  els.supplierHints.innerHTML = '';
  supplierSuggestions().forEach(function(item){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'scar-supplier-card';
    button.setAttribute('data-supplier-id', item.supplier_id || '');
    var title = document.createElement('strong');
    title.textContent = [item.supplier_id || '', item.supplier_name || ''].filter(Boolean).join(' · ');
    var detail = document.createElement('span');
    detail.textContent = item.note;
    button.appendChild(title);
    button.appendChild(detail);
    els.supplierHints.appendChild(button);
  });
}

function renderWorkflowPanel(){
  if(!els.workflowPanel) return;
  var workflowState = currentWorkflowState();
  var summary = currentApprovalSummary();
  var reviewSla = currentReviewSla();
  var submissionRevision = currentSubmissionRevision();
  var resubmissions = Math.max(0, submissionRevision - 1);
  var signatureBlocks = Array.isArray(state.schema && state.schema.signature_blocks) ? state.schema.signature_blocks : [];
  var html = '' +
    '<div class="scar-workflow-summary">' +
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

function canSignBlock(block){
  if(!state.loggedIn || !state.editMode || !block) return false;
  if(block.id === 'originator') return currentWorkflowState() !== 'approved' && currentWorkflowState() !== 'closed' && userHasSchemaRole('fill');
  if(block.id === 'qa_reviewer') return currentWorkflowState() === 'in_review' && (userHasSchemaRole('review') || userHasSchemaRole('approve'));
  if(block.id === 'approver') return currentWorkflowState() === 'in_review' && userHasSchemaRole('approve');
  return false;
}

function canClearSignature(block, signed){
  if(!signed || !block || !state.editMode) return false;
  if(block.id !== 'originator') return false;
  return ['draft', 'allocated', 'submitted', 'received', 'rejected'].indexOf(currentWorkflowState()) >= 0;
}

function canSubmitForReview(workflowState){
  return !!state.loggedIn && !!state.allocationId && ['submitted', 'received'].indexOf(workflowState) >= 0 && (userHasSchemaRole('fill') || userHasSchemaRole('review') || userHasSchemaRole('approve'));
}

function canApprove(workflowState){
  return !!state.loggedIn && !!state.allocationId && workflowState === 'in_review' && userHasSchemaRole('approve');
}

function canReject(workflowState){
  return !!state.loggedIn && !!state.allocationId && workflowState === 'in_review' && (userHasSchemaRole('review') || userHasSchemaRole('approve'));
}

function canReopen(workflowState){
  return !!state.loggedIn && !!state.allocationId && ['approved', 'rejected', 'closed'].indexOf(workflowState) >= 0 && userHasSchemaRole('approve');
}

function captureSignature(blockId){
  var block = ((state.schema && state.schema.signature_blocks) || []).find(function(item){ return item && item.id === blockId; }) || null;
  if(!block){
    notifyParentToast('Không tìm thấy cấu hình chữ ký cho bước này.', 'warn');
    return Promise.resolve(null);
  }
  if(typeof window.ESignature !== 'function'){
    notifyParentToast('Module chữ ký điện tử chưa sẵn sàng.', 'error');
    return Promise.resolve(null);
  }
  var me = state.currentUser || {};
  return new Promise(function(resolve){
    new window.ESignature({
      lang: 'vi',
      requireReason: true,
      requirePin: false
    }).show({
      signerId: String(me.username || '').trim(),
      signerName: String(me.display_name || me.name || me.username || '').trim(),
      signerRole: String(me.title || me.role || '').trim(),
      reason: 'Xác nhận bước ' + (block.label || block.label_en || block.id),
      signatureMeaning: String(block.meaning || 'Approved'),
      appliedTo: currentRecordId() + ':' + blockId,
      onSign: function(sigData){
        state.signatures[blockId] = normalizeSignature(sigData, block.meaning || '');
        saveLocalDraft('signature_capture');
        renderAll();
        resolve(state.signatures[blockId]);
      },
      onCancel: function(){ resolve(null); }
    });
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
    if(state.lastServerSaveAt) els.saveMeta.textContent = 'Đã đồng bộ máy chủ lúc ' + formatDateTime(state.lastServerSaveAt) + '.';
    else if(state.lastLocalSaveAt) els.saveMeta.textContent = 'Đã lưu cục bộ lúc ' + formatDateTime(state.lastLocalSaveAt) + '.';
    else els.saveMeta.textContent = 'Chưa có lượt lưu nào trong phiên này.';
  }
  if(els.entryMeta){
    var revision = state.entry && state.entry.submission_revision ? ' · Revision nộp: R' + state.entry.submission_revision : '';
    els.entryMeta.textContent = 'Nguồn dữ liệu khởi tạo: ' + state.loadedSource + revision + '.';
  }
}

function updateActionState(){
  if(els.btnSaveDraft){
    els.btnSaveDraft.disabled = !!state.busySave || !!state.busySubmit;
    els.btnSaveDraft.textContent = state.busySave ? 'Đang lưu...' : (state.loggedIn && state.allocationId ? 'Lưu nháp' : 'Lưu cục bộ');
  }
  if(els.btnReset) els.btnReset.disabled = !!state.busySave || !!state.busySubmit;
  if(els.btnSubmit){
    els.btnSubmit.disabled = !!state.busySubmit || !state.loggedIn || !state.allocationId;
    els.btnSubmit.textContent = state.busySubmit ? 'Đang gửi SCAR...' : 'Gửi SCAR';
  }
  var isView = !state.editMode;
  // in view mode: disable submit (already disabled if not logged in)
  if(els.btnSubmit && isView) els.btnSubmit.disabled = true;
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
    root_cause_required: function(v){ return v ? '✓ Yêu cầu phân tích nguyên nhân gốc (RCA)' : '✗ Chế độ containment rút gọn'; },
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
    rcDv.textContent = rcVal ? '✓ Yêu cầu phân tích nguyên nhân gốc (RCA)' : '✗ Chế độ containment rút gọn';
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

function supplierSuggestions(){
  var suppliers = Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : [];
  var seen = {};
  var out = [];
  function pushSupplier(supplier, note){
    if(!supplier || !supplier.supplier_id || seen[supplier.supplier_id]) return;
    seen[supplier.supplier_id] = true;
    out.push({
      supplier_id: String(supplier.supplier_id || ''),
      supplier_name: String(supplier.supplier_name_vi || supplier.supplier_name || ''),
      note: note
    });
  }
  var preferred = preferredSupplierForPart(state.data.part_number);
  if(preferred) pushSupplier(preferred, 'Nhà cung cấp ưu tiên theo mã chi tiết đang chọn.');
  var typedId = String(state.data.supplier_id || '').trim().toUpperCase();
  var typedName = String(state.data.supplier_name || '').trim().toLowerCase();
  suppliers.forEach(function(item){
    var supplierId = String(item.supplier_id || '').trim().toUpperCase();
    var supplierName = String(item.supplier_name_vi || item.supplier_name || '').trim().toLowerCase();
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
  if(!data || hasMeaningfulValue(data.supplier_id) || hasMeaningfulValue(data.supplier_name)) return;
  var supplier = preferredSupplierForPart(data.part_number);
  if(!supplier) return;
  data.supplier_id = String(supplier.supplier_id || '');
  data.supplier_name = String(supplier.supplier_name_vi || supplier.supplier_name || '');
  data.supplier_contact = buildSupplierContact(supplier);
  if(rerender){
    populateForm();
    renderAll();
  }
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
      return String(item.supplier_name_vi || item.supplier_name || '').trim().toLowerCase() === typedName;
    }) || null;
  }
  if(!supplier) return;
  data.supplier_id = String(supplier.supplier_id || data.supplier_id || '');
  data.supplier_name = String(supplier.supplier_name_vi || supplier.supplier_name || data.supplier_name || '');
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
  state.data.supplier_name = String(supplier.supplier_name_vi || supplier.supplier_name || '');
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
    option.value = String(supplier.supplier_name_vi || supplier.supplier_name || '');
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
    note: formatNumber(qtyRejected, 0) + ' / ' + formatNumber(qtyReceived, 0) + ' chi tiết bị loại bỏ.'
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
  if(resp.error === 'missing_required_context' && resp.field) return 'Thiếu ngữ cảnh bắt buộc: ' + resp.field + '.';
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

function esc(value){
  var node = document.createElement('div');
  node.appendChild(document.createTextNode(String(value == null ? '' : value)));
  return node.innerHTML;
}

function byId(id){ return document.getElementById(id); }
function byName(name){ return document.querySelector('[name="' + cssEscape(name) + '"]'); }
function setText(id, value){ var node = byId(id); if(node) node.textContent = value; }
function setValue(id, value){ var node = byId(id); if(node) node.value = value; }
function setTextInside(containerId, selector, value){ var c = byId(containerId); if(!c) return; var n = c.querySelector(selector); if(n) n.textContent = value; }
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

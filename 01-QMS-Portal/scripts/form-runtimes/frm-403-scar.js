(function(){
'use strict';

var FORM_CODE = String((new URLSearchParams(window.location.search || '')).get('form_code') || 'FRM-403-SCAR').trim() || 'FRM-403-SCAR';
var PORTAL_API_URL = '/01-QMS-Portal/api.php';
var FIELD_IDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','part_rev','lot_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','root_cause_required','supplier_response_due_date','supplier_root_cause','supplier_corrective_action','supplier_preventive_action','verification_method','verification_result','scar_status','issued_by','approved_by','supplier_contact'];
var REQUIRED_FIELDS = ['scar_date','supplier_name','supplier_id','po_number','part_number','quantity_received','quantity_rejected','defect_type','defect_description','severity','containment_action','supplier_response_due_date','scar_status','issued_by'];
var ROOT_CAUSE_FIELDS = ['supplier_root_cause','supplier_corrective_action','supplier_preventive_action'];
var LOOKUP_FIELDS = {
  supplier_name: {
    hostId: 'supplier_name_lookup',
    source: 'suppliers',
    placeholder: 'TÃ¬m vÃ  chá»n nhÃ  cung cáº¥p tá»« dá»¯ liá»‡u ná»n',
    helper: 'Chá»n nhÃ  cung cáº¥p Ä‘á»ƒ tá»± Ä‘á»™ng Ä‘iá»n mÃ£ vÃ  liÃªn há»‡.',
    onSelect: function(item){
      state.data.supplier_name = String(item.supplier_name || item.label || '').trim();
      state.data.supplier_id = String(item.supplier_id || item.value || '').trim();
      state.data.supplier_contact = buildSupplierContact(item);
    }
  },
  part_number: {
    hostId: 'part_number_lookup',
    source: 'parts',
    placeholder: 'TÃ¬m vÃ  chá»n part / revision tá»« dá»¯ liá»‡u ná»n',
    helper: 'Chá»n part Ä‘á»ƒ tá»± Ä‘á»™ng gáº¯n revision hiá»‡n hÃ nh.',
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
    placeholder: 'TÃ¬m vÃ  chá»n ngÆ°á»i phÃ¡t hÃ nh',
    helper: 'Chá»n tá»« danh sÃ¡ch cÃ´ng ty hoáº·c dÃ¹ng ngÆ°á»i Ä‘Äƒng nháº­p.',
    allowCurrentUser: true,
    onSelect: function(item){
      state.data.issued_by = String(item.person_name || item.label || item.value || '').trim();
    }
  },
  approved_by: {
    hostId: 'approved_by_lookup',
    source: 'company_users',
    placeholder: 'TÃ¬m vÃ  chá»n ngÆ°á»i phÃª duyá»‡t',
    helper: 'Chá»n tá»« danh sÃ¡ch cÃ´ng ty hoáº·c dÃ¹ng ngÆ°á»i Ä‘Äƒng nháº­p.',
    allowCurrentUser: true,
    onSelect: function(item){
      state.data.approved_by = String(item.person_name || item.label || item.value || '').trim();
    }
  },
  defect_type: {
    hostId: 'defect_type_lookup',
    source: 'defect_catalog',
    placeholder: 'TÃ¬m vÃ  chá»n loáº¡i lá»—i tá»« danh má»¥c kiá»ƒm soÃ¡t',
    helper: 'Loáº¡i lá»—i dÃ¹ng chung giá»¯a EQMS, ERP vÃ  MES.',
    onSelect: function(item){
      state.data.defect_type = String(item.defect_name || item.label || item.value || '').trim();
    }
  }
};
var STATUS_LABELS = { open:'Má»Ÿ', awaiting_response:'Chá» pháº£n há»“i nhÃ  cung cáº¥p', under_review:'Äang xem xÃ©t', verification:'Äang xÃ¡c nháº­n', closed:'ÄÃ£ Ä‘Ã³ng' };
var SEVERITY_META = {
  minor:{ label:'Nháº¹', note:'Theo dÃµi theo nhá»‹p xá»­ lÃ½ thÃ´ng thÆ°á»ng, khÃ´ng cáº§n escalations tá»©c thá»i.', className:'success' },
  major:{ label:'Náº·ng', note:'Cáº§n containment rÃµ rÃ ng vÃ  pháº£n há»“i nguyÃªn nhÃ¢n gá»‘c trong háº¡n ngáº¯n.', className:'warning' },
  critical:{ label:'NghiÃªm trá»ng', note:'Cáº§n Ä‘iá»u phá»‘i kháº©n, nháº¥n máº¡nh nguy cÆ¡ tÃ¡i diá»…n vÃ  xÃ¡c minh hiá»‡u lá»±c cháº·t cháº½.', className:'danger' }
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
  loadedSource: 'Máº·c Ä‘á»‹nh tá»« há»“ sÆ¡',
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

document.addEventListener('DOMContentLoaded', init);

function init(){
  cacheElements();
  state.localKey = localDraftKey();
  bindEvents();
  bindRuntimeGuards();
  repairVisibleMojibake(document.body);
  updateActionState();
  updateRuntimeAlert('info', 'Äang khá»Ÿi táº¡o biá»ƒu máº«u', 'Há»‡ thá»‘ng Ä‘ang táº£i thÃ´ng tin há»“ sÆ¡, nhÃ¡p gáº§n nháº¥t vÃ  dá»¯ liá»‡u ná»n nhÃ  cung cáº¥p.', 'Khá»Ÿi táº¡o');
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
      updateRuntimeAlert('warning', 'PhiÃªn Ä‘Äƒng nháº­p chÆ°a sáºµn sÃ ng', 'Biá»ƒu máº«u váº«n cho phÃ©p nháº­p vÃ  tÃ­nh toÃ¡n cá»¥c bá»™, nhÆ°ng muá»‘n lÆ°u nhÃ¡p mÃ¡y chá»§ hoáº·c gá»­i há»“ sÆ¡ thÃ¬ cáº§n Ä‘Äƒng nháº­p QMS há»£p lá»‡.', 'KhÃ¡ch');
    } else if(!state.allocationId){
      updateRuntimeAlert('warning', 'Biá»ƒu máº«u Ä‘ang má»Ÿ Ä‘á»™c láº­p', 'ChÆ°a cÃ³ allocation_id nÃªn anh chá»‰ cÃ³ thá»ƒ nháº­p thá»­ vÃ  lÆ°u cá»¥c bá»™. Muá»‘n gá»­i SCAR tháº­t, hÃ£y má»Ÿ tá»« workspace Ä‘Ã£ cáº¥p mÃ£ há»“ sÆ¡.', 'ChÆ°a cáº¥p mÃ£');
    } else {
      updateRuntimeAlert('success', 'Biá»ƒu máº«u Ä‘Ã£ sáºµn sÃ ng', 'Dá»¯ liá»‡u há»“ sÆ¡, nhÃ¡p vÃ  ngá»¯ cáº£nh truy xuáº¥t Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»“ng bá»™. Anh cÃ³ thá»ƒ tiáº¿p tá»¥c hoÃ n thiá»‡n SCAR ngay trÃªn file HTML Ä‘á»™c láº­p nÃ y.', 'Sáºµn sÃ ng');
    }
    notifyHeight();
  }).catch(function(error){
    console.error(error);
    updateRuntimeAlert('danger', 'KhÃ´ng thá»ƒ khá»Ÿi táº¡o biá»ƒu máº«u', error && error.message ? error.message : 'Há»‡ thá»‘ng khÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u cáº§n thiáº¿t cho SCAR.', 'Lá»—i');
    updateActionState();
    notifyParentToast('KhÃ´ng thá»ƒ khá»Ÿi táº¡o biá»ƒu máº«u SCAR.', 'error');
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
    { label:'Báº£n ná»™p gáº§n nháº¥t', timestamp:parseTimestamp(state.entry && (state.entry.updated_at || state.entry.submitted_at || state.entry.created_at)), values:extractEntryValues(state.entry), order:1 },
    { label:'NhÃ¡p mÃ¡y chá»§', timestamp:parseTimestamp(state.serverDraft && state.serverDraft.saved_at), values:extractDraftValues(state.serverDraft), order:2 },
    { label:'NhÃ¡p cá»¥c bá»™', timestamp:parseTimestamp(state.localDraft && state.localDraft.saved_at), values:extractDraftValues(state.localDraft), order:3 }
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
    summary: dirty ? 'Biá»ƒu máº«u Ä‘ang cÃ³ thay Ä‘á»•i chÆ°a Ä‘Æ°á»£c chá»‘t thÃ nh báº£n nhÃ¡p an toÃ n.' : ''
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
    var msg = 'Biá»ƒu máº«u Ä‘ang cÃ³ dá»¯ liá»‡u dang dá»Ÿ. HÃ£y lÆ°u nhÃ¡p trÆ°á»›c khi má»Ÿ liÃªn káº¿t khÃ¡c hoáº·c lÃ m má»›i há»‡ thá»‘ng.';
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
    var leave = window.confirm('Biá»ƒu máº«u Ä‘ang cÃ³ dá»¯ liá»‡u dang dá»Ÿ. HÃ£y lÆ°u nhÃ¡p trÆ°á»›c khi má»Ÿ liÃªn káº¿t khÃ¡c. Nháº¥n OK Ä‘á»ƒ rá»i Ä‘i khÃ´ng lÆ°u, hoáº·c Cancel Ä‘á»ƒ á»Ÿ láº¡i biá»ƒu máº«u.');
    if(!leave){
      event.preventDefault();
      event.stopPropagation();
      notifyParentToast('HÃ£y lÆ°u nhÃ¡p trÆ°á»›c khi rá»i biá»ƒu máº«u náº¿u muá»‘n giá»¯ dá»¯ liá»‡u Ä‘ang lÃ m dá»Ÿ.', 'warn');
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
  var poPart = [state.data.po_number || '', compactPartLabel()].filter(Boolean).join(' Â· ') || 'ChÆ°a cÃ³ ngá»¯ cáº£nh';
  setText('heroSupplier', state.data.supplier_name || 'ChÆ°a xÃ¡c Ä‘á»‹nh nhÃ  cung cáº¥p');
  setText('heroRecordId', currentRecordId() || 'ChÆ°a cáº¥p mÃ£');
  setText('heroPoPart', poPart);
  setText('heroLot', state.data.lot_number || 'ChÆ°a xÃ¡c Ä‘á»‹nh');
  setText('heroIssuedBy', state.data.issued_by || 'ChÆ°a ghi nháº­n');
}

function renderMetrics(){
  var severity = severityMeta(state.data.severity);
  setMetricClass('metricSeverity', severity.className || 'info');
  setText('metricSeverityValue', severity.label || 'ChÆ°a chá»n');
  setText('metricSeverityNote', severity.note || 'Chá»n Ä‘Ãºng má»©c Ä‘á»™ Ä‘á»ƒ Ä‘iá»u phá»‘i pháº£n há»“i vÃ  review phÃ¹ há»£p.');

  var dueMeta = dueDateMeta();
  setMetricClass('metricDue', dueMeta.className);
  setText('metricDueValue', dueMeta.title);
  setText('metricDueNote', dueMeta.note);

  var rejectInfo = rejectMeta();
  setMetricClass('metricRejectRate', rejectInfo.className);
  setText('metricRejectRateValue', rejectInfo.rateText);
  setText('metricRejectRateNote', rejectInfo.note);

  var statusLabel = STATUS_LABELS[state.data.scar_status] || 'Má»Ÿ';
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
  var title = state.data.root_cause_required ? 'YÃªu cáº§u pháº£n há»“i Ä‘áº§y Ä‘á»§' : 'Cháº¿ Ä‘á»™ containment rÃºt gá»n';
  var note = state.data.root_cause_required
    ? 'NhÃ  cung cáº¥p pháº£i ná»™p nguyÃªn nhÃ¢n gá»‘c, hÃ nh Ä‘á»™ng kháº¯c phá»¥c vÃ  hÃ nh Ä‘á»™ng phÃ²ng ngá»«a trÆ°á»›c khi xem xÃ©t Ä‘Ã³ng há»“ sÆ¡.'
    : 'QA Ä‘Ã£ táº¯t yÃªu cáº§u nguyÃªn nhÃ¢n gá»‘c. Pháº£n há»“i nhÃ  cung cáº¥p váº«n cÃ³ thá»ƒ nháº­p, nhÆ°ng há»‡ thá»‘ng khÃ´ng Ã©p Ä‘á»§ bá»™ RCA/CAPA/PAPA khi gá»­i.';
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
  setText('sideRecordId', currentRecordId() || 'ChÆ°a cáº¥p mÃ£');
  setText('sideStatus', STATUS_LABELS[state.data.scar_status] || 'Má»Ÿ');
  setText('sideSeverity', severityMeta(state.data.severity).label || 'ChÆ°a chá»n');
  setText('sideDue', dueDateMeta().shortTitle);
  setText('sideRejectRate', rejectMeta().rateText);
  setText('sideSupplierName', state.data.supplier_name || 'ChÆ°a xÃ¡c Ä‘á»‹nh');
  setText('sideSupplierContact', state.data.supplier_contact || 'ChÆ°a cÃ³ liÃªn há»‡ pháº£n há»“i.');
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
    title.textContent = [item.supplier_id || '', item.supplier_name || ''].filter(Boolean).join(' Â· ');
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
  if(stateKey === 'submitted') return 'Biá»ƒu máº«u Ä‘Ã£ gá»­i dá»¯ liá»‡u online vÃ  Ä‘ang chá» chuyá»ƒn sang bÆ°á»›c xem xÃ©t.';
  if(stateKey === 'in_review') return 'Há»“ sÆ¡ Ä‘ang á»Ÿ hÃ ng chá» review/phÃª duyá»‡t vÃ  cÃ³ thá»ƒ thao tÃ¡c ngay táº¡i section nÃ y.';
  if(stateKey === 'approved') return 'Há»“ sÆ¡ Ä‘Ã£ Ä‘Æ°á»£c phÃª duyá»‡t. CÃ³ thá»ƒ má»Ÿ láº¡i náº¿u cáº§n controlled edit.';
  if(stateKey === 'rejected') return 'Há»“ sÆ¡ Ä‘Ã£ bá»‹ tá»« chá»‘i vÃ  cáº§n chá»‰nh sá»­a/ná»™p láº¡i cÃ³ kiá»ƒm soÃ¡t.';
  if(stateKey === 'closed') return 'Há»“ sÆ¡ Ä‘Ã£ Ä‘Ã³ng vÃ²ng Ä‘á»i hiá»‡n hÃ nh.';
  return 'HoÃ n thiá»‡n biá»ƒu máº«u, kÃ½ phÃ¡t hÃ nh vÃ  gá»­i xem xÃ©t trÃªn cÃ¹ng bá» máº·t HTML.';
}

function approvalHeadline(summary){
  var complete = !!summary.is_complete;
  var collected = Number(summary.collected_approvals || 0);
  var required = Number(summary.minimum_approvals || 1);
  if(complete) return 'ÄÃ£ Ä‘á»§ phÃª duyá»‡t';
  return collected + '/' + required + ' phÃª duyá»‡t';
}

function approvalSubline(summary){
  if(summary.status_label_vi) return String(summary.status_label_vi);
  if(summary.status_label) return String(summary.status_label);
  return 'Theo dÃµi sá»‘ chá»¯ kÃ½/phÃª duyá»‡t Ä‘Ã£ thu tháº­p trÃªn allocation hiá»‡n hÃ nh.';
}

function reviewSlaHeadline(reviewSla){
  if(!reviewSla || typeof reviewSla !== 'object') return 'ChÆ°a kÃ­ch hoáº¡t';
  if(reviewSla.overdue) return 'QuÃ¡ háº¡n review';
  if(reviewSla.deadline_at) return reviewSla.status_label_vi || reviewSla.status_label || 'Äang theo SLA';
  return 'ChÆ°a khá»Ÿi táº¡o';
}

function reviewSlaSubline(reviewSla){
  if(!reviewSla || typeof reviewSla !== 'object') return 'SLA sáº½ báº¯t Ä‘áº§u khi há»“ sÆ¡ Ä‘Æ°á»£c gá»­i vÃ o bÆ°á»›c xem xÃ©t.';
  if(reviewSla.deadline_at) return 'Háº¡n: ' + formatDateTime(reviewSla.deadline_at);
  return 'SLA review sáº½ Ä‘Æ°á»£c váº­t liá»‡u hÃ³a sau khi gá»­i xem xÃ©t.';
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
    var src = '/01-QMS-Portal/scripts/portal/11-e-signature.js?v=scar403-runtime-20260401-8';
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
        title: 'XÃ¡c thá»±c phÃª duyá»‡t',
        message: 'Nháº­p máº­t kháº©u hiá»‡n táº¡i Ä‘á»ƒ hoÃ n táº¥t phÃª duyá»‡t há»“ sÆ¡ SCAR nÃ y.',
        placeholder: 'Máº­t kháº©u tÃ i khoáº£n QMS',
        password: true
      }).then(function(password){
        if(!password) return null;
        return callApi('evidence_review', {
          allocation_id: state.allocationId,
          action: 'approve',
          password: password,
          signature_data: signature,
          signature_meaning: 'approved',
          reason: 'PhÃª duyá»‡t há»“ sÆ¡ SCAR trÃªn HTML runtime'
        }, 'POST');
      });
    }).then(function(resp){
      if(!resp) return;
      if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'MÃ¡y chá»§ chÆ°a xÃ¡c nháº­n phÃª duyá»‡t.');
      state.allocation = resp.allocation || state.allocation;
      state.approvalSummary = resp.approval_summary || state.approvalSummary;
      state.reviewSla = resp.review_sla || state.reviewSla;
      if(state.allocation && state.allocation.approval_signature) state.signatures.approver = normalizeSignature(state.allocation.approval_signature, 'Approved');
      updateRuntimeAlert('success', 'ÄÃ£ phÃª duyá»‡t há»“ sÆ¡', 'SCAR Ä‘Ã£ Ä‘Æ°á»£c phÃª duyá»‡t trong workflow vÃ  lÆ°u dáº¥u váº¿t Ä‘iá»‡n tá»­ Ä‘áº§y Ä‘á»§.', 'Approved');
      notifyParentToast('ÄÃ£ phÃª duyá»‡t SCAR.', 'success');
      notifyParentRefresh();
      return refreshRuntimeState();
    }).catch(function(error){
      updateRuntimeAlert('danger', 'KhÃ´ng thá»ƒ phÃª duyá»‡t', (error && error.message) || 'MÃ¡y chá»§ chÆ°a cháº¥p nháº­n phÃª duyá»‡t.', 'Lá»—i');
      notifyParentToast('KhÃ´ng thá»ƒ phÃª duyá»‡t SCAR.', 'error');
    });
    return;
  }
  askTextDialog({
    title: 'LÃ½ do tá»« chá»‘i',
    message: 'Nháº­p lÃ½ do tá»« chá»‘i Ä‘á»ƒ tráº£ há»“ sÆ¡ vá» bÆ°á»›c chá»‰nh sá»­a cÃ³ kiá»ƒm soÃ¡t.',
    placeholder: 'LÃ½ do tá»« chá»‘i'
  }).then(function(reason){
    if(!reason) return null;
    return callApi('evidence_review', {
      allocation_id: state.allocationId,
      action: 'reject',
      reason: reason
    }, 'POST');
  }).then(function(resp){
    if(!resp) return;
    if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'MÃ¡y chá»§ chÆ°a cháº¥p nháº­n tá»« chá»‘i.');
    state.allocation = resp.allocation || state.allocation;
    state.approvalSummary = resp.approval_summary || state.approvalSummary;
    state.reviewSla = resp.review_sla || state.reviewSla;
    updateRuntimeAlert('warning', 'ÄÃ£ tá»« chá»‘i há»“ sÆ¡', 'SCAR Ä‘Ã£ bá»‹ tráº£ vá» Ä‘á»ƒ chá»‰nh sá»­a vÃ  ná»™p láº¡i cÃ³ kiá»ƒm soÃ¡t.', 'Rejected');
    notifyParentToast('ÄÃ£ tá»« chá»‘i SCAR.', 'warn');
    notifyParentRefresh();
    return refreshRuntimeState();
  }).catch(function(error){
    updateRuntimeAlert('danger', 'KhÃ´ng thá»ƒ tá»« chá»‘i', (error && error.message) || 'MÃ¡y chá»§ chÆ°a cháº¥p nháº­n thao tÃ¡c tá»« chá»‘i.', 'Lá»—i');
    notifyParentToast('KhÃ´ng thá»ƒ tá»« chá»‘i SCAR.', 'error');
  });
}

function doReopen(){
  if(!state.allocationId) return;
  askTextDialog({
    title: 'LÃ½ do má»Ÿ láº¡i',
    message: 'Nháº­p lÃ½ do má»Ÿ láº¡i há»“ sÆ¡ Ä‘á»ƒ há»‡ thá»‘ng táº¡o controlled edit Ä‘Ãºng chuáº©n.',
    placeholder: 'LÃ½ do má»Ÿ láº¡i'
  }).then(function(reason){
    if(!reason) return null;
    return callApi('evidence_reopen', { allocation_id: state.allocationId, reason: reason }, 'POST');
  }).then(function(resp){
    if(!resp) return;
    if(!resp.ok) throw new Error(serverErrorMessage(resp) || 'MÃ¡y chá»§ chÆ°a cháº¥p nháº­n má»Ÿ láº¡i há»“ sÆ¡.');
    state.allocation = resp.allocation || state.allocation;
    state.approvalSummary = resp.approval_summary || null;
    state.reviewSla = resp.review_sla || null;
    updateRuntimeAlert('warning', 'ÄÃ£ má»Ÿ láº¡i há»“ sÆ¡', 'SCAR Ä‘Ã£ quay vá» controlled edit. Anh cÃ³ thá»ƒ chá»‰nh sá»­a vÃ  ná»™p láº¡i trÃªn cÃ¹ng HTML nÃ y.', 'Reopen');
    notifyParentToast('ÄÃ£ má»Ÿ láº¡i SCAR Ä‘á»ƒ controlled edit.', 'warn');
    notifyParentRefresh();
    return refreshRuntimeState();
  }).catch(function(error){
    updateRuntimeAlert('danger', 'KhÃ´ng thá»ƒ má»Ÿ láº¡i há»“ sÆ¡', (error && error.message) || 'MÃ¡y chá»§ chÆ°a cháº¥p nháº­n má»Ÿ láº¡i.', 'Lá»—i');
    notifyParentToast('KhÃ´ng thá»ƒ má»Ÿ láº¡i SCAR.', 'error');
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
    if(state.lastServerSaveAt) els.saveMeta.textContent = 'ÄÃ£ Ä‘á»“ng bá»™ mÃ¡y chá»§ lÃºc ' + formatDateTime(state.lastServerSaveAt) + '.';
    else if(state.lastLocalSaveAt) els.saveMeta.textContent = 'ÄÃ£ lÆ°u cá»¥c bá»™ lÃºc ' + formatDateTime(state.lastLocalSaveAt) + '.';
    else els.saveMeta.textContent = 'ChÆ°a cÃ³ lÆ°á»£t lÆ°u nÃ o trong phiÃªn nÃ y.';
  }
  if(els.entryMeta){
    var revision = state.entry && state.entry.submission_revision ? ' Â· Revision ná»™p: R' + state.entry.submission_revision : '';
    els.entryMeta.textContent = 'Nguá»“n dá»¯ liá»‡u khá»Ÿi táº¡o: ' + state.loadedSource + revision + '.';
  }
}

function updateActionState(){
  var readiness = submitReadiness();
  if(els.btnSaveDraft){
    els.btnSaveDraft.disabled = !!state.busySave || !!state.busySubmit;
    els.btnSaveDraft.textContent = state.busySave ? 'Äang lÆ°u...' : (state.loggedIn && state.allocationId ? 'LÆ°u nhÃ¡p' : 'LÆ°u cá»¥c bá»™');
  }
  if(els.btnReset) els.btnReset.disabled = !!state.busySave || !!state.busySubmit;
  if(els.btnSubmit){
    els.btnSubmit.disabled = !!state.busySubmit || !state.loggedIn || !state.allocationId || !readiness.valid;
    if(state.busySubmit) els.btnSubmit.textContent = 'Äang gá»­i SCAR...';
    else if(readiness.missingSignatures.length) els.btnSubmit.textContent = 'KÃ½ phÃ¡t hÃ nh trÆ°á»›c';
    else if(Object.keys(readiness.errors).length) els.btnSubmit.textContent = 'HoÃ n thiá»‡n trÆ°á»ng báº¯t buá»™c';
    else els.btnSubmit.textContent = 'Gá»­i SCAR';
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
    updateRuntimeAlert('warning', 'ÄÃ£ lÆ°u cá»¥c bá»™', 'PhiÃªn hiá»‡n táº¡i chÆ°a cÃ³ mÃ£ há»“ sÆ¡ hoáº·c chÆ°a Ä‘Äƒng nháº­p, nÃªn báº£n lÆ°u nÃ y chá»‰ náº±m trÃªn trÃ¬nh duyá»‡t hiá»‡n táº¡i.', 'Cá»¥c bá»™');
    notifyParentToast('ÄÃ£ lÆ°u cá»¥c bá»™ biá»ƒu máº«u SCAR.', 'info');
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
    if(!resp || !resp.ok) throw new Error('MÃ¡y chá»§ khÃ´ng xÃ¡c nháº­n lÆ°u nhÃ¡p.');
    state.lastServerSaveAt = new Date().toISOString();
    state.resetSnapshot = clone(state.data);
    updateRuntimeAlert('success', 'ÄÃ£ lÆ°u nhÃ¡p mÃ¡y chá»§', 'Biá»ƒu máº«u SCAR Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»“ng bá»™ nhÃ¡p lÃªn mÃ¡y chá»§. Anh cÃ³ thá»ƒ tiáº¿p tá»¥c lÃ m viá»‡c hoáº·c quay láº¡i sau mÃ  khÃ´ng máº¥t dá»¯ liá»‡u.', 'ÄÃ£ lÆ°u');
    notifyParentToast('ÄÃ£ lÆ°u nhÃ¡p SCAR lÃªn mÃ¡y chá»§.', 'success');
  }).catch(function(error){
    updateRuntimeAlert('warning', 'MÃ¡y chá»§ chÆ°a lÆ°u Ä‘Æ°á»£c nhÃ¡p', (error && error.message) || 'Báº£n cá»¥c bá»™ váº«n cÃ²n trÃªn trÃ¬nh duyá»‡t nÃ y.', 'Cáº£nh bÃ¡o');
    notifyParentToast('KhÃ´ng thá»ƒ lÆ°u nhÃ¡p SCAR lÃªn mÃ¡y chá»§.', 'warn');
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
    updateRuntimeAlert('warning', 'ÄÃ£ lÆ°u cá»¥c bá»™', 'PhiÃªn hiá»‡n táº¡i chÆ°a cÃ³ mÃ£ há»“ sÆ¡ hoáº·c chÆ°a Ä‘Äƒng nháº­p, nÃªn báº£n lÆ°u nÃ y chá»‰ náº±m trÃªn trÃ¬nh duyá»‡t hiá»‡n táº¡i.', 'Cá»¥c bá»™');
    notifyParentToast('ÄÃ£ lÆ°u cá»¥c bá»™ biá»ƒu máº«u SCAR.', 'info');
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
    if(!resp || !resp.ok) throw new Error('MÃ¡y chá»§ khÃ´ng xÃ¡c nháº­n lÆ°u nhÃ¡p.');
    state.lastServerSaveAt = new Date().toISOString();
    markCurrentStateSaved();
    updateRuntimeAlert('success', 'ÄÃ£ lÆ°u nhÃ¡p mÃ¡y chá»§', 'Biá»ƒu máº«u SCAR Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»“ng bá»™ nhÃ¡p lÃªn mÃ¡y chá»§. Anh cÃ³ thá»ƒ tiáº¿p tá»¥c lÃ m viá»‡c hoáº·c quay láº¡i sau mÃ  khÃ´ng máº¥t dá»¯ liá»‡u.', 'ÄÃ£ lÆ°u');
    notifyParentToast('ÄÃ£ lÆ°u nhÃ¡p SCAR lÃªn mÃ¡y chá»§.', 'success');
    return { ok:true, scope:'server' };
  }).catch(function(error){
    updateRuntimeAlert('warning', 'MÃ¡y chá»§ chÆ°a lÆ°u Ä‘Æ°á»£c nhÃ¡p', (error && error.message) || 'Báº£n cá»¥c bá»™ váº«n cÃ²n trÃªn trÃ¬nh duyá»‡t nÃ y.', 'Cáº£nh bÃ¡o');
    notifyParentToast('KhÃ´ng thá»ƒ lÆ°u nhÃ¡p SCAR lÃªn mÃ¡y chá»§.', 'warn');
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
  updateRuntimeAlert('info', 'ÄÃ£ khÃ´i phá»¥c dá»¯ liá»‡u', 'Biá»ƒu máº«u Ä‘Ã£ quay vá» áº£nh chá»¥p dá»¯ liá»‡u gáº§n nháº¥t Ä‘Æ°á»£c táº£i hoáº·c lÆ°u thá»§ cÃ´ng.', 'KhÃ´i phá»¥c');
  notifyParentToast('ÄÃ£ khÃ´i phá»¥c dá»¯ liá»‡u biá»ƒu máº«u SCAR.', 'info');
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
  notifyParentToast('Äang chá»‰nh sá»­a biá»ƒu máº«u SCAR.', 'info');
}

function handleCancelEdit(){
  state.data = clone(state.resetSnapshot);
  state.signatures = clone(state.resetSignaturesSnapshot);
  normalizeData(state.data);
  populateForm();
  renderDisplayValues();
  setMode('view');
  publishDirtyState('cancel-edit');
  notifyParentToast('ÄÃ£ há»§y chá»‰nh sá»­a, khÃ´i phá»¥c dá»¯ liá»‡u hiá»ƒn thá»‹.', 'info');
}

function handlePrint(){
  var prev = document.body.getAttribute('data-mode') || 'edit';
  document.body.setAttribute('data-mode', 'view');
  renderDisplayValues();
  window.print();
  document.body.setAttribute('data-mode', prev);
}

var SEVERITY_DV_LABELS = { minor:'Nháº¹ (Minor)', major:'Náº·ng (Major)', critical:'NghiÃªm trá»ng (Critical)' };
var STATUS_DV_LABELS = { open:'Má»Ÿ (Open)', awaiting_response:'Chá» pháº£n há»“i NCC', under_review:'Äang xem xÃ©t', verification:'Äang xÃ¡c nháº­n', closed:'ÄÃ£ Ä‘Ã³ng (Closed)' };

function formatDateDv(iso){
  if(!iso) return 'â€”';
  var parts = String(iso).split('-');
  if(parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return iso;
}

function renderDisplayValues(){
  var DV_MAP = {
    scar_date: function(v){ return formatDateDv(v); },
    supplier_response_due_date: function(v){ return formatDateDv(v); },
    scar_status: function(v){ return STATUS_DV_LABELS[v] || v || 'â€”'; },
    severity: function(v){ return SEVERITY_DV_LABELS[v] || v || 'â€”'; },
    quantity_received: function(v){ return v || v === 0 ? String(parseNumber(v) || 0) : 'â€”'; },
    quantity_rejected: function(v){ return v || v === 0 ? String(parseNumber(v) || 0) : 'â€”'; },
    quantity_accepted_calc: function(v){ return v || '0'; },
    root_cause_required: function(v){ return v ? 'âœ“ YÃªu cáº§u phÃ¢n tÃ­ch nguyÃªn nhÃ¢n gá»‘c (RCA)' : 'âœ— Cháº¿ Ä‘á»™ containment rÃºt gá»n'; },
    closeout_ready: function(v){ return v || 'â€”'; }
  };
  FIELD_IDS.forEach(function(fieldId){
    var dv = byId(fieldId + '__dv');
    if(!dv) return;
    var value = state.data[fieldId];
    var fmt = DV_MAP[fieldId];
    var text = fmt ? fmt(value) : (String(value == null ? '' : value).trim() || 'â€”');
    dv.textContent = text;
    dv.className = 'qf-dv' + (text === 'â€”' || !String(value || '').trim() ? ' qf-dv--empty' : '');
  });
  // Also update the root_cause display span (special case - it's after the label, not an input)
  var rcDv = byId('root_cause_required__dv');
  if(rcDv){
    var rcVal = state.data.root_cause_required;
    rcDv.textContent = rcVal ? 'âœ“ YÃªu cáº§u phÃ¢n tÃ­ch nguyÃªn nhÃ¢n gá»‘c (RCA)' : 'âœ— Cháº¿ Ä‘á»™ containment rÃºt gá»n';
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
    updateRuntimeAlert('danger', 'Biá»ƒu máº«u chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n gá»­i', 'HÃ£y hoÃ n thiá»‡n cÃ¡c trÆ°á»ng báº¯t buá»™c, kiá»ƒm tra sá»‘ lÆ°á»£ng vÃ  xÃ¡c nháº­n Ä‘á»§ pháº£n há»“i nhÃ  cung cáº¥p trÆ°á»›c khi gá»­i SCAR.', 'Thiáº¿u dá»¯ liá»‡u');
    focusFirstError(errors);
    notifyParentToast('SCAR chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n gá»­i.', 'warn');
    return;
  }
  var missingSignatures = missingRequiredSubmitSignatures();
  if(missingSignatures.length){
    updateRuntimeAlert('warning', 'Thiáº¿u chá»¯ kÃ½ báº¯t buá»™c', 'HÃ£y kÃ½ cÃ¡c block báº¯t buá»™c trÆ°á»›c khi gá»­i: ' + missingSignatures.join(', ') + '.', 'Thiáº¿u chá»¯ kÃ½');
    notifyParentToast('Thiáº¿u chá»¯ kÃ½ báº¯t buá»™c trÆ°á»›c khi gá»­i SCAR.', 'warn');
    if(els.workflowPanel && typeof els.workflowPanel.scrollIntoView === 'function') els.workflowPanel.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  if(!state.loggedIn || !state.allocationId){
    updateRuntimeAlert('warning', 'ChÆ°a thá»ƒ gá»­i SCAR', 'Biá»ƒu máº«u cáº§n Ä‘Æ°á»£c má»Ÿ tá»« workspace Ä‘Ã£ cáº¥p mÃ£ há»“ sÆ¡ vÃ  phiÃªn QMS pháº£i cÃ²n hiá»‡u lá»±c.', 'ChÆ°a sáºµn sÃ ng');
    notifyParentToast('ChÆ°a cÃ³ mÃ£ há»“ sÆ¡ hoáº·c phiÃªn Ä‘Äƒng nháº­p Ä‘á»ƒ gá»­i SCAR.', 'warn');
    return;
  }
  state.busySubmit = true;
  updateActionState();
  var payload = buildSubmitPayload();
  callApi('form_fill_submit_online', { allocation_id: state.allocationId, form_code: FORM_CODE, form_data: payload }, 'POST').then(function(resp){
    if(!resp || !resp.ok) throw new Error(serverErrorMessage(resp) || 'MÃ¡y chá»§ khÃ´ng nháº­n Ä‘Æ°á»£c SCAR.');
    state.allocation = resp.allocation || state.allocation;
    state.entry = mergeSubmittedEntry(payload, resp);
    state.lastServerSaveAt = new Date().toISOString();
    state.resetSnapshot = clone(state.data);
    saveLocalDraft('submitted');
    return linkOrderIfPossible().catch(function(){ return false; }).then(function(){
      updateRuntimeAlert('success', 'ÄÃ£ gá»­i SCAR thÃ nh cÃ´ng', 'MÃ¡y chá»§ Ä‘Ã£ ghi nháº­n báº£n ná»™p trá»±c tuyáº¿n cá»§a há»“ sÆ¡ nÃ y. Workflow review vÃ  checklist ngoÃ i portal sáº½ Ä‘Æ°á»£c lÃ m má»›i ngay sau Ä‘Ã³.', 'ÄÃ£ gá»­i');
      notifyParentToast('ÄÃ£ gá»­i SCAR thÃ nh cÃ´ng.', 'success');
      notifyParentRefresh();
      renderAll();
      setMode('view');
    });
  }).catch(function(error){
    updateRuntimeAlert('danger', 'KhÃ´ng thá»ƒ gá»­i SCAR', (error && error.message) || 'Há»‡ thá»‘ng chÆ°a ghi nháº­n Ä‘Æ°á»£c báº£n ná»™p trá»±c tuyáº¿n.', 'Lá»—i');
    notifyParentToast('KhÃ´ng thá»ƒ gá»­i SCAR.', 'error');
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
    if(!hasMeaningfulValue(state.data[fieldId])) errors[fieldId] = 'TrÆ°á»ng nÃ y lÃ  báº¯t buá»™c.';
  });
  var qtyReceived = parseNumber(state.data.quantity_received);
  var qtyRejected = parseNumber(state.data.quantity_rejected);
  if(qtyReceived <= 0) errors.quantity_received = 'Sá»‘ lÆ°á»£ng nháº­n pháº£i lá»›n hÆ¡n 0.';
  if(qtyRejected < 0) errors.quantity_rejected = 'Sá»‘ lÆ°á»£ng loáº¡i bá» khÃ´ng Ä‘Æ°á»£c Ã¢m.';
  if(qtyRejected > qtyReceived && qtyReceived > 0) errors.quantity_rejected = 'Sá»‘ lÆ°á»£ng loáº¡i bá» khÃ´ng Ä‘Æ°á»£c lá»›n hÆ¡n sá»‘ lÆ°á»£ng nháº­n.';
  if(state.data.supplier_response_due_date && state.data.scar_date){
    var scarDate = Date.parse(state.data.scar_date);
    var dueDate = Date.parse(state.data.supplier_response_due_date);
    if(isFinite(scarDate) && isFinite(dueDate) && dueDate < scarDate){
      errors.supplier_response_due_date = 'Háº¡n pháº£n há»“i khÃ´ng Ä‘Æ°á»£c sá»›m hÆ¡n ngÃ y phÃ¡t hÃ nh SCAR.';
    }
  }
  if(state.data.root_cause_required){
    ROOT_CAUSE_FIELDS.forEach(function(fieldId){
      if(!hasMeaningfulValue(state.data[fieldId])) errors[fieldId] = 'TrÆ°á»ng nÃ y báº¯t buá»™c khi yÃªu cáº§u phÃ¢n tÃ­ch nguyÃªn nhÃ¢n gá»‘c.';
    });
  }
  if(String(state.data.scar_status || '') === 'closed'){
    if(!hasMeaningfulValue(state.data.verification_method)) errors.verification_method = 'Cáº§n nÃªu phÆ°Æ¡ng phÃ¡p xÃ¡c nháº­n trÆ°á»›c khi Ä‘Ã³ng SCAR.';
    if(!hasMeaningfulValue(state.data.verification_result)) errors.verification_result = 'Cáº§n cÃ³ káº¿t quáº£ xÃ¡c nháº­n trÆ°á»›c khi Ä‘Ã³ng SCAR.';
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
  button.textContent = 'DÃ¹ng ngÆ°á»i Ä‘Äƒng nháº­p';
  button.addEventListener('click', function(){
    var item = currentCompanyUserItem();
    if(!item){
      notifyParentToast('KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i Ä‘Äƒng nháº­p trong danh sÃ¡ch cÃ´ng ty.', 'warn');
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
    { value:'Dimensional', label:'Dimensional', sub:'KÃ­ch thÆ°á»›c / dung sai', defect_name:'Dimensional', defect_code:'DEF-DIM' },
    { value:'Surface', label:'Surface', sub:'Bá» máº·t / xá»­ lÃ½ bá» máº·t', defect_name:'Surface', defect_code:'DEF-SUR' },
    { value:'Packaging', label:'Packaging', sub:'ÄÃ³ng gÃ³i / báº£o quáº£n', defect_name:'Packaging', defect_code:'DEF-PKG' },
    { value:'Documentation', label:'Documentation', sub:'TÃ i liá»‡u / chá»©ng tá»«', defect_name:'Documentation', defect_code:'DEF-DOC' },
    { value:'Material', label:'Material', sub:'Váº­t liá»‡u / heat / lot', defect_name:'Material', defect_code:'DEF-MAT' },
    { value:'Traceability', label:'Traceability', sub:'Truy xuáº¥t / nhÃ£n / marking', defect_name:'Traceability', defect_code:'DEF-TRC' }
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
  if(preferred) pushSupplier(preferred, 'NhÃ  cung cáº¥p Æ°u tiÃªn theo mÃ£ chi tiáº¿t Ä‘ang chá»n.');
  var typedId = String(state.data.supplier_id || '').trim().toUpperCase();
  var typedName = String(state.data.supplier_name || '').trim().toLowerCase();
  suppliers.forEach(function(item){
    var supplierId = String(item.supplier_id || '').trim().toUpperCase();
    var supplierName = String(item.supplier_name || '').trim().toLowerCase();
    if(typedId && supplierId === typedId) pushSupplier(item, 'Khá»›p trá»±c tiáº¿p vá»›i mÃ£ nhÃ  cung cáº¥p Ä‘ang nháº­p.');
    else if(typedName && supplierName && supplierName.indexOf(typedName) >= 0) pushSupplier(item, 'Khá»›p vá»›i tÃªn nhÃ  cung cáº¥p Ä‘ang nháº­p.');
  });
  suppliers.filter(function(item){
    return String(item.status || '').toLowerCase() === 'approved';
  }).slice(0, 2).forEach(function(item){
    pushSupplier(item, 'NhÃ  cung cáº¥p Ä‘Ã£ Ä‘Æ°á»£c phÃª duyá»‡t trong danh má»¥c ná»n.');
  });
  return out.slice(0, 4);
}

function autoFillSupplierFromPart(data, rerender){
  if(!data || hasMeaningfulValue(data.supplier_id) || hasMeaningfulValue(data.supplier_name)) return;
  var supplier = preferredSupplierForPart(data.part_number);
  if(!supplier) return;
  data.supplier_id = String(supplier.supplier_id || '');
  data.supplier_name = String(supplier.supplier_name || '');
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
  return [String(supplier.contact_name || '').trim(), String(supplier.contact_email || '').trim()].filter(Boolean).join(' Â· ');
}

function hydrateSupplierDatalist(){
  var datalist = byId('supplierList');
  if(!datalist) return;
  datalist.innerHTML = '';
  (Array.isArray(state.master && state.master.suppliers) ? state.master.suppliers : []).forEach(function(supplier){
    var option = document.createElement('option');
    option.value = String(supplier.supplier_name || '');
    option.label = [String(supplier.supplier_id || ''), buildSupplierContact(supplier)].filter(Boolean).join(' Â· ');
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
    note: 'HoÃ n táº¥t ' + filled + '/' + requiredIds.length + ' trÆ°á»ng báº¯t buá»™c Ä‘ang Ã¡p dá»¥ng cho SCAR nÃ y.'
  };
}

function closeoutMeta(){
  if(!hasMeaningfulValue(state.data.containment_action)) return { label:'ChÆ°a sáºµn sÃ ng' };
  if(state.data.root_cause_required){
    var missingRoot = ROOT_CAUSE_FIELDS.some(function(fieldId){ return !hasMeaningfulValue(state.data[fieldId]); });
    if(missingRoot) return { label:'Chá» pháº£n há»“i NCC' };
  }
  if(!hasMeaningfulValue(state.data.verification_method) || !hasMeaningfulValue(state.data.verification_result)){
    return { label:'Chá» xÃ¡c nháº­n hiá»‡u lá»±c' };
  }
  if(String(state.data.scar_status || '') !== 'closed') return { label:'Äá»§ dá»¯ liá»‡u Ä‘á»ƒ xem xÃ©t Ä‘Ã³ng' };
  return { label:'Sáºµn sÃ ng Ä‘Ã³ng há»“ sÆ¡' };
}

function dueDateMeta(){
  if(!state.data.supplier_response_due_date){
    return { className:'warning', title:'ChÆ°a thiáº¿t láº­p', shortTitle:'ChÆ°a thiáº¿t láº­p', note:'Thiáº¿t láº­p háº¡n pháº£n há»“i Ä‘á»ƒ theo dÃµi nhÃ  cung cáº¥p vÃ  escalations.' };
  }
  var due = new Date(state.data.supplier_response_due_date + 'T23:59:59');
  var now = new Date();
  var diffHours = Math.round((due.getTime() - now.getTime()) / 3600000);
  if(diffHours < 0){
    return { className:'danger', title:'QuÃ¡ háº¡n ' + formatNumber(Math.abs(diffHours), 0) + ' giá»', shortTitle:'QuÃ¡ háº¡n', note:'NhÃ  cung cáº¥p Ä‘Ã£ vÆ°á»£t háº¡n pháº£n há»“i. Cáº§n cáº­p nháº­t tráº¡ng thÃ¡i vÃ  escalations ngay.' };
  }
  if(diffHours <= 24){
    return { className:'warning', title:'CÃ²n ' + formatNumber(diffHours, 0) + ' giá»', shortTitle:'CÃ²n ' + formatNumber(diffHours, 0) + ' giá»', note:'SCAR Ä‘ang gáº§n háº¡n. Cáº§n bÃ¡m sÃ¡t pháº£n há»“i cá»§a nhÃ  cung cáº¥p trong ngÃ y.' };
  }
  var diffDays = Math.ceil(diffHours / 24);
  return { className: diffDays <= 3 ? 'warning' : 'info', title:'CÃ²n ' + formatNumber(diffDays, 0) + ' ngÃ y', shortTitle:'CÃ²n ' + formatNumber(diffDays, 0) + ' ngÃ y', note:'CÃ²n thá»i gian Ä‘á»ƒ theo dÃµi pháº£n há»“i, nhÆ°ng váº«n nÃªn giá»¯ containment vÃ  cáº­p nháº­t tiáº¿n Ä‘á»™ Ä‘á»u Ä‘áº·n.' };
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
  if(statusLabel === 'ÄÃ£ Ä‘Ã³ng') return 'SCAR Ä‘Ã£ Ä‘Æ°á»£c Ä‘Ã³ng sau khi xÃ¡c nháº­n hiá»‡u lá»±c vÃ  hoÃ n thiá»‡n há»“ sÆ¡.';
  if(statusLabel === 'Äang xÃ¡c nháº­n') return 'Äang kiá»ƒm tra hiá»‡u lá»±c cá»§a hÃ nh Ä‘á»™ng kháº¯c phá»¥c trÆ°á»›c khi quyáº¿t Ä‘á»‹nh Ä‘Ã³ng.';
  if(statusLabel === 'Chá» pháº£n há»“i nhÃ  cung cáº¥p') return 'Æ¯u tiÃªn bÃ¡m sÃ¡t deadline vÃ  cáº­p nháº­t ngay khi nhÃ  cung cáº¥p pháº£n há»“i.';
  if(statusLabel === 'Äang xem xÃ©t') return 'Äang Ä‘Ã¡nh giÃ¡ cháº¥t lÆ°á»£ng pháº£n há»“i, má»©c Ä‘á»™ hiá»‡u lá»±c vÃ  báº±ng chá»©ng há»— trá»£.';
  return 'SCAR Ä‘ang má»Ÿ vÃ  chá» hoÃ n thiá»‡n dá»¯ liá»‡u hoáº·c pháº£n há»“i cá»§a nhÃ  cung cáº¥p.';
}

function severityMeta(value){
  return SEVERITY_META[String(value || '').trim().toLowerCase()] || { label:'ChÆ°a chá»n', note:'Chá»n Ä‘Ãºng má»©c Ä‘á»™ Ä‘á»ƒ Ä‘iá»u phá»‘i pháº£n há»“i vÃ  review phÃ¹ há»£p.', className:'info' };
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
  if(resp.error === 'missing_required_signature') return 'MÃ¡y chá»§ yÃªu cáº§u chá»¯ kÃ½ báº¯t buá»™c trÆ°á»›c khi gá»­i.';
  if(resp.error) return 'MÃ¡y chá»§ tráº£ vá» lá»—i: ' + String(resp.error);
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
        throw new Error('API tráº£ vá» ná»™i dung khÃ´ng pháº£i JSON há»£p lá»‡.');
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

function repairVisibleMojibake(root){
  if(!root || !root.querySelectorAll) return;
  var suspicious = /Ã|Â|Æ|Ä|áº|á»/;
  function repairString(value){
    if(!value || !suspicious.test(value)) return value;
    try{
      return decodeURIComponent(escape(value));
    }catch(_err){
      try{
        var bytes = new Uint8Array(Array.prototype.map.call(String(value), function(ch){
          return ch.charCodeAt(0) & 255;
        }));
        return new TextDecoder('utf-8').decode(bytes);
      }catch(_err2){
        return value;
      }
    }
  }
  root.querySelectorAll('*').forEach(function(node){
    Array.prototype.forEach.call(node.childNodes || [], function(child){
      if(child && child.nodeType === Node.TEXT_NODE){
        var fixed = repairString(child.nodeValue);
        if(fixed !== child.nodeValue) child.nodeValue = fixed;
      }
    });
    ['placeholder','title','aria-label','value'].forEach(function(attr){
      if(node.hasAttribute && node.hasAttribute(attr)){
        var raw = node.getAttribute(attr);
        var fixedAttr = repairString(raw);
        if(fixedAttr !== raw) node.setAttribute(attr, fixedAttr);
      }
    });
  });
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
  if(!value) return 'ChÆ°a cÃ³';
  try {
    return new Intl.DateTimeFormat(state.lang, { dateStyle:'short', timeStyle:'short' }).format(new Date(value));
  } catch(_err){
    return String(value);
  }
}
function localDraftKey(){ return 'hesem:form-runtime:' + FORM_CODE + ':' + (state.allocationId || 'unallocated'); }
function cssEscape(value){ if(window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value); return String(value).replace(/[^A-Za-z0-9_-]/g, '\\$&'); }

})();

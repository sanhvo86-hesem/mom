(function(){
'use strict';

var state = {
  container: null,
  forms: [],
  formMap: {},
  formSearch: '',
  selectedFormCode: '',
  selectedAllocationId: '',
  pendingRecordId: '',
  master: null,
  orders: { sales_orders: [], job_orders: [], work_orders: [] },
  fieldValues: {},
  signatures: {},
  lookupInstances: {},
  activeDraftKey: '',
  hasLocalDraft: false,
  loadedServerEntryKey: ''
};

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(value == null ? '' : value))); return d.innerHTML; }
function api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var opts = { method: method || 'GET', credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if((method || 'GET') !== 'GET'){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(payload || {}); }
  return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){ return r.json(); });
}
function toast(message, type){
  if(typeof window._fhShowToast === 'function') return window._fhShowToast(message, type);
  if(window.console) console.log('[FillDownload]', type || 'info', message);
}
function currentUserProfile(){
  var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : {};
  return {
    username: String(user.username || '').trim(),
    name: String(user.display_name || user.name || user.username || 'Người dùng hệ thống').trim(),
    title: String(user.title || user.role || '').trim(),
    dept: String(user.dept || '').trim(),
    signerId: String(user.username || '').trim().toUpperCase()
  };
}
function ensureStyles(){
  if(document.getElementById('ecf-styles')) return;
  var style = document.createElement('style');
  style.id = 'ecf-styles';
  style.textContent = [
    '.ecf-shell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:18px;align-items:start}',
    '.ecf-sidebar,.ecf-main,.ecf-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 10px 24px rgba(15,23,42,.05)}',
    '.ecf-sidebar{padding:18px;position:sticky;top:18px}.ecf-main{padding:18px;display:grid;gap:16px}.ecf-card{padding:16px}',
    '.ecf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.ecf-head h2{margin:0;font-size:18px;color:#0c2d48}.ecf-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.6}',
    '.ecf-search,.ecf-input,.ecf-select,.ecf-textarea{width:100%;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;font-size:13px;font-family:inherit;box-sizing:border-box}.ecf-textarea{min-height:96px;resize:vertical}',
    '.ecf-search:focus,.ecf-input:focus,.ecf-select:focus,.ecf-textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.ecf-form-list,.ecf-alloc-list{display:grid;gap:10px;margin-top:14px;max-height:70vh;overflow:auto;padding-right:4px}',
    '.ecf-form-card,.ecf-alloc-card{border:1px solid #e2e8f0;border-radius:16px;padding:14px;cursor:pointer;transition:all .16s;background:#fff}',
    '.ecf-form-card:hover,.ecf-alloc-card:hover{border-color:#93c5fd;box-shadow:0 8px 20px rgba(21,101,192,.08)}.ecf-form-card.active,.ecf-alloc-card.active{border-color:#1565c0;background:#eff6ff;box-shadow:0 0 0 3px rgba(21,101,192,.08)}',
    '.ecf-form-top,.ecf-alloc-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px}',
    '.ecf-form-code,.ecf-record-id{font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#0f172a}.ecf-form-badge{font-family:Consolas,monospace;font-size:11px;font-weight:800;color:#1565c0;background:#dbeafe;padding:3px 8px;border-radius:999px}',
    '.ecf-mode{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:3px 8px}.ecf-mode.online{background:#dcfce7;color:#166534}.ecf-mode.offline{background:#ffedd5;color:#c2410c}',
    '.ecf-form-title{font-size:14px;font-weight:800;color:#0f172a;line-height:1.4;margin-bottom:6px}.ecf-meta{font-size:11px;color:#64748b;line-height:1.55}',
    '.ecf-layout{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px}.ecf-panel-head{margin-bottom:12px}.ecf-panel-head h3{margin:0;font-size:14px;color:#0c2d48}.ecf-panel-head p{margin:4px 0 0;font-size:11px;color:#64748b;line-height:1.5}',
    '.ecf-hero{background:linear-gradient(135deg,#0c2d48 0%,#133e68 48%,#1f6aa5 100%);border-radius:20px;padding:20px 22px;color:#fff;display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center}',
    '.ecf-logo{width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18)}.ecf-logo img{width:40px;height:40px;object-fit:contain}',
    '.ecf-kicker{display:inline-flex;padding:3px 10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.08);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
    '.ecf-title{margin:8px 0 6px;font-size:20px;font-weight:800;line-height:1.25}.ecf-sub{font-size:12px;line-height:1.65;color:rgba(255,255,255,.82);margin:0}',
    '.ecf-stepper{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}.ecf-step{padding:8px 12px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:11px;font-weight:700;color:rgba(255,255,255,.72)}.ecf-step.done{background:#dcfce7;border-color:#86efac;color:#166534}',
    '.ecf-context{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.ecf-context-item{border:1px solid #dbe6f3;border-radius:14px;padding:12px 14px;background:#f8fbff}.ecf-context-item small{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:5px}.ecf-context-item strong{display:block;font-size:13px;color:#0f172a;line-height:1.45;word-break:break-word}',
    '.ecf-section{border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden}.ecf-section-head{padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.ecf-section-head h4{margin:0;font-size:14px;color:#0c2d48}.ecf-section-head p{margin:4px 0 0;font-size:11px;color:#64748b;line-height:1.5}',
    '.ecf-section-body{padding:16px;display:grid;gap:14px}.ecf-fields{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}.ecf-field{grid-column:span 6;display:grid;gap:6px}.ecf-field.full{grid-column:1/-1}.ecf-field.third{grid-column:span 4}',
    '.ecf-label{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155}.ecf-label .req{color:#dc2626;margin-left:4px}.ecf-note{font-size:11px;color:#64748b;line-height:1.5}',
    '.ecf-multi{display:flex;flex-wrap:wrap;gap:10px}.ecf-check{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #d1d5db;border-radius:12px;background:#fff;cursor:pointer;font-size:13px;color:#334155}.ecf-check input{accent-color:#1565c0}',
    '.ecf-signatures{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.ecf-sign{border:1px dashed #cbd5e1;border-radius:16px;padding:14px;background:#fcfdff;display:grid;gap:10px}.ecf-sign.locked{opacity:.62}.ecf-sign-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ecf-sign-title{font-size:13px;font-weight:800;color:#0f172a}.ecf-sign-sub{font-size:11px;color:#64748b;line-height:1.5}.ecf-sign-pad{min-height:132px;border:1px dashed #d1d5db;border-radius:14px;background:#fff;padding:8px;display:flex;align-items:center;justify-content:center}.ecf-sign-empty{font-size:12px;color:#94a3b8;text-align:center;line-height:1.6}.ecf-sign-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.ecf-actions{position:sticky;bottom:12px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border:1px solid rgba(203,213,225,.9);box-shadow:0 16px 24px rgba(15,23,42,.08)}',
    '.ecf-btn{height:42px;border:none;border-radius:12px;padding:0 16px;font-size:13px;font-weight:800;cursor:pointer;transition:all .16s;display:inline-flex;align-items:center;gap:8px;justify-content:center}.ecf-btn.primary{background:#1565c0;color:#fff}.ecf-btn.secondary{background:#eef2f7;color:#334155}.ecf-btn.ghost{background:#fff;border:1px solid #d1d5db;color:#334155}',
    '.ecf-empty{padding:20px;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc;text-align:center;color:#64748b;font-size:12px;line-height:1.6}.ecf-empty strong{display:block;color:#0c2d48;margin-bottom:4px}',
    '@media (max-width:1200px){.ecf-shell,.ecf-layout{grid-template-columns:1fr}.ecf-sidebar{position:static}}',
    '@media (max-width:720px){.ecf-fields{grid-template-columns:repeat(1,minmax(0,1fr))}.ecf-field,.ecf-field.third,.ecf-field.full{grid-column:1/-1}.ecf-hero{grid-template-columns:1fr}.ecf-stepper{justify-content:flex-start}}'
  ].join('\n');
  document.head.appendChild(style);
}

function ensureMaster(){
  if(state.master) return Promise.resolve(state.master);
  if(typeof window._mdEnsureSnapshot === 'function'){
    return window._mdEnsureSnapshot(true).then(function(snapshot){
      state.master = snapshot || (typeof window._mdGetSnapshot === 'function' ? window._mdGetSnapshot() : {}) || {};
      return state.master;
    });
  }
  return api('master_data_snapshot', {}, 'GET').then(function(resp){ state.master = (resp && resp.data) ? resp.data : {}; return state.master; });
}

function flattenOrders(list){
  var out = { sales_orders: [], job_orders: [], work_orders: [] };
  (list || []).forEach(function(so){
    out.sales_orders.push({ value:so.so_number, label:so.so_number, sub:[so.customer_id || '', so.customer_name || '', so.customer_po ? ('PO ' + so.customer_po) : ''].filter(Boolean).join(' · '), so_number:so.so_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '' });
    (so.job_orders || []).forEach(function(jo){
      out.job_orders.push({ value:jo.jo_number, label:jo.jo_number, sub:[jo.part_number || '', jo.part_revision || '', jo.part_description || ''].filter(Boolean).join(' · '), so_number:so.so_number || '', jo_number:jo.jo_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '', part_number:jo.part_number || '', part_revision:jo.part_revision || '', part_description:jo.part_description || '' });
      (jo.work_orders || []).forEach(function(wo){
        out.work_orders.push({ value:wo.wo_number, label:wo.wo_number, sub:[wo.operation_desc || '', wo.machine_id || '', wo.work_center_id || ''].filter(Boolean).join(' · '), so_number:so.so_number || '', jo_number:jo.jo_number || '', wo_number:wo.wo_number || '', customer_id:so.customer_id || '', customer_name:so.customer_name || '', part_number:jo.part_number || '', part_revision:jo.part_revision || '', operation_desc:wo.operation_desc || '', machine_id:wo.machine_id || '' });
      });
    });
  });
  return out;
}

function ensureOrders(){
  if(state.orders.sales_orders.length || state.orders.job_orders.length || state.orders.work_orders.length) return Promise.resolve(state.orders);
  return api('order_hierarchy', {}, 'GET').then(function(resp){ state.orders = flattenOrders((resp && (resp.hierarchy || resp.data)) || []); return state.orders; }).catch(function(){ state.orders = { sales_orders: [], job_orders: [], work_orders: [] }; return state.orders; });
}

function normalizeForms(forms){
  state.forms = Array.isArray(forms) ? forms.slice() : [];
  state.formMap = {};
  state.forms.forEach(function(form){ state.formMap[form.form_code] = form; });
  if(!state.selectedFormCode && state.forms.length) state.selectedFormCode = state.forms[0].form_code;
}

function selectedForm(){ return state.formMap[state.selectedFormCode] || null; }
function selectedAllocation(){ return (state.allocations || []).find(function(row){ return String(row.allocation_id || '') === String(state.selectedAllocationId || ''); }) || null; }
function applyPendingSelection(){
  var pending = (window._fhState && window._fhState.pendingFillSelection) ? window._fhState.pendingFillSelection : null;
  if(!pending) return;
  if(pending.formCode) state.selectedFormCode = pending.formCode;
  if(pending.allocationId) state.selectedAllocationId = pending.allocationId;
  if(pending.recordId) state.pendingRecordId = pending.recordId;
  if(window._fhState) window._fhState.pendingFillSelection = null;
}
function refreshAllocations(){
  if(!window.AllocationTracker || !state.selectedFormCode){ state.allocations = []; return Promise.resolve([]); }
  return window.AllocationTracker.getHistory({ form_code: state.selectedFormCode, page_size: 50 }).then(function(resp){
    var rows = (resp && Array.isArray(resp.entries)) ? resp.entries.filter(function(row){ return String(row.form_code || '') === String(state.selectedFormCode || ''); }) : [];
    state.allocations = rows;
    if(state.pendingRecordId){
      var found = rows.find(function(row){ return String(row.record_id || '') === String(state.pendingRecordId); });
      if(found) state.selectedAllocationId = found.allocation_id || state.selectedAllocationId;
      state.pendingRecordId = '';
    }
    if(!state.selectedAllocationId && rows.length) state.selectedAllocationId = rows[0].allocation_id || '';
    if(state.selectedAllocationId && !rows.some(function(row){ return String(row.allocation_id || '') === String(state.selectedAllocationId); })) state.selectedAllocationId = rows.length ? (rows[0].allocation_id || '') : '';
    hydrateFromAllocation();
    return rows;
  }).catch(function(){ state.allocations = []; state.selectedAllocationId = ''; return []; });
}

function draftKey(){ var form = selectedForm(); var alloc = selectedAllocation(); return 'qms_ecf_draft_' + (form ? form.form_code : 'none') + '_' + (alloc ? alloc.allocation_id : 'none'); }
function loadDraft(){
  var key = draftKey();
  if(state.activeDraftKey === key) return;
  state.activeDraftKey = key; state.fieldValues = {}; state.signatures = {}; state.hasLocalDraft = false;
  try {
    var raw = localStorage.getItem(key);
    if(raw){
      var parsed = JSON.parse(raw);
      state.fieldValues = parsed && parsed.fieldValues ? parsed.fieldValues : {};
      state.signatures = parsed && parsed.signatures ? parsed.signatures : {};
      state.hasLocalDraft = true;
    }
  } catch (error) {}
  hydrateFromAllocation();
}
function saveDraft(){ try { localStorage.setItem(draftKey(), JSON.stringify({ fieldValues: state.fieldValues, signatures: state.signatures })); toast(t('Đã lưu nháp cục bộ.', 'Draft saved locally.'), 'success'); } catch (error) { toast(t('Không thể lưu nháp trên trình duyệt này.', 'Could not save draft in this browser.'), 'error'); } }
function clearDraft(){ try { localStorage.removeItem(draftKey()); } catch (error) {} state.hasLocalDraft = false; }
function hydrateFromAllocation(){
  var allocation = selectedAllocation(); if(!allocation) return;
  var context = allocation.master_context || {};
  ['customer_id','supplier_id','so_number','jo_number','wo_number','part_number','part_revision','capa_number'].forEach(function(key){ if(!state.fieldValues[key] && context[key]) state.fieldValues[key] = context[key]; });
  if(!state.fieldValues.linked_capa && context.capa_number) state.fieldValues.linked_capa = context.capa_number;
}

function approvalSteps(form){
  var schema = form && form.schema ? form.schema : {};
  if(Array.isArray(schema.approval_flow) && schema.approval_flow.length){
    return schema.approval_flow.filter(function(step){ return step && (step.signature_block_id || step.id); }).map(function(step){
      return {
        id: String(step.signature_block_id || step.id || ''),
        labelVi: step.label_vi || step.label || '',
        labelEn: step.label_en || step.label || '',
        requiredOnSubmit: step.required_on_submit === true
      };
    });
  }
  return (schema.signature_blocks || []).filter(function(block){ return block && block.id; }).map(function(block){
    return {
      id: String(block.id),
      labelVi: block.label_vi || block.label || '',
      labelEn: block.label_en || block.label || '',
      requiredOnSubmit: block.required_on_submit === true
    };
  });
}

function currentApprovalState(form){
  var flow = approvalSteps(form);
  var lastSigned = 'draft';
  flow.forEach(function(step){ if(state.signatures[step.id]) lastSigned = step.id; });
  return lastSigned;
}

function extractFieldValuesFromEntry(entry){
  var skip = {
    form_code:true, form_version:true, record_id:true, allocation_id:true, master_context:true,
    signatures:true, approval_state:true, runtime_mode:true, _display:true, submitted_at:true,
    submitted_by:true, updated_at:true, updated_by:true, _server_time:true, _status:true, _ip:true,
    _session_user:true, online_submission:true
  };
  var fields = {};
  Object.keys(entry || {}).forEach(function(key){
    if(skip[key]) return;
    fields[key] = entry[key];
  });
  return fields;
}

function preloadSelectedOnlineEntry(){
  var form = selectedForm();
  var allocation = selectedAllocation();
  if(!form || form.online === false || !allocation) return Promise.resolve(null);
  if(state.hasLocalDraft) return Promise.resolve(null);
  var entryKey = [form.form_code || '', allocation.allocation_id || '', allocation.online_submission && allocation.online_submission.entry_id || ''].join(':');
  if(state.loadedServerEntryKey === entryKey) return Promise.resolve(null);
  return api('online_form_entry_get', {
    form_code: form.form_code,
    allocation_id: allocation.allocation_id || '',
    entry_id: allocation.online_submission && allocation.online_submission.entry_id || ''
  }, 'POST').then(function(resp){
    if(resp && resp.ok && resp.entry){
      state.fieldValues = extractFieldValuesFromEntry(resp.entry);
      state.signatures = resp.entry.signatures && typeof resp.entry.signatures === 'object' ? resp.entry.signatures : {};
      state.loadedServerEntryKey = entryKey;
      hydrateFromAllocation();
    }
    return resp;
  }).catch(function(){ return null; });
}

function renderContext(label, value){ return '<div class="ecf-context-item"><small>' + esc(label) + '</small><strong>' + esc(value || '—') + '</strong></div>'; }

function render(container){
  state.container = container; ensureStyles(); loadDraft();
  var form = selectedForm();
  if(!form){ container.innerHTML = '<div class="ecf-empty"><strong>' + esc(t('Chưa có form khả dụng', 'No form available')) + '</strong>' + esc(t('Hãy kiểm tra lại catalog hoặc quyền truy cập.', 'Please review the catalog or your access rights.')) + '</div>'; return; }
  container.innerHTML = '' +
    '<div class="ecf-shell">' + renderSidebar(form) +
      '<section class="ecf-main">' +
        '<div class="ecf-head"><div><h2>' + esc(t('Điền & Tải form theo runtime được kiểm soát', 'Governed fill & download runtime')) + '</h2><p>' + esc(t('Tab này dùng chung allocation history, master data và order hierarchy. Mọi SO/JO/WO/Part/Rev đều lấy từ dữ liệu nền, không nhập tay.', 'This tab shares allocation history, master data, and order hierarchy. SO/JO/WO/Part/Rev values come from governed master data, not free typing.')) + '</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="ecf-btn secondary" id="ecf-open-master">⚙ ' + esc(t('Dữ liệu nền', 'Master data')) + '</button><button type="button" class="ecf-btn ghost" id="ecf-open-record-id">🔢 ' + esc(t('Mở Trợ lý tạo mã', 'Open Record ID Assistant')) + '</button></div></div>' +
        '<div class="ecf-layout">' + renderAllocationPanel(form) + renderRuntimePanel(form) + '</div>' +
      '</section>' +
    '</div>';
  bindShellEvents();
  if(form.online === false) bindOfflineWorkspace(form); else bindOnlineForm(form);
}

function renderSidebar(selected){
  var rows = state.forms.filter(function(form){ var hay = [form.form_code, form.title, form.title_vi, form.description, form.description_vi, form.category].join(' ').toLowerCase(); return !state.formSearch || hay.indexOf(String(state.formSearch).toLowerCase()) >= 0; });
  return '<aside class="ecf-sidebar"><div class="ecf-head"><div><h2>' + esc(t('Chọn form', 'Select a form')) + '</h2><p>' + esc(t('Chuyển nhanh giữa form online và form offline đã được kiểm soát phiên bản.', 'Switch between online and offline forms governed by the same runtime.')) + '</p></div></div><input id="ecf-form-search" class="ecf-search" type="search" value="' + esc(state.formSearch) + '" placeholder="' + esc(t('Tìm form theo mã, tên, SOP...', 'Search form by code, title, SOP...')) + '"><div class="ecf-form-list">' + rows.map(function(form){ return '<button type="button" class="ecf-form-card' + (selected && selected.form_code === form.form_code ? ' active' : '') + '" data-form-code="' + esc(form.form_code) + '"><div class="ecf-form-top"><span class="ecf-form-badge">' + esc(form.form_code) + '</span><span class="ecf-mode ' + (form.online === false ? 'offline' : 'online') + '">' + esc(form.online === false ? t('Offline', 'Offline') : t('Online', 'Online')) + '</span></div><div class="ecf-form-title">' + esc(form.title_vi || form.title || form.form_code) + '</div><div class="ecf-meta">' + esc([form.version || 'V1', form.sop_ref || '', form.category || 'other'].filter(Boolean).join(' · ')) + '</div></button>'; }).join('') + '</div></aside>';
}

function renderAllocationPanel(form){
  return '<section class="ecf-card"><div class="ecf-panel-head"><h3>' + esc(t('Mã hồ sơ đã cấp cho form này', 'Allocated record IDs for this form')) + '</h3><p>' + esc(t('Chọn allocation để điền online hoặc tải gói Excel có hidden metadata kiểm soát.', 'Pick an allocation to fill online or download the governed Excel package with hidden metadata.')) + '</p></div>' + ((state.allocations || []).length ? '<div class="ecf-alloc-list">' + state.allocations.map(function(allocation){ var ctx = allocation.master_context || {}; return '<article class="ecf-alloc-card' + (String(allocation.allocation_id || '') === String(state.selectedAllocationId || '') ? ' active' : '') + '" data-allocation-id="' + esc(allocation.allocation_id || '') + '"><div class="ecf-alloc-top"><div><div class="ecf-record-id">' + esc(allocation.record_id || '') + '</div><div class="ecf-meta">' + esc(allocation.form_revision || form.version || 'V1') + '</div></div><div>' + (window.AllocationTracker ? window.AllocationTracker.renderStatusBadge(allocation.status || 'allocated') : esc(allocation.status || 'allocated')) + '</div></div><div class="ecf-meta">' + esc([allocation.department || '', ctx.customer_id || '', ctx.so_number || '', ctx.jo_number || '', ctx.wo_number || '', ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join(' · ') || t('Chưa gắn ngữ cảnh master data', 'No governed context yet')) + '</div></article>'; }).join('') + '</div>' : '<div class="ecf-empty"><strong>' + esc(t('Chưa có allocation cho form này', 'No allocation for this form yet')) + '</strong>' + esc(t('Hãy sang tab Trợ lý tạo mã để cấp mã hồ sơ trước khi điền hoặc tải form.', 'Open the Record ID Assistant first to allocate a record ID before filling or downloading this form.')) + '</div>') + '</section>';
}

function renderRuntimePanel(form){
  var allocation = selectedAllocation();
  var steps = [
    { label:form.online === false ? t('Excel kiểm soát', 'Governed Excel') : t('Runtime online', 'Online runtime'), done:true },
    { label:t('Đã cấp mã', 'Allocated'), done:!!allocation },
    { label:t('Đã gắn ngữ cảnh', 'Context bound'), done:!!(allocation && allocation.master_context && Object.keys(allocation.master_context).length) }
  ];
  return '<section style="display:grid;gap:16px"><div class="ecf-hero"><div class="ecf-logo"><img src="./assets/hesem-logo.svg" alt="HESEM"></div><div><div class="ecf-kicker">' + esc((form.form_code || '') + ' · ' + (form.version || 'V1')) + '</div><div class="ecf-title">' + esc(form.title_vi || form.title || form.form_code) + '</div><p class="ecf-sub">' + esc(t(form.description_vi || form.description || 'Runtime này áp dụng governed lookup, allocation history, hidden metadata và workflow chữ ký điện tử.', form.description || 'This runtime applies governed lookup, allocation history, hidden metadata, and electronic signature workflow.')) + '</p></div><div class="ecf-stepper">' + steps.map(function(step){ return '<span class="ecf-step' + (step.done ? ' done' : '') + '">' + esc(step.label) + '</span>'; }).join('') + '</div></div>' + (form.online === false ? renderOfflineRuntime(form, allocation) : renderOnlineRuntime(form, allocation)) + '</section>';
}

function renderOfflineRuntime(form, allocation){
  if(!allocation) return '<div class="ecf-empty"><strong>' + esc(t('Chưa chọn allocation', 'No allocation selected')) + '</strong>' + esc(t('Form offline luôn phải đi qua bước cấp mã trước, sau đó runtime mới tạo gói Excel có hidden metadata để tải về.', 'Offline forms must go through record allocation first. The runtime then issues a governed Excel package with hidden metadata.')) + '</div>';
  var ctx = allocation.master_context || {};
  return '<div class="ecf-card"><div class="ecf-context">' + renderContext(t('Mã hồ sơ', 'Record ID'), allocation.record_id) + renderContext(t('Khách hàng', 'Customer'), ctx.customer_id) + renderContext(t('SO / JO / WO', 'SO / JO / WO'), [ctx.so_number || '', ctx.jo_number || '', ctx.wo_number || ''].filter(Boolean).join(' · ')) + renderContext(t('Part / Rev', 'Part / Rev'), [ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join(' · ')) + renderContext(t('Tên file cấp phát', 'Issued filename'), allocation.offline_package && allocation.offline_package.filename ? allocation.offline_package.filename : (allocation.suggested_filename || '—')) + renderContext(t('Checksum mẫu', 'Template checksum'), allocation.template_checksum ? String(allocation.template_checksum).slice(0, 14) + '…' : '—') + '</div><p class="ecf-meta" style="margin:14px 0 0">' + esc(t('Khi nhấn tải, runtime sẽ tạo workbook mới có tên đúng theo SOP/WI/ANNEX, nhúng hidden sheet HESEM với allocation ID, checksum, master context và nhật ký receipt ban đầu.', 'When you click download, the runtime creates a new workbook with the governed filename and injects a hidden HESEM sheet containing the allocation ID, checksum, master context, and initial receipt log.')) + '</p><div class="ecf-actions"><button type="button" class="ecf-btn secondary" id="ecf-copy-issued-name">⧉ ' + esc(t('Sao chép tên file', 'Copy filename')) + '</button><button type="button" class="ecf-btn ghost" id="ecf-open-upload">📤 ' + esc(t('Mở tab Tải lên', 'Open Upload tab')) + '</button><button type="button" class="ecf-btn primary" id="ecf-download-offline">⬇ ' + esc(t('Tải gói biểu mẫu đã cấp mã', 'Download issued workbook')) + '</button></div></div>';
}
function renderOnlineRuntime(form, allocation){
  if(!allocation) return '<div class="ecf-empty"><strong>' + esc(t('Form online cũng yêu cầu allocation trước', 'Online forms also require an allocation first')) + '</strong>' + esc(t('Hãy cấp mã hồ sơ để hệ thống khóa record ID, ngữ cảnh master data và workflow duyệt trước khi nhập dữ liệu.', 'Allocate a record ID first so the runtime can lock the record context, governed master data, and approval workflow before data entry starts.')) + '</div>';
  var schema = form.schema || {};
  var sections = Array.isArray(schema.sections) && schema.sections.length ? schema.sections : [{ id:'main', title:t('Thông tin biểu mẫu', 'Form information'), field_ids:(schema.fields || []).map(function(field){ return field.id; }) }];
  var ctx = allocation.master_context || {};
  var steps = approvalSteps(form).map(function(step){
    return {
      label: t(step.labelVi || step.id, step.labelEn || step.id),
      done: !!state.signatures[step.id]
    };
  });
  return '<div style="display:grid;gap:16px"><div class="ecf-stepper">' + steps.map(function(step){ return '<span class="ecf-step' + (step.done ? ' done' : '') + '">' + esc(step.label) + '</span>'; }).join('') + '</div><div class="ecf-context">' + renderContext(t('Mã hồ sơ', 'Record ID'), allocation.record_id) + renderContext(t('Khách hàng', 'Customer'), ctx.customer_id) + renderContext(t('SO / JO / WO', 'SO / JO / WO'), [ctx.so_number || '', ctx.jo_number || '', ctx.wo_number || ''].filter(Boolean).join(' · ')) + renderContext(t('Part / Rev', 'Part / Rev'), [ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join(' · ')) + renderContext(t('Allocation status', 'Allocation status'), allocation.status || 'allocated') + renderContext(t('Approval state', 'Approval state'), currentApprovalState(form)) + '</div>' + sections.map(function(section){ return renderSection(schema, section); }).join('') + renderSignatureSection(form) + '<div class="ecf-actions"><button type="button" class="ecf-btn secondary" id="ecf-save-draft">💾 ' + esc(t('Lưu nháp cục bộ', 'Save local draft')) + '</button><button type="button" class="ecf-btn ghost" id="ecf-reset-form">↺ ' + esc(t('Làm sạch dữ liệu', 'Reset form')) + '</button><button type="button" class="ecf-btn primary" id="ecf-submit-online">✅ ' + esc(t('Gửi biểu mẫu online', 'Submit online form')) + '</button></div></div>';
}

function renderSection(schema, section){
  var ids = Array.isArray(section.field_ids) ? section.field_ids : [];
  return '<section class="ecf-section"><div class="ecf-section-head"><h4>' + esc(t(section.title_vi || section.title || section.id, section.title_en || section.title || section.id)) + '</h4>' + ((section.description || section.description_vi || section.description_en) ? '<p>' + esc(t(section.description_vi || section.description || '', section.description_en || section.description || '')) + '</p>' : '') + '</div><div class="ecf-section-body"><div class="ecf-fields">' + ids.map(function(id){ var field = (schema.fields || []).find(function(item){ return item.id === id; }); return field ? renderField(field) : ''; }).join('') + '</div></div></section>';
}

function renderField(field){
  var cls = 'ecf-field';
  if(field.width === 'full' || field.type === 'textarea' || field.type === 'multi_select') cls += ' full'; else if(field.width === 'third') cls += ' third';
  var label = t(field.label_vi || field.label || field.id, field.label_en || field.label || field.id);
  var note = field.helper_vi || field.helper || field.note_vi || field.note || '';
  var required = field.required ? '<span class="req">*</span>' : '';
  var html = '<div class="' + cls + '"><label class="ecf-label" for="ecf-field-' + esc(field.id) + '">' + esc(label) + required + '</label>';
  if(field.type === 'lookup'){
    html += '<div id="ecf-field-' + esc(field.id) + '"></div>';
  } else if(field.type === 'select'){
    html += '<select class="ecf-select" id="ecf-field-' + esc(field.id) + '"><option value="">' + esc(t('Chọn giá trị', 'Select value')) + '</option>' + (field.options || []).map(function(option){ var value = typeof option === 'string' ? option : option.value; var text = typeof option === 'string' ? option : (option.label_vi || option.label || option.value); return '<option value="' + esc(value) + '">' + esc(t(text, option.label_en || option.label || option.value || value)) + '</option>'; }).join('') + '</select>';
  } else if(field.type === 'multi_select'){
    html += '<div class="ecf-multi">' + (field.options || []).map(function(option){ var value = typeof option === 'string' ? option : option.value; var text = typeof option === 'string' ? option : (option.label_vi || option.label || option.value); return '<label class="ecf-check"><input type="checkbox" data-multi-field="' + esc(field.id) + '" value="' + esc(value) + '"><span>' + esc(t(text, option.label_en || option.label || option.value || value)) + '</span></label>'; }).join('') + '</div>';
  } else if(field.type === 'textarea'){
    html += '<textarea class="ecf-textarea" id="ecf-field-' + esc(field.id) + '" placeholder="' + esc(t(field.placeholder_vi || field.placeholder || '', field.placeholder_en || field.placeholder || '')) + '"></textarea>';
  } else {
    var type = field.type === 'date' ? 'date' : (field.type === 'number' ? 'number' : 'text');
    html += '<input class="ecf-input" id="ecf-field-' + esc(field.id) + '" type="' + type + '" placeholder="' + esc(t(field.placeholder_vi || field.placeholder || '', field.placeholder_en || field.placeholder || '')) + '">';
  }
  if(note) html += '<div class="ecf-note">' + esc(t(note, field.helper_en || field.note_en || note)) + '</div>';
  html += '</div>';
  return html;
}

function renderSignatureSection(form){
  var schema = form && form.schema ? form.schema : {};
  var blocks = Array.isArray(schema.signature_blocks) ? schema.signature_blocks : [];
  if(!blocks.length) return '';
  return '<section class="ecf-section"><div class="ecf-section-head"><h4>' + esc(t('Chữ ký điện tử & workflow duyệt', 'Electronic signatures & approval workflow')) + '</h4><p>' + esc(t('Các block ký đi theo đúng thứ tự báo cáo → xem xét → phê duyệt. Dữ liệu ký được lưu cùng payload biểu mẫu.', 'Signature blocks follow the sequence reported → reviewed → approved. Signature payload is stored with the form submission.')) + '</p></div><div class="ecf-section-body"><div class="ecf-signatures">' + blocks.map(function(block){ var signed = !!state.signatures[block.id]; var locked = !canSignBlock(form, block.id); return '<article class="ecf-sign' + (locked ? ' locked' : '') + '"><div class="ecf-sign-head"><div><div class="ecf-sign-title">' + esc(t(block.label_vi || block.label || block.id, block.label_en || block.label || block.id)) + '</div><div class="ecf-sign-sub">' + esc(t(block.help_vi || block.help || '', block.help_en || block.help || '')) + '</div></div>' + (signed && window.AllocationTracker ? window.AllocationTracker.renderStatusBadge('submitted') : '') + '</div><div class="ecf-sign-pad" id="ecf-signature-pad-' + esc(block.id) + '">' + (signed ? '' : '<div class="ecf-sign-empty">' + esc(t('Chưa có chữ ký điện tử cho bước này.', 'No electronic signature has been applied for this step yet.')) + '</div>') + '</div><div class="ecf-sign-actions"><button type="button" class="ecf-btn ' + (locked ? 'ghost' : 'secondary') + '" data-sign="' + esc(block.id) + '"' + (locked ? ' disabled' : '') + '>✒ ' + esc(signed ? t('Ký lại', 'Re-sign') : t('Thực hiện ký', 'Apply signature')) + '</button>' + (signed ? '<button type="button" class="ecf-btn ghost" data-sign-clear="' + esc(block.id) + '">🧹 ' + esc(t('Xóa chữ ký', 'Clear signature')) + '</button>' : '') + '</div></article>'; }).join('') + '</div></div></section>';
}

function canSignBlock(form, blockId){
  var flow = approvalSteps(form);
  var index = flow.findIndex(function(step){ return step.id === blockId; });
  if(index <= 0) return true;
  for(var i = 0; i < index; i += 1){
    if(!state.signatures[flow[i].id]) return false;
  }
  return true;
}

function buildLookupItems(field){
  var source = String(field.lookup_source || '').trim();
  var currentCustomer = state.fieldValues.customer_id || '';
  var currentPart = state.fieldValues.part_number || '';
  var currentSo = state.fieldValues.so_number || '';
  var currentJo = state.fieldValues.jo_number || '';
  var master = state.master || {};
  if(source === 'customers') return (master.customers || []).map(function(item){ return { value:item.customer_id, label:item.customer_id, sub:item.customer_name || '', customer_id:item.customer_id, customer_name:item.customer_name || '' }; });
  if(source === 'suppliers') return (master.suppliers || []).map(function(item){ return { value:item.supplier_id, label:item.supplier_id, sub:item.supplier_name || '', supplier_id:item.supplier_id, supplier_name:item.supplier_name || '' }; });
  if(source === 'parts') return (master.parts || []).filter(function(item){ return !currentCustomer || String(item.customer_id || '') === String(currentCustomer); }).map(function(item){ return { value:item.part_number, label:item.part_number, sub:item.part_description || '', part_number:item.part_number, part_description:item.part_description || '', customer_id:item.customer_id || '' }; });
  if(source === 'revisions') return (master.revisions || []).filter(function(item){ return !currentPart || String(item.part_number || '') === String(currentPart); }).map(function(item){ return { value:item.revision, label:item.revision, sub:(item.part_number || '') + (item.status ? (' · ' + item.status) : ''), part_number:item.part_number || '', revision:item.revision || '', revision_id:item.revision_id || '' }; });
  if(source === 'capas') return (master.capas || []).filter(function(item){ if(currentCustomer && String(item.customer_id || '') !== String(currentCustomer)) return false; if(currentPart && String(item.part_number || '') !== String(currentPart)) return false; return true; }).map(function(item){ return { value:item.capa_number, label:item.capa_number, sub:[item.title || '', item.status || ''].filter(Boolean).join(' · '), capa_number:item.capa_number, customer_id:item.customer_id || '', part_number:item.part_number || '', title:item.title || '' }; });
  if(source === 'sales_orders') return (state.orders.sales_orders || []).filter(function(item){ return !currentCustomer || String(item.customer_id || '') === String(currentCustomer); });
  if(source === 'job_orders') return (state.orders.job_orders || []).filter(function(item){ return !currentSo || String(item.so_number || '') === String(currentSo); });
  if(source === 'work_orders') return (state.orders.work_orders || []).filter(function(item){ return !currentJo || String(item.jo_number || '') === String(currentJo); });
  return [];
}

function applyAutofill(field, item){
  var map = field.autofill_map || {};
  Object.keys(map).forEach(function(target){ var sourceKey = map[target]; if(item[sourceKey] !== undefined && item[sourceKey] !== null && item[sourceKey] !== '') state.fieldValues[target] = item[sourceKey]; });
}
function bindShellEvents(){
  var formSearch = document.getElementById('ecf-form-search');
  if(formSearch) formSearch.oninput = function(){ state.formSearch = formSearch.value || ''; render(state.container); };
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-form-code]'), function(button){ button.onclick = function(){ state.selectedFormCode = button.getAttribute('data-form-code') || state.selectedFormCode; state.selectedAllocationId = ''; state.pendingRecordId = ''; state.fieldValues = {}; state.signatures = {}; state.activeDraftKey = ''; state.hasLocalDraft = false; state.loadedServerEntryKey = ''; refreshAllocations().then(function(){ return preloadSelectedOnlineEntry(); }).then(function(){ render(state.container); }); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-allocation-id]'), function(card){ card.onclick = function(){ state.selectedAllocationId = card.getAttribute('data-allocation-id') || ''; state.fieldValues = {}; state.signatures = {}; state.activeDraftKey = ''; state.hasLocalDraft = false; state.loadedServerEntryKey = ''; preloadSelectedOnlineEntry().then(function(){ render(state.container); }); }; });
  var openMaster = document.getElementById('ecf-open-master'); if(openMaster) openMaster.onclick = function(){ if(typeof window._mdOpenControl === 'function') window._mdOpenControl(); };
  var openRid = document.getElementById('ecf-open-record-id'); if(openRid) openRid.onclick = function(){ if(typeof window._fhSwitchTab === 'function') window._fhSwitchTab('record-id'); };
}

function bindOfflineWorkspace(form){
  var allocation = selectedAllocation(); if(!allocation) return;
  var copyBtn = document.getElementById('ecf-copy-issued-name');
  if(copyBtn) copyBtn.onclick = function(){ if(window.AllocationTracker) window.AllocationTracker.copyToClipboard(allocation.offline_package && allocation.offline_package.filename ? allocation.offline_package.filename : (allocation.suggested_filename || '')); toast(t('Đã sao chép tên file.', 'Filename copied.'), 'success'); };
  var openUpload = document.getElementById('ecf-open-upload');
  if(openUpload) openUpload.onclick = function(){ if(window._fhState) window._fhState.pendingUploadSelection = { allocationId: allocation.allocation_id, recordId: allocation.record_id, formCode: form.form_code }; if(typeof window._fhSwitchTab === 'function') window._fhSwitchTab('upload'); };
  var downloadBtn = document.getElementById('ecf-download-offline');
  if(downloadBtn && window.AllocationTracker) downloadBtn.onclick = function(){ downloadBtn.disabled = true; window.AllocationTracker.downloadForm(allocation.allocation_id, form.form_code, { master_context: allocation.master_context || {} }).then(function(resp){ if(resp && resp.ok){ toast(t('Đã tạo và tải gói Excel có hidden metadata.', 'Issued workbook downloaded with hidden metadata.'), 'success'); refreshAllocations().then(function(){ render(state.container); }); } else toast(t('Không thể tạo gói Excel cấp phát.', 'Could not issue the workbook package.'), 'error'); }).finally(function(){ downloadBtn.disabled = false; }); };
}

function bindOnlineForm(form){
  var allocation = selectedAllocation(); if(!allocation) return;
  hydrateFieldDefaults(form, allocation);
  mountLookupFields(form);
  bindSimpleFields(form);
  mountStoredSignatures(form);
  var draftBtn = document.getElementById('ecf-save-draft'); if(draftBtn) draftBtn.onclick = saveDraft;
  var resetBtn = document.getElementById('ecf-reset-form'); if(resetBtn) resetBtn.onclick = function(){ if(!confirm(t('Xóa dữ liệu đang nhập và chữ ký của form hiện tại?', 'Clear the current form values and signatures?'))) return; state.fieldValues = {}; state.signatures = {}; clearDraft(); render(state.container); };
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-sign]'), function(button){ button.onclick = function(){ openSignature(form, button.getAttribute('data-sign')); }; });
  Array.prototype.forEach.call(state.container.querySelectorAll('[data-sign-clear]'), function(button){ button.onclick = function(){ delete state.signatures[button.getAttribute('data-sign-clear') || '']; render(state.container); }; });
  var submitBtn = document.getElementById('ecf-submit-online'); if(submitBtn) submitBtn.onclick = function(){ submitOnline(form, allocation, submitBtn); };
}

function hydrateFieldDefaults(form, allocation){
  (form.schema && form.schema.fields ? form.schema.fields : []).forEach(function(field){
    if(state.fieldValues[field.id] !== undefined && state.fieldValues[field.id] !== null && state.fieldValues[field.id] !== '') return;
    if(field.default === 'today' && field.type === 'date'){ state.fieldValues[field.id] = new Date().toISOString().slice(0, 10); return; }
    if(field.default !== undefined && field.default !== null && field.default !== '' && field.default !== 'today'){ state.fieldValues[field.id] = field.default; return; }
    var context = allocation.master_context || {}; if(context[field.id]) state.fieldValues[field.id] = context[field.id];
  });
}

function bindSimpleFields(form){
  (form.schema && form.schema.fields ? form.schema.fields : []).forEach(function(field){
    if(field.type === 'lookup') return;
    if(field.type === 'multi_select'){
      var current = Array.isArray(state.fieldValues[field.id]) ? state.fieldValues[field.id] : [];
      Array.prototype.forEach.call(state.container.querySelectorAll('[data-multi-field="' + field.id + '"]'), function(box){ box.checked = current.indexOf(box.value) >= 0; box.onchange = function(){ state.fieldValues[field.id] = Array.prototype.filter.call(state.container.querySelectorAll('[data-multi-field="' + field.id + '"]:checked'), function(node){ return node.checked; }).map(function(node){ return node.value; }); }; });
      return;
    }
    var el = document.getElementById('ecf-field-' + field.id); if(!el) return;
    var value = state.fieldValues[field.id]; if(value === undefined || value === null) value = '';
    el.value = value; el.oninput = el.onchange = function(){ state.fieldValues[field.id] = field.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; };
  });
}

function mountLookupFields(form){
  state.lookupInstances = {};
  (form.schema && form.schema.fields ? form.schema.fields : []).filter(function(field){ return field.type === 'lookup'; }).forEach(function(field){
    var hostId = 'ecf-field-' + field.id; if(!document.getElementById(hostId)) return;
    var items = buildLookupItems(field);
    if(typeof window.SearchableInput === 'function'){
      var instance = new window.SearchableInput({ containerId: hostId, fieldId: 'ecf-si-' + field.id, name: field.id, dataSource: items, displayField: 'label', valueField: 'value', subField: 'sub', strictSelect: field.strict_select !== false, storeValueInHiddenField: true, placeholderVi: field.placeholder_vi || t('Tìm và chọn từ dữ liệu đã kiểm soát', 'Search and select from governed data'), placeholder: field.placeholder_en || 'Search and select governed data', onSelect: function(item){ state.fieldValues[field.id] = item ? item.value : ''; if(item) applyAutofill(field, item); render(state.container); } });
      state.lookupInstances[field.id] = instance; if(state.fieldValues[field.id]) instance.setValue(state.fieldValues[field.id]);
    }
  });
}

function mountStoredSignatures(form){
  if(typeof window.ESignature !== 'function') return;
  var esig = new window.ESignature({ lang:(typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'vi' });
  Object.keys(state.signatures).forEach(function(id){ var pad = document.getElementById('ecf-signature-pad-' + id); if(pad) esig.insertSignature(pad, state.signatures[id]); });
}

function openSignature(form, blockId){
  if(typeof window.ESignature !== 'function'){ toast(t('Component chữ ký điện tử chưa sẵn sàng.', 'Electronic signature component is not available.'), 'error'); return; }
  if(!canSignBlock(form, blockId)){ toast(t('Hãy hoàn tất bước ký trước đó trước khi ký bước này.', 'Complete the previous signature step first.'), 'warn'); return; }
  var block = (form.schema.signature_blocks || []).find(function(item){ return item.id === blockId; }); if(!block) return;
  var user = currentUserProfile();
  new window.ESignature({ lang:(typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'vi', requireReason:block.require_reason !== false, requirePin:block.require_pin === true }).show({ signerId:user.signerId, signerName:user.name, signerRole:user.title || user.dept, signatureMeaning:t(block.signature_meaning_vi || block.signature_meaning || '', block.signature_meaning_en || block.signature_meaning || ''), appliedTo:(selectedAllocation() ? selectedAllocation().record_id : '') + ':' + blockId, onSign:function(signatureData){ state.signatures[blockId] = signatureData; render(state.container); } });
}

function validateOnline(form){
  var missing = [];
  (form.schema && form.schema.fields ? form.schema.fields : []).forEach(function(field){ var value = state.fieldValues[field.id]; if(!field.required) return; if(field.type === 'multi_select'){ if(!Array.isArray(value) || !value.length) missing.push(t(field.label_vi || field.label || field.id, field.label_en || field.label || field.id)); return; } if(value === undefined || value === null || value === '') missing.push(t(field.label_vi || field.label || field.id, field.label_en || field.label || field.id)); });
  approvalSteps(form).forEach(function(step){
    if(step.requiredOnSubmit && !state.signatures[step.id]) missing.push(t(step.labelVi || step.id, step.labelEn || step.id));
  });
  return missing;
}

function collectPayload(form, allocation){
  var payload = {}; Object.keys(state.fieldValues).forEach(function(key){ payload[key] = state.fieldValues[key]; });
  payload.form_code = form.form_code; payload.form_version = form.version || 'V1'; payload.record_id = allocation.record_id || ''; payload.allocation_id = allocation.allocation_id || ''; payload.master_context = allocation.master_context || {}; payload.signatures = state.signatures; payload.approval_state = currentApprovalState(form); payload.runtime_mode = 'online'; payload._display = Object.keys(state.lookupInstances || {}).reduce(function(map, key){ var item = state.lookupInstances[key] && state.lookupInstances[key].getSelectedItem ? state.lookupInstances[key].getSelectedItem() : null; if(item) map[key] = { label:item.label || '', sub:item.sub || '', value:item.value || '' }; return map; }, {});
  return payload;
}

function linkOrderIfPossible(allocation){
  var ctx = allocation && allocation.master_context ? allocation.master_context : {}; var orderType = ctx.wo_number ? 'wo' : (ctx.jo_number ? 'jo' : (ctx.so_number ? 'so' : '')); var orderId = ctx.wo_number || ctx.jo_number || ctx.so_number || ''; if(!orderType || !orderId || !allocation.record_id) return; api('order_link_form', { order_type: orderType, order_id: orderId, record_id: allocation.record_id }, 'POST').catch(function(){});
}

function submitOnline(form, allocation, button){
  var missing = validateOnline(form); if(missing.length){ toast(t('Thiếu trường bắt buộc: ', 'Missing required fields: ') + missing.join(', '), 'warn'); return; }
  var payload = collectPayload(form, allocation); button.disabled = true;
  window.AllocationTracker.submitOnline(allocation.allocation_id, form.form_code, payload).then(function(resp){ if(resp && resp.ok){ clearDraft(); linkOrderIfPossible(allocation); toast(t('Đã gửi form online thành công.', 'Online form submitted successfully.'), 'success'); refreshAllocations().then(function(){ render(state.container); }); } else toast(t('Không thể gửi form online.', 'Could not submit the online form.'), 'error'); }).catch(function(){ toast(t('Không thể gửi form online.', 'Could not submit the online form.'), 'error'); }).finally(function(){ button.disabled = false; });
}

window._renderFillDownload = function(schemas, entries, container){
  normalizeForms(schemas); applyPendingSelection();
  Promise.all([ensureMaster(), ensureOrders()]).then(function(){ return refreshAllocations(); }).then(function(){ return preloadSelectedOnlineEntry(); }).then(function(){ render(container); }).catch(function(error){ container.innerHTML = '<div class="ecf-empty"><strong>' + esc(t('Không thể khởi tạo runtime Điền & Tải form', 'Could not initialize the Fill & Download runtime')) + '</strong>' + esc((error && error.message) ? error.message : t('Vui lòng kiểm tra dữ liệu nền hoặc thử lại.', 'Please review master data or try again.')) + '</div>'; });
};

})();

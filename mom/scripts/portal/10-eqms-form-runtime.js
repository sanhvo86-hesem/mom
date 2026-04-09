/* ==========================================================================
   10-eqms-form-runtime.js — eQMS Web Form Renderer
   HESEM MOM Portal — Renders forms from JSON schema inside document viewer
   ISO 9001:2015 / AS9100D / 21 CFR Part 11 aligned

   This module renders eQMS web forms the SAME WAY as SOP/WI documents:
   - Opens in document viewer with standard toolbar
   - Edit button enables field editing
   - Audit trail tracks every field change
   - E-signature integration for approval workflow
   - PDF export matches web layout
   ========================================================================== */

(function(){
'use strict';

/* ── Helpers ── */
var t = function(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; };
var esc = function(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(v==null?'':v))); return d.innerHTML; };

function api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', 30000);
  var httpMethod = method || 'GET';
  var url = 'api.php?action=' + encodeURIComponent(action);
  /* Append payload as query params for GET requests */
  if(httpMethod === 'GET' && payload){
    Object.keys(payload).forEach(function(k){
      if(payload[k] !== undefined && payload[k] !== null && payload[k] !== '')
        url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
    });
  }
  var opts = { method: httpMethod, credentials:'include', headers:{} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(httpMethod !== 'GET'){ opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(payload||{}); }
  return fetch(url, opts).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); });
}

function toast(msg, type){
  if(typeof window._ecShowToast === 'function') window._ecShowToast(msg, type);
  else if(typeof window._fhShowToast === 'function') window._fhShowToast(msg, type);
}

function currentUser(){
  var w = (typeof window !== 'undefined') ? window : {};
  var u = w.currentUser || w.__currentUser || {};
  return {
    username: String(u.username || '').trim(),
    name: String(u.display_name || u.name || u.username || '').trim(),
    role: String(u.role || '').trim(),
    roles: Array.isArray(u.roles) ? u.roles : [String(u.role || '')],
    dept: String(u.dept || '').trim()
  };
}

function fmtDate(v){
  if(!v) return '';
  try { return new Intl.DateTimeFormat((typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(v)); }
  catch(e){ return String(v); }
}

function currentUserKey(){
  var u = currentUser();
  return String(u.username || 'anon').trim().toLowerCase() || 'anon';
}

function normalizeRelPath(path){
  return String(path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
}

function eqmsCatalogForm(formCode){
  var ecState = window._ecState || {};
  var formMap = ecState.formMap || {};
  var forms = Array.isArray(ecState.forms) ? ecState.forms : [];
  var direct = formMap[formCode] || forms.find(function(item){
    return String(item && item.form_code || '').trim() === String(formCode || '').trim();
  }) || null;
  if(!direct) return null;
  var runtimeCode = String(direct.html_runtime_form_code || (direct.schema && direct.schema.html_runtime_form_code) || '').trim();
  if(runtimeCode){
    direct = formMap[runtimeCode] || forms.find(function(item){
      return String(item && item.form_code || '').trim() === runtimeCode;
    }) || direct;
  }
  var targetPath = normalizeRelPath(direct.standalone_html || (direct.schema && direct.schema.standalone_html) || '');
  if(!targetPath) return direct;
  var matches = forms.filter(function(candidate){
    return normalizeRelPath((candidate && candidate.standalone_html) || (candidate && candidate.schema && candidate.schema.standalone_html) || '') === targetPath;
  });
  if(!matches.length) return direct;
  matches.sort(function(a, b){
    function rank(form){
      var code = String(form && form.form_code || '').trim().toUpperCase();
      var score = 0;
      if(normalizeRelPath((form && form.standalone_html) || (form && form.schema && form.schema.standalone_html) || '')) score += 10;
      if(form && form.online !== false) score += 4;
      if(form && (form.linked_excel_form || form.offline_form_code || form.blank_path || form.offline_fallback_available)) score += 3;
      if(code && !/^FRM-\d+$/.test(code)) score += 2;
      if(/-[A-Z0-9]+$/.test(code)) score += 1;
      return score;
    }
    return rank(b) - rank(a) || String(a.form_code || '').localeCompare(String(b.form_code || ''));
  });
  return matches[0] || direct;
}

function docRegistry(){
  try{
    if(typeof DOCS !== 'undefined' && Array.isArray(DOCS)) return DOCS;
  }catch(_err){}
  return Array.isArray(window.DOCS) ? window.DOCS : [];
}

function findStandaloneDoc(formCode, schema){
  var docs = docRegistry();
  var targetForm = eqmsCatalogForm(formCode);
  var runtimeCode = String((targetForm && (targetForm.html_runtime_form_code || (targetForm.schema && targetForm.schema.html_runtime_form_code))) || '').trim();
  if(runtimeCode){
    for(var j = 0; j < docs.length; j++){
      var runtimeDoc = docs[j];
      if(runtimeDoc && String(runtimeDoc.code || '').trim().toUpperCase() === runtimeCode.toUpperCase()) return runtimeDoc;
    }
    targetForm = eqmsCatalogForm(runtimeCode) || targetForm;
  }
  var targetPath = normalizeRelPath((schema && schema.standalone_html) || (targetForm && targetForm.standalone_html) || '');
  if(targetPath){
    for(var i = 0; i < docs.length; i++){
      var pathDoc = docs[i];
      if(!pathDoc) continue;
      if(normalizeRelPath(pathDoc.path || '') === targetPath) return pathDoc;
    }
  }
  var targetCode = String((targetForm && targetForm.form_code) || formCode || '').trim().toUpperCase();
  for(var i = 0; i < docs.length; i++){
    var doc = docs[i];
    if(!doc) continue;
    if(String(doc.code || '').trim().toUpperCase() === targetCode) return doc;
  }
  return null;
}

function standaloneRuntimePath(formCode, schema){
  var targetPath = normalizeRelPath((schema && schema.standalone_html) || (eqmsCatalogForm(formCode) && eqmsCatalogForm(formCode).standalone_html) || '');
  if(targetPath) return targetPath;
  var linkedDoc = findStandaloneDoc(formCode, schema);
  return linkedDoc ? normalizeRelPath(linkedDoc.path || '') : '';
}

function buildStandaloneRuntimeSrc(formCode, schema, options){
  var relPath = standaloneRuntimePath(formCode, schema);
  if(!relPath) return '';
  var qs = new URLSearchParams();
  qs.set('form_code', String(formCode || ''));
  if(options && options.allocationId) qs.set('allocation_id', String(options.allocationId || ''));
  if(options && options.recordId) qs.set('record_id', String(options.recordId || ''));
  if(options && options.entryId) qs.set('entry_id', String(options.entryId || ''));
  qs.set('lang', (typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'vi');
  qs.set('_runtime_ts', String(Date.now()));
  return '../' + relPath + '?' + qs.toString();
}

function bindStandaloneRuntimeBridge(frame){
  if(!frame) return;
  if(typeof frame._eqmsBridge === 'function'){
    window.removeEventListener('message', frame._eqmsBridge);
    frame._eqmsBridge = null;
  }
  var syncHeight = function(minHeight){
    try{
      var idoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
      if(!idoc || !idoc.body) return;
      var body = idoc.body;
      var html = idoc.documentElement;
      var height = Math.max(
        Number(minHeight || 0) || 0,
        body.scrollHeight || 0,
        html ? html.scrollHeight : 0,
        body.offsetHeight || 0,
        html ? html.offsetHeight : 0,
        960
      );
      frame.style.height = height + 'px';
    }catch(_err){}
  };
  frame.onload = function(){
    setTimeout(syncHeight, 120);
    setTimeout(syncHeight, 420);
  };
  var onMessage = function(event){
    if(!frame.contentWindow || event.source !== frame.contentWindow) return;
    var data = event.data || {};
    if(!data || typeof data !== 'object') return;
    if(data.type === 'ec-form-runtime-height'){
      syncHeight(Number(data.height || 0) || 0);
      return;
    }
    if(data.type === 'ec-form-runtime-toast' && data.message){
      toast(String(data.message || ''), String(data.level || 'info'));
      return;
    }
    if(data.type === 'ec-form-runtime-refresh'){
      toast('Đã đồng bộ lại hồ sơ từ runtime HTML.', 'success');
    }
  };
  window.addEventListener('message', onMessage);
  frame._eqmsBridge = onMessage;
}

function renderStandaloneRuntime(container, schema, options){
  var src = buildStandaloneRuntimeSrc(state.formCode, schema, options || {});
  if(!src){
    container.innerHTML = '<div class="eqms-empty">Không tìm thấy biểu mẫu HTML chuẩn cho form này.</div>';
    return;
  }
  container.innerHTML =
    '<div class="eqms-runtime eqms-runtime-shell">' +
      '<div class="eqms-runtime-topbar">' +
        '<div class="eqms-runtime-topbar-copy">' +
          '<strong>' + esc((schema && (schema.title || schema.form_code)) || state.formCode || '') + '</strong>' +
          '<span>' + esc('Runtime, chỉnh mẫu và in ấn cùng dùng một HTML gốc để không bị biến dạng.') + '</span>' +
        '</div>' +
        '<div class="eqms-runtime-topbar-actions">' +
          '<button class="eqms-btn ghost" id="eqms-edit-template">' + esc('Chỉnh sửa mẫu form') + '</button>' +
          '<a class="eqms-btn secondary" href="' + esc(src) + '" target="_blank" rel="noopener">Mở tab mới</a>' +
        '</div>' +
      '</div>' +
      '<iframe class="eqms-standalone-frame" id="eqms-standalone-frame" src="' + esc(src) + '" title="' + esc(String((schema && schema.title) || state.formCode || '')) + '"></iframe>' +
    '</div>';
  var frame = document.getElementById('eqms-standalone-frame');
  bindStandaloneRuntimeBridge(frame);
  var editTemplateBtn = document.getElementById('eqms-edit-template');
  if(editTemplateBtn) editTemplateBtn.onclick = function(){
    if(typeof window._ecOpenEqmsTemplateEditor === 'function'){
      window._ecOpenEqmsTemplateEditor(state.formCode || '');
      return;
    }
    toast('Trình chỉnh sửa mẫu HTML chưa sẵn sàng.', 'warn');
  };
}

/* ── State ── */
var masterData = null;
var companyDirectory = null;
var MASTER_LOOKUP_CONFIG = {
  suppliers: { collection:'suppliers', valueKey:'supplier_id', labelKey:'supplier_name', subKeys:['supplier_id','supplier_type','status'] },
  customers: { collection:'customers', valueKey:'customer_id', labelKey:'customer_name', subKeys:['customer_id','customer_type','status'] },
  customer_sites: { collection:'customer_sites', valueKey:'site_id', labelKey:'site_name', subKeys:['customer_id','country_code','status'] },
  commercial_accounts: { collection:'commercial_accounts', valueKey:'account_id', labelKey:'account_id', subKeys:['customer_id','currency_code','status'] },
  parts: { collection:'parts', valueKey:'part_number', labelKey:'part_number', subKeys:['revision','part_description','status'] },
  revisions: { collection:'revisions', valueKey:'revision_id', labelKey:'revision_id', subKeys:['part_number','revision','status'] },
  incoterms: { collection:'incoterms', valueKey:'incoterm_code', labelKey:'incoterm_name', subKeys:['incoterm_code','status'] },
  payment_terms: { collection:'payment_terms', valueKey:'payment_term_code', labelKey:'payment_term_name', subKeys:['payment_term_code','status'] },
  shipping_methods: { collection:'shipping_methods', valueKey:'shipping_method_id', labelKey:'shipping_method_name', subKeys:['shipping_method_id','mode','status'] },
  promise_policies: { collection:'promise_policies', valueKey:'promise_policy_id', labelKey:'policy_name', subKeys:['promise_policy_id','target_otd_percent','status'] },
  routing_library: { collection:'routing_library', valueKey:'routing_id', labelKey:'routing_name', subKeys:['part_number','part_revision','status'] },
  bom_library: { collection:'bom_library', valueKey:'bom_id', labelKey:'bom_name', subKeys:['part_number','part_revision','status'] },
  control_plans: { collection:'control_plans', valueKey:'control_plan_id', labelKey:'control_plan_name', subKeys:['part_number','part_revision','status'] },
  inspection_plans: { collection:'inspection_plans', valueKey:'inspection_plan_id', labelKey:'inspection_plan_name', subKeys:['part_number','part_revision','status'] },
  traveler_templates: { collection:'traveler_templates', valueKey:'traveler_template_id', labelKey:'traveler_template_name', subKeys:['part_number','part_revision','status'] },
  quality_gate_profiles: { collection:'quality_gate_profiles', valueKey:'quality_gate_profile_id', labelKey:'profile_name', subKeys:['required_gates','status'] },
  launch_gate_templates: { collection:'launch_gate_templates', valueKey:'gate_template_id', labelKey:'gate_name', subKeys:['work_center_id','status'] },
  customer_item_approvals: { collection:'customer_item_approvals', valueKey:'approval_id', labelKey:'approval_id', subKeys:['customer_id','part_number','status'] },
  supplier_process_approvals: { collection:'supplier_process_approvals', valueKey:'approval_id', labelKey:'approval_id', subKeys:['supplier_id','special_process','status'] },
  warehouse_locations: { collection:'warehouse_locations', valueKey:'warehouse_id', labelKey:'warehouse_name', subKeys:['warehouse_id','warehouse_type','status'] },
  defect_catalog: { collection:'defect_catalog', valueKey:'defect_code', labelKey:'defect_name', subKeys:['defect_code','defect_group','severity_default','status'] },
  capas: { collection:'capas', valueKey:'capa_number', labelKey:'title', subKeys:['capa_number','customer_id','status'] },
  work_centers: { collection:'work_centers', valueKey:'work_center_id', labelKey:'work_center_name', subKeys:['work_center_id','department','status'] },
  machines: { collection:'machines', valueKey:'machine_id', labelKey:'machine_name', subKeys:['machine_id','work_center_id','status'] },
  operators: { collection:'operators', valueKey:'operator_id', labelKey:'operator_name', subKeys:['operator_id','role','status'] },
  tooling_assets: { collection:'tooling_assets', valueKey:'tool_id', labelKey:'tool_name', subKeys:['tool_id','tool_type','status'] },
  tool_assemblies: { collection:'tool_assemblies', valueKey:'assembly_id', labelKey:'assembly_id', subKeys:['parent_tool_id','component_tool_id','status'] },
  downtime_reason_codes: { collection:'downtime_reason_codes', valueKey:'reason_code', labelKey:'reason_name', subKeys:['reason_code','category','status'] },
  downtime_resolution_codes: { collection:'downtime_resolution_codes', valueKey:'resolution_code', labelKey:'resolution_name', subKeys:['resolution_code','resolution_group','status'] },
  mes_connectivity_adapters: { collection:'mes_connectivity_adapters', valueKey:'adapter_id', labelKey:'adapter_name', subKeys:['machine_id','adapter_type','status'] },
  mes_alarm_catalog: { collection:'mes_alarm_catalog', valueKey:'alarm_code', labelKey:'title', subKeys:['controller_family','severity_default','status'] },
  mes_alarm_playbooks: { collection:'mes_alarm_playbooks', valueKey:'playbook_id', labelKey:'title', subKeys:['alarm_code','response_target_minutes','status'] },
  nc_program_releases: { collection:'nc_program_releases', valueKey:'program_id', labelKey:'release_title', subKeys:['part_number','operation_number','status'] }
};
var FIELD_LOOKUP_HINTS = {
  supplier_id:'suppliers', supplier_name:'suppliers',
  customer_id:'customers', customer_site_id:'customer_sites', account_id:'commercial_accounts',
  part_number:'parts', part_id:'parts', part_revision:'revisions', revision_id:'revisions', revision:'revisions',
  incoterm_code:'incoterms', payment_term_code:'payment_terms', shipping_method_id:'shipping_methods',
  promise_policy_id:'promise_policies', routing_id:'routing_library', bom_id:'bom_library',
  control_plan_id:'control_plans', inspection_plan_id:'inspection_plans', traveler_template_id:'traveler_templates',
  quality_gate_profile_id:'quality_gate_profiles', gate_template_id:'launch_gate_templates',
  warehouse_id:'warehouse_locations', defect_type:'defect_catalog', defect_code:'defect_catalog',
  capa_number:'capas', work_center_id:'work_centers', machine_id:'machines', operator_id:'operators',
  issued_by:'company_users', approved_by:'company_users', reviewed_by:'company_users', prepared_by:'company_users',
  verified_by:'company_users', owner_user:'company_users', tool_id:'tooling_assets', assembly_id:'tool_assemblies',
  reason_code:'downtime_reason_codes', resolution_code:'downtime_resolution_codes', adapter_id:'mes_connectivity_adapters',
  alarm_code:'mes_alarm_catalog', playbook_id:'mes_alarm_playbooks', program_id:'nc_program_releases'
};

function ensureMasterData(){
  if(masterData) return Promise.resolve(masterData);
  if(typeof window._mdEnsureSnapshot === 'function'){
    return window._mdEnsureSnapshot(true).then(function(s){
      masterData = s || (typeof window._mdGetSnapshot === 'function' ? window._mdGetSnapshot() : {}) || {};
      mergeParts();
      return masterData;
    });
  }
  return api('master_data_snapshot', {}, 'GET').then(function(r){
    masterData = (r && r.data) ? r.data : {};
    mergeParts();
    return masterData;
  }).catch(function(){ masterData = {}; return masterData; });
}

function ensureCompanyDirectory(){
  if(companyDirectory) return Promise.resolve(companyDirectory);
  return api('company_directory_list', {}, 'GET').then(function(resp){
    companyDirectory = Array.isArray(resp && resp.users) ? resp.users : [];
    return companyDirectory;
  }).catch(function(){
    companyDirectory = [];
    return companyDirectory;
  });
}

/* ── Registry Options (status-options.json) ── */
var registryOptions = null;
function ensureRegistryOptions(){
  if(registryOptions) return Promise.resolve(registryOptions);
  return api('registry_status_options', {}, 'GET').then(function(resp){
    registryOptions = (resp && resp.ok && resp.data) ? resp.data : {};
    return registryOptions;
  }).catch(function(){
    /* Fallback: try direct fetch */
    return fetch('data/registry/status-options.json', { credentials:'include' })
      .then(function(r){ return r.json(); })
      .then(function(data){
        registryOptions = data || {};
        return registryOptions;
      })
      .catch(function(){
        registryOptions = {};
        return registryOptions;
      });
  });
}

function resolveRegistryOptions(source){
  if(!source || !registryOptions) return null;
  /* source format: "registry:scar_status" or "registry:severity_level" */
  var key = String(source).replace(/^registry:/, '').trim();
  if(!key) return null;
  var entry = registryOptions[key];
  if(!entry) return null;
  /* Registry status-options format: { values: [{value, label, label_vi, color}] } or array */
  var values = Array.isArray(entry) ? entry : (entry.values || entry.options || []);
  if(!Array.isArray(values) || !values.length) return null;
  return values.map(function(item){
    if(typeof item === 'string') return { value: item, label: item };
    return {
      value: item.value || item.code || '',
      label: item.label || item.label_vi || item.value || '',
      label_en: item.label_en || item.label || item.value || '',
      color: item.color || ''
    };
  });
}

function mergeParts(){
  /* Merge revisions into parts: each part gets latest revision appended */
  if(!masterData || !masterData.parts || !masterData.revisions) return;
  var revMap = {};
  (masterData.revisions || []).forEach(function(r){
    var pn = r.part_number || '';
    if(!revMap[pn] || r.status === 'released') revMap[pn] = r;
  });
  masterData.parts.forEach(function(p){
    var rev = revMap[p.part_number];
    if(rev){
      p.revision = rev.revision || '';
      p.revision_status = rev.status || '';
    }
  });
}

function buildLookupItems(source){
  if(source === 'company_users') {
    var rows = Array.isArray(companyDirectory) ? companyDirectory.slice() : [];
    var u = currentUser();
    if(u.username && !rows.some(function(person){
      return String(person.username || '').toLowerCase() === String(u.username || '').toLowerCase();
    })){
      rows.unshift({
        username: u.username,
        name: u.name || u.username,
        role: u.role || '',
        dept: u.dept || '',
        title: ''
      });
    }
    return rows.map(function(person){
      var fullName = person.name || person.display_name || person.username || '';
      return {
        value: person.username || fullName,
        label: fullName,
        sub: [
          person.username ? '@' + person.username : '',
          person.title || person.role || '',
          person.dept || ''
        ].filter(Boolean).join(' · '),
        username: person.username || '',
        person_name: fullName,
        role: person.role || '',
        dept: person.dept || '',
        title: person.title || ''
      };
    });
  }
  return mapMasterLookupItems(source);
}

function allowCurrentUserShortcut(field){
  if(!field) return false;
  return field.lookup_source === 'company_users' && field.allow_current_user !== false;
}

function resolveCurrentUserLookupItem(field){
  if(!field || !allowCurrentUserShortcut(field)) return null;
  var u = currentUser();
  if(!u.username && !u.name) return null;
  var items = buildLookupItems(field.lookup_source || '');
  var matched = items.find(function(item){
    var itemUsername = String(item.username || item.value || '').trim().toLowerCase();
    var itemName = String(item.person_name || item.label || '').trim().toLowerCase();
    var sessionUsername = String(u.username || '').trim().toLowerCase();
    var sessionName = String(u.name || '').trim().toLowerCase();
    return (itemUsername && sessionUsername && itemUsername === sessionUsername) ||
      (itemName && sessionName && itemName === sessionName) ||
      (itemUsername && sessionName && itemUsername === sessionName);
  });
  if(matched) return matched;
  return {
    value: u.username || u.name || '',
    label: u.name || u.username || '',
    sub: [
      u.username ? '@' + u.username : '',
      u.role || '',
      u.dept || ''
    ].filter(Boolean).join(' · '),
    username: u.username || '',
    person_name: u.name || u.username || '',
    role: u.role || '',
    dept: u.dept || ''
  };
}

function applyLookupSelection(field, fieldId, item, reason){
  var old = state.fieldValues[fieldId] || '';
  var newValue = item ? item.value : '';
  state.fieldValues[fieldId] = newValue;
  logFieldChange(fieldId, old, newValue, reason || '');

  if(item && field && field.autofill){
    Object.keys(field.autofill).forEach(function(target){
      var src = field.autofill[target];
      if(item[src] === undefined || item[src] === '') return;
      var oldTarget = state.fieldValues[target] || '';
      state.fieldValues[target] = item[src];
      logFieldChange(target, oldTarget, item[src], 'Autofill from ' + fieldId);
      var targetEl = document.getElementById('eqms-f-' + target);
      if(targetEl) targetEl.value = item[src];
    });
  }

  if(typeof window.SearchableInput === 'function'){
    var si = window.SearchableInput.get('eqms-si-' + fieldId);
    if(si) si.setValue(newValue);
  }
}

var state = {
  formCode: '',
  schema: null,
  entry: null,
  entryId: '',
  recordId: '',
  allocationId: '',
  editOrigin: 'new',
  sourceEntryId: '',
  sourceSubmissionRevision: 0,
  fieldValues: {},
  signatures: {},
  editMode: false,
  loading: false,
  auditLog: [],
  originalValues: {}
};

function openPrompt(options){
  if(typeof window._ecPromptDialog === 'function') return window._ecPromptDialog(options || {});
  var fallback = window.prompt((options && options.message) || '', (options && options.value) || '');
  return Promise.resolve(fallback == null ? null : String(fallback));
}

/* ── Schema Loading ── */
function loadSchema(formCode){
  /* Try all 3 methods in sequence until one succeeds */
  return api('form_fill_load_schema', { form_code: formCode }, 'GET').then(function(resp){
    if(resp && resp.ok && resp.schema) return resp.schema;
    /* apiCall returned ok:false — try direct fetch */
    throw new Error('api_returned_not_ok');
  }).catch(function(){
    /* Direct fetch with proper query params */
    return fetch('api.php?action=form_fill_load_schema&form_code=' + encodeURIComponent(formCode), { credentials:'include' })
      .then(function(r){ return r.json(); })
      .then(function(resp){
        if(resp && resp.ok && resp.schema) return resp.schema;
        throw new Error('direct_fetch_not_ok');
      });
  }).catch(function(){
    /* Last resort: fetch JSON file directly */
    return fetch('data/online-forms/schemas/' + encodeURIComponent(formCode) + '.json', { credentials:'include' })
      .then(function(r){ if(!r.ok) throw new Error('file_not_found'); return r.json(); })
      .then(function(schema){ return (schema && schema.form_code) ? schema : null; });
  }).catch(function(){ return null; });
}

function loadEntry(formCode, allocationId, entryId){
  return api('online_form_entry_get', {
    form_code: formCode,
    allocation_id: allocationId || '',
    entry_id: entryId || ''
  }, 'POST').then(function(resp){
    if(resp && resp.ok && resp.entry) return resp.entry;
    return null;
  }).catch(function(){ return null; });
}

function loadServerDraft(allocationId){
  if(!allocationId) return Promise.resolve(null);
  return api('form_fill_get_draft', { allocation_id: allocationId }, 'GET').then(function(resp){
    return (resp && resp.ok && resp.draft) ? resp.draft : null;
  }).catch(function(){ return null; });
}

/* ── Audit Trail ── */
function logFieldChange(fieldId, oldVal, newVal, reason){
  if(String(oldVal) === String(newVal)) return;
  var u = currentUser();
  state.auditLog.push({
    timestamp: new Date().toISOString(),
    user: u.username,
    userName: u.name,
    action: 'FIELD_MODIFY',
    field: fieldId,
    previous: oldVal,
    current: newVal,
    reason: reason || ''
  });
}

function saveAuditLog(){
  if(!state.auditLog.length || !state.formCode) return Promise.resolve();
  return api('eqms_audit_log', {
    form_code: state.formCode,
    entry_id: state.entryId,
    events: state.auditLog
  }, 'POST').then(function(){
    state.auditLog = [];
  }).catch(function(){});
}

/* ── Formula evaluation (for calculated fields) ── */
function evalFormula(formula, values){
  if(!formula) return '';
  try {
    var expr = String(formula).replace(/\{([^}]+)\}/g, function(_, fid){
      var v = values && values[fid];
      return (v !== undefined && v !== null && v !== '') ? (isNaN(Number(v)) ? 0 : Number(v)) : 0;
    });
    /* Allow: digits, operators, parens, spaces, dots, comparison, ternary */
    if(/[^0-9\s\+\-\*\/\.\(\)\?\:><\=\!]/.test(expr)) return formula;
    /* eslint-disable-next-line no-new-func */
    var result = Function('"use strict"; return (' + expr + ')')();
    if(result === true || result === false) return result ? 1 : 0;
    return (result !== null && result !== undefined && !isNaN(result)) ? Math.round(result * 100) / 100 : '';
  } catch(e){ return ''; }
}

/* ── Conditional field visibility ── */
function evaluateShowIf(field, values){
  if(!field || !field.show_if) return true;
  var conditions = Array.isArray(field.show_if) ? field.show_if : [field.show_if];
  return conditions.every(function(cond){
    if(!cond || !cond.field) return true;
    var val = String((values && values[cond.field]) || '').trim();
    var op = cond.op || '==';
    var expected = String(cond.value !== undefined ? cond.value : '').trim();
    switch(op){
      case '==': case '=': return val === expected;
      case '!=': case '<>': return val !== expected;
      case 'empty': return val === '';
      case 'not_empty': return val !== '';
      case 'contains': return val.indexOf(expected) >= 0;
      case 'in': return expected.split(',').map(function(s){ return s.trim(); }).indexOf(val) >= 0;
      case 'not_in': return expected.split(',').map(function(s){ return s.trim(); }).indexOf(val) < 0;
      default: return true;
    }
  });
}

function applyConditions(container, schema){
  if(!container || !schema || !Array.isArray(schema.fields)) return;
  schema.fields.forEach(function(field){
    if(!field || !field.show_if) return;
    var visible = evaluateShowIf(field, state.fieldValues);
    var el = container.querySelector('[data-field-wrapper="' + field.id + '"]');
    if(el) el.style.display = visible ? '' : 'none';
  });
}

function updateCalculatedFields(container, schema){
  if(!container || !schema || !Array.isArray(schema.fields)) return;
  schema.fields.forEach(function(field){
    if(field.type !== 'calculated') return;
    var el = document.getElementById('eqms-f-' + field.id);
    if(!el) return;
    var result = evalFormula(field.formula || '', state.fieldValues);
    el.textContent = (result !== null && result !== undefined && result !== '') ? String(result) : '—';
  });
}

/* ── Form completion progress bar ── */
function renderProgressBar(schema){
  if(!schema) return '';
  var eligible = (schema.fields || []).filter(function(f){
    return f && f.type !== 'heading' && f.type !== 'section' && f.type !== 'calculated' && f.type !== 'hidden';
  }).filter(function(f){ return evaluateShowIf(f, state.fieldValues); });
  if(!eligible.length) return '';
  var filled = eligible.filter(function(f){
    var val = state.fieldValues[f.id];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && !val.length);
  }).length;
  var pct = Math.round(100 * filled / eligible.length);
  return '<div class="eqms-progress">' +
    '<div class="eqms-progress-track"><div class="eqms-progress-bar" style="width:' + pct + '%"></div></div>' +
    '<span class="eqms-progress-label">' + esc(filled + ' / ' + eligible.length + ' ' + t('trường', 'fields') + ' (' + pct + '%)') + '</span>' +
  '</div>';
}

/* ── Auto-save timer ── */
var _autoSaveTimer = null;
function startAutoSave(){
  stopAutoSave();
  _autoSaveTimer = setInterval(function(){
    if(!state.editMode || !state.formCode) return;
    saveDraft().catch(function(){});
    var indicator = document.getElementById('eqms-autosave-indicator');
    if(indicator){
      var now = new Date();
      indicator.textContent = t('Tự động lưu ', 'Auto-saved ') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    }
  }, 90000);
}
function stopAutoSave(){
  if(_autoSaveTimer){ clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
}

/* ── Field Rendering ── */
function renderField(field, value, readOnly){
  var id = 'eqms-f-' + field.id;
  /* Form labels: English primary + Vietnamese subtitle with diacritics */
  var labelEn = field.label || field.label_en || field.id;
  var labelVi = field.label_vi || '';
  var label = esc(labelEn) + (labelVi ? '<span class="eqms-label-vi">' + esc(labelVi) + '</span>' : '');
  var required = field.required ? '<span style="color:#dc2626">*</span>' : '';
  var disabled = readOnly ? ' disabled' : '';
  var cls = 'eqms-field' + (field.width === 'full' || field.type === 'textarea' || field.type === 'table' ? ' full' : field.width === 'third' ? ' third' : '');

  /* ARIA helpers */
  var isRequired = !!(field.required);
  var ariaReq = isRequired ? ' aria-required="true"' : '';
  var helperId = (field.helper || field.helper_vi) ? 'eqms-help-' + field.id : '';
  var ariaDesc = helperId ? ' aria-describedby="' + esc(helperId) + '"' : '';

  var html = '<div class="' + cls + '" data-field-wrapper="' + esc(field.id) + '">' +
    '<label class="eqms-label" for="' + esc(id) + '">' + label + ' ' + required + '</label>';

  var val = value !== undefined && value !== null ? value : '';

  switch(field.type){
    case 'text':
    case 'email':
    case 'phone':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="' + (field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text') + '" value="' + esc(val) + '" placeholder="' + esc(t(field.placeholder || '', field.placeholder_en || '')) + '"' + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'number':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="number" value="' + esc(val) + '"' + (field.min !== undefined ? ' min="' + field.min + '"' : '') + (field.max !== undefined ? ' max="' + field.max + '"' : '') + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'date':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="date" value="' + esc(val) + '"' + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'time':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="time" value="' + esc(val) + '"' + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'datetime':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="datetime-local" value="' + esc(val) + '"' + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'select':
      /* Resolve options: prefer registry source over hardcoded */
      var selectOpts = field.options || [];
      if(field.options_source){
        var regOpts = resolveRegistryOptions(field.options_source);
        if(regOpts && regOpts.length) selectOpts = regOpts;
      }
      html += '<select class="eqms-input" id="' + esc(id) + '"' + ariaReq + ariaDesc + disabled + '><option value="">' + esc(t('Chọn', 'Select')) + '</option>';
      selectOpts.forEach(function(opt){
        var ov = typeof opt === 'string' ? opt : (opt.value || '');
        var ol = typeof opt === 'string' ? opt : t(opt.label || opt.value, opt.label_en || opt.label || opt.value);
        html += '<option value="' + esc(ov) + '"' + (String(val) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      });
      html += '</select>';
      if(field.options_source) html += '<div class="eqms-helper eqms-registry-hint">' + esc(t('Dữ liệu từ registry: ', 'Data from registry: ') + field.options_source) + '</div>';
      break;
    case 'multi_select':
      /* Resolve options: prefer registry source over hardcoded */
      var multiOpts = field.options || [];
      if(field.options_source){
        var regMultiOpts = resolveRegistryOptions(field.options_source);
        if(regMultiOpts && regMultiOpts.length) multiOpts = regMultiOpts;
      }
      html += '<div class="eqms-multi" role="group" aria-label="' + esc(labelEn) + '">';
      var selected = Array.isArray(val) ? val : [];
      multiOpts.forEach(function(opt){
        var ov = typeof opt === 'string' ? opt : (opt.value || '');
        var ol = typeof opt === 'string' ? opt : t(opt.label || opt.value, opt.label_en || opt.label || opt.value);
        html += '<label class="eqms-check"><input type="checkbox" data-multi="' + esc(field.id) + '" value="' + esc(ov) + '"' + (selected.indexOf(ov) >= 0 ? ' checked' : '') + disabled + '> ' + esc(ol) + '</label>';
      });
      html += '</div>';
      if(field.options_source) html += '<div class="eqms-helper eqms-registry-hint">' + esc(t('Dữ liệu từ registry: ', 'Data from registry: ') + field.options_source) + '</div>';
      break;
    case 'textarea':
      html += '<textarea class="eqms-input eqms-textarea" id="' + esc(id) + '" rows="4" placeholder="' + esc(t(field.placeholder || '', field.placeholder_en || '')) + '"' + ariaReq + ariaDesc + disabled + '>' + esc(val) + '</textarea>';
      break;
    case 'checkbox':
      html += '<label class="eqms-check"><input type="checkbox" id="' + esc(id) + '"' + (val ? ' checked' : '') + ariaDesc + disabled + '> ' + esc(t(field.checkbox_label || label, field.checkbox_label_en || field.label_en || label)) + '</label>';
      break;
    case 'file':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="file" accept="' + esc((field.accept || '.pdf,.jpg,.png,.xlsx').replace(/\s/g, '')) + '"' + ariaReq + ariaDesc + disabled + '>';
      break;
    case 'lookup':
      /* Lookup field — renders as searchable dropdown from master data */
      html += '<div class="eqms-lookup-shell">';
      html += '<div id="' + esc(id) + '-host" class="eqms-lookup-host" data-lookup-source="' + esc(field.lookup_source || '') + '" data-field-id="' + esc(field.id) + '"></div>';
      if(!readOnly && allowCurrentUserShortcut(field)){
        html += '<button type="button" class="eqms-lookup-self" data-use-current-user="' + esc(field.id) + '">Dùng người đăng nhập</button>';
      }
      html += '</div>';
      if(val) html += '<input type="hidden" id="' + esc(id) + '" value="' + esc(val) + '">';
      break;
    case 'table':
      var cols = field.columns || [];
      var rows = Array.isArray(val) ? (val.length ? val : [{}]) : [{}];
      html += '<div class="eqms-table-wrap"><table class="eqms-table">';
      if(cols.length){
        html += '<thead><tr>' + cols.map(function(col){
          var cl = typeof col === 'string' ? col : t(col.label || col.id || '', col.label_en || col.label || col.id || '');
          return '<th>' + esc(cl) + '</th>';
        }).join('') + (readOnly ? '' : '<th class="eqms-table-th-del"></th>') + '</tr></thead>';
      }
      html += '<tbody id="' + esc(id) + '-tbody">';
      rows.forEach(function(row, ri){
        html += '<tr data-row="' + ri + '">';
        cols.forEach(function(col){
          var colId = typeof col === 'string' ? col : (col.id || col.label || '');
          var cellVal = (row && row[colId] !== undefined) ? row[colId] : '';
          var colType = (typeof col === 'object' && col.type) ? col.type : 'text';
          if(colType === 'select'){
            /* Resolve column options: prefer registry source over hardcoded */
            var colOpts = (typeof col === 'object' && col.options) ? col.options : [];
            if(typeof col === 'object' && col.options_source){
              var regColOpts = resolveRegistryOptions(col.options_source);
              if(regColOpts && regColOpts.length) colOpts = regColOpts;
            }
            html += '<td><select class="eqms-table-cell eqms-input" data-table="' + esc(field.id) + '" data-col="' + esc(colId) + '" data-row="' + ri + '"' + disabled + '>';
            html += '<option value="">—</option>';
            colOpts.forEach(function(opt){
              var ov = typeof opt === 'string' ? opt : (opt.value || '');
              var ol = typeof opt === 'string' ? opt : t(opt.label || opt.value, opt.label_en || opt.label || opt.value);
              html += '<option value="' + esc(ov) + '"' + (String(cellVal) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>';
            });
            html += '</select></td>';
          } else {
            html += '<td><input class="eqms-table-cell eqms-input" type="' + esc(colType === 'number' ? 'number' : 'text') + '" data-table="' + esc(field.id) + '" data-col="' + esc(colId) + '" data-row="' + ri + '" value="' + esc(cellVal) + '"' + disabled + '></td>';
          }
        });
        if(!readOnly) html += '<td><button type="button" class="eqms-table-del" data-table-del="' + esc(field.id) + '" data-row="' + ri + '">×</button></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      if(!readOnly) html += '<button type="button" class="eqms-table-add" data-table-add="' + esc(field.id) + '">+ ' + esc(t('Thêm dòng', 'Add row')) + '</button>';
      html += '</div>';
      break;
    case 'calculated':
      var calcFormula = field.formula || '';
      var calcResult = evalFormula(calcFormula, state.fieldValues);
      var calcDisp = (calcResult !== null && calcResult !== undefined && calcResult !== '') ? String(calcResult) : '—';
      html += '<div class="eqms-calc" id="' + esc(id) + '" data-formula="' + esc(calcFormula) + '">' + esc(calcDisp) + '</div>';
      break;
    case 'heading':
      html += '<div class="eqms-heading">' + esc(labelEn) + '</div>';
      break;
    case 'section':
      html += '<div class="eqms-section-divider"></div>';
      break;
    default:
      html += '<input class="eqms-input" id="' + esc(id) + '" type="text" value="' + esc(val) + '"' + disabled + '>';
  }

  if(field.helper || field.helper_vi)
    html += '<div class="eqms-helper"' + (helperId ? ' id="' + esc(helperId) + '"' : '') + '>' + esc(t(field.helper_vi || field.helper || '', field.helper_en || field.helper || '')) + '</div>';

  html += '</div>';
  return html;
}

/* ── Signature Block (unified) ── */
function renderSignatureBlock(block, signatureData, canSign, showCurrentUser){
  if(showCurrentUser === undefined) showCurrentUser = true;
  var signed = !!signatureData;
  var meaning = block.meaning || 'Approved';
  var labelEn = block.label_en || block.label || block.id;
  var labelVi = block.label || '';
  var signer = currentUser();
  var currentSigner = [signer.name || signer.username || '', signer.role || signer.dept || ''].filter(Boolean).join(' · ');
  var signBtnHtml = '';
  if(canSign && !signed){
    if(showCurrentUser){
      signBtnHtml = '<div class="eqms-sig-current-user">' + esc(t('Người đăng nhập hiện tại: ', 'Current user: ')) + '<strong>' + esc(currentSigner || '—') + '</strong></div>' +
        '<button class="eqms-btn primary" data-sign-block="' + esc(block.id) + '">' + esc(t('Người đăng nhập ký', 'Sign as current user')) + '</button>';
    } else {
      signBtnHtml = '<button class="eqms-btn primary" data-sign-block="' + esc(block.id) + '">' + esc(t('Ký', 'Sign')) + '</button>';
    }
  }
  return '<div class="eqms-sig-block' + (signed ? ' signed' : '') + '" role="group" aria-label="' + esc(labelEn) + '">' +
    '<div class="eqms-sig-header">' +
      '<div><strong>' + esc(labelEn) + '</strong>' +
        (labelVi && labelVi !== labelEn ? '<div class="eqms-sig-label-vi">' + esc(labelVi) + '</div>' : '') +
      '</div>' +
      '<span class="eqms-sig-meaning">' + esc(meaning) + '</span>' +
    '</div>' +
    (signed ? '<div class="eqms-sig-data">' +
      '<div>' + esc(t('Họ tên: ', 'Name: ')) + '<strong>' + esc(signatureData.printed_name || signatureData.signerName || '') + '</strong></div>' +
      '<div>' + esc(t('Ngày ký: ', 'Signed: ')) + esc(fmtDate(signatureData.timestamp || signatureData.signed_at || '')) + '</div>' +
      '<div>' + esc(t('Ý nghĩa: ', 'Meaning: ')) + esc(signatureData.meaning || meaning) + '</div>' +
    '</div>' : '<div class="eqms-sig-empty">' + esc(t('Chưa ký', 'Not signed')) + '</div>') +
    signBtnHtml +
  '</div>';
}
/* Legacy alias for backward compat */
function renderSignatureBlockLegacy(block, signatureData, canSign){ return renderSignatureBlock(block, signatureData, canSign, false); }
function renderSignatureBlockUi(block, signatureData, canSign){ return renderSignatureBlock(block, signatureData, canSign, true); }

/* ── Main Render ── */
function renderForm(container){
  var schema = state.schema;
  if(!schema){
    container.innerHTML = '<div class="eqms-empty">' + esc(t('Không có schema', 'No schema available')) + '</div>';
    return;
  }

  var readOnly = !state.editMode;
  var fields = schema.fields || [];
  var sections = schema.sections || [{ id: 'main', title: t('Thông tin', 'Information'), field_ids: fields.map(function(f){ return f.id; }) }];
  var sigBlocks = schema.signature_blocks || [];
  var u = currentUser();

  var html = '';

  /* ── Form header — 100% identical to SOP .form-header ── */
  var ownerHtml = esc(schema.owner || '');
  var approverHtml = esc(schema.approver || '');
  html += '<div class="form-header">' +
    '<div class="fh-left"><a class="brand-logo" href="portal.html"><img alt="HESEM Logo" src="../../assets/hesem-logo.svg" onerror="this.src=\'assets/hesem-logo.svg\'"/></a></div>' +
    '<div class="title">' +
      '<strong class="doc-name">' + esc(schema.title || schema.form_code) + '</strong>' +
      '<span class="sub-vn">' + esc(schema.description_vi || schema.title_vi || '') + '</span>' +
    '</div>' +
    '<div class="meta">' +
      '<div class="row"><span><b>Mã:</b></span><span class="doc-code">' + esc(schema.form_code || '') + '</span></div>' +
      '<div class="row"><span><b>Phiên bản:</b></span><span>' + esc(schema.version || 'V1') + '</span></div>' +
      '<div class="row"><span><b>Ngày hiệu lực:</b></span><span>' + esc(schema.effective_date || 'Theo quyết định ban hành') + '</span></div>' +
      '<div class="row"><span><b>Chủ sở hữu:</b></span><span>' + ownerHtml + '</span></div>' +
      '<div class="row"><span><b>Phê duyệt:</b></span><span>' + approverHtml + '</span></div>' +
    '</div>' +
  '</div>';

  /* ── Record context ── */
  if(state.recordId || state.allocationId){
    html += '<div class="eqms-record-bar">';
    if(state.recordId) html += '<div class="eqms-record-chip"><small>' + esc(t('Mã hồ sơ', 'Record ID')) + '</small><strong>' + esc(state.recordId) + '</strong></div>';
    var ctx = state.entry && state.entry.master_context ? state.entry.master_context : {};
    if(ctx.customer_id) html += '<div class="eqms-record-chip"><small>' + esc(t('Khách hàng', 'Customer')) + '</small><strong>' + esc(ctx.customer_id) + '</strong></div>';
    if(ctx.so_number) html += '<div class="eqms-record-chip"><small>SO</small><strong>' + esc(ctx.so_number) + '</strong></div>';
    if(ctx.part_number) html += '<div class="eqms-record-chip"><small>Part</small><strong>' + esc(ctx.part_number) + '</strong></div>';
    html += '</div>';
  }

  /* ── Status bar + progress ── */
  if(state.editMode){
    html += '<div class="eqms-status-bar editing">' +
      '<span class="eqms-status-indicator"></span>' +
      '<span>' + esc(t('Đang chỉnh sửa — mọi thay đổi được ghi nhật ký', 'Editing — all changes are audit-logged')) + '</span>' +
      '<span class="eqms-autosave-indicator" id="eqms-autosave-indicator"></span>' +
    '</div>' +
    renderProgressBar(schema);
  }

  /* ── Form sections ── */
  sections.forEach(function(section, sIdx){
    var sectionFields = (section.field_ids || []).map(function(fid){
      return fields.find(function(f){ return f.id === fid; });
    }).filter(Boolean);

    var secColor = section.color || '';
    html += '<div class="eqms-section"' + (secColor ? ' style="border-left:3px solid ' + esc(secColor) + '"' : '') + '>' +
      '<div class="eqms-section-head">' +
        '<div class="eqms-section-num"' + (secColor ? ' style="background:' + esc(secColor) + '"' : '') + '>' + (sIdx + 1) + '</div>' +
        '<div>' +
          '<div class="eqms-section-title">' + esc(section.title_en || section.title || '') + '</div>' +
          (section.description || section.description_en ? '<div class="eqms-section-desc">' + esc(section.description_en || section.description || '') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="eqms-fields">';

    sectionFields.forEach(function(field){
      html += renderField(field, state.fieldValues[field.id], readOnly);
    });

    html += '</div></div>';
  });

  /* ── Signature blocks ── */
  if(sigBlocks.length){
    html += '<div class="eqms-section">' +
      '<div class="eqms-section-head">' +
        '<div class="eqms-section-num">S</div>' +
        '<div><div class="eqms-section-title">Electronic Signatures</div><div class="eqms-section-desc">Khối chữ ký kích hoạt theo workflow và ghi vết điện tử cho từng vai trò.</div></div>' +
      '</div>' +
      '<div class="eqms-sig-grid">';
    sigBlocks.forEach(function(block){
      var canSign = !readOnly && block.roles && block.roles.some(function(r){ return u.roles.indexOf(r) >= 0 || r === 'fill'; });
      html += renderSignatureBlockUi(block, state.signatures[block.id], canSign);
    });
    html += '</div></div>';
  }

  /* ── Action bar ── */
  if(state.editMode){
    if(!state.allocationId && !state.entry){
      html += '<div class="eqms-inline-alert">' + esc(t('Biểu mẫu này chưa có mã hồ sơ. Hãy cấp mã trước khi lưu nháp hoặc gửi chính thức.', 'This form does not have a record code yet. Issue a code before saving or submitting.')) + '</div>' +
        '<div class="eqms-actions">' +
          '<button class="eqms-btn primary" id="eqms-issue-code">' + esc(t('Cấp mã hồ sơ để bắt đầu', 'Issue record code to start')) + '</button>' +
        '</div>';
    } else {
      html += '<div class="eqms-actions">' +
        '<button class="eqms-btn ghost" id="eqms-cancel-create">' + esc(t('Hủy tạo form', 'Cancel form creation')) + '</button>' +
        '<button class="eqms-btn secondary" id="eqms-save-draft">' + esc(t('Lưu nháp', 'Save draft')) + '</button>' +
        '<button class="eqms-btn primary" id="eqms-submit">' + esc(t('Gửi biểu mẫu', 'Submit form')) + '</button>' +
      '</div>';
    }
  } else if(state.entry || state.allocationId){
    html += '<div class="eqms-actions">' +
      '<button class="eqms-btn ghost" id="eqms-edit-template">' + esc(t('Chỉnh sửa mẫu form', 'Edit form template')) + '</button>' +
      '<button class="eqms-btn secondary" id="eqms-enter-edit">' + esc(t('Chỉnh sửa có kiểm soát', 'Controlled edit')) + '</button>' +
    '</div>';
  }

  /* ── Audit trail summary ── */
  if(state.entry && state.entry.history && state.entry.history.length){
    html += '<div class="eqms-audit-section">' +
      '<div class="eqms-section-head">' +
        '<div class="eqms-section-num">A</div>' +
        '<div><div class="eqms-section-title">' + esc(t('Nhat ky thay doi', 'Audit trail')) + '</div></div>' +
      '</div>' +
      '<div class="eqms-audit-list">';
    state.entry.history.slice(-20).reverse().forEach(function(evt){
      html += '<div class="eqms-audit-item">' +
        '<span class="eqms-audit-time">' + esc(fmtDate(evt.timestamp || evt.at || '')) + '</span>' +
        '<span class="eqms-audit-user">' + esc(evt.user || evt.by || '') + '</span>' +
        '<span class="eqms-audit-action">' + esc(evt.action || evt.event || '') + '</span>' +
        (evt.field ? '<span class="eqms-audit-detail">' + esc(evt.field) + ': ' + esc(evt.previous || '') + ' -> ' + esc(evt.current || '') + '</span>' : '') +
      '</div>';
    });
    html += '</div></div>';
  }

  container.innerHTML = html;
  bindFields(container);
  applyConditions(container, schema);
  if(state.editMode) startAutoSave();
  else stopAutoSave();
}

/* ── Field Binding ── */
function bindFields(container){
  var schema = state.schema;
  if(!schema || !state.editMode) return;
  var fields = schema.fields || [];

  var issueBtn = document.getElementById('eqms-issue-code');
  if(issueBtn){
    issueBtn.onclick = function(){
      if(!window.AllocationTracker){
        toast(t('Dịch vụ cấp mã chưa sẵn sàng.', 'Allocation service is not ready.'), 'error');
        return;
      }
      var recordType = String(schema.record_type || '').trim().toUpperCase();
      var dept = String((schema.owner || 'QA').split('/')[0] || 'QA').trim().toUpperCase();
      if(!recordType){
        toast(t('Schema chưa cấu hình record type.', 'The schema record type is not configured.'), 'error');
        return;
      }
      issueBtn.disabled = true;
      window.AllocationTracker.allocate(recordType, dept, {
        year: new Date().getFullYear(),
        form_code: state.formCode,
        notes: 'eqms_runtime_issue_code'
      }).then(function(resp){
        if(!(resp && resp.ok)){
          throw new Error('allocation_failed');
        }
        state.allocationId = resp.allocation_id || '';
        state.recordId = resp.record_id || '';
        state.editOrigin = 'new';
        toast(t('Đã cấp mã hồ sơ: ', 'Issued record code: ') + (state.recordId || ''), 'success');
        renderForm(container);
      }).catch(function(){
        toast(t('Không thể cấp mã hồ sơ cho biểu mẫu này.', 'Could not issue a record code for this form.'), 'error');
      }).finally(function(){
        issueBtn.disabled = false;
      });
    };
  }

  /* Mount lookup fields from master data */
  Array.prototype.forEach.call(container.querySelectorAll('.eqms-lookup-host'), function(host){
    var source = host.getAttribute('data-lookup-source') || '';
    var fieldId = host.getAttribute('data-field-id') || '';
    var field = fields.find(function(f){ return f.id === fieldId; });
    if(!source || !fieldId || typeof window.SearchableInput !== 'function') return;
    var items = buildLookupItems(source);
    var instance = new window.SearchableInput({
      containerId: host.id,
      fieldId: 'eqms-si-' + fieldId,
      name: fieldId,
      dataSource: items,
      displayField: 'label',
      valueField: 'value',
      subField: 'sub',
      strictSelect: true,
      storeValueInHiddenField: true,
      placeholderVi: (field && field.placeholder) || 'Tìm và chọn',
      placeholder: (field && field.placeholder_en) || 'Search and select',
      onSelect: function(item){
        applyLookupSelection(field, fieldId, item, 'Manual lookup selection');
      }
    });
    if(state.fieldValues[fieldId]) instance.setValue(state.fieldValues[fieldId]);
  });

  Array.prototype.forEach.call(container.querySelectorAll('[data-use-current-user]'), function(btn){
    btn.onclick = function(){
      var fieldId = btn.getAttribute('data-use-current-user') || '';
      var field = fields.find(function(f){ return f.id === fieldId; });
      var item = resolveCurrentUserLookupItem(field);
      if(!field || !item){
        toast('Không tìm thấy người đăng nhập trong danh sách công ty.', 'warn');
        return;
      }
      applyLookupSelection(field, fieldId, item, 'Selected logged-in user');
      toast('Đã áp dụng người đăng nhập cho trường này.', 'success');
    };
  });

  fields.forEach(function(field){
    if(field.type === 'multi_select'){
      Array.prototype.forEach.call(container.querySelectorAll('[data-multi="' + field.id + '"]'), function(cb){
        cb.onchange = function(){
          var vals = [];
          Array.prototype.forEach.call(container.querySelectorAll('[data-multi="' + field.id + '"]:checked'), function(c){ vals.push(c.value); });
          var old = state.fieldValues[field.id] || [];
          state.fieldValues[field.id] = vals;
          logFieldChange(field.id, JSON.stringify(old), JSON.stringify(vals));
          applyConditions(container, schema);
          updateCalculatedFields(container, schema);
        };
      });
      return;
    }

    var el = document.getElementById('eqms-f-' + field.id);
    if(!el) return;

    if(field.type === 'checkbox'){
      el.onchange = function(){
        var old = state.fieldValues[field.id];
        state.fieldValues[field.id] = el.checked;
        logFieldChange(field.id, old, el.checked);
        applyConditions(container, schema);
        updateCalculatedFields(container, schema);
        /* Update progress bar */
        var progress = container.querySelector('.eqms-progress');
        if(progress) progress.outerHTML = renderProgressBar(schema);
      };
      return;
    }

    el.oninput = el.onchange = function(){
      var old = state.fieldValues[field.id] || '';
      var newVal = field.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      state.fieldValues[field.id] = newVal;
      logFieldChange(field.id, old, newVal);
      /* Clear error styling on change */
      var wrap = el.closest('[data-field-wrapper]');
      if(wrap){
        wrap.classList.remove('eqms-field-error');
        var em = wrap.querySelector('.eqms-error-msg');
        if(em && em.parentNode) em.parentNode.removeChild(em);
        el.removeAttribute('aria-invalid');
      }
      /* Update conditional visibility and calculated fields */
      applyConditions(container, schema);
      updateCalculatedFields(container, schema);
      /* Update progress bar */
      var progress = container.querySelector('.eqms-progress');
      if(progress) progress.outerHTML = renderProgressBar(schema);
    };
  });

  /* ── Table field binding ── */
  Array.prototype.forEach.call(container.querySelectorAll('[data-table-add]'), function(addBtn){
    addBtn.onclick = function(){
      var fid = addBtn.getAttribute('data-table-add') || '';
      var field = fields.find(function(f){ return f.id === fid; });
      if(!field) return;
      var cols = field.columns || [];
      if(!Array.isArray(state.fieldValues[fid])) state.fieldValues[fid] = [];
      var newRow = {};
      cols.forEach(function(col){ var cid = typeof col === 'string' ? col : (col.id || col.label || ''); newRow[cid] = ''; });
      state.fieldValues[fid].push(newRow);
      logFieldChange(fid, '', '[row added]');
      renderForm(container);
    };
  });

  Array.prototype.forEach.call(container.querySelectorAll('[data-table-del]'), function(delBtn){
    delBtn.onclick = function(){
      var fid = delBtn.getAttribute('data-table-del') || '';
      var rowIndex = parseInt(delBtn.getAttribute('data-row') || '0', 10);
      var field = fields.find(function(f){ return f.id === fid; });
      if(!field) return;
      if(Array.isArray(state.fieldValues[fid])) state.fieldValues[fid].splice(rowIndex, 1);
      if(!state.fieldValues[fid] || !state.fieldValues[fid].length) state.fieldValues[fid] = [{}];
      logFieldChange(fid, '', '[row deleted]');
      renderForm(container);
    };
  });

  Array.prototype.forEach.call(container.querySelectorAll('.eqms-table-cell'), function(cell){
    cell.oninput = cell.onchange = function(){
      var fid = cell.getAttribute('data-table') || '';
      var colKey = cell.getAttribute('data-col') || '';
      var rowIndex = parseInt(cell.getAttribute('data-row') || '0', 10);
      if(!Array.isArray(state.fieldValues[fid])) state.fieldValues[fid] = [];
      while(state.fieldValues[fid].length <= rowIndex) state.fieldValues[fid].push({});
      state.fieldValues[fid][rowIndex][colKey] = cell.value;
      logFieldChange(fid + '[' + rowIndex + '].' + colKey, '', cell.value);
    };
  });

  var cancelBtn = document.getElementById('eqms-cancel-create');
  if(cancelBtn) cancelBtn.onclick = function(){
    cancelBtn.disabled = true;
    cancelFormCreation().finally(function(){ cancelBtn.disabled = false; });
  };

  /* Save draft */
  var saveBtn = document.getElementById('eqms-save-draft');
  if(saveBtn) saveBtn.onclick = function(){
    saveBtn.disabled = true;
    saveDraft().then(function(){
      toast(t('Đã lưu nháp.', 'Draft saved.'), 'success');
    }).catch(function(){
      toast(t('Không thể lưu nháp.', 'Could not save draft.'), 'error');
    }).finally(function(){ saveBtn.disabled = false; });
  };

  /* Submit */
  var submitBtn = document.getElementById('eqms-submit');
  if(submitBtn) submitBtn.onclick = function(){
    var missing = validateRequired();
    if(missing.length){
      /* Clear previous error marks */
      Array.prototype.forEach.call(container.querySelectorAll('.eqms-field-error'), function(el){
        el.classList.remove('eqms-field-error');
        var em = el.querySelector('.eqms-error-msg');
        if(em && em.parentNode) em.parentNode.removeChild(em);
        var inv = el.querySelector('[aria-invalid]');
        if(inv) inv.removeAttribute('aria-invalid');
      });
      /* Mark each invalid field */
      missing.forEach(function(m){
        var wrap = container.querySelector('[data-field-wrapper="' + m.id + '"]');
        if(wrap){
          wrap.classList.add('eqms-field-error');
          var inp = wrap.querySelector('.eqms-input, select, textarea, input');
          if(inp) inp.setAttribute('aria-invalid', 'true');
          var errMsg = document.createElement('div');
          errMsg.className = 'eqms-error-msg';
          errMsg.textContent = t('Trường bắt buộc', 'Required field');
          wrap.appendChild(errMsg);
        }
      });
      toast(t('Thiếu trường bắt buộc: ', 'Missing required fields: ') + missing.map(function(m){ return m.label; }).join(', '), 'warn');
      var firstErr = container.querySelector('.eqms-field-error');
      if(firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    /* Cross-field validation */
    var crossErrors = validateCrossRules();
    if(crossErrors.length){
      crossErrors.forEach(function(err){
        (err.fields || []).forEach(function(fid){
          var wrap = container.querySelector('[data-field-wrapper="' + fid + '"]');
          if(wrap){
            wrap.classList.add('eqms-field-error');
            var errMsg = document.createElement('div');
            errMsg.className = 'eqms-error-msg';
            errMsg.textContent = err.message;
            wrap.appendChild(errMsg);
          }
        });
      });
      toast(crossErrors.map(function(e){ return e.message; }).join(' | '), 'warn');
      var firstCrossErr = container.querySelector('.eqms-field-error');
      if(firstCrossErr) firstCrossErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    submitBtn.disabled = true;
    submitForm().then(function(resp){
      if(resp && resp.ok){
        clearLocalDraft();
        toast(t('Đã gửi biểu mẫu thành công.', 'Form submitted successfully.'), 'success');
        state.editMode = false;
        state.editOrigin = 'controlled_edit';
        loadEntry(state.formCode, state.allocationId, state.entryId).then(function(entry){
          if(entry){
            state.entry = entry;
            state.entryId = entry.entry_id || state.entryId;
          } else if(state.entry){
            state.entry.workflow_state = 'submitted';
          }
          renderForm(submitBtn.closest('.eqms-runtime') || document.getElementById('eqms-form-container'));
        }).catch(function(){
          if(state.entry) state.entry.workflow_state = 'submitted';
          renderForm(submitBtn.closest('.eqms-runtime') || document.getElementById('eqms-form-container'));
        });
      } else {
        toast(t('Không thể gửi: ', 'Could not submit: ') + (resp && resp.error || ''), 'error');
      }
    }).catch(function(){
      toast(t('Lỗi kết nối.', 'Connection error.'), 'error');
    }).finally(function(){ submitBtn.disabled = false; });
  };

  var editBtn = document.getElementById('eqms-enter-edit');
  if(editBtn) editBtn.onclick = function(){
    state.editMode = true;
    state.editOrigin = 'controlled_edit';
    state.originalValues = JSON.parse(JSON.stringify(state.fieldValues || {}));
    renderForm(container);
  };

  var editTemplateBtn = document.getElementById('eqms-edit-template');
  if(editTemplateBtn) editTemplateBtn.onclick = function(){
    if(typeof window._ecOpenEqmsTemplateEditor === 'function'){
      window._ecOpenEqmsTemplateEditor(state.formCode || '');
      return;
    }
    toast('Trình chỉnh sửa mẫu form chưa sẵn sàng.', 'warn');
  };

  /* Signature blocks */
  Array.prototype.forEach.call(container.querySelectorAll('[data-sign-block]'), function(btn){
    btn.onclick = function(){
      var blockId = btn.getAttribute('data-sign-block');
      openSignatureDialog(blockId);
    };
  });
}

/* ── Cross-field validation ── */
function validateCrossRules(){
  var schema = state.schema;
  if(!schema || !Array.isArray(schema.cross_validation)) return [];
  var errors = [];
  schema.cross_validation.forEach(function(rule){
    if(!rule || !rule.rule) return;
    try {
      var expr = String(rule.rule).replace(/([a-z_][a-z0-9_]*)/gi, function(match){
        var v = state.fieldValues[match];
        if(v === undefined || v === null || v === '') return '0';
        if(!isNaN(Number(v))) return String(Number(v));
        return '"' + String(v).replace(/"/g, '\\"') + '"';
      });
      /* eslint-disable-next-line no-new-func */
      var pass = Function('"use strict"; return (' + expr + ')')();
      if(!pass){
        errors.push({
          fields: rule.fields || [],
          message: t(rule.message || '', rule.message_en || '')
        });
      }
    } catch(e){ /* skip invalid rules */ }
  });
  return errors;
}

/* ── Validation ── */
function validateRequired(){
  var schema = state.schema;
  if(!schema) return [];
  var missing = [];
  (schema.fields || []).forEach(function(field){
    if(!field || !field.required) return;
    if(!evaluateShowIf(field, state.fieldValues)) return;
    var val = state.fieldValues[field.id];
    if(val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)){
      missing.push({ id: field.id, label: t(field.label || field.id, field.label_en || field.label || field.id) });
    }
  });
  return missing;
}

/* ── Save/Submit ── */
function draftStorageKey(){
  return 'eqms_draft_' + (state.formCode || 'unknown') + '_' + (state.allocationId || 'noalloc') + '_' + currentUserKey();
}

function legacyDraftStorageKey(){
  var u = currentUser();
  return 'eqms_draft_' + (state.formCode || 'unknown') + '_' + (state.allocationId || u.username || 'anon');
}

function saveDraft(){
  saveAuditLog();
  /* Always save to localStorage first (works without allocation) */
  var draftData = {
    formCode: state.formCode,
    allocationId: state.allocationId,
    recordId: state.recordId,
    entryId: state.entryId,
    editOrigin: state.editOrigin || 'draft',
    sourceEntryId: state.sourceEntryId || '',
    sourceSubmissionRevision: state.sourceSubmissionRevision || 0,
    fieldValues: state.fieldValues,
    signatures: state.signatures,
    savedAt: new Date().toISOString(),
    savedBy: currentUser().username
  };
  try { localStorage.setItem(draftStorageKey(), JSON.stringify(draftData)); } catch(e){}

  /* Also save to server if allocation exists */
  if(state.allocationId){
    return api('form_fill_save_draft', {
      form_code: state.formCode,
      allocation_id: state.allocationId,
      entry_id: state.entryId,
      record_id: state.recordId,
      edit_origin: state.editOrigin || 'draft',
      source_entry_id: state.sourceEntryId || '',
      source_submission_revision: state.sourceSubmissionRevision || 0,
      data: { fieldValues: state.fieldValues, signatures: state.signatures }
    }, 'POST').catch(function(){
      /* Server save failed — localStorage draft is the backup */
      return { ok: true, source: 'local_only' };
    });
  }
  return Promise.resolve({ ok: true, source: 'local_only' });
}

function loadLocalDraft(){
  try {
    var raw = localStorage.getItem(draftStorageKey()) || localStorage.getItem(legacyDraftStorageKey());
    if(!raw) return null;
    var draft = JSON.parse(raw);
    var owner = String(draft && draft.savedBy || '').trim().toLowerCase();
    if(owner && owner !== currentUserKey()) return null;
    return draft;
  } catch(e){ return null; }
}

function clearLocalDraft(){
  try {
    localStorage.removeItem(draftStorageKey());
    localStorage.removeItem(legacyDraftStorageKey());
  } catch(e){}
}

function discardServerDraft(){
  if(!state.allocationId) return Promise.resolve({ ok:true, source:'local_only' });
  return api('form_fill_discard_draft', {
    allocation_id: state.allocationId,
    entry_id: state.entryId,
    form_code: state.formCode
  }, 'POST').then(function(resp){
    if(resp && resp.ok === false) throw new Error(resp.error || 'discard_failed');
    return resp || { ok:true };
  }).catch(function(){
    return { ok:false, source:'server_unavailable' };
  });
}

function joinLookupSubparts(parts){
  return parts.filter(function(part){
    return part !== undefined && part !== null && String(part).trim() !== '';
  }).map(function(part){
    return String(part).trim();
  }).join(' · ');
}

function mapMasterLookupItems(source){
  var cfg = MASTER_LOOKUP_CONFIG[source];
  if(!cfg) return [];
  var rows = Array.isArray((masterData || {})[cfg.collection]) ? (masterData || {})[cfg.collection] : [];
  return rows.map(function(row){
    var item = { value: row[cfg.valueKey] || '', label: row[cfg.labelKey] || row[cfg.valueKey] || '', sub: '' };
    Object.keys(row || {}).forEach(function(key){ item[key] = row[key]; });
    item.sub = joinLookupSubparts((cfg.subKeys || []).map(function(key){ return row[key]; }));
    if(source === 'parts'){
      item.value = row.part_number || '';
      item.label = joinLookupSubparts([row.part_number || '', row.revision || '']);
      item.sub = joinLookupSubparts([row.part_description || '', row.status || '']);
    }
    return item;
  });
}

function inferLookupSource(field){
  if(!field || typeof field !== 'object') return '';
  if(field.lookup_source) return String(field.lookup_source).trim();
  var direct = FIELD_LOOKUP_HINTS[field.id];
  if(direct) return direct;
  var key = String(field.id || '').trim().toLowerCase();
  var label = String(field.label || field.label_en || '').trim().toLowerCase();
  if(/supplier/.test(key) || /supplier/.test(label)) return 'suppliers';
  if(/customer/.test(key) || /customer/.test(label)) return 'customers';
  if(/part/.test(key) || /part/.test(label)) return 'parts';
  if(/revision/.test(key) || /revision/.test(label)) return 'revisions';
  if(/machine/.test(key) || /machine/.test(label)) return 'machines';
  if(/work_center|workcenter/.test(key) || /work center/.test(label)) return 'work_centers';
  if(/operator/.test(key) || /operator/.test(label)) return 'operators';
  if(/capa/.test(key) || /capa/.test(label)) return 'capas';
  if(/warehouse/.test(key) || /warehouse/.test(label)) return 'warehouse_locations';
  if(/incoterm/.test(key) || /incoterm/.test(label)) return 'incoterms';
  if(/payment_term|payment/.test(key) || /payment term/.test(label)) return 'payment_terms';
  if(/shipping/.test(key) || /shipping/.test(label)) return 'shipping_methods';
  if(/defect/.test(key) || /defect/.test(label)) return 'defect_catalog';
  if(/issued_by|approved_by|reviewed_by|prepared_by|verified_by|owner_user/.test(key)) return 'company_users';
  return '';
}

function normalizeSchemaLookups(schema){
  if(!schema || !Array.isArray(schema.fields)) return schema;
  schema.fields = schema.fields.map(function(field){
    if(!field || typeof field !== 'object') return field;
    var nextField = Object.assign({}, field);
    var source = inferLookupSource(nextField);
    if(source){
      nextField.lookup_source = source;
      if(nextField.type === 'text' || nextField.type === 'email' || nextField.type === 'tel' || !nextField.type){
        nextField.type = 'lookup';
      }
      if(source === 'company_users' && nextField.allow_current_user === undefined){
        nextField.allow_current_user = true;
      }
    }
    return nextField;
  });
  return schema;
}

function cancelFormCreation(){
  var workflowState = String((state.entry && state.entry.workflow_state) || '').trim().toLowerCase();
  if(state.editOrigin === 'controlled_edit' || ['submitted','approved','closed','received'].indexOf(workflowState) >= 0){
    toast('Hồ sơ này đã vào luồng kiểm soát chính thức. Muốn sửa tiếp phải dùng chỉnh sửa có kiểm soát, không được hủy tạo.', 'warn');
    return Promise.resolve(false);
  }
  return openPrompt({
    title: 'Hủy tạo form',
    message: 'Nhập lý do hủy tạo form. Mã đã cấp sẽ được giữ trong sổ quản lý và chuyển sang trạng thái hủy.',
    multiline: true,
    required: true,
    confirmLabel: 'Xác nhận hủy',
    cancelLabel: 'Quay lại'
  }).then(function(reason){
    if(reason == null) return false;
    var tasks = [discardServerDraft()];
    if(state.allocationId){
      tasks.push(api('record_id_void', {
        allocation_id: state.allocationId,
        reason: reason
      }, 'POST').then(function(resp){
        if(resp && resp.ok === false) throw new Error(resp.error || 'void_failed');
        return resp;
      }));
    }
    return Promise.all(tasks).then(function(){
      clearLocalDraft();
      toast('Đã hủy tạo form và giữ lại lịch sử cấp mã.', 'success');
      if(typeof window._ecOpenEqmsHub === 'function') window._ecOpenEqmsHub();
      return true;
    }).catch(function(err){
      toast('Không thể hủy tạo form: ' + String((err && err.message) || ''), 'error');
      return false;
    });
  });
}

function listUserDrafts(){
  var drafts = [];
  var owner = currentUserKey();
  try {
    for(var i = 0; i < localStorage.length; i++){
      var key = localStorage.key(i);
      if(!key || key.indexOf('eqms_draft_') !== 0) continue;
      var raw = localStorage.getItem(key);
      if(!raw) continue;
      var d = JSON.parse(raw);
      if(!d || !d.formCode) continue;
      var savedBy = String(d.savedBy || '').trim().toLowerCase();
      if(savedBy && savedBy !== owner) continue;
      drafts.push(d);
    }
  } catch(e){}
  drafts.sort(function(a, b){ return (b.savedAt || '').localeCompare(a.savedAt || ''); });
  return drafts;
}

function submitForm(){
  saveAuditLog();
  var payload = {};
  Object.keys(state.fieldValues).forEach(function(k){ payload[k] = state.fieldValues[k]; });
  payload.form_code = state.formCode;
  payload.form_version = state.schema ? state.schema.version : 'V1';
  payload.record_id = state.recordId;
  payload.allocation_id = state.allocationId;
  payload.signatures = state.signatures;
  payload.entry_id = state.entryId;
  payload.edit_origin = state.editOrigin || 'new';
  payload.source_entry_id = state.sourceEntryId || '';
  payload.source_submission_revision = state.sourceSubmissionRevision || 0;
  payload.runtime_mode = 'eqms_web_form';

  if(window.AllocationTracker && state.allocationId){
    return window.AllocationTracker.submitOnline(state.allocationId, state.formCode, payload);
  }
  return api('form_fill_submit_online', payload, 'POST');
}

/* ── E-Signature Dialog ── */
function ensureEqmsSignatureModuleReady(){
  if(typeof window.ESignature === 'function') return Promise.resolve(window.ESignature);
  try{
    if(window.parent && window.parent !== window && typeof window.parent.ESignature === 'function'){
      return Promise.resolve(window.parent.ESignature);
    }
  }catch(_err){}
  if(window.__eqmsSignatureLoader) return window.__eqmsSignatureLoader;
  window.__eqmsSignatureLoader = new Promise(function(resolve){
    var script = document.querySelector('script[data-eqms-esign-loader="1"]');
    if(!script){
      script = document.createElement('script');
      script.src = '/mom/scripts/portal/11-e-signature.js?v=20260401m';
      script.async = true;
      script.dataset.eqmsEsignLoader = '1';
      document.head.appendChild(script);
    }
    var done = function(){
      if(typeof window.ESignature === 'function'){
        resolve(window.ESignature);
        return;
      }
      try{
        if(window.parent && window.parent !== window && typeof window.parent.ESignature === 'function'){
          resolve(window.parent.ESignature);
          return;
        }
      }catch(_err){}
      resolve(null);
    };
    script.addEventListener('load', done, { once:true });
    script.addEventListener('error', function(){ resolve(null); }, { once:true });
    setTimeout(done, 2600);
  }).finally(function(){
    window.__eqmsSignatureLoader = null;
  });
  return window.__eqmsSignatureLoader;
}

function showEqmsSignatureFallback(block){
  var u = currentUser();
  return new Promise(function(resolve){
    var overlay = document.createElement('div');
    overlay.className = 'eqms-signature-fallback';
    overlay.innerHTML =
      '<div class="eqms-signature-fallback__backdrop" data-action="cancel"></div>' +
      '<div class="eqms-signature-fallback__modal" role="dialog" aria-modal="true" aria-label="' + esc(t('Ký điện tử', 'Electronic signature')) + '">' +
        '<div class="eqms-signature-fallback__head">' +
          '<div><strong>' + esc(t('Ký điện tử hồ sơ', 'Electronic signature')) + '</strong><p>' + esc(t('Fallback an toàn khi module chữ ký chưa tải kịp. Hệ thống vẫn lưu tên, thời điểm và ý nghĩa chữ ký.', 'Safe fallback when the signature module is not loaded yet. The system still stores signer, time, and meaning.')) + '</p></div>' +
          '<button type="button" class="eqms-signature-fallback__close" data-action="cancel">×</button>' +
        '</div>' +
        '<div class="eqms-signature-fallback__body">' +
          '<label>' + esc(t('Người ký', 'Signer')) + '<input type="text" data-field="name" value="' + esc(u.name || '') + '"></label>' +
          '<label>' + esc(t('Vai trò', 'Role')) + '<input type="text" data-field="role" value="' + esc(u.role || u.dept || '') + '"></label>' +
          '<label>' + esc(t('Lý do ký', 'Signing reason')) + '<textarea data-field="reason" rows="4">' + esc(block.meaning || 'Approved') + '</textarea></label>' +
          '<div class="eqms-signature-fallback__error scar-hidden" data-field="error"></div>' +
        '</div>' +
        '<div class="eqms-signature-fallback__actions">' +
          '<button type="button" data-action="cancel">' + esc(t('Hủy', 'Cancel')) + '</button>' +
          '<button type="button" class="primary" data-action="confirm">' + esc(t('Ký và xác nhận', 'Sign and confirm')) + '</button>' +
        '</div>' +
      '</div>';
    if(!document.getElementById('eqms-signature-fallback-style')){
      var style = document.createElement('style');
      style.id = 'eqms-signature-fallback-style';
      style.textContent = [
        '.eqms-signature-fallback{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center}',
        '.eqms-signature-fallback__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px)}',
        '.eqms-signature-fallback__modal{position:relative;width:min(520px,94vw);background:var(--bg-surface,#fff);border:var(--modal-border-width,1px) solid var(--border,#e2e8f0);border-radius:var(--modal-border-radius,18px);box-shadow:var(--shadow-xl,0 24px 64px rgba(15,23,42,.28));overflow:hidden;color:var(--text-primary,#0f172a)}',
        '.eqms-signature-fallback__head{display:flex;justify-content:space-between;gap:16px;padding:var(--modal-header-padding-v,16px) var(--modal-padding,20px);border-bottom:1px solid var(--border,#e2e8f0)}',
        '.eqms-signature-fallback__head strong{display:block;font-size:18px;color:var(--text-primary,#0f172a)}',
        '.eqms-signature-fallback__head p{margin:6px 0 0;color:var(--text-secondary,#64748b);line-height:1.5}',
        '.eqms-signature-fallback__close{width:36px;height:36px;border:var(--btn-border-width,1px) solid var(--border,#e2e8f0);border-radius:var(--hds-control-radius,12px);background:var(--bg-surface-alt,#f8fafc);color:var(--text-primary,#0f172a);font-size:22px;cursor:pointer}',
        '.eqms-signature-fallback__body{display:grid;gap:12px;padding:var(--modal-padding,20px)}',
        '.eqms-signature-fallback__body label{display:grid;gap:6px;color:var(--text-secondary,#334155);font-weight:700;font-size:13px}',
        '.eqms-signature-fallback__body input,.eqms-signature-fallback__body textarea{border:var(--input-border-width,1px) solid var(--border,#cbd5e1);border-radius:var(--hds-control-radius,12px);padding:calc(var(--input-padding-y,0px) + 10px) var(--hds-control-px,12px);font:inherit;color:var(--text-primary,#0f172a);background:var(--input-bg,var(--bg-surface,#fff))}',
        '.eqms-signature-fallback__actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 20px;border-top:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc)}',
        '.eqms-signature-fallback__actions button{min-width:132px;min-height:var(--hds-control-h,36px);padding:var(--btn-padding-y,0px) var(--btn-padding-x,14px);border-radius:var(--hds-control-radius,12px);border:var(--btn-border-width,1px) solid var(--border,#cbd5e1);background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);font-weight:700;cursor:pointer}',
        '.eqms-signature-fallback__actions .primary{background:var(--brand-2,#1565c0);border-color:var(--brand-2,#1565c0);color:var(--text-inverse,#fff)}',
        '.eqms-signature-fallback__error{color:var(--red,#b91c1c);font-size:12px;font-weight:700}'
      ].join('');
      document.head.appendChild(style);
    }
    function close(result){
      if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result || null);
    }
    function showError(message){
      var node = overlay.querySelector('[data-field="error"]');
      if(!node) return;
      node.textContent = message;
      node.classList.remove('scar-hidden');
    }
    overlay.addEventListener('click', function(event){
      var action = event.target && event.target.getAttribute ? event.target.getAttribute('data-action') : '';
      if(action === 'cancel') close(null);
      if(action !== 'confirm') return;
      var name = String((overlay.querySelector('[data-field="name"]') || {}).value || '').trim();
      var role = String((overlay.querySelector('[data-field="role"]') || {}).value || '').trim();
      var reason = String((overlay.querySelector('[data-field="reason"]') || {}).value || '').trim();
      if(!name){
        showError(t('Hãy nhập tên người ký.', 'Please enter the signer name.'));
        return;
      }
      if(!reason){
        showError(t('Hãy nhập lý do ký.', 'Please enter the signing reason.'));
        return;
      }
      close({
        signerId: String(u.username || '').trim().toUpperCase(),
        signerName: name,
        signerRole: role,
        meaning: block.meaning || 'Approved',
        signedAt: new Date().toISOString(),
        reason: reason,
        mode: 'typed'
      });
    });
    document.body.appendChild(overlay);
  });
}

function openSignatureDialog(blockId){
  var schema = state.schema;
  var block = (schema.signature_blocks || []).find(function(b){ return b.id === blockId; });
  if(!block) return;
  ensureEqmsSignatureModuleReady().then(function(ESignatureCtor){
    if(typeof ESignatureCtor !== 'function'){
      return showEqmsSignatureFallback(block).then(function(sigData){
        if(!sigData) return;
        state.signatures[blockId] = sigData;
        logFieldChange('signature:' + blockId, '', sigData.signerName + ' (' + (sigData.meaning || block.meaning) + ')');
        var container = document.querySelector('.eqms-runtime') || document.getElementById('eqms-form-container');
        if(container) renderForm(container);
      });
    }
    var u = currentUser();
    new ESignatureCtor({
      lang: (typeof lang !== 'undefined' && lang === 'en') ? 'en' : 'vi',
      requireReason: block.require_reason !== false,
      requirePin: block.require_pin === true
    }).show({
      signerId: u.username.toUpperCase(),
      signerName: u.name,
      signerRole: u.role || u.dept,
      signatureMeaning: block.meaning || 'Approved',
      appliedTo: (state.recordId || state.formCode) + ':' + blockId,
      onSign: function(sigData){
        state.signatures[blockId] = sigData;
        logFieldChange('signature:' + blockId, '', sigData.signerName + ' (' + (sigData.meaning || block.meaning) + ')');
        var container = document.querySelector('.eqms-runtime') || document.getElementById('eqms-form-container');
        if(container) renderForm(container);
      }
    });
  });
}

/* ── Public API ── */

/**
 * Open and render an eQMS web form.
 * Called when user opens an eQMS form from the file explorer.
 *
 * @param {string} formCode - Form code (e.g., 'FRM-403-SCAR')
 * @param {HTMLElement} container - Target container element
 * @param {Object} options - { allocationId, recordId, entryId, editMode }
 */
window.openEqmsForm = function(formCode, container, options){
  options = options || {};
  state.formCode = formCode;
  state.allocationId = options.allocationId || '';
  state.recordId = options.recordId || '';
  state.entryId = options.entryId || '';
  state.editOrigin = options.editOrigin || 'new';
  state.sourceEntryId = options.sourceEntryId || '';
  state.sourceSubmissionRevision = Number(options.sourceSubmissionRevision || 0) || 0;
  state.editMode = !!options.editMode;
  state.fieldValues = {};
  state.signatures = {};
  state.auditLog = [];
  state.entry = null;
  state.schema = null;

  container.innerHTML = '<div class="eqms-runtime" id="eqms-form-container"><div class="eqms-loading">Đang tải biểu mẫu...</div></div>';
  var runtime = container.querySelector('.eqms-runtime');

  Promise.all([loadSchema(formCode), ensureMasterData(), ensureCompanyDirectory(), ensureRegistryOptions()]).then(function(results){
    var schema = normalizeSchemaLookups(results[0]);
    if(!schema){
      runtime.innerHTML = '<div class="eqms-empty">' +
        '<div style="font-size:32px;margin-bottom:12px">📋</div>' +
        '<h3>' + esc(t('Không tìm thấy định nghĩa biểu mẫu', 'Form schema not found')) + '</h3>' +
        '<p style="color:#64748b;font-size:13px">' + esc(t('Mã form: ', 'Form code: ') + formCode) + '</p>' +
      '</div>';
      console.warn('[eQMS] Schema not found for:', formCode);
      if(options.onError && typeof options.onError === 'function') options.onError(new Error('Schema not found: ' + formCode));
      return;
    }
    state.schema = schema;

    /* Auto-create allocation if none provided */
    if(!state.allocationId && options.createIfMissing && window.AllocationTracker){
      var rt = schema.record_type || '';
      var dept = (schema.owner || 'QA').split('/')[0].trim();
      if(rt){
        return window.AllocationTracker.allocate(rt, dept, {
          year: new Date().getFullYear(),
          form_code: formCode,
          notes: options.forceNew ? 'New eQMS form instance' : 'eQMS form instance',
          master_context: {}
        }).then(function(resp){
          if(resp && resp.ok){
            state.allocationId = resp.allocation_id || '';
            state.recordId = resp.record_id || '';
            toast('Đã cấp mã hồ sơ: ' + (resp.record_id || ''), 'success');
          }
          return schema;
        }).catch(function(){ return schema; });
      }
    }
    return schema;
  }).then(function(schema){
    if(!schema) return;
    state.schema = normalizeSchemaLookups(schema);

    if(standaloneRuntimePath(formCode, state.schema)){
      renderStandaloneRuntime(runtime, state.schema, options);
      return null;
    }

    /* Apply field defaults */
    (schema.fields || []).forEach(function(field){
      if(field.default === 'today' && (field.type === 'date' || field.type === 'datetime')){
        state.fieldValues[field.id] = new Date().toISOString().slice(0, field.type === 'date' ? 10 : 16);
      } else if(field.default !== undefined && field.default !== null && field.default !== '' && field.default !== 'today'){
        state.fieldValues[field.id] = field.default;
      }
    });

    /* Try loading local draft first */
    var localDraft = loadLocalDraft();
    if(localDraft && localDraft.fieldValues && Object.keys(localDraft.fieldValues).length){
      Object.keys(localDraft.fieldValues).forEach(function(k){
        state.fieldValues[k] = localDraft.fieldValues[k];
      });
      if(localDraft.signatures) state.signatures = localDraft.signatures;
      if(localDraft.allocationId && !state.allocationId) state.allocationId = localDraft.allocationId;
      if(localDraft.recordId && !state.recordId) state.recordId = localDraft.recordId;
      if(localDraft.entryId && !state.entryId) state.entryId = localDraft.entryId;
      if(localDraft.editOrigin && state.editOrigin === 'new') state.editOrigin = localDraft.editOrigin;
      if(localDraft.sourceEntryId && !state.sourceEntryId) state.sourceEntryId = localDraft.sourceEntryId;
      if(localDraft.sourceSubmissionRevision && !state.sourceSubmissionRevision) state.sourceSubmissionRevision = Number(localDraft.sourceSubmissionRevision) || 0;
    }

    /* Load existing entry from server if available */
    if(state.allocationId || state.entryId){
      return loadEntry(formCode, state.allocationId, state.entryId).then(function(entry){
        if(entry){
          state.entry = entry;
          state.entryId = entry.entry_id || state.entryId;
          state.recordId = entry.record_id || state.recordId;
          if(!state.sourceEntryId) state.sourceEntryId = entry.entry_id || '';
          if(!state.sourceSubmissionRevision) state.sourceSubmissionRevision = Number(entry.submission_revision || 0) || 0;
          /* Hydrate field values from entry */
          Object.keys(entry).forEach(function(k){
            if(['form_code','form_version','record_id','allocation_id','signatures','_status','_ip','_server_time','submitted_by','submitted_at','entry_id','master_context','history','workflow_state'].indexOf(k) < 0){
              if(state.fieldValues[k] === undefined || state.fieldValues[k] === null || state.fieldValues[k] === ''){
                state.fieldValues[k] = entry[k];
              }
            }
          });
          if(entry.signatures && typeof entry.signatures === 'object') state.signatures = entry.signatures;
          /* If already submitted, force read-only unless explicitly in edit mode */
          if(!options.editMode && (entry.workflow_state === 'submitted' || entry.workflow_state === 'approved' || entry.workflow_state === 'closed')){
            state.editMode = false;
          }
        }
        if(!state.allocationId){
          renderForm(runtime);
          return null;
        }
        return loadServerDraft(state.allocationId).then(function(serverDraft){
          if(serverDraft && serverDraft.data){
            var serverFields = serverDraft.data.fieldValues || {};
            Object.keys(serverFields).forEach(function(k){ state.fieldValues[k] = serverFields[k]; });
            if(serverDraft.data.signatures) state.signatures = serverDraft.data.signatures;
            if(serverDraft.entry_id && !state.entryId) state.entryId = serverDraft.entry_id;
            if(serverDraft.record_id && !state.recordId) state.recordId = serverDraft.record_id;
            if(serverDraft.edit_origin && state.editOrigin === 'new') state.editOrigin = serverDraft.edit_origin;
            if(serverDraft.source_entry_id && !state.sourceEntryId) state.sourceEntryId = serverDraft.source_entry_id;
            if(serverDraft.source_submission_revision && !state.sourceSubmissionRevision) state.sourceSubmissionRevision = Number(serverDraft.source_submission_revision) || 0;
          }
          renderForm(runtime);
          return null;
        }).catch(function(){
          renderForm(runtime);
          return null;
        });
      });
    }

    renderForm(runtime);
  }).catch(function(err){
    var errMsg = (err && err.message) || t('Không rõ lỗi', 'Unknown error');
    runtime.innerHTML = '<div class="eqms-empty">' +
      '<div style="font-size:32px;margin-bottom:12px">⚠</div>' +
      '<h3>' + esc(t('Không thể tải biểu mẫu', 'Could not load form')) + '</h3>' +
      '<p style="color:#64748b;font-size:13px">' + esc(errMsg) + '</p>' +
      '<button class="eqms-btn secondary" onclick="window.openEqmsForm(\'' + esc(formCode) + '\',this.closest(\'.eqms-runtime\').parentNode,' + esc(JSON.stringify(options)) + ')">' + esc(t('Thử lại', 'Retry')) + '</button>' +
    '</div>';
    console.error('[eQMS] Form load failed:', formCode, err);
    if(options.onError && typeof options.onError === 'function') options.onError(err);
    try { window.dispatchEvent(new CustomEvent('eqms-form-error', { detail: { formCode: formCode, error: errMsg } })); } catch(e){}
  });
};

/**
 * Toggle edit mode on an already-open form.
 */
window.toggleEqmsEditMode = function(){
  state.editMode = !state.editMode;
  state.originalValues = JSON.parse(JSON.stringify(state.fieldValues));
  var container = document.querySelector('.eqms-runtime') || document.getElementById('eqms-form-container');
  if(container) renderForm(container);
  return state.editMode;
};

window.listUserDrafts = listUserDrafts;

})();

/* ==========================================================================
   10-eqms-form-runtime.js — eQMS Web Form Renderer
   HESEM QMS Portal — Renders forms from JSON schema inside document viewer
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
  var u = (typeof window.currentUser !== 'undefined' && window.currentUser) ? window.currentUser : {};
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

/* ── State ── */
var masterData = null;

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
  var md = masterData || {};
  if(source === 'suppliers') return (md.suppliers || []).map(function(s){
    return { value: s.supplier_id, label: s.supplier_id, sub: s.supplier_name || '', supplier_id: s.supplier_id, supplier_name: s.supplier_name || '', contact_name: s.contact_name || '', contact_email: s.contact_email || '', supplier_type: s.supplier_type || '' };
  });
  if(source === 'parts') return (md.parts || []).map(function(p){
    var label = p.part_number + (p.revision ? ' ' + p.revision : '');
    return { value: p.part_number, label: label, sub: p.part_description || '', part_number: p.part_number, part_description: p.part_description || '', revision: p.revision || '', customer_id: p.customer_id || '' };
  });
  if(source === 'customers') return (md.customers || []).map(function(c){
    return { value: c.customer_id, label: c.customer_id, sub: c.customer_name || '', customer_id: c.customer_id, customer_name: c.customer_name || '' };
  });
  return [];
}

var state = {
  formCode: '',
  schema: null,
  entry: null,
  entryId: '',
  recordId: '',
  allocationId: '',
  fieldValues: {},
  signatures: {},
  editMode: false,
  loading: false,
  auditLog: [],
  originalValues: {}
};

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
    return fetch('qms-data/online-forms/schemas/' + encodeURIComponent(formCode) + '.json', { credentials:'include' })
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

  var html = '<div class="' + cls + '">' +
    '<label class="eqms-label" for="' + esc(id) + '">' + label + ' ' + required + '</label>';

  var val = value !== undefined && value !== null ? value : '';

  switch(field.type){
    case 'text':
    case 'email':
    case 'phone':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="' + (field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text') + '" value="' + esc(val) + '" placeholder="' + esc(t(field.placeholder || '', field.placeholder_en || '')) + '"' + disabled + '>';
      break;
    case 'number':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="number" value="' + esc(val) + '"' + (field.min !== undefined ? ' min="' + field.min + '"' : '') + (field.max !== undefined ? ' max="' + field.max + '"' : '') + disabled + '>';
      break;
    case 'date':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="date" value="' + esc(val) + '"' + disabled + '>';
      break;
    case 'datetime':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="datetime-local" value="' + esc(val) + '"' + disabled + '>';
      break;
    case 'select':
      html += '<select class="eqms-input" id="' + esc(id) + '"' + disabled + '><option value="">' + esc(t('Chon', 'Select')) + '</option>';
      (field.options || []).forEach(function(opt){
        var ov = typeof opt === 'string' ? opt : (opt.value || '');
        var ol = typeof opt === 'string' ? opt : t(opt.label || opt.value, opt.label_en || opt.label || opt.value);
        html += '<option value="' + esc(ov) + '"' + (String(val) === String(ov) ? ' selected' : '') + '>' + esc(ol) + '</option>';
      });
      html += '</select>';
      break;
    case 'multi_select':
      html += '<div class="eqms-multi">';
      var selected = Array.isArray(val) ? val : [];
      (field.options || []).forEach(function(opt){
        var ov = typeof opt === 'string' ? opt : (opt.value || '');
        var ol = typeof opt === 'string' ? opt : t(opt.label || opt.value, opt.label_en || opt.label || opt.value);
        html += '<label class="eqms-check"><input type="checkbox" data-multi="' + esc(field.id) + '" value="' + esc(ov) + '"' + (selected.indexOf(ov) >= 0 ? ' checked' : '') + disabled + '> ' + esc(ol) + '</label>';
      });
      html += '</div>';
      break;
    case 'textarea':
      html += '<textarea class="eqms-input eqms-textarea" id="' + esc(id) + '" rows="4" placeholder="' + esc(t(field.placeholder || '', field.placeholder_en || '')) + '"' + disabled + '>' + esc(val) + '</textarea>';
      break;
    case 'checkbox':
      html += '<label class="eqms-check"><input type="checkbox" id="' + esc(id) + '"' + (val ? ' checked' : '') + disabled + '> ' + esc(t(field.checkbox_label || label, field.checkbox_label_en || field.label_en || label)) + '</label>';
      break;
    case 'file':
      html += '<input class="eqms-input" id="' + esc(id) + '" type="file" accept="' + esc((field.accept || '.pdf,.jpg,.png,.xlsx').replace(/\s/g, '')) + '"' + disabled + '>';
      break;
    case 'lookup':
      /* Lookup field — renders as searchable dropdown from master data */
      html += '<div id="' + esc(id) + '-host" class="eqms-lookup-host" data-lookup-source="' + esc(field.lookup_source || '') + '" data-field-id="' + esc(field.id) + '"></div>';
      if(val) html += '<input type="hidden" id="' + esc(id) + '" value="' + esc(val) + '">';
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
    html += '<div class="eqms-helper">' + esc(t(field.helper_vi || field.helper || '', field.helper_en || field.helper || '')) + '</div>';

  html += '</div>';
  return html;
}

/* ── Signature Block ── */
function renderSignatureBlock(block, signatureData, canSign){
  var signed = !!signatureData;
  var meaning = block.meaning || 'Approved';
  return '<div class="eqms-sig-block' + (signed ? ' signed' : '') + '">' +
    '<div class="eqms-sig-header">' +
      '<strong>' + esc(t(block.label || block.id, block.label_en || block.label || block.id)) + '</strong>' +
      '<span class="eqms-sig-meaning">' + esc(meaning) + '</span>' +
    '</div>' +
    (signed ? '<div class="eqms-sig-data">' +
      '<div>' + esc(t('Ten', 'Name')) + ': <strong>' + esc(signatureData.printed_name || signatureData.signerName || '') + '</strong></div>' +
      '<div>' + esc(t('Thoi gian', 'Time')) + ': ' + esc(fmtDate(signatureData.timestamp || signatureData.signed_at || '')) + '</div>' +
      '<div>' + esc(t('Y nghia', 'Meaning')) + ': ' + esc(signatureData.meaning || meaning) + '</div>' +
    '</div>' : '<div class="eqms-sig-empty">' + esc(t('Chua ky', 'Not signed')) + '</div>') +
    (canSign && !signed ? '<button class="eqms-btn primary" data-sign-block="' + esc(block.id) + '">' + esc(t('Ky', 'Sign')) + '</button>' : '') +
  '</div>';
}

/* ── Main Render ── */
function renderForm(container){
  var schema = state.schema;
  if(!schema){
    container.innerHTML = '<div class="eqms-empty">' + esc(t('Khong co schema', 'No schema available')) + '</div>';
    return;
  }

  var readOnly = !state.editMode;
  var fields = schema.fields || [];
  var sections = schema.sections || [{ id: 'main', title: t('Thong tin', 'Information'), field_ids: fields.map(function(f){ return f.id; }) }];
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
    if(state.recordId) html += '<div class="eqms-record-chip"><small>' + esc(t('Ma ho so', 'Record ID')) + '</small><strong>' + esc(state.recordId) + '</strong></div>';
    var ctx = state.entry && state.entry.master_context ? state.entry.master_context : {};
    if(ctx.customer_id) html += '<div class="eqms-record-chip"><small>' + esc(t('Khach hang', 'Customer')) + '</small><strong>' + esc(ctx.customer_id) + '</strong></div>';
    if(ctx.so_number) html += '<div class="eqms-record-chip"><small>SO</small><strong>' + esc(ctx.so_number) + '</strong></div>';
    if(ctx.part_number) html += '<div class="eqms-record-chip"><small>Part</small><strong>' + esc(ctx.part_number) + '</strong></div>';
    html += '</div>';
  }

  /* ── Status bar ── */
  if(state.editMode){
    html += '<div class="eqms-status-bar editing">' +
      '<span class="eqms-status-indicator"></span>' +
      '<span>' + esc(t('Dang chinh sua — moi thay doi duoc ghi nhat ky', 'Editing — all changes are audit-logged')) + '</span>' +
    '</div>';
  }

  /* ── Form sections ── */
  sections.forEach(function(section, sIdx){
    var sectionFields = (section.field_ids || []).map(function(fid){
      return fields.find(function(f){ return f.id === fid; });
    }).filter(Boolean);

    html += '<div class="eqms-section">' +
      '<div class="eqms-section-head">' +
        '<div class="eqms-section-num">' + (sIdx + 1) + '</div>' +
        '<div>' +
          '<div class="eqms-section-title">' + esc(section.title || section.title_en || '') + '</div>' +
          (section.description || section.description_en ? '<div class="eqms-section-desc">' + esc(section.description || section.description_en || '') + '</div>' : '') +
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
        '<div><div class="eqms-section-title">Chữ ký điện tử (Electronic Signatures)</div></div>' +
      '</div>' +
      '<div class="eqms-sig-grid">';
    sigBlocks.forEach(function(block){
      var canSign = !readOnly && block.roles && block.roles.some(function(r){ return u.roles.indexOf(r) >= 0 || r === 'fill'; });
      html += renderSignatureBlock(block, state.signatures[block.id], canSign);
    });
    html += '</div></div>';
  }

  /* ── Action bar ── */
  if(state.editMode){
    html += '<div class="eqms-actions">' +
      '<button class="eqms-btn secondary" id="eqms-save-draft">' + esc(t('Luu nhap', 'Save draft')) + '</button>' +
      '<button class="eqms-btn primary" id="eqms-submit">' + esc(t('Gui bieu mau', 'Submit form')) + '</button>' +
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
}

/* ── Field Binding ── */
function bindFields(container){
  var schema = state.schema;
  if(!schema || !state.editMode) return;
  var fields = schema.fields || [];

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
        var old = state.fieldValues[fieldId] || '';
        state.fieldValues[fieldId] = item ? item.value : '';
        logFieldChange(fieldId, old, item ? item.value : '');
        /* Autofill related fields from lookup item */
        if(item && field && field.autofill){
          Object.keys(field.autofill).forEach(function(target){
            var src = field.autofill[target];
            if(item[src] !== undefined && item[src] !== ''){
              var oldTarget = state.fieldValues[target] || '';
              state.fieldValues[target] = item[src];
              logFieldChange(target, oldTarget, item[src], 'Autofill from ' + fieldId);
              var targetEl = document.getElementById('eqms-f-' + target);
              if(targetEl) targetEl.value = item[src];
            }
          });
        }
      }
    });
    if(state.fieldValues[fieldId]) instance.setValue(state.fieldValues[fieldId]);
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
      };
      return;
    }

    el.oninput = el.onchange = function(){
      var old = state.fieldValues[field.id] || '';
      var newVal = field.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      state.fieldValues[field.id] = newVal;
      logFieldChange(field.id, old, newVal);
    };
  });

  /* Save draft */
  var saveBtn = document.getElementById('eqms-save-draft');
  if(saveBtn) saveBtn.onclick = function(){
    saveBtn.disabled = true;
    saveDraft().then(function(){
      toast(t('Da luu nhap.', 'Draft saved.'), 'success');
    }).catch(function(){
      toast(t('Khong the luu nhap.', 'Could not save draft.'), 'error');
    }).finally(function(){ saveBtn.disabled = false; });
  };

  /* Submit */
  var submitBtn = document.getElementById('eqms-submit');
  if(submitBtn) submitBtn.onclick = function(){
    var missing = validateRequired();
    if(missing.length){
      toast(t('Thieu truong bat buoc: ', 'Missing required fields: ') + missing.join(', '), 'warn');
      return;
    }
    submitBtn.disabled = true;
    submitForm().then(function(resp){
      if(resp && resp.ok){
        toast(t('Da gui bieu mau thanh cong.', 'Form submitted successfully.'), 'success');
        state.editMode = false;
        if(state.entry) state.entry.workflow_state = 'submitted';
        renderForm(submitBtn.closest('.eqms-runtime') || document.getElementById('eqms-form-container'));
      } else {
        toast(t('Khong the gui: ', 'Could not submit: ') + (resp && resp.error || ''), 'error');
      }
    }).catch(function(){
      toast(t('Loi ket noi.', 'Connection error.'), 'error');
    }).finally(function(){ submitBtn.disabled = false; });
  };

  /* Signature blocks */
  Array.prototype.forEach.call(container.querySelectorAll('[data-sign-block]'), function(btn){
    btn.onclick = function(){
      var blockId = btn.getAttribute('data-sign-block');
      openSignatureDialog(blockId);
    };
  });
}

/* ── Validation ── */
function validateRequired(){
  var schema = state.schema;
  if(!schema) return [];
  var missing = [];
  (schema.fields || []).forEach(function(field){
    if(!field.required) return;
    var val = state.fieldValues[field.id];
    if(val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)){
      missing.push(t(field.label || field.id, field.label_en || field.label || field.id));
    }
  });
  return missing;
}

/* ── Save/Submit ── */
function saveDraft(){
  saveAuditLog();
  return api('form_fill_save_draft', {
    form_code: state.formCode,
    allocation_id: state.allocationId,
    data: { fieldValues: state.fieldValues, signatures: state.signatures }
  }, 'POST');
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
  payload.runtime_mode = 'eqms_web_form';

  if(window.AllocationTracker && state.allocationId){
    return window.AllocationTracker.submitOnline(state.allocationId, state.formCode, payload);
  }
  return api('form_fill_submit_online', payload, 'POST');
}

/* ── E-Signature Dialog ── */
function openSignatureDialog(blockId){
  if(typeof window.ESignature !== 'function'){
    toast(t('Module chu ky chua san sang.', 'Signature module not ready.'), 'error');
    return;
  }
  var schema = state.schema;
  var block = (schema.signature_blocks || []).find(function(b){ return b.id === blockId; });
  if(!block) return;
  var u = currentUser();
  new window.ESignature({
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
  state.editMode = !!options.editMode;
  state.fieldValues = {};
  state.signatures = {};
  state.auditLog = [];
  state.entry = null;
  state.schema = null;

  container.innerHTML = '<div class="eqms-runtime" id="eqms-form-container"><div class="eqms-loading">' + esc(t('Dang tai bieu mau...', 'Loading form...')) + '</div></div>';
  var runtime = container.querySelector('.eqms-runtime');

  Promise.all([loadSchema(formCode), ensureMasterData()]).then(function(results){
    var schema = results[0];
    if(!schema){
      runtime.innerHTML = '<div class="eqms-empty">' + esc(t('Khong tim thay schema cho form nay.', 'Schema not found for this form.')) + '</div>';
      return;
    }
    state.schema = schema;

    /* Apply field defaults */
    (schema.fields || []).forEach(function(field){
      if(field.default === 'today' && (field.type === 'date' || field.type === 'datetime')){
        state.fieldValues[field.id] = new Date().toISOString().slice(0, field.type === 'date' ? 10 : 16);
      } else if(field.default !== undefined && field.default !== null && field.default !== '' && field.default !== 'today'){
        state.fieldValues[field.id] = field.default;
      }
    });

    /* Load existing entry if available */
    if(state.allocationId || state.entryId){
      return loadEntry(formCode, state.allocationId, state.entryId).then(function(entry){
        if(entry){
          state.entry = entry;
          state.recordId = entry.record_id || state.recordId;
          /* Hydrate field values from entry */
          Object.keys(entry).forEach(function(k){
            if(['form_code','form_version','record_id','allocation_id','signatures','_status','_ip','_server_time','submitted_by','submitted_at','entry_id','master_context','history','workflow_state'].indexOf(k) < 0){
              state.fieldValues[k] = entry[k];
            }
          });
          if(entry.signatures && typeof entry.signatures === 'object') state.signatures = entry.signatures;
          /* If already submitted, force read-only unless explicitly in edit mode */
          if(!options.editMode && (entry.workflow_state === 'submitted' || entry.workflow_state === 'approved' || entry.workflow_state === 'closed')){
            state.editMode = false;
          }
        }
        renderForm(runtime);
      });
    }

    renderForm(runtime);
  }).catch(function(err){
    runtime.innerHTML = '<div class="eqms-empty">' + esc(t('Loi tai form: ', 'Error loading form: ') + (err && err.message || '')) + '</div>';
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

})();

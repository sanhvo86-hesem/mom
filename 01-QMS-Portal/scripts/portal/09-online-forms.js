/* ═══════════════════════════════════════════════════
   09-online-forms.js — Online Form Engine
   HESEM QMS Portal — Form data entry, validation, storage
   ═══════════════════════════════════════════════════ */

(function(){
'use strict';

// ── State ──
var _formSchemas = {};       // {FRM-208: schema, ...}
var _formEntries = {};       // {FRM-208: [entries], ...}
var _currentForm = null;     // Current form code being edited
var _currentEntry = null;    // Current entry data being filled
var _formDirty = false;
var _tableRowCounters = {};  // Track dynamic table rows

// ── Record-ID Config ──
var RECORD_FORM_MAP = {
  'NCR':  { form: 'FRM-631', label: 'NCR — Báo cáo không phù hợp' },
  'CAPA': { form: 'FRM-641', label: 'CAPA — Hành động khắc phục' },
  'FAI':  { form: 'FRM-311', label: 'FAI — Kiểm tra sản phẩm đầu tiên' },
  'TRN':  { form: 'FRM-802', label: 'Training — Sự kiện đào tạo' },
  'AUD':  { form: 'FRM-913', label: 'Audit — Phát hiện đánh giá' },
  'ECR':  { form: 'FRM-161', label: 'ECR — Yêu cầu thay đổi kỹ thuật' },
  'CAL':  { form: 'FRM-601', label: 'Calibration — Hồ sơ hiệu chuẩn' },
  'SCAR': { form: 'FRM-403', label: 'SCAR — Hành động khắc phục NCC' },
  'IMP':  { form: null,      label: 'Improvement — Dự án cải tiến' },
  'MR':   { form: 'FRM-911', label: 'MR — Xem xét lãnh đạo' },
  'RISK': { form: 'FRM-131', label: 'Risk — Rà soát rủi ro' }
};

// ── Constants ──
var FORM_COLORS = {
  production: {bg:'#e7f5ff', border:'#1971c2', icon:'🏭'},
  quality: {bg:'#ebfbee', border:'#2f9e44', icon:'🔍'},
  maintenance: {bg:'#fff9db', border:'#e67700', icon:'🔧'},
  hr: {bg:'#f3f0ff', border:'#7950f2', icon:'👥'},
  logistics: {bg:'#fff4e6', border:'#d9480f', icon:'📦'},
  safety: {bg:'#fff5f5', border:'#e03131', icon:'⚠️'}
};

// ═══════════════════════════════════════════════════
// RENDER FORMS LIST PAGE
// ═══════════════════════════════════════════════════
window.renderOnlineForms = function(formCode){
  var page = document.getElementById('page-forms');
  if(!page) return;
  if(formCode){
    _loadAndRenderForm(formCode, page);
    return;
  }
  // List all available forms
  _loadFormSchemaList(function(schemas){
    var html = '<div class="forms-page">';
    html += '<div class="forms-header">';
    html += '<h1 class="forms-title">📋 ' + (lang==='en'?'Online Forms':'Form trực tuyến') + '</h1>';
    html += '<p class="forms-subtitle">' + (lang==='en'?'Fill forms online, auto-save to system':'Nhập liệu trực tuyến, tự động lưu vào hệ thống') + '</p>';
    html += '</div>';

    // Stats bar
    var totalEntries = 0;
    Object.keys(_formEntries).forEach(function(k){ totalEntries += (_formEntries[k]||[]).length; });
    html += '<div class="forms-stats">';
    html += '<div class="forms-stat-card"><div class="stat-value">' + schemas.length + '</div><div class="stat-label">' + (lang==='en'?'Forms available':'Form khả dụng') + '</div></div>';
    html += '<div class="forms-stat-card"><div class="stat-value">' + totalEntries + '</div><div class="stat-label">' + (lang==='en'?'Entries today':'Bản ghi hôm nay') + '</div></div>';
    html += '</div>';

    // ── Record-ID Request Panel ──
    html += '<div class="record-id-panel">';
    html += '<div class="record-id-header">';
    html += '<h2 class="record-id-title">🔢 ' + (lang==='en'?'Request Record ID':'Xin mã hồ sơ mới') + '</h2>';
    html += '<p class="record-id-desc">' + (lang==='en'?'Get a unique Record-ID before filling an Excel form':'Lấy mã hồ sơ duy nhất trước khi điền form Excel') + '</p>';
    html += '</div>';
    html += '<div class="record-id-body">';
    html += '<div class="record-id-row">';
    html += '<div class="record-id-field">';
    html += '<label>' + (lang==='en'?'Record type':'Loại hồ sơ') + '</label>';
    html += '<select id="rid-prefix" class="record-id-select">';
    Object.keys(RECORD_FORM_MAP).forEach(function(k){
      html += '<option value="' + k + '">' + k + ' — ' + RECORD_FORM_MAP[k].label + '</option>';
    });
    html += '</select>';
    html += '</div>';
    html += '<div class="record-id-field">';
    html += '<label>' + (lang==='en'?'Year':'Năm') + '</label>';
    html += '<select id="rid-year" class="record-id-select">';
    var cy = new Date().getFullYear();
    for(var y = cy; y >= cy-1; y--) html += '<option value="' + y + '">' + y + '</option>';
    html += '</select>';
    html += '</div>';
    html += '<button class="record-id-btn" onclick="_requestRecordId()">' + (lang==='en'?'Generate ID':'Tạo mã mới') + '</button>';
    html += '</div>';
    html += '<div id="rid-result" class="record-id-result" style="display:none"></div>';
    html += '</div>';
    html += '</div>';

    // Group by category
    var groups = {};
    schemas.forEach(function(s){
      var cat = s.category || 'other';
      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });

    var catLabels = {
      production: lang==='en'?'Production':'Sản xuất',
      quality: lang==='en'?'Quality':'Chất lượng',
      maintenance: lang==='en'?'Maintenance':'Bảo trì',
      hr: lang==='en'?'HR & Training':'Nhân sự & Đào tạo',
      logistics: lang==='en'?'Logistics':'Kho vận',
      safety: lang==='en'?'Safety':'An toàn',
      other: lang==='en'?'Other':'Khác'
    };

    Object.keys(groups).forEach(function(cat){
      var cfg = FORM_COLORS[cat] || {bg:'#f8f9fa', border:'#adb5bd', icon:'📄'};
      html += '<div class="forms-group">';
      html += '<h2 class="forms-group-title"><span class="forms-group-icon">' + cfg.icon + '</span> ' + (catLabels[cat]||cat) + '</h2>';
      html += '<div class="forms-grid">';
      groups[cat].forEach(function(s){
        var entries = (_formEntries[s.form_code]||[]).length;
        var freqLabel = {daily:'Hàng ngày',per_shift:'Mỗi ca',per_event:'Mỗi sự kiện',weekly:'Hàng tuần',monthly:'Hàng tháng',periodic:'Định kỳ'};
        html += '<div class="form-card" onclick="renderOnlineForms(\'' + s.form_code + '\')" style="border-left:4px solid ' + cfg.border + '">';
        html += '<div class="form-card-header">';
        html += '<span class="form-card-code">' + s.form_code + '</span>';
        html += '<span class="form-card-freq">' + (freqLabel[s.frequency]||s.frequency||'') + '</span>';
        html += '</div>';
        html += '<div class="form-card-title">' + (lang==='en'?s.title:s.title_vi||s.title) + '</div>';
        html += '<div class="form-card-desc">' + (s.description||'') + '</div>';
        html += '<div class="form-card-footer">';
        html += '<span class="form-card-ref">📎 ' + (s.sop_ref||'') + '</span>';
        if(entries > 0) html += '<span class="form-card-entries">' + entries + ' ' + (lang==='en'?'entries':'bản ghi') + '</span>';
        html += '<button class="form-card-btn">' + (lang==='en'?'Fill form':'Nhập form') + ' →</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    });

    html += '</div>';
    page.innerHTML = html;
  });
};

// ═══════════════════════════════════════════════════
// LOAD FORM SCHEMAS
// ═══════════════════════════════════════════════════
function _loadFormSchemaList(cb){
  var cached = Object.values(_formSchemas);
  if(cached.length > 0) return cb(cached);
  // Fetch from API
  fetch('api.php?action=online_form_list')
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.ok && d.forms){
        d.forms.forEach(function(s){ _formSchemas[s.form_code] = s; });
        if(d.entries) _formEntries = d.entries;
        cb(d.forms);
      } else {
        cb([]);
      }
    })
    .catch(function(){ cb(cached); });
}

function _loadAndRenderForm(code, page){
  var schema = _formSchemas[code];
  if(schema){
    _renderFormEntry(schema, page);
    return;
  }
  fetch('api.php?action=online_form_schema&code=' + encodeURIComponent(code))
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.ok && d.schema){
        _formSchemas[code] = d.schema;
        _renderFormEntry(d.schema, page);
      }
    });
}

// ═══════════════════════════════════════════════════
// RENDER FORM ENTRY (the actual form)
// ═══════════════════════════════════════════════════
function _renderFormEntry(schema, page){
  _currentForm = schema.form_code;
  _currentEntry = {};
  _tableRowCounters = {};
  _formDirty = false;

  var cfg = FORM_COLORS[schema.category] || {bg:'#f8f9fa', border:'#adb5bd', icon:'📄'};
  var html = '<div class="form-entry-page">';

  // Back button + header
  html += '<div class="form-entry-topbar">';
  html += '<button class="form-back-btn" onclick="renderOnlineForms()">← ' + (lang==='en'?'Back':'Quay lại') + '</button>';
  html += '<div class="form-entry-meta">';
  html += '<span class="form-code-badge" style="background:' + cfg.bg + ';border:1px solid ' + cfg.border + ';color:' + cfg.border + '">' + schema.form_code + '</span>';
  html += '<span class="form-version-badge">v' + (schema.version||'1') + '</span>';
  html += '</div>';
  html += '</div>';

  // Form header card
  html += '<div class="form-entry-header" style="border-left:4px solid ' + cfg.border + '">';
  html += '<h1>' + cfg.icon + ' ' + (lang==='en'?schema.title:schema.title_vi||schema.title) + '</h1>';
  html += '<p>' + (schema.description||'') + '</p>';
  html += '</div>';

  // Form body
  html += '<form id="online-form-body" class="form-entry-body" onsubmit="return _onlineFormSubmit(event)" autocomplete="off">';

  schema.fields.forEach(function(field){
    html += _renderField(field, schema);
  });

  // Action buttons
  html += '<div class="form-actions">';
  html += '<button type="submit" class="form-submit-btn">💾 ' + (lang==='en'?'Save & Submit':'Lưu & Gửi') + '</button>';
  html += '<button type="button" class="form-draft-btn" onclick="_onlineFormSaveDraft()">📝 ' + (lang==='en'?'Save Draft':'Lưu nháp') + '</button>';
  html += '<button type="button" class="form-clear-btn" onclick="_onlineFormClear()">🗑 ' + (lang==='en'?'Clear':'Xóa') + '</button>';
  html += '</div>';

  html += '</form>';

  // Recent entries
  html += _renderRecentEntries(schema);

  html += '</div>';
  page.innerHTML = html;

  // Set defaults
  _applyDefaults(schema);
}

// ═══════════════════════════════════════════════════
// RENDER INDIVIDUAL FIELD
// ═══════════════════════════════════════════════════
function _renderField(field, schema){
  if(field.show_if){
    // Conditional field - will be shown/hidden by JS
  }
  var html = '';
  var req = field.required ? ' <span class="form-req">*</span>' : '';
  var showIf = field.show_if ? ' data-show-if="' + field.show_if.field + '" data-show-value="' + field.show_if.value + '" style="display:none"' : '';
  var fid = 'of-' + field.id;

  switch(field.type){
    case 'text':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="text" id="' + fid + '" name="' + field.id + '" placeholder="' + (field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '</div>';
      break;

    case 'number':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="number" id="' + fid + '" name="' + field.id + '" placeholder="' + (field.placeholder||'') + '"' +
        (field.min!=null?' min="'+field.min+'"':'') + (field.max!=null?' max="'+field.max+'"':'') +
        (field.step?' step="'+field.step+'"':'') + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '</div>';
      break;

    case 'date':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="date" id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '</div>';
      break;

    case 'time':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="time" id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '</div>';
      break;

    case 'select':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<select id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '<option value="">— ' + (lang==='en'?'Select':'Chọn') + ' —</option>';
      (field.options||[]).forEach(function(opt){
        html += '<option value="' + opt.value + '">' + opt.label + '</option>';
      });
      html += '</select>';
      html += '</div>';
      break;

    case 'textarea':
      html += '<div class="form-field"' + showIf + '>';
      html += '<label for="' + fid + '">' + field.label + req + '</label>';
      html += '<textarea id="' + fid + '" name="' + field.id + '" rows="' + (field.rows||3) + '" placeholder="' + (field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></textarea>';
      html += '</div>';
      break;

    case 'checkbox':
      html += '<div class="form-field form-field-check"' + showIf + '>';
      html += '<label class="form-check-label"><input type="checkbox" id="' + fid + '" name="' + field.id + '" onchange="_onlineFieldChange(this)"> ' + field.label + '</label>';
      html += '</div>';
      break;

    case 'group':
      html += '<div class="form-field-group"' + showIf + '>';
      html += '<div class="form-group-title">' + field.label + '</div>';
      html += '<div class="form-group-grid">';
      (field.fields||[]).forEach(function(sub){
        html += _renderField(sub, schema);
      });
      html += '</div></div>';
      break;

    case 'table':
      html += _renderTableField(field);
      break;
  }
  return html;
}

// ═══════════════════════════════════════════════════
// RENDER TABLE FIELD (dynamic rows)
// ═══════════════════════════════════════════════════
function _renderTableField(field){
  var tid = 'of-table-' + field.id;
  _tableRowCounters[field.id] = 0;

  var html = '<div class="form-field form-field-table">';
  html += '<div class="form-table-header">';
  html += '<label>' + field.label + '</label>';
  html += '<button type="button" class="form-table-add" onclick="_addTableRow(\'' + field.id + '\')">+ ' + (lang==='en'?'Add row':'Thêm dòng') + '</button>';
  html += '</div>';
  html += '<div class="form-table-wrap"><table class="form-data-table" id="' + tid + '">';
  html += '<thead><tr>';
  (field.columns||[]).forEach(function(col){
    html += '<th style="width:' + (col.width||'auto') + '">' + col.label + '</th>';
  });
  html += '<th style="width:40px"></th></tr></thead>';
  html += '<tbody id="' + tid + '-body"></tbody>';
  html += '</table></div>';
  html += '</div>';

  // Store column def globally for addRow
  window['_tblCols_' + field.id] = field.columns;
  return html;
}

window._addTableRow = function(fieldId){
  var cols = window['_tblCols_' + fieldId];
  if(!cols) return;
  var tbody = document.getElementById('of-table-' + fieldId + '-body');
  if(!tbody) return;
  var idx = _tableRowCounters[fieldId] || 0;
  _tableRowCounters[fieldId] = idx + 1;

  var tr = document.createElement('tr');
  tr.setAttribute('data-row', idx);
  var cellsHtml = '';
  cols.forEach(function(col){
    cellsHtml += '<td>';
    var name = fieldId + '[' + idx + '].' + col.id;
    if(col.type === 'select'){
      cellsHtml += '<select name="' + name + '" onchange="_onlineFieldChange(this)">';
      cellsHtml += '<option value="">—</option>';
      (col.options||[]).forEach(function(opt){
        cellsHtml += '<option value="' + opt.value + '"' + (opt.color?' style="color:'+opt.color+'"':'') + '>' + opt.label + '</option>';
      });
      cellsHtml += '</select>';
    } else if(col.type === 'date'){
      cellsHtml += '<input type="date" name="' + name + '" onchange="_onlineFieldChange(this)">';
    } else {
      cellsHtml += '<input type="text" name="' + name + '" placeholder="' + (col.placeholder||'') + '" onchange="_onlineFieldChange(this)">';
    }
    cellsHtml += '</td>';
  });
  cellsHtml += '<td><button type="button" class="form-row-del" onclick="this.closest(\'tr\').remove()">✕</button></td>';
  tr.innerHTML = cellsHtml;
  tbody.appendChild(tr);
  _formDirty = true;
};

// ═══════════════════════════════════════════════════
// FIELD CHANGE HANDLER (conditional visibility, dirty tracking)
// ═══════════════════════════════════════════════════
window._onlineFieldChange = function(el){
  _formDirty = true;
  // Check conditional fields
  var name = el.name || el.id.replace('of-','');
  document.querySelectorAll('[data-show-if="' + name + '"]').forEach(function(div){
    var expectedVal = div.getAttribute('data-show-value');
    var actual = el.type === 'checkbox' ? String(el.checked) : el.value;
    div.style.display = (actual === expectedVal) ? '' : 'none';
  });
};

// ═══════════════════════════════════════════════════
// APPLY DEFAULTS
// ═══════════════════════════════════════════════════
function _applyDefaults(schema){
  schema.fields.forEach(function(field){
    if(field.default === 'today' && field.type === 'date'){
      var el = document.getElementById('of-' + field.id);
      if(el) el.value = new Date().toISOString().slice(0,10);
    }
    if(field.type === 'group' && field.fields){
      field.fields.forEach(function(sub){
        if(sub.default === 'today' && sub.type === 'date'){
          var el2 = document.getElementById('of-' + sub.id);
          if(el2) el2.value = new Date().toISOString().slice(0,10);
        }
      });
    }
  });
}

// ═══════════════════════════════════════════════════
// COLLECT FORM DATA
// ═══════════════════════════════════════════════════
function _collectFormData(schema){
  var data = {};
  var form = document.getElementById('online-form-body');
  if(!form) return data;

  schema.fields.forEach(function(field){
    if(field.type === 'table'){
      data[field.id] = _collectTableData(field);
    } else if(field.type === 'group'){
      (field.fields||[]).forEach(function(sub){
        var el = document.getElementById('of-' + sub.id);
        if(el) data[sub.id] = (sub.type === 'number') ? (el.value===''?null:Number(el.value)) : el.value;
      });
    } else if(field.type === 'checkbox'){
      var el = document.getElementById('of-' + field.id);
      data[field.id] = el ? el.checked : false;
    } else {
      var el = document.getElementById('of-' + field.id);
      if(el) data[field.id] = (field.type === 'number') ? (el.value===''?null:Number(el.value)) : el.value;
    }
  });

  // Auto fields
  data.submitted_by = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.display_name || currentUser.username) : 'unknown';
  data.submitted_at = new Date().toISOString();
  data.entry_id = schema.form_code + '-' + Date.now();
  data.form_code = schema.form_code;
  return data;
}

function _collectTableData(field){
  var rows = [];
  var tbody = document.getElementById('of-table-' + field.id + '-body');
  if(!tbody) return rows;
  tbody.querySelectorAll('tr').forEach(function(tr){
    var row = {};
    var hasData = false;
    (field.columns||[]).forEach(function(col){
      var input = tr.querySelector('[name*=".' + col.id + '"]');
      if(input){
        row[col.id] = input.value;
        if(input.value) hasData = true;
      }
    });
    if(hasData) rows.push(row);
  });
  return rows;
}

// ═══════════════════════════════════════════════════
// SUBMIT / SAVE / CLEAR
// ═══════════════════════════════════════════════════
window._onlineFormSubmit = function(e){
  e.preventDefault();
  var schema = _formSchemas[_currentForm];
  if(!schema) return false;
  var data = _collectFormData(schema);

  // Validate required
  var missing = [];
  schema.fields.forEach(function(f){
    if(f.required && f.type !== 'table' && f.type !== 'group'){
      if(!data[f.id] && data[f.id] !== 0 && data[f.id] !== false) missing.push(f.label);
    }
  });
  if(missing.length > 0){
    alert((lang==='en'?'Missing required fields: ':'Thiếu trường bắt buộc: ') + missing.join(', '));
    return false;
  }

  // Submit to API
  fetch('api.php?action=online_form_submit', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({form_code: _currentForm, data: data, status: 'submitted'})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok){
      // Add to local cache
      if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
      _formEntries[_currentForm].unshift(data);
      _formDirty = false;
      _showFormToast(lang==='en'?'Form submitted successfully!':'Form đã gửi thành công!', 'success');
      // Re-render to show new entry
      var page = document.getElementById('page-forms');
      _renderFormEntry(schema, page);
    } else {
      _showFormToast((lang==='en'?'Error: ':'Lỗi: ') + (d.error||'Unknown'), 'error');
    }
  })
  .catch(function(err){
    // Fallback: save locally
    if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
    _formEntries[_currentForm].unshift(data);
    _saveLocalEntries();
    _formDirty = false;
    _showFormToast(lang==='en'?'Saved locally (offline)':'Đã lưu cục bộ (offline)', 'warn');
    var page = document.getElementById('page-forms');
    _renderFormEntry(schema, page);
  });
  return false;
};

window._onlineFormSaveDraft = function(){
  var schema = _formSchemas[_currentForm];
  if(!schema) return;
  var data = _collectFormData(schema);
  data._draft = true;
  try{
    localStorage.setItem('qms_form_draft_' + _currentForm, JSON.stringify(data));
    _showFormToast(lang==='en'?'Draft saved':'Đã lưu nháp', 'success');
  }catch(e){}
};

window._onlineFormClear = function(){
  if(_formDirty && !confirm(lang==='en'?'Discard changes?':'Hủy thay đổi?')) return;
  var schema = _formSchemas[_currentForm];
  if(!schema) return;
  var page = document.getElementById('page-forms');
  _renderFormEntry(schema, page);
};

// ═══════════════════════════════════════════════════
// RECENT ENTRIES LIST
// ═══════════════════════════════════════════════════
function _renderRecentEntries(schema){
  var entries = _formEntries[schema.form_code] || [];
  if(entries.length === 0) return '';
  var html = '<div class="form-recent">';
  html += '<h2 class="form-recent-title">📊 ' + (lang==='en'?'Recent Entries':'Bản ghi gần đây') + ' <span class="form-recent-count">' + entries.length + '</span></h2>';
  html += '<div class="form-recent-list">';
  entries.slice(0, 10).forEach(function(entry, i){
    var dt = entry.submitted_at ? new Date(entry.submitted_at).toLocaleString('vi-VN') : '—';
    html += '<div class="form-recent-item">';
    html += '<div class="form-recent-id">' + (entry.entry_id||'#'+(i+1)) + '</div>';
    html += '<div class="form-recent-info">';
    html += '<span>' + (entry.submitted_by||'—') + '</span>';
    html += '<span>' + dt + '</span>';
    html += '</div>';
    if(entry._draft) html += '<span class="form-draft-badge">DRAFT</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ═══════════════════════════════════════════════════
// LOCAL STORAGE FALLBACK
// ═══════════════════════════════════════════════════
function _saveLocalEntries(){
  try{
    localStorage.setItem('qms_form_entries', JSON.stringify(_formEntries));
  }catch(e){}
}

function _loadLocalEntries(){
  try{
    var raw = localStorage.getItem('qms_form_entries');
    if(raw) _formEntries = JSON.parse(raw);
  }catch(e){}
}

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════
function _showFormToast(msg, type){
  var toast = document.createElement('div');
  toast.className = 'form-toast form-toast-' + (type||'info');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('show'); }, 10);
  setTimeout(function(){
    toast.classList.remove('show');
    setTimeout(function(){ toast.remove(); }, 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════
// RECORD-ID REQUEST
// ═══════════════════════════════════════════════════
window._requestRecordId = function(){
  var prefix = document.getElementById('rid-prefix').value;
  var year = document.getElementById('rid-year').value;
  var resultDiv = document.getElementById('rid-result');
  if(!resultDiv) return;

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<div class="record-id-loading">' + (lang==='en'?'Generating...':'Đang tạo mã...') + '</div>';

  var csrfToken = '';
  try { csrfToken = typeof window._csrfToken === 'string' ? window._csrfToken : ''; } catch(e){}

  fetch('api.php?action=record_id_next', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ prefix: prefix, year: year })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok){
      var map = RECORD_FORM_MAP[prefix] || {};
      var formCode = d.form_code || map.form || '';
      var rid = d.record_id;
      var suggested = d.suggested_filename || '';

      var html = '<div class="record-id-success">';
      html += '<div class="record-id-badge">' + rid + '</div>';
      html += '<div class="record-id-detail">';
      if(suggested){
        html += '<div class="record-id-filename">';
        html += '<label>' + (lang==='en'?'Suggested filename':'Tên file đề xuất') + ':</label>';
        html += '<code id="rid-filename">' + suggested + '</code>';
        html += '<button class="record-id-copy" onclick="_copyRecordFilename()" title="Copy">' + (lang==='en'?'Copy':'Sao chép') + '</button>';
        html += '</div>';
      }
      if(formCode){
        // Use blank_form_path from API (resolved from form_control_registry)
        var blankPath = d.blank_form_path || null;
        var blankName = d.blank_form_filename || (formCode + '.xlsx');
        if(blankPath){
          html += '<div class="record-id-download">';
          html += '<a download="' + blankName + '" href="../' + blankPath + '" class="record-id-download-btn">';
          html += '↓ ' + (lang==='en'?'Download blank ':'Tải form blank ') + formCode;
          html += '</a>';
          html += '</div>';
        }
      }
      html += '</div>';
      html += '</div>';
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = '<div class="record-id-error">' + (lang==='en'?'Error: ':'Lỗi: ') + (d.error||'Unknown') + '</div>';
    }
  })
  .catch(function(err){
    resultDiv.innerHTML = '<div class="record-id-error">' + (lang==='en'?'Network error':'Lỗi kết nối') + '</div>';
  });
};

window._copyRecordFilename = function(){
  var el = document.getElementById('rid-filename');
  if(!el) return;
  var text = el.textContent || el.innerText;
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(function(){
      _showFormToast(lang==='en'?'Copied!':'Đã sao chép!', 'success');
    });
  } else {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    _showFormToast(lang==='en'?'Copied!':'Đã sao chép!', 'success');
  }
};

function _getFormFolder(code){
  // FRM-631 → 06-FRM-600
  var num = parseInt(code.replace('FRM-',''), 10);
  var series = Math.floor(num / 100) * 100;
  var prefix = String(Math.floor(num / 100)).padStart(2, '0');
  return prefix + '-FRM-' + series;
}

// Init
_loadLocalEntries();

})();

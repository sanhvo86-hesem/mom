/* ===================================================================
   09-online-forms.js -- Form Hub Orchestrator (Thin Shell)
   HESEM QMS Portal -- Tab routing, schema loading, shared form entry
   Delegates rendering to: 09b (Fill/Download), 09c (Record-ID),
                            09d (Upload/Verify), 09e (SO-JO-WO)
   =================================================================== */

(function(){
'use strict';

// ── Shared State (accessible to tab modules via window._fhState) ──
var _formSchemas = {};
var _formEntries = {};
var _currentForm = null;
var _currentEntry = null;
var _formDirty = false;
var _tableRowCounters = {};
var _activeTab = 'catalog';
var _activeFilter = 'all';
var _searchQuery = '';

// Expose state for tab modules
window._fhState = {
  get schemas(){ return _formSchemas; },
  get entries(){ return _formEntries; },
  get currentForm(){ return _currentForm; },
  set currentForm(v){ _currentForm = v; },
  get currentEntry(){ return _currentEntry; },
  set currentEntry(v){ _currentEntry = v; },
  get formDirty(){ return _formDirty; },
  set formDirty(v){ _formDirty = v; },
  get tableRowCounters(){ return _tableRowCounters; },
  get activeTab(){ return _activeTab; },
  set activeTab(v){ _activeTab = v; },
  get activeFilter(){ return _activeFilter; },
  set activeFilter(v){ _activeFilter = v; },
  get searchQuery(){ return _searchQuery; },
  set searchQuery(v){ _searchQuery = v; }
};

// ── Constants ──
var FORM_COLORS = {
  production:  {bg:'#e7f5ff', border:'#1971c2', icon:'&#x1F3ED;', label:'Sản xuất',           labelEn:'Production'},
  quality:     {bg:'#ebfbee', border:'#2f9e44', icon:'&#x1F50D;', label:'Chất lượng',         labelEn:'Quality'},
  maintenance: {bg:'#fff9db', border:'#e67700', icon:'&#x1F527;', label:'Bảo trì',            labelEn:'Maintenance'},
  hr:          {bg:'#f3f0ff', border:'#7950f2', icon:'&#x1F465;', label:'Nhân sự & Đào tạo', labelEn:'HR & Training'},
  logistics:   {bg:'#fff4e6', border:'#d9480f', icon:'&#x1F4E6;', label:'Kho vận',            labelEn:'Logistics'},
  safety:      {bg:'#fff5f5', border:'#e03131', icon:'&#x26A0;',  label:'An toàn',            labelEn:'Safety'}
};
window._fhFormColors = FORM_COLORS;

var TAB_CONFIG = [
  {id:'catalog',       icon:'&#x1F4CB;', labelVi:'Danh mục Form',          labelEn:'Form Catalog'},
  {id:'fill-download', icon:'&#x270F;',  labelVi:'Điền & Tải Form',       labelEn:'Fill & Download'},
  {id:'record-id',     icon:'&#x1F522;', labelVi:'Trợ lý tạo mã',        labelEn:'ID Generator'},
  {id:'upload',        icon:'&#x1F4E4;', labelVi:'Tải lên & Kiểm tra',   labelEn:'Upload & Verify'}
];

// ===================================================================
// MAIN ENTRY -- renderOnlineForms (backward-compatible global)
// ===================================================================
window.renderOnlineForms = function(formCode){
  var page = document.getElementById('page-forms');
  if(!page) return;

  // Direct form entry (deep-link from sidebar or other tab)
  if(formCode){
    _loadAndRenderForm(formCode, page);
    return;
  }

  // Load schemas then render hub
  _loadFormSchemaList(function(schemas){
    _renderFormHub(schemas, page);
  });
};

// ===================================================================
// HUB LAYOUT -- Hero, KPIs, Tab Bar, Content Area
// ===================================================================
function _renderFormHub(schemas, page){
  var h = '';
  h += '<div class="fh">';

  // ── Hero Banner ──
  h += '<div class="fh-hero">';
  h += '<div>';
  h += '<div class="fh-hero-kicker">HESEM QMS &mdash; ANNEX-137 Compliant</div>';
  h += '<h1>' + _t('Kiểm soát chứng cứ &mdash; Trung tâm quản lý biểu mẫu','Evidence Control &mdash; Central Form Management') + '</h1>';
  h += '<p>' + _t(
    'Tao ho so, xin ma, dien form online, tai Excel, upload evidence &mdash; tat ca tai day. Ten file tu dong theo ANNEX-137.',
    'Create records, request IDs, fill forms online, download Excel, upload evidence &mdash; all in one place. Filenames auto-generated per ANNEX-137.'
  ) + '</p>';
  h += '</div>';

  // Hero side stats
  var totalForms = schemas.length;
  var onlineForms = schemas.filter(function(s){ return s.online !== false; }).length;
  var totalEntries = 0;
  Object.keys(_formEntries).forEach(function(k){ totalEntries += (_formEntries[k]||[]).length; });

  h += '<div class="fh-hero-side">';
  h += '<div class="fh-side-card"><span class="fh-side-label">' + _t('Form khả dụng','Available') + '</span><strong>' + totalForms + '</strong><div>' + onlineForms + ' online</div></div>';
  h += '<div class="fh-side-card"><span class="fh-side-label">' + _t('Bản ghi','Entries') + '</span><strong>' + totalEntries + '</strong><div>' + _t('Hôm nay','Today') + '</div></div>';
  h += '</div>';
  h += '</div>';

  // ── KPI Summary (5 cards) ──
  var offlineForms = totalForms - onlineForms;
  var drafts = 0, submitted = 0;
  Object.keys(_formEntries).forEach(function(k){
    (_formEntries[k]||[]).forEach(function(e){
      if(e._draft) drafts++; else submitted++;
    });
  });

  h += '<div class="fh-summary">';
  h += _kpiCard('blue',   totalForms,   _t('Tổng form','Total Forms'),         _t('Đang hiệu lực','Active'));
  h += _kpiCard('green',  onlineForms,  _t('Form online','Online Forms'),      _t('Điền trực tuyến','Fill online'));
  h += _kpiCard('amber',  offlineForms, _t('Form Excel','Offline Forms'),      _t('Tải về điền','Download'));
  h += _kpiCard('purple', 0,            _t('Mã đã cấp','Allocated IDs'),       _t('AllocationTracker','Tracker'));
  h += _kpiCard('red',    drafts,       _t('Chờ nộp','Pending Submissions'),   _t('Nháp + chờ xử lý','Draft + pending'));
  h += '</div>';

  // ── Tab Bar ──
  h += '<div class="fh-tabs" id="fh-tabs">';
  TAB_CONFIG.forEach(function(tab){
    var cls = tab.id === _activeTab ? ' active' : '';
    h += '<button class="fh-tab' + cls + '" data-tab="' + tab.id + '" onclick="_fhSwitchTab(\'' + tab.id + '\')">';
    h += '<span class="fh-tab-icon">' + tab.icon + '</span>';
    h += _t(tab.labelVi, tab.labelEn);
    if(tab.id === 'catalog') h += ' <span class="fh-tab-count">' + totalForms + '</span>';
    h += '</button>';
  });
  h += '</div>';

  // ── Tab Content Panels ──
  h += '<div id="fh-tab-catalog" class="fh-panel"></div>';
  h += '<div id="fh-tab-fill-download" class="fh-panel"></div>';
  h += '<div id="fh-tab-record-id" class="fh-panel"></div>';
  h += '<div id="fh-tab-upload" class="fh-panel"></div>';
  h += '<div id="fh-tab-so-jo-wo" class="fh-panel"></div>';

  h += '</div>';
  page.innerHTML = h;

  // Render active tab
  _activateTab(_activeTab, schemas);
}

function _kpiCard(color, value, label, sub){
  return '<div class="fh-kpi fh-kpi-' + color + '">' +
    '<div class="fh-kpi-label">' + label + '</div>' +
    '<strong>' + value + '</strong>' +
    '<span>' + sub + '</span>' +
    '</div>';
}

// ===================================================================
// TAB SWITCHING -- delegates rendering to external modules
// ===================================================================
window._fhSwitchTab = function(tabId){
  _activeTab = tabId;
  var schemas = Object.values(_formSchemas);
  _activateTab(tabId, schemas);
};

function _activateTab(tabId, schemas){
  // Toggle tab button active state
  document.querySelectorAll('.fh-tab').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  // Toggle panel visibility
  document.querySelectorAll('.fh-panel').forEach(function(p){
    p.classList.remove('active');
  });
  var panel = document.getElementById('fh-tab-' + tabId);
  if(panel) panel.classList.add('active');

  schemas = schemas || Object.values(_formSchemas);
  var entries = _formEntries;
  var container = panel;
  if(!container) return;

  // Delegate rendering -- only re-render if panel is empty or stale
  switch(tabId){
    case 'catalog':
      if(typeof window._renderFormCatalog === 'function'){
        window._renderFormCatalog(schemas, entries, container);
      } else {
        _renderCatalogFallback(schemas, container);
      }
      break;
    case 'fill-download':
      if(typeof window._renderFillDownload === 'function'){
        window._renderFillDownload(schemas, entries, container);
      } else {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b"><p>' + _t('Module điền/tải form chưa tải.','Fill/Download module not loaded.') + '</p></div>';
      }
      break;
    case 'record-id':
      if(typeof window._renderRecordIdGenerator === 'function'){
        window._renderRecordIdGenerator(schemas, entries, container);
      } else {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b"><p>' + _t('Module cấp mã chưa tải.','Record ID module not loaded.') + '</p></div>';
      }
      break;
    case 'upload':
      if(typeof window._renderUploadVerify === 'function'){
        window._renderUploadVerify(schemas, entries, container);
      } else {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b"><p>' + _t('Module upload chưa tải.','Upload module not loaded.') + '</p></div>';
      }
      break;
    case 'so-jo-wo':
      if(typeof window._renderSoJoWoDashboard === 'function'){
        window._renderSoJoWoDashboard(schemas, entries, container);
      } else {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b"><p>' + _t('Module SO/JO/WO chưa tải.','SO/JO/WO module not loaded.') + '</p></div>';
      }
      break;
  }
}

// ===================================================================
// CATALOG FALLBACK (inline, used when 09a module not loaded)
// ===================================================================
function _renderCatalogFallback(schemas, container){
  var h = '';

  // Filter bar
  h += '<div class="fh-filter-bar">';
  h += '<input type="text" class="fh-search" id="fh-search" placeholder="' + _t('Tìm form theo mã, tên, SOP...','Search by code, name, SOP...') + '" oninput="_fhFilterForms()" value="' + _escHtml(_searchQuery) + '">';
  h += '<div class="fh-filter-chips">';
  h += '<button class="fh-chip' + (_activeFilter==='all'?' active':'') + '" onclick="_fhSetFilter(\'all\')">' + _t('Tất cả','All') + '</button>';
  Object.keys(FORM_COLORS).forEach(function(cat){
    var cfg = FORM_COLORS[cat];
    h += '<button class="fh-chip' + (_activeFilter===cat?' active':'') + '" onclick="_fhSetFilter(\'' + cat + '\')">' + cfg.icon + ' ' + _t(cfg.label, cfg.labelEn) + '</button>';
  });
  h += '</div>';
  h += '</div>';

  // Form cards
  h += '<div id="fh-forms-container">';
  h += _renderFormCards(schemas);
  h += '</div>';

  container.innerHTML = h;
}

function _renderFormCards(schemas){
  var groups = {};
  schemas.forEach(function(s){
    if(_activeFilter !== 'all' && s.category !== _activeFilter) return;
    if(_searchQuery){
      var q = _searchQuery.toLowerCase();
      var match = (s.form_code||'').toLowerCase().indexOf(q) >= 0 ||
                  (s.title||'').toLowerCase().indexOf(q) >= 0 ||
                  (s.title_vi||'').toLowerCase().indexOf(q) >= 0 ||
                  (s.sop_ref||'').toLowerCase().indexOf(q) >= 0 ||
                  (s.description||'').toLowerCase().indexOf(q) >= 0;
      if(!match) return;
    }
    var cat = s.category || 'other';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });

  var h = '';
  var catOrder = ['production','quality','maintenance','hr','logistics','safety','other'];
  catOrder.forEach(function(cat){
    if(!groups[cat] || groups[cat].length === 0) return;
    var cfg = FORM_COLORS[cat] || {bg:'#f8f9fa', border:'#adb5bd', icon:'&#x1F4C4;', label:cat, labelEn:cat};
    var freqLabel = {daily:'Hang ngay',per_shift:'Moi ca',per_event:'Moi su kien',weekly:'Hang tuan',monthly:'Hang thang',periodic:'Dinh ky'};

    h += '<div class="forms-group">';
    h += '<h2 class="forms-group-title"><span class="forms-group-icon">' + cfg.icon + '</span> ' + _t(cfg.label, cfg.labelEn) + ' <span style="font-size:11px;color:#64748b;font-weight:400;margin-left:4px">(' + groups[cat].length + ')</span></h2>';
    h += '<div class="forms-grid">';

    groups[cat].forEach(function(s){
      var entries = (_formEntries[s.form_code]||[]).length;
      var isOnline = s.online !== false;

      h += '<div class="form-card" style="border-left:4px solid ' + cfg.border + '">';
      h += '<span class="form-card-type ' + (isOnline?'form-card-online':'form-card-excel') + '">' + (isOnline?'ONLINE':'EXCEL') + '</span>';
      h += '<div class="form-card-header">';
      h += '<span class="form-card-code">' + _escHtml(s.form_code) + '</span>';
      h += '<span class="form-card-freq">' + (freqLabel[s.frequency]||s.frequency||'') + '</span>';
      h += '</div>';
      h += '<div class="form-card-title">' + _t(s.title_vi||s.title, s.title) + '</div>';
      h += '<div class="form-card-desc">' + _escHtml(s.description||'') + '</div>';
      h += '<div class="form-card-footer">';
      h += '<span class="form-card-ref">' + _escHtml(s.sop_ref||'') + '</span>';
      if(entries > 0) h += '<span class="form-card-entries">' + entries + ' ' + _t('bản ghi','entries') + '</span>';

      if(isOnline){
        h += '<button class="form-card-btn" onclick="renderOnlineForms(\'' + _escHtml(s.form_code) + '\')">' + _t('Điền online','Fill online') + ' &rarr;</button>';
      } else {
        h += '<button class="form-card-btn" onclick="_fhDownloadBlank(\'' + _escHtml(s.form_code) + '\')">' + _t('Tải về','Download') + ' &darr;</button>';
      }
      h += '</div>';
      h += '</div>';
    });

    h += '</div></div>';
  });

  if(!h) h = '<div style="text-align:center;padding:40px;color:#64748b"><p style="font-size:32px;margin-bottom:8px">&#x1F50D;</p><p>' + _t('Không tìm thấy form nào','No forms found') + '</p></div>';
  return h;
}

// ===================================================================
// FILTER & SEARCH (used by catalog fallback)
// ===================================================================
window._fhSetFilter = function(cat){
  _activeFilter = cat;
  document.querySelectorAll('.fh-chip').forEach(function(c){ c.classList.remove('active'); });
  var btn = document.querySelector('.fh-chip[onclick*="' + cat + '"]');
  if(btn) btn.classList.add('active');
  _fhFilterForms();
};

window._fhFilterForms = function(){
  var input = document.getElementById('fh-search');
  _searchQuery = input ? input.value : '';
  var container = document.getElementById('fh-forms-container');
  if(!container) return;
  container.innerHTML = _renderFormCards(Object.values(_formSchemas));
};

// ===================================================================
// DOWNLOAD BLANK FORM (global, used by catalog + Tab 2)
// ===================================================================
window._fhDownloadBlank = function(formCode){
  var schema = _formSchemas[formCode];
  if(schema && schema.blank_path){
    var a = document.createElement('a');
    a.href = '../' + schema.blank_path;
    a.download = schema.blank_filename || (formCode + '.xlsx');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    _showFormToast(_t('Đang tải ','Downloading ') + formCode, 'info');
  } else {
    _showFormToast(_t('Form blank chưa có sẵn. Liên hệ QMS Admin.','Blank form not available. Contact QMS Admin.'), 'warn');
  }
};

// ===================================================================
// SCHEMA LOADING
// ===================================================================
function _loadFormSchemaList(cb){
  var cached = Object.values(_formSchemas);
  if(cached.length > 0) return cb(cached);

  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  if(callFn){
    callFn('online_form_list', {}, 'GET').then(function(d){
      if(d && d.ok && d.forms){
        d.forms.forEach(function(s){ _formSchemas[s.form_code] = s; });
        if(d.entries) _formEntries = d.entries;
        cb(d.forms);
      } else {
        cb([]);
      }
    }).catch(function(){ cb(cached); });
  } else {
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
}

function _loadAndRenderForm(code, page){
  var schema = _formSchemas[code];
  if(schema){
    _renderFormEntry(schema, page);
    return;
  }
  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  if(callFn){
    callFn('online_form_schema', {code: code}, 'GET').then(function(d){
      if(d && d.ok && d.schema){
        _formSchemas[code] = d.schema;
        _renderFormEntry(d.schema, page);
      }
    }).catch(function(){});
  } else {
    fetch('api.php?action=online_form_schema&code=' + encodeURIComponent(code))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.ok && d.schema){
          _formSchemas[code] = d.schema;
          _renderFormEntry(d.schema, page);
        }
      });
  }
}

// ===================================================================
// FORM ENTRY RENDERER (shared by Tab 2 online fill + direct links)
// ===================================================================
window._renderFormEntry = function(schema, page){
  _currentForm = schema.form_code;
  _currentEntry = {};
  _tableRowCounters = {};
  _formDirty = false;

  if(!page) page = document.getElementById('page-forms');
  if(!page) return;

  var cfg = FORM_COLORS[schema.category] || {bg:'#f8f9fa', border:'#adb5bd', icon:'&#x1F4C4;'};
  var html = '<div class="form-entry-page">';

  // Back button + header
  html += '<div class="form-entry-topbar">';
  html += '<button class="form-back-btn" onclick="renderOnlineForms()">&larr; ' + _t('Quay lại','Back') + '</button>';
  html += '<div class="form-entry-meta">';
  html += '<span class="form-code-badge" style="background:' + cfg.bg + ';border:1px solid ' + cfg.border + ';color:' + cfg.border + '">' + _escHtml(schema.form_code) + '</span>';
  html += '<span class="form-version-badge">v' + _escHtml(String(schema.version||'1')) + '</span>';
  html += '</div>';
  html += '</div>';

  // Form header card
  html += '<div class="form-entry-header" style="border-left:4px solid ' + cfg.border + '">';
  html += '<h1>' + cfg.icon + ' ' + _t(schema.title_vi||schema.title, schema.title) + '</h1>';
  html += '<p>' + _escHtml(schema.description||'') + '</p>';
  html += '</div>';

  // Form body
  html += '<form id="online-form-body" class="form-entry-body" onsubmit="return _onlineFormSubmit(event)" autocomplete="off">';
  (schema.fields || []).forEach(function(field){
    html += _renderField(field, schema);
  });

  html += '<div class="form-actions">';
  html += '<button type="submit" class="form-submit-btn">&#x1F4BE; ' + _t('Lưu & Gửi','Save & Submit') + '</button>';
  html += '<button type="button" class="form-draft-btn" onclick="_onlineFormSaveDraft()">&#x1F4DD; ' + _t('Lưu nháp','Save Draft') + '</button>';
  html += '<button type="button" class="form-clear-btn" onclick="_onlineFormClear()">&#x1F5D1; ' + _t('Xóa','Clear') + '</button>';
  html += '</div>';
  html += '</form>';

  html += _renderRecentEntries(schema);
  html += '</div>';
  page.innerHTML = html;
  _applyDefaults(schema);
};

// ── Field Rendering ──
function _renderField(field, schema){
  var html = '';
  var req = field.required ? ' <span class="form-req">*</span>' : '';
  var showIf = field.show_if ? ' data-show-if="' + _escHtml(field.show_if.field) + '" data-show-value="' + _escHtml(field.show_if.value) + '" style="display:none"' : '';
  var fid = 'of-' + field.id;

  switch(field.type){
    case 'text':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="text" id="' + fid + '" name="' + field.id + '" placeholder="' + _escHtml(field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></div>';
      break;
    case 'number':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="number" id="' + fid + '" name="' + field.id + '" placeholder="' + _escHtml(field.placeholder||'') + '"' +
        (field.min!=null?' min="'+field.min+'"':'') + (field.max!=null?' max="'+field.max+'"':'') +
        (field.step?' step="'+field.step+'"':'') + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></div>';
      break;
    case 'date':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="date" id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></div>';
      break;
    case 'time':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="time" id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></div>';
      break;
    case 'select':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<select id="' + fid + '" name="' + field.id + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)">';
      html += '<option value="">&mdash; ' + _t('Chọn','Select') + ' &mdash;</option>';
      (field.options||[]).forEach(function(opt){ html += '<option value="' + _escHtml(opt.value) + '">' + _escHtml(opt.label) + '</option>'; });
      html += '</select></div>';
      break;
    case 'textarea':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<textarea id="' + fid + '" name="' + field.id + '" rows="' + (field.rows||3) + '" placeholder="' + _escHtml(field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></textarea></div>';
      break;
    case 'checkbox':
      html += '<div class="form-field form-field-check"' + showIf + '><label class="form-check-label"><input type="checkbox" id="' + fid + '" name="' + field.id + '" onchange="_onlineFieldChange(this)"> ' + field.label + '</label></div>';
      break;
    case 'group':
      html += '<div class="form-field-group"' + showIf + '><div class="form-group-title">' + field.label + '</div><div class="form-group-grid">';
      (field.fields||[]).forEach(function(sub){ html += _renderField(sub, schema); });
      html += '</div></div>';
      break;
    case 'table':
      html += _renderTableField(field);
      break;
  }
  return html;
}

// ── Table Field ──
function _renderTableField(field){
  var tid = 'of-table-' + field.id;
  _tableRowCounters[field.id] = 0;
  var html = '<div class="form-field form-field-table">';
  html += '<div class="form-table-header"><label>' + field.label + '</label>';
  html += '<button type="button" class="form-table-add" onclick="_addTableRow(\'' + field.id + '\')">+ ' + _t('Thêm dòng','Add row') + '</button></div>';
  html += '<div class="form-table-wrap"><table class="form-data-table" id="' + tid + '"><thead><tr>';
  (field.columns||[]).forEach(function(col){ html += '<th style="width:' + (col.width||'auto') + '">' + col.label + '</th>'; });
  html += '<th style="width:40px"></th></tr></thead><tbody id="' + tid + '-body"></tbody></table></div></div>';
  window['_tblCols_' + field.id] = field.columns;
  return html;
}
window._renderTableField = _renderTableField;

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
      cellsHtml += '<select name="' + name + '" onchange="_onlineFieldChange(this)"><option value="">&mdash;</option>';
      (col.options||[]).forEach(function(opt){ cellsHtml += '<option value="' + _escHtml(opt.value) + '"' + (opt.color?' style="color:'+opt.color+'"':'') + '>' + _escHtml(opt.label) + '</option>'; });
      cellsHtml += '</select>';
    } else if(col.type === 'date'){
      cellsHtml += '<input type="date" name="' + name + '" onchange="_onlineFieldChange(this)">';
    } else {
      cellsHtml += '<input type="text" name="' + name + '" placeholder="' + _escHtml(col.placeholder||'') + '" onchange="_onlineFieldChange(this)">';
    }
    cellsHtml += '</td>';
  });
  cellsHtml += '<td><button type="button" class="form-row-del" onclick="this.closest(\'tr\').remove()">&#x2715;</button></td>';
  tr.innerHTML = cellsHtml;
  tbody.appendChild(tr);
  _formDirty = true;
};

window._onlineFieldChange = function(el){
  _formDirty = true;
  var name = el.name || el.id.replace('of-','');
  document.querySelectorAll('[data-show-if="' + name + '"]').forEach(function(div){
    var expectedVal = div.getAttribute('data-show-value');
    var actual = el.type === 'checkbox' ? String(el.checked) : el.value;
    div.style.display = (actual === expectedVal) ? '' : 'none';
  });
};

function _applyDefaults(schema){
  (schema.fields || []).forEach(function(field){
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

// ===================================================================
// FORM DATA COLLECTION & SUBMIT (shared by Tab 2 + direct fill)
// ===================================================================
window._collectFormData = function(schema){
  var data = {};
  var form = document.getElementById('online-form-body');
  if(!form) return data;
  (schema.fields || []).forEach(function(field){
    if(field.type === 'table') data[field.id] = _collectTableData(field);
    else if(field.type === 'group'){
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
  data.submitted_by = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.display_name || currentUser.username) : 'unknown';
  data.submitted_at = new Date().toISOString();
  data.entry_id = schema.form_code + '-' + Date.now();
  data.form_code = schema.form_code;
  return data;
};

function _collectTableData(field){
  var rows = [];
  var tbody = document.getElementById('of-table-' + field.id + '-body');
  if(!tbody) return rows;
  tbody.querySelectorAll('tr').forEach(function(tr){
    var row = {};
    var hasData = false;
    (field.columns||[]).forEach(function(col){
      var input = tr.querySelector('[name*=".' + col.id + '"]');
      if(input){ row[col.id] = input.value; if(input.value) hasData = true; }
    });
    if(hasData) rows.push(row);
  });
  return rows;
}

window._onlineFormSubmit = function(e){
  if(e) e.preventDefault();
  var schema = _formSchemas[_currentForm];
  if(!schema) return false;
  var data = _collectFormData(schema);
  var missing = [];
  (schema.fields || []).forEach(function(f){
    if(f.required && f.type !== 'table' && f.type !== 'group'){
      if(!data[f.id] && data[f.id] !== 0 && data[f.id] !== false) missing.push(f.label);
    }
  });
  if(missing.length > 0){
    alert(_t('Thiếu trường bắt buộc: ','Missing required fields: ') + missing.join(', '));
    return false;
  }

  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  var submitPayload = {form_code: _currentForm, data: data, status: 'submitted'};

  var handleSuccess = function(d){
    if(d && d.ok){
      if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
      _formEntries[_currentForm].unshift(data);
      _formDirty = false;
      _showFormToast(_t('Form đã gửi thành công!','Form submitted successfully!'), 'success');
      var page = document.getElementById('page-forms');
      _renderFormEntry(schema, page);
    } else {
      _showFormToast(_t('Lỗi: ','Error: ') + ((d && d.error)||'Unknown'), 'error');
    }
  };

  var handleOffline = function(){
    if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
    _formEntries[_currentForm].unshift(data);
    _saveLocalEntries();
    _formDirty = false;
    _showFormToast(_t('Đã lưu cục bộ (offline)','Saved locally (offline)'), 'warn');
    var page = document.getElementById('page-forms');
    _renderFormEntry(schema, page);
  };

  if(callFn){
    callFn('online_form_submit', submitPayload, 'POST').then(handleSuccess).catch(handleOffline);
  } else {
    fetch('api.php?action=online_form_submit', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(submitPayload)
    }).then(function(r){ return r.json(); }).then(handleSuccess).catch(handleOffline);
  }
  return false;
};

window._onlineFormSaveDraft = function(){
  var schema = _formSchemas[_currentForm];
  if(!schema) return;
  var data = _collectFormData(schema);
  data._draft = true;
  try{ localStorage.setItem('qms_form_draft_' + _currentForm, JSON.stringify(data)); _showFormToast(_t('Da luu nhap','Draft saved'), 'success'); }catch(e){}
};

window._onlineFormClear = function(){
  if(_formDirty && !confirm(_t('Huy thay doi?','Discard changes?'))) return;
  var schema = _formSchemas[_currentForm];
  if(!schema) return;
  var page = document.getElementById('page-forms');
  _renderFormEntry(schema, page);
};

function _renderRecentEntries(schema){
  var entries = _formEntries[schema.form_code] || [];
  if(entries.length === 0) return '';
  var html = '<div class="form-recent">';
  html += '<h2 class="form-recent-title">&#x1F4CA; ' + _t('Ban ghi gan day','Recent Entries') + ' <span class="form-recent-count">' + entries.length + '</span></h2>';
  html += '<div class="form-recent-list">';
  entries.slice(0, 10).forEach(function(entry, i){
    var dt = entry.submitted_at ? new Date(entry.submitted_at).toLocaleString('vi-VN') : '&mdash;';
    html += '<div class="form-recent-item">';
    html += '<div class="form-recent-id">' + _escHtml(entry.entry_id||'#'+(i+1)) + '</div>';
    html += '<div class="form-recent-info"><span>' + _escHtml(entry.submitted_by||'') + '</span><span>' + dt + '</span></div>';
    if(entry._draft) html += '<span class="form-draft-badge">DRAFT</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}
window._fhT = _t;

function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
window._fhEscHtml = _escHtml;

function _val(id){
  var el = document.getElementById(id);
  return el ? el.value : '';
}
window._fhVal = _val;

function _getUserId(){
  if(typeof currentUser !== 'undefined' && currentUser){
    var name = currentUser.display_name || currentUser.username || '';
    if(name){
      var parts = name.split(/[\s.]+/);
      if(parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
      return name.substring(0, 3).toUpperCase();
    }
  }
  return '';
}
window._fhGetUserId = _getUserId;

window._fhCopyText = function(elementId){
  var el = document.getElementById(elementId);
  if(!el) return;
  _copyToClipboard(el.textContent || el.innerText);
};

window._copyRecordFilename = function(){
  var el = document.getElementById('rid-filename');
  if(!el) return;
  _copyToClipboard(el.textContent || el.innerText);
};

function _copyToClipboard(text){
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(function(){
      _showFormToast(_t('Da sao chep!','Copied!'), 'success');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
    _showFormToast(_t('Da sao chep!','Copied!'), 'success');
  }
}
window._fhCopyToClipboard = _copyToClipboard;

function _showFormToast(msg, type){
  var toast = document.createElement('div');
  toast.className = 'form-toast form-toast-' + (type||'info');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.classList.add('show'); }, 10);
  setTimeout(function(){
    toast.classList.remove('show');
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 300);
  }, 3000);
}
window._fhShowToast = _showFormToast;

function _getFormFolder(code){
  var num = parseInt(code.replace('FRM-',''), 10);
  var prefix = String(Math.floor(num / 100)).padStart(2, '0');
  return prefix + '-FRM-' + (Math.floor(num / 100) * 100);
}
window._fhGetFormFolder = _getFormFolder;

function _saveLocalEntries(){
  try{ localStorage.setItem('qms_form_entries', JSON.stringify(_formEntries)); }catch(e){}
}

})();

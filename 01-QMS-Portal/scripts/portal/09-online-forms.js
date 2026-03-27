/* ═══════════════════════════════════════════════════
   09-online-forms.js — Form Hub Dashboard v2
   HESEM QMS Portal — Complete form management system
   Features: catalog, online fill, Record-ID, upload/validate, history
   ═══════════════════════════════════════════════════ */

(function(){
'use strict';

// ── State ──
var _formSchemas = {};
var _formEntries = {};
var _currentForm = null;
var _currentEntry = null;
var _formDirty = false;
var _tableRowCounters = {};
var _uploadQueue = [];
var _activeTab = 'catalog';
var _activeFilter = 'all';
var _searchQuery = '';
var _lastRecordId = null;

// ── Record-ID Config ──
var RECORD_FORM_MAP = {
  'NCR':  { form: 'FRM-631', label: 'NCR — Non-Conformity Report', labelVi: 'NCR — Báo cáo không phù hợp', digits: 3 },
  'CAPA': { form: 'FRM-641', label: 'CAPA — Corrective/Preventive Action', labelVi: 'CAPA — Hành động khắc phục', digits: 3 },
  'FAI':  { form: 'FRM-311', label: 'FAI — First Article Inspection', labelVi: 'FAI — Kiểm tra sản phẩm đầu tiên', digits: 3 },
  'TRN':  { form: 'FRM-802', label: 'Training — Training Event', labelVi: 'Training — Sự kiện đào tạo', digits: 3 },
  'AUD':  { form: 'FRM-913', label: 'Audit — Audit Finding', labelVi: 'Audit — Phát hiện đánh giá', digits: 3 },
  'ECR':  { form: 'FRM-161', label: 'ECR — Engineering Change Request', labelVi: 'ECR — Yêu cầu thay đổi kỹ thuật', digits: 3 },
  'CAL':  { form: 'FRM-601', label: 'Calibration — Calibration Record', labelVi: 'Calibration — Hồ sơ hiệu chuẩn', digits: 3 },
  'SCAR': { form: 'FRM-403', label: 'SCAR — Supplier Corrective Action', labelVi: 'SCAR — Hành động khắc phục NCC', digits: 3 },
  'IMP':  { form: null,      label: 'Improvement — Improvement Project', labelVi: 'Improvement — Dự án cải tiến', digits: 3 },
  'MR':   { form: 'FRM-911', label: 'MR — Management Review', labelVi: 'MR — Xem xét lãnh đạo', digits: 0 },
  'RISK': { form: 'FRM-131', label: 'Risk — Risk Assessment', labelVi: 'Risk — Rà soát rủi ro', digits: 3 }
};

// ── Constants ──
var FORM_COLORS = {
  production:  {bg:'#e7f5ff', border:'#1971c2', icon:'🏭', label:'Sản xuất',  labelEn:'Production'},
  quality:     {bg:'#ebfbee', border:'#2f9e44', icon:'🔍', label:'Chất lượng', labelEn:'Quality'},
  maintenance: {bg:'#fff9db', border:'#e67700', icon:'🔧', label:'Bảo trì',    labelEn:'Maintenance'},
  hr:          {bg:'#f3f0ff', border:'#7950f2', icon:'👥', label:'Nhân sự & Đào tạo', labelEn:'HR & Training'},
  logistics:   {bg:'#fff4e6', border:'#d9480f', icon:'📦', label:'Kho vận',    labelEn:'Logistics'},
  safety:      {bg:'#fff5f5', border:'#e03131', icon:'⚠️', label:'An toàn',    labelEn:'Safety'}
};

var TAB_CONFIG = [
  {id:'catalog',  icon:'📋', labelVi:'Danh mục Form', labelEn:'Form Catalog'},
  {id:'record-id',icon:'🔢', labelVi:'Xin mã hồ sơ',  labelEn:'Request Record-ID'},
  {id:'upload',   icon:'📤', labelVi:'Upload & Kiểm tra', labelEn:'Upload & Validate'},
  {id:'history',  icon:'📊', labelVi:'Lịch sử nộp',    labelEn:'Submission History'}
];

// ═══════════════════════════════════════════════════
// MAIN RENDER — Form Hub Dashboard
// ═══════════════════════════════════════════════════
window.renderOnlineForms = function(formCode){
  var page = document.getElementById('page-forms');
  if(!page) return;

  // If specific form requested, render form entry
  if(formCode){
    _loadAndRenderForm(formCode, page);
    return;
  }

  // Load schemas then render hub
  _loadFormSchemaList(function(schemas){
    _renderFormHub(schemas, page);
  });
};

function _renderFormHub(schemas, page){
  var h = '';
  h += '<div class="fh">';

  // ── Hero Banner ──
  h += '<div class="fh-hero">';
  h += '<div>';
  h += '<div class="fh-hero-kicker">HESEM QMS — ANNEX-137 Compliant</div>';
  h += '<h1>' + _t('Form Hub — Trung tâm quản lý biểu mẫu','Form Hub — Central Form Management') + '</h1>';
  h += '<p>' + _t(
    'Tạo hồ sơ, xin mã, điền form online, tải Excel, upload evidence — tất cả tại đây. Tên file tự động theo ANNEX-137.',
    'Create records, request IDs, fill forms online, download Excel, upload evidence — all in one place. Filenames auto-generated per ANNEX-137.'
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

  // ── KPI Summary ──
  var drafts = 0, submitted = 0;
  Object.keys(_formEntries).forEach(function(k){
    (_formEntries[k]||[]).forEach(function(e){
      if(e._draft) drafts++; else submitted++;
    });
  });

  h += '<div class="fh-summary">';
  h += _kpiCard('blue',  totalForms,   _t('Tổng form','Total Forms'),      _t('Đang hiệu lực','Active'));
  h += _kpiCard('green', onlineForms,  _t('Form online','Online Forms'),    _t('Điền trực tuyến','Fill online'));
  h += _kpiCard('amber', (totalForms - onlineForms), _t('Form Excel','Excel Forms'), _t('Tải về điền','Download'));
  h += _kpiCard('purple',submitted,    _t('Đã gửi','Submitted'),           _t('Bản ghi','Records'));
  h += _kpiCard('red',   drafts,       _t('Nháp','Drafts'),                _t('Chưa gửi','Pending'));
  h += '</div>';

  // ── Tab Bar ──
  h += '<div class="fh-tabs">';
  TAB_CONFIG.forEach(function(tab){
    var cls = tab.id === _activeTab ? ' active' : '';
    h += '<button class="fh-tab' + cls + '" onclick="_fhSwitchTab(\'' + tab.id + '\')">';
    h += '<span class="fh-tab-icon">' + tab.icon + '</span>';
    h += _t(tab.labelVi, tab.labelEn);
    if(tab.id === 'catalog') h += ' <span class="fh-tab-count">' + totalForms + '</span>';
    if(tab.id === 'history') h += ' <span class="fh-tab-count">' + (submitted + drafts) + '</span>';
    h += '</button>';
  });
  h += '</div>';

  // ── Tab Panels ──
  h += _renderCatalogPanel(schemas);
  h += _renderRecordIdPanel();
  h += _renderUploadPanel();
  h += _renderHistoryPanel(schemas);

  h += '</div>';
  page.innerHTML = h;

  // Activate current tab
  _activateTab(_activeTab);
}

function _kpiCard(color, value, label, sub){
  return '<div class="fh-kpi fh-kpi-' + color + '"><div class="fh-kpi-label">' + label + '</div><strong>' + value + '</strong><span>' + sub + '</span></div>';
}

// ═══════════════════════════════════════════════════
// TAB 1: FORM CATALOG
// ═══════════════════════════════════════════════════
function _renderCatalogPanel(schemas){
  var h = '<div class="fh-panel" id="fh-tab-catalog">';

  // Filter bar
  h += '<div class="fh-filter-bar">';
  h += '<input type="text" class="fh-search" id="fh-search" placeholder="' + _t('Tìm form theo mã, tên, SOP...','Search by code, name, SOP...') + '" oninput="_fhFilterForms()" value="' + _searchQuery + '">';
  h += '<div class="fh-filter-chips">';
  h += '<button class="fh-chip' + (_activeFilter==='all'?' active':'') + '" onclick="_fhSetFilter(\'all\')">' + _t('Tất cả','All') + '</button>';
  Object.keys(FORM_COLORS).forEach(function(cat){
    var cfg = FORM_COLORS[cat];
    h += '<button class="fh-chip' + (_activeFilter===cat?' active':'') + '" onclick="_fhSetFilter(\'' + cat + '\')">' + cfg.icon + ' ' + _t(cfg.label, cfg.labelEn) + '</button>';
  });
  h += '</div>';
  h += '</div>';

  // Form cards container
  h += '<div id="fh-forms-container">';
  h += _renderFormCards(schemas);
  h += '</div>';

  h += '</div>';
  return h;
}

function _renderFormCards(schemas){
  var groups = {};
  schemas.forEach(function(s){
    // Apply filter
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
    var cfg = FORM_COLORS[cat] || {bg:'#f8f9fa', border:'#adb5bd', icon:'📄', label:cat, labelEn:cat};
    h += '<div class="forms-group">';
    h += '<h2 class="forms-group-title"><span class="forms-group-icon">' + cfg.icon + '</span> ' + _t(cfg.label, cfg.labelEn) + ' <span style="font-size:11px;color:#64748b;font-weight:400;margin-left:4px">(' + groups[cat].length + ')</span></h2>';
    h += '<div class="forms-grid">';
    groups[cat].forEach(function(s){
      var entries = (_formEntries[s.form_code]||[]).length;
      var isOnline = s.online !== false;
      var freqLabel = {daily:'Hàng ngày',per_shift:'Mỗi ca',per_event:'Mỗi sự kiện',weekly:'Hàng tuần',monthly:'Hàng tháng',periodic:'Định kỳ'};

      h += '<div class="form-card" style="border-left:4px solid ' + cfg.border + '">';
      h += '<span class="form-card-type ' + (isOnline?'form-card-online':'form-card-excel') + '">' + (isOnline?'ONLINE':'EXCEL') + '</span>';
      h += '<div class="form-card-header">';
      h += '<span class="form-card-code">' + s.form_code + '</span>';
      h += '<span class="form-card-freq">' + (freqLabel[s.frequency]||s.frequency||'') + '</span>';
      h += '</div>';
      h += '<div class="form-card-title">' + _t(s.title_vi||s.title, s.title) + '</div>';
      h += '<div class="form-card-desc">' + (s.description||'') + '</div>';
      h += '<div class="form-card-footer">';
      h += '<span class="form-card-ref">' + (s.sop_ref||'') + '</span>';
      if(entries > 0) h += '<span class="form-card-entries">' + entries + ' ' + _t('bản ghi','entries') + '</span>';

      if(isOnline){
        h += '<button class="form-card-btn" onclick="renderOnlineForms(\'' + s.form_code + '\')">' + _t('Điền online','Fill online') + ' →</button>';
      } else {
        h += '<button class="form-card-btn" onclick="_fhDownloadBlank(\'' + s.form_code + '\')">' + _t('Tải về','Download') + ' ↓</button>';
      }
      h += '</div>';
      h += '</div>';
    });
    h += '</div></div>';
  });

  if(!h) h = '<div style="text-align:center;padding:40px;color:#64748b"><p style="font-size:32px;margin-bottom:8px">🔍</p><p>' + _t('Không tìm thấy form nào','No forms found') + '</p></div>';
  return h;
}

// ═══════════════════════════════════════════════════
// TAB 2: RECORD-ID REQUEST
// ═══════════════════════════════════════════════════
function _renderRecordIdPanel(){
  var h = '<div class="fh-panel" id="fh-tab-record-id">';

  h += '<div class="fh-rid">';

  // Header
  h += '<div class="fh-rid-header">';
  h += '<h2>🔢 ' + _t('Xin mã hồ sơ mới','Request New Record ID') + '</h2>';
  h += '<p>' + _t(
    'Lấy mã hồ sơ duy nhất (Record-ID) trước khi điền form Excel. Server tự sinh, không bao giờ trùng.',
    'Get a unique Record-ID before filling an Excel form. Server-generated, guaranteed unique.'
  ) + '</p>';
  h += '</div>';

  h += '<div class="fh-rid-body">';

  // Stepper
  h += '<div class="fh-rid-steps">';
  h += '<div class="fh-rid-step active" id="rid-step-1"><span class="fh-rid-step-num">1</span><span class="fh-rid-step-text">' + _t('Chọn loại hồ sơ','Select type') + '</span></div>';
  h += '<div class="fh-rid-connector"></div>';
  h += '<div class="fh-rid-step" id="rid-step-2"><span class="fh-rid-step-num">2</span><span class="fh-rid-step-text">' + _t('Tạo mã','Generate ID') + '</span></div>';
  h += '<div class="fh-rid-connector"></div>';
  h += '<div class="fh-rid-step" id="rid-step-3"><span class="fh-rid-step-num">3</span><span class="fh-rid-step-text">' + _t('Tải form & điền','Download & fill') + '</span></div>';
  h += '</div>';

  // Form
  h += '<div class="fh-rid-form">';
  h += '<div class="fh-rid-field">';
  h += '<label>' + _t('Loại hồ sơ','Record Type') + '</label>';
  h += '<select id="rid-prefix" onchange="_fhRidStepUpdate()">';
  h += '<option value="">— ' + _t('Chọn','Select') + ' —</option>';
  Object.keys(RECORD_FORM_MAP).forEach(function(k){
    var m = RECORD_FORM_MAP[k];
    h += '<option value="' + k + '">' + k + ' — ' + _t(m.labelVi, m.label) + '</option>';
  });
  h += '</select>';
  h += '</div>';

  h += '<div class="fh-rid-field">';
  h += '<label>' + _t('Năm','Year') + '</label>';
  h += '<select id="rid-year">';
  var cy = new Date().getFullYear();
  for(var y = cy; y >= cy-1; y--) h += '<option value="' + y + '">' + y + '</option>';
  h += '</select>';
  h += '</div>';

  h += '<button class="fh-rid-gen-btn" id="rid-gen-btn" onclick="_fhRequestRecordId()">' + _t('Tạo mã mới','Generate ID') + '</button>';
  h += '</div>';

  // Result area
  h += '<div class="fh-rid-result" id="rid-result"></div>';

  h += '</div>';
  h += '</div>';

  // Naming helper
  h += _renderNamingHelper();

  h += '</div>';
  return h;
}

function _renderNamingHelper(){
  var h = '<div class="fh-naming" style="margin-top:20px">';
  h += '<div class="fh-naming-header">';
  h += '<h2>📝 ' + _t('Trợ lý đặt tên file','File Naming Assistant') + '</h2>';
  h += '<p>' + _t('Xây dựng tên file chuẩn ANNEX-137 cho bất kỳ loại evidence nào','Build ANNEX-137 compliant filename for any evidence type') + '</p>';
  h += '</div>';
  h += '<div class="fh-naming-body">';

  // Preview
  h += '<div class="fh-naming-preview" id="fh-naming-preview">' + _t('Chọn thông tin bên dưới...','Select info below...') + '</div>';

  // Fields
  h += '<div class="fh-naming-grid">';

  h += '<div class="fh-naming-field">';
  h += '<label>Pattern</label>';
  h += '<select id="fn-pattern" onchange="_fhUpdateNaming()">';
  h += '<option value="">— ' + _t('Chọn','Select') + ' —</option>';
  h += '<option value="P1">P1 — Form đã điền</option>';
  h += '<option value="P2">P2 — Evidence gắn Job</option>';
  h += '<option value="P3">P3 — Engineering Baseline</option>';
  h += '<option value="P4">P4 — Evidence không gắn Job</option>';
  h += '<option value="P6">P6 — Asset Records</option>';
  h += '</select>';
  h += '</div>';

  h += '<div class="fh-naming-field">';
  h += '<label>RecordType / Form</label>';
  h += '<input type="text" id="fn-type" placeholder="VD: CMM, PHOTO-SETUP, FRM-631" oninput="_fhUpdateNaming()">';
  h += '</div>';

  h += '<div class="fh-naming-field">';
  h += '<label>Scope / Job</label>';
  h += '<input type="text" id="fn-scope" placeholder="VD: JOB-2026-0042, NCR-2026-043" oninput="_fhUpdateNaming()">';
  h += '</div>';

  h += '<div class="fh-naming-field">';
  h += '<label>Part-Rev / Version</label>';
  h += '<input type="text" id="fn-part" placeholder="VD: 714XXXX-REVA, V2.1" oninput="_fhUpdateNaming()">';
  h += '</div>';

  h += '<div class="fh-naming-field">';
  h += '<label>UserID</label>';
  h += '<input type="text" id="fn-userid" placeholder="VD: NVA, QC1" oninput="_fhUpdateNaming()" value="' + _getUserId() + '">';
  h += '</div>';

  h += '<div class="fh-naming-field">';
  h += '<label>Extension</label>';
  h += '<input type="text" id="fn-ext" placeholder="VD: xlsx, pdf, jpg" oninput="_fhUpdateNaming()" value="xlsx">';
  h += '</div>';

  h += '</div>';

  // Copy button
  h += '<div style="margin-top:12px;display:flex;gap:8px">';
  h += '<button class="fh-rid-copy-btn" onclick="_fhCopyNaming()">📋 ' + _t('Sao chép tên file','Copy filename') + '</button>';
  h += '</div>';

  h += '</div>';
  h += '</div>';
  return h;
}

// ═══════════════════════════════════════════════════
// TAB 3: UPLOAD & VALIDATE
// ═══════════════════════════════════════════════════
function _renderUploadPanel(){
  var h = '<div class="fh-panel" id="fh-tab-upload">';

  h += '<div class="fh-upload">';
  h += '<div class="fh-upload-header">';
  h += '<h2>📤 ' + _t('Upload & Kiểm tra tên file','Upload & Filename Validation') + '</h2>';
  h += '<p>' + _t(
    'Kéo thả file vào đây. Hệ thống tự động kiểm tra tên file theo ANNEX-137 trước khi lưu vào SharePoint.',
    'Drag & drop files here. System auto-validates filenames per ANNEX-137 before saving to SharePoint.'
  ) + '</p>';
  h += '</div>';
  h += '<div class="fh-upload-body">';

  // Drop zone
  h += '<div class="fh-dropzone" id="fh-dropzone" onclick="document.getElementById(\'fh-file-input\').click()">';
  h += '<div class="fh-dropzone-icon">📁</div>';
  h += '<h3>' + _t('Kéo thả file vào đây','Drag & drop files here') + '</h3>';
  h += '<p>' + _t('hoặc ','or ') + '<span class="fh-dropzone-browse">' + _t('chọn file từ máy tính','browse from computer') + '</span></p>';
  h += '<p style="margin-top:6px;font-size:10px;color:#94a3b8">' + _t('Hỗ trợ: xlsx, pdf, jpg, png, csv, nc, mcam, step...','Supports: xlsx, pdf, jpg, png, csv, nc, mcam, step...') + '</p>';
  h += '</div>';
  h += '<input type="file" id="fh-file-input" multiple style="display:none" onchange="_fhHandleFiles(this.files)">';

  // Upload queue
  h += '<div class="fh-upload-queue" id="fh-upload-queue"></div>';

  // Actions
  h += '<div class="fh-upload-actions" id="fh-upload-actions" style="display:none">';
  h += '<button class="fh-upload-submit" id="fh-upload-submit-btn" onclick="_fhSubmitUpload()">' + _t('Nộp file hợp lệ vào SharePoint','Submit valid files to SharePoint') + '</button>';
  h += '<button class="fh-upload-clear" onclick="_fhClearUpload()">' + _t('Xóa tất cả','Clear all') + '</button>';
  h += '</div>';

  h += '</div>';
  h += '</div>';

  // Validation legend
  h += '<div style="margin-top:12px;padding:14px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:10px">';
  h += '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">' + _t('Chú thích kiểm tra','Validation Legend') + '</div>';
  h += '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px">';
  h += '<span><span class="fh-badge fh-badge-approved">PASS</span> ' + _t('Tên file hợp lệ','Valid filename') + '</span>';
  h += '<span><span class="fh-badge fh-badge-rejected">FAIL</span> ' + _t('Không hợp lệ, cần sửa','Invalid, needs fix') + '</span>';
  h += '<span><span class="fh-badge fh-badge-pending">WARN</span> ' + _t('Cảnh báo, có thể upload','Warning, uploadable') + '</span>';
  h += '</div>';
  h += '</div>';

  h += '</div>';
  return h;
}

// ═══════════════════════════════════════════════════
// TAB 4: SUBMISSION HISTORY
// ═══════════════════════════════════════════════════
function _renderHistoryPanel(schemas){
  var h = '<div class="fh-panel" id="fh-tab-history">';

  var allEntries = [];
  Object.keys(_formEntries).forEach(function(code){
    (_formEntries[code]||[]).forEach(function(e){
      e._formCode = code;
      allEntries.push(e);
    });
  });
  allEntries.sort(function(a,b){
    return (b.submitted_at||'').localeCompare(a.submitted_at||'');
  });

  h += '<div class="fh-history">';
  h += '<div class="fh-history-header">';
  h += '<h2>' + _t('Lịch sử nộp form','Submission History') + ' <span class="fh-history-count">' + allEntries.length + '</span></h2>';
  h += '</div>';

  if(allEntries.length === 0){
    h += '<div style="text-align:center;padding:40px;color:#64748b"><p style="font-size:32px;margin-bottom:8px">📭</p><p>' + _t('Chưa có bản ghi nào','No records yet') + '</p></div>';
  } else {
    h += '<div class="fh-history-wrap"><table class="fh-history-table">';
    h += '<thead><tr>';
    h += '<th>' + _t('Trạng thái','Status') + '</th>';
    h += '<th>' + _t('Form','Form') + '</th>';
    h += '<th>' + _t('Entry ID','Entry ID') + '</th>';
    h += '<th>' + _t('Người gửi','Submitted by') + '</th>';
    h += '<th>' + _t('Thời gian','Timestamp') + '</th>';
    h += '</tr></thead><tbody>';

    allEntries.slice(0, 50).forEach(function(e){
      var dt = e.submitted_at ? new Date(e.submitted_at).toLocaleString('vi-VN') : '—';
      var status = e._draft ? 'draft' : 'submitted';
      var badgeCls = e._draft ? 'fh-badge-draft' : 'fh-badge-submitted';
      var statusLabel = e._draft ? _t('Nháp','Draft') : _t('Đã gửi','Submitted');

      h += '<tr>';
      h += '<td><span class="fh-badge ' + badgeCls + '"><span class="fh-badge-dot" style="background:currentColor"></span> ' + statusLabel + '</span></td>';
      h += '<td><span class="mono">' + (e._formCode||'—') + '</span></td>';
      h += '<td class="mono">' + (e.entry_id||'—') + '</td>';
      h += '<td>' + (e.submitted_by||'—') + '</td>';
      h += '<td>' + dt + '</td>';
      h += '</tr>';
    });

    h += '</tbody></table></div>';
  }

  h += '</div>';
  h += '</div>';
  return h;
}

// ═══════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════
window._fhSwitchTab = function(tabId){
  _activeTab = tabId;
  _activateTab(tabId);
};

function _activateTab(tabId){
  // Tabs
  document.querySelectorAll('.fh-tab').forEach(function(btn){
    btn.classList.remove('active');
  });
  document.querySelectorAll('.fh-panel').forEach(function(p){
    p.classList.remove('active');
  });

  var tabBtn = document.querySelector('.fh-tab[onclick*="' + tabId + '"]');
  if(tabBtn) tabBtn.classList.add('active');

  var panel = document.getElementById('fh-tab-' + tabId);
  if(panel) panel.classList.add('active');

  // Init drag-drop listeners on upload tab
  if(tabId === 'upload') _initDropzone();
}

// ═══════════════════════════════════════════════════
// FILTER & SEARCH
// ═══════════════════════════════════════════════════
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
  var schemas = Object.values(_formSchemas);
  container.innerHTML = _renderFormCards(schemas);
};

// ═══════════════════════════════════════════════════
// RECORD-ID REQUEST (Enhanced)
// ═══════════════════════════════════════════════════
window._fhRidStepUpdate = function(){
  var prefix = document.getElementById('rid-prefix');
  if(prefix && prefix.value){
    _setStep(1, 'done');
    _setStep(2, 'active');
  } else {
    _setStep(1, 'active');
    _setStep(2, '');
    _setStep(3, '');
  }
};

function _setStep(n, state){
  var el = document.getElementById('rid-step-' + n);
  if(!el) return;
  el.classList.remove('active','done');
  if(state) el.classList.add(state);
}

window._fhRequestRecordId = function(){
  var prefix = document.getElementById('rid-prefix').value;
  var year = document.getElementById('rid-year').value;
  var resultDiv = document.getElementById('rid-result');
  if(!prefix || !resultDiv) return;

  resultDiv.className = 'fh-rid-result show';
  resultDiv.innerHTML = '<div style="text-align:center;padding:16px;color:#64748b"><div style="font-size:24px;margin-bottom:4px">⏳</div>' + _t('Đang tạo mã...','Generating...') + '</div>';
  _setStep(2, 'active');

  var csrfToken = '';
  try { csrfToken = typeof window._csrfToken === 'string' ? window._csrfToken : ''; } catch(e){}

  fetch('api.php?action=record_id_next', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken},
    body: JSON.stringify({ prefix: prefix, year: year })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok){
      _setStep(2, 'done');
      _setStep(3, 'active');
      _lastRecordId = d;

      var map = RECORD_FORM_MAP[prefix] || {};
      var rid = d.record_id;
      var suggested = d.suggested_filename || '';
      var formCode = d.form_code || map.form || '';
      var blankPath = d.blank_form_path || null;
      var blankName = d.blank_form_filename || (formCode + '.xlsx');

      var html = '<div class="fh-rid-success">';
      html += '<div style="margin-bottom:4px;font-size:12px;color:#64748b">' + _t('Mã hồ sơ của bạn','Your Record ID') + '</div>';
      html += '<div class="fh-rid-id">' + rid + '</div>';

      html += '<div class="fh-rid-meta">';
      if(suggested){
        html += '<div class="fh-rid-meta-item" style="grid-column:1/-1"><div class="fh-rid-meta-label">' + _t('Tên file đề xuất','Suggested filename') + '</div><div class="fh-rid-meta-value" id="rid-filename">' + suggested + '</div></div>';
      }
      html += '<div class="fh-rid-meta-item"><div class="fh-rid-meta-label">' + _t('Loại','Type') + '</div><div class="fh-rid-meta-value">' + prefix + '</div></div>';
      html += '<div class="fh-rid-meta-item"><div class="fh-rid-meta-label">' + _t('Form liên quan','Related form') + '</div><div class="fh-rid-meta-value">' + (formCode||'N/A') + '</div></div>';
      html += '</div>';

      html += '<div class="fh-rid-actions">';
      if(suggested){
        html += '<button class="fh-rid-copy-btn" onclick="_fhCopyText(\'rid-filename\')">📋 ' + _t('Copy tên file','Copy filename') + '</button>';
      }
      if(blankPath && formCode){
        html += '<a class="fh-rid-dl-btn" href="../' + blankPath + '" download="' + (suggested || blankName) + '">↓ ' + _t('Tải form blank','Download blank') + ' ' + formCode + '</a>';
      }
      if(formCode){
        var schema = _formSchemas[formCode];
        if(schema && schema.online !== false){
          html += '<button class="fh-rid-fill-btn" onclick="renderOnlineForms(\'' + formCode + '\')">✏️ ' + _t('Điền online','Fill online') + '</button>';
        }
      }
      html += '</div>';

      html += '</div>';
      resultDiv.innerHTML = html;
    } else {
      resultDiv.innerHTML = '<div style="text-align:center;padding:16px;color:#e03131;background:#fff5f5;border:1px solid #fecaca;border-radius:8px">❌ ' + (d.error||'Unknown error') + '</div>';
    }
  })
  .catch(function(){
    resultDiv.innerHTML = '<div style="text-align:center;padding:16px;color:#e03131;background:#fff5f5;border:1px solid #fecaca;border-radius:8px">❌ ' + _t('Lỗi kết nối','Network error') + '</div>';
  });
};

// ═══════════════════════════════════════════════════
// UPLOAD & VALIDATE
// ═══════════════════════════════════════════════════
function _initDropzone(){
  var dz = document.getElementById('fh-dropzone');
  if(!dz || dz._initialized) return;
  dz._initialized = true;

  dz.addEventListener('dragover', function(e){
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', function(){
    dz.classList.remove('dragover');
  });
  dz.addEventListener('drop', function(e){
    e.preventDefault();
    dz.classList.remove('dragover');
    if(e.dataTransfer && e.dataTransfer.files) _fhHandleFiles(e.dataTransfer.files);
  });
}

window._fhHandleFiles = function(files){
  if(!files || files.length === 0) return;
  for(var i = 0; i < files.length; i++){
    var f = files[i];
    var result = (typeof validateFilename === 'function') ? validateFilename(f.name) : {status:'PASS', pattern:'', issues:[]};
    _uploadQueue.push({
      file: f,
      name: f.name,
      size: f.size,
      validation: result
    });
  }
  _renderUploadQueue();
};

function _renderUploadQueue(){
  var container = document.getElementById('fh-upload-queue');
  var actions = document.getElementById('fh-upload-actions');
  if(!container) return;

  if(_uploadQueue.length === 0){
    container.innerHTML = '';
    if(actions) actions.style.display = 'none';
    return;
  }

  if(actions) actions.style.display = 'flex';

  var passCount = 0, failCount = 0;
  var h = '';
  _uploadQueue.forEach(function(item, idx){
    var v = item.validation;
    var statusClass = 'pending';
    var statusLabel = '...';
    var iconClass = 'pending';
    var iconChar = '📄';

    if(v.status === 'PASS' || (v.issues.length === 0)){
      statusClass = 'pass'; statusLabel = 'PASS'; iconClass = 'pass'; iconChar = '✓'; passCount++;
    } else if(v.issues.some(function(i){ return i.indexOf('REJECT') === 0; })){
      statusClass = 'fail'; statusLabel = 'FAIL'; iconClass = 'fail'; iconChar = '✕'; failCount++;
    } else {
      statusClass = 'warn'; statusLabel = 'WARN'; iconClass = 'warn'; iconChar = '⚠'; passCount++;
    }

    var sizeStr = item.size < 1024 ? item.size + ' B' :
                  item.size < 1048576 ? Math.round(item.size/1024) + ' KB' :
                  (item.size/1048576).toFixed(1) + ' MB';

    h += '<div class="fh-upload-item">';
    h += '<div class="fh-upload-item-icon ' + iconClass + '">' + iconChar + '</div>';
    h += '<div class="fh-upload-item-info">';
    h += '<div class="fh-upload-item-name">' + item.name + '</div>';
    h += '<div class="fh-upload-item-detail">' + sizeStr + (v.pattern ? ' · ' + v.pattern : '') + (v.issues.length > 0 ? ' · ' + v.issues[0] : '') + '</div>';
    h += '</div>';
    h += '<span class="fh-upload-item-status ' + statusClass + '">' + statusLabel + '</span>';
    h += '<button class="fh-upload-item-remove" onclick="_fhRemoveUpload(' + idx + ')">✕</button>';
    h += '</div>';
  });

  container.innerHTML = h;

  // Update submit button
  var submitBtn = document.getElementById('fh-upload-submit-btn');
  if(submitBtn){
    submitBtn.disabled = (passCount === 0);
    submitBtn.textContent = _t('Nộp ' + passCount + ' file hợp lệ','Submit ' + passCount + ' valid files');
  }
}

window._fhRemoveUpload = function(idx){
  _uploadQueue.splice(idx, 1);
  _renderUploadQueue();
};

window._fhClearUpload = function(){
  _uploadQueue = [];
  _renderUploadQueue();
  var fileInput = document.getElementById('fh-file-input');
  if(fileInput) fileInput.value = '';
};

window._fhSubmitUpload = function(){
  // Filter to valid files only
  var valid = _uploadQueue.filter(function(item){
    return !item.validation.issues.some(function(i){ return i.indexOf('REJECT') === 0; });
  });

  if(valid.length === 0){
    _showFormToast(_t('Không có file hợp lệ để nộp','No valid files to submit'), 'error');
    return;
  }

  // In real implementation, this would upload to SharePoint via API
  // For now, show success and log
  _showFormToast(_t(valid.length + ' file đã được xếp hàng để đồng bộ SharePoint', valid.length + ' files queued for SharePoint sync'), 'success');
  _uploadQueue = [];
  _renderUploadQueue();
};

// ═══════════════════════════════════════════════════
// NAMING HELPER
// ═══════════════════════════════════════════════════
window._fhUpdateNaming = function(){
  var pattern = _val('fn-pattern');
  var type = _val('fn-type');
  var scope = _val('fn-scope');
  var part = _val('fn-part');
  var uid = _val('fn-userid');
  var ext = _val('fn-ext') || 'xlsx';

  var now = new Date();
  var date = now.getFullYear().toString() +
    String(now.getMonth()+1).padStart(2,'0') +
    String(now.getDate()).padStart(2,'0');
  var hhmm = String(now.getHours()).padStart(2,'0') +
    String(now.getMinutes()).padStart(2,'0');

  var result = '';
  switch(pattern){
    case 'P1': // FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
      result = (type||'FRM-___') + '_' + (part||'V_._ ') + '_' + (scope||'SCOPE') + '_' + date + '_' + hhmm + '-' + (uid||'USR') + '.' + ext;
      break;
    case 'P2': // {RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
      result = (type||'TYPE') + '_' + (scope||'JOB-YYYY-NNNN') + '_' + (part||'PART-REVX') + '_' + date + '_' + hhmm + '-' + (uid||'USR') + '.' + ext;
      break;
    case 'P3': // {FileType}_{PartRev}_{Operation}_{MachineFamily}_V{ver}.{ext}
      result = (type||'NC') + '_' + (scope||'PART-REVX') + '_' + (part||'OP10_5AX_V1') + '.' + ext;
      break;
    case 'P4': // {RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
      result = (type||'REPORT') + '_' + (scope||'SCOPE') + '_' + date + '_' + hhmm + '-' + (uid||'USR') + '.' + ext;
      break;
    case 'P6': // {AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
      result = (type||'FIX-001') + '_' + (scope||'DWG') + '_' + date + '_' + hhmm + '-' + (uid||'USR') + '.' + ext;
      break;
    default:
      result = _t('Chọn pattern bên trên...','Select a pattern above...');
  }

  var preview = document.getElementById('fh-naming-preview');
  if(preview) preview.textContent = result;
};

window._fhCopyNaming = function(){
  var preview = document.getElementById('fh-naming-preview');
  if(!preview) return;
  var text = preview.textContent;
  _copyToClipboard(text);
};

// ═══════════════════════════════════════════════════
// DOWNLOAD BLANK FORM
// ═══════════════════════════════════════════════════
window._fhDownloadBlank = function(formCode){
  // Try to get the blank form path from schema
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
    // Fallback: try api.php
    _showFormToast(_t('Form blank chưa có sẵn. Liên hệ QMS Admin.','Blank form not available. Contact QMS Admin.'), 'warn');
  }
};

// ═══════════════════════════════════════════════════
// EXISTING FORM ENTRY SYSTEM (preserved from v1)
// ═══════════════════════════════════════════════════
function _loadFormSchemaList(cb){
  var cached = Object.values(_formSchemas);
  if(cached.length > 0) return cb(cached);
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

function _renderFormEntry(schema, page){
  _currentForm = schema.form_code;
  _currentEntry = {};
  _tableRowCounters = {};
  _formDirty = false;

  var cfg = FORM_COLORS[schema.category] || {bg:'#f8f9fa', border:'#adb5bd', icon:'📄'};
  var html = '<div class="form-entry-page">';

  // Back button + header
  html += '<div class="form-entry-topbar">';
  html += '<button class="form-back-btn" onclick="renderOnlineForms()">← ' + _t('Quay lại','Back') + '</button>';
  html += '<div class="form-entry-meta">';
  html += '<span class="form-code-badge" style="background:' + cfg.bg + ';border:1px solid ' + cfg.border + ';color:' + cfg.border + '">' + schema.form_code + '</span>';
  html += '<span class="form-version-badge">v' + (schema.version||'1') + '</span>';
  html += '</div>';
  html += '</div>';

  // Form header card
  html += '<div class="form-entry-header" style="border-left:4px solid ' + cfg.border + '">';
  html += '<h1>' + cfg.icon + ' ' + _t(schema.title_vi||schema.title, schema.title) + '</h1>';
  html += '<p>' + (schema.description||'') + '</p>';
  html += '</div>';

  // Form body
  html += '<form id="online-form-body" class="form-entry-body" onsubmit="return _onlineFormSubmit(event)" autocomplete="off">';
  schema.fields.forEach(function(field){
    html += _renderField(field, schema);
  });

  html += '<div class="form-actions">';
  html += '<button type="submit" class="form-submit-btn">💾 ' + _t('Lưu & Gửi','Save & Submit') + '</button>';
  html += '<button type="button" class="form-draft-btn" onclick="_onlineFormSaveDraft()">📝 ' + _t('Lưu nháp','Save Draft') + '</button>';
  html += '<button type="button" class="form-clear-btn" onclick="_onlineFormClear()">🗑 ' + _t('Xóa','Clear') + '</button>';
  html += '</div>';
  html += '</form>';

  html += _renderRecentEntries(schema);
  html += '</div>';
  page.innerHTML = html;
  _applyDefaults(schema);
}

// ── Field Rendering ──
function _renderField(field, schema){
  if(field.show_if){}
  var html = '';
  var req = field.required ? ' <span class="form-req">*</span>' : '';
  var showIf = field.show_if ? ' data-show-if="' + field.show_if.field + '" data-show-value="' + field.show_if.value + '" style="display:none"' : '';
  var fid = 'of-' + field.id;

  switch(field.type){
    case 'text':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="text" id="' + fid + '" name="' + field.id + '" placeholder="' + (field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></div>';
      break;
    case 'number':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<input type="number" id="' + fid + '" name="' + field.id + '" placeholder="' + (field.placeholder||'') + '"' +
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
      html += '<option value="">— ' + _t('Chọn','Select') + ' —</option>';
      (field.options||[]).forEach(function(opt){ html += '<option value="' + opt.value + '">' + opt.label + '</option>'; });
      html += '</select></div>';
      break;
    case 'textarea':
      html += '<div class="form-field"' + showIf + '><label for="' + fid + '">' + field.label + req + '</label>';
      html += '<textarea id="' + fid + '" name="' + field.id + '" rows="' + (field.rows||3) + '" placeholder="' + (field.placeholder||'') + '"' + (field.required?' required':'') + ' onchange="_onlineFieldChange(this)"></textarea></div>';
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
      cellsHtml += '<select name="' + name + '" onchange="_onlineFieldChange(this)"><option value="">—</option>';
      (col.options||[]).forEach(function(opt){ cellsHtml += '<option value="' + opt.value + '"' + (opt.color?' style="color:'+opt.color+'"':'') + '>' + opt.label + '</option>'; });
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

function _collectFormData(schema){
  var data = {};
  var form = document.getElementById('online-form-body');
  if(!form) return data;
  schema.fields.forEach(function(field){
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
      if(input){ row[col.id] = input.value; if(input.value) hasData = true; }
    });
    if(hasData) rows.push(row);
  });
  return rows;
}

// ── Submit / Save / Clear ──
window._onlineFormSubmit = function(e){
  e.preventDefault();
  var schema = _formSchemas[_currentForm];
  if(!schema) return false;
  var data = _collectFormData(schema);
  var missing = [];
  schema.fields.forEach(function(f){
    if(f.required && f.type !== 'table' && f.type !== 'group'){
      if(!data[f.id] && data[f.id] !== 0 && data[f.id] !== false) missing.push(f.label);
    }
  });
  if(missing.length > 0){
    alert(_t('Thiếu trường bắt buộc: ','Missing required fields: ') + missing.join(', '));
    return false;
  }
  fetch('api.php?action=online_form_submit', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({form_code: _currentForm, data: data, status: 'submitted'})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok){
      if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
      _formEntries[_currentForm].unshift(data);
      _formDirty = false;
      _showFormToast(_t('Form đã gửi thành công!','Form submitted successfully!'), 'success');
      var page = document.getElementById('page-forms');
      _renderFormEntry(schema, page);
    } else {
      _showFormToast(_t('Lỗi: ','Error: ') + (d.error||'Unknown'), 'error');
    }
  })
  .catch(function(){
    if(!_formEntries[_currentForm]) _formEntries[_currentForm] = [];
    _formEntries[_currentForm].unshift(data);
    _saveLocalEntries();
    _formDirty = false;
    _showFormToast(_t('Đã lưu cục bộ (offline)','Saved locally (offline)'), 'warn');
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
  try{ localStorage.setItem('qms_form_draft_' + _currentForm, JSON.stringify(data)); _showFormToast(_t('Đã lưu nháp','Draft saved'), 'success'); }catch(e){}
};

window._onlineFormClear = function(){
  if(_formDirty && !confirm(_t('Hủy thay đổi?','Discard changes?'))) return;
  var schema = _formSchemas[_currentForm];
  if(!schema) return;
  var page = document.getElementById('page-forms');
  _renderFormEntry(schema, page);
};

function _renderRecentEntries(schema){
  var entries = _formEntries[schema.form_code] || [];
  if(entries.length === 0) return '';
  var html = '<div class="form-recent">';
  html += '<h2 class="form-recent-title">📊 ' + _t('Bản ghi gần đây','Recent Entries') + ' <span class="form-recent-count">' + entries.length + '</span></h2>';
  html += '<div class="form-recent-list">';
  entries.slice(0, 10).forEach(function(entry, i){
    var dt = entry.submitted_at ? new Date(entry.submitted_at).toLocaleString('vi-VN') : '—';
    html += '<div class="form-recent-item">';
    html += '<div class="form-recent-id">' + (entry.entry_id||'#'+(i+1)) + '</div>';
    html += '<div class="form-recent-info"><span>' + (entry.submitted_by||'—') + '</span><span>' + dt + '</span></div>';
    if(entry._draft) html += '<span class="form-draft-badge">DRAFT</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ═══════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function _val(id){
  var el = document.getElementById(id);
  return el ? el.value : '';
}

function _getUserId(){
  if(typeof currentUser !== 'undefined' && currentUser){
    // Try to extract initials from display name
    var name = currentUser.display_name || currentUser.username || '';
    if(name){
      var parts = name.split(/[\s.]+/);
      if(parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
      return name.substring(0, 3).toUpperCase();
    }
  }
  return '';
}

window._fhCopyText = function(elementId){
  var el = document.getElementById(elementId);
  if(!el) return;
  _copyToClipboard(el.textContent || el.innerText);
};

// Keep old compat
window._copyRecordFilename = function(){
  var el = document.getElementById('rid-filename');
  if(!el) return;
  _copyToClipboard(el.textContent || el.innerText);
};

function _copyToClipboard(text){
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(function(){
      _showFormToast(_t('Đã sao chép!','Copied!'), 'success');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    _showFormToast(_t('Đã sao chép!','Copied!'), 'success');
  }
}

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

function _getFormFolder(code){
  var num = parseInt(code.replace('FRM-',''), 10);
  var prefix = String(Math.floor(num / 100)).padStart(2, '0');
  return prefix + '-FRM-' + (Math.floor(num / 100) * 100);
}

// ── Local Storage ──
function _saveLocalEntries(){
  try{ localStorage.setItem('qms_form_entries', JSON.stringify(_formEntries)); }catch(e){}
}
function _loadLocalEntries(){
  try{ var raw = localStorage.getItem('qms_form_entries'); if(raw) _formEntries = JSON.parse(raw); }catch(e){}
}

// Init
_loadLocalEntries();

})();

/* ===================================================================
   09c-record-id-generator.js -- Tab 3: Enhanced Record ID Generator
   HESEM QMS Portal -- Cascading dept/type, live preview, allocation,
   history table with search/filter/pagination
   Dependencies: 09-online-forms.js, 09g-cascading-dropdown.js,
                 09h-allocation-tracker.js
   =================================================================== */

(function(){
'use strict';

// ── Helpers ──
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}
function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
function _uid(){
  return 'rid-' + Math.random().toString(36).substr(2, 9);
}

// ── Module State ──
var _cascadeInstance = null;
var _moduleId = _uid();
var _selectedDept = '';
var _selectedType = '';
var _selectedYear = new Đạte().getFullYear();
var _previewId = '';
var _lastGenerated = null;
var _generating = false;

// History state
var _historyPage = 1;
var _historyPageSize = 20;
var _historyFilters = {
  recordType: '',
  department: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  search: ''
};

// ── Department config (from cascading_dropdown_config.json record_id section) ──
var DEPT_RECORD_TYPES = {
  'QA':  ['NCR','CAPA','FAI','SCAR','AUD','CAL','RMA','CONCESSION','DEVIATION','MSA','SPC-STUDY','GAGE-NUMBER','INTERNAL-AUDIT-PLAN','DOC-CHANGE','WORK-INSTRUCTION-NUMBER','SOP-NUMBER','ANNEX-NUMBER'],
  'PRO': ['NCR','IMP','DOWNTIME','REWORK','TOOL-NUMBER','PM-ORDER','CM-ORDER','SPARE-PART'],
  'ENG': ['ECR','FAI','NPI','PFMEA','CONTROL-PLAN','FIXTURE-NUMBER','PART-NUMBER','NC-PROGRAM'],
  'SCM': ['SCAR','PO-EXCEPTION','SUPPLIER-AUDIT','MATERIAL-CERT'],
  'HR':  ['TRN','JD-NUMBER','EMPLOYEE-COMPETENCY'],
  'EXE': ['MR','RISK','IMP'],
  'SAL': ['COST-ESTIMATE'],
  'WH':  ['SHIPPING-RELEASE','RECEIVING-RECORD'],
  'IT':  [],
  'EHS': ['EHS-INCIDENT']
};

var DEPARTMENTS = [
  {value:'QA',  label:'Đảm bảo Chất lượng',     labelEn:'Quality Assurance'},
  {value:'PRO', label:'Sản xuất',               labelEn:'Production'},
  {value:'ENG', label:'Kỹ thuật',               labelEn:'Engineering'},
  {value:'SCM', label:'Chuỗi cung ứng',         labelEn:'Supply Chain'},
  {value:'HR',  label:'Nhân sự & Đào tạo',      labelEn:'HR & Training'},
  {value:'EXE', label:'Ban Giám đốc',           labelEn:'Executive / Management'},
  {value:'SAL', label:'Kinh doanh',             labelEn:'Sales'},
  {value:'WH',  label:'Kho vận',                labelEn:'Warehouse / Logistics'},
  {value:'IT',  label:'Công nghệ thông tin',    labelEn:'IT / Digital'},
  {value:'EHS', label:'An toàn & Môi trường',   labelEn:'EHS / Safety'}
];

// Record type registry (loaded from record_type_expanded.json at build or inlined)
var RECORD_TYPES = null;

// ===================================================================
// MAIN RENDER
// ===================================================================
window._renderRecordIdGenerator = function(schemas, entries, container){
  if(!container) return;

  // Try to load record type config
  _loadRecordTypeConfig(function(){
    _renderContent(schemas, entries, container);
  });
};

function _loadRecordTypeConfig(cb){
  if(RECORD_TYPES){ cb(); return; }

  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  if(callFn){
    callFn('config_record_types', {}, 'GET').then(function(d){
      if(d && d.record_types) RECORD_TYPES = d.record_types;
      cb();
    }).catch(function(){ cb(); });
  } else {
    fetch('qms-data/config/record_type_expanded.json')
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.record_types) RECORD_TYPES = d.record_types;
        cb();
      })
      .catch(function(){ cb(); });
  }
}

function _renderContent(schemas, entries, container){
  var h = '';

  // ── Section Header ──
  h += '<div class="fh-section">';
  h += '<div class="fh-section-head">';
  h += '<h2>&#x1F522; ' + _t('Xin mã hồ sơ mới','Request New Record ID') + '</h2>';
  h += '<span>' + _t('Lấy mã hồ sơ duy nhất (Record-ID) trước khi điền form. Server tự sinh, không trùng.','Get a unique Record-ID before filling forms. Server-generated, guaranteed unique.') + '</span>';
  h += '</div>';
  h += '</div>';

  // ── Generator Card ──
  h += '<div class="rid-generator" id="' + _moduleId + '-gen">';

  // Cascading dropdown
  h += '<div id="' + _moduleId + '-cascade" class="rid-cascade-wrap"></div>';

  // Year selector
  h += '<div class="rid-year-row">';
  h += '<label>' + _t('Nam','Year') + '</label>';
  h += '<select id="' + _moduleId + '-year" onchange="_ridOnYearChange(this.value)" class="rid-year-select">';
  var cy = new Đạte().getFullYear();
  for(var y = cy; y >= cy - 1; y--){
    h += '<option value="' + y + '"' + (y === _selectedYear ? ' selected' : '') + '>' + y + '</option>';
  }
  h += '</select>';
  h += '</div>';

  // ID Preview Panel
  h += '<div class="rid-preview-panel" id="' + _moduleId + '-preview">';
  h += '<div class="rid-preview-label">' + _t('Xem trước mã:','ID Preview:') + '</div>';
  h += '<div class="rid-preview-id" id="' + _moduleId + '-preview-id">' + _t('Chọn loại hồ sơ ở trên...','Select record type above...') + '</div>';
  h += '<div class="rid-preview-format" id="' + _moduleId + '-preview-format"></div>';
  h += '</div>';

  // Generate button
  h += '<div class="rid-gen-actions">';
  h += '<button type="button" class="rid-gen-btn" id="' + _moduleId + '-gen-btn" onclick="_ridGenerate()" disabled>';
  h += '&#x26A1; ' + _t('Tạo mã mới','Generate New ID');
  h += '</button>';
  h += '</div>';

  // Success result area (hidden initially)
  h += '<div class="rid-result" id="' + _moduleId + '-result" style="display:none"></div>';

  h += '</div>';

  // ── Allocation History ──
  h += '<div class="rid-history-section" id="' + _moduleId + '-history-section">';
  h += '<div class="rid-history-header">';
  h += '<h2>&#x1F4CB; ' + _t('Lịch sử cấp mã','Allocation History') + '</h2>';
  h += '</div>';

  // History filters
  h += '<div class="rid-history-filters" id="' + _moduleId + '-hist-filters">';
  h += '<div class="rid-hist-filter-row">';

  // Type filter
  h += '<div class="rid-hist-filter">';
  h += '<label>' + _t('Loại','Type') + '</label>';
  h += '<select id="' + _moduleId + '-hf-type" onchange="_ridHistFilterChange()">';
  h += '<option value="">' + _t('Tất cả','All') + '</option>';
  h += '</select>';
  h += '</div>';

  // Department filter
  h += '<div class="rid-hist-filter">';
  h += '<label>' + _t('Phòng ban','Department') + '</label>';
  h += '<select id="' + _moduleId + '-hf-dept" onchange="_ridHistFilterChange()">';
  h += '<option value="">' + _t('Tất cả','All') + '</option>';
  DEPARTMENTS.forEach(function(d){
    h += '<option value="' + d.value + '">' + _t(d.label, d.labelEn) + '</option>';
  });
  h += '</select>';
  h += '</div>';

  // Status filter
  h += '<div class="rid-hist-filter">';
  h += '<label>' + _t('Trạng thái','Status') + '</label>';
  h += '<select id="' + _moduleId + '-hf-status" onchange="_ridHistFilterChange()">';
  h += '<option value="">' + _t('Tất cả','All') + '</option>';
  h += '<option value="allocated">' + _t('Đã cấp mã','Allocated') + '</option>';
  h += '<option value="form_downloaded">' + _t('Đã tải form','Downloaded') + '</option>';
  h += '<option value="submitted">' + _t('Đã nộp','Submitted') + '</option>';
  h += '<option value="received">' + _t('Đã tiếp nhận','Received') + '</option>';
  h += '<option value="void">' + _t('Hủy','Void') + '</option>';
  h += '</select>';
  h += '</div>';

  // Đạte range
  h += '<div class="rid-hist-filter">';
  h += '<label>' + _t('Từ ngày','From') + '</label>';
  h += '<input type="date" id="' + _moduleId + '-hf-from" onchange="_ridHistFilterChange()">';
  h += '</div>';
  h += '<div class="rid-hist-filter">';
  h += '<label>' + _t('Đến ngày','To') + '</label>';
  h += '<input type="date" id="' + _moduleId + '-hf-to" onchange="_ridHistFilterChange()">';
  h += '</div>';

  h += '</div>';

  // Bulk actions
  h += '<div class="rid-hist-bulk">';
  h += '<button type="button" class="rid-hist-bulk-btn" onclick="_ridVoidUnused()" title="' + _t('Hủy tat ca ma chua su dung','Void all unused IDs') + '">';
  h += '&#x26D4; ' + _t('Hủy ma chua dung','Void unused');
  h += '</button>';
  h += '</div>';

  h += '</div>';

  // History table container
  h += '<div id="' + _moduleId + '-history-table" class="rid-history-table-wrap"></div>';

  h += '</div>';

  container.innerHTML = h;

  // Initialize cascading dropdown
  _initCascade();

  // Populate type filter in history
  _populateTypeFilter();

  // Load initial history
  _loadHistory();
}

// ===================================================================
// CASCADING DROPDOWN
// ===================================================================
function _initCascade(){
  if(_cascadeInstance){
    try{ _cascadeInstance.destroy(); }catch(e){}
  }

  if(typeof CascadingDropdown !== 'function') return;

  _cascadeInstance = new CascadingDropdown({
    containerId: _moduleId + '-cascade',
    className: 'rid-cascade-bar',
    levels: [
      {
        key: 'department',
        label: 'Phòng ban',
        labelEn: 'Department',
        dataSource: 'static',
        options: DEPARTMENTS.map(function(d){
          return {value: d.value, label: d.label, labelEn: d.labelEn};
        })
      },
      {
        key: 'record_type',
        label: 'Loại ho so',
        labelEn: 'Record Type',
        dataSource: 'dependent',
        dependsOn: 'department',
        resolver: function(selections){
          var dept = selections.department;
          if(!dept) return [];

          var typeKeys = DEPT_RECORD_TYPES[dept] || [];
          return typeKeys.map(function(code){
            var info = _getRecordTypeInfo(code);
            var labelVi = info.label_vi || info.label || code;
            var labelEn = info.label || code;
            var digits = info.digits ? ' (' + info.digits + ' ' + _t('so','digits') + ')' : '';
            var linkedForm = info.linked_form ? ' [' + info.linked_form + ']' : '';

            return {
              value: code,
              label: code + ' - ' + labelVi + digits + linkedForm,
              labelEn: code + ' - ' + labelEn + digits + linkedForm
            };
          });
        }
      }
    ],
    onChange: function(selections, levelKey){
      _selectedDept = selections.department || '';
      _selectedType = selections.record_type || '';
      _updatePreview();
      _updateGenButton();
    }
  });

  _cascadeInstance.render();
}

function _getRecordTypeInfo(code){
  if(RECORD_TYPES && RECORD_TYPES[code]) return RECORD_TYPES[code];
  // Fallback minimal info
  return {code: code, label: code, label_vi: code, digits: 3, format_pattern: code + '-{YYYY}-{NNN}', linked_form: null};
}

// ===================================================================
// YEAR CHANGE
// ===================================================================
window._ridOnYearChange = function(val){
  _selectedYear = parseInt(val, 10) || new Đạte().getFullYear();
  _updatePreview();
};

// ===================================================================
// LIVE PREVIEW
// ===================================================================
function _updatePreview(){
  var previewEl = document.getElementById(_moduleId + '-preview-id');
  var formatEl = document.getElementById(_moduleId + '-preview-format');
  if(!previewEl || !formatEl) return;

  if(!_selectedType){
    previewEl.textContent = _t('Chọn loại hồ sơ ở trên...','Select record type above...');
    previewEl.className = 'rid-preview-id rid-preview-placeholder';
    formatEl.textContent = '';
    return;
  }

  var info = _getRecordTypeInfo(_selectedType);
  var pattern = info.format_pattern || (_selectedType + '-{YYYY}-{NNN}');
  var digits = info.digits || 3;

  // Build preview ID (greyed out, not yet allocated)
  var previewStr = pattern
    .replace('{YYYY}', String(_selectedYear))
    .replace('{NNN}', String(0).padStart(digits, '0').replace(/0/g, '_'))
    .replace('{NN}', '__')
    .replace('{N}', '_')
    .replace('{NNNN}', '____')
    .replace('{CODE}', '___')
    .replace('{EquipCode}', '___')
    .replace('{EmpCode}', '___')
    .replace('{DeptCode}', _selectedDept || '___')
    .replace('{PartCode}', '___')
    .replace('{OP}', '__')
    .replace('{VNN}', 'V__');

  previewEl.textContent = previewStr;
  previewEl.className = 'rid-preview-id rid-preview-pending';

  // Format explanation
  var explanation = _t('Định dạng: ','Format: ') + pattern;
  if(info.linked_form){
    explanation += ' | ' + _t('Form liên quan: ','Linked form: ') + info.linked_form;
  }
  formatEl.textContent = explanation;
}

function _updateGenButton(){
  var btn = document.getElementById(_moduleId + '-gen-btn');
  if(!btn) return;
  btn.disabled = !_selectedType || !_selectedDept || _generating;
}

// ===================================================================
// GENERATE NEW ID
// ===================================================================
window._ridGenerate = function(){
  if(!_selectedType || !_selectedDept || _generating) return;

  _generating = true;
  _updateGenButton();

  var resultDiv = document.getElementById(_moduleId + '-result');
  if(resultDiv){
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="rid-generating"><div class="rid-generating-spinner"></div><span>' + _t('Đang kiểm tra trung va tao ma...','Checking duplicates and generating...') + '</span></div>';
  }

  var toast = window._fhShowToast || function(){};

  // Step 1: Duplicate check (peek next ID)
  var checkDuplicate = (typeof AllocationTracker !== 'undefined' && AllocationTracker.checkDuplicate)
    ? function(){ return AllocationTracker.checkDuplicate(_selectedType + '-' + _selectedYear); }
    : function(){ return Promise.resolve({ok: true, exists: false}); };

  checkDuplicate().then(function(checkResult){
    if(checkResult && checkResult.exists){
      // Warn but proceed -- server will skip to next available
      toast(_t('Phát hiện ID trùng, tự động nhảy sang số tiếp theo.','Duplicate detected, auto-skipping to next available.'), 'warn');
    }

    // Step 2: Allocate
    if(typeof AllocationTracker !== 'undefined' && AllocationTracker.allocate){
      return AllocationTracker.allocate(_selectedType, _selectedDept, {
        notes: '',
        priority: 'normal',
        linkedOrderId: null
      });
    } else {
      // Fallback: direct API call
      return _fallbackAllocate();
    }
  }).then(function(data){
    _generating = false;
    _updateGenButton();

    if(data && data.ok){
      _lastGenerated = data;
      _renderSuccess(data);
      _loadHistory(); // Refresh history table
    } else {
      _renderError((data && data.error) || _t('Không thể tạo mã.','Could not generate ID.'));
    }
  }).catch(function(err){
    _generating = false;
    _updateGenButton();
    _renderError(_t('Lỗi kết nối mạng.','Network error.'));
  });
};

function _fallbackAllocate(){
  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  var payload = {
    prefix: _selectedType,
    year: _selectedYear,
    department: _selectedDept
  };

  if(callFn){
    return callFn('record_id_next', payload, 'POST');
  }

  var csrfTok = '';
  try{ csrfTok = typeof window._csrfToken === 'string' ? window._csrfToken : ''; }catch(e){}

  return fetch('api.php?action=record_id_next', {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'X-CSRF-Token': csrfTok},
    body: JSON.stringify(payload)
  }).then(function(r){ return r.json(); });
}

// ===================================================================
// SUCCESS / ERROR RENDERING
// ===================================================================
function _renderSuccess(data){
  var resultDiv = document.getElementById(_moduleId + '-result');
  if(!resultDiv) return;

  var rid = data.record_id || data.recordId || '';
  var allocId = data.allocation_id || data.allocationId || '';
  var suggestedFilename = data.suggested_filename || '';
  var formCode = data.form_code || '';
  var blankPath = data.blank_form_path || null;
  var info = _getRecordTypeInfo(_selectedType);
  var linkedForm = formCode || info.linked_form || '';

  // Update the preview to show actual ID
  var previewEl = document.getElementById(_moduleId + '-preview-id');
  if(previewEl){
    previewEl.textContent = rid;
    previewEl.className = 'rid-preview-id rid-preview-allocated';
  }

  var h = '';

  // Confetti animation container
  h += '<div class="rid-confetti" id="' + _moduleId + '-confetti"></div>';

  // Success card
  h += '<div class="rid-success">';

  // Large ID display
  h += '<div class="rid-success-id-wrap">';
  h += '<div class="rid-success-label">' + _t('Mã hồ sơ của bạn','Your Record ID') + '</div>';
  h += '<div class="rid-success-id">' + _escHtml(rid) + '</div>';
  h += '</div>';

  // Meta info
  h += '<div class="rid-success-meta">';
  h += '<div class="rid-success-meta-item"><span class="rid-meta-label">' + _t('Loại','Type') + '</span><span class="rid-meta-value">' + _escHtml(_selectedType) + '</span></div>';
  h += '<div class="rid-success-meta-item"><span class="rid-meta-label">' + _t('Phòng ban','Dept') + '</span><span class="rid-meta-value">' + _escHtml(_selectedDept) + '</span></div>';
  if(linkedForm){
    h += '<div class="rid-success-meta-item"><span class="rid-meta-label">' + _t('Form liên quan','Linked form') + '</span><span class="rid-meta-value">' + _escHtml(linkedForm) + '</span></div>';
  }
  if(suggestedFilename){
    h += '<div class="rid-success-meta-item rid-meta-wide"><span class="rid-meta-label">' + _t('Tên file đề xuất','Suggested filename') + '</span><span class="rid-meta-value mono" id="' + _moduleId + '-suggested-fn">' + _escHtml(suggestedFilename) + '</span></div>';
  }
  h += '</div>';

  // Action buttons
  h += '<div class="rid-success-actions">';

  // Copy to clipboard (auto-copies on render)
  h += '<button type="button" class="rid-action-btn rid-btn-copy" onclick="_ridCopyId(\'' + _escHtml(rid) + '\')">';
  h += '&#x1F4CB; ' + _t('Sao chép ma','Copy ID');
  h += '</button>';

  // Download .txt
  h += '<button type="button" class="rid-action-btn rid-btn-txt" onclick="_ridDownloadTxt(\'' + _escHtml(rid) + '\')">';
  h += '&#x1F4C4; ' + _t('Tải .txt','Download .txt');
  h += '</button>';

  // Linked form actions
  if(linkedForm){
    var schemas = (window._fhState && window._fhState.schemas) ? window._fhState.schemas : {};
    var formSchema = schemas[linkedForm];
    var isOnline = formSchema ? (formSchema.online !== false) : false;

    if(isOnline){
      h += '<button type="button" class="rid-action-btn rid-btn-fill" onclick="_ridFillForm(\'' + _escHtml(linkedForm) + '\')">';
      h += '&#x270F; ' + _t('Điền form online','Fill form online') + ' &rarr;';
      h += '</button>';
    }

    h += '<button type="button" class="rid-action-btn rid-btn-dl" onclick="_ridDownloadForm(\'' + _escHtml(linkedForm) + '\', \'' + _escHtml(allocId) + '\')">';
    h += '&#x2B07; ' + _t('Tải form','Download form') + ' ' + _escHtml(linkedForm);
    h += '</button>';
  }

  h += '</div>';
  h += '</div>';

  resultDiv.innerHTML = h;
  resultDiv.style.display = 'block';

  // Auto-copy to clipboard
  _ridCopyIdSilent(rid);

  // Trigger confetti
  _triggerConfetti();
}

function _renderError(message){
  var resultDiv = document.getElementById(_moduleId + '-result');
  if(!resultDiv) return;

  resultDiv.innerHTML = '<div class="rid-error">' +
    '<div class="rid-error-icon">&#x274C;</div>' +
    '<div class="rid-error-msg">' + _escHtml(message) + '</div>' +
    '</div>';
  resultDiv.style.display = 'block';
}

// ===================================================================
// ACTION HANDLERS
// ===================================================================
window._ridCopyId = function(rid){
  var copyFn = window._fhCopyToClipboard || function(t){
    if(navigator.clipboard) navigator.clipboard.writeText(t);
  };
  copyFn(rid);
};

function _ridCopyIdSilent(rid){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(rid).catch(function(){});
  }
}

window._ridDownloadTxt = function(rid){
  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.downloadRecordTxt){
    AllocationTracker.downloadRecordTxt(rid, 'Record ID: ' + rid + '\nGenerated: ' + new Đạte().toISOString() + '\nDepartment: ' + _selectedDept + '\nType: ' + _selectedType + '\n');
  } else {
    var blob = new Blob(['Record ID: ' + rid + '\nGenerated: ' + new Đạte().toISOString() + '\n'], {type: 'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = rid + '.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
};

window._ridFillForm = function(formCode){
  // Navigate to fill form (using orchestrator)
  if(typeof window.renderOnlineForms === 'function'){
    window.renderOnlineForms(formCode);
  }
};

window._ridDownloadForm = function(formCode, allocId){
  var toast = window._fhShowToast || function(){};
  toast(_t('Đang tải form...','Downloading form...'), 'info');

  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.downloadForm && allocId){
    AllocationTracker.downloadForm(allocId, formCode).then(function(data){
      if(data && data.ok){
        toast(_t('Đã tải thành công!','Downloaded successfully!'), 'success');
      } else {
        // Fallback
        if(typeof window._fhDownloadBlank === 'function') window._fhDownloadBlank(formCode);
      }
    }).catch(function(){
      if(typeof window._fhDownloadBlank === 'function') window._fhDownloadBlank(formCode);
    });
  } else {
    if(typeof window._fhDownloadBlank === 'function') window._fhDownloadBlank(formCode);
  }
};

// ===================================================================
// CONFETTI ANIMATION
// ===================================================================
function _triggerConfetti(){
  var confettiEl = document.getElementById(_moduleId + '-confetti');
  if(!confettiEl) return;

  var colors = ['#1565c0','#16a34a','#d97706','#dc2626','#7c3aed','#059669','#f59e0b'];
  var h = '';
  for(var i = 0; i < 30; i++){
    var color = colors[i % colors.length];
    var left = Math.random() * 100;
    var delay = Math.random() * 0.5;
    var size = 4 + Math.random() * 6;
    h += '<div class="rid-confetti-piece" style="' +
      'left:' + left + '%;' +
      'animation-delay:' + delay + 's;' +
      'background:' + color + ';' +
      'width:' + size + 'px;' +
      'height:' + size + 'px;' +
      '"></div>';
  }
  confettiEl.innerHTML = h;
  confettiEl.classList.add('rid-confetti-active');

  // Cleanup after animation
  setTimeout(function(){
    if(confettiEl) confettiEl.innerHTML = '';
    confettiEl.classList.remove('rid-confetti-active');
  }, 2500);
}

// ===================================================================
// ALLOCATION HISTORY
// ===================================================================
function _populateTypeFilter(){
  var typeSelect = document.getElementById(_moduleId + '-hf-type');
  if(!typeSelect) return;

  var allTypes = [];
  Object.keys(DEPT_RECORD_TYPES).forEach(function(dept){
    (DEPT_RECORD_TYPES[dept] || []).forEach(function(t){
      if(allTypes.indexOf(t) < 0) allTypes.push(t);
    });
  });

  allTypes.sort();
  var h = '<option value="">' + _t('Tất cả','All') + '</option>';
  allTypes.forEach(function(t){
    var info = _getRecordTypeInfo(t);
    h += '<option value="' + _escHtml(t) + '">' + _escHtml(t) + ' - ' + _escHtml(_t(info.label_vi || info.label, info.label)) + '</option>';
  });
  typeSelect.innerHTML = h;
}

window._ridHistFilterChange = function(){
  _historyFilters.recordType = (document.getElementById(_moduleId + '-hf-type') || {}).value || '';
  _historyFilters.department = (document.getElementById(_moduleId + '-hf-dept') || {}).value || '';
  _historyFilters.status = (document.getElementById(_moduleId + '-hf-status') || {}).value || '';
  _historyFilters.dateFrom = (document.getElementById(_moduleId + '-hf-from') || {}).value || '';
  _historyFilters.dateTo = (document.getElementById(_moduleId + '-hf-to') || {}).value || '';
  _historyPage = 1;
  _loadHistory();
};

function _loadHistory(){
  var tableContainer = document.getElementById(_moduleId + '-history-table');
  if(!tableContainer) return;

  // Show loading state
  tableContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b">&#x23F3; ' + _t('Đang tải...','Loading...') + '</div>';

  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.getHistory){
    var filters = {
      page: _historyPage,
      pageSize: _historyPageSize
    };
    if(_historyFilters.recordType) filters.recordType = _historyFilters.recordType;
    if(_historyFilters.department) filters.department = _historyFilters.department;
    if(_historyFilters.status) filters.status = _historyFilters.status;
    if(_historyFilters.dateFrom) filters.dateFrom = _historyFilters.dateFrom;
    if(_historyFilters.dateTo) filters.dateTo = _historyFilters.dateTo;
    if(_historyFilters.search) filters.search = _historyFilters.search;

    AllocationTracker.getHistory(filters).then(function(data){
      if(data && data.ok){
        var historyĐạta = data.data || [];
        var totalPages = data.total_pages || 1;
        var currentPage = data.page || 1;

        // Render table
        AllocationTracker.renderHistoryTable(_moduleId + '-history-table', historyĐạta, {
          searchable: true,
          sortable: true,
          paginated: true,
          emptyMessage: _t('Chưa có mã nào được cấp','No IDs allocated yet'),
          onRowClick: function(allocId){
            _showAllocationDetail(allocId);
          }
        });

        // Bind void action events
        _bindHistoryActions();

        // Render pagination
        if(totalPages > 1){
          var paginationEl = document.querySelector('#' + _moduleId + '-history-table .at-pagination');
          if(paginationEl){
            AllocationTracker.renderPagination(paginationEl.id, currentPage, totalPages, function(page){
              _historyPage = page;
              _loadHistory();
            });
          }
        }
      } else {
        tableContainer.innerHTML = '<div class="rid-empty"><div class="rid-empty-icon">&#x1F4C2;</div><p>' + _t('Chưa có dữ liệu','No data available') + '</p></div>';
      }
    }).catch(function(){
      tableContainer.innerHTML = '<div class="rid-empty"><div class="rid-empty-icon">&#x26A0;</div><p>' + _t('Lỗi tải dữ liệu lịch sử','Error loading history data') + '</p></div>';
    });
  } else {
    tableContainer.innerHTML = '<div class="rid-empty"><div class="rid-empty-icon">&#x1F4C2;</div><p>' + _t('AllocationTracker chưa sẵn sàng','AllocationTracker not available') + '</p></div>';
  }
}

function _bindHistoryActions(){
  if(typeof AllocationTracker === 'undefined') return;

  // Listen for void action from the table
  AllocationTracker.on('action_void', function(data){
    if(!data || !data.allocationId) return;
    _ridVoidSingle(data.allocationId);
  });

  // Listen for download action from the table
  AllocationTracker.on('action_download', function(data){
    if(!data || !data.allocationId) return;
    var toast = window._fhShowToast || function(){};
    toast(_t('Đang tải form cho allocation...','Downloading form for allocation...'), 'info');

    AllocationTracker.getAllocationStatus(data.allocationId).then(function(statusĐạta){
      if(statusĐạta && statusĐạta.ok && statusĐạta.form_code){
        _ridDownloadForm(statusĐạta.form_code, data.allocationId);
      }
    });
  });
}

function _showAllocationDetail(allocId){
  // Could expand to show a detail panel -- for now, just copy the ID
  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.copyToClipboard){
    AllocationTracker.copyToClipboard(allocId);
    var toast = window._fhShowToast || function(){};
    toast(_t('Đã sao chép allocation ID','Copied allocation ID'), 'success');
  }
}

// ===================================================================
// VOID OPERATIONS
// ===================================================================
function _ridVoidSingle(allocId){
  if(!allocId) return;
  var reason = prompt(_t('Lý do hủy mã (tùy chọn):','Reason for voiding (optional):'), '');
  if(reason === null) return; // Cancelled

  var toast = window._fhShowToast || function(){};

  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.void){
    AllocationTracker.void(allocId, reason).then(function(data){
      if(data && data.ok){
        toast(_t('Đã hủy thanh cong.','Voided successfully.'), 'success');
        _loadHistory();
      } else {
        toast(_t('Không thể hủy: ','Cannot void: ') + ((data && data.error) || 'Unknown error'), 'error');
      }
    }).catch(function(){
      toast(_t('Lỗi kết nối.','Network error.'), 'error');
    });
  }
}

window._ridVoidUnused = function(){
  if(!confirm(_t('Bạn có chắc muốn hủy TẤT CẢ mã chưa sử dụng? Hành động này không thể hoàn tác.','Are you sure you want to void ALL unused IDs? This cannot be undone.'))){
    return;
  }

  var toast = window._fhShowToast || function(){};
  var callFn = (typeof apiCall === 'function') ? apiCall : null;

  if(callFn){
    callFn('record_id_void_unused', {department: _historyFilters.department || ''}, 'POST').then(function(data){
      if(data && data.ok){
        var count = data.voided_count || 0;
        toast(_t('Đã hủy ' + count + ' ma chua dung.','Voided ' + count + ' unused IDs.'), 'success');
        _loadHistory();
      } else {
        toast(_t('Lỗi: ','Error: ') + ((data && data.error) || ''), 'error');
      }
    }).catch(function(){
      toast(_t('Lỗi kết nối.','Network error.'), 'error');
    });
  } else {
    toast(_t('Chức năng chưa hỗ trợ.','Feature not yet supported.'), 'warn');
  }
};

// ===================================================================
// CLEANUP
// ===================================================================
window._ridCleanup = function(){
  if(_cascadeInstance){
    try{ _cascadeInstance.destroy(); }catch(e){}
    _cascadeInstance = null;
  }
};

})();

/* ===================================================================
   09b-form-fill-download.js -- Tab 2: Unified Fill & Download
   HESEM QMS Portal -- Cascading filters, online fill, offline download
   Dependencies: 09-online-forms.js, 09g-cascading-dropdown.js,
                 09h-allocation-tracker.js
   =================================================================== */

(function(){
'use strict';

// ── Helpers (from orchestrator) ──
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}
function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
function _uid(){
  return 'fd-' + Math.random().toString(36).substr(2, 9);
}

// ── Module State ──
var _cascadeInstance = null;
var _jobWoExpanded = false;
var _selectedJob = '';
var _selectedWo = '';
var _filteredSchemas = [];
var _historyExpanded = false;
var _historyPage = 1;
var _currentAllocation = null;
var _moduleId = _uid();

// ── Department config (from cascading_dropdown_config.json) ──
var DEPARTMENTS = [
  {value:'QA',  label:'Quality Assurance',      labelEn:'Quality Assurance',      label_vi:'Dam bao Chat luong'},
  {value:'PRO', label:'Production',             labelEn:'Production',             label_vi:'San xuat'},
  {value:'ENG', label:'Engineering',            labelEn:'Engineering',            label_vi:'Ky thuat'},
  {value:'SCM', label:'Supply Chain',           labelEn:'Supply Chain',           label_vi:'Chuoi cung ung'},
  {value:'HR',  label:'HR & Training',          labelEn:'HR & Training',          label_vi:'Nhan su & Dao tao'},
  {value:'EXE', label:'Executive / Management', labelEn:'Executive / Management', label_vi:'Ban Giam doc'},
  {value:'SAL', label:'Sales',                  labelEn:'Sales',                  label_vi:'Kinh doanh'},
  {value:'WH',  label:'Warehouse / Logistics',  labelEn:'Warehouse / Logistics',  label_vi:'Kho van'},
  {value:'IT',  label:'IT / Digital',            labelEn:'IT / Digital',            label_vi:'Cong nghe thong tin'},
  {value:'EHS', label:'EHS / Safety',            labelEn:'EHS / Safety',            label_vi:'An toan & Moi truong'}
];

var DELIVERY_MODES = [
  {value:'all',     label:'All',                    labelEn:'All',                    label_vi:'Tat ca'},
  {value:'online',  label:'Online (Web Portal)',     labelEn:'Online (Web Portal)',     label_vi:'Truc tuyen (Portal)'},
  {value:'offline', label:'Offline (Excel)',          labelEn:'Offline (Excel)',          label_vi:'Ngoai tuyen (Excel)'}
];

var FORM_SERIES_MAP = {
  'QA':  [600, 900],
  'PRO': [500],
  'ENG': [300],
  'SCM': [400],
  'HR':  [800],
  'EXE': [100],
  'SAL': [200],
  'WH':  [700],
  'IT':  [100],
  'EHS': [800]
};

var SERIES_LABELS = {
  '100': {label:'QMS Governance & Management',    label_vi:'Quan tri QMS & Quan ly'},
  '200': {label:'Sales & Estimation',             label_vi:'Kinh doanh & Bao gia'},
  '300': {label:'Engineering & Process',           label_vi:'Ky thuat & Quy trinh'},
  '400': {label:'Supply Chain & Purchasing',       label_vi:'Chuoi cung ung & Mua hang'},
  '500': {label:'Production & Maintenance',        label_vi:'San xuat & Bao tri'},
  '600': {label:'Quality Control & Calibration',   label_vi:'Kiem soat CL & Hieu chuan'},
  '700': {label:'Logistics & Shipping',            label_vi:'Kho van & Giao hang'},
  '800': {label:'HR, Training & EHS',              label_vi:'Nhan su, Dao tao & ATMT'},
  '900': {label:'Audit & Continuous Improvement',  label_vi:'Danh gia & Cai tien'}
};

// ===================================================================
// MAIN RENDER
// ===================================================================
window._renderFillDownload = function(schemas, entries, container){
  if(!container) return;

  _filteredSchemas = schemas || [];
  var h = '';

  // ── Section Header ──
  h += '<div class="fh-section">';
  h += '<div class="fh-section-head">';
  h += '<h2>&#x270F; ' + _t('Dien / Tai bieu mau','Fill / Download Forms') + '</h2>';
  h += '<span>' + _t('Chon phong ban va che do de loc form phu hop','Select department and mode to filter forms') + '</span>';
  h += '</div>';
  h += '</div>';

  // ── Cascading Dropdown Bar ──
  h += '<div id="' + _moduleId + '-cascade" class="fd-cascade-wrap"></div>';

  // ── Job/WO Context Filter (collapsible) ──
  h += '<div class="fd-jowo-toggle">';
  h += '<button type="button" class="fd-jowo-btn" id="' + _moduleId + '-jowo-toggle" onclick="_fdToggleJobWo()">';
  h += '<span class="fd-jowo-icon">' + (_jobWoExpanded ? '&#x25BC;' : '&#x25B6;') + '</span> ';
  h += _t('Loc theo Job / Work Order','Filter by Job / Work Order');
  h += '</button>';
  h += '</div>';
  h += '<div class="fd-jowo-panel" id="' + _moduleId + '-jowo-panel" style="display:' + (_jobWoExpanded?'block':'none') + '">';
  h += '<div class="fd-jowo-grid">';
  h += '<div class="fd-jowo-field">';
  h += '<label>' + _t('So Job','Job Number') + '</label>';
  h += '<input type="text" id="' + _moduleId + '-job" class="fd-jowo-input" placeholder="' + _t('VD: JOB-2026-0042','e.g. JOB-2026-0042') + '" value="' + _escHtml(_selectedJob) + '" oninput="_fdOnJobChange(this.value)">';
  h += '</div>';
  h += '<div class="fd-jowo-field">';
  h += '<label>' + _t('Work Order','Work Order') + '</label>';
  h += '<input type="text" id="' + _moduleId + '-wo" class="fd-jowo-input" placeholder="' + _t('VD: WO-2026-0101','e.g. WO-2026-0101') + '" value="' + _escHtml(_selectedWo) + '" oninput="_fdOnWoChange(this.value)">';
  h += '</div>';
  h += '<div class="fd-jowo-field">';
  h += '<button type="button" class="fd-jowo-apply" onclick="_fdApplyJobWo()">' + _t('Ap dung','Apply') + '</button>';
  h += '<button type="button" class="fd-jowo-clear" onclick="_fdClearJobWo()">' + _t('Xoa loc','Clear') + '</button>';
  h += '</div>';
  h += '</div>';
  h += '</div>';

  // ── Filename Preview Banner (hidden until form selected) ──
  h += '<div class="fd-filename-banner" id="' + _moduleId + '-filename" style="display:none">';
  h += '<div class="fd-filename-label">' + _t('Ten file ANNEX-137:','ANNEX-137 Filename:') + '</div>';
  h += '<div class="fd-filename-value" id="' + _moduleId + '-filename-value"></div>';
  h += '<button type="button" class="fd-filename-copy" onclick="_fdCopyFilename()">&#x1F4CB; ' + _t('Sao chep','Copy') + '</button>';
  h += '</div>';

  // ── Form Grid ──
  h += '<div id="' + _moduleId + '-grid" class="fd-grid">';
  h += _renderFormGrid(schemas);
  h += '</div>';

  // ── Submission History (collapsible) ──
  h += '<div class="fd-history-section">';
  h += '<button type="button" class="fd-history-toggle" id="' + _moduleId + '-history-toggle" onclick="_fdToggleHistory()">';
  h += '<span class="fd-jowo-icon">' + (_historyExpanded ? '&#x25BC;' : '&#x25B6;') + '</span> ';
  h += _t('Lich su gui gan day','Recent Submission History');
  h += '</button>';
  h += '<div class="fd-history-body" id="' + _moduleId + '-history-body" style="display:' + (_historyExpanded?'block':'none') + '">';
  h += '<div id="' + _moduleId + '-history-table"></div>';
  h += '</div>';
  h += '</div>';

  container.innerHTML = h;

  // Initialize cascading dropdown
  _initCascade();
};

// ===================================================================
// CASCADING DROPDOWN INIT
// ===================================================================
function _initCascade(){
  if(_cascadeInstance){
    try{ _cascadeInstance.destroy(); }catch(e){}
  }

  if(typeof CascadingDropdown !== 'function') return;

  _cascadeInstance = new CascadingDropdown({
    containerId: _moduleId + '-cascade',
    className: 'fd-cascade-bar',
    levels: [
      {
        key: 'department',
        label: 'Phong ban',
        labelEn: 'Department',
        dataSource: 'static',
        options: DEPARTMENTS.map(function(d){
          return {value: d.value, label: d.label_vi, labelEn: d.labelEn};
        })
      },
      {
        key: 'delivery_mode',
        label: 'Che do',
        labelEn: 'Delivery Mode',
        dataSource: 'static',
        options: DELIVERY_MODES.map(function(m){
          return {value: m.value, label: m.label_vi, labelEn: m.labelEn};
        })
      },
      {
        key: 'form_series',
        label: 'Nhom form',
        labelEn: 'Form Series',
        dataSource: 'dependent',
        dependsOn: 'department',
        resolver: function(selections){
          var dept = selections.department;
          if(!dept) return [];
          var seriesList = FORM_SERIES_MAP[dept] || [];
          return seriesList.map(function(s){
            var sl = SERIES_LABELS[String(s)] || {label: s + '00 Series', label_vi: 'Nhom ' + s + '00'};
            return {value: String(s), label: sl.label_vi, labelEn: sl.label};
          });
        }
      },
      {
        key: 'form',
        label: 'Bieu mau',
        labelEn: 'Form',
        dataSource: 'dependent',
        dependsOn: 'form_series',
        resolver: function(selections){
          var dept = selections.department;
          var series = selections.form_series;
          var mode = selections.delivery_mode;
          if(!series) return [];

          var seriesNum = parseInt(series, 10);
          var schemas = (window._fhState && window._fhState.schemas) ? Object.values(window._fhState.schemas) : _filteredSchemas;

          return schemas.filter(function(s){
            var code = s.form_code || '';
            var num = parseInt(code.replace('FRM-',''), 10);
            var inSeries = num >= seriesNum * 1 && num < (seriesNum + 100);
            if(!inSeries) return false;

            // Delivery mode filter
            if(mode === 'online' && s.online === false) return false;
            if(mode === 'offline' && s.online !== false) return false;

            return true;
          }).map(function(s){
            var isOnline = s.online !== false;
            var badge = isOnline ? '[ONLINE]' : '[EXCEL]';
            return {
              value: s.form_code,
              label: s.form_code + ' ' + badge + ' ' + (s.title_vi || s.title || ''),
              labelEn: s.form_code + ' ' + badge + ' ' + (s.title || '')
            };
          });
        }
      }
    ],
    onChange: function(selections, levelKey){
      _onCascadeChange(selections, levelKey);
    }
  });

  _cascadeInstance.render();
}

// ===================================================================
// CASCADE CHANGE HANDLER
// ===================================================================
function _onCascadeChange(selections, levelKey){
  var schemas = (window._fhState && window._fhState.schemas) ? Object.values(window._fhState.schemas) : _filteredSchemas;

  // If a specific form is selected, show only that form
  if(selections.form){
    var matched = schemas.filter(function(s){ return s.form_code === selections.form; });
    _updateGrid(matched);
    return;
  }

  // Filter by department, mode, series
  var filtered = schemas.filter(function(s){
    // Department filter via form series
    if(selections.department){
      var seriesList = FORM_SERIES_MAP[selections.department] || [];
      var code = s.form_code || '';
      var num = parseInt(code.replace('FRM-',''), 10);
      var inDept = seriesList.some(function(ser){
        return num >= ser && num < (ser + 100);
      });
      if(!inDept) return false;
    }

    // Delivery mode
    if(selections.delivery_mode === 'online' && s.online === false) return false;
    if(selections.delivery_mode === 'offline' && s.online !== false) return false;

    // Form series
    if(selections.form_series){
      var seriesNum = parseInt(selections.form_series, 10);
      var fNum = parseInt((s.form_code||'').replace('FRM-',''), 10);
      if(fNum < seriesNum || fNum >= (seriesNum + 100)) return false;
    }

    return true;
  });

  _updateGrid(filtered);
}

function _updateGrid(schemas){
  var gridEl = document.getElementById(_moduleId + '-grid');
  if(!gridEl) return;
  gridEl.innerHTML = _renderFormGrid(schemas);
}

// ===================================================================
// FORM GRID RENDERING
// ===================================================================
function _renderFormGrid(schemas){
  if(!schemas || schemas.length === 0){
    return '<div class="fd-empty">' +
      '<div class="fd-empty-icon">&#x1F50D;</div>' +
      '<p>' + _t('Khong tim thay form nao. Dieu chinh bo loc o tren.','No forms found. Adjust the filters above.') + '</p>' +
      '</div>';
  }

  var FORM_COLORS = window._fhFormColors || {};
  var entries = (window._fhState && window._fhState.entries) ? window._fhState.entries : {};

  // Group by category
  var groups = {};
  schemas.forEach(function(s){
    var cat = s.category || 'other';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });

  var h = '';
  var catOrder = ['production','quality','maintenance','hr','logistics','safety','other'];
  catOrder.forEach(function(cat){
    if(!groups[cat] || groups[cat].length === 0) return;
    var cfg = FORM_COLORS[cat] || {bg:'#f8f9fa', border:'#adb5bd', icon:'&#x1F4C4;', label:cat, labelEn:cat};

    h += '<div class="forms-group">';
    h += '<h2 class="forms-group-title"><span class="forms-group-icon">' + cfg.icon + '</span> ' + _t(cfg.label, cfg.labelEn) + ' <span style="font-size:11px;color:#64748b;font-weight:400;margin-left:4px">(' + groups[cat].length + ')</span></h2>';
    h += '<div class="forms-grid">';

    groups[cat].forEach(function(s){
      var entryCount = (entries[s.form_code]||[]).length;
      var isOnline = s.online !== false;
      var lastUsed = _getLastUsedDate(entries[s.form_code]);

      h += '<div class="form-card fd-form-card" style="border-left:4px solid ' + cfg.border + '" data-form-code="' + _escHtml(s.form_code) + '">';

      // Badge
      h += '<span class="form-card-type ' + (isOnline ? 'form-card-online' : 'form-card-excel') + '">' + (isOnline ? 'ONLINE' : 'OFFLINE') + '</span>';

      // Header
      h += '<div class="form-card-header">';
      h += '<span class="form-card-code">' + _escHtml(s.form_code) + '</span>';
      h += '<span class="form-card-freq">' + _escHtml(s.sop_ref || '') + '</span>';
      h += '</div>';

      // Title (bilingual)
      h += '<div class="form-card-title">' + _escHtml(_t(s.title_vi||s.title, s.title)) + '</div>';

      // Meta row
      h += '<div class="fd-card-meta">';
      if(entryCount > 0){
        h += '<span class="form-card-entries">' + entryCount + ' ' + _t('ban ghi','entries') + '</span>';
      }
      if(lastUsed){
        h += '<span class="fd-card-last-used">' + _t('Lan cuoi: ','Last: ') + lastUsed + '</span>';
      }
      h += '</div>';

      // Action button
      h += '<div class="form-card-footer">';
      if(isOnline){
        h += '<button class="form-card-btn fd-btn-online" onclick="_fdFillOnline(\'' + _escHtml(s.form_code) + '\')">' + _t('Dien online','Fill online') + ' &rarr;</button>';
      } else {
        h += '<button class="form-card-btn fd-btn-offline" onclick="_fdDownloadOffline(\'' + _escHtml(s.form_code) + '\')">' + _t('Tai xuong','Download') + ' &darr;</button>';
      }
      h += '</div>';

      h += '</div>';
    });

    h += '</div></div>';
  });

  return h;
}

function _getLastUsedDate(entries){
  if(!entries || entries.length === 0) return '';
  var latest = entries[0];
  if(!latest.submitted_at) return '';
  try{
    var d = new Date(latest.submitted_at);
    if(isNaN(d.getTime())) return '';
    var dd = String(d.getDate()).padStart(2,'0');
    var mm = String(d.getMonth()+1).padStart(2,'0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }catch(e){ return ''; }
}

// ===================================================================
// ONLINE FILL FLOW
// ===================================================================
window._fdFillOnline = function(formCode){
  var schemas = (window._fhState && window._fhState.schemas) ? window._fhState.schemas : {};
  var schema = schemas[formCode];
  if(!schema){
    // Try to load schema
    _fdLoadSchemaAndFill(formCode);
    return;
  }

  // Generate ANNEX-137 filename preview (P1 pattern)
  var filename = _generateFilename(schema);
  _showFilenameBanner(filename);

  // Store current allocation context
  _currentAllocation = {
    formCode: formCode,
    filename: filename,
    mode: 'online'
  };

  // Render form using shared orchestrator function
  var page = document.getElementById('page-forms');
  if(typeof window._renderFormEntry === 'function'){
    window._renderFormEntry(schema, page);
  } else {
    window.renderOnlineForms(formCode);
  }
};

function _fdLoadSchemaAndFill(formCode){
  var callFn = (typeof apiCall === 'function') ? apiCall : null;
  var toast = window._fhShowToast || function(){};
  toast(_t('Dang tai form...','Loading form...'), 'info');

  if(callFn){
    callFn('online_form_schema', {code: formCode}, 'GET').then(function(d){
      if(d && d.ok && d.schema){
        if(window._fhState) window._fhState.schemas[formCode] = d.schema;
        _fdFillOnline(formCode);
      } else {
        toast(_t('Khong the tai schema form.','Could not load form schema.'), 'error');
      }
    }).catch(function(){
      toast(_t('Loi ket noi.','Network error.'), 'error');
    });
  } else {
    fetch('api.php?action=online_form_schema&code=' + encodeURIComponent(formCode))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.ok && d.schema){
          if(window._fhState) window._fhState.schemas[formCode] = d.schema;
          _fdFillOnline(formCode);
        }
      });
  }
}

function _generateFilename(schema){
  var now = new Date();
  var date = now.getFullYear().toString() +
    String(now.getMonth()+1).padStart(2,'0') +
    String(now.getDate()).padStart(2,'0');
  var hhmm = String(now.getHours()).padStart(2,'0') +
    String(now.getMinutes()).padStart(2,'0');

  var userId = (typeof window._fhGetUserId === 'function') ? window._fhGetUserId() : 'USR';
  var formCode = schema.form_code || 'FRM-000';
  var version = 'V' + (schema.version || '1') + '.0';

  // Scope: use job number if available
  var scope = _selectedJob || 'GENERAL';

  // P1 pattern: FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.xlsx
  return formCode + '_' + version + '_' + scope + '_' + date + '_' + hhmm + '-' + userId + '.xlsx';
}

function _showFilenameBanner(filename){
  var banner = document.getElementById(_moduleId + '-filename');
  var valueEl = document.getElementById(_moduleId + '-filename-value');
  if(banner && valueEl){
    valueEl.textContent = filename;
    banner.style.display = 'flex';
  }
}

window._fdCopyFilename = function(){
  var valueEl = document.getElementById(_moduleId + '-filename-value');
  if(!valueEl) return;
  var copyFn = window._fhCopyToClipboard || function(t){
    if(navigator.clipboard) navigator.clipboard.writeText(t);
  };
  copyFn(valueEl.textContent || '');
};

// ===================================================================
// OFFLINE DOWNLOAD FLOW
// ===================================================================
window._fdDownloadOffline = function(formCode){
  var schemas = (window._fhState && window._fhState.schemas) ? window._fhState.schemas : {};
  var schema = schemas[formCode];
  var toast = window._fhShowToast || function(){};

  // Get cascade selections for context
  var dept = '';
  var scope = _selectedJob || '';
  if(_cascadeInstance){
    var sel = _cascadeInstance.getSelections();
    dept = sel.department || '';
  }

  // Generate filename
  var filename = '';
  if(schema){
    filename = _generateFilename(schema);
  }

  toast(_t('Dang tai form ' + formCode + '...','Downloading form ' + formCode + '...'), 'info');

  // Try AllocationTracker first (for tracked downloads)
  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.downloadForm){
    // First allocate an ID, then download
    AllocationTracker.allocate(formCode, dept, {
      notes: _t('Tai form offline tu Tab 2','Offline form download from Tab 2'),
      linkedOrderId: _selectedJob || null
    }).then(function(allocResult){
      if(allocResult && allocResult.ok){
        var allocId = allocResult.allocation_id || allocResult.allocationId;
        _currentAllocation = {
          allocationId: allocId,
          formCode: formCode,
          filename: filename,
          mode: 'offline'
        };

        return AllocationTracker.downloadForm(allocId, formCode);
      } else {
        // Fallback to simple download
        _fallbackDownload(formCode, schema, toast);
        return null;
      }
    }).then(function(dlResult){
      if(dlResult && dlResult.ok){
        toast(_t('Da tai ' + formCode + ' thanh cong!','Downloaded ' + formCode + ' successfully!'), 'success');
        _showDownloadConfirmation(formCode, filename);
      }
    }).catch(function(){
      _fallbackDownload(formCode, schema, toast);
    });
  } else {
    // Direct download without allocation tracking
    _fallbackDownload(formCode, schema, toast);
  }
};

function _fallbackDownload(formCode, schema, toast){
  if(typeof window._fhDownloadBlank === 'function'){
    window._fhDownloadBlank(formCode);
  } else if(schema && schema.blank_path){
    var a = document.createElement('a');
    a.href = '../' + schema.blank_path;
    a.download = schema.blank_filename || (formCode + '.xlsx');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast(_t('Dang tai ','Downloading ') + formCode, 'info');
  } else {
    toast(_t('Form blank chua co san.','Blank form not available.'), 'warn');
  }
}

function _showDownloadConfirmation(formCode, filename){
  var gridEl = document.getElementById(_moduleId + '-grid');
  if(!gridEl) return;

  // Insert confirmation toast at top of grid
  var confirmDiv = document.createElement('div');
  confirmDiv.className = 'fd-dl-confirm';
  confirmDiv.innerHTML = '<div class="fd-dl-confirm-icon">&#x2705;</div>' +
    '<div class="fd-dl-confirm-body">' +
    '<strong>' + _t('Da tai thanh cong!','Downloaded successfully!') + '</strong>' +
    '<div class="fd-dl-confirm-file">' + _escHtml(filename || formCode + '.xlsx') + '</div>' +
    '</div>' +
    '<button type="button" class="fd-dl-confirm-copy" onclick="_fdCopyDlFilename(this)" data-filename="' + _escHtml(filename || formCode + '.xlsx') + '">&#x1F4CB; ' + _t('Copy ten file','Copy filename') + '</button>' +
    '<button type="button" class="fd-dl-confirm-close" onclick="this.parentNode.remove()">&#x2715;</button>';

  gridEl.insertBefore(confirmDiv, gridEl.firstChild);

  // Auto-dismiss after 8 seconds
  setTimeout(function(){
    if(confirmDiv.parentNode) confirmDiv.remove();
  }, 8000);
}

window._fdCopyDlFilename = function(btn){
  var filename = btn.getAttribute('data-filename') || '';
  var copyFn = window._fhCopyToClipboard || function(t){
    if(navigator.clipboard) navigator.clipboard.writeText(t);
  };
  copyFn(filename);
};

// ===================================================================
// JOB / WO CONTEXT FILTER
// ===================================================================
window._fdToggleJobWo = function(){
  _jobWoExpanded = !_jobWoExpanded;
  var panel = document.getElementById(_moduleId + '-jowo-panel');
  var toggleBtn = document.getElementById(_moduleId + '-jowo-toggle');
  if(panel) panel.style.display = _jobWoExpanded ? 'block' : 'none';
  if(toggleBtn){
    var iconSpan = toggleBtn.querySelector('.fd-jowo-icon');
    if(iconSpan) iconSpan.innerHTML = _jobWoExpanded ? '&#x25BC;' : '&#x25B6;';
  }
};

window._fdOnJobChange = function(val){
  _selectedJob = (val || '').trim();
};

window._fdOnWoChange = function(val){
  _selectedWo = (val || '').trim();
};

window._fdApplyJobWo = function(){
  // Re-filter the grid based on job/WO context
  // In a full implementation, this would call an API to get forms relevant to the job
  var toast = window._fhShowToast || function(){};
  if(_selectedJob){
    toast(_t('Loc theo Job: ','Filtered by Job: ') + _selectedJob, 'info');
  }

  // Reload grid with current cascade selections
  if(_cascadeInstance){
    var sel = _cascadeInstance.getSelections();
    _onCascadeChange(sel, 'form');
  }
};

window._fdClearJobWo = function(){
  _selectedJob = '';
  _selectedWo = '';
  var jobInput = document.getElementById(_moduleId + '-job');
  var woInput = document.getElementById(_moduleId + '-wo');
  if(jobInput) jobInput.value = '';
  if(woInput) woInput.value = '';

  // Re-render grid
  if(_cascadeInstance){
    var sel = _cascadeInstance.getSelections();
    _onCascadeChange(sel, 'form');
  }
};

// ===================================================================
// SUBMISSION HISTORY (collapsible)
// ===================================================================
window._fdToggleHistory = function(){
  _historyExpanded = !_historyExpanded;
  var body = document.getElementById(_moduleId + '-history-body');
  var toggleBtn = document.getElementById(_moduleId + '-history-toggle');
  if(body) body.style.display = _historyExpanded ? 'block' : 'none';
  if(toggleBtn){
    var iconSpan = toggleBtn.querySelector('.fd-jowo-icon');
    if(iconSpan) iconSpan.innerHTML = _historyExpanded ? '&#x25BC;' : '&#x25B6;';
  }

  if(_historyExpanded){
    _loadSubmissionHistory();
  }
};

function _loadSubmissionHistory(){
  var tableContainer = document.getElementById(_moduleId + '-history-table');
  if(!tableContainer) return;

  // Use AllocationTracker if available
  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.getHistory){
    tableContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b">&#x23F3; ' + _t('Dang tai...','Loading...') + '</div>';

    var filters = {
      page: _historyPage,
      pageSize: 20
    };

    // Add form filter if a form is selected
    if(_cascadeInstance){
      var sel = _cascadeInstance.getSelections();
      if(sel.form) filters.recordType = sel.form;
      if(sel.department) filters.department = sel.department;
    }

    AllocationTracker.getHistory(filters).then(function(data){
      if(data && data.ok && data.data){
        var historyId = _moduleId + '-history-table';
        AllocationTracker.renderHistoryTable(historyId, data.data, {
          searchable: true,
          sortable: true,
          paginated: true,
          emptyMessage: _t('Chua co ban ghi nao','No records yet')
        });

        // Render pagination if available
        if(data.total_pages && data.total_pages > 1){
          var paginationId = historyId + '-pagination';
          if(document.getElementById(paginationId)){
            AllocationTracker.renderPagination(paginationId, data.page || 1, data.total_pages, function(page){
              _historyPage = page;
              _loadSubmissionHistory();
            });
          }
        }
      } else {
        _renderFallbackHistory(tableContainer);
      }
    }).catch(function(){
      _renderFallbackHistory(tableContainer);
    });
  } else {
    _renderFallbackHistory(tableContainer);
  }
}

function _renderFallbackHistory(container){
  var entries = (window._fhState && window._fhState.entries) ? window._fhState.entries : {};
  var allEntries = [];

  Object.keys(entries).forEach(function(code){
    (entries[code]||[]).forEach(function(e){
      e._formCode = code;
      allEntries.push(e);
    });
  });

  allEntries.sort(function(a,b){
    return (b.submitted_at||'').localeCompare(a.submitted_at||'');
  });

  if(allEntries.length === 0){
    container.innerHTML = '<div class="fd-empty"><div class="fd-empty-icon">&#x1F4C2;</div><p>' + _t('Chua co ban ghi nao','No records yet') + '</p></div>';
    return;
  }

  var h = '<div class="fd-history-wrap"><table class="fh-history-table">';
  h += '<thead><tr>';
  h += '<th>' + _t('Trang thai','Status') + '</th>';
  h += '<th>' + _t('Form','Form') + '</th>';
  h += '<th>' + _t('Entry ID','Entry ID') + '</th>';
  h += '<th>' + _t('Nguoi gui','Submitted by') + '</th>';
  h += '<th>' + _t('Thoi gian','Timestamp') + '</th>';
  h += '</tr></thead><tbody>';

  allEntries.slice(0, 20).forEach(function(e){
    var dt = e.submitted_at ? new Date(e.submitted_at).toLocaleString('vi-VN') : '&mdash;';
    var badgeCls = e._draft ? 'fh-badge-draft' : 'fh-badge-submitted';
    var statusLabel = e._draft ? _t('Nhap','Draft') : _t('Da gui','Submitted');
    var notReturned = (!e._draft && !e.submitted_at) ? true : false;
    if(notReturned){
      badgeCls = 'fh-badge-pending';
      statusLabel = _t('Chua tra','Not returned');
    }

    h += '<tr>';
    h += '<td><span class="fh-badge ' + badgeCls + '"><span class="fh-badge-dot" style="background:currentColor"></span> ' + statusLabel + '</span></td>';
    h += '<td><span class="mono">' + _escHtml(e._formCode||'') + '</span></td>';
    h += '<td class="mono">' + _escHtml(e.entry_id||'') + '</td>';
    h += '<td>' + _escHtml(e.submitted_by||'') + '</td>';
    h += '<td>' + dt + '</td>';
    h += '</tr>';
  });

  h += '</tbody></table></div>';
  container.innerHTML = h;
}

// ===================================================================
// CLEANUP
// ===================================================================
window._fdCleanup = function(){
  if(_cascadeInstance){
    try{ _cascadeInstance.destroy(); }catch(e){}
    _cascadeInstance = null;
  }
};

})();

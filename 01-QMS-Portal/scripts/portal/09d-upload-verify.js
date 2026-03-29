/* ===================================================================
   09d-upload-verify.js -- Tab 4: Enhanced Upload & Verify
   HESEM QMS Portal -- 3-step verification pipeline for form uploads
   Uses: validateFilename (10-upload-validator.js),
         AllocationTracker (09h-allocation-tracker.js),
         apiCall (02-state-auth-ui.js)
   =================================================================== */

(function(){
'use strict';

// ── Helpers ──
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}
function _uid(){
  return 'uv-' + Math.random().toString(36).substr(2, 9);
}
function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
function _formatBytes(bytes){
  if(!bytes || bytes === 0) return '0 B';
  var k = 1024;
  var sizes = ['B','KB','MB','GB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}
function _formatDate(dateStr){
  if(!dateStr) return '';
  try {
    var d = new Date(dateStr);
    if(isNaN(d.getTime())) return dateStr;
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
  } catch(e){ return dateStr; }
}
function _apiCall(action, payload, method, timeout){
  if(typeof apiCall === 'function'){
    return apiCall(action, payload, method || 'POST', timeout || 30000);
  }
  var url = 'api.php?action=' + encodeURIComponent(action);
  var opts = { method: method || 'POST', credentials: 'include', headers: {'Content-Type':'application/json'} };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(payload && (method || 'POST') !== 'GET') opts.body = JSON.stringify(payload);
  return fetch(url, opts).then(function(r){ return r.json(); });
}
function _apiCallFormData(action, formData){
  if(typeof apiCallFormData === 'function'){
    return apiCallFormData(action, formData);
  }
  var url = 'api.php?action=' + encodeURIComponent(action);
  var opts = { method: 'POST', credentials: 'include', body: formData };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers = {'X-CSRF-Token': csrfToken};
  return fetch(url, opts).then(function(r){ return r.json(); });
}

// ── Constants ──
var MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
var ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/pdf',
  'image/jpeg','image/png','image/gif','image/webp','image/bmp','image/tiff'
];
var ACCEPTED_EXTENSIONS = ['.xlsx','.xlsm','.pdf','.jpg','.jpeg','.png','.gif','.webp','.bmp','.tiff'];
var EXCEL_EXTENSIONS = ['.xlsx','.xlsm'];

var STATUS_ICONS = {
  pass:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="#16a34a"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm3.78-9.72a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25z"/></svg>',
  fail:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="#dc2626"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
  warn:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="#d97706"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
  pending: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#94a3b8"><circle cx="8" cy="8" r="7" fill="none" stroke="#94a3b8" stroke-width="2"/></svg>',
  loading: '<div class="uv-spinner-sm"></div>'
};

var FILE_ICONS = {
  xlsx: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#16a34a"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M8 13h2l2 3 2-3h2M8 17h8" fill="none" stroke="#fff" stroke-width="1.2"/></svg>',
  xlsm: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#d97706"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M8 13h2l2 3 2-3h2" fill="none" stroke="#fff" stroke-width="1.2"/></svg>',
  pdf:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="#dc2626"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6" fill="none" stroke="#fff" stroke-width="1"/><text x="8" y="17" font-size="6" fill="#fff" font-weight="700">PDF</text></svg>',
  img:  '<svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6" fill="none" stroke="#fff" stroke-width="1"/><circle cx="10" cy="13" r="2" fill="#fff"/><path d="M6 20l4-5 2.5 3L16 14l4 6" fill="none" stroke="#fff" stroke-width="1"/></svg>'
};

// ── Module State ──
var _containerId = '';
var _files = []; // {id, file, name, size, ext, type, steps:[], overallStatus, allocationId, versionInfo, confirmed}
var _historyPage = 1;
var _historyFilters = {};
var _historyExpanded = false;

// ===================================================================
// Main Render
// ===================================================================

window._renderUploadVerify = function(schemas, entries, container){
  _containerId = container.id || 'uv-root';
  if(!container.id) container.id = _containerId;
  _files = [];
  _historyPage = 1;
  _historyFilters = {};
  _historyExpanded = false;

  var h = '';
  h += '<div class="uv-container">';

  // ── Header ──
  h += '<div class="uv-header">';
  h += '<div>';
  h += '<h2 class="uv-title">' + _t('Upload & Xac minh', 'Upload & Verify') + '</h2>';
  h += '<p class="uv-subtitle">' + _t(
    'Tai len bieu mau da dien va xac minh tinh hop le truoc khi nop',
    'Upload completed forms and verify integrity before submission'
  ) + '</p>';
  h += '</div>';
  h += '</div>';

  // ── Dropzone ──
  h += '<div class="uv-dropzone" id="' + _containerId + '-dropzone" tabindex="0" role="button" ';
  h += 'aria-label="' + _t('Keo tha file hoac nhan de chon', 'Drag & drop files or click to browse') + '">';
  h += '<div class="uv-dropzone-inner">';
  h += '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  h += '<p class="uv-dropzone-text">' + _t(
    'Keo tha file vao day hoac <strong>nhan de chon file</strong>',
    'Drag & drop files here or <strong>click to browse</strong>'
  ) + '</p>';
  h += '<p class="uv-dropzone-hint">' + _t(
    'Excel (.xlsx/.xlsm), PDF, Hinh anh — Toi da 25 MB/file',
    'Excel (.xlsx/.xlsm), PDF, Images — Max 25 MB per file'
  ) + '</p>';
  h += '</div>';
  h += '<input type="file" id="' + _containerId + '-fileinput" class="uv-file-input" multiple ';
  h += 'accept="' + ACCEPTED_EXTENSIONS.join(',') + '" aria-hidden="true" tabindex="-1">';
  h += '</div>';

  // ── File Queue ──
  h += '<div class="uv-queue" id="' + _containerId + '-queue"></div>';

  // ── Submit Area ──
  h += '<div class="uv-submit-area" id="' + _containerId + '-submit-area" style="display:none">';
  h += '<button type="button" class="uv-submit-btn" id="' + _containerId + '-submit-btn" disabled>';
  h += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  h += '<span>' + _t('Nop tat ca file hop le', 'Submit all valid files') + '</span>';
  h += '</button>';
  h += '<span class="uv-submit-count" id="' + _containerId + '-submit-count"></span>';
  h += '</div>';

  // ── Upload History (collapsible) ──
  h += '<div class="uv-history-section" id="' + _containerId + '-history-section">';
  h += '<button type="button" class="uv-history-toggle" id="' + _containerId + '-history-toggle">';
  h += '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="uv-history-chevron"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
  h += '<span>' + _t('Lich su upload', 'Upload History') + '</span>';
  h += '</button>';
  h += '<div class="uv-history-body" id="' + _containerId + '-history-body" style="display:none">';
  h += '<div class="uv-history-filters" id="' + _containerId + '-history-filters"></div>';
  h += '<div class="uv-history-table" id="' + _containerId + '-history-table">';
  h += '<div class="uv-loading">' + _t('Dang tai...', 'Loading...') + '</div>';
  h += '</div>';
  h += '</div>';
  h += '</div>';

  h += '</div>'; // .uv-container
  container.innerHTML = h;

  _bindDropzoneEvents();
  _bindSubmitEvents();
  _bindHistoryToggle();
};

// ===================================================================
// Dropzone Events
// ===================================================================

function _bindDropzoneEvents(){
  var dropzone = document.getElementById(_containerId + '-dropzone');
  var fileInput = document.getElementById(_containerId + '-fileinput');
  if(!dropzone || !fileInput) return;

  // Click to browse
  dropzone.addEventListener('click', function(e){
    if(e.target === fileInput) return;
    fileInput.click();
  });

  // Keyboard support
  dropzone.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', function(){
    if(fileInput.files && fileInput.files.length > 0){
      _processFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  // Drag & drop
  dropzone.addEventListener('dragenter', function(e){
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('uv-dropzone-active');
  });
  dropzone.addEventListener('dragover', function(e){
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('uv-dropzone-active');
  });
  dropzone.addEventListener('dragleave', function(e){
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('uv-dropzone-active');
  });
  dropzone.addEventListener('drop', function(e){
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('uv-dropzone-active');
    if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0){
      _processFiles(e.dataTransfer.files);
    }
  });
}

// ===================================================================
// File Processing
// ===================================================================

function _processFiles(fileList){
  for(var i = 0; i < fileList.length; i++){
    var file = fileList[i];
    var ext = _getExt(file.name);

    // Pre-validation: extension
    if(ACCEPTED_EXTENSIONS.indexOf(ext) < 0){
      _showToast(_t(
        'File "' + file.name + '" khong duoc ho tro. Chi chap nhan: ' + ACCEPTED_EXTENSIONS.join(', '),
        'File "' + file.name + '" is not supported. Accepted: ' + ACCEPTED_EXTENSIONS.join(', ')
      ), 'error');
      continue;
    }

    // Pre-validation: size
    if(file.size > MAX_FILE_SIZE){
      _showToast(_t(
        'File "' + file.name + '" qua lon (' + _formatBytes(file.size) + '). Toi da 25 MB.',
        'File "' + file.name + '" is too large (' + _formatBytes(file.size) + '). Max 25 MB.'
      ), 'error');
      continue;
    }

    var fileEntry = {
      id: _uid(),
      file: file,
      name: file.name,
      size: file.size,
      ext: ext,
      type: _getFileType(ext),
      steps: [
        { name: _t('Kiem tra ten file', 'Filename check'), status: 'pending', detail: '' },
        { name: _t('Kiem tra hidden sheet', 'Hidden sheet check'), status: 'pending', detail: '' },
        { name: _t('Doi chieu cap phat', 'Allocation cross-ref'), status: 'pending', detail: '' }
      ],
      overallStatus: 'pending',
      allocationId: null,
      versionInfo: null,
      confirmed: false
    };

    _files.push(fileEntry);
  }

  _renderQueue();
  _runVerificationPipeline();
}

function _getExt(filename){
  var idx = filename.lastIndexOf('.');
  if(idx < 0) return '';
  return filename.substring(idx).toLowerCase();
}

function _getFileType(ext){
  if(ext === '.xlsx' || ext === '.xlsm') return 'excel';
  if(ext === '.pdf') return 'pdf';
  return 'image';
}

function _getFileIcon(type, ext){
  if(type === 'excel') return FILE_ICONS[ext === '.xlsm' ? 'xlsm' : 'xlsx'];
  if(type === 'pdf') return FILE_ICONS.pdf;
  return FILE_ICONS.img;
}

// ===================================================================
// Queue Rendering
// ===================================================================

function _renderQueue(){
  var queue = document.getElementById(_containerId + '-queue');
  if(!queue) return;

  if(_files.length === 0){
    queue.innerHTML = '';
    _updateSubmitArea();
    return;
  }

  var h = '';
  for(var i = 0; i < _files.length; i++){
    h += _renderFileCard(_files[i]);
  }
  queue.innerHTML = h;

  _bindQueueEvents();
  _updateSubmitArea();
}

function _renderFileCard(entry){
  var h = '';
  var overallClass = 'uv-file-' + entry.overallStatus;

  h += '<div class="uv-file-card ' + overallClass + '" id="uv-card-' + entry.id + '" data-file-id="' + entry.id + '">';

  // File info row
  h += '<div class="uv-file-info">';
  h += '<div class="uv-file-icon">' + _getFileIcon(entry.type, entry.ext) + '</div>';
  h += '<div class="uv-file-details">';
  h += '<div class="uv-file-name" title="' + _escHtml(entry.name) + '">' + _escHtml(entry.name) + '</div>';
  h += '<div class="uv-file-meta">' + _escHtml(_formatBytes(entry.size)) + ' &middot; ' + _escHtml(entry.ext.toUpperCase().replace('.','')) + '</div>';
  h += '</div>';
  h += '<div class="uv-file-overall">' + _renderOverallBadge(entry.overallStatus) + '</div>';
  h += '<button type="button" class="uv-file-remove" data-remove-id="' + entry.id + '" title="' + _t('Xoa', 'Remove') + '" aria-label="' + _t('Xoa file', 'Remove file') + '">';
  h += '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
  h += '</button>';
  h += '</div>';

  // Verification steps
  h += '<div class="uv-steps">';
  for(var s = 0; s < entry.steps.length; s++){
    var step = entry.steps[s];
    var stepIcon = STATUS_ICONS[step.status] || STATUS_ICONS.pending;
    h += '<div class="uv-step uv-step-' + step.status + '">';
    h += '<div class="uv-step-icon">' + stepIcon + '</div>';
    h += '<div class="uv-step-content">';
    h += '<div class="uv-step-name">' + _t('Buoc ' + (s + 1), 'Step ' + (s + 1)) + ': ' + _escHtml(step.name) + '</div>';
    if(step.detail){
      h += '<div class="uv-step-detail">' + step.detail + '</div>';
    }
    h += '</div>';
    h += '</div>';
  }
  h += '</div>';

  // Warning confirmation area (for resubmit case)
  if(entry.overallStatus === 'warn' && entry.versionInfo && !entry.confirmed){
    h += '<div class="uv-warn-confirm" id="uv-warn-' + entry.id + '">';
    h += '<div class="uv-warn-msg">';
    h += '<span class="uv-warn-icon">' + STATUS_ICONS.warn + '</span>';
    h += '<span>' + _t(
      'File nay da duoc nop truoc do la V' + entry.versionInfo.currentVersion + '. Nop lai se tao V' + (entry.versionInfo.currentVersion + 1) + '.',
      'This file was previously submitted as V' + entry.versionInfo.currentVersion + '. Resubmitting will create V' + (entry.versionInfo.currentVersion + 1) + '.'
    ) + '</span>';
    h += '</div>';
    h += '<button type="button" class="uv-warn-confirm-btn" data-confirm-id="' + entry.id + '">';
    h += _t('Xac nhan nop lai', 'Confirm resubmission');
    h += '</button>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function _renderOverallBadge(status){
  var config = {
    pending:  { label: _t('Dang cho', 'Pending'),          color: '#94a3b8', bg: '#f1f5f9' },
    loading:  { label: _t('Dang kiem tra', 'Verifying'),    color: '#3b82f6', bg: '#dbeafe' },
    ready:    { label: _t('San sang nop', 'Ready'),         color: '#16a34a', bg: '#dcfce7' },
    warn:     { label: _t('Can xac nhan', 'Needs confirm'), color: '#d97706', bg: '#fef3c7' },
    rejected: { label: _t('Tu choi', 'Rejected'),           color: '#dc2626', bg: '#fef2f2' },
    submitted:{ label: _t('Da nop', 'Submitted'),           color: '#059669', bg: '#d1fae5' }
  };
  var c = config[status] || config.pending;
  return '<span class="uv-badge" style="color:' + c.color + ';background:' + c.bg + '">' + _escHtml(c.label) + '</span>';
}

function _bindQueueEvents(){
  var queue = document.getElementById(_containerId + '-queue');
  if(!queue) return;

  queue.addEventListener('click', function(e){
    // Remove button
    var removeBtn = e.target.closest('.uv-file-remove');
    if(removeBtn){
      var removeId = removeBtn.getAttribute('data-remove-id');
      _removeFile(removeId);
      return;
    }

    // Warn confirm button
    var confirmBtn = e.target.closest('.uv-warn-confirm-btn');
    if(confirmBtn){
      var confirmId = confirmBtn.getAttribute('data-confirm-id');
      _confirmResubmit(confirmId);
      return;
    }
  });
}

function _removeFile(fileId){
  _files = _files.filter(function(f){ return f.id !== fileId; });
  _renderQueue();
}

function _confirmResubmit(fileId){
  for(var i = 0; i < _files.length; i++){
    if(_files[i].id === fileId){
      _files[i].confirmed = true;
      _files[i].overallStatus = 'ready';
      break;
    }
  }
  _renderQueue();
}

// ===================================================================
// 3-Step Verification Pipeline
// ===================================================================

function _runVerificationPipeline(){
  var pending = _files.filter(function(f){ return f.overallStatus === 'pending'; });
  for(var i = 0; i < pending.length; i++){
    _verifyFile(pending[i]);
  }
}

function _verifyFile(entry){
  entry.overallStatus = 'loading';
  _updateFileCard(entry);

  // Step 1: Filename check
  _runStep1(entry, function(pass1){
    if(!pass1){
      entry.overallStatus = 'rejected';
      _updateFileCard(entry);
      _updateSubmitArea();
      return;
    }

    // Step 2: Hidden sheet check (Excel only)
    _runStep2(entry, function(pass2){
      if(!pass2){
        entry.overallStatus = 'rejected';
        _updateFileCard(entry);
        _updateSubmitArea();
        return;
      }

      // Step 3: Allocation cross-reference
      _runStep3(entry, function(pass3, isWarn){
        if(!pass3){
          entry.overallStatus = 'rejected';
        } else if(isWarn){
          entry.overallStatus = 'warn';
        } else {
          entry.overallStatus = 'ready';
        }
        _updateFileCard(entry);
        _updateSubmitArea();
      });
    });
  });
}

// ── Step 1: Filename Check ──
function _runStep1(entry, callback){
  entry.steps[0].status = 'loading';
  _updateFileCard(entry);

  // Use validateFilename from 10-upload-validator.js
  setTimeout(function(){
    if(typeof validateFilename !== 'function'){
      entry.steps[0].status = 'fail';
      entry.steps[0].detail = _t(
        'Ham validateFilename khong kha dung',
        'validateFilename function not available'
      );
      callback(false);
      return;
    }

    var result = validateFilename(entry.name);

    if(result.status === 'PASS'){
      entry.steps[0].status = 'pass';
      entry.steps[0].detail = _t('Hop le', 'Valid') + ' (' + _escHtml(result.pattern) + ')';
      callback(true);
    } else if(result.status === 'WARN' || result.status === 'FLAG'){
      entry.steps[0].status = 'pass';
      var issues = result.issues.map(function(i){ return _escHtml(i); }).join('<br>');
      entry.steps[0].detail = _t('Hop le voi canh bao', 'Valid with warnings') + ': ' + issues;
      callback(true);
    } else {
      entry.steps[0].status = 'fail';
      var failIssues = result.issues.map(function(i){ return _escHtml(i); }).join('<br>');
      entry.steps[0].detail = _t('Khong hop le', 'Invalid') + ': ' + failIssues;
      callback(false);
    }
  }, 100);
}

// ── Step 2: Hidden Sheet Check ──
function _runStep2(entry, callback){
  entry.steps[1].status = 'loading';
  _updateFileCard(entry);

  // Non-Excel files skip this step
  if(entry.type !== 'excel'){
    entry.steps[1].status = 'pass';
    entry.steps[1].detail = _t(
      'Khong ap dung (khong phai Excel)',
      'N/A (non-Excel file)'
    );
    callback(true);
    return;
  }

  // Upload file for server-side hidden sheet reading
  var fd = new FormData();
  fd.append('file', entry.file);

  _apiCallFormData('upload_read_hidden_sheet', fd).then(function(data){
    if(!data || !data.ok){
      // No hidden sheet found
      entry.steps[1].status = 'fail';
      entry.steps[1].detail = _t(
        'File khong duoc tai tu he thong QMS (khong co sheet _QMS_VERIFY)',
        'File not downloaded from QMS system (no _QMS_VERIFY sheet)'
      );
      callback(false);
      return;
    }

    var sheet = data.data || data;

    // Verify system origin
    if(sheet.system_origin !== 'HESEM-QMS-v3'){
      entry.steps[1].status = 'fail';
      entry.steps[1].detail = _t(
        'File khong phai tu he thong HESEM QMS',
        'File is not from HESEM QMS system'
      );
      callback(false);
      return;
    }

    // Verify hash
    if(data.hash_valid === false){
      entry.steps[1].status = 'fail';
      entry.steps[1].detail = _t(
        'Cau truc file da bi thay doi (hash khong khop)',
        'File structure has been tampered (hash mismatch)'
      );
      callback(false);
      return;
    }

    // Store allocation ID for Step 3
    entry.allocationId = sheet.allocation_id || null;

    entry.steps[1].status = 'pass';
    entry.steps[1].detail = _t('Xac minh thanh cong', 'Verification passed') +
      ' — ' + _escHtml(sheet.form_code || '') + ' ' + _escHtml(sheet.form_revision || '');
    callback(true);

  }).catch(function(err){
    entry.steps[1].status = 'fail';
    entry.steps[1].detail = _t(
      'Loi kiem tra hidden sheet: ' + (err.message || 'Unknown'),
      'Hidden sheet check error: ' + (err.message || 'Unknown')
    );
    callback(false);
  });
}

// ── Step 3: Allocation Cross-Reference ──
function _runStep3(entry, callback){
  entry.steps[2].status = 'loading';
  _updateFileCard(entry);

  // Non-Excel files or files without allocation ID: skip to pass
  if(!entry.allocationId){
    if(entry.type !== 'excel'){
      entry.steps[2].status = 'pass';
      entry.steps[2].detail = _t(
        'Khong ap dung (khong co ma cap phat)',
        'N/A (no allocation ID)'
      );
      callback(true, false);
    } else {
      entry.steps[2].status = 'fail';
      entry.steps[2].detail = _t(
        'Khong tim thay ma cap phat trong file',
        'No allocation ID found in file'
      );
      callback(false, false);
    }
    return;
  }

  // Query allocation status using AllocationTracker or direct API
  var promise;
  if(typeof AllocationTracker !== 'undefined' && AllocationTracker.getAllocationStatus){
    promise = AllocationTracker.getAllocationStatus(entry.allocationId);
  } else {
    promise = _apiCall('upload_allocation_status', { allocation_id: entry.allocationId });
  }

  promise.then(function(data){
    if(!data || !data.ok){
      entry.steps[2].status = 'fail';
      entry.steps[2].detail = _t(
        'Khong tim thay ban ghi cap phat',
        'Allocation record not found'
      );
      callback(false, false);
      return;
    }

    var alloc = data.data || data;
    var status = alloc.status || '';

    // Void allocation
    if(status === 'void'){
      entry.steps[2].status = 'fail';
      entry.steps[2].detail = _t(
        'Ma cap phat nay da bi huy',
        'This allocation has been voided'
      );
      callback(false, false);
      return;
    }

    // Already received (resubmission)
    if(status === 'received' || status === 'submitted' || status === 'resubmitted'){
      var currentVersion = alloc.returned_version || alloc.version || 1;
      entry.versionInfo = { currentVersion: currentVersion };
      entry.steps[2].status = 'warn';
      entry.steps[2].detail = _t(
        'Da nop truoc do la V' + currentVersion + '. Day se la V' + (currentVersion + 1),
        'Already submitted as V' + currentVersion + '. This will be V' + (currentVersion + 1)
      );
      callback(true, true);
      return;
    }

    // Valid states for submission
    if(status === 'allocated' || status === 'form_downloaded'){
      entry.steps[2].status = 'pass';
      entry.steps[2].detail = _t('Hop le', 'Valid') +
        ' — ' + _escHtml(alloc.record_id || alloc.recordId || '') +
        ' (' + _escHtml(alloc.record_type || alloc.recordType || '') + ')';
      callback(true, false);
      return;
    }

    // Closed or unknown
    entry.steps[2].status = 'fail';
    entry.steps[2].detail = _t(
      'Trang thai cap phat khong hop le: ' + status,
      'Invalid allocation status: ' + status
    );
    callback(false, false);

  }).catch(function(err){
    entry.steps[2].status = 'fail';
    entry.steps[2].detail = _t(
      'Loi kiem tra cap phat: ' + (err.message || 'Unknown'),
      'Allocation check error: ' + (err.message || 'Unknown')
    );
    callback(false, false);
  });
}

// ===================================================================
// Card Update (partial re-render)
// ===================================================================

function _updateFileCard(entry){
  var card = document.getElementById('uv-card-' + entry.id);
  if(!card){
    _renderQueue();
    return;
  }
  var temp = document.createElement('div');
  temp.innerHTML = _renderFileCard(entry);
  var newCard = temp.firstElementChild;
  card.parentNode.replaceChild(newCard, card);
  _bindQueueEvents();
}

// ===================================================================
// Submit
// ===================================================================

function _updateSubmitArea(){
  var area = document.getElementById(_containerId + '-submit-area');
  var btn = document.getElementById(_containerId + '-submit-btn');
  var count = document.getElementById(_containerId + '-submit-count');
  if(!area || !btn || !count) return;

  var readyFiles = _files.filter(function(f){
    return f.overallStatus === 'ready' || (f.overallStatus === 'warn' && f.confirmed);
  });

  if(_files.length === 0){
    area.style.display = 'none';
    return;
  }

  area.style.display = 'flex';

  if(readyFiles.length > 0){
    btn.disabled = false;
    count.textContent = _t(
      readyFiles.length + ' file san sang nop',
      readyFiles.length + ' file(s) ready to submit'
    );
  } else {
    btn.disabled = true;
    var rejectedCount = _files.filter(function(f){ return f.overallStatus === 'rejected'; }).length;
    var pendingCount = _files.filter(function(f){ return f.overallStatus === 'pending' || f.overallStatus === 'loading'; }).length;
    var warnCount = _files.filter(function(f){ return f.overallStatus === 'warn' && !f.confirmed; }).length;

    if(pendingCount > 0){
      count.textContent = _t('Dang xac minh...', 'Verifying...');
    } else if(warnCount > 0){
      count.textContent = _t(warnCount + ' file can xac nhan', warnCount + ' file(s) need confirmation');
    } else {
      count.textContent = _t('Khong co file hop le de nop', 'No valid files to submit');
    }
  }
}

function _bindSubmitEvents(){
  var btn = document.getElementById(_containerId + '-submit-btn');
  if(!btn) return;

  btn.addEventListener('click', function(){
    _submitAllReady();
  });
}

function _submitAllReady(){
  var readyFiles = _files.filter(function(f){
    return f.overallStatus === 'ready' || (f.overallStatus === 'warn' && f.confirmed);
  });

  if(readyFiles.length === 0) return;

  // Disable submit button during upload
  var btn = document.getElementById(_containerId + '-submit-btn');
  if(btn) btn.disabled = true;

  var completed = 0;
  var total = readyFiles.length;

  for(var i = 0; i < readyFiles.length; i++){
    _submitSingleFile(readyFiles[i], function(){
      completed++;
      if(completed >= total){
        _updateSubmitArea();
        // Refresh history if expanded
        if(_historyExpanded){
          _loadUploadHistory();
        }
      }
    });
  }
}

function _submitSingleFile(entry, onDone){
  entry.overallStatus = 'loading';
  _updateFileCard(entry);

  var fd = new FormData();
  fd.append('file', entry.file);
  if(entry.allocationId){
    fd.append('allocation_id', entry.allocationId);
  }
  if(entry.versionInfo){
    fd.append('is_resubmit', 'true');
    fd.append('previous_version', String(entry.versionInfo.currentVersion));
  }

  // Use AllocationTracker if available for the upload
  var promise;
  if(entry.allocationId && typeof AllocationTracker !== 'undefined' && AllocationTracker.receiveUpload){
    promise = AllocationTracker.receiveUpload(entry.allocationId, entry.file);
  } else {
    promise = _apiCallFormData('upload_submit', fd);
  }

  promise.then(function(data){
    if(data && data.ok){
      entry.overallStatus = 'submitted';
      _updateFileCard(entry);

      var path = data.server_path || data.sharepoint_path || '';
      var version = data.version || (entry.versionInfo ? entry.versionInfo.currentVersion + 1 : 1);

      _showToast(_t(
        'Da nop thanh cong: ' + entry.name + ' (V' + version + ')' + (path ? ' -> ' + path : ''),
        'Successfully submitted: ' + entry.name + ' (V' + version + ')' + (path ? ' -> ' + path : '')
      ), 'success');
    } else {
      entry.overallStatus = 'rejected';
      _updateFileCard(entry);
      _showToast(_t(
        'Loi khi nop: ' + entry.name + ' — ' + (data && data.error || 'Unknown error'),
        'Submit error: ' + entry.name + ' — ' + (data && data.error || 'Unknown error')
      ), 'error');
    }
    if(onDone) onDone();
  }).catch(function(err){
    entry.overallStatus = 'rejected';
    _updateFileCard(entry);
    _showToast(_t(
      'Loi mang khi nop: ' + entry.name,
      'Network error submitting: ' + entry.name
    ), 'error');
    if(onDone) onDone();
  });
}

// ===================================================================
// Upload History
// ===================================================================

function _bindHistoryToggle(){
  var toggle = document.getElementById(_containerId + '-history-toggle');
  if(!toggle) return;

  toggle.addEventListener('click', function(){
    _historyExpanded = !_historyExpanded;
    var body = document.getElementById(_containerId + '-history-body');
    var chevron = toggle.querySelector('.uv-history-chevron');

    if(_historyExpanded){
      body.style.display = 'block';
      if(chevron) chevron.classList.add('uv-chevron-open');
      _renderHistoryFilters();
      _loadUploadHistory();
    } else {
      body.style.display = 'none';
      if(chevron) chevron.classList.remove('uv-chevron-open');
    }
  });
}

function _renderHistoryFilters(){
  var container = document.getElementById(_containerId + '-history-filters');
  if(!container) return;

  var h = '';
  h += '<div class="uv-hf-row">';

  // Form code filter
  h += '<div class="uv-hf-field">';
  h += '<label class="uv-hf-label">' + _t('Ma form', 'Form Code') + '</label>';
  h += '<input type="text" class="uv-hf-input" id="' + _containerId + '-hf-formcode" placeholder="FRM-..." ';
  h += 'value="' + _escHtml(_historyFilters.formCode || '') + '">';
  h += '</div>';

  // Date from
  h += '<div class="uv-hf-field">';
  h += '<label class="uv-hf-label">' + _t('Tu ngay', 'From date') + '</label>';
  h += '<input type="date" class="uv-hf-input" id="' + _containerId + '-hf-datefrom" ';
  h += 'value="' + _escHtml(_historyFilters.dateFrom || '') + '">';
  h += '</div>';

  // Date to
  h += '<div class="uv-hf-field">';
  h += '<label class="uv-hf-label">' + _t('Den ngay', 'To date') + '</label>';
  h += '<input type="date" class="uv-hf-input" id="' + _containerId + '-hf-dateto" ';
  h += 'value="' + _escHtml(_historyFilters.dateTo || '') + '">';
  h += '</div>';

  // Status filter
  h += '<div class="uv-hf-field">';
  h += '<label class="uv-hf-label">' + _t('Trang thai', 'Status') + '</label>';
  h += '<select class="uv-hf-input" id="' + _containerId + '-hf-status">';
  h += '<option value="">' + _t('Tat ca', 'All') + '</option>';
  h += '<option value="received"' + (_historyFilters.status === 'received' ? ' selected' : '') + '>' + _t('Da nhan', 'Received') + '</option>';
  h += '<option value="submitted"' + (_historyFilters.status === 'submitted' ? ' selected' : '') + '>' + _t('Da nop', 'Submitted') + '</option>';
  h += '<option value="rejected"' + (_historyFilters.status === 'rejected' ? ' selected' : '') + '>' + _t('Tu choi', 'Rejected') + '</option>';
  h += '</select>';
  h += '</div>';

  // Search button
  h += '<div class="uv-hf-field uv-hf-actions">';
  h += '<button type="button" class="uv-hf-btn" id="' + _containerId + '-hf-search">' + _t('Tim', 'Search') + '</button>';
  h += '<button type="button" class="uv-hf-btn uv-hf-btn-reset" id="' + _containerId + '-hf-reset">' + _t('Dat lai', 'Reset') + '</button>';
  h += '</div>';

  h += '</div>';
  container.innerHTML = h;

  // Bind filter events
  var searchBtn = document.getElementById(_containerId + '-hf-search');
  var resetBtn = document.getElementById(_containerId + '-hf-reset');

  if(searchBtn){
    searchBtn.addEventListener('click', function(){
      _historyFilters.formCode = (document.getElementById(_containerId + '-hf-formcode') || {}).value || '';
      _historyFilters.dateFrom = (document.getElementById(_containerId + '-hf-datefrom') || {}).value || '';
      _historyFilters.dateTo = (document.getElementById(_containerId + '-hf-dateto') || {}).value || '';
      _historyFilters.status = (document.getElementById(_containerId + '-hf-status') || {}).value || '';
      _historyPage = 1;
      _loadUploadHistory();
    });
  }

  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      _historyFilters = {};
      _historyPage = 1;
      _renderHistoryFilters();
      _loadUploadHistory();
    });
  }
}

function _loadUploadHistory(){
  var tableContainer = document.getElementById(_containerId + '-history-table');
  if(!tableContainer) return;

  tableContainer.innerHTML = '<div class="uv-loading"><div class="uv-spinner-sm"></div> ' + _t('Dang tai...', 'Loading...') + '</div>';

  var payload = { page: _historyPage, page_size: 15 };
  if(_historyFilters.formCode) payload.form_code = _historyFilters.formCode;
  if(_historyFilters.dateFrom) payload.date_from = _historyFilters.dateFrom;
  if(_historyFilters.dateTo) payload.date_to = _historyFilters.dateTo;
  if(_historyFilters.status) payload.status = _historyFilters.status;

  _apiCall('upload_history', payload).then(function(data){
    if(!data || !data.ok){
      tableContainer.innerHTML = '<div class="uv-empty">' + _t('Khong the tai lich su', 'Could not load history') + '</div>';
      return;
    }

    var entries = data.data || data.entries || [];
    var totalPages = data.total_pages || Math.ceil((data.total || 0) / 15) || 1;

    if(entries.length === 0){
      tableContainer.innerHTML = '<div class="uv-empty">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<p>' + _t('Chua co lich su upload', 'No upload history yet') + '</p>' +
        '</div>';
      return;
    }

    _renderHistoryTable(entries, totalPages, tableContainer);
  }).catch(function(){
    tableContainer.innerHTML = '<div class="uv-empty">' + _t('Loi tai lich su', 'Error loading history') + '</div>';
  });
}

function _renderHistoryTable(entries, totalPages, container){
  var h = '';
  h += '<div class="uv-htable-wrap">';
  h += '<table class="uv-htable">';
  h += '<thead><tr>';
  h += '<th>' + _t('Ten file', 'Filename') + '</th>';
  h += '<th>' + _t('Ma form', 'Form Code') + '</th>';
  h += '<th>' + _t('Phien ban', 'Version') + '</th>';
  h += '<th>' + _t('Thoi gian', 'Timestamp') + '</th>';
  h += '<th>' + _t('Trang thai', 'Status') + '</th>';
  h += '<th>' + _t('Nguoi nop', 'Uploaded By') + '</th>';
  h += '</tr></thead>';
  h += '<tbody>';

  for(var i = 0; i < entries.length; i++){
    var e = entries[i];
    var statusColor = _getHistoryStatusColor(e.status || e.verification_status || '');

    h += '<tr>';
    h += '<td class="uv-htable-filename" title="' + _escHtml(e.filename || '') + '">';
    h += '<code>' + _escHtml(_truncate(e.filename || '-', 40)) + '</code></td>';
    h += '<td><span class="uv-htable-formcode">' + _escHtml(e.form_code || e.formCode || '-') + '</span></td>';
    h += '<td class="uv-htable-center">V' + (e.version || 1) + '</td>';
    h += '<td class="uv-htable-date">' + _escHtml(_formatDate(e.upload_timestamp || e.uploaded_at || e.created_at || '')) + '</td>';
    h += '<td><span class="uv-htable-status" style="color:' + statusColor.color + ';background:' + statusColor.bg + '">';
    h += _escHtml(e.status || e.verification_status || '-') + '</span></td>';
    h += '<td>' + _escHtml(e.uploaded_by || e.user || '-') + '</td>';
    h += '</tr>';
  }

  h += '</tbody></table>';
  h += '</div>';

  // Pagination
  if(totalPages > 1){
    h += '<div class="uv-hpagination">';
    h += '<button type="button" class="uv-hpage-btn" data-page="' + (_historyPage - 1) + '"' + (_historyPage <= 1 ? ' disabled' : '') + '>';
    h += '&laquo; ' + _t('Truoc', 'Prev') + '</button>';

    var startP = Math.max(1, _historyPage - 2);
    var endP = Math.min(totalPages, _historyPage + 2);
    for(var p = startP; p <= endP; p++){
      h += '<button type="button" class="uv-hpage-btn' + (p === _historyPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }

    h += '<button type="button" class="uv-hpage-btn" data-page="' + (_historyPage + 1) + '"' + (_historyPage >= totalPages ? ' disabled' : '') + '>';
    h += _t('Sau', 'Next') + ' &raquo;</button>';
    h += '</div>';
  }

  container.innerHTML = h;

  // Bind pagination
  container.addEventListener('click', function(e){
    var btn = e.target.closest('.uv-hpage-btn');
    if(btn && !btn.disabled){
      var page = parseInt(btn.getAttribute('data-page'), 10);
      if(page >= 1 && page <= totalPages){
        _historyPage = page;
        _loadUploadHistory();
      }
    }
  });
}

function _getHistoryStatusColor(status){
  var map = {
    verified:  { color: '#16a34a', bg: '#dcfce7' },
    received:  { color: '#059669', bg: '#d1fae5' },
    submitted: { color: '#d97706', bg: '#fef3c7' },
    rejected:  { color: '#dc2626', bg: '#fef2f2' },
    hash_mismatch: { color: '#dc2626', bg: '#fef2f2' },
    allocation_invalid: { color: '#dc2626', bg: '#fef2f2' },
    filename_invalid: { color: '#dc2626', bg: '#fef2f2' },
    file_too_large: { color: '#dc2626', bg: '#fef2f2' }
  };
  return map[status] || { color: '#64748b', bg: '#f1f5f9' };
}

function _truncate(str, max){
  if(!str) return '';
  if(str.length <= max) return str;
  return str.substring(0, max - 3) + '...';
}

// ===================================================================
// Toast Notifications
// ===================================================================

function _showToast(message, type){
  type = type || 'info';
  var colors = {
    success: { bg: '#dcfce7', border: '#16a34a', color: '#15803d' },
    error:   { bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' },
    info:    { bg: '#dbeafe', border: '#3b82f6', color: '#1d4ed8' },
    warn:    { bg: '#fef3c7', border: '#d97706', color: '#b45309' }
  };
  var c = colors[type] || colors.info;

  var toast = document.createElement('div');
  toast.className = 'uv-toast';
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;max-width:440px;padding:12px 16px;border-radius:10px;' +
    'font-size:13px;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.12);' +
    'border-left:4px solid ' + c.border + ';background:' + c.bg + ';color:' + c.color + ';' +
    'opacity:0;transform:translateY(10px);transition:all .25s ease';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function(){
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(function(){
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(function(){
      if(toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

// ===================================================================
// Inline Styles (injected once)
// ===================================================================

(function _injectStyles(){
  if(document.getElementById('uv-styles-injected')) return;
  var style = document.createElement('style');
  style.id = 'uv-styles-injected';
  style.textContent = [
    '.uv-container{max-width:900px;margin:0 auto;padding:20px 24px 48px}',
    '.uv-header{margin-bottom:20px}',
    '.uv-title{margin:0;font-size:18px;font-weight:700;color:#0c2d48}',
    '.uv-subtitle{margin:4px 0 0;font-size:13px;color:#64748b}',

    /* Dropzone */
    '.uv-dropzone{border:2px dashed #d1d5db;border-radius:14px;padding:40px 20px;text-align:center;cursor:pointer;transition:all .2s;position:relative;background:#fafbfc}',
    '.uv-dropzone:hover,.uv-dropzone:focus{border-color:#1565c0;background:#f0f7ff}',
    '.uv-dropzone-active{border-color:#1565c0;background:#dbeafe!important;border-style:solid}',
    '.uv-dropzone-inner{pointer-events:none}',
    '.uv-dropzone-text{margin:12px 0 4px;font-size:14px;color:#374151}',
    '.uv-dropzone-text strong{color:#1565c0}',
    '.uv-dropzone-hint{font-size:11px;color:#94a3b8;margin:0}',
    '.uv-file-input{position:absolute;width:0;height:0;opacity:0;overflow:hidden}',

    /* File Card */
    '.uv-file-card{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-top:12px;background:#fff;transition:border-color .2s}',
    '.uv-file-ready{border-left:4px solid #16a34a}',
    '.uv-file-warn{border-left:4px solid #d97706}',
    '.uv-file-rejected{border-left:4px solid #dc2626;opacity:.85}',
    '.uv-file-submitted{border-left:4px solid #059669;opacity:.7}',
    '.uv-file-loading{border-left:4px solid #3b82f6}',
    '.uv-file-info{display:flex;align-items:center;gap:12px}',
    '.uv-file-icon{flex-shrink:0}',
    '.uv-file-details{flex:1;min-width:0}',
    '.uv-file-name{font-size:13px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.uv-file-meta{font-size:11px;color:#94a3b8;margin-top:2px}',
    '.uv-file-overall{flex-shrink:0}',
    '.uv-file-remove{width:28px;height:28px;border:none;background:#f1f5f9;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#94a3b8;transition:all .15s;flex-shrink:0}',
    '.uv-file-remove:hover{background:#fef2f2;color:#dc2626}',
    '.uv-badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}',

    /* Steps */
    '.uv-steps{margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9}',
    '.uv-step{display:flex;align-items:flex-start;gap:10px;padding:5px 0}',
    '.uv-step-icon{flex-shrink:0;margin-top:1px}',
    '.uv-step-name{font-size:12px;font-weight:600;color:#374151}',
    '.uv-step-detail{font-size:11px;color:#64748b;margin-top:2px;line-height:1.4}',
    '.uv-step-pass .uv-step-name{color:#16a34a}',
    '.uv-step-fail .uv-step-name{color:#dc2626}',
    '.uv-step-warn .uv-step-name{color:#d97706}',

    /* Warning confirm */
    '.uv-warn-confirm{margin-top:10px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px}',
    '.uv-warn-msg{display:flex;align-items:center;gap:8px;font-size:12px;color:#92400e;margin-bottom:8px}',
    '.uv-warn-icon{flex-shrink:0}',
    '.uv-warn-confirm-btn{padding:6px 14px;font-size:12px;font-weight:600;border:none;border-radius:6px;background:#d97706;color:#fff;cursor:pointer;transition:background .15s}',
    '.uv-warn-confirm-btn:hover{background:#b45309}',

    /* Submit area */
    '.uv-submit-area{display:flex;align-items:center;gap:14px;margin-top:16px;padding:14px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}',
    '.uv-submit-btn{display:flex;align-items:center;gap:8px;padding:8px 20px;font-size:13px;font-weight:700;border:none;border-radius:8px;background:#1565c0;color:#fff;cursor:pointer;transition:all .15s}',
    '.uv-submit-btn:hover:not(:disabled){background:#0d47a1}',
    '.uv-submit-btn:disabled{opacity:.5;cursor:not-allowed}',
    '.uv-submit-count{font-size:12px;color:#64748b}',

    /* History section */
    '.uv-history-section{margin-top:24px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;overflow:hidden}',
    '.uv-history-toggle{display:flex;align-items:center;gap:8px;width:100%;padding:12px 16px;border:none;background:none;font-size:13px;font-weight:600;color:#374151;cursor:pointer;text-align:left}',
    '.uv-history-toggle:hover{background:#f8fafc}',
    '.uv-history-chevron{transition:transform .2s;flex-shrink:0}',
    '.uv-chevron-open{transform:rotate(90deg)}',
    '.uv-history-body{padding:0 16px 16px}',

    /* History filters */
    '.uv-hf-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:flex-end}',
    '.uv-hf-field{display:flex;flex-direction:column;gap:4px;min-width:120px}',
    '.uv-hf-label{font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em}',
    '.uv-hf-input{padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit}',
    '.uv-hf-input:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 2px rgba(21,101,192,.1)}',
    '.uv-hf-actions{flex-direction:row;gap:6px;align-items:flex-end}',
    '.uv-hf-btn{padding:6px 14px;font-size:12px;font-weight:600;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;transition:all .15s}',
    '.uv-hf-btn:hover{background:#f1f5f9}',
    '.uv-hf-btn-reset{color:#94a3b8}',

    /* History table */
    '.uv-htable-wrap{overflow-x:auto}',
    '.uv-htable{width:100%;border-collapse:collapse;font-size:12px}',
    '.uv-htable th{text-align:left;padding:8px 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;white-space:nowrap}',
    '.uv-htable td{padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#374151}',
    '.uv-htable tr:hover td{background:#f8fafc}',
    '.uv-htable-filename code{font-size:11px;color:#1565c0;background:#f0f7ff;padding:2px 6px;border-radius:4px}',
    '.uv-htable-formcode{font-family:"SF Mono",Consolas,monospace;font-size:11px;font-weight:600}',
    '.uv-htable-center{text-align:center}',
    '.uv-htable-date{white-space:nowrap;color:#94a3b8;font-size:11px}',
    '.uv-htable-status{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px}',

    /* Pagination */
    '.uv-hpagination{display:flex;justify-content:center;gap:4px;margin-top:12px}',
    '.uv-hpage-btn{padding:4px 10px;font-size:11px;font-weight:600;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;transition:all .15s}',
    '.uv-hpage-btn:hover:not(:disabled){background:#f1f5f9}',
    '.uv-hpage-btn:disabled{opacity:.4;cursor:not-allowed}',
    '.uv-hpage-btn.active{background:#1565c0;color:#fff;border-color:#1565c0}',

    /* Empty/loading states */
    '.uv-empty{text-align:center;padding:32px 16px;color:#94a3b8}',
    '.uv-empty svg{margin-bottom:8px}',
    '.uv-empty p{margin:0;font-size:13px}',
    '.uv-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;font-size:13px;color:#94a3b8}',
    '.uv-spinner-sm{width:16px;height:16px;border:2px solid #e2e8f0;border-top-color:#1565c0;border-radius:50%;animation:uv-spin .6s linear infinite}',
    '@keyframes uv-spin{to{transform:rotate(360deg)}}',

    /* Responsive */
    '@media(max-width:768px){',
    '  .uv-container{padding:12px 12px 32px}',
    '  .uv-dropzone{padding:24px 12px}',
    '  .uv-file-info{flex-wrap:wrap}',
    '  .uv-hf-row{flex-direction:column}',
    '  .uv-hf-field{width:100%}',
    '  .uv-submit-area{flex-direction:column;text-align:center}',
    '}'
  ].join('\n');
  document.head.appendChild(style);
})();

})();

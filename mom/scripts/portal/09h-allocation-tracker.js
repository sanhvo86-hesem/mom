/* ===================================================================
   09h-allocation-tracker.js -- Shared Allocation Lifecycle Service
   HESEM MOM Portal -- Evidence Control runtime state for issuance,
   online submission, offline download, and upload receipt.
   =================================================================== */

(function(){
'use strict';

/* ── helpers ─────────────────────────────────────────────────────── */

function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function _escHtml(value){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(value == null ? '' : value)));
  return d.innerHTML;
}

function _uid(){
  return 'alloc-' + Math.random().toString(36).slice(2, 10);
}

/* ── status palette ──────────────────────────────────────────────── */

var STATUS_CONFIG = {
  allocated:  { color:'var(--brand-2,#1565c0)', bg:'#e3f2fd', label:'Đã cấp mã',      labelEn:'Allocated',   icon:'\u{1F4CB}', terminal:false },
  downloaded: { color:'var(--amber-light,#d97706)', bg:'#fef3c7', label:'Đã tải form',     labelEn:'Downloaded',  icon:'\u2B07',    terminal:false },
  submitted:  { color:'var(--purple-light,#7c3aed)', bg:'#f3e8ff', label:'Đã nộp',          labelEn:'Submitted',   icon:'\u{1F4DD}', terminal:false },
  received:   { color:'var(--green-dark,#059669)', bg:'#d1fae5', label:'Đã tiếp nhận',    labelEn:'Received',    icon:'\u{1F4E5}', terminal:true  },
  void:       { color:'var(--text-secondary,#64748b)', bg:'var(--bg-surface-alt,#f1f5f9)', label:'Đã hủy',          labelEn:'Void',        icon:'\u26D4',    terminal:true  },
  rejected:   { color:'var(--red-light,#dc2626)', bg:'#fef2f2', label:'Bị từ chối',      labelEn:'Rejected',    icon:'\u2717',    terminal:false },
  error:      { color:'var(--red-light,#dc2626)', bg:'#fef2f2', label:'Lỗi',             labelEn:'Error',       icon:'\u2715',    terminal:false }
};

/* ── inject stylesheet once ──────────────────────────────────────── */

var _styleInjected = false;
function _injectStyles(){
  if(_styleInjected) return;
  _styleInjected = true;
  var css =
    '.at-status-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;white-space:nowrap}' +
    '.at-status-icon{font-size:13px}' +
    '.at-table-wrap{overflow-x:auto;margin-top:8px}' +
    '.at-table{width:100%;border-collapse:collapse;font-size:13px}' +
    '.at-table th{background:var(--bg-surface-alt,#f8fafc);color:var(--text-secondary,#475569);font-weight:600;text-align:left;padding:8px 10px;border-bottom:2px solid var(--border,#e2e8f0);cursor:pointer;user-select:none;white-space:nowrap}' +
    '.at-table th:hover{background:var(--bg-surface-alt,#f1f5f9)}' +
    '.at-table th .at-sort-arrow{margin-left:4px;font-size:10px;opacity:.5}' +
    '.at-table th.at-sorted .at-sort-arrow{opacity:1}' +
    '.at-table td{padding:6px 10px;border-bottom:1px solid var(--bg-surface-alt,#f1f5f9);vertical-align:middle}' +
    '.at-table tbody tr:hover{background:var(--bg-surface-alt,#f8fafc)}' +
    '.at-record-id{font-family:monospace;font-size:12px;background:var(--bg-surface-alt,#f1f5f9);padding:2px 6px;border-radius:4px}' +
    '.at-type-badge{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary,#475569)}' +
    '.at-cell-actions{display:flex;gap:4px;flex-wrap:nowrap}' +
    '.at-copy-btn,.at-action-btn{border:none;cursor:pointer;border-radius:4px;font-size:12px;padding:3px 8px;transition:background .15s}' +
    '.at-copy-btn{background:var(--bg-surface-alt,#f1f5f9);color:var(--text-secondary,#475569)}.at-copy-btn:hover{background:var(--border,#e2e8f0)}' +
    '.at-btn-void{background:#fef2f2;color:var(--red-light,#dc2626)}.at-btn-void:hover{background:#fee2e2}' +
    '.at-btn-download{background:var(--bg-surface-alt,#f0fdf4);color:var(--green-dark,#059669)}.at-btn-download:hover{background:#dcfce7}' +
    '.at-table-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:8px}' +
    '.at-search{flex:1;padding:6px 10px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:13px;outline:none;transition:border-color .2s}' +
    '.at-search:focus{border-color:var(--blue-light,#3b82f6)}' +
    '.at-empty{text-align:center;padding:32px 16px;color:var(--text-secondary,#94a3b8)}.at-empty-icon{font-size:32px;margin-bottom:8px}' +
    '.at-page-controls{display:flex;gap:var(--pagination-gap,4px);justify-content:center;margin-top:12px}' +
    '.at-page-btn{min-width:var(--pagination-btn-size,32px);height:var(--pagination-btn-size,32px);border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);padding:0 10px;border-radius:var(--pagination-btn-radius,4px);cursor:pointer;font-size:var(--pagination-font-size,12px);line-height:1;transition:all .15s}' +
    '.at-page-btn:hover:not(:disabled){background:var(--bg-hover,#f1f5f9);border-color:var(--border,#cbd5e1)}' +
    '.at-page-btn:disabled{opacity:.4;cursor:not-allowed}' +
    '.at-page-active{background:var(--brand-2,#3b82f6)!important;color:var(--text-inverse,#fff)!important;border-color:var(--brand-2,#3b82f6)!important}' +
    '.at-toast{position:fixed;bottom:24px;right:24px;background:var(--text-primary,#1e293b);color:var(--text-inverse,#fff);padding:10px 18px;border-radius:8px;font-size:13px;z-index:99999;opacity:0;transform:translateY(8px);transition:all .25s ease}' +
    '.at-toast.at-toast-show{opacity:1;transform:translateY(0)}' +
    '.at-void-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:99998}' +
    '.at-void-dialog{background:var(--bg-surface,#fff);border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)}' +
    '.at-void-dialog h3{margin:0 0 12px;font-size:16px;color:#1e293b}' +
    '.at-void-dialog textarea{width:100%;min-height:60px;border:1px solid var(--border,#e2e8f0);border-radius:6px;padding:8px;font-size:13px;resize:vertical;box-sizing:border-box}' +
    '.at-void-dialog .at-void-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}' +
    '.at-void-dialog .at-void-cancel{border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);padding:6px 14px;border-radius:6px;cursor:pointer}' +
    '.at-void-dialog .at-void-confirm{border:none;background:var(--red-light,#dc2626);color:var(--text-inverse,#fff);padding:6px 14px;border-radius:6px;cursor:pointer}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

/* ── main object ─────────────────────────────────────────────────── */

var AllocationTracker = {
  _listeners: [],

  /* ================================================================
     allocate -- request a new record ID allocation
     POST api.php?action=allocation_allocate (fallback: record_id_generate)
     Body: {record_type, department, year, job_number, work_order, part_number, customer_id}
     Returns: {ok, allocation_id, record_id}
     ================================================================ */
  allocate: function(recordType, department, options){
    var payload = Object.assign({
      record_type: recordType,
      department:  department
    }, options || {});
    return this._callWithLegacyFallback('allocation_allocate', 'record_id_generate', payload, 'POST')
      .then(this._normalizeAllocationResponse.bind(this))
      .then(function(resp){
        if(resp.ok) AllocationTracker._emit('allocated', resp);
        return resp;
      });
  },

  /* ================================================================
     getHistory -- retrieve paginated allocation history
     POST api.php?action=allocation_history
     Body: {record_type, form_code, department, delivery_mode, status, search, page, page_size, date_from, date_to}
     Returns: {ok, entries:[], allocations:[], total, page, total_pages}
     ================================================================ */
  getHistory: function(filters){
    var payload = {};
    var f = filters || {};
    if(f.type && !f.record_type) payload.record_type = f.type;
    if(f.record_type)            payload.record_type = f.record_type;
    if(f.form_code)              payload.form_code   = f.form_code;
    if(f.department)             payload.department  = f.department;
    if(f.delivery_mode)          payload.delivery_mode = f.delivery_mode;
    if(f.status)                 payload.status      = f.status;
    if(f.search)                 payload.search      = f.search;
    if(f.page)                   payload.page        = f.page;
    if(f.page_size)              payload.page_size   = f.page_size;
    if(f.date_from)              payload.date_from   = f.date_from;
    if(f.date_to)                payload.date_to     = f.date_to;
    return this._callWithLegacyFallback('allocation_history', 'record_id_history', payload, 'POST')
      .then(this._normalizeHistoryResponse.bind(this));
  },

  /* ================================================================
     void -- cancel an allocation with a mandatory reason
     POST api.php?action=allocation_void
     Body: {allocation_id, reason}
     Returns: {ok}
     ================================================================ */
  void: function(allocationId, reason){
    if(!allocationId) return Promise.reject(new Error('allocation_id bắt buộc'));
    if(!reason || !reason.trim()) return Promise.reject(new Error('Lý do hủy không được để trống'));
    var self = this;
    return this._callWithLegacyFallback('allocation_void', 'record_id_void', {
      allocation_id: allocationId,
      reason:        reason.trim()
    }, 'POST')
      .then(function(resp){
        var normalized = self._normalizeAllocationResponse(resp);
        if(normalized.ok) self._emit('void', normalized);
        return normalized;
      });
  },

  /* ================================================================
     inspectUpload -- pre-validate a file before formal receipt
     POST multipart api.php?action=upload_inspect
     FormData: file + allocation_id
     Returns: {ok, verification: {valid, reason, form_code, revision, allocation_status}}
     ================================================================ */
  inspectUpload: function(file, allocationId){
    if(!file) return Promise.reject(new Error('Tệp tin không hợp lệ'));
    var fd = new FormData();
    fd.append('file', file);
    if(allocationId) fd.append('allocation_id', allocationId);
    return this._formDataWithLegacyFallback('upload_inspect', 'upload_read_hidden_sheet', fd);
  },

  /* ================================================================
     receiveUpload -- formally receive an uploaded file for an allocation
     POST multipart api.php?action=upload_receive
     FormData: file + allocation_id
     Returns: {ok, version, file_path}
     ================================================================ */
  receiveUpload: function(allocationId, file){
    if(!allocationId) return Promise.reject(new Error('allocation_id bắt buộc'));
    if(!file) return Promise.reject(new Error('Tệp tin không hợp lệ'));
    var self = this;
    var fd = new FormData();
    fd.append('allocation_id', allocationId);
    fd.append('file', file);
    return this._formDataWithLegacyFallback('upload_receive', 'upload_submit', fd)
      .then(function(resp){
        var normalized = self._normalizeAllocationResponse(resp);
        if(normalized.ok) self._emit('received', normalized);
        return normalized;
      });
  },

  /* ================================================================
     downloadForm -- trigger offline form download
     ================================================================ */
  downloadForm: function(allocationId, formCode, options){
    var self = this;
    var payload = Object.assign({ allocation_id: allocationId, form_code: formCode }, options || {});
    return this._apiCall('form_fill_download_offline', payload, 'POST').then(function(resp){
      var normalized = self._normalizeAllocationResponse(resp);
      if(normalized.ok && normalized.download_url){
        self._triggerDownload(normalized.download_url, normalized.filename || normalized.suggested_filename || null);
        self._emit('downloaded', normalized);
      }
      return normalized;
    });
  },

  /* ================================================================
     submitOnline -- submit a filled form online
     ================================================================ */
  submitOnline: function(allocationId, formCode, formData){
    var self = this;
    return this._apiCall('form_fill_submit_online', {
      allocation_id: allocationId,
      form_code:     formCode,
      form_data:     formData
    }, 'POST').then(function(resp){
      var normalized = self._normalizeAllocationResponse(resp);
      if(normalized.ok) self._emit('submitted', normalized);
      return normalized;
    });
  },

  /* ================================================================
     getAllocationStatus -- single allocation lookup
     ================================================================ */
  getAllocationStatus: function(allocationId){
    return this._apiCall('upload_allocation_status', { allocation_id: allocationId }, 'POST');
  },

  /* ================================================================
     checkDuplicate -- verify record ID uniqueness
     ================================================================ */
  checkDuplicate: function(recordId){
    return this._apiCall('record_id_check_duplicate', { record_id: recordId }, 'POST');
  },

  describeError: function(resp, context){
    var code = String(resp && resp.error || '').trim().toLowerCase();
    var detail = String(resp && (resp.message || resp.hint || resp.current_status || '') || '').trim();
    var contextLabel = context === 'upload'
      ? _t('tệp biểu mẫu', 'the workbook')
      : context === 'history'
        ? _t('lịch sử cấp mã', 'allocation history')
        : _t('mã hồ sơ', 'the record ID');
    var map = {
      unauthorized: _t('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại rồi thử lại.', 'Your login session is no longer valid. Please sign in again.'),
      session_expired: _t('Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.', 'Your session expired due to inactivity. Please sign in again.'),
      csrf_failed: _t('Mã xác thực thao tác đã thay đổi. Hệ thống đã thử đồng bộ lại phiên; vui lòng bấm lại lần nữa.', 'The action token changed. The session was refreshed; please try once more.'),
      mfa_required: _t('Tài khoản này cần hoàn tất xác thực 2 lớp trước khi thao tác.', 'This account must complete MFA before continuing.'),
      missing_record_type_or_department: _t('Thiếu loại hồ sơ hoặc phòng ban để cấp mã.', 'Record type or department is missing.'),
      write_failed: _t('Máy chủ không ghi được dữ liệu cấp mã. Cần kiểm tra quyền ghi thư mục dữ liệu.', 'The server could not write the allocation data. Check data-directory permissions.'),
      system_not_initialized: _t('Kho dữ liệu QMS chưa sẵn sàng trên máy chủ.', 'The QMS data store is not initialized on the server.'),
      allocation_not_found: _t('Không tìm thấy mã cấp phát tương ứng trên máy chủ.', 'The allocation could not be found on the server.'),
      blank_form_not_found: _t('Không tìm thấy biểu mẫu gốc để phát hành.', 'The blank form template could not be found.'),
      blank_form_missing_on_disk: _t('Biểu mẫu gốc chưa có trên ổ đĩa máy chủ.', 'The blank form template is missing on disk.'),
      form_not_offline: _t('Biểu mẫu này không thuộc luồng ngoại tuyến.', 'This form is not configured for the offline flow.'),
      unknown_action: _t('Máy chủ chưa bật action frontend đang gọi. Hệ thống sẽ dùng đường dẫn tương thích cũ nếu có.', 'The server route is not available. The client will use the legacy-compatible route when possible.')
    };
    return {
      code: code,
      message: map[code] || (_t('Không thể xử lý yêu cầu cho ', 'Could not complete the request for ') + contextLabel + '.'),
      detail: detail
    };
  },

  /* ================================================================
     renderStatusBadge -- return HTML string for a coloured status pill
     allocated=blue, downloaded=amber, submitted=teal,
     received=green, void=gray, rejected=red
     ================================================================ */
  renderStatusBadge: function(status){
    _injectStyles();
    var cfg = STATUS_CONFIG[this._normalizeStatus(status)] || STATUS_CONFIG.allocated;
    var label = (typeof lang !== 'undefined' && lang === 'en') ? cfg.labelEn : cfg.label;
    return '<span class="at-status-badge" style="color:' + cfg.color + ';background:' + cfg.bg + '">' +
      '<span class="at-status-icon">' + cfg.icon + '</span>' + _escHtml(label) + '</span>';
  },

  /* ================================================================
     renderHistoryTable -- full table with columns:
       Record ID | Type | Dept | Status | Created By | Date | Actions
     Sortable columns, search input, void / copy / download buttons
     ================================================================ */
  renderHistoryTable: function(containerId, entries, options){
    _injectStyles();
    var container = document.getElementById(containerId);
    if(!container) return;
    var opts = options || {};
    var rows = Array.isArray(entries) ? entries : [];

    /* empty state */
    if(!rows.length){
      container.innerHTML = '<div class="at-empty"><div class="at-empty-icon">\u{1F4C2}</div><p>' +
        _escHtml(opts.emptyMessage || _t('Ch\u01B0a c\u00F3 b\u1EA3n ghi n\u00E0o.', 'No records yet.')) + '</p></div>';
      return;
    }

    var tableId = _uid();
    var html = '';

    /* search toolbar */
    if(opts.searchable !== false){
      html += '<div class="at-table-toolbar"><input id="' + tableId + '-search" class="at-search" type="search" placeholder="' +
        _escHtml(_t('T\u00ECm m\u00E3 h\u1ED3 s\u01A1, form, ng\u01B0\u1EDDi t\u1EA1o\u2026', 'Search record ID, form, creator\u2026')) + '"></div>';
    }

    /* column definitions */
    var cols = [
      { key:'record_id',   label:_t('M\u00E3 h\u1ED3 s\u01A1',    'Record ID'),   sortable:true  },
      { key:'record_type', label:_t('Lo\u1EA1i',                    'Type'),        sortable:true  },
      { key:'department',  label:_t('Ph\u00F2ng ban',               'Department'),  sortable:true  },
      { key:'status',      label:_t('Tr\u1EA1ng th\u00E1i',        'Status'),      sortable:true  },
      { key:'created_by',  label:_t('Ng\u01B0\u1EDDi t\u1EA1o',    'Created By'),  sortable:true  },
      { key:'created_at',  label:_t('Ng\u00E0y t\u1EA1o',          'Date'),        sortable:true  },
      { key:'context',     label:_t('Ng\u1EEF c\u1EA3nh',          'Context'),     sortable:false },
      { key:'actions',     label:_t('H\u00E0nh \u0111\u1ED9ng',    'Actions'),     sortable:false }
    ];

    html += '<div class="at-table-wrap"><table class="at-table" id="' + tableId + '"><thead><tr>';
    cols.forEach(function(col){
      html += '<th data-sort-key="' + col.key + '"' + (col.sortable ? '' : ' data-no-sort="1"') + '>' +
        _escHtml(col.label) + (col.sortable ? ' <span class="at-sort-arrow">\u25B4\u25BE</span>' : '') + '</th>';
    });
    html += '</tr></thead><tbody>';

    /* body rows */
    var self = this;
    rows.forEach(function(entry){
      var allocId   = entry.allocation_id || '';
      var recId     = entry.record_id || '';
      var status    = self._normalizeStatus(entry.status || 'allocated');
      var context   = entry.master_context || {};
      var ctxBits   = [context.customer_id, context.so_number, context.jo_number, context.wo_number, context.part_number, context.part_revision].filter(Boolean);
      var createdBy = entry.created_by || entry.allocated_by || '';

      html += '<tr class="at-row" data-allocation-id="' + _escHtml(allocId) + '">' +
        '<td data-sort-value="' + _escHtml(recId) + '"><code class="at-record-id">' + _escHtml(recId) + '</code></td>' +
        '<td data-sort-value="' + _escHtml(entry.record_type || '') + '"><span class="at-type-badge">' + _escHtml(entry.record_type || '') + '</span></td>' +
        '<td data-sort-value="' + _escHtml(entry.department || '') + '">' + _escHtml(entry.department || '') + '</td>' +
        '<td data-sort-value="' + _escHtml(status) + '">' + self.renderStatusBadge(status) + '</td>' +
        '<td data-sort-value="' + _escHtml(createdBy) + '">' + _escHtml(createdBy) + '</td>' +
        '<td data-sort-value="' + _escHtml(entry.created_at || '') + '">' + _escHtml(self._formatDate(entry.created_at || '')) + '</td>' +
        '<td data-sort-value="' + _escHtml(ctxBits.join(' \u00B7 ') || '\u2014') + '">' + _escHtml(ctxBits.join(' \u00B7 ') || '\u2014') + '</td>' +
        '<td class="at-cell-actions">' +
          '<button type="button" class="at-copy-btn" data-copy="' + _escHtml(recId) + '" title="' + _escHtml(_t('Sao ch\u00E9p m\u00E3', 'Copy ID')) + '">\u29C9</button>' +
          '<button type="button" class="at-action-btn at-btn-download" data-action="download_txt" data-record-id="' + _escHtml(recId) + '" title="' + _escHtml(_t('T\u1EA3i .txt', 'Download .txt')) + '">\u2913</button>' +
          (status === 'allocated' ? '<button type="button" class="at-action-btn at-btn-void" data-action="void" data-allocation-id="' + _escHtml(allocId) + '">' + _t('H\u1EE7y', 'Void') + '</button>' : '') +
        '</td></tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    /* wire events */
    this._bindTableEvents(tableId, rows, opts);
    this._bindSortableHeaders(tableId);
  },

  /* ================================================================
     renderPagination -- page controls: << < 1 2 3 ... > >>
     ================================================================ */
  renderPagination: function(paginationId, currentPage, totalPages, onPageChange){
    _injectStyles();
    var el = document.getElementById(paginationId);
    if(!el) return;
    if(totalPages <= 1){ el.innerHTML = ''; return; }

    var html = '<div class="at-page-controls">';

    /* first + prev */
    html += '<button type="button" class="at-page-btn" data-page="1"' + (currentPage <= 1 ? ' disabled' : '') + '>&laquo;</button>';
    html += '<button type="button" class="at-page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? ' disabled' : '') + '>&lsaquo; ' + _t('Tr\u01B0\u1EDBc', 'Prev') + '</button>';

    /* page window */
    var windowStart = Math.max(1, currentPage - 2);
    var windowEnd   = Math.min(totalPages, currentPage + 2);

    if(windowStart > 1){
      html += '<button type="button" class="at-page-btn" data-page="1">1</button>';
      if(windowStart > 2) html += '<span style="padding:0 4px;color:var(--text-secondary,#94a3b8)">\u2026</span>';
    }
    for(var p = windowStart; p <= windowEnd; p++){
      html += '<button type="button" class="at-page-btn' + (p === currentPage ? ' at-page-active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }
    if(windowEnd < totalPages){
      if(windowEnd < totalPages - 1) html += '<span style="padding:0 4px;color:var(--text-secondary,#94a3b8)">\u2026</span>';
      html += '<button type="button" class="at-page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    /* next + last */
    html += '<button type="button" class="at-page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>' + _t('Sau', 'Next') + ' &rsaquo;</button>';
    html += '<button type="button" class="at-page-btn" data-page="' + totalPages + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>&raquo;</button>';

    html += '</div>';
    el.innerHTML = html;

    el.onclick = function(e){
      var btn = e.target.closest('.at-page-btn');
      if(!btn || btn.disabled || !onPageChange) return;
      var page = parseInt(btn.getAttribute('data-page'), 10);
      if(page >= 1 && page <= totalPages) onPageChange(page);
    };
  },

  /* ================================================================
     copyToClipboard -- copy text + toast notification
     ================================================================ */
  copyToClipboard: function(text){
    _injectStyles();
    var self = this;
    function afterCopy(){
      self._showToast(_t('\u0110\u00E3 sao ch\u00E9p: ', 'Copied: ') + text);
    }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(afterCopy).catch(function(){
        AllocationTracker._copyFallback(text);
        afterCopy();
      });
      return;
    }
    this._copyFallback(text);
    afterCopy();
  },

  /* ================================================================
     downloadRecordTxt -- download an empty .txt named with record ID
     ================================================================ */
  downloadRecordTxt: function(recordId, content){
    var body = content || '';
    var blob = new Blob([body], { type:'text/plain;charset=utf-8' });
    this._triggerBlobDownload(blob, recordId + '.txt');
    this._showToast(_t('\u0110ang t\u1EA3i t\u1EC7p: ', 'Downloading: ') + recordId + '.txt');
  },

  /* ── status helpers ────────────────────────────────────────────── */

  isTerminal: function(status){
    var cfg = STATUS_CONFIG[this._normalizeStatus(status)];
    return cfg ? !!cfg.terminal : false;
  },

  getStatusColor: function(status){
    var cfg = STATUS_CONFIG[this._normalizeStatus(status)];
    return cfg ? cfg.color : '#64748b';
  },

  /* ── event bus ─────────────────────────────────────────────────── */

  on: function(event, callback){
    var token = { event:event, callback:callback };
    this._listeners.push(token);
    return function(){
      var idx = AllocationTracker._listeners.indexOf(token);
      if(idx >= 0) AllocationTracker._listeners.splice(idx, 1);
    };
  },

  /* ── private: API transport ────────────────────────────────────── */

  _apiCall: function(action, payload, method, runtime){
    var self = this;
    return this._rawApiCall(action, payload, method).then(function(resp){
      if(self._isAuthRecoveryCandidate(resp) && !(runtime && runtime.authRefreshed)){
        return self._refreshAuthStatus().then(function(refreshed){
          if(refreshed) return self._apiCall(action, payload, method, { authRefreshed:true });
          return resp;
        });
      }
      return resp;
    });
  },

  _rawApiCall: function(action, payload, method){
    if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST');
    var opts = {
      method:      method || 'POST',
      credentials: 'include',
      headers:     { 'Content-Type':'application/json' }
    };
    if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
    if((method || 'POST') !== 'GET') opts.body = JSON.stringify(payload || {});
    return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  },

  _apiFormData: function(action, formData, runtime){
    var self = this;
    return this._rawApiFormData(action, formData).then(function(resp){
      if(self._isAuthRecoveryCandidate(resp) && !(runtime && runtime.authRefreshed)){
        return self._refreshAuthStatus().then(function(refreshed){
          if(refreshed) return self._apiFormData(action, formData, { authRefreshed:true });
          return resp;
        });
      }
      return resp;
    });
  },

  _rawApiFormData: function(action, formData){
    if(typeof apiCallFormData === 'function') return apiCallFormData(action, formData);
    var opts = { method:'POST', credentials:'include', body:formData, headers:{} };
    if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
    return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  },

  _callWithLegacyFallback: function(primaryAction, fallbackAction, payload, method){
    return this._apiCall(primaryAction, payload, method).then(function(resp){
      if(AllocationTracker._isLegacyFallbackResponse(resp)) return AllocationTracker._apiCall(fallbackAction, payload, method);
      return resp;
    }).catch(function(err){
      if(AllocationTracker._isLegacyFallbackError(err)) return AllocationTracker._apiCall(fallbackAction, payload, method);
      throw err;
    });
  },

  _formDataWithLegacyFallback: function(primaryAction, fallbackAction, formData){
    return this._apiFormData(primaryAction, formData).then(function(resp){
      if(AllocationTracker._isLegacyFallbackResponse(resp)) return AllocationTracker._apiFormData(fallbackAction, formData);
      return resp;
    }).catch(function(err){
      if(AllocationTracker._isLegacyFallbackError(err)) return AllocationTracker._apiFormData(fallbackAction, formData);
      throw err;
    });
  },

  _isLegacyFallbackResponse: function(resp){
    var code = String(resp && resp.error || '').trim().toLowerCase();
    return !!resp && resp.ok === false && (
      code === 'unknown_action' ||
      code === 'method_not_allowed' ||
      code === 'unsupported_action'
    );
  },

  _isLegacyFallbackError: function(err){
    var msg = String(err && err.message || '');
    return /^HTTP (400|404|405)$/.test(msg);
  },

  _isAuthRecoveryCandidate: function(resp){
    var code = String(resp && resp.error || '').trim().toLowerCase();
    return !!resp && resp.ok === false && (
      code === 'csrf_failed' ||
      code === 'unauthorized' ||
      code === 'session_expired'
    );
  },

  _refreshAuthStatus: function(){
    var runner;
    if(typeof apiCall === 'function'){
      runner = apiCall('status', null, 'GET', 8000);
    } else {
      runner = fetch('api.php?action=status', { method:'GET', credentials:'include' }).then(function(r){
        if(!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    return runner.then(function(status){
      if(!status || status.logged_in !== true) return false;
      if(typeof csrfToken !== 'undefined' && status.csrf_token) csrfToken = status.csrf_token;
      if(typeof currentUser !== 'undefined' && status.user) currentUser = status.user;
      return true;
    }).catch(function(){
      return false;
    });
  },

  /* ── private: response normalisation ───────────────────────────── */

  _normalizeAllocationResponse: function(resp){
    if(!resp) return { ok:false, error:'empty_response' };
    if(resp.allocation && !resp.record_id)     resp.record_id     = resp.allocation.record_id;
    if(resp.allocation && !resp.allocation_id)  resp.allocation_id  = resp.allocation.allocation_id;
    if(resp.allocation && !resp.status)         resp.status         = resp.allocation.status;
    if(resp.status)                             resp.status         = this._normalizeStatus(resp.status);
    if(resp.allocation && resp.allocation.status) resp.allocation.status = this._normalizeStatus(resp.allocation.status);
    return resp;
  },

  _normalizeHistoryResponse: function(resp){
    if(!resp) return { ok:false, error:'empty_response', entries:[], allocations:[] };
    var rows = Array.isArray(resp.entries)
      ? resp.entries.slice()
      : Array.isArray(resp.allocations)
        ? resp.allocations.slice()
        : [];
    rows = rows.map(function(row){
      if(!row || typeof row !== 'object') return row;
      var copy = Object.assign({}, row);
      copy.status = AllocationTracker._normalizeStatus(copy.status);
      return copy;
    });
    resp.entries = rows;
    resp.allocations = rows;
    if(resp.total_pages == null && resp.pages != null) resp.total_pages = resp.pages;
    if(resp.pages == null && resp.total_pages != null) resp.pages = resp.total_pages;
    if(resp.page_size == null && resp.per_page != null) resp.page_size = resp.per_page;
    return resp;
  },

  _normalizeStatus: function(status){
    if(status === 'form_downloaded') return 'downloaded';
    if(status === 'voided')          return 'void';
    return status || 'allocated';
  },

  /* ── private: event emitter ────────────────────────────────────── */

  _emit: function(event, payload){
    this._listeners.forEach(function(listener){
      if(listener.event === event || listener.event === '*'){
        try { listener.callback(payload, event); } catch(err){ if(window.console) console.warn('AllocationTracker event error', err); }
      }
    });
  },

  /* ── private: table interaction ────────────────────────────────── */

  _bindTableEvents: function(tableId, entries, opts){
    var table = document.getElementById(tableId);
    if(!table) return;
    var self = this;

    table.addEventListener('click', function(e){
      /* copy button */
      var copy = e.target.closest('.at-copy-btn');
      if(copy){
        self.copyToClipboard(copy.getAttribute('data-copy') || '');
        return;
      }

      /* action buttons */
      var act = e.target.closest('.at-action-btn');
      if(!act) return;
      var action       = act.getAttribute('data-action');
      var allocationId = act.getAttribute('data-allocation-id');
      var recordId     = act.getAttribute('data-record-id');

      if(action === 'download_txt' && recordId){
        self.downloadRecordTxt(recordId);
        return;
      }
      if(action === 'void' && allocationId){
        self._showVoidDialog(allocationId);
        return;
      }

      self._emit('action_' + action, { allocationId: allocationId, recordId: recordId });
    });

    /* live search */
    var search = document.getElementById(tableId + '-search');
    if(search){
      search.addEventListener('input', function(){
        var q = (search.value || '').toLowerCase().trim();
        Array.prototype.forEach.call(table.querySelectorAll('tbody .at-row'), function(row){
          row.style.display = !q || row.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
  },

  _bindSortableHeaders: function(tableId){
    var table = document.getElementById(tableId);
    if(!table) return;
    var thead = table.querySelector('thead');
    if(!thead) return;
    var sortState = { key:null, asc:true };

    thead.addEventListener('click', function(e){
      var th = e.target.closest('th');
      if(!th || th.getAttribute('data-no-sort') === '1') return;
      var key = th.getAttribute('data-sort-key');
      if(!key) return;

      if(sortState.key === key){
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.asc = true;
      }

      /* clear previous sort indicators */
      Array.prototype.forEach.call(thead.querySelectorAll('th'), function(h){ h.classList.remove('at-sorted'); });
      th.classList.add('at-sorted');
      var arrow = th.querySelector('.at-sort-arrow');
      if(arrow) arrow.textContent = sortState.asc ? '\u25B4' : '\u25BE';

      /* sort tbody rows */
      var tbody = table.querySelector('tbody');
      if(!tbody) return;
      var rowArr = Array.prototype.slice.call(tbody.querySelectorAll('tr.at-row'));
      var colIndex = Array.prototype.indexOf.call(th.parentNode.children, th);

      requestAnimationFrame(function(){
        rowArr.sort(function(a, b){
          var aCell = a.children[colIndex] || null;
          var bCell = b.children[colIndex] || null;
          var aValue = AllocationTracker._sortValueFromCell(aCell);
          var bValue = AllocationTracker._sortValueFromCell(bCell);
          return AllocationTracker._compareSortValues(aValue, bValue, sortState.asc);
        });
        rowArr.forEach(function(row){ tbody.appendChild(row); });
      });
    });
  },

  _sortValueFromCell: function(cell){
    if(!cell) return '';
    var raw = String(cell.getAttribute('data-sort-value') || cell.textContent || '').trim();
    if(!raw) return '';
    var stamp = Date.parse(raw);
    if(!isNaN(stamp)) return { kind:'date', value:stamp };
    if(/^-?\d+(?:\.\d+)?$/.test(raw)) return { kind:'number', value:Number(raw) };
    return { kind:'text', value:raw.toLowerCase() };
  },

  _compareSortValues: function(aValue, bValue, asc){
    var left = aValue || { kind:'text', value:'' };
    var right = bValue || { kind:'text', value:'' };
    if(left.kind === right.kind && left.value < right.value) return asc ? -1 : 1;
    if(left.kind === right.kind && left.value > right.value) return asc ? 1 : -1;
    var leftText = String(left.value || '');
    var rightText = String(right.value || '');
    if(leftText < rightText) return asc ? -1 : 1;
    if(leftText > rightText) return asc ? 1 : -1;
    return 0;
  },

  /* ── private: void confirmation dialog ─────────────────────────── */

  _showVoidDialog: function(allocationId){
    var self = this;
    var overlay = document.createElement('div');
    overlay.className = 'at-void-overlay';
    overlay.innerHTML =
      '<div class="at-void-dialog">' +
        '<h3>' + _escHtml(_t('X\u00E1c nh\u1EADn h\u1EE7y m\u00E3 h\u1ED3 s\u01A1', 'Confirm Void Allocation')) + '</h3>' +
        '<p style="font-size:13px;color:var(--text-secondary,#64748b);margin:0 0 8px">' +
          _escHtml(_t('Vui l\u00F2ng nh\u1EADp l\u00FD do h\u1EE7y. H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c.',
                       'Please enter a reason. This action cannot be undone.')) + '</p>' +
        '<textarea class="at-void-reason" placeholder="' +
          _escHtml(_t('L\u00FD do h\u1EE7y\u2026', 'Reason for voiding\u2026')) + '"></textarea>' +
        '<div class="at-void-btns">' +
          '<button type="button" class="at-void-cancel">' + _escHtml(_t('H\u1EE7y b\u1ECF', 'Cancel')) + '</button>' +
          '<button type="button" class="at-void-confirm">' + _escHtml(_t('X\u00E1c nh\u1EADn h\u1EE7y', 'Confirm Void')) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var reasonInput = overlay.querySelector('.at-void-reason');

    overlay.querySelector('.at-void-cancel').onclick = function(){
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    overlay.querySelector('.at-void-confirm').onclick = function(){
      var reason = (reasonInput.value || '').trim();
      if(!reason){
        reasonInput.style.borderColor = 'var(--red-light,#dc2626)';
        reasonInput.focus();
        return;
      }
      self.void(allocationId, reason).then(function(resp){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if(resp.ok){
          self._showToast(_t('\u0110\u00E3 h\u1EE7y m\u00E3 h\u1ED3 s\u01A1 th\u00E0nh c\u00F4ng', 'Allocation voided successfully'));
        } else {
          self._showToast(_t('L\u1ED7i: ' + (resp.error || 'kh\u00F4ng r\u00F5'), 'Error: ' + (resp.error || 'unknown')));
        }
      }).catch(function(err){
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
        self._showToast(_t('L\u1ED7i k\u1EBFt n\u1ED1i', 'Connection error'));
      });
    };

    /* close on backdrop click */
    overlay.addEventListener('click', function(e){
      if(e.target === overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    reasonInput.focus();
  },

  /* ── private: toast ────────────────────────────────────────────── */

  _showToast: function(message, duration){
    var toast = document.createElement('div');
    toast.className = 'at-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ toast.classList.add('at-toast-show'); });
    });
    setTimeout(function(){
      toast.classList.remove('at-toast-show');
      setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, duration || 2500);
  },

  /* ── private: date formatting ──────────────────────────────────── */

  _formatDate: function(value){
    if(!value) return '';
    var d = new Date(value);
    if(isNaN(d.getTime())) return String(value);
    try {
      var locale = (typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN';
      return new Intl.DateTimeFormat(locale, { dateStyle:'medium', timeStyle:'short' }).format(d);
    } catch(_err){
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    }
  },

  /* ── private: clipboard fallback ───────────────────────────────── */

  _copyFallback: function(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity   = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(err){}
    document.body.removeChild(ta);
  },

  /* ── private: download triggers ────────────────────────────────── */

  _triggerDownload: function(url, filename){
    var a = document.createElement('a');
    a.href = url;
    if(filename) a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ if(a.parentNode) a.parentNode.removeChild(a); }, 80);
  },

  _triggerBlobDownload: function(blob, filename){
    var url = URL.createObjectURL(blob);
    this._triggerDownload(url, filename);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 300);
  }
};

/* ── export ──────────────────────────────────────────────────────── */
window.AllocationTracker = AllocationTracker;

})();

/* ===================================================================
   09h-allocation-tracker.js -- Shared Allocation Lifecycle Service
   HESEM QMS Portal -- Evidence Control runtime state for issuance,
   online submission, offline download, and upload receipt.
   =================================================================== */

(function(){
'use strict';

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

var STATUS_CONFIG = {
  allocated:  { color:'#1565c0', bg:'#e3f2fd', label:'Đã cấp mã', labelEn:'Allocated', icon:'📋', terminal:false },
  downloaded: { color:'#d97706', bg:'#fef3c7', label:'Đã tải form', labelEn:'Downloaded', icon:'⬇', terminal:false },
  submitted:  { color:'#7c3aed', bg:'#f3e8ff', label:'Đã nộp', labelEn:'Submitted', icon:'📝', terminal:false },
  received:   { color:'#059669', bg:'#d1fae5', label:'Đã tiếp nhận', labelEn:'Received', icon:'📥', terminal:true },
  void:       { color:'#64748b', bg:'#f1f5f9', label:'Đã hủy', labelEn:'Void', icon:'⛔', terminal:true },
  error:      { color:'#dc2626', bg:'#fef2f2', label:'Lỗi', labelEn:'Error', icon:'✕', terminal:false }
};

var AllocationTracker = {
  _listeners: [],

  allocate: function(recordType, department, options){
    var payload = Object.assign({
      record_type: recordType,
      department: department
    }, options || {});
    return this._apiCall('record_id_generate', payload, 'POST').then(this._normalizeAllocationResponse.bind(this));
  },

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

  submitOnline: function(allocationId, formCode, formData){
    var self = this;
    return this._apiCall('form_fill_submit_online', {
      allocation_id: allocationId,
      form_code: formCode,
      form_data: formData
    }, 'POST').then(function(resp){
      var normalized = self._normalizeAllocationResponse(resp);
      if(normalized.ok) self._emit('submitted', normalized);
      return normalized;
    });
  },

  receiveUpload: function(allocationId, file){
    var self = this;
    var fd = new FormData();
    fd.append('allocation_id', allocationId);
    fd.append('file', file);
    return this._apiFormData('upload_submit', fd).then(function(resp){
      var normalized = self._normalizeAllocationResponse(resp);
      if(normalized.ok) self._emit('received', normalized);
      return normalized;
    });
  },

  inspectUpload: function(file, allocationId){
    var fd = new FormData();
    if(allocationId) fd.append('allocation_id', allocationId);
    fd.append('file', file);
    return this._apiFormData('upload_read_hidden_sheet', fd);
  },

  void: function(allocationId, reason){
    var self = this;
    return this._apiCall('record_id_void', { allocation_id: allocationId, reason: reason || '' }, 'POST').then(function(resp){
      var normalized = self._normalizeAllocationResponse(resp);
      if(normalized.ok) self._emit('void', normalized);
      return normalized;
    });
  },

  getHistory: function(filters){
    return this._apiCall('record_id_history', filters || {}, 'POST');
  },

  getAllocationStatus: function(allocationId){
    return this._apiCall('upload_allocation_status', { allocation_id: allocationId }, 'POST');
  },

  checkDuplicate: function(recordId){
    return this._apiCall('record_id_check_duplicate', { record_id: recordId }, 'POST');
  },

  renderStatusBadge: function(status){
    var cfg = STATUS_CONFIG[status] || STATUS_CONFIG.allocated;
    var label = (typeof lang !== 'undefined' && lang === 'en') ? cfg.labelEn : cfg.label;
    return '<span class="at-status-badge" style="color:' + cfg.color + ';background:' + cfg.bg + '">' +
      '<span class="at-status-icon">' + cfg.icon + '</span>' + _escHtml(label) + '</span>';
  },

  renderHistoryTable: function(containerId, entries, options){
    var container = document.getElementById(containerId);
    if(!container) return;
    var opts = options || {};
    var rows = Array.isArray(entries) ? entries : [];

    if(!rows.length){
      container.innerHTML = '<div class="at-empty"><div class="at-empty-icon">📂</div><p>' +
        _escHtml(opts.emptyMessage || _t('Chưa có bản ghi nào.', 'No records yet.')) + '</p></div>';
      return;
    }

    var tableId = _uid();
    var html = '';
    if(opts.searchable !== false){
      html += '<div class="at-table-toolbar"><input id="' + tableId + '-search" class="at-search" type="search" placeholder="' +
        _escHtml(_t('Tìm mã hồ sơ, form, ngữ cảnh...', 'Search record ID, form, context...')) + '"></div>';
    }

    html += '<div class="at-table-wrap"><table class="at-table" id="' + tableId + '"><thead><tr>' +
      '<th>' + _t('Mã hồ sơ', 'Record ID') + '</th>' +
      '<th>' + _t('Loại', 'Type') + '</th>' +
      '<th>' + _t('Phòng ban', 'Department') + '</th>' +
      '<th>' + _t('Form', 'Form') + '</th>' +
      '<th>' + _t('Trạng thái', 'Status') + '</th>' +
      '<th>' + _t('Tạo lúc', 'Created') + '</th>' +
      '<th>' + _t('Cập nhật', 'Updated') + '</th>' +
      '<th>' + _t('Ngữ cảnh', 'Context') + '</th>' +
      '<th>' + _t('Hành động', 'Actions') + '</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function(entry){
      var allocId = entry.allocation_id || '';
      var context = entry.master_context || {};
      var ctxBits = [context.customer_id, context.so_number, context.jo_number, context.wo_number, context.part_number, context.part_revision].filter(Boolean);
      html += '<tr class="at-row" data-allocation-id="' + _escHtml(allocId) + '">' +
        '<td><code class="at-record-id">' + _escHtml(entry.record_id || '') + '</code></td>' +
        '<td><span class="at-type-badge">' + _escHtml(entry.record_type || '') + '</span></td>' +
        '<td>' + _escHtml(entry.department || '') + '</td>' +
        '<td>' + _escHtml(entry.form_code || '—') + '</td>' +
        '<td>' + this.renderStatusBadge(this._normalizeStatus(entry.status || 'allocated')) + '</td>' +
        '<td>' + _escHtml(this._formatDate(entry.created_at || '')) + '</td>' +
        '<td>' + _escHtml(this._formatDate(entry.updated_at || '')) + '</td>' +
        '<td>' + _escHtml(ctxBits.join(' · ') || '—') + '</td>' +
        '<td class="at-cell-actions">' +
          '<button type="button" class="at-copy-btn" data-copy="' + _escHtml(entry.record_id || '') + '" title="' + _escHtml(_t('Sao chép mã', 'Copy record ID')) + '">⧉</button>' +
          ((this._normalizeStatus(entry.status || '') === 'allocated') ? '<button type="button" class="at-action-btn at-btn-void" data-action="void" data-allocation-id="' + _escHtml(allocId) + '">' + _t('Hủy', 'Void') + '</button>' : '') +
        '</td></tr>';
    }, this);

    html += '</tbody></table></div>';
    container.innerHTML = html;

    this._bindTableEvents(tableId, rows, opts);
  },

  on: function(event, callback){
    var token = { event:event, callback:callback };
    this._listeners.push(token);
    return function(){
      var idx = AllocationTracker._listeners.indexOf(token);
      if(idx >= 0) AllocationTracker._listeners.splice(idx, 1);
    };
  },

  copyToClipboard: function(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(function(){ AllocationTracker._copyFallback(text); });
      return;
    }
    this._copyFallback(text);
  },

  downloadRecordTxt: function(recordId, content){
    var blob = new Blob([content || ''], { type:'text/plain;charset=utf-8' });
    this._triggerBlobDownload(blob, recordId + '.txt');
  },

  isTerminal: function(status){
    var cfg = STATUS_CONFIG[this._normalizeStatus(status)];
    return cfg ? !!cfg.terminal : false;
  },

  getStatusColor: function(status){
    var cfg = STATUS_CONFIG[this._normalizeStatus(status)];
    return cfg ? cfg.color : '#64748b';
  },

  renderPagination: function(paginationId, currentPage, totalPages, onPageChange){
    var el = document.getElementById(paginationId);
    if(!el) return;
    if(totalPages <= 1){ el.innerHTML = ''; return; }
    var html = '<div class="at-page-controls">';
    html += '<button type="button" class="at-page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? ' disabled' : '') + '>&laquo; ' + _t('Trước', 'Prev') + '</button>';
    for(var page = Math.max(1, currentPage - 2); page <= Math.min(totalPages, currentPage + 2); page++){
      html += '<button type="button" class="at-page-btn' + (page === currentPage ? ' at-page-active' : '') + '" data-page="' + page + '">' + page + '</button>';
    }
    html += '<button type="button" class="at-page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>' + _t('Sau', 'Next') + ' &raquo;</button>';
    html += '</div>';
    el.innerHTML = html;
    el.onclick = function(e){
      var btn = e.target.closest('.at-page-btn');
      if(!btn || btn.disabled || !onPageChange) return;
      onPageChange(parseInt(btn.getAttribute('data-page'), 10));
    };
  },

  _normalizeAllocationResponse: function(resp){
    if(resp && resp.allocation && !resp.record_id) resp.record_id = resp.allocation.record_id;
    if(resp && resp.allocation && !resp.allocation_id) resp.allocation_id = resp.allocation.allocation_id;
    if(resp && resp.allocation && !resp.status) resp.status = resp.allocation.status;
    if(resp && resp.status) resp.status = this._normalizeStatus(resp.status);
    if(resp && resp.allocation && resp.allocation.status) resp.allocation.status = this._normalizeStatus(resp.allocation.status);
    return resp || { ok:false, error:'empty_response' };
  },

  _normalizeStatus: function(status){
    return status === 'form_downloaded' ? 'downloaded' : (status || 'allocated');
  },

  _emit: function(event, payload){
    this._listeners.forEach(function(listener){
      if(listener.event === event || listener.event === '*'){
        try { listener.callback(payload, event); } catch (err) { if(window.console) console.warn('AllocationTracker event error', err); }
      }
    });
  },

  _apiCall: function(action, payload, method){
    if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST');
    var opts = {
      method: method || 'POST',
      credentials: 'include',
      headers: { 'Content-Type':'application/json' }
    };
    if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
    if((method || 'POST') !== 'GET') opts.body = JSON.stringify(payload || {});
    return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){ return r.json(); });
  },

  _apiFormData: function(action, formData){
    if(typeof apiCallFormData === 'function') return apiCallFormData(action, formData);
    var opts = { method:'POST', credentials:'include', body:formData, headers:{} };
    if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
    return fetch('api.php?action=' + encodeURIComponent(action), opts).then(function(r){ return r.json(); });
  },

  _bindTableEvents: function(tableId, entries, opts){
    var table = document.getElementById(tableId);
    if(!table) return;
    var self = this;
    table.addEventListener('click', function(e){
      var copy = e.target.closest('.at-copy-btn');
      if(copy){
        self.copyToClipboard(copy.getAttribute('data-copy') || '');
        return;
      }
      var act = e.target.closest('.at-action-btn');
      if(act){
        var action = act.getAttribute('data-action');
        var allocationId = act.getAttribute('data-allocation-id');
        self._emit('action_' + action, { allocationId: allocationId });
      }
    });
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

  _formatDate: function(value){
    if(!value) return '';
    var d = new Date(value);
    if(isNaN(d.getTime())) return String(value);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },

  _copyFallback: function(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
  },

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

window.AllocationTracker = AllocationTracker;

})();

/* ===================================================================
   09h-allocation-tracker.js -- Allocation Lifecycle Client Service
   HESEM QMS Portal -- Tracks form allocations across tabs
   Tab 2 (download), Tab 3 (ID generation), Tab 4 (upload)
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
  return 'at-' + Math.random().toString(36).substr(2, 9);
}

// ── Status Definitions ──
var STATUS_CONFIG = {
  allocated:       { color: '#1565c0', bg: '#e3f2fd', label: 'Da cap ma',       labelEn: 'Allocated',       icon: '&#x1F4CB;', terminal: false },
  form_downloaded: { color: '#d97706', bg: '#fef3c7', label: 'Da tai form',     labelEn: 'Form Downloaded', icon: '&#x2B07;',   terminal: false },
  submitted:       { color: '#16a34a', bg: '#dcfce7', label: 'Da nop',          labelEn: 'Submitted',       icon: '&#x2705;',   terminal: false },
  received:        { color: '#059669', bg: '#d1fae5', label: 'Da tiep nhan',    labelEn: 'Received',        icon: '&#x1F4E5;',  terminal: true  },
  void:            { color: '#64748b', bg: '#f1f5f9', label: 'Huy',             labelEn: 'Void',            icon: '&#x26D4;',   terminal: true  },
  error:           { color: '#dc2626', bg: '#fef2f2', label: 'Loi',             labelEn: 'Error',           icon: '&#x274C;',   terminal: false }
};

// ===================================================================
// AllocationTracker Singleton
// ===================================================================

var AllocationTracker = {
  _cache: null,
  _cacheTime: 0,
  _cacheTTL: 60000, // 1 minute cache
  _listeners: [],
  _pageSize: 20,

  // ==============================================================
  // Core Operations
  // ==============================================================

  /**
   * Allocate a new record ID
   * @param {string} recordType - e.g. 'NCR', 'CAPA', 'FAI'
   * @param {string} department - Department code
   * @param {object} options    - { notes, priority, linkedOrderId }
   * @returns {Promise<object>} - { ok, allocationId, recordId, ... }
   */
  allocate: function(recordType, department, options){
    var self = this;
    var payload = {
      record_type: recordType,
      department: department,
      notes: (options && options.notes) || '',
      priority: (options && options.priority) || 'normal',
      linked_order_id: (options && options.linkedOrderId) || null
    };

    return this._apiCall('record_id_generate', payload).then(function(data){
      if(data && data.ok){
        self._invalidateCache();
        self._emit('allocated', {
          allocationId: data.allocation_id || data.allocationId,
          recordId: data.record_id || data.recordId,
          recordType: recordType,
          department: department
        });
      }
      return data;
    });
  },

  /**
   * Download a form for an allocation (offline fill)
   * @param {string} allocationId
   * @param {string} formCode - e.g. 'FRM-631'
   * @returns {Promise<object>}
   */
  downloadForm: function(allocationId, formCode){
    var self = this;
    var payload = {
      allocation_id: allocationId,
      form_code: formCode
    };

    return this._apiCall('form_fill_download_offline', payload).then(function(data){
      if(data && data.ok){
        self._invalidateCache();
        self._emit('form_downloaded', {
          allocationId: allocationId,
          formCode: formCode,
          filename: data.filename || null,
          downloadUrl: data.download_url || data.downloadUrl || null
        });

        // Trigger browser download if URL provided
        if(data.download_url || data.downloadUrl){
          self._triggerDownload(data.download_url || data.downloadUrl, data.filename);
        }
      }
      return data;
    });
  },

  /**
   * Submit form data online
   * @param {string} allocationId
   * @param {string} formCode
   * @param {object} data - Form field values
   * @returns {Promise<object>}
   */
  submitOnline: function(allocationId, formCode, data){
    var self = this;
    var payload = {
      allocation_id: allocationId,
      form_code: formCode,
      form_data: data
    };

    return this._apiCall('form_fill_submit_online', payload).then(function(resp){
      if(resp && resp.ok){
        self._invalidateCache();
        self._emit('submitted', {
          allocationId: allocationId,
          formCode: formCode,
          entryId: resp.entry_id || resp.entryId
        });
      }
      return resp;
    });
  },

  /**
   * Upload a completed form file
   * @param {string} allocationId
   * @param {File} file
   * @returns {Promise<object>}
   */
  receiveUpload: function(allocationId, file){
    var self = this;

    if(typeof apiCallFormData === 'function'){
      var fd = new FormData();
      fd.append('allocation_id', allocationId);
      fd.append('file', file);
      return apiCallFormData('upload_submit', fd).then(function(data){
        if(data && data.ok){
          self._invalidateCache();
          self._emit('received', {
            allocationId: allocationId,
            filename: file.name,
            size: file.size
          });
        }
        return data;
      });
    }

    // Fallback: direct fetch with FormData
    var fd2 = new FormData();
    fd2.append('allocation_id', allocationId);
    fd2.append('file', file);

    var fetchOpts = {
      method: 'POST',
      credentials: 'include',
      body: fd2
    };
    if(typeof csrfToken !== 'undefined' && csrfToken){
      fetchOpts.headers = {'X-CSRF-Token': csrfToken};
    }

    return fetch('api.php?action=upload_submit', fetchOpts)
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.ok){
          self._invalidateCache();
          self._emit('received', {
            allocationId: allocationId,
            filename: file.name,
            size: file.size
          });
        }
        return data;
      });
  },

  /**
   * Void an allocation
   * @param {string} allocationId
   * @param {string} reason
   * @returns {Promise<object>}
   */
  void: function(allocationId, reason){
    var self = this;
    var payload = {
      allocation_id: allocationId,
      reason: reason || ''
    };

    return this._apiCall('record_id_void', payload).then(function(data){
      if(data && data.ok){
        self._invalidateCache();
        self._emit('voided', {
          allocationId: allocationId,
          reason: reason
        });
      }
      return data;
    });
  },

  // ==============================================================
  // Query Operations
  // ==============================================================

  /**
   * Get allocation history with optional filters
   * @param {object} filters - { recordType, department, status, dateFrom, dateTo, search, page, pageSize }
   * @returns {Promise<object>}
   */
  getHistory: function(filters){
    var self = this;
    var payload = {};
    if(filters){
      if(filters.recordType)  payload.record_type = filters.recordType;
      if(filters.department)  payload.department   = filters.department;
      if(filters.status)      payload.status       = filters.status;
      if(filters.dateFrom)    payload.date_from    = filters.dateFrom;
      if(filters.dateTo)      payload.date_to      = filters.dateTo;
      if(filters.search)      payload.search       = filters.search;
      if(filters.page)        payload.page         = filters.page;
      if(filters.pageSize)    payload.page_size    = filters.pageSize || self._pageSize;
    }

    return this._apiCall('record_id_history', payload, 'POST');
  },

  /**
   * Get single allocation status
   * @param {string} allocationId
   * @returns {Promise<object>}
   */
  getAllocationStatus: function(allocationId){
    return this._apiCall('upload_allocation_status', { allocation_id: allocationId }, 'POST');
  },

  /**
   * Check if a record ID already exists (duplicate check)
   * @param {string} recordId
   * @returns {Promise<object>}
   */
  checkDuplicate: function(recordId){
    return this._apiCall('record_id_check_duplicate', { record_id: recordId }, 'POST');
  },

  // ==============================================================
  // UI Helpers
  // ==============================================================

  /**
   * Render allocation history table into a container
   * @param {string} containerId
   * @param {Array}  entries
   * @param {object} options - { sortable, searchable, paginated, onRowClick, emptyMessage }
   */
  renderHistoryTable: function(containerId, entries, options){
    var container = document.getElementById(containerId);
    if(!container) return;
    var opts = options || {};
    var self = this;
    var tableId = _uid();

    if(!entries || entries.length === 0){
      container.innerHTML = '<div class="at-empty">' +
        '<div class="at-empty-icon">&#x1F4C2;</div>' +
        '<p>' + _escHtml(opts.emptyMessage || _t('Chua co ban ghi nao', 'No records yet')) + '</p>' +
        '</div>';
      return;
    }

    var h = '';

    // Search bar
    if(opts.searchable !== false){
      h += '<div class="at-table-toolbar">';
      h += '<input type="text" class="at-search" id="' + tableId + '-search" ';
      h += 'placeholder="' + _t('Tim kiem...', 'Search...') + '" aria-label="' + _t('Tim kiem', 'Search') + '">';
      h += '</div>';
    }

    // Table
    h += '<div class="at-table-wrap">';
    h += '<table class="at-table" id="' + tableId + '">';
    h += '<thead><tr>';
    h += '<th class="at-th-id" data-sort="record_id">' + _t('Ma ho so', 'Record ID') + '</th>';
    h += '<th data-sort="record_type">' + _t('Loai', 'Type') + '</th>';
    h += '<th data-sort="department">' + _t('Phong ban', 'Dept') + '</th>';
    h += '<th data-sort="status">' + _t('Trang thai', 'Status') + '</th>';
    h += '<th data-sort="created_at">' + _t('Ngay tao', 'Created') + '</th>';
    h += '<th data-sort="updated_at">' + _t('Cap nhat', 'Updated') + '</th>';
    h += '<th>' + _t('Hanh dong', 'Actions') + '</th>';
    h += '</tr></thead>';
    h += '<tbody>';

    for(var i = 0; i < entries.length; i++){
      var e = entries[i];
      var rid = e.record_id || e.recordId || '';
      var rtype = e.record_type || e.recordType || '';
      var dept = e.department || '';
      var status = e.status || 'allocated';
      var created = e.created_at || e.createdAt || '';
      var updated = e.updated_at || e.updatedAt || '';

      h += '<tr class="at-row" data-allocation-id="' + _escHtml(e.allocation_id || e.allocationId || '') + '">';
      h += '<td class="at-cell-id">';
      h += '<code class="at-record-id">' + _escHtml(rid) + '</code>';
      h += '<button type="button" class="at-copy-btn" data-copy="' + _escHtml(rid) + '" ';
      h += 'title="' + _t('Sao chep', 'Copy') + '" aria-label="' + _t('Sao chep ma', 'Copy ID') + '">';
      h += '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/></svg>';
      h += '</button>';
      h += '</td>';
      h += '<td><span class="at-type-badge">' + _escHtml(rtype) + '</span></td>';
      h += '<td>' + _escHtml(dept) + '</td>';
      h += '<td>' + self.renderStatusBadge(status) + '</td>';
      h += '<td class="at-cell-date">' + _escHtml(self._formatDate(created)) + '</td>';
      h += '<td class="at-cell-date">' + _escHtml(self._formatDate(updated)) + '</td>';
      h += '<td class="at-cell-actions">';
      if(!self.isTerminal(status)){
        h += '<button type="button" class="at-action-btn at-btn-download" data-action="download" ';
        h += 'data-allocation-id="' + _escHtml(e.allocation_id || e.allocationId || '') + '" ';
        h += 'title="' + _t('Tai xuong', 'Download') + '">';
        h += '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>';
        h += '</button>';
      }
      if(status === 'allocated'){
        h += '<button type="button" class="at-action-btn at-btn-void" data-action="void" ';
        h += 'data-allocation-id="' + _escHtml(e.allocation_id || e.allocationId || '') + '" ';
        h += 'title="' + _t('Huy', 'Void') + '">';
        h += '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 .5 1v1z"/></svg>';
        h += '</button>';
      }
      h += '</td>';
      h += '</tr>';
    }

    h += '</tbody></table></div>';

    // Pagination placeholder
    if(opts.paginated !== false){
      h += '<div class="at-pagination" id="' + tableId + '-pagination"></div>';
    }

    container.innerHTML = h;

    // Bind table events
    this._bindTableEvents(tableId, entries, opts);
  },

  /**
   * Render a status badge HTML string
   * @param {string} status
   * @returns {string} HTML
   */
  renderStatusBadge: function(status){
    var cfg = STATUS_CONFIG[status] || STATUS_CONFIG.allocated;
    var labelText = (typeof lang !== 'undefined' && lang === 'en') ? cfg.labelEn : cfg.label;
    return '<span class="at-status-badge" style="color:' + cfg.color + ';background:' + cfg.bg + '">' +
      '<span class="at-status-icon">' + cfg.icon + '</span>' +
      _escHtml(labelText) +
      '</span>';
  },

  /**
   * Render a single allocation card
   * @param {object} allocation
   * @returns {string} HTML
   */
  renderAllocationCard: function(allocation){
    var rid = allocation.record_id || allocation.recordId || '';
    var rtype = allocation.record_type || allocation.recordType || '';
    var dept = allocation.department || '';
    var status = allocation.status || 'allocated';
    var created = allocation.created_at || allocation.createdAt || '';
    var notes = allocation.notes || '';
    var cfg = STATUS_CONFIG[status] || STATUS_CONFIG.allocated;

    var h = '';
    h += '<div class="at-card" data-allocation-id="' + _escHtml(allocation.allocation_id || allocation.allocationId || '') + '">';
    h += '<div class="at-card-header">';
    h += '<code class="at-record-id at-record-id-lg">' + _escHtml(rid) + '</code>';
    h += '<button type="button" class="at-copy-btn" data-copy="' + _escHtml(rid) + '" ';
    h += 'title="' + _t('Sao chep', 'Copy') + '">';
    h += '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z"/></svg>';
    h += '</button>';
    h += '</div>';

    h += '<div class="at-card-meta">';
    h += '<span class="at-type-badge">' + _escHtml(rtype) + '</span>';
    h += '<span class="at-dept-label">' + _escHtml(dept) + '</span>';
    h += this.renderStatusBadge(status);
    h += '</div>';

    if(notes){
      h += '<div class="at-card-notes">' + _escHtml(notes) + '</div>';
    }

    h += '<div class="at-card-footer">';
    h += '<span class="at-card-date">' + _escHtml(this._formatDate(created)) + '</span>';
    h += '<div class="at-card-actions">';

    if(!this.isTerminal(status)){
      h += '<button type="button" class="at-action-btn at-btn-download" data-action="download" ';
      h += 'data-allocation-id="' + _escHtml(allocation.allocation_id || allocation.allocationId || '') + '">';
      h += _t('Tai form', 'Download') + '</button>';
    }
    if(status === 'allocated'){
      h += '<button type="button" class="at-action-btn at-btn-void" data-action="void" ';
      h += 'data-allocation-id="' + _escHtml(allocation.allocation_id || allocation.allocationId || '') + '">';
      h += _t('Huy', 'Void') + '</button>';
    }

    h += '</div></div></div>';
    return h;
  },

  // ==============================================================
  // Event System
  // ==============================================================

  /**
   * Subscribe to allocation events
   * Events: allocated, form_downloaded, submitted, received, voided, cache_refreshed
   * @param {string} event
   * @param {function} callback
   * @returns {function} unsubscribe function
   */
  on: function(event, callback){
    var entry = { event: event, callback: callback };
    this._listeners.push(entry);
    return function(){
      var idx = AllocationTracker._listeners.indexOf(entry);
      if(idx >= 0) AllocationTracker._listeners.splice(idx, 1);
    };
  },

  _emit: function(event, data){
    for(var i = 0; i < this._listeners.length; i++){
      var l = this._listeners[i];
      if(l.event === event || l.event === '*'){
        try { l.callback(data, event); } catch(e){
          if(typeof console !== 'undefined') console.warn('AllocationTracker event error:', e);
        }
      }
    }
  },

  // ==============================================================
  // Utilities
  // ==============================================================

  /**
   * Format allocation ID for display
   * @param {string} id - raw allocation ID
   * @returns {string} formatted ID
   */
  formatAllocationId: function(id){
    if(!id) return '';
    // If it matches pattern like NCR-QC-2024-001 keep as-is, otherwise return raw
    return String(id);
  },

  /**
   * Get the configured color for a status
   * @param {string} status
   * @returns {string} hex color
   */
  getStatusColor: function(status){
    var cfg = STATUS_CONFIG[status];
    return cfg ? cfg.color : '#64748b';
  },

  /**
   * Get the configured background color for a status
   * @param {string} status
   * @returns {string} hex color
   */
  getStatusBg: function(status){
    var cfg = STATUS_CONFIG[status];
    return cfg ? cfg.bg : '#f1f5f9';
  },

  /**
   * Check if a status is terminal (no further transitions)
   * @param {string} status
   * @returns {boolean}
   */
  isTerminal: function(status){
    var cfg = STATUS_CONFIG[status];
    return cfg ? cfg.terminal : false;
  },

  /**
   * Copy text to clipboard with fallback
   * @param {string} text
   */
  copyToClipboard: function(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(function(){
        AllocationTracker._copyFallback(text);
      });
    } else {
      this._copyFallback(text);
    }
  },

  /**
   * Download a .txt record file named with the record ID
   * @param {string} recordId
   * @param {string} content
   */
  downloadRecordTxt: function(recordId, content){
    var filename = recordId + '.txt';
    var blob = new Blob([content || ''], {type: 'text/plain;charset=utf-8'});
    this._triggerBlobDownload(blob, filename);
  },

  // ==============================================================
  // Internal Methods
  // ==============================================================

  _apiCall: function(action, payload, method){
    method = method || 'POST';

    if(typeof apiCall === 'function'){
      return apiCall(action, payload, method);
    }

    // Fallback fetch
    var url = 'api.php?action=' + encodeURIComponent(action);
    var opts = {
      method: method,
      credentials: 'include',
      headers: {'Content-Type': 'application/json'}
    };
    if(typeof csrfToken !== 'undefined' && csrfToken){
      opts.headers['X-CSRF-Token'] = csrfToken;
    }
    if(payload && method !== 'GET'){
      opts.body = JSON.stringify(payload);
    }

    return fetch(url, opts).then(function(res){ return res.json(); });
  },

  _invalidateCache: function(){
    this._cache = null;
    this._cacheTime = 0;
  },

  _formatDate: function(dateStr){
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
    } catch(e){
      return dateStr;
    }
  },

  _copyFallback: function(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
  },

  _triggerDownload: function(url, filename){
    var a = document.createElement('a');
    a.href = url;
    if(filename) a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); }, 100);
  },

  _triggerBlobDownload: function(blob, filename){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  _bindTableEvents: function(tableId, entries, opts){
    var self = this;
    var table = document.getElementById(tableId);
    if(!table) return;

    // Copy buttons
    table.addEventListener('click', function(e){
      var copyBtn = e.target.closest('.at-copy-btn');
      if(copyBtn){
        var text = copyBtn.getAttribute('data-copy');
        if(text){
          self.copyToClipboard(text);
          // Visual feedback
          copyBtn.classList.add('at-copied');
          setTimeout(function(){ copyBtn.classList.remove('at-copied'); }, 1500);
        }
        e.preventDefault();
        return;
      }

      var actionBtn = e.target.closest('.at-action-btn');
      if(actionBtn){
        var action = actionBtn.getAttribute('data-action');
        var allocId = actionBtn.getAttribute('data-allocation-id');
        if(action === 'download'){
          self._emit('action_download', { allocationId: allocId });
        } else if(action === 'void'){
          self._emit('action_void', { allocationId: allocId });
        }
        e.preventDefault();
        return;
      }

      // Row click
      if(opts && opts.onRowClick){
        var row = e.target.closest('.at-row');
        if(row){
          var rowAllocId = row.getAttribute('data-allocation-id');
          opts.onRowClick(rowAllocId);
        }
      }
    });

    // Sortable headers
    if(opts && opts.sortable !== false){
      var headers = table.querySelectorAll('th[data-sort]');
      for(var i = 0; i < headers.length; i++){
        headers[i].classList.add('at-th-sortable');
        headers[i].addEventListener('click', (function(sortKey){
          return function(){
            self._sortTable(tableId, sortKey, entries, opts);
          };
        })(headers[i].getAttribute('data-sort')));
      }
    }

    // Search filtering
    var searchInput = document.getElementById(tableId + '-search');
    if(searchInput){
      var debounceTimer = null;
      searchInput.addEventListener('input', function(){
        clearTimeout(debounceTimer);
        var query = searchInput.value.toLowerCase().trim();
        debounceTimer = setTimeout(function(){
          var rows = table.querySelectorAll('tbody .at-row');
          for(var r = 0; r < rows.length; r++){
            var text = rows[r].textContent.toLowerCase();
            rows[r].style.display = (!query || text.indexOf(query) >= 0) ? '' : 'none';
          }
        }, 200);
      });
    }
  },

  _sortTable: function(tableId, sortKey, entries, opts){
    var table = document.getElementById(tableId);
    if(!table) return;

    // Toggle sort direction
    var currentDir = table.getAttribute('data-sort-dir') === 'asc' ? 'desc' : 'asc';
    table.setAttribute('data-sort-dir', currentDir);
    table.setAttribute('data-sort-key', sortKey);

    // Update header indicators
    var headers = table.querySelectorAll('th[data-sort]');
    for(var i = 0; i < headers.length; i++){
      headers[i].classList.remove('at-sort-asc', 'at-sort-desc');
      if(headers[i].getAttribute('data-sort') === sortKey){
        headers[i].classList.add(currentDir === 'asc' ? 'at-sort-asc' : 'at-sort-desc');
      }
    }

    // Sort entries
    var sorted = entries.slice().sort(function(a, b){
      var va = (a[sortKey] || '').toString().toLowerCase();
      var vb = (b[sortKey] || '').toString().toLowerCase();
      var cmp = va < vb ? -1 : (va > vb ? 1 : 0);
      return currentDir === 'asc' ? cmp : -cmp;
    });

    // Re-render table body
    var container = table.closest('.at-table-wrap').parentElement;
    if(container){
      this.renderHistoryTable(container.id, sorted, opts);
    }
  },

  /**
   * Render pagination controls
   * @param {string} paginationId - DOM id for pagination container
   * @param {number} currentPage
   * @param {number} totalPages
   * @param {function} onPageChange
   */
  renderPagination: function(paginationId, currentPage, totalPages, onPageChange){
    var el = document.getElementById(paginationId);
    if(!el || totalPages <= 1) return;

    var h = '<div class="at-page-controls">';
    h += '<button type="button" class="at-page-btn" data-page="' + (currentPage - 1) + '" ';
    if(currentPage <= 1) h += 'disabled ';
    h += '>&laquo; ' + _t('Truoc', 'Prev') + '</button>';

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    for(var p = startPage; p <= endPage; p++){
      h += '<button type="button" class="at-page-btn' + (p === currentPage ? ' at-page-active' : '') + '" ';
      h += 'data-page="' + p + '">' + p + '</button>';
    }

    h += '<button type="button" class="at-page-btn" data-page="' + (currentPage + 1) + '" ';
    if(currentPage >= totalPages) h += 'disabled ';
    h += '>' + _t('Sau', 'Next') + ' &raquo;</button>';
    h += '</div>';

    el.innerHTML = h;

    if(onPageChange){
      el.addEventListener('click', function(e){
        var btn = e.target.closest('.at-page-btn');
        if(btn && !btn.disabled){
          var page = parseInt(btn.getAttribute('data-page'), 10);
          if(page >= 1 && page <= totalPages){
            onPageChange(page);
          }
        }
      });
    }
  }
};

// ── Export ──
window.AllocationTracker = AllocationTracker;

})();

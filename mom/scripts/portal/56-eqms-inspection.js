/**
 * EQMS Inspection Module — IQC / In-Process Inspection
 * HESEM MOM Portal · 56-eqms-inspection.js
 *
 * Archetype: Scan-First + Operator Execution
 * Authority: IATF 16949 ss8.4.3, AS9100D ss8.4, ISO 9001 ss8.4
 * Load order: AFTER 40-eqms-shell.js
 *
 * 5 screens: Scan Entry, IQC Execution, IQC Review, In-Process, Analytics
 * Workflow IQC:   pending -> in_progress -> result_recorded -> under_review -> accepted | rejected | on_hold
 * Workflow IP:    pending -> in_progress -> under_review -> accepted | rejected | on_hold
 */
(function() {
  'use strict';

  /* ── Shell references ─────────────────────────────────────────────────── */
  var UI   = window.EqmsShell.ui;
  var UTIL = window.EqmsShell.util;
  var T    = UTIL.T, esc = UTIL.esc, fmt = UTIL.fmt, fmtDate = UTIL.fmtDate;
  var fmtDateTime = UTIL.fmtDateTime, slugify = UTIL.slugify, apiCall = UTIL.apiCall;

  /* ── API paths ────────────────────────────────────────────────────────── */
  var API = {
    iqcQuery:       'api/v1/mes/quality/iqc/query',
    iqcDetail:      'api/v1/mes/quality/iqc/',          // + {id}
    iqcMetrics:     'api/v1/mes/quality/iqc/metrics',
    iqcAudit:       'api/v1/mes/quality/iqc/',          // + {id}/audit
    iqcSignatures:  'api/v1/mes/quality/iqc/',          // + {id}/signatures
    iqcExport:      'api/v1/mes/quality/iqc/',           // + {id}/export
    iqcAction:      'api/v1/mes/quality/iqc/',           // + {id}/actions/{action}
    ipQuery:        'api/v1/mes/quality/inprocess/query',
    ipDetail:       'api/v1/mes/quality/inprocess/',     // + {id}
    ipMetrics:      'api/v1/mes/quality/inprocess/metrics',
    ipExport:       'api/v1/mes/quality/inprocess/',     // + {id}/export
    ipAction:       'api/v1/mes/quality/inprocess/'      // + {id}/actions/{action}
  };

  function restCall(url, payload, method, timeout) {
    method = method || 'POST';
    timeout = timeout || 30000;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    var opts = { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: controller.signal };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
    return fetch(url, opts)
      .then(function(r) {
        clearTimeout(timer);
        return r.json().then(function(data) {
          return UTIL.normalizeApiResponse ? UTIL.normalizeApiResponse(data, r.status) : data;
        });
      })
      .catch(function(err) { clearTimeout(timer); if (err.name === 'AbortError') return { ok: false, error: 'timeout' }; throw err; });
  }

  /* ── Constants ────────────────────────────────────────────────────────── */
  var IQC_STATES = ['pending', 'in_progress', 'result_recorded', 'under_review', 'accepted', 'rejected', 'on_hold', 'voided'];
  var IP_STATES  = ['pending', 'in_progress', 'under_review', 'accepted', 'rejected', 'on_hold'];

  var STATUS_OPTIONS = [
    { value: 'pending',        label: { vi: 'Chờ xử lý', en: 'Pending' } },
    { value: 'in_progress',    label: { vi: 'Đang thực hiện', en: 'In Progress' } },
    { value: 'under_review',   label: { vi: 'Đang xem xét', en: 'Under Review' } },
    { value: 'accepted',       label: { vi: 'Chấp nhận', en: 'Accepted' } },
    { value: 'rejected',       label: { vi: 'Từ chối', en: 'Rejected' } },
    { value: 'on_hold',        label: { vi: 'Tạm giữ', en: 'On Hold' } }
  ];

  var RESULT_OPTIONS = [
    { value: 'pass', label: { vi: 'Đạt', en: 'Pass' } },
    { value: 'fail', label: { vi: 'Không đạt', en: 'Fail' } },
    { value: 'conditional', label: { vi: 'Có điều kiện', en: 'Conditional' } }
  ];

  /* ── Module metadata ──────────────────────────────────────────────────── */
  var MOD = {
    id: 'inspection',
    label: { vi: 'IQC / Kiểm tra', en: 'IQC / In-Process Inspection' },
    icon: '\u2705',
    group: 'inspection'
  };

  /* ── Local state ──────────────────────────────────────────────────────── */
  var state = {
    screen: 'scan',       // scan | iqc-exec | iqc-review | inprocess | analytics
    activeTab: 'scan',
    // IQC list
    iqcFilters: { status: '', supplier: '', material: '', date_from: '', date_to: '' },
    iqcData: [], iqcTotal: 0, iqcPage: 1, iqcLoading: false, iqcLoaded: false,
    // IQC detail
    iqcRecord: null, iqcAudit: [], iqcSignatures: [],
    // In-process list
    ipFilters: { work_order: '', operation: '', station: '', status: '' },
    ipData: [], ipTotal: 0, ipPage: 1, ipLoading: false, ipLoaded: false,
    // In-process detail
    ipRecord: null,
    // Scan
    scanValue: '', scanResult: null, scanLoading: false,
    // Metrics
    metrics: null, metricsLoading: false,
    // Measurement entry
    measurements: [],
    sampleCount: 5,
    // Container reference
    container: null
  };

  var TABS = [
    { id: 'scan',       label: { vi: 'Quét mã', en: 'Scan Entry' } },
    { id: 'iqc-exec',   label: { vi: 'Thực hiện IQC', en: 'IQC Execution' } },
    { id: 'iqc-review', label: { vi: 'Xem xét IQC', en: 'IQC Review' } },
    { id: 'inprocess',  label: { vi: 'Trong quá trình', en: 'In-Process' } },
    { id: 'analytics',  label: { vi: 'Phân tích', en: 'Analytics' } }
  ];

  /* ── Data fetching ────────────────────────────────────────────────────── */
  function loadIqcList() {
    state.iqcLoading = true;
    rerender();
    var payload = {
      offset: (state.iqcPage - 1) * 25, limit: 25,
      search: '', sort_by: 'created_at', sort_dir: 'DESC',
      filters: {}
    };
    if (state.iqcFilters.status) payload.filters.status = state.iqcFilters.status;
    if (state.iqcFilters.supplier) payload.filters.supplier_id = state.iqcFilters.supplier;
    if (state.iqcFilters.material) payload.filters.item_id = state.iqcFilters.material;

    restCall(API.iqcQuery, payload).then(function(res) {
      state.iqcData = res.data || res.iqc_inspections || [];
      state.iqcTotal = (res.pagination && res.pagination.total) || state.iqcData.length;
      state.iqcLoading = false;
      state.iqcLoaded = true;
      rerender();
    }).catch(function() {
      state.iqcLoading = false;
      state.iqcLoaded = true;
      state.iqcData = [];
      rerender();
    });
  }

  function loadIqcDetail(id) {
    restCall(API.iqcDetail + encodeURIComponent(id), null, 'GET').then(function(res) {
      state.iqcRecord = res.data || res;
      state.activeTab = 'iqc-exec';
      buildMeasurements();
      rerender();
    }).catch(function() { rerender(); });

    restCall(API.iqcAudit + encodeURIComponent(id) + '/audit', null, 'GET').then(function(res) {
      state.iqcAudit = (res.data && res.data.events) || res.data || [];
      rerender();
    }).catch(function() {});

    restCall(API.iqcSignatures + encodeURIComponent(id) + '/signatures', null, 'GET').then(function(res) {
      state.iqcSignatures = (res.data && res.data.signatures) || res.data || [];
      rerender();
    }).catch(function() {});
  }

  function loadIpList() {
    state.ipLoading = true;
    rerender();
    var payload = {
      offset: (state.ipPage - 1) * 25, limit: 25,
      search: '', sort_by: 'created_at', sort_dir: 'DESC',
      filters: {}
    };
    if (state.ipFilters.work_order) payload.filters.work_order = state.ipFilters.work_order;
    if (state.ipFilters.status) payload.filters.status = state.ipFilters.status;

    restCall(API.ipQuery, payload).then(function(res) {
      state.ipData = res.data || res.in_process_inspections || res.inspections || [];
      state.ipTotal = (res.pagination && res.pagination.total) || state.ipData.length;
      state.ipLoading = false;
      state.ipLoaded = true;
      rerender();
    }).catch(function() {
      state.ipLoading = false;
      state.ipLoaded = true;
      state.ipData = [];
      rerender();
    });
  }

  function loadIpDetail(id) {
    restCall(API.ipDetail + encodeURIComponent(id), null, 'GET').then(function(res) {
      state.ipRecord = res.data || res;
      rerender();
    }).catch(function() { rerender(); });
  }

  function loadMetrics() {
    state.metricsLoading = true;
    rerender();
    Promise.all([
      restCall(API.iqcMetrics, null, 'GET'),
      restCall(API.ipMetrics, null, 'GET')
    ]).then(function(results) {
      state.metrics = {
        iqc: (results[0].data && results[0].data.metrics) || {},
        ip: (results[1].data && results[1].data.metrics) || {}
      };
      state.metricsLoading = false;
      rerender();
    }).catch(function() {
      state.metricsLoading = false;
      rerender();
    });
  }

  function doScanLookup(value) {
    if (!value) return;
    state.scanLoading = true;
    rerender();
    restCall(API.iqcQuery, {
      offset: 0, limit: 5, search: value,
      sort_by: 'created_at', sort_dir: 'DESC', filters: {}
    }).then(function(res) {
      var records = (res.data && res.data.iqc_inspections) || res.data || [];
      state.scanResult = records;
      state.scanLoading = false;
      if (records.length === 1) {
        loadIqcDetail(records[0].inspection_id || records[0].id);
      } else {
        rerender();
      }
    }).catch(function() {
      state.scanLoading = false;
      state.scanResult = [];
      rerender();
    });
  }

  function executeIqcAction(id, action, payload) {
    restCall(API.iqcAction + encodeURIComponent(id) + '/actions/' + action, payload || {}).then(function(res) {
      if (res.success !== false) {
        loadIqcDetail(id);
      }
      rerender();
    }).catch(function() { rerender(); });
  }

  function executeIpAction(id, action, payload) {
    restCall(API.ipAction + encodeURIComponent(id) + '/actions/' + action, payload || {}).then(function() {
      loadIpDetail(id);
    }).catch(function() { rerender(); });
  }

  function buildMeasurements() {
    var rec = state.iqcRecord;
    if (!rec) return;
    var specs = rec.specifications || rec.inspection_criteria || [];
    state.measurements = [];
    specs.forEach(function(spec) {
      var row = {
        characteristic: spec.characteristic || spec.name || '',
        spec_min: spec.min != null ? spec.min : '',
        spec_max: spec.max != null ? spec.max : '',
        unit: spec.unit || '',
        samples: [],
        result: null
      };
      var n = rec.sample_size || state.sampleCount;
      for (var i = 0; i < n; i++) {
        var existing = (spec.samples && spec.samples[i]) || '';
        row.samples.push(existing);
      }
      state.measurements.push(row);
    });
  }

  /* ── Rendering ────────────────────────────────────────────────────────── */
  function render(container) {
    state.container = container;
    var html = '<div class="eqms-module eqms-inspection">';
    html += UI.renderTabs(TABS, state.activeTab);
    html += '<div class="eqms-module-body">';

    switch (state.activeTab) {
      case 'scan':       html += renderScanScreen(); break;
      case 'iqc-exec':   html += renderIqcExecution(); break;
      case 'iqc-review': html += renderIqcReview(); break;
      case 'inprocess':  html += renderInProcess(); break;
      case 'analytics':  html += renderAnalytics(); break;
      default:           html += renderScanScreen();
    }

    html += '</div></div>';
    container.innerHTML = html;
    bindEvents(container);

    if (state.activeTab === 'analytics' && !state.metrics && !state.metricsLoading) {
      loadMetrics();
    }
    if (state.activeTab === 'iqc-review' && !state.iqcLoaded && !state.iqcLoading) {
      state.iqcFilters.status = 'under_review';
      loadIqcList();
    }
    if (state.activeTab === 'inprocess' && !state.ipLoaded && !state.ipLoading && !state.ipRecord) {
      loadIpList();
    }
    if (state.activeTab === 'scan') {
      var scanInput = container.querySelector('.eqms-scan-input input');
      if (scanInput) scanInput.focus();
    }
  }

  function rerender() {
    if (state.container) render(state.container);
  }

  /* ── Screen 1: Scan-First Entry ───────────────────────────────────────── */
  function renderScanScreen() {
    var html = '<div class="eqms-scan-screen">';

    // Large centered scan area
    html += '<div class="eqms-scan-hero">';
    html += '<div class="eqms-scan-icon" style="font-size:64px;text-align:center;margin-bottom:16px">\u{1F4F7}</div>';
    html += '<div style="text-align:center;font-size:20px;font-weight:600;margin-bottom:8px">';
    html += T({ vi: 'Quét mã vạch / Nhập số lô', en: 'Scan Barcode / Enter Lot Number' });
    html += '</div>';
    html += '<div style="text-align:center;color:var(--hm-text-secondary);margin-bottom:24px;font-size:13px">';
    html += T({ vi: 'Quét mã vạch hoặc nhập thủ công để bắt đầu kiểm tra', en: 'Scan barcode or type manually to start inspection' });
    html += '</div>';

    html += '<div class="eqms-scan-input" style="display:flex;gap:8px;max-width:480px;margin:0 auto">';
    html += '<input type="text" class="eqms-form-input" data-field="scan-value" value="' + esc(state.scanValue) + '" ';
    html += 'placeholder="' + T({ vi: 'Mã lô / barcode...', en: 'Lot ID / barcode...' }) + '" ';
    html += 'style="font-size:18px;padding:12px 16px;flex:1" autofocus>';
    html += '<button class="eqms-btn primary" data-action="scan-lookup" style="padding:12px 24px;font-size:16px">';
    html += T({ vi: 'Tra cứu', en: 'Lookup' });
    html += '</button>';
    html += '</div>';

    // Camera/scanner fallback
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="camera-scan">';
    html += '\u{1F4F7} ' + T({ vi: 'Quét bằng camera', en: 'Use Camera Scanner' });
    html += '</button>';
    html += '</div>';
    html += '</div>';

    // Scan results
    if (state.scanLoading) {
      html += UI.renderLoadingState({ vi: 'Đang tra cứu...', en: 'Looking up...' });
    } else if (state.scanResult && state.scanResult.length > 1) {
      html += UI.renderSection({ vi: 'Kết quả tra cứu', en: 'Lookup Results' }, renderScanResults());
    } else if (state.scanResult && state.scanResult.length === 0) {
      html += UI.renderEmptyState({
        icon: '\u{1F50D}',
        title: { vi: 'Không tìm thấy lô', en: 'Lot not found' },
        desc: { vi: 'Thử nhập lại hoặc tạo kiểm tra mới', en: 'Try again or create a new inspection' },
        action: { key: 'create-iqc', label: { vi: 'Tạo kiểm tra IQC', en: 'Create IQC Inspection' } }
      });
    }

    // Quick lot lookup section
    html += '<div style="max-width:640px;margin:32px auto 0">';
    html += UI.renderSection({ vi: 'Tra cứu nhanh', en: 'Quick Lookup' }, renderQuickLookup());
    html += '</div>';

    html += '</div>';
    return html;
  }

  function renderScanResults() {
    var cols = [
      { key: 'lot_number', label: { vi: 'Số lô', en: 'Lot Number' }, type: 'id' },
      { key: 'supplier_id', label: { vi: 'Nhà cung cấp', en: 'Supplier' } },
      { key: 'item_id', label: { vi: 'Vật tư', en: 'Material' } },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'result', label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' },
      { key: 'created_at', label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
    ];
    return UI.renderDataGrid(cols, state.scanResult || [], {});
  }

  function renderQuickLookup() {
    var html = '<div class="eqms-field-grid" style="grid-template-columns:repeat(3,1fr)">';
    html += UI.renderFormField({ key: 'quick-po', label: { vi: 'Theo PO', en: 'By PO' }, type: 'text', placeholder: 'PO-...' });
    html += UI.renderFormField({ key: 'quick-supplier', label: { vi: 'Theo NCC', en: 'By Supplier' }, placeholder: 'SUP-...' });
    html += UI.renderFormField({ key: 'quick-material', label: { vi: 'Theo vat tu', en: 'By Material' }, placeholder: 'MAT-...' });
    html += '</div>';
    return html;
  }

  /* ── Screen 2: IQC Execution (Operator Workspace) ─────────────────────── */
  function renderIqcExecution() {
    var rec = state.iqcRecord;
    if (!rec) {
      return UI.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Chưa chọn lô kiểm tra', en: 'No inspection selected' },
        desc: { vi: 'Quét mã vạch hoặc chọn từ danh sách xem xét', en: 'Scan a barcode or select from the review queue' }
      });
    }

    var html = '';

    // Identity header
    html += UI.renderIdentityHeader({
      record_id: rec.inspection_id || rec.lot_number || '',
      title: rec.lot_number || '',
      status: rec.status || 'pending',
      status_label: getStatusLabel(rec.status),
      owner: rec.inspector || rec.assigned_to || '',
      created_by: rec.created_by || '',
      created_at: rec.created_at,
      updated_at: rec.updated_at
    }, {
      extraMeta: [
        { label: { vi: 'Nhà cung cấp', en: 'Supplier' }, value: rec.supplier_name || rec.supplier_id },
        { label: { vi: 'Vật tư', en: 'Material' }, value: rec.item_name || rec.item_id },
        { label: { vi: 'PO', en: 'PO' }, value: rec.po_number },
        { label: { vi: 'Số lượng', en: 'Quantity' }, value: rec.quantity }
      ]
    });

    // State timeline
    html += UI.renderStateTimeline(IQC_STATES, rec.status);

    // Spec display panel
    html += UI.renderSection({ vi: 'Thông số kỹ thuật & Kế hoạch lấy mẫu', en: 'Specifications & Sampling Plan' },
      renderSpecPanel(rec)
    );

    // Measurement capture table
    html += UI.renderSection({ vi: 'Nhập kết quả đo lường', en: 'Measurement Result Entry' },
      renderMeasurementTable()
    );

    // Disposition buttons
    if (rec.status === 'in_progress' || rec.status === 'result_recorded') {
      html += renderDispositionPanel(rec);
    }

    // Audit trail
    html += UI.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      UI.renderAuditTrail(state.iqcAudit)
    );

    // Signatures
    html += UI.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      UI.renderSignaturePanel(state.iqcSignatures, [
        { vi: 'Kiểm tra viên', en: 'Inspector' },
        { vi: 'Giám sát', en: 'Supervisor' }
      ])
    );

    return html;
  }

  function renderSpecPanel(rec) {
    var html = '<div class="eqms-field-grid">';
    html += renderField({ vi: 'Mức AQL', en: 'AQL Level' }, rec.aql_level || '—');
    html += renderField({ vi: 'Cỡ mẫu', en: 'Sample Size' }, rec.sample_size || state.sampleCount);
    html += renderField({ vi: 'Kế hoạch lấy mẫu', en: 'Sampling Plan' }, rec.sampling_plan || 'MIL-STD-1916');
    html += renderField({ vi: 'Mức nghiêm ngặt', en: 'Inspection Level' }, rec.inspection_level || 'Normal');
    html += renderField({ vi: 'Chấp nhận', en: 'Accept' }, rec.accept_number != null ? rec.accept_number : '—');
    html += renderField({ vi: 'Từ chối', en: 'Reject' }, rec.reject_number != null ? rec.reject_number : '—');
    html += '</div>';

    // Spec limits
    if (rec.specifications && rec.specifications.length) {
      html += '<div style="margin-top:12px">';
      html += '<table class="eqms-grid"><thead><tr>';
      html += '<th>' + T({ vi: 'Đặc tính', en: 'Characteristic' }) + '</th>';
      html += '<th>' + T({ vi: 'Giới hạn dưới', en: 'Spec Min' }) + '</th>';
      html += '<th>' + T({ vi: 'Giới hạn trên', en: 'Spec Max' }) + '</th>';
      html += '<th>' + T({ vi: 'Đơn vị', en: 'Unit' }) + '</th>';
      html += '<th>' + T({ vi: 'Phương pháp', en: 'Method' }) + '</th>';
      html += '</tr></thead><tbody>';
      rec.specifications.forEach(function(s) {
        html += '<tr>';
        html += '<td>' + esc(s.characteristic || s.name || '') + '</td>';
        html += '<td class="mono">' + esc(s.min != null ? s.min : '—') + '</td>';
        html += '<td class="mono">' + esc(s.max != null ? s.max : '—') + '</td>';
        html += '<td>' + esc(s.unit || '') + '</td>';
        html += '<td>' + esc(s.method || '') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    return html;
  }

  function renderMeasurementTable() {
    if (!state.measurements.length) {
      return '<div style="color:var(--hm-text-secondary);padding:16px;font-size:13px">' +
        T({ vi: 'Chưa có tiêu chí kiểm tra. Tải spec trước.', en: 'No inspection criteria loaded. Load spec first.' }) + '</div>';
    }

    var n = state.iqcRecord ? (state.iqcRecord.sample_size || state.sampleCount) : state.sampleCount;
    var html = '<div class="eqms-grid-wrapper"><table class="eqms-grid eqms-measurement-table">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Đặc tính', en: 'Characteristic' }) + '</th>';
    html += '<th>' + T({ vi: 'Min', en: 'Spec Min' }) + '</th>';
    html += '<th>' + T({ vi: 'Max', en: 'Spec Max' }) + '</th>';
    html += '<th>' + T({ vi: 'Đơn vị', en: 'Unit' }) + '</th>';
    for (var i = 0; i < n; i++) {
      html += '<th>' + T({ vi: 'Mẫu', en: 'Sample' }) + ' ' + (i + 1) + '</th>';
    }
    html += '<th>' + T({ vi: 'Kết quả', en: 'Result' }) + '</th>';
    html += '</tr></thead><tbody>';

    state.measurements.forEach(function(m, idx) {
      html += '<tr data-row="' + idx + '">';
      html += '<td style="font-weight:600">' + esc(m.characteristic) + '</td>';
      html += '<td class="mono">' + esc(m.spec_min) + '</td>';
      html += '<td class="mono">' + esc(m.spec_max) + '</td>';
      html += '<td>' + esc(m.unit) + '</td>';
      for (var s = 0; s < n; s++) {
        var val = m.samples[s] || '';
        var oob = isOutOfBounds(val, m.spec_min, m.spec_max);
        html += '<td><input type="number" step="any" class="eqms-form-input eqms-sample-input' + (oob ? ' oob' : '') + '" ';
        html += 'data-row="' + idx + '" data-sample="' + s + '" value="' + esc(val) + '" ';
        html += 'style="width:80px;text-align:center' + (oob ? ';border-color:var(--hm-danger);background:rgba(239,68,68,0.08)' : '') + '"></td>';
      }
      // Auto-calculated result
      var result = calcRowResult(m);
      var resultIcon = result === 'pass' ? '\u2705' : (result === 'fail' ? '\u274C' : '\u2796');
      var resultColor = result === 'pass' ? 'color:var(--hm-success)' : (result === 'fail' ? 'color:var(--hm-danger)' : '');
      html += '<td style="text-align:center;font-size:20px;' + resultColor + '">' + resultIcon + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Submit results button
    var rec = state.iqcRecord;
    if (rec && (rec.status === 'in_progress' || rec.status === 'pending')) {
      html += '<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">';
      html += '<button class="eqms-btn secondary" data-action="save-measurements">';
      html += T({ vi: 'Lưu kết quả', en: 'Save Results' });
      html += '</button>';
      html += '<button class="eqms-btn primary" data-action="submit-review">';
      html += T({ vi: 'Gửi xem xét', en: 'Submit for Review' });
      html += '</button>';
      html += '</div>';
    }

    return html;
  }

  function renderDispositionPanel(rec) {
    var html = '<div class="eqms-section" style="border:2px solid var(--hm-border);border-radius:8px;padding:16px;margin-top:16px">';
    html += '<div class="eqms-section-header" style="margin-bottom:12px">';
    html += '<span style="font-weight:700;font-size:15px">' + T({ vi: 'Quyết định xử lý', en: 'Disposition Decision' }) + '</span>';
    html += '</div>';

    var overallResult = calcOverallResult();
    var resultBadge = overallResult === 'pass'
      ? '<span class="eqms-badge accepted" style="font-size:14px">\u2705 ' + T({ vi: 'TẤT CẢ ĐẠT', en: 'ALL PASS' }) + '</span>'
      : (overallResult === 'fail'
        ? '<span class="eqms-badge rejected" style="font-size:14px">\u274C ' + T({ vi: 'CÓ HẠNG MỤC KHÔNG ĐẠT', en: 'HAS FAILING ITEMS' }) + '</span>'
        : '<span class="eqms-badge pending" style="font-size:14px">\u2796 ' + T({ vi: 'CHƯA HOÀN TẤT', en: 'INCOMPLETE' }) + '</span>');

    html += '<div style="margin-bottom:16px">' + resultBadge + '</div>';

    html += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    html += '<button class="eqms-btn primary" data-action="iqc-accept" style="min-width:140px;padding:12px 24px">';
    html += '\u2705 ' + T({ vi: 'Chấp nhận', en: 'Accept' });
    html += '</button>';
    html += '<button class="eqms-btn" data-action="iqc-reject" style="min-width:140px;padding:12px 24px;background:var(--hm-danger);color:white">';
    html += '\u274C ' + T({ vi: 'Từ chối', en: 'Reject' });
    html += '</button>';
    html += '<button class="eqms-btn secondary" data-action="iqc-hold" style="min-width:140px;padding:12px 24px">';
    html += '\u270B ' + T({ vi: 'Tạm giữ', en: 'Hold' });
    html += '</button>';
    html += '</div>';

    html += '<div style="margin-top:12px;font-size:12px;color:var(--hm-text-tertiary)">';
    html += T({ vi: 'Quyết định chấp nhận/từ chối yêu cầu chữ ký điện tử', en: 'Accept/Reject decisions require electronic signature' });
    html += '</div>';

    html += '</div>';
    return html;
  }

  /* ── Screen 3: IQC Review Queue ───────────────────────────────────────── */
  function renderIqcReview() {
    var html = '';

    // Filter bar
    html += UI.renderFilterBar(state.iqcFilters, {
      fields: [
        { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'select', options: STATUS_OPTIONS },
        { key: 'supplier', label: { vi: 'Nhà cung cấp', en: 'Supplier' }, type: 'text', placeholder: { vi: 'Mã NCC...', en: 'Supplier ID...' } },
        { key: 'material', label: { vi: 'Vật tư', en: 'Material' }, type: 'text', placeholder: { vi: 'Mã vật tư...', en: 'Material ID...' } },
        { key: 'date_from', label: { vi: 'Từ ngày', en: 'From' }, type: 'date' },
        { key: 'date_to', label: { vi: 'Đến ngày', en: 'To' }, type: 'date' }
      ]
    });

    if (state.iqcLoading) {
      html += UI.renderLoadingState({ vi: 'Đang tải danh sách IQC...', en: 'Loading IQC list...' });
      return html;
    }

    // Data grid
    var cols = [
      { key: 'lot_number', label: { vi: 'Số lô', en: 'Lot ID' }, type: 'id' },
      { key: 'supplier_id', label: { vi: 'Nhà cung cấp', en: 'Supplier' } },
      { key: 'item_id', label: { vi: 'Vật tư', en: 'Material' } },
      { key: 'inspector', label: { vi: 'Kiểm tra viên', en: 'Inspector' } },
      { key: 'received_date', label: { vi: 'Ngày nhận', en: 'Date' }, type: 'date' },
      { key: 'result', label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'quantity', label: { vi: 'Số lượng', en: 'Qty' }, type: 'number' },
      { key: 'defect_count', label: { vi: 'Lỗi', en: 'Defects' }, type: 'number',
        render: function(v) {
          var n = Number(v) || 0;
          if (n > 0) return '<span style="color:var(--hm-danger);font-weight:600">' + n + '</span>';
          return '<span style="color:var(--hm-text-tertiary)">0</span>';
        }
      }
    ];

    html += UI.renderDataGrid(cols, state.iqcData, { selectable: false });
    html += UI.renderPagination({ total: state.iqcTotal, offset: (state.iqcPage - 1) * 25, limit: 25 });

    // Export
    html += '<div style="margin-top:12px;display:flex;justify-content:flex-end">';
    html += UI.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '</div>';

    return html;
  }

  /* ── Screen 4: In-Process Inspection ──────────────────────────────────── */
  function renderInProcess() {
    // If we have a detail record, show execution view
    if (state.ipRecord) {
      return renderIpExecution();
    }

    var html = '';

    // Filter bar
    html += UI.renderFilterBar(state.ipFilters, {
      fields: [
        { key: 'work_order', label: { vi: 'Lệnh SX', en: 'Work Order' }, type: 'text', placeholder: { vi: 'WO-...', en: 'WO-...' } },
        { key: 'operation', label: { vi: 'Công đoạn', en: 'Operation' }, type: 'text', placeholder: { vi: 'OP...', en: 'OP...' } },
        { key: 'station', label: { vi: 'Trạm', en: 'Station' }, type: 'text', placeholder: { vi: 'Trạm...', en: 'Station...' } },
        { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'select', options: STATUS_OPTIONS }
      ]
    });

    if (state.ipLoading) {
      html += UI.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' });
      return html;
    }

    var cols = [
      { key: 'lot_id', label: { vi: 'Mã kiểm tra', en: 'Inspection ID' }, type: 'id' },
      { key: 'work_order_id', label: { vi: 'Lệnh SX', en: 'Work Order' } },
      { key: 'operation_name', label: { vi: 'Công đoạn', en: 'Operation' } },
      { key: 'station', label: { vi: 'Trạm', en: 'Station' } },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'result', label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' },
      { key: 'created_at', label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
    ];

    html += UI.renderDataGrid(cols, state.ipData, {});
    html += UI.renderPagination({ total: state.ipTotal, offset: (state.ipPage - 1) * 25, limit: 25 });

    return html;
  }

  function renderIpExecution() {
    var rec = state.ipRecord;
    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="ip-back">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to list' });
    html += '</button>';
    html += '</div>';

    html += UI.renderIdentityHeader({
      record_id: rec.lot_id || rec.id || '',
      title: rec.operation_name || '',
      status: rec.status || 'pending',
      status_label: getStatusLabel(rec.status),
      owner: rec.inspector || '',
      created_at: rec.created_at,
      updated_at: rec.updated_at
    }, {
      extraMeta: [
        { label: { vi: 'Lệnh SX', en: 'Work Order' }, value: rec.work_order_id },
        { label: { vi: 'Trạm', en: 'Station' }, value: rec.station },
        { label: { vi: 'Công đoạn', en: 'Operation' }, value: rec.operation_name }
      ]
    });

    html += UI.renderStateTimeline(IP_STATES, rec.status);

    // Measurement fields (operation-specific)
    html += UI.renderSection({ vi: 'Nhập giá trị đo', en: 'Measurement Entry' }, renderIpMeasurements(rec));

    // Action buttons
    if (rec.status === 'in_progress') {
      html += '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">';
      html += '<button class="eqms-btn primary" data-action="ip-submit-review">';
      html += T({ vi: 'Gửi xem xét', en: 'Submit for Review' });
      html += '</button>';
      html += '<button class="eqms-btn" data-action="ip-flag-nc" style="background:var(--hm-danger);color:white">';
      html += '\u{1F6A8} ' + T({ vi: 'Báo không phù hợp', en: 'Flag Nonconformance' });
      html += '</button>';
      html += '</div>';
    }

    if (rec.status === 'under_review') {
      html += '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">';
      html += '<button class="eqms-btn primary" data-action="ip-accept">';
      html += '\u2705 ' + T({ vi: 'Chấp nhận', en: 'Accept' });
      html += '</button>';
      html += '<button class="eqms-btn" data-action="ip-reject" style="background:var(--hm-danger);color:white">';
      html += '\u274C ' + T({ vi: 'Từ chối', en: 'Reject' });
      html += '</button>';
      html += '<button class="eqms-btn secondary" data-action="ip-hold">';
      html += '\u270B ' + T({ vi: 'Tạm giữ', en: 'Hold' });
      html += '</button>';
      html += '</div>';
    }

    return html;
  }

  function renderIpMeasurements(rec) {
    var criteria = rec.inspection_criteria || rec.measurements || [];
    if (!criteria.length) {
      return '<div style="padding:12px;color:var(--hm-text-secondary);font-size:13px">' +
        T({ vi: 'Chưa có tiêu chí kiểm tra cho công đoạn này', en: 'No inspection criteria for this operation' }) + '</div>';
    }

    var html = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Thông số', en: 'Parameter' }) + '</th>';
    html += '<th>' + T({ vi: 'Giới hạn dưới', en: 'LSL' }) + '</th>';
    html += '<th>' + T({ vi: 'Mục tiêu', en: 'Target' }) + '</th>';
    html += '<th>' + T({ vi: 'Giới hạn trên', en: 'USL' }) + '</th>';
    html += '<th>' + T({ vi: 'Đơn vị', en: 'Unit' }) + '</th>';
    html += '<th>' + T({ vi: 'Giá trị đo', en: 'Measured Value' }) + '</th>';
    html += '<th>' + T({ vi: 'Kết quả', en: 'Result' }) + '</th>';
    html += '</tr></thead><tbody>';

    criteria.forEach(function(c, idx) {
      var measured = c.measured_value || '';
      var oob = isOutOfBounds(measured, c.lsl || c.min, c.usl || c.max);
      html += '<tr>';
      html += '<td style="font-weight:600">' + esc(c.name || c.characteristic || '') + '</td>';
      html += '<td class="mono">' + esc(c.lsl != null ? c.lsl : (c.min != null ? c.min : '—')) + '</td>';
      html += '<td class="mono">' + esc(c.target != null ? c.target : '—') + '</td>';
      html += '<td class="mono">' + esc(c.usl != null ? c.usl : (c.max != null ? c.max : '—')) + '</td>';
      html += '<td>' + esc(c.unit || '') + '</td>';
      html += '<td><input type="number" step="any" class="eqms-form-input" data-field="ip-measure-' + idx + '" value="' + esc(measured) + '" ';
      html += 'style="width:100px;text-align:center' + (oob ? ';border-color:var(--hm-danger);background:rgba(239,68,68,0.08)' : '') + '">';
      html += '</td>';
      var icon = measured === '' ? '\u2796' : (oob ? '\u274C' : '\u2705');
      var color = measured === '' ? '' : (oob ? 'color:var(--hm-danger)' : 'color:var(--hm-success)');
      html += '<td style="text-align:center;font-size:18px;' + color + '">' + icon + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /* ── Screen 5: Analytics ──────────────────────────────────────────────── */
  function renderAnalytics() {
    if (state.metricsLoading) {
      return UI.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    }
    if (!state.metrics) {
      return UI.renderEmptyState({
        icon: '\u{1F4CA}',
        title: { vi: 'Chưa có dữ liệu phân tích', en: 'No analytics data' },
        action: { key: 'load-metrics', label: { vi: 'Tải dữ liệu', en: 'Load Data' } }
      });
    }

    var html = '';
    var m = state.metrics;

    // KPIs
    var iqcByStatus = m.iqc.by_status || [];
    var iqcByResult = m.iqc.by_result || [];
    var totalIqc = 0, passCount = 0, failCount = 0;
    iqcByStatus.forEach(function(s) { totalIqc += Number(s.count) || 0; });
    iqcByResult.forEach(function(r) {
      if (r.result === 'pass') passCount = Number(r.count) || 0;
      if (r.result === 'fail') failCount = Number(r.count) || 0;
    });
    var acceptRate = totalIqc > 0 ? Math.round((passCount / totalIqc) * 100) : 0;

    html += UI.renderKpiRow([
      { label: { vi: 'Tổng IQC', en: 'Total IQC' }, value: fmt(totalIqc), accent: '' },
      { label: { vi: 'Tỷ lệ chấp nhận', en: 'Acceptance Rate' }, value: acceptRate + '%', accent: acceptRate >= 95 ? 'success' : (acceptRate >= 85 ? '' : 'danger') },
      { label: { vi: 'Đạt', en: 'Pass' }, value: fmt(passCount), accent: 'success' },
      { label: { vi: 'Không đạt', en: 'Fail' }, value: fmt(failCount), accent: failCount > 0 ? 'danger' : '' },
      { label: { vi: 'Chờ xem xét', en: 'Pending Review' }, value: fmt(m.iqc.pending_count || 0), accent: (m.iqc.pending_count || 0) > 0 ? 'warning' : '' }
    ]);

    // Acceptance rate trend (chart placeholder)
    html += UI.renderSection({ vi: 'Xu hướng tỷ lệ chấp nhận', en: 'Acceptance Rate Trend' },
      UI.renderChartWithTableFallback('inspection-accept-trend', null,
        [
          { key: 'period', label: { vi: 'Kỳ', en: 'Period' } },
          { key: 'acceptance_rate', label: { vi: 'Tỷ lệ (%)', en: 'Rate (%)' }, type: 'number' },
          { key: 'total', label: { vi: 'Tổng', en: 'Total' }, type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Supplier quality by lot
    html += UI.renderSection({ vi: 'Chất lượng theo nhà cung cấp', en: 'Supplier Quality by Lot' },
      renderSupplierQualityTable()
    );

    // Defect type Pareto
    html += UI.renderSection({ vi: 'Pareto loại lỗi', en: 'Defect Type Pareto' },
      UI.renderChartWithTableFallback('defect-pareto', null,
        [
          { key: 'defect_type', label: { vi: 'Loại lỗi', en: 'Defect Type' } },
          { key: 'count', label: { vi: 'Số lượng', en: 'Count' }, type: 'number' },
          { key: 'cumulative_pct', label: { vi: 'Tích lũy (%)', en: 'Cumulative (%)' }, type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Inspection volume
    html += UI.renderSection({ vi: 'Khối lượng kiểm tra', en: 'Inspection Volume' },
      UI.renderChartWithTableFallback('inspection-volume', null,
        [
          { key: 'period', label: { vi: 'Kỳ', en: 'Period' } },
          { key: 'iqc_count', label: { vi: 'IQC', en: 'IQC' }, type: 'number' },
          { key: 'ip_count', label: { vi: 'Trong quá trình', en: 'In-Process' }, type: 'number' }
        ],
        [], { defaultMode: 'table' }
      )
    );

    // Reject rate by material/supplier
    html += UI.renderSection({ vi: 'Tỷ lệ từ chối theo vật tư / NCC', en: 'Reject Rate by Material / Supplier' },
      renderRejectRateTable()
    );

    return html;
  }

  function renderSupplierQualityTable() {
    var cols = [
      { key: 'supplier', label: { vi: 'Nhà cung cấp', en: 'Supplier' } },
      { key: 'total_lots', label: { vi: 'Tổng lô', en: 'Total Lots' }, type: 'number' },
      { key: 'accepted', label: { vi: 'Chấp nhận', en: 'Accepted' }, type: 'number' },
      { key: 'rejected', label: { vi: 'Từ chối', en: 'Rejected' }, type: 'number' },
      { key: 'accept_rate', label: { vi: 'Tỷ lệ (%)', en: 'Rate (%)' }, type: 'number' }
    ];
    return UI.renderDataGrid(cols, [], {});
  }

  function renderRejectRateTable() {
    var cols = [
      { key: 'material', label: { vi: 'Vật tư', en: 'Material' } },
      { key: 'supplier', label: { vi: 'Nhà cung cấp', en: 'Supplier' } },
      { key: 'total', label: { vi: 'Tổng', en: 'Total' }, type: 'number' },
      { key: 'rejected', label: { vi: 'Từ chối', en: 'Rejected' }, type: 'number' },
      { key: 'reject_rate', label: { vi: 'Tỷ lệ (%)', en: 'Rate (%)' },
        render: function(v) {
          var n = Number(v) || 0;
          var color = n > 10 ? 'var(--hm-danger)' : (n > 5 ? 'var(--hm-warning)' : 'var(--hm-success)');
          return '<span style="color:' + color + ';font-weight:600">' + n.toFixed(1) + '%</span>';
        }
      }
    ];
    return UI.renderDataGrid(cols, [], {});
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function renderField(label, value) {
    return '<div class="eqms-field">' +
      '<div class="eqms-field-label">' + esc(T(label)) + '</div>' +
      '<div class="eqms-field-value">' + esc(value != null ? String(value) : '—') + '</div>' +
      '</div>';
  }

  function isOutOfBounds(val, min, max) {
    if (val === '' || val == null) return false;
    var n = Number(val);
    if (isNaN(n)) return false;
    if (min !== '' && min != null && n < Number(min)) return true;
    if (max !== '' && max != null && n > Number(max)) return true;
    return false;
  }

  function calcRowResult(measurement) {
    var n = measurement.samples.filter(function(s) { return s !== '' && s != null; }).length;
    if (n === 0) return 'none';
    var hasFail = false;
    measurement.samples.forEach(function(s) {
      if (s !== '' && s != null && isOutOfBounds(s, measurement.spec_min, measurement.spec_max)) {
        hasFail = true;
      }
    });
    return hasFail ? 'fail' : 'pass';
  }

  function calcOverallResult() {
    if (!state.measurements.length) return 'none';
    var anyFail = false;
    var allComplete = true;
    state.measurements.forEach(function(m) {
      var r = calcRowResult(m);
      if (r === 'fail') anyFail = true;
      if (r === 'none') allComplete = false;
    });
    if (anyFail) return 'fail';
    if (!allComplete) return 'incomplete';
    return 'pass';
  }

  function getStatusLabel(status) {
    var map = {
      pending: T({ vi: 'Chờ xử lý', en: 'Pending' }),
      in_progress: T({ vi: 'Đang thực hiện', en: 'In Progress' }),
      result_recorded: T({ vi: 'Đã ghi kết quả', en: 'Result Recorded' }),
      under_review: T({ vi: 'Đang xem xét', en: 'Under Review' }),
      accepted: T({ vi: 'Chấp nhận', en: 'Accepted' }),
      rejected: T({ vi: 'Từ chối', en: 'Rejected' }),
      on_hold: T({ vi: 'Tạm giữ', en: 'On Hold' }),
      voided: T({ vi: 'Đã huỷ', en: 'Voided' })
    };
    return map[status] || status || '';
  }

  function collectMeasurements() {
    var results = [];
    state.measurements.forEach(function(m) {
      results.push({
        characteristic: m.characteristic,
        samples: m.samples.map(function(s) { return s !== '' ? Number(s) : null; }),
        result: calcRowResult(m)
      });
    });
    return results;
  }

  /* ── Event binding ────────────────────────────────────────────────────── */
  function bindEvents(container) {
    container.addEventListener('click', function(e) {
      // Tab switching
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        state.activeTab = tab.getAttribute('data-tab');
        rerender();
        return;
      }

      // Row click in grid
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input') && !e.target.closest('button')) {
        var id = row.getAttribute('data-id');
        if (state.activeTab === 'iqc-review') {
          loadIqcDetail(id);
        } else if (state.activeTab === 'inprocess') {
          loadIpDetail(id);
        } else if (state.activeTab === 'scan') {
          loadIqcDetail(id);
        }
        return;
      }

      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.getAttribute('data-action');

      switch (act) {
        case 'scan-lookup':
          var input = container.querySelector('[data-field="scan-value"]');
          if (input) {
            state.scanValue = input.value.trim();
            doScanLookup(state.scanValue);
          }
          break;

        case 'camera-scan':
          // Camera scan placeholder
          break;

        case 'create-iqc':
          state.activeTab = 'iqc-exec';
          state.iqcRecord = { status: 'pending', specifications: [], lot_number: state.scanValue };
          buildMeasurements();
          rerender();
          break;

        case 'save-measurements':
          if (state.iqcRecord) {
            var id = state.iqcRecord.inspection_id || state.iqcRecord.id;
            if (id) {
              executeIqcAction(id, 'record-result', { measurements: collectMeasurements() });
            }
          }
          break;

        case 'submit-review':
          if (state.iqcRecord) {
            var rid = state.iqcRecord.inspection_id || state.iqcRecord.id;
            if (rid) {
              executeIqcAction(rid, 'submit-review', { measurements: collectMeasurements() });
            }
          }
          break;

        case 'iqc-accept':
          if (state.iqcRecord) {
            var aid = state.iqcRecord.inspection_id || state.iqcRecord.id;
            if (aid) executeIqcAction(aid, 'accept', {});
          }
          break;

        case 'iqc-reject':
          if (state.iqcRecord) {
            var rejId = state.iqcRecord.inspection_id || state.iqcRecord.id;
            if (rejId) executeIqcAction(rejId, 'reject', {});
          }
          break;

        case 'iqc-hold':
          if (state.iqcRecord) {
            var hid = state.iqcRecord.inspection_id || state.iqcRecord.id;
            if (hid) executeIqcAction(hid, 'hold', {});
          }
          break;

        case 'apply-filters':
          if (state.activeTab === 'iqc-review') {
            readFilters(container, state.iqcFilters);
            state.iqcPage = 1;
            loadIqcList();
          } else if (state.activeTab === 'inprocess') {
            readFilters(container, state.ipFilters);
            state.ipPage = 1;
            loadIpList();
          }
          break;

        case 'reset-filters':
          if (state.activeTab === 'iqc-review') {
            state.iqcFilters = { status: '', supplier: '', material: '', date_from: '', date_to: '' };
            state.iqcPage = 1;
            loadIqcList();
          } else if (state.activeTab === 'inprocess') {
            state.ipFilters = { work_order: '', operation: '', station: '', status: '' };
            state.ipPage = 1;
            loadIpList();
          }
          break;

        case 'page':
          var page = Number(action.getAttribute('data-page')) || 1;
          if (state.activeTab === 'iqc-review') {
            state.iqcPage = page;
            loadIqcList();
          } else if (state.activeTab === 'inprocess') {
            state.ipPage = page;
            loadIpList();
          }
          break;

        case 'ip-back':
          state.ipRecord = null;
          rerender();
          break;

        case 'ip-submit-review':
          if (state.ipRecord) {
            var ipId = state.ipRecord.lot_id || state.ipRecord.id;
            if (ipId) executeIpAction(ipId, 'submit-review', {});
          }
          break;

        case 'ip-flag-nc':
          if (state.ipRecord) {
            var ncId = state.ipRecord.lot_id || state.ipRecord.id;
            if (ncId) executeIpAction(ncId, 'flag-nonconformance', {});
          }
          break;

        case 'ip-accept':
          if (state.ipRecord) {
            var iaId = state.ipRecord.lot_id || state.ipRecord.id;
            if (iaId) executeIpAction(iaId, 'accept', {});
          }
          break;

        case 'ip-reject':
          if (state.ipRecord) {
            var irId = state.ipRecord.lot_id || state.ipRecord.id;
            if (irId) executeIpAction(irId, 'reject', {});
          }
          break;

        case 'ip-hold':
          if (state.ipRecord) {
            var ihId = state.ipRecord.lot_id || state.ipRecord.id;
            if (ihId) executeIpAction(ihId, 'hold', {});
          }
          break;

        case 'load-metrics':
          loadMetrics();
          break;

        case 'export':
          var format = action.getAttribute('data-format');
          handleExport(format);
          break;
      }
    });

    // Measurement input changes
    container.addEventListener('input', function(e) {
      if (e.target.classList.contains('eqms-sample-input')) {
        var rowIdx = Number(e.target.getAttribute('data-row'));
        var sampleIdx = Number(e.target.getAttribute('data-sample'));
        if (state.measurements[rowIdx]) {
          state.measurements[rowIdx].samples[sampleIdx] = e.target.value;
          // Update out-of-bounds styling
          var m = state.measurements[rowIdx];
          var oob = isOutOfBounds(e.target.value, m.spec_min, m.spec_max);
          e.target.style.borderColor = oob ? 'var(--hm-danger)' : '';
          e.target.style.background = oob ? 'rgba(239,68,68,0.08)' : '';
          // Update result cell
          var tr = e.target.closest('tr');
          if (tr) {
            var resultCell = tr.querySelector('td:last-child');
            if (resultCell) {
              var result = calcRowResult(m);
              var icon = result === 'pass' ? '\u2705' : (result === 'fail' ? '\u274C' : '\u2796');
              var color = result === 'pass' ? 'color:var(--hm-success)' : (result === 'fail' ? 'color:var(--hm-danger)' : '');
              resultCell.style.cssText = 'text-align:center;font-size:20px;' + color;
              resultCell.textContent = icon;
            }
          }
        }
      }

      // Scan input enter key
      if (e.target.closest('[data-field="scan-value"]')) {
        state.scanValue = e.target.value;
      }
    });

    container.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target.closest('[data-field="scan-value"]')) {
        state.scanValue = e.target.value.trim();
        doScanLookup(state.scanValue);
      }
    });
  }

  function readFilters(container, filterObj) {
    container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      if (key in filterObj) {
        filterObj[key] = el.value;
      }
    });
  }

  function handleExport(format) {
    if (state.activeTab === 'iqc-review' || state.activeTab === 'iqc-exec') {
      if (state.iqcRecord) {
        var id = state.iqcRecord.inspection_id || state.iqcRecord.id;
        restCall(API.iqcExport + encodeURIComponent(id) + '/export', { format: format });
      }
    } else if (state.activeTab === 'inprocess') {
      if (state.ipRecord) {
        var ipId = state.ipRecord.lot_id || state.ipRecord.id;
        restCall(API.ipExport + encodeURIComponent(ipId) + '/export', { format: format });
      }
    }
  }

  /* ── Register module ──────────────────────────────────────────────────── */
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['inspection'] = { render: render, meta: MOD };

})();

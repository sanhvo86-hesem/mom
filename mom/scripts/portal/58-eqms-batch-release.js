/**
 * 58-eqms-batch-release.js — Batch Release
 * HESEM MOM Portal · Approval Queue + Evidence Workspace
 *
 * Screens: Register (Approval Queue), Workspace (Detail), Analytics
 * Workflow: lot_created -> data_aggregation -> exception_review -> pending_release -> approved | on_hold -> market_shipped
 * Endpoints: eqms_batch_release_*
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T;
  var esc  = util.esc;
  var fmt  = util.fmt;
  var fmtDate     = util.fmtDate;
  var fmtDateTime = util.fmtDateTime;
  var slugify     = util.slugify;
  var apiCall     = util.apiCall;
  var lang        = util.lang;

  // ─── Constants ───────────────────────────────────────────────────────
  var BR_STATES = ['lot_created','data_aggregation','exception_review','pending_release','approved','on_hold','market_shipped'];

  var BR_STATUS_LABELS = {
    lot_created:       { vi: 'Lô đã tạo', en: 'Lot Created' },
    data_aggregation:  { vi: 'Tổng hợp dữ liệu', en: 'Data Aggregation' },
    exception_review:  { vi: 'Xem xét ngoại lệ', en: 'Exception Review' },
    pending_release:   { vi: 'Chờ xuất xưởng', en: 'Pending Release' },
    approved:          { vi: 'Đã phê duyệt', en: 'Approved' },
    on_hold:           { vi: 'Tạm giữ', en: 'On Hold' },
    market_shipped:    { vi: 'Đã xuất thị trường', en: 'Market Shipped' }
  };

  var BR_RELEASE_TYPES = [
    { value: 'standard',    label: { vi: 'Tiêu chuẩn', en: 'Standard' } },
    { value: 'concession',  label: { vi: 'Nhượng bộ', en: 'Concession' } },
    { value: 'conditional', label: { vi: 'Có điều kiện', en: 'Conditional' } },
    { value: 'reject',      label: { vi: 'Từ chối', en: 'Reject' } }
  ];

  var BR_ACTIONS = {
    lot_created:      [{ action: 'aggregate-data',     label: { vi: 'Tổng hợp dữ liệu', en: 'Aggregate Data' },     style: 'primary' }],
    data_aggregation: [{ action: 'review-exceptions',  label: { vi: 'Xem xét ngoại lệ', en: 'Review Exceptions' }, style: 'primary' }],
    exception_review: [{ action: 'approve-release',    label: { vi: 'Phê duyệt xuất', en: 'Approve Release' },      style: 'primary' },
                       { action: 'hold-release',       label: { vi: 'Tạm giữ', en: 'Hold' },                        style: 'danger' }],
    pending_release:  [{ action: 'approve-release',    label: { vi: 'Phê duyệt', en: 'Approve' },                   style: 'primary' },
                       { action: 'hold-release',       label: { vi: 'Tạm giữ', en: 'Hold' },                        style: 'danger' }],
    approved:         [{ action: 'market-ship',        label: { vi: 'Xuất thị trường', en: 'Market Ship' },         style: 'primary' }],
    on_hold:          [{ action: 'approve-release',    label: { vi: 'Phê duyệt', en: 'Approve' },                   style: 'primary' }]
  };

  var DISPOSITION_OPTIONS = [
    { value: 'release',           label: { vi: 'Xuất xưởng', en: 'Release' } },
    { value: 'conditional_release', label: { vi: 'Xuất có điều kiện', en: 'Conditional Release' } },
    { value: 'hold',              label: { vi: 'Tạm giữ', en: 'Hold' } },
    { value: 'reject',            label: { vi: 'Từ chối', en: 'Reject' } },
    { value: 'rework',            label: { vi: 'Làm lại', en: 'Rework' } }
  ];

  // ─── State ───────────────────────────────────────────────────────────
  var state = {
    screen: 'register',  // register | workspace | analytics
    filters: {},
    sortKey: 'created_at', sortDir: 'desc',
    page: 1, limit: 25,
    data: [], total: 0,
    metrics: null,
    record: null,
    detailTab: 'summary',
    auditEvents: [], signatures: [],
    loading: false
  };

  var container = null;

  // ─── Helpers ─────────────────────────────────────────────────────────
  function statusBadge(status) {
    if (!status) return '—';
    var lbl = BR_STATUS_LABELS[status] || { vi: status, en: status };
    var cls = 'default';
    if (status === 'approved' || status === 'market_shipped') cls = 'pass';
    else if (status === 'on_hold') cls = 'fail';
    else if (status === 'pending_release') cls = 'conditional';
    else if (status === 'exception_review') cls = 'due-soon';
    return '<span class="eqms-badge ' + cls + '">' + esc(T(lbl)) + '</span>';
  }

  function exceptionBadge(count) {
    if (count == null) return '—';
    var n = Number(count);
    if (n === 0) return '<span class="eqms-badge pass">0</span>';
    return '<span class="eqms-badge fail">' + n + '</span>';
  }

  function resultBadge(result) {
    if (!result) return '—';
    var cls = (result === 'pass' || result === 'Pass') ? 'pass' : (result === 'fail' || result === 'Fail') ? 'fail' : 'conditional';
    return '<span class="eqms-badge ' + cls + '">' + esc(result) + '</span>';
  }

  function cpkBadge(cpk) {
    if (cpk == null) return '—';
    var v = Number(cpk);
    if (v >= 1.33) return '<span class="eqms-badge pass">Cpk ' + v.toFixed(2) + '</span>';
    if (v >= 1.0) return '<span class="eqms-badge conditional">Cpk ' + v.toFixed(2) + '</span>';
    return '<span class="eqms-badge fail">Cpk ' + v.toFixed(2) + '</span>';
  }

  function riskBadge(level) {
    if (!level) return '—';
    var cls = level === 'high' ? 'fail' : (level === 'medium' ? 'conditional' : 'pass');
    var lbl = { high: { vi: 'Cao', en: 'High' }, medium: { vi: 'Trung bình', en: 'Medium' }, low: { vi: 'Thấp', en: 'Low' } };
    return '<span class="eqms-badge ' + cls + '">' + esc(T(lbl[level] || { vi: level, en: level })) + '</span>';
  }

  function toast(msg) {
    if (typeof window._ecShowToast === 'function') window._ecShowToast(msg, 'success');
  }

  function collectForm(el) {
    var d = {};
    el.querySelectorAll('[data-field]').forEach(function(f) {
      d[f.getAttribute('data-field')] = f.type === 'checkbox' ? f.checked : f.value;
    });
    return d;
  }

  // ─── API Loaders ─────────────────────────────────────────────────────
  function loadRegister() {
    state.loading = true; renderRoot();
    var p = Object.assign({}, state.filters, {
      offset: (state.page - 1) * state.limit,
      limit: state.limit,
      sort: state.sortKey, dir: state.sortDir
    });
    apiCall('eqms_batch_release_query', p, 'GET').then(function(r) {
      state.data = (r && r.data) || [];
      state.total = (r && r.total) || state.data.length;
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadWorkspace(id) {
    state.loading = true; state.screen = 'workspace'; state.detailTab = 'summary'; renderRoot();
    Promise.all([
      apiCall('eqms_batch_release_detail', { id: id }, 'GET'),
      apiCall('eqms_batch_release_audit', { id: id }, 'GET'),
      apiCall('eqms_batch_release_signatures', { id: id }, 'GET')
    ]).then(function(results) {
      state.record = (results[0] && results[0].data) || results[0] || {};
      state.auditEvents = (results[1] && results[1].data) || [];
      state.signatures = (results[2] && results[2].data) || [];
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadMetrics() {
    apiCall('eqms_batch_release_metrics', {}, 'GET').then(function(r) {
      state.metrics = (r && r.data) || r || {};
      renderRoot();
    }).catch(function() {});
  }

  // ─── Module Meta ─────────────────────────────────────────────────────
  var MOD = {
    id: 'batch-release',
    label: { vi: 'Xuất xưởng lô', en: 'Batch Release' },
    icon: '\u{1F4E6}'
  };

  // ─── Screen Tabs ─────────────────────────────────────────────────────
  var SCREEN_TABS = [
    { id: 'register',  label: { vi: 'Hàng đợi phê duyệt', en: 'Approval Queue' } },
    { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' } }
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER ROOT
  // ═══════════════════════════════════════════════════════════════════════
  function renderRoot() {
    if (!container) return;
    var html = '';

    if (state.screen !== 'workspace') {
      html += ui.renderTabs(SCREEN_TABS, state.screen);
    }

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải dữ liệu...', en: 'Loading data...' });
      container.innerHTML = html;
      return;
    }

    switch (state.screen) {
      case 'register':  html += renderRegister(); break;
      case 'workspace': html += renderWorkspace(); break;
      case 'analytics': html += renderAnalytics(); break;
    }

    container.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 1: REGISTER (APPROVAL QUEUE)
  // ═══════════════════════════════════════════════════════════════════════
  function renderRegister() {
    var html = '';

    // KPI row
    if (state.metrics) {
      html += ui.renderKpiRow([
        { label: { vi: 'Tổng lô', en: 'Total Batches' },                  value: fmt(state.metrics.total_batches),        accent: '' },
        { label: { vi: 'Chờ phê duyệt', en: 'Pending Release' },          value: fmt(state.metrics.pending_release),       accent: 'warning' },
        { label: { vi: 'Đã phê duyệt', en: 'Approved' },                  value: fmt(state.metrics.approved),              accent: 'success' },
        { label: { vi: 'Tạm giữ', en: 'On Hold' },                        value: fmt(state.metrics.on_hold),               accent: 'danger' },
        { label: { vi: 'Tỷ lệ xuất lần 1', en: 'First-Pass Rate' },       value: state.metrics.first_pass_rate ? state.metrics.first_pass_rate + '%' : '—', accent: 'info', trend: state.metrics.first_pass_trend }
      ]);
    }

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-batch">' + T({ vi: '+ Tạo lô mới', en: '+ New Batch' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm lô/sản phẩm...', en: 'Search batch/product...' }, width: '220px' },
        { key: 'product', type: 'text', label: { vi: 'Sản phẩm', en: 'Product' }, width: '150px' },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: BR_STATES.map(function(s) {
          return { value: s, label: BR_STATUS_LABELS[s] };
        })},
        { key: 'has_exceptions', type: 'select', label: { vi: 'Ngoại lệ', en: 'Exceptions' }, options: [
          { value: 'yes', label: { vi: 'Có ngoại lệ', en: 'Has Exceptions' } },
          { value: 'no',  label: { vi: 'Không có', en: 'No Exceptions' } }
        ]},
        { key: 'date_from', type: 'date', label: { vi: 'Từ ngày', en: 'From' } },
        { key: 'date_to',   type: 'date', label: { vi: 'Đến ngày', en: 'To' } }
      ]
    });

    // Data Grid
    var columns = [
      { key: 'batch_id',          label: { vi: 'Mã lô', en: 'Batch/Lot ID' },        type: 'id',     sortable: true },
      { key: 'product',           label: { vi: 'Sản phẩm', en: 'Product' },           sortable: true },
      { key: 'status',            label: { vi: 'Trạng thái', en: 'Status' },          sortable: true,
        render: function(v) { return statusBadge(v); } },
      { key: 'exception_count',   label: { vi: 'Ngoại lệ', en: 'Exceptions' },        sortable: true,
        render: function(v) { return exceptionBadge(v); } },
      { key: 'iqc_result',        label: { vi: 'IQC', en: 'IQC Result' },             sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'ipqc_result',       label: { vi: 'IPQC', en: 'IPQC Result' },           sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'cal_status',        label: { vi: 'Hiệu chuẩn', en: 'Cal Status' },       sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'deviation_count',   label: { vi: 'Sai lệch', en: 'Deviations' },        type: 'number', sortable: true },
      { key: 'created_at',        label: { vi: 'Ngày tạo', en: 'Created' },           type: 'date',   sortable: true },
      { key: 'target_ship_date',  label: { vi: 'Ngày xuất DK', en: 'Target Ship' },   type: 'date',   sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.data, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 2: WORKSPACE (8 TABS)
  // ═══════════════════════════════════════════════════════════════════════
  function renderWorkspace() {
    var r = state.record;
    if (!r) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Không tìm thấy', en: 'Not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-register">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';

    // Identity header
    var actions = BR_ACTIONS[r.status] || [];
    html += ui.renderIdentityHeader(r, { actions: actions, extraMeta: [
      { label: { vi: 'Sản phẩm', en: 'Product' }, value: r.product },
      { label: { vi: 'Kích thước lô', en: 'Lot Size' }, value: fmt(r.lot_size) }
    ]});

    // Timeline
    html += ui.renderStateTimeline(BR_STATES, r.status);

    // 8 Tabs
    var detailTabs = [
      { id: 'summary',      label: { vi: 'Tổng quan', en: 'Summary' } },
      { id: 'release-pkg',  label: { vi: 'Gói xuất xưởng', en: 'Release Package' } },
      { id: 'exceptions',   label: { vi: 'Ngoại lệ', en: 'Exception Review' } },
      { id: 'disposition',   label: { vi: 'Quyết định', en: 'Disposition' } },
      { id: 'market-ship',  label: { vi: 'Xuất thị trường', en: 'Market Ship' } },
      { id: 'cross-system', label: { vi: 'Liên hệ thống', en: 'Cross-System' } },
      { id: 'audit',        label: { vi: 'Nhật ký', en: 'Audit Trail' } },
      { id: 'signatures',   label: { vi: 'Chữ ký & Tệp', en: 'Signatures & Files' } }
    ];
    html += ui.renderTabs(detailTabs, state.detailTab);

    html += '<div class="eqms-tab-content">';
    switch (state.detailTab) {
      case 'summary':      html += renderTabSummary(r); break;
      case 'release-pkg':  html += renderTabReleasePackage(r); break;
      case 'exceptions':   html += renderTabExceptions(r); break;
      case 'disposition':  html += renderTabDisposition(r); break;
      case 'market-ship':  html += renderTabMarketShip(r); break;
      case 'cross-system': html += renderTabCrossSystem(r); break;
      case 'audit':        html += renderTabAudit(r); break;
      case 'signatures':   html += renderTabSignatures(r); break;
    }
    html += '</div>';
    return html;
  }

  // ── Tab A: Summary ──
  function renderTabSummary(r) {
    return ui.renderFieldGrid([
      { label: { vi: 'Mã lô', en: 'Batch ID' },                value: r.batch_id, mono: true },
      { label: { vi: 'Sản phẩm', en: 'Product' },              value: r.product },
      { label: { vi: 'Kích thước lô', en: 'Lot Size' },        value: fmt(r.lot_size) },
      { label: { vi: 'Ngày sản xuất', en: 'Mfg Date' },       value: fmtDate(r.mfg_date) },
      { label: { vi: 'Ngày xuất dự kiến', en: 'Target Ship' }, value: fmtDate(r.target_ship_date) },
      { label: { vi: 'Trạng thái', en: 'Status' },             value: r.status, badge: true },
      { label: { vi: 'Loại xuất', en: 'Release Type' },        value: r.release_type, badge: true },
      { label: { vi: 'Điểm đến', en: 'Customer Destination' }, value: r.customer_destination },
      { label: { vi: 'Số ngoại lệ', en: 'Exception Count' },   value: r.exception_count },
      { label: { vi: 'Người tạo', en: 'Created By' },          value: r.created_by },
      { label: { vi: 'Ngày tạo', en: 'Created At' },           value: fmtDateTime(r.created_at) },
      { label: { vi: 'Cập nhật', en: 'Updated At' },           value: fmtDateTime(r.updated_at) }
    ]);
  }

  // ── Tab B: Release Package ──
  function renderTabReleasePackage(r) {
    var pkg = r.release_package || {};
    var html = '';

    // IQC Summary
    var iqc = pkg.iqc_summary || {};
    html += ui.renderSection({ vi: 'Tóm tắt IQC', en: 'IQC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Tổng kiểm tra', en: 'Total Inspected' },   value: fmt(iqc.total_inspected) },
        { label: { vi: 'Đạt', en: 'Pass' },                        value: fmt(iqc.pass_count) },
        { label: { vi: 'Không đạt', en: 'Fail' },                  value: fmt(iqc.fail_count) },
        { label: { vi: 'Kết quả', en: 'Result' },                  value: iqc.result, badge: true }
      ])
    );

    // IPQC Summary
    var ipqc = pkg.ipqc_summary || {};
    html += ui.renderSection({ vi: 'Tóm tắt IPQC', en: 'IPQC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Tổng kiểm tra', en: 'Total Inspected' },   value: fmt(ipqc.total_inspected) },
        { label: { vi: 'Đạt', en: 'Pass' },                        value: fmt(ipqc.pass_count) },
        { label: { vi: 'Không đạt', en: 'Fail' },                  value: fmt(ipqc.fail_count) },
        { label: { vi: 'Kết quả', en: 'Result' },                  value: ipqc.result, badge: true }
      ])
    );

    // SPC Summary
    var spc = pkg.spc_summary || {};
    html += ui.renderSection({ vi: 'Tóm tắt SPC', en: 'SPC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Cpk trung bình', en: 'Avg Cpk' },             value: spc.avg_cpk != null ? Number(spc.avg_cpk).toFixed(2) : '—' },
        { label: { vi: 'Cpk thấp nhất', en: 'Min Cpk' },              value: spc.min_cpk != null ? Number(spc.min_cpk).toFixed(2) : '—' },
        { label: { vi: 'Thông số ngoài kiểm soát', en: 'Out of Control' }, value: fmt(spc.out_of_control_count) },
        { label: { vi: 'Đánh giá', en: 'Assessment' },                 value: spc.assessment, badge: true }
      ])
    );

    // SPC Detail table
    if (spc.parameters && spc.parameters.length) {
      html += ui.renderDataGrid([
        { key: 'parameter',  label: { vi: 'Thông số', en: 'Parameter' } },
        { key: 'cpk',        label: { vi: 'Cpk', en: 'Cpk' },               type: 'number',
          render: function(v) { return cpkBadge(v); } },
        { key: 'mean',       label: { vi: 'Trung bình', en: 'Mean' },        type: 'number' },
        { key: 'std_dev',    label: { vi: 'Độ lệch chuẩn', en: 'Std Dev' },   type: 'number' },
        { key: 'in_control', label: { vi: 'Kiểm soát', en: 'In Control' },
          render: function(v) { return v ? '<span class="eqms-badge pass">' + T({ vi: 'Có', en: 'Yes' }) + '</span>' : '<span class="eqms-badge fail">' + T({ vi: 'Không', en: 'No' }) + '</span>'; } }
      ], spc.parameters, { selectable: false });
    }

    // Calibration Status
    var cal = pkg.calibration_status || {};
    html += ui.renderSection({ vi: 'Trạng thái hiệu chuẩn', en: 'Calibration Status' },
      ui.renderFieldGrid([
        { label: { vi: 'Tổng thiết bị', en: 'Total Equipment' },     value: fmt(cal.total_equipment) },
        { label: { vi: 'Hiệu lực', en: 'Valid' },                     value: fmt(cal.valid_count) },
        { label: { vi: 'Hết hạn', en: 'Expired' },                    value: fmt(cal.expired_count) },
        { label: { vi: 'Trạng thái', en: 'Status' },                  value: cal.status, badge: true }
      ])
    );

    // Deviations
    var devs = pkg.deviations || [];
    html += ui.renderSection({ vi: 'Sai lệch', en: 'Deviations' },
      devs.length ? ui.renderDataGrid([
        { key: 'deviation_id', label: { vi: 'Mã', en: 'ID' },            type: 'id' },
        { key: 'title',        label: { vi: 'Tiêu đề', en: 'Title' } },
        { key: 'severity',     label: { vi: 'Mức độ', en: 'Severity' },  type: 'badge' },
        { key: 'status',       label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'disposition',  label: { vi: 'Xử lý', en: 'Disposition' } }
      ], devs, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Không có sai lệch', en: 'No deviations' }) + '</div>'
    );

    // NCRs
    var ncrs = pkg.ncrs || [];
    html += ui.renderSection({ vi: 'Báo cáo không phù hợp', en: 'NCRs' },
      ncrs.length ? ui.renderDataGrid([
        { key: 'ncr_id',   label: { vi: 'Mã NCR', en: 'NCR ID' },    type: 'id' },
        { key: 'title',    label: { vi: 'Tiêu đề', en: 'Title' } },
        { key: 'category', label: { vi: 'Phân loại', en: 'Category' }, type: 'badge' },
        { key: 'status',   label: { vi: 'Trạng thái', en: 'Status' },  type: 'badge' },
        { key: 'resolution', label: { vi: 'Giải quyết', en: 'Resolution' } }
      ], ncrs, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Không có NCR', en: 'No NCRs' }) + '</div>'
    );

    return html;
  }

  // ── Tab C: Exception Review ──
  function renderTabExceptions(r) {
    var exceptions = r.exceptions || [];
    var html = '';

    if (!exceptions.length) {
      return ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Không có ngoại lệ', en: 'No Exceptions' },
        desc: { vi: 'Tất cả dữ liệu chất lượng đạt yêu cầu', en: 'All quality data meets requirements' }
      });
    }

    html += '<div class="eqms-section-desc">' + T({ vi: 'Xem xét và quyết định xử lý từng ngoại lệ trước khi phê duyệt xuất xưởng.', en: 'Review and disposition each exception before release approval.' }) + '</div>';

    html += ui.renderDataGrid([
      { key: 'exception_id', label: { vi: 'Mã', en: 'ID' },                type: 'id' },
      { key: 'type',         label: { vi: 'Loại', en: 'Type' },            type: 'badge' },
      { key: 'source',       label: { vi: 'Nguồn', en: 'Source' } },
      { key: 'description',  label: { vi: 'Mô tả', en: 'Description' },    type: 'truncate' },
      { key: 'severity',     label: { vi: 'Mức độ', en: 'Severity' },
        render: function(v) { return riskBadge(v); } },
      { key: 'disposition',  label: { vi: 'Xử lý', en: 'Disposition' },
        render: function(v, row) {
          if (row.disposition_locked) return '<span class="eqms-badge">' + esc(v || '—') + '</span>';
          return '<select class="eqms-input sm" data-exception-id="' + esc(row.exception_id || '') + '" data-field="exception_disposition"' +
            ' data-eqms-reference="eqms.disposition" data-current-value="' + esc(v || '') + '"' +
            ' data-empty-label="' + esc(T({ vi: '-- Chọn --', en: '-- Select --' })) + '" disabled>' +
            '<option value="">' + esc(T({ vi: 'Đang tải dữ liệu DB...', en: 'Loading DB data...' })) + '</option>' +
            (v ? '<option value="' + esc(v) + '" selected>' + esc(v) + '</option>' : '') +
            '</select>';
        } },
      { key: 'justification', label: { vi: 'Lý do', en: 'Justification' },
        render: function(v, row) {
          if (row.disposition_locked) return esc(v || '—');
          return '<input class="eqms-input sm" type="text" data-exception-id="' + esc(row.exception_id || '') + '" data-field="exception_justification" value="' + esc(v || '') + '" placeholder="' + T({ vi: 'Lý do...', en: 'Justification...' }) + '">';
        } }
    ], exceptions, { selectable: false });

    // Bulk save button
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="save-exceptions">' + T({ vi: 'Lưu xử lý ngoại lệ', en: 'Save Exception Dispositions' }) + '</button>';
    html += '</div>';

    return html;
  }

  // ── Tab D: Disposition Summary ──
  function renderTabDisposition(r) {
    var disp = r.disposition || {};
    var html = '';

    // Overall recommendation
    html += ui.renderSection({ vi: 'Khuyến nghị tổng thể', en: 'Overall Recommendation' },
      ui.renderFieldGrid([
        { label: { vi: 'Khuyến nghị', en: 'Recommendation' },             value: disp.recommendation, badge: true },
        { label: { vi: 'Mức độ rủi ro', en: 'Risk Level' },               value: disp.risk_level,
          render: function() { return riskBadge(disp.risk_level); } },
        { label: { vi: 'Người đề xuất', en: 'Recommended By' },           value: disp.recommended_by },
        { label: { vi: 'Ngày đề xuất', en: 'Recommendation Date' },       value: fmtDateTime(disp.recommendation_date) }
      ])
    );

    // Evidence Summary
    html += ui.renderSection({ vi: 'Tóm tắt bằng chứng', en: 'Evidence Summary' },
      '<div class="eqms-evidence-text">' + esc(disp.evidence_summary || T({ vi: 'Chưa có tóm tắt', en: 'No summary available' })) + '</div>'
    );

    // Risk Assessment
    html += ui.renderSection({ vi: 'Đánh giá rủi ro', en: 'Risk Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Rủi ro chất lượng', en: 'Quality Risk' },     value: disp.quality_risk,
          render: function() { return riskBadge(disp.quality_risk); } },
        { label: { vi: 'Rủi ro an toàn', en: 'Safety Risk' },         value: disp.safety_risk,
          render: function() { return riskBadge(disp.safety_risk); } },
        { label: { vi: 'Rủi ro pháp quy', en: 'Regulatory Risk' },    value: disp.regulatory_risk,
          render: function() { return riskBadge(disp.regulatory_risk); } },
        { label: { vi: 'Ghi chú rủi ro', en: 'Risk Notes' },          value: disp.risk_notes }
      ])
    );

    // Quality Statement
    html += ui.renderSection({ vi: 'Tuyên bố chất lượng', en: 'Quality Statement' },
      '<div class="eqms-quality-statement">' + esc(disp.quality_statement || T({ vi: 'Chưa có tuyên bố', en: 'No statement available' })) + '</div>'
    );

    return html;
  }

  // ── Tab E: Market Ship Decision ──
  function renderTabMarketShip(r) {
    var ship = r.market_ship || {};
    var html = '';

    // Current decision status
    if (ship.decision) {
      html += ui.renderSection({ vi: 'Quyết định hiện tại', en: 'Current Decision' },
        ui.renderFieldGrid([
          { label: { vi: 'Quyết định', en: 'Decision' },              value: ship.decision, badge: true },
          { label: { vi: 'Người quyết định', en: 'Decided By' },      value: ship.decided_by },
          { label: { vi: 'Ngày quyết định', en: 'Decision Date' },    value: fmtDateTime(ship.decision_date) },
          { label: { vi: 'Ghi chú', en: 'Notes' },                     value: ship.decision_notes }
        ])
      );
    }

    // Decision form (if not yet decided or can override)
    if (!ship.decision || r.status === 'approved' || r.status === 'on_hold') {
      html += ui.renderSection({ vi: 'Quyết định xuất thị trường', en: 'Market Ship Decision' }, function() {
        var form = '';
        form += '<div class="eqms-decision-form" style="padding:16px">';

        // Decision select
        form += ui.renderFormField({
          key: 'ship_decision',
          label: { vi: 'Quyết định cuối cùng', en: 'Final Decision' },
          type: 'select',
          options: [
            { value: 'release',  label: { vi: 'Xuất xưởng', en: 'Release to Market' } },
            { value: 'hold',     label: { vi: 'Tạm giữ', en: 'Hold' } },
            { value: 'reject',   label: { vi: 'Từ chối', en: 'Reject' } }
          ],
          required: true
        });

        // Notes
        form += ui.renderFormField({
          key: 'ship_notes',
          label: { vi: 'Ghi chú quyết định', en: 'Decision Notes' },
          type: 'textarea'
        });

        // Regulatory attestation
        form += '<div class="eqms-attestation" style="margin:16px 0;padding:12px;border:1px solid var(--hm-border,#e2e8f0);border-radius:8px;background:var(--hm-bg-subtle,#f8fafc)">';
        form += '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">';
        form += '<input type="checkbox" data-field="regulatory_attestation" style="margin-top:3px">';
        form += '<span>' + T({ vi: 'Tôi xác nhận rằng lô hàng này đã được xem xét đầy đủ theo các yêu cầu quy định áp dụng và tất cả hồ sơ chất lượng đã hoàn chỉnh.', en: 'I attest that this batch has been thoroughly reviewed per applicable regulatory requirements and all quality records are complete.' }) + '</span>';
        form += '</label></div>';

        // E-signature
        form += ui.renderFormField({
          key: 'esignature_pin',
          label: { vi: 'Chữ ký điện tử (PIN)', en: 'E-Signature (PIN)' },
          type: 'password',
          required: true
        });

        // Submit
        form += '<div style="text-align:right;margin-top:12px">';
        form += '<button class="eqms-btn primary" data-action="submit-market-ship">' + T({ vi: 'Ký và gửi quyết định', en: 'Sign & Submit Decision' }) + '</button>';
        form += '</div>';

        form += '</div>';
        return form;
      }());
    }

    return html;
  }

  // ── Tab F: Cross-System Visibility ──
  function renderTabCrossSystem(r) {
    var cross = r.cross_system || {};
    var html = '';

    // Linked Work Orders
    var wos = cross.work_orders || [];
    html += ui.renderSection({ vi: 'Lệnh sản xuất liên kết', en: 'Linked Work Orders' },
      wos.length ? ui.renderDataGrid([
        { key: 'wo_id',      label: { vi: 'Mã LSX', en: 'WO ID' },         type: 'id' },
        { key: 'product',    label: { vi: 'Sản phẩm', en: 'Product' } },
        { key: 'quantity',   label: { vi: 'Số lượng', en: 'Quantity' },     type: 'number' },
        { key: 'status',     label: { vi: 'Trạng thái', en: 'Status' },     type: 'badge' },
        { key: 'completion', label: { vi: 'Hoàn thành', en: 'Completion' }, type: 'number' }
      ], wos, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Không có LSX', en: 'No work orders' }) + '</div>'
    );

    // Linked Materials
    var mats = cross.materials || [];
    html += ui.renderSection({ vi: 'Nguyên vật liệu', en: 'Materials' },
      mats.length ? ui.renderDataGrid([
        { key: 'material_id',   label: { vi: 'Mã NVL', en: 'Material ID' },  type: 'id' },
        { key: 'material_name', label: { vi: 'Tên', en: 'Name' } },
        { key: 'lot_number',    label: { vi: 'Số lô', en: 'Lot Number' } },
        { key: 'quantity_used', label: { vi: 'SL sử dụng', en: 'Qty Used' }, type: 'number' },
        { key: 'supplier',      label: { vi: 'NCC', en: 'Supplier' } }
      ], mats, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Không có NVL', en: 'No materials' }) + '</div>'
    );

    // Genealogy
    var gen = cross.genealogy || [];
    html += ui.renderSection({ vi: 'Truy xuất nguồn gốc', en: 'Genealogy' },
      gen.length ? ui.renderDataGrid([
        { key: 'serial_number', label: { vi: 'Số seri', en: 'Serial Number' },  type: 'id' },
        { key: 'component',     label: { vi: 'Linh kiện', en: 'Component' } },
        { key: 'lot_number',    label: { vi: 'Số lô', en: 'Lot Number' } },
        { key: 'parent',        label: { vi: 'Lô cha', en: 'Parent' } },
        { key: 'status',        label: { vi: 'Trạng thái', en: 'Status' },       type: 'badge' }
      ], gen, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Không có dữ liệu', en: 'No genealogy data' }) + '</div>'
    );

    // ERP Sync
    var erp = cross.erp_sync || {};
    html += ui.renderSection({ vi: 'Đồng bộ ERP', en: 'ERP Sync' },
      ui.renderFieldGrid([
        { label: { vi: 'Trạng thái đồng bộ', en: 'Sync Status' },       value: erp.sync_status, badge: true },
        { label: { vi: 'Đồng bộ lúc', en: 'Last Synced' },              value: fmtDateTime(erp.last_synced_at) },
        { label: { vi: 'Mã ERP', en: 'ERP Reference' },                 value: erp.erp_reference, mono: true },
        { label: { vi: 'Ghi chú', en: 'Notes' },                        value: erp.notes }
      ])
    );

    return html;
  }

  // ── Tab G: Related Records + Audit Trail ──
  function renderTabAudit(r) {
    var html = '';

    // Related records
    var related = r.related_records || [];
    if (related.length) {
      html += ui.renderSection({ vi: 'Hồ sơ liên quan', en: 'Related Records' },
        ui.renderDataGrid([
          { key: 'record_type', label: { vi: 'Loại', en: 'Type' },       type: 'badge' },
          { key: 'record_id',   label: { vi: 'Mã', en: 'ID' },           type: 'id' },
          { key: 'title',       label: { vi: 'Tiêu đề', en: 'Title' } },
          { key: 'status',      label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
          { key: 'created_at',  label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
        ], related, { selectable: false })
      );
    }

    // Audit trail
    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' }, ui.renderAuditTrail(state.auditEvents));

    return html;
  }

  // ── Tab H: Signatures + Attachments + Comments ──
  function renderTabSignatures(r) {
    var html = '';

    // Signatures
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' }, ui.renderSignaturePanel(state.signatures, [
      { vi: 'Người tạo', en: 'Created By' },
      { vi: 'QC xem xét', en: 'QC Reviewed By' },
      { vi: 'QA phê duyệt', en: 'QA Approved By' },
      { vi: 'Quản lý xuất xưởng', en: 'Release Manager' }
    ]));

    // Attachments
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' }, ui.renderAttachmentsGrid(r.attachments || []));

    // Comments
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' }, ui.renderCommentsThread(r.comments || []));

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 3: ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════
  function renderAnalytics() {
    var html = '';
    var m = state.metrics || {};

    // KPI cards
    html += ui.renderKpiRow([
      { label: { vi: 'Thời gian chu trình TB', en: 'Avg Cycle Time' },    value: m.avg_cycle_time ? m.avg_cycle_time + ' ' + T({ vi: 'ngày', en: 'days' }) : '—', accent: 'info' },
      { label: { vi: 'Tỷ lệ ngoại lệ', en: 'Exception Rate' },            value: m.exception_rate ? m.exception_rate + '%' : '—',   accent: 'warning', trend: m.exception_trend },
      { label: { vi: 'Tỷ lệ tạm giữ', en: 'Hold Rate' },                  value: m.hold_rate ? m.hold_rate + '%' : '—',             accent: 'danger',  trend: m.hold_trend },
      { label: { vi: 'Tỷ lệ xuất lần 1', en: 'First-Pass Release' },      value: m.first_pass_rate ? m.first_pass_rate + '%' : '—', accent: 'success', trend: m.first_pass_trend }
    ]);

    // Release Cycle Time Trend
    html += ui.renderSection({ vi: 'Xu hướng thời gian chu trình xuất', en: 'Release Cycle Time Trend' },
      ui.renderChartWithTableFallback('chart-cycle-time', null,
        [
          { key: 'period',     label: { vi: 'Thời gian', en: 'Period' } },
          { key: 'avg_days',   label: { vi: 'TB (ngày)', en: 'Avg (days)' },  type: 'number' },
          { key: 'min_days',   label: { vi: 'Min (ngày)', en: 'Min (days)' }, type: 'number' },
          { key: 'max_days',   label: { vi: 'Max (ngày)', en: 'Max (days)' }, type: 'number' },
          { key: 'batch_count', label: { vi: 'Số lô', en: 'Batches' },        type: 'number' }
        ],
        m.cycle_time_trend || []
      )
    );

    // Exception Rate by Product
    html += ui.renderSection({ vi: 'Tỷ lệ ngoại lệ theo sản phẩm', en: 'Exception Rate by Product' },
      ui.renderChartWithTableFallback('chart-exception-product', null,
        [
          { key: 'product',          label: { vi: 'Sản phẩm', en: 'Product' } },
          { key: 'total_batches',    label: { vi: 'Tổng lô', en: 'Total Batches' },    type: 'number' },
          { key: 'exception_batches', label: { vi: 'Lô có NL', en: 'With Exceptions' }, type: 'number' },
          { key: 'exception_rate',   label: { vi: 'Tỷ lệ %', en: 'Rate %' },            type: 'number' }
        ],
        m.exception_by_product || []
      )
    );

    // Hold Rate Trend
    html += ui.renderSection({ vi: 'Xu hướng tỷ lệ tạm giữ', en: 'Hold Rate Trend' },
      ui.renderChartWithTableFallback('chart-hold-trend', null,
        [
          { key: 'period',      label: { vi: 'Thời gian', en: 'Period' } },
          { key: 'total',       label: { vi: 'Tổng', en: 'Total' },         type: 'number' },
          { key: 'hold_count',  label: { vi: 'Tạm giữ', en: 'On Hold' },   type: 'number' },
          { key: 'hold_rate',   label: { vi: 'Tỷ lệ %', en: 'Rate %' },    type: 'number' }
        ],
        m.hold_trend_data || []
      )
    );

    // First-Pass Release by Month
    html += ui.renderSection({ vi: 'Tỷ lệ xuất lần 1 theo tháng', en: 'First-Pass Release Rate by Month' },
      ui.renderChartWithTableFallback('chart-first-pass', null,
        [
          { key: 'month',            label: { vi: 'Tháng', en: 'Month' } },
          { key: 'total_released',   label: { vi: 'Tổng xuất', en: 'Total Released' },   type: 'number' },
          { key: 'first_pass',       label: { vi: 'Lần 1', en: 'First Pass' },            type: 'number' },
          { key: 'first_pass_rate',  label: { vi: 'Tỷ lệ %', en: 'Rate %' },              type: 'number' }
        ],
        m.first_pass_trend_data || []
      )
    );

    // Top exceptions table
    html += ui.renderSection({ vi: 'Ngoại lệ phổ biến', en: 'Top Exception Types' },
      ui.renderDataGrid([
        { key: 'exception_type',  label: { vi: 'Loại ngoại lệ', en: 'Exception Type' } },
        { key: 'occurrence',      label: { vi: 'Số lần', en: 'Occurrences' },             type: 'number' },
        { key: 'pct_of_total',    label: { vi: '% tổng', en: '% of Total' },               type: 'number' },
        { key: 'avg_resolution',  label: { vi: 'TB xử lý (ngày)', en: 'Avg Resolution (days)' }, type: 'number' }
      ], m.top_exceptions || [], { selectable: false })
    );

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE FORM
  // ═══════════════════════════════════════════════════════════════════════
  function renderCreateBatchForm() {
    var body = '';
    body += ui.renderFormField({ key: 'batch_number', label: { vi: 'Số lô', en: 'Batch/Lot Number' }, required: true });
    body += ui.renderFormField({ key: 'product_id', label: { vi: 'Sản phẩm', en: 'Product' }, required: true });
    body += ui.renderFormField({ key: 'lot_size', label: { vi: 'Kích thước lô', en: 'Lot Size' }, type: 'number', min: 1, required: true });
    body += ui.renderFormField({ key: 'manufacture_date', label: { vi: 'Ngày sản xuất', en: 'Mfg Date' }, type: 'date', required: true });
    body += ui.renderFormField({ key: 'expiry_date', label: { vi: 'Ngày hết hạn', en: 'Expiry Date' }, type: 'date' });
    body += ui.renderFormField({ key: 'release_type', label: { vi: 'Loại xuất', en: 'Release Type' }, type: 'select', options: BR_RELEASE_TYPES, required: true });
    body += ui.renderFormField({ key: 'customer_destination', label: { vi: 'Điểm đến', en: 'Customer Destination' } });
    return ui.renderWizardShell([
      { label: { vi: 'Thông tin lô', en: 'Batch Info' } },
      { label: { vi: 'Xem xét', en: 'Review' } }
    ], 0, body, { saveDraft: true });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════════════
  function bindEvents(el) {
    el.addEventListener('click', function(e) {
      // Tab switching
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        var tabId = tab.getAttribute('data-tab');
        var screenIds = SCREEN_TABS.map(function(t) { return t.id; });
        if (screenIds.indexOf(tabId) >= 0) {
          state.screen = tabId;
          if (tabId === 'register') { loadRegister(); loadMetrics(); }
          else if (tabId === 'analytics') { loadMetrics(); renderRoot(); }
          return;
        }
        // Workspace detail tabs
        if (state.screen === 'workspace') { state.detailTab = tabId; renderRoot(); return; }
      }

      // Row click
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input') && !e.target.closest('button') && !e.target.closest('select')) {
        var id = row.getAttribute('data-id');
        if (state.screen === 'register') { loadWorkspace(id); return; }
      }

      // Actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'back-to-register':
          state.screen = 'register'; state.record = null; loadRegister(); break;
        case 'create-batch':
          showModal({ vi: 'Tạo lô mới', en: 'New Batch Release' }, renderCreateBatchForm()); break;

        case 'wizard-submit':
          handleWizardSubmit(); break;
        case 'cancel-modal':
          closeModal(); break;

        case 'aggregate-data':
        case 'review-exceptions':
        case 'approve-release':
        case 'hold-release':
        case 'market-ship':
          handleWorkflowAction(action); break;

        case 'save-exceptions':
          handleSaveExceptions(); break;

        case 'submit-market-ship':
          handleMarketShipDecision(); break;

        case 'apply-filters':
          applyFilters(); break;
        case 'reset-filters':
          resetFilters(); break;

        case 'export':
          handleExport(actionEl.getAttribute('data-format')); break;

        case 'page':
          handlePage(actionEl.getAttribute('data-page')); break;
      }
    });

    // Sort
    el.addEventListener('click', function(e) {
      var th = e.target.closest('th[data-sort]');
      if (!th) return;
      var key = th.getAttribute('data-sort');
      if (state.screen === 'register') {
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        loadRegister();
      }
    });
  }

  function applyFilters() {
    if (!container) return;
    container.querySelectorAll('[data-filter]').forEach(function(f) {
      var key = f.getAttribute('data-filter');
      var val = f.value;
      if (val) state.filters[key] = val; else delete state.filters[key];
    });
    state.page = 1;
    loadRegister();
  }

  function resetFilters() {
    state.filters = {};
    state.page = 1;
    loadRegister();
  }

  function handlePage(p) {
    p = parseInt(p, 10);
    if (isNaN(p) || p < 1) return;
    state.page = p;
    loadRegister();
  }

  function handleWizardSubmit() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal) return;
    var data = collectForm(modal);
    apiCall('eqms_batch_release_create', data).then(function() {
      closeModal();
      toast(T({ vi: 'Đã tạo lô thành công', en: 'Batch created successfully' }));
      loadRegister();
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleWorkflowAction(action) {
    if (!state.record) return;
    var id = state.record.id || state.record.batch_id;
    var endpoint = 'eqms_batch_release_action_' + action.replace(/-/g, '_');
    apiCall(endpoint, { id: id }).then(function() {
      toast(T({ vi: 'Cập nhật thành công', en: 'Updated successfully' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleSaveExceptions() {
    if (!state.record || !container) return;
    var id = state.record.id || state.record.batch_id;
    var dispositions = [];
    container.querySelectorAll('[data-field="exception_disposition"]').forEach(function(sel) {
      var exId = sel.getAttribute('data-exception-id');
      var justInput = container.querySelector('[data-exception-id="' + exId + '"][data-field="exception_justification"]');
      dispositions.push({
        exception_id: exId,
        disposition: sel.value,
        justification: justInput ? justInput.value : ''
      });
    });
    apiCall('eqms_batch_release_update', { id: id, action: 'save-exceptions', dispositions: dispositions }).then(function() {
      toast(T({ vi: 'Đã lưu xử lý ngoại lệ', en: 'Exception dispositions saved' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleMarketShipDecision() {
    if (!state.record || !container) return;
    var id = state.record.id || state.record.batch_id;
    var form = container.querySelector('.eqms-decision-form');
    if (!form) return;
    var data = collectForm(form);

    // Validate attestation
    if (!data.regulatory_attestation) {
      toast(T({ vi: 'Vui lòng xác nhận chứng nhận pháp quy', en: 'Please confirm regulatory attestation' }));
      return;
    }
    // Validate PIN
    if (!data.esignature_pin) {
      toast(T({ vi: 'Vui lòng nhập PIN chữ ký điện tử', en: 'Please enter e-signature PIN' }));
      return;
    }

    apiCall('eqms_batch_release_action_market_ship', {
      id: id,
      decision: data.ship_decision,
      notes: data.ship_notes,
      regulatory_attestation: data.regulatory_attestation,
      esignature_pin: data.esignature_pin
    }).then(function() {
      toast(T({ vi: 'Quyết định đã được ký và gửi', en: 'Decision signed and submitted' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleExport(format) {
    var params = Object.assign({}, state.filters, { format: format });
    apiCall('eqms_batch_release_export', params, 'GET').then(function(r) {
      if (r && r.url) window.open(r.url, '_blank');
      else toast(T({ vi: 'Đã yêu cầu xuất', en: 'Export requested' }));
    });
  }

  // ─── Modal ───────────────────────────────────────────────────────────
  function showModal(title, bodyHtml) {
    var existing = document.querySelector('.eqms-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'eqms-modal-overlay';
    overlay.innerHTML = '<div class="eqms-modal"><div class="eqms-modal-header"><span>' + esc(T(title)) + '</span><button class="eqms-modal-close" data-action="cancel-modal">\u2715</button></div>' + bodyHtml + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay || e.target.closest('[data-action="cancel-modal"]')) closeModal();
      if (e.target.closest('[data-action="wizard-submit"]')) handleWizardSubmit();
    });
  }

  function closeModal() {
    var overlay = document.querySelector('.eqms-modal-overlay');
    if (overlay) overlay.remove();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER ENTRY
  // ═══════════════════════════════════════════════════════════════════════
  function render(el, ctx) {
    container = el;
    state.screen = 'register';
    state.filters = {};
    state.page = 1;

    if (ctx && ctx.recordId) {
      loadWorkspace(ctx.recordId);
    } else {
      loadRegister();
      loadMetrics();
    }

    bindEvents(el);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTER MODULE
  // ═══════════════════════════════════════════════════════════════════════
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['batch-release'] = { render: render, meta: MOD };

})();

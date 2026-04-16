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
    lot_created:       { vi: 'Lo da tao', en: 'Lot Created' },
    data_aggregation:  { vi: 'Tong hop du lieu', en: 'Data Aggregation' },
    exception_review:  { vi: 'Xem xet ngoai le', en: 'Exception Review' },
    pending_release:   { vi: 'Cho xuat xuong', en: 'Pending Release' },
    approved:          { vi: 'Da phe duyet', en: 'Approved' },
    on_hold:           { vi: 'Tam giu', en: 'On Hold' },
    market_shipped:    { vi: 'Da xuat thi truong', en: 'Market Shipped' }
  };

  var BR_RELEASE_TYPES = [
    { value: 'standard',    label: { vi: 'Tieu chuan', en: 'Standard' } },
    { value: 'concession',  label: { vi: 'Nhuong bo', en: 'Concession' } },
    { value: 'conditional', label: { vi: 'Co dieu kien', en: 'Conditional' } },
    { value: 'reject',      label: { vi: 'Tu choi', en: 'Reject' } }
  ];

  var BR_ACTIONS = {
    lot_created:      [{ action: 'aggregate-data',     label: { vi: 'Tong hop du lieu', en: 'Aggregate Data' },     style: 'primary' }],
    data_aggregation: [{ action: 'review-exceptions',  label: { vi: 'Xem xet ngoai le', en: 'Review Exceptions' }, style: 'primary' }],
    exception_review: [{ action: 'approve-release',    label: { vi: 'Phe duyet xuat', en: 'Approve Release' },      style: 'primary' },
                       { action: 'hold-release',       label: { vi: 'Tam giu', en: 'Hold' },                        style: 'danger' }],
    pending_release:  [{ action: 'approve-release',    label: { vi: 'Phe duyet', en: 'Approve' },                   style: 'primary' },
                       { action: 'hold-release',       label: { vi: 'Tam giu', en: 'Hold' },                        style: 'danger' }],
    approved:         [{ action: 'market-ship',        label: { vi: 'Xuat thi truong', en: 'Market Ship' },         style: 'primary' }],
    on_hold:          [{ action: 'approve-release',    label: { vi: 'Phe duyet', en: 'Approve' },                   style: 'primary' }]
  };

  var DISPOSITION_OPTIONS = [
    { value: 'release',           label: { vi: 'Xuat xuong', en: 'Release' } },
    { value: 'conditional_release', label: { vi: 'Xuat co dieu kien', en: 'Conditional Release' } },
    { value: 'hold',              label: { vi: 'Tam giu', en: 'Hold' } },
    { value: 'reject',            label: { vi: 'Tu choi', en: 'Reject' } },
    { value: 'rework',            label: { vi: 'Lam lai', en: 'Rework' } }
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
    var lbl = { high: { vi: 'Cao', en: 'High' }, medium: { vi: 'Trung binh', en: 'Medium' }, low: { vi: 'Thap', en: 'Low' } };
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
    label: { vi: 'Xuat xuong lo', en: 'Batch Release' },
    icon: '\u{1F4E6}'
  };

  // ─── Screen Tabs ─────────────────────────────────────────────────────
  var SCREEN_TABS = [
    { id: 'register',  label: { vi: 'Hang doi phe duyet', en: 'Approval Queue' } },
    { id: 'analytics', label: { vi: 'Phan tich', en: 'Analytics' } }
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
      html += ui.renderLoadingState({ vi: 'Dang tai du lieu...', en: 'Loading data...' });
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
        { label: { vi: 'Tong lo', en: 'Total Batches' },                  value: fmt(state.metrics.total_batches),        accent: '' },
        { label: { vi: 'Cho phe duyet', en: 'Pending Release' },          value: fmt(state.metrics.pending_release),       accent: 'warning' },
        { label: { vi: 'Da phe duyet', en: 'Approved' },                  value: fmt(state.metrics.approved),              accent: 'success' },
        { label: { vi: 'Tam giu', en: 'On Hold' },                        value: fmt(state.metrics.on_hold),               accent: 'danger' },
        { label: { vi: 'Ty le xuat lan 1', en: 'First-Pass Rate' },       value: state.metrics.first_pass_rate ? state.metrics.first_pass_rate + '%' : '—', accent: 'info', trend: state.metrics.first_pass_trend }
      ]);
    }

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-batch">' + T({ vi: '+ Tao lo moi', en: '+ New Batch' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tim kiem lo/san pham...', en: 'Search batch/product...' }, width: '220px' },
        { key: 'product', type: 'text', label: { vi: 'San pham', en: 'Product' }, width: '150px' },
        { key: 'status', type: 'select', label: { vi: 'Trang thai', en: 'Status' }, options: BR_STATES.map(function(s) {
          return { value: s, label: BR_STATUS_LABELS[s] };
        })},
        { key: 'has_exceptions', type: 'select', label: { vi: 'Ngoai le', en: 'Exceptions' }, options: [
          { value: 'yes', label: { vi: 'Co ngoai le', en: 'Has Exceptions' } },
          { value: 'no',  label: { vi: 'Khong co', en: 'No Exceptions' } }
        ]},
        { key: 'date_from', type: 'date', label: { vi: 'Tu ngay', en: 'From' } },
        { key: 'date_to',   type: 'date', label: { vi: 'Den ngay', en: 'To' } }
      ]
    });

    // Data Grid
    var columns = [
      { key: 'batch_id',          label: { vi: 'Ma lo', en: 'Batch/Lot ID' },        type: 'id',     sortable: true },
      { key: 'product',           label: { vi: 'San pham', en: 'Product' },           sortable: true },
      { key: 'status',            label: { vi: 'Trang thai', en: 'Status' },          sortable: true,
        render: function(v) { return statusBadge(v); } },
      { key: 'exception_count',   label: { vi: 'Ngoai le', en: 'Exceptions' },        sortable: true,
        render: function(v) { return exceptionBadge(v); } },
      { key: 'iqc_result',        label: { vi: 'IQC', en: 'IQC Result' },             sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'ipqc_result',       label: { vi: 'IPQC', en: 'IPQC Result' },           sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'cal_status',        label: { vi: 'Hieu chuan', en: 'Cal Status' },       sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'deviation_count',   label: { vi: 'Sai lech', en: 'Deviations' },        type: 'number', sortable: true },
      { key: 'created_at',        label: { vi: 'Ngay tao', en: 'Created' },           type: 'date',   sortable: true },
      { key: 'target_ship_date',  label: { vi: 'Ngay xuat DK', en: 'Target Ship' },   type: 'date',   sortable: true }
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
    if (!r) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Khong tim thay', en: 'Not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-register">\u2190 ' + T({ vi: 'Quay lai', en: 'Back' }) + '</button></div>';

    // Identity header
    var actions = BR_ACTIONS[r.status] || [];
    html += ui.renderIdentityHeader(r, { actions: actions, extraMeta: [
      { label: { vi: 'San pham', en: 'Product' }, value: r.product },
      { label: { vi: 'Kich thuoc lo', en: 'Lot Size' }, value: fmt(r.lot_size) }
    ]});

    // Timeline
    html += ui.renderStateTimeline(BR_STATES, r.status);

    // 8 Tabs
    var detailTabs = [
      { id: 'summary',      label: { vi: 'Tong quan', en: 'Summary' } },
      { id: 'release-pkg',  label: { vi: 'Goi xuat xuong', en: 'Release Package' } },
      { id: 'exceptions',   label: { vi: 'Ngoai le', en: 'Exception Review' } },
      { id: 'disposition',   label: { vi: 'Quyet dinh', en: 'Disposition' } },
      { id: 'market-ship',  label: { vi: 'Xuat thi truong', en: 'Market Ship' } },
      { id: 'cross-system', label: { vi: 'Lien he thong', en: 'Cross-System' } },
      { id: 'audit',        label: { vi: 'Nhat ky', en: 'Audit Trail' } },
      { id: 'signatures',   label: { vi: 'Chu ky & Tep', en: 'Signatures & Files' } }
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
      { label: { vi: 'Ma lo', en: 'Batch ID' },                value: r.batch_id, mono: true },
      { label: { vi: 'San pham', en: 'Product' },              value: r.product },
      { label: { vi: 'Kich thuoc lo', en: 'Lot Size' },        value: fmt(r.lot_size) },
      { label: { vi: 'Ngay san xuat', en: 'Mfg Date' },       value: fmtDate(r.mfg_date) },
      { label: { vi: 'Ngay xuat du kien', en: 'Target Ship' }, value: fmtDate(r.target_ship_date) },
      { label: { vi: 'Trang thai', en: 'Status' },             value: r.status, badge: true },
      { label: { vi: 'Loai xuat', en: 'Release Type' },        value: r.release_type, badge: true },
      { label: { vi: 'Diem den', en: 'Customer Destination' }, value: r.customer_destination },
      { label: { vi: 'So ngoai le', en: 'Exception Count' },   value: r.exception_count },
      { label: { vi: 'Nguoi tao', en: 'Created By' },          value: r.created_by },
      { label: { vi: 'Ngay tao', en: 'Created At' },           value: fmtDateTime(r.created_at) },
      { label: { vi: 'Cap nhat', en: 'Updated At' },           value: fmtDateTime(r.updated_at) }
    ]);
  }

  // ── Tab B: Release Package ──
  function renderTabReleasePackage(r) {
    var pkg = r.release_package || {};
    var html = '';

    // IQC Summary
    var iqc = pkg.iqc_summary || {};
    html += ui.renderSection({ vi: 'Tom tat IQC', en: 'IQC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Tong kiem tra', en: 'Total Inspected' },   value: fmt(iqc.total_inspected) },
        { label: { vi: 'Dat', en: 'Pass' },                        value: fmt(iqc.pass_count) },
        { label: { vi: 'Khong dat', en: 'Fail' },                  value: fmt(iqc.fail_count) },
        { label: { vi: 'Ket qua', en: 'Result' },                  value: iqc.result, badge: true }
      ])
    );

    // IPQC Summary
    var ipqc = pkg.ipqc_summary || {};
    html += ui.renderSection({ vi: 'Tom tat IPQC', en: 'IPQC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Tong kiem tra', en: 'Total Inspected' },   value: fmt(ipqc.total_inspected) },
        { label: { vi: 'Dat', en: 'Pass' },                        value: fmt(ipqc.pass_count) },
        { label: { vi: 'Khong dat', en: 'Fail' },                  value: fmt(ipqc.fail_count) },
        { label: { vi: 'Ket qua', en: 'Result' },                  value: ipqc.result, badge: true }
      ])
    );

    // SPC Summary
    var spc = pkg.spc_summary || {};
    html += ui.renderSection({ vi: 'Tom tat SPC', en: 'SPC Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Cpk trung binh', en: 'Avg Cpk' },             value: spc.avg_cpk != null ? Number(spc.avg_cpk).toFixed(2) : '—' },
        { label: { vi: 'Cpk thap nhat', en: 'Min Cpk' },              value: spc.min_cpk != null ? Number(spc.min_cpk).toFixed(2) : '—' },
        { label: { vi: 'Thong so ngoai kiem soat', en: 'Out of Control' }, value: fmt(spc.out_of_control_count) },
        { label: { vi: 'Danh gia', en: 'Assessment' },                 value: spc.assessment, badge: true }
      ])
    );

    // SPC Detail table
    if (spc.parameters && spc.parameters.length) {
      html += ui.renderDataGrid([
        { key: 'parameter',  label: { vi: 'Thong so', en: 'Parameter' } },
        { key: 'cpk',        label: { vi: 'Cpk', en: 'Cpk' },               type: 'number',
          render: function(v) { return cpkBadge(v); } },
        { key: 'mean',       label: { vi: 'Trung binh', en: 'Mean' },        type: 'number' },
        { key: 'std_dev',    label: { vi: 'Do lech chuan', en: 'Std Dev' },   type: 'number' },
        { key: 'in_control', label: { vi: 'Kiem soat', en: 'In Control' },
          render: function(v) { return v ? '<span class="eqms-badge pass">' + T({ vi: 'Co', en: 'Yes' }) + '</span>' : '<span class="eqms-badge fail">' + T({ vi: 'Khong', en: 'No' }) + '</span>'; } }
      ], spc.parameters, { selectable: false });
    }

    // Calibration Status
    var cal = pkg.calibration_status || {};
    html += ui.renderSection({ vi: 'Trang thai hieu chuan', en: 'Calibration Status' },
      ui.renderFieldGrid([
        { label: { vi: 'Tong thiet bi', en: 'Total Equipment' },     value: fmt(cal.total_equipment) },
        { label: { vi: 'Hieu luc', en: 'Valid' },                     value: fmt(cal.valid_count) },
        { label: { vi: 'Het han', en: 'Expired' },                    value: fmt(cal.expired_count) },
        { label: { vi: 'Trang thai', en: 'Status' },                  value: cal.status, badge: true }
      ])
    );

    // Deviations
    var devs = pkg.deviations || [];
    html += ui.renderSection({ vi: 'Sai lech', en: 'Deviations' },
      devs.length ? ui.renderDataGrid([
        { key: 'deviation_id', label: { vi: 'Ma', en: 'ID' },            type: 'id' },
        { key: 'title',        label: { vi: 'Tieu de', en: 'Title' } },
        { key: 'severity',     label: { vi: 'Muc do', en: 'Severity' },  type: 'badge' },
        { key: 'status',       label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
        { key: 'disposition',  label: { vi: 'Xu ly', en: 'Disposition' } }
      ], devs, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Khong co sai lech', en: 'No deviations' }) + '</div>'
    );

    // NCRs
    var ncrs = pkg.ncrs || [];
    html += ui.renderSection({ vi: 'Bao cao khong phu hop', en: 'NCRs' },
      ncrs.length ? ui.renderDataGrid([
        { key: 'ncr_id',   label: { vi: 'Ma NCR', en: 'NCR ID' },    type: 'id' },
        { key: 'title',    label: { vi: 'Tieu de', en: 'Title' } },
        { key: 'category', label: { vi: 'Phan loai', en: 'Category' }, type: 'badge' },
        { key: 'status',   label: { vi: 'Trang thai', en: 'Status' },  type: 'badge' },
        { key: 'resolution', label: { vi: 'Giai quyet', en: 'Resolution' } }
      ], ncrs, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Khong co NCR', en: 'No NCRs' }) + '</div>'
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
        title: { vi: 'Khong co ngoai le', en: 'No Exceptions' },
        desc: { vi: 'Tat ca du lieu chat luong dat yeu cau', en: 'All quality data meets requirements' }
      });
    }

    html += '<div class="eqms-section-desc">' + T({ vi: 'Xem xet va quyet dinh xu ly tung ngoai le truoc khi phe duyet xuat xuong.', en: 'Review and disposition each exception before release approval.' }) + '</div>';

    html += ui.renderDataGrid([
      { key: 'exception_id', label: { vi: 'Ma', en: 'ID' },                type: 'id' },
      { key: 'type',         label: { vi: 'Loai', en: 'Type' },            type: 'badge' },
      { key: 'source',       label: { vi: 'Nguon', en: 'Source' } },
      { key: 'description',  label: { vi: 'Mo ta', en: 'Description' },    type: 'truncate' },
      { key: 'severity',     label: { vi: 'Muc do', en: 'Severity' },
        render: function(v) { return riskBadge(v); } },
      { key: 'disposition',  label: { vi: 'Xu ly', en: 'Disposition' },
        render: function(v, row) {
          if (row.disposition_locked) return '<span class="eqms-badge">' + esc(v || '—') + '</span>';
          return '<select class="eqms-input sm" data-exception-id="' + esc(row.exception_id || '') + '" data-field="exception_disposition">' +
            '<option value="">' + T({ vi: '-- Chon --', en: '-- Select --' }) + '</option>' +
            DISPOSITION_OPTIONS.map(function(o) {
              var sel = (v === o.value) ? ' selected' : '';
              return '<option value="' + esc(o.value) + '"' + sel + '>' + esc(T(o.label)) + '</option>';
            }).join('') + '</select>';
        } },
      { key: 'justification', label: { vi: 'Ly do', en: 'Justification' },
        render: function(v, row) {
          if (row.disposition_locked) return esc(v || '—');
          return '<input class="eqms-input sm" type="text" data-exception-id="' + esc(row.exception_id || '') + '" data-field="exception_justification" value="' + esc(v || '') + '" placeholder="' + T({ vi: 'Ly do...', en: 'Justification...' }) + '">';
        } }
    ], exceptions, { selectable: false });

    // Bulk save button
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="save-exceptions">' + T({ vi: 'Luu xu ly ngoai le', en: 'Save Exception Dispositions' }) + '</button>';
    html += '</div>';

    return html;
  }

  // ── Tab D: Disposition Summary ──
  function renderTabDisposition(r) {
    var disp = r.disposition || {};
    var html = '';

    // Overall recommendation
    html += ui.renderSection({ vi: 'Khuyen nghi tong the', en: 'Overall Recommendation' },
      ui.renderFieldGrid([
        { label: { vi: 'Khuyen nghi', en: 'Recommendation' },             value: disp.recommendation, badge: true },
        { label: { vi: 'Muc do rui ro', en: 'Risk Level' },               value: disp.risk_level,
          render: function() { return riskBadge(disp.risk_level); } },
        { label: { vi: 'Nguoi de xuat', en: 'Recommended By' },           value: disp.recommended_by },
        { label: { vi: 'Ngay de xuat', en: 'Recommendation Date' },       value: fmtDateTime(disp.recommendation_date) }
      ])
    );

    // Evidence Summary
    html += ui.renderSection({ vi: 'Tom tat bang chung', en: 'Evidence Summary' },
      '<div class="eqms-evidence-text">' + esc(disp.evidence_summary || T({ vi: 'Chua co tom tat', en: 'No summary available' })) + '</div>'
    );

    // Risk Assessment
    html += ui.renderSection({ vi: 'Danh gia rui ro', en: 'Risk Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Rui ro chat luong', en: 'Quality Risk' },     value: disp.quality_risk,
          render: function() { return riskBadge(disp.quality_risk); } },
        { label: { vi: 'Rui ro an toan', en: 'Safety Risk' },         value: disp.safety_risk,
          render: function() { return riskBadge(disp.safety_risk); } },
        { label: { vi: 'Rui ro phap quy', en: 'Regulatory Risk' },    value: disp.regulatory_risk,
          render: function() { return riskBadge(disp.regulatory_risk); } },
        { label: { vi: 'Ghi chu rui ro', en: 'Risk Notes' },          value: disp.risk_notes }
      ])
    );

    // Quality Statement
    html += ui.renderSection({ vi: 'Tuyen bo chat luong', en: 'Quality Statement' },
      '<div class="eqms-quality-statement">' + esc(disp.quality_statement || T({ vi: 'Chua co tuyen bo', en: 'No statement available' })) + '</div>'
    );

    return html;
  }

  // ── Tab E: Market Ship Decision ──
  function renderTabMarketShip(r) {
    var ship = r.market_ship || {};
    var html = '';

    // Current decision status
    if (ship.decision) {
      html += ui.renderSection({ vi: 'Quyet dinh hien tai', en: 'Current Decision' },
        ui.renderFieldGrid([
          { label: { vi: 'Quyet dinh', en: 'Decision' },              value: ship.decision, badge: true },
          { label: { vi: 'Nguoi quyet dinh', en: 'Decided By' },      value: ship.decided_by },
          { label: { vi: 'Ngay quyet dinh', en: 'Decision Date' },    value: fmtDateTime(ship.decision_date) },
          { label: { vi: 'Ghi chu', en: 'Notes' },                     value: ship.decision_notes }
        ])
      );
    }

    // Decision form (if not yet decided or can override)
    if (!ship.decision || r.status === 'approved' || r.status === 'on_hold') {
      html += ui.renderSection({ vi: 'Quyet dinh xuat thi truong', en: 'Market Ship Decision' }, function() {
        var form = '';
        form += '<div class="eqms-decision-form" style="padding:16px">';

        // Decision select
        form += ui.renderFormField({
          key: 'ship_decision',
          label: { vi: 'Quyet dinh cuoi cung', en: 'Final Decision' },
          type: 'select',
          options: [
            { value: 'release',  label: { vi: 'Xuat xuong', en: 'Release to Market' } },
            { value: 'hold',     label: { vi: 'Tam giu', en: 'Hold' } },
            { value: 'reject',   label: { vi: 'Tu choi', en: 'Reject' } }
          ],
          required: true
        });

        // Notes
        form += ui.renderFormField({
          key: 'ship_notes',
          label: { vi: 'Ghi chu quyet dinh', en: 'Decision Notes' },
          type: 'textarea'
        });

        // Regulatory attestation
        form += '<div class="eqms-attestation" style="margin:16px 0;padding:12px;border:1px solid var(--hm-border,#e2e8f0);border-radius:8px;background:var(--hm-bg-subtle,#f8fafc)">';
        form += '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer">';
        form += '<input type="checkbox" data-field="regulatory_attestation" style="margin-top:3px">';
        form += '<span>' + T({ vi: 'Toi xac nhan rang lo hang nay da duoc xem xet day du theo cac yeu cau quy dinh ap dung va tat ca ho so chat luong da hoan chinh.', en: 'I attest that this batch has been thoroughly reviewed per applicable regulatory requirements and all quality records are complete.' }) + '</span>';
        form += '</label></div>';

        // E-signature
        form += ui.renderFormField({
          key: 'esignature_pin',
          label: { vi: 'Chu ky dien tu (PIN)', en: 'E-Signature (PIN)' },
          type: 'password',
          required: true
        });

        // Submit
        form += '<div style="text-align:right;margin-top:12px">';
        form += '<button class="eqms-btn primary" data-action="submit-market-ship">' + T({ vi: 'Ky va gui quyet dinh', en: 'Sign & Submit Decision' }) + '</button>';
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
    html += ui.renderSection({ vi: 'Lenh san xuat lien ket', en: 'Linked Work Orders' },
      wos.length ? ui.renderDataGrid([
        { key: 'wo_id',      label: { vi: 'Ma LSX', en: 'WO ID' },         type: 'id' },
        { key: 'product',    label: { vi: 'San pham', en: 'Product' } },
        { key: 'quantity',   label: { vi: 'So luong', en: 'Quantity' },     type: 'number' },
        { key: 'status',     label: { vi: 'Trang thai', en: 'Status' },     type: 'badge' },
        { key: 'completion', label: { vi: 'Hoan thanh', en: 'Completion' }, type: 'number' }
      ], wos, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Khong co LSX', en: 'No work orders' }) + '</div>'
    );

    // Linked Materials
    var mats = cross.materials || [];
    html += ui.renderSection({ vi: 'Nguyen vat lieu', en: 'Materials' },
      mats.length ? ui.renderDataGrid([
        { key: 'material_id',   label: { vi: 'Ma NVL', en: 'Material ID' },  type: 'id' },
        { key: 'material_name', label: { vi: 'Ten', en: 'Name' } },
        { key: 'lot_number',    label: { vi: 'So lo', en: 'Lot Number' } },
        { key: 'quantity_used', label: { vi: 'SL su dung', en: 'Qty Used' }, type: 'number' },
        { key: 'supplier',      label: { vi: 'NCC', en: 'Supplier' } }
      ], mats, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Khong co NVL', en: 'No materials' }) + '</div>'
    );

    // Genealogy
    var gen = cross.genealogy || [];
    html += ui.renderSection({ vi: 'Truy xuat nguon goc', en: 'Genealogy' },
      gen.length ? ui.renderDataGrid([
        { key: 'serial_number', label: { vi: 'So seri', en: 'Serial Number' },  type: 'id' },
        { key: 'component',     label: { vi: 'Linh kien', en: 'Component' } },
        { key: 'lot_number',    label: { vi: 'So lo', en: 'Lot Number' } },
        { key: 'parent',        label: { vi: 'Lo cha', en: 'Parent' } },
        { key: 'status',        label: { vi: 'Trang thai', en: 'Status' },       type: 'badge' }
      ], gen, { selectable: false }) : '<div class="eqms-empty-inline">' + T({ vi: 'Khong co du lieu', en: 'No genealogy data' }) + '</div>'
    );

    // ERP Sync
    var erp = cross.erp_sync || {};
    html += ui.renderSection({ vi: 'Dong bo ERP', en: 'ERP Sync' },
      ui.renderFieldGrid([
        { label: { vi: 'Trang thai dong bo', en: 'Sync Status' },       value: erp.sync_status, badge: true },
        { label: { vi: 'Dong bo luc', en: 'Last Synced' },              value: fmtDateTime(erp.last_synced_at) },
        { label: { vi: 'Ma ERP', en: 'ERP Reference' },                 value: erp.erp_reference, mono: true },
        { label: { vi: 'Ghi chu', en: 'Notes' },                        value: erp.notes }
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
      html += ui.renderSection({ vi: 'Ho so lien quan', en: 'Related Records' },
        ui.renderDataGrid([
          { key: 'record_type', label: { vi: 'Loai', en: 'Type' },       type: 'badge' },
          { key: 'record_id',   label: { vi: 'Ma', en: 'ID' },           type: 'id' },
          { key: 'title',       label: { vi: 'Tieu de', en: 'Title' } },
          { key: 'status',      label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
          { key: 'created_at',  label: { vi: 'Ngay tao', en: 'Created' }, type: 'date' }
        ], related, { selectable: false })
      );
    }

    // Audit trail
    html += ui.renderSection({ vi: 'Nhat ky kiem toan', en: 'Audit Trail' }, ui.renderAuditTrail(state.auditEvents));

    return html;
  }

  // ── Tab H: Signatures + Attachments + Comments ──
  function renderTabSignatures(r) {
    var html = '';

    // Signatures
    html += ui.renderSection({ vi: 'Chu ky', en: 'Signatures' }, ui.renderSignaturePanel(state.signatures, [
      { vi: 'Nguoi tao', en: 'Created By' },
      { vi: 'QC xem xet', en: 'QC Reviewed By' },
      { vi: 'QA phe duyet', en: 'QA Approved By' },
      { vi: 'Quan ly xuat xuong', en: 'Release Manager' }
    ]));

    // Attachments
    html += ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' }, ui.renderAttachmentsGrid(r.attachments || []));

    // Comments
    html += ui.renderSection({ vi: 'Binh luan', en: 'Comments' }, ui.renderCommentsThread(r.comments || []));

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
      { label: { vi: 'Thoi gian chu trinh TB', en: 'Avg Cycle Time' },    value: m.avg_cycle_time ? m.avg_cycle_time + ' ' + T({ vi: 'ngay', en: 'days' }) : '—', accent: 'info' },
      { label: { vi: 'Ty le ngoai le', en: 'Exception Rate' },            value: m.exception_rate ? m.exception_rate + '%' : '—',   accent: 'warning', trend: m.exception_trend },
      { label: { vi: 'Ty le tam giu', en: 'Hold Rate' },                  value: m.hold_rate ? m.hold_rate + '%' : '—',             accent: 'danger',  trend: m.hold_trend },
      { label: { vi: 'Ty le xuat lan 1', en: 'First-Pass Release' },      value: m.first_pass_rate ? m.first_pass_rate + '%' : '—', accent: 'success', trend: m.first_pass_trend }
    ]);

    // Release Cycle Time Trend
    html += ui.renderSection({ vi: 'Xu huong thoi gian chu trinh xuat', en: 'Release Cycle Time Trend' },
      ui.renderChartWithTableFallback('chart-cycle-time', null,
        [
          { key: 'period',     label: { vi: 'Thoi gian', en: 'Period' } },
          { key: 'avg_days',   label: { vi: 'TB (ngay)', en: 'Avg (days)' },  type: 'number' },
          { key: 'min_days',   label: { vi: 'Min (ngay)', en: 'Min (days)' }, type: 'number' },
          { key: 'max_days',   label: { vi: 'Max (ngay)', en: 'Max (days)' }, type: 'number' },
          { key: 'batch_count', label: { vi: 'So lo', en: 'Batches' },        type: 'number' }
        ],
        m.cycle_time_trend || []
      )
    );

    // Exception Rate by Product
    html += ui.renderSection({ vi: 'Ty le ngoai le theo san pham', en: 'Exception Rate by Product' },
      ui.renderChartWithTableFallback('chart-exception-product', null,
        [
          { key: 'product',          label: { vi: 'San pham', en: 'Product' } },
          { key: 'total_batches',    label: { vi: 'Tong lo', en: 'Total Batches' },    type: 'number' },
          { key: 'exception_batches', label: { vi: 'Lo co NL', en: 'With Exceptions' }, type: 'number' },
          { key: 'exception_rate',   label: { vi: 'Ty le %', en: 'Rate %' },            type: 'number' }
        ],
        m.exception_by_product || []
      )
    );

    // Hold Rate Trend
    html += ui.renderSection({ vi: 'Xu huong ty le tam giu', en: 'Hold Rate Trend' },
      ui.renderChartWithTableFallback('chart-hold-trend', null,
        [
          { key: 'period',      label: { vi: 'Thoi gian', en: 'Period' } },
          { key: 'total',       label: { vi: 'Tong', en: 'Total' },         type: 'number' },
          { key: 'hold_count',  label: { vi: 'Tam giu', en: 'On Hold' },   type: 'number' },
          { key: 'hold_rate',   label: { vi: 'Ty le %', en: 'Rate %' },    type: 'number' }
        ],
        m.hold_trend_data || []
      )
    );

    // First-Pass Release by Month
    html += ui.renderSection({ vi: 'Ty le xuat lan 1 theo thang', en: 'First-Pass Release Rate by Month' },
      ui.renderChartWithTableFallback('chart-first-pass', null,
        [
          { key: 'month',            label: { vi: 'Thang', en: 'Month' } },
          { key: 'total_released',   label: { vi: 'Tong xuat', en: 'Total Released' },   type: 'number' },
          { key: 'first_pass',       label: { vi: 'Lan 1', en: 'First Pass' },            type: 'number' },
          { key: 'first_pass_rate',  label: { vi: 'Ty le %', en: 'Rate %' },              type: 'number' }
        ],
        m.first_pass_trend_data || []
      )
    );

    // Top exceptions table
    html += ui.renderSection({ vi: 'Ngoai le pho bien', en: 'Top Exception Types' },
      ui.renderDataGrid([
        { key: 'exception_type',  label: { vi: 'Loai ngoai le', en: 'Exception Type' } },
        { key: 'occurrence',      label: { vi: 'So lan', en: 'Occurrences' },             type: 'number' },
        { key: 'pct_of_total',    label: { vi: '% tong', en: '% of Total' },               type: 'number' },
        { key: 'avg_resolution',  label: { vi: 'TB xu ly (ngay)', en: 'Avg Resolution (days)' }, type: 'number' }
      ], m.top_exceptions || [], { selectable: false })
    );

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE FORM
  // ═══════════════════════════════════════════════════════════════════════
  function renderCreateBatchForm() {
    var body = '';
    body += ui.renderFormField({ key: 'batch_id', label: { vi: 'Ma lo', en: 'Batch/Lot ID' }, required: true });
    body += ui.renderFormField({ key: 'product', label: { vi: 'San pham', en: 'Product' }, required: true });
    body += ui.renderFormField({ key: 'lot_size', label: { vi: 'Kich thuoc lo', en: 'Lot Size' }, type: 'number', min: 1, required: true });
    body += ui.renderFormField({ key: 'mfg_date', label: { vi: 'Ngay san xuat', en: 'Mfg Date' }, type: 'date', required: true });
    body += ui.renderFormField({ key: 'target_ship_date', label: { vi: 'Ngay xuat du kien', en: 'Target Ship Date' }, type: 'date', required: true });
    body += ui.renderFormField({ key: 'release_type', label: { vi: 'Loai xuat', en: 'Release Type' }, type: 'select', options: BR_RELEASE_TYPES, required: true });
    body += ui.renderFormField({ key: 'customer_destination', label: { vi: 'Diem den', en: 'Customer Destination' } });
    return ui.renderWizardShell([
      { label: { vi: 'Thong tin lo', en: 'Batch Info' } },
      { label: { vi: 'Xem xet', en: 'Review' } }
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
          showModal({ vi: 'Tao lo moi', en: 'New Batch Release' }, renderCreateBatchForm()); break;

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
      toast(T({ vi: 'Da tao lo thanh cong', en: 'Batch created successfully' }));
      loadRegister();
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleWorkflowAction(action) {
    if (!state.record) return;
    var id = state.record.id || state.record.batch_id;
    var endpoint = 'eqms_batch_release_action_' + action.replace(/-/g, '_');
    apiCall(endpoint, { id: id }).then(function() {
      toast(T({ vi: 'Cap nhat thanh cong', en: 'Updated successfully' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
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
      toast(T({ vi: 'Da luu xu ly ngoai le', en: 'Exception dispositions saved' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleMarketShipDecision() {
    if (!state.record || !container) return;
    var id = state.record.id || state.record.batch_id;
    var form = container.querySelector('.eqms-decision-form');
    if (!form) return;
    var data = collectForm(form);

    // Validate attestation
    if (!data.regulatory_attestation) {
      toast(T({ vi: 'Vui long xac nhan chung nhan phap quy', en: 'Please confirm regulatory attestation' }));
      return;
    }
    // Validate PIN
    if (!data.esignature_pin) {
      toast(T({ vi: 'Vui long nhap PIN chu ky dien tu', en: 'Please enter e-signature PIN' }));
      return;
    }

    apiCall('eqms_batch_release_action_market_ship', {
      id: id,
      decision: data.ship_decision,
      notes: data.ship_notes,
      regulatory_attestation: data.regulatory_attestation,
      esignature_pin: data.esignature_pin
    }).then(function() {
      toast(T({ vi: 'Quyet dinh da duoc ky va gui', en: 'Decision signed and submitted' }));
      loadWorkspace(id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleExport(format) {
    var params = Object.assign({}, state.filters, { format: format });
    apiCall('eqms_batch_release_export', params, 'GET').then(function(r) {
      if (r && r.url) window.open(r.url, '_blank');
      else toast(T({ vi: 'Da yeu cau xuat', en: 'Export requested' }));
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

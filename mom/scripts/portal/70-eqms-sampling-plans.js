/**
 * EQMS Sampling Plans — ANSI/ASQ Z1.4 / Z1.9 AQL-Based Inspection
 * HESEM MOM Portal - 70-eqms-sampling-plans.js
 *
 * Archetype: approval-workflow with lookup utility
 * Depends: 40-eqms-shell.js
 *
 * @since 4.1.0
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
  var apiCall     = util.apiCall;

  var MOD = {
    id:        'sampling-plans',
    version:   '1.0.0',
    archetype: 'approval-workflow',
    label:     { vi: 'Kế hoạch lấy mẫu (AQL)', en: 'Sampling Plans (AQL)' },
    icon:      '\uD83D\uDCCB'
  };

  var WORKFLOW_STATES = ['draft','submitted','under_review','approved','rejected','obsolete'];

  var STATE_LABELS = {
    draft:        { vi: 'Nháp',             en: 'Draft' },
    submitted:    { vi: 'Chờ phê duyệt',   en: 'Submitted for Approval' },
    under_review: { vi: 'Đang xem xét',    en: 'Under Review' },
    approved:     { vi: 'Đã phê duyệt',    en: 'Approved' },
    rejected:     { vi: 'Từ chối',         en: 'Rejected' },
    obsolete:     { vi: 'Lỗi thời',        en: 'Obsolete' }
  };

  var PLAN_TYPE_OPTIONS = [
    { value: 'receiving',   label: { vi: 'Kiểm tra đầu vào',    en: 'Receiving Inspection' } },
    { value: 'in_process',  label: { vi: 'Kiểm tra trong quá trình', en: 'In-Process Inspection' } },
    { value: 'final',       label: { vi: 'Kiểm tra thành phẩm', en: 'Final Inspection' } },
    { value: 'outgoing',    label: { vi: 'Kiểm tra xuất xưởng', en: 'Outgoing Inspection' } },
    { value: 'skip_lot',    label: { vi: 'Lấy mẫu bỏ qua lô',  en: 'Skip-Lot Inspection' } }
  ];

  var STANDARD_OPTIONS = [
    { value: 'ANSI_Z1_4',   label: { en: 'ANSI/ASQ Z1.4 (Attributes)' } },
    { value: 'ANSI_Z1_9',   label: { en: 'ANSI/ASQ Z1.9 (Variables)' } },
    { value: 'ISO_2859_1',  label: { en: 'ISO 2859-1 (Attributes)' } },
    { value: 'ISO_3951_1',  label: { en: 'ISO 3951-1 (Variables)' } },
    { value: 'custom',      label: { vi: 'Tùy chỉnh', en: 'Custom' } }
  ];

  var INSPECTION_LEVEL_OPTIONS = [
    { value: 'I',       label: { en: 'Level I (Reduced)' } },
    { value: 'II',      label: { en: 'Level II (Normal)' } },
    { value: 'III',     label: { en: 'Level III (Tightened)' } },
    { value: 'S1',      label: { en: 'Special S-1' } },
    { value: 'S2',      label: { en: 'Special S-2' } },
    { value: 'S3',      label: { en: 'Special S-3' } },
    { value: 'S4',      label: { en: 'Special S-4' } }
  ];

  var AQL_OPTIONS = [
    { value: '0.010', label: 'AQL 0.010%' }, { value: '0.015', label: 'AQL 0.015%' },
    { value: '0.025', label: 'AQL 0.025%' }, { value: '0.040', label: 'AQL 0.040%' },
    { value: '0.065', label: 'AQL 0.065%' }, { value: '0.10',  label: 'AQL 0.10%'  },
    { value: '0.15',  label: 'AQL 0.15%'  }, { value: '0.25',  label: 'AQL 0.25%'  },
    { value: '0.40',  label: 'AQL 0.40%'  }, { value: '0.65',  label: 'AQL 0.65%'  },
    { value: '1.0',   label: 'AQL 1.0%'   }, { value: '1.5',   label: 'AQL 1.5%'   },
    { value: '2.5',   label: 'AQL 2.5%'   }, { value: '4.0',   label: 'AQL 4.0%'   },
    { value: '6.5',   label: 'AQL 6.5%'   }, { value: '10.0',  label: 'AQL 10.0%'  }
  ];

  var STATE_ACTIONS = {
    draft:        [{ action: 'submit',           label: { vi: 'Nộp phê duyệt',  en: 'Submit for Approval' },  style: 'primary' }],
    submitted:    [
      { action: 'start-review', label: { vi: 'Bắt đầu xem xét', en: 'Start Review' },  style: 'primary' },
      { action: 'reject',       label: { vi: 'Từ chối',         en: 'Reject' },          style: 'danger'  }
    ],
    under_review: [
      { action: 'approve',          label: { vi: 'Phê duyệt',     en: 'Approve' },          style: 'success' },
      { action: 'reject',           label: { vi: 'Từ chối',       en: 'Reject' },            style: 'danger'  },
      { action: 'request-revision', label: { vi: 'Yêu cầu sửa', en: 'Request Revision' },  style: 'warning' }
    ],
    approved:     [{ action: 'obsolete', label: { vi: 'Đánh dấu lỗi thời', en: 'Mark Obsolete' }, style: 'ghost' }],
    rejected:     [{ action: 'revise',   label: { vi: 'Chỉnh sửa lại',    en: 'Revise' },          style: 'primary' }]
  };

  var DETAIL_TABS = [
    { id: 'summary',     label: { vi: 'Tóm tắt',         en: 'Summary' } },
    { id: 'parameters',  label: { vi: 'Thông số AQL',    en: 'AQL Parameters' } },
    { id: 'skip_lot',    label: { vi: 'Skip-Lot',        en: 'Skip-Lot Rules' } },
    { id: 'lookup',      label: { vi: 'Tra cứu kế hoạch', en: 'Plan Lookup' } },
    { id: 'audit',       label: { vi: 'Nhật ký',         en: 'Audit Trail' } },
    { id: 'attachments', label: { vi: 'Đính kèm',        en: 'Attachments' } },
    { id: 'comments',    label: { vi: 'Bình luận',       en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin kế hoạch', en: 'Plan Information' } },
    { label: { vi: 'Thông số lấy mẫu',  en: 'Sampling Parameters' } },
    { label: { vi: 'Skip-Lot & Ngưỡng', en: 'Skip-Lot & Thresholds' } },
    { label: { vi: 'Xem lại & Gửi',     en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'created_at', sortDir: 'desc',
    page: 1, pageSize: 25, items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null, activeTab: 'summary', tabData: {},
    wizardStep: 0, wizardData: {}, wizardErrors: {},
    metrics: null,
    lookupForm: { part_number: '', vendor_id: '', plan_type: 'receiving', result: null, loading: false, error: null }
  };

  var _container = null;

  // ─── Public API ──────────────────────────────────────────────────────────────

  function render(container, context) {
    context = context || {};
    if (context.recordId) { state.screen = 'detail'; state.recordId = context.recordId; }
    _container = container;
    renderScreen();
  }

  function renderScreen() {
    if (!_container) return;
    var html = '<div class="eqms-module eqms-sampling-plans">';
    html += renderToolbar();
    switch (state.screen) {
      case 'queue':     html += renderQueueView(); break;
      case 'detail':    html += renderDetailView(); break;
      case 'create':    html += renderCreateView(); break;
      case 'analytics': html += renderAnalyticsView(); break;
    }
    html += '</div>';
    _container.innerHTML = html;
    bindEvents();
    if (state.screen === 'queue' && !state.loaded && !state.loading) loadQueue();
    if (state.screen === 'detail' && state.recordId && !state.record) loadDetail(state.recordId);
    if (state.screen === 'analytics' && !state.metrics) loadMetrics();
  }

  // ─── Toolbar ─────────────────────────────────────────────────────────────────

  function renderToolbar() {
    var screens = [
      { id: 'queue',     label: { vi: 'Danh sách', en: 'Plans' },    icon: '\uD83D\uDCCB' },
      { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }
    ];
    var html = '<div class="eqms-module-toolbar"><div class="eqms-module-toolbar-left">';
    screens.forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo kế hoạch', en: 'New Plan' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  // ─── Queue View ──────────────────────────────────────────────────────────────

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status',           type: 'select', label: { vi: 'Trạng thái', en: 'Status' },
          options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'plan_type',        type: 'select', label: { vi: 'Loại kế hoạch', en: 'Plan Type' }, options: PLAN_TYPE_OPTIONS },
        { key: 'standard',         type: 'select', label: { vi: 'Tiêu chuẩn', en: 'Standard' }, options: STANDARD_OPTIONS },
        { key: 'inspection_level', type: 'select', label: { vi: 'Cấp kiểm tra', en: 'Inspection Level' }, options: INSPECTION_LEVEL_OPTIONS },
        { key: 'search',           type: 'text',   label: { vi: 'Tìm kiếm', en: 'Search' },
          placeholder: { vi: 'Số kế hoạch, mã vật tư, nhà cung cấp...', en: 'Plan #, part number, supplier...' }, width: '240px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải kế hoạch lấy mẫu...', en: 'Loading sampling plans...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'plan_number', type: 'id', label: { vi: 'Mã kế hoạch', en: 'Plan #' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.plan_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'plan_name',        label: { vi: 'Tên kế hoạch', en: 'Plan Name' }, type: 'truncate' },
        { key: 'plan_type',        label: { vi: 'Loại', en: 'Type' },     type: 'badge' },
        { key: 'standard',         label: { vi: 'Tiêu chuẩn', en: 'Standard' } },
        { key: 'inspection_level', label: { vi: 'Cấp kiểm tra', en: 'Level' } },
        { key: 'aql_major',        label: { vi: 'AQL Lớn', en: 'AQL Major' },
          render: function(val) { return val != null ? esc(String(val)) + '%' : '\u2014'; } },
        { key: 'aql_minor',        label: { vi: 'AQL Nhỏ', en: 'AQL Minor' },
          render: function(val) { return val != null ? esc(String(val)) + '%' : '\u2014'; } },
        { key: 'sample_size',      label: { vi: 'Cỡ mẫu', en: 'Sample Size' } },
        { key: 'accept_number',    label: { vi: 'Chấp nhận (Ac)', en: 'Accept (Ac)' } },
        { key: 'reject_number',    label: { vi: 'Từ chối (Re)', en: 'Reject (Re)' } },
        { key: 'effective_date',   label: { vi: 'Hiệu lực từ', en: 'Effective Date' }, type: 'date' },
        { key: 'status',           label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  // ─── Detail View ─────────────────────────────────────────────────────────────

  function renderDetailView() {
    if (!state.record) {
      return state.loading
        ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' })
        : ui.renderEmptyState({ icon: '\uD83D\uDCCB', title: { vi: 'Không tìm thấy kế hoạch', en: 'Plan not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.plan_number, title: r.plan_name,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      meta: [
        { label: { vi: 'Loại kế hoạch', en: 'Plan Type' }, value: r.plan_type },
        { label: { vi: 'Tiêu chuẩn', en: 'Standard' }, value: r.standard },
        { label: { vi: 'Cấp kiểm tra', en: 'Inspection Level' }, value: r.inspection_level },
        { label: { vi: 'Hiệu lực từ', en: 'Effective Date' }, value: fmtDate(r.effective_date) }
      ]
    });
    var actions = STATE_ACTIONS[r.status] || [];
    if (actions.length) {
      html += '<div class="eqms-detail-actions">';
      actions.forEach(function(a) {
        html += '<button class="eqms-btn ' + esc(a.style) + ' sm" data-action="workflow-action" data-workflow="' + esc(a.action) + '">' + esc(T(a.label)) + '</button>';
      });
      html += '</div>';
    }
    html += ui.renderTabStrip(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">';
    switch (state.activeTab) {
      case 'summary':    html += renderSummaryTab(r); break;
      case 'parameters': html += renderParametersTab(r); break;
      case 'skip_lot':   html += renderSkipLotTab(r); break;
      case 'lookup':     html += renderLookupTab(); break;
      case 'audit':      html += renderAuditTab(); break;
      case 'attachments': html += renderAttachmentsTab(); break;
      case 'comments':   html += renderCommentsTab(); break;
      default:           html += '<p>' + T({ vi: 'Tab không xác định', en: 'Unknown tab' }) + '</p>';
    }
    html += '</div></div>';
    return html;
  }

  function renderSummaryTab(r) {
    var fields = [
      { label: { vi: 'Mã kế hoạch', en: 'Plan Number' },       value: r.plan_number },
      { label: { vi: 'Tên kế hoạch', en: 'Plan Name' },        value: r.plan_name },
      { label: { vi: 'Loại kế hoạch', en: 'Plan Type' },       value: r.plan_type },
      { label: { vi: 'Tiêu chuẩn áp dụng', en: 'Standard' },  value: r.standard },
      { label: { vi: 'Cấp kiểm tra', en: 'Inspection Level' }, value: r.inspection_level },
      { label: { vi: 'Mã vật tư', en: 'Part Number' },         value: r.part_number || '\u2014' },
      { label: { vi: 'Nhà cung cấp', en: 'Supplier' },         value: r.supplier_name || r.vendor_id || '\u2014' },
      { label: { vi: 'Ngày hiệu lực', en: 'Effective Date' },  value: fmtDate(r.effective_date) },
      { label: { vi: 'Ngày hết hạn', en: 'Expiry Date' },      value: r.expiry_date ? fmtDate(r.expiry_date) : '\u2014' },
      { label: { vi: 'Phiên bản', en: 'Version' },             value: r.version },
      { label: { vi: 'Phê duyệt bởi', en: 'Approved By' },    value: r.approved_by_name || '\u2014' },
      { label: { vi: 'Ngày phê duyệt', en: 'Approval Date' }, value: r.approved_at ? fmtDate(r.approved_at) : '\u2014' }
    ];
    var html = ui.renderFieldGrid(fields);
    if (r.description) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Mô tả', en: 'Description' }) + '</h4>';
      html += '<p style="white-space:pre-wrap">' + esc(r.description) + '</p></div>';
    }
    if (r.scope) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Phạm vi áp dụng', en: 'Scope of Application' }) + '</h4>';
      html += '<p style="white-space:pre-wrap">' + esc(r.scope) + '</p></div>';
    }
    return html;
  }

  function renderParametersTab(r) {
    var html = '<div class="eqms-detail-section">';
    html += '<h4>' + T({ vi: 'Ngưỡng AQL', en: 'AQL Thresholds' }) + '</h4>';
    html += '<table class="eqms-data-table" style="max-width:500px">';
    html += '<thead><tr><th>' + T({ vi: 'Loại lỗi', en: 'Defect Class' }) + '</th><th>AQL (%)</th></tr></thead><tbody>';
    [
      { key: 'aql_critical', label: { vi: 'Lỗi nghiêm trọng (Critical)', en: 'Critical' } },
      { key: 'aql_major',    label: { vi: 'Lỗi lớn (Major)', en: 'Major' } },
      { key: 'aql_minor',    label: { vi: 'Lỗi nhỏ (Minor)', en: 'Minor' } }
    ].forEach(function(row) {
      var val = r[row.key];
      var display = val != null ? esc(String(val)) + '%' : '\u2014';
      var color = row.key === 'aql_critical' ? 'var(--color-danger)' : row.key === 'aql_major' ? 'var(--color-warning)' : 'inherit';
      html += '<tr><td style="color:' + color + '">' + T(row.label) + '</td><td><strong>' + display + '</strong></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="eqms-detail-section">';
    html += '<h4>' + T({ vi: 'Thông số kế hoạch lấy mẫu', en: 'Sampling Plan Parameters' }) + '</h4>';
    html += '<table class="eqms-data-table" style="max-width:600px">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Cỡ lô (N)', en: 'Lot Size (N)' }) + '</th>';
    html += '<th>' + T({ vi: 'Cỡ mẫu (n)', en: 'Sample Size (n)' }) + '</th>';
    html += '<th>' + T({ vi: 'Chấp nhận (Ac)', en: 'Accept (Ac)' }) + '</th>';
    html += '<th>' + T({ vi: 'Từ chối (Re)', en: 'Reject (Re)' }) + '</th>';
    html += '</tr></thead><tbody>';
    html += '<tr>';
    html += '<td>' + esc(r.lot_size_min != null ? String(r.lot_size_min) + (r.lot_size_max != null ? ' – ' + String(r.lot_size_max) : '+') : '\u2014') + '</td>';
    html += '<td><strong>' + esc(r.sample_size != null ? String(r.sample_size) : '\u2014') + '</strong></td>';
    html += '<td><span style="color:var(--color-success)">' + esc(r.accept_number != null ? String(r.accept_number) : '\u2014') + '</span></td>';
    html += '<td><span style="color:var(--color-danger)">' + esc(r.reject_number != null ? String(r.reject_number) : '\u2014') + '</span></td>';
    html += '</tr>';
    html += '</tbody></table></div>';

    if (r.sampling_procedure) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Quy trình lấy mẫu', en: 'Sampling Procedure' }) + '</h4>';
      html += '<p style="white-space:pre-wrap">' + esc(r.sampling_procedure) + '</p></div>';
    }
    return html;
  }

  function renderSkipLotTab(r) {
    var html = '<div class="eqms-detail-section">';
    html += '<h4>' + T({ vi: 'Cấu hình Skip-Lot', en: 'Skip-Lot Configuration' }) + '</h4>';

    var skipEnabled = r.skip_lot_enabled === true || r.skip_lot_enabled === 't' || r.skip_lot_enabled === 1;
    html += '<p>';
    html += '<strong>' + T({ vi: 'Trạng thái Skip-Lot:', en: 'Skip-Lot Status:' }) + '</strong> ';
    html += skipEnabled
      ? '<span style="color:var(--color-success)">' + T({ vi: 'Đã bật', en: 'Enabled' }) + '</span>'
      : '<span style="color:var(--color-muted)">' + T({ vi: 'Không áp dụng', en: 'Not Applicable' }) + '</span>';
    html += '</p>';

    if (skipEnabled) {
      var rows = [
        { label: { vi: 'Số lần từ chối kích hoạt siết chặt (Tightened Trigger)', en: 'Tightened Trigger (Rejects)' }, value: r.tightened_trigger_rejects },
        { label: { vi: 'Số lần chấp nhận để chuyển sang giảm (Reduced Trigger)', en: 'Reduced Trigger (Accepts)' }, value: r.reduced_trigger_accepts },
        { label: { vi: 'Số lần chấp nhận để áp dụng Skip-Lot', en: 'Skip-Lot Trigger (Accepts)' }, value: r.skip_lot_trigger_accepts },
        { label: { vi: 'Tần suất Skip-Lot (1 trong N lô)', en: 'Skip Frequency (1 in N lots)' }, value: r.skip_lot_frequency }
      ];
      html += '<table class="eqms-data-table" style="max-width:520px"><tbody>';
      rows.forEach(function(row) {
        html += '<tr><td>' + T(row.label) + '</td><td><strong>' + esc(row.value != null ? String(row.value) : '\u2014') + '</strong></td></tr>';
      });
      html += '</tbody></table>';

      html += '<div style="margin-top:16px;padding:12px;background:var(--color-info-bg,#e8f4fd);border-radius:6px;font-size:13px">';
      html += '<strong>' + T({ vi: 'Giải thích trình tự chuyển đổi (ANSI/ASQ Z1.4):', en: 'Switching Rules (ANSI/ASQ Z1.4):' }) + '</strong><br>';
      html += T({ vi: 'Normal → Tightened: khi có ≥ Tightened Trigger lần từ chối.', en: 'Normal → Tightened: when ≥ Tightened Trigger rejects occur.' }) + '<br>';
      html += T({ vi: 'Tightened → Normal: khi có ≥ Reduced Trigger lần chấp nhận liên tiếp.', en: 'Tightened → Normal: after ≥ Reduced Trigger consecutive accepts.' }) + '<br>';
      html += T({ vi: 'Normal → Reduced: khi có ≥ Skip-Lot Trigger lần chấp nhận liên tiếp.', en: 'Normal → Reduced/Skip-Lot: after ≥ Skip-Lot Trigger consecutive accepts.' });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderLookupTab() {
    var lf = state.lookupForm;
    var html = '<div class="eqms-detail-section">';
    html += '<h4>' + T({ vi: 'Tra cứu kế hoạch theo vật tư / nhà cung cấp', en: 'Lookup Active Plan for Part / Supplier' }) + '</h4>';
    html += '<div class="eqms-inline-form" style="max-width:520px">';
    html += '<div class="eqms-field-row">';
    html += '<label>' + T({ vi: 'Mã vật tư', en: 'Part Number' }) + '</label>';
    html += '<input type="text" class="eqms-input" data-lookup="part_number" value="' + esc(lf.part_number) + '" placeholder="' + T({ vi: 'Nhập mã vật tư', en: 'Enter part number' }) + '">';
    html += '</div>';
    html += '<div class="eqms-field-row">';
    html += '<label>' + T({ vi: 'Nhà cung cấp (tuỳ chọn)', en: 'Supplier (optional)' }) + '</label>';
    html += '<input type="text" class="eqms-input" data-lookup="vendor_id" value="' + esc(lf.vendor_id) + '" placeholder="' + T({ vi: 'Mã hoặc tên nhà cung cấp', en: 'Vendor ID or name' }) + '">';
    html += '</div>';
    html += '<div class="eqms-field-row">';
    html += '<label>' + T({ vi: 'Loại kiểm tra', en: 'Inspection Type' }) + '</label>';
    html += '<select class="eqms-input" data-lookup="plan_type">';
    PLAN_TYPE_OPTIONS.forEach(function(opt) {
      html += '<option value="' + esc(opt.value) + '"' + (lf.plan_type === opt.value ? ' selected' : '') + '>' + esc(T(opt.label)) + '</option>';
    });
    html += '</select>';
    html += '</div>';
    html += '<button class="eqms-btn primary sm" data-action="run-lookup"' + (lf.loading ? ' disabled' : '') + '>';
    html += lf.loading ? T({ vi: 'Đang tra cứu...', en: 'Looking up...' }) : T({ vi: 'Tra cứu', en: 'Look Up' });
    html += '</button>';
    html += '</div>';

    if (lf.error) {
      html += '<div class="eqms-alert danger" style="margin-top:12px">' + esc(lf.error) + '</div>';
    }
    if (lf.result) {
      var res = lf.result;
      if (res.found) {
        var p = res.plan;
        html += '<div class="eqms-alert success" style="margin-top:16px">';
        html += '<strong>\u2705 ' + T({ vi: 'Tìm thấy kế hoạch đang hiệu lực:', en: 'Active plan found:' }) + '</strong><br>';
        html += T({ vi: 'Mã kế hoạch:', en: 'Plan:' }) + ' <strong>' + esc(p.plan_number) + ' — ' + esc(p.plan_name) + '</strong><br>';
        html += T({ vi: 'Tiêu chuẩn:', en: 'Standard:' }) + ' ' + esc(p.standard) + ' | ';
        html += T({ vi: 'Cấp:', en: 'Level:' }) + ' ' + esc(p.inspection_level) + '<br>';
        html += T({ vi: 'Cỡ mẫu (n):', en: 'Sample size (n):' }) + ' <strong>' + esc(String(p.sample_size)) + '</strong> | ';
        html += 'Ac = <strong>' + esc(String(p.accept_number)) + '</strong>, Re = <strong>' + esc(String(p.reject_number)) + '</strong><br>';
        html += 'AQL Major: <strong>' + (p.aql_major != null ? esc(String(p.aql_major)) + '%' : '\u2014') + '</strong> | ';
        html += 'AQL Minor: <strong>' + (p.aql_minor != null ? esc(String(p.aql_minor)) + '%' : '\u2014') + '</strong>';
        html += '</div>';
        html += '<div style="margin-top:8px"><a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(String(p.plan_id)) + '">' + T({ vi: 'Xem chi tiết kế hoạch \u2192', en: 'View full plan \u2192' }) + '</a></div>';
      } else {
        html += '<div class="eqms-alert warning" style="margin-top:16px">';
        html += '\u26A0\uFE0F ' + T({ vi: 'Không tìm thấy kế hoạch đang hiệu lực cho vật tư / nhà cung cấp này.', en: 'No active approved plan found for this part / supplier combination.' });
        html += '</div>';
      }
    }
    html += '</div>';
    return html;
  }

  function renderAuditTab() {
    var td = state.tabData;
    if (!td['_auditLoaded']) {
      if (!td['_auditLoading']) loadTabData('audit');
      return ui.renderLoadingState({ vi: 'Đang tải nhật ký...', en: 'Loading audit trail...' });
    }
    return ui.renderAuditTrail ? ui.renderAuditTrail(td['audit'] || []) : '<p>' + T({ vi: 'Nhật ký kiểm toán', en: 'Audit trail' }) + '</p>';
  }

  function renderAttachmentsTab() {
    var td = state.tabData;
    if (!td['_attachmentsLoaded']) {
      if (!td['_attachmentsLoading']) loadTabData('attachments');
      return ui.renderLoadingState({ vi: 'Đang tải tệp đính kèm...', en: 'Loading attachments...' });
    }
    return ui.renderAttachmentList ? ui.renderAttachmentList(td['attachments'] || [], { recordId: state.recordId, module: 'sampling_plans' }) : '<p>' + T({ vi: 'Tệp đính kèm', en: 'Attachments' }) + '</p>';
  }

  function renderCommentsTab() {
    var td = state.tabData;
    if (!td['_commentsLoaded']) {
      if (!td['_commentsLoading']) loadTabData('comments');
      return ui.renderLoadingState({ vi: 'Đang tải bình luận...', en: 'Loading comments...' });
    }
    return ui.renderCommentThread ? ui.renderCommentThread(td['comments'] || [], { recordId: state.recordId, module: 'sampling_plans' }) : '<p>' + T({ vi: 'Bình luận', en: 'Comments' }) + '</p>';
  }

  // ─── Create / Wizard View ────────────────────────────────────────────────────

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h3>' + T({ vi: 'Tạo kế hoạch lấy mẫu mới', en: 'New Sampling Plan' }) + '</h3>';
    html += ui.renderWizardSteps(WIZARD_STEPS, state.wizardStep);
    switch (state.wizardStep) {
      case 0: html += renderWizardStep0(); break;
      case 1: html += renderWizardStep1(); break;
      case 2: html += renderWizardStep2(); break;
      case 3: html += renderWizardStep3(); break;
    }
    html += '</div>';
    return html;
  }

  function renderWizardStep0() {
    var d = state.wizardData;
    var e = state.wizardErrors;
    var html = '<div class="eqms-wizard-step">';
    html += '<h4>' + T(WIZARD_STEPS[0].label) + '</h4>';
    html += ui.renderWizardField({ key: 'plan_name', label: { vi: 'Tên kế hoạch *', en: 'Plan Name *' }, type: 'text', value: d.plan_name, error: e.plan_name });
    html += ui.renderWizardSelect({ key: 'plan_type', label: { vi: 'Loại kế hoạch *', en: 'Plan Type *' }, options: PLAN_TYPE_OPTIONS, value: d.plan_type, error: e.plan_type });
    html += ui.renderWizardSelect({ key: 'standard', label: { vi: 'Tiêu chuẩn *', en: 'Standard *' }, options: STANDARD_OPTIONS, value: d.standard, error: e.standard });
    html += ui.renderWizardSelect({ key: 'inspection_level', label: { vi: 'Cấp kiểm tra *', en: 'Inspection Level *' }, options: INSPECTION_LEVEL_OPTIONS, value: d.inspection_level, error: e.inspection_level });
    html += ui.renderWizardField({ key: 'part_number', label: { vi: 'Mã vật tư (tuỳ chọn)', en: 'Part Number (optional)' }, type: 'text', value: d.part_number });
    html += ui.renderWizardField({ key: 'vendor_id', label: { vi: 'Nhà cung cấp (tuỳ chọn)', en: 'Supplier (optional)' }, type: 'text', value: d.vendor_id });
    html += ui.renderWizardField({ key: 'effective_date', label: { vi: 'Ngày hiệu lực *', en: 'Effective Date *' }, type: 'date', value: d.effective_date, error: e.effective_date });
    html += ui.renderWizardField({ key: 'expiry_date', label: { vi: 'Ngày hết hạn (tuỳ chọn)', en: 'Expiry Date (optional)' }, type: 'date', value: d.expiry_date });
    html += ui.renderWizardTextarea({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, value: d.description, rows: 3 });
    html += ui.renderWizardTextarea({ key: 'scope', label: { vi: 'Phạm vi áp dụng', en: 'Scope of Application' }, value: d.scope, rows: 3 });
    html += renderWizardNav(0);
    html += '</div>';
    return html;
  }

  function renderWizardStep1() {
    var d = state.wizardData;
    var e = state.wizardErrors;
    var html = '<div class="eqms-wizard-step">';
    html += '<h4>' + T(WIZARD_STEPS[1].label) + '</h4>';
    html += '<p style="color:var(--color-muted);font-size:13px">' + T({ vi: 'Nhập thông số AQL theo tiêu chuẩn đã chọn. Giá trị AQL = 0 có nghĩa là Zero Acceptance (Ac = 0).', en: 'Enter AQL values per selected standard. AQL = 0 means Zero Acceptance (Ac = 0).' }) + '</p>';
    html += ui.renderWizardSelect({ key: 'aql_critical', label: { vi: 'AQL – Lỗi nghiêm trọng (Critical)', en: 'AQL – Critical Defects' }, options: [{ value: '0', label: 'Zero Acceptance (0)' }].concat(AQL_OPTIONS), value: d.aql_critical });
    html += ui.renderWizardSelect({ key: 'aql_major',    label: { vi: 'AQL – Lỗi lớn (Major) *', en: 'AQL – Major Defects *' }, options: AQL_OPTIONS, value: d.aql_major, error: e.aql_major });
    html += ui.renderWizardSelect({ key: 'aql_minor',    label: { vi: 'AQL – Lỗi nhỏ (Minor)', en: 'AQL – Minor Defects' }, options: AQL_OPTIONS, value: d.aql_minor });
    html += ui.renderWizardField({ key: 'lot_size_min', label: { vi: 'Cỡ lô tối thiểu (N min)', en: 'Min Lot Size (N min)' }, type: 'number', value: d.lot_size_min });
    html += ui.renderWizardField({ key: 'lot_size_max', label: { vi: 'Cỡ lô tối đa (N max)', en: 'Max Lot Size (N max)' }, type: 'number', value: d.lot_size_max });
    html += ui.renderWizardField({ key: 'sample_size',  label: { vi: 'Cỡ mẫu (n) *', en: 'Sample Size (n) *' }, type: 'number', value: d.sample_size, error: e.sample_size });
    html += ui.renderWizardField({ key: 'accept_number', label: { vi: 'Số chấp nhận (Ac) *', en: 'Accept Number (Ac) *' }, type: 'number', value: d.accept_number, error: e.accept_number });
    html += ui.renderWizardField({ key: 'reject_number', label: { vi: 'Số từ chối (Re) *', en: 'Reject Number (Re) *' }, type: 'number', value: d.reject_number, error: e.reject_number });
    html += ui.renderWizardTextarea({ key: 'sampling_procedure', label: { vi: 'Quy trình lấy mẫu', en: 'Sampling Procedure Notes' }, value: d.sampling_procedure, rows: 4 });
    html += renderWizardNav(1);
    html += '</div>';
    return html;
  }

  function renderWizardStep2() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step">';
    html += '<h4>' + T(WIZARD_STEPS[2].label) + '</h4>';
    html += '<div class="eqms-field-row">';
    html += '<label><input type="checkbox" data-field="skip_lot_enabled"' + (d.skip_lot_enabled ? ' checked' : '') + '> ';
    html += T({ vi: 'Kích hoạt Skip-Lot cho kế hoạch này', en: 'Enable Skip-Lot for this plan' }) + '</label>';
    html += '</div>';
    html += ui.renderWizardField({ key: 'tightened_trigger_rejects', label: { vi: 'Số lần từ chối kích hoạt siết chặt', en: 'Tightened Trigger (Rejects)' }, type: 'number', value: d.tightened_trigger_rejects });
    html += ui.renderWizardField({ key: 'reduced_trigger_accepts',   label: { vi: 'Số lần chấp nhận để giảm kiểm tra', en: 'Reduced Trigger (Accepts)' }, type: 'number', value: d.reduced_trigger_accepts });
    html += ui.renderWizardField({ key: 'skip_lot_trigger_accepts',  label: { vi: 'Số lần chấp nhận để áp dụng Skip-Lot', en: 'Skip-Lot Trigger (Accepts)' }, type: 'number', value: d.skip_lot_trigger_accepts });
    html += ui.renderWizardField({ key: 'skip_lot_frequency',        label: { vi: 'Tần suất Skip-Lot (1 trong N lô)', en: 'Skip Frequency (1 in N lots)' }, type: 'number', value: d.skip_lot_frequency });
    html += renderWizardNav(2);
    html += '</div>';
    return html;
  }

  function renderWizardStep3() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step">';
    html += '<h4>' + T(WIZARD_STEPS[3].label) + '</h4>';

    var reviewFields = [
      { label: { vi: 'Tên kế hoạch', en: 'Plan Name' },           value: d.plan_name },
      { label: { vi: 'Loại kế hoạch', en: 'Plan Type' },          value: d.plan_type },
      { label: { vi: 'Tiêu chuẩn', en: 'Standard' },              value: d.standard },
      { label: { vi: 'Cấp kiểm tra', en: 'Inspection Level' },    value: d.inspection_level },
      { label: { vi: 'Mã vật tư', en: 'Part Number' },            value: d.part_number || '\u2014' },
      { label: { vi: 'Nhà cung cấp', en: 'Supplier' },            value: d.vendor_id || '\u2014' },
      { label: { vi: 'Ngày hiệu lực', en: 'Effective Date' },     value: fmtDate(d.effective_date) },
      { label: { vi: 'AQL Major', en: 'AQL Major' },              value: d.aql_major ? d.aql_major + '%' : '\u2014' },
      { label: { vi: 'AQL Minor', en: 'AQL Minor' },              value: d.aql_minor ? d.aql_minor + '%' : '\u2014' },
      { label: { vi: 'Cỡ mẫu (n)', en: 'Sample Size (n)' },      value: d.sample_size },
      { label: { vi: 'Chấp nhận (Ac)', en: 'Accept (Ac)' },       value: d.accept_number },
      { label: { vi: 'Từ chối (Re)', en: 'Reject (Re)' },         value: d.reject_number },
      { label: { vi: 'Skip-Lot', en: 'Skip-Lot' },                value: d.skip_lot_enabled ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) }
    ];
    html += ui.renderFieldGrid(reviewFields);

    if (state.wizardErrors && Object.keys(state.wizardErrors).length) {
      html += '<div class="eqms-alert danger">' + T({ vi: 'Vui lòng sửa các lỗi trước khi gửi.', en: 'Please fix all errors before submitting.' }) + '</div>';
    }
    html += renderWizardNav(3);
    html += '</div>';
    return html;
  }

  function renderWizardNav(step) {
    var html = '<div class="eqms-wizard-nav">';
    if (step > 0) html += '<button class="eqms-btn ghost sm" data-action="wizard-prev">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button>';
    if (step < WIZARD_STEPS.length - 1) {
      html += '<button class="eqms-btn primary sm" data-action="wizard-next">' + T({ vi: 'Tiếp theo', en: 'Next' }) + ' \u2192</button>';
    } else {
      html += '<button class="eqms-btn success sm" data-action="wizard-submit">' + T({ vi: 'Tạo kế hoạch', en: 'Create Plan' }) + '</button>';
    }
    html += '</div>';
    return html;
  }

  // ─── Analytics View ──────────────────────────────────────────────────────────

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) {
      return html + ui.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' }) + '</div>';
    }
    var m = state.metrics;
    html += '<div class="eqms-kpi-row">';
    html += ui.renderKpiCard({ label: { vi: 'Tổng kế hoạch', en: 'Total Plans' }, value: m.total_plans || 0, icon: '\uD83D\uDCCB' });
    html += ui.renderKpiCard({ label: { vi: 'Đang hiệu lực', en: 'Active Plans' }, value: m.active_plans || 0, icon: '\u2705', color: 'success' });
    html += ui.renderKpiCard({ label: { vi: 'Chờ phê duyệt', en: 'Pending Approval' }, value: m.pending_plans || 0, icon: '\u23F3', color: 'warning' });
    html += ui.renderKpiCard({ label: { vi: 'Sắp hết hạn (30 ngày)', en: 'Expiring Soon (30d)' }, value: m.expiring_soon || 0, icon: '\u26A0\uFE0F', color: 'danger' });
    html += '</div>';

    if (m.by_plan_type && m.by_plan_type.length) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Phân bổ theo loại kế hoạch', en: 'Distribution by Plan Type' }) + '</h4>';
      html += '<table class="eqms-data-table" style="max-width:480px"><thead><tr>';
      html += '<th>' + T({ vi: 'Loại', en: 'Type' }) + '</th>';
      html += '<th>' + T({ vi: 'Số kế hoạch', en: 'Plans' }) + '</th>';
      html += '<th>' + T({ vi: 'Tỉ lệ', en: 'Share' }) + '</th>';
      html += '</tr></thead><tbody>';
      var maxType = Math.max.apply(null, m.by_plan_type.map(function(x) { return x.count; })) || 1;
      m.by_plan_type.forEach(function(row) {
        var pct = Math.round(row.count / maxType * 100);
        html += '<tr><td>' + esc(row.plan_type) + '</td><td>' + esc(String(row.count)) + '</td>';
        html += '<td><div style="background:var(--color-primary);height:8px;border-radius:4px;width:' + pct + '%"></div></td></tr>';
      });
      html += '</tbody></table></div>';
    }

    if (m.by_standard && m.by_standard.length) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Phân bổ theo tiêu chuẩn', en: 'Distribution by Standard' }) + '</h4>';
      html += '<table class="eqms-data-table" style="max-width:480px"><thead><tr>';
      html += '<th>' + T({ vi: 'Tiêu chuẩn', en: 'Standard' }) + '</th>';
      html += '<th>' + T({ vi: 'Số kế hoạch', en: 'Plans' }) + '</th>';
      html += '</tr></thead><tbody>';
      m.by_standard.forEach(function(row) {
        html += '<tr><td>' + esc(row.standard) + '</td><td>' + esc(String(row.count)) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    if (m.by_inspection_level && m.by_inspection_level.length) {
      html += '<div class="eqms-detail-section"><h4>' + T({ vi: 'Phân bổ theo cấp kiểm tra', en: 'Distribution by Inspection Level' }) + '</h4>';
      html += '<table class="eqms-data-table" style="max-width:420px"><thead><tr>';
      html += '<th>' + T({ vi: 'Cấp kiểm tra', en: 'Level' }) + '</th>';
      html += '<th>' + T({ vi: 'Số kế hoạch', en: 'Plans' }) + '</th>';
      html += '</tr></thead><tbody>';
      m.by_inspection_level.forEach(function(row) {
        html += '<tr><td>' + esc(row.inspection_level) + '</td><td>' + esc(String(row.count)) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
    return html;
  }

  // ─── Event Binding ───────────────────────────────────────────────────────────

  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function(e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var action = el.getAttribute('data-action');

      switch (action) {
        case 'switch-screen':
          var sc = el.getAttribute('data-screen');
          state.screen = sc; state.loaded = false; state.error = null;
          if (sc === 'create') { state.wizardStep = 0; state.wizardData = {}; state.wizardErrors = {}; }
          if (sc === 'queue')  { state.record = null; state.recordId = null; state.tabData = {}; }
          renderScreen(); break;

        case 'open-detail':
          state.screen = 'detail'; state.recordId = el.getAttribute('data-id');
          state.record = null; state.tabData = {}; state.activeTab = 'summary';
          renderScreen(); break;

        case 'switch-tab':
          var tab = el.getAttribute('data-tab');
          state.activeTab = tab; renderScreen(); break;

        case 'filter-apply':
        case 'filter-clear':
          if (action === 'filter-clear') state.filters = {};
          state.page = 1; state.loaded = false; loadQueue(); break;

        case 'sort-col':
          var col = el.getAttribute('data-col');
          if (state.sortKey === col) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
          else { state.sortKey = col; state.sortDir = 'asc'; }
          state.page = 1; state.loaded = false; loadQueue(); break;

        case 'page-change':
          state.page = parseInt(el.getAttribute('data-page'), 10);
          loadQueue(); break;

        case 'retry-queue':
          state.loaded = false; state.error = null; loadQueue(); break;

        case 'workflow-action':
          handleWorkflowAction(el.getAttribute('data-workflow')); break;

        case 'wizard-prev':
          state.wizardStep = Math.max(0, state.wizardStep - 1);
          collectWizardFormData(); renderScreen(); break;

        case 'wizard-next':
          collectWizardFormData();
          if (validateWizardStep(state.wizardStep)) { state.wizardStep++; renderScreen(); }
          else renderScreen(); break;

        case 'wizard-submit':
          collectWizardFormData();
          if (validateWizardStep(state.wizardStep)) submitCreate(); break;

        case 'run-lookup':
          collectLookupFormData(); runLookup(); break;
      }
    });

    _container.addEventListener('change', function(e) {
      var el = e.target.closest('[data-lookup]');
      if (el) { collectLookupFormData(); }
    });

    if (state.screen === 'queue') {
      var filterInputs = _container.querySelectorAll('.eqms-filter-bar input, .eqms-filter-bar select');
      filterInputs.forEach(function(el) {
        el.addEventListener('change', function() {
          state.filters[el.getAttribute('data-filter-key')] = el.value;
          state.page = 1; state.loaded = false; loadQueue();
        });
      });
    }
  }

  // ─── Data Loaders ────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; renderScreen();
    var params = Object.assign({ page: state.page, page_size: state.pageSize, sort: state.sortKey, dir: state.sortDir }, state.filters);
    apiCall('eqms_sampling_plans_list', params, 'GET', function(err, data) {
      state.loading = false;
      if (err) { state.error = err; }
      else { state.items = data.records || []; state.totalItems = data.total || 0; state.loaded = true; }
      renderScreen();
    });
  }

  function loadDetail(id) {
    state.loading = true; renderScreen();
    apiCall('eqms_sampling_plans_get', { id: id }, 'GET', function(err, data) {
      state.loading = false;
      if (err) { state.error = err; }
      else { state.record = data.record || data; }
      renderScreen();
    });
  }

  function loadTabData(tab) {
    var td = state.tabData;
    td['_' + tab + 'Loading'] = true;
    var actionMap = {
      audit:       'eqms_sampling_plans_audit',
      attachments: 'eqms_sampling_plans_attachments',
      comments:    'eqms_sampling_plans_comments'
    };
    var action = actionMap[tab];
    if (!action) return;
    apiCall(action, { id: state.recordId }, 'GET', function(err, data) {
      td['_' + tab + 'Loading'] = false;
      td['_' + tab + 'Loaded'] = true;
      if (!err) td[tab] = data.records || data.items || data[tab] || [];
      renderScreen();
    });
  }

  function loadMetrics() {
    apiCall('eqms_sampling_plans_metrics', {}, 'GET', function(err, data) {
      if (!err) state.metrics = data;
      renderScreen();
    });
  }

  // ─── Workflow Actions ─────────────────────────────────────────────────────────

  function handleWorkflowAction(action) {
    var r = state.record;
    if (!r) return;
    var actionKeyMap = {
      'submit':           'eqms_sampling_plans_submit',
      'start-review':     'eqms_sampling_plans_start_review',
      'approve':          'eqms_sampling_plans_approve',
      'reject':           'eqms_sampling_plans_reject',
      'request-revision': 'eqms_sampling_plans_request_revision',
      'obsolete':         'eqms_sampling_plans_obsolete',
      'revise':           'eqms_sampling_plans_revise'
    };
    var apiKey = actionKeyMap[action];
    if (!apiKey) return;

    var needsReason = ['reject', 'request-revision', 'obsolete'].indexOf(action) >= 0;
    var reason = '';
    if (needsReason) {
      reason = window.prompt(T({ vi: 'Nhập lý do:', en: 'Enter reason:' }));
      if (reason === null) return;
    }

    apiCall(apiKey, { id: r.plan_id, version: r.version, reason: reason }, 'POST', function(err, data) {
      if (err) {
        alert(T({ vi: 'Lỗi: ', en: 'Error: ' }) + err);
      } else {
        state.record = data.record || state.record;
        renderScreen();
      }
    });
  }

  // ─── Wizard Helpers ──────────────────────────────────────────────────────────

  function collectWizardFormData() {
    if (!_container) return;
    var fields = _container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-field');
      state.wizardData[key] = el.type === 'checkbox' ? el.checked : el.value;
    });
  }

  function validateWizardStep(step) {
    collectWizardFormData();
    var d = state.wizardData;
    var errors = {};

    if (step === 0) {
      if (!d.plan_name)       errors.plan_name       = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.plan_type)       errors.plan_type       = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.standard)        errors.standard        = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.inspection_level) errors.inspection_level = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.effective_date)  errors.effective_date  = T({ vi: 'Bắt buộc', en: 'Required' });
    }
    if (step === 1) {
      if (!d.aql_major)    errors.aql_major    = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.sample_size)  errors.sample_size  = T({ vi: 'Bắt buộc', en: 'Required' });
      if (d.accept_number == null || d.accept_number === '') errors.accept_number = T({ vi: 'Bắt buộc', en: 'Required' });
      if (!d.reject_number) errors.reject_number = T({ vi: 'Bắt buộc', en: 'Required' });
    }

    state.wizardErrors = errors;
    return Object.keys(errors).length === 0;
  }

  function submitCreate() {
    var payload = Object.assign({}, state.wizardData);
    apiCall('eqms_sampling_plans_create', payload, 'POST', function(err, data) {
      if (err) {
        state.wizardErrors.submit = err; renderScreen();
      } else {
        var newId = (data.record && (data.record.plan_id || data.record.id)) || (data.plan_id || data.id);
        state.screen = 'detail'; state.recordId = String(newId);
        state.record = null; state.tabData = {}; state.activeTab = 'summary';
        state.wizardStep = 0; state.wizardData = {}; state.wizardErrors = {};
        renderScreen();
      }
    });
  }

  // ─── Lookup Helpers ──────────────────────────────────────────────────────────

  function collectLookupFormData() {
    if (!_container) return;
    var fields = _container.querySelectorAll('[data-lookup]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-lookup');
      state.lookupForm[key] = el.value;
    });
  }

  function runLookup() {
    var lf = state.lookupForm;
    if (!lf.part_number) {
      lf.error = T({ vi: 'Vui lòng nhập mã vật tư.', en: 'Please enter a part number.' });
      renderScreen(); return;
    }
    lf.loading = true; lf.error = null; lf.result = null;
    renderScreen();
    apiCall('eqms_sampling_plans_lookup_for_part', { part_number: lf.part_number, vendor_id: lf.vendor_id, plan_type: lf.plan_type }, 'GET', function(err, data) {
      lf.loading = false;
      if (err) {
        lf.error = err;
      } else {
        lf.result = data;
      }
      renderScreen();
    });
  }

  // ─── Module Registration ──────────────────────────────────────────────────────

  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['sampling-plans'] = { render: render, meta: MOD };

})();

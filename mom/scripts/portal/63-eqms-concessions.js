/**
 * EQMS Concessions — Material/Process Concession Management
 * HESEM MOM Portal - 63-eqms-concessions.js
 *
 * Authority: Standard 36 - Frontend Module Layout Template Standard
 * Archetype: approval-workflow
 * Depends: 40-eqms-shell.js (EqmsShell.ui.*, EqmsShell.util.*)
 *
 * Regulatory: IATF 16949 §8.7, ISO 9001:2015 §8.7 (Nonconforming outputs)
 * State machine: draft -> submitted -> under_review -> approved/rejected -> closed/revoked
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
    id:        'concessions',
    version:   '1.0.0',
    archetype: 'approval-workflow',
    label:     { vi: 'Nhượng bộ chất lượng', en: 'Concessions' },
    icon:      '\uD83D\uDCCB'
  };

  var WORKFLOW_STATES = ['draft', 'submitted', 'under_review', 'info_requested', 'approved', 'rejected', 'closed', 'revoked'];

  var STATE_LABELS = {
    draft:          { vi: 'Nháp',            en: 'Draft' },
    submitted:      { vi: 'Đã gửi',          en: 'Submitted' },
    under_review:   { vi: 'Đang xem xét',    en: 'Under Review' },
    info_requested: { vi: 'Yêu cầu thêm TT', en: 'Info Requested' },
    approved:       { vi: 'Đã phê duyệt',    en: 'Approved' },
    rejected:       { vi: 'Từ chối',         en: 'Rejected' },
    closed:         { vi: 'Đã đóng',         en: 'Closed' },
    revoked:        { vi: 'Đã thu hồi',      en: 'Revoked' }
  };

  var CONCESSION_TYPE_OPTIONS = [
    { value: 'material',       label: { vi: 'Vật liệu',       en: 'Material' } },
    { value: 'process',        label: { vi: 'Quy trình',      en: 'Process' } },
    { value: 'design',         label: { vi: 'Thiết kế',       en: 'Design' } },
    { value: 'dimensional',    label: { vi: 'Kích thước',     en: 'Dimensional' } },
    { value: 'cosmetic',       label: { vi: 'Ngoại quan',     en: 'Cosmetic' } },
    { value: 'functional',     label: { vi: 'Chức năng',      en: 'Functional' } }
  ];

  var DISPOSITION_OPTIONS = [
    { value: 'use_as_is',      label: { vi: 'Dùng nguyên trạng', en: 'Use As-Is' } },
    { value: 'rework',         label: { vi: 'Làm lại',           en: 'Rework' } },
    { value: 'repair',         label: { vi: 'Sửa chữa',          en: 'Repair' } },
    { value: 'sort',           label: { vi: 'Phân loại',         en: 'Sort / Screen' } },
    { value: 'return_to_vendor', label: { vi: 'Trả nhà cung cấp', en: 'Return to Vendor' } },
    { value: 'scrap',          label: { vi: 'Loại bỏ',           en: 'Scrap' } },
    { value: 'conditional',    label: { vi: 'Có điều kiện',      en: 'Conditional' } }
  ];

  var STATE_ACTIONS = {
    draft:          [{ action: 'submit',          label: { vi: 'Gửi xét duyệt', en: 'Submit for Approval' }, style: 'primary' }],
    submitted:      [{ action: 'start-review',    label: { vi: 'Bắt đầu xem xét', en: 'Start Review' }, style: 'primary' }],
    under_review:   [
      { action: 'approve',       label: { vi: 'Phê duyệt',    en: 'Approve' },        style: 'success' },
      { action: 'reject',        label: { vi: 'Từ chối',      en: 'Reject' },         style: 'danger' },
      { action: 'request-info',  label: { vi: 'Yêu cầu TT',  en: 'Request Info' },   style: 'secondary' }
    ],
    info_requested: [
      { action: 'submit-info',   label: { vi: 'Cung cấp TT', en: 'Submit Info' }, style: 'primary' },
      { action: 'withdraw',      label: { vi: 'Rút lại',     en: 'Withdraw' },    style: 'ghost' }
    ],
    approved:       [
      { action: 'close',   label: { vi: 'Đóng', en: 'Close' },     style: 'primary' },
      { action: 'revoke',  label: { vi: 'Thu hồi', en: 'Revoke' }, style: 'danger' }
    ]
  };

  var DETAIL_TABS = [
    { id: 'summary',      label: { vi: 'Tóm tắt',    en: 'Summary' } },
    { id: 'justification', label: { vi: 'Lý do',     en: 'Justification' } },
    { id: 'related',      label: { vi: 'Liên quan',  en: 'Related' } },
    { id: 'audit',        label: { vi: 'Nhật ký',    en: 'Audit Trail' } },
    { id: 'attachments',  label: { vi: 'Đính kèm',   en: 'Attachments' } },
    { id: 'comments',     label: { vi: 'Bình luận',  en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin vật liệu', en: 'Material / Product' } },
    { label: { vi: 'Mô tả sai lệch',    en: 'Deviation Description' } },
    { label: { vi: 'Đề xuất xử lý',     en: 'Proposed Disposition' } },
    { label: { vi: 'Xem lại & Gửi',    en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue',
    filters: {}, sortKey: 'created_at', sortDir: 'desc',
    page: 1, pageSize: 25,
    items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null,
    activeTab: 'summary', tabData: {},
    wizardStep: 0, wizardData: {}, wizardErrors: {},
    metrics: null
  };

  var _container = null;

  function render(container, context) {
    context = context || {};
    if (context.recordId) { state.screen = 'detail'; state.recordId = context.recordId; }
    _container = container;
    renderScreen();
  }

  function renderScreen() {
    if (!_container) return;
    var html = '<div class="eqms-module eqms-concessions">';
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

  function renderToolbar() {
    var html = '<div class="eqms-module-toolbar"><div class="eqms-module-toolbar-left">';
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'Queue' }, icon: '\uD83D\uDCCB' },
     { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    if (state.screen === 'queue') html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo nhượng bộ', en: 'New Concession' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      savedViews: true,
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' },
          options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'concession_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: CONCESSION_TYPE_OPTIONS },
        { key: 'disposition', type: 'select', label: { vi: 'Xử lý', en: 'Disposition' }, options: DISPOSITION_OPTIONS },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' },
          placeholder: { vi: 'Mã, tiêu đề, mã phần...', en: 'ID, title, part number...' }, width: '220px' }
      ]
    });

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải danh sách nhượng bộ...', en: 'Loading concessions...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'concession_number', type: 'id', label: { vi: 'Mã', en: 'ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.concession_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'title',            label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate' },
        { key: 'concession_type',  label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'part_number',      label: { vi: 'Mã phần', en: 'Part No.' }, mono: true },
        { key: 'quantity_affected', label: { vi: 'SL ảnh hưởng', en: 'Qty Affected' } },
        { key: 'disposition',      label: { vi: 'Xử lý', en: 'Disposition' }, type: 'badge' },
        { key: 'status',           label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'created_at',       label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: true, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading
        ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' })
        : ui.renderEmptyState({ icon: '\uD83D\uDCCB', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.concession_number, title: r.title,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Loại', en: 'Type' }, value: r.concession_type },
           { label: { vi: 'Mã phần', en: 'Part' }, value: r.part_number },
           { label: { vi: 'Xử lý', en: 'Disposition' }, value: r.disposition }
         ]
    });
    html += ui.renderStateTimeline(['draft','submitted','under_review','approved','closed'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':       return renderSummaryTab(r);
      case 'justification': return renderJustificationTab(r);
      case 'related':       return renderRelatedTab();
      case 'audit':         return renderStdTab('audit', 'eqms_concessions_audit', r);
      case 'attachments':   return renderStdTab('attachments', 'eqms_concessions_attachments', r);
      case 'comments':      return renderStdTab('comments', 'eqms_concessions_comments', r);
      default:              return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin nhượng bộ', en: 'Concession Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã nhượng bộ', en: 'Concession ID' }, value: r.concession_number, mono: true },
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: r.title },
        { label: { vi: 'Loại', en: 'Type' }, value: r.concession_type, badge: true },
        { label: { vi: 'Mã phần', en: 'Part Number' }, value: r.part_number, mono: true },
        { label: { vi: 'Phiên bản phần', en: 'Part Rev' }, value: r.part_revision, mono: true },
        { label: { vi: 'SL ảnh hưởng', en: 'Qty Affected' }, value: fmt(r.quantity_affected) },
        { label: { vi: 'Số lô', en: 'Lot Number' }, value: r.lot_number, mono: true },
        { label: { vi: 'Xử lý đề xuất', en: 'Proposed Disposition' }, value: r.disposition, badge: true },
        { label: { vi: 'Hiệu lực đến', en: 'Valid Until' }, value: fmtDate(r.valid_until) },
        { label: { vi: 'Phê duyệt bởi', en: 'Approved By' }, value: r.approved_by },
        { label: { vi: 'Ngày phê duyệt', en: 'Approved At' }, value: fmtDateTime(r.approved_at) },
        { label: { vi: 'Trạng thái', en: 'Status' }, value: T(STATE_LABELS[r.status] || { en: r.status }), badge: true },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderJustificationTab(r) {
    return ui.renderSection({ vi: 'Lý do & Tác động', en: 'Justification & Impact' },
      ui.renderFieldGrid([
        { label: { vi: 'Mô tả sai lệch', en: 'Deviation Description' }, value: r.deviation_description },
        { label: { vi: 'Ảnh hưởng chức năng', en: 'Functional Impact' }, value: r.functional_impact },
        { label: { vi: 'Lý do kỹ thuật', en: 'Technical Justification' }, value: r.technical_justification },
        { label: { vi: 'Tác động khách hàng', en: 'Customer Impact' }, value: r.customer_impact },
        { label: { vi: 'Tác động quy định', en: 'Regulatory Impact' }, value: r.regulatory_impact },
        { label: { vi: 'Hành động ngăn ngừa', en: 'Prevention Action' }, value: r.prevention_action }
      ])
    );
  }

  function renderRelatedTab() {
    var links = state.tabData.relationships || [];
    if (ui.renderLinkedRecordGraph) return ui.renderLinkedRecordGraph(links, { entityType: 'concession', recordId: state.recordId });
    return ui.renderRelationshipsPanel(links, { readonly: state.record && ['closed','revoked','rejected'].indexOf(state.record.status) !== -1 });
  }

  function renderStdTab(tabId, action, r) {
    if (!state.tabData['_' + tabId + 'Loaded']) {
      loadTabData(tabId, action);
      return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' });
    }
    var data = state.tabData[tabId] || [];
    if (tabId === 'audit')       return ui.renderAuditTrail(data);
    if (tabId === 'attachments') return ui.renderAttachmentsGrid(data, { readonly: r && ['closed','revoked'].indexOf(r.status) !== -1 });
    if (tabId === 'comments')    return ui.renderCommentsThread(data, { readonly: r && ['closed','revoked'].indexOf(r.status) !== -1 });
    return '';
  }

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo nhượng bộ mới', en: 'New Concession Request' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), { saveDraft: true });
    html += '</div>';
    return html;
  }

  function renderWizardStep(step) {
    var d = state.wizardData; var e = state.wizardErrors;
    switch (step) {
      case 0: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, type: 'text', required: true, value: d.title || '', error: e.title }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'part_number', label: { vi: 'Mã phần', en: 'Part Number' }, type: 'text', required: true, value: d.part_number || '', error: e.part_number }) +
          ui.renderFormField({ key: 'part_revision', label: { vi: 'Phiên bản', en: 'Revision' }, type: 'text', value: d.part_revision || '' }) +
          ui.renderFormField({ key: 'lot_number', label: { vi: 'Số lô', en: 'Lot Number' }, type: 'text', value: d.lot_number || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'quantity_affected', label: { vi: 'SL ảnh hưởng', en: 'Qty Affected' }, type: 'number', value: d.quantity_affected || '', min: 0 }) +
          ui.renderFormField({ key: 'quantity_total', label: { vi: 'Tổng số lượng', en: 'Total Qty' }, type: 'number', value: d.quantity_total || '', min: 0 }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'concession_type', label: { vi: 'Loại nhượng bộ', en: 'Concession Type' }, type: 'select', required: true, value: d.concession_type || '', options: CONCESSION_TYPE_OPTIONS, error: e.concession_type }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'deviation_description', label: { vi: 'Mô tả sai lệch', en: 'Deviation Description' }, type: 'textarea', required: true, value: d.deviation_description || '', error: e.deviation_description }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'functional_impact', label: { vi: 'Ảnh hưởng chức năng', en: 'Functional Impact' }, type: 'textarea', value: d.functional_impact || '' }) +
          ui.renderFormField({ key: 'technical_justification', label: { vi: 'Lý do kỹ thuật', en: 'Technical Justification' }, type: 'textarea', value: d.technical_justification || '' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'disposition', label: { vi: 'Phương án xử lý', en: 'Proposed Disposition' }, type: 'select', required: true, value: d.disposition || '', options: DISPOSITION_OPTIONS, error: e.disposition }) +
          ui.renderFormField({ key: 'valid_until', label: { vi: 'Hiệu lực đến', en: 'Valid Until' }, type: 'date', value: d.valid_until || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'customer_impact', label: { vi: 'Tác động khách hàng', en: 'Customer Impact' }, type: 'textarea', value: d.customer_impact || '' }) +
          ui.renderFormField({ key: 'prevention_action', label: { vi: 'Hành động ngăn ngừa', en: 'Prevention Action' }, type: 'textarea', value: d.prevention_action || '' }) +
        '</div></div>';
      case 3: return renderWizardReview();
      default: return '';
    }
  }

  function renderWizardReview() {
    var d = state.wizardData;
    return '<div class="eqms-wizard-step-content">' +
      ui.renderSection({ vi: 'Vật liệu / Sản phẩm', en: 'Material / Product' }, ui.renderFieldGrid([
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: d.title },
        { label: { vi: 'Mã phần', en: 'Part Number' }, value: d.part_number },
        { label: { vi: 'Số lô', en: 'Lot Number' }, value: d.lot_number },
        { label: { vi: 'SL ảnh hưởng', en: 'Qty Affected' }, value: fmt(d.quantity_affected) }
      ])) +
      ui.renderSection({ vi: 'Sai lệch & Xử lý', en: 'Deviation & Disposition' }, ui.renderFieldGrid([
        { label: { vi: 'Loại', en: 'Type' }, value: d.concession_type },
        { label: { vi: 'Mô tả', en: 'Description' }, value: d.deviation_description },
        { label: { vi: 'Xử lý', en: 'Disposition' }, value: d.disposition },
        { label: { vi: 'Hiệu lực đến', en: 'Valid Until' }, value: fmtDate(d.valid_until) }
      ])) +
      '</div>';
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Đang mở', en: 'Open' }, value: fmt(m.open_count || 0), accent: m.open_count > 10 ? 'danger' : '' },
      { label: { vi: 'Chờ phê duyệt', en: 'Pending Approval' }, value: fmt(m.pending_approval || 0) },
      { label: { vi: 'Đã phê duyệt YTD', en: 'Approved YTD' }, value: fmt(m.approved_ytd || 0) },
      { label: { vi: 'TB ngày xử lý', en: 'Avg Cycle Days' }, value: m.avg_cycle_days != null ? m.avg_cycle_days.toFixed(1) : '\u2014' }
    ]);
    html += ui.renderChartWithTableFallback('chart-conc-by-type', null,
      [{ key: 'concession_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_type || [], { defaultMode: 'table' });
    html += ui.renderChartWithTableFallback('chart-conc-by-status', null,
      [{ key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_status || [], { defaultMode: 'table' });
    html += '</div>';
    return html;
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)         payload.filters.status         = state.filters.status;
    if (state.filters.concession_type) payload.filters.concession_type = state.filters.concession_type;
    if (state.filters.disposition)    payload.filters.disposition    = state.filters.disposition;
    apiCall('eqms_concessions_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.concessions || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed to load';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_concessions_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.concession) { state.record = res.concession; state.recordId = id; }
      else state.error = (res && res.message) || 'Not found';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadTabData(tab, action) {
    if (!state.recordId) return;
    apiCall(action, { id: state.recordId }, 'GET').then(function(res) {
      if (res) {
        state.tabData['_' + tab + 'Loaded'] = true;
        if (tab === 'audit')       state.tabData.audit       = res.events || res.audit || [];
        if (tab === 'comments')    state.tabData.comments    = res.comments || [];
        if (tab === 'attachments') state.tabData.attachments = res.attachments || [];
      }
      refreshUI();
    }).catch(function() { state.tabData['_' + tab + 'Loaded'] = true; refreshUI(); });
  }

  function loadMetrics() {
    apiCall('eqms_concessions_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    if (actionKey === 'request-info') {
      var reason = prompt(T({ vi: 'Thông tin cần thêm:', en: 'Information required:' }));
      if (!reason) return;
      payload.info_request = reason;
    }
    if (actionKey === 'reject') {
      var rejectReason = prompt(T({ vi: 'Lý do từ chối:', en: 'Rejection reason:' }));
      if (!rejectReason) return;
      payload.rejection_reason = rejectReason;
    }
    if (actionKey === 'revoke') {
      var revokeReason = prompt(T({ vi: 'Lý do thu hồi:', en: 'Revocation reason:' }));
      if (!revokeReason) return;
      payload.revoke_reason = revokeReason;
    }
    state.loading = true; refreshUI();
    apiCall('eqms_concessions_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.concession) { state.record = res.concession; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || T({ vi: 'Thất bại', en: 'Action failed' }), 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.title)                errors.title                = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.part_number)          errors.part_number          = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.concession_type)      errors.concession_type      = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.deviation_description) errors.deviation_description = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.disposition)          errors.disposition          = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); showToast(T({ vi: 'Vui lòng điền đầy đủ', en: 'Please fill all required fields' }), 'warning'); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_concessions_create', { title: d.title, concession_type: d.concession_type, part_number: d.part_number, part_revision: d.part_revision || null, lot_number: d.lot_number || null, quantity_affected: d.quantity_affected ? parseInt(d.quantity_affected, 10) : null, quantity_total: d.quantity_total ? parseInt(d.quantity_total, 10) : null, deviation_description: d.deviation_description, functional_impact: d.functional_impact || null, technical_justification: d.technical_justification || null, customer_impact: d.customer_impact || null, disposition: d.disposition, valid_until: d.valid_until || null, prevention_action: d.prevention_action || null }).then(function(res) {
      state.loading = false;
      if (res && res.concession) {
        showToast(T({ vi: 'Tạo thành công', en: 'Concession created' }), 'success');
        state.screen = 'detail'; state.recordId = res.concession.concession_id; state.record = res.concession;
        state.wizardData = {}; state.wizardStep = 0; state.wizardErrors = {};
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  function refreshUI() { if (_container) renderScreen(); }

  function showToast(message, type) {
    var existing = document.querySelector('.eqms-toast'); if (existing) existing.remove();
    var toast = document.createElement('div'); toast.className = 'eqms-toast ' + (type || 'info'); toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() { toast.classList.remove('visible'); setTimeout(function() { toast.remove(); }, 300); }, 4000);
  }

  function collectWizardFormData() {
    if (!_container) return;
    _container.querySelectorAll('[data-field]').forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key) state.wizardData[key] = el.value || '';
    });
  }

  // ─── Event binding ────────────────────────────────────────────────────────────

  function bindEvents() {
    if (!_container) return;
    _container.addEventListener('click', function(e) {
      var target;
      target = e.target.closest('[data-action="switch-screen"]');
      if (target) {
        var screen = target.getAttribute('data-screen');
        if (screen === 'create') { state.screen = 'create'; state.wizardStep = 0; state.wizardData = {}; state.wizardErrors = {}; }
        else if (screen === 'queue') { state.screen = 'queue'; state.record = null; state.recordId = null; state.items = []; }
        else if (screen === 'analytics') { state.screen = 'analytics'; state.metrics = null; }
        else state.screen = screen;
        refreshUI(); return;
      }
      target = e.target.closest('[data-action="open-detail"]');
      if (target) {
        var id = target.getAttribute('data-id');
        state.screen = 'detail'; state.recordId = id; state.record = null; state.activeTab = 'summary'; state.tabData = {};
        refreshUI(); return;
      }
      target = e.target.closest('[data-tab]');
      if (target) { state.activeTab = target.getAttribute('data-tab'); refreshUI(); return; }
      target = e.target.closest('[data-action]');
      if (target) {
        var action = target.getAttribute('data-action');
        var workflowActions = ['submit','start-review','approve','reject','request-info','submit-info','withdraw','close','revoke'];
        if (workflowActions.indexOf(action) !== -1) { executeWorkflowAction(action); return; }
        if (action === 'wizard-next') { collectWizardFormData(); if (state.wizardStep < WIZARD_STEPS.length - 1) { state.wizardStep++; refreshUI(); } return; }
        if (action === 'wizard-back') { collectWizardFormData(); if (state.wizardStep > 0) { state.wizardStep--; refreshUI(); } return; }
        if (action === 'wizard-submit') { collectWizardFormData(); submitWizard(); return; }
        if (action === 'apply-filters') { collectFilters(); state.page = 1; state.items = []; loadQueue(); return; }
        if (action === 'reset-filters') { state.filters = {}; state.page = 1; state.items = []; loadQueue(); return; }
        if (action === 'page') { var page = parseInt(target.getAttribute('data-page'), 10); if (page > 0) { state.page = page; state.items = []; loadQueue(); } return; }
        if (action === 'retry-queue') { state.items = []; loadQueue(); return; }
        if (action === 'export') { var fmt2 = target.getAttribute('data-format'); apiCall('eqms_concessions_export', { format: fmt2 || 'xlsx', filters: state.filters }); return; }
      }
      target = e.target.closest('[data-sort]');
      if (target && state.screen === 'queue') {
        var sortKey = target.getAttribute('data-sort');
        if (state.sortKey === sortKey) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortKey = sortKey; state.sortDir = 'asc'; }
        state.page = 1; state.items = []; loadQueue();
      }
    });
  }

  function collectFilters() {
    if (!_container) return;
    _container.querySelectorAll('[data-filter]').forEach(function(el) { state.filters[el.getAttribute('data-filter')] = el.value || ''; });
  }

  // ─── Registration ─────────────────────────────────────────────────────────────
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['concessions'] = { render: render, meta: MOD };

})();

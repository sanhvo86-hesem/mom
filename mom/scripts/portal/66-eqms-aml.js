/**
 * EQMS Approved Manufacturer/Supplier List (AML) — IATF 16949 §8.4.1
 * HESEM MOM Portal - 66-eqms-aml.js
 *
 * Archetype: approval-workflow with approval-check lookup
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
    id:        'aml',
    version:   '1.0.0',
    archetype: 'approval-workflow',
    label:     { vi: 'Danh sách nhà cung cấp được phê duyệt (AML)', en: 'Approved Manufacturer List' },
    icon:      '\uD83C\uDFED'
  };

  var WORKFLOW_STATES = ['draft','submitted','approved','rejected','blocked','obsolete'];

  var STATE_LABELS = {
    draft:     { vi: 'Nháp',              en: 'Draft' },
    submitted: { vi: 'Đã gửi',           en: 'Submitted' },
    approved:  { vi: 'Đã phê duyệt',     en: 'Approved' },
    rejected:  { vi: 'Từ chối',          en: 'Rejected' },
    blocked:   { vi: 'Đã chặn',          en: 'Blocked' },
    obsolete:  { vi: 'Lỗi thời',         en: 'Obsolete' }
  };

  var APPROVAL_TYPE_OPTIONS = [
    { value: 'full',         label: { vi: 'Toàn phần',         en: 'Full Approval' } },
    { value: 'conditional',  label: { vi: 'Có điều kiện',      en: 'Conditional' } },
    { value: 'provisional',  label: { vi: 'Tạm thời',          en: 'Provisional' } },
    { value: 'engineering',  label: { vi: 'Kỹ thuật / Phát triển', en: 'Engineering / Development' } }
  ];

  var STATE_ACTIONS = {
    draft:     [{ action: 'submit-for-approval', label: { vi: 'Gửi phê duyệt', en: 'Submit for Approval' }, style: 'primary' }],
    submitted: [
      { action: 'approve',      label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'success' },
      { action: 'reject',       label: { vi: 'Từ chối',   en: 'Reject' },  style: 'danger' },
      { action: 'request-info', label: { vi: 'Yêu cầu TT', en: 'Request Info' }, style: 'secondary' }
    ],
    approved:  [
      { action: 'block',    label: { vi: 'Chặn NCC', en: 'Block Supplier' }, style: 'danger' },
      { action: 'obsolete', label: { vi: 'Đánh dấu lỗi thời', en: 'Mark Obsolete' }, style: 'ghost' }
    ],
    blocked:   [
      { action: 'unblock',  label: { vi: 'Bỏ chặn', en: 'Unblock' }, style: 'primary' },
      { action: 'obsolete', label: { vi: 'Lỗi thời', en: 'Obsolete' }, style: 'ghost' }
    ]
  };

  var DETAIL_TABS = [
    { id: 'summary',     label: { vi: 'Tóm tắt',       en: 'Summary' } },
    { id: 'approval',    label: { vi: 'Lịch sử phê duyệt', en: 'Approval History' } },
    { id: 'related',     label: { vi: 'Liên quan',     en: 'Related' } },
    { id: 'audit',       label: { vi: 'Nhật ký',       en: 'Audit Trail' } },
    { id: 'attachments', label: { vi: 'Đính kèm',      en: 'Attachments' } },
    { id: 'comments',    label: { vi: 'Bình luận',     en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Phần & Nhà cung cấp', en: 'Part & Supplier' } },
    { label: { vi: 'Loại phê duyệt',      en: 'Approval Type' } },
    { label: { vi: 'Xem lại & Gửi',      en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'created_at', sortDir: 'desc',
    page: 1, pageSize: 25, items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null, activeTab: 'summary', tabData: {},
    wizardStep: 0, wizardData: {}, wizardErrors: {},
    metrics: null,
    checkForm: { part_number: '', vendor_id: '', result: null, loading: false }
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
    var html = '<div class="eqms-module eqms-aml">';
    html += renderToolbar();
    switch (state.screen) {
      case 'queue':     html += renderQueueView(); break;
      case 'detail':    html += renderDetailView(); break;
      case 'create':    html += renderCreateView(); break;
      case 'check':     html += renderCheckView(); break;
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
    [{ id: 'queue', label: { vi: 'AML', en: 'AML' }, icon: '\uD83C\uDFED' },
     { id: 'check', label: { vi: 'Kiểm tra phê duyệt', en: 'Check Approval' }, icon: '\u2705' },
     { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Thêm AML', en: 'Add AML Entry' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'approval_type', type: 'select', label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, options: APPROVAL_TYPE_OPTIONS },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã phần, NCC, AML...', en: 'Part no., vendor, AML ID...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải AML...', en: 'Loading AML...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'aml_number', type: 'id', label: { vi: 'Mã AML', en: 'AML ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.aml_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'part_number',   label: { vi: 'Mã phần', en: 'Part No.' }, mono: true },
        { key: 'vendor_id',     label: { vi: 'Mã NCC', en: 'Vendor ID' }, mono: true },
        { key: 'vendor_name',   label: { vi: 'Tên NCC', en: 'Vendor Name' } },
        { key: 'approval_type', label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, type: 'badge' },
        { key: 'approved_by',   label: { vi: 'Phê duyệt bởi', en: 'Approved By' } },
        { key: 'expiry_date',   label: { vi: 'Hết hạn', en: 'Expiry' }, type: 'date' },
        { key: 'status',        label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderCheckView() {
    var cf = state.checkForm;
    var html = '<div class="eqms-check-view" style="max-width:600px;margin:0 auto">';
    html += '<h2>' + T({ vi: 'Kiểm tra phê duyệt NCC', en: 'Supplier Approval Check' }) + '</h2>';
    html += '<p style="color:var(--color-text-secondary)">' + T({ vi: 'Kiểm tra xem nhà cung cấp có được phê duyệt cho mã phần này không.', en: 'Check whether a supplier is approved for a given part number.' }) + '</p>';
    html += '<div class="eqms-form-row" style="margin-top:24px">' +
      ui.renderFormField({ key: 'check_part_number', label: { vi: 'Mã phần', en: 'Part Number' }, type: 'text', required: true, value: cf.part_number || '', placeholder: { vi: 'Nhập mã phần cần kiểm tra', en: 'Enter part number' } }) +
      ui.renderFormField({ key: 'check_vendor_id', label: { vi: 'Mã nhà cung cấp', en: 'Vendor ID' }, type: 'text', required: true, value: cf.vendor_id || '', placeholder: { vi: 'Nhập mã NCC', en: 'Enter vendor ID' } }) +
    '</div>';
    html += '<button class="eqms-btn primary" data-action="run-approval-check"' + (cf.loading ? ' disabled' : '') + '>';
    html += cf.loading ? T({ vi: 'Đang kiểm tra...', en: 'Checking...' }) : T({ vi: 'Kiểm tra ngay', en: 'Check Approval' });
    html += '</button>';

    if (cf.result !== null) {
      html += '<div style="margin-top:24px;padding:20px;border-radius:8px;border:2px solid ' + (cf.result.approved ? 'var(--color-success)' : 'var(--color-danger)') + '">';
      html += '<div style="font-size:24px;margin-bottom:8px">' + (cf.result.approved ? '\u2705' : '\u274C') + '</div>';
      html += '<div style="font-size:18px;font-weight:bold;color:' + (cf.result.approved ? 'var(--color-success)' : 'var(--color-danger)') + '">';
      html += T(cf.result.approved ? { vi: 'ĐƯỢC PHÊ DUYỆT', en: 'APPROVED' } : { vi: 'KHÔNG ĐƯỢC PHÊ DUYỆT', en: 'NOT APPROVED' });
      html += '</div>';
      if (cf.result.aml_number) {
        html += '<div style="margin-top:12px">' + ui.renderFieldGrid([
          { label: { vi: 'Mã AML', en: 'AML ID' }, value: cf.result.aml_number, mono: true },
          { label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, value: cf.result.approval_type },
          { label: { vi: 'Hết hạn', en: 'Expiry' }, value: fmtDate(cf.result.expiry_date) },
          { label: { vi: 'Điều kiện đặc biệt', en: 'Special Conditions' }, value: cf.result.special_conditions }
        ]) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : ui.renderEmptyState({ icon: '\uD83C\uDFED', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.aml_number, title: r.part_number + ' / ' + (r.vendor_name || r.vendor_id),
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Mã phần', en: 'Part No.' }, value: r.part_number },
           { label: { vi: 'NCC', en: 'Vendor' }, value: r.vendor_name || r.vendor_id },
           { label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, value: r.approval_type }
         ]
    });
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':    return renderSummaryTab(r);
      case 'approval':   return renderApprovalHistoryTab(r);
      case 'related':    return ui.renderRelationshipsPanel(state.tabData.relationships || [], {});
      case 'audit':      return renderStdTab('audit', 'eqms_aml_audit', r);
      case 'attachments': return renderStdTab('attachments', 'eqms_aml_attachments', r);
      case 'comments':   return renderStdTab('comments', 'eqms_aml_comments', r);
      default:           return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin AML', en: 'AML Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã AML', en: 'AML ID' }, value: r.aml_number, mono: true },
        { label: { vi: 'Mã phần', en: 'Part Number' }, value: r.part_number, mono: true },
        { label: { vi: 'Phiên bản phần', en: 'Part Revision' }, value: r.part_revision, mono: true },
        { label: { vi: 'Mã NCC', en: 'Vendor ID' }, value: r.vendor_id, mono: true },
        { label: { vi: 'Tên NCC', en: 'Vendor Name' }, value: r.vendor_name },
        { label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, value: r.approval_type, badge: true },
        { label: { vi: 'Phạm vi phê duyệt', en: 'Approval Scope' }, value: r.approval_scope },
        { label: { vi: 'Điều kiện đặc biệt', en: 'Special Conditions' }, value: r.special_conditions },
        { label: { vi: 'Ngày phê duyệt', en: 'Approved At' }, value: fmtDateTime(r.approved_at) },
        { label: { vi: 'Phê duyệt bởi', en: 'Approved By' }, value: r.approved_by },
        { label: { vi: 'Hết hạn', en: 'Expiry Date' }, value: fmtDate(r.expiry_date) },
        { label: { vi: 'Lý do chặn', en: 'Block Reason' }, value: r.block_reason },
        { label: { vi: 'Trạng thái', en: 'Status' }, value: T(STATE_LABELS[r.status] || { en: r.status }), badge: true },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderApprovalHistoryTab(r) {
    if (!state.tabData._auditLoaded) {
      loadTabData('audit', 'eqms_aml_audit');
      return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' });
    }
    return ui.renderAuditTrail(state.tabData.audit || []);
  }

  function renderStdTab(tabId, action, r) {
    if (!state.tabData['_' + tabId + 'Loaded']) { loadTabData(tabId, action); return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); }
    var data = state.tabData[tabId] || [];
    if (tabId === 'audit')       return ui.renderAuditTrail(data);
    if (tabId === 'attachments') return ui.renderAttachmentsGrid(data, {});
    if (tabId === 'comments')    return ui.renderCommentsThread(data, {});
    return '';
  }

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Thêm mục AML mới', en: 'New AML Entry' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), {});
    html += '</div>';
    return html;
  }

  function renderWizardStep(step) {
    var d = state.wizardData; var e = state.wizardErrors;
    switch (step) {
      case 0: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'part_number', label: { vi: 'Mã phần', en: 'Part Number' }, type: 'text', required: true, value: d.part_number || '', error: e.part_number }) +
          ui.renderFormField({ key: 'part_revision', label: { vi: 'Phiên bản phần', en: 'Part Revision' }, type: 'text', value: d.part_revision || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'vendor_id', label: { vi: 'Mã NCC', en: 'Vendor ID' }, type: 'text', required: true, value: d.vendor_id || '', error: e.vendor_id }) +
          ui.renderFormField({ key: 'vendor_name', label: { vi: 'Tên NCC', en: 'Vendor Name' }, type: 'text', value: d.vendor_name || '' }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'approval_type', label: { vi: 'Loại phê duyệt', en: 'Approval Type' }, type: 'select', required: true, value: d.approval_type || '', options: APPROVAL_TYPE_OPTIONS, error: e.approval_type }) +
          ui.renderFormField({ key: 'expiry_date', label: { vi: 'Ngày hết hạn', en: 'Expiry Date' }, type: 'date', value: d.expiry_date || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'approval_scope', label: { vi: 'Phạm vi phê duyệt', en: 'Approval Scope' }, type: 'textarea', value: d.approval_scope || '' }) +
          ui.renderFormField({ key: 'special_conditions', label: { vi: 'Điều kiện đặc biệt', en: 'Special Conditions' }, type: 'textarea', value: d.special_conditions || '' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Phần & NCC', en: 'Part & Supplier' }, ui.renderFieldGrid([
          { label: { vi: 'Mã phần', en: 'Part No.' }, value: d.part_number },
          { label: { vi: 'NCC', en: 'Vendor' }, value: d.vendor_name || d.vendor_id }
        ])) +
        ui.renderSection({ vi: 'Phê duyệt', en: 'Approval' }, ui.renderFieldGrid([
          { label: { vi: 'Loại', en: 'Type' }, value: d.approval_type },
          { label: { vi: 'Hết hạn', en: 'Expiry' }, value: fmtDate(d.expiry_date) }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng mục đã phê duyệt', en: 'Total Approved' }, value: fmt(m.approved_count || 0) },
      { label: { vi: 'Đang bị chặn', en: 'Blocked' }, value: fmt(m.blocked_count || 0), accent: m.blocked_count > 0 ? 'danger' : '' },
      { label: { vi: 'Sắp hết hạn (30 ngày)', en: 'Expiring (30d)' }, value: fmt(m.expiring_soon || 0), accent: m.expiring_soon > 0 ? 'warning' : '' },
      { label: { vi: 'Đang xét duyệt', en: 'Pending' }, value: fmt(m.pending || 0) }
    ]);
    html += ui.renderChartWithTableFallback('chart-aml-by-type', null,
      [{ key: 'approval_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_type || [], { defaultMode: 'table' });
    html += '</div>';
    return html;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)        payload.filters.status        = state.filters.status;
    if (state.filters.approval_type) payload.filters.approval_type = state.filters.approval_type;
    apiCall('eqms_aml_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.aml_records || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_aml_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.aml_record) { state.record = res.aml_record; state.recordId = id; }
      else state.error = (res && res.message) || 'Not found';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadTabData(tab, action) {
    if (!state.recordId) return;
    apiCall(action, { id: state.recordId }, 'GET').then(function(res) {
      if (res) {
        state.tabData['_' + tab + 'Loaded'] = true;
        if (tab === 'audit')       state.tabData.audit       = res.events || [];
        if (tab === 'comments')    state.tabData.comments    = res.comments || [];
        if (tab === 'attachments') state.tabData.attachments = res.attachments || [];
      }
      refreshUI();
    }).catch(function() { state.tabData['_' + tab + 'Loaded'] = true; refreshUI(); });
  }

  function loadMetrics() {
    apiCall('eqms_aml_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  function runApprovalCheck() {
    var partEl   = _container.querySelector('[data-field="check_part_number"]');
    var vendorEl = _container.querySelector('[data-field="check_vendor_id"]');
    if (!partEl || !partEl.value || !vendorEl || !vendorEl.value) {
      showToast(T({ vi: 'Nhập mã phần và mã NCC', en: 'Enter part number and vendor ID' }), 'warning'); return;
    }
    state.checkForm.part_number = partEl.value;
    state.checkForm.vendor_id   = vendorEl.value;
    state.checkForm.loading = true; state.checkForm.result = null; refreshUI();
    apiCall('eqms_aml_check', { part_number: state.checkForm.part_number, vendor_id: state.checkForm.vendor_id }, 'POST').then(function(res) {
      state.checkForm.loading = false;
      state.checkForm.result  = res || { approved: false };
      refreshUI();
    }).catch(function(err) { state.checkForm.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    if (actionKey === 'block') { var r = prompt(T({ vi: 'Lý do chặn:', en: 'Block reason:' })); if (!r) return; payload.block_reason = r; }
    if (actionKey === 'reject') { var rj = prompt(T({ vi: 'Lý do từ chối:', en: 'Rejection reason:' })); if (!rj) return; payload.rejection_reason = rj; }
    state.loading = true; refreshUI();
    apiCall('eqms_aml_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.aml_record) { state.record = res.aml_record; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.part_number)   errors.part_number   = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.vendor_id)     errors.vendor_id     = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.approval_type) errors.approval_type = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_aml_create', { part_number: d.part_number, part_revision: d.part_revision || null, vendor_id: d.vendor_id, vendor_name: d.vendor_name || null, approval_type: d.approval_type, expiry_date: d.expiry_date || null, approval_scope: d.approval_scope || null, special_conditions: d.special_conditions || null }).then(function(res) {
      state.loading = false;
      if (res && res.aml_record) {
        showToast(T({ vi: 'Tạo mục AML thành công', en: 'AML entry created' }), 'success');
        state.screen = 'detail'; state.recordId = res.aml_record.aml_id; state.record = res.aml_record;
        state.wizardData = {}; state.wizardStep = 0; state.wizardErrors = {};
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  // ─── UI helpers & events ─────────────────────────────────────────────────────

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
    _container.querySelectorAll('[data-field]').forEach(function(el) { var k = el.getAttribute('data-field'); if (k && !k.startsWith('check_')) state.wizardData[k] = el.value || ''; });
  }

  function bindEvents() {
    if (!_container) return;
    _container.addEventListener('click', function(e) {
      var target;
      target = e.target.closest('[data-action="switch-screen"]');
      if (target) {
        var screen = target.getAttribute('data-screen');
        if (screen === 'create') { state.screen = 'create'; state.wizardStep = 0; state.wizardData = {}; state.wizardErrors = {}; }
        else if (screen === 'queue') { state.screen = 'queue'; state.record = null; state.recordId = null; state.items = []; }
        else if (screen === 'check') { state.screen = 'check'; state.checkForm.result = null; }
        else if (screen === 'analytics') { state.screen = 'analytics'; state.metrics = null; }
        else state.screen = screen;
        refreshUI(); return;
      }
      target = e.target.closest('[data-action="open-detail"]');
      if (target) { var id = target.getAttribute('data-id'); state.screen = 'detail'; state.recordId = id; state.record = null; state.activeTab = 'summary'; state.tabData = {}; refreshUI(); return; }
      target = e.target.closest('[data-tab]');
      if (target) { state.activeTab = target.getAttribute('data-tab'); refreshUI(); return; }
      target = e.target.closest('[data-action]');
      if (target) {
        var action = target.getAttribute('data-action');
        var wfActions = ['submit-for-approval','approve','reject','request-info','block','unblock','obsolete'];
        if (wfActions.indexOf(action) !== -1) { executeWorkflowAction(action); return; }
        if (action === 'run-approval-check') { runApprovalCheck(); return; }
        if (action === 'wizard-next') { collectWizardFormData(); if (state.wizardStep < WIZARD_STEPS.length - 1) { state.wizardStep++; refreshUI(); } return; }
        if (action === 'wizard-back') { collectWizardFormData(); if (state.wizardStep > 0) { state.wizardStep--; refreshUI(); } return; }
        if (action === 'wizard-submit') { collectWizardFormData(); submitWizard(); return; }
        if (action === 'apply-filters') { collectFilters(); state.page = 1; state.items = []; loadQueue(); return; }
        if (action === 'reset-filters') { state.filters = {}; state.page = 1; state.items = []; loadQueue(); return; }
        if (action === 'page') { var pg = parseInt(target.getAttribute('data-page'), 10); if (pg > 0) { state.page = pg; state.items = []; loadQueue(); } return; }
        if (action === 'retry-queue') { state.items = []; loadQueue(); return; }
      }
      target = e.target.closest('[data-sort]');
      if (target && state.screen === 'queue') {
        var sk = target.getAttribute('data-sort');
        if (state.sortKey === sk) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortKey = sk; state.sortDir = 'asc'; }
        state.page = 1; state.items = []; loadQueue();
      }
    });
  }

  function collectFilters() {
    if (!_container) return;
    _container.querySelectorAll('[data-filter]').forEach(function(el) { state.filters[el.getAttribute('data-filter')] = el.value || ''; });
  }

  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['aml'] = { render: render, meta: MOD };

})();

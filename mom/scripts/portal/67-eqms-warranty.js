/**
 * EQMS Warranty Claims — IATF 16949 §8.7.1 Customer Warranty & Field Returns
 * HESEM MOM Portal - 67-eqms-warranty.js
 *
 * Archetype: exception-hub
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
    id:        'warranty',
    version:   '1.0.0',
    archetype: 'exception-hub',
    label:     { vi: 'Yêu cầu bảo hành', en: 'Warranty Claims' },
    icon:      '\uD83D\uDD27'
  };

  var WORKFLOW_STATES = ['open','under_investigation','awaiting_parts','parts_received','closed','rejected_claim'];

  var STATE_LABELS = {
    open:                { vi: 'Mở',                  en: 'Open' },
    under_investigation: { vi: 'Đang điều tra',       en: 'Under Investigation' },
    awaiting_parts:      { vi: 'Chờ bộ phận trả về', en: 'Awaiting Return Parts' },
    parts_received:      { vi: 'Đã nhận bộ phận',    en: 'Parts Received' },
    closed:              { vi: 'Đã đóng',             en: 'Closed' },
    rejected_claim:      { vi: 'Từ chối yêu cầu',    en: 'Claim Rejected' }
  };

  var CLAIM_TYPE_OPTIONS = [
    { value: 'field_failure',   label: { vi: 'Hỏng tại hiện trường', en: 'Field Failure' } },
    { value: 'warranty_return', label: { vi: 'Trả hàng bảo hành',   en: 'Warranty Return' } },
    { value: 'goodwill',        label: { vi: 'Thiện chí',            en: 'Goodwill' } },
    { value: 'batch_recall',    label: { vi: 'Thu hồi lô',           en: 'Batch Recall' } },
    { value: 'service_failure', label: { vi: 'Lỗi dịch vụ',         en: 'Service Failure' } }
  ];

  var FAILURE_MODE_OPTIONS = [
    { value: 'early_life',    label: { vi: 'Hỏng sớm (<6 tháng)', en: 'Early Life Failure' } },
    { value: 'random',        label: { vi: 'Ngẫu nhiên',          en: 'Random Failure' } },
    { value: 'wear_out',      label: { vi: 'Mòn',                 en: 'Wear Out' } },
    { value: 'misuse',        label: { vi: 'Sử dụng sai',        en: 'Misuse / Abuse' } },
    { value: 'installation',  label: { vi: 'Lỗi lắp đặt',       en: 'Installation Error' } },
    { value: 'design_defect', label: { vi: 'Lỗi thiết kế',      en: 'Design Defect' } },
    { value: 'manufacturing', label: { vi: 'Lỗi sản xuất',      en: 'Manufacturing Defect' } },
    { value: 'material',      label: { vi: 'Lỗi vật liệu',      en: 'Material Defect' } }
  ];

  var STATE_ACTIONS = {
    open: [
      { action: 'assign',               label: { vi: 'Phân công',         en: 'Assign' },               style: 'secondary' },
      { action: 'record-containment',   label: { vi: 'Ghi nhận ngăn chặn', en: 'Record Containment' },  style: 'secondary' },
      { action: 'reject-claim',         label: { vi: 'Từ chối yêu cầu',   en: 'Reject Claim' },         style: 'ghost' }
    ],
    under_investigation: [
      { action: 'record-root-cause',    label: { vi: 'Ghi nguyên nhân',  en: 'Record Root Cause' },    style: 'secondary' },
      { action: 'link-ncr',             label: { vi: 'Liên kết NCR',     en: 'Link NCR' },             style: 'secondary' },
      { action: 'link-capa',            label: { vi: 'Liên kết CAPA',    en: 'Link CAPA' },            style: 'secondary' },
      { action: 'issue-8d',             label: { vi: 'Phát hành 8D',     en: 'Issue 8D Report' },      style: 'secondary' },
      { action: 'close',                label: { vi: 'Đóng yêu cầu',     en: 'Close Claim' },          style: 'primary' },
      { action: 'reject-claim',         label: { vi: 'Từ chối',           en: 'Reject' },               style: 'ghost' }
    ],
    awaiting_parts: [
      { action: 'record-return-received', label: { vi: 'Đã nhận hàng trả về', en: 'Record Return Received' }, style: 'primary' }
    ],
    parts_received: [
      { action: 'record-root-cause', label: { vi: 'Ghi nguyên nhân', en: 'Record Root Cause' }, style: 'secondary' },
      { action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'primary' }
    ],
    closed: [
      { action: 'reopen', label: { vi: 'Mở lại', en: 'Reopen' }, style: 'ghost' }
    ]
  };

  var DETAIL_TABS = [
    { id: 'summary',       label: { vi: 'Tóm tắt',    en: 'Summary' } },
    { id: 'investigation', label: { vi: 'Điều tra',   en: 'Investigation' } },
    { id: 'financial',     label: { vi: 'Tài chính',  en: 'Financial' } },
    { id: 'related',       label: { vi: 'Liên quan',  en: 'Related' } },
    { id: 'audit',         label: { vi: 'Nhật ký',    en: 'Audit Trail' } },
    { id: 'attachments',   label: { vi: 'Đính kèm',   en: 'Attachments' } },
    { id: 'comments',      label: { vi: 'Bình luận',  en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin khách hàng', en: 'Customer Info' } },
    { label: { vi: 'Chi tiết sự cố',       en: 'Failure Details' } },
    { label: { vi: 'Xem lại & Gửi',       en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'created_at', sortDir: 'desc',
    page: 1, pageSize: 25, items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null, activeTab: 'summary', tabData: {},
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
    var html = '<div class="eqms-module eqms-warranty">';
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
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'Claims' }, icon: '\uD83D\uDD27' },
     { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    if (state.screen === 'queue') html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo yêu cầu', en: 'New Claim' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'claim_type', type: 'select', label: { vi: 'Loại yêu cầu', en: 'Claim Type' }, options: CLAIM_TYPE_OPTIONS },
        { key: 'failure_mode', type: 'select', label: { vi: 'Chế độ hỏng', en: 'Failure Mode' }, options: FAILURE_MODE_OPTIONS },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã, khách hàng, chủ đề...', en: 'ID, customer, subject...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải yêu cầu bảo hành...', en: 'Loading warranty claims...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'claim_number', type: 'id', label: { vi: 'Mã', en: 'Claim ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.claim_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'subject',        label: { vi: 'Chủ đề', en: 'Subject' }, type: 'truncate' },
        { key: 'customer_name',  label: { vi: 'Khách hàng', en: 'Customer' } },
        { key: 'claim_type',     label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'failure_mode',   label: { vi: 'Chế độ hỏng', en: 'Failure Mode' }, type: 'badge' },
        { key: 'claim_amount',   label: { vi: 'Giá trị', en: 'Amount' }, type: 'currency' },
        { key: 'status',         label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'created_at',     label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : ui.renderEmptyState({ icon: '\uD83D\uDD27', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.claim_number, title: r.subject,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.assigned_to || r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Khách hàng', en: 'Customer' }, value: r.customer_name },
           { label: { vi: 'Loại', en: 'Type' }, value: r.claim_type },
           { label: { vi: 'Giá trị', en: 'Amount' }, value: r.claim_amount ? '$' + fmt(r.claim_amount) : '\u2014' }
         ]
    });
    html += ui.renderStateTimeline(['open','under_investigation','closed'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':       return renderSummaryTab(r);
      case 'investigation': return renderInvestigationTab(r);
      case 'financial':     return renderFinancialTab(r);
      case 'related':       return ui.renderRelationshipsPanel(state.tabData.relationships || [], {});
      case 'audit':         return renderStdTab('audit', 'eqms_warranty_audit', r);
      case 'attachments':   return renderStdTab('attachments', 'eqms_warranty_attachments', r);
      case 'comments':      return renderStdTab('comments', 'eqms_warranty_comments', r);
      default:              return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin yêu cầu', en: 'Claim Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã yêu cầu', en: 'Claim ID' }, value: r.claim_number, mono: true },
        { label: { vi: 'Chủ đề', en: 'Subject' }, value: r.subject },
        { label: { vi: 'Khách hàng', en: 'Customer' }, value: r.customer_name },
        { label: { vi: 'Mã khách hàng', en: 'Customer ID' }, value: r.customer_id, mono: true },
        { label: { vi: 'Loại yêu cầu', en: 'Claim Type' }, value: r.claim_type, badge: true },
        { label: { vi: 'Chế độ hỏng', en: 'Failure Mode' }, value: r.failure_mode, badge: true },
        { label: { vi: 'Mã phần bị ảnh hưởng', en: 'Affected Part' }, value: r.affected_part_number, mono: true },
        { label: { vi: 'Số lô ảnh hưởng', en: 'Affected Lot' }, value: r.affected_lot_number, mono: true },
        { label: { vi: 'SL hỏng', en: 'Failure Qty' }, value: fmt(r.failure_quantity) },
        { label: { vi: 'Ngày hỏng', en: 'Failure Date' }, value: fmtDate(r.failure_date) },
        { label: { vi: 'Ngày nhận', en: 'Received Date' }, value: fmtDate(r.received_date) },
        { label: { vi: 'Phân công', en: 'Assigned To' }, value: r.assigned_to },
        { label: { vi: 'Trạng thái', en: 'Status' }, value: T(STATE_LABELS[r.status] || { en: r.status }), badge: true }
      ])
    );
  }

  function renderInvestigationTab(r) {
    return ui.renderSection({ vi: 'Điều tra & Nguyên nhân', en: 'Investigation & Root Cause' },
      ui.renderFieldGrid([
        { label: { vi: 'Mô tả hỏng hóc', en: 'Failure Description' }, value: r.failure_description },
        { label: { vi: 'Nguyên nhân gốc rễ', en: 'Root Cause' }, value: r.root_cause },
        { label: { vi: 'Hành động ngăn chặn', en: 'Containment Action' }, value: r.containment_action },
        { label: { vi: 'Biện pháp khắc phục', en: 'Corrective Action' }, value: r.corrective_action },
        { label: { vi: 'NCR liên kết', en: 'Linked NCR' }, value: r.linked_ncr_id, mono: true },
        { label: { vi: 'CAPA liên kết', en: 'Linked CAPA' }, value: r.linked_capa_id, mono: true },
        { label: { vi: 'Báo cáo 8D', en: '8D Report Ref' }, value: r.report_8d_ref },
        { label: { vi: 'Ghi chú đóng', en: 'Closure Notes' }, value: r.closure_notes }
      ])
    );
  }

  function renderFinancialTab(r) {
    return ui.renderSection({ vi: 'Thông tin tài chính', en: 'Financial Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Giá trị yêu cầu', en: 'Claim Amount' }, value: r.claim_amount != null ? '$' + fmt(r.claim_amount) : '\u2014' },
        { label: { vi: 'Đồng tiền', en: 'Currency' }, value: r.claim_currency },
        { label: { vi: 'Phê duyệt bồi thường', en: 'Approved Settlement' }, value: r.approved_settlement_amount != null ? '$' + fmt(r.approved_settlement_amount) : '\u2014' },
        { label: { vi: 'Chi phí thực tế', en: 'Actual Cost' }, value: r.actual_cost != null ? '$' + fmt(r.actual_cost) : '\u2014' },
        { label: { vi: 'Loại bồi thường', en: 'Settlement Type' }, value: r.settlement_type }
      ])
    );
  }

  function renderStdTab(tabId, action, r) {
    if (!state.tabData['_' + tabId + 'Loaded']) { loadTabData(tabId, action); return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); }
    var data = state.tabData[tabId] || [];
    if (tabId === 'audit')       return ui.renderAuditTrail(data);
    if (tabId === 'attachments') return ui.renderAttachmentsGrid(data, { readonly: r && r.status === 'closed' });
    if (tabId === 'comments')    return ui.renderCommentsThread(data, { readonly: r && r.status === 'closed' });
    return '';
  }

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo yêu cầu bảo hành mới', en: 'New Warranty Claim' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), { saveDraft: false });
    html += '</div>';
    return html;
  }

  function renderWizardStep(step) {
    var d = state.wizardData; var e = state.wizardErrors;
    switch (step) {
      case 0: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'subject', label: { vi: 'Chủ đề', en: 'Subject' }, type: 'text', required: true, value: d.subject || '', error: e.subject }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'customer_name', label: { vi: 'Tên khách hàng', en: 'Customer Name' }, type: 'text', required: true, value: d.customer_name || '', error: e.customer_name }) +
          ui.renderFormField({ key: 'customer_id', label: { vi: 'Mã khách hàng', en: 'Customer ID' }, type: 'text', value: d.customer_id || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'received_date', label: { vi: 'Ngày nhận yêu cầu', en: 'Received Date' }, type: 'date', required: true, value: d.received_date || '', error: e.received_date }) +
          ui.renderFormField({ key: 'claim_type', label: { vi: 'Loại yêu cầu', en: 'Claim Type' }, type: 'select', required: true, value: d.claim_type || '', options: CLAIM_TYPE_OPTIONS, error: e.claim_type }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'failure_mode', label: { vi: 'Chế độ hỏng', en: 'Failure Mode' }, type: 'select', value: d.failure_mode || '', options: FAILURE_MODE_OPTIONS }) +
          ui.renderFormField({ key: 'failure_date', label: { vi: 'Ngày hỏng', en: 'Failure Date' }, type: 'date', value: d.failure_date || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'affected_part_number', label: { vi: 'Mã phần bị ảnh hưởng', en: 'Affected Part Number' }, type: 'text', value: d.affected_part_number || '' }) +
          ui.renderFormField({ key: 'affected_lot_number', label: { vi: 'Số lô bị ảnh hưởng', en: 'Affected Lot Number' }, type: 'text', value: d.affected_lot_number || '' }) +
          ui.renderFormField({ key: 'failure_quantity', label: { vi: 'Số lượng hỏng', en: 'Failure Qty' }, type: 'number', value: d.failure_quantity || '', min: 0 }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'failure_description', label: { vi: 'Mô tả hỏng hóc', en: 'Failure Description' }, type: 'textarea', value: d.failure_description || '' }) +
          ui.renderFormField({ key: 'claim_amount', label: { vi: 'Giá trị yêu cầu', en: 'Claim Amount ($)' }, type: 'number', value: d.claim_amount || '', min: 0, step: '0.01' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Khách hàng', en: 'Customer' }, ui.renderFieldGrid([
          { label: { vi: 'Chủ đề', en: 'Subject' }, value: d.subject },
          { label: { vi: 'Khách hàng', en: 'Customer' }, value: d.customer_name },
          { label: { vi: 'Ngày nhận', en: 'Received' }, value: fmtDate(d.received_date) },
          { label: { vi: 'Loại', en: 'Type' }, value: d.claim_type }
        ])) +
        ui.renderSection({ vi: 'Sự cố', en: 'Failure' }, ui.renderFieldGrid([
          { label: { vi: 'Mã phần', en: 'Part' }, value: d.affected_part_number },
          { label: { vi: 'Số lô', en: 'Lot' }, value: d.affected_lot_number },
          { label: { vi: 'SL hỏng', en: 'Qty Failed' }, value: fmt(d.failure_quantity) },
          { label: { vi: 'Giá trị', en: 'Amount' }, value: d.claim_amount ? '$' + d.claim_amount : '\u2014' }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Đang mở', en: 'Open Claims' }, value: fmt(m.open_count || 0), accent: m.open_count > 5 ? 'danger' : '' },
      { label: { vi: 'Tổng giá trị mở', en: 'Open Claim Value' }, value: m.open_claim_amount != null ? '$' + fmt(m.open_claim_amount) : '\u2014' },
      { label: { vi: 'TB ngày xử lý', en: 'Avg Cycle Days' }, value: m.avg_cycle_time_days != null ? m.avg_cycle_time_days.toFixed(1) : '\u2014' },
      { label: { vi: 'Đã đóng YTD', en: 'Closed YTD' }, value: fmt(m.closed_ytd || 0) }
    ]);
    html += ui.renderChartWithTableFallback('chart-warranty-by-type', null,
      [{ key: 'claim_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_type || [], { defaultMode: 'table' });
    html += ui.renderChartWithTableFallback('chart-warranty-by-failure', null,
      [{ key: 'failure_mode', label: { vi: 'Chế độ hỏng', en: 'Failure Mode' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_failure_mode || [], { defaultMode: 'table' });
    html += '</div>';
    return html;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)       payload.filters.status       = state.filters.status;
    if (state.filters.claim_type)   payload.filters.claim_type   = state.filters.claim_type;
    if (state.filters.failure_mode) payload.filters.failure_mode = state.filters.failure_mode;
    apiCall('eqms_warranty_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.warranty_claims || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_warranty_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.warranty_claim) { state.record = res.warranty_claim; state.recordId = id; }
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
    apiCall('eqms_warranty_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    if (actionKey === 'reject-claim') { var r = prompt(T({ vi: 'Lý do từ chối:', en: 'Rejection reason:' })); if (!r) return; payload.rejection_reason = r; }
    if (actionKey === 'record-root-cause') { var rc = prompt(T({ vi: 'Nguyên nhân gốc rễ:', en: 'Root cause:' })); if (!rc) return; payload.root_cause = rc; }
    if (actionKey === 'assign') { var a = prompt(T({ vi: 'Phân công cho:', en: 'Assign to:' })); if (!a) return; payload.assigned_to = a; }
    if (actionKey === 'reopen') { var rr = prompt(T({ vi: 'Lý do mở lại:', en: 'Reopen reason:' })); if (!rr) return; payload.reopen_reason = rr; }
    state.loading = true; refreshUI();
    apiCall('eqms_warranty_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.warranty_claim) { state.record = res.warranty_claim; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.subject)        errors.subject        = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.customer_name)  errors.customer_name  = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.received_date)  errors.received_date  = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.claim_type)     errors.claim_type     = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_warranty_create', { subject: d.subject, customer_name: d.customer_name, customer_id: d.customer_id || null, claim_type: d.claim_type, received_date: d.received_date, failure_mode: d.failure_mode || null, affected_part_number: d.affected_part_number || null, affected_lot_number: d.affected_lot_number || null, failure_quantity: d.failure_quantity ? parseInt(d.failure_quantity, 10) : null, failure_date: d.failure_date || null, failure_description: d.failure_description || null, claim_amount: d.claim_amount ? parseFloat(d.claim_amount) : null }).then(function(res) {
      state.loading = false;
      if (res && res.warranty_claim) {
        showToast(T({ vi: 'Tạo yêu cầu thành công', en: 'Claim created' }), 'success');
        state.screen = 'detail'; state.recordId = res.warranty_claim.claim_id; state.record = res.warranty_claim;
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
    _container.querySelectorAll('[data-field]').forEach(function(el) { var k = el.getAttribute('data-field'); if (k) state.wizardData[k] = el.value || ''; });
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
        var wfActions = ['assign','record-containment','reject-claim','record-root-cause','link-ncr','link-capa','issue-8d','close','record-return-received','reopen'];
        if (wfActions.indexOf(action) !== -1) { executeWorkflowAction(action); return; }
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
  window.EqmsModules['warranty'] = { render: render, meta: MOD };

})();

/**
 * EQMS Customer Complaints — Exception Hub + Object Page
 * HESEM MOM Portal - 42-eqms-complaints.js
 *
 * Authority: Standard 36 - Frontend Module Layout Template Standard
 * Archetype: exception-hub (queue + detail + create wizard + analytics)
 * Depends: 40-eqms-shell.js (EqmsShell.ui.*, EqmsShell.util.*)
 *
 * Regulatory: FDA 21 CFR 820.198, ISO 13485 8.2.2, IATF 16949 10.2.3
 * State machine: draft -> open -> under_investigation -> response_issued -> closed
 *
 * @since 4.0.0
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

  // =========================================================================
  // MODULE META
  // =========================================================================
  var MOD = {
    id:        'complaints',
    version:   '1.0.0',
    archetype: 'exception-hub',
    label:     { vi: 'Khieu nai khach hang', en: 'Customer Complaints' },
    icon:      '\uD83D\uDCE2'
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var WORKFLOW_STATES = ['draft', 'open', 'under_investigation', 'response_issued', 'closed'];

  var STATE_LABELS = {
    draft:               { vi: 'Nháp',              en: 'Draft' },
    open:                { vi: 'Mở',                en: 'Open' },
    under_investigation: { vi: 'Đang điều tra',     en: 'Under Investigation' },
    response_issued:     { vi: 'Đã phản hồi',      en: 'Response Issued' },
    closed:              { vi: 'Đóng',              en: 'Closed' },
    reopened:            { vi: 'Mở lại',            en: 'Reopened' }
  };

  var SEVERITY_OPTIONS = [
    { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } },
    { value: 'major',    label: { vi: 'Lớn',          en: 'Major' } },
    { value: 'minor',    label: { vi: 'Nhỏ',          en: 'Minor' } }
  ];

  var CATEGORY_OPTIONS = [
    { value: 'product_defect',       label: { vi: 'Lỗi sản phẩm',          en: 'Product Defect' } },
    { value: 'packaging',            label: { vi: 'Bao bì / Đóng gói',     en: 'Packaging' } },
    { value: 'labeling',             label: { vi: 'Nhãn mác',              en: 'Labeling' } },
    { value: 'contamination',        label: { vi: 'Nhiễm bẩn',            en: 'Contamination' } },
    { value: 'documentation',        label: { vi: 'Tài liệu',             en: 'Documentation' } },
    { value: 'delivery',             label: { vi: 'Giao hàng',            en: 'Delivery / Logistics' } },
    { value: 'performance',          label: { vi: 'Hiệu suất sản phẩm',  en: 'Product Performance' } },
    { value: 'regulatory',           label: { vi: 'Quy định / Pháp lý',  en: 'Regulatory' } },
    { value: 'safety',               label: { vi: 'An toàn',              en: 'Safety' } },
    { value: 'service',              label: { vi: 'Dịch vụ',              en: 'Service' } },
    { value: 'other',                label: { vi: 'Khác',                 en: 'Other' } }
  ];

  var SOURCE_OPTIONS = [
    { value: 'customer_direct',  label: { vi: 'Khách hàng trực tiếp', en: 'Customer Direct' } },
    { value: 'sales_rep',        label: { vi: 'Đại diện bán hàng',    en: 'Sales Representative' } },
    { value: 'field_report',     label: { vi: 'Báo cáo thực địa',     en: 'Field Report' } },
    { value: 'regulatory_body',  label: { vi: 'Cơ quan quản lý',      en: 'Regulatory Body' } },
    { value: 'social_media',     label: { vi: 'Mạng xã hội',          en: 'Social Media' } },
    { value: 'internal_audit',   label: { vi: 'Kiểm toán nội bộ',     en: 'Internal Audit' } },
    { value: 'warranty_claim',   label: { vi: 'Yêu cầu bảo hành',    en: 'Warranty Claim' } }
  ];

  var DETECTION_OPTIONS = [
    { value: 'incoming_inspection', label: { vi: 'Kiểm tra đầu vào',       en: 'Incoming Inspection' } },
    { value: 'in_process',          label: { vi: 'Trong quá trình sử dụng', en: 'In-Process / In-Use' } },
    { value: 'final_inspection',    label: { vi: 'Kiểm tra cuối',           en: 'Final Inspection' } },
    { value: 'field_failure',       label: { vi: 'Hỏng tại hiện trường',    en: 'Field Failure' } },
    { value: 'customer_report',     label: { vi: 'Khách hàng báo cáo',      en: 'Customer Report' } },
    { value: 'audit_finding',       label: { vi: 'Phát hiện đánh giá',      en: 'Audit Finding' } }
  ];

  var PRIORITY_OPTIONS = [
    { value: 'urgent',  label: { vi: 'Khẩn cấp', en: 'Urgent' } },
    { value: 'high',    label: { vi: 'Cao',       en: 'High' } },
    { value: 'medium',  label: { vi: 'Trung bình', en: 'Medium' } },
    { value: 'low',     label: { vi: 'Thấp',      en: 'Low' } }
  ];

  // State -> allowed workflow actions
  var STATE_ACTIONS = {
    draft:               [
      { action: 'intake', label: { vi: 'Tiếp nhận', en: 'Intake' }, style: 'primary' }
    ],
    open: [
      { action: 'triage',              label: { vi: 'Phân loại',       en: 'Triage' },              style: 'secondary' },
      { action: 'assign',              label: { vi: 'Phân công',       en: 'Assign' },              style: 'secondary' },
      { action: 'record-containment',  label: { vi: 'Ghi nhận ngăn chặn', en: 'Record Containment' }, style: 'secondary' },
      { action: 'start-investigation', label: { vi: 'Bắt đầu điều tra',  en: 'Start Investigation' }, style: 'primary' }
    ],
    under_investigation: [
      { action: 'record-containment',  label: { vi: 'Ghi nhận ngăn chặn',  en: 'Record Containment' },    style: 'secondary' },
      { action: 'link-capa',           label: { vi: 'Liên kết CAPA',       en: 'Link CAPA' },              style: 'secondary' },
      { action: 'initiate-field-action', label: { vi: 'Hành động thực địa', en: 'Initiate Field Action' }, style: 'secondary' },
      { action: 'issue-response',      label: { vi: 'Phát hành phản hồi',  en: 'Issue Response' },         style: 'primary' }
    ],
    response_issued: [
      { action: 'close',  label: { vi: 'Đóng',    en: 'Close' },  style: 'primary' },
      { action: 'reopen', label: { vi: 'Mở lại',  en: 'Reopen' }, style: 'ghost' }
    ],
    closed: [
      { action: 'reopen', label: { vi: 'Mở lại', en: 'Reopen' }, style: 'ghost' }
    ],
    reopened: [
      { action: 'triage',              label: { vi: 'Phân loại',        en: 'Triage' },              style: 'secondary' },
      { action: 'assign',              label: { vi: 'Phân công',        en: 'Assign' },              style: 'secondary' },
      { action: 'start-investigation', label: { vi: 'Bắt đầu điều tra', en: 'Start Investigation' }, style: 'primary' }
    ]
  };

  var DETAIL_TABS = [
    { id: 'summary',       label: { vi: 'Tóm tắt',         en: 'Summary' } },
    { id: 'containment',   label: { vi: 'Ngăn chặn',       en: 'Containment' } },
    { id: 'investigation', label: { vi: 'Điều tra',         en: 'Investigation' } },
    { id: 'response',      label: { vi: 'Phản hồi KH',     en: 'Response' } },
    { id: 'related',       label: { vi: 'Bản ghi liên quan', en: 'Related Records' } },
    { id: 'audit',         label: { vi: 'Nhật ký',          en: 'Audit Trail' } },
    { id: 'signatures',    label: { vi: 'Chữ ký',           en: 'Signatures' } },
    { id: 'attachments',   label: { vi: 'Đính kèm',        en: 'Attachments' } },
    { id: 'comments',      label: { vi: 'Bình luận',       en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin khách hàng', en: 'Customer Information' } },
    { label: { vi: 'Chi tiết khiếu nại',   en: 'Complaint Details' } },
    { label: { vi: 'Phân loại',            en: 'Classification' } },
    { label: { vi: 'Đánh giá ban đầu',    en: 'Initial Assessment' } },
    { label: { vi: 'Xem lại & Gửi',       en: 'Review & Submit' } }
  ];

  // =========================================================================
  // MODULE STATE
  // =========================================================================
  var state = {
    screen: 'queue',        // queue | detail | create | analytics
    // Queue state
    filters: {},
    sortKey: 'created_at',
    sortDir: 'desc',
    page: 1,
    pageSize: 25,
    items: [],
    totalItems: 0,
    selectedIds: [],
    loading: false,
    error: null,
    // Detail state
    recordId: null,
    record: null,
    activeTab: 'summary',
    tabData: {},
    // Wizard state
    wizardStep: 0,
    wizardData: {},
    wizardErrors: {},
    // Analytics state
    metrics: null
  };

  // =========================================================================
  // RENDER ENTRY POINT
  // =========================================================================
  function render(container, context) {
    context = context || {};
    if (context.recordId) {
      state.screen = 'detail';
      state.recordId = context.recordId;
    }
    _container = container;
    renderScreen();
  }

  var _container = null;

  function renderScreen() {
    if (!_container) return;
    var html = '<div class="eqms-module eqms-complaints">';

    // Top toolbar
    html += renderToolbar();

    // Screen content
    switch (state.screen) {
      case 'queue':
        html += renderQueueView();
        break;
      case 'detail':
        html += renderDetailView();
        break;
      case 'create':
        html += renderCreateView();
        break;
      case 'analytics':
        html += renderAnalyticsView();
        break;
    }
    html += '</div>';
    _container.innerHTML = html;

    bindEvents();

    // Auto-load data
    if (state.screen === 'queue' && !state.items.length && !state.loading) {
      loadQueue();
    }
    if (state.screen === 'detail' && state.recordId && !state.record) {
      loadDetail(state.recordId);
    }
    if (state.screen === 'analytics' && !state.metrics) {
      loadMetrics();
    }
  }

  // =========================================================================
  // TOOLBAR
  // =========================================================================
  function renderToolbar() {
    var html = '<div class="eqms-module-toolbar">';
    html += '<div class="eqms-module-toolbar-left">';

    // Screen switcher tabs
    var screens = [
      { id: 'queue',     label: { vi: 'Danh sách',    en: 'Queue' },     icon: '\uD83D\uDCCB' },
      { id: 'analytics', label: { vi: 'Phân tích',    en: 'Analytics' }, icon: '\uD83D\uDCCA' }
    ];
    screens.forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">';
      html += s.icon + ' ' + esc(T(s.label));
      html += '</button>';
    });
    html += '</div>';

    html += '<div class="eqms-module-toolbar-right">';
    if (state.screen === 'queue') {
      html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    }
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">';
    html += '+ ' + T({ vi: 'Tạo khiếu nại', en: 'New Complaint' });
    html += '</button>';
    html += '</div></div>';
    return html;
  }

  // =========================================================================
  // SCREEN 1: QUEUE VIEW
  // =========================================================================
  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      savedViews: true,
      fields: [
        {
          key: 'status', type: 'select',
          label: { vi: 'Trạng thái', en: 'Status' },
          options: [
            { value: 'draft',               label: STATE_LABELS.draft },
            { value: 'open',                label: STATE_LABELS.open },
            { value: 'under_investigation', label: STATE_LABELS.under_investigation },
            { value: 'response_issued',     label: STATE_LABELS.response_issued },
            { value: 'closed',              label: STATE_LABELS.closed },
            { value: 'reopened',            label: STATE_LABELS.reopened }
          ]
        },
        {
          key: 'severity', type: 'select',
          label: { vi: 'Mức độ', en: 'Severity' },
          options: SEVERITY_OPTIONS
        },
        {
          key: 'category', type: 'select',
          label: { vi: 'Phân loại', en: 'Category' },
          options: CATEGORY_OPTIONS
        },
        {
          key: 'date_from', type: 'date',
          label: { vi: 'Từ ngày', en: 'From' }
        },
        {
          key: 'date_to', type: 'date',
          label: { vi: 'Đến ngày', en: 'To' }
        },
        {
          key: 'search', type: 'text',
          label: { vi: 'Tìm kiếm', en: 'Search' },
          placeholder: { vi: 'Mã, khách hàng, chủ đề...', en: 'ID, customer, subject...' },
          width: '220px'
        }
      ]
    });

    // Bulk actions bar
    if (state.selectedIds.length > 0) {
      html += '<div class="eqms-bulk-bar">';
      html += '<span>' + fmt(state.selectedIds.length) + ' ' + T({ vi: 'đã chọn', en: 'selected' }) + '</span>';
      html += '<button class="eqms-btn secondary sm" data-action="bulk-assign">' + T({ vi: 'Phân công', en: 'Assign' }) + '</button>';
      html += '<button class="eqms-btn secondary sm" data-action="bulk-priority">' + T({ vi: 'Đổi ưu tiên', en: 'Change Priority' }) + '</button>';
      html += '<button class="eqms-btn secondary sm" data-action="bulk-export">' + T({ vi: 'Xuất', en: 'Export' }) + '</button>';
      html += '<button class="eqms-btn ghost sm" data-action="clear-selection">' + T({ vi: 'Bỏ chọn', en: 'Clear' }) + '</button>';
      html += '</div>';
    }

    // Loading / error / data
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải danh sách khiếu nại...', en: 'Loading complaints...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      // Data grid
      var columns = [
        {
          key: 'complaint_number', type: 'id',
          label: { vi: 'Mã', en: 'ID' },
          render: function(val, row) {
            return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.complaint_id || row.id) + '">' + esc(val || '---') + '</a>';
          }
        },
        { key: 'customer_name', label: { vi: 'Khách hàng', en: 'Customer' } },
        { key: 'subject',       label: { vi: 'Chủ đề', en: 'Subject' }, type: 'truncate' },
        { key: 'severity',      label: { vi: 'Mức độ', en: 'Severity' }, type: 'badge' },
        { key: 'status',        label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'category',      label: { vi: 'Phân loại', en: 'Category' } },
        { key: 'assigned_to',   label: { vi: 'Phân công', en: 'Assigned To' } },
        { key: 'received_date', label: { vi: 'Ngày nhận', en: 'Received' }, type: 'date' },
        { key: 'created_at',    label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
      ];

      html += ui.renderDataGrid(columns, state.items, {
        selectable: true,
        sortKey: state.sortKey,
        sortDir: state.sortDir
      });

      // Pagination
      html += ui.renderPagination({
        total: state.totalItems,
        offset: (state.page - 1) * state.pageSize,
        limit: state.pageSize
      });
    }

    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN 2: DETAIL VIEW
  // =========================================================================
  function renderDetailView() {
    if (!state.record) {
      return state.loading
        ? ui.renderLoadingState({ vi: 'Đang tải khiếu nại...', en: 'Loading complaint...' })
        : ui.renderEmptyState({ icon: '\uD83D\uDCE2', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }

    var r = state.record;
    var html = '<div class="eqms-detail-view">';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to Queue' });
    html += '</button></div>';

    // Identity header
    html += ui.renderIdentityHeader({
      record_id: r.complaint_number,
      title: r.subject,
      status: r.status,
      status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.assigned_to,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      version: r.version,
      priority: r.priority
    }, {
      actions: STATE_ACTIONS[r.status] || [],
      extraMeta: [
        { label: { vi: 'Khách hàng', en: 'Customer' }, value: r.customer_name },
        { label: { vi: 'Mức độ', en: 'Severity' }, value: r.severity },
        { label: { vi: 'Ngày nhận', en: 'Received' }, value: fmtDate(r.received_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(WORKFLOW_STATES, r.status === 'reopened' ? 'open' : r.status);

    // Tabs
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    html += renderTabContent(state.activeTab, r);
    html += '</div>';

    html += '</div>';
    return html;
  }

  // -------------------------------------------------------------------------
  // Tab content router
  // -------------------------------------------------------------------------
  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':       return renderSummaryTab(r);
      case 'containment':   return renderContainmentTab(r);
      case 'investigation': return renderInvestigationTab(r);
      case 'response':      return renderResponseTab(r);
      case 'related':       return renderRelatedTab();
      case 'audit':         return renderAuditTab();
      case 'signatures':    return renderSignaturesTab();
      case 'attachments':   return renderAttachmentsTab();
      case 'comments':      return renderCommentsTab();
      default:              return '';
    }
  }

  // ── Tab a) Summary ──────────────────────────────────────────────────────
  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin khiếu nại', en: 'Complaint Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã khiếu nại',      en: 'Complaint ID' },      value: r.complaint_number, mono: true },
        { label: { vi: 'Khách hàng',         en: 'Customer' },          value: r.customer_name },
        { label: { vi: 'Mã khách hàng',      en: 'Customer ID' },       value: r.customer_id, mono: true },
        { label: { vi: 'Chủ đề',             en: 'Subject' },           value: r.subject },
        { label: { vi: 'Mô tả',              en: 'Description' },       value: r.description },
        { label: { vi: 'Phân loại',          en: 'Category' },          value: r.category, badge: true },
        { label: { vi: 'Mức độ nghiêm trọng', en: 'Severity' },        value: r.severity, badge: true },
        { label: { vi: 'Nguồn phát hiện',    en: 'Source' },            value: r.source },
        { label: { vi: 'Phương pháp phát hiện', en: 'Detection Method' }, value: r.detection_method },
        { label: { vi: 'Ngày nhận',          en: 'Date Received' },     value: fmtDate(r.received_date) },
        { label: { vi: 'Sản phẩm',           en: 'Product' },           value: r.product_name || r.product_id },
        { label: { vi: 'Số lô',              en: 'Lot / Batch' },       value: r.lot_number, mono: true },
        { label: { vi: 'Bộ phận',            en: 'Department' },        value: r.department },
        { label: { vi: 'Phân công cho',       en: 'Assigned To' },      value: r.assigned_to },
        { label: { vi: 'Trạng thái',         en: 'Status' },            value: T(STATE_LABELS[r.status] || { en: r.status }), badge: true },
        { label: { vi: 'Phiên bản',          en: 'Version' },           value: r.version }
      ])
    );
  }

  // ── Tab b) Containment ──────────────────────────────────────────────────
  function renderContainmentTab(r) {
    var containmentData = state.tabData.containment || [];
    var html = '';

    // Main containment action from the record
    if (r.containment_action) {
      html += ui.renderSection({ vi: 'Hành động ngăn chặn hiện tại', en: 'Current Containment Action' },
        ui.renderFieldGrid([
          { label: { vi: 'Hành động',   en: 'Action' },     value: r.containment_action },
          { label: { vi: 'Ngày',        en: 'Date' },       value: fmtDate(r.containment_date) },
          { label: { vi: 'Người thực hiện', en: 'Recorded By' }, value: r.updated_by }
        ])
      );
    }

    // Containment actions table
    var columns = [
      { key: 'action',     label: { vi: 'Hành động', en: 'Action' } },
      { key: 'owner',      label: { vi: 'Chủ sở hữu', en: 'Owner' } },
      { key: 'target_date', label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, type: 'date' },
      { key: 'status',     label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'completed_date', label: { vi: 'Ngày hoàn thành', en: 'Completed' }, type: 'date' }
    ];

    html += ui.renderSection({ vi: 'Bảng hành động ngăn chặn', en: 'Containment Actions Log' },
      ui.renderDataGrid(columns, containmentData, { selectable: false })
    );

    // Add containment form (only if status allows)
    if (['open', 'under_investigation', 'reopened'].indexOf(r.status) !== -1) {
      html += ui.renderSection({ vi: 'Thêm hành động ngăn chặn', en: 'Add Containment Action' },
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'containment_action', label: { vi: 'Mô tả hành động', en: 'Action Description' }, type: 'textarea', required: true, placeholder: { vi: 'Mô tả hành động ngăn chặn...', en: 'Describe the containment action...' } }) +
          ui.renderFormField({ key: 'containment_date', label: { vi: 'Ngày thực hiện', en: 'Action Date' }, type: 'date' }) +
        '</div>' +
        '<button class="eqms-btn primary sm" data-action="record-containment">' + T({ vi: 'Ghi nhận', en: 'Record' }) + '</button>'
      );
    }

    return html;
  }

  // ── Tab c) Investigation ────────────────────────────────────────────────
  function renderInvestigationTab(r) {
    var html = '';

    html += ui.renderSection({ vi: 'Phân tích nguyên nhân gốc rễ', en: 'Root Cause Analysis' },
      ui.renderFieldGrid([
        { label: { vi: 'Kế hoạch điều tra',  en: 'Investigation Plan' },  value: r.investigation_plan },
        { label: { vi: 'Tóm tắt điều tra',   en: 'Investigation Summary' }, value: r.investigation_summary },
        { label: { vi: 'Nguyên nhân gốc rễ', en: 'Root Cause' },          value: r.root_cause },
        { label: { vi: 'Phương pháp',        en: 'Methodology' },         value: r.investigation_method },
        { label: { vi: 'CAPA liên kết',      en: 'Linked CAPA' },         value: r.capa_id, mono: true },
        { label: { vi: 'Hành động thực địa',  en: 'Field Action' },       value: r.field_action_id, mono: true }
      ])
    );

    // Investigation notes (editable during investigation)
    if (['open', 'under_investigation', 'reopened'].indexOf(r.status) !== -1) {
      html += ui.renderSection({ vi: 'Ghi chú điều tra', en: 'Investigation Notes' },
        '<div class="eqms-form-row">' +
          ui.renderFormField({
            key: 'investigation_notes',
            label: { vi: 'Ghi chú', en: 'Notes' },
            type: 'textarea',
            value: r.investigation_summary || '',
            placeholder: { vi: 'Nhập ghi chú điều tra, phát hiện...', en: 'Enter investigation notes, findings...' }
          }) +
        '</div>' +
        '<button class="eqms-btn secondary sm" data-action="save-investigation-notes">' +
          T({ vi: 'Lưu ghi chú', en: 'Save Notes' }) +
        '</button>'
      );
    }

    // Linked evidence
    html += ui.renderSection(
      { vi: 'Bằng chứng liên kết', en: 'Linked Evidence' },
      (state.tabData.evidence && state.tabData.evidence.length)
        ? ui.renderDataGrid(
            [
              { key: 'type',        label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
              { key: 'reference',   label: { vi: 'Tham chiếu', en: 'Reference' }, mono: true },
              { key: 'description', label: { vi: 'Mô tả', en: 'Description' } },
              { key: 'added_at',    label: { vi: 'Ngày thêm', en: 'Added' }, type: 'date' }
            ],
            state.tabData.evidence,
            { selectable: false }
          )
        : ui.renderEmptyState({ icon: '\uD83D\uDD0D', title: { vi: 'Chưa có bằng chứng', en: 'No evidence linked' } }),
      { headerActions: '<button class="eqms-btn ghost sm" data-action="add-evidence">+ ' + T({ vi: 'Thêm', en: 'Add' }) + '</button>' }
    );

    return html;
  }

  // ── Tab d) Response ─────────────────────────────────────────────────────
  function renderResponseTab(r) {
    var html = '';

    // Customer response preview
    html += ui.renderSection({ vi: 'Phản hồi khách hàng', en: 'Customer Response' },
      r.customer_response
        ? '<div class="eqms-response-preview">' +
            ui.renderFieldGrid([
              { label: { vi: 'Nội dung phản hồi', en: 'Response Content' }, value: r.customer_response },
              { label: { vi: 'Ngày phản hồi', en: 'Response Date' }, value: fmtDate(r.response_date) },
              { label: { vi: 'Phương thức', en: 'Method' }, value: r.response_method },
              { label: { vi: 'Người phản hồi', en: 'Responded By' }, value: r.updated_by }
            ]) +
          '</div>'
        : ui.renderEmptyState({
            icon: '\uD83D\uDCE8',
            title: { vi: 'Chưa phát hành phản hồi', en: 'No response issued yet' },
            desc: { vi: 'Phản hồi sẽ được tạo khi thực hiện hành động "Phát hành phản hồi"', en: 'Response will be created when "Issue Response" action is performed' }
          })
    );

    // Satisfaction tracking
    html += ui.renderSection({ vi: 'Theo dõi hài lòng', en: 'Satisfaction Tracking' },
      ui.renderFieldGrid([
        { label: { vi: 'Phản hồi của khách hàng', en: 'Customer Feedback' }, value: r.customer_feedback },
        { label: { vi: 'Điểm hài lòng', en: 'Satisfaction Score' }, value: r.satisfaction_score },
        { label: { vi: 'Ngày theo dõi', en: 'Follow-up Date' }, value: fmtDate(r.followup_date) },
        { label: { vi: 'Tình trạng theo dõi', en: 'Follow-up Status' }, value: r.followup_status, badge: true }
      ])
    );

    // Issue response form (during investigation)
    if (r.status === 'under_investigation') {
      html += ui.renderSection({ vi: 'Soạn phản hồi', en: 'Draft Response' },
        '<div class="eqms-form-row">' +
          ui.renderFormField({
            key: 'customer_response',
            label: { vi: 'Nội dung phản hồi', en: 'Response Content' },
            type: 'textarea', required: true,
            placeholder: { vi: 'Nhập nội dung phản hồi cho khách hàng...', en: 'Enter customer response content...' }
          }) +
          ui.renderFormField({
            key: 'response_method', type: 'select',
            label: { vi: 'Phương thức phản hồi', en: 'Response Method' },
            options: [
              { value: 'email',   label: { vi: 'Email', en: 'Email' } },
              { value: 'letter',  label: { vi: 'Thư', en: 'Letter' } },
              { value: 'phone',   label: { vi: 'Điện thoại', en: 'Phone' } },
              { value: 'meeting', label: { vi: 'Họp', en: 'Meeting' } }
            ]
          }) +
        '</div>' +
        '<button class="eqms-btn primary sm" data-action="issue-response">' +
          T({ vi: 'Phát hành phản hồi', en: 'Issue Response' }) +
        '</button>'
      );
    }

    return html;
  }

  // ── Tab e) Related Records ──────────────────────────────────────────────
  function renderRelatedTab() {
    var links = state.tabData.relationships || [];
    var html = '';
    // Enhanced linked-record graph (falls back gracefully if not available)
    if (ui.renderLinkedRecordGraph) {
      html += ui.renderLinkedRecordGraph(links, { entityType: 'complaint', recordId: state.recordId });
    }
    html += ui.renderRelationshipsPanel(links, {
      readonly: state.record && state.record.status === 'closed'
    });
    return html;
  }

  // ── Tab f) Audit Trail ──────────────────────────────────────────────────
  function renderAuditTab() {
    var events = state.tabData.audit || [];
    if (!events.length && !state.tabData._auditLoaded) {
      loadTabData('audit');
      return ui.renderLoadingState({ vi: 'Đang tải nhật ký...', en: 'Loading audit trail...' });
    }
    return ui.renderAuditTrail(events);
  }

  // ── Tab g) Signatures ───────────────────────────────────────────────────
  function renderSignaturesTab() {
    var sigs = state.tabData.signatures || [];
    if (!sigs.length && !state.tabData._signaturesLoaded) {
      loadTabData('signatures');
      return ui.renderLoadingState({ vi: 'Đang tải chữ ký...', en: 'Loading signatures...' });
    }
    return ui.renderSignaturePanel(sigs, [
      { vi: 'Người lập',       en: 'Prepared By' },
      { vi: 'Người xem xét',   en: 'Reviewed By' },
      { vi: 'Người phê duyệt', en: 'Approved By' },
      { vi: 'QA Manager',      en: 'QA Manager' }
    ]);
  }

  // ── Tab h) Attachments ──────────────────────────────────────────────────
  function renderAttachmentsTab() {
    var files = state.tabData.attachments || [];
    if (!state.tabData._attachmentsLoaded) {
      loadTabData('attachments');
      return ui.renderLoadingState({ vi: 'Đang tải đính kèm...', en: 'Loading attachments...' });
    }
    return ui.renderAttachmentsGrid(files, {
      readonly: state.record && state.record.status === 'closed'
    });
  }

  // ── Tab i) Comments ─────────────────────────────────────────────────────
  function renderCommentsTab() {
    var comments = state.tabData.comments || [];
    if (!state.tabData._commentsLoaded) {
      loadTabData('comments');
      return ui.renderLoadingState({ vi: 'Đang tải bình luận...', en: 'Loading comments...' });
    }
    return ui.renderCommentsThread(comments, {
      readonly: state.record && state.record.status === 'closed'
    });
  }

  // =========================================================================
  // SCREEN 3: CREATE VIEW (WIZARD)
  // =========================================================================
  function renderCreateView() {
    var html = '<div class="eqms-create-view">';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to Queue' });
    html += '</button></div>';

    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo khiếu nại mới', en: 'New Customer Complaint' }) + '</h2>';

    var bodyHtml = renderWizardStep(state.wizardStep);

    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, bodyHtml, {
      saveDraft: true
    });

    html += '</div>';
    return html;
  }

  function renderWizardStep(step) {
    var d = state.wizardData;
    var e = state.wizardErrors;

    switch (step) {
      // ── Step 1: Customer Information ────────────────────────────────────
      case 0:
        return '<div class="eqms-wizard-step-content">' +
          '<h3>' + T({ vi: 'Thong tin khach hang', en: 'Customer Information' }) + '</h3>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'customer_name', label: { vi: 'Ten khach hang', en: 'Customer Name' }, type: 'text', required: true, value: d.customer_name || '', error: e.customer_name, placeholder: { vi: 'Nhap ten khach hang', en: 'Enter customer name' } }) +
            ui.renderFormField({ key: 'customer_id', label: { vi: 'Ma khach hang', en: 'Customer ID' }, type: 'text', value: d.customer_id || '', placeholder: { vi: 'Ma noi bo / SAP', en: 'Internal / SAP ID' } }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'contact_name', label: { vi: 'Nguoi lien he', en: 'Contact Person' }, type: 'text', value: d.contact_name || '' }) +
            ui.renderFormField({ key: 'contact_email', label: { vi: 'Email lien he', en: 'Contact Email' }, type: 'email', value: d.contact_email || '' }) +
            ui.renderFormField({ key: 'contact_phone', label: { vi: 'Dien thoai', en: 'Phone' }, type: 'text', value: d.contact_phone || '' }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'purchase_order', label: { vi: 'So PO', en: 'Purchase Order' }, type: 'text', value: d.purchase_order || '' }) +
            ui.renderFormField({ key: 'product_name', label: { vi: 'San pham', en: 'Product' }, type: 'text', value: d.product_name || '', placeholder: { vi: 'Ten hoac ma san pham', en: 'Product name or code' } }) +
            ui.renderFormField({ key: 'lot_number', label: { vi: 'So lo', en: 'Lot / Batch Number' }, type: 'text', value: d.lot_number || '' }) +
          '</div>' +
        '</div>';

      // ── Step 2: Complaint Details ──────────────────────────────────────
      case 1:
        return '<div class="eqms-wizard-step-content">' +
          '<h3>' + T({ vi: 'Chi tiet khieu nai', en: 'Complaint Details' }) + '</h3>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'subject', label: { vi: 'Chu de', en: 'Subject' }, type: 'text', required: true, value: d.subject || '', error: e.subject, placeholder: { vi: 'Tom tat ngan gon khieu nai', en: 'Brief complaint summary' } }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'description', label: { vi: 'Mo ta chi tiet', en: 'Detailed Description' }, type: 'textarea', required: true, value: d.description || '', error: e.description, placeholder: { vi: 'Mo ta day du khieu nai: trieu chung, dieu kien, tan suat...', en: 'Full complaint description: symptoms, conditions, frequency...' } }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'defect_type', label: { vi: 'Loai loi', en: 'Defect Type' }, type: 'select', value: d.defect_type || '', options: [
              { value: 'visual',       label: { vi: 'Ngoai quan', en: 'Visual / Cosmetic' } },
              { value: 'dimensional',   label: { vi: 'Kich thuoc', en: 'Dimensional' } },
              { value: 'functional',    label: { vi: 'Chuc nang', en: 'Functional' } },
              { value: 'material',      label: { vi: 'Vat lieu', en: 'Material' } },
              { value: 'contamination', label: { vi: 'Nhiem ban', en: 'Contamination' } },
              { value: 'documentation', label: { vi: 'Tai lieu', en: 'Documentation' } },
              { value: 'other',         label: { vi: 'Khac', en: 'Other' } }
            ] }) +
            ui.renderFormField({ key: 'severity', label: { vi: 'Muc do nghiem trong', en: 'Severity' }, type: 'select', required: true, value: d.severity || '', error: e.severity, options: SEVERITY_OPTIONS }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'quantity_affected', label: { vi: 'So luong anh huong', en: 'Quantity Affected' }, type: 'number', value: d.quantity_affected || '', min: 0 }) +
            ui.renderFormField({ key: 'quantity_shipped', label: { vi: 'So luong da giao', en: 'Quantity Shipped' }, type: 'number', value: d.quantity_shipped || '', min: 0 }) +
            ui.renderFormField({ key: 'received_date', label: { vi: 'Ngay nhan khieu nai', en: 'Date Received' }, type: 'date', required: true, value: d.received_date || '', error: e.received_date }) +
          '</div>' +
        '</div>';

      // ── Step 3: Classification ─────────────────────────────────────────
      case 2:
        return '<div class="eqms-wizard-step-content">' +
          '<h3>' + T({ vi: 'Phan loai', en: 'Classification' }) + '</h3>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'category', label: { vi: 'Danh muc', en: 'Category' }, type: 'select', value: d.category || '', options: CATEGORY_OPTIONS }) +
            ui.renderFormField({ key: 'source', label: { vi: 'Nguon phat hien', en: 'Complaint Source' }, type: 'select', value: d.source || '', options: SOURCE_OPTIONS }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'detection_method', label: { vi: 'Phuong phap phat hien', en: 'Detection Method' }, type: 'select', value: d.detection_method || '', options: DETECTION_OPTIONS }) +
            ui.renderFormField({ key: 'department', label: { vi: 'Bo phan lien quan', en: 'Related Department' }, type: 'select', value: d.department || '', options: [
              { value: 'production',   label: { vi: 'San xuat', en: 'Production' } },
              { value: 'quality',      label: { vi: 'Chat luong', en: 'Quality' } },
              { value: 'engineering',  label: { vi: 'Ky thuat', en: 'Engineering' } },
              { value: 'logistics',    label: { vi: 'Hau can', en: 'Logistics' } },
              { value: 'procurement',  label: { vi: 'Mua hang', en: 'Procurement' } },
              { value: 'sales',        label: { vi: 'Kinh doanh', en: 'Sales' } }
            ] }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'regulatory_impact', label: { vi: 'Anh huong quy dinh', en: 'Regulatory Impact' }, type: 'select', value: d.regulatory_impact || '', options: [
              { value: 'none',  label: { vi: 'Khong', en: 'None' } },
              { value: 'low',   label: { vi: 'Thap', en: 'Low' } },
              { value: 'medium', label: { vi: 'Trung binh', en: 'Medium' } },
              { value: 'high',  label: { vi: 'Cao', en: 'High' } },
              { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical — Potential Reportable' } }
            ] }) +
            ui.renderFormField({ key: 'regulatory_reference', label: { vi: 'Tham chieu quy dinh', en: 'Regulatory Reference' }, type: 'text', value: d.regulatory_reference || '', placeholder: { vi: 'VD: FDA MDR, EU Vigilance...', en: 'e.g. FDA MDR, EU Vigilance...' } }) +
          '</div>' +
        '</div>';

      // ── Step 4: Initial Assessment ─────────────────────────────────────
      case 3:
        return '<div class="eqms-wizard-step-content">' +
          '<h3>' + T({ vi: 'Danh gia ban dau', en: 'Initial Assessment' }) + '</h3>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'risk_level', label: { vi: 'Muc do rui ro', en: 'Risk Level' }, type: 'select', value: d.risk_level || '', options: [
              { value: 'low',      label: { vi: 'Thap', en: 'Low' } },
              { value: 'medium',   label: { vi: 'Trung binh', en: 'Medium' } },
              { value: 'high',     label: { vi: 'Cao', en: 'High' } },
              { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } }
            ] }) +
            ui.renderFormField({ key: 'priority', label: { vi: 'Do uu tien', en: 'Priority' }, type: 'select', value: d.priority || '', options: PRIORITY_OPTIONS }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'containment_needed', label: { vi: 'Can hanh dong ngan chan?', en: 'Containment Needed?' }, type: 'select', value: d.containment_needed || '', options: [
              { value: 'yes', label: { vi: 'Co', en: 'Yes' } },
              { value: 'no',  label: { vi: 'Khong', en: 'No' } },
              { value: 'tbd', label: { vi: 'Can danh gia', en: 'To Be Determined' } }
            ] }) +
            ui.renderFormField({ key: 'assigned_to', label: { vi: 'Phan cong cho', en: 'Assign To' }, type: 'text', value: d.assigned_to || '', placeholder: { vi: 'Ten nguoi phu trach', en: 'Name of responsible person' } }) +
          '</div>' +
          '<div class="eqms-form-row">' +
            ui.renderFormField({ key: 'due_date', label: { vi: 'Han xu ly', en: 'Due Date' }, type: 'date', value: d.due_date || '' }) +
            ui.renderFormField({ key: 'initial_assessment_notes', label: { vi: 'Ghi chu danh gia', en: 'Assessment Notes' }, type: 'textarea', value: d.initial_assessment_notes || '', placeholder: { vi: 'Nhan xet ban dau, huong xu ly...', en: 'Initial observations, proposed approach...' } }) +
          '</div>' +
        '</div>';

      // ── Step 5: Review & Submit ────────────────────────────────────────
      case 4:
        return renderWizardReview();

      default:
        return '';
    }
  }

  function renderWizardReview() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3>' + T({ vi: 'Xem lai thong tin truoc khi gui', en: 'Review Before Submitting' }) + '</h3>';

    html += ui.renderSection({ vi: 'Khach hang', en: 'Customer' },
      ui.renderFieldGrid([
        { label: { vi: 'Ten khach hang', en: 'Customer Name' },    value: d.customer_name },
        { label: { vi: 'Ma khach hang', en: 'Customer ID' },       value: d.customer_id },
        { label: { vi: 'Nguoi lien he', en: 'Contact' },           value: d.contact_name },
        { label: { vi: 'Email', en: 'Email' },                     value: d.contact_email },
        { label: { vi: 'Dien thoai', en: 'Phone' },                value: d.contact_phone },
        { label: { vi: 'So PO', en: 'PO Number' },                 value: d.purchase_order },
        { label: { vi: 'San pham', en: 'Product' },                value: d.product_name },
        { label: { vi: 'So lo', en: 'Lot Number' },                value: d.lot_number }
      ])
    );

    html += ui.renderSection({ vi: 'Chi tiet', en: 'Details' },
      ui.renderFieldGrid([
        { label: { vi: 'Chu de', en: 'Subject' },               value: d.subject },
        { label: { vi: 'Mo ta', en: 'Description' },            value: d.description },
        { label: { vi: 'Loai loi', en: 'Defect Type' },         value: d.defect_type },
        { label: { vi: 'Muc do', en: 'Severity' },              value: d.severity, badge: true },
        { label: { vi: 'SL anh huong', en: 'Qty Affected' },    value: d.quantity_affected },
        { label: { vi: 'Ngay nhan', en: 'Date Received' },      value: fmtDate(d.received_date) }
      ])
    );

    html += ui.renderSection({ vi: 'Phan loai', en: 'Classification' },
      ui.renderFieldGrid([
        { label: { vi: 'Danh muc', en: 'Category' },              value: d.category },
        { label: { vi: 'Nguon', en: 'Source' },                   value: d.source },
        { label: { vi: 'Phuong phap', en: 'Detection' },          value: d.detection_method },
        { label: { vi: 'Bo phan', en: 'Department' },             value: d.department },
        { label: { vi: 'Anh huong quy dinh', en: 'Regulatory' }, value: d.regulatory_impact }
      ])
    );

    html += ui.renderSection({ vi: 'Danh gia', en: 'Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Rui ro', en: 'Risk Level' },         value: d.risk_level },
        { label: { vi: 'Uu tien', en: 'Priority' },          value: d.priority, badge: true },
        { label: { vi: 'Ngan chan', en: 'Containment' },      value: d.containment_needed },
        { label: { vi: 'Phan cong', en: 'Assigned To' },     value: d.assigned_to },
        { label: { vi: 'Han xu ly', en: 'Due Date' },        value: fmtDate(d.due_date) }
      ])
    );

    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN 4: ANALYTICS VIEW
  // =========================================================================
  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';

    if (!state.metrics) {
      html += ui.renderLoadingState({ vi: 'Dang tai so lieu...', en: 'Loading metrics...' });
      html += '</div>';
      return html;
    }

    var m = state.metrics;

    // KPI row
    html += ui.renderKpiRow([
      {
        label: { vi: 'Khieu nai mo', en: 'Open Complaints' },
        value: fmt(m.open_count || 0),
        accent: (m.open_count > 10) ? 'danger' : '',
        freshness: (m.open_count > 20) ? 'critical' : (m.open_count > 10) ? 'warning' : 'healthy'
      },
      {
        label: { vi: 'Nghiem trong dang mo', en: 'Critical Open' },
        value: fmt(m.critical_open || 0),
        accent: (m.critical_open > 0) ? 'danger' : ''
      },
      {
        label: { vi: 'TB ngay xu ly', en: 'Avg Resolution (days)' },
        value: m.avg_resolution_days != null ? m.avg_resolution_days.toFixed(1) : '\u2014',
        trend: m.resolution_trend || 0,
        trendLabel: m.resolution_trend ? Math.abs(m.resolution_trend) + '%' : ''
      },
      {
        label: { vi: 'Ty le dong', en: 'Closure Rate' },
        value: m.closure_rate != null ? m.closure_rate + '%' : '\u2014'
      }
    ]);

    // Chart: By Severity
    var severityData = m.by_severity || [];
    html += ui.renderChartWithTableFallback(
      'chart-by-severity',
      null,
      [
        { key: 'severity', label: { vi: 'Muc do', en: 'Severity' }, type: 'badge' },
        { key: 'count',    label: { vi: 'So luong', en: 'Count' }, type: 'number' }
      ],
      severityData,
      { defaultMode: 'table' }
    );

    // Chart: By Status
    var statusData = m.by_status || [];
    html += ui.renderChartWithTableFallback(
      'chart-by-status',
      null,
      [
        { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
        { key: 'count',  label: { vi: 'So luong', en: 'Count' }, type: 'number' }
      ],
      statusData,
      { defaultMode: 'table' }
    );

    // Chart: Top Categories (Pareto)
    var catData = m.top_categories || [];
    html += ui.renderSection({ vi: 'Top danh muc khieu nai (Pareto)', en: 'Top Complaint Categories (Pareto)' },
      ui.renderChartWithTableFallback(
        'chart-top-categories',
        null,
        [
          { key: 'category', label: { vi: 'Danh muc', en: 'Category' } },
          { key: 'count',    label: { vi: 'So luong', en: 'Count' }, type: 'number' }
        ],
        catData,
        { defaultMode: 'table' }
      )
    );

    html += '</div>';
    return html;
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadQueue() {
    state.loading = true;
    state.error = null;
    refreshUI();

    var payload = {
      offset: (state.page - 1) * state.pageSize,
      limit: state.pageSize,
      sort_by: state.sortKey,
      sort_dir: state.sortDir,
      search: state.filters.search || '',
      filters: {}
    };

    if (state.filters.status)   payload.filters.status   = state.filters.status;
    if (state.filters.severity) payload.filters.severity  = state.filters.severity;
    if (state.filters.category) payload.filters.category  = state.filters.category;

    apiCall('eqms_complaints_query', payload).then(function(res) {
      state.loading = false;
      if (res && res.success !== false) {
        state.items = res.complaints || res.data || [];
        state.totalItems = res.total || res.pagination && res.pagination.total || state.items.length;
      } else {
        state.error = (res && res.message) || 'Failed to load complaints';
      }
      refreshUI();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      refreshUI();
    });
  }

  function loadDetail(id) {
    state.loading = true;
    state.record = null;
    state.tabData = {};
    refreshUI();

    apiCall('eqms_complaints_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.complaint) {
        state.record = res.complaint;
        state.recordId = id;
      } else {
        state.error = (res && res.message) || 'Complaint not found';
      }
      refreshUI();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      refreshUI();
    });
  }

  function loadTabData(tab) {
    if (!state.recordId) return;
    var id = state.recordId;

    var actionMap = {
      audit:       'eqms_complaints_audit',
      comments:    'eqms_complaints_comments',
      attachments: 'eqms_complaints_attachments',
      related:     'eqms_complaints_relationships',
      signatures:  'eqms_complaints_signatures'
    };

    var action = actionMap[tab];
    if (!action) return;

    apiCall(action, { id: id }, 'GET').then(function(res) {
      if (res) {
        state.tabData['_' + tab + 'Loaded'] = true;
        if (tab === 'audit')       state.tabData.audit       = res.events || res.audit || [];
        if (tab === 'comments')    state.tabData.comments     = res.comments || [];
        if (tab === 'attachments') state.tabData.attachments  = res.attachments || [];
        if (tab === 'related')     state.tabData.relationships = res.relationships || res.links || [];
        if (tab === 'signatures')  state.tabData.signatures   = res.signatures || [];
      }
      refreshUI();
    }).catch(function() {
      state.tabData['_' + tab + 'Loaded'] = true;
      refreshUI();
    });
  }

  function loadMetrics() {
    apiCall('eqms_complaints_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) {
        state.metrics = res.metrics;
      }
      refreshUI();
    }).catch(function() {
      refreshUI();
    });
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;

    var id = state.recordId;
    var version = state.record.version;
    var payload = {};

    // Collect form data for actions that require it
    if (actionKey === 'record-containment') {
      var containmentField = _container.querySelector('[data-field="containment_action"]');
      var containmentDate  = _container.querySelector('[data-field="containment_date"]');
      if (containmentField) payload.containment_action = containmentField.value;
      if (containmentDate)  payload.containment_date   = containmentDate.value;
      if (!payload.containment_action) {
        showToast(T({ vi: 'Vui long nhap hanh dong ngan chan', en: 'Please enter containment action' }), 'warning');
        return;
      }
    }

    if (actionKey === 'issue-response') {
      var respField  = _container.querySelector('[data-field="customer_response"]');
      var respMethod = _container.querySelector('[data-field="response_method"]');
      if (respField) payload.customer_response = respField.value;
      if (respMethod) payload.response_method  = respMethod.value;
      if (!payload.customer_response) {
        showToast(T({ vi: 'Vui long nhap noi dung phan hoi', en: 'Please enter response content' }), 'warning');
        return;
      }
    }

    if (actionKey === 'close') {
      var reason = prompt(T({ vi: 'Ly do dong khieu nai:', en: 'Closure reason:' }));
      if (!reason) return;
      payload.closure_reason = reason;
    }

    if (actionKey === 'reopen') {
      var reopenReason = prompt(T({ vi: 'Ly do mo lai:', en: 'Reason for reopening:' }));
      if (!reopenReason) return;
      payload.reopen_reason = reopenReason;
    }

    if (actionKey === 'assign') {
      var assignee = prompt(T({ vi: 'Phan cong cho:', en: 'Assign to:' }));
      if (!assignee) return;
      payload.assigned_to = assignee;
    }

    if (actionKey === 'link-capa') {
      var capaId = prompt(T({ vi: 'Ma CAPA:', en: 'CAPA ID:' }));
      if (!capaId) return;
      payload.capa_id = capaId;
    }

    // Build the action endpoint
    var actionEndpoint = 'eqms_complaints_action_' + actionKey.replace(/-/g, '_');

    state.loading = true;
    refreshUI();

    apiCall(actionEndpoint, Object.assign({ id: id, version: version }, payload)).then(function(res) {
      state.loading = false;
      if (res && res.complaint) {
        state.record = res.complaint;
        showToast(T({ vi: 'Hanh dong thanh cong', en: 'Action completed successfully' }), 'success');
      } else {
        showToast((res && res.message) || T({ vi: 'Hanh dong that bai', en: 'Action failed' }), 'error');
      }
      refreshUI();
    }).catch(function(err) {
      state.loading = false;
      showToast(err.message || 'Error', 'error');
      refreshUI();
    });
  }

  function submitWizard() {
    // Validate required fields
    var d = state.wizardData;
    var errors = {};

    if (!d.customer_name) errors.customer_name = { vi: 'Bat buoc', en: 'Required' };
    if (!d.subject)       errors.subject       = { vi: 'Bat buoc', en: 'Required' };
    if (!d.description)   errors.description   = { vi: 'Bat buoc', en: 'Required' };
    if (!d.severity)      errors.severity      = { vi: 'Bat buoc', en: 'Required' };
    if (!d.received_date) errors.received_date = { vi: 'Bat buoc', en: 'Required' };

    if (Object.keys(errors).length > 0) {
      state.wizardErrors = errors;
      // Go back to first step with an error
      state.wizardStep = !d.customer_name ? 0 : 1;
      refreshUI();
      showToast(T({ vi: 'Vui long dien day du thong tin bat buoc', en: 'Please fill all required fields' }), 'warning');
      return;
    }

    state.loading = true;
    refreshUI();

    apiCall('eqms_complaints_create', {
      subject:        d.subject,
      description:    d.description,
      received_date:  d.received_date,
      severity:       d.severity,
      customer_name:  d.customer_name,
      customer_id:    d.customer_id || null,
      category:       d.category || null
    }).then(function(res) {
      state.loading = false;
      if (res && res.complaint) {
        showToast(T({ vi: 'Tao khieu nai thanh cong', en: 'Complaint created successfully' }), 'success');
        // Navigate to the new record
        state.screen = 'detail';
        state.recordId = res.complaint.complaint_id;
        state.record = res.complaint;
        state.wizardData = {};
        state.wizardStep = 0;
        state.wizardErrors = {};
      } else {
        showToast((res && res.message) || T({ vi: 'Tao that bai', en: 'Creation failed' }), 'error');
      }
      refreshUI();
    }).catch(function(err) {
      state.loading = false;
      showToast(err.message || 'Error', 'error');
      refreshUI();
    });
  }

  function saveDraft() {
    var d = state.wizardData;
    if (!d.subject && !d.customer_name) {
      showToast(T({ vi: 'Vui long nhap it nhat chu de hoac khach hang', en: 'Please enter at least subject or customer' }), 'warning');
      return;
    }

    state.loading = true;
    refreshUI();

    apiCall('eqms_complaints_create', {
      subject:       d.subject || T({ vi: 'Nhap khieu nai', en: 'Draft complaint' }),
      description:   d.description || '',
      received_date: d.received_date || new Date().toISOString().slice(0, 10),
      severity:      d.severity || 'minor',
      customer_name: d.customer_name || T({ vi: 'Chua xac dinh', en: 'TBD' }),
      category:      d.category || null
    }).then(function(res) {
      state.loading = false;
      if (res && res.complaint) {
        showToast(T({ vi: 'Da luu nhap', en: 'Draft saved' }), 'success');
        state.screen = 'detail';
        state.recordId = res.complaint.complaint_id;
        state.record = res.complaint;
        state.wizardData = {};
        state.wizardStep = 0;
      } else {
        showToast((res && res.message) || 'Save failed', 'error');
      }
      refreshUI();
    }).catch(function(err) {
      state.loading = false;
      showToast(err.message || 'Error', 'error');
      refreshUI();
    });
  }

  function executeExport(format) {
    var ids = state.selectedIds.length > 0 ? state.selectedIds : null;
    apiCall('eqms_complaints_export', {
      format: format,
      ids: ids,
      filters: ids ? null : state.filters
    }).then(function(res) {
      if (res && res.job_id) {
        showToast(T({ vi: 'Yeu cau xuat du lieu da duoc gui. Ma cong viec: ', en: 'Export request submitted. Job ID: ' }) + res.job_id, 'success');
      } else {
        showToast((res && res.message) || 'Export failed', 'error');
      }
    }).catch(function(err) {
      showToast(err.message || 'Error', 'error');
    });
  }

  function addComment() {
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;

    var text = textarea.value.trim();
    apiCall('eqms_complaints_comments', {
      id: state.recordId,
      body: text
    }).then(function(res) {
      if (res) {
        textarea.value = '';
        state.tabData._commentsLoaded = false;
        state.tabData.comments = [];
        loadTabData('comments');
      }
    }).catch(function() {
      showToast(T({ vi: 'Gui binh luan that bai', en: 'Failed to post comment' }), 'error');
    });
  }

  // =========================================================================
  // UI HELPERS
  // =========================================================================
  function refreshUI() {
    if (_container) renderScreen();
  }

  function showToast(message, type) {
    // Simple toast notification
    var existing = document.querySelector('.eqms-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'eqms-toast ' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('visible'); }, 10);
    setTimeout(function() {
      toast.classList.remove('visible');
      setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
  }

  function collectWizardFormData() {
    if (!_container) return;
    var fields = _container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key && key !== 'new-comment') {
        state.wizardData[key] = el.value || '';
      }
    });
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function(e) {
      var target;

      // Screen switch
      target = e.target.closest('[data-action="switch-screen"]');
      if (target) {
        var screen = target.getAttribute('data-screen');
        if (screen === 'create') {
          state.screen = 'create';
          state.wizardStep = 0;
          state.wizardData = {};
          state.wizardErrors = {};
        } else if (screen === 'queue') {
          state.screen = 'queue';
          state.record = null;
          state.recordId = null;
          state.items = [];
        } else if (screen === 'analytics') {
          state.screen = 'analytics';
          state.metrics = null;
        } else {
          state.screen = screen;
        }
        refreshUI();
        return;
      }

      // Open detail
      target = e.target.closest('[data-action="open-detail"]');
      if (target) {
        var id = target.getAttribute('data-id');
        if (window.EqmsShell.drillToRecord) {
          window.EqmsShell.drillToRecord('complaint', id, { source: 'complaints-queue' });
        }
        state.screen = 'detail';
        state.recordId = id;
        state.record = null;
        state.activeTab = 'summary';
        state.tabData = {};
        refreshUI();
        return;
      }

      // Tab switch
      target = e.target.closest('[data-tab]');
      if (target) {
        state.activeTab = target.getAttribute('data-tab');
        refreshUI();
        return;
      }

      // Workflow actions
      target = e.target.closest('[data-action]');
      if (target) {
        var action = target.getAttribute('data-action');

        // Workflow state transitions
        var workflowActions = [
          'intake', 'triage', 'assign', 'record-containment',
          'start-investigation', 'link-capa', 'initiate-field-action',
          'issue-response', 'close', 'reopen'
        ];
        if (workflowActions.indexOf(action) !== -1) {
          executeWorkflowAction(action);
          return;
        }

        // Wizard navigation
        if (action === 'wizard-next') {
          collectWizardFormData();
          if (state.wizardStep < WIZARD_STEPS.length - 1) {
            state.wizardStep++;
            refreshUI();
          }
          return;
        }
        if (action === 'wizard-back') {
          collectWizardFormData();
          if (state.wizardStep > 0) {
            state.wizardStep--;
            refreshUI();
          }
          return;
        }
        if (action === 'wizard-submit') {
          collectWizardFormData();
          submitWizard();
          return;
        }
        if (action === 'wizard-save-draft') {
          collectWizardFormData();
          saveDraft();
          return;
        }

        // Filter actions
        if (action === 'apply-filters') {
          collectFilters();
          state.page = 1;
          state.items = [];
          loadQueue();
          return;
        }
        if (action === 'reset-filters') {
          state.filters = {};
          state.page = 1;
          state.items = [];
          loadQueue();
          return;
        }

        // Pagination
        if (action === 'page') {
          var page = parseInt(target.getAttribute('data-page'), 10);
          if (page && page > 0) {
            state.page = page;
            state.items = [];
            loadQueue();
          }
          return;
        }

        // Export
        if (action === 'export') {
          var format = target.getAttribute('data-format');
          executeExport(format || 'xlsx');
          return;
        }

        // Comment
        if (action === 'add-comment') {
          addComment();
          return;
        }

        // Row selection
        if (action === 'select-all') {
          var allCheckbox = e.target;
          if (allCheckbox && allCheckbox.checked) {
            state.selectedIds = state.items.map(function(item) { return item.complaint_id || item.id; });
          } else {
            state.selectedIds = [];
          }
          refreshUI();
          return;
        }
        if (action === 'select-row') {
          var rowId = target.getAttribute('data-id');
          var idx = state.selectedIds.indexOf(rowId);
          if (idx === -1) {
            state.selectedIds.push(rowId);
          } else {
            state.selectedIds.splice(idx, 1);
          }
          refreshUI();
          return;
        }
        if (action === 'clear-selection') {
          state.selectedIds = [];
          refreshUI();
          return;
        }

        // Retry
        if (action === 'retry-queue') {
          state.items = [];
          loadQueue();
          return;
        }

        // Bulk actions
        if (action === 'bulk-assign') {
          var bulkAssignee = prompt(T({ vi: 'Phan cong cho:', en: 'Assign to:' }));
          if (!bulkAssignee) return;
          showToast(T({ vi: 'Dang phan cong ' + state.selectedIds.length + ' khieu nai...', en: 'Assigning ' + state.selectedIds.length + ' complaints...' }), 'info');
          return;
        }
        if (action === 'bulk-export') {
          executeExport('xlsx');
          return;
        }

        // Save investigation notes
        if (action === 'save-investigation-notes') {
          var notesField = _container.querySelector('[data-field="investigation_notes"]');
          if (notesField && state.recordId) {
            apiCall('eqms_complaints_update', {
              id: state.recordId,
              version: state.record.version,
              investigation_summary: notesField.value
            }, 'PATCH').then(function(res) {
              if (res && res.complaint) {
                state.record = res.complaint;
                showToast(T({ vi: 'Da luu ghi chu', en: 'Notes saved' }), 'success');
              }
              refreshUI();
            });
          }
          return;
        }

        // Signature
        if (action === 'sign') {
          var role = target.getAttribute('data-role');
          if (role && state.recordId) {
            apiCall('eqms_complaints_signatures', {
              id: state.recordId,
              role: role,
              meaning: role
            }).then(function(res) {
              if (res) {
                state.tabData._signaturesLoaded = false;
                loadTabData('signatures');
                showToast(T({ vi: 'Da ky', en: 'Signed' }), 'success');
              }
            });
          }
          return;
        }
      }

      // Column sort
      target = e.target.closest('[data-sort]');
      if (target && state.screen === 'queue') {
        var sortKey = target.getAttribute('data-sort');
        if (state.sortKey === sortKey) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = sortKey;
          state.sortDir = 'asc';
        }
        state.page = 1;
        state.items = [];
        loadQueue();
        return;
      }
    });
  }

  function collectFilters() {
    if (!_container) return;
    var filterEls = _container.querySelectorAll('[data-filter]');
    filterEls.forEach(function(el) {
      var key = el.getAttribute('data-filter');
      state.filters[key] = el.value || '';
    });
  }

  // =========================================================================
  // MODULE REGISTRATION
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['complaints'] = {
    render: render,
    meta: MOD
  };

})();

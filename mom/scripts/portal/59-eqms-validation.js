/**
 * EQMS Validation Management — Evidence Workspace + Trace Matrix
 * HESEM MOM Portal · 59-eqms-validation.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: validation
 * Archetype: evidence-workspace
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Inventory | Project Workspace (9 tabs) | Create (wizard) | Analytics
 * Workflow: planning → requirements → protocol_authoring → protocol_approved → execution → summary_generated → qualified | failed
 * Actions: define-requirements, author-protocol, approve-protocol, start-execution,
 *          record-result, log-deviation, generate-summary
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
  // META
  // =========================================================================
  var MOD = {
    id:        'validation',
    version:   '1.0.0',
    archetype: 'evidence-workspace',
    endpoints: [
      'eqms_validation_projects_query', 'eqms_validation_projects_detail',
      'eqms_validation_projects_create', 'eqms_validation_projects_update',
      'eqms_validation_metrics', 'eqms_validation_requirements_query',
      'eqms_validation_protocols_query', 'eqms_validation_executions_query',
      'eqms_validation_trace_matrix', 'eqms_validation_audit',
      'eqms_validation_signatures', 'eqms_validation_export'
    ],
    workflow: ['planning', 'requirements', 'protocol_authoring', 'protocol_approved', 'execution', 'summary_generated', 'qualified', 'failed']
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var VALIDATION_TYPES = [
    { value: 'IQ',      label: { vi: 'IQ — Xác nhận lắp đặt',       en: 'IQ — Installation Qualification' } },
    { value: 'OQ',      label: { vi: 'OQ — Xác nhận vận hành',      en: 'OQ — Operational Qualification' } },
    { value: 'PQ',      label: { vi: 'PQ — Xác nhận hiệu suất',     en: 'PQ — Performance Qualification' } },
    { value: 'CSV',     label: { vi: 'CSV — Xác nhận hệ thống',     en: 'CSV — Computer System Validation' } },
    { value: 'CQV',     label: { vi: 'CQV — Xác nhận toàn diện',   en: 'CQV — Commissioning & Qualification' } },
    { value: 'Process', label: { vi: 'Xác nhận quy trình',          en: 'Process Validation' } }
  ];

  var STATUS_OPTIONS = MOD.workflow.map(function(s) {
    var labels = {
      planning:            { vi: 'Lập kế hoạch',        en: 'Planning' },
      requirements:        { vi: 'Yêu cầu',             en: 'Requirements' },
      protocol_authoring:  { vi: 'Soạn giao thức',      en: 'Protocol Authoring' },
      protocol_approved:   { vi: 'Giao thức đã duyệt',  en: 'Protocol Approved' },
      execution:           { vi: 'Thực hiện',            en: 'Execution' },
      summary_generated:   { vi: 'Báo cáo đã tạo',      en: 'Summary Generated' },
      qualified:           { vi: 'Đạt chất lượng',       en: 'Qualified' },
      failed:              { vi: 'Không đạt',            en: 'Failed' }
    };
    return { value: s, label: labels[s] || { vi: s, en: s } };
  });

  var REQ_PRIORITIES = [
    { value: 'must',   label: { vi: 'Bắt buộc',  en: 'Must' } },
    { value: 'should', label: { vi: 'Nên có',     en: 'Should' } },
    { value: 'may',    label: { vi: 'Có thể',     en: 'May' } }
  ];

  var REQ_TYPES = [
    { value: 'functional',   label: { vi: 'Chức năng',    en: 'Functional' } },
    { value: 'performance',  label: { vi: 'Hiệu suất',    en: 'Performance' } },
    { value: 'safety',       label: { vi: 'An toàn',      en: 'Safety' } },
    { value: 'regulatory',   label: { vi: 'Pháp quy',     en: 'Regulatory' } }
  ];

  var EXEC_STATUSES = [
    { value: 'not_started', label: { vi: 'Chưa bắt đầu',  en: 'Not Started' } },
    { value: 'in_progress', label: { vi: 'Đang thực hiện', en: 'In Progress' } },
    { value: 'pass',        label: { vi: 'Đạt',            en: 'Pass' } },
    { value: 'fail',        label: { vi: 'Không đạt',      en: 'Fail' } },
    { value: 'deviation',   label: { vi: 'Sai lệch',       en: 'Deviation' } }
  ];

  var SCREENS = { INVENTORY: 'inventory', WORKSPACE: 'workspace', CREATE: 'create', ANALYTICS: 'analytics' };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.INVENTORY,
    // Inventory
    filters: {},
    records: [],
    pagination: { offset: 0, limit: 25, total: 0 },
    sortKey: 'updated_at',
    sortDir: 'desc',
    loading: false,
    error: null,
    // Workspace
    activeTab: 'summary',
    record: null,
    recordId: null,
    requirements: [],
    protocols: [],
    executions: [],
    deviations: [],
    traceMatrix: null,
    summaryReport: null,
    auditEvents: [],
    signatures: [],
    comments: [],
    attachments: [],
    relationships: [],
    // Create wizard
    wizardStep: 0,
    wizardData: {},
    // Analytics
    metrics: null
  };

  var _container = null;

  // =========================================================================
  // RENDER ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      state.screen = SCREENS.WORKSPACE;
      state.recordId = context.recordId;
      loadDetail(context.recordId);
    } else if (context.screen === 'create') {
      state.screen = SCREENS.CREATE;
      state.wizardStep = 0;
      state.wizardData = {};
      paint();
    } else if (context.screen === 'analytics') {
      state.screen = SCREENS.ANALYTICS;
      loadMetrics();
    } else {
      state.screen = SCREENS.INVENTORY;
      loadInventory();
    }

    paint();
  }

  function paint() {
    if (!_container) return;
    var html = '';
    switch (state.screen) {
      case SCREENS.INVENTORY:  html = renderInventory();  break;
      case SCREENS.WORKSPACE:  html = renderWorkspace();  break;
      case SCREENS.CREATE:     html = renderCreate();     break;
      case SCREENS.ANALYTICS:  html = renderAnalytics();  break;
    }
    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadInventory() {
    state.loading = true;
    state.error = null;
    paint();

    var payload = Object.assign({}, state.filters, {
      offset: state.pagination.offset,
      limit: state.pagination.limit,
      sort_key: state.sortKey,
      sort_dir: state.sortDir
    });

    apiCall('eqms_validation_projects_query', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.records = res.data || [];
        state.pagination.total = res.total || res.data.length || 0;
      } else {
        state.error = res.message || 'Failed to load validation projects';
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function loadDetail(id) {
    state.loading = true;
    state.error = null;
    state.recordId = id;
    paint();

    apiCall('eqms_validation_projects_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.record = res.data || {};
        state.requirements = res.data.requirements || [];
        state.protocols = res.data.protocols || [];
        state.executions = res.data.executions || [];
        state.deviations = res.data.deviations || [];
        state.summaryReport = res.data.summary_report || null;
      } else {
        state.error = res.message || 'Failed to load project';
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });

    loadDetailSidebar(id);
    loadTraceMatrix(id);
  }

  function loadDetailSidebar(id) {
    apiCall('eqms_validation_audit', { id: id }).then(function(res) {
      if (res.success) { state.auditEvents = res.data || []; paint(); }
    });
    apiCall('eqms_validation_signatures', { id: id }).then(function(res) {
      if (res.success) { state.signatures = res.data || []; paint(); }
    });
  }

  function loadTraceMatrix(id) {
    apiCall('eqms_validation_trace_matrix', { id: id }).then(function(res) {
      if (res.success) { state.traceMatrix = res.data || null; paint(); }
    });
  }

  function loadMetrics() {
    state.loading = true;
    paint();

    apiCall('eqms_validation_metrics', {}).then(function(res) {
      state.loading = false;
      if (res.success) { state.metrics = res.data || {}; }
      else { state.error = res.message || 'Failed to load metrics'; }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  // =========================================================================
  // SCREEN: INVENTORY
  // =========================================================================
  function renderInventory() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải dự án xác nhận...', en: 'Loading validation projects...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-inventory');

    var html = '';

    // KPI row
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng dự án',          en: 'Total Projects' },      value: fmt(state.pagination.total) },
      { label: { vi: 'Đang thực hiện',      en: 'In Execution' },        value: fmt(countByStatus('execution')), accent: 'warning' },
      { label: { vi: 'Đã đạt',              en: 'Qualified' },           value: fmt(countByStatus('qualified')), accent: 'success' },
      { label: { vi: 'Không đạt',           en: 'Failed' },              value: fmt(countByStatus('failed')), accent: 'danger' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="go-create">';
    html += '+ ' + T({ vi: 'Tạo dự án xác nhận', en: 'New Validation Project' });
    html += '</button>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '<button class="eqms-btn ghost sm" data-action="go-analytics">';
    html += T({ vi: 'Phân tích', en: 'Analytics' });
    html += '</button>';
    html += '</div></div>';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm theo mã hoặc tiêu đề...', en: 'Search by ID or title...' }, width: '220px' },
        { key: 'validation_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: VALIDATION_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: STATUS_OPTIONS },
        { key: 'equipment_system', type: 'text', label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, width: '160px' }
      ]
    });

    // Data grid
    var columns = [
      { key: 'project_id',        label: { vi: 'Mã dự án',          en: 'Project ID' },        type: 'id', sortable: true },
      { key: 'title',             label: { vi: 'Tiêu đề',           en: 'Title' },              type: 'truncate', sortable: true },
      { key: 'validation_type',   label: { vi: 'Loại',              en: 'Type' },               type: 'badge', sortable: true },
      { key: 'status',            label: { vi: 'Trạng thái',        en: 'Status' },             type: 'badge', sortable: true },
      { key: 'equipment_system',  label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, sortable: true },
      { key: 'team_lead',         label: { vi: 'Trưởng nhóm',       en: 'Team Lead' },          sortable: true },
      { key: 'progress',          label: { vi: 'Tiến độ (%)',       en: 'Progress (%)' },       type: 'number', sortable: true,
        render: function(v) {
          var pct = v || 0;
          var color = pct >= 100 ? 'var(--hm-accent-success,#22c55e)' : pct >= 50 ? 'var(--hm-accent-warning,#f59e0b)' : 'var(--hm-accent-danger,#ef4444)';
          return '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px"></div></div><span style="font-size:12px;min-width:32px;text-align:right">' + esc(pct + '%') + '</span></div>';
        }
      },
      { key: 'target_date',       label: { vi: 'Ngày mục tiêu',     en: 'Target Date' },        type: 'date', sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.records, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination(state.pagination);

    return html;
  }

  function countByStatus(s) {
    return state.records.filter(function(r) { return r.status === s; }).length;
  }

  // =========================================================================
  // SCREEN: PROJECT WORKSPACE
  // =========================================================================
  function renderWorkspace() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải chi tiết dự án...', en: 'Loading project details...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-detail');
    if (!state.record) return ui.renderEmptyState({ icon: '\uD83E\uDDEA', title: { vi: 'Không tìm thấy dự án', en: 'Project not found' } });

    var rec = state.record;
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-inventory" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to inventory' });
    html += '</button>';

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getWorkspaceActions(rec),
      extraMeta: [
        { label: { vi: 'Loại xác nhận', en: 'Validation Type' }, value: rec.validation_type },
        { label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, value: rec.equipment_system },
        { label: { vi: 'Trưởng nhóm', en: 'Team Lead' }, value: rec.team_lead },
        { label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, value: fmtDate(rec.target_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(MOD.workflow, rec.status);

    // Tabs
    var tabs = [
      { id: 'summary',      label: { vi: 'Tóm tắt',                 en: 'Summary' } },
      { id: 'requirements', label: { vi: 'Yêu cầu',                 en: 'Requirements' }, badge: state.requirements.length || null },
      { id: 'protocols',    label: { vi: 'Giao thức',                en: 'Protocols' }, badge: state.protocols.length || null },
      { id: 'execution',    label: { vi: 'Thực hiện',                en: 'Execution' }, badge: state.executions.length || null },
      { id: 'deviations',   label: { vi: 'Sai lệch / Vấn đề',      en: 'Deviations / Issues' }, badge: state.deviations.length || null },
      { id: 'trace-matrix', label: { vi: 'Ma trận truy xuất',       en: 'Trace Matrix' } },
      { id: 'summary-report', label: { vi: 'Báo cáo tổng hợp',     en: 'Summary Report' } },
      { id: 'related',      label: { vi: 'Liên kết & Kiểm toán',   en: 'Related & Audit' } },
      { id: 'signatures',   label: { vi: 'Chữ ký & Đính kèm',      en: 'Signatures & Files' } }
    ];

    html += ui.renderTabs(tabs, state.activeTab);
    html += '<div class="eqms-tab-content">';
    html += renderWorkspaceTab();
    html += '</div>';

    return html;
  }

  function getWorkspaceActions(rec) {
    var actions = [];
    var s = rec.status;

    if (s === 'planning') {
      actions.push({ action: 'define-requirements', label: { vi: 'Xác định yêu cầu', en: 'Define Requirements' }, style: 'primary' });
    }
    if (s === 'requirements') {
      actions.push({ action: 'author-protocol', label: { vi: 'Soạn giao thức', en: 'Author Protocol' }, style: 'primary' });
    }
    if (s === 'protocol_authoring') {
      actions.push({ action: 'approve-protocol', label: { vi: 'Duyệt giao thức', en: 'Approve Protocol' }, style: 'primary' });
    }
    if (s === 'protocol_approved') {
      actions.push({ action: 'start-execution', label: { vi: 'Bắt đầu thực hiện', en: 'Start Execution' }, style: 'primary' });
    }
    if (s === 'execution') {
      actions.push({ action: 'record-result', label: { vi: 'Ghi kết quả', en: 'Record Result' }, style: 'secondary' });
      actions.push({ action: 'log-deviation', label: { vi: 'Ghi sai lệch', en: 'Log Deviation' }, style: 'ghost' });
      actions.push({ action: 'generate-summary', label: { vi: 'Tạo báo cáo', en: 'Generate Summary' }, style: 'primary' });
    }

    return actions;
  }

  // =========================================================================
  // WORKSPACE TABS
  // =========================================================================
  function renderWorkspaceTab() {
    switch (state.activeTab) {
      case 'summary':         return renderSummaryTab();
      case 'requirements':    return renderRequirementsTab();
      case 'protocols':       return renderProtocolsTab();
      case 'execution':       return renderExecutionTab();
      case 'deviations':      return renderDeviationsTab();
      case 'trace-matrix':    return renderTraceMatrixTab();
      case 'summary-report':  return renderSummaryReportTab();
      case 'related':         return renderRelatedTab();
      case 'signatures':      return renderSignaturesTab();
      default:                return '';
    }
  }

  // --- Summary Tab ---
  function renderSummaryTab() {
    var rec = state.record;
    return ui.renderSection({ vi: 'Thông tin dự án xác nhận', en: 'Validation Project Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã dự án',           en: 'Project ID' },          value: rec.project_id,        mono: true },
        { label: { vi: 'Tiêu đề',            en: 'Title' },               value: rec.title },
        { label: { vi: 'Loại xác nhận',      en: 'Validation Type' },     value: rec.validation_type,   badge: true },
        { label: { vi: 'Mô tả',              en: 'Description' },         value: rec.description },
        { label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, value: rec.equipment_system },
        { label: { vi: 'Lý do',              en: 'Rationale' },           value: rec.rationale },
        { label: { vi: 'Trưởng nhóm',        en: 'Team Lead' },           value: rec.team_lead },
        { label: { vi: 'Thành viên nhóm',    en: 'Team Members' },        value: (rec.team_members || []).join(', ') },
        { label: { vi: 'Ngày mục tiêu',      en: 'Target Date' },         value: fmtDate(rec.target_date) },
        { label: { vi: 'Trạng thái',         en: 'Status' },              value: rec.status, badge: true }
      ])
    );
  }

  // --- Requirements Tab ---
  function renderRequirementsTab() {
    var html = '';

    var columns = [
      { key: 'req_id',             label: { vi: 'Mã YC',               en: 'Req ID' },            type: 'id' },
      { key: 'description',        label: { vi: 'Mô tả',               en: 'Description' },       type: 'truncate' },
      { key: 'source',             label: { vi: 'Nguồn',               en: 'Source' } },
      { key: 'priority',           label: { vi: 'Ưu tiên',             en: 'Priority' },          type: 'badge' },
      { key: 'req_type',           label: { vi: 'Loại',                en: 'Type' },              type: 'badge' },
      { key: 'acceptance_criteria', label: { vi: 'Tiêu chí chấp nhận', en: 'Acceptance Criteria' }, type: 'truncate' },
      { key: 'status',             label: { vi: 'Trạng thái',          en: 'Status' },            type: 'badge' }
    ];

    html += ui.renderSection({ vi: 'Danh sách yêu cầu', en: 'Requirements List' },
      ui.renderDataGrid(columns, state.requirements, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="add-requirement">+ ' + T({ vi: 'Thêm yêu cầu', en: 'Add Requirement' }) + '</button>'
      }
    );

    // Add requirement form
    html += ui.renderSection({ vi: 'Thêm yêu cầu mới', en: 'Add New Requirement' },
      '<div class="eqms-wizard-step-content">' +
      ui.renderFormField({ key: 'req_description', label: { vi: 'Mô tả yêu cầu', en: 'Requirement Description' }, type: 'textarea', required: true, placeholder: { vi: 'Mô tả yêu cầu...', en: 'Describe the requirement...' } }) +
      ui.renderFormField({ key: 'req_source', label: { vi: 'Nguồn', en: 'Source' }, type: 'text', placeholder: { vi: 'Tiêu chuẩn, quy định...', en: 'Standard, regulation...' } }) +
      ui.renderFormField({ key: 'req_priority', label: { vi: 'Ưu tiên', en: 'Priority' }, type: 'select', options: REQ_PRIORITIES, required: true }) +
      ui.renderFormField({ key: 'req_type', label: { vi: 'Loại', en: 'Type' }, type: 'select', options: REQ_TYPES, required: true }) +
      ui.renderFormField({ key: 'req_acceptance', label: { vi: 'Tiêu chí chấp nhận', en: 'Acceptance Criteria' }, type: 'textarea', placeholder: { vi: 'Tiêu chí đạt / không đạt...', en: 'Pass / fail criteria...' } }) +
      '<button class="eqms-btn primary sm" data-action="save-requirement" style="margin-top:12px">' + T({ vi: 'Lưu yêu cầu', en: 'Save Requirement' }) + '</button>' +
      '</div>'
    );

    return html;
  }

  // --- Protocols Tab ---
  function renderProtocolsTab() {
    var columns = [
      { key: 'protocol_id', label: { vi: 'Mã giao thức',      en: 'Protocol ID' },   type: 'id' },
      { key: 'title',       label: { vi: 'Tiêu đề',           en: 'Title' },         type: 'truncate' },
      { key: 'version',     label: { vi: 'Phiên bản',         en: 'Version' } },
      { key: 'status',      label: { vi: 'Trạng thái',        en: 'Status' },        type: 'badge' },
      { key: 'approver',    label: { vi: 'Người duyệt',       en: 'Approver' } },
      { key: 'approval_date', label: { vi: 'Ngày duyệt',      en: 'Approval Date' }, type: 'date' }
    ];

    var html = ui.renderSection({ vi: 'Tài liệu giao thức', en: 'Protocol Documents' },
      ui.renderDataGrid(columns, state.protocols, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="add-protocol">+ ' + T({ vi: 'Thêm giao thức', en: 'Add Protocol' }) + '</button>'
      }
    );

    // Protocol content preview for selected protocol
    if (state.protocols.length > 0) {
      var latest = state.protocols[state.protocols.length - 1];
      if (latest.content_preview) {
        html += ui.renderSection({ vi: 'Xem trước nội dung', en: 'Content Preview' },
          '<div class="eqms-rendered-content" style="padding:16px;border:1px solid var(--hm-border-primary,#e2e8f0);border-radius:8px;min-height:200px;font-size:13px;line-height:1.6">' +
          esc(latest.content_preview) +
          '</div>'
        );
      }
    }

    return html;
  }

  // --- Execution Tab ---
  function renderExecutionTab() {
    var columns = [
      { key: 'test_id',          label: { vi: 'Mã test',            en: 'Test ID' },           type: 'id' },
      { key: 'requirement_ref',  label: { vi: 'Yêu cầu tham chiếu', en: 'Requirement Ref' } },
      { key: 'protocol_ref',    label: { vi: 'Giao thức ref',      en: 'Protocol Ref' } },
      { key: 'test_description', label: { vi: 'Mô tả',             en: 'Test Description' },  type: 'truncate' },
      { key: 'expected_result', label: { vi: 'Kết quả mong đợi',   en: 'Expected Result' },   type: 'truncate' },
      { key: 'actual_result',   label: { vi: 'Kết quả thực tế',    en: 'Actual Result' },     type: 'truncate' },
      { key: 'status',          label: { vi: 'Trạng thái',         en: 'Status' },            type: 'badge' },
      { key: 'executed_by',     label: { vi: 'Người thực hiện',    en: 'Executed By' } },
      { key: 'executed_date',   label: { vi: 'Ngày',               en: 'Date' },              type: 'date' }
    ];

    var html = ui.renderSection({ vi: 'Kết quả thực hiện', en: 'Execution Results' },
      ui.renderDataGrid(columns, state.executions, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="record-result">+ ' + T({ vi: 'Ghi kết quả', en: 'Record Result' }) + '</button>'
      }
    );

    // Record result form
    html += ui.renderSection({ vi: 'Ghi kết quả mới', en: 'Record New Result' },
      '<div class="eqms-wizard-step-content">' +
      ui.renderFormField({ key: 'exec_requirement_ref', label: { vi: 'Yêu cầu tham chiếu', en: 'Requirement Ref' }, type: 'text', required: true }) +
      ui.renderFormField({ key: 'exec_protocol_ref', label: { vi: 'Giao thức ref', en: 'Protocol Ref' }, type: 'text', required: true }) +
      ui.renderFormField({ key: 'exec_description', label: { vi: 'Mô tả', en: 'Test Description' }, type: 'textarea', required: true }) +
      ui.renderFormField({ key: 'exec_expected', label: { vi: 'Kết quả mong đợi', en: 'Expected Result' }, type: 'textarea', required: true }) +
      ui.renderFormField({ key: 'exec_actual', label: { vi: 'Kết quả thực tế', en: 'Actual Result' }, type: 'textarea' }) +
      ui.renderFormField({ key: 'exec_status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'select', options: EXEC_STATUSES, required: true }) +
      '<button class="eqms-btn primary sm" data-action="save-execution" style="margin-top:12px">' + T({ vi: 'Lưu', en: 'Save' }) + '</button>' +
      '</div>'
    );

    return html;
  }

  // --- Deviations / Issues Tab ---
  function renderDeviationsTab() {
    var columns = [
      { key: 'deviation_id', label: { vi: 'Mã sai lệch',   en: 'Deviation ID' },  type: 'id' },
      { key: 'description',  label: { vi: 'Mô tả',         en: 'Description' },   type: 'truncate' },
      { key: 'impact',       label: { vi: 'Mức độ',        en: 'Impact' },        type: 'badge' },
      { key: 'root_cause',   label: { vi: 'Nguyên nhân',   en: 'Root Cause' },    type: 'truncate' },
      { key: 'resolution',   label: { vi: 'Giải pháp',     en: 'Resolution' },    type: 'truncate' },
      { key: 'status',       label: { vi: 'Trạng thái',    en: 'Status' },        type: 'badge' }
    ];

    var html = ui.renderSection({ vi: 'Sai lệch / Vấn đề', en: 'Deviations / Issues' },
      ui.renderDataGrid(columns, state.deviations, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="log-deviation">+ ' + T({ vi: 'Ghi sai lệch', en: 'Log Deviation' }) + '</button>'
      }
    );

    // Impact assessment summary
    if (state.deviations.length > 0) {
      var minor = state.deviations.filter(function(d) { return d.impact === 'minor'; }).length;
      var major = state.deviations.filter(function(d) { return d.impact === 'major'; }).length;
      var critical = state.deviations.filter(function(d) { return d.impact === 'critical'; }).length;

      html += ui.renderSection({ vi: 'Đánh giá tác động', en: 'Impact Assessment' },
        ui.renderKpiRow([
          { label: { vi: 'Nhỏ',      en: 'Minor' },    value: minor,    accent: '' },
          { label: { vi: 'Lớn',      en: 'Major' },    value: major,    accent: 'warning' },
          { label: { vi: 'Nghiêm trọng', en: 'Critical' }, value: critical, accent: 'danger' },
          { label: { vi: 'Tổng',     en: 'Total' },    value: state.deviations.length }
        ])
      );
    }

    return html;
  }

  // --- Trace Matrix Tab ---
  function renderTraceMatrixTab() {
    var matrix = state.traceMatrix;

    if (!matrix || !state.requirements.length) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCCA',
        title: { vi: 'Chưa có dữ liệu ma trận', en: 'No trace matrix data' },
        desc: { vi: 'Xác định yêu cầu và ghi kết quả để tạo ma trận truy xuất', en: 'Define requirements and record results to build the trace matrix' }
      });
    }

    var html = '';
    html += '<div class="eqms-section">';
    html += '<div class="eqms-section-header"><span>' + T({ vi: 'Ma trận truy xuất Yêu cầu — Giao thức — Kết quả', en: 'Requirements — Protocol — Execution Traceability' }) + '</span></div>';
    html += '<div class="eqms-section-body">';

    // Build the trace matrix grid
    html += '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Mã yêu cầu', en: 'Req ID' }) + '</th>';
    html += '<th>' + T({ vi: 'Mô tả', en: 'Description' }) + '</th>';
    html += '<th>' + T({ vi: 'Ưu tiên', en: 'Priority' }) + '</th>';

    // Test columns from executions
    var testIds = [];
    state.executions.forEach(function(exec) {
      if (testIds.indexOf(exec.test_id) === -1) testIds.push(exec.test_id);
    });

    testIds.forEach(function(tid) {
      html += '<th style="text-align:center;min-width:80px">' + esc(tid) + '</th>';
    });

    html += '<th style="text-align:center">' + T({ vi: 'Trạng thái', en: 'Coverage' }) + '</th>';
    html += '</tr></thead><tbody>';

    state.requirements.forEach(function(req) {
      html += '<tr>';
      html += '<td class="eqms-cell-id">' + esc(req.req_id) + '</td>';
      html += '<td class="eqms-cell-truncate">' + esc(req.description || '') + '</td>';
      html += '<td><span class="eqms-badge ' + slugify(req.priority || '') + '">' + esc(req.priority || '') + '</span></td>';

      var hasPass = false;
      var hasFail = false;
      var allTested = true;

      testIds.forEach(function(tid) {
        var exec = state.executions.find(function(e) { return e.test_id === tid && e.requirement_ref === req.req_id; });
        if (exec) {
          var cellClass = exec.status === 'pass' ? 'background:var(--hm-accent-success-subtle,#dcfce7)' :
                          exec.status === 'fail' ? 'background:var(--hm-accent-danger-subtle,#fef2f2)' :
                          exec.status === 'deviation' ? 'background:var(--hm-accent-warning-subtle,#fffbeb)' : '';
          var icon = exec.status === 'pass' ? '\u2705' : exec.status === 'fail' ? '\u274C' : exec.status === 'deviation' ? '\u26A0\uFE0F' : '\u23F3';
          html += '<td style="text-align:center;' + cellClass + '">' + icon + '</td>';
          if (exec.status === 'pass') hasPass = true;
          if (exec.status === 'fail') hasFail = true;
        } else {
          html += '<td style="text-align:center;color:var(--hm-text-tertiary,#94a3b8)">\u2014</td>';
          allTested = false;
        }
      });

      // Coverage status
      var coverageLabel, coverageClass;
      if (hasFail) { coverageLabel = T({ vi: 'Không đạt', en: 'Failed' }); coverageClass = 'failed'; }
      else if (allTested && hasPass) { coverageLabel = T({ vi: 'Đạt', en: 'Passed' }); coverageClass = 'qualified'; }
      else if (hasPass) { coverageLabel = T({ vi: 'Một phần', en: 'Partial' }); coverageClass = 'in-progress'; }
      else { coverageLabel = T({ vi: 'Chưa test', en: 'Not Tested' }); coverageClass = 'not-started'; }

      html += '<td style="text-align:center"><span class="eqms-badge ' + coverageClass + '">' + esc(coverageLabel) + '</span></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div></div>';

    // Coverage summary
    var totalReqs = state.requirements.length;
    var testedReqs = state.requirements.filter(function(r) {
      return state.executions.some(function(e) { return e.requirement_ref === r.req_id; });
    }).length;
    var passedReqs = state.requirements.filter(function(r) {
      return state.executions.some(function(e) { return e.requirement_ref === r.req_id && e.status === 'pass'; });
    }).length;

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng yêu cầu',       en: 'Total Requirements' },  value: totalReqs },
      { label: { vi: 'Đã kiểm tra',         en: 'Tested' },             value: testedReqs + ' / ' + totalReqs, accent: testedReqs === totalReqs ? 'success' : 'warning' },
      { label: { vi: 'Đạt',                 en: 'Passed' },             value: passedReqs, accent: 'success' },
      { label: { vi: 'Độ bao phủ',          en: 'Coverage Rate' },      value: totalReqs > 0 ? Math.round((testedReqs / totalReqs) * 100) + '%' : '0%' }
    ]);

    return html;
  }

  // --- Summary Report Tab ---
  function renderSummaryReportTab() {
    var report = state.summaryReport;

    if (!report) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCCB',
        title: { vi: 'Chưa có báo cáo tổng hợp', en: 'No summary report generated' },
        desc: { vi: 'Hoàn thành giai đoạn thực hiện để tạo báo cáo tự động', en: 'Complete the execution phase to auto-generate the summary report' },
        action: state.record && state.record.status === 'execution' ? { key: 'generate-summary', label: { vi: 'Tạo báo cáo', en: 'Generate Report' } } : null
      });
    }

    var html = '';

    // Scope section
    html += ui.renderSection({ vi: 'Phạm vi', en: 'Scope' },
      '<p style="margin:0;line-height:1.6;color:var(--hm-text-secondary,#64748b)">' + esc(report.scope || '') + '</p>'
    );

    // Test Summary
    var totalTests = (report.total_tests || 0);
    var passedTests = (report.passed_tests || 0);
    var failedTests = (report.failed_tests || 0);
    var deviationCount = (report.deviation_count || 0);

    html += ui.renderSection({ vi: 'Tóm tắt thử nghiệm', en: 'Test Summary' },
      ui.renderKpiRow([
        { label: { vi: 'Tổng test',     en: 'Total Tests' },  value: totalTests },
        { label: { vi: 'Đạt',           en: 'Passed' },       value: passedTests, accent: 'success' },
        { label: { vi: 'Không đạt',     en: 'Failed' },       value: failedTests, accent: failedTests > 0 ? 'danger' : '' },
        { label: { vi: 'Sai lệch',      en: 'Deviations' },   value: deviationCount, accent: deviationCount > 0 ? 'warning' : '' }
      ])
    );

    // Conclusion
    var conclusionClass = report.conclusion === 'qualified' ? 'success' :
                          report.conclusion === 'qualified_with_conditions' ? 'warning' : 'danger';
    var conclusionLabel = report.conclusion === 'qualified' ? T({ vi: 'ĐẠT — Đủ điều kiện', en: 'QUALIFIED' }) :
                          report.conclusion === 'qualified_with_conditions' ? T({ vi: 'ĐẠT CÓ ĐIỀU KIỆN', en: 'QUALIFIED WITH CONDITIONS' }) :
                          T({ vi: 'KHÔNG ĐẠT', en: 'NOT QUALIFIED' });

    html += ui.renderSection({ vi: 'Kết luận', en: 'Conclusion' },
      '<div style="display:flex;align-items:center;gap:16px;padding:16px">' +
      '<span class="eqms-badge ' + conclusionClass + '" style="font-size:16px;padding:8px 20px">' + esc(conclusionLabel) + '</span>' +
      '<p style="margin:0;flex:1;line-height:1.6;color:var(--hm-text-secondary,#64748b)">' + esc(report.conclusion_text || '') + '</p>' +
      '</div>'
    );

    // Open items
    if (report.open_items && report.open_items.length > 0) {
      var openColumns = [
        { key: 'item_id',     label: { vi: 'Mã',         en: 'ID' },          type: 'id' },
        { key: 'description', label: { vi: 'Mô tả',      en: 'Description' }, type: 'truncate' },
        { key: 'owner',       label: { vi: 'Chủ sở hữu', en: 'Owner' } },
        { key: 'due_date',    label: { vi: 'Hạn',         en: 'Due Date' },   type: 'date' },
        { key: 'status',      label: { vi: 'Trạng thái',  en: 'Status' },     type: 'badge' }
      ];

      html += ui.renderSection({ vi: 'Hạng mục mở', en: 'Open Items' },
        ui.renderDataGrid(openColumns, report.open_items, { selectable: false })
      );
    }

    return html;
  }

  // --- Related Records + Audit Trail Tab ---
  function renderRelatedTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Liên kết', en: 'Relationships' },
      ui.renderRelationshipsPanel(state.relationships)
    );

    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    return html;
  }

  // --- Signatures + Attachments + Comments Tab ---
  function renderSignaturesTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Chữ ký điện tử', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Soạn thảo', en: 'Prepared' },
        { vi: 'Xem xét', en: 'Reviewed' },
        { vi: 'Phê duyệt', en: 'Approved' },
        { vi: 'QA Phê duyệt', en: 'QA Approved' }
      ])
    );

    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );

    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );

    return html;
  }

  // =========================================================================
  // SCREEN: CREATE (WIZARD)
  // =========================================================================
  function renderCreate() {
    var steps = [
      { label: { vi: 'Loại & Thông tin',    en: 'Type & Information' } },
      { label: { vi: 'Thiết bị & Nhóm',     en: 'Equipment & Team' } },
      { label: { vi: 'Xem lại & Gửi',       en: 'Review & Submit' } }
    ];

    var bodyHtml = '';
    switch (state.wizardStep) {
      case 0: bodyHtml = renderWizardStep0(); break;
      case 1: bodyHtml = renderWizardStep1(); break;
      case 2: bodyHtml = renderWizardStep2(); break;
    }

    var html = '<button class="eqms-btn ghost sm" data-action="go-inventory" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to inventory' });
    html += '</button>';
    html += ui.renderWizardShell(steps, state.wizardStep, bodyHtml, { saveDraft: true });

    return html;
  }

  function renderWizardStep0() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Loại xác nhận & Thông tin cơ bản', en: 'Validation Type & Basic Information' }) + '</h3>';
    html += ui.renderFormField({ key: 'validation_type', label: { vi: 'Loại xác nhận', en: 'Validation Type' }, type: 'select', options: VALIDATION_TYPES, value: d.validation_type, required: true });
    html += ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề dự án', en: 'Project Title' }, type: 'text', value: d.title, required: true, placeholder: { vi: 'Nhập tiêu đề...', en: 'Enter project title...' } });
    html += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description, placeholder: { vi: 'Mô tả phạm vi xác nhận...', en: 'Describe the validation scope...' } });
    html += ui.renderFormField({ key: 'rationale', label: { vi: 'Lý do xác nhận', en: 'Validation Rationale' }, type: 'textarea', value: d.rationale, placeholder: { vi: 'Tại sao cần xác nhận...', en: 'Why validation is needed...' } });
    html += '</div>';
    return html;
  }

  function renderWizardStep1() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Thiết bị và Nhóm', en: 'Equipment & Team' }) + '</h3>';
    html += ui.renderFormField({ key: 'equipment_system', label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, type: 'text', value: d.equipment_system, required: true, placeholder: { vi: 'Tên thiết bị hoặc hệ thống...', en: 'Equipment or system name...' } });
    html += ui.renderFormField({ key: 'team_lead', label: { vi: 'Trưởng nhóm', en: 'Team Lead' }, type: 'text', value: d.team_lead, required: true });
    html += ui.renderFormField({ key: 'team_members', label: { vi: 'Thành viên nhóm', en: 'Team Members' }, type: 'textarea', value: d.team_members, placeholder: { vi: 'Cách nhau bởi dấu phẩy...', en: 'Comma-separated names...' } });
    html += ui.renderFormField({ key: 'target_date', label: { vi: 'Ngày mục tiêu hoàn thành', en: 'Target Completion Date' }, type: 'date', value: d.target_date, required: true });
    html += '</div>';
    return html;
  }

  function renderWizardStep2() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Xem lại thông tin trước khi gửi', en: 'Review Before Submission' }) + '</h3>';
    html += ui.renderFieldGrid([
      { label: { vi: 'Loại xác nhận',       en: 'Validation Type' },    value: d.validation_type,   badge: true },
      { label: { vi: 'Tiêu đề',             en: 'Title' },              value: d.title },
      { label: { vi: 'Thiết bị / Hệ thống', en: 'Equipment / System' }, value: d.equipment_system },
      { label: { vi: 'Trưởng nhóm',         en: 'Team Lead' },          value: d.team_lead },
      { label: { vi: 'Ngày mục tiêu',       en: 'Target Date' },        value: fmtDate(d.target_date) },
      { label: { vi: 'Mô tả',               en: 'Description' },        value: d.description },
      { label: { vi: 'Lý do',               en: 'Rationale' },          value: d.rationale }
    ]);
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-analytics');

    var m = state.metrics || {};
    var html = '';

    html += '<button class="eqms-btn ghost sm" data-action="go-inventory" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to inventory' });
    html += '</button>';

    html += '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600">' + T({ vi: 'Phân tích xác nhận', en: 'Validation Analytics' }) + '</h2>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng dự án',              en: 'Total Projects' },          value: fmt(m.total_projects || 0) },
      { label: { vi: 'Tỉ lệ hoàn thành đúng hạn', en: 'On-time Completion Rate' }, value: (m.ontime_rate || 0) + '%', accent: (m.ontime_rate || 0) >= 80 ? 'success' : 'warning' },
      { label: { vi: 'Tỉ lệ sai lệch',          en: 'Deviation Rate' },           value: (m.deviation_rate || 0) + '%', accent: (m.deviation_rate || 0) > 10 ? 'danger' : '' },
      { label: { vi: 'Độ bao phủ yêu cầu TB',   en: 'Avg Req Coverage' },        value: (m.avg_req_coverage || 0) + '%' }
    ]);

    // Project status pie chart / table
    var statusData = m.by_status || [];
    var statusColumns = [
      { key: 'status',  label: { vi: 'Trạng thái',  en: 'Status' },  type: 'badge' },
      { key: 'count',   label: { vi: 'Số lượng',    en: 'Count' },   type: 'number' },
      { key: 'percent', label: { vi: 'Tỉ lệ',       en: 'Percent' }, render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Dự án theo trạng thái', en: 'Projects by Status' },
      ui.renderChartWithTableFallback('val-status-chart', null, statusColumns, statusData, { defaultMode: 'table' })
    );
    html += '</div>';

    // Deviation rate by project type
    var devByType = m.deviation_by_type || [];
    var devColumns = [
      { key: 'type',           label: { vi: 'Loại xác nhận',   en: 'Validation Type' }, type: 'badge' },
      { key: 'total_projects', label: { vi: 'Tổng dự án',       en: 'Total Projects' }, type: 'number' },
      { key: 'deviations',     label: { vi: 'Sai lệch',         en: 'Deviations' },     type: 'number' },
      { key: 'deviation_rate', label: { vi: 'Tỉ lệ sai lệch',   en: 'Deviation Rate' }, render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Tỉ lệ sai lệch theo loại dự án', en: 'Deviation Rate by Project Type' },
      ui.renderChartWithTableFallback('val-dev-type-chart', null, devColumns, devByType, { defaultMode: 'table' })
    );
    html += '</div>';

    // Requirements coverage trend
    var coverageTrend = m.coverage_trend || [];
    var coverageColumns = [
      { key: 'period',        label: { vi: 'Giai đoạn',       en: 'Period' } },
      { key: 'coverage_rate', label: { vi: 'Độ bao phủ (%)',  en: 'Coverage (%)' }, type: 'number' },
      { key: 'projects',      label: { vi: 'Số dự án',        en: 'Projects' },     type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng độ bao phủ yêu cầu', en: 'Requirements Coverage Trend' },
      ui.renderChartWithTableFallback('val-coverage-chart', null, coverageColumns, coverageTrend, { defaultMode: 'table' })
    );
    html += '</div>';

    return html;
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function(e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { state.activeTab = tab.getAttribute('data-tab'); paint(); return; }

      var sortTh = e.target.closest('th[data-sort]');
      if (sortTh && state.screen === SCREENS.INVENTORY) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        state.pagination.offset = 0;
        loadInventory();
        return;
      }

      var row = e.target.closest('tr[data-id]');
      if (row && state.screen === SCREENS.INVENTORY && !e.target.closest('input[type="checkbox"]')) {
        var id = row.getAttribute('data-id');
        if (id) { state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary'; loadDetail(id); }
        return;
      }

      var pageBtn = e.target.closest('[data-action="page"]');
      if (pageBtn) {
        var page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page > 0) { state.pagination.offset = (page - 1) * state.pagination.limit; loadInventory(); }
        return;
      }

      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'go-inventory':
          state.screen = SCREENS.INVENTORY; state.record = null; state.recordId = null; loadInventory(); break;
        case 'go-create':
          state.screen = SCREENS.CREATE; state.wizardStep = 0; state.wizardData = {}; paint(); break;
        case 'go-analytics':
          state.screen = SCREENS.ANALYTICS; loadMetrics(); break;
        case 'retry-inventory':
          loadInventory(); break;
        case 'retry-detail':
          if (state.recordId) loadDetail(state.recordId); break;
        case 'retry-analytics':
          loadMetrics(); break;
        case 'apply-filters':
          collectFilters(); state.pagination.offset = 0; loadInventory(); break;
        case 'reset-filters':
          state.filters = {}; state.pagination.offset = 0; loadInventory(); break;
        case 'wizard-next':
          collectWizardData(); if (state.wizardStep < 2) { state.wizardStep++; paint(); } break;
        case 'wizard-back':
          if (state.wizardStep > 0) { state.wizardStep--; paint(); } break;
        case 'wizard-save-draft':
          collectWizardData(); saveDraft(); break;
        case 'wizard-submit':
          collectWizardData(); submitProject(); break;
        case 'define-requirements':
        case 'author-protocol':
        case 'approve-protocol':
        case 'start-execution':
        case 'record-result':
        case 'log-deviation':
        case 'generate-summary':
          executeAction(action); break;
        case 'save-requirement':
          saveRequirement(); break;
        case 'save-execution':
          saveExecution(); break;
        case 'add-comment':
          postComment(); break;
        case 'export':
          handleExport(actionEl.getAttribute('data-format')); break;
      }
    });
  }

  // =========================================================================
  // DATA COLLECTION
  // =========================================================================
  function collectFilters() {
    if (!_container) return;
    state.filters = {};
    _container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      if (el.value) state.filters[key] = el.value;
    });
  }

  function collectWizardData() {
    if (!_container) return;
    _container.querySelectorAll('[data-field]').forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key === 'new-comment') return;
      state.wizardData[key] = el.value;
    });
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function executeAction(action) {
    if (!state.record || !state.record.id) return;
    apiCall('eqms_validation_projects_update', { id: state.record.id, action: action }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function saveDraft() {
    var payload = Object.assign({}, state.wizardData, { status: 'planning' });
    apiCall('eqms_validation_projects_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.project_id);
      }
    });
  }

  function submitProject() {
    var payload = Object.assign({}, state.wizardData, { action: 'submit' });
    apiCall('eqms_validation_projects_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.project_id);
      }
    });
  }

  function saveRequirement() {
    if (!_container || !state.record) return;
    var data = {};
    _container.querySelectorAll('[data-field^="req_"]').forEach(function(el) {
      data[el.getAttribute('data-field').replace('req_', '')] = el.value;
    });
    data.project_id = state.record.id;
    apiCall('eqms_validation_projects_update', { id: state.record.id, action: 'add-requirement', requirement: data }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function saveExecution() {
    if (!_container || !state.record) return;
    var data = {};
    _container.querySelectorAll('[data-field^="exec_"]').forEach(function(el) {
      data[el.getAttribute('data-field').replace('exec_', '')] = el.value;
    });
    data.project_id = state.record.id;
    apiCall('eqms_validation_projects_update', { id: state.record.id, action: 'record-result', execution: data }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function postComment() {
    if (!_container || !state.record) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    apiCall('eqms_validation_audit', { id: state.record.id, action: 'add-comment', text: textarea.value.trim() }).then(function(res) {
      if (res.success) { state.comments = res.data || state.comments; textarea.value = ''; paint(); }
    });
  }

  function handleExport(format) {
    var payload = { format: format };
    if (state.screen === SCREENS.WORKSPACE && state.record) { payload.id = state.record.id; }
    else { payload.filters = state.filters; }
    apiCall('eqms_validation_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) { window.open(res.data.url, '_blank'); }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['validation'] = { render: render, meta: MOD };

})();

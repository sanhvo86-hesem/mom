/**
 * EQMS Training & Competency — Worklist + Matrix + Object Page
 * HESEM MOM Portal · 49-eqms-training.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: training
 * Archetype: list-report
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Matrix View | Assignment Queue | Session Detail | Curriculum Mgmt | Analytics
 * Workflow: assigned → in_progress → completed → verified | expired | waived
 * Actions: assign, launch-session, record-completion, record-assessment,
 *          verify-effectiveness, expire, waive
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
    id:        'training',
    version:   '1.1.0',
    archetype: 'list-report',
    endpoints: [
      'eqms_training_query', 'eqms_training_detail', 'eqms_training_create',
      'eqms_training_matrix', 'eqms_training_curricula',
      'eqms_training_metrics', 'eqms_training_audit',
      'eqms_training_comments', 'eqms_training_attachments',
      'eqms_training_signatures', 'eqms_training_relationships',
      'eqms_training_available_actions', 'eqms_training_export',
      'eqms_training_action_launch_session', 'eqms_training_action_record_completion',
      'eqms_training_action_record_assessment', 'eqms_training_action_verify_effectiveness',
      'eqms_training_action_expire', 'eqms_training_action_waive'
    ],
    workflow: ['assigned', 'in_progress', 'completed', 'verified', 'expired', 'waived']
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var STATUS_OPTIONS = [
    { value: 'assigned',    label: { vi: 'Đã giao',       en: 'Assigned' } },
    { value: 'in_progress', label: { vi: 'Đang thực hiện', en: 'In Progress' } },
    { value: 'completed',   label: { vi: 'Hoàn thành',     en: 'Completed' } },
    { value: 'verified',    label: { vi: 'Đã xác minh',    en: 'Verified' } },
    { value: 'expired',     label: { vi: 'Hết hạn',        en: 'Expired' } },
    { value: 'waived',      label: { vi: 'Miễn trừ',       en: 'Waived' } }
  ];

  var METHOD_OPTIONS = [
    { value: 'classroom',   label: { vi: 'Lớp học',             en: 'Classroom' } },
    { value: 'ojt',         label: { vi: 'Đào tạo tại chỗ',    en: 'OJT' } },
    { value: 'e-learning',  label: { vi: 'Trực tuyến',          en: 'E-Learning' } },
    { value: 'self-study',  label: { vi: 'Tự học',              en: 'Self-Study' } }
  ];

  // Matrix cell symbols
  var CELL_SYMBOLS = {
    qualified: { symbol: '\u2713', cls: 'qualified',  title: { vi: 'Đủ năng lực', en: 'Qualified' } },
    due:       { symbol: '\u25CB', cls: 'due',        title: { vi: 'Sắp đến hạn', en: 'Due' } },
    overdue:   { symbol: '\u2717', cls: 'overdue',    title: { vi: 'Quá hạn',     en: 'Overdue' } },
    expired:   { symbol: '\u2298', cls: 'expired',    title: { vi: 'Hết hạn',     en: 'Expired' } },
    na:        { symbol: '\u2014', cls: 'na',         title: { vi: 'N/A',          en: 'N/A' } }
  };

  var SCREENS = { MATRIX: 'matrix', QUEUE: 'queue', DETAIL: 'detail', CURRICULA: 'curricula', ANALYTICS: 'analytics' };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.MATRIX,
    // Shared
    filters: {},
    loading: false,
    error: null,
    // Matrix
    matrixData: null,  // { roles: [], curricula: [], cells: {} }
    // Queue
    assignments: [],
    queuePagination: { offset: 0, limit: 25, total: 0 },
    sortKey: 'due_date',
    sortDir: 'asc',
    // Detail
    activeTab: 'summary',
    record: null,
    recordId: null,
    auditEvents: [],
    signatures: [],
    comments: [],
    attachments: [],
    // Curricula
    curriculaList: [],
    curriculaPagination: { offset: 0, limit: 25, total: 0 },
    // Analytics
    metrics: null
  };

  var _container = null;

  // =========================================================================
  // MATRIX DATA NORMALIZATION
  // =========================================================================
  /**
   * Backend may return flat rows: [{ employee_id, curriculum_id, curriculum_name, ... }]
   * Frontend expects: { roles: [...], curricula: [...], cells: { 'roleId::currId': status } }
   */
  function normalizeMatrixData(rawData) {
    if (!Array.isArray(rawData)) return rawData;
    if (rawData.length === 0) return { roles: [], curricula: [], cells: {} };

    var rolesMap = {};
    var curriculaMap = {};
    var cells = {};

    rawData.forEach(function(row) {
      var empId = row.employee_id || row.role_id || '';
      var curId = row.curriculum_id || '';
      var curName = row.curriculum_name || row.name || curId;

      if (empId && !rolesMap[empId]) {
        rolesMap[empId] = { id: empId, name: row.employee_name || row.role_name || empId, department: row.department || '' };
      }
      if (curId && !curriculaMap[curId]) {
        curriculaMap[curId] = { id: curId, name: curName, department: row.department || '' };
      }

      if (empId && curId) {
        var cellKey = empId + '::' + curId;
        var status = row.completion_status || row.status || 'na';
        // Map backend statuses to matrix cell states
        if (status === 'completed' || status === 'verified') status = 'qualified';
        else if (status === 'assigned' || status === 'in_progress') {
          var dueDate = row.next_due_at || row.due_date;
          if (dueDate && new Date(dueDate) < new Date()) status = 'overdue';
          else status = 'due';
        }
        else if (status === 'expired') status = 'expired';
        else if (status === 'not_required' || !row.required) status = 'na';

        cells[cellKey] = status;
        if (row.training_id || row.record_id) {
          cells[cellKey + '::record_id'] = row.training_id || row.record_id || '';
        }
      }
    });

    return {
      roles: Object.values(rolesMap),
      curricula: Object.values(curriculaMap),
      cells: cells
    };
  }

  // =========================================================================
  // RENDER ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      state.screen = SCREENS.DETAIL;
      state.recordId = context.recordId;
      loadDetail(context.recordId);
    } else if (context.screen === 'queue') {
      state.screen = SCREENS.QUEUE;
      loadQueue();
    } else if (context.screen === 'curricula') {
      state.screen = SCREENS.CURRICULA;
      loadCurricula();
    } else if (context.screen === 'analytics') {
      state.screen = SCREENS.ANALYTICS;
      loadMetrics();
    } else {
      state.screen = SCREENS.MATRIX;
      loadMatrix();
    }

    paint();
  }

  function paint() {
    if (!_container) return;
    var html = '';

    // Screen tabs (top-level navigation)
    html += renderScreenNav();

    switch (state.screen) {
      case SCREENS.MATRIX:    html += renderMatrix();    break;
      case SCREENS.QUEUE:     html += renderQueue();     break;
      case SCREENS.DETAIL:    html += renderDetail();    break;
      case SCREENS.CURRICULA: html += renderCurricula(); break;
      case SCREENS.ANALYTICS: html += renderAnalytics(); break;
    }

    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // SCREEN NAVIGATION BAR
  // =========================================================================
  function renderScreenNav() {
    var screens = [
      { id: SCREENS.MATRIX,    label: { vi: 'Ma trận năng lực',      en: 'Competency Matrix' } },
      { id: SCREENS.QUEUE,     label: { vi: 'Hàng đợi giao việc',    en: 'Assignment Queue' } },
      { id: SCREENS.CURRICULA, label: { vi: 'Chương trình đào tạo',  en: 'Curriculum Management' } },
      { id: SCREENS.ANALYTICS, label: { vi: 'Phân tích',             en: 'Analytics' } }
    ];

    // Don't show nav on detail
    if (state.screen === SCREENS.DETAIL) return '';

    var html = '<div class="eqms-tabs" style="margin-bottom:16px">';
    screens.forEach(function(s) {
      html += '<div class="eqms-tab ' + (s.id === state.screen ? 'active' : '') + '" data-screen="' + esc(s.id) + '">';
      html += esc(T(s.label));
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadMatrix() {
    state.loading = true;
    state.error = null;
    paint();

    apiCall('eqms_training_matrix', state.filters).then(function(res) {
      state.loading = false;
      if (res.success || res.ok) {
        state.matrixData = res.data || res.matrix || { roles: [], curricula: [], cells: {} };
        // Normalize: backend may return { matrix: [...] } instead of { roles, curricula, cells }
        if (Array.isArray(state.matrixData.matrix || state.matrixData)) {
          state.matrixData = normalizeMatrixData(state.matrixData.matrix || state.matrixData);
        }
      } else {
        state.error = { message: res.message || res.error || T({ vi: 'Không tải được ma trận đào tạo', en: 'Failed to load training matrix' }), status: res._httpStatus || 0, endpoint: 'eqms_training_matrix' };
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = { message: err.message || 'Network error', status: err.status || 0, endpoint: 'eqms_training_matrix' };
      paint();
    });
  }

  function loadQueue() {
    state.loading = true;
    state.error = null;
    paint();

    // Backend parseQueryBody() expects: { filters: {}, search: '', offset, limit, sort_by, sort_dir }
    var filters = Object.assign({}, state.filters);
    var searchStr = filters.search || '';
    delete filters.search;

    var payload = {
      filters: filters,
      search: searchStr,
      offset: state.queuePagination.offset,
      limit: state.queuePagination.limit,
      sort_by: state.sortKey,
      sort_dir: state.sortDir
    };

    apiCall('eqms_training_query', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        // Backend wraps rows in res.data.training_records (paginated) or res.data directly
        var rows = res.data;
        if (rows && rows.training_records) { rows = rows.training_records; }
        state.assignments = Array.isArray(rows) ? rows : [];
        state.queuePagination.total = (res.data && res.data.total != null) ? res.data.total : state.assignments.length;
      } else {
        state.error = res.message || T({ vi: 'Không tải được danh sách giao việc', en: 'Failed to load assignments' });
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

    apiCall('eqms_training_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success) {
        // Backend returns res.data.training_record (single object)
        var rec = res.data;
        if (rec && rec.training_record) { rec = rec.training_record; }
        state.record = rec || {};
      } else {
        state.error = res.message || T({ vi: 'Không tải được bản ghi đào tạo', en: 'Failed to load training record' });
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });

    // Load sidebar data in parallel
    apiCall('eqms_training_audit', { id: id }).then(function(res) {
      if (res.success) { state.auditEvents = res.data ? (res.data.audit_events || res.data) : []; paint(); }
    });
    apiCall('eqms_training_comments', { id: id }).then(function(res) {
      if (res.success) { state.comments = res.data ? (res.data.comments || res.data) : []; paint(); }
    });
    apiCall('eqms_training_attachments', { id: id }).then(function(res) {
      if (res.success) { state.attachments = res.data ? (res.data.attachments || res.data) : []; paint(); }
    });
    apiCall('eqms_training_signatures', { id: id }).then(function(res) {
      if (res.success) { state.signatures = res.data ? (res.data.signatures || res.data) : []; paint(); }
    });
  }

  function loadCurricula() {
    state.loading = true;
    state.error = null;
    paint();

    var curFilters = Object.assign({}, state.filters);
    var curSearch = curFilters.search || '';
    delete curFilters.search;

    var payload = {
      filters: curFilters,
      search: curSearch,
      offset: state.curriculaPagination.offset,
      limit: state.curriculaPagination.limit
    };

    apiCall('eqms_training_curricula', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        var rows = res.data;
        // Backend returns res.data.curricula (paginated)
        if (rows && rows.curricula) { rows = rows.curricula; }
        state.curriculaList = Array.isArray(rows) ? rows : [];
        state.curriculaPagination.total = (res.data && res.data.total != null) ? res.data.total : state.curriculaList.length;
      } else {
        state.error = res.message || T({ vi: 'Không tải được chương trình', en: 'Failed to load curricula' });
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function loadMetrics() {
    state.loading = true;
    state.error = null;
    paint();

    apiCall('eqms_training_metrics', {}).then(function(res) {
      state.loading = false;
      if (res.success) {
        var m = res.data;
        // Backend returns res.data.metrics
        if (m && m.metrics) { m = m.metrics; }
        state.metrics = m || {};
      } else {
        state.error = res.message || T({ vi: 'Không tải được dữ liệu phân tích', en: 'Failed to load metrics' });
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  // =========================================================================
  // SCREEN 1: MATRIX VIEW
  // =========================================================================
  function renderMatrix() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải ma trận năng lực...', en: 'Loading competency matrix...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-matrix', { endpoint: state.error && state.error.endpoint });

    var md = state.matrixData;
    if (!md || !md.roles || !md.roles.length) {
      return ui.renderEmptyState({
        icon: '\uD83C\uDF93',
        title: { vi: 'Chưa có dữ liệu ma trận', en: 'No matrix data' },
        desc: { vi: 'Tạo chương trình đào tạo và giao cho nhân viên', en: 'Create curricula and assign to personnel' }
      });
    }

    var html = '';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'department', type: 'text', label: { vi: 'Phòng ban', en: 'Department' }, width: '160px' },
        { key: 'role', type: 'text', label: { vi: 'Vai trò', en: 'Role' }, width: '160px' },
        { key: 'matrix_status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: [
          { value: 'qualified', label: { vi: 'Đủ năng lực', en: 'Qualified' } },
          { value: 'due',       label: { vi: 'Sắp đến hạn', en: 'Due' } },
          { value: 'overdue',   label: { vi: 'Quá hạn', en: 'Overdue' } },
          { value: 'expired',   label: { vi: 'Hết hạn', en: 'Expired' } }
        ]}
      ]
    });

    // Legend
    html += '<div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;font-size:12px;color:var(--hm-text-secondary,#64748b)">';
    Object.keys(CELL_SYMBOLS).forEach(function(key) {
      var sym = CELL_SYMBOLS[key];
      html += '<span class="eqms-matrix-legend-item">';
      html += '<span class="eqms-matrix-cell ' + sym.cls + '" style="display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;font-size:13px;border-radius:4px;margin-right:4px">' + sym.symbol + '</span>';
      html += esc(T(sym.title));
      html += '</span>';
    });
    html += '</div>';

    // Export
    html += '<div style="display:flex;justify-content:flex-end;margin-bottom:8px">';
    html += ui.renderExportMenu({ formats: ['excel', 'pdf'] });
    html += '</div>';

    // Matrix table
    var curricula = md.curricula || [];
    var roles = md.roles || [];
    var cells = md.cells || {};

    html += '<div class="eqms-grid-wrapper" style="overflow-x:auto">';
    html += '<table class="eqms-grid eqms-matrix-table">';

    // Header
    html += '<thead><tr>';
    html += '<th style="min-width:180px;position:sticky;left:0;background:var(--hm-bg-primary,#fff);z-index:2">' + T({ vi: 'Vai trò / Nhân viên', en: 'Role / Person' }) + '</th>';
    curricula.forEach(function(c) {
      html += '<th style="text-align:center;min-width:80px;writing-mode:vertical-lr;transform:rotate(180deg);height:120px;white-space:nowrap;font-size:11px">';
      html += esc(c.name || c.id);
      html += '</th>';
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    roles.forEach(function(role) {
      html += '<tr data-role-id="' + esc(role.id || '') + '">';
      html += '<td style="position:sticky;left:0;background:var(--hm-bg-primary,#fff);z-index:1;font-weight:500">';
      html += '<div>' + esc(role.name || '') + '</div>';
      if (role.department) html += '<div style="font-size:11px;color:var(--hm-text-tertiary,#94a3b8)">' + esc(role.department) + '</div>';
      html += '</td>';

      curricula.forEach(function(c) {
        var cellKey = (role.id || role.name) + '::' + (c.id || c.name);
        var cellStatus = cells[cellKey] || 'na';
        var sym = CELL_SYMBOLS[cellStatus] || CELL_SYMBOLS.na;
        var cellRecordId = cells[cellKey + '::record_id'] || '';

        html += '<td style="text-align:center;cursor:pointer" class="eqms-matrix-cell ' + sym.cls + '" ';
        html += 'data-action="open-cell" data-record-id="' + esc(cellRecordId) + '" ';
        html += 'data-role="' + esc(role.id || role.name) + '" data-curriculum="' + esc(c.id || c.name) + '" ';
        html += 'title="' + esc(T(sym.title)) + '">';
        html += sym.symbol;
        html += '</td>';
      });

      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  }

  // =========================================================================
  // SCREEN 2: ASSIGNMENT QUEUE
  // =========================================================================
  function renderQueue() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải danh sách giao việc...', en: 'Loading assignment queue...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-queue');

    var html = '';

    // KPI row
    var totalAssignments = state.queuePagination.total;
    var overdue = state.assignments.filter(function(a) { return isOverdue(a); }).length;
    var pending = state.assignments.filter(function(a) { return a.status === 'assigned' || a.status === 'in_progress'; }).length;

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng giao việc',       en: 'Total Assignments' }, value: fmt(totalAssignments) },
      { label: { vi: 'Đang chờ / Đang làm',  en: 'Pending / In Progress' }, value: fmt(pending), accent: 'warning' },
      { label: { vi: 'Quá hạn',              en: 'Overdue' }, value: fmt(overdue), accent: overdue > 0 ? 'danger' : '' },
      { label: { vi: 'Hoàn thành tháng này',  en: 'Completed This Month' }, value: fmt(countCompletedThisMonth()), accent: 'success' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="bulk-assign">';
    html += '+ ' + T({ vi: 'Giao đào tạo hàng loạt', en: 'Bulk Assign' });
    html += '</button>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';
    html += ui.renderExportMenu({ formats: ['excel', 'csv'] });
    html += '</div></div>';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm theo tên hoặc chương trình...', en: 'Search by name or curriculum...' }, width: '220px' },
        { key: 'department', type: 'text', label: { vi: 'Phòng ban', en: 'Department' }, width: '140px' },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: STATUS_OPTIONS },
        { key: 'overdue_only', type: 'select', label: { vi: 'Bộ lọc', en: 'Filter' }, options: [
          { value: 'overdue', label: { vi: 'Chỉ quá hạn', en: 'Overdue only' } }
        ]}
      ]
    });

    // Data grid
    var columns = [
      { key: 'employee_name',  label: { vi: 'Học viên',       en: 'Trainee' },      sortable: true },
      { key: 'curriculum_name', label: { vi: 'Chương trình',   en: 'Curriculum' },   sortable: true,
        render: function(val, row) { return esc(val || row.curriculum_id || '—'); }
      },
      { key: 'due_date',   label: { vi: 'Hạn hoàn thành',     en: 'Due Date' },     type: 'date', sortable: true,
        render: function(val, row) {
          var cls = isOverdue(row) ? 'color:var(--hm-accent-danger,#ef4444);font-weight:600' : '';
          return '<span style="' + cls + '">' + esc(fmtDate(val)) + '</span>';
        }
      },
      { key: 'status',     label: { vi: 'Trạng thái',          en: 'Status' },       type: 'badge', sortable: true },
      { key: 'assigned_by', label: { vi: 'Người giao',          en: 'Assigned By' }, sortable: true },
      { key: 'training_type', label: { vi: 'Phương pháp',       en: 'Method' },      type: 'badge', sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.assignments, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination(state.queuePagination);

    return html;
  }

  function isOverdue(row) {
    if (!row.due_date) return false;
    if (row.status === 'completed' || row.status === 'verified' || row.status === 'waived') return false;
    return new Date(row.due_date) < new Date();
  }

  function countCompletedThisMonth() {
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return state.assignments.filter(function(a) {
      return a.status === 'completed' && a.completed_at && new Date(a.completed_at) >= monthStart;
    }).length;
  }

  // =========================================================================
  // SCREEN 3: SESSION DETAIL
  // =========================================================================
  function renderDetail() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải chi tiết đào tạo...', en: 'Loading training session...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-detail');
    if (!state.record) return ui.renderEmptyState({ icon: '\uD83C\uDF93', title: { vi: 'Không tìm thấy bản ghi', en: 'Record not found' } });

    var rec = state.record;
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-queue" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại', en: 'Back' });
    html += '</button>';

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getDetailActions(rec),
      extraMeta: [
        { label: { vi: 'Học viên',      en: 'Trainee' },      value: rec.employee_name || rec.trainee },
        { label: { vi: 'Chương trình',  en: 'Curriculum' },   value: rec.curriculum_name || rec.curriculum || rec.curriculum_id },
        { label: { vi: 'Phương pháp',   en: 'Method' },       value: rec.training_type || rec.method },
        { label: { vi: 'Hạn hoàn thành', en: 'Due Date' },    value: fmtDate(rec.due_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(MOD.workflow, rec.status);

    // Tabs
    var tabs = [
      { id: 'summary',        label: { vi: 'Tóm tắt',                en: 'Summary' } },
      { id: 'assessment',     label: { vi: 'Đánh giá',              en: 'Assessment' } },
      { id: 'effectiveness',  label: { vi: 'Xác minh hiệu quả',     en: 'Effectiveness' } },
      { id: 'doc-triggers',   label: { vi: 'Tài liệu kích hoạt',    en: 'Document Triggers' } },
      { id: 'audit',          label: { vi: 'Kiểm toán',             en: 'Audit Trail' } }
    ];

    html += ui.renderTabs(tabs, state.activeTab);
    html += '<div class="eqms-tab-content">';
    html += renderDetailTab();
    html += '</div>';

    return html;
  }

  function getDetailActions(rec) {
    var actions = [];
    var s = rec.status;

    if (s === 'assigned') {
      actions.push({ action: 'launch-session', label: { vi: 'Bắt đầu đào tạo', en: 'Launch Session' }, style: 'primary' });
      actions.push({ action: 'waive', label: { vi: 'Miễn trừ', en: 'Waive' }, style: 'ghost' });
    }
    if (s === 'in_progress') {
      actions.push({ action: 'record-completion', label: { vi: 'Ghi nhận hoàn thành', en: 'Record Completion' }, style: 'primary' });
    }
    if (s === 'completed') {
      actions.push({ action: 'record-assessment', label: { vi: 'Ghi nhận đánh giá', en: 'Record Assessment' }, style: 'secondary' });
      actions.push({ action: 'verify-effectiveness', label: { vi: 'Xác minh hiệu quả', en: 'Verify Effectiveness' }, style: 'primary' });
    }
    if (s === 'verified') {
      actions.push({ action: 'expire', label: { vi: 'Đánh dấu hết hạn', en: 'Mark Expired' }, style: 'ghost' });
    }

    return actions;
  }

  // =========================================================================
  // DETAIL TABS
  // =========================================================================
  function renderDetailTab() {
    switch (state.activeTab) {
      case 'summary':       return renderSummaryTab();
      case 'assessment':    return renderAssessmentTab();
      case 'effectiveness': return renderEffectivenessTab();
      case 'doc-triggers':  return renderDocTriggersTab();
      case 'audit':         return renderAuditTab();
      default:              return '';
    }
  }

  // --- Summary Tab ---
  function renderSummaryTab() {
    var rec = state.record;
    return ui.renderSection({ vi: 'Thông tin phiên đào tạo', en: 'Training Session Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã đào tạo',       en: 'Training ID' },      value: rec.training_number || rec.training_id, mono: true },
        { label: { vi: 'Học viên',          en: 'Trainee' },          value: rec.employee_name || rec.trainee },
        { label: { vi: 'Chương trình',      en: 'Curriculum' },       value: rec.curriculum_name || rec.curriculum || rec.curriculum_id },
        { label: { vi: 'Phương pháp',       en: 'Method' },           value: rec.training_type || rec.method,        badge: true },
        { label: { vi: 'Ngày giao',         en: 'Assigned Date' },    value: fmtDate(rec.assigned_at) },
        { label: { vi: 'Người giao',        en: 'Assigned By' },      value: rec.assigned_by },
        { label: { vi: 'Ngày hoàn thành',   en: 'Completed Date' },   value: fmtDate(rec.completed_at || rec.training_date) },
        { label: { vi: 'Thời lượng (giờ)',  en: 'Duration (hrs)' },   value: rec.duration_hours != null ? rec.duration_hours + ' ' + T({ vi: 'giờ', en: 'hrs' }) : null },
        { label: { vi: 'Trạng thái',        en: 'Status' },           value: rec.status,                             badge: true },
        { label: { vi: 'Điểm đánh giá',     en: 'Assessment Score' }, value: rec.assessment_score != null ? rec.assessment_score + '%' : null },
        { label: { vi: 'Đạt / Không đạt',   en: 'Assessment Result' }, value: rec.assessment_passed != null ? (rec.assessment_passed === 'true' || rec.assessment_passed === true ? T({ vi: 'Đạt', en: 'Pass' }) : T({ vi: 'Không đạt', en: 'Fail' })) : null, badge: true },
        { label: { vi: 'Hạn hoàn thành',    en: 'Due Date' },         value: fmtDate(rec.due_date) },
        { label: { vi: 'Tài liệu',          en: 'Document' },         value: rec.document_id ? (rec.document_id + (rec.document_revision ? ' rev.' + rec.document_revision : '')) : null, mono: true }
      ])
    );
  }

  // --- Assessment Tab ---
  function renderAssessmentTab() {
    var rec = state.record;
    var html = '';

    if (!rec.assessment_score && rec.assessment_score !== 0) {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDCDD',
        title: { vi: 'Chưa có đánh giá', en: 'No assessment recorded' },
        desc: { vi: 'Ghi nhận kết quả đánh giá sau khi hoàn thành đào tạo', en: 'Record assessment results after training completion' }
      });

      if (rec.status === 'completed') {
        html += '<div style="text-align:center;margin-top:12px">';
        html += '<button class="eqms-btn primary sm" data-action="record-assessment">';
        html += T({ vi: 'Ghi nhận đánh giá', en: 'Record Assessment' });
        html += '</button></div>';
      }
      return html;
    }

    var passThreshold = 70;
    var passed = rec.assessment_score >= passThreshold;

    html += ui.renderSection({ vi: 'Kết quả đánh giá', en: 'Assessment Results' },
      ui.renderFieldGrid([
        { label: { vi: 'Điểm số',         en: 'Score' },            value: rec.assessment_score + '%', badge: false },
        { label: { vi: 'Kết quả',          en: 'Result' },           value: passed ? T({ vi: 'Đạt', en: 'Pass' }) : T({ vi: 'Không đạt', en: 'Fail' }), badge: true },
        { label: { vi: 'Phương pháp đánh giá', en: 'Assessment Method' }, value: rec.assessment_method },
        { label: { vi: 'Ngày đánh giá',    en: 'Assessment Date' },  value: fmtDate(rec.assessment_date) },
        { label: { vi: 'Cho phép thi lại', en: 'Retake Allowed' },   value: rec.retake_allowed ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) }
      ])
    );

    // Score visualization bar
    html += '<div style="margin-top:12px;padding:16px">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<span style="font-size:13px;color:var(--hm-text-secondary)">' + T({ vi: 'Điểm', en: 'Score' }) + '</span>';
    html += '<div style="flex:1;height:16px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:8px;overflow:hidden;position:relative">';
    html += '<div style="width:' + Math.min(rec.assessment_score, 100) + '%;height:100%;background:' + (passed ? 'var(--hm-accent-success,#22c55e)' : 'var(--hm-accent-danger,#ef4444)') + ';border-radius:8px;transition:width 0.3s"></div>';
    html += '<div style="position:absolute;left:' + passThreshold + '%;top:0;bottom:0;width:2px;background:var(--hm-text-tertiary,#94a3b8)" title="' + T({ vi: 'Ngưỡng đạt', en: 'Pass threshold' }) + ': ' + passThreshold + '%"></div>';
    html += '</div>';
    html += '<span style="font-weight:600;font-size:14px;min-width:40px">' + rec.assessment_score + '%</span>';
    html += '</div></div>';

    return html;
  }

  // --- Effectiveness Verification Tab ---
  function renderEffectivenessTab() {
    var rec = state.record;
    var html = '';

    if (!rec.verification_result) {
      html += ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Chưa xác minh hiệu quả', en: 'Effectiveness not verified' },
        desc: { vi: 'Xác minh sau khi học viên áp dụng kiến thức vào thực tế', en: 'Verify after the trainee applies knowledge in practice' }
      });

      if (rec.status === 'completed' || rec.status === 'verified') {
        html += '<div style="text-align:center;margin-top:12px">';
        html += '<button class="eqms-btn primary sm" data-action="verify-effectiveness">';
        html += T({ vi: 'Xác minh hiệu quả', en: 'Verify Effectiveness' });
        html += '</button></div>';
      }
      return html;
    }

    html += ui.renderSection({ vi: 'Xác minh hiệu quả đào tạo', en: 'Training Effectiveness Verification' },
      ui.renderFieldGrid([
        { label: { vi: 'Tiêu chí xác minh',    en: 'Verification Criteria' },  value: rec.verification_criteria },
        { label: { vi: 'Phương pháp đo lường',  en: 'Measurement Method' },     value: rec.verification_measurement },
        { label: { vi: 'Người xác minh',        en: 'Verifier' },               value: rec.verifier },
        { label: { vi: 'Ngày xác minh',         en: 'Verification Date' },      value: fmtDate(rec.verification_date) },
        { label: { vi: 'Kết quả',               en: 'Result' },                 value: rec.verification_result, badge: true }
      ])
    );

    return html;
  }

  // --- Document Triggers Tab ---
  function renderDocTriggersTab() {
    var rec = state.record;
    var docTriggers = rec.document_triggers || [];

    if (!docTriggers.length) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCC4',
        title: { vi: 'Không có tài liệu kích hoạt', en: 'No document triggers' },
        desc: { vi: 'Đào tạo này không được kích hoạt bởi tài liệu', en: 'This training was not triggered by a document change' }
      });
    }

    var docColumns = [
      { key: 'doc_id',     label: { vi: 'Mã tài liệu', en: 'Doc ID' },      type: 'id' },
      { key: 'title',      label: { vi: 'Tiêu đề',     en: 'Title' },       type: 'truncate' },
      { key: 'revision',   label: { vi: 'Phiên bản',   en: 'Revision' } },
      { key: 'change_type', label: { vi: 'Loại thay đổi', en: 'Change Type' }, type: 'badge' },
      { key: 'triggered_at', label: { vi: 'Ngày kích hoạt', en: 'Triggered' }, type: 'date' }
    ];

    return ui.renderSection({ vi: 'Tài liệu kích hoạt yêu cầu đào tạo', en: 'Documents That Triggered This Requirement' },
      ui.renderDataGrid(docColumns, docTriggers, { selectable: false })
    );
  }

  // --- Audit Trail + Signatures + Attachments + Comments ---
  function renderAuditTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Chữ ký điện tử', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Giảng viên', en: 'Trainer' },
        { vi: 'Học viên', en: 'Trainee' },
        { vi: 'Quản lý xác nhận', en: 'Manager Verified' }
      ])
    );

    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );

    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );

    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    return html;
  }

  // =========================================================================
  // SCREEN 4: CURRICULUM MANAGEMENT
  // =========================================================================
  function renderCurricula() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải chương trình đào tạo...', en: 'Loading curricula...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-curricula');

    var html = '';

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="create-curriculum">';
    html += '+ ' + T({ vi: 'Tạo chương trình', en: 'New Curriculum' });
    html += '</button>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';
    html += ui.renderExportMenu({ formats: ['excel', 'pdf'] });
    html += '</div></div>';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm chương trình...', en: 'Search curricula...' }, width: '220px' },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: [
          { value: 'active',   label: { vi: 'Đang hoạt động', en: 'Active' } },
          { value: 'inactive', label: { vi: 'Ngừng hoạt động', en: 'Inactive' } },
          { value: 'draft',    label: { vi: 'Nháp', en: 'Draft' } }
        ]}
      ]
    });

    if (!state.curriculaList.length) {
      return html + ui.renderEmptyState({
        icon: '\uD83D\uDCDA',
        title: { vi: 'Chưa có chương trình đào tạo', en: 'No curricula defined' },
        desc: { vi: 'Tạo chương trình đào tạo đầu tiên', en: 'Create your first training curriculum' },
        action: { key: 'create-curriculum', label: { vi: 'Tạo chương trình', en: 'New Curriculum' } }
      });
    }

    // Curriculum cards
    html += '<div class="eqms-curricula-list" style="display:flex;flex-direction:column;gap:12px">';
    state.curriculaList.forEach(function(cur) {
      html += '<div class="eqms-section" data-action="view-curriculum" data-id="' + esc(cur.id || '') + '" style="cursor:pointer">';
      html += '<div class="eqms-section-header" style="display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="font-weight:600">' + esc(cur.name || cur.title || '') + '</span>';
      html += '<span class="eqms-badge ' + slugify(cur.status || 'active') + '">' + esc(cur.status || 'active') + '</span>';
      html += '</div>';
      html += '<div class="eqms-section-body">';

      html += ui.renderFieldGrid([
        { label: { vi: 'Mô tả',                   en: 'Description' },          value: cur.description },
        { label: { vi: 'Tài liệu liên kết',       en: 'Linked Documents' },     value: (cur.linked_documents || []).length + ' ' + T({ vi: 'tài liệu', en: 'documents' }) },
        { label: { vi: 'Yêu cầu năng lực',        en: 'Qualification Req.' },   value: cur.qualification_requirements },
        { label: { vi: 'Thời hạn hiệu lực',       en: 'Validity Period' },      value: cur.validity_period ? cur.validity_period + ' ' + T({ vi: 'tháng', en: 'months' }) : T({ vi: 'Không giới hạn', en: 'No limit' }) },
        { label: { vi: 'Chu kỳ tái đào tạo',      en: 'Recurrence' },           value: cur.recurrence ? cur.recurrence + ' ' + T({ vi: 'tháng', en: 'months' }) : T({ vi: 'Một lần', en: 'One-time' }) }
      ]);

      // Linked documents preview
      if (cur.linked_documents && cur.linked_documents.length > 0) {
        html += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
        cur.linked_documents.forEach(function(doc) {
          html += '<span class="eqms-badge draft" style="font-size:11px">\uD83D\uDCC4 ' + esc(doc.doc_id || doc) + '</span>';
        });
        html += '</div>';
      }

      html += '</div></div>';
    });
    html += '</div>';

    html += ui.renderPagination(state.curriculaPagination);

    return html;
  }

  // =========================================================================
  // SCREEN 5: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-analytics');

    var m = state.metrics || {};
    var html = '';

    html += '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600">' + T({ vi: 'Phân tích đào tạo & năng lực', en: 'Training & Competency Analytics' }) + '</h2>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tỉ lệ hoàn thành',     en: 'Completion Rate' },         value: (m.completion_rate || 0) + '%', accent: 'success' },
      { label: { vi: 'Quá hạn',               en: 'Overdue' },                value: fmt(m.overdue_count || 0), accent: (m.overdue_count || 0) > 0 ? 'danger' : '' },
      { label: { vi: 'Điểm hiệu quả TB',     en: 'Avg Effectiveness Score' }, value: (m.avg_effectiveness || 0) + '%', accent: 'info' },
      { label: { vi: 'Tổng giờ đào tạo',      en: 'Total Training Hours' },   value: fmt(m.total_hours || 0) + 'h' }
    ]);

    // Completion rate trend
    var completionTrend = m.completion_trend || [];
    var completionColumns = [
      { key: 'period',          label: { vi: 'Giai đoạn', en: 'Period' } },
      { key: 'completion_rate', label: { vi: 'Tỉ lệ hoàn thành (%)', en: 'Completion Rate (%)' }, type: 'number' },
      { key: 'total',           label: { vi: 'Tổng giao việc', en: 'Total Assigned' }, type: 'number' },
      { key: 'completed',       label: { vi: 'Hoàn thành', en: 'Completed' }, type: 'number' }
    ];

    html += ui.renderSection({ vi: 'Xu hướng tỉ lệ hoàn thành', en: 'Completion Rate Trend' },
      ui.renderChartWithTableFallback('completion-trend-chart', null, completionColumns, completionTrend, { defaultMode: 'table' })
    );

    // Overdue trend
    var overdueTrend = m.overdue_trend || [];
    var overdueColumns = [
      { key: 'period',  label: { vi: 'Giai đoạn', en: 'Period' } },
      { key: 'overdue', label: { vi: 'Quá hạn', en: 'Overdue' }, type: 'number' },
      { key: 'on_time', label: { vi: 'Đúng hạn', en: 'On Time' }, type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng quá hạn', en: 'Overdue Trend' },
      ui.renderChartWithTableFallback('overdue-trend-chart', null, overdueColumns, overdueTrend, { defaultMode: 'table' })
    );
    html += '</div>';

    // Effectiveness scores by curriculum
    var effectivenessData = m.effectiveness_by_curriculum || [];
    var effectivenessColumns = [
      { key: 'curriculum',    label: { vi: 'Chương trình',      en: 'Curriculum' } },
      { key: 'avg_score',     label: { vi: 'Điểm TB (%)',       en: 'Avg Score (%)' },     type: 'number' },
      { key: 'effective_pct', label: { vi: 'Hiệu quả (%)',     en: 'Effective (%)' },     type: 'number' },
      { key: 'sample_size',   label: { vi: 'Mẫu',              en: 'Sample Size' },       type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Điểm hiệu quả theo chương trình', en: 'Effectiveness Scores by Curriculum' },
      ui.renderChartWithTableFallback('effectiveness-chart', null, effectivenessColumns, effectivenessData, { defaultMode: 'table' })
    );
    html += '</div>';

    // Qualification coverage by role/station/process
    var coverageData = m.qualification_coverage || [];
    var coverageColumns = [
      { key: 'entity',    label: { vi: 'Vai trò / Trạm / Quy trình', en: 'Role / Station / Process' } },
      { key: 'type',      label: { vi: 'Loại',                        en: 'Type' },                       type: 'badge' },
      { key: 'qualified', label: { vi: 'Đủ năng lực',                en: 'Qualified' },                   type: 'number' },
      { key: 'total',     label: { vi: 'Tổng',                        en: 'Total' },                      type: 'number' },
      { key: 'coverage',  label: { vi: 'Phủ sóng (%)',               en: 'Coverage (%)' },
        render: function(v) {
          var pct = v || 0;
          var color = pct >= 90 ? 'var(--hm-accent-success,#22c55e)' : (pct >= 70 ? 'var(--hm-accent-warning,#f59e0b)' : 'var(--hm-accent-danger,#ef4444)');
          return '<div style="display:flex;align-items:center;gap:6px">' +
            '<div style="flex:1;height:8px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:4px;overflow:hidden">' +
            '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:4px"></div></div>' +
            '<span style="font-weight:600;font-size:12px;min-width:36px">' + esc(pct + '%') + '</span></div>';
        }
      }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Phủ sóng năng lực', en: 'Qualification Coverage' },
      ui.renderDataGrid(coverageColumns, coverageData, { selectable: false })
    );
    html += '</div>';

    // Training hours trend
    var hoursTrend = m.hours_trend || [];
    var hoursColumns = [
      { key: 'period',     label: { vi: 'Giai đoạn',      en: 'Period' } },
      { key: 'hours',      label: { vi: 'Giờ đào tạo',    en: 'Training Hours' },  type: 'number' },
      { key: 'sessions',   label: { vi: 'Số phiên',        en: 'Sessions' },        type: 'number' },
      { key: 'avg_per_session', label: { vi: 'TB/phiên (giờ)', en: 'Avg/Session (h)' }, type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng giờ đào tạo', en: 'Training Hours Trend' },
      ui.renderChartWithTableFallback('hours-trend-chart', null, hoursColumns, hoursTrend, { defaultMode: 'table' })
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
      // Screen navigation
      var screenTab = e.target.closest('[data-screen]');
      if (screenTab) {
        var scr = screenTab.getAttribute('data-screen');
        state.screen = scr;
        state.filters = {};
        switch (scr) {
          case SCREENS.MATRIX:    loadMatrix();    break;
          case SCREENS.QUEUE:     loadQueue();     break;
          case SCREENS.CURRICULA: loadCurricula(); break;
          case SCREENS.ANALYTICS: loadMetrics();   break;
        }
        return;
      }

      // Detail tabs
      var tab = e.target.closest('[data-tab]');
      if (tab && state.screen === SCREENS.DETAIL) {
        state.activeTab = tab.getAttribute('data-tab');
        paint();
        return;
      }

      // Sort (assignment queue)
      var sortTh = e.target.closest('th[data-sort]');
      if (sortTh && state.screen === SCREENS.QUEUE) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        state.queuePagination.offset = 0;
        loadQueue();
        return;
      }

      // Row click → detail (queue)
      var row = e.target.closest('tr[data-id]');
      if (row && state.screen === SCREENS.QUEUE && !e.target.closest('input[type="checkbox"]')) {
        var rowId = row.getAttribute('data-id');
        if (rowId) {
          state.screen = SCREENS.DETAIL;
          state.activeTab = 'summary';
          loadDetail(rowId);
        }
        return;
      }

      // Matrix cell click
      var cell = e.target.closest('[data-action="open-cell"]');
      if (cell) {
        var recordId = cell.getAttribute('data-record-id');
        if (recordId) {
          state.screen = SCREENS.DETAIL;
          state.activeTab = 'summary';
          loadDetail(recordId);
        }
        return;
      }

      // Pagination
      var pageBtn = e.target.closest('[data-action="page"]');
      if (pageBtn) {
        var page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page > 0) {
          if (state.screen === SCREENS.QUEUE) {
            state.queuePagination.offset = (page - 1) * state.queuePagination.limit;
            loadQueue();
          } else if (state.screen === SCREENS.CURRICULA) {
            state.curriculaPagination.offset = (page - 1) * state.curriculaPagination.limit;
            loadCurricula();
          }
        }
        return;
      }

      // Generic actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'go-queue':
          state.screen = SCREENS.QUEUE;
          state.record = null;
          state.recordId = null;
          loadQueue();
          break;

        case 'retry-matrix':
          loadMatrix();
          break;

        case 'retry-queue':
          loadQueue();
          break;

        case 'retry-detail':
          if (state.recordId) loadDetail(state.recordId);
          break;

        case 'retry-curricula':
          loadCurricula();
          break;

        case 'retry-analytics':
          loadMetrics();
          break;

        case 'apply-filters':
          collectFilters();
          switch (state.screen) {
            case SCREENS.MATRIX:    loadMatrix();    break;
            case SCREENS.QUEUE:     state.queuePagination.offset = 0; loadQueue(); break;
            case SCREENS.CURRICULA: state.curriculaPagination.offset = 0; loadCurricula(); break;
          }
          break;

        case 'reset-filters':
          state.filters = {};
          switch (state.screen) {
            case SCREENS.MATRIX:    loadMatrix();    break;
            case SCREENS.QUEUE:     state.queuePagination.offset = 0; loadQueue(); break;
            case SCREENS.CURRICULA: state.curriculaPagination.offset = 0; loadCurricula(); break;
          }
          break;

        // Training-specific actions
        case 'assign':
        case 'launch-session':
        case 'record-completion':
        case 'record-assessment':
        case 'verify-effectiveness':
        case 'expire':
        case 'waive':
          executeAction(action);
          break;

        case 'add-comment':
          postComment();
          break;

        case 'export':
          handleExport(actionEl.getAttribute('data-format'));
          break;

        case 'bulk-assign':
        case 'create-curriculum':
        case 'view-curriculum':
          // Placeholder for modal / navigation triggers
          break;
      }
    });
  }

  // =========================================================================
  // DATA COLLECTION
  // =========================================================================
  function collectFilters() {
    if (!_container) return;
    var filterEls = _container.querySelectorAll('[data-filter]');
    state.filters = {};
    filterEls.forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) state.filters[key] = val;
    });
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  /**
   * Map action name → explicit alias endpoint.
   * Uses dedicated action aliases in frontend-alias-routes.php,
   * NOT the hidden {action: ...} pseudo-param on eqms_training_detail.
   */
  function actionEndpoint(action) {
    return 'eqms_training_action_' + action.replace(/-/g, '_');
  }

  function recordId() {
    return state.record ? (state.record.training_id || state.record.id || '') : '';
  }

  function recordVersion() {
    return state.record ? (parseInt(state.record.version, 10) || 1) : 1;
  }

  function executeAction(action) {
    var id = recordId();
    if (!id) return;

    var payload = { id: id, version: recordVersion() };

    // Actions that require additional body fields — collect from modal/inline form
    if (action === 'record-completion') {
      payload.completed_at      = new Date().toISOString();
      payload.completion_method = 'self-study';   // UI modal would set this
    } else if (action === 'record-assessment') {
      payload.assessment_score  = 0;
      payload.assessment_passed = false;           // UI modal would set these
    } else if (action === 'verify-effectiveness') {
      payload.effectiveness_criteria = '';
      payload.effectiveness_result   = '';         // UI modal would set these
    } else if (action === 'waive') {
      payload.waiver_reason      = '';
      payload.waiver_approved_by = '';             // UI modal would set these
    }

    var endpoint = actionEndpoint(action);
    apiCall(endpoint, payload).then(function(res) {
      if (res.success) {
        loadDetail(id);
      } else {
        // Surface action error without losing context
        state.error = {
          message: res.message || res.error || T({ vi: 'Không thực hiện được hành động', en: 'Action failed' }),
          action: action
        };
        paint();
      }
    }).catch(function(err) {
      state.error = { message: err.message || 'Network error', action: action };
      paint();
    });
  }

  function postComment() {
    if (!_container || !state.record) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    var id = recordId();
    apiCall('eqms_training_comments', { id: id, text: textarea.value.trim() }).then(function(res) {
      if (res.success) {
        var added = res.data ? (res.data.comment || res.data) : null;
        if (added) state.comments = [added].concat(state.comments);
        textarea.value = '';
        paint();
      }
    });
  }

  function handleExport(format) {
    var payload = { format: format, screen: state.screen };
    if (state.screen === SCREENS.DETAIL && state.record) {
      payload.id = recordId();
    } else {
      payload.filters = state.filters;
    }
    apiCall('eqms_training_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['training'] = { render: render, meta: MOD };

})();

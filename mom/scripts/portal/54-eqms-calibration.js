/**
 * 54-eqms-calibration.js — Calibration / MSA
 * HESEM MOM Portal · Evidence Workspace + Schedule Board
 *
 * Screens: Schedule Board, Calibration Detail, MSA Studies, Analytics
 * Workflow: scheduled -> in_progress -> result_recorded -> under_review -> approved | oot_declared -> closed
 * Endpoints: eqms_calibration_*, eqms_msa_*
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
  var CAL_STATES = ['scheduled','in_progress','result_recorded','under_review','approved','oot_declared','closed'];
  var CAL_RESULTS = [
    { value: 'pass',        label: { vi: 'Đạt', en: 'Pass' } },
    { value: 'fail',        label: { vi: 'Không đạt', en: 'Fail' } },
    { value: 'conditional', label: { vi: 'Có điều kiện', en: 'Conditional' } }
  ];
  var EQUIPMENT_TYPES = [
    { value: 'gauge',       label: { vi: 'Đồng hồ đo', en: 'Gauge' } },
    { value: 'caliper',     label: { vi: 'Thước cặp', en: 'Caliper' } },
    { value: 'micrometer',  label: { vi: 'Thước đo micromet', en: 'Micrometer' } },
    { value: 'scale',       label: { vi: 'Cân', en: 'Scale' } },
    { value: 'thermometer', label: { vi: 'Nhiệt kế', en: 'Thermometer' } },
    { value: 'pressure',    label: { vi: 'Đồng hồ áp suất', en: 'Pressure Gauge' } },
    { value: 'cmm',         label: { vi: 'Máy CMM', en: 'CMM' } },
    { value: 'other',       label: { vi: 'Khác', en: 'Other' } }
  ];
  var MSA_TYPES = [
    { value: 'gauge_rr',   label: { vi: 'Gauge R&R', en: 'Gauge R&R' } },
    { value: 'linearity',  label: { vi: 'Độ tuyến tính', en: 'Linearity' } },
    { value: 'bias',       label: { vi: 'Độ lệch', en: 'Bias' } },
    { value: 'stability',  label: { vi: 'Độ ổn định', en: 'Stability' } }
  ];
  var CAL_ACTIONS = {
    scheduled:        [{ action: 'start',         label: { vi: 'Bắt đầu', en: 'Start' },          style: 'primary' }],
    in_progress:      [{ action: 'record-result', label: { vi: 'Ghi kết quả', en: 'Record Result' }, style: 'primary' }],
    result_recorded:  [{ action: 'submit-review', label: { vi: 'Gửi xem xét', en: 'Submit Review' }, style: 'primary' }],
    under_review:     [
      { action: 'approve',     label: { vi: 'Phê duyệt', en: 'Approve' },     style: 'primary' },
      { action: 'declare-oot', label: { vi: 'Khai báo OOT', en: 'Declare OOT' }, style: 'danger' }
    ],
    approved:         [{ action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'secondary' }],
    oot_declared:     [{ action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'secondary' }]
  };

  // ─── State ───────────────────────────────────────────────────────────
  var state = {
    screen: 'schedule',  // schedule | cal-detail | msa-list | msa-detail | analytics
    filters: {},
    msaFilters: {},
    sortKey: 'next_due_date', sortDir: 'asc',
    msaSortKey: 'created_at', msaSortDir: 'desc',
    page: 1, msaPage: 1, limit: 25,
    data: [], total: 0,
    msaData: [], msaTotal: 0,
    metrics: null,
    record: null,
    msaRecord: null,
    detailTab: 'summary',
    msaDetailTab: 'summary',
    auditEvents: [], signatures: [],
    viewMode: 'list', // list | calendar
    loading: false
  };

  var container = null;

  // ─── Helpers ─────────────────────────────────────────────────────────
  function dueStatus(nextDue) {
    if (!nextDue) return '';
    var now = new Date();
    var due = new Date(nextDue);
    var diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 30) return 'due-soon';
    return 'on-time';
  }

  function dueStatusBadge(nextDue) {
    var s = dueStatus(nextDue);
    var labels = {
      'overdue':  { vi: 'Quá hạn', en: 'Overdue' },
      'due-soon': { vi: 'Sắp đến hạn', en: 'Due Soon' },
      'on-time':  { vi: 'Đúng hạn', en: 'On Time' }
    };
    var cls = s === 'overdue' ? 'overdue' : (s === 'due-soon' ? 'due-soon' : 'on-time');
    return '<span class="eqms-badge ' + cls + '">' + esc(T(labels[s] || { vi: '—', en: '—' })) + '</span>';
  }

  function resultBadge(result) {
    if (!result) return '—';
    var cls = result === 'pass' ? 'pass' : (result === 'fail' ? 'fail' : 'conditional');
    return '<span class="eqms-badge ' + cls + '">' + esc(result) + '</span>';
  }

  function grrConclusion(pct) {
    if (pct == null) return '—';
    var p = Number(pct);
    if (p < 10) return '<span class="eqms-badge pass">' + T({ vi: 'Chấp nhận <10%', en: 'Acceptable <10%' }) + '</span>';
    if (p <= 30) return '<span class="eqms-badge conditional">' + T({ vi: 'Cần cải thiện 10-30%', en: 'Marginal 10-30%' }) + '</span>';
    return '<span class="eqms-badge fail">' + T({ vi: 'Không chấp nhận >30%', en: 'Unacceptable >30%' }) + '</span>';
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
  function loadSchedule() {
    state.loading = true; renderRoot();
    var p = Object.assign({}, state.filters, {
      offset: (state.page - 1) * state.limit,
      limit: state.limit,
      sort: state.sortKey, dir: state.sortDir
    });
    apiCall('eqms_calibration_query', p, 'GET').then(function(r) {
      state.data = (r && r.data) || [];
      state.total = (r && r.total) || state.data.length;
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadCalDetail(id) {
    state.loading = true; state.screen = 'cal-detail'; state.detailTab = 'summary'; renderRoot();
    Promise.all([
      apiCall('eqms_calibration_detail', { id: id }, 'GET'),
      apiCall('eqms_calibration_audit', { id: id }, 'GET'),
      apiCall('eqms_calibration_signatures', { id: id }, 'GET')
    ]).then(function(results) {
      state.record = (results[0] && results[0].data) || results[0] || {};
      state.auditEvents = (results[1] && results[1].data) || [];
      state.signatures = (results[2] && results[2].data) || [];
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadMetrics() {
    apiCall('eqms_calibration_metrics', {}, 'GET').then(function(r) {
      state.metrics = (r && r.data) || r || {};
      renderRoot();
    }).catch(function() {});
  }

  function loadMsaList() {
    state.loading = true; renderRoot();
    var p = Object.assign({}, state.msaFilters, {
      offset: (state.msaPage - 1) * state.limit,
      limit: state.limit,
      sort: state.msaSortKey, dir: state.msaSortDir
    });
    apiCall('eqms_msa_query', p, 'GET').then(function(r) {
      state.msaData = (r && r.data) || [];
      state.msaTotal = (r && r.total) || state.msaData.length;
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadMsaDetail(id) {
    state.loading = true; state.screen = 'msa-detail'; state.msaDetailTab = 'summary'; renderRoot();
    apiCall('eqms_msa_detail', { id: id }, 'GET').then(function(r) {
      state.msaRecord = (r && r.data) || r || {};
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  // ─── Module Meta ─────────────────────────────────────────────────────
  var MOD = {
    id: 'calibration',
    label: { vi: 'Hiệu chuẩn / MSA', en: 'Calibration / MSA' },
    icon: '\u{1F4CF}'
  };

  // ─── Screen Tabs ─────────────────────────────────────────────────────
  var SCREEN_TABS = [
    { id: 'schedule',   label: { vi: 'Lịch hiệu chuẩn', en: 'Schedule' } },
    { id: 'msa-list',   label: { vi: 'MSA', en: 'MSA Studies' } },
    { id: 'analytics',  label: { vi: 'Phân tích', en: 'Analytics' } }
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER ROOT
  // ═══════════════════════════════════════════════════════════════════════
  function renderRoot() {
    if (!container) return;
    var html = '';

    if (state.screen !== 'cal-detail' && state.screen !== 'msa-detail') {
      html += ui.renderTabs(SCREEN_TABS, state.screen);
    }

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải dữ liệu...', en: 'Loading data...' });
      container.innerHTML = html;
      return;
    }

    switch (state.screen) {
      case 'schedule':    html += renderSchedule(); break;
      case 'cal-detail':  html += renderCalDetail(); break;
      case 'msa-list':    html += renderMsaList(); break;
      case 'msa-detail':  html += renderMsaDetailScreen(); break;
      case 'analytics':   html += renderAnalytics(); break;
    }

    container.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 1: SCHEDULE BOARD
  // ═══════════════════════════════════════════════════════════════════════
  function renderSchedule() {
    var html = '';

    // KPI row
    if (state.metrics) {
      html += ui.renderKpiRow([
        { label: { vi: 'Tổng thiết bị', en: 'Total Equipment' },       value: fmt(state.metrics.total_equipment),   accent: '' },
        { label: { vi: 'Đúng hạn', en: 'On Time' },                    value: fmt(state.metrics.on_time),           accent: 'success' },
        { label: { vi: 'Sắp đến hạn', en: 'Due Soon' },                value: fmt(state.metrics.due_soon),          accent: 'warning' },
        { label: { vi: 'Quá hạn', en: 'Overdue' },                     value: fmt(state.metrics.overdue),           accent: 'danger' },
        { label: { vi: 'Tỷ lệ đúng hạn', en: 'On-Time Rate' },         value: state.metrics.on_time_rate ? state.metrics.on_time_rate + '%' : '—', accent: 'info', trend: state.metrics.on_time_trend }
      ]);
    }

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-cal">' + T({ vi: '+ Tạo hiệu chuẩn', en: '+ New Calibration' }) + '</button>';
    html += '<div class="eqms-view-toggle">';
    html += '<button class="eqms-btn ' + (state.viewMode === 'list' ? 'secondary' : 'ghost') + ' sm" data-action="view-mode" data-mode="list">' + T({ vi: 'Danh sách', en: 'List' }) + '</button>';
    html += '<button class="eqms-btn ' + (state.viewMode === 'calendar' ? 'secondary' : 'ghost') + ' sm" data-action="view-mode" data-mode="calendar">' + T({ vi: 'Lịch', en: 'Calendar' }) + '</button>';
    html += '</div>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'equipment_type', type: 'select', label: { vi: 'Loại TB', en: 'Equip. Type' }, options: EQUIPMENT_TYPES },
        { key: 'location', type: 'text', label: { vi: 'Vị trí', en: 'Location' }, width: '120px' },
        { key: 'due_status', type: 'select', label: { vi: 'Trạng thái', en: 'Due Status' }, options: [
          { value: 'on-time',  label: { vi: 'Đúng hạn', en: 'On Time' } },
          { value: 'due-soon', label: { vi: 'Sắp đến hạn', en: 'Due Soon' } },
          { value: 'overdue',  label: { vi: 'Quá hạn', en: 'Overdue' } }
        ]},
        { key: 'due_from', type: 'date', label: { vi: 'Từ ngày', en: 'From' } },
        { key: 'due_to', type: 'date', label: { vi: 'Đến ngày', en: 'To' } }
      ]
    });

    // View: List or Calendar
    if (state.viewMode === 'calendar') {
      html += renderCalendarView();
    } else {
      html += renderListView();
    }

    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });
    return html;
  }

  function renderListView() {
    var columns = [
      { key: 'equipment_id',   label: { vi: 'Mã TB', en: 'Equipment ID' },     type: 'id',       sortable: true },
      { key: 'equipment_name', label: { vi: 'Tên', en: 'Name' },                sortable: true },
      { key: 'equipment_type', label: { vi: 'Loại', en: 'Type' },              type: 'badge',    sortable: true },
      { key: 'serial_number',  label: { vi: 'S/N', en: 'S/N' },                sortable: true },
      { key: 'location',       label: { vi: 'Vị trí', en: 'Location' },         sortable: true },
      { key: 'calibration_date', label: { vi: 'Ngày HC', en: 'Cal Date' },      type: 'date',     sortable: true },
      { key: 'next_due_date',  label: { vi: 'Hạn kế tiếp', en: 'Next Due' },    type: 'date',     sortable: true },
      { key: 'due_status',     label: { vi: 'Tình trạng', en: 'Status' },       sortable: true,
        render: function(v, row) { return dueStatusBadge(row.next_due_date); } },
      { key: 'result',         label: { vi: 'Kết quả', en: 'Result' },          sortable: true,
        render: function(v) { return resultBadge(v); } },
      { key: 'status',         label: { vi: 'Workflow', en: 'Workflow' },        type: 'badge',    sortable: true }
    ];
    return ui.renderDataGrid(columns, state.data, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });
  }

  function renderCalendarView() {
    // Simple month grid
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthNames = lang() === 'vi'
      ? ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
      : ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Map calibrations by due day
    var calByDay = {};
    state.data.forEach(function(c) {
      if (!c.next_due_date) return;
      var d = new Date(c.next_due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        var day = d.getDate();
        if (!calByDay[day]) calByDay[day] = [];
        calByDay[day].push(c);
      }
    });

    var html = '<div class="eqms-calendar">';
    html += '<div class="eqms-calendar-header">' + monthNames[month] + ' ' + year + '</div>';
    html += '<div class="eqms-calendar-grid">';

    // Day headers
    var dayHeaders = lang() === 'vi'
      ? ['CN','T2','T3','T4','T5','T6','T7']
      : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    dayHeaders.forEach(function(d) { html += '<div class="eqms-calendar-dayheader">' + d + '</div>'; });

    // Empty cells before first day
    for (var e = 0; e < firstDay; e++) { html += '<div class="eqms-calendar-cell empty"></div>'; }

    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
      var cals = calByDay[d] || [];
      var isToday = (d === now.getDate());
      html += '<div class="eqms-calendar-cell' + (isToday ? ' today' : '') + '">';
      html += '<div class="eqms-calendar-day">' + d + '</div>';
      cals.forEach(function(c) {
        var statusCls = dueStatus(c.next_due_date);
        html += '<div class="eqms-calendar-event ' + statusCls + '" data-id="' + esc(c.id || c.cal_id || '') + '" title="' + esc(c.equipment_name || '') + '">';
        html += esc((c.equipment_id || '') + ' ' + (c.equipment_name || '').substring(0, 15));
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 2: CALIBRATION DETAIL
  // ═══════════════════════════════════════════════════════════════════════
  function renderCalDetail() {
    var r = state.record;
    if (!r) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Không tìm thấy', en: 'Not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-schedule">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';

    // Identity header
    var actions = CAL_ACTIONS[r.status] || [];
    html += ui.renderIdentityHeader(r, { actions: actions, extraMeta: [
      { label: { vi: 'Thiết bị', en: 'Equipment' }, value: r.equipment_name },
      { label: { vi: 'S/N', en: 'S/N' }, value: r.serial_number }
    ]});

    // Timeline
    html += ui.renderStateTimeline(CAL_STATES, r.status);

    // Tabs
    var detailTabs = [
      { id: 'summary',    label: { vi: 'Tổng quan', en: 'Summary' } },
      { id: 'results',    label: { vi: 'Kết quả', en: 'Results' } },
      { id: 'certificate', label: { vi: 'Chứng chỉ', en: 'Certificate' } },
      { id: 'oot',        label: { vi: 'OOT', en: 'OOT Declaration' } },
      { id: 'history',    label: { vi: 'Lịch sử TB', en: 'Equipment History' } },
      { id: 'audit',      label: { vi: 'Nhật ký', en: 'Audit Trail' } }
    ];
    html += ui.renderTabs(detailTabs, state.detailTab);

    html += '<div class="eqms-tab-content">';
    switch (state.detailTab) {
      case 'summary':     html += renderCalSummary(r); break;
      case 'results':     html += renderCalResults(r); break;
      case 'certificate': html += renderCalCertificate(r); break;
      case 'oot':         html += renderCalOot(r); break;
      case 'history':     html += renderCalHistory(r); break;
      case 'audit':       html += renderCalAuditTab(r); break;
    }
    html += '</div>';
    return html;
  }

  // ── Cal Tab: Summary ──
  function renderCalSummary(r) {
    return ui.renderFieldGrid([
      { label: { vi: 'Mã hiệu chuẩn', en: 'Cal ID' },          value: r.cal_id, mono: true },
      { label: { vi: 'Mã thiết bị', en: 'Equipment ID' },      value: r.equipment_id, mono: true },
      { label: { vi: 'Tên thiết bị', en: 'Equipment Name' },   value: r.equipment_name },
      { label: { vi: 'Loại thiết bị', en: 'Equipment Type' },  value: r.equipment_type, badge: true },
      { label: { vi: 'Số seri', en: 'Serial Number' },         value: r.serial_number },
      { label: { vi: 'Vị trí', en: 'Location' },               value: r.location },
      { label: { vi: 'Chuẩn sử dụng', en: 'Standard Used' },   value: r.standard_used },
      { label: { vi: 'Ngày hiệu chuẩn', en: 'Calibration Date' }, value: fmtDate(r.calibration_date) },
      { label: { vi: 'Hạn tiếp theo', en: 'Next Due Date' },   value: fmtDate(r.next_due_date) },
      { label: { vi: 'Thực hiện bởi', en: 'Performed By' },    value: r.performed_by },
      { label: { vi: 'Trạng thái', en: 'Status' },             value: r.status, badge: true },
      { label: { vi: 'Kết quả', en: 'Result' },                value: r.result, badge: true },
      { label: { vi: 'Dung sai', en: 'Tolerance' },            value: r.tolerance },
      { label: { vi: 'Giá trị thực', en: 'Actual Value' },     value: r.actual_value }
    ]);
  }

  // ── Cal Tab: Results ──
  function renderCalResults(r) {
    var measurements = r.measurements || [];
    var html = '';

    html += ui.renderSection({ vi: 'Kết quả đo lường', en: 'Measurement Results' },
      ui.renderDataGrid([
        { key: 'parameter',  label: { vi: 'Thông số', en: 'Parameter' } },
        { key: 'nominal',    label: { vi: 'Danh định', en: 'Nominal' },     type: 'number' },
        { key: 'tolerance_plus',  label: { vi: 'Dung sai +', en: 'Tol +' }, type: 'number' },
        { key: 'tolerance_minus', label: { vi: 'Dung sai -', en: 'Tol -' }, type: 'number' },
        { key: 'actual',     label: { vi: 'Thực tế', en: 'Actual' },        type: 'number' },
        { key: 'pass_fail',  label: { vi: 'Đạt/Trượt', en: 'Pass/Fail' },
          render: function(v) { return resultBadge(v); } }
      ], measurements, { selectable: false })
    );

    // Result summary
    html += ui.renderSection({ vi: 'Tổng hợp kết quả', en: 'Result Summary' },
      ui.renderFieldGrid([
        { label: { vi: 'Kết quả chung', en: 'Overall Result' },         value: r.result, badge: true },
        { label: { vi: 'Độ không đảm bảo', en: 'Uncertainty' },          value: r.uncertainty },
        { label: { vi: 'Ghi chú', en: 'Notes' },                        value: r.result_notes }
      ])
    );

    return html;
  }

  // ── Cal Tab: Certificate ──
  function renderCalCertificate(r) {
    var cert = r.certificate || {};
    if (!cert.certificate_number && !cert.issued_by) {
      return ui.renderEmptyState({
        icon: '\u{1F4DC}',
        title: { vi: 'Chưa có chứng chỉ', en: 'No certificate yet' },
        desc: { vi: 'Chứng chỉ sẽ được tạo sau khi phê duyệt', en: 'Certificate will be generated after approval' }
      });
    }

    var html = '';
    html += ui.renderFieldGrid([
      { label: { vi: 'Số chứng chỉ', en: 'Certificate Number' },   value: cert.certificate_number, mono: true },
      { label: { vi: 'Cấp bởi', en: 'Issued By' },                  value: cert.issued_by },
      { label: { vi: 'Ngày cấp', en: 'Issue Date' },                value: fmtDate(cert.issue_date) },
      { label: { vi: 'Hiệu lực đến', en: 'Valid Until' },           value: fmtDate(cert.valid_until) }
    ]);

    // Certificate preview area
    html += '<div class="eqms-certificate-preview">';
    if (cert.preview_url) {
      html += '<iframe src="' + esc(cert.preview_url) + '" style="width:100%;height:500px;border:1px solid var(--hm-border,#e2e8f0);border-radius:8px"></iframe>';
    } else {
      html += '<div class="eqms-empty-state" style="min-height:200px"><span>' + T({ vi: 'Xem trước không khả dụng', en: 'Preview not available' }) + '</span></div>';
    }
    html += '</div>';

    return html;
  }

  // ── Cal Tab: OOT Declaration ──
  function renderCalOot(r) {
    var oot = r.oot_declaration || {};
    if (!oot.oot_flag && r.status !== 'oot_declared') {
      return ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Không có OOT', en: 'No OOT Declaration' },
        desc: { vi: 'Thiết bị trong dung sai', en: 'Equipment is within tolerance' }
      });
    }

    return ui.renderFieldGrid([
      { label: { vi: 'Có OOT', en: 'OOT Flag' },                    value: oot.oot_flag ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }), badge: true },
      { label: { vi: 'Đánh giá tác động', en: 'Impact Assessment' }, value: oot.impact_assessment },
      { label: { vi: 'Phép đo bị ảnh hưởng', en: 'Affected Measurements' }, value: oot.affected_measurements },
      { label: { vi: 'Hành động khắc phục', en: 'Corrective Actions' }, value: oot.corrective_actions },
      { label: { vi: 'Ngày khai báo', en: 'Declaration Date' },      value: fmtDate(oot.declaration_date) },
      { label: { vi: 'Người khai báo', en: 'Declared By' },          value: oot.declared_by }
    ]);
  }

  // ── Cal Tab: Equipment History ──
  function renderCalHistory(r) {
    var history = r.equipment_history || [];
    var html = '';

    // Trend chart placeholder
    html += ui.renderSection({ vi: 'Xu hướng thông số', en: 'Parameter Trend' },
      ui.renderChartWithTableFallback('chart-equip-trend', null,
        [
          { key: 'date', label: { vi: 'Ngày', en: 'Date' }, type: 'date' },
          { key: 'parameter', label: { vi: 'Thông số', en: 'Parameter' } },
          { key: 'value', label: { vi: 'Giá trị', en: 'Value' }, type: 'number' },
          { key: 'nominal', label: { vi: 'Danh định', en: 'Nominal' }, type: 'number' }
        ],
        r.trend_data || []
      )
    );

    // History table
    html += ui.renderSection({ vi: 'Lịch sử hiệu chuẩn', en: 'Calibration History' },
      ui.renderDataGrid([
        { key: 'cal_id',           label: { vi: 'Mã HC', en: 'Cal ID' },      type: 'id' },
        { key: 'calibration_date', label: { vi: 'Ngày', en: 'Date' },          type: 'date' },
        { key: 'result',           label: { vi: 'Kết quả', en: 'Result' },     render: function(v) { return resultBadge(v); } },
        { key: 'performed_by',     label: { vi: 'Thực hiện', en: 'Performed By' } },
        { key: 'standard_used',    label: { vi: 'Chuẩn', en: 'Standard' } },
        { key: 'notes',            label: { vi: 'Ghi chú', en: 'Notes' },      type: 'truncate' }
      ], history, { selectable: false })
    );

    return html;
  }

  // ── Cal Tab: Audit Trail ──
  function renderCalAuditTab(r) {
    var html = '';
    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' }, ui.renderAuditTrail(state.auditEvents));
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' }, ui.renderSignaturePanel(state.signatures, [
      { vi: 'Thực hiện', en: 'Performed By' },
      { vi: 'Xem xét', en: 'Reviewed By' },
      { vi: 'Phê duyệt', en: 'Approved By' }
    ]));
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' }, ui.renderAttachmentsGrid(r.attachments || []));
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' }, ui.renderCommentsThread(r.comments || []));
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 3: MSA STUDIES
  // ═══════════════════════════════════════════════════════════════════════
  function renderMsaList() {
    var html = '';

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-msa">' + T({ vi: '+ Tạo MSA', en: '+ New MSA Study' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.msaFilters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'study_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: MSA_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: [
          { value: 'planned',     label: { vi: 'Kế hoạch', en: 'Planned' } },
          { value: 'in_progress', label: { vi: 'Đang thực hiện', en: 'In Progress' } },
          { value: 'completed',   label: { vi: 'Hoàn thành', en: 'Completed' } }
        ]}
      ]
    });

    // Grid
    var columns = [
      { key: 'study_id',    label: { vi: 'Mã', en: 'Study ID' },        type: 'id',       sortable: true },
      { key: 'equipment',   label: { vi: 'Thiết bị', en: 'Equipment' }, sortable: true },
      { key: 'study_type',  label: { vi: 'Loại', en: 'Type' },          type: 'badge',    sortable: true },
      { key: 'status',      label: { vi: 'Trạng thái', en: 'Status' },  type: 'badge',    sortable: true },
      { key: 'result',      label: { vi: 'Kết quả', en: 'Result' },     sortable: true,
        render: function(v) {
          if (!v) return '—';
          return grrConclusion(v);
        }},
      { key: 'grr_pct',     label: { vi: '%GRR', en: '%GRR' },          type: 'number',   sortable: true },
      { key: 'created_at',  label: { vi: 'Ngày', en: 'Date' },          type: 'date',     sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.msaData, {
      selectable: true,
      sortKey: state.msaSortKey,
      sortDir: state.msaSortDir
    });

    html += ui.renderPagination({ total: state.msaTotal, offset: (state.msaPage - 1) * state.limit, limit: state.limit });
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MSA DETAIL
  // ═══════════════════════════════════════════════════════════════════════
  function renderMsaDetailScreen() {
    var m = state.msaRecord;
    if (!m) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Không tìm thấy', en: 'Not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-msa">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';

    // Identity header
    html += ui.renderIdentityHeader(m, {});

    // Summary fields
    html += ui.renderFieldGrid([
      { label: { vi: 'Mã nghiên cứu', en: 'Study ID' },         value: m.study_id, mono: true },
      { label: { vi: 'Thiết bị', en: 'Equipment' },             value: m.equipment },
      { label: { vi: 'Loại nghiên cứu', en: 'Study Type' },     value: m.study_type, badge: true },
      { label: { vi: 'Số chi tiết', en: 'Parts Count' },        value: m.parts_count },
      { label: { vi: 'Số người vận hành', en: 'Operators Count' }, value: m.operators_count },
      { label: { vi: 'Số lần thử', en: 'Trials Count' },        value: m.trials_count }
    ]);

    // Results section
    html += ui.renderSection({ vi: 'Kết quả nghiên cứu', en: 'Study Results' },
      ui.renderFieldGrid([
        { label: { vi: 'Độ lặp lại', en: 'Repeatability' },       value: m.repeatability },
        { label: { vi: 'Độ tái lập', en: 'Reproducibility' },     value: m.reproducibility },
        { label: { vi: '%GRR', en: '%GRR' },                      value: m.grr_pct },
        { label: { vi: 'ndc', en: 'ndc' },                        value: m.ndc }
      ])
    );

    // Conclusion
    var grrPct = m.grr_pct != null ? Number(m.grr_pct) : null;
    html += ui.renderSection({ vi: 'Kết luận', en: 'Conclusion' },
      '<div style="padding:12px">' + grrConclusion(grrPct) + '</div>'
    );

    // ANOVA Results
    if (m.anova_results && m.anova_results.length) {
      html += ui.renderSection({ vi: 'Kết quả ANOVA', en: 'ANOVA Results' },
        ui.renderDataGrid([
          { key: 'source',     label: { vi: 'Nguồn', en: 'Source' } },
          { key: 'df',         label: { vi: 'df', en: 'df' },              type: 'number' },
          { key: 'ss',         label: { vi: 'SS', en: 'SS' },              type: 'number' },
          { key: 'ms',         label: { vi: 'MS', en: 'MS' },              type: 'number' },
          { key: 'f_value',    label: { vi: 'F', en: 'F' },                type: 'number' },
          { key: 'p_value',    label: { vi: 'p', en: 'p' },                type: 'number' },
          { key: 'variance_pct', label: { vi: '% Phương sai', en: '% Variance' }, type: 'number' }
        ], m.anova_results, { selectable: false })
      );
    }

    // Audit trail
    html += ui.renderSection({ vi: 'Nhật ký', en: 'Audit Trail' }, ui.renderAuditTrail(m.audit_events || []));
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' }, ui.renderAttachmentsGrid(m.attachments || []));

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 4: ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════
  function renderAnalytics() {
    var html = '';
    var m = state.metrics || {};

    // KPI cards
    html += ui.renderKpiRow([
      { label: { vi: 'Tỷ lệ đúng hạn', en: 'On-Time Rate' },         value: m.on_time_rate ? m.on_time_rate + '%' : '—', accent: 'success', trend: m.on_time_trend },
      { label: { vi: 'Tần suất OOT', en: 'OOT Frequency' },         value: fmt(m.oot_count),                           accent: 'danger' },
      { label: { vi: 'MSA Đạt', en: 'MSA Acceptable' },              value: fmt(m.msa_acceptable),                      accent: 'info' },
      { label: { vi: 'TB cần chú ý', en: 'Equipment Attention' },    value: fmt(m.equipment_attention),                  accent: 'warning' }
    ]);

    // On-time calibration rate trend
    html += ui.renderSection({ vi: 'Xu hướng tỷ lệ đúng hạn', en: 'On-Time Calibration Rate Trend' },
      ui.renderChartWithTableFallback('chart-ontime-trend', null,
        [
          { key: 'period', label: { vi: 'Thời gian', en: 'Period' } },
          { key: 'total', label: { vi: 'Tổng', en: 'Total' }, type: 'number' },
          { key: 'on_time', label: { vi: 'Đúng hạn', en: 'On Time' }, type: 'number' },
          { key: 'rate_pct', label: { vi: 'Tỷ lệ %', en: 'Rate %' }, type: 'number' }
        ],
        m.ontime_trend || []
      )
    );

    // OOT by equipment type
    html += ui.renderSection({ vi: 'Tần suất OOT theo loại TB', en: 'OOT Frequency by Equipment Type' },
      ui.renderChartWithTableFallback('chart-oot-by-type', null,
        [
          { key: 'equipment_type', label: { vi: 'Loại TB', en: 'Equip. Type' } },
          { key: 'oot_count', label: { vi: 'Số OOT', en: 'OOT Count' }, type: 'number' },
          { key: 'total_cals', label: { vi: 'Tổng HC', en: 'Total Cals' }, type: 'number' },
          { key: 'oot_rate', label: { vi: 'Tỷ lệ OOT %', en: 'OOT Rate %' }, type: 'number' }
        ],
        m.oot_by_type || []
      )
    );

    // MSA capability summary
    html += ui.renderSection({ vi: 'Tổng hợp năng lực MSA', en: 'MSA Capability Summary' },
      ui.renderDataGrid([
        { key: 'equipment',  label: { vi: 'Thiết bị', en: 'Equipment' } },
        { key: 'study_type', label: { vi: 'Loại', en: 'Type' },        type: 'badge' },
        { key: 'grr_pct',    label: { vi: '%GRR', en: '%GRR' },        type: 'number' },
        { key: 'conclusion', label: { vi: 'Kết luận', en: 'Conclusion' }, render: function(v, row) { return grrConclusion(row.grr_pct); } },
        { key: 'date',       label: { vi: 'Ngày', en: 'Date' },        type: 'date' }
      ], m.msa_summary || [], { selectable: false })
    );

    // Equipment requiring attention
    html += ui.renderSection({ vi: 'Thiết bị cần chú ý', en: 'Equipment Requiring Attention' },
      ui.renderDataGrid([
        { key: 'equipment_id',   label: { vi: 'Mã', en: 'ID' },         type: 'id' },
        { key: 'equipment_name', label: { vi: 'Tên', en: 'Name' } },
        { key: 'reason',         label: { vi: 'Lý do', en: 'Reason' },  type: 'truncate' },
        { key: 'next_due_date',  label: { vi: 'Hạn', en: 'Due' },       type: 'date' },
        { key: 'status',         label: { vi: 'TT', en: 'Status' },     type: 'badge' }
      ], m.equipment_attention_list || [], { selectable: false })
    );

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE FORMS
  // ═══════════════════════════════════════════════════════════════════════
  function renderCreateCalForm() {
    var body = '';
    body += ui.renderFormField({ key: 'equipment_id', label: { vi: 'Mã thiết bị', en: 'Equipment ID' }, required: true });
    body += ui.renderFormField({ key: 'equipment_name', label: { vi: 'Tên thiết bị', en: 'Equipment Name' }, required: true });
    body += ui.renderFormField({ key: 'equipment_type', label: { vi: 'Loại', en: 'Type' }, type: 'select', options: EQUIPMENT_TYPES, required: true });
    body += ui.renderFormField({ key: 'serial_number', label: { vi: 'Số seri', en: 'Serial Number' } });
    body += ui.renderFormField({ key: 'location', label: { vi: 'Vị trí', en: 'Location' } });
    body += ui.renderFormField({ key: 'standard_used', label: { vi: 'Chuẩn sử dụng', en: 'Standard Used' } });
    body += ui.renderFormField({ key: 'calibration_date', label: { vi: 'Ngày hiệu chuẩn', en: 'Calibration Date' }, type: 'date', required: true });
    body += ui.renderFormField({ key: 'next_due_date', label: { vi: 'Hạn tiếp theo', en: 'Next Due Date' }, type: 'date', required: true });
    body += ui.renderFormField({ key: 'performed_by', label: { vi: 'Thực hiện bởi', en: 'Performed By' }, required: true });
    return ui.renderWizardShell([
      { label: { vi: 'Thông tin', en: 'Information' } },
      { label: { vi: 'Xem xét', en: 'Review' } }
    ], 0, body, { saveDraft: true });
  }

  function renderCreateMsaForm() {
    var body = '';
    body += ui.renderFormField({ key: 'equipment', label: { vi: 'Thiết bị', en: 'Equipment' }, required: true });
    body += ui.renderFormField({ key: 'study_type', label: { vi: 'Loại', en: 'Study Type' }, type: 'select', options: MSA_TYPES, required: true });
    body += ui.renderFormField({ key: 'parts_count', label: { vi: 'Số chi tiết', en: 'Parts Count' }, type: 'number', min: 1 });
    body += ui.renderFormField({ key: 'operators_count', label: { vi: 'Số người VH', en: 'Operators Count' }, type: 'number', min: 1 });
    body += ui.renderFormField({ key: 'trials_count', label: { vi: 'Số lần thử', en: 'Trials Count' }, type: 'number', min: 1 });
    return ui.renderWizardShell([
      { label: { vi: 'Thông tin', en: 'Information' } },
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
          if (tabId === 'schedule') { loadSchedule(); loadMetrics(); }
          else if (tabId === 'msa-list') { loadMsaList(); }
          else if (tabId === 'analytics') { loadMetrics(); renderRoot(); }
          return;
        }
        if (state.screen === 'cal-detail') { state.detailTab = tabId; renderRoot(); return; }
      }

      // Row click
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input') && !e.target.closest('button')) {
        var id = row.getAttribute('data-id');
        if (state.screen === 'schedule') { loadCalDetail(id); return; }
        if (state.screen === 'msa-list') { loadMsaDetail(id); return; }
      }

      // Calendar event click
      var calEvent = e.target.closest('.eqms-calendar-event[data-id]');
      if (calEvent) { loadCalDetail(calEvent.getAttribute('data-id')); return; }

      // Actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'back-to-schedule':
          state.screen = 'schedule'; state.record = null; loadSchedule(); break;
        case 'back-to-msa':
          state.screen = 'msa-list'; state.msaRecord = null; loadMsaList(); break;
        case 'create-cal':
          showModal({ vi: 'Tạo hiệu chuẩn mới', en: 'New Calibration' }, renderCreateCalForm()); break;
        case 'create-msa':
          showModal({ vi: 'Tạo MSA mới', en: 'New MSA Study' }, renderCreateMsaForm()); break;

        case 'view-mode':
          state.viewMode = actionEl.getAttribute('data-mode') || 'list'; renderRoot(); break;

        case 'wizard-submit':
          handleWizardSubmit(); break;
        case 'cancel-modal':
          closeModal(); break;

        case 'start':
        case 'record-result':
        case 'submit-review':
        case 'approve':
        case 'declare-oot':
        case 'close':
          handleWorkflowAction(action); break;

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
      if (state.screen === 'schedule') {
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        loadSchedule();
      } else if (state.screen === 'msa-list') {
        if (state.msaSortKey === key) { state.msaSortDir = state.msaSortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.msaSortKey = key; state.msaSortDir = 'asc'; }
        loadMsaList();
      }
    });
  }

  function applyFilters() {
    if (!container) return;
    container.querySelectorAll('[data-filter]').forEach(function(f) {
      var key = f.getAttribute('data-filter');
      var val = f.value;
      if (state.screen === 'msa-list') { if (val) state.msaFilters[key] = val; else delete state.msaFilters[key]; }
      else { if (val) state.filters[key] = val; else delete state.filters[key]; }
    });
    state.page = 1; state.msaPage = 1;
    if (state.screen === 'msa-list') loadMsaList(); else loadSchedule();
  }

  function resetFilters() {
    if (state.screen === 'msa-list') { state.msaFilters = {}; state.msaPage = 1; loadMsaList(); }
    else { state.filters = {}; state.page = 1; loadSchedule(); }
  }

  function handlePage(p) {
    p = parseInt(p, 10);
    if (isNaN(p) || p < 1) return;
    if (state.screen === 'msa-list') { state.msaPage = p; loadMsaList(); }
    else { state.page = p; loadSchedule(); }
  }

  function handleWizardSubmit() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal) return;
    var data = collectForm(modal);
    var endpoint = (state.screen === 'msa-list') ? 'eqms_msa_create' : 'eqms_calibration_create';
    apiCall(endpoint, data).then(function() {
      closeModal();
      toast(T({ vi: 'Đã tạo thành công', en: 'Created successfully' }));
      if (state.screen === 'msa-list') loadMsaList(); else loadSchedule();
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleWorkflowAction(action) {
    if (!state.record) return;
    var id = state.record.id || state.record.cal_id;
    var endpoint = 'eqms_calibration_action_' + action.replace(/-/g, '_');
    apiCall(endpoint, { id: id }).then(function() {
      toast(T({ vi: 'Cập nhật thành công', en: 'Updated successfully' }));
      loadCalDetail(id);
    }).catch(function(err) { toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleExport(format) {
    var endpoint = state.screen === 'msa-list' ? 'eqms_msa_export' : 'eqms_calibration_export';
    apiCall(endpoint, { format: format }, 'GET').then(function(r) {
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
    state.screen = 'schedule';
    state.filters = {};
    state.msaFilters = {};
    state.page = 1;
    state.msaPage = 1;
    state.viewMode = 'list';

    if (ctx && ctx.recordId) {
      if (ctx.subModule === 'msa') { loadMsaDetail(ctx.recordId); }
      else { loadCalDetail(ctx.recordId); }
    } else {
      loadSchedule();
      loadMetrics();
    }

    bindEvents(el);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTER MODULE
  // ═══════════════════════════════════════════════════════════════════════
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['calibration'] = { render: render, meta: MOD };

})();

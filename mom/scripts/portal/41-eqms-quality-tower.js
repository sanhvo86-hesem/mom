/**
 * EQMS Quality Control Tower — Executive Dashboard
 * HESEM MOM Portal · 41-eqms-quality-tower.js
 *
 * Archetype: Control Tower / Overview Page
 * Audience: QA Directors, Quality Managers, Executives
 *
 * Surfaces: KPIs, quality event queue, trend charts, module status overview,
 *           compliance calendar, and overdue action tracking across all EQMS modules.
 *
 * APIs consumed:
 *   GET  /api/v1/eqms/quality-tower/dashboard
 *   GET  /api/v1/eqms/quality-tower/metrics
 *   GET  /api/v1/eqms/quality-tower/overdue-actions
 *   GET  /api/v1/eqms/quality-tower/compliance-calendar
 *   POST /api/v1/eqms/quality-tower/export
 *
 * Load order: AFTER 40-eqms-shell.js
 */
(function() {
  'use strict';

  // ── Aliases ──
  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T;
  var esc  = util.esc;
  var fmt  = util.fmt;
  var fmtDate     = util.fmtDate;
  var fmtDateTime = util.fmtDateTime;
  var slugify     = util.slugify;
  var lang        = util.lang;

  // ── Module Meta ──
  var MOD = {
    id:        'quality-tower',
    label:     { vi: 'Tháp chất lượng', en: 'Quality Control Tower' },
    icon:      '\uD83C\uDFEF',
    archetype: 'control-tower',
    version:   '1.0.0'
  };

  // ── Constants ──
  var AUTO_REFRESH_MS      = 5 * 60 * 1000;   // 5 minutes
  var STALE_THRESHOLD_MS   = 10 * 60 * 1000;  // 10 minutes — mark sections stale
  var PRIORITY_ORDER       = ['critical', 'high', 'medium', 'low'];
  var PRIORITY_COLORS      = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a' };

  var MODULE_DEFS = [
    { id: 'complaints',     label: { vi: 'Khiếu nại',          en: 'Complaints' },        icon: '\uD83D\uDCE2' },
    { id: 'deviations',     label: { vi: 'Sai lệch',           en: 'Deviations' },         icon: '\u26A0\uFE0F' },
    { id: 'ncr',            label: { vi: 'NCR',                 en: 'NCR / MRB' },          icon: '\uD83D\uDEAB' },
    { id: 'capa',           label: { vi: 'CAPA',                en: 'CAPA' },               icon: '\uD83D\uDD27' },
    { id: 'change-control', label: { vi: 'Thay đổi',            en: 'Change Control' },     icon: '\uD83D\uDD04' },
    { id: 'audits',         label: { vi: 'Đánh giá',            en: 'Audits' },             icon: '\uD83D\uDD0D' },
    { id: 'suppliers',      label: { vi: 'NCC',                 en: 'Suppliers' },           icon: '\uD83C\uDF10' },
    { id: 'calibration',    label: { vi: 'Hiệu chuẩn',         en: 'Calibration' },        icon: '\uD83D\uDCCF' },
    { id: 'lab-investigations', label: { vi: 'OOS/OOT',         en: 'Lab Investigations' }, icon: '\uD83D\uDD2C' },
    { id: 'field-actions',  label: { vi: 'Hành động thực địa',  en: 'Field Actions' },      icon: '\uD83D\uDEA8' },
    { id: 'batch-release',  label: { vi: 'Giải phóng lô',      en: 'Batch Release' },      icon: '\uD83D\uDCE6' },
    { id: 'training',       label: { vi: 'Đào tạo',             en: 'Training' },           icon: '\uD83C\uDF93' }
  ];

  /* Role visibility configuration: which KPI cards each role can see */
  var ROLE_KPI_VISIBILITY = {
    admin:              ['all'],
    quality_manager:    ['all'],
    qa_manager:         ['all'],
    qms_manager:        ['all'],
    quality_engineer:   ['open_ncr', 'open_capa', 'overdue_items', 'copq_mtd'],
    process_engineer:   ['open_ncr', 'open_capa', 'copq_mtd'],
    auditor:            ['audit_adherence', 'open_capa', 'overdue_items'],
    compliance_manager: ['audit_adherence', 'overdue_items', 'open_capa'],
    production_director:['open_ncr', 'copq_mtd', 'supplier_quality'],
    engineering_manager:['open_ncr', 'open_capa', 'copq_mtd'],
    supervisor:         ['open_ncr', 'overdue_items']
  };

  // ── State ──
  var state = {
    loading:        true,
    error:          null,
    dashboard:      null,      // from /dashboard
    metrics:        null,      // from /metrics
    overdueActions: null,      // from /overdue-actions
    calendar:       null,      // from /compliance-calendar
    filters: {
      date_from:   '',
      date_to:     '',
      department:  '',
      priority:    ''
    },
    lastFetchedAt:  null,
    refreshTimer:   null,
    chartModes:     {}         // chartId -> 'chart' | 'table'
  };

  // ── API Layer ──
  function apiFetch(path, params, timeout) {
    timeout = timeout || 30000;
    var url = 'api/v1/eqms/quality-tower/' + path;
    if (params) {
      var qs = Object.keys(params).filter(function(k) {
        return params[k] !== '' && params[k] != null;
      }).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      if (qs) url += '?' + qs;
    }
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    var opts = { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    return fetch(url, opts).then(function(r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(json) {
      if (json && json.success === false) throw new Error(json.message || 'API error');
      return json.data || json;
    }).catch(function(err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    });
  }

  function loadAllData() {
    state.loading = true;
    state.error   = null;

    var filterParams = {};
    if (state.filters.date_from)  filterParams.date_from  = state.filters.date_from;
    if (state.filters.date_to)    filterParams.date_to    = state.filters.date_to;
    if (state.filters.department) filterParams.department  = state.filters.department;
    if (state.filters.priority)   filterParams.priority    = state.filters.priority;

    return Promise.all([
      apiFetch('dashboard',           filterParams),
      apiFetch('metrics',             filterParams),
      apiFetch('overdue-actions',     filterParams),
      apiFetch('compliance-calendar', { days: 30 })
    ]).then(function(results) {
      state.dashboard      = results[0];
      state.metrics        = results[1];
      state.overdueActions = results[2];
      state.calendar       = results[3];
      state.loading        = false;
      state.lastFetchedAt  = new Date();
    }).catch(function(err) {
      state.loading = false;
      state.error   = err.message || 'Failed to load dashboard data';
    });
  }

  // ── Freshness Helpers ──
  function getFreshnessClass() {
    if (!state.lastFetchedAt) return 'stale';
    var age = Date.now() - state.lastFetchedAt.getTime();
    if (age < AUTO_REFRESH_MS)    return 'fresh';
    if (age < STALE_THRESHOLD_MS) return 'aging';
    return 'stale';
  }

  function renderFreshnessIndicator(sectionLabel) {
    var cls = getFreshnessClass();
    var labels = { fresh: T({ vi: 'Mới cập nhật', en: 'Just updated' }),
                   aging: T({ vi: 'Đang cập nhật', en: 'Updating soon' }),
                   stale: T({ vi: 'Dữ liệu cũ', en: 'Stale data' }) };
    var html = '<span class="eqms-freshness ' + cls + '" title="' + esc(sectionLabel || '') + '">';
    html += '<span class="eqms-freshness-dot"></span>';
    html += esc(labels[cls]);
    if (state.lastFetchedAt) {
      html += ' \u00B7 ' + esc(fmtDateTime(state.lastFetchedAt.toISOString()));
    }
    html += '</span>';
    return html;
  }

  // ── Role Visibility ──
  function getUserRole() {
    if (window.currentUser && window.currentUser.role) return window.currentUser.role;
    if (window.userRole) return window.userRole;
    return 'quality_manager'; // safe default for EQMS users
  }

  function isKpiVisible(kpiId) {
    var role = getUserRole();
    var allowed = ROLE_KPI_VISIBILITY[role] || ROLE_KPI_VISIBILITY.quality_manager;
    if (allowed[0] === 'all') return true;
    return allowed.indexOf(kpiId) !== -1;
  }

  // ── Render: KPI Row ──
  function buildKpiItems() {
    var d   = state.dashboard || {};
    var lc  = d.live_counts || {};
    var m   = state.metrics  || {};
    var snap = d.snapshot || {};

    var openNcr    = parseInt(lc.open_ncr || 0, 10);
    var openCapa   = parseInt(lc.open_capa || 0, 10);
    var overdueAll = parseInt(lc.overdue_calibrations || 0, 10)
                   + parseInt(lc.overdue_training || 0, 10);
    // Add overdue CAPAs and NCRs from overdue-actions if available
    var overdueData = state.overdueActions || {};
    var overdueTotal = overdueData.total || overdueAll;

    // COPQ — use snapshot data or default
    var copqMtd = snap.kpi_data
      ? (typeof snap.kpi_data === 'string' ? JSON.parse(snap.kpi_data) : snap.kpi_data)
      : {};
    var copqValue = copqMtd.copq_mtd || null;

    // Supplier quality score average
    var supplierScore = m.supplier_scar_response_rate_pct;

    // Audit schedule adherence
    var auditAdherence = m.calibration_compliance_rate_pct;

    // Determine trend arrows from snapshot comparisons
    var items = [];

    if (isKpiVisible('open_ncr')) {
      items.push({
        label: { vi: 'NCR đang mở', en: 'Open NCRs' },
        value: fmt(openNcr),
        accent: openNcr > 10 ? 'critical' : (openNcr > 5 ? 'warning' : ''),
        trend: snap.open_ncr_count ? (openNcr - parseInt(snap.open_ncr_count, 10)) : null,
        trendLabel: snap.open_ncr_count
          ? (openNcr >= parseInt(snap.open_ncr_count, 10) ? '+' : '') + (openNcr - parseInt(snap.open_ncr_count, 10)) + ' vs snapshot'
          : null,
        freshness: getFreshnessClass()
      });
    }

    if (isKpiVisible('open_capa')) {
      var capaOverdue = (overdueData.overdue_actions || []).filter(function(a) {
        return a.module === 'capa';
      }).length;
      items.push({
        label: { vi: 'CAPA đang mở', en: 'Open CAPAs' },
        value: fmt(openCapa),
        accent: capaOverdue > 0 ? 'warning' : '',
        trend: capaOverdue > 0 ? capaOverdue : null,
        trendLabel: capaOverdue > 0 ? capaOverdue + ' ' + T({ vi: 'quá hạn', en: 'overdue' }) : null,
        freshness: getFreshnessClass()
      });
    }

    if (isKpiVisible('overdue_items')) {
      items.push({
        label: { vi: 'Mục quá hạn', en: 'Overdue Items' },
        value: fmt(overdueTotal),
        accent: overdueTotal > 0 ? 'critical' : 'success',
        freshness: getFreshnessClass()
      });
    }

    if (isKpiVisible('copq_mtd')) {
      items.push({
        label: { vi: 'COPQ tháng này', en: 'COPQ MTD ($)' },
        value: copqValue != null ? '$' + fmt(copqValue) : '\u2014',
        accent: copqValue > 50000 ? 'critical' : (copqValue > 20000 ? 'warning' : ''),
        freshness: getFreshnessClass()
      });
    }

    if (isKpiVisible('supplier_quality')) {
      items.push({
        label: { vi: 'Chất lượng NCC', en: 'Supplier Quality Score' },
        value: supplierScore != null ? supplierScore + '%' : '\u2014',
        accent: supplierScore != null ? (supplierScore >= 90 ? 'success' : (supplierScore >= 70 ? 'info' : 'warning')) : 'info',
        freshness: getFreshnessClass()
      });
    }

    if (isKpiVisible('audit_adherence')) {
      items.push({
        label: { vi: 'Tuân thủ lịch đánh giá', en: 'Audit Schedule Adherence' },
        value: auditAdherence != null ? auditAdherence + '%' : '\u2014',
        accent: auditAdherence != null ? (auditAdherence >= 95 ? 'success' : (auditAdherence >= 80 ? 'info' : 'warning')) : 'info',
        freshness: getFreshnessClass()
      });
    }

    return items;
  }

  // ── Render: Quality Event Queue ──
  function buildEventQueue() {
    var overdueData = state.overdueActions || {};
    var actions = overdueData.overdue_actions || [];

    // Also include live counts as synthetic events for open items
    var d  = state.dashboard || {};
    var lc = d.live_counts || {};

    // Build unified event list from overdue actions
    var events = actions.map(function(a) {
      var daysOverdue = parseInt(a.days_overdue || 0, 10);
      var priority = 'low';
      if (daysOverdue > 30) priority = 'critical';
      else if (daysOverdue > 14) priority = 'high';
      else if (daysOverdue > 7)  priority = 'medium';

      // Override if filter is active
      if (state.filters.priority && state.filters.priority !== priority) return null;

      return {
        id:        a.id,
        module:    a.module || 'unknown',
        title:     a.title || T({ vi: 'Không có tiêu đề', en: 'No title' }),
        priority:  priority,
        age:       daysOverdue,
        ageLabel:  daysOverdue + 'd',
        assignee:  a.owner || '\u2014',
        status:    a.status || 'open',
        type:      a.module || 'action'
      };
    }).filter(Boolean);

    // Sort by priority then by age descending
    var pMap = { critical: 0, high: 1, medium: 2, low: 3 };
    events.sort(function(a, b) {
      var pd = (pMap[a.priority] || 3) - (pMap[b.priority] || 3);
      if (pd !== 0) return pd;
      return b.age - a.age;
    });

    return events;
  }

  function renderEventQueue(events) {
    if (!events || !events.length) {
      return ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Không có sự kiện quá hạn', en: 'No overdue quality events' },
        desc:  { vi: 'Tất cả mục tiêu đang trên kế hoạch', en: 'All items are on track' }
      });
    }

    var html = '';
    var grouped = {};
    PRIORITY_ORDER.forEach(function(p) { grouped[p] = []; });
    events.forEach(function(ev) {
      if (grouped[ev.priority]) grouped[ev.priority].push(ev);
    });

    PRIORITY_ORDER.forEach(function(p) {
      var group = grouped[p];
      if (!group.length) return;

      var priorityLabel = {
        critical: T({ vi: 'Nghiêm trọng', en: 'Critical' }),
        high:     T({ vi: 'Cao', en: 'High' }),
        medium:   T({ vi: 'Trung bình', en: 'Medium' }),
        low:      T({ vi: 'Thấp', en: 'Low' })
      };

      html += '<div class="eqms-event-group">';
      html += '<div class="eqms-event-group-header">';
      html += '<span class="eqms-priority-dot ' + p + '" style="background:' + (PRIORITY_COLORS[p] || '#94a3b8') + '"></span>';
      html += '<span class="eqms-event-group-label">' + esc(priorityLabel[p] || p) + '</span>';
      html += '<span class="eqms-event-group-count">(' + group.length + ')</span>';
      html += '</div>';

      group.forEach(function(ev) {
        var modDef = MODULE_DEFS.find(function(m) { return m.id === ev.module; });
        var modIcon  = modDef ? modDef.icon : '\uD83D\uDCCB';
        var modLabel = modDef ? T(modDef.label) : ev.module;

        html += '<div class="eqms-event-card" data-action="open-event" data-module="' + esc(ev.module) + '" data-id="' + esc(ev.id || '') + '">';
        html += '<span class="eqms-event-icon">' + modIcon + '</span>';
        html += '<div class="eqms-event-info">';
        html += '<div class="eqms-event-top">';
        html += '<span class="eqms-event-record-id">' + esc(ev.id || '') + '</span>';
        html += '<span class="eqms-event-title">' + esc(ev.title) + '</span>';
        html += '</div>';
        html += '<div class="eqms-event-bottom">';
        html += '<span class="eqms-event-age" title="' + T({ vi: 'Số ngày quá hạn', en: 'Days overdue' }) + '">' + esc(ev.ageLabel) + ' ' + T({ vi: 'quá hạn', en: 'overdue' }) + '</span>';
        html += '<span class="eqms-event-assignee">' + esc(ev.assignee) + '</span>';
        html += '<span class="eqms-badge ' + slugify(ev.module) + '" style="font-size:11px">' + esc(modLabel) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      });

      html += '</div>';
    });

    return html;
  }

  // ── Render: Trend Charts ──
  function renderTrendCharts() {
    var m = state.metrics || {};
    var aging = m.capa_aging_buckets || {};
    var html = '<div class="eqms-tower-charts-grid">';

    // 1. NCR Trend (12 months) — bar chart concept
    html += renderSingleChart(
      'tower-ncr-trend',
      { vi: 'Xu hướng NCR (12 tháng)', en: 'NCR Trend (12 Months)' },
      buildNcrTrendData(),
      [
        { key: 'month', label: { vi: 'Tháng', en: 'Month' }, sortable: false },
        { key: 'count', label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
      ]
    );

    // 2. CAPA Effectiveness Rate — line chart concept
    html += renderSingleChart(
      'tower-capa-effectiveness',
      { vi: 'Hiệu quả CAPA', en: 'CAPA Effectiveness Rate' },
      buildCapaEffectivenessData(m),
      [
        { key: 'metric', label: { vi: 'Chỉ số', en: 'Metric' }, sortable: false },
        { key: 'value',  label: { vi: 'Giá trị', en: 'Value' } },
        { key: 'target', label: { vi: 'Mục tiêu', en: 'Target' } }
      ]
    );

    // 3. Complaint Response Time — bar chart concept
    html += renderSingleChart(
      'tower-complaint-response',
      { vi: 'Thời gian phản hồi khiếu nại', en: 'Complaint Response Time' },
      buildComplaintResponseData(),
      [
        { key: 'period', label: { vi: 'Kỳ', en: 'Period' }, sortable: false },
        { key: 'avg_days', label: { vi: 'TB (ngày)', en: 'Avg (days)' }, type: 'number' },
        { key: 'target', label: { vi: 'Mục tiêu', en: 'Target' }, type: 'number' }
      ]
    );

    // 4. Supplier Quality Trend — line chart concept
    html += renderSingleChart(
      'tower-supplier-trend',
      { vi: 'Xu hướng chất lượng NCC', en: 'Supplier Quality Trend' },
      buildSupplierTrendData(m),
      [
        { key: 'metric', label: { vi: 'Chỉ số', en: 'Metric' }, sortable: false },
        { key: 'value',  label: { vi: 'Giá trị', en: 'Value' } },
        { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
      ]
    );

    html += '</div>';
    return html;
  }

  function renderSingleChart(chartId, title, tableData, tableColumns) {
    var chartHtml = '<div class="eqms-tower-chart-cell">';
    chartHtml += '<div class="eqms-tower-chart-title">' + esc(T(title)) + '</div>';
    chartHtml += ui.renderChartWithTableFallback(
      chartId,
      null, // chart render function — deferred to real chart library integration
      tableColumns,
      tableData,
      { defaultMode: 'table' }
    );
    chartHtml += '</div>';
    return chartHtml;
  }

  // ── Chart Data Builders ──
  function buildNcrTrendData() {
    // Build 12-month series from live_counts snapshot or generate placeholders
    var d   = state.dashboard || {};
    var lc  = d.live_counts || {};
    var now = new Date();
    var rows = [];
    var monthNames = lang() === 'vi'
      ? ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (var i = 11; i >= 0; i--) {
      var d2 = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var label = monthNames[d2.getMonth()] + ' ' + d2.getFullYear();
      // Current month shows live count; historical months show estimated data
      var count = (i === 0) ? parseInt(lc.open_ncr || 0, 10) : null;
      rows.push({ month: label, count: count != null ? count : '\u2014' });
    }
    return rows;
  }

  function buildCapaEffectivenessData(metrics) {
    return [
      { metric: T({ vi: 'Tỉ lệ đóng đúng hạn', en: 'On-Time Closure Rate' }),
        value: metrics.capa_on_time_closure_rate_pct != null ? metrics.capa_on_time_closure_rate_pct + '%' : '\u2014',
        target: '90%' },
      { metric: T({ vi: '0-30 ngày', en: '0-30 days' }),
        value: fmt(metrics.capa_aging_buckets ? metrics.capa_aging_buckets.bucket_0_30 : null),
        target: '\u2014' },
      { metric: T({ vi: '31-60 ngày', en: '31-60 days' }),
        value: fmt(metrics.capa_aging_buckets ? metrics.capa_aging_buckets.bucket_31_60 : null),
        target: '\u2014' },
      { metric: T({ vi: '61-90 ngày', en: '61-90 days' }),
        value: fmt(metrics.capa_aging_buckets ? metrics.capa_aging_buckets.bucket_61_90 : null),
        target: '\u2014' },
      { metric: T({ vi: '>90 ngày', en: '>90 days' }),
        value: fmt(metrics.capa_aging_buckets ? metrics.capa_aging_buckets.bucket_over_90 : null),
        target: '0' }
    ];
  }

  function buildComplaintResponseData() {
    var lc = (state.dashboard || {}).live_counts || {};
    return [{ period: 'Q1', avg_days: '\u2014', target: 5 }, { period: 'Q2', avg_days: '\u2014', target: 5 },
      { period: 'Q3', avg_days: '\u2014', target: 5 },
      { period: T({ vi: 'Hiện tại', en: 'Current' }), avg_days: parseInt(lc.open_complaints || 0, 10) > 0 ? '\u2014' : 0, target: 5 }];
  }

  function buildSupplierTrendData(m) {
    var sr = m.supplier_scar_response_rate_pct;
    var sts = sr == null ? 'unknown' : (sr >= 90 ? 'good' : (sr >= 70 ? 'acceptable' : 'poor'));
    var pct = function(v) { return v != null ? v + '%' : '\u2014'; };
    return [
      { metric: T({ vi: 'Tỉ lệ phản hồi SCAR', en: 'SCAR Response Rate' }), value: pct(sr), status: sts },
      { metric: T({ vi: 'Tuân thủ hiệu chuẩn', en: 'Calibration Compliance' }), value: pct(m.calibration_compliance_rate_pct), status: m.calibration_compliance_rate_pct >= 95 ? 'good' : 'acceptable' },
      { metric: T({ vi: 'Tuân thủ đào tạo', en: 'Training Compliance' }), value: pct(m.training_compliance_rate_pct), status: m.training_compliance_rate_pct >= 90 ? 'good' : 'acceptable' }
    ];
  }

  // ── Render: Module Status Overview ──
  function renderModuleStatusGrid() {
    var d  = state.dashboard || {};
    var lc = d.live_counts || {};
    var overdueData = state.overdueActions || {};
    var overdueList = overdueData.overdue_actions || [];

    // Count overdue per module
    var overdueByModule = {};
    overdueList.forEach(function(a) {
      var mod = a.module || 'unknown';
      overdueByModule[mod] = (overdueByModule[mod] || 0) + 1;
    });

    // Map live_counts keys to module ids
    var countMap = {
      'complaints':     parseInt(lc.open_complaints || 0, 10),
      'deviations':     parseInt(lc.open_deviations || 0, 10),
      'ncr':            parseInt(lc.open_ncr || 0, 10),
      'capa':           parseInt(lc.open_capa || 0, 10),
      'change-control': parseInt(lc.open_changes || 0, 10),
      'audits':         parseInt(lc.open_audit_findings || 0, 10),
      'suppliers':      parseInt(lc.open_scar || 0, 10),
      'calibration':    parseInt(lc.overdue_calibrations || 0, 10),
      'lab-investigations': parseInt(lc.open_lab_investigations || 0, 10),
      'field-actions':  parseInt(lc.active_field_actions || 0, 10),
      'batch-release':  parseInt(lc.pending_release || 0, 10),
      'training':       parseInt(lc.overdue_training || 0, 10)
    };

    var columns = [
      { key: 'module',  label: { vi: 'Module', en: 'Module' }, sortable: false,
        render: function(val, row) {
          return '<span style="cursor:pointer;color:var(--hm-accent,#3b82f6)" data-action="open-module" data-module="' + esc(row.moduleId) + '">'
            + row.icon + ' ' + esc(val) + '</span>';
        }
      },
      { key: 'open',    label: { vi: 'Đang mở', en: 'Open' },    type: 'number' },
      { key: 'overdue', label: { vi: 'Quá hạn', en: 'Overdue' }, type: 'number',
        render: function(val) {
          var n = parseInt(val || 0, 10);
          if (n > 0) return '<span style="color:#dc2626;font-weight:600">' + fmt(n) + '</span>';
          return '<span style="color:#16a34a">' + fmt(n) + '</span>';
        }
      },
      { key: 'trend',   label: { vi: 'Xu hướng', en: 'Trend' }, sortable: false,
        render: function(val) {
          if (val === 'up')   return '<span style="color:#dc2626">\u2191</span>';
          if (val === 'down') return '<span style="color:#16a34a">\u2193</span>';
          return '<span style="color:#94a3b8">\u2192</span>';
        }
      }
    ];

    var data = MODULE_DEFS.map(function(mod) {
      var openCount = countMap[mod.id] || 0;
      var overdueCount = overdueByModule[mod.id] || overdueByModule[mod.id.replace('-', '_')] || 0;

      // Simple trend heuristic: overdue > 0 = up (bad), else neutral
      var trend = overdueCount > 0 ? 'up' : 'neutral';

      return {
        moduleId: mod.id,
        icon:     mod.icon,
        module:   T(mod.label),
        open:     openCount,
        overdue:  overdueCount,
        trend:    trend
      };
    });

    return ui.renderDataGrid(columns, data, { selectable: false });
  }

  // ── Render: Compliance Calendar Preview ──
  function renderCalendarPreview() {
    var cal = state.calendar || {};
    var events = cal.events || [];

    if (!events.length) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCC5',
        title: { vi: 'Không có sự kiện sắp tới', en: 'No upcoming compliance events' },
        desc:  { vi: 'Trong 30 ngày tới', en: 'In the next 30 days' }
      });
    }

    // Show first 8 events
    var shown = events.slice(0, 8);
    var html = '<div class="eqms-calendar-list">';
    shown.forEach(function(ev) {
      var typeLabels = {
        calibration_due:          T({ vi: 'Hiệu chuẩn đến hạn', en: 'Calibration Due' }),
        training_expiry:          T({ vi: 'Đào tạo hết hạn', en: 'Training Expiry' }),
        audit_scheduled:          T({ vi: 'Đánh giá đã lên kế hoạch', en: 'Audit Scheduled' }),
        quality_agreement_review: T({ vi: 'Xem xét thỏa thuận CL', en: 'QA Review Due' })
      };
      var typeIcons = {
        calibration_due: '\uD83D\uDCCF',
        training_expiry: '\uD83C\uDF93',
        audit_scheduled: '\uD83D\uDD0D',
        quality_agreement_review: '\uD83E\uDD1D'
      };

      var dueDate = new Date(ev.due_date);
      var daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      var urgency = daysUntil <= 7 ? 'critical' : (daysUntil <= 14 ? 'warning' : '');

      html += '<div class="eqms-calendar-item ' + urgency + '">';
      html += '<span class="eqms-calendar-icon">' + (typeIcons[ev.event_type] || '\uD83D\uDCC5') + '</span>';
      html += '<div class="eqms-calendar-detail">';
      html += '<div class="eqms-calendar-name">' + esc(ev.name || ev.id) + '</div>';
      html += '<div class="eqms-calendar-type">' + esc(typeLabels[ev.event_type] || ev.event_type) + '</div>';
      html += '</div>';
      html += '<div class="eqms-calendar-date">';
      html += '<div>' + esc(fmtDate(ev.due_date)) + '</div>';
      html += '<div class="eqms-calendar-countdown ' + urgency + '">';
      if (daysUntil <= 0) {
        html += T({ vi: 'Quá hạn!', en: 'Overdue!' });
      } else if (daysUntil === 1) {
        html += T({ vi: 'Ngày mai', en: 'Tomorrow' });
      } else {
        html += daysUntil + ' ' + T({ vi: 'ngày', en: 'days' });
      }
      html += '</div></div>';
      html += '</div>';
    });
    html += '</div>';

    if (events.length > 8) {
      html += '<div style="text-align:center;padding:8px 0">';
      html += '<span style="color:var(--hm-text-secondary,#64748b);font-size:12px">';
      html += '+' + (events.length - 8) + ' ' + T({ vi: 'sự kiện khác', en: 'more events' });
      html += '</span></div>';
    }

    return html;
  }

  // ── Render: Filter Bar ──
  function renderFilterBarSection() {
    return ui.renderFilterBar(state.filters, {
      fields: [
        {
          key: 'date_from',
          type: 'date',
          label: { vi: 'Từ ngày', en: 'From' }
        },
        {
          key: 'date_to',
          type: 'date',
          label: { vi: 'Đến ngày', en: 'To' }
        },
        {
          key: 'department',
          type: 'select',
          label: { vi: 'Phòng ban', en: 'Department' },
          options: [
            { value: 'production',  label: { vi: 'Sản xuất', en: 'Production' } },
            { value: 'engineering', label: { vi: 'Kỹ thuật', en: 'Engineering' } },
            { value: 'quality',     label: { vi: 'Chất lượng', en: 'Quality' } },
            { value: 'warehouse',   label: { vi: 'Kho', en: 'Warehouse' } },
            { value: 'purchasing',  label: { vi: 'Mua hàng', en: 'Purchasing' } },
            { value: 'maintenance', label: { vi: 'Bảo trì', en: 'Maintenance' } }
          ]
        },
        {
          key: 'priority',
          type: 'select',
          label: { vi: 'Mức độ', en: 'Priority' },
          options: [
            { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } },
            { value: 'high',     label: { vi: 'Cao', en: 'High' } },
            { value: 'medium',   label: { vi: 'Trung bình', en: 'Medium' } },
            { value: 'low',      label: { vi: 'Thấp', en: 'Low' } }
          ]
        }
      ]
    });
  }

  // ── Render: Export Menu ──
  function renderTowerExportMenu() {
    return ui.renderExportMenu({
      formats: ['pdf', 'excel', 'csv', 'controlled']
    });
  }

  // ── Main Render ──
  function render(container, context) {
    // Store container reference for re-renders
    state._container = container;
    state._context   = context || {};

    // First load
    if (state.loading && !state.lastFetchedAt) {
      container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải Quality Tower...', en: 'Loading Quality Control Tower...' });
      loadAllData().then(function() {
        renderDashboard(container);
        startAutoRefresh(container);
      });
      return;
    }

    renderDashboard(container);
    startAutoRefresh(container);
  }

  function renderDashboard(container) {
    if (state.error) {
      container.innerHTML = ui.renderErrorState(state.error, 'retry-load');
      bindEvents(container);
      return;
    }

    var html = '<div class="eqms-tower-dashboard">';

    // ── Header bar ──
    html += '<div class="eqms-tower-header">';
    html += '<div class="eqms-tower-header-left">';
    html += '<h2 class="eqms-tower-title">' + T({ vi: 'Tháp Kiểm soát Chất lượng', en: 'Quality Control Tower' }) + '</h2>';
    html += '<span class="eqms-tower-subtitle">' + T({ vi: 'Tổng quan thời gian thực | Dành cho quản lý', en: 'Real-time overview | Executive dashboard' }) + '</span>';
    html += '</div>';
    html += '<div class="eqms-tower-header-right">';
    html += renderFreshnessIndicator(T({ vi: 'Dữ liệu tổng thể', en: 'Overall data' }));
    html += '<button class="eqms-btn secondary sm" data-action="refresh-now" style="margin-left:8px">';
    html += '\u21BB ' + T({ vi: 'Làm mới', en: 'Refresh' });
    html += '</button>';
    html += renderTowerExportMenu();
    html += '</div>';
    html += '</div>';

    // ── Filter bar ──
    html += renderFilterBarSection();

    // ── KPI Row ──
    var kpiItems = buildKpiItems();
    if (kpiItems.length) {
      html += ui.renderKpiRow(kpiItems);
    }

    // ── Two-column layout for event queue + calendar ──
    html += '<div class="eqms-tower-two-col">';

    // Left: Quality Event Queue
    var events = buildEventQueue();
    var eventQueueHtml = renderEventQueue(events);
    var eventHeaderActions = '<span style="font-size:12px;color:var(--hm-text-secondary,#64748b)">';
    eventHeaderActions += fmt(events.length) + ' ' + T({ vi: 'mục', en: 'items' });
    eventHeaderActions += '</span>';
    html += '<div class="eqms-tower-col-main">';
    html += ui.renderSection(
      { vi: 'Hàng đợi sự kiện chất lượng', en: 'Quality Event Queue' },
      eventQueueHtml,
      { headerActions: renderFreshnessIndicator(T({ vi: 'Sự kiện', en: 'Events' })) + eventHeaderActions }
    );
    html += '</div>';

    // Right: Compliance Calendar Preview
    html += '<div class="eqms-tower-col-side">';
    html += ui.renderSection(
      { vi: 'Lịch tuân thủ (30 ngày)', en: 'Compliance Calendar (30 days)' },
      renderCalendarPreview(),
      { headerActions: renderFreshnessIndicator(T({ vi: 'Lịch', en: 'Calendar' })) }
    );
    html += '</div>';

    html += '</div>'; // end two-col

    // ── Trend Charts Section ──
    html += ui.renderSection(
      { vi: 'Biểu đồ xu hướng', en: 'Trend Charts' },
      renderTrendCharts(),
      { headerActions: renderFreshnessIndicator(T({ vi: 'Xu hướng', en: 'Trends' })) }
    );

    // ── Module Status Overview ──
    html += ui.renderSection(
      { vi: 'Tổng quan trạng thái module', en: 'Module Status Overview' },
      renderModuleStatusGrid(),
      { headerActions: renderFreshnessIndicator(T({ vi: 'Trạng thái', en: 'Status' })) }
    );

    // ── CAPA Aging Breakdown (bonus insight) ──
    var agingHtml = renderCapaAgingBreakdown();
    if (agingHtml) {
      html += ui.renderSection(
        { vi: 'Phân tích tuổi CAPA', en: 'CAPA Aging Breakdown' },
        agingHtml,
        { headerActions: renderFreshnessIndicator(T({ vi: 'CAPA', en: 'CAPA' })) }
      );
    }

    html += '</div>'; // end dashboard
    container.innerHTML = html;
    bindEvents(container);

    // Post-render: initialize any chart libraries if available
    initCharts();
  }

  // ── Render: CAPA Aging Breakdown ──
  function renderCapaAgingBreakdown() {
    var m = state.metrics || {};
    var buckets = m.capa_aging_buckets;
    if (!buckets) return null;

    var b030  = parseInt(buckets.bucket_0_30 || 0, 10);
    var b3160 = parseInt(buckets.bucket_31_60 || 0, 10);
    var b6190 = parseInt(buckets.bucket_61_90 || 0, 10);
    var b90p  = parseInt(buckets.bucket_over_90 || 0, 10);
    var total = b030 + b3160 + b6190 + b90p;

    if (total === 0) {
      return ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Không có CAPA mở', en: 'No open CAPAs' }
      });
    }

    var html = '<div class="eqms-aging-bar-container">';

    // Stacked horizontal bar
    html += '<div class="eqms-aging-bar">';
    var segments = [
      { count: b030,  label: '0-30d',  color: '#16a34a' },
      { count: b3160, label: '31-60d', color: '#ca8a04' },
      { count: b6190, label: '61-90d', color: '#ea580c' },
      { count: b90p,  label: '>90d',   color: '#dc2626' }
    ];
    segments.forEach(function(seg) {
      if (seg.count === 0) return;
      var pct = Math.max(2, (seg.count / total * 100));
      html += '<div class="eqms-aging-segment" style="width:' + pct + '%;background:' + seg.color + '" ';
      html += 'title="' + esc(seg.label + ': ' + seg.count) + '">';
      if (pct > 8) html += '<span>' + seg.count + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Legend
    html += '<div class="eqms-aging-legend">';
    segments.forEach(function(seg) {
      html += '<span class="eqms-aging-legend-item">';
      html += '<span class="eqms-aging-legend-dot" style="background:' + seg.color + '"></span>';
      html += esc(seg.label) + ': <strong>' + seg.count + '</strong>';
      html += '</span>';
    });
    html += '<span class="eqms-aging-legend-item" style="margin-left:auto;font-weight:600">';
    html += T({ vi: 'Tổng', en: 'Total' }) + ': ' + total;
    html += '</span>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ── Chart Initialization ──
  function initCharts() {
    // Integration point for chart libraries (ECharts, Chart.js, etc.)
    // renderChartWithTableFallback provides container divs.
    // Table fallback is default; if a chart library is present, render into
    // the container and toggle to chart view. Extend here as needed.
    if (typeof window.echarts === 'undefined' && typeof window.Chart === 'undefined') return;
    ['tower-ncr-trend', 'tower-capa-effectiveness', 'tower-complaint-response', 'tower-supplier-trend'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var wrapper = el.closest('.eqms-chart-container');
      if (wrapper) {
        var cv = wrapper.querySelector('.eqms-chart-view');
        var tv = wrapper.querySelector('.eqms-table-view');
        if (cv) cv.style.display = '';
        if (tv) tv.style.display = 'none';
        wrapper.querySelectorAll('.eqms-chart-toggle-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-mode') === 'chart');
        });
      }
    });
  }

  // ── Event Binding ──
  function bindEvents(container) {
    container.addEventListener('click', handleClick);
    container.addEventListener('change', handleFilterChange);
  }

  function handleClick(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'retry-load' || action === 'refresh-now') { refreshDashboard(); }
    else if (action === 'apply-filters')  { applyFilters(); }
    else if (action === 'reset-filters')  { resetFilters(); }
    else if (action === 'open-event') {
      var modId = target.getAttribute('data-module');
      var recId = target.getAttribute('data-id');
      if (modId) window.EqmsShell.navigate(modId, { recordId: recId, view: 'detail' });
    }
    else if (action === 'open-module') {
      var navMod = target.getAttribute('data-module');
      if (navMod) window.EqmsShell.navigate(navMod);
    }
    else if (action === 'export') { handleExport(target.getAttribute('data-format')); }
  }

  function handleFilterChange(e) {
    var filterEl = e.target.closest('[data-filter]');
    if (!filterEl) return;
    var key = filterEl.getAttribute('data-filter');
    if (key && state.filters.hasOwnProperty(key)) {
      state.filters[key] = filterEl.value;
    }
  }

  // ── Actions ──
  function applyFilters() {
    // Read current filter values from DOM
    var container = state._container;
    if (!container) return;

    container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      if (key && state.filters.hasOwnProperty(key)) {
        state.filters[key] = el.value;
      }
    });

    refreshDashboard();
  }

  function resetFilters() {
    state.filters = { date_from: '', date_to: '', department: '', priority: '' };
    refreshDashboard();
  }

  function refreshDashboard() {
    var container = state._container;
    if (!container) return;

    container.innerHTML = ui.renderLoadingState({ vi: 'Đang cập nhật...', en: 'Refreshing...' });
    loadAllData().then(function() {
      renderDashboard(container);
    });
  }

  function handleExport(format) {
    if (!format) return;
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    opts.body = JSON.stringify({ format: format, filters: state.filters });
    fetch('api/v1/eqms/quality-tower/export', opts)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json && json.data && json.data.job_id) {
          showToast(T({ vi: 'Yêu cầu xuất dữ liệu đã gửi. Mã:', en: 'Export requested. Job: ' }) + json.data.job_id);
        }
      })
      .catch(function() {
        showToast(T({ vi: 'Xuất dữ liệu thất bại', en: 'Export failed' }));
      });
  }

  function showToast(msg) {
    if (window.showNotification) { window.showNotification(msg, 'info'); return; }
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e293b;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .3s';
    document.body.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; }, 3000);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  }

  // ── Auto-Refresh ──
  function startAutoRefresh(container) {
    stopAutoRefresh();
    state.refreshTimer = setInterval(function() {
      // Only refresh if the module is still active
      if (!state._container || !state._container.isConnected) {
        stopAutoRefresh();
        return;
      }
      // Detect stale and silently refresh (no loading spinner for background refresh)
      loadAllData().then(function() {
        if (state._container && state._container.isConnected) {
          renderDashboard(state._container);
        }
      });
    }, AUTO_REFRESH_MS);
  }

  function stopAutoRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
  }

  // ── Inline Styles (scoped) ──
  function injectStyles() {
    if (document.getElementById('eqms-tower-styles')) return;
    var style = document.createElement('style');
    style.id = 'eqms-tower-styles';
    style.textContent =
      '.eqms-tower-dashboard{display:flex;flex-direction:column;gap:16px}' +
      '.eqms-tower-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}' +
      '.eqms-tower-header-left{display:flex;flex-direction:column;gap:2px}' +
      '.eqms-tower-title{margin:0;font-size:20px;font-weight:700;color:var(--hm-text-primary,#0f172a)}' +
      '.eqms-tower-subtitle{font-size:13px;color:var(--hm-text-secondary,#64748b)}' +
      '.eqms-tower-header-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.eqms-tower-two-col{display:grid;grid-template-columns:1fr 340px;gap:16px}' +
      '.eqms-tower-col-main,.eqms-tower-col-side{min-width:0}' +
      '@media(max-width:900px){.eqms-tower-two-col{grid-template-columns:1fr}}' +
      '.eqms-tower-charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}' +
      '@media(max-width:768px){.eqms-tower-charts-grid{grid-template-columns:1fr}}' +
      '.eqms-tower-chart-cell{min-width:0}' +
      '.eqms-tower-chart-title{font-size:13px;font-weight:600;color:var(--hm-text-primary,#0f172a);margin-bottom:8px}' +
      '.eqms-event-group{margin-bottom:12px}' +
      '.eqms-event-group-header{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--hm-border,#e2e8f0);margin-bottom:6px}' +
      '.eqms-event-group-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--hm-text-secondary,#64748b)}' +
      '.eqms-event-group-count{font-size:11px;color:var(--hm-text-tertiary,#94a3b8)}' +
      '.eqms-event-card{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background .15s;border:1px solid var(--hm-border,#e2e8f0);margin-bottom:4px}' +
      '.eqms-event-card:hover{background:var(--hm-bg-hover,#f8fafc)}' +
      '.eqms-event-icon{font-size:18px;flex-shrink:0;margin-top:2px}' +
      '.eqms-event-info{flex:1;min-width:0}' +
      '.eqms-event-top{display:flex;gap:6px;align-items:baseline;margin-bottom:3px}' +
      '.eqms-event-record-id{font-size:11px;font-family:monospace;color:var(--hm-text-secondary,#64748b);white-space:nowrap}' +
      '.eqms-event-title{font-size:13px;color:var(--hm-text-primary,#0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.eqms-event-bottom{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.eqms-event-age{font-size:11px;color:#dc2626;font-weight:600}' +
      '.eqms-event-assignee{font-size:11px;color:var(--hm-text-secondary,#64748b)}' +
      '.eqms-calendar-list{display:flex;flex-direction:column;gap:6px}' +
      '.eqms-calendar-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;border:1px solid var(--hm-border,#e2e8f0)}' +
      '.eqms-calendar-item.critical{border-left:3px solid #dc2626}.eqms-calendar-item.warning{border-left:3px solid #ca8a04}' +
      '.eqms-calendar-icon{font-size:16px;flex-shrink:0}' +
      '.eqms-calendar-detail{flex:1;min-width:0}' +
      '.eqms-calendar-name{font-size:13px;color:var(--hm-text-primary,#0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.eqms-calendar-type{font-size:11px;color:var(--hm-text-secondary,#64748b)}' +
      '.eqms-calendar-date{text-align:right;flex-shrink:0}' +
      '.eqms-calendar-date>div:first-child{font-size:12px;color:var(--hm-text-primary,#0f172a)}' +
      '.eqms-calendar-countdown{font-size:11px;font-weight:600}' +
      '.eqms-calendar-countdown.critical{color:#dc2626}.eqms-calendar-countdown.warning{color:#ca8a04}' +
      '.eqms-aging-bar-container{padding:4px 0}' +
      '.eqms-aging-bar{display:flex;height:28px;border-radius:6px;overflow:hidden;margin-bottom:10px}' +
      '.eqms-aging-segment{display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;transition:width .3s;min-width:0}' +
      '.eqms-aging-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--hm-text-secondary,#64748b)}' +
      '.eqms-aging-legend-item{display:flex;align-items:center;gap:4px}' +
      '.eqms-aging-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}';
    document.head.appendChild(style);
  }

  // ── Cleanup ──
  function destroy() {
    stopAutoRefresh();
    if (state._container) {
      state._container.removeEventListener('click', handleClick);
      state._container.removeEventListener('change', handleFilterChange);
    }
  }

  // ── Module Registration ──
  injectStyles();

  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['quality-tower'] = {
    render:  render,
    destroy: destroy,
    meta:    MOD
  };

})();

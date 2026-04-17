/**
 * EQMS Supplier Audits & SCAR — Worklist + Evidence Workspace
 * HESEM MOM Portal · 52-eqms-supplier-audits.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: supplier-audits
 * Archetype: evidence-workspace
 * Load order: AFTER 40-eqms-shell.js
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T;
  var esc  = util.esc;
  var fmt  = util.fmt;
  var fmtDate    = util.fmtDate;
  var fmtDateTime = util.fmtDateTime;
  var slugify    = util.slugify;
  var apiCall    = util.apiCall;

  // =========================================================================
  // MODULE METADATA
  // =========================================================================
  var MOD = {
    id:        'supplier-audits',
    label:     { vi: 'Đánh giá NCC & SCAR', en: 'Supplier Audits & SCAR' },
    icon:      '\uD83D\uDCCB',
    group:     'supplier',
    archetype: 'evidence-workspace'
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var AUDIT_STATES = ['planned', 'scheduled', 'in_progress', 'report_drafted', 'report_issued', 'closed'];
  var SCAR_STATES  = ['issued', 'acknowledged', 'root_cause_submitted', 'corrective_action_submitted', 'verification', 'closed'];

  var AUDIT_STATUSES = [
    { value: 'planned',         label: { vi: 'Kế hoạch', en: 'Planned' } },
    { value: 'scheduled',       label: { vi: 'Đã lên lịch', en: 'Scheduled' } },
    { value: 'in_progress',     label: { vi: 'Đang thực hiện', en: 'In Progress' } },
    { value: 'report_drafted',  label: { vi: 'Báo cáo nháp', en: 'Report Drafted' } },
    { value: 'report_issued',   label: { vi: 'Báo cáo đã phát hành', en: 'Report Issued' } },
    { value: 'closed',          label: { vi: 'Đã đóng', en: 'Closed' } }
  ];

  var SCAR_STATUSES = [
    { value: 'issued',                       label: { vi: 'Đã phát hành', en: 'Issued' } },
    { value: 'acknowledged',                 label: { vi: 'Đã xác nhận', en: 'Acknowledged' } },
    { value: 'root_cause_submitted',         label: { vi: 'Đã nộp nguyên nhân gốc', en: 'Root Cause Submitted' } },
    { value: 'corrective_action_submitted',  label: { vi: 'Đã nộp HĐKP', en: 'Corrective Action Submitted' } },
    { value: 'verification',                 label: { vi: 'Xác minh', en: 'Verification' } },
    { value: 'closed',                       label: { vi: 'Đã đóng', en: 'Closed' } }
  ];

  var AUDIT_TYPES = [
    { value: 'initial',   label: { vi: 'Lần đầu', en: 'Initial' } },
    { value: 'periodic',  label: { vi: 'Định kỳ', en: 'Periodic' } },
    { value: 'for-cause', label: { vi: 'Có nguyên nhân', en: 'For-Cause' } }
  ];

  var SEVERITY_LEVELS = [
    { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } },
    { value: 'major',    label: { vi: 'Lớn', en: 'Major' } },
    { value: 'minor',    label: { vi: 'Nhỏ', en: 'Minor' } },
    { value: 'observation', label: { vi: 'Quan sát', en: 'Observation' } }
  ];

  var RATING_OPTIONS = [
    { value: 'acceptable',   label: { vi: 'Chấp nhận được', en: 'Acceptable' } },
    { value: 'conditional',  label: { vi: 'Có điều kiện', en: 'Conditional' } },
    { value: 'unacceptable', label: { vi: 'Không chấp nhận', en: 'Unacceptable' } }
  ];

  var AUDIT_DETAIL_TABS = [
    { id: 'summary',   label: { vi: 'Tổng quan', en: 'Summary' } },
    { id: 'checklist', label: { vi: 'Checklist', en: 'Checklist' } },
    { id: 'findings',  label: { vi: 'Phát hiện', en: 'Findings' } },
    { id: 'report',    label: { vi: 'Báo cáo', en: 'Report' } },
    { id: 'followup',  label: { vi: 'Theo dõi', en: 'Follow-up' } },
    { id: 'related',   label: { vi: 'Liên kết', en: 'Related Records' } },
    { id: 'evidence',  label: { vi: 'Chữ ký & Tệp', en: 'Signatures & Files' } }
  ];

  var SCAR_DETAIL_TABS = [
    { id: 'summary',       label: { vi: 'Tổng quan', en: 'Summary' } },
    { id: 'response',      label: { vi: 'Phản hồi NCC', en: 'Supplier Response' } },
    { id: 'verification',  label: { vi: 'Xác minh', en: 'Verification' } },
    { id: 'effectiveness', label: { vi: 'Hiệu quả', en: 'Effectiveness' } },
    { id: 'related',       label: { vi: 'Liên kết', en: 'Related Records' } },
    { id: 'evidence',      label: { vi: 'Chữ ký & Tệp', en: 'Signatures & Files' } }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen:       'audit-queue',  // audit-queue | audit-detail | scar-queue | scar-detail | create-audit | create-scar
    filters:      {},
    sort:         { key: 'audit_id', dir: 'desc' },
    page:         1,
    limit:        25,
    list:         null,
    total:        0,
    metrics:      null,
    detail:       null,
    activeTab:    'summary',
    tabData:      {},
    loading:      false,
    error:        null,
    formData:     {},
    wizardStep:   0,
    // SCAR state
    scarFilters:  {},
    scarSort:     { key: 'scar_id', dir: 'desc' },
    scarPage:     1,
    scarList:     null,
    scarTotal:    0,
    scarDetail:   null,
    scarTab:      'summary',
    scarTabData:  {}
  };

  var _container = null;

  // =========================================================================
  // DATA FETCHING — AUDITS
  // =========================================================================
  function loadAuditList() {
    state.loading = true;
    state.error = null;
    paint();
    var params = Object.assign({}, state.filters, {
      offset: (state.page - 1) * state.limit,
      limit:  state.limit,
      sort:   state.sort.key,
      dir:    state.sort.dir
    });
    apiCall('eqms_supplier_audits_query', params).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message || 'Load failed'; paint(); return; }
      state.list  = res.data || res.items || [];
      state.total = res.total || state.list.length;
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function loadAuditDetail(id) {
    state.loading = true;
    state.error = null;
    state.detail = null;
    state.tabData = {};
    state.activeTab = 'summary';
    paint();
    apiCall('eqms_supplier_audits_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message; paint(); return; }
      state.detail = res.data || res;
      window.EqmsShell.navigate('supplier-audits', { recordId: state.detail.supplier_audit_id || state.detail.audit_id || id });
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      paint();
    });
  }

  function loadAuditTabData(tab) {
    if (state.tabData[tab]) return;
    if (!state.detail) return;
    var id = state.detail.supplier_audit_id || state.detail.id || state.detail.audit_id;
    if (tab === 'evidence') {
      Promise.all([
        apiCall('eqms_supplier_audits_attachments', { id: id }),
        apiCall('eqms_supplier_audits_comments', { id: id })
      ]).then(function(results) {
        state.tabData.attachments = results[0].data || results[0].attachments || [];
        state.tabData.comments = results[1].data || results[1].comments || [];
        state.tabData.evidence = true;
        paint();
      }).catch(function() {});
      return;
    }
    var actionMap = {
      checklist:   'eqms_supplier_audits_detail',
      findings:    'eqms_supplier_audits_detail',
      report:      'eqms_supplier_audits_detail',
      followup:    'eqms_supplier_audits_detail',
      related:     'eqms_supplier_audits_audit',
      evidence:    'eqms_supplier_audits_attachments'
    };
    var action = actionMap[tab];
    if (!action) return;
    apiCall(action, { id: id, tab: tab }).then(function(res) {
      state.tabData[tab] = res.data || res.items || res;
      paint();
    }).catch(function() {});
  }

  function loadAuditMetrics() {
    apiCall('eqms_supplier_audits_metrics', {}).then(function(res) {
      state.metrics = res.data || res;
      paint();
    }).catch(function() {});
  }

  // =========================================================================
  // DATA FETCHING — SCARS
  // =========================================================================
  function loadScarList() {
    state.loading = true;
    state.error = null;
    paint();
    var params = Object.assign({}, state.scarFilters, {
      offset: (state.scarPage - 1) * state.limit,
      limit:  state.limit,
      sort:   state.scarSort.key,
      dir:    state.scarSort.dir
    });
    apiCall('eqms_scars_query', params).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message || 'Load failed'; paint(); return; }
      state.scarList  = res.data || res.items || [];
      state.scarTotal = res.total || state.scarList.length;
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function loadScarDetail(id) {
    state.loading = true;
    state.error = null;
    state.scarDetail = null;
    state.scarTabData = {};
    state.scarTab = 'summary';
    paint();
    apiCall('eqms_scars_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message; paint(); return; }
      state.scarDetail = res.data || res;
      window.EqmsShell.navigate('supplier-audits', { recordId: state.scarDetail.scar_id || id });
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      paint();
    });
  }

  function loadScarTabData(tab) {
    if (state.scarTabData[tab]) return;
    if (!state.scarDetail) return;
    var id = state.scarDetail.id || state.scarDetail.scar_id;
    if (tab === 'evidence') {
      Promise.all([
        apiCall('eqms_scars_attachments', { id: id }),
        apiCall('eqms_scars_comments', { id: id })
      ]).then(function(results) {
        state.scarTabData.attachments = results[0].data || results[0].attachments || [];
        state.scarTabData.comments = results[1].data || results[1].comments || [];
        state.scarTabData.evidence = true;
        paint();
      }).catch(function() {});
      return;
    }
    var actionMap = {
      response:      'eqms_scars_detail',
      verification:  'eqms_scars_detail',
      effectiveness: 'eqms_scars_detail',
      related:       'eqms_scars_detail'
    };
    var action = actionMap[tab];
    if (!action) return;
    apiCall(action, { id: id, tab: tab }).then(function(res) {
      state.scarTabData[tab] = res.data || res.items || res;
      paint();
    }).catch(function() {});
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function executeAuditAction(action, id) {
    if (!id) return;
    // map frontend action strings to backend endpoint names
    var actionMap = {
      'issue-report': 'issue_scar'
    };
    var endpointAction = actionMap[action] || action.replace(/-/g, '_');
    var endpoint = 'eqms_supplier_audits_action_' + endpointAction;
    apiCall(endpoint, { id: id }).then(function(res) {
      if (res.success !== false) {
        if (state.screen === 'audit-detail') loadAuditDetail(id);
        else loadAuditList();
      }
    }).catch(function(err) { console.error(err); });
  }

  function executeScarAction(action, id) {
    if (!id) return;
    // action strings arriving here are already stripped of 'scar-' prefix by the event handler
    var endpointAction = action.replace(/-/g, '_');
    var endpoint = 'eqms_scars_action_' + endpointAction;
    apiCall(endpoint, { id: id }).then(function(res) {
      if (res.success !== false) {
        if (state.screen === 'scar-detail') loadScarDetail(id);
        else loadScarList();
      }
    }).catch(function(err) { console.error(err); });
  }

  // =========================================================================
  // SCORE HELPERS
  // =========================================================================
  function scoreColor(score) {
    if (score == null) return '';
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  }

  function renderScoreBar(score) {
    if (score == null) return '<span class="eqms-field-value empty">\u2014</span>';
    var color = scoreColor(score);
    var cssColor = color === 'green' ? 'var(--hm-success,#22c55e)' : (color === 'yellow' ? 'var(--hm-warning,#eab308)' : 'var(--hm-danger,#ef4444)');
    return '<div style="display:flex;align-items:center;gap:8px">' +
      '<div style="flex:1;max-width:100px;height:6px;border-radius:3px;background:var(--hm-bg-tertiary,#e2e8f0)">' +
      '<div style="width:' + Math.min(100, Math.max(0, score)) + '%;height:100%;border-radius:3px;background:' + cssColor + '"></div>' +
      '</div>' +
      '<span style="font-weight:600;color:' + cssColor + '">' + esc(String(Math.round(score))) + '</span>' +
      '</div>';
  }

  function daysOpenBadge(days) {
    if (days == null) return '\u2014';
    var cls = days > 30 ? 'critical' : (days > 14 ? 'high' : 'low');
    return '<span class="eqms-priority-dot ' + cls + '"></span> ' + esc(String(days));
  }

  // =========================================================================
  // TOP-LEVEL TAB BAR (Audit Queue | SCAR Queue)
  // =========================================================================
  function renderTopNav() {
    var isAudit = state.screen === 'audit-queue' || state.screen === 'audit-detail' || state.screen === 'create-audit';
    var isScar  = state.screen === 'scar-queue' || state.screen === 'scar-detail' || state.screen === 'create-scar';
    return ui.renderTabs([
      { id: 'audit-queue', label: { vi: 'Hàng đợi đánh giá', en: 'Audit Queue' } },
      { id: 'scar-queue',  label: { vi: 'Hàng đợi SCAR', en: 'SCAR Queue' } }
    ], isAudit ? 'audit-queue' : 'scar-queue');
  }

  // =========================================================================
  // SCREEN 1: AUDIT QUEUE
  // =========================================================================
  function renderAuditQueue() {
    var html = '';
    var m = state.metrics || {};

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng đánh giá', en: 'Total Audits' },         value: fmt(m.total_audits || 0) },
      { label: { vi: 'Đang thực hiện', en: 'In Progress' },         value: fmt(m.in_progress || 0), accent: 'warning' },
      { label: { vi: 'Chờ phát hành', en: 'Pending Report' },       value: fmt(m.pending_report || 0) },
      { label: { vi: 'Quá hạn', en: 'Overdue' },                    value: fmt(m.overdue || 0), accent: 'danger' },
      { label: { vi: 'Điểm TB', en: 'Avg Score' },                  value: m.avg_audit_score != null ? Math.round(m.avg_audit_score) : '\u2014' },
      { label: { vi: 'Tổng phát hiện', en: 'Total Findings' },      value: fmt(m.total_findings || 0) }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-audit">' + T({ vi: '+ Đánh giá mới', en: '+ New Audit' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm đánh giá...', en: 'Search audits...' }, width: '200px' },
        { key: 'supplier', type: 'text', placeholder: { vi: 'NCC...', en: 'Supplier...' }, width: '160px' },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: AUDIT_STATUSES },
        { key: 'audit_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: AUDIT_TYPES },
        { key: 'date_from', type: 'date', label: { vi: 'Từ ngày', en: 'From' } },
        { key: 'date_to', type: 'date', label: { vi: 'Đến ngày', en: 'To' } }
      ]
    });

    if (state.loading) { html += ui.renderLoadingState({ vi: 'Đang tải danh sách đánh giá...', en: 'Loading audits...' }); return html; }
    if (state.error) { html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-audit-list'); return html; }

    // Grid
    var columns = [
      { key: 'audit_id', label: { vi: 'Mã ĐG', en: 'Audit ID' }, type: 'id', sortable: true },
      { key: 'supplier_name', label: { vi: 'NCC', en: 'Supplier' }, type: 'truncate', sortable: true },
      { key: 'audit_type', label: { vi: 'Loại', en: 'Type' }, type: 'badge', sortable: true },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: true },
      { key: 'planned_date', label: { vi: 'Ngày KH', en: 'Planned Date' }, type: 'date', sortable: true },
      { key: 'score', label: { vi: 'Điểm', en: 'Score' }, sortable: true, render: function(v) { return renderScoreBar(v); } },
      { key: 'finding_count', label: { vi: 'Phát hiện', en: 'Findings' }, type: 'number', sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.list || [], {
      selectable: true,
      sortKey: state.sort.key,
      sortDir: state.sort.dir
    });

    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });

    return html;
  }

  // =========================================================================
  // SCREEN 2: AUDIT DETAIL
  // =========================================================================
  function renderAuditDetail() {
    var d = state.detail;
    if (!d) return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : '';
    var html = '';

    // Identity header with workflow actions
    var actions = [];
    switch (d.status) {
      case 'planned':
        actions.push({ action: 'schedule', label: { vi: 'Lên lịch', en: 'Schedule' }, style: 'primary' });
        break;
      case 'scheduled':
        actions.push({ action: 'start', label: { vi: 'Bắt đầu', en: 'Start' }, style: 'primary' });
        break;
      case 'in_progress':
        actions.push({ action: 'record-finding', label: { vi: 'Ghi phát hiện', en: 'Record Finding' }, style: 'secondary' });
        actions.push({ action: 'issue-report', label: { vi: 'Phát hành báo cáo', en: 'Issue Report' }, style: 'primary' });
        break;
      case 'report_drafted':
        actions.push({ action: 'issue-report', label: { vi: 'Phát hành báo cáo', en: 'Issue Report' }, style: 'primary' });
        break;
      case 'report_issued':
        actions.push({ action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'primary' });
        break;
    }
    actions.push({ action: 'edit-audit', label: { vi: 'Chỉnh sửa', en: 'Edit' }, style: 'secondary' });

    html += ui.renderIdentityHeader(d, {
      actions: actions,
      extraMeta: [
        { label: { vi: 'NCC', en: 'Supplier' }, value: d.supplier_name || d.supplier },
        { label: { vi: 'Loại', en: 'Type' }, value: d.audit_type },
        { label: { vi: 'Đánh giá viên trưởng', en: 'Lead Auditor' }, value: d.lead_auditor }
      ]
    });

    // Workflow timeline
    html += ui.renderStateTimeline(AUDIT_STATES, d.status);

    // Tabs
    html += ui.renderTabs(AUDIT_DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">';
    html += renderAuditTabContent(state.activeTab);
    html += '</div>';

    return html;
  }

  function renderAuditTabContent(tab) {
    var d = state.detail;
    if (!d) return '';
    switch (tab) {
      case 'summary':   return renderAuditSummary(d);
      case 'checklist': return renderAuditChecklist();
      case 'findings':  return renderAuditFindings();
      case 'report':    return renderAuditReport();
      case 'followup':  return renderAuditFollowup();
      case 'related':   return renderAuditRelated();
      case 'evidence':  return renderAuditEvidence();
      default:          return '';
    }
  }

  // --- Audit Summary ---
  function renderAuditSummary(d) {
    return ui.renderSection({ vi: 'Thông tin đánh giá', en: 'Audit Information' }, ui.renderFieldGrid([
      { label: { vi: 'Mã đánh giá', en: 'Audit ID' },          value: d.audit_id, mono: true },
      { label: { vi: 'NCC', en: 'Supplier' },                  value: d.supplier_name || d.supplier },
      { label: { vi: 'Loại đánh giá', en: 'Audit Type' },      value: d.audit_type, badge: true },
      { label: { vi: 'Phạm vi', en: 'Scope' },                 value: d.scope },
      { label: { vi: 'Đánh giá viên trưởng', en: 'Lead Auditor' }, value: d.lead_auditor },
      { label: { vi: 'Đội đánh giá', en: 'Audit Team' },       value: Array.isArray(d.team) ? d.team.join(', ') : (d.team || '\u2014') },
      { label: { vi: 'Ngày kế hoạch', en: 'Planned Date' },    value: fmtDate(d.planned_date) },
      { label: { vi: 'Ngày thực tế', en: 'Actual Date' },      value: fmtDate(d.actual_date) },
      { label: { vi: 'Tiêu chuẩn', en: 'Standard' },           value: d.standard },
      { label: { vi: 'Điểm', en: 'Score' },                    value: d.score != null ? Math.round(d.score) : '\u2014' },
      { label: { vi: 'Đánh giá chung', en: 'Overall Rating' }, value: d.overall_rating, badge: true }
    ]));
  }

  // --- Audit Checklist ---
  function renderAuditChecklist() {
    var items = (state.tabData.checklist || state.detail.checklist || []);
    if (!items.length) {
      return ui.renderEmptyState({ icon: '\u2705', title: { vi: 'Chưa có checklist', en: 'No checklist items' },
        action: { key: 'add-checklist-item', label: { vi: 'Thêm mục', en: 'Add Item' } } });
    }
    var html = '<div class="eqms-checklist">';
    items.forEach(function(item, idx) {
      var ratingClass = slugify(item.rating || item.result || 'pending');
      html += '<div class="eqms-checklist-item">';
      html += '<div style="display:flex;align-items:center;gap:12px">';
      html += '<span style="font-weight:600;color:var(--hm-text-secondary);min-width:32px">' + (idx + 1) + '.</span>';
      html += '<div style="flex:1">';
      html += '<div style="font-weight:500">' + esc(item.requirement || item.question || item.title || '') + '</div>';
      if (item.clause) html += '<div style="font-size:12px;color:var(--hm-text-tertiary)">' + T({ vi: 'Điều khoản: ', en: 'Clause: ' }) + esc(item.clause) + '</div>';
      html += '</div>';
      html += '<span class="eqms-badge ' + ratingClass + '">' + esc(item.rating || item.result || T({ vi: 'Chờ đánh giá', en: 'Pending' })) + '</span>';
      html += '</div>';
      if (item.notes) html += '<div style="margin-top:6px;padding-left:44px;font-size:13px;color:var(--hm-text-secondary)">' + esc(item.notes) + '</div>';
      if (item.evidence) html += '<div style="margin-top:4px;padding-left:44px;font-size:12px;color:var(--hm-text-tertiary)"><em>' + esc(item.evidence) + '</em></div>';
      html += '</div>';
    });
    html += '</div>';
    return ui.renderSection({ vi: 'Checklist đánh giá', en: 'Audit Checklist' }, html,
      { headerActions: '<button class="eqms-btn secondary sm" data-action="add-checklist-item">' + T({ vi: '+ Thêm mục', en: '+ Add Item' }) + '</button>' }
    );
  }

  // --- Audit Findings ---
  function renderAuditFindings() {
    var findings = state.tabData.findings || state.detail.findings || [];
    var cols = [
      { key: 'finding_id', label: { vi: 'Mã', en: 'ID' }, type: 'id' },
      { key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'truncate' },
      { key: 'severity', label: { vi: 'Mức độ', en: 'Severity' }, type: 'badge' },
      { key: 'clause', label: { vi: 'Điều khoản', en: 'Clause' } },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'scar_id', label: { vi: 'SCAR', en: 'SCAR' }, render: function(v) {
        return v ? '<a class="eqms-link" data-action="open-scar" data-id="' + esc(v) + '">' + esc(v) + '</a>' : '\u2014';
      }}
    ];
    return ui.renderSection({ vi: 'Phát hiện', en: 'Findings' },
      ui.renderDataGrid(cols, findings, { selectable: false }),
      { headerActions: '<button class="eqms-btn primary sm" data-action="record-finding">' + T({ vi: '+ Ghi phát hiện', en: '+ Record Finding' }) + '</button>' +
        '<button class="eqms-btn secondary sm" data-action="generate-scar">' + T({ vi: 'Tạo SCAR', en: 'Generate SCAR' }) + '</button>'
      }
    );
  }

  // --- Audit Report ---
  function renderAuditReport() {
    var report = state.tabData.report || state.detail.report || {};
    var html = '';
    html += ui.renderFieldGrid([
      { label: { vi: 'Tiêu đề báo cáo', en: 'Report Title' }, value: report.title || state.detail.title || '\u2014' },
      { label: { vi: 'Trạng thái', en: 'Status' }, value: report.status || state.detail.status, badge: true },
      { label: { vi: 'Ngày phát hành', en: 'Issued Date' }, value: fmtDate(report.issued_date) },
      { label: { vi: 'Phân phối', en: 'Distribution' }, value: Array.isArray(report.distribution) ? report.distribution.join(', ') : (report.distribution || '\u2014') }
    ]);
    if (report.summary || report.executive_summary) {
      html += '<div style="margin-top:16px;padding:16px;background:var(--hm-bg-secondary,#f8fafc);border-radius:8px;font-size:14px;line-height:1.6">';
      html += esc(report.summary || report.executive_summary);
      html += '</div>';
    }
    if (report.conclusion) {
      html += '<div style="margin-top:12px;padding:12px 16px;border-left:3px solid var(--hm-primary,#3b82f6);font-size:14px">';
      html += '<strong>' + T({ vi: 'Kết luận: ', en: 'Conclusion: ' }) + '</strong>' + esc(report.conclusion);
      html += '</div>';
    }
    return ui.renderSection({ vi: 'Báo cáo đánh giá', en: 'Audit Report' }, html);
  }

  // --- Audit Follow-up ---
  function renderAuditFollowup() {
    var items = state.tabData.followup || state.detail.action_items || [];
    var cols = [
      { key: 'action_id', label: { vi: 'Mã', en: 'ID' }, type: 'id' },
      { key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'truncate' },
      { key: 'assigned_to', label: { vi: 'Phụ trách', en: 'Assigned To' } },
      { key: 'due_date', label: { vi: 'Hạn', en: 'Due Date' }, type: 'date' },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'completion_date', label: { vi: 'Ngày hoàn thành', en: 'Completed' }, type: 'date' }
    ];
    return ui.renderSection({ vi: 'Hạng mục theo dõi', en: 'Follow-up Action Items' },
      ui.renderDataGrid(cols, items, { selectable: false }),
      { headerActions: '<button class="eqms-btn secondary sm" data-action="add-action-item">' + T({ vi: '+ Thêm', en: '+ Add' }) + '</button>' }
    );
  }

  // --- Audit Related Records + Audit Trail ---
  function renderAuditRelated() {
    var related = state.tabData.related || state.detail.relationships || [];
    var auditTrail = state.tabData.audit_trail || state.detail.audit_trail || [];
    var html = '';
    html += ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(related)
    );
    html += ui.renderSection({ vi: 'Nhật ký thay đổi', en: 'Audit Trail' },
      ui.renderAuditTrail(auditTrail)
    );
    return html;
  }

  // --- Audit Signatures + Files + Comments ---
  function renderAuditEvidence() {
    var sigs = state.detail.signatures || [];
    var attachments = state.tabData.attachments || state.detail.attachments || [];
    var comments = state.tabData.comments || state.detail.comments || [];
    var html = '';
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      ui.renderSignaturePanel(sigs, [
        { vi: 'Đánh giá viên trưởng', en: 'Lead Auditor' },
        { vi: 'Đại diện NCC', en: 'Supplier Representative' },
        { vi: 'QA Manager', en: 'QA Manager' }
      ])
    );
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(attachments)
    );
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(comments)
    );
    return html;
  }

  // =========================================================================
  // SCREEN 3: SCAR QUEUE
  // =========================================================================
  function renderScarQueue() {
    var html = '';
    var m = state.metrics || {};

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng SCAR', en: 'Total SCARs' },    value: fmt(m.total_scars || 0) },
      { label: { vi: 'Mở', en: 'Open' },                  value: fmt(m.open_scars || 0), accent: 'warning' },
      { label: { vi: 'Quá hạn', en: 'Overdue' },          value: fmt(m.overdue_scars || 0), accent: 'danger' },
      { label: { vi: 'TB ngày đóng', en: 'Avg Days to Close' }, value: m.avg_days_to_close != null ? Math.round(m.avg_days_to_close) : '\u2014' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-scar">' + T({ vi: '+ SCAR mới', en: '+ New SCAR' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.scarFilters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm SCAR...', en: 'Search SCARs...' }, width: '200px' },
        { key: 'supplier', type: 'text', placeholder: { vi: 'NCC...', en: 'Supplier...' }, width: '160px' },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: SCAR_STATUSES },
        { key: 'severity', type: 'select', label: { vi: 'Mức độ', en: 'Severity' }, options: SEVERITY_LEVELS },
        { key: 'due_from', type: 'date', label: { vi: 'Hạn từ', en: 'Due From' } },
        { key: 'due_to', type: 'date', label: { vi: 'Hạn đến', en: 'Due To' } }
      ]
    });

    if (state.loading) { html += ui.renderLoadingState({ vi: 'Đang tải danh sách SCAR...', en: 'Loading SCARs...' }); return html; }
    if (state.error) { html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-scar-list'); return html; }

    // Grid
    var columns = [
      { key: 'scar_id', label: { vi: 'Mã SCAR', en: 'SCAR ID' }, type: 'id', sortable: true },
      { key: 'supplier_name', label: { vi: 'NCC', en: 'Supplier' }, type: 'truncate', sortable: true },
      { key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate', sortable: true },
      { key: 'severity', label: { vi: 'Mức độ', en: 'Severity' }, type: 'badge', sortable: true },
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: true },
      { key: 'issued_date', label: { vi: 'Ngày phát hành', en: 'Issued' }, type: 'date', sortable: true },
      { key: 'due_date', label: { vi: 'Hạn', en: 'Due Date' }, type: 'date', sortable: true },
      { key: 'days_open', label: { vi: 'Ngày mở', en: 'Days Open' }, sortable: true, render: function(v) { return daysOpenBadge(v); } }
    ];

    html += ui.renderDataGrid(columns, state.scarList || [], {
      selectable: true,
      sortKey: state.scarSort.key,
      sortDir: state.scarSort.dir
    });

    html += ui.renderPagination({ total: state.scarTotal, offset: (state.scarPage - 1) * state.limit, limit: state.limit });

    return html;
  }

  // =========================================================================
  // SCREEN 4: SCAR DETAIL
  // =========================================================================
  function renderScarDetail() {
    var d = state.scarDetail;
    if (!d) return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : '';
    var html = '';

    // Actions based on state
    var actions = [];
    switch (d.status) {
      case 'issued':
        actions.push({ action: 'scar-assign', label: { vi: 'Gán', en: 'Assign' }, style: 'primary' });
        break;
      case 'acknowledged':
        actions.push({ action: 'scar-submit-response', label: { vi: 'Gửi phản hồi', en: 'Submit Response' }, style: 'primary' });
        break;
      case 'root_cause_submitted':
      case 'corrective_action_submitted':
        actions.push({ action: 'scar-verify-effectiveness', label: { vi: 'Xác minh hiệu quả', en: 'Verify Effectiveness' }, style: 'primary' });
        break;
      case 'verification':
        actions.push({ action: 'scar-close', label: { vi: 'Đóng SCAR', en: 'Close SCAR' }, style: 'primary' });
        break;
    }
    actions.push({ action: 'edit-scar', label: { vi: 'Chỉnh sửa', en: 'Edit' }, style: 'secondary' });

    html += ui.renderIdentityHeader(d, {
      actions: actions,
      extraMeta: [
        { label: { vi: 'NCC', en: 'Supplier' }, value: d.supplier_name || d.supplier },
        { label: { vi: 'Mức độ', en: 'Severity' }, value: d.severity },
        { label: { vi: 'Hạn', en: 'Due Date' }, value: fmtDate(d.due_date) }
      ]
    });

    // Workflow timeline
    html += ui.renderStateTimeline(SCAR_STATES, d.status);

    // Tabs
    html += ui.renderTabs(SCAR_DETAIL_TABS, state.scarTab);
    html += '<div class="eqms-tab-content">';
    html += renderScarTabContent(state.scarTab);
    html += '</div>';

    return html;
  }

  function renderScarTabContent(tab) {
    var d = state.scarDetail;
    if (!d) return '';
    switch (tab) {
      case 'summary':       return renderScarSummary(d);
      case 'response':      return renderScarResponse(d);
      case 'verification':  return renderScarVerification(d);
      case 'effectiveness': return renderScarEffectiveness(d);
      case 'related':       return renderScarRelated();
      case 'evidence':      return renderScarEvidence();
      default:              return '';
    }
  }

  // --- SCAR Summary ---
  function renderScarSummary(d) {
    return ui.renderSection({ vi: 'Thông tin SCAR', en: 'SCAR Information' }, ui.renderFieldGrid([
      { label: { vi: 'Mã SCAR', en: 'SCAR ID' },         value: d.scar_id, mono: true },
      { label: { vi: 'NCC', en: 'Supplier' },             value: d.supplier_name || d.supplier },
      { label: { vi: 'Tiêu đề', en: 'Title' },            value: d.title },
      { label: { vi: 'Mức độ', en: 'Severity' },          value: d.severity, badge: true },
      { label: { vi: 'Mô tả', en: 'Description' },        value: d.description },
      { label: { vi: 'Đánh giá nguồn', en: 'Source Audit' }, value: d.source_audit },
      { label: { vi: 'Phát hành bởi', en: 'Issued By' },  value: d.issued_by },
      { label: { vi: 'Ngày phát hành', en: 'Issued Date' }, value: fmtDate(d.issued_date) },
      { label: { vi: 'Hạn', en: 'Due Date' },             value: fmtDate(d.due_date) }
    ]));
  }

  // --- SCAR Supplier Response ---
  function renderScarResponse(d) {
    var resp = state.scarTabData.response || d.response || {};
    var html = '';

    html += ui.renderSection({ vi: 'Phân tích nguyên nhân gốc', en: 'Root Cause Analysis' },
      resp.root_cause
        ? '<div style="padding:12px;background:var(--hm-bg-secondary,#f8fafc);border-radius:8px;font-size:14px;line-height:1.6">' + esc(resp.root_cause) + '</div>'
        : ui.renderEmptyState({ icon: '\uD83D\uDD0D', title: { vi: 'Chưa nộp phân tích nguyên nhân', en: 'Root cause not yet submitted' } })
    );

    html += ui.renderSection({ vi: 'Hành động khắc phục đề xuất', en: 'Proposed Corrective Actions' },
      resp.corrective_actions
        ? '<div style="padding:12px;background:var(--hm-bg-secondary,#f8fafc);border-radius:8px;font-size:14px;line-height:1.6">' + esc(typeof resp.corrective_actions === 'string' ? resp.corrective_actions : JSON.stringify(resp.corrective_actions)) + '</div>'
        : ui.renderEmptyState({ icon: '\uD83D\uDD27', title: { vi: 'Chưa có hành động khắc phục', en: 'No corrective actions yet' } })
    );

    html += ui.renderSection({ vi: 'Hành động phòng ngừa', en: 'Preventive Actions' },
      resp.preventive_actions
        ? '<div style="padding:12px;background:var(--hm-bg-secondary,#f8fafc);border-radius:8px;font-size:14px;line-height:1.6">' + esc(typeof resp.preventive_actions === 'string' ? resp.preventive_actions : JSON.stringify(resp.preventive_actions)) + '</div>'
        : ui.renderEmptyState({ icon: '\uD83D\uDEE1\uFE0F', title: { vi: 'Chưa có hành động phòng ngừa', en: 'No preventive actions yet' } })
    );

    if (resp.timeline) {
      html += ui.renderSection({ vi: 'Thời gian biểu', en: 'Timeline' },
        '<div style="padding:12px;font-size:14px">' + esc(typeof resp.timeline === 'string' ? resp.timeline : JSON.stringify(resp.timeline)) + '</div>'
      );
    }

    return html;
  }

  // --- SCAR Verification ---
  function renderScarVerification(d) {
    var v = state.scarTabData.verification || d.verification || {};
    return ui.renderSection({ vi: 'Xác minh hiệu quả', en: 'Effectiveness Verification' }, ui.renderFieldGrid([
      { label: { vi: 'Kết quả xác minh', en: 'Verification Result' }, value: v.result, badge: true },
      { label: { vi: 'Người xác minh', en: 'Verifier' },              value: v.verifier },
      { label: { vi: 'Ngày xác minh', en: 'Verification Date' },      value: fmtDate(v.date || v.verification_date) },
      { label: { vi: 'Bằng chứng', en: 'Evidence' },                  value: v.evidence },
      { label: { vi: 'Nhận xét', en: 'Comments' },                   value: v.comments }
    ]));
  }

  // --- SCAR Effectiveness ---
  function renderScarEffectiveness(d) {
    var eff = state.scarTabData.effectiveness || d.effectiveness || {};
    var html = '';
    html += ui.renderSection({ vi: 'Theo dõi hiệu quả dài hạn', en: 'Long-term Effectiveness Tracking' }, ui.renderFieldGrid([
      { label: { vi: 'Hiệu quả dài hạn', en: 'Long-term Effective' }, value: eff.long_term_effective != null ? (eff.long_term_effective ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' })) : '\u2014' },
      { label: { vi: 'Kiểm tra tái phát', en: 'Repeat Occurrence Check' }, value: eff.repeat_check, badge: true },
      { label: { vi: 'Số lần tái phát', en: 'Repeat Count' }, value: eff.repeat_count != null ? String(eff.repeat_count) : '\u2014' },
      { label: { vi: 'Ngày xem xét', en: 'Review Date' },    value: fmtDate(eff.review_date) },
      { label: { vi: 'Ghi chú', en: 'Notes' },               value: eff.notes }
    ]));

    // Repeat occurrence tracking table
    var occurrences = eff.occurrences || [];
    if (occurrences.length) {
      var cols = [
        { key: 'date', label: { vi: 'Ngày', en: 'Date' }, type: 'date' },
        { key: 'type', label: { vi: 'Loại', en: 'Type' } },
        { key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'truncate' },
        { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
      ];
      html += ui.renderSection({ vi: 'Lịch sử tái phát', en: 'Recurrence History' },
        ui.renderDataGrid(cols, occurrences, { selectable: false })
      );
    }

    return html;
  }

  // --- SCAR Related Records + Audit Trail ---
  function renderScarRelated() {
    var related = state.scarTabData.related || state.scarDetail.relationships || [];
    var auditTrail = state.scarTabData.audit_trail || state.scarDetail.audit_trail || [];
    var html = '';
    html += ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(related)
    );
    html += ui.renderSection({ vi: 'Nhật ký thay đổi', en: 'Audit Trail' },
      ui.renderAuditTrail(auditTrail)
    );
    return html;
  }

  // --- SCAR Signatures + Files + Comments ---
  function renderScarEvidence() {
    var d = state.scarDetail;
    var sigs = d.signatures || [];
    var attachments = state.scarTabData.attachments || d.attachments || [];
    var comments = state.scarTabData.comments || d.comments || [];
    var html = '';
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      ui.renderSignaturePanel(sigs, [
        { vi: 'Người phát hành', en: 'Issuer' },
        { vi: 'Đại diện NCC', en: 'Supplier Representative' },
        { vi: 'Người xác minh', en: 'Verifier' },
        { vi: 'QA Manager', en: 'QA Manager' }
      ])
    );
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(attachments)
    );
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(comments)
    );
    return html;
  }

  // =========================================================================
  // CREATE AUDIT WIZARD
  // =========================================================================
  function renderCreateAudit() {
    var steps = [
      { label: { vi: 'NCC & Loại', en: 'Supplier & Type' } },
      { label: { vi: 'Phạm vi & Đội', en: 'Scope & Team' } },
      { label: { vi: 'Lịch trình', en: 'Schedule' } }
    ];
    var step = state.wizardStep || 0;
    var body = '';

    if (step === 0) {
      body += ui.renderFormField({ key: 'supplier', label: { vi: 'NCC', en: 'Supplier' }, required: true, value: (state.formData || {}).supplier });
      body += ui.renderFormField({ key: 'audit_type', label: { vi: 'Loại đánh giá', en: 'Audit Type' }, type: 'select', options: AUDIT_TYPES, required: true, value: (state.formData || {}).audit_type });
      body += ui.renderFormField({ key: 'standard', label: { vi: 'Tiêu chuẩn', en: 'Standard' }, placeholder: { vi: 'ISO 9001, AS9100...', en: 'ISO 9001, AS9100...' }, value: (state.formData || {}).standard });
    } else if (step === 1) {
      body += ui.renderFormField({ key: 'scope', label: { vi: 'Phạm vi', en: 'Scope' }, type: 'textarea', required: true, value: (state.formData || {}).scope });
      body += ui.renderFormField({ key: 'lead_auditor', label: { vi: 'Đánh giá viên trưởng', en: 'Lead Auditor' }, required: true, value: (state.formData || {}).lead_auditor });
      body += ui.renderFormField({ key: 'team', label: { vi: 'Đội đánh giá (cách dấu phẩy)', en: 'Audit Team (comma-separated)' }, value: (state.formData || {}).team });
    } else {
      body += ui.renderFormField({ key: 'planned_date', label: { vi: 'Ngày kế hoạch', en: 'Planned Date' }, type: 'date', required: true, value: (state.formData || {}).planned_date });
      body += ui.renderFormField({ key: 'duration_days', label: { vi: 'Thời lượng (ngày)', en: 'Duration (days)' }, type: 'number', value: (state.formData || {}).duration_days });
    }

    return ui.renderWizardShell(steps, step, body, { saveDraft: true });
  }

  // =========================================================================
  // CREATE SCAR WIZARD
  // =========================================================================
  function renderCreateScar() {
    var steps = [
      { label: { vi: 'NCC & Vấn đề', en: 'Supplier & Issue' } },
      { label: { vi: 'Chi tiết', en: 'Details' } }
    ];
    var step = state.wizardStep || 0;
    var body = '';

    if (step === 0) {
      body += ui.renderFormField({ key: 'supplier', label: { vi: 'NCC', en: 'Supplier' }, required: true, value: (state.formData || {}).supplier });
      body += ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, required: true, value: (state.formData || {}).title });
      body += ui.renderFormField({ key: 'severity', label: { vi: 'Mức độ', en: 'Severity' }, type: 'select', options: SEVERITY_LEVELS, required: true, value: (state.formData || {}).severity });
    } else {
      body += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả vấn đề', en: 'Problem Description' }, type: 'textarea', required: true, value: (state.formData || {}).description });
      body += ui.renderFormField({ key: 'source_audit', label: { vi: 'Mã đánh giá nguồn', en: 'Source Audit ID' }, value: (state.formData || {}).source_audit });
      body += ui.renderFormField({ key: 'due_date', label: { vi: 'Hạn', en: 'Due Date' }, type: 'date', required: true, value: (state.formData || {}).due_date });
    }

    return ui.renderWizardShell(steps, step, body, { saveDraft: true });
  }

  // =========================================================================
  // MAIN PAINT
  // =========================================================================
  function paint() {
    if (!_container) return;
    var html = '';

    // Top-level nav (Audit Queue / SCAR Queue) — only show on queue screens
    if (state.screen === 'audit-queue' || state.screen === 'scar-queue') {
      html += renderTopNav();
    }

    switch (state.screen) {
      case 'audit-queue':   html += renderAuditQueue();  break;
      case 'audit-detail':  html += renderAuditDetail(); break;
      case 'scar-queue':    html += renderScarQueue();   break;
      case 'scar-detail':   html += renderScarDetail();  break;
      case 'create-audit':  html += renderCreateAudit(); break;
      case 'create-scar':   html += renderCreateScar();  break;
      default:              html += renderAuditQueue();   break;
    }

    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function handler(e) {
      _container.removeEventListener('click', handler);

      // Row click -> detail
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input[type="checkbox"]')) {
        var id = row.getAttribute('data-id');
        if (id) {
          if (state.screen === 'audit-queue') {
            state.screen = 'audit-detail';
            loadAuditDetail(id);
          } else if (state.screen === 'scar-queue') {
            state.screen = 'scar-detail';
            loadScarDetail(id);
          }
          return;
        }
      }

      // Tab navigation (top nav)
      var topTab = e.target.closest('[data-tab]');
      if (topTab) {
        var tabId = topTab.getAttribute('data-tab');
        // Top-level queue tabs
        if (tabId === 'audit-queue' && (state.screen === 'scar-queue' || state.screen === 'audit-queue')) {
          state.screen = 'audit-queue';
          loadAuditList();
          return;
        }
        if (tabId === 'scar-queue' && (state.screen === 'audit-queue' || state.screen === 'scar-queue')) {
          state.screen = 'scar-queue';
          loadScarList();
          return;
        }
        // Audit detail tabs
        if (state.screen === 'audit-detail' && AUDIT_DETAIL_TABS.some(function(t) { return t.id === tabId; })) {
          state.activeTab = tabId;
          loadAuditTabData(tabId);
          paint();
          return;
        }
        // SCAR detail tabs
        if (state.screen === 'scar-detail' && SCAR_DETAIL_TABS.some(function(t) { return t.id === tabId; })) {
          state.scarTab = tabId;
          loadScarTabData(tabId);
          paint();
          return;
        }
      }

      // Action buttons
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        // Filters
        case 'apply-filters':
          collectFilters();
          if (state.screen === 'audit-queue') { state.page = 1; loadAuditList(); }
          else if (state.screen === 'scar-queue') { state.scarPage = 1; loadScarList(); }
          break;
        case 'reset-filters':
          if (state.screen === 'audit-queue') { state.filters = {}; state.page = 1; loadAuditList(); }
          else if (state.screen === 'scar-queue') { state.scarFilters = {}; state.scarPage = 1; loadScarList(); }
          break;

        // Retry
        case 'retry-audit-list': loadAuditList(); break;
        case 'retry-scar-list':  loadScarList(); break;

        // Create
        case 'create-audit':
          state.screen = 'create-audit';
          state.formData = {};
          state.wizardStep = 0;
          paint();
          break;
        case 'create-scar':
          state.screen = 'create-scar';
          state.formData = {};
          state.wizardStep = 0;
          paint();
          break;

        // Audit workflow actions
        case 'schedule':
        case 'start':
        case 'record-finding':
        case 'issue-report':
        case 'close':
          if (state.detail) executeAuditAction(action, state.detail.id || state.detail.audit_id);
          break;

        // SCAR workflow actions
        case 'scar-assign':
          if (state.scarDetail) executeScarAction('assign', state.scarDetail.id || state.scarDetail.scar_id);
          break;
        case 'scar-submit-response':
          if (state.scarDetail) executeScarAction('submit-response', state.scarDetail.id || state.scarDetail.scar_id);
          break;
        case 'scar-verify-effectiveness':
          if (state.scarDetail) executeScarAction('verify-effectiveness', state.scarDetail.id || state.scarDetail.scar_id);
          break;
        case 'scar-close':
          if (state.scarDetail) executeScarAction('close', state.scarDetail.id || state.scarDetail.scar_id);
          break;

        // Open linked SCAR from findings
        case 'open-scar':
          var scarId = actionEl.getAttribute('data-id');
          if (scarId) { state.screen = 'scar-detail'; loadScarDetail(scarId); }
          break;

        // Generate SCAR from finding
        case 'generate-scar':
          state.screen = 'create-scar';
          state.formData = { source_audit: state.detail ? (state.detail.audit_id || '') : '' };
          state.wizardStep = 0;
          paint();
          break;

        // Export
        case 'export':
          var format = actionEl.getAttribute('data-format');
          var exportAction = (state.screen === 'scar-queue' || state.screen === 'scar-detail')
            ? 'eqms_scars_export' : 'eqms_supplier_audits_export';
          apiCall(exportAction, { format: format, filters: state.screen.indexOf('scar') >= 0 ? state.scarFilters : state.filters });
          break;

        // Pagination
        case 'page':
          var pg = parseInt(actionEl.getAttribute('data-page'), 10);
          if (pg) {
            if (state.screen === 'audit-queue' && pg !== state.page) { state.page = pg; loadAuditList(); }
            if (state.screen === 'scar-queue' && pg !== state.scarPage) { state.scarPage = pg; loadScarList(); }
          }
          break;

        // Wizard
        case 'wizard-next':
          collectFormData();
          state.wizardStep = Math.min((state.wizardStep || 0) + 1, state.screen === 'create-scar' ? 1 : 2);
          paint();
          break;
        case 'wizard-back':
          collectFormData();
          state.wizardStep = Math.max((state.wizardStep || 0) - 1, 0);
          paint();
          break;
        case 'wizard-submit':
          collectFormData();
          if (state.screen === 'create-audit') submitCreateAudit(false);
          else submitCreateScar(false);
          break;
        case 'wizard-save-draft':
          collectFormData();
          if (state.screen === 'create-audit') submitCreateAudit(true);
          else submitCreateScar(true);
          break;

        // Comments
        case 'add-comment':
          submitComment();
          break;
      }
    });

    // Sort click
    _container.addEventListener('click', function sortHandler(e) {
      var th = e.target.closest('th[data-sort]');
      if (!th) return;
      var key = th.getAttribute('data-sort');
      if (state.screen === 'audit-queue') {
        if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else { state.sort.key = key; state.sort.dir = 'asc'; }
        state.page = 1;
        loadAuditList();
      } else if (state.screen === 'scar-queue') {
        if (state.scarSort.key === key) state.scarSort.dir = state.scarSort.dir === 'asc' ? 'desc' : 'asc';
        else { state.scarSort.key = key; state.scarSort.dir = 'asc'; }
        state.scarPage = 1;
        loadScarList();
      }
    });
  }

  function collectFilters() {
    if (!_container) return;
    var target = state.screen === 'scar-queue' ? state.scarFilters : state.filters;
    _container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) target[key] = val;
      else delete target[key];
    });
  }

  function collectFormData() {
    if (!_container) return;
    state.formData = state.formData || {};
    _container.querySelectorAll('[data-field]').forEach(function(el) {
      state.formData[el.getAttribute('data-field')] = el.value;
    });
  }

  function submitCreateAudit(draft) {
    var payload = Object.assign({}, state.formData, { status: draft ? 'draft' : 'planned' });
    apiCall('eqms_supplier_audits_create', payload).then(function(res) {
      if (res.success !== false) {
        state.screen = 'audit-queue';
        loadAuditList();
      }
    }).catch(function() {});
  }

  function submitCreateScar(draft) {
    var payload = Object.assign({}, state.formData, { status: draft ? 'draft' : 'issued' });
    apiCall('eqms_scars_create', payload).then(function(res) {
      if (res.success !== false) {
        state.screen = 'scar-queue';
        loadScarList();
      }
    }).catch(function() {});
  }

  function submitComment() {
    if (!_container) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    var isAudit = state.screen === 'audit-detail';
    var detail = isAudit ? state.detail : state.scarDetail;
    if (!detail) return;
    var commentAction = isAudit ? 'eqms_supplier_audits_comments' : 'eqms_scars_comments';
    var commentId = isAudit
      ? (detail.supplier_audit_id || detail.id || detail.audit_id)
      : (detail.scar_id || detail.id);
    apiCall(commentAction, {
      id: commentId,
      action: 'add',
      text: textarea.value.trim()
    }).then(function(res) {
      if (res.success !== false) {
        if (isAudit) { state.tabData.comments = null; loadAuditTabData('evidence'); }
        else { state.scarTabData.comments = null; loadScarTabData('evidence'); }
        paint();
      }
    }).catch(function() {});
  }

  // =========================================================================
  // ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      // Try to determine if it is a SCAR or audit by prefix convention
      if (String(context.recordId).toUpperCase().indexOf('SCAR') === 0) {
        state.screen = 'scar-detail';
        loadScarDetail(context.recordId);
      } else {
        state.screen = 'audit-detail';
        loadAuditDetail(context.recordId);
      }
    } else {
      state.screen = 'audit-queue';
      loadAuditList();
      loadAuditMetrics();
    }
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['supplier-audits'] = { render: render, meta: MOD };

})();

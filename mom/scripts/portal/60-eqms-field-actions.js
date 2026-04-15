/**
 * EQMS Field Actions / Recall / Product Surveillance — Exception Hub + Command Center
 * HESEM MOM Portal · 60-eqms-field-actions.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: field-actions
 * Archetype: exception-hub
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Queue | Workspace (8 tabs) | Create (wizard) | Analytics
 * Workflow: intake → evaluation → planning → execution → monitoring → closed
 * Actions: evaluate, plan, launch, notify-customers, record-effectiveness, close
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
    id:        'field-actions',
    version:   '1.0.0',
    archetype: 'exception-hub',
    endpoints: [
      'eqms_field_actions_query', 'eqms_field_actions_detail',
      'eqms_field_actions_create', 'eqms_field_actions_update',
      'eqms_field_actions_metrics', 'eqms_field_actions_audit',
      'eqms_field_actions_signatures', 'eqms_field_actions_export'
    ],
    workflow: ['intake', 'evaluation', 'planning', 'execution', 'monitoring', 'closed']
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var ACTION_TYPES = [
    { value: 'voluntary_recall',  label: { vi: 'Thu hồi tự nguyện',         en: 'Voluntary Recall' } },
    { value: 'mandatory_recall',  label: { vi: 'Thu hồi bắt buộc',         en: 'Mandatory Recall' } },
    { value: 'field_correction',  label: { vi: 'Sửa chữa tại hiện trường', en: 'Field Correction' } },
    { value: 'safety_alert',      label: { vi: 'Cảnh báo an toàn',         en: 'Safety Alert' } },
    { value: 'market_withdrawal', label: { vi: 'Rút khỏi thị trường',      en: 'Market Withdrawal' } }
  ];

  var STATUS_OPTIONS = MOD.workflow.map(function(s) {
    var labels = {
      intake:     { vi: 'Tiếp nhận',        en: 'Intake' },
      evaluation: { vi: 'Đánh giá',         en: 'Evaluation' },
      planning:   { vi: 'Lập kế hoạch',     en: 'Planning' },
      execution:  { vi: 'Thực hiện',        en: 'Execution' },
      monitoring: { vi: 'Giám sát',         en: 'Monitoring' },
      closed:     { vi: 'Đóng',             en: 'Closed' }
    };
    return { value: s, label: labels[s] || { vi: s, en: s } };
  });

  var URGENCY_OPTIONS = [
    { value: 'routine',   label: { vi: 'Thường xuyên', en: 'Routine' } },
    { value: 'urgent',    label: { vi: 'Khẩn cấp',    en: 'Urgent' } },
    { value: 'emergency', label: { vi: 'Khẩn cấp',    en: 'Emergency' } }
  ];

  var HAZARD_CLASS_OPTIONS = [
    { value: 'Class I',   label: { vi: 'Loại I — Nghiêm trọng',   en: 'Class I — Serious' } },
    { value: 'Class II',  label: { vi: 'Loại II — Trung bình',    en: 'Class II — Moderate' } },
    { value: 'Class III', label: { vi: 'Loại III — Nhẹ',           en: 'Class III — Minor' } }
  ];

  var NOTIFICATION_METHODS = [
    { value: 'direct_contact',  label: { vi: 'Liên hệ trực tiếp',   en: 'Direct Contact' } },
    { value: 'public_notice',   label: { vi: 'Thông báo công khai', en: 'Public Notice' } },
    { value: 'press_release',   label: { vi: 'Thông cáo báo chí',  en: 'Press Release' } }
  ];

  var SCREENS = { QUEUE: 'queue', WORKSPACE: 'workspace', CREATE: 'create', ANALYTICS: 'analytics' };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.QUEUE,
    // Queue
    filters: {},
    records: [],
    pagination: { offset: 0, limit: 25, total: 0 },
    sortKey: 'created_at',
    sortDir: 'desc',
    loading: false,
    error: null,
    // Workspace
    activeTab: 'summary',
    record: null,
    recordId: null,
    evaluation: null,
    plan: null,
    notifications: [],
    effectiveness: null,
    impactedProducts: [],
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
      state.screen = SCREENS.QUEUE;
      loadQueue();
    }

    paint();
  }

  function paint() {
    if (!_container) return;
    var html = '';
    switch (state.screen) {
      case SCREENS.QUEUE:      html = renderQueue();      break;
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
  function loadQueue() {
    state.loading = true;
    state.error = null;
    paint();

    var payload = Object.assign({}, state.filters, {
      offset: state.pagination.offset,
      limit: state.pagination.limit,
      sort_key: state.sortKey,
      sort_dir: state.sortDir
    });

    apiCall('eqms_field_actions_query', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.records = res.data || [];
        state.pagination.total = res.total || res.data.length || 0;
      } else {
        state.error = res.message || T({ vi: 'Không thể tải hành động thực địa', en: 'Failed to load field actions' });
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || T({ vi: 'Lỗi mạng', en: 'Network error' });
      paint();
    });
  }

  function loadDetail(id) {
    state.loading = true;
    state.error = null;
    state.recordId = id;
    paint();

    apiCall('eqms_field_actions_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.record = res.data || {};
        state.evaluation = res.data.evaluation || null;
        state.plan = res.data.plan || null;
        state.notifications = res.data.notifications || [];
        state.effectiveness = res.data.effectiveness || null;
        state.impactedProducts = res.data.impacted_products || [];
      } else {
        state.error = res.message || T({ vi: 'Không thể tải hành động thực địa', en: 'Failed to load field action' });
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || T({ vi: 'Lỗi mạng', en: 'Network error' });
      paint();
    });

    loadDetailSidebar(id);
  }

  function loadDetailSidebar(id) {
    apiCall('eqms_field_actions_audit', { id: id }).then(function(res) {
      if (res.success) { state.auditEvents = res.data || []; paint(); }
    });
    apiCall('eqms_field_actions_signatures', { id: id }).then(function(res) {
      if (res.success) { state.signatures = res.data || []; paint(); }
    });
  }

  function loadMetrics() {
    state.loading = true;
    paint();

    apiCall('eqms_field_actions_metrics', {}).then(function(res) {
      state.loading = false;
      if (res.success) { state.metrics = res.data || {}; }
      else { state.error = res.message || T({ vi: 'Không thể tải chỉ số', en: 'Failed to load metrics' }); }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || T({ vi: 'Lỗi mạng', en: 'Network error' });
      paint();
    });
  }

  // =========================================================================
  // SCREEN: QUEUE
  // =========================================================================
  function renderQueue() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải hành động thực địa...', en: 'Loading field actions...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-queue');

    var html = '';

    // KPI row
    var openCount = state.records.filter(function(r) { return r.status !== 'closed'; }).length;
    var emergencyCount = state.records.filter(function(r) { return r.urgency === 'emergency'; }).length;

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng hành động',    en: 'Total Actions' },     value: fmt(state.pagination.total) },
      { label: { vi: 'Đang mở',           en: 'Open' },              value: fmt(openCount), accent: 'warning' },
      { label: { vi: 'Khẩn cấp',          en: 'Emergency' },         value: fmt(emergencyCount), accent: emergencyCount > 0 ? 'danger' : '' },
      { label: { vi: 'Đã đóng',           en: 'Closed' },            value: fmt(countByStatus('closed')), accent: 'success' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="go-create">';
    html += '+ ' + T({ vi: 'Tạo hành động thực địa', en: 'New Field Action' });
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
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm theo mã hoặc sản phẩm...', en: 'Search by ID or product...' }, width: '220px' },
        { key: 'action_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: ACTION_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: STATUS_OPTIONS },
        { key: 'urgency', type: 'select', label: { vi: 'Mức độ khẩn', en: 'Urgency' }, options: URGENCY_OPTIONS },
        { key: 'product', type: 'text', label: { vi: 'Sản phẩm', en: 'Product' }, width: '140px' }
      ]
    });

    // Data grid
    var columns = [
      { key: 'action_id',      label: { vi: 'Mã hành động',    en: 'Action ID' },      type: 'id', sortable: true },
      { key: 'action_type',    label: { vi: 'Loại',            en: 'Type' },            type: 'badge', sortable: true },
      { key: 'product',        label: { vi: 'Sản phẩm',        en: 'Product' },         sortable: true },
      { key: 'affected_lots',  label: { vi: 'Lô bị ảnh hưởng', en: 'Affected Lots' },  type: 'number', sortable: true },
      { key: 'status',         label: { vi: 'Trạng thái',      en: 'Status' },          type: 'badge', sortable: true },
      { key: 'urgency',        label: { vi: 'Khẩn cấp',        en: 'Urgency' },         type: 'priority', sortable: true },
      { key: 'created_at',     label: { vi: 'Ngày tạo',        en: 'Created' },         type: 'date', sortable: true },
      { key: 'progress',       label: { vi: 'Tiến độ (%)',     en: 'Progress (%)' },    sortable: true,
        render: function(v) {
          var pct = v || 0;
          var color = pct >= 100 ? 'var(--hm-accent-success,#22c55e)' : pct >= 50 ? 'var(--hm-accent-warning,#f59e0b)' : 'var(--hm-accent-danger,#ef4444)';
          return '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px"></div></div><span style="font-size:12px;min-width:32px;text-align:right">' + esc(pct + '%') + '</span></div>';
        }
      }
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
  // SCREEN: WORKSPACE
  // =========================================================================
  function renderWorkspace() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải chi tiết...', en: 'Loading details...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-detail');
    if (!state.record) return ui.renderEmptyState({ icon: '\uD83D\uDEA8', title: { vi: 'Không tìm thấy bản ghi', en: 'Record not found' } });

    var rec = state.record;
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-queue" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại hàng đợi', en: 'Back to queue' });
    html += '</button>';

    // Urgency banner for emergency
    if (rec.urgency === 'emergency') {
      html += '<div class="eqms-notice danger" style="margin-bottom:12px;display:flex;align-items:center;gap:8px">';
      html += '<span style="font-size:20px">\uD83D\uDEA8</span>';
      html += '<strong>' + T({ vi: 'KHẨN CẤP — Cần xử lý ngay lập tức', en: 'EMERGENCY — Requires immediate action' }) + '</strong>';
      html += '</div>';
    }

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getWorkspaceActions(rec),
      extraMeta: [
        { label: { vi: 'Loại hành động', en: 'Action Type' }, value: rec.action_type },
        { label: { vi: 'Sản phẩm', en: 'Product' }, value: rec.product },
        { label: { vi: 'Khẩn cấp', en: 'Urgency' }, value: rec.urgency },
        { label: { vi: 'Phân loại nguy hại', en: 'Hazard Class' }, value: rec.health_hazard_classification }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(MOD.workflow, rec.status);

    // Tabs
    var tabs = [
      { id: 'summary',      label: { vi: 'Tóm tắt',                  en: 'Summary' } },
      { id: 'evaluation',   label: { vi: 'Đánh giá',                en: 'Evaluation' } },
      { id: 'planning',     label: { vi: 'Kế hoạch',                en: 'Planning' } },
      { id: 'execution',    label: { vi: 'Thực hiện',               en: 'Execution' }, badge: state.notifications.length || null },
      { id: 'effectiveness', label: { vi: 'Hiệu quả',               en: 'Effectiveness' } },
      { id: 'impacted',     label: { vi: 'Sản phẩm bị ảnh hưởng',   en: 'Impacted Products' }, badge: state.impactedProducts.length || null },
      { id: 'related',      label: { vi: 'Liên kết & Kiểm toán',    en: 'Related & Audit' } },
      { id: 'signatures',   label: { vi: 'Chữ ký & Đính kèm',       en: 'Signatures & Files' } }
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

    if (s === 'intake') {
      actions.push({ action: 'evaluate', label: { vi: 'Bắt đầu đánh giá', en: 'Start Evaluation' }, style: 'primary' });
    }
    if (s === 'evaluation') {
      actions.push({ action: 'plan', label: { vi: 'Lập kế hoạch', en: 'Create Plan' }, style: 'primary' });
    }
    if (s === 'planning') {
      actions.push({ action: 'launch', label: { vi: 'Triển khai', en: 'Launch' }, style: 'primary' });
    }
    if (s === 'execution') {
      actions.push({ action: 'notify-customers', label: { vi: 'Thông báo KH', en: 'Notify Customers' }, style: 'secondary' });
      actions.push({ action: 'record-effectiveness', label: { vi: 'Ghi hiệu quả', en: 'Record Effectiveness' }, style: 'ghost' });
    }
    if (s === 'monitoring') {
      actions.push({ action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'primary' });
    }

    return actions;
  }

  // =========================================================================
  // WORKSPACE TABS
  // =========================================================================
  function renderWorkspaceTab() {
    switch (state.activeTab) {
      case 'summary':        return renderSummaryTab();
      case 'evaluation':     return renderEvaluationTab();
      case 'planning':       return renderPlanningTab();
      case 'execution':      return renderExecutionTab();
      case 'effectiveness':  return renderEffectivenessTab();
      case 'impacted':       return renderImpactedTab();
      case 'related':        return renderRelatedTab();
      case 'signatures':     return renderSignaturesTab();
      default:               return '';
    }
  }

  // --- Summary Tab ---
  function renderSummaryTab() {
    var rec = state.record;
    return ui.renderSection({ vi: 'Thông tin hành động thực địa', en: 'Field Action Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã hành động',           en: 'Action ID' },            value: rec.action_id,                      mono: true },
        { label: { vi: 'Tiêu đề',                en: 'Title' },                value: rec.title },
        { label: { vi: 'Loại hành động',         en: 'Action Type' },          value: rec.action_type,                    badge: true },
        { label: { vi: 'Sản phẩm',               en: 'Product' },              value: rec.product },
        { label: { vi: 'Mô tả',                  en: 'Description' },          value: rec.description },
        { label: { vi: 'Lý do',                  en: 'Reason' },               value: rec.reason },
        { label: { vi: 'Phạm vi',                en: 'Scope' },                value: rec.scope },
        { label: { vi: 'Mức độ khẩn cấp',        en: 'Urgency' },              value: rec.urgency,                        badge: true },
        { label: { vi: 'Phân loại nguy hại',     en: 'Hazard Classification' }, value: rec.health_hazard_classification,  badge: true },
        { label: { vi: 'Yêu cầu thông báo PQ',   en: 'Regulatory Notification' }, value: rec.regulatory_notification_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Khởi tạo bởi',           en: 'Initiated By' },          value: rec.initiated_by },
        { label: { vi: 'Trạng thái',             en: 'Status' },                value: rec.status,                        badge: true }
      ])
    );
  }

  // --- Evaluation Tab ---
  function renderEvaluationTab() {
    var eval_ = state.evaluation;

    if (!eval_) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDD0D',
        title: { vi: 'Chưa có đánh giá', en: 'No evaluation yet' },
        desc: { vi: 'Bắt đầu đánh giá nguy hại sức khỏe và phân loại rủi ro', en: 'Start the health hazard evaluation and risk classification' },
        action: state.record && state.record.status === 'intake' ? { key: 'evaluate', label: { vi: 'Bắt đầu đánh giá', en: 'Start Evaluation' } } : null
      });
    }

    var html = '';

    // Health hazard evaluation
    html += ui.renderSection({ vi: 'Đánh giá nguy hại sức khỏe', en: 'Health Hazard Evaluation' },
      ui.renderFieldGrid([
        { label: { vi: 'Loại nguy hại',          en: 'Hazard Type' },          value: eval_.hazard_type },
        { label: { vi: 'Mức độ nghiêm trọng',    en: 'Severity' },             value: eval_.severity,          badge: true },
        { label: { vi: 'Khả năng xảy ra',        en: 'Probability' },          value: eval_.probability,       badge: true },
        { label: { vi: 'Dân số bị ảnh hưởng',    en: 'Affected Population' },  value: eval_.affected_population },
        { label: { vi: 'Phân loại nguy hại',     en: 'Hazard Classification' }, value: eval_.classification,   badge: true },
        { label: { vi: 'Mô tả đánh giá',         en: 'Evaluation Summary' },    value: eval_.summary }
      ])
    );

    // Risk classification matrix
    html += ui.renderSection({ vi: 'Ma trận phân loại rủi ro', en: 'Risk Classification Matrix' },
      renderRiskMatrix(eval_.severity, eval_.probability)
    );

    // Regulatory assessment
    html += ui.renderSection({ vi: 'Đánh giá pháp quy', en: 'Regulatory Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Cơ quan liên quan',       en: 'Relevant Authorities' }, value: eval_.authorities },
        { label: { vi: 'Yêu cầu báo cáo',         en: 'Reporting Required' },   value: eval_.reporting_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Thời hạn báo cáo',        en: 'Reporting Deadline' },    value: fmtDate(eval_.reporting_deadline) },
        { label: { vi: 'Trạng thái báo cáo',      en: 'Report Status' },         value: eval_.report_status, badge: true }
      ])
    );

    return html;
  }

  function renderRiskMatrix(severity, probability) {
    var levels = ['low', 'medium', 'high', 'critical'];
    var html = '<div style="overflow-x:auto"><table class="eqms-grid" style="max-width:400px">';
    html += '<thead><tr><th></th>';
    levels.forEach(function(l) {
      html += '<th style="text-align:center;text-transform:capitalize">' + esc(l) + '</th>';
    });
    html += '</tr></thead><tbody>';

    levels.forEach(function(sev) {
      html += '<tr><th style="text-transform:capitalize">' + esc(sev) + '</th>';
      levels.forEach(function(prob) {
        var isActive = (slugify(severity || '') === sev && slugify(probability || '') === prob);
        var riskLevel = getRiskLevel(sev, prob);
        var bgColor = riskLevel === 'critical' ? '#fef2f2' : riskLevel === 'high' ? '#fffbeb' : riskLevel === 'medium' ? '#fefce8' : '#f0fdf4';
        var border = isActive ? '3px solid var(--hm-accent-primary,#3b82f6)' : '1px solid var(--hm-border-primary,#e2e8f0)';
        html += '<td style="text-align:center;background:' + bgColor + ';border:' + border + ';font-weight:' + (isActive ? '700' : '400') + '">';
        html += esc(riskLevel);
        html += '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  function getRiskLevel(severity, probability) {
    var s = ['low', 'medium', 'high', 'critical'].indexOf(severity);
    var p = ['low', 'medium', 'high', 'critical'].indexOf(probability);
    var score = (s + 1) * (p + 1);
    if (score >= 12) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  // --- Planning Tab ---
  function renderPlanningTab() {
    var plan = state.plan;

    if (!plan) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCCB',
        title: { vi: 'Chưa có kế hoạch', en: 'No action plan yet' },
        desc: { vi: 'Tạo kế hoạch hành động sau khi hoàn tất đánh giá', en: 'Create an action plan after completing the evaluation' },
        action: state.record && state.record.status === 'evaluation' ? { key: 'plan', label: { vi: 'Lập kế hoạch', en: 'Create Plan' } } : null
      });
    }

    var html = '';

    // Action plan
    html += ui.renderSection({ vi: 'Kế hoạch hành động', en: 'Action Plan' },
      ui.renderFieldGrid([
        { label: { vi: 'Chiến lược',          en: 'Strategy' },            value: plan.strategy },
        { label: { vi: 'Phạm vi thu hồi',     en: 'Recall Scope' },        value: plan.recall_scope },
        { label: { vi: 'Người chịu trách nhiệm', en: 'Responsible Person' }, value: plan.responsible_person },
        { label: { vi: 'Ngày bắt đầu',        en: 'Start Date' },          value: fmtDate(plan.start_date) },
        { label: { vi: 'Ngày kết thúc dự kiến', en: 'Target End Date' },    value: fmtDate(plan.target_end_date) }
      ])
    );

    // Notification strategy
    html += ui.renderSection({ vi: 'Chiến lược thông báo', en: 'Notification Strategy' },
      ui.renderFieldGrid([
        { label: { vi: 'Phương pháp',           en: 'Method' },             value: plan.notification_method,  badge: true },
        { label: { vi: 'Thông điệp chính',       en: 'Key Message' },        value: plan.key_message },
        { label: { vi: 'Nội dung thông báo',     en: 'Notification Content' }, value: plan.notification_content },
        { label: { vi: 'Nhóm mục tiêu',          en: 'Target Audience' },     value: plan.target_audience }
      ])
    );

    // Timeline milestones
    if (plan.milestones && plan.milestones.length > 0) {
      var mColumns = [
        { key: 'milestone',   label: { vi: 'Mốc',         en: 'Milestone' } },
        { key: 'target_date', label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, type: 'date' },
        { key: 'owner',       label: { vi: 'Người phụ trách', en: 'Owner' } },
        { key: 'status',      label: { vi: 'Trạng thái',    en: 'Status' },      type: 'badge' }
      ];

      html += ui.renderSection({ vi: 'Mốc thời gian', en: 'Timeline Milestones' },
        ui.renderDataGrid(mColumns, plan.milestones, { selectable: false })
      );
    }

    return html;
  }

  // --- Execution Tab ---
  function renderExecutionTab() {
    var html = '';

    // Customer notification tracking
    var columns = [
      { key: 'customer',          label: { vi: 'Khách hàng',          en: 'Customer' } },
      { key: 'contact_method',    label: { vi: 'Phương thức liên hệ', en: 'Contact Method' },    type: 'badge' },
      { key: 'notification_date', label: { vi: 'Ngày thông báo',      en: 'Notification Date' },  type: 'date' },
      { key: 'acknowledged',      label: { vi: 'Xác nhận',            en: 'Acknowledged' },
        render: function(v) { return v ? '\u2705' : '\u274C'; }
      },
      { key: 'units_affected',    label: { vi: 'SL bị ảnh hưởng',     en: 'Units Affected' },    type: 'number' },
      { key: 'units_returned',    label: { vi: 'SL đã trả lại',       en: 'Units Returned' },    type: 'number' },
      { key: 'status',            label: { vi: 'Trạng thái',          en: 'Status' },            type: 'badge' }
    ];

    html += ui.renderSection({ vi: 'Theo dõi thông báo khách hàng', en: 'Customer Notification Tracking' },
      ui.renderDataGrid(columns, state.notifications, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="notify-customers">+ ' + T({ vi: 'Thông báo KH', en: 'Notify Customer' }) + '</button>'
      }
    );

    // Progress dashboard
    if (state.notifications.length > 0) {
      var totalCustomers = state.notifications.length;
      var acknowledged = state.notifications.filter(function(n) { return n.acknowledged; }).length;
      var totalAffected = state.notifications.reduce(function(s, n) { return s + (n.units_affected || 0); }, 0);
      var totalReturned = state.notifications.reduce(function(s, n) { return s + (n.units_returned || 0); }, 0);

      html += ui.renderSection({ vi: 'Tổng quan tiến độ', en: 'Progress Dashboard' },
        ui.renderKpiRow([
          { label: { vi: 'Tổng KH thông báo',    en: 'Customers Notified' },  value: totalCustomers },
          { label: { vi: 'Đã xác nhận',           en: 'Acknowledged' },        value: acknowledged + ' / ' + totalCustomers, accent: acknowledged === totalCustomers ? 'success' : 'warning' },
          { label: { vi: 'Đơn vị bị ảnh hưởng',   en: 'Units Affected' },      value: fmt(totalAffected) },
          { label: { vi: 'Đã trả lại',            en: 'Units Returned' },      value: fmt(totalReturned), accent: totalReturned > 0 ? 'success' : '' }
        ])
      );
    }

    return html;
  }

  // --- Effectiveness Tab ---
  function renderEffectivenessTab() {
    var eff = state.effectiveness;

    if (!eff) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDCCA',
        title: { vi: 'Chưa có dữ liệu hiệu quả', en: 'No effectiveness data' },
        desc: { vi: 'Ghi nhận hiệu quả sau khi hoàn tất thực hiện', en: 'Record effectiveness after execution is complete' },
        action: state.record && state.record.status === 'execution' ? { key: 'record-effectiveness', label: { vi: 'Ghi hiệu quả', en: 'Record Effectiveness' } } : null
      });
    }

    var html = '';

    // Completeness metrics
    html += ui.renderSection({ vi: 'Chỉ số hoàn thành', en: 'Completeness Metrics' },
      ui.renderKpiRow([
        { label: { vi: '% Đã thông báo',     en: '% Notified' },     value: (eff.pct_notified || 0) + '%', accent: (eff.pct_notified || 0) >= 90 ? 'success' : 'warning' },
        { label: { vi: '% Đã trả lại',       en: '% Returned' },     value: (eff.pct_returned || 0) + '%', accent: (eff.pct_returned || 0) >= 80 ? 'success' : 'warning' },
        { label: { vi: '% Đã giải quyết',    en: '% Resolved' },     value: (eff.pct_resolved || 0) + '%', accent: (eff.pct_resolved || 0) >= 90 ? 'success' : 'warning' }
      ])
    );

    // Effectiveness evidence
    html += ui.renderSection({ vi: 'Bằng chứng hiệu quả', en: 'Effectiveness Evidence' },
      '<p style="margin:0;line-height:1.6;color:var(--hm-text-secondary,#64748b)">' + esc(eff.evidence || '') + '</p>'
    );

    // Residual risk assessment
    html += ui.renderSection({ vi: 'Đánh giá rủi ro còn lại', en: 'Residual Risk Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Mức rủi ro còn lại',      en: 'Residual Risk Level' },   value: eff.residual_risk_level,    badge: true },
        { label: { vi: 'Mô tả rủi ro còn lại',     en: 'Residual Risk Details' }, value: eff.residual_risk_details },
        { label: { vi: 'Biện pháp kiểm soát',      en: 'Controls in Place' },     value: eff.controls_in_place },
        { label: { vi: 'Người đánh giá',           en: 'Assessed By' },           value: eff.assessed_by },
        { label: { vi: 'Ngày đánh giá',            en: 'Assessment Date' },       value: fmtDate(eff.assessment_date) }
      ])
    );

    return html;
  }

  // --- Impacted Products Tab ---
  function renderImpactedTab() {
    var columns = [
      { key: 'lot_id',      label: { vi: 'Mã lô',          en: 'Lot ID' },       type: 'id' },
      { key: 'product',     label: { vi: 'Sản phẩm',       en: 'Product' } },
      { key: 'quantity',    label: { vi: 'Số lượng',       en: 'Quantity' },     type: 'number' },
      { key: 'ship_date',   label: { vi: 'Ngày giao',      en: 'Ship Date' },    type: 'date' },
      { key: 'customer',    label: { vi: 'Khách hàng',     en: 'Customer' } },
      { key: 'location',    label: { vi: 'Vị trí',         en: 'Location' } },
      { key: 'status',      label: { vi: 'Trạng thái',     en: 'Status' },       type: 'badge' }
    ];

    var statusSummary = {};
    state.impactedProducts.forEach(function(p) {
      statusSummary[p.status] = (statusSummary[p.status] || 0) + 1;
    });

    var html = '';

    // Status summary
    if (state.impactedProducts.length > 0) {
      var kpis = [];
      ['identified', 'notified', 'returned', 'resolved'].forEach(function(s) {
        var labels = {
          identified: { vi: 'Đã xác định', en: 'Identified' },
          notified:   { vi: 'Đã thông báo', en: 'Notified' },
          returned:   { vi: 'Đã trả lại',   en: 'Returned' },
          resolved:   { vi: 'Đã giải quyết', en: 'Resolved' }
        };
        kpis.push({
          label: labels[s] || { vi: s, en: s },
          value: statusSummary[s] || 0,
          accent: s === 'resolved' ? 'success' : s === 'identified' ? 'warning' : ''
        });
      });
      html += ui.renderKpiRow(kpis);
    }

    html += ui.renderSection({ vi: 'Danh sách lô / mẻ / serial bị ảnh hưởng', en: 'Impacted Lot / Batch / Serial List' },
      ui.renderDataGrid(columns, state.impactedProducts, { selectable: false })
    );

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
        { vi: 'Khởi tạo', en: 'Initiated' },
        { vi: 'Đánh giá', en: 'Evaluated' },
        { vi: 'Phê duyệt', en: 'Approved' },
        { vi: 'QA Đóng', en: 'QA Closure' }
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
      { label: { vi: 'Sản phẩm & Phạm vi',   en: 'Product & Scope' } },
      { label: { vi: 'Xem lại & Gửi',        en: 'Review & Submit' } }
    ];

    var bodyHtml = '';
    switch (state.wizardStep) {
      case 0: bodyHtml = renderWizardStep0(); break;
      case 1: bodyHtml = renderWizardStep1(); break;
      case 2: bodyHtml = renderWizardStep2(); break;
    }

    var html = '<button class="eqms-btn ghost sm" data-action="go-queue" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại hàng đợi', en: 'Back to queue' });
    html += '</button>';
    html += ui.renderWizardShell(steps, state.wizardStep, bodyHtml, { saveDraft: true });

    return html;
  }

  function renderWizardStep0() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Loại hành động & Thông tin cơ bản', en: 'Action Type & Basic Information' }) + '</h3>';
    html += ui.renderFormField({ key: 'action_type', label: { vi: 'Loại hành động', en: 'Action Type' }, type: 'select', options: ACTION_TYPES, value: d.action_type, required: true });
    html += ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, type: 'text', value: d.title, required: true, placeholder: { vi: 'Nhập tiêu đề...', en: 'Enter title...' } });
    html += ui.renderFormField({ key: 'urgency', label: { vi: 'Mức độ khẩn cấp', en: 'Urgency' }, type: 'select', options: URGENCY_OPTIONS, value: d.urgency, required: true });
    html += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description, placeholder: { vi: 'Mô tả chi tiết...', en: 'Detailed description...' } });
    html += ui.renderFormField({ key: 'reason', label: { vi: 'Lý do', en: 'Reason' }, type: 'textarea', value: d.reason, required: true, placeholder: { vi: 'Lý do hành động thực địa...', en: 'Reason for field action...' } });
    html += '</div>';
    return html;
  }

  function renderWizardStep1() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Sản phẩm & Phạm vi', en: 'Product & Scope' }) + '</h3>';
    html += ui.renderFormField({ key: 'product', label: { vi: 'Sản phẩm', en: 'Product' }, type: 'text', value: d.product, required: true, placeholder: { vi: 'Tên sản phẩm...', en: 'Product name...' } });
    html += ui.renderFormField({ key: 'scope', label: { vi: 'Phạm vi', en: 'Scope' }, type: 'textarea', value: d.scope, placeholder: { vi: 'Lô, vùng, khách hàng bị ảnh hưởng...', en: 'Affected lots, regions, customers...' } });
    html += ui.renderFormField({ key: 'health_hazard_classification', label: { vi: 'Phân loại nguy hại sức khỏe', en: 'Health Hazard Classification' }, type: 'select', options: HAZARD_CLASS_OPTIONS, value: d.health_hazard_classification });
    html += ui.renderFormField({ key: 'regulatory_notification_required', label: { vi: 'Yêu cầu thông báo pháp quy', en: 'Regulatory Notification Required' }, type: 'select', options: [
      { value: 'yes', label: { vi: 'Có', en: 'Yes' } },
      { value: 'no',  label: { vi: 'Không', en: 'No' } }
    ], value: d.regulatory_notification_required });
    html += '</div>';
    return html;
  }

  function renderWizardStep2() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Xem lại thông tin trước khi gửi', en: 'Review Before Submission' }) + '</h3>';
    html += ui.renderFieldGrid([
      { label: { vi: 'Loại hành động',        en: 'Action Type' },     value: d.action_type,                      badge: true },
      { label: { vi: 'Tiêu đề',               en: 'Title' },           value: d.title },
      { label: { vi: 'Mức độ khẩn cấp',       en: 'Urgency' },         value: d.urgency,                          badge: true },
      { label: { vi: 'Sản phẩm',              en: 'Product' },         value: d.product },
      { label: { vi: 'Phạm vi',               en: 'Scope' },           value: d.scope },
      { label: { vi: 'Phân loại nguy hại',    en: 'Hazard Class' },    value: d.health_hazard_classification,     badge: true },
      { label: { vi: 'Thông báo pháp quy',    en: 'Regulatory Notification' }, value: d.regulatory_notification_required },
      { label: { vi: 'Lý do',                 en: 'Reason' },          value: d.reason }
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

    html += '<button class="eqms-btn ghost sm" data-action="go-queue" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại hàng đợi', en: 'Back to queue' });
    html += '</button>';

    html += '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600">' + T({ vi: 'Phân tích hành động thực địa', en: 'Field Actions Analytics' }) + '</h2>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng hành động',          en: 'Total Actions' },           value: fmt(m.total_actions || 0) },
      { label: { vi: 'Tỉ lệ phản hồi',          en: 'Response Rate' },           value: (m.response_rate || 0) + '%', accent: (m.response_rate || 0) >= 80 ? 'success' : 'warning' },
      { label: { vi: 'TG hoàn thành TB',        en: 'Avg Time-to-Completion' },  value: (m.avg_completion_days || 0) + ' ' + T({ vi: 'ngày', en: 'days' }) },
      { label: { vi: 'Tỉ lệ hiệu quả',          en: 'Effectiveness Rate' },      value: (m.effectiveness_rate || 0) + '%', accent: (m.effectiveness_rate || 0) >= 90 ? 'success' : 'warning' }
    ]);

    // Volume trend
    var volumeTrend = m.volume_trend || [];
    var trendColumns = [
      { key: 'period', label: { vi: 'Giai đoạn', en: 'Period' } },
      { key: 'count',  label: { vi: 'Số lượng',  en: 'Count' },  type: 'number' },
      { key: 'closed', label: { vi: 'Đã đóng',   en: 'Closed' }, type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng khối lượng hành động', en: 'Field Action Volume Trend' },
      ui.renderChartWithTableFallback('fa-volume-chart', null, trendColumns, volumeTrend, { defaultMode: 'table' })
    );
    html += '</div>';

    // By type distribution
    var byType = m.by_type || [];
    var typeColumns = [
      { key: 'type',    label: { vi: 'Loại',    en: 'Type' },    type: 'badge' },
      { key: 'count',   label: { vi: 'Số lượng', en: 'Count' },   type: 'number' },
      { key: 'percent', label: { vi: 'Tỉ lệ',    en: 'Percent' }, render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Phân bổ theo loại', en: 'Distribution by Type' },
      ui.renderChartWithTableFallback('fa-type-chart', null, typeColumns, byType, { defaultMode: 'table' })
    );
    html += '</div>';

    // Time-to-completion trend
    var completionTrend = m.completion_trend || [];
    var completionColumns = [
      { key: 'period',   label: { vi: 'Giai đoạn',     en: 'Period' } },
      { key: 'avg_days', label: { vi: 'TB ngày',       en: 'Avg Days' },     type: 'number' },
      { key: 'count',    label: { vi: 'Hành động',     en: 'Actions' },      type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng thời gian hoàn thành', en: 'Time-to-Completion Trend' },
      ui.renderChartWithTableFallback('fa-completion-chart', null, completionColumns, completionTrend, { defaultMode: 'table' })
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
      if (sortTh && state.screen === SCREENS.QUEUE) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        state.pagination.offset = 0;
        loadQueue();
        return;
      }

      var row = e.target.closest('tr[data-id]');
      if (row && state.screen === SCREENS.QUEUE && !e.target.closest('input[type="checkbox"]')) {
        var id = row.getAttribute('data-id');
        if (id) { state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary'; loadDetail(id); }
        return;
      }

      var pageBtn = e.target.closest('[data-action="page"]');
      if (pageBtn) {
        var page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page > 0) { state.pagination.offset = (page - 1) * state.pagination.limit; loadQueue(); }
        return;
      }

      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'go-queue':
          state.screen = SCREENS.QUEUE; state.record = null; state.recordId = null; loadQueue(); break;
        case 'go-create':
          state.screen = SCREENS.CREATE; state.wizardStep = 0; state.wizardData = {}; paint(); break;
        case 'go-analytics':
          state.screen = SCREENS.ANALYTICS; loadMetrics(); break;
        case 'retry-queue':
          loadQueue(); break;
        case 'retry-detail':
          if (state.recordId) loadDetail(state.recordId); break;
        case 'retry-analytics':
          loadMetrics(); break;
        case 'apply-filters':
          collectFilters(); state.pagination.offset = 0; loadQueue(); break;
        case 'reset-filters':
          state.filters = {}; state.pagination.offset = 0; loadQueue(); break;
        case 'wizard-next':
          collectWizardData(); if (state.wizardStep < 2) { state.wizardStep++; paint(); } break;
        case 'wizard-back':
          if (state.wizardStep > 0) { state.wizardStep--; paint(); } break;
        case 'wizard-save-draft':
          collectWizardData(); saveDraft(); break;
        case 'wizard-submit':
          collectWizardData(); submitAction(); break;
        case 'evaluate':
        case 'plan':
        case 'launch':
        case 'notify-customers':
        case 'record-effectiveness':
        case 'close':
          executeAction(action); break;
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
    apiCall('eqms_field_actions_update', { id: state.record.id, action: action }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function saveDraft() {
    var payload = Object.assign({}, state.wizardData, { status: 'intake' });
    apiCall('eqms_field_actions_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.action_id);
      }
    });
  }

  function submitAction() {
    var payload = Object.assign({}, state.wizardData, { action: 'submit' });
    apiCall('eqms_field_actions_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.action_id);
      }
    });
  }

  function postComment() {
    if (!_container || !state.record) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    apiCall('eqms_field_actions_audit', { id: state.record.id, action: 'add-comment', text: textarea.value.trim() }).then(function(res) {
      if (res.success) { state.comments = res.data || state.comments; textarea.value = ''; paint(); }
    });
  }

  function handleExport(format) {
    var payload = { format: format };
    if (state.screen === SCREENS.WORKSPACE && state.record) { payload.id = state.record.id; }
    else { payload.filters = state.filters; }
    apiCall('eqms_field_actions_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) { window.open(res.data.url, '_blank'); }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['field-actions'] = { render: render, meta: MOD };

})();

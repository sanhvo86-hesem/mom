/**
 * EQMS Customer Satisfaction (CSAT) — IATF 16949 §9.1.2
 * HESEM MOM Portal - 69-eqms-csat.js
 *
 * Archetype: survey-management with trend analytics
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
    id:        'csat',
    version:   '1.0.0',
    archetype: 'survey-management',
    label:     { vi: 'Đánh giá hài lòng khách hàng (CSAT)', en: 'Customer Satisfaction (CSAT)' },
    icon:      '\u2B50'
  };

  var WORKFLOW_STATES = ['draft','dispatched','responded','analyzed','approved','closed'];

  var STATE_LABELS = {
    draft:      { vi: 'Nháp',             en: 'Draft' },
    dispatched: { vi: 'Đã gửi khảo sát', en: 'Dispatched' },
    responded:  { vi: 'Đã nhận phản hồi', en: 'Responded' },
    analyzed:   { vi: 'Đã phân tích',    en: 'Analyzed' },
    approved:   { vi: 'Đã phê duyệt',    en: 'Approved' },
    closed:     { vi: 'Đã đóng',         en: 'Closed' }
  };

  var SURVEY_TYPE_OPTIONS = [
    { value: 'periodic',       label: { vi: 'Định kỳ (Hàng năm/Quý)', en: 'Periodic (Annual/Quarterly)' } },
    { value: 'post_delivery',  label: { vi: 'Sau giao hàng',          en: 'Post-Delivery' } },
    { value: 'post_complaint', label: { vi: 'Sau xử lý khiếu nại',   en: 'Post-Complaint Resolution' } },
    { value: 'project_closeout', label: { vi: 'Kết thúc dự án',      en: 'Project Closeout' } },
    { value: 'ad_hoc',         label: { vi: 'Theo yêu cầu',          en: 'Ad Hoc' } }
  ];

  var SURVEY_METHOD_OPTIONS = [
    { value: 'questionnaire', label: { vi: 'Bảng câu hỏi', en: 'Questionnaire' } },
    { value: 'interview',     label: { vi: 'Phỏng vấn',    en: 'Interview' } },
    { value: 'online',        label: { vi: 'Trực tuyến',   en: 'Online Survey' } },
    { value: 'focus_group',   label: { vi: 'Nhóm thảo luận', en: 'Focus Group' } },
    { value: 'complaint_log', label: { vi: 'Nhật ký khiếu nại', en: 'Complaint Log Analysis' } }
  ];

  var STATE_ACTIONS = {
    draft:      [{ action: 'dispatch', label: { vi: 'Gửi khảo sát', en: 'Dispatch Survey' }, style: 'primary' }],
    dispatched: [{ action: 'record-response', label: { vi: 'Ghi nhận phản hồi', en: 'Record Response' }, style: 'primary' }],
    responded:  [{ action: 'analyze', label: { vi: 'Phân tích', en: 'Analyze' }, style: 'primary' }],
    analyzed:   [{ action: 'approve', label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'success' }],
    approved:   [{ action: 'close',   label: { vi: 'Đóng',      en: 'Close' },   style: 'primary' }]
  };

  var DETAIL_TABS = [
    { id: 'summary',    label: { vi: 'Tóm tắt',    en: 'Summary' } },
    { id: 'results',    label: { vi: 'Kết quả',    en: 'Results' } },
    { id: 'actions',    label: { vi: 'Hành động',  en: 'Actions' } },
    { id: 'audit',      label: { vi: 'Nhật ký',    en: 'Audit Trail' } },
    { id: 'attachments', label: { vi: 'Đính kèm', en: 'Attachments' } },
    { id: 'comments',   label: { vi: 'Bình luận',  en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin khảo sát',  en: 'Survey Information' } },
    { label: { vi: 'Phạm vi & Phương pháp', en: 'Scope & Method' } },
    { label: { vi: 'Xem lại & Gửi',      en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'survey_date', sortDir: 'desc',
    page: 1, pageSize: 25, items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null, activeTab: 'summary', tabData: {},
    wizardStep: 0, wizardData: {}, wizardErrors: {},
    metrics: null, trendData: null, trendMonths: 12
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
    var html = '<div class="eqms-module eqms-csat">';
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
    if (state.screen === 'analytics' && !state.trendData) loadTrend();
  }

  function renderToolbar() {
    var html = '<div class="eqms-module-toolbar"><div class="eqms-module-toolbar-left">';
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'Surveys' }, icon: '\u2B50' },
     { id: 'analytics', label: { vi: 'Xu hướng', en: 'Trend Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo khảo sát', en: 'New Survey' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'survey_type', type: 'select', label: { vi: 'Loại khảo sát', en: 'Survey Type' }, options: SURVEY_TYPE_OPTIONS },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã, tiêu đề, khách hàng...', en: 'ID, title, customer...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải khảo sát...', en: 'Loading surveys...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'survey_number', type: 'id', label: { vi: 'Mã', en: 'Survey ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.survey_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'title',             label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate' },
        { key: 'survey_type',       label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'customer_name',     label: { vi: 'Khách hàng', en: 'Customer' } },
        { key: 'survey_date',       label: { vi: 'Ngày khảo sát', en: 'Survey Date' }, type: 'date' },
        { key: 'overall_score',     label: { vi: 'Điểm tổng', en: 'Score' },
          render: function(val) {
            if (val == null) return '\u2014';
            var score = parseFloat(val);
            var color = score >= 8 ? 'var(--color-success)' : score >= 6 ? 'var(--color-warning)' : 'var(--color-danger)';
            return '<span style="font-weight:bold;color:' + color + '">' + esc(String(score.toFixed(1))) + '</span>';
          }
        },
        { key: 'nps_score',    label: { vi: 'NPS', en: 'NPS' } },
        { key: 'responses_received', label: { vi: 'Phản hồi', en: 'Responses' } },
        { key: 'status',       label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : ui.renderEmptyState({ icon: '\u2B50', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.survey_number, title: r.title,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Khách hàng', en: 'Customer' }, value: r.customer_name },
           { label: { vi: 'Điểm tổng', en: 'Score' }, value: r.overall_score != null ? r.overall_score + ' / ' + (r.score_scale || '1-10') : '\u2014' },
           { label: { vi: 'NPS', en: 'NPS' }, value: r.nps_score != null ? String(r.nps_score) : '\u2014' }
         ]
    });
    html += ui.renderStateTimeline(['draft','dispatched','responded','analyzed','approved','closed'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':     return renderSummaryTab(r);
      case 'results':     return renderResultsTab(r);
      case 'actions':     return renderActionsTab(r);
      case 'audit':       return renderStdTab('audit', 'eqms_csat_audit', r);
      case 'attachments': return renderStdTab('attachments', 'eqms_csat_attachments', r);
      case 'comments':    return renderStdTab('comments', 'eqms_csat_comments', r);
      default:            return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin khảo sát', en: 'Survey Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã khảo sát', en: 'Survey ID' }, value: r.survey_number, mono: true },
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: r.title },
        { label: { vi: 'Loại khảo sát', en: 'Survey Type' }, value: r.survey_type, badge: true },
        { label: { vi: 'Kỳ khảo sát', en: 'Survey Period' }, value: r.survey_period },
        { label: { vi: 'Khách hàng', en: 'Customer' }, value: r.customer_name },
        { label: { vi: 'Ngày khảo sát', en: 'Survey Date' }, value: fmtDate(r.survey_date) },
        { label: { vi: 'Hạn phản hồi', en: 'Response Due' }, value: fmtDate(r.response_due_date) },
        { label: { vi: 'Phương pháp', en: 'Survey Method' }, value: r.survey_method, badge: true },
        { label: { vi: 'Người phụ trách', en: 'Evaluator' }, value: r.evaluator },
        { label: { vi: 'Khảo sát đã gửi', en: 'Surveys Sent' }, value: fmt(r.responses_sent) },
        { label: { vi: 'Phản hồi nhận được', en: 'Responses Received' }, value: fmt(r.responses_received) },
        { label: { vi: 'Thang điểm', en: 'Score Scale' }, value: r.score_scale },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderResultsTab(r) {
    var html = '';

    // Score display
    if (r.overall_score != null) {
      var score = parseFloat(r.overall_score);
      var maxScore = r.score_scale === '1-5' ? 5 : 10;
      var pct = Math.round((score / maxScore) * 100);
      var color = score >= maxScore * 0.8 ? 'var(--color-success)' : score >= maxScore * 0.6 ? 'var(--color-warning)' : 'var(--color-danger)';

      html += '<div style="text-align:center;padding:24px;margin-bottom:16px">';
      html += '<div style="font-size:48px;font-weight:bold;color:' + color + '">' + score.toFixed(1) + '</div>';
      html += '<div style="color:var(--color-text-secondary)">' + T({ vi: 'Điểm hài lòng tổng thể', en: 'Overall Satisfaction Score' }) + ' / ' + maxScore + '</div>';
      if (r.nps_score != null) {
        html += '<div style="margin-top:12px;font-size:20px;font-weight:bold">NPS: ' + r.nps_score + '</div>';
      }
      html += '<div style="height:8px;background:var(--color-border);border-radius:4px;margin:12px 0;overflow:hidden">';
      html += '<div style="height:100%;width:' + pct + '%;background:' + color + ';transition:width 0.3s"></div>';
      html += '</div></div>';
    }

    html += ui.renderSection({ vi: 'Kết quả chi tiết', en: 'Detailed Results' },
      ui.renderFieldGrid([
        { label: { vi: 'Điểm mạnh', en: 'Strengths' }, value: r.strengths_summary },
        { label: { vi: 'Lĩnh vực cải thiện', en: 'Improvement Areas' }, value: r.improvement_areas },
        { label: { vi: 'Ý kiến khách hàng', en: 'Customer Verbatim' }, value: r.customer_verbatim }
      ])
    );

    // Category scores
    if (Array.isArray(r.category_scores) && r.category_scores.length > 0) {
      var cols = [
        { key: 'category', label: { vi: 'Danh mục', en: 'Category' } },
        { key: 'score', label: { vi: 'Điểm', en: 'Score' } },
        { key: 'comments', label: { vi: 'Ghi chú', en: 'Comments' }, type: 'truncate' }
      ];
      html += ui.renderSection({ vi: 'Điểm theo danh mục', en: 'Category Scores' }, ui.renderDataGrid(cols, r.category_scores, { selectable: false }));
    }

    // Record response form (if dispatched and allowed)
    if (r.status === 'dispatched') {
      html += ui.renderSection({ vi: 'Ghi nhận phản hồi', en: 'Record Response' },
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'overall_score', label: { vi: 'Điểm tổng thể', en: 'Overall Score' }, type: 'number', placeholder: { en: '1-10' }, min: 1, max: 10, step: '0.1' }) +
          ui.renderFormField({ key: 'nps_score', label: { vi: 'NPS (-100 đến 100)', en: 'NPS Score' }, type: 'number', min: -100, max: 100 }) +
          ui.renderFormField({ key: 'responses_received', label: { vi: 'Số phản hồi nhận', en: 'Responses Received' }, type: 'number', min: 0 }) +
        '</div>' +
        '<button class="eqms-btn primary sm" data-action="record-response">' + T({ vi: 'Lưu phản hồi', en: 'Save Response' }) + '</button>'
      );
    }

    return html;
  }

  function renderActionsTab(r) {
    return ui.renderSection({ vi: 'Hành động cải thiện', en: 'Improvement Actions' },
      ui.renderFieldGrid([
        { label: { vi: 'Cần hành động', en: 'Action Required' }, value: r.action_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Mô tả hành động', en: 'Action Description' }, value: r.action_description },
        { label: { vi: 'CAPA liên kết', en: 'Linked CAPA' }, value: r.linked_capa_id, mono: true },
        { label: { vi: 'Khiếu nại liên kết', en: 'Linked Complaint' }, value: r.linked_complaint_id, mono: true }
      ])
    );
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
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo khảo sát CSAT mới', en: 'New CSAT Survey' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), {});
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
          ui.renderFormField({ key: 'survey_type', label: { vi: 'Loại khảo sát', en: 'Survey Type' }, type: 'select', required: true, value: d.survey_type || '', options: SURVEY_TYPE_OPTIONS, error: e.survey_type }) +
          ui.renderFormField({ key: 'survey_date', label: { vi: 'Ngày khảo sát', en: 'Survey Date' }, type: 'date', required: true, value: d.survey_date || '', error: e.survey_date }) +
          ui.renderFormField({ key: 'response_due_date', label: { vi: 'Hạn phản hồi', en: 'Response Due' }, type: 'date', value: d.response_due_date || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'customer_name', label: { vi: 'Khách hàng', en: 'Customer Name' }, type: 'text', value: d.customer_name || '' }) +
          ui.renderFormField({ key: 'survey_period', label: { vi: 'Kỳ khảo sát', en: 'Survey Period' }, type: 'text', value: d.survey_period || '', placeholder: { en: 'e.g. Q1 2026, 2025 Annual' } }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'survey_method', label: { vi: 'Phương pháp', en: 'Survey Method' }, type: 'select', value: d.survey_method || 'questionnaire', options: SURVEY_METHOD_OPTIONS }) +
          ui.renderFormField({ key: 'evaluator', label: { vi: 'Người phụ trách', en: 'Evaluator' }, type: 'text', value: d.evaluator || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'responses_sent', label: { vi: 'Số khảo sát gửi', en: 'Surveys Sent' }, type: 'number', value: d.responses_sent || '0', min: 0 }) +
          ui.renderFormField({ key: 'score_scale', label: { vi: 'Thang điểm', en: 'Score Scale' }, type: 'select', value: d.score_scale || '1-10', options: [{ value: '1-5', label: { en: '1–5' } }, { value: '1-10', label: { en: '1–10' } }] }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description || '' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Thông tin khảo sát', en: 'Survey Details' }, ui.renderFieldGrid([
          { label: { vi: 'Tiêu đề', en: 'Title' }, value: d.title },
          { label: { vi: 'Loại', en: 'Type' }, value: d.survey_type },
          { label: { vi: 'Ngày', en: 'Date' }, value: fmtDate(d.survey_date) },
          { label: { vi: 'Khách hàng', en: 'Customer' }, value: d.customer_name },
          { label: { vi: 'Phương pháp', en: 'Method' }, value: d.survey_method },
          { label: { vi: 'Thang điểm', en: 'Scale' }, value: d.score_scale }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải số liệu...', en: 'Loading metrics...' }); html += '</div>'; return html; }
    var m = state.metrics;

    html += ui.renderKpiRow([
      { label: { vi: 'Điểm TB (YTD)', en: 'Avg Score (YTD)' }, value: m.avg_score_ytd != null ? m.avg_score_ytd.toFixed(1) : '\u2014', accent: m.avg_score_ytd != null && m.avg_score_ytd < 7 ? 'danger' : '' },
      { label: { vi: 'NPS TB (YTD)', en: 'Avg NPS (YTD)' }, value: m.avg_nps_ytd != null ? String(Math.round(m.avg_nps_ytd)) : '\u2014' },
      { label: { vi: 'Tỷ lệ phản hồi (%)', en: 'Response Rate (%)' }, value: m.response_rate_pct != null ? m.response_rate_pct.toFixed(1) + '%' : '\u2014' },
      { label: { vi: 'Khảo sát năm nay', en: 'Surveys YTD' }, value: fmt(m.surveys_ytd || 0) }
    ]);

    // Trend chart
    html += '<div style="margin:16px 0">';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">';
    html += '<strong>' + T({ vi: 'Xu hướng điểm CSAT', en: 'CSAT Score Trend' }) + '</strong>';
    html += '<select data-action="change-trend-months" class="eqms-select sm">';
    [3, 6, 12, 24].forEach(function(n) {
      html += '<option value="' + n + '"' + (state.trendMonths === n ? ' selected' : '') + '>' + n + ' ' + T({ vi: 'tháng', en: 'months' }) + '</option>';
    });
    html += '</select></div>';

    if (!state.trendData) {
      html += ui.renderLoadingState({ vi: 'Đang tải xu hướng...', en: 'Loading trend...' });
    } else {
      html += ui.renderChartWithTableFallback('chart-csat-trend', null,
        [
          { key: 'month', label: { vi: 'Tháng', en: 'Month' } },
          { key: 'avg_score', label: { vi: 'Điểm TB', en: 'Avg Score' } },
          { key: 'avg_nps', label: { vi: 'NPS TB', en: 'Avg NPS' } },
          { key: 'count', label: { vi: 'Số KS', en: 'Count' } }
        ],
        state.trendData || [],
        { defaultMode: 'table' }
      );
    }
    html += '</div>';

    html += ui.renderChartWithTableFallback('chart-csat-by-type', null,
      [{ key: 'survey_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'avg_score', label: { vi: 'Điểm TB', en: 'Avg Score' } }, { key: 'count', label: { vi: 'Số KS', en: 'Count' } }],
      m.by_type || [], { defaultMode: 'table' });

    html += '</div>';
    return html;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)      payload.filters.status      = state.filters.status;
    if (state.filters.survey_type) payload.filters.survey_type = state.filters.survey_type;
    apiCall('eqms_csat_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.surveys || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_csat_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.survey) { state.record = res.survey; state.recordId = id; }
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
    apiCall('eqms_csat_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  function loadTrend() {
    apiCall('eqms_csat_trend', { months: state.trendMonths }, 'GET').then(function(res) {
      if (res && res.trend) state.trendData = res.trend;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };

    if (actionKey === 'record-response') {
      var scoreEl = _container.querySelector('[data-field="overall_score"]');
      var npsEl   = _container.querySelector('[data-field="nps_score"]');
      var respEl  = _container.querySelector('[data-field="responses_received"]');
      if (scoreEl && scoreEl.value) payload.overall_score = parseFloat(scoreEl.value);
      if (npsEl && npsEl.value)     payload.nps_score = parseInt(npsEl.value, 10);
      if (respEl && respEl.value)   payload.responses_received = parseInt(respEl.value, 10);
    }

    state.loading = true; refreshUI();
    apiCall('eqms_csat_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.survey) { state.record = res.survey; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.title)       errors.title       = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.survey_type) errors.survey_type = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.survey_date) errors.survey_date = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_csat_create', { title: d.title, survey_type: d.survey_type, survey_date: d.survey_date, response_due_date: d.response_due_date || null, customer_name: d.customer_name || null, survey_period: d.survey_period || null, survey_method: d.survey_method || 'questionnaire', evaluator: d.evaluator || null, responses_sent: d.responses_sent ? parseInt(d.responses_sent, 10) : 0, score_scale: d.score_scale || '1-10', description: d.description || '' }).then(function(res) {
      state.loading = false;
      if (res && res.survey) {
        showToast(T({ vi: 'Tạo khảo sát thành công', en: 'Survey created' }), 'success');
        state.screen = 'detail'; state.recordId = res.survey.survey_id; state.record = res.survey;
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
        else if (screen === 'analytics') { state.screen = 'analytics'; state.metrics = null; state.trendData = null; }
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
        var wfActions = ['dispatch','record-response','analyze','approve','close'];
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

    _container.addEventListener('change', function(e) {
      var target = e.target.closest('[data-action="change-trend-months"]');
      if (target) { state.trendMonths = parseInt(target.value, 10); state.trendData = null; loadTrend(); }
    });
  }

  function collectFilters() {
    if (!_container) return;
    _container.querySelectorAll('[data-filter]').forEach(function(el) { state.filters[el.getAttribute('data-filter')] = el.value || ''; });
  }

  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['csat'] = { render: render, meta: MOD };

})();

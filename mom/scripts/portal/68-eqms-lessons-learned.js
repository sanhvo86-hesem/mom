/**
 * EQMS Lessons Learned — ISO 9001:2015 §10.3 Knowledge Management
 * HESEM MOM Portal - 68-eqms-lessons-learned.js
 *
 * Archetype: knowledge-base (approval-workflow with publish/archive lifecycle)
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
    id:        'lessons-learned',
    version:   '1.0.0',
    archetype: 'knowledge-base',
    label:     { vi: 'Bài học kinh nghiệm', en: 'Lessons Learned' },
    icon:      '\uD83D\uDCA1'
  };

  var WORKFLOW_STATES = ['draft','under_review','revision_required','approved','published','archived','rejected'];

  var STATE_LABELS = {
    draft:             { vi: 'Nháp',           en: 'Draft' },
    under_review:      { vi: 'Đang xem xét',   en: 'Under Review' },
    revision_required: { vi: 'Cần chỉnh sửa', en: 'Revision Required' },
    approved:          { vi: 'Đã phê duyệt',   en: 'Approved' },
    published:         { vi: 'Đã xuất bản',    en: 'Published' },
    archived:          { vi: 'Lưu trữ',        en: 'Archived' },
    rejected:          { vi: 'Từ chối',        en: 'Rejected' }
  };

  var LESSON_TYPE_OPTIONS = [
    { value: 'corrective',    label: { vi: 'Khắc phục (Điều gì đã sai)',  en: 'Corrective (What went wrong)' } },
    { value: 'preventive',    label: { vi: 'Phòng ngừa (Rủi ro tiềm ẩn)', en: 'Preventive (Potential risk)' } },
    { value: 'best_practice', label: { vi: 'Thực hành tốt (Điều đã đúng)', en: 'Best Practice (What worked)' } },
    { value: 'process_change', label: { vi: 'Thay đổi quy trình', en: 'Process Change' } },
    { value: 'design_change', label: { vi: 'Thay đổi thiết kế', en: 'Design/Engineering Change' } },
    { value: 'audit_finding', label: { vi: 'Phát hiện đánh giá', en: 'Audit Finding' } }
  ];

  var STATE_ACTIONS = {
    draft:             [{ action: 'submit-for-review', label: { vi: 'Gửi xem xét', en: 'Submit for Review' }, style: 'primary' }],
    under_review:      [
      { action: 'approve',          label: { vi: 'Phê duyệt',   en: 'Approve' },          style: 'success' },
      { action: 'reject',           label: { vi: 'Từ chối',     en: 'Reject' },           style: 'danger' },
      { action: 'request-revision', label: { vi: 'Yêu cầu chỉnh sửa', en: 'Request Revision' }, style: 'secondary' }
    ],
    revision_required: [{ action: 'submit-revision', label: { vi: 'Gửi lại', en: 'Submit Revision' }, style: 'primary' }],
    approved:          [
      { action: 'publish', label: { vi: 'Xuất bản',   en: 'Publish' },  style: 'primary' },
      { action: 'archive', label: { vi: 'Lưu trữ',   en: 'Archive' },  style: 'ghost' }
    ],
    published:         [{ action: 'archive', label: { vi: 'Lưu trữ', en: 'Archive' }, style: 'ghost' }]
  };

  var DETAIL_TABS = [
    { id: 'summary',      label: { vi: 'Tóm tắt',        en: 'Summary' } },
    { id: 'knowledge',    label: { vi: 'Nội dung học',   en: 'Knowledge Content' } },
    { id: 'impact',       label: { vi: 'Tác động',       en: 'Impact' } },
    { id: 'related',      label: { vi: 'Liên quan',      en: 'Related' } },
    { id: 'audit',        label: { vi: 'Nhật ký',        en: 'Audit Trail' } },
    { id: 'attachments',  label: { vi: 'Đính kèm',       en: 'Attachments' } },
    { id: 'comments',     label: { vi: 'Bình luận',      en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin cơ bản',     en: 'Basic Information' } },
    { label: { vi: 'Nội dung bài học',     en: 'Lesson Content' } },
    { label: { vi: 'Khuyến nghị & Phổ biến', en: 'Recommendations' } },
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
    var html = '<div class="eqms-module eqms-lessons-learned">';
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
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'Library' }, icon: '\uD83D\uDCA1' },
     { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Thêm bài học', en: 'New Lesson' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      savedViews: true,
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'lesson_type', type: 'select', label: { vi: 'Loại bài học', en: 'Lesson Type' }, options: LESSON_TYPE_OPTIONS },
        { key: 'action_required', type: 'select', label: { vi: 'Cần hành động', en: 'Action Required' }, options: [{ value: 'true', label: { vi: 'Có', en: 'Yes' } }, { value: 'false', label: { vi: 'Không', en: 'No' } }] },
        { key: 'training_required', type: 'select', label: { vi: 'Cần đào tạo', en: 'Training Required' }, options: [{ value: 'true', label: { vi: 'Có', en: 'Yes' } }, { value: 'false', label: { vi: 'Không', en: 'No' } }] },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã, tiêu đề, nội dung...', en: 'ID, title, content...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải bài học...', en: 'Loading lessons...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'lesson_number', type: 'id', label: { vi: 'Mã', en: 'ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.lesson_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'title',            label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate' },
        { key: 'lesson_type',      label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'category',         label: { vi: 'Danh mục', en: 'Category' } },
        { key: 'action_required',  label: { vi: 'Cần HĐ', en: 'Action Req.' }, type: 'boolean' },
        { key: 'training_required', label: { vi: 'Cần ĐT', en: 'Training' }, type: 'boolean' },
        { key: 'status',           label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'created_at',       label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading ? ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }) : ui.renderEmptyState({ icon: '\uD83D\uDCA1', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.lesson_number, title: r.title,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Loại', en: 'Type' }, value: r.lesson_type },
           { label: { vi: 'Cần đào tạo', en: 'Training Required' }, value: r.training_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
           { label: { vi: 'Phê duyệt bởi', en: 'Approved By' }, value: r.approved_by }
         ]
    });
    html += ui.renderStateTimeline(['draft','under_review','approved','published','archived'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':     return renderSummaryTab(r);
      case 'knowledge':   return renderKnowledgeTab(r);
      case 'impact':      return renderImpactTab(r);
      case 'related':     return ui.renderRelationshipsPanel(state.tabData.relationships || [], {});
      case 'audit':       return renderStdTab('audit', 'eqms_lessons_audit', r);
      case 'attachments': return renderStdTab('attachments', 'eqms_lessons_attachments', r);
      case 'comments':    return renderStdTab('comments', 'eqms_lessons_comments', r);
      default:            return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin bài học', en: 'Lesson Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã bài học', en: 'Lesson ID' }, value: r.lesson_number, mono: true },
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: r.title },
        { label: { vi: 'Mô tả', en: 'Description' }, value: r.description },
        { label: { vi: 'Loại bài học', en: 'Lesson Type' }, value: r.lesson_type, badge: true },
        { label: { vi: 'Danh mục', en: 'Category' }, value: r.category },
        { label: { vi: 'Nguồn', en: 'Source Type' }, value: r.source_type, badge: true },
        { label: { vi: 'Tham chiếu nguồn', en: 'Source Reference' }, value: r.source_ref, mono: true },
        { label: { vi: 'Cần hành động', en: 'Action Required' }, value: r.action_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Cần đào tạo', en: 'Training Required' }, value: r.training_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Đã hoàn thành đào tạo', en: 'Training Completed' }, value: r.training_completed ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'KB Ref', en: 'Knowledge Base Ref' }, value: r.knowledge_base_ref, mono: true },
        { label: { vi: 'Phê duyệt bởi', en: 'Approved By' }, value: r.approved_by },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderKnowledgeTab(r) {
    return ui.renderSection({ vi: 'Nội dung kiến thức', en: 'Knowledge Content' },
      ui.renderFieldGrid([
        { label: { vi: 'Điều gì đã xảy ra', en: 'What Happened' }, value: r.what_happened },
        { label: { vi: 'Tóm tắt nguyên nhân gốc rễ', en: 'Root Cause Summary' }, value: r.root_cause_summary },
        { label: { vi: 'Điều đã làm tốt', en: 'What Worked Well' }, value: r.what_worked_well },
        { label: { vi: 'Điều có thể cải thiện', en: 'What Could Improve' }, value: r.what_could_improve },
        { label: { vi: 'Hành động được khuyến nghị', en: 'Recommended Action' }, value: r.recommended_action },
        { label: { vi: 'Cơ chế phòng ngừa', en: 'Prevention Mechanism' }, value: r.prevention_mechanism }
      ])
    );
  }

  function renderImpactTab(r) {
    return ui.renderSection({ vi: 'Tác động & Phạm vi áp dụng', en: 'Impact & Applicability' },
      ui.renderFieldGrid([
        { label: { vi: 'Tác động chi phí', en: 'Cost Impact ($)' }, value: r.cost_impact != null ? '$' + fmt(r.cost_impact) : '\u2014' },
        { label: { vi: 'Tác động thời gian (giờ)', en: 'Time Impact (hrs)' }, value: r.time_impact_hours },
        { label: { vi: 'Điểm giảm rủi ro', en: 'Risk Reduction Score' }, value: r.risk_reduction_score },
        { label: { vi: 'Quy trình áp dụng', en: 'Applicable Processes' }, value: Array.isArray(r.applicable_processes) ? r.applicable_processes.join(', ') : r.applicable_processes },
        { label: { vi: 'Sản phẩm áp dụng', en: 'Applicable Products' }, value: Array.isArray(r.applicable_products) ? r.applicable_products.join(', ') : r.applicable_products },
        { label: { vi: 'Địa điểm áp dụng', en: 'Applicable Sites' }, value: Array.isArray(r.applicable_sites) ? r.applicable_sites.join(', ') : r.applicable_sites }
      ])
    );
  }

  function renderStdTab(tabId, action, r) {
    if (!state.tabData['_' + tabId + 'Loaded']) { loadTabData(tabId, action); return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); }
    var data = state.tabData[tabId] || [];
    if (tabId === 'audit')       return ui.renderAuditTrail(data);
    if (tabId === 'attachments') return ui.renderAttachmentsGrid(data, { readonly: r && ['archived','rejected'].indexOf(r.status) !== -1 });
    if (tabId === 'comments')    return ui.renderCommentsThread(data, { readonly: r && ['archived','rejected'].indexOf(r.status) !== -1 });
    return '';
  }

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Thêm bài học kinh nghiệm', en: 'New Lesson Learned' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), { saveDraft: true });
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
          ui.renderFormField({ key: 'lesson_type', label: { vi: 'Loại bài học', en: 'Lesson Type' }, type: 'select', required: true, value: d.lesson_type || '', options: LESSON_TYPE_OPTIONS, error: e.lesson_type }) +
          ui.renderFormField({ key: 'category', label: { vi: 'Danh mục', en: 'Category' }, type: 'text', value: d.category || '', placeholder: { vi: 'VD: Kiểm soát quy trình, Thiết kế...', en: 'e.g. Process Control, Design...' } }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'source_type', label: { vi: 'Loại nguồn', en: 'Source Type' }, type: 'select', value: d.source_type || '', options: [
            { value: 'ncr',           label: { vi: 'NCR', en: 'NCR' } },
            { value: 'capa',          label: { vi: 'CAPA', en: 'CAPA' } },
            { value: 'complaint',     label: { vi: 'Khiếu nại', en: 'Complaint' } },
            { value: 'audit',         label: { vi: 'Đánh giá', en: 'Audit' } },
            { value: 'project',       label: { vi: 'Dự án', en: 'Project' } },
            { value: 'improvement',   label: { vi: 'Cải tiến', en: 'Improvement' } }
          ]}) +
          ui.renderFormField({ key: 'source_ref', label: { vi: 'Tham chiếu nguồn', en: 'Source Reference' }, type: 'text', value: d.source_ref || '', placeholder: { vi: 'Mã NCR/CAPA/audit...', en: 'NCR/CAPA/audit ID...' } }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'what_happened', label: { vi: 'Điều gì đã xảy ra', en: 'What Happened' }, type: 'textarea', value: d.what_happened || '', placeholder: { vi: 'Mô tả sự kiện, bối cảnh...', en: 'Describe the event, context...' } }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'root_cause_summary', label: { vi: 'Tóm tắt nguyên nhân gốc rễ', en: 'Root Cause Summary' }, type: 'textarea', value: d.root_cause_summary || '' }) +
          ui.renderFormField({ key: 'what_worked_well', label: { vi: 'Điều đã làm tốt', en: 'What Worked Well' }, type: 'textarea', value: d.what_worked_well || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'what_could_improve', label: { vi: 'Điều có thể cải thiện', en: 'What Could Improve' }, type: 'textarea', value: d.what_could_improve || '' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'recommended_action', label: { vi: 'Hành động được khuyến nghị', en: 'Recommended Action' }, type: 'textarea', value: d.recommended_action || '' }) +
          ui.renderFormField({ key: 'prevention_mechanism', label: { vi: 'Cơ chế phòng ngừa', en: 'Prevention Mechanism' }, type: 'textarea', value: d.prevention_mechanism || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'action_required', label: { vi: 'Cần hành động?', en: 'Action Required?' }, type: 'select', value: d.action_required || 'false', options: [{ value: 'false', label: { vi: 'Không', en: 'No' } }, { value: 'true', label: { vi: 'Có', en: 'Yes' } }] }) +
          ui.renderFormField({ key: 'training_required', label: { vi: 'Cần đào tạo?', en: 'Training Required?' }, type: 'select', value: d.training_required || 'false', options: [{ value: 'false', label: { vi: 'Không', en: 'No' } }, { value: 'true', label: { vi: 'Có', en: 'Yes' } }] }) +
          ui.renderFormField({ key: 'risk_reduction_score', label: { vi: 'Điểm giảm rủi ro (1-10)', en: 'Risk Reduction Score (1-10)' }, type: 'number', value: d.risk_reduction_score || '', min: 1, max: 10 }) +
        '</div></div>';
      case 3: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Cơ bản', en: 'Basic Info' }, ui.renderFieldGrid([
          { label: { vi: 'Tiêu đề', en: 'Title' }, value: d.title },
          { label: { vi: 'Loại', en: 'Type' }, value: d.lesson_type },
          { label: { vi: 'Nguồn', en: 'Source' }, value: d.source_type + (d.source_ref ? ' / ' + d.source_ref : '') }
        ])) +
        ui.renderSection({ vi: 'Nội dung', en: 'Content' }, ui.renderFieldGrid([
          { label: { vi: 'Điều đã xảy ra', en: 'What Happened' }, value: d.what_happened },
          { label: { vi: 'Khuyến nghị', en: 'Recommendation' }, value: d.recommended_action }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Đã xuất bản', en: 'Published' }, value: fmt((m.by_status || {}).published || 0) },
      { label: { vi: 'Chờ đào tạo', en: 'Pending Training' }, value: fmt(m.pending_training || 0), accent: m.pending_training > 0 ? 'warning' : '' },
      { label: { vi: 'YTD xuất bản', en: 'YTD Published' }, value: fmt(m.ytd_published || 0) },
      { label: { vi: 'Đang xem xét', en: 'Under Review' }, value: fmt((m.by_status || {}).under_review || 0) }
    ]);
    html += ui.renderChartWithTableFallback('chart-ll-by-type', null,
      [{ key: 'lesson_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_type || [], { defaultMode: 'table' });
    html += '</div>';
    return html;
  }

  // ─── Data loading & actions (same pattern as other modules) ──────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)           payload.filters.status           = state.filters.status;
    if (state.filters.lesson_type)      payload.filters.lesson_type      = state.filters.lesson_type;
    if (state.filters.action_required)  payload.filters.action_required  = state.filters.action_required;
    if (state.filters.training_required) payload.filters.training_required = state.filters.training_required;
    apiCall('eqms_lessons_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.lessons || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_lessons_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.lesson) { state.record = res.lesson; state.recordId = id; }
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
    apiCall('eqms_lessons_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    state.loading = true; refreshUI();
    apiCall('eqms_lessons_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.lesson) { state.record = res.lesson; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.title)       errors.title       = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.lesson_type) errors.lesson_type = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_lessons_create', { title: d.title, lesson_type: d.lesson_type, category: d.category || null, source_type: d.source_type || null, source_ref: d.source_ref || null, what_happened: d.what_happened || '', root_cause_summary: d.root_cause_summary || null, what_worked_well: d.what_worked_well || null, what_could_improve: d.what_could_improve || null, recommended_action: d.recommended_action || null, prevention_mechanism: d.prevention_mechanism || null, action_required: d.action_required === 'true', training_required: d.training_required === 'true', risk_reduction_score: d.risk_reduction_score ? parseInt(d.risk_reduction_score, 10) : null }).then(function(res) {
      state.loading = false;
      if (res && res.lesson) {
        showToast(T({ vi: 'Tạo thành công', en: 'Lesson created' }), 'success');
        state.screen = 'detail'; state.recordId = res.lesson.lesson_id; state.record = res.lesson;
        state.wizardData = {}; state.wizardStep = 0; state.wizardErrors = {};
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

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
        var wfActions = ['submit-for-review','approve','reject','request-revision','submit-revision','publish','archive'];
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
  window.EqmsModules['lessons-learned'] = { render: render, meta: MOD };

})();

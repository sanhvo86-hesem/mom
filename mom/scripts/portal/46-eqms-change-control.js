/**
 * EQMS Change Control — Evidence Workspace + Wizard Archetype
 * HESEM MOM Portal · 46-eqms-change-control.js
 *
 * Authority: ISO 13485 §7.3.9, FDA 21 CFR Part 820.70, AS9100D §8.5.6
 * Archetype: evidence-workspace (queue + detail + wizard + analytics)
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
  var lang       = util.lang;

  // =========================================================================
  // MODULE METADATA
  // =========================================================================
  var MOD = {
    id: 'change-control',
    label: { vi: 'Kiểm soát thay đổi', en: 'Change Control' },
    icon: '\u{1F504}',
    archetype: 'evidence-workspace'
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var STATES = ['draft', 'impact_assessment', 'routing', 'under_review', 'approved', 'implementation', 'verification', 'closed'];
  var CANCELLED_STATE = 'cancelled';

  var CHANGE_TYPES = [
    { value: 'document',  label: { vi: 'Tài liệu', en: 'Document' } },
    { value: 'process',   label: { vi: 'Quy trình', en: 'Process' } },
    { value: 'product',   label: { vi: 'Sản phẩm', en: 'Product' } },
    { value: 'equipment', label: { vi: 'Thiết bị', en: 'Equipment' } },
    { value: 'system',    label: { vi: 'Hệ thống', en: 'System' } }
  ];

  var CHANGE_CATEGORIES = [
    { value: 'major',          label: { vi: 'Chính', en: 'Major' } },
    { value: 'minor',          label: { vi: 'Phụ', en: 'Minor' } },
    { value: 'administrative', label: { vi: 'Hành chính', en: 'Administrative' } }
  ];

  var IMPACT_LEVELS = [
    { value: 'low',      label: { vi: 'Thấp', en: 'Low' } },
    { value: 'medium',   label: { vi: 'Trung bình', en: 'Medium' } },
    { value: 'high',     label: { vi: 'Cao', en: 'High' } },
    { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } }
  ];

  var URGENCY_OPTIONS = [
    { value: 'routine',   label: { vi: 'Thường quy', en: 'Routine' } },
    { value: 'urgent',    label: { vi: 'Khẩn cấp', en: 'Urgent' } },
    { value: 'emergency', label: { vi: 'Không báo trước', en: 'Emergency' } }
  ];

  var IMPACT_AREAS = [
    { key: 'documents',       label: { vi: 'Tài liệu', en: 'Documents' } },
    { key: 'training',        label: { vi: 'Đào tạo', en: 'Training' } },
    { key: 'process',         label: { vi: 'Quy trình', en: 'Process' } },
    { key: 'equipment',       label: { vi: 'Thiết bị', en: 'Equipment' } },
    { key: 'erp_mes',         label: { vi: 'ERP/MES', en: 'ERP/MES' } },
    { key: 'suppliers',       label: { vi: 'Nhà cung cấp', en: 'Suppliers' } },
    { key: 'quality_records', label: { vi: 'Hồ sơ chất lượng', en: 'Quality Records' } }
  ];

  var APPROVAL_DECISIONS = [
    { value: 'pending',  label: { vi: 'Chờ', en: 'Pending' } },
    { value: 'approved', label: { vi: 'Đồng ý', en: 'Approved' } },
    { value: 'rejected', label: { vi: 'Từ chối', en: 'Rejected' } },
    { value: 'returned', label: { vi: 'Trả lại', en: 'Returned' } }
  ];

  var TASK_STATUSES = [
    { value: 'not_started', label: { vi: 'Chưa bắt đầu', en: 'Not Started' } },
    { value: 'in_progress', label: { vi: 'Đang thực hiện', en: 'In Progress' } },
    { value: 'completed',   label: { vi: 'Hoàn thành', en: 'Completed' } },
    { value: 'delayed',     label: { vi: 'Trễ hạn', en: 'Delayed' } }
  ];

  var DETAIL_TABS = [
    { id: 'summary',          label: { vi: 'Tổng quan', en: 'Summary' } },
    { id: 'impact',           label: { vi: 'Đánh giá tác động', en: 'Impact Assessment' } },
    { id: 'approval',         label: { vi: 'Chuỗi phê duyệt', en: 'Approval Routing' } },
    { id: 'implementation',   label: { vi: 'Kế hoạch triển khai', en: 'Implementation Plan' } },
    { id: 'verification',     label: { vi: 'Xác nhận hiệu quả', en: 'Verification' } },
    { id: 'documents',        label: { vi: 'Liên kết tài liệu', en: 'Document Linkage' } },
    { id: 'training',         label: { vi: 'Tác động đào tạo', en: 'Training Impact' } },
    { id: 'related',          label: { vi: 'Bản ghi liên quan', en: 'Related Records' } },
    { id: 'history',          label: { vi: 'Lịch sử & Ký duyệt', en: 'Audit & Signatures' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Yêu cầu thay đổi', en: 'Change Request' } },
    { label: { vi: 'Phân loại', en: 'Classification' } },
    { label: { vi: 'Đánh giá tác động', en: 'Impact Assessment' } },
    { label: { vi: 'Xem lại & Gửi', en: 'Review & Submit' } }
  ];

  // =========================================================================
  // MODULE STATE
  // =========================================================================
  var state = {
    screen: 'queue',        // queue | detail | create | analytics
    // Queue state
    filters: { change_type: '', risk_level: '', status: '', search: '' },
    sortKey: 'created_at', sortDir: 'desc',
    page: 1, limit: 25,
    items: [], total: 0,
    loading: false, error: null,
    // Detail state
    recordId: null, record: null,
    activeTab: 'summary',
    auditEvents: [], comments: [], attachments: [], relationships: [], signatures: [],
    // Wizard state
    wizardStep: 0,
    wizardData: { title: '', change_type: '', description: '', justification: '', urgency: 'routine', regulatory_impact: false, change_category: 'minor', impact_matrix: [], scope: '' },
    // Analytics state
    metrics: null
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  function render(container, context) {
    if (context && context.recordId) {
      state.screen = 'detail';
      state.recordId = context.recordId;
    }
    container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' });
    if (state.screen === 'queue') { loadQueue(container); }
    else if (state.screen === 'detail') { loadDetail(container); }
    else if (state.screen === 'create') { renderCreateScreen(container); }
    else if (state.screen === 'analytics') { loadAnalytics(container); }
    else { renderQueueScreen(container); }
  }

  // =========================================================================
  // SCREEN 1: QUEUE
  // =========================================================================
  function loadQueue(container) {
    state.loading = true;
    renderQueueScreen(container);
    var offset = (state.page - 1) * state.limit;
    apiCall('eqms_change_controls_query', {
      filters: state.filters,
      sort_by: state.sortKey,
      sort_dir: state.sortDir,
      limit: state.limit,
      offset: offset,
      search: state.filters.search || ''
    }).then(function(res) {
      state.loading = false;
      if (res.success !== false && res.data) {
        state.items = res.data.change_controls || res.data.items || [];
        state.total = res.data.total || state.items.length;
      } else {
        state.items = [];
        state.total = 0;
        state.error = (res.error && res.error.message) || 'Failed to load records';
      }
      renderQueueScreen(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      renderQueueScreen(container);
    });
  }

  function renderQueueScreen(container) {
    var html = '<div class="eqms-module-page">';

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<h2 class="eqms-page-title">\u{1F504} ' + T({ vi: 'Kiểm soát thay đổi', en: 'Change Control' }) + '</h2>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';
    html += '<button class="eqms-btn ghost sm" data-action="show-analytics">\u{1F4CA} ' + T({ vi: 'Phân tích', en: 'Analytics' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '<button class="eqms-btn primary sm" data-action="create-new">+ ' + T({ vi: 'Tạo thay đổi', en: 'New Change' }) + '</button>';
    html += '</div></div>';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm ID, tiêu đề...', en: 'Search ID, title...' }, width: '200px' },
        { key: 'change_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: CHANGE_TYPES },
        { key: 'risk_level', type: 'select', label: { vi: 'Mức tác động', en: 'Impact Level' }, options: IMPACT_LEVELS },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: STATES.concat([CANCELLED_STATE]).map(function(s) {
          return { value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) };
        }) }
      ]
    });

    // Content
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải danh sách...', en: 'Loading records...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'reload-queue');
    } else {
      var columns = [
        { key: 'change_control_number', label: { vi: 'Mã số', en: 'ID' }, type: 'id' },
        { key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate' },
        { key: 'change_type', label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'risk_level', label: { vi: 'Mức tác động', en: 'Impact Level' }, type: 'priority' },
        { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'created_by', label: { vi: 'Người yêu cầu', en: 'Requester' } },
        { key: 'created_at', label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' },
        { key: 'target_date', label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, type: 'date' }
      ];

      html += ui.renderDataGrid(columns, state.items, {
        selectable: true,
        sortKey: state.sortKey,
        sortDir: state.sortDir
      });

      html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });
    }

    html += '</div>';
    container.innerHTML = html;
    bindQueueEvents(container);
  }

  function bindQueueEvents(container) {
    container.addEventListener('click', function(e) {
      var action = e.target.closest('[data-action]');
      if (action) {
        var act = action.getAttribute('data-action');
        if (act === 'create-new') { state.screen = 'create'; state.wizardStep = 0; resetWizardData(); render(container); return; }
        if (act === 'show-analytics') { state.screen = 'analytics'; render(container); return; }
        if (act === 'reload-queue') { state.error = null; loadQueue(container); return; }
        if (act === 'apply-filters') { applyFilters(container); return; }
        if (act === 'reset-filters') { state.filters = { change_type: '', risk_level: '', status: '', search: '' }; state.page = 1; loadQueue(container); return; }
        if (act === 'page') { state.page = parseInt(action.getAttribute('data-page'), 10) || 1; loadQueue(container); return; }
        if (act === 'export') { handleExport(action.getAttribute('data-format'), null); return; }
      }
      // Sort
      var sortTh = e.target.closest('[data-sort]');
      if (sortTh) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        state.page = 1;
        loadQueue(container);
        return;
      }
      // Row click -> detail
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input[type="checkbox"]')) {
        state.screen = 'detail';
        state.recordId = row.getAttribute('data-id');
        state.activeTab = 'summary';
        render(container);
      }
    });
  }

  function applyFilters(container) {
    var selects = container.querySelectorAll('[data-filter]');
    selects.forEach(function(el) {
      state.filters[el.getAttribute('data-filter')] = el.value;
    });
    state.page = 1;
    loadQueue(container);
  }

  // =========================================================================
  // SCREEN 2: DETAIL
  // =========================================================================
  function loadDetail(container) {
    container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải bản ghi...', en: 'Loading record...' });
    var id = state.recordId;
    Promise.all([
      apiCall('eqms_change_controls_detail', { id: id }, 'GET'),
      apiCall('eqms_change_controls_audit', { id: id }, 'GET'),
      apiCall('eqms_change_controls_comments', { id: id }, 'GET'),
      apiCall('eqms_change_controls_attachments', { id: id }, 'GET'),
      apiCall('eqms_change_controls_relationships', { id: id }, 'GET'),
      apiCall('eqms_change_controls_signatures', { id: id }, 'GET')
    ]).then(function(results) {
      var detail = results[0];
      if (detail.success !== false && detail.data) {
        state.record = detail.data.change_control || detail.data;
      } else {
        state.error = (detail.error && detail.error.message) || 'Record not found';
        renderDetailScreen(container);
        return;
      }
      state.auditEvents   = (results[1].data && results[1].data.events) || [];
      state.comments      = (results[2].data && results[2].data.comments) || [];
      state.attachments   = (results[3].data && results[3].data.attachments) || [];
      state.relationships = (results[4].data && results[4].data.relationships) || [];
      state.signatures    = (results[5].data && results[5].data.signatures) || [];
      renderDetailScreen(container);
    }).catch(function(err) {
      state.error = err.message || 'Failed to load record';
      renderDetailScreen(container);
    });
  }

  function renderDetailScreen(container) {
    if (state.error) {
      container.innerHTML = '<div class="eqms-module-page">' + renderBackButton() + (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'reload-detail') + '</div>';
      bindDetailEvents(container);
      return;
    }
    var rec = state.record;
    if (!rec) { container.innerHTML = ui.renderLoadingState(); return; }

    var html = '<div class="eqms-module-page">';
    html += renderBackButton();

    // Identity header
    var workflowStates = STATES;
    var currentState = rec.status || 'draft';
    if (currentState === CANCELLED_STATE) { workflowStates = STATES.concat([CANCELLED_STATE]); }
    var actions = buildWorkflowActions(rec);

    html += ui.renderIdentityHeader(rec, {
      actions: actions,
      extraMeta: [
        { label: { vi: 'Loại thay đổi', en: 'Change Type' }, value: rec.change_type },
        { label: { vi: 'Phân loại', en: 'Category' }, value: rec.change_category },
        { label: { vi: 'Mức rủi ro', en: 'Risk Level' }, value: rec.risk_level },
        { label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, value: fmtDate(rec.target_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(workflowStates, currentState);

    // Tabs
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    if (state.activeTab === 'summary')        html += renderTabSummary(rec);
    else if (state.activeTab === 'impact')    html += renderTabImpact(rec);
    else if (state.activeTab === 'approval')  html += renderTabApproval(rec);
    else if (state.activeTab === 'implementation') html += renderTabImplementation(rec);
    else if (state.activeTab === 'verification')   html += renderTabVerification(rec);
    else if (state.activeTab === 'documents')      html += renderTabDocuments(rec);
    else if (state.activeTab === 'training')       html += renderTabTraining(rec);
    else if (state.activeTab === 'related')        html += renderTabRelated();
    else if (state.activeTab === 'history')        html += renderTabHistory();
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
    bindDetailEvents(container);
  }

  function renderBackButton() {
    return '<button class="eqms-btn ghost sm" data-action="back-to-queue" style="margin-bottom:12px">' +
      '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to list' }) + '</button>';
  }

  function buildWorkflowActions(rec) {
    var s = rec.status || 'draft';
    var actions = [];
    var map = {
      'draft':             [{ action: 'classify', label: { vi: 'Phân loại', en: 'Classify' }, style: 'primary' }],
      'impact_assessment': [{ action: 'assess-impact', label: { vi: 'Hoàn thành đánh giá', en: 'Complete Assessment' }, style: 'primary' }],
      'routing':           [{ action: 'route-approval', label: { vi: 'Gửi phê duyệt', en: 'Route for Approval' }, style: 'primary' }],
      'under_review':      [{ action: 'approve', label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'primary' }],
      'approved':          [{ action: 'launch-implementation', label: { vi: 'Bắt đầu triển khai', en: 'Launch Implementation' }, style: 'primary' }],
      'implementation':    [{ action: 'verify-effectiveness', label: { vi: 'Xác nhận hiệu quả', en: 'Verify Effectiveness' }, style: 'primary' }],
      'verification':      [{ action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'primary' }]
    };
    if (map[s]) actions = map[s];
    if (s !== 'closed' && s !== CANCELLED_STATE) {
      actions.push({ action: 'cancel', label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' });
    }
    return actions;
  }

  // --- Tab: Summary ---
  function renderTabSummary(rec) {
    var html = ui.renderSection({ vi: 'Thông tin chung', en: 'General Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã kiểm soát thay đổi', en: 'Change Control ID' }, value: rec.change_control_number || rec.change_control_id, mono: true },
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: rec.title },
        { label: { vi: 'Loại thay đổi', en: 'Change Type' }, value: rec.change_type, badge: true },
        { label: { vi: 'Phân loại', en: 'Category' }, value: rec.change_category, badge: true },
        { label: { vi: 'Mức độ khẩn cấp', en: 'Urgency' }, value: rec.urgency, badge: true },
        { label: { vi: 'Trạng thái', en: 'Status' }, value: rec.status, badge: true },
        { label: { vi: 'Người khởi tạo', en: 'Initiator' }, value: rec.created_by },
        { label: { vi: 'Phòng ban', en: 'Department' }, value: rec.department },
        { label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, value: fmtDate(rec.target_date) },
        { label: { vi: 'Tác động quy định', en: 'Regulatory Impact' }, value: rec.regulatory_impact ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Mức rủi ro', en: 'Risk Level' }, value: rec.risk_level, badge: true },
        { label: { vi: 'Phạm vi', en: 'Scope' }, value: rec.scope }
      ])
    );
    html += ui.renderSection({ vi: 'Mô tả', en: 'Description' },
      '<div class="eqms-text-block">' + esc(rec.description || T({ vi: 'Chưa có mô tả', en: 'No description provided' })) + '</div>'
    );
    html += ui.renderSection({ vi: 'Lý do thay đổi', en: 'Justification' },
      '<div class="eqms-text-block">' + esc(rec.justification || T({ vi: 'Chưa có', en: 'Not provided' })) + '</div>'
    );
    return html;
  }

  // --- Tab: Impact Assessment ---
  function renderTabImpact(rec) {
    var matrix = rec.impact_assessment || rec.impact_matrix || [];
    if (!Array.isArray(matrix) && typeof matrix === 'string') {
      try { matrix = JSON.parse(matrix); } catch(e) { matrix = []; }
    }
    // Pre-populate with default areas if empty
    if (!matrix.length) {
      matrix = IMPACT_AREAS.map(function(area) {
        return { area: T(area.label), area_key: area.key, impacted: false, description: '', severity: 'low', mitigation: '' };
      });
    }

    var html = ui.renderSection({ vi: 'Ma trận tác động', en: 'Impact Matrix' }, function() {
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr>';
      tableHtml += '<th>' + T({ vi: 'Lĩnh vực', en: 'Area' }) + '</th>';
      tableHtml += '<th style="width:80px;text-align:center">' + T({ vi: 'Tác động', en: 'Impact' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Mô tả', en: 'Description' }) + '</th>';
      tableHtml += '<th style="width:100px">' + T({ vi: 'Mức độ', en: 'Severity' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Giảm thiểu', en: 'Mitigation' }) + '</th>';
      tableHtml += '</tr></thead><tbody>';
      matrix.forEach(function(row, idx) {
        var impacted = row.impacted || row.impact;
        tableHtml += '<tr>';
        tableHtml += '<td><strong>' + esc(row.area || row.area_key || '') + '</strong></td>';
        tableHtml += '<td style="text-align:center"><span class="eqms-badge ' + (impacted ? 'high' : 'low') + '">' + (impacted ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' })) + '</span></td>';
        tableHtml += '<td>' + esc(row.description || '—') + '</td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(row.severity || 'low') + '">' + esc(row.severity || '—') + '</span></td>';
        tableHtml += '<td>' + esc(row.mitigation || '—') + '</td>';
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    // Overall impact rating
    html += ui.renderSection({ vi: 'Đánh giá tổng thể', en: 'Overall Impact Rating' },
      ui.renderFieldGrid([
        { label: { vi: 'Mức tác động tổng thể', en: 'Overall Impact Level' }, value: rec.risk_level || rec.overall_impact || 'medium', badge: true },
        { label: { vi: 'Người đánh giá', en: 'Assessed By' }, value: rec.assessed_by || rec.impact_assessed_by },
        { label: { vi: 'Ngày đánh giá', en: 'Assessment Date' }, value: fmtDate(rec.impact_assessed_at || rec.assessment_date) }
      ])
    );
    return html;
  }

  // --- Tab: Approval Routing ---
  function renderTabApproval(rec) {
    var approvalRoute = rec.approval_route || rec.approval_chain || [];
    if (!Array.isArray(approvalRoute) && typeof approvalRoute === 'string') {
      try { approvalRoute = JSON.parse(approvalRoute); } catch(e) { approvalRoute = []; }
    }

    var html = '';
    // Approval type indicator
    var approvalType = rec.approval_type || 'sequential';
    html += ui.renderSection({ vi: 'Cấu hình phê duyệt', en: 'Approval Configuration' },
      ui.renderFieldGrid([
        { label: { vi: 'Kiểu phê duyệt', en: 'Approval Type' }, value: approvalType === 'parallel' ? T({ vi: 'Song song', en: 'Parallel' }) : T({ vi: 'Tuần tự', en: 'Sequential' }), badge: true },
        { label: { vi: 'Tổng bước', en: 'Total Steps' }, value: approvalRoute.length || '—' }
      ])
    );

    // Approval chain table
    html += ui.renderSection({ vi: 'Chuỗi phê duyệt', en: 'Approval Chain' }, function() {
      if (!approvalRoute.length) {
        return ui.renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Chưa cấu hình tuyến phê duyệt', en: 'No approval route configured' } });
      }
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr>';
      tableHtml += '<th style="width:60px">' + T({ vi: 'Bước', en: 'Step' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Vai trò', en: 'Role' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Người phê duyệt', en: 'Approver' }) + '</th>';
      tableHtml += '<th style="width:120px">' + T({ vi: 'Quyết định', en: 'Decision' }) + '</th>';
      tableHtml += '<th style="width:140px">' + T({ vi: 'Ngày', en: 'Date' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Ghi chú', en: 'Comments' }) + '</th>';
      tableHtml += '</tr></thead><tbody>';
      approvalRoute.forEach(function(step, idx) {
        var decision = step.decision || 'pending';
        tableHtml += '<tr>';
        tableHtml += '<td style="text-align:center"><strong>' + (idx + 1) + '</strong></td>';
        tableHtml += '<td>' + esc(step.role || '—') + '</td>';
        tableHtml += '<td>' + esc(step.approver || step.approver_name || '—') + '</td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(decision) + '">' + esc(decision) + '</span></td>';
        tableHtml += '<td>' + esc(fmtDateTime(step.decided_at || step.date)) + '</td>';
        tableHtml += '<td>' + esc(step.comments || '—') + '</td>';
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    return html;
  }

  // --- Tab: Implementation Plan ---
  function renderTabImplementation(rec) {
    var tasks = rec.implementation_plan || rec.implementation_tasks || [];
    if (!Array.isArray(tasks) && typeof tasks === 'string') {
      try { tasks = JSON.parse(tasks); } catch(e) { tasks = []; }
    }

    // Progress bar
    var completed = tasks.filter(function(t) { return t.status === 'completed'; }).length;
    var totalTasks = tasks.length;
    var pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    var html = ui.renderSection({ vi: 'Tiến độ triển khai', en: 'Implementation Progress' },
      '<div class="eqms-progress-wrapper">' +
        '<div class="eqms-progress-bar-bg">' +
          '<div class="eqms-progress-bar-fill" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="eqms-progress-label">' + completed + ' / ' + totalTasks + ' (' + pct + '%)</span>' +
      '</div>'
    );

    // Tasks table
    html += ui.renderSection({ vi: 'Danh sách công việc', en: 'Task List' }, function() {
      if (!tasks.length) {
        return ui.renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Chưa có công việc', en: 'No tasks yet' } });
      }
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr>';
      tableHtml += '<th>' + T({ vi: 'Công việc', en: 'Task' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Người phụ trách', en: 'Owner' }) + '</th>';
      tableHtml += '<th style="width:120px">' + T({ vi: 'Hạn hoàn thành', en: 'Due Date' }) + '</th>';
      tableHtml += '<th style="width:120px">' + T({ vi: 'Trạng thái', en: 'Status' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Phụ thuộc', en: 'Dependencies' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Bằng chứng', en: 'Evidence' }) + '</th>';
      tableHtml += '</tr></thead><tbody>';
      tasks.forEach(function(task) {
        var taskStatus = task.status || 'not_started';
        tableHtml += '<tr>';
        tableHtml += '<td>' + esc(task.task || task.title || task.name || '—') + '</td>';
        tableHtml += '<td>' + esc(task.owner || task.assigned_to || '—') + '</td>';
        tableHtml += '<td>' + esc(fmtDate(task.due_date)) + '</td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(taskStatus) + '">' + esc(taskStatus.replace(/_/g, ' ')) + '</span></td>';
        tableHtml += '<td>' + esc(task.dependencies || '—') + '</td>';
        tableHtml += '<td>' + esc(task.evidence || '—') + '</td>';
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    // Gantt-style timeline
    html += ui.renderSection({ vi: 'Dòng thời gian', en: 'Timeline View' }, function() {
      if (!tasks.length) return '';
      var ganttHtml = '<div class="eqms-gantt">';
      tasks.forEach(function(task) {
        var taskStatus = task.status || 'not_started';
        ganttHtml += '<div class="eqms-gantt-row">';
        ganttHtml += '<span class="eqms-gantt-label">' + esc(task.task || task.title || '') + '</span>';
        ganttHtml += '<div class="eqms-gantt-bar ' + slugify(taskStatus) + '">';
        ganttHtml += '<span>' + esc(fmtDate(task.start_date || task.due_date)) + ' \u2192 ' + esc(fmtDate(task.due_date)) + '</span>';
        ganttHtml += '</div></div>';
      });
      ganttHtml += '</div>';
      return ganttHtml;
    }());

    return html;
  }

  // --- Tab: Verification ---
  function renderTabVerification(rec) {
    var html = ui.renderSection({ vi: 'Xác nhận hiệu quả thay đổi', en: 'Effectiveness Verification' },
      ui.renderFieldGrid([
        { label: { vi: 'Tiêu chí đo lường', en: 'Measurement Criteria' }, value: rec.effectiveness_criteria || rec.measurement_criteria },
        { label: { vi: 'Kết quả', en: 'Results' }, value: rec.verification_results || rec.effectiveness_results },
        { label: { vi: 'Kết luận', en: 'Conclusion' }, value: rec.verification_conclusion || rec.effectiveness_conclusion, badge: true },
        { label: { vi: 'Người xác nhận', en: 'Verifier' }, value: rec.verified_by || rec.effectiveness_verified_by },
        { label: { vi: 'Ngày xác nhận', en: 'Verification Date' }, value: fmtDate(rec.verified_at || rec.effectiveness_verified_at) }
      ])
    );

    // Verifier signature
    html += ui.renderSection({ vi: 'Chữ ký người xác nhận', en: 'Verifier Signature' },
      ui.renderSignaturePanel(
        state.signatures.filter(function(s) { return s.meaning === 'effectiveness_verified' || s.role === 'verifier'; }),
        [{ vi: 'Người xác nhận', en: 'Verifier' }]
      )
    );
    return html;
  }

  // --- Tab: Document Linkage ---
  function renderTabDocuments(rec) {
    var linkedDocs = rec.linked_documents || rec.linked_document_ids || [];
    if (!Array.isArray(linkedDocs) && typeof linkedDocs === 'string') {
      try { linkedDocs = JSON.parse(linkedDocs); } catch(e) { linkedDocs = []; }
    }

    var html = ui.renderSection({ vi: 'Tài liệu liên kết', en: 'Linked Documents' }, function() {
      if (!linkedDocs.length) {
        return ui.renderEmptyState({ icon: '\u{1F4C4}', title: { vi: 'Chưa có tài liệu liên kết', en: 'No linked documents' } });
      }
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr>';
      tableHtml += '<th>' + T({ vi: 'Mã tài liệu', en: 'Document ID' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Tiêu đề', en: 'Title' }) + '</th>';
      tableHtml += '<th style="width:80px">' + T({ vi: 'Phiên bản trước', en: 'Rev Before' }) + '</th>';
      tableHtml += '<th style="width:80px">' + T({ vi: 'Phiên bản sau', en: 'Rev After' }) + '</th>';
      tableHtml += '<th style="width:120px">' + T({ vi: 'Trạng thái', en: 'Status' }) + '</th>';
      tableHtml += '</tr></thead><tbody>';
      linkedDocs.forEach(function(doc) {
        var d = typeof doc === 'object' ? doc : { id: doc };
        tableHtml += '<tr data-action="open-document" data-id="' + esc(d.id || d.doc_id || '') + '">';
        tableHtml += '<td class="eqms-cell-id">' + esc(d.doc_number || d.id || d.doc_id || '—') + '</td>';
        tableHtml += '<td>' + esc(d.title || d.name || '—') + '</td>';
        tableHtml += '<td style="text-align:center">' + esc(d.rev_before || d.revision_before || '—') + '</td>';
        tableHtml += '<td style="text-align:center">' + esc(d.rev_after || d.revision_after || '—') + '</td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(d.status || '') + '">' + esc(d.status || '—') + '</span></td>';
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    html += '<button class="eqms-btn secondary sm" data-action="link-document" style="margin-top:8px">';
    html += '+ ' + T({ vi: 'Liên kết tài liệu', en: 'Link Document' });
    html += '</button>';

    return html;
  }

  // --- Tab: Training Impact ---
  function renderTabTraining(rec) {
    var trainingRecords = rec.training_records || rec.training_impact || [];
    if (!Array.isArray(trainingRecords) && typeof trainingRecords === 'string') {
      try { trainingRecords = JSON.parse(trainingRecords); } catch(e) { trainingRecords = []; }
    }

    var html = ui.renderSection({ vi: 'Hồ sơ đào tạo bị ảnh hưởng', en: 'Affected Training Records' }, function() {
      if (!trainingRecords.length) {
        return ui.renderEmptyState({ icon: '\u{1F393}', title: { vi: 'Không có đào tạo bị ảnh hưởng', en: 'No training records affected' } });
      }
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr>';
      tableHtml += '<th>' + T({ vi: 'Vai trò', en: 'Role' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Chương trình đào tạo', en: 'Training Curriculum' }) + '</th>';
      tableHtml += '<th>' + T({ vi: 'Cập nhật nội dung', en: 'Curriculum Update' }) + '</th>';
      tableHtml += '<th style="width:120px">' + T({ vi: 'Trạng thái', en: 'Completion' }) + '</th>';
      tableHtml += '</tr></thead><tbody>';
      trainingRecords.forEach(function(tr) {
        tableHtml += '<tr>';
        tableHtml += '<td>' + esc(tr.role || tr.affected_role || '—') + '</td>';
        tableHtml += '<td>' + esc(tr.curriculum || tr.training_title || '—') + '</td>';
        tableHtml += '<td>' + esc(tr.update_description || tr.changes || '—') + '</td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(tr.completion_status || 'pending') + '">' + esc(tr.completion_status || 'pending') + '</span></td>';
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    return html;
  }

  // --- Tab: Related Records ---
  function renderTabRelated() {
    return ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      (ui.renderLinkedRecordGraph || ui.renderRelationshipsPanel)(state.relationships)
    );
  }

  // --- Tab: Audit & Signatures ---
  function renderTabHistory() {
    var html = '';
    html += ui.renderSection({ vi: 'Chữ ký điện tử', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Xem xét', en: 'Reviewed' },
        { vi: 'Phê duyệt', en: 'Approved' },
        { vi: 'Xác nhận hiệu quả', en: 'Effectiveness Verified' }
      ])
    );
    html += ui.renderSection({ vi: 'Nhật ký thay đổi', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );
    return html;
  }

  function bindDetailEvents(container) {
    container.addEventListener('click', function(e) {
      // Tab switching
      var tab = e.target.closest('[data-tab]');
      if (tab) { state.activeTab = tab.getAttribute('data-tab'); renderDetailScreen(container); return; }

      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.getAttribute('data-action');

      if (act === 'back-to-queue') { state.screen = 'queue'; state.record = null; state.error = null; render(container); return; }
      if (act === 'reload-detail') { state.error = null; loadDetail(container); return; }
      if (act === 'add-comment') { submitComment(container); return; }
      if (act === 'export') { handleExport(action.getAttribute('data-format'), state.recordId); return; }

      // Workflow actions
      var workflowActions = ['classify', 'assess-impact', 'route-approval', 'approve', 'launch-implementation', 'verify-effectiveness', 'close', 'cancel'];
      if (workflowActions.indexOf(act) !== -1) {
        executeAction(act, container);
        return;
      }
    });
  }

  function submitComment(container) {
    var textarea = container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    var text = textarea.value.trim();
    apiCall('eqms_change_controls_comments', { id: state.recordId, text: text }).then(function(res) {
      if (res.success !== false) {
        textarea.value = '';
        loadDetail(container);
      }
    });
  }

  function executeAction(actionKey, container) {
    var id = state.recordId || (state.record ? (state.record.change_control_id || state.record.id) : '');
    if (!id) return;
    var endpoint = 'eqms_change_controls_action_' + actionKey.replace(/-/g, '_');
    apiCall(endpoint, {
      id: id,
      version: state.record ? state.record.version : undefined
    }).then(function(res) {
      if (res.success !== false) {
        loadDetail(container);
      } else {
        var msg = (res.error && res.error.message) || res.message || 'Action failed';
        if (container && container.querySelector) {
          container.querySelector('.eqms-tab-content').innerHTML = (ui.renderRichErrorState || ui.renderErrorState)(msg, 'reload-detail');
        }
      }
    }).catch(function(err) {
      if (container && container.querySelector) {
        container.querySelector('.eqms-tab-content').innerHTML = (ui.renderRichErrorState || ui.renderErrorState)(err.message, 'reload-detail');
      }
    });
  }

  function handleExport(format, recordId) {
    var payload = { format: format };
    if (recordId) payload.id = recordId;
    apiCall(recordId ? 'eqms_change_controls_export' : 'eqms_change_controls_export', payload)
      .then(function(res) {
        if (res.data && res.data.download_url) {
          window.open(res.data.download_url, '_blank');
        }
      });
  }

  // =========================================================================
  // SCREEN 3: CREATE (WIZARD)
  // =========================================================================
  function resetWizardData() {
    state.wizardData = {
      title: '', change_type: '', description: '', justification: '',
      urgency: 'routine', regulatory_impact: false, change_category: 'minor',
      impact_matrix: IMPACT_AREAS.map(function(a) {
        return { area: T(a.label), area_key: a.key, impacted: false, description: '', severity: 'low', mitigation: '' };
      }),
      scope: ''
    };
  }

  function renderCreateScreen(container) {
    var stepBody = '';
    if (state.wizardStep === 0) stepBody = renderWizardStep1();
    else if (state.wizardStep === 1) stepBody = renderWizardStep2();
    else if (state.wizardStep === 2) stepBody = renderWizardStep3();
    else if (state.wizardStep === 3) stepBody = renderWizardStep4();

    var html = '<div class="eqms-module-page">';
    html += renderBackButton();
    html += '<h2 class="eqms-page-title">' + T({ vi: 'Tạo yêu cầu thay đổi mới', en: 'New Change Request' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, stepBody, { saveDraft: true });
    html += '</div>';

    container.innerHTML = html;
    bindWizardEvents(container);
  }

  // Step 1: Change Request
  function renderWizardStep1() {
    var d = state.wizardData;
    var html = '';
    html += ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề', en: 'Title' }, type: 'text', value: d.title, required: true, placeholder: { vi: 'Nhập tiêu đề thay đổi...', en: 'Enter change title...' } });
    html += ui.renderFormField({ key: 'change_type', label: { vi: 'Loại thay đổi', en: 'Change Type' }, type: 'select', value: d.change_type, required: true, options: CHANGE_TYPES });
    html += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description, required: true, placeholder: { vi: 'Mô tả chi tiết thay đổi...', en: 'Describe the change in detail...' } });
    html += ui.renderFormField({ key: 'justification', label: { vi: 'Lý do thay đổi', en: 'Justification' }, type: 'textarea', value: d.justification, required: true, placeholder: { vi: 'Tại sao cần thay đổi?', en: 'Why is this change needed?' } });
    return html;
  }

  // Step 2: Classification
  function renderWizardStep2() {
    var d = state.wizardData;
    var html = '';
    html += ui.renderFormField({ key: 'urgency', label: { vi: 'Mức độ khẩn cấp', en: 'Urgency' }, type: 'select', value: d.urgency, required: true, options: URGENCY_OPTIONS });
    html += ui.renderFormField({ key: 'change_category', label: { vi: 'Phân loại thay đổi', en: 'Change Category' }, type: 'select', value: d.change_category, required: true, options: CHANGE_CATEGORIES });
    // Regulatory impact as select yes/no
    html += ui.renderFormField({ key: 'regulatory_impact', label: { vi: 'Tác động quy định', en: 'Regulatory Impact' }, type: 'select', value: d.regulatory_impact ? 'yes' : 'no', required: true, options: [
      { value: 'no', label: { vi: 'Không', en: 'No' } },
      { value: 'yes', label: { vi: 'Có', en: 'Yes' } }
    ] });
    html += ui.renderFormField({ key: 'scope', label: { vi: 'Phạm vi', en: 'Scope' }, type: 'textarea', value: d.scope, placeholder: { vi: 'Mô tả phạm vi ảnh hưởng...', en: 'Describe affected scope...' } });
    return html;
  }

  // Step 3: Impact Assessment
  function renderWizardStep3() {
    var matrix = state.wizardData.impact_matrix;
    var html = '<div class="eqms-section">';
    html += '<div class="eqms-section-header"><span>' + T({ vi: 'Ma trận đánh giá tác động', en: 'Impact Assessment Matrix' }) + '</span></div>';
    html += '<div class="eqms-section-body">';
    html += '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
    html += '<thead><tr>';
    html += '<th>' + T({ vi: 'Lĩnh vực', en: 'Area' }) + '</th>';
    html += '<th style="width:80px;text-align:center">' + T({ vi: 'Tác động?', en: 'Impacted?' }) + '</th>';
    html += '<th>' + T({ vi: 'Mô tả tác động', en: 'Impact Description' }) + '</th>';
    html += '<th style="width:120px">' + T({ vi: 'Mức độ', en: 'Severity' }) + '</th>';
    html += '<th>' + T({ vi: 'Biện pháp giảm thiểu', en: 'Mitigation' }) + '</th>';
    html += '</tr></thead><tbody>';

    matrix.forEach(function(row, idx) {
      html += '<tr data-impact-row="' + idx + '">';
      html += '<td><strong>' + esc(row.area) + '</strong></td>';
      html += '<td style="text-align:center"><input type="checkbox" data-impact-field="impacted" data-idx="' + idx + '"' + (row.impacted ? ' checked' : '') + '></td>';
      html += '<td><input type="text" class="eqms-form-input" data-impact-field="description" data-idx="' + idx + '" value="' + esc(row.description) + '" placeholder="' + T({ vi: 'Mô tả...', en: 'Describe...' }) + '" style="width:100%"></td>';
      html += '<td><select class="eqms-form-select" data-impact-field="severity" data-idx="' + idx + '" style="width:100%"' +
        ' data-eqms-reference="eqms.severity" data-current-value="' + esc(row.severity || '') + '"' +
        ' data-empty-label="' + esc(T({ vi: 'Chọn...', en: 'Select...' })) + '" disabled>' +
        '<option value="">' + esc(T({ vi: 'Đang tải dữ liệu DB...', en: 'Loading DB data...' })) + '</option>' +
        (row.severity ? '<option value="' + esc(row.severity) + '" selected>' + esc(row.severity) + '</option>' : '') +
        '</select></td>';
      html += '<td><input type="text" class="eqms-form-input" data-impact-field="mitigation" data-idx="' + idx + '" value="' + esc(row.mitigation) + '" placeholder="' + T({ vi: 'Biện pháp...', en: 'Mitigation...' }) + '" style="width:100%"></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div></div>';
    return html;
  }

  // Step 4: Review & Submit
  function renderWizardStep4() {
    var d = state.wizardData;
    var html = '';

    html += ui.renderSection({ vi: 'Yêu cầu thay đổi', en: 'Change Request' },
      ui.renderFieldGrid([
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: d.title },
        { label: { vi: 'Loại thay đổi', en: 'Change Type' }, value: d.change_type, badge: true },
        { label: { vi: 'Mô tả', en: 'Description' }, value: d.description },
        { label: { vi: 'Lý do', en: 'Justification' }, value: d.justification }
      ])
    );

    html += ui.renderSection({ vi: 'Phân loại', en: 'Classification' },
      ui.renderFieldGrid([
        { label: { vi: 'Mức độ khẩn cấp', en: 'Urgency' }, value: d.urgency, badge: true },
        { label: { vi: 'Phân loại', en: 'Category' }, value: d.change_category, badge: true },
        { label: { vi: 'Tác động quy định', en: 'Regulatory Impact' }, value: d.regulatory_impact ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Phạm vi', en: 'Scope' }, value: d.scope }
      ])
    );

    // Impact matrix summary
    var impactedAreas = d.impact_matrix.filter(function(r) { return r.impacted; });
    html += ui.renderSection({ vi: 'Đánh giá tác động', en: 'Impact Assessment' }, function() {
      if (!impactedAreas.length) {
        return '<div style="padding:8px;color:var(--hm-text-secondary)">' + T({ vi: 'Không có lĩnh vực bị ảnh hưởng', en: 'No areas impacted' }) + '</div>';
      }
      var tableHtml = '<div class="eqms-grid-wrapper"><table class="eqms-grid">';
      tableHtml += '<thead><tr><th>' + T({ vi: 'Lĩnh vực', en: 'Area' }) + '</th><th>' + T({ vi: 'Mức độ', en: 'Severity' }) + '</th><th>' + T({ vi: 'Mô tả', en: 'Description' }) + '</th></tr></thead><tbody>';
      impactedAreas.forEach(function(r) {
        tableHtml += '<tr><td><strong>' + esc(r.area) + '</strong></td>';
        tableHtml += '<td><span class="eqms-badge ' + slugify(r.severity) + '">' + esc(r.severity) + '</span></td>';
        tableHtml += '<td>' + esc(r.description || '—') + '</td></tr>';
      });
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    }());

    return html;
  }

  function bindWizardEvents(container) {
    container.addEventListener('click', function(e) {
      var action = e.target.closest('[data-action]');
      if (!action) return;
      var act = action.getAttribute('data-action');

      if (act === 'back-to-queue') { state.screen = 'queue'; state.error = null; render(container); return; }
      if (act === 'wizard-next') { collectWizardFields(container); if (validateWizardStep()) { state.wizardStep++; renderCreateScreen(container); } return; }
      if (act === 'wizard-back') { collectWizardFields(container); if (state.wizardStep > 0) { state.wizardStep--; renderCreateScreen(container); } return; }
      if (act === 'wizard-save-draft') { collectWizardFields(container); saveDraft(container); return; }
      if (act === 'wizard-submit') { collectWizardFields(container); submitChangeControl(container); return; }
    });

    // Track impact matrix changes in real time
    container.addEventListener('change', function(e) {
      var impactField = e.target.closest('[data-impact-field]');
      if (impactField) {
        var idx = parseInt(impactField.getAttribute('data-idx'), 10);
        var field = impactField.getAttribute('data-impact-field');
        if (field === 'impacted') {
          state.wizardData.impact_matrix[idx].impacted = impactField.checked;
        } else {
          state.wizardData.impact_matrix[idx][field] = impactField.value;
        }
      }
    });
  }

  function collectWizardFields(container) {
    var fields = container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key === 'regulatory_impact') {
        state.wizardData.regulatory_impact = el.value === 'yes';
      } else if (state.wizardData.hasOwnProperty(key)) {
        state.wizardData[key] = el.value;
      }
    });
    // Collect impact matrix fields
    var impactInputs = container.querySelectorAll('[data-impact-field]');
    impactInputs.forEach(function(el) {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var field = el.getAttribute('data-impact-field');
      if (!isNaN(idx) && state.wizardData.impact_matrix[idx]) {
        if (field === 'impacted') {
          state.wizardData.impact_matrix[idx].impacted = el.checked;
        } else {
          state.wizardData.impact_matrix[idx][field] = el.value;
        }
      }
    });
  }

  function validateWizardStep() {
    var d = state.wizardData;
    if (state.wizardStep === 0) {
      if (!d.title.trim()) { showToast(T({ vi: 'Vui lòng nhập tiêu đề', en: 'Please enter a title' }), 'warning'); return false; }
      if (!d.change_type) { showToast(T({ vi: 'Vui lòng chọn loại thay đổi', en: 'Please select a change type' }), 'warning'); return false; }
      if (!d.description.trim()) { showToast(T({ vi: 'Vui lòng nhập mô tả', en: 'Please enter a description' }), 'warning'); return false; }
      if (!d.justification.trim()) { showToast(T({ vi: 'Vui lòng nhập lý do', en: 'Please enter a justification' }), 'warning'); return false; }
    }
    if (state.wizardStep === 1) {
      if (!d.urgency) { showToast(T({ vi: 'Vui lòng chọn mức độ khẩn cấp', en: 'Please select urgency' }), 'warning'); return false; }
      if (!d.change_category) { showToast(T({ vi: 'Vui lòng chọn phân loại', en: 'Please select a category' }), 'warning'); return false; }
    }
    return true;
  }

  function saveDraft(container) {
    var d = state.wizardData;
    apiCall('eqms_change_controls_create', {
      title: d.title,
      change_type: d.change_type || 'document',
      change_category: d.change_category || 'minor',
      justification: d.justification,
      description: d.description,
      risk_level: deriveRiskLevel(d),
      status: 'draft'
    }).then(function(res) {
      if (res.success !== false && res.data) {
        showToast(T({ vi: 'Đã lưu nháp', en: 'Draft saved' }), 'success');
        state.screen = 'detail';
        state.recordId = res.data.change_control_id;
        state.activeTab = 'summary';
        render(container);
      } else {
        showToast((res.error && res.error.message) || T({ vi: 'Lỗi khi lưu', en: 'Error saving' }), 'error');
      }
    }).catch(function(err) {
      showToast(err.message || 'Error', 'error');
    });
  }

  function submitChangeControl(container) {
    var d = state.wizardData;
    apiCall('eqms_change_controls_create', {
      title: d.title,
      change_type: d.change_type || 'document',
      change_category: d.change_category || 'minor',
      justification: d.justification,
      description: d.description,
      risk_level: deriveRiskLevel(d),
      urgency: d.urgency,
      regulatory_impact: d.regulatory_impact,
      scope: d.scope,
      impact_assessment: d.impact_matrix
    }).then(function(res) {
      if (res.success !== false && res.data) {
        showToast(T({ vi: 'Đã gửi yêu cầu thay đổi', en: 'Change request submitted' }), 'success');
        state.screen = 'detail';
        state.recordId = res.data.change_control_id;
        state.activeTab = 'summary';
        render(container);
      } else {
        showToast((res.error && res.error.message) || T({ vi: 'Lỗi khi gửi', en: 'Error submitting' }), 'error');
      }
    }).catch(function(err) {
      showToast(err.message || 'Error', 'error');
    });
  }

  function deriveRiskLevel(d) {
    var impacted = d.impact_matrix.filter(function(r) { return r.impacted; });
    var hasCritical = impacted.some(function(r) { return r.severity === 'critical'; });
    var hasHigh = impacted.some(function(r) { return r.severity === 'high'; });
    if (hasCritical || (d.regulatory_impact && impacted.length >= 3)) return 'critical';
    if (hasHigh || impacted.length >= 4) return 'high';
    if (impacted.length >= 2) return 'medium';
    return 'low';
  }

  // =========================================================================
  // SCREEN 4: ANALYTICS
  // =========================================================================
  function loadAnalytics(container) {
    container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    apiCall('eqms_change_controls_metrics', {}, 'GET').then(function(res) {
      if (res.success !== false && res.data) {
        state.metrics = res.data.metrics || res.data;
      } else {
        state.metrics = {};
      }
      renderAnalyticsScreen(container);
    }).catch(function() {
      state.metrics = {};
      renderAnalyticsScreen(container);
    });
  }

  function renderAnalyticsScreen(container) {
    var m = state.metrics || {};
    var byStatus = m.by_status || [];
    var byType = m.by_type || [];
    var byRisk = m.by_risk_level || [];

    var totalRecords = byStatus.reduce(function(sum, r) { return sum + (parseInt(r.count, 10) || 0); }, 0);
    var openRecords = byStatus.filter(function(r) { return r.status !== 'closed' && r.status !== 'cancelled'; }).reduce(function(sum, r) { return sum + (parseInt(r.count, 10) || 0); }, 0);
    var closedRecords = byStatus.filter(function(r) { return r.status === 'closed'; }).reduce(function(sum, r) { return sum + (parseInt(r.count, 10) || 0); }, 0);
    var criticalCount = byRisk.filter(function(r) { return r.risk_level === 'critical' || r.risk_level === 'high'; }).reduce(function(sum, r) { return sum + (parseInt(r.count, 10) || 0); }, 0);

    var html = '<div class="eqms-module-page">';
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn ghost sm" data-action="back-to-queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button>';
    html += '<h2 class="eqms-page-title" style="margin-left:12px">\u{1F4CA} ' + T({ vi: 'Phân tích Kiểm soát thay đổi', en: 'Change Control Analytics' }) + '</h2>';
    html += '</div></div>';

    // KPI Row
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng số', en: 'Total Changes' }, value: totalRecords, accent: 'info' },
      { label: { vi: 'Đang mở', en: 'Open' }, value: openRecords, accent: 'warning' },
      { label: { vi: 'Đã đóng', en: 'Closed' }, value: closedRecords, accent: 'success' },
      { label: { vi: 'Cao/Nghiêm trọng', en: 'High/Critical' }, value: criticalCount, accent: 'danger' }
    ]);

    // Chart: By Status
    var statusCols = [
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'count', label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
    ];
    html += ui.renderSection({ vi: 'Theo trạng thái', en: 'By Status' },
      ui.renderChartWithTableFallback('cc-status-chart', null, statusCols, byStatus, { defaultMode: 'table' })
    );

    // Chart: By Type
    var typeCols = [
      { key: 'change_type', label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
      { key: 'count', label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
    ];
    html += ui.renderSection({ vi: 'Phân bổ theo loại', en: 'Distribution by Type' },
      ui.renderChartWithTableFallback('cc-type-chart', null, typeCols, byType, { defaultMode: 'table' })
    );

    // Chart: By Risk Level
    var riskCols = [
      { key: 'risk_level', label: { vi: 'Mức rủi ro', en: 'Risk Level' }, type: 'priority' },
      { key: 'count', label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
    ];
    html += ui.renderSection({ vi: 'Phân bổ theo mức rủi ro', en: 'Distribution by Risk Level' },
      ui.renderChartWithTableFallback('cc-risk-chart', null, riskCols, byRisk, { defaultMode: 'table' })
    );

    html += '</div>';
    container.innerHTML = html;
    bindAnalyticsEvents(container);
  }

  function bindAnalyticsEvents(container) {
    container.addEventListener('click', function(e) {
      var action = e.target.closest('[data-action]');
      if (action) {
        var act = action.getAttribute('data-action');
        if (act === 'back-to-queue') { state.screen = 'queue'; render(container); return; }
      }
    });
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function showToast(msg, type) {
    if (typeof window._ecShowToast === 'function') window._ecShowToast(msg, type);
    else if (typeof window._fhShowToast === 'function') window._fhShowToast(msg, type);
    else { /* silent fallback */ }
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['change-control'] = {
    render: render,
    meta: MOD
  };

})();

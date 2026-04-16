/**
 * EQMS Document Control — Evidence Workspace + Controlled Copy
 * HESEM MOM Portal · 48-eqms-documents.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: documents
 * Archetype: evidence-workspace
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Register | Detail (9 tabs) | Create (wizard) | Analytics
 * Workflow: draft → in_review → approved → effective → superseded | obsolete
 * Actions: check-out, check-in, submit-review, approve, release,
 *          supersede, obsolete, request-acknowledgement, record-acknowledgement
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
    id:        'documents',
    version:   '1.0.0',
    archetype: 'evidence-workspace',
    endpoints: [
      'eqms_documents_query', 'eqms_documents_detail',
      'eqms_documents_create', 'eqms_documents_update',
      'eqms_documents_metrics', 'eqms_documents_audit',
      'eqms_documents_comments', 'eqms_documents_attachments',
      'eqms_documents_relationships', 'eqms_documents_signatures',
      'eqms_documents_export'
    ],
    workflow: ['draft', 'in_review', 'approved', 'effective', 'superseded', 'obsolete']
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var DOC_TYPES = [
    { value: 'SOP',    label: { vi: 'SOP',                   en: 'SOP' } },
    { value: 'WI',     label: { vi: 'Hướng dẫn công việc',   en: 'Work Instruction' } },
    { value: 'Form',   label: { vi: 'Biểu mẫu',             en: 'Form' } },
    { value: 'Spec',   label: { vi: 'Quy cách kỹ thuật',    en: 'Specification' } },
    { value: 'Manual', label: { vi: 'Sổ tay',               en: 'Manual' } },
    { value: 'Policy', label: { vi: 'Chính sách',           en: 'Policy' } }
  ];

  var STATUS_OPTIONS = MOD.workflow.map(function(s) {
    var labels = {
      draft:      { vi: 'Nháp',              en: 'Draft' },
      in_review:  { vi: 'Đang xem xét',      en: 'In Review' },
      approved:   { vi: 'Đã phê duyệt',      en: 'Approved' },
      effective:  { vi: 'Có hiệu lực',        en: 'Effective' },
      superseded: { vi: 'Đã thay thế',        en: 'Superseded' },
      obsolete:   { vi: 'Lỗi thời',           en: 'Obsolete' }
    };
    return { value: s, label: labels[s] || { vi: s, en: s } };
  });

  var CLASSIFICATION_OPTIONS = [
    { value: 'public',       label: { vi: 'Công khai',      en: 'Public' } },
    { value: 'internal',     label: { vi: 'Nội bộ',         en: 'Internal' } },
    { value: 'confidential', label: { vi: 'Bảo mật',        en: 'Confidential' } },
    { value: 'restricted',   label: { vi: 'Hạn chế',        en: 'Restricted' } }
  ];

  var SCREENS = { REGISTER: 'register', DETAIL: 'detail', CREATE: 'create', ANALYTICS: 'analytics' };
  var DETAIL_TABS = ['summary', 'content', 'review', 'copies', 'acknowledgment', 'training', 'change-control', 'revision-history', 'audit'];

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.REGISTER,
    // Register
    filters: {},
    records: [],
    pagination: { offset: 0, limit: 25, total: 0 },
    sortKey: 'updated_at',
    sortDir: 'desc',
    loading: false,
    error: null,
    // Detail
    activeTab: 'summary',
    record: null,
    recordId: null,
    auditEvents: [],
    signatures: [],
    comments: [],
    attachments: [],
    relationships: [],
    reviewCycles: [],
    controlledCopies: [],
    acknowledgments: [],
    trainingImpacts: [],
    changeLinks: [],
    revisionHistory: [],
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
      state.screen = SCREENS.DETAIL;
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
      state.screen = SCREENS.REGISTER;
      loadRegister();
    }

    paint();
  }

  function paint() {
    if (!_container) return;
    var html = '';

    switch (state.screen) {
      case SCREENS.REGISTER:  html = renderRegister();  break;
      case SCREENS.DETAIL:    html = renderDetail();    break;
      case SCREENS.CREATE:    html = renderCreate();    break;
      case SCREENS.ANALYTICS: html = renderAnalytics(); break;
    }

    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadRegister() {
    state.loading = true;
    state.error = null;
    paint();

    var payload = Object.assign({}, state.filters, {
      offset: state.pagination.offset,
      limit: state.pagination.limit,
      sort_key: state.sortKey,
      sort_dir: state.sortDir
    });

    apiCall('eqms_documents_query', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.records = res.data || [];
        state.pagination.total = res.total || res.data.length || 0;
      } else {
        state.error = res.message || 'Failed to load documents';
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

    apiCall('eqms_documents_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.record = res.data || {};
        state.reviewCycles = res.data.review_cycles || [];
        state.controlledCopies = res.data.controlled_copies || [];
        state.acknowledgments = res.data.acknowledgments || [];
        state.trainingImpacts = res.data.training_impacts || [];
        state.changeLinks = res.data.change_links || [];
        state.revisionHistory = res.data.revision_history || [];
      } else {
        state.error = res.message || 'Failed to load document';
      }
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });

    loadDetailSidebar(id);
  }

  function loadDetailSidebar(id) {
    apiCall('eqms_documents_audit', { id: id }).then(function(res) {
      if (res.success) { state.auditEvents = res.data || []; paint(); }
    });
    apiCall('eqms_documents_signatures', { id: id }).then(function(res) {
      if (res.success) { state.signatures = res.data || []; paint(); }
    });
    apiCall('eqms_documents_comments', { id: id }).then(function(res) {
      if (res.success) { state.comments = res.data || []; paint(); }
    });
    apiCall('eqms_documents_attachments', { id: id }).then(function(res) {
      if (res.success) { state.attachments = res.data || []; paint(); }
    });
    apiCall('eqms_documents_relationships', { id: id }).then(function(res) {
      if (res.success) { state.relationships = res.data || []; paint(); }
    });
  }

  function loadMetrics() {
    state.loading = true;
    paint();

    apiCall('eqms_documents_metrics', {}).then(function(res) {
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
  // SCREEN: REGISTER
  // =========================================================================
  function renderRegister() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải tài liệu...', en: 'Loading documents...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-register');

    var html = '';

    // KPI row
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng tài liệu',       en: 'Total Documents' },     value: fmt(state.pagination.total), accent: '' },
      { label: { vi: 'Có hiệu lực',          en: 'Effective' },           value: fmt(countByStatus('effective')), accent: 'success' },
      { label: { vi: 'Đang xem xét',         en: 'In Review' },           value: fmt(countByStatus('in_review')), accent: 'warning' },
      { label: { vi: 'Sắp hết hạn xem xét',  en: 'Review Due Soon' },    value: fmt(countReviewDue()), accent: 'danger' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="go-create">';
    html += '+ ' + T({ vi: 'Tạo tài liệu', en: 'New Document' });
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
        { key: 'doc_type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: DOC_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: STATUS_OPTIONS },
        { key: 'department', type: 'text', label: { vi: 'Phòng ban', en: 'Department' }, width: '140px' },
        { key: 'effective_from', type: 'date', label: { vi: 'Hiệu lực từ', en: 'Effective From' } }
      ]
    });

    // Data grid
    var columns = [
      { key: 'doc_id',         label: { vi: 'Mã tài liệu',   en: 'Doc ID' },        type: 'id', sortable: true },
      { key: 'title',          label: { vi: 'Tiêu đề',        en: 'Title' },          type: 'truncate', sortable: true },
      { key: 'doc_type',       label: { vi: 'Loại',           en: 'Type' },           type: 'badge', sortable: true },
      { key: 'revision',       label: { vi: 'Phiên bản',      en: 'Revision' },       sortable: true },
      { key: 'status',         label: { vi: 'Trạng thái',     en: 'Status' },         type: 'badge', sortable: true },
      { key: 'owner',          label: { vi: 'Chủ sở hữu',    en: 'Owner' },          sortable: true },
      { key: 'effective_date', label: { vi: 'Ngày hiệu lực',  en: 'Effective Date' }, type: 'date', sortable: true },
      { key: 'department',     label: { vi: 'Phòng ban',      en: 'Department' },     sortable: true }
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

  function countReviewDue() {
    var now = new Date();
    var thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return state.records.filter(function(r) {
      if (!r.next_review_date) return false;
      var diff = new Date(r.next_review_date) - now;
      return diff > 0 && diff < thirtyDays;
    }).length;
  }

  // =========================================================================
  // SCREEN: DETAIL
  // =========================================================================
  function renderDetail() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải chi tiết tài liệu...', en: 'Loading document details...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-detail');
    if (!state.record) return ui.renderEmptyState({ icon: '\uD83D\uDCC4', title: { vi: 'Không tìm thấy tài liệu', en: 'Document not found' } });

    var rec = state.record;
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-register" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to register' });
    html += '</button>';

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getDetailActions(rec),
      extraMeta: [
        { label: { vi: 'Loại tài liệu', en: 'Doc Type' }, value: rec.doc_type },
        { label: { vi: 'Phòng ban', en: 'Department' }, value: rec.department },
        { label: { vi: 'Phân loại', en: 'Classification' }, value: rec.classification },
        { label: { vi: 'Xem xét tiếp', en: 'Next Review' }, value: fmtDate(rec.next_review_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(MOD.workflow, rec.status);

    // Tabs
    var tabs = [
      { id: 'summary',          label: { vi: 'Tóm tắt',               en: 'Summary' } },
      { id: 'content',          label: { vi: 'Xem trước nội dung',     en: 'Content Preview' } },
      { id: 'review',           label: { vi: 'Xem xét / Phê duyệt',   en: 'Review / Approval' }, badge: state.reviewCycles.length || null },
      { id: 'copies',           label: { vi: 'Bản sao kiểm soát',      en: 'Controlled Copies' }, badge: state.controlledCopies.length || null },
      { id: 'acknowledgment',   label: { vi: 'Xác nhận đã đọc',        en: 'Acknowledgment' }, badge: countPendingAck() || null },
      { id: 'training',         label: { vi: 'Tác động đào tạo',       en: 'Training Impact' } },
      { id: 'change-control',   label: { vi: 'Kiểm soát thay đổi',     en: 'Change Control' } },
      { id: 'revision-history', label: { vi: 'Lịch sử phiên bản',      en: 'Revision History' } },
      { id: 'audit',            label: { vi: 'Kiểm toán',              en: 'Audit Trail' } }
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

    if (s === 'draft') {
      actions.push({ action: 'check-out', label: { vi: 'Check-out', en: 'Check Out' }, style: 'ghost' });
      actions.push({ action: 'submit-review', label: { vi: 'Gửi xem xét', en: 'Submit for Review' }, style: 'primary' });
    }
    if (s === 'in_review') {
      actions.push({ action: 'approve', label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'primary' });
    }
    if (s === 'approved') {
      actions.push({ action: 'release', label: { vi: 'Ban hành', en: 'Release' }, style: 'primary' });
    }
    if (s === 'effective') {
      actions.push({ action: 'request-acknowledgement', label: { vi: 'Yêu cầu xác nhận', en: 'Request Acknowledgement' }, style: 'secondary' });
      actions.push({ action: 'supersede', label: { vi: 'Thay thế', en: 'Supersede' }, style: 'ghost' });
      actions.push({ action: 'obsolete', label: { vi: 'Lỗi thời hoá', en: 'Obsolete' }, style: 'ghost' });
    }

    return actions;
  }

  function countPendingAck() {
    return state.acknowledgments.filter(function(a) { return a.status === 'pending' || a.status === 'overdue'; }).length;
  }

  // =========================================================================
  // DETAIL TABS
  // =========================================================================
  function renderDetailTab() {
    switch (state.activeTab) {
      case 'summary':          return renderSummaryTab();
      case 'content':          return renderContentTab();
      case 'review':           return renderReviewTab();
      case 'copies':           return renderCopiesTab();
      case 'acknowledgment':   return renderAcknowledgmentTab();
      case 'training':         return renderTrainingTab();
      case 'change-control':   return renderChangeControlTab();
      case 'revision-history': return renderRevisionHistoryTab();
      case 'audit':            return renderAuditTab();
      default:                 return '';
    }
  }

  // --- Summary Tab ---
  function renderSummaryTab() {
    var rec = state.record;
    return ui.renderSection({ vi: 'Thông tin tài liệu', en: 'Document Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã tài liệu',      en: 'Document ID' },      value: rec.doc_id,           mono: true },
        { label: { vi: 'Tiêu đề',           en: 'Title' },            value: rec.title },
        { label: { vi: 'Loại tài liệu',     en: 'Document Type' },    value: rec.doc_type,         badge: true },
        { label: { vi: 'Phiên bản',         en: 'Revision' },         value: rec.revision },
        { label: { vi: 'Trạng thái',        en: 'Status' },           value: rec.status,           badge: true },
        { label: { vi: 'Chủ sở hữu',       en: 'Owner' },            value: rec.owner },
        { label: { vi: 'Phòng ban',         en: 'Department' },       value: rec.department },
        { label: { vi: 'Ngày hiệu lực',     en: 'Effective Date' },   value: fmtDate(rec.effective_date) },
        { label: { vi: 'Xem xét tiếp theo', en: 'Next Review Date' }, value: fmtDate(rec.next_review_date) },
        { label: { vi: 'Phân loại',         en: 'Classification' },   value: rec.classification,   badge: true },
        { label: { vi: 'Thay thế cho',      en: 'Supersedes' },       value: rec.supersedes },
        { label: { vi: 'Mô tả',            en: 'Description' },      value: rec.description }
      ])
    );
  }

  // --- Content Preview Tab ---
  function renderContentTab() {
    var rec = state.record;
    var html = '';

    // Effective copy indicator
    if (rec.status === 'effective') {
      html += '<div class="eqms-notice success" style="margin-bottom:12px">';
      html += '<span class="eqms-badge effective" style="margin-right:8px">' + T({ vi: 'BẢN KIỂM SOÁT', en: 'CONTROLLED COPY' }) + '</span>';
      html += T({ vi: 'Đây là phiên bản có hiệu lực hiện tại. Mọi bản in đều là bản không kiểm soát.', en: 'This is the currently effective version. Printed copies are uncontrolled.' });
      html += '</div>';
    }

    if (rec.content_url) {
      html += '<div class="eqms-content-preview">';
      html += '<iframe src="' + esc(rec.content_url) + '" style="width:100%;min-height:600px;border:1px solid var(--hm-border-primary,#e2e8f0);border-radius:8px" title="' + esc(rec.title) + '"></iframe>';
      html += '</div>';
    } else if (rec.content_html) {
      html += '<div class="eqms-content-preview eqms-rendered-content" style="padding:24px;border:1px solid var(--hm-border-primary,#e2e8f0);border-radius:8px;min-height:300px">';
      html += rec.content_html;
      html += '</div>';
    } else {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDCC4',
        title: { vi: 'Chưa có nội dung', en: 'No content available' },
        desc: { vi: 'Tải lên hoặc soạn thảo nội dung cho tài liệu này', en: 'Upload or author content for this document' }
      });
    }

    return html;
  }

  // --- Review / Approval Tab ---
  function renderReviewTab() {
    var html = '';

    // Current review round indicator
    var currentRound = state.reviewCycles.length > 0
      ? state.reviewCycles[state.reviewCycles.length - 1]
      : null;

    if (currentRound) {
      html += '<div class="eqms-notice info" style="margin-bottom:12px">';
      html += T({ vi: 'Vòng xem xét hiện tại', en: 'Current Review Round' }) + ': ';
      html += '<strong>' + esc(currentRound.round || '1') + '</strong>';
      html += '</div>';
    }

    // Review cycle table
    var reviewColumns = [
      { key: 'reviewer',  label: { vi: 'Người xem xét',  en: 'Reviewer' } },
      { key: 'role',      label: { vi: 'Vai trò',         en: 'Role' } },
      { key: 'decision',  label: { vi: 'Quyết định',      en: 'Decision' },  type: 'badge' },
      { key: 'date',      label: { vi: 'Ngày',            en: 'Date' },      type: 'date' },
      { key: 'comments',  label: { vi: 'Nhận xét',        en: 'Comments' },  type: 'truncate' }
    ];

    html += ui.renderSection({ vi: 'Chu kỳ xem xét', en: 'Review Cycle' },
      ui.renderDataGrid(reviewColumns, state.reviewCycles, { selectable: false }),
      {
        headerActions: state.record && state.record.status === 'in_review'
          ? '<button class="eqms-btn secondary sm" data-action="add-reviewer">+ ' + T({ vi: 'Thêm người xem xét', en: 'Add Reviewer' }) + '</button>'
          : ''
      }
    );

    return html;
  }

  // --- Controlled Copies Tab ---
  function renderCopiesTab() {
    var copyColumns = [
      { key: 'copy_number',       label: { vi: 'Bản sao #',       en: 'Copy #' },           type: 'id' },
      { key: 'holder',            label: { vi: 'Người giữ',       en: 'Holder' } },
      { key: 'distribution_date', label: { vi: 'Ngày phát hành',  en: 'Distribution Date' }, type: 'date' },
      { key: 'format',            label: { vi: 'Định dạng',       en: 'Format' },            type: 'badge' },
      { key: 'location',          label: { vi: 'Vị trí',          en: 'Location' } },
      { key: 'status',            label: { vi: 'Trạng thái',      en: 'Status' },            type: 'badge' }
    ];

    return ui.renderSection({ vi: 'Sổ đăng ký bản sao kiểm soát', en: 'Controlled Copy Register' },
      ui.renderDataGrid(copyColumns, state.controlledCopies, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="issue-copy">+ ' + T({ vi: 'Phát hành bản sao', en: 'Issue New Copy' }) + '</button>'
      }
    );
  }

  // --- Acknowledgment Dashboard Tab ---
  function renderAcknowledgmentTab() {
    var html = '';
    var total = state.acknowledgments.length;
    var acknowledged = state.acknowledgments.filter(function(a) { return a.status === 'acknowledged'; }).length;
    var pending = state.acknowledgments.filter(function(a) { return a.status === 'pending'; }).length;
    var overdue = state.acknowledgments.filter(function(a) { return a.status === 'overdue'; }).length;
    var pct = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

    // Progress bar
    html += '<div class="eqms-section" style="margin-bottom:16px">';
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px">';
    html += '<span style="font-weight:600;font-size:14px">' + T({ vi: 'Tiến độ xác nhận', en: 'Acknowledgment Progress' }) + '</span>';
    html += '<div style="flex:1;height:12px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:6px;overflow:hidden">';
    html += '<div style="width:' + pct + '%;height:100%;background:var(--hm-accent-success,#22c55e);border-radius:6px;transition:width 0.3s"></div>';
    html += '</div>';
    html += '<span style="font-weight:600;font-size:14px;min-width:60px;text-align:right">' + acknowledged + ' / ' + total + '</span>';
    html += '</div>';

    // Summary badges
    html += '<div style="display:flex;gap:12px;padding:0 16px 12px">';
    html += '<span class="eqms-badge acknowledged">' + T({ vi: 'Đã xác nhận', en: 'Acknowledged' }) + ': ' + acknowledged + '</span>';
    html += '<span class="eqms-badge pending">' + T({ vi: 'Chờ xác nhận', en: 'Pending' }) + ': ' + pending + '</span>';
    if (overdue > 0) {
      html += '<span class="eqms-badge overdue">' + T({ vi: 'Quá hạn', en: 'Overdue' }) + ': ' + overdue + '</span>';
    }
    html += '</div></div>';

    // Acknowledgment table
    var ackColumns = [
      { key: 'person',            label: { vi: 'Người',          en: 'Person' } },
      { key: 'role',              label: { vi: 'Vai trò',        en: 'Role' } },
      { key: 'department',        label: { vi: 'Phòng ban',      en: 'Department' } },
      { key: 'required_date',     label: { vi: 'Hạn yêu cầu',   en: 'Required Date' },     type: 'date' },
      { key: 'acknowledged_date', label: { vi: 'Ngày xác nhận',  en: 'Acknowledged Date' }, type: 'date' },
      { key: 'status',            label: { vi: 'Trạng thái',     en: 'Status' },            type: 'badge' }
    ];

    html += ui.renderSection({ vi: 'Chi tiết xác nhận', en: 'Acknowledgment Details' },
      ui.renderDataGrid(ackColumns, state.acknowledgments, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn secondary sm" data-action="send-reminder">' + T({ vi: 'Gửi nhắc nhở', en: 'Send Reminder' }) + '</button>'
      }
    );

    return html;
  }

  // --- Training Impact Tab ---
  function renderTrainingTab() {
    if (!state.trainingImpacts || !state.trainingImpacts.length) {
      return ui.renderEmptyState({
        icon: '\uD83C\uDF93',
        title: { vi: 'Chưa có tác động đào tạo', en: 'No training impact' },
        desc: { vi: 'Tài liệu này chưa kích hoạt yêu cầu đào tạo nào', en: 'This document has not triggered any training requirements' }
      });
    }

    var html = '';

    var trainingColumns = [
      { key: 'curriculum',    label: { vi: 'Chương trình',         en: 'Curriculum' } },
      { key: 'trainee',      label: { vi: 'Học viên',              en: 'Trainee' } },
      { key: 'status',       label: { vi: 'Trạng thái',           en: 'Status' },          type: 'badge' },
      { key: 'due_date',     label: { vi: 'Hạn hoàn thành',       en: 'Due Date' },        type: 'date' },
      { key: 'completed_at', label: { vi: 'Ngày hoàn thành',      en: 'Completed' },       type: 'date' }
    ];

    html += ui.renderSection({ vi: 'Bản ghi đào tạo tự động kích hoạt', en: 'Auto-triggered Training Records' },
      ui.renderDataGrid(trainingColumns, state.trainingImpacts, { selectable: false })
    );

    // Affected qualifications
    var qualImpacts = state.trainingImpacts.filter(function(t) { return t.qualification; });
    if (qualImpacts.length) {
      var qualColumns = [
        { key: 'qualification', label: { vi: 'Năng lực',         en: 'Qualification' } },
        { key: 'role',          label: { vi: 'Vai trò bị ảnh hưởng', en: 'Affected Role' } },
        { key: 'impact',        label: { vi: 'Mức ảnh hưởng',    en: 'Impact Level' }, type: 'badge' }
      ];
      html += ui.renderSection({ vi: 'Năng lực bị ảnh hưởng', en: 'Affected Qualifications' },
        ui.renderDataGrid(qualColumns, qualImpacts, { selectable: false })
      );
    }

    return html;
  }

  // --- Change Control Linkage Tab ---
  function renderChangeControlTab() {
    if (!state.changeLinks || !state.changeLinks.length) {
      return ui.renderEmptyState({
        icon: '\uD83D\uDD04',
        title: { vi: 'Chưa liên kết kiểm soát thay đổi', en: 'No linked change controls' },
        desc: { vi: 'Tài liệu này chưa liên kết với yêu cầu thay đổi nào', en: 'This document is not linked to any change requests' }
      });
    }

    var ccColumns = [
      { key: 'change_id',   label: { vi: 'Mã thay đổi',    en: 'Change ID' },    type: 'id' },
      { key: 'title',       label: { vi: 'Tiêu đề',        en: 'Title' },        type: 'truncate' },
      { key: 'type',        label: { vi: 'Loại',           en: 'Type' },         type: 'badge' },
      { key: 'status',      label: { vi: 'Trạng thái',     en: 'Status' },       type: 'badge' },
      { key: 'initiated_at', label: { vi: 'Ngày khởi tạo', en: 'Initiated' },    type: 'date' }
    ];

    return ui.renderSection({ vi: 'Liên kết kiểm soát thay đổi', en: 'Linked Change Controls' },
      ui.renderDataGrid(ccColumns, state.changeLinks, { selectable: false })
    );
  }

  // --- Revision History Tab ---
  function renderRevisionHistoryTab() {
    var revColumns = [
      { key: 'revision',    label: { vi: 'Phiên bản', en: 'Rev' },           type: 'id' },
      { key: 'date',        label: { vi: 'Ngày',      en: 'Date' },          type: 'date' },
      { key: 'author',      label: { vi: 'Tác giả',   en: 'Author' } },
      { key: 'description', label: { vi: 'Mô tả',     en: 'Description' },   type: 'truncate' },
      { key: 'status',      label: { vi: 'Trạng thái', en: 'Status' },       type: 'badge' }
    ];

    return ui.renderSection({ vi: 'Lịch sử phiên bản', en: 'Revision History' },
      ui.renderDataGrid(revColumns, state.revisionHistory, { selectable: false })
    );
  }

  // --- Audit Trail + Signatures + Attachments + Comments ---
  function renderAuditTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Chữ ký điện tử', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Soạn thảo', en: 'Prepared' },
        { vi: 'Xem xét', en: 'Reviewed' },
        { vi: 'Phê duyệt', en: 'Approved' }
      ])
    );

    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );

    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );

    html += ui.renderSection({ vi: 'Liên kết', en: 'Relationships' },
      (ui.renderLinkedRecordGraph || ui.renderRelationshipsPanel)(state.relationships)
    );

    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    return html;
  }

  // =========================================================================
  // SCREEN: CREATE (WIZARD)
  // =========================================================================
  function renderCreate() {
    var steps = [
      { label: { vi: 'Loại & Thông tin',        en: 'Type & Metadata' } },
      { label: { vi: 'Tải lên / Soạn thảo',     en: 'Upload / Author' } },
      { label: { vi: 'Lộ trình xem xét',        en: 'Route for Review' } },
      { label: { vi: 'Xem lại & Gửi',           en: 'Review & Submit' } }
    ];

    var bodyHtml = '';
    switch (state.wizardStep) {
      case 0: bodyHtml = renderWizardStep0(); break;
      case 1: bodyHtml = renderWizardStep1(); break;
      case 2: bodyHtml = renderWizardStep2(); break;
      case 3: bodyHtml = renderWizardStep3(); break;
    }

    var html = '<button class="eqms-btn ghost sm" data-action="go-register" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to register' });
    html += '</button>';

    html += ui.renderWizardShell(steps, state.wizardStep, bodyHtml, { saveDraft: true });

    return html;
  }

  // Step 1: Document Type & Metadata
  function renderWizardStep0() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Loại tài liệu & Thông tin cơ bản', en: 'Document Type & Basic Information' }) + '</h3>';

    html += ui.renderFormField({ key: 'doc_type', label: { vi: 'Loại tài liệu', en: 'Document Type' }, type: 'select', options: DOC_TYPES, value: d.doc_type, required: true });
    html += ui.renderFormField({ key: 'title', label: { vi: 'Tiêu đề tài liệu', en: 'Document Title' }, type: 'text', value: d.title, required: true, placeholder: { vi: 'Nhập tiêu đề...', en: 'Enter document title...' } });
    html += ui.renderFormField({ key: 'department', label: { vi: 'Phòng ban', en: 'Department' }, type: 'text', value: d.department, required: true });
    html += ui.renderFormField({ key: 'owner', label: { vi: 'Chủ sở hữu', en: 'Owner' }, type: 'text', value: d.owner, required: true });
    html += ui.renderFormField({ key: 'classification', label: { vi: 'Phân loại bảo mật', en: 'Security Classification' }, type: 'select', options: CLASSIFICATION_OPTIONS, value: d.classification || 'internal' });
    html += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description, placeholder: { vi: 'Mô tả ngắn gọn mục đích tài liệu...', en: 'Brief description of the document purpose...' } });
    html += ui.renderFormField({ key: 'effective_date', label: { vi: 'Ngày hiệu lực dự kiến', en: 'Target Effective Date' }, type: 'date', value: d.effective_date });
    html += ui.renderFormField({ key: 'next_review_date', label: { vi: 'Ngày xem xét tiếp theo', en: 'Next Review Date' }, type: 'date', value: d.next_review_date });

    html += '</div>';
    return html;
  }

  // Step 2: Upload / Author Content
  function renderWizardStep1() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Tải lên hoặc soạn thảo nội dung', en: 'Upload or Author Content' }) + '</h3>';

    // Upload zone
    html += '<div class="eqms-section" style="margin-bottom:16px">';
    html += '<div class="eqms-section-header"><span>' + T({ vi: 'Tải lên tệp', en: 'Upload File' }) + '</span></div>';
    html += '<div class="eqms-section-body">';
    html += '<div class="eqms-dropzone" data-action="upload-document" style="min-height:120px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;cursor:pointer">';
    html += '<span style="font-size:32px">\uD83D\uDCC1</span>';
    html += '<span>' + T({ vi: 'Kéo thả tệp hoặc nhấp để chọn (PDF, DOCX, XLSX)', en: 'Drag & drop or click to select (PDF, DOCX, XLSX)' }) + '</span>';
    if (d.uploaded_file) {
      html += '<span class="eqms-badge approved" style="margin-top:8px">\u2713 ' + esc(d.uploaded_file) + '</span>';
    }
    html += '</div></div></div>';

    // Supersedes reference
    html += ui.renderFormField({ key: 'supersedes', label: { vi: 'Thay thế cho tài liệu (nếu có)', en: 'Supersedes document (if any)' }, type: 'text', value: d.supersedes, placeholder: { vi: 'Nhập mã tài liệu cũ...', en: 'Enter old document ID...' } });

    html += '</div>';
    return html;
  }

  // Step 3: Route for Review
  function renderWizardStep2() {
    var d = state.wizardData;
    var reviewers = d.reviewers || [];
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Chỉ định người xem xét và phê duyệt', en: 'Assign Reviewers and Approvers' }) + '</h3>';

    // Reviewer list
    if (reviewers.length > 0) {
      var revColumns = [
        { key: 'name',     label: { vi: 'Họ tên',    en: 'Name' } },
        { key: 'role',     label: { vi: 'Vai trò',   en: 'Role' },     type: 'badge' },
        { key: 'due_date', label: { vi: 'Hạn chót',  en: 'Due Date' }, type: 'date' }
      ];
      html += ui.renderDataGrid(revColumns, reviewers, { selectable: false });
    } else {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDC65',
        title: { vi: 'Chưa có người xem xét', en: 'No reviewers assigned' },
        desc: { vi: 'Thêm người xem xét và phê duyệt cho tài liệu', en: 'Add reviewers and approvers for this document' }
      });
    }

    html += '<div style="display:flex;gap:8px;margin-top:16px">';
    html += '<button class="eqms-btn secondary sm" data-action="add-reviewer">+ ' + T({ vi: 'Thêm người xem xét', en: 'Add Reviewer' }) + '</button>';
    html += '<button class="eqms-btn ghost sm" data-action="add-approver">+ ' + T({ vi: 'Thêm người phê duyệt', en: 'Add Approver' }) + '</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // Step 4: Review & Submit
  function renderWizardStep3() {
    var d = state.wizardData;
    var html = '<div class="eqms-wizard-step-content">';
    html += '<h3 style="margin:0 0 16px">' + T({ vi: 'Xem lại thông tin trước khi gửi', en: 'Review Before Submission' }) + '</h3>';

    html += ui.renderFieldGrid([
      { label: { vi: 'Loại tài liệu',  en: 'Document Type' },  value: d.doc_type,        badge: true },
      { label: { vi: 'Tiêu đề',        en: 'Title' },          value: d.title },
      { label: { vi: 'Phòng ban',      en: 'Department' },     value: d.department },
      { label: { vi: 'Chủ sở hữu',    en: 'Owner' },          value: d.owner },
      { label: { vi: 'Phân loại',      en: 'Classification' }, value: d.classification },
      { label: { vi: 'Ngày hiệu lực',  en: 'Effective Date' }, value: fmtDate(d.effective_date) },
      { label: { vi: 'Thay thế cho',   en: 'Supersedes' },     value: d.supersedes },
      { label: { vi: 'Tệp tải lên',   en: 'Uploaded File' },  value: d.uploaded_file || T({ vi: 'Chưa có', en: 'None' }) },
      { label: { vi: 'Người xem xét',  en: 'Reviewers' },      value: (d.reviewers || []).length + ' ' + T({ vi: 'người', en: 'persons' }) }
    ]);

    // Description
    if (d.description) {
      html += ui.renderSection({ vi: 'Mô tả', en: 'Description' },
        '<p style="margin:0;color:var(--hm-text-secondary,#64748b)">' + esc(d.description) + '</p>'
      );
    }

    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Đang tải phân tích...', en: 'Loading analytics...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-analytics');

    var m = state.metrics || {};
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-register" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to register' });
    html += '</button>';

    html += '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600">' + T({ vi: 'Phân tích tài liệu', en: 'Document Analytics' }) + '</h2>';

    // KPIs
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng tài liệu',           en: 'Total Documents' },          value: fmt(m.total_documents || 0) },
      { label: { vi: 'Thời gian xem xét TB',     en: 'Avg Review Cycle Time' },    value: (m.avg_review_days || 0) + ' ' + T({ vi: 'ngày', en: 'days' }), accent: 'info' },
      { label: { vi: 'Xác nhận quá hạn',         en: 'Overdue Acknowledgments' },  value: fmt(m.overdue_acks || 0), accent: m.overdue_acks > 0 ? 'danger' : '' },
      { label: { vi: 'Tỉ lệ thay thế',          en: 'Supersede Rate' },           value: (m.supersede_rate || 0) + '%' }
    ]);

    // Document aging chart
    var agingData = m.aging || [];
    var agingColumns = [
      { key: 'range',    label: { vi: 'Khoảng thời gian', en: 'Age Range' } },
      { key: 'count',    label: { vi: 'Số lượng',         en: 'Count' },    type: 'number' },
      { key: 'percent',  label: { vi: 'Tỉ lệ',           en: 'Percent' },  render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += ui.renderChartWithTableFallback(
      'doc-aging-chart',
      null,
      agingColumns,
      agingData,
      { defaultMode: 'table' }
    );

    // Documents by type pie chart / table
    var typeData = m.by_type || [];
    var typeColumns = [
      { key: 'type',    label: { vi: 'Loại tài liệu',  en: 'Document Type' }, type: 'badge' },
      { key: 'count',   label: { vi: 'Số lượng',        en: 'Count' },         type: 'number' },
      { key: 'percent', label: { vi: 'Tỉ lệ',          en: 'Percent' },       render: function(v) { return esc((v || 0) + '%'); } }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Tài liệu theo loại', en: 'Documents by Type' },
      ui.renderChartWithTableFallback('doc-by-type-chart', null, typeColumns, typeData, { defaultMode: 'table' })
    );
    html += '</div>';

    // Review cycle time trend
    var reviewTrend = m.review_cycle_trend || [];
    var reviewTrendColumns = [
      { key: 'period',   label: { vi: 'Giai đoạn',              en: 'Period' } },
      { key: 'avg_days', label: { vi: 'Thời gian TB (ngày)',    en: 'Avg Days' },    type: 'number' },
      { key: 'count',    label: { vi: 'Số xem xét',             en: 'Reviews' },     type: 'number' }
    ];

    html += '<div style="margin-top:16px">';
    html += ui.renderSection({ vi: 'Xu hướng thời gian xem xét', en: 'Review Cycle Time Trend' },
      ui.renderChartWithTableFallback('review-cycle-chart', null, reviewTrendColumns, reviewTrend, { defaultMode: 'table' })
    );
    html += '</div>';

    // Overdue acknowledgments detail
    var overdueAcks = m.overdue_acknowledgments || [];
    if (overdueAcks.length > 0) {
      var overdueColumns = [
        { key: 'doc_id',        label: { vi: 'Mã tài liệu',   en: 'Doc ID' },      type: 'id' },
        { key: 'title',         label: { vi: 'Tiêu đề',       en: 'Title' },       type: 'truncate' },
        { key: 'person',        label: { vi: 'Người',          en: 'Person' } },
        { key: 'required_date', label: { vi: 'Hạn yêu cầu',   en: 'Required Date' }, type: 'date' },
        { key: 'days_overdue',  label: { vi: 'Quá hạn (ngày)', en: 'Days Overdue' }, type: 'number' }
      ];

      html += '<div style="margin-top:16px">';
      html += ui.renderSection({ vi: 'Xác nhận quá hạn', en: 'Overdue Acknowledgments' },
        ui.renderDataGrid(overdueColumns, overdueAcks, { selectable: false })
      );
      html += '</div>';
    }

    return html;
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function(e) {
      // Tab switching
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        state.activeTab = tab.getAttribute('data-tab');
        paint();
        return;
      }

      // Sort
      var sortTh = e.target.closest('th[data-sort]');
      if (sortTh && state.screen === SCREENS.REGISTER) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        state.pagination.offset = 0;
        loadRegister();
        return;
      }

      // Row click → detail
      var row = e.target.closest('tr[data-id]');
      if (row && state.screen === SCREENS.REGISTER && !e.target.closest('input[type="checkbox"]')) {
        var id = row.getAttribute('data-id');
        if (id) {
          state.screen = SCREENS.DETAIL;
          state.activeTab = 'summary';
          loadDetail(id);
        }
        return;
      }

      // Pagination
      var pageBtn = e.target.closest('[data-action="page"]');
      if (pageBtn) {
        var page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page > 0) {
          state.pagination.offset = (page - 1) * state.pagination.limit;
          loadRegister();
        }
        return;
      }

      // Actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'go-register':
          state.screen = SCREENS.REGISTER;
          state.record = null;
          state.recordId = null;
          loadRegister();
          break;

        case 'go-create':
          state.screen = SCREENS.CREATE;
          state.wizardStep = 0;
          state.wizardData = {};
          paint();
          break;

        case 'go-analytics':
          state.screen = SCREENS.ANALYTICS;
          loadMetrics();
          break;

        case 'retry-register':
          loadRegister();
          break;

        case 'retry-detail':
          if (state.recordId) loadDetail(state.recordId);
          break;

        case 'retry-analytics':
          loadMetrics();
          break;

        case 'apply-filters':
          collectFilters();
          state.pagination.offset = 0;
          loadRegister();
          break;

        case 'reset-filters':
          state.filters = {};
          state.pagination.offset = 0;
          loadRegister();
          break;

        case 'wizard-next':
          collectWizardData();
          if (state.wizardStep < 3) { state.wizardStep++; paint(); }
          break;

        case 'wizard-back':
          if (state.wizardStep > 0) { state.wizardStep--; paint(); }
          break;

        case 'wizard-save-draft':
          collectWizardData();
          saveDraft();
          break;

        case 'wizard-submit':
          collectWizardData();
          submitDocument();
          break;

        // Document-specific actions
        case 'check-out':
        case 'check-in':
        case 'submit-review':
        case 'approve':
        case 'release':
        case 'supersede':
        case 'obsolete':
        case 'request-acknowledgement':
        case 'record-acknowledgement':
          executeAction(action);
          break;

        case 'add-comment':
          postComment();
          break;

        case 'export':
          handleExport(actionEl.getAttribute('data-format'));
          break;

        case 'issue-copy':
        case 'add-reviewer':
        case 'add-approver':
        case 'send-reminder':
          // Placeholder for modal triggers
          break;
      }
    });
  }

  // =========================================================================
  // DATA COLLECTION
  // =========================================================================
  function collectFilters() {
    if (!_container) return;
    var selects = _container.querySelectorAll('[data-filter]');
    state.filters = {};
    selects.forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) state.filters[key] = val;
    });
  }

  function collectWizardData() {
    if (!_container) return;
    var fields = _container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
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
    apiCall('eqms_documents_update', { id: state.record.id, action: action }).then(function(res) {
      if (res.success) {
        loadDetail(state.record.id);
      }
    });
  }

  function saveDraft() {
    var payload = Object.assign({}, state.wizardData, { status: 'draft' });
    apiCall('eqms_documents_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.DETAIL;
        state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.doc_id);
      }
    });
  }

  function submitDocument() {
    var payload = Object.assign({}, state.wizardData, { action: 'submit-review' });
    apiCall('eqms_documents_create', payload).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.DETAIL;
        state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.doc_id);
      }
    });
  }

  function postComment() {
    if (!_container || !state.record) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    apiCall('eqms_documents_comments', { id: state.record.id, action: 'add', text: textarea.value.trim() }).then(function(res) {
      if (res.success) {
        state.comments = res.data || state.comments;
        textarea.value = '';
        paint();
      }
    });
  }

  function handleExport(format) {
    var payload = { format: format };
    if (state.screen === SCREENS.DETAIL && state.record) {
      payload.id = state.record.id;
    } else {
      payload.filters = state.filters;
    }
    apiCall('eqms_documents_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['documents'] = { render: render, meta: MOD };

})();

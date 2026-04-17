/**
 * EQMS First Article Inspection (FAI) — AS9102B / IATF 16949 §8.3.5
 * HESEM MOM Portal - 64-eqms-fai.js
 *
 * Archetype: approval-workflow with characteristics sub-list
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
    id:        'fai',
    version:   '1.0.0',
    archetype: 'approval-workflow',
    label:     { vi: 'Kiểm tra mẫu đầu tiên (FAI)', en: 'First Article Inspection' },
    icon:      '\uD83D\uDD0E'
  };

  var WORKFLOW_STATES = ['draft','submitted','under_review','revision_required','approved','rejected','closed','revoked'];

  var STATE_LABELS = {
    draft:              { vi: 'Nháp',             en: 'Draft' },
    submitted:          { vi: 'Đã gửi',           en: 'Submitted' },
    under_review:       { vi: 'Đang xem xét',     en: 'Under Review' },
    revision_required:  { vi: 'Cần chỉnh sửa',   en: 'Revision Required' },
    approved:           { vi: 'Đã phê duyệt',     en: 'Approved' },
    rejected:           { vi: 'Từ chối',          en: 'Rejected' },
    closed:             { vi: 'Đã đóng',          en: 'Closed' },
    revoked:            { vi: 'Đã thu hồi',       en: 'Revoked' }
  };

  var FAI_TYPE_OPTIONS = [
    { value: 'new_part',        label: { vi: 'Phần mới',           en: 'New Part' } },
    { value: 'design_change',   label: { vi: 'Thay đổi thiết kế',  en: 'Design Change' } },
    { value: 'process_change',  label: { vi: 'Thay đổi quy trình', en: 'Process Change' } },
    { value: 'tooling_change',  label: { vi: 'Thay đổi khuôn',    en: 'Tooling Change' } },
    { value: 'new_supplier',    label: { vi: 'Nhà cung cấp mới',  en: 'New Supplier' } },
    { value: 'requalification', label: { vi: 'Tái chứng nhận',    en: 'Requalification' } }
  ];

  var FAI_RESULT_OPTIONS = [
    { value: 'pass',        label: { vi: 'Đạt',           en: 'Pass' } },
    { value: 'conditional', label: { vi: 'Có điều kiện',  en: 'Conditional' } },
    { value: 'fail',        label: { vi: 'Không đạt',     en: 'Fail' } },
    { value: 'pending',     label: { vi: 'Chờ kết quả',  en: 'Pending' } }
  ];

  var STATE_ACTIONS = {
    draft:             [{ action: 'submit',           label: { vi: 'Gửi xét duyệt',   en: 'Submit' },           style: 'primary' }],
    submitted:         [{ action: 'start-review',     label: { vi: 'Bắt đầu xem xét', en: 'Start Review' },     style: 'primary' }],
    under_review:      [
      { action: 'approve',          label: { vi: 'Phê duyệt',       en: 'Approve' },          style: 'success' },
      { action: 'reject',           label: { vi: 'Từ chối',         en: 'Reject' },           style: 'danger' },
      { action: 'request-revision', label: { vi: 'Yêu cầu chỉnh sửa', en: 'Request Revision' }, style: 'secondary' }
    ],
    revision_required: [{ action: 'submit-revision', label: { vi: 'Gửi lại bản chỉnh sửa', en: 'Submit Revision' }, style: 'primary' }],
    approved:          [
      { action: 'close',  label: { vi: 'Đóng',    en: 'Close' },  style: 'primary' },
      { action: 'revoke', label: { vi: 'Thu hồi', en: 'Revoke' }, style: 'danger' }
    ]
  };

  var DETAIL_TABS = [
    { id: 'summary',         label: { vi: 'Tóm tắt',       en: 'Summary' } },
    { id: 'characteristics', label: { vi: 'Đặc tính',      en: 'Characteristics' } },
    { id: 'related',         label: { vi: 'Liên quan',     en: 'Related' } },
    { id: 'audit',           label: { vi: 'Nhật ký',       en: 'Audit Trail' } },
    { id: 'attachments',     label: { vi: 'Đính kèm',      en: 'Attachments' } },
    { id: 'comments',        label: { vi: 'Bình luận',     en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Thông tin phần',     en: 'Part Information' } },
    { label: { vi: 'Chi tiết FAI',       en: 'FAI Details' } },
    { label: { vi: 'Xem lại & Gửi',    en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'created_at', sortDir: 'desc',
    page: 1, pageSize: 25, items: [], totalItems: 0, selectedIds: [],
    loaded: false, loading: false, error: null,
    recordId: null, record: null, activeTab: 'summary', tabData: {},
    wizardStep: 0, wizardData: {}, wizardErrors: {},
    metrics: null,
    charForm: { open: false, data: {} }
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
    var html = '<div class="eqms-module eqms-fai">';
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
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'Queue' }, icon: '\uD83D\uDD0E' },
     { id: 'analytics', label: { vi: 'Phân tích', en: 'Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    if (state.screen === 'queue') html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo FAI', en: 'New FAI' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'fai_type', type: 'select', label: { vi: 'Loại FAI', en: 'FAI Type' }, options: FAI_TYPE_OPTIONS },
        { key: 'fai_result', type: 'select', label: { vi: 'Kết quả', en: 'Result' }, options: FAI_RESULT_OPTIONS },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã, mã phần, tiêu đề...', en: 'ID, part number, title...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải danh sách FAI...', en: 'Loading FAI records...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'fai_number', type: 'id', label: { vi: 'Mã FAI', en: 'FAI ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.fai_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'title',                 label: { vi: 'Tiêu đề', en: 'Title' }, type: 'truncate' },
        { key: 'fai_type',              label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'part_number',           label: { vi: 'Mã phần', en: 'Part No.' }, mono: true },
        { key: 'characteristics_count', label: { vi: 'Đặc tính', en: 'Chars' } },
        { key: 'passed_count',          label: { vi: 'Đạt', en: 'Pass' } },
        { key: 'failed_count',          label: { vi: 'Không đạt', en: 'Fail' } },
        { key: 'fai_result',            label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' },
        { key: 'status',                label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
        { key: 'created_at',            label: { vi: 'Ngày tạo', en: 'Created' }, type: 'date' }
      ];
      html += ui.renderDataGrid(columns, state.items, { selectable: false, sortKey: state.sortKey, sortDir: state.sortDir });
      html += ui.renderPagination({ total: state.totalItems, offset: (state.page - 1) * state.pageSize, limit: state.pageSize });
    }
    html += '</div>';
    return html;
  }

  function renderDetailView() {
    if (!state.record) {
      return state.loading
        ? ui.renderLoadingState({ vi: 'Đang tải FAI...', en: 'Loading FAI...' })
        : ui.renderEmptyState({ icon: '\uD83D\uDD0E', title: { vi: 'Không tìm thấy', en: 'Not found' } });
    }
    var r = state.record;
    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += ui.renderIdentityHeader({
      record_id: r.fai_number, title: r.title,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Loại FAI', en: 'FAI Type' }, value: r.fai_type },
           { label: { vi: 'Mã phần', en: 'Part No.' }, value: r.part_number },
           { label: { vi: 'Kết quả', en: 'Result' }, value: r.fai_result }
         ]
    });
    html += ui.renderStateTimeline(['draft','submitted','under_review','approved','closed'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':         return renderSummaryTab(r);
      case 'characteristics': return renderCharacteristicsTab(r);
      case 'related':         return renderRelatedTab();
      case 'audit':           return renderStdTab('audit', 'eqms_fai_audit', r);
      case 'attachments':     return renderStdTab('attachments', 'eqms_fai_attachments', r);
      case 'comments':        return renderStdTab('comments', 'eqms_fai_comments', r);
      default:                return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin FAI', en: 'FAI Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã FAI', en: 'FAI ID' }, value: r.fai_number, mono: true },
        { label: { vi: 'Tiêu đề', en: 'Title' }, value: r.title },
        { label: { vi: 'Loại FAI', en: 'FAI Type' }, value: r.fai_type, badge: true },
        { label: { vi: 'Mã phần', en: 'Part Number' }, value: r.part_number, mono: true },
        { label: { vi: 'Phiên bản phần', en: 'Part Revision' }, value: r.part_revision, mono: true },
        { label: { vi: 'Tài liệu tham chiếu', en: 'Drawing Ref' }, value: r.drawing_number },
        { label: { vi: 'Phiên bản bản vẽ', en: 'Drawing Rev' }, value: r.drawing_revision },
        { label: { vi: 'Đặc tính', en: 'Total Characteristics' }, value: fmt(r.characteristics_count) },
        { label: { vi: 'Đạt', en: 'Passed' }, value: fmt(r.passed_count) },
        { label: { vi: 'Không đạt', en: 'Failed' }, value: fmt(r.failed_count) },
        { label: { vi: 'Có điều kiện', en: 'Conditional' }, value: fmt(r.conditional_count) },
        { label: { vi: 'Kết quả FAI', en: 'FAI Result' }, value: r.fai_result, badge: true },
        { label: { vi: 'Người kiểm tra', en: 'Inspector' }, value: r.inspector },
        { label: { vi: 'Ngày kiểm tra', en: 'Inspection Date' }, value: fmtDate(r.inspection_date) },
        { label: { vi: 'Phê duyệt bởi', en: 'Approved By' }, value: r.approved_by },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderCharacteristicsTab(r) {
    var chars = state.tabData.characteristics || [];
    var html = '';

    // Progress bar
    var total = r.characteristics_count || 0;
    var passed = r.passed_count || 0;
    var failed = r.failed_count || 0;
    if (total > 0) {
      var passPct = Math.round((passed / total) * 100);
      html += '<div class="eqms-progress-bar-wrap" style="margin-bottom:16px">';
      html += '<div style="display:flex;gap:16px;margin-bottom:8px">';
      html += '<span style="color:var(--color-success)">' + T({ vi: 'Đạt', en: 'Pass' }) + ': <strong>' + fmt(passed) + '</strong></span>';
      html += '<span style="color:var(--color-danger)">' + T({ vi: 'Không đạt', en: 'Fail' }) + ': <strong>' + fmt(failed) + '</strong></span>';
      html += '<span>' + T({ vi: 'Tổng', en: 'Total' }) + ': <strong>' + fmt(total) + '</strong></span>';
      html += '</div>';
      html += '<div style="height:8px;background:var(--color-border);border-radius:4px;overflow:hidden">';
      html += '<div style="height:100%;width:' + passPct + '%;background:var(--color-success);transition:width 0.3s"></div>';
      html += '</div></div>';
    }

    // Add characteristic button
    var canEdit = ['draft','revision_required'].indexOf(r.status) !== -1;
    if (canEdit) {
      html += '<button class="eqms-btn secondary sm" style="margin-bottom:12px" data-action="toggle-char-form">';
      html += '+ ' + T({ vi: 'Thêm đặc tính', en: 'Add Characteristic' });
      html += '</button>';
    }

    // Add form (inline)
    if (state.charForm.open && canEdit) {
      var cf = state.charForm.data;
      html += '<div class="eqms-inline-form" style="border:1px solid var(--color-border);border-radius:6px;padding:16px;margin-bottom:16px">';
      html += '<div class="eqms-form-row">' +
        ui.renderFormField({ key: 'char_name', label: { vi: 'Tên đặc tính', en: 'Characteristic Name' }, type: 'text', required: true, value: cf.char_name || '' }) +
        ui.renderFormField({ key: 'char_type', label: { vi: 'Loại', en: 'Type' }, type: 'select', value: cf.char_type || '',
          options: [
            { value: 'dimensional', label: { vi: 'Kích thước', en: 'Dimensional' } },
            { value: 'functional',  label: { vi: 'Chức năng', en: 'Functional' } },
            { value: 'material',    label: { vi: 'Vật liệu', en: 'Material' } },
            { value: 'visual',      label: { vi: 'Ngoại quan', en: 'Visual' } },
            { value: 'performance', label: { vi: 'Hiệu suất', en: 'Performance' } }
          ]}) +
      '</div><div class="eqms-form-row">' +
        ui.renderFormField({ key: 'nominal_value', label: { vi: 'Giá trị danh nghĩa', en: 'Nominal' }, type: 'text', value: cf.nominal_value || '' }) +
        ui.renderFormField({ key: 'upper_tolerance', label: { vi: 'Dung sai trên (+)', en: 'Upper Tol (+)' }, type: 'number', value: cf.upper_tolerance || '' }) +
        ui.renderFormField({ key: 'lower_tolerance', label: { vi: 'Dung sai dưới (-)', en: 'Lower Tol (-)' }, type: 'number', value: cf.lower_tolerance || '' }) +
      '</div><div class="eqms-form-row">' +
        ui.renderFormField({ key: 'actual_value', label: { vi: 'Giá trị thực đo', en: 'Actual Value' }, type: 'text', value: cf.actual_value || '' }) +
        ui.renderFormField({ key: 'char_result', label: { vi: 'Kết quả', en: 'Result' }, type: 'select', value: cf.char_result || '', options: FAI_RESULT_OPTIONS }) +
      '</div>' +
      '<button class="eqms-btn primary sm" data-action="save-characteristic">' + T({ vi: 'Lưu đặc tính', en: 'Save Characteristic' }) + '</button>' +
      ' <button class="eqms-btn ghost sm" data-action="cancel-char-form">' + T({ vi: 'Hủy', en: 'Cancel' }) + '</button>';
      html += '</div>';
    }

    // Characteristics grid
    if (!state.tabData._characteristicsLoaded) {
      loadTabData('characteristics', 'eqms_fai_characteristics');
      return html + ui.renderLoadingState({ vi: 'Đang tải đặc tính...', en: 'Loading characteristics...' });
    }

    if (!chars.length) {
      return html + ui.renderEmptyState({ icon: '\uD83D\uDCCF', title: { vi: 'Chưa có đặc tính', en: 'No characteristics added' } });
    }

    var columns = [
      { key: 'char_name',       label: { vi: 'Tên đặc tính', en: 'Characteristic' } },
      { key: 'char_type',       label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
      { key: 'nominal_value',   label: { vi: 'Danh nghĩa', en: 'Nominal' }, mono: true },
      { key: 'upper_tolerance', label: { vi: 'Tol +', en: 'Tol +' }, mono: true },
      { key: 'lower_tolerance', label: { vi: 'Tol -', en: 'Tol -' }, mono: true },
      { key: 'actual_value',    label: { vi: 'Thực đo', en: 'Actual' }, mono: true },
      { key: 'char_result',     label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' },
      { key: 'deviation_note',  label: { vi: 'Ghi chú', en: 'Note' }, type: 'truncate' }
    ];
    html += ui.renderDataGrid(columns, chars, { selectable: false });
    return html;
  }

  function renderRelatedTab() {
    var links = state.tabData.relationships || [];
    if (ui.renderLinkedRecordGraph) return ui.renderLinkedRecordGraph(links, { entityType: 'fai', recordId: state.recordId });
    return ui.renderRelationshipsPanel(links, {});
  }

  function renderStdTab(tabId, action, r) {
    if (!state.tabData['_' + tabId + 'Loaded']) { loadTabData(tabId, action); return ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); }
    var data = state.tabData[tabId] || [];
    if (tabId === 'audit')       return ui.renderAuditTrail(data);
    if (tabId === 'attachments') return ui.renderAttachmentsGrid(data, { readonly: r && ['closed','revoked'].indexOf(r.status) !== -1 });
    if (tabId === 'comments')    return ui.renderCommentsThread(data, { readonly: r && ['closed','revoked'].indexOf(r.status) !== -1 });
    return '';
  }

  function renderCreateView() {
    var html = '<div class="eqms-create-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo FAI mới', en: 'New First Article Inspection' }) + '</h2>';
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
          ui.renderFormField({ key: 'part_number', label: { vi: 'Mã phần', en: 'Part Number' }, type: 'text', required: true, value: d.part_number || '', error: e.part_number }) +
          ui.renderFormField({ key: 'part_revision', label: { vi: 'Phiên bản', en: 'Revision' }, type: 'text', value: d.part_revision || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'drawing_number', label: { vi: 'Số bản vẽ', en: 'Drawing Number' }, type: 'text', value: d.drawing_number || '' }) +
          ui.renderFormField({ key: 'drawing_revision', label: { vi: 'Phiên bản bản vẽ', en: 'Drawing Rev' }, type: 'text', value: d.drawing_revision || '' }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'fai_type', label: { vi: 'Loại FAI', en: 'FAI Type' }, type: 'select', required: true, value: d.fai_type || '', options: FAI_TYPE_OPTIONS, error: e.fai_type }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'inspector', label: { vi: 'Người kiểm tra', en: 'Inspector' }, type: 'text', value: d.inspector || '' }) +
          ui.renderFormField({ key: 'inspection_date', label: { vi: 'Ngày kiểm tra', en: 'Inspection Date' }, type: 'date', value: d.inspection_date || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea', value: d.description || '' }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Thông tin phần', en: 'Part Info' }, ui.renderFieldGrid([
          { label: { vi: 'Tiêu đề', en: 'Title' }, value: d.title },
          { label: { vi: 'Mã phần', en: 'Part No.' }, value: d.part_number },
          { label: { vi: 'Phiên bản', en: 'Revision' }, value: d.part_revision },
          { label: { vi: 'Bản vẽ', en: 'Drawing' }, value: d.drawing_number }
        ])) +
        ui.renderSection({ vi: 'Chi tiết FAI', en: 'FAI Details' }, ui.renderFieldGrid([
          { label: { vi: 'Loại', en: 'Type' }, value: d.fai_type },
          { label: { vi: 'Người kiểm tra', en: 'Inspector' }, value: d.inspector },
          { label: { vi: 'Ngày kiểm tra', en: 'Date' }, value: fmtDate(d.inspection_date) }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng FAI', en: 'Total FAI' }, value: fmt(m.total || 0) },
      { label: { vi: 'Đã phê duyệt', en: 'Approved' }, value: fmt(m.approved || 0) },
      { label: { vi: 'Không đạt', en: 'Failed' }, value: fmt(m.failed || 0), accent: m.failed > 0 ? 'danger' : '' },
      { label: { vi: 'Đang xem xét', en: 'Under Review' }, value: fmt(m.under_review || 0) }
    ]);
    html += ui.renderChartWithTableFallback('chart-fai-by-type', null,
      [{ key: 'fai_type', label: { vi: 'Loại', en: 'Type' } }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_type || [], { defaultMode: 'table' });
    html += ui.renderChartWithTableFallback('chart-fai-by-result', null,
      [{ key: 'fai_result', label: { vi: 'Kết quả', en: 'Result' }, type: 'badge' }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
      m.by_result || [], { defaultMode: 'table' });
    html += '</div>';
    return html;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)     payload.filters.status     = state.filters.status;
    if (state.filters.fai_type)   payload.filters.fai_type   = state.filters.fai_type;
    if (state.filters.fai_result) payload.filters.fai_result = state.filters.fai_result;
    apiCall('eqms_fai_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.fai_reports || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed to load';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_fai_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.fai_report) { state.record = res.fai_report; state.recordId = id; }
      else state.error = (res && res.message) || 'Not found';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadTabData(tab, action) {
    if (!state.recordId) return;
    apiCall(action, { id: state.recordId }, 'GET').then(function(res) {
      if (res) {
        state.tabData['_' + tab + 'Loaded'] = true;
        if (tab === 'characteristics') state.tabData.characteristics = res.characteristics || [];
        if (tab === 'audit')           state.tabData.audit           = res.events || [];
        if (tab === 'comments')        state.tabData.comments        = res.comments || [];
        if (tab === 'attachments')     state.tabData.attachments     = res.attachments || [];
      }
      refreshUI();
    }).catch(function() { state.tabData['_' + tab + 'Loaded'] = true; refreshUI(); });
  }

  function loadMetrics() {
    apiCall('eqms_fai_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    if (actionKey === 'reject') { var r = prompt(T({ vi: 'Lý do:', en: 'Reason:' })); if (!r) return; payload.rejection_reason = r; }
    if (actionKey === 'request-revision') { var n = prompt(T({ vi: 'Chỉnh sửa cần thiết:', en: 'Revision notes:' })); if (!n) return; payload.revision_notes = n; }
    state.loading = true; refreshUI();
    apiCall('eqms_fai_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.fai_report) { state.record = res.fai_report; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function saveCharacteristic() {
    if (!state.recordId) return;
    var cf = state.charForm.data;
    if (!cf.char_name) { showToast(T({ vi: 'Vui lòng nhập tên đặc tính', en: 'Characteristic name required' }), 'warning'); return; }
    apiCall('eqms_fai_characteristics', Object.assign({ id: state.recordId }, cf)).then(function(res) {
      if (res && res.characteristic) {
        showToast(T({ vi: 'Đã thêm đặc tính', en: 'Characteristic added' }), 'success');
        state.charForm = { open: false, data: {} };
        state.tabData._characteristicsLoaded = false;
        state.tabData.characteristics = [];
        if (res.fai_report) state.record = res.fai_report;
        loadTabData('characteristics', 'eqms_fai_characteristics');
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { showToast(err.message || 'Error', 'error'); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.title)      errors.title      = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.part_number) errors.part_number = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.fai_type)   errors.fai_type   = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = !d.title ? 0 : 1; refreshUI(); showToast(T({ vi: 'Vui lòng điền đầy đủ', en: 'Fill all required fields' }), 'warning'); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_fai_create', { title: d.title, fai_type: d.fai_type, part_number: d.part_number, part_revision: d.part_revision || null, drawing_number: d.drawing_number || null, drawing_revision: d.drawing_revision || null, inspector: d.inspector || null, inspection_date: d.inspection_date || null, description: d.description || '' }).then(function(res) {
      state.loading = false;
      if (res && res.fai_report) {
        showToast(T({ vi: 'Tạo FAI thành công', en: 'FAI created' }), 'success');
        state.screen = 'detail'; state.recordId = res.fai_report.fai_id; state.record = res.fai_report;
        state.wizardData = {}; state.wizardStep = 0; state.wizardErrors = {};
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────────

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

  function collectCharFormData() {
    if (!_container) return;
    _container.querySelectorAll('.eqms-inline-form [data-field]').forEach(function(el) { var k = el.getAttribute('data-field'); if (k) state.charForm.data[k] = el.value || ''; });
  }

  // ─── Event binding ────────────────────────────────────────────────────────────

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
        var wfActions = ['submit','start-review','approve','reject','request-revision','submit-revision','close','revoke'];
        if (wfActions.indexOf(action) !== -1) { executeWorkflowAction(action); return; }
        if (action === 'toggle-char-form') { state.charForm.open = !state.charForm.open; refreshUI(); return; }
        if (action === 'cancel-char-form') { state.charForm = { open: false, data: {} }; refreshUI(); return; }
        if (action === 'save-characteristic') { collectCharFormData(); saveCharacteristic(); return; }
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
  window.EqmsModules['fai'] = { render: render, meta: MOD };

})();

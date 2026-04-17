/**
 * EQMS Special Characteristics (KPC/KCC/SC/CC) — IATF 16949 §8.3.5.2
 * HESEM MOM Portal - 65-eqms-special-chars.js
 *
 * Archetype: approval-workflow with SPC Cpk monitoring
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
    id:        'special-chars',
    version:   '1.0.0',
    archetype: 'approval-workflow',
    label:     { vi: 'Đặc tính đặc biệt (SC/KPC)', en: 'Special Characteristics' },
    icon:      '\u2B50'
  };

  var WORKFLOW_STATES = ['draft','under_review','revision_required','approved','obsolete','rejected'];

  var STATE_LABELS = {
    draft:              { vi: 'Nháp',           en: 'Draft' },
    under_review:       { vi: 'Đang xem xét',   en: 'Under Review' },
    revision_required:  { vi: 'Cần chỉnh sửa', en: 'Revision Required' },
    approved:           { vi: 'Đã phê duyệt',   en: 'Approved' },
    obsolete:           { vi: 'Lỗi thời',       en: 'Obsolete' },
    rejected:           { vi: 'Từ chối',        en: 'Rejected' }
  };

  var SC_TYPE_OPTIONS = [
    { value: 'KPC', label: { vi: 'KPC — Đặc tính then chốt', en: 'KPC — Key Product Characteristic' } },
    { value: 'KCC', label: { vi: 'KCC — Đặc tính kiểm soát then chốt', en: 'KCC — Key Control Characteristic' } },
    { value: 'SC',  label: { vi: 'SC — Đặc tính đặc biệt', en: 'SC — Special Characteristic' } },
    { value: 'CC',  label: { vi: 'CC — Đặc tính tới hạn', en: 'CC — Critical Characteristic' } },
    { value: 'SIC', label: { vi: 'SIC — Đặc tính quan trọng an toàn', en: 'SIC — Safety Important Characteristic' } }
  ];

  var CONTROL_METHOD_OPTIONS = [
    { value: 'spc',            label: { vi: 'SPC', en: 'SPC (Statistical Process Control)' } },
    { value: '100pct',         label: { vi: '100% kiểm tra', en: '100% Inspection' } },
    { value: 'sampling',       label: { vi: 'Lấy mẫu', en: 'Sampling' } },
    { value: 'poka_yoke',      label: { vi: 'Poka-Yoke', en: 'Poka-Yoke / Error Proofing' } },
    { value: 'process_control', label: { vi: 'Kiểm soát quy trình', en: 'Process Control' } }
  ];

  var STATE_ACTIONS = {
    draft:             [{ action: 'submit-for-review', label: { vi: 'Gửi xét duyệt', en: 'Submit for Review' }, style: 'primary' }],
    under_review:      [
      { action: 'approve',          label: { vi: 'Phê duyệt',   en: 'Approve' },          style: 'success' },
      { action: 'reject',           label: { vi: 'Từ chối',     en: 'Reject' },           style: 'danger' },
      { action: 'request-revision', label: { vi: 'Yêu cầu chỉnh sửa', en: 'Request Revision' }, style: 'secondary' }
    ],
    revision_required: [{ action: 'submit-revision', label: { vi: 'Gửi lại', en: 'Submit Revision' }, style: 'primary' }],
    approved:          [{ action: 'obsolete', label: { vi: 'Đánh dấu lỗi thời', en: 'Mark Obsolete' }, style: 'ghost' }]
  };

  var DETAIL_TABS = [
    { id: 'summary',     label: { vi: 'Tóm tắt',       en: 'Summary' } },
    { id: 'spc',         label: { vi: 'Dữ liệu SPC',   en: 'SPC / Cpk' } },
    { id: 'related',     label: { vi: 'Liên quan',     en: 'Related' } },
    { id: 'audit',       label: { vi: 'Nhật ký',       en: 'Audit Trail' } },
    { id: 'attachments', label: { vi: 'Đính kèm',      en: 'Attachments' } },
    { id: 'comments',    label: { vi: 'Bình luận',     en: 'Comments' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Phân loại & Phần',     en: 'Classification & Part' } },
    { label: { vi: 'Thông số kiểm soát',   en: 'Control Parameters' } },
    { label: { vi: 'Xem lại & Gửi',       en: 'Review & Submit' } }
  ];

  var state = {
    screen: 'queue', filters: {}, sortKey: 'sc_number', sortDir: 'asc',
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
    var html = '<div class="eqms-module eqms-special-chars">';
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
    [{ id: 'queue', label: { vi: 'Danh sách', en: 'List' }, icon: '\u2B50' },
     { id: 'analytics', label: { vi: 'Phân tích Cpk', en: 'Cpk Analytics' }, icon: '\uD83D\uDCCA' }].forEach(function(s) {
      var active = state.screen === s.id || (state.screen === 'detail' && s.id === 'queue');
      html += '<button class="eqms-btn ' + (active ? 'primary' : 'ghost') + ' sm" data-action="switch-screen" data-screen="' + s.id + '">' + s.icon + ' ' + esc(T(s.label)) + '</button>';
    });
    html += '</div><div class="eqms-module-toolbar-right">';
    html += '<button class="eqms-btn primary sm" data-action="switch-screen" data-screen="create">+ ' + T({ vi: 'Tạo SC', en: 'New SC' }) + '</button>';
    html += '</div></div>';
    return html;
  }

  function renderQueueView() {
    var html = '<div class="eqms-queue-view">';
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' }, options: WORKFLOW_STATES.map(function(s) { return { value: s, label: STATE_LABELS[s] || { en: s } }; }) },
        { key: 'sc_type', type: 'select', label: { vi: 'Loại SC', en: 'SC Type' }, options: SC_TYPE_OPTIONS },
        { key: 'cpk_below', type: 'select', label: { vi: 'Cpk dưới mức', en: 'Cpk At-Risk' }, options: [{ value: '1.33', label: { en: '< 1.33 (standard)' } }, { value: '1.67', label: { en: '< 1.67 (safety)' } }] },
        { key: 'search', type: 'text', label: { vi: 'Tìm kiếm', en: 'Search' }, placeholder: { vi: 'Mã SC, tên đặc tính...', en: 'SC code, characteristic name...' }, width: '220px' }
      ]
    });
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải đặc tính đặc biệt...', en: 'Loading special characteristics...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'sc_number', type: 'id', label: { vi: 'Mã SC', en: 'SC ID' },
          render: function(val, row) { return '<a class="eqms-cell-link" data-action="open-detail" data-id="' + esc(row.sc_id) + '">' + esc(val || '---') + '</a>'; } },
        { key: 'characteristic_name', label: { vi: 'Tên đặc tính', en: 'Characteristic' } },
        { key: 'sc_type',             label: { vi: 'Loại', en: 'Type' }, type: 'badge' },
        { key: 'part_number',         label: { vi: 'Mã phần', en: 'Part No.' }, mono: true },
        { key: 'nominal_value',       label: { vi: 'Danh nghĩa', en: 'Nominal' }, mono: true },
        { key: 'cpk_requirement',     label: { vi: 'Cpk yêu cầu', en: 'Cpk Req.' } },
        { key: 'current_cpk',         label: { vi: 'Cpk hiện tại', en: 'Current Cpk' },
          render: function(val, row) {
            var cpk = parseFloat(val);
            var req = parseFloat(row.cpk_requirement || 1.33);
            var color = isNaN(cpk) ? '' : (cpk < req ? 'style="color:var(--color-danger);font-weight:bold"' : 'style="color:var(--color-success)"');
            return val ? '<span ' + color + '>' + esc(val) + '</span>' : '\u2014';
          }
        },
        { key: 'safety_critical', label: { vi: 'An toàn', en: 'Safety' }, type: 'boolean' },
        { key: 'status',          label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' }
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
    var cpk = parseFloat(r.current_cpk);
    var req = parseFloat(r.cpk_requirement || 1.33);
    var cpkAtRisk = !isNaN(cpk) && cpk < req;

    var html = '<div class="eqms-detail-view">';
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="switch-screen" data-screen="queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back' }) + '</button></div>';

    if (cpkAtRisk) {
      html += '<div class="eqms-alert danger" style="margin-bottom:12px">\u26A0\uFE0F ' + T({ vi: 'Cpk dưới mức yêu cầu! Cần hành động ngay.', en: 'Cpk below requirement! Immediate action required.' }) + '</div>';
    }

    html += ui.renderIdentityHeader({
      record_id: r.sc_number, title: r.characteristic_name,
      status: r.status, status_label: T(STATE_LABELS[r.status] || { en: r.status }),
      owner: r.created_by, created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at, version: r.version
    }, { actions: STATE_ACTIONS[r.status] || [],
         extraMeta: [
           { label: { vi: 'Loại', en: 'Type' }, value: r.sc_type },
           { label: { vi: 'Mã phần', en: 'Part' }, value: r.part_number },
           { label: { vi: 'Cpk / Yêu cầu', en: 'Cpk / Req' }, value: (r.current_cpk || '\u2014') + ' / ' + (r.cpk_requirement || '1.33') }
         ]
    });
    html += ui.renderStateTimeline(['draft','under_review','approved'], r.status);
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);
    html += '<div class="eqms-tab-content">' + renderTabContent(state.activeTab, r) + '</div>';
    html += '</div>';
    return html;
  }

  function renderTabContent(tabId, r) {
    switch (tabId) {
      case 'summary':     return renderSummaryTab(r);
      case 'spc':         return renderSpcTab(r);
      case 'related':     return ui.renderRelationshipsPanel(state.tabData.relationships || [], {});
      case 'audit':       return renderStdTab('audit', 'eqms_special_chars_audit', r);
      case 'attachments': return renderStdTab('attachments', 'eqms_special_chars_attachments', r);
      case 'comments':    return renderStdTab('comments', 'eqms_special_chars_comments', r);
      default:            return '';
    }
  }

  function renderSummaryTab(r) {
    return ui.renderSection({ vi: 'Thông tin đặc tính đặc biệt', en: 'Special Characteristic Details' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã SC', en: 'SC Code' }, value: r.sc_number, mono: true },
        { label: { vi: 'Tên đặc tính', en: 'Characteristic Name' }, value: r.characteristic_name },
        { label: { vi: 'Loại SC', en: 'SC Type' }, value: r.sc_type, badge: true },
        { label: { vi: 'Mã phần', en: 'Part Number' }, value: r.part_number, mono: true },
        { label: { vi: 'Phiên bản', en: 'Part Revision' }, value: r.part_revision, mono: true },
        { label: { vi: 'Quy trình', en: 'Process' }, value: r.process_name },
        { label: { vi: 'Giá trị danh nghĩa', en: 'Nominal Value' }, value: r.nominal_value, mono: true },
        { label: { vi: 'Dung sai trên', en: 'Upper Spec Limit' }, value: r.upper_spec_limit, mono: true },
        { label: { vi: 'Dung sai dưới', en: 'Lower Spec Limit' }, value: r.lower_spec_limit, mono: true },
        { label: { vi: 'Đơn vị', en: 'Unit' }, value: r.unit },
        { label: { vi: 'Phương pháp kiểm soát', en: 'Control Method' }, value: r.control_method, badge: true },
        { label: { vi: 'Cpk yêu cầu', en: 'Cpk Requirement' }, value: r.cpk_requirement },
        { label: { vi: 'Tần suất lấy mẫu', en: 'Sampling Frequency' }, value: r.sampling_frequency },
        { label: { vi: 'An toàn quan trọng', en: 'Safety Critical' }, value: r.safety_critical ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Pháp lý / Quy định', en: 'Regulatory Required' }, value: r.regulatory_required ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) },
        { label: { vi: 'Phiên bản', en: 'Version' }, value: r.version }
      ])
    );
  }

  function renderSpcTab(r) {
    var cpk = parseFloat(r.current_cpk);
    var req = parseFloat(r.cpk_requirement || 1.33);
    var cpkAtRisk = !isNaN(cpk) && cpk < req;

    var html = ui.renderSection({ vi: 'Dữ liệu SPC & Cpk', en: 'SPC & Cpk Data' },
      ui.renderFieldGrid([
        { label: { vi: 'Cpk hiện tại', en: 'Current Cpk' }, value: r.current_cpk != null ? String(r.current_cpk) + (cpkAtRisk ? ' \u26A0\uFE0F' : ' \u2705') : T({ vi: 'Chưa có dữ liệu', en: 'No data' }) },
        { label: { vi: 'Cpk yêu cầu', en: 'Cpk Requirement' }, value: r.cpk_requirement },
        { label: { vi: 'Pp (ngắn hạn)', en: 'Pp (short-term)' }, value: r.current_pp },
        { label: { vi: 'Ppk (ngắn hạn)', en: 'Ppk (short-term)' }, value: r.current_ppk },
        { label: { vi: 'Cập nhật lần cuối', en: 'Last Updated By SPC' }, value: r.cpk_last_updated_by },
        { label: { vi: 'Thời điểm cập nhật', en: 'Last Updated At' }, value: fmtDateTime(r.cpk_updated_at) }
      ])
    );

    // SPC update section (for SPC system or quality engineer)
    html += ui.renderSection({ vi: 'Cập nhật Cpk', en: 'Update Cpk (SPC Feed)' },
      '<div class="eqms-form-row">' +
        ui.renderFormField({ key: 'cpk_value', label: { vi: 'Giá trị Cpk mới', en: 'New Cpk Value' }, type: 'number', placeholder: { vi: '1.33', en: '1.33' } }) +
        ui.renderFormField({ key: 'pp_value',  label: { vi: 'Pp', en: 'Pp' },  type: 'number', placeholder: { vi: '1.33', en: '1.33' } }) +
        ui.renderFormField({ key: 'ppk_value', label: { vi: 'Ppk', en: 'Ppk' }, type: 'number', placeholder: { vi: '1.33', en: '1.33' } }) +
      '</div>' +
      '<div class="eqms-form-row">' +
        ui.renderFormField({ key: 'sample_size', label: { vi: 'Cỡ mẫu', en: 'Sample Size' }, type: 'number' }) +
        ui.renderFormField({ key: 'measurement_date', label: { vi: 'Ngày đo', en: 'Measurement Date' }, type: 'date' }) +
      '</div>' +
      '<button class="eqms-btn primary sm" data-action="update-cpk">' + T({ vi: 'Cập nhật Cpk', en: 'Update Cpk' }) + '</button>'
    );

    return html;
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
    html += '<h2 style="margin:0 0 16px">' + T({ vi: 'Tạo đặc tính đặc biệt mới', en: 'New Special Characteristic' }) + '</h2>';
    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, renderWizardStep(state.wizardStep), {});
    html += '</div>';
    return html;
  }

  function renderWizardStep(step) {
    var d = state.wizardData; var e = state.wizardErrors;
    switch (step) {
      case 0: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'characteristic_name', label: { vi: 'Tên đặc tính', en: 'Characteristic Name' }, type: 'text', required: true, value: d.characteristic_name || '', error: e.characteristic_name }) +
          ui.renderFormField({ key: 'sc_type', label: { vi: 'Loại SC', en: 'SC Type' }, type: 'select', required: true, value: d.sc_type || '', options: SC_TYPE_OPTIONS, error: e.sc_type }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'part_number', label: { vi: 'Mã phần', en: 'Part Number' }, type: 'text', required: true, value: d.part_number || '', error: e.part_number }) +
          ui.renderFormField({ key: 'part_revision', label: { vi: 'Phiên bản', en: 'Revision' }, type: 'text', value: d.part_revision || '' }) +
          ui.renderFormField({ key: 'process_name', label: { vi: 'Quy trình', en: 'Process' }, type: 'text', value: d.process_name || '' }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'safety_critical', label: { vi: 'An toàn quan trọng', en: 'Safety Critical' }, type: 'select', value: d.safety_critical || 'false', options: [{ value: 'false', label: { vi: 'Không', en: 'No' } }, { value: 'true', label: { vi: 'Có', en: 'Yes' } }] }) +
          ui.renderFormField({ key: 'regulatory_required', label: { vi: 'Pháp lý / Quy định', en: 'Regulatory Required' }, type: 'select', value: d.regulatory_required || 'false', options: [{ value: 'false', label: { vi: 'Không', en: 'No' } }, { value: 'true', label: { vi: 'Có', en: 'Yes' } }] }) +
        '</div></div>';
      case 1: return '<div class="eqms-wizard-step-content">' +
        '<div class="eqms-form-row">' +
          ui.renderFormField({ key: 'nominal_value', label: { vi: 'Giá trị danh nghĩa', en: 'Nominal Value' }, type: 'text', value: d.nominal_value || '' }) +
          ui.renderFormField({ key: 'upper_spec_limit', label: { vi: 'Giới hạn trên (USL)', en: 'Upper Spec Limit' }, type: 'number', value: d.upper_spec_limit || '' }) +
          ui.renderFormField({ key: 'lower_spec_limit', label: { vi: 'Giới hạn dưới (LSL)', en: 'Lower Spec Limit' }, type: 'number', value: d.lower_spec_limit || '' }) +
          ui.renderFormField({ key: 'unit', label: { vi: 'Đơn vị', en: 'Unit' }, type: 'text', value: d.unit || '', placeholder: { vi: 'mm, μm, °C...', en: 'mm, μm, °C...' } }) +
        '</div><div class="eqms-form-row">' +
          ui.renderFormField({ key: 'control_method', label: { vi: 'Phương pháp kiểm soát', en: 'Control Method' }, type: 'select', value: d.control_method || '', options: CONTROL_METHOD_OPTIONS }) +
          ui.renderFormField({ key: 'cpk_requirement', label: { vi: 'Cpk yêu cầu', en: 'Cpk Requirement' }, type: 'number', value: d.cpk_requirement || '1.33', placeholder: { en: '1.33' } }) +
          ui.renderFormField({ key: 'sampling_frequency', label: { vi: 'Tần suất lấy mẫu', en: 'Sampling Frequency' }, type: 'text', value: d.sampling_frequency || '', placeholder: { vi: 'VD: Mỗi 2 giờ', en: 'e.g. Every 2 hours' } }) +
        '</div></div>';
      case 2: return '<div class="eqms-wizard-step-content">' +
        ui.renderSection({ vi: 'Phân loại & Phần', en: 'Classification & Part' }, ui.renderFieldGrid([
          { label: { vi: 'Tên đặc tính', en: 'Characteristic' }, value: d.characteristic_name },
          { label: { vi: 'Loại', en: 'Type' }, value: d.sc_type },
          { label: { vi: 'Mã phần', en: 'Part No.' }, value: d.part_number },
          { label: { vi: 'An toàn', en: 'Safety Critical' }, value: d.safety_critical === 'true' ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) }
        ])) +
        ui.renderSection({ vi: 'Thông số kiểm soát', en: 'Control Parameters' }, ui.renderFieldGrid([
          { label: { vi: 'Danh nghĩa', en: 'Nominal' }, value: d.nominal_value },
          { label: { vi: 'USL', en: 'USL' }, value: d.upper_spec_limit },
          { label: { vi: 'LSL', en: 'LSL' }, value: d.lower_spec_limit },
          { label: { vi: 'Cpk yêu cầu', en: 'Cpk Req.' }, value: d.cpk_requirement },
          { label: { vi: 'Phương pháp', en: 'Control Method' }, value: d.control_method }
        ])) + '</div>';
      default: return '';
    }
  }

  function renderAnalyticsView() {
    var html = '<div class="eqms-analytics-view">';
    if (!state.metrics) { html += ui.renderLoadingState({ vi: 'Đang tải...', en: 'Loading...' }); html += '</div>'; return html; }
    var m = state.metrics;
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng SC đã phê duyệt', en: 'Total Approved SC' }, value: fmt(m.approved_count || 0) },
      { label: { vi: 'Cpk dưới mức (At-Risk)', en: 'Cpk At-Risk' }, value: fmt(m.cpk_at_risk || 0), accent: m.cpk_at_risk > 0 ? 'danger' : '' },
      { label: { vi: 'An toàn quan trọng', en: 'Safety Critical' }, value: fmt(m.safety_critical_count || 0) },
      { label: { vi: 'Chờ xét duyệt', en: 'Pending Review' }, value: fmt(m.pending_review || 0) }
    ]);
    html += ui.renderSection({ vi: 'Phân bố theo loại SC', en: 'Distribution by SC Type' },
      ui.renderChartWithTableFallback('chart-sc-by-type', null,
        [{ key: 'sc_type', label: { vi: 'Loại', en: 'Type' }, type: 'badge' }, { key: 'count', label: { vi: 'Số', en: 'Count' }, type: 'number' }],
        m.by_type || [], { defaultMode: 'table' })
    );
    html += '</div>';
    return html;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  function loadQueue() {
    state.loading = true; state.error = null; refreshUI();
    var payload = { offset: (state.page - 1) * state.pageSize, limit: state.pageSize, sort_by: state.sortKey, sort_dir: state.sortDir, search: state.filters.search || '', filters: {} };
    if (state.filters.status)    payload.filters.status    = state.filters.status;
    if (state.filters.sc_type)   payload.filters.sc_type   = state.filters.sc_type;
    if (state.filters.cpk_below) payload.filters.cpk_below = state.filters.cpk_below;
    apiCall('eqms_special_chars_query', payload).then(function(res) {
      state.loading = false; state.loaded = true;
      if (res && res.success !== false) { state.items = res.special_characteristics || []; state.totalItems = res.total || state.items.length; }
      else state.error = (res && res.message) || 'Failed to load';
      refreshUI();
    }).catch(function(err) { state.loading = false; state.loaded = true; state.error = err.message || 'Network error'; refreshUI(); });
  }

  function loadDetail(id) {
    state.loading = true; state.record = null; state.tabData = {}; refreshUI();
    apiCall('eqms_special_chars_detail', { id: id }, 'GET').then(function(res) {
      state.loading = false;
      if (res && res.special_characteristic) { state.record = res.special_characteristic; state.recordId = id; }
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
    apiCall('eqms_special_chars_metrics', null, 'GET').then(function(res) {
      if (res && res.metrics) state.metrics = res.metrics;
      refreshUI();
    }).catch(function() { refreshUI(); });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  function executeWorkflowAction(actionKey) {
    if (!state.record || !state.recordId) return;
    var payload = { id: state.recordId, version: state.record.version };
    state.loading = true; refreshUI();
    apiCall('eqms_special_chars_action_' + actionKey.replace(/-/g, '_'), payload).then(function(res) {
      state.loading = false;
      if (res && res.special_characteristic) { state.record = res.special_characteristic; showToast(T({ vi: 'Thành công', en: 'Action completed' }), 'success'); }
      else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { state.loading = false; showToast(err.message || 'Error', 'error'); refreshUI(); });
  }

  function updateCpk() {
    if (!state.recordId) return;
    var cpkEl   = _container.querySelector('[data-field="cpk_value"]');
    var ppEl    = _container.querySelector('[data-field="pp_value"]');
    var ppkEl   = _container.querySelector('[data-field="ppk_value"]');
    var sizeEl  = _container.querySelector('[data-field="sample_size"]');
    var dateEl  = _container.querySelector('[data-field="measurement_date"]');
    if (!cpkEl || !cpkEl.value) { showToast(T({ vi: 'Nhập giá trị Cpk', en: 'Enter Cpk value' }), 'warning'); return; }
    apiCall('eqms_special_chars_cpk', {
      id: state.recordId, version: state.record.version,
      current_cpk: parseFloat(cpkEl.value),
      current_pp:  ppEl && ppEl.value ? parseFloat(ppEl.value) : null,
      current_ppk: ppkEl && ppkEl.value ? parseFloat(ppkEl.value) : null,
      sample_size: sizeEl && sizeEl.value ? parseInt(sizeEl.value, 10) : null,
      measurement_date: dateEl ? dateEl.value : null
    }, 'PATCH').then(function(res) {
      if (res && res.special_characteristic) {
        state.record = res.special_characteristic;
        showToast(T({ vi: 'Đã cập nhật Cpk', en: 'Cpk updated' }), 'success');
      } else showToast((res && res.message) || 'Failed', 'error');
      refreshUI();
    }).catch(function(err) { showToast(err.message || 'Error', 'error'); });
  }

  function submitWizard() {
    var d = state.wizardData; var errors = {};
    if (!d.characteristic_name) errors.characteristic_name = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.sc_type)              errors.sc_type             = { vi: 'Bắt buộc', en: 'Required' };
    if (!d.part_number)          errors.part_number         = { vi: 'Bắt buộc', en: 'Required' };
    if (Object.keys(errors).length > 0) { state.wizardErrors = errors; state.wizardStep = 0; refreshUI(); return; }
    state.loading = true; refreshUI();
    apiCall('eqms_special_chars_create', {
      characteristic_name: d.characteristic_name, sc_type: d.sc_type,
      part_number: d.part_number, part_revision: d.part_revision || null, process_name: d.process_name || null,
      nominal_value: d.nominal_value || null,
      upper_spec_limit: d.upper_spec_limit ? parseFloat(d.upper_spec_limit) : null,
      lower_spec_limit: d.lower_spec_limit ? parseFloat(d.lower_spec_limit) : null,
      unit: d.unit || null, control_method: d.control_method || null,
      cpk_requirement: d.cpk_requirement ? parseFloat(d.cpk_requirement) : 1.33,
      sampling_frequency: d.sampling_frequency || null,
      safety_critical: d.safety_critical === 'true',
      regulatory_required: d.regulatory_required === 'true'
    }).then(function(res) {
      state.loading = false;
      if (res && res.special_characteristic) {
        showToast(T({ vi: 'Tạo thành công', en: 'SC created' }), 'success');
        state.screen = 'detail'; state.recordId = res.special_characteristic.sc_id; state.record = res.special_characteristic;
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
        var wfActions = ['submit-for-review','approve','reject','request-revision','submit-revision','obsolete'];
        if (wfActions.indexOf(action) !== -1) { executeWorkflowAction(action); return; }
        if (action === 'update-cpk') { updateCpk(); return; }
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
  window.EqmsModules['special-chars'] = { render: render, meta: MOD };

})();

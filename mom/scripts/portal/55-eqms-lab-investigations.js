/**
 * 55-eqms-lab-investigations.js — OOS/OOT / Lab Investigations
 * HESEM MOM Portal · Exception Hub + Evidence Workspace
 *
 * Module ID: lab-investigations
 * Archetype: exception-hub + evidence-workspace
 * Authority: FDA 21 CFR 211.160/192, ICH Q7, EU GMP Annex 15
 * Load order: AFTER 40-eqms-shell.js
 *
 * Workflow: intake -> phase1_investigation -> phase2_investigation -> conclusion -> closed | voided
 * Actions: intake-oos, intake-oot, start-phase1, start-phase2, request-retest,
 *          request-resample, link-capa, close
 * Screens: Queue, Detail (8 tabs), Analytics
 * Endpoints: eqms_lab_investigations_*
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

  // ─── Module metadata ────────────────────────────────────────────────────
  var MOD = {
    id:      'lab-investigations',
    label:   { vi: 'Điều tra phòng thí nghiệm', en: 'Lab Investigations (OOS/OOT)' },
    version: '1.0.0'
  };

  // ─── Constants ──────────────────────────────────────────────────────────
  var STATES = ['intake', 'phase1_investigation', 'phase2_investigation', 'conclusion', 'closed', 'voided'];

  var INV_TYPES = [
    { value: 'oos', label: { vi: 'OOS — Ngoài quy cách', en: 'OOS — Out of Specification' } },
    { value: 'oot', label: { vi: 'OOT — Ngoài xu hướng', en: 'OOT — Out of Trend' } }
  ];

  var BATCH_IMPACTS = [
    { value: 'no_impact',    label: { vi: 'Không ảnh hưởng', en: 'No Impact' } },
    { value: 'batch_reject', label: { vi: 'Từ chối lô',      en: 'Batch Reject' } },
    { value: 'batch_hold',   label: { vi: 'Giữ lô',          en: 'Batch Hold' } },
    { value: 'quarantine',   label: { vi: 'Cách ly',         en: 'Quarantine' } }
  ];

  var RETEST_TYPES = [
    { value: 'retest',   label: { vi: 'Thử lại',  en: 'Retest' } },
    { value: 'resample', label: { vi: 'Lấy mẫu lại', en: 'Resample' } }
  ];

  var YESNO = [
    { value: 'yes', label: { vi: 'Có',    en: 'Yes' } },
    { value: 'no',  label: { vi: 'Không', en: 'No' } }
  ];

  var WORKFLOW_ACTIONS = {
    intake:                [
      { action: 'start-phase1', label: { vi: 'Bắt đầu Giai đoạn 1', en: 'Start Phase 1' }, style: 'primary' },
      { action: 'void',         label: { vi: 'Hủy bỏ',              en: 'Void' },           style: 'danger' }
    ],
    phase1_investigation:  [
      { action: 'start-phase2',     label: { vi: 'Chuyển Giai đoạn 2',   en: 'Escalate to Phase 2' }, style: 'primary' },
      { action: 'request-retest',   label: { vi: 'Yêu cầu thử lại',      en: 'Request Retest' },      style: 'secondary' },
      { action: 'request-resample', label: { vi: 'Yêu cầu lấy mẫu lại',  en: 'Request Resample' },    style: 'secondary' },
      { action: 'conclude',         label: { vi: 'Kết luận',             en: 'Conclude' },             style: 'ghost' }
    ],
    phase2_investigation:  [
      { action: 'request-retest',   label: { vi: 'Yêu cầu thử lại',      en: 'Request Retest' },      style: 'secondary' },
      { action: 'request-resample', label: { vi: 'Yêu cầu lấy mẫu lại',  en: 'Request Resample' },    style: 'secondary' },
      { action: 'link-capa',        label: { vi: 'Liên kết CAPA',        en: 'Link CAPA' },           style: 'ghost' },
      { action: 'conclude',         label: { vi: 'Kết luận',             en: 'Conclude' },             style: 'primary' }
    ],
    conclusion:            [
      { action: 'close', label: { vi: 'Đóng',    en: 'Close' }, style: 'primary' },
      { action: 'void',  label: { vi: 'Hủy bỏ',  en: 'Void' },  style: 'danger' }
    ],
    closed: [],
    voided: []
  };

  // ─── State ──────────────────────────────────────────────────────────────
  var state = {
    screen:     'queue',   // queue | detail | analytics
    filters:    {},
    sort:       { key: 'created_at', dir: 'desc' },
    page:       1,
    limit:      25,
    records:    [],
    loaded:     false,
    total:      0,
    metrics:    null,
    detail:     null,
    detailTab:  'summary',
    audit:      [],
    signatures: [],
    wizard:     { step: 0, data: {} },
    loading:    false,
    error:      null
  };

  var _container = null;

  // ─── API helpers ────────────────────────────────────────────────────────
  function api(action, payload) {
    return apiCall(action, payload);
  }

  function loadQueue() {
    state.loading = true;
    rerender();
    var payload = {
      filters:  Object.assign({}, state.filters),
      sort_by:  state.sort.key,
      sort_dir: state.sort.dir,
      offset:   (state.page - 1) * state.limit,
      limit:    state.limit
    };
    api('eqms_lab_investigations_query', payload).then(function(res) {
      state.loading = false;
      state.loaded  = true;
      if (res.success === false) { state.error = res.message || 'Query failed'; }
      else {
        state.records = res.data || res.records || [];
        state.total   = (res.pagination && res.pagination.total) || res.total || state.records.length;
        state.error   = null;
      }
      rerender();
    }).catch(function(e) { state.loading = false; state.loaded = true; state.error = e.message; rerender(); });
  }

  function loadDetail(id) {
    state.loading = true;
    state.detail  = null;
    state.detailTab = 'summary';
    rerender();
    Promise.all([
      api('eqms_lab_investigations_detail', { investigation_id: id }),
      api('eqms_lab_investigations_audit', { investigation_id: id }),
      api('eqms_lab_investigations_signatures', { investigation_id: id })
    ]).then(function(results) {
      state.detail     = (results[0] && results[0].data) || results[0] || {};
      state.audit      = (results[1] && results[1].data) || results[1] || [];
      state.signatures = (results[2] && results[2].data) || results[2] || [];
      state.loading    = false;
      state.error      = null;
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  function loadMetrics() {
    api('eqms_lab_investigations_metrics', state.filters).then(function(res) {
      state.metrics = (res && res.data) || res || {};
      rerender();
    }).catch(function() {});
  }

  function executeAction(action, payload) {
    if (!state.detail) return;
    var id = state.detail.investigation_id;
    state.loading = true;
    rerender();
    // actions with dedicated backend methods
    var dedicatedActions = ['start-phase1', 'start-phase2', 'request-retest', 'request-resample', 'link-capa', 'close', 'intake-oos', 'intake-oot'];
    if (dedicatedActions.indexOf(action) !== -1) {
      var endpoint = 'eqms_lab_investigations_action_' + action.replace(/-/g, '_');
      var body = Object.assign({ investigation_id: id }, payload || {});
      api(endpoint, body).then(function(res) {
        state.loading = false;
        if (res && res.success === false) { state.error = (res && res.message) || 'Action failed'; rerender(); }
        else { loadDetail(id); }
      }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
    } else {
      // void, conclude, update-phase1, update-phase2, update-conclusion, add-retest-decision:
      // fallback to update endpoint (no dedicated action endpoint)
      var fallbackBody = Object.assign({
        investigation_id: id,
        action: action
      }, payload || {});
      api('eqms_lab_investigations_update', fallbackBody).then(function(res) {
        state.loading = false;
        if (res && res.success === false) { state.error = res.message; rerender(); }
        else { state.detail = (res && res.data) || res; state.error = null; rerender(); }
      }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
    }
  }

  function handleExport(format) {
    api('eqms_lab_investigations_export', Object.assign({ format: format }, state.filters)).then(function(r) {
      if (r && r.url) window.open(r.url, '_blank');
      else toast(T({ vi: 'Đã yêu cầu xuất', en: 'Export requested' }));
    });
  }

  function toast(msg) {
    if (typeof window._ecShowToast === 'function') window._ecShowToast(msg, 'success');
  }

  function rerender() { if (_container) render(_container); }

  // ─── Helpers ────────────────────────────────────────────────────────────
  function typeBadge(type) {
    if (!type) return '';
    var cls = type === 'oos' ? 'rejected' : 'pending';
    var label = type === 'oos'
      ? T({ vi: 'OOS', en: 'OOS' })
      : T({ vi: 'OOT', en: 'OOT' });
    return '<span class="eqms-badge ' + cls + '">' + esc(label) + '</span>';
  }

  function phaseBadge(status) {
    if (!status) return '';
    var map = {
      intake:                { vi: 'Tiếp nhận',     en: 'Intake' },
      phase1_investigation:  { vi: 'Giai đoạn 1',   en: 'Phase 1' },
      phase2_investigation:  { vi: 'Giai đoạn 2',   en: 'Phase 2' },
      conclusion:            { vi: 'Kết luận',       en: 'Conclusion' },
      closed:                { vi: 'Đã đóng',        en: 'Closed' },
      voided:                { vi: 'Đã hủy',         en: 'Voided' }
    };
    return T(map[status] || { vi: status, en: status });
  }

  function ynLabel(val) {
    if (val === true || val === 'yes' || val === 'Y') return T({ vi: 'Có', en: 'Yes' });
    if (val === false || val === 'no' || val === 'N') return T({ vi: 'Không', en: 'No' });
    return '—';
  }

  function collectForm(el) {
    var d = {};
    el.querySelectorAll('[data-field]').forEach(function(f) {
      d[f.getAttribute('data-field')] = f.type === 'checkbox' ? f.checked : f.value;
    });
    return d;
  }

  // ─── Screen Tabs ────────────────────────────────────────────────────────
  var SCREEN_TABS = [
    { id: 'queue',     label: { vi: 'Hàng đợi',    en: 'Queue' } },
    { id: 'analytics', label: { vi: 'Phân tích',   en: 'Analytics' } }
  ];

  var DETAIL_TABS = [
    { id: 'summary',    label: { vi: 'Tổng quan',              en: 'Summary' } },
    { id: 'phase1',     label: { vi: 'Giai đoạn 1',            en: 'Phase 1' } },
    { id: 'phase2',     label: { vi: 'Giai đoạn 2',            en: 'Phase 2' } },
    { id: 'retest',     label: { vi: 'Thử lại / Lấy mẫu lại',  en: 'Retest / Resample' } },
    { id: 'conclusion', label: { vi: 'Kết luận',               en: 'Conclusion' } },
    { id: 'capa',       label: { vi: 'Liên kết CAPA',          en: 'CAPA Linkage' } },
    { id: 'evidence',   label: { vi: 'Hồ sơ bằng chứng',       en: 'Evidence Bundle' } },
    { id: 'audit',      label: { vi: 'Nhật ký & Chữ ký',       en: 'Audit & Signatures' } }
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER ROOT
  // ═══════════════════════════════════════════════════════════════════════
  function renderRoot() {
    if (!_container) return;
    var html = '<div class="eqms-module eqms-lab-investigations">';

    if (state.screen !== 'detail') {
      html += ui.renderTabs(SCREEN_TABS, state.screen);
    }

    if (state.loading && !state.detail && state.screen !== 'analytics') {
      html += ui.renderLoadingState({ vi: 'Đang tải dữ liệu...', en: 'Loading data...' });
      html += '</div>';
      _container.innerHTML = html;
      return;
    }

    if (state.error && state.screen !== 'detail') {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
      html += '</div>';
      _container.innerHTML = html;
      return;
    }

    switch (state.screen) {
      case 'queue':     html += renderQueue(); break;
      case 'detail':    html += renderDetail(); break;
      case 'analytics': html += renderAnalytics(); break;
    }

    html += '</div>';
    _container.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 1: QUEUE
  // ═══════════════════════════════════════════════════════════════════════
  function renderQueue() {
    var html = '';
    var m = state.metrics || {};

    // KPI row
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng đang mở',    en: 'Total Open' },         value: m.total_open != null ? fmt(m.total_open) : '...', accent: '' },
      { label: { vi: 'OOS',             en: 'OOS' },                value: m.oos_count != null ? fmt(m.oos_count) : '...',   accent: 'danger' },
      { label: { vi: 'OOT',             en: 'OOT' },                value: m.oot_count != null ? fmt(m.oot_count) : '...',   accent: 'warning' },
      { label: { vi: 'TB ngày đóng',    en: 'Avg Days to Close' },  value: m.avg_days_to_close != null ? m.avg_days_to_close : '...', accent: '' },
      { label: { vi: 'GD1 đóng (%)',    en: 'Phase 1 Close (%)' },  value: m.phase1_close_rate != null ? m.phase1_close_rate + '%' : '...', accent: 'info', trend: m.phase1_trend }
    ]);

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'type', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: INV_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Giai đoạn', en: 'Phase' }, options: STATES.map(function(s) {
          return { value: s, label: phaseBadge(s) };
        })},
        { key: 'product', type: 'text', label: { vi: 'Sản phẩm', en: 'Product' }, width: '140px' },
        { key: 'lab', type: 'text', label: { vi: 'Phòng TN', en: 'Lab' }, width: '120px' },
        { key: 'date_from', type: 'date', label: { vi: 'Từ ngày', en: 'From' } },
        { key: 'date_to', type: 'date', label: { vi: 'Đến ngày', en: 'To' } }
      ],
      savedViews: true
    });

    // Action bar
    html += '<div class="eqms-action-bar">';
    html += '<button class="eqms-btn primary sm" data-action="create-oos">' + T({ vi: '+ Tạo OOS', en: '+ New OOS' }) + '</button>';
    html += '<button class="eqms-btn secondary sm" data-action="create-oot">' + T({ vi: '+ Tạo OOT', en: '+ New OOT' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Data grid
    var columns = [
      { key: 'investigation_id', label: { vi: 'Mã',            en: 'Investigation ID' }, type: 'id',      sortable: true },
      { key: 'type',             label: { vi: 'Loại',          en: 'Type' },             sortable: true,
        render: function(v) { return typeBadge(v); } },
      { key: 'product',          label: { vi: 'Sản phẩm',      en: 'Product' },          sortable: true },
      { key: 'test_method',      label: { vi: 'Phương pháp',   en: 'Test Method' },      sortable: true },
      { key: 'specification',    label: { vi: 'Quy cách',      en: 'Specification' },    sortable: true },
      { key: 'actual_result',    label: { vi: 'Kết quả thực',  en: 'Actual Result' },    type: 'number',  sortable: true },
      { key: 'status',           label: { vi: 'Trạng thái',    en: 'Status' },           type: 'badge',   sortable: true },
      { key: 'phase_label',      label: { vi: 'Giai đoạn',     en: 'Phase' },            sortable: true,
        render: function(v, row) { return phaseBadge(row.status); } },
      { key: 'assigned_to',      label: { vi: 'Phụ trách',     en: 'Assigned To' },      sortable: true },
      { key: 'created_at',       label: { vi: 'Ngày tạo',      en: 'Created' },          type: 'date',    sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.records, {
      selectable: true,
      sortKey: state.sort.key,
      sortDir: state.sort.dir
    });
    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 2: DETAIL (8 tabs)
  // ═══════════════════════════════════════════════════════════════════════
  function renderDetail() {
    var d = state.detail;
    if (state.loading || !d) return ui.renderLoadingState({ vi: 'Đang tải chi tiết...', en: 'Loading detail...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-detail');

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="back-to-queue">';
    html += '\u2190 ' + T({ vi: 'Quay lại', en: 'Back' });
    html += '</button></div>';

    // Identity header
    var actions = WORKFLOW_ACTIONS[d.status] || [];
    html += ui.renderIdentityHeader({
      record_id:  d.investigation_id,
      title:      (d.product || '') + ' — ' + (d.test_method || ''),
      status:     d.status,
      owner:      d.assigned_to,
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at,
      version:    d.version,
      priority:   d.type === 'oos' ? 'critical' : 'medium'
    }, {
      actions: actions,
      extraMeta: [
        { label: { vi: 'Loại',       en: 'Type' },       value: d.type ? d.type.toUpperCase() : '' },
        { label: { vi: 'Phòng TN',   en: 'Lab' },        value: d.lab },
        { label: { vi: 'Số lô',      en: 'Batch' },      value: d.batch_number },
        { label: { vi: 'Độ lệch',    en: 'Deviation' },   value: d.deviation_amount }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(STATES, d.status);

    // Detail tabs
    html += ui.renderTabs(DETAIL_TABS, state.detailTab);
    html += '<div class="eqms-tab-content">';

    switch (state.detailTab) {
      case 'summary':    html += renderTabSummary(d); break;
      case 'phase1':     html += renderTabPhase1(d); break;
      case 'phase2':     html += renderTabPhase2(d); break;
      case 'retest':     html += renderTabRetest(d); break;
      case 'conclusion': html += renderTabConclusion(d); break;
      case 'capa':       html += renderTabCapa(d); break;
      case 'evidence':   html += renderTabEvidence(d); break;
      case 'audit':      html += renderTabAudit(d); break;
    }

    html += '</div>';
    return html;
  }

  // ── Tab: Summary ──────────────────────────────────────────────────────
  function renderTabSummary(d) {
    return ui.renderFieldGrid([
      { label: { vi: 'Mã điều tra',     en: 'Investigation ID' },    value: d.investigation_id, mono: true },
      { label: { vi: 'Loại',            en: 'Type' },                value: d.type ? d.type.toUpperCase() : '', badge: true },
      { label: { vi: 'Sản phẩm',        en: 'Product' },             value: d.product },
      { label: { vi: 'Số lô',           en: 'Batch Number' },        value: d.batch_number },
      { label: { vi: 'Phương pháp thử', en: 'Test Method' },         value: d.test_method },
      { label: { vi: 'Quy cách',        en: 'Specification' },       value: d.specification },
      { label: { vi: 'Giới hạn',        en: 'Specification Limit' }, value: d.specification_limit },
      { label: { vi: 'Kết quả thực',    en: 'Actual Result' },       value: d.actual_result },
      { label: { vi: 'Độ lệch',         en: 'Deviation Amount' },    value: d.deviation_amount },
      { label: { vi: 'Phòng thí nghiệm', en: 'Lab' },               value: d.lab },
      { label: { vi: 'Phân tích viên',  en: 'Analyst' },            value: d.analyst },
      { label: { vi: 'Ngày điều tra',   en: 'Investigation Date' }, value: fmtDate(d.investigation_date) }
    ]);
  }

  // ── Tab: Phase 1 — Lab Error Check ────────────────────────────────────
  function renderTabPhase1(d) {
    var p1 = d.phase1 || {};
    var html = '';

    html += ui.renderSection({ vi: 'Kiểm tra lỗi phòng thí nghiệm', en: 'Lab Error Check' },
      ui.renderFieldGrid([
        { label: { vi: 'Thiết bị đã xác minh',    en: 'Equipment Verified' },  value: ynLabel(p1.equipment_verified), badge: true },
        { label: { vi: 'Phương pháp đúng',         en: 'Method Followed' },     value: ynLabel(p1.method_followed),    badge: true },
        { label: { vi: 'Tình trạng mẫu',           en: 'Sample Integrity' },    value: ynLabel(p1.sample_integrity),   badge: true },
        { label: { vi: 'Tính toán đã kiểm tra',    en: 'Calculation Verified' }, value: ynLabel(p1.calculation_verified), badge: true }
      ])
    );

    html += ui.renderSection({ vi: 'Kết luận Giai đoạn 1', en: 'Phase 1 Conclusion' },
      ui.renderFieldGrid([
        { label: { vi: 'Nguyên nhân xác định',    en: 'Assignable Cause Found' }, value: ynLabel(p1.assignable_cause_found), badge: true },
        { label: { vi: 'Kết luận GĐ1',            en: 'Phase 1 Conclusion' },      value: p1.conclusion }
      ])
    );

    // Editable form when in phase1
    if (d.status === 'phase1_investigation') {
      html += ui.renderSection({ vi: 'Cập nhật Giai đoạn 1', en: 'Update Phase 1' }, renderPhase1Form(p1));
    }

    return html;
  }

  function renderPhase1Form(p1) {
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'p1_equipment_verified', label: { vi: 'Thiết bị đã xác minh', en: 'Equipment Verified' }, type: 'select', options: YESNO, value: p1.equipment_verified || '' });
    html += ui.renderFormField({ key: 'p1_method_followed', label: { vi: 'Phương pháp đúng', en: 'Method Followed' }, type: 'select', options: YESNO, value: p1.method_followed || '' });
    html += ui.renderFormField({ key: 'p1_sample_integrity', label: { vi: 'Tình trạng mẫu', en: 'Sample Integrity' }, type: 'select', options: YESNO, value: p1.sample_integrity || '' });
    html += ui.renderFormField({ key: 'p1_calculation_verified', label: { vi: 'Tính toán đã kiểm tra', en: 'Calculation Verified' }, type: 'select', options: YESNO, value: p1.calculation_verified || '' });
    html += ui.renderFormField({ key: 'p1_assignable_cause_found', label: { vi: 'Nguyên nhân xác định', en: 'Assignable Cause Found' }, type: 'select', options: YESNO, value: p1.assignable_cause_found || '' });
    html += ui.renderFormField({ key: 'p1_conclusion', label: { vi: 'Kết luận GĐ1', en: 'Phase 1 Conclusion' }, type: 'textarea', value: p1.conclusion || '' });
    html += '</div>';
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="save-phase1">' + T({ vi: 'Lưu Giai đoạn 1', en: 'Save Phase 1' }) + '</button>';
    html += '</div>';
    return html;
  }

  // ── Tab: Phase 2 — Extended Investigation ─────────────────────────────
  function renderTabPhase2(d) {
    var p2 = d.phase2 || {};
    var html = '';

    if (!p2.scope && d.status !== 'phase2_investigation') {
      return ui.renderEmptyState({
        icon: '\u{1F50D}',
        title: { vi: 'Chưa có điều tra giai đoạn 2', en: 'No Phase 2 investigation yet' },
        desc: { vi: 'Giai đoạn 2 sẽ bắt đầu khi không tìm thấy nguyên nhân ở GĐ1', en: 'Phase 2 starts when no assignable cause found in Phase 1' }
      });
    }

    html += ui.renderSection({ vi: 'Phạm vi điều tra mở rộng', en: 'Extended Investigation Scope' },
      ui.renderFieldGrid([
        { label: { vi: 'Phạm vi',                en: 'Investigation Scope' },        value: p2.scope },
        { label: { vi: 'Đánh giá tác động lô',   en: 'Batch Impact Assessment' },    value: p2.batch_impact_assessment },
        { label: { vi: 'Xem xét sản xuất',       en: 'Manufacturing Review' },       value: p2.manufacturing_review },
        { label: { vi: 'Kết quả thử bổ sung',    en: 'Additional Testing Results' }, value: p2.additional_testing_results },
        { label: { vi: 'Kết luận GĐ2',           en: 'Phase 2 Conclusion' },         value: p2.conclusion }
      ])
    );

    // Editable form when in phase2
    if (d.status === 'phase2_investigation') {
      html += ui.renderSection({ vi: 'Cập nhật Giai đoạn 2', en: 'Update Phase 2' }, renderPhase2Form(p2));
    }

    return html;
  }

  function renderPhase2Form(p2) {
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'p2_scope', label: { vi: 'Phạm vi điều tra', en: 'Investigation Scope' }, type: 'textarea', value: p2.scope || '' });
    html += ui.renderFormField({ key: 'p2_batch_impact', label: { vi: 'Đánh giá tác động lô', en: 'Batch Impact Assessment' }, type: 'textarea', value: p2.batch_impact_assessment || '' });
    html += ui.renderFormField({ key: 'p2_manufacturing_review', label: { vi: 'Xem xét sản xuất', en: 'Manufacturing Review' }, type: 'textarea', value: p2.manufacturing_review || '' });
    html += ui.renderFormField({ key: 'p2_additional_testing', label: { vi: 'Kết quả thử bổ sung', en: 'Additional Testing Results' }, type: 'textarea', value: p2.additional_testing_results || '' });
    html += ui.renderFormField({ key: 'p2_conclusion', label: { vi: 'Kết luận GĐ2', en: 'Phase 2 Conclusion' }, type: 'textarea', value: p2.conclusion || '' });
    html += '</div>';
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="save-phase2">' + T({ vi: 'Lưu Giai đoạn 2', en: 'Save Phase 2' }) + '</button>';
    html += '</div>';
    return html;
  }

  // ── Tab: Retest / Resample ────────────────────────────────────────────
  function renderTabRetest(d) {
    var decisions = d.retest_decisions || [];
    var html = '';

    // Decisions table
    html += ui.renderSection({ vi: 'Quyết định thử lại / lấy mẫu lại', en: 'Retest / Resample Decisions' },
      ui.renderDataGrid([
        { key: 'decision_type', label: { vi: 'Loại',           en: 'Type' },          type: 'badge' },
        { key: 'justification', label: { vi: 'Lý do',          en: 'Justification' }, type: 'truncate' },
        { key: 'date',          label: { vi: 'Ngày',           en: 'Date' },          type: 'date' },
        { key: 'result',        label: { vi: 'Kết quả',        en: 'Result' } },
        { key: 'analyst',       label: { vi: 'Phân tích viên', en: 'Analyst' } }
      ], decisions, { selectable: false })
    );

    // Comparison with original
    if (decisions.length > 0) {
      html += ui.renderSection({ vi: 'So sánh với kết quả ban đầu', en: 'Comparison with Original' },
        renderRetestComparison(d, decisions)
      );
    }

    // Add new decision form
    if (d.status === 'phase1_investigation' || d.status === 'phase2_investigation') {
      html += ui.renderSection({ vi: 'Thêm quyết định', en: 'Add Decision' }, renderRetestForm());
    }

    if (decisions.length === 0 && d.status !== 'phase1_investigation' && d.status !== 'phase2_investigation') {
      html += ui.renderEmptyState({
        icon: '\u{1F9EA}',
        title: { vi: 'Không có quyết định thử lại / lấy mẫu lại', en: 'No retest/resample decisions' },
        desc: { vi: 'Quyết định thử lại hoặc lấy mẫu lại sẽ xuất hiện ở đây', en: 'Retest or resample decisions will appear here' }
      });
    }

    return html;
  }

  function renderRetestComparison(d, decisions) {
    var html = '<table class="eqms-grid"><thead><tr>';
    html += '<th>' + T({ vi: 'Mục', en: 'Item' }) + '</th>';
    html += '<th>' + T({ vi: 'Giá trị', en: 'Value' }) + '</th>';
    html += '</tr></thead><tbody>';
    html += '<tr><td style="font-weight:600">' + T({ vi: 'Kết quả ban đầu', en: 'Original Result' }) + '</td>';
    html += '<td class="mono">' + esc(d.actual_result || '—') + '</td></tr>';

    decisions.forEach(function(dec, idx) {
      var label = (dec.decision_type === 'retest' ? T({ vi: 'Thử lại', en: 'Retest' }) : T({ vi: 'Lấy mẫu lại', en: 'Resample' }));
      html += '<tr><td style="font-weight:600">' + esc(label + ' #' + (idx + 1)) + '</td>';
      html += '<td class="mono">' + esc(dec.result || '—') + '</td></tr>';
    });

    html += '<tr><td style="font-weight:600">' + T({ vi: 'Quy cách', en: 'Specification' }) + '</td>';
    html += '<td class="mono">' + esc(d.specification_limit || d.specification || '—') + '</td></tr>';
    html += '</tbody></table>';
    return html;
  }

  function renderRetestForm() {
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'rt_type', label: { vi: 'Loại', en: 'Type' }, type: 'select', options: RETEST_TYPES, required: true });
    html += ui.renderFormField({ key: 'rt_justification', label: { vi: 'Lý do', en: 'Justification' }, type: 'textarea', required: true });
    html += ui.renderFormField({ key: 'rt_date', label: { vi: 'Ngày', en: 'Date' }, type: 'date' });
    html += ui.renderFormField({ key: 'rt_result', label: { vi: 'Kết quả', en: 'Result' }, type: 'text' });
    html += ui.renderFormField({ key: 'rt_analyst', label: { vi: 'Phân tích viên', en: 'Analyst' }, type: 'text' });
    html += '</div>';
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="add-retest-decision">' + T({ vi: 'Thêm', en: 'Add' }) + '</button>';
    html += '</div>';
    return html;
  }

  // ── Tab: Conclusion ───────────────────────────────────────────────────
  function renderTabConclusion(d) {
    var c = d.conclusion_data || {};
    var html = '';

    html += ui.renderFieldGrid([
      { label: { vi: 'Nguyên nhân gốc',         en: 'Root Cause' },                  value: c.root_cause },
      { label: { vi: 'Quyết định cuối cùng',    en: 'Final Disposition' },            value: c.final_disposition },
      { label: { vi: 'Tác động lô',             en: 'Batch Impact' },                 value: c.batch_impact, badge: true },
      { label: { vi: 'Thông báo cơ quan',       en: 'Regulatory Notification Required' }, value: ynLabel(c.regulatory_notification_required), badge: true }
    ]);

    // Editable form when in conclusion status
    if (d.status === 'conclusion' || d.status === 'phase2_investigation') {
      html += ui.renderSection({ vi: 'Cập nhật kết luận', en: 'Update Conclusion' }, renderConclusionForm(c));
    }

    return html;
  }

  function renderConclusionForm(c) {
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'conc_root_cause', label: { vi: 'Nguyên nhân gốc', en: 'Root Cause' }, type: 'textarea', value: c.root_cause || '', required: true });
    html += ui.renderFormField({ key: 'conc_final_disposition', label: { vi: 'Quyết định cuối cùng', en: 'Final Disposition' }, type: 'textarea', value: c.final_disposition || '' });
    html += ui.renderFormField({ key: 'conc_batch_impact', label: { vi: 'Tác động lô', en: 'Batch Impact' }, type: 'select', options: BATCH_IMPACTS, value: c.batch_impact || '' });
    html += ui.renderFormField({ key: 'conc_regulatory_notification', label: { vi: 'Thông báo cơ quan', en: 'Regulatory Notification Required' }, type: 'select', options: YESNO, value: c.regulatory_notification_required || '' });
    html += '</div>';
    html += '<div style="margin-top:12px;text-align:right">';
    html += '<button class="eqms-btn primary sm" data-action="save-conclusion">' + T({ vi: 'Lưu kết luận', en: 'Save Conclusion' }) + '</button>';
    html += '</div>';
    return html;
  }

  // ── Tab: CAPA Linkage ─────────────────────────────────────────────────
  function renderTabCapa(d) {
    var capas = d.linked_capas || [];
    var html = '';

    if (capas.length === 0) {
      html += ui.renderEmptyState({
        icon: '\u{1F517}',
        title: { vi: 'Chưa có CAPA được liên kết', en: 'No linked CAPAs' },
        desc: { vi: 'Liên kết CAPA để theo dõi hành động khắc phục / phòng ngừa', en: 'Link CAPAs to track corrective and preventive actions' }
      });
    } else {
      html += ui.renderDataGrid([
        { key: 'capa_id',     label: { vi: 'Mã CAPA',      en: 'CAPA ID' },      type: 'id' },
        { key: 'capa_type',   label: { vi: 'Loại',         en: 'Type' },          type: 'badge' },
        { key: 'title',       label: { vi: 'Tiêu đề',      en: 'Title' },         type: 'truncate' },
        { key: 'status',      label: { vi: 'Trạng thái',   en: 'Status' },        type: 'badge' },
        { key: 'priority',    label: { vi: 'Ưu tiên',      en: 'Priority' },      type: 'badge' },
        { key: 'owner',       label: { vi: 'Phụ trách',    en: 'Owner' } },
        { key: 'due_date',    label: { vi: 'Hạn',          en: 'Due Date' },      type: 'date' }
      ], capas, { selectable: false });
    }

    // Link CAPA button
    if (d.status === 'phase1_investigation' || d.status === 'phase2_investigation' || d.status === 'conclusion') {
      html += '<div style="margin-top:12px">';
      html += '<button class="eqms-btn secondary sm" data-action="link-capa">';
      html += T({ vi: '+ Liên kết CAPA', en: '+ Link CAPA' });
      html += '</button>';
      html += '</div>';
    }

    return html;
  }

  // ── Tab: Evidence Bundle ──────────────────────────────────────────────
  function renderTabEvidence(d) {
    var evidence = d.evidence || {};
    var html = '';

    // Lab data
    html += ui.renderSection({ vi: 'Dữ liệu phòng thí nghiệm', en: 'Lab Data' },
      (evidence.lab_data && evidence.lab_data.length)
        ? ui.renderDataGrid([
            { key: 'parameter', label: { vi: 'Thông số',   en: 'Parameter' } },
            { key: 'value',     label: { vi: 'Giá trị',    en: 'Value' },     type: 'number' },
            { key: 'unit',      label: { vi: 'Đơn vị',     en: 'Unit' } },
            { key: 'date',      label: { vi: 'Ngày',       en: 'Date' },      type: 'date' },
            { key: 'analyst',   label: { vi: 'Phân tích viên', en: 'Analyst' } }
          ], evidence.lab_data, { selectable: false })
        : '<div style="padding:12px;color:var(--hm-text-secondary);font-size:13px">' + T({ vi: 'Chưa có dữ liệu phòng TN', en: 'No lab data attached' }) + '</div>'
    );

    // Charts / trend data
    html += ui.renderSection({ vi: 'Biểu đồ xu hướng', en: 'Trend Charts' },
      ui.renderChartWithTableFallback('lab-inv-trend', null,
        [
          { key: 'date',   label: { vi: 'Ngày', en: 'Date' },      type: 'date' },
          { key: 'value',  label: { vi: 'Giá trị', en: 'Value' },   type: 'number' },
          { key: 'spec_upper', label: { vi: 'USL', en: 'USL' },     type: 'number' },
          { key: 'spec_lower', label: { vi: 'LSL', en: 'LSL' },     type: 'number' }
        ],
        evidence.trend_data || []
      )
    );

    // Certificates
    html += ui.renderSection({ vi: 'Chứng chỉ', en: 'Certificates' },
      ui.renderAttachmentsGrid(evidence.certificates || [])
    );

    // General attachments
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(d.attachments || [])
    );

    return html;
  }

  // ── Tab: Audit Trail + Signatures + Comments ──────────────────────────
  function renderTabAudit(d) {
    var html = '';
    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' }, ui.renderAuditTrail(state.audit));
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' }, ui.renderSignaturePanel(state.signatures, [
      { vi: 'Phân tích viên', en: 'Analyst' },
      { vi: 'Giám sát phòng TN', en: 'Lab Supervisor' },
      { vi: 'QA Manager', en: 'QA Manager' }
    ]));
    html += ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' }, ui.renderAttachmentsGrid(d.attachments || []));
    html += ui.renderSection({ vi: 'Bình luận', en: 'Comments' }, ui.renderCommentsThread(d.comments || []));
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 3: ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════
  function renderAnalytics() {
    var html = '';
    var m = state.metrics || {};

    // KPI cards
    html += ui.renderKpiRow([
      { label: { vi: 'Tổng OOS/OOT',       en: 'Total OOS/OOT' },          value: fmt(m.total_investigations), accent: '' },
      { label: { vi: 'Tỷ lệ OOS',           en: 'OOS Rate' },               value: m.oos_rate != null ? m.oos_rate + '%' : '—', accent: 'danger' },
      { label: { vi: 'Tỷ lệ OOT',           en: 'OOT Rate' },               value: m.oot_rate != null ? m.oot_rate + '%' : '—', accent: 'warning' },
      { label: { vi: 'TB thời gian đóng',   en: 'Avg Close Time (days)' },  value: m.avg_days_to_close || '—', accent: '' },
      { label: { vi: 'GĐ1 đóng (%)',        en: 'Phase 1 Close Rate' },     value: m.phase1_close_rate != null ? m.phase1_close_rate + '%' : '—', accent: 'info' }
    ]);

    // OOS/OOT frequency trend
    html += ui.renderSection({ vi: 'Xu hướng tần suất OOS/OOT', en: 'OOS/OOT Frequency Trend' },
      ui.renderChartWithTableFallback('chart-freq-trend', null,
        [
          { key: 'period',    label: { vi: 'Thời gian', en: 'Period' } },
          { key: 'oos_count', label: { vi: 'OOS',       en: 'OOS' },     type: 'number' },
          { key: 'oot_count', label: { vi: 'OOT',       en: 'OOT' },     type: 'number' },
          { key: 'total',     label: { vi: 'Tổng',      en: 'Total' },   type: 'number' }
        ],
        m.frequency_trend || []
      )
    );

    // By-product distribution
    html += ui.renderSection({ vi: 'Phân bổ theo sản phẩm', en: 'Distribution by Product' },
      ui.renderChartWithTableFallback('chart-by-product', null,
        [
          { key: 'product',   label: { vi: 'Sản phẩm',  en: 'Product' } },
          { key: 'oos_count', label: { vi: 'OOS',       en: 'OOS' },     type: 'number' },
          { key: 'oot_count', label: { vi: 'OOT',       en: 'OOT' },     type: 'number' },
          { key: 'total',     label: { vi: 'Tổng',      en: 'Total' },   type: 'number' }
        ],
        m.by_product || []
      )
    );

    // Investigation duration
    html += ui.renderSection({ vi: 'Thời gian điều tra', en: 'Investigation Duration' },
      ui.renderChartWithTableFallback('chart-inv-duration', null,
        [
          { key: 'period',    label: { vi: 'Thời gian',      en: 'Period' } },
          { key: 'avg_days',  label: { vi: 'TB (ngày)',       en: 'Avg (days)' },    type: 'number' },
          { key: 'min_days',  label: { vi: 'Nhỏ nhất',       en: 'Min (days)' },     type: 'number' },
          { key: 'max_days',  label: { vi: 'Lớn nhất',       en: 'Max (days)' },     type: 'number' }
        ],
        m.duration_trend || []
      )
    );

    // Root cause distribution
    html += ui.renderSection({ vi: 'Phân bổ nguyên nhân gốc', en: 'Root Cause Distribution' },
      ui.renderChartWithTableFallback('chart-root-cause', null,
        [
          { key: 'root_cause', label: { vi: 'Nguyên nhân',   en: 'Root Cause' } },
          { key: 'count',      label: { vi: 'Số lượng',      en: 'Count' },           type: 'number' },
          { key: 'pct',        label: { vi: 'Tỷ lệ (%)',     en: 'Percentage (%)' },  type: 'number' }
        ],
        m.root_cause_distribution || []
      )
    );

    // Phase 1 vs Phase 2 closure rate
    html += ui.renderSection({ vi: 'Tỷ lệ đóng: Giai đoạn 1 vs Giai đoạn 2', en: 'Closure Rate: Phase 1 vs Phase 2' },
      ui.renderChartWithTableFallback('chart-phase-closure', null,
        [
          { key: 'period',         label: { vi: 'Thời gian',   en: 'Period' } },
          { key: 'phase1_closed',  label: { vi: 'GĐ1 đóng',    en: 'Phase 1 Closed' }, type: 'number' },
          { key: 'phase2_closed',  label: { vi: 'GĐ2 đóng',    en: 'Phase 2 Closed' }, type: 'number' },
          { key: 'phase1_rate',    label: { vi: 'GĐ1 (%)',     en: 'Phase 1 (%)' },    type: 'number' },
          { key: 'phase2_rate',    label: { vi: 'GĐ2 (%)',     en: 'Phase 2 (%)' },    type: 'number' }
        ],
        m.phase_closure_trend || []
      )
    );

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE FORMS
  // ═══════════════════════════════════════════════════════════════════════
  function renderCreateForm(invType) {
    var body = '';
    body += '<input type="hidden" data-field="type" value="' + esc(invType) + '">';
    body += ui.renderFormField({ key: 'product', label: { vi: 'Sản phẩm', en: 'Product' }, required: true });
    body += ui.renderFormField({ key: 'batch_number', label: { vi: 'Số lô', en: 'Batch Number' }, required: true });
    body += ui.renderFormField({ key: 'test_method', label: { vi: 'Phương pháp thử', en: 'Test Method' }, required: true });
    body += ui.renderFormField({ key: 'specification', label: { vi: 'Quy cách', en: 'Specification' }, required: true });
    body += ui.renderFormField({ key: 'specification_limit', label: { vi: 'Giới hạn quy cách', en: 'Specification Limit' } });
    body += ui.renderFormField({ key: 'actual_result', label: { vi: 'Kết quả thực tế', en: 'Actual Result' }, required: true });
    body += ui.renderFormField({ key: 'deviation_amount', label: { vi: 'Độ lệch', en: 'Deviation Amount' } });
    body += ui.renderFormField({ key: 'lab', label: { vi: 'Phòng thí nghiệm', en: 'Lab' } });
    body += ui.renderFormField({ key: 'analyst', label: { vi: 'Phân tích viên', en: 'Analyst' } });
    body += ui.renderFormField({ key: 'investigation_date', label: { vi: 'Ngày điều tra', en: 'Investigation Date' }, type: 'date' });
    body += ui.renderFormField({ key: 'description', label: { vi: 'Mô tả', en: 'Description' }, type: 'textarea' });
    return ui.renderWizardShell([
      { label: { vi: 'Thông tin', en: 'Information' } },
      { label: { vi: 'Xem xét',  en: 'Review' } }
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
          if (tabId === 'queue') { loadQueue(); loadMetrics(); }
          else if (tabId === 'analytics') { loadMetrics(); renderRoot(); }
          return;
        }
        // Detail tab
        var detailIds = DETAIL_TABS.map(function(t) { return t.id; });
        if (detailIds.indexOf(tabId) >= 0 && state.screen === 'detail') {
          state.detailTab = tabId;
          renderRoot();
          return;
        }
      }

      // Row click
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input') && !e.target.closest('button')) {
        var id = row.getAttribute('data-id');
        if (state.screen === 'queue') {
          state.screen = 'detail';
          loadDetail(id);
          return;
        }
      }

      // Actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        // Navigation
        case 'back-to-queue':
          state.screen = 'queue'; state.detail = null; state.error = null;
          loadQueue(); loadMetrics(); break;

        // Create
        case 'create-oos':
          showModal({ vi: 'Tạo OOS mới', en: 'New OOS Investigation' }, renderCreateForm('oos')); break;
        case 'create-oot':
          showModal({ vi: 'Tạo OOT mới', en: 'New OOT Investigation' }, renderCreateForm('oot')); break;

        // Wizard submit
        case 'wizard-submit':
          handleWizardSubmit(); break;
        case 'cancel-modal':
          closeModal(); break;

        // Workflow actions
        case 'start-phase1':
          executeAction('start-phase1'); break;
        case 'start-phase2':
          executeAction('start-phase2'); break;
        case 'conclude':
          executeAction('conclude'); break;
        case 'close':
          executeAction('close'); break;
        case 'void':
          executeAction('void'); break;
        case 'request-retest':
          executeAction('request-retest'); break;
        case 'request-resample':
          executeAction('request-resample'); break;
        case 'link-capa':
          executeAction('link-capa'); break;

        // Save forms
        case 'save-phase1':
          handleSavePhase1(); break;
        case 'save-phase2':
          handleSavePhase2(); break;
        case 'save-conclusion':
          handleSaveConclusion(); break;
        case 'add-retest-decision':
          handleAddRetestDecision(); break;

        // Filters
        case 'apply-filters':
          applyFilters(); break;
        case 'reset-filters':
          state.filters = {}; state.page = 1; loadQueue(); loadMetrics(); break;

        // Retry
        case 'retry-queue':
          loadQueue(); loadMetrics(); break;
        case 'retry-detail':
          if (state.detail && state.detail.investigation_id) loadDetail(state.detail.investigation_id); break;

        // Export
        case 'export':
          handleExport(actionEl.getAttribute('data-format')); break;

        // Pagination
        case 'page':
          var p = parseInt(actionEl.getAttribute('data-page'), 10);
          if (!isNaN(p) && p >= 1) { state.page = p; loadQueue(); }
          break;
      }
    });

    // Sort
    el.addEventListener('click', function(e) {
      var th = e.target.closest('th[data-sort]');
      if (!th || state.screen !== 'queue') return;
      var key = th.getAttribute('data-sort');
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.key = key;
        state.sort.dir = 'asc';
      }
      loadQueue();
    });
  }

  function applyFilters() {
    if (!_container) return;
    _container.querySelectorAll('[data-filter]').forEach(function(f) {
      var key = f.getAttribute('data-filter');
      var val = f.value;
      if (val) state.filters[key] = val; else delete state.filters[key];
    });
    state.page = 1;
    loadQueue();
    loadMetrics();
  }

  function handleWizardSubmit() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal) return;
    var data = collectForm(modal);
    api('eqms_lab_investigations_create', data).then(function(res) {
      closeModal();
      toast(T({ vi: 'Đã tạo thành công', en: 'Created successfully' }));
      if (res && res.data && res.data.investigation_id) {
        state.screen = 'detail';
        loadDetail(res.data.investigation_id);
      } else {
        loadQueue(); loadMetrics();
      }
    }).catch(function(err) {
      toast(T({ vi: 'Lỗi', en: 'Error' }) + ': ' + (err.message || ''));
    });
  }

  function handleSavePhase1() {
    if (!state.detail || !_container) return;
    var data = collectForm(_container);
    executeAction('update-phase1', {
      equipment_verified:    data.p1_equipment_verified,
      method_followed:       data.p1_method_followed,
      sample_integrity:      data.p1_sample_integrity,
      calculation_verified:  data.p1_calculation_verified,
      assignable_cause_found: data.p1_assignable_cause_found,
      conclusion:            data.p1_conclusion
    });
  }

  function handleSavePhase2() {
    if (!state.detail || !_container) return;
    var data = collectForm(_container);
    executeAction('update-phase2', {
      scope:                     data.p2_scope,
      batch_impact_assessment:   data.p2_batch_impact,
      manufacturing_review:      data.p2_manufacturing_review,
      additional_testing_results: data.p2_additional_testing,
      conclusion:                data.p2_conclusion
    });
  }

  function handleSaveConclusion() {
    if (!state.detail || !_container) return;
    var data = collectForm(_container);
    executeAction('update-conclusion', {
      root_cause:                       data.conc_root_cause,
      final_disposition:                data.conc_final_disposition,
      batch_impact:                     data.conc_batch_impact,
      regulatory_notification_required: data.conc_regulatory_notification
    });
  }

  function handleAddRetestDecision() {
    if (!state.detail || !_container) return;
    var data = collectForm(_container);
    executeAction('add-retest-decision', {
      decision_type: data.rt_type,
      justification: data.rt_justification,
      date:          data.rt_date,
      result:        data.rt_result,
      analyst:       data.rt_analyst
    });
  }

  // ─── Modal ──────────────────────────────────────────────────────────────
  function showModal(title, bodyHtml) {
    var existing = document.querySelector('.eqms-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'eqms-modal-overlay';
    overlay.innerHTML = '<div class="eqms-modal">' +
      '<div class="eqms-modal-header"><span>' + esc(T(title)) + '</span>' +
      '<button class="eqms-modal-close" data-action="cancel-modal">\u2715</button></div>' +
      bodyHtml + '</div>';
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
  function render(el) {
    _container = el;
    renderRoot();

    // Initial data load on first render only (not after every empty-result response)
    if (state.screen === 'queue' && !state.loaded && !state.loading) {
      loadQueue();
      loadMetrics();
    }

    bindEvents(el);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTER MODULE
  // ═══════════════════════════════════════════════════════════════════════
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['lab-investigations'] = { render: render, meta: MOD };

})();

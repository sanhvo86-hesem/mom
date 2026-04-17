/**
 * EQMS Engineering Change — Evidence Workspace
 * HESEM MOM Portal · 47-eqms-engineering-change.js
 *
 * Authority: AS9100D §8.3.6, IATF 16949 §8.3.6, ISO 13485 §7.3.9
 * Workflow:  draft → assessment → pending_approval → approved → implementation → closed | cancelled
 * Screens:  Queue, Detail (8 tabs), Create Wizard, Analytics
 *
 * @since 4.0.0
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T, esc = util.esc, fmt = util.fmt, fmtDate = util.fmtDate;
  var fmtDateTime = util.fmtDateTime, slugify = util.slugify, apiCall = util.apiCall;

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var MOD = {
    id:    'engineering-change',
    label: { vi: 'Thay đổi kỹ thuật', en: 'Engineering Change' },
    icon:  '\u2699\uFE0F'
  };

  var API_BASE = 'api/v1/eqms/engineering-change';

  var STATES = ['draft', 'assessment', 'pending_approval', 'approved', 'implementation', 'closed', 'cancelled'];

  var STATUS_LABELS = {
    draft:            { vi: 'Nháp',             en: 'Draft' },
    assessment:       { vi: 'Đang đánh giá',    en: 'Under Assessment' },
    pending_approval: { vi: 'Chờ phê duyệt',    en: 'Pending Approval' },
    approved:         { vi: 'Đã phê duyệt',     en: 'Approved' },
    implementation:   { vi: 'Đang triển khai',   en: 'Implementation' },
    closed:           { vi: 'Đã đóng',           en: 'Closed' },
    cancelled:        { vi: 'Đã huỷ',            en: 'Cancelled' }
  };

  var CHANGE_TYPES = [
    { value: 'design',   label: { vi: 'Thiết kế',      en: 'Design' } },
    { value: 'material', label: { vi: 'Vật liệu',      en: 'Material' } },
    { value: 'process',  label: { vi: 'Quy trình',     en: 'Process' } },
    { value: 'tooling',  label: { vi: 'Dụng cụ/Khuôn', en: 'Tooling' } },
    { value: 'supplier', label: { vi: 'Nhà cung cấp',  en: 'Supplier' } }
  ];

  var PRIORITIES = [
    { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } },
    { value: 'high',     label: { vi: 'Cao',           en: 'High' } },
    { value: 'medium',   label: { vi: 'Trung bình',    en: 'Medium' } },
    { value: 'low',      label: { vi: 'Thấp',          en: 'Low' } }
  ];

  var DETAIL_TABS = [
    { id: 'summary',        label: { vi: 'Tổng quan',          en: 'Summary' } },
    { id: 'bom-impact',     label: { vi: 'Tác động BOM',       en: 'BOM Impact' } },
    { id: 'drawing',        label: { vi: 'Bản vẽ',             en: 'Drawing Revision' } },
    { id: 'process-change', label: { vi: 'Thay đổi quy trình', en: 'Process Change' } },
    { id: 'approval',       label: { vi: 'Phê duyệt',          en: 'Approval' } },
    { id: 'implementation', label: { vi: 'Triển khai',          en: 'Implementation' } },
    { id: 'related',        label: { vi: 'Liên kết',            en: 'Related Records' } },
    { id: 'audit-trail',    label: { vi: 'Nhật ký',             en: 'Audit Trail' } }
  ];

  var WIZARD_STEPS = [
    { label: { vi: 'Loại thay đổi',    en: 'Change Type' } },
    { label: { vi: 'Hạng mục ảnh hưởng', en: 'Affected Items' } },
    { label: { vi: 'Mô tả & Lý do',    en: 'Description' } },
    { label: { vi: 'Đánh giá tác động', en: 'Impact Assessment' } }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: 'queue',          // queue | detail | create | analytics
    // Queue
    filters: {},
    sortKey: 'created_at',
    sortDir: 'desc',
    items: [],
    pagination: { total: 0, offset: 0, limit: 25 },
    metrics: null,
    // Detail
    recordId: null,
    record: null,
    activeTab: 'summary',
    auditEvents: [],
    comments: [],
    attachments: [],
    relationships: [],
    signatures: [],
    bomChanges: [],
    drawings: [],
    processChanges: [],
    approvalChain: [],
    implTasks: [],
    // Create wizard
    wizardStep: 0,
    wizardData: {},
    // General
    loading: false,
    error: null
  };

  // =========================================================================
  // API HELPERS
  // =========================================================================
  function api(path, payload, method, timeout) {
    method = method || 'POST';
    timeout = timeout || 30000;
    var url = API_BASE + (path ? '/' + path : '');
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    return fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken || '' },
      body: method !== 'GET' ? JSON.stringify(payload || {}) : undefined,
      signal: controller.signal
    }).then(function(r) {
      clearTimeout(timer);
      return r.json().then(function(data) {
        return util.normalizeApiResponse ? util.normalizeApiResponse(data, r.status) : data;
      });
    })
      .catch(function(err) { clearTimeout(timer); if (err.name === 'AbortError') return { ok: false, error: 'timeout' }; throw err; });
  }

  function apiGet(path, timeout) {
    timeout = timeout || 30000;
    var url = API_BASE + '/' + path;
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    return fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken || '' },
      signal: controller.signal
    }).then(function(r) {
      clearTimeout(timer);
      return r.json().then(function(data) {
        return util.normalizeApiResponse ? util.normalizeApiResponse(data, r.status) : data;
      });
    })
      .catch(function(err) { clearTimeout(timer); if (err.name === 'AbortError') return { ok: false, error: 'timeout' }; throw err; });
  }

  // =========================================================================
  // DATA LOADERS
  // =========================================================================
  function loadQueue(container) {
    state.loading = true;
    renderInto(container);

    api('query', {
      filters: state.filters,
      sort_by: state.sortKey,
      sort_dir: state.sortDir,
      offset: state.pagination.offset,
      limit: state.pagination.limit
    }).then(function(res) {
      state.loading = false;
      if (res.ok) {
        state.items = res.engineering_changes || res.data || [];
        state.pagination.total = res.total || 0;
      } else {
        state.error = res.error || 'load_failed';
      }
      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function loadDetail(container, id) {
    state.loading = true;
    state.recordId = id;
    renderInto(container);

    Promise.all([
      apiGet(id),
      apiGet(id + '/audit'),
      apiGet(id + '/comments'),
      apiGet(id + '/attachments'),
      apiGet(id + '/relationships'),
      apiGet(id + '/signatures')
    ]).then(function(results) {
      state.loading = false;
      var detail = results[0];
      if (detail.ok) {
        state.record = detail.engineering_change || detail.data || {};
        state.record.status_label = T(STATUS_LABELS[state.record.status] || {});
      } else {
        state.error = detail.error || 'load_failed';
      }
      state.auditEvents    = (results[1].ok ? results[1].events || results[1].data : []) || [];
      state.comments       = (results[2].ok ? results[2].comments || results[2].data : []) || [];
      state.attachments    = (results[3].ok ? results[3].attachments || results[3].data : []) || [];
      state.relationships  = (results[4].ok ? results[4].relationships || results[4].data : []) || [];
      state.signatures     = (results[5].ok ? results[5].signatures || results[5].data : []) || [];

      // Parse JSON fields
      var rec = state.record || {};
      state.bomChanges      = tryParseJson(rec.affected_bom_ids) || [];
      state.drawings        = tryParseJson(rec.affected_docs) || [];
      state.processChanges  = tryParseJson(rec.process_changes) || [];
      state.approvalChain   = tryParseJson(rec.approval_chain) || [];
      state.implTasks       = tryParseJson(rec.implementation_tasks) || [];

      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function loadMetrics(container) {
    state.loading = true;
    renderInto(container);

    apiGet('metrics').then(function(res) {
      state.loading = false;
      if (res.ok) {
        state.metrics = res.metrics || {};
      } else {
        state.error = res.error || 'metrics_failed';
      }
      renderInto(container);
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  function tryParseJson(val) {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch(e) { return null; }
  }

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================
  function getAvailableActions(status) {
    var map = {
      draft:            [{ action: 'submit-assessment', label: { vi: 'Gửi đánh giá', en: 'Submit for Assessment' }, style: 'primary' }],
      assessment:       [
        { action: 'approve', label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'primary' },
        { action: 'cancel',  label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ],
      pending_approval: [
        { action: 'approve', label: { vi: 'Phê duyệt', en: 'Approve' }, style: 'primary' },
        { action: 'cancel',  label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ],
      approved:         [
        { action: 'implement', label: { vi: 'Bắt đầu triển khai', en: 'Start Implementation' }, style: 'primary' },
        { action: 'cancel',    label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ],
      implementation:   [
        { action: 'close', label: { vi: 'Đóng', en: 'Close' }, style: 'primary' },
        { action: 'cancel', label: { vi: 'Huỷ', en: 'Cancel' }, style: 'ghost' }
      ]
    };
    return map[status] || [];
  }

  function executeAction(container, actionKey) {
    if (!state.record) return;
    var id = state.recordId;
    var version = state.record.version;

    api(id + '/actions/' + actionKey, { version: version }).then(function(res) {
      if (res.ok) {
        loadDetail(container, id);
      } else {
        alert(T({ vi: 'Lỗi: ', en: 'Error: ' }) + (res.error || 'action_failed'));
      }
    }).catch(function(err) {
      alert(T({ vi: 'Lỗi kết nối', en: 'Connection error' }));
    });
  }

  // =========================================================================
  // RENDER: QUEUE SCREEN
  // =========================================================================
  function renderQueue() {
    var html = '';

    // Header
    html += '<div class="eqms-screen-header">';
    html += '<h2>' + T({ vi: 'Thay đổi kỹ thuật', en: 'Engineering Changes' }) + '</h2>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="eqms-btn secondary sm" data-action="go-analytics">' + T({ vi: 'Phân tích', en: 'Analytics' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '<button class="eqms-btn primary sm" data-action="go-create">+ ' + T({ vi: 'Tạo ECO', en: 'New ECO' }) + '</button>';
    html += '</div></div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'change_category', type: 'select', label: { vi: 'Loại', en: 'Type' }, options: CHANGE_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trạng thái', en: 'Status' },
          options: STATES.map(function(s) { return { value: s, label: STATUS_LABELS[s] }; })
        }
      ]
    });

    // Grid
    var columns = [
      { key: 'ec_number',       label: { vi: 'Mã ECO', en: 'ECO ID' },       type: 'id', sortable: true },
      { key: 'title',           label: { vi: 'Tiêu đề', en: 'Title' },       type: 'truncate', sortable: true },
      { key: 'change_category', label: { vi: 'Loại', en: 'Type' },           type: 'badge', sortable: true },
      { key: 'status',          label: { vi: 'Trạng thái', en: 'Status' },   type: 'badge', sortable: true },
      { key: 'affected_parts',  label: { vi: 'Part Number', en: 'Part Number' }, sortable: false,
        render: function(v) {
          var parts = tryParseJson(v);
          if (!parts || !parts.length) return '\u2014';
          return esc(parts.slice(0, 2).join(', ')) + (parts.length > 2 ? ' +' + (parts.length - 2) : '');
        }
      },
      { key: 'created_by',     label: { vi: 'Người yêu cầu', en: 'Requestor' }, sortable: true },
      { key: 'created_at',     label: { vi: 'Ngày tạo', en: 'Created' },     type: 'date', sortable: true },
      { key: 'effective_date', label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, type: 'date', sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.items, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination(state.pagination);
    return html;
  }

  // =========================================================================
  // RENDER: DETAIL SCREEN
  // =========================================================================
  function renderDetail() {
    var rec = state.record;
    if (!rec) return (ui.renderRichErrorState || ui.renderErrorState)(T({ vi: 'Không tìm thấy bản ghi', en: 'Record not found' }), 'retry-detail');

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-queue">\u2190 ' + T({ vi: 'Quay lại danh sách', en: 'Back to list' }) + '</button>';
    html += '</div>';

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getAvailableActions(rec.status),
      extraMeta: [
        { label: { vi: 'Loại thay đổi', en: 'Change Type' }, value: rec.change_category },
        { label: { vi: 'Mã ECO', en: 'ECO Number' }, value: rec.ec_number },
        { label: { vi: 'Ngày hiệu lực', en: 'Effective Date' }, value: fmtDate(rec.effective_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(STATES, rec.status);

    // Tabs
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    html += renderDetailTab();
    html += '</div>';

    return html;
  }

  function renderDetailTab() {
    switch (state.activeTab) {
      case 'summary':        return renderTabSummary();
      case 'bom-impact':     return renderTabBomImpact();
      case 'drawing':        return renderTabDrawing();
      case 'process-change': return renderTabProcessChange();
      case 'approval':       return renderTabApproval();
      case 'implementation': return renderTabImplementation();
      case 'related':        return renderTabRelated();
      case 'audit-trail':    return renderTabAuditTrail();
      default:               return '';
    }
  }

  // --- Tab: Summary ---
  function renderTabSummary() {
    var rec = state.record || {};
    var fields = [
      { label: { vi: 'Mã ECO',             en: 'ECO Number' },          value: rec.ec_number, mono: true },
      { label: { vi: 'Tiêu đề',            en: 'Title' },               value: rec.title },
      { label: { vi: 'Loại thay đổi',      en: 'Change Type' },         value: rec.change_category, badge: true },
      { label: { vi: 'Trạng thái',         en: 'Status' },              value: T(STATUS_LABELS[rec.status] || {}), badge: true },
      { label: { vi: 'Người yêu cầu',      en: 'Requestor' },           value: rec.created_by },
      { label: { vi: 'Bộ phận',            en: 'Department' },           value: rec.department },
      { label: { vi: 'Mức ưu tiên',        en: 'Priority' },             value: rec.priority, badge: true },
      { label: { vi: 'Ngày mục tiêu',      en: 'Target Date' },          value: fmtDate(rec.effective_date) },
      { label: { vi: 'Phiên bản hiện tại', en: 'Current Revision' },     value: rec.affected_revision },
      { label: { vi: 'Phiên bản mới',      en: 'New Revision' },         value: rec.new_revision },
      { label: { vi: 'Thông báo pháp quy', en: 'Regulatory Notification' }, value: rec.regulatory_notification ? T({ vi: 'Có', en: 'Yes' }) : T({ vi: 'Không', en: 'No' }) }
    ];

    var html = ui.renderSection({ vi: 'Thông tin chung', en: 'General Information' }, ui.renderFieldGrid(fields));

    // Description
    html += ui.renderSection({ vi: 'Mô tả', en: 'Description' },
      '<div class="eqms-field-value" style="white-space:pre-wrap">' + esc(rec.description || '\u2014') + '</div>'
    );

    // Justification / Reason
    html += ui.renderSection({ vi: 'Lý do thay đổi', en: 'Justification' },
      '<div class="eqms-field-value" style="white-space:pre-wrap">' + esc(rec.reason || '\u2014') + '</div>'
    );

    // Affected parts
    var parts = tryParseJson(rec.affected_parts) || [];
    if (parts.length) {
      var partsHtml = '<div class="eqms-tag-list">';
      parts.forEach(function(p) {
        partsHtml += '<span class="eqms-badge">' + esc(typeof p === 'string' ? p : (p.part_number || p)) + '</span>';
      });
      partsHtml += '</div>';
      html += ui.renderSection({ vi: 'Hạng mục ảnh hưởng', en: 'Affected Part Numbers' }, partsHtml);
    }

    return html;
  }

  // --- Tab: BOM Impact ---
  function renderTabBomImpact() {
    var columns = [
      { key: 'component',   label: { vi: 'Thành phần', en: 'Component' }, sortable: false },
      { key: 'old_revision', label: { vi: 'Rev cũ', en: 'Old Rev' }, sortable: false },
      { key: 'new_revision', label: { vi: 'Rev mới', en: 'New Rev' }, sortable: false },
      { key: 'action',      label: { vi: 'Hành động', en: 'Action' }, type: 'badge', sortable: false },
      { key: 'qty_change',  label: { vi: 'Thay đổi SL', en: 'Qty Change' }, type: 'number', sortable: false },
      { key: 'notes',       label: { vi: 'Ghi chú', en: 'Notes' }, sortable: false }
    ];

    var data = state.bomChanges || [];

    var html = ui.renderSection({ vi: 'Tác động BOM', en: 'BOM Impact Analysis' },
      ui.renderDataGrid(columns, data, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn ghost sm" data-action="add-bom-row">+ ' +
          T({ vi: 'Thêm dòng', en: 'Add Row' }) + '</button>'
      }
    );

    // Summary
    if (data.length) {
      var added    = data.filter(function(d) { return d.action === 'add'; }).length;
      var removed  = data.filter(function(d) { return d.action === 'remove'; }).length;
      var modified = data.filter(function(d) { return d.action === 'modify'; }).length;
      html += '<div class="eqms-kpi-row" style="margin-top:12px">';
      html += '<div class="eqms-kpi-card"><div class="eqms-kpi-label">' + T({ vi: 'Thêm mới', en: 'Added' }) + '</div><div class="eqms-kpi-value">' + added + '</div></div>';
      html += '<div class="eqms-kpi-card"><div class="eqms-kpi-label">' + T({ vi: 'Xoá', en: 'Removed' }) + '</div><div class="eqms-kpi-value">' + removed + '</div></div>';
      html += '<div class="eqms-kpi-card"><div class="eqms-kpi-label">' + T({ vi: 'Sửa đổi', en: 'Modified' }) + '</div><div class="eqms-kpi-value">' + modified + '</div></div>';
      html += '</div>';
    }

    return html;
  }

  // --- Tab: Drawing Revision ---
  function renderTabDrawing() {
    var columns = [
      { key: 'drawing_number', label: { vi: 'Số bản vẽ', en: 'Drawing #' }, type: 'id', sortable: false },
      { key: 'old_revision',   label: { vi: 'Rev cũ', en: 'Old Rev' }, sortable: false },
      { key: 'new_revision',   label: { vi: 'Rev mới', en: 'New Rev' }, sortable: false },
      { key: 'changes_desc',   label: { vi: 'Mô tả thay đổi', en: 'Changes Description' }, sortable: false },
      { key: 'status',         label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: false }
    ];

    var data = state.drawings || [];

    var html = ui.renderSection({ vi: 'Bản vẽ ảnh hưởng', en: 'Affected Drawings' },
      ui.renderDataGrid(columns, data, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn ghost sm" data-action="add-drawing-row">+ ' +
          T({ vi: 'Thêm bản vẽ', en: 'Add Drawing' }) + '</button>'
      }
    );

    // Drawing preview placeholder
    html += ui.renderSection({ vi: 'Xem trước bản vẽ', en: 'Drawing Preview' },
      '<div class="eqms-drawing-preview" style="min-height:200px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--hm-text-tertiary,#94a3b8)">' +
      T({ vi: 'Chọn bản vẽ để xem trước', en: 'Select a drawing to preview' }) +
      '</div>'
    );

    return html;
  }

  // --- Tab: Process Change ---
  function renderTabProcessChange() {
    var columns = [
      { key: 'operation',    label: { vi: 'Nguyên công', en: 'Operation' }, sortable: false },
      { key: 'work_center',  label: { vi: 'Trạm làm việc', en: 'Work Center' }, sortable: false },
      { key: 'description',  label: { vi: 'Mô tả', en: 'Description' }, sortable: false },
      { key: 'before',       label: { vi: 'Trước', en: 'Before' }, sortable: false },
      { key: 'after',        label: { vi: 'Sau', en: 'After' }, sortable: false },
      { key: 'impact',       label: { vi: 'Tác động', en: 'Impact' }, type: 'badge', sortable: false }
    ];

    var data = state.processChanges || [];

    return ui.renderSection({ vi: 'Thay đổi quy trình', en: 'Process Changes' },
      ui.renderDataGrid(columns, data, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn ghost sm" data-action="add-process-row">+ ' +
          T({ vi: 'Thêm nguyên công', en: 'Add Operation' }) + '</button>'
      }
    );
  }

  // --- Tab: Approval ---
  function renderTabApproval() {
    var html = '';
    var chain = state.approvalChain || [];

    if (chain.length) {
      html += ui.renderSection({ vi: 'Chuỗi phê duyệt', en: 'Approval Chain' }, (function() {
        var inner = '<div class="eqms-approval-chain">';
        chain.forEach(function(step) {
          var statusCls = step.decision === 'approved' ? 'approved' : (step.decision === 'rejected' ? 'rejected' : 'pending');
          inner += '<div class="eqms-approval-step ' + statusCls + '">';
          inner += '<div class="eqms-approval-step-role">' + esc(step.role || step.approver || '') + '</div>';
          inner += '<div class="eqms-approval-step-decision">';
          if (step.decision) {
            inner += '<span class="eqms-badge ' + slugify(step.decision) + '">' + esc(step.decision) + '</span>';
          } else {
            inner += '<span class="eqms-badge pending">' + T({ vi: 'Chờ', en: 'Pending' }) + '</span>';
          }
          inner += '</div>';
          if (step.comment) {
            inner += '<div class="eqms-approval-step-comment">' + esc(step.comment) + '</div>';
          }
          if (step.decided_at) {
            inner += '<div class="eqms-approval-step-date">' + esc(fmtDateTime(step.decided_at)) + '</div>';
          }
          inner += '</div>';
        });
        inner += '</div>';
        return inner;
      })());
    } else {
      html += ui.renderSection({ vi: 'Phê duyệt', en: 'Approval' },
        ui.renderEmptyState({ icon: '\u2705', title: { vi: 'Chưa có quyết định phê duyệt', en: 'No approval decisions yet' } })
      );
    }

    // Signatures
    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Xem xét kỹ thuật', en: 'Engineering Review' },
        { vi: 'Phê duyệt chất lượng', en: 'Quality Approval' },
        { vi: 'Phê duyệt sản xuất', en: 'Production Approval' }
      ])
    );

    return html;
  }

  // --- Tab: Implementation ---
  function renderTabImplementation() {
    var tasks = state.implTasks || [];
    var totalTasks = tasks.length;
    var completedTasks = tasks.filter(function(t) { return t.status === 'completed' || t.completed; }).length;
    var pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    var html = '';

    // Progress bar
    html += '<div class="eqms-impl-progress" style="margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
    html += '<span>' + T({ vi: 'Tiến độ triển khai', en: 'Implementation Progress' }) + '</span>';
    html += '<span>' + completedTasks + ' / ' + totalTasks + ' (' + pct + '%)</span>';
    html += '</div>';
    html += '<div style="height:8px;background:var(--hm-bg-secondary,#e2e8f0);border-radius:4px;overflow:hidden">';
    html += '<div style="height:100%;width:' + pct + '%;background:var(--hm-accent,#3b82f6);border-radius:4px;transition:width 0.3s"></div>';
    html += '</div></div>';

    // Task table
    var columns = [
      { key: 'task_name',     label: { vi: 'Nhiệm vụ', en: 'Task' }, sortable: false },
      { key: 'assigned_to',   label: { vi: 'Phân công', en: 'Assigned To' }, sortable: false },
      { key: 'due_date',      label: { vi: 'Hạn', en: 'Due Date' }, type: 'date', sortable: false },
      { key: 'status',        label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge', sortable: false },
      { key: 'completed_at',  label: { vi: 'Hoàn thành', en: 'Completed' }, type: 'date', sortable: false }
    ];

    html += ui.renderSection({ vi: 'Danh sách nhiệm vụ', en: 'Task List' },
      ui.renderDataGrid(columns, tasks, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn ghost sm" data-action="add-impl-task">+ ' +
          T({ vi: 'Thêm nhiệm vụ', en: 'Add Task' }) + '</button>'
      }
    );

    return html;
  }

  // --- Tab: Related Records ---
  function renderTabRelated() {
    return ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      (ui.renderLinkedRecordGraph || ui.renderRelationshipsPanel)(state.relationships)
    );
  }

  // --- Tab: Audit Trail ---
  function renderTabAuditTrail() {
    var html = '';

    html += ui.renderSection({ vi: 'Nhật ký kiểm toán', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    html += ui.renderSection({ vi: 'Chữ ký', en: 'Signatures' },
      ui.renderSignaturePanel(state.signatures)
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
  // RENDER: CREATE WIZARD
  // =========================================================================
  function renderCreate() {
    var bodyHtml = '';

    switch (state.wizardStep) {
      case 0: bodyHtml = renderWizardType(); break;
      case 1: bodyHtml = renderWizardAffectedItems(); break;
      case 2: bodyHtml = renderWizardDescription(); break;
      case 3: bodyHtml = renderWizardImpact(); break;
    }

    var html = '<div style="margin-bottom:12px">';
    html += '<button class="eqms-btn ghost sm" data-action="go-queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back to list' }) + '</button>';
    html += '</div>';

    html += ui.renderWizardShell(WIZARD_STEPS, state.wizardStep, bodyHtml, { saveDraft: true });
    return html;
  }

  function renderWizardType() {
    var html = '<h3>' + T({ vi: 'Chọn loại thay đổi kỹ thuật', en: 'Select Engineering Change Type' }) + '</h3>';
    html += ui.renderFormField({
      key: 'change_category', type: 'select', required: true,
      label: { vi: 'Loại thay đổi', en: 'Change Category' },
      options: CHANGE_TYPES,
      value: state.wizardData.change_category || ''
    });
    html += ui.renderFormField({
      key: 'priority', type: 'select',
      label: { vi: 'Mức ưu tiên', en: 'Priority' },
      options: PRIORITIES,
      value: state.wizardData.priority || ''
    });
    html += ui.renderFormField({
      key: 'regulatory_notification', type: 'select',
      label: { vi: 'Cần thông báo pháp quy?', en: 'Regulatory Notification Required?' },
      options: [
        { value: 'yes', label: { vi: 'Có', en: 'Yes' } },
        { value: 'no',  label: { vi: 'Không', en: 'No' } }
      ],
      value: state.wizardData.regulatory_notification || ''
    });
    return html;
  }

  function renderWizardAffectedItems() {
    var html = '<h3>' + T({ vi: 'Hạng mục ảnh hưởng', en: 'Affected Items' }) + '</h3>';
    html += ui.renderFormField({
      key: 'affected_part_number', type: 'text', required: true,
      label: { vi: 'Part Number bị ảnh hưởng', en: 'Affected Part Number' },
      placeholder: { vi: 'Nhập part number...', en: 'Enter part number...' },
      value: state.wizardData.affected_part_number || ''
    });
    html += ui.renderFormField({
      key: 'affected_revision', type: 'text',
      label: { vi: 'Phiên bản hiện tại', en: 'Current Revision' },
      value: state.wizardData.affected_revision || ''
    });
    html += ui.renderFormField({
      key: 'new_revision', type: 'text',
      label: { vi: 'Phiên bản mới', en: 'New Revision' },
      value: state.wizardData.new_revision || ''
    });
    html += ui.renderFormField({
      key: 'department', type: 'text',
      label: { vi: 'Bộ phận', en: 'Department' },
      value: state.wizardData.department || ''
    });
    html += ui.renderFormField({
      key: 'effective_date', type: 'date',
      label: { vi: 'Ngày mục tiêu', en: 'Target Effective Date' },
      value: state.wizardData.effective_date || ''
    });
    return html;
  }

  function renderWizardDescription() {
    var html = '<h3>' + T({ vi: 'Mô tả & Lý do', en: 'Description & Justification' }) + '</h3>';
    html += ui.renderFormField({
      key: 'title', type: 'text', required: true,
      label: { vi: 'Tiêu đề', en: 'Title' },
      placeholder: { vi: 'Tiêu đề ngắn gọn cho thay đổi', en: 'Brief title for the change' },
      value: state.wizardData.title || ''
    });
    html += ui.renderFormField({
      key: 'description', type: 'textarea', required: true,
      label: { vi: 'Mô tả chi tiết', en: 'Detailed Description' },
      placeholder: { vi: 'Mô tả thay đổi cần thực hiện...', en: 'Describe the change to be made...' },
      value: state.wizardData.description || ''
    });
    html += ui.renderFormField({
      key: 'reason', type: 'textarea', required: true,
      label: { vi: 'Lý do / Biện minh', en: 'Reason / Justification' },
      placeholder: { vi: 'Tại sao cần thay đổi?', en: 'Why is this change needed?' },
      value: state.wizardData.reason || ''
    });
    return html;
  }

  function renderWizardImpact() {
    var html = '<h3>' + T({ vi: 'Đánh giá tác động', en: 'Impact Assessment' }) + '</h3>';
    html += ui.renderFormField({
      key: 'bom_impact', type: 'textarea',
      label: { vi: 'Tác động BOM', en: 'BOM Impact' },
      placeholder: { vi: 'Mô tả tác động lên BOM...', en: 'Describe impact on BOM...' },
      value: state.wizardData.bom_impact || ''
    });
    html += ui.renderFormField({
      key: 'process_impact', type: 'textarea',
      label: { vi: 'Tác động quy trình', en: 'Process Impact' },
      placeholder: { vi: 'Mô tả tác động lên quy trình sản xuất...', en: 'Describe impact on manufacturing process...' },
      value: state.wizardData.process_impact || ''
    });
    html += ui.renderFormField({
      key: 'cost_impact', type: 'text',
      label: { vi: 'Tác động chi phí', en: 'Cost Impact' },
      placeholder: { vi: 'Ước tính tác động chi phí', en: 'Estimated cost impact' },
      value: state.wizardData.cost_impact || ''
    });
    html += ui.renderFormField({
      key: 'timeline_impact', type: 'text',
      label: { vi: 'Tác động tiến độ', en: 'Timeline Impact' },
      placeholder: { vi: 'Ước tính tác động tiến độ', en: 'Estimated timeline impact' },
      value: state.wizardData.timeline_impact || ''
    });

    // Review summary
    html += ui.renderSection({ vi: 'Tóm tắt', en: 'Summary' }, (function() {
      var d = state.wizardData;
      return ui.renderFieldGrid([
        { label: { vi: 'Loại',       en: 'Type' },         value: d.change_category, badge: true },
        { label: { vi: 'Tiêu đề',    en: 'Title' },        value: d.title },
        { label: { vi: 'Part Number', en: 'Part Number' },  value: d.affected_part_number },
        { label: { vi: 'Rev mới',     en: 'New Rev' },      value: d.new_revision },
        { label: { vi: 'Ưu tiên',     en: 'Priority' },     value: d.priority, badge: true },
        { label: { vi: 'Ngày mục tiêu', en: 'Target Date' }, value: d.effective_date }
      ]);
    })());

    return html;
  }

  function submitCreate(container) {
    var d = state.wizardData;
    if (!d.title || !d.change_category || !d.reason) {
      alert(T({ vi: 'Vui lòng điền đầy đủ thông tin bắt buộc', en: 'Please fill in all required fields' }));
      return;
    }

    var payload = {
      title: d.title,
      description: d.description || '',
      change_category: d.change_category,
      reason: d.reason,
      affected_parts: d.affected_part_number ? [d.affected_part_number] : [],
      priority: d.priority || 'medium'
    };

    state.loading = true;
    renderInto(container);

    api('', payload).then(function(res) {
      state.loading = false;
      if (res.ok && (res.ec_id || (res.data && res.data.ec_id))) {
        var newId = res.ec_id || res.data.ec_id;
        state.screen = 'detail';
        state.wizardStep = 0;
        state.wizardData = {};
        loadDetail(container, newId);
      } else {
        state.error = res.error || 'create_failed';
        renderInto(container);
      }
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      renderInto(container);
    });
  }

  // =========================================================================
  // RENDER: ANALYTICS SCREEN
  // =========================================================================
  function renderAnalytics() {
    var m = state.metrics || {};
    var html = '';

    // Header
    html += '<div class="eqms-screen-header">';
    html += '<h2>' + T({ vi: 'Phân tích thay đổi kỹ thuật', en: 'Engineering Change Analytics' }) + '</h2>';
    html += '<button class="eqms-btn ghost sm" data-action="go-queue">\u2190 ' + T({ vi: 'Quay lại', en: 'Back to list' }) + '</button>';
    html += '</div>';

    // KPIs
    var byStatus = m.by_status || [];
    var byCategory = m.by_category || [];
    var totalOpen = 0, totalClosed = 0;
    byStatus.forEach(function(s) {
      if (s.status === 'closed') totalClosed += parseInt(s.count, 10);
      else if (s.status !== 'cancelled') totalOpen += parseInt(s.count, 10);
    });

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng mở', en: 'Total Open' },     value: totalOpen, accent: 'info' },
      { label: { vi: 'Đã đóng', en: 'Closed' },         value: totalClosed, accent: 'success' },
      { label: { vi: 'Tổng cộng', en: 'Grand Total' },   value: totalOpen + totalClosed },
      { label: { vi: 'Tỷ lệ đóng', en: 'Closure Rate' }, value: (totalOpen + totalClosed) > 0 ? Math.round(totalClosed / (totalOpen + totalClosed) * 100) + '%' : '\u2014' }
    ]);

    // By Status chart/table
    var statusCols = [
      { key: 'status', label: { vi: 'Trạng thái', en: 'Status' }, type: 'badge' },
      { key: 'count',  label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
    ];
    html += ui.renderChartWithTableFallback('ec-by-status', null, statusCols, byStatus, { defaultMode: 'table' });

    // By Type chart/table
    var catCols = [
      { key: 'change_category', label: { vi: 'Loại thay đổi', en: 'Change Type' }, type: 'badge' },
      { key: 'count',           label: { vi: 'Số lượng', en: 'Count' }, type: 'number' }
    ];
    html += ui.renderChartWithTableFallback('ec-by-type', null, catCols, byCategory, { defaultMode: 'table' });

    return html;
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  var _container = null;

  function renderInto(container) {
    if (!container) return;
    _container = container;

    if (state.loading) {
      container.innerHTML = ui.renderLoadingState({ vi: 'Đang tải dữ liệu thay đổi kỹ thuật...', en: 'Loading engineering change data...' });
      return;
    }

    if (state.error && state.screen !== 'detail') {
      container.innerHTML = (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry');
      return;
    }

    var html = '';
    switch (state.screen) {
      case 'queue':     html = renderQueue(); break;
      case 'detail':    html = renderDetail(); break;
      case 'create':    html = renderCreate(); break;
      case 'analytics': html = renderAnalytics(); break;
    }

    container.innerHTML = html;
    bindEvents(container);
  }

  function render(container, context) {
    _container = container;
    context = context || {};

    // Reset
    state.error = null;

    if (context.recordId) {
      state.screen = 'detail';
      state.activeTab = 'summary';
      loadDetail(container, context.recordId);
    } else {
      state.screen = 'queue';
      loadQueue(container);
    }
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents(container) {
    container.addEventListener('click', function handler(e) {
      var actionEl = e.target.closest('[data-action]');
      var tabEl    = e.target.closest('[data-tab]');
      var rowEl    = e.target.closest('tr[data-id]');
      var sortEl   = e.target.closest('th[data-sort]');
      var pageEl   = e.target.closest('[data-action="page"]');
      var filterEl = e.target.closest('[data-action="apply-filters"]');
      var resetEl  = e.target.closest('[data-action="reset-filters"]');

      if (actionEl) {
        var act = actionEl.getAttribute('data-action');

        // Navigation
        if (act === 'go-queue')     { state.screen = 'queue'; state.error = null; loadQueue(container); return; }
        if (act === 'go-create')    { state.screen = 'create'; state.wizardStep = 0; state.wizardData = {}; renderInto(container); return; }
        if (act === 'go-analytics') { state.screen = 'analytics'; loadMetrics(container); return; }
        if (act === 'retry')        { state.error = null; loadQueue(container); return; }
        if (act === 'retry-detail') { state.error = null; loadDetail(container, state.recordId); return; }

        // Wizard
        if (act === 'wizard-next') {
          collectWizardFields(container);
          if (state.wizardStep < WIZARD_STEPS.length - 1) { state.wizardStep++; renderInto(container); }
          return;
        }
        if (act === 'wizard-back') {
          collectWizardFields(container);
          if (state.wizardStep > 0) { state.wizardStep--; renderInto(container); }
          return;
        }
        if (act === 'wizard-submit') {
          collectWizardFields(container);
          submitCreate(container);
          return;
        }
        if (act === 'wizard-save-draft') {
          collectWizardFields(container);
          return;
        }

        // Comments
        if (act === 'add-comment') {
          var textarea = container.querySelector('[data-field="new-comment"]');
          if (textarea && textarea.value.trim()) {
            api(state.recordId + '/comments', { text: textarea.value.trim() }).then(function() {
              loadDetail(container, state.recordId);
            });
          }
          return;
        }

        // Workflow actions
        var workflowActions = ['submit-assessment', 'approve', 'implement', 'close', 'cancel'];
        if (workflowActions.indexOf(act) !== -1) {
          executeAction(container, act);
          return;
        }

        // Export
        if (act === 'export') {
          var format = actionEl.getAttribute('data-format');
          if (state.screen === 'detail' && state.recordId) {
            api(state.recordId + '/export', { format: format });
          } else {
            api('export', { format: format, filters: state.filters });
          }
          return;
        }
      }

      // Tab switching
      if (tabEl) {
        state.activeTab = tabEl.getAttribute('data-tab');
        renderInto(container);
        return;
      }

      // Row click → detail
      if (rowEl && state.screen === 'queue') {
        var id = rowEl.getAttribute('data-id');
        if (id) {
          state.screen = 'detail';
          state.activeTab = 'summary';
          loadDetail(container, id);
        }
        return;
      }

      // Sort
      if (sortEl && state.screen === 'queue') {
        var key = sortEl.getAttribute('data-sort');
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        state.pagination.offset = 0;
        loadQueue(container);
        return;
      }

      // Pagination
      if (pageEl) {
        var page = parseInt(pageEl.getAttribute('data-page'), 10);
        if (page > 0) {
          state.pagination.offset = (page - 1) * state.pagination.limit;
          loadQueue(container);
        }
        return;
      }

      // Filters
      if (filterEl) {
        collectFilters(container);
        state.pagination.offset = 0;
        loadQueue(container);
        return;
      }
      if (resetEl) {
        state.filters = {};
        state.pagination.offset = 0;
        loadQueue(container);
        return;
      }
    });
  }

  function collectFilters(container) {
    var selects = container.querySelectorAll('[data-filter]');
    var filters = {};
    selects.forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) filters[key] = val;
    });
    state.filters = filters;
  }

  function collectWizardFields(container) {
    var fields = container.querySelectorAll('[data-field]');
    fields.forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key && key !== 'new-comment') {
        state.wizardData[key] = el.value || '';
      }
    });
  }

  // =========================================================================
  // REGISTER
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['engineering-change'] = {
    render: render,
    meta: MOD
  };

})();

/**
 * EQMS NCR / MRB — Exception Hub + Disposition Workspace
 * HESEM MOM Portal · 44-eqms-ncr.js
 *
 * Module ID: ncr
 * Archetype: exception-hub
 * Workflow: draft -> submitted -> under_review -> disposition_set -> containment_active -> close_requested -> closed
 * Screens: Queue, Detail (9 tabs), Create (wizard), Analytics
 *
 * Load order: AFTER 40-eqms-shell.js
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

  // ─── Module metadata ────────────────────────────────────────────────────
  var MOD = {
    id:       'ncr',
    label:    { vi: 'NCR / MRB', en: 'NCR / MRB' },
    version:  '1.0.0'
  };

  var STATES = ['draft', 'submitted', 'under_review', 'disposition_set', 'containment_active', 'close_requested', 'closed'];

  var NC_TYPES = [
    { value: 'material',       label: { vi: 'Vật liệu',     en: 'Material' } },
    { value: 'process',        label: { vi: 'Quy trình',    en: 'Process' } },
    { value: 'dimensional',    label: { vi: 'Kích thước',   en: 'Dimensional' } },
    { value: 'documentation',  label: { vi: 'Tài liệu',     en: 'Documentation' } },
    { value: 'workmanship',    label: { vi: 'Tay nghề',     en: 'Workmanship' } }
  ];

  var SEVERITIES = [
    { value: 'critical', label: { vi: 'Nghiêm trọng', en: 'Critical' } },
    { value: 'major',    label: { vi: 'Lớn',          en: 'Major' } },
    { value: 'minor',    label: { vi: 'Nhỏ',          en: 'Minor' } }
  ];

  var DISPOSITIONS = [
    { value: 'rework',           label: { vi: 'Làm lại',          en: 'Rework' },           style: 'secondary', icon: '\u{1F527}' },
    { value: 'repair',           label: { vi: 'Sửa chữa',         en: 'Repair' },            style: 'secondary', icon: '\u{1F6E0}\uFE0F' },
    { value: 'use-as-is',        label: { vi: 'Sử dụng nguyên trạng', en: 'Use As-Is' },     style: 'ghost',     icon: '\u2705' },
    { value: 'return-to-vendor', label: { vi: 'Trả NCC',          en: 'Return to Vendor' },  style: 'secondary', icon: '\u{1F4E6}' },
    { value: 'scrap',            label: { vi: 'Huỷ bỏ',           en: 'Scrap' },             style: 'danger',    icon: '\u{1F5D1}\uFE0F' }
  ];

  // ─── State ──────────────────────────────────────────────────────────────
  var state = {
    screen:     'queue',
    filters:    {},
    sort:       { key: 'created_at', dir: 'desc' },
    page:       1,
    records:    [],
    loaded:     false,
    pagination: null,
    metrics:    null,
    detail:     null,
    detailTab:  'summary',
    audit:      [],
    comments:   [],
    attachments:[],
    relationships: [],
    signatures: [],
    wizard:     { step: 0, data: {} },
    loading:    false,
    error:      null,
    queueSeq:   0
  };

  // ─── API helpers ────────────────────────────────────────────────────────
  function api(action, payload) {
    return apiCall(action, payload);
  }

  function safeApi(action, payload) {
    return new Promise(function(resolve, reject) {
      try {
        resolve(api(action, payload));
      } catch (err) {
        reject(err);
      }
    });
  }

  function pickDefined(values, fallback) {
    for (var i = 0; i < values.length; i++) {
      if (values[i] !== null && values[i] !== undefined && values[i] !== '') return values[i];
    }
    return fallback;
  }

  function toCountMap(rows) {
    var map = {};
    if (!Array.isArray(rows)) return map;
    rows.forEach(function(row) {
      if (!row || typeof row !== 'object') return;
      var key = String(row.status || row.source || row.severity || row.key || '');
      if (!key) return;
      map[key] = Number(row.count || row.total || 0) || 0;
    });
    return map;
  }

  function normalizeMetrics(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var byStatus = toCountMap(raw.by_status);

    var totalOpen = pickDefined([
      raw.total_open,
      raw.open_count,
      (byStatus.draft || 0) + (byStatus.submitted || 0) + (byStatus.under_review || 0) + (byStatus.mrb_review || 0) +
        (byStatus.disposition_set || 0) + (byStatus.rework_in_progress || 0)
    ], 0);
    var pendingDisposition = pickDefined([
      raw.pending_disposition,
      (byStatus.under_review || 0) + (byStatus.mrb_review || 0)
    ], 0);
    var reworkActive = pickDefined([
      raw.rework_active,
      byStatus.rework_in_progress
    ], 0);

    return Object.assign({}, raw, {
      total_open: Number(totalOpen) || 0,
      pending_disposition: Number(pendingDisposition) || 0,
      rework_active: Number(reworkActive) || 0,
      copq_month: Number(pickDefined([raw.copq_month, raw.copq_current_month, raw.copq], 0)) || 0,
      top_supplier: String(pickDefined([raw.top_supplier, raw.top_supplier_name], '—'))
    });
  }

  function normalizeQueueRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(function(row) {
      row = row && typeof row === 'object' ? row : {};
      return Object.assign({}, row, {
        ncr_id: pickDefined([row.ncr_id, row.id, row.ncr_number], ''),
        nc_type: pickDefined([row.nc_type, row.source], ''),
        disposition: pickDefined([row.disposition, row.mrb_decision], ''),
        part_number: pickDefined([row.part_number, row.item_id], ''),
        supplier: pickDefined([row.supplier, row.vendor, row.source_supplier], ''),
        quantity_rejected: pickDefined([row.quantity_rejected, row.qty_rejected, row.qty_affected], null)
      });
    });
  }

  function extractRows(res) {
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.records)) return res.records;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && res.data && Array.isArray(res.data.records)) return res.data.records;
    if (res && res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  }

  function extractPagination(res, rowCount) {
    var p = res && res.pagination && typeof res.pagination === 'object' ? res.pagination : {};
    var total = Number(pickDefined([p.total, res && res.total], rowCount)) || 0;
    var offset = Number(pickDefined([p.offset, res && res.offset], 0)) || 0;
    var limit = Number(pickDefined([p.limit, res && res.limit], 25)) || 25;
    return {
      total: total,
      offset: offset,
      limit: limit,
      has_more: !!pickDefined([p.has_more, res && res.has_more], (offset + rowCount) < total)
    };
  }

  function loadQueue() {
    state.loading = true;
    rerender();
    var seq = ++state.queueSeq;
    var rawFilters = Object.assign({}, state.filters);
    var searchStr = rawFilters.search || '';
    delete rawFilters.search;
    var payload = {
      filters: rawFilters,
      search:  searchStr,
      sort_by:  state.sort ? state.sort.key : 'created_at',
      sort_dir: state.sort ? state.sort.dir : 'desc',
      offset: state.pagination ? (state.pagination.page || 0) * (state.pagination.limit || 25) : 0,
      limit:  state.pagination ? (state.pagination.limit || 25) : 25
    };
    var watchdog = setTimeout(function() {
      if (seq !== state.queueSeq || !state.loading) return;
      state.loading = false;
      state.loaded = true;
      state.error = T({ vi: 'Yêu cầu tải dữ liệu quá thời gian. Vui lòng thử lại.', en: 'Data request timed out. Please retry.' });
      rerender();
    }, 35000);

    safeApi('eqms_ncr_query', payload).then(function(res) {
      if (seq !== state.queueSeq) return;
      clearTimeout(watchdog);
      state.loading = false;
      state.loaded  = true;
      if (res.success === false) { state.error = res.message || 'Query failed'; }
      else {
        var rows = normalizeQueueRows(extractRows(res));
        state.records = rows;
        state.pagination = extractPagination(res, rows.length);
        state.error      = null;
      }
      rerender();
    }).catch(function(e) {
      if (seq !== state.queueSeq) return;
      clearTimeout(watchdog);
      state.loading = false;
      state.loaded = true;
      state.error = (e && e.message) ? e.message : 'Request failed';
      rerender();
    });
  }

  function loadDetail(id) {
    state.loading = true;
    state.detail  = null;
    rerender();
    api('eqms_ncr_detail', { ncr_id: id }).then(function(res) {
      state.loading = false;
      state.detail  = res.data || res;
      state.error   = null;
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  function loadAudit(id) {
    api('eqms_ncr_audit', { ncr_id: id }).then(function(res) {
      state.audit = res.data || res.events || [];
      rerender();
    });
  }

  function loadComments(id) {
    api('eqms_ncr_comments', { ncr_id: id }).then(function(res) {
      state.comments = res.data || res.comments || [];
      rerender();
    });
  }

  function loadAttachments(id) {
    api('eqms_ncr_attachments', { ncr_id: id }).then(function(res) {
      state.attachments = res.data || res.attachments || [];
      rerender();
    });
  }

  function loadRelationships(id) {
    api('eqms_ncr_relationships', { ncr_id: id }).then(function(res) {
      state.relationships = res.data || res.links || [];
      rerender();
    });
  }

  function loadSignatures(id) {
    api('eqms_ncr_signatures', { ncr_id: id }).then(function(res) {
      state.signatures = res.data || res.signatures || [];
      rerender();
    });
  }

  function loadMetrics() {
    safeApi('eqms_ncr_metrics', state.filters).then(function(res) {
      var payload = (res && res.data) ? res.data : (res && res.metrics ? res.metrics : res);
      state.metrics = normalizeMetrics(payload);
      rerender();
    }).catch(function() {
      state.metrics = state.metrics || normalizeMetrics({});
      rerender();
    });
  }

  function executeAction(action, payload) {
    state.loading = true;
    rerender();
    var id = state.detail ? (state.detail.ncr_id || state.detail.id || '') : '';
    if (!id) { state.loading = false; rerender(); return; }
    var endpoint = 'eqms_ncr_action_' + action.replace(/-/g, '_');
    var body = Object.assign({ id: id }, payload || {});
    api(endpoint, body).then(function(res) {
      state.loading = false;
      if (res && res.success === false) { state.error = res.message || 'Action failed'; }
      else { state.detail = (res && (res.data || res.ncr)) || state.detail; state.error = null; }
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  // ─── Container ref ─────────────────────────────────────────────────────
  var _container = null;
  function rerender() { if (_container) render(_container); }

  // ─── Workflow actions per state ─────────────────────────────────────────
  function getActions(record) {
    if (!record) return [];
    var s = record.status || record.state || 'draft';
    var map = {
      draft:              [
        { action: 'contain',     label: { vi: 'Kiểm soát',       en: 'Contain' },           style: 'secondary' },
        { action: 'investigate', label: { vi: 'Điều tra',        en: 'Investigate' },        style: 'primary' }
      ],
      submitted:          [
        { action: 'contain',     label: { vi: 'Kiểm soát',       en: 'Contain' },           style: 'secondary' },
        { action: 'investigate', label: { vi: 'Điều tra',        en: 'Investigate' },        style: 'secondary' },
        { action: 'submit-mrb',  label: { vi: 'Gửi MRB',        en: 'Submit to MRB' },      style: 'primary' }
      ],
      under_review:       [
        { action: 'submit-mrb',        label: { vi: 'Gửi MRB',          en: 'Submit to MRB' },           style: 'primary' },
        { action: 'record-disposition', label: { vi: 'Ghi xử lý',        en: 'Record Disposition' },      style: 'secondary' }
      ],
      disposition_set:    [
        { action: 'close',    label: { vi: 'Đóng',         en: 'Close' },        style: 'primary' },
        { action: 'reopen',   label: { vi: 'Mở lại',       en: 'Reopen' },       style: 'ghost' }
      ],
      containment_active: [
        { action: 'close',    label: { vi: 'Đóng',         en: 'Close' },        style: 'primary' }
      ],
      close_requested:    [
        { action: 'close',    label: { vi: 'Đóng',         en: 'Close' },        style: 'primary' }
      ],
      closed:             [
        { action: 'reopen',   label: { vi: 'Mở lại',       en: 'Reopen' },       style: 'ghost' }
      ]
    };
    return map[s] || [];
  }

  // =========================================================================
  // SCREEN: QUEUE
  // =========================================================================
  function renderQueue() {
    var html = '';
    var m = state.metrics || {};

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng mở',            en: 'Total Open' },          value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Chờ xử lý',          en: 'Pending Disposition' }, value: m.pending_disposition != null ? m.pending_disposition : '...', accent: 'warn' },
      { label: { vi: 'Làm lại',            en: 'Rework Active' },       value: m.rework_active != null ? m.rework_active : '...' },
      { label: { vi: 'COPQ (tháng)',       en: 'COPQ (Month)' },        value: m.copq_month != null ? '$' + fmt(m.copq_month) : '...', accent: 'danger' },
      { label: { vi: 'NCC hàng đầu',       en: 'Top Supplier NCR' },    value: m.top_supplier != null ? m.top_supplier : '...' }
    ]);

    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search',       type: 'text',   placeholder: { vi: 'Tìm kiếm...', en: 'Search...' }, width: '200px' },
        { key: 'nc_type',      type: 'select',  label: { vi: 'Loại NC',         en: 'NC Type' },        options: NC_TYPES },
        { key: 'severity',     type: 'select',  label: { vi: 'Mức độ',          en: 'Severity' },       options: SEVERITIES },
        { key: 'status',       type: 'select',  label: { vi: 'Trạng thái',      en: 'Status' },         options: STATES.map(function(s) { return { value: s, label: s.replace(/_/g, ' ') }; }) },
        { key: 'department',   type: 'select',  reference: 'departments', label: { vi: 'Phòng ban', en: 'Department' }, width: '140px' },
        { key: 'work_order',   type: 'select',  reference: 'work_orders', label: { vi: 'Lệnh SX', en: 'Work Order' }, width: '140px' },
        { key: 'disposition',  type: 'select',  label: { vi: 'Xử lý',           en: 'Disposition' },    options: DISPOSITIONS }
      ],
      savedViews: true
    });

    html += '<div class="eqms-action-bar">';
    html += '<button class="eqms-btn primary sm" data-action="go-create">' + T({ vi: '+ Tạo NCR', en: '+ New NCR' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Đang tải dữ liệu...', en: 'Loading data...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'ncr_id',       label: { vi: 'Mã NCR',        en: 'NCR ID' },        type: 'id',    sortable: true },
        { key: 'title',        label: { vi: 'Tiêu đề',       en: 'Title' },          type: 'truncate', sortable: true },
        { key: 'nc_type',      label: { vi: 'Loại NC',       en: 'NC Type' },        type: 'badge', sortable: true },
        { key: 'severity',     label: { vi: 'Mức độ',        en: 'Severity' },       type: 'badge', sortable: true },
        { key: 'status',       label: { vi: 'Trạng thái',    en: 'Status' },         type: 'badge', sortable: true },
        { key: 'disposition',  label: { vi: 'Xử lý',         en: 'Disposition' },     type: 'badge', sortable: true },
        { key: 'part_number',  label: { vi: 'Mã SP',         en: 'Part #' },         sortable: true },
        { key: 'supplier',     label: { vi: 'NCC',           en: 'Supplier' },       sortable: true },
        { key: 'quantity_rejected', label: { vi: 'SL từ chối', en: 'Qty Rejected' }, type: 'number', sortable: true },
        { key: 'created_at',   label: { vi: 'Ngày tạo',      en: 'Created' },        type: 'date',  sortable: true }
      ];
      html += ui.renderDataGrid(columns, state.records, {
        selectable: true,
        sortKey: state.sort.key,
        sortDir: state.sort.dir
      });
      html += ui.renderPagination(state.pagination);
    }

    return html;
  }

  // =========================================================================
  // SCREEN: DETAIL
  // =========================================================================
  var DETAIL_TABS = [
    { id: 'summary',       label: { vi: 'Tổng quan',           en: 'Summary' } },
    { id: 'containment',   label: { vi: 'Kiểm soát',           en: 'Containment' } },
    { id: 'investigation', label: { vi: 'Điều tra',            en: 'Investigation' } },
    { id: 'mrb',           label: { vi: 'Hội đồng MRB',       en: 'MRB Panel' } },
    { id: 'disposition',   label: { vi: 'Xử lý',               en: 'Disposition' } },
    { id: 'related',       label: { vi: 'Bản ghi liên quan',   en: 'Related Records' } },
    { id: 'audit',         label: { vi: 'Nhật ký',             en: 'Audit Trail' } },
    { id: 'signatures',    label: { vi: 'Chữ ký',              en: 'Signatures' } },
    { id: 'attachments',   label: { vi: 'Tệp & Bình luận',     en: 'Attachments & Comments' } }
  ];

  function renderDetail() {
    var d = state.detail;
    if (state.loading || !d) return ui.renderLoadingState({ vi: 'Đang tải chi tiết...', en: 'Loading detail...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-detail');

    var html = '';

    html += ui.renderIdentityHeader({
      record_id:  d.ncr_id || d.ncr_number,
      title:      d.title,
      status:     d.status,
      owner:      d.owner || d.created_by,
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at,
      version:    d.version,
      priority:   d.severity
    }, {
      actions: getActions(d),
      extraMeta: [
        { label: { vi: 'Loại NC',     en: 'NC Type' },     value: d.nc_type },
        { label: { vi: 'NCC',         en: 'Supplier' },    value: d.supplier },
        { label: { vi: 'Lệnh SX',     en: 'Work Order' },  value: d.work_order },
        { label: { vi: 'Mã SP',       en: 'Part #' },      value: d.part_number }
      ]
    });

    html += ui.renderStateTimeline(STATES, d.status);
    html += ui.renderTabs(DETAIL_TABS, state.detailTab);

    html += '<div class="eqms-tab-body">';
    html += renderDetailTab(d);
    html += '</div>';

    return html;
  }

  function renderDetailTab(d) {
    switch (state.detailTab) {
      case 'summary':       return renderTabSummary(d);
      case 'containment':   return renderTabContainment(d);
      case 'investigation': return renderTabInvestigation(d);
      case 'mrb':           return renderTabMRB(d);
      case 'disposition':   return renderTabDisposition(d);
      case 'related':       return renderTabRelated();
      case 'audit':         return renderTabAudit();
      case 'signatures':    return renderTabSignatures();
      case 'attachments':   return renderTabAttachments();
      default:              return '';
    }
  }

  // Tab: Summary
  function renderTabSummary(d) {
    return ui.renderSection({ vi: 'Thông tin NCR', en: 'NCR Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Mã NCR',            en: 'NCR ID' },           value: d.ncr_id || d.ncr_number, mono: true },
        { label: { vi: 'Tiêu đề',           en: 'Title' },             value: d.title },
        { label: { vi: 'Loại NC',           en: 'NC Type' },           value: d.nc_type, badge: true },
        { label: { vi: 'Loại lỗi',          en: 'Defect Type' },       value: d.defect_type },
        { label: { vi: 'Mức độ',            en: 'Severity' },          value: d.severity, badge: true },
        { label: { vi: 'SL ảnh hưởng',      en: 'Qty Affected' },      value: d.quantity_affected },
        { label: { vi: 'SL từ chối',        en: 'Qty Rejected' },      value: d.quantity_rejected },
        { label: { vi: 'Vị trí',            en: 'Location' },          value: d.location },
        { label: { vi: 'Điểm phát hiện',    en: 'Detection Point' },   value: d.detection_point },
        { label: { vi: 'Lệnh sản xuất',     en: 'Work Order' },        value: d.work_order },
        { label: { vi: 'Mã sản phẩm',       en: 'Part Number' },       value: d.part_number },
        { label: { vi: 'Nhà cung cấp',      en: 'Supplier' },          value: d.supplier }
      ])
    ) + ui.renderSection({ vi: 'Mô tả', en: 'Description' },
      '<div class="eqms-text-block">' + esc(d.description || '') + '</div>'
    );
  }

  // Tab: Containment
  function renderTabContainment(d) {
    var actions = d.containment_actions || [];
    var addBtn = '<button class="eqms-btn ghost sm" data-action="add-containment-action">' +
                 T({ vi: '+ Thêm hành động', en: '+ Add Action' }) + '</button>';
    return ui.renderSection({ vi: 'Hành động kiểm soát', en: 'Containment Actions' },
      ui.renderDataGrid([
        { key: 'description',  label: { vi: 'Mô tả',       en: 'Description' },   sortable: false },
        { key: 'owner',        label: { vi: 'Chủ sở hữu',  en: 'Owner' },          sortable: false },
        { key: 'due_date',     label: { vi: 'Hạn',         en: 'Due Date' },       type: 'date', sortable: false },
        { key: 'status',       label: { vi: 'Trạng thái',  en: 'Status' },         type: 'badge', sortable: false },
        { key: 'completed_at', label: { vi: 'Hoàn thành',  en: 'Completed' },      type: 'date', sortable: false }
      ], actions, { selectable: false }),
      { headerActions: addBtn }
    ) + ui.renderSection({ vi: 'Vùng cách ly', en: 'Quarantine Zone' },
      ui.renderFieldGrid([
        { label: { vi: 'Khu vực cách ly',   en: 'Quarantine Location' },  value: d.quarantine_location },
        { label: { vi: 'SL cách ly',        en: 'Quarantined Qty' },      value: d.quarantined_qty },
        { label: { vi: 'Ngày cách ly',      en: 'Quarantine Date' },      value: fmtDate(d.quarantine_date) },
        { label: { vi: 'Ghi chú',           en: 'Notes' },                value: d.quarantine_notes }
      ])
    );
  }

  // Tab: Investigation
  function renderTabInvestigation(d) {
    var inv = d.investigation || {};
    return ui.renderSection({ vi: 'Kết quả điều tra', en: 'Investigation Findings' },
      ui.renderFieldGrid([
        { label: { vi: 'Nguyên nhân gốc',     en: 'Root Cause' },           value: inv.root_cause || d.root_cause },
        { label: { vi: 'Yếu tố đóng góp',     en: 'Contributing Factors' }, value: inv.contributing_factors },
        { label: { vi: 'Phương pháp điều tra', en: 'Investigation Method' }, value: inv.method },
        { label: { vi: 'Điều tra viên',        en: 'Investigator' },         value: inv.investigator },
        { label: { vi: 'Ngày điều tra',        en: 'Investigation Date' },   value: fmtDate(inv.date) }
      ])
    ) + ui.renderSection({ vi: 'Ghi chú điều tra', en: 'Investigation Notes' },
      '<div class="eqms-text-block">' + esc(inv.notes || d.investigation_notes || '') + '</div>'
    );
  }

  // Tab: MRB Panel — guarded disposition actions
  function renderTabMRB(d) {
    var mrb = d.mrb || {};
    var members = mrb.members || d.mrb_members || [];
    var votes   = mrb.votes   || d.mrb_votes   || [];

    var html = ui.renderSection({ vi: 'Thành viên hội đồng MRB', en: 'MRB Review Board Members' },
      ui.renderDataGrid([
        { key: 'name',       label: { vi: 'Thành viên',   en: 'Member' },       sortable: false },
        { key: 'role',       label: { vi: 'Vai trò',      en: 'Role' },          sortable: false },
        { key: 'department', label: { vi: 'Phòng ban',    en: 'Department' },    sortable: false },
        { key: 'vote',       label: { vi: 'Phiếu bầu',    en: 'Vote' },          type: 'badge', sortable: false },
        { key: 'voted_at',   label: { vi: 'Ngày bầu',     en: 'Voted At' },      type: 'datetime', sortable: false },
        { key: 'comments',   label: { vi: 'Nhận xét',     en: 'Comments' },      sortable: false }
      ], members.length ? members : votes, { selectable: false })
    );

    // MRB disposition voting
    html += ui.renderSection({ vi: 'Quyết định xử lý', en: 'Disposition Decision' }, function() {
      var h = '<div class="eqms-mrb-disposition">';
      h += '<p class="eqms-mrb-label">' + T({ vi: 'Chọn xử lý cuối cùng (yêu cầu xác nhận):', en: 'Select final disposition (confirmation required):' }) + '</p>';
      h += '<div class="eqms-disposition-actions">';
      DISPOSITIONS.forEach(function(disp) {
        h += '<button class="eqms-btn ' + disp.style + ' sm eqms-disposition-btn" data-action="disposition-confirm" data-disposition="' + esc(disp.value) + '">';
        h += disp.icon + ' ' + esc(T(disp.label));
        h += '</button>';
      });
      h += '</div>';

      // Final disposition summary
      if (mrb.final_disposition || d.disposition) {
        h += '<div class="eqms-mrb-result">';
        h += '<span class="eqms-field-label">' + T({ vi: 'Xử lý cuối cùng:', en: 'Final Disposition:' }) + '</span> ';
        h += '<span class="eqms-badge ' + slugify(mrb.final_disposition || d.disposition || '') + '">';
        h += esc(mrb.final_disposition || d.disposition || '');
        h += '</span>';
        h += '</div>';
      }
      h += '</div>';
      return h;
    }());

    return html;
  }

  // Tab: Disposition
  function renderTabDisposition(d) {
    var disp = d.disposition_details || {};
    return ui.renderSection({ vi: 'Chi tiết xử lý', en: 'Disposition Details' },
      ui.renderFieldGrid([
        { label: { vi: 'Xử lý đã chọn',      en: 'Selected Disposition' },  value: disp.selected || d.disposition, badge: true },
        { label: { vi: 'Lý do',              en: 'Disposition Rationale' }, value: disp.rationale || d.disposition_rationale },
        { label: { vi: 'Người quyết định',   en: 'Decided By' },            value: disp.decided_by },
        { label: { vi: 'Ngày quyết định',    en: 'Decision Date' },         value: fmtDate(disp.decided_date) }
      ])
    ) + (disp.selected === 'rework' || d.disposition === 'rework'
      ? ui.renderSection({ vi: 'Hướng dẫn làm lại', en: 'Rework Instructions' },
          '<div class="eqms-text-block">' + esc(disp.rework_instructions || d.rework_instructions || '') + '</div>'
        )
      : ''
    ) + (disp.selected === 'repair' || d.disposition === 'repair'
      ? ui.renderSection({ vi: 'Hướng dẫn sửa chữa', en: 'Repair Instructions' },
          '<div class="eqms-text-block">' + esc(disp.repair_instructions || d.repair_instructions || '') + '</div>'
        )
      : ''
    ) + ui.renderSection({ vi: 'Yêu cầu chữ ký', en: 'Signature Required' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'QA Phê duyệt xử lý', en: 'QA Disposition Approval' },
        { vi: 'Trưởng phòng SX',    en: 'Production Manager' }
      ])
    );
  }

  // Tab: Related Records
  function renderTabRelated() {
    var html = '';
    if (ui.renderLinkedRecordGraph) {
      html += ui.renderLinkedRecordGraph(state.relationships, { entityType: 'ncr', recordId: state.detail && state.detail.ncr_id });
    }
    html += ui.renderSection({ vi: 'Bản ghi liên quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(state.relationships)
    );
    return html;
  }

  // Tab: Audit Trail
  function renderTabAudit() {
    return ui.renderSection({ vi: 'Nhật ký thay đổi', en: 'Audit Trail' },
      ui.renderAuditTrail(state.audit)
    );
  }

  // Tab: Signatures
  function renderTabSignatures() {
    return ui.renderSection({ vi: 'Chữ ký điện tử', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Người tạo',         en: 'Originator' },
        { vi: 'QA Xem xét',        en: 'QA Review' },
        { vi: 'MRB Phê duyệt',     en: 'MRB Approval' },
        { vi: 'Đóng NCR',          en: 'NCR Closure' }
      ])
    );
  }

  // Tab: Attachments + Comments
  function renderTabAttachments() {
    return ui.renderSection({ vi: 'Tệp đính kèm', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    ) + ui.renderSection({ vi: 'Bình luận', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );
  }

  // =========================================================================
  // SCREEN: CREATE (Wizard)
  // =========================================================================
  var WIZARD_STEPS = [
    { label: { vi: 'Loại',       en: 'Type' } },
    { label: { vi: 'Mô tả',      en: 'Description' } },
    { label: { vi: 'Lỗi',        en: 'Defect' } },
    { label: { vi: 'Kiểm soát',  en: 'Containment' } },
    { label: { vi: 'Gửi',        en: 'Submit' } }
  ];

  function renderCreate() {
    var stepHtml = '';
    switch (state.wizard.step) {
      case 0: stepHtml = renderWizardType(); break;
      case 1: stepHtml = renderWizardDescription(); break;
      case 2: stepHtml = renderWizardDefect(); break;
      case 3: stepHtml = renderWizardContainment(); break;
      case 4: stepHtml = renderWizardReview(); break;
    }
    return ui.renderWizardShell(WIZARD_STEPS, state.wizard.step, stepHtml, { saveDraft: true });
  }

  function renderWizardType() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'nc_type',    label: { vi: 'Loại không phù hợp', en: 'NC Type' },     type: 'select', required: true, value: d.nc_type,  options: NC_TYPES });
    html += ui.renderFormField({ key: 'severity',   label: { vi: 'Mức độ',             en: 'Severity' },    type: 'select', required: true, value: d.severity,  options: SEVERITIES });
    html += ui.renderFormField({ key: 'department',  label: { vi: 'Phòng ban',          en: 'Department' },  type: 'select', reference: 'departments', required: true, value: d.department });
    html += ui.renderFormField({ key: 'work_order',  label: { vi: 'Lệnh sản xuất',      en: 'Work Order' },  type: 'select', reference: 'work_orders', value: d.work_order });
    html += '</div>';
    return html;
  }

  function renderWizardDescription() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'title',        label: { vi: 'Tiêu đề',         en: 'Title' },         type: 'text',     required: true, value: d.title });
    html += ui.renderFormField({ key: 'part_number',   label: { vi: 'Mã sản phẩm',     en: 'Part Number' },   type: 'select',   reference: 'items', value: d.part_number });
    html += ui.renderFormField({ key: 'supplier',      label: { vi: 'Nhà cung cấp',    en: 'Supplier' },      type: 'select',   reference: 'suppliers', value: d.supplier });
    html += ui.renderFormField({ key: 'location',      label: { vi: 'Vị trí',          en: 'Location' },      type: 'select',   reference: 'inventory_locations', value: d.location });
    html += ui.renderFormField({ key: 'detection_point', label: { vi: 'Điểm phát hiện', en: 'Detection Point' }, type: 'text',  value: d.detection_point });
    html += ui.renderFormField({ key: 'description',   label: { vi: 'Mô tả chi tiết',  en: 'Description' },   type: 'textarea', required: true, value: d.description });
    html += '</div>';
    return html;
  }

  function renderWizardDefect() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'defect_type',       label: { vi: 'Loại lỗi',       en: 'Defect Type' },       type: 'text',   required: true, value: d.defect_type });
    html += ui.renderFormField({ key: 'quantity_affected',  label: { vi: 'SL ảnh hưởng',   en: 'Qty Affected' },      type: 'number', required: true, value: d.quantity_affected, min: 0 });
    html += ui.renderFormField({ key: 'quantity_rejected',  label: { vi: 'SL từ chối',     en: 'Qty Rejected' },      type: 'number', required: true, value: d.quantity_rejected, min: 0 });
    html += '</div>';
    return html;
  }

  function renderWizardContainment() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'initial_containment', label: { vi: 'Hành động kiểm soát ban đầu', en: 'Initial Containment' }, type: 'textarea', value: d.initial_containment });
    html += ui.renderFormField({ key: 'quarantine_location', label: { vi: 'Khu vực cách ly',             en: 'Quarantine Location' },  type: 'select',   reference: 'inventory_locations', value: d.quarantine_location });
    html += ui.renderFormField({ key: 'quarantined_qty',     label: { vi: 'SL cách ly',                  en: 'Quarantined Qty' },       type: 'number',   value: d.quarantined_qty, min: 0 });
    html += '</div>';
    return html;
  }

  function renderWizardReview() {
    var d = state.wizard.data;
    var html = '<div class="eqms-wizard-review">';
    html += ui.renderSection({ vi: 'Xem lại', en: 'Review' },
      ui.renderFieldGrid([
        { label: { vi: 'Tiêu đề',        en: 'Title' },          value: d.title },
        { label: { vi: 'Loại NC',        en: 'NC Type' },        value: d.nc_type, badge: true },
        { label: { vi: 'Mức độ',         en: 'Severity' },       value: d.severity, badge: true },
        { label: { vi: 'Phòng ban',      en: 'Department' },     value: d.department },
        { label: { vi: 'Mã SP',          en: 'Part Number' },    value: d.part_number },
        { label: { vi: 'NCC',            en: 'Supplier' },       value: d.supplier },
        { label: { vi: 'SL ảnh hưởng',   en: 'Qty Affected' },   value: d.quantity_affected },
        { label: { vi: 'SL từ chối',     en: 'Qty Rejected' },   value: d.quantity_rejected },
        { label: { vi: 'Loại lỗi',       en: 'Defect Type' },    value: d.defect_type }
      ])
    );
    if (d.description) {
      html += ui.renderSection({ vi: 'Mô tả', en: 'Description' },
        '<div class="eqms-text-block">' + esc(d.description) + '</div>'
      );
    }
    if (d.initial_containment) {
      html += ui.renderSection({ vi: 'Kiểm soát ban đầu', en: 'Initial Containment' },
        '<div class="eqms-text-block">' + esc(d.initial_containment) + '</div>'
      );
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // SCREEN: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    var m = state.metrics || {};
    var html = '';

    html += ui.renderKpiRow([
      { label: { vi: 'Tổng NCR',          en: 'Total NCR' },          value: m.total != null ? m.total : '...' },
      { label: { vi: 'Mở',                en: 'Open' },               value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Đóng trong tháng',  en: 'Closed This Month' },  value: m.closed_this_month != null ? m.closed_this_month : '...' },
      { label: { vi: 'COPQ tích lũy',     en: 'COPQ Cumulative' },    value: m.copq_cumulative != null ? '$' + fmt(m.copq_cumulative) : '...' },
      { label: { vi: 'Tỉ lệ lỗi NCC',     en: 'Supplier Defect Rate' }, value: m.supplier_defect_rate != null ? m.supplier_defect_rate + '%' : '...' }
    ]);

    // Trend
    var trendData = m.trend || [];
    html += ui.renderSection({ vi: 'Xu hướng NCR', en: 'NCR Trend' },
      ui.renderChartWithTableFallback('ncr-trend-chart', null,
        [
          { key: 'month',  label: { vi: 'Tháng',   en: 'Month' },  sortable: false },
          { key: 'opened', label: { vi: 'Mở',      en: 'Opened' }, type: 'number', sortable: false },
          { key: 'closed', label: { vi: 'Đóng',    en: 'Closed' }, type: 'number', sortable: false }
        ],
        trendData
      )
    );

    // Defect Pareto
    var paretoData = m.defect_pareto || [];
    html += ui.renderSection({ vi: 'Pareto lỗi', en: 'Defect Pareto' },
      ui.renderChartWithTableFallback('ncr-pareto-chart', null,
        [
          { key: 'defect_type',        label: { vi: 'Loại lỗi',    en: 'Defect Type' },        sortable: false },
          { key: 'count',              label: { vi: 'Số lượng',    en: 'Count' },               type: 'number', sortable: false },
          { key: 'cumulative_percent', label: { vi: 'Tích lũy %',  en: 'Cumulative %' },        sortable: false }
        ],
        paretoData
      )
    );

    // Disposition distribution
    var dispData = m.disposition_distribution || [];
    html += ui.renderSection({ vi: 'Phân bố xử lý', en: 'Disposition Distribution' },
      ui.renderChartWithTableFallback('ncr-disp-chart', null,
        [
          { key: 'disposition', label: { vi: 'Xử lý',    en: 'Disposition' }, sortable: false },
          { key: 'count',       label: { vi: 'Số lượng', en: 'Count' },      type: 'number', sortable: false },
          { key: 'percentage',  label: { vi: 'Tỉ lệ',    en: 'Percentage' }, sortable: false }
        ],
        dispData
      )
    );

    // COPQ trend
    var copqData = m.copq_trend || [];
    html += ui.renderSection({ vi: 'COPQ theo tháng', en: 'Cost of Poor Quality (COPQ)' },
      ui.renderChartWithTableFallback('ncr-copq-chart', null,
        [
          { key: 'month',       label: { vi: 'Tháng',        en: 'Month' },        sortable: false },
          { key: 'scrap_cost',  label: { vi: 'Chi phí hủy',  en: 'Scrap Cost' },   type: 'number', sortable: false },
          { key: 'rework_cost', label: { vi: 'Chi phí làm lại', en: 'Rework Cost' }, type: 'number', sortable: false },
          { key: 'total_copq',  label: { vi: 'Tổng COPQ',    en: 'Total COPQ' },   type: 'number', sortable: false }
        ],
        copqData
      )
    );

    // Supplier NCR comparison
    var supplierData = m.supplier_comparison || [];
    html += ui.renderSection({ vi: 'NCR theo NCC', en: 'Supplier NCR Comparison' },
      ui.renderChartWithTableFallback('ncr-supplier-chart', null,
        [
          { key: 'supplier',       label: { vi: 'Nhà cung cấp',  en: 'Supplier' },       sortable: false },
          { key: 'ncr_count',      label: { vi: 'Số NCR',        en: 'NCR Count' },       type: 'number', sortable: false },
          { key: 'defect_rate',    label: { vi: 'Tỉ lệ lỗi %',   en: 'Defect Rate %' },   sortable: false },
          { key: 'total_rejected', label: { vi: 'Tổng từ chối',  en: 'Total Rejected' },  type: 'number', sortable: false }
        ],
        supplierData
      )
    );

    return html;
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  function render(container, context) {
    _container = container;
    if (context && context.recordId && state.screen !== 'detail') {
      state.screen    = 'detail';
      state.detailTab = 'summary';
      loadDetail(context.recordId);
      loadAudit(context.recordId);
      loadComments(context.recordId);
      loadAttachments(context.recordId);
      loadRelationships(context.recordId);
      loadSignatures(context.recordId);
      return;
    }

    var screenTabs = [
      { id: 'queue',     label: { vi: 'Hàng đợi',   en: 'Queue' } },
      { id: 'analytics', label: { vi: 'Phân tích',  en: 'Analytics' } }
    ];
    var html = '<div class="eqms-module eqms-ncr">';

    html += '<div class="eqms-module-header">';
    html += '<div class="eqms-screen-tabs">';
    screenTabs.forEach(function(st) {
      html += '<button class="eqms-screen-tab ' + (state.screen === st.id ? 'active' : '') + '" data-action="switch-screen" data-screen="' + esc(st.id) + '">';
      html += esc(T(st.label));
      html += '</button>';
    });
    html += '</div>';
    if (state.screen === 'detail' && state.detail) {
      html += '<button class="eqms-btn ghost sm" data-action="back-to-queue">' + T({ vi: 'Quay lại', en: 'Back to Queue' }) + '</button>';
    }
    html += '</div>';

    switch (state.screen) {
      case 'queue':     html += renderQueue(); break;
      case 'detail':    html += renderDetail(); break;
      case 'create':    html += renderCreate(); break;
      case 'analytics': html += renderAnalytics(); break;
    }

    html += '</div>';
    container.innerHTML = html;
    bindEvents(container);

    // Auto-load data (only on first render, not after every empty-result response)
    if (state.screen === 'queue' && !state.loaded && !state.loading) {
      loadQueue();
      loadMetrics();
    }
    if (state.screen === 'analytics' && !state.metrics) {
      loadMetrics();
    }
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents(container) {
    container.addEventListener('click', function(e) {
      var target;

      // Row click -> detail
      target = e.target.closest('tr[data-id]');
      if (target && state.screen === 'queue') {
        var id = target.getAttribute('data-id');
        if (id) {
          state.screen    = 'detail';
          state.detailTab = 'summary';
          loadDetail(id);
          loadAudit(id);
          loadComments(id);
          loadAttachments(id);
          loadRelationships(id);
          loadSignatures(id);
        }
        return;
      }

      // Tab click
      target = e.target.closest('[data-tab]');
      if (target) {
        state.detailTab = target.getAttribute('data-tab');
        rerender();
        return;
      }

      // Sort
      target = e.target.closest('th[data-sort]');
      if (target && state.screen === 'queue') {
        var key = target.getAttribute('data-sort');
        if (state.sort.key === key) { state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'; }
        else { state.sort.key = key; state.sort.dir = 'asc'; }
        loadQueue();
        return;
      }

      target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');

      switch (action) {
        case 'switch-screen':
          state.screen = target.getAttribute('data-screen');
          rerender();
          break;
        case 'go-create':
          state.screen = 'create';
          state.wizard = { step: 0, data: {} };
          rerender();
          break;
        case 'back-to-queue':
          state.screen = 'queue';
          state.detail = null;
          rerender();
          break;
        case 'apply-filters':
          collectFilters(container);
          state.page = 1;
          loadQueue();
          break;
        case 'reset-filters':
          state.filters = {};
          state.page = 1;
          loadQueue();
          break;
        case 'retry-queue':
          loadQueue();
          break;
        case 'retry-detail':
          if (state.detail) loadDetail(state.detail.ncr_id);
          break;
        case 'page':
          state.page = parseInt(target.getAttribute('data-page'), 10) || 1;
          loadQueue();
          break;
        case 'export':
          var format = target.getAttribute('data-format');
          api('eqms_ncr_export', Object.assign({ format: format }, state.filters));
          break;
        case 'wizard-next':
          collectWizardFields(container);
          if (state.wizard.step < WIZARD_STEPS.length - 1) { state.wizard.step++; rerender(); }
          break;
        case 'wizard-back':
          if (state.wizard.step > 0) { state.wizard.step--; rerender(); }
          break;
        case 'wizard-save-draft':
          collectWizardFields(container);
          api('eqms_ncr_create', Object.assign({ as_draft: true }, state.wizard.data)).then(function(res) {
            if (res.success !== false) { state.screen = 'queue'; loadQueue(); }
          });
          break;
        case 'wizard-submit':
          collectWizardFields(container);
          state.loading = true;
          rerender();
          api('eqms_ncr_create', state.wizard.data).then(function(res) {
            state.loading = false;
            if (res.success !== false) {
              state.screen    = 'detail';
              state.detail    = res.data || res;
              state.detailTab = 'summary';
            } else { state.error = res.message; }
            rerender();
          }).catch(function(err) { state.loading = false; state.error = err.message; rerender(); });
          break;
        case 'disposition-confirm':
          var disp = target.getAttribute('data-disposition');
          var dispLabel = DISPOSITIONS.find(function(d) { return d.value === disp; });
          var msg = T({ vi: 'Xác nhận xử lý: ', en: 'Confirm disposition: ' }) + (dispLabel ? T(dispLabel.label) : disp);
          if (!confirm(msg)) return;
          executeAction(disp, { disposition: disp });
          break;
        case 'add-comment':
          var textarea = container.querySelector('[data-field="new-comment"]');
          if (textarea && textarea.value.trim()) {
            api('eqms_ncr_comments', { ncr_id: state.detail.ncr_id, action: 'add', text: textarea.value.trim() }).then(function() {
              loadComments(state.detail.ncr_id);
            });
          }
          break;
        case 'sign':
          var role = target.getAttribute('data-role');
          api('eqms_ncr_signatures', { ncr_id: state.detail.ncr_id, action: 'sign', role: role }).then(function() {
            loadSignatures(state.detail.ncr_id);
          });
          break;
        default:
          if (['contain', 'investigate', 'submit-mrb', 'record-disposition',
               'rework', 'repair', 'use-as-is', 'return-to-vendor', 'scrap',
               'close', 'reopen'].indexOf(action) !== -1) {
            if (action === 'close' || action === 'scrap') {
              if (!confirm(T({ vi: 'Bạn có chắc muốn thực hiện hành động này?', en: 'Are you sure you want to perform this action?' }))) return;
            }
            executeAction(action);
          }
          break;
      }
    });

    container.addEventListener('change', function(e) {
      var filter = e.target.closest('[data-filter]');
      if (filter) {
        state.filters[filter.getAttribute('data-filter')] = filter.value;
      }
    });
  }

  function collectFilters(container) {
    container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      state.filters[key] = el.value || '';
    });
  }

  function collectWizardFields(container) {
    container.querySelectorAll('[data-field]').forEach(function(el) {
      var key = el.getAttribute('data-field');
      if (key !== 'new-comment') {
        state.wizard.data[key] = el.value || '';
      }
    });
  }

  // ─── Register ───────────────────────────────────────────────────────────
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['ncr'] = { render: render, meta: MOD };

})();

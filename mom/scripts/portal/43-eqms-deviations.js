/**
 * EQMS Deviations / Quality Events — Exception Hub + Evidence Workspace
 * HESEM MOM Portal · 43-eqms-deviations.js
 *
 * Module ID: deviations
 * Archetype: exception-hub
 * Workflow: draft -> classified -> under_investigation -> pending_closure -> closed | voided
 * Screens: Queue, Detail (8 tabs), Create (wizard), Analytics
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
    id:       'deviations',
    label:    { vi: 'Su kien chat luong', en: 'Deviations / Quality Events' },
    version:  '1.0.0'
  };

  var STATES = ['draft', 'classified', 'under_investigation', 'pending_closure', 'closed', 'voided'];

  var CLASSIFICATIONS = [
    { value: 'process',       label: { vi: 'Quy trinh',   en: 'Process' } },
    { value: 'product',       label: { vi: 'San pham',    en: 'Product' } },
    { value: 'material',      label: { vi: 'Vat lieu',    en: 'Material' } },
    { value: 'system',        label: { vi: 'He thong',    en: 'System' } },
    { value: 'environmental', label: { vi: 'Moi truong',  en: 'Environmental' } }
  ];

  var SEVERITIES = [
    { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } },
    { value: 'major',    label: { vi: 'Lon',          en: 'Major' } },
    { value: 'minor',    label: { vi: 'Nho',          en: 'Minor' } }
  ];

  var IMPACT_LEVELS = [
    { value: 'high',   label: { vi: 'Cao',        en: 'High' } },
    { value: 'medium', label: { vi: 'Trung binh', en: 'Medium' } },
    { value: 'low',    label: { vi: 'Thap',       en: 'Low' } }
  ];

  // ─── State ──────────────────────────────────────────────────────────────
  var state = {
    screen:     'queue',   // queue | detail | create | analytics
    filters:    {},
    sort:       { key: 'detected_at', dir: 'desc' },
    page:       1,
    records:    [],
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
    error:      null
  };

  // ─── API helpers ────────────────────────────────────────────────────────
  function api(action, payload) {
    return apiCall(action, payload);
  }

  function loadQueue() {
    state.loading = true;
    rerender();
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
    api('eqms_deviations_query', payload).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message || 'Query failed'; }
      else {
        state.records    = res.data || res.records || [];
        state.pagination = res.pagination || { total: (res.data || []).length, offset: 0, limit: 25 };
        state.error      = null;
      }
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  function loadDetail(id) {
    state.loading = true;
    state.detail  = null;
    rerender();
    api('eqms_deviations_detail', { deviation_id: id }).then(function(res) {
      state.loading = false;
      state.detail  = res.data || res;
      state.error   = null;
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  function loadAudit(id) {
    api('eqms_deviations_audit', { deviation_id: id }).then(function(res) {
      state.audit = res.data || res.events || [];
      rerender();
    });
  }

  function loadComments(id) {
    api('eqms_deviations_comments', { deviation_id: id }).then(function(res) {
      state.comments = res.data || res.comments || [];
      rerender();
    });
  }

  function loadAttachments(id) {
    api('eqms_deviations_attachments', { deviation_id: id }).then(function(res) {
      state.attachments = res.data || res.attachments || [];
      rerender();
    });
  }

  function loadRelationships(id) {
    api('eqms_deviations_relationships', { deviation_id: id }).then(function(res) {
      state.relationships = res.data || res.links || [];
      rerender();
    });
  }

  function loadSignatures(id) {
    api('eqms_deviations_signatures', { deviation_id: id }).then(function(res) {
      state.signatures = res.data || res.signatures || [];
      rerender();
    });
  }

  function loadMetrics() {
    api('eqms_deviations_metrics', state.filters).then(function(res) {
      state.metrics = res.data || res;
      rerender();
    });
  }

  function executeAction(action, payload) {
    state.loading = true;
    rerender();
    var id = state.detail ? (state.detail.deviation_id || state.detail.id || '') : '';
    if (!id) { state.loading = false; rerender(); return; }
    var endpoint = 'eqms_deviations_action_' + action.replace(/-/g, '_');
    var body = Object.assign({ id: id }, payload || {});
    api(endpoint, body).then(function(res) {
      state.loading = false;
      if (res && res.success === false) { state.error = res.message || 'Action failed'; }
      else { state.detail = (res && (res.data || res.deviation)) || state.detail; state.error = null; }
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
      draft:               [{ action: 'classify',             label: { vi: 'Phan loai',              en: 'Classify' },               style: 'primary' }],
      classified:          [
        { action: 'record-containment',  label: { vi: 'Ghi nhan kiem soat',     en: 'Record Containment' },     style: 'primary' },
        { action: 'start-investigation', label: { vi: 'Bat dau dieu tra',       en: 'Start Investigation' },    style: 'secondary' },
        { action: 'link-batch',          label: { vi: 'Lien ket lo',            en: 'Link Batch' },             style: 'ghost' },
        { action: 'link-change-control', label: { vi: 'Lien ket thay doi',      en: 'Link Change Control' },    style: 'ghost' }
      ],
      under_investigation: [
        { action: 'link-capa',           label: { vi: 'Lien ket CAPA',          en: 'Link CAPA' },              style: 'secondary' },
        { action: 'close',               label: { vi: 'Dong',                   en: 'Close' },                  style: 'primary' },
        { action: 'void',                label: { vi: 'Huy',                    en: 'Void' },                   style: 'danger' }
      ],
      pending_closure:     [
        { action: 'close',               label: { vi: 'Dong',                   en: 'Close' },                  style: 'primary' },
        { action: 'void',                label: { vi: 'Huy',                    en: 'Void' },                   style: 'danger' }
      ],
      closed:  [],
      voided:  []
    };
    return map[s] || [];
  }

  // =========================================================================
  // SCREEN: QUEUE
  // =========================================================================
  function renderQueue() {
    var html = '';

    // KPI row
    var m = state.metrics || {};
    html += ui.renderKpiRow([
      { label: { vi: 'Tong so mo',        en: 'Total Open' },          value: m.total_open != null ? m.total_open : '...',       accent: '' },
      { label: { vi: 'Nghiem trong',       en: 'Critical' },            value: m.critical != null ? m.critical : '...',          accent: 'danger' },
      { label: { vi: 'Qua han',            en: 'Overdue' },             value: m.overdue != null ? m.overdue : '...',            accent: 'warn' },
      { label: { vi: 'TB ngay dong',       en: 'Avg Days to Close' },   value: m.avg_days_to_close != null ? m.avg_days_to_close : '...', accent: '' },
      { label: { vi: 'Leo thang',          en: 'Escalated' },           value: m.escalated != null ? m.escalated : '...',        accent: 'warn' }
    ]);

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search',         type: 'text',   placeholder: { vi: 'Tim kiem...', en: 'Search...' }, width: '200px' },
        { key: 'classification', type: 'select',  label: { vi: 'Phan loai', en: 'Classification' }, options: CLASSIFICATIONS },
        { key: 'severity',       type: 'select',  label: { vi: 'Muc do',    en: 'Severity' },       options: SEVERITIES },
        { key: 'status',         type: 'select',  label: { vi: 'Trang thai', en: 'Status' },        options: STATES.map(function(s) { return { value: s, label: s.replace(/_/g, ' ') }; }) },
        { key: 'batch',          type: 'text',    placeholder: { vi: 'So lo...', en: 'Batch #...' }, width: '120px' },
        { key: 'escalated',      type: 'select',  label: { vi: 'Leo thang', en: 'Escalation' },     options: [{ value: 'yes', label: { vi: 'Co', en: 'Yes' } }, { value: 'no', label: { vi: 'Khong', en: 'No' } }] }
      ],
      savedViews: true
    });

    // Action bar
    html += '<div class="eqms-action-bar">';
    html += '<button class="eqms-btn primary sm" data-action="go-create">' + T({ vi: '+ Tao sai lech', en: '+ New Deviation' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Data grid
    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Dang tai du lieu...', en: 'Loading data...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'deviation_id',   label: { vi: 'Ma',            en: 'ID' },              type: 'id',    sortable: true },
        { key: 'title',          label: { vi: 'Tieu de',       en: 'Title' },            type: 'truncate', sortable: true },
        { key: 'classification', label: { vi: 'Phan loai',     en: 'Classification' },   type: 'badge', sortable: true },
        { key: 'severity',       label: { vi: 'Muc do',        en: 'Severity' },         type: 'badge', sortable: true },
        { key: 'status',         label: { vi: 'Trang thai',    en: 'Status' },           type: 'badge', sortable: true },
        { key: 'area',           label: { vi: 'Khu vuc',       en: 'Area' },             sortable: true },
        { key: 'detected_by',    label: { vi: 'Nguoi phat hien', en: 'Detected By' },    sortable: true },
        { key: 'detected_at',    label: { vi: 'Ngay phat hien', en: 'Detected' },        type: 'date',  sortable: true },
        { key: 'batch_number',   label: { vi: 'So lo',          en: 'Batch' },            sortable: true }
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
    { id: 'summary',        label: { vi: 'Tong quan',            en: 'Summary' } },
    { id: 'classification', label: { vi: 'Phan loai',            en: 'Classification' } },
    { id: 'impact',         label: { vi: 'Danh gia tac dong',    en: 'Impact Assessment' } },
    { id: 'containment',    label: { vi: 'Kiem soat',            en: 'Containment' } },
    { id: 'investigation',  label: { vi: 'Dieu tra',             en: 'Investigation' } },
    { id: 'closure',        label: { vi: 'Dong',                 en: 'Closure' } },
    { id: 'related',        label: { vi: 'Ban ghi lien quan',    en: 'Related Records' } },
    { id: 'audit',          label: { vi: 'Nhat ky & Chu ky',     en: 'Audit Trail & Signatures' } },
    { id: 'attachments',    label: { vi: 'Tep & Binh luan',      en: 'Attachments & Comments' } }
  ];

  function renderDetail() {
    var d = state.detail;
    if (state.loading || !d) return ui.renderLoadingState({ vi: 'Dang tai chi tiet...', en: 'Loading detail...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-detail');

    var html = '';

    // Identity header
    html += ui.renderIdentityHeader({
      record_id:  d.deviation_id || d.deviation_number,
      title:      d.title,
      status:     d.status,
      owner:      d.detected_by,
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at,
      version:    d.version,
      priority:   d.severity
    }, {
      actions: getActions(d),
      extraMeta: [
        { label: { vi: 'Khu vuc',      en: 'Area' },         value: d.area || d.department },
        { label: { vi: 'So lo',         en: 'Batch' },        value: d.batch_number || d.batch_id },
        { label: { vi: 'Diem so rui ro', en: 'Risk Score' },  value: d.risk_score }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(STATES, d.status);

    // Tabs
    html += ui.renderTabs(DETAIL_TABS, state.detailTab);

    // Tab body
    html += '<div class="eqms-tab-body">';
    html += renderDetailTab(d);
    html += '</div>';

    return html;
  }

  function renderDetailTab(d) {
    switch (state.detailTab) {
      case 'summary':        return renderTabSummary(d);
      case 'classification': return renderTabClassification(d);
      case 'impact':         return renderTabImpact(d);
      case 'containment':   return renderTabContainment(d);
      case 'investigation': return renderTabInvestigation(d);
      case 'closure':       return renderTabClosure(d);
      case 'related':       return renderTabRelated();
      case 'audit':         return renderTabAudit();
      case 'attachments':   return renderTabAttachments();
      default:              return '';
    }
  }

  // Tab: Summary
  function renderTabSummary(d) {
    return ui.renderSection({ vi: 'Thong tin chung', en: 'General Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ma sai lech',      en: 'Deviation ID' },      value: d.deviation_id || d.deviation_number, mono: true },
        { label: { vi: 'Tieu de',          en: 'Title' },              value: d.title },
        { label: { vi: 'Phan loai',        en: 'Classification' },     value: d.classification || d.deviation_type, badge: true },
        { label: { vi: 'Nguon',            en: 'Source' },              value: d.source },
        { label: { vi: 'Muc do',           en: 'Severity' },           value: d.severity, badge: true },
        { label: { vi: 'Muc anh huong',   en: 'Impact Level' },       value: (d.classification_board || {}).impact_level || d.impact_level, badge: true },
        { label: { vi: 'Nguoi phan loai', en: 'Classified By' },      value: (d.classification_board || {}).classified_by || d.classified_by },
        { label: { vi: 'Nguoi phat hien',  en: 'Detected By' },        value: d.detected_by },
        { label: { vi: 'Ngay phat hien',   en: 'Detected At' },        value: fmtDateTime(d.detected_at) },
        { label: { vi: 'Khu vuc',          en: 'Area' },               value: d.area || d.department },
        { label: { vi: 'So lo',            en: 'Batch Number' },       value: d.batch_number || d.batch_id },
        { label: { vi: 'Diem so rui ro',   en: 'Risk Score' },         value: d.risk_score },
        { label: { vi: 'Quy trinh anh huong', en: 'Affected Process' }, value: d.affected_process }
      ])
    ) + ui.renderSection({ vi: 'Mo ta', en: 'Description' },
      '<div class="eqms-text-block">' + esc(d.description || '') + '</div>'
    ) + ui.renderSection({ vi: 'Kiem soat tam thoi', en: 'Immediate Containment' },
      '<div class="eqms-text-block">' + esc(d.immediate_containment || d.containment_action || '') + '</div>'
    );
  }

  // Tab: Classification Board
  function renderTabClassification(d) {
    var html = '';
    var cls = d.classification_board || {};
    var currentStatus = d.status || d.state || 'draft';

    // ── Current Classification Panel ──
    html += ui.renderSection({ vi: 'Phan loai hien tai', en: 'Current Classification' },
      ui.renderFieldGrid([
        { label: { vi: 'Phan loai',       en: 'Classification' },     value: d.classification || cls.classification, badge: true },
        { label: { vi: 'Muc do',          en: 'Severity' },           value: d.severity || cls.severity, badge: true },
        { label: { vi: 'Muc anh huong',   en: 'Impact Level' },       value: cls.impact_level || d.impact_level, badge: true },
        { label: { vi: 'Ly do',           en: 'Justification' },      value: cls.justification || d.classification_justification },
        { label: { vi: 'Nguoi phan loai', en: 'Classified By' },      value: cls.classified_by || d.classified_by },
        { label: { vi: 'Ngay phan loai',  en: 'Classified At' },      value: fmtDateTime(cls.classified_at || d.classified_at) }
      ])
    );

    // ── Classification History ──
    var history = cls.history || d.classification_history || [];
    html += ui.renderSection({ vi: 'Lich su phan loai', en: 'Classification History' },
      history.length > 0
        ? ui.renderDataGrid([
            { key: 'classification', label: { vi: 'Phan loai',       en: 'Classification' }, type: 'badge', sortable: false },
            { key: 'severity',       label: { vi: 'Muc do',          en: 'Severity' },       type: 'badge', sortable: false },
            { key: 'impact_level',   label: { vi: 'Muc anh huong',   en: 'Impact Level' },   type: 'badge', sortable: false },
            { key: 'justification',  label: { vi: 'Ly do',           en: 'Justification' },  sortable: false },
            { key: 'changed_by',     label: { vi: 'Nguoi thay doi',  en: 'Changed By' },     sortable: false },
            { key: 'changed_at',     label: { vi: 'Ngay thay doi',   en: 'Changed At' },     type: 'datetime', sortable: false },
            { key: 'reason',         label: { vi: 'Ly do thay doi',  en: 'Change Reason' },  sortable: false }
          ], history, { selectable: false })
        : '<div class="eqms-empty-state">' + T({ vi: 'Chua co lich su phan loai lai.', en: 'No reclassification history.' }) + '</div>'
    );

    // ── Classify / Reclassify Action Panel ──
    if (currentStatus === 'draft' || currentStatus === 'classified') {
      html += renderClassifyActionPanel(d, currentStatus);
    }

    return html;
  }

  // Classification action form (draft -> classify, classified -> reclassify)
  function renderClassifyActionPanel(d, currentStatus) {
    var isReclassify = currentStatus === 'classified';
    var panelTitle = isReclassify
      ? { vi: 'Phan loai lai', en: 'Reclassify Deviation' }
      : { vi: 'Phan loai sai lech', en: 'Classify Deviation' };
    var btnLabel = isReclassify
      ? { vi: 'Phan loai lai', en: 'Reclassify' }
      : { vi: 'Phan loai', en: 'Classify' };

    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({
      key: 'classify_classification',
      label: { vi: 'Phan loai', en: 'Classification' },
      type: 'select',
      required: true,
      value: d.classification || '',
      options: CLASSIFICATIONS
    });
    html += ui.renderFormField({
      key: 'classify_severity',
      label: { vi: 'Muc do', en: 'Severity' },
      type: 'select',
      required: true,
      value: d.severity || '',
      options: SEVERITIES
    });
    html += ui.renderFormField({
      key: 'classify_impact_level',
      label: { vi: 'Muc anh huong', en: 'Impact Level' },
      type: 'select',
      required: true,
      value: '',
      options: IMPACT_LEVELS
    });
    html += ui.renderFormField({
      key: 'classify_justification',
      label: { vi: 'Ly do (bat buoc)', en: 'Justification (required)' },
      type: 'textarea',
      required: true,
      value: ''
    });
    html += '</div>';
    html += '<div class="eqms-action-bar" style="margin-top:12px;">';
    html += '<button class="eqms-btn primary" data-action="classify-submit">' + T(btnLabel) + '</button>';
    html += '</div>';

    return ui.renderSection(panelTitle, html);
  }

  // Tab: Impact Assessment
  function renderTabImpact(d) {
    var impact = d.impact_assessment || {};
    var batches  = impact.affected_batches  || d.affected_batches  || [];
    var products = impact.affected_products || d.affected_products || [];
    var processes = impact.affected_processes || d.affected_processes || [];

    var html = ui.renderSection({ vi: 'Lo hang bi anh huong', en: 'Affected Batches' },
      ui.renderDataGrid([
        { key: 'batch_number',  label: { vi: 'So lo',      en: 'Batch #' },     sortable: false },
        { key: 'product',       label: { vi: 'San pham',   en: 'Product' },      sortable: false },
        { key: 'quantity',      label: { vi: 'So luong',   en: 'Quantity' },     type: 'number', sortable: false },
        { key: 'status',        label: { vi: 'Trang thai', en: 'Status' },       type: 'badge', sortable: false },
        { key: 'disposition',   label: { vi: 'Xu ly',      en: 'Disposition' },  sortable: false }
      ], batches, { selectable: false })
    );

    html += ui.renderSection({ vi: 'San pham bi anh huong', en: 'Affected Products' },
      ui.renderDataGrid([
        { key: 'part_number',   label: { vi: 'Ma san pham',  en: 'Part Number' },  sortable: false },
        { key: 'name',          label: { vi: 'Ten',          en: 'Name' },          sortable: false },
        { key: 'impact_level',  label: { vi: 'Muc anh huong', en: 'Impact Level' }, type: 'badge', sortable: false }
      ], products, { selectable: false })
    );

    html += ui.renderSection({ vi: 'Quy trinh bi anh huong', en: 'Affected Processes' },
      ui.renderDataGrid([
        { key: 'process_name',  label: { vi: 'Quy trinh',     en: 'Process' },      sortable: false },
        { key: 'area',          label: { vi: 'Khu vuc',       en: 'Area' },          sortable: false },
        { key: 'risk_delta',    label: { vi: 'Bien dong rui ro', en: 'Risk Delta' }, sortable: false }
      ], processes, { selectable: false })
    );

    html += ui.renderSection({ vi: 'Danh gia rui ro tong the', en: 'Overall Risk Rating' },
      ui.renderFieldGrid([
        { label: { vi: 'Muc rui ro',      en: 'Risk Rating' },      value: impact.overall_risk_rating || d.risk_score, badge: true },
        { label: { vi: 'Giai thich',      en: 'Rationale' },        value: impact.risk_rationale },
        { label: { vi: 'Nguoi danh gia',  en: 'Assessed By' },      value: impact.assessed_by },
        { label: { vi: 'Ngay danh gia',   en: 'Assessed Date' },    value: fmtDate(impact.assessed_date) }
      ])
    );

    return html;
  }

  // Tab: Containment
  function renderTabContainment(d) {
    var actions = d.containment_actions || [];
    var addBtn = '<button class="eqms-btn ghost sm" data-action="add-containment-action">' +
                 T({ vi: '+ Them hanh dong', en: '+ Add Action' }) + '</button>';
    return ui.renderSection({ vi: 'Hanh dong kiem soat', en: 'Containment Actions' },
      ui.renderDataGrid([
        { key: 'description',  label: { vi: 'Mo ta',       en: 'Description' },   sortable: false },
        { key: 'owner',        label: { vi: 'Chu so huu',  en: 'Owner' },          sortable: false },
        { key: 'due_date',     label: { vi: 'Han',         en: 'Due Date' },       type: 'date', sortable: false },
        { key: 'status',       label: { vi: 'Trang thai',  en: 'Status' },         type: 'badge', sortable: false },
        { key: 'completed_at', label: { vi: 'Hoan thanh',  en: 'Completed' },      type: 'date', sortable: false }
      ], actions, { selectable: false }),
      { headerActions: addBtn }
    );
  }

  // Tab: Investigation
  function renderTabInvestigation(d) {
    var inv = d.investigation || {};
    var html = ui.renderSection({ vi: 'Nguyen nhan goc', en: 'Root Cause' },
      '<div class="eqms-text-block">' + esc(inv.root_cause || d.root_cause || '') + '</div>'
    );
    html += ui.renderSection({ vi: 'Yeu to dong gop', en: 'Contributing Factors' },
      '<div class="eqms-text-block">' + esc(inv.contributing_factors || '') + '</div>'
    );

    // 5-Why
    var whys = inv.five_whys || [];
    html += ui.renderSection({ vi: 'Phan tich 5-Tai sao', en: '5-Why Analysis' }, function() {
      var h = '<div class="eqms-five-why">';
      for (var i = 0; i < 5; i++) {
        var w = whys[i] || '';
        h += '<div class="eqms-five-why-row">';
        h += '<span class="eqms-five-why-label">' + T({ vi: 'Tai sao', en: 'Why' }) + ' ' + (i + 1) + '</span>';
        h += '<div class="eqms-five-why-value">' + esc(w) + '</div>';
        h += '</div>';
      }
      h += '</div>';
      return h;
    }());

    html += ui.renderSection({ vi: 'Ghi chu dieu tra', en: 'Investigation Notes' },
      '<div class="eqms-text-block">' + esc(inv.notes || d.investigation_summary || '') + '</div>'
    );
    return html;
  }

  // Tab: Closure
  function renderTabClosure(d) {
    var closure = d.closure || {};
    return ui.renderSection({ vi: 'Thong tin dong', en: 'Closure Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Bang chung hieu qua',   en: 'Effectiveness Evidence' }, value: closure.effectiveness_evidence || d.closure_reason },
        { label: { vi: 'Phuong phap xac minh',  en: 'Verification Method' },   value: closure.verification_method },
        { label: { vi: 'Nguoi dong',             en: 'Closed By' },              value: closure.closed_by || d.closed_by },
        { label: { vi: 'Ngay dong',              en: 'Sign-off Date' },          value: fmtDate(closure.sign_off_date || d.closed_at) }
      ])
    );
  }

  // Tab: Related Records
  function renderTabRelated() {
    var html = '';
    if (ui.renderLinkedRecordGraph) {
      html += ui.renderLinkedRecordGraph(state.relationships, { entityType: 'deviation', recordId: state.detail && state.detail.deviation_id });
    }
    html += ui.renderSection({ vi: 'Ban ghi lien quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(state.relationships)
    );
    return html;
  }

  // Tab: Audit Trail + Signatures
  function renderTabAudit() {
    return ui.renderSection({ vi: 'Nhat ky thay doi', en: 'Audit Trail' },
      ui.renderAuditTrail(state.audit)
    ) + ui.renderSection({ vi: 'Chu ky dien tu', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Nguoi tao',     en: 'Originator' },
        { vi: 'QA Xem xet',    en: 'QA Review' },
        { vi: 'QA Phe duyet',  en: 'QA Approval' }
      ])
    );
  }

  // Tab: Attachments + Comments
  function renderTabAttachments() {
    return ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    ) + ui.renderSection({ vi: 'Binh luan', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );
  }

  // =========================================================================
  // SCREEN: CREATE (Wizard)
  // =========================================================================
  var WIZARD_STEPS = [
    { label: { vi: 'Tiep nhan',    en: 'Intake' } },
    { label: { vi: 'Phan loai',    en: 'Classification' } },
    { label: { vi: 'Tac dong',     en: 'Impact' } },
    { label: { vi: 'Gui',          en: 'Submit' } }
  ];

  function renderCreate() {
    var stepHtml = '';
    switch (state.wizard.step) {
      case 0: stepHtml = renderWizardIntake(); break;
      case 1: stepHtml = renderWizardClassification(); break;
      case 2: stepHtml = renderWizardImpact(); break;
      case 3: stepHtml = renderWizardReview(); break;
    }
    return ui.renderWizardShell(WIZARD_STEPS, state.wizard.step, stepHtml, { saveDraft: true });
  }

  function renderWizardIntake() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'title',       label: { vi: 'Tieu de',          en: 'Title' },          type: 'text',     required: true,  value: d.title });
    html += ui.renderFormField({ key: 'detected_by',  label: { vi: 'Nguoi phat hien',  en: 'Detected By' },    type: 'text',     required: true,  value: d.detected_by });
    html += ui.renderFormField({ key: 'detected_at',  label: { vi: 'Ngay phat hien',   en: 'Detected At' },    type: 'date',     required: true,  value: d.detected_at });
    html += ui.renderFormField({ key: 'area',          label: { vi: 'Khu vuc',          en: 'Area' },           type: 'text',     required: true,  value: d.area });
    html += ui.renderFormField({ key: 'source',        label: { vi: 'Nguon',            en: 'Source' },         type: 'text',     value: d.source });
    html += ui.renderFormField({ key: 'batch_number',  label: { vi: 'So lo',            en: 'Batch Number' },   type: 'text',     value: d.batch_number });
    html += ui.renderFormField({ key: 'description',   label: { vi: 'Mo ta',            en: 'Description' },    type: 'textarea', required: true,  value: d.description });
    html += '</div>';
    return html;
  }

  function renderWizardClassification() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'classification', label: { vi: 'Phan loai',  en: 'Classification' }, type: 'select', required: true, value: d.classification, options: CLASSIFICATIONS });
    html += ui.renderFormField({ key: 'severity',       label: { vi: 'Muc do',     en: 'Severity' },       type: 'select', required: true, value: d.severity,       options: SEVERITIES });
    html += ui.renderFormField({ key: 'risk_score',     label: { vi: 'Diem rui ro', en: 'Risk Score' },    type: 'number', value: d.risk_score, hint: { vi: '1-25', en: '1-25' } });
    html += ui.renderFormField({ key: 'immediate_containment', label: { vi: 'Kiem soat tam thoi', en: 'Immediate Containment' }, type: 'textarea', value: d.immediate_containment });
    html += '</div>';
    return html;
  }

  function renderWizardImpact() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'affected_process', label: { vi: 'Quy trinh anh huong', en: 'Affected Process' },  type: 'text',     value: d.affected_process });
    html += ui.renderFormField({ key: 'affected_products', label: { vi: 'San pham anh huong',  en: 'Affected Products' }, type: 'textarea', value: d.affected_products, hint: { vi: 'Moi san pham tren 1 dong', en: 'One product per line' } });
    html += ui.renderFormField({ key: 'overall_risk',      label: { vi: 'Rui ro tong the',      en: 'Overall Risk' },     type: 'select',   value: d.overall_risk, options: [
      { value: 'low',      label: { vi: 'Thap',     en: 'Low' } },
      { value: 'medium',   label: { vi: 'Trung binh', en: 'Medium' } },
      { value: 'high',     label: { vi: 'Cao',      en: 'High' } },
      { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } }
    ]});
    html += '</div>';
    return html;
  }

  function renderWizardReview() {
    var d = state.wizard.data;
    var html = '<div class="eqms-wizard-review">';
    html += ui.renderSection({ vi: 'Xem lai', en: 'Review' },
      ui.renderFieldGrid([
        { label: { vi: 'Tieu de',          en: 'Title' },          value: d.title },
        { label: { vi: 'Phan loai',        en: 'Classification' }, value: d.classification, badge: true },
        { label: { vi: 'Muc do',           en: 'Severity' },       value: d.severity, badge: true },
        { label: { vi: 'Nguoi phat hien',  en: 'Detected By' },    value: d.detected_by },
        { label: { vi: 'Ngay phat hien',   en: 'Detected At' },    value: fmtDate(d.detected_at) },
        { label: { vi: 'Khu vuc',          en: 'Area' },           value: d.area },
        { label: { vi: 'So lo',            en: 'Batch' },          value: d.batch_number },
        { label: { vi: 'Diem rui ro',      en: 'Risk Score' },     value: d.risk_score }
      ])
    );
    if (d.description) {
      html += ui.renderSection({ vi: 'Mo ta', en: 'Description' },
        '<div class="eqms-text-block">' + esc(d.description) + '</div>'
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
      { label: { vi: 'Tong so',           en: 'Total' },             value: m.total != null ? m.total : '...' },
      { label: { vi: 'Mo',                en: 'Open' },              value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Dong trong thang',  en: 'Closed This Month' }, value: m.closed_this_month != null ? m.closed_this_month : '...' },
      { label: { vi: 'TB ngay dong',      en: 'Avg Days to Close' }, value: m.avg_days_to_close != null ? m.avg_days_to_close : '...' },
      { label: { vi: 'Ty le leo thang',   en: 'Escalation Rate' },   value: m.escalation_rate != null ? m.escalation_rate + '%' : '...' }
    ]);

    // Trend chart
    var trendData = m.trend || [];
    html += ui.renderSection({ vi: 'Xu huong theo thang', en: 'Monthly Trend' },
      ui.renderChartWithTableFallback('dev-trend-chart', null,
        [
          { key: 'month',  label: { vi: 'Thang',   en: 'Month' },  sortable: false },
          { key: 'opened', label: { vi: 'Mo',      en: 'Opened' }, type: 'number', sortable: false },
          { key: 'closed', label: { vi: 'Dong',    en: 'Closed' }, type: 'number', sortable: false }
        ],
        trendData
      )
    );

    // By type
    var byType = m.by_type || [];
    html += ui.renderSection({ vi: 'Theo loai', en: 'By Classification' },
      ui.renderChartWithTableFallback('dev-type-chart', null,
        [
          { key: 'classification', label: { vi: 'Phan loai', en: 'Classification' }, sortable: false },
          { key: 'count',          label: { vi: 'So luong',  en: 'Count' },          type: 'number', sortable: false },
          { key: 'percentage',     label: { vi: 'Ty le',     en: 'Percentage' },      sortable: false }
        ],
        byType
      )
    );

    // Escalation rate
    var escData = m.escalation_trend || [];
    html += ui.renderSection({ vi: 'Ty le leo thang', en: 'Escalation Rate Trend' },
      ui.renderChartWithTableFallback('dev-esc-chart', null,
        [
          { key: 'month', label: { vi: 'Thang',    en: 'Month' },     sortable: false },
          { key: 'rate',  label: { vi: 'Ty le (%)', en: 'Rate (%)' }, sortable: false }
        ],
        escData
      )
    );

    // Time-to-close
    var ttcData = m.time_to_close || [];
    html += ui.renderSection({ vi: 'Thoi gian dong', en: 'Time to Close' },
      ui.renderChartWithTableFallback('dev-ttc-chart', null,
        [
          { key: 'month',    label: { vi: 'Thang',       en: 'Month' },        sortable: false },
          { key: 'avg_days', label: { vi: 'TB ngay',     en: 'Avg Days' },     type: 'number', sortable: false },
          { key: 'p90_days', label: { vi: 'P90 ngay',    en: 'P90 Days' },     type: 'number', sortable: false }
        ],
        ttcData
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
      state.screen   = 'detail';
      state.detailTab = 'summary';
      loadDetail(context.recordId);
      loadAudit(context.recordId);
      loadComments(context.recordId);
      loadAttachments(context.recordId);
      loadRelationships(context.recordId);
      loadSignatures(context.recordId);
      return;
    }

    // Screen nav tabs
    var screenTabs = [
      { id: 'queue',     label: { vi: 'Hang doi',   en: 'Queue' } },
      { id: 'analytics', label: { vi: 'Phan tich',  en: 'Analytics' } }
    ];
    var html = '<div class="eqms-module eqms-deviations">';

    // Top bar with screen selector
    html += '<div class="eqms-module-header">';
    html += '<div class="eqms-screen-tabs">';
    screenTabs.forEach(function(st) {
      html += '<button class="eqms-screen-tab ' + (state.screen === st.id ? 'active' : '') + '" data-action="switch-screen" data-screen="' + esc(st.id) + '">';
      html += esc(T(st.label));
      html += '</button>';
    });
    html += '</div>';
    if (state.screen === 'detail' && state.detail) {
      html += '<button class="eqms-btn ghost sm" data-action="back-to-queue">' + T({ vi: 'Quay lai', en: 'Back to Queue' }) + '</button>';
    }
    html += '</div>';

    // Screen body
    switch (state.screen) {
      case 'queue':     html += renderQueue(); break;
      case 'detail':    html += renderDetail(); break;
      case 'create':    html += renderCreate(); break;
      case 'analytics': html += renderAnalytics(); break;
    }

    html += '</div>';
    container.innerHTML = html;
    bindEvents(container);

    // Auto-load data
    if (state.screen === 'queue' && !state.records.length && !state.loading) {
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

      // Actions
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
          if (state.detail) loadDetail(state.detail.deviation_id);
          break;
        case 'page':
          state.page = parseInt(target.getAttribute('data-page'), 10) || 1;
          loadQueue();
          break;
        case 'export':
          var format = target.getAttribute('data-format');
          api('eqms_deviations_export', Object.assign({ format: format }, state.filters));
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
          api('eqms_deviations_create', Object.assign({ as_draft: true }, state.wizard.data)).then(function(res) {
            if (res.success !== false) {
              state.screen = 'queue';
              loadQueue();
            }
          });
          break;
        case 'wizard-submit':
          collectWizardFields(container);
          state.loading = true;
          rerender();
          api('eqms_deviations_create', state.wizard.data).then(function(res) {
            state.loading = false;
            if (res.success !== false) {
              state.screen = 'detail';
              state.detail = res.data || res;
              state.detailTab = 'summary';
            } else {
              state.error = res.message;
            }
            rerender();
          }).catch(function(err) { state.loading = false; state.error = err.message; rerender(); });
          break;
        case 'add-comment':
          var textarea = container.querySelector('[data-field="new-comment"]');
          if (textarea && textarea.value.trim()) {
            api('eqms_deviations_comments', { deviation_id: state.detail.deviation_id, action: 'add', text: textarea.value.trim() }).then(function() {
              loadComments(state.detail.deviation_id);
            });
          }
          break;
        case 'sign':
          var role = target.getAttribute('data-role');
          api('eqms_deviations_signatures', { deviation_id: state.detail.deviation_id, action: 'sign', role: role }).then(function() {
            loadSignatures(state.detail.deviation_id);
          });
          break;
        case 'classify-submit':
          var clsFields = {};
          var clsEl;
          clsEl = container.querySelector('[data-field="classify_classification"]');
          if (clsEl) clsFields.classification = clsEl.value;
          clsEl = container.querySelector('[data-field="classify_severity"]');
          if (clsEl) clsFields.severity = clsEl.value;
          clsEl = container.querySelector('[data-field="classify_impact_level"]');
          if (clsEl) clsFields.impact_level = clsEl.value;
          clsEl = container.querySelector('[data-field="classify_justification"]');
          if (clsEl) clsFields.justification = clsEl.value;

          if (!clsFields.classification || !clsFields.severity || !clsFields.impact_level || !clsFields.justification) {
            state.error = T({ vi: 'Vui long dien day du tat ca cac truong bat buoc.', en: 'Please fill in all required fields.' });
            rerender();
            break;
          }

          state.loading = true;
          rerender();
          api('eqms_deviations_action_classify', Object.assign({
            deviation_id: state.detail.deviation_id
          }, clsFields)).then(function(res) {
            state.loading = false;
            if (res.success === false) { state.error = res.message; }
            else { state.detail = res.data || res; state.error = null; }
            rerender();
          }).catch(function(err) { state.loading = false; state.error = err.message; rerender(); });
          break;

        default:
          // Workflow action buttons
          if (['classify', 'record-containment', 'start-investigation', 'link-batch',
               'link-change-control', 'link-capa', 'close', 'void'].indexOf(action) !== -1) {
            if (action === 'void' || action === 'close') {
              if (!confirm(T({ vi: 'Ban co chac muon thuc hien hanh dong nay?', en: 'Are you sure you want to perform this action?' }))) return;
            }
            executeAction(action);
          }
          break;
      }
    });

    // Filter select changes
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
  window.EqmsModules['deviations'] = { render: render, meta: MOD };

})();

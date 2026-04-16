/**
 * EQMS CAPA — Evidence Workspace
 * HESEM MOM Portal · 45-eqms-capa.js
 *
 * Module ID: capa
 * Archetype: evidence-workspace
 * Workflow (10 states): draft -> initiated -> root_cause_analysis -> action_planning ->
 *   plan_approval -> implementation -> effectiveness_review -> verification -> pending_closure -> closed
 * Screens: Queue, Detail (10 tabs), Create (wizard), Analytics
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
    id:       'capa',
    label:    { vi: 'CAPA', en: 'CAPA' },
    version:  '1.0.0'
  };

  var STATES = [
    'draft', 'initiated', 'root_cause_analysis', 'action_planning',
    'plan_approval', 'implementation', 'effectiveness_review',
    'verification', 'pending_closure', 'closed'
  ];

  var CAPA_TYPES = [
    { value: 'corrective', label: { vi: 'Khac phuc',   en: 'Corrective' } },
    { value: 'preventive', label: { vi: 'Phong ngua',  en: 'Preventive' } }
  ];

  var PRIORITIES = [
    { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } },
    { value: 'high',     label: { vi: 'Cao',          en: 'High' } },
    { value: 'medium',   label: { vi: 'Trung binh',   en: 'Medium' } },
    { value: 'low',      label: { vi: 'Thap',         en: 'Low' } }
  ];

  var SOURCE_TYPES = [
    { value: 'deviation',    label: { vi: 'Sai lech',        en: 'Deviation' } },
    { value: 'ncr',          label: { vi: 'NCR',             en: 'NCR' } },
    { value: 'complaint',    label: { vi: 'Khieu nai',       en: 'Complaint' } },
    { value: 'audit',        label: { vi: 'Danh gia',        en: 'Audit' } },
    { value: 'inspection',   label: { vi: 'Kiem tra',        en: 'Inspection' } },
    { value: 'management_review', label: { vi: 'Xem xet lanh dao', en: 'Management Review' } },
    { value: 'risk',         label: { vi: 'Rui ro',          en: 'Risk' } },
    { value: 'other',        label: { vi: 'Khac',            en: 'Other' } }
  ];

  var EFFECTIVENESS = [
    { value: 'effective',         label: { vi: 'Hieu qua',           en: 'Effective' } },
    { value: 'not_effective',     label: { vi: 'Khong hieu qua',     en: 'Not Effective' } },
    { value: 'partially_effective', label: { vi: 'Hieu qua mot phan', en: 'Partially Effective' } }
  ];

  var FISHBONE_CATEGORIES = [
    { key: 'man',         label: { vi: 'Con nguoi',   en: 'Man' } },
    { key: 'machine',     label: { vi: 'May moc',     en: 'Machine' } },
    { key: 'material',    label: { vi: 'Vat lieu',    en: 'Material' } },
    { key: 'method',      label: { vi: 'Phuong phap', en: 'Method' } },
    { key: 'measurement', label: { vi: 'Do luong',    en: 'Measurement' } },
    { key: 'environment', label: { vi: 'Moi truong',  en: 'Environment' } }
  ];

  // ─── State ──────────────────────────────────────────────────────────────
  var state = {
    screen:     'queue',
    filters:    {},
    sort:       { key: 'created_at', dir: 'desc' },
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
    var payload = Object.assign({}, state.filters, {
      sort_key: state.sort.key,
      sort_dir: state.sort.dir,
      offset:   (state.page - 1) * 25,
      limit:    25
    });
    api('eqms_capa_query', payload).then(function(res) {
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
    api('eqms_capa_detail', { capa_id: id }).then(function(res) {
      state.loading = false;
      state.detail  = res.data || res;
      state.error   = null;
      rerender();
    }).catch(function(e) { state.loading = false; state.error = e.message; rerender(); });
  }

  function loadAudit(id) {
    api('eqms_capa_audit', { capa_id: id }).then(function(res) {
      state.audit = res.data || res.events || [];
      rerender();
    });
  }

  function loadComments(id) {
    api('eqms_capa_comments', { capa_id: id }).then(function(res) {
      state.comments = res.data || res.comments || [];
      rerender();
    });
  }

  function loadAttachments(id) {
    api('eqms_capa_attachments', { capa_id: id }).then(function(res) {
      state.attachments = res.data || res.attachments || [];
      rerender();
    });
  }

  function loadRelationships(id) {
    api('eqms_capa_relationships', { capa_id: id }).then(function(res) {
      state.relationships = res.data || res.links || [];
      rerender();
    });
  }

  function loadSignatures(id) {
    api('eqms_capa_signatures', { capa_id: id }).then(function(res) {
      state.signatures = res.data || res.signatures || [];
      rerender();
    });
  }

  function loadMetrics() {
    api('eqms_capa_metrics', state.filters).then(function(res) {
      state.metrics = res.data || res;
      rerender();
    });
  }

  function executeAction(action, payload) {
    state.loading = true;
    rerender();
    var body = Object.assign({ capa_id: state.detail.capa_id, action: action }, payload || {});
    api('eqms_capa_update', body).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message; }
      else { state.detail = res.data || res; state.error = null; }
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
      draft:                   [{ action: 'start-analysis',      label: { vi: 'Bat dau phan tich',      en: 'Start Analysis' },        style: 'primary' }],
      initiated:               [
        { action: 'record-root-cause', label: { vi: 'Ghi nguyen nhan goc',    en: 'Record Root Cause' },     style: 'primary' },
        { action: 'cancel',            label: { vi: 'Huy',                     en: 'Cancel' },                style: 'danger' }
      ],
      root_cause_analysis:     [
        { action: 'add-action-plan',   label: { vi: 'Them ke hoach',          en: 'Add Action Plan' },       style: 'primary' },
        { action: 'cancel',            label: { vi: 'Huy',                     en: 'Cancel' },                style: 'danger' }
      ],
      action_planning:         [
        { action: 'assign-action',     label: { vi: 'Gan hanh dong',          en: 'Assign Action' },         style: 'secondary' },
        { action: 'submit-approval',   label: { vi: 'Gui phe duyet',          en: 'Submit for Approval' },   style: 'primary' },
        { action: 'cancel',            label: { vi: 'Huy',                     en: 'Cancel' },                style: 'danger' }
      ],
      plan_approval:           [
        { action: 'submit-approval',   label: { vi: 'Phe duyet',              en: 'Approve' },               style: 'primary' },
        { action: 'cancel',            label: { vi: 'Huy',                     en: 'Cancel' },                style: 'danger' }
      ],
      implementation:          [
        { action: 'submit-verification', label: { vi: 'Gui xac minh',         en: 'Submit Verification' },   style: 'primary' },
        { action: 'record-effectiveness', label: { vi: 'Ghi hieu qua',        en: 'Record Effectiveness' },  style: 'secondary' },
        { action: 'cancel',             label: { vi: 'Huy',                    en: 'Cancel' },                style: 'danger' }
      ],
      effectiveness_review:    [
        { action: 'record-effectiveness', label: { vi: 'Ghi hieu qua',        en: 'Record Effectiveness' },  style: 'primary' },
        { action: 'close',               label: { vi: 'Dong',                  en: 'Close' },                 style: 'secondary' },
        { action: 'cancel',              label: { vi: 'Huy',                   en: 'Cancel' },                style: 'danger' }
      ],
      verification:            [
        { action: 'close',               label: { vi: 'Dong',                  en: 'Close' },                 style: 'primary' }
      ],
      pending_closure:         [
        { action: 'close',               label: { vi: 'Dong',                  en: 'Close' },                 style: 'primary' }
      ],
      closed:    [],
      cancelled: []
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
      { label: { vi: 'Tong mo',              en: 'Total Open' },           value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Qua han',              en: 'Overdue' },              value: m.overdue != null ? m.overdue : '...',              accent: 'danger' },
      { label: { vi: 'Ty le hieu qua',       en: 'Effectiveness Rate' },   value: m.effectiveness_rate != null ? m.effectiveness_rate + '%' : '...' },
      { label: { vi: 'TB ngay/giai doan',    en: 'Avg Days/Phase' },       value: m.avg_days_per_phase != null ? m.avg_days_per_phase : '...' },
      { label: { vi: 'Cho phe duyet',        en: 'Pending Approval' },     value: m.pending_approval != null ? m.pending_approval : '...', accent: 'warn' }
    ]);

    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search',           type: 'text',   placeholder: { vi: 'Tim kiem...', en: 'Search...' }, width: '200px' },
        { key: 'type',             type: 'select',  label: { vi: 'Loai',         en: 'Type' },          options: CAPA_TYPES },
        { key: 'status',           type: 'select',  label: { vi: 'Giai doan',    en: 'Phase' },         options: STATES.map(function(s) { return { value: s, label: s.replace(/_/g, ' ') }; }) },
        { key: 'priority',         type: 'select',  label: { vi: 'Uu tien',      en: 'Priority' },      options: PRIORITIES },
        { key: 'overdue',          type: 'select',  label: { vi: 'Qua han',      en: 'Overdue' },       options: [{ value: 'yes', label: { vi: 'Co', en: 'Yes' } }, { value: 'no', label: { vi: 'Khong', en: 'No' } }] },
        { key: 'owner',            type: 'text',    placeholder: { vi: 'Chu so huu...', en: 'Owner...' }, width: '140px' },
        { key: 'effectiveness',    type: 'select',  label: { vi: 'Hieu qua',     en: 'Effectiveness' }, options: EFFECTIVENESS }
      ],
      savedViews: true
    });

    html += '<div class="eqms-action-bar">';
    html += '<button class="eqms-btn primary sm" data-action="go-create">' + T({ vi: '+ Tao CAPA', en: '+ New CAPA' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Dang tai du lieu...', en: 'Loading data...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'capa_id',           label: { vi: 'Ma CAPA',       en: 'CAPA ID' },       type: 'id',    sortable: true },
        { key: 'title',             label: { vi: 'Tieu de',       en: 'Title' },          type: 'truncate', sortable: true },
        { key: 'type',              label: { vi: 'Loai',          en: 'Type' },           type: 'badge', sortable: true },
        { key: 'priority',          label: { vi: 'Uu tien',       en: 'Priority' },       type: 'badge', sortable: true },
        { key: 'status',            label: { vi: 'Giai doan',     en: 'Phase' },          type: 'badge', sortable: true },
        { key: 'owner',             label: { vi: 'Chu so huu',    en: 'Owner' },          sortable: true },
        { key: 'source_event_type', label: { vi: 'Nguon',         en: 'Source' },         type: 'badge', sortable: true },
        { key: 'due_date',          label: { vi: 'Han',           en: 'Due Date' },       type: 'date',  sortable: true },
        { key: 'effectiveness',     label: { vi: 'Hieu qua',     en: 'Effectiveness' },  type: 'badge', sortable: true },
        { key: 'created_at',        label: { vi: 'Ngay tao',      en: 'Created' },        type: 'date',  sortable: true }
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
    { id: 'summary',        label: { vi: 'Tong quan',           en: 'Summary' } },
    { id: 'rca',            label: { vi: 'Phan tich nguyen nhan', en: 'Root Cause Analysis' } },
    { id: 'action-plan',    label: { vi: 'Ke hoach hanh dong',  en: 'Action Plan' } },
    { id: 'approval',       label: { vi: 'Phe duyet',           en: 'Plan Approval' } },
    { id: 'implementation', label: { vi: 'Thuc hien',           en: 'Implementation' } },
    { id: 'effectiveness',  label: { vi: 'Hieu qua',            en: 'Effectiveness Review' } },
    { id: 'verification',   label: { vi: 'Xac minh',            en: 'Verification' } },
    { id: 'closure',        label: { vi: 'Dong',                en: 'Closure' } },
    { id: 'related',        label: { vi: 'Ban ghi lien quan',   en: 'Related Records' } },
    { id: 'audit',          label: { vi: 'Nhat ky & Chu ky & Tep', en: 'Audit Trail & Signatures & Attachments' } }
  ];

  function renderDetail() {
    var d = state.detail;
    if (state.loading || !d) return ui.renderLoadingState({ vi: 'Dang tai chi tiet...', en: 'Loading detail...' });
    if (state.error) return (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-detail');

    var html = '';

    html += ui.renderIdentityHeader({
      record_id:  d.capa_id || d.capa_number,
      title:      d.title,
      status:     d.status,
      owner:      d.owner,
      created_by: d.created_by,
      created_at: d.created_at,
      updated_at: d.updated_at,
      version:    d.version,
      priority:   d.priority
    }, {
      actions: getActions(d),
      extraMeta: [
        { label: { vi: 'Loai',           en: 'Type' },           value: d.type },
        { label: { vi: 'Nguon',          en: 'Source Event' },   value: d.source_event_type },
        { label: { vi: 'Ma nguon',       en: 'Source ID' },      value: d.source_event_id },
        { label: { vi: 'Han',            en: 'Due Date' },       value: fmtDate(d.due_date) }
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
      case 'summary':        return renderTabSummary(d);
      case 'rca':            return renderTabRCA(d);
      case 'action-plan':    return renderTabActionPlan(d);
      case 'approval':       return renderTabApproval(d);
      case 'implementation': return renderTabImplementation(d);
      case 'effectiveness':  return renderTabEffectiveness(d);
      case 'verification':   return renderTabVerification(d);
      case 'closure':        return renderTabClosure(d);
      case 'related':        return renderTabRelated();
      case 'audit':          return renderTabAudit();
      default:               return '';
    }
  }

  // Tab: Summary
  function renderTabSummary(d) {
    return ui.renderSection({ vi: 'Thong tin CAPA', en: 'CAPA Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ma CAPA',           en: 'CAPA ID' },            value: d.capa_id || d.capa_number, mono: true },
        { label: { vi: 'Tieu de',           en: 'Title' },               value: d.title },
        { label: { vi: 'Loai',              en: 'Type' },                value: d.type, badge: true },
        { label: { vi: 'Loai su kien nguon', en: 'Source Event Type' },  value: d.source_event_type, badge: true },
        { label: { vi: 'Ma su kien nguon',  en: 'Source Event ID' },     value: d.source_event_id, mono: true },
        { label: { vi: 'Pham vi',           en: 'Scope' },               value: d.scope },
        { label: { vi: 'Uu tien',           en: 'Priority' },            value: d.priority, badge: true },
        { label: { vi: 'Chu so huu',        en: 'Owner' },               value: d.owner },
        { label: { vi: 'Han hoan thanh',    en: 'Due Date' },            value: fmtDate(d.due_date) }
      ])
    ) + ui.renderSection({ vi: 'Mo ta', en: 'Description' },
      '<div class="eqms-text-block">' + esc(d.description || '') + '</div>'
    );
  }

  // Tab: Root Cause Analysis
  function renderTabRCA(d) {
    var rca = d.root_cause_analysis || d.rca || {};

    // 5-Why
    var whys = rca.five_whys || [];
    var html = ui.renderSection({ vi: 'Phan tich 5-Tai sao', en: '5-Why Analysis' }, function() {
      var h = '<div class="eqms-five-why">';
      for (var i = 0; i < 5; i++) {
        var w = whys[i] || '';
        h += '<div class="eqms-five-why-row">';
        h += '<span class="eqms-five-why-label">' + T({ vi: 'Tai sao', en: 'Why' }) + ' ' + (i + 1) + '</span>';
        if (d.status === 'root_cause_analysis' || d.status === 'initiated') {
          h += '<textarea class="eqms-form-textarea eqms-five-why-input" data-field="why_' + (i + 1) + '" rows="2">' + esc(w) + '</textarea>';
        } else {
          h += '<div class="eqms-five-why-value">' + esc(w || '—') + '</div>';
        }
        h += '</div>';
      }
      h += '</div>';
      return h;
    }());

    // Fishbone / Ishikawa
    var fishbone = rca.fishbone || {};
    html += ui.renderSection({ vi: 'Bieu do Ishikawa (Xuong ca)', en: 'Fishbone / Ishikawa Diagram' }, function() {
      var h = '<div class="eqms-fishbone">';
      FISHBONE_CATEGORIES.forEach(function(cat) {
        var factors = fishbone[cat.key] || [];
        h += '<div class="eqms-fishbone-category">';
        h += '<div class="eqms-fishbone-cat-label">' + esc(T(cat.label)) + '</div>';
        h += '<div class="eqms-fishbone-factors">';
        if (factors.length) {
          factors.forEach(function(f) {
            h += '<span class="eqms-fishbone-factor">' + esc(typeof f === 'string' ? f : f.description || '') + '</span>';
          });
        } else {
          h += '<span class="eqms-fishbone-empty">' + T({ vi: 'Chua co', en: 'None' }) + '</span>';
        }
        h += '</div></div>';
      });
      h += '</div>';
      return h;
    }());

    // Root cause summary
    html += ui.renderSection({ vi: 'Tom tat nguyen nhan goc', en: 'Root Cause Summary' },
      '<div class="eqms-text-block">' + esc(rca.summary || rca.root_cause_summary || '') + '</div>'
    );

    return html;
  }

  // Tab: Action Plan
  function renderTabActionPlan(d) {
    var actions = d.action_plan || d.action_items || [];
    var addBtn = '<button class="eqms-btn ghost sm" data-action="add-action-item">' +
                 T({ vi: '+ Them hanh dong', en: '+ Add Action Item' }) + '</button>';

    return ui.renderSection({ vi: 'Danh sach hanh dong', en: 'Action Items' },
      ui.renderDataGrid([
        { key: 'description',       label: { vi: 'Mo ta hanh dong',   en: 'Action Description' }, sortable: false },
        { key: 'owner',             label: { vi: 'Chu so huu',        en: 'Owner' },               sortable: false },
        { key: 'due_date',          label: { vi: 'Han',               en: 'Due Date' },            type: 'date', sortable: false },
        { key: 'status',            label: { vi: 'Trang thai',        en: 'Status' },              type: 'badge', sortable: false },
        { key: 'evidence_required', label: { vi: 'Can bang chung',    en: 'Evidence Required' },   sortable: false, render: function(v) { return v ? T({ vi: 'Co', en: 'Yes' }) : T({ vi: 'Khong', en: 'No' }); } },
        { key: 'evidence_uploaded', label: { vi: 'Da tai bang chung', en: 'Evidence Uploaded' },   sortable: false, render: function(v) { return v ? '\u2705' : '\u274C'; } }
      ], actions, { selectable: false }),
      { headerActions: addBtn }
    ) + renderAddActionForm(d);
  }

  function renderAddActionForm(d) {
    var canAdd = ['action_planning', 'root_cause_analysis', 'plan_approval'].indexOf(d.status) !== -1;
    if (!canAdd) return '';
    return ui.renderSection({ vi: 'Them hanh dong moi', en: 'Add New Action' },
      '<div class="eqms-form-grid eqms-action-form">' +
      ui.renderFormField({ key: 'new_action_desc',    label: { vi: 'Mo ta',          en: 'Description' },       type: 'textarea', required: true }) +
      ui.renderFormField({ key: 'new_action_owner',   label: { vi: 'Chu so huu',     en: 'Owner' },             type: 'text',     required: true }) +
      ui.renderFormField({ key: 'new_action_due',     label: { vi: 'Han',            en: 'Due Date' },          type: 'date',     required: true }) +
      ui.renderFormField({ key: 'new_action_evidence', label: { vi: 'Can bang chung', en: 'Evidence Required' }, type: 'select',   options: [{ value: 'yes', label: { vi: 'Co', en: 'Yes' } }, { value: 'no', label: { vi: 'Khong', en: 'No' } }] }) +
      '<button class="eqms-btn primary sm" data-action="save-action-item">' + T({ vi: 'Luu hanh dong', en: 'Save Action' }) + '</button>' +
      '</div>'
    );
  }

  // Tab: Plan Approval
  function renderTabApproval(d) {
    var approvers = d.approvers || d.plan_approval || [];
    return ui.renderSection({ vi: 'Danh sach phe duyet', en: 'Approvers' },
      ui.renderDataGrid([
        { key: 'name',      label: { vi: 'Nguoi phe duyet',  en: 'Approver' },    sortable: false },
        { key: 'role',      label: { vi: 'Vai tro',          en: 'Role' },          sortable: false },
        { key: 'decision',  label: { vi: 'Quyet dinh',       en: 'Decision' },      type: 'badge', sortable: false },
        { key: 'comments',  label: { vi: 'Nhan xet',         en: 'Comments' },      sortable: false },
        { key: 'decided_at', label: { vi: 'Ngay quyet dinh',  en: 'Decision Date' }, type: 'datetime', sortable: false }
      ], approvers, { selectable: false })
    );
  }

  // Tab: Implementation
  function renderTabImplementation(d) {
    var actions = d.action_plan || d.action_items || [];
    var completed = actions.filter(function(a) { return a.status === 'completed' || a.status === 'done'; }).length;
    var total = actions.length;
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    var html = ui.renderSection({ vi: 'Tien do tong the', en: 'Overall Progress' }, function() {
      var h = '<div class="eqms-progress-bar-wrapper">';
      h += '<div class="eqms-progress-info">';
      h += '<span>' + completed + ' / ' + total + ' ' + T({ vi: 'hanh dong hoan thanh', en: 'actions completed' }) + '</span>';
      h += '<span class="eqms-progress-pct">' + pct + '%</span>';
      h += '</div>';
      h += '<div class="eqms-progress-bar">';
      h += '<div class="eqms-progress-fill" style="width:' + pct + '%"></div>';
      h += '</div></div>';
      return h;
    }());

    // Per-action tracking
    html += ui.renderSection({ vi: 'Theo doi hanh dong', en: 'Action Tracking' },
      ui.renderDataGrid([
        { key: 'description', label: { vi: 'Hanh dong',    en: 'Action' },         sortable: false },
        { key: 'owner',       label: { vi: 'Chu so huu',   en: 'Owner' },           sortable: false },
        { key: 'due_date',    label: { vi: 'Han',          en: 'Due Date' },        type: 'date', sortable: false },
        { key: 'status',      label: { vi: 'Trang thai',   en: 'Status' },          type: 'badge', sortable: false },
        { key: 'completed_at', label: { vi: 'Ngay hoan thanh', en: 'Completed' },   type: 'date', sortable: false },
        { key: 'evidence',    label: { vi: 'Bang chung',   en: 'Evidence' },        sortable: false, render: function(v) {
          if (v) return '<button class="eqms-btn ghost sm" data-action="view-evidence">\u{1F4CE} ' + T({ vi: 'Xem', en: 'View' }) + '</button>';
          return '<button class="eqms-btn ghost sm" data-action="upload-evidence">\u{1F4E4} ' + T({ vi: 'Tai len', en: 'Upload' }) + '</button>';
        }}
      ], actions, { selectable: false })
    );

    return html;
  }

  // Tab: Effectiveness Review
  function renderTabEffectiveness(d) {
    var eff = d.effectiveness_review || {};
    var criteria = eff.criteria || [];

    var html = ui.renderSection({ vi: 'Tieu chi hieu qua', en: 'Effectiveness Criteria' },
      ui.renderDataGrid([
        { key: 'criterion',    label: { vi: 'Tieu chi',        en: 'Criterion' },          sortable: false },
        { key: 'target',       label: { vi: 'Muc tieu',        en: 'Target' },              sortable: false },
        { key: 'actual',       label: { vi: 'Thuc te',         en: 'Actual' },              sortable: false },
        { key: 'result',       label: { vi: 'Ket qua',         en: 'Result' },              type: 'badge', sortable: false },
        { key: 'measured_at',  label: { vi: 'Ngay do',         en: 'Measured At' },          type: 'date', sortable: false }
      ], criteria, { selectable: false })
    );

    html += ui.renderSection({ vi: 'Ket qua do luong', en: 'Measurement Results' },
      ui.renderFieldGrid([
        { label: { vi: 'So lan do',            en: 'Measurement Count' },     value: eff.measurement_count },
        { label: { vi: 'Ky do luong',          en: 'Measurement Period' },    value: eff.measurement_period },
        { label: { vi: 'Phuong phap do',       en: 'Measurement Method' },    value: eff.measurement_method }
      ])
    );

    html += ui.renderSection({ vi: 'Ket luan hieu qua', en: 'Effectiveness Conclusion' },
      ui.renderFieldGrid([
        { label: { vi: 'Ket luan',        en: 'Conclusion' },         value: eff.conclusion, badge: true },
        { label: { vi: 'Ghi chu',         en: 'Notes' },              value: eff.notes },
        { label: { vi: 'Nguoi danh gia',  en: 'Reviewed By' },        value: eff.reviewed_by },
        { label: { vi: 'Ngay danh gia',   en: 'Review Date' },        value: fmtDate(eff.review_date) }
      ])
    );

    return html;
  }

  // Tab: Verification
  function renderTabVerification(d) {
    var ver = d.verification || {};
    return ui.renderSection({ vi: 'Xac minh doc lap', en: 'Independent Verification' },
      ui.renderFieldGrid([
        { label: { vi: 'Nguoi xac minh',     en: 'Verifier Name' },         value: ver.verifier_name },
        { label: { vi: 'Ngay xac minh',      en: 'Verification Date' },     value: fmtDate(ver.verification_date) },
        { label: { vi: 'Phuong phap',        en: 'Method' },                value: ver.method },
        { label: { vi: 'Ket luan',           en: 'Conclusion' },            value: ver.conclusion, badge: true }
      ])
    ) + ui.renderSection({ vi: 'Ghi chu xac minh', en: 'Verification Notes' },
      '<div class="eqms-text-block">' + esc(ver.notes || '') + '</div>'
    );
  }

  // Tab: Closure
  function renderTabClosure(d) {
    var closure = d.closure || {};
    return ui.renderSection({ vi: 'Thong tin dong', en: 'Closure Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ket qua hieu qua',    en: 'Effectiveness Result' },  value: closure.effectiveness_result || d.effectiveness, badge: true },
        { label: { vi: 'Nguoi dong',           en: 'Closed By' },             value: closure.closed_by || d.closed_by },
        { label: { vi: 'Ngay dong',            en: 'Closure Date' },          value: fmtDate(closure.closed_at || d.closed_at) },
        { label: { vi: 'Ghi chu',              en: 'Closure Notes' },         value: closure.notes }
      ])
    );
  }

  // Tab: Related Records
  function renderTabRelated() {
    var html = '';
    if (ui.renderLinkedRecordGraph) {
      html += ui.renderLinkedRecordGraph(state.relationships, { entityType: 'capa', recordId: state.detail && state.detail.capa_id });
    }
    html += ui.renderSection({ vi: 'Ban ghi lien quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(state.relationships)
    );
    return html;
  }

  // Tab: Audit Trail + Signatures + Attachments + Comments
  function renderTabAudit() {
    return ui.renderSection({ vi: 'Nhat ky thay doi', en: 'Audit Trail' },
      ui.renderAuditTrail(state.audit)
    ) + ui.renderSection({ vi: 'Chu ky dien tu', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Nguoi tao',               en: 'Originator' },
        { vi: 'QA Xem xet',              en: 'QA Review' },
        { vi: 'Phe duyet ke hoach',       en: 'Plan Approval' },
        { vi: 'Xac minh hieu qua',       en: 'Effectiveness Verification' },
        { vi: 'Dong CAPA',               en: 'CAPA Closure' }
      ])
    ) + ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    ) + ui.renderSection({ vi: 'Binh luan', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );
  }

  // =========================================================================
  // SCREEN: CREATE (Wizard)
  // =========================================================================
  var WIZARD_STEPS = [
    { label: { vi: 'Nguon',           en: 'Source' } },
    { label: { vi: 'Mo ta',           en: 'Description' } },
    { label: { vi: 'Loai',            en: 'Type' } },
    { label: { vi: 'Pham vi',         en: 'Scope' } },
    { label: { vi: 'Phan tich ban dau', en: 'Initial Analysis' } },
    { label: { vi: 'Ke hoach',        en: 'Action Plan' } },
    { label: { vi: 'Gui',             en: 'Submit' } }
  ];

  function renderCreate() {
    var stepHtml = '';
    switch (state.wizard.step) {
      case 0: stepHtml = renderWizardSource(); break;
      case 1: stepHtml = renderWizardDescription(); break;
      case 2: stepHtml = renderWizardType(); break;
      case 3: stepHtml = renderWizardScope(); break;
      case 4: stepHtml = renderWizardAnalysis(); break;
      case 5: stepHtml = renderWizardPlan(); break;
      case 6: stepHtml = renderWizardReview(); break;
    }
    return ui.renderWizardShell(WIZARD_STEPS, state.wizard.step, stepHtml, { saveDraft: true });
  }

  function renderWizardSource() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'source_event_type', label: { vi: 'Loai su kien nguon', en: 'Source Event Type' }, type: 'select', required: true, value: d.source_event_type, options: SOURCE_TYPES });
    html += ui.renderFormField({ key: 'source_event_id',   label: { vi: 'Ma su kien nguon',   en: 'Source Event ID' },   type: 'text',   value: d.source_event_id, hint: { vi: 'VD: DEV-2026-0042, NCR-2026-0018', en: 'e.g. DEV-2026-0042, NCR-2026-0018' } });
    html += '</div>';
    return html;
  }

  function renderWizardDescription() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'title',       label: { vi: 'Tieu de',   en: 'Title' },       type: 'text',     required: true, value: d.title });
    html += ui.renderFormField({ key: 'description', label: { vi: 'Mo ta',     en: 'Description' }, type: 'textarea', required: true, value: d.description });
    html += '</div>';
    return html;
  }

  function renderWizardType() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'type',     label: { vi: 'Loai CAPA', en: 'CAPA Type' }, type: 'select', required: true, value: d.type,     options: CAPA_TYPES });
    html += ui.renderFormField({ key: 'priority', label: { vi: 'Uu tien',   en: 'Priority' },   type: 'select', required: true, value: d.priority, options: PRIORITIES });
    html += ui.renderFormField({ key: 'owner',    label: { vi: 'Chu so huu', en: 'Owner' },     type: 'text',   required: true, value: d.owner });
    html += ui.renderFormField({ key: 'due_date', label: { vi: 'Han',       en: 'Due Date' },   type: 'date',   required: true, value: d.due_date });
    html += '</div>';
    return html;
  }

  function renderWizardScope() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'scope', label: { vi: 'Pham vi anh huong', en: 'Scope of Impact' }, type: 'textarea', required: true, value: d.scope, hint: { vi: 'Mo ta pham vi anh huong cua van de', en: 'Describe the scope of the issue impact' } });
    html += '</div>';
    return html;
  }

  function renderWizardAnalysis() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += '<div class="eqms-section-header"><span>' + T({ vi: 'Phan tich 5-Tai sao ban dau', en: 'Initial 5-Why Analysis' }) + '</span></div>';
    for (var i = 1; i <= 5; i++) {
      html += ui.renderFormField({ key: 'why_' + i, label: { vi: 'Tai sao ' + i, en: 'Why ' + i }, type: 'textarea', value: d['why_' + i] });
    }
    html += ui.renderFormField({ key: 'initial_root_cause', label: { vi: 'Nguyen nhan goc ban dau', en: 'Initial Root Cause' }, type: 'textarea', value: d.initial_root_cause });
    html += '</div>';
    return html;
  }

  function renderWizardPlan() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'initial_action_desc',  label: { vi: 'Hanh dong dau tien',   en: 'First Action Item' },   type: 'textarea', value: d.initial_action_desc });
    html += ui.renderFormField({ key: 'initial_action_owner', label: { vi: 'Chu so huu hanh dong',  en: 'Action Owner' },         type: 'text',     value: d.initial_action_owner });
    html += ui.renderFormField({ key: 'initial_action_due',   label: { vi: 'Han hanh dong',         en: 'Action Due Date' },      type: 'date',     value: d.initial_action_due });
    html += '<p class="eqms-form-hint">' + T({ vi: 'Ban co the them nhieu hanh dong khac sau khi tao CAPA.', en: 'You can add more actions after creating the CAPA.' }) + '</p>';
    html += '</div>';
    return html;
  }

  function renderWizardReview() {
    var d = state.wizard.data;
    var html = '<div class="eqms-wizard-review">';
    html += ui.renderSection({ vi: 'Xem lai', en: 'Review' },
      ui.renderFieldGrid([
        { label: { vi: 'Tieu de',            en: 'Title' },            value: d.title },
        { label: { vi: 'Loai',               en: 'Type' },             value: d.type, badge: true },
        { label: { vi: 'Uu tien',            en: 'Priority' },         value: d.priority, badge: true },
        { label: { vi: 'Chu so huu',         en: 'Owner' },            value: d.owner },
        { label: { vi: 'Han',                en: 'Due Date' },         value: fmtDate(d.due_date) },
        { label: { vi: 'Nguon',              en: 'Source' },            value: d.source_event_type, badge: true },
        { label: { vi: 'Ma nguon',           en: 'Source ID' },         value: d.source_event_id }
      ])
    );
    if (d.description) {
      html += ui.renderSection({ vi: 'Mo ta', en: 'Description' },
        '<div class="eqms-text-block">' + esc(d.description) + '</div>'
      );
    }
    if (d.scope) {
      html += ui.renderSection({ vi: 'Pham vi', en: 'Scope' },
        '<div class="eqms-text-block">' + esc(d.scope) + '</div>'
      );
    }
    if (d.initial_root_cause) {
      html += ui.renderSection({ vi: 'Nguyen nhan goc ban dau', en: 'Initial Root Cause' },
        '<div class="eqms-text-block">' + esc(d.initial_root_cause) + '</div>'
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
      { label: { vi: 'Tong CAPA',          en: 'Total CAPA' },          value: m.total != null ? m.total : '...' },
      { label: { vi: 'Mo',                 en: 'Open' },                value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Qua han',            en: 'Overdue' },             value: m.overdue != null ? m.overdue : '...', accent: 'danger' },
      { label: { vi: 'Ty le hieu qua',     en: 'Effectiveness Rate' },  value: m.effectiveness_rate != null ? m.effectiveness_rate + '%' : '...' },
      { label: { vi: 'TB ngay/giai doan',  en: 'Avg Days/Phase' },      value: m.avg_days_per_phase != null ? m.avg_days_per_phase : '...' }
    ]);

    // Aging
    var agingData = m.aging || [];
    html += ui.renderSection({ vi: 'Phan bo tuoi CAPA', en: 'CAPA Aging Distribution' },
      ui.renderChartWithTableFallback('capa-aging-chart', null,
        [
          { key: 'age_bucket',  label: { vi: 'Khoang tuoi',  en: 'Age Bucket' },   sortable: false },
          { key: 'count',       label: { vi: 'So luong',     en: 'Count' },         type: 'number', sortable: false },
          { key: 'percentage',  label: { vi: 'Ty le',        en: 'Percentage' },    sortable: false }
        ],
        agingData
      )
    );

    // Effectiveness rate trend
    var effData = m.effectiveness_trend || [];
    html += ui.renderSection({ vi: 'Xu huong hieu qua', en: 'Effectiveness Rate Trend' },
      ui.renderChartWithTableFallback('capa-eff-chart', null,
        [
          { key: 'month',            label: { vi: 'Thang',      en: 'Month' },            sortable: false },
          { key: 'effective',        label: { vi: 'Hieu qua',   en: 'Effective' },         type: 'number', sortable: false },
          { key: 'not_effective',    label: { vi: 'Khong HQ',   en: 'Not Effective' },     type: 'number', sortable: false },
          { key: 'effectiveness_pct', label: { vi: 'Ty le HQ %', en: 'Effectiveness %' },  sortable: false }
        ],
        effData
      )
    );

    // By source
    var sourceData = m.by_source || [];
    html += ui.renderSection({ vi: 'CAPA theo nguon', en: 'CAPA by Source' },
      ui.renderChartWithTableFallback('capa-source-chart', null,
        [
          { key: 'source',     label: { vi: 'Nguon',     en: 'Source' },     sortable: false },
          { key: 'count',      label: { vi: 'So luong',  en: 'Count' },      type: 'number', sortable: false },
          { key: 'percentage', label: { vi: 'Ty le',     en: 'Percentage' }, sortable: false }
        ],
        sourceData
      )
    );

    // Overdue trend
    var overdueData = m.overdue_trend || [];
    html += ui.renderSection({ vi: 'Xu huong qua han', en: 'Overdue Trend' },
      ui.renderChartWithTableFallback('capa-overdue-chart', null,
        [
          { key: 'month',          label: { vi: 'Thang',            en: 'Month' },          sortable: false },
          { key: 'overdue_count',  label: { vi: 'So qua han',      en: 'Overdue Count' },   type: 'number', sortable: false },
          { key: 'on_time_count',  label: { vi: 'Dung han',        en: 'On-Time Count' },   type: 'number', sortable: false },
          { key: 'overdue_pct',    label: { vi: 'Ty le qua han %', en: 'Overdue %' },       sortable: false }
        ],
        overdueData
      )
    );

    // Avg time per phase
    var phaseData = m.time_per_phase || [];
    html += ui.renderSection({ vi: 'TB thoi gian moi giai doan', en: 'Avg Time per Phase' },
      ui.renderChartWithTableFallback('capa-phase-chart', null,
        [
          { key: 'phase',     label: { vi: 'Giai doan',  en: 'Phase' },     sortable: false },
          { key: 'avg_days',  label: { vi: 'TB ngay',    en: 'Avg Days' },  type: 'number', sortable: false },
          { key: 'p90_days',  label: { vi: 'P90 ngay',   en: 'P90 Days' },  type: 'number', sortable: false }
        ],
        phaseData
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
      { id: 'queue',     label: { vi: 'Hang doi',   en: 'Queue' } },
      { id: 'analytics', label: { vi: 'Phan tich',  en: 'Analytics' } }
    ];
    var html = '<div class="eqms-module eqms-capa">';

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

    switch (state.screen) {
      case 'queue':     html += renderQueue(); break;
      case 'detail':    html += renderDetail(); break;
      case 'create':    html += renderCreate(); break;
      case 'analytics': html += renderAnalytics(); break;
    }

    html += '</div>';
    container.innerHTML = html;
    bindEvents(container);

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
          if (state.detail) loadDetail(state.detail.capa_id);
          break;
        case 'page':
          state.page = parseInt(target.getAttribute('data-page'), 10) || 1;
          loadQueue();
          break;
        case 'export':
          var format = target.getAttribute('data-format');
          api('eqms_capa_export', Object.assign({ format: format }, state.filters));
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
          api('eqms_capa_create', Object.assign({ as_draft: true }, state.wizard.data)).then(function(res) {
            if (res.success !== false) { state.screen = 'queue'; loadQueue(); }
          });
          break;
        case 'wizard-submit':
          collectWizardFields(container);
          state.loading = true;
          rerender();
          api('eqms_capa_create', state.wizard.data).then(function(res) {
            state.loading = false;
            if (res.success !== false) {
              state.screen    = 'detail';
              state.detail    = res.data || res;
              state.detailTab = 'summary';
            } else { state.error = res.message; }
            rerender();
          }).catch(function(err) { state.loading = false; state.error = err.message; rerender(); });
          break;
        case 'save-action-item':
          var desc  = container.querySelector('[data-field="new_action_desc"]');
          var owner = container.querySelector('[data-field="new_action_owner"]');
          var due   = container.querySelector('[data-field="new_action_due"]');
          var evReq = container.querySelector('[data-field="new_action_evidence"]');
          if (desc && desc.value.trim() && owner && owner.value.trim()) {
            api('eqms_capa_update', {
              capa_id: state.detail.capa_id,
              action: 'add-action-plan',
              action_item: {
                description:       desc.value.trim(),
                owner:             owner.value.trim(),
                due_date:          due ? due.value : '',
                evidence_required: evReq ? evReq.value === 'yes' : false
              }
            }).then(function(res) {
              if (res.success !== false) {
                state.detail = res.data || res;
              }
              rerender();
            });
          }
          break;
        case 'add-comment':
          var textarea = container.querySelector('[data-field="new-comment"]');
          if (textarea && textarea.value.trim()) {
            api('eqms_capa_comments', { capa_id: state.detail.capa_id, action: 'add', text: textarea.value.trim() }).then(function() {
              loadComments(state.detail.capa_id);
            });
          }
          break;
        case 'sign':
          var role = target.getAttribute('data-role');
          api('eqms_capa_signatures', { capa_id: state.detail.capa_id, action: 'sign', role: role }).then(function() {
            loadSignatures(state.detail.capa_id);
          });
          break;
        default:
          if (['start-analysis', 'record-root-cause', 'add-action-plan', 'assign-action',
               'submit-approval', 'submit-verification', 'record-effectiveness',
               'close', 'cancel'].indexOf(action) !== -1) {
            if (action === 'cancel' || action === 'close') {
              if (!confirm(T({ vi: 'Ban co chac muon thuc hien hanh dong nay?', en: 'Are you sure you want to perform this action?' }))) return;
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
      if (key !== 'new-comment' && key.indexOf('new_action_') !== 0) {
        state.wizard.data[key] = el.value || '';
      }
    });
  }

  // ─── Register ───────────────────────────────────────────────────────────
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['capa'] = { render: render, meta: MOD };

})();

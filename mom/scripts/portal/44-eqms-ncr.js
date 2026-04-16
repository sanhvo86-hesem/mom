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
    { value: 'material',       label: { vi: 'Vat lieu',     en: 'Material' } },
    { value: 'process',        label: { vi: 'Quy trinh',    en: 'Process' } },
    { value: 'dimensional',    label: { vi: 'Kich thuoc',   en: 'Dimensional' } },
    { value: 'documentation',  label: { vi: 'Tai lieu',     en: 'Documentation' } },
    { value: 'workmanship',    label: { vi: 'Tay nghe',     en: 'Workmanship' } }
  ];

  var SEVERITIES = [
    { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } },
    { value: 'major',    label: { vi: 'Lon',          en: 'Major' } },
    { value: 'minor',    label: { vi: 'Nho',          en: 'Minor' } }
  ];

  var DISPOSITIONS = [
    { value: 'rework',           label: { vi: 'Lam lai',          en: 'Rework' },           style: 'secondary', icon: '\u{1F527}' },
    { value: 'repair',           label: { vi: 'Sua chua',         en: 'Repair' },            style: 'secondary', icon: '\u{1F6E0}\uFE0F' },
    { value: 'use-as-is',        label: { vi: 'Su dung nguyen trang', en: 'Use As-Is' },     style: 'ghost',     icon: '\u2705' },
    { value: 'return-to-vendor', label: { vi: 'Tra NCC',          en: 'Return to Vendor' },  style: 'secondary', icon: '\u{1F4E6}' },
    { value: 'scrap',            label: { vi: 'Huy bo',           en: 'Scrap' },             style: 'danger',    icon: '\u{1F5D1}\uFE0F' }
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
    api('eqms_ncr_query', payload).then(function(res) {
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
    api('eqms_ncr_metrics', state.filters).then(function(res) {
      state.metrics = res.data || res;
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
        { action: 'contain',     label: { vi: 'Kiem soat',       en: 'Contain' },           style: 'secondary' },
        { action: 'investigate', label: { vi: 'Dieu tra',        en: 'Investigate' },        style: 'primary' }
      ],
      submitted:          [
        { action: 'contain',     label: { vi: 'Kiem soat',       en: 'Contain' },           style: 'secondary' },
        { action: 'investigate', label: { vi: 'Dieu tra',        en: 'Investigate' },        style: 'secondary' },
        { action: 'submit-mrb',  label: { vi: 'Gui MRB',        en: 'Submit to MRB' },      style: 'primary' }
      ],
      under_review:       [
        { action: 'submit-mrb',        label: { vi: 'Gui MRB',          en: 'Submit to MRB' },           style: 'primary' },
        { action: 'record-disposition', label: { vi: 'Ghi xu ly',        en: 'Record Disposition' },      style: 'secondary' }
      ],
      disposition_set:    [
        { action: 'close',    label: { vi: 'Dong',         en: 'Close' },        style: 'primary' },
        { action: 'reopen',   label: { vi: 'Mo lai',       en: 'Reopen' },       style: 'ghost' }
      ],
      containment_active: [
        { action: 'close',    label: { vi: 'Dong',         en: 'Close' },        style: 'primary' }
      ],
      close_requested:    [
        { action: 'close',    label: { vi: 'Dong',         en: 'Close' },        style: 'primary' }
      ],
      closed:             [
        { action: 'reopen',   label: { vi: 'Mo lai',       en: 'Reopen' },       style: 'ghost' }
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
      { label: { vi: 'Tong mo',            en: 'Total Open' },          value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Cho xu ly',          en: 'Pending Disposition' }, value: m.pending_disposition != null ? m.pending_disposition : '...', accent: 'warn' },
      { label: { vi: 'Lam lai',            en: 'Rework Active' },       value: m.rework_active != null ? m.rework_active : '...' },
      { label: { vi: 'COPQ (thang)',       en: 'COPQ (Month)' },        value: m.copq_month != null ? '$' + fmt(m.copq_month) : '...', accent: 'danger' },
      { label: { vi: 'NCC hang dau',       en: 'Top Supplier NCR' },    value: m.top_supplier != null ? m.top_supplier : '...' }
    ]);

    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search',       type: 'text',   placeholder: { vi: 'Tim kiem...', en: 'Search...' }, width: '200px' },
        { key: 'nc_type',      type: 'select',  label: { vi: 'Loai NC',         en: 'NC Type' },        options: NC_TYPES },
        { key: 'severity',     type: 'select',  label: { vi: 'Muc do',          en: 'Severity' },       options: SEVERITIES },
        { key: 'status',       type: 'select',  label: { vi: 'Trang thai',      en: 'Status' },         options: STATES.map(function(s) { return { value: s, label: s.replace(/_/g, ' ') }; }) },
        { key: 'department',   type: 'text',    placeholder: { vi: 'Phong ban...', en: 'Department...' }, width: '140px' },
        { key: 'work_order',   type: 'text',    placeholder: { vi: 'Lenh SX...', en: 'Work Order...' }, width: '120px' },
        { key: 'disposition',  type: 'select',  label: { vi: 'Xu ly',           en: 'Disposition' },    options: DISPOSITIONS }
      ],
      savedViews: true
    });

    html += '<div class="eqms-action-bar">';
    html += '<button class="eqms-btn primary sm" data-action="go-create">' + T({ vi: '+ Tao NCR', en: '+ New NCR' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Dang tai du lieu...', en: 'Loading data...' });
    } else if (state.error) {
      html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-queue');
    } else {
      var columns = [
        { key: 'ncr_id',       label: { vi: 'Ma NCR',        en: 'NCR ID' },        type: 'id',    sortable: true },
        { key: 'title',        label: { vi: 'Tieu de',       en: 'Title' },          type: 'truncate', sortable: true },
        { key: 'nc_type',      label: { vi: 'Loai NC',       en: 'NC Type' },        type: 'badge', sortable: true },
        { key: 'severity',     label: { vi: 'Muc do',        en: 'Severity' },       type: 'badge', sortable: true },
        { key: 'status',       label: { vi: 'Trang thai',    en: 'Status' },         type: 'badge', sortable: true },
        { key: 'disposition',  label: { vi: 'Xu ly',         en: 'Disposition' },     type: 'badge', sortable: true },
        { key: 'part_number',  label: { vi: 'Ma SP',         en: 'Part #' },         sortable: true },
        { key: 'supplier',     label: { vi: 'NCC',           en: 'Supplier' },       sortable: true },
        { key: 'quantity_rejected', label: { vi: 'SL tu choi', en: 'Qty Rejected' }, type: 'number', sortable: true },
        { key: 'created_at',   label: { vi: 'Ngay tao',      en: 'Created' },        type: 'date',  sortable: true }
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
    { id: 'summary',       label: { vi: 'Tong quan',           en: 'Summary' } },
    { id: 'containment',   label: { vi: 'Kiem soat',           en: 'Containment' } },
    { id: 'investigation', label: { vi: 'Dieu tra',            en: 'Investigation' } },
    { id: 'mrb',           label: { vi: 'Hoi dong MRB',       en: 'MRB Panel' } },
    { id: 'disposition',   label: { vi: 'Xu ly',               en: 'Disposition' } },
    { id: 'related',       label: { vi: 'Ban ghi lien quan',   en: 'Related Records' } },
    { id: 'audit',         label: { vi: 'Nhat ky',             en: 'Audit Trail' } },
    { id: 'signatures',    label: { vi: 'Chu ky',              en: 'Signatures' } },
    { id: 'attachments',   label: { vi: 'Tep & Binh luan',     en: 'Attachments & Comments' } }
  ];

  function renderDetail() {
    var d = state.detail;
    if (state.loading || !d) return ui.renderLoadingState({ vi: 'Dang tai chi tiet...', en: 'Loading detail...' });
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
        { label: { vi: 'Loai NC',     en: 'NC Type' },     value: d.nc_type },
        { label: { vi: 'NCC',         en: 'Supplier' },    value: d.supplier },
        { label: { vi: 'Lenh SX',     en: 'Work Order' },  value: d.work_order },
        { label: { vi: 'Ma SP',       en: 'Part #' },      value: d.part_number }
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
    return ui.renderSection({ vi: 'Thong tin NCR', en: 'NCR Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ma NCR',            en: 'NCR ID' },           value: d.ncr_id || d.ncr_number, mono: true },
        { label: { vi: 'Tieu de',           en: 'Title' },             value: d.title },
        { label: { vi: 'Loai NC',           en: 'NC Type' },           value: d.nc_type, badge: true },
        { label: { vi: 'Loai loi',          en: 'Defect Type' },       value: d.defect_type },
        { label: { vi: 'Muc do',            en: 'Severity' },          value: d.severity, badge: true },
        { label: { vi: 'SL anh huong',      en: 'Qty Affected' },      value: d.quantity_affected },
        { label: { vi: 'SL tu choi',        en: 'Qty Rejected' },      value: d.quantity_rejected },
        { label: { vi: 'Vi tri',            en: 'Location' },          value: d.location },
        { label: { vi: 'Diem phat hien',    en: 'Detection Point' },   value: d.detection_point },
        { label: { vi: 'Lenh san xuat',     en: 'Work Order' },        value: d.work_order },
        { label: { vi: 'Ma san pham',       en: 'Part Number' },       value: d.part_number },
        { label: { vi: 'Nha cung cap',      en: 'Supplier' },          value: d.supplier }
      ])
    ) + ui.renderSection({ vi: 'Mo ta', en: 'Description' },
      '<div class="eqms-text-block">' + esc(d.description || '') + '</div>'
    );
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
    ) + ui.renderSection({ vi: 'Vung cach ly', en: 'Quarantine Zone' },
      ui.renderFieldGrid([
        { label: { vi: 'Khu vuc cach ly',   en: 'Quarantine Location' },  value: d.quarantine_location },
        { label: { vi: 'SL cach ly',        en: 'Quarantined Qty' },      value: d.quarantined_qty },
        { label: { vi: 'Ngay cach ly',      en: 'Quarantine Date' },      value: fmtDate(d.quarantine_date) },
        { label: { vi: 'Ghi chu',           en: 'Notes' },                value: d.quarantine_notes }
      ])
    );
  }

  // Tab: Investigation
  function renderTabInvestigation(d) {
    var inv = d.investigation || {};
    return ui.renderSection({ vi: 'Ket qua dieu tra', en: 'Investigation Findings' },
      ui.renderFieldGrid([
        { label: { vi: 'Nguyen nhan goc',     en: 'Root Cause' },           value: inv.root_cause || d.root_cause },
        { label: { vi: 'Yeu to dong gop',     en: 'Contributing Factors' }, value: inv.contributing_factors },
        { label: { vi: 'Phuong phap dieu tra', en: 'Investigation Method' }, value: inv.method },
        { label: { vi: 'Dieu tra vien',        en: 'Investigator' },         value: inv.investigator },
        { label: { vi: 'Ngay dieu tra',        en: 'Investigation Date' },   value: fmtDate(inv.date) }
      ])
    ) + ui.renderSection({ vi: 'Ghi chu dieu tra', en: 'Investigation Notes' },
      '<div class="eqms-text-block">' + esc(inv.notes || d.investigation_notes || '') + '</div>'
    );
  }

  // Tab: MRB Panel — guarded disposition actions
  function renderTabMRB(d) {
    var mrb = d.mrb || {};
    var members = mrb.members || d.mrb_members || [];
    var votes   = mrb.votes   || d.mrb_votes   || [];

    var html = ui.renderSection({ vi: 'Thanh vien hoi dong MRB', en: 'MRB Review Board Members' },
      ui.renderDataGrid([
        { key: 'name',       label: { vi: 'Thanh vien',   en: 'Member' },       sortable: false },
        { key: 'role',       label: { vi: 'Vai tro',      en: 'Role' },          sortable: false },
        { key: 'department', label: { vi: 'Phong ban',    en: 'Department' },    sortable: false },
        { key: 'vote',       label: { vi: 'Phieu bau',    en: 'Vote' },          type: 'badge', sortable: false },
        { key: 'voted_at',   label: { vi: 'Ngay bau',     en: 'Voted At' },      type: 'datetime', sortable: false },
        { key: 'comments',   label: { vi: 'Nhan xet',     en: 'Comments' },      sortable: false }
      ], members.length ? members : votes, { selectable: false })
    );

    // MRB disposition voting
    html += ui.renderSection({ vi: 'Quyet dinh xu ly', en: 'Disposition Decision' }, function() {
      var h = '<div class="eqms-mrb-disposition">';
      h += '<p class="eqms-mrb-label">' + T({ vi: 'Chon xu ly cuoi cung (yeu cau xac nhan):', en: 'Select final disposition (confirmation required):' }) + '</p>';
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
        h += '<span class="eqms-field-label">' + T({ vi: 'Xu ly cuoi cung:', en: 'Final Disposition:' }) + '</span> ';
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
    return ui.renderSection({ vi: 'Chi tiet xu ly', en: 'Disposition Details' },
      ui.renderFieldGrid([
        { label: { vi: 'Xu ly da chon',      en: 'Selected Disposition' },  value: disp.selected || d.disposition, badge: true },
        { label: { vi: 'Ly do',              en: 'Disposition Rationale' }, value: disp.rationale || d.disposition_rationale },
        { label: { vi: 'Nguoi quyet dinh',   en: 'Decided By' },            value: disp.decided_by },
        { label: { vi: 'Ngay quyet dinh',    en: 'Decision Date' },         value: fmtDate(disp.decided_date) }
      ])
    ) + (disp.selected === 'rework' || d.disposition === 'rework'
      ? ui.renderSection({ vi: 'Huong dan lam lai', en: 'Rework Instructions' },
          '<div class="eqms-text-block">' + esc(disp.rework_instructions || d.rework_instructions || '') + '</div>'
        )
      : ''
    ) + (disp.selected === 'repair' || d.disposition === 'repair'
      ? ui.renderSection({ vi: 'Huong dan sua chua', en: 'Repair Instructions' },
          '<div class="eqms-text-block">' + esc(disp.repair_instructions || d.repair_instructions || '') + '</div>'
        )
      : ''
    ) + ui.renderSection({ vi: 'Yeu cau chu ky', en: 'Signature Required' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'QA Phe duyet xu ly', en: 'QA Disposition Approval' },
        { vi: 'Truong phong SX',    en: 'Production Manager' }
      ])
    );
  }

  // Tab: Related Records
  function renderTabRelated() {
    var html = '';
    if (ui.renderLinkedRecordGraph) {
      html += ui.renderLinkedRecordGraph(state.relationships, { entityType: 'ncr', recordId: state.detail && state.detail.ncr_id });
    }
    html += ui.renderSection({ vi: 'Ban ghi lien quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(state.relationships)
    );
    return html;
  }

  // Tab: Audit Trail
  function renderTabAudit() {
    return ui.renderSection({ vi: 'Nhat ky thay doi', en: 'Audit Trail' },
      ui.renderAuditTrail(state.audit)
    );
  }

  // Tab: Signatures
  function renderTabSignatures() {
    return ui.renderSection({ vi: 'Chu ky dien tu', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Nguoi tao',         en: 'Originator' },
        { vi: 'QA Xem xet',        en: 'QA Review' },
        { vi: 'MRB Phe duyet',     en: 'MRB Approval' },
        { vi: 'Dong NCR',          en: 'NCR Closure' }
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
    { label: { vi: 'Loai',       en: 'Type' } },
    { label: { vi: 'Mo ta',      en: 'Description' } },
    { label: { vi: 'Loi',        en: 'Defect' } },
    { label: { vi: 'Kiem soat',  en: 'Containment' } },
    { label: { vi: 'Gui',        en: 'Submit' } }
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
    html += ui.renderFormField({ key: 'nc_type',    label: { vi: 'Loai khong phu hop', en: 'NC Type' },     type: 'select', required: true, value: d.nc_type,  options: NC_TYPES });
    html += ui.renderFormField({ key: 'severity',   label: { vi: 'Muc do',             en: 'Severity' },    type: 'select', required: true, value: d.severity,  options: SEVERITIES });
    html += ui.renderFormField({ key: 'department',  label: { vi: 'Phong ban',          en: 'Department' },  type: 'text',   required: true, value: d.department });
    html += ui.renderFormField({ key: 'work_order',  label: { vi: 'Lenh san xuat',      en: 'Work Order' },  type: 'text',   value: d.work_order });
    html += '</div>';
    return html;
  }

  function renderWizardDescription() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'title',        label: { vi: 'Tieu de',         en: 'Title' },         type: 'text',     required: true, value: d.title });
    html += ui.renderFormField({ key: 'part_number',   label: { vi: 'Ma san pham',     en: 'Part Number' },   type: 'text',     value: d.part_number });
    html += ui.renderFormField({ key: 'supplier',      label: { vi: 'Nha cung cap',    en: 'Supplier' },      type: 'text',     value: d.supplier });
    html += ui.renderFormField({ key: 'location',      label: { vi: 'Vi tri',          en: 'Location' },      type: 'text',     value: d.location });
    html += ui.renderFormField({ key: 'detection_point', label: { vi: 'Diem phat hien', en: 'Detection Point' }, type: 'text',  value: d.detection_point });
    html += ui.renderFormField({ key: 'description',   label: { vi: 'Mo ta chi tiet',  en: 'Description' },   type: 'textarea', required: true, value: d.description });
    html += '</div>';
    return html;
  }

  function renderWizardDefect() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'defect_type',       label: { vi: 'Loai loi',       en: 'Defect Type' },       type: 'text',   required: true, value: d.defect_type });
    html += ui.renderFormField({ key: 'quantity_affected',  label: { vi: 'SL anh huong',   en: 'Qty Affected' },      type: 'number', required: true, value: d.quantity_affected, min: 0 });
    html += ui.renderFormField({ key: 'quantity_rejected',  label: { vi: 'SL tu choi',     en: 'Qty Rejected' },      type: 'number', required: true, value: d.quantity_rejected, min: 0 });
    html += '</div>';
    return html;
  }

  function renderWizardContainment() {
    var d = state.wizard.data;
    var html = '<div class="eqms-form-grid">';
    html += ui.renderFormField({ key: 'initial_containment', label: { vi: 'Hanh dong kiem soat ban dau', en: 'Initial Containment' }, type: 'textarea', value: d.initial_containment });
    html += ui.renderFormField({ key: 'quarantine_location', label: { vi: 'Khu vuc cach ly',             en: 'Quarantine Location' },  type: 'text',     value: d.quarantine_location });
    html += ui.renderFormField({ key: 'quarantined_qty',     label: { vi: 'SL cach ly',                  en: 'Quarantined Qty' },       type: 'number',   value: d.quarantined_qty, min: 0 });
    html += '</div>';
    return html;
  }

  function renderWizardReview() {
    var d = state.wizard.data;
    var html = '<div class="eqms-wizard-review">';
    html += ui.renderSection({ vi: 'Xem lai', en: 'Review' },
      ui.renderFieldGrid([
        { label: { vi: 'Tieu de',        en: 'Title' },          value: d.title },
        { label: { vi: 'Loai NC',        en: 'NC Type' },        value: d.nc_type, badge: true },
        { label: { vi: 'Muc do',         en: 'Severity' },       value: d.severity, badge: true },
        { label: { vi: 'Phong ban',      en: 'Department' },     value: d.department },
        { label: { vi: 'Ma SP',          en: 'Part Number' },    value: d.part_number },
        { label: { vi: 'NCC',            en: 'Supplier' },       value: d.supplier },
        { label: { vi: 'SL anh huong',   en: 'Qty Affected' },   value: d.quantity_affected },
        { label: { vi: 'SL tu choi',     en: 'Qty Rejected' },   value: d.quantity_rejected },
        { label: { vi: 'Loai loi',       en: 'Defect Type' },    value: d.defect_type }
      ])
    );
    if (d.description) {
      html += ui.renderSection({ vi: 'Mo ta', en: 'Description' },
        '<div class="eqms-text-block">' + esc(d.description) + '</div>'
      );
    }
    if (d.initial_containment) {
      html += ui.renderSection({ vi: 'Kiem soat ban dau', en: 'Initial Containment' },
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
      { label: { vi: 'Tong NCR',          en: 'Total NCR' },          value: m.total != null ? m.total : '...' },
      { label: { vi: 'Mo',                en: 'Open' },               value: m.total_open != null ? m.total_open : '...' },
      { label: { vi: 'Dong trong thang',  en: 'Closed This Month' },  value: m.closed_this_month != null ? m.closed_this_month : '...' },
      { label: { vi: 'COPQ tich luy',     en: 'COPQ Cumulative' },    value: m.copq_cumulative != null ? '$' + fmt(m.copq_cumulative) : '...' },
      { label: { vi: 'Ty le loi NCC',     en: 'Supplier Defect Rate' }, value: m.supplier_defect_rate != null ? m.supplier_defect_rate + '%' : '...' }
    ]);

    // Trend
    var trendData = m.trend || [];
    html += ui.renderSection({ vi: 'Xu huong NCR', en: 'NCR Trend' },
      ui.renderChartWithTableFallback('ncr-trend-chart', null,
        [
          { key: 'month',  label: { vi: 'Thang',   en: 'Month' },  sortable: false },
          { key: 'opened', label: { vi: 'Mo',      en: 'Opened' }, type: 'number', sortable: false },
          { key: 'closed', label: { vi: 'Dong',    en: 'Closed' }, type: 'number', sortable: false }
        ],
        trendData
      )
    );

    // Defect Pareto
    var paretoData = m.defect_pareto || [];
    html += ui.renderSection({ vi: 'Pareto loi', en: 'Defect Pareto' },
      ui.renderChartWithTableFallback('ncr-pareto-chart', null,
        [
          { key: 'defect_type',        label: { vi: 'Loai loi',    en: 'Defect Type' },        sortable: false },
          { key: 'count',              label: { vi: 'So luong',    en: 'Count' },               type: 'number', sortable: false },
          { key: 'cumulative_percent', label: { vi: 'Tich luy %',  en: 'Cumulative %' },        sortable: false }
        ],
        paretoData
      )
    );

    // Disposition distribution
    var dispData = m.disposition_distribution || [];
    html += ui.renderSection({ vi: 'Phan bo xu ly', en: 'Disposition Distribution' },
      ui.renderChartWithTableFallback('ncr-disp-chart', null,
        [
          { key: 'disposition', label: { vi: 'Xu ly',    en: 'Disposition' }, sortable: false },
          { key: 'count',       label: { vi: 'So luong', en: 'Count' },      type: 'number', sortable: false },
          { key: 'percentage',  label: { vi: 'Ty le',    en: 'Percentage' }, sortable: false }
        ],
        dispData
      )
    );

    // COPQ trend
    var copqData = m.copq_trend || [];
    html += ui.renderSection({ vi: 'COPQ theo thang', en: 'Cost of Poor Quality (COPQ)' },
      ui.renderChartWithTableFallback('ncr-copq-chart', null,
        [
          { key: 'month',       label: { vi: 'Thang',        en: 'Month' },        sortable: false },
          { key: 'scrap_cost',  label: { vi: 'Chi phi huy',  en: 'Scrap Cost' },   type: 'number', sortable: false },
          { key: 'rework_cost', label: { vi: 'Chi phi lam lai', en: 'Rework Cost' }, type: 'number', sortable: false },
          { key: 'total_copq',  label: { vi: 'Tong COPQ',    en: 'Total COPQ' },   type: 'number', sortable: false }
        ],
        copqData
      )
    );

    // Supplier NCR comparison
    var supplierData = m.supplier_comparison || [];
    html += ui.renderSection({ vi: 'NCR theo NCC', en: 'Supplier NCR Comparison' },
      ui.renderChartWithTableFallback('ncr-supplier-chart', null,
        [
          { key: 'supplier',       label: { vi: 'Nha cung cap',  en: 'Supplier' },       sortable: false },
          { key: 'ncr_count',      label: { vi: 'So NCR',        en: 'NCR Count' },       type: 'number', sortable: false },
          { key: 'defect_rate',    label: { vi: 'Ty le loi %',   en: 'Defect Rate %' },   sortable: false },
          { key: 'total_rejected', label: { vi: 'Tong tu choi',  en: 'Total Rejected' },  type: 'number', sortable: false }
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
      { id: 'queue',     label: { vi: 'Hang doi',   en: 'Queue' } },
      { id: 'analytics', label: { vi: 'Phan tich',  en: 'Analytics' } }
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
          var msg = T({ vi: 'Xac nhan xu ly: ', en: 'Confirm disposition: ' }) + (dispLabel ? T(dispLabel.label) : disp);
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
      if (key !== 'new-comment') {
        state.wizard.data[key] = el.value || '';
      }
    });
  }

  // ─── Register ───────────────────────────────────────────────────────────
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['ncr'] = { render: render, meta: MOD };

})();

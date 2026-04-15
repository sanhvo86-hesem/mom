/**
 * EQMS Quality Agreements / Partner Collaboration
 * HESEM MOM Portal · 62-eqms-quality-agreements.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: quality-agreements
 * Archetype: evidence-workspace
 * Load order: AFTER 40-eqms-shell.js
 *
 * Screens: Register | Workspace (6 tabs)
 * Workflow: draft -> under_review -> active -> renewal_pending -> expired | terminated
 * Actions: submit-review, activate, request-renewal, acknowledge, expire, terminate
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
    id:        'quality-agreements',
    version:   '1.0.0',
    archetype: 'evidence-workspace',
    endpoints: [
      'eqms_quality_agreements_query', 'eqms_quality_agreements_detail',
      'eqms_quality_agreements_create', 'eqms_quality_agreements_update',
      'eqms_quality_agreements_metrics', 'eqms_quality_agreements_audit',
      'eqms_quality_agreements_signatures', 'eqms_quality_agreements_export'
    ],
    workflow: ['draft', 'under_review', 'active', 'renewal_pending', 'expired', 'terminated']
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var AGREEMENT_TYPES = [
    { value: 'quality',   label: { vi: 'Chat luong',     en: 'Quality' } },
    { value: 'supply',    label: { vi: 'Cung ung',       en: 'Supply' } },
    { value: 'service',   label: { vi: 'Dich vu',        en: 'Service' } },
    { value: 'technical', label: { vi: 'Ky thuat',       en: 'Technical' } }
  ];

  var STATUS_OPTIONS = MOD.workflow.map(function(s) {
    var labels = {
      draft:            { vi: 'Nhap',             en: 'Draft' },
      under_review:     { vi: 'Dang xem xet',     en: 'Under Review' },
      active:           { vi: 'Hoat dong',         en: 'Active' },
      renewal_pending:  { vi: 'Cho gia han',       en: 'Renewal Pending' },
      expired:          { vi: 'Het han',           en: 'Expired' },
      terminated:       { vi: 'Cham dut',          en: 'Terminated' }
    };
    return { value: s, label: labels[s] || { vi: s, en: s } };
  });

  var SCOPE_OPTIONS = [
    { value: 'global',   label: { vi: 'Toan cau',     en: 'Global' } },
    { value: 'regional', label: { vi: 'Khu vuc',      en: 'Regional' } },
    { value: 'site',     label: { vi: 'Nha may',      en: 'Site' } },
    { value: 'product',  label: { vi: 'San pham',     en: 'Product' } }
  ];

  var REVIEW_FREQUENCY = [
    { value: 'annual',       label: { vi: 'Hang nam',          en: 'Annual' } },
    { value: 'semi_annual',  label: { vi: 'Nua nam',           en: 'Semi-Annual' } },
    { value: 'quarterly',    label: { vi: 'Hang quy',          en: 'Quarterly' } },
    { value: 'as_needed',    label: { vi: 'Khi can thiet',     en: 'As Needed' } }
  ];

  var COMPLIANCE_STATUS_OPTIONS = [
    { value: 'compliant',       label: { vi: 'Tuan thu',          en: 'Compliant' } },
    { value: 'non_compliant',   label: { vi: 'Khong tuan thu',    en: 'Non-Compliant' } },
    { value: 'partially',       label: { vi: 'Tuan thu mot phan', en: 'Partially Compliant' } },
    { value: 'not_assessed',    label: { vi: 'Chua danh gia',     en: 'Not Assessed' } }
  ];

  var SCREENS = { REGISTER: 'register', WORKSPACE: 'workspace' };

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen: SCREENS.REGISTER,
    // Register
    filters: {},
    records: [],
    pagination: { offset: 0, limit: 25, total: 0 },
    sortKey: 'effective_date',
    sortDir: 'desc',
    loading: false,
    error: null,
    // Workspace
    activeTab: 'summary',
    record: null,
    recordId: null,
    clauses: [],
    complianceData: null,
    renewalHistory: [],
    renewalChecklist: [],
    auditEvents: [],
    signatures: [],
    comments: [],
    attachments: [],
    relationships: []
  };

  var _container = null;

  // =========================================================================
  // RENDER ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      state.screen = SCREENS.WORKSPACE;
      state.recordId = context.recordId;
      loadDetail(context.recordId);
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
      case SCREENS.REGISTER:  html = renderRegister();   break;
      case SCREENS.WORKSPACE: html = renderWorkspace();  break;
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

    apiCall('eqms_quality_agreements_query', payload).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.records = res.data || [];
        state.pagination.total = res.total || res.data.length || 0;
      } else {
        state.error = res.message || 'Failed to load quality agreements';
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

    apiCall('eqms_quality_agreements_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success) {
        state.record = res.data || {};
        state.clauses = res.data.clauses || [];
        state.complianceData = res.data.compliance || null;
        state.renewalHistory = res.data.renewal_history || [];
        state.renewalChecklist = res.data.renewal_checklist || [];
        state.relationships = res.data.relationships || [];
        state.comments = res.data.comments || [];
        state.attachments = res.data.attachments || [];
      } else {
        state.error = res.message || 'Failed to load agreement';
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
    apiCall('eqms_quality_agreements_audit', { id: id }).then(function(res) {
      if (res.success) { state.auditEvents = res.data || []; paint(); }
    });
    apiCall('eqms_quality_agreements_signatures', { id: id }).then(function(res) {
      if (res.success) { state.signatures = res.data || []; paint(); }
    });
  }

  // =========================================================================
  // SCREEN: REGISTER
  // =========================================================================
  function renderRegister() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Dang tai thoa thuan chat luong...', en: 'Loading quality agreements...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-register');

    var html = '';

    // KPI row
    var activeCount = countByStatus('active');
    var pendingCount = countByStatus('renewal_pending');
    var expiredCount = countByStatus('expired');

    html += ui.renderKpiRow([
      { label: { vi: 'Tong thoa thuan',     en: 'Total Agreements' },    value: fmt(state.pagination.total) },
      { label: { vi: 'Dang hoat dong',      en: 'Active' },             value: fmt(activeCount), accent: 'success' },
      { label: { vi: 'Cho gia han',         en: 'Renewal Pending' },    value: fmt(pendingCount), accent: pendingCount > 0 ? 'warning' : '' },
      { label: { vi: 'Het han',             en: 'Expired' },            value: fmt(expiredCount), accent: expiredCount > 0 ? 'danger' : '' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary" data-action="go-create">';
    html += '+ ' + T({ vi: 'Tao thoa thuan moi', en: 'New Agreement' });
    html += '</button>';
    html += '</div>';
    html += '<div class="eqms-toolbar-right">';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div></div>';

    // Filter bar
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tim theo ma, doi tac, tieu de...', en: 'Search by ID, partner, title...' }, width: '260px' },
        { key: 'partner', type: 'text', label: { vi: 'Doi tac', en: 'Partner' }, width: '160px' },
        { key: 'status', type: 'select', label: { vi: 'Trang thai', en: 'Status' }, options: STATUS_OPTIONS },
        { key: 'scope', type: 'select', label: { vi: 'Pham vi', en: 'Scope' }, options: SCOPE_OPTIONS },
        { key: 'expiry_before', type: 'date', label: { vi: 'Het han truoc', en: 'Expires Before' } }
      ]
    });

    // Data grid
    var columns = [
      { key: 'agreement_id',   label: { vi: 'Ma thoa thuan',   en: 'Agreement ID' },    type: 'id', sortable: true },
      { key: 'partner_name',   label: { vi: 'Doi tac',         en: 'Partner' },          sortable: true },
      { key: 'title',          label: { vi: 'Tieu de',         en: 'Title' },            sortable: true },
      { key: 'status',         label: { vi: 'Trang thai',      en: 'Status' },           type: 'badge', sortable: true },
      { key: 'scope',          label: { vi: 'Pham vi',         en: 'Scope' },            type: 'badge' },
      { key: 'effective_date', label: { vi: 'Ngay hieu luc',   en: 'Effective Date' },   type: 'date', sortable: true },
      { key: 'expiry_date',    label: { vi: 'Ngay het han',    en: 'Expiry Date' },      type: 'date', sortable: true },
      { key: 'compliance_pct', label: { vi: 'Tuan thu (%)',    en: 'Compliance (%)' },   sortable: true,
        render: function(v) {
          var pct = v || 0;
          var color = pct >= 90 ? 'var(--hm-accent-success,#22c55e)' : pct >= 70 ? 'var(--hm-accent-warning,#f59e0b)' : 'var(--hm-accent-danger,#ef4444)';
          return '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--hm-bg-secondary,#f1f5f9);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px"></div></div><span style="font-size:12px;min-width:32px;text-align:right">' + esc(pct + '%') + '</span></div>';
        }
      }
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

  // =========================================================================
  // SCREEN: WORKSPACE
  // =========================================================================
  function renderWorkspace() {
    if (state.loading) return ui.renderLoadingState({ vi: 'Dang tai chi tiet thoa thuan...', en: 'Loading agreement details...' });
    if (state.error) return ui.renderErrorState(state.error, 'retry-detail');
    if (!state.record) return ui.renderEmptyState({ icon: '\uD83E\uDD1D', title: { vi: 'Khong tim thay ban ghi', en: 'Record not found' } });

    var rec = state.record;
    var html = '';

    // Back button
    html += '<button class="eqms-btn ghost sm" data-action="go-register" style="margin-bottom:8px">';
    html += '\u2190 ' + T({ vi: 'Quay lai danh sach', en: 'Back to register' });
    html += '</button>';

    // Expiry warning
    if (rec.status === 'renewal_pending' || isExpiringWithin30Days(rec.expiry_date)) {
      html += '<div class="eqms-notice warning" style="margin-bottom:12px;display:flex;align-items:center;gap:8px">';
      html += '<span style="font-size:20px">\u26A0\uFE0F</span>';
      html += '<strong>' + T({ vi: 'Thoa thuan sap het han — Can gia han', en: 'Agreement expiring soon — Renewal required' }) + '</strong>';
      html += '</div>';
    }

    // Identity header
    html += ui.renderIdentityHeader(rec, {
      actions: getWorkspaceActions(rec),
      extraMeta: [
        { label: { vi: 'Doi tac', en: 'Partner' }, value: rec.partner_name },
        { label: { vi: 'Pham vi', en: 'Scope' }, value: rec.scope },
        { label: { vi: 'Loai', en: 'Type' }, value: rec.type },
        { label: { vi: 'Het han', en: 'Expiry' }, value: fmtDate(rec.expiry_date) }
      ]
    });

    // State timeline
    html += ui.renderStateTimeline(MOD.workflow, rec.status);

    // Tabs
    var tabs = [
      { id: 'summary',    label: { vi: 'Tom tat',           en: 'Summary' } },
      { id: 'terms',      label: { vi: 'Dieu khoan',        en: 'Terms' }, badge: state.clauses.length || null },
      { id: 'compliance', label: { vi: 'Tuan thu',          en: 'Compliance' } },
      { id: 'renewal',    label: { vi: 'Gia han',           en: 'Renewal' } },
      { id: 'related',    label: { vi: 'Lien ket & Kiem toan', en: 'Related & Audit' } },
      { id: 'signatures', label: { vi: 'Chu ky & Dinh kem',  en: 'Signatures & Files' } }
    ];

    html += ui.renderTabs(tabs, state.activeTab);
    html += '<div class="eqms-tab-content">';
    html += renderWorkspaceTab();
    html += '</div>';

    return html;
  }

  function isExpiringWithin30Days(dateStr) {
    if (!dateStr) return false;
    try {
      var expiry = new Date(dateStr);
      var now = new Date();
      var diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    } catch (e) { return false; }
  }

  function getWorkspaceActions(rec) {
    var actions = [];
    var s = rec.status;

    if (s === 'draft') {
      actions.push({ action: 'submit-review', label: { vi: 'Gui xem xet', en: 'Submit for Review' }, style: 'primary' });
    }
    if (s === 'under_review') {
      actions.push({ action: 'activate', label: { vi: 'Kich hoat', en: 'Activate' }, style: 'primary' });
    }
    if (s === 'active') {
      actions.push({ action: 'request-renewal', label: { vi: 'Yeu cau gia han', en: 'Request Renewal' }, style: 'secondary' });
      actions.push({ action: 'terminate', label: { vi: 'Cham dut', en: 'Terminate' }, style: 'ghost' });
    }
    if (s === 'renewal_pending') {
      actions.push({ action: 'activate', label: { vi: 'Phe duyet gia han', en: 'Approve Renewal' }, style: 'primary' });
      actions.push({ action: 'expire', label: { vi: 'De het han', en: 'Let Expire' }, style: 'ghost' });
    }

    return actions;
  }

  // =========================================================================
  // WORKSPACE TABS
  // =========================================================================
  function renderWorkspaceTab() {
    switch (state.activeTab) {
      case 'summary':    return renderSummaryTab();
      case 'terms':      return renderTermsTab();
      case 'compliance': return renderComplianceTab();
      case 'renewal':    return renderRenewalTab();
      case 'related':    return renderRelatedTab();
      case 'signatures': return renderSignaturesTab();
      default:           return '';
    }
  }

  // --- Summary Tab ---
  function renderSummaryTab() {
    var rec = state.record;
    return ui.renderSection({ vi: 'Thong tin thoa thuan', en: 'Agreement Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ma thoa thuan',       en: 'Agreement ID' },      value: rec.agreement_id,        mono: true },
        { label: { vi: 'Doi tac',             en: 'Partner' },           value: rec.partner_name },
        { label: { vi: 'Tieu de',             en: 'Title' },             value: rec.title },
        { label: { vi: 'Pham vi',             en: 'Scope' },             value: rec.scope,               badge: true },
        { label: { vi: 'Loai thoa thuan',     en: 'Agreement Type' },    value: rec.type,                badge: true },
        { label: { vi: 'Ngay hieu luc',       en: 'Effective Date' },    value: fmtDate(rec.effective_date) },
        { label: { vi: 'Ngay het han',        en: 'Expiry Date' },       value: fmtDate(rec.expiry_date) },
        { label: { vi: 'Tan suat xem xet',   en: 'Review Frequency' },  value: rec.review_frequency },
        { label: { vi: 'Chu so huu',          en: 'Owner' },             value: rec.owner },
        { label: { vi: 'Trang thai',          en: 'Status' },            value: rec.status,              badge: true },
        { label: { vi: 'Mo ta',               en: 'Description' },       value: rec.description },
        { label: { vi: 'Ghi chu',             en: 'Notes' },             value: rec.notes }
      ])
    );
  }

  // --- Terms Tab ---
  function renderTermsTab() {
    var html = '';

    // Key quality requirements
    if (state.record && state.record.key_requirements) {
      html += ui.renderSection({ vi: 'Yeu cau chat luong chinh', en: 'Key Quality Requirements' },
        '<div style="line-height:1.7;color:var(--hm-text-primary,#1e293b)">' + esc(state.record.key_requirements) + '</div>'
      );
    }

    // Clauses table
    var columns = [
      { key: 'clause_number',     label: { vi: 'So dieu',          en: 'Clause #' },           sortable: true },
      { key: 'title',             label: { vi: 'Tieu de',          en: 'Title' },               sortable: true },
      { key: 'description',       label: { vi: 'Mo ta',            en: 'Description' },         type: 'truncate' },
      { key: 'compliance_status', label: { vi: 'Tuan thu',         en: 'Compliance Status' },   type: 'badge' },
      { key: 'last_assessed',     label: { vi: 'Danh gia lan cuoi', en: 'Last Assessed' },      type: 'date' }
    ];

    html += ui.renderSection({ vi: 'Danh sach dieu khoan', en: 'Clauses' },
      ui.renderDataGrid(columns, state.clauses, { selectable: false }),
      {
        headerActions: '<button class="eqms-btn ghost sm" data-action="add-clause">+ ' + T({ vi: 'Them dieu khoan', en: 'Add Clause' }) + '</button>'
      }
    );

    return html;
  }

  // --- Compliance Tracking Tab ---
  function renderComplianceTab() {
    var comp = state.complianceData;
    var html = '';

    // Compliance score overview
    var score = comp ? (comp.overall_score || 0) : 0;
    var scoreColor = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'danger';

    html += ui.renderKpiRow([
      { label: { vi: 'Diem tuan thu tong',      en: 'Overall Compliance Score' }, value: score + '%', accent: scoreColor },
      { label: { vi: 'Dieu khoan tuan thu',      en: 'Compliant Clauses' },       value: comp ? fmt(comp.compliant_count || 0) : '0', accent: 'success' },
      { label: { vi: 'Khong tuan thu',           en: 'Non-Compliant' },           value: comp ? fmt(comp.non_compliant_count || 0) : '0', accent: (comp && comp.non_compliant_count > 0) ? 'danger' : '' },
      { label: { vi: 'Chua danh gia',            en: 'Not Assessed' },            value: comp ? fmt(comp.not_assessed_count || 0) : '0' }
    ]);

    // Non-compliance issues
    var issues = (comp && comp.issues) || [];
    if (issues.length > 0) {
      var issueColumns = [
        { key: 'clause_ref',  label: { vi: 'Dieu khoan',    en: 'Clause' } },
        { key: 'description', label: { vi: 'Mo ta',         en: 'Description' } },
        { key: 'severity',    label: { vi: 'Muc do',        en: 'Severity' },     type: 'badge' },
        { key: 'due_date',    label: { vi: 'Han xu ly',     en: 'Due Date' },     type: 'date' },
        { key: 'owner',       label: { vi: 'Nguoi phu trach', en: 'Owner' } },
        { key: 'status',      label: { vi: 'Trang thai',    en: 'Status' },       type: 'badge' }
      ];

      html += ui.renderSection({ vi: 'Van de khong tuan thu', en: 'Non-Compliance Issues' },
        ui.renderDataGrid(issueColumns, issues, { selectable: false })
      );
    }

    // Action items
    var actionItems = (comp && comp.action_items) || [];
    if (actionItems.length > 0) {
      var actionColumns = [
        { key: 'action',     label: { vi: 'Hanh dong',        en: 'Action' } },
        { key: 'owner',      label: { vi: 'Nguoi phu trach',  en: 'Owner' } },
        { key: 'due_date',   label: { vi: 'Han',              en: 'Due Date' },  type: 'date' },
        { key: 'status',     label: { vi: 'Trang thai',       en: 'Status' },    type: 'badge' }
      ];

      html += ui.renderSection({ vi: 'Hang muc hanh dong', en: 'Action Items' },
        ui.renderDataGrid(actionColumns, actionItems, { selectable: false })
      );
    }

    if (!issues.length && !actionItems.length && score === 0) {
      html += ui.renderEmptyState({
        icon: '\u2705',
        title: { vi: 'Chua co du lieu tuan thu', en: 'No compliance data yet' },
        desc: { vi: 'Danh gia tuan thu se hien thi o day sau khi duoc thuc hien', en: 'Compliance assessments will appear here once performed' }
      });
    }

    return html;
  }

  // --- Renewal Tab ---
  function renderRenewalTab() {
    var rec = state.record;
    var html = '';

    // Next renewal info
    html += ui.renderSection({ vi: 'Thong tin gia han', en: 'Renewal Information' },
      ui.renderFieldGrid([
        { label: { vi: 'Ngay het han hien tai',    en: 'Current Expiry Date' },   value: fmtDate(rec.expiry_date) },
        { label: { vi: 'Ngay gia han tiep theo',   en: 'Next Renewal Date' },     value: fmtDate(rec.next_renewal_date) },
        { label: { vi: 'Tan suat xem xet',         en: 'Review Frequency' },      value: rec.review_frequency },
        { label: { vi: 'Trang thai gia han',        en: 'Renewal Status' },        value: rec.renewal_status || rec.status, badge: true }
      ])
    );

    // Renewal checklist
    if (state.renewalChecklist.length > 0) {
      html += ui.renderSection({ vi: 'Danh sach kiem tra gia han', en: 'Renewal Checklist' }, renderChecklist(state.renewalChecklist));
    }

    // Approval section
    if (rec.status === 'renewal_pending') {
      html += ui.renderSection({ vi: 'Phe duyet gia han', en: 'Renewal Approval' },
        '<div style="display:flex;gap:8px;padding:12px 0">' +
        '<button class="eqms-btn primary" data-action="activate">' + T({ vi: 'Phe duyet gia han', en: 'Approve Renewal' }) + '</button>' +
        '<button class="eqms-btn ghost" data-action="expire">' + T({ vi: 'De het han', en: 'Let Expire' }) + '</button>' +
        '</div>'
      );
    }

    // Renewal history
    if (state.renewalHistory.length > 0) {
      var histColumns = [
        { key: 'version',        label: { vi: 'Phien ban',          en: 'Version' } },
        { key: 'effective_date', label: { vi: 'Ngay hieu luc',      en: 'Effective Date' },  type: 'date' },
        { key: 'expiry_date',    label: { vi: 'Ngay het han',       en: 'Expiry Date' },     type: 'date' },
        { key: 'approved_by',    label: { vi: 'Phe duyet boi',      en: 'Approved By' } },
        { key: 'notes',          label: { vi: 'Ghi chu',            en: 'Notes' } }
      ];

      html += ui.renderSection({ vi: 'Lich su gia han', en: 'Renewal History' },
        ui.renderDataGrid(histColumns, state.renewalHistory, { selectable: false })
      );
    } else if (state.renewalChecklist.length === 0 && rec.status !== 'renewal_pending') {
      html += ui.renderEmptyState({
        icon: '\uD83D\uDD04',
        title: { vi: 'Chua co lich su gia han', en: 'No renewal history' },
        desc: { vi: 'Lich su gia han se hien thi khi thoa thuan duoc gia han', en: 'Renewal history will appear when the agreement is renewed' }
      });
    }

    return html;
  }

  function renderChecklist(items) {
    var html = '<div style="display:flex;flex-direction:column;gap:8px">';
    items.forEach(function(item) {
      var checked = item.completed || item.checked;
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;background:var(--hm-bg-secondary,#f8fafc)">';
      html += '<span style="font-size:16px">' + (checked ? '\u2705' : '\u2B1C') + '</span>';
      html += '<span style="flex:1">' + esc(item.label || item.title || item.description) + '</span>';
      if (item.assignee) html += '<span style="font-size:12px;color:var(--hm-text-tertiary)">' + esc(item.assignee) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // --- Related Records + Audit Trail Tab ---
  function renderRelatedTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Lien ket', en: 'Relationships' },
      ui.renderRelationshipsPanel(state.relationships)
    );

    html += ui.renderSection({ vi: 'Nhat ky kiem toan', en: 'Audit Trail' },
      ui.renderAuditTrail(state.auditEvents)
    );

    return html;
  }

  // --- Signatures + Attachments + Comments Tab ---
  function renderSignaturesTab() {
    var html = '';

    html += ui.renderSection({ vi: 'Chu ky dien tu', en: 'Electronic Signatures' },
      ui.renderSignaturePanel(state.signatures, [
        { vi: 'Nguoi tao', en: 'Drafted' },
        { vi: 'Doi tac ky', en: 'Partner Signed' },
        { vi: 'Nguoi phe duyet', en: 'Approved' },
        { vi: 'QA Xac nhan', en: 'QA Acknowledged' }
      ])
    );

    html += ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' },
      ui.renderAttachmentsGrid(state.attachments)
    );

    html += ui.renderSection({ vi: 'Binh luan', en: 'Comments' },
      ui.renderCommentsThread(state.comments)
    );

    return html;
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function(e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { state.activeTab = tab.getAttribute('data-tab'); paint(); return; }

      var sortTh = e.target.closest('th[data-sort]');
      if (sortTh && state.screen === SCREENS.REGISTER) {
        var key = sortTh.getAttribute('data-sort');
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        state.pagination.offset = 0;
        loadRegister();
        return;
      }

      var row = e.target.closest('tr[data-id]');
      if (row && state.screen === SCREENS.REGISTER && !e.target.closest('input[type="checkbox"]')) {
        var id = row.getAttribute('data-id');
        if (id) { state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary'; loadDetail(id); }
        return;
      }

      var pageBtn = e.target.closest('[data-action="page"]');
      if (pageBtn) {
        var page = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (page > 0) { state.pagination.offset = (page - 1) * state.pagination.limit; loadRegister(); }
        return;
      }

      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'go-register':
          state.screen = SCREENS.REGISTER; state.record = null; state.recordId = null; loadRegister(); break;
        case 'go-create':
          createNewAgreement(); break;
        case 'retry-register':
          loadRegister(); break;
        case 'retry-detail':
          if (state.recordId) loadDetail(state.recordId); break;
        case 'apply-filters':
          collectFilters(); state.pagination.offset = 0; loadRegister(); break;
        case 'reset-filters':
          state.filters = {}; state.pagination.offset = 0; loadRegister(); break;
        case 'submit-review':
        case 'activate':
        case 'request-renewal':
        case 'acknowledge':
        case 'expire':
        case 'terminate':
          executeAction(action); break;
        case 'add-comment':
          postComment(); break;
        case 'add-clause':
          addClause(); break;
        case 'export':
          handleExport(actionEl.getAttribute('data-format')); break;
      }
    });
  }

  // =========================================================================
  // DATA COLLECTION
  // =========================================================================
  function collectFilters() {
    if (!_container) return;
    state.filters = {};
    _container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      if (el.value) state.filters[key] = el.value;
    });
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function executeAction(action) {
    if (!state.record || !state.record.id) return;
    apiCall('eqms_quality_agreements_update', { id: state.record.id, action: action }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function createNewAgreement() {
    apiCall('eqms_quality_agreements_create', { status: 'draft' }).then(function(res) {
      if (res.success) {
        state.screen = SCREENS.WORKSPACE; state.activeTab = 'summary';
        loadDetail(res.data.id || res.data.agreement_id);
      }
    });
  }

  function addClause() {
    if (!state.record || !state.record.id) return;
    var clauseNum = (state.clauses.length + 1).toString();
    apiCall('eqms_quality_agreements_update', {
      id: state.record.id,
      action: 'add-clause',
      clause: { clause_number: clauseNum, title: '', description: '', compliance_status: 'not_assessed' }
    }).then(function(res) {
      if (res.success) { loadDetail(state.record.id); }
    });
  }

  function postComment() {
    if (!_container || !state.record) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    apiCall('eqms_quality_agreements_audit', { id: state.record.id, action: 'add-comment', text: textarea.value.trim() }).then(function(res) {
      if (res.success) { state.comments = res.data || state.comments; textarea.value = ''; paint(); }
    });
  }

  function handleExport(format) {
    var payload = { format: format };
    if (state.screen === SCREENS.WORKSPACE && state.record) { payload.id = state.record.id; }
    else { payload.filters = state.filters; }
    apiCall('eqms_quality_agreements_export', payload).then(function(res) {
      if (res.success && res.data && res.data.url) { window.open(res.data.url, '_blank'); }
    });
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['quality-agreements'] = { render: render, meta: MOD };

})();

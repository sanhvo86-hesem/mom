/**
 * 53-eqms-risks.js — Quality Risk Management + FMEA
 * HESEM MOM Portal · Analytical List + Risk Matrix
 *
 * Screens: Risk Register, Risk Detail, Risk Heatmap, FMEA List, FMEA Detail, Analytics
 * Workflow: identified -> assessed -> controls_defined -> monitoring -> accepted | mitigated | closed
 * Endpoints: eqms_risks_*, eqms_fmea_*
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

  // ─── Constants ───────────────────────────────────────────────────────
  var RISK_STATES = ['identified','assessed','controls_defined','monitoring','accepted','mitigated','closed'];
  var RISK_CATEGORIES = [
    { value: 'process',       label: { vi: 'Quy trinh', en: 'Process' } },
    { value: 'product',       label: { vi: 'San pham', en: 'Product' } },
    { value: 'supplier',      label: { vi: 'Nha cung cap', en: 'Supplier' } },
    { value: 'regulatory',    label: { vi: 'Phap quy', en: 'Regulatory' } },
    { value: 'safety',        label: { vi: 'An toan', en: 'Safety' } },
    { value: 'environmental', label: { vi: 'Moi truong', en: 'Environmental' } }
  ];
  var CONTROL_TYPES = [
    { value: 'preventive', label: { vi: 'Phong ngua', en: 'Preventive' } },
    { value: 'detective',  label: { vi: 'Phat hien', en: 'Detective' } },
    { value: 'corrective', label: { vi: 'Khac phuc', en: 'Corrective' } }
  ];
  var CONTROL_STATUSES = [
    { value: 'planned',      label: { vi: 'Da len ke hoach', en: 'Planned' } },
    { value: 'implemented',  label: { vi: 'Da thuc hien', en: 'Implemented' } },
    { value: 'verified',     label: { vi: 'Da xac minh', en: 'Verified' } },
    { value: 'ineffective',  label: { vi: 'Khong hieu qua', en: 'Ineffective' } }
  ];
  var LIKELIHOOD_LABELS = [
    { vi: 'Hiem khi', en: 'Rare' },
    { vi: 'Kho xay ra', en: 'Unlikely' },
    { vi: 'Co the', en: 'Possible' },
    { vi: 'Co kha nang', en: 'Likely' },
    { vi: 'Gan nhu chac chan', en: 'Almost Certain' }
  ];
  var SEVERITY_LABELS = [
    { vi: 'Khong dang ke', en: 'Negligible' },
    { vi: 'Nho', en: 'Minor' },
    { vi: 'Trung binh', en: 'Moderate' },
    { vi: 'Lon', en: 'Major' },
    { vi: 'Tham hoa', en: 'Catastrophic' }
  ];
  var FMEA_TYPES = [
    { value: 'DFMEA', label: { vi: 'DFMEA', en: 'DFMEA' } },
    { value: 'PFMEA', label: { vi: 'PFMEA', en: 'PFMEA' } }
  ];
  var RISK_ACTIONS = {
    identified: [{ action: 'assess',               label: { vi: 'Danh gia', en: 'Assess' },              style: 'primary' }],
    assessed:   [{ action: 'add-control',           label: { vi: 'Them kiem soat', en: 'Add Control' },   style: 'primary' }],
    controls_defined: [{ action: 'verify-control',  label: { vi: 'Xac minh', en: 'Verify Control' },     style: 'primary' }],
    monitoring: [
      { action: 'accept-residual-risk', label: { vi: 'Chap nhan rui ro', en: 'Accept Risk' },   style: 'secondary' },
      { action: 'review',               label: { vi: 'Xem xet lai', en: 'Review' },             style: 'primary' }
    ]
  };

  // ─── State ───────────────────────────────────────────────────────────
  var state = {
    screen: 'risk-register', // risk-register | risk-detail | heatmap | fmea-list | fmea-detail | analytics
    filters: {},
    fmeaFilters: {},
    sortKey: 'risk_score', sortDir: 'desc',
    fmeaSortKey: 'created_at', fmeaSortDir: 'desc',
    page: 1, limit: 25,
    fmeaPage: 1,
    data: [], total: 0,
    fmeaData: [], fmeaTotal: 0,
    metrics: null,
    heatmapData: null,
    record: null,
    fmeaRecord: null,
    detailTab: 'summary',
    fmeaDetailTab: 'summary',
    auditEvents: [], signatures: [],
    loading: false
  };

  var container = null;

  // ─── Helpers ─────────────────────────────────────────────────────────
  function riskScoreColor(score) {
    if (score == null) return '';
    var n = Number(score);
    if (n <= 6)  return 'risk-green';
    if (n <= 12) return 'risk-yellow';
    if (n <= 19) return 'risk-orange';
    return 'risk-red';
  }

  function riskScoreHtml(score) {
    var cls = riskScoreColor(score);
    return '<span class="eqms-risk-score ' + cls + '">' + esc(score != null ? score : '--') + '</span>';
  }

  function calcAP(s, o, d) {
    s = Number(s) || 0; o = Number(o) || 0; d = Number(d) || 0;
    if (s >= 9 || (s >= 6 && o >= 4)) return 'H';
    if (s >= 5 || (o >= 4 && d >= 4)) return 'M';
    return 'L';
  }

  function apBadge(ap) {
    var cls = ap === 'H' ? 'ap-high' : (ap === 'M' ? 'ap-medium' : 'ap-low');
    return '<span class="eqms-badge ' + cls + '">' + esc(ap) + '</span>';
  }

  function toast(msg) {
    if (typeof window._ecShowToast === 'function') window._ecShowToast(msg, 'success');
  }

  function collectForm(el) {
    var d = {};
    el.querySelectorAll('[data-field]').forEach(function(f) {
      d[f.getAttribute('data-field')] = f.type === 'checkbox' ? f.checked : f.value;
    });
    return d;
  }

  // ─── API Loaders ─────────────────────────────────────────────────────
  function loadRisks() {
    state.loading = true; renderRoot();
    var p = Object.assign({}, state.filters, {
      offset: (state.page - 1) * state.limit,
      limit: state.limit,
      sort: state.sortKey, dir: state.sortDir
    });
    apiCall('eqms_risks_query', p, 'GET').then(function(r) {
      state.data = (r && r.data) || [];
      state.total = (r && r.total) || state.data.length;
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadRiskDetail(id) {
    state.loading = true; state.screen = 'risk-detail'; state.detailTab = 'summary'; renderRoot();
    Promise.all([
      apiCall('eqms_risks_detail', { id: id }, 'GET'),
      apiCall('eqms_risks_audit', { id: id }, 'GET'),
      apiCall('eqms_risks_signatures', { id: id }, 'GET')
    ]).then(function(results) {
      state.record = (results[0] && results[0].data) || results[0] || {};
      state.auditEvents = (results[1] && results[1].data) || [];
      state.signatures = (results[2] && results[2].data) || [];
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadHeatmap() {
    state.loading = true; state.screen = 'heatmap'; renderRoot();
    apiCall('eqms_risks_heatmap', {}, 'GET').then(function(r) {
      state.heatmapData = (r && r.data) || r || {};
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadMetrics() {
    apiCall('eqms_risks_metrics', {}, 'GET').then(function(r) {
      state.metrics = (r && r.data) || r || {};
      renderRoot();
    }).catch(function() {});
  }

  function loadFmeas() {
    state.loading = true; renderRoot();
    var p = Object.assign({}, state.fmeaFilters, {
      offset: (state.fmeaPage - 1) * state.limit,
      limit: state.limit,
      sort: state.fmeaSortKey, dir: state.fmeaSortDir
    });
    apiCall('eqms_fmea_query', p, 'GET').then(function(r) {
      state.fmeaData = (r && r.data) || [];
      state.fmeaTotal = (r && r.total) || state.fmeaData.length;
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  function loadFmeaDetail(id) {
    state.loading = true; state.screen = 'fmea-detail'; state.fmeaDetailTab = 'summary'; renderRoot();
    apiCall('eqms_fmea_detail', { id: id }, 'GET').then(function(r) {
      state.fmeaRecord = (r && r.data) || r || {};
      state.loading = false; renderRoot();
    }).catch(function() { state.loading = false; renderRoot(); });
  }

  // ─── MODULE META ─────────────────────────────────────────────────────
  var MOD = {
    id: 'risks',
    label: { vi: 'Quan ly rui ro & FMEA', en: 'Risk Management & FMEA' },
    icon: '\u{1F6E1}\uFE0F'
  };

  // ─── TOP-LEVEL TABS ──────────────────────────────────────────────────
  var SCREEN_TABS = [
    { id: 'risk-register', label: { vi: 'So rui ro', en: 'Risk Register' } },
    { id: 'heatmap',       label: { vi: 'Ban do nhiet', en: 'Risk Heatmap' } },
    { id: 'fmea-list',     label: { vi: 'FMEA', en: 'FMEA' } },
    { id: 'analytics',     label: { vi: 'Phan tich', en: 'Analytics' } }
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER ROOT
  // ═══════════════════════════════════════════════════════════════════════
  function renderRoot() {
    if (!container) return;
    var html = '';

    // Screen tabs (only if not in detail view)
    if (state.screen !== 'risk-detail' && state.screen !== 'fmea-detail') {
      html += ui.renderTabs(SCREEN_TABS, state.screen);
    }

    if (state.loading) {
      html += ui.renderLoadingState({ vi: 'Dang tai du lieu...', en: 'Loading data...' });
      container.innerHTML = html;
      return;
    }

    switch (state.screen) {
      case 'risk-register': html += renderRiskRegister(); break;
      case 'risk-detail':   html += renderRiskDetail();   break;
      case 'heatmap':       html += renderHeatmap();      break;
      case 'fmea-list':     html += renderFmeaList();     break;
      case 'fmea-detail':   html += renderFmeaDetail();   break;
      case 'analytics':     html += renderAnalytics();    break;
    }

    container.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 1: RISK REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  function renderRiskRegister() {
    var html = '';

    // KPI row
    if (state.metrics) {
      html += ui.renderKpiRow([
        { label: { vi: 'Tong rui ro', en: 'Total Risks' },         value: fmt(state.metrics.total_risks),     accent: '' },
        { label: { vi: 'Rui ro cao', en: 'High Risks' },           value: fmt(state.metrics.high_risks),      accent: 'danger' },
        { label: { vi: 'Dang giam sat', en: 'Monitoring' },        value: fmt(state.metrics.monitoring),      accent: 'warning' },
        { label: { vi: 'Da dong', en: 'Closed' },                  value: fmt(state.metrics.closed),          accent: 'success' },
        { label: { vi: 'Can xem xet', en: 'Due for Review' },      value: fmt(state.metrics.due_for_review),  accent: 'info' }
      ]);
    }

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-risk">' + T({ vi: '+ Them rui ro', en: '+ New Risk' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel', 'csv'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tim kiem...', en: 'Search...' }, width: '200px' },
        { key: 'category', type: 'select', label: { vi: 'Danh muc', en: 'Category' }, options: RISK_CATEGORIES },
        { key: 'risk_level', type: 'select', label: { vi: 'Muc rui ro', en: 'Risk Level' }, options: [
          { value: 'low', label: { vi: 'Thap', en: 'Low' } },
          { value: 'medium', label: { vi: 'Trung binh', en: 'Medium' } },
          { value: 'high', label: { vi: 'Cao', en: 'High' } },
          { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } }
        ]},
        { key: 'control_status', type: 'select', label: { vi: 'Trang thai KS', en: 'Control Status' }, options: CONTROL_STATUSES },
        { key: 'status', type: 'select', label: { vi: 'Trang thai', en: 'Status' }, options: RISK_STATES.map(function(s) { return { value: s, label: s.replace(/_/g, ' ') }; }) }
      ]
    });

    // Grid
    var columns = [
      { key: 'risk_id',        label: { vi: 'Ma rui ro', en: 'Risk ID' },      type: 'id',     sortable: true },
      { key: 'title',          label: { vi: 'Tieu de', en: 'Title' },           type: 'truncate', sortable: true },
      { key: 'category',       label: { vi: 'Danh muc', en: 'Category' },       type: 'badge',  sortable: true },
      { key: 'likelihood',     label: { vi: 'Kha nang', en: 'Likelihood' },     type: 'number', sortable: true },
      { key: 'severity',       label: { vi: 'Muc do', en: 'Severity' },         type: 'number', sortable: true },
      { key: 'risk_score',     label: { vi: 'Diem rui ro', en: 'Risk Score' },  sortable: true, render: function(v) { return riskScoreHtml(v); } },
      { key: 'control_status', label: { vi: 'Kiem soat', en: 'Control Status' }, type: 'badge',  sortable: true },
      { key: 'owner',          label: { vi: 'Chu so huu', en: 'Owner' },         sortable: true },
      { key: 'review_date',    label: { vi: 'Ngay xem xet', en: 'Review Date' }, type: 'date',   sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.data, {
      selectable: true,
      sortKey: state.sortKey,
      sortDir: state.sortDir
    });

    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 2: RISK DETAIL
  // ═══════════════════════════════════════════════════════════════════════
  function renderRiskDetail() {
    var r = state.record;
    if (!r) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Khong tim thay rui ro', en: 'Risk not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-list">\u2190 ' + T({ vi: 'Quay lai', en: 'Back' }) + '</button></div>';

    // Identity header
    var actions = RISK_ACTIONS[r.status] || [];
    html += ui.renderIdentityHeader(r, { actions: actions });

    // Timeline
    html += ui.renderStateTimeline(RISK_STATES, r.status);

    // Tabs
    var detailTabs = [
      { id: 'summary',        label: { vi: 'Tong quan', en: 'Summary' } },
      { id: 'assessment',     label: { vi: 'Danh gia', en: 'Assessment' } },
      { id: 'controls',       label: { vi: 'Kiem soat', en: 'Controls' }, badge: r.controls ? r.controls.length : 0 },
      { id: 'residual',       label: { vi: 'Rui ro con lai', en: 'Residual Risk' } },
      { id: 'review-history', label: { vi: 'Lich su xem xet', en: 'Review History' } },
      { id: 'audit',          label: { vi: 'Nhat ky', en: 'Audit Trail' } }
    ];
    html += ui.renderTabs(detailTabs, state.detailTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    switch (state.detailTab) {
      case 'summary':        html += renderRiskSummary(r); break;
      case 'assessment':     html += renderRiskAssessment(r); break;
      case 'controls':       html += renderRiskControls(r); break;
      case 'residual':       html += renderResidualRisk(r); break;
      case 'review-history': html += renderReviewHistory(r); break;
      case 'audit':          html += renderRiskAuditTab(r); break;
    }
    html += '</div>';
    return html;
  }

  // ── Detail Tab: Summary ──
  function renderRiskSummary(r) {
    return ui.renderFieldGrid([
      { label: { vi: 'Ma rui ro', en: 'Risk ID' },           value: r.risk_id, mono: true },
      { label: { vi: 'Tieu de', en: 'Title' },               value: r.title },
      { label: { vi: 'Danh muc', en: 'Category' },           value: r.category, badge: true },
      { label: { vi: 'Mo ta', en: 'Description' },           value: r.description },
      { label: { vi: 'Kha nang (1-5)', en: 'Likelihood' },   value: r.likelihood },
      { label: { vi: 'Muc do (1-5)', en: 'Severity' },       value: r.severity },
      { label: { vi: 'Diem rui ro', en: 'Risk Score' },      value: r.risk_score, badge: true },
      { label: { vi: 'Cap do rui ro', en: 'Risk Level' },    value: r.risk_level, badge: true },
      { label: { vi: 'Chu so huu', en: 'Owner' },            value: r.owner },
      { label: { vi: 'Ngay xac dinh', en: 'Identified Date' }, value: fmtDate(r.identified_date) },
      { label: { vi: 'Ngay xem xet', en: 'Review Date' },    value: fmtDate(r.review_date) },
      { label: { vi: 'Trang thai', en: 'Status' },           value: r.status, badge: true }
    ]);
  }

  // ── Detail Tab: Assessment ──
  function renderRiskAssessment(r) {
    var html = '';
    html += ui.renderSection({ vi: 'Danh gia hien tai', en: 'Current Assessment' },
      ui.renderFieldGrid([
        { label: { vi: 'Ly do kha nang', en: 'Likelihood Rationale' }, value: r.likelihood_rationale },
        { label: { vi: 'Ly do muc do', en: 'Severity Rationale' },     value: r.severity_rationale },
        { label: { vi: 'Vi tri ma tran', en: 'Matrix Position' },      value: 'L=' + (r.likelihood || '-') + ', S=' + (r.severity || '-') + ' => ' + (r.risk_score || '-') }
      ])
    );

    // Mini risk matrix position indicator
    html += '<div class="eqms-risk-mini-matrix">';
    for (var sev = 5; sev >= 1; sev--) {
      for (var lik = 1; lik <= 5; lik++) {
        var score = lik * sev;
        var cls = riskScoreColor(score);
        var isPos = (Number(r.likelihood) === lik && Number(r.severity) === sev);
        html += '<div class="eqms-risk-cell ' + cls + (isPos ? ' current-pos' : '') + '">';
        if (isPos) html += '<span class="eqms-risk-marker">\u25CF</span>';
        html += '</div>';
      }
    }
    html += '</div>';

    // Assessment history
    var history = r.assessment_history || [];
    if (history.length) {
      html += ui.renderSection({ vi: 'Lich su danh gia', en: 'Assessment History' },
        ui.renderDataGrid(
          [
            { key: 'date',       label: { vi: 'Ngay', en: 'Date' },           type: 'date' },
            { key: 'assessor',   label: { vi: 'Nguoi danh gia', en: 'Assessor' } },
            { key: 'likelihood', label: { vi: 'Kha nang', en: 'L' },          type: 'number' },
            { key: 'severity',   label: { vi: 'Muc do', en: 'S' },            type: 'number' },
            { key: 'score',      label: { vi: 'Diem', en: 'Score' },          render: function(v) { return riskScoreHtml(v); } },
            { key: 'notes',      label: { vi: 'Ghi chu', en: 'Notes' },       type: 'truncate' }
          ],
          history, { selectable: false }
        )
      );
    }
    return html;
  }

  // ── Detail Tab: Controls ──
  function renderRiskControls(r) {
    var controls = r.controls || [];
    var html = '';

    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="add-control">' + T({ vi: '+ Them kiem soat', en: '+ Add Control' }) + '</button>';
    html += '</div>';

    var cols = [
      { key: 'control_id',        label: { vi: 'Ma KS', en: 'Control ID' },           type: 'id' },
      { key: 'description',       label: { vi: 'Mo ta', en: 'Description' },           type: 'truncate' },
      { key: 'type',              label: { vi: 'Loai', en: 'Type' },                   type: 'badge' },
      { key: 'status',            label: { vi: 'Trang thai', en: 'Status' },           type: 'badge' },
      { key: 'owner',             label: { vi: 'Nguoi phu trach', en: 'Owner' } },
      { key: 'verification_date', label: { vi: 'Ngay xac minh', en: 'Verification Date' }, type: 'date' }
    ];
    html += ui.renderDataGrid(cols, controls, { selectable: false });
    return html;
  }

  // ── Detail Tab: Residual Risk ──
  function renderResidualRisk(r) {
    var res = r.residual || {};
    return ui.renderFieldGrid([
      { label: { vi: 'Kha nang con lai', en: 'Post-Control Likelihood' },   value: res.likelihood },
      { label: { vi: 'Muc do con lai', en: 'Post-Control Severity' },       value: res.severity },
      { label: { vi: 'Diem rui ro con lai', en: 'Residual Risk Score' },    value: res.risk_score, badge: true },
      { label: { vi: 'Quyet dinh chap nhan', en: 'Acceptance Decision' },   value: res.acceptance_decision, badge: true },
      { label: { vi: 'Nguoi chap nhan', en: 'Acceptor' },                   value: res.acceptor },
      { label: { vi: 'Ngay chap nhan', en: 'Acceptance Date' },             value: fmtDate(res.acceptance_date) }
    ]);
  }

  // ── Detail Tab: Review History ──
  function renderReviewHistory(r) {
    var reviews = r.reviews || [];
    if (!reviews.length) return ui.renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Chua co xem xet', en: 'No reviews yet' } });

    return ui.renderDataGrid([
      { key: 'date',       label: { vi: 'Ngay', en: 'Date' },              type: 'date' },
      { key: 'reviewer',   label: { vi: 'Nguoi xem xet', en: 'Reviewer' } },
      { key: 'outcome',    label: { vi: 'Ket qua', en: 'Outcome' },        type: 'badge' },
      { key: 'likelihood', label: { vi: 'L', en: 'L' },                    type: 'number' },
      { key: 'severity',   label: { vi: 'S', en: 'S' },                    type: 'number' },
      { key: 'score',      label: { vi: 'Diem', en: 'Score' },             render: function(v) { return riskScoreHtml(v); } },
      { key: 'notes',      label: { vi: 'Ghi chu', en: 'Notes' },          type: 'truncate' },
      { key: 'next_review', label: { vi: 'Xem xet tiep', en: 'Next Review' }, type: 'date' }
    ], reviews, { selectable: false });
  }

  // ── Detail Tab: Audit Trail + Signatures + Attachments + Comments ──
  function renderRiskAuditTab(r) {
    var html = '';
    html += ui.renderSection({ vi: 'Nhat ky kiem toan', en: 'Audit Trail' }, ui.renderAuditTrail(state.auditEvents));
    html += ui.renderSection({ vi: 'Chu ky', en: 'Signatures' }, ui.renderSignaturePanel(state.signatures, [
      { vi: 'Nguoi xac dinh', en: 'Identified By' },
      { vi: 'Nguoi danh gia', en: 'Assessed By' },
      { vi: 'Nguoi phe duyet', en: 'Approved By' }
    ]));
    html += ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' }, ui.renderAttachmentsGrid(r.attachments || []));
    html += ui.renderSection({ vi: 'Binh luan', en: 'Comments' }, ui.renderCommentsThread(r.comments || []));
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 3: RISK HEATMAP
  // ═══════════════════════════════════════════════════════════════════════
  function renderHeatmap() {
    var html = '';
    var hm = state.heatmapData || {};
    var cells = hm.cells || {};

    html += '<div class="eqms-heatmap-container">';
    html += '<div class="eqms-heatmap-title">' + T({ vi: 'Ma tran rui ro 5x5', en: '5x5 Risk Matrix' }) + '</div>';

    // Y-axis label
    html += '<div class="eqms-heatmap-grid">';
    html += '<div class="eqms-heatmap-ylabel">' + T({ vi: 'Muc do', en: 'Severity' }) + '</div>';

    html += '<div class="eqms-heatmap-matrix">';
    // Header row for likelihood labels
    html += '<div class="eqms-heatmap-row header-row">';
    html += '<div class="eqms-heatmap-label-cell"></div>';
    for (var l = 1; l <= 5; l++) {
      html += '<div class="eqms-heatmap-header-cell">' + l + '<br><small>' + esc(T(LIKELIHOOD_LABELS[l - 1])) + '</small></div>';
    }
    html += '</div>';

    // Matrix rows (severity 5 at top)
    for (var s = 5; s >= 1; s--) {
      html += '<div class="eqms-heatmap-row">';
      html += '<div class="eqms-heatmap-label-cell">' + s + '<br><small>' + esc(T(SEVERITY_LABELS[s - 1])) + '</small></div>';
      for (var ll = 1; ll <= 5; ll++) {
        var score = ll * s;
        var colorCls = riskScoreColor(score);
        var key = ll + '_' + s;
        var count = (cells[key] && cells[key].count) || 0;
        html += '<div class="eqms-heatmap-cell ' + colorCls + '" data-action="heatmap-cell" data-l="' + ll + '" data-s="' + s + '">';
        html += '<span class="eqms-heatmap-score">' + score + '</span>';
        if (count > 0) {
          html += '<span class="eqms-heatmap-count">' + count + '</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>'; // matrix

    // X-axis label
    html += '<div class="eqms-heatmap-xlabel">' + T({ vi: 'Kha nang xay ra', en: 'Likelihood' }) + '</div>';
    html += '</div>'; // grid

    // Cell detail panel
    if (hm.selectedCell) {
      var sc = hm.selectedCell;
      html += '<div class="eqms-heatmap-detail">';
      html += '<div class="eqms-section-header"><span>' + T({ vi: 'Rui ro tai L=', en: 'Risks at L=' }) + sc.l + ', S=' + sc.s + '</span></div>';
      var cellRisks = sc.risks || [];
      if (cellRisks.length) {
        html += ui.renderDataGrid([
          { key: 'risk_id', label: { vi: 'Ma', en: 'ID' },        type: 'id' },
          { key: 'title',   label: { vi: 'Tieu de', en: 'Title' }, type: 'truncate' },
          { key: 'owner',   label: { vi: 'Chu', en: 'Owner' } },
          { key: 'status',  label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' }
        ], cellRisks, { selectable: false });
      } else {
        html += ui.renderEmptyState({ icon: '\u2705', title: { vi: 'Khong co rui ro', en: 'No risks in this cell' } });
      }
      html += '</div>';
    }

    html += '</div>';

    // Legend
    html += '<div class="eqms-heatmap-legend">';
    html += '<span class="eqms-heatmap-legend-item"><span class="eqms-risk-dot risk-green"></span> 1-6 ' + T({ vi: 'Thap', en: 'Low' }) + '</span>';
    html += '<span class="eqms-heatmap-legend-item"><span class="eqms-risk-dot risk-yellow"></span> 7-12 ' + T({ vi: 'Trung binh', en: 'Medium' }) + '</span>';
    html += '<span class="eqms-heatmap-legend-item"><span class="eqms-risk-dot risk-orange"></span> 13-19 ' + T({ vi: 'Cao', en: 'High' }) + '</span>';
    html += '<span class="eqms-heatmap-legend-item"><span class="eqms-risk-dot risk-red"></span> 20-25 ' + T({ vi: 'Nghiem trong', en: 'Critical' }) + '</span>';
    html += '</div>';

    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 4: FMEA LIST
  // ═══════════════════════════════════════════════════════════════════════
  function renderFmeaList() {
    var html = '';

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="create-fmea">' + T({ vi: '+ Tao FMEA', en: '+ New FMEA' }) + '</button>';
    html += ui.renderExportMenu({ formats: ['pdf', 'excel'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.fmeaFilters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tim kiem...', en: 'Search...' }, width: '200px' },
        { key: 'fmea_type', type: 'select', label: { vi: 'Loai', en: 'Type' }, options: FMEA_TYPES },
        { key: 'status', type: 'select', label: { vi: 'Trang thai', en: 'Status' }, options: [
          { value: 'draft', label: { vi: 'Nhap', en: 'Draft' } },
          { value: 'in_progress', label: { vi: 'Dang thuc hien', en: 'In Progress' } },
          { value: 'review', label: { vi: 'Xem xet', en: 'Review' } },
          { value: 'approved', label: { vi: 'Phe duyet', en: 'Approved' } },
          { value: 'closed', label: { vi: 'Dong', en: 'Closed' } }
        ]},
        { key: 'part_process', type: 'text', label: { vi: 'Bo phan/Quy trinh', en: 'Part/Process' }, width: '150px' }
      ]
    });

    // Grid
    var columns = [
      { key: 'fmea_id',       label: { vi: 'Ma FMEA', en: 'FMEA ID' },     type: 'id',       sortable: true },
      { key: 'title',         label: { vi: 'Tieu de', en: 'Title' },        type: 'truncate', sortable: true },
      { key: 'fmea_type',     label: { vi: 'Loai', en: 'Type' },            type: 'badge',    sortable: true },
      { key: 'status',        label: { vi: 'Trang thai', en: 'Status' },    type: 'badge',    sortable: true },
      { key: 'part_process',  label: { vi: 'Bo phan/QT', en: 'Part/Process' }, sortable: true },
      { key: 'team_lead',     label: { vi: 'Truong nhom', en: 'Team Lead' }, sortable: true },
      { key: 'ap_high_count', label: { vi: 'AP Cao', en: 'AP High' },       type: 'number',   sortable: true,
        render: function(v) { return v > 0 ? '<span class="eqms-badge ap-high">' + esc(v) + '</span>' : esc(v || 0); } },
      { key: 'ap_medium_count', label: { vi: 'AP TB', en: 'AP Medium' },    type: 'number',   sortable: true,
        render: function(v) { return v > 0 ? '<span class="eqms-badge ap-medium">' + esc(v) + '</span>' : esc(v || 0); } },
      { key: 'created_at',    label: { vi: 'Ngay tao', en: 'Created' },     type: 'date',     sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.fmeaData, {
      selectable: true,
      sortKey: state.fmeaSortKey,
      sortDir: state.fmeaSortDir
    });

    html += ui.renderPagination({ total: state.fmeaTotal, offset: (state.fmeaPage - 1) * state.limit, limit: state.limit });
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 5: FMEA DETAIL
  // ═══════════════════════════════════════════════════════════════════════
  function renderFmeaDetail() {
    var f = state.fmeaRecord;
    if (!f) return ui.renderEmptyState({ icon: '\u26A0\uFE0F', title: { vi: 'Khong tim thay FMEA', en: 'FMEA not found' } });

    var html = '';

    // Back button
    html += '<div style="margin-bottom:12px"><button class="eqms-btn ghost sm" data-action="back-to-fmea">\u2190 ' + T({ vi: 'Quay lai', en: 'Back' }) + '</button></div>';

    // Identity header
    html += ui.renderIdentityHeader(f, {
      actions: [
        { action: 'edit-fmea', label: { vi: 'Chinh sua', en: 'Edit' }, style: 'secondary' }
      ]
    });

    // Tabs
    var fmeaTabs = [
      { id: 'summary',      label: { vi: 'Tong quan', en: 'Summary' } },
      { id: 'worksheet',    label: { vi: 'Failure Mode', en: 'Failure Mode Worksheet' }, badge: f.failure_modes ? f.failure_modes.length : 0 },
      { id: 'actions',      label: { vi: 'Theo doi', en: 'Action Tracker' } },
      { id: 'control-plan', label: { vi: 'Ke hoach KS', en: 'Control Plan' } },
      { id: 'audit',        label: { vi: 'Nhat ky', en: 'Audit Trail' } }
    ];
    html += ui.renderTabs(fmeaTabs, state.fmeaDetailTab);

    html += '<div class="eqms-tab-content">';
    switch (state.fmeaDetailTab) {
      case 'summary':      html += renderFmeaSummary(f); break;
      case 'worksheet':    html += renderFmeaWorksheet(f); break;
      case 'actions':      html += renderFmeaActions(f); break;
      case 'control-plan': html += renderFmeaControlPlan(f); break;
      case 'audit':        html += renderFmeaAuditTab(f); break;
    }
    html += '</div>';
    return html;
  }

  // ── FMEA Tab: Summary ──
  function renderFmeaSummary(f) {
    return ui.renderFieldGrid([
      { label: { vi: 'Ma FMEA', en: 'FMEA ID' },               value: f.fmea_id, mono: true },
      { label: { vi: 'Tieu de', en: 'Title' },                  value: f.title },
      { label: { vi: 'Loai FMEA', en: 'FMEA Type' },           value: f.fmea_type, badge: true },
      { label: { vi: 'Chuc nang/San pham', en: 'Item/Function' }, value: f.item_function },
      { label: { vi: 'Truong nhom', en: 'Team Lead' },          value: f.team_lead },
      { label: { vi: 'Thanh vien nhom', en: 'Team Members' },   value: Array.isArray(f.team_members) ? f.team_members.join(', ') : f.team_members },
      { label: { vi: 'Pham vi', en: 'Scope' },                  value: f.scope },
      { label: { vi: 'Phien ban', en: 'Revision' },             value: f.revision },
      { label: { vi: 'Trang thai', en: 'Status' },              value: f.status, badge: true }
    ]);
  }

  // ── FMEA Tab: Failure Mode Worksheet ──
  function renderFmeaWorksheet(f) {
    var modes = f.failure_modes || [];
    var html = '';

    html += '<div class="eqms-toolbar">';
    html += '<button class="eqms-btn primary sm" data-action="add-failure-mode">' + T({ vi: '+ Them Failure Mode', en: '+ Add Failure Mode' }) + '</button>';
    html += '</div>';

    html += '<div class="eqms-grid-wrapper" style="overflow-x:auto">';
    html += '<table class="eqms-grid eqms-fmea-table">';
    html += '<thead><tr>';
    var headers = [
      { vi: 'Chuc nang', en: 'Item/Function' },
      { vi: 'Che do loi', en: 'Failure Mode' },
      { vi: 'Anh huong', en: 'Effect' },
      { vi: 'S', en: 'S' },
      { vi: 'Nguyen nhan', en: 'Cause' },
      { vi: 'KS Phong ngua', en: 'Prevention' },
      { vi: 'O', en: 'O' },
      { vi: 'KS Phat hien', en: 'Detection' },
      { vi: 'D', en: 'D' },
      { vi: 'AP', en: 'AP' },
      { vi: 'Hanh dong', en: 'Actions' },
      { vi: 'Phu trach', en: 'Resp.' },
      { vi: 'Muc tieu', en: 'Target' },
      { vi: 'Da lam', en: 'Taken' },
      { vi: 'S2', en: 'New S' },
      { vi: 'O2', en: 'New O' },
      { vi: 'D2', en: 'New D' },
      { vi: 'AP2', en: 'New AP' }
    ];
    headers.forEach(function(h) {
      html += '<th>' + esc(T(h)) + '</th>';
    });
    html += '</tr></thead><tbody>';

    if (!modes.length) {
      html += '<tr><td colspan="18">';
      html += ui.renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Chua co failure mode', en: 'No failure modes' } });
      html += '</td></tr>';
    } else {
      modes.forEach(function(m) {
        var ap = calcAP(m.severity, m.occurrence, m.detection);
        var newAp = (m.new_severity || m.new_occurrence || m.new_detection) ? calcAP(m.new_severity, m.new_occurrence, m.new_detection) : '';
        var rowClass = ap === 'H' ? 'ap-row-high' : (ap === 'M' ? 'ap-row-medium' : '');
        html += '<tr class="' + rowClass + '" data-id="' + esc(m.id || '') + '">';
        html += '<td>' + esc(m.item_function || '') + '</td>';
        html += '<td>' + esc(m.failure_mode || '') + '</td>';
        html += '<td>' + esc(m.potential_effect || '') + '</td>';
        html += '<td class="center">' + esc(m.severity || '') + '</td>';
        html += '<td>' + esc(m.potential_cause || '') + '</td>';
        html += '<td>' + esc(m.prevention_controls || '') + '</td>';
        html += '<td class="center">' + esc(m.occurrence || '') + '</td>';
        html += '<td>' + esc(m.detection_controls || '') + '</td>';
        html += '<td class="center">' + esc(m.detection || '') + '</td>';
        html += '<td class="center">' + apBadge(ap) + '</td>';
        html += '<td>' + esc(m.recommended_actions || '') + '</td>';
        html += '<td>' + esc(m.responsibility || '') + '</td>';
        html += '<td>' + esc(fmtDate(m.target_date)) + '</td>';
        html += '<td>' + esc(m.actions_taken || '') + '</td>';
        html += '<td class="center">' + esc(m.new_severity || '') + '</td>';
        html += '<td class="center">' + esc(m.new_occurrence || '') + '</td>';
        html += '<td class="center">' + esc(m.new_detection || '') + '</td>';
        html += '<td class="center">' + (newAp ? apBadge(newAp) : '—') + '</td>';
        html += '</tr>';
      });
    }
    html += '</tbody></table></div>';
    return html;
  }

  // ── FMEA Tab: Action Tracker ──
  function renderFmeaActions(f) {
    var actions = f.recommended_actions || [];
    if (!actions.length) return ui.renderEmptyState({ icon: '\u{1F4CB}', title: { vi: 'Chua co hanh dong', en: 'No recommended actions' } });

    return ui.renderDataGrid([
      { key: 'action_id',    label: { vi: 'Ma', en: 'ID' },                    type: 'id' },
      { key: 'description',  label: { vi: 'Mo ta', en: 'Description' },        type: 'truncate' },
      { key: 'responsibility', label: { vi: 'Phu trach', en: 'Responsibility' } },
      { key: 'target_date',  label: { vi: 'Muc tieu', en: 'Target' },          type: 'date' },
      { key: 'status',       label: { vi: 'Trang thai', en: 'Status' },        type: 'badge' },
      { key: 'completion',   label: { vi: 'Hoan thanh', en: 'Completion' },     render: function(v) { return '<div class="eqms-progress"><div class="eqms-progress-bar" style="width:' + (v || 0) + '%"></div><span>' + (v || 0) + '%</span></div>'; } },
      { key: 'before_rpn',   label: { vi: 'RPN truoc', en: 'Before RPN' },     type: 'number' },
      { key: 'after_rpn',    label: { vi: 'RPN sau', en: 'After RPN' },        type: 'number',
        render: function(v, row) {
          if (v == null) return '—';
          var reduction = row.before_rpn ? Math.round((1 - v / row.before_rpn) * 100) : 0;
          var arrow = reduction > 0 ? '\u2193' : '';
          return esc(v) + (reduction > 0 ? ' <span style="color:var(--hm-success,#22c55e)">' + arrow + reduction + '%</span>' : '');
        }
      }
    ], actions, { selectable: false });
  }

  // ── FMEA Tab: Control Plan Linkage ──
  function renderFmeaControlPlan(f) {
    var links = f.control_plan_links || [];
    if (!links.length) {
      return ui.renderEmptyState({
        icon: '\u{1F517}',
        title: { vi: 'Chua lien ket ke hoach kiem soat', en: 'No linked control plan characteristics' },
        action: { key: 'link-control-plan', label: { vi: 'Lien ket', en: 'Link' } }
      });
    }
    return ui.renderDataGrid([
      { key: 'characteristic_id', label: { vi: 'Ma dac tinh', en: 'Char. ID' },          type: 'id' },
      { key: 'characteristic',    label: { vi: 'Dac tinh', en: 'Characteristic' },        type: 'truncate' },
      { key: 'control_method',    label: { vi: 'Phuong phap KS', en: 'Control Method' } },
      { key: 'sample_size',       label: { vi: 'Co mau', en: 'Sample Size' } },
      { key: 'frequency',         label: { vi: 'Tan suat', en: 'Frequency' } },
      { key: 'reaction_plan',     label: { vi: 'Ke hoach xu ly', en: 'Reaction Plan' },   type: 'truncate' }
    ], links, { selectable: false });
  }

  // ── FMEA Tab: Audit Trail ──
  function renderFmeaAuditTab(f) {
    var html = '';
    html += ui.renderSection({ vi: 'Nhat ky kiem toan', en: 'Audit Trail' }, ui.renderAuditTrail(f.audit_events || []));
    html += ui.renderSection({ vi: 'Chu ky', en: 'Signatures' }, ui.renderSignaturePanel(f.signatures || [], [
      { vi: 'Truong nhom', en: 'Team Lead' },
      { vi: 'Ky thuat', en: 'Engineering' },
      { vi: 'Chat luong', en: 'Quality' }
    ]));
    html += ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' }, ui.renderAttachmentsGrid(f.attachments || []));
    html += ui.renderSection({ vi: 'Binh luan', en: 'Comments' }, ui.renderCommentsThread(f.comments || []));
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCREEN 6: ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════
  function renderAnalytics() {
    var html = '';
    var m = state.metrics || {};

    // KPI cards
    html += ui.renderKpiRow([
      { label: { vi: 'Tong rui ro', en: 'Total Risks' },           value: fmt(m.total_risks),         accent: '' },
      { label: { vi: 'Rui ro cao/Nghiem trong', en: 'High/Critical' }, value: fmt(m.high_risks),      accent: 'danger' },
      { label: { vi: 'Trung binh giam RPN', en: 'Avg RPN Reduction' }, value: m.avg_rpn_reduction ? m.avg_rpn_reduction + '%' : '—', accent: 'success' },
      { label: { vi: 'FMEA hoan thanh', en: 'FMEAs Completed' },   value: fmt(m.fmea_completed),     accent: 'info' }
    ]);

    // RPN Trend chart
    html += ui.renderSection({ vi: 'Xu huong RPN (truoc/sau)', en: 'RPN Trend (Before/After)' },
      ui.renderChartWithTableFallback('chart-rpn-trend', null,
        [
          { key: 'period', label: { vi: 'Thoi gian', en: 'Period' } },
          { key: 'before_avg', label: { vi: 'RPN truoc', en: 'Before' }, type: 'number' },
          { key: 'after_avg', label: { vi: 'RPN sau', en: 'After' }, type: 'number' },
          { key: 'reduction_pct', label: { vi: 'Giam %', en: 'Reduction %' }, type: 'number' }
        ],
        m.rpn_trend || []
      )
    );

    // AP Distribution
    html += ui.renderSection({ vi: 'Phan bo AP', en: 'AP Distribution' },
      renderApDistribution(m.ap_distribution || {})
    );

    // Risk reduction effectiveness
    html += ui.renderSection({ vi: 'Hieu qua giam rui ro', en: 'Risk Reduction Effectiveness' },
      ui.renderChartWithTableFallback('chart-risk-effectiveness', null,
        [
          { key: 'category', label: { vi: 'Danh muc', en: 'Category' } },
          { key: 'initial_avg', label: { vi: 'Ban dau TB', en: 'Initial Avg' }, type: 'number' },
          { key: 'current_avg', label: { vi: 'Hien tai TB', en: 'Current Avg' }, type: 'number' },
          { key: 'reduction', label: { vi: 'Giam', en: 'Reduction' }, type: 'number' }
        ],
        m.risk_effectiveness || []
      )
    );

    // Top 10 risks by score
    html += ui.renderSection({ vi: 'Top 10 rui ro', en: 'Top 10 Risks by Score' },
      ui.renderDataGrid([
        { key: 'risk_id',    label: { vi: 'Ma', en: 'ID' },             type: 'id' },
        { key: 'title',      label: { vi: 'Tieu de', en: 'Title' },     type: 'truncate' },
        { key: 'category',   label: { vi: 'Danh muc', en: 'Category' }, type: 'badge' },
        { key: 'risk_score', label: { vi: 'Diem', en: 'Score' },        render: function(v) { return riskScoreHtml(v); } },
        { key: 'owner',      label: { vi: 'Chu', en: 'Owner' } },
        { key: 'status',     label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' }
      ], m.top_risks || [], { selectable: false })
    );

    // Heatmap evolution
    html += ui.renderSection({ vi: 'Tien trien ban do nhiet', en: 'Heatmap Evolution' },
      ui.renderChartWithTableFallback('chart-heatmap-evolution', null,
        [
          { key: 'period', label: { vi: 'Thoi gian', en: 'Period' } },
          { key: 'green', label: { vi: 'Thap', en: 'Low' }, type: 'number' },
          { key: 'yellow', label: { vi: 'TB', en: 'Medium' }, type: 'number' },
          { key: 'orange', label: { vi: 'Cao', en: 'High' }, type: 'number' },
          { key: 'red', label: { vi: 'Nghiem trong', en: 'Critical' }, type: 'number' }
        ],
        m.heatmap_evolution || []
      )
    );

    return html;
  }

  function renderApDistribution(dist) {
    var high = dist.high || 0;
    var medium = dist.medium || 0;
    var low = dist.low || 0;
    var total = high + medium + low || 1;

    var html = '<div class="eqms-ap-donut">';
    html += '<div class="eqms-ap-bars">';
    html += '<div class="eqms-ap-bar-row"><span class="eqms-badge ap-high">H</span><div class="eqms-progress"><div class="eqms-progress-bar danger" style="width:' + Math.round(high / total * 100) + '%"></div></div><span>' + high + ' (' + Math.round(high / total * 100) + '%)</span></div>';
    html += '<div class="eqms-ap-bar-row"><span class="eqms-badge ap-medium">M</span><div class="eqms-progress"><div class="eqms-progress-bar warning" style="width:' + Math.round(medium / total * 100) + '%"></div></div><span>' + medium + ' (' + Math.round(medium / total * 100) + '%)</span></div>';
    html += '<div class="eqms-ap-bar-row"><span class="eqms-badge ap-low">L</span><div class="eqms-progress"><div class="eqms-progress-bar success" style="width:' + Math.round(low / total * 100) + '%"></div></div><span>' + low + ' (' + Math.round(low / total * 100) + '%)</span></div>';
    html += '</div></div>';
    return html;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE FORMS
  // ═══════════════════════════════════════════════════════════════════════
  function renderCreateRiskForm() {
    var steps = [
      { label: { vi: 'Thong tin', en: 'Information' } },
      { label: { vi: 'Danh gia', en: 'Assessment' } },
      { label: { vi: 'Xem xet', en: 'Review' } }
    ];
    var body = '';
    body += ui.renderFormField({ key: 'title', label: { vi: 'Tieu de', en: 'Title' }, required: true });
    body += ui.renderFormField({ key: 'category', label: { vi: 'Danh muc', en: 'Category' }, type: 'select', options: RISK_CATEGORIES, required: true });
    body += ui.renderFormField({ key: 'description', label: { vi: 'Mo ta', en: 'Description' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'owner', label: { vi: 'Chu so huu', en: 'Owner' }, required: true });
    body += ui.renderFormField({ key: 'likelihood', label: { vi: 'Kha nang (1-5)', en: 'Likelihood (1-5)' }, type: 'number', min: 1, max: 5 });
    body += ui.renderFormField({ key: 'severity', label: { vi: 'Muc do (1-5)', en: 'Severity (1-5)' }, type: 'number', min: 1, max: 5 });
    body += ui.renderFormField({ key: 'review_date', label: { vi: 'Ngay xem xet', en: 'Review Date' }, type: 'date' });
    return ui.renderWizardShell(steps, 0, body, { saveDraft: true });
  }

  function renderCreateFmeaForm() {
    var body = '';
    body += ui.renderFormField({ key: 'title', label: { vi: 'Tieu de', en: 'Title' }, required: true });
    body += ui.renderFormField({ key: 'fmea_type', label: { vi: 'Loai FMEA', en: 'FMEA Type' }, type: 'select', options: FMEA_TYPES, required: true });
    body += ui.renderFormField({ key: 'item_function', label: { vi: 'Chuc nang/San pham', en: 'Item/Function' }, required: true });
    body += ui.renderFormField({ key: 'team_lead', label: { vi: 'Truong nhom', en: 'Team Lead' }, required: true });
    body += ui.renderFormField({ key: 'team_members', label: { vi: 'Thanh vien', en: 'Team Members' }, placeholder: { vi: 'Cach nhau dau phay', en: 'Comma separated' } });
    body += ui.renderFormField({ key: 'scope', label: { vi: 'Pham vi', en: 'Scope' }, type: 'textarea' });
    return ui.renderWizardShell([
      { label: { vi: 'Thong tin', en: 'Information' } },
      { label: { vi: 'Xem xet', en: 'Review' } }
    ], 0, body, { saveDraft: true });
  }

  function renderAddControlForm() {
    var body = '';
    body += ui.renderFormField({ key: 'description', label: { vi: 'Mo ta kiem soat', en: 'Control Description' }, type: 'textarea', required: true });
    body += ui.renderFormField({ key: 'type', label: { vi: 'Loai', en: 'Type' }, type: 'select', options: CONTROL_TYPES, required: true });
    body += ui.renderFormField({ key: 'owner', label: { vi: 'Nguoi phu trach', en: 'Owner' }, required: true });
    body += ui.renderFormField({ key: 'verification_date', label: { vi: 'Ngay xac minh du kien', en: 'Planned Verification Date' }, type: 'date' });
    return '<div class="eqms-modal-body">' + body + '</div>' +
      '<div class="eqms-modal-footer">' +
      '<button class="eqms-btn secondary" data-action="cancel-modal">' + T({ vi: 'Huy', en: 'Cancel' }) + '</button>' +
      '<button class="eqms-btn primary" data-action="submit-control">' + T({ vi: 'Them', en: 'Add' }) + '</button>' +
      '</div>';
  }

  function renderAddFailureModeForm() {
    var body = '';
    body += ui.renderFormField({ key: 'item_function', label: { vi: 'Chuc nang', en: 'Item/Function' }, required: true });
    body += ui.renderFormField({ key: 'failure_mode', label: { vi: 'Che do loi', en: 'Failure Mode' }, required: true });
    body += ui.renderFormField({ key: 'potential_effect', label: { vi: 'Anh huong tiem an', en: 'Potential Effect' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'severity', label: { vi: 'Muc do S (1-10)', en: 'Severity S (1-10)' }, type: 'number', min: 1, max: 10, required: true });
    body += ui.renderFormField({ key: 'potential_cause', label: { vi: 'Nguyen nhan', en: 'Potential Cause' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'prevention_controls', label: { vi: 'KS Phong ngua', en: 'Prevention Controls' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'occurrence', label: { vi: 'Xuat hien O (1-10)', en: 'Occurrence O (1-10)' }, type: 'number', min: 1, max: 10, required: true });
    body += ui.renderFormField({ key: 'detection_controls', label: { vi: 'KS Phat hien', en: 'Detection Controls' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'detection', label: { vi: 'Phat hien D (1-10)', en: 'Detection D (1-10)' }, type: 'number', min: 1, max: 10, required: true });
    body += ui.renderFormField({ key: 'recommended_actions', label: { vi: 'Hanh dong de nghi', en: 'Recommended Actions' }, type: 'textarea' });
    body += ui.renderFormField({ key: 'responsibility', label: { vi: 'Phu trach', en: 'Responsibility' } });
    body += ui.renderFormField({ key: 'target_date', label: { vi: 'Ngay muc tieu', en: 'Target Date' }, type: 'date' });
    return '<div class="eqms-modal-body">' + body + '</div>' +
      '<div class="eqms-modal-footer">' +
      '<button class="eqms-btn secondary" data-action="cancel-modal">' + T({ vi: 'Huy', en: 'Cancel' }) + '</button>' +
      '<button class="eqms-btn primary" data-action="submit-failure-mode">' + T({ vi: 'Them', en: 'Add' }) + '</button>' +
      '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════════════
  function bindEvents(el) {
    el.addEventListener('click', function(e) {
      // Tab switching (screen-level)
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        var tabId = tab.getAttribute('data-tab');
        // Screen tabs
        var screenIds = SCREEN_TABS.map(function(t) { return t.id; });
        if (screenIds.indexOf(tabId) >= 0) {
          state.screen = tabId;
          if (tabId === 'risk-register') { loadRisks(); loadMetrics(); }
          else if (tabId === 'heatmap') { loadHeatmap(); }
          else if (tabId === 'fmea-list') { loadFmeas(); }
          else if (tabId === 'analytics') { loadMetrics(); renderRoot(); }
          return;
        }
        // Detail tabs
        if (state.screen === 'risk-detail') { state.detailTab = tabId; renderRoot(); return; }
        if (state.screen === 'fmea-detail') { state.fmeaDetailTab = tabId; renderRoot(); return; }
      }

      // Row click -> detail
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input') && !e.target.closest('button')) {
        var id = row.getAttribute('data-id');
        if (state.screen === 'risk-register') { loadRiskDetail(id); return; }
        if (state.screen === 'fmea-list') { loadFmeaDetail(id); return; }
      }

      // Actions
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'back-to-list':
          state.screen = 'risk-register'; state.record = null; loadRisks(); break;
        case 'back-to-fmea':
          state.screen = 'fmea-list'; state.fmeaRecord = null; loadFmeas(); break;
        case 'create-risk':
          showModal({ vi: 'Tao rui ro moi', en: 'Create New Risk' }, renderCreateRiskForm()); break;
        case 'create-fmea':
          showModal({ vi: 'Tao FMEA moi', en: 'Create New FMEA' }, renderCreateFmeaForm()); break;
        case 'add-control':
          showModal({ vi: 'Them kiem soat', en: 'Add Control' }, renderAddControlForm()); break;
        case 'add-failure-mode':
          showModal({ vi: 'Them Failure Mode', en: 'Add Failure Mode' }, renderAddFailureModeForm()); break;

        case 'wizard-submit':
          handleWizardSubmit(); break;
        case 'submit-control':
          handleSubmitControl(); break;
        case 'submit-failure-mode':
          handleSubmitFailureMode(); break;
        case 'cancel-modal':
          closeModal(); break;

        case 'assess':
        case 'verify-control':
        case 'accept-residual-risk':
        case 'review':
          handleWorkflowAction(action); break;

        case 'apply-filters':
          applyFilters(); break;
        case 'reset-filters':
          resetFilters(); break;

        case 'heatmap-cell':
          handleHeatmapCell(actionEl); break;

        case 'export':
          handleExport(actionEl.getAttribute('data-format')); break;

        case 'page':
          handlePage(actionEl.getAttribute('data-page')); break;

        case 'select-all':
          toggleSelectAll(e.target); break;
      }
    });

    // Sort handling
    el.addEventListener('click', function(e) {
      var th = e.target.closest('th[data-sort]');
      if (!th) return;
      var key = th.getAttribute('data-sort');
      if (state.screen === 'risk-register') {
        if (state.sortKey === key) { state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.sortKey = key; state.sortDir = 'asc'; }
        loadRisks();
      } else if (state.screen === 'fmea-list') {
        if (state.fmeaSortKey === key) { state.fmeaSortDir = state.fmeaSortDir === 'asc' ? 'desc' : 'asc'; }
        else { state.fmeaSortKey = key; state.fmeaSortDir = 'asc'; }
        loadFmeas();
      }
    });
  }

  function applyFilters() {
    if (!container) return;
    container.querySelectorAll('[data-filter]').forEach(function(f) {
      var key = f.getAttribute('data-filter');
      var val = f.value;
      if (state.screen === 'fmea-list') { if (val) state.fmeaFilters[key] = val; else delete state.fmeaFilters[key]; }
      else { if (val) state.filters[key] = val; else delete state.filters[key]; }
    });
    state.page = 1; state.fmeaPage = 1;
    if (state.screen === 'fmea-list') loadFmeas(); else loadRisks();
  }

  function resetFilters() {
    if (state.screen === 'fmea-list') { state.fmeaFilters = {}; state.fmeaPage = 1; loadFmeas(); }
    else { state.filters = {}; state.page = 1; loadRisks(); }
  }

  function handlePage(p) {
    p = parseInt(p, 10);
    if (isNaN(p) || p < 1) return;
    if (state.screen === 'fmea-list') { state.fmeaPage = p; loadFmeas(); }
    else { state.page = p; loadRisks(); }
  }

  function handleHeatmapCell(el) {
    var l = parseInt(el.getAttribute('data-l'), 10);
    var s = parseInt(el.getAttribute('data-s'), 10);
    if (!state.heatmapData) state.heatmapData = {};
    // Fetch risks for this cell
    apiCall('eqms_risks_query', { likelihood: l, severity: s, limit: 50 }, 'GET').then(function(r) {
      state.heatmapData.selectedCell = { l: l, s: s, risks: (r && r.data) || [] };
      renderRoot();
    });
  }

  function handleWizardSubmit() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal) return;
    var data = collectForm(modal);
    var endpoint = state.screen === 'fmea-list' ? 'eqms_fmea_create' : 'eqms_risks_create';
    apiCall(endpoint, data).then(function(r) {
      closeModal();
      toast(T({ vi: 'Da tao thanh cong', en: 'Created successfully' }));
      if (state.screen === 'fmea-list') loadFmeas(); else loadRisks();
    }).catch(function(err) {
      toast(T({ vi: 'Loi: ' + (err.message || ''), en: 'Error: ' + (err.message || '') }));
    });
  }

  function handleSubmitControl() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal || !state.record) return;
    var data = collectForm(modal);
    data.risk_id = state.record.id || state.record.risk_id;
    apiCall('eqms_risks_update', { id: data.risk_id, action: 'add-control', control: data }).then(function() {
      closeModal();
      toast(T({ vi: 'Da them kiem soat', en: 'Control added' }));
      loadRiskDetail(data.risk_id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleSubmitFailureMode() {
    var modal = document.querySelector('.eqms-modal');
    if (!modal || !state.fmeaRecord) return;
    var data = collectForm(modal);
    data.fmea_id = state.fmeaRecord.id || state.fmeaRecord.fmea_id;
    apiCall('eqms_fmea_update', { id: data.fmea_id, action: 'add-failure-mode', failure_mode: data }).then(function() {
      closeModal();
      toast(T({ vi: 'Da them failure mode', en: 'Failure mode added' }));
      loadFmeaDetail(data.fmea_id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleWorkflowAction(action) {
    if (!state.record) return;
    var id = state.record.id || state.record.risk_id;
    apiCall('eqms_risks_update', { id: id, action: action }).then(function() {
      toast(T({ vi: 'Cap nhat thanh cong', en: 'Updated successfully' }));
      loadRiskDetail(id);
    }).catch(function(err) { toast(T({ vi: 'Loi', en: 'Error' }) + ': ' + (err.message || '')); });
  }

  function handleExport(format) {
    var endpoint = state.screen === 'fmea-list' ? 'eqms_fmea_export' : 'eqms_risks_export';
    apiCall(endpoint, { format: format }, 'GET').then(function(r) {
      if (r && r.url) window.open(r.url, '_blank');
      else toast(T({ vi: 'Da yeu cau xuat', en: 'Export requested' }));
    });
  }

  function toggleSelectAll(checkbox) {
    if (!container) return;
    var checked = checkbox.checked;
    container.querySelectorAll('[data-action="select-row"]').forEach(function(cb) { cb.checked = checked; });
  }

  // ─── Modal ───────────────────────────────────────────────────────────
  function showModal(title, bodyHtml) {
    var existing = document.querySelector('.eqms-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'eqms-modal-overlay';
    overlay.innerHTML = '<div class="eqms-modal"><div class="eqms-modal-header"><span>' + esc(T(title)) + '</span><button class="eqms-modal-close" data-action="cancel-modal">\u2715</button></div>' + bodyHtml + '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay || e.target.closest('[data-action="cancel-modal"]')) closeModal();
      if (e.target.closest('[data-action="wizard-submit"]')) handleWizardSubmit();
      if (e.target.closest('[data-action="submit-control"]')) handleSubmitControl();
      if (e.target.closest('[data-action="submit-failure-mode"]')) handleSubmitFailureMode();
    });
  }

  function closeModal() {
    var overlay = document.querySelector('.eqms-modal-overlay');
    if (overlay) overlay.remove();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════
  function render(el, ctx) {
    container = el;
    state.screen = 'risk-register';
    state.filters = {};
    state.fmeaFilters = {};
    state.page = 1;
    state.fmeaPage = 1;

    // If opened with context (e.g., direct link to record)
    if (ctx && ctx.recordId) {
      if (ctx.subModule === 'fmea') { loadFmeaDetail(ctx.recordId); }
      else { loadRiskDetail(ctx.recordId); }
    } else {
      loadRisks();
      loadMetrics();
    }

    bindEvents(el);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REGISTER MODULE
  // ═══════════════════════════════════════════════════════════════════════
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['risks'] = { render: render, meta: MOD };

})();

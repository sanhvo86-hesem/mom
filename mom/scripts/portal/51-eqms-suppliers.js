/**
 * EQMS Supplier Quality Network — Analytical List + Scorecard
 * HESEM MOM Portal · 51-eqms-suppliers.js
 *
 * Authority: Standard 36 — Frontend Module Layout Template Standard
 * Module ID: suppliers
 * Archetype: analytical-list
 * Load order: AFTER 40-eqms-shell.js
 */
(function() {
  'use strict';

  var ui   = window.EqmsShell.ui;
  var util = window.EqmsShell.util;
  var T    = util.T;
  var esc  = util.esc;
  var fmt  = util.fmt;
  var fmtDate    = util.fmtDate;
  var fmtDateTime = util.fmtDateTime;
  var slugify    = util.slugify;
  var apiCall    = util.apiCall;

  // =========================================================================
  // MODULE METADATA
  // =========================================================================
  var MOD = {
    id:        'suppliers',
    label:     { vi: 'Mang luoi nha cung cap', en: 'Supplier Quality Network' },
    icon:      '\uD83C\uDF10',
    group:     'supplier',
    archetype: 'analytical-list'
  };

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  var STATUSES = [
    { value: 'approved',      label: { vi: 'Da duyet', en: 'Approved' } },
    { value: 'conditional',   label: { vi: 'Co dieu kien', en: 'Conditional' } },
    { value: 'suspended',     label: { vi: 'Tam ngung', en: 'Suspended' } },
    { value: 'disqualified',  label: { vi: 'Khong dat', en: 'Disqualified' } },
    { value: 'new',           label: { vi: 'Moi', en: 'New' } }
  ];

  var RISK_LEVELS = [
    { value: 'low',      label: { vi: 'Thap', en: 'Low' } },
    { value: 'medium',   label: { vi: 'Trung binh', en: 'Medium' } },
    { value: 'high',     label: { vi: 'Cao', en: 'High' } },
    { value: 'critical', label: { vi: 'Nghiem trong', en: 'Critical' } }
  ];

  var SCORE_AXES = [
    { key: 'quality',        label: { vi: 'Chat luong', en: 'Quality' } },
    { key: 'delivery',       label: { vi: 'Giao hang', en: 'Delivery' } },
    { key: 'cost',           label: { vi: 'Chi phi', en: 'Cost' } },
    { key: 'responsiveness', label: { vi: 'Phan hoi', en: 'Responsiveness' } },
    { key: 'compliance',     label: { vi: 'Tuan thu', en: 'Compliance' } }
  ];

  var DETAIL_TABS = [
    { id: 'profile',        label: { vi: 'Ho so', en: 'Profile' } },
    { id: 'scorecard',      label: { vi: 'The diem', en: 'Scorecard' } },
    { id: 'qualifications', label: { vi: 'Chung nhan', en: 'Qualifications' } },
    { id: 'agreements',     label: { vi: 'Thoa thuan CL', en: 'Quality Agreements' } },
    { id: 'deviations',     label: { vi: 'Sai lech', en: 'Deviations' } },
    { id: 'scars',          label: { vi: 'SCAR', en: 'SCARs' } },
    { id: 'audits',         label: { vi: 'Danh gia', en: 'Audits' } },
    { id: 'performance',    label: { vi: 'Hieu suat', en: 'Performance History' } },
    { id: 'related',        label: { vi: 'Lien ket', en: 'Related Records' } },
    { id: 'files',          label: { vi: 'Tep & Binh luan', en: 'Files & Comments' } }
  ];

  var QUAL_STATUSES = [
    { value: 'qualified',  label: { vi: 'Dat', en: 'Qualified' } },
    { value: 'pending',    label: { vi: 'Cho xu ly', en: 'Pending' } },
    { value: 'expired',    label: { vi: 'Het han', en: 'Expired' } },
    { value: 'failed',     label: { vi: 'Khong dat', en: 'Failed' } }
  ];

  var AGREEMENT_STATUSES = [
    { value: 'active',  label: { vi: 'Hieu luc', en: 'Active' } },
    { value: 'pending', label: { vi: 'Cho xu ly', en: 'Pending' } },
    { value: 'expired', label: { vi: 'Het han', en: 'Expired' } }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    screen:    'list',    // list | detail | analytics
    filters:   {},
    sort:      { key: 'supplier_id', dir: 'desc' },
    page:      1,
    limit:     25,
    list:      null,
    total:     0,
    metrics:   null,
    detail:    null,
    activeTab: 'profile',
    tabData:   {},
    loading:   false,
    error:     null
  };

  var _container = null;

  // =========================================================================
  // DATA FETCHING
  // =========================================================================
  function loadList() {
    state.loading = true;
    state.error = null;
    paint();
    var params = Object.assign({}, state.filters, {
      offset: (state.page - 1) * state.limit,
      limit:  state.limit,
      sort:   state.sort.key,
      dir:    state.sort.dir
    });
    apiCall('eqms_suppliers_query', params).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message || 'Load failed'; paint(); return; }
      state.list  = res.data || res.items || [];
      state.total = res.total || state.list.length;
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message || 'Network error';
      paint();
    });
  }

  function loadMetrics() {
    apiCall('eqms_suppliers_metrics', {}).then(function(res) {
      state.metrics = res.data || res;
      paint();
    }).catch(function() {});
  }

  function loadDetail(id) {
    state.loading = true;
    state.error = null;
    state.detail = null;
    state.tabData = {};
    state.activeTab = 'profile';
    paint();
    apiCall('eqms_suppliers_detail', { id: id }).then(function(res) {
      state.loading = false;
      if (res.success === false) { state.error = res.message; paint(); return; }
      state.detail = res.data || res;
      window.EqmsShell.navigate('suppliers', { recordId: state.detail.supplier_id || id });
      paint();
    }).catch(function(err) {
      state.loading = false;
      state.error = err.message;
      paint();
    });
  }

  function loadTabData(tab) {
    if (state.tabData[tab]) return;
    if (!state.detail) return;
    var id = state.detail.id || state.detail.supplier_id;
    var actionMap = {
      scorecard:      'eqms_suppliers_scorecards',
      qualifications: 'eqms_suppliers_qualifications',
      agreements:     'eqms_suppliers_quality_agreements',
      deviations:     'eqms_suppliers_relationships',
      scars:          'eqms_suppliers_relationships',
      audits:         'eqms_suppliers_audit',
      performance:    'eqms_suppliers_metrics',
      related:        'eqms_suppliers_relationships',
      files:          'eqms_suppliers_attachments'
    };
    var action = actionMap[tab];
    if (!action) return;
    var params = { id: id, tab: tab };
    apiCall(action, params).then(function(res) {
      state.tabData[tab] = res.data || res.items || res;
      paint();
    }).catch(function() {});
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================
  function executeAction(action, id) {
    apiCall('eqms_suppliers_update', { id: id, action: action }).then(function(res) {
      if (res.success !== false) {
        if (state.screen === 'detail') loadDetail(id);
        else loadList();
      }
    }).catch(function() {});
  }

  function handleExport(format) {
    apiCall('eqms_suppliers_export', { format: format, filters: state.filters });
  }

  // =========================================================================
  // SCORE HELPERS
  // =========================================================================
  function scoreColor(score) {
    if (score == null) return '';
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  }

  function renderScoreBar(score) {
    if (score == null) return '<span class="eqms-field-value empty">\u2014</span>';
    var color = scoreColor(score);
    var cssColor = color === 'green' ? 'var(--hm-success,#22c55e)' : (color === 'yellow' ? 'var(--hm-warning,#eab308)' : 'var(--hm-danger,#ef4444)');
    return '<div style="display:flex;align-items:center;gap:8px">' +
      '<div style="flex:1;max-width:120px;height:6px;border-radius:3px;background:var(--hm-bg-tertiary,#e2e8f0)">' +
      '<div style="width:' + Math.min(100, Math.max(0, score)) + '%;height:100%;border-radius:3px;background:' + cssColor + '"></div>' +
      '</div>' +
      '<span style="font-weight:600;color:' + cssColor + '">' + esc(String(Math.round(score))) + '</span>' +
      '</div>';
  }

  // =========================================================================
  // RADAR CHART (SVG)
  // =========================================================================
  function renderRadarChart(scores, size) {
    size = size || 260;
    var cx = size / 2, cy = size / 2, r = (size / 2) - 40;
    var n = SCORE_AXES.length;
    var angleStep = (2 * Math.PI) / n;
    var startAngle = -Math.PI / 2;

    function polarToXY(angle, radius) {
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    }

    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="font-family:inherit">';

    // Background grid rings
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function(frac) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = polarToXY(startAngle + i * angleStep, r * frac);
        pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
      }
      svg += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--hm-border,#cbd5e1)" stroke-width="0.5" opacity="0.5"/>';
    });

    // Axis lines and labels
    for (var i = 0; i < n; i++) {
      var angle = startAngle + i * angleStep;
      var tip = polarToXY(angle, r);
      var labelPos = polarToXY(angle, r + 24);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + tip.x.toFixed(1) + '" y2="' + tip.y.toFixed(1) + '" stroke="var(--hm-border,#cbd5e1)" stroke-width="0.5"/>';
      svg += '<text x="' + labelPos.x.toFixed(1) + '" y="' + labelPos.y.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="11" fill="var(--hm-text-secondary,#64748b)">' + esc(T(SCORE_AXES[i].label)) + '</text>';
    }

    // Data polygon
    if (scores) {
      var dataPts = [];
      for (var j = 0; j < n; j++) {
        var val = (scores[SCORE_AXES[j].key] || 0) / 100;
        var dp = polarToXY(startAngle + j * angleStep, r * val);
        dataPts.push(dp.x.toFixed(1) + ',' + dp.y.toFixed(1));
      }
      svg += '<polygon points="' + dataPts.join(' ') + '" fill="var(--hm-primary,#3b82f6)" fill-opacity="0.15" stroke="var(--hm-primary,#3b82f6)" stroke-width="2"/>';
      // Data points
      for (var k = 0; k < n; k++) {
        var valK = (scores[SCORE_AXES[k].key] || 0) / 100;
        var pkPos = polarToXY(startAngle + k * angleStep, r * valK);
        svg += '<circle cx="' + pkPos.x.toFixed(1) + '" cy="' + pkPos.y.toFixed(1) + '" r="4" fill="var(--hm-primary,#3b82f6)" stroke="#fff" stroke-width="1.5"/>';
      }
    }

    svg += '</svg>';
    return svg;
  }

  // =========================================================================
  // SCREEN: SUPPLIER LIST
  // =========================================================================
  function renderList() {
    var html = '';

    // KPI row
    var m = state.metrics || {};
    html += ui.renderKpiRow([
      { label: { vi: 'Tong NCC', en: 'Total Suppliers' },        value: fmt(m.total_suppliers || 0) },
      { label: { vi: 'Da duyet', en: 'Approved' },               value: fmt(m.approved || 0),     accent: 'success' },
      { label: { vi: 'Co dieu kien', en: 'Conditional' },        value: fmt(m.conditional || 0),  accent: 'warning' },
      { label: { vi: 'Tam ngung', en: 'Suspended' },             value: fmt(m.suspended || 0),    accent: 'danger' },
      { label: { vi: 'Diem CL TB', en: 'Avg Quality Score' },    value: m.avg_quality_score != null ? Math.round(m.avg_quality_score) : '\u2014', accent: scoreColor(m.avg_quality_score) },
      { label: { vi: 'Rui ro cao', en: 'High Risk' },            value: fmt(m.high_risk || 0),    accent: 'danger' }
    ]);

    // Toolbar
    html += '<div class="eqms-toolbar">';
    html += '<div class="eqms-toolbar-left">';
    html += '<button class="eqms-btn primary sm" data-action="create-supplier">' + T({ vi: '+ NCC moi', en: '+ New Supplier' }) + '</button>';
    html += '<button class="eqms-btn ghost sm ' + (state.screen === 'analytics' ? '' : 'active') + '" data-action="screen-list">' + T({ vi: 'Danh sach', en: 'List' }) + '</button>';
    html += '<button class="eqms-btn ghost sm ' + (state.screen === 'analytics' ? 'active' : '') + '" data-action="screen-analytics">' + T({ vi: 'Phan tich', en: 'Analytics' }) + '</button>';
    html += '</div>';
    html += ui.renderExportMenu({ formats: ['excel', 'csv', 'pdf'] });
    html += '</div>';

    // Filters
    html += ui.renderFilterBar(state.filters, {
      fields: [
        { key: 'search', type: 'text', placeholder: { vi: 'Tim NCC...', en: 'Search suppliers...' }, width: '200px' },
        { key: 'status', type: 'select', label: { vi: 'Trang thai', en: 'Status' }, options: STATUSES },
        { key: 'risk_level', type: 'select', label: { vi: 'Rui ro', en: 'Risk Level' }, options: RISK_LEVELS },
        { key: 'category', type: 'text', placeholder: { vi: 'Danh muc...', en: 'Category...' }, width: '140px' },
        { key: 'score_min', type: 'number', label: { vi: 'Diem tu', en: 'Score from' }, width: '80px' },
        { key: 'score_max', type: 'number', label: { vi: 'Diem den', en: 'Score to' }, width: '80px' }
      ]
    });

    if (state.loading) { html += ui.renderLoadingState({ vi: 'Dang tai danh sach NCC...', en: 'Loading suppliers...' }); return html; }
    if (state.error) { html += (ui.renderRichErrorState || ui.renderErrorState)(state.error, 'retry-list'); return html; }

    // Data grid
    var columns = [
      { key: 'supplier_id', label: { vi: 'Ma NCC', en: 'Supplier ID' }, type: 'id', sortable: true },
      { key: 'name', label: { vi: 'Ten', en: 'Name' }, type: 'truncate', sortable: true },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge', sortable: true },
      { key: 'quality_score', label: { vi: 'Diem CL', en: 'Quality Score' }, sortable: true, render: function(v) { return renderScoreBar(v); } },
      { key: 'risk_level', label: { vi: 'Rui ro', en: 'Risk Level' }, type: 'priority', sortable: true },
      { key: 'category', label: { vi: 'Danh muc', en: 'Category' }, sortable: true },
      { key: 'country', label: { vi: 'Quoc gia', en: 'Country' }, sortable: true },
      { key: 'cert_status', label: { vi: 'Chung chi', en: 'Cert Status' }, type: 'badge' },
      { key: 'last_audit_date', label: { vi: 'Danh gia gan nhat', en: 'Last Audit' }, type: 'date', sortable: true }
    ];

    html += ui.renderDataGrid(columns, state.list || [], {
      selectable: true,
      sortKey: state.sort.key,
      sortDir: state.sort.dir
    });

    html += ui.renderPagination({ total: state.total, offset: (state.page - 1) * state.limit, limit: state.limit });

    return html;
  }

  // =========================================================================
  // SCREEN: SUPPLIER DETAIL
  // =========================================================================
  function renderDetail() {
    var d = state.detail;
    if (!d) return state.loading ? ui.renderLoadingState({ vi: 'Dang tai...', en: 'Loading...' }) : '';
    var html = '';

    // Identity header
    var actions = [];
    if (d.status === 'new' || d.status === 'conditional') {
      actions.push({ action: 'qualify', label: { vi: 'Phe duyet', en: 'Qualify' }, style: 'primary' });
    }
    if (d.status === 'approved' || d.status === 'conditional') {
      actions.push({ action: 'suspend', label: { vi: 'Tam ngung', en: 'Suspend' }, style: 'warning' });
    }
    if (d.status === 'suspended') {
      actions.push({ action: 'reactivate', label: { vi: 'Kich hoat lai', en: 'Reactivate' }, style: 'primary' });
    }
    if (d.status !== 'disqualified') {
      actions.push({ action: 'disqualify', label: { vi: 'Huy tu cach', en: 'Disqualify' }, style: 'danger' });
    }
    actions.push({ action: 'edit-supplier', label: { vi: 'Chinh sua', en: 'Edit' }, style: 'secondary' });

    html += ui.renderIdentityHeader(d, {
      actions: actions,
      extraMeta: [
        { label: { vi: 'Danh muc', en: 'Category' }, value: d.category },
        { label: { vi: 'Quoc gia', en: 'Country' }, value: d.country },
        { label: { vi: 'Rui ro', en: 'Risk Tier' }, value: d.risk_tier }
      ]
    });

    // Tabs
    html += ui.renderTabs(DETAIL_TABS, state.activeTab);

    // Tab content
    html += '<div class="eqms-tab-content">';
    html += renderTabContent(state.activeTab);
    html += '</div>';

    return html;
  }

  function renderTabContent(tab) {
    var d = state.detail;
    if (!d) return '';

    switch (tab) {
      case 'profile':     return renderProfileTab(d);
      case 'scorecard':   return renderScorecardTab(d);
      case 'qualifications': return renderQualificationsTab();
      case 'agreements':  return renderAgreementsTab();
      case 'deviations':  return renderDeviationsTab();
      case 'scars':       return renderScarsTab();
      case 'audits':      return renderAuditsTab();
      case 'performance': return renderPerformanceTab();
      case 'related':     return renderRelatedTab();
      case 'files':       return renderFilesTab();
      default:            return '';
    }
  }

  // --- Profile Tab ---
  function renderProfileTab(d) {
    var html = '';
    html += ui.renderSection({ vi: 'Thong tin co ban', en: 'Basic Information' }, ui.renderFieldGrid([
      { label: { vi: 'Ma NCC', en: 'Supplier ID' },         value: d.supplier_id, mono: true },
      { label: { vi: 'Ten', en: 'Name' },                   value: d.name },
      { label: { vi: 'Dia chi', en: 'Address' },             value: d.address },
      { label: { vi: 'Quoc gia', en: 'Country' },            value: d.country },
      { label: { vi: 'Nguoi lien he', en: 'Contact Name' },  value: d.contact_name },
      { label: { vi: 'Email', en: 'Contact Email' },         value: d.contact_email },
      { label: { vi: 'Dien thoai', en: 'Phone' },            value: d.phone },
      { label: { vi: 'Danh muc', en: 'Category' },           value: d.category },
      { label: { vi: 'Muc rui ro', en: 'Risk Tier' },        value: d.risk_tier, badge: true }
    ]));

    html += ui.renderSection({ vi: 'Chung nhan & Nang luc', en: 'Certifications & Capabilities' }, ui.renderFieldGrid([
      { label: { vi: 'Chung chi', en: 'Certifications' },           value: (d.certifications || []).join(', ') || '\u2014' },
      { label: { vi: 'Nang luc', en: 'Capabilities' },              value: (d.capabilities || []).join(', ') || d.capabilities || '\u2014' },
      { label: { vi: 'Doanh thu hang nam', en: 'Annual Revenue' },  value: d.annual_revenue ? fmt(d.annual_revenue) : '\u2014' },
      { label: { vi: 'So nhan vien', en: 'Employee Count' },        value: d.employee_count ? fmt(d.employee_count) : '\u2014' },
      { label: { vi: 'Phan loai chien luoc', en: 'Strategic Classification' }, value: d.strategic_classification }
    ]));

    return html;
  }

  // --- Scorecard Tab ---
  function renderScorecardTab(d) {
    var sc = state.tabData.scorecard || d.scorecard || {};
    var scores = sc.scores || d.scores || {};
    var html = '';

    // Radar chart + overall score
    html += '<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">';
    html += '<div style="flex:0 0 auto">';
    html += renderRadarChart(scores, 280);
    html += '</div>';
    html += '<div style="flex:1;min-width:200px">';
    html += ui.renderFieldGrid([
      { label: { vi: 'Diem tong hop', en: 'Overall Score' },       value: sc.overall_score != null ? Math.round(sc.overall_score) : (d.quality_score != null ? Math.round(d.quality_score) : '\u2014') },
      { label: { vi: 'Chat luong', en: 'Quality' },                value: scores.quality != null ? Math.round(scores.quality) : '\u2014' },
      { label: { vi: 'Giao hang', en: 'Delivery' },                value: scores.delivery != null ? Math.round(scores.delivery) : '\u2014' },
      { label: { vi: 'Chi phi', en: 'Cost' },                      value: scores.cost != null ? Math.round(scores.cost) : '\u2014' },
      { label: { vi: 'Phan hoi', en: 'Responsiveness' },           value: scores.responsiveness != null ? Math.round(scores.responsiveness) : '\u2014' },
      { label: { vi: 'Tuan thu', en: 'Compliance' },               value: scores.compliance != null ? Math.round(scores.compliance) : '\u2014' }
    ]);
    // Score band legend
    html += '<div style="margin-top:16px;display:flex;gap:16px;font-size:12px">';
    html += '<span style="color:var(--hm-success,#22c55e)">\u25CF 90-100: ' + T({ vi: 'Xuat sac', en: 'Excellent' }) + '</span>';
    html += '<span style="color:var(--hm-warning,#eab308)">\u25CF 70-89: ' + T({ vi: 'Dat', en: 'Acceptable' }) + '</span>';
    html += '<span style="color:var(--hm-danger,#ef4444)">\u25CF <70: ' + T({ vi: 'Khong dat', en: 'Unacceptable' }) + '</span>';
    html += '</div>';
    html += '</div></div>';

    // 12-month trend table
    var trendData = sc.score_trend_12months || sc.trends || [];
    if (trendData.length) {
      var trendCols = [
        { key: 'month', label: { vi: 'Thang', en: 'Month' } },
        { key: 'quality', label: { vi: 'Chat luong', en: 'Quality' }, type: 'number' },
        { key: 'delivery', label: { vi: 'Giao hang', en: 'Delivery' }, type: 'number' },
        { key: 'cost', label: { vi: 'Chi phi', en: 'Cost' }, type: 'number' },
        { key: 'responsiveness', label: { vi: 'Phan hoi', en: 'Response' }, type: 'number' },
        { key: 'compliance', label: { vi: 'Tuan thu', en: 'Compliance' }, type: 'number' },
        { key: 'overall', label: { vi: 'Tong hop', en: 'Overall' }, render: function(v) { return renderScoreBar(v); } }
      ];
      html += ui.renderSection({ vi: 'Xu huong 12 thang', en: '12-Month Score Trend' },
        ui.renderChartWithTableFallback('supplier-score-trend', null, trendCols, trendData, { defaultMode: 'table' })
      );
    }

    return html;
  }

  // --- Qualifications Tab ---
  function renderQualificationsTab() {
    var data = state.tabData.qualifications || [];
    var html = '';
    var cols = [
      { key: 'standard', label: { vi: 'Tieu chuan / Yeu cau', en: 'Standard / Requirement' } },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
      { key: 'qualification_date', label: { vi: 'Ngay chung nhan', en: 'Qualification Date' }, type: 'date' },
      { key: 'expiry_date', label: { vi: 'Ngay het han', en: 'Expiry Date' }, type: 'date' },
      { key: 'evidence', label: { vi: 'Bang chung', en: 'Evidence' } },
      { key: 'auditor', label: { vi: 'Danh gia vien', en: 'Auditor' } }
    ];
    html += ui.renderSection({ vi: 'Ho so chung nhan', en: 'Qualification Records' },
      ui.renderDataGrid(cols, data, { selectable: false }),
      { headerActions: '<button class="eqms-btn primary sm" data-action="add-qualification">' + T({ vi: '+ Them', en: '+ Add' }) + '</button>' }
    );

    // Requalification schedule
    var schedule = (state.tabData.qualifications_schedule || []);
    if (schedule.length) {
      var schCols = [
        { key: 'standard', label: { vi: 'Tieu chuan', en: 'Standard' } },
        { key: 'next_date', label: { vi: 'Lich tai danh gia', en: 'Next Requalification' }, type: 'date' },
        { key: 'days_remaining', label: { vi: 'Con lai (ngay)', en: 'Days Remaining' }, type: 'number' }
      ];
      html += ui.renderSection({ vi: 'Lich tai danh gia', en: 'Requalification Schedule' },
        ui.renderDataGrid(schCols, schedule, { selectable: false })
      );
    }

    return html;
  }

  // --- Quality Agreements Tab ---
  function renderAgreementsTab() {
    var data = state.tabData.agreements || [];
    var cols = [
      { key: 'agreement_id', label: { vi: 'Ma TT', en: 'Agreement ID' }, type: 'id' },
      { key: 'title', label: { vi: 'Tieu de', en: 'Title' }, type: 'truncate' },
      { key: 'effective_date', label: { vi: 'Ngay hieu luc', en: 'Effective Date' }, type: 'date' },
      { key: 'expiry_date', label: { vi: 'Ngay het han', en: 'Expiry Date' }, type: 'date' },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
      { key: 'scope', label: { vi: 'Pham vi', en: 'Scope' }, type: 'truncate' },
      { key: 'key_terms', label: { vi: 'Dieu khoan chinh', en: 'Key Terms' }, type: 'truncate' }
    ];
    return ui.renderSection({ vi: 'Thoa thuan chat luong', en: 'Quality Agreements' },
      ui.renderDataGrid(cols, data, { selectable: false }),
      { headerActions: '<button class="eqms-btn primary sm" data-action="add-agreement">' + T({ vi: '+ Them', en: '+ Add' }) + '</button>' }
    );
  }

  // --- Deviations Tab ---
  function renderDeviationsTab() {
    var data = (state.tabData.deviations || []).filter(function(r) { return r.type === 'deviation' || r.entity_type === 'deviation'; });
    var cols = [
      { key: 'record_id', label: { vi: 'Ma', en: 'ID' }, type: 'id' },
      { key: 'title', label: { vi: 'Tieu de', en: 'Title' }, type: 'truncate' },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
      { key: 'severity', label: { vi: 'Muc do', en: 'Severity' }, type: 'priority' },
      { key: 'created_at', label: { vi: 'Ngay tao', en: 'Created' }, type: 'date' }
    ];
    return ui.renderSection({ vi: 'Sai lech lien quan', en: 'Linked Deviations' },
      ui.renderDataGrid(cols, data, { selectable: false })
    );
  }

  // --- SCARs Tab ---
  function renderScarsTab() {
    var data = (state.tabData.scars || []).filter(function(r) { return r.type === 'scar' || r.entity_type === 'scar'; });
    var cols = [
      { key: 'record_id', label: { vi: 'Ma SCAR', en: 'SCAR ID' }, type: 'id' },
      { key: 'title', label: { vi: 'Tieu de', en: 'Title' }, type: 'truncate' },
      { key: 'severity', label: { vi: 'Muc do', en: 'Severity' }, type: 'badge' },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
      { key: 'issued_date', label: { vi: 'Ngay phat hanh', en: 'Issued Date' }, type: 'date' },
      { key: 'days_open', label: { vi: 'So ngay mo', en: 'Days Open' }, type: 'number' }
    ];
    return ui.renderSection({ vi: 'Lich su SCAR', en: 'SCAR History' },
      ui.renderDataGrid(cols, data, { selectable: false })
    );
  }

  // --- Audits Tab ---
  function renderAuditsTab() {
    var data = state.tabData.audits || [];
    var cols = [
      { key: 'audit_id', label: { vi: 'Ma DG', en: 'Audit ID' }, type: 'id' },
      { key: 'audit_type', label: { vi: 'Loai', en: 'Type' }, type: 'badge' },
      { key: 'status', label: { vi: 'Trang thai', en: 'Status' }, type: 'badge' },
      { key: 'planned_date', label: { vi: 'Ngay ke hoach', en: 'Planned Date' }, type: 'date' },
      { key: 'score', label: { vi: 'Diem', en: 'Score' }, render: function(v) { return renderScoreBar(v); } },
      { key: 'finding_count', label: { vi: 'So phat hien', en: 'Findings' }, type: 'number' }
    ];
    return ui.renderSection({ vi: 'Lich su danh gia', en: 'Audit History' },
      ui.renderDataGrid(cols, data, { selectable: false })
    );
  }

  // --- Performance History Tab ---
  function renderPerformanceTab() {
    var data = state.tabData.performance || [];
    var cols = [
      { key: 'month', label: { vi: 'Thang', en: 'Month' } },
      { key: 'iqc_accept_rate', label: { vi: 'Ty le IQC dat', en: 'IQC Accept Rate' }, render: function(v) { return v != null ? esc(v + '%') : '\u2014'; } },
      { key: 'ncr_count', label: { vi: 'So NCR', en: 'NCR Count' }, type: 'number' },
      { key: 'on_time_delivery', label: { vi: 'Giao hang dung han', en: 'On-Time Delivery' }, render: function(v) { return v != null ? esc(v + '%') : '\u2014'; } },
      { key: 'response_time', label: { vi: 'TG phan hoi (ngay)', en: 'Response Time (days)' }, type: 'number' },
      { key: 'scar_count', label: { vi: 'So SCAR', en: 'SCAR Count' }, type: 'number' }
    ];

    return ui.renderSection({ vi: 'Lich su hieu suat', en: 'Performance History' },
      ui.renderChartWithTableFallback('supplier-perf-trend', null, cols, data, { defaultMode: 'table' })
    );
  }

  // --- Related Records & Audit Trail ---
  function renderRelatedTab() {
    var related = state.tabData.related || [];
    var auditTrail = state.tabData.audit_trail || state.detail.audit_trail || [];
    var html = '';
    html += ui.renderSection({ vi: 'Ban ghi lien quan', en: 'Related Records' },
      ui.renderRelationshipsPanel(related)
    );
    html += ui.renderSection({ vi: 'Nhat ky thay doi', en: 'Audit Trail' },
      ui.renderAuditTrail(auditTrail)
    );
    return html;
  }

  // --- Files & Comments ---
  function renderFilesTab() {
    var attachments = state.tabData.attachments || state.detail.attachments || [];
    var comments    = state.tabData.comments || state.detail.comments || [];
    var html = '';
    html += ui.renderSection({ vi: 'Tep dinh kem', en: 'Attachments' },
      ui.renderAttachmentsGrid(attachments)
    );
    html += ui.renderSection({ vi: 'Binh luan', en: 'Comments' },
      ui.renderCommentsThread(comments)
    );
    return html;
  }

  // =========================================================================
  // SCREEN: ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    var m = state.metrics || {};
    var html = '';

    html += ui.renderKpiRow([
      { label: { vi: 'Tong NCC', en: 'Total Suppliers' },     value: fmt(m.total_suppliers || 0) },
      { label: { vi: 'Diem TB', en: 'Avg Score' },            value: m.avg_quality_score != null ? Math.round(m.avg_quality_score) : '\u2014' },
      { label: { vi: '% Chung nhan', en: 'Qualification %' }, value: m.qualification_coverage != null ? m.qualification_coverage + '%' : '\u2014' },
      { label: { vi: 'SCAR mo', en: 'Open SCARs' },           value: fmt(m.open_scars || 0), accent: 'danger' }
    ]);

    // Scorecard comparison radar (placeholder for multi-supplier overlay)
    html += ui.renderSection({ vi: 'So sanh the diem NCC', en: 'Supplier Scorecard Comparison' },
      '<div style="display:flex;justify-content:center;padding:16px">' +
      renderRadarChart(m.avg_scores || {}, 300) +
      '</div>' +
      '<div style="text-align:center;font-size:12px;color:var(--hm-text-secondary,#64748b)">' +
      T({ vi: 'Diem trung binh tat ca NCC', en: 'Average scores across all suppliers' }) +
      '</div>'
    );

    // Risk heatmap
    html += ui.renderSection({ vi: 'Ban do rui ro', en: 'Risk Heatmap' }, renderRiskHeatmap(m.risk_matrix || []));

    // Top / Bottom ranking
    var topCols = [
      { key: 'rank', label: { vi: '#', en: '#' }, type: 'number' },
      { key: 'supplier_id', label: { vi: 'Ma NCC', en: 'ID' }, type: 'id' },
      { key: 'name', label: { vi: 'Ten', en: 'Name' }, type: 'truncate' },
      { key: 'quality_score', label: { vi: 'Diem', en: 'Score' }, render: function(v) { return renderScoreBar(v); } }
    ];
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    html += ui.renderSection({ vi: 'Top 10 NCC tot nhat', en: 'Top 10 Suppliers' },
      ui.renderDataGrid(topCols, (m.top_suppliers || []).map(function(s, i) { s.rank = i + 1; return s; }), { selectable: false })
    );
    html += ui.renderSection({ vi: 'Top 10 NCC can cai thien', en: 'Bottom 10 Suppliers' },
      ui.renderDataGrid(topCols, (m.bottom_suppliers || []).map(function(s, i) { s.rank = i + 1; return s; }), { selectable: false })
    );
    html += '</div>';

    // Quality trend by supplier
    var trendData = m.quality_trends || [];
    if (trendData.length) {
      var trendCols = [
        { key: 'month', label: { vi: 'Thang', en: 'Month' } },
        { key: 'supplier_name', label: { vi: 'NCC', en: 'Supplier' } },
        { key: 'quality_score', label: { vi: 'Diem CL', en: 'Quality Score' }, render: function(v) { return renderScoreBar(v); } }
      ];
      html += ui.renderSection({ vi: 'Xu huong chat luong theo NCC', en: 'Quality Trend by Supplier' },
        ui.renderChartWithTableFallback('supplier-qual-trend', null, trendCols, trendData, { defaultMode: 'table' })
      );
    }

    return html;
  }

  function renderRiskHeatmap(matrix) {
    if (!matrix || !matrix.length) {
      return ui.renderEmptyState({ icon: '\uD83D\uDEE1\uFE0F', title: { vi: 'Chua co du lieu rui ro', en: 'No risk data available' } });
    }
    var size = 320;
    var pad = 50;
    var innerW = size - pad * 2;
    var innerH = size - pad * 2;
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="font-family:inherit">';

    // Grid background (5x5)
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 5; col++) {
        var risk = (row + 1) * (col + 1);
        var fill = risk >= 15 ? 'rgba(239,68,68,0.15)' : (risk >= 8 ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.1)');
        var rx = pad + col * (innerW / 5), ry = pad + (4 - row) * (innerH / 5);
        svg += '<rect x="' + rx + '" y="' + ry + '" width="' + (innerW / 5) + '" height="' + (innerH / 5) + '" fill="' + fill + '" stroke="var(--hm-border,#cbd5e1)" stroke-width="0.5"/>';
      }
    }

    // Axis labels
    svg += '<text x="' + (size / 2) + '" y="' + (size - 8) + '" text-anchor="middle" font-size="11" fill="var(--hm-text-secondary)">' + esc(T({ vi: 'Kha nang xay ra', en: 'Likelihood' })) + '</text>';
    svg += '<text x="12" y="' + (size / 2) + '" text-anchor="middle" font-size="11" fill="var(--hm-text-secondary)" transform="rotate(-90,12,' + (size / 2) + ')">' + esc(T({ vi: 'Tac dong', en: 'Impact' })) + '</text>';

    // Plot suppliers as dots
    matrix.forEach(function(item) {
      var likelihood = Math.min(5, Math.max(1, item.likelihood || 1));
      var impact = Math.min(5, Math.max(1, item.impact || 1));
      var dotX = pad + ((likelihood - 0.5) / 5) * innerW;
      var dotY = pad + ((5 - impact + 0.5) / 5) * innerH;
      svg += '<circle cx="' + dotX.toFixed(1) + '" cy="' + dotY.toFixed(1) + '" r="6" fill="var(--hm-primary,#3b82f6)" fill-opacity="0.7" stroke="#fff" stroke-width="1"/>';
      svg += '<title>' + esc(item.name || item.supplier_id || '') + '</title>';
    });

    svg += '</svg>';
    return '<div style="display:flex;justify-content:center;padding:16px">' + svg + '</div>';
  }

  // =========================================================================
  // CREATE FORM (WIZARD)
  // =========================================================================
  function renderCreateForm() {
    var steps = [
      { label: { vi: 'Thong tin co ban', en: 'Basic Info' } },
      { label: { vi: 'Lien he & Phan loai', en: 'Contact & Classification' } },
      { label: { vi: 'Chung nhan', en: 'Certifications' } }
    ];
    var step = state.wizardStep || 0;
    var body = '';

    if (step === 0) {
      body += ui.renderFormField({ key: 'name', label: { vi: 'Ten NCC', en: 'Supplier Name' }, required: true, value: (state.formData || {}).name });
      body += ui.renderFormField({ key: 'address', label: { vi: 'Dia chi', en: 'Address' }, type: 'textarea', value: (state.formData || {}).address });
      body += ui.renderFormField({ key: 'country', label: { vi: 'Quoc gia', en: 'Country' }, required: true, value: (state.formData || {}).country });
      body += ui.renderFormField({ key: 'category', label: { vi: 'Danh muc', en: 'Category' }, required: true, value: (state.formData || {}).category });
    } else if (step === 1) {
      body += ui.renderFormField({ key: 'contact_name', label: { vi: 'Nguoi lien he', en: 'Contact Name' }, value: (state.formData || {}).contact_name });
      body += ui.renderFormField({ key: 'contact_email', label: { vi: 'Email', en: 'Email' }, type: 'email', value: (state.formData || {}).contact_email });
      body += ui.renderFormField({ key: 'phone', label: { vi: 'Dien thoai', en: 'Phone' }, value: (state.formData || {}).phone });
      body += ui.renderFormField({ key: 'risk_tier', label: { vi: 'Muc rui ro', en: 'Risk Tier' }, type: 'select', options: RISK_LEVELS, value: (state.formData || {}).risk_tier });
      body += ui.renderFormField({ key: 'strategic_classification', label: { vi: 'Phan loai chien luoc', en: 'Strategic Classification' }, type: 'select', options: [
        { value: 'strategic', label: { vi: 'Chien luoc', en: 'Strategic' } },
        { value: 'preferred', label: { vi: 'Uu tien', en: 'Preferred' } },
        { value: 'approved',  label: { vi: 'Da duyet', en: 'Approved' } },
        { value: 'transactional', label: { vi: 'Giao dich', en: 'Transactional' } }
      ], value: (state.formData || {}).strategic_classification });
    } else {
      body += ui.renderFormField({ key: 'certifications', label: { vi: 'Chung chi (cach nhau bang dau phay)', en: 'Certifications (comma-separated)' }, placeholder: { vi: 'ISO 9001, AS9100, IATF 16949...', en: 'ISO 9001, AS9100, IATF 16949...' }, value: (state.formData || {}).certifications });
      body += ui.renderFormField({ key: 'capabilities', label: { vi: 'Nang luc', en: 'Capabilities' }, type: 'textarea', value: (state.formData || {}).capabilities });
      body += ui.renderFormField({ key: 'annual_revenue', label: { vi: 'Doanh thu hang nam', en: 'Annual Revenue' }, type: 'number', value: (state.formData || {}).annual_revenue });
      body += ui.renderFormField({ key: 'employee_count', label: { vi: 'So nhan vien', en: 'Employee Count' }, type: 'number', value: (state.formData || {}).employee_count });
    }

    return ui.renderWizardShell(steps, step, body, { saveDraft: true });
  }

  // =========================================================================
  // MAIN PAINT
  // =========================================================================
  function paint() {
    if (!_container) return;
    var html = '';
    if (state.screen === 'create') {
      html = renderCreateForm();
    } else if (state.screen === 'detail') {
      html = renderDetail();
    } else if (state.screen === 'analytics') {
      html = renderAnalytics();
    } else {
      html = renderList();
    }
    _container.innerHTML = html;
    bindEvents();
  }

  // =========================================================================
  // EVENT BINDING
  // =========================================================================
  function bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', function handler(e) {
      _container.removeEventListener('click', handler);

      // Row click -> detail
      var row = e.target.closest('tr[data-id]');
      if (row && !e.target.closest('input[type="checkbox"]') && state.screen === 'list') {
        var id = row.getAttribute('data-id');
        if (id) {
          state.screen = 'detail';
          loadDetail(id);
          return;
        }
      }

      // Action buttons
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'apply-filters':
          collectFilters();
          state.page = 1;
          loadList();
          break;
        case 'reset-filters':
          state.filters = {};
          state.page = 1;
          loadList();
          break;
        case 'retry-list':
          loadList();
          break;
        case 'create-supplier':
          state.screen = 'create';
          state.formData = {};
          state.wizardStep = 0;
          paint();
          break;
        case 'screen-list':
          state.screen = 'list';
          window.EqmsShell.navigate('suppliers', {});
          loadList();
          break;
        case 'screen-analytics':
          state.screen = 'analytics';
          loadMetrics();
          paint();
          break;
        case 'qualify':
        case 'disqualify':
        case 'suspend':
        case 'reactivate':
          if (state.detail) executeAction(action, state.detail.id || state.detail.supplier_id);
          break;
        case 'edit-supplier':
          // future: open edit form
          break;
        case 'export':
          handleExport(actionEl.getAttribute('data-format'));
          break;
        case 'page':
          var pg = parseInt(actionEl.getAttribute('data-page'), 10);
          if (pg && pg !== state.page) { state.page = pg; loadList(); }
          break;
        case 'wizard-next':
          collectFormData();
          state.wizardStep = Math.min((state.wizardStep || 0) + 1, 2);
          paint();
          break;
        case 'wizard-back':
          collectFormData();
          state.wizardStep = Math.max((state.wizardStep || 0) - 1, 0);
          paint();
          break;
        case 'wizard-submit':
          collectFormData();
          submitCreate();
          break;
        case 'wizard-save-draft':
          collectFormData();
          submitCreate(true);
          break;
        case 'add-comment':
          submitComment();
          break;
        case 'upload-attachment':
          // future: file upload trigger
          break;
      }
    });

    // Tab click
    _container.addEventListener('click', function tabHandler(e) {
      var tab = e.target.closest('[data-tab]');
      if (tab && state.screen === 'detail') {
        state.activeTab = tab.getAttribute('data-tab');
        loadTabData(state.activeTab);
        paint();
      }
    });

    // Sort click
    _container.addEventListener('click', function sortHandler(e) {
      var th = e.target.closest('th[data-sort]');
      if (th && state.screen === 'list') {
        var key = th.getAttribute('data-sort');
        if (state.sort.key === key) {
          state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.key = key;
          state.sort.dir = 'asc';
        }
        state.page = 1;
        loadList();
      }
    });
  }

  function collectFilters() {
    if (!_container) return;
    _container.querySelectorAll('[data-filter]').forEach(function(el) {
      var key = el.getAttribute('data-filter');
      var val = el.value;
      if (val) state.filters[key] = val;
      else delete state.filters[key];
    });
  }

  function collectFormData() {
    if (!_container) return;
    state.formData = state.formData || {};
    _container.querySelectorAll('[data-field]').forEach(function(el) {
      state.formData[el.getAttribute('data-field')] = el.value;
    });
  }

  function submitCreate(draft) {
    var payload = Object.assign({}, state.formData, { status: draft ? 'draft' : 'new' });
    apiCall('eqms_suppliers_create', payload).then(function(res) {
      if (res.success !== false) {
        state.screen = 'list';
        loadList();
      }
    }).catch(function() {});
  }

  function submitComment() {
    if (!_container || !state.detail) return;
    var textarea = _container.querySelector('[data-field="new-comment"]');
    if (!textarea || !textarea.value.trim()) return;
    apiCall('eqms_suppliers_comments', {
      id: state.detail.id || state.detail.supplier_id,
      action: 'add',
      text: textarea.value.trim()
    }).then(function(res) {
      if (res.success !== false) {
        state.tabData.comments = null;
        loadTabData('files');
        paint();
      }
    }).catch(function() {});
  }

  // =========================================================================
  // ENTRY POINT
  // =========================================================================
  function render(container, context) {
    _container = container;
    context = context || {};

    if (context.recordId) {
      state.screen = 'detail';
      loadDetail(context.recordId);
    } else {
      state.screen = 'list';
      loadList();
      loadMetrics();
    }
  }

  // =========================================================================
  // REGISTER MODULE
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['suppliers'] = { render: render, meta: MOD };

})();

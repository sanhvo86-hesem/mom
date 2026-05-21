/**
 * Sơ đồ Tổng quan Tài liệu Vận hành — HESEM EQMS
 * HESEM MOM Portal · 50-eqms-doc-visualizer.js
 *
 * Module ID : doc-overview
 * Archetype : analytical-list
 * Load order: AFTER 40-eqms-shell.js
 *
 * Views: mindmap (ECharts tree) | fishbone (SVG Ishikawa) |
 *        flow (ECharts graph)   | matrix (HTML table)
 *
 * All colors flow from GraphicsAuthority — no hex literals in logic paths.
 * var(--css-token, #fallback) used only in SVG attribute strings where
 * CSS-variable resolution requires a fallback for unconfigured themes.
 */
(function () {
  'use strict';

  var T   = window.EqmsShell.util.T;
  var esc = window.EqmsShell.util.esc;

  /* ── Token helpers ────────────────────────────────────────────────────── */
  function tok(key, fb) {
    return (window.GraphicsAuthority && window.GraphicsAuthority.tokens.read(key, fb)) || fb;
  }
  /* CSS-var reference safe for use in SVG attribute strings */
  function cv(varName, fb) { return 'var(--' + varName + ',' + fb + ')'; }

  /* ── Palette: one token per group (9 distinct, from authority) ─────────── */
  var PALETTE_KEYS = [
    { key: 'brand.primary',         fb: '#1565c0' }, // 100 SYS
    { key: 'statusColors.success',  fb: '#16a34a' }, // 200 COM
    { key: 'statusColors.purple',   fb: '#7c3aed' }, // 300 ENG
    { key: 'statusColors.warning',  fb: '#d97706' }, // 400 SUP
    { key: 'brand.light',           fb: '#1e88e5' }, // 500 PRD
    { key: 'statusColors.error',    fb: '#dc2626' }, // 600 QC
    { key: 'statusColors.cyan',     fb: '#0891b2' }, // 700 LOG
    { key: 'brand.dark',            fb: '#0c2d48' }, // 800 HR
    { key: 'brand.accent',          fb: '#f9a825' }  // 900 IMP
  ];
  function palette(i) { var p = PALETTE_KEYS[i]; return tok(p.key, p.fb); }

  /* ── Document base ────────────────────────────────────────────────────── */
  var BASE = '/docs';

  /* =========================================================================
   * PROCESS GROUP REGISTRY
   * Each group = one 100-series number, 4 doc types, list of key SOPs
   * ======================================================================= */
  var GROUPS = [
    {
      id: 100, abbr: 'SYS',
      label: { vi: 'Hệ thống & Quản trị',      en: 'System & Governance' },
      fish:  { vi: 'Hệ thống quản trị',         en: 'Governance' },
      sop: 8, wi: 7, annex: 22, frm: 20,
      sopPath:   BASE + '/operations/sops/01-SOP-100/',
      wiPath:    BASE + '/operations/work-instructions/01-WI-100/',
      annexPath: BASE + '/operations/references/01-ANNEX-100/',
      frmPath:   BASE + '/forms/frm-100-sales/',
      sops: [
        { n: 101, vi: 'Kiểm soát tài liệu & dữ liệu',        en: 'Document & Data Control',           f: 'sop-101-document-and-data-control.html' },
        { n: 102, vi: 'Chính sách & bối cảnh tổ chức',        en: 'Quality Policy & Context',          f: 'sop-102-quality-policy-objectives-and-organizational-context.html' },
        { n: 103, vi: 'Rủi ro, FMEA & kế hoạch kiểm soát',   en: 'Risk, FMEA & Control Plan',         f: 'sop-103-risk-opportunity-fmea-and-control-plan.html' },
        { n: 104, vi: 'Quản trị dữ liệu & bảo mật IP',       en: 'Data Governance & IP Security',     f: 'sop-104-data-governance-records-security-and-ip-protection.html' },
        { n: 105, vi: 'Quản lý tri thức tổ chức',             en: 'Organizational Knowledge',          f: 'sop-105-organizational-knowledge-management.html' },
        { n: 106, vi: 'Quản lý thay đổi & cấu hình',         en: 'Change & Configuration Mgmt',       f: 'sop-106-change-and-configuration-management.html' },
        { n: 107, vi: 'Quản lý truyền thông nội bộ',          en: 'Communication Management',          f: 'sop-107-communication-management.html' },
        { n: 108, vi: 'Kế hoạch dự phòng vận hành',           en: 'Operational Contingency Plan',      f: 'sop-108-operational-contingency-plan.html' }
      ]
    },
    {
      id: 200, abbr: 'COM',
      label: { vi: 'Thương mại & Khách hàng',   en: 'Commercial & Customer' },
      fish:  { vi: 'Thương mại / Khách hàng',   en: 'Commercial' },
      sop: 3, wi: 7, annex: 0, frm: 14,
      sopPath:   BASE + '/operations/sops/02-SOP-200/',
      wiPath:    BASE + '/operations/work-instructions/02-WI-200/',
      annexPath: null,
      frmPath:   BASE + '/forms/frm-200-purchase/',
      sops: [
        { n: 201, vi: 'Thực hiện đơn hàng (RFQ → Thu tiền)',  en: 'Order Fulfillment: RFQ to Cash',    f: 'sop-201-order-fulfillment-rfq-to-cash.html' },
        { n: 202, vi: 'Khiếu nại KH, phản hồi & RMA',        en: 'Customer Complaint, Feedback & RMA',f: 'sop-202-customer-complaint-feedback-rma-and-escape.html' },
        { n: 203, vi: 'Kiểm soát tài sản khách hàng',         en: 'Customer Property Control',         f: 'sop-203-customer-property-control.html' }
      ]
    },
    {
      id: 300, abbr: 'ENG',
      label: { vi: 'Kỹ thuật & FAI',            en: 'Engineering & FAI' },
      fish:  { vi: 'Kỹ thuật / FAI',            en: 'Engineering' },
      sop: 3, wi: 2, annex: 2, frm: 8,
      sopPath:   BASE + '/operations/sops/03-SOP-300/',
      wiPath:    BASE + '/operations/work-instructions/03-WI-300/',
      annexPath: BASE + '/operations/references/03-ANNEX-300/',
      frmPath:   BASE + '/forms/frm-300-technical/',
      sops: [
        { n: 301, vi: 'Kỹ thuật, DFM, báo giá & lập kế hoạch', en: 'Engineering, DFM, Quoting & Planning', f: 'sop-301-engineering-dfm-quoting-and-machining-planning.html' },
        { n: 302, vi: 'Kiểm tra lần đầu (FAI)',                 en: 'First Article Inspection',            f: 'sop-302-first-article-inspection-fai.html' },
        { n: 303, vi: 'Phát hành kỹ thuật & baseline package',  en: 'Engineering Release & Baseline',      f: 'sop-303-engineering-release-baseline-package-and-job-snapshot-control.html' }
      ]
    },
    {
      id: 400, abbr: 'SUP',
      label: { vi: 'Nhà cung cấp & Mua hàng',   en: 'Supplier & Procurement' },
      fish:  { vi: 'Nhà cung cấp',              en: 'Supplier' },
      sop: 2, wi: 0, annex: 3, frm: 11,
      sopPath:   BASE + '/operations/sops/04-SOP-400/',
      wiPath:    null,
      annexPath: BASE + '/operations/references/04-ANNEX-400/',
      frmPath:   BASE + '/forms/frm-400-quality/',
      sops: [
        { n: 401, vi: 'Kiểm soát NCC & gia công đặc biệt',   en: 'Supplier Control & Special Process',   f: 'sop-401-supplier-control-and-special-process.html' },
        { n: 402, vi: 'Xác minh vật liệu & ngăn hàng giả',   en: 'Material Verification & Counterfeit',  f: 'sop-402-material-verification-traceability-and-counterfeit-prevention.html' }
      ]
    },
    {
      id: 500, abbr: 'PRD',
      label: { vi: 'Sản xuất CNC',              en: 'CNC Production' },
      fish:  { vi: 'Sản xuất CNC',              en: 'Production' },
      sop: 5, wi: 11, annex: 7, frm: 15,
      sopPath:   BASE + '/operations/sops/05-SOP-500/',
      wiPath:    BASE + '/operations/work-instructions/05-WI-500/',
      annexPath: BASE + '/operations/references/05-ANNEX-500/',
      frmPath:   BASE + '/forms/frm-500-production/',
      sops: [
        { n: 501, vi: 'Lập kế hoạch, lịch & điều phối SX',   en: 'Production Planning, Scheduling & Dispatch', f: 'sop-501-production-planning-scheduling-and-dispatch-control.html' },
        { n: 502, vi: 'Vận hành gia công CNC',                en: 'CNC Machining Operations',                   f: 'sop-502-cnc-machining-operations.html' },
        { n: 503, vi: 'Bảo trì dụng cụ, PM & ứng phó sự cố', en: 'Tooling Maintenance, PM & Breakdown',        f: 'sop-503-tooling-maintenance-pm-and-breakdown-response.html' },
        { n: 504, vi: 'Phát hành chương trình, setup & first-piece', en: 'Program Release, Setup & First Piece',f: 'sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html' },
        { n: 505, vi: 'Hoàn thiện, tua ba & gia công phụ',    en: 'Finishing, Deburr & Secondary Ops',          f: 'sop-505-finishing-deburr-and-secondary-operations-control.html' }
      ]
    },
    {
      id: 600, abbr: 'QC',
      label: { vi: 'Kiểm tra & Chất lượng',     en: 'Inspection & Quality' },
      fish:  { vi: 'Đo lường / Kiểm tra',       en: 'Measurement' },
      sop: 6, wi: 6, annex: 8, frm: 14,
      sopPath:   BASE + '/operations/sops/06-SOP-600/',
      wiPath:    BASE + '/operations/work-instructions/06-WI-600/',
      annexPath: BASE + '/operations/references/06-ANNEX-600/',
      frmPath:   BASE + '/forms/frm-600-inspection/',
      sops: [
        { n: 601, vi: 'Hiệu chuẩn & kiểm soát dụng cụ đo',   en: 'Calibration & Gage Control',         f: 'sop-601-calibration-and-gage-control.html' },
        { n: 602, vi: 'Phân tích hệ thống đo lường MSA/GR&R', en: 'Measurement System Analysis',        f: 'sop-602-measurement-system-analysis-msagr-r.html' },
        { n: 603, vi: 'Lấy mẫu kiểm tra theo AQL',            en: 'AQL Sampling Inspection',            f: 'sop-603-aql-sampling-inspection.html' },
        { n: 604, vi: 'SPC & kiểm soát năng lực quá trình',   en: 'SPC & Process Capability',           f: 'sop-604-spc-and-capability-control.html' },
        { n: 605, vi: 'Kiểm tra cuối, CoC & xuất hàng',       en: 'Final Inspection, CoC & Shipment',   f: 'sop-605-final-inspection-coc-and-shipment-release.html' },
        { n: 606, vi: 'NCR, CAPA & phản ứng IPQC',            en: 'NCR, CAPA & IPQC Reaction',          f: 'sop-606-ncr-capa-and-ipqc-reaction.html' }
      ]
    },
    {
      id: 700, abbr: 'LOG',
      label: { vi: 'Đóng gói & Logistics',      en: 'Packaging & Logistics' },
      fish:  { vi: 'Môi trường / Logistics',    en: 'Environment' },
      sop: 3, wi: 2, annex: 3, frm: 15,
      sopPath:   BASE + '/operations/sops/07-SOP-700/',
      wiPath:    BASE + '/operations/work-instructions/07-WI-700/',
      annexPath: BASE + '/operations/references/07-ANNEX-700/',
      frmPath:   BASE + '/forms/frm-700-maintenance/',
      sops: [
        { n: 701, vi: 'Nhận hàng, đóng gói & lưu kho',       en: 'Receiving, Packaging & Storage',     f: 'sop-701-receiving-packaging-handling-and-storage.html' },
        { n: 702, vi: 'Kiểm soát ô nhiễm & vệ sinh',          en: 'Contamination Control & Cleanliness',f: 'sop-702-contamination-control-and-cleanliness.html' },
        { n: 703, vi: 'An toàn sản phẩm & phòng ngừa FOD',   en: 'Product Safety & FOD Prevention',    f: 'sop-703-product-safety-conformity-and-fod-prevention.html' }
      ]
    },
    {
      id: 800, abbr: 'HR',
      label: { vi: 'Nhân sự, EHS & Tài chính', en: 'HR, EHS & Finance' },
      fish:  { vi: 'Con người & EHS',           en: 'People' },
      sop: 4, wi: 0, annex: 3, frm: 12,
      sopPath:   BASE + '/operations/sops/08-SOP-800/',
      wiPath:    null,
      annexPath: BASE + '/operations/references/08-ANNEX-800/',
      frmPath:   BASE + '/forms/frm-800-hr/',
      sops: [
        { n: 801, vi: 'Đào tạo, năng lực & chứng nhận',       en: 'Competence, Training & Certification',f: 'sop-801-competence-training-and-certification.html' },
        { n: 802, vi: 'Sự cố, gần tai nạn & EHS',             en: 'Incident, Near-Miss & EHS',           f: 'sop-802-incident-near-miss-and-ehs.html' },
        { n: 803, vi: 'Lập hóa đơn, chi phí công việc & AP/AR',en: 'Invoicing, Job Costing & AR/AP',     f: 'sop-803-invoicing-job-costing-and-arap.html' },
        { n: 804, vi: 'Yếu tố con người & chống lỗi',         en: 'Human Factors & Error-Proofing',     f: 'sop-804-human-factors-and-error-proofing.html' }
      ]
    },
    {
      id: 900, abbr: 'IMP',
      label: { vi: 'Cải tiến & Đánh giá',      en: 'Improvement & Audit' },
      fish:  { vi: 'Cải tiến liên tục',         en: 'Improvement' },
      sop: 3, wi: 0, annex: 0, frm: 3,
      sopPath:   BASE + '/operations/sops/09-SOP-900/',
      wiPath:    null,
      annexPath: null,
      frmPath:   BASE + '/forms/frm-900-admin/',
      sops: [
        { n: 901, vi: 'Đánh giá nội bộ & LPA',               en: 'Internal Audit & LPA',               f: 'sop-901-internal-audit-and-lpa.html' },
        { n: 902, vi: 'Xem xét của lãnh đạo',                 en: 'Management Review',                  f: 'sop-902-management-review.html' },
        { n: 903, vi: 'Cải tiến liên tục & Kaizen',           en: 'Continual Improvement & Kaizen',     f: 'sop-903-continual-improvement-and-kaizen.html' }
      ]
    }
  ];

  /* ── Derived counts ────────────────────────────────────────────────────── */
  function totalDocs(g) { return g.sop + g.wi + g.annex + g.frm; }
  function grandTotal() {
    return GROUPS.reduce(function(s, g) { return s + totalDocs(g); }, 0);
  }
  function shortLbl(vi) {
    // Abbreviate long Vietnamese labels for fishbone tips
    return vi.replace('& Quản trị', '').replace('& Khách hàng', '').replace('& Tài chính', '').replace('& Đánh giá', '').trim();
  }

  /* =========================================================================
   * STATE
   * ======================================================================= */
  var state = {
    view:          'mindmap',
    selectedGroup: null,
    charts:        {}
  };
  var _root = null;

  /* =========================================================================
   * CSS INJECTION  (single block, idempotent)
   * ======================================================================= */
  (function injectCSS() {
    if (document.getElementById('dov-styles')) return;
    var s = document.createElement('style');
    s.id = 'dov-styles';
    s.textContent = [
      '.dov-wrap{display:flex;flex-direction:column;height:100%;min-height:500px;background:var(--bg-page,#f8fafc);font-family:inherit}',
      '.dov-header{padding:20px 24px 12px;border-bottom:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff)}',
      '.dov-title{margin:0 0 4px;font-size:18px;font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-subtitle{margin:0;font-size:13px;color:var(--text-secondary,#64748b)}',
      '.dov-tabs{display:flex;gap:4px;padding:12px 24px 0;background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e2e8f0);overflow-x:auto}',
      '.dov-tab{display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-secondary,#64748b);white-space:nowrap;transition:color 0.15s,border-color 0.15s}',
      '.dov-tab:hover{color:var(--brand-primary,#1565c0)}',
      '.dov-tab--active{color:var(--brand-primary,#1565c0);border-bottom-color:var(--brand-primary,#1565c0)}',
      '.dov-tab-icon{font-size:16px;line-height:1}',
      '.dov-canvas{flex:1;overflow:auto;padding:20px 24px}',

      /* mindmap */
      '.dov-chart-box{width:100%;border-radius:8px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);overflow:hidden}',
      '.dov-chart-legend{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;border-top:1px solid var(--border,#e2e8f0)}',
      '.dov-legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary,#64748b)}',
      '.dov-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}',

      /* fishbone */
      '.dov-fishbone-wrap{display:flex;flex-direction:column;gap:16px}',
      '.dov-fishbone-svg{width:100%;height:auto;border-radius:8px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0)}',
      '.dov-bone{cursor:pointer;transition:opacity 0.15s}',
      '.dov-bone-lbl{cursor:pointer}',
      '.dov-bone-lbl:hover rect{opacity:0.85}',
      '.dov-bone-detail{border-radius:8px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);padding:16px;min-height:80px}',
      '.dov-detail-hint{color:var(--text-tertiary,#94a3b8);font-size:13px;text-align:center;padding:20px 0}',
      '.dov-detail-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
      '.dov-detail-badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff}',
      '.dov-detail-name{font-size:15px;font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-detail-counts{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}',
      '.dov-count-chip{padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:var(--bg-surface-alt,#f1f5f9);color:var(--text-secondary,#64748b)}',
      '.dov-sop-list{display:flex;flex-direction:column;gap:4px}',
      '.dov-sop-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;text-decoration:none;color:var(--text-primary,#1e293b);font-size:13px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);transition:background 0.12s}',
      '.dov-sop-item:hover{background:var(--bg-hover,#f8fafc);border-color:var(--brand-primary,#1565c0)}',
      '.dov-sop-code{font-family:monospace;font-size:11px;font-weight:700;color:var(--text-secondary,#64748b);min-width:44px}',
      '.dov-sop-links{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '.dov-sop-link-btn{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;text-decoration:none;border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);background:var(--bg-surface,#fff);cursor:pointer;transition:border-color 0.12s,color 0.12s}',
      '.dov-sop-link-btn:hover{border-color:var(--brand-primary,#1565c0);color:var(--brand-primary,#1565c0)}',

      /* matrix */
      '.dov-matrix-wrap{overflow-x:auto}',
      '.dov-matrix-table{width:100%;border-collapse:collapse;font-size:13px;background:var(--bg-surface,#fff);border-radius:8px;overflow:hidden;border:1px solid var(--border,#e2e8f0)}',
      '.dov-matrix-table th{padding:10px 14px;background:var(--bg-surface-alt,#f1f5f9);font-weight:600;color:var(--text-secondary,#64748b);text-align:left;white-space:nowrap;border-bottom:1px solid var(--border,#e2e8f0)}',
      '.dov-matrix-table td{padding:9px 14px;border-bottom:1px solid var(--border,#e2e8f0);vertical-align:middle}',
      '.dov-matrix-table tr:last-child td{border-bottom:none}',
      '.dov-matrix-table tr:hover td{background:var(--bg-hover,#f8fafc)}',
      '.dov-mat-group{display:flex;align-items:center;gap:8px}',
      '.dov-mat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}',
      '.dov-mat-cell-link{display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:3px 8px;border-radius:5px;font-weight:700;text-decoration:none;font-size:13px;transition:opacity 0.12s}',
      '.dov-mat-cell-link:hover{opacity:0.8}',
      '.dov-mat-cell-zero{color:var(--text-tertiary,#94a3b8);font-size:13px}',
      '.dov-mat-total{font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-mat-footer td{background:var(--bg-surface-alt,#f1f5f9);font-weight:700;border-top:2px solid var(--border,#e2e8f0)}',

      /* flow desc */
      '.dov-flow-info{margin-top:12px;font-size:12px;color:var(--text-secondary,#64748b);text-align:center}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  /* =========================================================================
   * RENDER ENTRY
   * ======================================================================= */
  function render(container, context) {
    _root = container;
    _root.innerHTML = buildShell();
    bindTabEvents(_root);
    renderView(_root);
  }

  function buildShell() {
    var total = grandTotal();
    var html = '<div class="dov-wrap">';
    html += '<div class="dov-header">';
    html += '<h2 class="dov-title">' + esc(T({ vi: 'Sơ đồ Tổng quan Tài liệu Vận hành', en: 'Operational Document Visual Map' })) + '</h2>';
    html += '<p class="dov-subtitle">' + esc(T({
      vi: '9 nhóm quy trình · ' + total + ' tài liệu kiểm soát (SOP + WI + ANNEX + FRM)',
      en: '9 process groups · ' + total + ' controlled documents (SOP + WI + ANNEX + FRM)'
    })) + '</p>';
    html += '</div>';

    var tabs = [
      { id: 'mindmap',  icon: '🗺',  label: { vi: 'Sơ đồ cây',      en: 'Mind Map' } },
      { id: 'fishbone', icon: '🐟', label: { vi: 'Xương cá',        en: 'Fishbone' } },
      { id: 'flow',     icon: '⬡',  label: { vi: 'Luồng quy trình', en: 'Process Flow' } },
      { id: 'matrix',   icon: '📊', label: { vi: 'Ma trận',         en: 'Matrix' } }
    ];
    html += '<div class="dov-tabs" role="tablist">';
    tabs.forEach(function (tab) {
      var active = state.view === tab.id ? ' dov-tab--active' : '';
      html += '<button class="dov-tab' + active + '" data-dov-tab="' + tab.id + '" role="tab">';
      html += '<span class="dov-tab-icon">' + tab.icon + '</span>';
      html += '<span>' + esc(T(tab.label)) + '</span></button>';
    });
    html += '</div>';
    html += '<div class="dov-canvas" id="dov-canvas"></div></div>';
    return html;
  }

  function bindTabEvents(root) {
    root.querySelectorAll('[data-dov-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-dov-tab');
        if (v === state.view) return;
        state.view = v;
        state.selectedGroup = null;
        // Destroy old ECharts instances
        Object.keys(state.charts).forEach(function (k) {
          try { state.charts[k].dispose(); } catch (e) {}
        });
        state.charts = {};
        // Re-render tabs active state
        root.querySelectorAll('[data-dov-tab]').forEach(function (b) {
          b.classList.toggle('dov-tab--active', b.getAttribute('data-dov-tab') === v);
        });
        renderView(root);
      });
    });
  }

  function renderView(root) {
    var canvas = root.querySelector('#dov-canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    if      (state.view === 'mindmap')  renderMindmap(canvas);
    else if (state.view === 'fishbone') renderFishbone(canvas);
    else if (state.view === 'flow')     renderFlow(canvas);
    else if (state.view === 'matrix')   renderMatrix(canvas);
  }

  function destroy() {
    Object.keys(state.charts).forEach(function (k) {
      try { state.charts[k].dispose(); } catch (e) {}
    });
    state.charts = {};
    _root = null;
  }

  /* =========================================================================
   * VIEW 1 — MINDMAP  (ECharts tree, radial)
   * ======================================================================= */
  function renderMindmap(canvas) {
    if (!window.echarts) {
      canvas.innerHTML = '<p style="padding:24px;color:var(--text-secondary,#64748b)">ECharts chưa tải.</p>';
      return;
    }

    /* Build tree data */
    function docTypeNode(label, count, path) {
      return {
        name: label + ' (' + count + ')',
        value: count,
        itemStyle: { opacity: path ? 1 : 0.4 },
        url: path || null
      };
    }

    var treeData = {
      name: 'HESEM QMS',
      children: GROUPS.map(function (g, i) {
        var col = palette(i);
        var children = [];
        if (g.sop > 0)   children.push(docTypeNode('SOP',   g.sop,   g.sopPath));
        if (g.wi > 0)    children.push(docTypeNode('WI',    g.wi,    g.wiPath));
        if (g.annex > 0) children.push(docTypeNode('ANNEX', g.annex, g.annexPath));
        if (g.frm > 0)   children.push(docTypeNode('FRM',   g.frm,   g.frmPath));
        return {
          name: g.abbr + '-' + g.id + '\n' + T(g.label),
          value: totalDocs(g),
          itemStyle: { color: col, borderColor: col },
          label:     { color: col, fontWeight: '600' },
          children:  children.map(function (c) {
            return Object.assign({ itemStyle: { color: col, opacity: 0.7 }, label: { color: col } }, c);
          })
        };
      })
    };

    /* Container */
    var box = document.createElement('div');
    box.className = 'dov-chart-box';
    box.style.height = '560px';
    canvas.appendChild(box);

    var chart = window.echarts.init(box, null, { renderer: 'svg' });
    state.charts['mindmap'] = chart;

    var textCol = tok('colorsLight.textPrimary', '#1e293b');
    var borderCol = tok('colorsLight.border', '#e2e8f0');

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          if (!p.data) return '';
          var n = p.data.name || '';
          return '<div style="font-size:12px">' + esc(n.replace('\n', ' — ')) + '</div>';
        }
      },
      series: [{
        type: 'tree',
        data: [treeData],
        layout: 'radial',
        top: '5%', left: '5%', bottom: '5%', right: '5%',
        symbol: 'circle',
        symbolSize: function (v) { return v ? Math.min(14, 6 + Math.sqrt(v)) : 6; },
        initialTreeDepth: 1,
        expandAndCollapse: true,
        animationDuration: 300,
        label: {
          position: 'top',
          verticalAlign: 'middle',
          fontSize: 11,
          color: textCol,
          formatter: function (p) { return (p.data.name || '').split('\n')[0]; }
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            fontSize: 11
          }
        },
        lineStyle: { color: borderCol, width: 1.5 }
      }]
    });

    /* Click → open doc folder in new tab */
    chart.on('click', function (p) {
      var url = p.data && p.data.url;
      if (url) window.open(url, '_blank');
    });

    /* Legend */
    var legend = document.createElement('div');
    legend.className = 'dov-chart-legend';
    GROUPS.forEach(function (g, i) {
      legend.innerHTML +=
        '<span class="dov-legend-item">' +
        '<span class="dov-legend-dot" style="background:' + palette(i) + '"></span>' +
        '<span>' + esc(g.abbr) + ' · ' + esc(T(g.label)) + '</span></span>';
    });
    canvas.appendChild(legend);

    /* Note */
    var note = document.createElement('p');
    note.className = 'dov-flow-info';
    note.textContent = T({ vi: 'Nhấn vào nút để mở rộng/thu gọn · Nhấn nhãn loại tài liệu (SOP/WI/ANNEX/FRM) để mở thư mục', en: 'Click node to expand/collapse · Click doc-type label (SOP/WI/ANNEX/FRM) to open folder' });
    canvas.appendChild(note);

    /* Responsive resize */
    var ro = new ResizeObserver(function () { chart.resize(); });
    ro.observe(box);
  }

  /* =========================================================================
   * VIEW 2 — FISHBONE SVG  (Ishikawa)
   * Top spine: SYS(100) ENG(300) PRD(500) LOG(700) IMP(900)
   * Bot spine: COM(200) SUP(400) QC(600)  HR(800)
   * ======================================================================= */
  function renderFishbone(canvas) {
    var W = 1000, H = 490;
    var spineY = 245;
    var tipTopY = 80,  tipBotY = 410;

    /* index into GROUPS: top=0,2,4,6,8 / bot=1,3,5,7 */
    var topIdx = [0, 2, 4, 6, 8];
    var botIdx = [1, 3, 5, 7];

    /* spine-attach X for top bones */
    var topSX = [160, 295, 430, 565, 700];
    /* label tip X for top bones (shifted left) */
    var topTX = [100, 235, 370, 505, 640];

    /* spine-attach X for bottom bones */
    var botSX = [228, 363, 498, 633];
    /* label tip X for bottom bones */
    var botTX = [168, 303, 438, 573];

    /* ── SVG build ────────────────────────────────────────────────────── */
    var s = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="dov-fishbone-svg">';

    /* Defs: arrowhead */
    var brandPri = cv('brand-primary', '#1565c0');
    s += '<defs>';
    s += '<marker id="dovArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">';
    s += '<path d="M0,0 L10,5 L0,10 Z" fill="' + brandPri + '"/>';
    s += '</marker>';
    /* Sub-bone tick marker */
    s += '</defs>';

    /* Spine */
    s += '<line x1="75" y1="' + spineY + '" x2="835" y2="' + spineY + '" stroke="' + brandPri + '" stroke-width="3.5" stroke-linecap="round" marker-end="url(#dovArr)"/>';

    /* Head box */
    var hbg  = cv('brand-primary', '#1565c0');
    var htxt = cv('text-inverse', '#fff');
    s += '<rect x="838" y="' + (spineY - 44) + '" width="152" height="88" rx="9" fill="' + hbg + '"/>';
    s += '<text x="914" y="' + (spineY - 20) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + htxt + '" font-family="inherit">Sản phẩm CNC</text>';
    s += '<text x="914" y="' + (spineY - 4) + '"  text-anchor="middle" font-size="12" font-weight="600" fill="' + htxt + '" font-family="inherit">chất lượng cao</text>';
    s += '<text x="914" y="' + (spineY + 14) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.82)" font-family="inherit">giao đúng hạn</text>';

    /* ── Draw bones ─────────────────────────────────────────────────── */
    function drawBone(gi, sx, tx, ty, isTop) {
      var g   = GROUPS[gi];
      var col = palette(gi);
      var lbx = tx - 52, lby = isTop ? ty - 58 : ty;
      var lbh = 58, lbw = 104;

      /* main bone line */
      s += '<line x1="' + tx + '" y1="' + ty + '" x2="' + sx + '" y2="' + spineY +
           '" stroke="' + col + '" stroke-width="2.5" class="dov-bone" data-gi="' + gi + '"/>';

      /* sub-bones: short horizontal ticks for each SOP along the bone */
      var n = Math.min(g.sop, 6);
      for (var j = 0; j < n; j++) {
        var t = 0.22 + j * (0.65 / Math.max(n - 1, 1));
        var bx = tx + t * (sx - tx);
        var by = ty + t * (spineY - ty);
        var tickLen = 34;
        /* sub-bones point rightward (toward head) */
        var tx2 = bx + tickLen, ty2 = by + (isTop ? 4 : -4);
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + tx2 + '" y2="' + ty2 +
             '" stroke="' + col + '" stroke-width="1.5" opacity="0.6"/>';
        /* SOP number label */
        var lblX = bx - 5;
        var lblY = isTop ? by - 5 : by + 13;
        s += '<text x="' + lblX + '" y="' + lblY + '" font-size="9.5" fill="' + col +
             '" text-anchor="end" font-family="monospace" font-weight="600" opacity="0.8">SOP-' +
             (g.id + j + 1) + '</text>';
      }

      /* junction dot */
      s += '<circle cx="' + sx + '" cy="' + spineY + '" r="5.5" fill="' + col + '"/>';

      /* label box (clickable) */
      s += '<g class="dov-bone-lbl" data-gi="' + gi + '" style="cursor:pointer" role="button" tabindex="0" aria-label="' + esc(T(g.label)) + '">';
      s += '<rect x="' + lbx + '" y="' + lby + '" width="' + lbw + '" height="' + lbh +
           '" rx="7" fill="' + col + '" fill-opacity="0.13" stroke="' + col + '" stroke-width="1.5"/>';
      /* abbr */
      var labY1 = isTop ? lby + 17 : lby + 16;
      s += '<text x="' + tx + '" y="' + labY1 + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + col + '" font-family="inherit">' + esc(g.abbr) + '</text>';
      /* fish label */
      var labY2 = labY1 + 14;
      s += '<text x="' + tx + '" y="' + labY2 + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + col + '" font-family="inherit">' + esc(shortLbl(T(g.fish))) + '</text>';
      /* sop count */
      var labY3 = labY2 + 13;
      s += '<text x="' + tx + '" y="' + labY3 + '" text-anchor="middle" font-size="10" fill="' + col + '" font-family="inherit" opacity="0.8">' + g.sop + ' SOP · ' + totalDocs(g) + ' TL</text>';
      s += '</g>';
    }

    topIdx.forEach(function (gi, i) { drawBone(gi, topSX[i], topTX[i], tipTopY, true); });
    botIdx.forEach(function (gi, i) { drawBone(gi, botSX[i], botTX[i], tipBotY, false); });

    /* Spine label */
    s += '<text x="78" y="' + (spineY - 10) + '" font-size="11" fill="' + brandPri + '" font-weight="600" font-family="inherit">Quy trình vận hành HESEM</text>';

    s += '</svg>';

    /* Detail panel */
    s += '<div class="dov-bone-detail" id="dov-bd">' +
         '<p class="dov-detail-hint">' +
         esc(T({ vi: 'Nhấn vào nhóm quy trình để xem danh sách SOP', en: 'Click a process group to view SOPs' })) +
         '</p></div>';

    canvas.innerHTML = '<div class="dov-fishbone-wrap">' + s + '</div>';

    /* Bind click events */
    canvas.querySelectorAll('[data-gi]').forEach(function (el) {
      el.addEventListener('click', function () {
        showBoneDetail(parseInt(el.getAttribute('data-gi')), canvas);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') showBoneDetail(parseInt(el.getAttribute('data-gi')), canvas);
      });
    });
  }

  function showBoneDetail(gi, canvas) {
    state.selectedGroup = gi;
    var g   = GROUPS[gi];
    var col = palette(gi);
    var bd  = canvas.querySelector('#dov-bd');
    if (!bd) return;

    var html = '<div class="dov-detail-header">';
    html += '<span class="dov-detail-badge" style="background:' + col + '">' + esc(g.abbr + '-' + g.id) + '</span>';
    html += '<span class="dov-detail-name">' + esc(T(g.label)) + '</span>';
    html += '</div>';

    /* Count chips */
    html += '<div class="dov-detail-counts">';
    var types = [
      { label: 'SOP',   count: g.sop,   path: g.sopPath },
      { label: 'WI',    count: g.wi,    path: g.wiPath },
      { label: 'ANNEX', count: g.annex, path: g.annexPath },
      { label: 'FRM',   count: g.frm,   path: g.frmPath }
    ];
    types.forEach(function (t) {
      if (t.count > 0) {
        var href = t.path ? ' onclick="window.open(\'' + t.path + '\',\'_blank\')" style="cursor:pointer"' : '';
        html += '<span class="dov-count-chip"' + href + '>' + t.label + ' ×' + t.count + '</span>';
      }
    });
    html += '</div>';

    /* SOP list */
    html += '<div class="dov-sop-list">';
    g.sops.forEach(function (sop) {
      var href = g.sopPath + sop.f;
      html += '<a class="dov-sop-item" href="' + esc(href) + '" target="_blank">';
      html += '<span class="dov-sop-code">SOP-' + sop.n + '</span>';
      html += '<span>' + esc(T({ vi: sop.vi, en: sop.en })) + '</span>';
      html += '</a>';
    });
    html += '</div>';

    /* Quick links row */
    html += '<div class="dov-sop-links">';
    types.forEach(function (t) {
      if (t.count > 0 && t.path) {
        html += '<a class="dov-sop-link-btn" href="' + esc(t.path) + '" target="_blank">' +
                T({ vi: 'Xem tất cả ' + t.label, en: 'View all ' + t.label }) + ' (' + t.count + ')</a>';
      }
    });
    html += '</div>';

    bd.innerHTML = html;
  }

  /* =========================================================================
   * VIEW 3 — PROCESS FLOW  (ECharts graph)
   * Operational sequence: COM → ENG → SUP → PRD → QC → LOG
   * Cross-cutting: SYS (top), HR (bottom), IMP (feedback)
   * ======================================================================= */
  function renderFlow(canvas) {
    if (!window.echarts) {
      canvas.innerHTML = '<p style="padding:24px;color:var(--text-secondary,#64748b)">ECharts chưa tải.</p>';
      return;
    }

    /* Node positions (x%, y% of chart area) */
    var nodes = [
      /* flow lane */
      { gi: 1, x: 120,  y: 280 }, /* COM  200 */
      { gi: 2, x: 270,  y: 280 }, /* ENG  300 */
      { gi: 3, x: 420,  y: 280 }, /* SUP  400 */
      { gi: 4, x: 570,  y: 280 }, /* PRD  500 */
      { gi: 5, x: 720,  y: 280 }, /* QC   600 */
      { gi: 6, x: 870,  y: 280 }, /* LOG  700 */
      /* cross-cutting */
      { gi: 0, x: 500,  y: 80  }, /* SYS  100 */
      { gi: 7, x: 500,  y: 480 }, /* HR   800 */
      { gi: 8, x: 280,  y: 480 }, /* IMP  900 */
      /* customer nodes */
      { gi: -1, x: 40,   y: 280, special: true, label: { vi: 'KH',    en: 'Customer' }, abbr: 'KH' },
      { gi: -2, x: 960,  y: 280, special: true, label: { vi: 'Giao',  en: 'Deliver'  }, abbr: '✓' }
    ];

    var echNodes = nodes.map(function (n) {
      var g = n.gi >= 0 ? GROUPS[n.gi] : null;
      var col = n.gi >= 0 ? palette(n.gi) : tok('brand.primary', '#1565c0');
      return {
        id:   String(n.gi),
        name: g ? g.abbr + '\n' + T(g.label) : T(n.label),
        abbr: g ? g.abbr : n.abbr,
        x: n.x, y: n.y,
        symbolSize: n.special ? 38 : 56,
        itemStyle:  { color: col, borderColor: col, borderWidth: n.special ? 2 : 0 },
        label:      { show: true, fontSize: 11, fontWeight: '700', color: '#fff',
                      formatter: function (p) { return p.data.abbr || ''; } },
        url: g ? g.sopPath : null,
        sopCount: g ? g.sop : 0
      };
    });

    /* Edges */
    var mainFlow  = [['-1','1'],['1','2'],['2','3'],['3','4'],['4','5'],['5','6'],['6','-2']];
    var crossTop  = [['0','1'],['0','2'],['0','3'],['0','4'],['0','5'],['0','6']];
    var crossBot  = [['7','4'],['7','5']];
    var feedback  = [['8','1'],['5','8']];

    function edge(s, t, style) {
      return Object.assign({ source: s, target: t, lineStyle: style }, {});
    }

    var edgeCol   = tok('colorsLight.border',         '#e2e8f0');
    var accentCol = tok('brand.accent',               '#f9a825');
    var crossCol  = tok('statusColors.info',           '#2563eb');

    var echEdges = [].concat(
      mainFlow.map(function (e) {
        return edge(e[0], e[1], { color: tok('brand.primary', '#1565c0'), width: 2.5, curveness: 0 });
      }),
      crossTop.map(function (e) {
        return edge(e[0], e[1], { color: crossCol, width: 1.2, type: 'dashed', curveness: 0.3 });
      }),
      crossBot.map(function (e) {
        return edge(e[0], e[1], { color: tok('statusColors.purple', '#7c3aed'), width: 1.2, type: 'dashed', curveness: 0.3 });
      }),
      feedback.map(function (e) {
        return edge(e[0], e[1], { color: tok('statusColors.success', '#16a34a'), width: 1.5, curveness: 0.45 });
      })
    );

    var box = document.createElement('div');
    box.className = 'dov-chart-box';
    box.style.height = '580px';
    canvas.appendChild(box);

    var chart = window.echarts.init(box, null, { renderer: 'svg' });
    state.charts['flow'] = chart;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger:   'item',
        formatter: function (p) {
          if (!p.data || !p.data.name) return '';
          var sopLine = p.data.sopCount ? ' · ' + p.data.sopCount + ' SOP' : '';
          return '<div style="font-size:12px">' + esc(p.data.name.replace('\n', ' — ')) + sopLine + '</div>';
        }
      },
      series: [{
        type:               'graph',
        layout:             'none',
        coordinateSystem:   undefined,
        data:               echNodes,
        edges:              echEdges,
        roam:               false,
        focusNodeAdjacency: true,
        edgeSymbol:         ['none', 'arrow'],
        edgeSymbolSize:     8,
        left: 10, right: 10, top: 30, bottom: 30,
        label: { show: true },
        lineStyle: { opacity: 0.9 }
      }]
    });

    chart.on('click', function (p) {
      var url = p.data && p.data.url;
      if (url) window.open(url, '_blank');
    });

    /* Legend */
    var info = document.createElement('p');
    info.className = 'dov-flow-info';
    info.textContent = T({
      vi: '→ Luồng chính (xanh dương) · -- Hệ thống quản trị (xanh nhạt) · ↩ Cải tiến phản hồi (xanh lá) · Nhấn node để mở thư mục SOP',
      en: '→ Main flow (blue) · -- Governance (light blue) · ↩ Improvement loop (green) · Click node to open SOP folder'
    });
    canvas.appendChild(info);

    var ro = new ResizeObserver(function () { chart.resize(); });
    ro.observe(box);
  }

  /* =========================================================================
   * VIEW 4 — MATRIX  (HTML table)
   * Rows: 9 process groups · Cols: SOP WI ANNEX FRM Total
   * ======================================================================= */
  function renderMatrix(canvas) {
    var colDefs = [
      { key: 'sop',   label: 'SOP',   pathKey: 'sopPath' },
      { key: 'wi',    label: 'WI',    pathKey: 'wiPath' },
      { key: 'annex', label: 'ANNEX', pathKey: 'annexPath' },
      { key: 'frm',   label: 'FRM',   pathKey: 'frmPath' }
    ];

    /* Max count for heat shading */
    var maxes = {};
    colDefs.forEach(function (c) {
      maxes[c.key] = Math.max.apply(null, GROUPS.map(function (g) { return g[c.key]; }));
    });

    function heatOpacity(val, max) {
      if (!val || !max) return 0;
      return 0.08 + 0.55 * (val / max);
    }

    var html = '<div class="dov-matrix-wrap"><table class="dov-matrix-table">';

    /* Head */
    html += '<thead><tr>';
    html += '<th>' + esc(T({ vi: 'Nhóm quy trình', en: 'Process Group' })) + '</th>';
    colDefs.forEach(function (c) { html += '<th style="text-align:center">' + c.label + '</th>'; });
    html += '<th style="text-align:center">' + esc(T({ vi: 'Tổng', en: 'Total' })) + '</th>';
    html += '</tr></thead><tbody>';

    /* Rows */
    GROUPS.forEach(function (g, i) {
      var col = palette(i);
      var tot = totalDocs(g);
      html += '<tr>';
      html += '<td><div class="dov-mat-group">' +
              '<span class="dov-mat-dot" style="background:' + col + '"></span>' +
              '<span><strong>' + esc(g.abbr) + '-' + g.id + '</strong> ' + esc(T(g.label)) + '</span>' +
              '</div></td>';
      colDefs.forEach(function (c) {
        var val  = g[c.key];
        var path = g[c.pathKey];
        var op   = heatOpacity(val, maxes[c.key]);
        html += '<td style="text-align:center">';
        if (val > 0 && path) {
          html += '<a class="dov-mat-cell-link" href="' + esc(path) + '" target="_blank" ' +
                  'style="background:' + col + ';color:#fff;opacity:' + op + ';' +
                  'background-color:' + col + '">' + val + '</a>';
        } else if (val > 0) {
          html += '<span style="font-weight:700;color:' + col + '">' + val + '</span>';
        } else {
          html += '<span class="dov-mat-cell-zero">—</span>';
        }
        html += '</td>';
      });
      html += '<td style="text-align:center"><span class="dov-mat-total">' + tot + '</span></td>';
      html += '</tr>';
    });

    /* Footer totals */
    html += '</tbody><tfoot><tr class="dov-mat-footer">';
    html += '<td><strong>' + esc(T({ vi: 'Tổng cộng', en: 'Grand Total' })) + '</strong></td>';
    colDefs.forEach(function (c) {
      var sum = GROUPS.reduce(function (acc, g) { return acc + g[c.key]; }, 0);
      html += '<td style="text-align:center;font-size:14px">' + sum + '</td>';
    });
    html += '<td style="text-align:center;font-size:15px">' + grandTotal() + '</td>';
    html += '</tr></tfoot></table></div>';

    canvas.innerHTML = html;
  }

  /* =========================================================================
   * REGISTER WITH EQMS SHELL
   * ======================================================================= */
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['doc-overview'] = { render: render, destroy: destroy };

})();

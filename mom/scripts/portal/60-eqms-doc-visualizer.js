/**
 * Sơ đồ Tổng quan Tài liệu Vận hành — HESEM EQMS
 * HESEM MOM Portal · 60-eqms-doc-visualizer.js
 *
 * Module ID : doc-overview
 * Archetype : analytical-list
 * Load order: AFTER 40-eqms-shell.js
 *
 * Two top-level perspectives:
 *   A) Quy trình vận hành  — centered on SOP-201 (RFQ→Cash, 8 gates)
 *      · Xương cá SOP-201  — Ishikawa with G0–G7 as bones
 *      · Luồng G0→G7       — SVG gate-flow showing parallel G1∥G2
 *   B) Cấu trúc tài liệu   — organised by process group
 *      · Sơ đồ cây          — ECharts radial tree (9 groups)
 *      · Ma trận            — count table (group × doc-type)
 *
 * All live doc data from window.DOCS (scan_folders API).
 * Gate→doc mapping is static structural config derived from SOP-201 §10.
 * All navigation uses openDoc(code) / navigateTo('documents', cat).
 * All colours from GraphicsAuthority. var(--tok,#fallback) in SVG strings.
 */
(function () {
  'use strict';

  var T   = window.EqmsShell.util.T;
  var esc = window.EqmsShell.util.esc;

  /* ── Token helpers ────────────────────────────────────────────────────── */
  function tok(key, fb) {
    return (window.GraphicsAuthority && window.GraphicsAuthority.tokens.read(key, fb)) || fb;
  }
  function cv(varName, fb) { return 'var(--' + varName + ',' + fb + ')'; }

  /* ── Palette ──────────────────────────────────────────────────────────── */
  var PALETTE_KEYS = [
    { key: 'brand.primary',        fb: '#1565c0' },
    { key: 'statusColors.success', fb: '#16a34a' },
    { key: 'statusColors.purple',  fb: '#7c3aed' },
    { key: 'statusColors.warning', fb: '#d97706' },
    { key: 'brand.light',          fb: '#1e88e5' },
    { key: 'statusColors.error',   fb: '#dc2626' },
    { key: 'statusColors.cyan',    fb: '#0891b2' },
    { key: 'brand.dark',           fb: '#0c2d48' },
    { key: 'brand.accent',         fb: '#f9a825' }
  ];
  function palette(i) { var p = PALETTE_KEYS[i % PALETTE_KEYS.length]; return tok(p.key, p.fb); }

  /* =========================================================================
   * PROCESS GROUP REGISTRY (for Document Structure view)
   * ======================================================================= */
  var GROUPS = [
    { id: 100, abbr: 'SYS', label: { vi: 'Hệ thống & Quản trị',    en: 'System & Governance'   } },
    { id: 200, abbr: 'COM', label: { vi: 'Thương mại & Khách hàng', en: 'Commercial & Customer'  } },
    { id: 300, abbr: 'ENG', label: { vi: 'Kỹ thuật & FAI',          en: 'Engineering & FAI'      } },
    { id: 400, abbr: 'SUP', label: { vi: 'Nhà cung cấp & Mua hàng', en: 'Supplier & Purchasing'  } },
    { id: 500, abbr: 'PRD', label: { vi: 'Sản xuất CNC',            en: 'CNC Production'         } },
    { id: 600, abbr: 'QC',  label: { vi: 'Kiểm tra & Chất lượng',   en: 'Inspection & Quality'   } },
    { id: 700, abbr: 'LOG', label: { vi: 'Đóng gói & Logistics',    en: 'Packaging & Logistics'  } },
    { id: 800, abbr: 'HR',  label: { vi: 'Con người & EHS',         en: 'People & EHS'           } },
    { id: 900, abbr: 'IMP', label: { vi: 'Cải tiến liên tục',       en: 'Continuous Improvement' } }
  ];

  var DOC_CATS = ['SOP', 'WI', 'ANNEX', 'FRM'];

  /* =========================================================================
   * GATE REGISTRY (SOP-201 §6 + §10 — static structural config)
   * Docs listed are the minimum required evidence per gate as specified in
   * SOP-201. Counts/paths are NOT hardcoded — openDocSafe() resolves live.
   * ======================================================================= */
  var GATES = [
    {
      id: 'G0',
      label:  { vi: 'G0 · Hợp đồng',  en: 'G0 · Contract'   },
      short:  { vi: 'Hợp đồng',        en: 'Contract'         },
      role:   'CS + D-SCS',
      dept:   { vi: 'Sales / Báo giá', en: 'Sales / Quoting'  },
      desc:   { vi: 'Rà soát & khóa cam kết thương mại, kỹ thuật, năng lực trước khi nhận PO',
                en: 'Lock commercial, technical & capacity commitment before accepting PO' },
      docs:   ['SOP-201','FRM-201','FRM-202','FRM-204'],
      col: 0
    },
    {
      id: 'G1',
      label:  { vi: 'G1 · Kỹ thuật',  en: 'G1 · Engineering' },
      short:  { vi: 'Kỹ thuật',        en: 'Engineering'       },
      role:   'ENGM',
      dept:   { vi: 'Phòng Kỹ thuật',  en: 'Engineering'       },
      desc:   { vi: 'DFM, phát hành gói baseline (BOM, route, bản vẽ) — song song với G2',
                en: 'DFM review, baseline package release (BOM, route, drawings) — parallel with G2' },
      docs:   ['SOP-301','SOP-303'],
      parallel: 'G2',
      col: 2
    },
    {
      id: 'G2',
      label:  { vi: 'G2 · IQC',        en: 'G2 · IQC'           },
      short:  { vi: 'IQC',              en: 'IQC'                 },
      role:   'D-PUR + QCL',
      dept:   { vi: 'Mua hàng + QA',   en: 'Purchasing + QA'     },
      desc:   { vi: 'Kiểm tra nguyên vật liệu đầu vào, truy xuất — song song với G1',
                en: 'Incoming material QC, traceability — parallel with G1' },
      docs:   ['SOP-401','SOP-402'],
      parallel: 'G1',
      col: 3
    },
    {
      id: 'G3',
      label:  { vi: 'G3 · Setup',       en: 'G3 · Setup'          },
      short:  { vi: 'Setup',             en: 'Setup'                },
      role:   'PPL + OPR',
      dept:   { vi: 'Hoạch định + Sản xuất', en: 'Planning + Production' },
      desc:   { vi: 'Lập lịch, điều độ & lắp đặt setup — chỉ mở sau khi G1 và G2 hoàn tất',
                en: 'Scheduling & setup execution — opens only after both G1 and G2 complete' },
      docs:   ['SOP-501','SOP-504','ANNEX-501','WI-519'],
      col: 4
    },
    {
      id: 'G4',
      label:  { vi: 'G4 · FAI',         en: 'G4 · FAI'             },
      short:  { vi: 'FAI',               en: 'FAI'                   },
      role:   'QCL',
      dept:   { vi: 'QA / QC',           en: 'QA / QC'               },
      desc:   { vi: 'Kiểm tra & phê duyệt chi tiết đầu tiên trước sản xuất hàng loạt',
                en: 'First article inspection & approval before production run' },
      docs:   ['SOP-302','FRM-205'],
      col: 5
    },
    {
      id: 'G5',
      label:  { vi: 'G5 · IPQC',        en: 'G5 · IPQC'            },
      short:  { vi: 'IPQC',              en: 'IPQC'                  },
      role:   'QCL + OPR',
      dept:   { vi: 'QA / QC + Sản xuất', en: 'QA / QC + Production' },
      desc:   { vi: 'Kiểm soát chất lượng liên tục trong quá trình gia công CNC',
                en: 'Continuous quality control during CNC machining process' },
      docs:   ['SOP-502','SOP-503','SOP-505','WI-201'],
      col: 1
    },
    {
      id: 'G6',
      label:  { vi: 'G6 · OQC',          en: 'G6 · OQC'              },
      short:  { vi: 'OQC',               en: 'OQC'                   },
      role:   'QCL',
      dept:   { vi: 'QA / QC',           en: 'QA / QC'               },
      desc:   { vi: 'Kiểm tra xuất xưởng (OQC), phát hành CoC & chốt chất lượng trước giao hàng',
                en: 'Outgoing quality control (OQC), CoC issuance & sign-off before shipment' },
      docs:   ['SOP-603','SOP-604','SOP-605','FRM-206'],
      col: 6
    },
    {
      id: 'G7',
      label:  { vi: 'G7 · Giao hàng',   en: 'G7 · Shipment'        },
      short:  { vi: 'Giao hàng',         en: 'Shipment'              },
      role:   'D-LOG + FIN',
      dept:   { vi: 'Logistics + Tài chính', en: 'Logistics + Finance' },
      desc:   { vi: 'Đóng gói, xuất hàng, phát hành hóa đơn & đóng hồ sơ đơn hàng',
                en: 'Pack, ship, issue invoice & close job dossier' },
      docs:   ['SOP-701','WI-206','FRM-207','SOP-803'],
      col: 7
    }
  ];

  /* Cross-cutting support docs visible on all gates */
  var SUPPORT_DOCS = [
    { id: 'SYS', label: { vi: 'Hệ thống', en: 'System' },
      docs: ['SOP-101','SOP-102','WI-203','WI-202'] },
    { id: 'HR',  label: { vi: 'Con người', en: 'People' },
      docs: ['SOP-801','SOP-804','WI-207'] },
    { id: 'IMP', label: { vi: 'Cải tiến',  en: 'Improve' },
      docs: ['SOP-606','SOP-901','SOP-903'] }
  ];

  /* =========================================================================
   * LIVE DATA HELPERS
   * ======================================================================= */
  function liveDocs() {
    return (typeof DOCS !== 'undefined' && Array.isArray(DOCS)) ? DOCS : [];
  }
  function isDocsReady() {
    return typeof DOCS_LOADED !== 'undefined' && !!DOCS_LOADED;
  }
  function getGroupDocs(groupId, cat) {
    return liveDocs().filter(function (d) {
      if (!d || d.cat !== cat) return false;
      var m = String(d.code || '').match(/\d+/);
      if (!m) return false;
      return Math.floor(parseInt(m[0], 10) / 100) * 100 === groupId;
    });
  }
  function groupCatCount(g, cat) { return getGroupDocs(g.id, cat).length; }
  function totalGroupDocs(g) {
    return DOC_CATS.reduce(function (sum, cat) { return sum + groupCatCount(g, cat); }, 0);
  }
  function grandTotal() {
    return liveDocs().filter(function (d) { return d && DOC_CATS.indexOf(d.cat) >= 0; }).length;
  }
  function docTitle(d) {
    if (!d) return '';
    if (typeof getDocDisplayTitle === 'function') return getDocDisplayTitle(d);
    return d.title || d.code || '';
  }
  function openDocSafe(code) {
    if (typeof openDoc === 'function') { openDoc(code); return; }
    var d = liveDocs().find(function (x) { return x && x.code === code; });
    if (d && d.path) window.open(d.path, '_blank');
  }
  function navToCat(cat) {
    if (typeof navigateTo === 'function') navigateTo('documents', cat);
  }
  function liveDocForCode(code) {
    return liveDocs().find(function (d) { return d && d.code === code; }) || null;
  }
  function catOfCode(code) {
    var m = String(code || '').match(/^([A-Z]+)-/);
    return m ? m[1] : '';
  }

  /* ── State ────────────────────────────────────────────────────────────── */
  var state = {
    mode: 'process',        // 'process' | 'doc'
    processView: 'fishbone201', // 'fishbone201' | 'gateflow'
    docView: 'mindmap',     // 'mindmap' | 'matrix'
    selectedGate: null,     // GATES index (process mode)
    selectedGroup: null,    // GROUPS index (doc mode fishbone legacy)
    detailCat: 'SOP',
    charts: {}
  };
  var _root        = null;
  var _retryTimer  = null;

  /* =========================================================================
   * CSS INJECTION (idempotent)
   * ======================================================================= */
  (function injectStyles() {
    if (document.getElementById('dov-styles')) return;
    var s = document.createElement('style');
    s.id = 'dov-styles';
    s.textContent = [
      /* layout */
      '.dov-wrap{display:flex;flex-direction:column;min-height:0}',
      '.dov-header{padding:20px 24px 0}',
      '.dov-title{font-size:20px;font-weight:700;color:var(--text-primary,#1e293b);margin:0 0 4px}',
      '.dov-subtitle{font-size:13px;color:var(--text-secondary,#64748b);margin:0 0 8px}',
      '.dov-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;color:var(--text-secondary,#64748b);font-size:14px}',
      '.dov-spinner{width:28px;height:28px;border:3px solid var(--border,#e2e8f0);border-top-color:var(--brand-primary,#1565c0);border-radius:50%;animation:dov-spin 0.8s linear infinite}',
      '@keyframes dov-spin{to{transform:rotate(360deg)}}',
      /* mode switcher */
      '.dov-modes{display:flex;gap:6px;padding:12px 24px 0}',
      '.dov-mode-btn{padding:7px 16px;border-radius:8px;border:1.5px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc);font-size:13px;font-weight:600;color:var(--text-secondary,#64748b);cursor:pointer;transition:all 0.15s}',
      '.dov-mode-btn:hover{border-color:var(--brand-primary,#1565c0);color:var(--brand-primary,#1565c0)}',
      '.dov-mode-btn--active{background:var(--brand-primary,#1565c0);color:#fff;border-color:var(--brand-primary,#1565c0)}',
      '.dov-mode-btn--active:hover{background:var(--brand-primary,#1565c0);color:#fff}',
      /* sub-tabs */
      '.dov-tabs{display:flex;gap:4px;padding:10px 24px 0;border-bottom:1px solid var(--border,#e2e8f0);overflow-x:auto}',
      '.dov-tab{display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-secondary,#64748b);white-space:nowrap;transition:color 0.15s,border-color 0.15s}',
      '.dov-tab:hover{color:var(--brand-primary,#1565c0)}',
      '.dov-tab--active{color:var(--brand-primary,#1565c0);border-bottom-color:var(--brand-primary,#1565c0)}',
      '.dov-tab-icon{font-size:16px;line-height:1}',
      /* canvas */
      '.dov-canvas{padding:20px 24px;overflow:auto}',
      '.dov-chart-box{height:540px;position:relative}',
      /* mindmap legend */
      '.dov-chart-legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;padding:10px 0}',
      '.dov-legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary,#64748b)}',
      '.dov-legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}',
      /* fishbone SVG */
      '.dov-fishbone-wrap{overflow-x:auto}',
      '.dov-fishbone-svg{width:100%;max-width:1010px;min-width:700px;height:auto;display:block}',
      '.dov-bone{stroke-linecap:round}',
      '.dov-gate-lbl{outline:none;cursor:pointer}',
      '.dov-gate-lbl:focus rect,.dov-gate-lbl:hover rect{filter:brightness(1.08)}',
      /* gate flow SVG */
      '.dov-gateflow-wrap{overflow-x:auto}',
      '.dov-gateflow-svg{width:100%;max-width:1010px;min-width:760px;height:auto;display:block}',
      '.dov-gf-node{cursor:pointer;outline:none}',
      '.dov-gf-node:hover rect,.dov-gf-node:hover circle{filter:brightness(1.1)}',
      /* detail panel (shared) */
      '.dov-detail-panel{margin-top:16px;padding:18px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px}',
      '.dov-detail-hint{color:var(--text-tertiary,#94a3b8);font-size:13px;text-align:center;padding:20px 0}',
      '.dov-detail-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}',
      '.dov-detail-badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;color:#fff;letter-spacing:.3px}',
      '.dov-detail-name{font-size:16px;font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-detail-role{font-size:12px;color:var(--text-secondary,#64748b);margin-bottom:6px}',
      '.dov-detail-desc{font-size:13px;color:var(--text-secondary,#64748b);margin-bottom:14px;line-height:1.6}',
      '.dov-doc-list{display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto}',
      '.dov-doc-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;font-size:13px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);cursor:pointer;transition:background 0.12s}',
      '.dov-doc-item:hover{background:var(--bg-hover,#f8fafc);border-color:var(--brand-primary,#1565c0)}',
      '.dov-doc-code{font-family:monospace;font-size:11px;font-weight:700;color:var(--text-secondary,#64748b);min-width:62px;flex-shrink:0}',
      '.dov-doc-cat{padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}',
      '.dov-doc-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary,#1e293b)}',
      /* doc-structure detail tabs */
      '.dov-cat-tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}',
      '.dov-cat-btn{padding:4px 10px;border-radius:6px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f1f5f9);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.12s}',
      '.dov-cat-btn--active,.dov-cat-btn:hover{background:var(--brand-primary,#1565c0);color:#fff;border-color:var(--brand-primary,#1565c0)}',
      '.dov-browse-btn{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);background:var(--bg-surface,#fff);cursor:pointer;margin-top:10px;transition:border-color 0.12s,color 0.12s}',
      '.dov-browse-btn:hover{border-color:var(--brand-primary,#1565c0);color:var(--brand-primary,#1565c0)}',
      /* matrix */
      '.dov-matrix-wrap{overflow-x:auto}',
      '.dov-matrix-table{width:100%;border-collapse:collapse;font-size:13px;background:var(--bg-surface,#fff);border-radius:8px;overflow:hidden;border:1px solid var(--border,#e2e8f0)}',
      '.dov-matrix-table th{padding:10px 14px;background:var(--bg-surface-alt,#f1f5f9);font-weight:600;color:var(--text-secondary,#64748b);text-align:left;white-space:nowrap;border-bottom:1px solid var(--border,#e2e8f0)}',
      '.dov-matrix-table td{padding:9px 14px;border-bottom:1px solid var(--border,#e2e8f0);vertical-align:middle}',
      '.dov-matrix-table tr:last-child td{border-bottom:none}',
      '.dov-matrix-table tr:hover td{background:var(--bg-hover,#f8fafc)}',
      '.dov-mat-group{display:flex;align-items:center;gap:8px}',
      '.dov-mat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}',
      '.dov-mat-cell{display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:3px 8px;border-radius:5px;font-weight:700;font-size:13px;cursor:pointer;transition:opacity 0.12s}',
      '.dov-mat-cell:hover{opacity:0.75}',
      '.dov-mat-cell-zero{color:var(--text-tertiary,#94a3b8)}',
      '.dov-mat-total{font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-mat-footer td{background:var(--bg-surface-alt,#f1f5f9);font-weight:700;border-top:2px solid var(--border,#e2e8f0)}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  /* =========================================================================
   * RENDER ENTRY
   * ======================================================================= */
  function render(container) {
    _root = container;
    if (_retryTimer) { clearInterval(_retryTimer); _retryTimer = null; }
    if (!isDocsReady()) {
      container.innerHTML =
        '<div class="dov-loading"><div class="dov-spinner"></div><span>' +
        esc(T({ vi: 'Đang tải danh mục tài liệu…', en: 'Loading document catalog…' })) +
        '</span></div>';
      _retryTimer = setInterval(function () {
        if (isDocsReady() && _root) { clearInterval(_retryTimer); _retryTimer = null; render(_root); }
      }, 600);
      return;
    }
    container.innerHTML = buildShell();
    bindAllEvents(container);
    renderView(container);
  }

  /* ── Shell HTML ──────────────────────────────────────────────────────── */
  function buildShell() {
    var total = grandTotal();
    var html = '<div class="dov-wrap">';
    html += '<div class="dov-header">';
    html += '<h2 class="dov-title">' +
      esc(T({ vi: 'Sơ đồ Tổng quan Tài liệu Vận hành', en: 'Operational Document Visual Map' })) + '</h2>';
    html += '<p class="dov-subtitle">9 ' +
      esc(T({ vi: 'nhóm quy trình', en: 'process groups' })) + ' · <strong>' + total + '</strong> ' +
      esc(T({ vi: 'tài liệu kiểm soát (SOP + WI + ANNEX + FRM)', en: 'controlled documents (SOP + WI + ANNEX + FRM)' })) +
      '</p>';
    html += '</div>';

    /* Mode switcher */
    html += '<div class="dov-modes">';
    [
      { id: 'process', icon: '🔄', label: { vi: 'Quy trình vận hành', en: 'Operational Process' } },
      { id: 'doc',     icon: '📚', label: { vi: 'Cấu trúc tài liệu',  en: 'Document Structure'  } }
    ].forEach(function (m) {
      var act = state.mode === m.id ? ' dov-mode-btn--active' : '';
      html += '<button class="dov-mode-btn' + act + '" data-dov-mode="' + m.id + '">' +
        m.icon + ' ' + esc(T(m.label)) + '</button>';
    });
    html += '</div>';

    /* Sub-tabs */
    html += '<div class="dov-tabs" id="dov-subtabs">' + buildSubTabs() + '</div>';
    html += '<div class="dov-canvas" id="dov-canvas"></div>';
    html += '</div>';
    return html;
  }

  function buildSubTabs() {
    var tabs = state.mode === 'process'
      ? [
          { id: 'fishbone201', icon: '🐟', label: { vi: 'Xương cá SOP-201', en: 'SOP-201 Fishbone' } },
          { id: 'gateflow',    icon: '➡',  label: { vi: 'Luồng G0→G7',      en: 'Gate Flow G0→G7'  } }
        ]
      : [
          { id: 'mindmap', icon: '🗺', label: { vi: 'Sơ đồ cây', en: 'Tree Map' } },
          { id: 'matrix',  icon: '📊', label: { vi: 'Ma trận',   en: 'Matrix'   } }
        ];
    var activeView = state.mode === 'process' ? state.processView : state.docView;
    return tabs.map(function (t) {
      var act = activeView === t.id ? ' dov-tab--active' : '';
      return '<button class="dov-tab' + act + '" data-dov-tab="' + t.id + '">' +
        '<span class="dov-tab-icon">' + t.icon + '</span>' + esc(T(t.label)) + '</button>';
    }).join('');
  }

  /* ── Event binding ────────────────────────────────────────────────────── */
  function bindAllEvents(root) {
    /* Mode switcher */
    root.querySelectorAll('[data-dov-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var m = btn.getAttribute('data-dov-mode');
        if (m === state.mode) return;
        state.mode = m;
        state.selectedGate = null;
        state.selectedGroup = null;
        disposeCharts();
        /* Refresh sub-tabs */
        var stEl = root.querySelector('#dov-subtabs');
        if (stEl) stEl.innerHTML = buildSubTabs();
        /* Re-bind (new sub-tab buttons) */
        bindAllEvents(root);
        /* Highlight active mode button */
        root.querySelectorAll('[data-dov-mode]').forEach(function (b) {
          b.classList.toggle('dov-mode-btn--active', b.getAttribute('data-dov-mode') === state.mode);
        });
        renderView(root);
      });
    });

    /* Sub-tab switcher */
    root.querySelectorAll('[data-dov-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-dov-tab');
        var cur = state.mode === 'process' ? state.processView : state.docView;
        if (v === cur) return;
        if (state.mode === 'process') state.processView = v;
        else state.docView = v;
        state.selectedGate = null;
        state.selectedGroup = null;
        disposeCharts();
        root.querySelectorAll('[data-dov-tab]').forEach(function (b) {
          b.classList.toggle('dov-tab--active', b.getAttribute('data-dov-tab') === v);
        });
        renderView(root);
      });
    });
  }

  function disposeCharts() {
    Object.keys(state.charts).forEach(function (k) {
      try { state.charts[k].dispose(); } catch (e) {}
    });
    state.charts = {};
  }

  /* ── View router ──────────────────────────────────────────────────────── */
  function renderView(root) {
    var canvas = root.querySelector('#dov-canvas');
    if (!canvas) return;
    var view = state.mode === 'process' ? state.processView : state.docView;
    if      (view === 'fishbone201') renderFishboneSOP201(canvas);
    else if (view === 'gateflow')    renderGateFlow(canvas);
    else if (view === 'mindmap')     renderMindmap(canvas);
    else if (view === 'matrix')      renderMatrix(canvas);
  }

  function destroy() {
    if (_retryTimer) { clearInterval(_retryTimer); _retryTimer = null; }
    disposeCharts();
    _root = null;
  }

  /* =========================================================================
   * VIEW A1 — FISHBONE SOP-201
   * 8 gates as bones (4 top / 4 bottom), centered on "Đơn hàng xuất sắc"
   * Click on bone → gate detail panel
   * ======================================================================= */
  function renderFishboneSOP201(canvas) {
    var W = 1010, H = 650, spineY = 325;
    var tipTopY = 104, tipBotY = 546;

    /* Wider x-span (120px) so sub-branches have room along each bone */
    var topGates = [0, 1, 3, 5];
    var topSX    = [208, 368, 528, 688];  /* spine junction X = tipX + 120 */
    var topTX    = [88,  248, 408, 568];  /* bone tip X */

    var botGates = [2, 4, 6, 7];
    var botSX    = [283, 428, 588, 748];
    var botTX    = [163, 308, 468, 628];

    /* Category accent colors for doc code sub-branch labels */
    var CAT_COL = { SOP: '#1565c0', WI: '#16a34a', ANNEX: '#7c3aed', FRM: '#d97706' };

    var bp = cv('brand-primary', '#1565c0');
    var s = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="dov-fishbone-svg">';

    s += '<defs>';
    s += '<marker id="dovArr201" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">';
    s += '<path d="M0,0 L10,5 L0,10 Z" fill="' + bp + '"/></marker>';
    s += '</defs>';

    /* Spine */
    s += '<line x1="72" y1="' + spineY + '" x2="838" y2="' + spineY +
         '" stroke="' + bp + '" stroke-width="3.5" stroke-linecap="round" marker-end="url(#dovArr201)"/>';

    /* RFQ tail */
    s += '<rect x="4" y="' + (spineY - 20) + '" width="66" height="40" rx="8"' +
         ' fill="' + bp + '" fill-opacity="0.1" stroke="' + bp + '" stroke-width="1.5"/>';
    s += '<text x="37" y="' + (spineY - 4) + '" text-anchor="middle" font-size="10"' +
         ' font-weight="700" fill="' + bp + '" font-family="inherit">RFQ</text>';
    s += '<text x="37" y="' + (spineY + 10) + '" text-anchor="middle" font-size="9"' +
         ' fill="' + bp + '" font-family="inherit" opacity="0.8">khách hàng</text>';

    /* Head box */
    s += '<rect x="842" y="' + (spineY - 54) + '" width="162" height="108" rx="12" fill="' + bp + '"/>';
    s += '<text x="923" y="' + (spineY - 27) + '" text-anchor="middle" font-size="11.5"' +
         ' font-weight="700" fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">Sản phẩm CNC</text>';
    s += '<text x="923" y="' + (spineY - 10) + '" text-anchor="middle" font-size="11"' +
         ' font-weight="600" fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">đúng chất lượng</text>';
    s += '<text x="923" y="' + (spineY + 8) + '" text-anchor="middle" font-size="10.5"' +
         ' fill="rgba(255,255,255,0.85)" font-family="inherit">đúng số lượng</text>';
    s += '<text x="923" y="' + (spineY + 25) + '" text-anchor="middle" font-size="10.5"' +
         ' fill="rgba(255,255,255,0.85)" font-family="inherit">giao đúng hạn</text>';

    /* Spine label */
    s += '<text x="76" y="' + (spineY - 12) + '" font-size="10.5" font-weight="700"' +
         ' fill="' + bp + '" font-family="inherit" opacity="0.7">SOP-201 · Luồng RFQ → Cash</text>';

    function drawGateBone(gi, sx, tx, ty, isTop) {
      var gate = GATES[gi];
      var col  = palette(gate.col);
      var n    = gate.docs.length;

      /* Compact card: header(20) + short-name(16) + role(14) + pad(4) = 54 */
      var lbW = 112, lbH = 54, hdrH = 20;
      var lbX = tx - lbW / 2;
      var lbY = isTop ? ty - lbH - 8 : ty + 8;

      /* Main bone */
      s += '<line x1="' + tx + '" y1="' + ty + '" x2="' + sx + '" y2="' + spineY +
           '" stroke="' + col + '" stroke-width="2.5" class="dov-bone"/>';

      /* Perpendicular unit vector — points away from spine */
      var boneVecX = sx - tx;
      var boneVecY = spineY - ty;
      var boneLen  = Math.sqrt(boneVecX * boneVecX + boneVecY * boneVecY);
      var perpX    = isTop ?  boneVecY / boneLen : -boneVecY / boneLen;
      var perpY    = isTop ? -boneVecX / boneLen :  boneVecX / boneLen;

      /* Sub-branches — one per doc, staggered along the bone */
      for (var k = 0; k < n; k++) {
        var t  = 0.22 + k * (0.56 / Math.max(n - 1, 1));
        var bx = tx + t * boneVecX;
        var by = ty + t * boneVecY;
        var ex = bx + perpX * 30;
        var ey = by + perpY * 30;
        var code = gate.docs[k];
        var ccat = catOfCode(code);
        var cc   = CAT_COL[ccat] || col;
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + ex + '" y2="' + ey +
             '" stroke="' + cc + '" stroke-width="1.5" opacity="0.85"/>';
        s += '<circle cx="' + bx + '" cy="' + by + '" r="2.5" fill="' + cc + '" opacity="0.7"/>';
        var textY = isTop ? ey - 2 : ey + 9;
        s += '<text x="' + ex + '" y="' + textY + '" font-size="7.5" font-weight="700"' +
             ' font-family="monospace" fill="' + cc + '" text-anchor="middle">' + esc(code) + '</text>';
      }

      /* Junction dot */
      s += '<circle cx="' + sx + '" cy="' + spineY + '" r="5.5" fill="' + col + '"/>';

      /* ── Compact white card label box ── */
      s += '<g class="dov-gate-lbl" data-gi="' + gi + '" role="button" tabindex="0" aria-label="' + esc(T(gate.label)) + '">';
      if (gate.parallel) s += '<title>' + gate.id + ' ∥ ' + gate.parallel + '</title>';

      s += '<rect x="' + lbX + '" y="' + lbY + '" width="' + lbW + '" height="' + lbH +
           '" rx="9" fill="' + cv('bg-surface', '#fff') + '" stroke="' + col + '" stroke-width="1.5"/>';
      s += '<rect x="' + lbX + '" y="' + lbY + '" width="' + lbW + '" height="' + hdrH +
           '" rx="9" fill="' + col + '"/>';
      s += '<rect x="' + lbX + '" y="' + (lbY + 10) + '" width="' + lbW + '" height="' + (hdrH - 10) +
           '" fill="' + col + '"/>';
      s += '<text x="' + (lbX + 7) + '" y="' + (lbY + 14) + '" font-size="10.5" font-weight="800"' +
           ' fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">' + esc(gate.id) + '</text>';
      if (gate.parallel) {
        s += '<text x="' + (lbX + lbW - 6) + '" y="' + (lbY + 14) + '" text-anchor="end" font-size="8.5"' +
             ' fill="rgba(255,255,255,0.9)" font-family="inherit" font-weight="600">∥' + gate.parallel + '</text>';
      }
      s += '<text x="' + tx + '" y="' + (lbY + hdrH + 14) + '" text-anchor="middle" font-size="11"' +
           ' font-weight="700" fill="' + col + '" font-family="inherit">' + esc(T(gate.short)) + '</text>';
      s += '<text x="' + tx + '" y="' + (lbY + hdrH + 28) + '" text-anchor="middle" font-size="8.5"' +
           ' fill="' + col + '" font-family="inherit" opacity="0.72">' + esc(gate.role) + '</text>';

      s += '</g>';
    }

    topGates.forEach(function (gi, i) { drawGateBone(gi, topSX[i], topTX[i], tipTopY, true); });
    botGates.forEach(function (gi, i) { drawGateBone(gi, botSX[i], botTX[i], tipBotY, false); });

    s += '</svg>';

    s += '<div class="dov-detail-panel" id="dov-gate-panel">' +
         '<p class="dov-detail-hint">' +
         esc(T({ vi: 'Nhấn vào cổng kiểm soát để xem tài liệu liên quan', en: 'Click a control gate to view linked documents' })) +
         '</p></div>';

    canvas.innerHTML = '<div class="dov-fishbone-wrap">' + s + '</div>';

    canvas.querySelectorAll('.dov-gate-lbl').forEach(function (el) {
      el.addEventListener('click', function () {
        showGateDetail(parseInt(el.getAttribute('data-gi')), canvas);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') showGateDetail(parseInt(el.getAttribute('data-gi')), canvas);
      });
    });
  }

  /* ── Gate detail panel ─────────────────────────────────────────────── */
  function showGateDetail(gi, canvas) {
    state.selectedGate = gi;
    renderGateDetailPanel(gi, canvas.querySelector('#dov-gate-panel'));
  }

  function renderGateDetailPanel(gi, panel) {
    if (!panel) return;
    var gate = GATES[gi];
    var col  = palette(gate.col);

    var html = '<div class="dov-detail-header">';
    html += '<span class="dov-detail-badge" style="background:' + col + '">' + esc(gate.id) + '</span>';
    html += '<span class="dov-detail-name">' + esc(T(gate.label)) + '</span>';
    html += '</div>';
    html += '<div class="dov-detail-role">👥 ' + esc(gate.role) + ' &nbsp;·&nbsp; ' + esc(T(gate.dept)) + '</div>';
    html += '<div class="dov-detail-desc">' + esc(T(gate.desc)) + '</div>';

    html += '<div class="dov-doc-list">';
    gate.docs.forEach(function (code) {
      var live = liveDocForCode(code);
      var title = live ? docTitle(live) : code;
      var cat   = catOfCode(code);
      var catColors = { SOP:'#1565c0', WI:'#16a34a', ANNEX:'#7c3aed', FRM:'#d97706' };
      var cc = catColors[cat] || '#64748b';
      html += '<div class="dov-doc-item" data-doc-code="' + esc(code) + '">' +
              '<span class="dov-doc-code">' + esc(code) + '</span>' +
              '<span class="dov-doc-cat" style="background:' + cc + '">' + esc(cat || '?') + '</span>' +
              '<span class="dov-doc-title" title="' + esc(title) + '">' + esc(title) + '</span>' +
              '</div>';
    });
    html += '</div>';

    /* Parallel note */
    if (gate.parallel) {
      html += '<p style="margin-top:10px;font-size:12px;color:var(--text-secondary,#64748b)">⚡ ' +
        esc(T({ vi: 'Cổng này thực hiện song song với ' + gate.parallel,
                en: 'This gate runs in parallel with ' + gate.parallel })) + '</p>';
    }

    panel.innerHTML = html;

    /* Bind doc item clicks */
    panel.querySelectorAll('[data-doc-code]').forEach(function (el) {
      el.addEventListener('click', function () { openDocSafe(el.getAttribute('data-doc-code')); });
    });
  }

  /* =========================================================================
   * VIEW A2 — GATE FLOW (SVG, G0→G7 with parallel G1∥G2)
   * ======================================================================= */
  function renderGateFlow(canvas) {
    var W = 1010, H = 340, midY = 170;
    var G1Y = 95, G2Y = 245;
    var bW = 90, bH = 44; /* box width/height */

    /* Gate box center X positions */
    var cx = { G0:135, G1:280, G2:280, G3:430, G4:545, G5:660, G6:775, G7:895 };

    var s = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="dov-gateflow-svg">';

    /* Arrowhead */
    s += '<defs><marker id="dovGfArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">';
    s += '<path d="M0,0 L10,5 L0,10 Z" fill="' + cv('text-secondary', '#64748b') + '"/></marker></defs>';

    function arrow(x1, y1, x2, y2) {
      var col = cv('text-tertiary', '#94a3b8');
      s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
           '" stroke="' + col + '" stroke-width="1.8" marker-end="url(#dovGfArr)"/>';
    }

    /* RFQ start */
    var bp = cv('brand-primary', '#1565c0');
    s += '<circle cx="50" cy="' + midY + '" r="30" fill="' + bp + '" fill-opacity="0.1" stroke="' + bp + '" stroke-width="1.5"/>';
    s += '<text x="50" y="' + (midY - 6) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + bp + '" font-family="inherit">RFQ</text>';
    s += '<text x="50" y="' + (midY + 8) + '" text-anchor="middle" font-size="9" fill="' + bp + '" font-family="inherit">KH</text>';

    /* Parallel G1∥G2 background zone */
    s += '<rect x="232" y="65" width="96" height="210" rx="10" fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.18)" stroke-dasharray="5,3" stroke-width="1.2"/>';
    s += '<text x="280" y="58" text-anchor="middle" font-size="9.5" fill="' + cv('text-tertiary', '#94a3b8') + '" font-family="inherit" font-weight="600">Song song</text>';

    /* Gate boxes */
    function gateBox(gateId, centerX, centerY) {
      var gi  = GATES.findIndex(function (g) { return g.id === gateId; });
      if (gi < 0) return;
      var gate = GATES[gi];
      var col  = palette(gate.col);
      var x    = centerX - bW / 2;
      var y    = centerY - bH / 2;
      s += '<g class="dov-gf-node" data-gi="' + gi + '" role="button" tabindex="0" aria-label="' + esc(T(gate.label)) + '">';
      s += '<rect x="' + x + '" y="' + y + '" width="' + bW + '" height="' + bH +
           '" rx="8" fill="' + col + '" fill-opacity="0.13" stroke="' + col + '" stroke-width="1.8"/>';
      /* Top strip */
      s += '<rect x="' + x + '" y="' + y + '" width="' + bW + '" height="16" rx="8" fill="' + col + '"/>';
      s += '<rect x="' + x + '" y="' + (y + 8) + '" width="' + bW + '" height="8" fill="' + col + '"/>';
      /* Gate ID */
      s += '<text x="' + centerX + '" y="' + (y + 12) + '" text-anchor="middle" font-size="10" font-weight="800" fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">' + esc(gateId) + '</text>';
      /* Short label */
      s += '<text x="' + centerX + '" y="' + (y + 31) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + col + '" font-family="inherit">' + esc(T(gate.short)) + '</text>';
      s += '</g>';
    }

    gateBox('G0', cx.G0, midY);
    gateBox('G1', cx.G1, G1Y);
    gateBox('G2', cx.G2, G2Y);
    gateBox('G3', cx.G3, midY);
    gateBox('G4', cx.G4, midY);
    gateBox('G5', cx.G5, midY);
    gateBox('G6', cx.G6, midY);
    gateBox('G7', cx.G7, midY);

    /* Arrows */
    arrow(80, midY, cx.G0 - bW / 2 - 2, midY);                              /* RFQ → G0 */
    arrow(cx.G0 + bW / 2, midY, cx.G1 - bW / 2 - 2, G1Y);                  /* G0 → G1  */
    arrow(cx.G0 + bW / 2, midY, cx.G2 - bW / 2 - 2, G2Y);                  /* G0 → G2  */
    arrow(cx.G1 + bW / 2, G1Y, cx.G3 - bW / 2 - 2, midY);                  /* G1 → G3  */
    arrow(cx.G2 + bW / 2, G2Y, cx.G3 - bW / 2 - 2, midY);                  /* G2 → G3  */
    arrow(cx.G3 + bW / 2 + 2, midY, cx.G4 - bW / 2 - 2, midY);             /* G3 → G4  */
    arrow(cx.G4 + bW / 2 + 2, midY, cx.G5 - bW / 2 - 2, midY);             /* G4 → G5  */
    arrow(cx.G5 + bW / 2 + 2, midY, cx.G6 - bW / 2 - 2, midY);             /* G5 → G6  */
    arrow(cx.G6 + bW / 2 + 2, midY, cx.G7 - bW / 2 - 2, midY);             /* G6 → G7  */

    /* Cash end */
    var cashX = 975;
    arrow(cx.G7 + bW / 2 + 2, midY, cashX - 30, midY);                      /* G7 → 💰  */
    s += '<circle cx="' + cashX + '" cy="' + midY + '" r="28" fill="' + cv('statusColors-success', '#16a34a') + '" fill-opacity="0.12" stroke="' + cv('statusColors-success', '#16a34a') + '" stroke-width="1.5"/>';
    s += '<text x="' + cashX + '" y="' + (midY - 5) + '" text-anchor="middle" font-size="14" font-family="inherit">💰</text>';
    s += '<text x="' + cashX + '" y="' + (midY + 12) + '" text-anchor="middle" font-size="9" font-weight="700" fill="' + cv('statusColors-success', '#16a34a') + '" font-family="inherit">Cash</text>';

    s += '</svg>';

    /* Gate detail panel */
    s += '<div class="dov-detail-panel" id="dov-gf-panel">' +
         '<p class="dov-detail-hint">' +
         esc(T({ vi: 'Nhấn vào cổng kiểm soát để xem tài liệu & vai trò', en: 'Click a control gate to view documents & roles' })) +
         '</p></div>';

    canvas.innerHTML = '<div class="dov-gateflow-wrap">' + s + '</div>';

    canvas.querySelectorAll('.dov-gf-node').forEach(function (el) {
      el.addEventListener('click', function () {
        var gi = parseInt(el.getAttribute('data-gi'));
        showGateDetail(gi, { querySelector: function (sel) { return canvas.querySelector('#dov-gf-panel'); } });
        renderGateDetailPanel(gi, canvas.querySelector('#dov-gf-panel'));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          renderGateDetailPanel(parseInt(el.getAttribute('data-gi')), canvas.querySelector('#dov-gf-panel'));
        }
      });
    });
  }

  /* =========================================================================
   * VIEW B1 — MINDMAP (ECharts radial tree, by process group)
   * ======================================================================= */
  function renderMindmap(canvas) {
    if (!window.echarts) {
      canvas.innerHTML = '<p style="padding:24px;color:var(--text-secondary,#64748b)">ECharts chưa tải.</p>';
      return;
    }
    var treeData = {
      name: 'HESEM\nQMS',
      children: GROUPS.map(function (g, i) {
        var col   = palette(i);
        var cats  = DOC_CATS.filter(function (c) { return groupCatCount(g, c) > 0; });
        var total = totalGroupDocs(g);
        return {
          name: g.abbr + '\n' + T(g.label),
          itemStyle: { color: col },
          label: { color: col },
          value: total,
          children: cats.map(function (cat) {
            var cnt = groupCatCount(g, cat);
            return {
              name: cat + ' ×' + cnt,
              value: cnt,
              itemStyle: { color: col, opacity: 0.8 },
              label: { color: col },
              cat: cat
            };
          })
        };
      })
    };

    var el = document.createElement('div');
    el.style.cssText = 'height:680px;width:100%';
    var legendHtml = '<div class="dov-chart-legend">' +
      GROUPS.map(function (g, i) {
        return '<span class="dov-legend-item"><span class="dov-legend-dot" style="background:' + palette(i) + '"></span>' +
               esc(g.abbr + ' — ' + T(g.label)) + '</span>';
      }).join('') + '</div>';
    canvas.innerHTML = '';
    canvas.appendChild(el);
    canvas.insertAdjacentHTML('beforeend', legendHtml);

    var chart = window.echarts.init(el, null, { renderer: 'canvas' });
    state.charts['mindmap'] = chart;
    chart.setOption({
      series: [{
        type: 'tree',
        data: [treeData],
        top: '3%', bottom: '3%', left: '18%', right: '22%',
        layout: 'orthogonal',
        orient: 'LR',
        symbol: 'emptyCircle',
        symbolSize: function (v) { return v ? Math.min(8 + v * 0.1, 18) : 7; },
        initialTreeDepth: 2,
        expandAndCollapse: true,
        lineStyle: { color: '#e2e8f0', width: 1.5, curveness: 0.5 },
        label: {
          position: 'left', fontSize: 12, fontWeight: '700',
          formatter: function (p) { return p.data.name; }
        },
        leaves: {
          label: { position: 'right', fontSize: 10, fontWeight: '600' }
        }
      }]
    });

    chart.on('click', function (p) {
      if (p.data && p.data.cat) navToCat(p.data.cat);
    });
  }

  /* =========================================================================
   * VIEW B2 — MATRIX (count table, group × doc-type)
   * ======================================================================= */
  function renderMatrix(canvas) {
    var catColors = { SOP: '#1565c0', WI: '#16a34a', ANNEX: '#7c3aed', FRM: '#d97706' };
    var counts = GROUPS.map(function (g, i) {
      var row = { label: T(g.label), abbr: g.abbr, color: palette(i), total: totalGroupDocs(g) };
      DOC_CATS.forEach(function (cat) { row[cat] = groupCatCount(g, cat); });
      return row;
    });

    var html = '<div class="dov-matrix-wrap"><table class="dov-matrix-table"><thead><tr>';
    html += '<th>' + esc(T({ vi: 'Nhóm quy trình', en: 'Process Group' })) + '</th>';
    DOC_CATS.forEach(function (cat) {
      html += '<th style="text-align:center;color:' + (catColors[cat] || '#64748b') + '">' + cat + '</th>';
    });
    html += '<th style="text-align:center">' + esc(T({ vi: 'Tổng', en: 'Total' })) + '</th>';
    html += '</tr></thead><tbody>';

    counts.forEach(function (row) {
      html += '<tr>';
      html += '<td><div class="dov-mat-group"><span class="dov-mat-dot" style="background:' + row.color + '"></span><strong style="color:' + row.color + '">' + esc(row.abbr) + '</strong>&nbsp;' + esc(row.label) + '</div></td>';
      DOC_CATS.forEach(function (cat) {
        var n = row[cat];
        if (n === 0) {
          html += '<td style="text-align:center"><span class="dov-mat-cell-zero">—</span></td>';
        } else {
          var cc = catColors[cat] || '#64748b';
          html += '<td style="text-align:center"><span class="dov-mat-cell" style="background:' + cc + '18;color:' + cc + '" data-nav-cat="' + cat + '">' + n + '</span></td>';
        }
      });
      html += '<td style="text-align:center"><span class="dov-mat-total">' + row.total + '</span></td>';
      html += '</tr>';
    });

    /* Footer row */
    html += '</tbody><tfoot><tr class="dov-mat-footer">';
    html += '<td><strong>' + esc(T({ vi: 'Tổng cộng', en: 'Grand Total' })) + '</strong></td>';
    DOC_CATS.forEach(function (cat) {
      var sum = counts.reduce(function (acc, r) { return acc + r[cat]; }, 0);
      html += '<td style="text-align:center;font-size:14px">' + sum + '</td>';
    });
    html += '<td style="text-align:center;font-size:15px">' + grandTotal() + '</td>';
    html += '</tr></tfoot></table></div>';

    canvas.innerHTML = html;

    canvas.querySelectorAll('[data-nav-cat]').forEach(function (el) {
      el.addEventListener('click', function () { navToCat(el.getAttribute('data-nav-cat')); });
    });
  }

  /* =========================================================================
   * REGISTER WITH EQMS SHELL + PORTAL
   * ======================================================================= */
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['doc-overview'] = { render: render, destroy: destroy };

  /* Top-level portal page hooks (used by navigateTo('doc-overview')) */
  window._renderDocOverview  = render;
  window._destroyDocOverview = destroy;

})();

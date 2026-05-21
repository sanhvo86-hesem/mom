/**
 * Sơ đồ Tổng quan Tài liệu Vận hành — HESEM EQMS
 * HESEM MOM Portal · 60-eqms-doc-visualizer.js
 *
 * Module ID : doc-overview
 * Archetype : analytical-list
 * Load order: AFTER 40-eqms-shell.js
 *
 * Views: mindmap (ECharts tree) | fishbone (SVG Ishikawa) |
 *        flow (ECharts graph)   | matrix (HTML table)
 *
 * All data is LIVE from the portal DOCS array (scan_folders API).
 * Doc codes follow {CAT}-{NNN} convention; hundreds digit = process group.
 * All navigation uses openDoc(code) or navigateTo('documents', cat).
 *
 * All colors from GraphicsAuthority — no hex literals in logic paths.
 * var(--css-var, #fallback) used only in SVG attribute strings.
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

  /* ── Palette: one token per group ─────────────────────────────────────── */
  var PALETTE_KEYS = [
    { key: 'brand.primary',        fb: '#1565c0' }, // 100 SYS
    { key: 'statusColors.success', fb: '#16a34a' }, // 200 COM
    { key: 'statusColors.purple',  fb: '#7c3aed' }, // 300 ENG
    { key: 'statusColors.warning', fb: '#d97706' }, // 400 SUP
    { key: 'brand.light',          fb: '#1e88e5' }, // 500 PRD
    { key: 'statusColors.error',   fb: '#dc2626' }, // 600 QC
    { key: 'statusColors.cyan',    fb: '#0891b2' }, // 700 LOG
    { key: 'brand.dark',           fb: '#0c2d48' }, // 800 HR
    { key: 'brand.accent',         fb: '#f9a825' }  // 900 IMP
  ];
  function palette(i) { var p = PALETTE_KEYS[i]; return tok(p.key, p.fb); }

  /* =========================================================================
   * PROCESS GROUP REGISTRY — structural config only.
   * All counts and document lists are derived live from DOCS at render time.
   * ======================================================================= */
  var GROUPS = [
    { id: 100, abbr: 'SYS', label: { vi: 'Hệ thống & Quản trị',    en: 'System & Governance'  }, fish: { vi: 'Hệ thống quản trị',        en: 'Governance'     } },
    { id: 200, abbr: 'COM', label: { vi: 'Thương mại & Khách hàng', en: 'Commercial & Customer'}, fish: { vi: 'Thương mại / Khách hàng',   en: 'Commercial'     } },
    { id: 300, abbr: 'ENG', label: { vi: 'Kỹ thuật & FAI',          en: 'Engineering & FAI'    }, fish: { vi: 'Kỹ thuật / FAI',            en: 'Engineering'    } },
    { id: 400, abbr: 'SUP', label: { vi: 'Nhà cung cấp & Mua hàng', en: 'Supplier & Purchasing'}, fish: { vi: 'Nhà cung cấp',              en: 'Suppliers'      } },
    { id: 500, abbr: 'PRD', label: { vi: 'Sản xuất CNC',            en: 'CNC Production'       }, fish: { vi: 'Sản xuất CNC',              en: 'Production'     } },
    { id: 600, abbr: 'QC',  label: { vi: 'Kiểm tra & Chất lượng',   en: 'Inspection & Quality' }, fish: { vi: 'Đo lường / Kiểm tra',       en: 'Measurement'    } },
    { id: 700, abbr: 'LOG', label: { vi: 'Đóng gói & Logistics',    en: 'Packaging & Logistics'}, fish: { vi: 'Môi trường / Logistics',     en: 'Environment'    } },
    { id: 800, abbr: 'HR',  label: { vi: 'Con người & EHS',         en: 'People & EHS'         }, fish: { vi: 'Con người & EHS',           en: 'People'         } },
    { id: 900, abbr: 'IMP', label: { vi: 'Cải tiến liên tục',       en: 'Continuous Improvement'}, fish: { vi: 'Cải tiến liên tục',        en: 'Improvement'    } }
  ];

  var DOC_CATS = ['SOP', 'WI', 'ANNEX', 'FRM'];

  /* =========================================================================
   * LIVE DATA HELPERS
   * All queries against window.DOCS populated by api.php?action=scan_folders
   * ======================================================================= */

  /* Return the live DOCS array, or [] if not yet available */
  function liveDocs() {
    return (typeof DOCS !== 'undefined' && Array.isArray(DOCS)) ? DOCS : [];
  }

  /* True when docs have finished loading from the server */
  function isDocsReady() {
    return typeof DOCS_LOADED !== 'undefined' && !!DOCS_LOADED;
  }

  /*
   * Derive process group from a doc code.
   * Code format: {CAT}-{NNN}[...] where the 1-3 digit number after the dash
   * determines the group: floor(N / 100) * 100.
   * Examples: SOP-101 → 100, WI-452 → 400, FRM-100-003 → 100
   */
  function groupIdFromCode(code) {
    var m = String(code || '').match(/\d+/);
    if (!m) return null;
    var n = parseInt(m[0], 10);
    return Math.floor(n / 100) * 100;
  }

  /* All docs in a process group for a specific category */
  function getGroupDocs(groupId, cat) {
    return liveDocs().filter(function (d) {
      if (!d || d.cat !== cat) return false;
      return groupIdFromCode(d.code) === groupId;
    });
  }

  /* Count helper per group × category */
  function groupCatCount(g, cat) { return getGroupDocs(g.id, cat).length; }

  /* Total docs (all types) for a group */
  function totalGroupDocs(g) {
    return DOC_CATS.reduce(function (sum, cat) { return sum + groupCatCount(g, cat); }, 0);
  }

  /* Grand total across all groups and categories */
  function grandTotal() {
    return liveDocs().filter(function (d) {
      return d && DOC_CATS.indexOf(d.cat) >= 0;
    }).length;
  }

  /* Display title for a doc (uses portal helper if available) */
  function docTitle(d) {
    if (typeof getDocDisplayTitle === 'function') return getDocDisplayTitle(d);
    return String(d.standard_title || d.__displayTitle || d.title || d.code || '');
  }

  /* Safe navigation to a document — uses portal openDoc if available */
  function openDocSafe(code) {
    if (typeof openDoc === 'function') {
      openDoc(code);
    } else {
      var d = liveDocs().find(function (x) { return x && x.code === code; });
      if (d && d.path) window.open(d.path, '_blank');
    }
  }

  /* Navigate to a document category listing */
  function navToCat(cat) {
    if (typeof navigateTo === 'function') navigateTo('documents', cat);
  }

  /* ── State ────────────────────────────────────────────────────────────── */
  var state = { view: 'mindmap', selectedGroup: null, charts: {} };
  var _root = null;
  var _retryTimer = null;

  /* =========================================================================
   * CSS INJECTION (idempotent)
   * ======================================================================= */
  (function injectStyles() {
    if (document.getElementById('dov-styles')) return;
    var s = document.createElement('style');
    s.id = 'dov-styles';
    s.textContent = [
      '.dov-wrap{display:flex;flex-direction:column;min-height:0}',
      '.dov-header{padding:20px 24px 0}',
      '.dov-title{font-size:20px;font-weight:700;color:var(--text-primary,#1e293b);margin:0 0 4px}',
      '.dov-subtitle{font-size:13px;color:var(--text-secondary,#64748b);margin:0 0 8px}',
      '.dov-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:48px 24px;color:var(--text-secondary,#64748b);font-size:14px}',
      '.dov-spinner{width:28px;height:28px;border:3px solid var(--border,#e2e8f0);border-top-color:var(--brand-primary,#1565c0);border-radius:50%;animation:dov-spin 0.8s linear infinite}',
      '@keyframes dov-spin{to{transform:rotate(360deg)}}',
      '.dov-tabs{display:flex;gap:4px;padding:12px 24px 0;background:var(--bg-surface,#fff);border-bottom:1px solid var(--border,#e2e8f0);overflow-x:auto}',
      '.dov-tab{display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--text-secondary,#64748b);white-space:nowrap;transition:color 0.15s,border-color 0.15s}',
      '.dov-tab:hover{color:var(--brand-primary,#1565c0)}',
      '.dov-tab--active{color:var(--brand-primary,#1565c0);border-bottom-color:var(--brand-primary,#1565c0)}',
      '.dov-tab-icon{font-size:16px;line-height:1}',
      '.dov-canvas{padding:20px 24px;overflow:auto}',
      '.dov-chart-box{height:560px;position:relative}',
      '.dov-chart-legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;padding:10px 0}',
      '.dov-legend-item{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary,#64748b)}',
      '.dov-legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}',
      '.dov-fishbone-wrap{overflow:auto}',
      '.dov-fishbone-svg{width:100%;max-width:1000px;min-width:640px;height:auto;display:block}',
      '.dov-bone{stroke-linecap:round}',
      '.dov-bone-lbl{outline:none}',
      '.dov-bone-lbl:focus rect,.dov-bone-lbl:hover rect{filter:brightness(1.06)}',
      '.dov-bone-detail{margin-top:16px;padding:16px;background:var(--bg-surface,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;min-height:80px}',
      '.dov-detail-hint{color:var(--text-tertiary,#94a3b8);font-size:13px;text-align:center;padding:20px 0}',
      '.dov-detail-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
      '.dov-detail-badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff}',
      '.dov-detail-name{font-size:15px;font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-detail-counts{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}',
      '.dov-count-chip{padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:var(--bg-surface-alt,#f1f5f9);color:var(--text-secondary,#64748b);cursor:pointer;border:1px solid transparent;transition:border-color 0.12s}',
      '.dov-count-chip:hover{border-color:var(--brand-primary,#1565c0);color:var(--brand-primary,#1565c0)}',
      '.dov-doc-list{display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto}',
      '.dov-doc-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;color:var(--text-primary,#1e293b);font-size:13px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);cursor:pointer;transition:background 0.12s}',
      '.dov-doc-item:hover{background:var(--bg-hover,#f8fafc);border-color:var(--brand-primary,#1565c0)}',
      '.dov-doc-code{font-family:monospace;font-size:11px;font-weight:700;color:var(--text-secondary,#64748b);min-width:56px;flex-shrink:0}',
      '.dov-doc-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dov-cat-tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}',
      '.dov-cat-btn{padding:4px 10px;border-radius:6px;border:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f1f5f9);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.12s}',
      '.dov-cat-btn--active,.dov-cat-btn:hover{background:var(--brand-primary,#1565c0);color:#fff;border-color:var(--brand-primary,#1565c0)}',
      '.dov-sop-links{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '.dov-sop-link-btn{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;border:1px solid var(--border,#e2e8f0);color:var(--text-secondary,#64748b);background:var(--bg-surface,#fff);cursor:pointer;transition:border-color 0.12s,color 0.12s}',
      '.dov-sop-link-btn:hover{border-color:var(--brand-primary,#1565c0);color:var(--brand-primary,#1565c0)}',
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
      '.dov-mat-cell-zero{color:var(--text-tertiary,#94a3b8);font-size:13px}',
      '.dov-mat-total{font-weight:700;color:var(--text-primary,#1e293b)}',
      '.dov-mat-footer td{background:var(--bg-surface-alt,#f1f5f9);font-weight:700;border-top:2px solid var(--border,#e2e8f0)}',
      '.dov-flow-info{margin-top:12px;font-size:12px;color:var(--text-secondary,#64748b);text-align:center}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  /* =========================================================================
   * RENDER ENTRY
   * Waits for DOCS to be ready; shows loading spinner if not.
   * ======================================================================= */
  function render(container) {
    _root = container;
    if (_retryTimer) { clearInterval(_retryTimer); _retryTimer = null; }

    if (!isDocsReady()) {
      container.innerHTML =
        '<div class="dov-loading">' +
        '<div class="dov-spinner"></div>' +
        '<span>' + esc(T({ vi: 'Đang tải danh mục tài liệu…', en: 'Loading document catalog…' })) + '</span>' +
        '</div>';
      _retryTimer = setInterval(function () {
        if (isDocsReady() && _root) { clearInterval(_retryTimer); _retryTimer = null; render(_root); }
      }, 600);
      return;
    }

    container.innerHTML = buildShell();
    bindTabEvents(container);
    renderView(container);
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
      { id: 'mindmap',  icon: '🗺',  label: { vi: 'Sơ đồ cây',      en: 'Mind Map'      } },
      { id: 'fishbone', icon: '🐟', label: { vi: 'Xương cá',        en: 'Fishbone'      } },
      { id: 'flow',     icon: '⬡',  label: { vi: 'Luồng quy trình', en: 'Process Flow'  } },
      { id: 'matrix',   icon: '📊', label: { vi: 'Ma trận',         en: 'Matrix'        } }
    ];
    html += '<div class="dov-tabs" role="tablist">';
    tabs.forEach(function (tab) {
      var active = state.view === tab.id ? ' dov-tab--active' : '';
      html += '<button class="dov-tab' + active + '" data-dov-tab="' + tab.id + '" role="tab">' +
              '<span class="dov-tab-icon">' + tab.icon + '</span>' +
              '<span>' + esc(T(tab.label)) + '</span></button>';
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
        Object.keys(state.charts).forEach(function (k) { try { state.charts[k].dispose(); } catch (e) {} });
        state.charts = {};
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
    if (_retryTimer) { clearInterval(_retryTimer); _retryTimer = null; }
    Object.keys(state.charts).forEach(function (k) { try { state.charts[k].dispose(); } catch (e) {} });
    state.charts = {};
    _root = null;
  }

  /* =========================================================================
   * VIEW 1 — MINDMAP (ECharts tree, radial)
   * Leaf nodes → navigateTo('documents', cat) — no hardcoded paths
   * ======================================================================= */
  function renderMindmap(canvas) {
    if (!window.echarts) {
      canvas.innerHTML = '<p style="padding:24px;color:var(--text-secondary,#64748b)">ECharts chưa tải.</p>';
      return;
    }

    var treeData = {
      name: 'HESEM QMS',
      children: GROUPS.map(function (g, i) {
        var col = palette(i);
        var children = DOC_CATS.map(function (cat) {
          var cnt = groupCatCount(g, cat);
          if (cnt === 0) return null;
          return {
            name: cat + ' (' + cnt + ')',
            value: cnt,
            cat: cat,
            itemStyle: { color: col, opacity: 0.7 },
            label: { color: col }
          };
        }).filter(Boolean);

        return {
          name: g.abbr + '-' + g.id + '\n' + T(g.label),
          value: totalGroupDocs(g),
          gi: i,
          itemStyle: { color: col, borderColor: col },
          label: { color: col, fontWeight: '600' },
          children: children
        };
      })
    };

    var box = document.createElement('div');
    box.className = 'dov-chart-box';
    box.style.height = '560px';
    canvas.appendChild(box);

    var chart = window.echarts.init(box, null, { renderer: 'svg' });
    state.charts['mindmap'] = chart;

    var textCol   = tok('colorsLight.textPrimary', '#1e293b');
    var borderCol = tok('colorsLight.border', '#e2e8f0');

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          if (!p.data) return '';
          return '<div style="font-size:12px">' + esc(String(p.data.name || '').replace('\n', ' — ')) + '</div>';
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
        leaves: { label: { position: 'right', verticalAlign: 'middle', fontSize: 11 } },
        lineStyle: { color: borderCol, width: 1.5 }
      }]
    });

    /* Click leaf (SOP/WI/ANNEX/FRM) → navigate to that category */
    chart.on('click', function (p) {
      var cat = p.data && p.data.cat;
      if (cat) navToCat(cat);
    });

    var legend = document.createElement('div');
    legend.className = 'dov-chart-legend';
    GROUPS.forEach(function (g, i) {
      legend.innerHTML +=
        '<span class="dov-legend-item">' +
        '<span class="dov-legend-dot" style="background:' + palette(i) + '"></span>' +
        '<span>' + esc(g.abbr) + ' · ' + esc(T(g.label)) + '</span></span>';
    });
    canvas.appendChild(legend);

    var note = document.createElement('p');
    note.className = 'dov-flow-info';
    note.textContent = T({
      vi: 'Nhấn vào nút để mở rộng/thu gọn · Nhấn loại tài liệu (SOP/WI…) để xem danh sách',
      en: 'Click node to expand/collapse · Click doc type (SOP/WI…) to browse that category'
    });
    canvas.appendChild(note);

    var ro = new ResizeObserver(function () { chart.resize(); });
    ro.observe(box);
  }

  /* =========================================================================
   * VIEW 2 — FISHBONE SVG (Ishikawa)
   * Top: SYS(100) ENG(300) PRD(500) LOG(700) IMP(900)
   * Bot: COM(200) SUP(400) QC(600)  HR(800)
   * Bone click → detail panel with live doc list from DOCS
   * ======================================================================= */
  function renderFishbone(canvas) {
    var W = 1000, H = 490;
    var spineY = 245;
    var tipTopY = 80,  tipBotY = 410;
    var topIdx = [0, 2, 4, 6, 8]; /* GROUPS indices top */
    var botIdx = [1, 3, 5, 7];    /* GROUPS indices bottom */
    var topSX  = [160, 295, 430, 565, 700];
    var topTX  = [100, 235, 370, 505, 640];
    var botSX  = [228, 363, 498, 633];
    var botTX  = [168, 303, 438, 573];

    var s = '';
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="dov-fishbone-svg">';

    var brandPri = cv('brand-primary', '#1565c0');
    s += '<defs><marker id="dovArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">';
    s += '<path d="M0,0 L10,5 L0,10 Z" fill="' + brandPri + '"/></marker></defs>';

    /* Spine */
    s += '<line x1="75" y1="' + spineY + '" x2="835" y2="' + spineY + '" stroke="' + brandPri + '" stroke-width="3.5" stroke-linecap="round" marker-end="url(#dovArr)"/>';

    /* Head box */
    s += '<rect x="838" y="' + (spineY - 44) + '" width="152" height="88" rx="9" fill="' + cv('brand-primary', '#1565c0') + '"/>';
    s += '<text x="914" y="' + (spineY - 20) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">Sản phẩm CNC</text>';
    s += '<text x="914" y="' + (spineY - 4) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + cv('text-inverse', '#fff') + '" font-family="inherit">chất lượng cao</text>';
    s += '<text x="914" y="' + (spineY + 14) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.82)" font-family="inherit">giao đúng hạn</text>';

    function drawBone(gi, sx, tx, ty, isTop) {
      var g   = GROUPS[gi];
      var col = palette(gi);
      var sopCount = groupCatCount(g, 'SOP');
      var lbx = tx - 52, lby = isTop ? ty - 58 : ty;
      var lbh = 58, lbw = 104;

      s += '<line x1="' + tx + '" y1="' + ty + '" x2="' + sx + '" y2="' + spineY +
           '" stroke="' + col + '" stroke-width="2.5" class="dov-bone" data-gi="' + gi + '"/>';

      /* sub-bones: one tick per SOP (up to 6) */
      var n = Math.min(sopCount, 6);
      for (var j = 0; j < n; j++) {
        var t = 0.22 + j * (0.65 / Math.max(n - 1, 1));
        var bx = tx + t * (sx - tx);
        var by = ty + t * (spineY - ty);
        var tx2 = bx + 34, ty2 = by + (isTop ? 4 : -4);
        s += '<line x1="' + bx + '" y1="' + by + '" x2="' + tx2 + '" y2="' + ty2 +
             '" stroke="' + col + '" stroke-width="1.5" opacity="0.6"/>';
        s += '<text x="' + (bx - 5) + '" y="' + (isTop ? by - 5 : by + 13) +
             '" font-size="9.5" fill="' + col + '" text-anchor="end" font-family="monospace" font-weight="600" opacity="0.8">SOP-' +
             (g.id + j + 1) + '</text>';
      }

      /* junction dot */
      s += '<circle cx="' + sx + '" cy="' + spineY + '" r="5.5" fill="' + col + '"/>';

      /* label box (clickable) */
      var totalCnt = totalGroupDocs(g);
      s += '<g class="dov-bone-lbl" data-gi="' + gi + '" style="cursor:pointer" role="button" tabindex="0" aria-label="' + esc(T(g.label)) + '">';
      s += '<rect x="' + lbx + '" y="' + lby + '" width="' + lbw + '" height="' + lbh +
           '" rx="7" fill="' + col + '" fill-opacity="0.13" stroke="' + col + '" stroke-width="1.5"/>';
      var labY1 = isTop ? lby + 17 : lby + 16;
      s += '<text x="' + tx + '" y="' + labY1 + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + col + '" font-family="inherit">' + esc(g.abbr) + '</text>';
      s += '<text x="' + tx + '" y="' + (labY1 + 14) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + col + '" font-family="inherit">' + esc(shortLbl(T(g.fish))) + '</text>';
      s += '<text x="' + tx + '" y="' + (labY1 + 27) + '" text-anchor="middle" font-size="10" fill="' + col + '" font-family="inherit" opacity="0.8">' + sopCount + ' SOP · ' + totalCnt + ' TL</text>';
      s += '</g>';
    }

    topIdx.forEach(function (gi, i) { drawBone(gi, topSX[i], topTX[i], tipTopY, true); });
    botIdx.forEach(function (gi, i) { drawBone(gi, botSX[i], botTX[i], tipBotY, false); });

    s += '<text x="78" y="' + (spineY - 10) + '" font-size="11" fill="' + brandPri + '" font-weight="600" font-family="inherit">Quy trình vận hành HESEM</text>';
    s += '</svg>';

    s += '<div class="dov-bone-detail" id="dov-bd">' +
         '<p class="dov-detail-hint">' +
         esc(T({ vi: 'Nhấn vào nhóm quy trình để xem danh sách tài liệu', en: 'Click a process group to view documents' })) +
         '</p></div>';

    canvas.innerHTML = '<div class="dov-fishbone-wrap">' + s + '</div>';

    /* Bind bone click events */
    canvas.querySelectorAll('[data-gi]').forEach(function (el) {
      el.addEventListener('click', function () { showGroupDetail(parseInt(el.getAttribute('data-gi')), canvas); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') showGroupDetail(parseInt(el.getAttribute('data-gi')), canvas);
      });
    });
  }

  /* ── Group detail panel (used by fishbone; shared state for selected cat) ─ */
  var _detailCat = 'SOP';

  function showGroupDetail(gi, canvas) {
    state.selectedGroup = gi;
    _detailCat = 'SOP';
    renderDetailPanel(gi, canvas);
  }

  function renderDetailPanel(gi, canvas) {
    var g   = GROUPS[gi];
    var col = palette(gi);
    var bd  = canvas.querySelector('#dov-bd');
    if (!bd) return;

    var html = '<div class="dov-detail-header">';
    html += '<span class="dov-detail-badge" style="background:' + col + '">' + esc(g.abbr + '-' + g.id) + '</span>';
    html += '<span class="dov-detail-name">' + esc(T(g.label)) + '</span>';
    html += '</div>';

    /* Category tabs with live counts */
    html += '<div class="dov-cat-tabs">';
    DOC_CATS.forEach(function (cat) {
      var cnt = groupCatCount(g, cat);
      if (cnt === 0) return;
      var active = cat === _detailCat ? ' dov-cat-btn--active' : '';
      html += '<button class="dov-cat-btn' + active + '" data-detail-cat="' + cat + '">' + cat + ' ×' + cnt + '</button>';
    });
    html += '</div>';

    /* Doc list for selected category */
    var docs = getGroupDocs(g.id, _detailCat);
    html += '<div class="dov-doc-list">';
    if (docs.length === 0) {
      html += '<p class="dov-detail-hint">' + esc(T({ vi: 'Không có tài liệu.', en: 'No documents.' })) + '</p>';
    } else {
      docs.forEach(function (d) {
        var title = docTitle(d);
        html += '<div class="dov-doc-item" data-doc-code="' + esc(d.code) + '">' +
                '<span class="dov-doc-code">' + esc(d.code) + '</span>' +
                '<span class="dov-doc-title" title="' + esc(title) + '">' + esc(title) + '</span>' +
                '</div>';
      });
    }
    html += '</div>';

    /* View-all button */
    html += '<div class="dov-sop-links">';
    DOC_CATS.forEach(function (cat) {
      var cnt = groupCatCount(g, cat);
      if (cnt === 0) return;
      html += '<button class="dov-sop-link-btn" data-nav-cat="' + cat + '">' +
              esc(T({ vi: 'Xem tất cả ' + cat + ' (' + cnt + ')', en: 'View all ' + cat + ' (' + cnt + ')' })) +
              '</button>';
    });
    html += '</div>';

    bd.innerHTML = html;

    /* Bind: doc item click → openDoc */
    bd.querySelectorAll('[data-doc-code]').forEach(function (el) {
      el.addEventListener('click', function () { openDocSafe(el.getAttribute('data-doc-code')); });
    });

    /* Bind: category tab switch */
    bd.querySelectorAll('[data-detail-cat]').forEach(function (el) {
      el.addEventListener('click', function () {
        _detailCat = el.getAttribute('data-detail-cat');
        renderDetailPanel(gi, canvas);
      });
    });

    /* Bind: view-all → navigateTo */
    bd.querySelectorAll('[data-nav-cat]').forEach(function (el) {
      el.addEventListener('click', function () { navToCat(el.getAttribute('data-nav-cat')); });
    });
  }

  /* Short fishbone label (truncate at space if > 14 chars) */
  function shortLbl(s) {
    if (!s || s.length <= 16) return s;
    var i = s.lastIndexOf(' ', 14);
    return i > 0 ? s.slice(0, i) + '…' : s.slice(0, 14) + '…';
  }

  /* =========================================================================
   * VIEW 3 — PROCESS FLOW (ECharts graph)
   * Operational sequence: COM → ENG → SUP → PRD → QC → LOG
   * Cross-cutting: SYS (top), HR (bottom), IMP (feedback)
   * Node click → navigateTo('documents', 'SOP') for that group
   * ======================================================================= */
  function renderFlow(canvas) {
    if (!window.echarts) {
      canvas.innerHTML = '<p style="padding:24px;color:var(--text-secondary,#64748b)">ECharts chưa tải.</p>';
      return;
    }

    var nodes = [
      { gi: 1,  x: 120, y: 280 }, /* COM  200 */
      { gi: 2,  x: 270, y: 280 }, /* ENG  300 */
      { gi: 3,  x: 420, y: 280 }, /* SUP  400 */
      { gi: 4,  x: 570, y: 280 }, /* PRD  500 */
      { gi: 5,  x: 720, y: 280 }, /* QC   600 */
      { gi: 6,  x: 870, y: 280 }, /* LOG  700 */
      { gi: 0,  x: 500, y: 80  }, /* SYS  100 */
      { gi: 7,  x: 500, y: 480 }, /* HR   800 */
      { gi: 8,  x: 280, y: 480 }, /* IMP  900 */
      { gi: -1, x: 40,  y: 280, special: true, label: { vi: 'KH',   en: 'Customer' }, abbr: 'KH' },
      { gi: -2, x: 960, y: 280, special: true, label: { vi: 'Giao', en: 'Deliver'  }, abbr: '✓' }
    ];

    var echNodes = nodes.map(function (n) {
      var g   = n.gi >= 0 ? GROUPS[n.gi] : null;
      var col = n.gi >= 0 ? palette(n.gi) : tok('brand.primary', '#1565c0');
      var sopCnt = g ? groupCatCount(g, 'SOP') : 0;
      return {
        id:       String(n.gi),
        name:     g ? g.abbr + '\n' + T(g.label) : T(n.label),
        abbr:     g ? g.abbr : n.abbr,
        x: n.x, y: n.y,
        gi:       n.gi,
        symbolSize: n.special ? 38 : 56,
        itemStyle:  { color: col, borderColor: col, borderWidth: n.special ? 2 : 0 },
        label:      { show: true, fontSize: 11, fontWeight: '700', color: '#fff',
                      formatter: function (p) { return p.data.abbr || ''; } },
        sopCount: sopCnt
      };
    });

    var mainFlow = [['-1','1'],['1','2'],['2','3'],['3','4'],['4','5'],['5','6'],['6','-2']];
    var crossTop = [['0','1'],['0','2'],['0','3'],['0','4'],['0','5'],['0','6']];
    var crossBot = [['7','4'],['7','5']];
    var feedback = [['8','1'],['5','8']];

    function edge(s, t, style) { return { source: s, target: t, lineStyle: style }; }
    var bPri  = tok('brand.primary', '#1565c0');
    var cross = tok('statusColors.info', '#2563eb');
    var purp  = tok('statusColors.purple', '#7c3aed');
    var green = tok('statusColors.success', '#16a34a');

    var echEdges = [].concat(
      mainFlow.map(function (e) { return edge(e[0], e[1], { color: bPri,  width: 2.5, curveness: 0 }); }),
      crossTop.map(function (e) { return edge(e[0], e[1], { color: cross, width: 1.2, type: 'dashed', curveness: 0.3 }); }),
      crossBot.map(function (e) { return edge(e[0], e[1], { color: purp,  width: 1.2, type: 'dashed', curveness: 0.3 }); }),
      feedback.map(function (e) { return edge(e[0], e[1], { color: green, width: 1.5, curveness: 0.45 }); })
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
        trigger: 'item',
        formatter: function (p) {
          if (!p.data || !p.data.name) return '';
          var gi = typeof p.data.gi !== 'undefined' ? p.data.gi : -99;
          var sopLine = '';
          if (gi >= 0) {
            var g = GROUPS[gi];
            DOC_CATS.forEach(function (cat) {
              var cnt = groupCatCount(g, cat);
              if (cnt > 0) sopLine += ' · ' + cnt + ' ' + cat;
            });
          }
          return '<div style="font-size:12px">' + esc(String(p.data.name || '').replace('\n', ' — ')) + sopLine + '</div>';
        }
      },
      series: [{
        type: 'graph', layout: 'none',
        data: echNodes, edges: echEdges,
        roam: false, focusNodeAdjacency: true,
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 8,
        left: 10, right: 10, top: 30, bottom: 30,
        label: { show: true },
        lineStyle: { opacity: 0.9 }
      }]
    });

    /* Node click → navigate to SOP category for that group */
    chart.on('click', function (p) {
      var gi = p.data && typeof p.data.gi !== 'undefined' ? p.data.gi : -99;
      if (gi >= 0) navToCat('SOP');
    });

    var info = document.createElement('p');
    info.className = 'dov-flow-info';
    info.textContent = T({
      vi: '→ Luồng chính (xanh dương) · -- Hệ thống quản trị (xanh nhạt) · ↩ Cải tiến phản hồi (xanh lá) · Nhấn node để xem SOP',
      en: '→ Main flow (blue) · -- Governance (light blue) · ↩ Improvement loop (green) · Click node to browse SOPs'
    });
    canvas.appendChild(info);

    var ro = new ResizeObserver(function () { chart.resize(); });
    ro.observe(box);
  }

  /* =========================================================================
   * VIEW 4 — MATRIX (HTML table)
   * Rows: 9 process groups · Cols: SOP WI ANNEX FRM Total
   * Cell click → navigateTo('documents', cat)
   * ======================================================================= */
  function renderMatrix(canvas) {
    /* Compute live counts */
    var counts = GROUPS.map(function (g) {
      var row = { total: 0 };
      DOC_CATS.forEach(function (cat) {
        var c = groupCatCount(g, cat);
        row[cat] = c;
        row.total += c;
      });
      return row;
    });

    /* Max per column for heat shading */
    var maxes = {};
    DOC_CATS.forEach(function (cat) {
      maxes[cat] = Math.max.apply(null, counts.map(function (r) { return r[cat]; }));
    });

    function heatOpacity(val, max) { return (!val || !max) ? 0 : 0.08 + 0.55 * (val / max); }

    var html = '<div class="dov-matrix-wrap"><table class="dov-matrix-table">';
    html += '<thead><tr>';
    html += '<th>' + esc(T({ vi: 'Nhóm quy trình', en: 'Process Group' })) + '</th>';
    DOC_CATS.forEach(function (cat) { html += '<th style="text-align:center">' + cat + '</th>'; });
    html += '<th style="text-align:center">' + esc(T({ vi: 'Tổng', en: 'Total' })) + '</th>';
    html += '</tr></thead><tbody>';

    GROUPS.forEach(function (g, i) {
      var row = counts[i];
      var col = palette(i);
      html += '<tr>';
      html += '<td><div class="dov-mat-group">' +
              '<span class="dov-mat-dot" style="background:' + col + '"></span>' +
              '<span><strong>' + esc(g.abbr) + '-' + g.id + '</strong> ' + esc(T(g.label)) + '</span>' +
              '</div></td>';
      DOC_CATS.forEach(function (cat) {
        var val = row[cat];
        var op  = heatOpacity(val, maxes[cat]);
        html += '<td style="text-align:center">';
        if (val > 0) {
          html += '<span class="dov-mat-cell" data-nav-cat="' + cat + '" ' +
                  'style="background:' + col + ';color:#fff;opacity:' + (0.15 + op * 0.85) + '">' + val + '</span>';
        } else {
          html += '<span class="dov-mat-cell-zero">—</span>';
        }
        html += '</td>';
      });
      html += '<td style="text-align:center"><span class="dov-mat-total">' + row.total + '</span></td>';
      html += '</tr>';
    });

    /* Footer totals */
    html += '</tbody><tfoot><tr class="dov-mat-footer">';
    html += '<td><strong>' + esc(T({ vi: 'Tổng cộng', en: 'Grand Total' })) + '</strong></td>';
    DOC_CATS.forEach(function (cat) {
      var sum = counts.reduce(function (acc, r) { return acc + r[cat]; }, 0);
      html += '<td style="text-align:center;font-size:14px">' + sum + '</td>';
    });
    html += '<td style="text-align:center;font-size:15px">' + grandTotal() + '</td>';
    html += '</tr></tfoot></table></div>';

    canvas.innerHTML = html;

    /* Cell click → navigate to that doc category */
    canvas.querySelectorAll('[data-nav-cat]').forEach(function (el) {
      el.addEventListener('click', function () { navToCat(el.getAttribute('data-nav-cat')); });
    });
  }

  /* =========================================================================
   * REGISTER WITH EQMS SHELL
   * ======================================================================= */
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsModules['doc-overview'] = { render: render, destroy: destroy };

  /* Top-level portal page hooks (used by navigateTo('doc-overview')) */
  window._renderDocOverview  = render;
  window._destroyDocOverview = destroy;

})();

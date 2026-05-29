/* ════════════════════════════════════════════════════════════════════════
 * Admin → Appearance → Module Sample sub-tab
 *
 * SSOT showcase. Lists every reusable frontend component used by the
 * orders v3 module (and going forward, any new module) alongside the
 * exact tokens that control it. Three goals:
 *
 *   1. Make compliance auditable at a glance — admin can see "is this
 *      component still on-token?" without diffing CSS.
 *   2. Reveal misalignment — equal-height controls render side by side
 *      so any drift in button-vs-tab-vs-chip height is obvious.
 *   3. Be the canonical reference for new module work — any frontend
 *      engineer building a new module starts here and copies these
 *      patterns, never inventing fresh hex literals.
 *
 * Sub-tab structure (inner tabs, not URL-routed — internal state only):
 *   • Buttons   • Tabs   • KPI tiles   • Tables   • Chips
 *   • Drawers   • Toolbars   • Empty states & toasts
 *
 * Token whitelist comes from graphics_component_contract rows seeded
 * in migration 213.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function esc(s){
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Sample sections ────────────────────────────────────────────────
  // Each section returns { id, label_vi, label_en, body_html, tokens[] }.
  // Body HTML reuses the live orders-v3 stylesheet classes, so changes
  // to orders-v3.css ripple here immediately — a tight feedback loop.

  function buttonsSection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:14px">'
      +   '<div style="font-size:12px;color:var(--text-secondary)">'
      +     esc(L('SSOT chuẩn HESEM (2026-05-28): MỘT kích thước duy nhất = control.height.standard (36px). Không có sm/lg. Nếu cần kích thước khác phải đăng ký token mới qua Authority.',
      +           'HESEM SSOT rule (2026-05-28): ONE size only = control.height.standard (36px). No sm/lg. Other sizes require a new Authority token.'))
      +   '</div>'
      +   '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      +     '<button class="o3-btn o3-btn--primary">Primary</button>'
      +     '<button class="o3-btn o3-btn--success">Success</button>'
      +     '<button class="o3-btn o3-btn--danger">Danger</button>'
      +     '<button class="o3-btn">Default</button>'
      +     '<button class="o3-btn o3-btn--ghost">Ghost</button>'
      +     '<button class="o3-btn" disabled>Disabled</button>'
      +   '</div>'
      + '</div>';
    return {
      id: 'buttons',
      label_vi: 'Nút bấm', label_en: 'Buttons',
      body_html: body,
      tokens: ['control.height.standard','spacing.md','spacing.lg','radius.md','brand.primary','brand.primaryHover','status.success.light','status.danger.light']
    };
  }

  function tabsSection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:18px">'
      +   '<div>'
      +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Tabs theo control-h-lg, indicator dưới đáy 2px','Tabs use control-h-lg, 2px bottom indicator'))+'</div>'
      +     '<nav class="o3-shell__tabs" role="tablist" style="border-bottom:1px solid var(--o3-border-subtle);background:var(--o3-surface-card)">'
      +       '<button class="o3-shell__tab o3-shell__tab--active">🔥 Today</button>'
      +       '<button class="o3-shell__tab">📥 Intake <span class="o3-shell__tab-badge">3</span></button>'
      +       '<button class="o3-shell__tab">📋 Order book</button>'
      +       '<button class="o3-shell__tab">⚙️ Operations</button>'
      +     '</nav>'
      +   '</div>'
      + '</div>';
    return {
      id: 'tabs',
      label_vi: 'Tabs workspace', label_en: 'Workspace tabs',
      body_html: body,
      tokens: ['control.height.standard','spacing.md','spacing.lg','brand.primary','colorsLight.borderSubtle']
    };
  }

  function kpiSection(L){
    var body = ''
      + '<div class="o3-kpi-grid">'
      +   '<div class="o3-kpi"><div class="o3-kpi__label">Tổng đơn</div><div class="o3-kpi__value o3-kpi__value--brand">42</div><div class="o3-kpi__sub">+5 hôm nay</div></div>'
      +   '<div class="o3-kpi"><div class="o3-kpi__label">OTD</div><div class="o3-kpi__value o3-kpi__value--success">98%</div><div class="o3-kpi__sub">90 ngày</div></div>'
      +   '<div class="o3-kpi"><div class="o3-kpi__label">Đang chờ</div><div class="o3-kpi__value o3-kpi__value--warning">7</div><div class="o3-kpi__sub">cần action</div></div>'
      +   '<div class="o3-kpi"><div class="o3-kpi__label">Lỗi nặng</div><div class="o3-kpi__value o3-kpi__value--danger">2</div><div class="o3-kpi__sub">block ship</div></div>'
      +   '<div class="o3-kpi"><div class="o3-kpi__label">Mới</div><div class="o3-kpi__value o3-kpi__value--info">12</div><div class="o3-kpi__sub">tuần này</div></div>'
      + '</div>';
    return {
      id: 'kpi',
      label_vi: 'Ô KPI', label_en: 'KPI tiles',
      body_html: body,
      tokens: ['spacing.lg','radius.lg','colorsLight.bgSurface','colorsLight.borderSubtle','brand.primary','status.success.light','status.warning.light','status.danger.light','status.info.light']
    };
  }

  function chipsSection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:18px">'
      +   '<div>'
      +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Chip trạng thái (control-h-sm, pill radius)','Status chips (control-h-sm, pill radius)'))+'</div>'
      +     '<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +       '<span class="o3-chip o3-chip--success">✓ committed</span>'
      +       '<span class="o3-chip o3-chip--warning">⏳ waiting</span>'
      +       '<span class="o3-chip o3-chip--danger">✗ rejected</span>'
      +       '<span class="o3-chip o3-chip--info">🤖 AI Intake</span>'
      +       '<span class="o3-chip">👤 manual</span>'
      +     '</div>'
      +   '</div>'
      +   '<div>'
      +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Chip filter (clickable, có active state)','Filter chips (clickable, with active state)'))+'</div>'
      +     '<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +       '<button class="o3-chip o3-chip--button o3-chip--active">Chờ duyệt · 3</button>'
      +       '<button class="o3-chip o3-chip--button">Đã commit · 0</button>'
      +       '<button class="o3-chip o3-chip--button">Từ chối · 0</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    return {
      id: 'chips',
      label_vi: 'Chip / Badge', label_en: 'Chips / Badges',
      body_html: body,
      tokens: ['control.height.standard','spacing.xs','spacing.sm','radius.pill','status.success.soft','status.warning.soft','status.danger.soft','status.info.soft','status.neutral.soft']
    };
  }

  function toolbarSection(L){
    var body = ''
      + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Toolbar — mọi control trong toolbar (chip-button / search / button) phải cao = control-h-md','Toolbar — every control in a toolbar (chip-button / search / button) must equal control-h-md'))+'</div>'
      + '<div class="o3-toolbar">'
      +   '<div class="o3-toolbar__chips">'
      +     '<button class="o3-chip o3-chip--button o3-chip--active">Tất cả · 5</button>'
      +     '<button class="o3-chip o3-chip--button">Chờ · 3</button>'
      +     '<button class="o3-chip o3-chip--button">Xong · 2</button>'
      +   '</div>'
      +   '<div class="o3-toolbar__spacer"></div>'
      +   '<div class="o3-toolbar__search"><span aria-hidden="true">🔍</span><input type="search" placeholder="Tìm…"></div>'
      +   '<button class="o3-btn">🔄 Làm mới</button>'
      +   '<button class="o3-btn o3-btn--primary">+ Tạo mới</button>'
      + '</div>';
    return {
      id: 'toolbar',
      label_vi: 'Toolbar', label_en: 'Toolbar',
      body_html: body,
      tokens: ['control.height.standard','spacing.md','spacing.lg','radius.lg','colorsLight.bgSurface','colorsLight.borderSubtle']
    };
  }

  function tableSection(L){
    var body = ''
      + '<div class="o3-table-wrap" style="max-width:760px">'
      +   '<table class="o3-table">'
      +     '<thead><tr><th>ID</th><th>Nguồn</th><th>Khách</th><th style="text-align:right">Giá trị</th><th>Trạng thái</th></tr></thead>'
      +     '<tbody>'
      +       '<tr class="o3-table__row o3-table__row--clickable"><td class="o3-cell--mono">CPO-001</td><td><span class="o3-chip o3-chip--info">🤖 AI</span></td><td>LAM Research</td><td class="o3-cell--num">$12,400</td><td><span class="o3-chip o3-chip--success">committed</span></td></tr>'
      +       '<tr class="o3-table__row o3-table__row--clickable o3-table__row--selected"><td class="o3-cell--mono">CPO-002</td><td><span class="o3-chip">👤 manual</span></td><td>Applied Materials</td><td class="o3-cell--num">$8,750</td><td><span class="o3-chip o3-chip--warning">waiting</span></td></tr>'
      +       '<tr class="o3-table__row o3-table__row--clickable"><td class="o3-cell--mono">CPO-003</td><td><span class="o3-chip o3-chip--info">🤖 AI</span></td><td>KLA Corp</td><td class="o3-cell--num">$3,200</td><td><span class="o3-chip o3-chip--danger">rejected</span></td></tr>'
      +     '</tbody>'
      +   '</table>'
      + '</div>';
    return {
      id: 'table',
      label_vi: 'Bảng dữ liệu', label_en: 'Table',
      body_html: body,
      tokens: ['spacing.sm','spacing.md','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','colorsLight.textPrimary','colorsLight.textTertiary']
    };
  }

  function emptyAndToastSection(L){
    var body = ''
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
      +   '<div class="o3-panel"><div class="o3-panel__head"><h3 class="o3-panel__title">Empty state</h3></div><div class="o3-panel__body o3-panel__body--flush">'
      +     '<div class="o3-empty">'
      +       '<div class="o3-empty__icon" aria-hidden="true">✨</div>'
      +       '<div class="o3-empty__title">Không có ngoại lệ ưu tiên</div>'
      +       '<div class="o3-empty__hint">Hệ thống đang ổn. Quay lại sau hoặc mở Order Book để xem chi tiết.</div>'
      +     '</div>'
      +   '</div></div>'
      +   '<div class="o3-panel"><div class="o3-panel__head"><h3 class="o3-panel__title">Loading</h3></div><div class="o3-panel__body">'
      +     '<div class="o3-loading"><span class="o3-spinner" aria-hidden="true"></span>Đang tải…</div>'
      +   '</div></div>'
      + '</div>'
      + '<div style="margin-top:16px">'
      +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Toast variants (border-left mảu theo tone):</div>'
      +   '<div style="display:flex;flex-direction:column;gap:8px;max-width:420px">'
      +     '<div class="o3-toast o3-toast--success">Hành động thành công.</div>'
      +     '<div class="o3-toast o3-toast--warning">Có cảnh báo cần xem.</div>'
      +     '<div class="o3-toast o3-toast--danger">Không thể lưu — kiểm tra lại.</div>'
      +     '<div class="o3-toast o3-toast--info">Thông tin cập nhật.</div>'
      +   '</div>'
      + '</div>';
    return {
      id: 'empty-toast',
      label_vi: 'Empty / Toast', label_en: 'Empty & Toasts',
      body_html: body,
      tokens: ['spacing.lg','spacing.3xl','colorsLight.bgSurface','colorsLight.borderSubtle','status.success.light','status.warning.light','status.danger.light','status.info.light']
    };
  }

  function panelSection(L){
    var body = ''
      + '<section class="o3-panel" style="max-width:560px">'
      +   '<header class="o3-panel__head">'
      +     '<h3 class="o3-panel__title">Tiêu đề panel <span class="o3-panel__count">12</span></h3>'
      +     '<div class="o3-panel__actions"><button class="o3-btn o3-btn--sm o3-btn--ghost">🔄 Làm mới</button></div>'
      +   '</header>'
      +   '<div class="o3-panel__body">'
      +     '<p style="margin:0;color:var(--o3-text-default);font-size:13px">Nội dung panel. Khi flush=true thì panel__body không có padding và bảng/table chiếm toàn bộ.</p>'
      +   '</div>'
      + '</section>';
    return {
      id: 'panel',
      label_vi: 'Panel', label_en: 'Panel',
      body_html: body,
      tokens: ['spacing.md','spacing.lg','radius.lg','colorsLight.bgSurface','colorsLight.borderSubtle']
    };
  }

  /* ── Master Density section ───────────────────────────────────────
   * The single knob that controls 99% of the UI's whitespace. Renders
   * a live preview that shrinks/grows as the slider moves; the slider
   * stages a change into the Graphics Authority draft buffer (same
   * pipeline as every other token edit). */
  function densitySection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:14px">'
      +   '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5">'
      +     esc(L(
              'MỘT thanh trượt điều khiển toàn bộ khe hở giữa các thành phần. Kéo để xem UI co/giãn theo thời gian thực. Bấm "Lưu cho tổ chức" để publish thay đổi qua mô phỏng WCAG.',
              'ONE slider controls every gap in the UI. Drag to see the UI compress/expand in real time. Click "Save for org" to publish through WCAG simulation.'))
      +   '</div>'

      +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      +     '<label style="display:flex;flex-direction:column;gap:4px">'
      +       '<span style="font-size:11px;font-weight:600;color:var(--text-primary)">space.master</span>'
      +       '<input id="o3-density-master" type="range" min="4" max="16" step="1" value="8" />'
      +       '<span id="o3-density-master-val" style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-secondary)">8px</span>'
      +     '</label>'
      +     '<label style="display:flex;flex-direction:column;gap:4px">'
      +       '<span style="font-size:11px;font-weight:600;color:var(--text-primary)">space.section</span>'
      +       '<input id="o3-density-section" type="range" min="8" max="24" step="1" value="12" />'
      +       '<span id="o3-density-section-val" style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-secondary)">12px</span>'
      +     '</label>'
      +   '</div>'

      +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
      +     '<label style="display:flex;flex-direction:column;gap:4px">'
      +       '<span style="font-size:11px;font-weight:600;color:var(--text-primary)">radius.master</span>'
      +       '<input id="o3-density-radius" type="range" min="0" max="12" step="1" value="4" />'
      +       '<span id="o3-density-radius-val" style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-secondary)">4px</span>'
      +     '</label>'
      +     '<label style="display:flex;flex-direction:column;gap:4px">'
      +       '<span style="font-size:11px;font-weight:600;color:var(--text-primary)">radius.card</span>'
      +       '<input id="o3-density-card" type="range" min="0" max="16" step="1" value="8" />'
      +       '<span id="o3-density-card-val" style="font-family:ui-monospace,monospace;font-size:11px;color:var(--text-secondary)">8px</span>'
      +     '</label>'
      +   '</div>'

      +   '<div style="margin-top:8px;padding:8px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--card-radius,8px)">'
      +     '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">'+esc(L('Preview cùng density:','Preview at current density:'))+'</div>'
      +     '<div style="display:flex;gap:var(--master-gap,8px);align-items:center;padding:var(--master-gap,8px);background:var(--bg-surface-alt);border-radius:var(--card-radius,8px)">'
      +       '<button class="o3-btn o3-btn--primary">Primary</button>'
      +       '<button class="o3-btn">Default</button>'
      +       '<span class="o3-chip o3-chip--info">🤖 chip</span>'
      +       '<span class="o3-chip o3-chip--success">✓ chip</span>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    return {
      id: 'density',
      label_vi: 'Khe hở (Master)', label_en: 'Gap (Master)',
      body_html: body,
      tokens: ['space.master','space.section','radius.master','radius.card']
    };
  }

  function sections(L){
    return [
      densitySection(L),
      buttonsSection(L),
      tabsSection(L),
      kpiSection(L),
      chipsSection(L),
      toolbarSection(L),
      tableSection(L),
      panelSection(L),
      emptyAndToastSection(L)
    ];
  }

  // Internal state — which inner tab is active inside the Module Sample tab.
  // Default to 'density' since the master gap knob is the first thing
  // an admin should see when they open Module Sample.
  var _activeSection = 'density';

  // Wire the density sliders to live CSS variable updates + stage the
  // changes into GraphicsAuthority's draft buffer so the existing
  // "Save for org" pipeline (WCAG sim + commit) handles publish.
  function wireDensitySliders(){
    var pairs = [
      ['o3-density-master',  'o3-density-master-val',  '--master-gap',    '--o3-space',         'space.master'],
      ['o3-density-section', 'o3-density-section-val', '--section-gap',   '--o3-space-section', 'space.section'],
      ['o3-density-radius',  'o3-density-radius-val',  '--master-radius', '--o3-radius',        'radius.master'],
      ['o3-density-card',    'o3-density-card-val',    '--card-radius',   '--o3-radius-card',   'radius.card']
    ];
    pairs.forEach(function(p){
      var input = document.getElementById(p[0]);
      var out   = document.getElementById(p[1]);
      if (!input) return;
      // Reflect current root value if available
      var current = getComputedStyle(document.documentElement).getPropertyValue(p[2]).trim()
                 || getComputedStyle(document.documentElement).getPropertyValue(p[3]).trim();
      if (current) {
        var n = parseInt(current, 10);
        if (!isNaN(n)) { input.value = n; if (out) out.textContent = n + 'px'; }
      }
      input.addEventListener('input', function(){
        var v = input.value + 'px';
        document.documentElement.style.setProperty(p[2], v);
        document.documentElement.style.setProperty(p[3], v);
        if (out) out.textContent = v;
        // Stage into Authority draft if available (legacy bridge)
        try {
          if (typeof window._hmSetWithUnit === 'function') {
            window._hmSetWithUnit(p[2], p[4], parseInt(input.value, 10), 'px');
          } else if (window.GraphicsAuthority && window.GraphicsAuthority.tokens
                     && typeof window.GraphicsAuthority.tokens.stage === 'function') {
            window.GraphicsAuthority.tokens.stage(p[4], v);
          }
        } catch (e) { /* non-fatal — preview still works */ }
      });
    });
  }

  window._admModuleSampleSetSection = function(id){
    _activeSection = id || 'density';
    // Re-render only the Module Sample panel
    var panel = document.getElementById('adm-appearance-panel-module-sample');
    if (panel && typeof window._renderAdmModuleSampleHtml === 'function') {
      var L = window.__lang === 'en'
        ? function(vi,en){ return en || vi; }
        : function(vi,en){ return vi || en; };
      panel.innerHTML = window._renderAdmModuleSampleHtml(L);
      // If density section is active, wire the sliders
      if (_activeSection === 'density') wireDensitySliders();
    }
  };

  // Observe DOM for the module-sample panel being inserted, then wire
  // sliders once for the initial paint. After that, the section setter
  // handles re-wiring on sub-tab switches.
  var _wiredInitial = false;
  function tryInitialWire(){
    if (_wiredInitial) return;
    var hasSliders = document.getElementById('o3-density-master');
    if (hasSliders) {
      wireDensitySliders();
      _wiredInitial = true;
    }
  }
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function(){ tryInitialWire(); });
    try { mo.observe(document.body, { childList: true, subtree: true }); }
    catch (e) { /* DOM not ready yet — defer */ setTimeout(function(){
      try { mo.observe(document.body, { childList: true, subtree: true }); } catch(e2){}
    }, 1000); }
  }

  /* renderAdmModuleSampleHtml(L)
   * Used by 00c-admin-appearance.js render() to fill the bodies map.
   * L is the language helper (function(vi,en) → string).
   * Returns the full inner HTML of the panel (not wrapped in #adm-appearance-panel-module-sample).
   */
  window._renderAdmModuleSampleHtml = function(L){
    // Reset wire flag so the next render rewires (because sub-tab
    // changes recreate the slider DOM)
    _wiredInitial = false;
    L = L || function(vi,en){ return vi || en; };
    var secs = sections(L);
    var active = secs.find(function(s){ return s.id === _activeSection; }) || secs[0];

    // Inner sub-tab strip
    var innerTabsHtml = secs.map(function(s){
      var isActive = s.id === active.id;
      return '<button type="button" class="hm-tab' + (isActive ? ' active' : '') + '"'
        + ' aria-selected="' + (isActive ? 'true' : 'false') + '"'
        + ' onclick="_admModuleSampleSetSection(\'' + esc(s.id) + '\')">'
        + '<span class="hm-tab-label">' + esc(L(s.label_vi, s.label_en)) + '</span>'
        + '</button>';
    }).join('');

    // Token list panel — every token displayed as a code chip + description
    var tokenItems = active.tokens.map(function(tk){
      return '<li style="padding:4px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px"><code style="background:var(--bg-surface-alt);padding:2px 6px;border-radius:3px">' + esc(tk) + '</code></li>';
    }).join('');

    return ''
      // Compact intro — 8px padding, no margin-bottom gap (next element handles spacing)
      + '<div style="padding:10px 12px;background:var(--bg-surface-alt,#f1f5f9);border:1px solid var(--border);border-radius:8px;margin-bottom:10px">'
      +   '<div style="font-weight:600;font-size:12px;color:var(--text-primary)">' + esc(L('🎛️ Module Sample — SSOT cho mọi thành phần đồ họa', '🎛️ Module Sample — SSOT for every reusable graphic component')) + '</div>'
      +   '<div style="font-size:11px;color:var(--text-secondary);line-height:1.45;margin-top:2px">' + esc(L(
              'Mọi module frontend mới PHẢI dùng pattern + token ở đây — không được tự dựng hex hay chiều cao. Migration 213 + 214 chốt MỘT chuẩn duy nhất cho control-height (36px).',
              'Every new frontend module MUST reuse these patterns + tokens — no hex or one-off heights. Migrations 213+214 lock ONE standard control-height (36px).')) + '</div>'
      + '</div>'

      // Inner tab strip — tight
      + '<div class="hm-tabs" role="tablist" style="margin-bottom:10px">' + innerTabsHtml + '</div>'

      // Two-column layout filling full width, no max-width cap, no orphan bottom space
      + '<div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:12px;align-items:stretch">'

      //   Left: live preview — stretches to right column height; padding tightened
      +   '<div style="padding:14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:10px">'
      +     active.body_html
      +   '</div>'

      //   Right: token whitelist; no min-height so it doesn't introduce empty space
      +   '<aside style="padding:12px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border);border-radius:10px">'
      +     '<div style="font-weight:600;font-size:11px;color:var(--text-primary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">' + esc(L('Tokens điều khiển','Controlling tokens')) + '</div>'
      +     '<ul style="margin:0;padding-left:0;list-style:none">' + tokenItems + '</ul>'
      +     '<div style="margin-top:8px;font-size:10px;color:var(--text-secondary);line-height:1.45">' + esc(L(
                'Chỉnh giá trị ở tab "Token hệ thống". Mọi thay đổi đều phải qua mô phỏng WCAG trước khi publish.',
                'Edit values in the "Tokens" sub-tab. Every change must pass WCAG simulation before publishing.')) + '</div>'
      +   '</aside>'
      + '</div>';
  };
})();

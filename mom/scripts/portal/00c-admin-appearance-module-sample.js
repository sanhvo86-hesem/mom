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
      +   '<div style="display:flex;gap:var(--o3-space-sm,8px);align-items:center;flex-wrap:wrap">'
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

  /* ── INDUSTRIAL COMPONENT LIBRARY ──────────────────────────────────
   * 15+ extra components needed for ERP / MES / MOM / EQMS / KPI work.
   * Research basis: SAP Fiori, Oracle JET, IBM Carbon, ServiceNow,
   * Salesforce Lightning, Atlassian, Tabular ERP patterns.
   * Each section renders LIVE — admin sees the actual rendered HTML,
   * not a screenshot. */

  function formFieldsSection(L){
    // v3-G20: all visual literals replaced with var() bindings so every
    // property in the catalog actually drives the preview. Fallbacks
    // preserve the original look when var resolves to nothing.
    var iStyle = 'height:var(--o3-control-h-standard);padding:0 var(--o3-space-md,10px);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:var(--o3-font-size-md,13px);color:var(--o3-text-strong)';
    var labStyle = 'font-size:var(--o3-font-size-xs,11px);font-weight:600;color:var(--o3-text-default,var(--text-secondary))';
    var lblWrap  = 'display:flex;flex-direction:column;gap:var(--o3-space-xs,4px)';
    var helpStyle= 'padding:0 var(--o3-space-md,10px);display:flex;align-items:center;background:var(--o3-surface-muted,var(--bg-surface-alt));font-size:var(--o3-font-size-sm,12px);color:var(--o3-text-muted,var(--text-secondary))';
    var body = ''
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--o3-space-md,12px);max-width:800px">'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Text</span>'
      +     '<input type="text" placeholder="SO-2026-0001" style="' + iStyle + '"></label>'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Number + unit</span>'
      +     '<div class="o3-input-group" style="display:flex;height:var(--o3-control-h-standard);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);overflow:hidden">'
      +       '<input type="number" class="o3-input-inner" value="100" style="border:0;padding:0 var(--o3-space-md,10px);width:100%;font-size:var(--o3-font-size-md,13px);outline:none">'
      +       '<span class="o3-input-affix" style="' + helpStyle + ';border-left:1px solid var(--o3-border-subtle)">EA</span>'
      +     '</div></label>'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Select</span>'
      +     '<select style="' + iStyle + ';background:var(--o3-surface-card,#fff)">'
      +       '<option>LAM Research</option><option>Applied Materials</option><option>KLA Corp</option></select></label>'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Date</span>'
      +     '<input type="date" value="2026-06-15" style="' + iStyle + '"></label>'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Currency</span>'
      +     '<div class="o3-input-group" style="display:flex;height:var(--o3-control-h-standard);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);overflow:hidden">'
      +       '<span class="o3-input-affix" style="' + helpStyle + ';border-right:1px solid var(--o3-border-subtle)">$</span>'
      +       '<input type="text" class="o3-input-inner" value="12,400.00" style="border:0;padding:0 var(--o3-space-md,10px);width:100%;font-size:var(--o3-font-size-md,13px);outline:none"></div></label>'
      +   '<label style="' + lblWrap + '"><span style="' + labStyle + '">Search with hint</span>'
      +     '<div class="o3-input-search-wrap" style="position:relative;height:var(--o3-control-h-standard)">'
      +       '<span class="o3-input-search-icon" style="position:absolute;left:var(--o3-space-md,10px);top:50%;transform:translateY(-50%);font-size:var(--o3-font-size-sm,12px);pointer-events:none;z-index:1">🔍</span>'
      +       '<input type="search" class="o3-input-search" placeholder="Part number, customer…" style="height:100%;padding:0 var(--o3-space-md,10px) 0 calc(28px + var(--o3-space-md,10px));width:100%;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:var(--o3-font-size-md,13px)"></div></label>'
      + '</div>'
      + '<div style="margin-top:var(--o3-space-sm,8px);display:flex;gap:var(--o3-space-md,14px);align-items:center;font-size:var(--o3-font-size-sm,12px)">'
      +   '<label style="display:flex;align-items:center;gap:6px"><input type="checkbox" checked> Đã duyệt</label>'
      +   '<label style="display:flex;align-items:center;gap:6px"><input type="radio" name="r1" checked> Khẩn</label>'
      +   '<label style="display:flex;align-items:center;gap:6px"><input type="radio" name="r1"> Bình thường</label>'
      +   '<label style="display:flex;align-items:center;gap:6px"><input type="checkbox"> Disabled</label>'
      + '</div>';
    return {
      id: 'form', label_vi: 'Form fields', label_en: 'Form fields',
      body_html: body,
      tokens: ['control.height.standard','space.master','radius.master','colorsLight.borderSubtle','colorsLight.bgSurface','colorsLight.bgSurfaceAlt']
    };
  }

  function treeSection(L){
    var body = ''
      + '<div style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.7;color:var(--text-primary)">'
      +   '<div>▾ <strong>SO-2026-9001</strong> <span style="color:var(--text-secondary)">· LAM Research · $12,400</span></div>'
      +   '<div style="padding-left:18px">▾ JO-2026-5101 <span style="color:var(--text-secondary)">· LAM-CLEAN-0011 · qty 100</span></div>'
      +   '<div style="padding-left:36px">▸ WO-2026-7301 <span class="o3-chip o3-chip--success" style="margin-left:6px">running</span></div>'
      +   '<div style="padding-left:36px">▸ WO-2026-7302 <span class="o3-chip" style="margin-left:6px">queued</span></div>'
      +   '<div style="padding-left:36px">▸ WO-2026-7303 <span class="o3-chip o3-chip--warning" style="margin-left:6px">blocked</span></div>'
      +   '<div style="padding-left:18px">▸ JO-2026-5102 <span class="o3-chip o3-chip--info" style="margin-left:6px">3 WO</span></div>'
      +   '<div>▸ <strong>SO-2026-9002</strong> <span style="color:var(--text-secondary)">· Applied Materials</span></div>'
      + '</div>';
    return {
      id:'tree', label_vi:'Cây phân cấp', label_en:'Tree',
      body_html: body,
      tokens: ['space.master','colorsLight.textPrimary','colorsLight.textTertiary','status.success.light','status.warning.light','status.info.light']
    };
  }

  function stepperSection(L){
    var step = function(n, label, state){
      var bg = state==='done' ? 'var(--o3-success)' : state==='active' ? 'var(--o3-brand)' : 'var(--o3-border-default)';
      var fg = state==='pending' ? 'var(--text-secondary)' : '#fff';
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">'
        +   '<div style="width:28px;height:28px;border-radius:50%;background:'+bg+';color:'+fg+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">' + (state==='done' ? '✓' : n) + '</div>'
        +   '<span style="font-size:11px;color:var(--text-secondary);text-align:center">' + label + '</span>'
        + '</div>';
    };
    var line = '<div style="flex:1;height:2px;background:var(--o3-border-subtle);margin:13px 0"></div>';
    var body = '<div style="display:flex;align-items:flex-start;max-width:680px">'
      + step(1, 'RFQ',     'done') + line
      + step(2, 'Quote',   'done') + line
      + step(3, 'PO',      'done') + line
      + step(4, 'Plan',    'active') + line
      + step(5, 'Produce', 'pending') + line
      + step(6, 'Ship',    'pending')
      + '</div>';
    return { id:'stepper', label_vi:'Stepper', label_en:'Stepper', body_html: body,
      tokens:['control.height.standard','space.master','brand.primary','status.success.light','colorsLight.borderSubtle','colorsLight.borderStrong'] };
  }

  function progressSection(L){
    var bar = function(label, percent, tone){
      return '<div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--text-primary);font-weight:600">'+label+'</span><span style="color:var(--text-secondary);font-family:ui-monospace,monospace">'+percent+'%</span></div>'
        + '<div style="height:6px;background:var(--bg-surface-alt);border-radius:999px;overflow:hidden"><div style="width:'+percent+'%;height:100%;background:var(--o3-'+tone+');border-radius:999px"></div></div></div>';
    };
    var body = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:680px">'
      + bar('Readiness',   85, 'success')
      + bar('OTD',         98, 'info')
      + bar('NCR rate',    12, 'warning')
      + bar('Energy use',  64, 'brand')
      + bar('Material',     5, 'danger')
      + bar('Toolwear',    72, 'warning')
      + '</div>';
    return { id:'progress', label_vi:'Progress bar', label_en:'Progress bar', body_html: body,
      tokens:['space.master','radius.pill','brand.primary','status.success.light','status.warning.light','status.danger.light','status.info.light'] };
  }

  function avatarStatusSection(L){
    var av = function(initials, color){ return '<span style="width:32px;height:32px;border-radius:50%;background:'+color+';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">'+initials+'</span>'; };
    var dot = function(label, color){ return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px"><span style="width:8px;height:8px;border-radius:50%;background:'+color+'"></span>'+label+'</span>'; };
    var body = '<div style="display:flex;flex-direction:column;gap:14px">'
      + '<div style="display:flex;gap:6px;align-items:center">' + av('VS', 'var(--o3-brand)') + av('NA', 'var(--o3-success)') + av('TQ', 'var(--o3-warning)') + av('LD', 'var(--o3-danger)') + av('MK', 'var(--o3-info)') + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:14px">' + dot('Đang chạy','var(--o3-success)') + dot('Chờ','var(--o3-warning)') + dot('Lỗi','var(--o3-danger)') + dot('Bảo trì','var(--o3-info)') + dot('Tắt','var(--o3-neutral)') + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center"><span style="font-size:11px;color:var(--text-secondary)">User group:</span>'
      +   '<div style="display:flex">'+av('VS','var(--o3-brand)')+'<span style="margin-left:-8px">'+av('NA','var(--o3-success)')+'</span><span style="margin-left:-8px">'+av('+12','var(--o3-neutral)')+'</span></div></div>';
    body += '</div>';
    return { id:'avatar', label_vi:'Avatar & Status', label_en:'Avatar & Status', body_html: body,
      tokens:['brand.primary','status.success.light','status.warning.light','status.danger.light','status.info.light','status.neutral.light'] };
  }

  function paginationSection(L){
    var pg = function(n, active){
      var cls = active ? 'o3-btn o3-btn--primary o3-btn--sm' : 'o3-btn o3-btn--sm';
      return '<button class="'+cls+'" style="min-width:32px">'+n+'</button>';
    };
    var body = '<div style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;gap:4px;align-items:center"><button class="o3-btn o3-btn--sm">← Prev</button>'
      + pg(1,false)+pg(2,false)+pg(3,true)+pg(4,false)+pg(5,false)
      + '<span style="padding:0 6px;color:var(--text-secondary)">…</span>'+pg(24,false)
      + '<button class="o3-btn o3-btn--sm">Next →</button></div>'
      + '<div style="display:flex;gap:8px;align-items:center;font-size:12px;color:var(--text-secondary)"><span>Hiển thị</span>'
      + '<select style="height:24px;padding:0 6px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:12px"><option>10</option><option selected>20</option><option>50</option><option>100</option></select>'
      + '<span>/ trang · tổng <strong>483 bản ghi</strong></span></div></div>';
    return { id:'pagination', label_vi:'Pagination', label_en:'Pagination', body_html: body,
      tokens:['control.height.standard','space.master','radius.master','brand.primary','colorsLight.borderSubtle'] };
  }

  function timelineSection(L){
    var entry = function(time, who, action, color){
      return '<div style="display:flex;gap:10px;padding:6px 0;border-left:2px solid var(--o3-border-subtle);padding-left:12px;margin-left:6px;position:relative">'
        + '<span style="position:absolute;left:-5px;top:10px;width:8px;height:8px;border-radius:50%;background:'+color+';border:2px solid var(--o3-surface-card)"></span>'
        + '<div style="flex:1"><div style="font-size:12px;color:var(--text-primary)"><strong>'+who+'</strong> '+action+'</div><div style="font-size:10px;color:var(--text-secondary);font-family:ui-monospace,monospace">'+time+'</div></div></div>';
    };
    var body = '<div style="max-width:480px">'
      + entry('29/05 14:32', 'sanh.vo', 'commit SO-2026-9001 → CPO', 'var(--o3-success)')
      + entry('29/05 14:18', 'AEOI bot', 'extract email · confidence 0.96', 'var(--o3-info)')
      + entry('29/05 14:05', 'sanh.vo', 'approve case INT-2026-000041', 'var(--o3-success)')
      + entry('29/05 13:50', 'system', 'validation pass · 0 blockers', 'var(--o3-neutral)')
      + entry('29/05 13:42', 'AEOI bot', 'receive email từ buyer@lam.com', 'var(--o3-info)')
      + '</div>';
    return { id:'timeline', label_vi:'Timeline', label_en:'Audit timeline', body_html: body,
      tokens:['space.master','colorsLight.borderSubtle','colorsLight.textPrimary','status.success.light','status.info.light','status.neutral.light'] };
  }

  function modalSection(L){
    var body = '<div style="display:flex;flex-direction:column;gap:10px">'
      + '<div style="position:relative;width:100%;max-width:480px;padding:0;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--o3-border-subtle)"><strong style="font-size:14px">Duyệt CPO</strong><button class="o3-btn o3-btn--sm o3-btn--ghost">×</button></div>'
      +   '<div style="padding:14px;font-size:13px;color:var(--text-primary);line-height:1.5">Bạn có chắc muốn commit <strong>SO-2026-9001</strong> vào Customer PO? Hành động này không thể hoàn tác.</div>'
      +   '<div style="display:flex;justify-content:flex-end;gap:6px;padding:10px 14px;border-top:1px solid var(--o3-border-subtle);background:var(--bg-surface-alt)">'
      +     '<button class="o3-btn">Huỷ</button><button class="o3-btn o3-btn--primary">Duyệt + Commit</button></div>'
      + '</div>'
      + '<div style="display:flex;gap:6px"><button class="o3-btn o3-btn--success">✓ Confirm action</button><button class="o3-btn o3-btn--danger">✗ Destructive action</button></div></div>';
    return { id:'modal', label_vi:'Modal / Dialog', label_en:'Modal / Dialog', body_html: body,
      tokens:['control.height.standard','space.master','radius.card','colorsLight.bgSurface','colorsLight.borderSubtle','brand.primary','status.success.light','status.danger.light'] };
  }

  function statusIndicatorSection(L){
    var card = function(label, value, tone, sub){
      return '<div style="padding:8px 12px;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);display:flex;flex-direction:column;gap:2px">'
        + '<span style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em">'+label+'</span>'
        + '<span style="font-size:18px;font-weight:600;color:var(--o3-'+tone+')">'+value+'</span>'
        + (sub ? '<span style="font-size:10px;color:var(--text-secondary)">'+sub+'</span>' : '')
        + '</div>';
    };
    var body = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;max-width:760px">'
      + card('Trạng thái CNC-01', '● Running', 'success', '4h 22m uptime')
      + card('Trạng thái CNC-02', '● Idle',    'warning', '12m')
      + card('Trạng thái CNC-03', '● Down',    'danger',  'tool change')
      + card('OEE today',        '87%',       'info',    'target 85%')
      + '</div>'
      + '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><span class="o3-chip o3-chip--success">QC pass</span><span class="o3-chip o3-chip--warning">FAI pending</span><span class="o3-chip o3-chip--danger">NCR opened</span><span class="o3-chip o3-chip--info">Inspection due</span><span class="o3-chip">Idle 12m</span></div>';
    return { id:'status', label_vi:'Status indicator', label_en:'Status indicator', body_html: body,
      tokens:['space.master','radius.card','colorsLight.bgSurface','colorsLight.borderSubtle','status.success.light','status.warning.light','status.danger.light','status.info.light'] };
  }

  function tooltipSection(L){
    var body = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span style="position:relative;display:inline-flex"><button class="o3-btn">Hover me</button>'
      + '<span style="position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);padding:4px 8px;background:rgba(15,23,42,0.92);color:#fff;font-size:11px;border-radius:4px;white-space:nowrap">Tooltip text · 11px</span></span>'
      + '<span style="position:relative;display:inline-flex"><button class="o3-btn o3-btn--primary">With shortcut</button>'
      + '<span style="position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);padding:4px 8px;background:rgba(15,23,42,0.92);color:#fff;font-size:11px;border-radius:4px;white-space:nowrap;display:flex;gap:4px;align-items:center">Save<kbd style="background:rgba(255,255,255,0.2);padding:0 4px;border-radius:2px">⌘S</kbd></span></span>'
      + '<div style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--text-secondary)">'
      +   '<span>OEE 87%</span><span style="width:14px;height:14px;border-radius:50%;background:var(--bg-surface-alt);display:inline-flex;align-items:center;justify-content:center;font-size:10px;cursor:help">?</span></div>'
      + '</div>';
    return { id:'tooltip', label_vi:'Tooltip / Popover', label_en:'Tooltip / Popover', body_html: body,
      tokens:['control.height.standard','radius.master','colorsLight.textPrimary','colorsLight.bgSurfaceAlt'] };
  }

  function sparklineSection(L){
    // SVG sparkline + KPI value combo
    var spark = function(points, color){
      var max = Math.max.apply(null, points), min = Math.min.apply(null, points);
      var w = 80, h = 24;
      var path = points.map(function(p, i){
        var x = (i/(points.length-1))*w, y = h - ((p-min)/(max-min || 1))*h;
        return (i===0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="vertical-align:middle"><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="1.5"/></svg>';
    };
    var row = function(label, val, delta, deltaTone, points, pointsTone){
      return '<div style="display:flex;align-items:center;gap:14px;padding:8px 12px;border-bottom:1px solid var(--o3-border-subtle);font-size:13px">'
        + '<span style="flex:1;color:var(--text-primary)">'+label+'</span>'
        + '<span style="font-weight:600;color:var(--text-primary);min-width:60px;text-align:right">'+val+'</span>'
        + '<span style="font-size:11px;color:var(--o3-'+deltaTone+');min-width:50px;text-align:right">'+delta+'</span>'
        + spark(points, 'var(--o3-'+pointsTone+')')
        + '</div>';
    };
    var body = '<div style="max-width:560px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);overflow:hidden">'
      + row('OTD',        '98%',  '+2%',  'success', [80,82,85,88,86,90,95,98],'success')
      + row('NCR',        '0.8%', '-0.3%','success', [1.5,1.2,1.0,1.1,0.9,1.0,0.9,0.8],'success')
      + row('Lead time',  '4.2 d','+0.5', 'warning', [3.0,3.2,3.5,3.6,3.8,4.0,4.1,4.2],'warning')
      + row('Tool wear',  '72%',  '+8%',  'danger',  [50,55,58,62,65,68,70,72],'danger')
      + '</div>';
    return { id:'sparkline', label_vi:'Sparkline KPI', label_en:'Sparkline KPI', body_html: body,
      tokens:['space.master','colorsLight.bgSurface','colorsLight.borderSubtle','status.success.light','status.warning.light','status.danger.light'] };
  }

  function kanbanSection(L){
    var col = function(title, count, items, headerTone){
      var html = '<div style="flex:1;min-width:140px;background:var(--bg-surface-alt);border-radius:var(--o3-radius-card);padding:8px;display:flex;flex-direction:column;gap:6px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><strong style="font-size:11px;color:var(--o3-'+headerTone+');text-transform:uppercase;letter-spacing:.04em">'+title+'</strong><span style="font-size:10px;background:var(--bg-surface);padding:0 6px;border-radius:999px;color:var(--text-secondary)">'+count+'</span></div>';
      items.forEach(function(i){
        html += '<div style="padding:6px 8px;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:11px"><strong>'+i.id+'</strong><div style="color:var(--text-secondary);margin-top:2px">'+i.text+'</div></div>';
      });
      return html + '</div>';
    };
    var body = '<div style="display:flex;gap:8px;max-width:760px">'
      + col('Chờ', 3, [{id:'WO-7301',text:'CNC-01 · 14:00'},{id:'WO-7302',text:'CNC-02 · 15:30'},{id:'WO-7303',text:'CNC-03 · queued'}], 'warning')
      + col('Đang chạy', 2, [{id:'WO-7298',text:'CNC-04 · 87%'},{id:'WO-7299',text:'CNC-05 · 42%'}], 'info')
      + col('QC', 1, [{id:'WO-7295',text:'FAI pending'}], 'brand')
      + col('Xong', 5, [{id:'WO-7290',text:'shipped'}], 'success')
      + '</div>';
    return { id:'kanban', label_vi:'Kanban board', label_en:'Kanban board', body_html: body,
      tokens:['space.master','radius.card','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','brand.primary','status.success.light','status.warning.light','status.info.light'] };
  }

  function filterPanelSection(L){
    var body = '<div style="display:flex;gap:12px;max-width:760px">'
      + '<aside style="width:200px;padding:10px;background:var(--bg-surface-alt);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);font-size:12px">'
      +   '<div style="font-weight:600;color:var(--text-primary);margin-bottom:8px">Bộ lọc</div>'
      +   '<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Trạng thái</div>'
      +     '<label style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox" checked> Active <span style="color:var(--text-secondary);margin-left:auto">42</span></label>'
      +     '<label style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox"> Pending <span style="color:var(--text-secondary);margin-left:auto">12</span></label>'
      +     '<label style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox"> Closed <span style="color:var(--text-secondary);margin-left:auto">128</span></label>'
      +   '</div>'
      +   '<div><div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Khách hàng</div>'
      +     '<label style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox" checked> LAM Research <span style="color:var(--text-secondary);margin-left:auto">23</span></label>'
      +     '<label style="display:flex;gap:6px;align-items:center;padding:2px 0"><input type="checkbox"> Applied Mat. <span style="color:var(--text-secondary);margin-left:auto">11</span></label>'
      +   '</div>'
      + '</aside>'
      + '<div style="flex:1;padding:10px;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);font-size:12px;color:var(--text-secondary)"><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="o3-chip o3-chip--brand">Active ✕</span><span class="o3-chip o3-chip--brand">LAM Research ✕</span></div><div>Result: 23 records match.</div></div>'
      + '</div>';
    return { id:'filter', label_vi:'Filter panel', label_en:'Filter panel', body_html: body,
      tokens:['space.master','radius.card','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','brand.primary'] };
  }

  function skeletonSection(L){
    var pulse = 'background:linear-gradient(90deg,var(--bg-surface-alt) 0%,var(--bg-surface) 50%,var(--bg-surface-alt) 100%);background-size:200% 100%;animation:o3-skel 1.4s ease-in-out infinite;border-radius:var(--o3-radius)';
    var line = function(w){ return '<div style="height:10px;width:'+w+';' + pulse + '"></div>'; };
    var body = '<style>@keyframes o3-skel{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>'
      + '<div style="max-width:520px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius-card);padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--bg-surface)">'
      +   line('40%') + line('80%') + line('70%') + line('30%')
      +   '<div style="display:flex;gap:6px;margin-top:6px">'
      +     '<div style="height:28px;width:80px;'+pulse+'"></div>'
      +     '<div style="height:28px;width:80px;'+pulse+'"></div>'
      +   '</div></div>';
    return { id:'skeleton', label_vi:'Loading skeleton', label_en:'Loading skeleton', body_html: body,
      tokens:['space.master','radius.master','radius.card','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle'] };
  }

  function dropdownSection(L){
    var body = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">'
      + '<div style="width:200px;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);box-shadow:0 2px 8px rgba(0,0,0,0.06);font-size:12px;overflow:hidden">'
      +   '<button style="display:flex;width:100%;padding:6px 10px;border:0;background:transparent;align-items:center;gap:6px;cursor:pointer;text-align:left">📋 Mở chi tiết</button>'
      +   '<button style="display:flex;width:100%;padding:6px 10px;border:0;background:var(--bg-surface-alt);align-items:center;gap:6px;cursor:pointer;text-align:left;color:var(--o3-brand);font-weight:500">✏️ Chỉnh sửa</button>'
      +   '<button style="display:flex;width:100%;padding:6px 10px;border:0;background:transparent;align-items:center;gap:6px;cursor:pointer;text-align:left">📤 Xuất bản</button>'
      +   '<button style="display:flex;width:100%;padding:6px 10px;border:0;background:transparent;align-items:center;gap:6px;cursor:pointer;text-align:left">🔁 Duplicate</button>'
      +   '<div style="border-top:1px solid var(--o3-border-subtle)"></div>'
      +   '<button style="display:flex;width:100%;padding:6px 10px;border:0;background:transparent;align-items:center;gap:6px;cursor:pointer;text-align:left;color:var(--o3-danger)">🗑️ Xoá</button>'
      + '</div>'
      + '<div style="width:220px;background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);box-shadow:0 2px 8px rgba(0,0,0,0.06);font-size:12px;padding:8px"><div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;padding:0 4px 6px">Bộ lọc nhanh</div>'
      +   '<label style="display:flex;gap:6px;align-items:center;padding:4px"><input type="checkbox" checked> Hôm nay</label>'
      +   '<label style="display:flex;gap:6px;align-items:center;padding:4px"><input type="checkbox"> Tuần này</label>'
      +   '<label style="display:flex;gap:6px;align-items:center;padding:4px"><input type="checkbox"> Tháng này</label></div>'
      + '</div>';
    return { id:'dropdown', label_vi:'Dropdown menu', label_en:'Dropdown menu', body_html: body,
      tokens:['space.master','radius.master','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','brand.primary','status.danger.light'] };
  }

  /* ── SSOT merger from legacy Tokens + Effects tabs (v3-G11) ───────
   * Previously the admin Appearance area had separate tabs for:
   *   • Token hệ thống (Typography + Colors + Layout)
   *   • Hiệu ứng (Motion + Focus ring + Overlay + Skeleton)
   * Those edit the SAME underlying CSS vars as Module Master per-
   * component properties — duplicate edit paths = SSOT violation.
   * The three sections below host the legacy content INSIDE Module
   * Master so admins can edit the global ramps from one place and
   * the parent Appearance tabs become read-only / removable. */

  function globalTokensSection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:14px">'
      +   '<div style="font-size:12px;color:var(--text-secondary)">'
      +     esc(L('Color ramp + status palette toàn hệ thống. Đây là SSOT cho mọi module.','Global colour ramp + status palette. SSOT for every module.'))
      +   '</div>'
      +   '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-brand);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">brand</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-brand-hover);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">brand-hover</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-success);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">success</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-warning);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">warning</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-danger);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">danger</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-info);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">info</span></div>'
      +   '</div>'
      +   '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-surface-page);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">page</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-surface-card);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">card</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-surface-muted);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">muted</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-surface-raised);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">raised</span></div>'
      +     '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px;border-radius:8px;background:var(--o3-neutral);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">neutral</span></div>'
      +   '</div>'
      + '</div>';
    return { id:'global-tokens', label_vi:'🌐 Global tokens', label_en:'🌐 Global tokens', body_html: body,
      tokens:['brand.primary','brand.primaryHover','brand.primarySoft','status.success.light','status.warning.light','status.danger.light','status.info.light','status.neutral.light','colorsLight.bgPage','colorsLight.bgSurface','colorsLight.bgSurfaceAlt','colorsLight.borderSubtle','colorsLight.borderStrong'] };
  }

  function typographySection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:10px">'
      +   '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">'+esc(L('Cỡ chữ ramp','Font-size ramp'))+'</div>'
      +   '<div style="font-size:var(--o3-font-size-xs);color:var(--text-primary)">XS · 11px · Caption · Bộ lọc nhanh tháng này</div>'
      +   '<div style="font-size:var(--o3-font-size-sm);color:var(--text-primary)">SM · 12px · Body small · Filter chips</div>'
      +   '<div style="font-size:var(--o3-font-size-md);color:var(--text-primary)">MD · 13px · Body default · Most labels</div>'
      +   '<div style="font-size:var(--o3-font-size-lg);color:var(--text-primary)">LG · 15px · Card title · Sub heading</div>'
      +   '<div style="font-size:var(--o3-font-size-xl);color:var(--text-primary)">XL · 18px · Section heading</div>'
      +   '<div style="font-size:var(--o3-font-size-2xl);color:var(--text-primary)">2XL · 22px · KPI value</div>'
      +   '<div style="font-size:var(--o3-font-size-3xl);color:var(--text-primary)">3XL · 28px · Hero number</div>'
      +   '<div style="margin-top:14px;font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">'+esc(L('Độ đậm','Weight'))+'</div>'
      +   '<div style="font-weight:var(--o3-font-weight-regular)">Regular 400 · Standard body</div>'
      +   '<div style="font-weight:var(--o3-font-weight-medium)">Medium 500 · Labels, button text</div>'
      +   '<div style="font-weight:var(--o3-font-weight-semi)">Semibold 600 · Subheads</div>'
      +   '<div style="font-weight:var(--o3-font-weight-bold)">Bold 700 · KPI values</div>'
      + '</div>';
    return { id:'typography', label_vi:'🔠 Typography', label_en:'🔠 Typography', body_html: body, tokens:[] };
  }

  function effectsGlobalSection(L){
    var body = ''
      + '<div style="display:flex;flex-direction:column;gap:14px">'
      +   '<div style="font-size:12px;color:var(--text-secondary)">'+esc(L('Motion + shadow + z-index ramp toàn hệ thống.','Global motion + shadow + z-index ramp.'))+'</div>'
      +   '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">'
      +     '<div style="display:flex;flex-direction:column;gap:4px"><div style="width:100px;height:60px;border-radius:8px;background:var(--o3-surface-card);box-shadow:var(--o3-shadow-card);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">shadow-card</span></div>'
      +     '<div style="display:flex;flex-direction:column;gap:4px"><div style="width:100px;height:60px;border-radius:8px;background:var(--o3-surface-card);box-shadow:var(--o3-shadow-raised);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">shadow-raised</span></div>'
      +     '<div style="display:flex;flex-direction:column;gap:4px"><div style="width:100px;height:60px;border-radius:8px;background:var(--o3-surface-card);box-shadow:var(--o3-shadow-drawer);border:1px solid var(--o3-border-subtle)"></div><span style="font-size:10px">shadow-drawer</span></div>'
      +   '</div>'
      +   '<div style="margin-top:8px;font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">'+esc(L('Motion ramp (hover để xem)','Motion ramp (hover to see)'))+'</div>'
      +   '<div style="display:flex;gap:14px;flex-wrap:wrap">'
      +     '<button style="height:32px;padding:0 14px;background:var(--o3-brand);color:#fff;border:0;border-radius:6px;transition:transform var(--o3-motion-fast)" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">fast 120ms</button>'
      +     '<button style="height:32px;padding:0 14px;background:var(--o3-brand);color:#fff;border:0;border-radius:6px;transition:transform var(--o3-motion-base)" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">base 200ms</button>'
      +     '<button style="height:32px;padding:0 14px;background:var(--o3-brand);color:#fff;border:0;border-radius:6px;transition:transform var(--o3-motion-slow)" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">slow 320ms</button>'
      +   '</div>'
      + '</div>';
    return { id:'effects', label_vi:'✨ Effects', label_en:'✨ Effects', body_html: body, tokens:[] };
  }

  function sections(L){
    return [
      /* v3-G15 (2026-05-29): Global sections REMOVED from Module Master.
       * Density (Khe hở Master), Global tokens, Typography, Effects are
       * now exclusively in the 🎨 Theme tab. Module Master keeps ONLY
       * per-component preview sections so the SSOT split is clean:
       *   • Theme tab  = global design tokens (theme-level)
       *   • Module Master = per-component DETAILS (override-level)
       * Per-property "Custom" checkbox in the dock lets a single
       * component override the global value without touching others. */
      buttonsSection(L),
      formFieldsSection(L),
      tabsSection(L),
      kpiSection(L),
      sparklineSection(L),
      progressSection(L),
      chipsSection(L),
      statusIndicatorSection(L),
      avatarStatusSection(L),
      toolbarSection(L),
      tableSection(L),
      treeSection(L),
      kanbanSection(L),
      timelineSection(L),
      stepperSection(L),
      paginationSection(L),
      filterPanelSection(L),
      panelSection(L),
      modalSection(L),
      dropdownSection(L),
      tooltipSection(L),
      skeletonSection(L),
      emptyAndToastSection(L)
    ];
  }

  // Internal state — which inner tab is active inside the Module Sample tab.
  // Default to 'density' since the master gap knob is the first thing
  // an admin should see when they open Module Sample.
  // v3-G15: default to 'buttons' since 'density'/global sections moved to Theme tab.
  var _activeSection = 'buttons';

  /* Authoritative token-key → CSS variable map.
   * Mirrors graphics_token_catalog.css_variable. Without this lookup
   * the inline editor was setting `--control-height-standard` instead
   * of `--o3-control-h-standard` so visual updates never appeared.
   * Bug reported by user 2026-05-29. Single source of truth here;
   * downstream wireInlineTokenEditors() looks values up here. */
  var TOKEN_CSS_VAR = {
    // control heights
    'control.height.standard':  ['--o3-control-h-standard', '--o3-control-h-md', '--o3-control-h-sm', '--o3-control-h-lg'],
    // master density
    'space.master':             ['--o3-space', '--master-gap', '--o3-space-xs', '--o3-space-sm', '--o3-space-md', '--o3-space-lg'],
    'space.section':            ['--o3-space-section', '--section-gap', '--o3-space-xl', '--o3-space-2xl', '--o3-space-3xl'],
    'radius.master':            ['--o3-radius', '--master-radius', '--o3-radius-sm', '--o3-radius-md'],
    'radius.card':              ['--o3-radius-card', '--card-radius', '--o3-radius-lg'],
    'radius.pill':              ['--o3-radius-pill'],
    // legacy spacing aliases — for completeness
    'spacing.xs':               ['--o3-space-xs'],
    'spacing.sm':               ['--o3-space-sm'],
    'spacing.md':               ['--o3-space-md'],
    'spacing.lg':               ['--o3-space-lg'],
    'spacing.xl':               ['--o3-space-xl'],
    'spacing.2xl':              ['--o3-space-2xl'],
    'spacing.3xl':              ['--o3-space-3xl'],
    // legacy radius aliases
    'radius.sm':                ['--o3-radius-sm'],
    'radius.md':                ['--o3-radius-md'],
    'radius.lg':                ['--o3-radius-lg'],
    // colors
    'brand.primary':            ['--o3-brand',         '--brand-primary'],
    'brand.primaryHover':       ['--o3-brand-hover',   '--brand-primary-hover'],
    'brand.primarySoft':        ['--o3-brand-soft',    '--brand-primary-soft'],
    'colorsLight.bgPage':       ['--o3-surface-page',  '--bg-page',        '--bg-app'],
    'colorsLight.bgSurface':    ['--o3-surface-card',  '--bg-surface',     '--surface-1'],
    'colorsLight.bgSurfaceAlt': ['--o3-surface-muted', '--bg-surface-alt', '--surface-3'],
    'colorsLight.textPrimary':  ['--o3-text-strong',   '--text-primary',   '--text-1'],
    'colorsLight.textSecondary':['--o3-text-default',  '--text-secondary', '--text-2'],
    'colorsLight.textTertiary': ['--o3-text-muted',    '--text-tertiary',  '--text-3'],
    'colorsLight.textOnBrand':  ['--text-on-brand'],
    'colorsLight.borderSubtle': ['--o3-border-subtle', '--border-subtle', '--border-1'],
    'colorsLight.borderDefault':['--o3-border-default','--border-default','--border-2'],
    'colorsLight.borderStrong': ['--o3-border-strong', '--border-strong', '--border-3'],
    'colorsLight.textMuted':    ['--o3-text-muted',    '--text-muted',    '--text-4'],
    'status.success.light':     ['--o3-success', '--status-success', '--state-success'],
    'status.success.soft':      ['--o3-success-soft', '--state-success-soft'],
    'status.warning.light':     ['--o3-warning', '--status-warning', '--state-warning'],
    'status.warning.soft':      ['--o3-warning-soft', '--state-warning-soft'],
    'status.danger.light':      ['--o3-danger', '--status-error', '--state-danger'],
    'status.danger.soft':       ['--o3-danger-soft', '--state-danger-soft'],
    'status.info.light':        ['--o3-info', '--status-info', '--state-info'],
    'status.info.soft':         ['--o3-info-soft', '--state-info-soft'],
    'status.neutral.light':     ['--o3-neutral', '--state-neutral'],
    'status.neutral.soft':      ['--o3-neutral-soft', '--state-neutral-soft']
  };

  /* ── Property catalog (v3-G10, 2026-05-29) ─────────────────────────
   * Per-section grouped property catalog. Each entry is an array of
   * { id, label_vi, label_en, items[] } sub-tab groups. Items can be
   * either kind:'token' (uses TOKEN_CSS_VAR) or kind:'cssvar' (direct
   * CSS variable binding). World-class properties researched from
   * Figma Inspector, Material 3, IBM Carbon, Atlassian, SLDS, Vercel
   * Geist. Sections not in catalog fall back to a single-group editor
   * derived from the section's legacy `tokens[]` field. */
  function _l(vi, en){ return { vi: vi, en: en }; }
  function _tc(key, vi, en){ return { kind:'token', key:key, type:'color', label:_l(vi,en) }; }
  function _tn(key, vi, en, mn, mx){ return { kind:'token', key:key, type:'number', unit:'px', min:mn||0, max:mx||48, label:_l(vi,en) }; }
  function _vn(cv, vi, en, mn, mx, u){ return { kind:'cssvar', cssVar:cv, type:'number', unit:u===undefined?'px':u, min:mn||0, max:mx||48, label:_l(vi,en) }; }
  function _grp(id, vi, en, items){ return { id:id, label_vi:vi, label_en:en, items:items }; }

  var PROPERTY_CATALOG = {
    'density': [
      _grp('master','Master','Master',[
        _tn('space.master','Khe hở chính','Master gap',2,24),
        _tn('space.section','Khe phân đoạn','Section gap',4,32),
        _tn('radius.master','Bo góc control','Control radius',0,16),
        _tn('radius.card','Bo góc panel','Card radius',0,20),
        _tn('control.height.standard','Cao chuẩn','Standard height',24,56)
      ])
    ],
    'global-tokens': [
      _grp('brand','Thương hiệu','Brand',[
        _tc('brand.primary','Brand chính','Brand primary'),
        _tc('brand.primaryHover','Brand · hover','Brand hover'),
        _tc('brand.primarySoft','Brand · soft','Brand soft'),
        _tc('colorsLight.textOnBrand','Chữ trên nền brand','Text on brand')
      ]),
      _grp('status','Trạng thái','Status',[
        _tc('status.success.light','Success','Success'),
        _tc('status.success.soft','Success soft','Success soft'),
        _tc('status.warning.light','Warning','Warning'),
        _tc('status.warning.soft','Warning soft','Warning soft'),
        _tc('status.danger.light','Danger','Danger'),
        _tc('status.danger.soft','Danger soft','Danger soft'),
        _tc('status.info.light','Info','Info'),
        _tc('status.info.soft','Info soft','Info soft'),
        _tc('status.neutral.light','Neutral','Neutral'),
        _tc('status.neutral.soft','Neutral soft','Neutral soft')
      ]),
      _grp('surface','Nền','Surface',[
        _tc('colorsLight.bgPage','Nền trang','Page bg'),
        _tc('colorsLight.bgSurface','Nền thẻ','Card bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền mờ','Muted bg')
      ]),
      _grp('text','Chữ','Text',[
        _tc('colorsLight.textPrimary','Chữ chính','Primary text'),
        _tc('colorsLight.textSecondary','Chữ phụ','Secondary text'),
        _tc('colorsLight.textTertiary','Chữ mờ','Tertiary text')
      ]),
      _grp('border','Viền','Border',[
        _tc('colorsLight.borderSubtle','Viền nhẹ','Subtle border'),
        _tc('colorsLight.borderStrong','Viền đậm','Strong border')
      ])
    ],
    'typography': [
      _grp('size','Cỡ chữ','Font sizes',[
        _vn('--o3-font-size-xs','XS · caption','XS caption',8,16),
        _vn('--o3-font-size-sm','SM · body small','SM body small',9,18),
        _vn('--o3-font-size-md','MD · body default','MD body',10,20),
        _vn('--o3-font-size-lg','LG · card title','LG card',12,24),
        _vn('--o3-font-size-xl','XL · section','XL section',14,32),
        _vn('--o3-font-size-2xl','2XL · KPI','2XL KPI',16,40),
        _vn('--o3-font-size-3xl','3XL · hero','3XL hero',18,56)
      ]),
      _grp('weight','Độ đậm','Weight',[
        _vn('--o3-font-weight-regular','Regular','Regular',100,900,''),
        _vn('--o3-font-weight-medium','Medium','Medium',100,900,''),
        _vn('--o3-font-weight-semi','Semibold','Semibold',100,900,''),
        _vn('--o3-font-weight-bold','Bold','Bold',100,900,'')
      ])
    ],
    'effects': [
      _grp('motion','Chuyển động','Motion',[
        _vn('--o3-motion-fast','Fast','Fast',0,500,'ms'),
        _vn('--o3-motion-base','Base','Base',0,800,'ms'),
        _vn('--o3-motion-slow','Slow','Slow',0,1500,'ms')
      ]),
      _grp('zindex','Lớp xếp chồng','Z-index',[
        _vn('--o3-z-base','Base','Base',0,100,''),
        _vn('--o3-z-sticky','Sticky','Sticky',1,1000,''),
        _vn('--o3-z-drawer','Drawer','Drawer',10,9000,''),
        _vn('--o3-z-modal','Modal','Modal',50,9500,''),
        _vn('--o3-z-toast','Toast','Toast',100,9999,'')
      ])
    ],
    'buttons': [
      // v3-G19 — only properties the button ACTUALLY consumes. Padding-Y
      // removed (button uses fixed height, vertical padding has no visual
      // effect). Khe giữa nút now correctly drives the container gap
      // (previously container had hardcoded 8px).
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Chiều cao nút','Button height',24,56),
        _vn('--o3-space-md','Padding ngang','Horizontal padding',4,32),
        _vn('--o3-radius','Bo góc','Border radius',0,20),
        _vn('--o3-space-sm','Khe giữa nút','Gap between buttons',0,24),
        _vn('--o3-space-xs','Khe icon-chữ','Icon-text gap',0,12)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Brand chính','Primary brand'),
        _tc('brand.primaryHover','Brand · hover','Primary hover'),
        _tc('brand.primarySoft','Brand · soft','Primary soft'),
        _tc('status.success.light','Success','Success'),
        _tc('status.warning.light','Warning','Warning'),
        _tc('status.danger.light','Danger','Danger'),
        _tc('status.info.light','Info','Info'),
        _tc('colorsLight.bgSurface','Nền ghost','Ghost bg'),
        _tc('colorsLight.borderDefault','Border default','Default border'),
        _tc('colorsLight.textOnBrand','Chữ trên brand','Text on brand'),
        _tc('colorsLight.textPrimary','Chữ default','Default text'),
        _tc('colorsLight.textMuted','Chữ disabled','Disabled text')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-md','Cỡ chữ','Font size',10,18),
        _vn('--o3-font-weight-semi','Độ đậm','Font weight',400,800,''),
        _vn('--o3-font-size-sm','Cỡ chữ nhỏ','Small variant',9,14)
      ]),
      _grp('motion','Hiệu ứng','Motion',[
        _vn('--o3-motion-fast','Hover fast','Hover transition',0,300,'ms'),
        _vn('--o3-motion-base','Click base','Click transition',0,500,'ms')
      ])
    ],
    'form': [
      // v3-G20 — only properties the input ACTUALLY consumes. Padding-Y
      // removed (input uses fixed height). Label-input gap now correctly
      // wires to the column gap inside each <label>. Field-field gap
      // drives the grid gap between fields.
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Chiều cao input','Input height',24,56),
        _vn('--o3-space-md','Padding ngang','Horizontal padding',4,24),
        _vn('--o3-radius','Bo góc','Border radius',0,16),
        _vn('--o3-space-xs','Gap label-input','Label-input gap',0,16),
        _vn('--o3-space-md','Gap field-field','Field group gap',0,32)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền input','Input background'),
        _tc('colorsLight.bgSurfaceAlt','Nền disabled','Disabled background'),
        _tc('colorsLight.borderSubtle','Border default','Default border'),
        _tc('colorsLight.borderDefault','Border hover','Hover border'),
        _tc('brand.primary','Border focus','Focus border'),
        _tc('colorsLight.textPrimary','Chữ chính','Primary text'),
        _tc('colorsLight.textSecondary','Chữ label','Label text'),
        _tc('colorsLight.textTertiary','Placeholder','Placeholder text'),
        _tc('status.danger.light','Border lỗi','Error border'),
        _tc('status.danger.soft','Nền lỗi','Error bg'),
        _tc('status.warning.light','Border warning','Warning border')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-md','Cỡ chữ input','Input font size',10,18),
        _vn('--o3-font-size-sm','Cỡ chữ label','Label font size',9,16),
        _vn('--o3-font-size-xs','Cỡ chữ helper','Helper text size',8,14),
        _vn('--o3-font-weight-medium','Độ đậm label','Label weight',400,800,'')
      ])
    ],
    'tabs': [
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Chiều cao tab','Tab height',24,56),
        _vn('--o3-space-lg','Padding ngang tab','Tab horizontal padding',6,32),
        _vn('--o3-space-md','Khe giữa tab','Gap between tabs',0,24)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Màu indicator','Indicator color'),
        _tc('colorsLight.textPrimary','Chữ tab active','Active text'),
        _tc('colorsLight.textTertiary','Chữ tab inactive','Inactive text'),
        _tc('colorsLight.borderSubtle','Border bottom','Bottom border'),
        _tc('colorsLight.bgSurface','Nền tab bar','Tab bar bg')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-md','Cỡ chữ tab','Tab font size',10,18),
        _vn('--o3-font-weight-medium','Độ đậm','Weight',400,800,'')
      ])
    ],
    'kpi': [
      // v3-G18 expanded ~18 properties — Material 3 KPI + Bloomberg data tile spec
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-lg','Padding tile','Tile padding',4,32),
        _vn('--o3-radius-card','Bo góc tile','Tile radius',0,20),
        _vn('--o3-space-sm','Gap label-value','Label-value gap',0,16),
        _vn('--o3-space-xs','Gap value-sub','Value-sub gap',0,12),
        _vn('--o3-space-md','Grid gap','Grid gap',0,32)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền tile','Tile bg'),
        _tc('colorsLight.borderSubtle','Border tile','Tile border'),
        _tc('brand.primary','Brand value','Brand value'),
        _tc('status.success.light','Success value','Success value'),
        _tc('status.warning.light','Warning value','Warning value'),
        _tc('status.danger.light','Danger value','Danger value'),
        _tc('status.info.light','Info value','Info value'),
        _tc('status.neutral.light','Neutral value','Neutral value'),
        _tc('colorsLight.textPrimary','Chữ giá trị','Value text'),
        _tc('colorsLight.textSecondary','Chữ label','Label text'),
        _tc('colorsLight.textTertiary','Chữ phụ','Sub text')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-xs','Cỡ label','Label font size',9,14),
        _vn('--o3-font-size-2xl','Cỡ giá trị','Value font size',16,36),
        _vn('--o3-font-size-3xl','Cỡ hero','Hero font size',20,48),
        _vn('--o3-font-size-sm','Cỡ sub','Sub font size',9,16),
        _vn('--o3-font-weight-bold','Độ đậm giá trị','Value weight',400,900,''),
        _vn('--o3-font-weight-medium','Độ đậm label','Label weight',400,800,'')
      ])
    ],
    'chips': [
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Chiều cao chip','Chip height',20,48),
        _vn('--o3-space-sm','Padding ngang','Horizontal padding',4,20),
        _vn('--o3-radius-pill','Bo góc','Border radius',0,999),
        _vn('--o3-space-xs','Gap chip-chip','Chip gap',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('status.success.soft','BG success','Success soft bg'),
        _tc('status.warning.soft','BG warning','Warning soft bg'),
        _tc('status.danger.soft','BG danger','Danger soft bg'),
        _tc('status.info.soft','BG info','Info soft bg'),
        _tc('status.neutral.soft','BG neutral','Neutral soft bg'),
        _tc('brand.primarySoft','BG filter active','Filter active bg')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-xs','Cỡ chữ chip','Chip font size',9,14),
        _vn('--o3-font-weight-medium','Độ đậm','Weight',400,800,'')
      ])
    ],
    'toolbar': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Padding toolbar','Toolbar padding',4,24),
        _vn('--o3-space-sm','Gap item','Item gap',0,16),
        _vn('--o3-radius-card','Bo góc','Radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền','Background'),
        _tc('colorsLight.borderSubtle','Border','Border')
      ])
    ],
    'table': [
      // v3-G18 expanded ~19 properties — SAP Fiori data table + AG-Grid spec
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Cao hàng','Row height',24,56),
        _vn('--o3-space-md','Padding ngang cell','Cell padding-X',4,24),
        _vn('--o3-space-sm','Padding dọc cell','Cell padding-Y',0,16),
        _vn('--o3-space-md','Cao header','Header height',20,56),
        _vn('--o3-space-xs','Padding dense','Compact density',0,12)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền hàng','Row bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền hàng zebra','Zebra row bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền header','Header bg'),
        _tc('colorsLight.borderSubtle','Border ngang','Row border'),
        _tc('colorsLight.borderDefault','Border header','Header border'),
        _tc('colorsLight.textPrimary','Chữ cell','Cell text'),
        _tc('colorsLight.textSecondary','Chữ header','Header text'),
        _tc('brand.primarySoft','Nền hover','Row hover bg'),
        _tc('brand.primary','Nền selected','Row selected'),
        _tc('colorsLight.textOnBrand','Chữ selected','Selected text')
      ]),
      _grp('typography','Chữ','Typography',[
        _vn('--o3-font-size-md','Cỡ chữ cell','Cell font size',10,18),
        _vn('--o3-font-size-xs','Cỡ chữ header','Header font size',9,14),
        _vn('--o3-font-weight-semi','Độ đậm header','Header weight',400,800,'')
      ]),
      _grp('motion','Hiệu ứng','Motion',[
        _vn('--o3-motion-fast','Hover transition','Hover',0,300,'ms')
      ])
    ],
    'panel': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-lg','Padding panel','Panel padding',4,40),
        _vn('--o3-radius-card','Bo góc','Border radius',0,20)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền','Background'),
        _tc('colorsLight.borderSubtle','Border','Border'),
        _tc('colorsLight.textPrimary','Chữ','Text')
      ])
    ],
    'modal': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-lg','Padding modal','Modal padding',8,48),
        _vn('--o3-radius-card','Bo góc','Border radius',0,24),
        _tn('control.height.standard','Cao header','Header height',32,64)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền modal','Modal bg'),
        _tc('colorsLight.borderSubtle','Border','Border'),
        _tc('brand.primary','Nút primary','Primary button'),
        _tc('status.danger.light','Nút danger','Danger button')
      ]),
      _grp('motion','Hiệu ứng','Motion',[
        _vn('--o3-motion-base','Animation','Animation duration',0,500,'ms')
      ])
    ],
    'dropdown': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-sm','Padding item','Item padding-Y',0,16),
        _vn('--o3-space-md','Padding ngang','Item padding-X',4,24),
        _vn('--o3-radius','Bo góc menu','Menu radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền menu','Menu bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền hover','Hover bg'),
        _tc('colorsLight.borderSubtle','Border','Border'),
        _tc('brand.primary','Selected','Selected color'),
        _tc('status.danger.light','Destructive','Destructive item')
      ])
    ],
    'tooltip': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-sm','Padding tooltip','Tooltip padding',2,16),
        _vn('--o3-radius','Bo góc','Border radius',0,12),
        _vn('--o3-font-size-xs','Cỡ chữ','Font size',9,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurfaceAlt','Nền tooltip','Tooltip bg'),
        _tc('colorsLight.textPrimary','Chữ','Text')
      ])
    ],
    'kanban': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Padding cột','Column padding',4,24),
        _vn('--o3-space-sm','Gap card-card','Card gap',0,16),
        _vn('--o3-space-md','Gap cột-cột','Column gap',0,32),
        _vn('--o3-radius-card','Bo góc card','Card radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền card','Card bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền cột','Column bg'),
        _tc('colorsLight.borderSubtle','Border','Border'),
        _tc('brand.primary','Tag brand','Brand tag'),
        _tc('status.warning.light','Tag warning','Warning tag')
      ])
    ],
    'tree': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Indent mỗi cấp','Indent per level',8,32),
        _vn('--o3-space-sm','Cao hàng','Row height',0,24)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.textPrimary','Chữ','Text'),
        _tc('colorsLight.textTertiary','Chữ caret','Caret color'),
        _tc('brand.primarySoft','Nền selected','Selected bg'),
        _tc('status.success.light','Badge OK','OK badge')
      ])
    ],
    'timeline': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Gap event','Event gap',4,32),
        _vn('--o3-space-sm','Kích thước dot','Dot size',4,24)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.borderSubtle','Đường line','Line color'),
        _tc('status.success.light','Dot success','Success dot'),
        _tc('status.info.light','Dot info','Info dot'),
        _tc('status.neutral.light','Dot neutral','Neutral dot')
      ])
    ],
    'stepper': [
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Cao step','Step height',24,56),
        _vn('--o3-space-md','Gap step-step','Step gap',0,32)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Active','Active step'),
        _tc('status.success.light','Complete','Complete step'),
        _tc('colorsLight.borderStrong','Connector','Connector line')
      ])
    ],
    'pagination': [
      _grp('layout','Bố cục','Layout',[
        _tn('control.height.standard','Cao button','Button height',24,56),
        _vn('--o3-space-xs','Gap button','Button gap',0,16),
        _vn('--o3-radius','Bo góc','Radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Active','Active bg'),
        _tc('colorsLight.borderSubtle','Border','Border')
      ])
    ],
    'filter-panel': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Padding panel','Panel padding',4,32),
        _vn('--o3-space-sm','Gap section','Section gap',0,24),
        _vn('--o3-radius-card','Bo góc','Radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền panel','Panel bg'),
        _tc('colorsLight.bgSurfaceAlt','Nền section','Section bg'),
        _tc('brand.primary','Filter active','Active filter')
      ])
    ],
    'sparkline-kpi': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-md','Padding','Card padding',4,24),
        _vn('--o3-radius-card','Bo góc','Radius',0,16)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền','Background'),
        _tc('status.success.light','Trend up','Trend up'),
        _tc('status.danger.light','Trend down','Trend down')
      ])
    ],
    'progress': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-xs','Cao bar','Bar height',2,24),
        _vn('--o3-radius-pill','Bo góc bar','Bar radius',0,999)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Brand','Brand'),
        _tc('status.success.light','Success','Success'),
        _tc('status.warning.light','Warning','Warning'),
        _tc('status.danger.light','Danger','Danger'),
        _tc('colorsLight.bgSurfaceAlt','Track','Track bg')
      ])
    ],
    'status-indicator': [
      _grp('colors','Màu','Colors',[
        _tc('status.success.light','Online','Online'),
        _tc('status.warning.light','Away','Away'),
        _tc('status.danger.light','Busy','Busy'),
        _tc('status.info.light','Info','Info'),
        _tc('status.neutral.light','Offline','Offline')
      ])
    ],
    'avatar-status': [
      _grp('colors','Màu','Colors',[
        _tc('brand.primary','Brand seed','Brand seed'),
        _tc('status.success.light','Active','Active'),
        _tc('status.warning.light','Idle','Idle'),
        _tc('status.neutral.light','Offline','Offline')
      ])
    ],
    'skeleton': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-radius','Bo góc','Radius',0,16),
        _vn('--o3-radius-card','Bo góc card','Card radius',0,20)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurfaceAlt','Base','Base color'),
        _tc('colorsLight.borderSubtle','Shimmer','Shimmer color')
      ]),
      _grp('motion','Hiệu ứng','Motion',[
        _vn('--o3-motion-slow','Shimmer speed','Shimmer duration',200,2000,'ms')
      ])
    ],
    'empty-toast': [
      _grp('layout','Bố cục','Layout',[
        _vn('--o3-space-3xl','Padding empty','Empty padding',16,64),
        _vn('--o3-radius-card','Bo góc','Radius',0,20)
      ]),
      _grp('colors','Màu','Colors',[
        _tc('colorsLight.bgSurface','Nền','Background'),
        _tc('status.success.light','Toast success','Toast success'),
        _tc('status.warning.light','Toast warning','Toast warning'),
        _tc('status.danger.light','Toast danger','Toast danger'),
        _tc('status.info.light','Toast info','Toast info')
      ])
    ]
  };

  function getPropertiesForSection(section){
    if (PROPERTY_CATALOG[section.id]) return PROPERTY_CATALOG[section.id];
    var legacyTokens = section.tokens || [];
    if (!legacyTokens.length) return [];
    return [_grp('general','Chung','General', legacyTokens.map(function(tk){
      var isColor = /color|brand|status|bg|text|border/i.test(tk);
      return { kind:'token', key:tk, type: isColor ? 'color' : 'number', unit: isColor ? '' : 'px', min:0, max:48, label:_l(tk, tk) };
    }))];
  }

  // Wire inline token editors (color inputs + number inputs) in the
  // right-side aside so admins can edit tokens without leaving Module
  // Sample. Stages each change into GraphicsAuthority draft AND
  // updates every CSS variable bound to the token so the live preview
  // re-renders immediately.
  //
  // Per-input dedupe via [data-mod-sample-wired] attribute so this can
  // be called any number of times safely (initial mount, sub-tab switch,
  // defensive poll). Without dedupe, double-wiring would fire the
  // handler multiple times per input event.
  /* CSS variables hold literal `var()` text when read via
   * getPropertyValue, so colours like #0c4a6e never appear in the
   * editor pre-fill. Solution: render the CSS var via a hidden probe
   * element and read the COMPUTED color/width — which resolves the
   * var() chain to the actual paint value. */
  var _probe = null;
  function getProbe(){
    if (_probe && document.body.contains(_probe)) return _probe;
    _probe = document.createElement('div');
    _probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(_probe);
    return _probe;
  }
  function _rgbToHex(rgb){
    if (!rgb) return '';
    var m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return '';
    var to2 = function(n){ var s = parseInt(n,10).toString(16); return s.length===1?'0'+s:s; };
    return '#' + to2(m[1]) + to2(m[2]) + to2(m[3]);
  }
  /* Primary path: getComputedStyle(:root).getPropertyValue() returns
   * the RESOLVED hex/px value when the var chain successfully resolves
   * via cascade. Browser does the var() chain walk for us.
   * Fallback: Shadow-DOM probe — isolated from body-level CSS that
   * was clamping div widths to 8px (the master space). */
  function resolveCssVarColor(cssVarChain){
    var rs = getComputedStyle(document.documentElement);
    for (var i = 0; i < cssVarChain.length; i++) {
      var raw = (rs.getPropertyValue(cssVarChain[i]) || '').trim();
      if (!raw || raw.indexOf('var(') === 0) continue;
      var hexMatch = raw.match(/^#[0-9a-f]{3,8}$/i);
      if (hexMatch) {
        return hexMatch[0].length === 4
          ? '#' + raw[1]+raw[1] + raw[2]+raw[2] + raw[3]+raw[3]
          : raw.substring(0, 7);
      }
      var hex = _rgbToHex(raw);
      if (hex && hex !== '#000000') return hex;
    }
    try {
      var host = document.createElement('div');
      host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);
      var inner = document.createElement('div');
      host.shadowRoot.appendChild(inner);
      var out = '';
      for (var j = 0; j < cssVarChain.length && !out; j++) {
        inner.style.cssText = 'position:absolute;width:1px;height:1px;color:var(' + cssVarChain[j] + ',rgb(255,0,255))';
        var c = getComputedStyle(inner).color;
        var hx = _rgbToHex(c);
        if (hx && hx !== '#ff00ff') out = hx;
      }
      document.body.removeChild(host);
      return out;
    } catch (e) { return ''; }
  }
  function resolveCssVarPx(cssVarChain){
    var rs = getComputedStyle(document.documentElement);
    for (var i = 0; i < cssVarChain.length; i++) {
      var raw = (rs.getPropertyValue(cssVarChain[i]) || '').trim();
      if (!raw || raw.indexOf('var(') === 0) continue;
      var n = parseFloat(raw);
      if (!isNaN(n)) return Math.round(n);
    }
    try {
      var host = document.createElement('div');
      host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);
      var inner = document.createElement('div');
      host.shadowRoot.appendChild(inner);
      var out = null;
      for (var j = 0; j < cssVarChain.length && out === null; j++) {
        inner.style.cssText = 'position:absolute;width:var(' + cssVarChain[j] + ',99999px);height:1px';
        var w = parseFloat(getComputedStyle(inner).width);
        if (!isNaN(w) && w >= 0 && w < 99999) out = Math.round(w);
      }
      document.body.removeChild(host);
      return out;
    } catch (e) { return null; }
  }

  function wireInlineTokenEditors(){
    Array.prototype.forEach.call(
      document.querySelectorAll(
        '[data-mod-sample-token]:not([data-mod-sample-wired]),'
        + '[data-mod-sample-cssvar]:not([data-mod-sample-wired])'),
      function(input){
        // Mark immediately so a re-entrant call from MutationObserver
        // does not double-attach the listener.
        input.setAttribute('data-mod-sample-wired', '1');
        var tokenKey = input.getAttribute('data-mod-sample-token');
        var cssVarRaw = input.getAttribute('data-mod-sample-cssvar');
        var unit = input.getAttribute('data-mod-sample-unit');
        if (unit === null) unit = 'px';
        var cssVars;
        if (tokenKey) {
          cssVars = TOKEN_CSS_VAR[tokenKey] || ['--' + tokenKey.replace(/\./g, '-')];
        } else if (cssVarRaw) {
          cssVars = cssVarRaw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        } else {
          cssVars = [];
        }

        // Pre-fill from currently-painted CSS variable so admin sees
        // the actual production value, not a guess. Uses the resolver
        // helpers (probe element + getComputedStyle) because raw
        // getPropertyValue returns the literal `var()` text not the
        // resolved colour/length.
        try {
          if (input.type === 'color') {
            var hex = resolveCssVarColor(cssVars);
            if (!hex && tokenKey && window.GraphicsAuthority && window.GraphicsAuthority.tokens
                && typeof window.GraphicsAuthority.tokens.read === 'function') {
              try {
                var v = window.GraphicsAuthority.tokens.read(tokenKey) || '';
                var m = v.match(/#[0-9a-f]{3,8}/i);
                if (m) hex = m[0].length === 4
                  ? '#' + m[0][1]+m[0][1] + m[0][2]+m[0][2] + m[0][3]+m[0][3]
                  : m[0].substring(0, 7);
              } catch (e) {}
            }
            if (hex) input.value = hex;
          } else if (input.type === 'number') {
            var num = resolveCssVarPx(cssVars);
            if (num === null && tokenKey && window.GraphicsAuthority && window.GraphicsAuthority.tokens
                && typeof window.GraphicsAuthority.tokens.read === 'function') {
              try {
                var raw = window.GraphicsAuthority.tokens.read(tokenKey) || '';
                var n = parseInt(raw, 10);
                if (!isNaN(n)) num = n;
              } catch (e) {}
            }
            if (num !== null && !isNaN(num)) input.value = num;
          }
        } catch (e) { /* non-fatal */ }

        var apply = function(){
          var v = input.value;
          var staged = v;
          if (input.type === 'number') staged = v + (unit || '');
          // Stage via Authority for save pipeline (only if token-keyed
          // — cssvar-only edits don't have a stable token to stage)
          if (tokenKey) {
            try {
              if (window.GraphicsAuthority && window.GraphicsAuthority.tokens
                  && typeof window.GraphicsAuthority.tokens.stage === 'function') {
                window.GraphicsAuthority.tokens.stage(tokenKey, staged);
              }
            } catch (e) {}
          }
          // Live-update EVERY CSS var bound to this token so the
          // preview (and the real production UI under it) reflects
          // the change immediately.
          cssVars.forEach(function(cv){
            try { document.documentElement.style.setProperty(cv, staged); } catch (e) {}
          });
        };
        // Bind both 'input' (live as user types/drags) and 'change'
        // (commit) so colour pickers (which fire 'input' on every swatch
        // hover and 'change' on close) and number spinners both work.
        input.addEventListener('input', apply);
        input.addEventListener('change', apply);
      }
    );
  }

  // Wire the density sliders to live CSS variable updates + stage the
  // changes into GraphicsAuthority's draft buffer so the existing
  // "Save for org" pipeline (WCAG sim + commit) handles publish.
  // Per-input dedupe via [data-density-wired] same as the inline
  // token editors above.
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
      if (input.getAttribute('data-density-wired') === '1') return;
      input.setAttribute('data-density-wired', '1');
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

  // Always wire ALL editors after any panel re-render. The wire
  // functions are idempotent thanks to data-mod-sample-wired and
  // data-density-wired attribute dedupe, so calling them on every
  // section change (not just density) costs nothing and removes the
  // entire class of "editor renders but doesn't react" bugs.
  /* Custom-override checkbox wiring (v3-G14). Click toggles disabled
   * state of the sibling input + persists flag to localStorage. When
   * UNCHECKED the input reverts to the Global Theme value via removeProperty
   * + re-applying theme. Checkbox state survives reload. */
  function wireCustomCheckboxes(){
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-prop-custom]:not([data-custom-wired])'),
      function(cb){
        cb.setAttribute('data-custom-wired', '1');
        cb.addEventListener('change', function(){
          var key = cb.getAttribute('data-prop-custom');
          var row = cb.closest('.o3-props-row');
          var input = row && row.querySelector('.o3-props-row__input');
          if (!input) return;
          if (cb.checked) {
            input.disabled = false;
            input.classList.remove('is-inherited');
            input.classList.add('is-custom');
            row.classList.add('is-custom');
            setPropertyOverride(key, true);
            input.focus();
          } else {
            input.disabled = true;
            input.classList.remove('is-custom');
            input.classList.add('is-inherited');
            row.classList.remove('is-custom');
            setPropertyOverride(key, false);
            // Revert: remove any inline override we set, then re-apply Theme
            try {
              var cssVars = [];
              var tokenKey = input.getAttribute('data-mod-sample-token');
              var cssVarRaw = input.getAttribute('data-mod-sample-cssvar');
              if (tokenKey) cssVars = TOKEN_CSS_VAR[tokenKey] || ['--' + tokenKey.replace(/\./g, '-')];
              else if (cssVarRaw) cssVars = cssVarRaw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
              cssVars.forEach(function(cv){ document.documentElement.style.removeProperty(cv); });
              // Re-apply Theme so the unset vars regain their global value
              if (window._admTheme && typeof window._admTheme.apply === 'function') {
                window._admTheme.apply(window._admTheme.read());
              }
              // Refresh the input value from new effective value
              if (input.type === 'number') {
                var n = resolveCssVarPx(cssVars);
                if (n !== null) input.value = n;
              } else if (input.type === 'color') {
                var h = resolveCssVarColor(cssVars);
                if (h) input.value = h;
              }
            } catch (e) {}
          }
        });
      }
    );
  }

  function ensureAllWired(){
    try { wireDensitySliders(); } catch (e) { /* swallow */ }
    try { wireInlineTokenEditors(); } catch (e) { /* swallow */ }
    try { wireCustomCheckboxes(); } catch (e) { /* swallow */ }
  }

  /* ── Floating Properties dock (v3-G10, 2026-05-29) ───────────────
   * Fixed-position right-side inspector panel à la Figma. Lazy-mounted
   * to <body> on first show; subsequent showProperties() calls just
   * re-render contents. Persists collapsed state in localStorage. */

  var _activeDockSubtab = {};
  var _dockCollapsed = false;
  try { _dockCollapsed = localStorage.getItem('o3-props-dock.collapsed') === '1'; } catch (e) {}

  function syncDockBodyClass(){
    if (!document.body) return;
    if (_dockCollapsed) document.body.classList.remove('o3-dock-open');
    else                document.body.classList.add('o3-dock-open');
  }

  function ensureDockElement(){
    var dock = document.getElementById('o3-props-dock');
    if (dock) return dock;
    dock = document.createElement('div');
    dock.id = 'o3-props-dock';
    dock.className = 'o3-props-dock' + (_dockCollapsed ? ' o3-props-dock--collapsed' : '');
    /* v3-G12: SVG icons (Lucide-style) for crisp, refined look at
     * any DPI. Bookmark handle now on LEFT edge (panel slides in
     * from left). Chevron-right on handle = "open me by sliding
     * right". Chevron-left in header = "collapse left". */
    var svgChevronRight = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>';
    var svgChevronLeft  = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 6 9 12 15 18"/></svg>';
    var svgClose        = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>';
    dock.innerHTML = ''
      + '<button type="button" class="o3-props-dock__handle" aria-label="Open properties" title="Properties">'
      +   svgChevronRight
      + '</button>'
      + '<div class="o3-props-dock__panel">'
      +   '<header class="o3-props-dock__header">'
      +     '<h3 class="o3-props-dock__title">'
      +       '<span>⚙️</span><span data-dock-title>Properties</span>'
      +       '<span class="o3-props-dock__subtitle" data-dock-subtitle></span>'
      +     '</h3>'
      +     '<button type="button" class="o3-props-dock__collapse" aria-label="Collapse properties" title="Collapse">' + svgChevronLeft + '</button>'
      +     '<button type="button" class="o3-props-dock__close" aria-label="Close">' + svgClose + '</button>'
      +   '</header>'
      +   '<nav class="o3-props-dock__subtabs" data-dock-subtabs></nav>'
      +   '<div class="o3-props-dock__body" data-dock-body></div>'
      +   '<footer class="o3-props-dock__footer">'
      +     '<button type="button" data-dock-reset>Hủy thay đổi</button>'
      +     '<button type="button" class="is-primary" data-dock-save>Lưu cho tổ chức</button>'
      +   '</footer>'
      + '</div>';
    document.body.appendChild(dock);
    dock.querySelector('.o3-props-dock__handle').addEventListener('click', toggleDock);
    dock.querySelector('.o3-props-dock__collapse').addEventListener('click', collapseDock);
    dock.querySelector('.o3-props-dock__close').addEventListener('click', collapseDock);
    dock.querySelector('[data-dock-save]').addEventListener('click', function(){
      try {
        if (window.GraphicsAuthority && window.GraphicsAuthority.preview
            && typeof window.GraphicsAuthority.preview.simulate === 'function') {
          window.GraphicsAuthority.preview.simulate();
        } else if (typeof window._hmSimulate === 'function') {
          window._hmSimulate();
        } else {
          alert('GraphicsAuthority save pipeline chưa wire — thay đổi đã stage vào draft buffer.');
        }
      } catch (e) { alert('Lưu thất bại: ' + (e && e.message || e)); }
    });
    dock.querySelector('[data-dock-reset]').addEventListener('click', function(){
      if (!confirm('Hủy mọi thay đổi chưa lưu?')) return;
      try {
        if (window.GraphicsAuthority && window.GraphicsAuthority.draft
            && typeof window.GraphicsAuthority.draft.discard === 'function') {
          window.GraphicsAuthority.draft.discard();
        }
      } catch (e) {}
      location.reload();
    });
    syncDockBodyClass();
    return dock;
  }

  function toggleDock(){
    _dockCollapsed = !_dockCollapsed;
    try { localStorage.setItem('o3-props-dock.collapsed', _dockCollapsed ? '1' : '0'); } catch (e) {}
    var dock = ensureDockElement();
    dock.classList.toggle('o3-props-dock--collapsed', _dockCollapsed);
    syncDockBodyClass();
  }
  function collapseDock(){
    if (_dockCollapsed) return;
    _dockCollapsed = true;
    try { localStorage.setItem('o3-props-dock.collapsed', '1'); } catch (e) {}
    var dock = ensureDockElement();
    dock.classList.add('o3-props-dock--collapsed');
    syncDockBodyClass();
  }
  function hideDock(){
    var dock = document.getElementById('o3-props-dock');
    if (dock) dock.hidden = true;
    if (document.body) document.body.classList.remove('o3-dock-open','module-master-active');
  }
  function showDock(){
    var dock = ensureDockElement();
    dock.hidden = false;
    if (document.body) document.body.classList.add('module-master-active');
    syncDockBodyClass();
  }

  /* v3-G22 — auto-hide dock when admin navigates AWAY from Module Master.
   * Bug: dock was lazy-mounted to <body> on first show but never unmounted,
   * so it stayed visible when user clicked Customer POs / Orders / any
   * other module. Fix: poll/observe whether #adm-appearance-panel-module-sample
   * is currently rendered + offsetParent !== null (i.e. not hidden by an
   * ancestor display:none). If panel is gone or hidden, hide the dock.
   * Run on every animation frame is wasteful — use MutationObserver on
   * <body> for childList + attribute changes, plus a passive interval as
   * safety net. Re-check is cheap (1 DOM query + 1 boolean). */
  function panelIsVisible(){
    var panel = document.getElementById('adm-appearance-panel-module-sample');
    if (!panel) return false;
    // offsetParent === null when display:none anywhere in ancestor chain
    if (panel.offsetParent === null) return false;
    // also check it's still attached to a visible page
    var page = panel.closest('.page');
    if (page && !page.classList.contains('active')) return false;
    return true;
  }
  function startDockVisibilityGuard(){
    if (window.__o3DockGuardStarted) return;
    window.__o3DockGuardStarted = true;
    var lastVisible = false;
    function check(){
      var dock = document.getElementById('o3-props-dock');
      if (!dock || dock.hidden) { lastVisible = false; return; }
      var now = panelIsVisible();
      if (lastVisible && !now) hideDock();
      lastVisible = now;
    }
    try {
      var obs = new MutationObserver(check);
      obs.observe(document.body, { childList: true, subtree: true, attributes: true,
                                    attributeFilter: ['class','style','hidden'] });
    } catch (e) {}
    // Safety-net interval (500ms — imperceptible cost, immune to observer misses)
    setInterval(check, 500);
  }

  /* Read per-property override flags from localStorage. Each entry:
   *   { 'space.master': true, 'brand.primary': true }
   * Only listed keys are user-customised; others inherit from Theme. */
  function readPropertyOverrides(){
    try {
      var raw = localStorage.getItem('o3-props-overrides');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function writePropertyOverrides(map){
    try { localStorage.setItem('o3-props-overrides', JSON.stringify(map)); } catch (e) {}
  }
  function setPropertyOverride(key, enabled){
    var m = readPropertyOverrides();
    if (enabled) m[key] = true; else delete m[key];
    writePropertyOverrides(m);
  }

  function renderPropertyRow(item, L){
    var label = (item.label && (item.label[window.__lang === 'en' ? 'en' : 'vi'] || item.label.vi || item.label.en)) || '';
    var en    = (item.label && item.label.en) || '';
    var typ   = item.type || 'number';
    var unit  = item.unit !== undefined ? item.unit : 'px';
    var min   = item.min  !== undefined ? item.min  : 0;
    var max   = item.max  !== undefined ? item.max  : 48;
    var step  = item.step !== undefined ? item.step : 1;
    var attrBind, keyDisplay, overrideKey;
    if (item.kind === 'token') {
      attrBind = 'data-mod-sample-token="' + esc(item.key) + '"';
      keyDisplay = item.key;
      overrideKey = item.key;
    } else if (item.kind === 'cssvar') {
      var cv = Array.isArray(item.cssVar) ? item.cssVar.join(',') : item.cssVar;
      attrBind = 'data-mod-sample-cssvar="' + esc(cv) + '"';
      keyDisplay = Array.isArray(item.cssVar) ? item.cssVar[0] : item.cssVar;
      overrideKey = keyDisplay;
    } else {
      return '';
    }
    if (unit) attrBind += ' data-mod-sample-unit="' + esc(unit) + '"';

    // v3-G14: per-property Custom override. Unchecked = inherits from
    // Theme (input disabled, shows muted Global value). Checked =
    // unlocks editor for local override (stored to graphics_token_value
    // scope=module-master.<sectionId> on Save).
    var overrides = readPropertyOverrides();
    var isCustom = !!overrides[overrideKey];
    var disabledAttr = isCustom ? '' : ' disabled';
    var inputClass = 'o3-props-row__input' + (isCustom ? ' is-custom' : ' is-inherited');

    var input;
    if (typ === 'color') {
      input = '<input type="color" class="' + inputClass + '"' + disabledAttr + ' ' + attrBind + '>';
    } else if (typ === 'text') {
      input = '<input type="text" class="' + inputClass + '"' + disabledAttr + ' ' + attrBind + '>';
    } else {
      input = '<input type="number" class="' + inputClass + '"'
        + ' min="' + esc(min) + '" max="' + esc(max) + '" step="' + esc(step) + '"'
        + disabledAttr + ' ' + attrBind + '>'
        + (unit ? '<span class="o3-props-row__unit">' + esc(unit) + '</span>' : '');
    }
    return ''
      + '<div class="o3-props-row' + (isCustom ? ' is-custom' : '') + '">'
      +   '<input type="checkbox" class="o3-props-row__custom"'
      +     ' data-prop-custom="' + esc(overrideKey) + '"'
      +     ' title="' + esc(L('Custom — bật để override Global Theme cho property này', 'Custom — enable to override Global Theme for this property')) + '"'
      +     (isCustom ? ' checked' : '') + '>'
      +   '<div class="o3-props-row__label">'
      +     '<span class="o3-props-row__name" title="' + esc(en) + '">' + esc(label) + '</span>'
      +     '<span class="o3-props-row__key">' + esc(keyDisplay) + '</span>'
      +   '</div>'
      +   '<div class="o3-props-row__control">' + input + '</div>'
      + '</div>';
  }

  function renderDockForSection(section, L){
    L = L || function(vi,en){ return vi || en; };
    var dock = ensureDockElement();
    var groups = getPropertiesForSection(section);
    var titleEl = dock.querySelector('[data-dock-title]');
    var subtitleEl = dock.querySelector('[data-dock-subtitle]');
    var subtabsEl = dock.querySelector('[data-dock-subtabs]');
    var bodyEl = dock.querySelector('[data-dock-body]');
    titleEl.textContent = L('Properties', 'Properties');
    subtitleEl.textContent = '· ' + L(section.label_vi, section.label_en);
    if (!groups.length) {
      subtabsEl.innerHTML = '';
      bodyEl.innerHTML = '<div style="padding:16px;color:var(--o3-text-muted,#64748b);font-size:12px">'
        + esc(L('Không có property nào để chỉnh ở section này.','No properties to edit in this section.'))
        + '</div>';
      return;
    }
    var savedSub = _activeDockSubtab[section.id];
    var activeGroup = groups.find(function(g){ return g.id === savedSub; }) || groups[0];
    if (groups.length > 1) {
      subtabsEl.innerHTML = groups.map(function(g){
        var isAct = g.id === activeGroup.id;
        return '<button type="button" class="o3-props-dock__subtab' + (isAct?' is-active':'') + '"'
          + ' data-dock-subtab="' + esc(g.id) + '">'
          + esc(L(g.label_vi, g.label_en)) + '</button>';
      }).join('');
      Array.prototype.forEach.call(subtabsEl.querySelectorAll('[data-dock-subtab]'), function(btn){
        btn.addEventListener('click', function(){
          _activeDockSubtab[section.id] = btn.getAttribute('data-dock-subtab');
          renderDockForSection(section, L);
          ensureAllWired();
        });
      });
    } else {
      subtabsEl.innerHTML = '';
    }
    // v3-G17: hint banner explaining the Custom checkbox model.
    var hintHtml = '<div class="o3-props-dock__hint">'
      + '<strong>' + esc(L('💡 Cách dùng','💡 How it works')) + ':</strong> '
      + esc(L(
          'Mỗi property mặc định kế thừa Global Theme (input bị mờ). Tick ☑ Custom bên trái để chỉnh giá trị RIÊNG cho component này.',
          'Each property inherits from Global Theme (input muted). Tick ☑ Custom on the left to override for THIS component only.'))
      + '</div>';
    bodyEl.innerHTML = hintHtml
      + '<div class="o3-props-dock__group">'
      + activeGroup.items.map(function(it){ return renderPropertyRow(it, L); }).join('')
      + '</div>';
  }

  // v3-G17: listen for Global Theme apply → refresh non-Custom input
  // values in the dock so they show the new inherited value.
  document.addEventListener('o3:theme-applied', function(){
    var dock = document.getElementById('o3-props-dock');
    if (!dock || dock.classList.contains('o3-props-dock--collapsed')) return;
    // For each input WITHOUT data-mod-sample-wired flag of "custom",
    // re-resolve and update its display value (only if input is disabled
    // = it's inherited, not overridden).
    var inputs = dock.querySelectorAll('.o3-props-row__input');
    Array.prototype.forEach.call(inputs, function(input){
      if (!input.disabled) return;  // Custom override — don't touch
      var tokenKey = input.getAttribute('data-mod-sample-token');
      var cssVarRaw = input.getAttribute('data-mod-sample-cssvar');
      var cssVars;
      if (tokenKey) cssVars = TOKEN_CSS_VAR[tokenKey] || ['--' + tokenKey.replace(/\./g, '-')];
      else if (cssVarRaw) cssVars = cssVarRaw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      else return;
      try {
        if (input.type === 'number') {
          var n = resolveCssVarPx(cssVars);
          if (n !== null) input.value = n;
        } else if (input.type === 'color') {
          var h = resolveCssVarColor(cssVars);
          if (h) input.value = h;
        }
      } catch (e) {}
    });
  });

  function showProperties(sectionId, L){
    var secs = sections(L || function(vi,en){return vi||en;});
    var section = secs.find(function(s){ return s.id === sectionId; }) || secs[0];
    showDock();
    renderDockForSection(section, L);
    ensureAllWired();
    // v3-G22: start the guard so when admin nav goes elsewhere the dock
    // disappears with the panel. Idempotent — once-only start, safe to
    // call from every showProperties invocation.
    startDockVisibilityGuard();
  }
  window._admModuleSampleShowProperties = showProperties;
  window._admModuleSampleHideDock = hideDock;

  window._admModuleSampleSetSection = function(id){
    _activeSection = id || 'density';
    var panel = document.getElementById('adm-appearance-panel-module-sample');
    if (panel && typeof window._renderAdmModuleSampleHtml === 'function') {
      var L = window.__lang === 'en'
        ? function(vi,en){ return en || vi; }
        : function(vi,en){ return vi || en; };
      panel.innerHTML = window._renderAdmModuleSampleHtml(L);
      ensureAllWired();
      try { showProperties(_activeSection, L); } catch (e) { /* dock will catch up via observer */ }
    }
  };

  // Public init — 00c-admin-appearance.js may call this after switching
  // to the Module Sample sub-tab. Safe to call any time; dedup'd.
  window._admModuleSampleEnsureWired = ensureAllWired;

  // Defensive: observe the body so wiring happens on the initial
  // panel mount (which is performed inline by 00c, not via our
  // _admModuleSampleSetSection setter). Calls ensureAllWired() which
  // is itself idempotent.
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(function(){
      if (document.querySelector('[data-mod-sample-token]:not([data-mod-sample-wired])')
          || (document.getElementById('o3-density-master')
              && document.getElementById('o3-density-master').getAttribute('data-density-wired') !== '1')) {
        ensureAllWired();
      }
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); }
    catch (e) { setTimeout(function(){
      try { mo.observe(document.body, { childList: true, subtree: true }); } catch(e2){}
    }, 1000); }
  }

  // Final safety net — a short interval that rewires for the first
  // few seconds after page load, in case the panel mounts before
  // MutationObserver attaches. Runs only 10× then stops.
  var _bootTicks = 0;
  var _bootPoll = setInterval(function(){
    _bootTicks++;
    if (_bootTicks > 10) { clearInterval(_bootPoll); return; }
    ensureAllWired();
  }, 500);

  /* renderAdmModuleSampleHtml(L)
   * Used by 00c-admin-appearance.js render() to fill the bodies map.
   * L is the language helper (function(vi,en) → string).
   * Returns the full inner HTML of the panel (not wrapped in #adm-appearance-panel-module-sample).
   */
  window._renderAdmModuleSampleHtml = function(L){
    // New DOM coming — clear wired flags from any inputs the upcoming
    // innerHTML replacement is about to destroy, so the dedupe map
    // matches the new DOM rather than the doomed old elements.
    try {
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-mod-sample-token][data-mod-sample-wired]'),
        function(el){ el.removeAttribute('data-mod-sample-wired'); });
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-density-wired]'),
        function(el){ el.removeAttribute('data-density-wired'); });
    } catch (e) { /* non-fatal */ }
    L = L || function(vi,en){ return vi || en; };
    var secs = sections(L);
    var active = secs.find(function(s){ return s.id === _activeSection; }) || secs[0];

    // Inner sub-tab strip — v3-G17 adds `.has-overrides` class to tabs
    // whose section has at least one Custom override flag set.
    var overrides = readPropertyOverrides();
    function sectionHasOverrides(secId){
      var groups = PROPERTY_CATALOG[secId];
      if (!groups) return false;
      for (var i = 0; i < groups.length; i++) {
        for (var j = 0; j < groups[i].items.length; j++) {
          var it = groups[i].items[j];
          var key = it.kind === 'token' ? it.key : (Array.isArray(it.cssVar) ? it.cssVar[0] : it.cssVar);
          if (overrides[key]) return true;
        }
      }
      return false;
    }
    var innerTabsHtml = secs.map(function(s){
      var isActive = s.id === active.id;
      var hasOv = sectionHasOverrides(s.id);
      return '<button type="button" class="hm-tab' + (isActive ? ' active' : '') + (hasOv ? ' has-overrides' : '') + '"'
        + ' aria-selected="' + (isActive ? 'true' : 'false') + '"'
        + ' title="' + (hasOv ? esc(L('Có Custom override trong section này','Has Custom overrides in this section')) : '') + '"'
        + ' onclick="_admModuleSampleSetSection(\'' + esc(s.id) + '\')">'
        + '<span class="hm-tab-label">' + esc(L(s.label_vi, s.label_en)) + '</span>'
        + '</button>';
    }).join('');

    // Schedule a microtask to refresh the floating Properties dock
    // after this innerHTML is applied so the dock always reflects the
    // currently active section.
    setTimeout(function(){
      try { showProperties(active.id, L); } catch (e) { /* dock will catch up via observer */ }
    }, 0);

    return ''
      // Ultra-compact intro — 1 line, no boxed background.
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.4;margin:0 0 8px 0">'
      +   esc(L(
            '🎛️ SSOT — mỗi component render bằng đúng CSS production. Mở panel "PROPERTIES" bên phải để chỉnh token theo từng tab.',
            '🎛️ SSOT — every component renders with production CSS. Open the right-edge "PROPERTIES" panel to edit tokens per tab.'))
      + '</div>'

      // Inner tab strip — production o3-shell__tab class. Allow wrap
      // to multi-row for 24+ component sections.
      + '<nav class="o3-shell__tabs" role="tablist" style="margin:0 0 8px 0;border-bottom:1px solid var(--o3-border-subtle);flex-wrap:wrap;overflow:visible">' + innerTabsHtml + '</nav>'

      // Single-column preview — full width. Properties live in the
      // floating right-edge dock (#o3-props-dock) mounted to body.
      + '<div style="padding:var(--master-gap,8px);background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius,8px);min-height:200px">'
      +   active.body_html
      + '</div>';
  };
})();

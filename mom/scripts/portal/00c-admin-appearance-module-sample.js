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

  /* ── INDUSTRIAL COMPONENT LIBRARY ──────────────────────────────────
   * 15+ extra components needed for ERP / MES / MOM / EQMS / KPI work.
   * Research basis: SAP Fiori, Oracle JET, IBM Carbon, ServiceNow,
   * Salesforce Lightning, Atlassian, Tabular ERP patterns.
   * Each section renders LIVE — admin sees the actual rendered HTML,
   * not a screenshot. */

  function formFieldsSection(L){
    var body = ''
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:800px">'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Text</span>'
      +     '<input type="text" placeholder="SO-2026-0001" style="height:var(--o3-control-h-standard);padding:0 10px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:13px"></label>'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Number + unit</span>'
      +     '<div style="display:flex;height:var(--o3-control-h-standard);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);overflow:hidden">'
      +       '<input type="number" value="100" style="border:0;padding:0 10px;width:100%;font-size:13px;outline:none">'
      +       '<span style="padding:0 10px;display:flex;align-items:center;background:var(--bg-surface-alt);font-size:12px;color:var(--text-secondary);border-left:1px solid var(--o3-border-subtle)">EA</span>'
      +     '</div></label>'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Select</span>'
      +     '<select style="height:var(--o3-control-h-standard);padding:0 10px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:13px;background:#fff">'
      +       '<option>LAM Research</option><option>Applied Materials</option><option>KLA Corp</option></select></label>'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Date</span>'
      +     '<input type="date" value="2026-06-15" style="height:var(--o3-control-h-standard);padding:0 10px;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:13px"></label>'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Currency</span>'
      +     '<div style="display:flex;height:var(--o3-control-h-standard);border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);overflow:hidden">'
      +       '<span style="padding:0 10px;display:flex;align-items:center;background:var(--bg-surface-alt);font-size:12px;color:var(--text-secondary);border-right:1px solid var(--o3-border-subtle)">$</span>'
      +       '<input type="text" value="12,400.00" style="border:0;padding:0 10px;width:100%;font-size:13px;outline:none"></div></label>'
      +   '<label style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Search with hint</span>'
      +     '<div style="position:relative;height:var(--o3-control-h-standard)">'
      +       '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🔍</span>'
      +       '<input type="search" placeholder="Part number, customer…" style="height:100%;padding:0 10px 0 28px;width:100%;border:1px solid var(--o3-border-subtle);border-radius:var(--o3-radius);font-size:13px"></div></label>'
      + '</div>'
      + '<div style="margin-top:8px;display:flex;gap:14px;align-items:center;font-size:12px">'
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

  function sections(L){
    return [
      densitySection(L),
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
  var _activeSection = 'density';

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
    'colorsLight.borderStrong': ['--o3-border-strong', '--border-strong', '--border-3'],
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

  // Wire inline token editors (color inputs + number inputs) in the
  // right-side aside so admins can edit tokens without leaving Module
  // Sample. Stages each change into GraphicsAuthority draft AND
  // updates every CSS variable bound to the token so the live preview
  // re-renders immediately.
  function wireInlineTokenEditors(){
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-mod-sample-token]'),
      function(input){
        var tokenKey = input.getAttribute('data-mod-sample-token');
        var cssVars = TOKEN_CSS_VAR[tokenKey] || ['--' + tokenKey.replace(/\./g, '-')];

        // Pre-fill from currently-resolved CSS variable so admin sees
        // the actual production value, not a guess.
        try {
          var rootStyle = window.getComputedStyle(document.documentElement);
          var resolved = '';
          for (var i = 0; i < cssVars.length && !resolved; i++) {
            resolved = (rootStyle.getPropertyValue(cssVars[i]) || '').trim();
          }
          // Try GraphicsAuthority as secondary source
          if (!resolved && window.GraphicsAuthority && window.GraphicsAuthority.tokens
              && typeof window.GraphicsAuthority.tokens.read === 'function') {
            try { resolved = window.GraphicsAuthority.tokens.read(tokenKey) || ''; } catch (e) {}
          }
          if (input.type === 'color') {
            var hex = resolved.match(/#[0-9a-f]{3,8}/i);
            if (hex) input.value = hex[0].length === 4
              ? '#' + hex[0][1]+hex[0][1] + hex[0][2]+hex[0][2] + hex[0][3]+hex[0][3]
              : hex[0].substring(0, 7);
          } else if (input.type === 'number') {
            var num = parseInt(resolved, 10);
            if (!isNaN(num)) input.value = num;
          }
        } catch (e) { /* non-fatal */ }

        input.addEventListener('input', function(){
          var v = input.value;
          var staged = v;
          if (input.type === 'number') staged = v + 'px';
          // Stage via Authority for save pipeline
          try {
            if (window.GraphicsAuthority && window.GraphicsAuthority.tokens
                && typeof window.GraphicsAuthority.tokens.stage === 'function') {
              window.GraphicsAuthority.tokens.stage(tokenKey, staged);
            }
          } catch (e) {}
          // Live-update EVERY CSS var bound to this token so the
          // preview (and the real production UI under it) reflects
          // the change immediately.
          cssVars.forEach(function(cv){
            try { document.documentElement.style.setProperty(cv, staged); } catch (e) {}
          });
        });
      }
    );
  }

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
    var hasTokenEditors = document.querySelector('[data-mod-sample-token]');
    if (hasSliders || hasTokenEditors) {
      if (hasSliders) wireDensitySliders();
      if (hasTokenEditors) wireInlineTokenEditors();
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

    // Inline token editor — for each token, render an input that
    // stages into the GraphicsAuthority draft buffer (merging the
    // Components tab functionality into Module Sample). Numeric tokens
    // get a small slider+number input; color tokens get a color picker.
    // Falls back to read-only chip if token meta is unknown.
    var tokenEditors = active.tokens.map(function(tk){
      var meta = (window._adm_token_meta || {})[tk] || {};
      var inputId = 'mod-sample-token-' + tk.replace(/\./g, '-');
      // Render type heuristic based on key prefix (until we wire a
      // proper meta lookup against graphics_token_catalog).
      var isColor = /color|brand|status|bg|text|border/i.test(tk);
      var isNumeric = /space|radius|height|width|size/i.test(tk);
      var editor = '';
      if (isColor) {
        editor = '<input id="' + inputId + '" type="color" data-mod-sample-token="' + esc(tk) + '" style="width:32px;height:20px;padding:0;border:1px solid var(--border);border-radius:4px;background:transparent;cursor:pointer">';
      } else if (isNumeric) {
        editor = '<input id="' + inputId + '" type="number" min="0" max="48" step="1" data-mod-sample-token="' + esc(tk) + '" style="width:52px;height:20px;padding:0 4px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:ui-monospace,monospace">';
      } else {
        editor = '<span style="font-size:10px;color:var(--text-secondary)">read-only</span>';
      }
      return ''
        + '<li style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 0">'
        +   '<code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0">' + esc(tk) + '</code>'
        +   editor
        + '</li>';
    }).join('');

    return ''
      // Ultra-compact intro — 1 line, no boxed background. SSOT message
      // is in the tab title bar so we don't need to repeat it.
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.4;margin:0 0 8px 0">'
      +   esc(L(
            '🎛️ SSOT — mỗi component dưới đây render bằng đúng CSS production của Orders v3. Token chỉnh trực tiếp ở cột phải.',
            '🎛️ SSOT — every component below renders with the exact production CSS of Orders v3. Tokens edit inline on the right.'))
      + '</div>'

      // Inner tab strip — production o3-shell__tab class. Allow horizontal
      // scroll AND wrap to multi-row for 20+ component sections.
      + '<nav class="o3-shell__tabs" role="tablist" style="margin:0 0 8px 0;border-bottom:1px solid var(--o3-border-subtle);flex-wrap:wrap;overflow:visible">' + innerTabsHtml + '</nav>'

      // Two-column layout — preview + inline token editor merged from Components tab
      + '<div style="display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:8px;align-items:start">'

      //   Left: live preview, padded by master-gap so visible content fills space
      +   '<div style="padding:var(--master-gap,8px);background:var(--bg-surface);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius,8px);min-height:200px">'
      +     active.body_html
      +   '</div>'

      //   Right: inline token editor (replaces the "Thành phần" tab — edit here)
      +   '<aside style="padding:8px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--o3-border-subtle);border-radius:var(--card-radius,8px)">'
      +     '<div style="font-weight:600;font-size:10px;color:var(--text-primary);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">' + esc(L('Tokens · chỉnh trực tiếp','Tokens · edit inline')) + '</div>'
      +     '<ul style="margin:0;padding-left:0;list-style:none">' + tokenEditors + '</ul>'
      +     '<div style="margin-top:6px;font-size:10px;color:var(--text-secondary);line-height:1.4">' + esc(L(
                'Mọi thay đổi stage vào draft buffer; bấm "Lưu cho tổ chức" để qua mô phỏng WCAG + publish.',
                'Edits stage to draft; click "Save for org" to run WCAG sim + publish.')) + '</div>'
      +   '</aside>'
      + '</div>';
  };
})();

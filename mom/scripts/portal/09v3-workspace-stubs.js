/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Placeholder workspaces for Order Book / Operations /
 * Analytics / Admin. They register themselves so the tab strip shows
 * the full IA, but each renders a "Coming next" empty-state.
 *
 * These get replaced by real implementations in subsequent slices:
 *   09v3-workspace-orderbook.js
 *   09v3-workspace-operations.js
 *   09v3-workspace-analytics.js
 *   09v3-workspace-admin.js
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function makeStub(id, icon, label_vi, label_en, hint_vi, hint_en, jumpHint){
    return {
      id: id,
      icon: icon,
      label: { vi: label_vi, en: label_en },
      mount: function(root, ctx){
        var ui = ctx.ui;
        var t  = function(vi, en){ return ctx.i18n.t(vi, en); };
        var jumpBtn = jumpHint ? ui.Button({
          label: t(jumpHint.label_vi, jumpHint.label_en),
          variant: 'primary',
          onClick: function(){ ctx.navigate(jumpHint.workspace); }
        }) : null;
        var hintNode = ui.EmptyState({
          icon: '🛠️',
          title: t(label_vi, label_en) + ' — ' + t('sắp ra mắt','coming next'),
          hint:  t(hint_vi, hint_en),
          action: jumpBtn
        });
        root.innerHTML = hintNode.html;
        var bound = hintNode.bind ? hintNode.bind(root) : function(){};
        return { teardown: bound };
      }
    };
  }

  var stubs = [
    makeStub('orderbook', '📋',
      'Quản lý đơn hàng', 'Order book',
      'Sẽ thay thế hoàn toàn Order Control Tower với bộ lọc đã lưu, chỉnh tại chỗ, và chuyển trạng thái hàng loạt.',
      'Will fully replace the Order Control Tower with saved filters, inline edit, and bulk status transitions.',
      { label_vi: 'Mở Order Book (v2)', label_en: 'Open Order Book (v2)', workspace: 'today' }
    ),
    makeStub('operations', '⚙️',
      'Vận hành', 'Operations',
      'Dispatch board theo máy, pile Launch / Blocked / Running, in traveler, upload bằng chứng trực tiếp.',
      'Per-machine dispatch board, Launch / Blocked / Running piles, one-click traveler print, direct evidence upload.',
      null
    ),
    makeStub('analytics', '📊',
      'Phân tích', 'Analytics',
      'OTD 90 ngày, AEOI auto-create rate, lead time, top 10 ngoại lệ, diff "thay đổi từ hôm qua".',
      'OTD 90-day trend, AEOI auto-create rate, lead time, top 10 exceptions, change-since-yesterday diff.',
      null
    ),
    makeStub('admin', '🛡️',
      'Cấu hình', 'Admin',
      'Gom AEOI config, ánh xạ vai trò, diagnostics, audit feed. Trang Admin > AEOI cũ sẽ thay bằng link tới đây.',
      'Folds AEOI config, role mapping, diagnostics, and audit feed. The standalone Admin > AEOI page redirects here.',
      null
    )
  ];

  function tryRegister(){
    if (window.OrdersV3 && window.OrdersV3.shell && typeof window.OrdersV3.shell.register === 'function') {
      stubs.forEach(function(s){ window.OrdersV3.shell.register(s); });
    } else {
      setTimeout(tryRegister, 50);
    }
  }
  tryRegister();
})();

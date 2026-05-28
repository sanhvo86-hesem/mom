/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Workspace: Today's queue
 *
 * Role-aware exception-first landing surface. The single screen most
 * operators should open every morning.
 *
 * Backend: GET orders_v3_today returns
 *   {
 *     role, tiles[], exceptions[], actions[], counts, generated_at
 *   }
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var O3 = window.OrdersV3 = window.OrdersV3 || {};

  function mount(root, ctx){
    var ui = ctx.ui;
    var t  = function(vi, en){ return ctx.i18n.t(vi, en); };
    var esc = ctx.fmt.esc;

    root.innerHTML = ui.Loading({ label: t('Đang tải hôm nay…','Loading today…') }).html;

    var state = { payload: null, teardown: function(){} };

    function refresh(){
      ctx.api.get('orders_v3_today').then(function(r){
        if (!r.ok) {
          root.innerHTML = ui.EmptyState({
            icon: '⚠️',
            title: t('Không thể tải hôm nay','Could not load today'),
            hint:  (r.error || '') + (r.detail ? ' — ' + r.detail : '')
          }).html;
          return;
        }
        state.payload = r.data;
        render();
      });
    }

    function render(){
      var p = state.payload || {};
      try { state.teardown(); } catch (e) {}

      // Tiles row
      var kpiTiles = (p.tiles || []).map(function(t){
        return ui.KpiTile({
          label: ctx.i18n.t(t.label_vi, t.label_en),
          value: t.value,
          tone:  t.tone,
          sub:   t.sub,
          onClick: t.action ? function(){ ctx.navigate(t.action); } : undefined
        });
      });
      var grid = ui.KpiGrid({ tiles: kpiTiles });

      // Exception list panel
      var excHtml = '';
      if (!p.exceptions || !p.exceptions.length) {
        excHtml = ui.EmptyState({
          icon: '✨',
          title: t('Không có ngoại lệ ưu tiên','No priority exceptions'),
          hint:  t('Hệ thống đang ổn. Quay lại sau hoặc mở Order Book để xem chi tiết.',
                   'All clear. Come back later or open Order Book for details.')
        }).html;
      } else {
        var items = p.exceptions.map(function(e){
          return ui.ExceptionItem({
            severity: ctx.tokens.severity(e.severity),
            title:    e.title,
            msg:      e.msg,
            time:     e.time ? ctx.fmt.relative(e.time) : '',
            onClick:  function(){
              // For now, jump to order book; later, deep-link to detail
              if (e.order_type === 'aeoi') ctx.navigate('intake');
              else ctx.navigate('orderbook');
            }
          });
        });
        excHtml = '<div class="o3-exception-list">' + items.map(function(x){ return x.html; }).join('') + '</div>';
        // Bind after panel injects
      }

      var excPanel = ui.Panel({
        title: t('Ngoại lệ ưu tiên','Priority exceptions'),
        count: (p.exceptions || []).length,
        flush: true,
        body:  excHtml,
        actions: [
          ui.Button({ label: t('Làm mới','Refresh'), icon: '🔄', size: 'sm', variant: 'ghost', onClick: refresh }).html
        ]
      });

      // Shortcut actions panel
      var shortcuts = (p.actions || []).map(function(a){
        return ui.Button({
          label: ctx.i18n.t(a.label_vi, a.label_en),
          variant: a.tone === 'danger' ? 'danger' : (a.tone === 'info' ? 'primary' : undefined),
          onClick: function(){ ctx.navigate(a.workspace); }
        });
      });

      var shortcutPanel = ui.Panel({
        title: t('Lối tắt thao tác','Quick actions'),
        body: shortcuts.length
                ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + shortcuts.map(function(b){ return b.html; }).join('') + '</div>'
                : ui.EmptyState({ icon: '✅', title: t('Không có việc khẩn','Nothing urgent'),
                                  hint: t('Mọi thứ đang ổn cho vai trò của bạn.','Everything is clean for your role.') }).html
      });

      // Layout
      root.innerHTML =
        grid.html
        + '<div class="o3-today-deck">'
        +   excPanel.html
        +   shortcutPanel.html
        + '</div>';

      // Bind
      var teardowns = [grid.bind(root)];
      // exception bindings (re-create items with same id+order to bind to current DOM)
      (p.exceptions || []).forEach(function(e, idx){
        // The id assigned in ExceptionItem was random — to keep bind() working
        // we need to attach via the rendered DOM. Simpler: bind once via delegation:
      });
      var excListEl = root.querySelector('.o3-exception-list');
      if (excListEl) {
        var delegate = function(evt){
          var item = evt.target.closest('.o3-exception');
          if (!item) return;
          var idx = Array.prototype.indexOf.call(excListEl.children, item);
          var e = (p.exceptions || [])[idx];
          if (!e) return;
          if (e.order_type === 'aeoi') ctx.navigate('intake');
          else ctx.navigate('orderbook');
        };
        excListEl.addEventListener('click', delegate);
        teardowns.push(function(){ excListEl.removeEventListener('click', delegate); });
      }
      shortcuts.forEach(function(b){ teardowns.push(b.bind(root)); });

      state.teardown = function(){ teardowns.forEach(function(fn){ try { fn(); } catch (e) {} }); };
    }

    refresh();
    return { teardown: function(){ try { state.teardown(); } catch (e) {} } };
  }

  // Self-register on the shell once loaded
  function tryRegister(){
    if (O3.shell && typeof O3.shell.register === 'function') {
      O3.shell.register({
        id: 'today',
        icon: '🔥',
        label: { vi: 'Việc cần làm hôm nay', en: "Today's Queue" },
        mount: mount
      });
    } else {
      setTimeout(tryRegister, 50);
    }
  }
  tryRegister();
})();

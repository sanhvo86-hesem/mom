/* ════════════════════════════════════════════════════════════════════════
 * Orders v3 — Shell + workspace router + entry point
 *
 * The shell is the only piece that mounts under window._renderSoJoWoDashboard
 * (the entry point 02-state-auth-ui.js calls when the Orders sidebar is
 * clicked). It registers a workspace registry, parses the URL hash
 * suffix, and renders the tab strip + active workspace body.
 *
 * Feature-flag gating:
 *   window.ORDERS_V3_ENABLED === true   →  use v3
 *   localStorage.orders_v3 === '1'      →  use v3
 *   otherwise                            →  fall back to the legacy
 *                                           09e-so-jo-wo-dashboard.js
 *                                           implementation.
 *
 * Backwards-compat note: 09e exposes _renderSoJoWoDashboard at top-level
 * scope (not on window). We capture it at load time, then override
 * window._renderSoJoWoDashboard with our dispatcher.
 * ════════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var O3 = window.OrdersV3 = window.OrdersV3 || {};
  var ui  = O3.ui;
  var t   = function(vi, en){ return O3.i18n.t(vi, en); };
  var esc = O3.fmt.esc;

  // ── Workspace registry ─────────────────────────────────────────────
  // Each workspace registers itself with { id, label, icon, mount, unmount? }
  var workspaces = [];
  function register(ws){
    if (!ws || !ws.id) return;
    var existing = workspaces.find(function(w){ return w.id === ws.id; });
    if (existing) Object.assign(existing, ws);
    else workspaces.push(ws);
  }

  // Default order (matches the 6-workspace IA in the redesign proposal)
  var DEFAULT_ORDER = ['today','intake','orderbook','operations','analytics','admin'];

  function orderedWorkspaces(){
    var byId = {};
    workspaces.forEach(function(w){ byId[w.id] = w; });
    var ordered = [];
    DEFAULT_ORDER.forEach(function(id){ if (byId[id]) ordered.push(byId[id]); });
    workspaces.forEach(function(w){ if (DEFAULT_ORDER.indexOf(w.id) === -1) ordered.push(w); });
    return ordered;
  }

  // ── Routing (hash-based) ───────────────────────────────────────────
  function parseRoute(){
    // Expect "#orders/dashboard" or "#orders/dashboard/<workspace_id>"
    var hash = (location.hash || '').replace(/^#/, '');
    var parts = hash.split('/').filter(Boolean);
    if (parts[0] !== 'orders') return { workspace: null };
    var ws = parts[2] || null;
    return { workspace: ws };
  }

  function setRoute(workspaceId){
    var hash = '#orders/dashboard' + (workspaceId ? '/' + workspaceId : '');
    if (location.hash !== hash) location.hash = hash;
  }

  // ── State ─────────────────────────────────────────────────────────
  var state = {
    container: null,
    activeWorkspace: null,
    activeMount: null,      // { ws, root, teardown }
    booted: false
  };

  // ── Render ────────────────────────────────────────────────────────
  function renderTopbar(){
    var u = O3.perm.user();
    var displayName = (u && u.name) || '';
    var role = (u && u.title) || (u && u.role) || '';
    var html =
      '<header class="o3-shell__topbar">'
      +   '<div>'
      +     '<h1 class="o3-shell__title">📦 ' + esc(t('Quản lý đơn hàng','Order Management')) + '</h1>'
      +     '<p class="o3-shell__subtitle">'
      +       esc(t('Phiên bản v3 — kiến trúc mới, đồng bộ với AEOI','v3 — fresh architecture, AEOI-aware'))
      +       (displayName ? ' · ' + esc(displayName) + (role ? ' · ' + esc(role) : '') : '')
      +     '</p>'
      +   '</div>'
      + '</header>';
    return html;
  }

  function renderTabStrip(activeId){
    var tabs = orderedWorkspaces().map(function(ws){
      var activeCls = (ws.id === activeId) ? ' o3-shell__tab--active' : '';
      var badge = '';
      if (ws.badge && typeof ws.badge === 'function') {
        var b = ws.badge();
        if (b !== null && b !== undefined && b !== 0) {
          badge = '<span class="o3-shell__tab-badge">' + esc(String(b)) + '</span>';
        }
      }
      return '<button type="button" class="o3-shell__tab' + activeCls + '" data-o3-ws="' + esc(ws.id) + '">'
        + (ws.icon ? '<span aria-hidden="true">' + esc(ws.icon) + '</span>' : '')
        + esc(t(ws.label.vi, ws.label.en))
        + badge
        + '</button>';
    }).join('');
    return '<nav class="o3-shell__tabs" role="tablist">' + tabs + '</nav>';
  }

  function renderShellSkeleton(activeId){
    return '<div class="o3-shell">'
      + renderTopbar()
      + renderTabStrip(activeId)
      + '<main class="o3-shell__body" id="o3-shell-body" role="main"></main>'
      + '</div>';
  }

  // ── Workspace lifecycle ───────────────────────────────────────────
  function unmountActive(){
    if (state.activeMount && typeof state.activeMount.teardown === 'function') {
      try { state.activeMount.teardown(); } catch (e) { console.warn('[OrdersV3.shell] unmount error', e); }
    }
    state.activeMount = null;
  }

  function mountWorkspace(workspaceId){
    var all = orderedWorkspaces();
    if (!all.length) {
      // Race condition: shell.mount() fired before workspace files
      // self-registered. Retry every 50ms up to 2s, then give up.
      if (!state._wsWaitStart) state._wsWaitStart = Date.now();
      if (Date.now() - state._wsWaitStart < 2000) {
        setTimeout(function(){ mountWorkspace(workspaceId); }, 50);
        return;
      }
      // Still nothing — render a clear error rather than blank body
      var body = state.container && state.container.querySelector('#o3-shell-body');
      if (body) body.innerHTML = ui.EmptyState({
        icon: '⚠️',
        title: t('Không có workspace nào được đăng ký','No workspaces registered'),
        hint:  t('Kiểm tra portal.html có nạp đủ 09v3-workspace-*.js chưa.','Verify portal.html loads all 09v3-workspace-*.js scripts.')
      }).html;
      return;
    }
    state._wsWaitStart = null;
    var ws = all.find(function(w){ return w.id === workspaceId; }) || pickDefaultWorkspace(all);

    if (state.activeWorkspace === ws.id && state.activeMount) return;

    unmountActive();

    var body = state.container.querySelector('#o3-shell-body');
    if (!body) return;

    body.innerHTML = ui.Loading({ label: t('Đang mở ' + ws.label.vi.toLowerCase() + '…',
                                          'Opening ' + ws.label.en.toLowerCase() + '…') }).html;

    // call mount asynchronously so the loading state actually paints
    setTimeout(function(){
      body.innerHTML = '';
      try {
        var ctx = {
          api: O3.api,
          perm: O3.perm,
          tokens: O3.tokens,
          ui: O3.ui,
          fmt: O3.fmt,
          i18n: O3.i18n,
          navigate: function(targetId){ setRoute(targetId); },
          toast: O3.ui.Toast
        };
        var result = ws.mount(body, ctx) || {};
        state.activeMount = {
          ws: ws,
          root: body,
          teardown: typeof result.teardown === 'function' ? result.teardown : function(){}
        };
        state.activeWorkspace = ws.id;
        refreshTabStrip(ws.id);
      } catch (e) {
        console.error('[OrdersV3.shell] workspace mount failed', ws.id, e);
        body.innerHTML = ui.EmptyState({
          icon: '⚠️',
          title: t('Không thể mở workspace','Workspace failed to load'),
          hint: String(e && e.message || e)
        }).html;
      }
    }, 0);
  }

  function pickDefaultWorkspace(all){
    // Persona-aware default:
    var role = (O3.perm.user() && O3.perm.user().role) || '';
    var primaryByRole = {
      ceo: 'today', general_director: 'today',
      sales_manager: 'today', customer_service: 'intake',
      planning_manager: 'orderbook', production_planner: 'orderbook',
      cnc_workshop_manager: 'operations',
      quality_manager: 'analytics',
      admin: 'admin', it_admin: 'admin'
    };
    var preferredId = primaryByRole[role] || 'today';
    return all.find(function(w){ return w.id === preferredId; }) || all[0];
  }

  function refreshTabStrip(activeId){
    var stripContainer = state.container.querySelector('.o3-shell__tabs');
    if (!stripContainer) return;
    stripContainer.outerHTML = renderTabStrip(activeId);
    bindTabClicks();
  }

  function bindTabClicks(){
    var nav = state.container.querySelector('.o3-shell__tabs');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('[data-o3-ws]'), function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-o3-ws');
        setRoute(id);
        mountWorkspace(id);
      });
    });
  }

  function onHashChange(){
    if (!state.container) return;
    var r = parseRoute();
    if (!r.workspace) return;
    if (r.workspace !== state.activeWorkspace) mountWorkspace(r.workspace);
  }

  // ── Entry ─────────────────────────────────────────────────────────
  function mount(container){
    if (!container) return;
    state.container = container;
    // Flip the body class so orders-v3.css can override the global
    // #page-orders padding. Without this the shell sits inside the
    // legacy 24px gutter and looks like floating cards on white.
    if (document.body) document.body.classList.add('orders-v3-active');
    container.innerHTML = renderShellSkeleton(null);

    // boot permissions, then route
    O3.perm.bootstrap().then(function(){
      var r = parseRoute();
      var startWs = r.workspace || (pickDefaultWorkspace(orderedWorkspaces()) || {}).id;
      bindTabClicks();
      mountWorkspace(startWs);
      window.addEventListener('hashchange', onHashChange);
      state.booted = true;
    });
  }

  function unmount(){
    unmountActive();
    window.removeEventListener('hashchange', onHashChange);
    if (state.container) state.container.innerHTML = '';
    if (document.body) document.body.classList.remove('orders-v3-active');
    state.container = null;
    state.activeWorkspace = null;
    state.booted = false;
  }

  // ── Feature-flag dispatch override ────────────────────────────────
  function v3Enabled(){
    if (window.ORDERS_V3_ENABLED === true) return true;
    try { return localStorage.getItem('orders_v3') === '1'; } catch (e) { return false; }
  }

  // Save the legacy entry point (defined by 09e). It's a top-level
  // function, so it's referenced via window after 09e finishes loading.
  var _legacy = window._renderSoJoWoDashboard;

  window._renderSoJoWoDashboard = function(a, b, container){
    if (v3Enabled()) {
      return mount(container);
    }
    if (typeof _legacy === 'function') {
      return _legacy(a, b, container);
    }
    if (container) {
      container.innerHTML = ui.EmptyState({
        icon: '🚧',
        title: t('Orders v3 chưa kích hoạt','Orders v3 disabled'),
        hint:  t('Bật bằng: localStorage.setItem(\'orders_v3\', \'1\') rồi tải lại trang.',
                 'Enable with: localStorage.setItem(\'orders_v3\', \'1\') then refresh.')
      }).html;
    }
  };

  // ── Export shell API ──────────────────────────────────────────────
  O3.shell = {
    mount: mount,
    unmount: unmount,
    register: register,
    workspaces: orderedWorkspaces,
    current: function(){ return state.activeWorkspace; },
    navigate: function(wsId){
      setRoute(wsId);
      mountWorkspace(wsId);
    },
    isEnabled: v3Enabled
  };

  // Log readiness for power-user discovery
  console.info('[OrdersV3] shell loaded. To enable: localStorage.setItem("orders_v3","1") then reload. Current state:',
               v3Enabled() ? 'ENABLED' : 'disabled');
})();

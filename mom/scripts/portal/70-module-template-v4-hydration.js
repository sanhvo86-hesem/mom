/* HESEM Operations Platform — module-template-v4 hydration adapter.
   Feature-flagged. No-op unless HMV4_PREVIEW_ENABLED or /ops path. */
(function(){
  'use strict';
  if(typeof window !== 'undefined' && typeof window.HMV4_LIVE_API_ENABLED === 'undefined') window.HMV4_LIVE_API_ENABLED = false;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function readLiveApiFlag(){
    if(typeof window === 'undefined') return false;
    if(window.HMV4_LIVE_API_ENABLED === true) return true;
    try {
      var url = new URL(window.location.href);
      if(url.searchParams.get('hmv4-live-api') === '1') return true;
    } catch(_) {}
    if(document.body && document.body.getAttribute('data-hmv4-live-api') === 'true') return true;
    return false;
  }
  function fetchLiveNonconformance(recordId){
    if(!recordId) return Promise.reject(new Error('missing record id'));
    return fetch('/api/v1/nonconformance-cases/' + encodeURIComponent(recordId), {
      credentials: 'include',
      redirect: 'manual',
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if(!res.ok){ throw new Error('live api status ' + res.status); }
      return res.json();
    }).then(function(payload){
      return (payload && payload.data) ? payload.data : payload;
    });
  }
  function normalizeLifecycle(lifecycle){
    if(!Array.isArray(lifecycle)) return [];
    return lifecycle.map(function(stage){
      if(Array.isArray(stage)) return stage;
      return [stage.name || stage.stage || stage.status || 'stage', stage.state || stage.status || 'pending'];
    });
  }
  function adaptLiveNcToFixtureShape(live){
    if(!live) return null;
    var recordId = live.id || live.record_id || live.code;
    return {
      recordId: recordId,
      rootCode: 'NQCASE',
      title: live.title || live.summary || ('Nonconformance ' + (recordId || '')),
      subtype: live.subtype || live.kind || 'nonconformance',
      status: live.state || live.status,
      severity: live.severity,
      state: 'live',
      freshness: 'live_current',
      owner: (live.owner && (live.owner.name || live.owner)) || null,
      source: live.source,
      part: live.part_number || live.part,
      lot: live.lot,
      workOrder: live.work_order_id || live.workOrder,
      stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
      lifecycle: normalizeLifecycle(live.lifecycle)
    };
  }
  function isLiveNonconformanceRoute(route){
    return route && route.routeClass === 'AR' && route.params && route.params.resource_family === 'nonconformance-cases';
  }
  function renderLiveNonconformance(shell, route){
    var content = shell.querySelector('[data-hm-slot="route-content"]');
    if(!content) return false;
    var recordId = route.params && route.params.record_id;
    content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--loading" data-hmv4-live-api-loading="true" data-hmv4-record-id="' + esc(recordId) + '"><p>Loading from /api/v1/nonconformance-cases/' + esc(recordId) + '...</p></article>';
    fetchLiveNonconformance(recordId)
      .then(function(live){
        var adapted = adaptLiveNcToFixtureShape(live);
        window.HMV4_NONCONFORMANCE_CASE_FIXTURE = { records: {} };
        window.HMV4_NONCONFORMANCE_CASE_FIXTURE.records[recordId] = adapted;
        content.innerHTML = window.Hmv4Renderers.renderRoute(route);
        var root = content.querySelector('[data-hmv4-nonconformance-record]');
        if(root){
          root.setAttribute('data-hmv4-source', 'live-api');
          root.setAttribute('data-fixture-state', 'live');
        }
      })
      .catch(function(err){
        content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--error" data-hmv4-live-api-error="true" data-hmv4-record-id="' + esc(recordId) + '">' +
          '<header class="hmv4-record-identity"><h1 class="hmv4-record-title">' + esc(recordId) + ' - live API unavailable</h1></header>' +
          '<p class="hmv4-feedback" data-feedback-state="warning" role="status">Live API unavailable. Falling back to fixture display. Detail: ' + esc(err && err.message ? String(err.message) : 'unknown error') + '. Refresh to retry, or remove ?hmv4-live-api=1 to use fixture display.</p>' +
        '</article>';
      });
    return true;
  }
  function isPreview(){ return !!window.HMV4_PREVIEW_ENABLED || location.pathname.indexOf('/ops') === 0; }
  function ensureShell(){
    var shell = document.getElementById('hmv4-ops-shell');
    if(shell) return shell;
    if(!isPreview()) return null;
    var content = document.getElementById('content') || document.body;
    var mount = document.createElement('div');
    mount.id = 'hmv4-ops-shell';
    mount.className = 'hmv4-ops-shell';
    mount.setAttribute('data-hm-shell','ops');
    mount.setAttribute('data-hm-component','ops-shell');
    mount.innerHTML = ''+
      '<header class="hmv4-top-shell-header" data-hm-region="top_shell_header"><a class="hmv4-brand" href="/ops"><span class="hmv4-brand-mark">H</span><span class="hmv4-brand-text">HESEM Operations Platform</span></a><div class="hmv4-global-actions"><button class="hmv4-icon-button" type="button" aria-label="Close preview" data-hmv4-close-preview>×</button></div></header>'+
      '<aside class="hmv4-left-navigation-rail" data-hm-region="left_navigation_rail"><nav class="hmv4-nav" data-hm-component="left-nav"></nav></aside>'+
      '<main id="hmv4-content" class="hmv4-main" data-hm-region="content_canvas" tabindex="-1"><nav class="hmv4-breadcrumb-row" data-hm-region="breadcrumb_row" aria-label="Breadcrumb"></nav><header class="hmv4-page-header-zone" data-hm-region="page_header_zone"></header><section class="hmv4-page-command-bar" data-hm-region="page_command_bar" hidden></section><section class="hmv4-content-canvas" data-hm-slot="route-content"></section></main>'+
      '<aside class="hmv4-contextual-side-zone" data-hm-region="contextual_side_zone" hidden></aside><footer class="hmv4-bottom-status-sync-rail" data-hm-region="bottom_status_sync_rail" hidden aria-live="polite"></footer>';
    content.innerHTML = '';
    content.appendChild(mount);
    return mount;
  }
  function updateTabs(root){
    root.addEventListener('click', function(e){
      var tab = e.target.closest('[role="tab"][data-tab]');
      if(!tab) return;
      var tabs = tab.closest('[role="tablist"]');
      var shell = tab.closest('.hmv4-record-shell, .hmv4-workspace-shell') || root;
      if(tabs) tabs.querySelectorAll('[role="tab"]').forEach(function(t){ t.setAttribute('aria-selected', String(t === tab)); });
      shell.querySelectorAll('[role="tabpanel"]').forEach(function(p){ p.hidden = p.getAttribute('aria-labelledby') !== tab.id; });
      if(window.history && window.Hmv4Routes){
        var route = window.Hmv4Routes.parseLocation();
        route.query.tab = tab.getAttribute('data-tab');
        history.replaceState(history.state || {}, '', window.Hmv4Routes.buildUrl({routeClass:route.routeClass, params:route.params, query:route.query}));
      }
    });
    root.addEventListener('keydown', function(e){
      var tab = e.target.closest('[role="tab"]');
      if(!tab || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      var list = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      var i = list.indexOf(tab), next = e.key === 'ArrowRight' ? (i+1)%list.length : (i-1+list.length)%list.length;
      list[next].focus(); e.preventDefault();
    });
  }
  function hydrate(){
    if(!isPreview()) return;
    if(!window.Hmv4Routes || !window.Hmv4Renderers) { console.warn('[HMV4] Missing route/render adapters'); return; }
    var shell = ensureShell(); if(!shell) return;
    var route = window.Hmv4Routes.parseLocation();
    shell.setAttribute('data-route-class', route.routeClass || 'UNKNOWN');
    if(window.Hmv4Renderers.renderNav) window.Hmv4Renderers.renderNav(shell.querySelector('[data-hm-component="left-nav"]'));
    window.Hmv4Renderers.applyShell(shell, route);
    if(isLiveNonconformanceRoute(route) && readLiveApiFlag()) renderLiveNonconformance(shell, route);
    updateTabs(shell);
    var close = shell.querySelector('[data-hmv4-close-preview]');
    if(close) close.addEventListener('click', function(){ location.href = location.pathname.replace(/^\/ops\/?/, '/') || '/'; });
    if(route.rejectedQuery && route.rejectedQuery.length && window.history){ history.replaceState(history.state || {}, '', route.canonicalPath + (new URLSearchParams(route.query).toString() ? '?' + new URLSearchParams(route.query).toString() : '')); }
  }
  window.Hmv4LiveApi = {
    enabled: readLiveApiFlag,
    fetchNonconformance: fetchLiveNonconformance,
    adaptNcToFixtureShape: adaptLiveNcToFixtureShape
  };
  window.HMModuleTemplateV4Hydration = { hydrate: hydrate, ensureShell: ensureShell };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate); else hydrate();
})();

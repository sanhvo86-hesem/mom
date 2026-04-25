/**
 * HESEM MOM Portal — Auto Hard-Reload on Backend Deploy
 * =====================================================
 *
 * Polls /mom/build-info.json (written by tools/vps-setup/scripts/deploy.sh
 * after every deploy) and forces a hard reload in every open browser tab
 * the moment a new git sha is published. Users never have to hit F5 or
 * "Empty cache and hard reload" themselves.
 *
 * Triggers a check:
 *   - At page load (records the baseline version).
 *   - When the tab becomes visible again (visibilitychange).
 *   - Every CHECK_INTERVAL_MS while the tab is visible.
 *   - When the service worker takes over a new install (controllerchange)
 *     or sends a NEW_VERSION postMessage.
 *
 * "Hard reload" means:
 *   - Delete every Cache Storage entry the SW owns.
 *   - Tell every active SW registration to .update() so the new sw.js is
 *     fetched immediately.
 *   - location.reload() — combined with the cache delete, this defeats
 *     the bfcache + the SW cache + the HTTP cache.
 *
 * Loaded as the very first portal script (before 00a-registry-service.js)
 * so it runs even when later scripts crash on a stale snapshot.
 */
(function () {
  'use strict';

  if (window.__hesemVersionCheckLoaded) return;
  window.__hesemVersionCheckLoaded = true;

  // ── Tunables ─────────────────────────────────────────────────────────────
  // Build-info lives at the published root because /mom/data/* is blocked
  // by nginx (see tools/vps-setup/nginx/eqms.hesemeng.com.conf).
  var BUILD_INFO_URL         = '/mom/build-info.json';
  var CHECK_INTERVAL_MS      = 5 * 60 * 1000;  // 5 min — light, far below CDN/edge rate limits
  var MIN_FETCH_INTERVAL_MS  = 60 * 1000;      // Hard floor: never poll build-info >1/min
  var GRACE_BEFORE_RELOAD_MS = 8000;           // 8 s — long enough to finish a save click
  var DEFER_WHEN_BUSY_MS     = 60 * 1000;      // 1 min — re-check after deferring for unsaved edits
  var MAX_DEFER_COUNT        = 30;             // 30 deferrals (~30 min) → switch to manual CTA
  var STORAGE_KEY            = 'hesem_portal_build_version';

  // ── State ────────────────────────────────────────────────────────────────
  var baselineVersion = null;
  var pendingVersion  = null;
  var reloadInProgress = false;
  var lastFetchAt      = 0;
  var deferCount       = 0;
  var deferTimerId     = null;
  var cooldownTimerId  = null;

  // ── Toast (no DOM dependencies — runs even if 02-state-auth-ui hasn't loaded) ─
  function renderToast(headline, body) {
    var existing = document.getElementById('hesem-version-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'hesem-version-toast';
    t.setAttribute('role', 'status');
    t.style.cssText = [
      'position:fixed', 'right:20px', 'bottom:20px', 'z-index:2147483647',
      'background:#0f172a', 'color:#f8fafc',
      'padding:14px 18px', 'border-radius:10px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'font:500 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'max-width:340px'
    ].join(';');
    t.innerHTML =
      '<div style="font-weight:600;margin-bottom:4px">' + escapeForToast(headline) + '</div>' +
      '<div style="opacity:0.85">' + escapeForToast(body) + '</div>';
    document.body && document.body.appendChild(t);
  }

  function showReloadToast(newVersion) {
    var short = String(newVersion || '').slice(0, 7);
    renderToast('Phiên bản mới đã deploy',
                'Bản ' + short + ' vừa được phát hành. Đang tải lại trình duyệt…');
  }

  function showDeferredToast(newVersion) {
    var short = String(newVersion || '').slice(0, 7);
    renderToast('Phiên bản mới sẵn sàng',
                'Bản ' + short + ' đang chờ. Trình duyệt sẽ tự tải lại sau khi bạn lưu xong.');
  }

  // After MAX_DEFER_COUNT deferrals (~30 min) we stop auto-retrying and
  // hand control back to the user — they likely have a long-running edit
  // session and should reload at their own moment.
  function showManualReloadCta(newVersion) {
    var existing = document.getElementById('hesem-version-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'hesem-version-toast';
    t.setAttribute('role', 'status');
    t.style.cssText = [
      'position:fixed', 'right:20px', 'bottom:20px', 'z-index:2147483647',
      'background:#0f172a', 'color:#f8fafc',
      'padding:14px 18px', 'border-radius:10px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'font:500 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'max-width:340px'
    ].join(';');
    var short = String(newVersion || '').slice(0, 7);
    t.innerHTML =
      '<div style="font-weight:600;margin-bottom:4px">' + escapeForToast('Cần tải lại để áp bản mới') + '</div>' +
      '<div style="opacity:0.85;margin-bottom:10px">' +
        escapeForToast('Bản ' + short + ' đã chờ hơn 30 phút. Lưu các thay đổi rồi bấm Tải lại.') +
      '</div>' +
      '<button id="hesem-version-toast-reload" style="' +
        'background:#2563eb;color:#fff;border:none;padding:8px 14px;border-radius:6px;' +
        'font:600 13px/1 system-ui,sans-serif;cursor:pointer">' +
        escapeForToast('Tải lại ngay') +
      '</button>';
    document.body && document.body.appendChild(t);
    var btn = document.getElementById('hesem-version-toast-reload');
    if (btn) btn.addEventListener('click', function () {
      clearDeferredTimer();
      pendingVersion = newVersion || pendingVersion;
      if (pendingVersion) baselineVersion = pendingVersion;
      deferCount = 0;
      reloadInProgress = true;
      hardReload();
    });
  }

  function escapeForToast(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

  // ── Hard reload ──────────────────────────────────────────────────────────
  // Clear caches BEFORE reload so the new HTML is fetched from the network.
  // Trigger SW.update() so the next install kicks in.
  async function hardReload() {
    clearDeferredTimer();
    clearCooldownTimer();
    try {
      if ('caches' in window && caches.keys) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (k) {
          return caches.delete(k).catch(function () { return false; });
        }));
      }
    } catch (e) { /* swallow — reload should still happen */ }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all((regs || []).map(function (r) {
          return r.update().catch(function () { return null; });
        }));
      }
    } catch (e) { /* swallow */ }

    // Persist the latest seen version so a subsequent load that races with
    // the reload still recognises this as the "new" baseline.
    try { localStorage.setItem(STORAGE_KEY, baselineVersion || ''); } catch (e) {}

    // Some browsers ignore the deprecated `true` arg; the cache deletion
    // above is what actually defeats the cache.
    window.location.reload();
  }

  // ── Version fetch ───────────────────────────────────────────────────────
  async function fetchPublishedVersion() {
    // Throttle to avoid hammering the origin if visibilitychange fires
    // repeatedly (eg. window manager focus thrash).
    var now = Date.now();
    if (now - lastFetchAt < MIN_FETCH_INTERVAL_MS) {
      queueCooldownRetry(MIN_FETCH_INTERVAL_MS - (now - lastFetchAt));
      return null;
    }
    clearCooldownTimer();
    lastFetchAt = now;

    try {
      var url = BUILD_INFO_URL + '?_=' + now;
      var resp = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) return null;
      var info = await resp.json();
      // Accept either {sha} (preferred — full hash, change-resistant)
      // or {version} (short hash) as the comparison key.
      var v = (info && (info.sha || info.version)) || null;
      return typeof v === 'string' ? v : null;
    } catch (e) {
      return null;
    }
  }

  // Returns true when no admin module is mid-edit. Defaults to "safe to
  // reload" if 02-state-auth-ui.js has not registered the bridge yet
  // (the version-check loads first; it would be wrong to permanently
  // block reloads waiting for a callback that may never appear).
  function canReloadNow() {
    if (typeof window.__hesemPortalCanReloadNow !== 'function') return true;
    try { return !!window.__hesemPortalCanReloadNow(); }
    catch (e) { return true; }
  }

  function clearDeferredTimer() {
    if (deferTimerId === null) return;
    clearTimeout(deferTimerId);
    deferTimerId = null;
  }

  function clearCooldownTimer() {
    if (cooldownTimerId === null) return;
    clearTimeout(cooldownTimerId);
    cooldownTimerId = null;
  }

  function queueCooldownRetry(waitMs) {
    if (reloadInProgress || deferTimerId !== null || cooldownTimerId !== null) return;
    var delay = Math.max(250, Number(waitMs) || MIN_FETCH_INTERVAL_MS);
    cooldownTimerId = setTimeout(function () {
      cooldownTimerId = null;
      checkAndMaybeReload();
    }, delay);
  }

  function deferReload(newVersion) {
    clearCooldownTimer();
    pendingVersion = newVersion || pendingVersion;
    reloadInProgress = false;
    deferCount++;
    if (deferCount >= MAX_DEFER_COUNT) {
      showManualReloadCta(pendingVersion || newVersion);
      return;
    }
    showDeferredToast(pendingVersion || newVersion);
    clearDeferredTimer();
    deferTimerId = setTimeout(function () {
      deferTimerId = null;
      checkAndMaybeReload();
    }, DEFER_WHEN_BUSY_MS);
  }

  function scheduleReload(newVersion) {
    clearDeferredTimer();
    clearCooldownTimer();
    pendingVersion = newVersion;
    reloadInProgress = true;
    deferCount = 0;
    showReloadToast(newVersion);
    setTimeout(function () {
      if (!reloadInProgress) return;
      if (!canReloadNow()) {
        deferReload(pendingVersion || newVersion);
        return;
      }
      baselineVersion = pendingVersion || newVersion;
      pendingVersion = null;
      hardReload();
    }, GRACE_BEFORE_RELOAD_MS);
  }

  async function checkAndMaybeReload() {
    if (reloadInProgress) return;
    var live = await fetchPublishedVersion();
    if (!live) return;

    if (baselineVersion === null) {
      // First successful read. If this tab was restored from an old app shell
      // but build-info already points at a newer deploy, do not "adopt" the
      // live sha as baseline. Force one hard reload so the browser loads the
      // matching portal.html/JS/CSS set instead of continuing with stale code.
      try {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== live) {
          baselineVersion = stored;
          scheduleReload(live);
          return;
        }
        if (stored !== live) localStorage.setItem(STORAGE_KEY, live);
      } catch (e) { /* private mode etc. — fall through */ }
      baselineVersion = live;
      return;
    }

    if (live === baselineVersion) return;

    // Live sha differs from what we've been showing. Honour any registered
    // "do not reload, user is editing" guards before tearing the page down.
    if (!canReloadNow()) {
      // Re-poll soon. Do NOT mutate baselineVersion yet — we want the next
      // check to still see a diff so we re-attempt the reload once the
      // user finishes saving.
      deferReload(live);
      return;
    }

    scheduleReload(live);
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    checkAndMaybeReload();

    // Periodic poll while the tab is visible — pause when hidden so we don't
    // burn battery on background tabs, then catch up via visibilitychange.
    var pollTimer = null;
    function startPolling() {
      if (pollTimer !== null) return;
      pollTimer = setInterval(checkAndMaybeReload, CHECK_INTERVAL_MS);
    }
    function stopPolling() {
      if (pollTimer === null) return;
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (document.visibilityState === 'visible') startPolling();

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        checkAndMaybeReload();
        startPolling();
      } else {
        stopPolling();
      }
    });

    // Service worker channel — sw.js broadcasts NEW_VERSION on activate so
    // an updated SW triggers an immediate check (faster than the 5-min poll).
    if (navigator.serviceWorker) {
      try {
        navigator.serviceWorker.addEventListener('controllerchange', checkAndMaybeReload);
        navigator.serviceWorker.addEventListener('message', function (event) {
          var data = event && event.data;
          if (data && data.type === 'NEW_VERSION') checkAndMaybeReload();
        });
      } catch (e) { /* ignore — non-critical */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

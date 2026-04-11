/**
 * HESEM MOM Portal — Service Worker
 * ==================================
 * PHASE 5: Progressive Web App and Offline Support
 *
 * Caching strategies:
 *   - Cache-first   : static assets (HTML, CSS, JS, images, fonts)
 *   - Network-first  : API calls (with offline fallback from IndexedDB)
 *   - Stale-while-revalidate : form schemas
 *
 * Features:
 *   - Cache versioning with automatic cleanup of stale caches
 *   - Background sync for offline form submissions
 *   - Push notification support (registration + display)
 *   - Offline fallback page
 *   - Cache size limits and LRU eviction
 *   - Skip waiting + clients claim for immediate activation
 */

'use strict';

// ── Cache Configuration ─────────────────────────────────────────────────────

const CACHE_VERSION = 'v1.3.38';
const CACHE_PREFIX  = 'hesem-mom';

/** Named caches with version stamps. */
const CACHES = {
  static:  `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  api:     `${CACHE_PREFIX}-api-${CACHE_VERSION}`,
  schema:  `${CACHE_PREFIX}-schema-${CACHE_VERSION}`,
  images:  `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts:   `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
};

/** Maximum items per cache before eviction kicks in. */
const CACHE_LIMITS = {
  [CACHES.api]:    50,
  [CACHES.schema]: 100,
  [CACHES.images]: 200,
  [CACHES.fonts]:  30,
};

/** Static assets to pre-cache during installation. */
const PRECACHE_URLS = [
  '/mom/portal.html',
  '/mom/index.html',
  '/mom/styles/portal.main.css',
  '/mom/styles/deploy-dashboard.css',
  '/mom/styles/vps-control-tower.css',
  '/mom/styles/online-forms.css',
  '/mom/styles/form-runtime-frm-403.css',
  '/mom/styles/gateway-landing.css',
  '/mom/assets/css/mobile.css',
  '/mom/scripts/portal/01-data-config.js',
  '/mom/scripts/portal/02-state-auth-ui.js',
  '/mom/scripts/portal/03-editor-core.js',
  '/mom/scripts/portal/03-commands-layout.js',
  '/mom/scripts/portal/03-commands-link.js',
  '/mom/scripts/portal/03-commands-table.js',
  '/mom/scripts/portal/04-workflow-actions.js',
  '/mom/scripts/portal/05-workflow-panel.js',
  '/mom/scripts/portal/06-tiptap-pilot.js',
  '/mom/scripts/portal/08-deploy-dashboard.js',
  '/mom/scripts/portal/09-online-forms.js',
  '/mom/scripts/portal/09b-form-fill-download.js',
  '/mom/scripts/portal/33-vps-control-tower.js',
  '/mom/scripts/portal/10-eqms-form-runtime.js',
  '/mom/scripts/form-runtimes/frm-403-scar.js',
  '/mom/scripts/portal/10-upload-validator.js',
  '/mom/scripts/portal/90-qrcodegen.js',
  '/mom/scripts/portal/99-bootstrap.js',
  '/mom/scripts/gateway-landing.js',
  '/mom/assets/js/offline-store.js',
  '/mom/assets/js/sync-manager.js',
  '/mom/assets/js/barcode-scanner.js',
  '/mom/assets/js/pwa-init.js',
  '/mom/manifest.json',
  '/mom/form-runtimes/frm-403-scar.html',
  '/mom/docs/forms/frm-400-quality/FRM-403-SCAR_Supplier_Corrective_Action_Request.html',
  '/assets/style_scoped.css',
  '/assets/style.css',
  '/assets/hesem-logo.svg',
];

/** Background sync tag for offline form submissions. */
const SYNC_TAG_FORMS = 'hesem-mom-form-sync';

/** Background sync tag for offline NCR submissions. */
const SYNC_TAG_NCR = 'hesem-mom-ncr-sync';


// ── Install Event ───────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHES.static)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        // Use addAll with individual error handling so one missing asset
        // does not block the entire install.
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Failed to pre-cache:', url, err.message);
            })
          )
        );
      })
      .then(() => {
        // Skip waiting so the new SW activates immediately.
        return self.skipWaiting();
      })
  );
});


// ── Activate Event ──────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker', CACHE_VERSION);

  event.waitUntil(
    // Clean up old caches from previous versions.
    caches.keys()
      .then((cacheNames) => {
        const currentCaches = new Set(Object.values(CACHES));
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && !currentCaches.has(name))
            .map((name) => {
              console.log('[SW] Deleting stale cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Immediately take control of all open clients.
        return self.clients.claim();
      })
  );
});


// ── Fetch Event — Routing ───────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests (POST form submissions handled by Background Sync).
  if (request.method !== 'GET') return;

  // Route to appropriate caching strategy based on request type.
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, CACHES.api));
  } else if (isSchemaRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHES.schema));
  } else if (isFontRequest(url)) {
    event.respondWith(cacheFirst(request, CACHES.fonts));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, CACHES.images));
  } else if (isAppShellRequest(url)) {
    event.respondWith(networkFirst(request, CACHES.static));
  } else {
    event.respondWith(cacheFirst(request, CACHES.static));
  }
});


// ── Request Classification Helpers ──────────────────────────────────────────

/**
 * Check if a URL targets the PHP API layer.
 * @param {URL} url
 * @returns {boolean}
 */
function isApiRequest(url) {
  return url.pathname.includes('/api.php') ||
         url.pathname.includes('/api/') ||
         url.pathname.includes('/form_workflow.php');
}

/**
 * Check if a URL fetches a form schema (JSON definition).
 * @param {URL} url
 * @returns {boolean}
 */
function isSchemaRequest(url) {
  return (url.pathname.endsWith('.json') &&
          (url.pathname.includes('/forms/') ||
           url.pathname.includes('/schemas/') ||
           url.pathname.includes('/config/'))) ||
         (url.searchParams.has('action') &&
          url.searchParams.get('action') === 'get_schema');
}

/**
 * Check if a URL requests a font file.
 * @param {URL} url
 * @returns {boolean}
 */
function isFontRequest(url) {
  return /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url.pathname);
}

/**
 * Check if a URL requests an image file.
 * @param {URL} url
 * @returns {boolean}
 */
function isImageRequest(url) {
  return /\.(png|jpe?g|gif|svg|webp|ico|avif)(\?.*)?$/i.test(url.pathname);
}

function isAppShellRequest(url) {
  return /\.(?:html|css|js)(\?.*)?$/i.test(url.pathname) ||
         url.pathname.endsWith('/manifest.json') ||
         url.pathname.endsWith('/favicon.ico') ||
         url.pathname.endsWith('/portal.html') ||
         url.pathname.includes('/scripts/portal/') ||
         url.pathname.includes('/assets/js/') ||
         url.pathname.includes('/styles/');
}


// ── Caching Strategies ──────────────────────────────────────────────────────

/**
 * Cache-first strategy.
 * Return the cached response if available; otherwise fetch from network,
 * cache the response, and return it. Falls back to offline page on failure.
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await enforceLimit(cacheName);
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Cache-first fetch failed:', request.url, err.message);
    return offlineFallback(request);
  }
}

/**
 * Network-first strategy.
 * Try the network; on success cache the response. On failure return the
 * cached copy or an offline fallback.
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await enforceLimit(cacheName);
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network-first falling back to cache:', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Stale-while-revalidate strategy.
 * Return the cached version immediately (stale) while fetching a fresh
 * copy in the background to update the cache for next time.
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fire off a background revalidation regardless.
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        enforceLimit(cacheName);
      }
      return networkResponse;
    })
    .catch((err) => {
      console.warn('[SW] SWR revalidation failed:', request.url, err.message);
      return null;
    });

  // Return cached version immediately if available; otherwise wait for network.
  return cached || (await fetchPromise) || offlineFallback(request);
}


// ── Offline Fallback ────────────────────────────────────────────────────────

/**
 * Build an offline fallback response when both cache and network fail.
 * Returns a minimal HTML page for navigation requests or a JSON error
 * for API requests.
 *
 * @param {Request} request
 * @returns {Response}
 */
function offlineFallback(request) {
  if (request.headers.get('Accept')?.includes('application/json') || isApiRequest(new URL(request.url))) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'offline',
        error_vi: 'Không có kết nối mạng. Dữ liệu đã được lưu cục bộ để đồng bộ sau.',
        offline: true,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Minimal offline HTML page for navigation requests.
  const offlineHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HESEM MOM - Mất kết nối</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;
         background:#1a1a2e;color:#fff;display:flex;align-items:center;
         justify-content:center;min-height:100vh;text-align:center;padding:24px}
    .offline-card{max-width:420px}
    .offline-icon{font-size:64px;margin-bottom:24px}
    h1{font-size:24px;margin-bottom:12px;color:#e94560}
    p{color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:20px}
    .btn-retry{display:inline-block;padding:12px 32px;background:#e94560;color:#fff;
               border:none;border-radius:8px;font-size:16px;font-weight:600;
               cursor:pointer;text-decoration:none}
    .btn-retry:hover{background:#d63850}
    .status{margin-top:24px;font-size:13px;color:rgba(255,255,255,.4)}
  </style>
</head>
<body>
  <div class="offline-card">
    <div class="offline-icon">&#9888;&#65039;</div>
    <h1>Không có kết nối mạng</h1>
    <p>Bạn đang ở chế độ offline. Dữ liệu đã lưu vẫn có thể truy cập được.
       Kiểm tra lại kết nối Wi‑Fi hoặc mạng rồi thử lại.</p>
    <button class="btn-retry" onclick="window.location.reload()">Thử lại</button>
    <div class="status">HESEM MOM Portal &mdash; Chế độ ngoại tuyến</div>
  </div>
</body>
</html>`;

  return new Response(offlineHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}


// ── Cache Size Enforcement (LRU Eviction) ───────────────────────────────────

/**
 * Enforce the maximum item count for a given cache by evicting the oldest
 * entries (LRU) when the limit is exceeded.
 *
 * @param {string} cacheName
 */
async function enforceLimit(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();

  if (keys.length > limit) {
    const deleteCount = keys.length - limit;
    console.log(`[SW] Evicting ${deleteCount} old entries from ${cacheName}`);
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}


// ── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === SYNC_TAG_FORMS || event.tag === SYNC_TAG_NCR) {
    event.waitUntil(syncOfflineSubmissions(event.tag));
  }
});

/**
 * Process queued offline form submissions by reading from IndexedDB and
 * submitting each to the API.
 *
 * @param {string} tag  The sync tag identifying the queue type.
 */
async function syncOfflineSubmissions(tag) {
  try {
    // Open the IndexedDB submission_queue store.
    const db = await openDB();
    const tx = db.transaction('submission_queue', 'readonly');
    const store = tx.objectStore('submission_queue');
    const allItems = await idbGetAll(store);

    console.log(`[SW] Syncing ${allItems.length} queued submissions for tag: ${tag}`);

    for (const item of allItems) {
      try {
        const response = await fetch('/mom/api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'form_submit',
            form_code: item.formCode,
            data: item.data,
            offline_id: item.id,
            queued_at: item.queuedAt,
          }),
        });

        if (response.ok) {
          // Remove successfully synced item from queue.
          const deleteTx = db.transaction('submission_queue', 'readwrite');
          deleteTx.objectStore('submission_queue').delete(item.id);

          // Log successful sync.
          const logTx = db.transaction('sync_log', 'readwrite');
          logTx.objectStore('sync_log').add({
            formCode: item.formCode,
            status: 'synced',
            syncedAt: new Date().toISOString(),
            offlineId: item.id,
          });

          console.log('[SW] Synced submission:', item.formCode, item.id);
        } else {
          console.warn('[SW] Sync failed for item:', item.id, response.status);
        }
      } catch (fetchErr) {
        console.warn('[SW] Sync fetch error for item:', item.id, fetchErr.message);
        // Will retry on next sync event.
      }
    }

    db.close();

    // Notify all open clients about sync completion.
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        tag: tag,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (err) {
    console.error('[SW] Background sync error:', err);
    throw err; // Causes the browser to retry the sync.
  }
}


// ── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'HESEM MOM',
    body: 'Ban co thong bao moi.',
    icon: '/mom/assets/icons/icon-192x192.png',
    badge: '/mom/assets/icons/icon-72x72.png',
    tag: 'mom-notification',
    data: { url: '/mom/portal.html' },
  };

  // Parse the push payload if available.
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/mom/assets/icons/icon-192x192.png',
    badge: data.badge || '/mom/assets/icons/icon-72x72.png',
    tag: data.tag || 'mom-notification',
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    data: data.data || { url: '/mom/portal.html' },
    actions: data.actions || [
      { action: 'open', title: 'Xem', icon: '/mom/assets/icons/icon-72x72.png' },
      { action: 'dismiss', title: 'Bo qua' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

/**
 * Handle notification click events.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/mom/portal.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing window if one is open on the portal.
        for (const client of clientList) {
          if (client.url.includes('/mom/') && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              action: event.action,
            });
            return client.focus();
          }
        }
        // Otherwise open a new window.
        return self.clients.openWindow(targetUrl);
      })
  );
});


// ── Message Handler (from main thread) ──────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      // Allow the main thread to request caching of additional URLs.
      if (Array.isArray(payload)) {
        event.waitUntil(
          caches.open(CACHES.static).then((cache) =>
            Promise.allSettled(payload.map((url) => cache.add(url)))
          )
        );
      }
      break;

    case 'CLEAR_CACHE':
      // Allow the main thread to clear specific or all caches.
      event.waitUntil(
        payload
          ? caches.delete(payload)
          : caches.keys().then((names) =>
              Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => caches.delete(n)))
            )
      );
      break;

    case 'GET_CACHE_STATS':
      // Report cache statistics to the requesting client.
      event.waitUntil(
        getCacheStats().then((stats) => {
          event.source.postMessage({ type: 'CACHE_STATS', payload: stats });
        })
      );
      break;

    default:
      break;
  }
});

/**
 * Gather statistics for all managed caches.
 * @returns {Promise<Object>}
 */
async function getCacheStats() {
  const stats = {};
  const names = await caches.keys();
  for (const name of names.filter((n) => n.startsWith(CACHE_PREFIX))) {
    const cache = await caches.open(name);
    const keys  = await cache.keys();
    stats[name] = { count: keys.length, limit: CACHE_LIMITS[name] || 'unlimited' };
  }
  return stats;
}


// ── IndexedDB Helpers (minimal, for SW background sync only) ────────────────

/**
 * Open the hesem_mom_offline IndexedDB database.
 * This is a minimal opener for the service worker context; the full schema
 * management lives in offline-store.js on the main thread.
 *
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hesem_mom_offline', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('submission_queue')) {
        db.createObjectStore('submission_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sync_log')) {
        db.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Retrieve all records from an IDBObjectStore.
 * @param {IDBObjectStore} store
 * @returns {Promise<Array>}
 */
function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

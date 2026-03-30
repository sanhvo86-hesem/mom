/**
 * HESEM QMS Portal — PWA Initialization
 * =======================================
 * PHASE 5: Progressive Web App and Offline Support
 *
 * Bootstraps all PWA features on page load:
 *   1. Service Worker registration and update management
 *   2. Add-to-Home-Screen (A2HS) install prompt handling
 *   3. Offline store initialization (IndexedDB)
 *   4. Sync manager initialization (background sync)
 *   5. Push notification permission flow
 *   6. Network status monitoring and UI feedback
 *   7. App badge management for unread notification counts
 *
 * Load order: This file should be the LAST <script> loaded, after
 * offline-store.js and sync-manager.js.
 */

'use strict';

(function () {

  // ── Configuration ───────────────────────────────────────────────────────

  const SW_PATH      = '/01-QMS-Portal/sw.js';
  const SW_VERSION   = '1.3.1';
  const SW_SCOPE     = '/01-QMS-Portal/';
  const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const SW_RELOAD_MARKER = `qms_sw_reloaded_${SW_VERSION}`;


  // ── State ───────────────────────────────────────────────────────────────

  /** @type {ServiceWorkerRegistration|null} */
  let swRegistration = null;

  /** @type {BeforeInstallPromptEvent|null} Deferred install prompt. */
  let deferredInstallPrompt = null;

  /** @type {boolean} Whether the PWA is installed. */
  let isInstalled = false;

  /** @type {boolean} Whether push notifications are enabled. */
  let pushEnabled = false;


  // ── 1. Service Worker Registration ────────────────────────────────────

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers not supported');
      return;
    }

    try {
      swRegistration = await navigator.serviceWorker.register(`${SW_PATH}?v=${encodeURIComponent(SW_VERSION)}`, { scope: SW_SCOPE });
      console.log('[PWA] Service worker registered, scope:', swRegistration.scope);

      if (swRegistration.waiting) {
        activateWaitingWorker(swRegistration);
      }

      // Listen for update events.
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // A new service worker is available; activate it immediately so
            // portal/runtime fixes are not blocked behind a stale cached shell.
            activateWaitingWorker(swRegistration);
          }
        });
      });

      // Periodic update checks.
      setInterval(() => {
        if (swRegistration) {
          swRegistration.update().catch((err) => {
            console.warn('[PWA] Update check failed:', err);
          });
        }
      }, UPDATE_CHECK_INTERVAL_MS);

      // Listen for messages from the service worker.
      navigator.serviceWorker.addEventListener('message', handleSwMessage);

      // Handle controller change (new SW took over).
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed, new service worker active');
        try {
          if (sessionStorage.getItem(SW_RELOAD_MARKER) !== '1') {
            sessionStorage.setItem(SW_RELOAD_MARKER, '1');
            window.location.reload();
          }
        } catch (err) {
          window.location.reload();
        }
      });

      swRegistration.update().catch((err) => {
        console.warn('[PWA] Initial update check failed:', err);
      });

    } catch (err) {
      console.error('[PWA] Service worker registration failed:', err);
    }
  }

  function activateWaitingWorker(registration) {
    try {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (err) {
      console.warn('[PWA] Failed to activate waiting service worker:', err);
      showUpdateNotification();
    }
  }


  // ── 2. Install Prompt (Add to Home Screen) ───────────────────────────

  /**
   * Capture the beforeinstallprompt event so we can trigger it from a
   * custom UI button rather than the browser's default mini-infobar.
   */
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    console.log('[PWA] Install prompt captured');
    showInstallBanner();
  });

  /**
   * Track when the app is successfully installed.
   */
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredInstallPrompt = null;
    hideInstallBanner();
    console.log('[PWA] App installed successfully');
  });

  /**
   * Check if the app is already running in standalone mode.
   */
  function checkInstalledState() {
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      isInstalled = true;
      console.log('[PWA] Running in standalone mode (installed)');
    }
  }

  /**
   * Programmatically trigger the install prompt.
   * Call this from a UI button's click handler.
   *
   * @returns {Promise<string>}  The user's choice: 'accepted' or 'dismissed'.
   */
  async function promptInstall() {
    if (!deferredInstallPrompt) {
      console.log('[PWA] No install prompt available');
      return 'unavailable';
    }

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    deferredInstallPrompt = null;
    return outcome;
  }


  // ── 3. Update Notification ────────────────────────────────────────────

  /**
   * Show a non-blocking banner informing the user that a new version is
   * available and offering a reload button.
   */
  function showUpdateNotification() {
    // Remove existing banner if any.
    const existing = document.getElementById('qms-update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'qms-update-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = `
      <span>Phiên bản mới đã sẵn sàng.</span>
      <button id="qms-update-btn">Cập nhật ngay</button>
      <button id="qms-update-dismiss" aria-label="Đóng">&times;</button>
    `;

    // Inline styles to avoid dependency on mobile.css being loaded.
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:10001;
      display:flex;align-items:center;justify-content:center;gap:12px;
      padding:12px 20px;background:#1565c0;color:#fff;font-size:14px;
      font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
    `;

    document.body.appendChild(banner);

    document.getElementById('qms-update-btn').addEventListener('click', () => {
      // Tell the waiting SW to skip waiting and take control.
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });

    document.getElementById('qms-update-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }


  // ── 4. Install Banner ────────────────────────────────────────────────

  function showInstallBanner() {
    if (isInstalled) return;
    if (sessionStorage.getItem('qms_install_dismissed') === '1') return;

    const existing = document.getElementById('qms-install-banner');
    if (existing) return; // Already shown.

    const banner = document.createElement('div');
    banner.id = 'qms-install-banner';
    banner.innerHTML = `
      <div class="qms-install-inner">
        <span>Cài đặt HESEM QMS để truy cập nhanh hơn và dùng offline.</span>
        <button id="qms-install-btn">Cài đặt</button>
        <button id="qms-install-dismiss" aria-label="Đóng">&times;</button>
      </div>
    `;
    banner.style.cssText = `
      position:fixed;bottom:80px;left:16px;right:16px;z-index:10001;
      max-width:480px;margin:auto;
      background:rgba(33,37,41,.95);backdrop-filter:blur(8px);
      color:#fff;border-radius:12px;padding:16px 20px;
      box-shadow:0 4px 20px rgba(0,0,0,.35);
      font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;font-size:13px;
    `;

    const innerStyle = document.createElement('style');
    innerStyle.textContent = `
      .qms-install-inner{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      #qms-install-btn{padding:8px 20px;background:#e94560;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px}
      #qms-install-btn:hover{background:#d63850}
      #qms-install-dismiss{background:none;border:none;color:rgba(255,255,255,.6);font-size:20px;cursor:pointer;padding:4px}
    `;
    banner.appendChild(innerStyle);
    document.body.appendChild(banner);

    document.getElementById('qms-install-btn').addEventListener('click', async () => {
      await promptInstall();
      banner.remove();
    });

    document.getElementById('qms-install-dismiss').addEventListener('click', () => {
      banner.remove();
      // Remember dismissal for this session.
      sessionStorage.setItem('qms_install_dismissed', '1');
    });
  }

  function hideInstallBanner() {
    const el = document.getElementById('qms-install-banner');
    if (el) el.remove();
  }


  // ── 5. Push Notification Permissions ──────────────────────────────────

  /**
   * Request push notification permission from the user.
   *
   * @returns {Promise<string>}  'granted', 'denied', or 'default'.
   */
  async function requestPushPermission() {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      pushEnabled = true;
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.log('[PWA] Notifications denied by user');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    pushEnabled = (permission === 'granted');
    console.log('[PWA] Notification permission:', permission);
    return permission;
  }

  /**
   * Subscribe to push notifications via the service worker.
   * Requires a VAPID public key from the server for web push.
   *
   * @param {string} vapidPublicKey  Base64-encoded VAPID public key.
   * @returns {Promise<PushSubscription|null>}
   */
  async function subscribePush(vapidPublicKey) {
    if (!swRegistration || !pushEnabled) return null;

    try {
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('[PWA] Push subscription:', subscription.endpoint);

      // Send subscription to the server.
      await fetch('/01-QMS-Portal/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push_subscribe',
          subscription: subscription.toJSON(),
        }),
      });

      return subscription;
    } catch (err) {
      console.error('[PWA] Push subscription failed:', err);
      return null;
    }
  }


  // ── 6. Network Status Monitoring ──────────────────────────────────────

  /**
   * Create a top-bar offline indicator that shows when the network is down.
   */
  function initNetworkMonitor() {
    // Create the offline bar (hidden by default).
    const bar = document.createElement('div');
    bar.id = 'qms-offline-bar';
    bar.setAttribute('role', 'alert');
    bar.setAttribute('aria-live', 'assertive');
    bar.textContent = 'Bạn đang offline. Dữ liệu đã lưu vẫn có thể truy cập.';
    bar.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:9999;
      padding:8px 16px;text-align:center;
      background:#c62828;color:#fff;font-size:13px;font-weight:600;
      font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;
      transform:translateY(-100%);transition:transform .3s ease;
    `;
    document.body.appendChild(bar);

    function updateBar() {
      if (navigator.onLine) {
        bar.style.transform = 'translateY(-100%)';
        document.body.style.paddingTop = '';
      } else {
        bar.style.transform = 'translateY(0)';
        document.body.style.paddingTop = '36px';
      }
    }

    window.addEventListener('online', () => {
      updateBar();
      console.log('[PWA] Back online');
    });

    window.addEventListener('offline', () => {
      updateBar();
      console.log('[PWA] Gone offline');
    });

    // Initial state.
    updateBar();
  }


  // ── 7. App Badge ──────────────────────────────────────────────────────

  /**
   * Update the app badge count (for installed PWA).
   *
   * @param {number} count  Number to display on the badge. 0 clears it.
   */
  async function updateAppBadge(count) {
    if (!('setAppBadge' in navigator)) return;

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (e) {
      // Not critical.
    }
  }


  // ── SW Message Handler ────────────────────────────────────────────────

  function handleSwMessage(event) {
    const { type, payload } = event.data || {};

    switch (type) {
      case 'SYNC_COMPLETE':
        console.log('[PWA] Received SYNC_COMPLETE from SW');
        // Refresh sync manager status.
        if (window.qmsSyncManager) {
          window.qmsSyncManager.syncAll();
        }
        break;

      case 'CACHE_STATS':
        console.log('[PWA] Cache stats:', payload);
        break;

      case 'NOTIFICATION_CLICK':
        console.log('[PWA] Notification click:', payload);
        break;

      default:
        break;
    }
  }


  // ── Utilities ─────────────────────────────────────────────────────────

  /**
   * Convert a URL-safe Base64 string to a Uint8Array (for VAPID key).
   *
   * @param {string} base64String
   * @returns {Uint8Array}
   */
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
  }


  // ── Bootstrap ─────────────────────────────────────────────────────────

  /**
   * Main initialization sequence. Called on DOMContentLoaded.
   */
  async function initPWA() {
    console.log('[PWA] Initializing HESEM QMS PWA...');

    // Check if already installed.
    checkInstalledState();

    // Register the service worker.
    await registerServiceWorker();

    // Initialize the offline store (IndexedDB).
    if (window.qmsOfflineStore) {
      try {
        await window.qmsOfflineStore.init();
        console.log('[PWA] Offline store initialized');
      } catch (err) {
        console.error('[PWA] Offline store init failed:', err);
      }
    }

    // Initialize the sync manager.
    if (window.qmsSyncManager) {
      try {
        await window.qmsSyncManager.init();
        console.log('[PWA] Sync manager initialized');
      } catch (err) {
        console.error('[PWA] Sync manager init failed:', err);
      }
    }

    // Set up network status monitoring.
    initNetworkMonitor();

    // Cache current user data for offline access (if logged in).
    if (window.currentUser && window.qmsOfflineStore) {
      try {
        await window.qmsOfflineStore.cacheUserData(window.currentUser);
      } catch (e) {
        // Non-critical.
      }
    }

    console.log('[PWA] Initialization complete');
  }

  // Wait for DOM ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
  } else {
    initPWA();
  }


  // ── Public API (exposed on window) ────────────────────────────────────

  window.qmsPWA = {
    promptInstall,
    requestPushPermission,
    subscribePush,
    updateAppBadge,
    isInstalled:   () => isInstalled,
    getRegistration: () => swRegistration,
  };

})();

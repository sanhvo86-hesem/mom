/**
 * HESEM MOM Portal — Sync Manager
 * =================================
 * PHASE 5: Progressive Web App and Offline Support
 *
 * Orchestrates background synchronization of offline form submissions:
 *   - Monitors online/offline transitions
 *   - Processes the IndexedDB submission queue
 *   - Parks conflicts for server-authoritative amendment/change-control review
 *   - Implements exponential backoff for transient failures
 *   - Provides a visual sync status indicator in the UI
 *   - Logs all sync operations for audit traceability
 *
 * Depends on: offline-store.js (window.qmsOfflineStore)
 */

'use strict';

class SyncManager {

  // ── Constants ───────────────────────────────────────────────────────────

  /** Maximum retry attempts per queued item before marking as failed. */
  static MAX_RETRIES = 5;

  /** Base delay in ms for exponential backoff. */
  static BASE_DELAY_MS = 1000;

  /** Maximum backoff delay cap (30 seconds). */
  static MAX_DELAY_MS = 30000;

  /** Server health-check endpoint for connectivity verification. */
  static PING_URL = '/mom/api.php?action=status';

  /** API endpoint for form submissions. */
  static SUBMIT_URL = '/mom/api.php';

  /** Sync states for the visual indicator. */
  static STATUS = Object.freeze({
    SYNCED:   'synced',    // All data synchronized (green)
    PENDING:  'pending',   // Items waiting to sync (yellow/amber)
    SYNCING:  'syncing',   // Currently syncing (blue pulse)
    OFFLINE:  'offline',   // No connectivity (red)
    ERROR:    'error',     // Sync error occurred (red blink)
  });


  // ── Constructor ─────────────────────────────────────────────────────────

  constructor() {
    /** @type {OfflineStore} */
    this._store = null;

    /** @type {string} Current sync status. */
    this._status = SyncManager.STATUS.SYNCED;

    /** @type {boolean} Whether a sync pass is currently running. */
    this._isSyncing = false;

    /** @type {boolean} Cached online state. */
    this._isOnline = navigator.onLine;

    /** @type {HTMLElement|null} Status indicator DOM element. */
    this._indicatorEl = null;

    /** @type {HTMLElement|null} Status badge (count) element. */
    this._badgeEl = null;

    /** @type {HTMLElement|null} Manual sync trigger button. */
    this._syncBtn = null;

    /** @type {Array<Function>} Registered status-change listeners. */
    this._listeners = [];

    /** @type {number|null} Periodic sync check interval ID. */
    this._periodicTimer = null;
  }


  // ── Initialization ──────────────────────────────────────────────────────

  /**
   * Initialize the sync manager: wire up event listeners, create UI
   * elements, and run an initial status check.
   *
   * @param {OfflineStore} [store]  Optional OfflineStore instance override.
   * @returns {Promise<void>}
   */
  async init(store) {
    this._store = store || window.qmsOfflineStore;

    if (!this._store) {
      console.error('[SyncManager] No OfflineStore available');
      return;
    }

    // Ensure the offline store is ready.
    await this._store.init();

    // Register online/offline event listeners.
    window.addEventListener('online',  () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());

    // Listen for service worker sync-complete messages.
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          console.log('[SyncManager] SW reported sync complete');
          this._refreshStatus();
        }
      });
    }

    // Create UI indicator elements.
    this._createIndicator();

    // Initial status refresh.
    await this._refreshStatus();

    // Periodic status check every 60 seconds.
    this._periodicTimer = setInterval(() => this._refreshStatus(), 60000);

    console.log('[SyncManager] Initialized, online:', this._isOnline);
  }


  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Process the entire submission queue: attempt to sync each pending item.
   *
   * @returns {Promise<{synced: number, failed: number, remaining: number}>}
   */
  async syncAll() {
    if (this._isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return { synced: 0, failed: 0, remaining: 0 };
    }

    if (!await this.getOnlineStatus()) {
      console.log('[SyncManager] Offline, cannot sync');
      this._setStatus(SyncManager.STATUS.OFFLINE);
      return { synced: 0, failed: 0, remaining: 0 };
    }

    this._isSyncing = true;
    this._setStatus(SyncManager.STATUS.SYNCING);

    const results = { synced: 0, failed: 0, remaining: 0 };

    try {
      const queue = await this._store.getPendingSubmissions();
      console.log(`[SyncManager] Processing ${queue.length} queued submissions`);

      for (const item of queue) {
        const success = await this.syncOne(item);
        if (success) {
          results.synced++;
        } else {
          results.failed++;
        }
      }

      // Count remaining pending items.
      const remaining = await this._store.getPendingSubmissions();
      results.remaining = remaining.length;

    } catch (err) {
      console.error('[SyncManager] syncAll error:', err);
      this._setStatus(SyncManager.STATUS.ERROR);
    } finally {
      this._isSyncing = false;
      await this._refreshStatus();
    }

    console.log('[SyncManager] Sync pass complete:', results);
    return results;
  }

  /**
   * Submit a single queued entry to the API with retry logic.
   *
   * @param {Object} queueItem  A record from the submission_queue store.
   * @returns {Promise<boolean>}  True if successfully synced.
   */
  async syncOne(queueItem) {
    // Mark item as syncing.
    await this._store.updateQueueItem(queueItem.id, { status: 'syncing' });

    try {
      const result = await this.retryWithBackoff(
        () => this._submitToServer(queueItem),
        SyncManager.MAX_RETRIES
      );

      if (result.success) {
        // Check for conflicts (server already has a newer version).
        if (result.conflict) {
          const resolved = await this.handleConflict(queueItem, result.serverData);
          if (!resolved) {
            await this._store.updateQueueItem(queueItem.id, {
              status: 'conflict',
              lastError: 'Conflict detected, awaiting user resolution',
            });
            return false;
          }
        }

        // Successfully synced: remove from queue and log.
        await this._store.removeFromQueue(queueItem.id);
        await this._store.logSync({
          formCode:  queueItem.formCode,
          status:    'synced',
          offlineId: queueItem.id,
          details:   `Synced after ${queueItem.attempts + 1} attempt(s)`,
        });

        // Clear the corresponding draft since it has been submitted.
        await this._store.deleteFormDraft(queueItem.formCode);

        return true;
      }

      // Non-retryable failure.
      const attempts = (queueItem.attempts || 0) + 1;
      if (attempts >= SyncManager.MAX_RETRIES) {
        await this._store.updateQueueItem(queueItem.id, {
          status: 'failed',
          attempts: attempts,
          lastError: result.error || 'Max retries exceeded',
        });
        await this._store.logSync({
          formCode:  queueItem.formCode,
          status:    'failed',
          offlineId: queueItem.id,
          details:   result.error || 'Max retries exceeded',
        });
      } else {
        await this._store.updateQueueItem(queueItem.id, {
          status: 'pending',
          attempts: attempts,
          lastError: result.error,
        });
      }

      return false;
    } catch (err) {
      console.error('[SyncManager] syncOne error:', queueItem.id, err);
      await this._store.updateQueueItem(queueItem.id, {
        status: 'pending',
        attempts: (queueItem.attempts || 0) + 1,
        lastError: err.message,
      });
      return false;
    }
  }

  /**
   * Handle a data conflict between a local offline submission and the server's
   * current state.
   *
   * eQMS records are record-centric and immutable after finalization. The
   * browser must never auto-merge, last-write-wins, or resubmit a conflict as a
   * resolved record. Conflicts stay in the queue until the server or an
   * authorized amendment/change-control flow resolves them.
   *
   * @param {Object} local       The offline queued submission.
   * @param {Object} server      The server's version of the same record.
   * @returns {Promise<boolean>}  True if the conflict was resolved automatically.
   */
  async handleConflict(local, server) {
    const localData  = local.data || {};
    const serverData = (server && server.data) ? server.data : {};
    const event = new CustomEvent('qms:sync-conflict', {
      detail: {
        formCode: local.formCode,
        localData: localData,
        serverData: serverData,
        queueId: local.id,
        resolutionRequired: 'server_authoritative_amendment',
      },
    });
    window.dispatchEvent(event);
    return false;
  }

  /**
   * Execute an async function with exponential backoff retries.
   *
   * @param {Function} fn          Async function to execute.
   * @param {number}   maxRetries  Maximum number of attempts.
   * @returns {Promise<*>}         The function's return value on success.
   * @throws  Rethrows the last error after all retries are exhausted.
   */
  async retryWithBackoff(fn, maxRetries) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries - 1) {
          const delay = Math.min(
            SyncManager.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500,
            SyncManager.MAX_DELAY_MS
          );
          console.log(`[SyncManager] Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Determine actual online status by combining navigator.onLine with a
   * lightweight server ping.
   *
   * @returns {Promise<boolean>}
   */
  async getOnlineStatus() {
    if (!navigator.onLine) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(SyncManager.PING_URL, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Show the current sync status to the user. Useful for status-bar UIs.
   *
   * @returns {{status: string, pendingCount: number, isOnline: boolean}}
   */
  async showSyncStatus() {
    const pendingCount = await this._store.getPendingCount();
    return {
      status: this._status,
      pendingCount: pendingCount,
      isOnline: this._isOnline,
    };
  }

  /**
   * Get the complete sync operation history from the log.
   *
   * @param {number} [limit=50]
   * @returns {Promise<Array<Object>>}
   */
  async getSyncHistory(limit) {
    return this._store.getSyncLog(limit);
  }

  /**
   * Register a callback for sync status changes.
   *
   * @param {Function} callback  Called with (status, detail) on each change.
   */
  onStatusChange(callback) {
    this._listeners.push(callback);
  }


  // ── Private: Network Event Handlers ───────────────────────────────────

  /** @private */
  _handleOnline() {
    console.log('[SyncManager] Network online detected');
    this._isOnline = true;
    // Auto-sync pending items on reconnection.
    this.syncAll();
  }

  /** @private */
  _handleOffline() {
    console.log('[SyncManager] Network offline detected');
    this._isOnline = false;
    this._setStatus(SyncManager.STATUS.OFFLINE);
  }


  // ── Private: Server Communication ─────────────────────────────────────

  /**
   * Submit a queued item to the server API.
   * @private
   *
   * @param {Object} queueItem
   * @returns {Promise<{success: boolean, conflict?: boolean, serverData?: Object, error?: string}>}
   */
  async _submitToServer(queueItem) {
    const response = await fetch(SyncManager.SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'form_submit',
        form_code: queueItem.formCode,
        data: queueItem.data,
        offline_id: queueItem.id,
        queued_at: queueItem.queuedAt,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = await response.json();

    if (result.conflict) {
      return { success: true, conflict: true, serverData: result.server_data };
    }

    return {
      success: result.success === true,
      error: result.error || result.error_vi || null,
    };
  }


  // ── Private: Status Management ────────────────────────────────────────

  /**
   * Update the internal status and notify listeners + UI.
   * @private
   */
  _setStatus(newStatus) {
    if (this._status === newStatus) return;

    const oldStatus = this._status;
    this._status = newStatus;

    // Update the visual indicator.
    this._updateIndicator();

    // Notify registered listeners.
    for (const cb of this._listeners) {
      try {
        cb(newStatus, { previous: oldStatus });
      } catch (e) {
        console.warn('[SyncManager] Listener error:', e);
      }
    }
  }

  /**
   * Refresh the current status based on queue contents and connectivity.
   * @private
   */
  async _refreshStatus() {
    this._isOnline = navigator.onLine;

    if (!this._isOnline) {
      this._setStatus(SyncManager.STATUS.OFFLINE);
      this._updateBadge();
      return;
    }

    if (this._isSyncing) {
      this._setStatus(SyncManager.STATUS.SYNCING);
      this._updateBadge();
      return;
    }

    try {
      const pendingCount = await this._store.getPendingCount();
      if (pendingCount > 0) {
        this._setStatus(SyncManager.STATUS.PENDING);
      } else {
        this._setStatus(SyncManager.STATUS.SYNCED);
      }
      this._updateBadge(pendingCount);
    } catch (e) {
      this._setStatus(SyncManager.STATUS.ERROR);
    }
  }


  // ── Private: UI Indicator ─────────────────────────────────────────────

  /**
   * Create the floating sync status indicator and manual sync button.
   * @private
   */
  _createIndicator() {
    // Do not create if already exists.
    if (document.getElementById('qms-sync-indicator')) {
      this._indicatorEl = document.getElementById('qms-sync-indicator');
      this._badgeEl     = document.getElementById('qms-sync-badge');
      this._syncBtn     = document.getElementById('qms-sync-btn');
      return;
    }

    // Container.
    const container = document.createElement('div');
    container.id = 'qms-sync-indicator';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Sync status');
    container.innerHTML = `
      <div class="qms-sync-dot" id="qms-sync-dot"></div>
      <span class="qms-sync-label" id="qms-sync-label">Synced</span>
      <span class="qms-sync-badge" id="qms-sync-badge" style="display:none">0</span>
      <button class="qms-sync-btn" id="qms-sync-btn" title="Dong bo thu cong" aria-label="Manual sync">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      </button>
    `;

    // Inject styles for the indicator.
    const style = document.createElement('style');
    style.textContent = `
      #qms-sync-indicator {
        position: fixed;
        bottom: 16px;
        left: 16px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: rgba(33, 37, 41, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 24px;
        color: #fff;
        font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 2px 12px rgba(0,0,0,.25);
        transition: opacity .3s, transform .3s;
        user-select: none;
      }
      #qms-sync-indicator:hover { transform: scale(1.04); }

      .qms-sync-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: #4caf50; /* green = synced */
        transition: background .3s;
        flex-shrink: 0;
      }
      .qms-sync-dot.pending  { background: #f9a825; }
      .qms-sync-dot.syncing  { background: #2196f3; animation: qms-pulse .8s infinite alternate; }
      .qms-sync-dot.offline  { background: #c62828; }
      .qms-sync-dot.error    { background: #c62828; animation: qms-blink .6s infinite; }

      @keyframes qms-pulse { to { opacity: .4; } }
      @keyframes qms-blink { 50% { opacity: .2; } }

      .qms-sync-label { white-space: nowrap; }

      .qms-sync-badge {
        background: #e94560;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        min-width: 18px;
        height: 18px;
        line-height: 18px;
        text-align: center;
        border-radius: 9px;
        padding: 0 5px;
      }

      .qms-sync-btn {
        background: none; border: none; color: #fff; cursor: pointer;
        padding: 4px; border-radius: 4px; line-height: 0;
        opacity: .7; transition: opacity .2s;
      }
      .qms-sync-btn:hover { opacity: 1; }
      .qms-sync-btn.spinning svg { animation: qms-spin .8s linear infinite; }
      @keyframes qms-spin { to { transform: rotate(360deg); } }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);

    this._indicatorEl = container;
    this._badgeEl     = document.getElementById('qms-sync-badge');
    this._syncBtn     = document.getElementById('qms-sync-btn');

    // Manual sync button handler.
    this._syncBtn.addEventListener('click', () => {
      this._syncBtn.classList.add('spinning');
      this.syncAll().finally(() => {
        this._syncBtn.classList.remove('spinning');
      });
    });

    this._updateIndicator();
  }

  /**
   * Update the visual indicator dot, label, and CSS class.
   * @private
   */
  _updateIndicator() {
    if (!this._indicatorEl) return;

    const dot   = document.getElementById('qms-sync-dot');
    const label = document.getElementById('qms-sync-label');
    if (!dot || !label) return;

    // Remove all status classes.
    dot.className = 'qms-sync-dot';

    const labels = {
      [SyncManager.STATUS.SYNCED]:  'Da dong bo',
      [SyncManager.STATUS.PENDING]: 'Cho dong bo',
      [SyncManager.STATUS.SYNCING]: 'Dang dong bo...',
      [SyncManager.STATUS.OFFLINE]: 'Offline',
      [SyncManager.STATUS.ERROR]:   'Loi dong bo',
    };

    label.textContent = labels[this._status] || this._status;

    if (this._status !== SyncManager.STATUS.SYNCED) {
      dot.classList.add(this._status);
    }
  }

  /**
   * Update the badge count.
   * @private
   *
   * @param {number} [count]  If omitted, fetched from the store.
   */
  async _updateBadge(count) {
    if (!this._badgeEl) return;

    const n = count !== undefined ? count : await this._store.getPendingCount();
    if (n > 0) {
      this._badgeEl.textContent = n > 99 ? '99+' : String(n);
      this._badgeEl.style.display = '';
    } else {
      this._badgeEl.style.display = 'none';
    }

    // Update app badge if supported (PWA installed).
    if ('setAppBadge' in navigator) {
      try {
        if (n > 0) {
          await navigator.setAppBadge(n);
        } else {
          await navigator.clearAppBadge();
        }
      } catch (e) {
        // Not critical.
      }
    }
  }
}


// ── Singleton Export ─────────────────────────────────────────────────────────

window.qmsSyncManager = new SyncManager();

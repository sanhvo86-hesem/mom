/**
 * HESEM MOM Portal — Offline Store (IndexedDB Wrapper)
 * =====================================================
 * PHASE 5: Progressive Web App and Offline Support
 *
 * Provides a clean async API over IndexedDB for:
 *   - Form draft persistence (auto-save while filling)
 *   - Submission queue (offline form submissions awaiting sync)
 *   - Form schema caching (work offline with full form definitions)
 *   - User data caching (profile, permissions, role for offline auth)
 *   - Document metadata caching (doc list, versions)
 *   - Sync operation log (audit trail for offline-to-online transitions)
 *
 * Database: hesem_mom_offline
 * Current schema version: 1
 */

'use strict';

class OfflineStore {

  // ── Constants ───────────────────────────────────────────────────────────

  static DB_NAME    = 'hesem_mom_offline';
  static DB_VERSION = 1;

  /** Object store definitions with their key configuration. */
  static STORES = {
    form_drafts:      { keyPath: 'formCode' },
    submission_queue:  { keyPath: 'id', autoIncrement: true },
    form_schemas:      { keyPath: 'formCode' },
    user_cache:        { keyPath: 'userId' },
    document_cache:    { keyPath: 'docId' },
    sync_log:          { keyPath: 'id', autoIncrement: true },
  };

  /** Index definitions: storeName -> [ { name, keyPath, options } ] */
  static INDEXES = {
    submission_queue: [
      { name: 'by_form',   keyPath: 'formCode',  options: { unique: false } },
      { name: 'by_status', keyPath: 'status',     options: { unique: false } },
      { name: 'by_date',   keyPath: 'queuedAt',   options: { unique: false } },
    ],
    form_drafts: [
      { name: 'by_updated', keyPath: 'updatedAt', options: { unique: false } },
    ],
    form_schemas: [
      { name: 'by_cached', keyPath: 'cachedAt',   options: { unique: false } },
    ],
    sync_log: [
      { name: 'by_form',   keyPath: 'formCode',   options: { unique: false } },
      { name: 'by_date',   keyPath: 'syncedAt',   options: { unique: false } },
      { name: 'by_status', keyPath: 'status',      options: { unique: false } },
    ],
    document_cache: [
      { name: 'by_type',   keyPath: 'docType',    options: { unique: false } },
      { name: 'by_dept',   keyPath: 'department',  options: { unique: false } },
    ],
  };


  // ── Constructor ─────────────────────────────────────────────────────────

  constructor() {
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {boolean} */
    this._ready = false;
  }


  // ── Initialization ──────────────────────────────────────────────────────

  /**
   * Open (or create/upgrade) the IndexedDB database.
   * Must be called before any other method.
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (this._ready && this._db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OfflineStore.DB_NAME, OfflineStore.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[OfflineStore] Upgrading database to version', OfflineStore.DB_VERSION);

        // Create object stores.
        for (const [storeName, config] of Object.entries(OfflineStore.STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, config);

            // Create indexes for this store if defined.
            const indexes = OfflineStore.INDEXES[storeName] || [];
            for (const idx of indexes) {
              store.createIndex(idx.name, idx.keyPath, idx.options);
            }

            console.log('[OfflineStore] Created store:', storeName);
          }
        }
      };

      request.onsuccess = () => {
        this._db = request.result;
        this._ready = true;

        // Handle unexpected close (e.g., browser garbage collection).
        this._db.onclose = () => {
          console.warn('[OfflineStore] Database connection closed unexpectedly');
          this._db = null;
          this._ready = false;
        };

        console.log('[OfflineStore] Database opened successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineStore] Failed to open database:', request.error);
        reject(new Error('IndexedDB open failed: ' + (request.error?.message || 'unknown')));
      };

      request.onblocked = () => {
        console.warn('[OfflineStore] Database open blocked by another connection');
      };
    });
  }

  /**
   * Ensure the database is ready, auto-initializing if needed.
   * @private
   */
  async _ensureReady() {
    if (!this._ready || !this._db) {
      await this.init();
    }
  }


  // ── Form Drafts ─────────────────────────────────────────────────────────

  /**
   * Save a form draft locally. Overwrites any existing draft for the same
   * form code, preserving auto-save behavior while the user fills a form.
   *
   * @param {string} formCode  The form identifier (e.g., 'FRM-NCR-001').
   * @param {Object} data      The current field values.
   * @returns {Promise<void>}
   */
  async saveFormDraft(formCode, data) {
    await this._ensureReady();

    const record = {
      formCode:   formCode,
      data:       data,
      updatedAt:  new Date().toISOString(),
      createdAt:  undefined, // Will be set below if new.
    };

    // Preserve the original creation timestamp if updating.
    const existing = await this.getFormDraft(formCode);
    record.createdAt = existing?.createdAt || record.updatedAt;

    return this._put('form_drafts', record);
  }

  /**
   * Retrieve a saved form draft.
   *
   * @param {string} formCode
   * @returns {Promise<Object|null>}  The draft record, or null if not found.
   */
  async getFormDraft(formCode) {
    await this._ensureReady();
    return this._get('form_drafts', formCode);
  }

  /**
   * Delete a specific form draft (e.g., after successful submission).
   *
   * @param {string} formCode
   * @returns {Promise<void>}
   */
  async deleteFormDraft(formCode) {
    await this._ensureReady();
    return this._delete('form_drafts', formCode);
  }

  /**
   * List all saved form drafts.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getAllFormDrafts() {
    await this._ensureReady();
    return this._getAll('form_drafts');
  }


  // ── Submission Queue ────────────────────────────────────────────────────

  /**
   * Queue a form submission for later sync. Used when the user submits a
   * form while offline; the data is persisted here and sent to the server
   * once connectivity is restored.
   *
   * @param {string} formCode  The form identifier.
   * @param {Object} data      The complete submission payload.
   * @returns {Promise<number>}  The auto-incremented queue entry ID.
   */
  async queueSubmission(formCode, data) {
    await this._ensureReady();

    const entry = {
      formCode:   formCode,
      data:       data,
      status:     'pending',     // pending | syncing | synced | failed
      queuedAt:   new Date().toISOString(),
      attempts:   0,
      lastError:  null,
    };

    return this._add('submission_queue', entry);
  }

  /**
   * Get all pending items in the submission queue.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getSubmissionQueue() {
    await this._ensureReady();
    return this._getAll('submission_queue');
  }

  /**
   * Get only pending (un-synced) submissions.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getPendingSubmissions() {
    await this._ensureReady();
    return this._getAllByIndex('submission_queue', 'by_status', 'pending');
  }

  /**
   * Update the status and metadata of a queued submission.
   *
   * @param {number} id       The queue entry ID.
   * @param {Object} updates  Fields to merge (status, attempts, lastError, etc.).
   * @returns {Promise<void>}
   */
  async updateQueueItem(id, updates) {
    await this._ensureReady();
    const existing = await this._get('submission_queue', id);
    if (!existing) return;
    return this._put('submission_queue', { ...existing, ...updates });
  }

  /**
   * Remove a successfully synced item from the queue.
   *
   * @param {number} id  The queue entry ID.
   * @returns {Promise<void>}
   */
  async removeFromQueue(id) {
    await this._ensureReady();
    return this._delete('submission_queue', id);
  }

  /**
   * Count of items pending sync.
   *
   * @returns {Promise<number>}
   */
  async getPendingCount() {
    await this._ensureReady();
    const pending = await this.getPendingSubmissions();
    return pending.length;
  }


  // ── Form Schema Cache ─────────────────────────────────────────────────

  /**
   * Cache a form schema definition for offline use.
   *
   * @param {string} formCode  The form identifier.
   * @param {Object} schema    The full form schema (fields, validations, layout).
   * @returns {Promise<void>}
   */
  async cacheFormSchema(formCode, schema) {
    await this._ensureReady();

    return this._put('form_schemas', {
      formCode:  formCode,
      schema:    schema,
      cachedAt:  new Date().toISOString(),
      version:   schema.version || schema.rev || '1.0',
    });
  }

  /**
   * Retrieve a cached form schema.
   *
   * @param {string} formCode
   * @returns {Promise<Object|null>}  The schema record, or null.
   */
  async getCachedSchema(formCode) {
    await this._ensureReady();
    return this._get('form_schemas', formCode);
  }

  /**
   * List all cached form schemas.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getAllCachedSchemas() {
    await this._ensureReady();
    return this._getAll('form_schemas');
  }


  // ── User Data Cache ───────────────────────────────────────────────────

  /**
   * Cache the current user's profile and permissions for offline access.
   * This allows the portal to render role-appropriate UI even without
   * network connectivity.
   *
   * @param {Object} userData  User profile object (id, name, role, dept, permissions).
   * @returns {Promise<void>}
   */
  async cacheUserData(userData) {
    await this._ensureReady();

    return this._put('user_cache', {
      userId:     userData.id || userData.userId || 'current',
      data:       userData,
      cachedAt:   new Date().toISOString(),
    });
  }

  /**
   * Retrieve cached user data.
   *
   * @param {string} [userId='current']  The user ID (defaults to 'current').
   * @returns {Promise<Object|null>}
   */
  async getCachedUserData(userId) {
    await this._ensureReady();
    return this._get('user_cache', userId || 'current');
  }


  // ── Document Cache ────────────────────────────────────────────────────

  /**
   * Cache document metadata for offline browsing of the document tree.
   *
   * @param {string} docId     The document identifier (e.g., 'SOP-101').
   * @param {Object} metadata  Document metadata (title, version, dept, path, etc.).
   * @returns {Promise<void>}
   */
  async cacheDocument(docId, metadata) {
    await this._ensureReady();

    return this._put('document_cache', {
      docId:      docId,
      ...metadata,
      cachedAt:   new Date().toISOString(),
    });
  }

  /**
   * Retrieve a cached document.
   *
   * @param {string} docId
   * @returns {Promise<Object|null>}
   */
  async getCachedDocument(docId) {
    await this._ensureReady();
    return this._get('document_cache', docId);
  }

  /**
   * List all cached documents.
   *
   * @returns {Promise<Array<Object>>}
   */
  async getAllCachedDocuments() {
    await this._ensureReady();
    return this._getAll('document_cache');
  }


  // ── Sync Log ──────────────────────────────────────────────────────────

  /**
   * Record a sync operation in the audit log.
   *
   * @param {Object} entry  Log entry: { formCode, status, offlineId, details }.
   * @returns {Promise<number>}  The auto-incremented log ID.
   */
  async logSync(entry) {
    await this._ensureReady();

    return this._add('sync_log', {
      ...entry,
      syncedAt: new Date().toISOString(),
    });
  }

  /**
   * Retrieve recent sync log entries.
   *
   * @param {number} [limit=50]  Maximum entries to return.
   * @returns {Promise<Array<Object>>}
   */
  async getSyncLog(limit) {
    await this._ensureReady();
    const all = await this._getAll('sync_log');
    // Return newest first, limited.
    return all
      .sort((a, b) => (b.syncedAt || '').localeCompare(a.syncedAt || ''))
      .slice(0, limit || 50);
  }


  // ── Storage Statistics ────────────────────────────────────────────────

  /**
   * Gather usage statistics for all object stores and overall IndexedDB quota.
   *
   * @returns {Promise<Object>}  Stats per store and overall estimate.
   */
  async getStorageStats() {
    await this._ensureReady();

    const stats = { stores: {}, estimate: null };

    // Count records per store.
    for (const storeName of Object.keys(OfflineStore.STORES)) {
      try {
        const all = await this._getAll(storeName);
        stats.stores[storeName] = { count: all.length };
      } catch (e) {
        stats.stores[storeName] = { count: 0, error: e.message };
      }
    }

    // StorageManager API for overall quota (if available).
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        stats.estimate = {
          quota:     est.quota,
          usage:     est.usage,
          usagePercent: est.quota ? ((est.usage / est.quota) * 100).toFixed(2) + '%' : 'unknown',
        };
      } catch (e) {
        stats.estimate = { error: e.message };
      }
    }

    return stats;
  }


  // ── Housekeeping ──────────────────────────────────────────────────────

  /**
   * Clear all data from a specific store.
   *
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    await this._ensureReady();

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Clear all data from all stores. Use with caution.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this._ensureReady();
    for (const storeName of Object.keys(OfflineStore.STORES)) {
      await this.clearStore(storeName);
    }
    console.log('[OfflineStore] All stores cleared');
  }

  /**
   * Delete the entire database. Requires re-init after.
   *
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._ready = false;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(OfflineStore.DB_NAME);
      request.onsuccess = () => { console.log('[OfflineStore] Database deleted'); resolve(); };
      request.onerror   = () => reject(request.error);
    });
  }


  // ── Private IDB Helpers ───────────────────────────────────────────────

  /**
   * Get a single record by key.
   * @private
   */
  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Get all records from a store.
   * @private
   */
  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Get all records matching an index value.
   * @private
   */
  _getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readonly');
      const index = tx.objectStore(storeName).index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Put (insert or update) a record.
   * @private
   */
  _put(storeName, record) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Add a new record (auto-increment key returned).
   * @private
   */
  _add(storeName, record) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Delete a record by key.
   * @private
   */
  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror   = () => reject(request.error);
    });
  }
}


// ── Singleton Export ─────────────────────────────────────────────────────────

/**
 * Global singleton instance. Import/access via:
 *   window.momOfflineStore
 */
window.momOfflineStore = new OfflineStore();
